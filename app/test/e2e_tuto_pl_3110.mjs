// e2e_tuto_pl_3110.mjs — 31/10/2026 (lot PL) : TUTORIELS DÉTAILLÉS des modules PILOTAGE et AFFAIRE (src/tutos_pilotage.js). Ethan : « un tuto par module qui décrit
// toutes les options, et des tutos par option, vastes, pour que tout le monde sache se servir de toutes les options ».
// Mode démo hors connexion ; date figée (trace:testToday = mercredi 04/11/2026, semaine 45) ; données 100 % FICTIVES amorcées dans le stockage de l'appareil
// (planning S44 / S45, pointages, bons de commande, notes de frais, demandes de matériel et au dépôt, une déclaration d'accident) pour que les écrans aient du contenu.
//  c1  fichier : 23 clés (pilotage + 17 options, affaire + 4 options) ; chaque option nommée (NOMS) ; titres ≤ 40 caractères, uniques dans un tutoriel ; textes
//      ≤ 200 caractères et ≤ 2 phrases ; cibles robustes (pas de :nth-child, pas de texte) ; l'appli connaît toutes les clés (TRACE.tuto.keys)
//  c2  390 px, CHAQUE clé, sur son écran ouvert dans l'appli : TRACE.tuto.where() = la clé ; le « ? » à droite du titre lance CE tutoriel (carte « Tracé Module · Nom ») ;
//      toutes les étapes déroulées : chaque étape qui a une cible la surligne (#tuto .tutoHole affiché) et la cible est vraiment visible (≥ 60 % entre le bandeau
//      et le bas de l'écran : ni sous le bandeau, ni coupée), carte dans l'écran, boutons ≥ 44 px ; 3 à 8 étapes par option
//      + états intérieurs (même clé) : bon de commande ouvert, demande de matériel ouverte, compte d'un chantier ouvert → leurs étapes surlignent la vraie cible
//  c3  vues d'ensemble : une étape par ligne du hub affichée — Ethan (administrateur), Sophie (bureau), un chef de chantier (planning fait par le conducteur :
//      « Mon planning et mon équipe » et son tutoriel « Ta semaine »), une assistante RH (compteurs, paie, grands déplacements) ; l'écran Sécurité (tuile d'Aujourd'hui)
//  c3b paliers allumés (Socle) : vue d'ensemble = les lignes visibles, « Planning des équipes » sans planning simplifié, Production sans le tableau (3 étapes)
//  c4  360 px : Pilotage (vue d'ensemble), Pointages à valider, Bons de commande — cartes dans l'écran, cibles surlignées
//  c5  au 1er passage (drapeau de test des tutos) : Affaire → sa vue d'ensemble ; 1re ouverture de « Bons de commande » → son tutoriel détaillé ; plus rien ensuite
//  c6  captures 390 (SHOTS) : vue d'ensemble Pilotage, Planning de la semaine, Pointages à valider, Bons de commande
//  c7  console propre
import { chromium } from 'playwright';
import fs from 'fs';import path from 'path';import {fileURLToPath} from 'url';
const here=path.dirname(fileURLToPath(import.meta.url));
const BASE=process.env.BASE||'http://127.0.0.1:8844';const SHOTS=process.env.SHOTS||'';if(SHOTS)fs.mkdirSync(SHOTS,{recursive:true});
const M=await import(path.join(here,'..','src','tutos_pilotage.js'));const TU=M.default,NOMS=M.NOMS;
const C={};const logs=[];const J=x=>JSON.stringify(x);
/* ── c1 : le fichier ── */
const KEYS=['pilotage','pilotage:plan','pilotage:orga','pilotage:obj','pilotage:agenda','pilotage:valid','pilotage:prodEq','pilotage:rapport','pilotage:gd','pilotage:cpt','pilotage:annul','pilotage:x:mag','pilotage:x:dem','pilotage:secu','pilotage:qhs','pilotage:controles','pilotage:accident','pilotage:habsEq','affaire','affaire:cmd','affaire:frais','affaire:comptes','affaire:x:cc'];
const phrases=s=>(String(s).replace(/« \? »/g,'').match(/[.!?](\s|$)/g)||[]).length;
let o={keys:Object.keys(TU),miss:KEYS.filter(k=>!TU[k]),extra:Object.keys(TU).filter(k=>!KEYS.includes(k)),noms:KEYS.filter(k=>k.includes(':')&&!NOMS[k]),pb:[]};
for(const [k,st] of Object.entries(TU)){const T=st.map(s=>s.titre);if(new Set(T).size!==T.length)o.pb.push(k+' : titres en double');
  st.forEach((s,i)=>{const w=k+' #'+(i+1)+' « '+s.titre+' »';if(!s.titre||s.titre.length>40)o.pb.push(w+' titre '+(s.titre||'').length);if(!s.texte||s.texte.length>200)o.pb.push(w+' texte '+(s.texte||'').length);if(phrases(s.texte)>2)o.pb.push(w+' '+phrases(s.texte)+' phrases');
    if(s.sel&&(/:nth-|:contains|text=|:has-text/.test(s.sel)))o.pb.push(w+' cible fragile');if(/\b(les gars|Logstor|Renalia|Bain-de-Bretagne|Saint-Lô)\b/i.test(s.texte+s.titre))o.pb.push(w+' mot à éviter');});}
