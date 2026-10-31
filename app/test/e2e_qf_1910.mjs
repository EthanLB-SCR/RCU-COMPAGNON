// LOT QF (19/10/2026, retours d'Ethan de l'après-midi) — documents sans blocage, fin de l'accueil provisoire, notifications d'offres, « tuyauteur/Pelleur », fils dans les tubes.
// Données 100 % FICTIVES (comptes « exemple.fr », affaires O25xx / O26xx fictives, immatriculations fictives, « Villefictive »), serveur Supabase SIMULÉ (profils, registre,
// sites, soudures), tracé fait par le VRAI traceur. Horloge figée au lundi 19/10/2026.
// c0  administrateur : import du pack (« à signer dès l'arrivée (sous 7 jours) », plus de « bloquant »), Accueil RH sans réglage « tout le monde », AUCUN écran bloquant
//     même avec gateAll enregistré, carte de bienvenue non bloquante
// c1  nouveau compte (téléphone 390) : pas d'écran bloquant, onglets visibles, carte « Bienvenue chez SCR — 3 documents … sous 7 jours → Commencer », « À faire » : chaque
//     document avec son échéance, le plus urgent d'abord, « Commencer » ouvre le document, ✕ ferme la carte (revient à l'ouverture suivante), pas de débordement
// c2  rappel du hub (administrateur) : « N personnes ont des documents en retard » → fenêtre lecture seule ; la personne en retard : rouge « en retard de 2 j » (À faire, Documents)
// c3  accueil provisoire retiré : plus aucune ligne « Accueil nouvel arrivant » (nouveau compte, ancien compte, Documents d'entreprise) ; l'ancienne signature reste lisible
// c4  offres : affaire importée du reporting (dateReponse dépassée) → aucune alerte, tuile « historique importé » ; affaire créée dans l'appli → l'alerte ; une importée
//     redevient suivie après une date de réponse posée dans l'appli ET une tâche cochée
// c5  flotte : types lisibles (anciens libellés lus), « Tuyauteur / Pelleur (à préciser) » + choix en un clic, poste réel du conducteur et écart, clés du pack
// c6  fils : chantier venu du traceur (AXIOM) et chantier partagé → les deux couleurs présentes à 20 px/m (PC admin, téléphone soudeur), « Épuré » garde les fils,
//     légende et rappel 👁 cohérents
// c7  téléphone 390 px : aucun débordement sur les écrans parcourus ; c8 : zéro erreur console
import { chromium } from 'playwright';
import { mkdirSync } from 'node:fs';
const BASE=process.env.BASE||'http://localhost:8812';
const SHOTS=process.env.SHOTS||'/root/work/qf_shots';try{mkdirSync(SHOTS,{recursive:true});}catch(e){}
const SB='https://pghftlepduvfazbiavhq.supabase.co';
const NOW='2026-10-19T10:00:00Z';
const ADM={id:'aaaaaaaa-1111-4111-8111-111111111111',email:'camille.fictive@exemple.fr',name:'Camille FICTIVE',prenom:'Camille',nom:'FICTIVE',role:'chef',active:true,poste:'resp_exploitation',admin:true,type:'salarie',rights:{},sites:null,created_at:'2026-10-01T08:00:00Z'};
const NEW={id:'bbbbbbbb-2222-4222-8222-222222222222',email:'bruno.essai@exemple.fr',name:'Bruno ESSAI',prenom:'Bruno',nom:'ESSAI',role:'soudeur',active:true,poste:'manchonneur',admin:false,type:'interim',rights:{},sites:null,created_at:'2026-10-14T09:30:00Z'}; /* nouveau compte */
const CHEF={id:'cccccccc-3333-4333-8333-333333333333',email:'claude.fictif@exemple.fr',name:'Claude FICTIF',prenom:'Claude',nom:'FICTIF',role:'chef',active:true,poste:'chef',admin:false,type:'salarie',rights:{},sites:null,created_at:'2026-09-01T08:00:00Z'}; /* déjà là : règlement en retard */
const SOUD={id:'dddddddd-4444-4444-8444-444444444444',email:'dominique.fictif@exemple.fr',name:'Dominique FICTIF',prenom:'Dominique',nom:'FICTIF',role:'soudeur',active:true,poste:'soudeur',admin:false,type:'salarie',rights:{},sites:null,created_at:'2026-09-01T08:00:00Z'};
const PROFILES=[ADM,NEW,CHEF,SOUD];
const b64u=o=>Buffer.from(JSON.stringify(o)).toString('base64').replace(/=+$/,'').replace(/\+/g,'-').replace(/\//g,'_');
const userOf=P=>({id:P.id,aud:'authenticated',role:'authenticated',email:P.email,email_confirmed_at:'2026-10-01T09:00:00Z',app_metadata:{provider:'email'},user_metadata:{},identities:[],created_at:P.created_at,updated_at:new Date().toISOString()});
const sessionOf=P=>{const t=Math.floor(Date.now()/1000);return {access_token:b64u({alg:'HS256',typ:'JWT'})+'.'+b64u({iss:SB+'/auth/v1',sub:P.id,aud:'authenticated',exp:t+3600,iat:t,email:P.email,role:'authenticated'})+'.sig',token_type:'bearer',expires_in:3600,expires_at:t+3600,refresh_token:'rt-'+t,user:userOf(P)};};
/* ── serveur simulé : registre, sites, soudures ── */
const REG={},SITES={},WELDS={};const nowIso=()=>new Date().toISOString();
const regPut=(kind,id,data)=>{REG[kind+'|'+id]={kind,id,data:JSON.parse(JSON.stringify(data)),updated_at:nowIso()};};
const regRows=(kinds,since)=>Object.values(REG).filter(r=>(!kinds||kinds.includes(r.kind))&&(!since||r.updated_at>since));
const CORS={'access-control-allow-origin':'*','access-control-allow-headers':'*','access-control-allow-methods':'GET, POST, PUT, PATCH, DELETE, OPTIONS'};
const longTxt=(t,n)=>Array.from({length:n},(_,i)=>`${t} — paragraphe ${i+1}. Texte fictif de test, sans rapport avec un vrai document : il sert seulement à vérifier que la lecture va jusqu'en bas avant de pouvoir signer.`).join('\n\n');
const PACK={accueil:{documents:[
    {id:'note_test',fichier:'Note test.pdf',titre:'Note d’information (test)',version:'v1',type:'information',pour:{tous:true},quand:'creation_compte',bloquant:true,echeanceJours:{embauche:0,interim:0},choix:[],champs:[],mention:'Je déclare avoir lu cette note de test.',texte:'textes/note_test.txt',lectureMin:3},
    {id:'charte_test',fichier:'Charte test.pdf',titre:'Charte (test)',version:'v1',type:'lire_signer',pour:{tous:true},quand:'arrivee',bloquant:false,echeanceJours:{embauche:7,interim:7},choix:[],champs:[],mention:null,texte:'textes/charte_test.txt'}],
  livrets:{livrets:[]},passeport:[],textes:{'note_test.txt':'NOTE DE TEST\n\n'+longTxt('Note',30),'charte_test.txt':'CHARTE DE TEST\n\n'+longTxt('Charte',12)}}};
/* données de départ : réglage gateAll (compte ayant gardé l'ancien réglage), ancienne signature de l'accueil provisoire (chef), affaires, véhicules, correspondance du pack véhicule */
regPut('doc','acc__cfg',{cfg:true,active:false,kind:'autre',title:'Accueil RH — réglages',req:{none:true},gateAll:true});
regPut('docsig','accueil_entreprise|'+CHEF.email,{doc:'accueil_entreprise',ver:'v1 (provisoire)',key:CHEF.email,name:CHEF.name,at:'2026-10-11T08:00:00Z',answers:Array.from({length:10},(_,i)=>({q:'point '+(i+1),ok:true})),img:'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNkYPhfDwAChwGA60e6kgAAAABJRU5ErkJggg=='});
const A_IMP='O2509-71',A_IMP2='O2509-73',A_NEW='O2610-72';
regPut('affaire',A_IMP,{num:A_IMP,nom:'Ancien dossier fictif importé',client:'CLIENT FICTIF',ville:'Villefictive',etat:'devis',secteur:'ouest',dateReponse:'2026-10-05',by:'import',source:'Reporting Activité 2026 · fichier fictif',at:'2026-10-10T08:00:00Z'});
regPut('affaire',A_IMP2,{num:A_IMP2,nom:'Autre dossier fictif importé',client:'CLIENT FICTIF',ville:'Villefictive',etat:'preconsult',secteur:'ouest',dateReponse:'2026-10-21',by:'import',source:'Reporting Activité 2026 · fichier fictif',at:'2026-10-10T08:00:00Z'});
regPut('affaire',A_NEW,{num:A_NEW,nom:'Nouveau dossier fictif',client:'CLIENT FICTIF',ville:'Villefictive',etat:'devis',secteur:'ouest',dateReponse:'2026-10-16',by:'Camille FICTIVE',at:'2026-10-12T08:00:00Z'});
regPut('vehicule','AB-123-CD',{immat:'AB-123-CD',agence:'OUEST',n:'1',type:'tuyauteur/Pelleur',marque:'FOURGON','modele':'FICTIF',conducteur:SOUD.name,conducteurKey:SOUD.email,km:50000,at:'2026-10-10T08:00:00Z'});
regPut('vehicule','EF-456-GH',{immat:'EF-456-GH',agence:'OUEST',n:'2',type:'Manchon',marque:'FOURGON',modele:'FICTIF 2',conducteur:NEW.name,conducteurKey:NEW.email,km:20000,at:'2026-10-10T08:00:00Z'});
regPut('vehicule','IJ-789-KL',{immat:'IJ-789-KL',agence:'IDF',n:'3',type:'CDC',marque:'VOITURE',modele:'FICTIVE',conducteur:CHEF.name,conducteurKey:CHEF.email,km:80000,at:'2026-10-10T08:00:00Z'});
regPut('vehicule','MN-012-OP',{immat:'MN-012-OP',agence:'OUEST',n:'4',type:'tuyauteur/Pelleur',marque:'FOURGON',modele:'FICTIF 4',km:10000,at:'2026-10-10T08:00:00Z'});
regPut('vcfg','config',{schema:1,source:'test',at:'2026-10-10T08:00:00Z',by:'test',edl:{releves:[],controles:[],docs:[],equipement:[],photos:[],zones:[]},inventaire:{listes:{pelleur:[{id:'pel1',d:'Article fictif pelleur',q:'1'}]},titres:{pelleur:'Inventaire pelleur (test)'},commun:[]},types:{'tuyauteur/Pelleur':{charte:'service',inventaire:'pelleur'},Soudeur:{charte:'service',inventaire:null}},dispositifs:{liste:[],engagements:[],cles:false},chartes:{},archives:{},entretien:[]});
const browser=await chromium.launch({headless:true,executablePath:process.env.CHROMIUM_PATH||undefined});
const logs=[];const C={};
async function mkCtx(who,vp,mobile){const ctx=await browser.newContext(Object.assign({viewport:vp},mobile?{deviceScaleFactor:2,isMobile:true,hasTouch:true}:{}));
  await ctx.route(u=>!/^(127\.0\.0\.1|localhost)$/.test(u.hostname)&&!u.href.startsWith(SB),route=>route.fulfill({status:200,contentType:'application/json',headers:CORS,body:'{}'})); /* rien ne sort */
  await ctx.route(u=>u.href.startsWith(SB),async route=>{const req=route.request();const u=new URL(req.url());const p=u.pathname;const acc=req.headers()['accept']||'';const json=(o,status=200)=>route.fulfill({status,contentType:'application/json',headers:CORS,body:JSON.stringify(o)});
    if(req.method()==='OPTIONS')return route.fulfill({status:200,headers:CORS,body:''});let b={};try{b=JSON.parse(req.postData()||'{}');}catch(e){}
    if(p==='/auth/v1/token')return json(sessionOf(who));if(p==='/auth/v1/user')return json(userOf(who));if(p.startsWith('/auth/v1/'))return json({});
    if(p==='/rest/v1/profiles'){const m=/id=eq\.([^&]+)/.exec(u.search);const r=m?PROFILES.filter(x=>x.id===decodeURIComponent(m[1])):PROFILES;return json(/object/.test(acc)?(r[0]||null):r);}
    if(p==='/rest/v1/registre'){const m=/kind=in\.\(([^)]+)\)/.exec(decodeURIComponent(u.search));const kinds=m?m[1].replace(/"/g,'').split(','):null;const g=/updated_at=gt\.([^&]+)/.exec(u.search);return json(regRows(kinds,g?decodeURIComponent(g[1]):null));}
    if(p==='/rest/v1/rpc/registre_set'){const k=b.p_kind+'|'+b.p_id;const old=(REG[k]||{}).data||{};const data=b.p_mode==='replace'?Object.assign({},b.p_patch):Object.assign({},old,b.p_patch||{});Object.keys(b.p_patch||{}).forEach(x=>{if(b.p_patch[x]===null)delete data[x];});REG[k]={kind:b.p_kind,id:b.p_id,data,updated_at:nowIso()};return json(REG[k]);}
    if(p==='/rest/v1/rpc/site_set_part'){const row=SITES[b.p_site];if(!row)return json(null);row.data=Object.assign({},row.data,{[b.p_key]:b.p_value});row.updated_at=nowIso();return json({at:row.updated_at,value:b.p_value});}
    if(p.startsWith('/rest/v1/rpc/'))return json(null);
    if(p==='/rest/v1/sites'){const sel=u.searchParams.get('select')||'';const m=/id=eq\.([^&]+)/.exec(u.search);const id=m?decodeURIComponent(m[1]):null;
      if(req.method()==='POST'){const rows=Array.isArray(b)?b:[b];const prefer=req.headers()['prefer']||'';rows.forEach(r=>{if(SITES[r.id]&&/ignore-duplicates/.test(prefer))return;SITES[r.id]={id:r.id,name:r.name,supplier:r.supplier||null,serie:r.serie||null,data:r.data||{},updated_at:r.updated_at||nowIso()};});return json([]);}
      let rows=Object.values(SITES).filter(r=>!id||r.id===id);
      if(/sat:/.test(sel))rows=rows.map(r=>({id:r.id,name:r.name,supplier:r.supplier,updated_at:r.updated_at,geo:r.data.geo||null,origin:null,bgo:null,sat:r.data.traceur&&r.data.traceur.savedAt||null,w:r.data.w||null,h:r.data.h||null,bbox:null,nbox:null,nw:null,deleted:r.data.deleted||null,deletedAt:r.data.deletedAt||null,builtin:null,ville:(r.data.fiche||{}).ville||null,chef:(r.data.fiche||{}).chef||null,conducteur:(r.data.fiche||{}).conducteur||null,secteur:null,etude:(r.data.fiche||{}).etude||null}));
      return json(/object/.test(acc)?(rows[0]||null):rows);}
    if(p==='/rest/v1/welds'){if(req.method()==='POST'){(Array.isArray(b)?b:[b]).forEach(r=>{WELDS[r.site_id+'|'+r.weld_id]=r;});return json([]);}const m=/site_id=eq\.([^&]+)/.exec(u.search);const sid=m?decodeURIComponent(m[1]):null;return json(Object.values(WELDS).filter(r=>!sid||r.site_id===sid).map(r=>({weld_id:r.weld_id,line_id:r.line_id,cond:r.cond,status:r.status,data:r.data||{}})));}
    if(p==='/rest/v1/people')return json([]);
    if(p.startsWith('/storage/v1/'))return json({Key:'x',signedURL:'/x'});
    if(p.startsWith('/rest/v1/'))return json(/object/.test(acc)?null:[]);
    return json([]);});
  const page=await ctx.newPage();page.on('dialog',d=>d.accept().catch(()=>{}));
  page.on('pageerror',e=>logs.push('PAGEERROR ('+who.prenom+') : '+e.message.slice(0,300)+' @ '+String(e.stack||'').split('\n').slice(1,4).join(' | ').slice(0,400)));page.on('console',m=>{if(m.type()==='error'&&!/realtime|websocket|Failed to fetch|net::ERR|404|400|ERR_/i.test(m.text()))logs.push(who.prenom+': '+m.text().slice(0,200));});
  await page.clock.install({time:new Date(NOW)});
  await page.goto(BASE+'/index.html');await page.waitForTimeout(500);await page.evaluate(()=>{localStorage.clear();localStorage.setItem('trace:wide','1');});await page.evaluate(()=>new Promise(r=>{try{const q=indexedDB.deleteDatabase('trace-kv');q.onsuccess=q.onerror=q.onblocked=()=>r();}catch(e){r();}}));
  await page.reload();await page.waitForTimeout(900);await page.fill('#loginEmail',who.email);await page.fill('#loginPwd','Mot-de-passe-fictif-1');await page.click('#loginGo');await page.waitForTimeout(3000);
  return {ctx,page};}
const shot=async(pg,name)=>{try{await pg.screenshot({path:SHOTS+'/'+name+'.png'});}catch(e){console.log('capture '+name+' : '+e.message);}};
const toast=page=>page.evaluate(()=>(document.getElementById('toast')||{}).textContent||'');
const noOverflow=page=>page.evaluate(()=>document.documentElement.scrollWidth<=window.innerWidth+1&&[...document.querySelectorAll('#eq-app .card,#eq-app .ac-row,#eq-app .ac-notif,.acc-welcome')].every(el=>el.getBoundingClientRect().right<=window.innerWidth+1));
const flushed=async page=>{await page.waitForFunction(()=>window.TRACE&&window.TRACE.reg.pending().length===0,null,{timeout:20000}).catch(()=>{});};
const notifs=page=>page.evaluate(()=>[...document.querySelectorAll('#eq-app .ac-notif')].map(n=>({cls:n.className,t:n.textContent.replace(/\s+/g,' ').trim()})));
const kts=page=>page.evaluate(()=>[...document.querySelectorAll('#eq-app .ac-kt')].map(n=>({cls:n.className,t:n.textContent.replace(/\s+/g,' ').trim()})));
const home=async page=>{await page.evaluate(()=>document.getElementById('htHome').click());await page.waitForTimeout(400);};
const goEnt=async(page,re)=>{await page.evaluate(async r=>{document.getElementById('htEnt').click();await new Promise(x=>setTimeout(x,250));const bk=document.querySelector('#eq-app .ac-back');if(bk){bk.click();await new Promise(x=>setTimeout(x,200));}const row=[...document.querySelectorAll('#eq-app .ac-row')].find(x=>new RegExp(r).test(x.textContent));if(row)row.click();},re);await page.waitForTimeout(450);};
const goMoiDocs=async page=>{await page.evaluate(()=>document.getElementById('htEspace').click());await page.waitForTimeout(300);await page.evaluate(()=>{const c=[...document.querySelectorAll('#eq-app .eq-subs .chip')].find(x=>/Documents/.test(x.textContent));if(c)c.click();});await page.waitForTimeout(350);};
const OV=[];const ov=async(page,tag)=>{const ok=await noOverflow(page);if(!ok)console.log('DÉBORDEMENT 390 :',tag);OV.push(ok);};
// ══ c0 · administrateur (PC 1366) : import du pack, Accueil RH, aucun écran bloquant malgré gateAll, carte de bienvenue non bloquante
let {ctx,page}=await mkCtx(ADM,{width:1366,height:900}); /* 31/10 matin (Ethan : « on peut enlever le ruban ») : ruban d'onglets caché — « rien ne bloque » = le sélecteur de module du bandeau (#tbHomeMod) reste là */
let out={gate:await page.evaluate(()=>!!document.querySelector('.acc-gate')),tabs:await page.evaluate(()=>(e=>!!e&&getComputedStyle(e).display!=='none'&&e.getBoundingClientRect().width>0)(document.getElementById('tbHomeMod'))),welcome:await page.evaluate(()=>!!document.querySelector('.acc-welcome'))};
await goEnt(page,'Accueil RH');
await page.evaluate(()=>{const b=document.querySelector('#eq-app [data-v="acc|pick|pack"]');if(b)b.click();});await page.waitForSelector('body > input[type=file]',{state:'attached',timeout:4000}).catch(()=>{});
await page.setInputFiles('body > input[type=file]',{name:'pack_test.json',mimeType:'application/json',buffer:Buffer.from(JSON.stringify(PACK))});await page.waitForTimeout(1800);
out.adm=await page.evaluate(()=>{const app=document.getElementById('eq-app');const t=app.textContent.replace(/\s+/g,' ');return {h2:(app.querySelector('h2.vt')||{}).textContent||'',imp:/2 documents : 2 nouveaux/.test(t),sum:/1 à signer dès l'arrivée \(sous 7 jours\)/.test(t),noBloq:!/bloquant/i.test(t),noGateAll:!/Tout le monde|Nouveaux comptes seulement|Voir l'écran de bienvenue/.test(t),carte:/Carte de bienvenue/.test(t)&&/Rien ne bloque jamais/.test(t),rows:[...app.querySelectorAll('.acc-drow .ac-row')].map(r=>r.textContent.replace(/\s+/g,' ').trim())};});
await shot(page,'pc_1_accueil_rh_sans_blocage');
await home(page);await flushed(page);
out.home=await page.evaluate(()=>{const w=document.querySelector('.acc-welcome');return {gate:!!document.querySelector('.acc-gate'),welcome:w?w.textContent.replace(/\s+/g,' ').trim():null,tabs:(e=>!!e&&getComputedStyle(e).display!=='none'&&e.getBoundingClientRect().width>0)(document.getElementById('tbHomeMod')),cfg:JSON.stringify(window.TRACE.reg.get('doc','acc__cfg')||{})};});
console.log('c0) administrateur :',JSON.stringify(out));
C.c0=!out.gate&&out.tabs&&out.adm.imp&&out.adm.sum&&out.adm.noBloq&&out.adm.noGateAll&&out.adm.carte&&out.adm.rows.length===2&&out.adm.rows.some(r=>/Note d.information \(test\).*à signer dès l'arrivée \(sous 7 jours\)/.test(r))&&out.adm.rows.some(r=>/Charte \(test\).*embauche J\+7/.test(r))
  &&!out.home.gate&&out.home.tabs&&/gateAll":true/.test(out.home.cfg)&&!!out.home.welcome&&/Bienvenue chez SCR, Camille/.test(out.home.welcome)&&/3 documents à lire et à signer sous 7 jours/.test(out.home.welcome);
await ctx.close();
// ══ c1 · nouveau compte (téléphone 390) : rien ne bloque, carte de bienvenue, « À faire » avec échéances, « Commencer », ✕
({ctx,page}=await mkCtx(NEW,{width:390,height:844},true));
await page.waitForTimeout(600);
out={gate:await page.evaluate(()=>!!document.querySelector('.acc-gate')),tabs:await page.evaluate(()=>(e=>!!e&&getComputedStyle(e).display!=='none'&&e.getBoundingClientRect().width>0)(document.getElementById('tbHomeMod'))),hi:await page.evaluate(()=>(document.querySelector('#eq-app .ac-hi')||{}).textContent||'')};
out.w=await page.evaluate(()=>{const w=document.querySelector('.acc-welcome');if(!w)return null;const x=w.querySelector('.acc-x');const r=x&&x.getBoundingClientRect();const b=[...w.querySelectorAll('.btn')].map(e=>({t:e.textContent.trim(),h:e.getBoundingClientRect().height}));return {t:w.textContent.replace(/\s+/g,' ').trim(),xh:r?r.height:0,btns:b,first:w.compareDocumentPosition(document.querySelector('#eq-app .ac-two'))&Node.DOCUMENT_POSITION_FOLLOWING?true:false};});
out.n=await notifs(page);await ov(page,'nouveau compte · accueil');
await shot(page,'tel_1_bienvenue_nouveau_compte');
await page.evaluate(()=>[...document.querySelectorAll('.acc-welcome .btn')].find(b=>/Commencer/.test(b.textContent)).click());await page.waitForTimeout(500);
out.modal=await page.evaluate(()=>({show:document.getElementById('modal').classList.contains('show'),title:(document.querySelector('#modal h3')||{}).textContent||'',read:!!document.getElementById('dr-read'),dis:document.getElementById('dr-read')&&document.getElementById('dr-read').disabled}));
await ov(page,'nouveau compte · lecture');
await page.evaluate(()=>document.querySelector('#modal [data-close]').click());await page.waitForTimeout(250);
await page.evaluate(()=>document.querySelector('.acc-welcome .acc-x').click());await page.waitForTimeout(300);
out.hidden=await page.evaluate(()=>!document.querySelector('.acc-welcome')&&!!document.querySelector('#eq-app .ac-two'));
await page.reload();await page.waitForTimeout(2500);out.back=await page.evaluate(()=>!!document.querySelector('.acc-welcome'));
await goMoiDocs(page);out.docs=await page.evaluate(()=>{const app=document.getElementById('eq-app');return {h2:(app.querySelector('h2.vt')||{}).textContent.replace(/\s+/g,' '),rows:[...app.querySelectorAll('.ac-row')].map(r=>r.textContent.replace(/\s+/g,' ').trim()),head:(app.querySelector('.ac-h span')||{}).textContent||'',hint:(app.querySelector('.hint[style*="margin-top:8px"]')||{}).textContent||''};});
await ov(page,'nouveau compte · documents');await shot(page,'tel_2_mes_documents_echeances');
console.log('c1) nouveau compte :',JSON.stringify(out));
const nDocs=out.n.filter(x=>/À lire et signer/.test(x.t));
C.c1=!out.gate&&out.tabs&&/Bonjour Bruno/.test(out.hi)&&!!out.w&&/Bienvenue chez SCR, Bruno/.test(out.w.t)&&/3 documents à lire et à signer sous 7 jours — le premier avant le 21\/10/.test(out.w.t)&&/Rien ne bloque/.test(out.w.t)&&out.w.xh>=40&&out.w.btns.every(b=>b.h>=40)&&out.w.btns.some(b=>/Commencer : Règlement intérieur/.test(b.t))&&out.w.first
  &&nDocs.length===3&&/Règlement intérieur.*à signer avant le 21\/10\/2026 \(dans 2 j\)/.test(nDocs[0].t)&&/warn/.test(nDocs[0].cls)&&nDocs.slice(1).every(x=>/à signer avant le 26\/10\/2026 \(dans 7 j\)/.test(x.t))&&!out.n.some(x=>/une seule fois|Accueil nouvel arrivant/.test(x.t))
  &&out.modal.show&&/Règlement intérieur/.test(out.modal.title)&&out.modal.read&&out.modal.dis===true&&out.hidden&&out.back
  &&/3 à signer/.test(out.docs.h2)&&/sous 7 jours/.test(out.docs.head)&&/Règlement intérieur.*à signer avant le 21\/10\/2026/.test(out.docs.rows[0]||'')&&out.docs.rows.length===3&&!out.docs.rows.some(r=>/nouvel arrivant/.test(r))&&/rien ne bloque/.test(out.docs.hint);
await ctx.close();
// ══ c2 · rappel du hub (administrateur) : « N personnes ont des documents en retard » ; la personne en retard voit « en retard de 2 j » en rouge
({ctx,page}=await mkCtx(ADM,{width:1366,height:900}));
await page.waitForTimeout(500);
out={kt:await kts(page)};
const late=out.kt.find(x=>/Documents en retard/.test(x.t));
await page.evaluate(()=>{const b=[...document.querySelectorAll('#eq-app .ac-kt')].find(x=>/Documents en retard/.test(x.textContent));if(b)b.click();});await page.waitForTimeout(400);
out.modal=await page.evaluate(()=>{const m=document.getElementById('modal');return {show:m.classList.contains('show'),t:m.textContent.replace(/\s+/g,' ').trim(),rows:m.querySelectorAll('table.rc tr').length,print:!!document.getElementById('dl-print'),noInput:!m.querySelector('input,select')};});
if(!out.modal.show)console.log('   pas de fenêtre « documents en retard » :',JSON.stringify(out.kt).slice(0,600),await page.evaluate(()=>({n:document.querySelectorAll('#eq-app .ac-notif').length,home:document.getElementById('homeBody').textContent.replace(/\s+/g,' ').slice(0,300)})));
await shot(page,'pc_2_hub_documents_en_retard');
await page.evaluate(()=>{const b=document.querySelector('#modal [data-close]');if(b)b.click();});await page.waitForTimeout(200);
out.late=await page.evaluate(()=>window.TRACE.docs.late((window.TRACE.state.accounts||[]).filter(a=>a.active)).map(x=>x.name+':'+x.n+':'+x.worst));
await ctx.close();
({ctx,page}=await mkCtx(CHEF,{width:1366,height:900}));
await page.waitForTimeout(500);
out.chef={n:await notifs(page),welcome:await page.evaluate(()=>!!document.querySelector('.acc-welcome'))};
await goMoiDocs(page);out.chef.docs=await page.evaluate(()=>{const app=document.getElementById('eq-app');return {h2:(app.querySelector('h2.vt')||{}).textContent.replace(/\s+/g,' '),head:(app.querySelector('.ac-h span')||{}).textContent||'',rows:[...app.querySelectorAll('.ac-row')].map(r=>r.textContent.replace(/\s+/g,' ').trim()),red:[...app.querySelectorAll('.ac-row span[style*="9b2c22"]')].map(s=>s.textContent)};});
console.log('c2) retards :',JSON.stringify(out));
C.c2=!!late&&/Documents en retard2 personnes/.test(late.t)&&/bad/.test(late.cls)
  &&out.modal.show&&/Documents en retard · 2 personnes/.test(out.modal.t)&&/Claude FICTIF.*Règlement intérieur \(retard 2 j\)/.test(out.modal.t)&&/Dominique FICTIF/.test(out.modal.t)&&!/Bruno|Camille/.test(out.modal.t)&&out.modal.rows===2&&out.modal.print&&out.modal.noInput
  &&out.late.join()==='Camille FICTIVE:1:2,Claude FICTIF:1:2,Dominique FICTIF:1:2'
  &&out.chef.n.some(x=>/À lire et signer : Règlement intérieur.*en retard de 2 j \(à signer avant le 17\/10\/2026\)/.test(x.t)&&/bad/.test(x.cls))&&!out.chef.welcome
  &&/1 en retard/.test(out.chef.docs.h2)&&/1 en retard/.test(out.chef.docs.head)&&out.chef.docs.red.some(t=>/en retard de 2 j/.test(t));
// ══ c3 · accueil provisoire retiré ; l'ancienne signature du chef reste lisible (Signés · document retiré)
out={rows:out.chef.docs.rows};
out.old=await page.evaluate(()=>{const r=[...document.querySelectorAll('#eq-app .ac-row')].find(x=>/Accueil sécurité nouvel arrivant/.test(x.textContent));return r?{t:r.textContent.replace(/\s+/g,' ').trim(),todo:r.classList.contains('todo'),sec:(()=>{let e=r;while(e&&!(e.classList&&e.classList.contains('ac-h')))e=e.previousElementSibling;return e?e.textContent.replace(/\s+/g,' ').trim():'';})()}:null;});
await page.evaluate(()=>{const r=[...document.querySelectorAll('#eq-app .ac-row')].find(x=>/Accueil sécurité nouvel arrivant/.test(x.textContent));if(r)r.click();});await page.waitForTimeout(400);
out.open=await page.evaluate(()=>{const m=document.getElementById('modal');return {show:m.classList.contains('show'),signed:/Signé par Claude FICTIF/.test(m.textContent),noRead:!document.getElementById('dr-read'),boxes:m.querySelectorAll('input[data-q]:disabled:checked').length,intro:/plus demandé à personne/.test(m.textContent)};});
await shot(page,'pc_3_ancienne_signature_document_retire');
await page.evaluate(()=>document.querySelector('#modal [data-close]').click());await page.waitForTimeout(200);
out.todo=await page.evaluate(()=>window.TRACE.docs.todo(window.TRACE.acces.current()).map(d=>d.id));
await ctx.close();
({ctx,page}=await mkCtx(ADM,{width:1366,height:900}));
await goEnt(page,'Documents d.entreprise');
out.admin=await page.evaluate(()=>{const app=document.getElementById('eq-app');const t=app.textContent.replace(/\s+/g,' ');return {rows:[...app.querySelectorAll('.ac-row .tx > b')].map(b=>b.textContent),noAcc:!/nouvel arrivant/i.test(t),hint:/sans jamais bloquer l'accès/.test(t),late:/À relancer/.test(t)&&/Claude FICTIF/.test(t)};});
out.all=await page.evaluate(()=>window.TRACE.docs.all().map(d=>d.id));
console.log('c3) accueil provisoire retiré :',JSON.stringify(out));
C.c3=!!out.old&&!out.old.todo&&/document retiré/.test(out.old.t)&&/signé le 11\/10\/2026/.test(out.old.t)&&/^Signés/.test(out.old.sec)&&out.open.show&&out.open.signed&&out.open.noRead&&out.open.boxes===10&&out.open.intro
  &&!out.todo.includes('accueil_entreprise')&&out.todo.length===3&&!out.all.includes('accueil_entreprise')&&out.admin.rows.length===3&&!out.admin.rows.some(t=>/nouvel arrivant/.test(t))&&out.admin.noAcc&&out.admin.hint&&out.admin.late;
// ══ c4 · offres : importée sans alerte (tuile « historique importé »), créée avec alerte ; une importée redevient suivie (date posée dans l'appli + tâche cochée)
await home(page);out={n:(await notifs(page)).filter(x=>/Offre/.test(x.t)).map(x=>x.t)};
const openAff=async(n,tab)=>{await page.evaluate(async([n,tab])=>{const T=window.TRACE;document.getElementById('htCom').click();await new Promise(x=>setTimeout(x,250));const S=T.affaires.state();S.view='fiche';S.cur=n;S.vview=null;S.tab=tab||'fiche';S.seg='devis';T.renderHome();},[n,tab]);await page.waitForTimeout(500);};
await openAff(A_IMP,'dossier');
out.imp=await page.evaluate(()=>{const tiles=[...document.querySelectorAll('#eq-app .ac-stat')].map(x=>({cls:x.className,t:x.textContent.replace(/\s+/g,' ').trim()}));return {tiles,importee:window.TRACE.affaires.importee(window.TRACE.affaires.get('O2509-71')),inp:!!document.querySelector('#eq-app [data-afcs=dateReponse]')};});
await shot(page,'pc_4_affaire_importee_sans_alerte');
await openAff(A_NEW,'dossier');
out.neu=await page.evaluate(()=>({tiles:[...document.querySelectorAll('#eq-app .ac-stat')].map(x=>({cls:x.className,t:x.textContent.replace(/\s+/g,' ').trim()})),importee:window.TRACE.affaires.importee(window.TRACE.affaires.get('O2610-72'))}));
/* l'importée redevient suivie : date de réponse posée dans l'appli + une tâche cochée */
await openAff(A_IMP,'dossier');
await page.evaluate(()=>{const el=document.querySelector('#eq-app [data-afcs=dateReponse]');el.value='2026-10-16';el.dispatchEvent(new Event('change',{bubbles:true}));});await page.waitForTimeout(300);
out.step1=await page.evaluate(()=>{const a=window.TRACE.affaires.get('O2509-71');return {by:a.dateReponseBy,date:a.dateReponse,importee:window.TRACE.affaires.importee(a)};});
await page.evaluate(()=>{const b=document.querySelector('#eq-app [data-act=af][data-v="tache|visite"]');if(b)b.click();});await page.waitForTimeout(300);
out.step2=await page.evaluate(()=>{const a=window.TRACE.affaires.get('O2509-71');return {taches:a.taches,importee:window.TRACE.affaires.importee(a),tiles:[...document.querySelectorAll('#eq-app .ac-stat')].map(x=>x.textContent.replace(/\s+/g,' ').trim())};});
await home(page);out.n2=(await notifs(page)).filter(x=>/Offre/.test(x.t)).map(x=>x.t);
console.log('c4) offres :',JSON.stringify(out));
const tileRem=out.imp.tiles.find(x=>/remise de l'offre/.test(x.t)),tileNew=out.neu.tiles.find(x=>/remise de l'offre/.test(x.t));
C.c4=out.n.length===1&&/Offre O2610-72 · Nouveau dossier fictif : remise dépassée \(16\/10\/2026\)/.test(out.n[0])&&out.imp.importee===true&&out.neu.importee===false&&out.imp.inp
  &&!!tileRem&&/historique importé/.test(tileRem.t)&&!/bad|warn/.test(tileRem.cls)&&!!tileNew&&/dépassée/.test(tileNew.t)&&/bad/.test(tileNew.cls)
  &&out.step1.by==='Camille FICTIVE'&&out.step1.date==='2026-10-16'&&out.step1.importee===true&&out.step2.taches&&out.step2.taches.visite&&out.step2.importee===false&&out.step2.tiles.some(t=>/remise de l'offre · dépassée/.test(t))
  &&out.n2.length===2&&out.n2.some(t=>/Offre O2509-71/.test(t))&&!out.n2.some(t=>/O2509-73/.test(t));
// ══ c5 · flotte : types lisibles, « à préciser » + choix en un clic, poste réel du conducteur, clés du pack
await page.evaluate(async()=>{document.getElementById('htParc').click();await new Promise(r=>setTimeout(r,250));const sg=document.querySelector('#eq-app [data-act=parcseg][data-v=flotte]');if(sg)sg.click();});await page.waitForTimeout(400);
out={rows:await page.evaluate(()=>[...document.querySelectorAll('#eq-app .fl-row')].map(r=>r.textContent.replace(/\s+/g,' ').trim())),chips:await page.evaluate(()=>[...document.querySelectorAll('#eq-app .eq-filtres .chip')].map(c=>c.textContent.replace(/\s+/g,' ').trim())),picks:await page.evaluate(()=>[...document.querySelectorAll('#eq-app .fl-pick')].map(p=>({btns:[...p.querySelectorAll('.btn')].map(b=>({t:b.textContent.trim(),v:b.dataset.v,h:b.getBoundingClientRect().height,prim:b.classList.contains('primary')}))})))};
out.keys=await page.evaluate(()=>{const F=window.TRACE.flotte;return {old:F.typeKeys({type:'tuyauteur/Pelleur'}),tuy:F.typeKeys({type:'Tuyauteur'}),pel:F.typeKeys({type:'Pelleur (conducteur d\'engins)'}),man:F.type({type:'Manchon'}),cdc:F.type({type:'CDC'}),lab:F.typeLabel({type:'tuyauteur/Pelleur'}),raw:F.get('AB-123-CD').type};});
await shot(page,'pc_5_flotte_types_lisibles');
/* choix en un clic dans la liste : AB-123-CD (conducteur soudeur) → Pelleur */
await page.evaluate(()=>{const b=[...document.querySelectorAll('#eq-app .fl-pick .btn')].find(x=>/^settype\|AB-123-CD\|Pelleur/.test(x.dataset.v));if(b)b.click();});await page.waitForTimeout(400);
out.after=await page.evaluate(()=>{const v=window.TRACE.flotte.get('AB-123-CD');return {type:v.type,by:v.typeBy,toast:(document.getElementById('toast')||{}).textContent||'',rows:[...document.querySelectorAll('#eq-app .fl-row')].map(r=>r.textContent.replace(/\s+/g,' ').trim()),picks:document.querySelectorAll('#eq-app .fl-pick').length,chips:[...document.querySelectorAll('#eq-app .eq-filtres .chip')].map(c=>c.textContent.replace(/\s+/g,' ').trim())};});
/* fiche de MN-012-OP (à préciser, sans conducteur) : carte « Type à préciser », choix → Tuyauteur, la liste déroulante suit */
await page.evaluate(()=>document.querySelector('#eq-app [data-act=fl][data-v="open|MN-012-OP"]').click());await page.waitForTimeout(400);
out.fiche=await page.evaluate(()=>{const app=document.getElementById('eq-app');const sel=app.querySelector('[data-flf=type]');return {num:(app.querySelector('.af-num')||{}).textContent||'',card:/Type à préciser/.test(app.textContent),selVal:sel&&sel.value,selTxt:sel&&sel.options[sel.selectedIndex].textContent,opts:sel?[...sel.options].map(o=>o.textContent):[]};});
await shot(page,'pc_6_fiche_vehicule_type_a_preciser');
await page.evaluate(()=>{const b=[...document.querySelectorAll('#eq-app .fl-pick .btn')].find(x=>/^settype\|MN-012-OP\|Tuyauteur$/.test(x.dataset.v));if(b)b.click();});await page.waitForTimeout(400);
out.fiche2=await page.evaluate(()=>{const app=document.getElementById('eq-app');const sel=app.querySelector('[data-flf=type]');return {type:window.TRACE.flotte.get('MN-012-OP').type,num:(app.querySelector('.af-num')||{}).textContent||'',card:/Type à préciser/.test(app.textContent),selTxt:sel&&sel.options[sel.selectedIndex].textContent};});
await flushed(page);out.srv={ab:REG['vehicule|AB-123-CD'].data.type,mn:REG['vehicule|MN-012-OP'].data.type};
console.log('c5) flotte :',JSON.stringify(out));
const rAB=out.rows.find(r=>/AB-123-CD/.test(r))||'',rEF=out.rows.find(r=>/EF-456-GH/.test(r))||'',rIJ=out.rows.find(r=>/IJ-789-KL/.test(r))||'',rMN=out.rows.find(r=>/MN-012-OP/.test(r))||'';
C.c5=out.rows.length===4&&/Tuyauteur \/ Pelleur \(à préciser\)/.test(rAB)&&/poste : Soudeur ≠ type/.test(rAB)&&/Manchonneur · Bruno ESSAI Manchonneur/.test(rEF)&&!/≠/.test(rEF)&&/Chef de chantier · Claude FICTIF Chef de chantier/.test(rIJ)&&/Tuyauteur \/ Pelleur \(à préciser\) · sans conducteur/.test(rMN)
  &&out.chips.some(c=>/^Tuyauteur \/ Pelleur \(à préciser\) 2$/.test(c))&&out.chips.includes('Manchonneur')&&out.chips.includes('Chef de chantier')&&!out.chips.some(c=>/^Manchon$|^CDC$|tuyauteur\/Pelleur$/.test(c))
  &&out.picks.length===2&&out.picks.every(p=>p.btns.length===2&&p.btns.every(b=>b.h>=40))&&out.picks.every(p=>!p.btns.some(b=>b.prim)) /* conducteur soudeur : aucune suggestion */
  &&out.keys.old.includes('tuyauteur/Pelleur')&&out.keys.tuy.includes('tuyauteur/Pelleur')&&out.keys.tuy[0]==='Tuyauteur'&&out.keys.pel.includes('tuyauteur/Pelleur')&&out.keys.pel.includes('Pelleur')&&out.keys.man==='Manchonneur'&&out.keys.cdc==='Chef de chantier'&&out.keys.lab==='Tuyauteur / Pelleur (à préciser)'&&out.keys.raw==='tuyauteur/Pelleur'
  &&out.after.type==='Pelleur (conducteur d\'engins)'&&out.after.by==='Camille FICTIVE'&&/AB-123-CD : Pelleur/.test(out.after.toast)&&/Pelleur \(conducteur d'engins\) · Dominique FICTIF poste : Soudeur ≠ type/.test(out.after.rows.find(r=>/AB-123-CD/.test(r))||'')&&out.after.picks===1&&out.after.chips.some(c=>/à préciser\) 1$/.test(c))&&out.after.chips.includes('Pelleur (conducteur d\'engins)')
  &&/Tuyauteur \/ Pelleur \(à préciser\)/.test(out.fiche.num)&&out.fiche.card&&out.fiche.selVal==='tuyauteur/Pelleur'&&/à préciser/.test(out.fiche.selTxt)&&out.fiche.opts.includes('Pelleur (conducteur d\'engins)')&&out.fiche.opts.includes('Chef de chantier')
  &&out.fiche2.type==='Tuyauteur'&&/· Tuyauteur$/.test(out.fiche2.num.trim())&&!out.fiche2.card&&out.fiche2.selTxt==='Tuyauteur'&&out.srv.ab==='Pelleur (conducteur d\'engins)'&&out.srv.mn==='Tuyauteur';
// ══ c6 · fils : chantier venu du traceur (AXIOM) + chantier partagé → les deux couleurs à 20 px/m, PC admin et téléphone soudeur ; Épuré, légende, rappel 👁
const traceur=async(pg,url,lines,name)=>{await pg.goto(BASE+'/traceur.html'+url);await pg.waitForTimeout(1300);
  await pg.evaluate(L=>{const M=window.MAQ;M.state.supplier='AXIOM';M.state.serie=1;M.state.lines=JSON.parse(JSON.stringify(L));M.state.seq=L.length+1;M.setMode('select');M.rebuild();M.save();},lines);await pg.waitForTimeout(300);
  await pg.click('#bSave');await pg.waitForTimeout(250);await pg.fill('#svName',name);await pg.click('#svOk');await pg.waitForTimeout(1500);return pg.evaluate(()=>window.MAQ.state.siteRef&&window.MAQ.state.siteRef.id);};
const openSite=async(pg,id)=>{await pg.evaluate(id=>window.TRACE.openSiteFromHome(id),id);await pg.waitForFunction(id=>window.TRACE.state.screen==='site'&&window.TRACE.state.siteId===id,id,{timeout:20000}).catch(()=>{});await pg.waitForTimeout(1500);};
const wires=(pg,k,lineIdx)=>pg.evaluate(([k,li])=>{const T=window.TRACE;T.state.view.k=k;const ids=Object.keys(T.lines);const l=T.lines[ids[li]||ids[0]];const e=l.els[Math.floor(l.els.length/2)];T.centerOn(e.from.x,e.from.y);T.renderPlan();
  const g=document.getElementById('net');const cnt=c=>g.querySelectorAll('path[stroke="'+c+'"]').length;const first=g.firstElementChild;const halo=g.querySelector('g.mu-halo');
  return {kpm:Math.round(T.state.view.k*(T.sheet?T.sheet().ppm:1)),etame:cnt('#dfe4ea'),cuivre:cnt('#e2843a'),casing:cnt('#161616'),fils:T.state.show.fils,legend:document.getElementById('legend').textContent.replace(/\s+/g,' '),haloFirst:!!halo&&first===halo,lines:ids.length};},[k,lineIdx]);
const L=[{id:'L1',name:'Feeder fictif',dn:150,bar:12,pts:[[0,0],[60,0],[120,0]],specials:[],parent:null},{id:'L2',name:'Antenne fictive',dn:80,bar:12,pts:[[60,0],[60,-50]],specials:[],parent:{line:'L1',m:60,side:1}}];
const CID=await traceur(page,'?site=new',L,'Villefictive fils');
await page.goto(BASE+'/index.html');await page.waitForTimeout(1500);await openSite(page,CID);
out={cid:CID,srv:!!SITES[CID],sup:SITES[CID]&&SITES[CID].supplier};
out.k12=await wires(page,12,1);out.k20=await wires(page,20,1);out.k20f=await wires(page,20,0);
await shot(page,'pc_7_fils_chantier_traceur_zoom20');
/* 👁 : rappel « Fils : affichés à partir de 15 px/m · actuellement 20 px/m » ; « Épuré » garde les fils ; décoché → légende « fils masqués » */
await page.evaluate(()=>{const b=document.querySelector('.zoomctl [data-z=eye]');if(b)b.click();});await page.waitForTimeout(300);
out.disp=await page.evaluate(()=>({txt:(document.getElementById('dispFils')||{}).textContent||'',checked:!!(document.querySelector('#disp input[data-k=fils]')||{}).checked}));
await shot(page,'pc_8_oeil_rappel_fils');
await page.evaluate(()=>document.querySelector('#disp [data-all="0"]').click());await page.waitForTimeout(300);
out.epure=await wires(page,20,1);out.epureLS=await page.evaluate(()=>JSON.parse(localStorage.getItem('trace:show')||'{}').fils);
await page.evaluate(()=>{const cb=document.querySelector('#disp input[data-k=fils]');cb.checked=false;cb.dispatchEvent(new Event('change',{bubbles:true}));});await page.waitForTimeout(300);
out.off=await wires(page,20,1);out.offDisp=await page.evaluate(()=>(document.getElementById('dispFils')||{}).textContent||'');
await page.evaluate(()=>{const cb=document.querySelector('#disp input[data-k=fils]');cb.checked=true;cb.dispatchEvent(new Event('change',{bubbles:true}));});await page.waitForTimeout(300);
out.on=await wires(page,20,1);
await page.evaluate(()=>{const b=document.querySelector('.zoomctl [data-z=eye]');if(b)b.click();});await page.waitForTimeout(200);
/* chantier PARTAGÉ (lot MU) : deux affaires, l'antenne rattachée à la seconde → halo sous le réseau, fils toujours là */
await page.evaluate(()=>{const T=window.TRACE;const n=T.net;n.affaires=['O2501-91','O2610-92'];n.lines.forEach(l=>{if(l.parent)l.aff='O2610-92';});Object.values(T.lines).forEach(l=>{if(l.parent)l.aff='O2610-92';});});
out.mu=await wires(page,20,1);await shot(page,'pc_9_fils_chantier_partage_zoom20');out.mu40=await wires(page,40,1);
await ctx.close();
/* soudeur, téléphone 390 */
({ctx,page}=await mkCtx(SOUD,{width:390,height:844},true));
await openSite(page,CID);
out.tel={k15:await wires(page,15,0),k20:await wires(page,20,1)};await shot(page,'tel_3_fils_soudeur_zoom20');
await page.evaluate(()=>{const b=document.querySelector('.zoomctl [data-z=eye]');if(b)b.click();});await page.waitForTimeout(300);
out.tel.disp=await page.evaluate(()=>(document.getElementById('dispFils')||{}).textContent||'');out.tel.ov=await page.evaluate(()=>{const r=document.getElementById('disp').getBoundingClientRect();return document.documentElement.scrollWidth<=window.innerWidth+1&&r.right<=window.innerWidth+1&&r.left>=0;}); /* le panneau 👁 tient dans l'écran du téléphone */
await shot(page,'tel_4_oeil_rappel_fils');
await page.evaluate(()=>{const b=document.querySelector('.zoomctl [data-z=eye]');if(b)b.click();});await page.waitForTimeout(200);
/* téléphone : la flotte vue par l'administrateur n'est pas accessible au soudeur — on vérifie son « À faire » et Moi → Documents sans débordement */
await page.evaluate(()=>document.getElementById('btnHome').click());await page.waitForTimeout(600);
await home(page);await ov(page,'soudeur · accueil');await goMoiDocs(page);await ov(page,'soudeur · documents');await shot(page,'tel_5_soudeur_documents_retard');
out.tel.docs=await page.evaluate(()=>(document.querySelector('#eq-app h2.vt')||{}).textContent.replace(/\s+/g,' '));
console.log('c6) fils :',JSON.stringify(out));
const both=x=>x&&x.etame>0&&x.cuivre>0;
C.c6=out.srv&&out.sup==='AXIOM'&&out.k12.etame===0&&/zoome encore pour les fils \(dès 15 px\/m\)/.test(out.k12.legend)&&both(out.k20)&&both(out.k20f)&&out.k20.kpm===20&&/fils visibles/.test(out.k20.legend)
  &&/Fils : affichés à partir de 15 px\/m · actuellement 20 px\/m → dessinés/.test(out.disp.txt)&&out.disp.checked&&both(out.epure)&&out.epure.fils===true&&out.epureLS===true
  &&out.off.etame===0&&out.off.fils===false&&/fils masqués : coche « Fils » dans 👁/.test(out.off.legend)&&/masqués/.test(out.offDisp)&&both(out.on)
  &&both(out.mu)&&out.mu.haloFirst&&both(out.mu40)&&both(out.tel.k20)&&both(out.tel.k15)&&/actuellement 20 px\/m → dessinés/.test(out.tel.disp)&&out.tel.ov&&/en retard/.test(out.tel.docs);
await ctx.close();
// ══ c7 · 390 px : pas de débordement ; c8 · console
C.c7=OV.length>=5&&OV.every(Boolean);
console.log('erreurs console :',JSON.stringify(logs));C.c8=logs.length===0;
const bad=Object.entries(C).filter(([k,v])=>!v).map(([k])=>k);console.log(bad.length?'RESULTAT: ECHEC '+bad.join(','):'RESULTAT: TOUT VERT');
await browser.close();
