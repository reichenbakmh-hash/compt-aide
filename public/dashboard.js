const CvC=()=>{const g=k=>getComputedStyle(document.documentElement).getPropertyValue(k).trim(),dk=document.documentElement.dataset.theme==="dark";return{tx:g("--mu"),gr:g("--bd"),bg:g("--card"),ok:"#20B89A",er:dk?"#F87171":"#B91C1C",wn:dk?"#FBBF24":"#B45309",nv:dk?"#7FA6D9":"#12345A"}};
const CvRM=()=>!!(window.matchMedia&&matchMedia("(prefers-reduced-motion: reduce)").matches);
const CvF={family:"Inter, system-ui, sans-serif"};
const CvProg=n=>{const dl=1100/Math.max(n,1),py=x=>x.index===0?x.chart.scales.y.getPixelForValue(0):x.chart.getDatasetMeta(x.datasetIndex).data[x.index-1].getProps(["y"],true).y;
return{x:{type:"number",easing:"linear",duration:dl,from:NaN,delay(x){if(x.type!=="data"||x.xStarted)return 0;x.xStarted=true;return x.index*dl}},y:{type:"number",easing:"linear",duration:dl,from:py,delay(x){if(x.type!=="data"||x.yStarted)return 0;x.yStarted=true;return x.index*dl}}}};
const CvO=(c,o)=>{o=o||{};return{responsive:true,maintainAspectRatio:false,animation:CvRM()?false:o.anim,interaction:{mode:"index",intersect:false},
plugins:{legend:{display:!!o.legend,position:"bottom",labels:{color:c.tx,font:CvF,usePointStyle:true,pointStyle:"circle",boxWidth:8,boxHeight:8,padding:14}},tooltip:{titleFont:CvF,bodyFont:CvF}},
scales:o.round?undefined:{x:{ticks:{color:c.tx,font:CvF,maxRotation:0,autoSkip:true,maxTicksLimit:o.xt||7},grid:{display:false},border:{color:c.gr}},y:{beginAtZero:true,max:o.max,suggestedMax:o.smax,ticks:{color:c.tx,font:CvF,precision:o.prec==null?0:o.prec},grid:{color:c.gr},border:{display:false}}}}};
const CvL=(l,d,col,x)=>Object.assign({label:l,data:d,borderColor:col,backgroundColor:col,borderWidth:2,pointRadius:d.length>40?0:3,pointHoverRadius:5,tension:.3,spanGaps:true},x||{});
function Cv({make,deps,ht,label,empty,msg}){
const r=React.useRef(null);
useEffect(()=>{if(empty||!window.Chart||!r.current)return;const ch=new Chart(r.current,make(CvC()));return()=>ch.destroy()},(deps||[]).concat([empty]));
if(empty)return h("p",{className:"mu sm",style:{margin:0}},msg||"Pas encore de données.");
if(!window.Chart)return h("p",{className:"mu sm",style:{margin:0}},"Graphique indisponible : rechargez l’application une fois connecté à internet.");
return h("div",{style:{position:"relative",height:ht||220}},h("canvas",{ref:r,role:"img","aria-label":label}))}

const AdD=d=>new Date(d*864e5),AdF=d=>AdD(d).toLocaleDateString("fr-FR",{day:"2-digit",month:"2-digit",timeZone:"UTC"});
const AdP=v=>v==null?"—":String(v).replace(".",",")+" %",AdN=v=>v==null?"—":String(v).replace(".",",");
function AdB(ser,mode,per,today){
const m=new Map(ser),lab=[],val=[];
if(mode==="j"){for(let d=today-per+1;d<=today;d++){lab.push(AdF(d));val.push(m.get(d)||0)}return{lab,val}}
if(mode==="s"){const ws=d=>d-((d+3)%7),e=ws(today);for(let w=e-77;w<=e;w+=7){let s=0;for(let d=w;d<w+7;d++)s+=m.get(d)||0;lab.push(AdF(w));val.push(s)}return{lab,val}}
const t=AdD(today);
for(let i=11;i>=0;i--){const a=new Date(Date.UTC(t.getUTCFullYear(),t.getUTCMonth()-i,1)),b=new Date(Date.UTC(t.getUTCFullYear(),t.getUTCMonth()-i+1,1));let n=0;for(let d=a/864e5;d<b/864e5;d++)n+=m.get(d)||0;lab.push(a.toLocaleDateString("fr-FR",{month:"short",year:"2-digit",timeZone:"UTC"}));val.push(n)}
return{lab,val}}
const AdSec=t=>h("h2",{style:{margin:"20px 0 10px",fontSize:17}},t);
const AdLev=i=>"N"+(i+1);

