// e2e_tuto_te_3110.mjs — 31/10 (lot TE) : TUTORIELS DÉTAILLÉS des onglets « 🔧 Technique » d'un chantier + du traceur (Tracé Concepteur) — src/tutos_technique.js.
// Ethan (31/10) : « un tuto par module qui décrit toutes les options, et des tutos par option, vastes, pour que tout le monde sache se servir de toutes les options ».
//  t0  le fichier : 9 clés (8 onglets + concepteur), NOMS = libellé exact de l'onglet, 3 à 8 étapes par onglet (concepteur : intro + une étape par option) ;
//      titre ≤ 40 car., texte ≤ 2 phrases et ≤ 210 car. ; sélecteurs valides et robustes (ni :nth-child ni texte) ; aucune donnée réelle (personnes, chantiers, clients, fournisseurs)
//  t1  390 px, Ethan (chef de chantier, administrateur : voit tout) — pour CHAQUE onglet : ouvert au doigt (🔧 Technique → onglet ; Catalogue par « ⋯ Plus »),
//      TRACE.tuto.where() = la clé, le « ? » du chantier (#btnTuto) lance CE tutoriel ; toutes les étapes déroulées : bon titre dans le bon ordre (filtre « si » compris),
//      étape avec cible → découpe affichée, sur une cible VRAIMENT visible (jamais dans un pli <details> fermé) qu'elle recouvre ; sans cible → carte au centre ;
//      carte entière dans l'écran, boutons ≥ 44 px ; « Terminé ✓ » ferme et marque vu
//      Deux passes : à VIDE d'abord (1er passage, comme quand le tutoriel s'ouvre tout seul : les étapes dont la cible a besoin de données tombent au centre, jamais une
//      découpe à côté), puis REMPLI pour Stockage, Phasage et Modifications — données fictives créées par l'appli elle-même : une livraison « prévue » (＋ Nouvelle livraison,
//      zone posée au doigt), une phase marché, une modif déclarée — où ces étapes doivent surligner leur cible
//  t2  traceur (traceur.html, 390 px) : « ? » (#bTuto) → « Tracé Concepteur · 1 / 12 », mêmes contrôles ; un plan de fond (image fictive) ajouté → « Caler un plan » surligne ⟲ 2 points
//  t3  Karim (soudeur) : ses deux onglets techniques (Détection d'humidité, Points de contrôle) — clé, étapes filtrées (pas « Suivre une autre pièce », réservée à l'encadrement)
//  t4  360 px : 3 tutoriels (Détection d'humidité, Modifications, Tracé Concepteur) — carte dans l'écran, découpes sur leur cible
//  t5  console propre ; captures 390 (SHOTS=dossier) de 5 tutoriels
// Cibles LÉGITIMEMENT absentes (carte au centre, attendue) :
//  · chantier:points « Mode opératoire hydraulique » (#points [data-moterrain]) : aucun mode opératoire préparé sur le chantier de démonstration (il naît dans Hydraulique)
//  · concepteur « 🕑 Versions » (#tbVers) : le bouton n'existe que dans une étude ouverte depuis Commerce, pas pour un chantier
//  · à vide seulement : Stockage « 📦 Le camion est arrivé », « Une carte par zone », « Besoin / livré / reste à poser » (surligné seulement quand des zones existent :
//    sinon, page courte, il tombe sous la barre d'onglets) ; Modifications « Les modifs déclarées »
// « Vraiment visible » = un toucher au centre (ou en haut) de la cible l'atteint, calque du tutoriel transparent : le moteur ne fait défiler que si la cible sort de la fenêtre,
// une cible coincée sous le bandeau du chantier ou la barre d'onglets serait « surlignée » invisible — ce test l'attrape.
import { chromium } from 'playwright';import fs from 'fs';import path from 'path';import zlib from 'zlib';import {fileURLToPath} from 'url';
const BASE=process.env.BASE||'http://localhost:8765';const SHOTS=process.env.SHOTS||'';
const here=path.dirname(fileURLToPath(import.meta.url));
const TU=await import('data:text/javascript;base64,'+Buffer.from(fs.readFileSync(path.join(here,'..','src','tutos_technique.js'),'utf8')).toString('base64'));
const DEF=TU.default,NOMS=TU.NOMS;
const TABS=['bouclage','hydro','stock','fourniture','phasage','ts','points','catalogue'];
const LEGIT_ABSENT={'chantier:points':['Mode opératoire hydraulique'],concepteur:['🕑 Versions']};
const EMPTY_ABSENT={'chantier:stock':['📦 Le camion est arrivé','Une carte par zone','Besoin / livré / reste à poser'],'chantier:ts':['Les modifs déclarées']};
const C={};const logs=[];const J=x=>JSON.stringify(x);
const browser=await chromium.launch({headless:true, executablePath: process.env.CHROMIUM_PATH||undefined});
const ctx=await browser.newContext({viewport:{width:390,height:844},deviceScaleFactor:1,hasTouch:true});const page=await ctx.newPage();
const watch=p=>{p.on('pageerror',e=>logs.push('PAGEERROR: '+e.message.slice(0,300)));p.on('console',m=>{if(m.type()==='error'&&!/supabase|Failed to fetch|net::ERR|404|geopf|WebSocket|open-meteo/i.test(m.text()))logs.push(m.text().slice(0,200));});p.on('dialog',d=>d.accept().catch(()=>{}));};watch(page);
await ctx.route(u=>/(^|\.)geopf\.fr$|^geo\.api\.gouv\.fr$|open-meteo\.com$|openstreetmap|overpass/.test(u.hostname),route=>route.fulfill({status:200,contentType:'application/json',body:'[]'}));
const wait=ms=>page.waitForTimeout(ms);
const shot=async(p,n)=>{if(!SHOTS)return;try{fs.mkdirSync(SHOTS,{recursive:true});await p.screenshot({path:`${SHOTS}/${n}.png`});}catch(e){console.log('capture',n,e.message);}};
/* ── t0 : le fichier ── */
let o={};const sentences=t=>(String(t).replace(/…/g,'').replace(/\.\s*»/g,' »').match(/[.!?](\s|$)/g)||[]).length;
const REAL=/\b(karim|julien|ethan|sophie|lebihan|bain|saint-l[oô]|renalia|logstor|axiom|inpal)\b/i;
o.keys=Object.keys(DEF);o.noms=Object.keys(NOMS);o.bad=[];
for(const [k,st] of Object.entries(DEF)){const opt=k.startsWith('chantier:');if(opt&&(st.length<3||st.length>8))o.bad.push(k+' : '+st.length+' étapes');if(!opt&&st.length<9)o.bad.push(k+' : vue d\'ensemble trop courte');
  if(new Set(st.map(s=>s.titre)).size!==st.length)o.bad.push(k+' : titres en double');
  st.forEach((s,i)=>{const w=k+' #'+(i+1);if(!s.titre||s.titre.length>40)o.bad.push(w+' titre');if(!s.texte||s.texte.length>210)o.bad.push(w+' texte '+(s.texte||'').length);if(sentences(s.texte)>2)o.bad.push(w+' > 2 phrases');
    if(s.sel&&/:nth-|:contains|:first-child|:last-child/.test(s.sel))o.bad.push(w+' sélecteur fragile');if(REAL.test(s.titre+' '+s.texte))o.bad.push(w+' donnée réelle');if(/les gars/i.test(s.texte))o.bad.push(w+' « les gars »');
    if(s.si&&typeof s.si!=='function')o.bad.push(w+' si');});}
