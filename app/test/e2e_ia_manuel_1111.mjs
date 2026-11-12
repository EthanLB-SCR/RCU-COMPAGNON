// e2e_ia_manuel_1111.mjs — 11/11/2026 après-midi (Ethan : « le niveau des réponses est très bas : il ne connaît pas les écrans ; une soudure faite qui n'est pas
// sur le plan, il ne dit pas d'aller dans la préfabrication »). L'assistant reçoit maintenant le MANUEL de Tracé avec chaque question.
// Serveur simulé + fonction « assistant » simulée (elle capture ce que l'appli envoie). Personnages FICTIFS (harnais de e2e_val_1011).
//  m1  administratrice : la question part avec le manuel (structure, tutoriels, nouveautés, situations : « ⏳ Préfabrication (en attente) », « ➕ Soudure supplémentaire »),
//      le poste (« administrateur ») et l'écran ; la réponse s'affiche dans la bulle
//  m2  soudeur : manuel filtré par ses onglets et ses droits (plus court, sans les tutoriels de Pilotage / Commerce…), poste « Soudeur », « Pas à son poste : … Pilotage »,
//      ses droits (« Ajouter une soudure supplémentaire sur le plan ») et « qui peut quoi » dans l'entreprise
//  m3  « 🐞 En faire un bug » : le résumé part SANS le manuel (moins cher)
//  m4  taille : le manuel tient sous la limite de l'appli (150 000 caractères) et de la fonction (160 000) ; console propre
import { chromium } from 'playwright';
import fs from 'fs';
const BASE=process.env.BASE||'http://127.0.0.1:8832';const SHOTS=process.env.SHOTS||'';if(SHOTS)fs.mkdirSync(SHOTS,{recursive:true});
const SB='https://pghftlepduvfazbiavhq.supabase.co';
const b64u=o=>Buffer.from(JSON.stringify(o)).toString('base64').replace(/=+$/,'').replace(/\+/g,'-').replace(/\//g,'_');
const mk=(n,prenom,nom,poste,role)=>({id:'0000000'+n+'-aaaa-4aaa-8aaa-00000000000'+n,email:(prenom+'.'+nom).toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g,'')+'@exemple.fr',prenom,nom,poste,role,admin:false});
const SOUD=mk(1,'Hugo','TESTSOUDEUR','soudeur','soudeur'),TUY=mk(2,'Théo','TESTTUYAU','tuyauteur','tuyauteur'),MAN=mk(3,'Marc','TESTMANCHON','manchonneur','manchonneur'),
  NEUF=mk(4,'Lucas','TESTNOUVEAU','soudeur','soudeur'),CHEF=mk(5,'Chloé','TESTCHEF','chef','chef'),COND=mk(6,'Denis','TESTCONDUC','conducteur','chef'),BUR=mk(7,'Béa','TESTBUREAU','assist_rh','bureau'),INT=mk(8,'Nina','TESTINTERIM','soudeur','soudeur');
const ADM=Object.assign(mk(9,'Ana','TESTADMIN','resp_exploit','bureau'),{admin:true});
const USERS=[SOUD,TUY,MAN,NEUF,CHEF,COND,BUR,INT,ADM];
const PROFILES=USERS.map(u=>({id:u.id,email:u.email,name:u.prenom+' '+u.nom,prenom:u.prenom,nom:u.nom,role:u.role,active:true,poste:u.poste,admin:u.admin,type:'salarie',rights:{},sites:null,created_at:'2026-10-01T09:00:00Z'}));
const REG={},PEOPLE={},PTS={},PLAN={},SITE={},SETTINGS={};const UNKNOWN=new Set();const FN=[];const REPONSE='1. Ouvre le chantier → ☰ Menu → « ⏳ Préfabrication (en attente) ».';const REFUS=[];const OFFLINE=new Set(); /* téléphones « sans réseau » : le serveur simulé ne leur répond plus */const logs=[];const C={};const OVF=[];
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
    if(p==='/functions/v1/assistant'){FN.push({who:U.prenom,body:b});return json(b.mode==='resume'?{ok:true,titre:'Résumé fictif',texte:'Texte fictif'}:{ok:true,texte:REPONSE});}
    if(p==='/rest/v1/rpc/registre_set'&&UNKNOWN.has(b.p_kind))return json({code:'P0001',message:'registre inconnu : '+b.p_kind,details:null,hint:null},400); /* SQL pas encore passé */
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
// ── scénario ──
const demander=async(pg,q)=>{await pg.evaluate(()=>{const r=document.getElementById('ia-root');if(r)r.classList.remove('range');});
  const open=await pg.evaluate(()=>{const p=document.getElementById('ia-panel');return !!p&&!p.hidden;});if(!open){await pg.click('#ia-btn');await W(pg,300);}
  await pg.evaluate(()=>{const b=document.querySelector('#ia-panel .ia-tabs button');if(b)b.click();});await W(pg,200);
  await pg.fill('#ia-in',q);await pg.click('#ia-panel [data-ia="envoyer"]');await W(pg,1500);};