function AdDash({theme}){
const [p,setP]=useState(30),[d,setD]=useState(null),[er,setEr]=useState(""),[g,setG]=useState("j");
useEffect(()=>{let ok=true;api("admin/stats?period="+p).then(r=>{if(!ok)return;if(r.ok){setD(r.j);setEr("")}else setEr(r.off?"Le tableau de bord d’administration nécessite une connexion internet.":r.s===403?"Accès réservé.":(r.j&&r.j.err)||"Statistiques indisponibles.")});return()=>{ok=false}},[p]);
if(!d)return er?h(Card,null,er):h(Loader);
const u=d.utilisateurs,pg=d.progression,ex=d.examens,ce=d.certifs,sa=d.satisfaction,today=Math.floor(d.generated/864e5),P=d.periode,days=Array.from({length:P},(_,i)=>today-P+1+i);
const th=[theme],sg=AdB(d.series.inscriptions,g,P,today),av=new Map(d.series.activite),sc=new Map(d.series.examens.map(x=>[x[0],x[1]]));
let cum=d.series.certifs.filter(x=>x[0]<days[0]).reduce((a,x)=>a+x[1],0);const cm=new Map(d.series.certifs),cl=days.map(x=>{cum+=cm.get(x)||0;return cum});
const lab=days.map(AdF),K=(l,v,s,t)=>h(Kpi,{key:l,l,v:String(v),s,tone:t});
return h("div",null,
er&&h("p",{className:"sm",style:{color:"var(--er)"}},er),
h(Chips,{o:[[7,"7 jours"],[30,"30 jours"],[90,"90 jours"],[365,"1 an"]],v:p,set:setP}),
AdSec("Utilisateurs"),
h("div",{className:"grid kpis"},K("Inscrits",u.total,"Comptes créés"),K("Nouveaux (7 j)",u.n7,"Inscriptions récentes"),K("Nouveaux (30 j)",u.n30,"Inscriptions récentes"),K("Actifs",u.actifs,"Activité sur "+d.actifJours+" jours"),K("Inactifs",u.inactifs,"Sans activité depuis "+d.actifJours+" jours"),K("Progression moyenne",AdP(pg.moyenne),pg.apprenants+" apprenant"+(pg.apprenants>1?"s":""))),
h("div",{className:"grid two"},h(Card,{t:"Formation"},h("p",{style:{margin:0}},"Formation unique : "+d.formation.niveaux+" niveaux, "+d.formation.etapes+" étapes."),h("p",{className:"mu sm",style:{marginBottom:0}},d.formation.inscrits+" inscrit"+(d.formation.inscrits>1?"s":"")+" (utilisateurs ayant commencé la formation) · "+pg.finis+" ayant validé les "+d.formation.etapes+" étapes."))),
AdSec("Examens et certifications"),
h("div",{className:"grid kpis"},K("Examens réalisés",ex.faits,"Tentatives soumises"),K("Réussites",ex.reussites,"Seuils atteints"),K("Échecs",ex.echecs,"Seuils non atteints",ex.echecs?"er":""),K("Taux de réussite",AdP(ex.taux),"Note moyenne : "+AdN(ex.moyenne)),K("Certifications délivrées",ce.delivres,"Certificats de réussite"),K("Attestations seules",ce.attestationsSansCertificat,"Sans certificat final"),K("Certificats révoqués",ce.revoques,ce.attestationsRevoquees+" attestation(s) révoquée(s)",ce.revoques?"er":"")),
AdSec("Évolution"),
h("div",{className:"grid two"},
h(Card,{t:"Inscriptions"},h(Chips,{o:[["j","Jour"],["s","Semaine"],["m","Mois"]],v:g,set:setG}),h(Cv,{label:"Courbe des inscriptions",empty:!u.total,deps:[d,g,theme],make:c=>({type:"line",data:{labels:sg.lab,datasets:[CvL("Inscriptions",sg.val,c.nv)]},options:CvO(c,{anim:CvProg(sg.val.length)})})})),
h(Card,{t:"Activité des utilisateurs"},h("p",{className:"mu sm",style:{marginTop:0}},"Utilisateurs actifs par jour"),h(Cv,{label:"Utilisateurs actifs par jour",empty:!d.series.activite.length,deps:[d,theme],make:c=>({type:"bar",data:{labels:lab,datasets:[{label:"Utilisateurs actifs",data:days.map(x=>av.get(x)||0),backgroundColor:c.ok,borderRadius:3}]},options:CvO(c)})}))),
h("div",{className:"grid two"},
h(Card,{t:"Progression de la formation"},h("p",{className:"mu sm",style:{marginTop:0}},"Part des apprenants ayant validé les 4 étapes de chaque niveau"),h(Cv,{label:"Progression par niveau",empty:!pg.apprenants,deps:[d,theme],make:c=>({type:"bar",data:{labels:pg.niveaux.map((_,i)=>AdLev(i)),datasets:[{label:"Apprenants ayant validé (%)",data:pg.niveaux,backgroundColor:c.nv,borderRadius:4}]},options:CvO(c,{max:100,xt:6})})})),
h(Card,{t:"Résultats d’examens"},h(Cv,{label:"Réussites et échecs",ht:200,empty:!ex.faits,deps:[d,theme],make:c=>({type:"doughnut",data:{labels:["Réussites","Échecs"],datasets:[{data:[ex.reussites,ex.echecs],backgroundColor:[c.ok,c.er],borderColor:c.bg,borderWidth:2}]},options:Object.assign(CvO(c,{round:true,legend:true}),{cutout:"68%"})})}),
h("div",{style:{height:16}}),h(Cv,{label:"Note moyenne par jour",ht:180,empty:!d.series.examens.length,msg:"Aucun examen sur cette période.",deps:[d,theme],make:c=>({type:"line",data:{labels:lab,datasets:[CvL("Note moyenne",days.map(x=>sc.has(x)?sc.get(x):null),c.nv)]},options:CvO(c,{max:100,anim:CvProg(days.length),legend:true})})}))),
h(Card,{t:"Certifications délivrées (cumul)"},h(Cv,{label:"Certifications cumulées",empty:!ce.delivres,deps:[d,theme],make:c=>({type:"line",data:{labels:lab,datasets:[CvL("Certificats délivrés",cl,c.ok,{stepped:true,pointRadius:0})]},options:CvO(c,{anim:CvProg(days.length)})})})),
AdSec("Satisfaction"),
h("div",{className:"grid kpis"},K("Satisfaction",sa.global==null?"—":AdN(sa.global)+" / 5","Moyenne des 3 notes"),K("Recommandation (NPS)",sa.nps==null?"—":(sa.nps>0?"+":"")+sa.nps,"De −100 à +100"),K("Avis reçus",sa.n,"Questionnaires remplis")),
h("div",{className:"grid two"},
h(Card,{t:"Notes moyennes"},h(Cv,{label:"Notes moyennes sur 5",empty:!sa.n,msg:"Aucun avis pour le moment.",deps:[d,theme],make:c=>({type:"bar",data:{labels:["Application","Cours","Évaluation"],datasets:[{label:"Note moyenne",data:[sa.moyennes.app,sa.moyennes.cours,sa.moyennes.eval],backgroundColor:c.nv,borderRadius:4}]},options:CvO(c,{max:5,prec:1})})})),
h(Card,{t:"Répartition de la recommandation"},h(Cv,{label:"Promoteurs, passifs, détracteurs",ht:200,empty:!sa.n,msg:"Aucun avis pour le moment.",deps:[d,theme],make:c=>({type:"doughnut",data:{labels:["Promoteurs (9-10)","Passifs (7-8)","Détracteurs (0-6)"],datasets:[{data:[sa.repartition.promoteurs,sa.repartition.passifs,sa.repartition.detracteurs],backgroundColor:[c.ok,c.wn,c.er],borderColor:c.bg,borderWidth:2}]},options:Object.assign(CvO(c,{round:true,legend:true}),{cutout:"68%"})})}))),
h(Card,{t:"Derniers commentaires"},sa.commentaires.length?sa.commentaires.map((x,i)=>h("div",{key:i,className:"li",style:{display:"block"}},h("div",{className:"mu sm"},new Date(x.t).toLocaleDateString("fr-FR")+" · "+AdN(x.n)+" / 5"),h("div",null,x.c))):"Aucun commentaire pour le moment."))}

