// 10/11 — TRACÉ RESSOURCES HUMAINES (nouveau module) : rubrique Entreprise, onglets, absences (solde CP), contraventions (désignation 45 j), formation → habilitation, mutuelle,
// navettes (boutons existants), « Mon dossier RH » pour une personne sans droit ; + 3D : plus rien sur Pilotage, le dépôt en rubrique « Visite des dépôts » et plus en tête d'Équipe.
import { chromium } from 'playwright';
const BASE=process.env.BASE||'http://localhost:8765';const J=x=>JSON.stringify(x);
const browser=await chromium.launch({headless:true,args:['--ignore-gpu-blocklist','--enable-unsafe-swiftshader']});const page=await browser.newPage({viewport:{width:1366,height:900}});const C={};const W=ms=>page.waitForTimeout(ms);const T=(f,a)=>page.evaluate(f,a);
const logs=[];page.on('pageerror',e=>logs.push('PAGEERROR: '+e.message.slice(0,300)));page.on('dialog',d=>d.accept().catch(()=>{}));
await page.clock.install({time:new Date(2026,10,10,9,0,0)});
await page.goto(BASE+'/index.html');await W(600);await T(()=>{localStorage.clear();localStorage.setItem('trace:wide','1');});await T(()=>new Promise(r=>{try{const q=indexedDB.deleteDatabase('trace-kv');q.onsuccess=q.onerror=q.onblocked=()=>r();}catch(e){r();}}));
await T(()=>{localStorage.setItem('trace:monde',JSON.stringify({v:1,on:true,testeurs:['ethan','l:ethan'],depots:{ouest:{nom:'Dépôt A',ville:'Ville A',lat:47.5,lon:0.5}},magasin:'ouest'}));});
await page.reload();await W(1500);{const s=await page.$('#loginSkip');if(s&&await s.isVisible())await s.click();await W(700);}
const asEthan=async()=>{await T(()=>{const Tr=window.TRACE;Tr.state.userId='ethan';Tr.renderHome();});await W(500);};await asEthan();
const home=async id=>{await T(i=>{const b=document.getElementById(i);if(b)b.click();},id);await W(600);};
const click=async(sel)=>{const ok=await T(s=>{const b=document.querySelector(s);if(b)b.click();return !!b;},sel);await W(500);return ok;};
const txt=()=>T(()=>(document.getElementById('eq-app')||document.body).textContent.replace(/\s+/g,' '));
// r1) Entreprise : rubrique « Ressources humaines », « Visite des dépôts » ; plus de 3D en tête d'Équipe ; Pilotage sans 3D
await home('htEnt');await W(1500);const r1=await T(()=>({rh:!!document.querySelector('[data-act="xgo"][data-v^="x:rh:"]'),visite:!!document.querySelector('[data-act="xgo"][data-v="x:monde:depot"]'),slot:!!document.querySelector('#eq-app .m3d-slot')}));
await home('htExpl');await W(1200);r1.pilSlot=await T(()=>!!document.querySelector('#eq-app .m3d-slot'));console.log('r1)',J(r1));C.r1=r1.rh&&r1.visite&&!r1.slot&&!r1.pilSlot;
// r2) la rubrique « Visite des dépôts » monte la 3D du dépôt
await home('htEnt');await click('[data-act="xgo"][data-v="x:monde:depot"]');await W(2500);const r2=await T(()=>({slot:(document.querySelector('#eq-app .m3d-slot')||{}).dataset?.m3dKind,h2:(document.querySelector('#eq-app h2')||{}).textContent||''}));console.log('r2)',J(r2));C.r2=r2.slot==='monde'&&/Visite des dépôts/.test(r2.h2);
// r3) RH : tableau de bord puis absences — une absence CP de 3 jours → solde, liste
await home('htEnt');await click('[data-act="xgo"][data-v^="x:rh:"]');await W(800);const r3a=await txt();
await click('[data-act="x"][data-v="rh|tab|abs"]');await W(600);await click('[data-act="x"][data-v="rh|new|rhabs"]');await W(500);
await T(()=>{const s=document.getElementById('rh-p');s.value=[...s.options].find(o=>/Ethan/.test(o.textContent)).value;document.getElementById('rh-type').value='cp';document.getElementById('rh-du').value='2026-11-16';document.getElementById('rh-au').value='2026-11-18';document.getElementById('rh-au').dispatchEvent(new Event('change'));});
const r3j=await T(()=>document.getElementById('rh-jours').value);await click('#rh-ok');await W(800);const r3=await txt();const abs=await T(()=>window.TRACE.rh.rows('rhabs'));
console.log('r3)',J({jours:r3j,n:abs.length,id:abs[0]&&abs[0].id,dash:/Ressources humaines/.test(r3a)}));C.r3=/Ressources humaines/.test(r3a)&&r3j==='3'&&abs.length===1&&/\|/.test(abs[0].id)&&abs[0].type==='cp'&&+abs[0].jours===3&&/Congés payés · 16\/11\/2026 → 18\/11\/2026 · 3 j/.test(r3)&&/Pris/.test(r3);
// r4) contravention reçue il y a 40 j sans conducteur → tableau de bord « à désigner », tâche À faire ; désignation → statut « désignée »
await click('[data-act="x"][data-v="rh|tab|pv"]');await W(500);await click('[data-act="x"][data-v="rh|new|rhpv"]');await W(500);
await T(()=>{document.getElementById('rh-recu').value='2026-10-01';document.getElementById('rh-date').value='2026-09-28';document.getElementById('rh-lieu').value='Rennes';document.getElementById('rh-infraction').value='Excès de vitesse';document.getElementById('rh-montant').value='90';});await click('#rh-ok');await W(800);
const pv=await T(()=>window.TRACE.rh.rows('rhpv'));const ech=await T(()=>window.TRACE.rh.pvEch(window.TRACE.rh.rows('rhpv')[0]));await click('[data-act="x"][data-v="rh|tab|home"]');await W(600);const r4t=await txt();
const todo=await T(()=>{const c=window.TRACE.monde.ctx();return null;}).catch(()=>null);
await click('[data-act="x"][data-v="rh|tab|pv"]');await W(500);await click(`[data-act="x"][data-v="rh|edit|rhpv|${pv[0].id}"]`);await W(500);await T(()=>{const s=document.getElementById('rh-p');s.value=[...s.options].find(o=>/Ethan/.test(o.textContent)).value;});await click('#rh-ok');await W(800);const pv2=await T(()=>window.TRACE.rh.rows('rhpv')[0]);
console.log('r4)',J({n:pv.length,statut:pv[0]&&pv[0].statut,ech,home:/échéance dépassée/.test(r4t),st2:pv2.statut}));C.r4=pv.length===1&&pv[0].statut==='recue'&&ech==='2026-11-15'&&/Conducteur à désigner/.test(r4t)&&pv2.statut==='designee';
// r5) formation faite avec habilitation visée → proposition d'inscrire l'habilitation → sur la fiche (date de fin = + durée)
await click('[data-act="x"][data-v="rh|tab|form"]');await W(500);await click('[data-act="x"][data-v="rh|new|rhform"]');await W(500);
await T(()=>{const s=document.getElementById('rh-p');s.value=[...s.options].find(o=>/Ethan/.test(o.textContent)).value;document.getElementById('rh-titre').value='Recyclage SST';document.getElementById('rh-hab').value='sst';document.getElementById('rh-du').value='2026-11-03';document.getElementById('rh-au').value='2026-11-04';document.getElementById('rh-heures').value='14';document.getElementById('rh-cout').value='350';document.getElementById('rh-statut').value='fait';});
await click('#rh-ok');await W(700);const r5a=await T(()=>!!document.getElementById('rh-habok'));await click('#rh-habok');await W(900);
await click('[data-act="x"][data-v="rh|tab|hab"]');await W(600);const r5t=await txt();const r5={prop:r5a,obt:/04\/11\/2026/.test(r5t),fin:/04\/11\/2028/.test(r5t)};console.log('r5)',J(r5));C.r5=r5.prop&&r5.obt&&r5.fin; /* la fiche (kv) : visible dans la table RH, obtenue le 04/11/2026, fin + 2 ans */
// r6) habilitations : la table RH montre le SST valide d'Ethan ; mutuelle : ligne « dispensé » ; navettes : boutons xlsx du mois
await click('[data-act="x"][data-v="rh|tab|hab"]');await W(600);const r6a=await txt();await click('[data-act="x"][data-v="rh|tab|mut"]');await W(500);await click('[data-act="x"][data-v="rh|new|rhmut"]');await W(500);
await T(()=>{const s=document.getElementById('rh-p');s.value=[...s.options].find(o=>/Ethan/.test(o.textContent)).value;document.getElementById('rh-statut').value='dispense';document.getElementById('rh-motif').value='conjoint';document.getElementById('rh-justif').checked=true;});await click('#rh-ok');await W(700);const r6b=await txt();
await click('[data-act="x"][data-v="rh|tab|nav"]');await W(500);const r6c=await T(()=>({all:!!document.querySelector('[data-act="gdnavall"][data-v="2026-11"]'),one:document.querySelectorAll('[data-act="gdnavx"]').length}));
console.log('r6)',J({sst:/SST/.test(r6a)&&/04\/11\/2026/.test(r6a),mut:/Dispensé · depuis|Dispensé/.test(r6b)&&/Couvert par le conjoint/.test(r6b),nav:r6c}));C.r6=/SST/.test(r6a)&&/04\/11\/2026/.test(r6a)&&/Dispensé/.test(r6b)&&/Couvert par le conjoint/.test(r6b)&&r6c.all&&r6c.one>0;
// r7) une personne sans droit RH : « Mon dossier RH », ses lignes seulement, pas de bouton ＋
const other=await T(()=>{const c=window.TRACE.monde.ctx();const p=c.people.find(q=>q.poste==='soudeur'&&q.active!==false);return p?p.id:null;});
await T(id=>{const Tr=window.TRACE;Tr.state.userId=id;Tr.renderHome();},other);await W(800);await home('htEnt');await W(800);
const r7=await T(()=>({row:(document.querySelector('[data-act="xgo"][data-v^="x:rh:"]')||{}).textContent||''}));await click('[data-act="xgo"][data-v^="x:rh:"]');await W(700);await click('[data-act="x"][data-v="rh|tab|abs"]');await W(600);const r7t=await txt();r7.plus=await T(()=>!!document.querySelector('[data-act="x"][data-v="rh|new|rhabs"]'));r7.mine=/mon dossier/.test(r7t);r7.ethan=/Congés payés · 16\/11/.test(r7t);
console.log('r7)',J(r7));C.r7=/Mon dossier RH/.test(r7.row)&&!r7.plus&&r7.mine&&!r7.ethan;
C.r8=!logs.length;if(logs.length)console.log('logs',J(logs.slice(0,3)));
const ko=Object.keys(C).filter(k=>!C[k]);console.log('RESULTAT',J(C),ko.length?'ECHEC '+ko.join(','):'TOUT VERT');await browser.close();
