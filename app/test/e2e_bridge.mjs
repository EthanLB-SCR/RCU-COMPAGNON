// Passerelle traceur → TRACÉ : on trace dans le traceur, on enregistre, l'appli affiche le chantier ; puis retour dans le traceur, retouche, ré-enregistrement avec numéros de soudure conservés.
// Prérequis : un serveur statique sur /tmp/site (index.html = appli, traceur.html = traceur) → BASE
import { chromium } from 'playwright';
const BASE=process.env.BASE||'http://localhost:8765';
const browser=await chromium.launch({headless:true, executablePath: process.env.CHROMIUM_PATH||undefined});
const ctx=await browser.newContext({viewport:{width:1400,height:900}});const page=await ctx.newPage();
const logs=[];page.on('pageerror',e=>logs.push('PAGEERROR: '+e.message.slice(0,300)));page.on('console',m=>{if(m.type()==='error'&&!/supabase|Failed to fetch|net::ERR/i.test(m.text()))logs.push(m.text().slice(0,200));});
await page.goto(BASE+'/traceur.html');await page.waitForTimeout(500);
await page.evaluate(()=>{localStorage.clear();});await page.reload();await page.waitForTimeout(500);
// 1) réseau : feeder DN100 avec réduction → DN65, antenne DN80 côté R, purge, vidange en bout, kit fin de ligne
await page.evaluate(()=>{const S=window.MAQ.state;S.lines=[{id:'L1',name:'Feeder',dn:100,bar:12,pts:[[10,50],[70,50],[70,80]],specials:[{id:'r1',type:'reducer',m:45,dn2:65},{id:'pv1',type:'tee',vert:'up',m:20},{id:'pv2',type:'tee',vert:'down',atEnd:true,m:0}],parent:null},{id:'L2',name:'A2',dn:80,bar:12,pts:[[40,50],[40,80]],specials:[],parent:{line:'L1',m:30,side:1}}];S.seq=3;window.MAQ.setMode('select');window.MAQ.rebuild();});
const nW0=await page.evaluate(()=>Object.values(window.MAQ.state.built).reduce((s,B)=>s+B.A.welds.length+B.R.welds.length,0));
// 2) enregistrer dans TRACÉ
await page.click('#bSave');await page.waitForTimeout(200);await page.fill('#svName','Chantier test passerelle');await page.click('#svOk');await page.waitForTimeout(800);
const handoff=await page.evaluate(()=>{const k=Object.keys(localStorage).find(k=>k.startsWith('trace:handoff:'));const s=JSON.parse(localStorage.getItem(k));return {k,id:s.id,name:s.name,lines:s.lines.length,welds:s.lines.reduce((n,L)=>n+L.cond.A.welds.length+L.cond.R.welds.length,0),elsA:s.lines[0].cond.A.els.slice(0,4).map(e=>e.id+'/'+e.kind+'/'+e.casing),firstIds:s.lines[1].cond.A.welds.slice(0,3).map(w=>w.weldId),sheet:s.sheetType,size:JSON.stringify(s).length};});
console.log('handoff:',JSON.stringify(handoff),'welds traceur:',nW0);
const siteId=handoff.id;
// 3) ouvrir dans TRACÉ
await page.click('#svGo');await page.waitForTimeout(1500);await page.selectOption('#roleSel','ethan');await page.waitForTimeout(300);
let out=await page.evaluate(()=>{const sel=document.querySelector('#siteSel');const opts=[...sel.options].map(o=>o.value+':'+o.textContent);const svg=document.querySelector('#net');const nEls=svg?svg.querySelectorAll('g.el').length:0;const tools=document.querySelector('#planTools')?document.querySelector('#planTools').textContent:'';return {selected:sel.value,opts,nEls,tools:tools.slice(0,160)};});
console.log('appli:',JSON.stringify(out));
// liste des soudures
await page.click('#btnList');await page.waitForTimeout(400);
out=await page.evaluate(()=>{const rows=[...document.querySelectorAll('#liste .wrow')];return {n:rows.length,first:rows.slice(0,3).map(r=>r.textContent.trim().slice(0,60)),h3:[...document.querySelectorAll('#liste h3')].map(h=>h.textContent).slice(0,4)};});
console.log('liste:',JSON.stringify(out));
await page.screenshot({path:new URL('./e2e_bridge_app.png',import.meta.url).pathname});
// ouvrir une fiche soudure (première ligne de la liste)
await page.click('#liste .wrow');await page.waitForTimeout(400);
out=await page.evaluate(()=>{const sh=document.querySelector('#sheet')||document.body;return (sh.textContent||'').replace(/\s+/g,' ').slice(0,220);});console.log('fiche:',out);
// 4) retour dans le traceur pour modifier : bouton du plan
await page.evaluate(()=>{const s=document.querySelector('#sheet');});
await page.goto(BASE+'/traceur.html?site='+siteId);await page.waitForTimeout(1200);
out=await page.evaluate(()=>{const S=window.MAQ.state;return {lines:S.lines.length,siteRef:S.siteRef&&S.siteRef.name,prevWelds:S.siteRef&&S.siteRef.welds.length,badge:document.querySelector('#siteBadge').textContent};});console.log('traceur rechargé:',JSON.stringify(out));
// retouche : une vanne à PK 12 sur le feeder → les soudures en amont gardent leur numéro, la vanne prend des numéros neufs
await page.evaluate(()=>{const S=window.MAQ.state;S.lines[0].specials.push({id:'v1',type:'valve',m:12});window.MAQ.rebuild();});
await page.click('#bSave');await page.waitForTimeout(200);const mode=await page.evaluate(()=>document.querySelector('#svMode')&&document.querySelector('#svMode').value);await page.click('#svOk');await page.waitForTimeout(800);
out=await page.evaluate(id=>{const s=JSON.parse(localStorage.getItem('trace:handoff:'+id));const A=s.lines[0].cond.A.welds;return {mode:null,name:s.name,welds:A.slice(0,8).map(w=>w.weldId+'@'+w.m.toFixed(1)),lost:s.report.lost};},siteId);out.mode=mode;console.log('après retouche:',JSON.stringify(out));
await page.click('#svGo');await page.waitForTimeout(1200);
out=await page.evaluate(()=>({selected:document.querySelector('#siteSel').value,n:document.querySelectorAll('#net g.el').length}));console.log('appli après retouche:',JSON.stringify(out));
// 5) suppression du chantier (chef de chantier)
await page.selectOption('#roleSel','ethan');await page.waitForTimeout(300);
page.on('dialog',d=>d.accept());await page.click('#btnDelSite');await page.waitForTimeout(800);
out=await page.evaluate(()=>({opts:[...document.querySelector('#siteSel').options].map(o=>o.textContent),handoffs:Object.keys(localStorage).filter(k=>k.startsWith('trace:handoff:')).length,hidden:localStorage.getItem('trace:hiddenSites')}));console.log('après suppression:',JSON.stringify(out));
console.log(logs);await browser.close();
