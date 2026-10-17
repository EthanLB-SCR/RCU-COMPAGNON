// 15/10 (lot E) — COMPTEUR D'ÉCHÉANCE DES DOCUMENTS ADMINISTRATIFS (Ethan : « pour les documents administratifs de l'entreprise, quand je les aurai posés, il faudrait
// mettre un compteur après de quand ils sont expirés et qu'il faut les remplacer »). Hors connexion (Ethan, administrateur), documents FICTIFS posés dans le registre
// « entdoc » de l'appareil, échéances calculées depuis aujourd'hui (date de Paris) : attestation fiscale −3 j (expirée, une ancienne version), URSSAF aujourd'hui,
// Kbis +20 j, assurance RC +60 j, RIB sans échéance ; décennale et qualifications à déposer.
// (1) SCR → Documents administratifs : textes et couleurs des compteurs, barre de validité, date exacte, tri par urgence, « 📎 Remplacer » principal sur l'expiré, en-tête ;
// (2) ligne du hub SCR et « À faire » ; (3) 7 · Offre → Documents obligatoires : compteur et contrôle à la date de remise ; (4) remplacement par l'écran (ancienne version
// gardée, nouveau tri, « Prochaine échéance : … dans N j (le JJ/MM) », hub « Kbis J-20 ») ; (5) le temps passe (horloge avancée, appareil réglé en UTC à 23 h 30) :
// le compteur continue de monter, jours comptés à la date de Paris ; (6) téléphone 390 px : rien ne déborde, boutons ≥ 34 px ; (7) zéro erreur console.
// SHOTS=<dossier> : captures pour relecture (hors dépôt).
import { chromium } from 'playwright';
import fs from 'fs';import path from 'path';
process.env.TZ='Europe/Paris'; // les dates du test sont celles de Paris, comme celles de l'appli
const BASE=process.env.BASE||'http://localhost:8765';const SHOTS=process.env.SHOTS||'';
const browser=await chromium.launch({headless:true, executablePath: process.env.CHROMIUM_PATH||undefined});
const C={};const logs=[];
const iso=d=>d.getFullYear()+'-'+String(d.getMonth()+1).padStart(2,'0')+'-'+String(d.getDate()).padStart(2,'0');const plus=n=>{const d=new Date();d.setDate(d.getDate()+n);return iso(d);};
const fr=s=>s.slice(8,10)+'/'+s.slice(5,7)+'/'+s.slice(0,4);const jm=s=>s.slice(8,10)+'/'+s.slice(5,7);
const pdfData=t=>'data:application/pdf;base64,'+Buffer.from('%PDF-1.4\n% fichier FICTIF de test : '+t+'\n%%EOF\n','utf8').toString('base64');
const pdf=t=>Buffer.from('%PDF-1.4\n% fichier FICTIF de test : '+t+'\n%%EOF\n','utf8');
const NOW=new Date().toISOString();const ago=n=>new Date(Date.now()-n*86400000).toISOString();
const row=(id,o)=>({id,data:Object.assign({type:id,file:id+'-fictif.pdf',data:pdfData(id),mime:'application/pdf',size:80,at:NOW,by:'Ethan (test)'},o),updated_at:NOW});
const ENT={fiscale:row('fiscale',{title:'Attestation de régularité fiscale',validUntil:plus(-3),at:ago(200),prev:[{file:'fiscale-ancienne-fictive.pdf',url:null,validUntil:plus(-368),at:ago(565),by:'Ethan (test)'}]}),
  urssaf:row('urssaf',{title:'Attestation de vigilance URSSAF',validUntil:plus(0),at:ago(150)}),kbis:row('kbis',{title:'Extrait Kbis',validUntil:plus(20)}),
  assurance_rc:row('assurance_rc',{title:'Attestation d\'assurance responsabilité civile',validUntil:plus(60),assureur:'Assureur fictif',police:'POL-TEST-1',garanties:'RC exploitation : 1 000 000 € par sinistre (fictif)'}),
  rib:row('rib',{title:'RIB'})};
