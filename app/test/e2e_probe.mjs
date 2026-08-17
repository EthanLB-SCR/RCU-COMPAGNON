import { chromium } from 'playwright';
import path from 'node:path';
const dxfPath=process.argv[2];
const browser=await chromium.launch({headless:true, executablePath: process.env.CHROMIUM_PATH||undefined, args:['--js-flags=--max-old-space-size=4096']});
const page=await browser.newPage({viewport:{width:1300,height:900}});
page.on('console',m=>{if(m.type()!=='log')console.log('  [console.'+m.type()+']',m.text().slice(0,200));});page.on('pageerror',e=>console.log('  [PAGEERROR]',e.message.slice(0,300)));
await page.goto('file://'+new URL('../dist/index.html', import.meta.url).pathname);
await page.waitForTimeout(800);
await page.evaluate(()=>{const sel=document.querySelector('#roleSel');sel.value='ethan';sel.dispatchEvent(new Event('change'));});await page.waitForTimeout(300);
await page.evaluate(()=>document.querySelector('#btnImport').click());
await page.waitForSelector('#planFile',{state:'attached'});
const t0=Date.now();
await page.setInputFiles('#planFile', dxfPath);
console.log('setInputFiles fait en',(Date.now()-t0)/1000,'s');
for(let i=0;i<120;i++){await page.waitForTimeout(5000);const txt=await page.evaluate(()=>{const p=document.querySelector('#impProg');const g=document.querySelector('#impGo');return (g?'PRÊT ':'')+(p?p.textContent:'(pas de barre) '+document.querySelector('#importBody').innerText.slice(0,200));});console.log(((Date.now()-t0)/1000).toFixed(0)+'s :',txt.slice(0,160));if(/PRÊT|impossible/.test(txt))break;}
await browser.close();
