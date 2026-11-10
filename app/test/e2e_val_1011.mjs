// e2e_val_1011.mjs — 10/11/2026 (Ethan : « simplifie la correction de pointage : début, pause, fin, pré-rempli avec le pointé, l'écart affiché ; celui qui n'a rien
// pointé mais était au planning apparaît "rien pointé, saisir ses heures" dans le même format ; un pointage validé reste corrigeable mais discret ; les à valider
// en couleur, les validés grisés ; tout le monde rangé par chantier, par équipe »). Décor, serveur simulé et personnages FICTIFS repris de e2e_pi_3110.
//  v1  cheffe (390), vendredi : un seul chantier (Tilleuls, chef de chantier dit), 4 personnes · 4 à traiter : Hugo, Théo, Marc en couleur (todo) et Lucas
//      « rien de pointé » + « Saisir ses heures » DANS le groupe du chantier ; jeudi : les 3 validés grisés (done) avec « ↺ Revoir », pas de « Tout valider »
//  v2  « ↺ Revoir » sur Hugo (jeudi, déjà validé) : formulaire pré-rempli 07:30 · 16:30 · 12:00 · 1 h, « pointé … » sous chaque champ ; fin → 17:00 : l'écart
//      « +30 min / pointé » s'affiche en direct ; enregistré : fin 17:00, trace « fin 17:00 au lieu de 16:30 », statut corrigé, pas de double validation
//  v3  vendredi : Lucas « Saisir ses heures » = même format (début · fin · pause · durée · motif, « rien de pointé ») ; saisi → sa ligne devient grisée (validée
//      par la cheffe) ; « Tout valider » → Hugo ; Théo corrigé avec la pause proposée (1 h) ; Marc (fin manquante) : fin saisie → corrigé
//  v4  conducteur (PC 1366), vendredi : les 4 lignes du chantier à valider (après la cheffe) en couleur, « Tout valider (4) » ; tout validé →
//      grisées, « ↺ Revoir » dispo ; il reste les 4 du jeudi
//  v5  téléphone 390 / 360 : aucun débordement, formulaire ouvert compris ; console propre, aucune écriture refusée
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

const rows=pg=>pg.evaluate(()=>[...document.querySelectorAll('#eq-app .eq-list > *')].map(el=>{if(el.classList.contains('eq-grp-h'))return {h:el.textContent.replace(/\s+/g,' ').trim()};
  return {cls:[...el.classList].filter(c=>c!=='eq-vrow').join(' '),t:(el.querySelector('.eq-t')||{}).textContent||'',s:(el.querySelector('.eq-s')||{}).textContent.replace(/\s+/g,' ').trim(),etat:(el.querySelector('.eq-etat')||{}).textContent||'',
    revoir:!!el.querySelector('[data-act=corr].ghost'),valider:!!el.querySelector('[data-act=valider]'),corriger:!![...el.querySelectorAll('[data-act=corr]')].find(b=>!b.classList.contains('ghost')),saisie:!!el.querySelector('[data-act=pi][data-v^="saisie|"]'),form:!!el.querySelector('.eq-corrform')};}));
const form=pg=>pg.evaluate(()=>{const g=k=>(document.getElementById('eq-c-'+k)||{}).value;return {h0:g('h0'),h1:g('h1'),p0:g('p0'),pd:g('pd'),m:g('m'),ecart:[...document.querySelectorAll('#eq-app .eq-corrform .eq-ecart')].map(e=>e.textContent.replace(/\s+/g,' ').trim())};});
const evs=x=>x.events.map(e=>e.t+'@'+e.at.slice(11)).join();

