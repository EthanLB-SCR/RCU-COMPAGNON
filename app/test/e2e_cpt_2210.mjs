// 22/10 (Ethan : « j'arrive sur des profils test quand ça charge… sur l'ordi d'un collègue pareil, il faut enlever ça, que ça n'arrive jamais à personne : c'est ton
// compte ou rien » ; « alors que je suis connecté avec mon compte je n'ai pas la vraie appli »). Le site PUBLIÉ est simulé par un nom d'hôte qui n'est pas localhost
// (trace.test → 127.0.0.1) ; Supabase est SIMULÉ au niveau réseau (comme e2e_login), et on peut faire échouer la lecture du profil (réseau qui patine).
// c1 pas connecté + ancien « continuer hors connexion » mémorisé → écran de connexion, pas de lien « hors connexion », jamais de personnage
// c2 connecté, profil injoignable → « Chargement de ton compte… », aucun personnage de démo, aucun « Bonjour Karim », droits d'écriture : aucun
// c3 le serveur revient → « Réessayer » → SON compte (nom, poste), pas de sélecteur de personnages
// c4 rechargement avec le profil de nouveau injoignable → ouvert DIRECTEMENT sur son compte (profil gardé sur l'appareil)
// c5 déconnexion → écran de connexion (pas un personnage) · c6 en local (127.0.0.1) : les personnages de démo restent (tests, développement) · c7 console
import { chromium } from 'playwright';
const PORT=(process.env.BASE||'http://127.0.0.1:8765').match(/:(\d+)/)[1];const PROD=`http://trace.test:${PORT}`,LOCAL=`http://127.0.0.1:${PORT}`;
const SB='https://pghftlepduvfazbiavhq.supabase.co';const UID='11111111-2222-4333-8444-555555555555';const EMAIL='elebihan@scr-soudure.fr';
const b64u=o=>Buffer.from(JSON.stringify(o)).toString('base64').replace(/=+$/,'').replace(/\+/g,'-').replace(/\//g,'_');const now=()=>Math.floor(Date.now()/1000);
const user=()=>({id:UID,aud:'authenticated',role:'authenticated',email:EMAIL,email_confirmed_at:'2026-10-08T09:00:00Z',confirmed_at:'2026-10-08T09:00:00Z',last_sign_in_at:new Date().toISOString(),app_metadata:{provider:'email',providers:['email']},user_metadata:{},identities:[],created_at:'2026-10-08T09:00:00Z',updated_at:new Date().toISOString(),is_anonymous:false});
const session=()=>{const t=now();const jwt=b64u({alg:'HS256',typ:'JWT'})+'.'+b64u({iss:SB+'/auth/v1',sub:UID,aud:'authenticated',exp:t+3600,iat:t,email:EMAIL,role:'authenticated',session_id:'sess-1'})+'.sig';return {access_token:jwt,token_type:'bearer',expires_in:3600,expires_at:t+3600,refresh_token:'rt-'+t,user:user()};};
const profile={id:UID,email:EMAIL,name:'Ethan LE BIHAN (fictif)',role:'chef',active:true,poste:'resp_exploitation',admin:false,type:'salarie',rights:{},sites:null,prenom:'Ethan',nom:'LE BIHAN',created_at:'2026-10-08T09:00:00Z'};
let PROFILE_KO=false;
const browser=await chromium.launch({headless:true,executablePath:process.env.CHROMIUM_PATH||undefined,args:['--host-resolver-rules=MAP trace.test 127.0.0.1','--no-proxy-server']});
const C={};const logs=[];
async function mk(base){const ctx=await browser.newContext({viewport:{width:1280,height:860}});
  await ctx.route(u=>u.href.startsWith(SB),async route=>{const req=route.request();const u=new URL(req.url());const p=u.pathname;const acc=req.headers()['accept']||'';
    const json=(o,status=200)=>route.fulfill({status,contentType:'application/json',headers:{'access-control-allow-origin':'*'},body:JSON.stringify(o)});
    if(p==='/auth/v1/token')return json(session());if(p==='/auth/v1/user')return json(user());if(p==='/auth/v1/logout')return route.fulfill({status:204,headers:{'access-control-allow-origin':'*'},body:''});if(p.startsWith('/auth/v1/'))return json({});
    if(p==='/rest/v1/profiles'){if(PROFILE_KO)return json({message:'réseau'},503);const m=/id=eq\.([^&]+)/.exec(u.search);const rows=m?[profile].filter(x=>x.id===decodeURIComponent(m[1])):[profile];return json(/object/.test(acc)?(rows[0]||null):rows);}
    if(p.startsWith('/rest/v1/'))return json([]);return json([]);});
  const page=await ctx.newPage();page.on('pageerror',e=>logs.push('PAGEERROR: '+e.message.slice(0,300)));page.on('console',m=>{if(m.type()==='error'&&!/realtime|websocket|Failed to fetch|net::ERR|404|503|réseau/i.test(m.text()))logs.push(m.text().slice(0,200));});page.on('dialog',d=>d.accept().catch(()=>{}));
  return {ctx,page};}
const scr=page=>page.evaluate(()=>({login:document.getElementById('loginView').classList.contains('show'),home:document.getElementById('homeView').classList.contains('show'),
  skip:(()=>{const s=document.getElementById('loginSkip');return !!s&&getComputedStyle(s).display!=='none';})(),demo:/Personnage de démo/.test(([...document.body.childNodes].filter(n=>n.nodeName!=='SCRIPT').map(n=>n.textContent).join('') /* 31/10 : le gros script est en fin de <body> (écran de chargement) — son texte n'est pas du texte de la page */)),karim:/Bonjour Karim/.test(([...document.body.childNodes].filter(n=>n.nodeName!=='SCRIPT').map(n=>n.textContent).join('') /* 31/10 : le gros script est en fin de <body> (écran de chargement) — son texte n'est pas du texte de la page */)),
  wait:!!document.getElementById('pfWait'),who:(document.getElementById('homeWho')||{}).textContent||'',asBar:(()=>{const b=document.getElementById('homeAsBar');return !!b&&b.style.display!=='none'&&!!b.textContent.trim();})(),
  acc:(()=>{try{const a=window.TRACE.acces.current();return a?{id:a.id,name:a.name,pending:!!a.pending}:null;}catch(e){return 'err';}})(),wr:(()=>{try{return window.TRACE.acces.can('weld.extra')||window.TRACE.acces.can('pointage.self');}catch(e){return 'err';}})()}));
const shotDir=process.env.SHOTS||null;const shot=async(page,n)=>{if(shotDir)await page.screenshot({path:`${shotDir}/cpt_${n}.png`});};

// ── c1) site publié, pas connecté, ancien « continuer hors connexion » mémorisé
let {ctx,page}=await mk(PROD);
await page.goto(PROD+'/index.html');await page.waitForTimeout(400);await page.evaluate(()=>{localStorage.clear();localStorage.setItem('trace:skipLogin','1');});await page.reload();await page.waitForTimeout(2200);
let o=await scr(page);await shot(page,'1_pas_connecte');console.log('c1) pas connecté :',JSON.stringify(o));C.c1=o.login&&!o.home&&!o.skip&&!o.demo&&!o.karim&&o.acc===null;
// ── c2) connexion, profil injoignable → « Chargement de ton compte… », jamais un personnage, aucun droit d'écriture
PROFILE_KO=true;await page.fill('#loginEmail',EMAIL);await page.fill('#loginPwd','Soudure-2026!');await page.click('#loginGo');await page.waitForTimeout(2500);
o=await scr(page);await shot(page,'2_chargement');console.log('c2) profil injoignable :',JSON.stringify(o));
C.c2=o.home&&o.wait&&!o.demo&&!o.karim&&!o.asBar&&!!o.acc&&o.acc.id==='pending'&&o.wr===false&&/chargement du compte/.test(o.who);
// ── c3) le serveur revient → « Réessayer » → son compte
PROFILE_KO=false;await page.click('#pfRetry');await page.waitForTimeout(1800);o=await scr(page);await shot(page,'3_son_compte');console.log('c3) son compte :',JSON.stringify(o));
C.c3=o.home&&!o.wait&&!o.demo&&!o.karim&&!!o.acc&&o.acc.name==='Ethan LE BIHAN (fictif)'&&o.acc.id!=='pending'&&/Ethan LE BIHAN/.test(o.who); /* le bandeau « 👁 Voir l'appli comme » de l'administrateur reste (vraies personnes), jamais « Personnage de démo » */
// ── c4) rechargement, profil de nouveau injoignable → ouvert directement sur son compte (gardé sur l'appareil)
PROFILE_KO=true;await page.reload();await page.waitForTimeout(2500);o=await scr(page);console.log('c4) rechargé hors réseau :',JSON.stringify(o));
C.c4=o.home&&!o.wait&&!o.demo&&!o.karim&&!!o.acc&&o.acc.name==='Ethan LE BIHAN (fictif)'&&/Ethan LE BIHAN/.test(o.who);
// ── c5) déconnexion → écran de connexion, pas de personnage
await page.evaluate(()=>{const b=document.getElementById('homeAva')||document.getElementById('homeWho');b.click();});await page.waitForTimeout(500);
const out=await page.$('#accOut');if(out){await out.click();}else{await page.evaluate(async()=>{});}await page.waitForTimeout(1200);o=await scr(page);console.log('c5) déconnexion :',JSON.stringify({o,btn:!!out}));
C.c5=!!out&&o.login&&!o.home&&!o.demo&&!o.skip;
await ctx.close();
// ── c6) en local (127.0.0.1) : personnages de démo et « continuer hors connexion » toujours là (développement, tests)
({ctx,page}=await mk(LOCAL));await page.goto(LOCAL+'/index.html');await page.waitForTimeout(400);await page.evaluate(()=>localStorage.clear());await page.reload();await page.waitForTimeout(2000);
o=await scr(page);const skipOk=o.skip;if(o.login&&o.skip){await page.click('#loginSkip');await page.waitForTimeout(800);}o=await scr(page);console.log('c6) local :',JSON.stringify({skipOk,o}));
C.c6=skipOk&&o.home&&o.demo&&!!o.acc&&o.acc.id==='l:karim';
await ctx.close();
console.log('erreurs console :',JSON.stringify(logs));C.c7=logs.length===0;
const ko=Object.entries(C).filter(([k,v])=>!v).map(([k])=>k);console.log(JSON.stringify(C));console.log(ko.length?'RESULTAT: KO '+ko.join(','):'RESULTAT: TOUT VERT');
await browser.close();
