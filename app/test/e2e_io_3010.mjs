// e2e_io_3010.mjs — 30/10 soir (lot 2910k). Le 30/10, la base a épuisé son budget disque (offre gratuite) : chaque appli avec un chantier ouvert relisait TOUS les chantiers
// (≈ 25 champs pris dans chaque plan complet) toutes les 90 s pour vérifier la date du seul chantier ouvert ; chaque renouvellement de session (toutes les heures) relançait toute
// la lecture de démarrage ; un retour de connexion faisait tout relire à tous les téléphones à la même seconde. Serveur simulé, on COMPTE les lectures :
//  c1  démarrage avec la colonne sites.meta (sql/retours_30-10.sql) : la liste des chantiers passe par meta, AUCUNE lecture lourde ; la fiche (ville) arrive bien
//  c2  contrôle « plus récent sur le serveur ? » du chantier ouvert : une lecture d'UNE ligne (id, updated_at), pas la liste des chantiers
//  c3  renouvellement de session (TOKEN_REFRESHED) : ni liste des chantiers ni liste des comptes relues
//  c4  coupure courte (données déjà lues) : au retour, rien n'est relu ; démarrage pendant une coupure (rien de lu) : au retour, relecture complète ; pendant la coupure, les
//      contrôles s'espacent (pas de nouvelle sonde avant l'échéance) et la dernière liste des comptes est GARDÉE
//  c5  colonne meta absente (SQL pas encore passé) : repli sur l'ancienne lecture, l'appli marche comme avant
//  c6  console propre
import { chromium } from 'playwright';
const BASE=process.env.BASE||'http://localhost:8765';
const browser=await chromium.launch({headless:true, executablePath: process.env.CHROMIUM_PATH||undefined});
const C={};const logs=[];const J=x=>JSON.stringify(x);
const ctx=await browser.newContext({viewport:{width:1366,height:900},deviceScaleFactor:1});const page=await ctx.newPage();
page.on('pageerror',e=>logs.push('PAGEERROR: '+e.message.slice(0,300)));page.on('console',m=>{if(m.type()==='error'&&!/supabase|Failed to fetch|net::ERR|404|geopf|WebSocket|status of [45]\d\d/i.test(m.text()))logs.push(m.text().slice(0,200));});page.on('dialog',d=>d.accept().catch(()=>{}));
const wait=ms=>page.waitForTimeout(ms);
const ETHAN='00000000-0000-0000-0000-000000000005';
const USER={id:ETHAN,aud:'authenticated',role:'authenticated',email:'elebihan@scr-soudure.fr',app_metadata:{provider:'email'},user_metadata:{},created_at:'2026-01-01T00:00:00Z'};
const SESSION={access_token:'fake-token',token_type:'bearer',expires_in:86400,expires_at:Math.floor(Date.now()/1000)+86400,refresh_token:'fake-refresh',user:USER};
const PROFILES=[{id:'00000000-0000-0000-0000-000000000001',email:'k.benali@scr.fr',name:'Karim BENALI',prenom:'Karim',nom:'BENALI',poste:'soudeur',role:'soudeur',type:'salarie',admin:false,active:true,created_at:'2026-01-01'},{id:ETHAN,email:'elebihan@scr-soudure.fr',name:'Ethan LE BIHAN',prenom:'Ethan',nom:'LE BIHAN',poste:'resp_exploitation',role:'chef',type:'salarie',admin:true,active:true,created_at:'2026-01-01'}];
const META={geo:null,origin:null,bgo:null,sat:'2026-10-30T10:00:00Z',w:100,h:100,bbox:[0,0,100,100],nbox:[10,10,90,90],nw:12,deleted:null,deletedAt:null,builtin:null,ville:'Lorient',chef:null,conducteur:null,secteur:'ouest',etude:null,manuel:null,createdAt:null,createdBy:null,l0:'L1'};
const SRV=[{id:'SRV_IO',name:'Lorient — Kervénanec (serveur)',supplier:'AXIOM',updated_at:'2026-10-30T10:00:00Z',meta:META}];
let HAS_META=true,DOWN=false;const N={heavy:0,meta:0,one:0,full:0,profilesAll:0,probe:0,token:0};
await page.route(u=>u.hostname.endsWith('supabase.co'),route=>{const req=route.request();const url=req.url();const u=new URL(url);const acc=req.headers()['accept']||'';const json=(o,status=200)=>route.fulfill({status,contentType:'application/json',body:JSON.stringify(o)});
  if(DOWN&&(url.includes('/rest/v1/')||url.includes('/auth/v1/health')||url.includes('/auth/v1/token')))return json({message:'Service Unavailable'},503);
  if(url.includes('/auth/v1/health'))return json({version:'test'});
  if(url.includes('/auth/v1/token')){N.token++;return json(SESSION);}if(url.includes('/auth/v1/user'))return json(USER);
  if(u.pathname==='/rest/v1/profiles'){const sel=u.searchParams.get('select')||'';if(sel==='id'&&u.searchParams.get('limit')==='1'){N.probe++;return json([{id:ETHAN}]);}if(url.includes('id=eq.'))return json(/object/.test(acc)?PROFILES.find(p=>url.includes(p.id))||null:PROFILES.filter(p=>url.includes(p.id)));N.profilesAll++;return json(PROFILES);}
  if(u.pathname==='/rest/v1/sites'){const sel=u.searchParams.get('select')||'';const idm=/id=eq\.([^&]+)/.exec(u.search);const id=idm?decodeURIComponent(idm[1]):null;
    if(/\bmeta\b/.test(sel)){N.meta++;if(!HAS_META)return json({code:'42703',message:'column sites.meta does not exist',details:null,hint:null},400);return json(SRV.map(r=>({id:r.id,name:r.name,supplier:r.supplier,updated_at:r.updated_at,meta:r.meta})));}
    if(/geo:data/.test(sel)){N.heavy++;return json(SRV.map(r=>({id:r.id,name:r.name,supplier:r.supplier,updated_at:r.updated_at,...r.meta})));}
    if(sel==='id,updated_at'){N.one++;const r=SRV.find(x=>x.id===id);const o=r?{id:r.id,updated_at:r.updated_at}:null;return json(/object/.test(acc)?o:(o?[o]:[]));}
    if(/data/.test(sel)){N.full++;return json(/object/.test(acc)?null:[]);}
    return json([]);}
  if(url.includes('/rest/v1/invites'))return json([]);if(url.includes('/rest/v1/app_settings'))return json(/object/.test(acc)?null:[]);
  if(url.includes('/rest/v1/rpc/'))return json([]);return json([]);});
