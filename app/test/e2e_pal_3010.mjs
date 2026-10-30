// e2e_pal_3010.mjs — 30/10 (lot 2910h). Ethan : « un seul logiciel : ceux qui n'ont que la V1 (Socle) ne voient pas le reste (Labo, Sud-Ouest) ; facile de gérer qui voit quoi ;
// voir l'appli comme chacun ». Paliers d'accès aux options (src/paliers.js, Administrateur → 🧪 Options).
//  c1  paliers ÉTEINTS (défaut) : rien ne change — Ethan (admin, palier Socle) voit tous les onglets du chantier, Commerce et Parc à l'accueil, Modifs dans « ＋ Poser »
//  c2  écran Options : interrupteur, une ligne par option avec Socle / Labo (défauts : hydro, stock, fourniture, phasage, modifs, points, commerce, parc, magasin, frais,
//      objectifs, accident, mutu en Labo ; bouclage, conv, qse, dossier, export, planning, production en Socle), testeurs Labo
//  c3  paliers ALLUMÉS, Ethan Socle : onglets Hydro / Stock / Fourniture / Phasage / Modifs / Points absents (Bouclage, Conversation, QSE, Dossier, Export présents),
//      « ＋ Poser » sans Modifs, calques sans Modifications / Écarts, accueil sans Commerce ni Parc, Moi sans Notes de frais, Sécurité sans « Déclarer un accident »
//  c4  Ethan passé Labo (bouton de sa fiche) : tout revient ; option personnelle « Hydro en moins » : Hydro seul disparaît ; « suivant palier » : revient
//  c5  une option passée au Socle (Phasage) : visible pour une personne Socle (Karim via « voir comme ») ; Karim ne voit pas Hydro ; Planning passé Labo : Ethan (Socle) perd
//      « Planning des équipes » (Équipes & heures) et le sous-onglet Planning de Moi, garde Production ; retour ; Ethan éteint les paliers : tout revient
//  c6  console propre
import { chromium } from 'playwright';
const BASE=process.env.BASE||'http://localhost:8765';
const browser=await chromium.launch({headless:true, executablePath: process.env.CHROMIUM_PATH||undefined});
const C={};const logs=[];const J=x=>JSON.stringify(x);
const ctx=await browser.newContext({viewport:{width:1366,height:900},deviceScaleFactor:1});const page=await ctx.newPage();
page.on('pageerror',e=>logs.push('PAGEERROR: '+e.message.slice(0,300)));page.on('console',m=>{if(m.type()==='error'&&!/supabase|Failed to fetch|net::ERR|404|geopf|WebSocket/i.test(m.text()))logs.push(m.text().slice(0,200));});page.on('dialog',d=>d.accept().catch(()=>{}));
const wait=ms=>page.waitForTimeout(ms);
await page.goto(BASE+'/index.html');await wait(600);await page.evaluate(()=>{localStorage.clear();});await page.evaluate(()=>new Promise(r=>{try{const q=indexedDB.deleteDatabase('trace-kv');q.onsuccess=q.onerror=q.onblocked=()=>r();}catch(e){r();}}));
await page.reload();await wait(1200);const s=await page.$('#loginSkip');if(s&&await s.isVisible())await s.click();await wait(700);
const asUser=async id=>{await page.evaluate(id=>{window.TRACE.state.userId=id;window.TRACE.renderHome();},id);await wait(250);};
const openSite=async()=>{await page.evaluate(()=>{const T=window.TRACE;const id=Object.keys(T.sites).find(k=>k!=='__vide'&&T.sites[k]&&T.sites[k].lines);T.showScreen('site');if(T.state.siteId!==id)T.switchSite(id);T.state.tab='plan';T.renderAll();});await wait(600);};
const siteTabs=()=>page.evaluate(()=>[...document.querySelectorAll('#tabbar [data-tab]')].filter(b=>b.style.display!=='none'&&b.dataset.tab!=='__more').map(b=>b.dataset.tab));
const homeTabs=async()=>{await page.evaluate(()=>{window.TRACE.showScreen('home');window.TRACE.renderHome();});await wait(300);return page.evaluate(()=>[...document.querySelectorAll('#homeTabs button')].filter(b=>b.style.display!=='none').map(b=>b.id));};
const poser=async()=>{await page.evaluate(()=>{window.TRACE.showScreen('site');window.TRACE.renderAll();});await wait(200);await page.evaluate(()=>document.getElementById('planFab').click());await wait(250);const r=await page.evaluate(()=>[...document.querySelectorAll('#modal [data-pose-mode]')].map(b=>b.dataset.poseMode));await page.evaluate(()=>window.TRACE.closeModal&&window.TRACE.closeModal());await page.evaluate(()=>{const m=document.getElementById('modal');if(m)m.classList.remove('show');});return r;};
const layers=async()=>{await page.evaluate(()=>{window.TRACE.showScreen('site');window.TRACE.renderAll();const b=document.querySelector('.zoomctl [data-z=eye]');if(b)b.click();});await wait(250);const r=await page.evaluate(()=>[...document.querySelectorAll('#disp .dchip input[data-k]')].map(i=>i.dataset.k));await page.evaluate(()=>{const d=document.getElementById('disp');if(d)d.classList.remove('show');});return r;};
/* ── c1 : éteint */
await asUser('ethan');await openSite();
let o={on:await page.evaluate(()=>window.TRACE.paliers.on()),tabs:await siteTabs(),poser:await poser(),home:await homeTabs()};
console.log('c1) éteint :',J(o));
C.c1=o.on===false&&['hydro','stock','fourniture','phasage','ts','conv','qse','export','bouclage'].every(t=>o.tabs.includes(t))&&o.poser.includes('ts')&&o.poser.includes('fourn')&&o.home.includes('htCom')&&o.home.includes('htParc');
/* ── c2 : écran Options */
await page.evaluate(()=>document.getElementById('htAdmin').click());await wait(600);
await page.evaluate(()=>{const b=[...document.querySelectorAll('#homeBody .admNav button')].find(x=>/Options/.test(x.textContent));b.click();});await wait(400);
o=await page.evaluate(()=>{const rows=[...document.querySelectorAll('.admOpt')].map(r=>({t:r.querySelector('.admOptT b').textContent,p:(r.querySelector('.admOptS .btn.on')||{}).textContent||''}));return {n:rows.length,rows,sw:!!document.getElementById('admPalOn'),swOn:document.getElementById('admPalOn').checked,testeurs:/Testeurs Labo \(0\)/.test(document.getElementById('homeBody').textContent),ban:/Paliers ÉTEINTS/.test(document.getElementById('homeBody').textContent)&&/tout le monde voit tout/.test(document.getElementById('homeBody').textContent)};});
console.log('c2) écran :',J({n:o.n,sw:o.sw,swOn:o.swOn,testeurs:o.testeurs,ban:o.ban,labo:o.rows.filter(r=>/Labo/.test(r.p)).map(r=>r.t),socle:o.rows.filter(r=>/Socle/.test(r.p)).map(r=>r.t)}));
const isLabo=t=>o.rows.find(r=>r.t.startsWith(t))&&/Labo/.test(o.rows.find(r=>r.t.startsWith(t)).p),isSocle=t=>o.rows.find(r=>r.t.startsWith(t))&&/Socle/.test(o.rows.find(r=>r.t.startsWith(t)).p);
C.c2=o.n>=20&&o.sw&&!o.swOn&&o.testeurs&&o.ban&&['Hydraulique','Stock','Fourniture','Phasage','Modifications','Points','Commerce','Parc','Magasin','Notes de frais','Objectifs','Déclaration','Chantier partagé'].every(isLabo)&&['Bouclage','Conversation','QSE','Dossier','Export','Planning','Production'].every(isSocle);
/* ── c3 : allumé, Ethan Socle */
await page.evaluate(()=>{const t=document.getElementById('admPalOn');t.checked=true;t.dispatchEvent(new Event('change',{bubbles:true}));});await wait(500);
o={on:await page.evaluate(()=>window.TRACE.paliers.on())};await openSite();o.tabs=await siteTabs();o.poser=await poser();o.layers=await layers();o.home=await homeTabs();
await page.evaluate(()=>document.getElementById('htEspace').click());await wait(500);o.moi=await page.evaluate(()=>({frais:/Notes de frais/.test(document.getElementById('eq-app').textContent),subFrais:!!document.querySelector('#homeSubTabs [id*="frais"], #homeSubTabs button[data-sub="frais"]')}));
await page.evaluate(()=>document.getElementById('htSites').click());await wait(300);await page.evaluate(()=>document.getElementById('htSecu').click());await wait(500);o.secu=await page.evaluate(()=>({accident:/Déclarer un accident/.test(document.getElementById('eq-app').textContent)}));
console.log('c3) allumé, Socle :',J(o));
C.c3=o.on===true&&['hydro','stock','fourniture','phasage','ts','points'].every(t=>!o.tabs.includes(t))&&['bouclage','conv','qse','export'].every(t=>o.tabs.includes(t))&&!o.poser.includes('ts')&&!o.poser.includes('fourn')&&o.poser.includes('note')&&!o.layers.includes('ts')&&!o.layers.includes('ecart')&&o.layers.includes('conv')&&!o.home.includes('htCom')&&!o.home.includes('htParc')&&!o.moi.frais&&!o.secu.accident;
/* ── c4 : Ethan passé Labo (API : le personnage de démo n'est pas dans la liste des comptes) → tout revient ; puis un compte créé sur l'appareil : bouton « Socle / 🧪 Labo » de sa fiche,
      puce « 🧪 labo », fiche des droits avec une ligne par option, « Hydro en moins » → ne voit plus Hydro (les autres oui), « suivant palier » → revient */
