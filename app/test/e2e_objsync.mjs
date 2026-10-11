// OBJECTIFS ET SERVEUR (Ethan 11/10 : « quand ça recharge et que ça indique x soudures rechargées pendant que tu poses un objectif, ça ferme la fenêtre pour poser l'objectif »).
// Cause : poser un objectif écrit la partie « missions » au serveur (site_set_part) sans aligner la date locale → 90 s plus tard « serveur plus récent » → chantier rechargé → pose perdue.
// Vérifié ici avec un Supabase simulé : (1) l'objectif part au serveur et la date locale suit (pas de faux « plus récent ») ; (2) pendant une pose, le contrôle périodique n'y touche pas,
// même si un autre appareil a vraiment écrit ; (3) la pose aboutit, puis le vrai changement de l'autre appareil est repris (fusion par jour).
import { chromium } from 'playwright';
const BASE=process.env.BASE||'http://localhost:8765';
const SB='https://pghftlepduvfazbiavhq.supabase.co';
const UID='11111111-2222-4333-8444-555555555555';const EMAIL='elebihan@scr-soudure.fr';
const profile={id:UID,email:EMAIL,name:'Ethan LE BIHAN',role:'chef',active:true,poste:'resp_exploitation',admin:true,type:'salarie',rights:{},sites:null,prenom:'Ethan',nom:'LE BIHAN',created_at:'2026-10-08T09:00:00Z'};
const paul={id:'u-2',email:'paul.durand@scr-soudure.fr',name:'Paul DURAND',nom:'DURAND',prenom:'Paul',role:'soudeur',active:true,poste:'soudeur',admin:false,type:'salarie',rights:{},sites:null,created_at:'2026-10-08T09:30:00Z'};const PK=paul.email;
const session=()=>({access_token:'tok',token_type:'bearer',expires_in:3600,expires_at:Math.floor(Date.now()/1000)+3600,refresh_token:'ref',user:{id:UID,email:EMAIL,aud:'authenticated',role:'authenticated',app_metadata:{},user_metadata:{},created_at:'2026-10-08T09:00:00Z'}});
const sites={};const calls=[],rpcs=[];
const browser=await chromium.launch({headless:true, executablePath: process.env.CHROMIUM_PATH||undefined});
const ctx=await browser.newContext({viewport:{width:900,height:940}});
await ctx.route(u=>u.href.startsWith(SB),async route=>{const req=route.request();const u=new URL(req.url());const p=u.pathname;const acc=req.headers()['accept']||'';calls.push(req.method()+' '+p+(u.search?u.search.slice(0,60):''));
  const json=(o,status=200)=>route.fulfill({status,contentType:'application/json',headers:{'access-control-allow-origin':'*'},body:JSON.stringify(o)});
  if(p==='/auth/v1/token')return json(session());
  if(p==='/auth/v1/user')return json(session().user);
  if(p.startsWith('/auth/v1/'))return json({});
  if(p==='/rest/v1/profiles'){const m=/id=eq\.([^&]+)/.exec(u.search);const rows=m?[profile,paul].filter(x=>x.id===decodeURIComponent(m[1])):[profile,paul];return json(/object/.test(acc)?(rows[0]||null):rows);}
  if(p==='/rest/v1/app_settings')return json(/object/.test(acc)?null:[]);
  if(p==='/rest/v1/rpc/site_set_part'){let b={};try{b=JSON.parse(req.postData()||'{}');}catch(e){}rpcs.push('site_set_part '+b.p_key);const row=sites[b.p_site];if(!row)return json({message:'chantier inconnu'},400);const old=row.data[b.p_key];
    const v=b.p_key==='missions'?{...(old||{}),...(b.p_value||{})}:b.p_value;row.data={...row.data,[b.p_key]:v};row.updated_at=new Date().toISOString();return json({at:row.updated_at,value:v});}
  if(p.startsWith('/rest/v1/rpc/'))return json(null);
  if(p==='/rest/v1/sites'){const sel=u.searchParams.get('select')||'';const m=/id=eq\.([^&]+)/.exec(u.search);const id=m?decodeURIComponent(m[1]):null;
    if(req.method()==='POST'){let b={};try{b=JSON.parse(req.postData()||'{}');}catch(e){}const rows=Array.isArray(b)?b:[b];const prefer=req.headers()['prefer']||'';
      rows.forEach(r=>{if(sites[r.id]&&/ignore-duplicates/.test(prefer))return;sites[r.id]={id:r.id,name:r.name,supplier:r.supplier||null,serie:r.serie||null,data:r.data||{},updated_at:r.updated_at||new Date().toISOString()};});return json([]);}
    let rows=Object.values(sites).filter(r=>!id||r.id===id);
    if(/sat:|builtin:/.test(sel))rows=rows.map(r=>({id:r.id,name:r.name,supplier:r.supplier,updated_at:r.updated_at,geo:r.data.geo||null,origin:r.data.origin||null,bgo:null,sat:r.data.traceur&&r.data.traceur.savedAt||null,w:r.data.w||null,h:r.data.h||null,bbox:null,nbox:null,nw:null,deleted:r.data.deleted||null,deletedAt:null,builtin:r.data.builtin||null,ville:r.data.fiche&&r.data.fiche.ville||null,chef:null,conducteur:null,secteur:null}));
    return json(/object/.test(acc)?(rows[0]||null):rows);}
  if(p.startsWith('/rest/v1/'))return json([]);
  return json([]);});