await page.route(u=>/(^|\.)geopf\.fr$|^geo\.api\.gouv\.fr$|open-meteo\.com$/.test(u.hostname),route=>route.fulfill({status:200,contentType:'application/json',body:'[]'}));
await page.goto(BASE+'/index.html');await wait(500);await page.evaluate(()=>{localStorage.clear();});await page.evaluate(()=>new Promise(r=>{try{const q=indexedDB.deleteDatabase('trace-kv');q.onsuccess=q.onerror=q.onblocked=()=>r();}catch(e){r();}}));
await page.evaluate(s=>{localStorage.setItem('sb-pghftlepduvfazbiavhq-auth-token',JSON.stringify(s));},SESSION);
await page.reload();await wait(4000);
/* ── c1 */
let o={n:{...N},cloud:await page.evaluate(()=>!!window.TRACE.state.cloudUser),srv:await page.evaluate(()=>{const m=(window.TRACE.state.serverMetas||[]).find(x=>x.id==='SRV_IO');return m?{name:m.name,ville:m.ville,secteur:m.secteur,w:m.w}:null;}),fullAt:await page.evaluate(()=>window.TRACE.io.fullAt())};
console.log('c1) démarrage :',J(o));
C.c1=o.cloud&&o.n.meta>=1&&o.n.heavy===0&&o.srv&&o.srv.ville==='Lorient'&&o.srv.secteur==='ouest'&&o.fullAt>0;
/* ── c2 : contrôle du chantier ouvert */
let n0={...N};
o={r:await page.evaluate(async()=>{const T=window.TRACE;await T.io.checkNewer('SRV_IO');const a=T.state.syncLastCheck;const id=Object.keys(T.sites).find(k=>k!=='__vide'&&T.sites[k]&&T.sites[k].lines);await T.io.checkNewer(id);return {a,b:T.state.syncLastCheck};})};
o.d={one:N.one-n0.one,heavy:N.heavy-n0.heavy,meta:N.meta-n0.meta,full:N.full-n0.full};
console.log('c2) chantier ouvert :',J(o));
C.c2=o.d.one===2&&o.d.heavy===0&&o.d.meta===0&&/rechargé/.test(o.r.a.why)&&o.d.full===1/* chantier pas encore sur l'appareil : plan chargé une fois */&&/à jour/.test(o.r.b.why);
/* ── c3 : renouvellement de session */
n0={...N};await page.evaluate(()=>window.TRACE.srv.retry());await wait(2500);
o={d:{token:N.token-n0.token,meta:N.meta-n0.meta,heavy:N.heavy-n0.heavy,profilesAll:N.profilesAll-n0.profilesAll}};
console.log('c3) renouvellement de session :',J(o));
C.c3=o.d.token>=1&&o.d.meta===0&&o.d.heavy===0&&o.d.profilesAll===0;
/* ── c4 : coupure courte / démarrage pendant une coupure / contrôles espacés / comptes gardés */
await page.evaluate(()=>window.TRACE.srv.setJitter(0));
DOWN=true;await page.evaluate(()=>window.TRACE.srv.check(true));await page.evaluate(()=>window.TRACE.srv.check(true));
o={down:await page.evaluate(()=>window.TRACE.srv.state())};const p0=N.probe;await page.evaluate(()=>window.TRACE.srv.check(false));o.probeSkipped=N.probe===p0;o.nextIn=Math.round((o.down.nextAt-Date.now())/1000);
o.accounts=await page.evaluate(async()=>{const r=await window.TRACE.acces.list();return {n:r.rows.length,server:r.server,stale:!!r.stale};});
DOWN=false;n0={...N};await page.evaluate(()=>window.TRACE.srv.check(true));await wait(1500);
o.short={back:await page.evaluate(()=>window.TRACE.srv.state().down===null),meta:N.meta-n0.meta,profilesAll:N.profilesAll-n0.profilesAll};
await page.evaluate(()=>window.TRACE.io.setFullAt(0));DOWN=true;await page.evaluate(()=>window.TRACE.srv.check(true));DOWN=false;n0={...N};await page.evaluate(()=>window.TRACE.srv.check(true));await wait(2500);
o.never={back:await page.evaluate(()=>window.TRACE.srv.state().down===null),meta:N.meta-n0.meta,profilesAll:N.profilesAll-n0.profilesAll,fullAt:await page.evaluate(()=>window.TRACE.io.fullAt()>0)};
console.log('c4) coupures :',J(o));
C.c4=!!o.down.down&&o.probeSkipped&&o.nextIn>=40&&o.accounts.n===2&&o.accounts.stale&&o.short.back&&o.short.meta===0&&o.short.profilesAll===0&&o.never.back&&o.never.meta>=1&&o.never.profilesAll>=1&&o.never.fullAt;
/* ── c5 : SQL pas passé (colonne meta absente) */
HAS_META=false;await page.reload();await wait(4000);
o={heavy:N.heavy,srv:await page.evaluate(()=>{const m=(window.TRACE.state.serverMetas||[]).find(x=>x.id==='SRV_IO');return m?{ville:m.ville}:null;})};
console.log('c5) sans colonne meta :',J(o));
C.c5=o.heavy>=1&&o.srv&&o.srv.ville==='Lorient';
C.c6=!logs.length;if(logs.length)console.log('console :',logs);
console.log('RÉSULTATS',J(C));console.log('RESULTAT:',Object.values(C).every(Boolean)?'TOUT VERT':'ÉCHEC '+Object.keys(C).filter(k=>!C[k]).join(' '));await browser.close();process.exit(Object.values(C).every(Boolean)?0:1);
