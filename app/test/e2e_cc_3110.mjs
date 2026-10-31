// e2e_cc_3110.mjs — 31/10 (lot CC) : COMMANDES V1 SANS MAGASIN (demandes + suivi des remises) et COMPTE CHANTIER. Données 100 % FICTIVES.
// PARTIE A — connecté, Supabase SIMULÉ avec les règles de droits du serveur (registre_set : magdem = la personne crée / annule SA demande tant qu'elle est envoyée,
// l'encadrement / bureau (rôle chef / bureau) écrit le reste ; commande = encadrement / bureau ; lecture magdem = encadrement ou le demandeur). Comptes fictifs :
// Bruno TESTSOUDEUR (soudeur, téléphone 390 puis 360 px), Claire TESTCHEF (chef de chantier), Denis TESTCONDUC (conducteur, PC 1366 px). Pack magasin fictif (2 listes).
// Paliers ALLUMÉS : « demandes » et « comptechantier » passés au Socle, « magasin » reste Labo (Bruno, Socle, ne voit pas le Magasin).
//  c1  le gars : Compagnon → Mes demandes (pas de Magasin), nouvelle demande = article de sa liste (Disque × 3) + taille (Moufles M × 2) + texte libre (Cales × 10),
//      chantier, ⚡ urgent, photo (stockage), note → au serveur : circuit achat, statut envoyée, 3 lignes, imputation chantier
//  c2  le conducteur : « À faire » (1 demande à traiter, urgente), Pilotage → Achats & comptes → Demandes de matériel → Commandé (fournisseur, date prévue,
//      bon de commande pré-rempli : brouillon, chantier, fournisseur, 3 lignes, livraison) → le bon s'ouvre dans Bons de commande
//  c3  Livré / remis EN PARTIE (2 / 2 / 4) → « livrée en partie » ; le gars : notification (À savoir + pastille), fiche « le reste suit » ; puis Livré le reste → « livrée »
//  c4  refus avec motif (le gars voit le motif, notification rouge) ; annulation par le gars d'une demande encore envoyée (acceptée par le serveur)
//  c5  le chef de chantier : pas de file des demandes ni de compte chantier dans Pilotage (droits) ; le conducteur a les deux lignes
//  c6  paliers éteints (tout le monde voit tout) : Magasin ET Mes demandes ; le Magasin ignore les demandes « sans magasin » (aucun stock, aucun mouvement magmvt)
//  c7  téléphone 390 ET 360 px : rien ne déborde, boutons ≥ 44 px (≥ 34 pour le ✕ d'une photo) ; aucune écriture refusée par le serveur simulé
// PARTIE B — hors connexion (personnages de démo, horloge figée au mercredi 28/10/2026), jeu fictif : chantier « Villefictive — Chantier Nord » (cc_nord),
// affaires O2610-81 (ce seul chantier ; taux chef 65 €/h ; location 900 € oct., sous-traitance 1 500 € sept.) et O2610-82 (deux chantiers : 250 € « autre » rattaché à
// cc_nord, 777 € sans chantier → signalé, non compté), base de prix fictive test/fixture_prix.xlsx (Soudeur 100 €/h, Manchonneur 80 €/h).
//  Heures (navette) : Karim (soudeur) 5→9/10 5 × 8 h + 14-15/09 2 × 8 h validées + 12/10 8 h à confirmer + 13/10 8 h sur un AUTRE chantier ; Julien (manchonneur)
//  5→7/10 3 × 8 h + dimanche 11/10 6 h (hors navette) ; Ethan (chef) 5-6/10 2 × 10 h → Soudeur 64 h = 6 400 € (dont 8 h à confirmer), Manchonneur 24 h = 1 920 €,
//  Chef 20 h × 65 = 1 300 € → main-d'œuvre 9 620 € (108 h). Bons : 1 400 (reçu, oct.) + 2 500 (envoyé, oct.) + 330 (facturé : facture 330 ≠ 300, sept.) = 4 230 € ;
//  brouillon 999 € listé non compté ; autre chantier absent. Notes de frais : 120 TTC validée (oct.) → 100 HT, 48 TTC remboursée (sept.) → 40 HT ; 60 en attente ;
//  refusée et autre chantier absentes. → TOUT : 9 620 + 4 230 + 140 + 1 500 + 900 + 250 = 16 640 € ; OCTOBRE : 8 020 + 3 900 + 100 + 1 150 = 13 170 € ; SEPTEMBRE 3 470 €.
//  c8  Pilotage → Compte d'un chantier → choix → compte : tuiles, heures par poste, bons, dépenses, totaux par nature, avertissement « sans chantier »
//  c9  période : un mois (octobre 13 170 €, ‹ septembre 3 470 €), retour à « Tout »
//  c10 impression A4 (charte) : titre, totaux, postes
//  c11 Bureau du chantier → tuile 💶 → le compte s'ouvre dans Pilotage
//  c12 droits : le soudeur n'a ni la tuile ni l'onglet ; paliers allumés : option Labo → cachée pour une personne Socle, passée au Socle → visible
//  c13 390 / 360 / 1366 px : rien ne déborde
//  c14 zéro erreur console (les deux parties)
//  c15 hors connexion (personnages de démo) : le soudeur demande avec une photo gardée DANS la demande (pas de stockage), le bureau la livre, le soudeur voit « Livrée » ;
//      rien ne part dans la file d'envoi (données de démo : appareil seulement)
import { chromium } from 'playwright';
import fs from 'fs';import path from 'path';import zlib from 'zlib';import {fileURLToPath} from 'url';
const HERE=path.dirname(fileURLToPath(import.meta.url));
const BASE=process.env.BASE||'http://127.0.0.1:8833';
const SHOTS=process.env.SHOTS||'/root/work/cc_shots';try{fs.mkdirSync(SHOTS,{recursive:true});}catch(e){}
const SB='https://pghftlepduvfazbiavhq.supabase.co';
const C={};const J=x=>JSON.stringify(x);const logs=[];
const sp=s=>String(s||'').replace(/[  ]/g,' ').replace(/\s+/g,' ');
/* petite image PNG fictive (photo de la demande) */
function png(w,h,rgb){const T=[];for(let n=0;n<256;n++){let c=n;for(let k=0;k<8;k++)c=c&1?0xedb88320^(c>>>1):c>>>1;T[n]=c>>>0;}const crc=b=>{let c=0xffffffff;for(const x of b)c=T[(c^x)&0xff]^(c>>>8);return (c^0xffffffff)>>>0;};
  const chunk=(t,d)=>{const l=Buffer.alloc(4);l.writeUInt32BE(d.length);const td=Buffer.concat([Buffer.from(t),d]);const c=Buffer.alloc(4);c.writeUInt32BE(crc(td));return Buffer.concat([l,td,c]);};
  const ih=Buffer.alloc(13);ih.writeUInt32BE(w,0);ih.writeUInt32BE(h,4);ih[8]=8;ih[9]=2;const raw=Buffer.alloc((w*3+1)*h);for(let y=0;y<h;y++)for(let x=0;x<w;x++){const o=y*(w*3+1)+1+x*3;raw[o]=rgb[0];raw[o+1]=(rgb[1]+x*3)%256;raw[o+2]=rgb[2];}
  return Buffer.concat([Buffer.from([0x89,0x50,0x4e,0x47,0x0d,0x0a,0x1a,0x0a]),chunk('IHDR',ih),chunk('IDAT',zlib.deflateSync(raw)),chunk('IEND',Buffer.alloc(0))]);}
