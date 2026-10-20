// LOT MG (19/10) — magasin : fiches type par poste, « besoin le » retiré, commandes dans le planning, prête en partie, créer un article, entrées / sorties multiples.
// Pack FICTIF (10 articles inventés, 3 listes, 2 dotations) ; Supabase SIMULÉ à 4 comptes fictifs : Bruno TESTSOUDEUR (soudeur, téléphone 390 px),
// Marie TESTMAGASIN (référente magasin), Claire TESTCHEF (chef de chantier), Denis TESTCONDUC (conducteur de travaux, PC 1366 px). Flotte fictive (2 véhicules),
// une remise de véhicule fictive (vrec) avec un inventaire, un planning fictif (Bruno et Claire sur le chantier Alpha cette semaine).
// c1 fiches type depuis le pack · c2 retouches par le magasin (quantité, ligne retirée, lignes ajoutées, survie au réimport, dupliquer / titre) · c3 imprimer la fiche,
// équiper un véhicule (véhicule du métier d'office, conducteur proposé, comparaison à l'inventaire → les manquants, demande créée imputée au véhicule) ·
// c4 le soudeur au téléphone : la demande reçue, les fiches en lecture (équiper pour soi), plus de « besoin le », case urgent · c5 pastilles du planning (chef :
// hub, Tes compagnons, fiche de personne ; sous-vues lecture ; le soudeur sur Ta semaine) · c6 prête en partie (reliquat en suspens, À commander, le gars
// prévenu, remise, 2e préparation → terminée) · c7 nouvel article (référence proposée, doublon détecté, créer quand même / ouvrir celui-là, photo, survie au
// réimport) · c8 entrée et sortie multiples (lots, scan, bons imprimés, journal groupé, la personne voit la sortie) · c9 390 px · c10 le conducteur (fiches
// sans le droit magasin, pastille sur le planning des équipes, équiper pour un gars) ; zéro erreur console, aucune écriture refusée par le serveur simulé.
import { chromium } from 'playwright';
import { mkdirSync } from 'node:fs';
const BASE=process.env.BASE||'http://127.0.0.1:8814';
const SHOTS=process.env.SHOTS||'/tmp/mg_shots';mkdirSync(SHOTS,{recursive:true});
const SB='https://pghftlepduvfazbiavhq.supabase.co';
const b64u=o=>Buffer.from(JSON.stringify(o)).toString('base64').replace(/=+$/,'').replace(/\+/g,'-').replace(/\//g,'_');
const now=()=>Math.floor(Date.now()/1000);
const SOUD={id:'aaaaaaaa-1111-4111-8111-111111111111',email:'bruno.testsoudeur@exemple.fr',prenom:'Bruno',nom:'TESTSOUDEUR',poste:'soudeur',role:'soudeur'};
const MAG={id:'bbbbbbbb-2222-4222-8222-222222222222',email:'marie.testmagasin@exemple.fr',prenom:'Marie',nom:'TESTMAGASIN',poste:'referent_magasin',role:'bureau'};
const CHEF={id:'cccccccc-3333-4333-8333-333333333333',email:'claire.testchef@exemple.fr',prenom:'Claire',nom:'TESTCHEF',poste:'chef',role:'bureau'};
const COND={id:'dddddddd-4444-4444-8444-444444444444',email:'denis.testconduc@exemple.fr',prenom:'Denis',nom:'TESTCONDUC',poste:'conducteur',role:'chef'};
const USERS=[SOUD,MAG,CHEF,COND];const MGR=new Set([MAG.email,CHEF.email,COND.email]); /* règle serveur : encadrement / bureau / magasin écrivent magdem pour les autres */
const PROFILES=USERS.map(u=>({id:u.id,email:u.email,name:u.prenom+' '+u.nom,prenom:u.prenom,nom:u.nom,role:u.role,active:true,poste:u.poste,admin:false,type:'salarie',rights:{},sites:null,created_at:'2026-10-08T09:00:00Z'}));
const SITES=[{id:'SRV_A',name:'Chantier fictif Alpha',supplier:'LOGSTOR',updated_at:'2026-10-01T08:00:00Z',geo:null,origin:null,bgo:null,sat:null,w:null,h:null,bbox:null,nbox:null,nw:40,deleted:null,deletedAt:null,builtin:null,ville:'Villefictive',chef:CHEF.email,conducteur:COND.email,secteur:'ouest',etude:null},
  {id:'SRV_B',name:'Chantier fictif Bravo',supplier:'LOGSTOR',updated_at:'2026-10-01T08:00:00Z',geo:null,origin:null,bgo:null,sat:null,w:null,h:null,bbox:null,nbox:null,nw:20,deleted:null,deletedAt:null,builtin:null,ville:'Autreville',chef:null,conducteur:null,secteur:'ouest',etude:null}];
// pack FICTIF (mêmes structures que le pack SCR : catalogue / formulaires / dotations)
const art=(ref,designation,famille,unite,stockDepot,seuil,prixU,fournisseur,o={})=>Object.assign({ref,designation,famille,unite,stockDepot,seuil,emplacement:ref.startsWith('X-')?null:ref,prixU,source:'test',metiers:[],fournisseur,marque:null,refFournisseur:fournisseur?'REF-'+ref:null,aliases:[],note:null},o);
const PACK={magasin:{
  catalogue:[art('T-01','Disque fictif A','Abrasifs','u',10,12,1.5,'FOURNISSEUR ALPHA',{aliases:['DISQUE ALPHA']}),art('T-02','Baguette fictive B','Soudage','paquet',5,4,20,'FOURNISSEUR BETA'),
    art('T-03','Moufle fictive taille S','EPI','paire',6,4,3,'FOURNISSEUR ALPHA'),art('T-04','Moufle fictive taille M','EPI','paire',2,4,3,'FOURNISSEUR ALPHA'),art('T-05','Moufle fictive taille L','EPI','paire',0,2,3,'FOURNISSEUR ALPHA'),
    art('T-06','Crayon fictif','Consommable','u',30,10,0.8,'FOURNISSEUR BETA'),art('T-07','Truelle fictive','Outillage','u',3,null,25,null),art('T-08','Courroie fictive','Levage-arrimage','u',8,6,9,'FOURNISSEUR BETA'),
    art('T-09','Bouchon fictif','Tuyauterie','u',12,20,4,'FOURNISSEUR GAMMA'),art('X-RUBAN-FICTIF','Ruban fictif','Hygiène-sécurité','rouleau',null,null,null,null)],
  formulaires:[
    {id:'liste-soudure',titre:'Liste fictive soudure',pour:['soudeur','tuyauteur'],source:'test',remplace:'test',champs:[],articles:[
      {ligne:1,section:'Consommables fictifs',ref:'T-01',designation:'Disque A (fictif)',unite:'u',qteMax:20,lienStock:'exact'},{ligne:2,section:'Consommables fictifs',ref:'T-02',designation:'Paquet de baguettes B (fictif)',unite:'paquet',qteMax:null,lienStock:'exact'}]},
    {id:'liste-tous',titre:'Liste fictive pour tous',pour:['tous'],source:'test',remplace:'test',champs:[],articles:[
      {ligne:10,section:'Protection fictive',ref:null,designation:'Moufles (fictives)',unite:'paire',qteMax:null,choixVariante:'taille',variantes:[{libelle:'S',ref:'T-03'},{libelle:'M',ref:'T-04'},{libelle:'L',ref:'T-05'}],lienStock:'exact'}]},
    {id:'liste-manchon',titre:'Liste fictive manchon',pour:['manchonneur'],source:'test',remplace:'test',champs:[],articles:[{ligne:20,section:'Divers fictif',ref:'T-06',designation:'Crayon (fictif)',unite:'u',qteMax:null,lienStock:'exact'}]}],
  dotations:[
    {metier:'soudeur',metiers:['soudeur','tuyauteur'],titre:'Dotation fictive soudure',source:'test',miseAJour:'01/01/2026',entete:[],visas:[],articles:[
      {designation:'Courroie (fictive)',qte:2,qteTexte:null,uniteDotation:'u',aLaDemande:false,ref:'T-08',lienStock:'exact',controle:'contrôle fictif',observation:null},
      {designation:'Truelle (fictive)',qte:1,qteTexte:null,uniteDotation:'u',aLaDemande:false,ref:'T-07',lienStock:'exact',controle:null,observation:null},
      {designation:'Disque A (fictif)',qte:10,qteTexte:null,uniteDotation:'u',aLaDemande:true,ref:'T-01',lienStock:'exact',controle:null,observation:'à la demande du chef'},
      {designation:'Gilet (fictif)',qte:1,qteTexte:null,uniteDotation:'u',aLaDemande:false,ref:null,lienStock:'aucun',controle:null,observation:'taille à préciser',champFutur:'ignoré'},
      {designation:'Ruban (fictif)',qte:1,qteTexte:null,uniteDotation:'rouleau',aLaDemande:false,ref:'X-RUBAN-FICTIF',lienStock:'aucun',controle:null,observation:null}]},
    {metier:'manchonneur',metiers:['manchonneur'],titre:'Dotation fictive manchon',source:'test',miseAJour:'01/01/2026',entete:[],visas:[],articles:[
      {designation:'Crayon (fictif)',qte:5,qteTexte:null,uniteDotation:'u',aLaDemande:false,ref:'T-06',lienStock:'exact',controle:null,observation:null}]}]}};
const REG={};const PLAN={};const calls=[];const refus=[];
const seed=(kind,id,data)=>{REG[kind+'|'+id]={kind,id,data,updated_at:'2026-10-10T10:00:00Z'};};
seed('vehicule','AA-111-AA',{immat:'AA-111-AA',type:'Soudeur',marque:'Fictif',modele:'Van',agence:'OUEST',conducteur:'Bruno TESTSOUDEUR',conducteurKey:SOUD.email,energie:'diesel'});
seed('vehicule','BB-222-BB',{immat:'BB-222-BB',type:'Manchon',marque:'Fictif',modele:'Fourgon',agence:'OUEST',conducteur:null,conducteurKey:null});
seed('vehicule','CC-333-CC',{immat:'CC-333-CC',type:'Fonction',marque:'Fictif',modele:'Berline',agence:'OUEST',conducteur:'Denis TESTCONDUC',conducteurKey:COND.email});
seed('vrec','AA-111-AA|Rfictif1',{type:'reception',vehId:'AA-111-AA',immat:'AA-111-AA',vehLabel:'Fictif Van',vehType:'Soudeur',conducteurKey:SOUD.email,conducteurNom:'Bruno TESTSOUDEUR',at:'2026-10-10T10:00:00Z',by:'Denis TESTCONDUC',complete:true,manque:[],permis:{ok:true,fin:'2030-01-01'},
  edl:{km:1000,rel:{},ctl:{},doc:{},equip:{},photos:{},impacts:[],remarques:''},inventaire:{liste:'soudeur',titre:'Inventaire fictif soudeur',items:[['Courroie (fictive)','Courroie (fictive)','2'],['Truelle (fictive)','Truelle (fictive)','1'],['Gilet (fictif)','Gilet (fictif)','1']],miss:{'Truelle (fictive)':1},obs:'',n:3},cartes:{},cles:1,lieu:'',reserves:[]});
// planning fictif : Bruno et Claire sur Alpha, cette semaine et la suivante (clé de semaine = année ISO + n°, comme espace.js)
const pad2=n=>String(n).padStart(2,'0');const isoD=d=>d.getFullYear()+'-'+pad2(d.getMonth()+1)+'-'+pad2(d.getDate());
const weekKey=d=>{const x=new Date(d);x.setDate(x.getDate()+3-((x.getDay()+6)%7));const j=new Date(x.getFullYear(),0,4,12);return x.getFullYear()+'-W'+pad2(1+Math.round(((x-j)/864e5-3+((j.getDay()+6)%7))/7));};
{const t=new Date();t.setHours(12,0,0,0);const mon=new Date(t);mon.setDate(t.getDate()-((t.getDay()+6)%7));for(const k of [0,1]){const l=new Date(mon);l.setDate(mon.getDate()+7*k);const js=[0,1,2,3,4].map(i=>{const d=new Date(l);d.setDate(l.getDate()+i);return isoD(d);});const aff={};[SOUD.email,CHEF.email].forEach(key=>{aff[key]={};js.forEach(d=>{aff[key][d]=['SRV_A'];});});const wk=weekKey(l);PLAN[wk]={week:wk,data:{aff},updated_at:'2026-10-10T10:00:00Z'};}}
const CORS={'access-control-allow-origin':'*','access-control-allow-headers':'*','access-control-allow-methods':'GET, POST, PUT, PATCH, DELETE, OPTIONS'};
const browser=await chromium.launch({headless:true, executablePath: process.env.CHROMIUM_PATH||undefined});
const logs=[];
async function mkCtx(U,viewport,mobile){const ctx=await browser.newContext({viewport,isMobile:!!mobile,hasTouch:!!mobile,deviceScaleFactor:1});
  const user=()=>({id:U.id,aud:'authenticated',role:'authenticated',email:U.email,email_confirmed_at:'2026-10-08T09:00:00Z',app_metadata:{provider:'email'},user_metadata:{},identities:[],created_at:'2026-10-08T09:00:00Z',updated_at:new Date().toISOString()});
  const session=()=>{const t=now();return {access_token:b64u({alg:'HS256',typ:'JWT'})+'.'+b64u({iss:SB+'/auth/v1',sub:U.id,aud:'authenticated',exp:t+3600,iat:t,email:U.email,role:'authenticated'})+'.sig',token_type:'bearer',expires_in:3600,expires_at:t+3600,refresh_token:'rt-'+t,user:user()};};
  const mgr=MGR.has(U.email);
  await ctx.route(u=>u.href.startsWith(SB),async route=>{const req=route.request();const u=new URL(req.url());const p=u.pathname;const acc=req.headers()['accept']||'';
    const json=(o,status=200)=>route.fulfill({status,contentType:'application/json',headers:CORS,body:JSON.stringify(o)});
    if(req.method()==='OPTIONS')return route.fulfill({status:200,headers:CORS,body:''});
    let b={};try{b=JSON.parse(req.postData()||'{}');}catch(e){}
    if(p==='/auth/v1/token')return json(session());if(p==='/auth/v1/user')return json(user());if(p.startsWith('/auth/v1/'))return json({});
    if(p==='/rest/v1/profiles'){const m=/id=eq\.([^&]+)/.exec(u.search);const r=m?PROFILES.filter(x=>x.id===decodeURIComponent(m[1])):PROFILES;return json(/object/.test(acc)?(r[0]||null):r);}
    if(p==='/rest/v1/invites')return json([]);
    if(p==='/rest/v1/app_settings')return json(/object/.test(acc)?null:[]);
    if(p==='/rest/v1/rpc/registre_set'){const k=b.p_kind,id=String(b.p_id||'');calls.push({who:U.email,kind:k,id,patch:b.p_patch,mode:b.p_mode});
      /* règles serveur (sql/retours_14-10b.sql) : magcat / magmvt = droit magasin ; magdem = la personne (statut envoyée / annulée) ou l'encadrement / bureau / magasin ; vehicule / vrec = encadrement */
      let deny=null;if(k==='magcat'||k==='magmvt'){if(U.email!==MAG.email)deny='magasin : droit « Magasin » nécessaire';}
      else if(k==='magdem'){if(!mgr){if(id.split('|')[0].toLowerCase()!==U.email)deny='demande magasin d\'une autre personne : réservé au magasin / à l\'encadrement';else if(b.p_mode==='replace'||!['envoyee','annulee'].includes((b.p_patch||{}).statut))deny='demande magasin : ce changement est réservé au magasin';}}
      else if(k==='vehicule'||k==='vrec'){if(!mgr)deny='réservé à l\'encadrement / bureau';}
      if(deny){refus.push(U.email+' '+k+' '+id+' : '+deny);return json({code:'P0001',message:deny},400);}
      const key=k+'|'+id;const old=(REG[key]||{}).data||{};const data=b.p_mode==='replace'?(b.p_patch||{}):Object.assign({},old,b.p_patch||{});Object.keys(b.p_patch||{}).forEach(x=>{if(b.p_patch[x]===null)delete data[x];});
      REG[key]={kind:k,id,data,updated_at:new Date().toISOString()};return json(REG[key]);}
    if(p==='/rest/v1/registre'){const m=/kind=in\.%28([^)]+)%29/.exec(u.search)||/kind=in\.\(([^)]+)\)/.exec(decodeURIComponent(u.search));const kinds=m?decodeURIComponent(m[1]).replace(/"/g,'').split(','):null;
      /* lecture : magdem = encadrement / bureau / magasin ou le demandeur ; vrec = encadrement / bureau ou le conducteur */
      return json(Object.values(REG).filter(r=>!kinds||kinds.includes(r.kind)).filter(r=>r.kind!=='magdem'||mgr||r.id.split('|')[0].toLowerCase()===U.email).filter(r=>r.kind!=='vrec'||mgr||String(r.data.conducteurKey||'').toLowerCase()===U.email));}
    if(p==='/rest/v1/rpc/planning_set'){const row=PLAN[b.p_week]||(PLAN[b.p_week]={week:b.p_week,data:{aff:{}},updated_at:''});Object.entries((b.p_patch||{}).aff||{}).forEach(([k,v])=>{if(v===null)delete row.data.aff[k];else row.data.aff[k]=v;});row.updated_at=new Date().toISOString();return json(row);}
    if(p==='/rest/v1/planning')return json(Object.values(PLAN));
    if(p==='/rest/v1/sites'){const sel=u.searchParams.get('select')||'';if(req.method()!=='GET')return json([]);if(/chef:data/.test(sel)||/name/.test(sel)&&!/data,/.test(sel))return json(SITES);return json(/object/.test(acc)?null:[]);}
    if(p.startsWith('/rest/v1/rpc/'))return json(null);
    if(p.startsWith('/rest/v1/'))return json(/object/.test(acc)?null:[]);
    return json([]);});
  const page=await ctx.newPage();page.on('dialog',d=>d.accept().catch(()=>{}));
  page.on('pageerror',e=>logs.push(U.prenom+' PAGEERROR: '+e.message.slice(0,300)));page.on('console',m=>{if(m.type()==='error'&&!/realtime|websocket|Failed to fetch|net::ERR|404|400|open-meteo|geopf|geo\.api/i.test(m.text()))logs.push(U.prenom+': '+m.text().slice(0,200));});
  await page.route(u=>/open-meteo\.com$|(^|\.)geopf\.fr$|^geo\.api\.gouv\.fr$/.test(u.hostname),r=>r.fulfill({status:200,contentType:'application/json',body:'{}'}));
  return {ctx,page};}
