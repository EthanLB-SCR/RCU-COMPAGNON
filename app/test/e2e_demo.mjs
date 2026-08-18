// Rendu des chantiers de démo importés (Bain, Saint-Lô) avec le nouveau rendu : pas d'erreur, captures à 3 zooms
import { chromium } from 'playwright';
const BASE=process.env.BASE||'http://localhost:8765';
const browser=await chromium.launch({headless:true, executablePath: process.env.CHROMIUM_PATH||undefined});
const ctx=await browser.newContext({viewport:{width:560,height:940}});const page=await ctx.newPage();
const logs=[];page.on('pageerror',e=>logs.push('PAGEERROR: '+e.message.slice(0,300)));page.on('console',m=>{if(m.type()==='error'&&!/supabase|Failed to fetch|net::ERR|404/i.test(m.text()))logs.push(m.text().slice(0,200));});
await page.goto(BASE+'/index.html');await page.waitForTimeout(1500);
for(const site of ['bain','saintlo_jaune']){
  const ok=await page.evaluate(async id=>{const sel=document.querySelector('#siteSel');if(![...sel.options].some(o=>o.value===id))return false;sel.value=id;await window.TRACE.switchSite(id);return true;},site);
  if(!ok){console.log('pas de site',site);continue;}
  await page.waitForTimeout(400);
  const j=await page.evaluate(()=>{const js=window.TRACE.allJoints();const q=js[Math.floor(js.length/3)];const i=q.l.cond[q.c].joints.indexOf(q.j);return {line:q.l.id,cond:q.c,i};});
  for(const kpm of [3,9,20,45]){
    const out=await page.evaluate(([j,k])=>{const T=window.TRACE;const L=T.lines[j.line];const e=L.cond[j.cond].els[j.i]||L.els[j.i];const sh=T.state.sheets[T.state.sheetId];T.centerOn(e.to.x,e.to.y,k/sh.ppm);const svg=document.querySelector('#net');return {kpm:k,els:svg.querySelectorAll('g.el').length,markers:svg.querySelectorAll('g.marker').length,texts:svg.querySelectorAll('text').length,zoom:document.querySelector('#zoominfo').textContent};},[j,kpm]);
    console.log(site,JSON.stringify(out));await page.waitForTimeout(150);await page.screenshot({path:new URL(`./e2e_demo_${site}_${kpm}.png`,import.meta.url).pathname});
  }
}
console.log(logs);await browser.close();
