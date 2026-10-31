// e2e_tuto_co_3110.mjs — 31/10 (lot co). Ethan : « les tutos […] un par module qui décrit toutes les options, et des tutos par option, vastes, pour que tout le monde
// sache se servir de toutes les options ». Lot co = src/tutos_compagnon.js : Aujourd'hui (accueil), Compagnon et ses rubriques, Équipe et ses options, Réglages.
//  s1  textes (sans navigateur) : chaque clé a ses étapes, chaque option son nom (NOMS) ; titre ≤ 40 caractères, texte ≤ 200 caractères et ≤ 2 phrases, titres uniques
//      dans un tutoriel, aucun nom de personne / de chantier ; tutoriel d'option : 3 à 8 étapes
//  s2  390 px : POUR CHAQUE CLÉ, son écran ouvert (personnage qui y a accès) → TRACE.tuto.where() vaut la clé (vue d'ensemble : le module) ; tutoriel lancé
//      (TRACE.tuto.start), toutes les étapes déroulées : titre de la carte « Tracé Module · Option », carte dans l'écran, boutons ≥ 44 px, chaque étape qui a une cible
//      la surligne (#tuto .tutoHole affiché) sauf exceptions justifiées (EXC), « Terminé ✓ » ferme et mémorise ; nombre d'étapes affichées (3 à 8 pour une option)
//  s3  rôles : Aujourd'hui / Compagnon sans pointage (chef administrateur), Équipe et Documents d'entreprise côté soudeur (lignes et boutons réservés absents) ;
//      vue d'ensemble de Compagnon ≤ 8 étapes pour un opérateur (e2e_mo_3110 la déroule en 8 touchers)
//  s4  premier passage (drapeau de test) : entrer dans Compagnon → sa vue d'ensemble ; puis dans Documents → le tutoriel détaillé « Documents » ; « ? » relance
//      celui de l'écran ; 📚 Tous les tutoriels liste les rubriques de Compagnon, les options d'Équipe et Réglages
//  s5  360 px : 3 tutoriels (Aujourd'hui, Mes demandes, Annuaire) — carte dans l'écran, cibles surlignées
//  s6  console propre
// Données : date figée au jeudi 29/10 (trace:testToday) ; un pointage du 28/10 sans fin (carte « Tes derniers pointages ») ; bac à sable (chantier de démo, planning,
// pointage en cours, objectifs, tâches) ; un véhicule « laissé » à Karim (rubriques Véhicule laissé / Véhicule) ; un chantier dont Karim est chef (rubrique Chantiers).
import { chromium } from 'playwright';
import path from 'path';import {fileURLToPath} from 'url';
const here=path.dirname(fileURLToPath(import.meta.url));
const MOD=await import(path.join(here,'..','src','tutos_compagnon.js'));const DEF=MOD.default,NOMS=MOD.NOMS;
const BASE=process.env.BASE||'http://localhost:8765';const SHOTS=process.env.SHOTS||'';
const C={};const logs=[];const J=x=>JSON.stringify(x);
/* ── s1 : textes ── */
{const pb=[];const phr=t=>(t.replace(/«\s\?\s»/g,'').match(/[.!?](?=\s|$)/g)||[]).length+(t.match(/…(?=\s+[A-ZÀ-ÝÉ«])/g)||[]).length;
  const KEYS=['accueil','compagnon','compagnon:docs','compagnon:planning','compagnon:chantiers','compagnon:prod','compagnon:frais','compagnon:heures','compagnon:habs','compagnon:avatar','compagnon:dem','compagnon:mag','compagnon:vlaisse','compagnon:vx',
    'equipe','equipe:annu','equipe:docs','equipe:info','equipe:x:acc','equipe:x:dob','equipe:x:pack','reglages'];
  KEYS.forEach(k=>{if(!Array.isArray(DEF[k])||!DEF[k].length)pb.push(k+' : absent');});Object.keys(DEF).forEach(k=>{if(!KEYS.includes(k))pb.push(k+' : clé en trop');});
  Object.entries(DEF).forEach(([k,L])=>{if(k.includes(':')&&!NOMS[k])pb.push(k+' : pas de nom');const T=new Set();
    if(k.includes(':')&&(L.length<3||L.length>8))pb.push(k+' : '+L.length+' étapes');
    L.forEach(s=>{if(!s.titre||s.titre.length>40)pb.push(k+' titre '+s.titre);if(!s.texte||s.texte.length>200)pb.push(k+' texte trop long ('+(s.texte||'').length+') '+s.titre);if(phr(s.texte)>2)pb.push(k+' plus de 2 phrases : '+s.titre);
      if(T.has(s.titre))pb.push(k+' titre en double '+s.titre);T.add(s.titre);if(/Karim|Julien|Ethan|Sophie|Caen|Saint-?Lô|gars\b/i.test(s.titre+' '+s.texte))pb.push(k+' donnée réelle / mot à éviter : '+s.titre);
      if(s.sel&&/nth-child|nth-of-type|:contains/.test(s.sel))pb.push(k+' cible fragile '+s.sel);});});
  console.log('s1) textes :',Object.keys(DEF).length,'clés,',Object.values(DEF).reduce((a,L)=>a+L.length,0),'étapes',pb.length?J(pb):'OK');C.s1=!pb.length;}