console.log('t0) fichier :',J(o));
C.t0=o.keys.join()==='chantier:bouclage,chantier:hydro,chantier:stock,chantier:fourniture,chantier:phasage,chantier:ts,chantier:points,chantier:catalogue,concepteur'&&TABS.every(t=>NOMS['chantier:'+t])&&!o.bad.length;
/* ── outils ── */
const fresh=async()=>{await page.goto(BASE+'/index.html');await wait(400);await page.evaluate(()=>localStorage.clear());await page.evaluate(()=>new Promise(r=>{try{const q=indexedDB.deleteDatabase('trace-kv');q.onsuccess=q.onerror=q.onblocked=()=>r();}catch(e){r();}}));
  await page.reload();await wait(1500);const sk=await page.$('#loginSkip');if(sk&&await sk.isVisible())await sk.click();await wait(700);};
const as=async id=>{await page.evaluate(id=>{const T=window.TRACE;T.tuto.close(null);T.state.userId=id;T.showScreen('home');T.renderHome();},id);await wait(400);};
let SITE=null;
const openSite=async()=>{SITE=await page.evaluate(()=>{const T=window.TRACE;const id=Object.keys(T.sites).find(k=>k!=='__vide'&&T.sites[k]&&T.sites[k].lines&&Object.keys(T.sites[k].lines).length);T.openSiteFromHome(id);return id;});await page.waitForFunction(()=>window.TRACE.state.screen==='site'&&window.TRACE.net&&window.TRACE.net.id!=='__vide',null,{timeout:20000}).catch(()=>{});await wait(1500);};
const toTech=async()=>{await page.click('#facets [data-facet="tech"]');await wait(500);};
const goTab=async t=>{await page.evaluate(()=>{window.TRACE.tuto.close(null);window.TRACE.closeSheet&&window.TRACE.closeSheet();});
  if(t==='catalogue'){await page.click('#tabbar [data-tab="__more"]');await wait(350);await page.click('#modal [data-nmt="catalogue"]');}else await page.click(`#tabbar [data-tab="${t}"]`);
  await wait(900);await page.evaluate(()=>{const s=document.querySelector('main')||document.scrollingElement;window.scrollTo(0,0);document.querySelectorAll('.view.active,.view.active .pad').forEach(e=>{e.scrollTop=0;});});await wait(150);};
