// MOT DE PASSE DÈS L'ACCUEIL + PETIT ŒIL (13/10/2026 soir). Ethan : « petit œil pour voir le mot de passe qu'on saisit » ; « la création de mot de passe ne
// marche pas en l'état : ça met compte créé, mais après le mot de passe ne marche pas ; seule la connexion avec code fonctionne, et une fois dans l'appli tu crées
// ton mot de passe — il faut que la création fonctionne dès l'accueil ». Cause : signUp ne pose pas de mot de passe sur un compte qui existe déjà (Supabase répond
// « ok » quand même). Désormais : code reçu par e-mail → vérifié → mot de passe posé (updateUser), sur l'écran de connexion.
// Supabase est SIMULÉ au niveau réseau (le vrai supabase-js tourne) : le serveur simulé garde les mots de passe et REFUSE une connexion avec un mot de passe non posé.
import { chromium } from 'playwright';
const BASE=process.env.BASE||'http://localhost:8765';
const SB='https://pghftlepduvfazbiavhq.supabase.co';
const UID='21111111-2222-4333-8444-555555555555';const EMAIL='paul.durand@scr-soudure.fr';
const b64u=o=>Buffer.from(JSON.stringify(o)).toString('base64').replace(/=+$/,'').replace(/\+/g,'-').replace(/\//g,'_');
const now=()=>Math.floor(Date.now()/1000);
let CUR={id:UID,email:EMAIL};const user=()=>({id:CUR.id,aud:'authenticated',role:'authenticated',email:CUR.email,email_confirmed_at:'2026-10-08T09:00:00Z',confirmed_at:'2026-10-08T09:00:00Z',last_sign_in_at:new Date().toISOString(),app_metadata:{provider:'email',providers:['email']},user_metadata:{},identities:[],created_at:'2026-10-08T09:00:00Z',updated_at:new Date().toISOString(),is_anonymous:false});
const jwt=()=>{const t=now();return b64u({alg:'HS256',typ:'JWT'})+'.'+b64u({iss:SB+'/auth/v1',sub:CUR.id,aud:'authenticated',exp:t+3600,iat:t,email:CUR.email,role:'authenticated',session_id:'sess-'+t})+'.sig';};
const session=()=>{const t=now();return {access_token:jwt(),token_type:'bearer',expires_in:3600,expires_at:t+3600,refresh_token:'rt-'+t,user:user()};};
const profile={id:UID,email:EMAIL,name:'Paul DURAND',role:'soudeur',active:true,poste:'soudeur',admin:false,type:'salarie',rights:{},sites:null,prenom:'Paul',nom:'DURAND',created_at:'2026-10-08T09:00:00Z'};
const PW={};const calls=[];const otps=[];const puts=[];let RATE=false;let loggedOut=0;
const browser=await chromium.launch({headless:true, executablePath: process.env.CHROMIUM_PATH||undefined});
const ctx=await browser.newContext({viewport:{width:390,height:844}});
await ctx.route(u=>u.href.startsWith(SB),async route=>{const req=route.request();const u=new URL(req.url());const p=u.pathname;const acc=req.headers()['accept']||'';calls.push(req.method()+' '+p+(u.search?u.search.slice(0,40):''));
  const json=(o,status=200)=>route.fulfill({status,contentType:'application/json',headers:{'access-control-allow-origin':'*'},body:JSON.stringify(o)});
  let b={};try{b=JSON.parse(req.postData()||'{}');}catch(e){}
  if(p==='/auth/v1/otp'){if(RATE)return json({code:429,error_code:'over_email_send_rate_limit',msg:'For security purposes, you can only request this after 52 seconds.'},429);otps.push(b.email);return json({});}
  if(p==='/auth/v1/verify'){if(String(b.token)!=='123456')return json({code:403,error_code:'otp_expired',msg:'Token has expired or is invalid'},403);CUR={id:UID,email:String(b.email).toLowerCase()};return json(session());}
  if(p==='/auth/v1/user'&&req.method()==='PUT'){if(b.password){if(String(b.password).length<8)return json({code:422,msg:'Password should be at least 8 characters.'},422);PW[CUR.email]=b.password;puts.push(b.password);}return json(user());}
  if(p==='/auth/v1/user')return json(user());
  if(p==='/auth/v1/token'){const g=u.searchParams.get('grant_type');if(g==='password'){const em=String(b.email||'').toLowerCase();if(PW[em]&&PW[em]===b.password){CUR={id:UID,email:em};return json(session());}return json({error:'invalid_grant',error_description:'Invalid login credentials',code:400,msg:'Invalid login credentials'},400);}return json(session());}
  if(p==='/auth/v1/logout'){loggedOut++;return route.fulfill({status:204,headers:{'access-control-allow-origin':'*'},body:''});}
  if(p.startsWith('/auth/v1/'))return json({});
  if(p==='/rest/v1/profiles'){return json(/object/.test(acc)?profile:[profile]);}
  if(p.startsWith('/rest/v1/'))return json(/object/.test(acc)?null:[]);
  return json([]);});
const page=await ctx.newPage();
const logs=[];page.on('pageerror',e=>logs.push('PAGEERROR: '+e.message.slice(0,300)));page.on('console',m=>{if(m.type()==='error'&&!/realtime|websocket|Failed to fetch|net::ERR|404|40[03]|422|429|status of/i.test(m.text()))logs.push(m.text().slice(0,200));});
page.on('dialog',d=>{logs.push('DIALOG: '+d.message().slice(0,80));d.accept().catch(()=>{});}); /* plus AUCUN prompt() pour le mot de passe */
const C={};const wait=ms=>page.waitForTimeout(ms);
await page.goto(BASE+'/index.html');await wait(600);await page.evaluate(()=>{localStorage.clear();});await page.reload();await wait(900);
const scr=()=>page.evaluate(()=>({login:document.querySelector('#loginView').classList.contains('show'),home:document.querySelector('#homeView').classList.contains('show'),hint:(document.querySelector('#loginHint')||{}).textContent||'',alt:getComputedStyle(document.querySelector('#loginAlt')).display!=='none',flag:localStorage.getItem('trace:pwdSetup')}));
const fill=async(sel,v)=>{await page.fill(sel,v);};
// ── 1) le petit œil sur la case mot de passe de la connexion : montre puis cache ; il tient sous le doigt (≥ 40 px)
await fill('#loginEmail',EMAIL);await fill('#loginPwd','Soudure-2026!');
const eye=async sel=>page.evaluate(s=>{const i=document.querySelector(s);const b=i.parentElement.querySelector('[data-pweye]');const r=b.getBoundingClientRect();const o={t0:i.type,w:Math.round(r.width),h:Math.round(r.height)};b.click();o.t1=i.type;o.lab=b.getAttribute('aria-label');o.pressed=b.getAttribute('aria-pressed');b.click();o.t2=i.type;o.val=i.value;return o;},sel);
let out={eye:await eye('#loginPwd')};
// ── 2) connexion avec un mot de passe jamais posé : refusée, message clair qui renvoie vers « créer mon mot de passe »
await page.click('#loginGo');await wait(900);out.refus=await scr();
console.log('1-2) œil + mot de passe pas encore créé :',JSON.stringify(out));
C.c1=out.eye.t0==='password'&&out.eye.t1==='text'&&out.eye.t2==='password'&&out.eye.lab==='Masquer le mot de passe'&&out.eye.pressed==='true'&&out.eye.val==='Soudure-2026!'&&out.eye.w>=40&&out.eye.h>=40
  &&out.refus.login&&!out.refus.home&&/E-mail ou mot de passe incorrect/.test(out.refus.hint)&&/créer mon mot de passe/.test(out.refus.hint);
// ── 3) « Première connexion ou oubli : créer mon mot de passe » → e-mail repris → code envoyé (repère posé pour le lien) → code faux → refusé
await page.click('#loginFirst');await wait(250);out={panel:await page.evaluate(()=>({t:(document.querySelector('#loginAlt .loginAlt-t')||{}).textContent,email:(document.querySelector('#lgEmail')||{}).value,main:getComputedStyle(document.querySelector('#loginMain')).display}))};
await page.click('#lgSend');await wait(700);out.sent=await scr();out.otps=otps.slice();out.fields=await page.evaluate(()=>({code:!!document.querySelector('#lgCode'),pw1:!!document.querySelector('#lgPw1'),pw2:!!document.querySelector('#lgPw2'),eyes:document.querySelectorAll('#loginAlt [data-pweye]').length}));
await fill('#lgCode','000000');await fill('#lgPw1','Soudure-2026!');await fill('#lgPw2','Soudure-2026!');await page.click('#lgOk');await wait(900);out.faux=await scr();
console.log('3) écran « créer mon mot de passe », code envoyé, code faux :',JSON.stringify(out));
C.c3=out.panel.t==='CRÉER MON MOT DE PASSE'&&out.panel.email===EMAIL&&out.panel.main==='none'&&/Code envoyé ✓/.test(out.sent.hint)&&out.otps.join()===EMAIL&&/"email":"paul\.durand@scr-soudure\.fr"/.test(out.sent.flag||'')
  &&out.fields.code&&out.fields.pw1&&out.fields.pw2&&out.fields.eyes===2&&out.faux.login&&!out.faux.home&&/Code faux ou périmé/.test(out.faux.hint)&&!!out.faux.flag&&!puts.length;
// ── 4) vérifs locales (rien ne part) : deux saisies différentes, trop court ; puis bon code + mot de passe que le serveur refuse (8 caractères) : code validé, on reste
await fill('#lgCode','123456');await fill('#lgPw1','Soudure-2026!');await fill('#lgPw2','Soudure-2026');await page.click('#lgOk');await wait(300);out={diff:(await scr()).hint};
await fill('#lgPw1','abc');await fill('#lgPw2','abc');await page.click('#lgOk');await wait(300);out.court=(await scr()).hint;const n0=calls.filter(c=>/verify/.test(c)).length;
await fill('#lgPw1','court12');await fill('#lgPw2','court12');await page.click('#lgOk');await wait(1200);out.serveur=await scr();
console.log('4) contrôles et refus du serveur :',JSON.stringify({...out,verify:calls.filter(c=>/verify/.test(c)).length-n0}));
C.c4=/diffèrent/.test(out.diff)&&/trop court/i.test(out.court)&&out.serveur.login&&!out.serveur.home&&/Mot de passe trop court \(8 caractères minimum\)/.test(out.serveur.hint)&&/Ton code est validé/.test(out.serveur.hint)&&!out.serveur.flag;
// ── 5) un mot de passe accepté → posé sur le compte, l'accueil s'ouvre ; déconnexion → connexion avec CE mot de passe (le serveur le vérifie)
await fill('#lgPw1','Soudure-2026!');await fill('#lgPw2','Soudure-2026!');await page.click('#lgOk');await wait(1500);out={ok:await scr(),pw:PW[EMAIL],verifies:calls.filter(c=>/verify/.test(c)).length};
await page.click('#homeAva');await wait(300);await page.click('#accOut');await wait(900);
await fill('#loginEmail',EMAIL);await fill('#loginPwd','Soudure-2026!');await page.click('#loginGo');await wait(1500);out.relog=await scr();
console.log('5) mot de passe posé puis reconnexion :',JSON.stringify(out));
C.c5=!out.ok.login&&out.ok.home&&out.pw==='Soudure-2026!'&&out.verifies===2&&!out.relog.login&&out.relog.home&&loggedOut===1;
// ── 6) dans l'appli : « 🔑 Définir / changer mon mot de passe » = une fenêtre avec deux saisies et l'œil (plus de prompt)
await page.click('#homeAva');await wait(300);await page.click('#accPwd');await wait(300);
out={modal:await page.evaluate(()=>({h:(document.querySelector('#modal h3')||{}).textContent,eyes:document.querySelectorAll('#modal [data-pweye]').length,f:document.querySelectorAll('#modal input[type=password]').length}))};
await fill('#pwm-1','Nouveau-2026!');await fill('#pwm-2','Nouveau-2026!');await page.evaluate(()=>{const b=document.querySelector('#modal [data-pweye]');b.click();});out.vu=await page.evaluate(()=>document.querySelector('#pwm-1').type);
await page.click('#pwm-ok');await wait(900);out.after={pw:PW[EMAIL],...await page.evaluate(()=>({modal:document.querySelector('#modal').classList.contains('show'),toast:(document.querySelector('#toast')||{}).textContent||''}))};
console.log('6) changement dans l\'appli :',JSON.stringify(out));
C.c6=/Définir \/ changer mon mot de passe/.test(out.modal.h)&&out.modal.eyes===2&&out.modal.f===2&&out.vu==='text'&&out.after.pw==='Nouveau-2026!'&&!out.after.modal&&/Mot de passe enregistré/.test(out.after.toast);
// ── 7) « Code par e-mail » : se connecter avec le code seul (sans mot de passe)
await page.click('#homeAva');await wait(300);await page.click('#accOut');await wait(900);
await page.click('#loginOtp');await wait(250);out={t:await page.evaluate(()=>(document.querySelector('#loginAlt .loginAlt-t')||{}).textContent)};await page.click('#lgSend');await wait(600);
out.pwFields=await page.evaluate(()=>document.querySelectorAll('#loginAlt input[type=password]').length);await fill('#lgCode','123456');await page.click('#lgOk');await wait(1500);out.ok=await scr();
console.log('7) connexion par code :',JSON.stringify(out));
C.c7=out.t==='CONNEXION PAR CODE'&&out.pwFields===0&&!out.ok.login&&out.ok.home&&!out.ok.flag;
// ── 8) le mail n'a qu'un LIEN : « créer mon mot de passe » → code demandé → on touche le lien (même appareil) → l'appli s'ouvre connectée et demande le mot de passe
await page.click('#homeAva');await wait(300);await page.click('#accOut');await wait(900);
await page.click('#loginFirst');await wait(250);await page.click('#lgSend');await wait(600);const flag8=(await scr()).flag;
CUR={id:UID,email:EMAIL};const s8=session();await page.goto('about:blank');await page.goto(BASE+'/index.html#access_token='+s8.access_token+'&expires_at='+s8.expires_at+'&expires_in=3600&refresh_token='+s8.refresh_token+'&token_type=bearer&type=magiclink');await wait(2500);
out={flag8:!!flag8,modal:await page.evaluate(()=>({show:document.querySelector('#modal').classList.contains('show'),h:(document.querySelector('#modal h3')||{}).textContent||'',eyes:document.querySelectorAll('#modal [data-pweye]').length})),home:(await scr()).home,flagAfter:(await scr()).flag};
await fill('#pwm-1','Lien-2026!!');await fill('#pwm-2','Lien-2026!!');await page.click('#pwm-ok');await wait(900);out.pw=PW[EMAIL];
console.log('8) lien du mail → mot de passe demandé :',JSON.stringify(out));
C.c8=out.flag8&&out.modal.show&&/Choisis ton mot de passe/.test(out.modal.h)&&out.modal.eyes===2&&out.home&&!out.flagAfter&&out.pw==='Lien-2026!!';
// ── 9) trop de demandes de code (limite Supabase) : message compréhensible ; « ← Retour » efface le repère
await page.click('#homeAva');await wait(300);await page.click('#accOut');await wait(900);RATE=true;
await page.click('#loginFirst');await wait(250);await page.click('#lgSend');await wait(700);out={rate:(await scr()).hint};await page.click('#lgBack');await wait(200);out.back=await scr();RATE=false;
console.log('9) limite d\'envoi + retour :',JSON.stringify(out));
C.c9=/Trop de demandes rapprochées/.test(out.rate)&&!out.back.alt&&!out.back.flag&&/créer mon mot de passe/.test(out.back.hint);
const bad=Object.entries(C).filter(([k,v])=>!v).map(([k])=>k);console.log(bad.length?'RESULTAT: ECHEC '+bad.join(','):'RESULTAT: TOUT VERT');console.log(logs.length?logs:'[]');
await browser.close();
