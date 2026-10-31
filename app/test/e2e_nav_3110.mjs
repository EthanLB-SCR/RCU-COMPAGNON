// e2e_nav_3110.mjs — 31/10 matin (retours d'Ethan sur la livraison 3110) : NAVIGATION ET MODULES.
// « on peut enlever le ruban qui prend de la place » ; « la pastille, que ce soit l'avatar de la personne » ; « le bandeau avec mon nom on s'en fout, replacer le ? » ;
// « de meilleures icônes pour passer d'Accueil à Documents dans Compagnon, pareil dans Chantier entre Liste et Carte » ; « Sécurité, passe-le dans Pilotage » ;
// « remplace quand tu as écrit les gars » ; « véhicules, mouvements et commandes : OK d'avoir un accès via Pilotage, mais si les modules Magasin ou Flotte ne sont pas pris,
// ça ne doit pas apparaître » ; « bons de commande et débours : pas avec le suivi opérationnel » ; « on renomme Affaires en Commerce et on crée Affaire pour tout le suivi
// financier du chantier » ; « le matériel, dans Magasin plus que Flotte » ; « revois tous les noms, qu'on se professionnalise : Détection d'humidité, Hydraulique, Stockage… ».
//  c1  ruban d'onglets et 2e ligne d'accueil cachés ; chevron du module visible au téléphone ; toucher le logo → Aujourd'hui
//  c2  pastille = avatar (dessin svg) pour un personnage qui a un avatar
//  c3  « ? » à droite du titre de l'écran (Pilotage) → lance le tutoriel ; dans un chantier, « ? » (#btnTuto) sur la 2e ligne
//  c4  menu des modules : Commerce et Affaire (plus d'« Affaires »)
//  c5  hub Affaire : bons de commande, notes de frais à valider, comptes chantier, compte d'un chantier ; Pilotage SANS ces lignes, AVEC Sécurité et Matériel & véhicules
//  c6  Magasin : rubriques Magasin / Matériel ; Flotte sans Matériel
//  c7  modules de l'entreprise (Réglages → 🏢 Entreprise) : Flotte et Magasin décochés → plus de module Flotte / Magasin, plus d'accès au dépôt dans Pilotage, plus de
//      rubrique Magasin dans Compagnon ; recochés → tout revient
//  c8  onglets du chantier aux noms professionnels
//  c9  aucun « gars » dans le texte visible des écrans principaux
//  c10 360 px : rien ne déborde (accueil, Pilotage, Affaire, Compagnon, Magasin)
//  c11 console propre
import { chromium } from 'playwright';
const BASE=process.env.BASE||'http://localhost:8765';const SHOTS=process.env.SHOTS||'';
const browser=await chromium.launch({headless:true, executablePath: process.env.CHROMIUM_PATH||undefined});
const C={};const logs=[];const J=x=>JSON.stringify(x);
const ctx=await browser.newContext({viewport:{width:390,height:844},deviceScaleFactor:2,isMobile:true,hasTouch:true});const page=await ctx.newPage();
page.on('pageerror',e=>logs.push('PAGEERROR: '+e.message.slice(0,300)));page.on('console',m=>{if(m.type()==='error'&&!/supabase|Failed to fetch|net::ERR|404|geopf|WebSocket/i.test(m.text()))logs.push(m.text().slice(0,200));});page.on('dialog',d=>d.accept().catch(()=>{}));
const wait=ms=>page.waitForTimeout(ms);
await page.goto(BASE+'/index.html');await wait(500);await page.evaluate(()=>{localStorage.clear();});await page.evaluate(()=>new Promise(r=>{try{const q=indexedDB.deleteDatabase('trace-kv');q.onsuccess=q.onerror=q.onblocked=()=>r();}catch(e){r();}}));
await page.reload();await wait(1200);const sk=await page.$('#loginSkip');if(sk&&await sk.isVisible())await sk.click();await wait(700);
const as=async u=>{await page.evaluate(u=>{const T=window.TRACE;T.state.userId=u;T.showScreen('home');T.renderHome();},u);await wait(400);};
const tab=async id=>{await page.evaluate(id=>{const b=document.getElementById(id);if(b)b.click();},id);await wait(600);};
const rows=()=>page.evaluate(()=>[...document.querySelectorAll('#homeBody .ac-row')].map(r=>({t:(r.querySelector('b')||{}).textContent||'',v:r.dataset.v||''})));
const secs=()=>page.evaluate(()=>[...document.querySelectorAll('#homeBody .ac-h b')].map(b=>b.textContent.trim()));
const shot=async n=>{if(SHOTS)await page.screenshot({path:SHOTS+'/nav_'+n+'.png'});};
/* ── c1 : plus de ruban, plus de 2e ligne d'accueil, chevron, logo → Aujourd'hui */
await as('ethan');await tab('htExpl');
let o=await page.evaluate(()=>({ribbon:getComputedStyle(document.getElementById('homeTabs')).display,ctx:getComputedStyle(document.querySelector('#tbHome .tbCtx')).display,chev:getComputedStyle(document.querySelector('#tbHomeMod .tbChev')).display,tab:window.TRACE.state.homeTab}));
await page.evaluate(()=>document.getElementById('homeLogo').click());await wait(500);
o.afterLogo=await page.evaluate(()=>window.TRACE.state.homeTab);
console.log('c1) ruban / 2e ligne / logo :',J(o));
C.c1=o.ribbon==='none'&&o.ctx==='none'&&o.chev!=='none'&&o.tab==='expl'&&o.afterLogo==='accueil';
/* ── c2 : pastille = avatar */
await as('karim');
o=await page.evaluate(()=>{const a=document.getElementById('homeAva');const r=a.getBoundingClientRect();return {svg:!!a.querySelector('svg'),inBand:!!a.closest('.tbBand'),w:Math.round(r.width),right:Math.round(r.right),W:innerWidth};});
console.log('c2) pastille :',J(o));
C.c2=o.svg&&o.inBand&&o.w>=30&&o.right<=o.W;
/* ── c3 : « ? » du titre (Pilotage) et du chantier */
await as('sophie');await tab('htExpl');
o={help:await page.evaluate(()=>{const b=document.querySelector('#homeBody h2.vt .tuHelp');if(!b)return null;const r=b.getBoundingClientRect();return {w:Math.round(r.width),h:Math.round(r.height)};})};
await page.evaluate(()=>{const b=document.querySelector('#homeBody h2.vt .tuHelp');if(b)b.click();});await wait(400);
o.open=await page.evaluate(()=>window.TRACE.tuto.open());await page.evaluate(()=>window.TRACE.tuto.close(null));await wait(200);
const SID=await page.evaluate(()=>Object.keys(window.TRACE.sites).find(k=>k!=='__vide'&&window.TRACE.sites[k]&&(window.TRACE.sites[k].lines||[]).length));
await page.evaluate(id=>window.TRACE.openSiteFromHome(id),SID);await page.waitForFunction(id=>window.TRACE.state.screen==='site'&&window.TRACE.state.siteId===id,SID,{timeout:20000}).catch(()=>{});await wait(1200);
o.site=await page.evaluate(()=>{const b=document.getElementById('btnTuto');return {vis:!!b&&getComputedStyle(b).display!=='none'&&b.getBoundingClientRect().width>0,inCtx:!!b&&!!b.closest('.tbCtx'),where:window.TRACE.tuto.where()};});
console.log('c3) « ? » :',J(o));
C.c3=!!o.help&&o.help.w>=30&&!!o.open&&/^pilotage/.test(o.open.k)&&o.site.vis&&o.site.inCtx&&/^chantier:/.test(o.site.where);
/* ── c8 : onglets du chantier aux noms professionnels */
o=await page.evaluate(()=>Object.fromEntries([...document.querySelectorAll('#tabbar [data-tab]')].map(b=>[b.dataset.tab,b.textContent.trim()])));
console.log('c8) onglets du chantier :',J(o));
C.c8=o.bouclage==='Détection d\'humidité'&&o.hydro==='Hydraulique'&&o.stock==='Stockage'&&o.fourniture==='Fournitures'&&o.ts==='Modifications'&&o.export==='DOE et exports'&&o.recap==='Récapitulatif'&&(!o.points||o.points==='Points de contrôle')&&!Object.values(o).some(t=>/^(DH|Hydro|Stock|Modifs|Récap|Export)$/.test(t));
await page.evaluate(()=>window.TRACE.showScreen('home'));await wait(300);
/* ── c4 : menu des modules */
await as('ethan');
o={mods:await page.evaluate(()=>window.TRACE.band.modules())};
await page.evaluate(()=>document.getElementById('tbHomeMod').click());await wait(400);
o.menu=await page.evaluate(()=>[...document.querySelectorAll('#modal .modList [data-modi] b')].map(b=>b.textContent.replace(/\s+/g,' ').trim()));
await page.evaluate(()=>{const m=document.getElementById('modal');if(m)m.classList.remove('show');});
console.log('c4) menu des modules :',J(o));
C.c4=o.mods.includes('commerce')&&o.mods.includes('affaire')&&!o.mods.includes('affaires')&&o.menu.includes('Tracé Commerce')&&o.menu.includes('Tracé Affaire')&&!o.menu.some(t=>/Affaires/.test(t));
/* ── c5 : hub Affaire / Pilotage */
await as('sophie');await tab('htAff');
o={aff:{mod:await page.evaluate(()=>document.getElementById('tbHomeModName').textContent),rows:(await rows()).map(r=>r.t)}};await shot('affaire_390');
await tab('htExpl');o.pil={secs:await secs(),rows:(await rows()).map(r=>r.t)};await shot('pilotage_390');
console.log('c5) Affaire / Pilotage :',J(o));
const FIN=['Bons de commande','Notes de frais à valider','Comptes chantier','Compte d\'un chantier'];
C.c5=o.aff.mod==='Affaire'&&FIN.every(t=>o.aff.rows.includes(t))&&!o.pil.rows.some(t=>FIN.includes(t))&&o.pil.secs.some(t=>/Sécurité/.test(t))&&o.pil.secs.some(t=>/Matériel & véhicules/.test(t))&&o.pil.rows.includes('Déclarer un accident');
/* ── c6 : Magasin (Magasin / Matériel) ; Flotte sans Matériel */
await as('ethan');await tab('htMag');
o={mag:await page.evaluate(()=>[...document.querySelectorAll('#homeBody [data-act="parcseg"]')].map(b=>b.dataset.v))};
await page.evaluate(()=>{const b=document.querySelector('#homeBody [data-act="parcseg"][data-v="materiel"]');if(b)b.click();});await wait(400);
o.mat=await page.evaluate(()=>({h:(document.querySelector('#homeBody h2.vt')||{}).textContent||'',mod:document.getElementById('tbHomeModName').textContent}));
await tab('htParc');o.flotte=await page.evaluate(()=>({segs:[...document.querySelectorAll('#homeBody [data-act="parcseg"]')].map(b=>b.dataset.v),mod:document.getElementById('tbHomeModName').textContent}));
console.log('c6) Magasin / Flotte :',J(o));
C.c6=o.mag.join()==='magasin,materiel'&&/Matériel/.test(o.mat.h)&&o.mat.mod==='Magasin'&&!o.flotte.segs.includes('materiel')&&o.flotte.mod==='Flotte';
/* ── c7 : modules de l'entreprise (Réglages → 🏢 Entreprise ; en démo, ouvrir Réglages recharge les fiches de l'espace → on relit après un rechargement de l'appli,
   le réglage est gardé sur l'appareil) */