async function open(opts,clock){const ctx=await browser.newContext(Object.assign({acceptDownloads:true,timezoneId:'Europe/Paris',viewport:{width:1280,height:900}},opts));const page=await ctx.newPage();
  page.on('pageerror',e=>logs.push('PAGEERROR: '+e.message.slice(0,300)));page.on('console',m=>{if(m.type()==='error'&&!/supabase|Failed to fetch|net::ERR|404|WebSocket/i.test(m.text()))logs.push(m.text().slice(0,200));});page.on('dialog',d=>d.accept().catch(()=>{}));
  if(clock)await page.clock.setFixedTime(clock);
  await page.goto(BASE+'/index.html');await page.waitForTimeout(600);
  await page.evaluate(ent=>new Promise((res,rej)=>{localStorage.clear();const r=indexedDB.open('trace-kv',1);r.onupgradeneeded=()=>{r.result.createObjectStore('kv');};r.onerror=()=>rej(r.error);
    r.onsuccess=()=>{const db=r.result;const t=db.transaction('kv','readwrite');const st=t.objectStore('kv');st.clear();st.put(ent,'trace:reg:entdoc');t.oncomplete=()=>{db.close();res();};t.onerror=()=>rej(t.error);};}),ENT);
  await page.reload();await page.waitForTimeout(1200);{const s=await page.$('#loginSkip');if(s&&await s.isVisible())await s.click();await page.waitForTimeout(700);}
  await page.evaluate(()=>{const T=window.TRACE;T.state.userId='ethan';T.renderHome();});await page.waitForTimeout(300);return {ctx,page};}
let {ctx,page}=await open({});
const wait=ms=>page.waitForTimeout(ms);
const shot=async n=>{if(!SHOTS)return;fs.mkdirSync(SHOTS,{recursive:true});await wait(200);await page.screenshot({path:path.join(SHOTS,n+'.png'),fullPage:true});};
const click=async(v,act)=>{const ok=await page.evaluate(([v,a])=>{const b=document.querySelector(`#eq-app [data-act=${a}][data-v="${v}"]`);if(b)b.click();return !!b;},[v,act||'af']);await wait(300);return ok;};
const goEnt=async()=>{await page.evaluate(()=>{window.TRACE.renderHome();document.getElementById('htEnt').click();});await wait(350);await page.evaluate(()=>{[...document.querySelectorAll('#eq-app .ac-row')].find(x=>/Documents administratifs \(offres\)/.test(x.textContent)).click();});await wait(350);};
const view=()=>page.evaluate(()=>{const R=[...document.querySelectorAll('#eq-app .dob-erow')];return {h2:(document.querySelector('#eq-app h2.vt')||{}).textContent||'',
  rows:R.map(r=>{const p=r.querySelector('.ec-pill');const b=r.querySelector('.ec-bar');const st=r.querySelector('.dob-st');const ra=r.querySelector('.dob-ra');const bt=[...ra.querySelectorAll('button')];const ed=ra.querySelector('[data-v^="dob|edit|"]');
    return {id:r.dataset.ent,k:r.dataset.cpt,pill:p?p.textContent:'',pc:p?p.className:'',fill:b?+b.dataset.fill:null,ratio:b?Math.round(100*b.querySelector('i').getBoundingClientRect().width/b.getBoundingClientRect().width):null,st:st?st.textContent:'',
      first:bt[0]?bt[0].textContent:'',firstPrim:!!(bt[0]&&bt[0].classList.contains('primary')),edit:ed?ed.textContent+(ed.classList.contains('primary')?' [P]':''):'',hint:(ra.querySelector('.hint')||{}).textContent||''};}),
  now:(document.getElementById('ec-now')||{}).textContent||'',next:(document.getElementById('ec-next')||{}).textContent||'',nextCls:(document.getElementById('ec-next')||{}).className||'',kpis:[...document.querySelectorAll('#eq-app .eq-kpi')].map(k=>k.querySelector('b').textContent+' '+k.querySelector('small').textContent)};});
