// RETOURS D'ETHAN DU 10/10 (matin, points 1 à 3) : 1) l'accueil chantier n'est réclamé qu'aux gens placés au planning, une seule fois ; 2) quart d'heure sécurité
// dématérialisé (déclenchement par l'encadrement → notification → sujet déroulé → questions → signature ; participant sans compte ; feuille) ; 3) flash info PDF
// (publié depuis Documents d'entreprise, lecture déroulée / attestation, signature) + vue RH « à relancer » ; 4) contrôle chantier : légende, présents du jour
// pré-remplis, chef / conducteur, photos par point, rapport ; suivi direction (Exploitation → Contrôles chantier) ; 5) textes de prévention (pas de jugulaire, repas base vie / véhicule, pas d'Angers).
import { chromium } from 'playwright';
import fs from 'fs';
const BASE=process.env.BASE||'http://localhost:8765';
const browser=await chromium.launch({headless:true, executablePath: process.env.CHROMIUM_PATH||undefined});
const ctx=await browser.newContext({viewport:{width:430,height:900}});const page=await ctx.newPage();
const logs=[];page.on('pageerror',e=>logs.push('PAGEERROR: '+e.message.slice(0,300)));page.on('console',m=>{if(m.type()==='error'&&!/supabase|Failed to fetch|net::ERR|404|WebSocket|pdf/i.test(m.text()))logs.push(m.text().slice(0,200));});
page.on('dialog',d=>d.accept().catch(()=>{}));
const C={};const wait=ms=>page.waitForTimeout(ms);
await page.clock.install({time:new Date(2026,9,9,8,30,0)}); /* vendredi 09/10/2026 8 h 30 : le planning ignore le week-end */
await page.goto(BASE+'/index.html');await wait(600);await page.evaluate(()=>{localStorage.clear();});await page.evaluate(()=>new Promise(r=>{try{const q=indexedDB.deleteDatabase('trace-kv');q.onsuccess=q.onerror=q.onblocked=()=>r();}catch(e){r();}}));
await page.reload();await wait(1200);
const skip=async()=>{const s=await page.$('#loginSkip');if(s&&await s.isVisible())await s.click();await wait(700);};await skip();
const draw=async id=>{await page.evaluate(id2=>{const cv=document.getElementById(id2);const r=cv.getBoundingClientRect();const ev=(t,x,y)=>cv.dispatchEvent(new PointerEvent(t,{bubbles:true,clientX:r.left+x,clientY:r.top+y,pointerId:1,pointerType:'touch'}));ev('pointerdown',20,40);ev('pointermove',80,60);ev('pointermove',140,30);ev('pointerup',140,30);},id);};
const asUser=async(id,tab)=>{await page.evaluate(({id2,t})=>{const T=window.TRACE;T.state.userId=id2;document.getElementById(t||'htHome').click();T.renderHome();},{id2:id,t:tab});await wait(400);};
// chantier de démo Caen (chef Ethan), un ancien accueil « séance » déjà émargé par Paul (doit compter comme accueil fait pour Paul, pas pour les autres)
await page.evaluate(()=>{const T=window.TRACE;const src=T.sites[Object.keys(T.sites).find(k=>k!=='__vide'&&T.sites[k]&&T.sites[k].lines)];const now=new Date().toISOString();const x=JSON.parse(JSON.stringify(src));x.id='demo_caen';x.name='Caen — Presqu\'île';x.fiche={ville:'Caen',secteur:'ouest',chef:'l:ethan',conducteur:'l:sophie'};
  x.conv={msgs:[],seq:1};x.qse={docs:[{id:'q_old',type:'accueil',title:'Accueil chantier du 05/10/2026',by:'Ethan L.',at:now,qs:[],sigs:[{name:'Paul D.',uid:'l:paul',at:now}]}]};x.stock={zones:[],lots:[],livs:[],moves:[],takes:[]};T.sites.demo_caen=x;T.renderHome();});await wait(300);
