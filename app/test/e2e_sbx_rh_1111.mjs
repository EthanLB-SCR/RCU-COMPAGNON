// e2e_sbx_rh_1111.mjs — 11/11/2026 : Tracé RH et le BAC À SABLE, et le bon fichier SQL dans le message « registre inconnu ».
// Serveur simulé et personnages FICTIFS (harnais de e2e_val_1011). Administratrice fictive « Ana TESTADMIN ».
//  s1  SQL RH pas encore passé (registre « rhabs » inconnu du serveur) : une absence pour Hugo → message « passe le SQL sql/rh_1011.sql (registre « rhabs ») »
//      (avant : « retours_12-10.sql », faux), bandeau du module, la ligne reste sur l'appareil en attente
//  s2  SQL passé : l'absence en attente part au serveur avec la suivante (rien de perdu)
//  s3  bac à sable : une absence et une contravention pour Karim B. (personnage de démo, clé « l:… ») restent sur l'appareil — RIEN au serveur, rien en attente ;
//      une absence pour Hugo (vrai compte) part bien au serveur
//  s4  « Supprimer » la ligne de démo : marquée supprimée sur l'appareil seulement
//  s5  « Retirer le bac à sable » : les lignes de démo disparaissent de l'appareil ; celles de Hugo restent (serveur)
//  s6  console propre, aucune écriture refusée
//  v5  téléphone 390 / 360 : aucun débordement, formulaire ouvert compris ; console propre, aucune écriture refusée
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
const REG={},PEOPLE={},PTS={},PLAN={},SITE={},SETTINGS={};const UNKNOWN=new Set(['rhabs']);const REFUS=[];const OFFLINE=new Set(); /* téléphones « sans réseau » : le serveur simulé ne leur répond plus */const logs=[];const C={};const OVF=[];
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
const P=await open(ADM,{width:1366,height:900},false,{wide:true});const pg=P.page;
const watchToasts=()=>pg.evaluate(()=>{window.__T=[];const t=document.getElementById('toast');if(!t)return;new MutationObserver(()=>{const s=t.textContent;if(s&&window.__T[window.__T.length-1]!==s)window.__T.push(s);}).observe(t,{childList:true,characterData:true,subtree:true});});
const toasts=()=>pg.evaluate(()=>(window.__T||[]).slice());
const txt=()=>pg.evaluate(()=>(document.getElementById('eq-app')||document.body).textContent.replace(/\s+/g,' '));
const pend=kind=>pg.evaluate(k=>window.TRACE.reg.pending().filter(w=>w.kind===k).map(w=>w.id),kind);
const loc=kind=>pg.evaluate(k=>window.TRACE.rh?window.TRACE.rh.rows(k).map(r=>r.id):null,kind);
const srv=kind=>Object.values(REG).filter(r=>r.kind===kind).map(r=>r.id);
const TAB={rhabs:'abs',rhpv:'pv'};
const rhNew=async(kind,person,fill)=>{await home(pg,'htRh');await W(pg,700);await tapAct(pg,'x','rh|tab|'+TAB[kind],500);await tapAct(pg,'x','rh|new|'+kind,600);
  const ok=await pg.evaluate(([re,f])=>{const s=document.getElementById('rh-p');if(!s)return 'pas de liste';const o=[...s.options].find(o=>new RegExp(re).test(o.textContent));if(!o)return [...s.options].map(o=>o.textContent).join(' / ');s.value=o.value;
    for(const [k,v] of Object.entries(f||{})){const el=document.getElementById('rh-'+k);if(el){el.value=v;el.dispatchEvent(new Event('change'));}}return true;},[person,fill||{}]);
  if(ok!==true){await pg.evaluate(()=>{const b=document.querySelector('#modal [data-close]');if(b)b.click();});return ok;}await tap(pg,'#rh-ok',900);return true;};
