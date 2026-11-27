// e2e_rgpd_acces_2611.mjs — 26/11/2026 (RGPD) : CE QUE GARDE CHAQUE APPAREIL, avec le serveur simulé (harnais de e2e_val_1011) qui applique les règles
// AVANT puis APRÈS sql/rgpd_acces_2611.sql (bascule SQL26). Personnages et chantier FICTIFS (@exemple.fr, Villefictive).
//  a1  AVANT le SQL (mon_acces absente) : Hugo (soudeur) reçoit tout, comme aujourd'hui (fiches complètes et pointages de tous) — l'appli ne change rien
//  a2  APRÈS le SQL, même téléphone (cache d'avant gardé) : Hugo garde SA fiche entière ; collègues = avatar / secteur / téléphone seulement ; ses pointages
//      seulement ; RIB, signatures, accidents, agendas, cas forcés des autres retirés de l'appareil ; l'accident où il est concerné et ses lignes restent ;
//      le tout aussi après un redémarrage sans réseau (cache rangé)
//  a3  APRÈS : l'annuaire d'Hugo montre ses collègues ; la fiche d'un collègue garde « 📞 Appeler » ; « Ta fiche » garde son contact d'urgence
//  a4  APRÈS : Chloé (cheffe) et Béa (bureau, RH) : fiches complètes, pointages de l'équipe, documents de l'entreprise — aucun rangement
//  a5  APRÈS : Victor (visiteur) : aucune fiche d'un autre, aucun pointage, aucune ligne personnelle, pas d'annuaire
//  a6  Hugo pointe son début de journée (position simulée 48.123456 / -1.654321) : le serveur reçoit [48.123, -1.654] (≈ 100 m), jamais plus précis
//  a7  console propre, aucune écriture refusée
import { chromium } from 'playwright';
const BASE=process.env.BASE||'http://127.0.0.1:8832';
const SB='https://pghftlepduvfazbiavhq.supabase.co';
const b64u=o=>Buffer.from(JSON.stringify(o)).toString('base64').replace(/=+$/,'').replace(/\+/g,'-').replace(/\//g,'_');
const mk=(n,prenom,nom,poste,role,type)=>({id:'0000000'+n+'-aaaa-4aaa-8aaa-00000000000'+n,email:(prenom+'.'+nom).toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g,'')+'@exemple.fr',prenom,nom,poste,role,admin:false,type:type||'salarie'});
const HUGO=mk(1,'Hugo','TESTSOUDEUR','soudeur','soudeur'),NINA=mk(2,'Nina','TESTINTERIM','soudeur','soudeur','interim'),CHLOE=mk(3,'Chloé','TESTCHEF','chef','chef'),
  BEA=mk(4,'Béa','TESTBUREAU','assist_rh','bureau'),VICTOR=mk(5,'Victor','TESTVISITEUR','visiteur','soudeur','visiteur');
const USERS=[HUGO,NINA,CHLOE,BEA,VICTOR];
const PROFILES=USERS.map(u=>({id:u.id,email:u.email,name:u.prenom+' '+u.nom,prenom:u.prenom,nom:u.nom,role:u.role,active:true,poste:u.poste,admin:false,type:u.type,rights:{},sites:u.type==='visiteur'?['SRV_A']:null,created_at:'2026-10-01T09:00:00Z'}));
const RH_POSTES=['gerant','dir_adjointe','dir_technique','resp_rh','assist_rh','charge_dev_rh','resp_exploitation'];
const REG={},PEOPLE={},PTS={},PLAN={},SITE={},SETTINGS={};const REFUS=[];const OFFLINE=new Set();const logs=[];const C={};let SQL26=false;
const nowIso=()=>new Date().toISOString();const J=x=>JSON.stringify(x);
const flt=(rows,u)=>{let r=rows;for(const [k,v] of u.searchParams.entries()){if(['select','order','limit','offset'].includes(k))continue;const m=/^(in|gt|gte|lt|lte|eq|neq)\.(.*)$/.exec(v);if(!m)continue;const op=m[1],val=m[2];
  r=r.filter(x=>{const xv=x[k]===undefined||x[k]===null?'':String(x[k]);if(op==='in')return val.replace(/^\(|\)$/g,'').split(',').map(s=>s.replace(/^"|"$/g,'')).includes(xv);if(op==='eq')return xv===val;if(op==='neq')return xv!==val;
    const a=Date.parse(xv),b=Date.parse(val);const c=(!isNaN(a)&&!isNaN(b))?(a-b):(xv<val?-1:xv>val?1:0);return op==='gt'?c>0:op==='gte'?c>=0:op==='lt'?c<0:c<=0;});}return r;};
