export const ACTIVE_DAYS=30;
export const NIVEAUX=6,ETAPES=4,PERIODES=[7,30,90,365];
const DAY=864e5,HOUR=36e5,CTX=/^(att|exam-\d{1,9})$/;
const J=(o,s=200)=>new Response(JSON.stringify(o),{status:s,headers:{"content-type":"application/json","cache-control":"no-store"}});
const L=async f=>{try{return await f()}catch(e){return null}};
const seen=new Map();

export async function touch(db,uid){
const n=Date.now(),t=seen.get(uid)||0;
if(n-t<HOUR&&Math.floor(n/DAY)===Math.floor(t/DAY))return;
seen.set(uid,n);if(seen.size>5000)seen.clear();
await L(()=>db.batch([
db.prepare("UPDATE users SET last_seen=?2 WHERE id=?1 AND (last_seen IS NULL OR last_seen<?3)").bind(uid,n,n-HOUR),
db.prepare("INSERT OR IGNORE INTO activity(user_id,day) VALUES(?1,?2)").bind(uid,Math.floor(n/DAY))]));
if(Math.random()<.01)await L(()=>db.prepare("DELETE FROM activity WHERE day<?1").bind(Math.floor(n/DAY)-400).run())}

const STEPS="FROM user_data ud, json_each(CASE WHEN json_valid(ud.v) THEN ud.v ELSE '{}' END) je WHERE ud.k='ca_par' AND je.type='true' AND je.key GLOB '[0-5]-[0-3]'";
const r1=x=>Math.round(x*10)/10,rows=r=>(r&&r.results)||[];

export async function stats(db,period,now=Date.now()){
const P=PERIODES.includes(period)?period:30,total=NIVEAUX*ETAPES,sel=db.prepare.bind(db);
const core=await db.batch([
sel("SELECT COUNT(*) total,COALESCE(SUM(created>=?1),0) n7,COALESCE(SUM(created>=?2),0) n30,COALESCE(SUM(last_seen>=?3),0) actifs FROM users").bind(now-7*DAY,now-30*DAY,now-ACTIVE_DAYS*DAY),
sel("WITH s AS (SELECT ud.user_id uid,COUNT(*) n "+STEPS+" GROUP BY ud.user_id) SELECT COUNT(*) apprenants,COALESCE(AVG(n),0) moy,COALESCE(SUM(n>="+total+"),0) finis FROM s"),
sel("SELECT lvl,COUNT(*) c FROM (SELECT ud.user_id uid,SUBSTR(je.key,1,1) lvl "+STEPS+" GROUP BY ud.user_id,SUBSTR(je.key,1,1) HAVING COUNT(*)="+ETAPES+") GROUP BY lvl"),
sel("SELECT COUNT(*) faits,COALESCE(SUM(passed=1),0) ok,COALESCE(AVG(final),0) moy FROM exam_attempts WHERE status='done'"),
sel("SELECT CAST(started/86400000 AS INTEGER) d,ROUND(AVG(final),1) moy,COUNT(*) n FROM exam_attempts WHERE status='done' AND started>=?1 GROUP BY d ORDER BY d").bind(now-P*DAY),
sel("SELECT type,COUNT(*) n,COALESCE(SUM(revoked),0) r FROM certs GROUP BY type"),
sel("SELECT COUNT(*) n FROM certs a WHERE a.type='ATT' AND NOT EXISTS(SELECT 1 FROM certs c WHERE c.user_id=a.user_id AND c.type='CRT')"),
sel("SELECT CAST(issued/86400000 AS INTEGER) d,COUNT(*) n FROM certs WHERE type='CRT' GROUP BY d ORDER BY d"),
sel("SELECT CAST(created/86400000 AS INTEGER) d,COUNT(*) n FROM users WHERE created>=?1 GROUP BY d ORDER BY d").bind(now-365*DAY)]);
const act=await L(()=>sel("SELECT day d,COUNT(*) n FROM activity WHERE day>=?1 GROUP BY day ORDER BY day").bind(Math.floor(now/DAY)-P+1).all());
const fb=await L(()=>db.batch([
sel("SELECT COUNT(*) n,AVG(note_app) a,AVG(note_cours) c,AVG(note_eval) e,COALESCE(SUM(reco>=9),0) pro,COALESCE(SUM(reco BETWEEN 7 AND 8),0) pas,COALESCE(SUM(reco<=6),0) det FROM feedback"),
sel("SELECT comment c,created t,(note_app+note_cours+note_eval)/3.0 n FROM feedback WHERE comment IS NOT NULL AND TRIM(comment)<>'' ORDER BY created DESC LIMIT 10")]));
const u=rows(core[0])[0]||{},pg=rows(core[1])[0]||{},lv=rows(core[2]),ex=rows(core[3])[0]||{},ct=rows(core[5]),att=rows(core[6])[0]||{};
const crt=ct.find(x=>x.type==="CRT")||{n:0,r:0},at=ct.find(x=>x.type==="ATT")||{n:0,r:0};
const lvl=Array.from({length:NIVEAUX},(_,i)=>{const x=lv.find(y=>+y.lvl===i);return pg.apprenants?r1(100*(x?x.c:0)/pg.apprenants):0});
const s=fb?rows(fb[0])[0]||{}:{},sn=s.n||0,nps=sn?Math.round(100*((s.pro||0)-(s.det||0))/sn):null;
const moy=x=>sn&&x!=null?r1(x):null;
return{
generated:now,periode:P,actifJours:ACTIVE_DAYS,
formation:{unique:true,niveaux:NIVEAUX,etapes:total,inscrits:pg.apprenants||0},
utilisateurs:{total:u.total||0,n7:u.n7||0,n30:u.n30||0,actifs:u.actifs||0,inactifs:(u.total||0)-(u.actifs||0)},
progression:{moyenne:pg.apprenants?r1(100*pg.moy/total):0,apprenants:pg.apprenants||0,finis:pg.finis||0,niveaux:lvl},
examens:{faits:ex.faits||0,reussites:ex.ok||0,echecs:(ex.faits||0)-(ex.ok||0),taux:ex.faits?r1(100*ex.ok/ex.faits):null,moyenne:ex.faits?r1(ex.moy):null},
certifs:{delivres:crt.n,revoques:crt.r,attestations:at.n,attestationsRevoquees:at.r,attestationsSansCertificat:att.n||0},
series:{inscriptions:rows(core[8]).map(x=>[x.d,x.n]),activite:rows(act).map(x=>[x.d,x.n]),examens:rows(core[4]).map(x=>[x.d,x.moy,x.n]),certifs:rows(core[7]).map(x=>[x.d,x.n])},
satisfaction:{n:sn,moyennes:{app:moy(s.a),cours:moy(s.c),eval:moy(s.e)},global:sn?r1(((s.a||0)+(s.c||0)+(s.e||0))/3):null,nps,repartition:{promoteurs:s.pro||0,passifs:s.pas||0,detracteurs:s.det||0},commentaires:fb?rows(fb[1]).map(x=>({c:x.c,t:x.t,n:r1(x.n)})):[]}}}