const login=async(page,em)=>{await page.goto(BASE+'/index.html');await page.waitForTimeout(500);await page.evaluate(()=>{localStorage.clear();});await page.evaluate(()=>new Promise(r=>{try{const q=indexedDB.deleteDatabase('trace-kv');q.onsuccess=q.onerror=q.onblocked=()=>r();}catch(e){r();}}));await page.reload();await page.waitForTimeout(900);
  await page.fill('#loginEmail',em);await page.fill('#loginPwd','Test-2026!');await page.click('#loginGo');await page.waitForTimeout(3000);
  await page.evaluate(()=>{window.__docs=[];window.open=()=>({document:{write:h=>{window.__docs.push(h);},close(){}}});});}; /* impression : on garde le HTML au lieu d'ouvrir une fenêtre */
const C={};
const W=(pg,ms)=>pg.waitForTimeout(ms);
const xclick=async(pg,v)=>{await pg.evaluate(v=>{const el=document.querySelector(`#eq-app [data-act="x"][data-v="${v}"]`);if(!el)throw new Error('bouton absent : '+v+' · '+(document.getElementById('eq-app')||{textContent:''}).textContent.replace(/\s+/g,' ').slice(0,300));el.click();},v);await W(pg,250);};
const has=(pg,v)=>pg.evaluate(v=>!!document.querySelector(`#eq-app [data-act="x"][data-v="${v}"]`),v);
const setv=async(pg,sel,val,evs)=>{await pg.evaluate(([s,v,e])=>{const el=document.querySelector(s);if(!el)throw new Error('champ absent : '+s);if(el.type==='checkbox')el.checked=!!v;else el.value=v;(e||['input','change']).forEach(t=>el.dispatchEvent(new Event(t,{bubbles:true})));},[sel,val,evs]);await W(pg,200);};
const txt=pg=>pg.evaluate(()=>(document.getElementById('eq-app')||{textContent:''}).textContent.replace(/\s+/g,' '));
const toast=pg=>pg.evaluate(()=>(document.getElementById('toast')||{}).textContent||'');
const noOverflow=pg=>pg.evaluate(()=>document.documentElement.scrollWidth<=window.innerWidth+1&&(!document.getElementById('eq-app')||document.getElementById('eq-app').scrollWidth<=document.getElementById('eq-app').clientWidth+1));
const minBtn=pg=>pg.evaluate(()=>{const L=[...document.querySelectorAll('#eq-app .mag-root button, #eq-app .mag-root .btn')].filter(b=>b.offsetParent!==null&&!b.classList.contains('chip')&&!b.classList.contains('ac-back')).map(b=>b.getBoundingClientRect().height);return L.length?Math.min(...L):99;}); /* boutons côté terrain ≥ 40 px (le retour « ‹ » de l'appli fait 36 px, la pastille 34 : secondaires) */
const reg=(k,id)=>(REG[k+'|'+id]||{}).data;
const dems=()=>Object.values(REG).filter(r=>r.kind==='magdem').map(r=>Object.assign({id:r.id},r.data));
const mvts=()=>Object.values(REG).filter(r=>r.kind==='magmvt').map(r=>Object.assign({id:r.id},r.data));
const goMoiMag=async pg=>{await pg.evaluate(async()=>{document.getElementById('htEspace').click();await new Promise(r=>setTimeout(r,250));const c=[...document.querySelectorAll('#eq-app .eq-subs .chip')].find(x=>/Magasin/.test(x.textContent));if(!c)throw new Error('sous-onglet Magasin absent');c.click();});await W(pg,300);};
const goMoiSub=async(pg,re)=>{await pg.evaluate(async re=>{document.getElementById('htEspace').click();await new Promise(r=>setTimeout(r,250));const c=[...document.querySelectorAll('#eq-app .eq-subs .chip')].find(x=>new RegExp(re).test(x.textContent));if(!c)throw new Error('sous-onglet absent : '+re);c.click();},re);await W(pg,300);};
const goParc=async pg=>{await pg.evaluate(()=>document.getElementById('htParc').click());await W(pg,350);};
const goHub=async pg=>{await pg.evaluate(()=>document.getElementById('htEq').click());await W(pg,400);};
const shot=(pg,name)=>pg.screenshot({path:SHOTS+'/'+name+'.png'}).catch(()=>{});
const shotAt=async(pg,name,sel)=>{await pg.evaluate(s=>{const el=document.querySelector(s);if(el)el.scrollIntoView({block:'center'});},sel);await W(pg,250);await shot(pg,name);}; /* la capture montre l'élément visé */
const docs=pg=>pg.evaluate(()=>window.__docs||[]);

