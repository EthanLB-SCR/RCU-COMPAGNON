// e2e_ptsuit_1911.mjs — 19/11/2026 (Nantes, Ethan : « des photos avaient été mises pour les points SST de la sous-station DN100 X1, j'ai fait une modif qui les a supprimées » ;
//  « les bouts de lignes s'affichent toujours orange d'ailleurs »). Rien n'était supprimé : la sous-station avait bougé dans le tracé, sa clé de point avait changé et ses
//  constats étaient passés en « pièce absente du tracé » (sa fiche affichait « Constats (0) »).
//  Données 100 % FICTIVES (comptes « exemple.fr », « Villefictive »), serveur SIMULÉ (registre avec la règle pteq, chantiers, soudures, stockage), tracé fait et MODIFIÉ par le
//  VRAI traceur : L1 (DN 150, fin de ligne), antenne L2 (DN 100, une vanne, sous-station au bout), antenne L3 (DN 100, « attente » au bout).
//  s1  chef : les deux points de bout de ligne de L2 pris (photo) ; constats photo sur la sous-station de L2 (2), sur le raccordement de L3 (1), « fermée » + photo sur la vanne
//  s2  modification dans le traceur : L2 allongée de 3 m, sa vanne déplacée de 6 m, le bout de L3 devient une sous-station ; ré-enregistrement
//  c1  les points de bout de ligne gardent numéro, état et photo (non-régression)
//  c2  la sous-station de L2 a bougé de 3 m : ses 2 constats et 3 photos la suivent (fiche « Constats (2) », mention « quand la pièce était au PK 45 »), plus rien d'absent
//      pour elle ; l'ancienne clé ouvre la fiche de la pièce actuelle ; rien n'a été écrit au serveur
//  c3  le bout de L3 a changé de type (raccordement → sous-station) : son constat le suit, la fiche dit « raccordement à l'époque »
//  c4  la vanne déplacée de 6 m n'est PAS rattachée d'office (ce n'est pas un bout de ligne) : bandeau en tête de la liste, section « Pièces absentes », bouton « 📎 Rattacher »,
//      et dans la fiche de la vanne du tracé : « 📎 Sur cette ligne, 1 constat … » avec « Voir » et « 📎 Rattacher ici » ; le tableau de bord du chantier le signale
//  c5  soudeur (téléphone) : il voit les constats suivis et l'avertissement, pas les boutons 📎 ; un rattachement de sa part est refusé ; rien ne déborde
//  c6  chef : « 📎 Rattacher ici » → le constat passe sur la vanne du tracé (serveur : pt, ligne, PK neufs ; ptAvant, ratt = qui / quand ; photos intactes ; rien de retiré),
//      état « fermée » et photo sur la vanne, plus d'avertissement
//  c7  un constat resté sur une pièce absente d'une autre ligne → fiche « 📎 Rattacher ces constats à une pièce du tracé » → liste des pièces → rattaché
//  c8  DOE : la sous-station de L2 documentée avec ses 3 photos, pas « absente »
//  c9  bouts de ligne « toujours orange » : point pris + soudures d'avant manchonnées → barre du bout verte (plus orange) ; soudure d'avant seulement soudée → orange ;
//      point pas pris → inchangé ; pastille de la fiche et de la liste « ◆ Pris ✓ » (bleu nuit), plus « Soudée »
//  c10 console propre, aucun refus serveur inattendu
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
const tapPt=async(page,key)=>{const ok=await page.evaluate(key=>{const g=document.querySelector(`#ptG [data-pt="${key}"] circle`);if(!g)return false;const r=g.getBoundingClientRect();const x=r.left+r.width/2,y=r.top+r.height/2;const o={bubbles:true,cancelable:true,clientX:x,clientY:y,pointerId:7,pointerType:'touch',isPrimary:true};g.dispatchEvent(new PointerEvent('pointerdown',o));document.getElementById('canvas').dispatchEvent(new PointerEvent('pointerup',o));return true;},key);
  await page.waitForTimeout(350);await page.evaluate(()=>{const b=document.querySelector('#modal.show [data-pickel]');if(b)b.click();}); /* 19/11 : depuis le 04/11, un toucher qui tombe aussi sur des soudures ouvre « Quelle soudure ? » → on y choisit « le repère » (ce test n'avait pas suivi) */return ok;};

