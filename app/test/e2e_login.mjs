// CONNEXION PAR MOT DE PASSE (Ethan 08/10 : « ça me met Connecté ✓ mais ça ne me connecte pas », puis « si je me déconnecte et me reconnecte, pareil »).
// Supabase est SIMULÉ au niveau réseau (page.route sur l'URL du projet) : le vrai client supabase-js tourne, reçoit une session, émet SIGNED_IN / SIGNED_OUT,
// l'appli charge le profil (poste admin) — on vérifie que l'écran de connexion LAISSE LA PLACE à l'accueil : à la 1re connexion, après déconnexion → reconnexion,
// et au rechargement (session restaurée). Zéro erreur de page tolérée.
import { chromium } from 'playwright';
const BASE=process.env.BASE||'http://localhost:8765';
const SB='https://pghftlepduvfazbiavhq.supabase.co';
const UID='11111111-2222-4333-8444-555555555555';const EMAIL='elebihan@scr-soudure.fr';
const b64u=o=>Buffer.from(JSON.stringify(o)).toString('base64').replace(/=+$/,'').replace(/\+/g,'-').replace(/\//g,'_');
const now=()=>Math.floor(Date.now()/1000);
let CUR={id:UID,email:EMAIL};const user=()=>({id:CUR.id,aud:'authenticated',role:'authenticated',email:CUR.email,email_confirmed_at:'2026-10-08T09:00:00Z',confirmed_at:'2026-10-08T09:00:00Z',last_sign_in_at:new Date().toISOString(),app_metadata:{provider:'email',providers:['email']},user_metadata:{},identities:[],created_at:'2026-10-08T09:00:00Z',updated_at:new Date().toISOString(),is_anonymous:false});
const session=()=>{const t=now();const jwt=b64u({alg:'HS256',typ:'JWT'})+'.'+b64u({iss:SB+'/auth/v1',sub:CUR.id,aud:'authenticated',exp:t+3600,iat:t,email:CUR.email,role:'authenticated',session_id:'sess-'+CUR.id.slice(0,4)})+'.sig';
  return {access_token:jwt,token_type:'bearer',expires_in:3600,expires_at:t+3600,refresh_token:'rt-'+t,user:user()};};
const profile={id:UID,email:EMAIL,name:'Ethan LE BIHAN',role:'chef',active:true,poste:'resp_exploitation',admin:true,type:'salarie',rights:{},sites:null,prenom:'Ethan',nom:'LE BIHAN',created_at:'2026-10-08T09:00:00Z'}; // comptes v2 : poste réel + drapeau admin
const calls=[];let loggedOut=0;const paul={id:'u-2',email:'paul.durand@scr-soudure.fr',name:'Paul DURAND',nom:'DURAND',prenom:'Paul',role:'soudeur',active:true,poste:'soudeur',admin:false,type:'salarie',rights:{},sites:null,created_at:'2026-10-08T09:30:00Z'};const profiles=[profile,paul];const invites=[];const settings={};const rpcs=[];
const browser=await chromium.launch({headless:true, executablePath: process.env.CHROMIUM_PATH||undefined});
const ctx=await browser.newContext({viewport:{width:440,height:900}});
await ctx.route(u=>u.href.startsWith(SB),async route=>{const req=route.request();const u=new URL(req.url());const p=u.pathname;const acc=req.headers()['accept']||'';calls.push(req.method()+' '+p+(u.search?u.search.slice(0,40):''));
  const json=(o,status=200)=>route.fulfill({status,contentType:'application/json',headers:{'access-control-allow-origin':'*'},body:JSON.stringify(o)});
  if(p==='/auth/v1/token'){let b={};try{b=JSON.parse(req.postData()||'{}');}catch(e){}if(b.email){const pr=profiles.find(x=>x.email===String(b.email).toLowerCase());if(pr)CUR={id:pr.id,email:pr.email};}return json(session());}
  if(p==='/auth/v1/user')return json(user());
  if(p==='/auth/v1/logout'){loggedOut++;return route.fulfill({status:204,headers:{'access-control-allow-origin':'*'},body:''});}
  if(p.startsWith('/auth/v1/'))return json({});
  if(p==='/rest/v1/profiles'){const m=/id=eq\.([^&]+)/.exec(u.search);const rows=m?profiles.filter(x=>x.id===decodeURIComponent(m[1])):profiles;return json(/object/.test(acc)?(rows[0]||null):rows);}
  if(p==='/rest/v1/app_settings'){const m=/key=eq\.([^&]+)/.exec(u.search);const k=m?decodeURIComponent(m[1]):'';const rows=settings[k]!==undefined?[{value:settings[k]}]:[];return json(/object/.test(acc)?(rows[0]||null):rows);}
  if(p.startsWith('/rest/v1/rpc/')){let b={};try{b=JSON.parse(req.postData()||'{}');}catch(e){}const fn=p.slice('/rest/v1/rpc/'.length);rpcs.push(fn+' '+JSON.stringify(b).slice(0,120));
    if(fn==='admin_set_setting'){settings[b.p_key]=b.p_value;return json(null);}
    if(fn==='admin_set_profile'){const t=profiles.find(x=>x.id===b.target);if(t&&b.patch){if(b.target===UID&&((b.patch.admin===false)||(b.patch.active===false)))return json({message:'tu ne peux pas te retirer tes propres pouvoirs'},400);Object.assign(t,b.patch);}return json(null);}
    if(fn==='invite_access'){ /* comme le vrai serveur : invitation ; le profil n'existe qu'après la première connexion */ const i=invites.findIndex(x=>x.email===b.p_email);const row={email:b.p_email,nom:b.p_nom,prenom:b.p_prenom,poste:b.p_poste,type:b.p_type,rights:b.p_rights||{},sites:b.p_sites,created_at:new Date().toISOString(),used_at:null};if(i>=0)invites[i]=row;else invites.push(row);const pr=profiles.find(x=>x.email===b.p_email);if(pr)Object.assign(pr,{nom:b.p_nom,prenom:b.p_prenom,poste:b.p_poste,type:b.p_type,rights:b.p_rights||{},sites:b.p_sites,active:true});return json(null);}
    return json([]);}
  if(p==='/rest/v1/invites'){const m=/email=eq\.([^&]+)/.exec(u.search);const em=m?decodeURIComponent(m[1]):null;
    if(req.method()==='GET')return json(invites.filter(x=>!x.used_at&&(!em||x.email===em)));
    if(req.method()==='PATCH'){let b={};try{b=JSON.parse(req.postData()||'{}');}catch(e){}rpcs.push('PATCH invites '+em+' '+JSON.stringify(b).slice(0,80));invites.filter(x=>x.email===em).forEach(x=>Object.assign(x,b));return json([]);}
    if(req.method()==='DELETE'){rpcs.push('DELETE invites '+em);for(let i=invites.length-1;i>=0;i--)if(invites[i].email===em)invites.splice(i,1);return json([]);}}
  if(p.startsWith('/rest/v1/'))return json([]);
  return json([]);});
const page=await ctx.newPage();
const logs=[];page.on('pageerror',e=>logs.push('PAGEERROR: '+e.message.slice(0,300)));page.on('console',m=>{if(m.type()==='error'&&!/realtime|websocket|Failed to fetch|net::ERR|404/i.test(m.text()))logs.push(m.text().slice(0,200));});
page.on('dialog',d=>d.accept().catch(()=>{}));
const C={};
await page.goto(BASE+'/index.html');await page.waitForTimeout(600);
await page.evaluate(()=>{localStorage.clear();});await page.reload();await page.waitForTimeout(900);
const scr=()=>page.evaluate(()=>({login:document.querySelector('#loginView').classList.contains('show'),home:document.querySelector('#homeView').classList.contains('show'),screen:window.TRACE&&window.TRACE.state?window.TRACE.state.screen:null,hint:(document.querySelector('#loginHint')||{}).textContent||''}));
// ── 0) appareil neuf, pas de session → écran de connexion
let out=await scr();const ver=await page.evaluate(()=>(document.querySelector('#loginVer')||{}).textContent||'');console.log('0) au lancement :',JSON.stringify({...out,ver}));C.c0=out.login&&!out.home&&/^· version \d{2}\/\d{2}\/\d{4} · [0-9a-f]{6}$/.test(ver);
// ── 1) e-mail + mot de passe → « Connecté ✓ » ET l'accueil s'ouvre (avant le 08/10 après-midi : l'écran de connexion restait)
await page.fill('#loginEmail',EMAIL);await page.fill('#loginPwd','Soudure-2026!');await page.click('#loginGo');await page.waitForTimeout(1500);
out=await scr();const home1=await page.evaluate(()=>({ava:!!document.querySelector('#homeAva'),adminTab:!!document.querySelector('#htAdmin'),cloud:(document.querySelector('#cloudBox')||{}).textContent||'',name:(document.querySelector('#homeAva')||{}).textContent||'',isAdmin:window.TRACE.acces.isAdmin(),poste:(window.TRACE.acces.current()||{}).poste,email:(window.TRACE.acces.current()||{}).email}));
console.log('1) connexion :',JSON.stringify({...out,...home1}));
C.c1=!out.login&&out.home&&out.screen==='home'&&/Connecté/.test(out.hint)&&home1.adminTab&&home1.isAdmin&&home1.poste==='resp_exploitation'&&home1.email===EMAIL&&/Responsable d'exploitation · ★ admin/.test(home1.cloud)&&calls.some(c=>/POST \/auth\/v1\/token\?grant_type=password/.test(c))&&calls.some(c=>/GET \/rest\/v1\/profiles/.test(c));
// ── 2) menu du compte : « ⚙ Administrateur », puis « Se déconnecter » → écran de connexion
await page.click('#homeAva');await page.waitForTimeout(300);
const menu=await page.evaluate(()=>({adm:!!document.querySelector('#accUsers'),out:!!document.querySelector('#accOut'),pwd:!!document.querySelector('#accPwd'),title:(document.querySelector('#modal h3')||{}).textContent||'',ver:/TRACÉ version \d{2}\/\d{2}\/\d{4} · [0-9a-f]{6}/.test(document.querySelector('#modal').textContent)}));
await page.click('#accOut');await page.waitForTimeout(900);
out=await scr();const after=await page.evaluate(()=>({cloudUser:!!window.TRACE.state.cloudUser,profile:!!window.TRACE.state.profile,modal:document.querySelector('#modal')&&document.querySelector('#modal').classList.contains('show')}));
console.log('2) menu + déconnexion :',JSON.stringify({...menu,...out,...after,loggedOut}));
C.c2=menu.adm&&menu.out&&menu.pwd&&menu.ver&&/Ethan LE BIHAN/.test(menu.title)&&out.login&&!out.home&&!after.cloudUser&&!after.profile&&loggedOut===1;
// ── 3) RECONNEXION sans recharger (le cas d'Ethan) → l'accueil doit se rouvrir, profil admin rechargé
const nCalls=calls.length;
await page.fill('#loginEmail',EMAIL);await page.fill('#loginPwd','Soudure-2026!');await page.click('#loginGo');await page.waitForTimeout(1500);
out=await scr();const home2=await page.evaluate(()=>({adminTab:!!document.querySelector('#htAdmin'),isAdmin:window.TRACE.acces.isAdmin(),cloudUser:!!window.TRACE.state.cloudUser,profile:!!window.TRACE.state.profile&&window.TRACE.state.profile.poste}));
console.log('3) reconnexion :',JSON.stringify({...out,...home2,newCalls:calls.slice(nCalls).filter(c=>/token|profiles/.test(c))}));
C.c3=!out.login&&out.home&&/Connecté/.test(out.hint)&&home2.adminTab&&home2.isAdmin&&home2.cloudUser&&home2.profile==='resp_exploitation'&&calls.slice(nCalls).some(c=>/grant_type=password/.test(c));
// ── 4) touche Entrée dans le mot de passe = Se connecter ; mot de passe vide = message, pas d'appel réseau
await page.click('#homeAva');await page.waitForTimeout(200);await page.click('#accOut');await page.waitForTimeout(700);
const n2=calls.length;await page.fill('#loginPwd','');await page.click('#loginGo');await page.waitForTimeout(300);
const empty=await page.evaluate(()=>(document.querySelector('#loginHint').textContent));const noCall=!calls.slice(n2).some(c=>/token/.test(c));
await page.fill('#loginPwd','Soudure-2026!');await page.press('#loginPwd','Enter');await page.waitForTimeout(1500);out=await scr();
console.log('4) Entrée + mot de passe vide :',JSON.stringify({empty:empty.slice(0,60),noCall,...out}));
C.c4=/manquant/i.test(empty)&&noCall&&out.home&&!out.login;
// ── 5) rechargement : session restaurée → accueil direct, toujours admin
await page.reload();await page.waitForTimeout(1500);out=await scr();const home3=await page.evaluate(()=>({adminTab:!!document.querySelector('#htAdmin'),isAdmin:window.TRACE.acces.isAdmin()}));
console.log('5) rechargement :',JSON.stringify({...out,...home3}));
C.c5=out.home&&!out.login&&home3.adminTab&&home3.isAdmin;
// ── 6) déconnexion puis rechargement : la session ne doit PAS revenir
await page.click('#homeAva');await page.waitForTimeout(200);await page.click('#accOut');await page.waitForTimeout(700);await page.reload();await page.waitForTimeout(1200);out=await scr();
console.log('6) déconnecté + rechargement :',JSON.stringify(out));
C.c6=out.login&&!out.home;
// ── 7) onglet Administrateur en MODE SERVEUR : comptes du serveur, carte « moi » protégée (pas de désactivation ni de retrait des pouvoirs), accès créé = RPC invite_access,
//        droit de poste modifié = RPC admin_set_setting puis relu depuis app_settings au rechargement, rôle serveur réaligné par admin_set_profile
await page.fill('#loginEmail',EMAIL);await page.fill('#loginPwd','Soudure-2026!');await page.click('#loginGo');await page.waitForTimeout(1500);
await page.click('#htAdmin');await page.waitForTimeout(800);
out=await page.evaluate(async()=>{const t=document.querySelector('#homeBody').textContent;const me=[...document.querySelectorAll('#homeBody .admAcc')].find(r=>[...r.querySelectorAll('.admChip')].some(c=>c.textContent==='moi'));if(!me)return {noMe:true};
  const cb=me.querySelector('[data-adm="active"]');cb.checked=false;cb.dispatchEvent(new Event('change'));await new Promise(r=>setTimeout(r,300));const t1=document.querySelector('#toast').textContent;
  me.querySelector('[data-admflag]').click();await new Promise(r=>setTimeout(r,200));const t2=document.querySelector('#toast').textContent;const modal=document.getElementById('modal').classList.contains('show');
  return {server:/Comptes du serveur/.test(t),star:me.querySelector('.admStar').classList.contains('on'),stillChecked:cb.checked,t1,t2,modal,poste:me.querySelector('[data-adm="poste"]').value};});
console.log('7a) mode serveur — carte « moi » :',JSON.stringify(out));
C.c7a=!out.noMe&&out.server&&out.star&&out.stillChecked&&/propre compte/.test(out.t1)&&/propres pouvoirs/.test(out.t2)&&!out.modal&&out.poste==='resp_exploitation';
await page.click('#admNew');await page.waitForTimeout(200);await page.fill('#an-prenom','Karim');await page.fill('#an-nom','BENALI');await page.fill('#an-email','karim.benali@scr-soudure.fr');await page.selectOption('#an-poste','soudeur');await page.click('#an-ok');await page.waitForTimeout(800);
out=await page.evaluate(()=>{const cards=[...document.querySelectorAll('#homeBody .admAcc')];const k=cards.find(c=>/Karim BENALI/.test(c.textContent));return {n:cards.length,karim:!!k,chip:k&&/invité · jamais connecté/.test(k.textContent),star:k&&k.querySelector('.admStar').disabled,retirer:k&&!!k.querySelector('[data-admuninvite]'),noActif:k&&!k.querySelector('[data-adm="active"]'),count:/1 invité/.test(document.querySelector('#admCount').textContent),toast:document.querySelector('#toast').textContent};});
out.rpc=rpcs.filter(r=>/^invite_access/.test(r)).length;out.noProfile=!profiles.some(x=>x.email==='karim.benali@scr-soudure.fr');out.inv=invites.length;out.listed=calls.some(c=>/GET \/rest\/v1\/invites/.test(c));
console.log('7b) accès créé sur le serveur = invitation visible :',JSON.stringify(out));C.c7b=out.n===3&&out.karim&&out.chip&&out.star&&out.retirer&&out.noActif&&out.count&&/serveur/.test(out.toast)&&out.rpc===1&&out.noProfile&&out.inv===1&&out.listed;
// l'invitation se règle comme un compte (poste → table invites) et se retire
await page.evaluate(()=>{const k=[...document.querySelectorAll('#homeBody .admAcc')].find(c=>/Karim BENALI/.test(c.textContent));const s=k.querySelector('[data-adm="poste"]');s.value='activites_specifiques';s.dispatchEvent(new Event('change'));});await page.waitForTimeout(700);
out={patch:rpcs.filter(r=>/^PATCH invites karim/.test(r)&&/activites_specifiques/.test(r)).length,inv:invites[0]&&invites[0].poste,card:await page.evaluate(()=>{const k=[...document.querySelectorAll('#homeBody .admAcc')].find(c=>/Karim BENALI/.test(c.textContent));return k&&k.querySelector('[data-adm="poste"]').value;})};
await page.evaluate(()=>{const k=[...document.querySelectorAll('#homeBody .admAcc')].find(c=>/Karim BENALI/.test(c.textContent));k.querySelector('[data-admuninvite]').click();});await page.waitForTimeout(200);out.modal=await page.evaluate(()=>/Retirer l'invitation/.test(document.getElementById('modal').textContent));await page.click('#ai-ok');await page.waitForTimeout(700);
out.after={del:rpcs.filter(r=>/^DELETE invites karim/.test(r)).length,inv:invites.length,n:await page.evaluate(()=>document.querySelectorAll('#homeBody .admAcc').length)};
console.log('7b2) invitation modifiée puis retirée :',JSON.stringify(out));C.c7b2=out.patch===1&&out.inv==='activites_specifiques'&&out.card==='activites_specifiques'&&out.modal&&out.after.del===1&&out.after.inv===0&&out.after.n===2;
// droit de poste : les soudeurs ont le stock → RPC admin_set_setting ; Karim (soudeur) passe en rôle serveur « bureau » (règles RLS) ; relu au rechargement
await page.evaluate(()=>[...document.querySelectorAll('#homeBody [data-av]')].find(b=>b.dataset.av==='postes').click());await page.waitForTimeout(300);
await page.evaluate(()=>{const cb=document.querySelector('#homeBody [data-pr="stock.edit"]');cb.checked=true;cb.dispatchEvent(new Event('change'));});await page.waitForTimeout(600);
out={set:rpcs.filter(r=>/^admin_set_setting/.test(r)).length,stored:settings.poste_rights,karimRole:(profiles.find(x=>x.email==='paul.durand@scr-soudure.fr')||{}).role,toast:await page.evaluate(()=>document.querySelector('#toast').textContent)};
await page.evaluate(()=>localStorage.removeItem('trace:posteRights'));await page.reload();await page.waitForTimeout(1800);
out.reloaded=await page.evaluate(()=>({sou:window.TRACE.acces.posteRights('soudeur')['stock.edit'],mirror:JSON.parse(localStorage.getItem('trace:posteRights')||'{}')}));
console.log('7c) droit de poste sur le serveur :',JSON.stringify(out));C.c7c=out.set===1&&out.stored&&out.stored.soudeur&&out.stored.soudeur['stock.edit']===true&&out.karimRole==='bureau'&&/serveur/.test(out.toast)&&out.reloaded.sou===true&&out.reloaded.mirror.soudeur;
// ── 8) 🧪 MODE TEST : le sélecteur du chantier liste les VRAIES personnes (profils + invitations, pas les personnages de démo) ; en choisir une donne ses droits et crédits,
//        la signature reste la mienne ; bandeau sur l'accueil + retour ; un compte non administrateur (Paul) n'a que « moi »
await page.click('#htAdmin');await page.waitForTimeout(800);await page.click('#admNew');await page.waitForTimeout(200);await page.fill('#an-prenom','Karim');await page.fill('#an-nom','BENALI');await page.fill('#an-email','karim.benali@scr-soudure.fr');await page.selectOption('#an-poste','soudeur');await page.click('#an-ok');await page.waitForTimeout(800);
out=await page.evaluate(()=>{const o=[...document.querySelectorAll('#roleSel option')];const g=[...document.querySelectorAll('#roleSel optgroup')].map(x=>x.label);return {opts:o.map(x=>x.textContent),groups:g,me:o[0].value,demo:o.some(x=>/Karim B\. — Soudeur|Julien R\.|Sophie M\./.test(x.textContent))};});
const paulOpt=out.opts.find(t=>/Paul DURAND — Soudeur/.test(t));const karimOpt=out.opts.find(t=>/Karim BENALI — Soudeur · invité/.test(t));
await page.selectOption('#roleSel',{label:paulOpt});await page.waitForTimeout(400);
out.test=await page.evaluate(()=>{const T=window.TRACE;const Ac=T.acces;const a=Ac.current();T.showScreen('home');T.renderHome();return {poste:a.poste,test:!!a.test,isAdmin:Ac.isAdmin(),credits:Ac.credits(a)===Infinity?'inf':Ac.credits(a),left:T.undo.left()===Infinity?'inf':T.undo.left(),sign:T.conv?document.querySelector('#roleSel').value:'',me:(window.TRACE.state.profile||{}).name,admTab:document.querySelector('#htAdmin').style.display!=='none',banner:document.querySelector('#homeBanner').textContent,cloud:(document.querySelector('#cloudBox')||{}).textContent||''};});
await page.click('#hbMe');await page.waitForTimeout(300);
out.back=await page.evaluate(()=>{const Ac=window.TRACE.acces;return {admin:Ac.isAdmin(),poste:Ac.current().poste,sel:document.querySelector('#roleSel').value,banner:document.querySelector('#homeBanner').style.display};});
console.log('8a) tester comme une vraie personne :',JSON.stringify({opts:out.opts.length,groups:out.groups,me:out.me,demo:out.demo,paul:!!paulOpt,karim:!!karimOpt,test:out.test,back:out.back}));
C.c8a=out.opts.length===3&&out.groups.length===1&&/Terrain/.test(out.groups[0])&&out.me==='__me'&&!out.demo&&paulOpt&&karimOpt&&out.test.poste==='soudeur'&&out.test.test&&!out.test.isAdmin&&out.test.credits===3&&out.test.left===3&&/^acc:/.test(out.test.sign)&&!out.test.admTab&&/Mode test/.test(out.test.banner)&&/tu es Paul DURAND/.test(out.test.banner)&&/signature/.test(out.test.banner)&&/mode test/.test(out.test.cloud)&&out.back.admin&&out.back.poste==='resp_exploitation'&&out.back.sel==='__me'&&out.back.banner==='none';
// 8c) mode test = signature de la personne testée ; liste « Pour » d'une tâche = VRAIES personnes groupées (moi = chef) ; tâche « à traiter » prise par Paul (en mode test)
await page.evaluate(()=>setTimeout(()=>window.TRACE.go('bain'),50));await page.waitForTimeout(3500);
out=await page.evaluate(()=>{const T=window.TRACE;T.state.tab='conv';T.renderAll();const cb=document.querySelector('#cvTask');if(cb)cb.click();return new Promise(r=>setTimeout(()=>{const sel=document.querySelector('#cvTo');const opts=sel?[...sel.options].map(o=>o.textContent):[];const groups=sel?[...sel.querySelectorAll('optgroup')].map(g=>g.label):[];r({site:T.state.siteId,hasSel:!!sel,first:opts[0],paul:opts.some(t=>/Paul DURAND — Soudeur/.test(t)),karim:opts.some(t=>/Karim BENALI — Soudeur/.test(t)),me:opts.some(t=>/Ethan LE BIHAN — Responsable d'exploitation \(moi\)/.test(t)),demo:opts.some(t=>/Karim B\.|Julien R\./.test(t)),groups,chips:[...document.querySelectorAll('#convview [data-cvf]')].map(b=>b.dataset.cvf).join(',')});},300));});
await page.fill('#cvText','Vannes du conteneur à souder');await page.click('#cvSend');await page.waitForTimeout(600);
out.task=await page.evaluate(()=>{const T=window.TRACE;const m=T.net.conv.msgs[T.net.conv.msgs.length-1];return {kind:m.kind,to:m.task&&m.task.to,by:m.by,txt:/à traiter/.test(document.querySelector('#convview').textContent)};});
await page.selectOption('#roleSel',{label:paulOpt});await page.waitForTimeout(400);
out.pt=await page.evaluate(()=>{const T=window.TRACE;const name=T.me().name;T.state.tab='conv';T.renderAll();const v=document.querySelector('#convview');const take=v.querySelector('[data-cvtake]');if(take)take.click();return new Promise(r=>setTimeout(()=>{const m2=T.net.conv.msgs[T.net.conv.msgs.length-1];r({sign:name,role:T.role(),hadTake:!!take,to2:m2.task.to,takenBy:m2.task.takenBy,txt2:/prise par Paul DURAND/.test(document.querySelector('#convview').textContent),mine:T.conv.mine().length});},300));});
await page.selectOption('#roleSel','__me');await page.waitForTimeout(300);
console.log('8c) tâches « pour » + mode test :',JSON.stringify(out));C.c8c=out.site==='bain'&&out.hasSel&&/À traiter/.test(out.first)&&out.paul&&out.karim&&out.me&&!out.demo&&out.groups.includes('Terrain')&&out.groups.includes('Encadrement travaux')&&out.chips==='all,msg,notes,open,mine,done'&&out.task.kind==='task'&&out.task.to==='tous'&&out.task.by==='Ethan LE BIHAN'&&out.task.txt&&out.pt.sign==='Paul DURAND'&&out.pt.role==='bureau'&&out.pt.hadTake&&out.pt.to2==='Paul DURAND'&&out.pt.takenBy==='Paul DURAND'&&out.pt.txt2&&out.pt.mine===1; // rôle serveur « bureau » : les soudeurs ont reçu le stock en 7c
await page.evaluate(()=>{window.TRACE.showScreen('home');window.TRACE.renderHome();});await page.waitForTimeout(300);
// Paul (soudeur, pas admin) se connecte : un seul choix, lui-même
await page.click('#homeAva');await page.waitForTimeout(200);await page.click('#accOut');await page.waitForTimeout(700);
await page.fill('#loginEmail','paul.durand@scr-soudure.fr');await page.fill('#loginPwd','Soudure-2026!');await page.click('#loginGo');await page.waitForTimeout(1500);
out=await page.evaluate(()=>{const Ac=window.TRACE.acces;const o=[...document.querySelectorAll('#roleSel option')];return {n:o.length,txt:o[0].textContent,poste:Ac.current().poste,admin:Ac.isAdmin(),admTab:document.querySelector('#htAdmin').style.display==='none',home:document.querySelector('#homeView').classList.contains('show'),credits:Ac.credits(Ac.current())};});
console.log('8b) Paul (soudeur) : lui-même seulement :',JSON.stringify(out));C.c8b=out.n===1&&/Paul DURAND — Soudeur/.test(out.txt)&&out.poste==='soudeur'&&!out.admin&&out.admTab&&out.home&&out.credits===3;
console.log('erreurs de page :',logs.length?logs:'aucune');
const ko=Object.entries(C).filter(([k,v])=>!v).map(([k])=>k);
console.log(ko.length||logs.length?'RESULTAT: ECHEC '+ko.join(',')+(logs.length?' + erreurs':''):'RESULTAT: TOUT VERT');
await browser.close();