const fresh=async()=>{await page.reload();await wait(1200);const s2=await page.$('#loginSkip');if(s2&&await s2.isVisible())await s2.click();await wait(700);};
const look=async()=>{await as('ethan');const r={mods:await page.evaluate(()=>window.TRACE.band.modules())};await as('sophie');await tab('htExpl');r.pil=(await rows()).map(x=>x.v);await tab('htEspace');r.subs=await page.evaluate(()=>[...document.querySelectorAll('#eq-app .eq-subs [data-v]')].map(b=>b.dataset.v));return r;};
const toggle=async(keys,on)=>{await as('ethan');await page.evaluate(()=>document.getElementById('htAdmin').click());await wait(600);
  for(const k of keys){if(!(await page.$('#modEntCard'))){await page.evaluate(()=>{const b=[...document.querySelectorAll('#homeBody .admNav button')].find(x=>/Entreprise/.test(x.textContent));if(b)b.click();});await wait(500);}
    await page.evaluate(([k,on])=>{const c=document.querySelector('#modEntCard [data-modent="'+k+'"]');if(c){c.checked=on;c.dispatchEvent(new Event('change',{bubbles:true}));}},[k,on]);await wait(700);}};
await fresh();const before=await look();
await toggle([],true);o={card:await page.evaluate(()=>{const b=[...document.querySelectorAll('#homeBody .admNav button')].find(x=>/Entreprise/.test(x.textContent));if(b)b.click();return 1;})};await wait(500);
o.card=await page.evaluate(()=>[...document.querySelectorAll('#modEntCard [data-modent]')].map(c=>c.dataset.modent+':'+c.checked));await shot('modules_entreprise_390');
await toggle(['flotte','magasin'],false);o.off=await page.evaluate(()=>JSON.parse(localStorage.getItem('trace:modules')||'null'));o.now={mods:await page.evaluate(()=>window.TRACE.band.modules()),parc:await page.evaluate(()=>document.getElementById('htParc').style.display),mag:await page.evaluate(()=>document.getElementById('htMag').style.display)};
await fresh();o.after=await look();
await toggle(['flotte','magasin'],true);await fresh();o.back=await look();
console.log('c7) modules de l\'entreprise :',J({before,...o}));
C.c7=o.card.length===6&&o.card.every(x=>/:true$/.test(x))&&before.mods.includes('flotte')&&before.mods.includes('magasin')&&before.pil.includes('x:mag:equipe')&&before.subs.includes('mag')
  &&o.off&&o.off.off.includes('flotte')&&o.off.off.includes('magasin')&&!o.now.mods.includes('flotte')&&!o.now.mods.includes('magasin')&&o.now.parc==='none'&&o.now.mag==='none'
  &&!o.after.mods.includes('flotte')&&!o.after.mods.includes('magasin')&&!o.after.pil.includes('x:mag:equipe')&&!o.after.pil.some(v=>/^veh\|/.test(v))&&!o.after.subs.includes('mag')
  &&o.back.mods.includes('flotte')&&o.back.mods.includes('magasin')&&o.back.pil.includes('x:mag:equipe')&&o.back.subs.includes('mag');
