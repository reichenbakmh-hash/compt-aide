/* Moteur de formules adapté de « excel-teacher » (c) 2026 Matthew Green, licence MIT : voir THIRD_PARTY_NOTICES.md */
(function(){
/**
 * A small, Excel-flavoured formula parser + evaluator.
 *
 * Supports:
 *   - literals: numbers, "strings", TRUE / FALSE
 *   - cell refs (A1, $A$1, b12) and ranges (A1:B5)
 *   - operators: + - * / ^ , postfix % , & (concat), = <> < > <= >=
 *   - the function set in FUNCTIONS below
 *   - Excel-style error values that propagate through expressions
 *   - circular reference detection
 *
 * Deliberately out of scope: macros, charts, pivot tables, conditional
 * formatting, data validation, array formulas.
 */

const ERRORS = {
  DIV0: '#DIV/0!',
  NAME: '#NAME?',
  VALUE: '#VALUE!',
  REF: '#REF!',
  NUM: '#NUM!',
  NA: '#N/A',
  CIRC: '#CIRC!',
}

const ERROR_SET = new Set(Object.values(ERRORS))
const isError = (v) => typeof v === 'string' && ERROR_SET.has(v)

class FormulaError extends Error {
  constructor(code) {
    super(code)
    this.code = code
  }
}
const fail = (code) => {
  throw new FormulaError(code)
}

/* ------------------------------------------------------------------ *
 * Grid address helpers
 * ------------------------------------------------------------------ */

const colToLetter = (col) => {
  let s = ''
  let n = col
  do {
    s = String.fromCharCode(65 + (n % 26)) + s
    n = Math.floor(n / 26) - 1
  } while (n >= 0)
  return s
}

const letterToCol = (letters) => {
  let n = 0
  for (const ch of letters.toUpperCase()) n = n * 26 + (ch.charCodeAt(0) - 64)
  return n - 1
}

/** "A1" / "$B$3" -> { row, col } (both zero-based) */
const parseRef = (ref) => {
  const m = /^\$?([A-Za-z]+)\$?(\d+)$/.exec(ref)
  if (!m) return null
  return { col: letterToCol(m[1]), row: parseInt(m[2], 10) - 1 }
}

const toRef = (row, col) => `${colToLetter(col)}${row + 1}`

/* ------------------------------------------------------------------ *
 * Tokenizer
 * ------------------------------------------------------------------ */

const TOKEN = {
  NUMBER: 'number',
  STRING: 'string',
  IDENT: 'ident', // function name or TRUE/FALSE
  REF: 'ref',
  RANGE: 'range',
  OP: 'op',
  LPAREN: '(',
  RPAREN: ')',
  COMMA: ',',
}

function tokenize(src) {
  const tokens = []
  let i = 0
  const isDigit = (c) => c >= '0' && c <= '9'
  const isAlpha = (c) => /[A-Za-z_]/.test(c)

  while (i < src.length) {
    const c = src[i]

    if (c === ' ' || c === '\t' || c === '\n') {
      i++
      continue
    }

    if (isDigit(c) || (c === '.' && isDigit(src[i + 1]))) {
      let j = i
      while (j < src.length && (isDigit(src[j]) || src[j] === '.')) j++
      const raw = src.slice(i, j)
      if ((raw.match(/\./g) || []).length > 1) fail(ERRORS.VALUE)
      tokens.push({ type: TOKEN.NUMBER, value: parseFloat(raw) })
      i = j
      continue
    }

    if (c === '"') {
      let j = i + 1
      let out = ''
      while (j < src.length) {
        if (src[j] === '"') {
          if (src[j + 1] === '"') {
            out += '"'
            j += 2
            continue
          }
          break
        }
        out += src[j]
        j++
      }
      if (j >= src.length) fail(ERRORS.VALUE) // unterminated string
      tokens.push({ type: TOKEN.STRING, value: out })
      i = j + 1
      continue
    }

    if (isAlpha(c) || c === '$') {
      // Could be a range, a cell reference, a function name or a boolean.
      const rangeRe = /^(\$?[A-Za-z]{1,3}\$?\d{1,7}):(\$?[A-Za-z]{1,3}\$?\d{1,7})/
      const rest = src.slice(i)
      const rangeMatch = rangeRe.exec(rest)
      if (rangeMatch) {
        tokens.push({ type: TOKEN.RANGE, from: rangeMatch[1], to: rangeMatch[2] })
        i += rangeMatch[0].length
        continue
      }
      const refMatch = /^\$?[A-Za-z]{1,3}\$?\d{1,7}(?![A-Za-z0-9_.])/.exec(rest)
      if (refMatch) {
        tokens.push({ type: TOKEN.REF, value: refMatch[0] })
        i += refMatch[0].length
        continue
      }
      let j = i
      while (j < src.length && /[A-Za-z0-9_.]/.test(src[j])) j++
      tokens.push({ type: TOKEN.IDENT, value: src.slice(i, j).toUpperCase() })
      i = j
      continue
    }

    if (c === '(') {
      tokens.push({ type: TOKEN.LPAREN })
      i++
      continue
    }
    if (c === ')') {
      tokens.push({ type: TOKEN.RPAREN })
      i++
      continue
    }
    if (c === ',' || c === ';') {
      tokens.push({ type: TOKEN.COMMA })
      i++
      continue
    }

    const two = src.slice(i, i + 2)
    if (two === '<>' || two === '<=' || two === '>=') {
      tokens.push({ type: TOKEN.OP, value: two })
      i += 2
      continue
    }
    if ('+-*/^%&=<>'.includes(c)) {
      tokens.push({ type: TOKEN.OP, value: c })
      i++
      continue
    }

    fail(ERRORS.NAME) // unknown character
  }
  return tokens
}

/* ------------------------------------------------------------------ *
 * Parser  (recursive descent, Excel precedence)
 * ------------------------------------------------------------------ */

function parse(tokens) {
  let pos = 0
  const peek = () => tokens[pos]
  const next = () => tokens[pos++]
  const expect = (type) => {
    const t = next()
    if (!t || t.type !== type) fail(ERRORS.VALUE)
    return t
  }

  // comparison < concat < additive < multiplicative < unary < power < postfix
  function parseExpression() {
    let left = parseConcat()
    while (peek()?.type === TOKEN.OP && ['=', '<>', '<', '>', '<=', '>='].includes(peek().value)) {
      const op = next().value
      left = { kind: 'binary', op, left, right: parseConcat() }
    }
    return left
  }

  function parseConcat() {
    let left = parseAdditive()
    while (peek()?.type === TOKEN.OP && peek().value === '&') {
      next()
      left = { kind: 'binary', op: '&', left, right: parseAdditive() }
    }
    return left
  }

  function parseAdditive() {
    let left = parseMultiplicative()
    while (peek()?.type === TOKEN.OP && (peek().value === '+' || peek().value === '-')) {
      const op = next().value
      left = { kind: 'binary', op, left, right: parseMultiplicative() }
    }
    return left
  }

  function parseMultiplicative() {
    let left = parseUnary()
    while (peek()?.type === TOKEN.OP && (peek().value === '*' || peek().value === '/')) {
      const op = next().value
      left = { kind: 'binary', op, left, right: parseUnary() }
    }
    return left
  }

  function parseUnary() {
    if (peek()?.type === TOKEN.OP && (peek().value === '-' || peek().value === '+')) {
      const op = next().value
      return { kind: 'unary', op, operand: parseUnary() }
    }
    return parsePower()
  }

  function parsePower() {
    const base = parsePostfix()
    if (peek()?.type === TOKEN.OP && peek().value === '^') {
      next()
      return { kind: 'binary', op: '^', left: base, right: parseUnary() }
    }
    return base
  }

  function parsePostfix() {
    let node = parsePrimary()
    while (peek()?.type === TOKEN.OP && peek().value === '%') {
      next()
      node = { kind: 'percent', operand: node }
    }
    return node
  }

  function parsePrimary() {
    const t = next()
    if (!t) fail(ERRORS.VALUE)

    if (t.type === TOKEN.NUMBER) return { kind: 'number', value: t.value }
    if (t.type === TOKEN.STRING) return { kind: 'string', value: t.value }
    if (t.type === TOKEN.REF) return { kind: 'ref', ref: t.value }
    if (t.type === TOKEN.RANGE) return { kind: 'range', from: t.from, to: t.to }

    if (t.type === TOKEN.LPAREN) {
      const inner = parseExpression()
      expect(TOKEN.RPAREN)
      return inner
    }

    if (t.type === TOKEN.IDENT) {
      if (t.value === 'TRUE') return { kind: 'boolean', value: true }
      if (t.value === 'FALSE') return { kind: 'boolean', value: false }
      if (peek()?.type === TOKEN.LPAREN) {
        next()
        const args = []
        if (peek()?.type !== TOKEN.RPAREN) {
          args.push(parseExpression())
          while (peek()?.type === TOKEN.COMMA) {
            next()
            args.push(parseExpression())
          }
        }
        expect(TOKEN.RPAREN)
        return { kind: 'call', name: t.value, args }
      }
      fail(ERRORS.NAME) // bare word that isn't a function call
    }

    fail(ERRORS.VALUE)
  }

  const ast = parseExpression()
  if (pos < tokens.length) fail(ERRORS.VALUE) // trailing junk
  return ast
}

/* ------------------------------------------------------------------ *
 * Value coercion
 * ------------------------------------------------------------------ */

const RANGE = Symbol('range')
const makeRange = (values) => ({ [RANGE]: true, values })
const isRange = (v) => !!v && typeof v === 'object' && v[RANGE] === true

/** Coerce to number the way Excel does inside arithmetic. */
function toNumber(v) {
  if (isError(v)) fail(v)
  if (isRange(v)) fail(ERRORS.VALUE)
  if (v === null || v === undefined || v === '') return 0
  if (typeof v === 'number') return v
  if (typeof v === 'boolean') return v ? 1 : 0
  const n = Number(String(v).trim().replace(/,/g, ''))
  if (Number.isNaN(n)) fail(ERRORS.VALUE)
  return n
}

function toText(v) {
  if (isError(v)) fail(v)
  if (isRange(v)) fail(ERRORS.VALUE)
  if (v === null || v === undefined) return ''
  if (typeof v === 'boolean') return v ? 'TRUE' : 'FALSE'
  if (typeof v === 'number') return formatNumber(v)
  return String(v)
}

function toBool(v) {
  if (isError(v)) fail(v)
  if (isRange(v)) fail(ERRORS.VALUE)
  if (typeof v === 'boolean') return v
  if (typeof v === 'number') return v !== 0
  if (v === null || v === undefined || v === '') return false
  const s = String(v).trim().toUpperCase()
  if (s === 'TRUE') return true
  if (s === 'FALSE') return false
  return toNumber(v) !== 0
}

/** Trim floating point fuzz: 0.1+0.2 should read as 0.3, not 0.30000000000000004. */
function formatNumber(n) {
  if (!Number.isFinite(n)) return String(n)
  if (Number.isInteger(n)) return String(n)
  const rounded = parseFloat(n.toPrecision(12))
  return String(rounded)
}

/** Flatten arguments into a numeric list, skipping blanks and text (Excel's SUM rule). */
function numbersFrom(args) {
  const out = []
  for (const a of args) {
    const items = isRange(a) ? a.values : [a]
    for (const v of items) {
      if (isError(v)) fail(v)
      if (v === null || v === undefined || v === '') continue
      if (typeof v === 'number') out.push(v)
      else if (typeof v === 'boolean') out.push(v ? 1 : 0)
      else {
        const n = Number(String(v).trim())
        if (!Number.isNaN(n) && String(v).trim() !== '') out.push(n)
      }
    }
  }
  return out
}

function flatten(args) {
  const out = []
  for (const a of args) {
    if (isRange(a)) out.push(...a.values)
    else out.push(a)
  }
  return out
}

/** Evaluate a SUMIF/COUNTIF criterion such as ">100", "<>x", "apple". */
function matchesCriterion(value, criterion) {
  if (isRange(criterion)) fail(ERRORS.VALUE)
  const raw = criterion === null || criterion === undefined ? '' : criterion
  if (typeof raw === 'string') {
    const m = /^(<=|>=|<>|<|>|=)?\s*(.*)$/.exec(raw.trim())
    const op = m[1] || '='
    const operand = m[2]
    const operandNum = operand === '' ? null : Number(operand)
    const numeric = operand !== '' && !Number.isNaN(operandNum)

    if (numeric) {
      const v = typeof value === 'number' ? value : Number(String(value ?? '').trim())
      if (Number.isNaN(v)) return op === '<>'
      switch (op) {
        case '=': return v === operandNum
        case '<>': return v !== operandNum
        case '<': return v < operandNum
        case '>': return v > operandNum
        case '<=': return v <= operandNum
        case '>=': return v >= operandNum
        default: return false
      }
    }
    const a = String(value ?? '').trim().toUpperCase()
    const b = operand.trim().toUpperCase()
    switch (op) {
      case '=': return a === b
      case '<>': return a !== b
      case '<': return a < b
      case '>': return a > b
      case '<=': return a <= b
      case '>=': return a >= b
      default: return false
    }
  }
  if (typeof raw === 'number') {
    const v = typeof value === 'number' ? value : Number(String(value ?? '').trim())
    return v === raw
  }
  return value === raw
}

/* ------------------------------------------------------------------ *
 * Function library
 * ------------------------------------------------------------------ */

const arity = (args, min, max) => {
  if (args.length < min || (max !== undefined && args.length > max)) fail(ERRORS.VALUE)
}

const FUNCTIONS = {
  SUM: {
    signature: 'SUM(number1, [number2], …)',
    hint: 'Adds up all the numbers in a range or list.',
    fn: (args) => {
      arity(args, 1)
      return numbersFrom(args).reduce((a, b) => a + b, 0)
    },
  },
  AVERAGE: {
    signature: 'AVERAGE(number1, [number2], …)',
    hint: 'The arithmetic mean of the numbers you give it.',
    fn: (args) => {
      arity(args, 1)
      const nums = numbersFrom(args)
      if (!nums.length) fail(ERRORS.DIV0)
      return nums.reduce((a, b) => a + b, 0) / nums.length
    },
  },
  COUNT: {
    signature: 'COUNT(value1, [value2], …)',
    hint: 'Counts how many cells contain numbers.',
    fn: (args) => {
      arity(args, 1)
      return numbersFrom(args).length
    },
  },
  COUNTA: {
    signature: 'COUNTA(value1, [value2], …)',
    hint: 'Counts cells that are not empty — text included.',
    fn: (args) => {
      arity(args, 1)
      return flatten(args).filter((v) => v !== null && v !== undefined && v !== '').length
    },
  },
  MAX: {
    signature: 'MAX(number1, [number2], …)',
    hint: 'The largest number in the range.',
    fn: (args) => {
      arity(args, 1)
      const nums = numbersFrom(args)
      return nums.length ? Math.max(...nums) : 0
    },
  },
  MIN: {
    signature: 'MIN(number1, [number2], …)',
    hint: 'The smallest number in the range.',
    fn: (args) => {
      arity(args, 1)
      const nums = numbersFrom(args)
      return nums.length ? Math.min(...nums) : 0
    },
  },
  IF: {
    signature: 'IF(logical_test, value_if_true, [value_if_false])',
    hint: 'Returns one value when the test is TRUE, another when FALSE.',
    fn: (args) => {
      arity(args, 2, 3)
      const test = toBool(args[0])
      if (test) return args[1] === undefined ? true : scalar(args[1])
      return args.length > 2 ? scalar(args[2]) : false
    },
  },
  AND: {
    signature: 'AND(logical1, [logical2], …)',
    hint: 'TRUE only when every condition is TRUE.',
    fn: (args) => {
      arity(args, 1)
      return flatten(args).every((v) => toBool(v))
    },
  },
  OR: {
    signature: 'OR(logical1, [logical2], …)',
    hint: 'TRUE when at least one condition is TRUE.',
    fn: (args) => {
      arity(args, 1)
      return flatten(args).some((v) => toBool(v))
    },
  },
  NOT: {
    signature: 'NOT(logical)',
    hint: 'Flips TRUE to FALSE and back.',
    fn: (args) => {
      arity(args, 1, 1)
      return !toBool(args[0])
    },
  },
  CONCATENATE: {
    signature: 'CONCATENATE(text1, [text2], …)',
    hint: 'Joins pieces of text into one string.',
    fn: (args) => {
      arity(args, 1)
      return flatten(args).map(toText).join('')
    },
  },
  ABS: {
    signature: 'ABS(number)',
    hint: 'Strips the minus sign — the distance from zero.',
    fn: (args) => {
      arity(args, 1, 1)
      return Math.abs(toNumber(scalar(args[0])))
    },
  },
  ROUND: {
    signature: 'ROUND(number, num_digits)',
    hint: 'Rounds to the number of decimal places you ask for.',
    fn: (args) => {
      arity(args, 1, 2)
      const n = toNumber(scalar(args[0]))
      const d = args.length > 1 ? Math.trunc(toNumber(scalar(args[1]))) : 0
      const f = Math.pow(10, d)
      // Excel rounds halves away from zero; JS Math.round rounds towards +∞.
      return (Math.sign(n) * Math.round(Math.abs(n) * f + Number.EPSILON)) / f
    },
  },
  INT: {
    signature: 'INT(number)',
    hint: 'Rounds down to the nearest whole number.',
    fn: (args) => {
      arity(args, 1, 1)
      return Math.floor(toNumber(scalar(args[0])))
    },
  },
  MOD: {
    signature: 'MOD(number, divisor)',
    hint: 'The remainder after division.',
    fn: (args) => {
      arity(args, 2, 2)
      const n = toNumber(scalar(args[0]))
      const d = toNumber(scalar(args[1]))
      if (d === 0) fail(ERRORS.DIV0)
      return n - d * Math.floor(n / d)
    },
  },
  SQRT: {
    signature: 'SQRT(number)',
    hint: 'Square root. Negative input gives #NUM!.',
    fn: (args) => {
      arity(args, 1, 1)
      const n = toNumber(scalar(args[0]))
      if (n < 0) fail(ERRORS.NUM)
      return Math.sqrt(n)
    },
  },
  POWER: {
    signature: 'POWER(number, power)',
    hint: 'Raises a number to a power — same as the ^ operator.',
    fn: (args) => {
      arity(args, 2, 2)
      return Math.pow(toNumber(scalar(args[0])), toNumber(scalar(args[1])))
    },
  },
  LEN: {
    signature: 'LEN(text)',
    hint: 'How many characters are in the text.',
    fn: (args) => {
      arity(args, 1, 1)
      return toText(scalar(args[0])).length
    },
  },
  UPPER: {
    signature: 'UPPER(text)',
    hint: 'Converts text to UPPERCASE.',
    fn: (args) => {
      arity(args, 1, 1)
      return toText(scalar(args[0])).toUpperCase()
    },
  },
  LOWER: {
    signature: 'LOWER(text)',
    hint: 'Converts text to lowercase.',
    fn: (args) => {
      arity(args, 1, 1)
      return toText(scalar(args[0])).toLowerCase()
    },
  },
  SUMIF: {
    signature: 'SUMIF(range, criteria, [sum_range])',
    hint: 'Adds only the cells that meet your condition.',
    fn: (args) => {
      arity(args, 2, 3)
      const range = isRange(args[0]) ? args[0].values : [args[0]]
      const sumRange = args.length > 2 ? (isRange(args[2]) ? args[2].values : [args[2]]) : range
      const criterion = scalar(args[1])
      let total = 0
      range.forEach((v, i) => {
        if (matchesCriterion(v, criterion)) {
          const target = sumRange[i]
          const n = typeof target === 'number' ? target : Number(String(target ?? '').trim())
          if (!Number.isNaN(n) && target !== '' && target !== null && target !== undefined) total += n
        }
      })
      return total
    },
  },
  COUNTIF: {
    signature: 'COUNTIF(range, criteria)',
    hint: 'Counts the cells that meet your condition.',
    fn: (args) => {
      arity(args, 2, 2)
      const range = isRange(args[0]) ? args[0].values : [args[0]]
      const criterion = scalar(args[1])
      return range.filter((v) => matchesCriterion(v, criterion)).length
    },
  },
  ROUNDUP: {
    signature: 'ROUNDUP(number, num_digits)',
    hint: 'Always rounds away from zero.',
    fn: (args) => {
      arity(args, 1, 2)
      const n = toNumber(scalar(args[0]))
      const d = args.length > 1 ? Math.trunc(toNumber(scalar(args[1]))) : 0
      const f = Math.pow(10, d)
      return (Math.sign(n) * Math.ceil(Math.abs(n) * f - Number.EPSILON)) / f
    },
  },
  ROUNDDOWN: {
    signature: 'ROUNDDOWN(number, num_digits)',
    hint: 'Always rounds towards zero.',
    fn: (args) => {
      arity(args, 1, 2)
      const n = toNumber(scalar(args[0]))
      const d = args.length > 1 ? Math.trunc(toNumber(scalar(args[1]))) : 0
      const f = Math.pow(10, d)
      return (Math.sign(n) * Math.floor(Math.abs(n) * f + Number.EPSILON)) / f
    },
  },
}

const FUNCTION_NAMES = Object.keys(FUNCTIONS).sort()

/** A range used where a single value is expected collapses to its first cell. */
function scalar(v) {
  if (isRange(v)) {
    if (v.values.length === 0) fail(ERRORS.VALUE)
    return v.values[0]
  }
  return v
}

/* ------------------------------------------------------------------ *
 * Evaluator
 * ------------------------------------------------------------------ */

function compare(op, a, b) {
  const bothNumeric = typeof a === 'number' && typeof b === 'number'
  let x = a
  let y = b
  if (!bothNumeric) {
    // Excel: blank compares as 0 against numbers, "" against text.
    if (typeof a === 'number' || typeof b === 'number') {
      const an = a === '' || a === null || a === undefined ? 0 : a
      const bn = b === '' || b === null || b === undefined ? 0 : b
      if (typeof an === 'number' && typeof bn !== 'number') {
        const t = Number(String(bn).trim())
        if (!Number.isNaN(t)) {
          x = an
          y = t
        } else {
          x = String(an)
          y = String(bn).toUpperCase()
        }
      } else if (typeof bn === 'number' && typeof an !== 'number') {
        const t = Number(String(an).trim())
        if (!Number.isNaN(t)) {
          x = t
          y = bn
        } else {
          x = String(an).toUpperCase()
          y = String(bn)
        }
      } else {
        x = an
        y = bn
      }
    } else {
      x = typeof a === 'boolean' ? a : String(a ?? '').toUpperCase()
      y = typeof b === 'boolean' ? b : String(b ?? '').toUpperCase()
    }
  }
  switch (op) {
    case '=': return x === y
    case '<>': return x !== y
    case '<': return x < y
    case '>': return x > y
    case '<=': return x <= y
    case '>=': return x >= y
    default: return fail(ERRORS.VALUE)
  }
}

/**
 * @param node  AST node
 * @param ctx   { getCellValue(row, col) } — resolves a reference to a value
 */
function evaluate(node, ctx) {
  switch (node.kind) {
    case 'number':
    case 'string':
    case 'boolean':
      return node.value

    case 'ref': {
      const p = parseRef(node.ref)
      if (!p) fail(ERRORS.REF)
      return ctx.getCellValue(p.row, p.col)
    }

    case 'range': {
      const a = parseRef(node.from)
      const b = parseRef(node.to)
      if (!a || !b) fail(ERRORS.REF)
      const r1 = Math.min(a.row, b.row)
      const r2 = Math.max(a.row, b.row)
      const c1 = Math.min(a.col, b.col)
      const c2 = Math.max(a.col, b.col)
      if ((r2 - r1 + 1) * (c2 - c1 + 1) > 5000) fail(ERRORS.REF)
      const values = []
      for (let r = r1; r <= r2; r++) {
        for (let c = c1; c <= c2; c++) values.push(ctx.getCellValue(r, c))
      }
      return makeRange(values)
    }

    case 'unary': {
      const v = toNumber(scalar(evaluate(node.operand, ctx)))
      return node.op === '-' ? -v : v
    }

    case 'percent':
      return toNumber(scalar(evaluate(node.operand, ctx))) / 100

    case 'binary': {
      const left = evaluate(node.left, ctx)
      const right = evaluate(node.right, ctx)
      if (isError(left)) fail(left)
      if (isError(right)) fail(right)

      if (node.op === '&') return toText(scalar(left)) + toText(scalar(right))
      if (['=', '<>', '<', '>', '<=', '>='].includes(node.op)) {
        return compare(node.op, scalar(left), scalar(right))
      }

      const a = toNumber(scalar(left))
      const b = toNumber(scalar(right))
      switch (node.op) {
        case '+': return a + b
        case '-': return a - b
        case '*': return a * b
        case '/':
          if (b === 0) fail(ERRORS.DIV0)
          return a / b
        case '^': {
          const r = Math.pow(a, b)
          if (Number.isNaN(r)) fail(ERRORS.NUM)
          return r
        }
        default: return fail(ERRORS.VALUE)
      }
    }

    case 'call': {
      const def = FUNCTIONS[node.name]
      if (!def) fail(ERRORS.NAME)
      // IF is lazy in Excel, but with no side effects eager evaluation is
      // indistinguishable — except that errors in the untaken branch would
      // leak. So evaluate branches lazily for IF only.
      if (node.name === 'IF') {
        const test = evaluate(node.args[0], ctx)
        if (isError(test)) fail(test)
        if (node.args.length < 2) fail(ERRORS.VALUE)
        if (toBool(scalar(test))) {
          const v = scalar(evaluate(node.args[1], ctx))
          if (isError(v)) fail(v)
          return v
        }
        if (node.args.length < 3) return false
        const v = scalar(evaluate(node.args[2], ctx))
        if (isError(v)) fail(v)
        return v
      }
      const args = node.args.map((a) => {
        const v = evaluate(a, ctx)
        if (isError(v)) fail(v)
        return v
      })
      const result = def.fn(args)
      if (typeof result === 'number' && !Number.isFinite(result)) fail(ERRORS.NUM)
      return result
    }

    default:
      return fail(ERRORS.VALUE)
  }
}

/* ------------------------------------------------------------------ *
 * Public API
 * ------------------------------------------------------------------ */

/**
 * Parse and run a single formula string (with or without a leading "=").
 * Returns a value, or an Excel error string — never throws.
 */
function evaluateFormula(input, ctx) {
  const src = input.startsWith('=') ? input.slice(1) : input
  if (!src.trim()) return ''
  try {
    const ast = parse(tokenize(src))
    const value = evaluate(ast, ctx)
    return isRange(value) ? scalar(value) : value
  } catch (e) {
    if (e instanceof FormulaError) return e.code
    if (e && e.__circular) return ERRORS.CIRC
    return ERRORS.VALUE
  }
}

/** Is this raw cell input a formula? */
const isFormula = (raw) => typeof raw === 'string' && raw.trim().startsWith('=')

/** Interpret raw typed input as a number, boolean or text. */
function coerceLiteral(raw) {
  if (raw === null || raw === undefined) return ''
  const s = String(raw).trim()
  // Whitespace-only input stays text, exactly as Excel keeps it. That is the
  // source of the classic "identical-looking values won't match" bug, so the
  // grid should reproduce it rather than tidy it away.
  if (s === '') return raw
  if (/^-?\d*\.?\d+$/.test(s)) return parseFloat(s)
  if (/^-?\d*\.?\d+%$/.test(s)) return parseFloat(s) / 100
  if (/^\$-?[\d,]*\.?\d+$/.test(s)) return parseFloat(s.replace(/[$,]/g, ''))
  const upper = s.toUpperCase()
  if (upper === 'TRUE') return true
  if (upper === 'FALSE') return false
  return raw
}

/**
 * Evaluate a whole sheet.
 *
 * @param cells  { "A1": "=SUM(B1:B4)", … } raw user input keyed by A1 address
 * @returns      { values: { A1: computed }, errors: { A1: code } }
 */
function computeSheet(cells) {
  const values = {}
  const errors = {}
  const visiting = new Set()
  const done = new Set()

  const getCellValue = (row, col) => {
    if (row < 0 || col < 0) fail(ERRORS.REF)
    const key = toRef(row, col)
    return resolve(key)
  }

  function resolve(key) {
    if (done.has(key)) return values[key]
    if (visiting.has(key)) {
      const err = new Error('circular')
      err.__circular = true
      throw err
    }
    const raw = cells[key]
    if (raw === undefined || raw === null || raw === '') {
      done.add(key)
      values[key] = ''
      return ''
    }
    visiting.add(key)
    let out
    if (isFormula(raw)) {
      out = evaluateFormula(raw, { getCellValue })
      if (isError(out)) errors[key] = out
    } else {
      out = coerceLiteral(raw)
    }
    visiting.delete(key)
    done.add(key)
    values[key] = out
    return out
  }

  Object.keys(cells).forEach(resolve)
  return { values, errors }
}

/** Render a computed value for display in a grid cell. */
function displayValue(v) {
  if (v === null || v === undefined || v === '') return ''
  if (typeof v === 'boolean') return v ? 'TRUE' : 'FALSE'
  if (typeof v === 'number') {
    if (!Number.isFinite(v)) return ERRORS.NUM
    if (Number.isInteger(v)) return String(v)
    const abs = Math.abs(v)
    if (abs > 0 && (abs < 1e-4 || abs >= 1e11)) return v.toExponential(4)
    return String(parseFloat(v.toPrecision(10)))
  }
  return String(v)
}

/**
 * Autocomplete support: given what the user has typed so far, return the
 * function names that match the word currently being written.
 */
function getAutocomplete(input, caret = input.length) {
  if (!isFormula(input)) return { prefix: '', matches: [] }
  const upTo = input.slice(0, caret)
  const m = /([A-Za-z]+)$/.exec(upTo)
  if (!m) return { prefix: '', matches: [] }
  const prefix = m[1].toUpperCase()
  const matches = FUNCTION_NAMES.filter((n) => n.startsWith(prefix)).slice(0, 6)
  if (matches.length === 1 && matches[0] === prefix) return { prefix, matches: [] }
  return { prefix, matches }
}

/**
 * Which function/argument is the caret sitting inside? Drives the inline
 * signature hint, the way Excel shows the tooltip while you type.
 */
function getActiveSignature(input, caret = input.length) {
  if (!isFormula(input)) return null
  const src = input.slice(1, Math.max(1, caret))
  const stack = []
  let i = 0
  let inString = false
  while (i < src.length) {
    const c = src[i]
    if (inString) {
      if (c === '"') inString = false
      i++
      continue
    }
    if (c === '"') {
      inString = true
      i++
      continue
    }
    if (c === '(') {
      const before = /([A-Za-z]+)\s*$/.exec(src.slice(0, i))
      stack.push({ name: before ? before[1].toUpperCase() : null, arg: 0 })
      i++
      continue
    }
    if (c === ')') {
      stack.pop()
      i++
      continue
    }
    if (c === ',' && stack.length) {
      stack[stack.length - 1].arg++
      i++
      continue
    }
    i++
  }
  for (let s = stack.length - 1; s >= 0; s--) {
    const frame = stack[s]
    if (frame.name && FUNCTIONS[frame.name]) {
      return { name: frame.name, argIndex: frame.arg, ...FUNCTIONS[frame.name] }
    }
  }
  return null
}

window.XL={computeSheet:computeSheet,toRef:toRef,displayValue:displayValue,FUNCTION_NAMES:FUNCTION_NAMES};
})();
