// FONCTION SERVEUR « acces-code » (13/10/2026) — testée pour de vrai : le code de supabase/functions/acces-code/index.ts tourne dans Deno
// (comme chez Supabase), face à un Supabase SIMULÉ (authentification + base) sur cette machine. On vérifie qui a le droit, ce qui est refusé,
// et ce que la fonction envoie au serveur d'authentification (création / remplacement du mot de passe, adresse confirmée, repère must_change).
// Aucune donnée réelle : adresses et codes inventés. Deno : $DENO_BIN, sinon `deno` du système, sinon installé dans /tmp/deno-tool (npm).
import http from 'node:http';import {spawn,execSync} from 'node:child_process';import fs from 'node:fs';import path from 'node:path';import os from 'node:os';import {fileURLToPath,pathToFileURL} from 'node:url';
const HERE=path.dirname(fileURLToPath(import.meta.url));const FN=path.resolve(HERE,'../supabase/functions/acces-code/index.ts');
/* le paquet npm « deno » installe un petit lanceur node (.bin/deno) qui démarre le vrai binaire (deno/deno) : on lance le binaire, sinon l'arrêt du test laisserait tourner la fonction */
const realBin=b=>{const r=path.resolve(path.dirname(b),'../deno/deno');return /node_modules[\\/]\.bin[\\/]deno$/.test(b)&&fs.existsSync(r)?r:b;};
function denoBin(){if(process.env.DENO_BIN&&fs.existsSync(process.env.DENO_BIN))return realBin(process.env.DENO_BIN);try{const w=execSync('which deno',{stdio:['ignore','pipe','ignore']}).toString().trim();if(w)return w;}catch(e){}
  const t='/tmp/deno-tool/node_modules/deno/deno';if(!fs.existsSync(t)){fs.mkdirSync('/tmp/deno-tool',{recursive:true});execSync('npm i deno@2.1.4 --prefix /tmp/deno-tool --no-audit --no-fund',{stdio:'ignore',timeout:240000});}return fs.existsSync(t)?t:'/tmp/deno-tool/node_modules/.bin/deno';}
const DENO=denoBin();
// ── Supabase simulé
const ANON='anon-test-key',SERVICE='service-test-key',PUB='sb_publishable_test',SEC='sb_secret_test';
let users,profiles,invites,log;
const reset=()=>{users=[{id:'11111111-1111-4111-8111-111111111111',email:'elebihan@scr-soudure.fr',password:'x',user_metadata:{}},{id:'22222222-2222-4222-8222-222222222222',email:'paul.durand@scr-soudure.fr',password:'Soudure-2026!',user_metadata:{}},{id:'33333333-3333-4333-8333-333333333333',email:'julie.martin@scr-soudure.fr',password:'y',user_metadata:{}},{id:'44444444-4444-4444-8444-444444444444',email:'parti@scr-soudure.fr',password:'z',user_metadata:{}},{id:'55555555-5555-4555-8555-555555555555',email:'ancien@scr-soudure.fr',password:'v',user_metadata:{}}];
  profiles=[{id:'11111111-1111-4111-8111-111111111111',email:'elebihan@scr-soudure.fr',admin:true,poste:'resp_exploitation',active:true},{id:'22222222-2222-4222-8222-222222222222',email:'paul.durand@scr-soudure.fr',admin:false,poste:'soudeur',active:true},{id:'33333333-3333-4333-8333-333333333333',email:'julie.martin@scr-soudure.fr',admin:true,poste:'assist_rh',active:true},{id:'44444444-4444-4444-8444-444444444444',email:'parti@scr-soudure.fr',admin:false,poste:'soudeur',active:false},{id:'66666666-6666-4666-8666-666666666666',email:'fantome@scr-soudure.fr',admin:false,poste:'manchonneur',active:true}];
  invites=[{email:'karim.benali@scr-soudure.fr'},{email:'ancien@scr-soudure.fr'},{email:'fantome@scr-soudure.fr'}];log=[];};