function Adm({theme}){
const [t,setT]=useState("d");
return h("div",null,h(Head,{t:"Administration",s:"Statistiques anonymes et gestion de la certification"}),h(Chips,{o:[["d","Tableau de bord"],["g","Gestion"]],v:t,set:setT}),t==="d"?h(AdDash,{theme}):h(CfAdm))}

const StK=()=>new Date(Date.now()-new Date().getTimezoneOffset()*6e4).toISOString().slice(0,10);
function StCache(j){try{localStorage.setItem("ca_exh",JSON.stringify({s:j.seuils&&j.seuils.final||75,a:(j.attempts||[]).filter(x=>x.status==="done").map(x=>({t:x.started,f:x.final,q:x.qcm,c:x.cas_s,p:x.passed})).reverse()}))}catch(e){}}
function MesStats({theme}){
const [v,setV]=useState(0);
useEffect(()=>{if(SRV.on&&navigator.onLine!==false)api("cert/status").then(r=>{if(r.ok){StCache(r.j);setV(x=>x+1)}})},[]);
const P=LS.g("ca_par",{}),lv=PAR.map((st,i)=>Math.round(100*st.s.filter((q,j)=>P[i+"-"+j]).length/st.s.length)),ex=LS.g("ca_exh",null),A=LS.g("ca_act",{}),ks=Array.from({length:14},(_,i)=>new Date(Date.now()-new Date().getTimezoneOffset()*6e4-(13-i)*864e5).toISOString().slice(0,10)),has=!!(ex&&ex.a&&ex.a.length);
return h("div",null,h(Head,{t:"Mes statistiques",s:"Calculées sur votre appareil : disponibles sans connexion"}),
h("div",{className:"grid two"},
h(Card,{t:"Progression par niveau"},h(Cv,{label:"Progression par niveau",deps:[theme,JSON.stringify(lv)],make:c=>({type:"bar",data:{labels:lv.map((_,i)=>AdLev(i)),datasets:[{label:"Étapes validées (%)",data:lv,backgroundColor:c.ok,borderRadius:4}]},options:CvO(c,{max:100,xt:6})})})),
h(Card,{t:"Activité récente"},h("p",{className:"mu sm",style:{marginTop:0}},"Actions enregistrées sur les 14 derniers jours"),h(Cv,{label:"Activité des 14 derniers jours",empty:!ks.some(k=>A[k]),msg:"Aucune activité récente.",deps:[theme,v,JSON.stringify(A)],make:c=>({type:"bar",data:{labels:ks.map(k=>k.slice(8)+"/"+k.slice(5,7)),datasets:[{label:"Actions",data:ks.map(k=>A[k]||0),backgroundColor:c.nv,borderRadius:3}]},options:CvO(c,{xt:7})})}))),
h(Card,{t:"Historique des notes d’examen"},h(Cv,{label:"Notes d’examen",empty:!has,msg:"Aucune évaluation passée pour l’instant.",deps:[theme,v],make:c=>{const a=ex.a,lb=a.map(x=>new Date(x.t).toLocaleDateString("fr-FR",{day:"2-digit",month:"2-digit"}));return{type:"line",data:{labels:lb,datasets:[CvL("Note finale",a.map(x=>x.f),c.nv,{borderWidth:3}),CvL("QCM",a.map(x=>x.q),c.ok,{borderWidth:1.5}),CvL("Cas pratiques",a.map(x=>x.c),c.wn,{borderWidth:1.5}),CvL("Seuil de réussite",a.map(()=>ex.s),c.tx,{borderDash:[6,4],pointRadius:0,borderWidth:1.5})]},options:CvO(c,{max:100,legend:true,anim:CvProg(a.length)})}}})))}

