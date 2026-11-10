// MONDE 3D (nuit du 06→07/11 en SVG, refait en WebGL/three.js la nuit du 07→08/11, Labo) : option ÉTEINTE par défaut → rien ne change ; allumée pour un testeur
// sur PC en affichage large → Aujourd'hui = mon bureau en 3D (mêmes notifications dans le panneau), vue classique à un clic, personnalisation enregistrée sur la fiche ;
// Équipe = le dépôt (plusieurs dépôts, visite du bureau d'un collègue) ; Flotte / Magasin / Commerce = caméra sur leur partie ; Pilotage = dioramas ;
// Bureau du chantier = le vrai réseau ; glisser la vue ; réglages administrateur ; diagnostic quand la 3D n'est pas visible ; au téléphone rien ne change.
import { chromium } from 'playwright';
const BASE=process.env.BASE||'http://localhost:8765';const J=x=>JSON.stringify(x);
const browser=await chromium.launch({headless:true, executablePath: process.env.CHROMIUM_PATH||undefined, args:['--ignore-gpu-blocklist','--enable-unsafe-swiftshader']});
const ctx=await browser.newContext({viewport:{width:1366,height:900}});const page=await ctx.newPage();
const logs=[];page.on('pageerror',e=>logs.push('PAGEERROR: '+e.message.slice(0,300)));page.on('console',m=>{if(m.type()==='error'&&!/supabase|Failed to fetch|net::ERR|404|WebSocket|fonts.googleapis/i.test(m.text()))logs.push(m.text().slice(0,200));});
page.on('dialog',d=>d.accept().catch(()=>{}));const C={};const W=ms=>page.waitForTimeout(ms);
await page.clock.install({time:new Date(2026,10,6,9,0,0)});
await page.goto(BASE+'/index.html');await W(600);await page.evaluate(()=>{localStorage.clear();localStorage.setItem('trace:wide','1');});await page.evaluate(()=>new Promise(r=>{try{const q=indexedDB.deleteDatabase('trace-kv');q.onsuccess=q.onerror=q.onblocked=()=>r();}catch(e){r();}}));
await page.reload();await W(1200);{const s=await page.$('#loginSkip');if(s&&await s.isVisible())await s.click();await W(700);}
const asEthan=async()=>{await page.evaluate(()=>{const T=window.TRACE;T.state.userId='ethan';T.renderHome();});await W(500);};await asEthan();
const home=async id=>{await page.evaluate(i=>{const b=document.getElementById(i);if(b)b.click();},id);await W(500);};
const visite=async()=>{await home('htEnt');await page.evaluate(()=>{const b=document.querySelector('#eq-app [data-act="xgo"][data-v="x:monde:depot"]');if(b)b.click();});await W(600);}; /* 10/11 (Ethan) : le dépôt n'est plus en tête d'Équipe, c'est la rubrique « Visite des dépôts » */
const q=async()=>page.evaluate(()=>({slot:(document.querySelector('#eq-app .m3d-slot')||{}).dataset?.m3dKind||null,canvas:!!document.querySelector('#eq-app .m3d-slot canvas'),classic:!!document.querySelector('#eq-app .ac-hi'),svg:!!document.querySelector('#eq-app .m3d-card')}));
const gl=async()=>page.evaluate(()=>{const H=window.TRACE.monde3d&&window.TRACE.monde3d();return H?{scene:H.state.scene,depot:H.state.depotK,prefs:H.state.prefs,picks:H.viewer.pickables.length}:null;});
// ── m0) option éteinte : rien de nouveau ; la ligne de réglage existe pour l'administrateur
await home('htHome');const o0a=await q();await home('htEnt');const o0b=await q();const row=await page.evaluate(()=>!![...document.querySelectorAll('#eq-app .ac-row')].find(x=>/Monde 3D/.test(x.textContent)));await home('htExpl');const o0c=await q();
console.log('m0) éteint :',J({o0a,o0b,o0c,row}));C.m0=!o0a.slot&&!o0a.svg&&o0a.classic&&!o0b.slot&&!o0c.slot&&row;
// ── m1) allumé pour Ethan (testeur), dépôts fictifs → Aujourd'hui = mon bureau 3D plein écran ; les notifications sont sur les écrans et le tableau (zones cliquables) ; « Ma journée » (pointage) vient par-dessus la 3D
await page.evaluate(()=>{localStorage.setItem('trace:monde',JSON.stringify({v:1,on:true,testeurs:['ethan','l:ethan'],depots:{ouest:{nom:'Dépôt A',ville:'Ville A',lat:47.5,lon:0.5},idf:{nom:'Dépôt B',ville:'Ville B',lat:45.5,lon:3.5}},magasin:'ouest'}));location.reload();});await W(1500);
{const s=await page.$('#loginSkip');if(s&&await s.isVisible())await s.click();await W(600);}await asEthan();await home('htHome');await W(2500);
await page.evaluate(()=>{const c=window.TRACE.monde.ctx();c.people.forEach((p,i)=>{if(i%2===0)c.savePart(p.id,'secteur','ouest');});});await W(1500);
const o1=await page.evaluate(()=>({slot:(document.querySelector('#eq-app .m3d-slot')||{}).dataset?.m3dKind,canvas:(()=>{const H=window.TRACE.monde3d&&window.TRACE.monde3d();return !!(H&&H.viewer.host.querySelector('canvas'));})(),notifs:(()=>{const H=window.TRACE.monde3d&&window.TRACE.monde3d();let n=0;if(H&&H.state.pod)H.state.pod.traverse(o=>{if(o.userData.zones)n+=o.userData.zones.filter(z=>z.pick&&z.pick.type==='notif').length;});return n;})(),full:(()=>{const H=window.TRACE.monde3d&&window.TRACE.monde3d();const w=H&&H.viewer.host.closest('.m3d-wrap');return !!w&&!w.classList.contains('m3d-wrap--side');})(), /* via la scène : l'appli re-rend la page (le compteur de pointage tourne) et la 3D est replacée à l'image suivante */espaces:!!document.querySelector('#eq-app .ac-spaces'),chips:(()=>{const H=window.TRACE.monde3d&&window.TRACE.monde3d();const w=H&&H.viewer.host.closest('.m3d-wrap');return w?[...w.querySelectorAll('.m3d-chip')].map(b=>b.textContent.trim()):[];})()}));const g1=await gl();
/* via la scène (pas via la page) : l'appli re-rend l'accueil chaque seconde (compteur du pointage) et la 3D est replacée à l'image suivante */
await W(1500);await page.evaluate(()=>{const w=window.TRACE.monde3d().viewer.host.closest('.m3d-wrap');const c=[...w.querySelectorAll('.m3d-chip')].find(b=>/Ma journée/.test(b.textContent));if(c)c.click();});await W(800);o1.jour=await page.evaluate(()=>{const w=window.TRACE.monde3d().viewer.host.closest('.m3d-wrap');const o=w&&w.querySelector('.m3d-over');return o&&!o.hidden?o.textContent.trim().length:0;});
await page.evaluate(()=>{const w=window.TRACE.monde3d().viewer.host.closest('.m3d-wrap');const x=w&&w.querySelector('[data-overx]');if(x)x.click();});await W(300);o1.jourFerme=await page.evaluate(()=>{const w=window.TRACE.monde3d().viewer.host.closest('.m3d-wrap');const o=w&&w.querySelector('.m3d-over');return !o||o.hidden;});
o1.vue=await page.evaluate(()=>window.TRACE.monde3d().state.vue); /* 09/11 : on arrive sur « Mes écrans » */
await page.evaluate(()=>{const w=window.TRACE.monde3d().viewer.host.closest('.m3d-wrap');const c=[...w.querySelectorAll('.m3d-chip')].find(b=>/Accident/.test(b.textContent));if(c)c.click();});await W(900);
o1.acc=await page.evaluate(()=>{const m=document.getElementById('modal');const ok=!!m&&m.classList.contains('show')&&/ccident/i.test(m.textContent);if(m){m.classList.remove('show');m.innerHTML='';}return ok;}); /* ⚠ Accident = le formulaire de déclaration, comme sur l'accueil classique */
console.log('m1) mon bureau 3D :',J({o1,g1}));C.m1=o1.slot==='bureau'&&o1.canvas&&o1.notifs>0&&o1.full&&!o1.espaces&&o1.chips.some(t=>/Ma journée/.test(t))&&o1.jour>20&&o1.jourFerme&&o1.vue==='ecran'&&o1.acc&&g1&&g1.scene==='bureau'&&g1.picks>0; /* 09/11 : plus de grille « Espaces » sous la pièce (ils sont sur l'écran de gauche) */
// ── m2) vue classique / retour en 3D
await page.click('#eq-app [data-v="monde|vue|acc|classique"]');await W(500);const o2a=await q();const back=await page.$('#eq-app [data-v="monde|vue|acc|3d"]');if(back)await back.click();await W(2500);const o2b=await q();
console.log('m2) classique puis 3D :',J({o2a,back:!!back,o2b}));C.m2=!o2a.slot&&o2a.classic&&!!back&&o2b.slot==='bureau'&&o2b.canvas;
// ── m3) personnaliser : murs menthe + sol béton → enregistré sur la fiche (avatar.bureau3d)
await page.evaluate(()=>{[...document.querySelectorAll('#eq-app .m3d-chip')].find(b=>/Personnaliser/.test(b.textContent)).click();});await W(400);await page.click('#eq-app .m3d-side [data-ptab="piece"]');await W(300);await page.click('#eq-app .m3d-side [data-pref="mur=menthe"]');await W(2000);
await page.click('#eq-app .m3d-side [data-ptab="piece"]');await W(300);await page.click('#eq-app .m3d-side [data-pref="sol=beton"]');await W(2000);
const o3=await page.evaluate(()=>{const H=window.TRACE.monde3d();const d=window.TRACE.monde.ctx().peopleData('l:ethan');return {mur:H.state.prefs.mur,sol:H.state.prefs.sol,saved:d&&d.avatar&&d.avatar.bureau3d&&d.avatar.bureau3d.mur,panel:!!document.querySelector('#eq-app .m3d-box.perso')};});
console.log('m3) personnalisé :',J(o3));C.m3=o3.mur==='menthe'&&o3.sol==='beton'&&o3.saved==='menthe'&&o3.panel;
// ── m4) Équipe : le dépôt (2 dépôts), survol vers l'autre, visite du bureau d'un collègue
await visite();await W(3000);const o4a=await page.evaluate(()=>({slot:(document.querySelector('#eq-app .m3d-slot')||{}).dataset?.m3dKind,deps:document.querySelectorAll('#eq-app .m3d-chip[data-chip^="dep:"]').length,people:document.querySelectorAll('#eq-app .m3d-side .m3d-li[data-m3d="person"]').length}));const g4a=await gl();
await page.click('#eq-app .m3d-chip[data-chip="dep:idf"]');await W(1500);const g4b=await gl();await page.click('#eq-app .m3d-chip[data-chip="dep:ouest"]');await W(1500);
const firstOffice=await page.evaluate(()=>{const b=document.querySelector('#eq-app .m3d-side .m3d-li[data-m3d="person"]');return b?b.dataset.arg:null;});let g4c=null,g4d=null;
if(firstOffice){await page.evaluate(id=>document.querySelector(`#eq-app .m3d-side .m3d-li[data-m3d="person"][data-arg="${id}"]`).click(),firstOffice);await W(800);g4c=await page.evaluate(()=>{const v=document.querySelector('#eq-app .m3d-side [data-m3d="visit"]');if(!v)return false;v.click();return true;});if(g4c){await W(2500);g4d=await gl();}}
console.log('m4) dépôt :',J({o4a,g4a:g4a&&g4a.scene,dep0:g4a&&g4a.depot,dep1:g4b&&g4b.depot,g4c,g4d:g4d&&g4d.scene}));C.m4=o4a.slot==='monde'&&o4a.deps===2&&o4a.people>0&&g4a.scene==='monde'&&g4b.depot==='idf'&&(g4c===false||g4d&&g4d.scene==='visit');
// ── m5) glisser la vue : la cible de la caméra bouge
await visite();await W(2500);await page.evaluate(()=>{const H=window.TRACE.monde3d();if(H.state.scene!=='monde')H.setScene('monde');});await W(1500); /* 08/11 soir : la visite (m4) est une vue « dans la peau » qui reste ouverte tant qu'on n'en sort pas ; on revient au dépôt pour tester le glisser */
const t0=await page.evaluate(()=>{const H=window.TRACE.monde3d();return H.viewer.controls.target.toArray();});
const box=await page.evaluate(()=>{const r=document.querySelector('#eq-app .m3d-slot canvas').getBoundingClientRect();return {x:r.left+r.width/2,y:r.top+r.height/2};});
await page.mouse.move(box.x,box.y);await page.mouse.down();await page.mouse.move(box.x+150,box.y+60,{steps:8});await page.mouse.up();await W(500);const t1=await page.evaluate(()=>{const H=window.TRACE.monde3d();return H.viewer.controls.target.toArray();});
console.log('m5) caméra :',J({t0,t1}));C.m5=Math.hypot(t1[0]-t0[0],t1[2]-t0[2])>0.5;
// ── m6) Pilotage, Flotte, Magasin : chacun sa caméra
await home('htExpl');await W(2500);const o6a=await q();const n6=await page.evaluate(()=>document.querySelectorAll('#eq-app .m3d-side .m3d-li[data-m3d="chantier"]').length);
await home('htParc');await W(2500);const o6b=await q();await home('htMag');await W(2500);const o6c=await q();
console.log('m6) modules :',J({o6a,n6,o6b,o6c}));C.m6=!o6a.slot&&o6b.slot==='flotte'&&(o6c.slot==='magasin'||o6c.slot===null); /* 10/11 (Ethan) : plus de 3D sur Pilotage */
// ── m7) Commerce : salle d'attente ; « Attente client » enregistrée sur l'affaire depuis le panneau 3D
await page.evaluate(()=>{const A=window.TRACE.affaires;A.set('ZT-1',{num:'ZT-1',nom:'Réseau Test A',client:'Client test',etat:'devis'});A.set('ZT-2',{num:'ZT-2',nom:'Réseau Test B',client:'Client test',etat:'preconsult',attente:{de:'fournisseur',rel:'2026-11-02',note:'prix'}});});await W(200);
await home('htCom');await W(2500);const o7a=await q();await page.evaluate(()=>document.querySelector('#eq-app .m3d-side .m3d-li[data-m3d="affaire"][data-arg="ZT-1"]').click());await W(500);await page.evaluate(()=>document.querySelector('#eq-app .m3d-side [data-m3d="attente"][data-arg="ZT-1|client"]').click());await W(800);
const o7b=await page.evaluate(()=>{const a=window.TRACE.affaires.get('ZT-1');return {de:a&&a.attente&&a.attente.de,rel:a&&a.attente&&a.attente.rel};});
console.log('m7) commerce :',J({o7a,o7b}));C.m7=o7a.slot==='commerce'&&o7a.canvas&&o7b.de==='client'&&/^2026-11-\d\d$/.test(o7b.rel||'');
// ── m8) Bureau du chantier : le vrai réseau en 3D ; un sujet du panneau ouvre son onglet
/* 09/11 (Ethan : « supprime ça on s'en fout ») : plus de « Réseau du chantier » en tête du bureau (ni dessin ni 3D) ; la checklist en tuiles est là et ouvre ses onglets */
await page.evaluate(async()=>{await window.TRACE.go();});await W(1200);await page.evaluate(()=>{const T=window.TRACE;T.state.tab='bureau';T.renderAll();});await W(2500);
const o8=await page.evaluate(()=>{const t=[...document.querySelectorAll('#bureau .ac-kgrid .ac-dk[data-bur]')].find(b=>!String(b.dataset.bur).startsWith('__'));return {scene:!!document.querySelector('#bureau .m3d-slot, #bureau .m3d-rac, #bureau canvas, #bureau .m3d-svg'),tiles:document.querySelectorAll('#bureau .ac-kgrid .ac-dk').length,first:t?t.dataset.bur:null};});
let o8b=null;if(o8.first){await page.evaluate(f=>document.querySelector(`#bureau .ac-kgrid .ac-dk[data-bur="${f}"]`).click(),o8.first);await W(600);o8b=await page.evaluate(()=>window.TRACE.state.tab);}
console.log('m8) chantier :',J({o8,o8b}));C.m8=!o8.scene&&o8.tiles>0&&!!o8.first&&o8b===o8.first;
// ── m9) réglages : éteindre → l'accueil redevient classique
await page.evaluate(()=>{window.TRACE.showScreen('home');window.TRACE.renderHome();});await W(400);await home('htEnt');await W(1500);
const rr=await page.$('#eq-app .ac-row[data-v="x:monde:cfg"]');if(rr){await rr.click();await W(400);}const cfg=await page.evaluate(()=>!!document.querySelector('#eq-app [data-v="monde|on|0"]'));
if(cfg){await page.click('#eq-app [data-v="monde|on|0"]');await W(500);}await home('htHome');const o9=await q();
console.log('m9) éteint par l\'administrateur :',J({row:!!rr,cfg,o9}));C.m9=!!rr&&cfg&&!o9.slot&&o9.classic;
// ── m9b) allumé mais pas testeur → carte qui dit ce qui manque + « Me mettre testeur » → le bureau 3D apparaît
await page.evaluate(()=>{const c=JSON.parse(localStorage.getItem('trace:monde'));c.on=true;c.testeurs=[];localStorage.setItem('trace:monde',JSON.stringify(c));location.reload();});await W(1500);
{const s=await page.$('#loginSkip');if(s&&await s.isVisible())await s.click();await W(600);}await asEthan();await home('htHome');
const o9b=await page.evaluate(()=>{const d=document.querySelector('#eq-app .m3d-diag');return {diag:!!d,txt:d?d.textContent.slice(0,160):'',btn:!!document.querySelector('#eq-app .m3d-diag [data-v^="monde|tst|"]')};});
if(o9b.btn){await page.click('#eq-app .m3d-diag [data-v^="monde|tst|"]');await W(500);}await home('htHome');await W(2500);const o9c=await q();
console.log('m9b) diagnostic :',J({o9b,o9c}));C.m9b=o9b.diag&&/testeurs/.test(o9b.txt)&&o9b.btn&&o9c.slot==='bureau';
// ── m10) téléphone : rallumé, mais écran étroit → rien ne change
await page.setViewportSize({width:430,height:900});await W(300);await page.evaluate(()=>{location.reload();});await W(1500);{const s=await page.$('#loginSkip');if(s&&await s.isVisible())await s.click();await W(600);}await asEthan();await home('htHome');const o10=await q();
console.log('m10) téléphone :',J(o10));C.m10=!o10.slot&&o10.classic;
C.m11=logs.length===0;if(logs.length)console.log('console :',logs.slice(0,6));
console.log('RESULTAT',J(C),Object.values(C).every(Boolean)?'TOUT VERT':'ÉCHEC');await browser.close();
