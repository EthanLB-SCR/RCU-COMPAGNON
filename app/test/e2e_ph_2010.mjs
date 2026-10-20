// LOT PA — SUITE PH (20/10) : les vannes de sectionnement dans l'onglet Hydraulique + MODE OPÉRATOIRE (Ethan : « ce qui est vannes de sectionnement doit ressortir
// aussi sur l'onglet Hydro ; sur le mode opératoire de rinçage, dire : on ouvre celle-là, on fait cette partie, puis on ferme ici, on ouvre là-bas »).
// Données 100 % FICTIVES, serveur Supabase SIMULÉ (même simulateur que e2e_pa_2010 : profils, registre avec la règle pteq, chantiers + parties, soudures, stockage),
// tracé fait par le VRAI traceur : une ligne DN100, deux vannes (PK 20 et 70), purge, vidange, sous-station en bout ; une coupe de sectorisation posée sur la vanne 1.
//  c1  chef (PC 1366) : onglet Hydraulique → bloc « Vannes de sectionnement » (2 vannes · 2 sans état, coupe T1 | T2 sur la vanne 1, purges / vidanges repliées,
//      « Voir sur le plan ») ; compose le mode opératoire de rinçage par les fenêtres (ouvrir V1, rincer T1, fermer V1, ouvrir V2, note), ordre, étape suivante,
//      ↑ ↓ ✕, impression A4 (5 étapes, cases ☐)
//  c2  soudeur (téléphone 390) : 📍 Points → le mode opératoire ; « ✓ Fait » sur « Ouvrir V1 » → constat 🔓 au serveur (byKey = lui), fiche ouverte avec la photo
//      proposée, pastille 🔓 sur le plan, étape suivante « Rincer » ; « Fait » sur Rincer → marque sans constat ; vanne déjà ouverte signalée sur une étape « ouvrir »
//  c3  chef : Hydro → vanne 1 « 🔓 Ouverte depuis le … par Dominique FICTIF » ; opération du jour sur T1 → alerte « Vanne de coupe OUVERTE » (bloc + carte) ;
//      DOE : « Modes opératoires hydrauliques » ; ↶ sur l'étape 1 → constat retiré, vanne sans état ; « Dupliquer pour un autre tronçon »
//  c4  390 px : aucun débordement ; c5 : zéro erreur console
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

const scrollTo=async(pg,sel)=>{await pg.evaluate(sel=>{const el=document.querySelector(sel);if(el)el.scrollIntoView({block:'start'});},sel);await pg.waitForTimeout(250);}; /* captures : le bloc est sous le pli */
const tabHydro=pg=>pg.evaluate(()=>{window.TRACE.state.tab='hydro';window.TRACE.renderAll();});
const hyTxt=pg=>pg.evaluate(()=>document.getElementById('hydro').textContent.replace(/\s+/g,' '));
const VK='L1|vanne@20.0',VK2='L1|vanne@70.0';
// ══ c1 · chef (PC) : chantier, coupe sur la vanne 1, bloc Vannes, mode opératoire de rinçage composé, impression
let {ctx,page}=await mkCtx(CHEF,{width:1366,height:900});
await page.goto(BASE+'/traceur.html?site=new');await page.waitForTimeout(1300);
await page.evaluate(()=>{const M=window.MAQ;M.state.supplier='AXIOM';M.state.serie=1;M.state.lines=[{id:'L1',name:'Rue Fictive',dn:100,bar:12,pts:[[0,0],[120,0]],specials:[{id:'v1',type:'valve',m:20},{id:'v2',type:'valve',m:70},{id:'pv1',type:'tee',vert:'up',pvKind:'purge',m:35,dnb:25},{id:'pv2',type:'tee',vert:'down',pvKind:'vidange',m:50,dnb:40}],parent:null,endType:'sousstation'}];M.state.seq=2;M.setMode('select');M.rebuild();M.save();});await page.waitForTimeout(300);
await page.click('#bSave');await page.waitForTimeout(250);await page.fill('#svName','Villefictive hydro');await page.click('#svOk');await page.waitForTimeout(1500);
const CID=await page.evaluate(()=>window.MAQ.state.siteRef&&window.MAQ.state.siteRef.id);
await page.goto(BASE+'/index.html');await page.waitForTimeout(1500);await openSite(page,CID);
let out={cid:CID,srv:!!SITES[CID]};
/* coupe de sectorisation sur la vanne 1 + rinçage coché (comme ✂ Sectoriser sur le plan) */
out.cut=await page.evaluate(()=>{const T=window.TRACE;const h=T.hydro.of();h.prest.rincage=true;h.cuts.push({line:'L1',m:20});T.hydro.save();T.state.tab='hydro';T.renderAll();const H=T.hydro.build();return {valve:H.cuts[0]&&H.cuts[0].valve,tr:H.troncons.length};});
await page.waitForTimeout(400);
out.bloc=await page.evaluate(()=>{const el=document.getElementById('hydro');const t=el.textContent.replace(/\s+/g,' ');const i=t.indexOf('2 bis');const h3=[...el.querySelectorAll('h3')].map(x=>x.textContent.replace(/\s+/g,' ').trim().slice(0,30));
  return {txt:t.slice(i,i+330),rows:[...el.querySelectorAll('.pt-vannes .pt-row')].map(r=>r.dataset.pt),pv:el.querySelectorAll('.pt-pv .pt-row').length,pvOpen:!!(el.querySelector('.pt-pv')&&el.querySelector('.pt-pv').open),order:h3,modop:!!el.querySelector('.pt-modop'),tools:el.querySelectorAll('.pt-tools [data-pact=h-add]').length,hyTr:el.querySelectorAll('.hyTr').length,chips:el.querySelectorAll('.hyChip').length};});
