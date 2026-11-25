// e2e_tuto_nv_2411.mjs — 24/11/2026 (nuit) : TUTORIELS DES NOUVEAUTÉS hors RH et Flotte (Ethan, 24/11 au soir : « revois tous les tutos avec les nouveautés »).
// Démo hors connexion, données fictives, aujourd'hui mardi 01/12/2026.
//  n1  Planning de la semaine : le « ? » de la carte 📣 lance « Publier et envoyer le planning » ; semaine en cours puis semaine suivante (« 📣 Publier la semaine 50 » surligné) ;
//      le bouton de réglage n'est montré qu'à l'administrateur (étape absente pour un conducteur)
//  n2  vue « 📅 Grille » : TRACE.tuto.where() = pilotage:grille, le « ? » du titre la lance, chaque cible surlignée ; retour « 🏗 Par chantier » → pilotage:plan
//  n3  Compagnon → 🧰 Outils (Karim) : compagnon:outils, 5 outils surlignés, « ? » sur le titre de l'écran ; la vue d'ensemble de Compagnon reste à 8 étapes au plus
//  n4  Aujourd'hui en affichage large : l'étape « 🪑 Mon bureau en 3D » surligne le bouton ; au téléphone elle n'existe pas
//  n5  📚 : Pilotage (Publier…, Grille…), Compagnon (Outils), Ressources humaines (Navettes…), Flotte (Qui a quoi…) ; textes mis à jour (dossier « 3/5 », compteurs « Reporter / Prime »,
//      « Par module », trajets du pointage) ; l'assistant 💬 reçoit les nouveaux tutoriels selon le poste
//  n7  module Affaire : la fiche d'une affaire → affaire:fiche (chiffres, période, débours par nature, factures, dépense) ; Réglages → affaire:reglages (grilles de taux horaires)
//  n8  « 🔍 Ai-je la fourniture ? » : le « ? » de sa barre lance chantier:fzcheck (entourer, tableau, voir sur le plan, recommencer)
//  n6  console propre
import { chromium } from 'playwright';
const BASE=process.env.BASE||'http://127.0.0.1:8844';
const C={};const logs=[];const J=x=>JSON.stringify(x);
const browser=await chromium.launch({headless:true,executablePath:process.env.CHROMIUM_PATH||undefined});
let ctx,page;const wait=ms=>page.waitForTimeout(ms);
const open=async(vp,mobile,wide)=>{ctx=await browser.newContext(mobile?{viewport:vp,isMobile:true,hasTouch:true,deviceScaleFactor:1}:{viewport:vp});page=await ctx.newPage();
  page.on('pageerror',e=>logs.push('PAGEERROR: '+e.message.slice(0,300)));page.on('console',m=>{if(m.type()==='error'&&!/supabase|Failed to fetch|net::ERR|404|geopf|WebSocket|open-meteo|nominatim|fonts|ERR_/i.test(m.text()))logs.push(m.text().slice(0,200));});page.on('dialog',d=>d.accept().catch(()=>{}));
  await page.route(u=>/geopf|geo\.api|open-meteo/.test(u.hostname),r=>r.fulfill({status:200,contentType:'application/json',body:'{"type":"FeatureCollection","features":[]}'}));
  await page.clock.install({time:new Date(2026,11,1,8,30,0)});await page.goto(BASE+'/index.html');await wait(500);await page.evaluate(w=>{localStorage.clear();if(w)localStorage.setItem('trace:wide','1');},wide);
  await page.evaluate(()=>new Promise(r=>{try{const q=indexedDB.deleteDatabase('trace-kv');q.onsuccess=q.onerror=q.onblocked=()=>r();}catch(e){r();}}));await page.reload();await wait(1400);
  const s=await page.$('#loginSkip');if(s&&await s.isVisible())await s.click();await wait(600);};
