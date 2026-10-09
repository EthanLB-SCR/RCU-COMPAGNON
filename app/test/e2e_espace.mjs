// MON ESPACE & ENTREPRISE (import de la maquette, 09/10 soir) : onglets de l'accueil selon les droits, accueil « Bonjour », avatar SCR (kit) modifiable et gardé,
// contact d'urgence enregistré, pointage de la journée gardé, fiche d'une personne (panneau), annuaire Entreprise par poste avec filtres,
// puis avec un serveur simulé : fiches people lues, écritures envoyées par partie (people_set_part) et pointage (pointage_set), écriture en attente rejouée.
import { chromium, devices } from 'playwright';
const BASE=process.env.BASE||'http://localhost:8765';
const browser=await chromium.launch({headless:true, executablePath: process.env.CHROMIUM_PATH||undefined});
const ctx=await browser.newContext({viewport:{width:430,height:900}});const page=await ctx.newPage();
const logs=[];page.on('pageerror',e=>logs.push('PAGEERROR: '+e.message.slice(0,300)));page.on('console',m=>{if(m.type()==='error'&&!/supabase|Failed to fetch|net::ERR|404|WebSocket/i.test(m.text()))logs.push(m.text().slice(0,200));});
page.on('dialog',d=>d.accept().catch(()=>{}));
const C={};
await page.goto(BASE+'/index.html');await page.waitForTimeout(600);await page.evaluate(()=>{localStorage.clear();});await page.evaluate(()=>new Promise(r=>{try{const q=indexedDB.deleteDatabase('trace-kv');q.onsuccess=q.onerror=q.onblocked=()=>r();}catch(e){r();}}));
await page.reload();await page.waitForTimeout(1200);
const skip=async()=>{const s=await page.$('#loginSkip');if(s&&await s.isVisible())await s.click();await page.waitForTimeout(700);};await skip();
// ── 1) accueil hors connexion (personnage Karim B., soudeur) : les onglets Mon espace et Entreprise sont là ; Mon espace → sous-onglets, « Bonjour Karim », avatar SCR dessiné (kit), pointage proposé, fiche
let out=await page.evaluate(()=>{const tabs=[...document.querySelectorAll('.homeTabs button')].filter(b=>b.style.display!=='none').map(b=>b.id);document.getElementById('htEspace').click();
  const app=document.getElementById('eq-app');return {screen:window.TRACE.state.screen,tabs,app:!!app,subs:[...document.querySelectorAll('#eq-app .eq-subs .chip')].map(c=>c.textContent.trim()),h2:(document.querySelector('#eq-app h2.vt')||{}).textContent,svg:document.querySelectorAll('#eq-app svg').length,fig:!!document.querySelector('#eq-app .eq-fig'),pointer:!!document.querySelector('#eq-app [data-act=pointer][data-v=start]'),fiche:/Ta fiche/.test(document.getElementById('eq-app').textContent),title:document.querySelector('.homeSub .t').textContent};});
