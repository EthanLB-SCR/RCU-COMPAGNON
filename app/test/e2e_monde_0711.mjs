// MONDE 3D (nuit du 06 au 07/11/2026, Labo) : option ÉTEINTE par défaut → rien ne change ; allumée pour un testeur sur PC → accueil « mon bureau » 3D (mêmes
// notifications, mêmes data-act), vue classique à un clic, bureau personnalisable ; Équipe = carte de France → dépôt → bureau d'un collègue ; Pilotage = chantiers ;
// Commerce = salle d'attente (attente d'une affaire enregistrée) ; Bureau du chantier = réseau raccordé (un bâtiment = un sujet) ; glisser / zoomer la vue ;
// au téléphone rien ne change ; réglages administrateur (allumer / éteindre). Données fictives uniquement.
import { chromium } from 'playwright';
const BASE=process.env.BASE||'http://localhost:8765';const J=x=>JSON.stringify(x);
const browser=await chromium.launch({headless:true, executablePath: process.env.CHROMIUM_PATH||undefined});
const ctx=await browser.newContext({viewport:{width:1366,height:900}});const page=await ctx.newPage();
const logs=[];page.on('pageerror',e=>logs.push('PAGEERROR: '+e.message.slice(0,300)));page.on('console',m=>{if(m.type()==='error'&&!/supabase|Failed to fetch|net::ERR|404|WebSocket/i.test(m.text()))logs.push(m.text().slice(0,200));});
page.on('dialog',d=>d.accept().catch(()=>{}));const C={};const W=ms=>page.waitForTimeout(ms);
await page.clock.install({time:new Date(2026,10,6,9,0,0)}); /* vendredi 06/11/2026 */
await page.goto(BASE+'/index.html');await W(600);await page.evaluate(()=>{localStorage.clear();localStorage.setItem('trace:wide','1');}); /* PC en « Affichage large » */await page.evaluate(()=>new Promise(r=>{try{const q=indexedDB.deleteDatabase('trace-kv');q.onsuccess=q.onerror=q.onblocked=()=>r();}catch(e){r();}}));
await page.reload();await W(1200);{const s=await page.$('#loginSkip');if(s&&await s.isVisible())await s.click();await W(700);}
await page.evaluate(()=>{const T=window.TRACE;T.state.userId='ethan';T.renderHome();});await W(500);
const home=async id=>{await page.evaluate(i=>{const b=document.getElementById(i);if(b)b.click();},id);await W(450);};
const q=async()=>page.evaluate(()=>({card:!!document.querySelector('#eq-app .m3d-card'),acc:!!document.querySelector('#eq-app .m3d-acc'),eq:!!document.querySelector('#eq-app .m3d-eq'),pil:!!document.querySelector('#eq-app .m3d-pil'),com:!!document.querySelector('#eq-app .m3d-com'),classic:!!document.querySelector('#eq-app .ac-hi')}));
// ── m0) option éteinte : rien de nouveau (accueil, Équipe, Pilotage) ; l'administrateur voit la ligne de réglage dans Équipe
await home('htHome');const o0a=await q();await home('htEnt');const o0b=await q();const row=await page.evaluate(()=>!![...document.querySelectorAll('#eq-app .ac-row')].find(x=>/Monde 3D/.test(x.textContent)));await home('htExpl');const o0c=await q();
console.log('m0) éteint :',J({o0a,o0b,o0c,row}));C.m0=!o0a.card&&o0a.classic&&!o0b.card&&!o0c.card&&row;
// ── m1) allumé pour Ethan (testeur), dépôts fictifs → accueil « mon bureau » 3D : mêmes notifications que la liste
await page.evaluate(()=>{localStorage.setItem('trace:monde',JSON.stringify({v:1,on:true,testeurs:['ethan','l:ethan'],depots:{ouest:{nom:'Dépôt A',ville:'Ville A',lat:47.5,lon:0.5},idf:{nom:'Dépôt B',ville:'Ville B',lat:45.5,lon:3.5}},magasin:'ouest'}));location.reload();});await W(1500);
{const s=await page.$('#loginSkip');if(s&&await s.isVisible())await s.click();await W(600);}await page.evaluate(()=>{const T=window.TRACE;T.state.userId='ethan';T.renderHome();});await W(500);await home('htHome');
/* secteurs fictifs : la moitié des personnes au secteur « ouest » (dépôt A) */
await page.evaluate(()=>{const c=window.TRACE.monde.ctx();c.people.forEach((p,i)=>{if(i%2===0)c.savePart(p.id,'secteur','ouest');});c.render();});await W(400);
const o1=await page.evaluate(()=>{const vp=document.querySelector('#eq-app .m3d-acc .m3d-vp');const notes=vp?[...vp.querySelectorAll('[data-act="notif"]')].map(x=>x.dataset.v):[];const list=[...document.querySelectorAll('#eq-app .m3d-acc .m3d-side [data-act="notif"]')].map(x=>x.dataset.v);
  return {vp:!!vp,notes,list,tabgo:vp?vp.querySelectorAll('[data-act="tabgo"]').length:0,acc:vp?vp.querySelectorAll('[data-act="accnew"]').length:0,espaces:!!document.querySelector('#eq-app .ac-spaces'),accBtn:!!document.querySelector('#eq-app button[data-act="accnew"].btn')};});