const browser=await chromium.launch({headless:true, executablePath: process.env.CHROMIUM_PATH||undefined});
const ctx=await browser.newContext({viewport:{width:390,height:844},deviceScaleFactor:2,hasTouch:true});const page=await ctx.newPage();
page.on('pageerror',e=>logs.push('PAGEERROR: '+e.message.slice(0,300)));page.on('console',m=>{if(m.type()==='error'&&!/supabase|Failed to fetch|net::ERR|404|geopf|WebSocket/i.test(m.text()))logs.push(m.text().slice(0,200));});page.on('dialog',d=>d.accept().catch(()=>{}));
const wait=ms=>page.waitForTimeout(ms);
const skipLogin=async()=>{const sk=await page.$('#loginSkip');if(sk&&await sk.isVisible())await sk.click();await wait(700);};
/* un véhicule laissé à Karim (registre « vehicule ») et la configuration d'état des lieux minimale (registre « vcfg », normalement importée par le pack) — sur l'appareil */
const AT='2026-10-28T16:00:00.000Z';
const KV={'trace:reg:vehicule':{'AB-123-CD':{id:'AB-123-CD',data:{immat:'AB-123-CD',marque:'Renault',modele:'Master',type:'fourgon',km:45210,laisse:{par:'Un collègue',at:AT,ou:'au dépôt',aKey:'l:karim',a:'Karim B.'}},updated_at:AT}},
  'trace:reg:vcfg':{config:{id:'config',data:{edl:{photos:[{id:'av',label:'Avant',obl:true},{id:'ar',label:'Arrière',obl:true}],releves:[],controles:[{id:'pneus',label:'Pneus'}],docs:[{id:'cg',label:'Carte grise'}]}},updated_at:AT}}};
