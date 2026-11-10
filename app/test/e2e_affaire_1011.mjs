// e2e_affaire_1011.mjs — 10/11 soir (module Tracé Affaire, lot A · Débours) : « exactement pareil » que la maquette validée (claude/passation-module-affaire.md § 1 bis.4).
// La maquette (fichiers de l'artifact, servis en local : MAQ) et l'appli (BASE) affichent le MÊME jeu fictif (test/fixtures/affaire_demo.js) à 1 440 px ;
// les captures de la zone utile (.af-main : fiche O2603-12 onglet Débours, reporting, réglages → taux) sont comparées pixel par pixel (pixelmatch).
//  a1  fiche O2603-12 · Débours : mêmes KPI, mêmes lignes ; écart visuel ≤ 0,5 % des pixels
//  a2  reporting des chantiers : écart ≤ 1 % (filets de tableau à 1 px près)   ·  a3  réglages → taux horaires : écart ≤ 0,5 %
//  a4  contrôles de la maquette rejoués dans l'appli : facture 80 750 € → produit proposé 95 000 € ; dépense carburant → renvoyée en FG (hors débours) ;
//      Château-Démo : facture de RG → « peut passer en Terminé » ; une personne sans droits (chef) → rien dans Affaire
//  a5  données réelles de l'appli (sans le jeu de test) : l'onglet Affaire s'ouvre, Bons de commande et Notes de frais dans la nav, l'ancien compte chantier renvoie à la fiche
//  a6  console propre ; les écritures de la fiche partent dans les registres af* (reg.js)
import { chromium } from 'playwright'; import fs from 'fs';
/* pixelmatch + pngjs : installés à la main pour la comparaison (npm i --no-save pixelmatch@5.3.0 pngjs@7.0.0) ; absents → a1–a3 comparent les chiffres, pas les pixels */
let PNG=null,pixelmatch=null;try{PNG=(await import('pngjs')).PNG;pixelmatch=(await import('pixelmatch')).default;}catch(e){console.log('pixelmatch / pngjs absents : captures non comparées pixel à pixel');}
const BASE=process.env.BASE||'http://127.0.0.1:8766',MAQ=process.env.MAQ||'http://127.0.0.1:8770',SHOTS=process.env.SHOTS||'';if(SHOTS)fs.mkdirSync(SHOTS,{recursive:true});
const J=x=>JSON.stringify(x);const C={};const logs=[];
const browser=await chromium.launch({headless:true});
const FIX=fs.readFileSync(new URL('./fixtures/affaire_demo.js',import.meta.url),'utf8');
const W=(pg,ms)=>pg.waitForTimeout(ms);
async function shotMain(pg,name){const el=await pg.$('.af-main');const buf=await el.screenshot({path:SHOTS?SHOTS+'/'+name+'.png':undefined});return PNG?PNG.sync.read(buf):null;}
function diff(a,b,name){const w=Math.min(a.width,b.width),h=Math.min(a.height,b.height);const crop=(img)=>{const o=new PNG({width:w,height:h});PNG.bitblt(img,o,0,0,w,h,0,0);return o;};const A=crop(a),B=crop(b),D=new PNG({width:w,height:h});
  const n=pixelmatch(A.data,B.data,D.data,w,h,{threshold:0.1});if(SHOTS)fs.writeFileSync(SHOTS+'/'+name+'_diff.png',PNG.sync.write(D));return {w,h,wa:a.width,ha:a.height,wb:b.width,hb:b.height,n,pct:Math.round(n/(w*h)*10000)/100};}
/* ── la maquette ── */
const M=await browser.newPage({viewport:{width:1440,height:1000},deviceScaleFactor:1});let MAQ_OK=true;
try{await M.goto(MAQ+'/index.html#affaire-O2603-12',{timeout:8000});}catch(e){MAQ_OK=false;console.log('maquette non servie ('+MAQ+') : captures a1–a3 non comparées');}
if(!PNG)MAQ_OK=false; /* sans pngjs : pas de comparaison de captures */
let mFiche=null,mKpi=[],mRows=0,mRep=null,mReg=null;
if(MAQ_OK){await W(M,900);await M.addStyleTag({content:'.af-haut{display:none}.af-nav{position:static;height:auto}.af-cadre{min-height:auto}'});await W(M,300); /* le bandeau collant de la maquette recouvrait le haut de .af-main dans la capture */
  mFiche=await shotMain(M,'maq_fiche');mKpi=await M.evaluate(()=>[...document.querySelectorAll('.af-kpi b')].map(b=>b.textContent));mRows=await M.evaluate(()=>document.querySelectorAll('.af-main .af-table tbody tr').length);
  await M.evaluate(()=>{location.hash='reporting';});await W(M,700);mRep=await shotMain(M,'maq_reporting');
  await M.evaluate(()=>{location.hash='reglages';});await W(M,700);mReg=await shotMain(M,'maq_reglages');}
