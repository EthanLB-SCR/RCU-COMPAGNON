// shot_ico_0111 — captures : accueil (onglets des modules), menu des modules, Flotte / Magasin, à 390 px et sur PC
import { chromium } from 'playwright';
const BASE=process.env.BASE||'http://localhost:8765';const OUT=process.env.OUT||'/tmp';const errs=[];
const b=await chromium.launch({executablePath:process.env.CHROMIUM_PATH||undefined});
for(const [nm,vp] of [['390',{width:390,height:844}],['pc',{width:1366,height:820}]]){
  const ctx=await b.newContext({viewport:vp,deviceScaleFactor:nm==='390'?2:1});const page=await ctx.newPage();page.on('pageerror',e=>errs.push(nm+': '+e));
  await page.goto(BASE+'/index.html');await page.waitForTimeout(400);await page.evaluate(()=>{localStorage.clear();localStorage.setItem('trace:skipLogin','1');localStorage.setItem('trace:tuto:off','1');});await page.reload();await page.waitForTimeout(1500);
  const sk=await page.$('#loginSkip');if(sk&&await sk.isVisible()){await sk.click();await page.waitForTimeout(700);}
  await page.evaluate(()=>{const T=window.TRACE;try{T.tuto.close(null);}catch(e){}T.state.userId='ethan';T.showScreen('home');document.getElementById('htHome').click();});await page.waitForTimeout(600);
  await page.screenshot({path:`${OUT}/home_${nm}.png`});
  await page.evaluate(()=>{const e=document.querySelector('.ac-spaces');if(e)e.scrollIntoView({block:'center'});});await page.waitForTimeout(400);await page.screenshot({path:`${OUT}/espaces_${nm}.png`});
  await page.evaluate(()=>{const b=document.getElementById('tbHomeMod');if(b)b.click();});await page.waitForTimeout(500);await page.screenshot({path:`${OUT}/menu_${nm}.png`});
  await page.evaluate(()=>{const c=document.querySelector('#modal [data-close]');if(c)c.click();const p=document.getElementById('htParc');if(p&&p.style.display!=='none')p.click();});await page.waitForTimeout(600);await page.screenshot({path:`${OUT}/flotte_${nm}.png`});
  await ctx.close();}
console.log('errs',JSON.stringify(errs));await b.close();