const as=async(id,poste)=>{await page.evaluate(([id,poste])=>{const T=window.TRACE;if(poste!==undefined)T.demoPoste(id,poste||null);T.state.userId=id;T.showScreen('home');T.renderHome();document.getElementById('htHome').click();},[id,poste]);await wait(450);};
const tab=async id=>{await page.evaluate(id=>document.getElementById(id).click(),id);await wait(600);};
const xgo=async v=>{await page.evaluate(v=>{const e=document.querySelector(`#eq-app [data-act="xgo"][data-v="${v}"]`);if(e)e.click();},v);await wait(800);};
const click=async sel=>{const ok=await page.evaluate(s=>{const e=document.querySelector(s);if(!e)return false;e.click();return true;},sel);await wait(600);return ok;};
const where=()=>page.evaluate(()=>window.TRACE.tuto.where());
const card=()=>page.evaluate(()=>{const r=document.getElementById('tuto');if(!r)return null;const c=r.querySelector('.tutoCard'),h=r.querySelector('.tutoHole');const rc=c.getBoundingClientRect();
  return {mod:c.querySelector('.tutoMod').textContent,t:c.querySelector('.tutoT').textContent,hole:!!h&&getComputedStyle(h).display!=='none',in:rc.left>=0&&rc.right<=innerWidth+0.5&&rc.top>=0&&rc.bottom<=innerHeight+0.5,
    btn:Math.min(...[...c.querySelectorAll('button')].map(b=>b.getBoundingClientRect().height)),open:window.TRACE.tuto.open()};});
/* déroule le tutoriel ouvert : titre de chaque étape, surlignée ou au centre */
const run=async()=>{const out={steps:[],out:[],small:[],n:0};const c0=await card();if(!c0||!c0.open){out.err='pas ouvert';return out;}out.k=c0.open.k;out.n=c0.open.n;out.mod=c0.mod;
  for(let i=0;i<out.n;i++){await wait(130);const c=await card();if(!c)break;out.steps.push(c.t+(c.hole?' ◉':''));if(!c.in)out.out.push(c.t);if(c.btn<44)out.small.push(c.t);const b=await page.$('#tuto .tutoGo');if(!b)break;await b.click();}
  await wait(150);out.closed=!(await page.$('#tuto'));return out;};
const help=async(sel='#homeBody h2.vt .tuHelp')=>{const h=await page.$(sel);if(!h)return false;await h.click();await wait(300);return true;};
const ok=(r,sans=[])=>!r.err&&r.n>=3&&!r.out.length&&!r.small.length&&r.closed&&r.steps.every(s=>/ ◉$/.test(s)||sans.includes(s));
const show=r=>({k:r.k,n:r.n,err:r.err,steps:r.steps,out:r.out,small:r.small});
/* ── n1 / n2 : planning ── */
await open({width:390,height:844},true,false);
await as('ethan');await tab('htExpl');await xgo('plan');
const h1=await help('#eq-app .eq-plpub [data-tuto-k="pilotage:pub"]');const p1=await run();
await click('#eq-app [data-act="plweek"][data-v="1"]');const h1b=await help('#eq-app .eq-plpub [data-tuto-k="pilotage:pub"]');const p2=await run();
await as('sophie');await tab('htExpl');await xgo('plan');await click('#eq-app [data-act="plweek"][data-v="1"]');await help('#eq-app .eq-plpub [data-tuto-k="pilotage:pub"]');const p3=await run();
console.log('n1) publication :',J({h1,p1:show(p1),h1b,p2:show(p2),sophie:show(p3)}));
C.n1=h1&&h1b&&p1.k==='pilotage:pub'&&/^Tracé Pilotage · Publier et envoyer le planning/.test(p1.mod)&&ok(p1)&&ok(p2)&&p2.steps.includes('📣 Publier ◉')&&p2.steps.includes('Obligatoire ou libre ◉')
  &&p3.k==='pilotage:pub'&&!p3.steps.some(s=>/Obligatoire ou libre/.test(s))&&p3.n===p2.n-1;
