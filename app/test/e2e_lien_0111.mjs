// e2e_lien_0111 — 01/11 soir (Ethan : « demain je le mets en test sur deux chantiers : il faut que chacun puisse accéder à son compte, créer son mot de passe…
//   le plus simple ») : LIEN / QR DE 1re CONNEXION + CODES EN SÉRIE. Supabase et la fonction « acces-code » SIMULÉS au niveau réseau (même serveur simulé que
//   e2e_codeacces) ; adresses et codes inventés.
//  l1  administrateur : code de 1re connexion de Karim → le message porte le lien (#acces=…) avec l'e-mail et le code ; boutons SMS et mail (adressé à Karim) ; QR replié
//  l2  téléphone de Karim (neuf) : le lien ouvre « CRÉER MON MOT DE PASSE », e-mail et code remplis, « Bonjour Karim » ; le lien est effacé de la barre d'adresse ;
//      il tape son mot de passe deux fois → connecté ; le serveur a son mot de passe, plus de « must_change »
//  l3  même lien rouvert sur ce téléphone (Tracé déjà ouvert : seul le # change), déjà connecté à ce compte : « déjà connecté », rien ne change
//  l4  lien d'un autre (Luc) sur le téléphone de Karim : on demande avant de déconnecter → « Me déconnecter et continuer » → l'écran de Luc, rempli
//  l5  lien abîmé : écran de connexion normal, pas d'erreur
//  l6  (+ SMS / mail par personne, compteur « envoyés » et repère « ✓ envoyé ») codes en série : invités de la liste, cases à cocher (on décoche ceux d'un autre chantier, Tous / Aucun), nom de la fiche → un code pour chaque coché (fonction appelée pour chacun), QR un par un (Suivant ›), fiche à imprimer (un QR par personne)
//  l8  iPhone de Marc (QR des codes en série), réseau lent : mot de passe créé UNE fois (plus de 2e écran « Choisis ton mot de passe ») → fenêtre « Mets Tracé sur ton écran d'accueil » (étapes Safari, une seule fois) ; reprise depuis le compte avec le bouton « Installer » quand le navigateur le propose
//  l9  adresse locale → avertissement avant de créer les codes ; sur PC : ni fenêtre ni bouton « écran d'accueil »
//  l10 écran de connexion sans « code par e-mail » ; lien déjà servi (retouché un autre jour) : « Ce lien a déjà servi » → connexion avec son mot de passe
//  l7  zéro erreur de page
import { chromium } from 'playwright';
const BASE=process.env.BASE||'http://localhost:8765';
const SB='https://pghftlepduvfazbiavhq.supabase.co';
const b64u=o=>Buffer.from(JSON.stringify(o)).toString('base64').replace(/=+$/,'').replace(/\+/g,'-').replace(/\//g,'_');
const now=()=>Math.floor(Date.now()/1000);
const ETHAN={id:'11111111-2222-4333-8444-555555555555',email:'elebihan@scr-soudure.fr'},KARIM_EMAIL='karim.benali@scr-soudure.fr';
const PW={'elebihan@scr-soudure.fr':'Admin-2026!','paul.durand@scr-soudure.fr':'Soudure-2026!'};const META={};const IDS={'elebihan@scr-soudure.fr':ETHAN.id,'paul.durand@scr-soudure.fr':'22222222-2222-4333-8444-555555555555','julie.martin@scr-soudure.fr':'33333333-2222-4333-8444-555555555555'};
let CUR={...ETHAN};
const user=()=>({id:CUR.id,aud:'authenticated',role:'authenticated',email:CUR.email,email_confirmed_at:'2026-10-08T09:00:00Z',confirmed_at:'2026-10-08T09:00:00Z',last_sign_in_at:new Date().toISOString(),app_metadata:{provider:'email',providers:['email']},user_metadata:{...(META[CUR.email]||{})},identities:[],created_at:'2026-10-08T09:00:00Z',updated_at:new Date().toISOString(),is_anonymous:false});
const jwt=()=>{const t=now();return b64u({alg:'HS256',typ:'JWT'})+'.'+b64u({iss:SB+'/auth/v1',sub:CUR.id,aud:'authenticated',exp:t+3600,iat:t,email:CUR.email,role:'authenticated',session_id:'sess-'+t})+'.sig';};
const session=()=>{const t=now();return {access_token:jwt(),token_type:'bearer',expires_in:3600,expires_at:t+3600,refresh_token:'rt-'+CUR.email+'-'+t,user:user()};};
const prof=(id,email,prenom,nom,poste,admin)=>({id,email,name:prenom+' '+nom,prenom,nom,role:admin?'chef':'soudeur',active:true,poste,admin,type:'salarie',rights:{},sites:null,created_at:'2026-10-08T09:00:00Z'});
const profiles=[prof(ETHAN.id,ETHAN.email,'Ethan','LE BIHAN','resp_exploitation',true),prof(IDS['paul.durand@scr-soudure.fr'],'paul.durand@scr-soudure.fr','Paul','DURAND','soudeur',false),prof(IDS['julie.martin@scr-soudure.fr'],'julie.martin@scr-soudure.fr','Julie','MARTIN','assist_rh',true)];
const invites=[{email:'marc.essai@scr-soudure.fr',nom:'ESSAI',prenom:'Marc',poste:'tuyauteur',type:'salarie',rights:{},sites:null,created_at:'2026-10-13T08:00:00Z',used_at:null},{email:'theo.essai@scr-soudure.fr',nom:'ESSAI',prenom:'Théo',poste:'soudeur',type:'salarie',rights:{},sites:null,created_at:'2026-10-13T08:00:00Z',used_at:null},{email:KARIM_EMAIL,nom:'BENALI',prenom:'Karim',poste:'soudeur',type:'salarie',rights:{},sites:null,created_at:'2026-10-13T08:00:00Z',used_at:null},{email:'luc.essai@scr-soudure.fr',nom:'ESSAI',prenom:'Luc',poste:'manchonneur',type:'salarie',rights:{},sites:null,created_at:'2026-10-13T08:00:00Z',used_at:null},{email:'hugo.essai@scr-soudure.fr',nom:'ESSAI',prenom:'Hugo',poste:'soudeur',type:'salarie',rights:{},sites:null,created_at:'2026-10-13T08:00:00Z',used_at:null},{email:'nina.essai@scr-soudure.fr',nom:'ESSAI',prenom:'Nina',poste:'tuyauteur',type:'salarie',rights:{},sites:null,created_at:'2026-10-13T08:00:00Z',used_at:null}];
const calls=[];const fnCalls=[];const puts=[];let FN='ok';let NOTAUTH=false;
const browser=await chromium.launch({headless:true, executablePath: process.env.CHROMIUM_PATH||undefined});
const ctx=await browser.newContext({viewport:{width:390,height:844}});
const CORS={'access-control-allow-origin':'*','access-control-allow-headers':'authorization, x-client-info, apikey, content-type','access-control-allow-methods':'GET, POST, PUT, PATCH, DELETE, OPTIONS'};
const SRV=async route=>{const req=route.request();const u=new URL(req.url());const p=u.pathname;const acc=req.headers()['accept']||'';calls.push(req.method()+' '+p+(u.search?u.search.slice(0,40):''));
  const json=(o,status=200)=>route.fulfill({status,contentType:'application/json',headers:CORS,body:JSON.stringify(o)});
  if(req.method()==='OPTIONS')return route.fulfill({status:200,headers:CORS,body:''});
  let b={};try{b=JSON.parse(req.postData()||'{}');}catch(e){}
  if(p==='/functions/v1/acces-code'){fnCalls.push({body:b,auth:String(req.headers()['authorization']||'')});
    if(FN==='missing')return json({code:'NOT_FOUND',message:'Requested function was not found'},404);
    if(FN==='deny')return json({error:"réservé à l'administrateur"},403);
    const em=String(b.email||'').toLowerCase();const created=!PW[em];PW[em]=b.code;META[em]={...(META[em]||{}),must_change:true,code_by:CUR.email,code_at:new Date().toISOString()}; /* comme la vraie fonction : la date du code */
    if(created){IDS[em]=IDS[em]||'44444444-2222-4333-8444-'+String(Object.keys(IDS).length).padStart(12,'0');const inv=invites.find(i=>i.email===em);if(inv){inv.used_at=new Date().toISOString();profiles.push(prof(IDS[em],em,inv.prenom,inv.nom,inv.poste,false));}}
    return json({ok:true,created});}
  if(p==='/auth/v1/otp'){if(NOTAUTH)return json({code:400,error_code:'email_address_not_authorized',msg:'Email address "'+b.email+'" cannot be used as it is not authorized'},400);return json({});}
  if(p==='/auth/v1/token'){const g=u.searchParams.get('grant_type');if(g==='password'){const em=String(b.email||'').toLowerCase();if(PW[em]&&PW[em]===b.password){CUR={id:IDS[em],email:em};return json(session());}return json({error:'invalid_grant',error_description:'Invalid login credentials',code:400,msg:'Invalid login credentials'},400);}return json(session());}
  if(p==='/auth/v1/user'&&req.method()==='PUT'){if(b.password){if(String(b.password).length<6)return json({code:422,msg:'Password should be at least 6 characters.'},422);if(b.password===PW[CUR.email])return json({code:422,error_code:'same_password',msg:'New password should be different from the old password.'},422);PW[CUR.email]=b.password;}if(b.data)META[CUR.email]={...(META[CUR.email]||{}),...b.data};puts.push({email:CUR.email,pw:!!b.password,data:b.data||null});return json(user());}
  if(p==='/auth/v1/user')return json(user());
  if(p==='/auth/v1/logout')return route.fulfill({status:204,headers:CORS,body:''});
  if(p.startsWith('/auth/v1/'))return json({});
  if(p==='/rest/v1/profiles'){const m=/id=eq\.([^&]+)/.exec(u.search);const rows=m?profiles.filter(x=>x.id===decodeURIComponent(m[1])):profiles;return json(/object/.test(acc)?(rows[0]||null):rows);}
  if(p==='/rest/v1/invites'){return json(invites.filter(x=>!x.used_at));}
  if(p.startsWith('/rest/v1/rpc/'))return json(null);
  if(p.startsWith('/rest/v1/'))return json(/object/.test(acc)?null:[]);
  return json([]);};
await ctx.route(u=>u.href.startsWith(SB),SRV);
const page=await ctx.newPage();
const logs=[];page.on('pageerror',e=>logs.push('PAGEERROR: '+e.message.slice(0,300)));page.on('console',m=>{if(m.type()==='error'&&!/realtime|websocket|Failed to fetch|net::ERR|40[034]|422|status of/i.test(m.text()))logs.push(m.text().slice(0,200));});
page.on('dialog',d=>{logs.push('DIALOG: '+d.message().slice(0,80));d.accept().catch(()=>{});});
const C={};const wait=ms=>page.waitForTimeout(ms);
const scr=()=>page.evaluate(()=>({login:document.querySelector('#loginView').classList.contains('show'),home:document.querySelector('#homeView').classList.contains('show'),hint:(document.querySelector('#loginHint')||{}).textContent||'',altT:(document.querySelector('#loginAlt .loginAlt-t')||{}).textContent||'',alt:getComputedStyle(document.querySelector('#loginAlt')).display!=='none',main:getComputedStyle(document.querySelector('#loginMain')).display!=='none',modal:document.querySelector('#modal').classList.contains('show')}));
const out0=async()=>{await page.click('#homeAva');await wait(300);await page.click('#accOut');await wait(900);};
const card=name=>page.evaluate(n=>{const k=[...document.querySelectorAll('#homeBody .admAcc')].find(c=>c.textContent.includes(n));if(!k)return null;const b=k.querySelector('[data-admcode]');return {btn:b?b.textContent.trim():null};},name);
const J=x=>JSON.stringify(x);const o={};
await page.goto(BASE+'/index.html');await wait(600);await page.evaluate(()=>{localStorage.clear();});await page.reload();await wait(900);
await page.fill('#loginEmail',ETHAN.email);await page.fill('#loginPwd','Admin-2026!');await page.click('#loginGo');await wait(1800);
await page.evaluate(()=>document.getElementById('htAdmin').click());await wait(1200);
// ── l1 : code de 1re connexion (Karim, puis Luc) → QR + lien dans le message
const codeFor=async name=>{await page.evaluate(n=>{const k=[...document.querySelectorAll('#homeBody .admAcc')].find(c=>c.textContent.includes(n));k.querySelector('[data-admcode]').click();},name);await wait(400);
  await page.evaluate(()=>document.querySelector('#modal #ac-ok').click());await wait(900);
  const r=await page.evaluate(()=>({h:(document.querySelector('#modal h3')||{}).textContent,qr:!!document.querySelector('#modal .acQr svg.qrSvg'),code:(document.querySelector('#modal .codeBig')||{}).textContent,msg:(document.querySelector('#modal #ac-msg')||{}).value||'',sms:(document.querySelector('#modal #ac-sms')||{}).getAttribute?.('href')||'',mail:(document.querySelector('#modal #ac-mail')||{}).getAttribute?.('href')||'',qrFolded:!!document.querySelector('#modal details.acQrD:not([open]) .acQr svg')}));
  await page.evaluate(()=>{const c=document.querySelector('#modal [data-close]');if(c)c.click();});await wait(300);return r;};
o.k=await codeFor('Karim BENALI');o.l=await codeFor('Luc ESSAI');
const linkOf=m=>{const x=/(https?:\/\/\S+#acces=[A-Za-z0-9_-]+)/.exec(m);return x?x[1]:null;};
const L1=linkOf(o.k.msg),L2=linkOf(o.l.msg);
C.l1=/Code actif — Karim BENALI/.test(o.k.h||'')&&o.k.qr&&!!L1&&o.k.msg.includes(KARIM_EMAIL)&&o.k.msg.includes((o.k.code||'').trim())&&decodeURIComponent(o.k.sms).includes('#acces=')&&!!L2
  &&o.k.mail.startsWith('mailto:'+KARIM_EMAIL+'?subject=')&&decodeURIComponent(o.k.mail).includes(L1)&&/Tracé \(SCR\) — ton accès/.test(decodeURIComponent(o.k.mail))&&o.k.qrFolded; // 01/11 : liens par mail ou SMS, QR replié
// ── l2 : le téléphone de Karim (neuf) ouvre le lien
const ctx2=await browser.newContext({viewport:{width:390,height:844}});await ctx2.route(u=>u.href.startsWith(SB),SRV);const ph=await ctx2.newPage();ph.on('pageerror',e=>logs.push('PH: '+e.message.slice(0,200)));
const scr2=()=>ph.evaluate(()=>({login:document.querySelector('#loginView').classList.contains('show'),home:document.querySelector('#homeView').classList.contains('show'),altT:(document.querySelector('#loginAlt .loginAlt-t')||{}).textContent||'',hint:(document.querySelector('#loginHint')||{}).textContent||'',email:(document.querySelector('#lgEmail')||{}).value||'',code:(document.querySelector('#lgCode')||{}).value||'',hash:location.hash,modal:document.querySelector('#modal').classList.contains('show'),toast:(document.querySelector('#toast')||{}).textContent||''}));
await ph.goto(L1);await ph.waitForTimeout(2200);o.l2={a:await scr2()};
await ph.fill('#lgPw1','Karim-Chantier7');await ph.fill('#lgPw2','Karim-Chantier7');await ph.click('#lgOk');await ph.waitForTimeout(1800);o.l2.b=await scr2();o.l2.pw=PW[KARIM_EMAIL]==='Karim-Chantier7';o.l2.meta=META[KARIM_EMAIL];
C.l2=o.l2.a.login&&o.l2.a.altT==='CRÉER MON MOT DE PASSE'&&o.l2.a.email===KARIM_EMAIL&&o.l2.a.code.replace(/\s/g,'')===(o.k.code||'').replace(/\s/g,'')&&/Bonjour Karim/.test(o.l2.a.hint)&&o.l2.a.hash===''&&o.l2.b.home&&o.l2.pw&&o.l2.meta&&o.l2.meta.must_change===false;
// ── l3 : même lien, déjà connecté à ce compte
await ph.goto(L1);await ph.waitForTimeout(2200);o.l3=await scr2();
C.l3=o.l3.home&&!o.l3.modal&&/déjà connecté/.test(o.l3.toast)&&o.l3.hash==='';
// ── l4 : lien de Luc sur le téléphone de Karim
await ph.goto(L2.replace('/index.html#','/index.html?v=2#'));await ph.waitForTimeout(2200); /* rechargement complet (l3 a testé le même document) */o.l4={a:await scr2(),txt:await ph.evaluate(()=>(document.querySelector('#modal')||{}).textContent||'')};
await ph.evaluate(()=>{const b=document.querySelector('#modal #la-out');if(b)b.click();});await ph.waitForTimeout(1500);o.l4.b=await scr2();
C.l4=o.l4.a.modal&&/luc\.essai@scr-soudure\.fr/.test(o.l4.txt)&&/karim\.benali@scr-soudure\.fr/.test(o.l4.txt)&&o.l4.b.login&&o.l4.b.altT==='CRÉER MON MOT DE PASSE'&&o.l4.b.email==='luc.essai@scr-soudure.fr'&&/Bonjour Luc/.test(o.l4.b.hint);
// ── l5 : lien abîmé
await ph.goto(BASE+'/index.html?v=3#acces=zz%%%');await ph.waitForTimeout(1800);o.l5=await scr2();
C.l5=o.l5.login&&o.l5.altT!=='CRÉER MON MOT DE PASSE'&&o.l5.hash==='';
// ── l10 (01/11 soir) : écran de connexion sans « code par e-mail » (pas de SMTP) ; le lien de Karim retouché un autre jour (code déjà servi) : message clair → connexion avec son mot de passe
o.l10={otpBtn:await ph.evaluate(()=>{const b=document.getElementById('loginOtp');return !!b&&getComputedStyle(b).display!=='none';})};
await ph.evaluate(()=>{localStorage.clear();});await ph.goto(L1.replace('/index.html#','/index.html?v=4#'));await ph.waitForTimeout(2200);
o.l10.send=await ph.evaluate(()=>!!document.getElementById('lgSend'));o.l10.noCodeHint=await ph.evaluate(()=>/demande à ton chef/i.test((document.getElementById('loginAlt')||{}).textContent||''));
await ph.fill('#lgPw1','Autre-Mdp9');await ph.fill('#lgPw2','Autre-Mdp9');await ph.click('#lgOk');await ph.waitForTimeout(1500);
o.l10.hint=await ph.evaluate(()=>(document.getElementById('loginHint')||{}).textContent||'');o.l10.pwUnchanged=PW[KARIM_EMAIL]==='Karim-Chantier7';
await ph.evaluate(()=>{const a=document.getElementById('lgToMain');if(a)a.click();});await ph.waitForTimeout(300);
o.l10.main=await ph.evaluate(()=>({email:(document.getElementById('loginEmail')||{}).value,main:getComputedStyle(document.querySelector('#loginMain')).display!=='none'}));
C.l10=!o.l10.otpBtn&&!o.l10.send&&o.l10.noCodeHint&&/Ce lien a déjà servi/.test(o.l10.hint)&&o.l10.pwUnchanged&&o.l10.main.email===KARIM_EMAIL&&o.l10.main.main;
await ctx2.close();
// ── l6 : codes en série (Marc et Théo, jamais connectés)
CUR={...ETHAN};const nFn0=fnCalls.length;
await page.evaluate(()=>{const b=document.getElementById('admEtat');if(b){b.value='invite';b.dispatchEvent(new Event('change',{bubbles:true}));}});await wait(600);
o.l6={btn:await page.evaluate(()=>!!document.getElementById('admCodes'))};
await page.evaluate(()=>document.getElementById('admCodes').click());await wait(400);o.l6.ask=await page.evaluate(()=>({h:(document.querySelector('#modal h3')||{}).textContent,list:[...document.querySelectorAll('#modal .acList > label.acChk')].map(d=>d.textContent.trim()),chk:document.querySelectorAll('#modal .acList input[data-acb]:checked').length,go:(document.querySelector('#modal #acb-go')||{}).textContent,warn:((document.querySelector('#modal .err')||{}).textContent||'')}));
// décocher Hugo et Nina (pas de ce chantier) ; « Aucun » / « Tous » ; nom de la fiche
const tick=(names,on)=>page.evaluate(([ns,v])=>{[...document.querySelectorAll('#modal .acList > label.acChk')].forEach(l=>{if(ns.some(n=>l.textContent.includes(n))){const c=l.querySelector('input');if(c.checked!==v){c.checked=v;c.dispatchEvent(new Event('change',{bubbles:true}));}}});},[names,on]);
const goState=()=>page.evaluate(()=>{const b=document.querySelector('#modal #acb-go');return {t:b.textContent,d:b.disabled};});
await tick(['Hugo','Nina'],false);o.l6.g2=await goState();
await page.evaluate(()=>document.querySelector('#modal #acb-none').click());o.l6.g0=await goState();
await page.evaluate(()=>document.querySelector('#modal #acb-all').click());o.l6.g4=await goState();
await tick(['Hugo','Nina'],false);await page.fill('#modal #acb-lab','Chantier de la gare — équipe A');
const SHOT=process.env.SHOTS;if(SHOT)await page.screenshot({path:SHOT+'/lien_1_serie.png'});
await page.evaluate(()=>document.querySelector('#modal #acb-go').click());await wait(2500);if(SHOT)await page.screenshot({path:SHOT+'/lien_2_qr.png'});
const resNow=()=>page.evaluate(()=>({h:(document.querySelector('#modal h3')||{}).textContent,qr:document.querySelectorAll('#modal .acCard svg.qrSvg').length,who:(document.querySelector('#modal .acCard b')||{}).textContent,next:!!document.querySelector('#modal #acr-next:not([disabled])'),sms:decodeURIComponent((document.querySelector('#modal #acr-sms')||{getAttribute:()=>''}).getAttribute('href')||''),mail:decodeURIComponent((document.querySelector('#modal #acr-mail')||{getAttribute:()=>''}).getAttribute('href')||''),st:(document.querySelector('#modal #acr-st')||{}).textContent||'',badge:!!document.querySelector('#modal .acCard .acSent'),folded:!!document.querySelector('#modal .acCard details.acQrD:not([open])')}));
o.l6.res=await resNow();
// « Mail à Marc » touché (on bloque juste l'ouverture de la messagerie) → « 1 envoyé », repère « ✓ envoyé » sur sa fiche quand on y revient
await page.evaluate(()=>{const a=document.querySelector('#modal #acr-mail');a.addEventListener('click',e=>e.preventDefault());a.click();});o.l6.st1=await page.evaluate(()=>(document.querySelector('#modal #acr-st')||{}).textContent||'');
await page.evaluate(()=>document.querySelector('#modal #acr-next').click());await wait(300);o.l6.res2=await resNow();o.l6.who2=o.l6.res2.who;
await page.evaluate(()=>document.querySelector('#modal #acr-prev').click());await wait(300);o.l6.back=await resNow();
await page.evaluate(()=>document.querySelector('#modal #acr-next').click());await wait(300);
const SMSL={};for(const r of [o.l6.res,o.l6.res2]){const x=/(https?:\/\/\S+#acces=[A-Za-z0-9_-]+)/.exec(r.sms);if(x)SMSL[r.who]=x[1];}
const pop=page.waitForEvent('popup',{timeout:8000}).catch(()=>null);await page.evaluate(()=>document.querySelector('#modal #acr-print').click());const pw=await pop;
o.l6.print=pw?await pw.evaluate(()=>({n:document.querySelectorAll('.acP').length,qr:document.querySelectorAll('.acP svg').length,title:document.title,txt:document.body.innerText.slice(0,300)})).catch(e=>({err:String(e)})):null;if(pw)await pw.close();
o.l6.fn=fnCalls.slice(nFn0).map(c=>c.body.email);
C.l6=o.l6.btn&&/Codes de 1re connexion en série/.test(o.l6.ask.h||'')&&o.l6.ask.list.length===4&&o.l6.ask.chk===4&&/Créer les 4 codes/.test(o.l6.ask.go||'')
  &&o.l6.g2.t==='Créer les 2 codes'&&!o.l6.g2.d&&o.l6.g0.d&&/Coche au moins une personne/.test(o.l6.g0.t)&&o.l6.g4.t==='Créer les 4 codes'
  &&/2 codes? actifs/.test(o.l6.res.h||'')&&o.l6.res.qr===1&&o.l6.res.next&&o.l6.who2!==o.l6.res.who&&Object.keys(SMSL).length===2
  &&o.l6.res.mail.startsWith('mailto:marc.essai@scr-soudure.fr?subject=')&&o.l6.res.mail.includes(SMSL['Marc ESSAI']||'§')&&o.l6.res.folded&&!o.l6.res.badge
  &&o.l6.st1===' · 1 envoyé'&&!o.l6.res2.badge&&o.l6.back.who==='Marc ESSAI'&&o.l6.back.badge&&/1 envoyé/.test(o.l6.back.st)
  &&!!o.l6.print&&o.l6.print.n===2&&o.l6.print.qr===2&&/Chantier de la gare — équipe A/.test(o.l6.print.title+' '+o.l6.print.txt)
  &&J(o.l6.fn.sort())==='["marc.essai@scr-soudure.fr","theo.essai@scr-soudure.fr"]';
// l9 : adresse locale (serveur de test 127.0.0.1) → avertissement avant de créer ; PC : jamais la fenêtre « écran d'accueil », pas de bouton dans le compte
C.l9a=/Adresse locale/.test(o.l6.ask.warn);
await page.evaluate(()=>{const c=document.querySelector('#modal [data-close]');if(c)c.click();});await wait(300);
await page.click('#homeAva');await wait(300);o.l9={inst:await page.evaluate(()=>!!document.querySelector('#modal #accInst')),seen:await page.evaluate(()=>localStorage.getItem('trace:installTip'))};
await page.evaluate(()=>{const c=document.querySelector('#modal [data-close]');if(c)c.click();});await wait(200);
C.l9b=!o.l9.inst&&o.l9.seen===null;
// ── l8 : iPhone de Marc (QR des codes en série) → mot de passe → « Mets Tracé sur ton écran d'accueil » (une fois) ; repris dans le compte, bouton Installer si le navigateur le propose
{const IPH='Mozilla/5.0 (iPhone; CPU iPhone OS 17_5 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.5 Mobile/15E148 Safari/604.1';
  const ctx3=await browser.newContext({viewport:{width:390,height:844},userAgent:IPH});await ctx3.route(u=>u.href.startsWith(SB),async r=>{if(new URL(r.request().url()).pathname==='/rest/v1/profiles')await new Promise(x=>setTimeout(x,1500));return SRV(r);}); /* 01/11 soir : réseau lent (fiche du compte en retard) — le mot de passe ne doit être demandé qu'une fois */
  await ctx3.addInitScript(()=>{try{localStorage.setItem('trace:installTip:test','1');}catch(e){}});
  const p3=await ctx3.newPage();p3.on('pageerror',e=>logs.push('PH: '+e.message.slice(0,200)));
  const lm=SMSL['Marc ESSAI'];o.l8={link:!!lm};
  if(lm){await p3.goto(lm);await p3.waitForTimeout(2200);
    await p3.fill('#lgPw1','Marc-Chantier8');await p3.fill('#lgPw2','Marc-Chantier8');await p3.click('#lgOk');
    o.l8.force=false;let tip=null;for(let k=0;k<20&&!tip;k++){await p3.waitForTimeout(500);if(await p3.evaluate(()=>/CHOISIS TON MOT DE PASSE/.test((document.querySelector('#loginAlt .loginAlt-t')||{}).textContent||'')&&document.querySelector('#loginView').classList.contains('show')))o.l8.force=true;tip=await p3.evaluate(()=>{const m=document.querySelector('#modal');if(!m.classList.contains('show'))return null;const h=(m.querySelector('h3')||{}).textContent||'';return /écran d'accueil/.test(h)?{h,li:m.querySelectorAll('.itSteps li').length,txt:m.textContent}:null;});}
    if(SHOT&&tip)await p3.screenshot({path:SHOT+'/lien_3_ecran.png'});
    o.l8.tip=tip?{h:tip.h,li:tip.li,ios:/Sur l'écran d'accueil/.test(tip.txt)&&/Safari/.test(tip.txt),once:/une fois/.test(tip.txt)}:null;o.l8.home=await p3.evaluate(()=>document.querySelector('#homeView').classList.contains('show'));
    await p3.evaluate(()=>{const c=document.querySelector('#modal [data-close]');if(c)c.click();});await p3.waitForTimeout(300);
    await p3.reload();await p3.waitForTimeout(3500);o.l8.again=await p3.evaluate(()=>{const m=document.querySelector('#modal');return m.classList.contains('show')&&/écran d'accueil/.test(m.textContent);});
    await p3.evaluate(()=>{const e=new Event('beforeinstallprompt');e.prompt=()=>{window.__prompted=(window.__prompted||0)+1;};e.userChoice=Promise.resolve({outcome:'accepted'});window.dispatchEvent(e);});
    await p3.click('#homeAva');await p3.waitForTimeout(300);o.l8.btn=await p3.evaluate(()=>!!document.querySelector('#modal #accInst'));
    if(o.l8.btn){await p3.click('#modal #accInst');await p3.waitForTimeout(400);o.l8.go=await p3.evaluate(()=>!!document.querySelector('#modal #it-go'));
      if(o.l8.go){await p3.click('#modal #it-go');await p3.waitForTimeout(500);o.l8.prompted=await p3.evaluate(()=>window.__prompted||0);o.l8.toast=await p3.evaluate(()=>(document.querySelector('#toast')||{}).textContent||'');}}}
  await ctx3.close();
  C.l8=o.l8.link&&!o.l8.force&&!!o.l8.tip&&o.l8.tip.li===3&&o.l8.tip.ios&&o.l8.tip.once&&o.l8.home&&o.l8.again===false&&o.l8.btn&&o.l8.go&&o.l8.prompted===1&&/écran d'accueil/.test(o.l8.toast);}
console.log('mesures :',J({...o,k:undefined,l:undefined}).slice(0,3000));console.log('série :',J(o.l6).slice(0,1500));console.log('écran d\'accueil :',J({l8:o.l8,l9:o.l9}).slice(0,1200));
await browser.close();C.l7=!logs.filter(l=>/PAGEERROR|PH:/.test(l)).length;if(logs.length)console.log('journal',J(logs.slice(0,6)));
console.log('RÉSULTATS',J(C));const ko=Object.entries(C).filter(([,v])=>!v).map(([k])=>k);console.log(ko.length?'RESULTAT: ECHEC '+ko.join(' '):'RESULTAT: TOUT VERT');process.exit(ko.length?1:0);
