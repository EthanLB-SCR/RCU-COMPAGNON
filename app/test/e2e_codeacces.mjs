// CODE DE CONNEXION DONNÉ PAR L'ADMINISTRATEUR (13/10/2026). Ethan (capture Supabase « Set up custom SMTP to edit templates ») : sans SMTP, Supabase n'envoie
// ses e-mails qu'aux membres de l'organisation → les salariés ne reçoivent rien. Désormais : l'administrateur crée un code (fonction serveur « acces-code »),
// la personne le tape sur l'écran d'accueil et choisit son mot de passe. Supabase ET la fonction sont SIMULÉS au niveau réseau (le vrai supabase-js tourne) :
// le serveur simulé garde les mots de passe et le repère must_change comme le ferait Supabase. Aucune donnée réelle (adresses, codes inventés).
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
const invites=[{email:KARIM_EMAIL,nom:'BENALI',prenom:'Karim',poste:'soudeur',type:'salarie',rights:{},sites:null,created_at:'2026-10-13T08:00:00Z',used_at:null}];
const calls=[];const fnCalls=[];const puts=[];let FN='ok';let NOTAUTH=false;
const browser=await chromium.launch({headless:true, executablePath: process.env.CHROMIUM_PATH||undefined});
const ctx=await browser.newContext({viewport:{width:390,height:844}});
const CORS={'access-control-allow-origin':'*','access-control-allow-headers':'authorization, x-client-info, apikey, content-type','access-control-allow-methods':'GET, POST, PUT, PATCH, DELETE, OPTIONS'};
await ctx.route(u=>u.href.startsWith(SB),async route=>{const req=route.request();const u=new URL(req.url());const p=u.pathname;const acc=req.headers()['accept']||'';calls.push(req.method()+' '+p+(u.search?u.search.slice(0,40):''));
  const json=(o,status=200)=>route.fulfill({status,contentType:'application/json',headers:CORS,body:JSON.stringify(o)});
  if(req.method()==='OPTIONS')return route.fulfill({status:200,headers:CORS,body:''});
  let b={};try{b=JSON.parse(req.postData()||'{}');}catch(e){}
  if(p==='/functions/v1/acces-code'){fnCalls.push({body:b,auth:String(req.headers()['authorization']||'')});
    if(FN==='missing')return json({code:'NOT_FOUND',message:'Requested function was not found'},404);
    if(FN==='deny')return json({error:"réservé à l'administrateur"},403);
    const em=String(b.email||'').toLowerCase();const created=!PW[em];PW[em]=b.code;META[em]={...(META[em]||{}),must_change:true,code_by:CUR.email};
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
  return json([]);});
const page=await ctx.newPage();
const logs=[];page.on('pageerror',e=>logs.push('PAGEERROR: '+e.message.slice(0,300)));page.on('console',m=>{if(m.type()==='error'&&!/realtime|websocket|Failed to fetch|net::ERR|40[034]|422|status of/i.test(m.text()))logs.push(m.text().slice(0,200));});
page.on('dialog',d=>{logs.push('DIALOG: '+d.message().slice(0,80));d.accept().catch(()=>{});});
const C={};const wait=ms=>page.waitForTimeout(ms);
const scr=()=>page.evaluate(()=>({login:document.querySelector('#loginView').classList.contains('show'),home:document.querySelector('#homeView').classList.contains('show'),hint:(document.querySelector('#loginHint')||{}).textContent||'',altT:(document.querySelector('#loginAlt .loginAlt-t')||{}).textContent||'',alt:getComputedStyle(document.querySelector('#loginAlt')).display!=='none',main:getComputedStyle(document.querySelector('#loginMain')).display!=='none',modal:document.querySelector('#modal').classList.contains('show')}));
const out0=async()=>{await page.click('#homeAva');await wait(300);await page.click('#accOut');await wait(900);};
const card=name=>page.evaluate(n=>{const k=[...document.querySelectorAll('#homeBody .admAcc')].find(c=>c.textContent.includes(n));if(!k)return null;const b=k.querySelector('[data-admcode]');return {btn:b?b.textContent.trim():null};},name);
await page.goto(BASE+'/index.html');await wait(600);await page.evaluate(()=>{localStorage.clear();});await page.reload();await wait(900);
// ── 1) écran d'accueil : le message renvoie au code de l'administrateur ; Ethan (administrateur) se connecte
let out={hint0:(await scr()).hint};
await page.fill('#loginEmail',ETHAN.email);await page.fill('#loginPwd','Admin-2026!');await page.click('#loginGo');await wait(1800);out.home=(await scr()).home;
await page.evaluate(()=>document.getElementById('htAdmin').click());await wait(1200);
out.cards={karim:await card('Karim BENALI'),paul:await card('Paul DURAND'),moi:await card('Ethan LE BIHAN'),julie:await card('Julie MARTIN')};
out.aide=await page.evaluate(()=>/code de connexion/.test(document.querySelector('#homeBody').textContent));
console.log('1) accueil + boutons « code » de l\'onglet Administrateur :',JSON.stringify(out));
C.c1=/code de connexion/.test(out.hint0)&&/créer mon mot de passe/.test(out.hint0)&&out.home&&out.cards.karim&&/Code de 1re connexion/.test(out.cards.karim.btn)&&out.cards.paul&&/Nouveau code/.test(out.cards.paul.btn)
  &&out.cards.moi&&out.cards.moi.btn===null&&out.cards.julie&&out.cards.julie.btn===null&&out.aide;
// ── 2) fonction pas encore déployée → message qui dit quoi faire ; refus du serveur → affiché ; rien n'est créé
const openCode=name=>page.evaluate(n=>{const k=[...document.querySelectorAll('#homeBody .admAcc')].find(c=>c.textContent.includes(n));k.querySelector('[data-admcode]').click();},name);
await openCode('Karim BENALI');await wait(300);
out={m1:await page.evaluate(()=>({h:document.querySelector('#modal h3').textContent,code:document.querySelector('#ac-code').textContent}))};
await page.click('#ac-new');await wait(100);out.code2=await page.evaluate(()=>document.querySelector('#ac-code').textContent);
FN='missing';await page.click('#ac-ok');await wait(900);out.missing=await page.evaluate(()=>document.querySelector('#ac-err').textContent);
FN='deny';await page.click('#ac-ok');await wait(900);out.deny=await page.evaluate(()=>document.querySelector('#ac-err').textContent);
console.log('2) fenêtre du code, fonction absente, refus :',JSON.stringify(out));
const fmt=/^[a-hjkmnp-z2-9]{4} [a-hjkmnp-z2-9]{4}$/;
C.c2=/Code de 1re connexion — Karim BENALI/.test(out.m1.h)&&fmt.test(out.m1.code)&&fmt.test(out.code2)&&out.code2!==out.m1.code&&/pas encore installée/.test(out.missing)&&/acces-code\/README/.test(out.missing)
  &&/Refusé : réservé à l'administrateur/.test(out.deny)&&!PW[KARIM_EMAIL]&&fnCalls.length===2;
// ── 3) activation : la fonction reçoit l'e-mail et le code (avec le jeton d'Ethan) ; écran « Code actif » : code, message prêt, SMS, copie
FN='ok';await page.click('#ac-ok');await wait(1200);
const shown=out.code2;const CODE=shown.replace(' ','');
out={fn:fnCalls[fnCalls.length-1],m2:await page.evaluate(()=>({h:document.querySelector('#modal h3').textContent,code:document.querySelector('#modal .codeBig').textContent,msg:document.querySelector('#ac-msg').value,sms:document.querySelector('#ac-sms').getAttribute('href'),copy:!!document.querySelector('#ac-copy')}))};
const tokSub=JSON.parse(Buffer.from(out.fn.auth.replace(/^Bearer\s+/,'').split('.')[1],'base64url').toString()).sub;
await page.click('#modal [data-close]');await wait(900);out.list=await card('Karim BENALI');
console.log('3) code activé :',JSON.stringify({...out,fn:{body:out.fn.body,sub:tokSub}}));
C.c3=out.fn.body.email===KARIM_EMAIL&&out.fn.body.code===CODE&&tokSub===ETHAN.id&&/Code actif — Karim BENALI/.test(out.m2.h)&&out.m2.code===shown&&out.m2.msg.includes(KARIM_EMAIL)&&out.m2.msg.includes(shown)&&/index\.html|localhost/.test(out.m2.msg)
  &&/^sms:\?&body=/.test(out.m2.sms)&&decodeURIComponent(out.m2.sms.split('body=')[1]).includes(shown)&&out.m2.copy&&PW[KARIM_EMAIL]===CODE&&META[KARIM_EMAIL].must_change===true&&out.list&&/Nouveau code/.test(out.list.btn);
// ── 4) Karim, écran d'accueil → « Première connexion » : e-mail + code tapé EN MAJUSCULES avec espace + son mot de passe → connecté ; le serveur a le nouveau mot de passe, must_change effacé
await out0();
await page.click('#loginFirst');await wait(250);out={panel:await page.evaluate(()=>({t:document.querySelector('#loginAlt .loginAlt-t').textContent,code:!!document.querySelector('#lgCode'),pw:document.querySelectorAll('#loginAlt input[type=password]').length,send:(document.querySelector('#lgSend')||{}).textContent,hint:document.querySelector('#loginHint').textContent}))};
await page.fill('#lgEmail',KARIM_EMAIL);await page.fill('#lgCode','zzzz zzzz');await page.fill('#lgPw1','Karim-2026!');await page.fill('#lgPw2','Karim-2026!');await page.click('#lgOk');await wait(1000);out.faux=await scr();
await page.fill('#lgCode',shown.toUpperCase());await page.click('#lgOk');await wait(1800);out.ok=await scr();out.pw=PW[KARIM_EMAIL];out.meta=META[KARIM_EMAIL];out.put=puts[puts.length-1];
console.log('4) première connexion avec le code :',JSON.stringify(out));
C.c4=out.panel.t==='CRÉER MON MOT DE PASSE'&&out.panel.code&&out.panel.pw===2&&/recevoir par e-mail/i.test(out.panel.send)&&/donné par ton responsable/.test(out.panel.hint)
  &&out.faux.login&&!out.faux.home&&/E-mail ou code incorrect/.test(out.faux.hint)&&!out.ok.login&&out.ok.home&&out.pw==='Karim-2026!'&&out.meta.must_change===false&&out.put.data&&out.put.data.must_change===false;
// ── 5) reconnexion de Karim avec SON mot de passe : accueil direct (pas de nouvelle demande)
await out0();await page.fill('#loginEmail',KARIM_EMAIL);await page.fill('#loginPwd','Karim-2026!');await page.click('#loginGo');await wait(1800);out={relog:await scr()};
console.log('5) reconnexion :',JSON.stringify(out));
C.c5=!out.relog.login&&out.relog.home&&!out.relog.modal;
// ── 6) mot de passe oublié : nouveau code ; Karim le tape dans la case MOT DE PASSE ordinaire (« k7mp 4qxa ») → connecté mais l'appli exige son mot de passe avant d'entrer
await out0();const CODE2='h3wz8ntc';PW[KARIM_EMAIL]=CODE2;META[KARIM_EMAIL]={...META[KARIM_EMAIL],must_change:true};
await page.fill('#loginEmail',KARIM_EMAIL);await page.fill('#loginPwd','H3WZ 8NTC');await page.click('#loginGo');await wait(1800);out={force:await scr()};
await wait(800);out.force2=await scr();
await page.fill('#lgPw1','Nouveau-2026');await page.fill('#lgPw2','Nouveau-2027');await page.click('#lgOk');await wait(300);out.diff=(await scr()).hint;
await page.fill('#lgPw1',CODE2);await page.fill('#lgPw2',CODE2);await page.click('#lgOk');await wait(900);out.same=(await scr()).hint;
await page.fill('#lgPw1','Nouveau-2026');await page.fill('#lgPw2','Nouveau-2026');await page.click('#lgOk');await wait(1500);out.ok=await scr();out.pw=PW[KARIM_EMAIL];out.meta=META[KARIM_EMAIL].must_change;
console.log('6) code tapé dans la case mot de passe → choix obligatoire :',JSON.stringify(out));
C.c6=out.force.login&&!out.force.home&&out.force.altT==='CHOISIS TON MOT DE PASSE'&&!out.force.main&&out.force2.altT==='CHOISIS TON MOT DE PASSE'&&!out.force2.home&&/diffèrent/.test(out.diff)&&/déjà ton mot de passe/.test(out.same)
  &&!out.ok.login&&out.ok.home&&out.pw==='Nouveau-2026'&&out.meta===false;
// ── 7) connecté avec un nouveau code puis appli FERMÉE avant d'avoir choisi le mot de passe : à la réouverture, l'écran « choisis ton mot de passe » revient ; « Se déconnecter » ressort
await out0();PW[KARIM_EMAIL]='p7xk3mwa';META[KARIM_EMAIL]={...META[KARIM_EMAIL],must_change:true};
await page.fill('#loginEmail',KARIM_EMAIL);await page.fill('#loginPwd','p7xk3mwa');await page.click('#loginGo');await wait(1500);out={avant:(await scr()).altT};
await page.reload();await wait(2600);out.reopen=await scr();
await page.click('#lgOut');await wait(900);out.out=await scr();META[KARIM_EMAIL].must_change=false;
console.log('7) réouverture avec code provisoire :',JSON.stringify(out));
C.c7=out.avant==='CHOISIS TON MOT DE PASSE'&&out.reopen.login&&!out.reopen.home&&out.reopen.altT==='CHOISIS TON MOT DE PASSE'&&out.out.login&&out.out.main&&!out.out.alt;
// ── 8) « Le recevoir par e-mail » vers une adresse que Supabase refuse (pas de SMTP) : message qui renvoie vers le responsable ; ce qui était tapé reste
NOTAUTH=true;await page.click('#loginFirst');await wait(250);await page.fill('#lgEmail','inconnu@scr-soudure.fr');await page.fill('#lgCode','abcd');await page.click('#lgSend');await wait(900);
out={na:(await scr()).hint,kept:await page.evaluate(()=>document.querySelector('#lgCode').value),flag:await page.evaluate(()=>localStorage.getItem('trace:pwdSetup'))};NOTAUTH=false;
await page.click('#lgBack');await wait(200);out.back=await scr();
console.log('8) e-mail refusé par Supabase :',JSON.stringify(out));
C.c8=/Pas d'e-mail possible vers cette adresse/.test(out.na)&&/responsable/.test(out.na)&&out.kept==='abcd'&&!out.flag&&out.back.main&&!out.back.alt;
const bad=Object.entries(C).filter(([k,v])=>!v).map(([k])=>k);console.log(bad.length?'RESULTAT: ECHEC '+bad.join(','):'RESULTAT: TOUT VERT');console.log(logs.length?logs:'[]');
await browser.close();
