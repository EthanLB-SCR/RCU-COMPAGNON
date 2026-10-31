// e2e_pi_3110.mjs — 31/10/2026 (lot PI) : PILOTAGE V1 — pointage à valider, planning simplifié, production par équipe.
// Supabase SIMULÉ (en mémoire dans ce script, repris de e2e_inter) partagé entre plusieurs navigateurs = plusieurs téléphones / PC ; règle serveur de pointage_set
// reproduite (la personne écrit SA journée sans validation ni correction ; chef / bureau écrivent tout). Personnages et chantiers 100 % FICTIFS.
// Date figée : lundi 09/11/2026 (trace:testToday) ; semaine 46 avec le mercredi 11/11 férié ; la semaine passée (S45) est pointée.
//  c1  cheffe (téléphone 390) le lundi : « À faire » = 3 pointages à valider (vendredi, semaine PASSÉE — avant : invisibles tant que le planning de la semaine n'était
//      pas fait) + 1 pointage manquant ; écran : vendredi proposé, « Tout valider (1) » pour la seule ligne complète, 2 lignes à part (fin manquante, pas de pause)
//  c2  manchonneur (téléphone 360) : « Fin de journée pas pointée » → il indique 16 h 15 HORS CONNEXION (gardé sur l'appareil) → reconnexion → serveur : fin
//      « après coup » acceptée (sans validation ni correction), notification disparue
//  c3  cheffe : la fin de Marc est signalée « ajoutée après coup » (hors « Tout valider ») ; Tout valider → Hugo ; Théo : correction « pause 12 h, 1 h » = pause + reprise
//      (8 h 00, plus 9 h), trace qui / quand ; Marc validé ; journée de Lucas SAISIE (pointage manquant) ; 0 à valider, plus rien dans « À faire »
//  c4  conducteur (PC 1366) : 8 à valider après la cheffe (jeudi + vendredi, dont 1 sur un chantier SANS chef : pas d'étape chef) ; vendredi « Tout valider (3) » + Marc
//      à part ; jeudi « Tout valider (4) » ; 0 ; trace serveur chef → conducteur (et conducteur seul sur le chantier sans chef)
//  c5  le gars voit l'état : Hugo « ✓ déclaré › ✓ chef › ✓ conducteur », Heures « Validé par le conducteur » ; il pointe son lundi (début, pause, reprise, fin →
//      « envoyée pour validation », étapes), « Annuler la fin » (touchée par erreur) puis fin ; Théo voit « Pointage corrigé » (à savoir) + la trace
//  c6  planning simplifié (PC) : S46, férié visible ; « Copier la semaine dernière » (férié sauté, équipe A gardée) ; Nina placée en 3 touchers (Nina → Moulin → Placer)
//  c7  Nina (téléphone) : « Demain · mar. 10/11 : Chantier fictif du Moulin » dans Moi (Compagnon) et sur l'accueil
//  c8  « Plus d'options » : le planning détaillé d'avant s'ouvre (À placer, cartes) et revient ; le hub garde « Planning des équipes » (pli)
//  c9  production par équipe (PC) : chantiers comptés dits (Tilleuls ✓, Moulin ✗), semaine : équipe A 8 soudures · 96 ml · objectif « x / 6 soudures » + barre,
//      équipe B 4 manchons ; jour (vendredi) ; impression A4 (fenêtre, charte)
//  c10 bureau (RH, PC) : Production par équipe et Pointages à valider (2e niveau, rien en attente)
//  c11 téléphone 390 ET 360 : aucun débordement (validation, Moi, planning, production) ; boutons de terrain ≥ 44 px
//  c12 paliers ALLUMÉS (personne en Socle, options nouvelles en Labo) : l'écran d'avant (Planning des équipes, pas de tableau, pas de « Demain »)
//  c13 console propre (aucune erreur), aucune écriture refusée par le serveur simulé
import { chromium } from 'playwright';
import fs from 'fs';
const BASE=process.env.BASE||'http://127.0.0.1:8832';const SHOTS=process.env.SHOTS||'';if(SHOTS)fs.mkdirSync(SHOTS,{recursive:true});
const SB='https://pghftlepduvfazbiavhq.supabase.co';
const b64u=o=>Buffer.from(JSON.stringify(o)).toString('base64').replace(/=+$/,'').replace(/\+/g,'-').replace(/\//g,'_');
const mk=(n,prenom,nom,poste,role)=>({id:'0000000'+n+'-aaaa-4aaa-8aaa-00000000000'+n,email:(prenom+'.'+nom).toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g,'')+'@exemple.fr',prenom,nom,poste,role,admin:false});
const SOUD=mk(1,'Hugo','TESTSOUDEUR','soudeur','soudeur'),TUY=mk(2,'Théo','TESTTUYAU','tuyauteur','tuyauteur'),MAN=mk(3,'Marc','TESTMANCHON','manchonneur','manchonneur'),
  NEUF=mk(4,'Lucas','TESTNOUVEAU','soudeur','soudeur'),CHEF=mk(5,'Chloé','TESTCHEF','chef','chef'),COND=mk(6,'Denis','TESTCONDUC','conducteur','chef'),BUR=mk(7,'Béa','TESTBUREAU','assist_rh','bureau'),INT=mk(8,'Nina','TESTINTERIM','soudeur','soudeur');
const USERS=[SOUD,TUY,MAN,NEUF,CHEF,COND,BUR,INT];
const PROFILES=USERS.map(u=>({id:u.id,email:u.email,name:u.prenom+' '+u.nom,prenom:u.prenom,nom:u.nom,role:u.role,active:true,poste:u.poste,admin:u.admin,type:'salarie',rights:{},sites:null,created_at:'2026-10-01T09:00:00Z'}));
const REG={},PEOPLE={},PTS={},PLAN={},SITE={},SETTINGS={};const REFUS=[];const OFFLINE=new Set(); /* téléphones « sans réseau » : le serveur simulé ne leur répond plus */const logs=[];const C={};const OVF=[];
const nowIso=()=>new Date().toISOString();const J=x=>JSON.stringify(x);
const flt=(rows,u)=>{let r=rows;for(const [k,v] of u.searchParams.entries()){if(['select','order','limit','offset'].includes(k))continue;const m=/^(in|gt|gte|lt|lte|eq|neq)\.(.*)$/.exec(v);if(!m)continue;const op=m[1],val=m[2];
  r=r.filter(x=>{const xv=x[k]===undefined||x[k]===null?'':String(x[k]);if(op==='in')return val.replace(/^\(|\)$/g,'').split(',').map(s=>s.replace(/^"|"$/g,'')).includes(xv);if(op==='eq')return xv===val;if(op==='neq')return xv!==val;
    const a=Date.parse(xv),b=Date.parse(val);const c=(!isNaN(a)&&!isNaN(b))?(a-b):(xv<val?-1:xv>val?1:0);return op==='gt'?c>0:op==='gte'?c>=0:op==='lt'?c<0:c<=0;});}return r;};
