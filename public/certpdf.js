/* Génération des PDF (jsPDF + QR code, chargés à la demande depuis cdnjs). */
const PdfLoad=u=>new Promise((ok,ko)=>{const s=document.createElement("script");s.src=u;s.onload=ok;s.onerror=()=>ko(new Error("chargement"));document.head.appendChild(s)});
async function certPdf(c,origin){
if(!window.jspdf)await PdfLoad("https://cdnjs.cloudflare.com/ajax/libs/jspdf/2.5.1/jspdf.umd.min.js");
if(!window.qrcode)await PdfLoad("https://cdnjs.cloudflare.com/ajax/libs/qrcode-generator/1.4.4/qrcode.min.js");
const {jsPDF}=window.jspdf,d=new jsPDF({orientation:"landscape",unit:"mm",format:"a4"}),W=297,H=210,CX=W/2;
const NV=[18,52,90],GD=[184,146,58],GR=[90,98,112],IV=[251,248,241],att=c.type==="ATT",cl=t=>String(t).replace(/’/g,"'");
const url=origin+"/verifier.html?n="+c.num,dt=new Date(c.issued).toLocaleDateString("fr-FR",{day:"numeric",month:"long",year:"numeric"});
const fill=a=>d.setFillColor(a[0],a[1],a[2]),draw=a=>d.setDrawColor(a[0],a[1],a[2]),ink=a=>d.setTextColor(a[0],a[1],a[2]);
// fond, filigrane, cadres
fill(IV);d.rect(0,0,W,H,"F");
try{d.setGState(new d.GState({opacity:.05}));ink(NV);d.setFont("times","bold");d.setFontSize(120);d.text("COMPT'AIDE",CX,125,{align:"center",angle:20});d.setGState(new d.GState({opacity:1}))}catch(e){}
draw(NV);d.setLineWidth(2.4);d.rect(7,7,W-14,H-14);
draw(GD);d.setLineWidth(.6);d.rect(11,11,W-22,H-22);
draw(NV);d.setLineWidth(.25);d.rect(13.2,13.2,W-26.4,H-26.4);
fill(GD);[[11,11],[W-11,11],[11,H-11],[W-11,H-11]].forEach(p=>{d.lines([[2.6,2.6],[-2.6,2.6],[-2.6,-2.6],[2.6,-2.6]],p[0],p[1]-2.6,[1,1],"F",true)});
// en-tête : écusson, nom, mention
fill(NV);d.circle(CX,32,10.5,"F");draw(GD);d.setLineWidth(.7);d.circle(CX,32,9);
ink(GD);d.setFont("times","bold");d.setFontSize(15);d.text("CA",CX,34,{align:"center"});
ink(NV);d.setFont("helvetica","bold");d.setFontSize(11);d.text("COMPT'AIDE",CX,50,{align:"center",charSpace:3.2});
ink(GR);d.setFont("helvetica","normal");d.setFontSize(7.5);d.text("FORMATION COMPTABLE ET FINANCIERE",CX,54.6,{align:"center",charSpace:1.6});
// titre
ink(NV);d.setFont("times","bold");d.setFontSize(31);d.text(att?"ATTESTATION DE PARCOURS":"CERTIFICAT DE REUSSITE".replace("REUSSITE","RÉUSSITE"),CX,73,{align:"center",charSpace:1.4});
draw(GD);d.setLineWidth(.6);d.line(CX-52,79,CX-4,79);d.line(CX+4,79,CX+52,79);fill(GD);d.lines([[2.2,2.2],[-2.2,2.2],[-2.2,-2.2],[2.2,-2.2]],CX,76.8,[1,1],"F",true);
// bénéficiaire
ink(GR);d.setFont("times","italic");d.setFontSize(13);d.text(att?"La présente attestation est délivrée à":"Le présent certificat est décerné à",CX,91,{align:"center"});
ink(NV);d.setFont("times","bolditalic");d.setFontSize(35);d.text(cl(c.titulaire),CX,106,{align:"center"});
const nw=Math.min(190,d.getTextWidth(cl(c.titulaire))+24);draw(GD);d.setLineWidth(.5);d.line(CX-nw/2,110,CX+nw/2,110);
ink(GR);d.setFont("times","normal");d.setFontSize(12);
const tx=att?"qui a suivi et validé l'ensemble des étapes obligatoires du parcours « Collaborateur comptable » : 6 niveaux et "+(c.data.etapes||24)+" étapes de formation.":"qui a réussi l'évaluation finale de Compt'Aide, composée d'un QCM et de cas pratiques d'écritures comptables, avec les résultats suivants.";
d.text(d.splitTextToSize(cl(tx),185),CX,119,{align:"center",lineHeightFactor:1.35});
// résultats du certificat
if(!att){[["QCM",c.data.qcm,"seuil 70"],["CAS PRATIQUES",c.data.cas,"seuil 70"],["NOTE FINALE",c.data.final,"seuil 75"]].forEach((x,i)=>{const bx=CX-69+i*48+(i*0),w=42;fill(IV);draw(GD);d.setLineWidth(.5);d.rect(bx+0,133,w,19,"FD");ink(NV);d.setFont("times","bold");d.setFontSize(19);d.text(x[1]+" / 100",bx+w/2,142.5,{align:"center"});ink(GR);d.setFont("helvetica","normal");d.setFontSize(6.5);d.text(x[0]+" · "+x[2],bx+w/2,148.6,{align:"center",charSpace:.4})})}
// sceau
const sx=CX,sy=att?166:171,pts=[];for(let i=0;i<48;i++){const r=i%2?13.2:15.6,a=i*Math.PI/24;pts.push([sx+r*Math.cos(a),sy+r*Math.sin(a)])}
fill(GD);d.lines(pts.slice(1).map((p,i)=>[p[0]-pts[i][0],p[1]-pts[i][1]]),pts[0][0],pts[0][1],[1,1],"F",true);
fill(NV);d.circle(sx,sy,11.2,"F");draw(IV);d.setLineWidth(.3);d.circle(sx,sy,9.6);
ink(GD);d.setFont("helvetica","bold");d.setFontSize(5.2);d.text("COMPT'AIDE",sx,sy-4.2,{align:"center",charSpace:.5});
draw(GD);d.setLineWidth(1.1);d.line(sx-3.4,sy+.6,sx-1,sy+3);d.line(sx-1,sy+3,sx+3.8,sy-2.4);
ink(GD);d.setFontSize(4.6);d.text(att?"ATTESTÉ":"CERTIFIÉ",sx,sy+7.4,{align:"center",charSpace:.5});
// date, numéro, signature
ink(NV);d.setFont("times","bold");d.setFontSize(11);d.text("Délivré le "+dt,24,att?163:160);
ink(GR);d.setFont("helvetica","normal");d.setFontSize(8.5);d.text("N° "+c.num,24,att?169:166);
draw(NV);d.setLineWidth(.3);d.line(24,att?184:183,86,att?184:183);
ink(GR);d.setFont("times","italic");d.setFontSize(10);d.text("La direction de Compt'Aide",24,att?189:188);
// QR code
const q=window.qrcode(0,"M");q.addData(url);q.make();const n=q.getModuleCount(),qs=27,x0=W-24-qs,y0=att?152:150,u=qs/n;
fill([255,255,255]);draw(GD);d.setLineWidth(.4);d.rect(x0-2.5,y0-2.5,qs+5,qs+5,"FD");fill([0,0,0]);
for(let r=0;r<n;r++)for(let k=0;k<n;k++)if(q.isDark(r,k))d.rect(x0+k*u,y0+r*u,u+.02,u+.02,"F");
ink(GR);d.setFont("helvetica","normal");d.setFontSize(6.8);d.text("VÉRIFIER CE DOCUMENT",x0+qs/2,y0+qs+6.8,{align:"center",charSpace:.3});
// pied de page
ink(GR);d.setFont("helvetica","normal");d.setFontSize(7);
d.text(cl("Document délivré par Compt'Aide · Authenticité : scannez le QR code ou saisissez le numéro sur "+origin+"/verifier.html"),CX,H-17,{align:"center"});
d.save(c.num+".pdf")}
