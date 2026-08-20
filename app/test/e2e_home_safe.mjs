// Accueil connecté — robustesse de la liste des chantiers (bug « je n'ai plus mes chantiers », 20/08) :
// A) listSiteMeta en échec (500 / verrou / délai) → AUCUN chantier local masqué, l'accueil garde les copies locales
// B) réparation : un chantier masqué automatiquement (trace:hiddenAt) mais vivant sur le serveur est dé-masqué ;
//    un chantier masqué MANUELLEMENT (trace:hiddenSites, « Supprimer ») reste masqué
// C) sélection PostgREST enrichie (bbox/nbox/nw) refusée par le serveur (400) → repli automatique sur la sélection simple
// Tout le réseau Supabase est mocké (page.route) : session fake dans localStorage + réponses REST contrôlées.
import { chromium } from 'playwright';
const BASE=process.env.BASE||'http://localhost:8765';
const browser=await chromium.launch({headless:true, executablePath: process.env.CHROMIUM_PATH||undefined});
const ctx=await browser.newContext({viewport:{width:560,height:940}});const page=await ctx.newPage();
const logs=[];page.on('pageerror',e=>logs.push('PAGEERROR: '+e.message.slice(0,300)));
page.on('console',m=>{if(m.type()==='error'&&!/supabase|Failed to fetch|net::ERR|404|WebSocket|400|500/i.test(m.text()))logs.push(m.text().slice(0,200));});

const USER={id:'00000000-0000-0000-0000-000000000001',aud:'authenticated',role:'authenticated',email:'test@scr.fr',app_metadata:{provider:'email'},user_metadata:{},created_at:'2026-01-01T00:00:00Z'};
const SESSION={access_token:'fake-token',token_type:'bearer',expires_in:86400,expires_at:Math.floor(Date.now()/1000)+86400,refresh_token:'fake-refresh',user:USER};
const META_S1={id:'S1',name:'Chantier A',supplier:'AXIOM',updated_at:'2026-08-19T10:00:00Z',geo:null,origin:null,bgo:null,sat:'2026-08-19T10:00:00Z',w:100,h:100,bbox:[0,0,100,100],nbox:[10,10,90,90],nw:42,deleted:null,deletedAt:null,builtin:null};
const META_S2={...META_S1,id:'S2',name:'Chantier B (masqué à la main)'};
// mode de la route « sites » : 'fail' = 500 sur tout ; 'ok' = 200 [S1,S2] ; 'rich400' = 400 si la sélection contient bbox, sinon 200 [S1]
let sitesMode='fail';
await page.route(u=>u.hostname.endsWith('supabase.co'),route=>{
  const url=route.request().url();const json=(o,status=200)=>route.fulfill({status,contentType:'application/json',body:JSON.stringify(o)});
  if(url.includes('/auth/v1/token'))return json(SESSION);
  if(url.includes('/auth/v1/user'))return json(USER);
  if(url.includes('/rest/v1/profiles'))return json({id:USER.id,name:'Testeur',role:'chef',active:true});
  if(url.includes('/rest/v1/rpc/'))return json([]);
  if(url.includes('/rest/v1/sites')){
    if(sitesMode==='fail')return json({message:'panne simulée'},500);
    if(sitesMode==='rich400'&&decodeURIComponent(url).includes('bbox'))return json({code:'PGRST100',message:'failed to parse select'},400);
    if(url.includes('id=eq.'))return json(null);
    return json(sitesMode==='rich400'?[META_S1]:[META_S1,META_S2]);}
  if(/\/rest\/v1\/(welds|line_state|events)/.test(url))return json([]);
  return route.fulfill({status:404,contentType:'application/json',body:'{}'});
});
const HANDOFF={id:'S1',name:'Chantier A',supplier:'AXIOM',w:100,h:100,sheetType:'plain',lines:[],sent:true,traceur:{savedAt:'2026-08-19T10:00:00Z'},report:{welds:42}};
const HANDOFF2={...HANDOFF,id:'S2',name:'Chantier B (masqué à la main)'};
const home=()=>page.evaluate(()=>({cards:[...document.querySelectorAll('#homeBody .siteCard .n span')].map(e=>e.textContent),
  hiddenAt:JSON.parse(localStorage.getItem('trace:hiddenAt')||'{}'),hiddenSites:JSON.parse(localStorage.getItem('trace:hiddenSites')||'[]'),
  metas:(window.TRACE&&window.TRACE.state&&window.TRACE.state.serverMetas||[]).map(m=>m.id),
  count:(document.querySelector('#homeCount')||{}).textContent}));

// ---------- A) panne serveur : les copies locales doivent SURVIVRE ----------
await page.goto(BASE+'/index.html');await page.waitForTimeout(500);
await page.evaluate(({s,h})=>{localStorage.clear();localStorage.setItem('sb-pghftlepduvfazbiavhq-auth-token',JSON.stringify(s));localStorage.setItem('trace:handoff:S1',JSON.stringify(h));localStorage.setItem('trace:homeTab','list');},{s:SESSION,h:HANDOFF});
await page.reload();await page.waitForTimeout(9000);
let out=await home();
const aOK=out.cards.includes('Chantier A')&&!('S1' in out.hiddenAt);
console.log('A) panne serveur → chantier local conservé, rien masqué:',JSON.stringify({...out,PASS:aOK}));

// ---------- B) réparation : masquage auto dé-masqué si vivant sur le serveur ; masquage manuel conservé ----------
sitesMode='ok';
await page.evaluate(({h2})=>{localStorage.setItem('trace:hiddenAt',JSON.stringify({S1:Date.now()-3600e3,S2:Date.now()-3600e3}));localStorage.setItem('trace:hiddenSites',JSON.stringify(['S2']));localStorage.setItem('trace:handoff:S2',JSON.stringify(h2));},{h2:HANDOFF2});
await page.reload();await page.waitForTimeout(9000);
out=await home();
const bOK=out.cards.includes('Chantier A')&&!('S1' in out.hiddenAt)&&('S2' in out.hiddenAt)&&!out.cards.some(c=>c.includes('masqué à la main'));
console.log('B) dé-masquage auto (S1 revient, S2 manuel reste caché):',JSON.stringify({...out,PASS:bOK}));

// ---------- C) sélection enrichie refusée (400) → repli sélection simple, la liste vit ----------
sitesMode='rich400';
await page.evaluate(()=>{localStorage.removeItem('trace:hiddenAt');localStorage.removeItem('trace:hiddenSites');localStorage.removeItem('trace:handoff:S2');});
await page.reload();await page.waitForTimeout(9000);
out=await home();
const cOK=out.metas.includes('S1')&&out.cards.includes('Chantier A');
console.log('C) 400 sur la sélection enrichie → repli, liste peuplée:',JSON.stringify({...out,PASS:cOK}));

console.log('RESULTAT:',aOK&&bOK&&cOK?'TOUT VERT':'ECHEC');
console.log(logs.length?logs:'[]');
await browser.close();
process.exit(aOK&&bOK&&cOK?0:1);
