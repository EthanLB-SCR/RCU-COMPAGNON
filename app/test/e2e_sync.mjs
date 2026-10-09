// SYNCHRONISATION DES PARTIES DU CHANTIER (Ethan 09/10 : « la position des fils que je tourne disparaît dans le temps ») — serveur Supabase simulé avec une table sites,
// la RPC site_set_part (absente / présente / refusée) : (1) sans SQL v3 l'orientation part en plan entier ; (2) si le serveur a plus récent (autre appareil), on FUSIONNE au lieu
// d'écraser ; (3) avec SQL v3 : RPC seule ; (4) refus du serveur = alerte visible + réessai ; (5) après rechargement, les tubes tournés le restent, y compris ceux tournés ailleurs.
import { chromium } from 'playwright';
const BASE=process.env.BASE||'http://localhost:8765';
const SB='https://pghftlepduvfazbiavhq.supabase.co';
const UID='11111111-2222-4333-8444-555555555555';const EMAIL='elebihan@scr-soudure.fr';
const profile={id:UID,email:EMAIL,name:'Ethan LE BIHAN',role:'chef',active:true,poste:'resp_exploitation',admin:true,type:'salarie',rights:{},sites:null,prenom:'Ethan',nom:'LE BIHAN',created_at:'2026-10-08T09:00:00Z'};
const session=()=>({access_token:'tok',token_type:'bearer',expires_in:3600,expires_at:Math.floor(Date.now()/1000)+3600,refresh_token:'ref',user:{id:UID,email:EMAIL,aud:'authenticated',role:'authenticated',app_metadata:{},user_metadata:{},created_at:'2026-10-08T09:00:00Z'}});
const sites={};let V3='absent'; // absent | ok | refuse
const calls=[],rpcs=[];
const browser=await chromium.launch({headless:true, executablePath: process.env.CHROMIUM_PATH||undefined});
const ctx=await browser.newContext({viewport:{width:460,height:900}});
await ctx.route(u=>u.href.startsWith(SB),async route=>{const req=route.request();const u=new URL(req.url());const p=u.pathname;const acc=req.headers()['accept']||'';calls.push(req.method()+' '+p+(u.search?u.search.slice(0,60):''));
  const json=(o,status=200)=>route.fulfill({status,contentType:'application/json',headers:{'access-control-allow-origin':'*'},body:JSON.stringify(o)});
  if(p==='/auth/v1/token')return json(session());if(p==='/auth/v1/user')return json(session().user);if(p.startsWith('/auth/v1/'))return json({});
  if(p==='/rest/v1/profiles'){const rows=[profile];return json(/object/.test(acc)?rows[0]:rows);}
  if(p==='/rest/v1/app_settings')return json(/object/.test(acc)?null:[]);
  if(p==='/rest/v1/rpc/site_set_part'){let b={};try{b=JSON.parse(req.postData()||'{}');}catch(e){}rpcs.push('site_set_part '+b.p_key);
    if(V3==='absent')return json({code:'PGRST202',message:'Could not find the function public.site_set_part(p_key, p_site, p_value) in the schema cache',details:null,hint:null},404);
    if(V3==='refuse')return json({code:'P0001',message:'réservé au chef / bureau',details:null,hint:null},400);
    const row=sites[b.p_site];if(!row)return json(null);row.data={...row.data,[b.p_key]:b.p_key==='elPos'?{...(row.data.elPos||{}),...(b.p_value||{})}:b.p_value};row.updated_at=new Date().toISOString();return json(row.updated_at);} /* comme le SQL v3 : elPos fusionné */
  if(p.startsWith('/rest/v1/rpc/'))return json(null);
  if(p==='/rest/v1/sites'){const sel=u.searchParams.get('select')||'';const m=/id=eq\.([^&]+)/.exec(u.search);const id=m?decodeURIComponent(m[1]):null;
    if(req.method()==='POST'){let b={};try{b=JSON.parse(req.postData()||'{}');}catch(e){}const rows=Array.isArray(b)?b:[b];const prefer=req.headers()['prefer']||'';
      rows.forEach(r=>{if(sites[r.id]&&/ignore-duplicates/.test(prefer))return;sites[r.id]={id:r.id,name:r.name,supplier:r.supplier||null,serie:r.serie||null,data:r.data||{},updated_at:r.updated_at||new Date().toISOString()};});return json([]);}
    let rows=Object.values(sites).filter(r=>!id||r.id===id);
    if(/sat:|builtin:/.test(sel))rows=rows.map(r=>({id:r.id,name:r.name,supplier:r.supplier,updated_at:r.updated_at,geo:r.data.geo||null,origin:r.data.origin||null,bgo:null,sat:r.data.traceur&&r.data.traceur.savedAt||null,w:r.data.w||null,h:r.data.h||null,bbox:null,nbox:null,nw:null,deleted:r.data.deleted||null,deletedAt:null,builtin:r.data.builtin||null}));
    return json(/object/.test(acc)?(rows[0]||null):rows);}
  if(p.startsWith('/rest/v1/'))return json([]);
  return json([]);});