const CORS={'access-control-allow-origin':'*','access-control-allow-headers':'*','access-control-allow-methods':'GET, POST, PUT, PATCH, DELETE, OPTIONS'};
const metaRow=r=>({id:r.id,name:r.name,supplier:r.supplier||null,updated_at:r.updated_at,geo:null,origin:null,bgo:null,sat:null,w:null,h:null,bbox:null,nbox:null,nw:40,deleted:null,deletedAt:null,builtin:null,ville:(r.data.fiche||{}).ville||null,chef:(r.data.fiche||{}).chef||null,conducteur:(r.data.fiche||{}).conducteur||null,secteur:(r.data.fiche||{}).secteur||null,etude:null});
/* règle serveur de pointage_set (sql/espace_v1.sql) */
const ptRule=(U,row)=>{const mine=String(row.p||'').toLowerCase()===U.email;const mgr=U.admin||['chef','bureau'].includes(U.role);if(!(mine||mgr))return 'pointage d\'une autre personne';if(!mgr&&((row.val||[]).length>0||(row.corr&&typeof row.corr==='object')))return 'validation et correction réservées au chef / bureau';return null;};
const browser=await chromium.launch({headless:true,executablePath:process.env.CHROMIUM_PATH||undefined});
async function mkCtx(U,viewport,mobile){const ctx=await browser.newContext({viewport,isMobile:!!mobile,hasTouch:!!mobile,deviceScaleFactor:1});
  const user=()=>({id:U.id,aud:'authenticated',role:'authenticated',email:U.email,email_confirmed_at:'2026-10-01T09:00:00Z',app_metadata:{provider:'email'},user_metadata:{},identities:[],created_at:'2026-10-01T09:00:00Z',updated_at:nowIso()});
  const session=()=>{const t=Math.floor(Date.now()/1000);return {access_token:b64u({alg:'HS256',typ:'JWT'})+'.'+b64u({iss:SB+'/auth/v1',sub:U.id,aud:'authenticated',exp:t+3600,iat:t,email:U.email,role:'authenticated'})+'.sig',token_type:'bearer',expires_in:3600,expires_at:t+3600,refresh_token:'rt-'+t,user:user()};};
  await ctx.route(u=>u.href.startsWith(SB),async route=>{const req=route.request();const u=new URL(req.url());const p=u.pathname;const acc=req.headers()['accept']||'';
    const json=(o,status=200)=>route.fulfill({status,contentType:'application/json',headers:CORS,body:JSON.stringify(o)});
    if(req.method()==='OPTIONS')return route.fulfill({status:200,headers:CORS,body:''});
    if(OFFLINE.has(U.email))return route.abort('internetdisconnected');
    let b={};try{b=JSON.parse(req.postData()||'{}');}catch(e){}
    if(p==='/auth/v1/token')return json(session());if(p==='/auth/v1/user')return json(user());if(p.startsWith('/auth/v1/'))return json({});
    if(p.startsWith('/storage/v1/'))return json({statusCode:'400',error:'test',message:'stockage simulé indisponible'},400);
    if(p==='/rest/v1/profiles'){const m=/id=eq\.([^&]+)/.exec(u.search);const r=m?PROFILES.filter(x=>x.id===decodeURIComponent(m[1])):PROFILES;return json(/object/.test(acc)?(r[0]||null):r);}
    if(p==='/rest/v1/invites')return json([]);if(p==='/rest/v1/rpc/annuaire_invites')return json([]);
    if(p==='/rest/v1/app_settings'){const m=/key=eq\.([a-z_]+)/.exec(u.search);const k=m&&m[1];const row=k&&SETTINGS[k]!==undefined?{value:SETTINGS[k]}:null;return /object/.test(acc)?json(row):json(row?[row]:[]);}
    if(p==='/rest/v1/rpc/registre_set'){const k=b.p_kind+'|'+b.p_id;const old=(REG[k]||{}).data||{};const data=b.p_mode==='replace'?Object.assign({},b.p_patch||{}):Object.assign({},old,b.p_patch||{});Object.keys(b.p_patch||{}).forEach(x=>{if(b.p_patch[x]===null)delete data[x];});REG[k]={kind:b.p_kind,id:b.p_id,data,updated_at:nowIso(),by:U.email};return json(REG[k]);}
    if(p==='/rest/v1/registre')return json(flt(Object.values(REG),u));
    if(p==='/rest/v1/rpc/people_set_part'){const r=PEOPLE[b.p_key]||(PEOPLE[b.p_key]={key:b.p_key,data:{}});r.data=Object.assign({},r.data,{[b.p_part]:b.p_value});r.updated_at=nowIso();return json({at:r.updated_at,value:b.p_value});}
    if(p==='/rest/v1/people')return json(flt(Object.values(PEOPLE),u));
    if(p==='/rest/v1/rpc/pointage_set'){const err=ptRule(U,b.p_row||{});if(err){REFUS.push(U.prenom+' : '+err);return json({code:'P0001',message:err,details:null,hint:null},400);}const row=Object.assign({},b.p_row,{p:String(b.p_row.p).toLowerCase(),updated_at:nowIso(),updated_by:U.id});PTS[row.p+'|'+row.d]=row;return json(row);}
    if(p==='/rest/v1/pointages')return json(flt(Object.values(PTS),u));
    if(p==='/rest/v1/rpc/planning_set'){const w=b.p_week;const r=PLAN[w]||(PLAN[w]={week:w,data:{aff:{}}});const aff=Object.assign({},r.data.aff);Object.entries((b.p_patch&&b.p_patch.aff)||{}).forEach(([k,v])=>{if(v===null)delete aff[k];else aff[k]=v;});r.data={aff};r.updated_at=nowIso();return json(r);}
    if(p==='/rest/v1/planning')return json(flt(Object.values(PLAN),u));
    if(p==='/rest/v1/rpc/site_set_part'){const row=SITE[b.p_site];if(!row)return json(null);row.data=Object.assign({},row.data,{[b.p_key]:b.p_value});row.updated_at=nowIso();return json({at:row.updated_at,value:b.p_value});}
    if(p==='/rest/v1/sites'){const sel=u.searchParams.get('select')||'';if(req.method()!=='GET')return json([]);const m=/id=eq\.([^&]+)/.exec(u.search);const id=m?decodeURIComponent(m[1]):null;let rows=Object.values(SITE).filter(r=>!id||r.id===id);
      if(/missions:data->missions/.test(sel))return json(flt(Object.values(SITE),u).map(r=>({id:r.id,updated_at:r.updated_at,missions:r.data.missions||null})));
      if(/(^|,)data(,|$)/.test(sel))return json(/object/.test(acc)?(rows[0]?{id:rows[0].id,name:rows[0].name,supplier:rows[0].supplier,serie:null,data:rows[0].data,updated_at:rows[0].updated_at}:null):rows.map(r=>({id:r.id,name:r.name,supplier:r.supplier,serie:null,data:r.data,updated_at:r.updated_at})));
      return json(/object/.test(acc)?(rows[0]?metaRow(rows[0]):null):rows.map(metaRow));}
    if(p.startsWith('/rest/v1/rpc/'))return json(null);if(p.startsWith('/rest/v1/'))return json(/object/.test(acc)?null:[]);return json([]);});
  await ctx.route(u=>/open-meteo\.com$|(^|\.)geopf\.fr$|^geo\.api\.gouv\.fr$/.test(u.hostname),r=>r.fulfill({status:200,contentType:'application/json',body:'{}'}));
  const page=await ctx.newPage();page.on('dialog',d=>d.accept().catch(()=>{}));
  page.on('pageerror',e=>logs.push(U.prenom+' PAGEERROR: '+e.message.slice(0,300)));page.on('console',m=>{if(m.type()==='error'&&!/realtime|websocket|Failed to fetch|net::ERR|404|400|open-meteo|geopf|geo\.api|status of 4\d\d|supabase/i.test(m.text()))logs.push(U.prenom+': '+m.text().slice(0,200));});
  return {ctx,page,U};}
