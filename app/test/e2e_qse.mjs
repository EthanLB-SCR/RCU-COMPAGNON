// QSE DÉFINITIF (Ethan 07/10) : onglet toujours là (plus d'interrupteur), PDF déposé = à émarger par tous → pastille rouge sur l'onglet + bandeau,
// « j'ai lu — j'émarge » pré-rempli au nom de l'utilisateur, badge disparaît une fois signé ; obligation levée par le chef = plus compté ; quart d'heure facultatif.
import { chromium } from 'playwright';
const BASE=process.env.BASE||'http://localhost:8765';
const browser=await chromium.launch({headless:true, executablePath: process.env.CHROMIUM_PATH||undefined});
const ctx=await browser.newContext({viewport:{width:900,height:940}});const page=await ctx.newPage();
const logs=[];page.on('pageerror',e=>logs.push('PAGEERROR: '+e.message.slice(0,300)));page.on('console',m=>{if(m.type()==='error'&&!/supabase|Failed to fetch|net::ERR|404/i.test(m.text()))logs.push(m.text().slice(0,200));});
page.on('dialog',d=>d.accept().catch(()=>{}));
await page.goto(BASE+'/traceur.html');await page.waitForTimeout(500);
await page.evaluate(()=>{localStorage.clear();});await page.reload();await page.waitForTimeout(500);
await page.evaluate(()=>{const S=window.MAQ.state;S.supplier='RENALIA';S.lines=[{id:'L1',name:'Feeder',dn:100,bar:12,pts:[[10,50],[60,50]],specials:[],parent:null}];S.seq=2;window.MAQ.setMode('select');window.MAQ.rebuild();});
await page.click('#bSave');await page.waitForTimeout(200);await page.fill('#svName','QSE test');await page.click('#svOk');await page.waitForTimeout(600);
await page.click('#svGo');await page.waitForTimeout(1200);await page.selectOption('#roleSel','ethan');await page.waitForTimeout(300);
// ── 1) onglet QSE présent sans drapeau, vide, pas de pastille
let out=await page.evaluate(()=>({tab:!!document.querySelector('#tabbar [data-tab="qse"]'),flag:!!(JSON.parse(localStorage.getItem('trace:next')||'{}').qse),badge:!!document.querySelector('#tabbar .qseBadge'),todo:window.TRACE.qseTodo().length}));
console.log('1) onglet QSE définitif, sans pastille:',JSON.stringify(out));const c1=out.tab&&!out.flag&&!out.badge&&out.todo===0;
// ── 2) le chef dépose un PDF (simulé : doc type pdf dans NET.qse) → à émarger par tous → pastille rouge « 1 », bandeau dans l'onglet
await page.evaluate(()=>{const T=window.TRACE;T.net.qse={docs:[{id:'Q1',type:'pdf',title:'Flash info sécurité tranchées',by:'Ethan L.',at:new Date().toISOString(),sigs:[]},{id:'Q2',type:'quart',title:'Quart d\'heure du jour',by:'Ethan L.',at:new Date().toISOString(),sigs:[]}]};document.querySelector('#tabbar [data-tab="qse"]').click();});await page.waitForTimeout(400);
out=await page.evaluate(()=>{const b=document.querySelector('#tabbar .qseBadge');const t=document.querySelector('#qse').textContent;return {badge:b&&b.textContent,red:document.querySelector('#tabbar [data-tab="qse"]').style.color!=='',banner:/il te reste 1 document à émarger/.test(t),btn:!!document.querySelector('#qse [data-qsignme="Q1"]'),quartFac:/facultatif/.test(t),todo:window.TRACE.qseTodo().map(d=>d.id)};});
console.log('2) PDF déposé → pastille rouge + bandeau « à émarger », quart d\'heure facultatif:',JSON.stringify(out));const c2=out.badge==='1'&&out.red&&out.banner&&out.btn&&out.quartFac&&out.todo.join()==='Q1';
// ── 3) « j'ai lu — j'émarge » : nom pré-rempli (Ethan L.), trait au doigt, validation → émargé, pastille disparue
await page.evaluate(()=>document.querySelector('#qse [data-qsignme="Q1"]').click());await page.waitForTimeout(300);
out=await page.evaluate(()=>({name:(document.querySelector('#sig-name')||{}).value,pad:!!document.querySelector('#sig-pad')}));
console.log('3a) fenêtre d\'émargement pré-remplie:',JSON.stringify(out));const c3a=out.name==='Ethan L.'&&out.pad;
const pad=await page.$('#sig-pad');const bb=await pad.boundingBox();await page.mouse.move(bb.x+40,bb.y+60);await page.mouse.down();await page.mouse.move(bb.x+160,bb.y+90,{steps:8});await page.mouse.move(bb.x+260,bb.y+50,{steps:8});await page.mouse.up();await page.waitForTimeout(100);
await page.evaluate(()=>document.querySelector('#sig-ok').click());await page.waitForTimeout(500);
out=await page.evaluate(()=>{const T=window.TRACE;const d=T.net.qse.docs[0];return {sigs:d.sigs.length,name:d.sigs[0]&&d.sigs[0].name,img:!!(d.sigs[0]&&d.sigs[0].img),badge:!!document.querySelector('#tabbar .qseBadge'),todo:T.qseTodo().length,ok:/tout est émargé/.test(document.querySelector('#qse').textContent)};});
console.log('3b) émargé → pastille disparue, bandeau vert:',JSON.stringify(out));const c3b=out.sigs===1&&out.name==='Ethan L.'&&out.img&&!out.badge&&out.todo===0&&out.ok;
// ── 4) un autre utilisateur (Karim) ouvre le chantier → pour lui c'est à émarger (pastille), toast d'ouverture
await page.evaluate(()=>window.TRACE.closeSheet());await page.selectOption('#roleSel','karim');await page.waitForTimeout(400);
out=await page.evaluate(()=>({badge:(document.querySelector('#tabbar .qseBadge')||{}).textContent,todo:window.TRACE.qseTodo().length,banner:/Karim B., il te reste 1 document/.test(document.querySelector('#qse').textContent)}));
console.log('4) autre utilisateur → à émarger pour lui:',JSON.stringify(out));const c4=out.badge==='1'&&out.todo===1&&out.banner;
// ── 5) le chef lève l'obligation sur ce PDF → plus compté
await page.selectOption('#roleSel','ethan');await page.waitForTimeout(300);
await page.evaluate(()=>{window.TRACE.net.qse.docs[0].required=false;document.querySelector('#tabbar [data-tab="qse"]').click();});await page.waitForTimeout(300);
await page.selectOption('#roleSel','karim');await page.waitForTimeout(300);
out=await page.evaluate(()=>({badge:!!document.querySelector('#tabbar .qseBadge'),todo:window.TRACE.qseTodo().length}));
console.log('5) obligation levée par le chef → plus de pastille pour Karim:',JSON.stringify(out));const c5=!out.badge&&out.todo===0;
// ── 6) accueil chantier créé par le chef = obligatoire pour tous
await page.selectOption('#roleSel','ethan');await page.waitForTimeout(300);
await page.evaluate(()=>{document.querySelector('#tabbar [data-tab="qse"]').click();});await page.waitForTimeout(300);
await page.evaluate(()=>document.querySelector('#qse [data-qnew="accueil"]').click());await page.waitForTimeout(400);
await page.evaluate(()=>{const m=document.querySelector('#modal [data-close]');if(m)m.click();});await page.waitForTimeout(200);
out=await page.evaluate(()=>({n:window.TRACE.net.qse.docs.length,todo:window.TRACE.qseTodo().map(d=>d.type),badge:(document.querySelector('#tabbar .qseBadge')||{}).textContent}));
console.log('6) accueil chantier → obligatoire (à émarger par le chef aussi):',JSON.stringify(out));const c6=out.n===3&&out.todo.join()==='accueil'&&out.badge==='1';
const ALL=c1&&c2&&c3a&&c3b&&c4&&c5&&c6;
console.log('RESULTAT:',ALL?'TOUT VERT':'ECHEC '+JSON.stringify({c1,c2,c3a,c3b,c4,c5,c6}));
console.log(logs.length?logs:'[]');
await browser.close();process.exit(ALL?0:1);
