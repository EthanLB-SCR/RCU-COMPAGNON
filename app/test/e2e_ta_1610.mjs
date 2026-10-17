// e2e_ta_1610.mjs — 16/10 (lot TA) : TRACEUR — annuler / rétablir PARTOUT (contrat K1), notes de dilatation, zones du traceur ↔ zones du chiffrage (K4), une ligne sur plusieurs
// planches et groupes de planches (K2), regroupement visuel lignes ↔ planches. Données 100 % FICTIVES : planches = images générées, tableau des longueurs maximales FICTIF
// (fabriqué ici, sans rapport avec le vrai), affaire et adresse fictives, base de prix fictive (fixture_prix.xlsx). Aucun réseau extérieur (tuiles, géocodage interceptés).
// c1  K1 : les opérations du traceur une à une — chacune = UNE étape nommée ; ↶ la défait (état d'avant identique), ↷ la refait (état d'après identique) — liste dans OPS ;
//     un import de 2 fichiers = une étape ; rechargement : aucune étape fantôme
// c2  dilatation : tableau FICTIF importé par SCR → Pack SCR ; traceur ouvert depuis une affaire (étude) : ligne droite longue entre deux coudes 90° + antenne de plus de teMax
//     sans coude → alertes (Notes, pied de page, fiche de la ligne), ✓ sur la ligne conforme, profondeur manquante dite ; même chose depuis un CHANTIER ;
//     tableau absent → « règles de dilatation : non chargées — ouvre SCR → Pack SCR » partout ; copie de localStorage perdue mais registre de l'appareil là → relu (IndexedDB)
// c3  K4 : 2 zones créées à la main dans le chiffrage ; traceur de l'affaire : « ▦ Zones » les montre ; « mettre ces lignes dans une zone déjà créée : Zone 1 » (zone.ch) ;
//     nouvelle zone = nom libre (Zone 3) ; ↶ / ↷ ; enregistré → site.traceur.zones[].ch ; appli : « Mettre à jour les zones du chiffrage depuis le tracé » → Zone 1 mise à jour
//     (même id), Zone 3 créée, Zone 2 intacte ; 2e fois : rien de doublé ; traceur rouvert : les deux zones tracées reliées (↔)
// c4  K2 : ligne tracée à cheval sur 2 planches → l.plans = [P1, P2] (l.plan = P1) ; groupe de 4 planches ; ⌖ « un plan et toutes ses lignes » = le GROUPE (option ▦, vignettes,
//     aperçu en couleur sur le dessin) → les 4 planches et leurs lignes bougent du même vecteur, la 5e planche et sa ligne non ; ↶ remet tout ; groupe enregistré (p.grp)
// c5  regroupement visuel : planche touchée → ses lignes à sa couleur, le reste estompé ; groupe → 4 contours ; ligne sélectionnée → ses planches entourées ; « ✎ Lignes au clic »
//     sur le dessin ; noms modifiables (planche, groupe) ; fiche de la ligne : ses planches
// c6  téléphone 390 px : panneau des planches, zones du chiffrage, fiche de dilatation (pied de page touché) — rien ne déborde, boutons ≥ 34 px ; c7 console vide
import { chromium } from 'playwright';
import fs from 'fs';import path from 'path';import zlib from 'zlib';import {fileURLToPath} from 'url';
const HERE=path.dirname(fileURLToPath(import.meta.url));
const BASE=process.env.BASE||'http://localhost:8765';const SHOTS=process.env.SHOTS||'';
const C={};const OPS=[];const J=x=>JSON.stringify(x);const near=(a,b,t=1e-6)=>Math.abs(a-b)<=t;
// ── fixtures fictives
function crc32(buf){let crc=0xFFFFFFFF;for(let n=0;n<buf.length;n++){let c=(crc^buf[n])&0xFF;for(let k=0;k<8;k++)c=c&1?0xEDB88320^(c>>>1):c>>>1;crc=(crc>>>8)^c;}return (crc^0xFFFFFFFF)>>>0;}
function chunk(type,data){const len=Buffer.alloc(4);len.writeUInt32BE(data.length);const td=Buffer.concat([Buffer.from(type,'latin1'),data]);const crc=Buffer.alloc(4);crc.writeUInt32BE(crc32(td));return Buffer.concat([len,td,crc]);}
function makePng(w,h,pix){const raw=Buffer.alloc((w*3+1)*h);for(let y=0;y<h;y++){raw[y*(w*3+1)]=0;for(let x=0;x<w;x++){const [r,g,b]=pix(x,y);const o=y*(w*3+1)+1+x*3;raw[o]=r;raw[o+1]=g;raw[o+2]=b;}}
  const ihdr=Buffer.alloc(13);ihdr.writeUInt32BE(w,0);ihdr.writeUInt32BE(h,4);ihdr[8]=8;ihdr[9]=2;return Buffer.concat([Buffer.from([0x89,0x50,0x4E,0x47,0x0D,0x0A,0x1A,0x0A]),chunk('IHDR',ihdr),chunk('IDAT',zlib.deflateSync(raw)),chunk('IEND',Buffer.alloc(0))]);}
const PL=(rgb)=>makePng(200,100,(x,y)=>(x<4||y<4||x>195||y>95||y===50)?[60,60,60]:rgb); // planche fictive : un cadre et un trait
const TILE=makePng(256,256,(x,y)=>((x>>5)+(y>>5))%2?[96,140,80]:[120,170,100]);
const ADDR={lon:-0.55,lat:47.47,label:'1 rue Fictive, 49000 Ville-Essai'};
const dxfText=(X,Y)=>{const L=(x1,y1,x2,y2)=>['0','LINE','8','ESSAI','10',x1,'20',y1,'11',x2,'21',y2].join('\n');return ['0','SECTION','2','ENTITIES',L(X,Y,X+30,Y),L(X+30,Y,X+30,Y+20),'0','ENDSEC','0','EOF'].join('\n');};
// tableau des longueurs maximales FICTIF (2 profondeurs, 1 contrainte, 1 température — rien à voir avec le vrai)
const FAKE={lmax:{titre:'Tableau FICTIF TA',serie:'1',unite:'m',source:'essai',profondeurs:[0.8,1.2],contraintes:[150],temperatures:[120],tables:{'120':[{dn:50,gaine:125,v:[[40],[30]]},{dn:100,gaine:200,v:[[60],[45]]}]}},teMaxDroit:8};
// ── navigateur
const browser=await chromium.launch({headless:true,executablePath:process.env.CHROMIUM_PATH||undefined});
const net={geocode:0};
const route=async ctx=>ctx.route(/^https?:\/\//,r=>{const u=r.request().url();if(u.startsWith(BASE))return r.fallback();if(/data\.geopf\.fr\/wmts/.test(u))return r.fulfill({status:200,contentType:'image/png',body:TILE});
  if(/geocodage|api-adresse/.test(u)){net.geocode++;return r.fulfill({status:200,contentType:'application/json',body:J({features:[{geometry:{coordinates:[ADDR.lon,ADDR.lat]},properties:{label:ADDR.label}}]})});}return r.fulfill({status:204,body:''});});