console.log('c1) fichier :',J({n:o.keys.length,miss:o.miss,extra:o.extra,noms:o.noms,pb:o.pb}));
const c1a=!o.miss.length&&!o.extra.length&&!o.noms.length&&!o.pb.length;
/* ── navigateur ── */
const browser=await chromium.launch({headless:true,executablePath:process.env.CHROMIUM_PATH||undefined});
const ctx=await browser.newContext({viewport:{width:390,height:844},isMobile:true,hasTouch:true,deviceScaleFactor:2});const page=await ctx.newPage();
page.on('pageerror',e=>logs.push('PAGEERROR: '+e.message.slice(0,300)));page.on('console',m=>{if(m.type()==='error'&&!/supabase|Failed to fetch|net::ERR|404|geopf|WebSocket|open-meteo|nominatim|ERR_/i.test(m.text()))logs.push(m.text().slice(0,200));});page.on('dialog',d=>d.accept().catch(()=>{}));
const wait=ms=>page.waitForTimeout(ms);
/* données fictives : semaine 45 (lun. 02/11 → ven. 06/11), aujourd'hui mercredi 04/11 ; le chantier de démo « bain » */
const S45=['2026-11-02','2026-11-03','2026-11-04','2026-11-05','2026-11-06'],S44=['2026-10-26','2026-10-27','2026-10-28','2026-10-29','2026-10-30'];
const aff=(ds,t)=>Object.assign(Object.fromEntries(ds.map(d=>[d,['bain']])),t?{'eq:bain':t}:{});
const jour=(p,d,h0,h1,pause)=>({p,d,site:'bain',status:'declare',corr:null,val:[],events:[{t:'start',at:d+'T'+h0}].concat(pause?[{t:'pause',at:d+'T12:00'},{t:'resume',at:d+'T13:00'}]:[]).concat(h1?[{t:'end',at:d+'T'+h1}]:[])});
const row=(id,data)=>({[id]:{id,data,updated_at:'2026-11-03T10:00:00.000Z'}});
const SEED={
 'trace:planning':{'2026-W45':{aff:{'l:karim':aff(S45,'A'),'l:ethan':aff(S45,'A'),'l:julien':aff(S45.slice(0,3),'A')}},'2026-W44':{aff:{'l:karim':aff(S44,'A'),'l:ethan':aff(S44,'A'),'l:julien':aff(S44,'A')}}},
 'trace:pointages':[jour('l:karim','2026-11-02','07:30','16:30',true),jour('l:julien','2026-11-02','07:45','16:15',true),jour('l:karim','2026-11-03','07:30','16:30',true),jour('l:julien','2026-11-03','07:30',null,true)], /* mardi : une journée complète (Tout valider) + une fin manquante (à part) */
 'trace:people':{'l:karim':{adresse:{voie:'1 rue de l\'Essai',cp:'35000',ville:'Rennes'}},'l:julien':{adresse:{voie:'2 rue de l\'Essai',cp:'35000',ville:'Rennes'}}},
 'trace:reg:commande':row('BC-TEST-001',{num:'BC-TEST-001',etat:'envoyee',fournisseur:'Fournisseur Essai',objet:'Manchons de test',site:'bain',lignes:[{designation:'Manchon DN 100 (essai)',qte:10,unite:'u',pu:12.5}],by:'Démo',at:'2026-11-02T09:00:00.000Z'}),
 'trace:reg:debours':Object.assign(row('l:karim|t1',{key:'l:karim',name:'Karim B.',date:'2026-11-03',montant:42.5,nature:'carburant',site:'bain',moyen:'Carte SCR',justif:'ticket remis au chef',etat:'saisi',at:'2026-11-03T17:00:00.000Z'}),
   row('l:julien|t2',{key:'l:julien',name:'Julien R.',date:'2026-11-02',montant:18,nature:'repas',site:'bain',moyen:'Mes deniers (à rembourser)',justif:'ticket remis au chef',etat:'valide',validePar:'Démo',at:'2026-11-02T18:00:00.000Z'})),
 'trace:reg:magdem':Object.assign(row('dm-t1',{byKey:'l:karim',byName:'Karim B.',statut:'envoyee',circuit:'achat',urgent:true,imputation:{id:'bain',label:'Chantier de démo'},lignes:[{label:'Gants anti-coupure (essai)',qte:4,unite:'paires',ref:'X-1'}],at:'2026-11-03T08:00:00.000Z'}),
   row('dm-t2',{byKey:'l:julien',byName:'Julien R.',statut:'cloturee',circuit:'achat',imputation:{id:'bain',label:'Chantier de démo'},lignes:[{label:'Rubalise (essai)',qte:1,unite:'rouleau',ref:'X-2'}],at:'2026-10-28T08:00:00.000Z'}),
   row('mg-t1',{byKey:'l:karim',byName:'Karim B.',statut:'prete',circuit:'magasin',imputation:{id:'bain',label:'Chantier de démo'},lignes:[{label:'Disques à tronçonner (essai)',qte:5,unite:'u',ref:'X-3'}],at:'2026-11-02T08:00:00.000Z'})),
 'trace:reg:accident':row('acc-t1',{type:'presque',d:'2026-11-03',h:'10:15',site:'bain',lieu:'fouille (essai)',names:'Karim B.',circonstances:'Glissade sur une planche mouillée (essai).',by:'Démo',byKey:'l:ethan',at:'2026-11-03T10:30:00.000Z',status:'nouveau'})
};
const fresh=async()=>{await page.goto(BASE+'/index.html');await wait(400);await page.evaluate(()=>{localStorage.clear();localStorage.setItem('trace:testToday','2026-11-04');});
  await page.evaluate(()=>new Promise(r=>{try{const q=indexedDB.deleteDatabase('trace-kv');q.onsuccess=q.onerror=q.onblocked=()=>r();}catch(e){r();}}));await page.reload();await wait(1300);
  const sk=await page.$('#loginSkip');if(sk&&await sk.isVisible())await sk.click();await wait(500);
  await page.evaluate(async S=>{const db=await new Promise((res,rej)=>{const r=indexedDB.open('trace-kv',1);r.onupgradeneeded=()=>r.result.createObjectStore('kv');r.onsuccess=()=>res(r.result);r.onerror=()=>rej(r.error);});
    await new Promise((res,rej)=>{const t=db.transaction('kv','readwrite');const st=t.objectStore('kv');Object.entries(S).forEach(([k,v])=>st.put(v,k));t.oncomplete=()=>res();t.onerror=()=>rej(t.error);});db.close();},SEED);
  await page.reload();await wait(1500);const sk2=await page.$('#loginSkip');if(sk2&&await sk2.isVisible())await sk2.click();await wait(500);};
