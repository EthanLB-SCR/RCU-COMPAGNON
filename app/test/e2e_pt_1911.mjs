// e2e_pt_1911.mjs — 19/11/2026, retours de recette d'Ethan sur les pointages (décor, serveur simulé et personnages FICTIFS repris de e2e_val_1011) :
//  « je ne vois pas ceux au planning qui n'ont rien pointé » · « tout le monde rangé par chantier, même ceux qui n'ont pas mis d'heure, avec la possibilité de leur en mettre »
//  « ajouter la possibilité de mettre des heures de route inter-chantier, de pouvoir changer le chantier du gars » · « que les gars puissent mettre inter-chantier et changer de chantier »
//  r1  responsable d'exploitation (ni chef de chantier ni conducteur), « Par jour », vendredi : Lucas « rien de pointé » dans le groupe de son chantier + « Saisir ses heures » (avant : rien)
//      19/11 soir (Ethan : « le 5 rouge, pourquoi que sur une journée et pas sur les autres ? ») : la pastille rouge est aussi sur un jour de plus de 7 jours (mardi 27/10, 13 jours avant)
//  r2  le jour même (lundi) : ceux du planning sans pointage sont là, saisie possible ; saisie avec un autre chantier et un trajet de 45 min → enregistré, accepté par le serveur
//  r3  « Par personne » : ceux qui n'ont rien pointé ont leur pastille (rouge pour un jour passé) et leurs jours « rien de pointé » avec la saisie
//  r4  cheffe (390) : la correction change le chantier et ajoute 1 h de trajet inter-chantier (trace), puis le retire (« pas de trajet » gardé)
//  r5  un départ inter-chantier dans la journée compte dans les heures (8 h 00 avec 45 min de route) et la ligne dit où il est parti
//  r6  le gars (390) : « Autre chantier » au départ, changer de chantier en journée (19/11 soir : « Début de trajet » en un geste, chantier d'arrivée choisi en route, « Fin de trajet »), « Déclarer un trajet inter-chantier » à la main ; pas au planning → la carte demande le chantier
//  r7  téléphone 390 / 360 : rien ne déborde ; console propre, aucune écriture refusée
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
const S45=['2026-11-02','2026-11-03','2026-11-04','2026-11-05','2026-11-06'],F='2026-11-06',JE='2026-11-05',LU=TODAY;
const wk=(d,s)=>Object.fromEntries(d.map(x=>[x,[s]]));
const VIEUX='2026-10-27';PLAN['2026-W44']={week:'2026-W44',data:{aff:{[NEUF.email]:{[VIEUX]:['SRV_A']},[CHEF.email]:{[VIEUX]:['SRV_A']}}},updated_at:'2026-10-23T08:00:00Z'}; /* 13 jours avant « aujourd'hui » : Lucas placé, rien pointé */
PLAN['2026-W45']={week:'2026-W45',data:{aff:{[SOUD.email]:wk(S45,'SRV_A'),[TUY.email]:wk(S45,'SRV_A'),[MAN.email]:wk(S45,'SRV_A'),[CHEF.email]:wk(S45,'SRV_A'),[NEUF.email]:{[JE]:['SRV_A'],[F]:['SRV_A']}}},updated_at:'2026-10-30T08:00:00Z'};
PLAN['2026-W46']={week:'2026-W46',data:{aff:{[SOUD.email]:{[LU]:['SRV_A']},[TUY.email]:{[LU]:['SRV_A']},[MAN.email]:{[LU]:['SRV_B']},[CHEF.email]:{[LU]:['SRV_A']}}},updated_at:'2026-11-06T18:00:00Z'}; /* lundi : Hugo, Théo (Tilleuls), Marc (Moulin) ; Lucas et Nina ne sont pas au planning */
const ev=(d,a)=>a.map(([t,h,x])=>Object.assign({t,at:d+'T'+h},x||{}));
const put=(u,d,events,extra)=>{PTS[u.email+'|'+d]=Object.assign({p:u.email,d,site:'SRV_A',events,status:'declare',val:[],corr:null,updated_at:'2026-11-06T17:00:00Z'},extra||{});};
const J8=[['start','07:30'],['pause','12:00'],['resume','13:00'],['end','16:30']];
put(SOUD,F,ev(F,J8));                                                                                  /* vendredi : Hugo complet */
put(TUY,F,ev(F,[['start','07:30'],['leave','10:00',{vers:'SRV_C'}],['arrive','10:45',{site:'SRV_C'}],['pause','12:00'],['resume','13:00'],['end','16:30']])); /* Théo : parti à 10 h sur un autre chantier, 45 min de route dans la journée */
put(MAN,F,ev(F,J8));
S45.slice(0,4).forEach(d=>[SOUD,TUY,MAN].forEach(u=>put(u,d,ev(d,J8),{status:'valide',val:[{by:CHEF.email,at:d+'T17:00'},{by:COND.email,at:d+'T18:00'}]}))); /* lundi → jeudi : définitifs */
/* Lucas : placé jeudi et vendredi, rien pointé du tout */
const K=(u,d)=>u.email+'|'+d;
const rows=pg=>pg.evaluate(()=>[...document.querySelectorAll('#eq-app .eq-list > *')].map(el=>{if(el.classList.contains('eq-grp-h'))return {h:el.textContent.replace(/\s+/g,' ').trim()};
  return {cls:[...el.classList].filter(c=>c!=='eq-vrow').join(' '),t:(el.querySelector('.eq-t')||{}).textContent||'',s:(el.querySelector('.eq-s')||{}).textContent.replace(/\s+/g,' ').trim(),etat:(el.querySelector('.eq-etat')||{}).textContent||'',saisie:!!el.querySelector('[data-act=pi][data-v^="saisie|"]'),form:!!el.querySelector('.eq-corrform')};}));
