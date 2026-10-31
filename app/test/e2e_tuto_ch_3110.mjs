// e2e_tuto_ch_3110.mjs — 31/10 (lot ch) : tutoriels détaillés du module Chantier (src/tutos_chantier.js).
// Ethan : « que ce soit pas une générique par module mais un par module qui décrit toutes les options, et des tutos par option, vastes après ».
// Pour CHAQUE clé du fichier : on ouvre son écran dans l'appli (mode démo hors connexion), on vérifie TRACE.tuto.where(), on lance le tutoriel
// (TRACE.tuto.start — sous robot rien ne part tout seul), on déroule toutes les étapes (#tuto .tutoGo) et on vérifie à chaque étape :
//   · le titre de la carte = l'étape attendue, dans l'ordre, après filtrage `si` (droits et options du personnage, lus dans l'appli) ; « Tracé Chantier · <Nom> · i / n »
//   · étape avec `sel` → la découpe (#tuto .tutoHole) est affichée et entoure bien la 1re cible visible de la liste ; carte et boutons dans l'écran
//   · étape sans `sel` → carte au centre, pas de découpe
//  c1  chantiers      Ethan (encadrement : Mes chantiers, ＋ Nouveau chantier, Reprendre) puis Karim (soudeur) ; « ? » des tuiles Carte / Liste
//  c2  chantier       vue d'ensemble : Ethan sur le plan (onglets → leur famille), Ethan dans Vie du chantier (onglets eux-mêmes), Karim ; arrivée réelle (drapeau de test)
//  c3  chantier:plan  Karim, une planche fictive importée pour « 📄 Mes plans » ; « ? » de la 2e ligne
//  c4  chantier:bureau / :conv / :admin / :qse   Ethan puis Karim (lecture seule, pas d'encadrement)
//  c5  chantier:export / :recap (Ethan), chantier:liste (Karim) ; « ? » sur la liste
//  c6  360 px : chantier (Karim), chantier:plan (Karim), chantier:qse (Ethan) — cartes dans l'écran, découpes affichées
//  c7  📚 Tous les tutoriels : les noms du lot sous « Tracé Chantier » ; textes : titre ≤ 40 caractères, texte ≤ 200
//  c8  zéro erreur console
// Données 100 % fictives : « Chantier fictif TU » (créé à la main), planche « Planche fictive », document QSE « Note fictive ».
// Absences légitimes : aucune — chaque cible est rendue présente par le scénario (planche, quart d'heure, document) ; la liste ABSENT ci-dessous reste vide.
import { chromium } from 'playwright';import fs from 'fs';
import TU,{NOMS} from '../src/tutos_chantier.js';
const BASE=process.env.BASE||'http://localhost:8765';const SHOTS=process.env.SHOTS||'';
const browser=await chromium.launch({headless:true,executablePath:process.env.CHROMIUM_PATH||undefined});
const ctx=await browser.newContext({viewport:{width:390,height:844},deviceScaleFactor:2,hasTouch:true,isMobile:true});const page=await ctx.newPage();
const logs=[];page.on('pageerror',e=>logs.push('PAGEERROR: '+e.message.slice(0,300)));page.on('console',m=>{if(m.type()==='error'&&!/supabase|Failed to fetch|net::ERR|404|geopf|WebSocket|open-meteo/i.test(m.text()))logs.push(m.text().slice(0,200));});
page.on('dialog',d=>d.accept().catch(()=>{}));
await page.route(u=>/(^|\.)geopf\.fr$|^geo\.api\.gouv\.fr$|open-meteo\.com$/.test(u.hostname),r=>r.fulfill({status:200,contentType:'application/json',body:'[]'}));
const C={};const J=x=>JSON.stringify(x);const wait=ms=>page.waitForTimeout(ms);
const waitFor=async(fn,ms=15000)=>{const t0=Date.now();while(Date.now()-t0<ms){try{if(await page.evaluate(fn))return true;}catch(e){}await wait(200);}return false;};
const shot=async n=>{if(!SHOTS)return;try{fs.mkdirSync(SHOTS,{recursive:true});await page.screenshot({path:`${SHOTS}/${n}.png`});}catch(e){console.log('capture',n,e.message);}};
// cibles légitimement absentes : `${personnage}|${clé}|${titre}` → raison (vide : le scénario fabrique toutes les cibles)
const ABSENT={};
/* ── droits et options du personnage, lus dans l'appli → api des `si` rejouée ici ── */
const RIGHTS=['pointage.validate','planning.edit','qse.manage','qse.sign','site.tracer','conv.post','conv.task','dossier.edit','export.doe','dh.measure','hydro','stock.edit','phasage.edit','ts.qualify','affaires.edit'];
const FEATS=['conv','dossier','qse','export','bouclage','hydro','stock','fourniture','phasage','modifs','points','plansexe','comptechantier'];
async function apiOf(){const o=await page.evaluate(([R,F])=>{const T=window.TRACE;return {r:R.filter(k=>T.acces.can(k)),f:F.filter(k=>T.paliers.feat(k))};},[RIGHTS,FEATS]);const r=new Set(o.r),f=new Set(o.f);
  return {can:k=>{if(!RIGHTS.includes(k))throw new Error('droit non suivi par le test : '+k);return r.has(k);},feat:k=>{if(!FEATS.includes(k))throw new Error('option non suivie par le test : '+k);return f.has(k);}};}