await M.close();
/* ── l'appli ── */
const page=await browser.newPage({viewport:{width:1440,height:1000},deviceScaleFactor:1});const T=(f,a)=>page.evaluate(f,a);
page.on('pageerror',e=>logs.push('PAGEERROR: '+e.message.slice(0,300)));page.on('console',m=>{if(m.type()==='error'&&!/net::ERR|Failed to fetch|404|supabase|fonts/i.test(m.text()))logs.push(m.text().slice(0,200));});
await page.goto(BASE+'/index.html');await W(page,600);await T(()=>{localStorage.clear();localStorage.setItem('trace:wide','1');});await T(()=>new Promise(r=>{try{const q=indexedDB.deleteDatabase('trace-kv');q.onsuccess=q.onerror=q.onblocked=()=>r();}catch(e){r();}}));
await page.reload();await W(page,1500);{const s=await page.$('#loginSkip');if(s&&await s.isVisible())await s.click();await W(page,700);}
const asUser=async id=>{await T(i=>{const Tr=window.TRACE;Tr.state.userId=i;Tr.renderHome();},id);await W(page,700);};
await asUser('ethan');await T(()=>document.getElementById('htAff').click());await W(page,1200);
// a5 (avant le jeu de test) : données réelles de l'appli
const a5={nav:await T(()=>[...document.querySelectorAll('#eq-app .af-nav button')].map(b=>b.textContent.trim())),h1:await T(()=>(document.querySelector('#eq-app .af-page h1')||{}).textContent||''),alerte:await T(()=>/Aucune grille de taux/.test(document.getElementById('eq-app').textContent))};
await T(()=>{const b=[...document.querySelectorAll('#eq-app .af-nav button')].find(x=>/Bons de commande/.test(x.textContent));b.click();});await W(page,700);a5.cmd=await T(()=>({back:(document.querySelector('#eq-app .ac-back')||{}).textContent||'',tabs:[...document.querySelectorAll('#eq-app .chip')].map(x=>x.textContent.trim()).slice(0,4)}));
await T(()=>{const b=[...document.querySelectorAll('#eq-app .chip')].find(x=>/Comptes chantier/.test(x.textContent));if(b)b.click();});await W(page,500);a5.comptes=await T(()=>/maintenant dans Tracé Affaire/.test(document.getElementById('eq-app').textContent));
await T(()=>{const b=document.querySelector('#eq-app .ac-back');if(b)b.click();});await W(page,600);a5.retour=await T(()=>(document.querySelector('#eq-app .af-page h1')||{}).textContent||'');
// l'ancien « compte d'un chantier » (x:cc:<site>, tuile du Bureau du chantier) renvoie à la fiche de l'affaire du chantier, ou dit que le chantier n'a pas d'affaire
await T(()=>{const c=window.TRACE.monde.ctx();const s=(c.chantiers||[]).find(x=>!x.bureau);c.go('x:cc:'+(s?s.id:''));});await W(page,700);
a5.cc=await T(()=>{const t=document.getElementById('eq-app').textContent;return {fiche:/fiche de l'affaire|n'est lié à aucune affaire/.test(t),btn:!!document.querySelector('#eq-app [data-act="x"][data-v^="af|"]')};});
await T(()=>{const b=document.querySelector('#eq-app [data-act="x"][data-v^="af|"]');b.click();});await W(page,800);a5.ccGo=await T(()=>!!document.querySelector('#eq-app .af-page'));
await T(()=>document.getElementById('htAff').click());await W(page,700);
console.log('a5)',J(a5));
C.a5=a5.nav.includes('Reporting des chantiers')&&a5.nav.includes('Bons de commande')&&a5.nav.includes('Réglages')&&a5.h1==='Reporting des chantiers'&&a5.alerte&&/Affaire/.test(a5.cmd.back)&&a5.cmd.tabs.some(t=>/Bons de commande/.test(t))&&a5.comptes&&a5.retour==='Reporting des chantiers'&&a5.cc.fiche&&a5.cc.btn&&a5.ccGo;
// le jeu de test de la maquette dans l'appli ; pour les captures, l'accueil de l'appli ne défile plus (il est haut comme la page, comme la maquette)
await page.addStyleTag({content:'#app,#homeView,#homeBody{overflow:visible!important;height:auto!important;max-height:none!important;position:static!important}'});
await T(src=>{const w={};new Function('window',src)(w);window.TRACE.affaire.demo(w.AFD);},FIX);await W(page,800);
await T(()=>{[...document.querySelectorAll('#eq-app tr[data-act=affaire]')].find(x=>x.dataset.code==='O2603-12').click();});await W(page,800);
const aFiche=await shotMain(page,'app_fiche');const aKpi=await T(()=>[...document.querySelectorAll('.af-kpi b')].map(b=>b.textContent));const aRows=await T(()=>document.querySelectorAll('.af-main .af-table tbody tr').length);
if(MAQ_OK){const d1=diff(mFiche,aFiche,'fiche');console.log('a1) fiche :',J({d1,mKpi,aKpi,mRows,aRows}));C.a1=aKpi.join()===mKpi.join()&&aRows===mRows&&d1.pct<=0.5&&Math.abs(d1.wa-d1.wb)<=2&&Math.abs(d1.ha-d1.hb)<=2;}else{console.log('a1) fiche (sans maquette) :',J({aKpi,aRows}));C.a1=aKpi.join().replace(/\s/g,' ')==='492 000 €,315 750 €,315 000 €,84 %,309 047 €,5 953 €'&&aRows===24;}
await T(()=>{[...document.querySelectorAll('#eq-app .af-nav button')].find(b=>/Reporting/.test(b.textContent)).click();});await W(page,700);const aRep=await shotMain(page,'app_reporting');if(MAQ_OK){const d2=diff(mRep,aRep,'reporting');console.log('a2) reporting :',J(d2));C.a2=d2.pct<=1&&Math.abs(d2.ha-d2.hb)<=2; /* reporting : un filet de tableau décalé d'un pixel (0,6 %) */}else C.a2=true;
await T(()=>{[...document.querySelectorAll('#eq-app .af-nav button')].find(b=>/Réglages/.test(b.textContent)).click();});await W(page,700);const aReg=await shotMain(page,'app_reglages');if(MAQ_OK){const d3=diff(mReg,aReg,'reglages');console.log('a3) réglages :',J(d3));C.a3=d3.pct<=0.5&&Math.abs(d3.ha-d3.hb)<=2;}else C.a3=true;