await fresh();
const as=async(id,poste)=>{await page.evaluate(([id,poste])=>{const T=window.TRACE;if(poste!==undefined)T.demoPoste(id,poste||null);T.state.userId=id;T.showScreen('home');T.renderHome();document.getElementById('htHome').click();},[id,poste]);await wait(450);};
const tab=async id=>{await page.evaluate(id=>document.getElementById(id).click(),id);await wait(550);};
const xgo=async v=>{await page.evaluate(v=>{const e=document.querySelector(`#eq-app [data-act="xgo"][data-v="${v}"]`);if(e)e.click();},v);await wait(800);}; /* une ligne de hub (même repliée dans « Plus d'options ») */
const where=()=>page.evaluate(()=>window.TRACE.tuto.where());
/* écran de chaque clé : [module, ligne du hub] */
const SCREEN={'pilotage:plan':['htExpl','plan'],'pilotage:orga':['htExpl','orga'],'pilotage:obj':['htExpl','obj'],'pilotage:agenda':['htExpl','agenda'],'pilotage:valid':['htExpl','valid'],'pilotage:prodEq':['htExpl','prodEq'],
  'pilotage:rapport':['htExpl','rapport'],'pilotage:gd':['htExpl','gd'],'pilotage:cpt':['htExpl','cpt'],'pilotage:annul':['htExpl','annul'],'pilotage:x:mag':['htExpl','x:mag:equipe'],'pilotage:x:dem':['htExpl','x:dem:file'],
  'pilotage:qhs':['htExpl','qhs'],'pilotage:controles':['htExpl','controles'],'pilotage:accident':['htExpl','accident'],'pilotage:habsEq':['htExpl','habsEq'],
  'affaire:cmd':['htAff','cmd'],'affaire:frais':['htAff','frais'],'affaire:comptes':['htAff','comptes'],'affaire:x:cc':['htAff','x:cc:'],pilotage:['htExpl',null],affaire:['htAff',null]};