// ── 1) la référente importe le pack fictif ; 🧰 Fiches type : une fiche par dotation, ses lignes (désignation, dotation, à la demande, unité, lien stock, contrôle / observation)
const R=await mkCtx(MAG,{width:1366,height:800});await login(R.page,MAG.email);
await goParc(R.page);await xclick(R.page,'mag|mseg|cat');
await R.page.setInputFiles('#eq-app input[data-xin="mag|pack"]',{name:'pack-fictif.json',mimeType:'application/json',buffer:Buffer.from(JSON.stringify(PACK))});await W(R.page,1800);
let out={toast:await toast(R.page)};
await xclick(R.page,'mag|mseg|fiches');out.list=await R.page.evaluate(()=>[...document.querySelectorAll('#eq-app .mag-row')].map(x=>x.textContent.replace(/\s+/g,' ').trim()));out.chips=await R.page.evaluate(()=>[...document.querySelectorAll('#eq-app .eq-filtres .chip')].map(c=>c.textContent.trim()));
await shot(R.page,'pc_1366_fiches_type_liste');
await xclick(R.page,'mag|fiopen|p:soudeur');out.fiche=await txt(R.page);
out.lignes=await R.page.evaluate(()=>[...document.querySelectorAll('#eq-app .mag-lines .mag-li')].map(x=>x.querySelector('.mag-lt b').textContent+'|'+x.querySelector('.mag-qv').textContent.replace(/\s+/g,' ').trim()+'|'+x.querySelector('.mag-lt small').textContent.replace(/\s+/g,' ').trim()));
out.btns=await Promise.all(['mag|eqstart|p:soudeur','mag|fiprint|p:soudeur','mag|fiedit|','mag|fidup|p:soudeur'].map(v=>has(R.page,v)));out.minB=await minBtn(R.page);
await shot(R.page,'pc_1366_fiche_type_soudure');
console.log('1) fiches type depuis le pack :',JSON.stringify({...out,fiche:out.fiche.slice(0,200)}));
C.c1=/10 articles, 3 listes, 2 dotations/.test(out.toast)&&out.chips.some(c=>/Fiches type/.test(c))&&out.list.length===2&&/Dotation fictive soudure5 articles · dont 1 à la demande · mise à jour 01\/01\/2026/.test(out.list[0])&&/Dotation fictive manchon1 article/.test(out.list[1])
  &&out.lignes.length===5&&/^Courroie \(fictive\)\|2 u\|🔗 Courroie fictive \(T-08\) · stock 8 u · contrôle : contrôle fictif$/.test(out.lignes[0])&&/^Disque A \(fictif\)\|10 u\|🔗 Disque fictif A \(T-01\)/.test(out.lignes[2])&&/à la demande du chef/.test(out.lignes[2])
  &&/^Gilet \(fictif\)\|1 u\|pas de lien avec le stock · taille à préciser$/.test(out.lignes[3])&&/^Ruban \(fictif\)\|1 rouleau\|🔗 Ruban fictif \(X-RUBAN-FICTIF\) · stock 0 rouleau$/.test(out.lignes[4])&&out.btns.every(Boolean)&&out.minB>=40&&/à la demande/.test(out.fiche);

