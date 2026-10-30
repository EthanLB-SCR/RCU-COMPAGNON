// e2e_palc_3010.mjs — 30/10 soir (lot 2910i). Paliers d'accès EN MODE CONNECTÉ (serveur simulé), d'après le retour d'Ethan sur le site publié :
// « je suis affiché en Socle mais je vois quand même tout, et dans la liste (Agir comme) je ne peux pas changer de profil » (capture : « Chargement des fiches… », liste à « Moi »).
//  c1  démarrage connecté (Ethan, admin) : comptes reçus (liste « Agir comme » remplie), fiches chargées (plus de « Chargement des fiches… »), paliers lus du serveur (éteints → tout visible)
//  c2  Administrateur → Options : allumer → RPC admin_set_setting(paliers, on:true) ; Ethan (Socle) ne voit plus Hydro / Stock / Fourniture / Phasage / Modifs / Points, Commerce ni Parc
//  c3  Personnes : Ethan → 🧪 Labo (RPC, people[uuid]) → tout revient ; retour Socle
//  c4  « Agir comme » Karim (soudeur, Socle) : liste utilisable, Karim ne voit pas Hydro ; retour « Moi »
//  c5  rechargement : le réglage revient du serveur (allumé), appliqué dès le démarrage ; extinction → RPC, tout revient
//  c6  console propre
import { chromium } from 'playwright';
const BASE=process.env.BASE||'http://localhost:8765';
const browser=await chromium.launch({headless:true, executablePath: process.env.CHROMIUM_PATH||undefined});
const C={};const logs=[];const J=x=>JSON.stringify(x);
const ctx=await browser.newContext({viewport:{width:1366,height:900},deviceScaleFactor:1});const page=await ctx.newPage();
page.on('pageerror',e=>logs.push('PAGEERROR: '+e.message.slice(0,300)));page.on('console',m=>{if(m.type()==='error'&&!/supabase|Failed to fetch|net::ERR|404|geopf|WebSocket|500/i.test(m.text()))logs.push(m.text().slice(0,200));});page.on('dialog',d=>d.accept().catch(()=>{}));
const wait=ms=>page.waitForTimeout(ms);
/* ── serveur simulé (comme e2e_espace) : Ethan connecté, 4 comptes, app_settings avec mémoire, RPC admin_set_setting ── */
const ETHAN='00000000-0000-0000-0000-000000000005',KARIM='00000000-0000-0000-0000-000000000001';
const USER={id:ETHAN,aud:'authenticated',role:'authenticated',email:'elebihan@scr-soudure.fr',app_metadata:{provider:'email'},user_metadata:{},created_at:'2026-01-01T00:00:00Z'};
const SESSION={access_token:'fake-token',token_type:'bearer',expires_in:86400,expires_at:Math.floor(Date.now()/1000)+86400,refresh_token:'fake-refresh',user:USER};
const PROFILES=[{id:KARIM,email:'k.benali@scr.fr',name:'Karim BENALI',prenom:'Karim',nom:'BENALI',poste:'soudeur',role:'soudeur',type:'salarie',admin:false,active:true,created_at:'2026-01-01'},{id:'00000000-0000-0000-0000-000000000002',email:'p.durand@scr.fr',name:'Paul DURAND',prenom:'Paul',nom:'DURAND',poste:'chef',role:'chef',type:'salarie',admin:false,active:true,created_at:'2026-01-02'},{id:ETHAN,email:'elebihan@scr-soudure.fr',name:'Ethan LE BIHAN',prenom:'Ethan',nom:'LE BIHAN',poste:'resp_exploitation',role:'chef',type:'salarie',admin:true,active:true,created_at:'2026-01-01'},{id:'00000000-0000-0000-0000-000000000004',email:'j.martin@scr.fr',name:'Julie MARTIN',prenom:'Julie',nom:'MARTIN',poste:'conducteur',role:'bureau',type:'salarie',admin:false,active:true,created_at:'2026-01-03'}];
const SETTINGS={};const calls=[];
await page.route(u=>u.hostname.endsWith('supabase.co'),route=>{const url=route.request().url();const json=(o,status=200)=>route.fulfill({status,contentType:'application/json',body:JSON.stringify(o)});
  if(url.includes('/auth/v1/token'))return json(SESSION);if(url.includes('/auth/v1/user'))return json(USER);
  if(url.includes('/rest/v1/profiles'))return json(url.includes('id=eq.')?PROFILES.find(p=>url.includes(p.id))||null:PROFILES);
  if(url.includes('/rest/v1/invites'))return json([]);
  if(url.includes('/rest/v1/app_settings')){const m=url.match(/key=eq\.([a-z_]+)/);const k=m&&decodeURIComponent(m[1]);const accept=route.request().headers()['accept']||'';const single=/vnd\.pgrst\.object/.test(accept);const row=k&&SETTINGS[k]?{value:SETTINGS[k]}:null;return single?(row?json(row):route.fulfill({status:406,contentType:'application/json',body:'{"message":"no rows"}'})):json(row?[row]:[]);}
  if(url.includes('/rest/v1/rpc/admin_set_setting')){const b=route.request().postDataJSON();calls.push({fn:'admin_set_setting',key:b.p_key,value:b.p_value});SETTINGS[b.p_key]=b.p_value;return json(null);}
  if(url.includes('/rest/v1/people'))return json([]);if(url.includes('/rest/v1/pointages'))return json([]);if(url.includes('/rest/v1/planning'))return json([]);
  if(url.includes('/rest/v1/rpc/'))return json([]);if(url.includes('/rest/v1/sites')){if(url.includes('id=eq.'))return json(null);return json([]);}if(url.includes('/rest/v1/welds')||url.includes('/rest/v1/line_state')||url.includes('/rest/v1/events'))return json([]);
  return route.fulfill({status:404,contentType:'application/json',body:'{}'});});