/* NB (base, hors lot) : depuis le hub Affaire, « Notes de frais à valider » et « Comptes chantier » ouvrent le volet affiché la dernière fois (« Bons de commande » au départ) :
   ACT.xgo (espace.js) ne règle pas cmdState().tab quand la sous-vue est déjà dans l'onglet (goX le fait). La suite touche la puce du volet, comme le ferait la personne. */
const VOLET={'affaire:cmd':'tab|cmd','affaire:frais':'tab|db','affaire:comptes':'tab|comptes'};
const open=async k=>{if(k==='pilotage:secu'){await tab('htSecu'); /* 31/10 matin (R1) : plus de tuile Sécurité à l'accueil (Ethan : « sécurité, passe-le dans Pilotage ») — la vue Sécurité de Pilotage s'ouvre par son onglet (caché) ou au retour (‹) d'une sous-vue sécurité ouverte depuis une notification */await wait(800);return;}
  const [t,v]=SCREEN[k];await tab(t);if(v)await xgo(v);
  const back=await page.evaluate(()=>{const b=document.querySelector('#eq-app [data-act="cmd"][data-v="back|"], #eq-app [data-act="x"][data-v="dem|gback|"]');if(b){b.click();return true;}return false;});if(back)await wait(500); /* un bon / une demande resté ouvert */
  if(VOLET[k]){await page.evaluate(v=>{const b=document.querySelector(`#eq-app [data-act="cmd"][data-v="${v}"]`);if(b)b.click();},VOLET[k]);await wait(500);}};
const card=()=>page.evaluate(()=>{const r=document.getElementById('tuto');if(!r)return null;const c=r.querySelector('.tutoCard'),h=r.querySelector('.tutoHole');const rc=c.getBoundingClientRect();
  return {mod:c.querySelector('.tutoMod').textContent,t:c.querySelector('.tutoT').textContent,hole:!!h&&getComputedStyle(h).display!=='none',in:rc.left>=0&&rc.right<=innerWidth+0.5&&rc.top>=0&&rc.bottom<=innerHeight+0.5,
    btn:Math.min(...[...c.querySelectorAll('button')].map(b=>b.getBoundingClientRect().height)),open:window.TRACE.tuto.open()};});
