// e2e_trajet_1911.mjs — 19/11/2026 soir, Ethan : « [deux chantiers dans la journée] oui ça arrive souvent ; quand tu as commencé la journée, un clic pour commencer une pause
//  ou un clic pour commencer un trajet, avec prise de position au début du trajet et à la fin ; quand fin de trajet il repasse sur heures chantier, et réapparaissent un bouton
//  pause et début de trajet éventuel ou fin de journée ; possible de faire une pause pendant le trajet aussi » (décor, serveur simulé et personnages FICTIFS de e2e_pt_1911).
//  t1  le chef (390), vendredi : chaque ligne montre les trajets de la journée (heures, de → vers, pause en route, distance entre les 2 positions) et la répartition « Par chantier »
//      (travail là où il est fait, trajet sur le chantier d'arrivée) ; ancien geste sans chantier écrit + 2 chantiers au planning → le suivant du planning ;
//      arrivée sans chantier → alerte « chantier d'arrivée du trajet à préciser », tout reste sur le chantier de départ
//  t2  correction : le chef donne le chantier d'arrivée → trace, alerte levée, répartition refaite
//  t3  correction : ajouter un trajet non pointé (refus s'il coupe la pause, si l'arrivée est avant le départ), puis le retirer
//  t4  les heures RÉELLES ventilées (celles des débours) : par chantier, somme = total de la journée ; l'affaire du 2e chantier reçoit ses heures, pas celles du 1er
//  g1  le gars (390), journée commencée : « Pause », « 🚐 Début de trajet », « ■ Fin de journée » ; 0,9 s sans geste après un geste (double appui)
//  g2  « Début de trajet » : un seul événement même en double appui, position relevée, « En route », « 📍 Fin de trajet » + « Pause », chantier d'arrivée proposé (pas imposé)
//  g3  pause PENDANT le trajet → « ▶ Reprendre la route » → de nouveau en route
//  g4  le chantier d'arrivée choisi en route ; g5 « Fin de trajet » : position relevée, il repasse « Au travail » sur le chantier d'arrivée, les 3 boutons reviennent
//  g6  « Pas le bon chantier ? » → il le change après coup ; g7 trajet sans chantier choisi → la carte le demande à l'arrivée, sans bloquer ; g8 fin de journée, tout accepté par le serveur
//  g9  deux chantiers au planning : celui du planning est déjà choisi au départ, un geste pour partir, un geste pour arriver
//  t5  téléphone 390 / 360 : rien ne déborde ; console propre, aucune écriture refusée
import { chromium } from 'playwright';
import fs from 'fs';
const BASE=process.env.BASE||'http://127.0.0.1:8832';const SHOTS=process.env.SHOTS||'';if(SHOTS)fs.mkdirSync(SHOTS,{recursive:true});
const SB='https://pghftlepduvfazbiavhq.supabase.co';
const b64u=o=>Buffer.from(JSON.stringify(o)).toString('base64').replace(/=+$/,'').replace(/\+/g,'-').replace(/\//g,'_');
const mk=(n,prenom,nom,poste,role)=>({id:'0000000'+n+'-aaaa-4aaa-8aaa-00000000000'+n,email:(prenom+'.'+nom).toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g,'')+'@exemple.fr',prenom,nom,poste,role,admin:false});
const SOUD=mk(1,'Hugo','TESTSOUDEUR','soudeur','soudeur'),TUY=mk(2,'Théo','TESTTUYAU','tuyauteur','tuyauteur'),MAN=mk(3,'Marc','TESTMANCHON','manchonneur','manchonneur'),
  NEUF=mk(4,'Lucas','TESTNOUVEAU','soudeur','soudeur'),CHEF=mk(5,'Chloé','TESTCHEF','chef','chef'),COND=mk(6,'Denis','TESTCONDUC','conducteur','chef'),BUR=mk(7,'Béa','TESTBUREAU','assist_rh','bureau'),INT=mk(8,'Nina','TESTINTERIM','soudeur','soudeur'),RESP=mk(9,'Rémi','TESTRESP','resp_exploitation','bureau');