const PNG=png(64,48,[200,120,40]);
const browser=await chromium.launch({headless:true, executablePath: process.env.CHROMIUM_PATH||undefined});
const W=(pg,ms)=>pg.waitForTimeout(ms);
const shot=(pg,name)=>pg.screenshot({path:SHOTS+'/'+name+'.png'}).catch(e=>console.log('capture '+name+' : '+e.message));
const xclick=async(pg,v)=>{await pg.evaluate(v=>{const el=document.querySelector(`#eq-app [data-act="x"][data-v="${v}"]`);if(!el)throw new Error('bouton absent : '+v+' · '+(document.getElementById('eq-app')||{textContent:''}).textContent.replace(/\s+/g,' ').slice(0,400));el.click();},v);await W(pg,300);};
const has=(pg,sel)=>pg.evaluate(s=>!!document.querySelector(s),sel);
const setv=async(pg,sel,val,evs)=>{await pg.evaluate(([s,v,e])=>{const el=document.querySelector(s);if(!el)throw new Error('champ absent : '+s);if(el.type==='checkbox')el.checked=!!v;else el.value=v;(e||['input','change']).forEach(t=>el.dispatchEvent(new Event(t,{bubbles:true})));},[sel,val,evs]);await W(pg,200);};
const txt=pg=>pg.evaluate(()=>(document.getElementById('eq-app')||{textContent:''}).textContent.replace(/[  ]/g,' ').replace(/\s+/g,' '));
const noOverflow=pg=>pg.evaluate(()=>document.documentElement.scrollWidth<=window.innerWidth+1);
const minBtn=(pg,root)=>pg.evaluate(r=>{const L=[...document.querySelectorAll('#eq-app '+r+' button, #eq-app '+r+' .btn')].filter(b=>b.offsetParent!==null&&!b.classList.contains('chip')&&!b.classList.contains('ac-back')&&!b.closest('.dm-ph')).map(b=>Math.round(b.getBoundingClientRect().height));return L.length?Math.min(...L):99;},root);
const subs=pg=>pg.evaluate(()=>[...document.querySelectorAll('#eq-app .eq-subs .chip')].map(c=>c.textContent.trim()));
const goMoiSub=async(pg,re)=>{await pg.evaluate(async re=>{document.getElementById('htEspace').click();await new Promise(r=>setTimeout(r,300));const c=[...document.querySelectorAll('#eq-app .eq-subs .chip')].find(x=>new RegExp(re).test(x.textContent));if(!c)throw new Error('sous-onglet absent : '+re);c.click();},re);await W(pg,350);};
const goHub=async pg=>{await pg.evaluate(()=>{document.getElementById('htEq').click();});await W(pg,450);};
const goAff=async pg=>{await pg.evaluate(()=>{document.getElementById('htAff').click();});await W(pg,450);}; /* 31/10 matin (Ethan : « bons de commande et débours : pas avec le suivi opérationnel ») : le compte chantier est dans le module Affaire ; les demandes restent dans Pilotage */
const goAccueil=async pg=>{await pg.evaluate(()=>{document.getElementById('htHome').click();});await W(pg,450);};
const hubRow=async(pg,go)=>{await pg.evaluate(go=>{const b=document.querySelector(`#eq-app [data-act="xgo"][data-v="${go}"]`);if(!b)throw new Error('ligne du hub absente : '+go);b.click();},go);await W(pg,400);};

/* ═════════════ PARTIE A : connecté, serveur simulé ═════════════ */
const b64u=o=>Buffer.from(JSON.stringify(o)).toString('base64').replace(/=+$/,'').replace(/\+/g,'-').replace(/\//g,'_');
const now=()=>Math.floor(Date.now()/1000);
const SOUD={id:'aaaaaaaa-1111-4111-8111-111111111111',email:'bruno.testsoudeur@exemple.fr',prenom:'Bruno',nom:'TESTSOUDEUR',poste:'soudeur',role:'soudeur'};
const CHEF={id:'cccccccc-3333-4333-8333-333333333333',email:'claire.testchef@exemple.fr',prenom:'Claire',nom:'TESTCHEF',poste:'chef',role:'bureau'};
const COND={id:'dddddddd-4444-4444-8444-444444444444',email:'denis.testconduc@exemple.fr',prenom:'Denis',nom:'TESTCONDUC',poste:'conducteur',role:'bureau'};
const USERS=[SOUD,CHEF,COND];const MGR=new Set([CHEF.email,COND.email]); /* rôle serveur chef / bureau */
const PROFILES=USERS.map(u=>({id:u.id,email:u.email,name:u.prenom+' '+u.nom,prenom:u.prenom,nom:u.nom,role:u.role,active:true,poste:u.poste,admin:false,type:'salarie',rights:{},sites:null,created_at:'2026-10-08T09:00:00Z'}));
const SITES=[{id:'SRV_A',name:'Chantier fictif Alpha',supplier:'LOGSTOR',updated_at:'2026-10-01T08:00:00Z',geo:null,origin:null,bgo:null,sat:null,w:null,h:null,bbox:null,nbox:null,nw:40,deleted:null,deletedAt:null,builtin:null,ville:'Villefictive',chef:CHEF.email,conducteur:COND.email,secteur:'ouest',etude:null},
  {id:'SRV_B',name:'Chantier fictif Bravo',supplier:'LOGSTOR',updated_at:'2026-10-01T08:00:00Z',geo:null,origin:null,bgo:null,sat:null,w:null,h:null,bbox:null,nbox:null,nw:20,deleted:null,deletedAt:null,builtin:null,ville:'Autreville',chef:null,conducteur:null,secteur:'ouest',etude:null}];
const REG={};const PLAN={};const calls=[];const refus=[];const SETTINGS={paliers:{v:1,on:true,feat:{demandes:'socle',comptechantier:'socle'},people:{},extra:{},at:'2026-10-30T20:00:00Z',by:'test'}};
const seed=(kind,id,data)=>{REG[kind+'|'+id]={kind,id,data,updated_at:'2026-10-10T10:00:00Z'};};
/* pack magasin FICTIF (structure importée par magasin.js : catalogue = {réf: article}, config = {listes}) */
const ART=(ref,label,unite)=>({ref,label,famille:'Fictif',unite,actif:true,stockInit:0,stockAt:'2026-10-01T00:00:00Z'});
seed('magcat','catalogue',Object.fromEntries([ART('T-01','Disque fictif A','u'),ART('T-02','Baguette fictive B','paquet'),ART('T-03','Moufle fictive S','paire'),ART('T-04','Moufle fictive M','paire'),ART('T-05','Moufle fictive L','paire')].map(a=>[a.ref,a])));
seed('magcat','config',{at:'2026-10-01T00:00:00Z',by:'test',nArticles:5,dotations:[],listes:[
  {id:'liste-soudure',titre:'Liste fictive soudure',pour:['soudeur','tuyauteur'],lignes:[{n:1,section:'Consommables fictifs',ref:'T-01',label:'Disque A (fictif)',unite:'u'},{n:2,section:'Consommables fictifs',ref:'T-02',label:'Paquet de baguettes B (fictif)',unite:'paquet'}]},
  {id:'liste-tous',titre:'Liste fictive pour tous',pour:['tous'],lignes:[{n:10,section:'Protection fictive',ref:null,label:'Moufles (fictives)',unite:'paire',choix:'taille',variantes:[{libelle:'S',ref:'T-03'},{libelle:'M',ref:'T-04'},{libelle:'L',ref:'T-05'}]}]}]});
/* planning fictif : Bruno et Claire sur Alpha cette semaine (clé de semaine comme espace.js) */
const pad2=n=>String(n).padStart(2,'0');const isoD=d=>d.getFullYear()+'-'+pad2(d.getMonth()+1)+'-'+pad2(d.getDate());
const weekKey=d=>{const x=new Date(d);x.setDate(x.getDate()+3-((x.getDay()+6)%7));const j=new Date(x.getFullYear(),0,4,12);return x.getFullYear()+'-W'+pad2(1+Math.round(((x-j)/864e5-3+((j.getDay()+6)%7))/7));};
{const t=new Date();t.setHours(12,0,0,0);const mon=new Date(t);mon.setDate(t.getDate()-((t.getDay()+6)%7));const js=[0,1,2,3,4].map(i=>{const d=new Date(mon);d.setDate(mon.getDate()+i);return isoD(d);});const aff={};[SOUD.email,CHEF.email].forEach(k=>{aff[k]={};js.forEach(d=>{aff[k][d]=['SRV_A'];});});const wk=weekKey(mon);PLAN[wk]={week:wk,data:{aff},updated_at:'2026-10-01T08:00:00Z'};}
const PREVUE=isoD(new Date(Date.now()+4*864e5));
const CORS={'access-control-allow-origin':'*','access-control-allow-headers':'*','access-control-allow-methods':'GET, POST, PUT, PATCH, DELETE, OPTIONS'};
async function mkCtx(U,viewport,mobile){const ctx=await browser.newContext({viewport,isMobile:!!mobile,hasTouch:!!mobile,deviceScaleFactor:1});
  const user=()=>({id:U.id,aud:'authenticated',role:'authenticated',email:U.email,email_confirmed_at:'2026-10-08T09:00:00Z',app_metadata:{provider:'email'},user_metadata:{},identities:[],created_at:'2026-10-08T09:00:00Z',updated_at:new Date().toISOString()});
  const session=()=>{const t=now();return {access_token:b64u({alg:'HS256',typ:'JWT'})+'.'+b64u({iss:SB+'/auth/v1',sub:U.id,aud:'authenticated',exp:t+3600,iat:t,email:U.email,role:'authenticated'})+'.sig',token_type:'bearer',expires_in:3600,expires_at:t+3600,refresh_token:'rt-'+t,user:user()};};
  const mgr=MGR.has(U.email);
  await ctx.route(u=>u.href.startsWith(SB),async route=>{const req=route.request();const u=new URL(req.url());const p=u.pathname;const acc=req.headers()['accept']||'';
    const json=(o,status=200)=>route.fulfill({status,contentType:'application/json',headers:CORS,body:JSON.stringify(o)});
    if(req.method()==='OPTIONS')return route.fulfill({status:200,headers:CORS,body:''});
    let b={};try{b=JSON.parse(req.postData()||'{}');}catch(e){}
    if(p==='/auth/v1/token')return json(session());if(p==='/auth/v1/user')return json(user());if(p.startsWith('/auth/v1/'))return json({});
    if(p.startsWith('/storage/v1/object/sign/')){if(req.method()==='GET')return route.fulfill({status:200,contentType:'image/png',headers:CORS,body:PNG});calls.push({who:U.email,kind:'storage-sign',id:p});return json({signedURL:p.replace('/storage/v1','')+'?token=fictif'});}
    if(p.startsWith('/storage/v1/object/')){calls.push({who:U.email,kind:'storage',id:p});return json({Key:p.replace('/storage/v1/object/',''),Id:'id-fictif'});}
    if(p==='/rest/v1/profiles'){const m=/id=eq\.([^&]+)/.exec(u.search);const r=m?PROFILES.filter(x=>x.id===decodeURIComponent(m[1])):PROFILES;return json(/object/.test(acc)?(r[0]||null):r);}
    if(p==='/rest/v1/invites')return json([]);
    if(p==='/rest/v1/app_settings'){const m=/key=eq\.([a-z_]+)/.exec(u.search);const k=m&&decodeURIComponent(m[1]);const single=/vnd\.pgrst\.object/.test(acc);const row=k&&SETTINGS[k]?{value:SETTINGS[k]}:null;return single?(row?json(row):route.fulfill({status:406,contentType:'application/json',headers:CORS,body:'{"message":"no rows"}'})):json(row?[row]:[]);}
    if(p==='/rest/v1/rpc/registre_set'){const k=b.p_kind,id=String(b.p_id||'');calls.push({who:U.email,kind:k,id,patch:b.p_patch,mode:b.p_mode});
      /* règles du serveur (sql/retours_19-10vh.sql) */
      let deny=null;if(k==='magcat'||k==='magmvt')deny='magasin : droit « Magasin » nécessaire';
      else if(k==='magdem'){if(!mgr){const old=(REG[k+'|'+id]||{}).data;if(id.split('|')[0].toLowerCase()!==U.email)deny='demande magasin d\'une autre personne : réservé au magasin / à l\'encadrement';else if(b.p_mode==='replace'||!['envoyee','annulee'].includes((b.p_patch||{}).statut))deny='demande magasin : ce changement est réservé au magasin';else if(old&&(old.statut||'envoyee')!=='envoyee')deny='demande déjà prise en charge par le magasin : vois avec le référent';}}
      else if(['commande','vehicule','vrec','affaire','doc'].includes(k)){if(!mgr)deny='réservé à l\'encadrement / bureau';}
      else if(k==='debours'){if(!mgr&&id.split('|')[0].toLowerCase()!==U.email)deny='réservé à la personne elle-même';}
      if(deny){refus.push(U.email+' '+k+' '+id+' : '+deny);return json({code:'P0001',message:deny},400);}
      const key=k+'|'+id;const old=(REG[key]||{}).data||{};const data=b.p_mode==='replace'?(b.p_patch||{}):Object.assign({},old,b.p_patch||{});Object.keys(b.p_patch||{}).forEach(x=>{if(b.p_patch[x]===null)delete data[x];});
      REG[key]={kind:k,id,data,updated_at:new Date().toISOString()};return json(REG[key]);}
    if(p==='/rest/v1/registre'){const m=/kind=in\.%28([^)]+)%29/.exec(u.search)||/kind=in\.\(([^)]+)\)/.exec(decodeURIComponent(u.search));const kinds=m?decodeURIComponent(m[1]).replace(/"/g,'').split(','):null;
      return json(Object.values(REG).filter(r=>!kinds||kinds.includes(r.kind)).filter(r=>r.kind!=='magdem'||mgr||r.id.split('|')[0].toLowerCase()===U.email));}
    if(p==='/rest/v1/rpc/planning_set'){const row=PLAN[b.p_week]||(PLAN[b.p_week]={week:b.p_week,data:{aff:{}},updated_at:''});Object.entries((b.p_patch||{}).aff||{}).forEach(([k,v])=>{if(v===null)delete row.data.aff[k];else row.data.aff[k]=v;});row.updated_at=new Date().toISOString();return json(row);}
    if(p==='/rest/v1/planning')return json(Object.values(PLAN));
    if(p==='/rest/v1/sites'){const sel=u.searchParams.get('select')||'';if(req.method()!=='GET')return json([]);if(/chef:data/.test(sel)||/name/.test(sel)&&!/data,/.test(sel))return json(SITES);return json(/object/.test(acc)?null:[]);}
    if(p.startsWith('/rest/v1/rpc/'))return json(null);
    if(p.startsWith('/rest/v1/'))return json(/object/.test(acc)?null:[]);
    return json([]);});
  const page=await ctx.newPage();page.on('dialog',d=>d.accept().catch(()=>{}));
  page.on('pageerror',e=>logs.push(U.prenom+' PAGEERROR: '+e.message.slice(0,300)));page.on('console',m=>{if(m.type()==='error'&&!/realtime|websocket|Failed to fetch|net::ERR|404|400|406|open-meteo|geopf|geo\.api/i.test(m.text()))logs.push(U.prenom+': '+m.text().slice(0,200));});
  await page.route(u=>/open-meteo\.com$|(^|\.)geopf\.fr$|^geo\.api\.gouv\.fr$/.test(u.hostname),r=>r.fulfill({status:200,contentType:'application/json',body:'{}'}));
  return {ctx,page};}