const CORS={'access-control-allow-origin':'*','access-control-allow-headers':'*','access-control-allow-methods':'GET, POST, PUT, PATCH, DELETE, OPTIONS'};
/* ── règles du serveur (sql/rgpd_acces_2611.sql) ── */
const droits=U=>{const mgr=U.admin||['chef','bureau'].includes(U.role);const rh=U.admin||RH_POSTES.includes(U.poste);const vis=U.type==='visiteur';return {key:U.email,admin:!!U.admin,mgr,rh,staff:!vis,visiteur:vis};};
const p2=(id,i)=>String(String(id).split('|')[i]||'').toLowerCase();
const voitPersonne=(U,k)=>{if(!SQL26)return true;const d=droits(U);return d.admin||d.mgr||d.rh||String(k).toLowerCase()===U.email;};
const voitLigne=(U,r)=>{if(!SQL26)return true;const d=droits(U),me=U.email,enc=d.admin||d.mgr;
  if(d.visiteur&&!['pteq','controle'].includes(r.kind))return false;
  if(r.kind==='entdoc')return enc;
  if(r.kind==='docsig'||r.kind==='qhsig')return enc||d.rh||p2(r.id,1)===me;
  if(r.kind==='accident')return enc||d.rh||String(r.data.byKey||'').toLowerCase()===me||(r.data.who||[]).includes(me);
  if(r.kind==='agenda'||r.kind==='debours')return enc||p2(r.id,0)===me;
  if(r.kind==='gdx'&&/^force\|/.test(r.id))return enc||d.rh||p2(r.id,1)===me;
  return true;};