const ctx=await browser.newContext({viewport:{width:1366,height:860}});await route(ctx);
const page=await ctx.newPage();const logs=[];const watch=(p,t)=>{p.on('pageerror',e=>logs.push((t||'')+'PAGEERROR: '+e.message.slice(0,300)));p.on('console',m=>{if(m.type()==='error'&&!/supabase|Failed to fetch|net::ERR|404|WebSocket|pdf\.worker|cdnjs/i.test(m.text()))logs.push((t||'')+m.text().slice(0,200));});};watch(page);
let dialogs=[];page.on('dialog',d=>{dialogs.push(d.type()+':'+d.message().slice(0,90));d.accept(d.type()==='prompt'?'50':undefined).catch(()=>{});});
const wait=ms=>page.waitForTimeout(ms);
const shot=async n=>{if(!SHOTS)return;try{await page.screenshot({path:path.join(SHOTS,'ta_'+n+'.png')});}catch(e){}};
// capture d'une fiche de ligne : ligne sélectionnée, dessin cadré, panneau défilé jusqu'à la section h (sans effet hors capture)
const ficheShot=async(id,h,n)=>{if(!SHOTS)return;await page.evaluate(([id,h])=>{const M=window.MAQ;M.state.sel={kind:'line',id};M.state.tab='sel';M.rebuild();M.bg.fitAll();const t=[...document.querySelectorAll('#panel h3')].find(x=>x.textContent.includes(h));if(t)t.scrollIntoView({block:'start'});},[id,h]);await wait(250);await shot(n);};
const toScreen=(wx,wy)=>page.evaluate(([x,y])=>{const v=window.MAQ.state.view;const r=document.getElementById('svg').getBoundingClientRect();return [r.left+x*v.k+v.tx,r.top+y*v.k+v.ty];},[wx,wy]);
const clickW=async(x,y)=>{const s=await toScreen(x,y);await page.mouse.click(s[0],s[1]);await wait(140);};
const hint=()=>page.evaluate(()=>document.getElementById('hint').textContent);
const H=()=>page.evaluate(()=>({n:window.MAQ.t1.hist.undoCount,lab:window.MAQ.t1.hist.labels().undo.slice(-1)[0]||''}));
const SNAP=()=>page.evaluate(()=>{const M=window.MAQ;return JSON.stringify({P:M.bg.plans().map(p=>[p.id,p.name,p.show,p.opacity,p.transform,p.geo||null,p.grp||null,p.coul||null,p.ech||null,p.image?p.image.src.length:(p.drawing?p.drawing.length:0)]),
  L:M.state.lines.map(l=>[l.id,l.name,l.dn,l.pts,l.plans||null]),Z:M.state.zones,G:M.fond.geo(),R:[M.state.supplier,M.state.serie,M.state.prof,M.rules.dilatTemp]});});
const idb=(k,v,del)=>page.evaluate(([k,v,del])=>new Promise(res=>{const q=indexedDB.open('trace-kv',1);q.onupgradeneeded=()=>q.result.createObjectStore('kv');q.onsuccess=()=>{const st=q.result.transaction('kv',v===undefined&&!del?'readonly':'readwrite').objectStore('kv');const rq=del?st.delete(k):v===undefined?st.get(k):st.put(v,k);rq.onsuccess=()=>res(v===undefined&&!del?(rq.result||null):true);rq.onerror=()=>res(null);};q.onerror=()=>res(null);}),[k,v===undefined?undefined:v,!!del]);
/* une opération du traceur : UNE étape, nommée ; ↶ (bouton) → état d'avant identique, « Annulé : … » ; ↷ → état d'après identique, « Rétabli : … » */
async function op(name,fn,re,o={}){const s0=o.snap?await o.snap():await SNAP();const h0=await H();await fn();await wait(o.wait||320);const s1=o.snap?await o.snap():await SNAP();const h1=await H();
  await page.click('#bUndo');await wait(260);const s2=o.snap?await o.snap():await SNAP();const u=await hint();await page.click('#bRedo');await wait(260);const s3=o.snap?await o.snap():await SNAP();const r=await hint();
  const ok=s1!==s0&&h1.n===h0.n+1&&re.test(h1.lab)&&s2===s0&&s3===s1&&u==='Annulé : '+h1.lab&&r==='Rétabli : '+h1.lab;
  OPS.push(ok?{op:name,ok,lab:h1.lab}:{op:name,ok,lab:h1.lab,chg:s1!==s0,n:[h0.n,h1.n],undo:s2===s0,redo:s3===s1,u,r});if(o.after)await o.after();return ok;}