reset();
const TOK={'tok-ethan':'11111111-1111-4111-8111-111111111111','tok-paul':'22222222-2222-4222-8222-222222222222'};const KEYS=[SERVICE,SEC];
const userJson=u=>({id:u.id,aud:'authenticated',role:'authenticated',email:u.email,email_confirmed_at:u.confirmed?'2026-10-13T10:00:00Z':'2026-10-01T10:00:00Z',user_metadata:u.user_metadata||{},app_metadata:{provider:'email'},created_at:'2026-10-01T10:00:00Z',updated_at:new Date().toISOString()});
const srv=http.createServer((req,res)=>{let body='';req.on('data',c=>body+=c);req.on('end',()=>{const u=new URL(req.url,'http://x');const p=u.pathname;const auth=String(req.headers.authorization||'').replace(/^Bearer\s+/i,'');const apikey=String(req.headers.apikey||'');let b={};try{b=JSON.parse(body||'{}');}catch(e){}
  const send=(o,st=200)=>{res.writeHead(st,{'content-type':'application/json'});res.end(JSON.stringify(o));};const isSvc=KEYS.includes(auth)||KEYS.includes(apikey)&&!auth;
  log.push({m:req.method,p,q:u.search,auth,apikey,b});
  if(p==='/auth/v1/user'&&req.method==='GET'){const id=TOK[auth];const x=users.find(y=>y.id===id);return x?send(userJson(x)):send({code:401,error_code:'bad_jwt',msg:'invalid JWT: unable to parse or verify signature'},401);}
  if(p==='/rest/v1/rpc/is_admin'){const id=TOK[auth];const pr=profiles.find(y=>y.id===id);return send(!!(pr&&pr.active&&(pr.admin||pr.poste==='admin'||pr.email==='elebihan@scr-soudure.fr')));} /* jeton de l'appelant obligatoire : avec la clé de service, auth.uid() est vide → false */
  if(p==='/rest/v1/invites'){if(!KEYS.includes(auth))return send([]);const em=(u.searchParams.get('email')||'').replace(/^eq\./,'');return send(invites.filter(i=>i.email===em));}
  if(p==='/rest/v1/profiles'){if(!KEYS.includes(auth))return send([]);const em=(u.searchParams.get('email')||'').replace(/^eq\./,'');return send(profiles.filter(i=>i.email===em).slice(0,+(u.searchParams.get('limit')||99)));}
  if(p.startsWith('/auth/v1/admin/')){if(!KEYS.includes(auth))return send({code:403,error_code:'not_admin',msg:'User not allowed'},403);
    if(p==='/auth/v1/admin/users'&&req.method==='POST'){if(users.some(y=>y.email===b.email))return send({code:422,error_code:'email_exists',msg:'A user with this email address has already been registered'},422);
      const x={id:crypto.randomUUID(),email:b.email,password:b.password,user_metadata:b.user_metadata||{},confirmed:!!b.email_confirm};users.push(x);
      if(invites.some(i=>i.email===b.email)&&!profiles.some(y=>y.id===x.id))profiles.push({id:x.id,email:b.email,admin:false,poste:'soudeur',active:true}); /* déclencheur de la base : fiche d'après l'invitation */
      return send(userJson(x));}
    if(p==='/auth/v1/admin/users'&&req.method==='GET'){const pg=+(u.searchParams.get('page')||1),per=+(u.searchParams.get('per_page')||50);return send({users:users.slice((pg-1)*per,pg*per).map(userJson),aud:'authenticated'});}
    const m=/^\/auth\/v1\/admin\/users\/([^/]+)$/.exec(p);if(m&&req.method==='PUT'){const x=users.find(y=>y.id===m[1]);if(!x)return send({code:404,error_code:'user_not_found',msg:'User not found'},404);if(b.password)x.password=b.password;if(b.user_metadata)x.user_metadata={...x.user_metadata,...b.user_metadata};if(b.email_confirm)x.confirmed=true;return send(userJson(x));}}
  send({message:'route inconnue '+p},400);});});
await new Promise(r=>srv.listen(0,'127.0.0.1',r));const SB='http://127.0.0.1:'+srv.address().port;
// ── la fonction dans Deno (port imposé par une petite enveloppe autour de Deno.serve)
const tmp=fs.mkdtempSync(path.join(os.tmpdir(),'fn-acces-'));fs.writeFileSync(path.join(tmp,'deno.json'),'{"nodeModulesDir":"none"}');
fs.writeFileSync(path.join(tmp,'run.ts'),`const o=Deno.serve;(Deno as any).serve=(h:any)=>o({port:Number(Deno.env.get('FN_PORT')),hostname:'127.0.0.1',onListen:({port}:any)=>console.log('LISTEN '+port)},h);await import(${JSON.stringify(pathToFileURL(FN).href)});`);
async function startFn(port,env){const ps=spawn(DENO,['run','--allow-net','--allow-env','--config',path.join(tmp,'deno.json'),path.join(tmp,'run.ts')],{cwd:tmp,env:{...process.env,DENO_DIR:process.env.DENO_DIR||'/tmp/deno-tool/.denodir',DENO_CERT:fs.existsSync('/root/.ccr/ca-bundle.crt')?'/root/.ccr/ca-bundle.crt':(process.env.DENO_CERT||''),RUST_BACKTRACE:'0',NO_COLOR:'1',FN_PORT:String(port),SUPABASE_URL:SB,...env}});
  let out='';ps.stdout.on('data',d=>{out+=d;FNLOG.push(String(d));});ps.stderr.on('data',d=>{out+=d;FNLOG.push(String(d));});
  for(let i=0;i<1200&&!/LISTEN \d+/.test(out);i++){if(ps.exitCode!==null)break;await new Promise(r=>setTimeout(r,100));}
  if(!/LISTEN \d+/.test(out)){ps.kill();throw new Error('fonction non démarrée : '+out.slice(-600));}return ps;}