const r=(L,n)=>L.find(x=>x.t&&x.t.startsWith(n))||{};const chips=pg=>pg.evaluate(()=>[...document.querySelectorAll('#eq-app .eq-filtres .chip')].map(c=>c.textContent.replace(/\s+/g,' ').trim()+(c.classList.contains('active')?'*':'')+(c.querySelector('.eq-rouge')?'!':'')));
const evs=x=>x.events.map(e=>e.t+'@'+e.at.slice(11)+(e.vers?'>'+e.vers:'')+(e.site?'='+e.site:'')+(e.t==='route'?(e.non?':non':':'+e.min):'')).join();
let o={};

// ── r1 : le responsable d'exploitation voit ceux qui n'ont rien pointé (vendredi), rangés dans leur chantier
let P=await open(RESP,{width:1366,height:900},false,{wide:true});
await hub(P.page);await hubRow(P.page,/Pointages à valider/);await tapAct(P.page,'valmode','jour',400);await tapAct(P.page,'valjour',F,500);
o.ven=await rows(P.page);o.chips=await chips(P.page);await tapAct(P.page,'valjour',JE,500);o.jeu=await rows(P.page);await shot(P,'pt_r1_resp_jeudi');await tapAct(P.page,'valjour',VIEUX,500);o.vieux=await rows(P.page);
console.log('r1) responsable, par jour :',J(o));
C.r1=o.ven.some(x=>/Tilleuls .* 4 personnes · 1 à traiter/.test(x.h||''))&&r(o.ven,'Lucas').cls==='todo'&&/placé sur Chantier fictif des Tilleuls · rien de pointé/.test(r(o.ven,'Lucas').s)&&r(o.ven,'Lucas').saisie&&r(o.ven,'Lucas').etat==='Pas de pointage'
  &&o.chips.some(c=>/ven/.test(c)&&c.endsWith('!'))&&r(o.jeu,'Lucas').saisie&&/rien de pointé/.test(r(o.jeu,'Lucas').s)
  &&o.chips.some(c=>/27\/10/.test(c)&&c.endsWith('!'))&&o.chips.filter(c=>c.endsWith('!')).length===3&&r(o.vieux,'Lucas').saisie&&/rien de pointé/.test(r(o.vieux,'Lucas').s)&&r(o.vieux,'Lucas').cls==='todo';

