// captures des écrans des retours du 10/10 : onglet QSE (accueil permanent, quart d'heure, contrôles), formulaire de contrôle, Exploitation → Contrôles chantier, Documents d'entreprise (à relancer)
import { chromium } from 'playwright';
const BASE=process.env.BASE||'http://localhost:8765';
const browser=await chromium.launch({headless:true, executablePath: process.env.CHROMIUM_PATH||undefined});
const ctx=await browser.newContext({viewport:{width:430,height:900},deviceScaleFactor:2});const page=await ctx.newPage();page.on('dialog',d=>d.accept().catch(()=>{}));
const wait=ms=>page.waitForTimeout(ms);
await page.clock.install({time:new Date(2026,9,9,8,30,0)});
await page.goto(BASE+'/index.html');await wait(600);await page.evaluate(()=>{localStorage.clear();});await page.reload();await wait(1200);
const s=await page.$('#loginSkip');if(s&&await s.isVisible())await s.click();await wait(700);
await page.evaluate(()=>{const T=window.TRACE;const src=T.sites[Object.keys(T.sites).find(k=>k!=='__vide'&&T.sites[k]&&T.sites[k].lines)];const now=new Date().toISOString();const x=JSON.parse(JSON.stringify(src));x.id='demo_caen';x.name='Caen — Presqu\'île';x.fiche={ville:'Caen',secteur:'ouest',chef:'l:ethan',conducteur:'l:sophie',horaires:'7 h 30 – 16 h 30'};x.conv={msgs:[],seq:1};x.qse={docs:[]};x.stock={zones:[],lots:[],livs:[],moves:[],takes:[]};T.sites.demo_caen=x;T.renderHome();});
await page.evaluate(async()=>{const T=window.TRACE;T.state.userId='ethan';T.renderHome();document.getElementById('htExpl').click();await new Promise(r=>setTimeout(r,200));[...document.querySelectorAll('#eq-app .ac-row')].find(x=>/Planning des équipes/.test(x.textContent)).click();await new Promise(r=>setTimeout(r,200));const c=[...document.querySelectorAll('#eq-app .eq-pltray .eq-plchip')].find(x=>/Karim/.test(x.textContent));c.querySelector('.eq-plmain').click();document.querySelector('#eq-app .eq-plsite[data-drop=demo_caen] [data-act=plput]').click();});await wait(300);
await page.evaluate(()=>{const T=window.TRACE;T.qhs.trigger({topic:'qhs_reseaux',sites:['demo_caen'],note:'avant d\'ouvrir la tranchée rue de la Mer'});});
// Karim fait son accueil (signature directe simulée) et le quart d'heure
await page.evaluate(async()=>{const T=window.TRACE;T.state.userId='karim';T.go('demo_caen');await new Promise(r=>setTimeout(r,900));T.state.tab='qse';T.renderAll();});await wait(400);
await page.screenshot({path:'shot_retours_qse_karim.png',fullPage:false});
await page.evaluate(async()=>{const T=window.TRACE;T.state.userId='ethan';T.renderAll();});await wait(300);
await page.evaluate(()=>{const T=window.TRACE;const q=T.net.qse;q.docs.push({id:'ACC-demo_caen',type:'accueil',standing:true,required:true,title:'Accueil chantier — Caen — Presqu\'île',by:'Ethan L.',at:new Date().toISOString(),qs:[],sigs:[{name:'Karim B.',uid:'l:karim',at:new Date().toISOString(),parcours:{q:{},read:[]}},{name:'Lucas Intérim',uid:'ext:lucas',by:'Ethan L.',org:'Manpower Caen',at:new Date().toISOString(),parcours:{q:{},read:[]}}]});T.renderAll();});await wait(300);
await page.screenshot({path:'shot_retours_qse_ethan.png',fullPage:true});
await page.evaluate(()=>document.getElementById('qse-controle').click());await wait(300);
await page.screenshot({path:'shot_retours_controle.png'});
await page.evaluate(()=>{document.querySelector('#modal [data-close]').click();});await wait(200);
await page.evaluate(()=>document.getElementById('btnHome').click());await wait(500);
await page.evaluate(()=>{const T=window.TRACE;T.state.userId='ethan';document.getElementById('htExpl').click();T.renderHome();});await wait(400);
await page.evaluate(()=>{const b=document.querySelector('#eq-app .ac-back');if(b)b.click();});await wait(300);
await page.evaluate(()=>{[...document.querySelectorAll('#eq-app .ac-row')].find(x=>/Documents d'entreprise/.test(x.textContent)).click();});await wait(300);
await page.screenshot({path:'shot_retours_docs_relancer.png'});
await page.evaluate(async()=>{document.querySelector('#eq-app .ac-back').click();await new Promise(r=>setTimeout(r,200));[...document.querySelectorAll('#eq-app .ac-row')].find(x=>/^Contrôles chantier/.test(x.querySelector('.tx b').textContent)).click();});await wait(300);
await page.screenshot({path:'shot_retours_controles_suivi.png'});
await browser.close();
