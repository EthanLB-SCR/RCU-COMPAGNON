// RETOURS DE RECETTE DU 19/11 (Word d'Ethan, 24/11/2026) — ce que les tests dédiés ne couvrent pas :
//  r1  L36 Affaire → Réglages → Taux horaires : sans grille, « Grille SCR · à compléter » et « Saisir les taux » (avant : « ＋ nouvelle grille » ne faisait rien) ;
//      montant faux refusé avec le message ; grille enregistrée ; « Modifier cette grille » la reprend (date d'effet figée) et l'enregistre
//  r2  Chantier : le bouton ⌂ « Retour à la liste des chantiers » est un vrai bouton (≥ 40 px) et ramène à la liste
//  r3  Concepteur hors chantier : l'accueil du Concepteur (chantiers, études, recherche, « 📍 Chantier » ouvre le chantier, « ＋ Nouveau tracé »)
//  r4  téléphone pliable déplié (écran tactile 820 × 1180) : affichage large tout seul ; accueil : « 🪑 Mon bureau en 3D » pour une personne qui n'est pas testeur ;
//      les écrans principaux sans débordement de page ; replié (390 px) : retour à la colonne téléphone
//  r5  PC (souris) : rien ne change — pas d'affichage large sans le choisir ; console propre
import { chromium } from 'playwright';
const BASE=process.env.BASE||'http://localhost:8765';const J=x=>JSON.stringify(x);const C={};const logs=[];
const browser=await chromium.launch({headless:true,args:['--ignore-gpu-blocklist','--enable-unsafe-swiftshader']});
const prep=async page=>{page.on('pageerror',e=>logs.push('PAGEERROR: '+e.message.slice(0,300)));page.on('console',m=>{if(m.type()==='error'&&!/supabase|Failed to fetch|net::ERR|404|WebSocket|WebGL|GPU|swiftshader/i.test(m.text()))logs.push(m.text().slice(0,200));});page.on('dialog',d=>d.accept().catch(()=>{}));
  await page.route(u=>/(^|\.)geopf\.fr$|^geo\.api\.gouv\.fr$|open-meteo\.com$/.test(u.hostname),route=>route.fulfill({status:200,contentType:'application/json',body:JSON.stringify({type:'FeatureCollection',features:[],results:[],daily:{time:[],weathercode:[],temperature_2m_max:[],precipitation_sum:[],precipitation_probability_max:[]}})}));
  await page.clock.install({time:new Date(2026,11,1,8,30,0)});await page.goto(BASE+'/index.html');await page.waitForTimeout(600);await page.evaluate(()=>{localStorage.clear();});await page.evaluate(()=>new Promise(r=>{try{const q=indexedDB.deleteDatabase('trace-kv');q.onsuccess=q.onerror=q.onblocked=()=>r();}catch(e){r();}}));
  await page.reload();await page.waitForTimeout(1200);{const s=await page.$('#loginSkip');if(s&&await s.isVisible())await s.click();await page.waitForTimeout(700);}};
