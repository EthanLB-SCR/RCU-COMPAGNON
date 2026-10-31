// e2e_dx_3110.mjs — 31/10 (lot DX) : Dossier du chantier V1 (pièces obligatoires, Drive) + plans d'exé (import, planches, indices, zones, raccourci du soudeur, hors connexion).
// Données 100 % fictives (chantier « Chantier fictif DX », PDF fabriqués ici : une couleur par page pour vérifier qu'on ouvre la BONNE page).
//  c1  Dossier V1 (Ethan) : 8 pièces obligatoires « ✗ manquante », compteur 0/8 (onglet + en tête du chantier « 🗂 0/8 » + Bureau), pli « Autres documents » fermé (ancien dépôt dedans)
//  c2  « 📎 Déposer » sur PPSPS → ✓ présente (nom, date, qui), compteur 1/8 partout ; l'ancien dépôt par catégorie (pli) marche toujours
//  c3  DT / DICT déposée → fiche ouverte (échéance) ; échéance passée → ⚠ à mettre à jour (hors compteur) ; dans 60 j → ✓ ; voirie « sans objet » → 2/7 ; signalée « à mettre à jour »
//  c4  Drive : « javascript: » et « ftp: » refusés, https accepté → « 📁 Ouvrir le Drive du chantier » (nouvel onglet, noopener)
//  c5  import d'un PDF fictif de 3 pages → 3 planches (n° 1-3, ind. A, date, page 1-3), fichier classé au Dossier (Plans d'exécution) ; pièce « Plans d'exécution » ✓ 3 planches
//  c6  planche ↔ zone : planche 1 → L1 PK 0→100, planche 2 → L2, planche 3 → L1 PK 100→200 ; calque « Plans d'exé » éteint par défaut, allumé : 3 cadres + n°
//  c7  nouvel indice : planche 2 (⋯ → ⬆ Nouvel indice) → B ; import « même n° » → planche 3 ind. B ; historique « remplacé par l'indice B du … » ; persistance après rechargement
//  c8  raccourci du soudeur (Karim) : fiche d'une soudure de L2 → « 📄 Plan d'exé · planche 2 · ind. B » (+ « nouvel indice ») → la BONNE page (couleur) ; L1 PK 150 → planche 3 ;
//      ancien indice ouvert depuis l'historique → bandeau « remplacé » + page 3 du premier PDF
//  c9  « 📄 Mes plans » sur le plan au téléphone 390 ET 360 : 1 toucher, planche de la zone de la dernière soudure de Karim en premier, boutons ≥ 44 px, aucun débordement
//  c10 droits : Karim (soudeur) lit (ouvre une pièce, le Drive, les planches) mais ne dépose rien (pas de Déposer, pas de champ Drive, pas d'import, pas de ⋯ de gestion)
//  c11 hors connexion : planche au stockage (URL) ouverte une fois → relue hors réseau depuis l'appareil ; jamais ouverte → « plan non disponible hors connexion » ; cache borné
//  c12 paliers allumés, Ethan Socle : plans d'exé cachés (section, fiche soudure, Mes plans, calque) ; le Dossier V1 reste (option « dossier », Socle) ; éteints : tout revient
//  c13 console propre ; aucune page ne déborde (390 / 360)
import { chromium } from 'playwright';import fs from 'fs';
const BASE=process.env.BASE||'http://localhost:8765';const SHOTS=process.env.SHOTS||'';
const browser=await chromium.launch({headless:true, executablePath: process.env.CHROMIUM_PATH||undefined});
const ctx=await browser.newContext({viewport:{width:1366,height:860},deviceScaleFactor:1});const page=await ctx.newPage();
const logs=[];page.on('pageerror',e=>logs.push('PAGEERROR: '+e.message.slice(0,300)));page.on('console',m=>{if(m.type()==='error'&&!/supabase|Failed to fetch|net::ERR|404|WebSocket|geopf|open-meteo/i.test(m.text()))logs.push(m.text().slice(0,200));});
page.on('dialog',d=>d.accept().catch(()=>{}));
await page.route(u=>/(^|\.)geopf\.fr$|^geo\.api\.gouv\.fr$|open-meteo\.com$/.test(u.hostname),route=>route.fulfill({status:200,contentType:'application/json',body:'[]'}));
const C={};const J=x=>JSON.stringify(x);const wait=ms=>page.waitForTimeout(ms);
const waitFor=async(fn,ms=20000)=>{const t0=Date.now();while(Date.now()-t0<ms){try{if(await page.evaluate(fn))return true;}catch(e){}await wait(250);}return false;};const isMine=()=>!!(window.TRACE&&window.TRACE.net&&window.TRACE.net.name==='Chantier fictif DX'&&window.TRACE.lines&&window.TRACE.lines.L2);
const shot=async n=>{if(!SHOTS)return;try{fs.mkdirSync(SHOTS,{recursive:true});await page.screenshot({path:`${SHOTS}/${n}.png`});}catch(e){console.log('shot',n,e.message);}};
/* ── PDF fictif : une page = un aplat de couleur + cadre + « PLANCHE n » ── */
function makePdf(pages){const O=[];const kids=[];O[0]='<< /Type /Catalog /Pages 2 0 R >>';O[2]='<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica >>';
  pages.forEach((p,i)=>{const pn=4+i*2,cn=5+i*2;kids.push(pn+' 0 R');const s=`q ${p.rgb.join(' ')} rg 40 40 762 515 re f Q\nq 0 0 0 RG 6 w 20 20 802 555 re S Q\nBT /F1 64 Tf 1 1 1 rg 210 270 Td (${p.label}) Tj ET\n`;
    O[pn-1]=`<< /Type /Page /Parent 2 0 R /MediaBox [0 0 842 595] /Contents ${cn} 0 R /Resources << /Font << /F1 3 0 R >> >> >>`;O[cn-1]=`<< /Length ${Buffer.byteLength(s,'latin1')} >>\nstream\n${s}endstream`;});
  O[1]=`<< /Type /Pages /Kids [${kids.join(' ')}] /Count ${pages.length} >>`;let out='%PDF-1.4\n';const off=[];O.forEach((o,i)=>{off[i]=Buffer.byteLength(out,'latin1');out+=`${i+1} 0 obj\n${o}\nendobj\n`;});
  const x=Buffer.byteLength(out,'latin1');out+=`xref\n0 ${O.length+1}\n0000000000 65535 f \n`+off.map(o=>String(o).padStart(10,'0')+' 00000 n \n').join('')+`trailer\n<< /Size ${O.length+1} /Root 1 0 R >>\nstartxref\n${x}\n%%EOF\n`;return Buffer.from(out,'latin1');}