// ── 1) Karim n'est PAS placé → pas de « Accueil chantier à faire » (ancienne séance comprise) ; Ethan le place à Caen → la notification apparaît, une seule ; Julien (pas placé) : rien
await asUser('karim');
let out=await page.evaluate(()=>({notifs:[...document.querySelectorAll('#eq-app .ac-notif .tx b')].map(b=>b.textContent)}));
await page.evaluate(async()=>{const T=window.TRACE;T.state.userId='ethan';T.renderHome();document.getElementById('htExpl').click();await new Promise(r=>setTimeout(r,200));[...document.querySelectorAll('#eq-app .ac-row')].find(x=>/Planning des équipes/.test(x.textContent)).click();await new Promise(r=>setTimeout(r,200));
  const c=[...document.querySelectorAll('#eq-app .eq-pltray .eq-plchip')].find(x=>/Karim/.test(x.textContent));c.querySelector('.eq-plmain').click();document.querySelector('#eq-app .eq-plsite[data-drop=demo_caen] [data-act=plput]').click();});await wait(300);
await asUser('karim');
out.placed=await page.evaluate(()=>[...document.querySelectorAll('#eq-app .ac-notif .tx b')].map(b=>b.textContent));
await asUser('julien');
out.julien=await page.evaluate(()=>[...document.querySelectorAll('#eq-app .ac-notif .tx b')].map(b=>b.textContent));
console.log('1) accueil chantier réclamé seulement aux gens placés :',JSON.stringify(out));
C.c1=!out.notifs.some(t=>/Accueil chantier à faire/.test(t))&&out.placed.filter(t=>/Accueil chantier à faire : Caen/.test(t)).length===1&&!out.julien.some(t=>/Accueil chantier à faire/.test(t))&&out.placed.indexOf(out.placed.find(t=>/Règlement intérieur/.test(t)))<out.placed.indexOf(out.placed.find(t=>/Accueil chantier à faire/.test(t)));
// ── 2) quart d'heure sécurité : Ethan le déclenche sur ses chantiers (Exploitation) → Karim (placé à Caen aujourd'hui) a la notification → parcours (sujet déroulé, 3 questions, signature) → fait ; bloc QSE ; participant sans compte ; feuille
await asUser('ethan','htExpl');
await page.evaluate(async()=>{[...document.querySelectorAll('#eq-app .ac-row')].find(x=>/Quart d'heure sécurité/.test(x.textContent)).click();await new Promise(r=>setTimeout(r,200));document.querySelector('#eq-app [data-act=qhsnew]').click();});await wait(300);
out=await page.evaluate(()=>({modal:/Déclencher un quart d'heure/.test(document.getElementById('modal').textContent),topics:[...document.querySelectorAll('#qh-topic option')].length,where:[...document.querySelectorAll('#modal input[name=qh-where]')].map(i=>i.value)}));
await page.evaluate(()=>{document.getElementById('qh-topic').value='qhs_pointschauds';document.querySelector('#modal input[name=qh-where][value=mine]').checked=true;document.getElementById('qh-note').value='suite au presqu\'accident de mardi';document.getElementById('qh-ok').click();});await wait(400);
out.runs=await page.evaluate(()=>window.TRACE.qhs.runs().map(r=>({topic:r.topic,sites:r.sites,by:r.by,note:r.note})));
out.recap=await page.evaluate(()=>/Points chauds/.test(document.getElementById('eq-app').textContent)&&/suite au presqu/.test(document.getElementById('eq-app').textContent));
console.log('2a) déclenchement par Ethan :',JSON.stringify(out));
C.c2a=out.modal&&out.topics>=3&&out.where.join()==='mine,all'&&out.runs.length===1&&out.runs[0].topic==='qhs_pointschauds'&&out.runs[0].sites.includes('demo_caen')&&out.recap;
await asUser('karim');
out=await page.evaluate(()=>({notifs:[...document.querySelectorAll('#eq-app .ac-notif .tx b')].map(b=>b.textContent)}));
await page.evaluate(()=>{[...document.querySelectorAll('#eq-app .ac-notif')].find(x=>/Quart d'heure sécurité à faire/.test(x.textContent)).click();});await wait(1800);
out.open=await page.evaluate(()=>({screen:window.TRACE.state.screen,tab:window.TRACE.state.tab,title:(document.querySelector('#modal .pv-title')||{}).textContent,btnDisabled:document.getElementById('qh-read')&&document.getElementById('qh-read').disabled,note:/presqu'accident/.test(document.getElementById('modal').textContent)}));
await page.evaluate(()=>{const b=document.getElementById('qh-body');b.scrollTop=b.scrollHeight;b.dispatchEvent(new Event('scroll'));});await wait(150);
out.afterScroll=await page.evaluate(()=>document.getElementById('qh-read').disabled);
await page.evaluate(()=>document.getElementById('qh-read').click());await wait(200);
out.q=await page.evaluate(()=>({n:document.querySelectorAll('#modal input[data-qh]').length,next:document.getElementById('qh-next').disabled}));
await page.evaluate(()=>{document.querySelectorAll('#modal input[data-qh]').forEach(b=>{b.checked=true;b.dispatchEvent(new Event('change'));});});await wait(100);
out.q.nextAfter=await page.evaluate(()=>document.getElementById('qh-next').disabled);
await page.evaluate(()=>document.getElementById('qh-next').click());await wait(200);
out.sign=await page.evaluate(()=>({title:(document.querySelector('#modal .pv-title')||{}).textContent,pad:!!document.getElementById('qh-pad')}));
await draw('qh-pad');await page.evaluate(()=>document.getElementById('qh-sign').click());await wait(500);
out.after=await page.evaluate(()=>{const T=window.TRACE;const r=T.qhs.runs()[0];const s=T.qhs.sigs(r.id);return {sigs:s.length,name:s[0]&&s[0].name,key:s[0]&&s[0].key,img:!!(s[0]&&s[0].img),answers:s[0]&&s[0].answers.length,done:/Tu as participé/.test(document.getElementById('qse').textContent),todo:T.qhs.todo(T.qhs.key(),'Karim B.',['demo_caen']).length};});
await page.evaluate(()=>document.getElementById('btnHome').click());await wait(500);
out.notifAfter=await page.evaluate(()=>[...document.querySelectorAll('#eq-app .ac-notif .tx b')].some(b=>/Quart d'heure sécurité à faire/.test(b.textContent)));
console.log('2b) Karim : notification → parcours → signature :',JSON.stringify(out));
C.c2b=out.notifs.some(t=>/Quart d'heure sécurité à faire : Points chauds/.test(t))&&out.open.screen==='site'&&out.open.tab==='qse'&&/Points chauds/.test(out.open.title)&&typeof out.open.btnDisabled==='boolean' /* le bouton ne se débloque qu'en bas — ou tout de suite si le sujet tient à l'écran */&&out.open.note&&out.afterScroll===false&&out.q.n===3&&out.q.next===true&&out.q.nextAfter===false&&/Signature/.test(out.sign.title)&&out.sign.pad&&out.after.sigs===1&&out.after.name==='Karim B.'&&out.after.key==='l:karim'&&out.after.img&&out.after.answers===3&&out.after.done&&out.after.todo===0&&!out.notifAfter;
// Ethan sur Caen → QSE : bloc du jour avec la participation de Karim ; « faire participer quelqu'un sans compte » → parcours au nom de Lucas (intérim) → 2 participations ; feuille d'émargement
await page.evaluate(async()=>{const T=window.TRACE;T.state.userId='ethan';T.go('demo_caen');await new Promise(r=>setTimeout(r,900));T.state.tab='qse';T.renderAll();});await wait(400);
out=await page.evaluate(()=>{const el=document.getElementById('qse');return {block:/Quart d'heure sécurité du jour/.test(el.textContent),karim:/1 participation : Karim B\./.test(el.textContent.replace(/\s+/g,' ')),ext:!!el.querySelector('[data-qhext]'),print:!!el.querySelector('[data-qhprint]'),mine:/Faire le quart d'heure sécurité/.test(el.textContent)};});
await page.evaluate(()=>document.querySelector('#qse [data-qhext]').click());await wait(300);
await page.evaluate(()=>{document.getElementById('ext-name').value='Lucas Intérim';document.getElementById('ext-org').value='Manpower Caen';document.getElementById('ext-ok').click();});await wait(300);
await page.evaluate(()=>{const b=document.getElementById('qh-body');b.scrollTop=b.scrollHeight;b.dispatchEvent(new Event('scroll'));});await wait(150);await page.evaluate(()=>document.getElementById('qh-read').click());await wait(150);
await page.evaluate(()=>{document.querySelectorAll('#modal input[data-qh]').forEach(b=>{b.checked=true;b.dispatchEvent(new Event('change'));});document.getElementById('qh-next').click();});await wait(200);
out.extTxt=await page.evaluate(()=>/Lucas Intérim/.test(document.getElementById('modal').textContent)&&/accueilli par Ethan/.test(document.getElementById('modal').textContent));
await draw('qh-pad');await page.evaluate(()=>document.getElementById('qh-sign').click());await wait(500);
out.sigs=await page.evaluate(()=>{const T=window.TRACE;const r=T.qhs.runs()[0];return T.qhs.sigs(r.id).map(s=>s.name+'|'+s.key+'|'+(s.by||''));});
const [pop]=await Promise.all([page.waitForEvent('popup'),page.evaluate(()=>document.querySelector('#qse [data-qhprint]').click())]);await pop.waitForLoadState('domcontentloaded');
out.sheet=await pop.evaluate(()=>({t:/Participations \(2\)/.test(document.body.textContent),names:/Karim B\./.test(document.body.textContent)&&/Lucas Intérim/.test(document.body.textContent),imgs:document.querySelectorAll('table img[src^="data:image/png"]').length}));await pop.close();
console.log('2c) bloc QSE, participant sans compte, feuille :',JSON.stringify(out));
C.c2c=out.block&&out.karim&&out.ext&&out.print&&out.mine&&out.extTxt&&out.sigs.length===2&&out.sigs[1]==='Lucas Intérim|ext:lucas_int_rim|Ethan L.'&&out.sheet.t&&out.sheet.names&&out.sheet.imgs===2;
// ── 3) flash info PDF : Ethan le publie (Documents d'entreprise, PDF gardé dans l'appli hors connexion, postes exploitation) → Karim : « À lire et signer » → lecteur / repli attestation 60 s → signature ; RH : « à relancer » liste Karim, imprimable
await page.evaluate(()=>document.getElementById('btnHome').click());await wait(300);await asUser('ethan','htExpl');
await page.evaluate(async()=>{[...document.querySelectorAll('#eq-app .ac-row')].find(x=>/Documents d'entreprise/.test(x.textContent)).click();await new Promise(r=>setTimeout(r,200));});
out=await page.evaluate(()=>({late:/À relancer/.test(document.getElementById('eq-app').textContent),karimLate:[...document.querySelectorAll('#eq-app table.rc tr')].some(tr=>/Karim/.test(tr.textContent)&&/manquant/.test(tr.textContent)),printBtn:!!document.querySelector('#eq-app [data-act=doclate]'),flashBtn:!!document.querySelector('#eq-app [data-act=docnew][data-v=flash]')}));
await page.evaluate(()=>document.querySelector('#eq-app [data-act=docnew][data-v=flash]').click());await wait(300);
out.form=await page.evaluate(()=>({title:/Nouveau flash info/.test(document.getElementById('modal').textContent),exploit:document.querySelector('#modal input[name=dn-req][value=exploit]').checked,pdf:!!document.getElementById('dn-pdf')}));
await page.evaluate(()=>{document.getElementById('dn-title').value='Flash info n° 7 — presqu\'accident tranchée';document.getElementById('dn-text').value='Mardi, un godet a frôlé une conduite gaz. Consigne : sondage manuel dans la zone d\'incertitude.';});
await page.setInputFiles('#dn-pdf', new URL('./bl/axiom.pdf',import.meta.url).pathname);await wait(200);
await page.evaluate(()=>document.getElementById('dn-ok').click());await wait(900);
out.doc=await page.evaluate(()=>{const d=window.TRACE.docs.all().find(x=>x.kind==='flash');return d&&{title:d.title,file:d.file,data:!!(d.data&&d.data.startsWith('data:application/pdf')),postes:d.req.postes.length,types:d.req.types,html:/godet/.test(d.html)};});
console.log('3a) flash info publié (PDF) :',JSON.stringify(out));
C.c3a=out.late&&out.karimLate&&out.printBtn&&out.flashBtn&&out.form.title&&out.form.exploit&&out.form.pdf&&out.doc&&/Flash info n° 7/.test(out.doc.title)&&out.doc.file==='axiom.pdf'&&out.doc.data&&out.doc.postes>=8&&out.doc.types.join()==='interim'&&out.doc.html;
await asUser('karim');
out=await page.evaluate(()=>({notifs:[...document.querySelectorAll('#eq-app .ac-notif .tx b')].map(b=>b.textContent)}));
await page.evaluate(()=>{[...document.querySelectorAll('#eq-app .ac-notif')].find(x=>/Flash info n° 7/.test(x.textContent)).click();});await wait(400);
await page.waitForFunction(()=>document.getElementById('dr-alt')&&(document.getElementById('dr-alt').style.display!=='none'||document.querySelector('#dr-body canvas')),null,{timeout:12000}).catch(()=>{});await wait(300); /* lecteur pdf.js (CDN) ou repli « ouvrir dans un onglet + attestation » */
out.modal=await page.evaluate(()=>{const m=document.getElementById('modal');return {open:m.classList.contains('show'),title:/Flash info n° 7/.test(m.textContent)&&/Flash info sécurité/.test(m.textContent),intro:/godet/.test(m.textContent),body:!!document.getElementById('dr-body'),alt:!!document.getElementById('dr-alt'),read:document.getElementById('dr-read').disabled,pdfShown:document.getElementById('dr-body').style.display!=='none',altShown:document.getElementById('dr-alt').style.display!=='none'};});
if(out.modal.altShown){await page.evaluate(()=>{document.querySelector('#dr-alt a').addEventListener('click',e=>e.preventDefault());document.querySelector('#dr-alt a').click();});await page.clock.runFor(61000);await wait(200);}
else{await page.evaluate(()=>{const b=document.getElementById('dr-body');b.scrollTop=b.scrollHeight;b.dispatchEvent(new Event('scroll'));});await wait(300);}
out.readAfter=await page.evaluate(()=>document.getElementById('dr-read').disabled);
await page.evaluate(()=>document.getElementById('dr-read').click());await wait(200);await draw('dr-pad');await page.evaluate(()=>document.getElementById('dr-ok').click());await wait(500);
out.sig=await page.evaluate(()=>{const T=window.TRACE;const d=T.docs.all().find(x=>x.kind==='flash');const s=T.docs.sig(d.id,'l:karim');return s&&{name:s.name,img:!!s.img,readAt:!!s.readAt,mode:s.readMode};});
out.notifAfter=await page.evaluate(()=>[...document.querySelectorAll('#eq-app .ac-notif .tx b')].some(b=>/Flash info n° 7/.test(b.textContent)));
console.log('3b) Karim lit (ou atteste) et signe le flash info :',JSON.stringify(out));
C.c3b=out.notifs.some(t=>/À lire et signer : Flash info n° 7/.test(t))&&out.modal.open&&out.modal.title&&out.modal.intro&&out.modal.body&&out.modal.alt&&out.modal.read===true&&(out.modal.pdfShown||out.modal.altShown)&&out.readAfter===false&&out.sig&&out.sig.name==='Karim B.'&&out.sig.img&&out.sig.readAt&&['pdfjs','attestation'].includes(out.sig.mode)&&!out.notifAfter;
// ── 4) contrôle chantier (Ethan sur Caen) : légende, présents du jour pré-remplis (Karim), chef / conducteur, photo sur un point → NC présumée, rapport avec photo ; Exploitation → Contrôles chantier
await page.evaluate(async()=>{const T=window.TRACE;T.state.userId='ethan';T.go('demo_caen');await new Promise(r=>setTimeout(r,900));T.state.tab='qse';T.renderAll();});await wait(400);
await page.evaluate(()=>document.getElementById('qse-controle').click());await wait(300);
out=await page.evaluate(()=>({leg:[...document.querySelectorAll('#modal .ct-leg span')].map(s=>s.textContent.trim()),pres:document.getElementById('ct-pres').value,chef:/chef de chantier : Ethan L\./.test(document.getElementById('modal').textContent),cond:/conducteur : Sophie M\./.test(document.getElementById('modal').textContent),lieu:document.getElementById('ct-lieu').value,ph:document.querySelectorAll('#modal [data-ph-k]').length}));
const png='/tmp/e2e_ctrl_photo.png';fs.writeFileSync(png,Buffer.from('iVBORw0KGgoAAAANSUhEUgAAAAIAAAACCAYAAABytg0kAAAAFklEQVQImWP8z8DwnwEKGBkYGBgYAABGBAEBOaVoVAAAAABJRU5ErkJggg==','base64'));
await page.evaluate(()=>{document.querySelector('#modal [data-ct="bv_rang"][data-e="C"]').click();});
await page.setInputFiles('#modal [data-ph-k="ch_tranchee"]',png);await wait(500);
out.afterPhoto=await page.evaluate(()=>({thumbs:document.querySelectorAll('#modal [data-phs-k="ch_tranchee"] img').length,nc:document.querySelector('#modal [data-ct="ch_tranchee"][data-e="NC"]').classList.contains('on'),act:document.querySelector('#modal [data-act-k="ch_tranchee"]').style.display!=='none'}));
await page.evaluate(()=>{document.querySelector('#modal [data-act-k="ch_tranchee"]').value='Blindage à remettre — chef, avant lundi';document.getElementById('ct-risque').value='Camion garé sur le cheminement piéton';document.getElementById('ct-ok').click();});await wait(400);
out.saved=await page.evaluate(()=>{const c=window.TRACE.net.qse.controles[0];return {by:c.by,chef:c.chef,conducteur:c.conducteur,presents:c.presents,nc:Object.values(c.items).filter(x=>x.e==='NC').length,photos:(c.items.ch_tranchee.photos||[]).length,list:/Contrôles chantier/.test(document.getElementById('qse').textContent)&&!!document.querySelector('#qse [data-ctopen]')};});
const [pop2]=await Promise.all([page.waitForEvent('popup'),page.evaluate(()=>document.querySelector('#qse [data-ctopen]').click())]);await pop2.waitForLoadState('domcontentloaded');
out.report=await pop2.evaluate(()=>({t:/Contrôle chantier/.test(document.body.textContent),chef:/Ethan L\./.test(document.body.textContent),cond:/Sophie M\./.test(document.body.textContent),img:document.querySelectorAll('table img').length,leg:/C = conforme/.test(document.body.textContent)}));await pop2.close();
await page.evaluate(()=>document.getElementById('btnHome').click());await wait(300);await asUser('ethan','htExpl');
await page.evaluate(async()=>{[...document.querySelectorAll('#eq-app .ac-row')].find(x=>/^Contrôles chantier/.test(x.querySelector('.tx b').textContent)).click();await new Promise(r=>setTimeout(r,200));});
out.suivi=await page.evaluate(()=>{const t=document.getElementById('eq-app').textContent;return {obj:/un contrôle par chantier actif toutes les 2 semaines/.test(t),who:[...document.querySelectorAll('#eq-app table.rc tr')].some(tr=>/Ethan L\./.test(tr.textContent)),caen:[...document.querySelectorAll('#eq-app table.rc tr')].some(tr=>/Caen/.test(tr.textContent)&&/0 j/.test(tr.textContent)),row:!!document.querySelector('#eq-app [data-act=ctopen]')};});
console.log('4) contrôle chantier + suivi :',JSON.stringify(out));
C.c4=out.leg.length===4&&/^C Conforme/.test(out.leg[0])&&/Karim B\./.test(out.pres)&&out.chef&&out.cond&&out.lieu==='Caen'&&out.ph===32&&out.afterPhoto.thumbs===1&&out.afterPhoto.nc&&out.afterPhoto.act&&out.saved.by==='Ethan L.'&&out.saved.chef==='Ethan L.'&&out.saved.conducteur==='Sophie M.'&&/Karim B\./.test(out.saved.presents)&&out.saved.nc===1&&out.saved.photos===1&&out.saved.list&&out.report.t&&out.report.chef&&out.report.cond&&out.report.img===1&&out.report.leg&&out.suivi.obj&&out.suivi.who&&out.suivi.caen&&out.suivi.row;
// ── 5) textes de prévention (retours Ethan) + règlement intérieur intégral
out=await page.evaluate(()=>{const P=window.TRACE.docs.prevention||null;return P?{jug:/jugulaire/.test(P.epi.html),repas:/dans son véhicule/.test(P.hygiene.html)&&/jamais ailleurs/.test(P.hygiene.html),angers:/Angers/.test(P.circulation.html)}:null;});
console.log('5) textes de prévention :',JSON.stringify(out));
C.c5=!!out&&!out.jug&&out.repas&&!out.angers;
const bad=Object.entries(C).filter(([k,v])=>!v).map(([k])=>k);console.log(bad.length?'RESULTAT: ECHEC '+bad.join(','):'RESULTAT: TOUT VERT');console.log(logs.length?logs:'[]');
await browser.close();
