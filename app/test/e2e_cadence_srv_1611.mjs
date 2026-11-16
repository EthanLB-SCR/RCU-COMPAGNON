// e2e_cadence_srv_1611 — 16/11/2026 (lot CA) : la cadence AVEC LE SERVEUR (simulé, harnais de e2e_val_1011) — plusieurs appareils, vraies règles d'écriture.
// Personnages et chantier FICTIFS ; base de prix fictive test/fixture_prix.xlsx. Mercredi 18/11/2026 ; semaine 46 : Hugo (soudeur) + Théo (tuyauteur) équipe A,
// 4 × 10 h, 41 soudures DN 100 → 41 h / 40 h ; Marc (manchonneur) équipe B, 18 manchons + 18 fils DH → 36,9 h / 40 h ; semaine 47 : Hugo 17 soudures + 1 point SST → 19 h / 20 h.
//  v0  Ana (administratrice, PC) importe la base et publie : par défaut un ESSAI « encadrement seulement » — le soudeur ne voit rien, la cheffe si
//  v1  elle choisit « les équipes aussi » et republie → réglage partagé « cadences_prod » écrit par admin_set_setting, sans aucun prix. Le plan du chantier
//      n'est pas encore sur son PC (jamais ouvert) : RIEN n'est figé (pas de calcul partiel), le tableau par équipe dit « ? incomplet » et propose d'ouvrir le chantier
//  v1b elle ouvre le chantier une fois → son appareil fige la semaine 46 : people_set_part « compteurs » pour Hugo, Théo, Marc — seulement la semaine qui change
//      (la semaine 40 déjà au serveur n'est pas renvoyée, elle reste)
//  v2  Hugo (soudeur, téléphone 390) : il n'a PAS la base de prix (réservée à l'encadrement). Plan pas encore sur son téléphone : « Calcul incomplet », bouton « Ouvrir » ;
//      chantier ouvert → carte « ⚡ Cadence » : 19 h / 20 h en dessous, série 2 (S40 + S46), 264 pouces ; détail jour par jour ; son téléphone n'écrit aucun compteur
//  v3  Chloé (cheffe de chantier) : colonne « ⚡ Débloqué » dans Production par équipe ; son appareil trouve les mêmes chiffres : aucune écriture
//  v4  Denis (conducteur) dont le rôle serveur n'est pas à jour : le serveur refuse les compteurs → une seule tentative, rien en attente, pas de message, on n'insiste pas
//  v5  le pointage de jeudi est corrigé (11 h) → Ana (appli rouverte) refige : seule la semaine 46 d'Hugo est réécrite (41 h / 41 h)
//  v5b un autre appareil réécrit autre chose par-dessus : celui d'Ana n'insiste pas (pas d'aller-retour sans fin entre deux appareils)
//  v6  Chloé (pas administratrice) ne peut pas publier ; Ana suspend → Hugo (appli rouverte) n'a plus la carte ; v7 console propre, aucune écriture refusée en dehors de v4
import { chromium } from 'playwright';
import fs from 'fs';import path from 'path';import {fileURLToPath} from 'url';
const HERE=path.dirname(fileURLToPath(import.meta.url));
const BASE=process.env.BASE||'http://127.0.0.1:8832';const SHOTS=process.env.SHOTS||'';if(SHOTS)fs.mkdirSync(SHOTS,{recursive:true});
const SB='https://pghftlepduvfazbiavhq.supabase.co';
const b64u=o=>Buffer.from(JSON.stringify(o)).toString('base64').replace(/=+$/,'').replace(/\+/g,'-').replace(/\//g,'_');
const mk=(n,prenom,nom,poste,role)=>({id:'0000000'+n+'-aaaa-4aaa-8aaa-00000000000'+n,email:(prenom+'.'+nom).toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g,'')+'@exemple.fr',prenom,nom,poste,role,admin:false});
const SOUD=mk(1,'Hugo','TESTSOUDEUR','soudeur','soudeur'),TUY=mk(2,'Théo','TESTTUYAU','tuyauteur','tuyauteur'),MAN=mk(3,'Marc','TESTMANCHON','manchonneur','manchonneur'),
  NEUF=mk(4,'Lucas','TESTNOUVEAU','soudeur','soudeur'),CHEF=mk(5,'Chloé','TESTCHEF','chef','chef'),COND=mk(6,'Denis','TESTCONDUC','conducteur','chef'),BUR=mk(7,'Béa','TESTBUREAU','assist_rh','bureau'),INT=mk(8,'Nina','TESTINTERIM','soudeur','soudeur');
