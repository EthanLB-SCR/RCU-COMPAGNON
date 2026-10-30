// e2e_rf_3010.mjs — 30/10 (lot 2910f). Ethan (chantier de Caen) : « possible de m'enlever les centaines de choses pointées comme modif alors que c'est mon tracé de base ? »
// Le marché d'un chantier est figé au PREMIER enregistrement du traceur ; si on continue à tracer, tout ce qui suit est une « modif ». « 🔒 Re-figer le marché… » propose :
//  c1  onglet Modifs : l'avertissement « marché figé au premier enregistrement… » quand il y a des éléments et aucune modif ; le bouton ouvre une fenêtre à deux choix
//  c2  « C'est mon tracé de base » : marché re-figé sur le tracé actuel (source traceur, base:true, ancien dans prev), 0 élément, modifs effacées (celle créée avant), onglet « rien n'a bougé »
//  c3  on retouche le tracé (vanne ajoutée) → 1 élément ; « Avenant » : 0 élément, source avenant, prev = 2 entrées, la modif créée entre-temps est GARDÉE
//  c4  console propre
import { chromium } from 'playwright';
const BASE=process.env.BASE||'http://localhost:8765';
const browser=await chromium.launch({headless:true, executablePath: process.env.CHROMIUM_PATH||undefined});
const C={};const logs=[];const J=x=>JSON.stringify(x);
const ctx=await browser.newContext({viewport:{width:1366,height:900},deviceScaleFactor:1});const page=await ctx.newPage();
page.on('pageerror',e=>logs.push('PAGEERROR: '+e.message.slice(0,300)));page.on('console',m=>{if(m.type()==='error'&&!/supabase|Failed to fetch|net::ERR|404|geopf|WebSocket/i.test(m.text()))logs.push(m.text().slice(0,200));});page.on('dialog',d=>d.accept().catch(()=>{}));
const wait=ms=>page.waitForTimeout(ms);
await page.goto(BASE+'/traceur.html');await wait(500);await page.evaluate(()=>localStorage.clear());await page.reload();await wait(500);
/* 1er enregistrement (le marché se fige) : une seule ligne */
await page.evaluate(()=>{const S=window.MAQ.state;S.lines=[{id:'L1',name:'Rue Principale',dn:150,bar:12,pts:[[0,0],[200,0]],specials:[],parent:null}];S.seq=2;window.MAQ.setMode('select');window.MAQ.rebuild();});
await page.click('#bSave');await wait(200);await page.fill('#svName','Caen test');await page.click('#svOk');await wait(800);
await page.click('#svGo');await wait(1500);await page.selectOption('#roleSel','ethan');await wait(300);
const siteId=await page.evaluate(()=>window.TRACE.state.siteId);
/* on continue à tracer : prolongement + 2 antennes + réduction → « modifs » alors que c'est le tracé de base */
await page.goto(BASE+'/traceur.html?site='+encodeURIComponent(siteId));await wait(1500);
await page.evaluate(()=>{const S=window.MAQ.state;const f=S.lines.find(l=>l.id==='L1');f.pts=[[0,0],[200,0],[200,120]];f.specials=[{id:'R1',type:'reducer',m:200,dn2:125}];
  S.lines.push({id:'L2',name:'Antenne A',dn:65,bar:12,pts:[[80,0],[80,60]],specials:[],parent:{line:'L1',m:80,side:1}},{id:'L3',name:'Antenne B',dn:80,bar:12,pts:[[200,60],[260,60]],specials:[],parent:{line:'L1',m:260,side:-1}});S.seq=5;window.MAQ.rebuild();});