const R1=o=>o.rows.reduce((m,r)=>(m[r.id]=r,m),{});
// ── 1) SCR → Documents administratifs : compteurs, couleurs, barre, date exacte, tri, bouton principal de l'expiré, en-tête
await goEnt();let out=await view();let M=R1(out);await shot('01_documents_admin');
console.log('1) écran :',JSON.stringify(out));
C.c1=/Documents administratifs de l'entreprise/.test(out.h2)&&out.rows.map(r=>r.id).join()==='fiscale,urssaf,kbis,assurance_rc,rib,assurance_decennale,qualification'
  &&M.fiscale.pill==='expiré depuis 3 j · à remplacer'&&/\bbad\b/.test(M.fiscale.pc)&&M.fiscale.fill===0&&M.fiscale.st==='expiré le '+fr(plus(-3))&&M.fiscale.first==='📎 Remplacer'&&M.fiscale.firstPrim&&M.fiscale.hint==='1 ancienne version'
  &&M.urssaf.pill==='expire aujourd\'hui · à renouveler'&&/\bwarn\b/.test(M.urssaf.pc)&&M.urssaf.fill===0&&M.urssaf.st==='expire le '+fr(plus(0))+' (J-0)'
  &&M.kbis.pill==='J-20 · à renouveler'&&/\bwarn\b/.test(M.kbis.pc)&&M.kbis.fill>=15&&M.kbis.fill<=30&&Math.abs(M.kbis.ratio-M.kbis.fill)<=2&&M.kbis.st==='expire le '+fr(plus(20))+' (J-20)'&&M.kbis.first==='⤓ Ouvrir'&&M.kbis.edit==='📎 Remplacer / ✎ dates'
  &&M.assurance_rc.pill==='encore 60 j'&&/\bok\b/.test(M.assurance_rc.pc)&&M.assurance_rc.fill>=10&&M.assurance_rc.fill<=25&&Math.abs(M.assurance_rc.ratio-M.assurance_rc.fill)<=2&&M.assurance_rc.st==='valide jusqu\'au '+fr(plus(60))&&M.assurance_rc.edit==='📎 Remplacer / ✎ dates'
  &&M.rib.pill==='sans échéance'&&/\bmute\b/.test(M.rib.pc)&&M.rib.fill===null&&M.assurance_decennale.pill===''&&M.assurance_decennale.st==='à déposer'&&M.assurance_decennale.edit==='📎 Déposer [P]'&&M.qualification.st==='à déposer'
  &&out.now==='⚠ 1 à remplacer maintenant : Attestation fiscale (expiré depuis 3 j)'&&out.next==='⏳ Prochaine échéance : URSSAF aujourd\'hui (le '+jm(plus(0))+')'
  &&out.kpis.join('|')==='2 valides|2 à renouveler (≤ 30 j)|1 expirés|2 à déposer';
// ── 2) hub SCR (prochaine échéance) et « À faire » (« expiré depuis N j »), qui mène à l'écran
await page.evaluate(()=>document.querySelector('#eq-app .ac-back')&&document.querySelector('#eq-app .ac-back').click());await wait(300);
const hub=()=>page.evaluate(()=>{const r=[...document.querySelectorAll('#eq-app .ac-row')].find(x=>/Documents administratifs \(offres\)/.test(x.textContent));return r?{s:r.querySelector('.tx small').textContent,n:(r.querySelector('.ac-n')||{}).textContent||'',nc:(r.querySelector('.ac-n')||{}).className||''}:null;});
const todo=()=>page.evaluate(()=>{const n=[...document.querySelectorAll('#eq-app .ac-notif')].find(x=>/document|Kbis|URSSAF|fiscale/i.test(x.textContent)&&x.textContent.includes('🗂'));return n?{t:n.querySelector('.tx b').textContent,s:(n.querySelector('.tx small')||{}).textContent||'',when:n.querySelector('.when').textContent,cls:n.className}:null;});
out={hub:await hub()};await shot('02_hub');
await page.evaluate(()=>document.getElementById('htHome').click());await wait(400);out.todo=await todo();await shot('03_a_faire');
await page.evaluate(()=>{const n=[...document.querySelectorAll('#eq-app .ac-notif')].find(x=>x.textContent.includes('🗂')&&/documents administratifs/.test(x.textContent));if(n)n.click();});await wait(400);out.go=(await view()).h2;
console.log('2) hub et À faire :',JSON.stringify(out));
C.c2=out.hub&&out.hub.s==='⚠ Attestation fiscale : expiré depuis 3 j · prochaine : URSSAF expire aujourd\'hui'&&out.hub.n==='3 à renouveler'&&/\bbad\b/.test(out.hub.nc)
  &&out.todo&&out.todo.t==='3 documents administratifs à renouveler dont 1 expiré'&&out.todo.s==='Attestation fiscale : expiré depuis 3 j (le '+jm(plus(-3))+') · URSSAF : expire aujourd\'hui (le '+jm(plus(0))+') · Kbis : expire dans 20 jours (le '+jm(plus(20))+') — dépose le nouveau (joint aux offres)'
  &&out.todo.when==='J+3'&&/\bbad\b/.test(out.todo.cls)&&/Documents administratifs de l'entreprise/.test(out.go);