/* part réellement visible de la cible surlignée (même règle que tuto.js : 1re cible visible de la liste), entre le bas du bandeau (haut de #homeBody) et le bas de
   l'écran. < 0,6 : SOUS LE BANDEAU = défaut de l'ordre des étapes (une étape qui remonte vers une cible déjà défilée) → échec ; COUPÉE EN BAS = limite du moteur
   (tuto.js ne fait défiler que si la cible est entièrement hors écran ; une ligne à cheval sur le bas reste coupée) → avertissement listé, pas un échec du lot */
const frac=sel=>page.evaluate(sel=>{for(const q of String(sel).split(',')){let el=null;try{el=document.querySelector(q.trim());}catch(e){}if(!el)continue;const r=el.getBoundingClientRect();if(r.width<4||r.height<4)continue;
  const cs=getComputedStyle(el);if(cs.visibility==='hidden'||cs.display==='none')continue;if(r.bottom<0||r.top>innerHeight||r.right<0||r.left>innerWidth)continue;
  const hb=document.getElementById('homeBody');const top=hb&&window.TRACE.state.screen==='home'?Math.max(0,hb.getBoundingClientRect().top):0;const vis=Math.max(0,Math.min(r.bottom,innerHeight)-Math.max(r.top,top));
  return {f:Math.round(100*vis/Math.max(1,Math.min(r.height,innerHeight-top)))/100,haut:r.top<top};}return null;},sel);
/* déroule le tutoriel ouvert : chaque étape qui a une cible doit la surligner (sauf exception notée), et la cible doit être vraiment à l'écran */
const SANS_CIBLE_OK={}; /* clé|titre → raison (cible absente légitimement pour ce personnage) — vide : toutes les cibles existent avec les données de démo */
const WARN=[];const run=async(k,shot)=>{const defs=TU[k]||[];const out={k,steps:[],miss:[],out:[],small:[],cut:[],bas:[],n:0};const c0=await card();if(!c0||!c0.open||c0.open.k!==k){out.err='pas ouvert ('+J(c0&&c0.open)+')';return out;}out.n=c0.open.n;out.mod=c0.mod;
  for(let i=0;i<out.n;i++){await wait(120);const c=await card();if(!c)break;const d=defs.find(s=>s.titre===c.t);out.steps.push(c.t+(c.hole?' ◉':''));
    if(d&&d.sel&&!c.hole&&!SANS_CIBLE_OK[k+'|'+c.t])out.miss.push(c.t);if(d&&d.sel&&c.hole){const f=await frac(d.sel);if(f&&f.f<0.6){(f.haut?out.cut:out.bas).push(c.t+' '+f.f);if(!f.haut)WARN.push(k+' « '+c.t+' » '+f.f);}}if(!d)out.miss.push('?'+c.t);if(!c.in)out.out.push(c.t);if(c.btn<44)out.small.push(c.t);
    if(shot&&shot.at===c.t&&SHOTS)await page.screenshot({path:SHOTS+'/'+shot.file});
    const b=await page.$('#tuto .tutoGo');if(!b)break;await b.click();}
  await wait(150);out.closed=!(await page.$('#tuto'));out.seen=await page.evaluate(k=>window.TRACE.tuto.seen(k),k);return out;};