const fondTab=async()=>{await page.click('.tabs button[data-tab="fond"]');await wait(150);};
const plId=n=>page.evaluate(n=>{const p=window.MAQ.bg.plans().find(x=>x.name===n);return p&&p.id;},n);
await page.goto(BASE+'/traceur.html');await wait(400);await page.evaluate(()=>{localStorage.clear();localStorage.setItem('trace:wide','1');});await page.evaluate(()=>new Promise(r=>{const q=indexedDB.deleteDatabase('trace-kv');q.onsuccess=q.onerror=q.onblocked=()=>r();}));
await page.goto(BASE+'/traceur.html?site=new');await wait(900);
// ════ c1 · K1 — les opérations du traceur une à une
await page.evaluate(()=>{const M=window.MAQ;M.state.view={k:4,tx:120,ty:320};M.setMode('trace');M.rebuild();});await wait(150);
await op('tracer une ligne',async()=>{await clickW(0,0);await clickW(60,0);await clickW(60,30);await page.keyboard.press('Enter');},/^création de « Ligne L1 »$/);
await page.evaluate(()=>window.MAQ.setMode('select'));
await op('ajouter un plan (fichier image)',async()=>{await page.setInputFiles('#bgAdd',{name:'planche_1.png',mimeType:'image/png',buffer:PL([255,232,176])});await wait(700);},/^ajout du plan « planche_1\.png »$/,{wait:600});
await op('importer 2 fichiers d\'un coup (une étape)',async()=>{await page.setInputFiles('#bgAdd',[{name:'planche_2.png',mimeType:'image/png',buffer:PL([216,240,200])},{name:'planche_3.png',mimeType:'image/png',buffer:PL([207,227,255])}]);await wait(900);},/^ajout de 2 plans$/,{wait:600});
const P1=await plId('planche_1.png'),P2=await plId('planche_2.png'),P3=await plId('planche_3.png');
await page.evaluate(([a,b,c])=>{const M=window.MAQ;M.bg.setTransform(a,{tx:-10,ty:-20,rot:0,k:0.5});M.bg.setTransform(b,{tx:95,ty:-20,rot:0,k:0.5});M.bg.setTransform(c,{tx:210,ty:-20,rot:0,k:0.5});M.state.view={k:3,tx:80,ty:360};M.rebuild();},[P1,P2,P3]);await wait(300);
await page.evaluate(()=>window.MAQ.t1.hist.flush());
await op('✥ déplacer un plan (glisser)',async()=>{await page.evaluate(id=>window.MAQ.bg.setActive(id),P1);await page.click('#bgMove');const a=await toScreen(20,20),b=await toScreen(32,26);await page.mouse.move(a[0],a[1]);await page.mouse.down();for(let i=1;i<=6;i++){await page.mouse.move(a[0]+(b[0]-a[0])*i/6,a[1]+(b[1]-a[1])*i/6);await wait(30);}await page.mouse.up();await wait(150);await page.keyboard.press('Escape');},/^déplacement du plan « planche_1\.png »$/);
await op('📏 échelle d\'un plan (2 points + distance)',async()=>{await page.evaluate(id=>window.MAQ.bg.setActive(id),P2);await page.click('#bgScale');await clickW(100,0);await clickW(140,0);await wait(200);},/^échelle du plan « planche_2\.png » \(×1,25\)$/);
await fondTab();
await op('échelle 1/N (onglet Fond)',async()=>{await page.fill(`#panel .t2ech[data-plan="${P3}"] [data-t2="echN"]`,'500');await page.click(`#panel [data-t2="echGo"][data-plan="${P3}"]`);},/^échelle 1\/500 du plan « planche_3\.png »$/);
await fondTab();
await op('rotation d\'un plan',async()=>{await page.fill(`#panel .plRot[data-plan="${P1}"]`,'30');await page.dispatchEvent(`#panel .plRot[data-plan="${P1}"]`,'change');},/^rotation du plan « planche_1\.png » \(0° → 30°\)$/);
await fondTab();
await op('opacité d\'un plan (curseur : un glisser = une étape)',async()=>{await page.evaluate(id=>{const r=document.querySelector(`#panel .plOp[data-plan="${id}"]`);[60,70,80].forEach(v=>{r.value=v;r.dispatchEvent(new Event('input',{bubbles:true}));});r.dispatchEvent(new Event('change',{bubbles:true}));},P1);},/^opacité du plan « planche_1\.png » \(50 % → 80 %\)$/);
await fondTab();
await op('masquer un plan (œil)',async()=>{await page.click(`#panel .plEye[data-plan="${P3}"]`);},/^plan « planche_3\.png » masqué$/,{after:async()=>{await fondTab();await page.click(`#panel .plEye[data-plan="${P3}"]`);await wait(300);}});
await fondTab();
await op('ordre des plans (▲)',async()=>{await page.click(`#panel [data-t2="plUp"][data-plan="${P1}"]`);},/^ordre des plans \(« planche_1\.png » au-dessus\)$/);
await op('⟲ caler un plan par 2 points',async()=>{await page.evaluate(id=>window.MAQ.bg.setActive(id),P3);await page.click('#bgCal2');await clickW(215,-15);await clickW(240,-15);await clickW(60,0);await clickW(60,30);await wait(150);},/^calage du plan « planche_3\.png » \(échelle, rotation, position\)$/);
await fondTab();
await op('retirer un plan (✕) — ↶ le remet avec son image',async()=>{await page.click(`#panel [data-act="delPlan"][data-plan="${P3}"]`);await wait(200);},/^retrait du plan « planche_3\.png »$/,{after:async()=>{await page.click('#bUndo');await wait(250);}});
// panneau « 🔗 Planches et lignes »
await page.click('#plBtn');await wait(200);
await op('renommer une planche',async()=>{await page.fill(`#plPanel input[data-pl="pname"][data-id="${P1}"]`,'Planche Nord');await page.press(`#plPanel input[data-pl="pname"][data-id="${P1}"]`,'Enter');},/^plan « planche_1\.png » renommé « Planche Nord »$/);
await op('couleur d\'une planche',async()=>{await page.evaluate(id=>{const i=document.querySelector(`#plPanel input[data-pl="pcol"][data-id="${id}"]`);i.value='#a21caf';i.dispatchEvent(new Event('change',{bubbles:true}));},P2);},/^couleur du plan « planche_2\.png »$/);
await op('créer un groupe de planches',async()=>{await page.selectOption(`#plPanel select[data-pl="pgrp"][data-id="${P1}"]`,'+');},/^groupe « Groupe 1 » créé \(1 planche\)$/);
const G1=await page.evaluate(()=>window.MAQ.planches.groupes()[0].id);
await op('ajouter une planche au groupe',async()=>{await page.selectOption(`#plPanel select[data-pl="pgrp"][data-id="${P2}"]`,G1);},/^plan « planche_2\.png » dans le groupe « Groupe 1 »$/);
await op('renommer le groupe',async()=>{await page.fill(`#plPanel input[data-pl="gname"][data-id="${G1}"]`,'Plan assemblé');await page.press(`#plPanel input[data-pl="gname"][data-id="${G1}"]`,'Enter');},/^groupe « Groupe 1 » renommé « Plan assemblé »$/);
await page.evaluate(()=>window.MAQ.planches.focus('p',null));await wait(100);
await page.evaluate(id=>window.MAQ.planches.focus('p',id),P3);await wait(150);await page.click('#plPanel [data-pl="pick"][data-v="lines"]');await wait(120);
const L1mid=await page.evaluate(()=>{const p=window.MAQ.state.lines[0].pts;return [(p[1][0]+p[2][0])/2,(p[1][1]+p[2][1])/2];});
await op('lier une ligne à une planche (au clic sur le dessin)',async()=>{await clickW(L1mid[0],L1mid[1]);},/^« Ligne L1 » ajoutée à planche « planche_3\.png »$/);
await page.keyboard.press('Escape');await wait(100);await page.evaluate(id=>window.MAQ.planches.toggleLine('L1',[id]),P2);await wait(150);
await op('↺ chaque ligne → les planches sous elle',async()=>{await page.click('#plPanel [data-pl="auto"]');},/^rattachement de chaque ligne aux planches sous elle$/);
await page.click('#plPanel [data-pl="close"]');await wait(100);
// DXF : calques refaits (⚙) = une étape ; la planche retrouve ses traits d'avant à ↶
await op('ajouter un plan DXF',async()=>{await page.evaluate(t=>window.MAQ.bg.addDxfText(t,'reseau_essai.dxf'),dxfText(1000,1000));await wait(900);},/^ajout du plan « reseau_essai\.dxf »$/,{wait:500});
const PD=await plId('reseau_essai.dxf');await page.evaluate(id=>{window.__dx=window.MAQ.bg.get(id).drawing;},PD);await fondTab();
await op('⚙ calques d\'un DXF refaits',async()=>{await page.click(`#panel [data-act="plLayers"][data-plan="${PD}"]`);await wait(200);await page.selectOption('#dxfCtx','all');await page.click('#dxfOk');await wait(900);},/^calques du DXF « reseau_essai\.dxf »$/,{wait:400,snap:()=>page.evaluate(id=>String(window.MAQ.bg.get(id).drawing===window.__dx),PD)});
// vue aérienne, calages
await op('📍 vue aérienne par adresse',async()=>{await page.click('#bAer');await wait(150);await page.fill('#modalBody [data-t2="aerAddr"]','rue Fictive Ville-Essai');await page.click('#modalBody [data-t2="aerGo"]');await wait(500);},/^vue aérienne « 1 rue Fictive, 49000 Ville-Essai »$/);
await page.evaluate(()=>{const M=window.MAQ;M.state.view={k:3,tx:80,ty:360};M.state.sel={kind:'line',id:'L1'};M.state.tab='sel';M.rebuild();});await wait(150);
await op('⌖ caler une ligne sur la vue aérienne',async()=>{await page.evaluate(()=>window.MAQ.fond.openCal());await wait(150);await page.check('#modalBody input[name="t2w"][value="line"]');await page.check('#modalBody input[name="t2n"][value="1"]');await page.click('#modalBody [data-t2="calGo"]');await wait(120);await clickW(0,0);await clickW(5,5);await wait(200);},/^calage de « Ligne L1 »( et de son plan)? sur la vue aérienne$/);
const bbD=await page.evaluate(id=>window.MAQ.bg.tight(id),PD);
await op('⌖ caler un plan et toutes ses lignes',async()=>{await page.evaluate(()=>window.MAQ.fond.openCal());await wait(150);await page.check('#modalBody input[name="t2w"][value="plan"]');await page.selectOption('#modalBody [data-t2="calPlan"]',PD);await page.check('#modalBody input[name="t2n"][value="1"]');await page.click('#modalBody [data-t2="calGo"]');await wait(120);
  await page.evaluate(b=>{const M=window.MAQ;M.state.view={k:3,tx:300-b[0]*3,ty:400-b[1]*3};M.rebuild();},bbD);await clickW(bbD[0]+2,bbD[1]+2);await clickW(bbD[0]+5,bbD[1]+6);await wait(200);},/^calage du plan « reseau_essai\.dxf » sur la vue aérienne$/);
