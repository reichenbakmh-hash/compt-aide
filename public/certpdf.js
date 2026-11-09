/* Génération des PDF (jsPDF + QR code, chargés à la demande depuis cdnjs). */
const PdfLoad=u=>new Promise((ok,ko)=>{const s=document.createElement("script");s.src=u;s.onload=ok;s.onerror=()=>ko(new Error("chargement"));document.head.appendChild(s)});
async function certPdf(c,origin){
if(!window.jspdf)await PdfLoad("https://cdnjs.cloudflare.com/ajax/libs/jspdf/2.5.1/jspdf.umd.min.js");
if(!window.qrcode)await PdfLoad("https://cdnjs.cloudflare.com/ajax/libs/qrcode-generator/1.4.4/qrcode.min.js");
const {jsPDF}=window.jspdf,d=new jsPDF({orientation:"landscape",unit:"mm",format:"a4"}),W=297,H=210,N=[12,40,95],BL=[18,52,90],cl=t=>String(t).replace(/’/g,"'"),att=c.type==="ATT";
const url=origin+"/verifier.html?n="+c.num;
d.setFillColor(...BL);d.rect(0,0,W,22,"F");d.setTextColor(255,255,255);d.setFont("helvetica","bold");d.setFontSize(15);d.text("COMPT'AIDE",W/2,14,{align:"center",charSpace:3});
d.setDrawColor(...BL);d.setLineWidth(.6);d.rect(8,28,W-16,H-36);d.setLineWidth(.2);d.rect(10.5,30.5,W-21,H-41);
d.setTextColor(...N);
d.setFont("times","normal");d.setFontSize(30);d.text(att?"Attestation de parcours":"Certificat de réussite",W/2,52,{align:"center"});
d.setDrawColor(200,162,74);d.setLineWidth(.6);d.line(W/2-30,57,W/2+30,57);
d.setTextColor(60,60,60);d.setFontSize(12);d.text(att?"Compt'Aide atteste que":"Compt'Aide certifie que",W/2,72,{align:"center"});
d.setTextColor(...N);d.setFont("times","italic");d.setFontSize(28);d.text(cl(c.titulaire),W/2,88,{align:"center"});
d.setTextColor(60,60,60);d.setFont("times","normal");d.setFontSize(12.5);
const t=att?"a suivi et validé l'ensemble des étapes obligatoires du parcours pédagogique « Collaborateur comptable » (6 niveaux, "+(c.data.etapes||24)+" étapes). Cette attestation témoigne du suivi du parcours ; elle n'évalue pas les acquis."
:"a réussi l'évaluation finale de Compt'Aide, composée d'un QCM et de cas pratiques d'écritures comptables, avec les résultats suivants.";
d.text(d.splitTextToSize(cl(t),200),W/2,101,{align:"center"});
if(!att){d.setFontSize(12);const y=127,L=[["QCM",c.data.qcm,"seuil 70"],["Cas pratiques",c.data.cas,"seuil 70"],["Note finale (40 % QCM, 60 % cas)",c.data.final,"seuil 75"]];
L.forEach((x,i)=>{const cx=W/2+(i-1)*72;d.setFont("times","bold");d.setFontSize(20);d.setTextColor(...N);d.text(x[1]+" / 100",cx,y,{align:"center"});d.setFont("times","normal");d.setFontSize(9.5);d.setTextColor(90,90,90);d.text(cl(x[0]),cx,y+6,{align:"center"});d.text(x[2],cx,y+11,{align:"center"})})}
d.setTextColor(60,60,60);d.setFontSize(10.5);d.setFont("times","normal");
d.text("Délivré le "+new Date(c.issued).toLocaleDateString("fr-FR"),22,163);d.text("Numéro : "+c.num,22,170);
const sx=W/2,sy=166;d.setDrawColor(200,162,74);d.setLineWidth(.8);d.circle(sx,sy,14);d.setLineWidth(.3);d.circle(sx,sy,11.5);d.setFont("helvetica","bold");d.setFontSize(6.5);d.setTextColor(150,115,30);d.text(att?"ATTESTÉ":"CERTIFIÉ",sx,sy-1,{align:"center"});d.text("COMPT'AIDE",sx,sy+3.5,{align:"center"});d.setTextColor(60,60,60);d.setFont("times","normal");d.setFontSize(10.5);
const q=window.qrcode(0,"M");q.addData(url);q.make();const n=q.getModuleCount(),s=30/n,x0=W-22-30,y0=150;d.setFillColor(0,0,0);
for(let r=0;r<n;r++)for(let k=0;k<n;k++)if(q.isDark(r,k))d.rect(x0+k*s,y0+r*s,s+.02,s+.02,"F");
d.setFontSize(8);d.text("Vérifier ce document",x0+15,y0+34,{align:"center"});
d.setFontSize(8.5);d.setTextColor(90,90,90);
d.text(d.splitTextToSize(cl("Document délivré par Compt'Aide. Authenticité : scannez le QR code ou saisissez le numéro sur "+origin+"/verifier.html"),190),22,186);
d.save(c.num+".pdf")}