const ADM=Object.assign(mk(9,'Ana','TESTADMIN','resp_exploit','bureau'),{admin:true});
const USERS=[SOUD,TUY,MAN,NEUF,CHEF,COND,BUR,INT,ADM];
const PROFILES=USERS.map(u=>({id:u.id,email:u.email,name:u.prenom+' '+u.nom,prenom:u.prenom,nom:u.nom,role:u.role,active:true,poste:u.poste,admin:u.admin,type:'salarie',rights:{},sites:null,created_at:'2026-10-01T09:00:00Z'}));
const REG={},PEOPLE={},PTS={},PLAN={},SITE={},SETTINGS={},WELDS=[];const UNKNOWN=new Set();const CALLS=[];const NOCOMPT=new Set(); /* CALLS : écritures de compteurs et de réglages reçues par le serveur simulé ; NOCOMPT : comptes à qui le serveur refuse les compteurs (rôle serveur pas à jour) */const REFUS=[];const OFFLINE=new Set(); /* téléphones « sans réseau » : le serveur simulé ne leur répond plus */const logs=[];const C={};const OVF=[];
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
    if(p==='/rest/v1/rpc/registre_set'&&UNKNOWN.has(b.p_kind))return json({code:'P0001',message:'registre inconnu : '+b.p_kind,details:null,hint:null},400); /* SQL pas encore passé */
    if(p==='/rest/v1/rpc/registre_set'){const k=b.p_kind+'|'+b.p_id;const old=(REG[k]||{}).data||{};const data=b.p_mode==='replace'?Object.assign({},b.p_patch||{}):Object.assign({},old,b.p_patch||{});Object.keys(b.p_patch||{}).forEach(x=>{if(b.p_patch[x]===null)delete data[x];});REG[k]={kind:b.p_kind,id:b.p_id,data,updated_at:nowIso(),by:U.email};return json(REG[k]);}
    if(p==='/rest/v1/registre')return json(flt(Object.values(REG).filter(r=>r.kind!=='prix'||U.admin||['chef','bureau'].includes(U.role)),u)); /* base de prix : encadrement seulement (comme le serveur) */
    if(p==='/rest/v1/welds'){if(req.method()!=='GET')return json([]);const rows=flt(WELDS,u);const leger=/steps:data->steps/.test(u.searchParams.get('select')||'');return json(rows.map(r=>leger?{weld_id:r.weld_id,line_id:r.line_id,cond:r.cond,status:r.status,steps:r.data.steps,events:r.data.events}:{weld_id:r.weld_id,line_id:r.line_id,cond:r.cond,status:r.status,data:r.data,updated_at:r.updated_at}));}
    if(p==='/rest/v1/rpc/admin_set_setting'){CALLS.push({by:U.prenom,rpc:'setting',key:b.p_key,ok:!!U.admin});if(!U.admin)return json({code:'P0001',message:'réservé à l\'administrateur',details:null,hint:null},400);SETTINGS[b.p_key]=b.p_value;return json(null);}
    if(p==='/rest/v1/rpc/people_set_part'){const mine=String(b.p_key||'').toLowerCase()===U.email;const mgr=(U.admin||['chef','bureau'].includes(U.role))&&!NOCOMPT.has(U.email); /* règle de sql/retours_12-10b.sql */
      if(b.p_part==='compteurs')CALLS.push({by:U.prenom,rpc:'compteurs',key:b.p_key,value:b.p_value,ok:mgr});
      if(['avatar','urgence','outlook'].includes(b.p_part)?!(mine||mgr):!mgr){REFUS.push(U.prenom+' : '+b.p_part);return json({code:'P0001',message:['avatar','urgence','outlook'].includes(b.p_part)?'réservé à la personne elle-même':'réservé au chef / bureau (RH)',details:null,hint:null},400);}
      const r=PEOPLE[b.p_key]||(PEOPLE[b.p_key]={key:b.p_key,data:{}});const old=r.data[b.p_part];const merge=['avatar','compteurs'].includes(b.p_part)&&old&&typeof old==='object'&&b.p_value&&typeof b.p_value==='object';const v=merge?Object.assign({},old,b.p_value):b.p_value;r.data=Object.assign({},r.data,{[b.p_part]:v});r.updated_at=nowIso();return json({at:r.updated_at,value:v});}
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
  try{if(ctx.routeWebSocket)await ctx.routeWebSocket(u=>u.href.indexOf('supabase.co')>=0,ws=>{try{ws.close();}catch(e){}});}catch(e){} /* temps réel : aucune connexion vers l'extérieur pendant le test */
  const page=await ctx.newPage();page.on('dialog',d=>d.accept().catch(()=>{}));
  page.on('pageerror',e=>logs.push(U.prenom+' PAGEERROR: '+e.message.slice(0,300)));page.on('console',m=>{if(m.type()==='error'&&!/realtime|websocket|Failed to fetch|net::ERR|404|400|open-meteo|geopf|geo\.api|status of 4\d\d|supabase/i.test(m.text()))logs.push(U.prenom+': '+m.text().slice(0,200));});
  return {ctx,page,U};}