// ── v1 : la cheffe, vendredi puis jeudi
let P=await open(CHEF,{width:390,height:844},true);let o={};
await hub(P.page);await hubRow(P.page,/Pointages à valider/);
o.ven=await rows(P.page);o.venAll=await P.page.evaluate(()=>(document.querySelector('#eq-app [data-act=toutvalider]')||{}).textContent||'');
await shot(P,'val_v1_vendredi_390','#eq-app .card');
await tap(P.page,'#eq-app [data-act=valjour][aria-label="Jour précédent"]',500);o.jeuActive=await P.page.evaluate(()=>(document.querySelector('#eq-app [data-act=valjour].active')||{dataset:{}}).dataset.v);o.jeu=await rows(P.page); /* ◀ : jeudi, déjà validé, n'a pas de chip à lui */o.jeuAll=await P.page.evaluate(()=>!!document.querySelector('#eq-app [data-act=toutvalider]'));
await shot(P,'val_v1_jeudi_390','#eq-app .card');
console.log('v1) cheffe :',J(o));
const r=(L,n)=>L.find(x=>x.t&&x.t.startsWith(n))||{};
C.v1=o.ven.length===5&&/Tilleuls · chef de chantier : Chloé TESTCHEF · 4 personnes · 4 à traiter/.test(o.ven[0].h)
  &&['Hugo','Théo','Marc'].every(n=>r(o.ven,n).cls==='todo')&&r(o.ven,'Lucas').cls==='todo'&&/rien de pointé/.test(r(o.ven,'Lucas').s)&&r(o.ven,'Lucas').etat==='Pas de pointage'&&r(o.ven,'Lucas').saisie
  &&r(o.ven,'Hugo').valider&&r(o.ven,'Hugo').corriger&&!r(o.ven,'Marc').valider&&r(o.ven,'Marc').corriger&&/Tout valider \(1\)/.test(o.venAll)
  &&o.jeuActive===JE&&o.jeu.some(x=>/Tilleuls · chef de chantier : Chloé TESTCHEF · 3 personnes · rien à faire/.test(x.h||''))&&['Hugo','Théo','Marc'].every(n=>r(o.jeu,n).cls==='done'&&r(o.jeu,n).revoir&&!r(o.jeu,n).valider)&&!o.jeuAll
  &&o.jeu.some(x=>/sans chef/.test(x.h||''))&&r(o.jeu,'Lucas').cls===''&&!r(o.jeu,'Lucas').revoir; /* Lucas jeudi (chantier sans chef) : attend le conducteur, ni en couleur ni grisé */

// ── v2 : « ↺ Revoir » sur Hugo (jeudi) : pré-rempli, écart en direct, enregistré
o={};await tapAct(P.page,'corr',K(SOUD,JE),400);o.f0=await form(P.page);
await P.page.fill('#eq-c-h1','17:00');await W(P.page,200);o.f1=await form(P.page);await shot(P,'val_v2_revoir_390','#eq-app .eq-vrow.done, #eq-app .eq-corrform');
o.rowOpen=(await rows(P.page)).find(x=>x.form);
await tap(P.page,'#eq-app [data-act=corrok]',900);const rH=PTS[K(SOUD,JE)];o.hugo={ev:evs(rH),st:rH.status,corr:rH.corr,val:rH.val.map(v=>v.by)};o.after=(await rows(P.page));
console.log('v2) revoir :',J(o));
C.v2=o.f0.h0==='07:30'&&o.f0.h1==='16:30'&&o.f0.p0==='12:00'&&o.f0.pd==='60'&&o.f0.ecart.join('|')==='pointé 07:30|pointé 16:30|pointé 12:00|pointé 1 h 00'&&o.f1.ecart[1]==='pointé 16:30 · +30 min / pointé'&&!!o.rowOpen&&o.rowOpen.cls==='done'
  &&o.hugo.ev==='start@07:30,pause@12:00,resume@13:00,end@17:00'&&o.hugo.st==='corrige'&&o.hugo.corr.t==='jour'&&o.hugo.corr.chg.join()==='fin 17:00 au lieu de 16:30'&&o.hugo.corr.avant.h1==='16:30'&&o.hugo.corr.apres.h1==='17:00'&&o.hugo.corr.by===CHEF.email&&o.hugo.val.join()===CHEF.email
  &&r(o.after,'Hugo').cls==='done'&&/corrigé : fin 17:00 au lieu de 16:30/.test(r(o.after,'Hugo').s+' '+(await txt(P.page)));