o={me:await page.evaluate(async()=>{const T=window.TRACE;const me=T.acces.current();const r=await T.paliers.setPerson(me,'labo');return {id:me.id,ok:!!r.ok,pal:T.paliers.personPalier(me)};})};await wait(300);
await openSite();o.tabs=await siteTabs();o.home=await homeTabs();
await page.evaluate(async()=>{const T=window.TRACE;await T.paliers.setPerson(T.acces.current(),'socle');});await wait(200);
o.created=await page.evaluate(async()=>{const r=await window.TRACE.acces.create({email:'testeur.labo@scr-soudure.fr',nom:'LABO',prenom:'Testeur',poste:'soudeur'});return r;});
await page.evaluate(()=>document.getElementById('htAdmin').click());await wait(500);await page.evaluate(()=>{const b=[...document.querySelectorAll('#homeBody .admNav button')].find(x=>/Personnes/.test(x.textContent));b.click();});await wait(500);
const accOf=async()=>page.evaluate(async()=>{const r=await window.TRACE.acces.list();return r.rows.find(x=>x.email==='testeur.labo@scr-soudure.fr')||null;});
o.row=await page.evaluate(()=>{const r=[...document.querySelectorAll('.admAcc')].find(x=>/LABO/.test(x.textContent));if(!r)return null;const b=r.querySelector('[data-admpalier]');const t0=b&&b.textContent.trim();if(b)b.click();return {id:b&&b.dataset.admpalier,t0};});await wait(500);
o.after=await page.evaluate(async()=>{const T=window.TRACE;const r=await T.acces.list();const a=r.rows.find(x=>x.email==='testeur.labo@scr-soudure.fr');const row=[...document.querySelectorAll('.admAcc')].find(x=>/LABO/.test(x.textContent));return {pal:T.paliers.personPalier(a),hydro:T.paliers.featFor(a,'hydro'),chip:row?/labo/.test(row.textContent):null,btn:row?row.querySelector('[data-admpalier]').textContent.trim():null,testeurs:Object.keys(T.paliers.cfg().people).length,ban:/Paliers ALLUMÉS/.test(document.getElementById('homeBody').textContent)&&/1 testeur Labo/.test(document.getElementById('homeBody').textContent)};});
await page.evaluate(()=>{const r=[...document.querySelectorAll('.admAcc')].find(x=>/LABO/.test(x.textContent));r.querySelector('[data-admrights]').click();});await wait(400);
o.modal=await page.evaluate(()=>({sel:document.querySelectorAll('#modal select[data-pk]').length,lab:/testeur Labo/.test(document.getElementById('modal').textContent)}));
await page.evaluate(()=>{const s=document.querySelector('#modal select[data-pk="hydro"]');s.value='0';s.dispatchEvent(new Event('change',{bubbles:true}));});await wait(400);
o.minus=await page.evaluate(async()=>{const T=window.TRACE;const r=await T.acces.list();const a=r.rows.find(x=>x.email==='testeur.labo@scr-soudure.fr');return {hydro:T.paliers.featFor(a,'hydro'),stock:T.paliers.featFor(a,'stock'),conv:T.paliers.featFor(a,'conv')};});
await page.evaluate(()=>{const s=document.querySelector('#modal select[data-pk="hydro"]');s.value='';s.dispatchEvent(new Event('change',{bubbles:true}));});await wait(400);
o.back=await page.evaluate(async()=>{const T=window.TRACE;const r=await T.acces.list();const a=r.rows.find(x=>x.email==='testeur.labo@scr-soudure.fr');return {hydro:T.paliers.featFor(a,'hydro'),extra:Object.keys(T.paliers.cfg().extra).length};});
await page.evaluate(()=>{document.getElementById('modal').classList.remove('show');});
console.log('c4) Labo + option perso :',J(o));
C.c4=o.me.ok&&o.me.pal==='labo'&&['hydro','stock','fourniture','phasage','ts'].every(t=>o.tabs.includes(t))&&o.home.includes('htCom')&&o.home.includes('htParc')&&o.created&&o.created.ok&&!!o.row&&o.row.t0==='Socle'&&o.after.pal==='labo'&&o.after.hydro===true&&o.after.chip===true&&/Labo/.test(o.after.btn)&&o.after.testeurs===1&&o.after.ban&&o.modal.sel>=20&&o.modal.lab&&o.minus.hydro===false&&o.minus.stock===true&&o.minus.conv===true&&o.back.hydro===true&&o.back.extra===0;
/* ── c5 : Phasage → Socle ; voir comme Karim (soudeur, Socle) ; éteindre */
await page.evaluate(()=>document.getElementById('htAdmin').click());await wait(500);await page.evaluate(()=>{const b=[...document.querySelectorAll('#homeBody .admNav button')].find(x=>/Options/.test(x.textContent));b.click();});await wait(400);
await page.evaluate(()=>{const b=document.querySelector('[data-admfeat="phasage:socle"]');b.click();});await wait(400);
o={phas:await page.evaluate(()=>(document.querySelector('[data-admfeat="phasage:socle"]')||{}).className||'')};
await asUser('karim');await openSite();o.karim=await siteTabs();o.karimFeat=await page.evaluate(()=>({phasage:window.TRACE.paliers.feat('phasage'),hydro:window.TRACE.paliers.feat('hydro'),conv:window.TRACE.paliers.feat('conv')}));
await asUser('ethan');await page.evaluate(()=>document.getElementById('htAdmin').click());await wait(500);await page.evaluate(()=>{const b=[...document.querySelectorAll('#homeBody .admNav button')].find(x=>/Options/.test(x.textContent));b.click();});await wait(400);
/* c5b : Planning (Socle) → Labo : Ethan (Socle) perd « Planning des équipes » dans Équipes & heures et « Voir ta semaine » dans Moi ; Production reste ; retour au Socle */
const hub=async()=>{await page.evaluate(()=>document.getElementById('htSites').click());await wait(250);await page.evaluate(()=>document.getElementById('htEq').click());await wait(500);return page.evaluate(()=>document.getElementById('eq-app').textContent);};
const moi=async()=>{await page.evaluate(()=>document.getElementById('htEspace').click());await wait(500);return page.evaluate(()=>({txt:document.getElementById('eq-app').textContent,subs:[...document.querySelectorAll('#eq-app .eq-subs [data-act=sub]')].map(b=>b.dataset.v)}));};
let h=await hub(),m=await moi();o.before={plan:/Planning des équipes/.test(h),prod:/Production par équipe/.test(h),subs:m.subs};
await page.evaluate(()=>document.getElementById('htAdmin').click());await wait(500);await page.evaluate(()=>{const b=[...document.querySelectorAll('#homeBody .admNav button')].find(x=>/Options/.test(x.textContent));b.click();});await wait(400);
await page.evaluate(()=>{document.querySelector('[data-admfeat="planning:labo"]').click();});await wait(400);
h=await hub();m=await moi();o.planLabo={plan:/Planning des équipes/.test(h),prod:/Production par équipe/.test(h),subs:m.subs,mutu:await page.evaluate(()=>window.TRACE.paliers.feat('mutu'))};
await page.evaluate(()=>document.getElementById('htAdmin').click());await wait(500);await page.evaluate(()=>{const b=[...document.querySelectorAll('#homeBody .admNav button')].find(x=>/Options/.test(x.textContent));b.click();});await wait(400);
await page.evaluate(()=>{document.querySelector('[data-admfeat="planning:socle"]').click();});await wait(400);o.planBack=/Planning des équipes/.test(await hub());
await page.evaluate(()=>document.getElementById('htAdmin').click());await wait(500);await page.evaluate(()=>{const b=[...document.querySelectorAll('#homeBody .admNav button')].find(x=>/Options/.test(x.textContent));b.click();});await wait(400);
await page.evaluate(()=>{const t=document.getElementById('admPalOn');t.checked=false;t.dispatchEvent(new Event('change',{bubbles:true}));});await wait(500);
o.off=await page.evaluate(()=>window.TRACE.paliers.on());await asUser('karim');o.karimOff=await page.evaluate(()=>({hydro:window.TRACE.paliers.feat('hydro'),commerce:window.TRACE.paliers.feat('commerce')}));
console.log('c5) Phasage → Socle, Karim, éteint :',J(o));
C.c5=/on/.test(o.phas)&&o.karimFeat.phasage===true&&o.karimFeat.hydro===false&&o.karimFeat.conv===true&&o.off===false&&o.karimOff.hydro===true&&o.karimOff.commerce===true
  &&o.before.plan&&o.before.prod&&o.before.subs.includes('planning')&&!o.planLabo.plan&&o.planLabo.prod&&!o.planLabo.subs.includes('planning')&&o.planLabo.subs.includes('docs')&&o.planLabo.mutu===false&&o.planBack;
C.c6=!logs.length;if(logs.length)console.log('console :',logs);
console.log('RÉSULTATS',J(C));console.log('RESULTAT:',Object.values(C).every(Boolean)?'TOUT VERT':'ÉCHEC '+Object.keys(C).filter(k=>!C[k]).join(' '));await browser.close();process.exit(Object.values(C).every(Boolean)?0:1);
