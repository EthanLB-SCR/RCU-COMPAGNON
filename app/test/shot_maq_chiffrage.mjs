// Captures de la maquette « chiffrage de A à Z » (desktop + téléphone) + contrôle d'erreurs JS
import { chromium } from 'playwright';
const browser=await chromium.launch({headless:true, executablePath: process.env.CHROMIUM_PATH||undefined});
const errs=[];
const ctx=await browser.newContext({viewport:{width:1366,height:900},deviceScaleFactor:1.5});const page=await ctx.newPage();page.on('pageerror',e=>errs.push(e.message));page.on('console',m=>{if(m.type()==='error')errs.push(m.text());});
await page.goto('http://localhost:8765/maquette-chiffrage.html');await page.waitForTimeout(600);
const shot=n=>page.screenshot({path:'/root/repo/app/test/shot_maq_chiffrage_'+n+'.png',fullPage:false});
await shot('3_chiffrage');
const out={prix:await page.evaluate(()=>document.querySelector('#chiffStats .stat b').textContent)};
await page.evaluate(()=>{const i=document.querySelector('#dn input[data-k=cad][data-dn="0"]');i.value='9';i.dispatchEvent(new Event('change'));});await page.waitForTimeout(200);
out.prix2=await page.evaluate(()=>document.querySelector('#chiffStats .stat b').textContent);
await page.evaluate(()=>go('dossier'));await page.waitForTimeout(300);await shot('1_dossier');
await page.evaluate(()=>go('lecture'));await page.waitForTimeout(300);await shot('2_lecture');
await page.evaluate(()=>go('memoire'));await page.waitForTimeout(300);await shot('4_memoire');
await page.evaluate(()=>go('dpgf'));await page.waitForTimeout(300);out.dpgf=await page.evaluate(()=>document.querySelector('#dpgfStats').textContent.replace(/\s+/g,' ').slice(0,200));await shot('5_dpgf');
await page.evaluate(()=>go('offre'));await page.waitForTimeout(300);await shot('6_offre');
const m=await browser.newContext({viewport:{width:430,height:900},deviceScaleFactor:2});const pm=await m.newPage();pm.on('pageerror',e=>errs.push('mobile '+e.message));await pm.goto('http://localhost:8765/maquette-chiffrage.html');await pm.waitForTimeout(500);await pm.screenshot({path:'/root/repo/app/test/shot_maq_chiffrage_mobile.png'});
console.log(JSON.stringify(out),errs);await browser.close();