// ── r2 : le jour même (lundi) : Hugo, Théo et Marc sont au planning sans pointage → visibles, saisie possible ; saisie de Marc sur un AUTRE chantier avec 45 min de trajet
o={};await tapAct(P.page,'valjour',LU,500);o.lun=await rows(P.page);
await tapAct(P.page,'pi','saisie|'+K(MAN,LU),400);o.form=await P.page.evaluate(()=>{const s=document.getElementById('pi-s-site'),t=document.getElementById('pi-s-rt');return {site:s&&s.value,opts:s?[...s.options].map(x=>x.textContent):[],rt:t&&t.value,rts:t?[...t.options].map(x=>x.textContent):[]};});
await P.page.selectOption('#pi-s-site','SRV_A');await P.page.selectOption('#pi-s-rt','45');await tapAct(P.page,'pi','saisieok|'+K(MAN,LU),900);
const rM=PTS[K(MAN,LU)]||{events:[]};o.marc={site:rM.site,ev:evs(rM),st:rM.status,val:(rM.val||[]).map(v=>v.by),by:(rM.events.find(e=>e.t==='route')||{}).by};o.apres=await rows(P.page);{let h='';o.groupeMarc=[];o.apres.forEach(x=>{if(x.h)h=x.h;else if(/^Marc/.test(x.t||''))o.groupeMarc.push(h);});} /* Marc est maintenant rangé dans le chantier saisi */
console.log('r2) le jour même :',J(o));
C.r2=['Hugo','Théo','Marc'].every(n=>r(o.lun,n).saisie&&/rien de pointé/.test(r(o.lun,n).s)&&r(o.lun,n).cls==='')&&o.lun.some(x=>/Moulin/.test(x.h||''))&&o.form.site==='SRV_B'&&o.form.opts[0]==='Chantier fictif du Moulin · au planning'&&o.form.rt==='0'&&o.form.rts.join()==='aucun,30 min,45 min,1 h,1 h 15,1 h 30,2 h,2 h 30,3 h'
  &&o.marc.site==='SRV_A'&&o.marc.ev==='start@07:30,route@07:30>SRV_A:45,pause@12:00,resume@13:00,end@16:30'&&o.marc.st==='corrige'&&o.marc.val.join()===RESP.email&&o.marc.by===RESP.email&&o.groupeMarc.length===1&&/Tilleuls/.test(o.groupeMarc[0])&&!o.apres.some(x=>/Moulin/.test(x.h||''));

// ── r3 : « Par personne » : ceux qui n'ont rien pointé ont leur pastille et leurs jours
o={};await tapAct(P.page,'valmode','pers',500);o.chips=await chips(P.page);await tapAct(P.page,'valpers',NEUF.email,500);o.lucas=await rows(P.page);await tapAct(P.page,'valpers',SOUD.email,500);o.hugo=await rows(P.page);
console.log('r3) par personne :',J(o));
C.r3=o.chips.some(c=>/^Lucas/.test(c)&&c.includes('!'))&&o.chips.some(c=>/^Hugo/.test(c))&&o.lucas.filter(x=>/rien de pointé/.test(x.s||'')&&x.saisie&&x.cls==='todo').length===3&&o.lucas.some(x=>/27\/10/.test(x.t||'')&&/rien de pointé/.test(x.s||''))&&o.hugo.some(x=>/^lun/.test(x.t||'')&&/rien de pointé/.test(x.s||'')&&x.saisie&&x.cls==='');
await both(P,'r3 par personne');await P.ctx.close();

