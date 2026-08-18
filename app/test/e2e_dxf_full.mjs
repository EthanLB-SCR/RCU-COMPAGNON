import { chromium } from 'playwright';
const BASE='http://localhost:8765';const FILE=process.argv[2];
const browser=await chromium.launch({headless:true, executablePath: process.env.CHROMIUM_PATH||undefined, args:['--js-flags=--max-old-space-size=6144']});
const page=await browser.newPage({viewport:{width:1400,height:900}});const logs=[];page.on('pageerror',e=>logs.push('PAGEERROR: '+e.message.slice(0,300)));page.on('dialog',d=>{logs.push('DIALOG: '+d.message().slice(0,200));d.accept();});
await page.goto(BASE+'/traceur.html');await page.waitForTimeout(400);await page.evaluate(()=>{localStorage.clear();indexedDB.deleteDatabase('trace-kv');});await page.reload();await page.waitForTimeout(400);
const t0=Date.now();await page.setInputFiles('#bgFile',FILE);await page.waitForFunction(()=>window.MAQ.state.bg&&window.MAQ.state.bg.drawing&&!document.querySelector('#prog'),null,{timeout:900000});await page.waitForTimeout(300);
let out=await page.evaluate(()=>{const b=window.MAQ.state.bg;const d=b.drawing;return {traits:d.filter(x=>x.pts).length,texts:d.filter(x=>x.text).length,pts:d.reduce((s,x)=>s+(x.pts?x.pts.length:4),0),bbox:b.bbox.map(v=>Math.round(v)),hint:document.querySelector('#hint').textContent.slice(0,200)};});
console.log('fond',((Date.now()-t0)/1000).toFixed(1),'s',JSON.stringify(out));
// F5 restore timing
const t1=Date.now();await page.reload();await page.waitForFunction(()=>window.MAQ&&window.MAQ.state.bg&&window.MAQ.state.bg.drawing,null,{timeout:120000});console.log('F5 restauré en',((Date.now()-t1)/1000).toFixed(1),'s');
// zoom on the network zone center at 3 and 20 px/m
const c=await page.evaluate(()=>{const b=window.MAQ.state.bg;const net=b.drawing.filter(d=>d.net&&d.pts);const p=net.length?net[Math.floor(net.length/2)].pts[0]:[(b.bbox[0]+b.bbox[2])/2,(b.bbox[1]+b.bbox[3])/2];return p;});
for(const k of [3,20]){await page.evaluate(([k,p])=>{const S=window.MAQ.state;const W=document.querySelector('#svg').clientWidth,H=document.querySelector('#svg').clientHeight;S.view={k,tx:W/2-p[0]*k,ty:H/2-p[1]*k};window.dispatchEvent(new Event('resize'));},[k,c]);await page.waitForTimeout(700);
  const r=await page.evaluate(()=>({len:document.querySelector('#bg').innerHTML.length,texts:document.querySelectorAll('#bg text').length}));console.log('zoom',k,JSON.stringify(r));await page.screenshot({path:`e2e_dxf3_${k}.png`});}
// save → site reduced drawing size
await page.evaluate(p=>{const S=window.MAQ.state;S.lines=[{id:'L1',name:'L1',dn:100,bar:12,pts:[[p[0]-30,p[1]],[p[0]+30,p[1]]],specials:[],parent:null}];S.seq=2;window.MAQ.setMode('select');window.MAQ.rebuild();},c);
await page.click('#bSave');await page.waitForTimeout(200);await page.click('#svOk');await page.waitForTimeout(3000);
out=await page.evaluate(async()=>{const s=await new Promise(res=>{const r=indexedDB.open('trace-kv',1);r.onsuccess=()=>{const st=r.result.transaction('kv','readonly').objectStore('kv');const g=st.getAllKeys();g.onsuccess=()=>{const k=g.result.find(x=>String(x).startsWith('trace:handoff:'));const g2=st.get(k);g2.onsuccess=()=>res(g2.result);};};});return {siteTraits:s.drawing?s.drawing.length:0,sizeMB:(JSON.stringify(s).length/1e6).toFixed(1)};});console.log('chantier:',JSON.stringify(out));
console.log(logs);await browser.close();
