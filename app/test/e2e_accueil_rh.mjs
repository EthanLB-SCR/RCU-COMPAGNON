// ACCUEIL RH (nuit du 13 au 14/10/2026) — documents d'accueil à lire et signer, livrets, passeport de prévention. Supabase SIMULÉ (registre en mémoire), pack FICTIF :
// 2 documents bloquants (une note en texte avec un choix + « Fait à », un livret PDF à 2 chapitres), 1 charte à J+7, 1 fiche « PDF à joindre ».
// (1) l'administrateur importe le pack, joint les PDF (rapprochement par nom), réimporte sans doublon ; rien ne le bloque ;
// (2) un intérimaire fictif, compte créé après la mise en ligne, 1re connexion sur téléphone (390 px) : AUCUN écran bloquant (règle du 19/10, lot QF), carte de bienvenue
//     non bloquante « 4 documents … sous 7 jours », depuis « À faire » : lecture forcée, choix, champ, signature au doigt ; livret chapitre par chapitre ; « À faire » avec le délai,
//     Moi → Documents (livrets, signés), Moi → Passeport (habilitation à renouveler sous 90 j, manquantes pour le poste) ; pas de débordement horizontal ;
// (3) l'administrateur voit qui a signé (et le choix) ; nouvelle version → nouvelle signature, toujours sans écran bloquant.
// 19/10 (lot QF) : adaptée — l'écran bloquant « avant de commencer » n'existe plus (Ethan : « pas obligatoire à la connexion, sinon dès que je veux montrer je suis bloqué »).
import { chromium } from 'playwright';
import { makePdf } from './mkpdf.mjs';
const BASE=process.env.BASE||'http://localhost:8765';
const SB='https://pghftlepduvfazbiavhq.supabase.co';
const b64u=o=>Buffer.from(JSON.stringify(o)).toString('base64').replace(/=+$/,'').replace(/\+/g,'-').replace(/\//g,'_');
const ADM={id:'aaaaaaaa-1111-4111-8111-111111111111',email:'alice.admintest@exemple.fr',name:'Alice ADMINTEST',prenom:'Alice',nom:'ADMINTEST',role:'chef',active:true,poste:'resp_exploitation',admin:true,type:'salarie',rights:{},sites:null,created_at:'2026-10-01T08:00:00Z'};
const INT={id:'bbbbbbbb-2222-4222-8222-222222222222',email:'bruno.essai@exemple.fr',name:'Bruno ESSAI',prenom:'Bruno',nom:'ESSAI',role:'soudeur',active:true,poste:'manchonneur',admin:false,type:'interim',rights:{},sites:null,created_at:'2026-10-14T09:30:00Z'}; /* compte créé APRÈS la mise en ligne (import à 08 h) */
let CUR=ADM;
const user=()=>({id:CUR.id,aud:'authenticated',role:'authenticated',email:CUR.email,email_confirmed_at:'2026-10-01T09:00:00Z',app_metadata:{provider:'email'},user_metadata:{},identities:[],created_at:CUR.created_at,updated_at:new Date().toISOString()});
const session=()=>{const t=Math.floor(Date.now()/1000);return {access_token:b64u({alg:'HS256',typ:'JWT'})+'.'+b64u({iss:SB+'/auth/v1',sub:CUR.id,aud:'authenticated',exp:t+3600,iat:t,email:CUR.email,role:'authenticated'})+'.sig',token_type:'bearer',expires_in:3600,expires_at:t+3600,refresh_token:'rt-'+t,user:user()};};
const PEOPLE=[{key:INT.email,data:{habs:[{type:'aipr',num:'AIPR-TEST-1',fin:'2026-11-28'}]},updated_at:'2026-10-14T07:00:00Z'}]; /* AIPR : expire dans 45 jours */
const REG={};const RPC=[];const UP={};
const longTxt=(t,n)=>Array.from({length:n},(_,i)=>`${t} — paragraphe ${i+1}. Texte fictif de test, sans rapport avec un vrai document : il sert seulement à vérifier que la lecture va jusqu'en bas avant de pouvoir signer.`).join('\n\n');
const pack=ver=>({accueil:{
  documents:[
    {id:'note_test',fichier:'Note test.pdf',titre:'Note d’information (test)',version:ver,type:'information',pour:{tous:true},quand:'creation_compte',bloquant:true,echeanceJours:{embauche:0,interim:0},choix:['J’accepte','Je refuse'],champs:[{id:'fait_a',label:'Fait à',type:'texte',requis:true,prerempli:'ville du chantier du jour'}],mention:'Je déclare avoir lu cette note de test.',texte:'textes/note_test.txt',lectureMin:3},
    {id:'livret_test',fichier:'Livret test.pdf',titre:'Livret d’accueil (test)',version:'v1',type:'livret',pour:{interim:true},quand:'creation_compte',bloquant:true,echeanceJours:{interim:0},choix:[],champs:[],mention:'Je reconnais avoir pris connaissance du livret de test.',texte:null,livret:'livret_test',pages:3,lectureMin:5},
    {id:'charte_test',fichier:'Charte test.pdf',titre:'Charte (test)',version:'v1',type:'lire_signer',pour:{tous:true},quand:'arrivee',bloquant:false,echeanceJours:{embauche:7,interim:7},choix:[],champs:[],mention:null,texte:'textes/charte_test.txt'},
    {id:'fiche_test',fichier:'Fiche test.docx',titre:'Fiche de poste (test)',version:'v1',type:'lire_signer',pour:{postes:['chef']},quand:'arrivee',bloquant:false,echeanceJours:{embauche:7},texte:null}],
  livrets:{livrets:[{id:'livret_test',titre:'Livret d’accueil (test)',chapitres:[{numero:'1',titre:'Présentation (test)',pages:[1,1],resume:'Résumé fictif du chapitre 1.'},{numero:'2',titre:'Sécurité (test)',pages:[2,3]}]}]},
  passeport:[{id:'aipr_operateur',label:'AIPR opérateur (test)',categorie:'autorisation',validiteAns:5,obligatoirePour:['manchonneur'],aConfirmerPour:[]},{id:'formation_inconnue',label:'Formation inconnue (test)',validiteAns:null,obligatoirePour:[]}],
  textes:{'note_test.txt':'NOTE DE TEST\n\nJe soussigné(e) [[À COMPLÉTER : nom et prénom du salarié]], en qualité de [[À COMPLÉTER : poste]].\n\n'+longTxt('Note',40),'charte_test.txt':'CHARTE DE TEST\n\n'+longTxt('Charte',12)}}});
const PDF_LIVRET=makePdf([1,2,3].map(i=>[[60,780,22,'Livret de test - page '+i],[60,740,11,'Contenu fictif.']]));
const PDF_AUTRE=makePdf([[[60,780,22,'Fichier sans document']]]);
const CORS={'access-control-allow-origin':'*','access-control-allow-headers':'*','access-control-allow-methods':'GET, POST, PUT, PATCH, DELETE, OPTIONS'};
const browser=await chromium.launch({headless:true, executablePath: process.env.CHROMIUM_PATH||undefined});
const logs=[];
async function mkCtx(who,vp,time){CUR=who;const ctx=await browser.newContext({viewport:vp});
  await ctx.route(u=>!/^(127\.0\.0\.1|localhost)$/.test(u.hostname)&&!u.href.startsWith(SB),route=>route.fulfill({status:200,contentType:'application/json',headers:CORS,body:'{}'})); /* rien ne sort (météo, géocodage…) */
  await ctx.route(u=>u.href.startsWith(SB),async route=>{const req=route.request();const u=new URL(req.url());const p=u.pathname;const acc=req.headers()['accept']||'';const json=(o,status=200)=>route.fulfill({status,contentType:'application/json',headers:CORS,body:JSON.stringify(o)});
    if(req.method()==='OPTIONS')return route.fulfill({status:200,headers:CORS,body:''});let b={};try{b=JSON.parse(req.postData()||'{}');}catch(e){}
    if(p==='/auth/v1/token')return json(session());if(p==='/auth/v1/user')return json(user());if(p.startsWith('/auth/v1/'))return json({});
    if(p==='/rest/v1/profiles'){const rows=[ADM,INT];const m=/id=eq\.([^&]+)/.exec(u.search);const r=m?rows.filter(x=>x.id===decodeURIComponent(m[1])):rows;return json(/object/.test(acc)?(r[0]||null):r);}
    if(p==='/rest/v1/registre'){const m=/kind=in\.\(([^)]+)\)/.exec(decodeURIComponent(u.search));const kinds=m?m[1].replace(/"/g,'').split(','):null;return json(Object.values(REG).filter(r=>!kinds||kinds.includes(r.kind)));}
    if(p==='/rest/v1/rpc/registre_set'){RPC.push(b.p_kind+' '+b.p_id);const k=b.p_kind+'|'+b.p_id;const old=(REG[k]||{}).data||{};const data=b.p_mode==='replace'?Object.assign({},b.p_patch):Object.assign({},old,b.p_patch||{});Object.keys(b.p_patch||{}).forEach(x=>{if(b.p_patch[x]===null)delete data[x];});REG[k]={kind:b.p_kind,id:b.p_id,data,updated_at:new Date().toISOString()};return json(REG[k]);}
    if(p==='/rest/v1/people')return json(PEOPLE);
    if(p.startsWith('/storage/v1/object/sign/')){const path=p.slice('/storage/v1/object/sign/'.length);if(req.method()==='POST')return json({signedURL:'/object/sign/'+path+'?token=t0k'});const buf=UP[path];return buf?route.fulfill({status:200,contentType:'application/pdf',headers:CORS,body:buf}):route.fulfill({status:404,headers:CORS,body:''});}
    if(p.startsWith('/storage/v1/object/')){const path=p.slice('/storage/v1/object/'.length);UP[path]=req.postDataBuffer()||Buffer.alloc(0);return json({Key:path,Id:'x'});}
    if(p.startsWith('/rest/v1/rpc/'))return json(null);
    if(p.startsWith('/rest/v1/'))return json(/object/.test(acc)?null:[]);
    return json([]);});
  const page=await ctx.newPage();page.on('dialog',d=>d.accept().catch(()=>{}));
  page.on('pageerror',e=>logs.push('PAGEERROR ('+who.prenom+') : '+e.message.slice(0,300)+' @ '+String(e.stack||'').split('\n').slice(1,4).join(' | ').slice(0,400)));page.on('console',m=>{if(m.type()==='error'&&!/realtime|websocket|Failed to fetch|net::ERR|404|400|ERR_/i.test(m.text()))logs.push(who.prenom+': '+m.text().slice(0,200));});
  await page.clock.install({time:new Date(time)});
  await page.goto(BASE+'/index.html?pdfjs=/pdfjs/');await page.waitForTimeout(500);await page.evaluate(()=>{localStorage.clear();});await page.evaluate(()=>new Promise(r=>{try{const q=indexedDB.deleteDatabase('trace-kv');q.onsuccess=q.onerror=q.onblocked=()=>r();}catch(e){r();}}));
  await page.reload();await page.waitForTimeout(900);await page.fill('#loginEmail',who.email);await page.fill('#loginPwd','Test-2026!');await page.click('#loginGo');await page.waitForTimeout(3000);
  return {ctx,page};}
const draw=async(page,id)=>{await page.evaluate(id2=>{const cv=document.getElementById(id2);const r=cv.getBoundingClientRect();const ev=(t,x,y)=>cv.dispatchEvent(new PointerEvent(t,{bubbles:true,clientX:r.left+x,clientY:r.top+y,pointerId:1,pointerType:'touch'}));ev('pointerdown',20,40);ev('pointermove',80,60);ev('pointermove',140,30);ev('pointerup',140,30);},id);};
const pick=async(page,what,files)=>{const box0=await page.evaluate(()=>(document.querySelector('#eq-app .okbox')||{}).textContent||'');
  let ok=false;for(let k=0;k<4&&!ok;k++){await page.evaluate(w=>{const b=document.querySelector('#eq-app [data-v="acc|pick|'+w+'"]');if(b)b.click();},what);ok=await page.waitForSelector('body > input[type=file]',{state:'attached',timeout:2500}).then(()=>true).catch(()=>false);if(!ok)console.log('pick : nouvel essai',what,await toast(page));}
  await page.setInputFiles('body > input[type=file]',files); /* le bouton crée le champ hors de l'écran ; on lui donne les fichiers */
  await page.waitForFunction(b0=>{const b=document.querySelector('#eq-app .okbox');return b&&b.textContent!==b0;},box0,{timeout:20000}).catch(()=>console.log('pick : pas de compte rendu',what));}; /* attend le compte rendu (import / PDF) */ /* le sélecteur de fichiers de l'appli (champ créé hors de l'écran) */
const toast=page=>page.evaluate(()=>(document.getElementById('toast')||{}).textContent||'');
const noOverflow=page=>page.evaluate(()=>document.documentElement.scrollWidth<=window.innerWidth+1);
const scrollEnd=(page,id)=>page.evaluate(id2=>{const b=document.getElementById(id2);b.scrollTop=b.scrollHeight;b.dispatchEvent(new Event('scroll'));},id);
const flushed=async page=>{await page.waitForFunction(()=>window.TRACE&&window.TRACE.reg.pending().length===0,null,{timeout:20000}).catch(()=>{});};
const clickTodo=async(page,src)=>{await page.evaluate(()=>document.getElementById('htHome').click());const ok=await page.waitForFunction(r=>[...document.querySelectorAll('#eq-app .ac-notif')].some(x=>new RegExp(r).test(x.textContent)),src,{timeout:8000}).then(()=>true).catch(()=>false);
  if(!ok)console.log('notification « À faire » absente :',await page.evaluate(()=>document.getElementById('homeBody').textContent.replace(/\s+/g,' ').slice(0,300)));await page.evaluate(r=>[...document.querySelectorAll('#eq-app .ac-notif')].find(x=>new RegExp(r).test(x.textContent)).click(),src);}; /* 19/10 (QF) : plus d'écran bloquant — le document s'ouvre depuis « À faire » */
const C={};
// ── 1) administrateur : Entreprise → Accueil RH → import du pack (fichier JSON) → 4 documents + réglages ; PDF joints par nom ; réimport sans doublon ; pas bloqué
let {ctx,page}=await mkCtx(ADM,{width:1100,height:900},'2026-10-14T08:00:00Z');
const goAccRh=async()=>{await page.evaluate(async()=>{document.getElementById('htEnt').click();await new Promise(r=>setTimeout(r,250));const bk=document.querySelector('#eq-app .ac-back');if(bk){bk.click();await new Promise(r=>setTimeout(r,200));}const row=[...document.querySelectorAll('#eq-app .ac-row')].find(x=>/Accueil RH/.test(x.textContent));if(row)row.click();});await page.waitForTimeout(400);};
await goAccRh();
let out={h2:await page.evaluate(()=>(document.querySelector('#eq-app h2.vt')||{}).textContent||''),gate:await page.evaluate(()=>!!document.querySelector('.acc-gate'))};
await pick(page,'pack',{name:'pack_test.json',mimeType:'application/json',buffer:Buffer.from(JSON.stringify(pack('v1')))});await page.waitForTimeout(1800);
out.imp=await page.evaluate(()=>{const t=document.getElementById('eq-app').textContent.replace(/\s+/g,' ');const T=window.TRACE;const d=T.reg.all('doc').filter(x=>/^acc_(?!_)/.test(x.id));return {ok:/4 documents : 4 nouveaux/.test(t),wait:/2 PDF à joindre/.test(t),pass:/passeport : 2 formations/.test(t),ids:d.map(x=>x.id).sort(),rows:[...document.querySelectorAll('#eq-app .acc-drow .ac-row .tx > b')].map(b=>b.textContent),
  note:(d.find(x=>x.id==='acc_note_test')||{}),liv:(d.find(x=>x.id==='acc_livret_test')||{})};});
out.impNote={req:out.imp.note.req,bloq:out.imp.note.acc&&out.imp.note.acc.bloquant,choix:out.imp.note.acc&&out.imp.note.acc.choix,champs:out.imp.note.acc&&out.imp.note.acc.champs.map(f=>f.id),html:/<h3>NOTE DE TEST<\/h3>/.test(out.imp.note.html||'')&&/data-ph="nom"/.test(out.imp.note.html||''),kind:out.imp.note.kind};
out.impLiv={req:out.imp.liv.req,chap:out.imp.liv.acc&&out.imp.liv.acc.chap.map(c=>c.p.join('-')),pending:out.imp.liv.pending,kind:out.imp.liv.kind,due:out.imp.liv.acc&&out.imp.liv.acc.due};delete out.imp.note;delete out.imp.liv;
// PDF : le livret (même nom, autre casse / extension) + un fichier sans document
await pick(page,'pdfs',[{name:'LIVRET TEST.pdf',mimeType:'application/pdf',buffer:PDF_LIVRET},{name:'Inconnu.pdf',mimeType:'application/pdf',buffer:PDF_AUTRE}]);await page.waitForTimeout(2500);
await flushed(page);out.pdf=await page.evaluate(()=>{const t=document.getElementById('eq-app').textContent.replace(/\s+/g,' ');const d=window.TRACE.reg.get('doc','acc_livret_test')||{};return {ok:/1 joint/.test(t),sans:/Sans document correspondant.*Inconnu\.pdf/.test(t),url:/\/storage\/v1\/object\/sign\//.test(d.url||''),pending:!!d.pending,on:!!(d.acc&&d.acc.on)};});
out.up=Object.keys(UP).length;
// réimport du même pack : aucun doublon, rien de changé
await pick(page,'pack',{name:'pack_test.json',mimeType:'application/json',buffer:Buffer.from(JSON.stringify(pack('v1')))});await page.waitForTimeout(1500);
out.re=await page.evaluate(()=>{const t=document.getElementById('eq-app').textContent.replace(/\s+/g,' ');return {box:(document.querySelector('#eq-app .okbox')||{}).textContent,same:/0 nouveau, 0 mis à jour, 4 inchangés/.test(t),n:window.TRACE.reg.all('doc').filter(x=>/^acc_(?!_)/.test(x.id)).length,livPdf:!!(window.TRACE.reg.get('doc','acc_livret_test')||{}).url};});
// rien ne bloque l'administrateur (19/10, lot QF : plus d'écran bloquant, plus d'aperçu ni de réglage « tout le monde ») ; la vue Accueil RH explique la carte de bienvenue
out.adm=await page.evaluate(async()=>{const r={};document.getElementById('htHome').click();await new Promise(x=>setTimeout(x,300));r.gate0=!!document.querySelector('.acc-gate');r.tabs=getComputedStyle(document.getElementById('homeTabs')).display!=='none';return r;});
await goAccRh();Object.assign(out.adm,await page.evaluate(()=>{const t=document.getElementById('eq-app').textContent.replace(/\s+/g,' ');return {noPreview:![...document.querySelectorAll('#eq-app [data-act=x]')].some(b=>/aperçu|Tout le monde/.test(b.textContent)),carte:/Carte de bienvenue/.test(t),label:/à signer dès l'arrivée \(sous 7 jours\)/.test(t)&&!/bloquant à l'arrivée/.test(t)};}));
await flushed(page);out.srv=Object.keys(REG).filter(k=>/^doc\|acc_/.test(k)).sort();
console.log('1) administrateur : import, PDF, réimport, aperçu :',JSON.stringify(out));
C.c1=/Accueil RH/.test(out.h2)&&!out.gate&&out.imp.ok&&out.imp.wait&&out.imp.pass&&out.imp.ids.join()==='acc_charte_test,acc_fiche_test,acc_livret_test,acc_note_test'&&out.imp.rows.length===4
  &&out.impNote.req.all===true&&out.impNote.bloq&&out.impNote.choix.length===2&&out.impNote.champs.join()==='fait_a'&&out.impNote.html&&out.impNote.kind==='note'
  &&JSON.stringify(out.impLiv.req)==='{"types":["interim"]}'&&out.impLiv.chap.join()==='1-1,2-3'&&out.impLiv.pending===true&&out.impLiv.kind==='livret'&&out.impLiv.due.interim===0
  &&out.srv.length===5&&out.pdf.ok&&out.pdf.sans&&out.pdf.url&&!out.pdf.pending&&out.pdf.on&&out.up===1&&out.re.same&&out.re.n===4&&out.re.livPdf
  &&!out.adm.gate0&&out.adm.tabs&&out.adm.noPreview&&out.adm.carte&&out.adm.label;
await ctx.close();
// ── 2) intérimaire fictif, 1re connexion, téléphone 390 px : AUCUN écran bloquant, carte de bienvenue ; depuis « À faire » : lecture forcée → choix → champ → signature ; livret par chapitres
({ctx,page}=await mkCtx(INT,{width:390,height:844},'2026-10-14T10:00:00Z'));
await page.waitForTimeout(500);
out={gate:await page.evaluate(()=>!!document.querySelector('.acc-gate')),tabs:await page.evaluate(()=>getComputedStyle(document.getElementById('homeTabs')).display!=='none'),welcome:await page.evaluate(()=>{const w=document.querySelector('.acc-welcome');return w?w.textContent.replace(/\s+/g,' ').trim():null;}),ov0:await noOverflow(page)};
out.todo=await page.evaluate(()=>[...document.querySelectorAll('#eq-app .ac-notif')].map(n=>n.textContent.replace(/\s+/g,' ').trim()).filter(t=>/À lire et signer/.test(t)));
// document 1 : la note (texte) — « J'ai lu » bloqué tant que pas en bas ; puis choix + « Fait à » + signature obligatoires
await clickTodo(page,'Note d.information');await page.waitForTimeout(500);
if(!(await page.evaluate(()=>!!document.getElementById('dr-read'))))console.log('PAS DE LECTURE',JSON.stringify(logs),await page.evaluate(()=>document.getElementById('modal').className+' '+document.getElementById('modal').textContent.slice(0,300)));
out.n1=await page.evaluate(()=>{const b=document.getElementById('dr-read');const body=document.getElementById('dr-body');return {dis:b.disabled,txt:b.textContent,name:/Bruno ESSAI/.test(body.textContent),poste:/Manchonneur/.test(body.textContent),scroll:body.scrollHeight>body.clientHeight+50};});
out.ov1=await noOverflow(page);
await page.evaluate(()=>{const b=document.getElementById('dr-body');b.scrollTop=b.scrollHeight/3;b.dispatchEvent(new Event('scroll'));});await page.waitForTimeout(100);out.n1.mid=await page.evaluate(()=>document.getElementById('dr-read').disabled);
await scrollEnd(page,'dr-body');await page.waitForTimeout(150);out.n1.end=await page.evaluate(()=>!document.getElementById('dr-read').disabled);
await page.evaluate(()=>document.getElementById('dr-read').click());await page.waitForTimeout(200);
out.n1.step2=await page.evaluate(()=>({radios:document.querySelectorAll('#modal input[name=dr-choix]').length,champ:!!document.querySelector('#modal input[data-champ="0"]'),mention:/Je déclare avoir lu cette note de test/.test(document.getElementById('dr-step2').textContent)}));
await page.evaluate(()=>document.getElementById('dr-ok').click());await page.waitForTimeout(150);out.n1.t1=await toast(page);
await page.evaluate(()=>{const r=document.querySelector('#modal input[name=dr-choix][value="0"]');r.checked=true;document.getElementById('dr-ok').click();});await page.waitForTimeout(150);out.n1.t2=await toast(page);
out.n1.t3=out.n1.t2; /* 21/10 (Ethan) : plus de « Fait à » (dématérialisé) — le champ du pack n'est ni affiché ni demandé : après le choix, la signature */
out.ov2=await noOverflow(page);
await draw(page,'dr-pad');await page.evaluate(()=>document.getElementById('dr-ok').click());await page.waitForTimeout(700);
out.n1.after=await page.evaluate(()=>{const w=document.querySelector('.acc-welcome');return {gate:!!document.querySelector('.acc-gate'),welcome:w?w.textContent.replace(/\s+/g,' '):'',modal:document.getElementById('modal').classList.contains('show')};});
// document 2 : le livret (PDF) — chapitre par chapitre, « J'ai lu ce chapitre » en bas ; tous lus → signature
await clickTodo(page,'Livret');await page.waitForTimeout(500);
out.l={chaps:await page.evaluate(()=>[...document.querySelectorAll('#modal [data-chap]')].map(b=>b.querySelector('.tx b').textContent)),read0:await page.evaluate(()=>({dis:document.getElementById('dr-read').disabled,txt:document.getElementById('dr-read').textContent}))};
for(const i of [0,1]){await page.evaluate(i2=>document.querySelector('#modal [data-chap="'+i2+'"]').click(),i);await page.waitForFunction(()=>document.querySelectorAll('#dr-body canvas').length>0&&/Fin du chapitre/.test(document.getElementById('dr-body').textContent),null,{timeout:15000}).catch(()=>{});
  const st=await page.evaluate(()=>({canvas:document.querySelectorAll('#dr-body canvas').length,pages:[...document.querySelectorAll('#dr-body .hint')].map(x=>x.textContent).join('|'),dis:document.getElementById('dr-chapok').disabled}));
  await scrollEnd(page,'dr-body');await page.waitForTimeout(200);st.after=await page.evaluate(()=>!document.getElementById('dr-chapok').disabled);out['ch'+i]=st;out['ovc'+i]=await noOverflow(page);
  await page.evaluate(()=>document.getElementById('dr-chapok').click());await page.waitForTimeout(200);}
out.l.read1=await page.evaluate(()=>({dis:document.getElementById('dr-read').disabled,txt:document.getElementById('dr-read').textContent,ticks:[...document.querySelectorAll('#modal [data-chapic]')].map(x=>x.textContent).join('')}));
await page.evaluate(()=>document.getElementById('dr-read').click());await page.waitForTimeout(200);out.l.mention=await page.evaluate(()=>/livret de test/.test(document.getElementById('dr-step2').textContent));
await draw(page,'dr-pad');await page.evaluate(()=>document.getElementById('dr-ok').click());await page.waitForTimeout(900);
out.free=await page.evaluate(()=>({gate:!!document.querySelector('.acc-gate'),tabs:getComputedStyle(document.getElementById('homeTabs')).display!=='none',notifs:[...document.querySelectorAll('#eq-app .ac-notif')].map(n=>n.textContent.replace(/\s+/g,' ').trim()).filter(t=>/Charte|test/.test(t))}));
out.ov3=await noOverflow(page);
await flushed(page);
const sigN=REG['docsig|acc_note_test|'+INT.email],sigL=REG['docsig|acc_livret_test|'+INT.email];
out.sig={note:sigN&&{choix:sigN.data.choix,fait:sigN.data.champs&&sigN.data.champs.fait_a,ver:sigN.data.ver,img:!!sigN.data.img,read:!!sigN.data.readAt},liv:sigL&&{chap:sigL.data.chap,img:!!sigL.data.img,ver:sigL.data.ver}};
console.log('2) intérimaire : écran bloquant, lecture, signature :',JSON.stringify(out));
C.c2=!out.gate&&out.tabs&&!!out.welcome&&/Bienvenue chez SCR, Bruno/.test(out.welcome)&&/4 documents à lire et à signer sous 7 jours — le premier avant le 21\/10/.test(out.welcome)&&out.todo.length===4&&out.todo.every(t=>/à signer avant le 21\/10\/2026 \(dans 7 j\)/.test(t))&&out.ov0
  &&out.n1.dis&&out.n1.name&&out.n1.poste&&out.n1.scroll&&out.n1.mid&&out.n1.end&&out.n1.step2.radios===2&&!out.n1.step2.champ&&out.n1.step2.mention&&/Fais ton choix/.test(out.n1.t1)&&/signature/.test(out.n1.t2) /* 21/10 : plus de « Fait à » */&&out.ov1&&out.ov2
  &&!out.n1.after.gate&&/3 documents à lire et à signer/.test(out.n1.after.welcome)&&!out.n1.after.modal
  &&out.l.chaps.length===2&&out.l.read0.dis&&/0 \/ 2/.test(out.l.read0.txt)&&out.ch0.canvas===1&&out.ch0.after /* une seule page : elle peut tenir à l'écran (le bouton se débloque alors tout de suite, comme ailleurs) */&&out.ch1.canvas===2&&/page 2 \/ 3\|page 3 \/ 3/.test(out.ch1.pages)&&out.ch1.after&&out.ovc0&&out.ovc1
  &&!out.l.read1.dis&&out.l.read1.ticks==='✓✓'&&out.l.mention&&!out.free.gate&&out.free.tabs&&out.free.notifs.some(t=>/Charte \(test\).*à signer avant le 21\/10\/2026 \(dans 7 j\)/.test(t))&&out.ov3
  &&out.sig.note&&out.sig.note.choix==='J’accepte'&&out.sig.note.fait===undefined /* 21/10 : plus de « Fait à » */&&out.sig.note.ver==='v1'&&out.sig.note.img&&out.sig.note.read&&out.sig.liv&&out.sig.liv.chap===2&&out.sig.liv.img;
// ── 3) Moi → Documents : « Mes livrets » (consultable par chapitre) + signés (choix) ; Moi → Passeport : à renouveler sous 90 j, manquantes pour le poste
await page.evaluate(()=>document.getElementById('htEspace').click());await page.waitForTimeout(300);
await page.evaluate(()=>[...document.querySelectorAll('#eq-app .eq-subs .chip')].find(x=>/Documents/.test(x.textContent)).click());await page.waitForTimeout(300);
out={docs:await page.evaluate(()=>{const app=document.getElementById('eq-app');const t=app.textContent.replace(/\s+/g,' ');return {livrets:/Mes livrets/.test(t),livRow:[...app.querySelectorAll('.ac-row')].some(r=>/Livret d.accueil \(test\)/.test(r.textContent)&&/2 chapitres/.test(r.textContent)&&/signé le/.test(r.textContent)),choix:/choix : J’accepte/.test(t),todo:/Charte \(test\).*à signer avant le 21\/10\/2026/.test(t)};}),ov:await noOverflow(page)};
await page.evaluate(()=>[...document.querySelectorAll('#eq-app .ac-row')].find(r=>/Livret d.accueil \(test\)/.test(r.textContent)).click());await page.waitForTimeout(400);
out.relire=await page.evaluate(()=>({chaps:document.querySelectorAll('#modal [data-chap]').length,signed:/Signé par/.test(document.getElementById('modal').textContent),noRead:!document.getElementById('dr-read')}));
await page.evaluate(()=>document.querySelector('#modal [data-chap="1"]').click());await page.waitForFunction(()=>document.querySelectorAll('#dr-body canvas').length===2,null,{timeout:15000}).catch(()=>{});out.relire.canvas=await page.evaluate(()=>document.querySelectorAll('#dr-body canvas').length);
await page.evaluate(()=>document.querySelector('#modal [data-close]').click());await page.waitForTimeout(200);
await page.evaluate(()=>[...document.querySelectorAll('#eq-app .eq-subs .chip')].find(x=>/Passeport/.test(x.textContent)).click());await page.waitForTimeout(300);
out.pass=await page.evaluate(()=>{const app=document.getElementById('eq-app');const t=app.textContent.replace(/\s+/g,' ');const rows=[...app.querySelectorAll('.eq-row')].map(r=>r.textContent.replace(/\s+/g,' ').trim());return {h2:(app.querySelector('h2.vt')||{}).textContent,aipr:rows.find(r=>/AIPR opérateur/.test(r))||'',manq:rows.filter(r=>/Manquant pour ton poste/.test(r)).length,diiso:rows.some(r=>/Diisocyanates/.test(r)),kpi:/1 à renouveler \(90 j\)/.test(t)};});
out.ovp=await noOverflow(page);
console.log('3) Moi → Documents, Passeport :',JSON.stringify(out));
C.c3=out.docs.livrets&&out.docs.livRow&&out.docs.choix&&out.docs.todo&&out.ov&&out.relire.chaps===2&&out.relire.signed&&out.relire.noRead&&out.relire.canvas===2
  &&/Mon passeport prévention/.test(out.pass.h2)&&/À renouveler · 45 j/.test(out.pass.aipr)&&/AIPR-TEST-1/.test(out.pass.aipr)&&out.pass.manq===6&&out.pass.diiso&&out.pass.kpi&&out.ovp;
await ctx.close();
// ── 4) l'administrateur voit qui a signé (et le choix) ; nouvelle version → nouvelle signature, sans écran bloquant pour quelqu'un déjà là
({ctx,page}=await mkCtx(ADM,{width:1100,height:900},'2026-10-14T11:00:00Z'));
await page.evaluate(async()=>{document.getElementById('htEnt').click();await new Promise(r=>setTimeout(r,250));const bk=document.querySelector('#eq-app .ac-back');if(bk){bk.click();await new Promise(r=>setTimeout(r,200));}[...document.querySelectorAll('#eq-app .ac-row')].find(x=>/Documents d.entreprise/.test(x.textContent)).click();});await page.waitForTimeout(400);
out={list:await page.evaluate(()=>[...document.querySelectorAll('#eq-app .ac-row')].map(r=>r.textContent.replace(/\s+/g,' ').trim()).filter(t=>/\(test\)/.test(t)))};
await page.evaluate(()=>[...document.querySelectorAll('#eq-app .ac-row')].find(r=>/Note d.information \(test\)/.test(r.textContent)).click());await page.waitForTimeout(400);
out.who=await page.evaluate(()=>document.getElementById('modal').textContent.replace(/\s+/g,' '));
await page.evaluate(()=>document.querySelector('#modal [data-close]').click());await page.waitForTimeout(200);
await goAccRh();
await pick(page,'pack',{name:'pack_test.json',mimeType:'application/json',buffer:Buffer.from(JSON.stringify(pack('v2')))});await page.waitForTimeout(1800);
out.v2=await page.evaluate(acc=>{const T=window.TRACE;const t=document.getElementById('eq-app').textContent.replace(/\s+/g,' ');const d=T.reg.get('doc','acc_note_test');const todo=T.docs.todo(acc).map(x=>x.id);return {msg:/1 nouvelle version/.test(t),ver:d.version,n:T.reg.all('doc').filter(x=>/^acc_(?!_)/.test(x.id)).length,todo};},{email:INT.email,type:'interim',poste:'manchonneur',created_at:INT.created_at,name:INT.name});
await flushed(page);
console.log('4) qui a signé, nouvelle version :',JSON.stringify({list:out.list,who:out.who.slice(0,400),v2:out.v2}));
C.c4=out.list.some(t=>/Note d.information \(test\).*1 \/ 2 signé/.test(t))&&out.list.some(t=>/Livret d.accueil \(test\).*1 \/ 1 signé/.test(t))&&out.list.some(t=>/Fiche de poste \(test\).*PDF à joindre/.test(t))
  &&/Bruno ESSAI/.test(out.who)&&/✓/.test(out.who)&&/J’accepte/.test(out.who)&&/Alice ADMINTEST/.test(out.who)&&/à signer/.test(out.who)
  &&out.v2.msg&&out.v2.ver==='v2'&&out.v2.n===4&&out.v2.todo.includes('acc_note_test')&&out.v2.todo.includes('acc_charte_test')&&!out.v2.todo.includes('acc_livret_test');
await ctx.close();
({ctx,page}=await mkCtx(INT,{width:390,height:844},'2026-10-14T12:00:00Z'));
out={gate:await page.evaluate(()=>!!document.querySelector('.acc-gate')),notif:await page.evaluate(()=>[...document.querySelectorAll('#eq-app .ac-notif')].map(n=>n.textContent.replace(/\s+/g,' ').trim()).filter(t=>/Note d.information/.test(t))),ov:await noOverflow(page)};
await page.evaluate(()=>{const n=[...document.querySelectorAll('#eq-app .ac-notif')].find(x=>/Note d.information/.test(x.textContent));if(n)n.click();});await page.waitForTimeout(500);
out.modal=await page.evaluate(()=>(document.querySelector('#modal .warnbox')||{}).textContent||'');
console.log('5) nouvelle version, personne déjà là :',JSON.stringify(out));
C.c5=!out.gate&&out.notif.some(t=>/à signer avant le 21\/10\/2026 \(dans 7 j\)/.test(t))&&/Nouvelle version \(v2\).*version v1/.test(out.modal)&&out.ov;
await ctx.close();
console.log('erreurs console :',JSON.stringify(logs));C.console=logs.length===0;
const bad=Object.entries(C).filter(([k,v])=>!v).map(([k])=>k);console.log(bad.length?'RESULTAT: ECHEC '+bad.join(','):'RESULTAT: TOUT VERT');
await browser.close();
