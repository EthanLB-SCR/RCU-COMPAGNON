// INTERACTIONS OPÉRATEUR / HIÉRARCHIE (14/10 nuit, agent « inter ») — Ethan : « pense à tester les interactions opérateur / hiérarchie, que ce soit bien synchro pour tout
// le monde, que les liens marchent entre chacun, les interactions ».
// Supabase SIMULÉ PARTAGÉ (état en mémoire dans ce script) entre 2 ou 3 navigateurs ouverts en même temps : registre, fiches, pointages, planning, chantiers (méta + plan
// complet + site_set_part). Rien n'est rechargé à la main : la mise à jour vient du rafraîchissement léger (trace:syncMs = 4 s pour le test, ~50 s en vrai).
// Comptes FICTIFS : Bruno TESTCOMPAGNON (soudeur, téléphone 390 px), Jean TESTCHEF (chef de chantier), Claire TESTCONDUC (conductrice de travaux),
// Alain TESTADMIN (administrateur : import du pack véhicule fictif), Fanny TESTFLOTTE (responsable flotte). Chantiers fictifs Alpha et Beta (chef Jean, conductrice Claire).
// Parcours : (1) pointage → validation chef → validation conducteur ; (2) planning : placé demain → sa semaine change ; (3) quart d'heure sécurité : déclenché →
// « À faire » → fait et signé → émargement chez l'animatrice ; (4) remise de véhicule « signera plus tard » → charte signée au téléphone → remise complète chez la
// responsable ; (5) objectif du jour posé par le chef → accueil du compagnon. À chaque fois : apparition chez l'autre SANS recharger, lien « À faire » → bon écran,
// action aboutie, notification disparue chez les deux, compteurs justes, 390 px sans débordement, pas d'erreur console.
import { chromium } from 'playwright';
const BASE=process.env.BASE||'http://127.0.0.1:8777';
const SB='https://pghftlepduvfazbiavhq.supabase.co';
const b64u=o=>Buffer.from(JSON.stringify(o)).toString('base64').replace(/=+$/,'').replace(/\+/g,'-').replace(/\//g,'_');
const COMP={id:'aaaaaaaa-1111-4111-8111-111111111111',email:'bruno.testcompagnon@exemple.fr',prenom:'Bruno',nom:'TESTCOMPAGNON',poste:'soudeur',role:'soudeur',admin:false};
const CHEF={id:'dddddddd-4444-4444-8444-444444444444',email:'jean.testchef@exemple.fr',prenom:'Jean',nom:'TESTCHEF',poste:'chef',role:'chef',admin:false};
const COND={id:'eeeeeeee-5555-4555-8555-555555555555',email:'claire.testconduc@exemple.fr',prenom:'Claire',nom:'TESTCONDUC',poste:'conducteur',role:'chef',admin:false};
const ADM={id:'cccccccc-3333-4333-8333-333333333333',email:'alain.testadmin@exemple.fr',prenom:'Alain',nom:'TESTADMIN',poste:'resp_exploitation',role:'chef',admin:true};
const FLOT={id:'ffffffff-6666-4666-8666-666666666666',email:'fanny.testflotte@exemple.fr',prenom:'Fanny',nom:'TESTFLOTTE',poste:'resp_flotte',role:'bureau',admin:false};
const USERS=[COMP,CHEF,COND,ADM,FLOT];
const PROFILES=USERS.map(u=>({id:u.id,email:u.email,name:u.prenom+' '+u.nom,prenom:u.prenom,nom:u.nom,role:u.role,active:true,poste:u.poste,admin:u.admin,type:'salarie',rights:{},sites:null,created_at:'2026-10-01T09:00:00Z'}));
const TODAY='2026-10-13',TOMORROW='2026-10-14',WEEK='2026-W42',MONDAY='2026-10-12'; /* date figée (trace:testToday) : un mardi — le test ne dépend pas de l'heure à laquelle il tourne */
const SITE_META={SRV_A:{name:'Chantier fictif Alpha',ville:'Villefictive'},SRV_B:{name:'Chantier fictif Beta',ville:'Autreville'}};
// ── serveur simulé partagé ──
const REG={},PEOPLE={},PTS={},PLAN={},SITE={};const calls=[];
const nowIso=()=>new Date().toISOString();
const flt=(rows,u)=>{let r=rows;for(const [k,v] of u.searchParams.entries()){if(['select','order','limit','offset'].includes(k))continue;const m=/^(in|gt|gte|lt|lte|eq|neq)\.(.*)$/.exec(v);if(!m)continue;const op=m[1],val=m[2];
  r=r.filter(x=>{const xv=x[k]===undefined||x[k]===null?'':String(x[k]);if(op==='in')return val.replace(/^\(|\)$/g,'').split(',').map(s=>s.replace(/^"|"$/g,'')).includes(xv);if(op==='eq')return xv===val;if(op==='neq')return xv!==val;
    const a=Date.parse(xv),b=Date.parse(val);const c=(!isNaN(a)&&!isNaN(b))?(a-b):(xv<val?-1:xv>val?1:0);return op==='gt'?c>0:op==='gte'?c>=0:op==='lt'?c<0:c<=0;});}return r;};
const CORS={'access-control-allow-origin':'*','access-control-allow-headers':'*','access-control-allow-methods':'GET, POST, PUT, PATCH, DELETE, OPTIONS'};
const metaRow=r=>({id:r.id,name:r.name,supplier:r.supplier||null,updated_at:r.updated_at,geo:null,origin:null,bgo:null,sat:null,w:null,h:null,bbox:null,nbox:null,nw:40,deleted:null,deletedAt:null,builtin:null,ville:(r.data.fiche||{}).ville||null,chef:(r.data.fiche||{}).chef||null,conducteur:(r.data.fiche||{}).conducteur||null,secteur:(r.data.fiche||{}).secteur||null,etude:null});
const browser=await chromium.launch({headless:true,executablePath:process.env.CHROMIUM_PATH||undefined});
const logs=[];
async function mkCtx(U,viewport,mobile){const ctx=await browser.newContext({viewport,isMobile:!!mobile,hasTouch:!!mobile});
  const user=()=>({id:U.id,aud:'authenticated',role:'authenticated',email:U.email,email_confirmed_at:'2026-10-01T09:00:00Z',app_metadata:{provider:'email'},user_metadata:{},identities:[],created_at:'2026-10-01T09:00:00Z',updated_at:nowIso()});
  const session=()=>{const t=Math.floor(Date.now()/1000);return {access_token:b64u({alg:'HS256',typ:'JWT'})+'.'+b64u({iss:SB+'/auth/v1',sub:U.id,aud:'authenticated',exp:t+3600,iat:t,email:U.email,role:'authenticated'})+'.sig',token_type:'bearer',expires_in:3600,expires_at:t+3600,refresh_token:'rt-'+t,user:user()};};
  await ctx.route(u=>u.href.startsWith(SB),async route=>{const req=route.request();const u=new URL(req.url());const p=u.pathname;const acc=req.headers()['accept']||'';
    const json=(o,status=200)=>route.fulfill({status,contentType:'application/json',headers:CORS,body:JSON.stringify(o)});
    if(req.method()==='OPTIONS')return route.fulfill({status:200,headers:CORS,body:''});
    let b={};try{b=JSON.parse(req.postData()||'{}');}catch(e){}calls.push(U.prenom+' '+req.method()+' '+p+(u.search?decodeURIComponent(u.search).slice(0,300):'')+(b&&b.p_kind?' '+b.p_kind:'')+(b&&b.p_key&&b.p_site?' '+b.p_key:''));
    if(p==='/auth/v1/token')return json(session());if(p==='/auth/v1/user')return json(user());if(p.startsWith('/auth/v1/'))return json({});
    if(p.startsWith('/storage/v1/'))return json({statusCode:'400',error:'test',message:'stockage simulé indisponible'},400);
    if(p==='/rest/v1/profiles'){const m=/id=eq\.([^&]+)/.exec(u.search);const r=m?PROFILES.filter(x=>x.id===decodeURIComponent(m[1])):PROFILES;return json(/object/.test(acc)?(r[0]||null):r);}
    if(p==='/rest/v1/invites')return json([]);if(p==='/rest/v1/rpc/annuaire_invites')return json([]);
    if(p==='/rest/v1/app_settings')return json(/object/.test(acc)?null:[]);
    if(p==='/rest/v1/rpc/registre_set'){const k=b.p_kind+'|'+b.p_id;const old=(REG[k]||{}).data||{};const data=b.p_mode==='replace'?Object.assign({},b.p_patch||{}):Object.assign({},old,b.p_patch||{});Object.keys(b.p_patch||{}).forEach(x=>{if(b.p_patch[x]===null)delete data[x];});REG[k]={kind:b.p_kind,id:b.p_id,data,updated_at:nowIso(),by:U.email};return json(REG[k]);}
    if(p==='/rest/v1/registre')return json(flt(Object.values(REG),u));
    if(p==='/rest/v1/rpc/people_set_part'){const r=PEOPLE[b.p_key]||(PEOPLE[b.p_key]={key:b.p_key,data:{}});r.data=Object.assign({},r.data,{[b.p_part]:b.p_value});r.updated_at=nowIso();return json({at:r.updated_at,value:b.p_value});}
    if(p==='/rest/v1/people')return json(flt(Object.values(PEOPLE),u));
    if(p==='/rest/v1/rpc/pointage_set'){const row=Object.assign({},b.p_row,{updated_at:nowIso()});PTS[row.p+'|'+row.d]=row;return json(row);}
    if(p==='/rest/v1/pointages')return json(flt(Object.values(PTS),u));
    if(p==='/rest/v1/rpc/planning_set'){const w=b.p_week;const r=PLAN[w]||(PLAN[w]={week:w,data:{aff:{}}});const aff=Object.assign({},r.data.aff);Object.entries((b.p_patch&&b.p_patch.aff)||{}).forEach(([k,v])=>{if(v===null)delete aff[k];else aff[k]=v;});r.data={aff};r.updated_at=nowIso();return json(r);}
    if(p==='/rest/v1/planning')return json(flt(Object.values(PLAN),u));
    if(p==='/rest/v1/rpc/site_set_part'){const row=SITE[b.p_site];if(!row)return json(null);const old=row.data[b.p_key];const v=b.p_key==='missions'?Object.assign({},old||{},b.p_value||{}):b.p_value;row.data=Object.assign({},row.data,{[b.p_key]:v});row.updated_at=nowIso();return json({at:row.updated_at,value:v});}
    if(p==='/rest/v1/sites'){const sel=u.searchParams.get('select')||'';if(req.method()!=='GET')return json([]);const m=/id=eq\.([^&]+)/.exec(u.search);const id=m?decodeURIComponent(m[1]):null;let rows=Object.values(SITE).filter(r=>!id||r.id===id);
      if(/missions:data->missions/.test(sel))return json(flt(Object.values(SITE),u).map(r=>({id:r.id,updated_at:r.updated_at,missions:r.data.missions||null}))); /* 14/10 nuit (inter) : lecture légère des objectifs */
      if(/(^|,)data(,|$)/.test(sel))return json(/object/.test(acc)?(rows[0]?{id:rows[0].id,name:rows[0].name,supplier:rows[0].supplier,serie:null,data:rows[0].data,updated_at:rows[0].updated_at}:null):rows.map(r=>({id:r.id,name:r.name,supplier:r.supplier,serie:null,data:r.data,updated_at:r.updated_at})));
      return json(/object/.test(acc)?(rows[0]?metaRow(rows[0]):null):rows.map(metaRow));}
    if(p.startsWith('/rest/v1/rpc/'))return json(null);if(p.startsWith('/rest/v1/'))return json(/object/.test(acc)?null:[]);return json([]);});
  await ctx.route(u=>/open-meteo\.com$|(^|\.)geopf\.fr$|^geo\.api\.gouv\.fr$/.test(u.hostname),r=>r.fulfill({status:200,contentType:'application/json',body:'{}'}));
  const page=await ctx.newPage();page.on('dialog',d=>d.accept().catch(()=>{}));
  page.on('pageerror',e=>logs.push(U.prenom+' PAGEERROR: '+e.message.slice(0,300)));page.on('console',m=>{if(m.type()==='error'&&!/realtime|websocket|Failed to fetch|net::ERR|404|400|open-meteo|geopf|geo\.api|status of 4\d\d|supabase/i.test(m.text()))logs.push(U.prenom+': '+m.text().slice(0,200));});
  return {ctx,page};}
const login=async(page,em)=>{await page.goto(BASE+'/index.html');await page.waitForTimeout(400);await page.evaluate(t=>{localStorage.clear();localStorage.setItem('trace:syncMs','4000');localStorage.setItem('trace:testToday',t);},TODAY);await page.evaluate(()=>new Promise(r=>{try{const q=indexedDB.deleteDatabase('trace-kv');q.onsuccess=q.onerror=q.onblocked=()=>r();}catch(e){r();}}));await page.reload();await page.waitForTimeout(800);
  await page.fill('#loginEmail',em);await page.fill('#loginPwd','Test-2026!');await page.click('#loginGo');await page.waitForTimeout(3000);};
const W=(pg,ms)=>pg.waitForTimeout(ms);
const C={};const R={};
const notifs=pg=>pg.evaluate(()=>[...document.querySelectorAll('#eq-app [data-act=notif]')].map(x=>x.textContent.replace(/\s+/g,' ').trim()));
const clickNotif=(pg,re)=>pg.evaluate(src=>{const re=new RegExp(src);const n=[...document.querySelectorAll('#eq-app [data-act=notif]')].find(x=>re.test(x.textContent));if(!n)return false;n.click();return true;},re.source);
const tap=async(pg,sel,ms)=>{await pg.evaluate(s=>{const el=document.querySelector(s);if(!el)throw new Error('absent : '+s+' · '+((document.getElementById('eq-app')||document.body).textContent||'').replace(/\s+/g,' ').slice(0,300));el.click();},sel);await W(pg,ms||300);};
const tapAct=(pg,act,v,ms)=>tap(pg,`#eq-app [data-act="${act}"][data-v="${v}"]`,ms);
const fake=async(pg,act,v,ms)=>{await pg.evaluate(([a,v])=>{const b=document.createElement('button');b.dataset.act=a;b.dataset.v=v;b.style.display='none';document.querySelector('#eq-app').append(b);b.click();},[act,v]);await W(pg,ms||400);}; /* le même geste qu'un bouton de l'écran (clic délégué) */
const hubRow=async(pg,re)=>{await pg.evaluate(src=>{const re=new RegExp(src);const bk=document.querySelector('#eq-app .ac-back');if(bk)bk.click();const r=[...document.querySelectorAll('#eq-app .ac-row')].find(x=>re.test(x.textContent));if(!r)throw new Error('ligne absente : '+src);r.click();},re.source);await W(pg,400);};
const home=async(pg,tab)=>{await pg.evaluate(t=>{const T=window.TRACE;if(T.state.screen!=='home'){const b=document.getElementById('btnHome');if(b)b.click();}document.getElementById(t).click();},tab);await W(pg,450);};
const txt=pg=>pg.evaluate(()=>(document.getElementById('eq-app')||document.body).textContent.replace(/\s+/g,' '));
const until=async(pg,fn,arg,ms)=>{const t0=Date.now();while(Date.now()-t0<(ms||14000)){let v=null;try{v=await pg.evaluate(fn,arg);}catch(e){}if(v)return v;await W(pg,400);}return null;}; /* attend un état SANS recharger (rafraîchissement léger : 4 s ici) */
const draw=async(pg,id)=>{await pg.evaluate(id2=>{const cv=document.getElementById(id2);cv.scrollIntoView({block:'center'});const r=cv.getBoundingClientRect();const ev=(t,x,y)=>cv.dispatchEvent(new PointerEvent(t,{bubbles:true,clientX:r.left+x,clientY:r.top+y,pointerId:1,pointerType:'touch'}));ev('pointerdown',20,40);ev('pointermove',80,60);ev('pointermove',140,30);ev('pointerup',140,30);},id);await W(pg,150);};
const noOverflow=pg=>pg.evaluate(()=>{const hb=document.getElementById('homeBody');return document.documentElement.scrollWidth<=window.innerWidth+1&&(!hb||hb.scrollWidth<=hb.clientWidth+1);});
const OVF=[];const ovf=async(pg,tag)=>{if(!(await noOverflow(pg)))OVF.push(tag);};

// ── 0) un vrai plan de chantier (fabriqué par le traceur, sans compte) servi par le serveur simulé pour Alpha et Beta
{const ctx=await browser.newContext({viewport:{width:900,height:900}});const pg=await ctx.newPage();pg.on('pageerror',e=>logs.push('traceur PAGEERROR: '+e.message.slice(0,200)));
  await ctx.route(u=>u.href.startsWith(SB),r=>r.fulfill({status:200,contentType:'application/json',headers:CORS,body:'[]'}));
  await pg.goto(BASE+'/traceur.html');await W(pg,500);await pg.evaluate(()=>{localStorage.clear();});await pg.reload();await W(pg,500);
  await pg.evaluate(()=>{const S=window.MAQ.state;S.supplier='AXIOM';S.lines=[{id:'L1',name:'Feeder fictif',dn:100,bar:12,pts:[[10,50],[60,50]],specials:[],parent:null}];S.seq=2;window.MAQ.setMode('select');window.MAQ.rebuild();});
  await pg.click('#bSave');await W(pg,200);await pg.fill('#svName','Plan fictif');await pg.click('#svOk');await W(pg,600);await pg.click('#svGo');await W(pg,1500);
  const NET=await pg.evaluate(()=>{const T=window.TRACE;const id=T.state.siteId;return JSON.parse(JSON.stringify(T.sites[id]));});await ctx.close();
  Object.entries(SITE_META).forEach(([id,m])=>{const d=Object.assign({},NET,{id,name:m.name,fiche:{chef:CHEF.email,conducteur:COND.email,ville:m.ville,secteur:'ouest'},sent:true});delete d.handoff;SITE[id]={id,name:m.name,supplier:'AXIOM',data:d,updated_at:'2026-10-10T08:00:00Z'};});
  R.net=!!(NET&&NET.lines&&NET.lines.length);}
// planning de départ (serveur) : Bruno sur Alpha lundi et aujourd'hui (le reste de la semaine libre) ; le chef Jean sur Alpha toute la semaine
PLAN[WEEK]={week:WEEK,data:{aff:{[COMP.email]:{[MONDAY]:['SRV_A'],[TODAY]:['SRV_A']},[CHEF.email]:Object.fromEntries(['2026-10-12','2026-10-13','2026-10-14','2026-10-15','2026-10-16'].map(d=>[d,['SRV_A']]))}},updated_at:'2026-10-10T08:00:00Z'};

PTS[COMP.email+'|'+MONDAY]={p:COMP.email,d:MONDAY,site:'SRV_A',events:[{t:'start',at:MONDAY+'T07:30'},{t:'pause',at:MONDAY+'T12:00'},{t:'resume',at:MONDAY+'T12:45'},{t:'end',at:MONDAY+'T16:30'}],status:'valide',val:[{by:CHEF.email,at:MONDAY+'T17:00'},{by:COND.email,at:MONDAY+'T18:00'}],corr:null,updated_at:'2026-10-12T18:00:00Z'}; /* lundi : pointé et déjà validé deux fois */
// ── connexions : le compagnon (téléphone), le chef et la conductrice (ordinateurs) — ouverts en même temps
const Cp=await mkCtx(COMP,{width:390,height:844},true);await login(Cp.page,COMP.email);
const Ch=await mkCtx(CHEF,{width:1100,height:900});await login(Ch.page,CHEF.email);
const Co=await mkCtx(COND,{width:1100,height:900});await login(Co.page,COND.email);
for(const P of [Cp,Ch,Co])await home(P.page,'htHome');

// ── 1) POINTAGE → VALIDATION : Bruno pointe sa journée (début, pause, reprise, fin) → le chef voit « 1 pointage à valider » sans recharger → le lien mène à la
//       validation → il valide → Bruno voit « validée » ; la conductrice ne le voit qu'APRÈS le chef (2e étape) → elle valide → Bruno voit « Validé par le conducteur »
let out={card0:await Cp.page.evaluate(()=>!!document.querySelector('#eq-app [data-act=pointer][data-v=start]'))};
for(const k of ['start','pause','resume','end'])await tapAct(Cp.page,'pointer',k,350);
await W(Cp.page,1200);const PK=COMP.email+'|'+TODAY;out.srv=PTS[PK]&&{st:PTS[PK].status,ev:PTS[PK].events.map(e=>e.t).join(),site:PTS[PK].site};
out.cardFin=await Cp.page.evaluate(()=>{const c=document.querySelector('#eq-app .ptc');return c?c.textContent.replace(/\s+/g,' '):'';});
out.chefSeen=await until(Ch.page,()=>[...document.querySelectorAll('#eq-app [data-act=notif]')].map(x=>x.textContent.replace(/\s+/g,' ')).find(t=>/pointage.* à valider/.test(t))||null);
out.condAvant=(await notifs(Co.page)).filter(t=>/pointage.* à valider/.test(t)); /* 2e étape : pas avant le chef */
out.chefLink=await clickNotif(Ch.page,/pointage.* à valider/);await W(Ch.page,600);
out.chefLanded=await Ch.page.evaluate(k=>({tab:window.TRACE.state.homeTab,btn:!!document.querySelector(`#eq-app [data-act=valider][data-v="${k}"]`),head:((document.querySelector('#eq-app .card h3')||{}).textContent||'').replace(/\s+/g,' ')}),PK);
await tapAct(Ch.page,'valider',PK,800);await W(Ch.page,1200);out.srv2=PTS[PK]&&{st:PTS[PK].status,val:(PTS[PK].val||[]).map(v=>v.by)};
await home(Ch.page,'htHome');out.chefApres=(await notifs(Ch.page)).filter(t=>/pointage.* à valider/.test(t));
out.compVal=await until(Cp.page,()=>{const c=document.querySelector('#eq-app .ptc');const t=c?c.textContent.replace(/\s+/g,' '):'';return /validée/.test(t)?t:null;});
out.condSeen=await until(Co.page,()=>[...document.querySelectorAll('#eq-app [data-act=notif]')].map(x=>x.textContent.replace(/\s+/g,' ')).find(t=>/pointage.* à valider/.test(t))||null);
await home(Co.page,'htEq');out.condHub=await Co.page.evaluate(()=>{const k=[...document.querySelectorAll('#eq-app .eq-kpi')].find(x=>/pointages à valider/.test(x.textContent));const r=[...document.querySelectorAll('#eq-app .ac-row')].find(x=>/Pointages à valider/.test(x.textContent));return {kpi:k?k.textContent.replace(/\s+/g,' ').trim():'',row:r?r.textContent.replace(/\s+/g,' ').trim():''};}); /* compteurs du hub Équipes */
await home(Co.page,'htHome');out.condTous=(await notifs(Co.page)).filter(t=>/pointage/.test(t));out.condLink=await clickNotif(Co.page,/pointage.* à valider/);await W(Co.page,600);
out.condLanded=await Co.page.evaluate(k=>({tab:window.TRACE.state.homeTab,btn:!!document.querySelector(`#eq-app [data-act=valider][data-v="${k}"]`)}),PK);
await tapAct(Co.page,'valider',PK,800);await W(Co.page,1200);out.srv3=PTS[PK]&&{st:PTS[PK].status,val:(PTS[PK].val||[]).map(v=>v.by)};
await home(Co.page,'htHome');out.condApres=(await notifs(Co.page)).filter(t=>/pointage.* à valider/.test(t));
await home(Cp.page,'htEspace');await tapAct(Cp.page,'sub','heures',500);
out.compFinal=await until(Cp.page,()=>/Validé par le conducteur/.test(document.getElementById('eq-app').textContent)?true:null);
await ovf(Cp.page,'heures');
console.log('1) pointage → validation :',JSON.stringify(out));
C.c1_pointage=out.card0&&out.srv&&out.srv.ev==='start,pause,resume,end'&&out.srv.site==='SRV_A'&&/Journée finie/.test(out.cardFin)&&/envoyée pour validation/.test(out.cardFin)
  &&/(^|\W)1 pointage à valider/.test(out.chefSeen||'')&&!out.condAvant.length&&out.chefLink&&out.chefLanded.tab==='expl'&&out.chefLanded.btn&&/1 à valider/.test(out.chefLanded.head)
  &&out.srv2&&out.srv2.st==='valide'&&out.srv2.val.join()===CHEF.email&&!out.chefApres.length&&!!out.compVal
  &&/(^|\W)1 pointage à valider/.test(out.condSeen||'')&&out.condLink&&out.condLanded.tab==='expl'&&out.condLanded.btn&&out.condTous.length===1&&/^1\s*pointages à valider/.test(out.condHub.kpi)&&/Pointages à valider.*1$/.test(out.condHub.row)
  &&out.srv3&&out.srv3.val.join()===CHEF.email+','+COND.email&&!out.condApres.length&&!!out.compFinal;

// ── 2) PLANNING : la conductrice (le chef de chantier n'a pas « planning » par défaut : planning imposé) place Bruno sur Beta → demain (et les jours libres) ;
//       Bruno, resté sur Moi → Planning, voit sa semaine changer sans recharger
await tapAct(Cp.page,'sub','planning',500);
const tile=pg=>pg.evaluate(d=>{const t=document.querySelector(`#eq-app [data-act=planjour][data-v="${d}"]`);return t?t.textContent.replace(/\s+/g,' ').trim():null;},TOMORROW);
out={avant:await tile(Cp.page)};
await home(Co.page,'htEq');await hubRow(Co.page,/Planning des équipes/);
await tapAct(Co.page,'plsel',COMP.email,400);await tapAct(Co.page,'plput','SRV_B',800);await W(Co.page,1200);
out.srv=((PLAN[WEEK].data.aff[COMP.email])||{})[TOMORROW];out.toast=await Co.page.evaluate(()=>(document.getElementById('toast')||{}).textContent||'');
out.apres=await until(Cp.page,d=>{const t=document.querySelector(`#eq-app [data-act=planjour][data-v="${d}"]`);const s=t?t.textContent.replace(/\s+/g,' ').trim():'';return /Beta/.test(s)?s:null;},TOMORROW);
out.today=await Cp.page.evaluate(d=>{const t=document.querySelector(`#eq-app [data-act=planjour][data-v="${d}"]`);return t?t.textContent.replace(/\s+/g,' ').trim():'';},TODAY);
await ovf(Cp.page,'planning');
console.log('2) planning :',JSON.stringify(out));
C.c2_planning=!/Beta/.test(out.avant||'')&&Array.isArray(out.srv)&&out.srv.join()==='SRV_B'&&!!out.apres&&/Alpha/.test(out.today);

// ── 5) OBJECTIF DU JOUR : le chef pose un objectif sur son chantier (Équipes → Objectifs des équipes) → Bruno le voit sur son accueil (« À faire » + héros) sans recharger.
//       Le chef doit avoir le plan du chantier sur son appareil (bouton « ➕ Objectif » seulement dans ce cas) : il ouvre Alpha puis revient.
//       5a : Bruno n'a JAMAIS ouvert Alpha sur son téléphone ; le lien ouvre le chantier. 5b : 2e objectif, Bruno a maintenant le chantier sur son téléphone.
await home(Cp.page,'htHome');await fake(Ch.page,'opensite','SRV_A',400);out={chefOpen:await until(Ch.page,()=>window.TRACE.state.screen==='site'&&window.TRACE.state.siteId==='SRV_A'?true:null,null,15000)};
await Ch.page.evaluate(()=>document.getElementById('btnHome').click());await W(Ch.page,500);await home(Ch.page,'htEq');await hubRow(Ch.page,/Objectifs des équipes/);
const poseObj=async label=>{const b=await Ch.page.evaluate(()=>[...document.querySelectorAll('#eq-app [data-act=objadd]')].map(b=>b.dataset.v).filter(Boolean));if(!b.length)return b;await tapAct(Ch.page,'objadd',b[0],500);await Ch.page.evaluate(l=>{document.getElementById('obj-label').value=l;document.getElementById('obj-h').value='6';},label);await tapAct(Ch.page,'objok','SRV_A',800);await W(Ch.page,1500);return b;};
out.compLocal0=await Cp.page.evaluate(()=>!!(window.TRACE.sites.SRV_A&&window.TRACE.sites.SRV_A.lines));
out.addBtn=await poseObj('Souder le tronçon fictif 1');
out.srv=((SITE.SRV_A.data.missions||{})[TODAY]||[]).map(m=>m.label);
out.compNotif=await until(Cp.page,()=>[...document.querySelectorAll('#eq-app [data-act=notif]')].map(x=>x.textContent.replace(/\s+/g,' ')).find(t=>/Objectif du jour/.test(t))||null,null,16000);
out.compHero=await Cp.page.evaluate(()=>{const o=document.querySelector('#eq-app .ac-obj');return o?o.textContent.replace(/\s+/g,' '):'';});
if(out.compNotif){out.link=await clickNotif(Cp.page,/Objectif du jour/);out.landed=await until(Cp.page,()=>window.TRACE.state.screen==='site'?{site:window.TRACE.state.siteId,tab:window.TRACE.state.tab}:null,null,12000);await W(Cp.page,600);await Cp.page.evaluate(()=>{const b=document.getElementById('btnHome');if(b)b.click();});await W(Cp.page,500);await home(Cp.page,'htHome');}
out.compLocal1=await Cp.page.evaluate(()=>!!(window.TRACE.sites.SRV_A&&window.TRACE.sites.SRV_A.lines));
await poseObj('Décharger le camion fictif');out.srv2=((SITE.SRV_A.data.missions||{})[TODAY]||[]).map(m=>m.label);
out.compNotif2=await until(Cp.page,()=>[...document.querySelectorAll('#eq-app [data-act=notif]')].map(x=>x.textContent.replace(/\s+/g,' ')).find(t=>/Objectif du jour.*Décharger le camion fictif/.test(t))||null,null,16000);
out.ov=await noOverflow(Cp.page);
console.log('5) objectif du jour :',JSON.stringify(out));
C.c5_objectif=out.chefOpen&&out.addBtn.length>0&&!out.compLocal0&&out.srv.includes('Souder le tronçon fictif 1')&&/Souder le tronçon fictif 1/.test(out.compNotif||'')&&/Souder le tronçon fictif 1/.test(out.compHero)&&out.link&&out.landed&&out.landed.site==='SRV_A'
  &&out.compLocal1&&out.srv2.length===2&&/Souder le tronçon fictif 1/.test(out.compNotif2||'')&&out.ov;

// ── 3) QUART D'HEURE SÉCURITÉ : la conductrice déclenche (Sécurité → Quart d'heure sécurité, ses chantiers, aujourd'hui) → Bruno a « Quart d'heure sécurité à faire »
//       → le lien ouvre le chantier (onglet QSE) et le parcours → sujet déroulé, vrai / faux, signature → l'animatrice voit l'émargement ; la tâche disparaît
await home(Cp.page,'htHome');
await home(Co.page,'htSecu');await hubRow(Co.page,/Quart d'heure sécurité/);
out={kpi0:await Co.page.evaluate(()=>((document.querySelector('#eq-app .eq-kpi')||{}).textContent||'').replace(/\s+/g,' '))};
await tap(Co.page,'#eq-app [data-act=qhsnew]',500);
out.modal=await Co.page.evaluate(()=>({open:document.getElementById('modal').classList.contains('show'),mine:!!document.querySelector('#modal input[name=qh-where][value=mine]:checked')}));
await Co.page.evaluate(()=>document.getElementById('qh-ok').click());await W(Co.page,1500);
const RUN=Object.values(REG).find(r=>r.kind==='qhs');out.run=RUN&&{date:RUN.data.date,sites:RUN.data.sites.join(),by:RUN.data.by};
out.seen=await until(Cp.page,()=>[...document.querySelectorAll('#eq-app [data-act=notif]')].map(x=>x.textContent.replace(/\s+/g,' ')).find(t=>/Quart d'heure sécurité à faire/.test(t))||null);
out.link=await clickNotif(Cp.page,/Quart d'heure sécurité à faire/);
out.opened=await until(Cp.page,()=>{const T=window.TRACE;return T.state.screen==='site'&&document.getElementById('modal').classList.contains('show')&&document.getElementById('qh-body')?{site:T.state.siteId,tab:T.state.tab}:null;},null,15000);
if(out.opened){await Cp.page.evaluate(()=>{const b=document.getElementById('qh-body');b.scrollTop=b.scrollHeight;b.dispatchEvent(new Event('scroll'));});await W(Cp.page,300);
  out.readOk=await Cp.page.evaluate(()=>!document.getElementById('qh-read').disabled);await Cp.page.evaluate(()=>document.getElementById('qh-read').click());await W(Cp.page,300);
  for(let i=0;i<30;i++){const n=await Cp.page.evaluate(()=>{const b=[...document.querySelectorAll('#modal [data-qhv]')].find(x=>x.dataset.qhv.endsWith('|V')&&!x.closest('.qh-q').classList.contains('ok')&&!x.closest('.qh-q').classList.contains('ko'));if(!b)return 0;b.click();return 1;});if(!n)break;await W(Cp.page,120);}
  await Cp.page.evaluate(()=>document.getElementById('qh-next').click());await W(Cp.page,300);await draw(Cp.page,'qh-pad');await Cp.page.evaluate(()=>document.getElementById('qh-sign').click());await W(Cp.page,1500);}
const SIG=RUN&&REG['qhsig|'+RUN.id+'|'+COMP.email];out.sig=SIG&&{site:SIG.data.site,name:SIG.data.name,img:/^data:image\/png/.test(SIG.data.img||''),total:SIG.data.total};
out.qse=await Cp.page.evaluate(()=>/Tu as participé/.test((document.getElementById('qse')||{textContent:''}).textContent));await ovf(Cp.page,'qse');
await Cp.page.evaluate(()=>document.getElementById('btnHome').click());await W(Cp.page,600);await home(Cp.page,'htHome');
out.goneComp=!(await notifs(Cp.page)).some(t=>/Quart d'heure sécurité à faire/.test(t));
out.anim=await until(Co.page,()=>{const r=[...document.querySelectorAll('#eq-app table.rc tr')].find(x=>/TESTCONDUC|Claire/.test(x.textContent));if(!r)return null;const n=r.querySelector('td:last-child b');return n&&n.textContent==='1'?r.textContent.replace(/\s+/g,' '):null;});
console.log('3) quart d\'heure sécurité :',JSON.stringify(out));
C.c3_qhs=out.modal.open&&out.modal.mine&&out.run&&out.run.date===TODAY&&/SRV_A/.test(out.run.sites)&&!!out.seen&&out.link&&out.opened&&out.opened.site==='SRV_A'&&out.opened.tab==='qse'&&out.readOk
  &&out.sig&&out.sig.site==='SRV_A'&&out.sig.img&&out.sig.total>0&&out.qse&&out.goneComp&&!!out.anim;

await Ch.ctx.close();await Co.ctx.close();

// ── 4) REMISE DE VÉHICULE INCOMPLÈTE : la responsable flotte remet un véhicule à Bruno, « le conducteur signera plus tard » → Bruno voit « À lire et signer : charte… »
//       sans recharger → il lit et signe sur son téléphone → la responsable, restée sur la fiche du véhicule, voit la remise devenir complète sans recharger
const IMMAT='TE-777-ST';/* véhicule fictif */REG['vehicule|'+IMMAT]={kind:'vehicule',id:IMMAT,data:{immat:IMMAT,marque:'FICTIF',modele:'FOURGON TEST',type:'Soudeur',agence:'OUEST',n:'77',km:12000,cadenceVidange:30000,kmVidange:5000},updated_at:'2026-10-10T08:00:00Z'};
const lignes=Array.from({length:28},(_,i)=>'- Règle fictive numéro '+(i+1)+' : texte de test sans valeur.').join('\n');
const PACK={vehicule:{reception:{version:'test-14/10',
  etatDesLieux:{releves:[{id:'km',label:'Kilométrage',type:'nombre',unite:'km',obligatoire:true},{id:'kmRestantVidange',label:'KM restant vidange',type:'nombre',unite:'km'},{id:'nivHuile',label:'Huile',type:'choix',choix:['Ok','Non ok'],groupe:'Niveaux'},{id:'nivFrein',label:'Liquide de frein',type:'choix',choix:['Ok','Non ok'],groupe:'Niveaux'},{id:'carburant',label:'Niveau de carburant',type:'choix',choix:['Réserve','1/2','Plein'],obligatoire:false}],
    controles:[{id:'pneus',label:'Pneus',type:'choix',choix:['Ok','Non ok']},{id:'feux',label:'Feux',type:'choix',choix:['Ok','Non ok']}],
    documentsABord:[{id:'docGrise',label:'Carte grise',type:'choix',choix:['Ok','Non ok']},{id:'docAssur',label:'Assurance',type:'choix',choix:['Ok','Non ok']}],
    equipement:{champs:[{id:'posteType',label:'Poste : type',type:'texte'}]},
    zones:[{id:'avant',label:'Face avant'},{id:'arriere',label:'Face arrière'},{id:'gauche',label:'Côté gauche'},{id:'droit',label:'Côté droit'}],
    photosDetail:[{id:'avant',label:'Face avant',obligatoire:true},{id:'arriere',label:'Face arrière',obligatoire:true},{id:'gauche',label:'Côté gauche',obligatoire:true},{id:'droit',label:'Côté droit',obligatoire:true},{id:'compteur',label:'Compteur',obligatoire:false},{id:'impacts',label:'Impacts',multiple:true}]},
  inventaire:{parMetier:{soudeur:[{id:'a1',designation:'Meuleuse fictive 125',qte:2},{id:'a2',designation:'Rallonge fictive 25 m',qte:1},{id:'a3',designation:'Boîte de disques test',qte:1,unite:'boîte',qteSource:'1 bte'}],chef:[]},
    commun:[{id:'c1',designation:'Trousse test',qte:1,pour:'tous'},{id:'c2',designation:'Extincteur test',qte:1,pour:'service'}],modeles:{soudeur:{titre:'MATÉRIEL TEST SOUDEUR'}}},
  dispositifs:{champs:[{id:'carteVehicule',label:'Carte carburant test',type:'dispositif',pour:'tous'},{id:'telebadge',label:'Badge test',type:'dispositif',pour:'tous'},{id:'cles',label:'Clés',type:'nombre'}],engagements:['Engagement fictif numéro un.','Engagement fictif numéro deux.']},
  documents:[{id:'charte_service',titre:'Charte test service',pour:'service',texte:'textes/charte_service_test.txt',version:'test'},{id:'charte_fonction',titre:'Charte test fonction',pour:'fonction',texte:'textes/charte_fonction_test.txt'}],
  correspondanceTypesAppli:{Soudeur:{charte:'charte_service',inventaire:'soudeur'},Fonction:{charte:'charte_fonction',inventaire:null}}},
 entretien:{modalitesEntretien:{auQuotidien:['Vérifier les niveaux (test).']}},
 textes:{'charte_service_test.txt':'# Charte test service\n\n## Règles\n\n'+lignes+'\n\n## Engagement\n\nJe soussigné : {{conducteur}}, atteste avoir lu la charte de test.\n\nLe : {{date}} — à : {{lieu}}\n\nVisa : {{signature_conducteur}}\n','charte_fonction_test.txt':'# Charte test fonction\n\n- Règle fictive.\n\nVisa : {{signature_conducteur}}\n'}}};
const PNG=Buffer.from('iVBORw0KGgoAAAANSUhEUgAAABAAAAAMCAIAAADkharWAAABU0lEQVR4nA3LIQHFIBRAUSIgCDCJJACCCC/CBAGQVy4AgggvwgQBJpEEQBCBCP8ff4wxWMNlCIZkEMNtKIbH0AxqeA2fYRq24RiMcVjH5QiO5BDH7SiOx9Ec6ngdn2M6tuO4f/BYz+UJnuQRz+0pnsfTPOp5PZ9nerbn+H+I2MgVCZEUkcgdKZEn0iIaeSNfZEZ25MR/EKxwCUFIggi3UIRHaIIKr/AJU9jCkX/I2MyVCZmUkcydKZkn0zKaeTNfZmZ25uR/AAsXBEggcEOBBxoovPDBhA2Hf6jYylUJlVSRyl0plafSKlp5K19lVnbl1H9QrHIpQUmKKLdSlEdpiiqv8ilT2crRf+jYztUJndSRzt0pnafTOtp5O19ndnbn9H8Y2ME1CIM0kME9KINn0AY6eAffYA724Ix/WNjFtQiLtJDFvSiLZ9EWungX32Iu9uIsflUEBpBsGbC5AAAAAElFTkSuQmCC','base64');
// l'administrateur importe le pack véhicule FICTIF (une fois)
const Ad=await mkCtx(ADM,{width:1100,height:900});await login(Ad.page,ADM.email);
const fiche=async pg=>{await pg.evaluate(async im=>{const T=window.TRACE;if(T.state.screen!=='home'){const b=document.getElementById('btnHome');if(b)b.click();await new Promise(r=>setTimeout(r,300));}document.getElementById('htParc').click();await new Promise(r=>setTimeout(r,300));
  const bk=document.querySelector('#eq-app .ac-back[data-act="xsub"]');if(bk){bk.click();await new Promise(r=>setTimeout(r,250));}
  const sg=document.querySelector('#eq-app [data-act=parcseg][data-v=flotte]');if(sg){sg.click();await new Promise(r=>setTimeout(r,200));}
  const o=document.querySelector(`#eq-app [data-act=fl][data-v="open|${im}"]`);if(o){o.click();await new Promise(r=>setTimeout(r,250));}},IMMAT);await W(pg,200);};
await fiche(Ad.page);await tap(Ad.page,'#eq-app [data-act=x][data-v="veh|cfg|"]',400);
await Ad.page.setInputFiles('#eq-app input[data-xin="veh|packfile"]',{name:'pack_test.json',mimeType:'application/json',buffer:Buffer.from(JSON.stringify(PACK))});await W(Ad.page,1500);
await Ad.page.waitForFunction(()=>window.TRACE.reg.pending().length===0,null,{timeout:15000}).catch(()=>{});out={cfg:!!REG['vcfg|config']};await Ad.ctx.close();
// la responsable flotte : remise au téléphone de Bruno… depuis son ordinateur, charte « plus tard »
const Fl=await mkCtx(FLOT,{width:1100,height:900});await login(Fl.page,FLOT.email);const pg=Fl.page;
const vx=a=>`#eq-app [data-act=x][data-v="veh|${a}"]`;const title=()=>pg.evaluate(()=>(document.querySelector('#eq-app .veh-h')||{}).textContent||'');
const fill=async(sel,val)=>{await pg.evaluate(([s,v])=>{const el=document.querySelector(s);if(!el)throw new Error('absent : '+s);el.value=v;el.dispatchEvent(new Event('input',{bubbles:true}));el.dispatchEvent(new Event('change',{bubbles:true}));},[sel,val]);await W(pg,120);};
const next=async()=>{await tap(pg,'#veh-next',300);};
const photo=async k=>{await pg.setInputFiles(`#eq-app input[data-xin="veh|photo~${k}"]`,{name:k+'.png',mimeType:'image/png',buffer:PNG});await pg.waitForFunction(k=>{const i=document.querySelector(`#eq-app input[data-xin="veh|photo~${k}"]`);return !!(i&&i.closest('label.ok'));},k,{timeout:10000});await W(pg,120);};
await fiche(pg);await tap(pg,vx('recep|'+IMMAT),400);out.titles=[await title()];
await fill('#eq-app [data-xin="veh|q"]','Bruno');await tap(pg,`#eq-app [data-act=x][data-v="veh|cond|${COMP.email}"]`);await next();
await tap(pg,vx('permis|'));await fill('#eq-app [data-xin="veh|permisFin"]','2031-05-01');await next();
await fill('#veh-km','12050');await tap(pg,'#eq-app .veh-allok');await next();
await tap(pg,`#eq-app .veh-allok[data-v^="veh|allok|ctl"]`);await tap(pg,`#eq-app .veh-allok[data-v^="veh|allok|doc"]`);await next();
for(const k of ['avant','arriere','gauche','droit'])await photo(k);await next();
await next(); /* inventaire conforme */
await fill('#eq-app [data-xin="veh|carteNum~carteVehicule"]','TEST-CV-0777');await fill('#eq-app [data-xin="veh|carteNum~telebadge"]','TEST-TB-77');await fill('#eq-app [data-xin="veh|cles"]','2');await tap(pg,vx('consignes|'));await next();
out.titles.push(await title());await tap(pg,vx('later|'));await next();
out.titles.push(await title());await draw(pg,'veh-pad-c');await draw(pg,'veh-pad-r');await next();await W(pg,600);
out.done=/Remise enregistrée/.test(await txt(pg));await pg.waitForFunction(()=>window.TRACE.reg.pending().length===0,null,{timeout:15000}).catch(()=>{});
const REC=Object.values(REG).filter(r=>r.kind==='vrec').pop();out.rec=REC&&{complete:REC.data.complete,manque:(REC.data.manque||[]).join(),cond:REC.data.conducteurKey};
await tap(pg,'#eq-app [data-act=xsub]',400); /* retour à la fiche du véhicule : la responsable y reste */
out.ficheAvant=await pg.evaluate(()=>{const c=document.querySelector('#eq-app .veh-card');return c?c.textContent.replace(/\s+/g,' '):'';});
// Bruno (téléphone, resté sur son accueil depuis le début) : la charte arrive dans « À faire » sans recharger
out.seen=await until(Cp.page,im=>[...document.querySelectorAll('#eq-app [data-act=notif]')].map(x=>x.textContent.replace(/\s+/g,' ')).find(t=>new RegExp('À lire et signer : charte du véhicule '+im).test(t))||null,IMMAT);
out.first=await Cp.page.evaluate(()=>{const n=document.querySelector('#eq-app [data-act=notif]');return n?n.textContent.replace(/\s+/g,' ').slice(0,80):'';});
out.link=await clickNotif(Cp.page,/charte du véhicule/);await W(Cp.page,500);
out.modal=await Cp.page.evaluate(()=>{const m=document.getElementById('modal');return {open:m.classList.contains('show'),t:(m.querySelector('h3')||{}).textContent||'',gate:!!(document.getElementById('vc-read')&&document.getElementById('vc-read').disabled)};});
await Cp.page.evaluate(()=>{const b=document.getElementById('vc-body');b.scrollTop=b.scrollHeight;b.dispatchEvent(new Event('scroll'));});await W(Cp.page,300);await Cp.page.evaluate(()=>document.getElementById('vc-read').click());await W(Cp.page,200);
await draw(Cp.page,'vc-pad');await Cp.page.evaluate(()=>document.getElementById('vc-ok').click());await W(Cp.page,1800);
const DS=Object.values(REG).find(r=>r.kind==='docsig'&&r.id.endsWith('|'+COMP.email)&&/vcharte/.test(r.id));out.docsig=DS&&{by:DS.by,img:/^data:image\/png/.test(DS.data.img||'')};
out.goneComp=!(await notifs(Cp.page)).some(t=>/charte du véhicule/.test(t));await ovf(Cp.page,'charte');
out.ficheApres=await until(pg,()=>{const c=document.querySelector('#eq-app .veh-card');const t=c?c.textContent.replace(/\s+/g,' '):'';return /remise complète/.test(t)?t:null;});
await pg.evaluate(async()=>{const b=document.querySelector('#eq-app [data-act=fl][data-v="back|"]');if(b)b.click();await new Promise(r=>setTimeout(r,300));});
out.liste=await pg.evaluate(im=>{const r=[...document.querySelectorAll('#eq-app .fl-row')].find(x=>x.textContent.includes(im));return r?r.textContent.replace(/\s+/g,' '):null;},IMMAT);
await home(pg,'htHome');out.flotteNotif=(await notifs(pg)).filter(t=>/Remise|remise|charte/.test(t));
console.log('4) remise incomplète → charte signée au téléphone :',JSON.stringify(out));
C.c4_vehicule=out.cfg&&out.done&&out.rec&&out.rec.complete===false&&out.rec.manque==='charte'&&out.rec.cond===COMP.email&&/incomplète : charte non signée/.test(out.ficheAvant)
  &&!!out.seen&&out.link&&out.modal.open&&/Charte test service/.test(out.modal.t)&&out.modal.gate&&out.docsig&&out.docsig.by===COMP.email&&out.docsig.img&&out.goneComp
  &&!!out.ficheApres&&!/incomplète/.test(out.ficheApres)&&out.liste&&!/Remise incomplète/.test(out.liste)&&!out.flotteNotif.length;
await Fl.ctx.close();

// ── fin : téléphone sans débordement, pas d'erreur console
await home(Cp.page,'htHome');await ovf(Cp.page,'accueil fin');await home(Cp.page,'htEspace');await ovf(Cp.page,'moi fin');
await Cp.ctx.close();
console.log('débordements (390 px) :',OVF.length?OVF:'aucun');C.c6_390=!OVF.length;C.c7_console=!logs.length;
const bad=Object.entries(C).filter(([k,v])=>!v).map(([k])=>k);
console.log('infos :',JSON.stringify(R));
console.log(bad.length?'RESULTAT: ECHEC '+bad.join(','):'RESULTAT: TOUT VERT');console.log(logs.length?logs:'[]');
await browser.close();