// ── r4 : la cheffe corrige Hugo (vendredi) : autre chantier + 1 h de trajet ; puis elle retire le trajet
P=await open(CHEF,{width:390,height:844},true);o={};
await hub(P.page);await hubRow(P.page,/Pointages à valider/);await tapAct(P.page,'valjour',F,500);await tapAct(P.page,'corr',K(SOUD,F),400);
o.f0=await P.page.evaluate(()=>({site:document.getElementById('eq-c-site').value,rt:document.getElementById('eq-c-rt').value,motifs:[...document.getElementById('eq-c-m').options].map(x=>x.textContent)}));await both(P,'r4 correction');await shot(P,'pt_r4_correction_390','#eq-app .eq-corrform');
await P.page.selectOption('#eq-c-site','SRV_B');await P.page.selectOption('#eq-c-rt','60');await P.page.selectOption('#eq-c-m','Mauvais chantier');await tap(P.page,'#eq-app [data-act=corrok]',900);
let rH=PTS[K(SOUD,F)];o.c1={site:rH.site,ev:evs(rH),chg:rH.corr&&rH.corr.chg,st:rH.status,val:rH.val.map(v=>v.by)};
await tapAct(P.page,'valjour',F,400);o.rang=(await rows(P.page)).filter(x=>x.h||/Hugo/.test(x.t||'')).map(x=>x.h||x.t+' · '+x.s);
await tapAct(P.page,'corr',K(SOUD,F),400);o.f1=await P.page.evaluate(()=>({site:document.getElementById('eq-c-site').value,rt:document.getElementById('eq-c-rt').value,hint:[...document.querySelectorAll('#eq-app .eq-corrform .eq-ecart')].slice(-2).map(e=>e.textContent.replace(/\s+/g,' ').trim())}));
await P.page.selectOption('#eq-c-rt','0');await tap(P.page,'#eq-app [data-act=corrok]',900);rH=PTS[K(SOUD,F)];o.c2={ev:evs(rH),chg:rH.corr&&rH.corr.chg,hist:((rH.corr||{}).hist||[]).length};
await tapAct(P.page,'corr',K(SOUD,F),400);await tap(P.page,'#eq-app [data-act=corrok]',700);o.rien=await P.page.evaluate(()=>(document.querySelector('.toast,#toast,.msg')||{}).textContent||'');
console.log('r4) correction :',J(o));
C.r4=o.f0.site==='SRV_A'&&o.f0.rt==='0'&&o.f0.motifs.includes('Trajet inter-chantier')&&o.c1.site==='SRV_B'&&o.c1.ev==='start@07:30,route@07:30>SRV_B:60,pause@12:00,resume@13:00,end@16:30'&&J(o.c1.chg)===J(['chantier Chantier fictif du Moulin au lieu de Chantier fictif des Tilleuls','trajet inter-chantier 1 h (ajouté)'])&&o.c1.st==='corrige'&&o.c1.val.join()===CHEF.email
  &&o.rang.some(x=>/Moulin/.test(x))&&o.f1.site==='SRV_B'&&o.f1.rt==='60'&&o.f1.hint.join('|')==='pointé sur Chantier fictif du Moulin|déclaré 1 h · payé à part'&&o.c2.ev==='start@07:30,route@07:30>SRV_B:non,pause@12:00,resume@13:00,end@16:30'&&J(o.c2.chg)===J(['trajet inter-chantier retiré (déclaré 1 h)'])&&o.c2.hist===1;

// ── r5 : Théo est parti à 10 h sur un autre chantier (45 min de route) : la journée fait 8 h 00 route comprise, la ligne dit où il est parti
o={};await tapAct(P.page,'valjour',F,400);o.theo=r(await rows(P.page),'Théo');
console.log('r5) départ dans la journée :',J(o));C.r5=/7 h 30 → 16 h 30 · 8 h 00 · pause 1 h 00 · inter 0 h 45 → Chantier fictif sans chef/.test(o.theo.s||'');
await P.ctx.close();