const int=(v,a,b)=>Number.isInteger(v)&&v>=a&&v<=b;

export async function feedback(c,me){
const db=c.env.DB;
if(+(c.request.headers.get("content-length")||0)>4096)return J({err:"Requête trop volumineuse."},413);
const b=await c.request.json().catch(()=>null);
if(!b||typeof b!=="object"||Array.isArray(b))return J({err:"Requête invalide."},400);
const ctx=b.ctx,cm=b.comment==null?"":b.comment;
if(typeof ctx!=="string"||!CTX.test(ctx)||!int(b.app,1,5)||!int(b.cours,1,5)||!int(b.eval,1,5)||!int(b.reco,0,10)||typeof cm!=="string"||cm.length>1000)return J({err:"Avis invalide."},400);
const com=cm.replace(/[\u0000-\u0008\u000B\u000C\u000E-\u001F\u007F]/g,"").trim();
if(com.length>500)return J({err:"Le commentaire est limité à 500 caractères."},400);
const rec=await L(()=>db.prepare("SELECT COUNT(*) n FROM feedback WHERE user_id=?1 AND created>?2").bind(me.id,Date.now()-HOUR).first());
if(rec&&rec.n>=5)return J({err:"Trop d’avis envoyés. Réessayez plus tard."},429);
if(ctx==="att"){if(!await db.prepare("SELECT 1 x FROM certs WHERE user_id=?1 AND type='ATT'").bind(me.id).first())return J({err:"Avis non disponible."},403)}
else if(!await db.prepare("SELECT 1 x FROM exam_attempts WHERE id=?1 AND user_id=?2 AND status='done'").bind(+ctx.slice(5),me.id).first())return J({err:"Avis non disponible."},403);
if(await db.prepare("SELECT 1 x FROM feedback WHERE user_id=?1 AND ctx=?2").bind(me.id,ctx).first())return J({err:"Vous avez déjà répondu."},409);
try{await db.prepare("INSERT INTO feedback(user_id,ctx,note_app,note_cours,note_eval,reco,comment,created) VALUES(?1,?2,?3,?4,?5,?6,?7,?8)").bind(me.id,ctx,b.app,b.cours,b.eval,b.reco,com||null,Date.now()).run()}
catch(e){if(/UNIQUE/i.test(String(e&&e.message)))return J({err:"Vous avez déjà répondu."},409);throw e}
return J({ok:true})}