await page.goto(BASE+'/manifest.webmanifest');await wait(200); /* même origine, sans l'appli : la base de l'appareil se vide et se remplit sans connexion ouverte (sinon la suppression attend) */
await page.evaluate(()=>{localStorage.clear();localStorage.setItem('trace:testToday','2026-10-28');});
await page.evaluate(()=>new Promise(r=>{try{const q=indexedDB.deleteDatabase('trace-kv');q.onsuccess=q.onerror=q.onblocked=()=>r();}catch(e){r();}}));
await page.evaluate(rows=>new Promise((res,rej)=>{const r=indexedDB.open('trace-kv',1);r.onupgradeneeded=()=>r.result.createObjectStore('kv');r.onsuccess=()=>{const db=r.result;const t=db.transaction('kv','readwrite');const st=t.objectStore('kv');Object.entries(rows).forEach(([k,v])=>st.put(v,k));t.oncomplete=()=>{db.close();res();};t.onerror=()=>rej(t.error);};r.onerror=()=>rej(r.error);}),KV);
await page.goto(BASE+'/index.html');await wait(1300);await skipLogin();
const as=async id=>{await page.evaluate(id=>{const T=window.TRACE;T.tuto.close(null);T.state.userId=id;T.showScreen('home');document.getElementById('homeLogo').click();},id);await wait(500);}; /* le logo = Aujourd'hui (le geste réel) */
const tab=async id=>{await page.evaluate(id=>document.getElementById(id).click(),id);await wait(550);};
const sub=async v=>{const ok=await page.evaluate(v=>{const b=document.querySelector('#eq-app .eq-subs [data-v="'+v+'"]');if(b)b.click();return !!b;},v);await wait(550);return ok;};
const xgo=async v=>{const ok=await page.evaluate(v=>{const b=document.querySelector('#eq-app [data-act="xgo"][data-v="'+v+'"]');if(b)b.click();return !!b;},v);await wait(550);return ok;};
const where=()=>page.evaluate(()=>window.TRACE.tuto.where()||'');
/* le 28/10, Karim commence sa journée et oublie de pointer la fin → le 29/10, « Tes derniers pointages » montre « ⚠ fin manquante » */
await as('karim');await tab('htEspace');await page.evaluate(()=>{const b=document.querySelector('#eq-app [data-act="pointer"][data-v="start"]');if(b)b.click();});await wait(500);
await page.evaluate(()=>localStorage.setItem('trace:testToday','2026-10-29'));await page.reload();await wait(1300);await skipLogin();
await as('ethan');const sbx=await page.evaluate(async()=>{try{await window.TRACE.sandbox.act('on');return window.TRACE.sandbox.on();}catch(e){return 'ERR '+e.message;}});await wait(1200);
console.log('données : bac à sable',J(sbx));
const card=()=>page.evaluate(()=>{const r=document.getElementById('tuto');if(!r)return null;const c=r.querySelector('.tutoCard'),h=r.querySelector('.tutoHole');if(!c)return null;const rc=c.getBoundingClientRect();const sp=s=>s.replace(/\u00a0/g,' '); /* espaces insécables (typographie) → espaces */
  return {mod:c.querySelector('.tutoMod').textContent,t:sp(c.querySelector('.tutoT').textContent),x:sp(c.querySelector('.tutoX').textContent),left:Math.round(rc.left),right:Math.round(rc.right),top:Math.round(rc.top),bottom:Math.round(rc.bottom),W:innerWidth,H:innerHeight,
    hole:!!h&&getComputedStyle(h).display!=='none',btns:[...c.querySelectorAll('button')].map(b=>Math.round(b.getBoundingClientRect().height))};});
const inScreen=c=>c&&c.left>=0&&c.right<=c.W&&c.top>=0&&c.bottom<=c.H&&c.btns.every(h=>h>=44);
const TITRE={compagnon:'Tracé Compagnon',equipe:'Tracé Équipe',accueil:'Tracé',reglages:'Tracé · Réglages'};
const titreDe=k=>k.includes(':')?TITRE[k.split(':')[0]]+' · '+NOMS[k]:TITRE[k];
/* cibles légitimement absentes pour le personnage / les données du test : l'étape s'affiche alors au centre (voulu). Aucune avec les données ci-dessus : les étapes
   réservées (pointage, encadrement, administrateur…) sont retirées par leur condition « si » quand la cible n'existe pas pour la personne — vérifié en s3.
   Seule cible fragile connue : « Qui est là ? » (compagnon:vx) n'existe qu'à la 1re étape d'un état des lieux fait seul ; le test ouvre l'assistant à cette étape. */