await page.evaluate(()=>{const M=window.MAQ;M.state.view={k:3,tx:80,ty:360};M.rebuild();});
await op('⌖ caler tout le tracé (vue aérienne recalée)',async()=>{await page.evaluate(()=>window.MAQ.fond.openCal());await wait(150);await page.check('#modalBody input[name="t2w"][value="all"]');await page.check('#modalBody input[name="t2n"][value="1"]');await page.click('#modalBody [data-t2="calGo"]');await wait(120);await clickW(5,5);await clickW(9,7);await wait(200);},/^calage du tracé entier sur la vue aérienne$/);
await fondTab();
await op('oublier la vue aérienne',async()=>{await page.click('#panel [data-t2="aerForget"]');await wait(200);},/^vue aérienne oubliée$/);
// zones, paramètres, lignes
await op('zone de chiffrage (sélection → ＋ Créer)',async()=>{await page.evaluate(()=>window.MAQ.t1.select(['L1']));await wait(120);await page.click('#panel [data-act="t1-zoneNew"]');},/^création de la zone « Zone 1 » \(« Ligne L1 »\)$/);
await op('profondeur de pose par défaut (bandeau)',async()=>{await page.fill('#prof','1.2');await page.dispatchEvent('#prof','change');},/^profondeur de pose par défaut \(0,8 → 1,2 m\)$/);
await op('fournisseur du catalogue',async()=>{await page.selectOption('#supplier','LOGSTOR');},/^fournisseur AXIOM série 1 → LOGSTOR série 1$/);
await page.click('.tabs button[data-tab="regles"]');await wait(150);
await op('règles : température de calcul de la dilatation',async()=>{await page.selectOption('#panel [data-t1="dT"]','110');},/^dilatation : 110 °C$/);
await page.evaluate(()=>{const M=window.MAQ;M.state.sel={kind:'line',id:'L1'};M.state.selV=[];M.state.tab='sel';M.rebuild();});await wait(150);
await op('glisser un sommet (un glisser = une étape)',async()=>{const v=await page.evaluate(()=>{const p=window.MAQ.state.lines[0].pts[1];return p;});const a=await toScreen(v[0],v[1]);await page.mouse.move(a[0],a[1]);await page.mouse.down();for(let i=1;i<=5;i++){await page.mouse.move(a[0]+i*6,a[1]+i*3);await wait(30);}await page.mouse.up();},/^sommet déplacé sur « Ligne L1 »$/);
await op('supprimer une ligne',async()=>{await page.evaluate(()=>{const M=window.MAQ;M.state.sel={kind:'line',id:'L1'};M.state.selV=[];M.rebuild();if(document.activeElement)document.activeElement.blur();});await page.keyboard.press('Delete');await wait(200);},/^suppression de « Ligne L1 »$/);
// rechargement : plans relus de la mémoire (asynchrone) → aucune étape fantôme
await page.reload();await wait(1500);await page.mouse.click(30,840);await wait(300);const ghost=await H();
console.log('1) annuler / rétablir, opération par opération :');OPS.forEach(o=>console.log('   '+(o.ok?'✓':'✗')+' '+o.op+' — « '+o.lab+' »'+(o.ok?'':' '+J(o))));console.log('   rechargement :',J(ghost));
C.c1=OPS.length>=30&&OPS.every(o=>o.ok)&&ghost.n===0;
// ════ c4 / c5 · K2 et regroupement visuel — 5 planches (4 assemblées en 2 × 2, 1 isolée), lignes, vue aérienne
await page.goto(BASE+'/traceur.html?site=new');await wait(900);
await page.evaluate(()=>{const M=window.MAQ;M.bg.plans().slice().forEach(p=>M.bg.remove(p.id));if(M.fond.geo())M.fond.forget();M.state.lines=[];M.state.seq=1;M.rebuild();});await wait(200);
await page.setInputFiles('#bgAdd',[['P_NO',[255,232,176]],['P_NE',[216,240,200]],['P_SO',[207,227,255]],['P_SE',[246,208,230]],['P_ISO',[235,235,235]]].map(([n,c])=>({name:n+'.png',mimeType:'image/png',buffer:PL(c)})));await wait(1500);
const IDS=await page.evaluate(()=>{const M=window.MAQ;const f=n=>M.bg.plans().find(p=>p.name===n+'.png').id;const o={NO:f('P_NO'),NE:f('P_NE'),SO:f('P_SO'),SE:f('P_SE'),ISO:f('P_ISO')};
  M.bg.setTransform(o.NO,{tx:0,ty:0,rot:0,k:0.3});M.bg.setTransform(o.NE,{tx:59,ty:0,rot:0,k:0.3});M.bg.setTransform(o.SO,{tx:0,ty:29,rot:0,k:0.3});M.bg.setTransform(o.SE,{tx:59,ty:29,rot:0,k:0.3});M.bg.setTransform(o.ISO,{tx:130,ty:0,rot:0,k:0.3});
  M.state.view={k:5,tx:40,ty:200};M.setMode('select');M.rebuild();return o;});await wait(200);
// tracée au clic : une ligne à cheval sur NO et NE, une antenne sur SO, une ligne sur la planche isolée
await page.evaluate(()=>window.MAQ.setMode('trace'));await clickW(10,12);await clickW(100,12);await page.keyboard.press('Enter');await wait(250);
await page.evaluate(()=>window.MAQ.setMode('trace'));await clickW(10,40);await clickW(40,40);await page.keyboard.press('Enter');await wait(250);
await page.evaluate(()=>window.MAQ.setMode('trace'));await clickW(135,12);await clickW(175,12);await page.keyboard.press('Enter');await wait(250);await page.evaluate(()=>window.MAQ.setMode('select'));
let out={links:await page.evaluate(()=>window.MAQ.state.lines.map(l=>({id:l.id,plans:l.plans,plan:l.plan})))};
// groupe des 4 planches par le panneau (liste + ▣ au clic sur le dessin)
await page.click('#plBtn');await wait(150);await page.selectOption(`#plPanel select[data-pl="pgrp"][data-id="${IDS.NO}"]`,'+');await wait(150);const GG=await page.evaluate(()=>window.MAQ.planches.groupes()[0].id);
await page.selectOption(`#plPanel select[data-pl="pgrp"][data-id="${IDS.NE}"]`,GG);await wait(150);await page.selectOption(`#plPanel select[data-pl="pgrp"][data-id="${IDS.SO}"]`,GG);await wait(150);
await page.evaluate(g=>window.MAQ.planches.focus('g',g),GG);await wait(100);await page.click('#plPanel [data-pl="pick"][data-v="plans"]');await wait(100);
await page.evaluate(()=>{const M=window.MAQ;M.state.view={k:5,tx:40,ty:200};M.rebuild();});await clickW(80,40);await wait(150);await page.keyboard.press('Escape');
await page.fill(`#plPanel input[data-pl="gname"][data-id="${GG}"]`,'Plan assemblé Nord');await page.press(`#plPanel input[data-pl="gname"][data-id="${GG}"]`,'Enter');await wait(200);
out.groupes=await page.evaluate(()=>window.MAQ.planches.groupes().map(g=>({nom:g.nom,n:g.plans.length})));
// c5 : groupe touché → 4 contours à sa couleur, ses lignes allumées, le reste estompé
await page.evaluate(g=>window.MAQ.planches.focus('g',g),GG);await wait(250);await page.click('#plPanel [data-pl="frame"]');await wait(250);await shot('pc_planches_groupe');
out.hlG=await page.evaluate(()=>{const g=document.getElementById('plHL');const col=window.MAQ.planches.groupes()[0].couleur;return {out:g.querySelectorAll('path.pl-out').length,lines:[...g.querySelectorAll('path.pl-hl')].map(p=>p.dataset.line),col:[...g.querySelectorAll('path.pl-hl,path.pl-out')].every(p=>p.getAttribute('stroke')===col),veil:!!g.querySelector('path[fill-opacity=".62"]'),labels:[...g.querySelectorAll('text')].map(t=>t.textContent)};});
// planche touchée → ses lignes seulement
await page.click(`#plPanel .pl-it[data-k="p"][data-id="${IDS.ISO}"] .pl-th`);await wait(200);
out.hlP=await page.evaluate(id=>{const g=document.getElementById('plHL');const col=window.MAQ.planches.colorOf(id);return {out:g.querySelectorAll('path.pl-out').length,lines:[...g.querySelectorAll('path.pl-hl')].map(p=>p.dataset.line),col:[...g.querySelectorAll('path.pl-hl')].every(p=>p.getAttribute('stroke')===col),chips:[...document.querySelectorAll('#plPanel .pl-foc .pl-chip')].map(c=>c.textContent.replace('✕','').trim())};},IDS.ISO);
// « ✎ Lignes au clic » : l'antenne (sur SO) ajoutée à la planche isolée puis retirée
await page.click('#plPanel [data-pl="pick"][data-v="lines"]');await wait(100);await clickW(25,40);await wait(150);out.pickAdd=await page.evaluate(()=>window.MAQ.planches.plansOf('L2'));
await clickW(25,40);await wait(150);out.pickDel=await page.evaluate(()=>window.MAQ.planches.plansOf('L2'));await page.keyboard.press('Escape');await wait(100);
// noms modifiables : la planche renommée → son étiquette sur le dessin suit
await page.fill(`#plPanel input[data-pl="pname"][data-id="${IDS.ISO}"]`,'Antenne gare');await page.press(`#plPanel input[data-pl="pname"][data-id="${IDS.ISO}"]`,'Enter');await wait(200);
out.label=await page.evaluate(()=>[...document.querySelectorAll('#plHL text')].map(t=>t.textContent));
await page.click('#plPanel [data-pl="close"]');await wait(100);
// ligne sélectionnée → ses planches entourées (inversement) ; fiche de la ligne : ses planches
await page.evaluate(()=>{const M=window.MAQ;M.state.sel={kind:'line',id:'L1'};M.state.tab='sel';M.rebuild();});await wait(200);
out.selOut=await page.evaluate(()=>[...document.querySelectorAll('#plHL path.pl-sel')].map(p=>p.dataset.plan));out.fiche=await page.evaluate(()=>{const h=[...document.querySelectorAll('#panel h3')].find(x=>x.textContent==='Planches');return h?h.nextElementSibling.textContent.replace(/\s+/g,' ').trim():'';});
await ficheShot('L1','Planches','pc_ligne_planches');
console.log('5) visuel :',J(out));
C.c5=J(out.hlG.lines.sort())===J(['L1','L2'])&&out.hlG.out===4&&out.hlG.col&&out.hlG.veil&&out.hlG.labels.includes('P_NO.png')&&out.hlP.out===1&&J(out.hlP.lines)===J(['L3'])&&out.hlP.col&&J(out.hlP.chips)===J(['Ligne L3'])
  &&out.pickAdd.includes(IDS.ISO)&&!out.pickDel.includes(IDS.ISO)&&out.label.includes('Antenne gare')&&J(out.selOut)===J([IDS.NO,IDS.NE])&&/P_NO\.png \(▦ Plan assemblé Nord\)/.test(out.fiche)&&/P_NE\.png/.test(out.fiche);