console.log('1) accueil Mon espace :',JSON.stringify(out));
C.c1=out.screen==='home'&&out.tabs.includes('htEspace')&&out.tabs.includes('htEnt')&&out.app&&out.subs.includes('Accueil')&&out.subs.includes('Avatar')&&out.subs.includes('Heures')&&/Bonjour Karim/.test(out.h2)&&out.svg>0&&out.fig&&out.pointer&&out.fiche&&out.title==='Mon espace';
// ── 2) avatar : sous-onglet Avatar, options du kit (teints, coiffures…), un clic sur un teint change la cfg et l'enregistre (kv) ; « Hors travail / Au travail » bascule la tenue ; réinitialiser
out=await page.evaluate(async()=>{[...document.querySelectorAll('#eq-app .eq-subs .chip')].find(x=>/Avatar/.test(x.textContent)).click();const app=document.getElementById('eq-app');
  const r={h2:(app.querySelector('h2.vt')||{}).textContent,sw:app.querySelectorAll('.eq-sw').length,th:app.querySelectorAll('.eq-th').length,poste:(app.querySelector('.eq-pill')||{}).textContent,vues:[...app.querySelectorAll('[data-act=av]')].filter(b=>/travail/i.test(b.textContent)).length};
  const teints=[...app.querySelectorAll('.eq-sw')].slice(0,6);const sel0=teints.findIndex(b=>b.getAttribute('aria-pressed')==='true');const cible=teints[(sel0+3)%6];cible.click();await new Promise(z=>setTimeout(z,300));
  const teints2=[...document.querySelectorAll('#eq-app .eq-sw')].slice(0,6);r.sel0=sel0;r.sel1=teints2.findIndex(b=>b.getAttribute('aria-pressed')==='true');
  const E=window.TRACE.espace;const me=window.TRACE.acces.current();r.key=E.key(me);await new Promise(z=>setTimeout(z,900));
  return r;});
out.saved=await page.evaluate(async()=>{const me=window.TRACE.acces.current();const key=window.TRACE.espace.key(me);const req=indexedDB.open('trace-kv');return await new Promise(res=>{req.onsuccess=()=>{const db=req.result;const names=[...db.objectStoreNames];const tx=db.transaction(names[0]);const st=tx.objectStore(names[0]);const g=st.get('trace:people');g.onsuccess=()=>{const v=g.result;res({key,peau:v&&v[key]&&v[key].avatar&&v[key].avatar.peau,stores:names});};g.onerror=()=>res({key,err:true});};req.onerror=()=>res({err:true});});});
console.log('2) avatar :',JSON.stringify(out));
C.c2=/Mon avatar/.test(out.h2)&&out.sw>=6&&out.th>=10&&out.poste==='Soudeur'&&out.vues>=2&&out.sel1!==out.sel0&&out.sel1>=0&&!!out.saved.peau;
// ── 3) rechargement : l'avatar garde le teint choisi (kv) ; le médaillon du planning / de l'annuaire utilise le même profil
const peauChoisie=out.saved.peau;
await page.reload();await page.waitForTimeout(1200);await skip();
out=await page.evaluate(peau=>{document.getElementById('htEspace').click();[...document.querySelectorAll('#eq-app .eq-subs .chip')].find(x=>/Avatar/.test(x.textContent)).click();const app=document.getElementById('eq-app');
  const sel=[...app.querySelectorAll('.eq-sw')].slice(0,6).findIndex(b=>b.getAttribute('aria-pressed')==='true');const st=window.TRACE.espace.state();const me=window.TRACE.acces.current();const key=window.TRACE.espace.key(me);return {sel,peau,kv:st.people[key]&&st.people[key].avatar&&st.people[key].avatar.peau,tab:window.TRACE.state.homeTab};},peauChoisie);
