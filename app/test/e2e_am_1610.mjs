// 16/10 soir (lot AM) — RETOURS D'ETHAN : « 1 - Documents administratifs : j'ai importé deux RIB ; c'est un seul et même document responsabilité civile et décennale
// que j'ai importé. 2 - lors de l'export, dire « attention il y a des trous, télécharger quand même ? » ; si c'est validé, ne pas exporter avec les indications écrites
// en rouge mais enlever le paragraphe avec trous, en spécifiant que les paragraphes avec trous seront enlevés. »
// Hors connexion (Ethan, administrateur), fichiers et bibliothèque de mémoire FICTIFS (test/memoire_fake_am.mjs), sans réseau extérieur :
// (1) deux RIB : « rib » + « ＋ Autre RIB » (libellé, compteur d'échéance à lui) ; (2) RC + décennale en un document : case « Ce document couvre aussi la décennale »,
// copie dans la décennale (« même document que l'attestation RC »), compteurs et « À faire » comptent un seul document, remplacement suivi, le mémoire lit les deux ;
// (3) offre : une ligne par RIB (d'office : le premier), une seule ligne pour l'attestation RC et décennale ; dossier de remise (.zip) : les deux RIB, l'attestation
// une seule fois, bordereau ; (4) export du mémoire avec des trous : fenêtre « ⚠ Il reste N trous dans M paragraphes » + liste, « Compléter d'abord » (1er trou),
// ⬇ PDF sans ces paragraphes (pdftotext : rien en rouge, bloc vidé et section vidée absents du sommaire, numéros recalculés), ⬇ Word (.docx décompressé), 🖨 Imprimer,
// ancien .doc, dossier de remise avec le mémoire, cases du mémoire inchangées ; (5) décocher → les deux attestations redeviennent indépendantes ; (6) sans trou : pas
// de fenêtre ; (7) téléphone 390 px ; (8) zéro erreur console. SHOTS=<dossier> : captures PC (1366) et téléphone (390).
import { chromium } from 'playwright';
import fs from 'fs';import os from 'os';import path from 'path';import {execFileSync} from 'child_process';
import {unzipSync,strFromU8} from 'fflate';
import {FAKE_STYLE} from './memoire_fake.mjs';
import {FAKE4_ACCOUNTS} from './memoire_fake4.mjs';
import {AM_BLOCS,AM_FILL} from './memoire_fake_am.mjs';
process.env.TZ='Europe/Paris'; // l'appli compte les échéances à la date de Paris
const BASE=process.env.BASE||'http://localhost:8765';const SHOTS=process.env.SHOTS||'';const TMP=fs.mkdtempSync(path.join(os.tmpdir(),'am1610-'));
const browser=await chromium.launch({headless:true, executablePath: process.env.CHROMIUM_PATH||undefined});
const C={};const logs=[];
const iso=d=>d.getFullYear()+'-'+String(d.getMonth()+1).padStart(2,'0')+'-'+String(d.getDate()).padStart(2,'0');const plus=n=>{const d=new Date();d.setDate(d.getDate()+n);return iso(d);};
const fr=s=>s.slice(8,10)+'/'+s.slice(5,7)+'/'+s.slice(0,4);
const pdf=t=>Buffer.from('%PDF-1.4\n% fichier FICTIF de test : '+t+'\n%%EOF\n','utf8');
const txtPdf=f=>execFileSync('pdftotext',['-layout',f,'-'],{maxBuffer:64<<20}).toString('utf8');
const flat=s=>String(s).replace(/[’‘]/g,"'").replace(/\s+/g,' ').trim();
const NUM='O2610-91';
async function open(opts){const ctx=await browser.newContext(Object.assign({acceptDownloads:true,timezoneId:'Europe/Paris',viewport:{width:1366,height:900}},opts));const page=await ctx.newPage();
  page.on('pageerror',e=>logs.push('PAGEERROR: '+e.message.slice(0,300)));page.on('console',m=>{if(m.type()==='error'&&!/supabase|Failed to fetch|net::ERR|WebSocket/i.test(m.text()))logs.push(m.text().slice(0,200));});page.on('dialog',d=>d.accept().catch(()=>{}));
  await page.route(u=>/(^|\.)geopf\.fr$|^geo\.api\.gouv\.fr$|open-meteo\.com$|ign\.fr$|openstreetmap|tile/.test(u.hostname),r=>r.fulfill({status:200,contentType:'application/json',body:'{}'}));
  await page.route(u=>/cdn\.jsdelivr\.net|unpkg\.com|cdnjs/.test(u.hostname),r=>r.abort()); /* pas de réseau extérieur : le moteur PDF vient de l'appli */
  await page.goto(BASE+'/index.html');await page.waitForTimeout(600);
  const LIB={kind:'memlib',req:{none:true},title:'Mémoire technique : bibliothèque de blocs SCR',blocs:AM_BLOCS,style:FAKE_STYLE,images:{},version:1,at:'2026-10-16T00:00:00.000Z',by:'Test'};
  await page.evaluate(([row,acc])=>new Promise((res,rej)=>{localStorage.clear();localStorage.setItem('trace:wide','1');localStorage.setItem('trace:accounts',JSON.stringify(acc));const r=indexedDB.open('trace-kv',1);r.onupgradeneeded=()=>{r.result.createObjectStore('kv');};r.onerror=()=>rej(r.error);
    r.onsuccess=()=>{const db=r.result;const t=db.transaction('kv','readwrite');const st=t.objectStore('kv');st.clear();st.put({memlib:{id:'memlib',data:row,updated_at:new Date().toISOString()}},'trace:reg:doc');t.oncomplete=()=>{db.close();res();};t.onerror=()=>rej(t.error);};}),[LIB,FAKE4_ACCOUNTS]);
  await page.reload();await page.waitForTimeout(1200);{const s=await page.$('#loginSkip');if(s&&await s.isVisible())await s.click();await page.waitForTimeout(700);}
  await page.evaluate(async()=>{const T=window.TRACE;T.state.userId='ethan';T.renderHome();await T.acces.list();window.__toasts=[];const t=document.getElementById('toast');if(t)new MutationObserver(()=>{const s=t.textContent;if(s&&window.__toasts[window.__toasts.length-1]!==s)window.__toasts.push(s);}).observe(t,{childList:true,characterData:true,subtree:true});});
  await page.waitForTimeout(300);return {ctx,page};}