const msgs=pg=>pg.evaluate(()=>[...document.querySelectorAll('#ia-panel .ia-msg')].map(m=>m.className.replace('ia-msg ','')+':'+m.textContent.slice(0,120)));
// m1) administratrice
const PA=await open(ADM,{width:1366,height:900},false,{wide:true});const pa=PA.page;
await demander(pa,"J'ai fait une soudure mais elle n'est pas sur le plan");
const f1=FN.filter(x=>x.who==='Ana');const b1=(f1[0]||{}).body||{};const man1=String(b1.manuel||'');
const m1={n:f1.length,mode:b1.mode,profil:b1.profil,ctx:b1.contexte,len:man1.length,
  has:['# TRACÉ — CE QUE TU DOIS SAVOIR','# TUTORIELS DE L\'APPLI','## Tracé Chantier · Plan d\'ensemble','« ⏳ Préfabrication (en attente) »','« ＋ Pointer une soudure en attente »','« ➕ Soudure supplémentaire »','# SITUATIONS DE TERRAIN','Compagnon → 🧰 Outils','« 🚐 trajet inter-chantier ? »','# CETTE PERSONNE','# PLAN DE L\'APPLI','# GLOSSAIRE','# QUI PEUT QUOI DANS L\'ENTREPRISE','## Tracé Pilotage · Pointages à valider'].filter(t=>!man1.includes(t)),
  msgs:await msgs(pa)};
console.log('m1)',JSON.stringify({...m1,ctx:String(m1.ctx).slice(0,80)}));
C.m1=m1.n===1&&m1.mode==='chat'&&/administrateur/.test(m1.profil||'')&&/accueil|chantier/.test(m1.ctx||'')&&m1.has.length===0&&m1.len>20000&&m1.msgs.some(m=>/^assistant:1\. Ouvre le chantier → ☰ Menu → « ⏳ Préfabrication/.test(m));
// m2) soudeur : manuel filtré par ses droits
const PS=await open(SOUD,{width:390,height:844},true);const ps=PS.page;
await demander(ps,'Comment je pointe une soudure ?');
const f2=FN.filter(x=>x.who==='Hugo');const b2=(f2[0]||{}).body||{};const man2=String(b2.manuel||'');
const tutoTitres=t=>(t.match(/^## .+$/gm)||[]);const t1=tutoTitres(man1),t2=tutoTitres(man2);
const m2={n:f2.length,profil:b2.profil,len:man2.length,titres:t2.length,titresAdmin:t1.length,pilotageAdmin:t1.filter(x=>/Tracé Pilotage/.test(x)).length,pilotageSoudeur:t2.filter(x=>/Tracé Pilotage/.test(x)).length,
  base:['« ⏳ Préfabrication (en attente) »','## Tracé Chantier · Plan d\'ensemble','Poste : Soudeur.','# QUI PEUT QUOI DANS L\'ENTREPRISE'].filter(t=>!man2.includes(t)),
  pasPoste:/Pas à son poste[^\n]*Pilotage/.test(man2),droitExtra:/Droits de cette personne :[^\n]*Ajouter une soudure supplémentaire sur le plan/.test(man2)};
console.log('m2)',JSON.stringify(m2));
C.m2=m2.n===1&&/Soudeur/i.test(m2.profil||'')&&!/administrateur/.test(m2.profil||'')&&m2.len<m1.len&&m2.titres<m2.titresAdmin&&m2.pilotageSoudeur===0&&m2.pilotageAdmin>10&&m2.base.length===0&&m2.pasPoste&&m2.droitExtra;
// m3) « En faire un bug » : le résumé part sans le manuel
const nAvant=FN.length;await pa.evaluate(()=>{const b=document.querySelector('#ia-panel [data-ia="tirer|bug"]');if(b)b.click();});await W(pa,1500);
const f3=FN.slice(nAvant).map(x=>x.body);const m3={n:f3.length,mode:f3[0]&&f3[0].mode,manuel:f3[0]&&('manuel' in f3[0]),titre:await pa.evaluate(()=>(document.getElementById('ia-titre')||{}).value||'')};
console.log('m3)',JSON.stringify(m3));C.m3=m3.n===1&&m3.mode==='resume'&&m3.manuel===false&&m3.titre==='Résumé fictif';
// m4) taille et console
const m4={admin:m1.len,soudeur:m2.len,logs,REFUS};console.log('m4)',JSON.stringify(m4));C.m4=m1.len<=150000&&m2.len>20000&&logs.length===0&&REFUS.length===0;
await browser.close();
const bad=Object.entries(C).filter(([k,v])=>!v).map(([k])=>k);console.log(bad.length?'RESULTAT: ECHEC '+bad.join(','):'RESULTAT: TOUT VERT');