await scrollTo(page,'#hydro .pt-vannes');await shot(page,'ph_pc_1_hydro_vannes');
/* composer : fenêtres « + Ouvrir une vanne » (V1), « + Opération » (rincer T1, consigne), « + Fermer » (V1), « + Ouvrir » (V2), « + Note » */
const add=async(type,fn)=>{await page.evaluate(t=>document.querySelector(`#hydro [data-pact=h-add][data-v="${t}"]`).click(),type);await page.waitForTimeout(250);const r=await page.evaluate(fn);await page.evaluate(()=>document.getElementById('pm-ok').click());await page.waitForTimeout(350);return r;};
out.modal=await add('ouvrir',()=>{const picks=[...document.querySelectorAll('#modal [data-pm-pt]')].map(b=>b.textContent.trim());document.querySelector('#modal [data-pm-pt="L1|vanne@20.0"]').click();return {show:document.getElementById('modal').classList.contains('show'),picks,tron:!!document.getElementById('pm-tron')};});
await add('op',()=>{document.querySelector('#modal [data-pm-op=rincer]').click();document.getElementById('pm-tron').value='0';document.getElementById('pm-note').value='20 min à 1 m/s';return true;});
await add('fermer',()=>{document.querySelector('#modal [data-pm-pt="L1|vanne@20.0"]').click();return true;});
await add('ouvrir',()=>{document.querySelector('#modal [data-pm-pt="L1|vanne@70.0"]').click();return true;});
await add('note',()=>{document.getElementById('pm-note').value='prévenir l\'exploitant fictif';return true;});
/* sans contexte : refus clair (opération sans tronçon choisi) */
await page.evaluate(()=>document.querySelector('#hydro [data-pact=h-add][data-v=op]').click());await page.waitForTimeout(250);await page.evaluate(()=>document.getElementById('pm-ok').click());await page.waitForTimeout(150);out.refus=await toast(page);await page.evaluate(()=>{const m=document.getElementById('modal');const b=m.querySelector('[data-close]');if(b)b.click();});
await flushed(page);await page.waitForTimeout(1600); /* la partie « hydro » du chantier part après 1,2 s */
out.steps=await page.evaluate(()=>{const T=window.TRACE;const st=T.hydro.of().modop.rincage;const el=document.getElementById('hydro');return {data:st.map(s=>s.type+':'+(s.pt||s.op||'')+':'+(s.tron==null?'-':s.tron)+':'+(s.done?'fait':'')),ui:[...el.querySelectorAll('.pt-modop .pt-step .main b')].map(b=>b.textContent),next:(el.querySelector('.pt-step.next .main b')||{}).textContent,prog:(el.querySelector('.pt-progtxt')||{}).textContent};});
out.srvModop=(SITES[CID]&&SITES[CID].data.hydro&&SITES[CID].data.hydro.modop&&SITES[CID].data.hydro.modop.rincage||[]).length;
/* ↓ sur l'étape 1 puis ↑ : ordre revenu ; ✕ retire la note puis on la remet */
await page.evaluate(()=>{const s=document.querySelector('#hydro .pt-modop .pt-step');s.querySelector('[data-pact=h-down]').click();});await page.waitForTimeout(300);
out.moved=await page.evaluate(()=>window.TRACE.hydro.of().modop.rincage.map(s=>s.type).join('>'));
await page.evaluate(()=>{const s=document.querySelectorAll('#hydro .pt-modop .pt-step')[1];s.querySelector('[data-pact=h-up]').click();});await page.waitForTimeout(300);
out.back=await page.evaluate(()=>window.TRACE.hydro.of().modop.rincage.map(s=>s.type).join('>'));
await page.evaluate(()=>{const s=[...document.querySelectorAll('#hydro .pt-modop .pt-step')].pop();s.querySelector('[data-pact=h-del]').click();});await page.waitForTimeout(300);
out.del=await page.evaluate(()=>window.TRACE.hydro.of().modop.rincage.length);
await add('note',()=>{document.getElementById('pm-note').value='prévenir l\'exploitant fictif';return true;});await page.waitForTimeout(1600);
await scrollTo(page,'#hydro .pt-modop');await shot(page,'ph_pc_2_mode_operatoire');
out.print=await page.evaluate(()=>{const h=window.TRACE.ptseq.modop.printHTML('rincage');return {title:/Mode opératoire — Rinçage dynamique/.test(h),site:/Villefictive hydro/.test(h),rows:(h.match(/<tr><td class="n"><b>\d+<\/b>/g)||[]).length,todo:(h.match(/☐/g)||[]).length,done:(h.match(/☑/g)||[]).length,tr:/T1/.test(h)&&/T2/.test(h),pk:/PK 20/.test(h)&&/PK 70/.test(h),a4:/@page\{size:A4/.test(h)};});
/* « Voir sur le plan » depuis le bloc Vannes de l'onglet Hydro */
await page.evaluate(k=>document.querySelector(`#hydro .pt-vannes [data-pact=goto][data-pt="${k}"]`).click(),VK2);await page.waitForTimeout(600);
out.goto=await page.evaluate(k=>{const T=window.TRACE;return {tab:T.state.tab,sel:T.state.sel&&T.state.sel.pt,show:document.getElementById('sheet').classList.contains('show')};},VK2);
await page.evaluate(()=>window.TRACE.closeSheet());
console.log('c1) chef : Hydro, vannes, mode opératoire :',JSON.stringify(out));
C.c1=out.srv&&out.cut.valve==='V1'&&out.cut.tr===2&&/2 vannes · 2 sans état/.test(out.bloc.txt)&&/✂ coupe de sectorisation : T1 \| T2/.test(out.bloc.txt)&&out.bloc.rows.join('|')===VK+'|'+VK2&&out.bloc.pv===2&&!out.bloc.pvOpen&&out.bloc.modop&&out.bloc.tools===6&&out.bloc.hyTr===4&&out.bloc.chips===1
  &&out.bloc.order.findIndex(x=>/2 bis/.test(x))>out.bloc.order.findIndex(x=>/2 · Sectorisation/.test(x))&&out.bloc.order.findIndex(x=>/2 ter/.test(x))<out.bloc.order.findIndex(x=>/3 · Calendrier/.test(x))
  &&out.modal.show&&out.modal.picks.length===2&&/Vanne DN100 · PK 20 · Rue Fictive/.test(out.modal.picks[0])&&out.modal.tron&&/Choisis l'opération/.test(out.refus)
  &&out.steps.data.join('|')==='ouvrir:'+VK+':-:|op:rincer:0:|fermer:'+VK+':-:|ouvrir:'+VK2+':-:|note::-:'&&out.steps.ui[0]==='🔓 Ouvrir — Vanne DN100 · PK 20'&&out.steps.ui[1]==='🌊 Rincer — Tronçon 1 — Rue Fictive'&&out.steps.ui[2]==='🔒 Fermer — Vanne DN100 · PK 20'&&out.steps.ui[4]==='📝 prévenir l\'exploitant fictif'&&out.steps.next===out.steps.ui[0]&&/Fait : 0 \/ 5/.test(out.steps.prog)&&out.srvModop===5
  &&out.moved==='op>ouvrir>fermer>ouvrir>note'&&out.back==='ouvrir>op>fermer>ouvrir>note'&&out.del===4
  &&out.print.title&&out.print.site&&out.print.rows===5&&out.print.todo===5&&out.print.done===0&&out.print.tr&&out.print.pk&&out.print.a4&&out.goto.tab==='plan'&&out.goto.sel===VK2&&out.goto.show;
await ctx.close();
// ══ c2 · soudeur (téléphone 390) : 📍 Points → « ✓ Fait » sur « Ouvrir V1 » → constat 🔓, fiche + photo proposée, pastille, étape suivante ; « Fait » sur Rincer
({ctx,page}=await mkCtx(SOUD,{width:390,height:844},true));
await openSite(page,CID);await page.evaluate(()=>{window.TRACE.state.tab='points';window.TRACE.renderAll();});await page.waitForTimeout(500);
out=await page.evaluate(()=>{const el=document.getElementById('points');return {modop:!!el.querySelector('.pt-modop'),steps:el.querySelectorAll('.pt-modop .pt-step').length,edit:el.querySelectorAll('[data-pact=h-add],[data-pact=h-del]').length,next:(el.querySelector('.pt-step.next .main b')||{}).textContent,btn:(()=>{const b=el.querySelector('.pt-step.next [data-pact=h-done]');const r=b&&b.getBoundingClientRect();return r?{h:r.height,w:r.width,primary:b.classList.contains('primary')}:null;})()};});
await ov(page,'tel · points + mode opératoire');await scrollTo(page,'#points .pt-modop');await shot(page,'ph_tel_1_mode_operatoire');
await page.evaluate(()=>document.querySelector('#points .pt-step.next [data-pact=h-done]').click());await page.waitForTimeout(800);await flushed(page);
const rO=pteq().find(r=>r.pt===VK&&r.ctx==='ouverte');const STEPS=SITES[CID].data.hydro.modop.rincage;
out.fait={srv:rO&&{etat:rO.etat,byKey:rO.byKey,note:rO.note,step:rO.step},sheet:await page.evaluate(()=>({show:document.getElementById('sheet').classList.contains('show'),txt:document.getElementById('sheet').textContent.replace(/\s+/g,' ').slice(0,260),ask:!!document.querySelector('#sheet .warnbox input[data-ptph]')})),step1:STEPS[0].id,srvNext:!pteq().some(r=>r.step===STEPS[1].id),hydroUntouched:!STEPS[0].done&&SITES[CID].data.hydro.modop.rincage.length===5};
await ov(page,'tel · fiche après Fait');await shot(page,'ph_tel_2_fait_fiche');
await page.evaluate(()=>window.TRACE.closeSheet());await page.evaluate(()=>{window.TRACE.state.tab='plan';window.TRACE.centerOn(22,0,12);});await page.waitForTimeout(400);
out.glyph=(await glyphs(page))[VK];
await page.evaluate(()=>{window.TRACE.state.tab='points';window.TRACE.renderAll();});await page.waitForTimeout(400);
out.apres=await page.evaluate(()=>{const el=document.getElementById('points');const st=[...el.querySelectorAll('.pt-modop .pt-step')];return {first:st[0].className,firstTxt:st[0].textContent.replace(/\s+/g,' '),next:(el.querySelector('.pt-step.next .main b')||{}).textContent,prog:(el.querySelector('.pt-progtxt')||{}).textContent,undo:!!st[0].querySelector('[data-pact=h-undone]')};});
/* étape « ouvrir V2 » alors que… non : on marque Rincer (opération) → fait sans constat ; puis on simule « déjà ouverte » : V2 ouverte par constat direct → l'étape 4 le signale */
await page.evaluate(()=>document.querySelector('#points .pt-step.next [data-pact=h-done]').click());await page.waitForTimeout(700);await flushed(page);
const rM=pteq().find(r=>r.ctx==='modop');out.rincer={srv:rM&&{step:rM.step,byKey:rM.byKey,by:rM.byName,label:rM.label},n:pteq().length,toast:await toast(page),sheet:await page.evaluate(()=>document.getElementById('sheet').classList.contains('show')),noOrphan:await page.evaluate(()=>window.TRACE.ptseq.points().every(p=>!p.absent))};
await page.evaluate(k=>window.TRACE.ptseq.open(k),VK2);await page.waitForTimeout(300);await page.evaluate(()=>document.querySelector('#sheet [data-pact=etat][data-v=ouverte]').click());await page.waitForTimeout(500);await flushed(page);await page.evaluate(()=>window.TRACE.closeSheet());
await page.evaluate(()=>{window.TRACE.state.tab='points';window.TRACE.renderAll();});await page.waitForTimeout(400);
out.warn=await page.evaluate(()=>{const st=[...document.querySelectorAll('#points .pt-modop .pt-step')];return {s4:st[3].textContent.replace(/\s+/g,' '),warn:!!st[3].querySelector('.pt-warn'),s3warn:!!st[2].querySelector('.pt-warn')};});
await ov(page,'tel · après étapes');await scrollTo(page,'#points .pt-modop');await shot(page,'ph_tel_3_etapes');
console.log('c2) soudeur, téléphone :',JSON.stringify(out));
C.c2=out.modop&&out.steps===5&&out.edit===0&&out.next==='🔓 Ouvrir — Vanne DN100 · PK 20'&&out.btn&&out.btn.h>=48&&out.btn.primary
  &&out.fait.srv&&out.fait.srv.etat==='ouverte'&&out.fait.srv.byKey===SOUD.email&&/Mode opératoire Rinçage dynamique — étape 1/.test(out.fait.srv.note)&&out.fait.sheet.show&&/🔓 Ouverte depuis le \d\d\/\d\d \d\d:\d\d par Dominique FICTIF/.test(out.fait.sheet.txt)&&out.fait.sheet.ask&&out.fait.srv.step===out.fait.step1&&out.fait.srvNext&&out.fait.hydroUntouched
  &&out.glyph==='🔓'&&/done/.test(out.apres.first)&&/fait par Dominique FICTIF/.test(out.apres.firstTxt)&&/constat enregistré/.test(out.apres.firstTxt)&&out.apres.next==='🌊 Rincer — Tronçon 1 — Rue Fictive'&&/Fait : 1 \/ 5/.test(out.apres.prog)&&out.apres.undo
  &&out.rincer.srv&&out.rincer.srv.step===STEPS[1].id&&out.rincer.srv.byKey===SOUD.email&&out.rincer.srv.by==='Dominique FICTIF'&&/Rincer — Tronçon 1/.test(out.rincer.srv.label)&&out.rincer.n===2&&/Étape 2 faite/.test(out.rincer.toast)&&!out.rincer.sheet&&out.rincer.noOrphan&&out.warn.warn&&/déjà ouverte/.test(out.warn.s4)&&!out.warn.s3warn;
await ctx.close();
// ══ c3 · chef : états dans Hydro, alerte vanne de coupe ouverte (bloc + carte), DOE, ↶, duplication
({ctx,page}=await mkCtx(CHEF,{width:1366,height:900}));
await openSite(page,CID);await tabHydro(page);await page.waitForTimeout(500);
out={v1:await page.evaluate(k=>{const r=document.querySelector(`#hydro .pt-vannes .pt-row[data-pt="${k}"]`);return r?r.textContent.replace(/\s+/g,' '):'';},VK),cnt:(await hyTxt(page)).match(/2 vannes · \d sans état/)};
out.alert0=/Vanne de coupe OUVERTE/.test(await hyTxt(page));
/* opération du jour sur T1 (calendrier) → la vanne 1 (ouverte) isole T1 : alerte en clair, et sur la carte */
await page.evaluate(()=>{const T=window.TRACE;const h=T.hydro.of();const d=new Date();const iso=d.getFullYear()+'-'+String(d.getMonth()+1).padStart(2,'0')+'-'+String(d.getDate()).padStart(2,'0');h.cal.push({op:'rincage',t:0,d:iso});T.hydro.save();T.renderAll();});await page.waitForTimeout(700);
out.alert=await page.evaluate(()=>{const T=window.TRACE;const el=document.getElementById('hydro');const cs=T.ptseq.modop.cut(T.hydro.build().cuts[0]);return {bloc:/Vanne de coupe OUVERTE/.test(el.textContent),map:(document.querySelector('#hyOv')||{innerHTML:''}).innerHTML.includes('vanne OUVERTE'),glyph:(document.querySelector('#hyOv')||{innerHTML:''}).innerHTML.includes('vanne V1 🔓'),cs};});
await scrollTo(page,'#hydro .pt-vannes');await shot(page,'ph_pc_3_alerte_vanne_ouverte');
if(SHOTS){await page.evaluate(()=>{const b=document.querySelector('#hydroMap .hyCtl [data-a="fit"]');if(b)b.click();});await page.waitForTimeout(500);await scrollTo(page,'#hydroMap');await shot(page,'ph_pc_3b_carte_hydro_alerte');
  const prHtml=await page.evaluate(()=>window.TRACE.ptseq.modop.printHTML('rincage'));await ctx.route(u=>u.href===BASE+'/_modop_pa.html',r=>r.fulfill({status:200,contentType:'text/html; charset=utf-8',body:prHtml}));const pp=await ctx.newPage();await pp.setViewportSize({width:1000,height:1100});await pp.goto(BASE+'/_modop_pa.html');await pp.waitForTimeout(500);await shot(pp,'ph_pc_5_impression_mode_operatoire');await pp.close();}
/* DOE : modes opératoires dans la section des points */
out.doe=await page.evaluate(()=>{const T=window.TRACE;const D=T.doe.data();const h=T.doe.carnet(D,{all:true});return {sec:/Modes opératoires hydrauliques/.test(h),title:/Rinçage dynamique — 2 \/ 5 étapes faites/.test(h),who:(h.match(/Dominique FICTIF/g)||[]).length>=2,pts:D.points.length};});
/* ↶ sur l'étape 1 (chef) → constat retiré, vanne 1 sans état ; duplication des étapes du tronçon 1 vers le tronçon 2 */
await page.evaluate(()=>document.querySelector('#hydro .pt-modop .pt-step [data-pact=h-undone]').click());await page.waitForTimeout(600);await flushed(page);
out.undo={srvDel:!!(REG['pteq|'+rO.id]&&REG['pteq|'+rO.id].data.deleted),step:pteq().some(r=>r.step===STEPS[0].id)?'encore':null,v1:await page.evaluate(k=>document.querySelector(`#hydro .pt-vannes .pt-row[data-pt="${k}"]`).textContent.replace(/\s+/g,' '),VK),alert:/Vanne de coupe OUVERTE/.test(await hyTxt(page))};
await page.evaluate(()=>document.querySelector('#hydro [data-pact=h-tron][data-v="0"]').click());await page.waitForTimeout(300);
out.dup=await page.evaluate(()=>{const el=document.getElementById('hydro');const shown=el.querySelectorAll('.pt-modop .pt-step').length;const b=el.querySelector('[data-pact=h-dup]');if(!b)return {shown,btn:false};b.click();return {shown,btn:true};});await page.waitForTimeout(300);
await page.evaluate(()=>{document.getElementById('pm-tron').value='1';document.getElementById('pm-ok').click();});await page.waitForTimeout(1700);await flushed(page);
out.dup.after=await page.evaluate(()=>{const st=window.TRACE.hydro.of().modop.rincage;const mk=window.TRACE.ptseq.modop.marks();return {n:st.length,t2:st.filter(s=>s.tron===1).map(s=>s.type+':'+(mk[s.id]?'fait':'')),view:[...document.querySelectorAll('#hydro .pt-modop .pt-step')].length,srvN:0};});out.dup.after.srvN=(SITES[CID].data.hydro.modop.rincage||[]).length;
await scrollTo(page,'#hydro .pt-modop');await shot(page,'ph_pc_4_duplique_t2');
console.log('c3) chef : états, alerte, DOE, annulation, duplication :',JSON.stringify(out));
C.c3=/🔓 Ouverte depuis le \d\d\/\d\d \d\d:\d\d par Dominique FICTIF/.test(out.v1)&&/✂ coupe de sectorisation : T1 \| T2/.test(out.v1)&&out.cnt&&/2 vannes · 0 sans état/.test(out.cnt[0])&&!out.alert0
  &&out.alert.bloc&&out.alert.map&&out.alert.glyph&&out.alert.cs&&out.alert.cs.alert&&out.alert.cs.etat==='ouverte'&&/en cours sur T1/.test(out.alert.cs.txt)
  &&out.doe.sec&&out.doe.title&&out.doe.who&&out.doe.pts===2
  &&out.undo.srvDel&&out.undo.step===null&&/état non renseigné/.test(out.undo.v1)&&!out.undo.alert
  &&out.dup.btn&&out.dup.shown===5&&out.dup.after.n===6&&out.dup.after.t2.join('|')==='op:'&&out.dup.after.view===5&&out.dup.after.srvN===6;
await ctx.close();
// ══ c4 · 390 px ; c5 · console
C.c4=OV.length>=3&&OV.every(Boolean);
console.log('erreurs console :',JSON.stringify(logs));C.c5=logs.length===0;
const bad=Object.entries(C).filter(([k,v])=>!v).map(([k])=>k);console.log(bad.length?'RESULTAT: ECHEC '+bad.join(','):'RESULTAT: TOUT VERT');
await browser.close();