const login=async(page,em)=>{await page.goto(BASE+'/index.html');await page.waitForTimeout(500);await page.evaluate(()=>{localStorage.clear();});await page.evaluate(()=>new Promise(r=>{try{const q=indexedDB.deleteDatabase('trace-kv');q.onsuccess=q.onerror=q.onblocked=()=>r();}catch(e){r();}}));await page.reload();await page.waitForTimeout(900);
  await page.fill('#loginEmail',em);await page.fill('#loginPwd','Test-2026!');await page.click('#loginGo');await page.waitForTimeout(3200);await stubOpen(page);};
const stubOpen=pg=>pg.evaluate(()=>{window.__docs=[];window.open=()=>({document:{write:h=>{window.__docs.push(h);},close(){}}});}); /* impression : on garde le HTML */
const relaunch=async pg=>{await pg.reload();await pg.waitForTimeout(3200);await stubOpen(pg);};
const reg=(k,id)=>(REG[k+'|'+id]||{}).data;
const demsSrv=()=>Object.values(REG).filter(r=>r.kind==='magdem').map(r=>Object.assign({id:r.id},r.data));
const openDem=async(pg,id)=>{if(!(await has(pg,`#eq-app [data-act="x"][data-v="dem|open|${id}"]`)))await xclick(pg,'dem|mfini|');await xclick(pg,'dem|open|'+id);};
const kts=pg=>pg.evaluate(()=>[...document.querySelectorAll('#eq-app .ac-kt')].map(b=>({cls:b.className,t:b.textContent.replace(/\s+/g,' ').trim()})));
const notifs=pg=>pg.evaluate(()=>[...document.querySelectorAll('#eq-app .ac-notif')].map(b=>b.textContent.replace(/\s+/g,' ').trim()));
let o;
/* ── c1 : le gars au téléphone ── */
const Bx=await mkCtx(SOUD,{width:390,height:844},true);const B=Bx.page;await login(B,SOUD.email);
await goMoiSub(B,'Mes demandes');
o={subs:await subs(B),on:await B.evaluate(()=>window.TRACE.paliers.on())};
o.list0=await noOverflow(B);await shot(B,'cc_tel_mes_demandes_vide');
await xclick(B,'dem|new|');
o.lists=await B.evaluate(()=>[...document.querySelectorAll('#eq-app .dm-lh b')].map(b=>b.textContent.trim()));
for(let i=0;i<3;i++)await xclick(B,'dem|inc|T-01');
await xclick(B,'dem|tog|liste-tous§0');await xclick(B,'dem|sz|liste-tous:0|T-04');await xclick(B,'dem|inc|T-04');
await setv(B,'#dm-lib','Cales en bois fictives');await setv(B,'#dm-libq','10');await xclick(B,'dem|libadd|');
o.n1=await B.evaluate(()=>(document.querySelector('#eq-app .dm-bn b')||{}).textContent);o.step1={over:await noOverflow(B),btn:await minBtn(B,'.dm-root')};
await shot(B,'cc_tel_nouvelle_demande_1');
await xclick(B,'dem|step|2');
await setv(B,'#dm-site','SRV_A',['change']);await xclick(B,'dem|urgent|');
o.optg=await B.evaluate(()=>[...document.querySelectorAll('#dm-site optgroup')].map(g=>g.label+':'+g.children.length));
await B.setInputFiles('#eq-app input[data-xin="dem|photo"][capture]',{name:'photo-fictive.png',mimeType:'image/png',buffer:PNG});await W(B,2000);
o.thumb=await B.evaluate(()=>(document.querySelector('#eq-app .dm-ph img')||{}).src||'');
await setv(B,'#dm-note','Livrer au bungalow fictif');
o.step2={over:await noOverflow(B),btn:await minBtn(B,'.dm-root'),x:await B.evaluate(()=>{const b=document.querySelector('#eq-app .dm-ph button');return b?Math.round(b.getBoundingClientRect().height):0;})};
await shot(B,'cc_tel_nouvelle_demande_2');
await xclick(B,'dem|send|');await W(B,1800);
const d1=demsSrv().find(d=>d.byKey===SOUD.email);
o.srv=d1?{id:d1.id.startsWith(SOUD.email+'|'),circuit:d1.circuit,statut:d1.statut,urgent:d1.urgent,imp:d1.imputation,lignes:d1.lignes.map(l=>[l.ref,l.label,l.qte]),photo:String((d1.photos||[])[0]||'').slice(0,140),note:d1.note}:null;
o.listAfter=(await txt(B)).slice(0,300);
console.log('c1) demande du gars :',J(o));
C.c1=o.on===true&&o.subs.some(s=>/Mes demandes/.test(s))&&!o.subs.some(s=>/Magasin/.test(s))&&o.list0&&o.lists.join('|')==='📋 Liste fictive soudure|📋 Liste fictive pour tous|✏️ Autre chose'&&o.n1==='3'&&o.step1.over&&o.step1.btn>=44&&o.optg.some(g=>/^Mes chantiers:1/.test(g))
  &&/sign\/photos\//.test(o.thumb)&&o.step2.over&&o.step2.btn>=44&&o.step2.x>=34&&!!o.srv&&o.srv.id&&o.srv.circuit==='achat'&&o.srv.statut==='envoyee'&&o.srv.urgent===true&&o.srv.imp&&o.srv.imp.id==='SRV_A'&&o.srv.imp.label==='Chantier fictif Alpha'
  &&J(o.srv.lignes)===J([['T-01','Disque A (fictif)',3],['T-04','Moufles (fictives) — M',2],[null,'Cales en bois fictives',10]])&&/storage\/v1\/object\/sign\/photos\//.test(o.srv.photo)&&o.srv.note==='Livrer au bungalow fictif'&&/Disque A \(fictif\) × 3/.test(o.listAfter)&&/Envoyée/.test(o.listAfter);