console.log('3) rechargement :',JSON.stringify(out));
C.c3=out.sel>=0&&out.kv===out.peau&&out.tab==='espace';
// ── 4) contact d'urgence : « Définir », formulaire, enregistrer → affiché dans la fiche et gardé après rechargement
await page.evaluate(()=>{[...document.querySelectorAll('#eq-app .eq-subs .chip')].find(x=>/Accueil/.test(x.textContent)).click();});await page.waitForTimeout(300);
await page.evaluate(()=>document.querySelector('#eq-app [data-act=edit]').click());await page.waitForTimeout(300);
out=await page.evaluate(()=>{const f=document.getElementById('eq-urg-nom');if(!f)return {form:false};f.value='Samira BENALI';document.getElementById('eq-urg-lien').value='épouse';document.getElementById('eq-urg-tel').value='06 39 98 02 01';document.querySelector('#eq-app [data-act=editok]').click();return {form:true,txt:document.getElementById('eq-app').textContent};});
await page.waitForTimeout(500);await page.reload();await page.waitForTimeout(1200);await skip();
out.after=await page.evaluate(()=>{document.getElementById('htEspace').click();return /Samira BENALI \(épouse\) · 06 39 98 02 01/.test(document.getElementById('eq-app').textContent);});
console.log('4) contact d\'urgence :',JSON.stringify({form:out.form,saved:/Samira BENALI/.test(out.txt||''),after:out.after}));
C.c4=out.form&&/Samira BENALI/.test(out.txt)&&out.after;
// ── 5) pointage : « Début de journée » → ligne du jour en cours (heure réelle), boutons Pause / Fin, gardé après rechargement ; Heures : la journée apparaît avec sa barre
out=await page.evaluate(()=>{document.querySelector('#eq-app [data-act=pointer][data-v=start]').click();const app=document.getElementById('eq-app');return {enCours:/Au travail depuis/.test(app.textContent)||/En cours/.test(app.textContent),pause:!!app.querySelector('[data-act=pointer][data-v=pause]'),fin:!!app.querySelector('[data-act=pointer][data-v=end]'),start:!app.querySelector('[data-act=pointer][data-v=start]')};});
await page.waitForTimeout(500);await page.reload();await page.waitForTimeout(1200);await skip();
out.after=await page.evaluate(()=>{document.getElementById('htEspace').click();const app=document.getElementById('eq-app');const r={pause:!!app.querySelector('[data-act=pointer][data-v=pause]')};[...app.querySelectorAll('.eq-subs .chip')].find(x=>/Heures/.test(x.textContent)).click();const a2=document.getElementById('eq-app');r.h2=(a2.querySelector('h2.vt')||{}).textContent;r.bar=!!a2.querySelector('.eq-bar');r.auj=/aujourd/i.test(a2.textContent)||/En cours/.test(a2.textContent);return r;});
console.log('5) pointage :',JSON.stringify(out));
C.c5=out.enCours&&out.pause&&out.fin&&out.start&&out.after.pause&&/Heures/.test(out.after.h2)&&out.after.bar;
// ── 6) Entreprise : par poste, avatars en pied, filtre famille, recherche, fiche d'une autre personne en panneau (téléphone / e-mail), fermeture
out=await page.evaluate(()=>{document.getElementById('htEnt').click();const app=document.getElementById('eq-app');const r={h2:(app.querySelector('h2.vt')||{}).textContent,pers:app.querySelectorAll('.eq-pers').length,groupes:app.querySelectorAll('.eq-ent-g').length,figs:app.querySelectorAll('.eq-pers .eq-fig').length,toi:/Toi/.test(app.textContent),title:document.querySelector('.homeSub .t').textContent};
  const fam=[...app.querySelectorAll('[data-act=ffam]')].find(b=>b.dataset.v==='terrain');fam.click();r.terrain=document.querySelectorAll('#eq-app .eq-pers').length;
  const autre=[...document.querySelectorAll('#eq-app .eq-pers')].find(b=>!/Toi/.test(b.textContent));autre.click();const sh=document.querySelector('#eq-app .eq-sheet');r.sheet=!!sh;r.sheetTxt=sh?sh.textContent:'';r.tel=sh?sh.querySelectorAll('a[href^="tel:"],a[href^="mailto:"]').length:0;
  document.querySelector('#eq-app [data-act=close]').click();r.closed=!document.querySelector('#eq-app .eq-sheet');return r;});