// ── 3) 7 · Offre → Documents obligatoires (remise dans 30 jours) : compteur de chaque document + contrôle à la date de remise
const NUM='O2610-77';
await page.evaluate(()=>{document.getElementById('htCom').click();});await wait(300);
await click('new|');await page.evaluate(n=>{document.getElementById('afn-num').value=n;document.getElementById('afn-nom').value='Ville fictive — offre test lot E';document.getElementById('afn-client').value='CLIENT FICTIF';document.getElementById('afn-etat').value='devis';},NUM);await click('create|');
await page.evaluate(([n,d])=>window.TRACE.affaires.set(n,{dateReponse:d}),[NUM,plus(30)]);await click('tab|offre');
const offre=()=>page.evaluate(()=>{const o={};[...document.querySelectorAll('#dob-offre .dob-row[data-key^="e:"]')].forEach(r=>{const p=r.querySelector('.ec-line .ec-pill');const m=r.querySelector('.ec-rem');const b=r.querySelector('.ec-bar');
  o[r.dataset.key.slice(2)]={st:r.querySelector('.dob-st').textContent,pill:p?p.textContent:'',rem:m?m.textContent:'',rc:m?m.className:'',bar:b?+b.dataset.fill:null};});
  const lab=[...document.querySelectorAll('#dob-offre .eq-lab')].map(x=>x.textContent).find(t=>/Documents administratifs de l'entreprise/.test(t))||'';return {o,lab};});
out=await offre();await page.evaluate(()=>{const s=document.getElementById('dob-offre');if(s)s.scrollIntoView();});await shot('04_offre');
console.log('3) offre :',JSON.stringify(out));const O=out.o;
C.c3=O.assurance_rc&&O.assurance_rc.pill==='encore 60 j'&&O.assurance_rc.rem==='✓ valable à la remise ('+jm(plus(30))+')'&&/\bok\b/.test(O.assurance_rc.rc)&&O.assurance_rc.st==='valide jusqu\'au '+fr(plus(60))&&O.assurance_rc.bar>0
  &&O.kbis.pill==='J-20 · à renouveler'&&O.kbis.rem==='✗ expire 10 j avant la remise'&&/\bbad\b/.test(O.kbis.rc)&&/expire avant la remise/.test(O.kbis.st)
  &&O.urssaf.pill==='expire aujourd\'hui · à renouveler'&&O.urssaf.rem==='✗ expire 30 j avant la remise'&&O.fiscale.pill==='expiré depuis 3 j · à remplacer'&&O.fiscale.rem==='✗ déjà expiré : pas valable à la remise ('+jm(plus(30))+')'
  &&O.rib.pill==='sans échéance'&&O.rib.rem==='✓ valable à la remise ('+jm(plus(30))+')'&&O.assurance_decennale.pill===''&&O.assurance_decennale.rem===''&&/^à déposer/.test(O.assurance_decennale.st)
  &&/· 7 dans la remise · ✗ 3 pas valables à la remise$/.test(out.lab); // 16/10 soir (lot AM) : le premier RIB déposé est d'office dans la remise (avant : 6, RIB décoché d'office)
// ── 4) remplacement par l'écran : l'expiré (bouton principal) puis l'URSSAF → ancienne version gardée, nouveau tri, « Prochaine échéance : Kbis dans 20 j », hub, « À faire »
await click('x:dob:ent','xgo');out={h2:(await view()).h2};
await click('dob|edit|fiscale','x');await page.setInputFiles('#ed-file',{name:'fiscale-nouvelle-fictive.pdf',mimeType:'application/pdf',buffer:pdf('fiscale 2')});await page.evaluate(v=>{document.getElementById('ed-valid').value=v;document.getElementById('ed-ok').click();},plus(365));await wait(800);
out.reg=await page.evaluate(()=>{const f=window.TRACE.reg.get('entdoc','fiscale');return {file:f.file,valid:f.validUntil,prev:(f.prev||[]).map(p=>p.file+'@'+p.validUntil)};});
let v=await view();M=R1(v);out.a={order:v.rows.map(r=>r.id).join(),pill:M.fiscale.pill,fill:M.fiscale.fill,hint:M.fiscale.hint,now:v.now,next:v.next};
await click('dob|edit|urssaf','x');await page.setInputFiles('#ed-file',{name:'urssaf-nouvelle-fictive.pdf',mimeType:'application/pdf',buffer:pdf('urssaf 2')});await page.evaluate(v=>{document.getElementById('ed-valid').value=v;document.getElementById('ed-ok').click();},plus(180));await wait(800);
v=await view();out.b={order:v.rows.map(r=>r.id).join(),next:v.next,nextCls:v.nextCls,now:v.now};await shot('05_apres_remplacement');
await page.evaluate(()=>document.querySelector('#eq-app .ac-back')&&document.querySelector('#eq-app .ac-back').click());await wait(300);out.hub=await hub();
await page.evaluate(()=>document.getElementById('htHome').click());await wait(400);out.todo=await todo();
console.log('4) remplacement :',JSON.stringify(out));
C.c4=/Documents administratifs de l'entreprise/.test(out.h2)&&out.reg.file==='fiscale-nouvelle-fictive.pdf'&&out.reg.valid===plus(365)&&out.reg.prev.join()==='fiscale-fictif.pdf@'+plus(-3)+',fiscale-ancienne-fictive.pdf@'+plus(-368)
  &&out.a.order==='urssaf,kbis,assurance_rc,fiscale,rib,assurance_decennale,qualification'&&/^encore 36[45] j$/.test(out.a.pill)&&out.a.fill>=95&&out.a.hint==='2 anciennes versions'&&out.a.now===''&&out.a.next==='⏳ Prochaine échéance : URSSAF aujourd\'hui (le '+jm(plus(0))+')'
  &&out.b.order==='kbis,assurance_rc,urssaf,fiscale,rib,assurance_decennale,qualification'&&out.b.next==='⏳ Prochaine échéance : Kbis dans 20 j (le '+jm(plus(20))+')'&&/\bwarn\b/.test(out.b.nextCls)&&out.b.now===''
  &&out.hub&&out.hub.s==='Prochaine échéance : Kbis J-20'&&out.hub.n==='1 à renouveler'&&out.todo&&out.todo.t==='Kbis expire dans 20 jours'&&out.todo.when==='J-20'&&/\bwarn\b/.test(out.todo.cls);
// ── 5) le temps passe : appareil réglé en UTC, horloge à 23 h 30 UTC (= le lendemain à Paris) → jours comptés à la date de Paris, le compteur de l'expiré continue de monter
const T0=new Date();const T=new Date(Date.UTC(T0.getFullYear(),T0.getMonth(),T0.getDate()+4,23,30));
const pDay=new Intl.DateTimeFormat('en-CA',{timeZone:'Europe/Paris',year:'numeric',month:'2-digit',day:'2-digit'}).formatToParts(T).reduce((m,p)=>(m[p.type]=p.value,m),{});const PD=pDay.year+'-'+pDay.month+'-'+pDay.day;
const dd=(a,b)=>Math.round((Date.UTC(+b.slice(0,4),+b.slice(5,7)-1,+b.slice(8,10))-Date.UTC(+a.slice(0,4),+a.slice(5,7)-1,+a.slice(8,10)))/86400000);const k=dd(plus(0),PD); // = 5 jours plus tard à Paris (4 en UTC)
const U=await open({timezoneId:'UTC'},T);const p2=page;page=U.page;
await goEnt();out=await view();M=R1(out);out.k=k;out.utc=T.toISOString().slice(0,10);out.paris=PD;out.dev=await page.evaluate(()=>new Date().toString());await shot('06_cinq_jours_plus_tard_utc');
console.log('5) le temps passe :',JSON.stringify(out));
C.c5=k===5&&out.utc!==PD&&/GMT\+0000/.test(out.dev)&&out.rows.map(r=>r.id).join()==='fiscale,urssaf,kbis,assurance_rc,rib,assurance_decennale,qualification'
  &&M.fiscale.pill==='expiré depuis 8 j · à remplacer'&&M.urssaf.pill==='expiré depuis 5 j · à remplacer'&&/\bbad\b/.test(M.urssaf.pc)&&M.urssaf.first==='📎 Remplacer'&&M.urssaf.firstPrim&&M.kbis.pill==='J-15 · à renouveler'&&M.assurance_rc.pill==='encore 55 j'
  &&out.now==='⚠ 2 à remplacer maintenant : Attestation fiscale (expiré depuis 8 j), URSSAF (expiré depuis 5 j)'&&out.next==='⏳ Prochaine échéance : Kbis dans 15 j (le '+jm(plus(20))+')'&&out.kpis.join('|')==='2 valides|1 à renouveler (≤ 30 j)|2 expirés|2 à déposer';
await U.ctx.close();page=p2;
// ── 6) téléphone 390 px : écran des documents et section de l'offre — rien ne déborde, boutons ≥ 34 px
const fit=sel=>page.evaluate(sel=>{const W=document.documentElement.clientWidth;const over=[];document.querySelectorAll(sel).forEach(el=>{el.querySelectorAll('*').forEach(x=>{const r=x.getBoundingClientRect();if(r.width&&(r.right>W+0.5||r.left<-0.5))over.push((x.className||x.tagName)+':'+Math.round(r.left)+'→'+Math.round(r.right));});});
  const small=[...document.querySelectorAll(sel)].flatMap(el=>[...el.querySelectorAll('button,a.btn')]).filter(b=>b.offsetParent&&b.getBoundingClientRect().height<34).map(b=>b.textContent.trim()+':'+Math.round(b.getBoundingClientRect().height));
  const pills=[...document.querySelectorAll(sel)].flatMap(el=>[...el.querySelectorAll('.ec-pill')]).filter(p=>{const r=p.getBoundingClientRect(),q=p.closest('.dob-erow,.dob-row').getBoundingClientRect();return r.right>q.right+0.5||r.left<q.left-0.5;}).length;
  return {W,sw:document.documentElement.scrollWidth,over:over.slice(0,6),small:small.slice(0,8),pills};},sel);
await page.setViewportSize({width:390,height:844});await wait(300);await goEnt();out={ent:await fit('#eq-app .dob-erow, #eq-app .ec-head, #eq-app .eq-kpis')};await shot('07_telephone_documents');
await page.evaluate(n=>{const AS=window.TRACE.affaires.state();AS.cur=n;AS.view='fiche';AS.tab='offre';document.getElementById('htCom').click();},NUM);await wait(400);if(!(await page.$('#dob-offre')))await click('tab|offre');
out.offre=await fit('#dob-offre .dob-row[data-key^="e:"]');out.offreN=await page.evaluate(()=>document.querySelectorAll('#dob-offre .dob-row[data-key^="e:"] .ec-line').length);await page.evaluate(()=>{const s=document.getElementById('dob-offre');if(s)s.scrollIntoView();});await shot('08_telephone_offre');
console.log('6) 390 px :',JSON.stringify(out));
C.c6=out.ent.W===390&&out.ent.sw<=390&&!out.ent.over.length&&!out.ent.small.length&&!out.ent.pills&&out.offreN===5&&out.offre.sw<=390&&!out.offre.over.length&&!out.offre.small.length&&!out.offre.pills;
// ── 7) zéro erreur console
C.c7=!logs.length;
const bad=Object.entries(C).filter(([k,v])=>!v).map(([k])=>k);console.log(logs.length?logs:'[]');console.log(bad.length?'RESULTAT: ECHEC '+bad.join(','):'RESULTAT: TOUT VERT');
await browser.close();