const W=(pg,ms)=>pg.waitForTimeout(ms);
const TODAY='2026-11-18'; /* mercredi */
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
// ── données fictives : un vrai plan (traceur, sans compte) — une ligne DN 100 de 480 m, chaufferie → sous-station
{const ctx=await browser.newContext({viewport:{width:900,height:900}});const pg=await ctx.newPage();pg.on('pageerror',e=>logs.push('traceur PAGEERROR: '+e.message.slice(0,200)));
  await ctx.route(u=>u.href.startsWith(SB),r=>r.fulfill({status:200,contentType:'application/json',headers:CORS,body:'[]'}));
  await pg.goto(BASE+'/traceur.html');await W(pg,500);await pg.evaluate(()=>{localStorage.clear();});await pg.reload();await W(pg,500);
  await pg.evaluate(()=>{const S=window.MAQ.state;S.supplier='AXIOM';S.lines=[{id:'L1',name:'Feeder fictif',dn:100,bar:12,pts:[[10,50],[490,50]],specials:[],parent:null,startType:'chaufferie',endType:'sousstation'}];S.seq=2;window.MAQ.setMode('select');window.MAQ.rebuild();});
  await pg.click('#bSave');await W(pg,200);await pg.fill('#svName','Plan fictif');await pg.click('#svOk');await W(pg,700);await pg.click('#svGo');
  await pg.waitForFunction(()=>{const T=window.TRACE;if(!T||!T.state||!T.sites)return false;const n=T.sites[T.state.siteId];return !!(n&&n.name==='Plan fictif'&&n.lines&&n.lines[0]&&n.lines[0].cond&&n.lines[0].cond.A&&Array.isArray(n.lines[0].cond.A.welds)&&n.lines[0].cond.A.welds.length>10);},null,{timeout:40000}).catch(()=>{});await W(pg,600); /* le plan tracé est ouvert et construit (machine chargée : pas d'attente fixe) */
  const NET=await pg.evaluate(()=>{const T=window.TRACE;const id=T.state.siteId;return JSON.parse(JSON.stringify(T.sites[id]));});await ctx.close();
  const d=Object.assign({},NET,{id:'SRV_A',name:'Chantier fictif des Tilleuls',fiche:{ville:'Villefictive',secteur:'ouest',chef:CHEF.email,conducteur:COND.email,horaires:'7 h 30 – 18 h'},sent:true});delete d.handoff;SITE.SRV_A={id:'SRV_A',name:d.name,supplier:'AXIOM',data:d,updated_at:'2026-10-20T08:00:00Z'};
  C.c0_plan=!!(NET&&NET.lines&&NET.lines.length&&NET.lines[0].cond&&NET.lines[0].cond.A&&Array.isArray(NET.lines[0].cond.A.welds));}