const ID1=d1&&d1.id;
/* ── c2 : le conducteur commande ── */
const Dx=await mkCtx(COND,{width:1366,height:900});const D=Dx.page;await login(D,COND.email);
await goAccueil(D);o={afaire:(await notifs(D)).filter(t=>/matériel/.test(t))};
await goHub(D);o.row=await D.evaluate(()=>{const b=document.querySelector('#eq-app [data-act="xgo"][data-v="x:dem:file"]');return b?b.textContent.replace(/\s+/g,' ').trim():null;});
await goAff(D);o.rowCc=await has(D,'#eq-app [data-act="xgo"][data-v="x:cc:"]');await goHub(D); /* 31/10 matin : compte chantier → module Affaire ; les demandes restent dans Pilotage */
await hubRow(D,'x:dem:file');o.file=(await txt(D)).slice(0,400);await shot(D,'cc_pc_file_demandes');
await xclick(D,'dem|gopen|'+ID1);await xclick(D,'dem|cmd|'+ID1);
await setv(D,'#dm-four','Fournisseur Fictif Delta');await setv(D,'#dm-prevue',PREVUE);
o.bcBox=await D.evaluate(()=>{const c=document.querySelector('#eq-app input[data-xin="dem|f|bc"]');return c?c.checked:null;});
await shot(D,'cc_pc_commande');
await xclick(D,'dem|cmdok|'+ID1);await W(D,1800);
let dd=reg('magdem',ID1)||{};const BCN=(dd.commande||{}).bc;const bc=BCN?reg('commande',BCN):null;
o.dem={statut:dd.statut,four:(dd.commande||{}).fournisseur,prevue:(dd.commande||{}).prevue,bc:BCN};
o.bc=bc?{etat:bc.etat,site:bc.site,four:bc.fournisseur,liv:bc.livraison,lignes:bc.lignes.map(l=>[l.designation,l.qte,l.unite]),demande:bc.demande,objet:bc.objet}:null;
o.detail=(await txt(D)).slice(0,500);await shot(D,'cc_pc_demande_commandee');
await xclick(D,'dem|bc|'+BCN);await W(D,400);o.bcOpen=await D.evaluate(()=>({four:(document.querySelector('#eq-app [data-cmdf="fournisseur"]')||{}).value,num:(document.querySelector('#eq-app .af-num')||{}).textContent||''}));
console.log('c2) le conducteur commande :',J(o));
C.c2=o.afaire.some(t=>/1 demande de matériel à traiter \(dont 1 urgente\)/.test(t))&&!!o.row&&/Demandes de matériel/.test(o.row)&&/1/.test(o.row)&&o.rowCc&&/À traiter/.test(o.file)&&/Bruno TESTSOUDEUR · Disque A/.test(o.file)&&o.bcBox===true
  &&o.dem.statut==='commandee'&&o.dem.four==='Fournisseur Fictif Delta'&&o.dem.prevue===PREVUE&&/^BC-\d{4}-\d{2}$/.test(o.dem.bc||'')&&!!o.bc&&o.bc.etat==='brouillon'&&o.bc.site==='SRV_A'&&o.bc.four==='Fournisseur Fictif Delta'&&o.bc.liv===PREVUE&&o.bc.demande===ID1&&/Demande de matériel · Bruno TESTSOUDEUR/.test(o.bc.objet||'')
  &&J(o.bc.lignes)===J([['Disque A (fictif)',3,'u'],['Moufles (fictives) — M',2,'paire'],['Cales en bois fictives',10,'u']])&&/Commandée chez Fournisseur Fictif Delta/.test(o.detail)&&new RegExp(BCN).test(o.detail)&&o.bcOpen.four==='Fournisseur Fictif Delta'&&o.bcOpen.num.includes(BCN);
/* ── c3 : livré en partie, puis le reste ── */
await goHub(D);await hubRow(D,'x:dem:file');
if(!(await has(D,`#eq-app [data-act="x"][data-v="dem|liv|${ID1}"]`)))await xclick(D,'dem|gopen|'+ID1);
await xclick(D,'dem|liv|'+ID1);o={defaults:await D.evaluate(()=>[...document.querySelectorAll('#eq-app input[data-xin^="dem|f|q|"]')].map(i=>i.value)),qui:await D.evaluate(()=>(document.getElementById('dm-qui')||{}).value)};
await setv(D,'#eq-app input[data-xin="dem|f|q|0"]','2');await setv(D,'#eq-app input[data-xin="dem|f|q|2"]','4');
await shot(D,'cc_pc_livraison_partielle');
await xclick(D,'dem|livok|'+ID1);await W(D,1600);dd=reg('magdem',ID1)||{};
o.part={statut:dd.statut,remis:(dd.lignes||[]).map(l=>l.remis),remises:(dd.remises||[]).length,qui:((dd.remises||[])[0]||{}).qui,lignes:(((dd.remises||[])[0]||{}).lignes||[]).map(l=>l.qte)};console.log('   remise partielle (serveur) :',J(o.part),J(calls.filter(c=>c.kind==='magdem'&&c.who===COND.email).slice(-1).map(c=>c.patch&&{st:c.patch.statut,l:(c.patch.lignes||[]).map(l=>l.remis)})));
await relaunch(B);await goAccueil(B);o.tile=(await kts(B)).find(k=>/Mes demandes/.test(k.t))||null;
await goMoiSub(B,'Mes demandes');o.chip=(await subs(B)).find(s=>/Mes demandes/.test(s));o.row=await B.evaluate(id=>{const b=document.querySelector(`#eq-app [data-v="dem|open|${id}"]`);return b?b.textContent.replace(/\s+/g,' ').trim():null;},ID1);
await xclick(B,'dem|open|'+ID1);o.fiche=(await txt(B)).slice(0,600);o.ficheOver=await noOverflow(B);await shot(B,'cc_tel_suivi_partiel');
await xclick(D,'dem|liv|'+ID1);o.def2=await D.evaluate(()=>[...document.querySelectorAll('#eq-app input[data-xin^="dem|f|q|"]')].map(i=>i.value));
await xclick(D,'dem|livok|'+ID1);await W(D,1600);dd=reg('magdem',ID1)||{};o.fin={statut:dd.statut,remis:(dd.lignes||[]).map(l=>l.remis),remises:(dd.remises||[]).length};
await relaunch(B);await goMoiSub(B,'Mes demandes');await openDem(B,ID1);o.fiche2=(await txt(B)).slice(0,300);
console.log('c3) remises :',J(o));
C.c3=J(o.defaults)===J(['3','2','10'])&&o.qui===SOUD.email&&o.part.statut==='remise'&&J(o.part.remis)===J([2,2,4])&&o.part.remises===1&&o.part.qui==='Bruno TESTSOUDEUR'&&J(o.part.lignes)===J([2,2,4])
  &&!!o.tile&&/livrée en partie/.test(o.tile.t)&&/Mes demandes 1/.test(o.chip||'')&&/Livrée en partie/.test(o.row||'')&&/nouveau/.test(o.row||'')&&/Livrée en partie : le reste suit/.test(o.fiche)&&/remis 2/.test(o.fiche)&&o.ficheOver
  &&J(o.def2)===J(['1','6'])&&o.fin.statut==='cloturee'&&J(o.fin.remis)===J([3,2,10])&&o.fin.remises===2&&/✅ Livrée\./.test(o.fiche2);