console.log('6) Entreprise :',JSON.stringify({...out,sheetTxt:out.sheetTxt.slice(0,80)}));
C.c6=/Entreprise/.test(out.h2)&&out.pers>=3&&out.groupes>=2&&out.figs>=3&&out.toi&&out.title==='Entreprise'&&out.terrain>=2&&out.terrain<out.pers&&out.sheet&&/Coordonnées/.test(out.sheetTxt)&&out.tel>=2&&out.closed;
// ── 7) serveur simulé : fiches people lues (avatar + habilitations), écriture d'une partie → RPC people_set_part avec la clé e-mail, pointage → RPC pointage_set ; refus serveur → gardé en attente et rejoué
const USER={id:'00000000-0000-0000-0000-000000000001',aud:'authenticated',role:'authenticated',email:'k.benali@scr.fr',app_metadata:{provider:'email'},user_metadata:{},created_at:'2026-01-01T00:00:00Z'};
const SESSION={access_token:'fake-token',token_type:'bearer',expires_in:86400,expires_at:Math.floor(Date.now()/1000)+86400,refresh_token:'fake-refresh',user:USER};
const calls=[];let refuse=false;
await page.route(u=>u.hostname.endsWith('supabase.co'),route=>{const url=route.request().url();const json=(o,status=200)=>route.fulfill({status,contentType:'application/json',body:JSON.stringify(o)});
  if(url.includes('/auth/v1/token'))return json(SESSION);if(url.includes('/auth/v1/user'))return json(USER);
  if(url.includes('/rest/v1/profiles')){const rows=[{id:USER.id,email:'k.benali@scr.fr',name:'Karim BENALI',prenom:'Karim',nom:'BENALI',poste:'soudeur',role:'soudeur',type:'salarie',admin:false,active:true,created_at:'2026-01-01'},{id:'00000000-0000-0000-0000-000000000002',email:'p.durand@scr.fr',name:'Paul DURAND',prenom:'Paul',nom:'DURAND',poste:'chef',role:'chef',type:'salarie',admin:false,active:true,created_at:'2026-01-02'},{id:'00000000-0000-0000-0000-000000000003',email:'m.amrani@interim.fr',name:'Mehdi AMRANI',prenom:'Mehdi',nom:'AMRANI',poste:'manchonneur',role:'manchonneur',type:'interim',sites:['S1'],admin:false,active:true,created_at:'2026-01-03'}];return json(url.includes('id=eq.')?rows[0]:rows);}
  if(url.includes('/rest/v1/invites'))return json([]);if(url.includes('/rest/v1/app_settings'))return json([]);
  if(url.includes('/rest/v1/people')){return json([{key:'k.benali@scr.fr',data:{avatar:{peau:'p5',cheveux:'chauve'},tel:'06 39 98 01 01',entree:'2019-03-04',contrat:{type:'CDI'},habs:[{type:'qs141',num:'QS-141-22917',fin:'2026-10-27',piece:'pdf'},{type:'sst',fin:'2026-09-20'}]},updated_at:'2026-10-09T08:00:00Z'},{key:'p.durand@scr.fr',data:{avatar:{barbe:'moustache'}},updated_at:'2026-10-09T08:00:00Z'}]);}
  if(url.includes('/rest/v1/pointages'))return json([]);
  if(url.includes('/rest/v1/rpc/people_set_part')){const b=route.request().postDataJSON();calls.push({fn:'people_set_part',...b});if(refuse)return json({message:'réseau coupé'},500);return json({at:new Date().toISOString(),value:b.p_value});}
  if(url.includes('/rest/v1/rpc/pointage_set')){const b=route.request().postDataJSON();calls.push({fn:'pointage_set',p:b.p_row.p,n:(b.p_row.events||[]).length});return json({id:b.p_row.p+'|'+b.p_row.d,...b.p_row});}
  if(url.includes('/rest/v1/rpc/'))return json([]);if(url.includes('/rest/v1/sites'))return json([]);if(url.includes('/rest/v1/welds')||url.includes('/rest/v1/line_state')||url.includes('/rest/v1/events'))return json([]);
  return route.fulfill({status:404,contentType:'application/json',body:'{}'});});
