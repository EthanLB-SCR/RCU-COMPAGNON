// 10/11 — rappels des post-its côté APPLI : ligne « Rappel » dans À faire, post-it qui s'agite dans le bureau 3D, toast + notification quand l'heure arrive hors de la 3D.
import { chromium } from 'playwright';
const BASE=process.env.BASE||'http://localhost:8765';const J=x=>JSON.stringify(x);
const browser=await chromium.launch({headless:true,args:['--ignore-gpu-blocklist','--enable-unsafe-swiftshader']});
const ctx=await browser.newContext({viewport:{width:1366,height:900}});const page=await ctx.newPage();const C={};const W=ms=>page.waitForTimeout(ms);
const logs=[];page.on('pageerror',e=>logs.push('PAGEERROR: '+e.message.slice(0,300)));page.on('dialog',d=>d.accept().catch(()=>{}));
await page.clock.install({time:new Date(2026,10,6,9,0,0)});
await page.goto(BASE+'/index.html');await W(600);await page.evaluate(()=>{localStorage.clear();localStorage.setItem('trace:wide','1');});await page.evaluate(()=>new Promise(r=>{try{const q=indexedDB.deleteDatabase('trace-kv');q.onsuccess=q.onerror=q.onblocked=()=>r();}catch(e){r();}}));
await page.evaluate(()=>{localStorage.setItem('trace:monde',JSON.stringify({v:1,on:true,testeurs:['ethan','l:ethan'],depots:{ouest:{nom:'Dépôt A',ville:'Ville A',lat:47.5,lon:0.5}},magasin:'ouest'}));
  localStorage.setItem('trace:notes3d:l:ethan',JSON.stringify([{id:'na1',t:'Appeler le fournisseur\npour les manchons',c:0,d:'2026-11-05',r:'2026-11-06T08:30'},{id:'na2',t:'Relancer le devis chaufferie',c:1,d:'2026-11-05',r:'2026-11-06T10:00'},{id:'na3',t:'Déjà vu',c:2,d:'2026-11-05',r:'2026-11-06T07:00',rk:true}]));});
await page.reload();await W(1500);{const s=await page.$('#loginSkip');if(s&&await s.isVisible())await s.click();await W(700);}
const asEthan=async()=>{await page.evaluate(()=>{const T=window.TRACE;T.state.userId='ethan';T.renderHome();});await W(500);};await asEthan();
const home=async id=>{await page.evaluate(i=>{const b=document.getElementById(i);if(b)b.click();},id);await W(500);};
await home('htHome');await W(3000);
// a1) À faire : une ligne « Rappel » pour le post-it arrivé (08 h 30), pas pour celui de 10 h ni pour celui déjà vu
console.log('me',J(await page.evaluate(()=>{const H=window.TRACE.monde3d&&window.TRACE.monde3d();return H?{id:H.state.DATA.me&&H.state.DATA.me.id,notes:(H.state.DATA.notes||[]).length,keys:Object.keys(localStorage).filter(k=>/notes3d/.test(k))}:null;})));
const todo=await page.evaluate(()=>{const H=window.TRACE.monde3d&&window.TRACE.monde3d();return H?(H.state.DATA.notifs.todo||[]).map(x=>x.t):null;});
console.log('a1) À faire :',J(todo));C.a1=!!todo&&todo.filter(t=>/^Rappel :/.test(t)).length===1&&todo.some(t=>/Rappel : Appeler le fournisseur/.test(t));
// a1b) un rendez-vous ajouté dans l'agenda de l'appli (10/11 : Ethan — « ça doit aller chercher mes rdv de l'agenda ») apparaît sur le tableau « Ma journée »
await page.evaluate(()=>window.TRACE.monde.ctx().go('agenda'));await W(900);await page.evaluate(()=>{const b=document.querySelector('#eq-app [data-act="agnew"][data-v="2026-11-06"]');if(b)b.click();});await W(500);
await page.evaluate(()=>{const g=k=>document.getElementById('ag-'+k);if(g('type'))g('type').value='rdv';g('title').value='Visite client Lycée';g('h0').value='14:00';g('h1').value='15:00';const ok=document.querySelector('#eq-app [data-act="agok"]');if(ok)ok.click();});await W(800);
await page.evaluate(()=>{window.TRACE.showScreen('home');window.TRACE.renderHome();});await W(400);await home('htHome');await W(3000);
const ag=await page.evaluate(()=>{const H=window.TRACE.monde3d&&window.TRACE.monde3d();return H?(H.state.DATA.jour&&H.state.DATA.jour.rdv||[]).map(r=>r.h+' '+r.t+' '+r.src):null;});console.log('a1b) agenda → tableau :',J(ag));C.a1b=!!ag&&ag.some(x=>/^14:00 Visite client Lycée app$/.test(x));
// a2) dans le bureau 3D : le post-it arrivé s'agite (dueNotes), les deux autres non
const due=await page.evaluate(()=>{const H=window.TRACE.monde3d();return (H.state.pod.userData.dueNotes||[]).map(w=>w.userData.noteId);});console.log('a2) agités :',J(due));C.a2=J(due)==='["na1"]';
// a3) la ligne « À faire » ouvre le post-it en grand
await page.evaluate(()=>{const H=window.TRACE.monde3d();const x=(H.state.DATA.notifs.todo||[]).find(x=>/^Rappel :/.test(x.t));H.go('notif',x.i);});await W(1500);
const v3=await page.evaluate(()=>{const H=window.TRACE.monde3d();return {vue:H.state.vue,seen:!!document.querySelector('[data-note-seen]')};});console.log('a3) ouvert :',J(v3));C.a3=v3.vue==='note:na1'&&v3.seen;
// a4) « ✓ Vu » : enregistré sur l'appareil, plus d'agitation, plus de ligne À faire
await page.evaluate(()=>document.querySelector('[data-note-seen]').click());await W(1800);
const v4=await page.evaluate(()=>{const H=window.TRACE.monde3d();const N=JSON.parse(localStorage.getItem('trace:notes3d:l:ethan')||'[]');return {rk:(N.find(n=>n.id==='na1')||{}).rk===true,due:(H.state.pod.userData.dueNotes||[]).length,todo:(H.state.DATA.notifs.todo||[]).filter(x=>/^Rappel :/.test(x.t)).length};});
console.log('a4) vu :',J(v4));C.a4=v4.rk&&v4.due===0;
// a5) hors de la 3D (hub Entreprise) : l'heure du 2e rappel arrive → toast de l'appli dans les 30 s
await home('htEnt');await W(800);await page.evaluate(()=>{const api=window.TRACE.monde.ctx().api;const o=api.toast;api.toast=t=>{window.__toasts=(window.__toasts||[]).concat([String(t)]);return o&&o(t);};});await page.clock.fastForward(61*60*1000);await W(600); /* 10 h 01 : l'heure du 2e rappel est passée et le tic de 30 s a eu lieu (le toast reste 2,6 s de temps simulé) */
const v5=await page.evaluate(()=>({gl:!document.querySelector('#eq-app .m3d-slot canvas'),toast:(window.__toasts||[]).join(' | ')}));console.log('a5) toast :',J(v5));C.a5=/🔔 Rappel : Relancer le devis/.test(v5.toast); /* hors du bureau 3D (ici le hub Entreprise montre le dépôt), c'est l'appli qui prévient */
C.a6=!logs.length;if(logs.length)console.log('logs',J(logs.slice(0,3)));
const ko=Object.keys(C).filter(k=>!C[k]);console.log('RESULTAT',J(C),ko.length?'ECHEC '+ko.join(','):'TOUT VERT');await browser.close();