/* ── c4 : refus avec motif ; annulation par le gars ── */
const newDem=async(lib,q,site)=>{await goMoiSub(B,'Mes demandes');if(!(await has(B,'#eq-app [data-v="dem|new|"]')))await xclick(B,'dem|list|');await xclick(B,'dem|new|');await setv(B,'#dm-lib',lib);await setv(B,'#dm-libq',String(q));await xclick(B,'dem|libadd|');await xclick(B,'dem|step|2');await setv(B,'#dm-site',site,['change']);await xclick(B,'dem|send|');await W(B,1500);
  return (demsSrv().filter(d=>d.byKey===SOUD.email&&(d.lignes||[]).some(l=>l.label===lib))[0]||{}).id;};
const ID2=await newDem('Échafaudage fictif',1,'SRV_B');const ID3=await newDem('Gants fictifs',2,'SRV_A');
await xclick(B,'dem|open|'+ID3);await xclick(B,'dem|cancel|'+ID3);await W(B,1500);
o={id2:!!ID2,id3:reg('magdem',ID3)&&reg('magdem',ID3).statut};
await relaunch(D);await goHub(D);await hubRow(D,'x:dem:file');if(await has(D,'#eq-app [data-v="dem|gback|"]'))await xclick(D,'dem|gback|');
o.file=(await txt(D)).slice(0,500);
await xclick(D,'dem|gopen|'+ID2);await xclick(D,'dem|refus|'+ID2);await xclick(D,'dem|refusok|'+ID2);o.sansMotif=await D.evaluate(()=>document.getElementById('toast').textContent);
await setv(D,'#dm-motif','Matériel déjà sur le chantier fictif');await xclick(D,'dem|refusok|'+ID2);await W(D,1500);dd=reg('magdem',ID2)||{};o.refus={statut:dd.statut,motif:dd.motifRefus};
await relaunch(B);await goAccueil(B);o.tile=(await kts(B)).find(k=>/Mes demandes/.test(k.t))||null;
await goMoiSub(B,'Mes demandes');if(!(await has(B,'#eq-app [data-v="dem|open|'+ID2+'"]')))await xclick(B,'dem|mfini|');o.fini=(await txt(B)).slice(0,700);await openDem(B,ID2);o.fiche=(await txt(B)).slice(0,400);
console.log('c4) refus / annulation :',J(o));
C.c4=o.id2&&o.id3==='annulee'&&/Échafaudage fictif/.test(o.file)&&!/Gants fictifs/.test(o.file.split('Commandées')[0])&&/motif du refus est obligatoire/i.test(o.sansMotif)&&o.refus.statut==='refusee'&&o.refus.motif==='Matériel déjà sur le chantier fictif'
  &&!!o.tile&&/\bbad\b/.test(o.tile.cls)&&/refusée/.test(o.tile.t)&&/Refusée/.test(o.fini)&&/Annulée/.test(o.fini)&&/Refusée : Matériel déjà sur le chantier fictif/.test(o.fiche);
/* ── c5 : le chef de chantier (droits) ── */
const Cx=await mkCtx(CHEF,{width:1366,height:900});const CH=Cx.page;await login(CH,CHEF.email);
await goHub(CH);o={hub:await CH.evaluate(()=>!!document.querySelector('#eq-app .eq-hubsec')),dem:await has(CH,'#eq-app [data-act="xgo"][data-v="x:dem:file"]'),cc:await has(CH,'#eq-app [data-act="xgo"][data-v="x:cc:"]')};
await goAff(CH);o.cc=o.cc||await has(CH,'#eq-app [data-act="xgo"][data-v="x:cc:"]'); /* 31/10 matin : compte chantier → module Affaire */
await goMoiSub(CH,'Mes demandes');o.mes=/Nouvelle demande/.test(await txt(CH));o.aTraiter=/Demandes à traiter/.test(await txt(CH));
await goHub(D);o.condDem=await has(D,'#eq-app [data-act="xgo"][data-v="x:dem:file"]');await goAff(D);o.condCc=await has(D,'#eq-app [data-act="xgo"][data-v="x:cc:"]'); /* 31/10 matin : compte chantier → module Affaire */
await D.evaluate(()=>{const b=document.querySelector('#eq-app [data-act="xgo"][data-v="x:cc:"]');if(b)b.click();});await W(D,400);o.choix=(await txt(D)).slice(0,300);await shot(D,'cc_pc_compte_choix');
console.log('c5) chef / conducteur :',J(o));
C.c5=o.hub&&!o.dem&&!o.cc&&o.mes&&!o.aTraiter&&o.condDem&&o.condCc&&/Compte d'un chantier/.test(o.choix)&&/Chantier fictif Alpha/.test(o.choix);
/* ── c6 : paliers éteints — Magasin ET Mes demandes ; le Magasin ignore les demandes sans magasin ── */
SETTINGS.paliers=Object.assign({},SETTINGS.paliers,{on:false});
await relaunch(B);o={subs:await B.evaluate(async()=>{document.getElementById('htEspace').click();await new Promise(r=>setTimeout(r,300));return [...document.querySelectorAll('#eq-app .eq-subs .chip')].map(c=>(c.dataset.v||'')+'='+c.textContent.trim());})};
await B.evaluate(()=>{const c=document.querySelector('#eq-app .eq-subs [data-v="mag"]');if(c)c.click();});await W(B,350);o.mag=(await txt(B)).slice(0,500); /* 31/10 (Ethan : « Magasin et Mes demandes, c'est la même chose ? ») : UNE tuile « Mes demandes » (celle du Magasin quand il est pris) */
o.mvt=Object.values(REG).filter(r=>r.kind==='magmvt').length;o.magCalls=calls.filter(c=>c.kind==='magmvt'||c.kind==='magcat').length;
console.log('c6) paliers éteints :',J(o));
C.c6=o.subs.filter(s=>/Mes demandes/.test(s)).length===1&&o.subs.some(s=>/^mag=.*Mes demandes/.test(s))&&!o.subs.some(s=>/Magasin/.test(s))&&o.subs.every(s=>!/^dem=/.test(s)||/Achats en cours/.test(s))&&/Aucune demande en cours/.test(o.mag)&&!/Disque A|Échafaudage|Gants fictifs/.test(o.mag)&&o.mvt===0&&o.magCalls===0;
/* ── c7 : 390 puis 360 px, boutons ── */
const pass=async w=>{await B.setViewportSize({width:w,height:780});await W(B,300);const r={};await goMoiSub(B,'Mes demandes');r.list=await noOverflow(B);r.lb=await minBtn(B,'.dm-root');await xclick(B,'dem|new|');r.n1=await noOverflow(B);r.b1=await minBtn(B,'.dm-root');
  await xclick(B,'dem|step|2');r.n2=await noOverflow(B);r.b2=await minBtn(B,'.dm-root');if(w===360)await shot(B,'cc_tel360_demande_2');await xclick(B,'dem|step|1');await xclick(B,'dem|list|');await openDem(B,ID1);r.f=await noOverflow(B);r.bf=await minBtn(B,'.dm-root');if(w===360)await shot(B,'cc_tel360_fiche');await xclick(B,'dem|list|');return r;};
SETTINGS.paliers=Object.assign({},SETTINGS.paliers,{on:true});await relaunch(B); /* 31/10 : paliers rallumés (Magasin en Labo, pas pour ce compte) → « Mes demandes » = demandes à l'encadrement, comme en c1–c5 */
o={w390:await pass(390),w360:await pass(360),refus,unknownOk:calls.filter(c=>!['magdem','commande','storage','storage-sign'].includes(c.kind)).map(c=>c.kind)};
console.log('c7) téléphone :',J(o));
C.c7=['w390','w360'].every(k=>{const r=o[k];return r.list&&r.n1&&r.n2&&r.f&&r.lb>=44&&r.b1>=44&&r.b2>=44&&r.bf>=44;})&&!refus.length;
await Bx.ctx.close();await Dx.ctx.close();await Cx.ctx.close();