let {ctx,page}=await open({});
const wait=ms=>page.waitForTimeout(ms);
const shot=async(n,full)=>{if(!SHOTS)return;fs.mkdirSync(SHOTS,{recursive:true});await wait(250);await page.screenshot({path:path.join(SHOTS,n+'.png'),fullPage:!!full});};
const click=async(v,act)=>{const ok=await page.evaluate(([v,a])=>{const b=document.querySelector(`#eq-app [data-act=${a}][data-v="${v}"]`);if(b)b.click();return !!b;},[v,act||'af']);await wait(350);return ok;};
const toasts=()=>page.evaluate(()=>(window.__toasts||[]).slice());const toastsReset=()=>page.evaluate(()=>{window.__toasts=[];});
const modal=()=>page.evaluate(()=>{const m=document.querySelector('#modal.show');return m?m.textContent.replace(/\s+/g,' ').trim():'';});
const goEnt=async()=>{await page.evaluate(()=>{window.TRACE.renderHome();document.getElementById('htEnt').click();});await wait(350);await page.evaluate(()=>{[...document.querySelectorAll('#eq-app .ac-row')].find(x=>/Documents administratifs \(offres\)/.test(x.textContent)).click();});await wait(400);};
const view=()=>page.evaluate(()=>({rows:[...document.querySelectorAll('#eq-app .dob-erow')].map(r=>({id:r.dataset.ent,k:r.dataset.cpt,same:r.dataset.same||'',t:(r.querySelector('.tx b')||{}).textContent||'',sm:(r.querySelector('.tx small')||{}).textContent||'',pill:(r.querySelector('.ec-pill')||{}).textContent||'',st:(r.querySelector('.dob-st')||{}).textContent||'',pair:(r.querySelector('.am-pair')||{}).textContent||'',bt:[...r.querySelectorAll('.dob-ra button')].map(b=>b.textContent.trim())})),
  kpis:[...document.querySelectorAll('#eq-app .eq-kpi')].map(k=>k.querySelector('b').textContent+' '+k.querySelector('small').textContent).join('|'),next:(document.getElementById('ec-next')||{}).textContent||'',acts:[...document.querySelectorAll('#eq-app .eq-acts button')].map(b=>b.dataset.v+':'+b.textContent.trim())}));
const byId=v=>v.rows.reduce((m,r)=>(m[r.id]=r,m),{});
/* fenêtre d'un document : fichier, date, champs, case « couvre aussi » */
async function fillEnt(o){if(o.file)await page.setInputFiles('#ed-file',{name:o.file,mimeType:'application/pdf',buffer:pdf(o.file)});
  await page.evaluate(o=>{const s=(id,v)=>{const e=document.getElementById(id);if(e&&v!==undefined)e.value=v;};s('ed-valid',o.valid);s('ed-lib',o.lib);s('ed-ass',o.ass);s('ed-pol',o.pol);s('ed-gar',o.gar);const b=document.getElementById('ed-both');if(b&&o.both!==undefined)b.checked=!!o.both;},o);
  if(o.shot)await shot(o.shot);await page.evaluate(()=>document.getElementById('ed-ok').click());await wait(800);}
const reg=id=>page.evaluate(id=>window.TRACE.reg.get('entdoc',id),id);
const ribIds=()=>page.evaluate(()=>window.TRACE.docsOblig.ent().filter(e=>/^rib_/.test(e.id)).map(e=>e.id));
/* dossier de remise : clic 📦 ; si la fenêtre des trous s'ouvre (mémoire à trous), « Télécharger sans ces paragraphes » */
async function zipClick(){await toastsReset();const dlP=page.waitForEvent('download',{timeout:60000});await click('obzip|');await wait(250);const dlg=await modal();
  if(/Il reste/.test(dlg))await page.evaluate(()=>document.getElementById('mx-go').click());const dl=await dlP;const f=path.join(TMP,dl.suggestedFilename());await dl.saveAs(f);await wait(500);
  const Z=unzipSync(new Uint8Array(fs.readFileSync(f)));return {name:dl.suggestedFilename(),Z,names:Object.keys(Z).sort(),dlg,last:await page.evaluate(()=>Object.assign({},window.TRACE.docsOblig.lastZip()||{})),toasts:await toasts()};}

// ══ 1) DEUX RIB : le premier (« rib », libellé) puis « ＋ Autre RIB » (libellé, échéance à lui : J-20)
await goEnt();let v0=await view();
await click('dob|edit|rib','x');let m1=await page.evaluate(()=>({lib:!!document.getElementById('ed-lib'),hint:(document.querySelector('#modal .am-rib-hint')||{}).textContent||'',both:!!document.getElementById('ed-both')}));
await fillEnt({file:'rib-banque-a-fictif.pdf',lib:'Banque fictive A'});
await click('dob|newrib|','x');let m2=await page.evaluate(()=>({h:(document.querySelector('#modal h3')||{}).textContent||'',lib:!!document.getElementById('ed-lib'),valid:document.getElementById('ed-valid').value}));
await fillEnt({file:'rib-banque-b-fictif.pdf',lib:'Banque fictive B',valid:plus(20),shot:'pc_01_autre_rib'});
let ids=await ribIds();let v1=await view();let M=byId(v1);const R2=ids[0]&&M[ids[0]];const order=await page.evaluate(()=>window.TRACE.docsOblig.ent().map(e=>e.id));
let out={v0:{n:v0.rows.length,acts:v0.acts},m1,m2,ids,rib:await reg('rib'),rib2:ids[0]?await reg(ids[0]):null,rows:v1.rows.map(r=>r.id),order,R2,ribRow:M.rib,kpis:v1.kpis,next:v1.next,compat:await page.evaluate(()=>(window.TRACE.reg.get('entdoc','rib')||{}).file||'')};
console.log('1) deux RIB :',JSON.stringify(out));
/* liste : le 2e RIB juste après le premier ; écran rangé par urgence (le RIB B à J-20 passe devant) ; regGet('entdoc','rib') = le premier, comme avant */
C.c1=out.v0.n===7&&out.v0.acts.some(a=>/^dob\|newrib\|:＋ Autre RIB$/.test(a))&&m1.lib&&/Autre RIB/.test(m1.hint)&&!m1.both&&m2.h==='Autre RIB'&&m2.lib&&m2.valid===''
  &&out.rib&&out.rib.libelle==='Banque fictive A'&&out.rib.file==='rib-banque-a-fictif.pdf'&&ids.length===1&&/^rib_banque_fictive_b_/.test(ids[0])&&out.rib2.type==='rib'&&out.rib2.libelle==='Banque fictive B'&&out.rib2.validUntil===plus(20)&&out.rib2.file==='rib-banque-b-fictif.pdf'
  &&out.rows.length===8&&order.indexOf(ids[0])===order.indexOf('rib')+1&&out.compat==='rib-banque-a-fictif.pdf'
  &&R2&&R2.t==='RIB · Banque fictive B'&&R2.pill==='J-20 · à renouveler'&&M.rib.t==='RIB · Banque fictive A'&&M.rib.pill==='sans échéance'&&out.kpis==='1 valides|1 à renouveler (≤ 30 j)|0 expirés|6 à déposer'&&/RIB · Banque fictive B/.test(out.next);
