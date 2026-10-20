// OPTIONS SCR INTERNE « Pointage » et « Profil » du chantier (codées le 07/10, interrupteurs « Nouveautés ») — RETIRÉES du chantier le 12/10
// (Ethan : « on peut enlever pointage et profil des onglets chantier, c'est géré ailleurs ») : le pointage se fait dans Moi → Heures (e2e_espace), le profil dans Moi.
// Vérifié ici : (1) aucun onglet Pointage / Profil, même avec les anciens interrupteurs allumés dans l'appareil ; (2) les facettes du chantier : Vie du chantier = Bureau ·
// Conversation · QSE · Dossier · Export ; Technique = DH · Hydro · Stock · Phasage · Modifs · ⋯ (Stock passé dans Technique), sans défilement même sur téléphone ;
// (3) le bouton « Nouveautés » ne propose plus ces options ; (4) le pointage de Karim marche toujours, dans Moi.
import { chromium } from 'playwright';
const BASE=process.env.BASE||'http://localhost:8765';
const browser=await chromium.launch({headless:true, executablePath: process.env.CHROMIUM_PATH||undefined});
const ctx=await browser.newContext({viewport:{width:900,height:940},geolocation:{latitude:48.1173,longitude:-1.6778,accuracy:12},permissions:['geolocation']});const page=await ctx.newPage();
const logs=[];page.on('pageerror',e=>logs.push('PAGEERROR: '+e.message.slice(0,300)));page.on('console',m=>{if(m.type()==='error'&&!/supabase|Failed to fetch|net::ERR|404/i.test(m.text()))logs.push(m.text().slice(0,200));});
page.on('dialog',d=>d.accept().catch(()=>{}));
await page.goto(BASE+'/traceur.html');await page.waitForTimeout(500);
await page.evaluate(()=>{localStorage.clear();localStorage.setItem('trace:next',JSON.stringify({pointage:1,profil:1}));});await page.reload();await page.waitForTimeout(500); /* anciens interrupteurs allumés : ne doivent plus rien faire */
await page.evaluate(()=>{const S=window.MAQ.state;S.supplier='RENALIA';S.lines=[{id:'L1',name:'Feeder',dn:100,bar:12,pts:[[10,50],[130,50]],specials:[],parent:null}];S.seq=2;window.MAQ.setMode('select');window.MAQ.rebuild();});
await page.click('#bSave');await page.waitForTimeout(200);await page.fill('#svName','SCR test');await page.click('#svOk');await page.waitForTimeout(600);
await page.click('#svGo');await page.waitForTimeout(1200);await page.selectOption('#roleSel','karim');await page.waitForTimeout(300);
const C={};
// ── 1) aucun onglet Pointage / Profil dans le chantier, interrupteurs allumés ou pas
let out=await page.evaluate(()=>({pt:!!document.querySelector('#tabbar [data-tab="pointage"]'),pr:!!document.querySelector('#tabbar [data-tab="profil"]'),flags:localStorage.getItem('trace:next'),all:[...document.querySelectorAll('#tabbar [data-tab]')].map(b=>b.dataset.tab)}));
console.log('1) plus d\'onglets Pointage / Profil :',JSON.stringify(out));
C.c1=!out.pt&&!out.pr&&/pointage/.test(out.flags||'')&&out.all.includes('bureau')&&out.all.includes('stock');
// ── 2) facettes (Ethan, chef : tous les onglets) : Vie du chantier (5 onglets) ; Technique avec Stock (6 onglets, pas de défilement, même sur téléphone)
await page.selectOption('#roleSel','ethan');await page.waitForTimeout(300);
const vis=()=>page.evaluate(()=>{const tb=document.getElementById('tabbar');return {tab:window.TRACE.state.tab,facet:(document.querySelector('#facets button.on')||{}).dataset?.facet,vis:[...tb.querySelectorAll('[data-tab]')].filter(b=>b.style.display!=='none'&&!b.classList.contains('fhide')).map(b=>b.dataset.tab),scroll:tb.scrollWidth>tb.clientWidth+2};});
await page.evaluate(()=>document.querySelector('#facets [data-facet=vie]').click());await page.waitForTimeout(300);out=await vis();
await page.evaluate(()=>document.querySelector('#facets [data-facet=tech]').click());await page.waitForTimeout(300);out.tech=await vis();
await page.setViewportSize({width:390,height:844});await page.waitForTimeout(300);out.phone=await vis();await page.setViewportSize({width:900,height:940});await page.waitForTimeout(200);
await page.evaluate(()=>document.querySelector('#tabbar [data-tab="stock"]').click());await page.waitForTimeout(300);out.stock=await vis();
console.log('2) facettes :',JSON.stringify(out));
C.c2=out.facet==='vie'&&out.vis.join()==='bureau,conv,admin,qse,export'&&out.tech.facet==='tech'&&out.tech.vis.join()==='bouclage,hydro,stock,fourniture,phasage,ts,points,__more' /* 13/10 : + Fourniture ; 20/10 (lot PA) : + 📍 Points */&&!out.tech.scroll&&!out.phone.scroll&&out.stock.tab==='stock'&&out.stock.facet==='tech';
// ── 3) « Nouveautés » : plus d'option pointage / profil (chef)
await page.evaluate(()=>{window.TRACE.showScreen('home');window.TRACE.state.homeTab='list';window.TRACE.renderHome();});await page.waitForTimeout(400);
out=await page.evaluate(()=>{const b=document.getElementById('nextBtn');if(!b)return {btn:false};b.click();const m=document.getElementById('modal');return {btn:true,txt:b.textContent,opts:document.querySelectorAll('#modal [data-nextf]').length,moved:/pointage → Moi/.test(m.textContent),backlog:document.querySelectorAll('#modal [style*=dashed]').length};});
await page.evaluate(()=>document.getElementById('modal').classList.remove('show'));
console.log('3) Nouveautés :',JSON.stringify(out));
C.c3=out.btn&&/à concevoir/.test(out.txt)&&out.opts===0&&out.moved&&out.backlog>=1;
// ── 4) le pointage vit dans Moi → Karim pointe « début » depuis l'accueil de son espace
await page.selectOption('#roleSel','karim');await page.waitForTimeout(200);
await page.evaluate(()=>{window.TRACE.renderHome();document.getElementById('htEspace').click();});await page.waitForTimeout(600);
out=await page.evaluate(()=>{const b=document.querySelector('#eq-app [data-act=pointer][data-v=start]');if(b)b.click();return {btn:!!b};});await page.waitForTimeout(900);
out.after=await page.evaluate(()=>({enCours:/Au travail/.test(document.getElementById('eq-app').textContent),toast:document.getElementById('toast').textContent}));
console.log('4) pointage dans Moi :',JSON.stringify(out));
C.c4=out.btn&&out.after.enCours&&/Pointage « début »/.test(out.after.toast);
const bad=Object.entries(C).filter(([k,v])=>!v).map(([k])=>k);console.log(bad.length?'RESULTAT: ECHEC '+bad.join(','):'RESULTAT: TOUT VERT');console.log(logs.length?logs:'[]');
await browser.close();
