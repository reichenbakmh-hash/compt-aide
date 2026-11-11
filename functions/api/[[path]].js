import {certRoute,verify,isAdmin,ensure} from "../../lib/cert.js";
const J=(o,s=200,h={})=>new Response(JSON.stringify(o),{status:s,headers:{"content-type":"application/json","cache-control":"no-store",...h}});
const E=new TextEncoder(),hex=a=>[...new Uint8Array(a)].map(x=>x.toString(16).padStart(2,"0")).join(""),rnd=n=>hex(crypto.getRandomValues(new Uint8Array(n)));
const sha=async t=>hex(await crypto.subtle.digest("SHA-256",E.encode(t)));
const pbk=async(pw,salt)=>{const k=await crypto.subtle.importKey("raw",E.encode(pw),"PBKDF2",false,["deriveBits"]);return hex(await crypto.subtle.deriveBits({name:"PBKDF2",hash:"SHA-256",salt:E.encode(salt),iterations:100000},k,256))};
const KEYS=["ca_ent","ca_par","ca_siren","ca_done","ca_pt","ca_ia","ca_nom","ca_xl"],DAY=2592000,RX=/(?:^|; )ca_s=([a-f0-9]{64})/;
const ck=(t,age)=>"ca_s="+t+"; HttpOnly; Secure; SameSite=Lax; Path=/; Max-Age="+age;
const eq=(a,b)=>{if(a.length!==b.length)return false;let d=0;for(let i=0;i<a.length;i++)d|=a.charCodeAt(i)^b.charCodeAt(i);return d===0};
const lim=async f=>{try{return await f()}catch(e){return null}};
async function start(db,uid){await lim(()=>db.prepare("DELETE FROM sessions WHERE expires<?1").bind(Date.now()).run());const t=rnd(32);await db.prepare("INSERT INTO sessions(token_hash,user_id,expires) VALUES(?1,?2,?3)").bind(await sha(t),uid,Date.now()+DAY*1000).run();return ck(t,DAY)}
async function who(c){const m=RX.exec(c.request.headers.get("cookie")||"");if(!m)return null;return await c.env.DB.prepare("SELECT u.id,u.nom,u.email,u.accord FROM sessions s JOIN users u ON u.id=s.user_id WHERE s.token_hash=?1 AND s.expires>?2").bind(await sha(m[1]),Date.now()).first()}
const all=async(db,id)=>{const r=await db.prepare("SELECT k,v FROM user_data WHERE user_id=?1").bind(id).all(),o={};for(const x of r.results)try{o[x.k]=JSON.parse(x.v)}catch(e){}return o};
export async function onRequest(c){
const u=new URL(c.request.url),p=u.pathname.replace(/^\/api\/?/,"").replace(/\/$/,""),m=c.request.method,db=c.env.DB;
if(!db)return J({err:"Le service est momentanément indisponible. Réessayez dans quelques instants."},503);
if(p==="config"&&m==="GET")return J({google:c.env.GOOGLE_CLIENT_ID||null});
if(p.startsWith("verify/")&&m==="GET")return verify(c,decodeURIComponent(p.slice(7)).toUpperCase(),new URL(c.request.url).searchParams.get("c"));
const o=c.request.headers.get("origin");
if(m!=="GET"&&o&&new URL(o).host!==u.host)return J({err:"Requête refusée."},403);
try{
if(p==="auth/register"&&m==="POST"){
const b=await c.request.json(),email=String(b.email||"").trim().toLowerCase(),nom=String(b.nom||"").trim(),pw=String(b.password||"");
if(nom.length<2||nom.length>60||!/^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(email)||email.length>120)return J({err:"Prénom ou adresse e-mail invalide."},400);
if(pw.length<8||pw.length>200)return J({err:"Le mot de passe doit contenir au moins 8 caractères."},400);
if(b.accord!==true)return J({err:"L’accord de confidentialité doit être accepté."},400);
if(await db.prepare("SELECT id FROM users WHERE email=?1").bind(email).first())return J({err:"Un compte existe déjà avec cette adresse."},409);
const salt=rnd(16),accord=new Date().toISOString(),r=await db.prepare("INSERT INTO users(email,nom,pw_hash,salt,accord,created) VALUES(?1,?2,?3,?4,?5,?6)").bind(email,nom,await pbk(pw,salt),salt,accord,Date.now()).run();
return J({user:{nom,email,accord,admin:isAdmin(c.env,email)}},200,{"set-cookie":await start(db,r.meta.last_row_id)})}
if(p==="auth/google"&&m==="POST"){
const cid=c.env.GOOGLE_CLIENT_ID;if(!cid)return J({err:"Connexion Google non configurée."},503);
const b=await c.request.json().catch(()=>({}));if(typeof b.credential!=="string"||b.credential.length>4096)return J({err:"Requête invalide."},400);
const r0=await fetch("https://oauth2.googleapis.com/tokeninfo?id_token="+encodeURIComponent(b.credential)).catch(()=>null);
const g=r0&&r0.ok?await r0.json().catch(()=>null):null;
if(!g||g.aud!==cid||!(g.iss==="accounts.google.com"||g.iss==="https://accounts.google.com")||String(g.email_verified)!=="true"||+g.exp*1000<Date.now()||!g.email)return J({err:"Connexion Google refusée."},401);
const email=String(g.email).trim().toLowerCase();let r=await db.prepare("SELECT * FROM users WHERE email=?1").bind(email).first();
if(!r){const nom=String(g.given_name||g.name||email.split("@")[0]).trim().slice(0,40)||"Utilisateur",ac=new Date().toISOString();await db.prepare("INSERT INTO users(email,nom,pw_hash,salt,accord,created) VALUES(?1,?2,?3,'google',?4,?5)").bind(email,nom,rnd(32),ac,Date.now()).run();r=await db.prepare("SELECT * FROM users WHERE email=?1").bind(email).first()}
else if(r.salt!=="google"){await db.prepare("UPDATE users SET pw_hash=?2,salt='google' WHERE id=?1").bind(r.id,rnd(32)).run();await db.prepare("DELETE FROM sessions WHERE user_id=?1").bind(r.id).run()}
return J({user:{nom:r.nom,email:r.email,accord:r.accord,admin:isAdmin(c.env,r.email)}},200,{"set-cookie":await start(db,r.id)})}
if(p==="auth/login"&&m==="POST"){
const b=await c.request.json(),email=String(b.email||"").trim().toLowerCase(),now=Date.now();
let a=await lim(()=>db.prepare("SELECT n,until FROM attempts WHERE email=?1").bind(email).first());
if(a&&a.until&&a.until<=now){await lim(()=>db.prepare("DELETE FROM attempts WHERE email=?1").bind(email).run());a=null}
if(a&&a.until>now)return J({err:"Trop de tentatives. Réessayez dans quelques minutes."},429);
const r=await db.prepare("SELECT * FROM users WHERE email=?1").bind(email).first();
const hh=await pbk(String(b.password||"").slice(0,200),r?r.salt:"0".repeat(32));if(!r||!eq(hh,r.pw_hash)){await lim(()=>db.prepare("INSERT INTO attempts(email,n,until) VALUES(?1,1,0) ON CONFLICT(email) DO UPDATE SET n=n+1,until=CASE WHEN n+1>=5 THEN ?2 ELSE 0 END").bind(email,now+900000).run());return J({err:"Adresse e-mail ou mot de passe incorrect."},401)}
await lim(()=>db.prepare("DELETE FROM attempts WHERE email=?1").bind(email).run());
return J({user:{nom:r.nom,email:r.email,accord:r.accord,admin:isAdmin(c.env,r.email)}},200,{"set-cookie":await start(db,r.id)})}
if(p==="auth/logout"&&m==="POST"){const x=RX.exec(c.request.headers.get("cookie")||"");if(x)await db.prepare("DELETE FROM sessions WHERE token_hash=?1").bind(await sha(x[1])).run();return J({ok:true},200,{"set-cookie":ck("",0)})}
const me=await who(c);
if(p==="me"&&m==="GET")return me?J({user:{nom:me.nom,email:me.email,accord:me.accord,admin:isAdmin(c.env,me.email)}}):J({err:"Non connecté."},401);
if(!me)return J({err:"Non connecté."},401);
if(p==="assistant"&&m==="POST"){const b=await c.request.json(),q=String(b.q||"").trim().slice(0,500);if(!c.env.AI||!q)return J({err:"Indisponible."},503);
const dy=Math.floor(Date.now()/864e5),us=await lim(()=>db.prepare("INSERT INTO ai_usage(user_id,day,n) VALUES(?1,?2,1) ON CONFLICT(user_id,day) DO UPDATE SET n=n+1 RETURNING n").bind(me.id,dy).first());
if(us&&us.n>40)return J({err:"Limite de 40 questions par jour atteinte. Revenez demain ou consultez les leçons et le glossaire."},429);
const hs=(Array.isArray(b.h)?b.h:[]).slice(-6).filter(x=>x&&(x.role==="user"||x.role==="assistant")&&typeof x.content==="string").map(x=>({role:x.role,content:x.content.slice(0,600)}));
const r=await lim(()=>c.env.AI.run("@cf/meta/llama-3.1-8b-instruct",{messages:[{role:"system",content:"Tu es un formateur en comptabilité française, pédagogue et précis. Réponds en français, en 6 phrases maximum. Quand c’est utile, donne l’écriture avec les numéros de comptes du plan comptable général et indique débit ou crédit. N’invente jamais un numéro de compte ni un taux : en cas de doute, dis-le. Pour les taux et seuils fiscaux, rappelle de vérifier sur impots.gouv.fr. Si la question sort de la comptabilité, de la finance d’entreprise, de la banque ou de la fiscalité française, dis-le poliment."}].concat(hs,[{role:"user",content:q}]),max_tokens:450}));const t=r&&String(r.response||"").trim();return t?J({r:t}):J({err:"Indisponible."},503)}
if(p.startsWith("cert/")||p.startsWith("admin/"))return certRoute(c,p,m,me);
if(p==="data"&&m==="GET")return J({data:await all(db,me.id)});
if(p==="data"&&m==="PUT"){const b=await c.request.json(),v=JSON.stringify(b.value);if(!KEYS.includes(b.key)||v.length>500000)return J({err:"Donnée refusée."},400);await db.prepare("INSERT INTO user_data(user_id,k,v,updated) VALUES(?1,?2,?3,?4) ON CONFLICT(user_id,k) DO UPDATE SET v=excluded.v,updated=excluded.updated").bind(me.id,b.key,v,Date.now()).run();return J({ok:true})}
if(p==="export"&&m==="GET")return J({compte:{nom:me.nom,email:me.email,accord:me.accord},donnees:await all(db,me.id),certification:await ensure(db,me.id).catch(()=>null)});
if(p==="account/password"&&m==="POST"){const b=await c.request.json().catch(()=>({})),u=await db.prepare("SELECT salt,pw_hash FROM users WHERE id=?1").bind(me.id).first();
if(!u||u.salt==="google")return J({err:"Ce compte utilise Google : il n’a pas de mot de passe."},400);
const nw=String(b.pw||"");if(nw.length<8||nw.length>200)return J({err:"8 caractères minimum."},400);
const oh=await pbk(String(b.old||"").slice(0,200),u.salt);if(!eq(oh,u.pw_hash))return J({err:"Mot de passe actuel incorrect."},403);
const salt=rnd(16);await db.prepare("UPDATE users SET pw_hash=?2,salt=?3 WHERE id=?1").bind(me.id,await pbk(nw,salt),salt).run();return J({ok:true})}
if(p==="account"&&m==="DELETE"){await lim(()=>db.prepare("DELETE FROM ai_usage WHERE user_id=?1").bind(me.id).run());await lim(()=>db.prepare("DELETE FROM certs WHERE user_id=?1").bind(me.id).run());await lim(()=>db.prepare("DELETE FROM exam_attempts WHERE user_id=?1").bind(me.id).run());await db.batch([db.prepare("DELETE FROM user_data WHERE user_id=?1").bind(me.id),db.prepare("DELETE FROM sessions WHERE user_id=?1").bind(me.id),db.prepare("DELETE FROM users WHERE id=?1").bind(me.id)]);return J({ok:true},200,{"set-cookie":ck("",0)})}
return J({err:"Introuvable."},404)}catch(e){return J({err:"Le service est momentanément indisponible. Réessayez dans quelques instants."},500)}}