const expected=(k,api)=>(TU[k]||[]).filter(s=>!s.si||s.si(api));
/* ── écrans ── */
const asUser=async u=>{await page.evaluate(u=>{const T=window.TRACE;T.state.userId=u;T.showScreen('home');T.renderHome();},u);await wait(250);};
const homeSites=async(view)=>{await page.evaluate(()=>document.getElementById('htSites').click());await wait(400);if(view)await page.evaluate(v=>document.getElementById(v==='list'?'htList':'htMap').click(),view);await wait(500);};
const SITE='bain';
async function openSite(u,tab){await asUser(u);await page.evaluate(()=>{const a=document.getElementById('app');if(a)a.scrollTop=0;}); /* chaque tutoriel part d'un écran propre (voir la note « moteur » de c4) */await page.evaluate(id=>window.TRACE.openSiteFromHome(id),SITE);await waitFor(()=>window.TRACE.state.screen==='site'&&!window.TRACE.state.opening);await wait(600);
  await page.evaluate(t=>{const T=window.TRACE;T.state.tab=t||'plan';T.renderAll();},tab);await wait(600);} /* l'onglet est global (state.tab) : toujours le fixer */
const where=()=>page.evaluate(()=>window.TRACE.tuto.where());
/* ── la carte du tutoriel + la 1re cible visible de la liste « sel » (même règle que tuto.js) ── */
const card=sel=>page.evaluate(sel=>{const r=document.getElementById('tuto');if(!r)return null;const c=r.querySelector('.tutoCard'),h=r.querySelector('.tutoHole');const rc=c.getBoundingClientRect();
  const hv=h&&getComputedStyle(h).display!=='none'?h.getBoundingClientRect():null;let tg=null;
  if(sel)for(const q of sel.split(',')){let el=null;try{el=document.querySelector(q.trim());}catch(e){}if(!el)continue;const x=el.getBoundingClientRect();if(x.width<4||x.height<4)continue;const cs=getComputedStyle(el);if(cs.visibility==='hidden'||cs.display==='none')continue;
    if(x.bottom<0||x.top>innerHeight||x.right<0||x.left>innerWidth)continue;tg={q:q.trim(),cx:(Math.max(0,x.left)+Math.min(innerWidth,x.right))/2,cy:(Math.max(0,x.top)+Math.min(innerHeight,x.bottom))/2};break;} /* centre de la partie VISIBLE de la cible */
  const btns=[...c.querySelectorAll('button')].map(b=>Math.round(b.getBoundingClientRect().height));
  return {mod:c.querySelector('.tutoMod').textContent,t:c.querySelector('.tutoT').textContent,card:[rc.left,rc.top,rc.right,rc.bottom].map(Math.round),W:innerWidth,H:innerHeight,btns,
    hole:hv?[hv.left,hv.top,hv.right,hv.bottom].map(Math.round):null,tg,open:window.TRACE.tuto.open()};},sel||null);