const page=await ctx.newPage();
const logs=[];page.on('pageerror',e=>logs.push('PAGEERROR: '+e.message.slice(0,300)));page.on('console',m=>{if(m.type()==='error'&&!/realtime|websocket|Failed to fetch|net::ERR|404|400/i.test(m.text()))logs.push(m.text().slice(0,200));});
page.on('dialog',d=>d.accept().catch(()=>{}));
const C={};
// connexion (serveur simulé), puis un chantier du traceur ouvert dans TRACÉ → il part au serveur (plan entier)
await page.goto(BASE+'/index.html');await page.waitForTimeout(600);await page.evaluate(()=>{localStorage.clear();});await page.reload();await page.waitForTimeout(900);
await page.fill('#loginEmail',EMAIL);await page.fill('#loginPwd','Soudure-2026!');await page.click('#loginGo');await page.waitForTimeout(1500);
await page.goto(BASE+'/traceur.html');await page.waitForTimeout(500);
await page.evaluate(()=>{const S=window.MAQ.state;S.supplier='RENALIA';S.lines=[{id:'L1',name:'Rue de la Gare',dn:150,bar:12,pts:[[10,50],[130,50]],specials:[],parent:null}];S.seq=2;window.MAQ.setMode('select');window.MAQ.rebuild();});
await page.click('#bSave');await page.waitForTimeout(200);await page.fill('#svName','Sync test');await page.click('#svOk');await page.waitForTimeout(700);await page.click('#svGo');await page.waitForTimeout(1500);
try{await page.waitForFunction(()=>window.TRACE&&window.TRACE.state.cloudUser&&window.TRACE.state.screen==='site'&&/^trc_/.test(window.TRACE.state.siteId||'')&&Object.keys(window.TRACE.lines).length===1,null,{timeout:15000});}catch(e){} /* sous charge, l'ouverture du chantier remis peut prendre plusieurs secondes */
await page.waitForTimeout(1500); /* laisser partir le plan entier (debounce 1,2 s) */
let out=await page.evaluate(()=>{const T=window.TRACE;return {site:T.state.siteId,cloud:!!T.state.cloudUser,lines:Object.keys(T.lines).length,screen:T.state.screen};});
const SID=out.site;out.srv=!!sites[SID]&&!!(sites[SID].data||{}).lines;out.posts=calls.filter(c=>/^POST \/rest\/v1\/sites/.test(c)).length;
console.log('0) chantier au serveur :',JSON.stringify(out));C.c0=!!SID&&out.cloud&&out.lines===1&&out.screen==='site'&&out.srv;
const rotate=async(i,deg)=>{await page.evaluate(({i,deg})=>{const T=window.TRACE;const L=Object.values(T.lines)[0];T.openJoint(L.id,'A',i);const b=document.querySelector('#sheet [data-rota="'+deg+'"]');if(!b)throw new Error('pas de bouton rotation');b.click();},{i,deg});await page.waitForTimeout(2600);};
const rotOf=()=>page.evaluate(()=>{const T=window.TRACE;const L=Object.values(T.lines)[0];return L.cond.A.els.map(e=>e.rot||0);});
const srvElPos=()=>Object.keys((sites[SID].data||{}).elPos||{}).length;
// ── 1) sans SQL v3 : rotation → RPC tentée, 404 → plan entier → l'orientation est sur le serveur
let posts0=calls.filter(c=>/^POST \/rest\/v1\/sites/.test(c)).length;
await rotate(1,90);
out={rots:await rotOf(),rpc:rpcs.filter(r=>r==='site_set_part elPos').length,srv:srvElPos(),posts:calls.filter(c=>/^POST \/rest\/v1\/sites/.test(c)).length-posts0,badge:await page.evaluate(()=>(document.querySelector('#cloudBadge')||{}).textContent||''),pending:await page.evaluate(()=>window.TRACE.syncPending())};
console.log('1) sans SQL v3 :',JSON.stringify(out));C.c1=out.rots[1]===90&&out.rpc===1&&out.srv===1&&out.posts>=1&&/enregistré/.test(out.badge)&&!out.pending.length;
// ── 2) le serveur a une version PLUS RÉCENTE (autre appareil : un message de conversation) → notre rotation suivante FUSIONNE au lieu d'écraser ; la fiche reste ouverte
sites[SID].data.conv={msgs:[{id:'X1',at:new Date().toISOString(),by:'Karim B.',text:'Barrières posées côté mairie',photos:[],pos:null,kind:'msg',cat:'balisage'}],seq:2};sites[SID].updated_at=new Date(Date.now()+5000).toISOString();
await page.evaluate(()=>{window.TRACE.state.ownSiteWrite=0;});
posts0=calls.filter(c=>/^POST \/rest\/v1\/sites/.test(c)).length;
await rotate(2,-90);await page.waitForTimeout(800);
out={rots:await rotOf(),srv:srvElPos(),srvConv:((sites[SID].data.conv||{}).msgs||[]).length,local:await page.evaluate(()=>{const T=window.TRACE;return {conv:((T.net.conv||{}).msgs||[]).length,toast:document.querySelector('#toast').textContent,sel:T.state.sel&&T.state.sel.kind,sheet:document.querySelector('#sheet').classList.contains('show'),pending:T.syncPending()};}),posts:calls.filter(c=>/^POST \/rest\/v1\/sites/.test(c)).length-posts0,gets:calls.filter(c=>/^GET \/rest\/v1\/sites\?select=id(,|%2C)name(,|%2C)supplier(,|%2C)serie(,|%2C)data/.test(c)).length};
console.log('2) fusion avec plus récent :',JSON.stringify(out));C.c2=out.rots[1]===90&&out.rots[2]===270&&out.srv===2&&out.srvConv===1&&out.local.conv===1&&/serveur/.test(out.local.toast)&&out.local.sel==='j'&&out.local.sheet&&!out.local.pending.length&&out.posts===1&&out.gets>=1;
// ── 3) SQL v3 passé : la RPC seule écrit la partie (pas de plan entier) ; un tube tourné sur un AUTRE appareil (déjà au serveur, pas encore chez nous) n'est pas écrasé : fusion
V3='ok';posts0=calls.filter(c=>/^POST \/rest\/v1\/sites/.test(c)).length;const nRpc=rpcs.length;
const EL7=await page.evaluate(()=>{const T=window.TRACE;const L=Object.values(T.lines)[0];return L.id+'|A|'+L.cond.A.els[7].id;});sites[SID].data.elPos={...sites[SID].data.elPos,[EL7]:{rot:45,flip:0,td:0}};
await rotate(3,15);
out={rots:await rotOf(),srv:srvElPos(),other:!!(sites[SID].data.elPos||{})[EL7],rpc:rpcs.slice(nRpc),posts:calls.filter(c=>/^POST \/rest\/v1\/sites/.test(c)).length-posts0,badge:await page.evaluate(()=>(document.querySelector('#cloudBadge')||{}).textContent||'')};
console.log('3) avec SQL v3 :',JSON.stringify(out));C.c3=out.rots[3]===15&&out.srv===4&&out.other&&out.rpc.join()==='site_set_part elPos'&&out.posts===0&&/enregistré/.test(out.badge);
// ── 4) refus du serveur (droits) : alerte visible, la partie reste en attente ; quand le serveur accepte à nouveau, le réessai l'écrit
V3='refuse';await rotate(4,90);
out={badge:await page.evaluate(()=>(document.querySelector('#cloudBadge')||{}).textContent||''),toast:await page.evaluate(()=>document.querySelector('#toast').textContent),pending:await page.evaluate(()=>window.TRACE.syncPending()),srv:srvElPos(),rots:await rotOf()};
V3='ok';await page.evaluate(()=>window.TRACE.syncRetry());await page.waitForTimeout(2200);
out.after={pending:await page.evaluate(()=>window.TRACE.syncPending()),srv:srvElPos(),badge:await page.evaluate(()=>(document.querySelector('#cloudBadge')||{}).textContent||'')};
console.log('4) refus + réessai :',JSON.stringify(out));C.c4=/⚠️ orientation des tubes/.test(out.badge)&&/refusé/.test(out.toast)&&/chef/.test(out.toast)&&out.pending.includes('elPos')&&out.srv===4&&out.rots[4]===90&&!out.after.pending.length&&out.after.srv===5&&/enregistré/.test(out.after.badge);
// ── 4b) remis droit (0°) : l'entrée reste (à zéro) pour que la fusion serveur la voie
await page.evaluate(()=>{const T=window.TRACE;const L=Object.values(T.lines)[0];T.openJoint(L.id,'A',4);document.querySelector('#sheet [data-rota="-90"]').click();});await page.waitForTimeout(2600);
out={rots:await rotOf(),entry:(sites[SID].data.elPos||{})[Object.keys(sites[SID].data.elPos||{}).find(k=>/P5$|\|A\|[^|]*$/.test(k)&&(sites[SID].data.elPos[k]||{}).rot===0)]||null,srv:srvElPos()};
console.log('4b) remis droit :',JSON.stringify(out));C.c4b=out.rots[4]===0&&!!out.entry&&out.entry.rot===0&&out.srv===5;
// ── 5) rechargement : un 5e tube tourné depuis un autre appareil (serveur plus récent) → à l'ouverture, les 5 rotations sont là
{const r=sites[SID];const L=await page.evaluate(()=>{const T=window.TRACE;const L=Object.values(T.lines)[0];return {id:L.id,el:L.cond.A.els[6].id};});r.data.elPos={...r.data.elPos,[L.id+'|A|'+L.el]:{rot:180,flip:0,td:0}};r.updated_at=new Date(Date.now()+8000).toISOString();}
const nBefore=calls.length;await page.reload();await page.waitForTimeout(800);try{await page.waitForFunction(()=>window.TRACE&&window.TRACE.state.cloudUser,null,{timeout:5000});}catch(e){}
for(let i=0;i<6;i++){await page.evaluate(id=>window.TRACE.go(id),SID);try{await page.waitForFunction(()=>window.TRACE.state.siteId&&window.TRACE.state.screen==='site'&&Object.keys(window.TRACE.lines).length>0,null,{timeout:4000});break;}catch(e){}}
await page.waitForTimeout(2500);
out={rots:await rotOf(),srv:srvElPos(),cloud:await page.evaluate(()=>!!window.TRACE.state.cloudUser),toast:await page.evaluate(()=>document.querySelector('#toast').textContent)};
out.lastCheck=await page.evaluate(()=>window.TRACE.state.syncLastCheck||null);out.loads=calls.slice(nBefore).filter(c=>/^GET \/rest\/v1\/sites\?select=id(,|%2C)name(,|%2C)supplier(,|%2C)serie(,|%2C)data/.test(c)).length;
console.log('5) rechargement :',JSON.stringify(out));C.c5=out.cloud&&out.rots[1]===90&&out.rots[2]===270&&out.rots[3]===15&&out.rots[4]===0&&out.rots[6]===180&&out.rots[7]===45&&out.srv===6&&/rechargé/.test(out.lastCheck&&out.lastCheck.why||'')&&out.loads===1&&/Plan rechargé depuis le serveur/.test(out.toast);
// ── 6) ré-enregistrement depuis le TRACEUR (chantier trc_) : la copie de cet appareil ne doit pas écraser ce que les autres ont fait depuis (message, tube tourné) → parties reprises du serveur, orientations fusionnées
{const r=sites[SID];r.data.conv={...r.data.conv,msgs:[...r.data.conv.msgs,{id:'X2',at:new Date().toISOString(),by:'Paul D.',text:'Tranchée refermée côté école',photos:[],pos:null,kind:'msg',cat:'tranchee'}],seq:3};
 const EL9=await page.evaluate(()=>{const T=window.TRACE;const L=Object.values(T.lines)[0];return L.id+'|A|'+L.cond.A.els[8].id;});r.data.elPos={...r.data.elPos,[EL9]:{rot:90,flip:0,td:0}};r.updated_at=new Date(Date.now()+9000).toISOString();}