// étape affichée : carte, découpe, cible (même règle que tuto.js : 1re cible visible de la liste), cible dans un pli fermé ?, découpe sur la cible ?
const STEP=sel=>{const root=document.getElementById('tuto');if(!root)return null;const card=root.querySelector('.tutoCard'),hole=root.querySelector('.tutoHole');const R=e=>e.getBoundingClientRect();
  const holeOn=!!hole&&getComputedStyle(hole).display!=='none';let tgt=null,q0=null,bad=null;
  if(sel)for(const q of sel.split(',')){let el=null;try{el=document.querySelector(q.trim());}catch(e){bad=q;continue;}if(!el)continue;const r=R(el);if(r.width<4||r.height<4)continue;const cs=getComputedStyle(el);if(cs.visibility==='hidden'||cs.display==='none')continue;
    if(r.bottom<0||r.top>innerHeight||r.right<0||r.left>innerWidth)continue;tgt=el;q0=q.trim();break;}
  const closedIn=el=>{const d=el.closest('details:not([open])');if(!d||el===d)return false;const s=d.querySelector(':scope > summary');return !(s&&(s===el||s.contains(el)));};
  let cover=null;if(tgt&&holeOn){const a=R(tgt),h=R(hole);const l=Math.max(0,a.left),t=Math.max(0,a.top),r=Math.min(innerWidth,a.right),b=Math.min(innerHeight,a.bottom);const cx=(l+r)/2,cy=(t+b)/2;cover=cx>=h.left-1&&cx<=h.right+1&&cy>=h.top-1&&cy<=h.bottom+1;}
  // vraiment à l'écran ? (pas caché sous le bandeau du chantier ni sous la barre d'onglets, ni coupé par la zone qui défile) : on « touche » la cible, calque du tutoriel transparent aux touchers
  let seen=null;if(tgt){const pe=root.style.pointerEvents;root.style.pointerEvents='none';const a=R(tgt);const l=Math.max(0,a.left),t=Math.max(0,a.top),r=Math.min(innerWidth,a.right),b=Math.min(innerHeight,a.bottom);
    const pts=[[(l+r)/2,(t+b)/2],[(l+r)/2,t+Math.min(6,(b-t)/2)],[l+Math.min(10,(r-l)/2),(t+b)/2]];seen=pts.some(([x,y])=>{const e=document.elementFromPoint(x,y);return !!e&&(e===tgt||tgt.contains(e)||e.contains(tgt));});root.style.pointerEvents=pe;}
  const c=R(card);const btns=[...card.querySelectorAll('button')].map(b=>Math.round(b.getBoundingClientRect().height));
  return {mod:card.querySelector('.tutoMod').textContent,t:card.querySelector('.tutoT').textContent,hole:holeOn,tgt:!!tgt,q:q0,badSel:bad,closed:tgt?closedIn(tgt):false,cover,seen,
    inScreen:c.left>=0&&c.right<=innerWidth+0.5&&c.top>=0&&c.bottom<=innerHeight+0.5,btnMin:Math.min(...btns),W:innerWidth};};