// ── v3 : vendredi — Lucas saisi (même format), Tout valider, Théo (pause proposée), Marc (fin manquante)
o={};await tapAct(P.page,'valjour',F,500);
await tapAct(P.page,'pi','saisie|'+K(NEUF,F),400);o.sf=await P.page.evaluate(()=>({cls:(document.querySelector('#eq-app .pi-form')||{}).className||'',ids:['h0','h1','p0','pd','m'].map(k=>!!document.getElementById('pi-s-'+k)),ecart:[...document.querySelectorAll('#eq-app .pi-form .eq-ecart')].map(e=>e.textContent.trim()),inTodo:!!document.querySelector('#eq-app .eq-vrow.todo .pi-form')}));
await both(P,'v3 saisie');await shot(P,'val_v3_saisir_390','#eq-app .eq-vrow.todo .pi-form');
await tap(P.page,'#eq-app [data-act=pi][data-v^="saisieok|"]',1200);await W(P.page,800);o.l1=await rows(P.page);
await tap(P.page,'#eq-app [data-act=toutvalider]',900);
await tapAct(P.page,'corr',K(TUY,F),400);o.tf=await form(P.page);await both(P,'v3 corr');await tap(P.page,'#eq-app [data-act=corrok]',900);
await tapAct(P.page,'corr',K(MAN,F),400);o.mf=await form(P.page);await P.page.fill('#eq-c-h1','16:15');await W(P.page,200);o.mf1=(await form(P.page)).ecart[1];await tap(P.page,'#eq-app [data-act=corrok]',900);
o.l2=await rows(P.page);o.head=(await txt(P.page)).match(/Pointages de l'équipe · \d+ à valider/)||[''];
const rL=PTS[K(NEUF,F)],rT=PTS[K(TUY,F)],rM=PTS[K(MAN,F)];o.pts={lucas:rL&&{ev:evs(rL),st:rL.status,t:rL.corr&&rL.corr.t,val:rL.val.map(v=>v.by)},theo:{ev:evs(rT),chg:rT.corr&&rT.corr.chg,val:rT.val.map(v=>v.by)},marc:{ev:evs(rM),chg:rM.corr&&rM.corr.chg,val:rM.val.map(v=>v.by)},hugo:PTS[K(SOUD,F)].val.map(v=>v.by)};
await shot(P,'val_v3_vendredi_fait_390','#eq-app .card');
console.log('v3) vendredi :',J(o));
C.v3=/eq-corrform/.test(o.sf.cls)&&o.sf.ids.every(Boolean)&&o.sf.ecart.join('|')==='rien de pointé|rien de pointé|rien de pointé|pas de pause pointée'&&o.sf.inTodo
  &&r(o.l1,'Lucas').cls==='done'&&r(o.l1,'Lucas').revoir&&o.l1.findIndex(x=>x.t&&x.t.startsWith('Lucas'))>o.l1.findIndex(x=>x.t&&x.t.startsWith('Marc')) /* saisi → validé par la cheffe : grisé, en bas du groupe */
  &&o.tf.pd==='60'&&o.tf.ecart[3]==='pas de pause pointée'&&o.mf.h1==='16:30'&&o.mf.ecart[1]==='rien de pointé'&&o.mf1==='rien de pointé'
  &&!!o.pts.lucas&&o.pts.lucas.ev==='start@07:30,pause@12:00,resume@13:00,end@16:30'&&o.pts.lucas.t==='saisie'&&o.pts.lucas.val.join()===CHEF.email
  &&o.pts.theo.ev==='start@07:30,pause@12:00,resume@13:00,end@16:30'&&o.pts.theo.chg.join()==='pause 12:00 → 13:00 (non pointée)'&&o.pts.marc.ev==='start@07:30,pause@12:00,resume@13:00,end@16:15'&&o.pts.marc.chg.join()==='fin 16:15 (manquante)'&&o.pts.hugo.join()===CHEF.email
  &&['Hugo','Théo','Marc','Lucas'].every(n=>r(o.l2,n).cls==='done'&&r(o.l2,n).revoir)&&/4 personnes · rien à faire/.test(o.l2[0].h||'')&&o.head[0]==='Pointages de l\'équipe · 0 à valider';
await P.ctx.close();

// ── v4 : le conducteur (PC 1366), après la cheffe
P=await open(COND,{width:1366,height:900},false,{wide:true});o={};
await hub(P.page);await hubRow(P.page,/Pointages à valider/);await tapAct(P.page,'valjour',F,500);
o.v=await rows(P.page);o.all=await P.page.evaluate(()=>(document.querySelector('#eq-app [data-act=toutvalider]')||{}).textContent||'');await shot(P,'val_v4_conducteur_1366','#eq-app .card');
await tap(P.page,'#eq-app [data-act=toutvalider]',900);o.v2=await rows(P.page); /* les 4 lignes sont complètes (Marc : fin saisie par la cheffe, Lucas : journée saisie) */o.head=(await txt(P.page)).match(/Pointages de l'équipe · \d+ à valider/)||[''];
o.vals=[SOUD,TUY,MAN,NEUF].map(u=>PTS[K(u,F)].val.map(v=>v.by).join());
console.log('v4) conducteur :',J(o));
C.v4=['Hugo','Théo','Marc','Lucas'].every(n=>r(o.v,n).cls==='todo')&&/Tout valider \(4\)/.test(o.all)&&/4 personnes · 4 à traiter/.test(o.v[0].h||'')
  &&['Hugo','Théo','Marc','Lucas'].every(n=>r(o.v2,n).cls==='done'&&r(o.v2,n).revoir&&!r(o.v2,n).valider)&&o.head[0]==='Pointages de l\'équipe · 4 à valider' /* il reste le jeudi */&&o.vals.every(v=>v===CHEF.email+','+COND.email);
await P.ctx.close();

// ── v5
console.log('v5) débordements :',J(OVF),'console / refus :',J({logs,refus:REFUS}));C.v5=!OVF.length&&!logs.length&&!REFUS.length;
console.log('RÉSULTATS',J(C));const bad=Object.keys(C).filter(k=>!C[k]);
console.log(bad.length?'RESULTAT: ECHEC '+bad.join(','):'RESULTAT: TOUT VERT');
await browser.close();process.exit(bad.length?1:0);