const EXC={};
const R={};
async function run(k,who,nav,o={}){if(who)await as(who);const navOk=await nav();await wait(250);const w=await where();
  const okWhere=k.includes(':')?w===k:(w===k||w.startsWith(k+':'));
  const started=await page.evaluate(k=>window.TRACE.tuto.start(k),k);await wait(400);const n0=(await page.evaluate(()=>window.TRACE.tuto.open()))||{};
  const steps=[],pb=[];for(let i=0;i<14;i++){const c=await card();if(!c)break;steps.push(c);
    if(SHOTS&&o.shot&&i===o.shotAt)await page.screenshot({path:SHOTS+'/'+o.shot});
    if(SHOTS&&process.env.SHOTS_ALL)await page.screenshot({path:SHOTS+'/tout_'+(k+(o.tag?'_'+o.tag:'')).replace(/[^a-z0-9]+/gi,'_')+'_'+(i+1)+'.png',scale:'css'}); /* revue : chaque étape de chaque tutoriel (facultatif) */
    const b=await page.$('#tuto .tutoGo');if(!b)break;await b.click();await wait(320);}
  const closed=!(await page.$('#tuto'));const seen=await page.evaluate(k=>window.TRACE.tuto.seen(k),k);
  const def=DEF[k]||[];const exc=(EXC[k]||[]).concat(o.exc||[]);
  steps.forEach((c,i)=>{const d=def.find(s=>s.titre.replace(/\u00a0/g,' ')===c.t);if(!d){pb.push('étape inconnue « '+c.t+' »');return;}
    if(!c.mod.startsWith(titreDe(k)+' · '+(i+1)+' / '))pb.push('titre de carte '+c.mod);
    if(d.sel&&!c.hole&&!exc.includes(d.titre))pb.push('pas surlignée : '+d.titre);if(!inScreen(c))pb.push('hors écran : '+d.titre+' '+J([c.left,c.right,c.top,c.bottom]));});
  if(!started)pb.push('start refusé');if(navOk===false)pb.push('navigation impossible');if(!okWhere)pb.push('where = '+w);if(!closed)pb.push('pas fermé après la dernière étape');if(!seen)pb.push('pas mémorisé');
  if(steps.length!==n0.n)pb.push('étapes : '+steps.length+' déroulées / '+n0.n);
  if(k.includes(':')&&(steps.length<3||steps.length>8))pb.push(steps.length+' étapes affichées');
  if(o.n!==undefined&&steps.length!==o.n)pb.push('attendu '+o.n+' étapes, '+steps.length);
  if(o.max!==undefined&&steps.length>o.max)pb.push('plus de '+o.max+' étapes : '+steps.length);
  if(o.sans)o.sans.forEach(t=>{if(steps.some(c=>c.t===t))pb.push('étape réservée visible : '+t);});
  if(o.avec)o.avec.forEach(t=>{if(!steps.some(c=>c.t===t))pb.push('étape attendue absente : '+t);});
  const lab=k+(o.tag?' ('+o.tag+')':'');R[lab]={who,where:w,n:steps.length,holes:steps.filter(c=>c.hole).length,pb};
  console.log('  '+lab.padEnd(34)+(who||'').padEnd(7)+' where='+w.padEnd(22)+' '+steps.length+' étapes, '+steps.filter(c=>c.hole).length+' surlignées'+(pb.length?'  ✗ '+J(pb):'  ✓'));
  await page.evaluate(()=>window.TRACE.tuto.close(null));return pb.length===0;}