// c4 : ⌖ « un plan et toutes ses lignes » = le groupe entier
const c4a=J(out.links.map(l=>[l.id,l.plans,l.plan]))===J([['L1',[IDS.NO,IDS.NE],IDS.NO],['L2',[IDS.SO],IDS.SO],['L3',[IDS.ISO],IDS.ISO]])&&J(out.groupes)===J([{nom:'Plan assemblé Nord',n:4}]);
await page.click('#bAer');await wait(150);await page.fill('#modalBody [data-t2="aerAddr"]','rue Fictive');await page.click('#modalBody [data-t2="aerGo"]');await wait(500);
await page.evaluate(()=>{const M=window.MAQ;M.state.sel=null;M.state.view={k:5,tx:40,ty:200};M.rebuild();});await wait(100);
const B0=await page.evaluate(()=>({P:window.MAQ.bg.plans().map(p=>[p.id,{...p.transform}]),L:window.MAQ.state.lines.map(l=>[l.id,l.pts.map(q=>q.slice())])}));
await page.evaluate(()=>window.MAQ.fond.openCal());await wait(200);await page.check('#modalBody input[name="t2w"][value="plan"]');await page.selectOption('#modalBody [data-t2="calPlan"]',{index:0});await wait(250);
out={opts:await page.evaluate(()=>[...document.querySelectorAll('#modalBody [data-t2="calPlan"] option')].map(o=>[o.value.slice(0,2),o.textContent])),prev:await page.evaluate(()=>({th:document.querySelectorAll('#modalBody .pl-calprev .pl-th').length,txt:(document.querySelector('#modalBody .pl-calprev')||{}).textContent||''})),
  hl:await page.evaluate(()=>({out:document.querySelectorAll('#plHL path.pl-out').length,lines:[...document.querySelectorAll('#plHL path.pl-hl')].map(p=>p.dataset.line).sort()}))};
await shot('pc_calage_groupe');
await page.check('#modalBody input[name="t2n"][value="1"]');await page.click('#modalBody [data-t2="calGo"]');await wait(150);out.bar=await page.evaluate(()=>document.querySelector('.t2calbar').textContent);
await clickW(10,12);await clickW(16,20);await wait(400);
const B1=await page.evaluate(()=>({P:window.MAQ.bg.plans().map(p=>[p.id,{...p.transform}]),L:window.MAQ.state.lines.map(l=>[l.id,l.pts.map(q=>q.slice())]),lab:window.MAQ.t1.hist.labels().undo.slice(-1)[0]}));
const dP=B1.P.map(([id,t],i)=>[id,+(t.tx-B0.P[i][1].tx).toFixed(6),+(t.ty-B0.P[i][1].ty).toFixed(6)]),dL=B1.L.map(([id,p],i)=>[id,+(p[0][0]-B0.L[i][1][0][0]).toFixed(6),+(p[0][1]-B0.L[i][1][0][1]).toFixed(6)]);
await page.click('#bUndo');await wait(300);const B2=await page.evaluate(()=>({P:window.MAQ.bg.plans().map(p=>[p.id,{...p.transform}]),L:window.MAQ.state.lines.map(l=>[l.id,l.pts.map(q=>q.slice())])}));
out.dP=dP;out.dL=dL;out.lab=B1.lab;out.back=J(B2)===J(B0);
// enregistré : le groupe et les liens partent avec le chantier, et reviennent
await page.click('#bSave');await wait(250);await page.fill('#svName','Essai planches TA');await page.click('#svOk');await wait(1500);
const SID4=await page.evaluate(()=>window.MAQ.state.siteRef&&window.MAQ.state.siteRef.id);const site4=await idb('trace:handoff:'+SID4);
out.saved={grp:site4&&site4.plans.filter(p=>p.grp&&p.grp.nom==='Plan assemblé Nord').length,plans:site4&&site4.traceur.lines.map(l=>(l.plans||[]).length)};await page.click('#svStay');
await page.goto(BASE+'/traceur.html?site='+SID4);await wait(1800);out.reload={g:await page.evaluate(()=>window.MAQ.planches.groupes().map(g=>g.nom+':'+g.plans.length)),l:await page.evaluate(()=>window.MAQ.state.lines.map(l=>(l.plans||[]).length)),ghost:(await H()).n};
console.log('4) groupe calé ensemble :',J(out));
const mv=dP.filter(x=>x[0]!==IDS.ISO);
C.c4=c4a&&out.opts[0][0]==='g:'&&/▦ groupe « Plan assemblé Nord » — 4 planches, 2 lignes/.test(out.opts[0][1])&&out.prev.th===4&&/4 planches \+ 2 lignes/.test(out.prev.txt)&&out.hl.out===4&&J(out.hl.lines)===J(['L1','L2'])&&/⌖/.test(out.bar)
  &&mv.length===4&&mv.every(x=>near(x[1],6)&&near(x[2],8))&&dP.find(x=>x[0]===IDS.ISO)[1]===0&&J(dL.find(x=>x[0]==='L3'))===J(['L3',0,0])&&dL.filter(x=>x[0]!=='L3').every(x=>near(x[1],6)&&near(x[2],8))
  &&/^calage du groupe « Plan assemblé Nord » \(4 planches, 2 lignes\) sur la vue aérienne$/.test(out.lab)&&out.back&&out.saved.grp===4&&J(out.saved.plans)===J([2,1,1])&&J(out.reload.g)===J(['Plan assemblé Nord:4'])&&J(out.reload.l)===J([2,1,1])&&out.reload.ghost===0;