await shot('pc_02_deux_rib',true);

// ══ 2) RC + DÉCENNALE EN UN SEUL DOCUMENT : case dans la fenêtre de l'attestation RC → la décennale reçoit la copie (« même document que l'attestation RC »)
await click('dob|edit|assurance_rc','x');
let m3=await page.evaluate(()=>{const b=document.getElementById('ed-both');const l=b&&b.closest('label');return {both:!!b,checked:b&&b.checked,lab:l?l.textContent.replace(/\s+/g,' ').trim():''};});
await fillEnt({file:'attestation-rc-dec-fictive.pdf',valid:plus(25),ass:'Assureur fictif',pol:'POL-FICT-1',gar:'RC : 1 000 000 € ; décennale : 500 000 € (fictif)',both:true,shot:'pc_03_rc_couvre_decennale'});
let rc=await reg('assurance_rc'),dc=await reg('assurance_decennale');let v2=await view();M=byId(v2);
out={m3,rc:rc&&{file:rc.file,same:rc.same||null,valid:rc.validUntil},dc:dc&&{file:dc.file,same:dc.same,valid:dc.validUntil,ass:dc.assureur,pol:dc.police,gar:dc.garanties,data:dc.data===rc.data},rowRc:M.assurance_rc,rowDc:M.assurance_decennale,kpis:v2.kpis,toasts:await toasts()};
console.log('2) RC + décennale :',JSON.stringify(out));
C.c2=m3.both&&!m3.checked&&/Ce document couvre aussi la décennale/.test(m3.lab)&&out.rc.file==='attestation-rc-dec-fictive.pdf'&&!out.rc.same&&out.rc.valid===plus(25)
  &&out.dc&&out.dc.same==='assurance_rc'&&out.dc.file==='attestation-rc-dec-fictive.pdf'&&out.dc.valid===plus(25)&&out.dc.ass==='Assureur fictif'&&out.dc.pol==='POL-FICT-1'&&/500 000/.test(out.dc.gar)&&out.dc.data
  &&out.rowDc.k==='same'&&out.rowDc.st==='même document que l\'attestation RC'&&out.rowDc.pill===''&&out.rowDc.same==='assurance_rc'&&/Couvre aussi la décennale/.test(out.rowRc.pair)&&out.rowRc.pill==='J-25 · à renouveler';
// compteurs : la paire compte UNE fois (à renouveler : RIB B + attestation = 2 ; à déposer : Kbis, URSSAF, fiscale, qualifications = 4) ; hub et « À faire »
await page.evaluate(()=>document.querySelector('#eq-app .ac-back')&&document.querySelector('#eq-app .ac-back').click());await wait(300);
const hub=await page.evaluate(()=>{const r=[...document.querySelectorAll('#eq-app .ac-row')].find(x=>/Documents administratifs \(offres\)/.test(x.textContent));return r?r.textContent.replace(/\s+/g,' '):'';});
await page.evaluate(()=>document.getElementById('htHome').click());await wait(400);
const todo=await page.evaluate(()=>{const n=[...document.querySelectorAll('#eq-app .ac-notif')].find(x=>x.textContent.includes('🗂'));return n?n.textContent.replace(/\s+/g,' '):'';});
out={kpis:v2.kpis,hub,todo};console.log('2 bis) compteurs :',JSON.stringify(out));
C.c3=v2.kpis==='1 valides|2 à renouveler (≤ 30 j)|0 expirés|4 à déposer'&&/2 à renouveler/.test(hub)&&/2 documents administratifs à renouveler/.test(todo)&&/Assurance RC et décennale : expire dans 25 jours/.test(todo)&&!/Assurance décennale/.test(todo)&&/RIB · Banque fictive B : expire dans 20 jours/.test(todo);
// remplacement de l'attestation RC (nouveau fichier, nouvelle date) → la décennale suit ; son ancienne version est gardée
await goEnt();await click('dob|edit|assurance_rc','x');const m4=await page.evaluate(()=>({checked:(document.getElementById('ed-both')||{}).checked,h:(document.getElementById('ed-both-h')||{}).textContent||''}));
await fillEnt({file:'attestation-rc-dec-fictive-2027.pdf',valid:plus(300)});
rc=await reg('assurance_rc');dc=await reg('assurance_decennale');
out={m4,rc:{file:rc.file,valid:rc.validUntil,prev:(rc.prev||[]).map(p=>p.file)},dc:{file:dc.file,valid:dc.validUntil,same:dc.same,prev:(dc.prev||[]).map(p=>p.file),data:dc.data===rc.data}};console.log('2 ter) remplacement suivi :',JSON.stringify(out));
C.c4=m4.checked&&/suit les remplacements/.test(m4.h)&&out.rc.file==='attestation-rc-dec-fictive-2027.pdf'&&out.dc.file==='attestation-rc-dec-fictive-2027.pdf'&&out.dc.valid===plus(300)&&out.dc.same==='assurance_rc'&&out.dc.data&&out.rc.prev[0]==='attestation-rc-dec-fictive.pdf'&&out.dc.prev[0]==='attestation-rc-dec-fictive.pdf';
// depuis la décennale (la suiveuse) : la fenêtre dit « même document », la case est cochée
await click('dob|edit|assurance_decennale','x');const m5=await page.evaluate(()=>{const b=document.getElementById('ed-both');return {checked:b&&b.checked,lab:b?b.closest('label').textContent.replace(/\s+/g,' ').trim():''};});await page.evaluate(()=>document.querySelector('#modal [data-close]').click());await wait(200);
C.c4=C.c4&&m5.checked&&/Ce document couvre aussi la RC/.test(m5.lab)&&/Même document que l'attestation RC/.test(m5.lab);
await shot('pc_04_documents_paire',true);