const COL={rouge:[.85,.15,.15],vert:[.15,.65,.25],bleu:[.15,.3,.85],orange:[.95,.55,.1],violet:[.55,.2,.75],cyan:[.1,.7,.8]};
const near=c=>{if(!c)return null;let best=null,bd=1e9;for(const [k,v] of Object.entries(COL)){const d=Math.hypot(c.r-v[0]*255,c.g-v[1]*255,c.b-v[2]*255);if(d<bd){bd=d;best=k;}}return bd<60?best:'?';};
const PDF3=makePdf([{rgb:COL.rouge,label:'PLANCHE 1'},{rgb:COL.vert,label:'PLANCHE 2'},{rgb:COL.bleu,label:'PLANCHE 3'}]);
const PDF_B2=makePdf([{rgb:COL.orange,label:'PLANCHE 2 IND B'}]),PDF_B3=makePdf([{rgb:COL.violet,label:'PLANCHE 3 IND B'}]),PDF_URL=makePdf([{rgb:COL.cyan,label:'PLANCHE 9'}]);
const PDF_DOC=makePdf([{rgb:[.9,.9,.9],label:'DOCUMENT FICTIF'}]);
const file=(name,buf,mime)=>({name,mimeType:mime||'application/pdf',buffer:buf});
let urlHits=0,OFF=false;await page.route(u=>u.pathname.startsWith('/__dx/'),route=>{if(OFF)return route.abort('internetdisconnected');const p=new URL(route.request().url()).pathname;if(p==='/__dx/planche9.pdf'){urlHits++;return route.fulfill({status:200,contentType:'application/pdf',body:PDF_URL});}return route.fulfill({status:200,contentType:'application/pdf',body:PDF_DOC});});
const imgColor=()=>page.evaluate(async()=>{const im=document.getElementById('pxv-img');if(!im)return null;try{await im.decode();}catch(e){}const c=document.createElement('canvas');c.width=60;c.height=40;const x=c.getContext('2d');x.drawImage(im,0,0,60,40);const d=x.getImageData(30,12,1,1).data;return {r:d[0],g:d[1],b:d[2],page:im.dataset.page,cache:im.dataset.cache,w:im.naturalWidth};});
const waitImg=async(ms=15000)=>{const t0=Date.now();while(Date.now()-t0<ms){const s=await page.evaluate(()=>{const b=document.getElementById('pxv-body');if(!b)return 'none';if(document.getElementById('pxv-img'))return 'img';if(b.querySelector('[data-err]'))return 'err';return 'wait';});if(s!=='wait')return s;await wait(150);}return 'timeout';};
const closeModal=()=>page.evaluate(()=>{const m=document.getElementById('modal');const b=m&&m.querySelector('[data-close]');if(b)b.click();});
const toast=()=>page.evaluate(()=>(document.getElementById('toast')||{}).textContent||'');
const tab=t=>page.evaluate(t=>{const T=window.TRACE;T.state.tab=t;T.renderAll();},t).then(()=>wait(300));
const asUser=id=>page.evaluate(id=>{const s=document.getElementById('roleSel');s.value=id;s.dispatchEvent(new Event('change',{bubbles:true}));},id).then(()=>wait(350));
const rows=()=>page.evaluate(()=>[...document.querySelectorAll('#admin .dx-p')].map(r=>({k:r.dataset.dxk,cls:[...r.classList].filter(c=>['ok','warn','bad','na'].includes(c)).join(),t:r.querySelector('.tx small').textContent})));
const counter=()=>page.evaluate(()=>{const n=document.querySelector('#admin .dx-n');return n?n.textContent.replace(/\s+/g,''):'';});
const iso=d=>d.getFullYear()+'-'+String(d.getMonth()+1).padStart(2,'0')+'-'+String(d.getDate()).padStart(2,'0');const dd=n=>{const d=new Date();d.setDate(d.getDate()+n);return iso(d);};
const today=iso(new Date());const todayFR=today.slice(8,10)+'/'+today.slice(5,7)+'/'+today.slice(0,4);
const noOverflow=()=>page.evaluate(()=>{const m=document.querySelector('#modal.show .box');return {doc:document.documentElement.scrollWidth<=window.innerWidth+1,modal:!m||m.scrollWidth<=m.clientWidth+1,w:window.innerWidth};});

/* ── chantier fictif : L1 (200 m) + antenne L2 (100 m) tracées au traceur ── */
await page.goto(BASE+'/traceur.html');await wait(600);await page.evaluate(()=>{localStorage.clear();});await page.evaluate(()=>new Promise(r=>{try{const q=indexedDB.deleteDatabase('trace-kv');q.onsuccess=q.onerror=q.onblocked=()=>r();}catch(e){r();}}));
await page.reload();await wait(600);
await page.evaluate(()=>{const S=window.MAQ.state;S.supplier='AXIOM';S.lines=[{id:'L1',name:'Feeder',dn:100,bar:12,pts:[[10,50],[210,50]],specials:[],parent:null},{id:'L2',name:'Antenne école',dn:65,bar:12,pts:[[110,50],[110,150]],specials:[],parent:'L1'}];S.seq=3;window.MAQ.setMode('select');window.MAQ.rebuild();});
await page.click('#bSave');await wait(200);await page.fill('#svName','Chantier fictif DX');await page.click('#svOk');await wait(800);await page.click('#svGo');await wait(1500);
if(!await waitFor(isMine)){console.log('RESULTAT: ÉCHEC — le chantier fictif ne s\'est pas ouvert');await browser.close();process.exit(1);}
const sid=await page.evaluate(()=>window.TRACE.state.siteId);
const reopen=async()=>{await waitFor(()=>!!(window.TRACE&&window.TRACE.go));await page.evaluate(id=>window.TRACE.go(id),sid);if(!await waitFor(isMine)){console.log('RESULTAT: ÉCHEC — chantier fictif non rouvert');await browser.close();process.exit(1);}await wait(500);};
await page.goto(BASE+'/index.html?pdfjs=/pdfjs/');await wait(1200);await reopen();await asUser('ethan');
await page.evaluate(()=>{try{localStorage.setItem('trace:wide','1');}catch(e){}document.getElementById('app').classList.add('wide');});