// ── PC
const pc=await browser.newContext({viewport:{width:1280,height:950}});const page=await pc.newPage();await prep(page);const T=(f,a)=>page.evaluate(f,a);const W=ms=>page.waitForTimeout(ms);
await T(()=>{localStorage.setItem('trace:wide','1');document.getElementById('app').classList.add('wide');const Tr=window.TRACE;Tr.state.userId='ethan';Tr.renderHome();});await W(400);
// ── r1) taux horaires
await T(()=>document.getElementById('htAff').click());await W(900);await T(()=>{const b=[...document.querySelectorAll('#eq-app .af-nav button')].find(x=>/Réglages/.test(x.textContent));if(b)b.click();});await W(700);
let out={vide:await T(()=>{const t=(document.getElementById('eq-app')||{}).textContent||'';return {grille:/Grille SCR · à compléter|à compléter/.test(t),btn:[...document.querySelectorAll('#eq-app .af-main button')].some(b=>/Saisir les taux/.test(b.textContent))};})};
await T(()=>{const b=[...document.querySelectorAll('#eq-app .af-main button')].find(x=>/Saisir les taux/.test(x.textContent));if(b)b.click();});await W(500);
out.form=await T(()=>({effet:(document.getElementById('g-effet')||{}).value||'',n:document.querySelectorAll('.af-fenetre input[id^="g-"]').length}));
await T(()=>{const s=(id,v)=>{const e=document.getElementById(id);if(e){e.value=v;e.dispatchEvent(new Event('input',{bubbles:true}));}};const first=[...document.querySelectorAll('.af-fenetre input[id^="g-"]')].find(i=>!['g-effet','g-fgch','g-fgst','g-sin'].includes(i.id));s('g-fgch','12');s('g-fgst','9');s('g-sin','1,5');if(first)s(first.id,'abc');window.__P=first&&first.id;});
await T(()=>{const b=[...document.querySelectorAll('.af-fenetre button')].find(x=>/Enregistrer la grille/.test(x.textContent));b.click();});await W(400);out.err=await T(()=>(document.getElementById('g-err')||{}).textContent||'');
await T(()=>{const e=document.getElementById(window.__P);e.value='31,5';e.dispatchEvent(new Event('input',{bubbles:true}));const b=[...document.querySelectorAll('.af-fenetre button')].find(x=>/Enregistrer la grille/.test(x.textContent));b.click();});await W(600);
out.apres=await T(()=>{const t=(document.getElementById('eq-app')||{}).textContent||'';return {modif:[...document.querySelectorAll('#eq-app .af-main button')].some(b=>/Modifier cette grille/.test(b.textContent)),eur:/31,50\s*€|31,5\s*€/.test(t)};});
await T(()=>{const b=[...document.querySelectorAll('#eq-app .af-main button')].find(x=>/Modifier cette grille/.test(x.textContent));if(b)b.click();});await W(500);
out.edit=await T(()=>({titre:(document.querySelector('.af-fenetre h2')||{}).textContent||'',ro:!!(document.getElementById('g-effet')||{}).readOnly||!!(document.getElementById('g-effet')||{}).disabled,val:(document.getElementById(window.__P)||{}).value||''}));
await T(()=>{const e=document.getElementById(window.__P);e.value='33';e.dispatchEvent(new Event('input',{bubbles:true}));const b=[...document.querySelectorAll('.af-fenetre button')].find(x=>/Enregistrer les modifications/.test(x.textContent));if(b)b.click();});await W(600);
out.final=await T(()=>/33,00\s*€|33\s*€/.test((document.getElementById('eq-app')||{}).textContent||''));
console.log('r1)',J(out));C.r1=out.vide.grille&&out.vide.btn&&/^\d{4}-\d{2}-\d{2}$/.test(out.form.effet)&&out.form.n>=4&&/n'est pas un montant valable/.test(out.err)&&out.apres.modif&&out.apres.eur&&/Modifier la grille du/.test(out.edit.titre)&&out.edit.ro&&/31,5/.test(out.edit.val)&&out.final;
// ── r2) bouton ⌂ du chantier
await T(()=>{const Tr=window.TRACE;const id=Object.keys(Tr.sites).find(k=>k!=='__vide'&&Tr.sites[k]&&Tr.sites[k].lines);Tr.switchSite?Tr.switchSite(id):null;});await W(300);
await T(()=>{const c=document.querySelector('.siteCard[data-open]');if(c)c.click();else{document.getElementById('htSites').click();}});await W(1200);
await T(()=>{const c=document.querySelector('.siteCard[data-open]');if(c&&window.TRACE.state.screen!=='site')c.click();});await W(1200);
out={screen:await T(()=>window.TRACE.state.screen),btn:await T(()=>{const b=document.getElementById('btnHome');if(!b)return null;const r=b.getBoundingClientRect();return {w:Math.round(r.width),h:Math.round(r.height),aria:b.getAttribute('aria-label')||b.title||''};})};
await T(()=>{const b=document.getElementById('btnHome');if(b)b.click();});await W(800);out.apres=await T(()=>({screen:window.TRACE.state.screen,tab:window.TRACE.state.homeTab}));
console.log('r2)',J(out));C.r2=out.screen==='site'&&!!out.btn&&out.btn.w>=40&&out.btn.h>=40&&/Retour à la liste des chantiers/.test(out.btn.aria)&&out.apres.screen==='home';
// ── r3) accueil du Concepteur
await T(()=>window.TRACE.concepteur.home());await W(400);
out=await T(()=>{const m=document.querySelector('#modal.show');if(!m)return null;return {h:(m.querySelector('h3')||{}).textContent||'',rows:m.querySelectorAll('.cc-row').length,chantier:m.querySelectorAll('[data-ccs]').length,nouveau:!!m.querySelector('#cc-new'),heads:[...m.querySelectorAll('.cc-h')].map(x=>x.textContent)};});
await T(()=>{const q=document.getElementById('cc-q');q.value='zzzz';q.dispatchEvent(new Event('input',{bubbles:true}));});await W(150);const vis0=await T(()=>[...document.querySelectorAll('#modal .cc-row')].filter(r=>r.style.display!=='none').length);
await T(()=>{const q=document.getElementById('cc-q');q.value='';q.dispatchEvent(new Event('input',{bubbles:true}));const b=document.querySelector('#modal [data-ccs]');if(b)b.click();});await W(1200);
const scr=await T(()=>window.TRACE.state.screen);
console.log('r3)',J({...out,vis0,scr}));C.r3=!!out&&/Tracé Concepteur/.test(out.h)&&out.rows>=1&&out.chantier>=1&&out.nouveau&&out.heads.some(h=>/Chantiers/.test(h))&&out.heads.some(h=>/Études/.test(h))&&vis0===0&&scr==='site';
// ── r5) PC sans affichage large choisi : rien ne change
const pc2=await browser.newContext({viewport:{width:1280,height:900}});const p2=await pc2.newPage();await prep(p2);const pcWide=await p2.evaluate(()=>document.getElementById('app').classList.contains('wide'));await pc2.close();
// ── r4) pliable déplié
const fold=await browser.newContext({viewport:{width:820,height:1180},hasTouch:true,isMobile:true});const pf=await fold.newPage();await prep(pf);const TF=(f,a)=>pf.evaluate(f,a);
out={wide:await TF(()=>document.getElementById('app').classList.contains('wide'))};
await TF(()=>{const Tr=window.TRACE;Tr.state.userId='karim';Tr.renderHome();document.getElementById('htHome').click();});await pf.waitForTimeout(700);
out.bureau=await TF(()=>!!document.querySelector('[data-bureau3d] [data-v="monde|vue|acc|3d"]'));
const ecrans=['htHome','htSites','htEspace','htRh','htExpl'];out.debord={};
for(const id of ecrans){await TF(i=>{const b=document.getElementById(i);if(b&&b.style.display!=='none')b.click();},id);await pf.waitForTimeout(600);out.debord[id]=await TF(()=>document.documentElement.scrollWidth-window.innerWidth);}
await TF(()=>{const Tr=window.TRACE;Tr.state.userId='ethan';Tr.renderHome();});await pf.waitForTimeout(400);
for(const id of ['htParc','htAff','htExpl']){await TF(i=>{const b=document.getElementById(i);if(b&&b.style.display!=='none')b.click();},id);await pf.waitForTimeout(700);out.debord[id+'_e']=await TF(()=>document.documentElement.scrollWidth-window.innerWidth);}
await TF(()=>{const Tr=window.TRACE;Tr.state.userId='karim';Tr.renderHome();document.getElementById('htHome').click();});await pf.waitForTimeout(500);
await TF(()=>{const b=document.querySelector('[data-bureau3d] [data-v="monde|vue|acc|3d"]');if(b)b.click();});await pf.waitForTimeout(2500);
out.scene=await TF(()=>({canvas:!!document.querySelector('#homeBody canvas'),classique:!!document.querySelector('[data-v="monde|vue|acc|classique"]')}));
await pf.setViewportSize({width:390,height:844});for(let i=0;i<10;i++){await pf.waitForTimeout(500);if(!(await TF(()=>document.getElementById('app').classList.contains('wide'))))break;}out.replie=await TF(()=>document.getElementById('app').classList.contains('wide')); /* la 3D logicielle (sans carte graphique) ralentit le redessin */
console.log('r4)',J({...out,pcWide}));
C.r4=out.wide&&out.bureau&&Object.values(out.debord).every(v=>v<=1)&&out.scene.classique&&!out.replie;
C.r5=pcWide===false;
C.r6=!logs.length;if(logs.length)console.log('logs',J(logs.slice(0,4)));
const ko=Object.keys(C).filter(k=>!C[k]);console.log('RESULTAT',J(C),ko.length?'ECHEC '+ko.join(','):'TOUT VERT');await browser.close();
