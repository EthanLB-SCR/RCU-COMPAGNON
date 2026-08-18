import { chromium } from 'playwright';
const BASE='http://localhost:8765';const FILE=process.argv[2]||'/root/plans/bain_reseau.dxf';
const browser=await chromium.launch({headless:true, executablePath: process.env.CHROMIUM_PATH||undefined, args:['--js-flags=--max-old-space-size=4096']});
const page=await browser.newPage({viewport:{width:1400,height:900}});const logs=[];page.on('pageerror',e=>logs.push('PAGEERROR: '+e.message.slice(0,300)));page.on('dialog',d=>{logs.push('DIALOG: '+d.message().slice(0,200));d.accept();});
await page.goto(BASE+'/traceur.html');await page.waitForTimeout(400);await page.evaluate(()=>{localStorage.clear();indexedDB.deleteDatabase('trace-kv');});await page.reload();await page.waitForTimeout(400);
const t0=Date.now();await page.setInputFiles('#bgFile',FILE);
// fond automatique : attendre la fin du dessin
await page.waitForFunction(()=>window.MAQ.state.bg&&window.MAQ.state.bg.drawing&&!document.querySelector('#prog'),null,{timeout:900000});await page.waitForTimeout(300);
let out=await page.evaluate(()=>{const b=window.MAQ.state.bg;return {traits:b&&b.drawing&&b.drawing.length,net:b&&b.drawing&&b.drawing.filter(d=>d.net).length,bbox:b&&b.bbox&&b.bbox.map(v=>Math.round(v)),origin:b&&b.origin,paths:document.querySelectorAll('#bg path').length,hint:document.querySelector('#hint').textContent.slice(0,160)};});
console.log('fond auto',((Date.now()-t0)/1000).toFixed(1),'s',JSON.stringify(out));
// options : la modale s'ouvre et se ferme
await page.click('#bgLayers');await page.waitForSelector('#dxfOk',{timeout:5000});out=await page.evaluate(()=>{const rows=[...document.querySelectorAll('.dxfLay')];return {layers:rows.length,checked:rows.filter(c=>c.checked).map(c=>c.closest('tr').children[1].textContent).slice(0,6)};});console.log('options',JSON.stringify(out));await page.click('#dxfCancel');
await page.screenshot({path:'e2e_dxf_bg.png'});
// F5 : le fond revient depuis IndexedDB
await page.reload();await page.waitForTimeout(2500);
out=await page.evaluate(()=>{const b=window.MAQ.state.bg;return {traits:b&&b.drawing&&b.drawing.length,paths:document.querySelectorAll('#bg path').length};});console.log('après F5:',JSON.stringify(out));
// tracer une ligne au milieu du fond et enregistrer → appli avec le fond
await page.evaluate(()=>{const S=window.MAQ.state;const b=S.bg.bbox;const cx=(b[0]+b[2])/2,cy=(b[1]+b[3])/2;S.lines=[{id:'L1',name:'L1',dn:100,bar:12,pts:[[cx-40,cy],[cx+40,cy]],specials:[],parent:null}];S.seq=2;window.MAQ.setMode('select');window.MAQ.rebuild();});
await page.click('#bSave');await page.waitForTimeout(200);await page.click('#svOk');await page.waitForTimeout(3000);
out=await page.evaluate(()=>document.querySelector('#modalBody')?document.querySelector('#modalBody').textContent.slice(0,200):'');console.log('enregistré:',out);
await page.click('#svGo');await page.waitForTimeout(4000);
out=await page.evaluate(()=>({site:document.querySelector('#siteSel').value,bgPaths:document.querySelectorAll('#bg path').length,els:document.querySelectorAll('#net g.el').length,zoom:document.querySelector('.zoominfo')?document.querySelector('.zoominfo').textContent:''}));console.log('appli:',JSON.stringify(out));
await page.screenshot({path:'e2e_dxf_app.png'});
console.log(logs);await browser.close();
