// Moteur d'évaluation : banque de questions, exercices paramétrés, correction multicritère.
// Fonctions pures (aucun accès base) : testables seules.
export const SEUILS={qcm:70,cas:70,final:75,wq:.4,wc:.6,nq:20,nc:3,duree:3600000,essaisJour:3};
const Q=[["Un compte de charge augmente au…",["débit","crédit","solde","report"],0],["Le compte 401 enregistre…",["les clients","les fournisseurs","la banque","le capital"],1],["Quel compte enregistre la TVA collectée ?",["44566","44571","44551","44567"],1],["Quel compte enregistre la TVA déductible sur achats ?",["44566","44571","44551","4457"],0],["Quelle classe regroupe les charges ?",["4","5","6","7"],2],["La classe 7 regroupe…",["les charges","les tiers","les produits","les stocks"],2],["Écriture de dotation aux amortissements :",["débit 681 / crédit 28x","débit 28x / crédit 681","débit 601 / crédit 401","débit 512 / crédit 411"],0],["Achat à crédit de 1 000 € HT, TVA 20 % : crédit du 401 =",["1 000 €","1 200 €","200 €","800 €"],1],["Dans toute écriture, le total débit est…",["supérieur au total crédit","inférieur au total crédit","égal au total crédit","indépendant du crédit"],2],["Le compte 512 représente…",["la caisse","la banque","les clients","le capital"],1],["Une facture non parvenue se comptabilise au compte…",["408","418","486","487"],0],["Les charges constatées d’avance se comptabilisent au compte…",["486","487","408","418"],0],["Durée de conservation des documents comptables :",["3 ans","5 ans","10 ans","30 ans"],2],["Matériel de 3 000 € amorti sur 4 ans en linéaire : dotation annuelle =",["600 €","750 €","1 000 €","1 200 €"],1],["Le lettrage consiste à…",["calculer la TVA","associer une facture à son règlement","clôturer l’exercice","amortir un bien"],1],["Le compte 411 est normalement…",["créditeur","débiteur","toujours nul","un compte de charge"],1],["Le FEC est…",["un fichier des écritures comptables exigible en contrôle","une déclaration de TVA","un contrat de travail","un relevé bancaire"],0],["Taux normal de TVA en France :",["5,5 %","10 %","20 %","25 %"],2],["TVA à décaisser =",["déductible − collectée","collectée − déductible","collectée + déductible","HT × 2"],1],["Un apport en capital est crédité au compte…",["101","512","411","607"],0],["Le compte de caisse 53 ne doit jamais être…",["débiteur","créditeur","utilisé","soldé"],1],["Valeur nette comptable =",["coût d’acquisition − amortissements cumulés","coût d’acquisition + amortissements","dotation × 2","prix de vente − TVA"],0],["Le compte 471 est un compte…",["d’attente","de capital","de charge","de produit"],0],["Les classes 1 à 5 alimentent…",["le compte de résultat","le bilan","la seule liasse fiscale","la TVA"],1],["Un avoir reçu d’un fournisseur…",["augmente la dette","annule tout ou partie d’une facture d’achat","est une charge","est un apport"],1],["Le rapprochement bancaire compare…",["411 et 401","512 et le relevé bancaire","101 et 512","53 et 512"],1],["L’indépendance des exercices impose de…",["rattacher chaque charge et produit à l’exercice concerné","payer avant la clôture","ne rien reporter","clôturer chaque mois"],0],["Le salaire brut est enregistré au compte…",["641","421","431","681"],0],["Une immobilisation est…",["un bien durable destiné à rester dans l’entreprise","une dépense courante","une dette","un produit"],0],["Le journal des achats enregistre…",["les factures fournisseurs","les encaissements","les seules paies","les amortissements"],0]];
export const STATIC=Q.map((x,i)=>({id:"s"+i,q:x[0],o:x[1],ok:x[2]}));
const mb=s=>()=>{s|=0;s=s+0x6D2B79F5|0;let t=Math.imul(s^s>>>15,1|s);t=t+Math.imul(t^t>>>7,61|t)^t;return((t^t>>>14)>>>0)/4294967296};
const hs=s=>{let h=2166136261;for(const c of String(s)){h^=c.charCodeAt(0);h=Math.imul(h,16777619)}return h>>>0};
const shuf=(a,r)=>{a=a.slice();for(let i=a.length-1;i>0;i--){const j=Math.floor(r()*(i+1));[a[i],a[j]]=[a[j],a[i]]}return a};
const r2=x=>Math.round(x*100)/100,fe=n=>n.toFixed(2).replace(".",",")+" €";
export const perm=(seed,id,n)=>shuf([...Array(n).keys()],mb(hs(seed+":"+id)));
export const pickQ=(seed,pool,n)=>shuf(pool,mb(hs(seed+":q"))).slice(0,n).map(x=>x.id);
export const qView=(seed,it)=>({id:it.id,q:it.q,o:perm(seed,it.id,it.o.length).map(i=>it.o[i])});
export const qOk=(seed,it,k)=>k===perm(seed,it.id,it.o.length).indexOf(it.ok);
const rr=(r,a,b)=>a+Math.floor(r()*(b-a+1));
const TPL=[r=>{const h=rr(r,10,500)*10,t=r2(h*.2);return["Achat de marchandises à crédit : "+fe(h)+" HT, TVA 20 %.",[["607",h,0],["44566",t,0],["401",0,r2(h+t)]]]},
r=>{const h=rr(r,10,500)*10,t=r2(h*.2);return["Facture de prestations de services à un client : "+fe(h)+" HT, TVA 20 %, paiement à 30 jours.",[["411",r2(h+t),0],["706",0,h],["44571",0,t]]]},
r=>{const m=rr(r,10,900)*10;return["Règlement par virement d’une facture fournisseur de "+fe(m)+" TTC.",[["401",m,0],["512",0,m]]]},
r=>{const n=rr(r,3,5),v=n*rr(r,10,100)*50,d=r2(v/n);return["Matériel informatique de "+fe(v)+" amorti en linéaire sur "+n+" ans. Passez la dotation annuelle.",[["681",d,0],["28183",0,d]]]},
r=>{const m=rr(r,10,99);return["La banque prélève "+fe(m)+" de frais de tenue de compte, sans TVA.",[["627",m,0],["512",0,m]]]},
r=>{const m=rr(r,10,300)*10;return["Paiement par virement de la TVA à décaisser de "+fe(m)+".",[["44551",m,0],["512",0,m]]]},
r=>{const h=rr(r,10,300)*10;return["Au 31 décembre, une prestation de sous-traitance de "+fe(h)+" HT a été réalisée mais la facture n’est pas reçue.",[["611",h,0],["408",0,h]]]},
r=>{const b=rr(r,15,40)*100,c=r2(b*.22);return["Paie : salaire brut "+fe(b)+", cotisations salariales 22 % ("+fe(c)+"). Enregistrez le salaire brut, la dette envers le salarié et envers les organismes sociaux.",[["641",b,0],["421",0,r2(b-c)],["431",0,c]]]}];
export const NTPL=TPL.length;
export const casOf=(seed,k)=>{const x=TPL[k%NTPL](mb(hs(seed+":"+k)));return{t:x[0],exp:x[1]}};
export const pickCas=(seed,n)=>shuf([...Array(NTPL).keys()],mb(hs(seed+":c"))).slice(0,n);
const num=v=>parseFloat(String(v==null?"":v).replace(/\s/g,"").replace(",","."))||0;
// Correction multicritère : comptes /35, sens /25, montants /30, équilibre /10, pénalité -5 par ligne en trop (max -15)
export function grade(exp,L){
L=(Array.isArray(L)?L:[]).filter(x=>Array.isArray(x)&&String(x[0]||"").trim()).slice(0,12).map(x=>[String(x[0]).trim(),r2(num(x[1])),r2(num(x[2]))]);
const used=new Set();let a=0,s=0,m=0;
for(const e of exp){const i=L.findIndex((x,k)=>!used.has(k)&&x[0]===e[0]);if(i<0)continue;used.add(i);a++;const x=L[i];
if((e[1]>0)===(x[1]>0)&&(e[2]>0)===(x[2]>0))s++;if(Math.abs(x[1]-e[1])<.005&&Math.abs(x[2]-e[2])<.005)m++}
const n=exp.length,D=r2(L.reduce((t,x)=>t+x[1],0)),C=r2(L.reduce((t,x)=>t+x[2],0));
const crit={comptes:r2(35*a/n),sens:r2(25*s/n),montants:r2(30*m/n),equilibre:D>0&&D===C?10:0,penalite:-Math.min(15,5*(L.length-used.size))};
const score=Math.max(0,Math.min(100,Math.round(Object.values(crit).reduce((t,x)=>t+x,0))));
return{score,crit,exp}}
export const finale=(q,c)=>{const f=Math.round(SEUILS.wq*q+SEUILS.wc*c);return{final:f,passed:q>=SEUILS.qcm&&c>=SEUILS.cas&&f>=SEUILS.final}};