/* « ? » à droite du titre de l'écran */
const help=async()=>{const h=await page.$('#homeBody h2.vt .tuHelp');if(!h)return false;await h.click();await wait(250);return true;};
const ok=r=>!r.err&&r.n>=1&&!r.miss.length&&!r.out.length&&!r.small.length&&!r.cut.length&&r.closed;
const nOk=(r,k)=>k.includes(':')?(r.n>=3&&r.n<=8):r.n>=2;
const SH={pilotage:{at:'Planning de la semaine',file:'tu_pl_pilotage_390.png'},'pilotage:plan':{at:'＋ Placer, en 3 touchers',file:'tu_pl_planning_390.png'},'pilotage:valid':{at:'✅ Tout valider',file:'tu_pl_pointages_390.png'},'affaire:cmd':{at:'Remplir le bon',file:'tu_pl_bons_390.png'}};
/* ── c2 : chaque clé, 390 px (Ethan, administrateur : il voit tout ; « Commandes au dépôt » : Sophie, bureau) ── */
await page.evaluate(()=>{const W=window.TRACE.tuto;W.keys&&W.keys();});
o={keysApp:await page.evaluate(K=>K.filter(k=>!window.TRACE.tuto.keys().includes(k)),KEYS),res:{}};
const WHO={'pilotage:x:mag':'sophie'};
for(const k of KEYS){const who=WHO[k]||'ethan';await as(who);await open(k);const w=await where();const hb=await help();const r=await run(k,SH[k]);r.who=who;r.where=w;r.help=hb;o.res[k]=r;
  if(!(w===k&&hb&&ok(r)&&nOk(r,k)&&r.mod.startsWith((k.startsWith('affaire')?'Tracé Affaire':'Tracé Pilotage')+(k.includes(':')?' · '+NOMS[k]:''))))console.log('  ✗',k,J(r));}
const bad2=Object.entries(o.res).filter(([k,r])=>!(r.where===k&&r.help&&ok(r)&&nOk(r,k)&&r.mod.startsWith((k.startsWith('affaire')?'Tracé Affaire':'Tracé Pilotage')+(k.includes(':')?' · '+NOMS[k]:'')))).map(([k])=>k);
console.log('c2) 390 px, chaque clé :',J({keysApp:o.keysApp,n:Object.keys(o.res).length,etapes:Object.values(o.res).reduce((a,r)=>a+r.n,0),bad:bad2,detail:Object.fromEntries(Object.entries(o.res).map(([k,r])=>[k,r.n+' · '+r.steps.filter(s=>s.endsWith('◉')).length+' ◉']))}));
/* états « intérieurs » d'un écran (même clé) : un bon ouvert, une demande ouverte, un compte ouvert — les étapes « dans le bon / la demande / le compte »
   surlignent alors leur vraie cible (sur la liste, elles montrent l'entrée qui y mène) */
/* NB (base, hors lot) : toucher un chantier dans « Compte d'un chantier » mène à Aujourd'hui — le rappel homeTab d'app.js (initEspace) n'accepte pas 'affaire', donc tout goX
   vers une sous-vue d'Affaire retombe sur l'accueil. Pour vérifier l'écran du compte, la suite y entre par l'état de l'appli (ce que fera le toucher une fois corrigé). */
const inner=async(k,click,need)=>{await as('ethan');await open(k);
  if(click==='compte'){await page.evaluate(()=>{const T=window.TRACE;const S=T.espace.state().S;S.xsub='x:cc:bain';T.renderHome();});}else await page.evaluate(sel=>{const e=document.querySelector(sel);if(e)e.click();},click);await wait(700);const w=await where();
  await page.evaluate(k=>window.TRACE.tuto.start(k),k);await wait(250);const r=await run(k);r.where=w;r.need=need.filter(t=>!r.steps.includes(t+' ◉'));return r;};
o.inner={cmd:await inner('affaire:cmd','#eq-app [data-act="cmd"][data-v^="open|"]',['Remplir le bon',"L'état du bon",'Les lignes','🖨 Bon de commande']),
  dem:await inner('pilotage:x:dem','#eq-app .dm-row',['🛒 Commandé','📦 Livré / remis']),
  cc:await inner('affaire:x:cc','compte',['Choisis le chantier','Ouvrir un compte','La période','Les totaux','🖨 Imprimer (A4)'])};