// déroule le tutoriel `k` (déjà sur son écran) ; renvoie {ok, n, steps:[{t,q|centre}], err:[…]}
async function run(k,who,o={}){const api=await apiOf();const exp=expected(k,api);const err=[];
  const started=await page.evaluate(k=>window.TRACE.tuto.start(k),k);await wait(450);if(!started)return {ok:false,n:0,err:['pas lancé']};
  const op=await page.evaluate(()=>window.TRACE.tuto.open());if(!op||op.k!==k||op.n!==exp.length)err.push(`étapes : appli ${op&&op.n} / attendu ${exp.length}`);
  const nom=NOMS[k];const steps=[];
  for(let i=0;i<exp.length;i++){const s=exp[i];if(i)await wait(380);const c=await card(s.sel);if(!c){err.push(`étape ${i+1} : plus de carte`);break;}
    if(c.t!==s.titre)err.push(`étape ${i+1} : « ${c.t} » au lieu de « ${s.titre} »`);
    const modOk=c.mod.startsWith('Tracé Chantier'+(nom?' · '+nom:'')+' · '+(i+1)+' / '+exp.length);if(!modOk)err.push(`étape ${i+1} : en-tête « ${c.mod} »`);
    const inScreen=c.card[0]>=0&&c.card[2]<=c.W&&c.card[1]>=0&&c.card[3]<=c.H&&c.btns.every(h=>h>=44);if(!inScreen)err.push(`étape ${i+1} : carte hors écran ${J(c.card)} (${c.W}×${c.H})`);
    if(s.sel){const why=ABSENT[`${who}|${k}|${s.titre}`];
      if(!c.hole||!c.tg){if(!why)err.push(`étape ${i+1} « ${s.titre} » : rien de surligné (${s.sel})`);}
      else{const inHole=c.tg.cx>=c.hole[0]-1&&c.tg.cx<=c.hole[2]+1&&c.tg.cy>=c.hole[1]-1&&c.tg.cy<=c.hole[3]+1;if(!inHole)err.push(`étape ${i+1} « ${s.titre} » : la découpe ${J(c.hole)} n'entoure pas ${c.tg.q}`);}
      steps.push({t:s.titre,q:c.tg?c.tg.q:null});}
    else{if(c.hole)err.push(`étape ${i+1} « ${s.titre} » : découpe inattendue`);steps.push({t:s.titre,q:'centre'});}
    if(o.shotAt===s.titre)await shot(o.shot);
    await page.evaluate(()=>{const b=document.querySelector('#tuto .tutoGo');if(b)b.click();});}
  await wait(250);const closed=!(await page.$('#tuto'));if(!closed)err.push('pas refermé après « Terminé »');
  return {ok:!err.length,n:exp.length,steps,err};}
const report=(lab,r)=>{console.log(`   ${lab} : ${r.n} étapes ${r.ok?'✓':'✗'}`+(r.err.length?'\n      '+r.err.join('\n      '):''));return r.ok;};

/* ── démarrage : mode démo hors connexion ── */
await page.goto(BASE+'/index.html');await wait(400);await page.evaluate(()=>localStorage.clear());await page.evaluate(()=>new Promise(r=>{try{const q=indexedDB.deleteDatabase('trace-kv');q.onsuccess=q.onerror=q.onblocked=()=>r();}catch(e){r();}}));
await page.reload();await wait(1400);{const sk=await page.$('#loginSkip');if(sk&&await sk.isVisible())await sk.click();await wait(600);}
// chantier fictif créé à la main (pour « Mes chantiers ») ; un chantier ouvert une fois (pour « Reprendre »)
await asUser('ethan');const nc=await page.evaluate(async()=>{try{return await window.TRACE.nc.create({name:'Chantier fictif TU',ville:'Ville fictive',client:'Client fictif'});}catch(e){return 'ERR '+e.message;}});await wait(1500);
console.log('chantier fictif :',nc);