// ════ c2 / c3 · l'appli : pack SCR (partie « regles », tableau FICTIF), affaire avec 2 zones de chiffrage créées à la main
await page.goto(BASE+'/index.html');await wait(900);{const s=await page.$('#loginSkip');if(s&&await s.isVisible())await s.click();await wait(600);}
await page.evaluate(()=>{const T=window.TRACE;T.state.userId='ethan';T.renderHome();});await wait(300);await page.evaluate(()=>document.getElementById('htEnt').click());await wait(400);
await page.evaluate(()=>{const b=[...document.querySelectorAll('#eq-app .ac-row')].find(x=>/Pack SCR/.test(x.textContent));if(b)b.click();});await wait(400);
await (await page.$('#eq-app input[type=file][data-xin="pack|file"]')).setInputFiles({name:'pack_essai.json',mimeType:'application/json',buffer:Buffer.from(J({format:'trace-pack-scr',version:'essai',regles:FAKE}))});await wait(600);
await page.evaluate(()=>{const b=[...document.querySelectorAll('#eq-app button')].find(x=>/Importer/.test(x.textContent));if(b)b.click();});for(let i=0;i<20;i++){await wait(250);if(await page.evaluate(()=>/Résultat/.test(document.getElementById('eq-app').textContent)))break;}
const pack=await page.evaluate(()=>[...document.querySelectorAll('#eq-app .okbox,#eq-app .warnbox')].map(x=>x.textContent.replace(/\s+/g,' ')).join(' | '));
const N1='O2610-81';
const click=async v=>{await page.evaluate(v=>{const el=document.querySelector(`#eq-app [data-act=af][data-v="${v}"]`);if(!el)throw new Error('bouton absent '+v);el.click();},v);await wait(300);};
const openAff=async(n,tab)=>{await page.evaluate(([n,t])=>{const T=window.TRACE;T.state.userId='ethan';const S=T.affaires.state();S.view='fiche';S.cur=n;S.tab=t;T.renderHome();const b=document.querySelector(`#eq-app [data-act=af][data-v="tab|${t}"]`);if(b)b.click();},[n,tab]);await wait(400);};
await page.evaluate(async n=>{const T=window.TRACE;T.state.userId='ethan';const S=T.affaires.state();S.cur=null;S.view='list';S.seg='devis';T.renderHome();document.getElementById('htCom').click();await new Promise(x=>setTimeout(x,300));
  for(let k=0;k<20&&!document.querySelector('#eq-app [data-act=af][data-v="new|"]');k++)await new Promise(x=>setTimeout(x,100));
  document.querySelector('#eq-app [data-act=af][data-v="new|"]').click();await new Promise(x=>setTimeout(x,150));document.getElementById('afn-num').value=n;document.getElementById('afn-nom').value='Réseau fictif TA';document.getElementById('afn-client').value='CLIENT FICTIF';document.getElementById('afn-etat').value='devis';
  document.querySelector('#eq-app [data-act=af][data-v="create|"]').click();await new Promise(x=>setTimeout(x,300));},N1);await wait(300);
await click('tab|chiffrage');await page.setInputFiles('#eq-app input[data-afprix]',{name:'fixture_prix.xlsx',mimeType:'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',buffer:fs.readFileSync(path.join(HERE,'fixture_prix.xlsx'))});await wait(1500);
await openAff(N1,'chiffrage');await click('chetudeadd|');await openAff(N1,'chiffrage');await click('chetudeadd|');
const E0=await page.evaluate(n=>(window.TRACE.affaires.get(n).chiffrage.etudes||[]).map(z=>({id:z.id,nom:z.nom})),N1);
// traceur ouvert DEPUIS l'affaire (étude)
await openAff(N1,'sites');await page.evaluate(()=>{document.querySelector('#eq-app [data-act=tabgo][data-v=traceur]').click();});await page.waitForURL(/traceur\.html/,{timeout:8000}).catch(()=>{});await wait(1300);
const trace=async pts=>{await page.evaluate(()=>window.MAQ.setMode('trace'));for(const q of pts)await clickW(q[0],q[1]);await page.keyboard.press('Enter');await wait(250);};
const DIL=async()=>{await page.evaluate(()=>{const M=window.MAQ;if(!M.state.lines.length)M.state.seq=1;M.state.view={k:6,tx:40,ty:250};M.state.dn=100;M.rebuild();if(document.activeElement)document.activeElement.blur();});await wait(100);
  await trace([[0,0],[0,10],[70,10],[70,0]]); // ligne droite de 70 m entre deux coudes 90° (60 m admissibles en DN 100 au tableau FICTIF)
  await page.evaluate(()=>{window.MAQ.state.dn=50;});await trace([[35,10],[35,30]]); // antenne de 20 m sans coude (8 m maxi)
  await page.evaluate(()=>{window.MAQ.state.dn=100;});await trace([[90,0],[90,10],[140,10],[140,0]]); // 50 m entre coudes : conforme
  await page.evaluate(()=>window.MAQ.setMode('select'));};
const DREAD=async()=>page.evaluate(()=>{const M=window.MAQ;const r={};M.state.tab='notes';M.state.sel=null;M.rebuild();r.notes=[...document.querySelectorAll('#panel [data-act="t1-dil"]')].map(n=>n.textContent);r.warnNotes=[...document.querySelectorAll('#panel .note.warn')].map(n=>n.textContent).filter(t=>!/^Ligne L|^Antenne L/.test(t));
  r.foot=(document.querySelector('#foot .dx-foot')||{}).textContent||'';const fiche=id=>{M.state.sel={kind:'line',id};M.state.tab='sel';M.rebuild();const s=document.querySelector(`#panel .dx-st[data-line="${id}"]`);return s?s.textContent.replace(/\s+/g,' ').trim():'';};
  r.f1=fiche('L1');r.f2=fiche('L2');r.f3=fiche('L3');r.etude=M.t1.etude();return r;});