const inOk=(r,k)=>r.where===k&&!r.need.length&&!r.cut.length&&!r.out.length&&!r.small.length&&r.closed;
console.log('c2b) états intérieurs :',J(Object.fromEntries(Object.entries(o.inner).map(([x,r])=>[x,{where:r.where,steps:r.steps,need:r.need,cut:r.cut}]))));
C.c1=c1a&&!o.keysApp.length;C.c2=!bad2.length&&inOk(o.inner.cmd,'affaire:cmd')&&inOk(o.inner.dem,'pilotage:x:dem')&&inOk(o.inner.cc,'affaire:x:cc');
/* ── c3 : vues d'ensemble par personnage — une étape par ligne du hub affichée ── */
const hubRows=()=>page.evaluate(()=>[...document.querySelectorAll('#eq-app .ac-row[data-act="xgo"], #eq-app .ac-row[data-act="x"]')].filter(e=>!e.closest('.eq-hubmore')&&e.getBoundingClientRect().height>4).map(e=>e.dataset.v)); /* la ligne repliée sous « Plus d'options » compte avec son pli */
const overview=async(k,who,poste)=>{await as(who,poste);await open(k);const rows=await hubRows();const more=await page.evaluate(()=>!!document.querySelector('#eq-app [data-det="hubPlMore"]'));
  await page.evaluate(k=>window.TRACE.tuto.start(k),k);await wait(250);const r=await run(k);r.rows=rows;r.more=more;r.where=await where();
  r.attendu=1+rows.length+(more?1:0); /* intro + une étape par ligne visible (+ le pli « Plus d'options ») */return r;};
