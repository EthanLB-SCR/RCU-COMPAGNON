// DOCUMENTS D'ENTREPRISE + ACCUEIL CHANTIER (parcours) + CONTRÔLE CHANTIER (nuit 09→10/10) : hors connexion (personnages de démo, registre sur l'appareil).
// 1) notifications : règlement intérieur et accueil nouvel arrivant tout en haut ; 2) Mon espace → Documents : lecture déroulée → signature ; 3) questionnaire point par point ;
// 4) parcours d'accueil chantier (PPSPS papier, 10 points, modules de prévention, DICT absente, signature) ; 5) contrôle chantier (trame SCR) ; 6) note de service créée par Ethan → à signer chez Karim.
import { chromium } from 'playwright';
const BASE=process.env.BASE||'http://localhost:8765';
const browser=await chromium.launch({headless:true, executablePath: process.env.CHROMIUM_PATH||undefined});
const ctx=await browser.newContext({viewport:{width:430,height:900}});const page=await ctx.newPage();
const logs=[];page.on('pageerror',e=>logs.push('PAGEERROR: '+e.message.slice(0,300)));page.on('console',m=>{if(m.type()==='error'&&!/supabase|Failed to fetch|net::ERR|404|WebSocket/i.test(m.text()))logs.push(m.text().slice(0,200));});
page.on('dialog',d=>d.accept().catch(()=>{}));
const C={};const wait=ms=>page.waitForTimeout(ms);
await page.goto(BASE+'/index.html');await wait(600);await page.evaluate(()=>{localStorage.clear();});await page.evaluate(()=>new Promise(r=>{try{const q=indexedDB.deleteDatabase('trace-kv');q.onsuccess=q.onerror=q.onblocked=()=>r();}catch(e){r();}}));
await page.reload();await wait(1200);
const skip=async()=>{const s=await page.$('#loginSkip');if(s&&await s.isVisible())await s.click();await wait(700);};await skip();
const seed=async()=>page.evaluate(()=>{const T=window.TRACE;const src=T.sites[Object.keys(T.sites).find(k=>k!=='__vide'&&T.sites[k]&&T.sites[k].lines)];if(!src)return 0;
  const mk=(id,name,ville,secteur,extra)=>{if(T.sites[id])return;const x=JSON.parse(JSON.stringify(src));x.id=id;x.name=name;x.fiche={ville,secteur};Object.assign(x,extra||{});T.sites[id]=x;};
  mk('demo_caen','Caen — Presqu\'île','Caen','ouest',{conv:{msgs:[],seq:1},qse:{docs:[]},fiche:{ville:'Caen',secteur:'ouest',chef:'l:ethan'}});return Object.keys(T.sites).length;});