const espace=async v=>{await tab('htEspace');if(v)return await sub(v);return true;};
const ent=async v=>{await tab('htEnt');if(v)return await xgo(v);return true;};
/* ── s2 : chaque clé, 390 px ── */
console.log('s2) 390 px, chaque clé :');let ok2=true;
ok2=await run('accueil','karim',async()=>true,{shot:'tuto_co_accueil_pointer_390.png',shotAt:3})&&ok2;
ok2=await run('compagnon','karim',()=>espace(),{shot:'tuto_co_compagnon_390.png',shotAt:1,avec:['Accueil et pointage','Véhicule laissé'],sans:['Accueil : ta journée','Chantiers']})&&ok2; /* Karim a un véhicule laissé (données du test) */
ok2=await run('compagnon:docs','karim',()=>espace('docs'))&&ok2;
ok2=await run('compagnon:planning','karim',()=>espace('planning'),{avec:['Ouvrir le chantier'],sans:['Composer ma semaine']})&&ok2;
ok2=await run('compagnon:prod','karim',()=>espace('prod'))&&ok2;
ok2=await run('compagnon:frais','karim',()=>espace('frais'))&&ok2;
ok2=await run('compagnon:heures','karim',()=>espace('heures'),{shot:'tuto_co_heures_390.png',shotAt:2,avec:['Tes derniers pointages']})&&ok2;
ok2=await run('compagnon:habs','karim',()=>espace('habs'))&&ok2;
ok2=await run('compagnon:mag','karim',()=>espace('mag'))&&ok2;
await page.evaluate(()=>window.TRACE.band.setModules(['magasin']));ok2=await run('compagnon:dem','karim',()=>espace('dem'),{sans:['📋 Demandes à traiter']})&&ok2;await page.evaluate(()=>window.TRACE.band.setModules([])); /* 31/10 : « Mes demandes » sans magasin = module Magasin non pris */
ok2=await run('compagnon:avatar','karim',()=>espace('avatar'))&&ok2;
ok2=await run('compagnon:vlaisse','karim',()=>espace('vlaisse'))&&ok2;
ok2=await run('compagnon:vx','karim',async()=>{if(!await espace('vlaisse'))return false;return await page.evaluate(()=>{const b=document.querySelector('#eq-app .veh2-card .veh-big');if(b)b.click();return !!b;});})&&ok2;
/* rubrique Chantiers : Karim devient chef d'un chantier (fiche du chantier sur l'appareil), sans les droits d'équipe — puis on remet la fiche */
const sid=await page.evaluate(()=>{const T=window.TRACE;const id=Object.keys(T.sites).find(k=>k!=='__vide'&&T.sites[k]&&T.sites[k].lines&&k!=='demo_caen');const n=T.sites[id];window.__ficheAvant=n.fiche;n.fiche=Object.assign({},n.fiche||{},{chef:'l:karim'});return id;});
ok2=await run('compagnon:chantiers','karim',()=>espace('chantiers'))&&ok2;
await page.evaluate(id=>{window.TRACE.sites[id].fiche=window.__ficheAvant;},sid);
ok2=await run('equipe','ethan',()=>ent(),{shot:'tuto_co_equipe_390.png',shotAt:6,avec:['Documents administratifs','Pack SCR','Administration'],sans:["L'équipe de ton chantier",'Accueil RH',"Présentation de l'entreprise"]})&&ok2;
ok2=await run('equipe:annu','ethan',()=>ent('annu'),{avec:['Ancienneté et médailles']})&&ok2;
ok2=await run('equipe:docs','ethan',()=>ent('docs'),{avec:['📗 Accueil RH','➕ Note de service','⚡ Flash info sécurité','À relancer']})&&ok2;
ok2=await run('equipe:info','ethan',()=>ent('info'),{avec:['📣 Publier une info']})&&ok2;
ok2=await run('equipe:x:acc','ethan',async()=>{if(!await ent('docs'))return false;return await xgo('x:acc:admin');}, /* 31/10 : Accueil RH dans Documents d'entreprise */{avec:['1. Importer le pack','2. Joindre les PDF']})&&ok2;
ok2=await run('equipe:x:dob','ethan',()=>ent('x:dob:ent'),{avec:['📎 Déposer','＋ Autre document']})&&ok2;
ok2=await run('equipe:x:pack','ethan',()=>ent('x:pack:imp'))&&ok2;
ok2=await run('reglages','ethan',async()=>{await tab('htAdmin');await wait(700);return true;},{shot:'tuto_co_reglages_390.png',shotAt:5,n:DEF.reglages.length})&&ok2;
C.s2=ok2;
/* ── s3 : rôles ── */
console.log('s3) rôles :');let ok3=true;
ok3=await run('accueil','ethan',async()=>true,{tag:'chef, sans pointage',sans:['Pointer ta journée']})&&ok3;
ok3=await run('compagnon','ethan',()=>espace(),{tag:'chef, sans pointage',avec:['Accueil : ta journée'],sans:['Accueil et pointage','Heures et Productions','Véhicule laissé']})&&ok3;
ok3=await run('compagnon','julien',()=>espace(),{tag:'opérateur',max:8,avec:['Accueil et pointage','Heures et Productions'],sans:['Véhicule laissé','Chantiers']})&&ok3; /* le véhicule est laissé à Karim, pas à Julien */
ok3=await run('compagnon:planning','ethan',()=>espace('planning'),{tag:'encadrement',avec:['Composer ma semaine']})&&ok3;
ok3=await run('equipe','karim',()=>ent(),{tag:'soudeur',n:4, /* 31/10 : plus de Présentation */sans:['Accueil RH','Documents administratifs','Pack SCR','Administration']})&&ok3;
ok3=await run('equipe:docs','karim',()=>ent('docs'),{tag:'soudeur',n:3,sans:['📗 Accueil RH','➕ Note de service','À relancer']})&&ok3;
ok3=await run('equipe:info','karim',()=>ent('info'),{tag:'soudeur',n:3,sans:['📣 Publier une info']})&&ok3;
ok3=await run('equipe:annu','karim',()=>ent('annu'),{tag:'soudeur',sans:['Ancienneté et médailles']})&&ok3;
C.s3=ok3;
/* ── s4 : premier passage, « ? », catalogue ── */
let o={};await page.evaluate(()=>{localStorage.setItem('trace:tuto:test','1');});await as('julien');await page.evaluate(()=>window.TRACE.tuto.reset());
await page.evaluate(()=>window.TRACE.tuto.close(null));await tab('htEspace');await wait(1400);o.first=await page.evaluate(()=>window.TRACE.tuto.open());await page.evaluate(()=>window.TRACE.tuto.close('fait'));
await sub('docs');await wait(1400);o.docs=await page.evaluate(()=>window.TRACE.tuto.open());if(o.docs)o.docsCard=(await card()).mod;await page.evaluate(()=>window.TRACE.tuto.close('fait'));
await sub('docs');await wait(1200);o.again=!!(await page.evaluate(()=>window.TRACE.tuto.open()));
await page.evaluate(()=>{const b=document.querySelector('#homeBody h2.vt .tuHelp');if(b)b.click();});await wait(400);o.help=await page.evaluate(()=>window.TRACE.tuto.open());await page.evaluate(()=>window.TRACE.tuto.close(null));
await page.evaluate(()=>localStorage.removeItem('trace:tuto:test'));
await as('ethan');await page.evaluate(()=>window.TRACE.tuto.catalog());await wait(500);
o.cat=await page.evaluate(()=>Object.fromEntries([...document.querySelectorAll('#modal .tuCatM')].map(m=>[m.querySelector('b').textContent,[...m.querySelectorAll('.tuCatI span')].map(s=>s.textContent)])));
await page.evaluate(()=>{const b=document.querySelector('#modal [data-close]');if(b)b.click();});await wait(300);
console.log('s4) premier passage, ?, catalogue :',J(o));
const catC=o.cat['Tracé Compagnon']||[],catE=o.cat['Tracé Équipe']||[],catR=o.cat['Réglages']||[];
C.s4=o.first&&o.first.k==='compagnon'&&o.docs&&o.docs.k==='compagnon:docs'&&/^Tracé Compagnon · Documents · 1 \//.test(o.docsCard||'')&&!o.again&&o.help&&o.help.k==='compagnon:docs'
  &&['Documents','Planning','Productions','Notes de frais','Heures','Passeport','Avatar','Mes demandes · commande','Mes demandes · dépôt','Véhicule laissé','Véhicule','Chantiers'].every(x=>catC.includes(x))&&catC[0]==="Vue d'ensemble du module"
  &&['Annuaire',"Documents d'entreprise",'Communication interne','Accueil RH','Documents administratifs','Pack SCR'].every(x=>catE.includes(x))&&catR.length===1&&(o.cat['Tracé']||[]).length===1;
/* ── s5 : 360 px ── */
console.log('s5) 360 px :');await page.setViewportSize({width:360,height:740});await wait(300);let ok5=true;
ok5=await run('accueil','karim',async()=>true,{tag:'360',shot:'tuto_co_accueil_360.png',shotAt:4})&&ok5;
await page.evaluate(()=>window.TRACE.band.setModules(['magasin']));ok5=await run('compagnon:dem','karim',()=>espace('dem'),{tag:'360'})&&ok5;await page.evaluate(()=>window.TRACE.band.setModules([]));
ok5=await run('equipe:annu','ethan',()=>ent('annu'),{tag:'360'})&&ok5;
await page.setViewportSize({width:390,height:844});C.s5=ok5;
C.s6=!logs.length;if(logs.length)console.log('console :',logs);
console.log('RÉSULTATS',J(C));console.log('RESULTAT:',Object.values(C).every(Boolean)?'TOUT VERT':'ÉCHEC '+Object.keys(C).filter(k=>!C[k]).join(' '));await browser.close();process.exit(Object.values(C).every(Boolean)?0:1);
