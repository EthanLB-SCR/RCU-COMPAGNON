import { chromium } from 'playwright';
import path from 'node:path';
const dxfPath=process.argv[2]; const tag=path.basename(dxfPath,'.dxf');
const browser=await chromium.launch({headless:true, executablePath: process.env.CHROMIUM_PATH||undefined});
const page=await browser.newPage({viewport:{width:1300,height:900}});
const logs=[];page.on('console',m=>{if(m.type()==='error'||m.type()==='warning')logs.push(m.type()+': '+m.text().slice(0,200));});page.on('pageerror',e=>logs.push('PAGEERROR: '+e.message.slice(0,300)));
await page.goto('file://'+new URL('../dist/index.html', import.meta.url).pathname);await page.waitForTimeout(600);
await page.evaluate(()=>{const sel=document.querySelector('#roleSel');sel.value='ethan';sel.dispatchEvent(new Event('change'));});await page.waitForTimeout(300);
await page.evaluate(()=>document.querySelector('#btnWide').click());await page.waitForTimeout(300);
await page.evaluate(()=>document.querySelector('#btnImport').click());await page.waitForSelector('#planFile',{state:'attached'});
await page.setInputFiles('#planFile', dxfPath);await page.waitForFunction(()=>!!document.querySelector('#impGo'),null,{timeout:900000});
await page.click('#impGo');await page.waitForFunction(()=>window.TRACE&&Object.keys(window.TRACE.lines).length>0,null,{timeout:600000});await page.waitForTimeout(2500);
// fermer le rapport
await page.evaluate(()=>{document.querySelectorAll('[data-close]').forEach(b=>b.click());});await page.waitForTimeout(800);
await page.screenshot({path:new URL('./', import.meta.url).pathname+`view_${tag}_1.png`});
// zoom sur la ligne principale : centrer sur le milieu de la plus longue ligne
await page.evaluate(()=>{const L=Object.values(window.TRACE.lines).sort((a,b)=>b.length-a.length)[0];const e=L.els[Math.floor(L.els.length/2)];window.TRACE.centerOn(e.from.x,e.from.y,6);});await page.waitForTimeout(800);
await page.screenshot({path:new URL('./', import.meta.url).pathname+`view_${tag}_2.png`});
await page.evaluate(()=>{const L=Object.values(window.TRACE.lines).sort((a,b)=>b.length-a.length)[0];const e=L.els[Math.floor(L.els.length/2)];window.TRACE.centerOn(e.from.x,e.from.y,20);});await page.waitForTimeout(800);
await page.screenshot({path:new URL('./', import.meta.url).pathname+`view_${tag}_3.png`});
const notes=await page.evaluate(()=>{const out=[];Object.values(window.TRACE.lines).forEach(l=>{const E=l.engines?[l.engines.A,l.engines.R]:[l.engine];E.forEach(e=>{if(e)e.notes.forEach(n=>out.push(l.id+' ['+n.kind+'] '+n.txt));});});return out;});
console.log('notes moteur:',notes.length);notes.slice(0,25).forEach(n=>console.log('  ',n.slice(0,230)));
console.log('console:',logs.slice(0,8));
await browser.close();