const J=x=>JSON.stringify(x);const DATA='data:image/png;base64,'+PNG.toString('base64');
const srv=()=>Object.values(REG).filter(r=>r.kind==='pteq').map(r=>Object.assign({id:r.id},r.data));
const KS0='L2|sst@45.0',KS1='L2|sst@48.0',KR0='L3|racc@30.0',KR1='L3|sst@30.0',KV0='L2|vanne@20.0',KV1='L2|vanne@26.0';
const pts=pg=>pg.evaluate(()=>window.TRACE.ptseq.points().map(p=>({key:p.key,nat:p.nature,abs:!!p.absent,recs:p.recs.length,ph:p.nPhotos,glyph:p.glyph,alias:p.alias||[],suivis:(p.suivis||[]).map(x=>x.key+'×'+x.n)})));
const bouts=pg=>pg.evaluate(()=>{const T=window.TRACE;const o={};['A','R'].forEach(c=>{const cd=T.lines.L2.cond[c];const j=cd.joints.filter(j=>j.sst).pop();o[c]={id:j.weldId,st:j.status,ph:(((j.steps||{})[1]||{}).photos||[]).length,m:+(+j.m||0).toFixed(1)};});return o;});
const fiche=async(pg,key)=>{await pg.evaluate(k=>window.TRACE.ptseq.open(k),key);await pg.waitForTimeout(450);return pg.evaluate(()=>{const sh=document.getElementById('sheet');const s=window.TRACE.state.sel;return {sel:s&&s.pt,txt:sh.textContent.replace(/\s+/g,' ').trim(),cons:sh.querySelectorAll('.pt-con').length,imgs:sh.querySelectorAll('.pt-con .thumb img').length,suivi:[...sh.querySelectorAll('[data-ptsuivi]')].map(x=>x.textContent.replace(/\s+/g,' ').trim()),orph:(sh.querySelector('.pt-orph')||{}).textContent||'',here:sh.querySelectorAll('[data-pact="ratthere"]').length,ratt:sh.querySelectorAll('[data-pact="ratt"]').length,add:!!sh.querySelector('input[data-ptph=new]')};});};
const liste=async pg=>{await pg.evaluate(()=>{const T=window.TRACE;T.closeSheet();T.state.tab='points';T.state.ptFilter='all';T.renderAll();});await pg.waitForTimeout(450);return pg.evaluate(()=>{const el=document.getElementById('points');return {abs:(el.querySelector('[data-ptabs]')||{}).textContent||'',sec:/Pièces absentes du tracé actuel/.test(el.textContent),rows:[...el.querySelectorAll('.pt-row[data-pt]')].map(r=>r.dataset.pt),ratt:[...el.querySelectorAll('[data-pact="ratt"]')].map(b=>b.dataset.pt),kpi:(el.querySelector('.pt-kpi')||{}).textContent.replace(/\s+/g,' ')};});};
// ══ s0 · chef (PC) : tracé fictif dans le vrai traceur → chantier sur le serveur
let {ctx,page}=await mkCtx(CHEF,{width:1366,height:900});
await page.goto(BASE+'/traceur.html?site=new');await page.waitForTimeout(1300);
await page.evaluate(()=>{const M=window.MAQ;M.state.supplier='AXIOM';M.state.serie=1;M.state.lines=[{id:'L1',name:'Rue Fictive',dn:150,bar:12,pts:[[0,0],[120,0]],specials:[],parent:null,endType:'kit'},
  {id:'L2',name:'Antenne école fictive',dn:100,bar:12,pts:[[60,0],[60,45]],specials:[{id:'v1',type:'valve',m:20}],parent:'L1',endType:'sousstation'},
  {id:'L3',name:'Antenne gymnase fictif',dn:100,bar:12,pts:[[90,0],[90,30]],specials:[],parent:'L1',endType:'attente'}];M.state.seq=4;M.setMode('select');M.rebuild();M.save();});await page.waitForTimeout(300);