// étapes attendues pour la personne : le filtre « si » évalué avec les droits / options de la page (même api que tuto.js : can, feat)
const expected=async(p,key)=>{const st=DEF[key];const keep=await p.evaluate(list=>{const T=window.TRACE;const api=T?{can:k=>T.acces.can(k),feat:k=>T.paliers.feat(k)}:{};
    return list.map(s=>{if(!s)return true;try{return !!(0,eval)('('+s+')')(api);}catch(e){return true;}});},st.map(s=>s.si?s.si.toString():null));return st.filter((s,i)=>keep[i]);};
// déroule un tutoriel déjà ouvert : renvoie la liste des écarts (vide = tout bon)
async function walk(p,key,{shotAt,shotName,empty}={}){const st=await expected(p,key);const errs=[];const seen=[];const absent=(LEGIT_ABSENT[key]||[]).concat(empty?(EMPTY_ABSENT[key]||[]):[]);
  const head=key==='concepteur'?'Tracé Concepteur':'Tracé Chantier · '+NOMS[key];
  for(let i=0;i<st.length;i++){await p.waitForTimeout(i?260:420);const s=st[i];const I=await p.evaluate(STEP,s.sel||null);if(!I){errs.push(`#${i+1} pas de carte`);break;}seen.push({t:I.t,hole:I.hole,q:I.q});
    const w=`#${i+1} « ${s.titre} »`;if(I.t!==s.titre)errs.push(`${w} : titre affiché « ${I.t} »`);if(I.mod!==`${head} · ${i+1} / ${st.length}`)errs.push(`${w} : en-tête « ${I.mod} »`);
    if(I.badSel)errs.push(`${w} : sélecteur invalide ${I.badSel}`);if(!I.inScreen)errs.push(`${w} : carte hors écran`);if(I.btnMin<44)errs.push(`${w} : bouton < 44 px`);
    if(s.sel&&!absent.includes(s.titre)){if(!I.hole||!I.tgt)errs.push(`${w} : rien de surligné (${s.sel})`);else{if(I.closed)errs.push(`${w} : cible dans un pli fermé (${I.q})`);if(!I.cover)errs.push(`${w} : découpe à côté de la cible`);if(!I.seen)errs.push(`${w} : cible cachée (sous le bandeau / la barre d'onglets) (${I.q})`);}}
    else if(I.hole)errs.push(`${w} : découpe inattendue`);
    if(shotAt===i+1&&shotName)await shot(p,shotName);
    await p.click('#tuto .tutoGo');}
  await p.waitForTimeout(300);const left=await p.evaluate(()=>!!document.getElementById('tuto'));if(left)errs.push('pas fermé après « Terminé ✓ »');
  return {n:st.length,errs,seen};}
const where=()=>page.evaluate(()=>window.TRACE.tuto.where());
const viaHelp=async key=>{const vis=await page.evaluate(()=>{const b=document.getElementById('btnTuto');return !!b&&getComputedStyle(b).display!=='none';});if(!vis)return 'btnTuto caché';await page.click('#btnTuto');await wait(350);const op=await page.evaluate(()=>window.TRACE.tuto.open());return op&&op.k===key&&op.i===0?true:'ouvert : '+J(op);};
/* données fictives (créées par l'appli) */
async function seedStock(){await page.click('#stk-new');await wait(400);await page.click('#modal [data-iqm="cat"]');await wait(250);await page.selectOption('#stk-kind','sleeve');await page.fill('#stk-qty','4');await page.click('#stk-add');await wait(250);
  await page.click('#stk-ok');await wait(700);await page.mouse.click(195,520);await wait(500);await page.click('#stkDone');await wait(400);await goTab('stock');return page.evaluate(()=>document.querySelectorAll('#stock [data-stkunload]').length);}