await page.click('#bSave');await wait(200);await page.selectOption('#svMode','update');await page.click('#svOk');await wait(800);
await page.click('#svGo');await wait(1500);await page.selectOption('#roleSel','ethan');await wait(300);
const warn0=await page.evaluate(()=>{const T=window.TRACE;T.state.tab='ts';T.renderAll();return /figé au premier enregistrement/.test(document.getElementById('tsview').textContent);});
/* une modif créée sur ces faux écarts (comme Ethan a pu le faire) */
await page.evaluate(()=>{const T=window.TRACE;const E=T.mod.elements();T.mod.select(E.slice(0,2).map(e=>e.id));const C=T.mod.compare(E.slice(0,2).map(e=>e.id));C.forEach(r=>T.mod.setQual(r.key,'forfait'));});await wait(100);
const m1=await page.evaluate(()=>{const m=window.TRACE.mod.commit({nom:'Fausse modif de base',devis:''});return m&&m.n;});
await page.evaluate(()=>{const T=window.TRACE;T.mod.end();T.state.tab='ts';T.renderAll();});await wait(400);
let o=await page.evaluate(()=>{const T=window.TRACE;const M=T.ts.marche();const v=document.getElementById('tsview');return {n:T.mod.elements().length,modifs:T.mod.items().length,src:M.source,prev:(M.prev||[]).length,warn:/figé au premier enregistrement/.test(v.textContent),btn:!!v.querySelector('[data-tsrefreeze]'),btnTxt:(v.querySelector('[data-tsrefreeze]')||{}).textContent};});
await page.click('#tsview [data-tsrefreeze]');await wait(300);
o.modal=await page.evaluate(()=>{const m=document.getElementById('modal');return {show:m.classList.contains('show'),base:!!document.getElementById('tsRfBase'),av:!!document.getElementById('tsRfAv'),txt:(document.querySelector('#modal .hint')||{}).textContent||'',warnMod:/La modif déjà créée sera effacée/.test(m.textContent)};});
console.log('c1) avant :',J(o));
C.c1=o.n>=6&&o.modifs===1&&m1===1&&o.src==='traceur'&&o.prev===0&&warn0&&!o.warn&&o.btn&&/Re-figer le marché/.test(o.btnTxt)&&o.modal.show&&o.modal.base&&o.modal.av&&new RegExp(o.n+' éléments').test(o.modal.txt)&&o.modal.warnMod;
/* ── c2 : tracé de base */
await page.click('#tsRfBase');await wait(600);
o=await page.evaluate(()=>{const T=window.TRACE;const M=T.ts.marche();const v=document.getElementById('tsview');return {n:T.mod.elements().length,modifs:T.mod.items().length,Mo:T.mod.of(),src:M.source,base:!!M.base,prev:(M.prev||[]).length,lines:M.lines.length,modal:document.getElementById('modal').classList.contains('show'),txt:v.textContent.slice(0,400),badge:T.mod.badge()};});
console.log('c2) tracé de base :',J({...o,txt:o.txt.slice(0,160)}));
C.c2=o.n===0&&o.modifs===0&&o.Mo&&o.Mo.items.length===0&&Object.keys(o.Mo.seen||{}).length===0&&o.src==='traceur'&&o.base&&o.prev===1&&o.lines===3&&!o.modal&&/0 à attribuer|rien n'a bougé|0 modif/.test(o.txt)&&o.badge===0&&!/figé au premier enregistrement/.test(o.txt);
/* ── c3 : une vraie retouche puis avenant */
const kvM=await page.evaluate(id=>new Promise(res=>{const r=indexedDB.open('trace-kv',1);r.onsuccess=()=>{const t=r.result.transaction('kv','readonly');const q=t.objectStore('kv').get('trace:handoff:'+id);q.onsuccess=()=>{const v=q.result;res(v?{has:true,src:v.marche&&v.marche.source,base:!!(v.marche&&v.marche.base),lines:v.marche&&v.marche.lines.length,modifs:v.modifs?v.modifs.items.length:null}:{has:false});};q.onerror=()=>res({err:true});};r.onerror=()=>res({err:true});}),siteId);
console.log('   kv handoff après re-figer :',J(kvM));
await page.goto(BASE+'/traceur.html?site='+encodeURIComponent(siteId));await wait(1500);
const refM=await page.evaluate(()=>{const r=window.MAQ.state.siteRef;return r&&r.marche?{src:r.marche.source,base:!!r.marche.base,lines:r.marche.lines.length}:null;});console.log('   siteRef.marche au chargement du traceur :',J(refM));
await page.evaluate(()=>{const S=window.MAQ.state;const f=S.lines.find(l=>l.id==='L1');f.specials.push({id:'V1',type:'valve',m:40});window.MAQ.rebuild();});
await page.click('#bSave');await wait(200);await page.selectOption('#svMode','update');await page.click('#svOk');await wait(800);
await page.click('#svGo');await wait(1500);await page.selectOption('#roleSel','ethan');await wait(300);
await page.evaluate(()=>{const T=window.TRACE;const E=T.mod.elements();T.mod.select(E.map(e=>e.id));T.mod.compare(E.map(e=>e.id)).forEach(r=>T.mod.setQual(r.key,'commande'));});await wait(100);
const m2=await page.evaluate(()=>{const m=window.TRACE.mod.commit({nom:'Vanne ajoutée',devis:'DEV-CAEN-01'});return m&&{n:m.n,els:m.els.length};});
await page.evaluate(()=>{const T=window.TRACE;T.mod.end();T.state.tab='ts';T.renderAll();});await wait(300);
const before=await page.evaluate(()=>({n:window.TRACE.mod.elements().length,modifs:window.TRACE.mod.items().length,kinds:window.TRACE.mod.elements().map(e=>(e.s>0?'+':'−')+e.kind+(e.k?':'+e.k:'')+' '+e.lab.slice(0,40))}));
await page.click('#tsview [data-tsrefreeze]');await wait(300);await page.click('#tsRfAv');await wait(600);
o=await page.evaluate(()=>{const T=window.TRACE;const M=T.ts.marche();return {n:T.mod.elements().length,modifs:T.mod.items().length,src:M.source,base:!!M.base,prev:(M.prev||[]).length,card:/Vanne ajoutée/.test(document.getElementById('tsview').textContent),gone:/disparu/.test(document.getElementById('tsview').textContent)};});
console.log('c3) avenant :',J({before,m2,...o}));
C.c3=before.n===1&&before.modifs===1&&m2&&m2.n===1&&m2.els===1&&o.n===0&&o.modifs===1&&o.src==='avenant'&&!o.base&&o.prev===2&&o.card;
C.c4=!logs.length;if(logs.length)console.log('console :',logs);
console.log('RÉSULTATS',J(C));console.log('RESULTAT:',Object.values(C).every(Boolean)?'TOUT VERT':'ÉCHEC '+Object.keys(C).filter(k=>!C[k]).join(' '));await browser.close();process.exit(Object.values(C).every(Boolean)?0:1);