console.log('seed',await seed());await page.evaluate(()=>window.TRACE.renderHome());await wait(500);
// signature au doigt simulée : événements pointer sur le canvas
const draw=async id=>{await page.evaluate(id2=>{const cv=document.getElementById(id2);const r=cv.getBoundingClientRect();const ev=(t,x,y)=>cv.dispatchEvent(new PointerEvent(t,{bubbles:true,clientX:r.left+x,clientY:r.top+y,pointerId:1,pointerType:'touch'}));ev('pointerdown',20,40);ev('pointermove',80,60);ev('pointermove',140,30);ev('pointerup',140,30);},id);};
// ── 1) Karim : les documents d'entreprise sont les PREMIÈRES notifications ; sous-onglet Documents avec pastille 2
let out=await page.evaluate(()=>{const q=s=>document.querySelector(s);return {notifs:[...document.querySelectorAll('#eq-app .ac-notif .tx b')].map(b=>b.textContent).slice(0,4),st:(q('#eq-app .ac-h .st')||{}).textContent};});
await page.evaluate(()=>{document.getElementById('htEspace').click();});await wait(300);
out.subs=await page.evaluate(()=>[...document.querySelectorAll('#eq-app .eq-subs .chip')].map(c=>c.textContent.trim()));
console.log('1) notifications documents :',JSON.stringify(out));
C.c1=/Accueil nouvel arrivant/.test(out.notifs[0]||'')&&/Règlement intérieur/.test(out.notifs[1]||'')&&out.subs.some(x=>/^Documents\s*2$/.test(x));
// ── 2) Mon espace → Documents → règlement intérieur : bouton bloqué tant que le texte n'est pas déroulé ; déroulé → signature → signé
await page.evaluate(()=>{[...document.querySelectorAll('#eq-app .eq-subs .chip')].find(x=>/Documents/.test(x.textContent)).click();});await wait(300);
out=await page.evaluate(()=>({rows:[...document.querySelectorAll('#eq-app .ac-row .tx b')].map(b=>b.textContent),todo:document.querySelectorAll('#eq-app .ac-row.todo').length}));
await page.evaluate(()=>{[...document.querySelectorAll('#eq-app .ac-row')].find(x=>/Règlement intérieur/.test(x.textContent)).click();});await wait(500);
out.before=await page.evaluate(()=>{const b=document.getElementById('dr-read');const body=document.getElementById('dr-body');return {disabled:b.disabled,txt:b.textContent,h:body.scrollHeight,articles:body.querySelectorAll('h2').length,li:body.querySelectorAll('li').length};});
await page.evaluate(()=>{const body=document.getElementById('dr-body');body.scrollTop=body.scrollHeight/2;body.dispatchEvent(new Event('scroll'));});await wait(100);
out.mid=await page.evaluate(()=>document.getElementById('dr-read').disabled);
await page.evaluate(()=>{const body=document.getElementById('dr-body');body.scrollTop=body.scrollHeight;body.dispatchEvent(new Event('scroll'));});await wait(150);
out.after=await page.evaluate(()=>{const b=document.getElementById('dr-read');return {disabled:b.disabled,txt:b.textContent};});
await page.evaluate(()=>document.getElementById('dr-read').click());await wait(200);
out.step2=await page.evaluate(()=>document.getElementById('dr-step2').style.display!=='none'&&!!document.getElementById('dr-pad'));
await page.evaluate(()=>document.getElementById('dr-ok').click());await wait(200);out.noDraw=await page.evaluate(()=>!!document.getElementById('dr-ok')); /* sans trait : refus */
await draw('dr-pad');await page.evaluate(()=>document.getElementById('dr-ok').click());await wait(500);
out.signed=await page.evaluate(()=>{const T=window.TRACE;return {rows:[...document.querySelectorAll('#eq-app .ac-row .tx small')].map(b=>b.textContent),todo:document.querySelectorAll('#eq-app .ac-row.todo').length,sig:(T.docs&&T.docs.sig('reglement_interieur','l:karim'))||null};});
console.log('2) lecture déroulée + signature :',JSON.stringify(out));
C.c2=out.rows.length===2&&out.todo===2&&out.before.disabled&&/Déroule/.test(out.before.txt)&&out.before.articles===10&&out.before.li>20&&out.mid===true&&!out.after.disabled&&/J'ai lu en entier/.test(out.after.txt)&&out.step2&&out.noDraw&&out.signed.todo===1&&out.signed.rows.some(t=>/Règlement.*signé le/.test(t)||/signé le/.test(t))&&out.signed.sig&&out.signed.sig.name==='Karim B.'&&!!out.signed.sig.img&&!!out.signed.sig.readAt;
// ── 3) questionnaire d'accueil nouvel arrivant : point par point (10 cases) puis signature ; plus rien à signer, notification disparue
await page.evaluate(()=>{[...document.querySelectorAll('#eq-app .ac-row')].find(x=>/Accueil sécurité nouvel arrivant/.test(x.textContent)).click();});await wait(400);
out=await page.evaluate(()=>{const b=document.getElementById('dr-read');const boxes=[...document.querySelectorAll('#modal input[data-q]')];boxes.slice(0,9).forEach(x=>{x.checked=true;x.dispatchEvent(new Event('change'));});return {n:boxes.length,disabled9:b.disabled,txt9:b.textContent};});
await page.evaluate(()=>{const boxes=[...document.querySelectorAll('#modal input[data-q]')];boxes[9].checked=true;boxes[9].dispatchEvent(new Event('change'));});await wait(100);
out.ok10=await page.evaluate(()=>!document.getElementById('dr-read').disabled);
await page.evaluate(()=>document.getElementById('dr-read').click());await wait(150);await draw('dr-pad');await page.evaluate(()=>document.getElementById('dr-ok').click());await wait(500);
out.after=await page.evaluate(()=>{const T=window.TRACE;const s=T.docs.sig('accueil_entreprise','l:karim');document.getElementById('htHome').click();return {todo:document.querySelectorAll('#eq-app .ac-row.todo').length,answers:s&&s.answers&&s.answers.length,notifs:[...document.querySelectorAll('#eq-app .ac-notif .tx b')].map(b=>b.textContent)};});
console.log('3) questionnaire :',JSON.stringify(out));
C.c3=out.n===10&&out.disabled9&&/9 \/ 10/.test(out.txt9)&&out.ok10&&out.after.todo===0&&out.after.answers===10&&!out.after.notifs.some(t=>/Règlement|nouvel arrivant/.test(t));
// ── 4) accueil chantier : Ethan place Karim sur Caen → notification « Accueil chantier à faire : Caen » → ouvre le chantier sur QSE et lance le parcours
await page.evaluate(async()=>{const T=window.TRACE;T.state.userId='ethan';T.renderHome();document.getElementById('htExpl').click();await new Promise(r=>setTimeout(r,200));[...document.querySelectorAll('#eq-app .ac-row')].find(x=>/Planning des équipes/.test(x.textContent)).click();await new Promise(r=>setTimeout(r,200));
  const c=[...document.querySelectorAll('#eq-app .eq-pltray .eq-plchip')].find(x=>/Karim/.test(x.textContent));c.querySelector('.eq-plmain').click();document.querySelector('#eq-app .eq-plsite[data-drop=demo_caen] [data-act=plput]').click();});await wait(400);
