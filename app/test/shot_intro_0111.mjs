// shot_intro_0111 — captures de l'intro A v75 dans l'appli (390 px et PC) à 1 s, 5 s et à la fin (logo) ; mesure le temps par image
import { chromium } from 'playwright';
const BASE=process.env.BASE||'http://localhost:8765';const OUT=process.env.OUT||'/tmp';const errs=[];
const b=await chromium.launch({executablePath:process.env.CHROMIUM_PATH||undefined});
for(const [nm,vp,dsf] of [['390',{width:390,height:844},2],['pc',{width:1366,height:768},1]]){
  const ctx=await b.newContext({viewport:vp,deviceScaleFactor:dsf});const page=await ctx.newPage();page.on('pageerror',e=>errs.push(nm+': '+e));
  await page.goto(BASE+'/index.html');await page.waitForTimeout(300);await page.evaluate(()=>{localStorage.clear();localStorage.setItem('trace:intro:test','long-full');localStorage.setItem('trace:skipLogin','1');});
  await page.reload({waitUntil:'commit'});await page.waitForFunction(()=>window.trBoot&&window.trBoot.info().introAt!==null,null,{timeout:20000});
  const t0=Date.now();for(const [lab,ms] of [['1s',1000],['5s',5000]]){const dt=ms-(Date.now()-t0);if(dt>0)await page.waitForTimeout(dt);await page.screenshot({path:`${OUT}/intro_${nm}_${lab}.png`});}
  const dt=7600-(Date.now()-t0);if(dt>0)await page.waitForTimeout(dt);await page.screenshot({path:`${OUT}/intro_${nm}_fin.png`});
  await page.waitForFunction(()=>window.trBoot.ended(),null,{timeout:20000}).catch(()=>{});console.log(nm,JSON.stringify(await page.evaluate(()=>window.trBoot.info())));await ctx.close();}
console.log('errs',JSON.stringify(errs));await b.close();
