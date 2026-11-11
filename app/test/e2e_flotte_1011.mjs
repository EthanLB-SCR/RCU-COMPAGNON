// e2e_flotte_1011.mjs — 10/11 nuit (module Tracé Flotte, lots F1 + F2) : « exactement pareil » que la maquette validée (claude/passation-module-flotte.md § 2.4).
// La maquette (fichiers de l'artifact, servis en local : MAQ, sans le paquet 3D) et l'appli (BASE) affichent le MÊME jeu fictif (test/fixtures/flotte_demo.js) à 1 440 px ;
// les captures de la zone utile (.af-main) sont comparées pixel par pixel (pixelmatch), vignettes masquées des deux côtés (maquette : vignette 3D ; appli en attendant
// le lot F4 : la photo, sinon le dessin du type) et bouton d'aide « ? » de l'appli masqué.
//  f1  accueil, calendrier (novembre 2026), véhicules, mouvements à traiter, qui a quoi, journal : écart ≤ 1 % des pixels, mêmes hauteurs à 2 px près
//  f2  contrôles de la maquette rejoués dans l'appli (jeu fictif) : « Traiter » → Mouvements ; « Toutes » = 27 véhicules ; recherche « master » = 4 lignes ; échéance CT en
//      retard → « Programmer le rendez-vous » crée le RDV ; mois suivant ; vue Liste ; filtre Vidange ; RDV CT « Fait » → prochain CT à +2 ans et plus d'alerte CT
//  f3  données réelles de l'appli : Parc → Flotte s'ouvre sur le module ; « ➕ Véhicule » (écran existant) crée la fiche → Véhicules ; fiche → « Fiche complète (modifier) »
//      = l'ancienne fiche ; programmer une intervention (enregistrée sur la fiche, registre vehicule) ; « Ancien écran Flotte » et retour
//  f4  console propre
import { chromium } from 'playwright'; import fs from 'fs';
let PNG=null,pixelmatch=null;try{PNG=(await import('pngjs')).PNG;pixelmatch=(await import('pixelmatch')).default;}catch(e){console.log('pixelmatch / pngjs absents : captures non comparées pixel à pixel');}
const BASE=process.env.BASE||'http://127.0.0.1:8766',MAQ=process.env.MAQF||'http://127.0.0.1:8771',SHOTS=process.env.SHOTS||'';if(SHOTS)fs.mkdirSync(SHOTS,{recursive:true});
const J=x=>JSON.stringify(x);const C={};const logs=[];
const browser=await chromium.launch({headless:true});const FIX=fs.readFileSync(new URL('./fixtures/flotte_demo.js',import.meta.url),'utf8');const W=(pg,ms)=>pg.waitForTimeout(ms);
const HIDE='.fl-vign{visibility:hidden!important}.tuHelp{display:none!important}';
async function shot(pg,name){const el=await pg.$('.af-main');const buf=await el.screenshot({path:SHOTS?SHOTS+'/'+name+'.png':undefined});return PNG?PNG.sync.read(buf):null;}
function diff(a,b,name){const w=Math.min(a.width,b.width),h=Math.min(a.height,b.height);const crop=img=>{const o=new PNG({width:w,height:h});PNG.bitblt(img,o,0,0,w,h,0,0);return o;};const A=crop(a),B=crop(b),D=new PNG({width:w,height:h});
  const n=pixelmatch(A.data,B.data,D.data,w,h,{threshold:0.1});if(SHOTS)fs.writeFileSync(SHOTS+'/'+name+'_diff.png',PNG.sync.write(D));return {wa:a.width,ha:a.height,wb:b.width,hb:b.height,n,pct:Math.round(n/(w*h)*10000)/100};}
