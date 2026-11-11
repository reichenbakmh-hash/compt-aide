/* Génération des PDF (jsPDF + QR code, chargés à la demande depuis cdnjs). Format A4 portrait. */
const PdfLoad=u=>new Promise((ok,ko)=>{const s=document.createElement("script");s.src=u;s.onload=ok;s.onerror=()=>ko(new Error("chargement"));document.head.appendChild(s)});
const PdfImg=async u=>{try{const r=await fetch(u);if(!r.ok)return null;const b=await r.blob();return await new Promise(ok=>{const f=new FileReader();f.onload=()=>ok(f.result);f.onerror=()=>ok(null);f.readAsDataURL(b)})}catch(e){return null}};
async function certPdf(c,origin){
if(!window.jspdf)await PdfLoad("https://cdnjs.cloudflare.com/ajax/libs/jspdf/2.5.1/jspdf.umd.min.js");
if(!window.qrcode)await PdfLoad("https://cdnjs.cloudflare.com/ajax/libs/qrcode-generator/1.4.4/qrcode.min.js");
const sig=await PdfImg("/signature.png");
const {jsPDF}=window.jspdf,d=new jsPDF({orientation:"portrait",unit:"mm",format:"a4"}),W=210,H=297,CX=W/2,L=24,R=W-24;
const NV=[18,52,90],TL=[32,184,154],TD=[15,127,106],GR=[88,98,112],LG=[205,213,222],att=c.type==="ATT",cl=t=>String(t).replace(/’/g,"'");
const code=(c.data&&c.data.code)||"",url=origin+"/verifier.html?n="+encodeURIComponent(c.num)+(code?"&c="+encodeURIComponent(code):"");
const dt=new Date(c.issued).toLocaleDateString("fr-FR",{day:"numeric",month:"long",year:"numeric"});
const fill=a=>d.setFillColor(a[0],a[1],a[2]),draw=a=>d.setDrawColor(a[0],a[1],a[2]),ink=a=>d.setTextColor(a[0],a[1],a[2]);
const poly=(p,style)=>d.lines(p.slice(1).map((q,i)=>[q[0]-p[i][0],q[1]-p[i][1]]),p[0][0],p[0][1],[1,1],style,false);
const mark=(x,y,s)=>{const k=s/40;fill(NV);draw([43,79,124]);d.setLineWidth(.25*k*4);d.roundedRect(x,y,s,s,10*k,10*k,"FD");
draw([255,255,255]);d.setLineWidth(2*k);d.roundedRect(x+9*k,y+7*k,18*k,24*k,3*k,3*k);d.line(x+13*k,y+14*k,x+23*k,y+14*k);d.line(x+13*k,y+19*k,x+19*k,y+19*k);
fill(TL);draw(NV);d.setLineWidth(2*k);d.circle(x+27*k,y+29*k,8*k,"FD");draw([255,255,255]);d.setLineWidth(2.2*k);d.line(x+23.5*k,y+29*k,x+26.1*k,y+31.6*k);d.line(x+26.1*k,y+31.6*k,x+30.7*k,y+26.4*k)};
// cadre : filets et rosace de sécurité (deux ondes entrelacées)
draw(NV);d.setLineWidth(.5);d.rect(8,8,W-16,H-16);d.setLineWidth(.2);d.rect(9.4,9.4,W-18.8,H-18.8);
draw(LG);d.setLineWidth(.13);
const wave=(horiz,c0,a,b,ph,amp,lam)=>{const pts=[];for(let t=a;t<=b;t+=.8)pts.push(horiz?[t,c0+amp*Math.sin(2*Math.PI*(t-a)/lam+ph)]:[c0+amp*Math.sin(2*Math.PI*(t-a)/lam+ph),t]);poly(pts,"S")};
[0,Math.PI].forEach(ph=>{wave(true,13.2,17,W-17,ph,1.9,12);wave(true,H-13.2,17,W-17,ph,1.9,12);wave(false,13.2,17,H-17,ph,1.9,12);wave(false,W-13.2,17,H-17,ph,1.9,12)});
fill([255,255,255]);draw(NV);d.setLineWidth(.2);[[9.4,9.4],[W-17,9.4],[9.4,H-17],[W-17,H-17]].forEach(p=>{d.rect(p[0],p[1],7.6,7.6,"FD");d.rect(p[0]+1.6,p[1]+1.6,4.4,4.4)});
draw(NV);d.setLineWidth(.2);d.rect(17,17,W-34,H-34);
ink([150,160,172]);d.setFont("helvetica","normal");d.setFontSize(3.6);const mt="COMPT'AIDE  ·  DOCUMENT NUMÉROTÉ  ·  ";let ms="";while(d.getTextWidth(ms)<W-56)ms+=mt;d.text(ms,CX,15.6,{align:"center",charSpace:.3});
// en-tête : papier à en-tête et références
mark(L,24,15);d.setFont("helvetica","bold");d.setFontSize(23);const w1=d.getTextWidth("Compt'");ink(NV);d.text("Compt'",L+19,35);ink(TL);d.text("Aide",L+19+w1,35);
ink(GR);d.setFont("helvetica","normal");d.setFontSize(6.6);d.text("FORMATION COMPTABLE ET FINANCIÈRE",L+19,40,{charSpace:1.1});
ink(NV);d.setFont("helvetica","bold");d.setFontSize(9.5);d.text("N° "+c.num,R,30,{align:"right"});
ink(GR);d.setFont("helvetica","normal");d.setFontSize(8.5);d.text("Délivré le "+dt,R,35,{align:"right"});
draw(NV);d.setLineWidth(.35);d.line(L,47,R,47);d.setLineWidth(.12);d.line(L,48.2,R,48.2);
// titre
ink(NV);d.setFont("times","bold");const ti=att?"ATTESTATION DE PARCOURS":"CERTIFICAT DE RÉUSSITE";let tf=26;d.setFontSize(tf);while(d.getTextWidth(ti)+ti.length*2>152&&tf>16){tf-=.5;d.setFontSize(tf)}
d.text(ti,CX,76,{align:"center",charSpace:2});
draw(TL);d.setLineWidth(.6);d.line(CX-22,82,CX+22,82);d.setLineWidth(.15);d.line(CX-22,83.4,CX+22,83.4);
// bénéficiaire
ink(GR);d.setFont("times","italic");d.setFontSize(13);d.text(att?"Compt'Aide atteste que":"Compt'Aide certifie que",CX,100,{align:"center"});
const nm=cl(c.titulaire);d.setFont("times","bolditalic");let fs=31;d.setFontSize(fs);const nw0=d.getTextWidth(nm);if(nw0>150){fs=Math.max(17,31*150/nw0);d.setFontSize(fs)}
ink(NV);d.text(nm,CX,117,{align:"center"});draw(NV);d.setLineWidth(.3);d.line(L+8,122,R-8,122);
ink([60,70,84]);d.setFont("times","normal");d.setFontSize(12.5);
const tx=att?"a suivi l'ensemble des étapes obligatoires de la formation à la comptabilité française de Compt'Aide : six niveaux et "+(c.data.etapes||24)+" étapes.":"a satisfait aux exigences de l'évaluation finale de la formation à la comptabilité française de Compt'Aide, composée d'un QCM et de cas pratiques d'écritures comptables.";
d.text(d.splitTextToSize(cl(tx),136),CX,134,{align:"center",lineHeightFactor:1.4});
// tableau de références
const rows=[["FORMATION","Comptabilité française"],[att?"ÉTAPES VALIDÉES":"ÉPREUVES",att?(c.data.etapes||24)+" sur "+(c.data.etapes||24):"QCM et cas pratiques"],["RÉSULTAT",att?"Formation validée":"Évaluation validée"]];
draw(LG);d.setLineWidth(.25);let ry=156;d.line(46,ry,164,ry);
rows.forEach(r=>{ink(GR);d.setFont("helvetica","normal");d.setFontSize(7.6);d.text(r[0],50,ry+6.4,{charSpace:.8});ink(NV);d.setFont("times","bold");d.setFontSize(12);d.text(r[1],104,ry+6.6);ry+=9;d.line(46,ry,164,ry)});
// sceau (discret) et signature
const sx=62,sy=220,pts=[];for(let i=0;i<72;i++){const r=i%2?16.3:17.1,a=i*Math.PI/36;pts.push([sx+r*Math.cos(a),sy+r*Math.sin(a)])}
fill([238,242,247]);draw(NV);d.setLineWidth(.5);poly(pts.concat([pts[0]]),"FD");d.setLineWidth(.25);d.circle(sx,sy,14.6);d.setLineWidth(.2);d.circle(sx,sy,9.4);
const arc=(txt,r,mid,top,fs2)=>{d.setFont("helvetica","bold");d.setFontSize(fs2);const ws=[...txt].map(ch=>d.getTextWidth(ch)),gap=.4,tot=ws.reduce((t,x)=>t+x,0)+gap*(txt.length-1);let pos=-tot/2;
[...txt].forEach((ch,i)=>{const sc=pos+ws[i]/2,a=(top?1:-1)*sc/r*180/Math.PI+mid,rad=a*Math.PI/180,ang=top?-a:180-a,ar=ang*Math.PI/180;let x=sx+r*Math.sin(rad),y=sy-r*Math.cos(rad);x-=ws[i]/2*Math.cos(ar);y+=ws[i]/2*Math.sin(ar);d.text(ch,x,y,{angle:ang});pos+=ws[i]+gap})};
ink(NV);arc(att?"ATTESTÉ":"CERTIFIÉ",10.7,0,true,6);arc("COMPT'AIDE",13,180,false,6);
fill(NV);d.circle(sx-12.1,sy,.5,"F");d.circle(sx+12.1,sy,.5,"F");mark(sx-4.6,sy-4.6,9.2);
ink(GR);d.setFont("times","italic");d.setFontSize(10);d.text("Fait à Antananarivo, le "+dt,118,201);
if(sig){try{d.addImage(sig,"PNG",126,203,46,13.7)}catch(e){}}
draw(NV);d.setLineWidth(.35);d.line(118,220,R,220);
ink(NV);d.setFont("times","bold");d.setFontSize(10.5);d.text("Daniel Gracy Razafinjaka Rabary",118,225);
ink(GR);d.setFont("helvetica","normal");d.setFontSize(8.3);d.text("Responsable de formation",118,229.6);
// vérification en ligne
draw(NV);d.setLineWidth(.35);d.line(L,252,R,252);
const q=window.qrcode(0,"M");q.addData(url);q.make();const n=q.getModuleCount(),qs=20,qx=L,qy=257,u=qs/n;
fill([255,255,255]);d.rect(qx-1,qy-1,qs+2,qs+2,"F");fill([0,0,0]);for(let r=0;r<n;r++)for(let k=0;k<n;k++)if(q.isDark(r,k))d.rect(qx+k*u,qy+r*u,u+.02,u+.02,"F");
const tx0=qx+qs+7;ink(NV);d.setFont("helvetica","bold");d.setFontSize(8);d.text("VÉRIFICATION EN LIGNE",tx0,260,{charSpace:.8});
ink(GR);d.setFont("helvetica","normal");d.setFontSize(8.3);d.text(origin.replace(/^https?:\/\//,"")+"/verifier.html",tx0,265);
if(code){ink(NV);d.setFont("helvetica","bold");d.setFontSize(8.3);d.text("N° "+c.num+"   ·   Code : "+code,tx0,270)}
ink(GR);d.setFont("times","italic");d.setFontSize(8.2);d.text(d.splitTextToSize("Le QR code seul ne garantit pas l'authenticité : vérifiez que le nom, la formation et la date affichés en ligne correspondent à ce document.",R-tx0),tx0,275,{lineHeightFactor:1.3});
d.save(c.num+".pdf")}