const LW=c=>(SITE.SRV_A.data.lines[0].cond[c].welds||[]).map(w=>({w:w.weldId,c,sst:!!w.sst,end:w.endType||''}));
const soud=LW('A').concat(LW('R')).filter(j=>!j.sst),pts=LW('A').concat(LW('R')).filter(j=>j.sst);
const S46=['2026-11-09','2026-11-10','2026-11-11','2026-11-12'],S47=['2026-11-16','2026-11-17'];
const nm=u=>u.prenom+' '+u.nom;const st=(d,h,u,x)=>Object.assign({done:true,at:d+'T'+h+':00.000Z',by:nm(u),photos:[]},x||{});let wi=0;const row=(j,d)=>{const steps={1:st(d,'09:00',SOUD)};const r={site_id:'SRV_A',weld_id:j.w,line_id:'L1',cond:j.c,status:'soudee',data:{steps,events:[]},steps,updated_at:d+'T18:00:00Z'};WELDS.push(r);return r;};
const R46=[];[[S46[0],10],[S46[1],12],[S46[2],8],[S46[3],11]].forEach(([d,n])=>{for(let q=0;q<n;q++)R46.push([row(soud[wi++],d),d]);});
{let m=0;[[S46[0],5],[S46[1],5],[S46[2],4],[S46[3],4]].forEach(([d,n])=>{for(let q=0;q<n;q++){const r=R46[m++][0];r.status='manchonnee';r.steps[2]=st(d,'13:00',MAN);r.steps[3]=st(d,'14:00',MAN,{type:'retracte'});}});}
[[S47[0],9],[S47[1],8]].forEach(([d,n])=>{for(let q=0;q<n;q++)row(soud[wi++],d);});{const p=pts.find(x=>x.end==='sousstation')||pts[0];const r=row(p,S47[0]);r.steps[1]=st(S47[0],'15:00',SOUD);}
const wk=(ds,eq)=>Object.assign(Object.fromEntries(ds.map(x=>[x,['SRV_A']])),eq?{'eq:SRV_A':eq}:{});
PLAN['2026-W46']={week:'2026-W46',data:{aff:{[SOUD.email]:wk(S46,'A'),[TUY.email]:wk(S46,'A'),[MAN.email]:wk(S46,'B'),[CHEF.email]:wk(S46)}},updated_at:'2026-11-06T08:00:00Z'};
PLAN['2026-W47']={week:'2026-W47',data:{aff:{[SOUD.email]:wk(S47.concat(['2026-11-18','2026-11-19']),'A'),[TUY.email]:wk(S47.concat(['2026-11-18','2026-11-19']),'A'),[CHEF.email]:wk(S47.concat(['2026-11-18','2026-11-19']))}},updated_at:'2026-11-13T08:00:00Z'};
const put=(u,d,fin)=>{PTS[u.email+'|'+d]={p:u.email,d,site:'SRV_A',events:[{t:'start',at:d+'T07:30'},{t:'pause',at:d+'T12:00'},{t:'resume',at:d+'T12:30'},{t:'end',at:d+'T'+(fin||'18:00')}],status:'valide',val:[{by:CHEF.email,at:d+'T18:30'},{by:COND.email,at:d+'T19:00'}],corr:null,updated_at:'2026-11-13T17:00:00Z'};};
S46.forEach(d=>[SOUD,TUY,MAN].forEach(u=>put(u,d)));S47.forEach(d=>[SOUD,TUY].forEach(u=>put(u,d)));
PEOPLE[SOUD.email]={key:SOUD.email,data:{compteurs:{'c2026-W40':[42,40,100]}},updated_at:'2026-10-05T08:00:00Z'}; /* une semaine déjà figée au serveur */
const cptOf=u=>((PEOPLE[u.email]||{}).data||{}).compteurs||null;const callsOf=(who,rpc)=>CALLS.filter(c=>c.by===who&&c.rpc===rpc);
const cad=(pg,f,...a)=>pg.evaluate(([f,a])=>{const c=window.TRACE.espace.cad();const r=c[f](...a);return r===undefined?null:JSON.parse(JSON.stringify(r));},[f,a]);
const carte=pg=>pg.evaluate(()=>{const c=document.getElementById('cad-card');if(!c)return null;const t=s=>s.replace(/[\s  ]+/g,' ').trim();return {h3:t(c.querySelector('h3').textContent),v:t((c.querySelector('.cad-v')||{textContent:''}).textContent),tiles:[...c.querySelectorAll('.eq-tile')].map(x=>t(x.textContent)),txt:t(c.textContent),hist:[...c.querySelectorAll('.cad-h span')].map(x=>t(x.textContent))};});
const ouvrir=async(P,id)=>{await home(P.page,'htEspace');await fake(P.page,'opensite',id,400);await P.page.waitForFunction(i=>{const T=window.TRACE;return T.state.siteId===i&&T.state.screen==='site'&&T.sites[i]&&Array.isArray(T.sites[i].lines);},id,{timeout:20000}).catch(()=>{});await W(P.page,1200);await home(P.page,'htEspace');await W(P.page,500);};
const equipe=pg=>pg.evaluate(()=>{const t=s=>s.replace(/[\s  ]+/g,' ').trim();return [...document.querySelectorAll('#eq-app .eq-peteam')].map(c=>({th:[...c.querySelectorAll('tr')[0].children].map(x=>t(x.textContent)).join('|'),r:[...c.querySelectorAll('tr')].slice(1).filter(tr=>tr.children.length>1).map(tr=>t(tr.lastElementChild.textContent))}));});
const prodEq=async P=>{await home(P.page,'htExpl');await W(P.page,500);await tap(P.page,'#eq-app [data-v="prodEq"]',600);await P.page.evaluate(()=>{window.TRACE.espace.state().S.peWeek=-1;});await fake(P.page,'peweek','-1',900);};
// ── v1 : Ana importe la base, publie ; le plan du chantier n'est pas sur son PC → rien de figé, « incomplet »
const A=await open(ADM,{width:1366,height:900},false,{wide:true});
await home(A.page,'htCom');await tap(A.page,'#eq-app [data-act=af][data-v="seg|prix"]',500);
await A.page.setInputFiles('#eq-app input[data-afprix]',{name:'fixture_prix.xlsx',mimeType:'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',buffer:fs.readFileSync(path.join(HERE,'fixture_prix.xlsx'))});await W(A.page,2500);
const v1={base:Object.values(REG).some(r=>r.kind==='prix'),carte:await A.page.evaluate(()=>!!document.querySelector('#cad-admin [data-v="cad|pub"]'))};
/* v0 : la première publication est un ESSAI (encadrement seulement) : le soudeur ne voit rien, la cheffe si */
await tap(A.page,'#cad-admin [data-v="cad|pub"]',900);await W(A.page,1200);
const H0=await open(SOUD,{width:390,height:800},true);await home(H0.page,'htEspace');await tapAct(H0.page,'sub','prod',700);await W(H0.page,800);const K0=await open(CHEF,{width:1366,height:900},false,{wide:true});
const v0={pour:(SETTINGS.cadences_prod||{}).pour,hugo:{on:await cad(H0.page,'on'),carte:await H0.page.$('#cad-card')!==null,ref:await H0.page.evaluate(()=>!!localStorage.getItem('trace:cadref'))},chloe:await cad(K0.page,'on'),etat:await A.page.evaluate(()=>document.querySelector('#cad-admin .cm-ctrlv').textContent.replace(/\s+/g,' ').trim().slice(0,90))};
await H0.ctx.close();await K0.ctx.close();console.log('v0) essai, encadrement seulement :',J(v0));
C.v0=v0.pour==='enc'&&v0.hugo.on===false&&v0.hugo.carte===false&&v0.hugo.ref===true&&v0.chloe===true&&/en essai : l'encadrement seulement/.test(v0.etat);
await A.page.evaluate(()=>{const el=document.querySelector('#cad-admin [data-xin="cad|pour"]');el.value='tous';el.dispatchEvent(new Event('change',{bubbles:true}));});await W(A.page,400);
await tap(A.page,'#cad-admin [data-v="cad|pub"]',900);await W(A.page,4000);
{const s=SETTINGS.cadences_prod;const j=JSON.stringify(s||{});Object.assign(v1,{set:!!s&&s.v===1,par:s&&s.par,cles:s?Object.keys(s).sort().join():'',sansPrix:!/taux|postes|"fo"|amount|prix/i.test(j),taille:j.length,rpc:callsOf('Ana','setting').map(c=>c.key+':'+c.ok).join(),pour:s&&s.pour,
  plan:await A.page.evaluate(()=>!!window.TRACE.sites.SRV_A),envois:callsOf('Ana','compteurs').length,etat:await cad(A.page,'figeEtat'),manque:await cad(A.page,'moi',SOUD.email,-1).then(m=>m&&m.p?[m.hd,m.hp]:null)});}