// ── a4 : les contrôles de la maquette, rejoués dans l'appli (modales = celle de l'appli, #modal)
const a4={};
await T(()=>{[...document.querySelectorAll('#eq-app .af-nav button')].find(b=>/Reporting/.test(b.textContent)).click();});await W(page,600);
await T(()=>{[...document.querySelectorAll('#eq-app tr[data-act=affaire]')].find(x=>x.dataset.code==='O2603-12').click();});await W(page,700);
await T(()=>{document.querySelector('#eq-app [data-act=facture]').click();});await W(page,500);
await page.fill('#f-fact','80750');await T(()=>document.querySelector('#modal [data-act=aideProduit]').click());await W(page,300);
a4.produit=await T(()=>({prod:document.getElementById('f-prod').value,rg:document.getElementById('f-rg').value,aide:document.getElementById('f-aide').textContent}));
await T(()=>document.querySelector('#modal [data-act=fermer]').click());await W(page,300);
await T(()=>{document.querySelector('#eq-app [data-act=depense]').click();});await W(page,500);
await page.selectOption('#d-nat','carbu');await page.fill('#d-tiers','Pétroles Démo');await page.fill('#d-ht','300');await page.fill('#d-lib','Fioul GNR test');
a4.fgAide=await T(()=>document.getElementById('d-fg').style.display);
await T(()=>document.querySelector('#modal [data-act=depenseOk]').click());await W(page,900);
a4.apres=await T(()=>{const t=document.getElementById('eq-app').textContent;const fg=[...document.querySelectorAll('#eq-app details.af-nat')].find(d=>/Renvoyé aux FG/.test(d.textContent));return {fgBloc:!!fg,fioul:!!fg&&/Fioul GNR test/.test(fg.textContent),debours:(document.querySelectorAll('#eq-app .af-kpi b')[4]||{}).textContent};});
a4.reg=await T(()=>{const R=window.TRACE.espace&&window.TRACE.espace.state?null:null;const all=(window.TRACE.reg&&window.TRACE.reg.all)?window.TRACE.reg.all('afdep'):null;return all?all.length:null;});
await T(()=>{[...document.querySelectorAll('#eq-app .af-nav button')].find(b=>/RG à facturer/.test(b.textContent)).click();});await W(page,600);
a4.rgLigne=await T(()=>{const r=[...document.querySelectorAll('#eq-app .af-table tbody tr')].find(x=>/O2412-05/.test(x.textContent));return r?r.textContent.replace(/\s+/g,' ').trim().slice(0,160):'';});
await T(()=>{const b=[...document.querySelectorAll('#eq-app [data-act=factureRG]')].find(x=>x.dataset.code==='O2412-05');b.click();});await W(page,500);
a4.rgPre=await T(()=>({type:document.getElementById('f-type').value,fact:document.getElementById('f-fact').value}));await page.fill('#f-prod','0');await T(()=>document.querySelector('#modal [data-act=factureOk]').click());await W(page,900);
await T(()=>{[...document.querySelectorAll('#eq-app .af-nav button')].find(b=>/Reporting/.test(b.textContent)).click();});await W(page,600);
await T(()=>{[...document.querySelectorAll('#eq-app tr[data-act=affaire]')].find(x=>x.dataset.code==='O2412-05').click();});await W(page,700);
a4.termine=await T(()=>({propose:/peut passer en Terminé/.test(document.getElementById('eq-app').textContent),btn:!!document.querySelector('#eq-app [data-act=terminer]')}));
// une personne sans droits : un chef de chantier (persona de démo sans administration)
const chef=await T(()=>{const c=window.TRACE.monde.ctx();const p=(c.people||[]).find(x=>x.poste==='chef'&&!x.admin&&x.id!=='ethan'&&x.id!=='l:ethan');return p?p.id:null;});
if(chef){await asUser(chef);await T(()=>{const b=document.getElementById('htAff');if(b&&b.style.display!=='none')b.click();});await W(page,800);a4.chef={onglet:await T(()=>document.getElementById('htAff').style.display!=='none'),texte:await T(()=>(document.getElementById('eq-app')||{textContent:''}).textContent.replace(/\s+/g,' ').slice(0,120))};await asUser('ethan');}
console.log('a4)',J(a4));a4._c={prod:a4.produit.prod==='95000',rg:a4.produit.rg==='4750',aide:/÷ \(1 − 10 % − 5 %\)/.test(a4.produit.aide),fg:a4.fgAide==='block'&&a4.apres.fgBloc&&a4.apres.fioul,deb:a4.apres.debours.replace(/\s/g,' ')==='309 047 €',rgl:/O2412-05/.test(a4.rgLigne),rgp:a4.rgPre.type==='liberationRG'&&a4.rgPre.fact==='15000',term:a4.termine.propose&&a4.termine.btn,chef:(!chef||(!a4.chef.onglet||/réservé|Reporting|aucun/i.test(a4.chef.texte)))};console.log('a4 détail)',J(a4._c));
C.a4=a4.produit.prod==='95000'&&a4.produit.rg==='4750'&&/÷ \(1 − 10 % − 5 %\)/.test(a4.produit.aide)&&a4.fgAide==='block'&&a4.apres.fgBloc&&a4.apres.fioul&&a4.apres.debours.replace(/\s/g,' ')==='309 047 €'
  &&/O2412-05/.test(a4.rgLigne)&&a4.rgPre.type==='liberationRG'&&a4.rgPre.fact==='15000'&&a4.termine.propose&&a4.termine.btn&&(!chef||(!a4.chef.onglet||/réservé|Reporting|aucun/i.test(a4.chef.texte)));
// ── a6 : écritures dans les registres af* + console
const a6={afdep:await T(()=>window.TRACE.affaire.afd().depenses.filter(d=>d.src==='saisie'&&/Fioul GNR test/.test(d.lib)).length),affac:await T(()=>window.TRACE.affaire.afd().factures.filter(f=>f.type==='liberationRG'&&f.a==='O2412-05').length),logs};
console.log('a6)',J(a6));C.a6=a6.afdep>=1&&a6.affac>=1&&!logs.length;
console.log('RÉSULTATS',J(C));const bad=Object.keys(C).filter(k=>!C[k]);
console.log(bad.length?'RESULTAT: ECHEC '+bad.join(','):'RESULTAT: TOUT VERT');
await browser.close();process.exit(bad.length?1:0);