await page.evaluate(()=>{window.TRACE.state.userId='karim';document.getElementById('htHome').click();});await wait(400);
out=await page.evaluate(()=>({notifs:[...document.querySelectorAll('#eq-app .ac-notif .tx b')].map(b=>b.textContent)}));
await page.evaluate(()=>{[...document.querySelectorAll('#eq-app .ac-notif')].find(x=>/Accueil chantier à faire/.test(x.textContent)).click();});await wait(1800);
out.open=await page.evaluate(()=>({screen:window.TRACE.state.screen,tab:window.TRACE.state.tab,modal:document.getElementById('modal').classList.contains('show'),title:(document.querySelector('#modal .pv-title')||{}).textContent,paper:!!document.getElementById('pv-paper'),btn:document.getElementById('pv-read')&&document.getElementById('pv-read').disabled}));
console.log('4a) notification → parcours :',JSON.stringify(out));
C.c4a=out.notifs.some(t=>/Accueil chantier à faire : Caen/.test(t))&&out.open.screen==='site'&&out.open.tab==='qse'&&out.open.modal&&/PPSPS/.test(out.open.title)&&out.open.paper&&out.open.btn===true;
// PPSPS sur papier → point 1 ; points 2..10 : modules à lire (déroulés) avant de cocher ; DICT absente → avertissement ; signature → émargement avec parcours
await page.evaluate(()=>{const cb=document.getElementById('pv-paper');cb.checked=true;cb.dispatchEvent(new Event('change'));document.getElementById('pv-read').click();});await wait(200);
const steps=[];
for(let n=1;n<=10;n++){const st=await page.evaluate(()=>({title:(document.querySelector('#modal .pv-title')||{}).textContent,q:(document.querySelector('#modal .pv-q span')||{}).textContent,mods:[...document.querySelectorAll('#modal [data-pvmod]')].map(b=>b.dataset.pvmod),chkDisabled:document.getElementById('pv-chk').disabled,dict:!!document.querySelector('#modal .pv-dict'),warn:!!document.querySelector('#modal .pv-dict .warnbox')}));
  for(const m of st.mods){await page.evaluate(id=>{[...document.querySelectorAll('#modal [data-pvmod]')].find(b=>b.dataset.pvmod===id).click();},m);await wait(150);
    const rd=await page.evaluate(()=>({disabled:document.getElementById('pv-mread').disabled,h:document.getElementById('pv-mod').scrollHeight}));
    await page.evaluate(()=>{const b=document.getElementById('pv-mod');b.scrollTop=b.scrollHeight;b.dispatchEvent(new Event('scroll'));});await wait(120);
    const rd2=await page.evaluate(()=>document.getElementById('pv-mread').disabled);st['mod_'+m]=rd.disabled&&!rd2;await page.evaluate(()=>document.getElementById('pv-mread').click());await wait(150);}
  st.chkAfter=await page.evaluate(()=>document.getElementById('pv-chk').disabled);
  await page.evaluate(()=>{const cb=document.getElementById('pv-chk');cb.checked=true;cb.dispatchEvent(new Event('change'));document.getElementById('pv-next').click();});await wait(150);steps.push(st);}