await prodEq(A);v1.tab=await equipe(A.page);await tap(A.page,'#eq-app [data-act="jour"][data-v="cadp|'+SOUD.email+'"]',500);
v1.avis=await A.page.evaluate(()=>{const m=document.getElementById('cad-manque');return m?{txt:m.textContent.replace(/[\s  ]+/g,' ').trim(),btn:[...m.querySelectorAll('[data-act="opensite"]')].map(b=>b.dataset.v+':'+b.textContent.trim())}:null;});
console.log('v1) publication, plan absent :',J(Object.assign({},v1,{etat:v1.etat&&{off:v1.etat.off,last:v1.etat.last&&{n:v1.etat.last.n,saute:v1.etat.last.saute}}})));
C.v1=v1.base&&v1.carte&&v1.set&&v1.par==='Ana TESTADMIN'&&v1.cles==='H,at,base,dn,etinc,ext,minH,pan,par,pour,v'&&v1.pour==='tous'&&v1.sansPrix&&v1.taille<12000&&v1.rpc==='cadences_prod:true,cadences_prod:true'&&v1.plan===false&&v1.envois===0
  &&v1.etat&&v1.etat.off===false&&v1.etat.last&&v1.etat.last.n===0&&v1.etat.last.saute===3&&v1.tab.length>=2&&v1.tab.every(x=>/\|⚡ Débloqué$/.test(x.th))&&v1.tab.filter(x=>x.r.includes('? incomplet')).length>=2
  &&!!v1.avis&&/^⚠ Calcul incomplet sur cet appareil : le plan de « Chantier fictif des Tilleuls » n'y est pas\. Ouvre le chantier une fois, puis reviens ici\./.test(v1.avis.txt)&&J(v1.avis.btn)===J(['SRV_A:Ouvrir Chantier fictif des Tilleuls']);
