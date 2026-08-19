// Géoréférencement : site traceur avec origine DXF en Lambert CC48 (Bain) → carte IGN détectée (tuiles + matrice),
// point GPS (géolocalisation simulée), position enregistrée sur une déclaration, écart signalé si loin de la soudure
import { chromium } from 'playwright';
const BASE=process.env.BASE||'http://localhost:8765';
const browser=await chromium.launch({headless:true, executablePath: process.env.CHROMIUM_PATH||undefined});
// Bain-de-Bretagne : origine x0=1349000, y1=7193500 (CC48) ; le réseau est tracé entre x 10..70, y 50 ; plan (40,50) = lon −1,692210 / lat 47,844996
const ctx=await browser.newContext({viewport:{width:560,height:940},geolocation:{latitude:47.844996,longitude:-1.692210,accuracy:8},permissions:['geolocation']});const page=await ctx.newPage();
const logs=[];page.on('pageerror',e=>logs.push('PAGEERROR: '+e.message.slice(0,300)));page.on('console',m=>{if(m.type()==='error'&&!/supabase|Failed to fetch|net::ERR|404|geopf/i.test(m.text()))logs.push(m.text().slice(0,200));});
await page.goto(BASE+'/traceur.html');await page.waitForTimeout(500);await page.evaluate(()=>{localStorage.clear();});await page.reload();await page.waitForTimeout(500);
await page.evaluate(()=>{const S=window.MAQ.state;S.lines=[{id:'L1',name:'Feeder',dn:100,bar:12,pts:[[10,50],[70,50]],specials:[],parent:null}];S.seq=2;S.bg={drawing:[{layer:'0',pts:[[0,0],[80,0]],c:'#888'}],bbox:[0,0,80,100],name:'bain_test.dxf',origin:{x0:1349000,y1:7193500},netLayers:[],opacity:.5,show:true};window.MAQ.setMode('select');window.MAQ.rebuild();});
await page.click('#bSave');await page.waitForTimeout(200);await page.fill('#svName','Géo test');await page.click('#svOk');await page.waitForTimeout(800);await page.click('#svGo');await page.waitForTimeout(1800);
// 1) panneau 👁 : section carte visible avec le système détecté
await page.click('.zoomctl [data-z="eye"]');await page.waitForTimeout(300);
let out=await page.evaluate(()=>({hint:document.querySelector('#disp .maphint')?.textContent||'',btn:!!document.querySelector('#disp [data-carte="ortho"]')}));console.log('panneau carte:',JSON.stringify(out));
// 2) photo aérienne → tuiles IGN dans #map, matrice appliquée, papier du fond masqué
await page.click('#disp [data-carte="ortho"]');await page.waitForTimeout(400);
out=await page.evaluate(()=>{const imgs=[...document.querySelectorAll('#map image')];const g=document.querySelector('#map g');return {n:imgs.length,z:(imgs[0]?.getAttribute('href')||'').match(/TILEMATRIX=(\d+)/)?.[1],layer:(imgs[0]?.getAttribute('href')||'').match(/LAYER=([^&]+)/)?.[1],matrix:g?.getAttribute('transform')?.slice(0,40),nopaper:document.querySelector('#bg').classList.contains('nopaper'),credit:getComputedStyle(document.querySelector('#mapcredit')).display};});
console.log('tuiles ortho:',JSON.stringify(out));
// la tuile du centre doit correspondre à Bain-de-Bretagne : à z, la colonne attendue = floor((lon+180)/360·2^z)
out=await page.evaluate(()=>{const imgs=[...document.querySelectorAll('#map image')];const h=imgs[0].getAttribute('href');const z=+h.match(/TILEMATRIX=(\d+)/)[1];const cols=imgs.map(i=>+i.getAttribute('href').match(/TILECOL=(\d+)/)[1]),rows=imgs.map(i=>+i.getAttribute('href').match(/TILEROW=(\d+)/)[1]);const lon=-1.692210,lat=47.844996;const n=2**z;const ex=Math.floor((lon+180)/360*n);const la=lat*Math.PI/180;const ey=Math.floor((1-Math.log(Math.tan(la)+1/Math.cos(la))/Math.PI)/2*n);return {z,colOK:Math.min(...cols)<=ex&&ex<=Math.max(...cols),rowOK:Math.min(...rows)<=ey&&ey<=Math.max(...rows),ex,ey,cols:[Math.min(...cols),Math.max(...cols)],rows:[Math.min(...rows),Math.max(...rows)]};});
console.log('tuiles couvrent Bain (colOK/rowOK true):',JSON.stringify(out));
// 3) cadastre en plus, puis plan IGN
await page.click('#disp [data-k="cadastre"]');await page.waitForTimeout(300);
out=await page.evaluate(()=>[...document.querySelectorAll('#map g')].map(g=>g.dataset.layer));console.log('couches (ortho+cadastre):',JSON.stringify(out));
await page.click('#disp [data-carte="plan"]');await page.waitForTimeout(300);
out=await page.evaluate(()=>({layers:[...document.querySelectorAll('#map g')].map(g=>g.dataset.layer),href:(document.querySelector('#map image')?.getAttribute('href')||'').includes('PLANIGNV2')}));console.log('plan IGN:',JSON.stringify(out));
// zoom → nouveau niveau de tuiles
await page.click('.zoomctl [data-z="+"]');await page.click('.zoomctl [data-z="+"]');await page.waitForTimeout(400);
out=await page.evaluate(()=>(document.querySelector('#map image')?.getAttribute('href')||'').match(/TILEMATRIX=(\d+)/)?.[1]);console.log('z après zoom ×2.56 (plafond 19) :',out);
await page.click('#disp [data-carte="none"]');await page.click('#disp [data-k="cadastre"]');await page.waitForTimeout(300);
out=await page.evaluate(()=>({n:document.querySelectorAll('#map image').length,nopaper:document.querySelector('#bg').classList.contains('nopaper')}));console.log('carte coupée (n 0, nopaper false):',JSON.stringify(out));
await page.click('.zoomctl [data-z="eye"]');await page.waitForTimeout(200);
// 4) GPS : point bleu placé au bon endroit du plan (lat/lon simulés ≈ plan (≈40, ≈50)), bouton allumé
await page.click('.zoomctl [data-z="gps"]');await page.waitForTimeout(1200);
out=await page.evaluate(()=>{const c=document.querySelectorAll('#gps circle');const d=c[2];const T=window.TRACE;return {n:c.length,x:d?+(+d.getAttribute('cx')).toFixed(1):null,y:d?+(+d.getAttribute('cy')).toFixed(1):null,on:document.querySelector('.zoomctl [data-z="gps"]').classList.contains('gpsOn'),fix:!!T.state.gps.fix};});
console.log('point GPS (x≈40±3, y≈50±3, on true):',JSON.stringify(out));
// 5) déclaration géolocalisée : soudure 1 (PK ~12 m → plan x≈22) déclarée soudée depuis la position simulée (≈ 18 m) → « sur place »
await page.selectOption('#roleSel','karim');await page.waitForTimeout(200);
await page.evaluate(()=>{window.TRACE.openJoint('L1','A',1);});await page.waitForTimeout(300);await page.click('#sheet [data-act="form-soudee"]');await page.waitForTimeout(300);
await page.evaluate(()=>{window.TRACE.state.pendingPhotos.push('data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNkYAAAAAYAAjCB0C8AAAAASUVORK5CYII=');});
await page.click('#sheet [data-act="save-soudee"]');await page.waitForTimeout(700);
await page.evaluate(()=>{window.TRACE.openJoint('L1','A',1);});await page.waitForTimeout(300);
out=await page.evaluate(()=>{const j=window.TRACE.state.lines.L1.cond.A.joints[1];const ev=j.events[j.events.length-1];return {pos:ev.pos?{lat:ev.pos.lat,lon:ev.pos.lon,acc:ev.pos.acc}:null,who:document.querySelector('#sheet .hist .who')?.textContent};});
console.log('déclaration géolocalisée:',JSON.stringify(out));
// 6) déclaration depuis 1,5 km (position déplacée) → drapeau rouge « déclarée à … de la soudure »
await ctx.setGeolocation({latitude:47.858496,longitude:-1.692210,accuracy:8});await page.waitForTimeout(1500);
await page.evaluate(()=>{window.TRACE.state.lines.L1.cond.A.joints[2].status='a_souder';window.TRACE.openJoint('L1','A',2);});await page.waitForTimeout(300);await page.click('#sheet [data-act="form-soudee"]');await page.waitForTimeout(300);
await page.evaluate(()=>{window.TRACE.state.pendingPhotos.push('data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNkYAAAAAYAAjCB0C8AAAAASUVORK5CYII=');});
await page.click('#sheet [data-act="save-soudee"]');await page.waitForTimeout(700);
await page.evaluate(()=>{window.TRACE.openJoint('L1','A',2);});await page.waitForTimeout(300);
out=await page.evaluate(()=>document.querySelector('#sheet .hist .who')?.textContent);console.log('déclaration lointaine:',out);
await page.screenshot({path:new URL('./e2e_geo.png',import.meta.url).pathname});
// 7) bouton GPS de nouveau → arrêt, point retiré
await page.click('#sheet [data-act="close"]');await page.waitForTimeout(200);await page.click('.zoomctl [data-z="gps"]');await page.waitForTimeout(300);
out=await page.evaluate(()=>({n:document.querySelectorAll('#gps circle').length,on:document.querySelector('.zoomctl [data-z="gps"]').classList.contains('gpsOn')}));console.log('GPS coupé (n 0, on false):',JSON.stringify(out));
console.log(logs);await browser.close();