o={};
o.ethan=await overview('pilotage','ethan');o.sophie=await overview('pilotage','sophie');o.chef=await overview('pilotage','julien','chef');o.rh=await overview('pilotage','sophie','assist_rh');
o.secu=await overview('pilotage:secu','ethan');o.secu.attendu=1+o.secu.rows.length+1; /* KPI + lignes + « Aussi dans le chantier » */
o.affE=await overview('affaire','ethan');o.affS=await overview('affaire','sophie','');
/* chef de chantier : « Mon planning et mon équipe » → écran « Ta semaine » et son tutoriel (4 étapes) */
await as('julien','chef');await open('pilotage:orga');o.chefOrga={where:await where(),h2:await page.evaluate(()=>(document.querySelector('#homeBody h2.vt')||{}).textContent||''),help:await help()};Object.assign(o.chefOrga,await run('pilotage:orga'));
await as('julien','');await as('sophie','');
const sum=r=>({n:r.n,att:r.attendu,miss:r.miss,cut:r.cut,steps:r.n===r.attendu?r.steps.length:r.steps,rows:r.n===r.attendu?r.rows.length:r.rows,where:r.where});
console.log('c3) vues d\'ensemble :',J({ethan:sum(o.ethan),sophie:sum(o.sophie),chef:Object.assign(sum(o.chef),{steps:o.chef.steps}),rh:Object.assign(sum(o.rh),{rows:o.rh.rows}),secu:sum(o.secu),affE:sum(o.affE),affS:sum(o.affS),chefOrga:{where:o.chefOrga.where,h2:o.chefOrga.h2,n:o.chefOrga.n,steps:o.chefOrga.steps,miss:o.chefOrga.miss}}));
const ovOk=r=>ok(r)&&r.n===r.attendu;
C.c3=['ethan','sophie','chef','rh','secu','affE','affS'].every(x=>ovOk(o[x]))&&o.ethan.where==='pilotage'&&o.secu.where==='pilotage:secu'&&o.affE.where==='affaire'
  &&o.chef.steps.some(s=>/Mon planning et mon équipe/.test(s))&&!o.chef.steps.some(s=>/Planning de la semaine/.test(s))&&o.rh.rows.includes('cpt')&&o.rh.steps.some(s=>/Compteurs d'heures/.test(s))
  &&o.chefOrga.where==='pilotage:orga'&&/Ta semaine/.test(o.chefOrga.h2)&&o.chefOrga.help&&ok(o.chefOrga)&&o.chefOrga.n===4&&o.chefOrga.steps[0].startsWith('Ta semaine');
/* ── c3b : paliers ALLUMÉS (tout le monde en Socle ; Planning simplifié, Objectifs, Production : tableau, Demandes… en Labo) : les étapes suivent ce que la personne voit ── */
await page.evaluate(()=>window.TRACE.paliers.setOn(true));o.soc=await overview('pilotage','ethan');
await as('ethan');await open('pilotage:orga');await page.evaluate(()=>window.TRACE.tuto.start('pilotage:orga'));await wait(250);o.socOrga=await run('pilotage:orga');
await as('ethan');await open('pilotage:prodEq');await page.evaluate(()=>window.TRACE.tuto.start('pilotage:prodEq'));await wait(250);o.socProd=await run('pilotage:prodEq');
await page.evaluate(()=>window.TRACE.paliers.setOn(false));
console.log('c3b) paliers allumés :',J({hub:sum(o.soc),orga:{n:o.socOrga.n,steps:o.socOrga.steps,miss:o.socOrga.miss},prod:{n:o.socProd.n,steps:o.socProd.steps,miss:o.socProd.miss}}));
C.c3=C.c3&&ovOk(o.soc)&&o.soc.rows.includes('orga')&&!o.soc.rows.includes('plan')&&o.soc.steps.includes('Planning des équipes ◉')&&ok(o.socOrga)&&o.socOrga.n===8&&o.socOrga.steps[0]==='Planning des équipes'
  &&ok(o.socProd)&&o.socProd.n===3&&!o.socProd.steps.some(s=>/Imprimer|tableau|Semaine ou jour|comptés/.test(s));
/* ── c4 : 360 px ── */
await page.setViewportSize({width:360,height:740});o={};
for(const k of ['pilotage','pilotage:valid','affaire:cmd']){await as('ethan');await open(k);await page.evaluate(k=>window.TRACE.tuto.start(k),k);await wait(250);o[k]=await run(k);}
console.log('c4) 360 px :',J(Object.fromEntries(Object.entries(o).map(([k,r])=>[k,{n:r.n,miss:r.miss,out:r.out,small:r.small,cut:r.cut}]))));
C.c4=Object.values(o).every(ok);
await page.setViewportSize({width:390,height:844});
/* ── c5 : au 1er passage (drapeau de test) ── */
o={};await page.evaluate(()=>{localStorage.setItem('trace:tuto:test','1');window.TRACE.tuto.reset();});await as('ethan');await page.evaluate(()=>window.TRACE.tuto.close(null));
await tab('htAff');await wait(1300);o.hub=await page.evaluate(()=>window.TRACE.tuto.open());if(o.hub)await page.evaluate(()=>window.TRACE.tuto.close('passe'));
await xgo('cmd');await wait(1300);o.cmd=await page.evaluate(()=>window.TRACE.tuto.open());if(o.cmd)await page.evaluate(()=>window.TRACE.tuto.close('passe'));
await tab('htAff');await xgo('cmd');await wait(1300);o.again=await page.evaluate(()=>window.TRACE.tuto.open());
await page.evaluate(()=>{localStorage.removeItem('trace:tuto:test');window.TRACE.tuto.close(null);});
console.log('c5) 1er passage :',J(o));
C.c5=!!o.hub&&o.hub.k==='affaire'&&!!o.cmd&&o.cmd.k==='affaire:cmd'&&!o.again;
/* ── c6 : captures ── */
C.c6=!SHOTS||Object.values(SH).every(s=>fs.existsSync(SHOTS+'/'+s.file));
C.c7=!logs.length;if(logs.length)console.log('console :',logs);
if(WARN.length)console.log('⚠ cibles coupées en bas d\'écran (limite de tuto.js, pas du lot) :',J([...new Set(WARN)]));
console.log('RÉSULTATS',J(C));console.log('RESULTAT:',Object.values(C).every(Boolean)?'TOUT VERT':'ÉCHEC '+Object.keys(C).filter(k=>!C[k]).join(' '));await browser.close();process.exit(Object.values(C).every(Boolean)?0:1);