out=await page.evaluate(()=>({title:(document.querySelector('#modal .pv-title')||{}).textContent,pad:!!document.getElementById('pv-pad')}));
await draw('pv-pad');await page.evaluate(()=>document.getElementById('pv-sign').click());await wait(600);
out.after=await page.evaluate(()=>{const T=window.TRACE;const q=T.net.qse;const d=q.docs.find(x=>x.standing);const s=d&&d.sigs[0];return {standing:!!d,title:d&&d.title,sigs:d&&d.sigs.length,parcours:s&&s.parcours&&{ppsps:s.parcours.ppsps&&s.parcours.ppsps.mode,q:Object.keys(s.parcours.q).length,read:s.parcours.read.length,dictMissing:s.parcours.dictMissing},done:document.getElementById('qse').textContent.includes('accueil chantier fait'),modalOk:/Accueil chantier signé/.test(document.getElementById('modal').textContent),modalTxt:document.getElementById('modal').textContent.replace(/\s+/g,' ').slice(0,160),show:document.getElementById('modal').className};});
console.log('4b) logs :',JSON.stringify(logs));console.log('4b) parcours :',JSON.stringify({steps:steps.map(s=>({q:s.q.slice(0,30),mods:s.mods,ok:Object.keys(s).filter(k=>k.startsWith('mod_')).every(k=>s[k]),chk:[s.chkDisabled,s.chkAfter],dict:s.dict,warn:s.warn})),sign:out}));
C.c4b=steps.length===10&&steps.every(s=>s.chkDisabled===(s.mods.length>0)&&s.chkAfter===false&&Object.keys(s).filter(k=>k.startsWith('mod_')).every(k=>s[k]))&&steps[3].dict&&steps[3].warn&&steps[2].mods.join()==='epi'&&steps[3].mods.join()==='reseaux,tranchee'&&steps[9].mods.join()==='basevie,chimie'&&/Signature/.test(out.title)&&out.pad&&out.after.standing&&/Accueil chantier — Caen/.test(out.after.title)&&out.after.sigs===1&&out.after.parcours.ppsps==='papier'&&out.after.parcours.q===10&&out.after.parcours.read===11&&out.after.parcours.dictMissing&&out.after.done&&out.after.modalOk;
// ── 5) Ethan : contrôle chantier (trame SCR) — C / NC / NA / NV + action, situation à risque → enregistré, listé avec le nombre de NC
await page.evaluate(()=>{document.querySelector('#modal [data-close]').click();window.TRACE.state.userId='ethan';window.TRACE.renderAll();});await wait(300);
await page.evaluate(()=>document.getElementById('qse-controle').click());await wait(300);
out=await page.evaluate(()=>{const items=document.querySelectorAll('#modal .ct-item').length;const secs=[...document.querySelectorAll('#modal .ct-sec')].map(x=>x.textContent);const click=(k,e)=>document.querySelector(`#modal [data-ct="${k}"][data-e="${e}"]`).click();click('bv_rang','C');click('ch_place','NC');click('eq_trousse','NC');click('ch_carbu','NA');click('eq_itopo','NV');
  document.querySelector('#modal [data-act-k="ch_place"]').value='Manque de place rue Margat';document.getElementById('ct-lieu').value='Lycée Jean Moulin';document.getElementById('ct-risque').value='Transfert de tubes sur voie publique';const actVisible=document.querySelector('#modal [data-act-k="ch_place"]').style.display!=='none';document.getElementById('ct-ok').click();return {items,secs,actVisible};});await wait(400);