await as('ethan');await tab('htExpl');await xgo('plan');await click('#eq-app [data-act="plvue"][data-v="grille"]');const w2=await where();const h2=await help();const g=await run();
await click('#eq-app [data-act="plvue"][data-v="chantiers"]');const w2b=await where();
console.log('n2) grille :',J({w2,h2,g:show(g),w2b}));
C.n2=w2==='pilotage:grille'&&h2&&g.k==='pilotage:grille'&&ok(g)&&w2b==='pilotage:plan';
/* ── n3 : outils ── */
await as('karim');await tab('htEspace');await click('#eq-app .eq-subs [data-v="outils"]');const w3=await where();const h3=await help();const o3=await run();
await click('#eq-app .eq-subs [data-v="moi"]');await page.evaluate(()=>window.TRACE.tuto.start('compagnon'));await wait(300);const co=await run();
console.log('n3) outils :',J({w3,h3,o3:show(o3),compagnon:co.steps}));
C.n3=w3==='compagnon:outils'&&h3&&o3.k==='compagnon:outils'&&ok(o3,['Sur ton téléphone'])&&o3.n===6&&co.n<=8 /* vue d'ensemble : 8 étapes au plus (règle des tutoriels de Compagnon) — les Outils ont leur tutoriel */;
/* téléphone : pas d'étape bureau 3D */
await as('karim');await page.evaluate(()=>window.TRACE.tuto.start('accueil'));await wait(300);const a390=await run();
await ctx.close();
/* ── n4 : affichage large ── */
await open({width:1280,height:900},false,true);await as('karim');await wait(500);
await page.evaluate(()=>window.TRACE.tuto.start('accueil'));await wait(300);const aL=await run();
console.log('n4) bureau 3D :',J({tel:a390.steps.filter(s=>/bureau/i.test(s)),large:aL.steps.filter(s=>/bureau/i.test(s)),n:[a390.n,aL.n]}));
C.n4=!a390.steps.some(s=>/Mon bureau en 3D/.test(s))&&aL.steps.includes('🪑 Mon bureau en 3D ◉')&&aL.n===a390.n+1;
/* ── n5 : catalogue, textes, assistant ── */
await page.evaluate(()=>window.TRACE.tuto.catalog());await wait(500);
const cat=await page.evaluate(()=>Object.fromEntries([...document.querySelectorAll('#modal .tuCatM')].map(m=>[m.querySelector('b').textContent.trim(),[...m.querySelectorAll('.tuCatI span')].map(s=>s.textContent)])));
await page.evaluate(()=>{const b=document.querySelector('#modal [data-close]');if(b)b.click();});
const keysApp=await page.evaluate(()=>window.TRACE.tuto.keys());
const txt=await page.evaluate(async()=>{const m=await Promise.resolve(window.TRACE.ia&&window.TRACE.ia.manuel?window.TRACE.ia.manuel():'');return m;});
const pick=(mod,re)=>(cat[mod]||[]).some(t=>re.test(t));
const textes=await page.evaluate(()=>{const T=window.TRACE;const all=[];['chantier:admin','chantier:bureau','rh:cpt','reglages','accueil','chantier:plan','pilotage:valid'].forEach(k=>{try{all.push(k+' '+JSON.stringify(T.tuto.steps?T.tuto.steps(k):''));}catch(e){}});return all.join(' ');});
await as('ethan');const manE=await page.evaluate(()=>window.TRACE.ia&&window.TRACE.ia.manuel?window.TRACE.ia.manuel():'');await as('karim');const manK=await page.evaluate(()=>window.TRACE.ia&&window.TRACE.ia.manuel?window.TRACE.ia.manuel():'');
const has=(m,t)=>m.indexOf(t)>=0;
const o5={cat:{pil:pick('Tracé Pilotage',/Publier et envoyer le planning/)&&pick('Tracé Pilotage',/Grille de la semaine/),co:pick('Tracé Compagnon',/Outils/),rh:pick('Tracé Ressources humaines',/Navettes/),fl:pick('Tracé Flotte',/Qui a quoi/)},
  keys:['pilotage:pub','pilotage:grille','compagnon:outils','rh:nav','flotte:qui'].every(k=>keysApp.includes(k)),
  manE:{pub:has(manE,'Publier et envoyer le planning'),nav:has(manE,'Tracé Ressources humaines · Navettes'),fl:has(manE,'Tracé Flotte · Qui a quoi'),dossier:has(manE,'(ex. 3/5)'),reporter:has(manE,'« ↪ Reporter » ou « 💶 Prime »')},
  manK:{outils:has(manK,'Tracé Compagnon · Outils'),pasNav:!has(manK,'Tracé Ressources humaines · Navettes'),abs:has(manK,'Tracé Ressources humaines · Absences et congés'),trajet:has(manK,'« 🚐 Début de trajet »')}};