const W=(pg,ms)=>pg.waitForTimeout(ms);
const TODAY='2026-11-09';
const login=async(P,opts)=>{const page=P.page;await page.goto(BASE+'/index.html');await W(page,400);await page.evaluate(([t,wide])=>{localStorage.clear();localStorage.setItem('trace:syncMs','4000');localStorage.setItem('trace:testToday',t);if(wide)localStorage.setItem('trace:wide','1');},[TODAY,!!(opts&&opts.wide)]);await page.evaluate(()=>new Promise(r=>{try{const q=indexedDB.deleteDatabase('trace-kv');q.onsuccess=q.onerror=q.onblocked=()=>r();}catch(e){r();}}));await page.reload();await W(page,800);
  await page.fill('#loginEmail',P.U.email);await page.fill('#loginPwd','Test-2026!');await page.click('#loginGo');await W(page,3000);
  await page.waitForFunction(()=>window.TRACE&&window.TRACE.espace&&window.TRACE.espace.state().loaded,null,{timeout:20000}).catch(()=>{});await W(page,300);};
const open=async(U,vp,mobile,opts)=>{const P=await mkCtx(U,vp,mobile);await login(P,opts);return P;};
const tap=async(pg,sel,ms)=>{await pg.evaluate(s=>{const el=document.querySelector(s);if(!el)throw new Error('absent : '+s+' · '+((document.getElementById('eq-app')||document.body).textContent||'').replace(/\s+/g,' ').slice(0,300));el.click();},sel);await W(pg,ms||300);};
const tapAct=(pg,act,v,ms)=>tap(pg,`#eq-app [data-act="${act}"][data-v="${v}"]`,ms);
const fake=async(pg,act,v,ms)=>{await pg.evaluate(([a,v])=>{const b=document.createElement('button');b.dataset.act=a;b.dataset.v=v;b.style.display='none';document.querySelector('#eq-app').append(b);b.click();},[act,v]);await W(pg,ms||400);};
const hubRow=async(pg,re)=>{await pg.evaluate(src=>{const re=new RegExp(src);const bk=document.querySelector('#eq-app .ac-back');if(bk)bk.click();const r=[...document.querySelectorAll('#eq-app .ac-row')].find(x=>re.test(x.textContent));if(!r)throw new Error('ligne absente : '+src);r.click();},re.source);await W(pg,450);};
const home=async(pg,tab)=>{await pg.evaluate(t=>{const T=window.TRACE;if(T.state.screen!=='home'){const b=document.getElementById('btnHome');if(b)b.click();}document.getElementById(t).click();},tab);await W(pg,450);};
const hub=async pg=>{await home(pg,'htSites');await home(pg,'htEq');};
const txt=pg=>pg.evaluate(()=>(document.getElementById('eq-app')||document.body).textContent.replace(/\s+/g,' '));
const notifs=pg=>pg.evaluate(()=>[...document.querySelectorAll('#eq-app [data-act=notif]')].map(x=>x.textContent.replace(/\s+/g,' ').trim()));
const until=async(pg,fn,arg,ms)=>{const t0=Date.now();while(Date.now()-t0<(ms||15000)){let v=null;try{v=await pg.evaluate(fn,arg);}catch(e){}if(v)return v;await W(pg,400);}return null;};
const noOverflow=pg=>pg.evaluate(()=>{const hb=document.getElementById('homeBody');return document.documentElement.scrollWidth<=window.innerWidth+1&&(!hb||hb.scrollWidth<=hb.clientWidth+1);});
const ovf=async(P,tag)=>{if(!(await noOverflow(P.page)))OVF.push(tag);};
const both=async(P,tag)=>{const vp=P.page.viewportSize();for(const w of [390,360]){await P.page.setViewportSize({width:w,height:800});await W(P.page,350);await ovf(P,tag+' '+w);}await P.page.setViewportSize(vp);await W(P.page,250);};
const shot=async(P,name,sel)=>{if(!SHOTS)return;try{if(sel){const el=await P.page.$(sel);if(el){await el.scrollIntoViewIfNeeded().catch(()=>{});await el.screenshot({path:SHOTS+'/'+name+'.png'});return;}}await P.page.screenshot({path:SHOTS+'/'+name+'.png'});}catch(e){console.log('capture '+name+' : '+e.message);}};
const minH=(pg,sel)=>pg.evaluate(s=>{const L=[...document.querySelectorAll(s)].filter(b=>b.offsetParent);return L.length?Math.min(...L.map(b=>b.getBoundingClientRect().height)):0;},sel);

// ── données fictives : un vrai plan (traceur, sans compte) servi par le serveur simulé pour deux chantiers fictifs
{const ctx=await browser.newContext({viewport:{width:900,height:900}});const pg=await ctx.newPage();pg.on('pageerror',e=>logs.push('traceur PAGEERROR: '+e.message.slice(0,200)));
  await ctx.route(u=>u.href.startsWith(SB),r=>r.fulfill({status:200,contentType:'application/json',headers:CORS,body:'[]'}));
  await pg.goto(BASE+'/traceur.html');await W(pg,500);await pg.evaluate(()=>{localStorage.clear();});await pg.reload();await W(pg,500);
  await pg.evaluate(()=>{const S=window.MAQ.state;S.supplier='AXIOM';S.lines=[{id:'L1',name:'Feeder fictif',dn:100,bar:12,pts:[[10,50],[70,50]],specials:[],parent:null}];S.seq=2;window.MAQ.setMode('select');window.MAQ.rebuild();});
  await pg.click('#bSave');await W(pg,200);await pg.fill('#svName','Plan fictif');await pg.click('#svOk');await W(pg,600);await pg.click('#svGo');await W(pg,1500);
  const NET=await pg.evaluate(()=>{const T=window.TRACE;const id=T.state.siteId;return JSON.parse(JSON.stringify(T.sites[id]));});await ctx.close();
  [['SRV_A','Chantier fictif des Tilleuls','Villefictive'],['SRV_B','Chantier fictif du Moulin','Autreville'],['SRV_C','Chantier fictif sans chef','Troisville']].forEach(([id,name,ville])=>{const d=Object.assign({},NET,{id,name,fiche:{ville,secteur:'ouest',chef:id==='SRV_C'?null:CHEF.email,conducteur:COND.email,horaires:'7 h 30 – 16 h 30'},sent:true});delete d.handoff;SITE[id]={id,name,supplier:'AXIOM',data:d,updated_at:'2026-10-20T08:00:00Z'};});
  C.c0_plan=!!(NET&&NET.lines&&NET.lines.length);}
