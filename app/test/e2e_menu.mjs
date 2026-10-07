// RUBAN + MENU (notes d'Ethan 07/10 : « sur téléphone les barres du dessus prennent trop de place : un ruban et un raccourci qui propose toutes les options par catégorie »)
// + barre d'onglets allégée définitive (Catalogue et Liste par « ⋯ »).
import { chromium } from 'playwright';
const BASE=process.env.BASE||'http://localhost:8765';
const browser=await chromium.launch({headless:true, executablePath: process.env.CHROMIUM_PATH||undefined});
const ctx=await browser.newContext({viewport:{width:390,height:800},isMobile:true,hasTouch:true});const page=await ctx.newPage();page.on('dialog',d=>d.accept().catch(()=>{}));
const logs=[];page.on('pageerror',e=>logs.push('PAGEERROR: '+e.message.slice(0,300)));
await page.goto(BASE+'/traceur.html');await page.waitForTimeout(500);
await page.evaluate(()=>{localStorage.clear();});await page.reload();await page.waitForTimeout(500);
await page.evaluate(()=>{const S=window.MAQ.state;S.supplier='RENALIA';S.lines=[{id:'L1',name:'Rue de la Gare',dn:150,bar:12,pts:[[10,50],[130,50]],specials:[{id:'v1',type:'valve',m:30}],parent:null}];S.seq=2;window.MAQ.setMode('select');window.MAQ.rebuild();});
await page.click('#bSave');await page.waitForTimeout(200);await page.fill('#svName','Menu test');await page.click('#svOk');await page.waitForTimeout(700);await page.click('#svGo');await page.waitForTimeout(1500);await page.selectOption('#roleSel','ethan');await page.waitForTimeout(400);
// ── 1) vue plan : plus de barres au-dessus du plan (recherche / filtres / outils dans le menu, fermé) ; ruban avec 🔍 et ☰
let out=await page.evaluate(()=>{const vis=el=>el&&el.getBoundingClientRect().height>0&&getComputedStyle(el).display!=='none';const menu=document.querySelector('#menu');return {menuClosed:!menu.classList.contains('show'),searchHidden:!vis(document.querySelector('#search'))||!menu.classList.contains('show'),ribbon:vis(document.querySelector('#btnMenu'))&&vis(document.querySelector('#btnSearch')),pills:document.querySelector('#planPills').style.display==='none',canvasTop:document.querySelector('#canvas').getBoundingClientRect().top};});
console.log('1) ruban seul, menu fermé, plan tout en haut :',JSON.stringify(out));const c1=out.menuClosed&&out.ribbon&&out.pills&&out.canvasTop<110;
// ── 2) ☰ → menu par catégories, avec la recherche, les filtres, les outils (soudure supplémentaire, traceur, versions…), le compte (connexion) et l'affichage
await page.evaluate(()=>document.querySelector('#btnMenu').click());await page.waitForTimeout(250);
out=await page.evaluate(()=>{const m=document.querySelector('#menu');const h=[...m.querySelectorAll('h4')].map(x=>x.textContent.trim());return {open:m.classList.contains('show'),h,search:!!m.querySelector('#search'),chips:m.querySelectorAll('#filters .chip').length,tools:[...m.querySelectorAll('#planTools button')].map(b=>b.id),cloud:!!m.querySelector('#menuAccount #cloudBox'),disp:!!m.querySelector('#btnDispM')};});
console.log('2) menu ouvert :',JSON.stringify(out));const c2=out.open&&out.h.length===5&&/Rechercher/.test(out.h[0])&&/Filtrer/.test(out.h[1])&&/Terrain/.test(out.h[2])&&/Compte/.test(out.h[3])&&/Affichage/.test(out.h[4])&&out.search&&out.chips>=8&&out.tools.includes('btnExtraWeld')&&out.tools.includes('btnTraceur')&&out.tools.includes('btnVersions')&&out.cloud&&out.disp;
// ── 3) un filtre choisi referme le menu et pose une pastille sur le plan ; ✕ sur la pastille → retour à « Toutes »
await page.evaluate(()=>{[...document.querySelectorAll('#filters .chip')].find(c=>c.dataset.f==='a_souder').click();});await page.waitForTimeout(250);
out=await page.evaluate(()=>({closed:!document.querySelector('#menu').classList.contains('show'),filter:window.TRACE.state.filter,pill:document.querySelector('#planPills').textContent,shown:document.querySelector('#planPills').style.display!=='none'}));
await page.evaluate(()=>document.querySelector('#planPills [data-pill="filter"]').click());await page.waitForTimeout(200);
out.after=await page.evaluate(()=>({filter:window.TRACE.state.filter,hidden:document.querySelector('#planPills').style.display==='none'}));
console.log('3) filtre → menu fermé + pastille ; ✕ → toutes :',JSON.stringify(out));const c3=out.closed&&out.filter==='a_souder'&&/À souder/.test(out.pill)&&out.shown&&out.after.filter==='all'&&out.after.hidden;
// ── 4) 🔍 ouvre le menu avec le champ de recherche actif ; Échap referme ; un outil (soudure supplémentaire) referme aussi et pose sa pastille
await page.evaluate(()=>document.querySelector('#btnSearch').click());await page.waitForTimeout(250);
out=await page.evaluate(()=>({open:document.querySelector('#menu').classList.contains('show'),focus:document.activeElement&&document.activeElement.id==='search'}));
await page.keyboard.press('Escape');await page.waitForTimeout(150);out.esc=await page.evaluate(()=>!document.querySelector('#menu').classList.contains('show'));
await page.evaluate(()=>document.querySelector('#btnMenu').click());await page.waitForTimeout(200);await page.evaluate(()=>document.querySelector('#btnExtraWeld').click());await page.waitForTimeout(250);
out.tool=await page.evaluate(()=>({closed:!document.querySelector('#menu').classList.contains('show'),pose:window.TRACE.state.extraPose,pill:/soudure supplémentaire/.test(document.querySelector('#planPills').textContent)}));
await page.evaluate(()=>document.querySelector('#planPills [data-pill="extra"]').click());await page.waitForTimeout(200);out.tool.off=await page.evaluate(()=>!window.TRACE.state.extraPose);
console.log('4) 🔍, Échap, outil → pastille, ✕ :',JSON.stringify(out));const c4=out.open&&out.focus&&out.esc&&out.tool.closed&&out.tool.pose&&out.tool.pill&&out.tool.off;
// ── 5) barre d'onglets allégée définitive : Catalogue et Liste cachés, « ⋯ » présent et les ouvre
out=await page.evaluate(()=>{const tb=document.querySelector('#tabbar');const vis=t=>{const b=tb.querySelector(`[data-tab="${t}"]`);return !!b&&getComputedStyle(b).display!=='none';};return {cat:vis('catalogue'),liste:vis('liste'),more:vis('__more'),recap:vis('recap'),qse:vis('qse'),ts:vis('ts')};});
await page.evaluate(()=>document.querySelector('#tabbar [data-tab="__more"]').click());await page.waitForTimeout(250);
out.modal=await page.evaluate(()=>({open:document.querySelector('#modal').classList.contains('show'),cat:!!document.querySelector('#modal [data-nmt="catalogue"]')}));
await page.evaluate(()=>document.querySelector('#modal [data-nmt="liste"]').click());await page.waitForTimeout(300);out.tab=await page.evaluate(()=>window.TRACE.state.tab);
console.log('5) barre allégée : Catalogue / Liste par « ⋯ » :',JSON.stringify(out));const c5=!out.cat&&!out.liste&&out.more&&out.recap&&out.qse&&out.ts&&out.modal.open&&out.modal.cat&&out.tab==='liste';
const ALL=c1&&c2&&c3&&c4&&c5;console.log('RESULTAT:',ALL?'TOUT VERT':'ECHEC '+JSON.stringify({c1,c2,c3,c4,c5}));console.log(logs.length?logs:'[]');await browser.close();process.exit(ALL?0:1);