out.after=await page.evaluate(()=>{const q=window.TRACE.net.qse;const c=q.controles&&q.controles[0];return {n:q.controles&&q.controles.length,nc:c&&Object.values(c.items).filter(x=>x.e==='NC').length,items:c&&Object.keys(c.items).length,action:c&&c.items.ch_place.action,lieu:c&&c.lieu,list:[...document.querySelectorAll('#qse [data-ctopen]')].map(b=>b.textContent.replace(/\s+/g,' ').trim())};});
console.log('5) contrôle chantier :',JSON.stringify(out));
C.c5=out.items===32&&out.secs.length>=5&&out.actVisible&&out.after.n===1&&out.after.nc===2&&out.after.items===5&&/Margat/.test(out.after.action)&&out.after.lieu==='Lycée Jean Moulin'&&out.after.list.length===1&&/2 NC/.test(out.after.list[0]);
// ── 6) Exploitation → Documents d'entreprise (Ethan) : liste avec compteurs ; nouvelle note de service pour les soudeurs → Karim la voit « à signer », Julien (manchonneur) non
await page.evaluate(()=>{document.getElementById('btnHome').click();});await wait(400);await page.evaluate(()=>{document.getElementById('htExpl').click();});await wait(200);
await page.evaluate(()=>{[...document.querySelectorAll('#eq-app .ac-row')].find(x=>/Documents d.entreprise/.test(x.textContent)).click();});await wait(300);
out=await page.evaluate(()=>({rows:[...document.querySelectorAll('#eq-app .ac-row .tx > b')].map(b=>b.textContent),counts:[...document.querySelectorAll('#eq-app .ac-row .tx small b')].map(b=>b.textContent),btn:!!document.querySelector('#eq-app [data-act=docnew]')}));
await page.evaluate(()=>document.querySelector('#eq-app [data-act=docnew]').click());await wait(300);
await page.evaluate(()=>{document.getElementById('dn-title').value='Note de service n° 12 — horaires d\'hiver';document.getElementById('dn-text').value='À partir du 3 novembre, embauche à 8 h sur tous les chantiers.\nLe chef de chantier adapte la fin de journée.';const r=document.querySelector('#modal input[name=dn-req][value=postes]');r.checked=true;r.dispatchEvent(new Event('change'));document.querySelector('#dn-postes input[data-poste=soudeur]').checked=true;document.getElementById('dn-ok').click();});await wait(500);
out.after=await page.evaluate(()=>({rows:[...document.querySelectorAll('#eq-app .ac-row .tx > b')].map(b=>b.textContent)}));
out.karim=await page.evaluate(()=>{const T=window.TRACE;T.state.userId='karim';document.getElementById('htHome').click();return [...document.querySelectorAll('#eq-app .ac-notif .tx b')].map(b=>b.textContent);});
out.julien=await page.evaluate(()=>{const T=window.TRACE;T.state.userId='julien';T.renderHome();return [...document.querySelectorAll('#eq-app .ac-notif .tx b')].map(b=>b.textContent);});
console.log('6) documents d\'entreprise + note de service :',JSON.stringify(out));
C.c6=out.rows.length===2&&out.counts.some(t=>/1 \/ \d/.test(t))&&out.btn&&out.after.rows.length===3&&out.after.rows.some(t=>/Note de service n° 12/.test(t))&&out.karim.some(t=>/À lire et signer : Note de service n° 12/.test(t))&&!out.julien.some(t=>/Note de service n° 12/.test(t))&&out.julien.some(t=>/Règlement intérieur/.test(t))&&!out.julien.some(t=>/Accueil chantier/.test(t)); /* Julien n'est pas placé à Caen : l'accueil permanent ne le réclame pas */
const bad=Object.entries(C).filter(([k,v])=>!v).map(([k])=>k);console.log(bad.length?'RESULTAT: ECHEC '+bad.join(','):'RESULTAT: TOUT VERT');console.log(logs.length?logs:'[]');
await browser.close();