const USERS=[SOUD,TUY,MAN,NEUF,CHEF,COND,BUR,INT,RESP];
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
async function mkCtx(U,viewport,mobile){const ctx=await browser.newContext({viewport,isMobile:!!mobile,hasTouch:!!mobile,deviceScaleFactor:1,geolocation:{latitude:48.1,longitude:-1.6},permissions:['geolocation']});
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

const S45=['2026-11-02','2026-11-03','2026-11-04','2026-11-05','2026-11-06'],F='2026-11-06',LU=TODAY;
const wk=(d,s)=>Object.fromEntries(d.map(x=>[x,[s]]));
PLAN['2026-W45']={week:'2026-W45',data:{aff:{[SOUD.email]:wk(S45,'SRV_A'),[TUY.email]:wk(S45,'SRV_A'),[MAN.email]:Object.assign(wk(S45,'SRV_A'),{[F]:['SRV_A','SRV_B']}),[CHEF.email]:wk(S45,'SRV_A'),[INT.email]:{[F]:['SRV_A']}}},updated_at:'2026-10-30T08:00:00Z'};
PLAN['2026-W46']={week:'2026-W46',data:{aff:{[SOUD.email]:{[LU]:['SRV_A']},[TUY.email]:{[LU]:['SRV_A','SRV_B']},[CHEF.email]:{[LU]:['SRV_A']}}},updated_at:'2026-11-06T18:00:00Z'}; /* lundi : Hugo sur les Tilleuls ; Théo sur DEUX chantiers */
const ev=(d,a)=>a.map(([t,h,x])=>Object.assign({t,at:d+'T'+h},x||{}));
const put=(u,d,events,extra)=>{PTS[u.email+'|'+d]=Object.assign({p:u.email,d,site:'SRV_A',events,status:'declare',val:[],corr:null,updated_at:'2026-11-06T17:00:00Z'},extra||{});};
const J8=[['start','07:30'],['pause','12:00'],['resume','13:00'],['end','16:30']];
put(TUY,F,ev(F,[['start','07:30'],['leave','10:00',{vers:'SRV_C',pos:[48.1,-1.6]}],['arrive','10:45',{site:'SRV_C',pos:[48.2,-1.5]}],['pause','12:00'],['resume','13:00'],['end','16:30']])); /* Théo : Tilleuls 2 h 30, trajet 45 min, puis « sans chef » */
put(SOUD,F,ev(F,[['start','07:30'],['leave','11:30'],['pause','12:00'],['resume','12:45'],['arrive','13:15'],['end','16:30']]));  /* Hugo : pause EN ROUTE, arrivée sans chantier (1 seul chantier au planning) */
put(MAN,F,ev(F,[['start','07:30'],['leave','10:00'],['arrive','10:30'],['pause','12:00'],['resume','13:00'],['end','16:30']]));   /* Marc : ancien geste (rien d'écrit), 2 chantiers au planning → le suivant */
put(INT,F,ev(F,J8));                                                                                                           /* Nina : journée simple (trajet à ajouter par le chef) */
REG['affaire|26-T01']={kind:'affaire',id:'26-T01',data:{num:'26-T01',nom:'Affaire fictive du 2e chantier',client:'RÉGIE FICTIVE',ville:'Troisville',etat:'en_cours',montant:1000,sites:['SRV_C'],at:'2026-10-01T09:00:00Z',by:'test'},updated_at:'2026-10-01T09:00:00Z'};
REG['affaire|26-T02']={kind:'affaire',id:'26-T02',data:{num:'26-T02',nom:'Affaire fictive du 1er chantier',client:'RÉGIE FICTIVE',ville:'Villefictive',etat:'en_cours',montant:1000,sites:['SRV_A'],at:'2026-10-01T09:00:00Z',by:'test'},updated_at:'2026-10-01T09:00:00Z'};
const K=(u,d)=>u.email+'|'+d;
const rows=pg=>pg.evaluate(()=>[...document.querySelectorAll('#eq-app .eq-list > *')].map(el=>{if(el.classList.contains('eq-grp-h'))return {h:el.textContent.replace(/\s+/g,' ').trim()};const T=s=>(el.querySelector(s)||{}).textContent||'';const one=s=>T(s).replace(/\s+/g,' ').trim();
  return {cls:[...el.classList].filter(c=>c!=='eq-vrow').join(' '),t:T('.eq-t'),s:one('.eq-s'),trj:one('.pt-trj'),vent:one('.pt-vent'),ano:[...el.querySelectorAll('.pi-ano span')].map(x=>x.textContent.replace(/\s+/g,' ').trim())};}));
const r=(L,n)=>L.find(x=>x.t&&x.t.startsWith(n))||{};
const evs=x=>x.events.map(e=>e.t+'@'+e.at.slice(11)+(e.vers?'>'+e.vers:'')+(e.site?'='+e.site:'')+(e.t==='route'?(e.non?':non':':'+e.min):'')).join();
const evn=x=>evs(x).replace(/@\d\d:\d\d/g,'');
const toast=pg=>pg.evaluate(()=>(document.querySelector('.toast,#toast,.msg')||{}).textContent||'');
let o={};

// ── t1 : le chef, vendredi — trajets et répartition par chantier sur chaque ligne
let P=await open(CHEF,{width:390,height:844},true);
await hub(P.page);await hubRow(P.page,/Pointages à valider/);await tapAct(P.page,'valmode','jour',400);await tapAct(P.page,'valjour',F,600);
{const L=await rows(P.page);o={theo:r(L,'Théo'),hugo:r(L,'Hugo'),marc:r(L,'Marc'),nina:r(L,'Nina')};}await both(P,'t1 lignes');await shot(P,'tj_t1_chef_390');
console.log('t1) le chef, vendredi :',J(o));
C.t1=/7 h 30 → 16 h 30 · 8 h 00 · pause 1 h 00 · inter 0 h 45/.test(o.theo.s)&&/^🚐 10 h 00 → 10 h 45 · 0 h 45 · Chantier fictif des Tilleuls → Chantier fictif sans chef · ≈ \d+ km 📍$/.test(o.theo.trj)
  &&o.theo.vent==='Par chantier : Chantier fictif des Tilleuls 2 h 30 · Chantier fictif sans chef 5 h 30 (dont trajet 0 h 45)'&&!o.theo.ano.some(a=>/préciser/.test(a))
  &&/8 h 15 · pause 0 h 45 · inter 1 h 00/.test(o.hugo.s)&&o.hugo.trj==='🚐 11 h 30 → 13 h 15 · 1 h 00 · Chantier fictif des Tilleuls → chantier à préciser · pause 0 h 45'&&o.hugo.vent===''&&o.hugo.ano.some(a=>/chantier d'arrivée du trajet à préciser/.test(a))
  &&/8 h 00 · pause 1 h 00 · inter 0 h 30/.test(o.marc.s)&&o.marc.trj==='🚐 10 h 00 → 10 h 30 · 0 h 30 · Chantier fictif des Tilleuls → Chantier fictif du Moulin'&&o.marc.vent==='Par chantier : Chantier fictif des Tilleuls 2 h 30 · Chantier fictif du Moulin 5 h 30 (dont trajet 0 h 30)'&&!o.marc.ano.some(a=>/préciser/.test(a))
  &&o.nina.trj===''&&o.nina.vent==='';

// ── t4 (avant correction) : les heures réelles ventilées, celles que lisent les débours
o=await P.page.evaluate(([F,eT,eH,eM])=>{const E=window.TRACE.espace,L=E.state().pointages,h=e=>{const x=L.find(p=>p.p===e&&p.d===F);const R=E.heures(x);return {h:R.h,par:R.parSite.map(z=>z.site+':'+z.h).join()};};
  const D=window.TRACE.debours;const rw=n=>D?(D.heures(n)||[]).filter(z=>z.d===F).map(z=>z.p.split('.')[0]+':'+z.site+':'+z.h).sort().join():'pas de module';return {theo:h(eT),hugo:h(eH),marc:h(eM),affC:rw('26-T01'),affA:rw('26-T02')};},[F,TUY.email,SOUD.email,MAN.email]);
console.log('t4) heures réelles ventilées :',J(o));
C.t4=o.theo.h===8&&o.theo.par==='SRV_A:2.5,SRV_C:5.5'&&o.hugo.h===8.25&&o.hugo.par==='SRV_A:8.25'&&o.marc.h===8&&o.marc.par==='SRV_A:2.5,SRV_B:5.5'
  &&o.affC==='theo:SRV_C:5.5'&&o.affA==='hugo:SRV_A:8.25,marc:SRV_A:2.5,nina:SRV_A:8,theo:SRV_A:2.5';

// ── t2 : le chef donne le chantier d'arrivée d'Hugo
o={};await tapAct(P.page,'corr',K(SOUD,F),500);
o.f=await P.page.evaluate(()=>{const g=i=>(document.getElementById(i)||{}).value;return {a:g('eq-c-t0a'),b:g('eq-c-t0b'),s:g('eq-c-t0s'),x:!!document.getElementById('eq-c-t0x'),add:!!document.getElementById('eq-c-t1a'),titre:(document.querySelector('.eq-corrform .pt-ctj')||{}).textContent||'',motifs:[...document.getElementById('eq-c-m').options].map(x=>x.textContent)};});
await both(P,'t2 correction avec trajet');await shot(P,'tj_t2_correction_390','#eq-app .eq-corrform');
await P.page.selectOption('#eq-c-t0s','SRV_B');await P.page.selectOption('#eq-c-m','Trajet dans la journée');await tap(P.page,'#eq-app [data-act=corrok]',1000);
let rH=PTS[K(SOUD,F)];o.c={ev:evs(rH),chg:rH.corr&&rH.corr.chg,st:rH.status,motif:rH.corr&&rH.corr.motif};await tapAct(P.page,'valjour',F,500);o.hugo=r(await rows(P.page),'Hugo');
console.log('t2) chantier d\'arrivée donné par le chef :',J(o));
C.t2=o.f.a==='11:30'&&o.f.b==='13:15'&&o.f.s===''&&o.f.x&&o.f.add&&/Trajet dans la journée/.test(o.f.titre)&&o.f.motifs.includes('Trajet dans la journée')
  &&o.c.ev==='start@07:30,leave@11:30>SRV_B,pause@12:00,resume@12:45,arrive@13:15=SRV_B,end@16:30'&&J(o.c.chg)===J(['trajet 11:30 → 13:15 vers Chantier fictif du Moulin au lieu de 11:30 → 13:15 (chantier à préciser)'])&&o.c.st==='corrige'&&o.c.motif==='Trajet dans la journée'
  &&o.hugo.vent==='Par chantier : Chantier fictif des Tilleuls 4 h 00 · Chantier fictif du Moulin 4 h 15 (dont trajet 1 h 00)'&&!o.hugo.ano.some(a=>/préciser/.test(a));

// ── t3 : ajouter un trajet non pointé à Nina (refus : il coupe la pause ; arrivée avant le départ), puis le retirer
o={};const ajout=async(a,b,s)=>{await P.page.evaluate(()=>{const d=document.querySelector('#eq-app .eq-corrform details.pt-ctadd');if(d)d.open=true;});await W(P.page,150);await P.page.fill('#eq-c-t0a',a);await P.page.fill('#eq-c-t0b',b);await P.page.selectOption('#eq-c-t0s',s);await tap(P.page,'#eq-app [data-act=corrok]',900);return toast(P.page);};
await tapAct(P.page,'corr',K(INT,F),500);o.vide=await P.page.evaluate(()=>({n:document.querySelectorAll('#eq-app .eq-corrform [id^="eq-c-t"]').length,titre:!!document.querySelector('.eq-corrform .pt-ctj'),ouvert:(document.querySelector('.eq-corrform details.pt-ctadd')||{}).open}));
o.m1=await ajout('12:30','13:30','SRV_B');o.ev1=evs(PTS[K(INT,F)]);o.m2=await ajout('14:30','14:00','SRV_B');o.ev2=evs(PTS[K(INT,F)]);await both(P,'t3 ajout de trajet');
o.m3=await ajout('14:00','14:30','SRV_B');let rN=PTS[K(INT,F)];o.c={ev:evs(rN),chg:rN.corr&&rN.corr.chg,by:rN.events.filter(e=>e.by).map(e=>e.t+':'+e.by.split('.')[0]).join()};await tapAct(P.page,'valjour',F,500);o.nina=r(await rows(P.page),'Nina');
await tapAct(P.page,'corr',K(INT,F),500);await P.page.check('#eq-c-t0x');await tap(P.page,'#eq-app [data-act=corrok]',1000);rN=PTS[K(INT,F)];o.r={ev:evs(rN),chg:rN.corr&&rN.corr.chg,hist:((rN.corr||{}).hist||[]).length};await tapAct(P.page,'valjour',F,500);o.nina2=r(await rows(P.page),'Nina');
console.log('t3) trajet ajouté puis retiré par le chef :',J(o));
C.t3=o.vide.n===3&&!o.vide.titre&&o.vide.ouvert===false&&/La pause et un trajet se chevauchent/.test(o.m1)&&o.ev1==='start@07:30,pause@12:00,resume@13:00,end@16:30'&&/l'arrivée doit être après le départ/.test(o.m2)&&o.ev2===o.ev1
  &&o.c.ev==='start@07:30,pause@12:00,resume@13:00,leave@14:00>SRV_B,arrive@14:30=SRV_B,end@16:30'&&J(o.c.chg)===J(['trajet 14:00 → 14:30 vers Chantier fictif du Moulin (ajouté)'])&&o.c.by==='leave:chloe,arrive:chloe'
  &&o.nina.trj==='🚐 14 h 00 → 14 h 30 · 0 h 30 · Chantier fictif des Tilleuls → Chantier fictif du Moulin'&&o.nina.vent==='Par chantier : Chantier fictif des Tilleuls 5 h 30 · Chantier fictif du Moulin 2 h 30 (dont trajet 0 h 30)'
  &&o.r.ev==='start@07:30,pause@12:00,resume@13:00,end@16:30'&&J(o.r.chg)===J(['trajet 14:00 → 14:30 retiré'])&&o.r.hist===1&&o.nina2.trj===''&&o.nina2.vent==='';
await P.ctx.close();

// ── g1 → g8 : le gars (Hugo, lundi, un seul chantier au planning)
P=await open(SOUD,{width:390,height:844},true);o={};
const carte=()=>P.page.evaluate(()=>{const c=document.querySelector('#eq-app .ptc');return c?{cls:[...c.classList].filter(x=>/^pt-/.test(x)&&x!=='pt-lock').join(),kick:(c.querySelector('.ac-kick')||{}).textContent||'',big:(c.querySelector('.ptbig')||{}).textContent||'',sub:((c.querySelector('.ptbig+.eq-s')||{}).textContent||'').replace(/\s+/g,' '),btn:[...c.querySelectorAll('button')].map(b=>b.textContent.replace(/\s+/g,' ').trim()),sel:[...c.querySelectorAll('select')].map(s=>s.id+'='+s.value),txt:c.textContent.replace(/\s+/g,' ')}:null;});
const pt=k=>tap(P.page,'#eq-app .ptc [data-act=pointer][data-v='+k+']',900);const moi=()=>PTS[K(SOUD,LU)]||{events:[]};
await home(P.page,'htHome');await W(P.page,600);
await P.page.evaluate(()=>document.querySelector('#eq-app .ptc [data-act=pointer][data-v=start]').click());await W(P.page,120);
o.verrou=await P.page.evaluate(()=>{const c=document.querySelector('#eq-app .ptc'),b=c.querySelector('[data-act=pointer]');return {cls:c.hasAttribute('data-ptlock'),pe:getComputedStyle(b).pointerEvents};});await W(P.page,1100);
o.libre=await P.page.evaluate(()=>{const c=document.querySelector('#eq-app .ptc'),b=c.querySelector('[data-act=pointer]');return {cls:c.hasAttribute('data-ptlock'),pe:getComputedStyle(b).pointerEvents};});o.c1=await carte();await both(P,'g1 au travail');await shot(P,'tj_g1_travail_390','#eq-app .ptc');
console.log('g1) journée commencée :',J(o));
C.g1=o.verrou.cls&&o.verrou.pe==='none'&&!o.libre.cls&&o.libre.pe!=='none'&&o.c1.cls==='pt-on'&&o.c1.btn.slice(0,3).join('|')==='Pause|🚐 Début de trajet|■ Fin de journée'&&/Villefictive/.test(o.c1.kick);

o={};await P.page.evaluate(()=>{document.querySelector('#eq-app .ptc [data-act=pointer][data-v=leave]').click();const b=document.createElement('button');b.dataset.act='pointer';b.dataset.v='leave';b.style.display='none';document.querySelector('#eq-app').append(b);b.click();b.remove();});await W(P.page,1400);
o.ev=evn(moi());o.pos=(moi().events.find(e=>e.t==='leave')||{}).pos;o.c=await carte();o.opts=await P.page.evaluate(()=>[...document.getElementById('pt-dest').options].map(x=>x.textContent));await both(P,'g2 en route');await shot(P,'tj_g2_en_route_390','#eq-app .ptc');
console.log('g2) début de trajet :',J(o));
C.g2=o.ev==='start,leave'&&J(o.pos)===J([48.1,-1.6])&&o.c.cls==='pt-inter'&&/^En route/.test(o.c.big)&&o.c.btn.slice(0,2).join('|')==='📍 Fin de trajet|Pause'&&o.c.sel.join()==='pt-dest='&&/trajet commencé à .* le trajet compte dans les heures/.test(o.c.sub)
  &&/Tu vas sur quel chantier \? Choisis-le maintenant ou à l'arrivée/.test(o.c.txt)&&o.opts[0]==='— choisir le chantier —'&&o.opts[o.opts.length-1]==='↩ retour sur Chantier fictif des Tilleuls'&&o.opts.includes('Chantier fictif sans chef');

o={};await pt('pause');o.c1=await carte();o.ev1=evn(moi());await pt('resume');o.c2=await carte();o.ev2=evn(moi());
console.log('g3) pause pendant le trajet :',J(o));
C.g3=o.c1.cls==='pt-pause'&&/^En pause/.test(o.c1.big)&&/pause pendant le trajet depuis/.test(o.c1.sub)&&o.c1.btn.slice(0,2).join('|')==='▶ Reprendre la route|■ Fin de journée'&&o.c1.sel.join()==='pt-dest='&&o.ev1==='start,leave,pause'&&o.c2.cls==='pt-inter'&&/^En route/.test(o.c2.big)&&o.ev2==='start,leave,pause,resume'&&o.c2.btn.slice(0,2).join('|')==='📍 Fin de trajet|Pause';

o={};await P.page.selectOption('#pt-dest','SRV_C');await W(P.page,900);o.ev=evn(moi());o.c=await carte();
console.log('g4) chantier d\'arrivée choisi en route :',J(o));
C.g4=o.ev==='start,leave>SRV_C,pause,resume'&&o.c.sel.join()==='pt-dest=SRV_C'&&/vers Chantier fictif sans chef/.test(o.c.sub)&&/Troisville/.test(o.c.kick)&&/Tu peux encore le changer/.test(o.c.txt);

o={};await P.ctx.setGeolocation({latitude:48.2,longitude:-1.5});await pt('arrive');await W(P.page,700);o.ev=evn(moi());o.pos=(moi().events.find(e=>e.t==='arrive')||{}).pos;o.c=await carte();await both(P,'g5 arrivé');
console.log('g5) fin de trajet :',J(o));
C.g5=o.ev==='start,leave>SRV_C,pause,resume,arrive=SRV_C'&&J(o.pos)===J([48.2,-1.5])&&o.c.cls==='pt-on'&&/^Au travail/.test(o.c.big)&&/Troisville/.test(o.c.kick)&&o.c.btn.slice(0,3).join('|')==='Pause|🚐 Début de trajet|■ Fin de journée'&&o.c.btn.some(b=>/Pas le bon chantier \? Changer le chantier d'arrivée/.test(b))&&o.c.sel.length===0;

o={};await tap(P.page,'#eq-app .ptc [data-act=ptarr]',400);o.c1=await carte();await P.page.selectOption('#pt-arr','SRV_B');await W(P.page,900);o.ev=evn(moi());o.c2=await carte();
console.log('g6) chantier d\'arrivée changé après coup :',J(o));
C.g6=o.c1.sel.join()==='pt-arr=SRV_C'&&/Tu es arrivé sur quel chantier/.test(o.c1.txt)&&o.ev==='start,leave>SRV_B,pause,resume,arrive=SRV_B'&&/Autreville/.test(o.c2.kick)&&o.c2.sel.length===0;

o={};await pt('leave');o.c1=await carte();o.ev1=evn(moi());await P.page.selectOption('#pt-dest','');await W(P.page,800);o.ev2=evn(moi());o.c2=await carte();await pt('arrive');o.ev3=evn(moi());o.c3=await carte();await both(P,'g7 arrivée sans chantier');await shot(P,'tj_g7_arrivee_sans_chantier_390','#eq-app .ptc');
await P.page.selectOption('#pt-arr','SRV_A');await W(P.page,900);o.ev4=evn(moi());o.c4=await carte();
console.log('g7) trajet sans chantier choisi :',J(o));
C.g7=o.c1.sel.join()==='pt-dest=SRV_A'&&/Celui du planning est choisi/.test(o.c1.txt)&&o.ev1.endsWith(',leave>SRV_A')&&o.ev2.endsWith(',arrive=SRV_B,leave')&&o.c2.sel.join()==='pt-dest='&&o.ev3.endsWith(',leave,arrive')&&o.c3.cls==='pt-on'&&o.c3.sel.join()==='pt-arr='&&/Tu es arrivé sur quel chantier \? Tes heures iront sur ce chantier/.test(o.c3.txt)&&o.c3.btn.slice(0,3).join('|')==='Pause|🚐 Début de trajet|■ Fin de journée'
  &&o.ev4.endsWith(',leave>SRV_A,arrive=SRV_A')&&/Villefictive/.test(o.c4.kick)&&o.c4.sel.length===0;

o={};await pt('end');o.ev=evn(moi());o.c=await carte();o.srv={val:(moi().val||[]).length,refus:REFUS.slice()};
console.log('g8) fin de journée :',J(o));
C.g8=o.ev==='start,leave>SRV_B,pause,resume,arrive=SRV_B,leave>SRV_A,arrive=SRV_A,end'&&o.c.cls==='pt-done'&&o.srv.refus.length===0;
await P.ctx.close();

// ── g9 : deux chantiers au planning (Théo) — celui du planning est déjà choisi, un geste pour partir, un geste pour arriver
P=await open(TUY,{width:390,height:844},true);o={};const lui=()=>PTS[K(TUY,LU)]||{events:[]};await home(P.page,'htHome');await W(P.page,600);
await pt('start');o.c0=await carte();await pt('leave');o.c1=await carte();o.lv=Object.assign({},lui().events.find(e=>e.t==='leave'));delete o.lv.at;delete o.lv.pos;await pt('arrive');o.ev=evn(lui());o.c2=await carte();await ovf(P,'g9 deux chantiers');
console.log('g9) deux chantiers au planning :',J(o));
C.g9=/2 chantiers aujourd'hui : « Début de trajet » puis « Fin de trajet »/.test(o.c0.txt)&&/Villefictive/.test(o.c0.kick)&&o.c1.sel.join()==='pt-dest=SRV_B'&&/Celui du planning est choisi/.test(o.c1.txt)&&/Autreville/.test(o.c1.kick)&&J(o.lv)===J({t:'leave',vers:'SRV_B',auto:true})
  &&o.ev==='start,leave>SRV_B,arrive=SRV_B'&&o.c2.cls==='pt-on'&&/Autreville/.test(o.c2.kick);
await P.ctx.close();

console.log('t5) débordements :',J(OVF),'console / refus :',J({logs:logs.slice(0,6),refus:REFUS}));C.t5=OVF.length===0&&logs.length===0&&REFUS.length===0;
console.log('RÉSULTATS',J(C));const KO=Object.entries(C).filter(([,v])=>!v).map(([k])=>k);console.log('RESULTAT: '+(KO.length?'ECHEC '+KO.join(','):'TOUT VERT'));await browser.close();process.exit(KO.length?1:0);