posts0=calls.filter(c=>/^POST \/rest\/v1\/sites/.test(c)).length;
await page.goto(BASE+'/traceur.html?site='+encodeURIComponent(SID));await page.waitForTimeout(1800);
await page.click('#bSave');await page.waitForTimeout(200);await page.selectOption('#svMode','update');await page.click('#svOk');await page.waitForTimeout(900);await page.click('#svGo');await page.waitForTimeout(1500);
try{await page.waitForFunction(()=>window.TRACE&&window.TRACE.state.cloudUser&&window.TRACE.state.screen==='site'&&/^trc_/.test(window.TRACE.state.siteId||'')&&Object.keys(window.TRACE.lines).length===1,null,{timeout:15000});}catch(e){}
await page.waitForTimeout(2500);
out={rots:await rotOf(),srv:srvElPos(),srvConv:((sites[SID].data.conv||{}).msgs||[]).map(m=>m.id).join(','),local:await page.evaluate(()=>{const T=window.TRACE;return {conv:((T.net.conv||{}).msgs||[]).map(m=>m.id).join(','),elPos:Object.keys(T.net.elPos||{}).length,pending:T.syncPending()};}),posts:calls.filter(c=>/^POST \/rest\/v1\/sites/.test(c)).length-posts0,sent:!!(sites[SID].data.traceur&&sites[SID].data.traceur.savedAt)};
console.log('6) reprise du traceur :',JSON.stringify(out));C.c6=out.rots[1]===90&&out.rots[6]===180&&out.rots[7]===45&&out.rots[8]===90&&out.srv===7&&out.srvConv==='X1,X2'&&out.local.conv==='X1,X2'&&out.local.elPos===7&&out.posts>=1&&out.sent;
const bad=Object.entries(C).filter(([k,v])=>!v).map(([k])=>k);console.log(bad.length?'RESULTAT: ECHEC '+bad.join(','):'RESULTAT: TOUT VERT');console.log(logs.length?logs:'[]');
await browser.close();