const seedPhase=()=>page.evaluate(()=>{const T=window.TRACE;const n=T.phasage.importText('Phase fictive A;2026-11-02;2026-11-27');T.state.phLv='all';T.renderAll();return n;});
const seedModif=()=>page.evaluate(()=>{const M=window.TRACE.mod;M.decl({fresh:true});const d=M.draft();d.nom='Modif fictive';d.lignes.push({nature:'soud',dn:'100',dnA:'',dnB:'',k:'coudes',abs:'2',sg:1,unite:'',txt:'',line:'',from:''});const m=M.declSave();window.TRACE.renderAll();return m?m.n:0;});
/* ── t1 : 390 px, Ethan, chaque onglet ── */
await fresh();await as('ethan');await openSite();await toTech();
o={site:!!SITE,tabs:{}};const SHOT_AT={bouclage:4,hydro:6,stock:4,ts:3};
for(const t of TABS){const key='chantier:'+t;const r={};await goTab(t);r.tab=await page.evaluate(()=>window.TRACE.state.tab);r.where=await where();
  r.label=await page.evaluate(t=>{const b=document.querySelector(`#tabbar [data-tab="${t}"]`);return b?b.textContent.trim():null;},t);
  const seedable=['stock','phasage','ts'].includes(t);
  r.help=await viaHelp(key);if(r.help!==true)await page.evaluate(k=>window.TRACE.tuto.start(k),key); /* 1re passe : à vide (1er passage) */
  const W=await walk(page,key,{empty:true,shotAt:seedable?0:SHOT_AT[t],shotName:'te_'+t+'_390'});r.n=W.n;r.errs=W.errs;r.vu=await page.evaluate(k=>window.TRACE.tuto.seen(k),key);
  if(seedable){if(t==='stock')r.seed=await seedStock();if(t==='phasage')r.seed=await seedPhase();if(t==='ts')r.seed=await seedModif();await wait(400); /* 2e passe : rempli */
    await page.evaluate(()=>document.querySelectorAll('.view.active').forEach(e=>{e.scrollTop=0;}));await page.evaluate(k=>window.TRACE.tuto.start(k),key);
    const W2=await walk(page,key,{shotAt:SHOT_AT[t],shotName:'te_'+t+'_390'});r.errs=r.errs.concat(W2.errs.map(e=>'rempli '+e));r.n2=W2.n;
    r.lit=W2.seen.filter(x=>x.hole).length;}
  r.ok=r.tab===t&&r.where===key&&r.label===NOMS[key]&&r.help===true&&!r.errs.length&&r.vu&&(!seedable||(r.seed>=1&&r.n2===r.n));o.tabs[t]=r;
  console.log('   ',key,r.ok?'✓':'✗',J({where:r.where,label:r.label,help:r.help,n:r.n,seed:r.seed,surlignées_rempli:r.lit,errs:r.errs}));}
C.t1=o.site&&TABS.every(t=>o.tabs[t].ok);
console.log('t1) onglets techniques, 390 px :',C.t1?'OK':'ÉCHEC');
/* ── t2 : traceur ── */
function png(w,h){const raw=Buffer.alloc((w*3+1)*h);for(let y=0;y<h;y++){raw[y*(w*3+1)]=0;for(let x=0;x<w;x++){const q=y*(w*3+1)+1+x*3;raw[q]=226;raw[q+1]=232;raw[q+2]=240;}}
  const T=[];for(let n=0;n<256;n++){let c=n;for(let k=0;k<8;k++)c=c&1?0xedb88320^(c>>>1):c>>>1;T[n]=c>>>0;}const crc=b=>{let r=0xffffffff;for(const x of b)r=T[(r^x)&0xff]^(r>>>8);return (r^0xffffffff)>>>0;};
  const ch=(ty,d)=>{const l=Buffer.alloc(4);l.writeUInt32BE(d.length);const td=Buffer.concat([Buffer.from(ty),d]);const c=Buffer.alloc(4);c.writeUInt32BE(crc(td));return Buffer.concat([l,td,c]);};
  const ih=Buffer.alloc(13);ih.writeUInt32BE(w,0);ih.writeUInt32BE(h,4);ih[8]=8;ih[9]=2;return Buffer.concat([Buffer.from([137,80,78,71,13,10,26,10]),ch('IHDR',ih),ch('IDAT',zlib.deflateSync(raw)),ch('IEND',Buffer.alloc(0))]);}