// ── 2) retouches par le magasin : quantité, ligne retirée, ligne ajoutée depuis le catalogue, ligne libre ; survie au réimport du pack ; dupliquer + titre
await xclick(R.page,'mag|fiedit|');
await setv(R.page,'#eq-app input[data-xin="mag|fiq|T-08"]','3',['change']);await W(R.page,300);
await xclick(R.page,'mag|firm|X-RUBAN-FICTIF');
await setv(R.page,'#eq-app input[data-xin="mag|fiq2"]','bouchon',['input']);await xclick(R.page,'mag|fiadd|T-09');
await setv(R.page,'#eq-app input[data-xin="mag|fiq2"]','Marteau fictif',['input']);await xclick(R.page,'mag|fiaddtxt|');
await setv(R.page,'#eq-app input[data-xin="mag|fiald|T-07"]',true,['change']);await W(R.page,1500);
out={row:reg('magcat','fiche|p:soudeur')};out.rowS=out.row&&{t8:(out.row.edits||{})['T-08'],rub:(out.row.edits||{})['X-RUBAN-FICTIF'],t7:(out.row.edits||{})['T-07'],aj:(out.row.ajouts||[]).map(a=>a.ref+':'+a.label+':'+a.qte),by:out.row.editedBy};
await shotAt(R.page,'pc_1366_fiche_type_modification','#eq-app .mag-lines');
await xclick(R.page,'mag|fiedit|');out.after=await R.page.evaluate(()=>[...document.querySelectorAll('#eq-app .mag-lines .mag-li')].map(x=>x.querySelector('.mag-lt b').textContent+'|'+x.querySelector('.mag-qv').textContent.replace(/\s+/g,' ').trim()));out.tags=await R.page.evaluate(()=>[...document.querySelectorAll('#eq-app .mag-tag')].map(x=>x.textContent));
/* réimport du pack : les lignes du pack reviennent à jour, les retouches de l'appli restent */
await xclick(R.page,'mag|mseg|cat');await R.page.setInputFiles('#eq-app input[data-xin="mag|pack"]',{name:'pack-fictif.json',mimeType:'application/json',buffer:Buffer.from(JSON.stringify(PACK))});await W(R.page,1800);
await xclick(R.page,'mag|mseg|fiches');await xclick(R.page,'mag|fiopen|p:soudeur');out.reimp=await R.page.evaluate(()=>[...document.querySelectorAll('#eq-app .mag-lines .mag-li')].map(x=>x.querySelector('.mag-lt b').textContent+'|'+x.querySelector('.mag-qv').textContent.replace(/\s+/g,' ').trim()));
/* dupliquer → copie de l'appli, ouverte en modification, titre */
await xclick(R.page,'mag|fidup|p:soudeur');out.dupToast=await toast(R.page);out.titreIn=await R.page.evaluate(()=>!!document.querySelector('#eq-app input[data-xin="mag|fititre"]'));
await setv(R.page,'#eq-app input[data-xin="mag|fititre"]','Camion manchonneur v2',['change']);await W(R.page,1500);
const DUP=Object.values(REG).find(r=>r.kind==='magcat'&&/^fiche\|a:/.test(r.id));out.dup=DUP&&{titre:DUP.data.titre,n:(DUP.data.articles||[]).length,base:DUP.data.base,src:DUP.data.source};
await xclick(R.page,'mag|fiedit|');await xclick(R.page,'mag|fiback|');out.list2=await R.page.evaluate(()=>[...document.querySelectorAll('#eq-app .mag-row')].map(x=>x.textContent.replace(/\s+/g,' ').trim()));
console.log('2) retouches, réimport, dupliquer :',JSON.stringify({...out,row:undefined}));
C.c2=out.rowS&&out.rowS.t8&&out.rowS.t8.qte===3&&out.rowS.rub&&out.rowS.rub.off===true&&out.rowS.t7&&out.rowS.t7.aLaDemande===true&&out.rowS.aj.join()==='T-09:Bouchon fictif:1,null:Marteau fictif:1'&&out.rowS.by==='Marie TESTMAGASIN'
  &&out.after.join()==='Courroie (fictive)|3 u,Truelle (fictive)|1 u,Disque A (fictif)|10 u,Gilet (fictif)|1 u,Bouchon fictif|1 u,Marteau fictif|1'&&out.tags.includes('quantité modifiée ici')&&out.tags.includes('ajouté dans l\'appli')&&out.reimp.join()===out.after.join()
  &&/dupliquée/.test(out.dupToast)&&out.titreIn&&out.dup&&out.dup.titre==='Camion manchonneur v2'&&out.dup.n===6&&out.dup.base==='p:soudeur'&&out.dup.src==='appli'&&out.list2.length===3&&/Camion manchonneur v26 articles.*créée dans l'appli/.test(out.list2[2]);

