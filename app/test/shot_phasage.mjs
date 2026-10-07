import { chromium } from 'playwright';
const browser=await chromium.launch({headless:true, executablePath: process.env.CHROMIUM_PATH||undefined});
const ctx=await browser.newContext({viewport:{width:1180,height:1400},deviceScaleFactor:1.5});const page=await ctx.newPage();
const errs=[];page.on('pageerror',e=>errs.push(e.message));
await page.goto('http://localhost:8765/maquette_phasage.html');await page.waitForTimeout(600);
// scénario : nouvelle phase ferme : tap milieu de barre + fin + antenne amorce 25 m
await page.click('#bNew');await page.waitForTimeout(200);
const svgBox=await page.$eval('#plan',e=>{const r=e.getBoundingClientRect();return {x:r.x,y:r.y,w:r.width,h:r.height};});
const at=(vx,vy)=>({x:svgBox.x+vx/640*svgBox.w,y:svgBox.y+vy/300*svgBox.h});
let p=at(330,80);await page.mouse.click(p.x,p.y);await page.waitForTimeout(200);
p=at(198,160);await page.mouse.click(p.x,p.y);await page.waitForTimeout(200); // antenne → amorce
await page.click('[data-ant="25"]');await page.waitForTimeout(200);
p=at(430,80);await page.mouse.click(p.x,p.y);await page.waitForTimeout(300);
await page.screenshot({path:'/tmp/maq2_a.png',clip:{x:0,y:70,width:1180,height:620}});
await page.click('#bOk');await page.waitForTimeout(400);
await page.screenshot({path:'/tmp/maq2_full.png',fullPage:true});
console.log('errs',JSON.stringify(errs),await page.evaluate(()=>document.querySelector('#phases').textContent.slice(0,200)));
await browser.close();