/* ── c1 : Dossier V1 vide ── */
await tab('admin');
let o={rows:await rows(),counter:await counter(),head:await page.evaluate(()=>(document.getElementById('shDoss')||{}).textContent||''),
  fold:await page.evaluate(()=>({btn:!!document.getElementById('dx-fold'),hidden:document.getElementById('dx-others').hidden,cat:!!document.getElementById('adm-cat'),qse:/Émargements QSE/.test(document.getElementById('dx-others').textContent),bl:/Bons de livraison/.test(document.getElementById('dx-others').textContent)})),
  title:await page.evaluate(()=>document.querySelector('#admin h2').textContent),px:await page.evaluate(()=>!!document.getElementById('px-sec')),deps:await page.evaluate(()=>document.querySelectorAll('#admin [data-dxdep]').length)};
await tab('bureau');o.bureau=await page.evaluate(()=>{const b=document.querySelector('#bureau .dx-stat');const coince=[...document.querySelectorAll('#bureau .ac-notif')].map(x=>x.textContent).find(t=>/Dossier administratif/.test(t))||'';return {stat:b?b.textContent:'',coince:coince.slice(0,160)};});
await shot('pc_0_bureau');await tab('admin');await shot('pc_1_dossier_vide');
console.log('c1) Dossier V1 vide :',J(o));
C.c1=o.rows.length===8&&o.rows.every(r=>r.cls==='bad'&&/manquante/.test(r.t))&&o.rows.map(r=>r.k).join()==='dt,ppsps,pgc,exe,planning,qualif,habil,voirie'&&o.counter==='0/8'&&/🗂 0\/8/.test(o.head)&&o.fold.btn&&o.fold.hidden&&o.fold.cat&&o.fold.qse&&o.fold.bl&&/Dossier du chantier/.test(o.title)&&o.px&&o.deps===8&&/0\/8/.test(o.bureau.stat);

/* ── c2 : déposer le PPSPS depuis sa ligne ; l'ancien dépôt par catégorie marche toujours ── */
await page.setInputFiles('#admin [data-dxdep="ppsps"]',file('ppsps_fictif.pdf',PDF_DOC));await wait(900);
o={rows:await rows(),counter:await counter(),head:await page.evaluate(()=>(document.getElementById('shDoss')||{}).textContent||''),toast:await toast()};
const pp=o.rows.find(r=>r.k==='ppsps');
await page.evaluate(()=>document.getElementById('dx-fold').click());await wait(150);
await page.evaluate(()=>{document.getElementById('adm-cat').value='bl';});await page.setInputFiles('#adm-file',file('bl_fictif.pdf',PDF_DOC));await wait(900);
o.old=await page.evaluate(()=>{const d=[...document.querySelectorAll('#dx-others details')].find(x=>/Bons de livraison/.test(x.querySelector('summary').textContent));return {open:!!(d&&d.open),txt:d?d.textContent:'',foldOpen:!document.getElementById('dx-others').hidden,n:window.TRACE.net.admin.docs.length};});
await page.evaluate(()=>{const x=document.getElementById('dx-fold');const v=x&&x.closest('.view');if(v)v.scrollTop=Math.max(0,x.getBoundingClientRect().top-v.getBoundingClientRect().top+v.scrollTop-8);});await wait(150);await shot('pc_1b_autres_documents');
console.log('c2) dépôt PPSPS + ancien dépôt :',J({pp,counter:o.counter,head:o.head,toast:o.toast,old:o.old}));
C.c2=pp&&pp.cls==='ok'&&/✓ présente/.test(pp.t)&&/ppsps_fictif\.pdf/.test(pp.t)&&pp.t.includes(todayFR)&&/Ethan L\./.test(pp.t)&&o.counter==='1/8'&&/1\/8/.test(o.head)&&o.old.open&&/bl_fictif\.pdf/.test(o.old.txt)&&o.old.foldOpen&&o.old.n===2;