function CfPend(st){
const sk=LS.g("ca_fbx",[]),an=st.avis||[],lim=Date.now()-14*864e5,ev=[],at=st.certs.find(x=>x.type==="ATT");
if(at)ev.push({ctx:"att",t:at.issued,l:"la formation"});
(st.attempts||[]).filter(x=>x.status==="done").forEach(x=>ev.push({ctx:"exam-"+x.id,t:x.started,l:"l’évaluation"}));
return ev.filter(x=>x.t>lim&&!an.includes(x.ctx)&&!sk.includes(x.ctx)).sort((a,b)=>b.t-a.t)[0]||null}
function CfFb({p,done}){
const [n,setN]=useState({app:0,cours:0,eval:0}),[r,setR]=useState(-1),[cm,setCm]=useState(""),[bz,setBz]=useState(false),[er,setEr]=useState("");
const ok=n.app&&n.cours&&n.eval&&r>=0;
const row=(k,l)=>h("div",{style:{marginBottom:12}},h("div",{className:"lbl"},l),h("div",{className:"chips",style:{marginBottom:0}},[1,2,3,4,5].map(i=>h("button",{key:i,type:"button",className:"chip"+(n[k]===i?" on":""),"aria-pressed":n[k]===i,"aria-label":l+" : "+i+" sur 5",onClick:()=>setN(Object.assign({},n,{[k]:i}))},String(i)))));
const send=async()=>{setBz(true);setEr("");const x=await api("feedback","POST",{ctx:p.ctx,app:n.app,cours:n.cours,eval:n.eval,reco:r,comment:cm.trim()});setBz(false);if(x.ok||x.s===409)done();else setEr(x.off?"Hors ligne : réessayez avec une connexion internet.":(x.j&&x.j.err)||"Envoi impossible.")};
const skip=()=>{const a=LS.g("ca_fbx",[]);LS.s("ca_fbx",a.concat([p.ctx]).slice(-50));done()};
return h("div",{style:{marginBottom:12}},h(Card,{t:"Votre avis sur "+p.l},
h("p",{className:"mu sm",style:{marginTop:0}},"Quelques secondes : trois notes, une recommandation et un commentaire facultatif. Votre avis n’est jamais affiché avec votre nom."),
row("app","L’application"),row("cours","Les cours"),row("eval","L’évaluation"),
h("div",{className:"lbl"},"Recommanderiez-vous Compt’Aide à un proche ? (0 = pas du tout, 10 = absolument)"),
h("div",{className:"chips"},Array.from({length:11},(_,i)=>h("button",{key:i,type:"button",className:"chip"+(r===i?" on":""),"aria-pressed":r===i,"aria-label":"Recommandation "+i+" sur 10",onClick:()=>setR(i)},String(i)))),
h("label",{className:"lbl",htmlFor:"fbc"},"Commentaire (facultatif)"),
h("textarea",{id:"fbc",className:"inp",rows:3,maxLength:500,value:cm,onChange:e=>setCm(e.target.value),style:{resize:"vertical"}}),
er&&h("p",{className:"sm",style:{color:"var(--er)"}},er),
h("div",{className:"chips",style:{marginBottom:0}},h("button",{className:"btn",disabled:bz||!ok,onClick:send},"Envoyer"),h("button",{className:"btn ghost",disabled:bz,onClick:skip},"Ignorer"))))}