await page.route(u=>/(^|\.)geopf\.fr$|^geo\.api\.gouv\.fr$|open-meteo\.com$/.test(u.hostname),route=>route.fulfill({status:200,contentType:'application/json',body:'[]'}));
await page.goto(BASE+'/index.html');await wait(500);await page.evaluate(()=>{localStorage.clear();});await page.evaluate(()=>new Promise(r=>{try{const q=indexedDB.deleteDatabase('trace-kv');q.onsuccess=q.onerror=q.onblocked=()=>r();}catch(e){r();}}));
await page.evaluate(s=>{localStorage.setItem('sb-pghftlepduvfazbiavhq-auth-token',JSON.stringify(s));},SESSION);
await page.reload();await wait(3500);
const openSite=async()=>{await page.evaluate(()=>{const T=window.TRACE;const id=Object.keys(T.sites).find(k=>k!=='__vide'&&T.sites[k]&&T.sites[k].lines);T.showScreen('site');if(T.state.siteId!==id)T.switchSite(id);T.state.tab='plan';T.renderAll();});await wait(600);};
const siteTabs=()=>page.evaluate(()=>[...document.querySelectorAll('#tabbar [data-tab]')].filter(b=>b.style.display!=='none'&&b.dataset.tab!=='__more').map(b=>b.dataset.tab));
const homeTabs=async()=>{await page.evaluate(()=>{window.TRACE.showScreen('home');window.TRACE.renderHome();});await wait(300);return page.evaluate(()=>[...document.querySelectorAll('#homeTabs button')].filter(b=>b.style.display!=='none').map(b=>b.id));};
const admin=async view=>{await page.evaluate(()=>{window.TRACE.showScreen('home');document.getElementById('htAdmin').click();});await wait(700);await page.evaluate(v=>{const b=[...document.querySelectorAll('#homeBody .admNav button')].find(x=>x.textContent.includes(v));b.click();},view);await wait(500);};
const asHome=async v=>{await page.evaluate(()=>{window.TRACE.showScreen('home');window.TRACE.renderHome();});await wait(200);await page.evaluate(v=>{const sel=document.getElementById('homeAs');sel.value=v;sel.dispatchEvent(new Event('change',{bubbles:true}));},v);await wait(600);};
/* ── c1 */
let o=await page.evaluate(()=>{const T=window.TRACE;const sel=document.getElementById('homeAs');return {cloud:!!T.state.cloudUser,me:(T.acces.current()||{}).email,admin:T.acces.isAdmin(),opts:sel?[...sel.options].map(x=>x.value):null,fiches:/Chargement des fiches/.test(document.getElementById('homeBody').textContent),on:T.paliers.on(),accounts:(T.state.accounts||[]).length};});
await openSite();o.tabs=await siteTabs();o.home=await homeTabs();
console.log('c1) démarrage connecté :',J(o));
C.c1=o.cloud&&o.me==='elebihan@scr-soudure.fr'&&o.admin&&o.opts&&o.opts.includes('acc:'+KARIM)&&!o.fiches&&o.on===false&&o.accounts===4&&['hydro','stock','phasage','ts'].every(t=>o.tabs.includes(t))&&o.home.includes('htCom');
/* ── c2 */
await admin('Options');
o={rows:await page.evaluate(()=>document.querySelectorAll('.admOpt').length)};
await page.evaluate(()=>{const t=document.getElementById('admPalOn');t.checked=true;t.dispatchEvent(new Event('change',{bubbles:true}));});await wait(900);
o.calls=calls.filter(c=>c.fn==='admin_set_setting').map(c=>[c.key,c.value&&c.value.on]);o.on=await page.evaluate(()=>window.TRACE.paliers.on());o.btn=await page.evaluate(()=>(document.querySelector('label[for], #admPalOn')&&document.getElementById('admPalOn').parentElement.textContent.trim())||'');
await openSite();o.tabs=await siteTabs();o.home=await homeTabs();
console.log('c2) allumé (serveur) :',J(o));
C.c2=o.rows>=20&&o.calls.length===1&&o.calls[0][0]==='paliers'&&o.calls[0][1]===true&&o.on===true&&['hydro','stock','fourniture','phasage','ts','points'].every(t=>!o.tabs.includes(t))&&['bouclage','conv','qse','export'].every(t=>o.tabs.includes(t))&&!o.home.includes('htCom')&&!o.home.includes('htParc');
/* ── c3 */
await admin('Personnes');
o={row:await page.evaluate(()=>{const r=[...document.querySelectorAll('.admAcc')].find(x=>/Ethan/.test(x.textContent));if(!r)return null;const b=r.querySelector('[data-admpalier]');const t0=b.textContent.trim();b.click();return {id:b.dataset.admpalier,t0};})};await wait(900);
o.people=calls.filter(c=>c.fn==='admin_set_setting').slice(-1).map(c=>c.value&&c.value.people)[0];o.pal=await page.evaluate(()=>window.TRACE.paliers.personPalier(window.TRACE.acces.current()));
await openSite();o.tabs=await siteTabs();o.home=await homeTabs();
await admin('Personnes');await page.evaluate(()=>{const r=[...document.querySelectorAll('.admAcc')].find(x=>/Ethan/.test(x.textContent));r.querySelector('[data-admpalier]').click();});await wait(900);
o.back=await page.evaluate(()=>window.TRACE.paliers.personPalier(window.TRACE.acces.current()));
console.log('c3) Ethan Labo puis Socle :',J(o));
C.c3=!!o.row&&o.row.id===ETHAN&&o.row.t0==='Socle'&&o.people&&o.people[ETHAN]==='labo'&&o.pal==='labo'&&['hydro','stock','phasage','ts'].every(t=>o.tabs.includes(t))&&o.home.includes('htCom')&&o.back==='socle';
/* ── c4 */
await asHome('acc:'+KARIM);
o=await page.evaluate(()=>{const T=window.TRACE;const a=T.acces.current();return {me:a.email,acting:!!a.acting||!!a.test,hydro:T.paliers.feat('hydro'),conv:T.paliers.feat('conv'),banner:document.getElementById('homeBanner').style.display!=='none'};});
await openSite();o.tabs=await siteTabs();await asHome('__me');o.meBack=await page.evaluate(()=>(window.TRACE.acces.current()||{}).email);
console.log('c4) Agir comme Karim :',J(o));
C.c4=o.me==='k.benali@scr.fr'&&o.acting&&o.hydro===false&&o.conv===true&&o.banner&&!o.tabs.includes('hydro')&&o.tabs.includes('plan')&&o.meBack==='elebihan@scr-soudure.fr';
/* ── c5 */
await page.evaluate(()=>{localStorage.removeItem('trace:paliers');});await page.reload();await wait(3500);
o={on:await page.evaluate(()=>window.TRACE.paliers.on()),fiches:await page.evaluate(()=>/Chargement des fiches/.test(document.getElementById('homeBody').textContent)),opts:await page.evaluate(()=>{const s=document.getElementById('homeAs');return s?s.options.length:0;})};
await openSite();o.tabs=await siteTabs();
await admin('Options');await page.evaluate(()=>{const t=document.getElementById('admPalOn');t.checked=false;t.dispatchEvent(new Event('change',{bubbles:true}));});await wait(900);
o.off=await page.evaluate(()=>window.TRACE.paliers.on());o.srv=SETTINGS.paliers&&SETTINGS.paliers.on;await openSite();o.tabsOff=await siteTabs();
console.log('c5) rechargement + extinction :',J(o));
C.c5=o.on===true&&!o.fiches&&o.opts>=4&&!o.tabs.includes('hydro')&&o.off===false&&o.srv===false&&o.tabsOff.includes('hydro');
C.c6=!logs.length;if(logs.length)console.log('console :',logs);
console.log('RÉSULTATS',J(C));console.log('RESULTAT:',Object.values(C).every(Boolean)?'TOUT VERT':'ÉCHEC '+Object.keys(C).filter(k=>!C[k]).join(' '));await browser.close();process.exit(Object.values(C).every(Boolean)?0:1);