console.log('m1) mon bureau :',J(o1));C.m1=o1.vp&&o1.list.length>0&&o1.notes.length>0&&o1.notes.every(v=>o1.list.includes(v))&&o1.tabgo>0&&o1.acc===1&&o1.espaces&&o1.accBtn;
// ── m2) vue classique / retour en 3D
await page.click('#eq-app [data-v="monde|vue|acc|classique"]');await W(400);const o2a=await q();const back=await page.$('#eq-app [data-v="monde|vue|acc|3d"]');if(back)await back.click();await W(400);const o2b=await q();
console.log('m2) classique puis 3D :',J({o2a,back:!!back,o2b}));C.m2=!o2a.acc&&o2a.classic&&!!back&&o2b.acc;
// ── m3) personnaliser : bureau couleur Nuit + trophée → gardé (fiche de la personne, partie avatar.bureau)
await page.click('#eq-app [data-v="monde|perso|1"]');await W(300);await page.click('#eq-app [data-v="monde|pd|nuit"]');await W(300);await page.click('#eq-app [data-v="monde|po|trophee"]');await W(300);
const o3=await page.evaluate(()=>{const h=document.querySelector('#eq-app .m3d-acc .m3d-vp').innerHTML;return {nuit:h.includes('#4C3A9A'),trophee:h.includes('#E8C98E'),panel:!!document.querySelector('#eq-app [data-v="monde|perso|0"]')};});
console.log('m3) personnalisé :',J(o3));C.m3=o3.nuit&&o3.trophee&&o3.panel;
// ── m4) Équipe : carte de France (2 dépôts placés) → entrer dans le dépôt A → bureau d'un collègue
await home('htEnt');const o4a=await page.evaluate(()=>{const vp=document.querySelector('#eq-app .m3d-eq .m3d-vp');return {scene:(document.querySelector('#eq-app .m3d-eq')||{}).dataset?.m3dscene,dep:vp?vp.querySelectorAll('[data-v^="monde|go|depot:"]').length:0};});
await page.evaluate(()=>{document.querySelector('#eq-app .m3d-eq .m3d-vp [data-v="monde|go|depot:ouest"]').dispatchEvent(new MouseEvent('click',{bubbles:true}));});await W(450);
const o4b=await page.evaluate(()=>{const c=document.querySelector('#eq-app .m3d-eq');const vp=c&&c.querySelector('.m3d-vp');return {scene:c&&c.dataset.m3dscene,people:vp?vp.querySelectorAll('[data-v^="monde|selp|"]').length:0,firstDesk:(()=>{const x=[...document.querySelectorAll('#eq-app .m3d-side [data-v^="monde|selp|"]')][0];return x?x.dataset.v:null;})()};});
let o4c=null;if(o4b.firstDesk){await page.click(`#eq-app .m3d-side [data-v="${o4b.firstDesk}"]`);await W(350);const b=await page.$('#eq-app .m3d-side [data-v^="monde|go|bureau:"]');if(b){await b.click();await W(400);}o4c=await page.evaluate(()=>({scene:(document.querySelector('#eq-app .m3d-eq')||{}).dataset?.m3dscene,notes:document.querySelectorAll('#eq-app .m3d-eq .m3d-vp [data-act="notif"]').length}));}
console.log('m4) monde :',J({o4a,o4b,o4c}));C.m4=o4a.scene==='france'&&o4a.dep===2&&o4b.scene==='depot'&&o4b.people>0&&(!o4c||(o4c.scene==='bureau'||o4c.scene==='depot')&&o4c.notes===0);
// ── m5) glisser / zoomer : la caméra bouge, un glisser n'ouvre rien
await page.click('#eq-app [data-v="monde|go|france"]');await W(350);
const vpBox=await page.evaluate(()=>{const r=document.querySelector('#eq-app .m3d-eq .m3d-vp').getBoundingClientRect();return {x:r.left+r.width/2,y:r.top+r.height/2};});
const t0=await page.evaluate(()=>document.querySelector('#eq-app .m3d-eq .m3d-cam').getAttribute('transform'));
await page.mouse.move(vpBox.x,vpBox.y);await page.mouse.down();await page.mouse.move(vpBox.x+120,vpBox.y+40,{steps:6});await page.mouse.up();await W(200);
const t1=await page.evaluate(()=>document.querySelector('#eq-app .m3d-eq .m3d-cam').getAttribute('transform'));const sc1=await page.evaluate(()=>(document.querySelector('#eq-app .m3d-eq')||{}).dataset?.m3dscene);
await page.mouse.wheel(0,-300);await W(200);const t2=await page.evaluate(()=>document.querySelector('#eq-app .m3d-eq .m3d-cam').getAttribute('transform'));
console.log('m5) caméra :',J({t0,t1,t2,sc1}));C.m5=t0!==t1&&t1!==t2&&/scale\(1\.1/.test(t2)&&sc1==='france';
// ── m6) Pilotage : les chantiers du secteur
await home('htExpl');const o6=await page.evaluate(()=>({pil:!!document.querySelector('#eq-app .m3d-pil'),tiles:document.querySelectorAll('#eq-app .m3d-pil .m3d-vp [data-v^="monde|pilsel|"]').length,hub:!!document.querySelector('#eq-app h2.vt')}));
console.log('m6) pilotage :',J(o6));C.m6=o6.pil&&o6.tiles>0&&o6.hub;
// ── m7) Commerce : salle d'attente ; « Attente client » enregistrée sur l'affaire
await page.evaluate(()=>{const A=window.TRACE.affaires;A.set('ZT-1',{num:'ZT-1',nom:'Réseau Test A',client:'Client test',etat:'devis'});A.set('ZT-2',{num:'ZT-2',nom:'Réseau Test B',client:'Client test',etat:'preconsult',attente:{de:'fournisseur',rel:'2026-11-02',note:'prix'}});});await W(200);
await home('htCom');let o7a=await page.evaluate(()=>({com:!!document.querySelector('#eq-app .m3d-com'),work:document.querySelectorAll('#eq-app .m3d-com .m3d-vp [data-v="monde|selaff|ZT-1"]').length,wait:document.querySelectorAll('#eq-app .m3d-com .m3d-vp [data-v="monde|selaff|ZT-2"]').length,late:/relance/.test((document.querySelector('#eq-app .m3d-com .m3d-top')||{}).textContent||'')}));
await page.click('#eq-app .m3d-com .m3d-side [data-v="monde|selaff|ZT-1"]');await W(300);await page.click('#eq-app [data-v="monde|att|ZT-1|client"]');await W(300);
const o7b=await page.evaluate(()=>{const a=window.TRACE.affaires.get('ZT-1');return {de:a&&a.attente&&a.attente.de,rel:a&&a.attente&&a.attente.rel,open:!!document.querySelector('#eq-app [data-act="af"][data-v="open|ZT-1"]')};});
console.log('m7) commerce :',J({o7a,o7b}));C.m7=o7a.com&&o7a.work>0&&o7a.wait>0&&o7a.late&&o7b.de==='client'&&/^2026-11-\d\d$/.test(o7b.rel||'')&&o7b.open;
// ── m8) Bureau du chantier : réseau raccordé (un bâtiment par sujet de la checklist) ; toucher un bâtiment ouvre son onglet
await page.evaluate(async()=>{await window.TRACE.go();});await W(1200);await page.evaluate(()=>{const T=window.TRACE;T.state.tab='bureau';T.renderAll();});await W(600);
const o8=await page.evaluate(()=>{const r=document.querySelector('#bureau .m3d-rac');const b=r?[...r.querySelectorAll('g.m3d-hit[data-bur][role="button"]')]:[];const tiles=document.querySelectorAll('#bureau .ac-kgrid .ac-dk').length;return {rac:!!r,n:b.length,tiles,first:b[0]?b[0].dataset.bur:null};});
let o8b=null;if(o8.first&&!o8.first.startsWith('__')){await page.evaluate(()=>{const b=document.querySelector('#bureau .m3d-rac g.m3d-hit[data-bur][role="button"]');b.dispatchEvent(new MouseEvent('click',{bubbles:true}));});await W(500);o8b=await page.evaluate(()=>window.TRACE.state.tab);}
console.log('m8) raccordé :',J({o8,o8b}));C.m8=o8.rac&&o8.n>=3&&(o8.tiles===0||o8.n<=o8.tiles)&&(o8b===null||o8b===o8.first);
// ── m9) réglages : éteindre → l'accueil redevient classique
await page.evaluate(()=>{window.TRACE.showScreen('home');window.TRACE.renderHome();});await W(400);await home('htEnt');
const rr=await page.$('#eq-app .ac-row[data-v="x:monde:cfg"]');if(rr){await rr.click();await W(400);}const cfg=await page.evaluate(()=>!!document.querySelector('#eq-app [data-v="monde|on|0"]'));
if(cfg){await page.click('#eq-app [data-v="monde|on|0"]');await W(500);}await home('htHome');const o9=await q();
console.log('m9) éteint par l\'administrateur :',J({row:!!rr,cfg,o9}));C.m9=!!rr&&cfg&&!o9.card&&o9.classic;
// ── m10) téléphone : rallumé, mais écran étroit → rien ne change
await page.evaluate(()=>{const c=JSON.parse(localStorage.getItem('trace:monde'));c.on=true;localStorage.setItem('trace:monde',JSON.stringify(c));});await page.setViewportSize({width:430,height:900});await W(300);
await page.evaluate(()=>{location.reload();});await W(1500);{const s=await page.$('#loginSkip');if(s&&await s.isVisible())await s.click();await W(600);}await page.evaluate(()=>{const T=window.TRACE;T.state.userId='ethan';T.renderHome();});await W(500);await home('htHome');const o10=await q();
console.log('m10) téléphone :',J(o10));C.m10=!o10.card&&o10.classic;
C.m11=logs.length===0;if(logs.length)console.log('console :',logs.slice(0,6));
console.log('RESULTAT',J(C),Object.values(C).every(Boolean)?'TOUT VERT':'ÉCHEC');await browser.close();