const browser=await chromium.launch({headless:true,executablePath:process.env.CHROMIUM_PATH||undefined});
const POSTED=[];
async function mkCtx(U,viewport){const ctx=await browser.newContext({viewport,isMobile:true,hasTouch:true,deviceScaleFactor:1});
  const user=()=>({id:U.id,aud:'authenticated',role:'authenticated',email:U.email,email_confirmed_at:'2026-10-01T09:00:00Z',app_metadata:{provider:'email'},user_metadata:{},identities:[],created_at:'2026-10-01T09:00:00Z',updated_at:nowIso()});
  const session=()=>{const t=Math.floor(Date.now()/1000);return {access_token:b64u({alg:'HS256',typ:'JWT'})+'.'+b64u({iss:SB+'/auth/v1',sub:U.id,aud:'authenticated',exp:t+3600,iat:t,email:U.email,role:'authenticated'})+'.sig',token_type:'bearer',expires_in:3600,expires_at:t+3600,refresh_token:'rt-'+t,user:user()};};
  await ctx.route(u=>u.href.startsWith(SB),async route=>{const req=route.request();const u=new URL(req.url());const p=u.pathname;const acc=req.headers()['accept']||'';
    const json=(o,status=200)=>route.fulfill({status,contentType:'application/json',headers:CORS,body:JSON.stringify(o)});
    if(req.method()==='OPTIONS')return route.fulfill({status:200,headers:CORS,body:''});
    if(OFFLINE.has(U.email))return route.abort('internetdisconnected');
    let b={};try{b=JSON.parse(req.postData()||'{}');}catch(e){}
    if(p==='/auth/v1/token')return json(session());if(p==='/auth/v1/user')return json(user());if(p.startsWith('/auth/v1/'))return json({});
    if(p.startsWith('/storage/v1/'))return json({statusCode:'400',error:'test',message:'stockage simulé indisponible'},400);
    if(p==='/rest/v1/profiles'){const m=/id=eq\.([^&]+)/.exec(u.search);let r=m?PROFILES.filter(x=>x.id===decodeURIComponent(m[1])):PROFILES;return json(/object/.test(acc)?(r[0]||null):r);}
    if(p==='/rest/v1/invites')return json([]);if(p==='/rest/v1/rpc/annuaire_invites')return json([]);
    if(p==='/rest/v1/app_settings'){const m=/key=eq\.([a-z_]+)/.exec(u.search);const k=m&&m[1];const row=k&&SETTINGS[k]!==undefined?{value:SETTINGS[k]}:null;return /object/.test(acc)?json(row):json(row?[row]:[]);}
    if(p==='/rest/v1/rpc/mon_acces'){if(!SQL26)return json({code:'PGRST202',message:'Could not find the function public.mon_acces without parameters in the schema cache',details:null,hint:null},404);return json(Object.assign({v:1},droits(U)));}
    if(p==='/rest/v1/rpc/people_pub'){if(!SQL26)return json({code:'PGRST202',message:'Could not find the function public.people_pub(p_since) in the schema cache',details:null,hint:null},404);
      if(!droits(U).staff)return json([]);const since=b.p_since?Date.parse(b.p_since):0;
      return json(Object.values(PEOPLE).filter(r=>!since||Date.parse(r.updated_at)>since).map(r=>({key:r.key,updated_at:r.updated_at,data:Object.fromEntries(['avatar','poste_avatar','secteur','tel'].filter(k=>r.data[k]!=null).map(k=>[k,r.data[k]]))})));}
    if(p==='/rest/v1/rpc/registre_set'){if(droits(U).visiteur&&SQL26){REFUS.push(U.prenom+' : visiteur');return json({code:'P0001',message:'compte visiteur : lecture seule'},400);}
      const k=b.p_kind+'|'+b.p_id;const old=(REG[k]||{}).data||{};const data=b.p_mode==='replace'?Object.assign({},b.p_patch||{}):Object.assign({},old,b.p_patch||{});Object.keys(b.p_patch||{}).forEach(x=>{if(b.p_patch[x]===null)delete data[x];});REG[k]={kind:b.p_kind,id:b.p_id,data,updated_at:nowIso()};return json(REG[k]);}
    if(p==='/rest/v1/registre')return json(flt(Object.values(REG).filter(r=>voitLigne(U,r)),u));
    if(p==='/rest/v1/rpc/people_set_part'){const r=PEOPLE[b.p_key]||(PEOPLE[b.p_key]={key:b.p_key,data:{}});r.data=Object.assign({},r.data,{[b.p_part]:b.p_value});r.updated_at=nowIso();return json({at:r.updated_at,value:b.p_value});}
    if(p==='/rest/v1/people')return json(flt(Object.values(PEOPLE).filter(r=>voitPersonne(U,r.key)),u));
    if(p==='/rest/v1/rpc/pointage_set'){const row=Object.assign({},b.p_row,{p:String(b.p_row.p).toLowerCase(),updated_at:nowIso(),updated_by:U.id});if(String(row.p)!==U.email&&!droits(U).mgr){REFUS.push(U.prenom+' : pointage d\'un autre');return json({code:'P0001',message:'pointage d\'une autre personne'},400);}
      POSTED.push(JSON.parse(JSON.stringify(row)));PTS[row.p+'|'+row.d]=row;return json(row);}
    if(p==='/rest/v1/pointages')return json(flt(Object.values(PTS).filter(r=>voitPersonne(U,r.p)),u));
    if(p==='/rest/v1/rpc/planning_set')return json(null);
    if(p==='/rest/v1/planning')return json(flt(Object.values(PLAN),u));
    if(p==='/rest/v1/sites'){if(req.method()!=='GET')return json([]);const rows=Object.values(SITE);const sel=u.searchParams.get('select')||'';
      if(/(^|,)data(,|$)/.test(sel))return json(/object/.test(acc)?(rows[0]||null):rows);return json(/object/.test(acc)?(rows[0]||null):rows.map(r=>({id:r.id,name:r.name,updated_at:r.updated_at,ville:(r.data.fiche||{}).ville||null,chef:(r.data.fiche||{}).chef||null,conducteur:null,secteur:'ouest',deleted:null})));}
    if(p.startsWith('/rest/v1/rpc/'))return json(null);if(p.startsWith('/rest/v1/'))return json(/object/.test(acc)?null:[]);return json([]);});
  await ctx.route(u=>/open-meteo\.com$|(^|\.)geopf\.fr$|^geo\.api\.gouv\.fr$|nominatim|tile\.openstreetmap/.test(u.hostname),r=>r.fulfill({status:200,contentType:'application/json',body:'{}'}));
  const page=await ctx.newPage();page.on('dialog',d=>d.accept().catch(()=>{}));
  page.on('pageerror',e=>logs.push(U.prenom+' PAGEERROR: '+e.message.slice(0,300)));page.on('console',m=>{if(m.type()==='error'&&!/realtime|websocket|Failed to fetch|net::ERR|404|400|open-meteo|geopf|geo\.api|status of 4\d\d|supabase|PGRST202/i.test(m.text()))logs.push(U.prenom+': '+m.text().slice(0,200));});
  return {ctx,page,U};}