console.log('n5) catalogue, textes, assistant :',J(o5));
C.n5=Object.values(o5.cat).every(Boolean)&&o5.keys&&Object.values(o5.manE).every(Boolean)&&Object.values(o5.manK).every(Boolean);
/* ── n7 : module Affaire (jeu fictif de la maquette, test/fixtures/affaire_demo.js) ── */
await ctx.close();await open({width:390,height:844},true,false);
{const fs=await import('fs');const FIX=fs.readFileSync(new URL('./fixtures/affaire_demo.js',import.meta.url),'utf8');
 await as('ethan');await tab('htAff');await page.evaluate(src=>{const w={};new Function('window',src)(w);window.TRACE.affaire.demo(w.AFD);},FIX);await wait(900);}
const nav=async h=>{await page.evaluate(h=>{const b=document.querySelector('#eq-app [data-act="aller"][data-h="'+h+'"]');if(b)b.click();},h);await wait(700);};
await nav('reporting');const w7a=await where();await page.evaluate(()=>{const r=document.querySelector('#af-main tr[data-code]');if(r)r.click();});await wait(800);
const w7=await where();const h7=await help('#homeBody .af-titre h1 .tuHelp');const f7=await run();
await nav('reglages');const w8=await where();const h8=await help('#homeBody .af-titre h1 .tuHelp');const r8=await run();
console.log('n7) Affaire :',J({reporting:w7a,w7,h7,fiche:show(f7),w8,h8,reglages:show(r8)}));
C.n7=w7a==='affaire'&&w7==='affaire:fiche'&&h7&&f7.k==='affaire:fiche'&&ok(f7)&&w8==='affaire:reglages'&&h8&&r8.k==='affaire:reglages'&&ok(r8,['Sans grille']);
/* ── n8 : Ai-je la fourniture ? — le « ? » de la barre de vérification ── */
await as('ethan');await page.evaluate(()=>window.TRACE.openSiteFromHome('bain'));await wait(2200);
await page.evaluate(async()=>{const w=ms=>new Promise(r=>setTimeout(r,ms));const T=window.TRACE,F=T.fourniture;F.checkStart();await w(400);const v=T.state.view;const H=innerHeight,W=innerWidth;
  [[20,230],[W-20,230],[W-20,H-120],[20,H-120]].forEach(([x,y])=>F.tap((x-v.tx)/v.k,(y-v.ty)/v.k));await w(200);const ok=document.getElementById('fzOk');if(ok)ok.click();await w(700);const c=document.getElementById('fzc-plan');if(c)c.click();await w(500);});
const bar=await page.evaluate(()=>{const b=document.getElementById('fzChkBar');const h=document.getElementById('fzChkHelp');return {bar:!!b&&getComputedStyle(b).display!=='none',help:!!h&&h.getBoundingClientRect().width>0};});
await page.click('#fzChkHelp');await wait(300);const f8=await run();
console.log('n8) fourniture :',J({bar,f8:show(f8)}));
C.n8=bar.bar&&bar.help&&f8.k==='chantier:fzcheck'&&/^Tracé Chantier · Ai-je la fourniture \?/.test(f8.mod)&&f8.n===5&&J(f8.steps)===J(['Entoure une zone','Le résultat ◉','📋 Le tableau ◉','🗺 Voir sur le plan','Recommencer ◉'])&&!f8.out.length&&!f8.small.length&&f8.closed;
C.n6=!logs.length;
console.log('console :',J(logs));
console.log(Object.entries(C).map(([k,v])=>k+':'+(v?'✓':'✗')).join(' '));
console.log('RESULTAT:',Object.values(C).every(Boolean)?'TOUT VERT':'ÉCHEC');
await browser.close();