// ══ 3) AFFAIRE + MÉMOIRE : le mémoire lit les deux attestations (variables RC et décennale, condition « décennale », liste des documents : une ligne)
await page.evaluate(()=>{document.getElementById('htCom').click();});await wait(300);
await click('new|');await page.evaluate(n=>{const s=(id,v)=>{const e=document.getElementById(id);if(e)e.value=v;};s('afn-num',n);s('afn-nom','Réseau fictif AM');s('afn-client','CLIENT-FICTIF');s('afn-ville','Villefictive');s('afn-sect','ouest');s('afn-etat','devis');},NUM);await click('create|');
await page.evaluate(([n,d])=>window.TRACE.affaires.set(n,{dateReponse:d,charge:'Alain Chargé',cdtx:'Cédric Conduite'}),[NUM,plus(30)]);
await click('tab|memoire');await wait(500);
const memTxt=()=>page.evaluate(()=>(document.getElementById('memoire-scroll')||{}).textContent||'').then(flat);
let mt=await memTxt();const vd=fr(plus(300));
out={rcVar:mt.includes('Responsabilité civile : Assureur fictif, police POL-FICT-1, valable jusqu\'au '+vd),decVar:mt.includes('Décennale : Assureur fictif, police POL-FICT-1, valable jusqu\'au '+vd),cond:mt.includes('Attestation décennale fictive jointe au dossier.'),
  docs:(mt.match(/Attestation d'assurance responsabilité civile et décennale – Assureur fictif \(police n° POL-FICT-1\)/g)||[]).length,docsDec:/Attestation d'assurance décennale –/.test(mt),tile:await page.evaluate(()=>(document.getElementById('memoire-nholes')||{}).textContent||'')};
console.log('3) mémoire et assurances :',JSON.stringify(out));
C.c5=out.rcVar&&out.decVar&&out.cond&&out.docs===1&&!out.docsDec;

// ══ 4) EXPORT AVEC DES TROUS — ⬇ PDF : la fenêtre, la liste, « Compléter d'abord » (va au 1er trou), puis « Télécharger sans ces paragraphes »
const tile=out.tile;const nTrous=+((/\((\d+) trous?\)/.exec(tile)||[])[1]||0);const sel0=await page.evaluate(n=>JSON.stringify(((window.TRACE.affaires.get(n).memoire||{}).lib||{}).sel||{}),NUM);
await page.evaluate(()=>document.querySelector('#eq-app .memoire-head [data-v="mpdf|"]').click());await wait(400);
const dlg=await page.evaluate(()=>({h:(document.getElementById('mx-h')||{}).textContent||'',why:(document.getElementById('mx-why')||{}).textContent||'',li:[...document.querySelectorAll('#mx-list li')].map(l=>l.textContent.replace(/\s+/g,' ').trim()),go:(document.getElementById('mx-go')||{}).textContent||'',fill:(document.getElementById('mx-fill')||{}).textContent||''}));
await shot('pc_05_fenetre_trous');
await page.evaluate(()=>document.getElementById('mx-fill').click());await wait(600);
const first=await page.evaluate(()=>{const a=document.activeElement;const hs=[...document.querySelectorAll('#memoire-scroll .memoire-h')];return {modal:!!document.querySelector('#modal.show'),isFirst:!!a&&a===hs[0],pos:(document.getElementById('memoire-navpos')||{}).textContent||'',n:hs.length};});
out={tile,nTrous,dlg,first};console.log('4) fenêtre des trous :',JSON.stringify(out));
C.c6=nTrous===6&&dlg.h==='⚠ Il reste 6 trous dans 5 paragraphes'&&/Si tu télécharges quand même, ces 5 paragraphes seront RETIRÉS du document \(rien en rouge\)/.test(dlg.why)&&dlg.li.length===5
  &&/^1\.1 Identité fictive/.test(dlg.li[0])&&/1 trou/.test(dlg.li[0])&&/Numéro fictif à préciser/.test(dlg.li[0])&&/^2\.1 Bloc tout à trous/.test(dlg.li[1])&&/2 trous/.test(dlg.li[1])&&/Premier paragraphe à trous/.test(dlg.li[1])
  &&/^2\.1 Bloc tout à trous/.test(dlg.li[2])&&/Second paragraphe/.test(dlg.li[2])&&/^2\.3 Moyens humains fictifs/.test(dlg.li[3])&&/Chef de chantier à choisir/.test(dlg.li[3])&&/^3\.1 Bloc unique à trou/.test(dlg.li[4])
  &&!dlg.li.some(l=>/Plans fictifs|référence et indice/.test(l))&&/^Télécharger sans ces paragraphes$/.test(dlg.go.trim())&&/Compléter d'abord/.test(dlg.fill)&&!first.modal&&first.isFirst&&first.pos==='1 / '+first.n;
/* ⬇ PDF → fenêtre → « Télécharger sans ces paragraphes » → le PDF, sans les paragraphes à trous */
async function exportVia(sel,kind){await toastsReset();const ev=kind==='print'?page.waitForEvent('popup',{timeout:30000}):page.waitForEvent('download',{timeout:60000});await page.evaluate(s=>document.querySelector(s).click(),sel);await wait(300);
  const had=await page.evaluate(()=>!!document.getElementById('mx-go'));if(had)await page.evaluate(()=>document.getElementById('mx-go').click());const r=await ev;await wait(600);return {had,r};}
let E1=await exportVia('#eq-app .memoire-head [data-v="mpdf|"]');const F1=path.join(TMP,'sans_trous.pdf');await E1.r.saveAs(F1);await wait(400);const T1=flat(txtPdf(F1));const tst=await toasts();
const sel1=await page.evaluate(n=>JSON.stringify(((window.TRACE.affaires.get(n).memoire||{}).lib||{}).sel||{}),NUM);const tile1=await page.evaluate(()=>(document.getElementById('memoire-nholes')||{}).textContent||'');
out={had:E1.had,name:E1.r.suggestedFilename(),toasts:tst,keep:['Texte fictif de présentation, sans aucun trou.','Plans fictifs du réseau.','Méthode fictive complète, rien à compléter ici.','Conclusion fictive sans trou.','Décennale : Assureur fictif'].filter(s=>!T1.includes(s)),
  gone:['[À COMPLÉTER','À COMPLÉTER','Numéro fictif à préciser','Premier paragraphe à trous','Second paragraphe à trou','Seul paragraphe de la section','Bloc tout à trous','Section toute à trous','Bloc unique à trou','Moyens humains fictifs','Pôle fictif','trou encore','trous encore','référence et indice'].filter(s=>T1.includes(s)),
  toc:['1. PRÉSENTATION FICTIVE','1.1 IDENTITÉ FICTIVE','2. MÉTHODOLOGIE FICTIVE','2.1 BLOC SANS TROU','3. GARANTIES FICTIVES','3.1 ASSURANCES FICTIVES','4. CONCLUSION FICTIVE','4.1 FIN FICTIVE'].filter(s=>!T1.toLocaleUpperCase('fr-FR').includes(s)),bad5:/5\. CONCLUSION/i.test(T1)||/2\.2 BLOC SANS/i.test(T1),sel0,sel1,tile1};
if(SHOTS){fs.mkdirSync(SHOTS,{recursive:true});fs.copyFileSync(F1,path.join(SHOTS,'memoire_sans_trous.pdf'));}
console.log('5) PDF sans les paragraphes à trous :',JSON.stringify(out));
C.c7=out.had&&out.name==='Memoire_technique_'+NUM+'.pdf'&&out.keep.length===0&&out.gone.length===0&&out.toc.length===0&&!out.bad5&&tst.some(t=>/⬇ Mémoire PDF : \d+ pages? · 5 paragraphes à trous retirés/.test(t))&&!tst.some(t=>/encore en rouge/.test(t))&&out.sel0===out.sel1&&tile1===tile;
// ⬇ Word : même chose dans le .docx (document.xml décompressé) — sommaire recalculé
let E2=await exportVia('#eq-app .memoire-head [data-v="mword|"]');const Zw=unzipSync(new Uint8Array(fs.readFileSync(await E2.r.path())));const dx=Zw['word/document.xml']?strFromU8(Zw['word/document.xml']):'';const T2=flat(dx.replace(/<\/w:p>/g,'\n').replace(/<[^>]+>/g,' ').replace(/&amp;/g,'&').replace(/&apos;/g,"'").replace(/&quot;/g,'"'));const tw=await toasts();
out={had:E2.had,name:E2.r.suggestedFilename(),keep:['Texte fictif de présentation, sans aucun trou.','Méthode fictive complète, rien à compléter ici.','Conclusion fictive sans trou.'].filter(s=>!T2.includes(s)),gone:['COMPLÉTER','Numéro fictif à préciser','Premier paragraphe à trous','Seul paragraphe de la section','Bloc tout à trous','Section toute à trous','Moyens humains fictifs','Pôle fictif','trous encore'].filter(s=>T2.includes(s)),
  toc:['2.1 Bloc sans trou','3. Garanties fictives','4. Conclusion fictive','4.1 Fin fictive'].filter(s=>!T2.includes(s)),toasts:tw};
console.log('6) Word sans les paragraphes à trous :',JSON.stringify(out));
C.c8=out.had&&out.name==='Memoire_technique_'+NUM+'.docx'&&out.keep.length===0&&out.gone.length===0&&out.toc.length===0&&!/2\.2 Bloc sans trou|5\. Conclusion/.test(T2)&&tw.some(t=>/Word \.docx\) au gabarit SCR · 5 paragraphes à trous retirés/.test(t));
// 🖨 Imprimer (fenêtre A4) et ancien .doc : mêmes paragraphes retirés
let E3=await exportVia('#eq-app .memoire-head [data-v="mprint|"]','print');const pop=E3.r;await pop.waitForLoadState().catch(()=>{});for(let i=0;i<30;i++){await pop.waitForTimeout(200);if(await pop.evaluate(()=>!!document.documentElement.dataset.paged).catch(()=>false))break;}
const T3=flat(await pop.evaluate(()=>document.body.innerText).catch(()=>''));await pop.close().catch(()=>{});
let E4=await exportVia('#eq-app [data-v="mlbdoc|"]');const T4=flat(fs.readFileSync(await E4.r.path()).toString('utf8').replace(/<[^>]+>/g,' ').replace(/&#39;/g,"'"));const td=await toasts();
out={print:{had:E3.had,gone:['COMPLÉTER','Bloc tout à trous','Section toute à trous','Pôle fictif'].filter(s=>T3.includes(s)),keep:['2.1 Bloc sans trou','Conclusion fictive sans trou.'].filter(s=>!T3.includes(s))},doc:{had:E4.had,name:E4.r.suggestedFilename(),gone:['COMPLÉTER','Bloc tout à trous','Section toute à trous','Numéro fictif'].filter(s=>T4.includes(s)),keep:['2.1 Bloc sans trou','Conclusion fictive sans trou.'].filter(s=>!T4.includes(s)),toast:td.find(t=>/ancien format/.test(t))||''}};
console.log('7) impression et ancien .doc :',JSON.stringify(out));
C.c9=out.print.had&&!out.print.gone.length&&!out.print.keep.length&&out.doc.had&&out.doc.name==='Memoire_technique_'+NUM+'.doc'&&!out.doc.gone.length&&!out.doc.keep.length&&/5 paragraphes à trous retirés/.test(out.doc.toast)&&!/encore en rouge/.test(out.doc.toast);

// ══ 5) 7 · OFFRE : une ligne par RIB (d'office : le premier), UNE ligne pour l'attestation RC et décennale ; dossier de remise (.zip) avec le mémoire sans trous
await click('tab|offre');await wait(500);
const offre=()=>page.evaluate(()=>[...document.querySelectorAll('#dob-offre .dob-row[data-key^="e:"]')].map(r=>({k:r.dataset.key,lab:(r.querySelector('.tx b')||{}).textContent||'',sub:(r.querySelector('.tx small')||{}).textContent||'',inc:!!(r.querySelector('input[type=checkbox]')||{}).checked,pill:(r.querySelector('.ec-pill')||{}).textContent||''})));
let O1=await offre();const ob=k=>O1.find(x=>x.k===k)||{};
out={rows:O1.map(x=>x.k+':'+(x.inc?'✓':'·')),rib:ob('e:rib'),rib2:ob('e:'+ids[0]),pair:ob('e:assurance_rc'),dec:ob('e:assurance_decennale')};
console.log('8) offre :',JSON.stringify(out));
C.c10=out.rib.lab==='RIB · Banque fictive A'&&out.rib.inc&&out.rib2.lab==='RIB · Banque fictive B'&&!out.rib2.inc&&out.rib2.pill==='J-20 · à renouveler'&&out.pair.lab==='Attestation d\'assurance RC et décennale'&&out.pair.inc&&/un seul document pour la RC et la décennale/.test(out.pair.sub)&&!out.dec.k&&!O1.some(x=>x.k==='e:assurance_decennale');
await page.evaluate(()=>{const s=document.getElementById('dob-offre');if(s)s.scrollIntoView();});await shot('pc_06_offre_documents');
await click('obinc|e:'+ids[0]);O1=await offre();const inc2=(O1.find(x=>x.k==='e:'+ids[0])||{}).inc;
let Zr=await zipClick();const ent=Zr.names.filter(n=>/^02_Entreprise\//.test(n));const bord=strFromU8(Zr.Z['00_Bordereau_des_pieces.html']||new Uint8Array());const zpdf=Zr.names.find(n=>/Memoire_technique_O2610-91\.pdf$/.test(n));
let TZ='';if(zpdf){const f=path.join(TMP,'zip_memoire.pdf');fs.writeFileSync(f,Zr.Z[zpdf]);TZ=flat(txtPdf(f));}
out={inc2,dlg:Zr.dlg.slice(0,120),ent,ribA:ent.find(n=>/RIB_Banque_fictive_A\.pdf$/.test(n)),ribB:ent.find(n=>/RIB_Banque_fictive_B\.pdf$/.test(n)),ins:ent.filter(n=>/ssurance/.test(n)),bordPair:(bord.match(/Attestation d(&#39;|')assurance RC et décennale/g)||[]).length,bordDec:/Assurance décennale/.test(bord),
  zpdf,zHoles:/COMPLÉTER/.test(TZ),zGone:/Bloc tout à trous|Section toute à trous/.test(TZ),zKeep:TZ.includes('Conclusion fictive sans trou.'),memRetires:Zr.last.memRetires,toast:Zr.toasts.find(t=>/📦/.test(t))||''};
if(out.ribA)out.ribAok=strFromU8(Zr.Z[out.ribA]).includes('rib-banque-a-fictif');if(out.ribB)out.ribBok=strFromU8(Zr.Z[out.ribB]).includes('rib-banque-b-fictif');if(out.ins[0])out.insOk=strFromU8(Zr.Z[out.ins[0]]).includes('attestation-rc-dec-fictive-2027');
console.log('9) dossier de remise :',JSON.stringify(out));
C.c11=inc2&&/Il reste 6 trous dans 5 paragraphes/.test(out.dlg)&&!!out.ribA&&!!out.ribB&&out.ribAok&&out.ribBok&&out.ins.length===1&&/Attestation_d_assurance_RC_et_decennale\.pdf$/.test(out.ins[0])&&out.insOk&&out.bordPair===1&&!out.bordDec
  &&!!zpdf&&!out.zHoles&&!out.zGone&&out.zKeep&&out.memRetires===5&&/mémoire : 5 paragraphes à trous retirés/.test(out.toast);
// « Compléter d'abord » depuis 7 · Offre : ferme et ouvre « 📝 Tout compléter »
await click('obzip|');await wait(300);const dz=await modal();await page.evaluate(()=>document.getElementById('mx-fill').click());await wait(500);const all=await page.evaluate(()=>({all:!!document.getElementById('m2-all'),h:(document.querySelector('#modal h3')||{}).textContent||''}));
await page.evaluate(()=>{const b=document.querySelector('#modal [data-close]');if(b)b.click();});await wait(200);
C.c12=/Si tu fais le dossier de remise quand même, ces 5 paragraphes seront RETIRÉS du mémoire/.test(dz)&&all.all&&/Tout compléter/.test(all.h);

// ══ 6) DÉCOCHER : les deux attestations redeviennent indépendantes (la décennale garde son fichier) ; l'offre a de nouveau deux lignes ; un remplacement de la RC ne touche plus la décennale
await goEnt();await click('dob|edit|assurance_decennale','x');await fillEnt({both:false});
dc=await reg('assurance_decennale');let v3=await view();M=byId(v3);
await click('dob|edit|assurance_rc','x');await fillEnt({file:'attestation-rc-seule-fictive.pdf',valid:plus(200),both:false});
rc=await reg('assurance_rc');const dc2=await reg('assurance_decennale');let v4=await view();
await page.evaluate(n=>{const AS=window.TRACE.affaires.state();AS.cur=n;AS.view='fiche';AS.tab='offre';document.getElementById('htCom').click();},NUM);await wait(500);if(!(await page.$('#dob-offre')))await click('tab|offre');
const O2=await offre();
out={dc:{same:dc.same||null,file:dc.file},rowDc:{k:M.assurance_decennale.k,pill:M.assurance_decennale.pill,st:M.assurance_decennale.st},kpis3:v3.kpis,rc:rc.file,dc2:{file:dc2.file,same:dc2.same||null,valid:dc2.validUntil},offre:O2.filter(x=>/assurance/.test(x.k)).map(x=>x.k+'='+x.lab)};
console.log('10) décoché → indépendantes :',JSON.stringify(out));
C.c13=!out.dc.same&&out.dc.file==='attestation-rc-dec-fictive-2027.pdf'&&out.rowDc.k==='ok'&&/^encore \d+ j$/.test(out.rowDc.pill)&&out.kpis3==='3 valides|1 à renouveler (≤ 30 j)|0 expirés|4 à déposer'
  &&out.rc==='attestation-rc-seule-fictive.pdf'&&out.dc2.file==='attestation-rc-dec-fictive-2027.pdf'&&!out.dc2.same&&out.dc2.valid===plus(300)&&out.offre.join('|')==='e:assurance_rc=Assurance RC|e:assurance_decennale=Assurance décennale';

// ══ 6 bis) VERSION CONSULTÉE (lecture seule, affWithVirtual) : ⬇ PDF du mémoire de la v1 → la fenêtre des trous → PDF sans ces paragraphes
await click('tab|chiffrage');await click('vnew|');await page.evaluate(()=>{const n=document.getElementById('vv-note');if(n)n.value='Négociation fictive';const b=document.getElementById('vv-ok');if(b)b.click();});await wait(600);
await click('vview|1');await click('tab|memoire');await wait(500);
const band=await page.evaluate(()=>!!document.querySelector('#eq-app .vv-band'));
let E6=await exportVia('#eq-app .memoire-head [data-v="mpdf|"]');const F6=path.join(TMP,'version1.pdf');await E6.r.saveAs(F6);await wait(400);const T6=flat(txtPdf(F6));const t6=await toasts();
out={v:await page.evaluate(n=>window.TRACE.affaires.get(n).chiffrageV,NUM),band,had:E6.had,name:E6.r.suggestedFilename(),holes:/COMPLÉTER/.test(T6),gone:/Bloc tout à trous|Section toute à trous/.test(T6),keep:T6.includes('Conclusion fictive sans trou.'),toast:t6.find(t=>/⬇ Mémoire PDF/.test(t))||''};
await click('vexit|');
console.log('10 bis) version consultée :',JSON.stringify(out));
C.c17=out.v===2&&out.band&&out.had&&out.name==='Memoire_technique_'+NUM+'.pdf'&&!out.holes&&!out.gone&&out.keep&&/5 paragraphes à trous retirés/.test(out.toast);

// ══ 7) SANS TROU : pas de fenêtre, le PDF part directement (et le message ne parle pas de paragraphes retirés)
await page.evaluate(([n,fill,chef])=>{const T=window.TRACE;const a=T.affaires.get(n);const M=Object.assign({},a.memoire||{});const lib=Object.assign({sel:{},fill:{},edits:{}},M.lib||{});lib.fill=Object.assign({},lib.fill||{},fill);lib.inter=Object.assign({},lib.inter||{},{chef});M.lib=lib;M.mode='lib';T.affaires.set(n,{memoire:M});},[NUM,AM_FILL,{id:'loc:charles.c',name:'Charles Chantier'}]);
await click('tab|memoire');await wait(500);const tile0=await page.evaluate(()=>(document.getElementById('memoire-nholes')||{}).textContent||'');
let E5=await exportVia('#eq-app .memoire-head [data-v="mpdf|"]');const F5=path.join(TMP,'complet.pdf');await E5.r.saveAs(F5);await wait(400);const T5=flat(txtPdf(F5));const t5=await toasts();
out={tile0,had:E5.had,keep:['NUM-FICTIF-7','VAL-FICTIVE-1','VAR-FICTIVE-3','DONNEE-FICTIVE-4','Bloc tout à trous','Section toute à trous','CHANTIER Charles'].filter(s=>!T5.includes(s)),holes:/COMPLÉTER/.test(T5),toast:t5.find(t=>/⬇ Mémoire PDF/.test(t))||''};
console.log('11) sans trou :',JSON.stringify(out));
C.c14=/aucun trou/.test(tile0)&&!out.had&&out.keep.length===0&&!out.holes&&/^⬇ Mémoire PDF : \d+ pages?$/.test(out.toast);
await ctx.close();

// ══ 8) TÉLÉPHONE 390 px : documents (deux RIB, paire RC + décennale), fenêtre de dépôt, offre, fenêtre des trous — rien ne déborde, boutons ≥ 34 px (40 px pour le principal)
({ctx,page}=await open({viewport:{width:390,height:844},isMobile:true,hasTouch:true,deviceScaleFactor:2}));
const fit=sel=>page.evaluate(sel=>{const W=document.documentElement.clientWidth;const over=[];document.querySelectorAll(sel).forEach(el=>{[el,...el.querySelectorAll('*')].forEach(x=>{const r=x.getBoundingClientRect();if(r.width&&(r.right>W+0.5||r.left<-0.5))over.push((x.className||x.tagName)+':'+Math.round(r.left)+'→'+Math.round(r.right));});});
  const small=[...document.querySelectorAll(sel)].flatMap(el=>[...el.querySelectorAll('button,a.btn')]).filter(b=>b.offsetParent&&b.getBoundingClientRect().height<34).map(b=>b.textContent.trim()+':'+Math.round(b.getBoundingClientRect().height));
  return {W,sw:document.documentElement.scrollWidth,over:over.slice(0,6),small:small.slice(0,8)};},sel);
const ENT2={rib:{id:'rib',data:{type:'rib',title:'RIB',libelle:'Banque fictive au nom très long pour tester le retour à la ligne',file:'rib-a.pdf',data:'data:application/pdf;base64,'+pdf('rib a').toString('base64'),at:new Date().toISOString(),by:'Test'},updated_at:new Date().toISOString()},
  rib_b_test:{id:'rib_b_test',data:{type:'rib',title:'RIB',libelle:'Banque fictive B',file:'rib-b.pdf',data:'data:application/pdf;base64,'+pdf('rib b').toString('base64'),validUntil:plus(12),cree:new Date().toISOString(),at:new Date().toISOString(),by:'Test'},updated_at:new Date().toISOString()},
  assurance_rc:{id:'assurance_rc',data:{type:'assurance_rc',title:'Attestation d\'assurance responsabilité civile',file:'rc-dec.pdf',data:'data:application/pdf;base64,'+pdf('rc dec').toString('base64'),validUntil:plus(90),assureur:'Assureur fictif',police:'POL-FICT-9',at:new Date().toISOString(),by:'Test'},updated_at:new Date().toISOString()},
  assurance_decennale:{id:'assurance_decennale',data:{type:'assurance_decennale',title:'Attestation d\'assurance décennale',same:'assurance_rc',file:'rc-dec.pdf',data:'data:application/pdf;base64,'+pdf('rc dec').toString('base64'),validUntil:plus(90),assureur:'Assureur fictif',police:'POL-FICT-9',at:new Date().toISOString(),by:'Test'},updated_at:new Date().toISOString()}};
await page.evaluate(ent=>new Promise((res,rej)=>{const r=indexedDB.open('trace-kv',1);r.onerror=()=>rej(r.error);r.onsuccess=()=>{const db=r.result;const t=db.transaction('kv','readwrite');t.objectStore('kv').put(ent,'trace:reg:entdoc');t.oncomplete=()=>{db.close();res();};t.onerror=()=>rej(t.error);};}),ENT2);
await page.reload();await wait(1200);{const s=await page.$('#loginSkip');if(s&&await s.isVisible())await s.click();await wait(600);}await page.evaluate(async()=>{const T=window.TRACE;T.state.userId='ethan';T.renderHome();await T.acces.list();});await wait(300);
await goEnt();out={ent:await fit('#eq-app .dob-erow, #eq-app .ec-head, #eq-app .eq-kpis, #eq-app .eq-acts'),rows:(await view()).rows.map(r=>r.id+':'+r.k)};await shot('tel_01_documents',true);
await click('dob|edit|assurance_rc','x');out.modal=await page.evaluate(()=>{const W=document.documentElement.clientWidth;const b=document.querySelector('#modal .am-both');const r=b?b.getBoundingClientRect():null;const i=document.getElementById('ed-both').getBoundingClientRect();return {W,in:r&&r.left>=0&&r.right<=W+0.5,h:r&&Math.round(r.height),ih:Math.round(i.height)};});await shot('tel_02_fenetre_rc');await page.evaluate(()=>document.querySelector('#modal [data-close]').click());await wait(200);
await page.evaluate(()=>{document.getElementById('htCom').click();});await wait(300);
await click('new|');await page.evaluate(n=>{const s=(id,v)=>{const e=document.getElementById(id);if(e)e.value=v;};s('afn-num',n);s('afn-nom','Réseau fictif AM tel');s('afn-client','CLIENT-FICTIF');s('afn-ville','Villefictive');s('afn-sect','ouest');s('afn-etat','devis');},'O2610-92');await click('create|');
await page.evaluate(n=>window.TRACE.affaires.set(n,{charge:'Alain Chargé'}),'O2610-92');await click('tab|offre');await wait(500);
out.offre=await fit('#dob-offre .dob-row');out.offreRows=await page.evaluate(()=>[...document.querySelectorAll('#dob-offre .dob-row[data-key^="e:"]')].map(r=>r.dataset.key));await page.evaluate(()=>{const s=document.getElementById('dob-offre');if(s)s.scrollIntoView();});await shot('tel_03_offre');
await click('tab|memoire');await wait(500);await page.evaluate(()=>document.querySelector('#eq-app .memoire-head [data-v="mpdf|"]').click());await wait(400);
out.dlg=await page.evaluate(()=>{const W=document.documentElement.clientWidth;const box=document.querySelector('#modal .box');const r=box?box.getBoundingClientRect():null;const bs=[...document.querySelectorAll('#modal .actions button')].map(b=>Math.round(b.getBoundingClientRect().height));const over=[...document.querySelectorAll('#modal *')].filter(x=>{const q=x.getBoundingClientRect();return q.width&&(q.right>W+0.5||q.left<-0.5);}).length;
  return {W,box:r&&r.left>=0&&r.right<=W+0.5,bs,over,li:document.querySelectorAll('#mx-list li').length,sw:document.documentElement.scrollWidth};});await shot('tel_04_fenetre_trous');
console.log('12) téléphone 390 px :',JSON.stringify(out));
C.c15=out.ent.W===390&&out.ent.sw<=390&&!out.ent.over.length&&!out.ent.small.length&&out.rows.includes('rib_b_test:soon')&&out.rows.includes('assurance_decennale:same')&&out.modal.in&&out.modal.h>=44
  &&out.offre.sw<=390&&!out.offre.over.length&&!out.offre.small.length&&out.offreRows.includes('e:rib')&&out.offreRows.includes('e:rib_b_test')&&!out.offreRows.includes('e:assurance_decennale')
  &&out.dlg.box&&out.dlg.over===0&&out.dlg.bs.length===2&&out.dlg.bs.every(h=>h>=40)&&out.dlg.li===5&&out.dlg.sw<=390;
await ctx.close();
// ══ 9) zéro erreur console
C.c16=logs.length===0;
const bad=Object.entries(C).filter(([k,v])=>!v).map(([k])=>k);console.log(logs.length?logs:'[]');console.log(bad.length?'RESULTAT: ECHEC '+bad.join(','):'RESULTAT: TOUT VERT');
await browser.close();try{fs.rmSync(TMP,{recursive:true,force:true});}catch(e){}