const W=(pg,ms)=>pg.waitForTimeout(ms);
const TODAY='2026-11-26';
const login=async P=>{const page=P.page;await page.goto(BASE+'/index.html');await W(page,400);await page.evaluate(t=>{localStorage.clear();localStorage.setItem('trace:syncMs','4000');localStorage.setItem('trace:testToday',t);},TODAY);
  await page.evaluate(()=>new Promise(r=>{try{const q=indexedDB.deleteDatabase('trace-kv');q.onsuccess=q.onerror=q.onblocked=()=>r();}catch(e){r();}}));await page.reload();await W(page,900);
  await page.fill('#loginEmail',P.U.email);await page.fill('#loginPwd','Test-2026!');await page.click('#loginGo');await W(page,3000);await loaded(P);};
const loaded=async P=>{await P.page.waitForFunction(()=>window.TRACE&&window.TRACE.espace&&window.TRACE.espace.state().loaded,null,{timeout:20000}).catch(()=>{});await W(P.page,1500);};
const open=async(U,vp)=>{const P=await mkCtx(U,vp||{width:390,height:844});await login(P);return P;};
/* ce que garde l'appareil */
const etat=P=>P.page.evaluate(()=>{const T=window.TRACE,s=T.espace.state();const K=k=>Object.keys(s.people[k]||{}).sort().join(',');const all=k=>(T.reg.all(k)||[]).length;
  return {people:Object.fromEntries(Object.keys(s.people).filter(k=>k.includes('@')).map(k=>[k.split('.')[0],K(k)])),pts:[...new Set(s.pointages.filter(x=>String(x.p).includes('@')).map(x=>x.p.split('.')[0]))].sort().join(','),
    entdoc:all('entdoc'),docsig:(T.reg.all('docsig')||[]).map(x=>x.who||'?').join(','),qhsig:all('qhsig'),accident:(T.reg.all('accident')||[]).map(x=>x.ref).sort().join(','),agenda:all('agenda'),
    force:(T.reg.all('gdx')||[]).filter(x=>x&&x.cas!==undefined).map(x=>String(x.p).split('.')[0]).sort().join(','),bareme:(T.reg.all('gdx')||[]).some(x=>x&&x.nuit)};});
/* ── décor FICTIF ── */
const parts=(U,i)=>({avatar:{},poste_avatar:U.poste,secteur:'ouest',tel:'060000000'+i,urgence:{nom:'Contact FICTIF '+i,lien:'conjoint',tel:'060000009'+i},contrat:{agence:U.type==='interim'?'Agence Fictive':null,fin:'2027-06-30'},
  adresse:{ligne:i+' rue Fictive, Villefictive'},compteurs:{h:i},outlook:{ics:'https://exemple.fr/agenda-'+i+'.ics'}});