await page.evaluate(()=>{localStorage.clear();});await page.evaluate(()=>new Promise(r=>{try{const q=indexedDB.deleteDatabase('trace-kv');q.onsuccess=q.onerror=q.onblocked=()=>r();}catch(e){r();}}));
await page.evaluate(s=>{localStorage.setItem('sb-pghftlepduvfazbiavhq-auth-token',JSON.stringify(s));localStorage.setItem('trace:homeTab','espace');},SESSION);
await page.reload();await page.waitForTimeout(2500);
out=await page.evaluate(()=>{const T=window.TRACE;const app=document.getElementById('eq-app');const E=T.espace.state?T.espace.state():null;return {cloud:!!T.state.cloudUser,screen:T.state.screen,me:T.espace.key(T.acces.current()),h2:(app&&app.querySelector('h2.vt')||{}).textContent,txt:app?app.textContent:'',fig:!!(app&&app.querySelector('.eq-fig'))};});
out.habs=/QS 141 TIG/.test(out.txt)&&/Expire dans/.test(out.txt)&&/SST/.test(out.txt)&&/Expirée depuis/.test(out.txt);out.tel=/06 39 98 01 01/.test(out.txt);out.entree=/04\/03\/2019/.test(out.txt);
// écriture : teint via l'écran Avatar → RPC avec la clé e-mail et la partie avatar
await page.evaluate(()=>{[...document.querySelectorAll('#eq-app .eq-subs .chip')].find(x=>/Avatar/.test(x.textContent)).click();const teints=[...document.querySelectorAll('#eq-app .eq-sw')].slice(0,6);teints[0].click();});await page.waitForTimeout(1500);
const c1=calls.filter(c=>c.fn==='people_set_part');
// pointage : début de journée → RPC pointage_set
await page.evaluate(()=>{[...document.querySelectorAll('#eq-app .eq-subs .chip')].find(x=>/Accueil/.test(x.textContent)).click();document.querySelector('#eq-app [data-act=pointer][data-v=start]').click();});await page.waitForTimeout(1500);
const c2=calls.filter(c=>c.fn==='pointage_set');
// refus serveur → en attente, puis rejoué au rechargement (serveur de nouveau d'accord)
refuse=true;await page.evaluate(()=>{[...document.querySelectorAll('#eq-app .eq-subs .chip')].find(x=>/Avatar/.test(x.textContent)).click();const teints=[...document.querySelectorAll('#eq-app .eq-sw')].slice(0,6);teints[2].click();});await page.waitForTimeout(1500);
const pendBefore=await page.evaluate(()=>window.TRACE.espace.state().pending.length);refuse=false;const n0=calls.length;
await page.reload();await page.waitForTimeout(3000);const pendAfter=await page.evaluate(()=>window.TRACE.espace.state().pending.length);const replayed=calls.slice(n0).filter(c=>c.fn==='people_set_part'&&c.p_part==='avatar').length;
console.log('7) serveur simulé :',JSON.stringify({cloud:out.cloud,screen:out.screen,me:out.me,h2:out.h2,fig:out.fig,habs:out.habs,tel:out.tel,entree:out.entree,c1:c1.map(c=>[c.p_key,c.p_part,c.p_value&&c.p_value.peau]),c2,pendBefore,pendAfter,replayed}));
C.c7=out.cloud&&out.me==='k.benali@scr.fr'&&/Bonjour Karim/.test(out.h2)&&out.fig&&out.habs&&out.tel&&out.entree&&c1.length>=1&&c1[0].p_key==='k.benali@scr.fr'&&c1[0].p_part==='avatar'&&c1[0].p_value.peau==='p1'&&c2.length>=1&&c2[0].p==='k.benali@scr.fr'&&c2[0].n===1&&pendBefore===1&&pendAfter===0&&replayed>=1;
const bad=Object.entries(C).filter(([k,v])=>!v).map(([k])=>k);console.log(bad.length?'RESULTAT: ECHEC '+bad.join(','):'RESULTAT: TOUT VERT');console.log(logs.length?logs:'[]');
await browser.close();
