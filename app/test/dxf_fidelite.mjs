// Lecteur DXF universel : le DXF de test (toutes familles d'objets, règles de couleur/calque) rendu par le traceur, à comparer à test/dxf/fidelite_ref.png (ezdxf)
import { chromium } from 'playwright';
const BASE='http://localhost:8765';const FILE=process.argv[2]||new URL('./dxf/fidelite.dxf',import.meta.url).pathname;
const browser=await chromium.launch({headless:true, executablePath: process.env.CHROMIUM_PATH||undefined});
const page=await browser.newPage({viewport:{width:1300,height:1000}});const logs=[];page.on('pageerror',e=>logs.push('PAGEERROR: '+e.message.slice(0,300)));page.on('dialog',d=>{logs.push('DIALOG: '+d.message().slice(0,200));d.accept();});
await page.goto(BASE+'/traceur.html');await page.waitForTimeout(400);await page.evaluate(()=>{localStorage.clear();indexedDB.deleteDatabase('trace-kv');});await page.reload();await page.waitForTimeout(400);
await page.setInputFiles('#bgFile',FILE);
await page.waitForFunction(()=>window.MAQ.state.bg&&window.MAQ.state.bg.drawing&&!document.querySelector('#prog'),null,{timeout:120000});await page.waitForTimeout(500);
const info=await page.evaluate(()=>{const b=window.MAQ.state.bg;const D=b.drawing;return {n:D.length,fills:D.filter(d=>d.fill).length,texts:D.filter(d=>d.text).length,colors:[...new Set(D.map(d=>d.c||d.fill).filter(Boolean))],report:b.report,images:(b.images||[]).length,sample:D.filter(d=>d.text).slice(0,30).map(t=>t.text.replace(/\n/g,'|')+' a='+(t.a||'start')+' va='+(t.va||0)+' rot='+t.rot+' h='+t.h+' c='+t.c),lts:[...new Set(D.map(d=>d.lt).filter(Boolean))],ws:[...new Set(D.map(d=>d.w).filter(Boolean))]};});
console.log(JSON.stringify(info,null,1));
// masquer grille + panneau, cadrer, capture
await page.evaluate(()=>{const S=window.MAQ.state;S.show.grille=false;document.querySelector('#grid').style.display='none';window.MAQ.setMode('select');let x0=1e9,y0=1e9,x1=-1e9,y1=-1e9;S.bg.drawing.forEach(d=>{const src=d.text?[[d.x,d.y]]:(d.loops?d.loops.flat():d.pts);src.forEach(p=>{x0=Math.min(x0,p[0]);y0=Math.min(y0,p[1]);x1=Math.max(x1,p[0]);y1=Math.max(y1,p[1]);});});const b=[x0,y0,x1,y1];const W=920,H=880;const k=Math.min(W/(b[2]-b[0]+4),H/(b[3]-b[1]+4));S.view={k,tx:-(b[0]-2)*k,ty:-(b[1]-2)*k+80};window.dispatchEvent(new Event('resize'));});await page.waitForTimeout(600);
await page.evaluate(()=>{document.querySelector('.hint')&&(document.querySelector('.hint').style.display='none');});
await page.screenshot({path:new URL('./dxf/fidelite_traceur.png',import.meta.url).pathname,clip:{x:0,y:80,width:920,height:900}});
// rapport ⓘ
await page.click('#bgInfo');await page.waitForTimeout(200);console.log('rapport:',await page.evaluate(()=>document.querySelector('#modalBody').innerText.replace(/\s+/g,' ').slice(0,700)));
console.log(logs);await browser.close();