/* ── c3 : DT / DICT + échéance ; voirie sans objet ; « à mettre à jour » ── */
await page.setInputFiles('#admin [data-dxdep="dt"]',file('dict_fictive.pdf',PDF_DOC));await wait(900);
o={modal:await page.evaluate(()=>({open:document.getElementById('modal').classList.contains('show'),until:!!document.getElementById('dxp-until'),txt:document.getElementById('modal').textContent}))};
await page.evaluate(v=>{document.getElementById('dxp-until').value=v;document.getElementById('dxp-until-ok').click();},dd(-3));await wait(400);
o.late=(await rows()).find(r=>r.k==='dt');o.cLate=await counter();
await page.evaluate(v=>{document.getElementById('dxp-until').value=v;document.getElementById('dxp-until-ok').click();},dd(60));await wait(400);
o.ok=(await rows()).find(r=>r.k==='dt');
await page.evaluate(v=>{document.getElementById('dxp-until').value=v;document.getElementById('dxp-until-ok').click();},dd(10));await wait(400);
o.soon=(await rows()).find(r=>r.k==='dt');o.cSoon=await counter();await closeModal();await wait(150);
await page.evaluate(()=>document.querySelector('#admin [data-dxman="voirie"]').click());await wait(250);
await page.evaluate(()=>{const c=document.getElementById('dxp-na');c.checked=true;c.dispatchEvent(new Event('change'));});await wait(350);
o.na=(await rows()).find(r=>r.k==='voirie');o.cNa=await counter();await closeModal();await wait(150);
await page.evaluate(()=>document.querySelector('#admin [data-dxman="ppsps"]').click());await wait(250);await page.evaluate(()=>document.getElementById('dxp-flag').click());await wait(350);
o.flag=(await rows()).find(r=>r.k==='ppsps');o.cFlag=await counter();await page.evaluate(()=>document.getElementById('dxp-unflag').click());await wait(350);o.unflag=(await rows()).find(r=>r.k==='ppsps');await closeModal();await wait(150);
await tab('bureau');o.bureau=await page.evaluate(()=>{const b=document.querySelector('#bureau .dx-stat');const t=[...document.querySelectorAll('#bureau .ac-notif,#bureau .ac-kt')].map(x=>x.textContent).find(t=>/Dossier/.test(t))||'';return {stat:b?b.textContent:'',dash:t.slice(0,200)};});await tab('admin');
await page.evaluate(()=>document.querySelector('#admin [data-dxman="dt"]').click());await wait(250);await page.setInputFiles('#dxp-file',file('dict_fictive_v2.pdf',PDF_DOC));await wait(900);
o.v2=await page.evaluate(()=>({vers:[...document.querySelectorAll('#modal .dx-vers tr')].map(t=>t.textContent.replace(/\s+/g,' ').trim().slice(0,60))}));await closeModal();await wait(150);o.v2.row=(await rows()).find(r=>r.k==='dt');
console.log('c3) échéance / sans objet / à mettre à jour :',J(o));
C.c3=o.modal.open&&o.modal.until&&/date de fin de validité/.test(o.modal.txt)&&o.late.cls==='bad'&&/échéance dépassée/.test(o.late.t)&&o.cLate==='1/8'&&o.ok.cls==='ok'&&/valable jusqu’au/.test(o.ok.t)&&o.soon.cls==='warn'&&/J-10/.test(o.soon.t)&&o.cSoon==='2/8'
  &&o.na.cls==='na'&&/sans objet/.test(o.na.t)&&o.cNa==='2/7'&&o.flag.cls==='warn'&&/à mettre à jour \(signalé par Ethan L\./.test(o.flag.t)&&o.cFlag==='1/7'&&o.unflag.cls==='ok'&&/2\/7/.test(o.bureau.stat)&&/2 \/ 7 pièces obligatoires/.test(o.bureau.dash)&&o.v2.vers.length===2&&/^dict_fictive_v2\.pdf en cours/.test(o.v2.vers[0])&&o.v2.row.cls==='ok'&&/dict_fictive_v2\.pdf/.test(o.v2.row.t);

/* ── c4 : Drive ── */
const driveTry=async v=>{await page.fill('#dx-drive-in',v);await page.click('#dx-drive-ok');await wait(300);return {toast:await toast(),open:await page.evaluate(()=>!!document.getElementById('dx-drive-open'))};};
o={js:await driveTry('javascript:alert(1)'),ftp:await driveTry('ftp://serveur.exemple/dossier')};
o.ok=await driveTry('https://drive.exemple.fr/dossiers/chantier-fictif-dx');
o.link=await page.evaluate(()=>{const a=document.getElementById('dx-drive-open');return a?{href:a.getAttribute('href'),target:a.target,rel:a.rel,txt:a.textContent}:null;});o.saved=await page.evaluate(()=>window.TRACE.net.admin.drive&&window.TRACE.net.admin.drive.url);
console.log('c4) Drive :',J(o));
C.c4=/Lien refusé/.test(o.js.toast)&&!o.js.open&&/Lien refusé/.test(o.ftp.toast)&&!o.ftp.open&&o.ok.open&&o.link&&o.link.href==='https://drive.exemple.fr/dossiers/chantier-fictif-dx'&&o.link.target==='_blank'&&/noopener/.test(o.link.rel)&&/Ouvrir le Drive du chantier/.test(o.link.txt)&&o.saved===o.link.href;

/* ── c5 : import d'un PDF de 3 pages ── */
await page.setInputFiles('#px-imp',file('plans_exe_fictifs.pdf',PDF3));
await page.waitForSelector('#modal .pxImpR',{timeout:15000}).catch(()=>{});await wait(200);
o={imp:await page.evaluate(()=>[...document.querySelectorAll('#modal .pxImpR')].map(r=>({no:r.querySelector('.no').value,i:r.querySelector('.in').value,st:r.querySelector('.st').textContent})))};
await page.evaluate(()=>{const T=['Rue fictive A — PK 0 à 100','Antenne école','Rue fictive A — PK 100 à 200'];[...document.querySelectorAll('#modal .pxImpR .ti')].forEach((x,k)=>{x.value=T[k];});});
await shot('pc_2_import');
await page.evaluate(()=>document.getElementById('pxi-ok').click());await wait(1500);
o.list=await page.evaluate(()=>window.TRACE.dx.list());o.doc=await page.evaluate(()=>{const d=window.TRACE.net.admin.docs.filter(x=>x.cat==='exe');return d.map(x=>({name:x.name,pl:x.pl,pages:x.pages,data:!!x.data}));});
o.exe=(await rows()).find(r=>r.k==='exe');o.sec=await page.evaluate(()=>document.querySelectorAll('#admin .pxRow').length);o.warn=await page.evaluate(()=>/3 planches sans zone/.test(document.getElementById('admin').textContent));
console.log('c5) import 3 pages :',J(o));
C.c5=o.imp.length===3&&o.imp.map(r=>r.no).join()==='1,2,3'&&o.imp.every(r=>r.i==='A'&&/nouvelle planche/.test(r.st))&&o.list.length===3&&o.list.map(p=>p.no+':'+p.cur+':'+p.page).join()==='1:A:1,2:A:2,3:A:3'&&o.list[1].title==='Antenne école'
  &&o.doc.length===1&&o.doc[0].pl&&o.doc[0].pages===3&&o.exe.cls==='ok'&&/3 planches · dernier indice A/.test(o.exe.t)&&o.sec===3&&o.warn;

/* ── c6 : zones (au doigt : cases + PK) et calque ── */
const setZone=async(no,lines)=>{const id=await page.evaluate(no=>window.TRACE.dx.list().find(p=>p.no===no).id,no);await page.evaluate(id=>document.querySelector(`#admin [data-pxman="${id}"]`).click(),id);await wait(250);await page.evaluate(()=>document.getElementById('px-zone').click());await wait(250);
  await page.evaluate(L=>{for(const [l,m0,m1] of L){const r=document.querySelector(`#modal .pxZr[data-l="${l}"]`);const cb=r.querySelector('input[type=checkbox]');cb.checked=true;cb.dispatchEvent(new Event('change'));if(m0!=null)r.querySelector('.m0').value=m0;if(m1!=null)r.querySelector('.m1').value=m1;}document.getElementById('pxz-ok').click();},lines);await wait(300);
  const t=await page.evaluate(()=>(document.querySelector('#modal .hint')||{}).textContent||'');await closeModal();await wait(150);return t;};
o={z1:await setZone('1',[['L1',0,100]]),z2:await setZone('2',[['L2',null,null]]),z3:await setZone('3',[['L1',100,200]])};
o.match=await page.evaluate(()=>({a:window.TRACE.dx.match('L1',50),b:window.TRACE.dx.match('L1',150),c:window.TRACE.dx.match('L2',30),d:window.TRACE.dx.match('L1',100)}));
await tab('plan');o.def=await page.evaluate(()=>({show:window.TRACE.state.show.plansexe,g:(document.getElementById('pxG')||{innerHTML:''}).innerHTML.length}));
await page.evaluate(()=>{document.querySelector('.zoomctl [data-z=eye]').click();});await wait(250);
o.chip=await page.evaluate(()=>!!document.querySelector('#disp label.dchip input[data-k="plansexe"]'));await page.click('#disp input[data-k="plansexe"]');await wait(300);
o.on=await page.evaluate(()=>{const g=document.getElementById('pxG');return {n:g.querySelectorAll('[data-pxpl]').length,labs:[...g.querySelectorAll('text')].map(t=>t.textContent)};});
await page.evaluate(()=>{const d=document.getElementById('disp');if(d)d.classList.remove('show');});await shot('pc_3_plan_calque');
await page.evaluate(()=>window.TRACE.dx.man(window.TRACE.dx.list().find(p=>p.no==='2').id));await wait(250);await page.evaluate(()=>document.getElementById('px-focus').click());await wait(700);
o.focus=await page.evaluate(()=>({tab:window.TRACE.state.tab,f:!!window.TRACE.state.pxFocus,orange:document.querySelectorAll('#pxG rect[stroke="#d6491c"]').length,modal:document.getElementById('modal').classList.contains('show')}));
console.log('c6) zones + calque :',J(o));
/* ── c6b (01/11, Ethan : « pour placer un plan d'exé il faut borner comme une phase ; dire à X m est compliqué ») : 📍 Borner sur le plan → début / fin au doigt → zone */
{await page.evaluate(()=>{const X=window.TRACE;X.state.tab='admin';X.renderAll();});await wait(300);
  const id1=await page.evaluate(()=>window.TRACE.dx.list().find(p=>p.no==='1').id);await page.evaluate(()=>window.TRACE.dx.man(window.TRACE.dx.list().find(p=>p.no==='1').id));await wait(250);await page.evaluate(()=>document.getElementById('px-zone').click());await wait(250);
  const ob={btn:await page.evaluate(()=>!!document.getElementById('pxz-bound'))};await page.click('#pxz-bound');await wait(500);
  ob.bar=await page.evaluate(()=>({show:getComputedStyle(document.getElementById('phBar')).display,msg:document.getElementById('phMsg').textContent.slice(0,80),tab:window.TRACE.state.tab}));
  const at=f=>page.evaluate(f=>{const P=window.TRACE.lines.L1.pts;let L=0;const seg=[];for(let i=1;i<P.length;i++){const d=Math.hypot(P[i].x-P[i-1].x,P[i].y-P[i-1].y);seg.push(d);L+=d;}let t=L*f;for(let i=1;i<P.length;i++){if(t<=seg[i-1]||i===P.length-1){const u=seg[i-1]?Math.min(1,t/seg[i-1]):0;return {x:P[i-1].x+(P[i].x-P[i-1].x)*u,y:P[i-1].y+(P[i].y-P[i-1].y)*u,L};}t-=seg[i-1];}},f);
  const tap=async q=>{await page.evaluate(q=>window.TRACE.centerOn(q.x,q.y,2),q);await wait(250);const sc=await page.evaluate(q=>{const c=document.getElementById('canvas').getBoundingClientRect();const v=window.TRACE.state.view;return [c.left+q.x*v.k+v.tx,c.top+q.y*v.k+v.ty];},q);await page.mouse.click(sc[0],sc[1]);await wait(300);};
  const q1=await at(0.2),q2=await at(0.6);await tap(q1);await tap(q2);ob.ok=await page.evaluate(()=>({txt:document.getElementById('phOk').textContent,vis:getComputedStyle(document.getElementById('phOk')).display}));
  await page.click('#phOk');await wait(500);
  ob.after=await page.evaluate(id=>{const p=window.TRACE.dx.list().find(x=>x.id===id);return {tab:window.TRACE.state.tab,zone:(p.zone||[]).map(z=>z.l+':'+z.m0+':'+z.m1),modal:document.getElementById('modal').classList.contains('show'),bar:getComputedStyle(document.getElementById('phBar')).display};},id1);
  ob.exp=[Math.round(q1.L*0.2),Math.round(q1.L*0.6)];await closeModal();await wait(150);
  console.log('c6b) borner une planche comme une phase :',J(ob));
  await setZone('1',[['L1',0,100]]); /* on remet la zone de c6 (c8, c9 s'en servent) — par les cases et PK, toujours là sous « ou par lignes et PK » */
  const z=(ob.after.zone[0]||'').split(':');C.c6b=ob.btn&&ob.bar.show!=='none'&&/Zone de la planche 1/.test(ob.bar.msg)&&ob.bar.tab==='plan'&&/Valider la zone/.test(ob.ok.txt)&&ob.after.tab==='admin'&&ob.after.zone.length===1&&z[0]==='L1'&&Math.abs(+z[1]-ob.exp[0])<=3&&Math.abs(+z[2]-ob.exp[1])<=3&&ob.after.modal&&ob.after.bar==='none';}
C.c6=o.focus.tab==='plan'&&o.focus.f&&o.focus.orange===1&&!o.focus.modal&&/L1.*PK 0 → 100/.test(o.z1)&&/L2/.test(o.z2)&&/PK 100 → 200/.test(o.z3)&&o.match.a.join()==='1'&&o.match.b.join()==='3'&&o.match.c.join()==='2'&&o.match.d.join()==='1,3'&&o.def.show===false&&o.def.g===0&&o.chip&&o.on.n===3&&o.on.labs.includes('P1 · ind. A')&&o.on.labs.includes('P3 · ind. A');

/* ── c7 : nouveaux indices (⋯ → ⬆, puis import « même n° ») + historique + persistance ── */
await tab('admin');
const id2=await page.evaluate(()=>window.TRACE.dx.list().find(p=>p.no==='2').id);
await page.evaluate(id=>document.querySelector(`#admin [data-pxman="${id}"]`).click(),id2);await wait(250);
await page.setInputFiles('#px-newind',file('planche2_indB.pdf',PDF_B2));await page.waitForSelector('#pxn-i',{timeout:15000}).catch(()=>{});
o={ni:await page.evaluate(()=>({i:document.getElementById('pxn-i').value,d:document.getElementById('pxn-d').value}))};
await page.evaluate(()=>document.getElementById('pxn-ok').click());await wait(1200);
o.hist=await page.evaluate(()=>[...document.querySelectorAll('#modal .pxHist tr')].map(t=>t.textContent.replace(/\s+/g,' ').trim()));await closeModal();await wait(150);
await page.setInputFiles('#px-imp',file('planche3_indB.pdf',PDF_B3));await page.waitForSelector('#modal .pxImpR',{timeout:15000}).catch(()=>{});await wait(200);
await page.evaluate(()=>{const s=document.getElementById('pxi-start');s.value='3';s.dispatchEvent(new Event('input'));});await wait(100);
o.re=await page.evaluate(()=>{const r=document.querySelector('#modal .pxImpR');return {st:r.querySelector('.st').textContent,i:r.querySelector('.in').value};});
await page.evaluate(()=>document.getElementById('pxi-ok').click());await wait(1500);
o.list=await page.evaluate(()=>window.TRACE.dx.list().map(p=>p.no+':'+p.ind.join('')+':'+p.cur));o.exe=(await rows()).find(r=>r.k==='exe');
await page.reload();await wait(1500);await reopen();await asUser('ethan');await tab('admin');
o.after=await page.evaluate(()=>({list:window.TRACE.dx.list().map(p=>p.no+':'+p.ind.join('')+':'+(p.zone[0]||{}).l),drive:window.TRACE.net.admin.drive&&window.TRACE.net.admin.drive.url,na:window.TRACE.net.admin.na}));o.cAfter=await counter();
console.log('c7) nouveaux indices + historique + persistance :',J(o));
C.c7=o.ni.i==='B'&&o.ni.d===today&&o.hist.length===2&&/^B du .*en cours/.test(o.hist[0])&&/^A du .*remplacé par l'indice B du/.test(o.hist[1])&&/nouvel indice de la planche 3 \(A → B\)/.test(o.re.st)&&o.re.i==='B'
  &&o.list.join()==='1:A:A,2:AB:B,3:AB:B'&&/dernier indice B/.test(o.exe.t)&&o.after.list.join()==='1:A:L1,2:AB:L2,3:AB:L1'&&/drive\.exemple\.fr/.test(o.after.drive||'')&&J(o.after.na)==='["voirie"]'&&o.cAfter==='3/7';

/* ── c8 : raccourci du soudeur (Karim) ── */
await asUser('karim');await tab('plan');
const pick=await page.evaluate(()=>{const T=window.TRACE;const f=(lid,a,b)=>{const cd=T.lines[lid].cond.A;for(let i=0;i<cd.joints.length;i++){const j=cd.joints[i];const e=cd.els[j.idx];if(e&&!j.sst&&e.m1>=a&&e.m1<=b)return {i,m:e.m1,w:j.weldId};}return null;};return {l2:f('L2',10,90),l1b:f('L1',120,190),l1a:f('L1',20,90)};});
o={pick,badge:await page.evaluate(()=>{const b=document.getElementById('pxPlanBtn');return b?{vis:b.style.display!=='none',txt:b.textContent}:null;})};
await page.evaluate(p=>window.TRACE.openJoint('L2','A',p.i),pick.l2);await wait(400);
o.btn2=await page.evaluate(()=>{const b=document.querySelector('#sheet .pxw-b');return b?{txt:b.textContent,h:Math.round(b.getBoundingClientRect().height)}:null;});
await shot('pc_4_fiche_soudure');
await page.evaluate(()=>document.querySelector('#sheet .pxw-b').click());o.v2=await waitImg();o.c2=await imgColor();o.st2=await page.evaluate(()=>(document.getElementById('pxv-st')||{}).textContent||'');await shot('pc_5_lecteur');
o.zoom=await page.evaluate(async()=>{const im=document.getElementById('pxv-img');const w0=im.getBoundingClientRect().width;const z0=document.getElementById('pxv-z').textContent;document.querySelector('#modal [data-pxz=in]').click();await new Promise(r=>setTimeout(r,80));const w1=im.getBoundingClientRect().width;const z1=document.getElementById('pxv-z').textContent;document.querySelector('#modal [data-pxz=out]').click();document.querySelector('#modal [data-pxz=out]').click();await new Promise(r=>setTimeout(r,80));const z2=document.getElementById('pxv-z').textContent;document.querySelector('#modal [data-pxz=fit]').click();await new Promise(r=>setTimeout(r,80));return {z0,z1,z2,z3:document.getElementById('pxv-z').textContent,grow:Math.round(w1/w0*100)};});
await closeModal();await wait(150);
await page.evaluate(p=>window.TRACE.openJoint('L1','A',p.i),pick.l1b);await wait(400);
o.btn3=await page.evaluate(()=>(document.querySelector('#sheet .pxw-b')||{}).textContent||'');
await page.evaluate(()=>document.querySelector('#sheet .pxw-b').click());o.v3=await waitImg();o.c3=await imgColor();
await page.evaluate(()=>document.getElementById('pxv-hist').click());await wait(250);
await page.evaluate(()=>{const b=[...document.querySelectorAll('#modal .pxHist [data-pxind]')].pop();b.click();});o.vA=await waitImg();o.cA=await imgColor();
o.old=await page.evaluate(()=>(document.querySelector('#modal .pxv-old')||{}).textContent||'');await closeModal();await wait(150);
await page.evaluate(()=>window.TRACE.closeSheet());await wait(200);
o.badgeAfter=await page.evaluate(()=>(document.getElementById('pxPlanBtn')||{}).textContent||'');
console.log('c8) raccourci du soudeur :',J({...o,c2:near(o.c2),c3:near(o.c3),cA:near(o.cA),p2:o.c2&&o.c2.page,pA:o.cA&&o.cA.page}));
C.c8=pick.l2&&pick.l1b&&o.badge&&o.badge.vis&&/Mes plans\s*2/.test(o.badge.txt)&&o.btn2&&/Plan d'exé · planche 2 · ind\. B/.test(o.btn2.txt)&&/nouvel indice/.test(o.btn2.txt)&&o.btn2.h>=44&&o.v2==='img'&&near(o.c2)==='orange'&&/page 1/.test(o.st2)
  &&o.zoom.z0==='100 %'&&o.zoom.z1==='160 %'&&o.zoom.grow>=155&&o.zoom.z2==='100 %'&&o.zoom.z3==='100 %'&&/planche 3 · ind\. B/.test(o.btn3)&&o.v3==='img'&&near(o.c3)==='violet'&&o.vA==='img'&&near(o.cA)==='bleu'&&o.cA.page==='3'&&/remplacé par l'indice B/.test(o.old)&&/Mes plans$/.test(o.badgeAfter.trim());

/* ── c9 : « 📄 Mes plans » au téléphone (390 puis 360) — dernière soudure de Karim sur L1 PK < 100 → planche 1 en premier ── */
await page.evaluate(p=>{const T=window.TRACE;const cd=T.lines.L1.cond.A;const j=cd.joints[p.i];j.status='soudee';j.events=(j.events||[]).concat([{type:'soudee',by:'karim',at:new Date(),data:{procede:'tig'}}]);T.renderAll();},pick.l1a);
await page.evaluate(()=>{document.getElementById('app').classList.remove('wide');try{localStorage.setItem('trace:wide','0');}catch(e){}});
const phone=async w=>{await page.setViewportSize({width:w,height:w===390?844:740});await wait(400);await tab('plan');const b=await page.evaluate(()=>{const x=document.getElementById('pxPlanBtn');const r=x.getBoundingClientRect();return {vis:x.style.display!=='none'&&r.width>0,h:Math.round(r.height),x:Math.round(r.left),y:Math.round(r.top)};});
  await page.click('#pxPlanBtn');await wait(400);
  const L=await page.evaluate(()=>{const m=document.getElementById('modal');return {sec:[...m.querySelectorAll('.pxSec')].map(s=>s.textContent),first:(m.querySelector('.pxRowB .pxNo')||{}).textContent,n:m.querySelectorAll('.pxRowB').length,minH:Math.min(...[...m.querySelectorAll('.pxRowB,[data-close]')].map(x=>x.getBoundingClientRect().height)),gest:m.querySelectorAll('.pxRowM').length};});
  const ov=await noOverflow();await shot('tel'+w+'_mes_plans');await closeModal();await wait(150);
  await tab('admin');const ovD=await noOverflow();const minBtn=await page.evaluate(()=>Math.min(...[...document.querySelectorAll('#admin .dx-acts .btn,#admin .dx-open,#admin .pxRowB,#admin #dx-drive-open,#admin .dx-fold')].filter(x=>x.offsetParent).map(x=>x.getBoundingClientRect().height)));await shot('tel'+w+'_dossier');
  await tab('plan');await page.evaluate(p=>window.TRACE.openJoint('L2','A',p.i),pick.l2);await wait(400);const wb=await page.evaluate(()=>{const b=document.querySelector('#sheet .pxw-b');const r=b?b.getBoundingClientRect():null;return r?{h:Math.round(r.height),in:r.left>=0&&r.right<=window.innerWidth+1}:null;});await shot('tel'+w+'_fiche_soudure');await page.evaluate(()=>window.TRACE.closeSheet());await wait(200);
  await page.evaluate(()=>window.TRACE.dx.openNo('1'));const vs=await waitImg();const ovV=await noOverflow();await shot('tel'+w+'_lecteur');await closeModal();await wait(150);
  return {b,L,ov,ovD,minBtn,vs,ovV,wb};};
o={t390:await phone(390),t360:await phone(360)};
console.log('c9) Mes plans au téléphone :',J(o));
const okPhone=x=>x.b.vis&&x.b.h>=44&&x.L.first==='1'&&/Près de S-/.test(x.L.sec[0]||'')&&/ta dernière soudure/.test(x.L.sec[0]||'')&&x.L.n===3&&x.L.minH>=44&&x.L.gest===0&&x.ov.doc&&x.ov.modal&&x.ovD.doc&&x.minBtn>=44&&x.vs==='img'&&x.ovV.doc&&x.ovV.modal&&x.wb&&x.wb.h>=44&&x.wb.in;
C.c9=okPhone(o.t390)&&okPhone(o.t360);

/* ── c10 : droits — Karim (soudeur) lit, ne dépose rien ── */
await tab('admin');
o=await page.evaluate(()=>{const el=document.getElementById('admin');return {dep:el.querySelectorAll('[data-dxdep]').length,driveIn:!!el.querySelector('#dx-drive-in'),driveEd:!!el.querySelector('#dx-drive-edit'),driveOpen:!!el.querySelector('#dx-drive-open'),imp:!!el.querySelector('#px-imp'),man:el.querySelectorAll('.pxRowM').length,admCat:!!el.querySelector('#adm-cat'),chk:el.querySelectorAll('.dx-p .ac-chk').length,open:el.querySelectorAll('.dx-p a.dx-open').length,mine:[...el.querySelectorAll('.dx-p')].map(r=>r.querySelector('.dx-man')?r.querySelector('.dx-man').textContent:'').filter(Boolean)};});
await page.evaluate(()=>window.TRACE.dx.man(window.TRACE.dx.list()[0].id));await wait(250);
o.manModal=await page.evaluate(()=>({zone:!!document.getElementById('px-zone'),ni:!!document.getElementById('px-newind'),del:!!document.getElementById('px-del'),open:!!document.querySelector('#modal [data-pxopen]')}));await closeModal();await wait(150);
o.exeBtn=await page.evaluate(()=>!!document.querySelector('#admin .dx-p[data-dxk="exe"] button.dx-open[data-pxlist]'));
await page.evaluate(()=>document.querySelector('#admin [data-dxman="dt"]').click());await wait(250);o.dtModal=await page.evaluate(()=>({file:!!document.getElementById('dxp-file'),until:!!document.getElementById('dxp-until'),na:!!document.getElementById('dxp-na'),del:document.querySelectorAll('#modal [data-dxdel]').length,links:document.querySelectorAll('#modal .dx-vers a').length}));await closeModal();await wait(150);
await shot('tel360_dossier_soudeur');
await asUser('ethan');await tab('admin');await shot('tel360_dossier_chef');await page.evaluate(()=>{const x=document.getElementById('px-sec');const v=x&&x.closest('.view');if(v)v.scrollTop=Math.max(0,x.getBoundingClientRect().top-v.getBoundingClientRect().top+v.scrollTop-8);});await wait(150);await shot('tel360_plans_chef');
await page.evaluate(()=>window.TRACE.dx.man(window.TRACE.dx.list()[2].id));await wait(250);await shot('tel360_planche_chef');o.chefOv=await noOverflow();await closeModal();await wait(150);
await page.setInputFiles('#px-imp',file('plan_tel.pdf',PDF_DOC));await page.waitForSelector('#modal .pxImpR',{timeout:15000}).catch(()=>{});await wait(200);await shot('tel360_import_chef');o.impOv=await noOverflow();await closeModal();await wait(150);await asUser('karim');
console.log('c10) droits soudeur :',J(o));
C.c10=o.chefOv.doc&&o.chefOv.modal&&o.impOv.doc&&o.impOv.modal&&o.dep===0&&!o.driveIn&&!o.driveEd&&o.driveOpen&&!o.imp&&o.man===0&&!o.admCat&&o.chk===8&&o.open>=2&&!o.manModal.zone&&!o.manModal.ni&&!o.manModal.del&&o.manModal.open&&!o.dtModal.file&&!o.dtModal.until&&!o.dtModal.na&&o.dtModal.del===0&&o.dtModal.links===2&&o.exeBtn&&J(o.mine)==='["🕘 2"]';

/* ── c11 : hors connexion ── */
await asUser('ethan');await page.setViewportSize({width:1366,height:860});await wait(300);
await page.evaluate(B=>{const ad=window.TRACE.net.admin;const now=new Date().toISOString();ad.docs.push({id:'Durl9',cat:'exe',name:'planche9.pdf',url:B+'/__dx/planche9.pdf',by:'Ethan L.',at:now},{id:'Durl10',cat:'exe',name:'planche10.pdf',url:B+'/__dx/planche10.pdf',by:'Ethan L.',at:now});
  ad.pl.push({id:'PLurl9',no:'9',title:'Planche au stockage',zone:[],ind:[{id:'PIu9',i:'A',date:'2026-10-31',doc:'Durl9',page:1,kind:'pdf',by:'Ethan L.',at:now}],by:'Ethan L.',at:now},{id:'PLurl10',no:'10',title:'Jamais ouverte',zone:[],ind:[{id:'PIu10',i:'A',date:'2026-10-31',doc:'Durl10',page:1,kind:'pdf',by:'Ethan L.',at:now}],by:'Ethan L.',at:now});},BASE);
o={c0:await page.evaluate(()=>window.TRACE.dx.cacheInfo())};
await page.evaluate(()=>window.TRACE.dx.openNo('9'));o.on=await waitImg();o.onCol=near(await imgColor());o.hits=urlHits;await closeModal();await wait(300);o.c1=await page.evaluate(()=>window.TRACE.dx.cacheInfo());
OFF=true;await ctx.setOffline(true);await wait(200);
await page.evaluate(()=>window.TRACE.dx.openNo('9'));o.off=await waitImg();const cOff=await imgColor();o.offCol=near(cOff);o.offCache=cOff&&cOff.cache;o.offSt=await page.evaluate(()=>(document.getElementById('pxv-st')||{}).textContent||'');await shot('pc_6_hors_connexion_cache');await closeModal();await wait(150);
await page.evaluate(()=>window.TRACE.dx.openNo('10'));o.never=await waitImg();o.neverMsg=await page.evaluate(()=>(document.querySelector('#pxv-body [data-err]')||{}).textContent||'');await shot('pc_7_hors_connexion_jamais');await closeModal();await wait(150);
await tab('admin');o.dossierOff=await page.evaluate(()=>document.querySelectorAll('#admin .dx-p').length);
await ctx.setOffline(false);OFF=false;await wait(300);
await page.evaluate(()=>window.TRACE.dx.man('PLurl10'));await wait(250);await page.evaluate(()=>document.getElementById('px-del').click());await wait(400);o.retire=await page.evaluate(()=>({list:window.TRACE.dx.list().map(p=>p.no).join(),kept:!!window.TRACE.net.admin.pl.find(p=>p.id==='PLurl10'&&p.deleted),doc:!!window.TRACE.net.admin.docs.find(d=>d.id==='Durl10')}));
o.lru=await page.evaluate(async()=>{const T=window.TRACE.dx;const i0=await T.cacheInfo();const max=Math.round(i0.bytes/i0.n*1.5);T.setCacheMax(max);const p2=window.TRACE.net.admin.pl.find(x=>x.no==='2');await T.open(p2.id,p2.ind[0].id);await new Promise(r=>setTimeout(r,2500));const i1=await T.cacheInfo();T.setCacheMax(0);return {n0:i0.n,b0:i0.bytes,max,n1:i1.n,b1:i1.bytes};});await closeModal();await wait(150);
console.log('c11) hors connexion :',J(o));
C.c11=o.on==='img'&&o.onCol==='cyan'&&o.hits===1&&o.c1.n>o.c0.n&&o.off==='img'&&o.offCol==='cyan'&&o.offCache==='1'&&/gardée sur l'appareil/.test(o.offSt)&&o.never==='err'&&/Plan non disponible hors connexion/.test(o.neverMsg)&&/ouvre-le une fois avec du réseau/.test(o.neverMsg)&&o.dossierOff===8
  &&o.lru.n0>=3&&o.lru.b1<=o.lru.max&&o.lru.n1<o.lru.n0&&o.retire.list==='1,2,3,9'&&o.retire.kept&&o.retire.doc;

/* ── c12 : paliers allumés, Ethan Socle → plans d'exé cachés, Dossier V1 présent ── */
await page.evaluate(()=>window.TRACE.paliers.setOn(true));await wait(300);await tab('admin');
o={on:await page.evaluate(()=>window.TRACE.paliers.on()),feat:await page.evaluate(()=>window.TRACE.paliers.feat('plansexe')),rows:(await rows()).length,px:await page.evaluate(()=>!!document.getElementById('px-sec')),exe:((await rows()).find(r=>r.k==='exe')||{}).t,drive:await page.evaluate(()=>!!document.getElementById('dx-drive-open'))};
await tab('plan');await page.evaluate(p=>window.TRACE.openJoint('L2','A',p.i),pick.l2);await wait(300);o.weld=await page.evaluate(()=>!!document.querySelector('#sheet .pxw'));await page.evaluate(()=>window.TRACE.closeSheet());await wait(200);
o.btn=await page.evaluate(()=>{const b=document.getElementById('pxPlanBtn');return !!b&&b.style.display!=='none';});
await page.evaluate(()=>{document.querySelector('.zoomctl [data-z=eye]').click();});await wait(250);o.chip=await page.evaluate(()=>!!document.querySelector('#disp input[data-k="plansexe"]'));await page.evaluate(()=>{const d=document.getElementById('disp');if(d)d.classList.remove('show');});
o.g=await page.evaluate(()=>(document.getElementById('pxG')||{innerHTML:''}).innerHTML.length);
await page.evaluate(()=>window.TRACE.paliers.setOn(false));await wait(300);await tab('admin');o.back=await page.evaluate(()=>!!document.getElementById('px-sec'));
console.log('c12) paliers :',J(o));
C.c12=o.on===true&&o.feat===false&&o.rows===8&&!o.px&&!/planches/.test(o.exe||'')&&o.drive&&!o.weld&&!o.btn&&!o.chip&&o.g===0&&o.back;

/* ── c13 : console ── */
await page.evaluate(()=>{document.getElementById('app').classList.add('wide');});await tab('admin');await shot('pc_8_dossier_final');await page.evaluate(()=>{const x=document.getElementById('px-sec');const v=x&&x.closest('.view');if(v)v.scrollTop=Math.max(0,x.getBoundingClientRect().top-v.getBoundingClientRect().top+v.scrollTop-8);});await wait(150);await shot('pc_9_plans_exe');
C.c13=!logs.length;if(logs.length)console.log('console :',logs);
console.log('RÉSULTATS',J(C));console.log('RESULTAT:',Object.values(C).every(Boolean)?'TOUT VERT':'ÉCHEC '+Object.keys(C).filter(k=>!C[k]).join(' '));await browser.close();process.exit(Object.values(C).every(Boolean)?0:1);