/* ── c9 : aucun « gars » visible ; c10 : 360 px */
const screens=[['ethan','htHome'],['ethan','htSites'],['sophie','htExpl'],['sophie','htAff'],['ethan','htEspace'],['ethan','htCom'],['ethan','htParc'],['ethan','htMag'],['ethan','htEnt']];
o={gars:[],over:[]};
for(const [u,id] of screens){await as(u);await tab(id);const t=await page.evaluate(()=>document.body.innerText);if(/\bgars\b/i.test(t))o.gars.push(id);}
await page.setViewportSize({width:360,height:780});await wait(300);
for(const [u,id] of [['ethan','htHome'],['sophie','htExpl'],['sophie','htAff'],['ethan','htEspace'],['ethan','htMag']]){await as(u);await tab(id);const ov=await page.evaluate(()=>document.documentElement.scrollWidth>innerWidth+1||[...document.querySelectorAll('#tbHome .tbBand > *')].some(e=>e.offsetParent&&e.getBoundingClientRect().right>innerWidth+0.5));if(ov)o.over.push(id);}
await shot('compagnon_360');
console.log('c9-c10) « gars » / débordements 360 :',J(o));
C.c9=!o.gars.length;C.c10=!o.over.length;
C.c11=!logs.length;if(logs.length)console.log('console :',logs);
console.log('RÉSULTATS',J(C));console.log('RESULTAT:',Object.values(C).every(Boolean)?'TOUT VERT':'ÉCHEC '+Object.keys(C).filter(k=>!C[k]).join(' '));await browser.close();process.exit(Object.values(C).every(Boolean)?0:1);