await watchToasts();
// s1) registre « rhabs » inconnu du serveur : bon fichier SQL nommé, ligne gardée en attente
const r1={sel:await rhNew('rhabs','Hugo',{type:'cp',du:'2026-11-16',au:'2026-11-18'})};await W(pg,2600);
await tapAct(pg,'x','rh|tab|abs',600);r1.toasts=await toasts();r1.pend=await pend('rhabs');r1.srv=srv('rhabs');r1.banner=/sql\/rh_1011\.sql/.test(await txt());
console.log('s1)',J(r1));
C.s1=r1.sel===true&&r1.toasts.some(t=>/passe le SQL sql\/rh_1011\.sql \(registre « rhabs »\)/.test(t))&&!r1.toasts.some(t=>/retours_12-10/.test(t))&&r1.pend.length===1&&/^hugo\.testsoudeur@exemple\.fr\|/.test(r1.pend[0])&&r1.srv.length===0&&r1.banner;
// s2) SQL passé : l'absence en attente part avec la suivante
UNKNOWN.delete('rhabs');
const r2={sel:await rhNew('rhabs','Théo',{type:'rtt',du:'2026-11-20',au:'2026-11-20'})};await W(pg,2600);r2.srv=srv('rhabs').map(i=>i.split('|')[0]).sort();r2.pend=await pend('rhabs');
console.log('s2)',J(r2));
C.s2=r2.sel===true&&J(r2.srv)===J(['hugo.testsoudeur@exemple.fr','theo.testtuyau@exemple.fr'])&&r2.pend.length===0;
// s3) bac à sable : Karim B. (démo) reste sur l'appareil ; Marc (vrai compte) part au serveur
await pg.evaluate(()=>window.TRACE.sandbox.act('on'));await W(pg,1800);
const r3={abs:await rhNew('rhabs','Karim',{type:'cp',du:'2026-11-23',au:'2026-11-24'})};await W(pg,1500);
r3.pv=await rhNew('rhpv','Karim',{recu:'2026-11-02',date:'2026-10-30',lieu:'Ville fictive',infraction:'Stationnement',montant:'35'});await W(pg,1500);
r3.marc=await rhNew('rhabs','Marc',{type:'cp',du:'2026-11-25',au:'2026-11-25'});await W(pg,2600);
r3.locAbs=(await loc('rhabs')).filter(i=>i.startsWith('l:'));r3.locPv=(await loc('rhpv')).filter(i=>i.startsWith('l:'));
r3.srvDemo=Object.keys(REG).filter(k=>/\|l:/.test(k));r3.pendDemo=(await pend('rhabs')).concat(await pend('rhpv')).filter(i=>i.startsWith('l:'));r3.srvMarc=srv('rhabs').some(i=>i.startsWith('marc.testmanchon@exemple.fr|'));
console.log('s3)',J(r3));
C.s3=r3.abs===true&&r3.pv===true&&r3.marc===true&&r3.locAbs.length===1&&/^l:karim\|/.test(r3.locAbs[0])&&r3.locPv.length===1&&/^l:karim\|/.test(r3.locPv[0])&&r3.srvDemo.length===0&&r3.pendDemo.length===0&&r3.srvMarc;
// s4) « Supprimer » la ligne de démo : sur l'appareil seulement
const demoId=r3.locAbs[0];const n0=Object.keys(REG).length;
await home(pg,'htRh');await W(pg,600);await tapAct(pg,'x','rh|tab|abs',500);await tapAct(pg,'x','rh|edit|rhabs|'+demoId,600);await tap(pg,'#rh-del',900);
const r4={loc:(await loc('rhabs')).filter(i=>i.startsWith('l:')),n:Object.keys(REG).length-n0,pend:(await pend('rhabs')).filter(i=>i.startsWith('l:'))};
console.log('s4)',J(r4));C.s4=r4.loc.length===0&&r4.n===0&&r4.pend.length===0;
// s5) « Retirer le bac à sable » : plus de lignes de démo sur l'appareil, celles des vrais comptes restent
await pg.evaluate(()=>window.TRACE.sandbox.act('off'));await W(pg,2500);
await pg.waitForFunction(()=>window.TRACE&&window.TRACE.espace&&window.TRACE.espace.state().loaded,null,{timeout:20000}).catch(()=>{});await W(pg,600);
await home(pg,'htRh');await W(pg,1500);await tapAct(pg,'x','rh|tab|abs',600);
const r5={abs:await loc('rhabs'),pv:await loc('rhpv'),kv:await pg.evaluate(async()=>{const T=window.TRACE;return null;})};
r5.demo=(r5.abs||[]).concat(r5.pv||[]).filter(i=>i.startsWith('l:'));r5.reel=(r5.abs||[]).map(i=>i.split('|')[0]).sort();
console.log('s5)',J(r5));C.s5=Array.isArray(r5.abs)&&r5.demo.length===0&&J(r5.reel)===J(['hugo.testsoudeur@exemple.fr','marc.testmanchon@exemple.fr','theo.testtuyau@exemple.fr']);
// s6) console propre, rien de refusé
console.log('s6)',J({logs,REFUS}));C.s6=logs.length===0&&REFUS.length===0;
await browser.close();
const bad=Object.entries(C).filter(([k,v])=>!v).map(([k])=>k);console.log(bad.length?'RESULTAT: ECHEC '+bad.join(','):'RESULTAT: TOUT VERT');
