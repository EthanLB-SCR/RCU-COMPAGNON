// « DIFFÉRENCES AVEC SOFIANE » (13/10/2026 soir). Ethan, sur l'ordinateur de Sofiane : « on ne voit pas la même chose : vie du chantier, il ne voit pas d'équipe
// au planning alors qu'il y en a ; il voit une adresse e-mail en chef de chantier, moi je vois le prénom du chef… ; il a un message d'erreur d'un truc pas envoyé au serveur
// qu'on n'arrive pas à enlever alors qu'il n'a rien voulu envoyer ; l'onglet mesure DH n'a pas les mêmes paramètres que moi — les paramètres sont toujours les mêmes ».
// Supabase SIMULÉ : un compte NON administrateur (la table « invites » lui est fermée, comme la vraie RLS ; l'annuaire passe par la RPC annuaire_invites),
// puis l'administrateur. Personnes et chantier fictifs (chantier de démonstration « bain »).
import { chromium } from 'playwright';
const BASE=process.env.BASE||'http://localhost:8765';
const SB='https://pghftlepduvfazbiavhq.supabase.co';
const b64u=o=>Buffer.from(JSON.stringify(o)).toString('base64').replace(/=+$/,'').replace(/\+/g,'-').replace(/\//g,'_');
const now=()=>Math.floor(Date.now()/1000);
const ETHAN={id:'11111111-2222-4333-8444-555555555555',email:'elebihan@scr-soudure.fr'},SOF={id:'22222222-2222-4333-8444-555555555555',email:'sofiane.test@scr-soudure.fr'};
const ALEX='albert.testchef@scr-soudure.fr'; /* chef FICTIF */
let CUR=SOF;let SOF_ROLE='bureau';
const user=()=>({id:CUR.id,aud:'authenticated',role:'authenticated',email:CUR.email,email_confirmed_at:'2026-10-08T09:00:00Z',app_metadata:{provider:'email'},user_metadata:{},identities:[],created_at:'2026-10-08T09:00:00Z',updated_at:new Date().toISOString()});
const session=()=>{const t=now();return {access_token:b64u({alg:'HS256',typ:'JWT'})+'.'+b64u({iss:SB+'/auth/v1',sub:CUR.id,aud:'authenticated',exp:t+3600,iat:t,email:CUR.email,role:'authenticated'})+'.sig',token_type:'bearer',expires_in:3600,expires_at:t+3600,refresh_token:'rt-'+t,user:user()};};
const prof=()=>[{id:ETHAN.id,email:ETHAN.email,name:'Ethan LE BIHAN',prenom:'Ethan',nom:'LE BIHAN',role:'chef',active:true,poste:'resp_exploitation',admin:true,type:'salarie',rights:{},sites:null,created_at:'2026-10-08T09:00:00Z'},
  {id:SOF.id,email:SOF.email,name:'Sofiane TEST',prenom:'Sofiane',nom:'TEST',role:SOF_ROLE,active:true,poste:'conducteur',admin:false,type:'salarie',rights:{},sites:null,created_at:'2026-10-08T09:30:00Z'}];
const INV=[{email:ALEX,nom:'TESTCHEF',prenom:'Albert',poste:'chef',type:'salarie',rights:{'site.delete':true},sites:null,created_at:'2026-10-12T08:00:00Z',used_at:null}];
const today=new Date();const iso=d=>d.toISOString().slice(0,10);
const wk=(d=>{const t=new Date(Date.UTC(d.getFullYear(),d.getMonth(),d.getDate()));const dn=(t.getUTCDay()+6)%7;t.setUTCDate(t.getUTCDate()-dn+3);const f=new Date(Date.UTC(t.getUTCFullYear(),0,4));return t.getUTCFullYear()+'-W'+String(1+Math.round(((t-f)/864e5-3+((f.getUTCDay()+6)%7))/7)).padStart(2,'0');})(today);
let SETTINGS={dh_params:{rkm:15,isoMin:500,tol:3,piqL:1.5,at:'2026-10-13T16:00:00Z',by:'Ethan LE BIHAN'}};
const rpcs=[];const calls=[];let REG_DENY=true;let META_BUILTIN=false;
const browser=await chromium.launch({headless:true, executablePath: process.env.CHROMIUM_PATH||undefined});
const CORS={'access-control-allow-origin':'*','access-control-allow-headers':'*','access-control-allow-methods':'GET, POST, PUT, PATCH, DELETE, OPTIONS'};
async function mkCtx(){const ctx=await browser.newContext({viewport:{width:1100,height:900}});
  await ctx.route(u=>u.href.startsWith(SB),async route=>{const req=route.request();const u=new URL(req.url());const p=u.pathname;const acc=req.headers()['accept']||'';calls.push(req.method()+' '+p+(u.search?u.search.slice(0,50):''));
    const json=(o,status=200)=>route.fulfill({status,contentType:'application/json',headers:CORS,body:JSON.stringify(o)});
    if(req.method()==='OPTIONS')return route.fulfill({status:200,headers:CORS,body:''});
    let b={};try{b=JSON.parse(req.postData()||'{}');}catch(e){}
    if(p==='/auth/v1/token')return json(session());if(p==='/auth/v1/user')return json(user());if(p.startsWith('/auth/v1/'))return json({});
    if(p==='/rest/v1/profiles'){const rows=prof();const m=/id=eq\.([^&]+)/.exec(u.search);const r=m?rows.filter(x=>x.id===decodeURIComponent(m[1])):rows;return json(/object/.test(acc)?(r[0]||null):r);}
    if(p==='/rest/v1/invites')return json(CUR.id===ETHAN.id?INV:[]); /* RLS : l'administrateur seulement */
    if(p==='/rest/v1/rpc/annuaire_invites'){rpcs.push('annuaire');return json(INV.map(i=>({email:i.email,nom:i.nom,prenom:i.prenom,poste:i.poste,type:i.type})));}
    if(p==='/rest/v1/app_settings'){const m=/key=eq\.([^&]+)/.exec(u.search);const k=m?decodeURIComponent(m[1]):'';const rows=SETTINGS[k]!==undefined?[{key:k,value:SETTINGS[k]}]:[];return json(/object/.test(acc)?(rows[0]||null):rows);}
    if(p==='/rest/v1/rpc/admin_set_setting'){rpcs.push('set '+b.p_key);if(CUR.id!==ETHAN.id)return json({code:'P0001',message:"réservé à l'administrateur"},400);SETTINGS[b.p_key]=b.p_value;return json(null);}
    if(p==='/rest/v1/rpc/registre_set'){rpcs.push('reg '+b.p_kind+' '+b.p_id);if(REG_DENY&&b.p_kind==='affaire')return json({code:'P0001',message:'affaires : réservé à l\'encadrement (chef, bureau)'},400);return json({kind:b.p_kind,id:b.p_id,data:b.p_patch,updated_at:new Date().toISOString()});}
    if(p==='/rest/v1/rpc/site_set_part'){rpcs.push('part '+b.p_key);return json(null);}
    if(p==='/rest/v1/planning')return json([{week:wk,data:{aff:{[ALEX]:{[iso(today)]:['bain']}}},updated_at:new Date().toISOString()}]);
    if(p==='/rest/v1/sites'){const sel=u.searchParams.get('select')||'';if(req.method()!=='GET'){rpcs.push('sites '+req.method());return json([]);}if(/chef:data/.test(sel))return json([{id:'bain',name:'Bain-de-Bretagne — LOGSTOR (DWG calepinage)',supplier:'LOGSTOR',updated_at:'2026-10-01T08:00:00Z',chef:ALEX,conducteur:SOF.email,ville:'Bain-de-Bretagne',builtin:META_BUILTIN||undefined}]);return json(/object/.test(acc)?null:[]);}
    if(p.startsWith('/rest/v1/rpc/'))return json(null);
    if(p.startsWith('/rest/v1/'))return json(/object/.test(acc)?null:[]);
    return json([]);});
  const page=await ctx.newPage();page.on('dialog',d=>d.accept().catch(()=>{}));return {ctx,page};}
const C={};const logs=[];
const login=async(page,em)=>{await page.goto(BASE+'/index.html');await page.waitForTimeout(500);await page.evaluate(()=>{localStorage.clear();localStorage.setItem('trace:wide','1');});await page.evaluate(()=>new Promise(r=>{try{const q=indexedDB.deleteDatabase('trace-kv');q.onsuccess=q.onerror=q.onblocked=()=>r();}catch(e){r();}}));await page.reload();await page.waitForTimeout(900);
  await page.fill('#loginEmail',em);await page.fill('#loginPwd','Test-2026!');await page.click('#loginGo');await page.waitForTimeout(3000);};
// ── 1) Sofiane (non administrateur) : l'annuaire contient Albert (invité, jamais connecté) — nom complet, pas l'adresse ; la table « invites » ne lui est pas lue
let {ctx,page}=await mkCtx();page.on('pageerror',e=>logs.push('PAGEERROR: '+e.message.slice(0,300)));
CUR=SOF;await login(page,SOF.email);
let out={acc:await page.evaluate(async()=>{const r=await window.TRACE.acces.list();const a=r.rows.find(x=>x.email==='albert.testchef@scr-soudure.fr');return a?{name:a.name,poste:a.poste,invite:a.invite,rights:Object.keys(a.rights||{}).length}:null;}),rpc:rpcs.filter(x=>x==='annuaire').length};
// le Bureau du chantier : chef « Albert » (pas « albert.testchef »), l'équipe du jour au planning
await page.evaluate(async()=>{const T=window.TRACE;await T.go('bain');});await page.waitForTimeout(2500);
out.bureau=await page.evaluate(()=>{const T=window.TRACE;if(T.net&&!T.net.id)T.net.id='bain'; /* chantier de démonstration sans identifiant : comme un vrai chantier du serveur */T.state.tab='bureau';T.renderAll();const st=[...document.querySelectorAll('#bureau .ac-bhero .ac-stat')].map(x=>({b:(x.querySelector('b')||{}).textContent||'',s:(x.querySelector('small')||{}).textContent||''}));const c=st.find(x=>x.s==='chef de chantier');const t=(document.getElementById('bureau')||document.body).textContent.replace(/\s+/g,' ');return {chef:c?c.b:null,adresse:/albert\.testchef/.test(t),present:/1 présent : Albert/.test(t),nobody:/personne de placé aujourd'hui/.test(t)};});
console.log('1) annuaire + bureau du chantier :',JSON.stringify(out));
C.c1=out.acc&&out.acc.name==='Albert TESTCHEF'&&out.acc.invite&&out.acc.rights===0&&out.rpc>=1&&out.bureau.chef==='Albert'&&!out.bureau.adresse&&out.bureau.present&&!out.bureau.nobody;
// ── 2) paramètres DH : les réglages SCR du serveur (15 Ω/km, 500 MΩ, 3 %, 1,5 m), en lecture pour Sofiane
out=await page.evaluate(()=>{const T=window.TRACE;T.state.tab='bouclage';T.renderAll();const g=id=>{const e=document.getElementById(id);return e?{v:e.value,dis:e.disabled}:null;};return {dh:{rkm:T.state.dh.rkm,iso:T.state.dh.isoMin,tol:T.state.dh.tol,piq:T.state.dh.piqL},rkm:g('dh-rkm'),iso:g('dh-iso'),tol:g('dh-tol'),piql:g('dh-piql'),note:(document.querySelector('#bouclageView .hyChip[title^="Réglage commun"]')||document.querySelector('.hyChip[title^="Réglage commun"]')||{}).textContent||'',pub:!!document.getElementById('dh-pub')};});
console.log('2) paramètres DH (Sofiane) :',JSON.stringify(out));
C.c2=out.dh.rkm===15&&out.dh.iso===500&&out.dh.tol===3&&out.dh.piq===1.5&&out.rkm&&out.rkm.v==='15'&&out.rkm.dis&&out.iso.dis&&out.tol.dis&&out.piql.dis&&/réglages SCR communs/.test(out.note)&&/administrateur/.test(out.note)&&!out.pub;
// ── 3) écriture refusée par le serveur (droits) : pastille ⚠️ ; depuis le menu du compte → « Abandonner » → plus rien en attente, plus de message
await page.evaluate(()=>{const T=window.TRACE;T.affaires.set('O2610-90',{num:'O2610-90',nom:'Essai refus',client:'X',etat:'devis'});});await page.waitForTimeout(1800);
out={pend:await page.evaluate(()=>window.TRACE.reg.pending().map(w=>w.kind+'|'+w.id)),pill:await page.evaluate(()=>{const b=document.querySelector('#syncWarn');return {show:b.classList.contains('show'),t:b.textContent};})};
await page.evaluate(()=>{const T=window.TRACE;T.showScreen('home');T.renderHome();});await page.waitForTimeout(300);await page.click('#homeAva');await page.waitForTimeout(300);
out.acc=await page.evaluate(()=>{const b=document.getElementById('accSync');return b?b.textContent:null;});
await page.click('#accSync');await page.waitForTimeout(300);
out.modal=await page.evaluate(()=>{const m=document.getElementById('modal');const b=m.querySelector('[data-regdrop]');return {t:m.textContent.replace(/\s+/g,' ').slice(0,300),drop:b?b.dataset.regdrop:null};});
await page.evaluate(()=>document.querySelector('#modal [data-regdrop]').click());await page.waitForTimeout(1200);
out.after={pend:await page.evaluate(()=>window.TRACE.reg.pending().length),pill:await page.evaluate(()=>document.querySelector('#syncWarn').classList.contains('show')),toast:await page.evaluate(()=>document.getElementById('toast').textContent),aff:await page.evaluate(()=>!!window.TRACE.affaires.get('O2610-90'))};
console.log('3) refus + abandonner :',JSON.stringify(out));
C.c3=out.pend.includes('affaire|O2610-90')&&out.pill.show&&/affaire \(commerce\)/.test(out.pill.t)&&/1 enregistrement refusé/.test(out.acc||'')&&/réservé à l'encadrement/.test(out.modal.t)&&out.modal.drop==='affaire|O2610-90'&&out.after.pend===0&&!out.after.pill&&/Abandonné : affaire/.test(out.after.toast)&&!out.after.aff;
await ctx.close();
// ── 4) un compte dont le rôle serveur n'a pas le droit (soudeur) ouvre un chantier : le « tracé marché » n'est PAS envoyé tout seul (plus de refus en boucle)
SOF_ROLE='soudeur';META_BUILTIN=true;rpcs.length=0;({ctx,page}=await mkCtx());page.on('pageerror',e=>logs.push('PAGEERROR: '+e.message.slice(0,300)));
CUR=SOF;await login(page,SOF.email);await page.evaluate(async()=>{await window.TRACE.go('bain');});await page.waitForTimeout(3500);
out={all:rpcs.slice(0,20),writes:rpcs.filter(x=>/^part (marche|ts)$|^sites /.test(x)),marche:await page.evaluate(()=>!!(window.TRACE.net&&window.TRACE.net.marche)),pill:await page.evaluate(()=>document.querySelector('#syncWarn').classList.contains('show'))};
console.log('4) pas d\'écriture automatique sans le droit :',JSON.stringify(out));
C.c4=out.writes.length===0&&out.marche&&!out.pill;
await ctx.close();SOF_ROLE='bureau';
// ── 5) l'administrateur : réglages pas encore publiés → « 📤 Appliquer ces réglages à tout le monde » ; ensuite chaque changement vaut pour tous
SETTINGS={};rpcs.length=0;({ctx,page}=await mkCtx());page.on('pageerror',e=>logs.push('PAGEERROR: '+e.message.slice(0,300)));
CUR=ETHAN;await login(page,ETHAN.email);await page.evaluate(async()=>{await window.TRACE.go('bain');});await page.waitForTimeout(2500);
out={before:await page.evaluate(()=>{const T=window.TRACE;T.state.tab='bouclage';T.renderAll();return {pub:!!document.getElementById('dh-pub'),dis:document.getElementById('dh-rkm').disabled};})};
await page.evaluate(()=>document.getElementById('dh-pub').click());await page.waitForTimeout(800);
out.pub={set:rpcs.filter(x=>x==='set dh_params').length,val:SETTINGS.dh_params&&[SETTINGS.dh_params.rkm,SETTINGS.dh_params.isoMin,SETTINGS.dh_params.tol,SETTINGS.dh_params.piqL],by:SETTINGS.dh_params&&SETTINGS.dh_params.by,note:await page.evaluate(()=>(document.querySelector('.hyChip[title^="Réglage commun"]')||{}).textContent||'')};
await page.evaluate(()=>{const e=document.getElementById('dh-rkm');e.value='13.2';e.dispatchEvent(new Event('change'));});await page.waitForTimeout(800);
out.chg={set:rpcs.filter(x=>x==='set dh_params').length,rkm:SETTINGS.dh_params&&SETTINGS.dh_params.rkm};
console.log('5) administrateur : publier puis modifier :',JSON.stringify(out));
C.c5=out.before.pub&&!out.before.dis&&out.pub.set===1&&out.pub.val&&out.pub.val.join()==='12.5,200,5,2'&&/Ethan/.test(out.pub.by||'')&&/tu les modifies pour tout le monde/.test(out.pub.note)&&out.chg.set===2&&out.chg.rkm===13.2;
await ctx.close();
const bad=Object.entries(C).filter(([k,v])=>!v).map(([k])=>k);console.log(bad.length?'RESULTAT: ECHEC '+bad.join(','):'RESULTAT: TOUT VERT');console.log(logs.length?logs:'[]');
await browser.close();