const PAGES=['accueil','calendrier','vehicules','mouvements','qui','journal'];
/* ── la maquette ── */
const M=await browser.newPage({viewport:{width:1440,height:1000},deviceScaleFactor:1});let MAQ_OK=!!PNG;const mm={};
try{await M.goto(MAQ+'/index.html#accueil',{timeout:8000});}catch(e){MAQ_OK=false;console.log('maquette non servie ('+MAQ+') : captures non comparées');}
if(MAQ_OK)for(const p of PAGES){await M.goto(MAQ+'/index.html#'+p);await W(M,500);await M.addStyleTag({content:'.af-haut{display:none}.af-nav{position:static;height:auto}.af-cadre{min-height:auto}'+HIDE});await W(M,200);mm[p]=await shot(M,'maq_'+p);}
await M.close();
/* ── l'appli ── */
const page=await browser.newPage({viewport:{width:1440,height:1000},deviceScaleFactor:1});const T=(f,a)=>page.evaluate(f,a);
page.on('pageerror',e=>logs.push('PAGEERROR: '+e.message.slice(0,300)));page.on('console',m=>{if(m.type()==='error'&&!/net::ERR|Failed to fetch|404|supabase|fonts/i.test(m.text()))logs.push(m.text().slice(0,200));});
page.on('dialog',d=>d.accept().catch(()=>{}));
await page.route(u=>/geopf|geo\.api|open-meteo/.test(u.hostname),r=>r.fulfill({status:200,contentType:'application/json',body:'{}'}));
await page.clock.install({time:new Date(2026,10,10,9,0,0)}); /* mardi 10/11/2026, comme la maquette */
await page.goto(BASE+'/index.html');await W(page,600);await T(()=>{localStorage.clear();localStorage.setItem('trace:wide','1');});await T(()=>new Promise(r=>{try{const q=indexedDB.deleteDatabase('trace-kv');q.onsuccess=q.onerror=q.onblocked=()=>r();}catch(e){r();}}));
await page.reload();await W(page,1500);{const s=await page.$('#loginSkip');if(s&&await s.isVisible())await s.click();await W(page,700);}
await T(()=>{const Tr=window.TRACE;Tr.state.userId='ethan';Tr.renderHome();});await W(page,500);await T(()=>document.getElementById('htParc').click());await W(page,900);
const nav=h=>T(x=>{const b=document.querySelector('#eq-app .af-nav [data-h="'+x+'"]');if(b)b.click();},h).then(()=>W(page,600));
const txt=()=>T(()=>(document.getElementById('eq-app')||document.body).textContent.replace(/\s+/g,' '));
// ── f3 (avant le jeu de test) : données réelles de l'appli
const f3={root:await T(()=>!!document.querySelector('#eq-app .fl-root')),nav:await T(()=>[...document.querySelectorAll('#eq-app .af-nav button')].map(b=>b.textContent.trim()))};
await nav('vehicules');await T(()=>{const b=[...document.querySelectorAll('#eq-app .af-titre button')].find(x=>/Véhicule/.test(x.textContent));b.click();});await W(page,500);
f3.ask=await T(()=>!!document.querySelector('#modal input, .modal input, [role=dialog] input'));
await T(()=>{const i=document.querySelector('#modal input, .modal input, [role=dialog] input');i.value='ZZ-901-ZZ';const b=[...document.querySelectorAll('#modal button, .modal button, [role=dialog] button')].find(x=>/Créer/.test(x.textContent));b.click();});await W(page,900);
f3.ficheApres=await T(()=>{const t=document.getElementById('eq-app').textContent;return /ZZ-901-ZZ/.test(t);});
await nav('vehicules');f3.liste=await T(()=>[...document.querySelectorAll('#eq-app .af-main tbody tr')].map(r=>r.textContent.replace(/\s+/g,' ').trim()).filter(t=>/ZZ-901-ZZ/.test(t)).length);
await T(()=>{const r=[...document.querySelectorAll('#eq-app .af-main tbody tr')].find(x=>/ZZ-901-ZZ/.test(x.textContent));r.click();});await W(page,600);
f3.fiche=await T(()=>({h1:(document.querySelector('#eq-app .fl-id h1')||{}).textContent||'',onglets:[...document.querySelectorAll('#eq-app .af-onglets button')].map(b=>b.textContent.trim())}));
await T(()=>{const b=[...document.querySelectorAll('#eq-app .fl-id__act button')].find(x=>/Fiche complète/.test(x.textContent));b.click();});await W(page,600);
f3.ancienne=await T(()=>{const a=document.querySelector('#eq-app .fl-ancienne');return a?{n:a.textContent.length,fil:(document.querySelector('#eq-app .af-fil')||{}).textContent||''}:null;});
await T(()=>{const b=document.querySelector('#eq-app [data-act=ficheNouvelle]');if(b)b.click();});await W(page,500);
// programmer une intervention sur ZZ-901-ZZ (fenêtre du module, enregistrée sur la fiche)
await T(()=>{const b=[...document.querySelectorAll('#eq-app .fl-id__act button')].find(x=>/Programmer/.test(x.textContent));b.click();});await W(page,400);
await T(()=>{document.getElementById('rv-date').value='2026-11-20';document.getElementById('rv-type').value='vidange';document.getElementById('rv-garage').value='Garage fictif';const b=[...document.querySelectorAll('.fl-root .af-fenetre button')].find(x=>/^\s*Programmer\s*$/.test(x.textContent));b.click();});await W(page,700);
f3.rdv=await T(()=>{const v=window.TRACE.flotte.get('ZZ-901-ZZ');return (v&&v.rdv||[]).map(r=>r.date+'|'+r.type+'|'+r.garage);});
// l'ancien écran, et retour
await T(()=>{const b=document.querySelector('#eq-app [data-v="fl|ancien|1"]');b.click();});await W(page,700);
f3.ancien=await T(()=>({root:!!document.querySelector('#eq-app .fl-root'),chips:[...document.querySelectorAll('#eq-app .chip')].map(c=>c.textContent.trim()).filter(t=>/Véhicules|Échéances/.test(t)).length,retour:!!document.querySelector('#eq-app [data-v="fl|ancien|0"]')}));
await T(()=>{const b=document.querySelector('#eq-app [data-v="fl|ancien|0"]');if(b)b.click();});await W(page,700);f3.nouveau=await T(()=>!!document.querySelector('#eq-app .fl-root'));
console.log('f3) données réelles :',J(f3));
C.f3=f3.root&&f3.nav.includes('Accueil')&&f3.nav.includes('Véhicules')&&f3.nav.some(t=>/À traiter/.test(t))&&f3.ask&&f3.ficheApres&&f3.liste===1&&f3.fiche.h1!==undefined&&f3.fiche.onglets.length===5&&f3.ancienne&&f3.ancienne.n>200&&/Fiche complète/.test(f3.ancienne.fil)
  &&J(f3.rdv)===J(['2026-11-20|vidange|Garage fictif'])&&!f3.ancien.root&&f3.ancien.chips>=2&&f3.ancien.retour&&f3.nouveau;