USERS.forEach((U,i)=>{PEOPLE[U.email]={key:U.email,data:parts(U,i+1),updated_at:'2026-11-20T09:00:00Z'};});
const pt=(U,d)=>{PTS[U.email+'|'+d]={p:U.email,d,site:'SRV_A',events:[{t:'start',at:d+'T07:30:00',pos:[48.11111,-1.66666]},{t:'end',at:d+'T16:30:00',pos:[48.11111,-1.66666]}],status:'declare',val:[],corr:null,updated_at:'2026-11-20T17:00:00Z'};};
[HUGO,NINA,CHLOE].forEach(U=>{pt(U,'2026-11-23');pt(U,'2026-11-24');});
const reg=(kind,id,data)=>{REG[kind+'|'+id]={kind,id,data,updated_at:'2026-11-20T10:00:00Z'};};
reg('entdoc','rib',{type:'rib',label:'RIB FICTIF',iban:'FR76 0000 FICTIF'});
reg('docsig','reglement|'+HUGO.email,{doc:'reglement',key:HUGO.email,who:'hugo',at:'2026-11-02T08:00:00Z'});reg('docsig','reglement|'+NINA.email,{doc:'reglement',key:NINA.email,who:'nina',at:'2026-11-02T08:00:00Z'});
reg('qhsig','run1|'+HUGO.email,{run:'run1',at:'2026-11-03T07:00:00Z'});reg('qhsig','run1|'+NINA.email,{run:'run1',at:'2026-11-03T07:00:00Z'});
reg('accident','acc1',{ref:'acc1',type:'presque',d:'2026-11-18',byKey:NINA.email,who:[HUGO.email],status:'declare'});reg('accident','acc2',{ref:'acc2',type:'soin',d:'2026-11-19',byKey:CHLOE.email,who:[],status:'declare'});
reg('agenda',CHLOE.email+'|e1',{p:CHLOE.email,t:'Réunion fictive',d:'2026-11-27'});
reg('gdx','force|'+HUGO.email,{p:HUGO.email,cas:2,nc:false});reg('gdx','force|'+NINA.email,{p:NINA.email,cas:3,nc:false});reg('gdx','bareme',{nuit:90,nuitIdf:120,repas:20});
SITE.SRV_A={id:'SRV_A',name:'Chantier fictif des Tilleuls',supplier:'AXIOM',data:{id:'SRV_A',name:'Chantier fictif des Tilleuls',fiche:{ville:'Villefictive',secteur:'ouest',chef:CHLOE.email},w:200,h:120,lines:[]} /* w, h : un plan vide sans dimensions donne une vue NaN (hors sujet ici) */,updated_at:'2026-11-01T08:00:00Z'};
PLAN['2026-W48']={week:'2026-W48',data:{aff:{[HUGO.email]:{'2026-11-23':['SRV_A'],'2026-11-24':['SRV_A'],'2026-11-25':['SRV_A'],'2026-11-26':['SRV_A'],'2026-11-27':['SRV_A']}}},updated_at:'2026-11-20T08:00:00Z'};
/* ── a1 : AVANT le SQL ── */
let P=await open(HUGO);const avant=await etat(P);
console.log('a1) avant :',J(avant));
C.a1=/urgence/.test(avant.people.nina||'')&&/adresse/.test(avant.people.chloe||'')&&avant.pts==='chloe,hugo,nina'&&avant.entdoc===1&&avant.accident==='acc1,acc2';
/* ── a2 : APRÈS le SQL, même téléphone ── */
SQL26=true;await P.page.reload();await W(P.page,1200);await loaded(P);await W(P.page,1500);const apres=await etat(P);
console.log('a2) après :',J(apres));
const pub='avatar,poste_avatar,secteur,tel';
const okA2=x=>x.people.hugo&&/urgence/.test(x.people.hugo)&&/outlook/.test(x.people.hugo)&&x.people.nina===pub&&x.people.chloe===pub&&x.pts==='hugo'&&x.entdoc===0&&x.docsig==='hugo'&&x.qhsig===1&&x.accident==='acc1'&&x.agenda===0&&x.force==='hugo'&&x.bareme===true;
OFFLINE.add(HUGO.email);await P.page.reload();await W(P.page,2500);const horsLigne=await etat(P);OFFLINE.delete(HUGO.email);
console.log('    redémarré sans réseau :',J(horsLigne));
C.a2=okA2(apres)&&okA2(horsLigne);
/* ── a3 : l'annuaire et les fiches ── */
await P.page.reload();await W(P.page,1200);await loaded(P);
const a3=await P.page.evaluate(async([nina])=>{const w=ms=>new Promise(r=>setTimeout(r,ms));const T=window.TRACE;if(T.state.screen!=='home'){const b=document.getElementById('btnHome');if(b)b.click();await w(300);}
  const o={};document.getElementById('htEnt')&&document.getElementById('htEnt').click();await w(500);
  const g=document.querySelector('#eq-app [data-act="xgo"][data-v="annu"]');if(g){g.click();await w(600);}o.annu=(document.getElementById('eq-app')||document.body).textContent.replace(/\s+/g,' ');
  T.espace.fiche(nina);await w(700);const f=document.querySelector('#eq-app a[href^="tel:"]');o.tel=f?f.getAttribute('href'):null;o.fiche=(document.getElementById('eq-app')||document.body).textContent.replace(/\s+/g,' ').slice(0,600);return o;},[NINA.email]);
