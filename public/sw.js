const V="ca-v5",SHELL=V+"-shell",EXT=V+"-ext";
const LOCAL=["/","/certif.js","/dashboard.js","/xl-engine.js","/excel.js","/certpdf.js","/verifier.html","/manifest.webmanifest","/icon.svg","/icon-192.png","/icon-512.png","/icon-maskable.png","/signature.png"].concat(Array.from({length:12},(_,i)=>i+1).map(n=>"/exercices-excel/"+["Exercise_01_Basic_Arithmetic","Exercise_02_Absolute_Cell_Ref","Exercise_03_Sheet_Linking","Exercise_04_Sorting_and_Filtering","Exercise_05_Text_Cleaning","Exercise_06_Grading_System","Exercise_07_Charts_and_Graphs","Exercise_08_Stat_Functions","Exercise_09_Deduplication","Exercise_10_Data_Validation","Exercise_11_Text_Joins_and_Splits","Exercise_12_Lookup_Directory"][n-1]+".xlsx"));
const CDN=["https://cdnjs.cloudflare.com/ajax/libs/react/18.3.1/umd/react.production.min.js","https://cdnjs.cloudflare.com/ajax/libs/react-dom/18.3.1/umd/react-dom.production.min.js","https://cdnjs.cloudflare.com/ajax/libs/jspdf/2.5.1/jspdf.umd.min.js","https://cdnjs.cloudflare.com/ajax/libs/qrcode-generator/1.4.4/qrcode.min.js","https://cdnjs.cloudflare.com/ajax/libs/Chart.js/4.4.1/chart.umd.min.js"];
const FONT="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&display=swap";
const HOSTS=["cdnjs.cloudflare.com","fonts.googleapis.com","fonts.gstatic.com"];

async function precacheFonts(c){
const r=await fetch(FONT,{mode:"cors"});if(!r.ok)return;
const css=await r.clone().text();await c.put(FONT,r);
const urls=Array.from(new Set(css.match(/https:\/\/fonts\.gstatic\.com\/[^)'"\s]+/g)||[]));
await Promise.allSettled(urls.map(u=>fetch(u,{mode:"cors"}).then(x=>x.ok&&c.put(u,x))))}

self.addEventListener("install",e=>{e.waitUntil((async()=>{
const s=await caches.open(SHELL),x=await caches.open(EXT);
await Promise.allSettled(LOCAL.map(u=>s.add(new Request(u,{cache:"reload"}))));
await Promise.allSettled(CDN.map(u=>fetch(new Request(u,{mode:"no-cors"})).then(r=>x.put(u,r))));
await precacheFonts(x).catch(()=>{});
self.skipWaiting()})())});

self.addEventListener("activate",e=>{e.waitUntil(caches.keys().then(k=>Promise.all(k.filter(n=>n!==SHELL&&n!==EXT).map(n=>caches.delete(n)))).then(()=>self.clients.claim()))});

const timed=(p,ms)=>new Promise((ok,ko)=>{const t=setTimeout(()=>ko(new Error("timeout")),ms);p.then(v=>{clearTimeout(t);ok(v)},v=>{clearTimeout(t);ko(v)})});

async function local(r){
const c=await caches.open(SHELL),u=new URL(r.url);
try{const x=await timed(fetch(r),5000);if(x.ok)c.put(r,x.clone());return x}
catch(err){
const hit=await c.match(r,{ignoreSearch:true});
if(hit)return hit;
if(r.mode==="navigate"&&(/\.html?$/.test(u.pathname)||!/\.[a-z0-9]+$/i.test(u.pathname))){const home=await c.match("/");if(home)return home}
return Response.error()}}

async function external(r){
const c=await caches.open(EXT),hit=await c.match(r.url);
if(hit)return hit;
const x=await fetch(r);
if(x.ok||x.type==="opaque")c.put(r.url,x.clone());
return x}

self.addEventListener("fetch",e=>{
const r=e.request,u=new URL(r.url);
if(r.method!=="GET")return;
if(u.origin===location.origin){if(u.pathname.startsWith("/api/"))return;e.respondWith(local(r));return}
if(HOSTS.includes(u.hostname))e.respondWith(external(r))});