/* ── c1 : chantiers (accueil du module) ── */
let o={};await asUser('ethan');await homeSites('map');o.where=await where();
o.ethan=await run('chantiers','ethan',{shotAt:'Mes chantiers',shot:'tu_ch_chantiers_390'});
await page.evaluate(()=>{const b=document.querySelector('#homeSubTabs .tuHelp');if(b)b.click();});await wait(350);o.help=await page.evaluate(()=>window.TRACE.tuto.open());await page.evaluate(()=>window.TRACE.tuto.close(null));
await asUser('karim');await homeSites('list');o.whereK=await where();o.karim=await run('chantiers','karim');
console.log('c1) chantiers — where',o.where,'/',o.whereK);report('Ethan (carte)',o.ethan);report('Karim (liste)',o.karim);console.log('   ? des tuiles →',J(o.help));
C.c1=o.where==='chantiers'&&o.whereK==='chantiers'&&o.ethan.ok&&o.karim.ok&&o.ethan.n===7&&o.karim.n===5&&o.help&&o.help.k==='chantiers';

/* ── c2 : chantier (vue d'ensemble) ── */
o={};await openSite('ethan','plan');o.where=await where();
o.plan=await run('chantier','ethan',{shotAt:'💬 Conversation',shot:'tu_ch_chantier_390'});
o.fallback=o.plan.steps.filter(s=>/Conversation|Dossier|QSE|DOE|Bureau/.test(s.t)).every(s=>s.q==='#facets [data-facet="vie"]')&&o.plan.steps.filter(s=>/humidité|Hydraulique|Stockage|Fournitures|Phasage|Modifications|Points|Récapitulatif|Liste des|Catalogue/.test(s.t)).every(s=>s.q==='#facets [data-facet="tech"]');
await page.evaluate(()=>document.querySelector('#facets [data-facet="vie"]').click());await wait(600);o.whereVie=await where();
o.vie=await run('chantier','ethan');o.vieTabs=o.vie.steps.filter(s=>/^(🏢|💬|🗂|⛑️|📷)/.test(s.t)).map(s=>s.q);
o.vieOk=o.vieTabs.length===5&&o.vieTabs.every(q=>/^#tabbar \[data-tab=/.test(q));
await openSite('karim','plan');o.karim=await run('chantier','karim');
// arrivée réelle (drapeau de test) : 1re entrée → la vue d'ensemble ; ensuite, au rendu suivant → le tutoriel du plan
await page.evaluate(()=>{localStorage.setItem('trace:tuto:test','1');window.TRACE.tuto.reset();});await openSite('julien','plan');await wait(1600);
o.arr1=await page.evaluate(()=>window.TRACE.tuto.open());if(o.arr1)await page.evaluate(()=>{const b=document.querySelector('#tuto [data-tuto=skip]');if(b)b.click();});await wait(300);
await page.evaluate(()=>window.TRACE.renderAll());await wait(1600);o.arr2=await page.evaluate(()=>window.TRACE.tuto.open());
if(o.arr2)await page.evaluate(()=>window.TRACE.tuto.close('passe'));await page.evaluate(()=>localStorage.removeItem('trace:tuto:test'));
console.log('c2) chantier — where',o.where,'/',o.whereVie);report('Ethan sur le plan',o.plan);console.log('   onglets → famille sur le plan :',o.fallback);report('Ethan dans Vie du chantier',o.vie);console.log('   onglets de Vie du chantier surlignés eux-mêmes :',J(o.vieTabs));
report('Karim',o.karim);console.log('   arrivée réelle :',J(o.arr1),'puis',J(o.arr2));
C.c2=/^chantier:/.test(o.where)&&o.whereVie==='chantier:bureau'&&o.plan.ok&&o.plan.n===20&&o.fallback&&o.vie.ok&&o.vieOk&&o.karim.ok&&o.karim.n===13
  &&o.arr1&&o.arr1.k==='chantier'&&o.arr2&&o.arr2.k==='chantier:plan';

/* ── c3 : chantier:plan (Karim, planche fictive pour « 📄 Mes plans ») ── */
o={};await openSite('karim','plan');
await page.evaluate(()=>{const T=window.TRACE;const N=T.net;N.admin=N.admin||{docs:[]};const L=Object.keys(T.lines)[0];N.admin.pl=[{id:'pxTU1',no:'1',title:'Planche fictive',zone:[{l:L}],ind:[{id:'ixTU1',i:'A',date:'2026-10-30',page:1,kind:'pdf',by:'test',at:new Date().toISOString()}],by:'test',at:new Date().toISOString()}];T.renderPlan();});await wait(400);
o.where=await where();o.px=await page.evaluate(()=>{const b=document.getElementById('pxPlanBtn');return !!b&&getComputedStyle(b).display!=='none';});
o.karim=await run('chantier:plan','karim',{shotAt:'Les couleurs des soudures',shot:'tu_ch_plan_390'});
await page.evaluate(()=>document.getElementById('btnTuto').click());await wait(350);o.help=await page.evaluate(()=>window.TRACE.tuto.open());await page.evaluate(()=>window.TRACE.tuto.close(null));
console.log('c3) chantier:plan — where',o.where,'· Mes plans affiché',o.px);report('Karim',o.karim);console.log('   ? de la 2e ligne →',J(o.help));
C.c3=o.where==='chantier:plan'&&o.px&&o.karim.ok&&o.karim.n===8&&o.help&&o.help.k==='chantier:plan';

/* ── c4 : Vie du chantier — Bureau, Conversation, Dossier, QSE ── */
o={};const R4={};
for(const [k,tab] of [['chantier:bureau','bureau'],['chantier:conv','conv'],['chantier:admin','admin'],['chantier:qse','qse']]){
  for(const who of ['ethan','karim']){await openSite(who,tab);
    if(k==='chantier:qse'){ // un quart d'heure du jour et un document à émarger, fictifs, pour que leurs cibles existent pour tout le monde
      await page.evaluate(id=>{const T=window.TRACE;if(!T.qhs.runs().some(r=>r.sites&&r.sites.includes(id))){const tp=T.qhs.topics()[0];if(tp)T.qhs.trigger({topic:tp.id,sites:[id]});}
        const N=T.net;N.qse=N.qse||{docs:[]};N.qse.docs=N.qse.docs||[];if(!N.qse.docs.some(d=>d.id==='qTU1'))N.qse.docs.push({id:'qTU1',type:'pdf',title:'Note fictive',by:'test',at:new Date().toISOString(),sigs:[]});T.renderAll();},SITE);await wait(500);}
    const w=await where();const r=await run(k,who,who==='ethan'&&k==='chantier:bureau'?{shotAt:'Ce qui coince',shot:'tu_ch_bureau_390'}:who==='ethan'&&k==='chantier:admin'?{shotAt:'📎 Déposer une pièce',shot:'tu_ch_admin_390'}:{});
    R4[k+'|'+who]={w,r};}}
o.appShift=await page.evaluate(()=>document.getElementById('app').scrollTop); /* note moteur (tuto.js, hors lot) : scrollIntoView d'une cible sous la ligne de flottaison décale aussi #app (overflow:hidden, 27 px de trop à cause de #sheet caché) */
console.log('c4) Vie du chantier :');Object.entries(R4).forEach(([kw,{w,r}])=>{report(kw+' (where '+w+')',r);});
console.log('   note moteur : #app décalé de',o.appShift,'px après le dernier tutoriel (scrollIntoView du moteur — à corriger dans tuto.js, pas dans ce lot)');
const N4={'chantier:bureau|ethan':8,'chantier:bureau|karim':3,'chantier:conv|ethan':7,'chantier:conv|karim':6,'chantier:admin|ethan':7,'chantier:admin|karim':5,'chantier:qse|ethan':7,'chantier:qse|karim':5};
C.c4=Object.entries(R4).every(([kw,{w,r}])=>w===kw.split('|')[0]&&r.ok&&r.n===N4[kw]);

/* ── c5 : DOE et exports, Récapitulatif (Ethan), Liste des soudures (Karim) ── */
o={};await openSite('ethan','export');o.wE=await where();o.export=await run('chantier:export','ethan');
await openSite('ethan','recap');o.wR=await where();o.recap=await run('chantier:recap','ethan');
await openSite('karim','liste');o.wL=await where();o.liste=await run('chantier:liste','karim');
await page.evaluate(()=>document.getElementById('btnTuto').click());await wait(350);o.help=await page.evaluate(()=>window.TRACE.tuto.open());await page.evaluate(()=>window.TRACE.tuto.close(null));
console.log('c5) where',o.wE,o.wR,o.wL);report('chantier:export (Ethan)',o.export);report('chantier:recap (Ethan)',o.recap);report('chantier:liste (Karim)',o.liste);console.log('   ? sur la liste →',J(o.help));
C.c5=o.wE==='chantier:export'&&o.wR==='chantier:recap'&&o.wL==='chantier:liste'&&o.export.ok&&o.export.n===7&&o.recap.ok&&o.recap.n===6&&o.liste.ok&&o.liste.n===6&&o.help&&o.help.k==='chantier:liste';

/* ── c6 : passe à 360 px ── */
o={};await page.setViewportSize({width:360,height:740});
await openSite('karim','plan');o.chantier=await run('chantier','karim');
await page.evaluate(()=>{const T=window.TRACE;const N=T.net;N.admin=N.admin||{docs:[]};const L=Object.keys(T.lines)[0];N.admin.pl=[{id:'pxTU1',no:'1',title:'Planche fictive',zone:[{l:L}],ind:[{id:'ixTU1',i:'A',date:'2026-10-30',page:1,kind:'pdf',by:'test',at:new Date().toISOString()}],by:'test',at:new Date().toISOString()}];T.renderPlan();});await wait(300);
o.plan=await run('chantier:plan','karim');
await openSite('ethan','qse');o.qse=await run('chantier:qse','ethan',{shotAt:'⛑️ Quart d\'heure sécurité',shot:'tu_ch_qse_360'});
o.over=await page.evaluate(()=>document.documentElement.scrollWidth>window.innerWidth+1);
await page.setViewportSize({width:390,height:844});
console.log('c6) 360 px :');report('chantier (Karim)',o.chantier);report('chantier:plan (Karim)',o.plan);report('chantier:qse (Ethan)',o.qse);console.log('   débordement horizontal :',o.over);
C.c6=o.chantier.ok&&o.plan.ok&&o.qse.ok&&!o.over;

/* ── c7 : catalogue 📚 et règles de rédaction ── */
o={};await asUser('ethan');await page.evaluate(()=>window.TRACE.tuto.catalog());await wait(400);
o.cat=await page.evaluate(()=>[...document.querySelectorAll('#modal .tuCatM')].map(m=>({m:m.querySelector('b').textContent,i:[...m.querySelectorAll('.tuCatI span')].map(s=>s.textContent)})).filter(x=>/^Tracé Chantier/.test(x.m)));
await page.evaluate(()=>{const b=document.querySelector('#modal [data-close]');if(b)b.click();});await wait(200);
const chM=(o.cat.find(x=>x.m==='Tracé Chantier')||{i:[]}).i,chsM=(o.cat.find(x=>/mes chantiers/.test(x.m))||{i:[]}).i;
o.noms=Object.values(NOMS).every(n=>chM.includes(n))&&chM.includes('Vue d\'ensemble du module')&&chsM.includes('Vue d\'ensemble du module');
o.regles=[];for(const [k,st] of Object.entries(TU))st.forEach((s,i)=>{if([...s.titre].length>40)o.regles.push(k+' #'+(i+1)+' titre > 40');if([...s.texte].length>200)o.regles.push(k+' #'+(i+1)+' texte > 200');if(/\b(Karim|Julien|Ethan|Sophie|Sofiane|Bain-de-Bretagne|Saint-Lô)\b/.test(s.titre+s.texte))o.regles.push(k+' #'+(i+1)+' donnée réelle');if(s.sel&&/nth-child|:contains/.test(s.sel))o.regles.push(k+' #'+(i+1)+' sélecteur fragile');});
o.cles=Object.keys(TU).sort().join();
console.log('c7) catalogue Tracé Chantier :',J(chM),'· mes chantiers :',J(chsM),'· règles :',o.regles.length?J(o.regles):'✓');
C.c7=o.noms&&!o.regles.length&&o.cles==='chantier,chantier:admin,chantier:bureau,chantier:conv,chantier:export,chantier:liste,chantier:plan,chantier:qse,chantier:recap,chantiers';

C.c8=!logs.length;if(logs.length)console.log('console :',logs);
console.log('RÉSULTATS',J(C));console.log('RESULTAT:',Object.values(C).every(Boolean)?'TOUT VERT':'ÉCHEC '+Object.keys(C).filter(k=>!C[k]).join(' '));await browser.close();process.exit(Object.values(C).every(Boolean)?0:1);