// ── v1b : elle ouvre le chantier une fois → la semaine 46 est figée
await ouvrir(A,'SRV_A');await A.page.evaluate(()=>window.TRACE.espace.cad().test.figeReset());await home(A.page,'htExpl');await W(A.page,6000);
const v1b={plan:await A.page.evaluate(()=>!!(window.TRACE.sites.SRV_A&&window.TRACE.sites.SRV_A.lines)),hugo:cptOf(SOUD),theo:cptOf(TUY),marc:cptOf(MAN),chef:cptOf(CHEF),envois:callsOf('Ana','compteurs').map(c=>c.key.split('.')[0]+':'+Object.keys(c.value).join('+')).sort().join(' '),attente:await A.page.evaluate(()=>window.TRACE.espace.state().pending.length),etat:await cad(A.page,'figeEtat')};
await prodEq(A);v1b.tab=(await equipe(A.page)).map(x=>x.r.join('/'));
console.log('v1b) chantier ouvert, semaine figée :',J(Object.assign({},v1b,{etat:v1b.etat&&v1b.etat.last&&{n:v1b.etat.last.n,saute:v1b.etat.last.saute}})));
C.v1b=v1b.plan&&J(v1b.hugo)===J({'c2026-W40':[42,40,100],'c2026-W46':[41,40,164]})&&J(v1b.theo)===J({'c2026-W46':[41,40,164]})&&J(v1b.marc)===J({'c2026-W46':[36.9,40,72]})&&v1b.chef===null
  &&v1b.envois==='hugo:c2026-W46 marc:c2026-W46 theo:c2026-W46'&&v1b.attente===0&&v1b.tab.some(r=>/41 h 00 ▲/.test(r))&&v1b.tab.some(r=>/36 h 54 ▼/.test(r))&&!v1b.tab.some(r=>/incomplet/.test(r));
// ── v2 : Hugo, téléphone — d'abord sans le plan, puis le chantier ouvert
const H=await open(SOUD,{width:390,height:800},true);await home(H.page,'htEspace');await tapAct(H.page,'sub','prod',700);await W(H.page,1500);
const v2={base:await H.page.evaluate(()=>!!window.TRACE.reg.get('prix','base')),on:await cad(H.page,'on'),avant:await carte(H.page),avis:await H.page.evaluate(()=>{const m=document.getElementById('cad-manque');return m?[...m.querySelectorAll('[data-act="opensite"]')].map(b=>b.dataset.v):null;})};
if(SHOTS)await H.page.screenshot({path:SHOTS+'/cadsrv_v2a_incomplet.png'});
await tap(H.page,'#cad-manque [data-act="opensite"]',400);await H.page.waitForFunction(()=>{const T=window.TRACE;return T.state.siteId==='SRV_A'&&T.state.screen==='site';},null,{timeout:20000}).catch(()=>{});await W(H.page,1500);
await home(H.page,'htEspace');await tapAct(H.page,'sub','prod',900);await W(H.page,1500);v2.c=await carte(H.page);v2.avis2=await H.page.$('#cad-manque')!==null;await tap(H.page,'#cad-card [data-act="jour"][data-v="cad|det"]',500);
v2.detail=await H.page.evaluate(()=>{const d=document.getElementById('cad-detail');const t=s=>s.replace(/[\s  ]+/g,' ').trim();return d?[...d.querySelectorAll('.cad-jour')].map(j=>t(j.querySelector('b').textContent)+' '+[...j.querySelectorAll(':scope > .cad-l')].map(l=>t(l.querySelector('span').childNodes[0].textContent)+' = '+t(l.querySelector(':scope > b').textContent)).join(' ; ')):null;});
v2.eq=await H.page.evaluate(()=>{const d=document.getElementById('cad-detail');return d?(d.querySelector('.cad-jour .eq-s')||{}).textContent.replace(/[\s  ]+/g,' ').trim():null;});
v2.av=await cad(H.page,'avatar',SOUD.email);v2.ovf=await H.page.evaluate(()=>document.documentElement.scrollWidth>document.documentElement.clientWidth+1);await W(H.page,2500);v2.ecrit=callsOf('Hugo','compteurs').length;
if(SHOTS)await H.page.screenshot({path:SHOTS+'/cadsrv_v2b_hugo.png'});
console.log('v2) Hugo, téléphone :',J({base:v2.base,on:v2.on,avant:v2.avant&&v2.avant.tiles,avis:v2.avis,avis2:v2.avis2,h3:v2.c&&v2.c.h3,v:v2.c&&v2.c.v,tiles:v2.c&&v2.c.tiles,hist:v2.c&&v2.c.hist,detail:v2.detail,eq:v2.eq,av:v2.av&&[v2.av.cadence,v2.av.realisations],ovf:v2.ovf,ecrit:v2.ecrit}));
C.v2=v2.base===false&&v2.on===true&&!!v2.avant&&v2.avant.v===''&&v2.avant.tiles[0]==='—débloquées par ta production'&&/⚠ Calcul incomplet sur cet appareil : le plan de « Chantier fictif des Tilleuls » n'y est pas/.test(v2.avant.txt)&&J(v2.avis)===J(['SRV_A'])&&v2.avis2===false
  &&!!v2.c&&v2.c.h3==='⚡ Cadence · semaine 47 · du 16/11 au 22/11 · en cours'&&/^▼ Pour l'instant : en dessous de la cadence il manque 1 h 00$/.test(v2.c.v)
  &&J(v2.c.tiles)===J(['19 h 00débloquées par ta production','20 h 00de travail pointées','2semaines d\'affilée au-dessus · record 2'])&&/264 pouces soudés sur les semaines terminées · \+ 68 cette semaine/.test(v2.c.txt)&&J(v2.c.hist)===J(['S40 ▲','S46 ▲'])
  &&J(v2.detail)===J(['lun. 16/11 9 soudures DN 100 × 1 h 00 = 9 h 00 ; 1 point SST DN 100 × 2 h 00 = 2 h 00','mar. 17/11 8 soudures DN 100 × 1 h 00 = 8 h 00','Total de la semaine Heures débloquées par la production = 19 h 00 ; Heures de travail pointées = 20 h 00'])
  &&/Chantier fictif des Tilleuls · équipe A · avec Théo \(tuyauteur\)$/.test(v2.eq||'')&&v2.av&&v2.av.cadence===2&&v2.av.realisations===264&&!v2.ovf&&v2.ecrit===0;
