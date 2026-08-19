// Calage à la main : site traceur SANS DXF (pas géoréférencé) → 👁 « Caler sur la carte » → repère 1 sur le plan, repère 1 sur la carte,
// repère 2 plan, repère 2 carte → affine enregistrée (net.geo), carte active, point GPS au bon endroit ; puis « Oublier le calage »
import { chromium } from 'playwright';
const BASE=process.env.BASE||'http://localhost:8765';
const browser=await chromium.launch({headless:true, executablePath: process.env.CHROMIUM_PATH||undefined});
// repères : plan (10,50) ↔ A (−1.6922, 47.845) ; plan (70,50) ↔ B = A + 60 m à l'est
const A={lon:-1.6922,lat:47.845};const B={lon:-1.6922+60/(111320*Math.cos(47.845*Math.PI/180)),lat:47.845};
const ctx=await browser.newContext({viewport:{width:560,height:940},geolocation:{latitude:A.lat,longitude:A.lon,accuracy:6},permissions:['geolocation']});const page=await ctx.newPage();
const logs=[];page.on('pageerror',e=>logs.push('PAGEERROR: '+e.message.slice(0,300)));page.on('console',m=>{if(m.type()==='error'&&!/supabase|Failed to fetch|net::ERR|404|geopf|data.gouv/i.test(m.text()))logs.push(m.text().slice(0,200));});
page.on('dialog',d=>{console.log('dialog:',d.message().split('\n')[0].slice(0,120));d.accept();});
await page.goto(BASE+'/traceur.html');await page.waitForTimeout(500);await page.evaluate(()=>{localStorage.clear();});await page.reload();await page.waitForTimeout(500);
await page.evaluate(()=>{const S=window.MAQ.state;S.lines=[{id:'L1',name:'Feeder',dn:100,bar:12,pts:[[10,50],[70,50]],specials:[],parent:null}];S.seq=2;S.bg=null;window.MAQ.setMode('select');window.MAQ.rebuild();});
await page.click('#bSave');await page.waitForTimeout(200);await page.fill('#svName','Chantier sans DXF');await page.click('#svOk');await page.waitForTimeout(800);await page.click('#svGo');await page.waitForTimeout(1800);
await page.selectOption('#roleSel','ethan');await page.waitForTimeout(300); // chef
// 1) pas géoréférencé → bouton de calage
await page.click('.zoomctl [data-z="eye"]');await page.waitForTimeout(300);
let out=await page.evaluate(()=>({geo:window.TRACE.siteGeo(),hint:document.querySelector('#disp .maphint')?.textContent,btn:!!document.querySelector('#disp [data-cal="1"]')}));console.log('avant calage (geo null, bouton true):',JSON.stringify(out));
// 2) démarrer → repère 1 sur le plan : tap à la position écran de (10,50)
await page.click('#disp [data-cal="1"]');await page.waitForTimeout(300);
const tapWorld=async(wx,wy)=>{const p=await page.evaluate(([x,y])=>{const v=window.TRACE.state.view;const r=document.querySelector('#canvas').getBoundingClientRect();return [r.left+x*v.k+v.tx,r.top+y*v.k+v.ty];},[wx,wy]);await page.mouse.click(p[0],p[1]);};
out=await page.evaluate(()=>({bar:getComputedStyle(document.querySelector('#calageBar')).display,msg:document.querySelector('#cgMsg').textContent.slice(0,40),mode:window.TRACE.state.calage.mode}));console.log('barre:',JSON.stringify(out));
await tapWorld(10,50);await page.waitForTimeout(1500); // (le géocodage échoue hors ligne → centre France)
out=await page.evaluate(()=>({mode:window.TRACE.state.calage.mode,cur:window.TRACE.state.calage.cur.plan,tiles:document.querySelectorAll('#map image').length,net:getComputedStyle(document.querySelector('#net')).display,mapRow:getComputedStyle(document.querySelector('#cgMapRow')).display}));
console.log('mode carte (tiles>0, net none):',JSON.stringify(out));
// 3) sur la carte : on place la vue sur A (on simule la recherche d'adresse par coordonnées tapées) puis tap au centre → repère A
await page.fill('#cgAddr',`${A.lat}, ${A.lon}`);await page.click('#cgGo');await page.waitForTimeout(600);
out=await page.evaluate(()=>document.querySelector('#cgMsg').textContent.slice(0,60));console.log('après recherche:',out);
const tapLL=async(lon,lat)=>{const p=await page.evaluate(([lo,la])=>{const T=window.TRACE;const C=T.state.calage;const q=T.geo.lonLatToPlan(C.mapGeo,lo,la);const v=T.state.view;const r=document.querySelector('#canvas').getBoundingClientRect();return [r.left+q[0]*v.k+v.tx,r.top+q[1]*v.k+v.ty,q[0],q[1]];},[lon,lat]);await page.mouse.click(p[0],p[1]);};
await tapLL(A.lon,A.lat);await page.waitForTimeout(500);
out=await page.evaluate(()=>({mode:window.TRACE.state.calage.mode,pairs:window.TRACE.state.calage.pairs.length,oneRow:getComputedStyle(document.querySelector('#cgOneRow')).display,pins:document.querySelectorAll('#gps circle').length}));console.log('après repère 1 (mode plan, pairs 1, 1 repère possible):',JSON.stringify(out));
// 4) repère 2 : plan (70,50) puis carte B
await tapWorld(70,50);await page.waitForTimeout(800);
await page.evaluate(()=>{const T=window.TRACE;const C=T.state.calage;const cw=document.querySelector('#canvas').clientWidth,ch=document.querySelector('#canvas').clientHeight;const k=2;T.state.view={k,tx:cw/2,ty:ch/2};});
await page.evaluate(([lo,la])=>{const T=window.TRACE;const C=T.state.calage;const q=T.geo.lonLatToPlan(C.mapGeo,lo,la);const cw=document.querySelector('#canvas').clientWidth,ch=document.querySelector('#canvas').clientHeight;const k=2;T.state.view={k,tx:cw/2-q[0]*k,ty:ch/2-q[1]*k};T.renderPlan();},[B.lon,B.lat]);await page.waitForTimeout(300);
await tapLL(B.lon,B.lat);await page.waitForTimeout(1200);
out=await page.evaluate(()=>{const g=window.TRACE.siteGeo();const n=window.TRACE.net;return {calage:!!window.TRACE.state.calage,geo:g?{crs:g.crs,auto:g.auto,label:g.label}:null,saved:n.geo?{s:n.geo.s,rot:n.geo.rot,pts:n.geo.pts.length}:null,carte:window.TRACE.state.show.carte};});
console.log('après calage (crs 2154, s≈1, rot≈-3, carte ortho):',JSON.stringify(out));
// 5) le plan retrouve exactement les repères : plan(10,50) → A, plan(70,50) → B
out=await page.evaluate(([a,b])=>{const T=window.TRACE;const g=T.siteGeo();const pa=T.geo.planToLonLat(g,[10,50]),pb=T.geo.planToLonLat(g,[70,50]);return {dA:Math.hypot((pa[0]-a[0])*74600,(pa[1]-a[1])*111320).toFixed(3),dB:Math.hypot((pb[0]-b[0])*74600,(pb[1]-b[1])*111320).toFixed(3)};},[[A.lon,A.lat],[B.lon,B.lat]]);
console.log('écart repères (m, attendu ~0):',JSON.stringify(out));
// 6) GPS (simulé sur A) → point à plan (10,50)
await page.click('.zoomctl [data-z="gps"]');await page.waitForTimeout(1200);
out=await page.evaluate(()=>{const c=document.querySelectorAll('#gps circle');const d=c[2];return {x:d?+(+d.getAttribute('cx')).toFixed(1):null,y:d?+(+d.getAttribute('cy')).toFixed(1):null};});console.log('point GPS (≈10,50):',JSON.stringify(out));
await page.click('.zoomctl [data-z="gps"]');await page.waitForTimeout(200);
// 7) le panneau propose « Recaler » + « Oublier » ; oublier → plus de géoréf
await page.click('.zoomctl [data-z="eye"]');await page.waitForTimeout(300);
out=await page.evaluate(()=>({recal:!!document.querySelector('#disp [data-cal="1"]'),del:!!document.querySelector('#disp [data-cal="del"]')}));console.log('boutons recaler/oublier:',JSON.stringify(out));
await page.click('#disp [data-cal="del"]');await page.waitForTimeout(500);
out=await page.evaluate(()=>({geo:window.TRACE.siteGeo(),netGeo:window.TRACE.net.geo===undefined,tiles:document.querySelectorAll('#map image').length}));console.log('après oubli (geo null, tiles 0):',JSON.stringify(out));
// 8) annulation propre : démarrer puis ✕ en mode carte → vue plan restaurée, réseau réaffiché
await page.click('#disp [data-cal="1"]');await page.waitForTimeout(200);await tapWorld(10,50);await page.waitForTimeout(800);await page.click('#cgCancel');await page.waitForTimeout(300);
out=await page.evaluate(()=>({calage:window.TRACE.state.calage,net:getComputedStyle(document.querySelector('#net')).display,bar:getComputedStyle(document.querySelector('#calageBar')).display}));console.log('annulation (calage null, net visible, barre none):',JSON.stringify(out));
await page.screenshot({path:new URL('./e2e_calage.png',import.meta.url).pathname});
console.log(logs);await browser.close();