await DIL();const D1=await DREAD();await ficheShot('L1','Dilatation','pc_dilatation_etude');
if(SHOTS){await page.evaluate(()=>{const M=window.MAQ;M.state.sel=null;M.state.tab='notes';M.rebuild();});await wait(150);await shot('pc_dilatation_notes');await page.evaluate(()=>{const M=window.MAQ;M.state.tab='sel';M.rebuild();});}
// c3 : « ▦ Zones » montre les zones du chiffrage ; lignes mises dans « Zone 1 » (existante) ; nouvelle zone : nom libre
await page.evaluate(()=>window.MAQ.zonesCh.load(true));await wait(300);await page.click('#t1Zones');await wait(300);
out={list:await page.evaluate(()=>[...document.querySelectorAll('#t1Float .zx-ch')].map(r=>r.textContent.replace(/\s+/g,' ').trim()))};
await page.evaluate(()=>window.MAQ.t1.select(['L1','L2']));await wait(200);
out.pick=await page.evaluate(()=>[...document.querySelectorAll('#panel [data-zx="pick"] option')].map(o=>o.textContent));
const z0=await H();await page.selectOption('#panel [data-zx="pick"]',E0[0].id);await page.click('#panel [data-zx="putSel"]');await wait(300);
out.z1=await page.evaluate(()=>JSON.stringify(window.MAQ.state.zones));const z1=await H();out.lab=z1.lab;out.steps=z1.n-z0.n;
await page.click('#bUndo');await wait(250);out.undo=await page.evaluate(()=>window.MAQ.state.zones.length);await page.click('#bRedo');await wait(250);out.redo=await page.evaluate(()=>JSON.stringify(window.MAQ.state.zones));
await page.evaluate(()=>window.MAQ.t1.select(['L3']));await wait(150);await page.click('#panel [data-act="t1-zoneNew"]');await wait(300);
out.zones=await page.evaluate(()=>window.MAQ.state.zones.map(z=>[z.id,z.nom,z.ch||null,z.lines.join('+')]));
await page.evaluate(()=>{window.MAQ.state.sel=null;window.MAQ.rebuild();});await wait(200);await page.evaluate(()=>window.MAQ.t1.openZones(true));await wait(250);
out.tags=await page.evaluate(()=>[...document.querySelectorAll('#t1Float .t1-zone:not(.zx-ch) .zx-tag')].map(t=>t.textContent));await shot('pc_zones_chiffrage');
await page.click('#bSave');await wait(250);await page.fill('#svName','Étude fictive TA');await page.click('#svOk');await wait(1500);
const SID=await page.evaluate(()=>window.MAQ.state.siteRef&&window.MAQ.state.siteRef.id);const site=await idb('trace:handoff:'+SID);out.saved=site&&site.traceur.zones.map(z=>[z.nom,z.ch||null]);
await page.click('#svGo');await page.waitForFunction(()=>{const T=window.TRACE;return T&&T.state.homeTab==='commerce'&&!document.getElementById('lzAffWait')&&!!document.querySelector('#eq-app .af-head');},null,{timeout:20000}).catch(()=>{});await wait(600);
// appli : « Mettre à jour les zones du chiffrage depuis le tracé »
await openAff(N1,'quantites');await click('qssel|trace:'+SID);
out.app={btn:await page.evaluate(id=>(document.querySelector(`#eq-app [data-v="qzmk|${id}|zones"]`)||{}).textContent||'',SID),lk:await page.evaluate(()=>[...document.querySelectorAll('#eq-app .qz-lk')].map(x=>x.textContent))};
await click(`qzmk|${SID}|zones`);await wait(300);out.app.modal=await page.evaluate(()=>{const M=document.getElementById('modal');return M&&M.classList.contains('show')?{t:M.textContent.replace(/\s+/g,' ').trim(),add:!!document.getElementById('qz-add')}:null;});
await shot('pc_appli_zones_maj');
await page.evaluate(()=>document.getElementById('qz-rep').click());await wait(400);{const m=await page.evaluate(()=>document.querySelector('#modal.show [data-close]'));if(m)await page.evaluate(()=>document.querySelector('#modal.show [data-close]').click());}
const E1=await page.evaluate(n=>(window.TRACE.affaires.get(n).chiffrage.etudes||[]).map(z=>({id:z.id,nom:z.nom,qt:z.qt?z.qt.ref:null,soud:(z.dn||[]).reduce((s,r)=>s+r.soud,0)})),N1);
await openAff(N1,'quantites');await click('qssel|trace:'+SID);await click(`qzmk|${SID}|zones`);await wait(300);const modal2=await page.evaluate(()=>{const M=document.getElementById('modal');return M&&M.classList.contains('show')?M.textContent.replace(/\s+/g,' ').trim():'';});
await page.evaluate(()=>document.getElementById('qz-rep').click());await wait(400);{const m=await page.evaluate(()=>!!document.querySelector('#modal.show [data-close]'));if(m)await page.evaluate(()=>document.querySelector('#modal.show [data-close]').click());}
const E2=await page.evaluate(n=>(window.TRACE.affaires.get(n).chiffrage.etudes||[]).map(z=>({id:z.id,nom:z.nom})),N1);
// traceur rouvert depuis l'affaire : les deux zones tracées reliées
await openAff(N1,'sites');await page.evaluate(id=>{document.querySelector('#eq-app [data-v="etopen|'+id+'"]').click();},SID);await page.waitForURL(/traceur\.html/,{timeout:8000}).catch(()=>{});await wait(1800);
await page.evaluate(()=>window.MAQ.zonesCh.load(true));await wait(300);await page.evaluate(()=>window.MAQ.t1.openZones(true));await wait(250);
const back3={links:await page.evaluate(()=>window.MAQ.zonesCh.links()),tags:await page.evaluate(()=>[...document.querySelectorAll('#t1Float .t1-zone:not(.zx-ch) .zx-tag')].map(t=>t.textContent)),list:await page.evaluate(()=>[...document.querySelectorAll('#t1Float .zx-ch')].map(r=>r.textContent.replace(/\s+/g,' ').trim()))};
console.log('3) zones ↔ chiffrage :',J({E0,...out,E1,modal2:modal2.slice(0,260),E2,back3}));
const zA=E1.find(z=>z.id===E0[0].id),zB=E1.find(z=>z.id===E0[1].id),zC=E1.find(z=>z.nom==='Zone 3');
C.c3=E0.length===2&&E0[0].nom==='Zone 1'&&E0[1].nom==='Zone 2'&&out.list.length===2&&/^○ ?Zone 1 ?pas encore de lignes/.test(out.list[0])&&J(out.pick)===J(['Zone 1','Zone 2'])
  &&out.z1===J([{id:'z1',nom:'Zone 1',lines:['L1','L2'],ch:E0[0].id}])&&out.steps===1&&/« Zone 1 » \(zone du chiffrage\)$/.test(out.lab)&&out.undo===0&&out.redo===out.z1
  &&J(out.zones)===J([['z1','Zone 1',E0[0].id,'L1+L2'],['z2','Zone 3',null,'L3']])&&J(out.tags)===J(['↔ chiffrage','nouvelle'])&&J(out.saved)===J([['Zone 1',E0[0].id],['Zone 3',null]])
  &&/Mettre à jour les zones du chiffrage depuis le tracé/.test(out.app.btn)&&J(out.app.lk)===J(['↔ zone « Zone 1 » du chiffrage'])&&out.app.modal&&!out.app.modal.add&&/déjà la zone « Zone 1 », reliée au tracé \(même zone\)/.test(out.app.modal.t)&&/Nouvelle zone : Zone 3/.test(out.app.modal.t)
  &&E1.length===3&&zA&&zA.nom==='Zone 1'&&zA.qt==='z1'&&zA.soud>0&&zB&&zB.qt===null&&zB.soud===0&&zC&&zC.qt==='z2'&&zC.soud>0&&/déjà des zones « Zone 1 », « Zone 3 »/.test(modal2)&&J(E2.map(z=>z.id))===J(E1.map(z=>z.id))
  &&J(back3.links.map(x=>[x.tz,x.by]))===J([['z1','id'],['z2','lien']])&&J(back3.tags)===J(['↔ chiffrage','↔ chiffrage'])&&back3.list.some(t=>/^↔ ?Zone 3 ?tracée : 1 l\./.test(t));