// ── r6 : le gars — autre chantier au départ, changer de chantier en journée, déclarer un trajet à la main
P=await open(SOUD,{width:390,height:844},true);o={};const carte=()=>P.page.evaluate(()=>{const c=document.querySelector('#eq-app .ptc');return c?{cls:[...c.classList].filter(x=>/^pt-/.test(x)&&x!=='pt-lock').join(),kick:(c.querySelector('.ac-kick')||{}).textContent||'',big:(c.querySelector('.ptbig')||{}).textContent||'',btn:[...c.querySelectorAll('button')].map(b=>b.textContent.replace(/\s+/g,' ').trim()),sel:[...c.querySelectorAll('select')].map(s=>s.id+'='+s.value)}:null;});
await home(P.page,'htHome');await W(P.page,600);o.c0=await carte();
await tap(P.page,'#eq-app .ptc [data-act=ptautre]',400);o.c1=await carte();o.opts=await P.page.evaluate(()=>[...document.getElementById('pt-site').options].map(x=>x.textContent));await both(P,'r6 autre chantier');
await P.page.selectOption('#pt-site','SRV_B');await tap(P.page,'#eq-app .ptc [data-act=pointer][data-v=start]',900);let rS=PTS[K(SOUD,LU)]||{events:[]};o.start={site:rS.site,ev:rS.events.map(e=>e.t).join()};o.c2=await carte();
await tap(P.page,'#eq-app .ptc [data-act=ptroutedecl]',400);o.c3=await carte();await tap(P.page,'#eq-app .ptc [data-act=ptroute][data-v^="45|matin"]',900);rS=PTS[K(SOUD,LU)];o.route=evs(rS).replace(/@\d\d:\d\d/g,'');o.c4=await carte();
/* 19/11 soir : un seul geste pour partir ; parti d'un chantier hors planning → celui du planning est proposé, il choisit un autre chantier en route */
await tap(P.page,'#eq-app .ptc [data-act=pointer][data-v=leave]',900);o.c5=await carte();o.dep=evs(PTS[K(SOUD,LU)]).replace(/@\d\d:\d\d/g,'');
await P.page.selectOption('#pt-dest','SRV_C');await W(P.page,800);await both(P,'r6 en route');o.c6=await carte();
await tap(P.page,'#eq-app .ptc [data-act=pointer][data-v=arrive]',900);rS=PTS[K(SOUD,LU)];o.fin=evs(rS).replace(/@\d\d:\d\d/g,'');o.c7=await carte();await shot(P,'pt_r6_gars_390','#eq-app .ptc');
console.log('r6) le gars :',J(o));
C.r6=o.c0.cls==='pt-off'&&o.c0.btn.join('|')==='▶ Commencer la journée|📍 Autre chantier'&&o.c0.sel.length===0&&o.c1.sel.join()==='pt-site='&&o.opts[0]==='— choisir le chantier —'&&o.opts[1]==='Chantier fictif des Tilleuls · au planning'&&o.opts.includes('Chantier fictif du Moulin')&&o.opts.includes('Chantier fictif sans chef')
  &&o.start.site==='SRV_B'&&o.start.ev==='start'&&o.c2.cls==='pt-on'&&/Autreville/.test(o.c2.kick)&&o.c2.btn.some(b=>/^🚐 Début de trajet$/.test(b))&&o.c2.btn.some(b=>/Déclarer un trajet inter-chantier \(hier soir ou ce matin\)/.test(b))
  &&o.c3.btn.filter(b=>/^(30|45) min$|^1 h/.test(b)).length>=3&&o.route==='start,route:45'&&!o.c4.btn.some(b=>/Déclarer un trajet/.test(b))&&o.c4.btn.some(b=>/modifier/.test(b))
  &&o.c5.cls==='pt-inter'&&/En route/.test(o.c5.big)&&o.c5.sel.join()==='pt-dest=SRV_A'&&o.dep==='start,route:45,leave>SRV_A'&&o.c6.cls==='pt-inter'&&o.c6.sel.join()==='pt-dest=SRV_C'&&o.c6.btn.join('|').includes('📍 Fin de trajet')&&o.fin==='start,route:45,leave>SRV_C,arrive=SRV_C'&&o.c7.cls==='pt-on'&&/Troisville/.test(o.c7.kick);
await P.ctx.close();
// pas au planning (Nina) : la carte demande le chantier
P=await open(INT,{width:390,height:844},true);o={};await home(P.page,'htHome');await W(P.page,600);o.c0=await P.page.evaluate(()=>{const c=document.querySelector('#eq-app .ptc');return c?{txt:c.textContent.replace(/\s+/g,' '),sel:[...c.querySelectorAll('select')].map(s=>s.id+'='+s.value),btn:[...c.querySelectorAll('button')].map(b=>b.textContent.trim())}:null;});
await P.page.selectOption('#pt-site','SRV_A');await tap(P.page,'#eq-app .ptc [data-act=pointer][data-v=start]',900);o.site=(PTS[K(INT,LU)]||{}).site;await ovf(P,'r6 pas au planning');
console.log('r6b) pas au planning :',J(o));C.r6b=!!o.c0&&/Sur quel chantier es-tu aujourd'hui \? Tu n'es pas au planning/.test(o.c0.txt)&&o.c0.sel.join()==='pt-site='&&o.c0.btn.join('|')==='▶ Commencer la journée'&&o.site==='SRV_A';
await P.ctx.close();

console.log('r7) débordements :',J(OVF),'console / refus :',J({logs:logs.slice(0,6),refus:REFUS}));C.r7=OVF.length===0&&logs.length===0&&REFUS.length===0;
console.log('RÉSULTATS',J(C));const KO=Object.entries(C).filter(([,v])=>!v).map(([k])=>k);console.log('RESULTAT: '+(KO.length?'ECHEC '+KO.join(','):'TOUT VERT'));await browser.close();process.exit(KO.length?1:0);