const S45=['2026-11-02','2026-11-03','2026-11-04','2026-11-05','2026-11-06'],F='2026-11-06',JE='2026-11-05';
const wk=(d,s)=>Object.fromEntries(d.map(x=>[x,[s]]));
PLAN['2026-W45']={week:'2026-W45',data:{aff:{[SOUD.email]:Object.assign(wk(S45,'SRV_A'),{'eq:SRV_A':'A'}),[TUY.email]:Object.assign(wk(S45,'SRV_A'),{'eq:SRV_A':'A'}),[MAN.email]:Object.assign(wk(S45,'SRV_A'),{'eq:SRV_A':'B'}),[CHEF.email]:wk(S45,'SRV_A'),[NEUF.email]:{[JE]:['SRV_C'],[F]:['SRV_A']}}},updated_at:'2026-10-30T08:00:00Z'};
const ev=(d,a)=>a.map(([t,h])=>({t,at:d+'T'+h}));
const put=(u,d,events,extra)=>{PTS[u.email+'|'+d]=Object.assign({p:u.email,d,site:'SRV_A',events,status:'declare',val:[],corr:null,updated_at:'2026-11-06T17:00:00Z'},extra||{});};
put(SOUD,F,ev(F,[['start','07:30'],['pause','12:00'],['resume','13:00'],['end','16:30']]));      /* complet et cohérent */
put(TUY,F,ev(F,[['start','07:30'],['end','16:30']]));                                           /* pas de pause pointée */
put(MAN,F,ev(F,[['start','07:30'],['pause','12:00'],['resume','13:00']]));                      /* fin manquante */
[SOUD,TUY,MAN].forEach(u=>put(u,JE,ev(JE,[['start','07:30'],['pause','12:00'],['resume','13:00'],['end','16:30']]),{status:'valide',val:[{by:CHEF.email,at:JE+'T17:00'}]})); /* jeudi : déjà validé par la cheffe */
put(NEUF,JE,ev(JE,[['start','07:30'],['pause','12:00'],['resume','13:00'],['end','16:30']]),{site:'SRV_C'}); /* chantier SANS chef : pas d'étape « chef », le conducteur valide directement */
S45.slice(0,3).forEach(d=>[SOUD,TUY,MAN].forEach(u=>put(u,d,ev(d,[['start','07:30'],['pause','12:00'],['resume','13:00'],['end','16:30']]),{status:'valide',val:[{by:CHEF.email,at:d+'T17:00'},{by:COND.email,at:d+'T18:00'}]}))); /* lundi → mercredi : définitifs */
const K=(u,d)=>u.email+'|'+d;

// ── c1 : la cheffe, téléphone 390, le lundi
let P=await open(CHEF,{width:390,height:844},true);
let o={notifs:await notifs(P.page)};
await hub(P.page);o.kpi=await P.page.evaluate(()=>{const k=[...document.querySelectorAll('#eq-app .eq-kpi')].find(x=>/pointages à valider/.test(x.textContent));return k?k.textContent.replace(/\s+/g,' ').trim():'';});
await hubRow(P.page,/Pointages à valider/);
o.v=await P.page.evaluate(()=>({chips:[...document.querySelectorAll('#eq-app [data-act=valjour]')].map(b=>b.textContent.replace(/\s+/g,' ').trim()),active:(document.querySelector('#eq-app [data-act=valjour].active')||{}).dataset?.v,all:(document.querySelector('#eq-app [data-act=toutvalider]')||{}).textContent||'',allV:(document.querySelector('#eq-app [data-act=toutvalider]')||{dataset:{}}).dataset.v||'',
  t:document.getElementById('eq-app').textContent.replace(/\s+/g,' '),saisie:!!document.querySelector('#eq-app [data-act=pi][data-v^="saisie|"]'),valMarc:[...document.querySelectorAll('#eq-app [data-act=valider]')].map(b=>b.dataset.v)}));
await shot(P,'pi_c1_cheffe_valider_390');await both(P,'c1 validation');
console.log('c1) cheffe lundi :',J({notifs:o.notifs.filter(t=>/pointage/.test(t)),kpi:o.kpi,chips:o.v.chips,active:o.v.active,all:o.v.all,saisie:o.v.saisie,valider:o.v.valMarc}));
C.c1=o.notifs.some(t=>/^✓3 pointages à valider/.test(t)&&/depuis le ven\. 06\/11/.test(t))&&o.notifs.some(t=>/1 pointage manquant ven\. 06\/11/.test(t)&&/Lucas/.test(t))&&/^4\s*pointages à valider/.test(o.kpi)
  &&o.v.chips.some(c=>/^ven\. 06\/11 3 1$/.test(c)) /* 3 à valider + 1 pointage manquant (rouge) */&&o.v.active===F&&/Tout valider \(1\)/.test(o.v.all)&&o.v.allV===K(SOUD,F)&&/2 lignes à regarder à part \(fin manquante, pas de pause pointée\)/.test(o.v.t)&&o.v.saisie&&!o.v.valMarc.includes(K(MAN,F));
await P.ctx.close();

// ── c2 : le manchonneur, téléphone 360 : fin oubliée, indiquée HORS CONNEXION puis envoyée à la reconnexion
P=await open(MAN,{width:360,height:780},true);
o={notifs:await notifs(P.page)};const nFin=o.notifs.find(t=>/Fin de journée pas pointée : ven\. 06\/11/.test(t));
await P.page.evaluate(()=>{const n=[...document.querySelectorAll('#eq-app [data-act=notif]')].find(x=>/Fin de journée pas pointée/.test(x.textContent));if(n)n.click();});await W(P.page,600);
o.landed=await P.page.evaluate(()=>({tab:window.TRACE.state.homeTab,form:!!document.getElementById('pi-fin-h'),etapes:[...document.querySelectorAll('#eq-app .pi-pts .pi-et')].map(x=>x.textContent.replace(/\s+/g,' ').trim())}));
o.h44=await minH(P.page,'#eq-app .pi-pts [data-act=pi]');await shot(P,'pi_c2_gars_fin_360','#eq-app .pi-pts');await both(P,'c2 moi gars');
OFFLINE.add(MAN.email);await P.ctx.setOffline(true);await W(P.page,300);
await P.page.fill('#pi-fin-h','16:15');await tap(P.page,'#eq-app [data-act=pi][data-v^="finok|"]',1500);
o.offline={srvEnd:(PTS[K(MAN,F)].events||[]).some(e=>e.t==='end'),pending:await P.page.evaluate(()=>window.TRACE.espace.state().pending.length),card:await P.page.evaluate(()=>!!document.querySelector('#eq-app [data-v^="fin|"]'))};
OFFLINE.delete(MAN.email);await P.ctx.setOffline(false);
const t0=Date.now();while(Date.now()-t0<20000&&!(PTS[K(MAN,F)].events||[]).some(e=>e.t==='end'))await W(P.page,500);
const rowM=PTS[K(MAN,F)];o.srvEnd=(rowM.events||[]).find(e=>e.t==='end')||null;o.srvVal=(rowM.val||[]).length;o.srvCorr=rowM.corr;
await P.page.evaluate(()=>{window.TRACE.renderHome&&window.TRACE.renderHome();});await home(P.page,'htHome');o.notifs2=(await notifs(P.page)).filter(t=>/Fin de journée/.test(t));
console.log('c2) manchonneur :',J({nFin,landed:o.landed,h44:o.h44,offline:o.offline,srvEnd:o.srvEnd,val:o.srvVal,corr:o.srvCorr,notifs2:o.notifs2,refus:REFUS}));
C.c2=!!nFin&&o.landed.tab==='espace'&&o.landed.form&&o.landed.etapes.some(t=>/fin manquante/.test(t))&&o.h44>=44&&!o.offline.srvEnd&&o.offline.pending>=1&&!o.offline.card&&o.srvEnd&&o.srvEnd.at===F+'T16:15'&&!!o.srvEnd.late&&o.srvEnd.by===MAN.email&&o.srvVal===0&&!o.srvCorr&&!o.notifs2.length&&!REFUS.length;
await P.ctx.close();