// c2 (suite) : même tracé dans un CHANTIER (contexte chantier) ; tableau absent ; copie perdue mais registre de l'appareil présent
const D2=await DREAD();
await page.goto(BASE+'/traceur.html?site=new');await wait(900);
// le dessin libre garde ses paramètres (ceux laissés par c1 : LOGSTOR, 1,2 m, 110 °C) : remis aux valeurs par défaut par le bandeau et l'onglet Règles
await page.selectOption('#supplier','AXIOM');await page.fill('#prof','0.8');await page.dispatchEvent('#prof','change');await page.evaluate(()=>{const M=window.MAQ;M.rules.dilatTemp=120;M.rebuild();});await wait(150);
await DIL();
await page.click('#bSave');await wait(250);await page.fill('#svName','Chantier fictif TA');await page.click('#svOk');await wait(1500);const SIDC=await page.evaluate(()=>window.MAQ.state.siteRef&&window.MAQ.state.siteRef.id);await page.click('#svStay');
await page.goto(BASE+'/traceur.html?site='+SIDC);await wait(1800);const D3=await DREAD();
// paramètre absent du tableau (110 °C : le tableau FICTIF n'a que 120 °C) → dit : tronçons « non vérifiés » (pied de page, fiche, Notes)
await page.evaluate(()=>{const M=window.MAQ;M.rules.dilatTemp=110;M.rebuild();});const D3b=await DREAD();await page.evaluate(()=>{const M=window.MAQ;M.rules.dilatTemp=120;M.rebuild();});
const reg=await idb('trace:reg:prix');await page.evaluate(()=>localStorage.removeItem('trace:regles'));await idb('trace:reg:prix',null,true);
await page.goto(BASE+'/traceur.html?site='+SIDC);await wait(1800);const D4=await DREAD();await ficheShot('L1','Dilatation','pc_dilatation_absente');
await idb('trace:reg:prix',reg);await page.goto(BASE+'/traceur.html?site='+SIDC);await wait(1800);const D5=await DREAD();D5.ls=await page.evaluate(()=>{try{return JSON.parse(localStorage.getItem('trace:regles')).lmax.titre;}catch(e){return null;}});
console.log('2) dilatation :',J({pack,D1,D2:{n:D2.notes.length},D3,D3b,D4,D5}));
const E1t='Ligne L1 · Ligne trop longue entre deux coudes à 90° : 70 m pour 60 m admissibles (DN 100, prof. 0,80 m supposée, 120 °C, 150 N/mm²) — insérer une lyre (indicatif)',E2t='Antenne L2 · Dilatation : 20 m en ligne droite après le té sans coude à 90° (8 m maxi)';
const okD=D=>J(D.notes)===J([E1t,E2t])&&/^⚠ 2 alertes dilatation \(indicatif\)/.test(D.foot)&&/⚠ 1 tronçon trop long sur 1 entre coudes à 90° : insérer une lyre \(détail ci-dessus\)/.test(D.f1)&&/Profondeur manquante sur la ligne « Ligne L1 » : 0,80 m supposée/.test(D.f1)
  &&/⚠ Antenne : 20 m en ligne droite après le té avant le 1er coude à 90° \(8 m maxi\)/.test(D.f2)&&/✓ 1 tronçon entre coudes à 90° : le plus chargé 50 m pour 60 m admissibles/.test(D.f3)&&D.warnNotes.some(t=>/Profondeur manquante sur « Ligne L1 », « Ligne L3 »/.test(t));
C.c2=/Règles de tracé : longueurs maximales entre coudes \(dilatation\) — 1 tableau · 2 DN · 2 profondeurs — pris par le traceur/.test(pack)&&okD(D1)&&D1.etude===true&&D2.notes.length===2&&okD(D3)&&D3.etude===false
  &&J(D3b.notes)===J([E2t])&&/tronçons non vérifiés \(110 °C \/ 150 N\/mm² absents du tableau\)/.test(D3b.foot)&&/1 tronçon non vérifié : 110 °C \/ 150 N\/mm² absents du tableau importé/.test(D3b.f1)
  &&J(D4.notes)===J([E2t.replace('(8 m maxi)','(10 m maxi)')])&&/^⚠ règles de dilatation : non chargées — ouvre SCR → Pack SCR \(partie Règles\) dans l'appli, sur cet appareil · 1 alerte \(té\)/.test(D4.foot)&&D4.warnNotes.some(t=>/^⚠ Règles de dilatation : non chargées/.test(t))&&/⚠ Règles de dilatation : non chargées/.test(D4.f1)
  &&okD(D5)&&D5.ls==='Tableau FICTIF TA';
// ════ c6 · téléphone 390 px
const ph=await ctx.newPage();await ph.setViewportSize({width:390,height:844});watch(ph,'(tél.) ');ph.on('dialog',d=>d.accept().catch(()=>{})); /* même appareil (mêmes chantiers en mémoire), écran de téléphone */
const lay=sel=>ph.evaluate(sel=>{const els=[...document.querySelectorAll(sel)].filter(e=>e.offsetParent&&e.getBoundingClientRect().width>0);const small=els.filter(e=>e.matches('button,select,input:not([type=checkbox]):not([type=radio])')&&e.getBoundingClientRect().height<34).map(e=>e.outerHTML.slice(0,70));
  const box=document.querySelector(sel.split(' ')[0]);const r=box?box.getBoundingClientRect():null;return {sw:document.documentElement.scrollWidth,small,right:r?Math.round(r.right):null,vis:!!(box&&box.offsetParent),n:els.length};},sel);
await ph.goto(BASE+'/traceur.html?site='+SID4);await ph.waitForTimeout(1800);
await ph.click('#plBtn');await ph.waitForTimeout(250);await ph.evaluate(()=>{const g=window.MAQ.planches.groupes()[0];window.MAQ.planches.focus('g',g.id);});await ph.waitForTimeout(250);await ph.click('#plPanel [data-pl="frame"]');await ph.waitForTimeout(250);await ph.evaluate(()=>{document.getElementById('plPanel').scrollTop=0;});
const t1=await lay('#plPanel button, #plPanel select, #plPanel input');if(SHOTS)await ph.screenshot({path:path.join(SHOTS,'ta_tel_planches.png')});
await ph.click('#plPanel [data-pl="close"]');await ph.waitForTimeout(150);
await ph.goto(BASE+'/traceur.html?site='+SIDC);await ph.waitForTimeout(1800);await ph.click('#foot [data-dx="list"]');await ph.waitForTimeout(250);
const t2=await lay('#dxCard button, #dxCard .note');const card=await ph.evaluate(()=>[...document.querySelectorAll('#dxCard [data-act="t1-dil"]')].length);if(SHOTS)await ph.screenshot({path:path.join(SHOTS,'ta_tel_dilatation.png')});
await ph.click('#dxCard [data-act="t1-dil"][data-i="0"]');await ph.waitForTimeout(250);const sel6=await ph.evaluate(()=>window.MAQ.state.sel);const ph1=await ph.evaluate(()=>{const c=document.querySelector('#t1Float .t1-fl-multi');return c?c.textContent.replace(/\s+/g,' '):'';});
if(SHOTS)await ph.screenshot({path:path.join(SHOTS,'ta_tel_fiche_ligne.png')});
await ph.goto(BASE+'/traceur.html?site='+SID+'&aff='+N1+'&cv=1');await ph.waitForTimeout(1800);await ph.evaluate(()=>window.MAQ.zonesCh.load(true));await ph.waitForTimeout(300);await ph.click('#t1Zones');await ph.waitForTimeout(300);
const t3=await lay('#t1Float button, #t1Float select, #t1Float input');const zl=await ph.evaluate(()=>document.querySelectorAll('#t1Float .zx-ch').length);if(SHOTS)await ph.screenshot({path:path.join(SHOTS,'ta_tel_zones.png')});
await ph.close();
console.log('6) téléphone :',J({t1,t2,card,sel6,ph1:ph1.slice(0,200),t3,zl}));
C.c6=[t1,t2,t3].every(t=>t.sw<=390&&t.small.length===0&&t.vis&&t.right<=390)&&t1.n>=8&&card===2&&sel6&&sel6.kind==='line'&&sel6.id==='L1'&&/✓|⚠/.test(ph1)&&zl===3;
// ════ fin
C.c7=logs.length===0;
const bad=Object.entries(C).filter(([k,v])=>!v).map(([k])=>k);console.log(bad.length?'RESULTAT: ECHEC '+bad.join(','):'RESULTAT: TOUT VERT');console.log(logs.length?logs:'[]');
await browser.close();