// ── 3) imprimer la fiche ; équiper un véhicule : véhicule du métier d'office, conducteur proposé, comparaison à l'inventaire de la remise → les manquants, demande créée
await xclick(R.page,'mag|fiopen|p:soudeur');await xclick(R.page,'mag|fiprint|p:soudeur');out={print:(await docs(R.page))[0]||''};
await xclick(R.page,'mag|eqstart|p:soudeur');
out.groups=await R.page.evaluate(()=>[...document.querySelectorAll('#eq-app select[data-xin="mag|eqveh"] optgroup')].map(g=>g.label+':'+[...g.querySelectorAll('option')].map(o=>o.value).join('/')));
await setv(R.page,'#eq-app select[data-xin="mag|eqveh"]','AA-111-AA',['change']);
out.pers=await R.page.evaluate(()=>(document.querySelector('#eq-app select[data-xin="mag|eqpers"]')||{}).value);out.rec=/Remise du 10\/10 à Bruno TESTSOUDEUR : inventaire de 3 articles, 1 manquant/.test(await txt(R.page));
out.n0=await R.page.evaluate(()=>(document.querySelector('#eq-app .mag-bar .mag-bn')||{}).textContent);
await xclick(R.page,'mag|eqcmp|');out.cmp=await R.page.evaluate(()=>[...document.querySelectorAll('#eq-app .mag-cmp .mag-tag')].map(x=>x.textContent));out.lineTags=await R.page.evaluate(()=>[...document.querySelectorAll('#eq-app .mag-lines .mag-li')].map(x=>x.querySelector('.mag-lt b').textContent+':'+(x.querySelector('.mag-tag')||{}).textContent));
await shot(R.page,'pc_1366_equiper_vehicule_comparaison');
await xclick(R.page,'mag|eqmiss|');out.n1=await R.page.evaluate(()=>(document.querySelector('#eq-app .mag-bar .mag-bn')||{}).textContent);out.onLines=await R.page.evaluate(()=>[...document.querySelectorAll('#eq-app .mag-lines .mag-li:not(.off) .mag-lt b')].map(x=>x.textContent));
await xclick(R.page,'mag|eqall|');await xclick(R.page,'mag|eqinc|T-01');await xclick(R.page,'mag|eqinc|T-01');out.n2=await R.page.evaluate(()=>(document.querySelector('#eq-app .mag-bar .mag-bn')||{}).textContent);out.q01=await R.page.evaluate(()=>{const b=document.querySelector('#eq-app [data-v="mag|eqinc|T-01"]');return b&&b.parentElement.querySelector('.n').textContent;});
await setv(R.page,'#eq-app textarea[data-xin="mag|eqnote"]','Gilet taille L',['input']);
await xclick(R.page,'mag|eqsend|');await W(R.page,1500);out.toast=await toast(R.page);out.landed=await txt(R.page);
const D1=dems().find(d=>d.byKey===SOUD.email&&d.origine==='fiche');out.d1=D1&&{st:D1.statut,imp:D1.imputation,l:D1.lignes.map(l=>l.ref+':'+l.qte),fiche:D1.fiche&&D1.fiche.id,by:D1.byName,cree:D1.creePar,note:D1.note,b:D1.besoinLe,h:(D1.histo[0]||{}).note};
console.log('3) imprimer, équiper un véhicule :',JSON.stringify({...out,print:out.print.length,landed:out.landed.slice(0,260)}));
C.c3=/Fiche type — Dotation fictive soudure/.test(out.print)&&/Immatriculation/.test(out.print)&&/Présent/.test(out.print)&&/Manquant/.test(out.print)&&/Visa du magasin/.test(out.print)&&/Courroie \(fictive\)/.test(out.print)&&/Marteau fictif/.test(out.print)&&/@page\{size:A4/.test(out.print)
  &&out.groups.join()==='Véhicules du métier:AA-111-AA,Autres véhicules du parc:BB-222-BB/CC-333-CC'&&out.pers===SOUD.email&&out.rec&&/^4\s*articles/.test(out.n0)&&out.cmp.join()==='2 présents,1 manquant,3 pas dans l\'inventaire'
  &&out.lineTags.includes('Courroie (fictive):présent à l\'inventaire')&&out.lineTags.includes('Truelle (fictive):manquant à l\'inventaire')&&out.lineTags.includes('Bouchon fictif:pas dans l\'inventaire')&&/^1\s*article/.test(out.n1)&&out.onLines.join()==='Truelle (fictive)'
  &&/^5\s*articles/.test(out.n2)&&out.q01==='11'&&/Demande créée pour Bruno TESTSOUDEUR : 5 articles, véhicule AA-111-AA/.test(out.toast)&&/Bruno TESTSOUDEUR Envoyée/.test(out.landed)&&/fiche type « Dotation fictive soudure » par Marie TESTMAGASIN/.test(out.landed)
  &&out.d1&&out.d1.st==='envoyee'&&out.d1.imp.type==='vehicule'&&out.d1.imp.id==='AA-111-AA'&&out.d1.l.join()==='T-08:3,T-01:11,null:1,T-09:1,null:1'&&out.d1.fiche==='p:soudeur'&&out.d1.by==='Bruno TESTSOUDEUR'&&out.d1.cree==='Marie TESTMAGASIN'&&/Équipement du véhicule AA-111-AA[\s\S]*Gilet taille L/.test(out.d1.note)&&out.d1.b===undefined&&/pour Bruno TESTSOUDEUR/.test(out.d1.h);
const ID1=D1&&D1.id;

// ── 4) le soudeur, au téléphone : la demande reçue ; les fiches type en lecture (équiper pour soi) ; nouvelle demande sans « besoin le », case urgent
const Sd=await mkCtx(SOUD,{width:390,height:844},true);await login(Sd.page,SOUD.email);
await goMoiMag(Sd.page);out={row:await Sd.page.evaluate(()=>[...document.querySelectorAll('#eq-app .mag-row')].map(x=>x.textContent.replace(/\s+/g,' ').trim())[0]||'')};
await xclick(Sd.page,'mag|open|'+ID1);out.fiche=await txt(Sd.page);out.ov0=await noOverflow(Sd.page);await xclick(Sd.page,'mag|list');
await xclick(Sd.page,'mag|fiches|');out.flist=await Sd.page.evaluate(()=>[...document.querySelectorAll('#eq-app .mag-row')].length);out.ov1=await noOverflow(Sd.page);
await xclick(Sd.page,'mag|fiopen|p:soudeur');out.edit=await has(Sd.page,'mag|fiedit|');out.eq=await has(Sd.page,'mag|eqstart|p:soudeur');out.ov2=await noOverflow(Sd.page);out.minB=await minBtn(Sd.page);
await shot(Sd.page,'tel_390_fiche_type');
await xclick(Sd.page,'mag|eqstart|p:soudeur');out.persSel=await Sd.page.evaluate(()=>!!document.querySelector('#eq-app select[data-xin="mag|eqpers"]'));out.persTxt=/La demande sera à ton nom : Bruno TESTSOUDEUR/.test(await txt(Sd.page));out.ov3=await noOverflow(Sd.page);
await shot(Sd.page,'tel_390_equiper_vehicule');
await xclick(Sd.page,'mag|eqx|');await xclick(Sd.page,'mag|fiback|');await xclick(Sd.page,'mag|list');
await xclick(Sd.page,'mag|new');await xclick(Sd.page,'mag|inc|T-01');await xclick(Sd.page,'mag|step|2');out.besoin=/Besoin le|Demain/.test(await txt(Sd.page));out.urgBtn=await has(Sd.page,'mag|urgent');
await xclick(Sd.page,'mag|imp|depot');await xclick(Sd.page,'mag|urgent');out.urgOn=await Sd.page.evaluate(()=>document.querySelector('#eq-app [data-v="mag|urgent"]').classList.contains('on'));out.ov4=await noOverflow(Sd.page);
await shot(Sd.page,'tel_390_demande_urgent_sans_besoin_le');
await xclick(Sd.page,'mag|send');await W(Sd.page,1500);
const D2=dems().find(d=>d.byKey===SOUD.email&&d.id!==ID1&&!d.direct);out.d2=D2&&{st:D2.statut,urg:D2.urgent,b:D2.besoinLe,l:D2.lignes.map(l=>l.ref).join()};out.list=await Sd.page.evaluate(()=>[...document.querySelectorAll('#eq-app .mag-row')].map(x=>x.textContent.replace(/\s+/g,' ').trim()));
console.log('4) soudeur au téléphone :',JSON.stringify({...out,fiche:out.fiche.slice(0,220)}));
C.c4=/5 articles · 🚐 AA-111-AA Fictif/.test(out.row)&&/fiche type/.test(out.row)&&!/pour le/.test(out.row)&&/depuis la fiche type « Dotation fictive soudure » par Marie TESTMAGASIN/.test(out.fiche)&&out.ov0&&out.flist===3&&out.ov1&&!out.edit&&out.eq&&out.ov2&&out.minB>=40
  &&!out.persSel&&out.persTxt&&out.ov3&&!out.besoin&&out.urgBtn&&out.urgOn&&out.ov4&&out.d2&&out.d2.st==='envoyee'&&out.d2.urg===true&&out.d2.b===undefined&&out.d2.l==='T-01'&&out.list.some(t=>/⚡ urgent/.test(t));
const ID2=D2&&D2.id;

// ── 5) pastilles du planning : le chef (hub « commandes au dépôt de l'équipe », Tes compagnons, fiche de personne, sous-vues en lecture) ; le soudeur sur Ta semaine
const Ch=await mkCtx(CHEF,{width:1100,height:900});await login(Ch.page,CHEF.email);
await goHub(Ch.page);out={hub:await Ch.page.evaluate(()=>{const r=[...document.querySelectorAll('#eq-app .ac-row')].find(x=>/Commandes au dépôt/.test(x.textContent));return r?{t:r.textContent.replace(/\s+/g,' ').trim(),go:r.dataset.v}:null;})};
await shotAt(Ch.page,'pc_1366_hub_chef_commandes','#eq-app .ac-row[data-v="x:mag:equipe"]');
await Ch.page.evaluate(()=>{const r=[...document.querySelectorAll('#eq-app .ac-row')].find(x=>/Commandes au dépôt/.test(x.textContent));if(r)r.click();});await W(Ch.page,500);
out.equipe=await txt(Ch.page);out.eqRows=await Ch.page.evaluate(()=>[...document.querySelectorAll('#eq-app .mag-row')].map(x=>x.textContent.replace(/\s+/g,' ').trim()));
await shot(Ch.page,'pc_1366_hub_chef_commandes_equipe');
await xclick(Ch.page,'mag|xopen|'+ID1);out.ro=await txt(Ch.page);out.roBtn=await has(Ch.page,'mag|start|'+ID1);await xclick(Ch.page,'mag|xback|');
await goHub(Ch.page);await Ch.page.evaluate(()=>{const r=[...document.querySelectorAll('#eq-app .ac-row')].find(x=>/Mon planning et mon équipe/.test(x.textContent));if(r)r.click();});await W(Ch.page,500);
out.plan=await Ch.page.evaluate(()=>{const r=[...document.querySelectorAll('#eq-app .eq-row[data-act=fiche]')].find(x=>/Bruno/.test(x.textContent));return r?{t:r.textContent.replace(/\s+/g,' ').trim(),pb:[...r.querySelectorAll('.mag-pb')].map(p=>p.textContent.trim()+'|'+p.dataset.v+'|'+Math.round(p.getBoundingClientRect().height))}:null;});
await shotAt(Ch.page,'pc_1366_planning_chef_pastille','#eq-app .eq-row[data-act=fiche] .mag-pb');
await Ch.page.evaluate(()=>{const p=document.querySelector('#eq-app .eq-row[data-act=fiche] .mag-pb');if(p)p.click();});await W(Ch.page,500);out.pers=await txt(Ch.page);out.persRows=await Ch.page.evaluate(()=>[...document.querySelectorAll('#eq-app .mag-row')].length);
await shot(Ch.page,'pc_1366_demandes_dune_personne_lecture');
/* fiche de la personne (panneau) : la carte 📦 Magasin */
await goHub(Ch.page);await Ch.page.evaluate(()=>{const r=[...document.querySelectorAll('#eq-app .ac-row')].find(x=>/Mon planning et mon équipe/.test(x.textContent));if(r)r.click();});await W(Ch.page,400);
await Ch.page.evaluate(()=>{const r=[...document.querySelectorAll('#eq-app .eq-row[data-act=fiche]')].find(x=>/Bruno/.test(x.textContent));r.dispatchEvent(new MouseEvent('click',{bubbles:true}));});await W(Ch.page,400);
out.card=await Ch.page.evaluate(()=>{const c=[...document.querySelectorAll('#eq-app .eq-sheet .card')].find(x=>/📦 Magasin/.test(x.textContent));return c?c.textContent.replace(/\s+/g,' ').trim():'';});
/* le soudeur : Ta semaine → sa pastille → Moi → Magasin */
await goMoiSub(Sd.page,'Planning');out.mine=await Sd.page.evaluate(()=>[...document.querySelectorAll('#eq-app .mag-pbs .mag-pb')].map(p=>p.textContent.trim()));out.ovM=await noOverflow(Sd.page);
await shot(Sd.page,'tel_390_ta_semaine_pastille');
await Sd.page.evaluate(()=>document.querySelector('#eq-app .mag-pbs .mag-pb').click());await W(Sd.page,500);out.mineGo=/mes demandes au dépôt/.test(await txt(Sd.page));
console.log('5) pastilles du planning :',JSON.stringify({...out,equipe:out.equipe.slice(0,200),ro:out.ro.slice(0,160),pers:out.pers.slice(0,160)}));
C.c5=out.hub&&/Commandes au dépôt de l'équipe2 en attente — touche pour voir qui/.test(out.hub.t)&&out.hub.go==='x:mag:equipe'&&/Commandes au dépôt · ton équipe/.test(out.equipe)&&/Bruno TESTSOUDEUR2 demandes/.test(out.equipe)&&out.eqRows.length===2
  &&/Lecture seule/.test(out.ro)&&/fiche type « Dotation fictive soudure »/.test(out.ro)&&!out.roBtn&&out.plan&&/Bruno TESTSOUDEUR/.test(out.plan.t)&&out.plan.pb.length===1&&/^📦 2 en attente\|mag\|pers\|bruno\.testsoudeur@exemple\.fr\|(3[4-9]|4\d)$/.test(out.plan.pb[0])
  &&/demandes de Bruno TESTSOUDEUR/.test(out.pers)&&out.persRows===2&&/📦 Magasin/.test(out.card)&&/2 en attente/.test(out.card)&&out.mine.join()==='📦 2 en attente'&&out.ovM&&out.mineGo;

// ── 6) prête en partie : reliquat en suspens (attendu le…), À commander, le gars prévenu « en partie », remise (sorties), 2e préparation → terminée
await goParc(R.page);await xclick(R.page,'mag|mseg|dem');await xclick(R.page,'mag|rf');await W(R.page,1200);out={file:await R.page.evaluate(()=>[...document.querySelectorAll('#eq-app .mag-row')].map(x=>x.textContent.replace(/\s+/g,' ').trim()))};
await xclick(R.page,'mag|mopen|'+ID1);await xclick(R.page,'mag|start|'+ID1);await W(R.page,1200);
out.btn=await has(R.page,'mag|pretpart|'+ID1);
await setv(R.page,'#eq-app input[data-xin="mag|prep|0"]','1',['input']);await setv(R.page,'#eq-app input[data-xin="mag|prep|1"]','0',['input']);
await xclick(R.page,'mag|pretpart|'+ID1);out.box=await txt(R.page);
await setv(R.page,'#eq-app input[data-xin="mag|partatt"]','2026-10-25',['input','change']);await setv(R.page,'#eq-app input[data-xin="mag|partnote"]','à commander chez Alpha',['input']);
await shotAt(R.page,'pc_1366_prete_en_partie','#eq-app input[data-xin="mag|partatt"]');
await xclick(R.page,'mag|pretpartok|'+ID1);await W(R.page,1500);out.toast=await toast(R.page);
let d=reg('magdem',ID1);out.d=d&&{st:d.statut,p:d.partiel,rel:(d.reliquat||[]).map(r=>r.ref+':'+r.qte).join(),att:d.reliquatAttendu,note:d.reliquatNote,h:(d.histo[d.histo.length-1]||{}).note,prep:d.lignes.map(l=>l.prep).join()};
await xclick(R.page,'mag|mseg|cmd');out.cmd=await R.page.evaluate(()=>{const c=document.querySelector('#eq-app .mag-relc');return c?[...c.querySelectorAll('.mag-ar')].map(b=>b.dataset.v.split('|')[2]+':'+b.querySelector('.mag-sv b').textContent+':'+b.querySelector('.mag-sv small').textContent.replace(/\s+/g,' ').trim()):null;});out.kpi=await R.page.evaluate(()=>[...document.querySelectorAll('#eq-app .eq-kpi')].map(k=>k.textContent.replace(/\s+/g,' ').trim()));
await shotAt(R.page,'pc_1366_a_commander_reliquats','#eq-app .mag-relh');
/* le soudeur est prévenu « en partie » */
await goMoiMag(Sd.page);await xclick(Sd.page,'mag|rf');await W(Sd.page,1500);out.row=await Sd.page.evaluate(()=>[...document.querySelectorAll('#eq-app .mag-row')].map(x=>x.textContent.replace(/\s+/g,' ').trim())[0]||'');
await xclick(Sd.page,'mag|open|'+ID1);out.fiche=await txt(Sd.page);await shot(Sd.page,'tel_390_prete_en_partie');await xclick(Sd.page,'mag|list');
await Sd.page.evaluate(()=>document.getElementById('htHome').click());await W(Sd.page,600);out.task=await Sd.page.evaluate(()=>{const n=[...document.querySelectorAll('#eq-app [data-act=notif]')].find(x=>/prête au dépôt/.test(x.textContent));return n?n.textContent.replace(/\s+/g,' ').trim():'';});
/* remise : ce qui est préparé sort du stock (T-08:1, T-07:1, T-09:1 ; les lignes sans réf. ne bougent pas le stock), le reliquat reste */
await xclick(R.page,'mag|mseg|dem');await xclick(R.page,'mag|mopen|'+ID1);await xclick(R.page,'mag|remettre|'+ID1);await W(R.page,1600);d=reg('magdem',ID1);out.st3=d.statut;out.mv=mvts().filter(m=>m.demande===ID1).map(m=>m.ref+':'+m.qte).sort().join();out.ui=await txt(R.page);
await xclick(R.page,'mag|reliquat|'+ID1);await W(R.page,1300);out.relInputs=await R.page.evaluate(()=>[...document.querySelectorAll('#eq-app input[data-xin^="mag|prep|"]')].map(i=>i.dataset.xin+'='+i.value));
await xclick(R.page,'mag|pret|'+ID1);await W(R.page,1500);d=reg('magdem',ID1);out.st4=[d.statut,'partiel' in d,'reliquat' in d,'reliquatAttendu' in d].join();
await xclick(R.page,'mag|remettre|'+ID1);await W(R.page,1500);d=reg('magdem',ID1);out.fin=d.statut;out.mv2=mvts().filter(m=>m.demande===ID1).length;
console.log('6) prête en partie :',JSON.stringify({...out,box:out.box.slice(0,0),fiche:out.fiche.slice(0,240),ui:out.ui.slice(0,200)}));
C.c6=out.file[0]&&/⚡ urgent/.test(out.file[0])&&/1 article · 📦 Dépôt/.test(out.file[0])&&out.btn&&/Prête en partie · reliquat en suspens/.test(out.box)&&/Courroie \(fictive\) : 2 · Disque A \(fictif\) : 11/.test(out.box)&&/Prête en partie : 2 articles en suspens, reliquat 13/.test(out.toast)
  &&out.d&&out.d.st==='prete'&&out.d.p===true&&out.d.rel==='T-08:2,T-01:11'&&out.d.att==='2026-10-25'&&out.d.note==='à commander chez Alpha'&&/partielle — reliquat 13 attendu le 25\/10 — à commander chez Alpha/.test(out.d.h)&&out.d.prep==='1,0,1,1,1'
  &&out.cmd&&out.cmd.join()==='T-08:2:u · pour Bruno TESTSOUDEUR · attendu le 25/10,T-01:11:u · pour Bruno TESTSOUDEUR · attendu le 25/10'&&out.kpi.some(k=>/^2\s*reliquats en suspens/.test(k))
  &&/Prête au dépôt en partie/.test(out.row)&&/Prête au dépôt en partie : 2 articles manquent, reliquat à venir \(attendu le 25\/10\)\. Tu peux passer retirer ce qui est prêt\./.test(out.fiche)&&/Ta demande est prête au dépôt \(en partie : 2 articles manquent, reliquat à venir \(attendu le 25\/10\)\)/.test(out.task)
  &&out.st3==='remise'&&out.mv==='T-08:1,T-09:1'&&/Retirée · reliquat à venir/.test(out.ui)&&/Reliquat en suspens : Courroie \(fictive\) × 2 · Disque A \(fictif\) × 11 · attendu le 25\/10 · à commander chez Alpha/.test(out.ui)
  &&out.relInputs.join()==='mag|prep|0=2,mag|prep|1=11'&&out.st4==='prete,false,false,false'&&out.fin==='cloturee'&&out.mv2===4;

// ── 7) nouvel article : référence proposée, doublon détecté (désignation normalisée, alias), créer quand même / ouvrir celui-là, photo, survie au réimport
await xclick(R.page,'mag|mseg|stock');await xclick(R.page,'mag|nanew|');out={refVide:await R.page.evaluate(()=>document.querySelector('#eq-app input[data-xin="mag|na|ref"]').value)};
await setv(R.page,'#eq-app input[data-xin="mag|na|label"]','Disques fictifs A',['input']);await setv(R.page,'#eq-app input[data-xin="mag|na|famille"]','Abrasifs',['input','change']);
out.refProp=await R.page.evaluate(()=>document.querySelector('#eq-app input[data-xin="mag|na|ref"]').value);
await setv(R.page,'#eq-app input[data-xin="mag|na|unite"]','u',['input']);await setv(R.page,'#eq-app input[data-xin="mag|na|tampon"]','4',['input']);await setv(R.page,'#eq-app input[data-xin="mag|na|emplacement"]','B3',['input']);await setv(R.page,'#eq-app input[data-xin="mag|na|fournisseur"]','FOURNISSEUR ALPHA',['input']);await setv(R.page,'#eq-app input[data-xin="mag|na|prix"]','2.5',['input']);await setv(R.page,'#eq-app input[data-xin="mag|na|stock"]','7',['input']);
await xclick(R.page,'mag|namet|soudeur');
const PNG=Buffer.from('iVBORw0KGgoAAAANSUhEUgAAAAIAAAACCAIAAAD91JpzAAAAFklEQVR4nGP8z8DwHwyBFJCNxGIAAIq6B/1l3M+bAAAAAElFTkSuQmCC','base64');
await R.page.setInputFiles('#eq-app input[data-xin="mag|naphoto"]',{name:'photo-fictive.png',mimeType:'image/png',buffer:PNG});await W(R.page,800);out.photoPrev=await R.page.evaluate(()=>!!document.querySelector('#eq-app img.mag-photo'));
await xclick(R.page,'mag|naok|');out.dup=await R.page.evaluate(()=>{const w=document.querySelector('#eq-app .warnbox');return w?w.textContent.replace(/\s+/g,' ').trim():'';});out.dupBtns=await Promise.all(['mag|naopen|T-01','mag|naforce|'].map(v=>has(R.page,v)));out.pasCree=!reg('magcat','catalogue')['ABR-001'];
await shotAt(R.page,'pc_1366_nouvel_article_doublon','#eq-app .warnbox');
await xclick(R.page,'mag|naforce|');await W(R.page,1500);out.toast=await toast(R.page);out.art=await txt(R.page);
const A1=(reg('magcat','catalogue')||{})['ABR-001'];out.a1=A1&&{label:A1.label,fam:A1.famille,src:A1.source,tampon:A1.tampon,prix:A1.prix,st:A1.stockInit,met:(A1.metiers||[]).join(),by:A1.createdBy,photo:A1.photo};out.ph=!!(reg('magcat','photo|ABR-001')||{}).img;
/* « Oui, ouvrir celui-là » : alias (DISQUE ALPHA) → fiche de T-01 */
await xclick(R.page,'mag|artback|');await xclick(R.page,'mag|nanew|');await setv(R.page,'#eq-app input[data-xin="mag|na|label"]','disque alpha',['input']);await xclick(R.page,'mag|naok|');out.dup2=await R.page.evaluate(()=>{const w=document.querySelector('#eq-app .warnbox');return w?w.textContent.replace(/\s+/g,' ').trim():'';});
await xclick(R.page,'mag|naopen|T-01');out.open=await R.page.evaluate(()=>(document.querySelector('#eq-app .card h3')||{}).textContent);
/* réimport du pack : l'article créé dans l'appli reste */
await xclick(R.page,'mag|mseg|cat');await R.page.setInputFiles('#eq-app input[data-xin="mag|pack"]',{name:'pack-fictif.json',mimeType:'application/json',buffer:Buffer.from(JSON.stringify(PACK))});await W(R.page,1800);
out.survit=!!(reg('magcat','catalogue')||{})['ABR-001'];await xclick(R.page,'mag|mseg|stock');out.stockRow=await R.page.evaluate(()=>{const b=document.querySelector('#mag-stock [data-v="mag|art|ABR-001"]');return b?b.textContent.replace(/\s+/g,' ').trim():'';});
console.log('7) nouvel article :',JSON.stringify({...out,art:out.art.slice(0,200)}));
C.c7=out.refVide==='ART-001'&&out.refProp==='ABR-001'&&out.photoPrev&&/Ressemble à : Disque fictif A \(T-01\) — même désignation/.test(out.dup)&&/C'est le même article \?/.test(out.dup)&&out.dupBtns.every(Boolean)&&out.pasCree
  &&/Article créé : Disques fictifs A \(ABR-001\) — malgré la ressemblance/.test(out.toast)&&/Disques fictifs A/.test(out.art)&&/Article créé dans l'appli par Marie TESTMAGASIN/.test(out.art)&&out.a1&&out.a1.fam==='Abrasifs'&&out.a1.src==='appli'&&out.a1.tampon===4&&out.a1.prix===2.5&&out.a1.st===7&&out.a1.met==='soudeur'&&out.a1.by==='Marie TESTMAGASIN'&&out.a1.photo===true&&out.ph
  &&/Ressemble à : Disque fictif A \(T-01\) — même alias/.test(out.dup2)&&out.open==='Disque fictif A'&&out.survit&&/Disques fictifs A/.test(out.stockRow)&&/7/.test(out.stockRow);

// ── 8) entrée multiple (scan + recherche, lot, bon imprimé, journal groupé) ; sortie multiple pour quelqu'un et un chantier (la personne la voit dans Moi → Magasin)
await xclick(R.page,'mag|mseg|mvt');await xclick(R.page,'mag|lonew|entree');out={motifs:await R.page.evaluate(()=>[...document.querySelectorAll('#eq-app .mag-sgb')].map(b=>b.textContent+(b.classList.contains('on')?'*':'')))};
await setv(R.page,'#eq-app input[data-xin="mag|lo|fourn"]','FOURNISSEUR BETA',['input']);await setv(R.page,'#eq-app input[data-xin="mag|lo|bl"]','BL-LOT-1',['input']);await setv(R.page,'#eq-app input[data-xin="mag|lo|note"]','colis fictif',['input']);
await setv(R.page,'#eq-app input[data-xin="mag|loscan"]','t-02',['input','change']);out.scan=await toast(R.page);
await setv(R.page,'#eq-app input[data-xin="mag|loscan"]','ZZ-INCONNU',['input','change']);out.scanKo=await toast(R.page);
await setv(R.page,'#eq-app input[data-xin="mag|loq"]','courroie',['input']);out.res=await R.page.evaluate(()=>[...document.querySelectorAll('#mag-lores .mag-lt b')].map(x=>x.textContent));
for(let i=0;i<3;i++)await R.page.evaluate(()=>document.querySelector('#mag-lores [data-v="mag|loinc|T-08"]').click());await W(R.page,300);
out.bar=await R.page.evaluate(()=>(document.querySelector('#eq-app .mag-bar .mag-bn')||{}).textContent);await shot(R.page,'pc_1366_entree_multiple');
await xclick(R.page,'mag|look|');await W(R.page,1600);out.toast=await toast(R.page);out.detail=await txt(R.page);
const E=mvts().filter(m=>m.type==='entree'&&m.lot);out.ent=E.map(m=>[m.ref,m.qte,m.motif,m.fournisseur,m.bl,m.note,m.lotN].join('|')).sort();out.lots=[...new Set(E.map(m=>m.lot))].length;const LOT1=E[0]&&E[0].lot;
await xclick(R.page,'mag|loprint|'+LOT1);out.bon=(await docs(R.page)).pop()||'';
await shot(R.page,'pc_1366_bon_entree');
await xclick(R.page,'mag|lox|');out.journal=await R.page.evaluate(()=>[...document.querySelectorAll('#eq-app .card .ac-row, #eq-app .card .mag-mv')].map(x=>x.textContent.replace(/\s+/g,' ').trim()).slice(0,3));
/* sortie pour Bruno, chantier Alpha, motif dotation */
await xclick(R.page,'mag|lonew|sortie');out.motifsS=await R.page.evaluate(()=>[...document.querySelectorAll('#eq-app .mag-sgb')].map(b=>b.textContent));
await setv(R.page,'#eq-app select[data-xin="mag|lo|pers"]',SOUD.email,['change']);await setv(R.page,'#eq-app select[data-xin="mag|lo|site"]','SRV_A',['change']);
await setv(R.page,'#eq-app input[data-xin="mag|loscan"]','T-06',['input','change']);await setv(R.page,'#eq-app input[data-xin="mag|loscan"]','T-06',['input','change']);
await setv(R.page,'#eq-app input[data-xin="mag|loscan"]','ABR-001',['input','change']);
await xclick(R.page,'mag|look|');await W(R.page,1600);out.toastS=await toast(R.page);
const SO=mvts().filter(m=>m.type==='sortie'&&m.lot);out.sor=SO.map(m=>[m.ref,m.qte,m.motif,m.imputation&&m.imputation.id,m.pourKey,m.pourName].join('|')).sort();const LOT2=SO[0]&&SO[0].lot;
const DD=dems().find(x=>x.direct);out.direct=DD&&{id0:DD.id.split('|')[0],st:DD.statut,lot:DD.lot===LOT2,l:DD.lignes.map(l=>l.ref+':'+l.qte+':'+l.remis).join(),imp:DD.imputation.id,h:DD.histo.map(h=>h.statut).join()};
await xclick(R.page,'mag|loprint|'+LOT2);out.bonS=(await docs(R.page)).pop()||'';
await xclick(R.page,'mag|mseg|stock');const stock=await R.page.evaluate(()=>Object.fromEntries([...document.querySelectorAll('#mag-stock .mag-ar')].map(b=>[b.dataset.v.split('|')[2],b.querySelector('.mag-sv b').textContent.trim()])));out.stock=[stock['T-02'],stock['T-08'],stock['T-06'],stock['ABR-001']].join();
/* Bruno voit la sortie dans Moi → Magasin */
await goMoiMag(Sd.page);await xclick(Sd.page,'mag|rf');await W(Sd.page,1500);out.term=await Sd.page.evaluate(()=>{const s=document.querySelector('#eq-app details.mag-det summary');if(s)s.click();return [...document.querySelectorAll('#eq-app details.mag-det .mag-row')].map(x=>x.textContent.replace(/\s+/g,' ').trim());});
await xclick(Sd.page,'mag|open|'+DD.id);out.vu=await txt(Sd.page);out.ovD=await noOverflow(Sd.page);await shot(Sd.page,'tel_390_sortie_remise_sans_demande');await xclick(Sd.page,'mag|list');
console.log('8) entrées / sorties multiples :',JSON.stringify({...out,detail:out.detail.slice(0,220),bon:out.bon.length,bonS:out.bonS.length,vu:out.vu.slice(0,220)}));
C.c8=out.motifs.join()==='Réception fournisseur*,Retour chantier,Retour atelier,Inventaire'&&/\+1 Baguette fictive B/.test(out.scan)&&/Référence inconnue : ZZ-INCONNU/.test(out.scanKo)&&out.res.join()==='Courroie fictive'&&/^2\s*articles/.test(out.bar)
  &&/Entrée enregistrée : 2 articles/.test(out.toast)&&/Bon d'entrée/.test(out.detail)&&/BL BL-LOT-1/.test(out.detail)&&/colis fictif/.test(out.detail)&&out.ent.join(';')==='T-02|1|Réception fournisseur|FOURNISSEUR BETA|BL-LOT-1|colis fictif|0;T-08|3|Réception fournisseur|FOURNISSEUR BETA|BL-LOT-1|colis fictif|1'&&out.lots===1
  &&/Bon d'entrée de stock/.test(out.bon)&&/BL-LOT-1/.test(out.bon)&&/Courroie fictive/.test(out.bon)&&/Baguette fictive B/.test(out.bon)&&/Visa du magasin/.test(out.bon)&&/^⬇Entrée · 2 articles · Réception fournisseur · FOURNISSEUR BETA · BL BL-LOT-1/.test(out.journal[0]||'')&&!/Baguette/.test(out.journal[1]||'')
  &&out.motifsS.join()==='Dotation,Dépannage,Chantier,Casse / perte,Autre'&&/Sortie enregistrée : 2 articles pour Bruno TESTSOUDEUR/.test(out.toastS)&&out.sor.join(';')==='ABR-001|1|Dotation|SRV_A|bruno.testsoudeur@exemple.fr|Bruno TESTSOUDEUR;T-06|2|Dotation|SRV_A|bruno.testsoudeur@exemple.fr|Bruno TESTSOUDEUR'
  &&out.direct&&out.direct.id0===SOUD.email&&out.direct.st==='cloturee'&&out.direct.lot&&out.direct.l==='T-06:2:2,ABR-001:1:1'&&out.direct.imp==='SRV_A'&&out.direct.h==='remise,cloturee'&&/Bon de sortie de stock/.test(out.bonS)&&/Crayon fictif/.test(out.bonS)&&/Bruno TESTSOUDEUR/.test(out.bonS)
  &&out.stock==='6,8,28,6'&&out.term.some(t=>/2 articles · 🏗 Chantier fictif Alpharemis le .* sans demandeTerminée/.test(t))&&/Remis par le magasin le/.test(out.vu)&&/sortie de stock sans demande \(bon n°/.test(out.vu)&&/Crayon fictif/.test(out.vu)&&out.ovD;

// ── 9) écrans de la référente à 390 px : pas de débordement, boutons ≥ 40 px (pastilles ≥ 34)
await R.page.setViewportSize({width:390,height:844});await W(R.page,300);out={};
await xclick(R.page,'mag|mseg|fiches');out.fiches=await noOverflow(R.page);await xclick(R.page,'mag|fiopen|p:soudeur');out.fiche=await noOverflow(R.page);out.minF=await minBtn(R.page);
await xclick(R.page,'mag|fiedit|');out.edit=await noOverflow(R.page);await shotAt(R.page,'tel_390_fiche_type_modification','#eq-app .mag-lines');await xclick(R.page,'mag|fiedit|');
await xclick(R.page,'mag|eqstart|p:soudeur');await setv(R.page,'#eq-app select[data-xin="mag|eqveh"]','AA-111-AA',['change']);await xclick(R.page,'mag|eqcmp|');out.equip=await noOverflow(R.page);out.minE=await minBtn(R.page);await xclick(R.page,'mag|eqx|');
await xclick(R.page,'mag|mseg|stock');await xclick(R.page,'mag|nanew|');out.na=await noOverflow(R.page);await shot(R.page,'tel_390_nouvel_article');await xclick(R.page,'mag|nax|');
await xclick(R.page,'mag|mseg|mvt');out.mvt=await noOverflow(R.page);await xclick(R.page,'mag|lonew|entree');await setv(R.page,'#eq-app input[data-xin="mag|loq"]','moufle',['input']);out.lot=await noOverflow(R.page);out.minL=await minBtn(R.page);await shot(R.page,'tel_390_entree_multiple');await xclick(R.page,'mag|lox|');
await xclick(R.page,'mag|loopen|'+LOT1);out.bon=await noOverflow(R.page);await xclick(R.page,'mag|lox|');
await xclick(R.page,'mag|mseg|cmd');out.cmd=await noOverflow(R.page);await xclick(R.page,'mag|mseg|dem');await xclick(R.page,'mag|mopen|'+ID2);await xclick(R.page,'mag|start|'+ID2);await W(R.page,800);await xclick(R.page,'mag|pretpart|'+ID2);out.part=await noOverflow(R.page);
console.log('9) 390 px :',JSON.stringify(out));
C.c9=['fiches','fiche','edit','equip','na','mvt','lot','bon','cmd','part'].every(k=>out[k])&&out.minF>=40&&out.minE>=40&&out.minL>=40;

// ── 10) le conducteur (sans le droit magasin, PC) : Parc → Magasin = seulement 🧰 Fiches type ; Planning des équipes : pastille sur la carte de Bruno ; équiper le véhicule pour Bruno
const Cd=await mkCtx(COND,{width:1366,height:800});await login(Cd.page,COND.email);
await goParc(Cd.page);await Cd.page.evaluate(()=>{const b=document.querySelector('#eq-app [data-act=parcseg][data-v=magasin]');if(b)b.click();});await W(Cd.page,500);
out={chips:await Cd.page.evaluate(()=>{const F=[...document.querySelectorAll('#eq-app .mag-root .eq-filtres')].pop();return F?[...F.querySelectorAll('.chip')].map(c=>c.textContent.trim()):[];}),list:await Cd.page.evaluate(()=>[...document.querySelectorAll('#eq-app .mag-row')].length)};
out.stockChip=await has(Cd.page,'mag|mseg|stock'); /* sans le droit « Magasin » : ni stock, ni demandes */
await xclick(Cd.page,'mag|fiopen|p:soudeur');out.edit=await has(Cd.page,'mag|fiedit|');
await goHub(Cd.page);await Cd.page.evaluate(()=>{const r=[...document.querySelectorAll('#eq-app .ac-row')].find(x=>/Planning des équipes/.test(x.textContent));if(r)r.click();});await W(Cd.page,600);
out.chip=await Cd.page.evaluate(()=>{const c=[...document.querySelectorAll('#eq-app .eq-plsite[data-drop=SRV_A] .eq-plchip')].find(x=>/Bruno/.test(x.textContent));return c?[...c.querySelectorAll('.mag-pb')].map(p=>p.textContent.trim()):null;});
await shotAt(Cd.page,'pc_1366_planning_equipes_pastille','#eq-app .eq-plsite[data-drop=SRV_A] .mag-pb');
await Cd.page.evaluate(()=>{const c=[...document.querySelectorAll('#eq-app .eq-plsite[data-drop=SRV_A] .eq-plchip')].find(x=>/Bruno/.test(x.textContent));c.querySelector('.mag-pb').click();});await W(Cd.page,500);out.pers=/demandes de Bruno TESTSOUDEUR/.test(await txt(Cd.page));
await goParc(Cd.page);await Cd.page.evaluate(()=>{const b=document.querySelector('#eq-app [data-act=parcseg][data-v=magasin]');if(b)b.click();});await W(Cd.page,400);await xclick(Cd.page,'mag|mseg|fiches');await xclick(Cd.page,'mag|fiopen|p:soudeur');await xclick(Cd.page,'mag|eqstart|p:soudeur');
await setv(Cd.page,'#eq-app select[data-xin="mag|eqveh"]','AA-111-AA',['change']);out.persSel=await Cd.page.evaluate(()=>(document.querySelector('#eq-app select[data-xin="mag|eqpers"]')||{}).value);
await xclick(Cd.page,'mag|eqsend|');await W(Cd.page,1500);out.toast=await toast(Cd.page);const D3=dems().find(x=>x.byKey===SOUD.email&&x.creeParKey===COND.email);out.d3=D3&&[D3.statut,D3.imputation.id,D3.lignes.length,D3.creePar].join();out.back=/Dotation fictive soudure/.test(await txt(Cd.page))&&!(await Cd.page.evaluate(()=>!!document.querySelector('#eq-app select[data-xin="mag|eqveh"]')));
console.log('10) conducteur :',JSON.stringify(out));
C.c10=out.chips.join()==='🧰 Fiches type'&&out.list===3&&!out.stockChip&&!out.edit&&out.chip&&out.chip.join()==='📦 en préparation'&&out.pers&&out.persSel===SOUD.email&&/Demande créée pour Bruno TESTSOUDEUR : 4 articles, véhicule AA-111-AA/.test(out.toast)&&out.d3==='envoyee,AA-111-AA,4,Denis TESTCONDUC'&&out.back;

out={refus,logs:logs.length};console.log('serveur simulé : refus',JSON.stringify(refus),'· erreurs console',logs.length);
C.c11=refus.length===0&&logs.length===0;
await R.ctx.close();await Sd.ctx.close();await Ch.ctx.close();await Cd.ctx.close();
const bad=Object.entries(C).filter(([k,v])=>!v).map(([k])=>k);console.log(bad.length?'RESULTAT: ECHEC '+bad.join(','):'RESULTAT: TOUT VERT');console.log(logs.length?logs:'[]');
await browser.close();