const call=async(port,body,tok,method='POST')=>{const r=await fetch('http://127.0.0.1:'+port+'/',{method,headers:{'content-type':'application/json',...(tok?{authorization:'Bearer '+tok}:{})},body:method==='POST'?JSON.stringify(body||{}):undefined});let j=null;try{j=await r.json();}catch(e){}return {st:r.status,j,cors:r.headers.get('access-control-allow-origin')};};
const FNLOG=[];const C={};const P1=18731,P2=18732;let fn1,fn2;
try{
  fn1=await startFn(P1,{SUPABASE_ANON_KEY:ANON,SUPABASE_SERVICE_ROLE_KEY:SERVICE});
  // 1) qui peut appeler : personne sans jeton, un non-administrateur, un jeton bidon → refusés ; préflight CORS ok ; GET refusé
  let o={none:await call(P1,{email:'karim.benali@scr-soudure.fr',code:'k7mp4qxa'}),paul:await call(P1,{email:'karim.benali@scr-soudure.fr',code:'k7mp4qxa'},'tok-paul'),fake:await call(P1,{email:'karim.benali@scr-soudure.fr',code:'k7mp4qxa'},'tok-bidon'),
    opt:await fetch('http://127.0.0.1:'+P1+'/',{method:'OPTIONS'}).then(r=>({st:r.status,h:r.headers.get('access-control-allow-headers')})),get:await call(P1,null,'tok-ethan','GET')};
  const isAdmCalls=log.filter(l=>l.p==='/rest/v1/rpc/is_admin');
  console.log('1) appelants :',JSON.stringify({none:o.none.st,paul:[o.paul.st,o.paul.j],fake:[o.fake.st,o.fake.j],opt:o.opt,get:o.get.st,isAdmWith:isAdmCalls.map(l=>l.auth)}));
  C.c1=o.none.st===401&&o.paul.st===403&&/réservé à l'administrateur/.test(o.paul.j.error)&&o.fake.st===401&&/reconnecte-toi/.test(o.fake.j.error)&&o.opt.st===200&&/authorization/.test(o.opt.h)&&o.get.st===405&&isAdmCalls.length===1&&isAdmCalls[0].auth==='tok-paul'
    &&!users.find(u=>u.email==='karim.benali@scr-soudure.fr')&&o.paul.cors==='*';
  // 2) demandes refusées : adresse invalide, code mal formé (majuscules, court, espace), soi-même, l'administrateur d'office, un autre administrateur, compte inactif, adresse sans accès
  const E=async(email,code)=>(await call(P1,{email,code},'tok-ethan'));
  o={badMail:await E('pas-une-adresse','k7mp4qxa'),upper:await E('karim.benali@scr-soudure.fr','K7MP4QXA'),court:await E('karim.benali@scr-soudure.fr','k7mp'),espace:await E('karim.benali@scr-soudure.fr','k7mp 4qxa'),
    moi:await E('elebihan@scr-soudure.fr','k7mp4qxa'),admin:await E('julie.martin@scr-soudure.fr','k7mp4qxa'),inactif:await E('parti@scr-soudure.fr','k7mp4qxa'),inconnu:await E('personne@ailleurs.fr','k7mp4qxa')};
  const writes=log.filter(l=>l.p.startsWith('/auth/v1/admin/'));
  console.log('2) refus :',JSON.stringify(Object.fromEntries(Object.entries(o).map(([k,v])=>[k,v.st+' '+(v.j&&v.j.error)]))),'écritures :',writes.length);
  C.c2=o.badMail.st===400&&/e-mail invalide/.test(o.badMail.j.error)&&o.upper.st===400&&o.court.st===400&&o.espace.st===400&&/code invalide/.test(o.court.j.error)&&o.moi.st===400&&/propre compte/.test(o.moi.j.error)
    &&o.admin.st===403&&/compte administrateur/.test(o.admin.j.error)&&o.inactif.st===400&&/inactif/.test(o.inactif.j.error)&&o.inconnu.st===400&&/Créer un accès/.test(o.inconnu.j.error)&&writes.length===0;
  // 3) invitation jamais utilisée → compte CRÉÉ : mot de passe = le code, adresse confirmée, repère must_change, clé de service ; puis un 2e code le REMPLACE
  const r1=await E('Karim.Benali@SCR-soudure.fr ','k7mp4qxa');const k=users.find(u=>u.email==='karim.benali@scr-soudure.fr');const post=log.filter(l=>l.p==='/auth/v1/admin/users'&&l.m==='POST').pop();
  const r2=await E('karim.benali@scr-soudure.fr','h3wz8ntc');const put=log.filter(l=>l.m==='PUT').pop();
  o={r1:r1.j,r2:r2.j,pw:k&&k.password,meta:k&&k.user_metadata,conf:k&&k.confirmed,post:post&&{auth:post.auth,b:{...post.b,password:post.b.password?'***':null}},put:put&&{p:put.p,auth:put.auth,pw:put.b.password,mc:put.b.user_metadata&&put.b.user_metadata.must_change}};
  console.log('3) création puis nouveau code :',JSON.stringify(o));
  C.c3=r1.st===200&&r1.j.ok===true&&r1.j.created===true&&r2.st===200&&r2.j.ok===true&&r2.j.created===false&&o.pw==='h3wz8ntc'&&o.meta.must_change===true&&o.meta.code_by==='elebihan@scr-soudure.fr'&&!!o.meta.code_at&&o.conf
    &&post.auth===SERVICE&&post.b.email==='karim.benali@scr-soudure.fr'&&post.b.email_confirm===true&&post.b.user_metadata.must_change===true&&post.b.password==='k7mp4qxa'&&o.put.auth===SERVICE&&o.put.pw==='h3wz8ntc'&&o.put.mc===true&&!JSON.stringify(r1.j).includes('k7mp');
  // 4) mot de passe oublié d'un compte existant (Paul) : remplacé par le code ; ses autres données intactes
  const r4=await E('paul.durand@scr-soudure.fr','p4ul2026');const pa=users.find(u=>u.id==='22222222-2222-4222-8222-222222222222');
  o={st:r4.st,j:r4.j,pw:pa.password,meta:pa.user_metadata,nUsers:users.length};console.log('4) compte existant :',JSON.stringify(o));
  C.c4=r4.st===200&&r4.j.created===false&&pa.password==='p4ul2026'&&pa.user_metadata.must_change===true&&users.length===6;
  // 5) cas tordus : fiche sans compte d'authentification (supprimé dans Supabase) → recréé ; ancien compte sans fiche (invitation + compte) → retrouvé dans la liste
  const r5=await E('fantome@scr-soudure.fr','f4nt0me9'.replace(/0/g,'2'));const r6=await E('ancien@scr-soudure.fr','anc1en22'.replace(/1/g,'3'));const v=users.find(u=>u.email==='ancien@scr-soudure.fr');
  o={fantome:[r5.st,r5.j],ancien:[r6.st,r6.j],vpw:v.password,list:log.some(l=>l.p==='/auth/v1/admin/users'&&l.m==='GET'),noNotFound:!/not.?found|404/i.test(JSON.stringify([r5.j,r6.j]))};
  console.log('5) fiche sans compte / compte sans fiche :',JSON.stringify(o));
  C.c5=r5.st===200&&r5.j.created===true&&r6.st===200&&r6.j.created===false&&v.password==='anc3en22'&&o.list&&o.noNotFound;
  // 6) projet avec les NOUVELLES clés seulement (pas de SUPABASE_ANON_KEY / SERVICE_ROLE_KEY) : la clé secrète « default » est prise
  fn2=await startFn(P2,{SUPABASE_PUBLISHABLE_KEYS:JSON.stringify({default:PUB}),SUPABASE_SECRET_KEYS:JSON.stringify({default:SEC}),SUPABASE_ANON_KEY:'',SUPABASE_SERVICE_ROLE_KEY:''});
  const n0=log.length;const r7=await call(P2,{email:'paul.durand@scr-soudure.fr',code:'n0uv3llz'.replace(/0/g,'o').replace(/o/g,'p')},'tok-ethan');const l7=log.slice(n0);
  o={st:r7.st,j:r7.j,adminAuth:[...new Set(l7.filter(l=>l.p.startsWith('/auth/v1/admin/')).map(l=>l.auth))],rpcKey:[...new Set(l7.filter(l=>l.p==='/rest/v1/rpc/is_admin').map(l=>l.apikey))]};
  console.log('6) nouvelles clés seulement :',JSON.stringify(o));
  C.c6=r7.st===200&&r7.j.ok===true&&o.adminAuth.join()===SEC&&o.rpcKey.join()===PUB;
}catch(e){console.log('ERREUR',e&&e.stack||e);C.err=false;}
finally{try{fn1&&fn1.kill('SIGKILL');}catch(e){}try{fn2&&fn2.kill('SIGKILL');}catch(e){}srv.close();try{fs.rmSync(tmp,{recursive:true,force:true});}catch(e){}}
const bad=Object.entries(C).filter(([k,v])=>!v).map(([k])=>k);if(bad.length)console.log('journal de la fonction :',FNLOG.join('').slice(-1500));console.log(bad.length?'RESULTAT: ECHEC '+bad.join(','):'RESULTAT: TOUT VERT');process.exit(0);
