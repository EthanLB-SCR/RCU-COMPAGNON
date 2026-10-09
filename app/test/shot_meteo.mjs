// capture : météo par chantier (Open-Meteo simulé) → scène « Aujourd'hui » et tenue du jour ; hors connexion, Karim placé sur un chantier de Caen (pluie) puis sur Lyon (chaud)
import { chromium } from 'playwright';
const BASE=process.env.BASE||'http://localhost:8765';
const browser=await chromium.launch({headless:true, executablePath: process.env.CHROMIUM_PATH||undefined});
const ctx=await browser.newContext({viewport:{width:430,height:900}});const page=await ctx.newPage();
const errs=[];page.on('pageerror',e=>errs.push(e.message));
const isoLocal=dt=>dt.getFullYear()+'-'+String(dt.getMonth()+1).padStart(2,'0')+'-'+String(dt.getDate()).padStart(2,'0');
await page.route(u=>/open-meteo\.com$/.test(u.hostname),route=>{const url=route.request().url();const json=o=>route.fulfill({status:200,contentType:'application/json',body:JSON.stringify(o)});
  if(url.includes('geocoding-api')){const n=decodeURIComponent(url.split('name=')[1].split('&')[0]);return json({results:[/lyon/i.test(n)?{name:'Lyon',latitude:45.76,longitude:4.84}:{name:'Caen',latitude:49.18,longitude:-0.37}]});}
  const lat=+url.match(/latitude=([-\d.]+)/)[1];const days=[...Array(7)].map((_,i)=>{const d=new Date();d.setDate(d.getDate()+i);return isoLocal(d);});
  const chaud=lat<47;return json({daily:{time:days,weathercode:chaud?[0,1,2,0,0,1,2]:[63,61,3,2,80,1,2],temperature_2m_max:chaud?[29,30,27,26,25,24,23]:[13,14,15,16,12,17,18],precipitation_sum:chaud?[0,0,0,0,0,0,0]:[9,4,0,0,6,0,0],precipitation_probability_max:chaud?[0,0,5,5,5,5,5]:[95,80,10,10,70,5,5]}});});
await page.goto(BASE+'/index.html');await page.waitForTimeout(600);await page.evaluate(()=>{localStorage.clear();});await page.evaluate(()=>new Promise(r=>{try{const q=indexedDB.deleteDatabase('trace-kv');q.onsuccess=q.onerror=q.onblocked=()=>r();}catch(e){r();}}));
await page.reload();await page.waitForTimeout(1200);
const skip=async()=>{const s=await page.$('#loginSkip');if(s&&await s.isVisible())await s.click();await page.waitForTimeout(700);};await skip();
const seed=async()=>page.evaluate(()=>{const T=window.TRACE;const src=T.sites[Object.keys(T.sites).find(k=>k!=='__vide'&&T.sites[k]&&T.sites[k].lines)];const mk=(id,name,ville,secteur)=>{if(T.sites[id])return;const s=JSON.parse(JSON.stringify(src));s.id=id;s.name=name;s.fiche={ville,secteur};delete s.geo;T.sites[id]=s;};mk('demo_caen','Caen — Presqu\'île','Caen','ouest');mk('demo_lyon','Lyon — Confluence','Lyon','sudest');});
await seed();
// Ethan place Karim sur Caen toute la semaine
await page.evaluate(()=>{window.TRACE.state.userId='ethan';window.TRACE.renderHome();document.getElementById('htEspace').click();[...document.querySelectorAll('#eq-app .eq-subs .chip')].find(x=>/Planning équipe/.test(x.textContent)).click();});await page.waitForTimeout(500);
await page.evaluate(()=>{[...document.querySelectorAll('#eq-app .eq-pltray .eq-plchip')].find(x=>/Karim/.test(x.textContent)).querySelector('.eq-plmain').click();document.querySelector('#eq-app .eq-plsite[data-drop=demo_caen] [data-act=plput]').click();});await page.waitForTimeout(1500);
await page.evaluate(()=>{const el=document.querySelector('#eq-app .eq-plsite[data-drop=demo_caen]');el&&el.scrollIntoView();});await page.screenshot({path:'shot_meteo_planning.png'});
// Karim : son accueil → scène du jour (pluie à Caen)
await page.evaluate(()=>{window.TRACE.state.userId='karim';window.TRACE.renderHome();document.getElementById('htEspace').click();});await page.waitForTimeout(1200);
const a=await page.evaluate(()=>{const sc=document.querySelector('#eq-app .eq-scene');return {bg:sc&&sc.getAttribute('style'),meteo:sc&&(sc.querySelector('.eq-meteo')||{}).textContent,svg:sc?sc.querySelector('.eq-fig svg')?.innerHTML.length:0,store:Object.keys(window.TRACE.espace.meteo())};});
await page.screenshot({path:'shot_meteo_pluie.png'});
// Karim déplacé sur Lyon (chaud) → tenue d'été
await page.evaluate(()=>{window.TRACE.state.userId='ethan';window.TRACE.renderHome();document.getElementById('htEspace').click();[...document.querySelectorAll('#eq-app .eq-subs .chip')].find(x=>/Planning équipe/.test(x.textContent)).click();});await page.waitForTimeout(400);
await page.evaluate(()=>{document.querySelector('#eq-app .eq-plsite[data-drop=demo_caen] .eq-plchip .eq-plmain').click();});await page.waitForTimeout(200);
await page.evaluate(()=>{document.querySelector('#eq-app .eq-pledit [data-act=plrm]').click();});await page.waitForTimeout(200);
await page.evaluate(()=>{[...document.querySelectorAll('#eq-app .eq-pltray .eq-plchip')].find(x=>/Karim/.test(x.textContent)).querySelector('.eq-plmain').click();document.querySelector('#eq-app .eq-plsite[data-drop=demo_lyon] [data-act=plput]').click();});await page.waitForTimeout(1500);
await page.evaluate(()=>{window.TRACE.state.userId='karim';window.TRACE.renderHome();document.getElementById('htEspace').click();});await page.waitForTimeout(1200);
const b=await page.evaluate(()=>{const sc=document.querySelector('#eq-app .eq-scene');return {bg:sc&&sc.getAttribute('style'),meteo:sc&&(sc.querySelector('.eq-meteo')||{}).textContent,svg:sc?sc.querySelector('.eq-fig svg')?.innerHTML.length:0};});
await page.screenshot({path:'shot_meteo_chaud.png'});
console.log(JSON.stringify({a,b,errs}));await browser.close();