async function traceur(W,{withPlan=true,shotName=null}={}){const p2=await ctx.newPage();watch(p2);await p2.setViewportSize({width:W,height:W===360?740:844});await p2.goto(BASE+'/traceur.html');await p2.waitForTimeout(1500);
  const r={};if(withPlan){await p2.setInputFiles('#bgAdd',{name:'fond-fictif.png',mimeType:'image/png',buffer:png(400,300)});await p2.waitForTimeout(1200);r.plan=await p2.evaluate(()=>getComputedStyle(document.getElementById('bgTools')).display);}
  await p2.evaluate(()=>{const t=document.getElementById('tuto');if(t)t.remove();});await p2.click('#bTuto');await p2.waitForTimeout(350);
  r.first=await p2.evaluate(()=>(document.querySelector('#tuto .tutoMod')||{}).textContent||null);
  const Wk=await walk(p2,'concepteur',{shotAt:shotName?2:0,shotName});r.n=Wk.n;r.errs=Wk.errs;r.cal=(Wk.seen.find(s=>s.t==='Caler un plan')||{}).q||null;await p2.close();return r;}
o=await traceur(390,{shotName:'te_concepteur_390'});
console.log('t2) traceur 390 :',J(o));
C.t2=o.plan==='flex'&&o.first===`Tracé Concepteur · 1 / ${DEF.concepteur.length}`&&o.n===DEF.concepteur.length&&!o.errs.length&&o.cal==='#bgTools #bgCal2';
/* ── t3 : Karim (soudeur) ── */
o={};await as('karim');await openSite();await toTech();
o.vis=await page.evaluate(T=>T.filter(t=>{const b=document.querySelector(`#tabbar [data-tab="${t}"]`);return b&&getComputedStyle(b).display!=='none';}),['bouclage','hydro','stock','fourniture','phasage','ts','points']);
for(const t of ['bouclage','points']){const key='chantier:'+t;const r={};await goTab(t);r.where=await where();r.help=await viaHelp(key);if(r.help!==true)await page.evaluate(k=>window.TRACE.tuto.start(k),key);
  const Wk=await walk(page,key);r.n=Wk.n;r.errs=Wk.errs;r.titles=Wk.seen.map(s=>s.t);o[t]=r;}
console.log('t3) Karim :',J(o));
C.t3=o.vis.join()==='bouclage,points'&&o.bouclage.where==='chantier:bouclage'&&o.bouclage.help===true&&o.bouclage.n===DEF['chantier:bouclage'].length&&!o.bouclage.errs.length
  &&o.points.where==='chantier:points'&&o.points.help===true&&o.points.n===DEF['chantier:points'].length-1&&!o.points.titles.includes('Suivre une autre pièce')&&!o.points.errs.length;
/* ── t4 : 360 px, 3 tutoriels ── */
o={};await page.setViewportSize({width:360,height:740});await as('ethan');await openSite();await toTech();
for(const t of ['bouclage','ts']){const key='chantier:'+t;await goTab(t);await page.evaluate(k=>window.TRACE.tuto.start(k),key);const Wk=await walk(page,key,{shotAt:t==='ts'?6:0,shotName:'te_ts_360'});o[t]={n:Wk.n,errs:Wk.errs,W:await page.evaluate(()=>innerWidth)};}
o.concepteur=await traceur(360,{withPlan:false});
o.over=await page.evaluate(()=>document.documentElement.scrollWidth>window.innerWidth+1);
console.log('t4) 360 px :',J(o));
C.t4=o.bouclage.W===360&&!o.bouclage.errs.length&&!o.ts.errs.length&&o.ts.n===DEF['chantier:ts'].length&&!o.concepteur.errs.length&&o.concepteur.n===DEF.concepteur.length&&!o.over;
await page.setViewportSize({width:390,height:844});
/* ── t5 : console ── */
C.t5=!logs.length;if(logs.length)console.log('console :',logs);
console.log('RÉSULTATS',J(C));console.log('RESULTAT:',Object.values(C).every(Boolean)?'TOUT VERT':'ÉCHEC '+Object.keys(C).filter(k=>!C[k]).join(' '));await browser.close();process.exit(Object.values(C).every(Boolean)?0:1);