/* ═════════════ PARTIE B : compte chantier, hors connexion, jeu fictif ═════════════ */
const ctx2=await browser.newContext({viewport:{width:1366,height:900},acceptDownloads:true});const page=await ctx2.newPage();
page.on('pageerror',e=>logs.push('B PAGEERROR: '+String(e.stack||e.message).slice(0,600)));page.on('console',m=>{if(m.type()==='error'&&!/supabase|Failed to fetch|net::ERR|404|WebSocket/i.test(m.text()))logs.push('B: '+m.text().slice(0,200));});page.on('dialog',d=>d.accept().catch(()=>{}));
await ctx2.route(u=>!u.href.startsWith(BASE)&&/^https?:/.test(u.href),rt=>rt.fulfill({status:200,contentType:'application/json',body:/geopf|geo\.api/.test(rt.request().url())?'{"type":"FeatureCollection","features":[]}':'{}'}));
const wait=ms=>page.waitForTimeout(ms);
await page.clock.install({time:new Date(2026,9,28,9,0,0)}); /* mercredi 28/10/2026 */
await page.goto(BASE+'/index.html');await wait(600);await page.evaluate(()=>{localStorage.clear();localStorage.setItem('trace:wide','1');});
await page.goto(BASE+'/vendor/');await wait(200);
await page.evaluate(()=>new Promise(r=>{try{const q=indexedDB.deleteDatabase('trace-kv');q.onsuccess=q.onerror=q.onblocked=()=>r();}catch(e){r();}}));
const at='2026-09-01T08:00:00.000Z';const row=(id,data)=>[id,{id,data,updated_at:at}];
const A81='O2610-81',A82='O2610-82';
const FIX={affaire:Object.fromEntries([row(A81,{num:A81,nom:'Villefictive — Réseau Nord (fictif)',client:'RÉGIE FICTIVE',ville:'Villefictive',etat:'en_cours',montant:90000,sites:['cc_nord'],at,by:'Ethan L.',
      debours:{taux:{chef:65},tva:20,lignes:[{id:'L81a',date:'2026-10-08',type:'loc',lib:'Mini-pelle fictive',fournisseur:'Location Fictive',montant:900,at,by:'Ethan L.'},{id:'L81b',date:'2026-09-20',type:'st',lib:'Terrassement fictif',fournisseur:'Sous-traitant Fictif',montant:1500,at,by:'Ethan L.'}]}}),
    row(A82,{num:A82,nom:'Villefictive — Deux chantiers (fictif)',client:'RÉGIE FICTIVE',ville:'Villefictive',etat:'en_cours',montant:40000,sites:['cc_nord','cc_sud'],at,by:'Ethan L.',
      debours:{lignes:[{id:'L82a',date:'2026-10-14',type:'autre',lib:'Clôture fictive',montant:250,site:'cc_nord',at,by:'Ethan L.'},{id:'L82b',date:'2026-10-15',type:'st',lib:'Sans chantier fictif',montant:777,at,by:'Ethan L.'},{id:'L82c',date:'2026-10-16',type:'loc',lib:'Sud fictif',montant:444,site:'cc_sud',at,by:'Ethan L.'}]}})]),
  commande:Object.fromEntries([row('BC-2610-01',{num:'BC-2610-01',etat:'recue',site:'cc_nord',fournisseur:'Fournisseur Fictif Tubes',objet:'Tubes fictifs',lignes:[{designation:'Tube fictif DN100',qte:10,unite:'u',pu:120},{designation:'Manchon fictif',qte:4,unite:'u',pu:50}],by:'Ethan L.',at:'2026-10-02T08:00:00.000Z'}),
    row('BC-2610-02',{num:'BC-2610-02',etat:'envoyee',site:'cc_nord',fournisseur:'Location Fictive Engins',objet:'Nacelle fictive',typeDepense:'location',lignes:[{designation:'Nacelle fictive 2 semaines',qte:1,unite:'forfait',pu:2500}],by:'Ethan L.',at:'2026-10-05T08:00:00.000Z'}),
    row('BC-2610-03',{num:'BC-2610-03',etat:'brouillon',site:'cc_nord',fournisseur:'Brouillon Fictif',objet:'à préciser',lignes:[{designation:'x',qte:1,unite:'u',pu:999}],by:'Ethan L.',at:'2026-10-12T08:00:00.000Z'}),
    row('BC-2609-04',{num:'BC-2609-04',etat:'facturee',site:'cc_nord',fournisseur:'Quincaillerie Fictive',objet:'Visserie fictive',lignes:[{designation:'Visserie',qte:1,unite:'lot',pu:300}],facture:{montant:330,num:'FA-FICTIVE-1'},by:'Ethan L.',at:'2026-09-10T08:00:00.000Z'}),
    row('BC-2610-05',{num:'BC-2610-05',etat:'envoyee',site:'cc_sud',fournisseur:'Autre Fictif',objet:'autre chantier',lignes:[{designation:'y',qte:1,unite:'u',pu:5000}],by:'Ethan L.',at:'2026-10-03T08:00:00.000Z'})]),
  debours:Object.fromEntries([row('l:karim|nf1',{key:'l:karim',name:'Karim B.',date:'2026-10-06',montant:120,nature:'carburant',site:'cc_nord',justif:'ticket remis au chef',etat:'valide',validePar:'Ethan L.',at:'2026-10-06T18:00:00.000Z'}),
    row('l:karim|nf2',{key:'l:karim',name:'Karim B.',date:'2026-09-15',montant:48,nature:'repas',site:'cc_nord',justif:'ticket remis au chef',etat:'rembourse',validePar:'Ethan L.',at:'2026-09-15T18:00:00.000Z'}),
    row('l:julien|nf3',{key:'l:julien',name:'Julien R.',date:'2026-10-07',montant:60,nature:'repas',site:'cc_nord',justif:'ticket remis au chef',etat:'saisi',at:'2026-10-07T18:00:00.000Z'}),
    row('l:julien|nf4',{key:'l:julien',name:'Julien R.',date:'2026-10-08',montant:35,nature:'peage',site:'cc_nord',justif:'ticket remis au chef',etat:'refuse',at:'2026-10-08T18:00:00.000Z'}),
    row('l:julien|nf5',{key:'l:julien',name:'Julien R.',date:'2026-10-08',montant:40,nature:'peage',site:'cc_sud',justif:'ticket remis au chef',etat:'valide',at:'2026-10-08T18:00:00.000Z'})])};