// ── v3 : Chloé, cheffe de chantier — mêmes chiffres sur son appareil : rien à écrire
const K=await open(CHEF,{width:1366,height:900},false,{wide:true});await ouvrir(K,'SRV_A');await prodEq(K);await W(K.page,4000);
const v3={rows:(await equipe(K.page)),ecrit:callsOf('Chloé','compteurs').length,etat:await cad(K.page,'figeEtat')};
console.log('v3) cheffe de chantier :',J({rows:v3.rows.map(x=>x.r.join('/')),ecrit:v3.ecrit,last:v3.etat&&v3.etat.last&&{n:v3.etat.last.n,saute:v3.etat.last.saute}}));
C.v3=v3.rows.length>=2&&v3.rows.every(x=>/\|⚡ Débloqué$/.test(x.th))&&v3.rows.some(x=>x.r.includes('41 h 00 ▲'))&&v3.rows.some(x=>x.r.includes('36 h 54 ▼'))&&v3.ecrit===0&&v3.etat&&v3.etat.last&&v3.etat.last.n===0&&v3.etat.last.saute===0;
// ── v4 : Denis (conducteur) — le serveur lui refuse les compteurs : une tentative, puis plus rien
NOCOMPT.add(COND.email);put(SOUD,S46[3],'19:00');PTS[SOUD.email+'|'+S46[3]].updated_at=nowIso(); /* jeudi corrigé : 11 h → semaine 46 d'Hugo = 41 h pointées */
const D=await open(COND,{width:1366,height:900},false,{wide:true});await ouvrir(D,'SRV_A');await W(D.page,6000);
const n4=callsOf('Denis','compteurs').length;await home(D.page,'htExpl');await W(D.page,5000);
const v4={essais:n4,apres:callsOf('Denis','compteurs').length,valeur:callsOf('Denis','compteurs').map(c=>c.key.split('.')[0]+':'+J(c.value)).join(),attente:await D.page.evaluate(()=>window.TRACE.espace.state().pending.filter(w=>w.part==='compteurs').length),off:(await cad(D.page,'figeEtat')).off,serveur:cptOf(SOUD)['c2026-W46'],toast:await D.page.evaluate(()=>((document.getElementById('toast')||{}).textContent||'').trim())};
console.log('v4) écriture refusée :',J(v4));
C.v4=v4.essais===1&&v4.apres===1&&v4.valeur==='hugo:{"c2026-W46":[41,41,164]}'&&v4.attente===0&&v4.off===true&&J(v4.serveur)==='[41,40,164]'&&!/SQL|Serveur/.test(v4.toast);
// ── v5 : Ana rouvre l'appli (et le chantier) → refige la semaine 46 d'Hugo seulement
const n5=callsOf('Ana','compteurs').length;await login(A,{wide:true});await ouvrir(A,'SRV_A');await W(A.page,7000);
const v5={envois:callsOf('Ana','compteurs').slice(n5).map(c=>c.key.split('.')[0]+':'+J(c.value)).join(' '),hugo:cptOf(SOUD),theo:cptOf(TUY),marc:cptOf(MAN)};
console.log('v5) pointage corrigé, refigé :',J(v5));
C.v5=v5.envois==='hugo:{"c2026-W46":[41,41,164]}'&&J(v5.hugo)===J({'c2026-W40':[42,40,100],'c2026-W46':[41,41,164]})&&J(v5.theo)===J({'c2026-W46':[41,40,164]})&&J(v5.marc)===J({'c2026-W46':[36.9,40,72]});
// ── v5b : un autre appareil réécrit autre chose par-dessus → celui d'Ana, qui recalcule toujours pareil, n'insiste pas (pas d'aller-retour entre deux appareils)
PEOPLE[SOUD.email].data=Object.assign({},PEOPLE[SOUD.email].data,{compteurs:Object.assign({},PEOPLE[SOUD.email].data.compteurs,{'c2026-W46':[40,41,160]})});PEOPLE[SOUD.email].updated_at=nowIso();
await W(A.page,7000);const n5b=callsOf('Ana','compteurs').length;const loc5b=await A.page.evaluate(k=>((window.TRACE.espace.state().people[k]||{}).compteurs||{})['c2026-W46'],SOUD.email);
await A.page.evaluate(()=>window.TRACE.espace.cad().test.figeReset());await home(A.page,'htExpl');await W(A.page,6000);
const v5b={recu:loc5b,envois:callsOf('Ana','compteurs').length-n5b,serveur:cptOf(SOUD)['c2026-W46'],etat:(await cad(A.page,'figeEtat')).last};
console.log('v5b) deux appareils en désaccord :',J(v5b));C.v5b=J(v5b.recu)==='[40,41,160]'&&v5b.envois===0&&J(v5b.serveur)==='[40,41,160]'&&v5b.etat&&v5b.etat.conflit===1&&v5b.etat.n===0;
// ── v6 : pas administratrice → pas de bouton ; Ana suspend → Hugo n'a plus la carte
await home(K.page,'htCom');const k6=await K.page.evaluate(()=>{const b=document.querySelector('#eq-app [data-act=af][data-v="seg|prix"]');if(b)b.click();return !!b;});await W(K.page,700);
const v6={chloe:await K.page.evaluate(()=>{const c=document.getElementById('cad-admin');return c?{pub:!!c.querySelector('[data-v="cad|pub"]'),set:!!c.querySelector('[data-xin]')}:null;}),seg:k6};
await fake(K.page,'x','cad|pub',900);v6.rpcChloe=callsOf('Chloé','setting').length;v6.toastChloe=await K.page.evaluate(()=>((document.getElementById('toast')||{}).textContent||'').trim());
await home(A.page,'htCom');await tap(A.page,'#eq-app [data-act=af][data-v="seg|prix"]',600);await tap(A.page,'#cad-admin [data-v="cad|off"]',1200);v6.set=J(Object.keys(SETTINGS.cadences_prod||{}).sort());v6.v=(SETTINGS.cadences_prod||{}).v;
await login(H);await home(H.page,'htEspace');await tapAct(H.page,'sub','prod',900);await W(H.page,800);
v6.hugo={carte:await H.page.$('#cad-card')!==null,on:await cad(H.page,'on'),prod:/Tes productions/.test(await H.page.evaluate(()=>document.getElementById('eq-app').textContent)),av:(await cad(H.page,'avatar',SOUD.email)).cadence};
console.log('v6) droits, suspension :',J(v6));
C.v6=(!v6.seg||v6.chloe===null||(!v6.chloe.pub&&!v6.chloe.set))&&v6.rpcChloe===0&&/Réservé à l'administrateur/.test(v6.toastChloe)&&v6.v===0&&v6.hugo.carte===false&&v6.hugo.on===false&&v6.hugo.prod&&v6.hugo.av===0;
// ── v7
console.log('v7)',J({logs,REFUS}));C.v7=logs.length===0&&J(REFUS)===J(['Denis : compteurs']);
await browser.close();
const bad=Object.entries(C).filter(([k,v])=>!v).map(([k])=>k);console.log(bad.length?'RESULTAT: ECHEC '+bad.join(','):'RESULTAT: TOUT VERT');
