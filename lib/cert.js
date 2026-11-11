// Certification : attestation, évaluation finale, certificats, registre public, administration.
import {SEUILS as S,STATIC,pickQ,qView,qOk,casOf,pickCas,grade,finale} from "./exam.js";
const J=(o,s=200)=>new Response(JSON.stringify(o),{status:s,headers:{"content-type":"application/json","cache-control":"no-store"}});
const L=async f=>{try{return await f()}catch(e){return null}};
const AB="ABCDEFGHJKLMNPQRSTUVWXYZ23456789",code=n=>[...crypto.getRandomValues(new Uint8Array(n))].map(x=>AB[x%32]).join("");
export const isAdmin=(env,email)=>String(env.ADMIN_EMAILS||"").toLowerCase().split(/[\s,;]+/).includes(String(email||"").toLowerCase());
const get=async(db,uid,k)=>{const r=await db.prepare("SELECT v FROM user_data WHERE user_id=?1 AND k=?2").bind(uid,k).first();try{return r?JSON.parse(r.v):null}catch(e){return null}};
const nomOk=n=>typeof n==="string"&&n.trim().length>=3&&n.trim().length<=60;
const who=t=>{const p=String(t||"").trim().split(/\s+/);return p.length>1?p[0]+" "+p[p.length-1][0].toUpperCase()+".":p[0]};
async function pool(db){const c=(await L(()=>db.prepare("SELECT id,q,o,ok FROM qbank WHERE active=1").all()))||{results:[]};return STATIC.concat(c.results.map(x=>({id:"c"+x.id,q:x.q,o:JSON.parse(x.o),ok:x.ok})))}
async function items(db,ids){const P=await pool(db),m={};P.forEach(x=>m[x.id]=x);const out=[];for(const id of ids){if(m[id])out.push(m[id]);else if(id[0]==="c"){const r=await L(()=>db.prepare("SELECT id,q,o,ok FROM qbank WHERE id=?1").bind(+id.slice(1)).first());if(r)out.push({id,q:r.q,o:JSON.parse(r.o),ok:r.ok})}}return out}
const view=async(db,a)=>({id:a.id,ends:a.ends,qcm:(await items(db,JSON.parse(a.qids))).map(x=>qView(a.seed,x)),cas:JSON.parse(a.cas).map(k=>({t:casOf(a.seed,k).t}))});
async function issue(db,uid,type,nom,data){const y=new Date().getFullYear(),cd=code(4)+"-"+code(4);for(let i=0;i<6;i++){const r=await db.prepare("SELECT MAX(CAST(SUBSTR(num,9) AS INTEGER)) m FROM certs WHERE num LIKE ?1").bind("CA-"+y+"-%").first(),num="CA-"+y+"-"+String(((r&&r.m)||0)+1+i).padStart(6,"0");try{await db.prepare("INSERT INTO certs(num,user_id,type,titulaire,issued,data,revoked) VALUES(?1,?2,?3,?4,?5,?6,0)").bind(num,uid,type,nom.trim(),Date.now(),JSON.stringify(Object.assign({},data,{code:cd}))).run();return}catch(e){if(i===5)throw e}}}
const mine=async(db,uid)=>(await db.prepare("SELECT num,type,titulaire,issued,data,revoked FROM certs WHERE user_id=?1").bind(uid).all()).results.map(x=>({...x,data:JSON.parse(x.data||"{}")}));
export async function ensure(db,uid){
const nom=await get(db,uid,"ca_nom"),par=await get(db,uid,"ca_par")||{};let n=0;for(let i=0;i<6;i++)for(let j=0;j<4;j++)if(par[i+"-"+j])n++;
let cs=await mine(db,uid);
if(nomOk(nom)){
if(n===24&&!cs.some(c=>c.type==="ATT"))await issue(db,uid,"ATT",nom,{etapes:24});
if(!cs.some(c=>c.type==="CRT")){const b=await db.prepare("SELECT id,qcm,cas_s,final FROM exam_attempts WHERE user_id=?1 AND passed=1 ORDER BY final DESC LIMIT 1").bind(uid).first();if(b)await issue(db,uid,"CRT",nom,{qcm:b.qcm,cas:b.cas_s,final:b.final,tentative:b.id})}
cs=await mine(db,uid)}
return{n,total:24,nom:nom||"",certs:cs}}
const open=async db=>{const r=await L(()=>db.prepare("SELECT v FROM cfg WHERE k='exam_open'").first());return !r||r.v!=="0"};
export async function verify(c,num,cd){
if(!/^CA-((ATT|CRT)-\d{4}-[A-Z2-9]{8}|\d{4}-\d{6})$/.test(num))return J({ok:false,err:"Numéro invalide."},400);
const r=await c.env.DB.prepare("SELECT type,titulaire,issued,data,revoked FROM certs WHERE num=?1").bind(num).first();
if(!r)return J({ok:false,err:"Aucun document ne porte ce numéro."},404);
const d=JSON.parse(r.data||"{}");
if(d.code&&String(cd||"").trim().toUpperCase()!==d.code)return J({ok:false,err:"Code de vérification manquant ou incorrect. Il figure sous le QR code du document."},403);
return J({ok:true,num,type:r.type,titulaire:who(r.titulaire),parcours:"Formation à la comptabilité française",issued:r.issued,statut:r.revoked?"révoqué":"valide"})}
export async function certRoute(c,p,m,me){
const db=c.env.DB,now=Date.now(),body=async()=>{try{return await c.request.json()}catch(e){return{}}};
if(p.startsWith("admin/")){
if(!isAdmin(c.env,me.email))return J({err:"Accès réservé."},403);
if(p==="admin/overview"&&m==="GET"){const n=async q=>(await db.prepare(q).first()).n;
const certs=(await db.prepare("SELECT c.num,c.type,c.titulaire,c.issued,c.revoked,u.email FROM certs c JOIN users u ON u.id=c.user_id ORDER BY c.issued DESC LIMIT 50").all()).results;
const att=(await db.prepare("SELECT a.id,u.email,a.started,a.qcm,a.cas_s,a.final,a.passed,a.status FROM exam_attempts a JOIN users u ON u.id=a.user_id ORDER BY a.started DESC LIMIT 30").all()).results;
const qs=((await L(()=>db.prepare("SELECT id,q,active FROM qbank ORDER BY id DESC LIMIT 50").all()))||{results:[]}).results;
return J({users:await n("SELECT COUNT(*) n FROM users"),attempts:await n("SELECT COUNT(*) n FROM exam_attempts"),certs,att,qs,statiques:STATIC.length,open:await open(db)})}
const b=await body();
if(p==="admin/revoke"&&m==="POST"){await db.prepare("UPDATE certs SET revoked=?2 WHERE num=?1").bind(String(b.num),b.revoked?1:0).run();return J({ok:true})}
if(p==="admin/reset"&&m==="POST"){const u=await db.prepare("SELECT id FROM users WHERE email=?1").bind(String(b.email||"").trim().toLowerCase()).first();if(!u)return J({err:"Utilisateur introuvable."},404);await db.prepare("DELETE FROM exam_attempts WHERE user_id=?1").bind(u.id).run();return J({ok:true})}
if(p==="admin/exam"&&m==="POST"){await db.prepare("INSERT INTO cfg(k,v) VALUES('exam_open',?1) ON CONFLICT(k) DO UPDATE SET v=excluded.v").bind(b.open?"1":"0").run();return J({ok:true})}
if(p==="admin/q"&&m==="POST"){const o=Array.isArray(b.o)?b.o.map(x=>String(x).trim().slice(0,120)):[],ok=+b.ok,q=String(b.q||"").trim().slice(0,240);if(q.length<8||o.length!==4||o.some(x=>!x)||!(ok>=0&&ok<4))return J({err:"Question, 4 réponses et la bonne réponse sont requises."},400);await db.prepare("INSERT INTO qbank(q,o,ok,active) VALUES(?1,?2,?3,1)").bind(q,JSON.stringify(o),ok).run();return J({ok:true})}
if(p==="admin/qtoggle"&&m==="POST"){await db.prepare("UPDATE qbank SET active=?2 WHERE id=?1").bind(+b.id,b.active?1:0).run();return J({ok:true})}
return J({err:"Introuvable."},404)}
if(p==="cert/status"&&m==="GET"){const e=await ensure(db,me.id),at=(await db.prepare("SELECT id,started,ends,status,qcm,cas_s,final,passed FROM exam_attempts WHERE user_id=?1 ORDER BY started DESC LIMIT 20").bind(me.id).all()).results;
const op=at.find(x=>x.status==="open"&&x.ends>now);return J({...e,attempts:at,open:op?{id:op.id,ends:op.ends}:null,left:Math.max(0,S.essaisJour-at.filter(x=>x.started>now-864e5).length),examOpen:await open(db),seuils:S})}
if(p==="cert/exo"&&m==="GET"){const seed=parseInt(new URL(c.request.url).searchParams.get("seed"))||Math.floor(Math.random()*1e9);return J({seed,t:casOf(seed,seed%8).t})}
const b=await body();
if(p==="cert/grade"&&m==="POST"){const seed=parseInt(b.seed)||0;return J(grade(casOf(seed,seed%8).exp,b.l))}
if(p==="cert/start"&&m==="POST"){
if(!await open(db))return J({err:"L’évaluation est momentanément fermée."},403);
const e=await ensure(db,me.id);
if(e.certs.some(x=>x.type==="CRT"))return J({err:"Votre certificat a déjà été délivré."},409);
if(!e.certs.some(x=>x.type==="ATT"))return J({err:"Validez d’abord les 24 étapes de la formation et renseignez votre nom."},403);
const o=await db.prepare("SELECT * FROM exam_attempts WHERE user_id=?1 AND status='open' AND ends>?2").bind(me.id,now).first();
if(o)return J(await view(db,o));
const k=(await db.prepare("SELECT COUNT(*) n FROM exam_attempts WHERE user_id=?1 AND started>?2").bind(me.id,now-864e5).first()).n;
if(k>=S.essaisJour)return J({err:"Limite de "+S.essaisJour+" tentatives par 24 heures atteinte."},429);
const seed=Math.floor(Math.random()*2e9),ids=pickQ(seed,await pool(db),S.nq),cas=pickCas(seed,S.nc);
const r=await db.prepare("INSERT INTO exam_attempts(user_id,started,ends,seed,qids,cas,status) VALUES(?1,?2,?3,?4,?5,?6,'open')").bind(me.id,now,now+S.duree,seed,JSON.stringify(ids),JSON.stringify(cas)).run();
return J(await view(db,{id:r.meta.last_row_id,ends:now+S.duree,seed,qids:JSON.stringify(ids),cas:JSON.stringify(cas)}))}
if(p==="cert/submit"&&m==="POST"){
const a=await db.prepare("SELECT * FROM exam_attempts WHERE id=?1 AND user_id=?2 AND status='open'").bind(+b.id,me.id).first();
if(!a)return J({err:"Tentative introuvable ou déjà soumise."},404);
if(now>a.ends+60000){await db.prepare("UPDATE exam_attempts SET status='expired' WHERE id=?1").bind(a.id).run();return J({err:"Temps écoulé : tentative non validée."},410)}
const its=await items(db,JSON.parse(a.qids)),ans=Array.isArray(b.a)?b.a:[],ks=JSON.parse(a.cas),cl=Array.isArray(b.c)?b.c:[];
const ok=its.reduce((t,x,i)=>t+(qOk(a.seed,x,ans[i])?1:0),0),qs=Math.round(100*ok/its.length);
const det=ks.map((k,i)=>{const c=casOf(a.seed,k);return{t:c.t,...grade(c.exp,cl[i])}}),cs=Math.round(det.reduce((t,x)=>t+x.score,0)/det.length),f=finale(qs,cs);
await db.prepare("UPDATE exam_attempts SET status='done',qcm=?2,cas_s=?3,final=?4,passed=?5,detail=?6 WHERE id=?1").bind(a.id,qs,cs,f.final,f.passed?1:0,JSON.stringify({ok,n:its.length})).run();
if(f.passed)await ensure(db,me.id);
return J({qcm:qs,bonnes:ok,total:its.length,cas:cs,...f,detail:det})}
return J({err:"Introuvable."},404)}