// ── le jeu de la maquette dans l'appli ; l'accueil de l'appli ne défile plus (haut comme la page, comme la maquette)
await page.addStyleTag({content:'#app,#homeView,#homeBody{overflow:visible!important;height:auto!important;max-height:none!important;position:static!important}'+HIDE});
await T(src=>{new Function(src)();window.TRACE.flotteM.demo(window.__FLDEMO);},FIX);await W(page,800);
// ── f1 : captures
const res={};for(const p of PAGES){await nav(p);await W(page,200);const a=await shot(page,'app_'+p);if(MAQ_OK)res[p]=diff(mm[p],a,p);}
console.log('f1) écarts (% des pixels) :',J(Object.fromEntries(Object.entries(res).map(([k,v])=>[k,[v.pct,v.ha,v.hb]]))));
C.f1=!MAQ_OK||PAGES.every(p=>res[p]&&res[p].pct<=1&&Math.abs(res[p].ha-res[p].hb)<=2);
// ── f2 : contrôles de la maquette
const f2={};await nav('accueil');await T(()=>{const b=[...document.querySelectorAll('#eq-app .fl-mvalerte button')].find(x=>/Traiter/.test(x.textContent));b.click();});await W(page,500);
f2.traiter=await T(()=>(document.querySelector('#eq-app .af-titre h1')||{}).textContent||'');
await T(()=>{const s=document.querySelector('#eq-app select[data-chg=agence]');s.value='';s.dispatchEvent(new Event('change',{bubbles:true}));});await W(page,500);await nav('vehicules');
f2.toutes=await T(()=>document.querySelectorAll('#eq-app .af-main tbody tr').length);
await T(()=>{const i=document.querySelector('#eq-app [data-in=vehQ]');i.value='master';i.dispatchEvent(new Event('input',{bubbles:true}));});await W(page,700);f2.master=await T(()=>document.querySelectorAll('#eq-app .af-main tbody tr').length);
await T(()=>{const i=document.querySelector('#eq-app [data-in=vehQ]');i.value='';i.dispatchEvent(new Event('input',{bubbles:true}));});await W(page,500);
await nav('calendrier');await T(()=>{const b=document.querySelector('#eq-app .fl-cote [data-act=calEv][data-immat="FL-102-AA"][data-k=ct]');b.click();});await W(page,500);
f2.fen=await T(()=>(document.querySelector('.fl-root .af-fenetre h2')||{}).textContent||'');
await T(()=>{const b=[...document.querySelectorAll('.fl-root .af-fenetre button')].find(x=>/Programmer le rendez-vous/.test(x.textContent));b.click();});await W(page,400);
await T(()=>{const b=[...document.querySelectorAll('.fl-root .af-fenetre button')].find(x=>/^\s*Programmer\s*$/.test(x.textContent));b.click();});await W(page,600);
f2.rdv=await T(()=>(window.TRACE.flotteM.fld().vehicules.find(v=>v.immat==='FL-102-AA').rdv||[]).map(r=>r.type+'|'+r.date));
await T(()=>{const b=document.querySelector('#eq-app [data-act=calNav][data-n="1"]');b.click();});await W(page,500);f2.mois=await T(()=>(document.querySelector('#eq-app .fl-calbar__mois')||{}).textContent||'');
await T(()=>{const b=document.querySelector('#eq-app [data-act=onglet][data-k=calVue][data-v=liste]');b.click();});await W(page,500);f2.liste=await T(()=>document.querySelectorAll('#eq-app .fl-liste tr.af-clic').length);
await T(()=>{['ct','rdv','restitution','contrat','pv'].forEach(k=>{const c=document.querySelector('#eq-app input[data-chg=calType][value="'+k+'"]');if(c&&c.checked)c.click();});});await W(page,600);
f2.vidange=await T(()=>[...document.querySelectorAll('#eq-app .fl-liste tr.af-clic')].map(r=>r.textContent).every(t=>/Vidange/.test(t)));
await T(()=>{['ct','rdv','restitution','contrat','pv'].forEach(k=>{const c=document.querySelector('#eq-app input[data-chg=calType][value="'+k+'"]');if(c&&!c.checked)c.click();});});await W(page,600);
/* le RDV CT de FL-102-AA → « Fait » : prochain CT à +2 ans, plus d'alerte CT */
const id=await T(()=>{const v=window.TRACE.flotteM.fld().vehicules.find(x=>x.immat==='FL-102-AA');return (v.rdv.find(r=>r.type==='ct'&&!r.fait)||{}).id;});
await T(i=>{const b=document.createElement('button');b.dataset.act='rdvFait';b.dataset.immat='FL-102-AA';b.dataset.id=i;b.className='fl-x';document.querySelector('#eq-app .fl-root').appendChild(b);b.click();},id);await W(page,600);
f2.ct=await T(()=>{const v=window.TRACE.flotteM.fld().vehicules.find(x=>x.immat==='FL-102-AA');return {prochain:v.ctProchain,alerte:window.FLC.alertes(v).some(a=>a.k==='ct')};});
console.log('f2) contrôles :',J(f2));
C.f2=f2.traiter==='Mouvements à traiter'&&f2.toutes===27&&f2.master===4&&/Contrôle technique/.test(f2.fen)&&f2.rdv.some(r=>/^ct\|2026-11-10$/.test(r))&&/décembre 2026/.test(f2.mois)&&f2.liste>5&&f2.vidange&&f2.ct.prochain==='2028-11-10'&&!f2.ct.alerte;
// ── f5 : téléphone (390 px) : pas de débordement horizontal, menu en ligne qui défile
await T(()=>document.querySelectorAll('style').forEach(s=>{if(/#homeBody\{overflow:visible/.test(s.textContent))s.remove();})); /* le style des captures (accueil sans défilement) retiré */
await page.setViewportSize({width:390,height:844});await W(page,400);const f5={};
for(const p of ['accueil','vehicules','mouvements','calendrier']){await nav(p);await W(page,300);f5[p]=await T(()=>{const m=document.querySelector('#eq-app .af-main');const r=m?m.getBoundingClientRect():null;return {sw:document.documentElement.scrollWidth,mainR:r?Math.round(r.right):0};});}
await page.screenshot({path:SHOTS?SHOTS+'/app_390_calendrier.png':undefined});
console.log('f5) 390 px :',J(f5));C.f5=Object.values(f5).every(x=>x.sw<=392&&x.mainR<=392);
console.log('f4) console :',J(logs));C.f4=!logs.length;
const bad=Object.keys(C).filter(k=>!C[k]);console.log(J(C));console.log(bad.length?'RESULTAT: ECHEC '+bad.join(','):'RESULTAT: TOUT VERT');
await browser.close();
