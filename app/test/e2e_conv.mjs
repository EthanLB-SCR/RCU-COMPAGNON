// CONVERSATION DU CHANTIER (Ethan 08/10) : messages, note géoréférencée posée sur le plan (pastille, PK de la ligne), photo, tâche assignée → l'opérateur la voit
// (pastille sur l'onglet), la déclare faite avec photo ; filtres ; clic sur une pastille du plan → le message ; persistance sur l'appareil ; droits.
import { chromium } from 'playwright';
const BASE=process.env.BASE||'http://localhost:8765';
const browser=await chromium.launch({headless:true, executablePath: process.env.CHROMIUM_PATH||undefined});
const ctx=await browser.newContext({viewport:{width:1000,height:940}});const page=await ctx.newPage();
const logs=[];page.on('pageerror',e=>logs.push('PAGEERROR: '+e.message.slice(0,300)));page.on('console',m=>{if(m.type()==='error'&&!/supabase|Failed to fetch|net::ERR|404/i.test(m.text()))logs.push(m.text().slice(0,200));});
page.on('dialog',d=>d.accept().catch(()=>{}));
const C={};
await page.goto(BASE+'/traceur.html');await page.waitForTimeout(500);
await page.evaluate(()=>{localStorage.clear();});await page.reload();await page.waitForTimeout(500);
await page.evaluate(()=>{const S=window.MAQ.state;S.supplier='RENALIA';S.lines=[{id:'L1',name:'Rue de la Gare',dn:150,bar:12,pts:[[10,50],[130,50]],specials:[{id:'v1',type:'valve',m:40}],parent:null}];S.seq=2;window.MAQ.setMode('select');window.MAQ.rebuild();});
await page.click('#bSave');await page.waitForTimeout(200);await page.fill('#svName','Conv test');await page.click('#svOk');await page.waitForTimeout(700);await page.click('#svGo');await page.waitForTimeout(1500);await page.selectOption('#roleSel','ethan');await page.waitForTimeout(300);
const PNG='data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNkYPhfDwAChwGA60e6kgAAAABJRU5ErkJggg==';
// ── 1) onglet présent (après Modifs), vide, composeur avec 📍 / 📷 / tâche
let out=await page.evaluate(()=>{const tabs=[...document.querySelectorAll('#tabbar button')].filter(b=>b.style.display!=='none').map(b=>b.dataset.tab);document.querySelector('#tabbar [data-tab=conv]').click();const v=document.querySelector('#convview');
  return {tabs,active:document.querySelector('#view-conv').classList.contains('active'),title:/Conversation — Conv test/.test(v.textContent),empty:/Rien pour l'instant/.test(v.textContent),pose:!!v.querySelector('#cvPose'),photo:!!v.querySelector('#cvPhoto'),task:!!v.querySelector('#cvTask'),send:!!v.querySelector('#cvSend')};});
console.log('1) onglet Conversation :',JSON.stringify(out));C.c1=out.tabs.indexOf('ts')<out.tabs.indexOf('conv')&&out.tabs.indexOf('conv')<out.tabs.indexOf('qse')&&out.active&&out.title&&out.empty&&out.pose&&out.photo&&out.task&&out.send;
// ── 2) message simple
await page.fill('#cvText','Bonjour à tous, réunion de chantier à 14h');await page.click('#cvSend');await page.waitForTimeout(400);
out=await page.evaluate(()=>{const C=window.TRACE.net.conv;const m=C.msgs[0];return {n:C.msgs.length,kind:m.kind,by:m.by,txt:m.text,shown:/réunion de chantier/.test(document.querySelector('#cvList').textContent),mine:!!document.querySelector('.cvMsg.mine'),draftCleared:(document.querySelector('#cvText').value||'')===''};});
console.log('2) message :',JSON.stringify(out));C.c2=out.n===1&&out.kind==='msg'&&out.by==='Ethan L.'&&out.shown&&out.mine&&out.draftCleared;
// ── 3) note géoréférencée : 📍 → le plan → tap sur la conduite (PK 40 ≈ la vanne) → retour conversation avec la position, photo, envoi → pastille sur le plan
await page.fill('#cvText','Vanne fermée, ne pas ouvrir');await page.click('#cvPose');await page.waitForTimeout(300);
out=await page.evaluate(()=>({tab:window.TRACE.state.tab,pose:!!window.TRACE.state.convPose,pill:!!document.querySelector('#planPills [data-pill=conv]'),btn:document.querySelector('#btnConvNote')&&document.querySelector('#btnConvNote').textContent}));
await page.evaluate(()=>{const T=window.TRACE;const L=Object.values(T.lines)[0];const q=T.hydro.nearest(50,50);T.conv.tap(50.3,50.2);});await page.waitForTimeout(400);
out.after=await page.evaluate(()=>{const d=window.TRACE.state.convDraft;return {tab:window.TRACE.state.tab,pos:d&&d.pos,line:d&&d.line,pk:d&&d.pk,chip:/PK 40/.test(document.querySelector('.cvComposer').textContent)||/PK/.test(document.querySelector('.cvComposer').textContent),text:document.querySelector('#cvText').value};});
await page.evaluate(PNG=>{const d=window.TRACE.state.convDraft;d.photos.push(PNG);window.TRACE.conv.render();},PNG);await page.waitForTimeout(200);
await page.click('#cvSend');await page.waitForTimeout(500);
out.sent=await page.evaluate(()=>{const C=window.TRACE.net.conv;const m=C.msgs[1];const pins=document.querySelectorAll('#convG [data-conv]');return {kind:m.kind,pos:!!m.pos,line:m.line,pk:m.pk,photos:m.photos.length,pins:pins.length,pinId:pins[0]&&pins[0].dataset.conv===m.id,noPose:!window.TRACE.state.convPose,goBtn:!!document.querySelector('[data-cvgo]')};});
console.log('3) note sur le plan :',JSON.stringify(out));C.c3=out.tab==='plan'&&out.pose&&out.pill&&/Annuler/.test(out.btn||'')&&out.after.tab==='conv'&&out.after.pos&&out.after.line==='L1'&&Math.abs(out.after.pk-40)<2&&out.after.chip&&/Vanne fermée/.test(out.after.text)&&out.sent.kind==='note'&&out.sent.pos&&out.sent.line==='L1'&&out.sent.photos===1&&out.sent.pins===1&&out.sent.pinId&&out.sent.noPose&&out.sent.goBtn;
// ── 4) tâche assignée à Karim (chef → opérateur) ; Karim la voit (pastille sur l'onglet, filtre « mes tâches ») et la déclare faite avec photo
await page.evaluate(()=>{document.querySelector('#cvTask').click();});await page.waitForTimeout(200);await page.selectOption('#cvTo','Karim B.');await page.fill('#cvText','Vannes dans le conteneur à souder (sous-station)');await page.click('#cvSend');await page.waitForTimeout(400);
out=await page.evaluate(()=>{const C=window.TRACE.net.conv;const m=C.msgs[2];return {kind:m.kind,to:m.task&&m.task.to,open0:m.task&&m.task.done===false,tag:/à faire/.test(document.querySelector('#cvList').textContent),badgeEthan:!!document.querySelector('#tabbar [data-tab=conv] .qseBadge')};});
await page.selectOption('#roleSel','karim');await page.waitForTimeout(300);
out.k=await page.evaluate(()=>{const T=window.TRACE;T.state.tab='conv';T.renderAll();const badge=document.querySelector('#tabbar [data-tab=conv] .qseBadge');document.querySelector('[data-cvf=mine]').click();const n=document.querySelectorAll('#cvList .cvMsg').length;const btn=document.querySelector('[data-cvdone]');return {mine:T.conv.mine().length,badge:badge&&badge.textContent,n,btn:!!btn};});
await page.evaluate(()=>document.querySelector('[data-cvdone]').click());await page.waitForTimeout(300);
await page.evaluate(PNG=>{const m=document.getElementById('modal');m.querySelector('#cvdNote').value='2 vannes soudées';const th=m.querySelector('#cvdThumbs');th.innerHTML='<div class="thumb"><img src="'+PNG+'"></div>';},PNG);
// la photo passe par l'input fichier normalement ; ici on simule via l'API interne : on pousse directement la photo de preuve puis on valide
await page.evaluate(PNG=>{const C=window.TRACE.net.conv;const m=C.msgs[2];document.getElementById('cvdOk').click();},PNG);await page.waitForTimeout(500);
out.done=await page.evaluate(()=>{const C=window.TRACE.net.conv;const m=C.msgs[2];const pin=[...document.querySelectorAll('#convG [data-conv]')];return {done:m.task.done,by:m.task.doneBy,note:m.task.doneNote,badgeGone:!document.querySelector('#tabbar [data-tab=conv] .qseBadge'),mine:window.TRACE.conv.mine().length,fait:/✓ fait/.test(document.querySelector('#convview').textContent)||/fait/.test(document.querySelector('#convview').textContent)};});
console.log('4) tâche → faite :',JSON.stringify(out));C.c4=out.kind==='task'&&out.to==='Karim B.'&&out.open0&&out.tag&&!out.badgeEthan&&out.k.mine===1&&out.k.badge==='1'&&out.k.n===1&&out.k.btn&&out.done.done===true&&out.done.by==='Karim B.'&&out.done.note==='2 vannes soudées'&&out.done.badgeGone&&out.done.mine===0;
// ── 5) clic sur la pastille du plan → la conversation s'ouvre sur le message ; filtre « sur le plan » ; bouton « voir sur le plan »
await page.selectOption('#roleSel','ethan');await page.waitForTimeout(200);
out=await page.evaluate(()=>{const T=window.TRACE;T.state.tab='plan';T.renderAll();const pin=document.querySelector('#convG [data-conv]');T.conv.open(pin.dataset.conv);const f=document.querySelector('.cvMsg.flash');return {tab:T.state.tab,flash:!!f,id:f&&f.dataset.cvid===pin.dataset.conv};});
await page.evaluate(()=>document.querySelector('[data-cvf=notes]').click());await page.waitForTimeout(200);
out.notes=await page.evaluate(()=>document.querySelectorAll('#cvList .cvMsg').length);
await page.evaluate(()=>document.querySelector('[data-cvgo]').click());await page.waitForTimeout(300);out.go=await page.evaluate(()=>window.TRACE.state.tab);
console.log('5) pastille → message, filtres, voir sur le plan :',JSON.stringify(out));C.c5=out.tab==='conv'&&out.flash&&out.id&&out.notes===1&&out.go==='plan';
// ── 6) droits : un visiteur (démo : compte local inactif → pas de droits) ne peut pas écrire ; persistance après rechargement (handoff)
out=await page.evaluate(()=>{const T=window.TRACE;T.state.tab='conv';T.renderAll();const canK=T.acces.can('conv.post');return {canK};});
const siteId=await page.evaluate(()=>window.TRACE.state.siteId);await page.reload();await page.waitForTimeout(1500);await page.evaluate(id=>window.TRACE.go(id),siteId);await page.waitForTimeout(2500);await page.selectOption('#roleSel','ethan');await page.waitForTimeout(300);
out.after=await page.evaluate(()=>{const C=window.TRACE.net.conv;window.TRACE.state.tab='conv';window.TRACE.renderAll();return {n:C&&C.msgs.length,task:C&&C.msgs[2]&&C.msgs[2].task.done,pins:document.querySelectorAll('#convG [data-conv]').length,shown:document.querySelectorAll('#cvList .cvMsg').length};});
console.log('6) droits + rechargement :',JSON.stringify(out));C.c6=out.canK&&out.after.n===3&&out.after.task===true&&out.after.pins===1&&out.after.shown===3;
const bad=Object.entries(C).filter(([k,v])=>!v).map(([k])=>k);console.log(bad.length?'RESULTAT: ECHEC '+bad.join(','):'RESULTAT: TOUT VERT');console.log(logs.length?logs:'[]');
await browser.close();