await page.click('#bSave');await page.waitForTimeout(250);await page.fill('#svName','Villefictive antennes');await page.click('#svOk');await page.waitForTimeout(1500);
const CID=await page.evaluate(()=>window.MAQ.state.siteRef&&window.MAQ.state.siteRef.id);
await page.goto(BASE+'/index.html');await page.waitForTimeout(1500);await openSite(page,CID);
let out={cid:!!CID,srv:!!SITES[CID],keys:(await pts(page)).map(p=>p.key)};
// ══ s1 · les deux points de bout de ligne de L2 pris (photo) ; constats
for(const c of ['A','R']){await page.evaluate(([c,DATA])=>{const T=window.TRACE;const cd=T.lines.L2.cond[c];const i=cd.joints.map((j,i)=>({j,i})).filter(x=>x.j.sst).pop().i;T.openJoint('L2',c,i);const j=cd.joints[i];j.steps={1:{photos:[DATA]}};T.renderAll();const ok=document.getElementById('sheet').querySelector('[data-stepok="1"]');if(ok)ok.click();},[c,DATA]);await page.waitForTimeout(1500);}
await page.evaluate(()=>window.TRACE.closeSheet());await page.waitForTimeout(300);
await page.evaluate(([KS0,KR0,KV0,DATA])=>{const P=window.TRACE.ptseq;const ph=()=>({u:DATA,w:16,h:12});P.add(KS0,{ctx:'pose',photos:[ph(),ph()],note:'pièce posée (fictif)'});P.add(KS0,{ctx:'penetration',photos:[ph()],note:'pénétration (fictif)'});P.add(KR0,{ctx:'pose',photos:[ph()],note:'attente posée (fictif)'});P.add(KV0,{ctx:'fermee',etat:'fermee',photos:[ph()]});},[KS0,KR0,KV0,DATA]);
await flushed(page);await page.waitForTimeout(1200);
out.b0=await bouts(page);out.p0=await pts(page);out.srv0=srv().map(r=>r.pt+':'+(r.photos||[]).length+':'+(r.photos||[]).every(p=>/^https?:|^\//.test(p.u))).sort();
console.log('s1) départ :',J(out));
const s1=out.cid&&out.srv&&[KS0,KR0,KV0].every(k=>out.keys.includes(k))&&out.b0.A.st==='soudee'&&out.b0.A.ph===1&&out.b0.R.st==='soudee'&&out.b0.R.ph===1&&J(out.srv0)===J([KS0+':1:true',KS0+':2:true',KV0+':1:true',KR0+':1:true'].sort());
const before={bouts:out.b0,nSrv:srv().length};
// ══ s2 · la modification dans le traceur : L2 allongée de 3 m, vanne déplacée de 6 m, bout de L3 → sous-station
await page.goto(BASE+'/traceur.html?site='+encodeURIComponent(CID));await page.waitForTimeout(2000);
await page.evaluate(()=>{const M=window.MAQ;const S=M.state;const l2=S.lines.find(x=>x.id==='L2'),l3=S.lines.find(x=>x.id==='L3');l2.pts=[[60,0],[60,48]];l2.specials=[{id:'v1',type:'valve',m:26}];l3.endType='sousstation';M.rebuild();M.save();});await page.waitForTimeout(300);
await page.click('#bSave');await page.waitForTimeout(300);await page.selectOption('#svMode','update');await page.click('#svOk');await page.waitForTimeout(1500);
{const go=await page.$('#svGo');if(go){await go.click();await page.waitForTimeout(2500);}}
if(await page.evaluate(()=>!(window.TRACE&&window.TRACE.state&&window.TRACE.state.screen==='site'))){await page.goto(BASE+'/index.html');await page.waitForTimeout(1500);await openSite(page,CID);}
await page.waitForTimeout(2500);
// ══ c1 · points de bout de ligne
out={b1:await bouts(page),p1:await pts(page)};console.log('c1) bouts de ligne après la modification :',J({avant:before.bouts,apres:out.b1}));
C.c1=s1&&out.b1.A.id===before.bouts.A.id&&out.b1.R.id===before.bouts.R.id&&out.b1.A.st==='soudee'&&out.b1.R.st==='soudee'&&out.b1.A.ph===1&&out.b1.R.ph===1&&out.b1.A.m===48;
// ══ c2 · la sous-station de L2 : ses constats la suivent
const P=k=>out.p1.find(p=>p.key===k);
out.f=await fiche(page,KS1);out.old=await fiche(page,KS0);out.by=await page.evaluate(k=>{const p=window.TRACE.ptseq.byKey(k);return p&&p.key;},KS0);out.srv1=srv().map(r=>r.pt).sort();
console.log('c2) sous-station de L2 :',J({live:P(KS1),ancien:P(KS0)||null,fiche:{sel:out.f.sel,cons:out.f.cons,imgs:out.f.imgs,suivi:out.f.suivi,titre:out.f.txt.slice(0,60)},parAncienneCle:out.old.sel,byKey:out.by,srv:out.srv1}));
C.c2=!!P(KS1)&&!P(KS1).abs&&P(KS1).recs===2&&P(KS1).ph===3&&P(KS1).glyph==='📷'&&J(P(KS1).alias)===J([KS0])&&J(P(KS1).suivis)===J([KS0+'×2'])&&!P(KS0)
  &&out.f.sel===KS1&&out.f.cons===2&&out.f.imgs===3&&/Constats \(2\)/.test(out.f.txt)&&out.f.suivi.length===1&&/📎 2 constats faits quand la pièce était au PK 45 : le tracé a été modifié depuis, ils la suivent\./.test(out.f.suivi[0])&&out.f.add
  &&out.old.sel===KS1&&out.by===KS1&&J(out.srv1)===J([KS0,KS0,KV0,KR0].sort())&&srv().length===before.nSrv;
// ══ c3 · le bout de L3 : raccordement → sous-station
out.f3=await fiche(page,KR1);console.log('c3) bout de L3 :',J({live:P(KR1),ancien:P(KR0)||null,suivi:out.f3.suivi,cons:out.f3.cons}));
C.c3=!!P(KR1)&&P(KR1).nat==='sst'&&P(KR1).recs===1&&P(KR1).ph===1&&!P(KR0)&&out.f3.cons===1&&out.f3.suivi.length===1&&/📎 1 constat fait quand la pièce était au PK 30 \(« raccordement » à l'époque\) : le tracé a été modifié depuis, il la suit\./.test(out.f3.suivi[0]);
// ══ c4 · la vanne déplacée de 6 m : pas rattachée d'office, mais jamais invisible
out.fv=await fiche(page,KV1);out.fa=await fiche(page,KV0);out.l=await liste(page);out.dash=await page.evaluate(()=>{const T=window.TRACE;return T.ptseq.dash(Object.assign({},T.net,{_lines:T.lines}));});
console.log('c4) vanne déplacée :',J({live:P(KV1),absent:P(KV0),ficheVanne:{cons:out.fv.cons,orph:out.fv.orph.replace(/\s+/g,' ').slice(0,260),here:out.fv.here},ficheAbsente:{txt:out.fa.txt.slice(0,330),ratt:out.fa.ratt,add:out.fa.add,cons:out.fa.cons},liste:out.l,dash:out.dash}));
C.c4=!!P(KV1)&&P(KV1).recs===0&&!!P(KV0)&&P(KV0).abs&&P(KV0).recs===1&&P(KV0).ph===1
  &&out.fv.cons===0&&/📎 Sur cette ligne, 1 constat \(1 photo\) est resté sur une pièce absente du tracé actuel — rien n'est effacé\./.test(out.fv.orph)&&/Vanne DN100 · PK 20 · 1 constat · 1 📷/.test(out.fv.orph)&&/Voir/.test(out.fv.orph)&&out.fv.here===1
  &&/Pièce absente du tracé actuel/.test(out.fa.txt)&&/rattache-les à la bonne pièce/.test(out.fa.txt)&&out.fa.ratt===1&&!out.fa.add&&out.fa.cons===1
  &&/📎 1 constat \(1 photo\) sur 1 pièce absente du tracé actuel \(tracé modifié\) : rien n'est effacé, il est en bas de cette liste — « 📎 Rattacher » le remet sur la bonne pièce\./.test(out.l.abs)&&out.l.sec&&out.l.rows[out.l.rows.length-1]===KV0&&J(out.l.ratt)===J([KV0])
  &&out.dash.k==='warn'&&/1 constat à rattacher \(pièce absente du tracé\)/.test(out.dash.s);
await shot(page,'pc_liste_absente');
await ctx.close();
// ══ c5 · soudeur (téléphone 390) : il voit, il ne rattache pas
({ctx,page}=await mkCtx(SOUD,{width:390,height:844},true));await openSite(page,CID);
out={p:await pts(page)};out.f=await fiche(page,KS1);await ov(page,'tel · sous-station');out.fv=await fiche(page,KV1);await ov(page,'tel · vanne');await shot(page,'tel_vanne_orpheline');out.fa=await fiche(page,KV0);await ov(page,'tel · absente');out.l=await liste(page);await ov(page,'tel · liste');
const refus0=REFUS.length;out.ret=await page.evaluate(([a,b])=>window.TRACE.ptseq.rattacher(a,b),[KV0,KV1]);await page.waitForTimeout(700);out.srvV=srv().find(r=>r.ctx==='fermee').pt;
console.log('c5) soudeur :',J({sst:{cons:out.f.cons,imgs:out.f.imgs,suivi:out.f.suivi.length},vanne:{orph:out.fv.orph.replace(/\s+/g,' ').slice(0,220),here:out.fv.here},absente:{ratt:out.fa.ratt,txt:(out.fa.txt.match(/Pièce absente[^.]*\.[^.]*\./)||[''])[0]},liste:{abs:out.l.abs,ratt:out.l.ratt},retour:out.ret,srv:out.srvV,deb:OV}));
C.c5=out.f.cons===2&&out.f.imgs===3&&out.f.suivi.length===1&&out.fv.here===0&&/Ton chef peut les rattacher à la bonne pièce\./.test(out.fv.orph)&&out.fa.ratt===0&&/Ton chef peut les rattacher à la bonne pièce du tracé\./.test(out.fa.txt)
  &&/ton chef peut le rattacher à la bonne pièce\./.test(out.l.abs)&&out.l.ratt.length===0&&out.ret===0&&out.srvV===KV0&&REFUS.length===refus0&&OV.every(Boolean);
await ctx.close();
// ══ c6 · chef : « 📎 Rattacher ici »
({ctx,page}=await mkCtx(CHEF,{width:1366,height:900}));await openSite(page,CID);
await fiche(page,KV1);await page.click('#sheet [data-pact="ratthere"]');await page.waitForTimeout(600);await flushed(page);await page.waitForTimeout(700);
out={p:await pts(page)};out.f=await fiche(page,KV1);out.l=await liste(page);out.row=srv().find(r=>r.ctx==='fermee');out.dash=await page.evaluate(()=>{const T=window.TRACE;return T.ptseq.dash(Object.assign({},T.net,{_lines:T.lines}));});out.toast=await toast(page);
console.log('c6) rattaché ici :',J({live:out.p.find(p=>p.key===KV1),absent:out.p.find(p=>p.key===KV0)||null,fiche:{cons:out.f.cons,imgs:out.f.imgs,orph:out.f.orph,etat:/Fermée depuis le/.test(out.f.txt)},liste:{abs:out.l.abs,sec:out.l.sec},srv:out.row&&{pt:out.row.pt,ligne:out.row.ligne,pk:out.row.pk,nature:out.row.nature,ptAvant:out.row.ptAvant,ratt:out.row.ratt&&[out.row.ratt.byName,out.row.ratt.de,!!out.row.ratt.at],photos:(out.row.photos||[]).length,deleted:!!out.row.deleted,byKey:out.row.byKey,etat:out.row.etat},n:srv().length,dash:out.dash.s}));
{const L=out.p.find(p=>p.key===KV1);C.c6=!!L&&L.recs===1&&L.ph===1&&L.glyph==='🔒'&&!out.p.find(p=>p.key===KV0)&&out.f.cons===1&&out.f.imgs===1&&!out.f.orph&&/Fermée depuis le/.test(out.f.txt)&&!out.l.abs&&!out.l.sec
  &&!!out.row&&out.row.pt===KV1&&out.row.ligne==='L2'&&out.row.pk===26&&out.row.nature==='vanne'&&out.row.ptAvant===KV0&&!!out.row.ratt&&out.row.ratt.byName===CHEF.name&&out.row.ratt.de===KV0&&!!out.row.ratt.at&&(out.row.photos||[]).length===1&&!out.row.deleted&&out.row.byKey===CHEF.email&&out.row.etat==='fermee'&&srv().length===before.nSrv&&!/à rattacher/.test(out.dash.s||'');}
// ══ c7 · constat resté sur une pièce absente d'une autre ligne → la fenêtre « 📎 Rattacher … à une pièce du tracé »
const KX='L9|vanne@12.0';regPut('pteq',CID+'|'+KX+'|orph1',{site:CID,pt:KX,nature:'vanne',ligne:'L9',ligneNom:'Ligne retirée (fictive)',pk:12,dn:100,label:'Vanne DN100 · PK 12 · Ligne retirée (fictive)',ctx:'epreuve',photos:[{u:'/object/sign/fictif/x.png?token=fictif',w:16,h:12}],note:'essai fictif',by:SOUD.email,byKey:SOUD.email,byName:SOUD.name,at:'2026-11-10T09:00:00.000Z'});
await page.goto(BASE+'/index.html');await page.waitForTimeout(1500);await openSite(page,CID); /* le registre est relu à l'ouverture du chantier */
out={fa:await fiche(page,KX)};await page.click('#sheet [data-pact="ratt"]');await page.waitForTimeout(400);
out.modal=await page.evaluate(()=>{const m=document.getElementById('modal');return {show:m.classList.contains('show'),h:(m.querySelector('h3')||{}).textContent||'',same:/Même ligne/.test(m.textContent),autres:(m.querySelector('details summary')||{}).textContent||'',open:!!(m.querySelector('details')||{}).open,rows:[...m.querySelectorAll('[data-rattto]')].map(b=>b.dataset.rattto)};});
await page.evaluate(k=>document.querySelector('#modal [data-rattto="'+k+'"]').click(),KV1);await page.waitForTimeout(600);await flushed(page);await page.waitForTimeout(600);
out.p=await pts(page);out.sel=await page.evaluate(()=>(window.TRACE.state.sel||{}).pt);out.rowX=srv().find(r=>r.id.endsWith('|orph1'));
console.log('c7) fenêtre de rattachement :',J({ficheAbsente:{ratt:out.fa.ratt,cons:out.fa.cons},modal:out.modal,vanne:out.p.find(p=>p.key===KV1),absent:out.p.find(p=>p.key===KX)||null,sel:out.sel,srv:out.rowX&&{pt:out.rowX.pt,ptAvant:out.rowX.ptAvant,byKey:out.rowX.byKey,photos:out.rowX.photos.length}}));
C.c7=out.fa.ratt===1&&out.fa.cons===1&&out.modal.show&&/📎 Rattacher 1 constat à une pièce du tracé/.test(out.modal.h)&&!out.modal.same&&/Autres lignes \(\d+\)/.test(out.modal.autres)&&out.modal.open&&out.modal.rows.includes(KV1)&&out.modal.rows.includes(KS1)&&!out.modal.rows.includes(KX)
  &&out.p.find(p=>p.key===KV1).recs===2&&!out.p.find(p=>p.key===KX)&&out.sel===KV1&&!!out.rowX&&out.rowX.pt===KV1&&out.rowX.ptAvant===KX&&out.rowX.byKey===SOUD.email&&out.rowX.photos.length===1;
// ══ c8 · DOE
out=await page.evaluate(k=>{const D=window.TRACE.ptseq.doe();const p=D.find(x=>x.key===k);return {n:D.length,p:p&&{absent:p.absent,nPhotos:p.nPhotos,cons:p.constats.length,label:p.short},abs:D.filter(x=>x.absent).length};},KS1);
console.log('c8) DOE :',J(out));C.c8=!!out.p&&out.p.absent===false&&out.p.nPhotos===3&&out.p.cons===2&&out.abs===0;
// ══ c9 · bouts de ligne « toujours orange »
out=await page.evaluate(()=>{const T=window.TRACE;const l=T.lines.L2;const cd=l.cond.A;const n=cd.els.length;const jl=cd.joints.length;const sst=cd.joints[jl-1];const real=cd.joints.filter(j=>!j.sst);const r={sst:sst.sst&&sst.status,els:n,joints:jl};
  const tints=()=>[T.tint('L2','A',n-2),T.tint('L2','A',n-1)];const stroke=()=>{T.state.tab='plan';T.state.view.k=1.2;T.centerOn(60,24);T.renderPlan();const g=document.querySelector(`#net g.el[data-line="L2"][data-cond="A"][data-el="${n-2}"]`);const ps=g?[...g.querySelectorAll('path')].map(p=>p.getAttribute('stroke')).filter(s=>s&&s!=='transparent'):[];return ps.join(',');};
  r.t0=tints();r.s0=stroke();                                   /* point pris, soudures d'avant à souder → orange (le point est pris) */
  real.forEach(j=>{j.status='soudee';});r.t1=tints();           /* soudée → orange */
  real.forEach(j=>{j.status='controlee';});r.t2=tints();        /* contrôlée → bleu */
  real.forEach(j=>{j.status='manchonnee';});r.t3=tints();r.s3=stroke(); /* manchonnée → VERT (avant : orange pour toujours) */
  const keep=sst.status;sst.status='a_souder';r.t4=tints();sst.status='a_reprendre';r.t5=tints();sst.status=keep; /* point pas pris / à reprendre : inchangé */
  real.forEach(j=>{j.status='a_souder';});
  const i=cd.joints.indexOf(sst);T.openJoint('L2','A',i);const sh=document.getElementById('sheet');const b=sh.querySelector('.badge[data-bout]');r.badge=b&&b.textContent.trim();r.badgeBg=b&&b.style.background;r.soudee=[...sh.querySelectorAll('.head .badge')].some(x=>/Soudée/.test(x.textContent));T.closeSheet();
  T.state.tab='liste';T.renderAll();const lb=[...document.querySelectorAll('#view-liste .badge[data-bout], #liste .badge[data-bout]')].map(x=>x.textContent.trim());r.liste=lb;T.state.tab='plan';T.renderAll();return r;});
console.log('c9) bouts de ligne :',J(out));
C.c9=out.sst==='soudee'&&J(out.t0)===J(['soudee','soudee'])&&J(out.t1)===J(['soudee','soudee'])&&J(out.t2)===J(['controlee','controlee'])&&J(out.t3)===J(['manchonnee','manchonnee'])&&J(out.t4)===J(['a_souder','a_souder'])&&J(out.t5)===J(['a_reprendre','a_reprendre'])
  &&/#eb6834/.test(out.s0)&&/#0ca30c/.test(out.s3)&&!/#eb6834/.test(out.s3)&&out.badge==='◆ Pris ✓'&&/28, ?61, ?107|#1c3d6b/i.test(out.badgeBg||'')&&!out.soudee&&out.liste.filter(t=>t==='◆ Pris ✓').length>=2&&out.liste.some(t=>t==='◆ À prendre');
// ══ c10
console.log('c10) console :',J(logs.slice(0,6)),'refus serveur :',J(REFUS));C.c10=logs.length===0&&REFUS.length===0;
console.log('RÉSULTATS',J(C));const KO=Object.entries(C).filter(([,v])=>!v).map(([k])=>k);console.log('RESULTAT: '+(KO.length?'ECHEC '+KO.join(','):'TOUT VERT'));await browser.close();process.exit(KO.length?1:0);