// ── c3 : la cheffe valide, corrige, saisit
P=await open(CHEF,{width:390,height:844},true);await hub(P.page);await hubRow(P.page,/Pointages à valider/);
o={t0:await txt(P.page)};
await tap(P.page,'#eq-app [data-act=toutvalider]',900);
await tapAct(P.page,'corr',K(TUY,F),400);o.form=await P.page.evaluate(()=>({t:document.getElementById('eq-corr-t').value,h:document.getElementById('eq-corr-h').value,dur:document.getElementById('eq-corr-dur').value,m:document.getElementById('eq-corr-m').value}));
await shot(P,'pi_c3_cheffe_corriger_390','#eq-app .eq-form');
await tap(P.page,'#eq-app [data-act=corrok]',900);
await tapAct(P.page,'valider',K(MAN,F),900);
await tapAct(P.page,'pi','saisie|'+K(NEUF,F),400);o.sform=await P.page.evaluate(()=>({h0:document.getElementById('pi-s-h0').value,h1:document.getElementById('pi-s-h1').value}));await shot(P,'pi_c3_cheffe_saisir_390','#eq-app .pi-form');await both(P,'c3 saisie');
await tap(P.page,'#eq-app [data-act=pi][data-v^="saisieok|"]',1200);
await W(P.page,1500);
o.after=await txt(P.page);await home(P.page,'htHome');o.notifs=(await notifs(P.page)).filter(t=>/pointage/.test(t));
const rT=PTS[K(TUY,F)],rH=PTS[K(SOUD,F)],rM=PTS[K(MAN,F)],rL=PTS[K(NEUF,F)];
console.log('c3) cheffe :',J({form:o.form,sform:o.sform,theo:{ev:rT.events.map(e=>e.t+'@'+e.at.slice(11)).join(),st:rT.status,corr:rT.corr,val:rT.val.map(v=>v.by)},hugo:rH.val.map(v=>v.by),marc:rM.val.map(v=>v.by),lucas:rL&&{st:rL.status,corr:rL.corr&&rL.corr.t,ev:rL.events.map(e=>e.t+'@'+e.at.slice(11)).join(),val:rL.val.map(v=>v.by)},head:(o.after.match(/Pointages de l'équipe · \d+ à valider/)||[''])[0],notifs:o.notifs}));
C.c3=/fin ajoutée après coup par Marc/.test(o.t0)&&o.form.t==='pause'&&o.form.h==='12:00'&&o.form.dur==='60'&&o.form.m==='Pause non pointée'
  &&rT.events.map(e=>e.t+'@'+e.at.slice(11)).join()==='start@07:30,pause@12:00,resume@13:00,end@16:30'&&rT.status==='corrige'&&rT.corr.by===CHEF.email&&rT.corr.t==='pause'&&rT.corr.fin==='13:00'&&rT.val.map(v=>v.by).join()===CHEF.email
  &&rH.val.map(v=>v.by).join()===CHEF.email&&rM.val.map(v=>v.by).join()===CHEF.email&&o.sform.h0==='07:30'&&o.sform.h1==='16:30'&&!!rL&&rL.status==='corrige'&&rL.corr.t==='saisie'&&rL.corr.by===CHEF.email&&rL.events.map(e=>e.t).join()==='start,pause,resume,end'&&rL.val.map(v=>v.by).join()===CHEF.email
  &&/Pointages de l'équipe · 0 à valider/.test(o.after)&&!o.notifs.length;
await P.ctx.close();

// ── c4 : le conducteur (PC 1366, affichage large) valide après la cheffe
P=await open(COND,{width:1366,height:900},false,{wide:true});
o={notifs:(await notifs(P.page)).filter(t=>/pointage/.test(t))};await hub(P.page);await hubRow(P.page,/Pointages à valider/);
o.v=await P.page.evaluate(()=>({head:(document.querySelector('#eq-app .card h3')||{}).textContent,chips:[...document.querySelectorAll('#eq-app [data-act=valjour]')].map(b=>b.textContent.replace(/\s+/g,' ').trim()),all:(document.querySelector('#eq-app [data-act=toutvalider]')||{}).textContent||'',t:document.getElementById('eq-app').textContent.replace(/\s+/g,' ')}));
await shot(P,'pi_c4_conducteur_valider_1366');
await tap(P.page,'#eq-app [data-act=toutvalider]',900);await tapAct(P.page,'valider',K(MAN,F),900);
await tapAct(P.page,'valjour',JE,500);o.thu=await P.page.evaluate(()=>(document.querySelector('#eq-app [data-act=toutvalider]')||{}).textContent||'');await tap(P.page,'#eq-app [data-act=toutvalider]',900);await W(P.page,1500);
o.after=(await txt(P.page)).match(/Pointages de l'équipe · \d+ à valider/)?.[0];
console.log('c4) conducteur :',J({notifs:o.notifs,head:o.v.head,chips:o.v.chips,all:o.v.all,thu:o.thu,after:o.after,trace:/✅ chef : Chloé TESTCHEF/.test(o.v.t),vals:[SOUD,TUY,MAN,NEUF].map(u=>PTS[K(u,F)].val.map(v=>v.by.split('.')[0]).join('>')),thuV:[SOUD,TUY,MAN].map(u=>PTS[K(u,JE)].val.length)}));
C.c4=o.notifs.some(t=>/^✓8 pointages à valider · 2 jours/.test(t))&&/8 à valider · après le chef de chantier/.test(o.v.head)&&o.v.chips.some(c=>/^jeu\. 05\/11 4$/.test(c))&&o.v.chips.some(c=>/^ven\. 06\/11 4$/.test(c))&&/Tout valider \(3\)/.test(o.v.all)&&/✅ chef : Chloé TESTCHEF/.test(o.v.t)&&/✏️ pause 12:00 → 13:00 — Pause non pointée · par Chloé TESTCHEF/.test(o.v.t)
  &&/Tout valider \(4\)/.test(o.thu)&&/· 0 à valider/.test(o.after||'')&&PTS[K(NEUF,JE)].val.map(v=>v.by).join()===COND.email /* chantier sans chef : validé directement par le conducteur */&&[SOUD,TUY,MAN,NEUF].every(u=>PTS[K(u,F)].val.map(v=>v.by).join()===CHEF.email+','+COND.email)&&[SOUD,TUY,MAN].every(u=>PTS[K(u,JE)].val.length===2);
// ── c6 : planning simplifié (même conducteur, PC)
await hubRow(P.page,/Planning de la semaine/);
o={p0:await P.page.evaluate(()=>({h2:(document.querySelector('#eq-app h2.vt')||{}).textContent,sum:(document.querySelector('#eq-app .pi-sum')||{}).textContent||'',tray:[...document.querySelectorAll('#eq-app .pi-tray .pi-chip')].map(x=>x.textContent.replace(/\s+/g,' ').trim())}))};
await tapAct(P.page,'pi','copy|',1000);
const S46=PLAN['2026-W46']&&PLAN['2026-W46'].data.aff||{};o.fer=await P.page.evaluate(()=>[...document.querySelectorAll('#eq-app .pi-site[data-site=SRV_A] .pi-c.h.fer')].map(x=>x.textContent).join('|')+' / '+[...document.querySelectorAll('#eq-app .pi-site[data-site=SRV_A] .pi-c.fer:not(.h)')].length);o.copy={hugo:Object.keys(S46[SOUD.email]||{}).sort().join(),team:(S46[SOUD.email]||{})['eq:SRV_A'],marcTeam:(S46[MAN.email]||{})['eq:SRV_A'],n:Object.keys(S46).length,toast:await P.page.evaluate(()=>(document.getElementById('toast')||{}).textContent||'')};
await shot(P,'pi_c6_planning_copie_1366');
/* 3 touchers : Nina (à placer) → Moulin → Placer */
const t1=await P.page.evaluate(id=>{const b=document.querySelector(`#eq-app .pi-tray [data-act=pi][data-v="who|${id}"]`);if(b)b.click();return !!b;},INT.email);await W(P.page,350);
const t2=await P.page.evaluate(()=>{const b=document.querySelector('#eq-app #pi-panel [data-act=pi][data-v="site|SRV_B"]');if(b)b.click();return !!b;});await W(P.page,350);
o.panel=await P.page.evaluate(()=>({days:[...document.querySelectorAll('#pi-panel .pi-days [data-act=pi]')].map(b=>(b.classList.contains('active')?'✓':'·')+b.dataset.v.slice(-2)).join(' '),ok:(document.querySelector('#pi-panel [data-act=pi][data-v="ok|"]')||{}).textContent||''}));
await shot(P,'pi_c6_planning_placer_1366','#pi-panel');
const t3=await P.page.evaluate(()=>{const b=document.querySelector('#pi-panel [data-act=pi][data-v="ok|"]');if(b)b.click();return !!b;});await W(P.page,1500);
o.nina=PLAN['2026-W46'].data.aff[INT.email]||null;o.card=await P.page.evaluate(()=>{const c=document.querySelector('#eq-app .pi-site[data-site=SRV_B]');return c?c.textContent.replace(/\s+/g,' '):'';});
await shot(P,'pi_c6_planning_1366');
console.log('c6) planning :',J({p0:o.p0,fer:o.fer,copy:o.copy,taps:[t1,t2,t3],panel:o.panel,nina:o.nina,card:o.card.slice(0,120)}));
C.c6=/Planning de la semaine · semaine 46/.test(o.p0.h2)&&/férié : mer\. 11\/11/.test(o.p0.sum)&&/^M11férié \/ 5$/.test(o.fer)&&o.p0.tray.some(t=>/Équipe A · Chantier fictif des Tilleuls/.test(t))&&o.p0.tray.some(t=>/Nina TESTINTERIM/.test(t))
  &&o.copy.hugo==='2026-11-09,2026-11-10,2026-11-12,2026-11-13,eq:SRV_A'&&o.copy.team==='A'&&o.copy.marcTeam==='B'&&o.copy.n===5&&/5 personnes reprises de la semaine 45 · mer\. 11\/11 férié : pas repris/.test(o.copy.toast)
  &&t1&&t2&&t3&&o.panel.days==='✓09 ✓10 ·11 ✓12 ✓13'&&/Placer Nina · toute la semaine \(sauf férié\)/.test(o.panel.ok)&&J(o.nina)===J({'2026-11-09':['SRV_B'],'2026-11-10':['SRV_B'],'2026-11-12':['SRV_B'],'2026-11-13':['SRV_B']})&&/Nina/.test(o.card);
// ── c8 : Plus d'options → planning détaillé d'avant, et retour ; le hub garde l'ancienne ligne (pli)
await tapAct(P.page,'xgo','orga',500);o={orga:await P.page.evaluate(()=>({tray:!!document.querySelector('#eq-app .eq-pltray'),sites:document.querySelectorAll('#eq-app .eq-plsite').length,back:!!document.querySelector('#eq-app [data-act=xgo][data-v=plan]')}))};
await tapAct(P.page,'xgo','plan',500);o.back=await P.page.evaluate(()=>!!document.querySelector('#eq-app .pi-sites'));
await hub(P.page);await P.page.evaluate(()=>{const b=document.querySelector('#eq-app .ac-back');if(b)b.click();});await W(P.page,300);
o.hub=await P.page.evaluate(()=>({rows:[...document.querySelectorAll('#eq-app .ac-row .tx > b')].map(b=>b.textContent),fold:!!document.querySelector('#eq-app details.eq-hubmore [data-v=orga]'),badge:([...document.querySelectorAll('#eq-app .ac-row')].find(r=>/Planning de la semaine/.test(r.textContent))||{textContent:''}).textContent.replace(/\s+/g,' ')}));
await shot(P,'pi_c8_hub_1366');
console.log('c8) plus d\'options :',J(o));
C.c8=o.orga.tray&&o.orga.sites>=2&&o.orga.back&&o.back&&o.hub.rows.includes('Planning de la semaine')&&o.hub.rows.includes('Planning des équipes')&&o.hub.fold;
// ── c9 : production par équipe — le chantier des Tilleuls ouvert sur ce PC (soudures fictives à leur nom), le Moulin non
await hubRow(P.page,/Production par équipe/);o={cur:await P.page.evaluate(()=>({scope:((document.querySelector('#eq-app .pi-scope')||{}).textContent||''),open:[...document.querySelectorAll('#eq-app .pi-scope [data-act=opensite]')].map(b=>b.dataset.v)}))}; /* semaine en cours, aucun chantier ouvert sur ce PC */
await fake(P.page,'opensite','SRV_A',500);const opened=await until(P.page,()=>{const T=window.TRACE;return T.state.screen==='site'&&T.state.siteId==='SRV_A'&&T.sites.SRV_A&&Object.keys(T.state.lines||{}).sort().join()===(T.sites.SRV_A.lines||[]).map(l=>l.id).sort().join()?true:null;},null,20000);await W(P.page,1000);
/* par conduite (points SST exclus) : 2 soudures jeudi, 1 vendredi (+ son manchon par Marc), 1 à faire ; objectif de l'équipe A vendredi = les 2 dernières de chaque conduite
   (la moitié faite) ; ml attendus = même règle que l'écran (moitié des éléments voisins de chaque soudure faite) */
const nW=await P.page.evaluate(({h,m,F,JE})=>{const T=window.TRACE;const R={thu:0,fri:0,man:0,mlThu:0,mlFri:0,conduites:0};const ids=[];const half=e=>e&&+e.len>0?+e.len/2:0;Object.values(T.state.lines).forEach(l=>['A','R'].forEach(c=>{const C2=l.cond&&l.cond[c];if(!C2)return;R.conduites++;let k=0;C2.joints.forEach(j=>{if(j.sst)return;j.steps=j.steps||{};const ml=half(C2.els[j.idx])+half(C2.els[j.idx+1]);
    if(k<2){j.steps[1]={done:true,by:h,at:JE+'T10:0'+k+':00.000Z',photos:['p']};j.status='soudee';R.thu++;R.mlThu+=ml;}else if(k<3){j.steps[1]={done:true,by:h,at:F+'T10:0'+k+':00.000Z',photos:['p']};j.steps[3]={done:true,by:m,at:F+'T14:0'+k+':00.000Z',photos:['p'],type:'retracte'};j.status='manchonnee';R.fri++;R.man++;R.mlFri+=ml;ids.push(j.weldId);}else if(k<4)ids.push(j.weldId);k++;});}));
  T.sites.SRV_A.missions={[F]:[{id:'M_FICTIF',type:'soud',label:'Souder le tronçon fictif',h:14,team:'A',welds:ids,by:'Denis TESTCONDUC'}]};R.obj=ids.length;document.getElementById('btnHome').click();return R;},{h:SOUD.prenom+' '+SOUD.nom,m:MAN.prenom+' '+MAN.nom,F,JE});await W(P.page,600);
await hub(P.page);await hubRow(P.page,/Production par équipe/);await tapAct(P.page,'peweek','-1',600);
const prodRead=()=>P.page.evaluate(()=>{const t=document.getElementById('eq-app').textContent.replace(/\s+/g,' ');const rows=[...document.querySelectorAll('#eq-app .pi-prod ~ .pi-sites .pi-tab tr:not(.bar)')].map(tr=>[...tr.children].map(td=>td.textContent.replace(/\s+/g,' ').trim()));
  return {t,scope:(document.querySelector('#eq-app .pi-scope')||{}).textContent||'',rows,bars:[...document.querySelectorAll('#eq-app .pi-tab .pi-gl')].map(x=>x.textContent.replace(/\s+/g,' ').trim()),open:[...document.querySelectorAll('#eq-app .pi-scope [data-act=opensite]')].map(b=>b.dataset.v)};});
o=Object.assign(o,{opened,nW,sem:await prodRead()});await shot(P,'pi_c9_production_1366');
await tapAct(P.page,'pi','pm|jour',500);o.jour=await prodRead();o.jourChips=await P.page.evaluate(()=>[...document.querySelectorAll('#eq-app .pi-pm [data-act=pi][data-v^="pd|"]')].map(b=>b.dataset.v+(b.classList.contains('active')?'*':'')));
const pop=P.page.waitForEvent('popup',{timeout:15000}).catch(()=>null);await tapAct(P.page,'pi','print|',300);const pp=await pop;
o.print=pp?await pp.evaluate(()=>({title:document.title,h1:(document.querySelector('h1')||{}).textContent,logo:!!document.querySelector('.scrHead .logo'),txt:document.body.innerText.replace(/\s+/g,' ')})).catch(()=>null):null;
if(pp&&SHOTS){await pp.setViewportSize({width:900,height:1250});await pp.screenshot({path:SHOTS+'/pi_c9_impression_A4.png',fullPage:true}).catch(()=>{});}if(pp)await pp.close();
await tapAct(P.page,'pi','pm|sem',400);await P.page.setViewportSize({width:390,height:844});await W(P.page,500);await shot(P,'pi_c9_production_390','#eq-app .pi-sites .pi-site');await both(P,'c9 production');
await hub(P.page);await hubRow(P.page,/Planning de la semaine/);await P.page.setViewportSize({width:390,height:844});await W(P.page,400);await shot(P,'pi_c6_planning_carte_390','#eq-app .pi-site');await both(P,'c6 planning');
o.rowH=await minH(P.page,'#eq-app .pi-site .pi-row:not(.pi-head)');
await tapAct(P.page,'pi','edit|'+SOUD.email+'|SRV_A',400);await shot(P,'pi_c6_planning_modifier_390','#pi-panel');await both(P,'c6 panneau');o.edit=await P.page.evaluate(()=>((document.getElementById('pi-panel')||{}).textContent||'').replace(/\s+/g,' ').slice(0,600));await tapAct(P.page,'pi','close|',300);
const rowA=o.sem.rows.find(r=>/^Équipe A/.test(r[0]))||[],rowB=o.sem.rows.find(r=>/^Équipe B/.test(r[0]))||[];
console.log('c9) production :',J({edit:(o.edit||'').slice(0,90),cur:o.cur,opened:o.opened,nW:o.nW,scope:o.sem.scope.slice(0,160),open:o.sem.open,A:rowA,B:rowB,bars:o.sem.bars,jourChips:o.jourChips,jourA:(o.jour.rows.find(r=>/^Équipe A/.test(r[0]))||[]),print:o.print&&{title:o.print.title,h1:o.print.h1,logo:o.print.logo,txt:o.print.txt.slice(0,260)},rowH:o.rowH}));
const fr=n=>Number(n).toLocaleString('fr-FR');
const pcO=o.nW.obj?Math.round(o.nW.fri/o.nW.obj*100):0;
C.c6b=/^Modifier/.test(o.edit||'')&&/Retirer de ce chantier/.test(o.edit||''); /* toucher une ligne = ses jours sur ce chantier, le retirer */
C.c9=/✗ Chantier fictif des Tilleuls \(pas chargé\) · ✗ Chantier fictif du Moulin \(pas chargé\)/.test(o.cur.scope)&&o.cur.open.slice(0,2).join()==='SRV_A,SRV_B'&&o.opened&&o.nW.conduites===2&&o.nW.thu===4&&o.nW.fri===2&&o.nW.obj===4&&/✓ Chantier fictif des Tilleuls/.test(o.sem.scope)&&!/Moulin/.test(o.sem.scope)
  &&rowA[1]===String(o.nW.thu+o.nW.fri)&&rowA[2]==='0'&&o.nW.mlThu+o.nW.mlFri>0&&rowA[3]===fr(Math.round(o.nW.mlThu+o.nW.mlFri))&&rowA[4]==='80 h 00'&&rowB[1]==='0'&&rowB[2]===String(o.nW.man)&&rowB[4]==='39 h 45'&&o.sem.bars.some(b=>b.includes('🎯 objectif : '+o.nW.fri+' / '+o.nW.obj+' soudures · '+pcO+' % · 14 h estimées'))
  &&o.jourChips.includes('pd|'+F+'*')&&(o.jour.rows.find(r=>/^Équipe A/.test(r[0]))||[])[1]===String(o.nW.fri)&&(o.jour.rows.find(r=>/^Équipe A/.test(r[0]))||[])[3]===fr(Math.round(o.nW.mlFri))&&!!o.print&&/Production par équipe/.test(o.print.h1||'')&&o.print.logo&&/Chantiers comptés Chantier fictif des Tilleuls/i.test(o.print.txt)&&/Équipe A/.test(o.print.txt)&&/Hugo TESTSOUDEUR/.test(o.print.txt)&&o.rowH>=44;
await P.ctx.close();

// ── c5 : les gars voient l'état de leurs journées
P=await open(SOUD,{width:390,height:844},true);await home(P.page,'htEspace');
o={et:await P.page.evaluate(()=>[...document.querySelectorAll('#eq-app .pi-pts .eq-vrow')].map(r=>r.textContent.replace(/\s+/g,' ').trim()))};await shot(P,'pi_c5_gars_etats_390','#eq-app .pi-pts');await both(P,'c5 moi');
await tapAct(P.page,'sub','heures',500);await P.page.evaluate(()=>{const b=document.querySelector('#eq-app [data-act=pernav][data-v="-1"]');if(b)b.click();});await W(P.page,400);o.heures=await txt(P.page);
/* il pointe sa journée (lundi) : début, pause, reprise, fin → « envoyée pour validation » + étapes ; fin touchée par erreur → « Annuler la fin » (personne n'a validé) → fin */
await tapAct(P.page,'sub','moi',500);for(const k of ['start','pause','resume','end'])await tapAct(P.page,'pointer',k,350);
const card=()=>P.page.evaluate(()=>{const c=document.querySelector('#eq-app .ptc');return c?{t:c.textContent.replace(/\s+/g,' ').trim(),unend:!!c.querySelector('[data-act=ptunend]')}:null;});
o.fin1=await card();await tap(P.page,'#eq-app .ptc [data-act=ptunend]',500);o.reprise=await card();await tapAct(P.page,'pointer','end',600);o.fin2=await card();await W(P.page,1500);
const rHm=PTS[K(SOUD,TODAY)];o.srvLundi=rHm?rHm.events.map(e=>e.t).join():'';
await P.ctx.close();
P=await open(TUY,{width:390,height:844},true);o.theoN=(await P.page.evaluate(()=>[...document.querySelectorAll('#eq-app .ac-kt, #eq-app [data-act=notif]')].map(x=>x.textContent.replace(/\s+/g,' ').trim()))).filter(t=>/corrigé/.test(t));
await home(P.page,'htEspace');await tapAct(P.page,'sub','heures',500);await P.page.evaluate(()=>{const b=document.querySelector('#eq-app [data-act=pernav][data-v="-1"]');if(b)b.click();});await W(P.page,400);
await P.page.evaluate(k=>{const b=document.querySelector(`#eq-app [data-act=jour][data-v="${k}"]`);if(b)b.click();},K(TUY,F));await W(P.page,400);o.theoDet=await P.page.evaluate(()=>(document.querySelector('#eq-app .eq-detail')||{}).textContent||'');
console.log('c5) le gars voit :',J({hugo:o.et.slice(0,2),heures:/Validé par le conducteur/.test(o.heures),fin1:o.fin1,reprise:o.reprise&&o.reprise.t.slice(0,60),fin2:o.fin2&&o.fin2.unend,srvLundi:o.srvLundi,theoN:o.theoN,theoDet:o.theoDet.replace(/\s+/g,' ').slice(0,260)}));
C.c5=o.et.some(t=>/^ven\. 06\/11/.test(t)&&/✓ déclaré›✓ chef Chloé›✓ conducteur/.test(t))&&/Validé par le conducteur/.test(o.heures)
  &&!!o.fin1&&/Journée finie/.test(o.fin1.t)&&/envoyée pour validation/.test(o.fin1.t)&&/✓ déclaré›○ chef›○ conducteur/.test(o.fin1.t)&&o.fin1.unend&&!!o.reprise&&/Au travail/.test(o.reprise.t)&&!!o.fin2&&o.fin2.unend&&o.srvLundi==='start,pause,resume,end'&&o.theoN.some(t=>/corrigé/.test(t)&&/Chloé/.test(t))&&/✏️ pause 12:00 → 13:00 — Pause non pointée · par Chloé TESTCHEF/.test(o.theoDet)&&/✅ conducteur : Denis TESTCONDUC/.test(o.theoDet);
await P.ctx.close();

// ── c7 : Nina voit « Demain » dans Moi (Compagnon) et sur l'accueil
P=await open(INT,{width:390,height:844},true);
o={hero:await P.page.evaluate(()=>((document.querySelector('#eq-app .ac-hero .pi-demain')||{}).textContent||'').replace(/\s+/g,' ').trim())};await shot(P,'pi_c7_demain_accueil_390','#eq-app .ac-hero');
await home(P.page,'htEspace');o.moi=await P.page.evaluate(()=>((document.querySelector('#eq-app .card.pi-demain')||{}).textContent||'').replace(/\s+/g,' ').trim());await shot(P,'pi_c7_demain_moi_390','#eq-app .card.pi-demain');await both(P,'c7 moi');
console.log('c7) demain :',J(o));
C.c7=/^Demain · mar\. 10\/11 : 📍 Chantier fictif du Moulin/.test(o.hero)&&/^🗓️ ?Demain · mar\. 10\/11 : 📍 Chantier fictif du Moulin/.test(o.moi);
await P.ctx.close();

// ── c10 : le bureau (RH, PC) : production et pointages (2e niveau)
P=await open(BUR,{width:1366,height:900},false,{wide:true});await hub(P.page);
o={rows:await P.page.evaluate(()=>[...document.querySelectorAll('#eq-app .ac-row .tx > b')].map(b=>b.textContent))};
await hubRow(P.page,/Production par équipe/);o.prod=await P.page.evaluate(()=>({tab:!!document.querySelector('#eq-app .pi-prod'),scope:((document.querySelector('#eq-app .pi-scope')||{}).textContent||'')}));
await hubRow(P.page,/Pointages à valider/);o.val=((await txt(P.page)).match(/Pointages de l'équipe · \d+ à valider[^P]*/)||[''])[0].slice(0,80);
console.log('c10) bureau :',J(o));
C.c10=o.rows.includes('Production par équipe')&&o.rows.includes('Pointages à valider')&&o.prod.tab&&/✗ Chantier fictif des Tilleuls \(pas chargé\)/.test(o.prod.scope)&&/✗ Chantier fictif du Moulin \(pas chargé\)/.test(o.prod.scope)&&/· 0 à valider/.test(o.val);
await P.ctx.close();

// ── c12 : paliers ALLUMÉS — une personne Socle ne voit pas les nouveautés (Labo) : l'écran d'avant
SETTINGS.paliers={v:1,on:true,feat:{},people:{},extra:{}};
P=await open(COND,{width:1366,height:900},false,{wide:true});await hub(P.page);
o={rows:await P.page.evaluate(()=>[...document.querySelectorAll('#eq-app .ac-row .tx > b')].map(b=>b.textContent)),on:await P.page.evaluate(()=>window.TRACE.paliers&&window.TRACE.paliers.on&&window.TRACE.paliers.on())};
await hubRow(P.page,/Planning des équipes/);o.orga=await P.page.evaluate(()=>!!document.querySelector('#eq-app .eq-pltray')&&!document.querySelector('#eq-app [data-act=xgo][data-v=plan]'));
await hubRow(P.page,/Production par équipe/);o.prod=await P.page.evaluate(()=>({tab:!!document.querySelector('#eq-app .pi-prod'),old:document.querySelectorAll('#eq-app .eq-peteam').length}));
await P.ctx.close();
P=await open(INT,{width:390,height:844},true);await home(P.page,'htEspace');o.demain=await P.page.evaluate(()=>!!document.querySelector('#eq-app .pi-demain'));await P.ctx.close();
delete SETTINGS.paliers;
console.log('c12) paliers allumés :',J(o));
C.c12=o.on===true&&!o.rows.includes('Planning de la semaine')&&o.rows.includes('Planning des équipes')&&o.orga&&!o.prod.tab&&o.prod.old>=1&&!o.demain;

// ── c11 / c13
console.log('c11) débordements :',J(OVF));C.c11=!OVF.length;
console.log('c13) console / refus :',J({logs,refus:REFUS}));C.c13=!logs.length&&!REFUS.length;
console.log('RÉSULTATS',J(C));const bad=Object.keys(C).filter(k=>!C[k]);
console.log(bad.length?'RESULTAT: ECHEC '+bad.join(','):'RESULTAT: TOUT VERT');
await browser.close();process.exit(bad.length?1:0);