const page=await ctx.newPage();
const logs=[];page.on('pageerror',e=>logs.push('PAGEERROR: '+e.message.slice(0,300)));page.on('console',m=>{if(m.type()==='error'&&!/realtime|websocket|Failed to fetch|net::ERR|404|400/i.test(m.text()))logs.push(m.text().slice(0,200));});
page.on('dialog',d=>d.accept().catch(()=>{}));
const C={};const wait=ms=>page.waitForTimeout(ms);
await page.clock.install({time:new Date(2026,9,9,8,30,0)}); /* vendredi 09/10/2026 */
await page.goto(BASE+'/index.html');await wait(600);await page.evaluate(()=>{localStorage.clear();});await page.reload();await wait(900);
await page.fill('#loginEmail',EMAIL);await page.fill('#loginPwd','Soudure-2026!');await page.click('#loginGo');await wait(1500);
await page.goto(BASE+'/traceur.html');await wait(500);
await page.evaluate(()=>{const S=window.MAQ.state;S.supplier='AXIOM';S.lines=[{id:'L1',name:'Feeder',dn:100,bar:12,pts:[[10,50],[110,50]],specials:[],parent:null}];S.seq=2;window.MAQ.setMode('select');window.MAQ.rebuild();});
await page.click('#bSave');await wait(200);await page.fill('#svName','Objsync test');await page.click('#svOk');await wait(700);await page.click('#svGo');await wait(1500);
try{await page.waitForFunction(()=>window.TRACE&&window.TRACE.state.cloudUser&&window.TRACE.state.screen==='site'&&/^trc_/.test(window.TRACE.state.siteId||'')&&Object.keys(window.TRACE.lines).length===1,null,{timeout:15000});}catch(e){}
await wait(1800);
const SID=await page.evaluate(()=>window.TRACE.state.siteId);
await page.evaluate(([id,pk])=>{const T=window.TRACE;const js=['2026-10-05','2026-10-06','2026-10-07','2026-10-08','2026-10-09'];T.espace.savePlanning('2026-W41',{[pk]:Object.assign(Object.fromEntries(js.map(d=>[d,[id]])),{['eq:'+id]:'A'})});},[SID,PK]);await wait(1200); /* Paul (compte réel) sur le chantier toute la semaine, équipe A */
const openObj=async()=>{await page.evaluate(async()=>{const T=window.TRACE;document.getElementById('btnHome').click();await new Promise(r=>setTimeout(r,400));document.getElementById('htExpl').click();T.renderHome();await new Promise(r=>setTimeout(r,200));const bk=document.querySelector('#eq-app .ac-back');if(bk){bk.click();await new Promise(r=>setTimeout(r,200));}[...document.querySelectorAll('#eq-app .ac-row')].find(x=>/Objectifs des équipes/.test(x.textContent)).click();});await wait(300);};
const tapWorld=async(x,y)=>{await page.evaluate(([x,y])=>window.TRACE.centerOn(x,y,30),[x,y]);await wait(150);const pt=await page.evaluate(([x,y])=>{const v=window.TRACE.state.view;const r=document.querySelector('#canvas').getBoundingClientRect();return {x:r.left+x*v.k+v.tx,y:r.top+y*v.k+v.ty};},[x,y]);await page.mouse.move(pt.x,pt.y);await page.mouse.down();await wait(40);await page.mouse.up();await wait(250);};
// ── 1) un objectif posé (sans plan) → RPC site_set_part « missions » → le serveur est à jour ET la copie locale porte la même date : le contrôle « plus récent » ne recharge rien
let out={srv0:!!sites[SID]};await openObj();
await page.evaluate(sid=>{document.querySelector('#eq-app [data-act=objadd][data-v="'+sid+'|A"]').click();},SID);await wait(300);
await page.evaluate(()=>{document.getElementById('obj-label').value='Décharger';document.getElementById('obj-h').value='2';document.querySelector('#eq-app [data-act=objok]').click();});await wait(1800);
out.rpc=rpcs.filter(r=>r==='site_set_part missions').length;const rpc1=out.rpc;out.srvMissions=((sites[SID]||{}).data||{}).missions&&Object.keys(sites[SID].data.missions);
out.dates=await page.evaluate(sid=>{const T=window.TRACE;return {local:T.sites[sid]&&T.sites[sid].updated_at,own:T.state.ownSiteWrite>0};},SID);out.dates.srv=sites[SID].updated_at;
await page.evaluate(()=>{window.TRACE.state.ownSiteWrite=0;});const chk1=await page.evaluate(async()=>{const T=window.TRACE;await T.syncCheck();return T.state.syncLastCheck;});out.chk1=chk1&&chk1.why;
console.log('1) objectif au serveur, date locale alignée :',JSON.stringify(out));
C.c1=out.srv0&&out.rpc>=1&&out.srvMissions&&out.srvMissions.includes('2026-10-09')&&out.dates.local===out.dates.srv&&out.dates.own&&out.chk1==='à jour';
// ── 2) pose d'un objectif sur le plan en cours ; un AUTRE appareil écrit vraiment sur le serveur → le contrôle périodique passe son tour, la pose reste ouverte
await openObj();await page.evaluate(sid=>{document.querySelector('#eq-app [data-act=objadd][data-v="'+sid+'|A"]').click();},SID);await wait(300);
await page.evaluate(()=>{document.getElementById('obj-label').value='Souder tronçon 1';document.getElementById('obj-h').value='6';document.querySelector('#eq-app [data-act=objplan]').click();});await wait(1500);
await tapWorld(40,50);
sites[SID].data.missions={...(sites[SID].data.missions||{}),'2026-10-08':[{id:'Mautre',type:'dech',label:'Objectif posé ailleurs',h:1,who:[],by:'Autre appareil',at:new Date().toISOString()}]};sites[SID].updated_at=new Date(Date.now()+60000).toISOString(); /* un autre appareil pose un objectif sur JEUDI (le serveur fusionne par jour : chaque jour appartient au dernier qui l'écrit) */
await page.evaluate(()=>{window.TRACE.state.ownSiteWrite=0;});
out=await page.evaluate(async()=>{const T=window.TRACE;const before={pose:!!T.state.phPose,a:!!(T.state.phPose&&T.state.phPose.a),bar:document.querySelector('#phBar').style.display!=='none'};await T.syncCheck();return {before,why:T.state.syncLastCheck&&T.state.syncLastCheck.why,pose:!!T.state.phPose,a:!!(T.state.phPose&&T.state.phPose.a),bar:document.querySelector('#phBar').style.display!=='none',msg:document.querySelector('#phMsg').textContent};});
console.log('2) autre appareil pendant la pose :',JSON.stringify(out));
C.c2=out.before.pose&&out.before.a&&out.before.bar&&out.why==='saisie en cours sur le plan'&&out.pose&&out.a&&out.bar&&/Début posé/.test(out.msg);
// ── 3) la pose aboutit (fin + « Poser l'objectif ») ; puis le changement de l'autre appareil (jeudi) est repris au contrôle suivant, mes objectifs de vendredi sont intacts et au serveur
await tapWorld(100,50);await page.evaluate(()=>document.querySelector('#phOk').click());await wait(1500);
out=await page.evaluate(sid=>{const T=window.TRACE;const ms=(T.sites[sid].missions||{})['2026-10-09']||[];return {pose:!!T.state.phPose,labels:ms.map(m=>m.label),screen:T.state.screen};},SID);
await wait(1200);out.rpcAfter=rpcs.filter(r=>r==='site_set_part missions').length;out.srvLabels=((sites[SID].data.missions||{})['2026-10-09']||[]).map(m=>m.label);
await page.evaluate(sid=>{const T=window.TRACE;T.state.ownSiteWrite=0;},SID);
out.chk=await page.evaluate(async()=>{const T=window.TRACE;await T.syncCheck();return T.state.syncLastCheck&&T.state.syncLastCheck.why;});
out.after=await page.evaluate(sid=>{const T=window.TRACE;const M=T.sites[sid].missions||{};return {ven:(M['2026-10-09']||[]).map(m=>m.label).sort(),jeu:(M['2026-10-08']||[]).map(m=>m.label)};},SID);
console.log('3) pose aboutie, puis reprise du serveur :',JSON.stringify(out));
C.c3=!out.pose&&out.labels.includes('Souder tronçon 1')&&out.rpcAfter>rpc1&&out.srvLabels.includes('Souder tronçon 1')&&/à jour|serveur plus récent/.test(out.chk)&&out.after.ven.join()==='Décharger,Souder tronçon 1'&&out.after.jeu.join()==='Objectif posé ailleurs'; /* le jour de l'autre appareil arrive avec la réponse fusionnée du serveur */
// ── 4) périmètre (Ethan 11/10 : « les conducteurs et chefs de chantier ne doivent voir que leur propre équipe ou chantier ») : Paul passe chef de chantier (non admin), placé équipe A sur le chantier
//       dont Ethan est le chef en fiche → « Voir l'appli comme » Paul → Objectifs : ce chantier seulement, SON équipe A seulement (pas de « Sans équipe », pas de « tout le chantier »)
await page.evaluate(([sid,pk])=>{const T=window.TRACE;const a=(T.state.accounts||[]).find(x=>x.email===pk);if(a)a.poste='chef';T.sites[sid].fiche=Object.assign({},T.sites[sid].fiche||{},{chef:'elebihan@scr-soudure.fr',ville:'Caen'});const x=JSON.parse(JSON.stringify(T.sites[sid]));x.id='demo_autre';x.name='Autre chantier';x.fiche={ville:'Rennes',chef:'elebihan@scr-soudure.fr'};x.missions={};T.sites.demo_autre=x;},[SID,PK]);
await page.evaluate(async()=>{const T=window.TRACE;document.getElementById('btnHome').click();await new Promise(r=>setTimeout(r,300));T.renderHome();});await wait(300);
out=await page.evaluate(()=>{const sel=document.querySelector('#homeAs');const o=sel&&[...sel.options].find(x=>/Paul/.test(x.textContent));return {opt:o&&o.value};});
await page.selectOption('#homeAs',out.opt);await wait(500);
await page.evaluate(async()=>{const T=window.TRACE;document.getElementById('htExpl').click();T.renderHome();await new Promise(r=>setTimeout(r,250));const bk=document.querySelector('#eq-app .ac-back');if(bk){bk.click();await new Promise(r=>setTimeout(r,200));}[...document.querySelectorAll('#eq-app .ac-row')].find(x=>/Objectifs des équipes/.test(x.textContent)).click();});await wait(400);
Object.assign(out,await page.evaluate(()=>{const me=window.TRACE.acces.current();return {me:me.name,poste:me.poste,admin:!!me.admin,sites:[...document.querySelectorAll('#eq-app .eq-objsite .eq-big')].map(x=>x.textContent.trim()),heads:[...document.querySelectorAll('#eq-app .eq-objsite .eq-plteam')].map(h=>h.textContent.replace(/\s+/g,' ').trim()),btns:[...document.querySelectorAll('#eq-app [data-act=objadd]')].map(b=>b.dataset.v),own:/Ton équipe A sur ce chantier · chef du chantier : Ethan/.test(document.getElementById('eq-app').textContent)};}));
await page.selectOption('#homeAs','__me');await wait(300);
console.log('4) périmètre du chef de chantier :',JSON.stringify(out));
C.c4=/Paul/.test(out.me)&&out.poste==='chef'&&!out.admin&&out.sites.length===1&&/Objsync test/.test(out.sites[0])&&out.heads.length===1&&/^Équipe A/.test(out.heads[0])&&out.btns.length===1&&/\|A$/.test(out.btns[0])&&out.own;
const bad=Object.entries(C).filter(([k,v])=>!v).map(([k])=>k);console.log(bad.length?'RESULTAT: ECHEC '+bad.join(','):'RESULTAT: TOUT VERT');console.log(logs.length?logs:'[]');
await browser.close();
