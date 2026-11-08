/* Certification : interface (chargé avant le script principal ; utilise ses composants au moment du rendu). */
const CfD=t=>new Date(t).toLocaleDateString("fr-FR"),CfM=ms=>{const s=Math.max(0,Math.round(ms/1000));return Math.floor(s/60)+":"+String(s%60).padStart(2,"0")};
const CfCR=[["comptes","Comptes utilisés","/35"],["sens","Sens débit / crédit","/25"],["montants","Montants","/30"],["equilibre","Équilibre de l’écriture","/10"],["penalite","Lignes en trop",""]];
const CfBlank=()=>[["","",""],["","",""],["","",""]];
function CfRows({rows,set}){
const ch=(i,j,v)=>set(rows.map((x,a)=>a===i?x.map((y,b)=>b===j?v:y):x));
return h("div",null,h("div",{className:"sc"},h("table",{className:"tb"},h("thead",null,h("tr",null,h("th",null,"Compte"),h("th",{className:"n"},"Débit"),h("th",{className:"n"},"Crédit"))),h("tbody",null,rows.map((x,i)=>h("tr",{key:i},h("td",null,h("input",{className:"inp",style:{margin:0,minWidth:84},list:"cpt3",inputMode:"numeric",value:x[0],placeholder:"ex. 607",onChange:e=>ch(i,0,e.target.value),"aria-label":"Compte ligne "+(i+1)})),[1,2].map(j=>h("td",{key:j},h("input",{className:"inp",style:{margin:0,minWidth:78,textAlign:"right"},inputMode:"decimal",value:x[j],onChange:e=>ch(i,j,e.target.value),"aria-label":(j===1?"Débit":"Crédit")+" ligne "+(i+1)})))))))),
h("button",{className:"btn ghost",style:{marginTop:8},onClick:()=>set(rows.concat([["","",""]]))},"Ajouter une ligne"));}
function CfCrit({g}){return h("div",null,CfCR.map(c=>h("div",{className:"row",key:c[0]},h("span",null,c[1]),h("b",null,(g.crit[c[0]]>0&&c[0]==="penalite"?"+":"")+g.crit[c[0]]+c[2]))),h("div",{className:"row"},h("b",null,"Note"),h("b",null,g.score+" / 100")),h("div",{className:"mu sm",style:{margin:"8px 0 4px"}},"Corrigé"),h(Lines,{l:g.exp.map(x=>[x[0],lab(x[0])||"",x[1],x[2]])}));}
function CfExo(){
const [x,setX]=useState(null),[rows,setR]=useState(CfBlank),[g,setG]=useState(null),[bz,setBz]=useState(false);
const nw=async()=>{setBz(true);setG(null);setR(CfBlank());const r=await api("cert/exo?seed="+Math.floor(Math.random()*1e9));if(r.ok)setX(r.j);setBz(false)};
useEffect(()=>{nw()},[]);
const go=async()=>{setBz(true);const r=await api("cert/grade","POST",{seed:x.seed,l:rows});if(r.ok)setG(r.j);setBz(false)};
return h("div",null,h(Head,{t:"Exercices interactifs",s:"Correction détaillée par critère, sans effet sur votre note"}),
h("datalist",{id:"cpt3"},PCGD.filter(y=>y[0].length>=3).map(y=>h("option",{key:y[0],value:y[0]},y[1]))),
h(Card,null,x?h("div",null,h("p",{style:{marginTop:0,fontWeight:600,color:"var(--hd)"}},x.t),h(CfRows,{rows,set:v=>{setG(null);setR(v)}}),h("div",{className:"chips",style:{marginTop:12,marginBottom:0}},h("button",{className:"btn",disabled:bz,onClick:go},"Corriger"),h("button",{className:"btn ghost",disabled:bz,onClick:nw},"Autre exercice"))):"Chargement…"),
g&&h("div",{style:{marginTop:12}},h(Card,{t:"Correction"},h(CfCrit,{g}))));}
function CfExam({st,reload}){
const [ex,setEx]=useState(null),[a,setA]=useState([]),[c,setC]=useState([CfBlank(),CfBlank(),CfBlank()]),[res,setRes]=useState(null),[er,setEr]=useState(""),[now,setNow]=useState(Date.now()),[bz,setBz]=useState(false);
useEffect(()=>{if(!ex)return;const i=setInterval(()=>setNow(Date.now()),1000);return()=>clearInterval(i)},[ex]);
const start=async()=>{setBz(true);setEr("");const r=await api("cert/start","POST",{});if(r.ok&&r.j.qcm){setEx(r.j);setA([]);setC([CfBlank(),CfBlank(),CfBlank()]);setRes(null)}else setEr((r.j&&r.j.err)||"Erreur.");setBz(false)};
const send=async()=>{if(!confirm("Soumettre l’évaluation ? Vous ne pourrez plus la modifier."))return;setBz(true);const r=await api("cert/submit","POST",{id:ex.id,a,c});if(r.ok){setRes(r.j);setEx(null)}else{setEr((r.j&&r.j.err)||"Erreur.");if(r.s===410||r.s===404)setEx(null)}setBz(false);reload()};
const S=st.seuils;
if(res)return h("div",null,h(Head,{t:"Résultat de l’évaluation",s:res.passed?"Réussite":"Seuils non atteints"}),
h("div",{className:"grid kpis"},h(Kpi,{l:"QCM",v:res.qcm+" / 100",s:res.bonnes+"/"+res.total+" bonnes réponses · seuil "+S.qcm,tone:res.qcm>=S.qcm?"":"er"}),h(Kpi,{l:"Cas pratiques",v:res.cas+" / 100",s:"seuil "+S.cas,tone:res.cas>=S.cas?"":"er"}),h(Kpi,{l:"Note finale",v:res.final+" / 100",s:"40 % QCM + 60 % cas · seuil "+S.final,tone:res.passed?"":"er"})),
h(Card,null,h("p",{style:{margin:0}},res.passed?"Votre certificat est disponible dans l’onglet Documents.":"Chaque seuil doit être atteint en même temps que la note finale. Reprenez les leçons puis recommencez.")),
res.detail.map((d,i)=>h("div",{key:i,style:{marginTop:12}},h(Card,{t:"Cas pratique "+(i+1)},h("p",{style:{marginTop:0}},d.t),h(CfCrit,{g:d})))));
if(!ex)return h("div",null,h(Head,{t:"Évaluation finale",s:"QCM (20 questions) puis 3 cas pratiques · 60 minutes"}),
h(Card,null,h("p",{style:{marginTop:0}},"Seuils : QCM "+S.qcm+"/100, cas pratiques "+S.cas+"/100, note finale pondérée (40 % QCM, 60 % cas) d’au moins "+S.final+"/100. Questions tirées au hasard. "+S.essaisJour+" tentatives par 24 heures ; il vous en reste "+st.left+"."),
!st.examOpen&&h("p",{className:"sm",style:{color:"var(--er)"}},"L’évaluation est momentanément fermée."),
st.certs.some(x=>x.type==="CRT")&&h("p",{className:"sm",style:{color:"var(--acx)"}},"Votre certificat a déjà été délivré."),
er&&h("p",{className:"sm",style:{color:"var(--er)"}},er),
h("button",{className:"btn",disabled:bz||!st.examOpen,onClick:start},st.open?"Reprendre la tentative en cours":"Commencer l’évaluation")));
const left=ex.ends-now;
return h("div",null,h(Head,{t:"Évaluation en cours",s:"Temps restant : "+CfM(left)}),
h("datalist",{id:"cpt3"},PCGD.filter(y=>y[0].length>=3).map(y=>h("option",{key:y[0],value:y[0]},y[1]))),
h(Card,{t:"Partie 1 · QCM"},ex.qcm.map((q,i)=>h("div",{key:q.id,style:{marginBottom:14}},h("p",{style:{margin:"0 0 6px",fontWeight:600,color:"var(--hd)"}},(i+1)+". "+q.q),q.o.map((o,k)=>h("label",{key:k,className:"li",style:{alignItems:"center",cursor:"pointer",padding:"6px 0"}},h("input",{type:"radio",name:"q"+i,checked:a[i]===k,onChange:()=>{const n=a.slice();n[i]=k;setA(n)},style:{width:18,height:18}}),h("span",null,o)))))),
h("div",{style:{height:12}}),
ex.cas.map((x,i)=>h("div",{key:i,style:{marginBottom:12}},h(Card,{t:"Partie 2 · Cas pratique "+(i+1)},h("p",{style:{marginTop:0}},x.t),h(CfRows,{rows:c[i],set:v=>setC(c.map((y,k)=>k===i?v:y))})))),
er&&h("p",{className:"sm",style:{color:"var(--er)"}},er),
h("button",{className:"btn",disabled:bz,onClick:send},"Soumettre l’évaluation"));}
function CfDocs({st,reload,user}){
const [nom,setNom]=useState(st.nom||user.nom||""),[m,setM]=useState(""),[bz,setBz]=useState(false);
const sv=async()=>{setBz(true);setM("");const r=await api("data","PUT",{key:"ca_nom",value:nom.trim()});if(r.ok){try{localStorage.setItem("ca_nom",JSON.stringify(nom.trim()))}catch(e){}await reload();setM("Nom enregistré.")}else setM("Enregistrement impossible.");setBz(false)};
const A=st.certs.find(x=>x.type==="ATT"),C=st.certs.find(x=>x.type==="CRT"),pdf=async c=>{try{await certPdf(c,location.origin)}catch(e){setM("Génération du PDF impossible : vérifiez la connexion.")}};
const Doc=(t,c,vide)=>h(Card,{t},c?h("div",null,h("div",{className:"row"},h("span",null,"Numéro"),h("b",null,c.num)),h("div",{className:"row"},h("span",null,"Délivré le"),h("b",null,CfD(c.issued))),h("div",{className:"row"},h("span",null,"Titulaire"),h("b",null,c.titulaire)),c.revoked?h("span",{className:"badge er"},"Révoqué"):h("span",{className:"badge ok"},"Valide"),h("div",{className:"chips",style:{margin:"12px 0 0"}},h("button",{className:"btn",disabled:!!c.revoked,onClick:()=>pdf(c)},"Télécharger le PDF"),h("a",{className:"btn ghost",style:{textDecoration:"none",display:"inline-flex",alignItems:"center"},href:"/verifier.html?n="+c.num,target:"_blank",rel:"noopener"},"Vérifier"))):h("p",{style:{margin:0}},vide));
return h("div",null,h(Head,{t:"Attestation et certificat",s:"Deux documents distincts, vérifiables en ligne"}),h("div",{className:"card",style:{background:"var(--acs)",borderColor:"transparent",marginBottom:12}},h("div",{style:{display:"flex",gap:14,alignItems:"center"}},h(Icon,{n:"award",s:36}),h("div",null,h("b",{style:{color:"var(--hd)"}},"Valorisez votre parcours"),h("div",{style:{fontSize:14,marginTop:2}},"Une attestation dès la fin du parcours, un certificat de réussite après l’évaluation finale. Chaque document a un numéro unique et un QR code : n’importe qui peut le vérifier en ligne.")))),
h(Card,{t:"Nom sur les documents"},h("p",{className:"mu sm",style:{marginTop:0}},"Nom complet, tel qu’il apparaîtra. Il est figé à la délivrance de chaque document."),h("input",{className:"inp",value:nom,onChange:e=>setNom(e.target.value),maxLength:60,"aria-label":"Nom complet",disabled:!!(A&&C)}),h("button",{className:"btn ghost",disabled:bz||nom.trim().length<3||!!(A&&C),onClick:sv},"Enregistrer"),m&&h("span",{className:"sm",style:{marginLeft:10}},m)),
h("div",{style:{height:12}}),
h(Card,{t:"Parcours"},h(Prog,{l:"Étapes obligatoires validées",v:st.n/st.total*100}),h("p",{className:"mu sm",style:{marginBottom:0}},st.n+" sur "+st.total+(st.n<st.total?" : cochez les étapes dans l’onglet Parcours.":st.nom?" · attestation délivrée automatiquement.":" : renseignez votre nom pour recevoir l’attestation."))),
h("div",{style:{height:12}}),Doc("Attestation de parcours",A,"Délivrée automatiquement quand les 24 étapes du parcours sont validées et le nom renseigné."),
h("div",{style:{height:12}}),Doc("Certificat de réussite",C,"Disponible après l’évaluation finale (onglet Évaluation)."),
);}
function CfHist({st}){return h("div",null,h(Head,{t:"Historique",s:"Vos tentatives d’évaluation"}),h(Card,null,st.attempts.length?st.attempts.map(x=>h("div",{className:"li",key:x.id,style:{display:"block"}},h("div",{className:"row"},h("b",{style:{color:"var(--hd)"}},CfD(x.started)),h("span",{className:"badge "+(x.passed?"ok":x.status==="done"?"er":"wn")},x.passed?"Réussi":x.status==="done"?"Échec":x.status==="open"?"En cours":"Expiré")),x.status==="done"&&h("div",{className:"mu sm"},"QCM "+x.qcm+" · Cas "+x.cas_s+" · Note finale "+x.final))):"Aucune tentative."));}
function CfAdm(){
const [d,setD]=useState(null),[m,setM]=useState(""),[em,setEm]=useState(""),[f,setF]=useState({q:"",o:["","","",""],ok:0});
const ld=()=>api("admin/overview").then(r=>{if(r.ok)setD(r.j);else setM((r.j&&r.j.err)||"Accès refusé.")});useEffect(()=>{ld()},[]);
const act=async(p,b,msg)=>{const r=await api(p,"POST",b);setM(r.ok?(msg||"Fait."):(r.j&&r.j.err)||"Erreur.");ld();return r.ok};
if(!d)return h("div",null,h(Head,{t:"Administration",s:m||"Chargement…"}));
return h("div",null,h(Head,{t:"Administration",s:d.users+" comptes · "+d.attempts+" tentatives · "+d.certs.length+" documents récents"}),m&&h("p",{className:"sm"},m),
h(Card,{t:"Examen"},h("p",{style:{marginTop:0}},"État : "+(d.open?"ouvert":"fermé")+" · banque : "+d.statiques+" questions de base"),h("button",{className:"btn ghost",onClick:()=>act("admin/exam",{open:!d.open})},d.open?"Fermer l’évaluation":"Rouvrir l’évaluation"),h("div",{style:{height:12}}),h("label",{className:"lbl"},"Réinitialiser les tentatives d’un compte (e-mail)"),h("input",{className:"inp",value:em,onChange:e=>setEm(e.target.value)}),h("button",{className:"btn ghost",disabled:!em,onClick:()=>act("admin/reset",{email:em},"Tentatives supprimées.")},"Réinitialiser")),
h("div",{style:{height:12}}),h(Card,{t:"Ajouter une question"},h("input",{className:"inp",placeholder:"Énoncé",value:f.q,onChange:e=>setF({...f,q:e.target.value})}),f.o.map((o,i)=>h("label",{key:i,style:{display:"flex",gap:8,alignItems:"center",marginBottom:8}},h("input",{type:"radio",name:"bonne",checked:f.ok===i,onChange:()=>setF({...f,ok:i}),style:{width:18,height:18}}),h("input",{className:"inp",style:{margin:0},placeholder:"Réponse "+(i+1),value:o,onChange:e=>setF({...f,o:f.o.map((y,k)=>k===i?e.target.value:y)})}))),h("p",{className:"mu sm"},"La pastille indique la bonne réponse."),h("button",{className:"btn",onClick:async()=>{if(await act("admin/q",f,"Question ajoutée."))setF({q:"",o:["","","",""],ok:0})}},"Ajouter")),
d.qs.length>0&&h("div",{style:{marginTop:12}},h(Card,{t:"Questions ajoutées"},d.qs.map(x=>h("div",{className:"li",key:x.id,style:{alignItems:"center"}},h("div",{style:{flex:1},className:x.active?"":"mu"},x.q),h("button",{className:"btn ghost",onClick:()=>act("admin/qtoggle",{id:x.id,active:!x.active})},x.active?"Retirer":"Réactiver"))))),
h("div",{style:{height:12}}),h(Card,{t:"Documents délivrés"},d.certs.length?d.certs.map(x=>h("div",{className:"li",key:x.num,style:{display:"block"}},h("div",{className:"row"},h("b",{style:{color:"var(--hd)"}},x.num),h("span",{className:"badge "+(x.revoked?"er":"ok")},x.revoked?"Révoqué":"Valide")),h("div",{className:"mu sm"},x.titulaire+" · "+x.email+" · "+CfD(x.issued)),h("button",{className:"btn ghost",style:{marginTop:6},onClick:()=>act("admin/revoke",{num:x.num,revoked:!x.revoked})},x.revoked?"Rétablir":"Révoquer"))):"Aucun document."),
h("div",{style:{height:12}}),h(Card,{t:"Dernières tentatives"},d.att.length?d.att.map(x=>h("div",{className:"li",key:x.id,style:{display:"block"}},h("b",null,x.email),h("div",{className:"mu sm"},CfD(x.started)+" · "+(x.status==="done"?"QCM "+x.qcm+" · Cas "+x.cas_s+" · Final "+x.final+(x.passed?" · réussi":""):x.status)))):"Aucune."));}
function Certif({user}){
const [t,setT]=useState("d"),[st,setSt]=useState(null),[er,setEr]=useState("");
const reload=()=>api("cert/status").then(r=>{if(r.ok)setSt(r.j);else setEr("Le service de certification est indisponible.")}).catch(()=>setEr("Le service de certification est indisponible."));
useEffect(()=>{reload()},[]);
if(!SRV.on)return h("div",null,h(Head,{t:"Certification",s:"Nécessite le mode en ligne"}),h(Card,null,"La certification utilise le serveur : connectez-vous avec un compte en ligne."));
const tabs=[["d","Documents"],["e","Évaluation"],["x","Exercices"],["h","Historique"]].concat(user.admin?[["a","Administration"]]:[]);
return h("div",null,h(Chips,{o:tabs,v:t,set:setT}),!st?h(Card,null,er||"Chargement…"):t==="d"?h(CfDocs,{st,reload,user,key:st.nom+st.certs.length}):t==="e"?h(CfExam,{st,reload}):t==="x"?h(CfExo):t==="h"?h(CfHist,{st}):h(CfAdm));}