const pt=(p,d,site,h0,h1,pause,ok)=>({p,d,site,status:ok?'valide':'declare',corr:null,events:[{t:'start',at:d+'T'+h0}].concat(pause?[{t:'pause',at:d+'T12:00'},{t:'resume',at:d+'T12:30'}]:[]).concat([{t:'end',at:d+'T'+h1}]),val:ok?[{by:'l:ethan',at:d+'T18:00'}]:[]});
const PTS=[];['05','06','07','08','09'].forEach(j=>PTS.push(pt('l:karim','2026-10-'+j,'cc_nord','07:30','16:00',true,true)));['14','15'].forEach(j=>PTS.push(pt('l:karim','2026-09-'+j,'cc_nord','07:30','16:00',true,true)));
PTS.push(pt('l:karim','2026-10-12','cc_nord','07:30','16:00',true,false));PTS.push(pt('l:karim','2026-10-13','cc_sud','07:30','16:00',true,true));
['05','06','07'].forEach(j=>PTS.push(pt('l:julien','2026-10-'+j,'cc_nord','07:30','16:00',true,true)));PTS.push(pt('l:julien','2026-10-11','cc_nord','08:00','14:00',false,true));
['05','06'].forEach(j=>PTS.push(pt('l:ethan','2026-10-'+j,'cc_nord','07:00','17:30',true,true)));
const idbSet=(k,v)=>page.evaluate(([k,v])=>new Promise(res=>{const q=indexedDB.open('trace-kv',1);q.onupgradeneeded=()=>q.result.createObjectStore('kv');q.onsuccess=()=>{const db=q.result;const tx=db.transaction('kv','readwrite');tx.objectStore('kv').put(v,k);tx.oncomplete=()=>{db.close();res(true);};tx.onerror=()=>{db.close();res(false);};};q.onerror=()=>res(false);q.onblocked=()=>res(false);}),[k,v]);
for(const k of Object.keys(FIX))await idbSet('trace:reg:'+k,FIX[k]);await idbSet('trace:pointages',PTS);
await page.goto(BASE+'/index.html');await wait(1500);{const s=await page.$('#loginSkip');if(s&&await s.isVisible())await s.click();await wait(800);}
/* chantiers fictifs ouvrables : tracé « traceur » minimal (même construction que e2e_etv_2710) */
const EL=(kind,dn,len,x)=>Object.assign({kind,dn,len},x||{});const weldsOf=els=>els.slice(0,-1).map((e,i)=>({idx:i,dn:e.dn,m:i,weldId:'S-'+i}));
const TL=(id,y,els)=>{let m=0;els.forEach(e=>{e.m0=m;m+=e.len;e.m1=m;e.axis=[[[e.m0,y],[e.m1,y]]];e.from=[e.m0,y];e.to=[e.m1,y];e.casing=250;});return {id,name:id,dn:els[0].dn,bar:12,traceur:true,axis:[[0,y],[m,y]],e:0.35,cond:{A:{els,welds:weldsOf(els),length:m,notes:[]},R:{els:els.map(e=>JSON.parse(JSON.stringify(e))),welds:weldsOf(els),length:m,notes:[]}}};};
const SITEB=(id,name,y)=>({id,name,source:'traceur',w:200,h:200,fiche:{ville:'Villefictive',secteur:'ouest'},lines:[TL(id+'_L1',y,[EL('endpoint',100,0),EL('pipe',100,12),EL('pipe',100,12),EL('endcap',100,0.3)])],traceur:{v:1,cv:1,zones:[],savedAt:'2026-10-01T08:00:00Z'},conv:{msgs:[],seq:1},qse:{docs:[]}});
await page.evaluate(([a,b])=>{const T=window.TRACE;T.etude.addSite(a);T.etude.addSite(b);T.state.userId='ethan';T.renderHome();},[SITEB('cc_nord','Villefictive — Chantier Nord',12),SITEB('cc_sud','Villefictive — Chantier Sud',24)]);await wait(400);
/* base de prix fictive (Commerce → ⚙ Base de prix SCR), comme e2e_db_1910 */
await page.evaluate(async()=>{const T=window.TRACE;T.state.userId='ethan';T.renderHome();await new Promise(x=>setTimeout(x,200));document.getElementById('htCom').click();await new Promise(x=>setTimeout(x,300));});await wait(200);
await page.evaluate(()=>{const el=document.querySelector('#eq-app [data-act=af][data-v="seg|prix"]');if(!el)throw new Error('Base de prix absente');el.click();});await wait(300);
await page.setInputFiles('#eq-app input[data-afprix]',{name:'fixture_prix.xlsx',mimeType:'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',buffer:fs.readFileSync(path.join(HERE,'fixture_prix.xlsx'))});await wait(1800);
o=await page.evaluate(()=>{const T=window.TRACE;const b=T.reg.get('prix','base');return {base:!!(b&&b.mo&&b.mo.postes),bons:T.commandes.all().length,nf:T.commandes.debours().length,pts:T.espace.state().pointages.length};});
console.log('… jeu fictif :',J(o));
const asUser=async id=>{await page.evaluate(id=>{const T=window.TRACE;T.state.userId=id;T.showScreen('home');T.renderHome();},id);await wait(300);};
const goPil=async()=>{await page.evaluate(()=>document.getElementById('htEq').click());await wait(400);};
const goAffP=async()=>{await page.evaluate(()=>document.getElementById('htAff').click());await wait(400);}; /* 31/10 matin : le compte chantier (x:cc:) est dans le module Affaire */
const ptxt=()=>txt(page);
const card=t=>page.evaluate(t=>{const c=[...document.querySelectorAll('#eq-app .cc-card')].find(c=>((c.querySelector('h3')||{}).textContent||'').startsWith(t));return c?[...c.querySelectorAll('tr')].map(tr=>[...tr.children].map(td=>td.textContent.replace(/[  ]/g,' ').replace(/\s+/g,' ').trim()).join(' | ')):null;},t);
/* ── c8 : Sophie (bureau) ── */
await asUser('sophie');await goAffP();
o={row:await has(page,'#eq-app [data-act="xgo"][data-v="x:cc:"]')};
await page.evaluate(()=>document.querySelector('#eq-app [data-act="xgo"][data-v="x:cc:"]').click());await wait(400);
o.choix=(await ptxt()).slice(0,500);await shot(page,'cc_pc_choix_chantier');
await xclick(page,'cc|open|cc_nord');await wait(300);
const T0=await page.evaluate(()=>window.TRACE.compteCh.totaux('cc_nord',{k:'tout'}));
o.tot={mo:T0.mo,h:T0.h,hConf:T0.hConf,ach:T0.ach,nf:T0.nf,st:T0.st,loc:T0.loc,aut:T0.aut,dep:T0.dep,total:T0.total,postes:T0.postes.map(g=>[g.poste,g.h,g.taux,g.cout,g.src])};
o.tiles=await page.evaluate(()=>[...document.querySelectorAll('#eq-app .cc-tile')].map(t=>t.textContent.replace(/[  ]/g,' ').replace(/\s+/g,' ').trim()));
o.postes=await card('Heures par poste');o.bons=await card('Bons de commande');o.dep=await card('Dépenses');o.nat=await card('Totaux par nature');
o.warn=(await ptxt()).match(/1 dépense \([^)]*\) de l'affaire O2610-82 n'est rattachée à aucun chantier/)?true:false;
await shot(page,'cc_pc_compte_chantier');
console.log('c8) compte (tout) :',J(o));
C.c8=o.row&&/Villefictive — Chantier Nord/.test(o.choix)&&/9 jours pointés · 4 bons · 3 notes de frais/.test(o.choix)
  &&o.tot.mo===9620&&o.tot.h===108&&o.tot.hConf===8&&o.tot.ach===4230&&o.tot.nf===140&&o.tot.st===1500&&o.tot.loc===900&&o.tot.aut===250&&o.tot.dep===2790&&o.tot.total===16640
  &&J(o.tot.postes)===J([['soudeur',64,100,6400,'base'],['manchonneur',24,80,1920,'base'],['chef',20,65,1300,'affaire']])
  &&/^16 640 € ?total HT/.test(o.tiles[0]||'')&&/9 620 € ?main-d'œuvre · 108 h \(dont 8 h à confirmer\)/.test(o.tiles[1]||'')&&/4 230 € ?bons/.test(o.tiles[2]||'')&&/2 790 € ?dépenses/.test(o.tiles[3]||'')
  &&!!o.postes&&o.postes.some(r=>/^Soudeur ?1 personne/.test(r)&&/64 h ?dont 8 h à confirmer \| 100 €\/h \| 6 400 €/.test(r))&&o.postes.some(r=>/^Chef de chantier/.test(r)&&/20 h \| 65 €\/h ?taux de l'affaire \| 1 300 €/.test(r))&&o.postes.some(r=>/^Total \| 108 h \| +\| 9 620 €/.test(r))
  &&!!o.bons&&o.bons.some(r=>/BC-2610-03/.test(r)&&/Brouillon/.test(r)&&/non compté/.test(r))&&o.bons.some(r=>/BC-2609-04/.test(r)&&/330,00 € ?facture/.test(r))&&!o.bons.some(r=>/BC-2610-05/.test(r))&&o.bons.some(r=>/^Total engagé \|.*4 230,00 €/.test(r))
  &&!!o.dep&&o.dep.some(r=>/Karim B\./.test(r)&&/120,00 €/.test(r)&&/100,00 €/.test(r))&&o.dep.some(r=>/En attente de validation \(non comptées\) : 1/.test(r))&&o.dep.some(r=>/Mini-pelle fictive/.test(r))&&o.dep.some(r=>/Clôture fictive/.test(r))&&!o.dep.some(r=>/Sans chantier fictif|Sud fictif/.test(r))
  &&!!o.nat&&o.nat.some(r=>/^Total général \| 16 640 € \| 100 %/.test(r))&&o.nat.some(r=>/^Location \| 900 €/.test(r))&&o.warn;
/* ── c9 : période ── */
await xclick(page,'cc|per|mois');o={oct:(await page.evaluate(()=>(document.querySelector('#eq-app .cc-tile')||{}).textContent||'')).replace(/[  ]/g,' '),lab:await page.evaluate(()=>(document.querySelector('#eq-app .cc-nav b')||{}).textContent)};
await xclick(page,'cc|m|2026-09');o.sep=(await page.evaluate(()=>(document.querySelector('#eq-app .cc-tile')||{}).textContent||'')).replace(/[  ]/g,' ');o.labS=await page.evaluate(()=>(document.querySelector('#eq-app .cc-nav b')||{}).textContent);
o.postesSep=await card('Heures par poste');
o.api={oct:(await page.evaluate(()=>window.TRACE.compteCh.totaux('cc_nord',{k:'mois',m:'2026-10',lab:''}))).total,sep:(await page.evaluate(()=>window.TRACE.compteCh.totaux('cc_nord',{k:'mois',m:'2026-09',lab:''}))).total};
await xclick(page,'cc|per|tout');o.back=(await page.evaluate(()=>(document.querySelector('#eq-app .cc-tile')||{}).textContent||'')).replace(/[  ]/g,' ');
console.log('c9) période :',J(o));
C.c9=/^13 170 €/.test(o.oct)&&o.lab==='octobre 2026'&&/^3 470 €/.test(o.sep)&&o.labS==='septembre 2026'&&!!o.postesSep&&o.postesSep.some(r=>/^Soudeur/.test(r)&&/16 h/.test(r))&&o.api.oct===13170&&o.api.sep===3470&&/^16 640 €/.test(o.back);
/* ── c10 : impression ── */
await page.evaluate(()=>{window.__docs=[];window.open=()=>({document:{write:h=>{window.__docs.push(h);},close(){}}});});
await xclick(page,'cc|print|cc_nord');
o=await page.evaluate(()=>{const h=(window.__docs||[])[0]||'';const t=h.replace(/<[^>]+>/g,' ').replace(/[  ]/g,' ').replace(/\s+/g,' ');return {n:(window.__docs||[]).length,title:/<title>Compte chantier — Villefictive — Chantier Nord<\/title>/.test(h),tot:/16 640 € total HT/.test(t),nat:/Totaux par nature/.test(t),postes:/Heures par poste · 108 h · 9 620 €/.test(t),chef:/Chef de chantier 1 20 h — 65,00 € 1 300 €/.test(t),per:/Période depuis le début/.test(t),nocompta:/ni facturation, ni marge/.test(t),charte:/Pilotage · compte chantier/.test(t)};});
console.log('c10) impression :',J(o));
C.c10=o.n===1&&o.title&&o.tot&&o.nat&&o.postes&&o.chef&&o.per&&o.nocompta&&o.charte;
/* ── c11 : depuis le Bureau du chantier ── */
const openBureau=async id=>{await page.evaluate(async id=>{const T=window.TRACE;T.showScreen('site');if(T.state.siteId!==id)await T.switchSite(id);T.state.tab='bureau';T.renderAll();},id);await wait(700);};
await openBureau('cc_nord');o={tile:await page.evaluate(()=>{const b=document.querySelector('#bureau [data-bur="__compte"]');return b?b.textContent.replace(/\s+/g,' ').trim():null;})};
await page.evaluate(()=>{const b=document.querySelector('#bureau [data-bur="__compte"]');if(b)b.scrollIntoView({block:'center'});});await wait(250);await shot(page,'cc_pc_bureau_tuile');
await page.evaluate(()=>document.querySelector('#bureau [data-bur="__compte"]').click());await wait(700);
o.screen=await page.evaluate(()=>window.TRACE.state.screen);o.compte=(await ptxt()).slice(0,200);
console.log('c11) Bureau → compte :',J(o));
C.c11=!!o.tile&&/Compte chantier/.test(o.tile)&&o.screen==='home'&&/💶 Compte chantier · Villefictive — Chantier Nord/.test(o.compte);
/* ── c12 : droits et paliers ── */
await asUser('karim');o={pil:await page.evaluate(()=>{const b=document.getElementById('htEq');return !!b&&b.style.display!=='none';})};
await openBureau('cc_nord');o.tileKarim=await has(page,'#bureau [data-bur="__compte"]');
await page.evaluate(()=>window.TRACE.showScreen('home'));await asUser('sophie');
await page.evaluate(async()=>{await window.TRACE.paliers.setOn(true);});await wait(200);await goAffP();o.labo={row:await has(page,'#eq-app [data-act="xgo"][data-v="x:cc:"]')};await openBureau('cc_nord');o.labo.tile=await has(page,'#bureau [data-bur="__compte"]');
await page.evaluate(async()=>{await window.TRACE.paliers.setFeat('comptechantier','socle');});await page.evaluate(()=>window.TRACE.showScreen('home'));await asUser('sophie');await goAffP();o.socle={row:await has(page,'#eq-app [data-act="xgo"][data-v="x:cc:"]')};await openBureau('cc_nord');o.socle.tile=await has(page,'#bureau [data-bur="__compte"]');
await page.evaluate(async()=>{await window.TRACE.paliers.setFeat('comptechantier','labo');await window.TRACE.paliers.setOn(false);});await page.evaluate(()=>window.TRACE.showScreen('home'));await asUser('sophie');
console.log('c12) droits / paliers :',J(o));
C.c12=!o.pil&&!o.tileKarim&&!o.labo.row&&!o.labo.tile&&o.socle.row&&o.socle.tile;
/* ── c13 : téléphone 390 / 360 ── */
const passB=async w=>{await page.setViewportSize({width:w,height:800});await wait(300);await goAffP();await page.evaluate(()=>document.querySelector('#eq-app [data-act="xgo"][data-v="x:cc:"]').click());await wait(300);const r={choix:await noOverflow(page)};await xclick(page,'cc|open|cc_nord');await wait(300);r.compte=await noOverflow(page);
  r.btn=await page.evaluate(()=>{const L=[...document.querySelectorAll('#eq-app .cc-root .btn, #eq-app .cc-root .chip')].filter(b=>b.offsetParent!==null).map(b=>Math.round(b.getBoundingClientRect().height));return L.length?Math.min(...L):99;});
  if(w===390){await shot(page,'cc_tel_compte_chantier');await page.evaluate(()=>{const c=[...document.querySelectorAll('#eq-app .cc-card')].find(c=>/Heures par poste/.test(c.textContent));if(c)c.scrollIntoView({block:'start'});});await wait(200);await shot(page,'cc_tel_compte_postes');await page.evaluate(()=>{const c=[...document.querySelectorAll('#eq-app .cc-card')].find(c=>/Bons de commande/.test(c.textContent));if(c)c.scrollIntoView({block:'start'});});await wait(200);await shot(page,'cc_tel_compte_bons');await page.evaluate(()=>{const c=[...document.querySelectorAll('#eq-app .cc-card')].find(c=>/^Dépenses/.test((c.querySelector('h3')||{}).textContent||''));if(c)c.scrollIntoView({block:'start'});});await wait(200);await shot(page,'cc_tel_compte_depenses');}
  await xclick(page,'cc|per|mois');r.mois=await noOverflow(page);await xclick(page,'cc|per|tout');return r;};
o={w390:await passB(390),w360:await passB(360)};await page.setViewportSize({width:1366,height:900});await wait(200);await goAffP();await page.evaluate(()=>document.querySelector('#eq-app [data-act="xgo"][data-v="x:cc:"]').click());await wait(300);await xclick(page,'cc|open|cc_nord');o.w1366=await noOverflow(page);
console.log('c13) largeurs :',J(o));
C.c13=['w390','w360'].every(k=>o[k].choix&&o[k].compte&&o[k].mois&&o[k].btn>=34)&&o.w1366;
/* ── c15 : hors connexion (personnages de démo) : demande avec photo GARDÉE dans la demande (pas de stockage), traitée par le bureau, rien dans la file d'envoi ── */
await page.setViewportSize({width:390,height:844});await wait(200);await page.evaluate(()=>window.TRACE.band.setModules(['magasin'])); /* 31/10 : démo sans le module Magasin → « Mes demandes » = demandes à l'encadrement */await asUser('karim');await goMoiSub(page,'Mes demandes');if(!(await has(page,'#eq-app [data-v="dem|new|"]')))await xclick(page,'dem|list|');
await xclick(page,'dem|new|');await setv(page,'#dm-lib','Bâche fictive');await setv(page,'#dm-libq','2');await xclick(page,'dem|libadd|');await xclick(page,'dem|step|2');await setv(page,'#dm-site','cc_nord',['change']);
await page.setInputFiles('#eq-app input[data-xin="dem|photo"]:not([capture])',{name:'photo-fictive.png',mimeType:'image/png',buffer:PNG});await wait(1500);
o={thumb:(await page.evaluate(()=>(document.querySelector('#eq-app .dm-ph img')||{}).src||'')).slice(0,15),over:await noOverflow(page)};
await xclick(page,'dem|send|');await wait(400);
o.dem=await page.evaluate(()=>window.TRACE.reg.all('magdem').filter(d=>d.byKey==='l:karim').map(d=>{const p=(d.photos||[])[0]||{};return {id:d.id,st:d.statut,circuit:d.circuit,photo:String(p.u||p).slice(0,15),local:!!p.local,site:(d.imputation||{}).id};}));
o.pend=await page.evaluate(()=>window.TRACE.reg.pending().filter(w=>w.kind==='magdem').length);const IDK=(o.dem[0]||{}).id;
await asUser('sophie');await goPil();await hubRow(page,'x:dem:file');if(await has(page,'#eq-app [data-v="dem|gback|"]'))await xclick(page,'dem|gback|');o.file=/Karim B\. · Bâche fictive × 2/.test(await ptxt());
await xclick(page,'dem|gopen|'+IDK);await xclick(page,'dem|liv|'+IDK);await xclick(page,'dem|livok|'+IDK);await wait(300);
o.after=await page.evaluate(id=>{const d=window.TRACE.reg.get('magdem',id)||{};return {st:d.statut,remis:(d.lignes||[]).map(l=>l.remis),qui:((d.remises||[])[0]||{}).qui};},IDK);
await asUser('karim');await goMoiSub(page,'Mes demandes');await openDem(page,IDK);o.fiche=/✅ Livrée\./.test(await ptxt());o.pend2=await page.evaluate(()=>window.TRACE.reg.pending().filter(w=>w.kind==='magdem').length);
console.log('c15) hors connexion :',J(o));
C.c15=/^data:image\//.test(o.thumb)&&o.over&&o.dem.length===1&&o.dem[0].st==='envoyee'&&o.dem[0].circuit==='achat'&&/^data:image\//.test(o.dem[0].photo)&&o.dem[0].local&&o.dem[0].site==='cc_nord'&&o.pend===0&&o.file&&o.after.st==='cloturee'&&J(o.after.remis)===J([2])&&o.after.qui==='Karim B.'&&o.fiche&&o.pend2===0;
C.c14=!logs.length;if(logs.length)console.log('console :',logs);
console.log('RÉSULTATS',J(C));console.log('RESULTAT:',Object.values(C).every(Boolean)?'TOUT VERT':'ÉCHEC '+Object.keys(C).filter(k=>!C[k]).join(' '));await browser.close();process.exit(Object.values(C).every(Boolean)?0:1);
