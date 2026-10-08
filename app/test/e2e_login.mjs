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
const user=()=>({id:UID,aud:'authenticated',role:'authenticated',email:EMAIL,email_confirmed_at:'2026-10-08T09:00:00Z',confirmed_at:'2026-10-08T09:00:00Z',last_sign_in_at:new Date().toISOString(),app_metadata:{provider:'email',providers:['email']},user_metadata:{},identities:[],created_at:'2026-10-08T09:00:00Z',updated_at:new Date().toISOString(),is_anonymous:false});
const session=()=>{const t=now();const jwt=b64u({alg:'HS256',typ:'JWT'})+'.'+b64u({iss:SB+'/auth/v1',sub:UID,aud:'authenticated',exp:t+3600,iat:t,email:EMAIL,role:'authenticated',session_id:'sess-1'})+'.sig';
  return {access_token:jwt,token_type:'bearer',expires_in:3600,expires_at:t+3600,refresh_token:'rt-'+t,user:user()};};
const profile={id:UID,email:EMAIL,name:'Ethan LE BIHAN',role:'chef',active:true,poste:'admin',type:'salarie',rights:{},sites:null,prenom:'Ethan',nom:'LE BIHAN',created_at:'2026-10-08T09:00:00Z'};
const calls=[];let loggedOut=0;
const browser=await chromium.launch({headless:true, executablePath: process.env.CHROMIUM_PATH||undefined});
const ctx=await browser.newContext({viewport:{width:440,height:900}});
await ctx.route(u=>u.href.startsWith(SB),async route=>{const req=route.request();const u=new URL(req.url());const p=u.pathname;const acc=req.headers()['accept']||'';calls.push(req.method()+' '+p+(u.search?u.search.slice(0,40):''));
  const json=(o,status=200)=>route.fulfill({status,contentType:'application/json',headers:{'access-control-allow-origin':'*'},body:JSON.stringify(o)});
  if(p==='/auth/v1/token')return json(session());
  if(p==='/auth/v1/user')return json(user());
  if(p==='/auth/v1/logout'){loggedOut++;return route.fulfill({status:204,headers:{'access-control-allow-origin':'*'},body:''});}
  if(p.startsWith('/auth/v1/'))return json({});
  if(p==='/rest/v1/profiles')return json(/object/.test(acc)?profile:[profile]);
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
C.c1=!out.login&&out.home&&out.screen==='home'&&/Connecté/.test(out.hint)&&home1.adminTab&&home1.isAdmin&&home1.poste==='admin'&&home1.email===EMAIL&&calls.some(c=>/POST \/auth\/v1\/token\?grant_type=password/.test(c))&&calls.some(c=>/GET \/rest\/v1\/profiles/.test(c));
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
C.c3=!out.login&&out.home&&/Connecté/.test(out.hint)&&home2.adminTab&&home2.isAdmin&&home2.cloudUser&&home2.profile==='admin'&&calls.slice(nCalls).some(c=>/grant_type=password/.test(c));
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
console.log('erreurs de page :',logs.length?logs:'aucune');
const ko=Object.entries(C).filter(([k,v])=>!v).map(([k])=>k);
console.log(ko.length||logs.length?'RESULTAT: ECHEC '+ko.join(',')+(logs.length?' + erreurs':''):'RESULTAT: TOUT VERT');
await browser.close();