const a3b=await P.page.evaluate(async([hugo])=>{const w=ms=>new Promise(r=>setTimeout(r,ms));const T=window.TRACE;T.espace.fiche(hugo);await w(700);return (document.getElementById('eq-app')||document.body).textContent.replace(/\s+/g,' ');},[HUGO.email]);
console.log('a3) annuaire : Nina',/Nina/.test(a3.annu),'Chloé',/Chloé/.test(a3.annu),'| fiche de Nina : tel',a3.tel,'urgence visible',/Contact FICTIF/.test(a3.fiche),'| ma fiche : urgence',/Contact FICTIF 1/.test(a3b));
C.a3=/Nina/.test(a3.annu)&&/Chloé/.test(a3.annu)&&a3.tel==='tel:0600000002'&&!/Contact FICTIF 2/.test(a3.fiche)&&/Contact FICTIF 1/.test(a3b);
/* ── a6 : pointage, position ≈ 100 m ── */
await P.ctx.grantPermissions(['geolocation']);await P.ctx.setGeolocation({latitude:48.123456,longitude:-1.654321,accuracy:6});
const a6=await P.page.evaluate(async()=>{const w=ms=>new Promise(r=>setTimeout(r,ms));const T=window.TRACE;if(T.state.screen!=='home'){const b=document.getElementById('btnHome');if(b)b.click();await w(300);}
  const h=document.getElementById('htEspace');if(h)h.click();await w(700);const b=document.querySelector('#eq-app .ptc [data-act=pointer][data-v=start]');if(!b)return 'pas de bouton';b.click();await w(2500);return 'ok';});
await W(P.page,2500);const sent=POSTED.filter(r=>r.p===HUGO.email&&r.d===TODAY).pop();const ev=sent&&(sent.events||[]).find(e=>e.t==='start');
console.log('a6) pointage :',a6,'| position reçue par le serveur :',J(ev&&ev.pos));
C.a6=a6==='ok'&&!!ev&&J(ev.pos)===J([48.123,-1.654]);
await P.ctx.close();
/* ── a4 : cheffe et bureau / RH ── */
const R4={};for(const U of [CHLOE,BEA]){const Q=await open(U);R4[U.prenom]=await etat(Q);await Q.ctx.close();}
console.log('a4)',J(R4));
const full=s=>/adresse/.test(s||'')&&/urgence/.test(s||'');
C.a4=Object.values(R4).every(x=>full(x.people.hugo)&&full(x.people.nina)&&/hugo/.test(x.pts)&&/nina/.test(x.pts)&&x.entdoc===1&&x.accident==='acc1,acc2'&&x.force==='hugo,nina');
/* ── a5 : visiteur ── */
{const Q=await open(VICTOR);const v=await etat(Q);await Q.ctx.close();console.log('a5) visiteur :',J(v));
  C.a5=Object.keys(v.people).every(k=>k==='victor')&&v.pts===''&&v.entdoc===0&&v.docsig===''&&v.accident===''&&v.force===''&&v.agenda===0;}
C.a7=!logs.length&&!REFUS.length;console.log('console :',J(logs),'refus :',J(REFUS));
console.log(Object.entries(C).map(([k,v])=>k+':'+(v?'✓':'✗')).join(' '));
console.log('RESULTAT:',Object.values(C).every(Boolean)?'TOUT VERT':'ÉCHEC');
await browser.close();
