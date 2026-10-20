// LOT PA (20/10/2026) — POINTS PHOTO DU PLAN D'ENSEMBLE : vannes, purges, vidanges, sous-stations, raccordements (Ethan : « des points sur lesquels on peut prendre
// des photos, plusieurs fois … ouverte ou fermée, avec date de dernière mise à jour et photo »).
// Données 100 % FICTIVES (comptes « exemple.fr », « Villefictive »), serveur Supabase SIMULÉ (profils, registre avec la règle pteq, chantiers, soudures, stockage des
// photos), tracé fait par le VRAI traceur : une ligne DN100 avec une vanne, un té de purge, un té de vidange, une sous-station en bout (et le raccordement de départ).
//  c1  chef (PC 1366) : chantier créé, 5 points ○ sur le plan dès 3 px/m, rien en dessous, case 👁 « Points », tap souris sur la pastille → fiche, bouton « 📍 Points »
//  c2  soudeur (téléphone 390) : tap (pointer) sur la pastille → fiche ; « 🔒 Fermée » → constat au serveur (byKey = lui), « depuis le … par Dominique FICTIF »,
//      pastille 🔒 ; photo proposée → jointe au constat, envoyée au stockage (adresse https) ; 2e constat « épreuve » avec 2 photos + note
//  c3  hors connexion : constat « manipulation » avec photo → gardé sur l'appareil (data:, file d'envoi), rien au serveur ; retour du réseau → parti (photo en ligne)
//  c4  2e soudeur : lit les constats, pas de 🗑 sur ceux d'un autre, suppression refusée ; ajoute le sien
//  c5  chef : liste « Points » (par ligne, état, maj, photos, dernier contexte), filtres, compteurs, « Voir sur le plan », retire le constat du 2e soudeur, Bureau (checklist),
//      « Suivre ce point » sur une barre, constat orphelin « pièce absente du tracé actuel », DOE (données, carnet, galerie, zip)
//  c6  390 px : aucun débordement ; c7 : zéro erreur console
import { chromium } from 'playwright';
import { mkdirSync } from 'node:fs';
import { unzipSync, strFromU8 } from 'fflate';
const BASE=process.env.BASE||'http://localhost:8817';
const SHOTS=process.env.SHOTS||'';if(SHOTS)try{mkdirSync(SHOTS,{recursive:true});}catch(e){}
const SB='https://pghftlepduvfazbiavhq.supabase.co';
const CHEF={id:'cccccccc-3333-4333-8333-333333333333',email:'claude.fictif@exemple.fr',name:'Claude FICTIF',prenom:'Claude',nom:'FICTIF',role:'bureau',active:true,poste:'chef',admin:false,type:'salarie',rights:{},sites:null,created_at:'2026-09-01T08:00:00Z'};
const SOUD={id:'dddddddd-4444-4444-8444-444444444444',email:'dominique.fictif@exemple.fr',name:'Dominique FICTIF',prenom:'Dominique',nom:'FICTIF',role:'soudeur',active:true,poste:'soudeur',admin:false,type:'salarie',rights:{},sites:null,created_at:'2026-09-01T08:00:00Z'};
const SOUD2={id:'bbbbbbbb-2222-4222-8222-222222222222',email:'bruno.essai@exemple.fr',name:'Bruno ESSAI',prenom:'Bruno',nom:'ESSAI',role:'soudeur',active:true,poste:'manchonneur',admin:false,type:'salarie',rights:{},sites:null,created_at:'2026-10-14T09:30:00Z'};
const PROFILES=[CHEF,SOUD,SOUD2];const MGR=P=>P.admin||P.role==='chef'||P.role==='bureau';
const b64u=o=>Buffer.from(JSON.stringify(o)).toString('base64').replace(/=+$/,'').replace(/\+/g,'-').replace(/\//g,'_');
const userOf=P=>({id:P.id,aud:'authenticated',role:'authenticated',email:P.email,email_confirmed_at:'2026-10-01T09:00:00Z',app_metadata:{provider:'email'},user_metadata:{},identities:[],created_at:P.created_at,updated_at:new Date().toISOString()});
const sessionOf=P=>{const t=Math.floor(Date.now()/1000);return {access_token:b64u({alg:'HS256',typ:'JWT'})+'.'+b64u({iss:SB+'/auth/v1',sub:P.id,aud:'authenticated',exp:t+3600,iat:t,email:P.email,role:'authenticated'})+'.sig',token_type:'bearer',expires_in:3600,expires_at:t+3600,refresh_token:'rt-'+t,user:userOf(P)};};
/* ── serveur simulé : registre (règle pteq de sql/retours_20-10pa.sql), chantiers, soudures, stockage ── */
const REG={},SITES={},WELDS={},STORE={};const nowIso=()=>new Date().toISOString();let OFFLINE=false;const REFUS=[];
const regPut=(kind,id,data)=>{REG[kind+'|'+id]={kind,id,data:JSON.parse(JSON.stringify(data)),updated_at:nowIso()};};
const regRows=(kinds,since)=>Object.values(REG).filter(r=>(!kinds||kinds.includes(r.kind))&&(!since||r.updated_at>since));
const pteq=()=>Object.values(REG).filter(r=>r.kind==='pteq'&&!r.data.deleted).map(r=>Object.assign({id:r.id},r.data));
const CORS={'access-control-allow-origin':'*','access-control-allow-headers':'*','access-control-allow-methods':'GET, POST, PUT, PATCH, DELETE, OPTIONS','access-control-expose-headers':'*'};
const PNG=Buffer.from('iVBORw0KGgoAAAANSUhEUgAAABAAAAAMCAIAAADkharWAAABU0lEQVR4nA3LIQHFIBRAUSIgCDCJJACCCC/CBAGQVy4AgggvwgQBJpEEQBCBCP8ff4wxWMNlCIZkEMNtKIbH0AxqeA2fYRq24RiMcVjH5QiO5BDH7SiOx9Ec6ngdn2M6tuO4f/BYz+UJnuQRz+0pnsfTPOp5PZ9nerbn+H+I2MgVCZEUkcgdKZEn0iIaeSNfZEZ25MR/EKxwCUFIggi3UIRHaIIKr/AJU9jCkX/I2MyVCZmUkcydKZkn0zKaeTNfZmZ25uR/AAsXBEggcEOBBxoovPDBhA2Hf6jYylUJlVSRyl0plafSKlp5K19lVnbl1H9QrHIpQUmKKLdSlEdpiiqv8ilT2crRf+jYztUJndSRzt0pnafTOtp5O19ndnbn9H8Y2ME1CIM0kME9KINn0AY6eAffYA724Ix/WNjFtQiLtJDFvSiLZ9EWungX32Iu9uIsflUEBpBsGbC5AAAAAElFTkSuQmCC','base64'); /* 16×12, fictif */
const browser=await chromium.launch({headless:true,executablePath:process.env.CHROMIUM_PATH||undefined});
const logs=[];const C={};let CUR=CHEF;
async function mkCtx(who,vp,mobile){CUR=who;const ctx=await browser.newContext(Object.assign({viewport:vp,acceptDownloads:true},mobile?{deviceScaleFactor:2,isMobile:true,hasTouch:true}:{}));
  await ctx.route(u=>!/^(127\.0\.0\.1|localhost)$/.test(u.hostname)&&!u.href.startsWith(SB),route=>route.fulfill({status:200,contentType:'application/json',headers:CORS,body:'{}'})); /* rien ne sort */
  await ctx.route(u=>u.href.startsWith(SB),async route=>{const req=route.request();const u=new URL(req.url());const p=u.pathname;const acc=req.headers()['accept']||'';const json=(o,status=200)=>route.fulfill({status,contentType:'application/json',headers:CORS,body:JSON.stringify(o)});
    if(req.method()==='OPTIONS')return route.fulfill({status:200,headers:CORS,body:''});if(OFFLINE)return route.abort('internetdisconnected');let b={};try{b=JSON.parse(req.postData()||'{}');}catch(e){}
    if(p==='/auth/v1/token')return json(sessionOf(who));if(p==='/auth/v1/user')return json(userOf(who));if(p.startsWith('/auth/v1/'))return json({});
    if(p==='/rest/v1/profiles'){const m=/id=eq\.([^&]+)/.exec(u.search);const r=m?PROFILES.filter(x=>x.id===decodeURIComponent(m[1])):PROFILES;return json(/object/.test(acc)?(r[0]||null):r);}
    if(p==='/rest/v1/registre'){const m=/kind=in\.\(([^)]+)\)/.exec(decodeURIComponent(u.search));const kinds=m?m[1].replace(/"/g,'').split(','):null;const g=/updated_at=gt\.([^&]+)/.exec(u.search);return json(regRows(kinds,g?decodeURIComponent(g[1]):null));}
    if(p==='/rest/v1/rpc/registre_set'){const k=b.p_kind+'|'+b.p_id;const old=(REG[k]||{}).data||null;const me=who.email;
      if(b.p_kind==='pteq'&&!MGR(who)){const pt=b.p_patch||{};const ko=m=>{REFUS.push({who:me,id:b.p_id,m});return json({code:'P0001',message:m,details:null,hint:null},400);};
        if(b.p_mode==='replace')return ko('point de contrôle : remplacement réservé à l\'encadrement / bureau');
        if(pt.byKey!==undefined&&String(pt.byKey).toLowerCase()!==me)return ko('constat d\'une autre personne : réservé à l\'encadrement / bureau');
        if(!old){if(pt.byKey===undefined)return ko('point de contrôle : auteur absent (byKey)');}else if(String(old.byKey||'').toLowerCase()!==me)return ko('constat d\'une autre personne : réservé à l\'encadrement / bureau');}
      const data=b.p_mode==='replace'?Object.assign({},b.p_patch):Object.assign({},old||{},b.p_patch||{});Object.keys(b.p_patch||{}).forEach(x=>{if(b.p_patch[x]===null)delete data[x];});REG[k]={kind:b.p_kind,id:b.p_id,data,updated_at:nowIso()};return json(REG[k]);}
    if(p==='/rest/v1/rpc/site_set_part'){const row=SITES[b.p_site];if(!row)return json(null);row.data=Object.assign({},row.data,{[b.p_key]:b.p_value});row.updated_at=nowIso();return json({at:row.updated_at,value:b.p_value});}
    if(p.startsWith('/rest/v1/rpc/'))return json(null);
    if(p==='/rest/v1/sites'){const sel=u.searchParams.get('select')||'';const m=/id=eq\.([^&]+)/.exec(u.search);const id=m?decodeURIComponent(m[1]):null;
      if(req.method()==='POST'){const rows=Array.isArray(b)?b:[b];const prefer=req.headers()['prefer']||'';rows.forEach(r=>{if(SITES[r.id]&&/ignore-duplicates/.test(prefer))return;SITES[r.id]={id:r.id,name:r.name,supplier:r.supplier||null,serie:r.serie||null,data:r.data||{},updated_at:r.updated_at||nowIso()};});return json([]);}
      let rows=Object.values(SITES).filter(r=>!id||r.id===id);
      if(/sat:/.test(sel))rows=rows.map(r=>({id:r.id,name:r.name,supplier:r.supplier,updated_at:r.updated_at,geo:r.data.geo||null,origin:null,bgo:null,sat:r.data.traceur&&r.data.traceur.savedAt||null,w:r.data.w||null,h:r.data.h||null,bbox:null,nbox:null,nw:null,deleted:r.data.deleted||null,deletedAt:r.data.deletedAt||null,builtin:null,ville:(r.data.fiche||{}).ville||null,chef:(r.data.fiche||{}).chef||null,conducteur:(r.data.fiche||{}).conducteur||null,secteur:null,etude:(r.data.fiche||{}).etude||null}));
      return json(/object/.test(acc)?(rows[0]||null):rows);}
    if(p==='/rest/v1/welds'){if(req.method()==='POST'){(Array.isArray(b)?b:[b]).forEach(r=>{WELDS[r.site_id+'|'+r.weld_id]=r;});return json([]);}const m=/site_id=eq\.([^&]+)/.exec(u.search);const sid=m?decodeURIComponent(m[1]):null;return json(Object.values(WELDS).filter(r=>!sid||r.site_id===sid).map(r=>({weld_id:r.weld_id,line_id:r.line_id,cond:r.cond,status:r.status,data:r.data||{}})));}
    if(p==='/rest/v1/people')return json([]);
    /* stockage : envoi (multipart) → objet gardé ; adresse signée ; lecture de l'adresse signée → l'image fictive */
    if(p.startsWith('/storage/v1/object/sign/')){const path=p.slice('/storage/v1/object/sign/'.length);if(req.method()==='POST')return json({signedURL:'/object/sign/'+path+'?token=fictif'});if(!STORE[path])return route.fulfill({status:404,headers:CORS,body:'absent'});return route.fulfill({status:200,contentType:'image/png',headers:CORS,body:PNG});}
    if(p.startsWith('/storage/v1/object/')){const path=p.slice('/storage/v1/object/'.length);if(req.method()==='POST'||req.method()==='PUT'){STORE[path]={at:nowIso(),by:who.email,size:(req.postDataBuffer()||Buffer.alloc(0)).length};return json({Key:path,Id:'x'});}return route.fulfill({status:404,headers:CORS,body:'absent'});}
    if(p.startsWith('/storage/v1/'))return json({});
    if(p.startsWith('/rest/v1/'))return json(/object/.test(acc)?null:[]);
    return json([]);});
  const page=await ctx.newPage();page.on('dialog',d=>d.accept().catch(()=>{}));
  page.on('pageerror',e=>logs.push('PAGEERROR ('+who.prenom+') : '+e.message.slice(0,300)+' @ '+String(e.stack||'').split('\n').slice(1,4).join(' | ').slice(0,400)));page.on('console',m=>{if(m.type()==='error'&&!/realtime|websocket|Failed to fetch|net::ERR|404|400|ERR_/i.test(m.text()))logs.push(who.prenom+': '+m.text().slice(0,200));});
  await page.goto(BASE+'/index.html');await page.waitForTimeout(500);await page.evaluate(w=>{localStorage.clear();if(w)localStorage.setItem('trace:wide','1');},!mobile);await page.evaluate(()=>new Promise(r=>{try{const q=indexedDB.deleteDatabase('trace-kv');q.onsuccess=q.onerror=q.onblocked=()=>r();}catch(e){r();}}));
  await page.reload();await page.waitForTimeout(900);await page.fill('#loginEmail',who.email);await page.fill('#loginPwd','Mot-de-passe-fictif-1');await page.click('#loginGo');await page.waitForTimeout(3000);
  return {ctx,page};}
const shot=async(pg,name)=>{if(!SHOTS)return;try{await pg.screenshot({path:SHOTS+'/'+name+'.png'});}catch(e){console.log('capture '+name+' : '+e.message);}};
const OV=[];const ov=async(page,tag)=>{const o=await page.evaluate(()=>{const sh=document.getElementById('sheet');const pv=document.getElementById('points');const r=sh&&sh.classList.contains('show')?sh.getBoundingClientRect():null;return {doc:document.documentElement.scrollWidth,win:window.innerWidth,sheet:r?r.right:0,pts:pv?pv.scrollWidth-pv.clientWidth:0,rows:[...document.querySelectorAll('#points .pt-row,#sheet .pt-con,#sheet .pt-etat')].every(el=>el.getBoundingClientRect().right<=window.innerWidth+1)};});const ok=o.doc<=o.win+1&&o.sheet<=o.win+1&&o.pts<=1&&o.rows;if(!ok)console.log('DÉBORDEMENT 390 :',tag,JSON.stringify(o));OV.push(ok);};
const flushed=async page=>{await page.waitForFunction(()=>window.TRACE&&window.TRACE.reg.pending().length===0&&window.TRACE.ptseq.pending().length===0,null,{timeout:20000}).catch(()=>{});await page.waitForTimeout(250);};
const openSite=async(pg,id)=>{await pg.evaluate(id=>window.TRACE.openSiteFromHome(id),id);await pg.waitForFunction(id=>window.TRACE.state.screen==='site'&&window.TRACE.state.siteId===id,id,{timeout:20000}).catch(()=>{});await pg.waitForTimeout(1500);};
const sheetTxt=page=>page.evaluate(()=>document.getElementById('sheet').textContent.replace(/\s+/g,' ').trim());
const glyphs=page=>page.evaluate(()=>Object.fromEntries([...document.querySelectorAll('#ptG [data-pt]')].map(g=>[g.dataset.pt,g.querySelector('text').textContent])));
const toast=page=>page.evaluate(()=>(document.getElementById('toast')||{}).textContent||'');
/* tap « doigt » sur une pastille : la même séquence pointer que le plan (pointerdown / pointerup sur la cible, sans bouger) — sans le clic de compatibilité du navigateur */
const tapPt=async(page,key)=>page.evaluate(key=>{const g=document.querySelector(`#ptG [data-pt="${key}"] circle`);if(!g)return false;const r=g.getBoundingClientRect();const x=r.left+r.width/2,y=r.top+r.height/2;const o={bubbles:true,cancelable:true,clientX:x,clientY:y,pointerId:7,pointerType:'touch',isPrimary:true};g.dispatchEvent(new PointerEvent('pointerdown',o));document.getElementById('canvas').dispatchEvent(new PointerEvent('pointerup',o));return true;},key);
const VK='L1|vanne@20.0';
// ══ c1 · chef (PC) : tracé → chantier sur le serveur, 5 points ○, zoom, 👁, tap souris, bouton « 📍 Points »
let {ctx,page}=await mkCtx(CHEF,{width:1366,height:900});
await page.goto(BASE+'/traceur.html?site=new');await page.waitForTimeout(1300);
await page.evaluate(()=>{const M=window.MAQ;M.state.supplier='AXIOM';M.state.serie=1;M.state.lines=[{id:'L1',name:'Rue Fictive',dn:100,bar:12,pts:[[0,0],[120,0]],specials:[{id:'v1',type:'valve',m:20},{id:'pv1',type:'tee',vert:'up',pvKind:'purge',m:35,dnb:25},{id:'pv2',type:'tee',vert:'down',pvKind:'vidange',m:50,dnb:40}],parent:null,endType:'sousstation'}];M.state.seq=2;M.setMode('select');M.rebuild();M.save();});await page.waitForTimeout(300);
await page.click('#bSave');await page.waitForTimeout(250);await page.fill('#svName','Villefictive points');await page.click('#svOk');await page.waitForTimeout(1500);
const CID=await page.evaluate(()=>window.MAQ.state.siteRef&&window.MAQ.state.siteRef.id);
await page.goto(BASE+'/index.html');await page.waitForTimeout(1500);await openSite(page,CID);
let out={cid:CID,srv:!!SITES[CID]};
out.pts=await page.evaluate(()=>window.TRACE.ptseq.points().map(p=>p.key+':'+p.nature+':'+p.glyph+':'+p.auto));
out.z8=await page.evaluate(()=>{const T=window.TRACE;T.centerOn(60,0,6);return document.querySelectorAll('#ptG [data-pt]').length;}); /* 6 px/m : toute la ligne à l'écran, 5 pastilles */
out.z2=await page.evaluate(()=>{const T=window.TRACE;T.state.view.k=2;T.centerOn(60,0);return document.querySelectorAll('#ptG [data-pt]').length;}); /* 2 px/m (< 3) : rien */
out.z20=await page.evaluate(()=>{const T=window.TRACE;T.centerOn(30,0,20);T.renderPlan();return {n:document.querySelectorAll('#ptG [data-pt]').length,inNet:document.querySelectorAll('#net [data-pt]').length,kpm:Math.round(T.state.view.k*(T.sheet?T.sheet().ppm:1))};});
await shot(page,'pc_1_plan_points_vides');
/* 👁 : la case « Points » éteint les pastilles, puis les rallume */
await page.evaluate(()=>{const b=document.querySelector('.zoomctl [data-z=eye]');if(b)b.click();});await page.waitForTimeout(250);
out.disp=await page.evaluate(()=>{const cb=document.querySelector('#disp input[data-k=points]');if(!cb)return {cb:false};const label=cb.parentElement.textContent.trim();cb.checked=false;cb.dispatchEvent(new Event('change',{bubbles:true}));const off=document.querySelectorAll('#ptG [data-pt]').length;const cb2=document.querySelector('#disp input[data-k=points]');cb2.checked=true;cb2.dispatchEvent(new Event('change',{bubbles:true}));return {cb:true,off,on:document.querySelectorAll('#ptG [data-pt]').length,label};});
await page.evaluate(()=>{const b=document.querySelector('.zoomctl [data-z=eye]');if(b)b.click();});await page.waitForTimeout(150);
/* tap souris sur la pastille de la vanne → fiche du point (titre, ligne, PK, DN, deux gros boutons d'état) */
{const bb=await page.evaluate(k=>{const g=document.querySelector(`#ptG [data-pt="${k}"] circle`);const r=g.getBoundingClientRect();return {x:r.left+r.width/2,y:r.top+r.height/2};},VK);await page.mouse.click(bb.x,bb.y);await page.waitForTimeout(500);}
out.fiche=await page.evaluate(()=>{const s=window.TRACE.state.sel;const sh=document.getElementById('sheet');const btn=[...sh.querySelectorAll('[data-pact=etat]')].map(b=>({t:b.textContent.trim(),h:b.getBoundingClientRect().height}));return {sel:s&&s.kind+':'+s.pt,show:sh.classList.contains('show'),txt:sh.textContent.replace(/\s+/g,' ').slice(0,220),btn,piece:!!sh.querySelector('[data-pact=piece]')};});
await shot(page,'pc_2_fiche_vanne_vide');
/* fiche PIÈCE toujours là (orientation des fils, état DH) depuis la fiche du point, et retour */
await page.evaluate(()=>document.querySelector('#sheet [data-pact=piece]').click());await page.waitForTimeout(300);
out.piece=await page.evaluate(()=>{const s=window.TRACE.state.sel;const sh=document.getElementById('sheet');return {sel:s&&s.kind,fils:/Orientation des fils/.test(sh.textContent),bloc:!!sh.querySelector('.pt-el [data-pact=openpt]')};});
await page.evaluate(()=>document.querySelector('#sheet .pt-el [data-pact=openpt]').click());await page.waitForTimeout(300);out.back=await page.evaluate(()=>{const s=window.TRACE.state.sel;return s&&s.kind+':'+s.pt;});
await page.evaluate(()=>window.TRACE.closeSheet());
/* bouton « 📍 Points » dans les outils du plan → onglet ; onglet dans la barre (facette Technique) */
out.btn=await page.evaluate(()=>{const b=document.getElementById('btnPoints');if(!b)return null;b.click();return {tab:window.TRACE.state.tab,h2:(document.querySelector('#points h2')||{}).textContent||'',tabBtn:!!document.querySelector('#tabbar [data-tab=points]'),rows:document.querySelectorAll('#points .pt-row').length};});
await shot(page,'pc_3_onglet_points_vide');
console.log('c1) chef, chantier et points :',JSON.stringify(out));
C.c1=out.srv&&out.pts.length===5&&out.pts.includes('L1|vanne@20.0:vanne:○:true')&&out.pts.includes('L1|purge@35.0:purge:○:true')&&out.pts.includes('L1|vidange@50.0:vidange:○:true')&&out.pts.includes('L1|sst@120.0:sst:○:true')&&out.pts.includes('L1|sst@0.0:sst:○:true')
  &&out.z8===5&&out.z2===0&&out.z20.n>=1&&out.z20.inNet===0&&out.disp.cb&&out.disp.off===0&&out.disp.on>=1&&/Points de contrôle/.test(out.disp.label)
  &&out.fiche.sel==='pt:'+VK&&out.fiche.show&&/Vanne DN100/.test(out.fiche.txt)&&/Rue Fictive/.test(out.fiche.txt)&&/PK 20 m/.test(out.fiche.txt)&&out.fiche.btn.length===2&&out.fiche.btn.every(b=>b.h>=48)&&/état non renseigné/.test(out.fiche.txt)&&out.fiche.piece
  &&out.piece.sel==='el'&&out.piece.fils&&out.piece.bloc&&out.back==='pt:'+VK&&out.btn&&out.btn.tab==='points'&&/Points de contrôle/.test(out.btn.h2)&&out.btn.tabBtn&&out.btn.rows===5;
await ctx.close();
// ══ c2 · soudeur (téléphone 390) : tap → fiche → Fermée + photo → pastille 🔒 ; 2e constat « épreuve » avec 2 photos
({ctx,page}=await mkCtx(SOUD,{width:390,height:844},true));
await openSite(page,CID);await page.evaluate(()=>{window.TRACE.centerOn(22,0,12);});await page.waitForTimeout(300);
out={tap:await tapPt(page,VK)};await page.waitForTimeout(500);
out.open=await page.evaluate(k=>{const s=window.TRACE.state.sel;return {sel:s&&s.kind+':'+s.pt,show:document.getElementById('sheet').classList.contains('show')};},VK);
await ov(page,'tel · fiche vide');await shot(page,'tel_1_fiche_vanne');
await page.evaluate(()=>document.querySelector('#sheet [data-pact=etat][data-v=fermee]').click());await page.waitForTimeout(400);await flushed(page);
const rF=pteq().find(r=>r.pt===VK&&r.ctx==='fermee');
out.fermee={txt:await sheetTxt(page),glyph:(await glyphs(page))[VK],srv:rF&&{etat:rF.etat,byKey:rF.byKey,byName:rF.byName,site:rF.site,nature:rF.nature,ligne:rF.ligne,pk:rF.pk,photos:rF.photos.length,id:rF.id},ask:!!(await page.$('#sheet .warnbox input[data-ptph]'))};
await shot(page,'tel_2_fermee_prends_photo');
/* photo proposée (« prends la vanne en photo ») → jointe au constat « fermée », envoyée au stockage */
await page.setInputFiles('#sheet .warnbox input[data-ptph]',{name:'vanne_fermee.png',mimeType:'image/png',buffer:PNG});await page.waitForTimeout(1500);await flushed(page);
const rF2=pteq().find(r=>r.id===rF.id);out.photo={n:rF2&&rF2.photos.length,https:rF2&&/^https:\/\/.*\/storage\/v1\/object\/sign\/photos\//.test(rF2.photos[0]&&rF2.photos[0].u),wh:rF2&&rF2.photos[0]&&rF2.photos[0].w+'x'+rF2.photos[0].h,store:Object.keys(STORE).length,thumb:await page.evaluate(()=>document.querySelectorAll('#sheet .pt-con .thumb img').length),askGone:!(await page.$('#sheet .warnbox input[data-ptph]')),pending:await page.evaluate(()=>window.TRACE.ptseq.pending().length)};
await shot(page,'tel_3_fermee_photo');
/* 2e constat : « Ajouter des photos » (2) → formulaire → contexte Épreuve → note → Enregistrer */
await page.setInputFiles('#sheet input[data-ptph=new]',[{name:'epreuve_1.png',mimeType:'image/png',buffer:PNG},{name:'epreuve_2.png',mimeType:'image/png',buffer:PNG}]);await page.waitForTimeout(1500);
out.form=await page.evaluate(()=>{const sh=document.getElementById('sheet');const chips=[...sh.querySelectorAll('.pt-ctx .chip')];return {pend:sh.querySelectorAll('[data-pact=unpend]').length,chips:chips.length,chipH:chips.every(c=>c.getBoundingClientRect().height>=40),save:!!sh.querySelector('[data-pact=save]')};});
await page.evaluate(()=>document.querySelector('#sheet [data-pact=save]').click());await page.waitForTimeout(200);out.noCtx=await toast(page); /* sans contexte : refus clair */
await page.evaluate(()=>document.querySelector('#sheet [data-pact=ctx][data-v=epreuve]').click());await page.waitForTimeout(150);await page.fill('#sheet [data-ptnote]','essai fictif 6 bar');await ov(page,'tel · formulaire');await shot(page,'tel_4_nouveau_constat_epreuve');
await page.evaluate(()=>document.querySelector('#sheet [data-pact=save]').click());await page.waitForTimeout(1500);await flushed(page);
const rE=pteq().find(r=>r.pt===VK&&r.ctx==='epreuve');
out.epreuve={srv:rE&&{photos:rE.photos.length,https:rE.photos.every(p=>/^https:/.test(p.u)),note:rE.note,etat:rE.etat,byKey:rE.byKey},txt:await sheetTxt(page),glyph:(await glyphs(page))[VK],n:pteq().length,ordre:await page.evaluate(()=>[...document.querySelectorAll('#sheet .pt-con .pt-st')].map(x=>x.textContent.trim()))};
await ov(page,'tel · constats');await shot(page,'tel_5_constats');
console.log('c2) soudeur, téléphone :',JSON.stringify(out));
C.c2=out.tap&&out.open.sel==='pt:'+VK&&out.open.show&&/🔒 Fermée depuis le \d\d\/\d\d \d\d:\d\d par Dominique FICTIF/.test(out.fermee.txt)&&out.fermee.glyph==='🔒'&&out.fermee.srv&&out.fermee.srv.etat==='fermee'&&out.fermee.srv.byKey===SOUD.email&&out.fermee.srv.byName==='Dominique FICTIF'&&out.fermee.srv.site===CID&&out.fermee.srv.nature==='vanne'&&out.fermee.srv.ligne==='L1'&&out.fermee.srv.pk===20&&out.fermee.srv.photos===0&&out.fermee.ask&&/Prends la vanne en photo/.test(out.fermee.txt)
  &&out.photo.n===1&&out.photo.https&&out.photo.wh==='16x12'&&out.photo.store===1&&out.photo.thumb===1&&out.photo.askGone&&out.photo.pending===0
  &&out.form.pend===2&&out.form.chips===10&&out.form.chipH&&out.form.save&&/Choisis le contexte/.test(out.noCtx)
  &&out.epreuve.srv&&out.epreuve.srv.photos===2&&out.epreuve.srv.https&&out.epreuve.srv.note==='essai fictif 6 bar'&&out.epreuve.srv.etat==null&&out.epreuve.srv.byKey===SOUD.email&&/Constats \(2\)/.test(out.epreuve.txt)&&out.epreuve.glyph==='🔒'&&out.epreuve.n===2&&out.epreuve.ordre[0]==='🧪 Épreuve'&&out.epreuve.ordre[1]==='🔒 Fermée';
// ══ c3 · hors connexion : constat « manipulation » avec photo → gardé sur l'appareil, envoyé au retour du réseau
OFFLINE=true;await ctx.setOffline(true);await page.waitForTimeout(300);
await page.setInputFiles('#sheet input[data-ptph=new]',{name:'manip.png',mimeType:'image/png',buffer:PNG});await page.waitForTimeout(1200);
await page.evaluate(()=>document.querySelector('#sheet [data-pact=ctx][data-v=manip]').click());await page.waitForTimeout(150);await page.evaluate(()=>document.querySelector('#sheet [data-pact=save]').click());await page.waitForTimeout(1500);
out={local:await page.evaluate(()=>{const r=window.TRACE.reg.all('pteq').find(x=>x.ctx==='manip');return r&&{photos:r.photos.length,data:/^data:/.test(r.photos[0].u),pending:window.TRACE.ptseq.pending().length};}),srvN:pteq().length,txt:await sheetTxt(page),glyph:(await glyphs(page))[VK]};
await shot(page,'tel_6_hors_connexion');
OFFLINE=false;await ctx.setOffline(false);await page.evaluate(()=>window.dispatchEvent(new Event('online')));await page.waitForTimeout(2500);await flushed(page);
const rM=pteq().find(r=>r.ctx==='manip');out.apres={srvN:pteq().length,manip:rM&&{photos:rM.photos.length,https:rM.photos.every(p=>/^https:/.test(p.u)),byKey:rM.byKey,note:rM.note||''},pending:await page.evaluate(()=>window.TRACE.ptseq.pending().length),txt:await sheetTxt(page),store:Object.keys(STORE).length};
/* onglet Points au téléphone */
await page.evaluate(()=>document.querySelector('#sheet [data-pact=list]').click());await page.waitForTimeout(500);
out.liste=await page.evaluate(()=>{const el=document.getElementById('points');return {tab:window.TRACE.state.tab,txt:el.textContent.replace(/\s+/g,' ').slice(0,900),rowH:[...el.querySelectorAll('.pt-row')].every(r=>r.getBoundingClientRect().height>=48),btnH:[...el.querySelectorAll('.pt-row .btn')].every(b=>b.getBoundingClientRect().height>=38)};});
await ov(page,'tel · onglet points');await shot(page,'tel_7_onglet_points');
console.log('c3) hors connexion puis retour :',JSON.stringify(out));
C.c3=out.local&&out.local.photos===1&&out.local.data&&out.local.pending===1&&out.srvN===2&&/photos gardées sur cet appareil/.test(out.txt)&&/Constats \(3\)/.test(out.txt)&&out.glyph==='🔒'
  &&out.apres.srvN===3&&out.apres.manip&&out.apres.manip.photos===1&&out.apres.manip.https&&out.apres.manip.byKey===SOUD.email&&out.apres.manip.note===''&&out.apres.pending===0&&!/photos gardées sur cet appareil/.test(out.apres.txt)&&out.apres.store===4&&!/photos gardées sur cet appareil/.test(out.epreuveTxt||'')
  &&out.liste.tab==='points'&&/5 ?points · 4 photos/.test(out.liste.txt)&&/0 ?vanne sans état/.test(out.liste.txt)&&/4 ?points sans photo/.test(out.liste.txt)&&/Vanne DN100 · PK 20/.test(out.liste.txt)&&/🔒 Fermée depuis le \d\d\/\d\d \d\d:\d\d par Dominique FICTIF/.test(out.liste.txt)&&/4 📷 · dernier : manipulation/.test(out.liste.txt)&&out.liste.rowH&&out.liste.btnH;
await ctx.close();
// ══ c4 · 2e soudeur : lit les constats de Dominique, ne peut pas les retirer ; ajoute le sien
({ctx,page}=await mkCtx(SOUD2,{width:390,height:844},true));
await openSite(page,CID);await page.evaluate(k=>window.TRACE.ptseq.open(k),VK);await page.waitForTimeout(400);
out={txt:await sheetTxt(page),del:await page.evaluate(()=>document.querySelectorAll('#sheet [data-pact=del]').length),cons:await page.evaluate(()=>document.querySelectorAll('#sheet .pt-con').length)};
out.refus=await page.evaluate(id=>window.TRACE.ptseq.del(id),rF.id);out.toast=await toast(page);await page.waitForTimeout(300);out.srvStill=!!pteq().find(r=>r.id===rF.id);
await page.setInputFiles('#sheet input[data-ptph=new]',{name:'reception.png',mimeType:'image/png',buffer:PNG});await page.waitForTimeout(1200);
await page.evaluate(()=>document.querySelector('#sheet [data-pact=ctx][data-v=reception]').click());await page.evaluate(()=>document.querySelector('#sheet [data-pact=save]').click());await page.waitForTimeout(1500);await flushed(page);
const rR=pteq().find(r=>r.ctx==='reception');out.mien={srv:rR&&{byKey:rR.byKey,photos:rR.photos.length},del:await page.evaluate(()=>[...document.querySelectorAll('#sheet [data-pact=del]')].map(b=>b.dataset.id)),refus:REFUS.length};
await ov(page,'tel · 2e soudeur');await shot(page,'tel_8_bruno_lecture');
console.log('c4) 2e soudeur :',JSON.stringify(out));
C.c4=/Dominique FICTIF/.test(out.txt)&&out.del===0&&out.cons===3&&out.refus===false&&/seul son auteur ou l'encadrement/.test(out.toast)&&out.srvStill&&out.mien.srv&&out.mien.srv.byKey===SOUD2.email&&out.mien.srv.photos===1&&out.mien.del.length===1&&out.mien.del[0]===rR.id&&out.mien.refus===0;
await ctx.close();
// ══ c5 · chef (PC) : liste, filtres, compteurs, « Voir sur le plan », retrait, Bureau, « Suivre ce point », orphelin, DOE
regPut('pteq',CID+'|L1|vanne@99.0|orph1',{site:CID,pt:'L1|vanne@99.0',nature:'vanne',ligne:'L1',ligneNom:'Rue Fictive',pk:99,dn:100,label:'Vanne DN100 · PK 99 · Rue Fictive',ctx:'pose',etat:null,photos:[],note:'constat fictif d\'une vanne retirée du tracé',by:SOUD.email,byKey:SOUD.email,byName:'Dominique FICTIF',at:'2026-10-19T09:00:00Z'});
({ctx,page}=await mkCtx(CHEF,{width:1366,height:900}));
await openSite(page,CID);await page.evaluate(()=>{window.TRACE.state.tab='points';window.TRACE.renderAll();});await page.waitForTimeout(500);
const chips=()=>page.evaluate(()=>[...document.querySelectorAll('#points .pt-filters .chip')].map(c=>c.textContent.trim()));
out={txt:await page.evaluate(()=>document.getElementById('points').textContent.replace(/\s+/g,' ')),chips:await chips(),rows:await page.evaluate(()=>[...document.querySelectorAll('#points .pt-row')].map(r=>r.dataset.pt))};
await shot(page,'pc_4_onglet_points');
const filt=async v=>{await page.evaluate(v=>document.querySelector(`#points [data-pact=filter][data-v="${v}"]`).click(),v);await page.waitForTimeout(200);return page.evaluate(()=>[...document.querySelectorAll('#points .pt-row')].map(r=>r.dataset.pt));};
out.f={nophoto:await filt('nophoto'),vanne:await filt('vanne'),pv:await filt('pv'),sst:await filt('sst'),all:await filt('all')};
/* « Voir sur le plan » : onglet plan, zoom ≥ 14 px/m, fiche ouverte, pastille sélectionnée au centre de la zone visible */
await page.evaluate(k=>document.querySelector(`#points [data-pact=goto][data-pt="${k}"]`).click(),VK);await page.waitForTimeout(700);
out.goto=await page.evaluate(k=>{const T=window.TRACE;const s=T.state.sel;const g=document.querySelector(`#ptG [data-pt="${k}"]`);const r=g&&g.querySelector('circle[r="12"]').getBoundingClientRect();const cv=document.getElementById('canvas').getBoundingClientRect();return {tab:T.state.tab,sel:s&&s.pt,kpm:Math.round(T.state.view.k*(T.sheet?T.sheet().ppm:1)),ring:!!(g&&g.querySelector('circle[stroke-dasharray]')),dx:r?Math.round(r.left+r.width/2-(cv.left+cv.width/2)):null,dy:r?Math.round(r.top+r.height/2-(cv.top+cv.height/2)):null,show:document.getElementById('sheet').classList.contains('show')};},VK);
await shot(page,'pc_5_voir_sur_le_plan');
/* le chef retire le constat de Bruno (🗑 présent sur tous), confirmation acceptée */
out.del=await page.evaluate(id=>{const b=document.querySelector(`#sheet [data-pact=del][data-id="${id}"]`);if(!b)return {btn:false};const all=document.querySelectorAll('#sheet [data-pact=del]').length;b.click();return {btn:true,all};},rR.id);await page.waitForTimeout(600);await flushed(page);
const rRd=REG['pteq|'+rR.id];out.delSrv={deleted:rRd&&rRd.data.deleted,by:rRd&&rRd.data.deletedBy,n:pteq().length,cons:await page.evaluate(()=>document.querySelectorAll('#sheet .pt-con').length)};
await page.evaluate(()=>window.TRACE.closeSheet());
/* Bureau du chantier : la checklist a une ligne « Points de contrôle » (encadrement) */
await page.evaluate(()=>{window.TRACE.state.tab='bureau';window.TRACE.renderAll();});await page.waitForTimeout(600);
out.bureau=await page.evaluate(()=>{const el=document.getElementById('bureau');const t=el.textContent.replace(/\s+/g,' ');const i=t.indexOf('Points de contrôle');return {has:i>=0,around:t.slice(Math.max(0,i-10),i+160),dash:window.TRACE.espace.dash?true:false};});
out.dashOf=await page.evaluate(()=>{const T=window.TRACE;const n=Object.assign({},T.net,{_lines:T.lines});return T.ptseq.dash(n);});
/* « Suivre ce point » sur une barre (fiche pièce) → point suivi ○ avec repère, filtre « Autres suivis » */
await page.evaluate(()=>{window.TRACE.state.tab='plan';window.TRACE.renderAll();});await page.waitForTimeout(300);
out.suivi=await page.evaluate(()=>{const T=window.TRACE;const L=T.state.lines.L1;const i=L.cond.A.els.findIndex(e=>e.kind==='pipe'&&e.m0>60);T.openEl('L1','A',i);const b=document.querySelector('#sheet [data-pact=follow]');if(!b)return {btn:false};b.click();const s=T.state.sel;const P=T.ptseq.points().find(p=>p.i===i&&p.line==='L1');return {btn:true,sel:s&&s.kind+':'+s.pt,p:P&&{auto:P.auto,glyph:P.glyph,ctx:P.recs[0]&&P.recs[0].ctx,key:P.key},dot:!!document.querySelector(`#ptG [data-pt="${P&&P.key}"] circle[r="4"]`)};});
await page.waitForTimeout(400);await flushed(page);const rS=pteq().find(r=>r.ctx==='suivi');out.suivi.srv=rS&&{byKey:rS.byKey,nature:rS.nature};
await shot(page,'pc_6_point_suivi');
await page.evaluate(()=>window.TRACE.closeSheet());await page.evaluate(()=>{window.TRACE.state.tab='points';window.TRACE.renderAll();});await page.waitForTimeout(300);
out.suivi.chips=await chips();out.suivi.rows=await filt('suivi');await filt('all');
/* constat orphelin (vanne au PK 99 absente du tracé) : listé à part, fiche lisible, pas de nouveau constat */
out.orph=await page.evaluate(()=>{const el=document.getElementById('points');const t=el.textContent.replace(/\s+/g,' ');const r=el.querySelector('.pt-row[data-pt="L1|vanne@99.0"]');if(!r)return {row:false};r.click();const sh=document.getElementById('sheet');return {row:true,absent:/pièce absente du tracé actuel/.test(t),goto:!!r.querySelector('[data-pact=goto]'),sheet:sh.textContent.replace(/\s+/g,' ').slice(0,200),add:!!sh.querySelector('input[data-ptph=new]'),cons:sh.querySelectorAll('.pt-con').length,sel:window.TRACE.state.sel&&window.TRACE.state.sel.pt};});
await shot(page,'pc_7_orphelin');await page.evaluate(()=>window.TRACE.closeSheet());
/* DOE : données, carnet (section + photos), galerie, zip */
out.doe=await page.evaluate(()=>{const T=window.TRACE;const D=T.doe.data();const v=D.points.find(p=>p.key==='L1|vanne@20.0');const h=T.doe.carnet(D,{all:true});const g=T.doe.gallery(D,{rel:(p,w)=>'X/'+p.file,ptRel:(p,pt)=>'P/'+p.file});
    return {n:D.points.length,keys:D.points.map(p=>p.key),nPt:D.nPtPhotos,v:v&&{etat:v.etat,etatBy:v.etatBy,cons:v.constats.map(c=>c.ctx+':'+c.photos.length),files:v.constats.flatMap(c=>c.photos.map(p=>p.file)),nPhotos:v.nPhotos},orph:D.points.some(p=>p.absent),
      sec:/Équipements et points de contrôle/.test(h),secCount:/2 points documentés · 4 photos/.test(h),imgs:(h.match(/<img (?!class="logo")/g)||[]).length,etat:/<b>Fermée<\/b>/.test(h)&&/Dominique FICTIF/.test(h),absent:/pièce absente du tracé actuel/.test(h),cap:/Épreuve · \d\d\/\d\d\/\d{4} · Dominique FICTIF — essai fictif 6 bar/.test(h),
      gal:/📍 Vanne DN100 · PK 20/.test(g)&&(g.match(/src="P\//g)||[]).length===4,exp:(()=>{T.state.tab='export';T.renderAll();return document.getElementById('exportview').textContent.replace(/\s+/g,' ');})()};});
await shot(page,'pc_8_export');
/* capture du carnet DOE (section « Équipements et points de contrôle ») : fichier autonome servi par interception */
if(SHOTS){const carnetHtml=await page.evaluate(()=>{const T=window.TRACE;const D=T.doe.data();return T.doe.carnet(D,{all:true});});await ctx.route(u=>u.href===BASE+'/_carnet_pa.html',r=>r.fulfill({status:200,contentType:'text/html; charset=utf-8',body:carnetHtml}));
  const cp=await ctx.newPage();await cp.setViewportSize({width:1366,height:900});await cp.goto(BASE+'/_carnet_pa.html');await cp.waitForTimeout(600);await cp.evaluate(()=>{const h=[...document.querySelectorAll('h2')].find(x=>/Équipements et points/.test(x.textContent));if(h)h.scrollIntoView();});await cp.waitForTimeout(300);await shot(cp,'pc_9_doe_carnet_points');await cp.close();}
const b64=await page.evaluate(async()=>{const T=window.TRACE;const D=T.doe.data();const r=await T.doe.zip(D,{format:'A3',scale:200,photos:'all'});const buf=new Uint8Array(await r.blob.arrayBuffer());let s='';for(let i=0;i<buf.length;i+=0x8000)s+=String.fromCharCode.apply(null,buf.subarray(i,i+0x8000));return {b64:btoa(s),name:r.name,report:r.report};});
{const files=unzipSync(new Uint8Array(Buffer.from(b64.b64,'base64')));const names=Object.keys(files);const root=names[0].split('/')[0]+'/';const rel=names.map(n=>n.slice(root.length));
  const carnet=strFromU8(files[root+'01_Carnet/Carnet_soudage_manchonnage.html']||new Uint8Array());const lisez=strFromU8(files[root+'Lisez-moi.html']||new Uint8Array());const gal=strFromU8(files[root+'02_Photos/index.html']||new Uint8Array());const js=JSON.parse(strFromU8(files[root+'donnees/doe.json']));
  const ptFiles=rel.filter(n=>/^02_Photos\/Rue_Fictive\/Points\/Vanne_DN100_PK_20\/.*\.jpg$/.test(n));const refs=[...carnet.matchAll(/<img src="\.\.\/(02_Photos\/[^"]+)"/g)].map(m=>m[1]);const galRefs=[...gal.matchAll(/<img src="(Rue_Fictive\/Points\/[^"]+)"/g)].map(m=>'02_Photos/'+m[1]);
  out.zip={ptFiles:ptFiles.length,bytes:ptFiles.every(n=>files[root+n].length>0),refs:refs.length,refsOk:refs.length>0&&refs.every(r=>rel.includes(r)),galRefs:galRefs.length,galOk:galRefs.every(r=>rel.includes(r)),lisez:/points? de contrôle/.test(lisez),json:js.points&&js.points.length===2&&js.points[0].constats[0].photos[0]&&!js.points[0].constats[0].photos[0].src&&/^02_Photos\//.test(js.points[0].constats[0].photos[0].path||''),ok:b64.report.photosOk,ko:b64.report.photosKo};}
console.log('c5) chef : liste, plan, retrait, bureau, suivi, orphelin, DOE :',JSON.stringify(out));
C.c5=/5 ?points · 5 photos/.test(out.txt)&&/0 ?vanne sans état/.test(out.txt)&&/4 ?points sans photo/.test(out.txt)&&out.chips.join('|')==='Tous (6)|Sans photo (5)|Vannes (2)|Purges / vidanges (2)|SST / raccordements (2)'&&out.rows.length===6&&out.rows[0]==='L1|sst@0.0'&&out.rows[5]==='L1|vanne@99.0'&&/Pièces absentes du tracé actuel/.test(out.txt)
  &&out.f.nophoto.length===5&&out.f.vanne.join('|')==='L1|vanne@20.0|L1|vanne@99.0'&&out.f.pv.join('|')==='L1|purge@35.0|L1|vidange@50.0'&&out.f.sst.join('|')==='L1|sst@0.0|L1|sst@120.0'&&out.f.all.length===6
  &&out.goto.tab==='plan'&&out.goto.sel===VK&&out.goto.kpm>=14&&out.goto.ring&&out.goto.show&&Math.abs(out.goto.dx)<80&&Math.abs(out.goto.dy)<120
  &&out.del.btn&&out.del.all===4&&out.delSrv.deleted===true&&out.delSrv.by==='Claude FICTIF'&&out.delSrv.n===4&&out.delSrv.cons===3
  &&out.bureau.has&&/Points de contrôle/.test(out.bureau.around)&&out.dashOf.k==='warn'&&/5 points · 4 photos/.test(out.dashOf.v)&&/4 points sans photo/.test(out.dashOf.s)
  &&out.suivi.btn&&/^pt:L1\|pipe@/.test(out.suivi.sel)&&out.suivi.p&&out.suivi.p.auto===false&&out.suivi.p.glyph==='○'&&out.suivi.p.ctx==='suivi'&&out.suivi.dot&&out.suivi.srv&&out.suivi.srv.byKey===CHEF.email&&out.suivi.srv.nature==='pipe'&&out.suivi.chips.some(c=>/Autres suivis \(1\)/.test(c))&&out.suivi.rows.length===1
  &&out.orph.row&&out.orph.absent&&!out.orph.goto&&/Pièce absente du tracé actuel/.test(out.orph.sheet)&&!out.orph.add&&out.orph.cons===1&&out.orph.sel==='L1|vanne@99.0'
  &&out.doe.n===2&&out.doe.keys.includes(VK)&&out.doe.nPt===4&&out.doe.v&&out.doe.v.etat==='fermee'&&out.doe.v.etatBy==='Dominique FICTIF'&&out.doe.v.cons.join('|')==='fermee:1|epreuve:2|manip:1'&&out.doe.v.nPhotos===4&&out.doe.v.files.every(f=>/^Vanne_DN100_PK_20_(fermee|epreuve|manip)_\d{4}-\d{2}-\d{2}_\d\.jpg$/.test(f))&&out.doe.orph
  &&out.doe.sec&&out.doe.secCount&&out.doe.imgs===4&&out.doe.etat&&out.doe.absent&&out.doe.cap&&out.doe.gal&&/2 points de contrôle documentés · 4 photos/.test(out.doe.exp)
  &&out.zip.ptFiles===4&&out.zip.bytes&&out.zip.refs===4&&out.zip.refsOk&&out.zip.galRefs===4&&out.zip.galOk&&out.zip.lisez&&out.zip.json&&out.zip.ok===4&&out.zip.ko===0;
await ctx.close();
// ══ c6 · 390 px : pas de débordement ; c7 · console
C.c6=OV.length>=5&&OV.every(Boolean);
console.log('erreurs console :',JSON.stringify(logs));C.c7=logs.length===0;
const bad=Object.entries(C).filter(([k,v])=>!v).map(([k])=>k);console.log(bad.length?'RESULTAT: ECHEC '+bad.join(','):'RESULTAT: TOUT VERT');
await browser.close();
