// e2e_tuto_cm_3110.mjs — 31/10/2026 (lot cm) : TUTORIELS DÉTAILLÉS de Tracé Commerce, Tracé Flotte et Tracé Magasin (src/tutos_commerce.js).
// Ethan : « un tuto par module qui décrit toutes les options, et des tutos par option, vastes, pour que tout le monde sache se servir de toutes les options ».
// Mode démo hors connexion (aucun serveur), personnages de démo de l'appli. Données 100 % FICTIVES, créées par l'interface : 2 affaires (une en devis à remettre demain,
// une en cours), 1 véhicule + pack véhicules fictif, pack magasin fictif + 1 demande de Karim. Sous robot, les tutos se lancent par TRACE.tuto.start(clé).
//  c1  fichier : les 6 clés, 3 à 12 étapes ; titres ≤ 40 car. ; textes ≤ 2 phrases et ≤ 230 car. ; NOMS = les 3 clés d'option ; chaque libellé cité (« … », titres-boutons)
//      existe dans le code de l'appli ou dans le DOM relu pendant le test ; pas de « gars »
//  c2  390 px, pour CHAQUE clé, sur son écran : where() = la clé (vue d'ensemble : commence par le module) et « ? » = ce tutoriel ; toutes les étapes déroulées jusqu'à
//      « Terminé ✓ » ; chaque étape à cible → découpe affichée SUR l'élément visé (1re cible visible, comme le moteur) ; étape sans cible → carte au centre ; carte dans
//      l'écran, boutons ≥ 44 px ; fermé à la fin. commerce : liste (Devis & chiffrage) · commerce:aff : affaire en devis ouverte depuis Aujourd'hui (onglet 7 · Offre), puis
//      affaire en cours (Facturation, Débours) dans la même sous-vue · flotte : parc · flotte:x:veh : assistant « 🤝 Remettre à… » · magasin : file des demandes ·
//      magasin:materiel : 🔧 Matériel
//  c3  droits : Ethan (admin) n'a pas l'étape « 📦 Magasin » de la Flotte (il a l'onglet Magasin) ; Sophie (bureau, sans droit Magasin) l'a, surlignée sur la puce
//  c4  même clé, autre écran : ⚙ Pack véhicules (flotte:x:veh) → cartes au centre, sans erreur ; « ? » d'une affaire ouverte depuis la liste → tutoriel Commerce, sans erreur
//  c5  360 px : commerce:aff, flotte:x:veh, magasin — mêmes contrôles qu'en c2
//  c6  premier passage réel (drapeau trace:tuto:test) : 1re entrée dans Commerce → vue d'ensemble seule ; affaire depuis Aujourd'hui → « Une affaire ouverte » ; « ? » la relance ;
//      Flotte → vue d'ensemble ; assistant → « États des lieux » ; Magasin → vue d'ensemble ; 🔧 Matériel → son tutoriel ; 📚 Tous les tutoriels liste les 6 clés
//  c7  console propre (aucune erreur)
// Captures (390 px) dans SHOTS (par défaut /root/work/tu_cm_shots) : vue d'ensemble Commerce, affaire ouverte, assistant d'état des lieux, file du Magasin (+ 2 à 360 px).
import { chromium } from 'playwright';
import fs from 'fs';import path from 'path';import {fileURLToPath} from 'url';
const here=path.dirname(fileURLToPath(import.meta.url));const SRCDIR=path.join(here,'..','src');
const {default:TUT,NOMS}=await import(path.join(SRCDIR,'tutos_commerce.js'));
const BASE=process.env.BASE||'http://127.0.0.1:8845';const SHOTS=process.env.SHOTS||'/root/work/tu_cm_shots';fs.mkdirSync(SHOTS,{recursive:true});
const KEYS=['commerce','commerce:aff','flotte','flotte:x:veh','magasin','magasin:materiel'];
const C={};const logs=[];const J=x=>JSON.stringify(x);const DOM=[];
const browser=await chromium.launch({headless:true,executablePath:process.env.CHROMIUM_PATH||undefined});
const ctx=await browser.newContext({viewport:{width:390,height:844},deviceScaleFactor:2,hasTouch:true,isMobile:true});const page=await ctx.newPage();
let DLG='AB-123-CD'; /* immatriculation FICTIVE demandée par « ➕ Véhicule » */
page.on('pageerror',e=>logs.push('PAGEERROR: '+e.message.slice(0,300)));page.on('console',m=>{if(m.type()==='error'&&!/supabase|Failed to fetch|net::ERR|404|geopf|WebSocket/i.test(m.text()))logs.push(m.text().slice(0,200));});
page.on('dialog',d=>d.accept(DLG).catch(()=>{}));
const wait=ms=>page.waitForTimeout(ms);
const pad=n=>String(n).padStart(2,'0');const isoPlus=j=>{const d=new Date();d.setDate(d.getDate()+j);return d.getFullYear()+'-'+pad(d.getMonth()+1)+'-'+pad(d.getDate());};
/* packs FICTIFS (mêmes structures que les packs SCR, contenu inventé) */
const PACK_VEH={vehicule:{reception:{version:'test-31/10',
  etatDesLieux:{releves:[{id:'km',label:'Kilométrage',type:'nombre',unite:'km',obligatoire:true},{id:'nivHuile',label:'Huile',type:'choix',choix:['Ok','Non ok'],groupe:'Niveaux'}],
    controles:[{id:'pneus',label:'Pneus',type:'choix',choix:['Ok','Non ok']}],documentsABord:[{id:'docGrise',label:'Carte grise',type:'choix',choix:['Ok','Non ok']}],
    zones:[{id:'avant',label:'Face avant'},{id:'arriere',label:'Face arrière'}],
    photosDetail:[{id:'avant',label:'Face avant',obligatoire:true},{id:'arriere',label:'Face arrière',obligatoire:true},{id:'impacts',label:'Impacts',multiple:true}]},
  inventaire:{parMetier:{soudeur:[{id:'a1',designation:'Meuleuse fictive',qte:1}]},commun:[{id:'c1',designation:'Trousse fictive',qte:1,pour:'tous'}],modeles:{soudeur:{titre:'MATÉRIEL FICTIF'}}},
  dispositifs:{champs:[{id:'carteVehicule',label:'Carte carburant fictive',type:'dispositif',pour:'tous'}],engagements:['Engagement fictif.']},
  documents:[{id:'charte_service',titre:'Charte fictive',pour:'service',texte:'textes/charte_fictive.txt',version:'test'}],
  correspondanceTypesAppli:{Soudeur:{charte:'charte_service',inventaire:'soudeur'}}},
 entretien:{modalitesEntretien:{auQuotidien:['Vérifier les niveaux (fictif).']}},
 textes:{'charte_fictive.txt':'# Charte fictive\n\n## Règles\n\n- Règle fictive numéro 1.\n- Règle fictive numéro 2.\n\nJe soussigné : {{conducteur}}.\n\nVisa : {{signature_conducteur}}\n'}}};
const art=(ref,designation,famille,unite,stockDepot,seuil,prixU,fournisseur)=>({ref,designation,famille,unite,stockDepot,seuil,emplacement:ref,prixU,source:'test',metiers:[],fournisseur,marque:null,refFournisseur:fournisseur?'REF-'+ref:null,aliases:[],note:null});
const PACK_MAG={magasin:{catalogue:[art('T-01','Disque fictif A','Abrasifs','u',10,12,1.5,'FOURNISSEUR ALPHA'),art('T-02','Baguette fictive B','Soudage','paquet',5,4,20,'FOURNISSEUR BETA'),art('T-03','Crayon fictif','Consommable','u',30,10,0.8,'FOURNISSEUR BETA')],
  formulaires:[{id:'liste-soudure',titre:'Liste fictive soudure',pour:['soudeur','tuyauteur'],source:'test',remplace:'test',champs:[],articles:[{ligne:1,section:'Consommables fictifs',ref:'T-01',designation:'Disque A (fictif)',unite:'u',qteMax:20,lienStock:'exact'},{ligne:2,section:'Consommables fictifs',ref:'T-02',designation:'Baguettes B (fictives)',unite:'paquet',qteMax:null,lienStock:'exact'}]}],
  dotations:[{metier:'soudeur',metiers:['soudeur','tuyauteur'],titre:'Dotation fictive soudure',source:'test',miseAJour:'01/01/2026',entete:[],visas:[],articles:[{designation:'Crayon (fictif)',qte:2,qteTexte:null,uniteDotation:'u',aLaDemande:false,ref:'T-03',lienStock:'exact',controle:null,observation:null}]}]}};
/* ── outils ── */
const fresh=async()=>{await page.goto(BASE+'/index.html');await wait(400);await page.evaluate(()=>{localStorage.clear();});await page.evaluate(()=>new Promise(r=>{try{const q=indexedDB.deleteDatabase('trace-kv');q.onsuccess=q.onerror=q.onblocked=()=>r();}catch(e){r();}}));await page.reload();await wait(1300);const sk=await page.$('#loginSkip');if(sk&&await sk.isVisible())await sk.click();await wait(700);};
const as=async id=>{await page.evaluate(id=>{const T=window.TRACE;T.tuto.close(null);T.state.userId=id;T.showScreen('home');T.renderHome();},id);await wait(400);};
const tab=async id=>{await page.evaluate(id=>document.getElementById(id).click(),id);await wait(650);};
const click=async sel=>{const ok=await page.evaluate(s=>{const b=document.querySelector(s);if(!b)return false;b.click();return true;},sel);await wait(450);return ok;};
const chg=(sel,val)=>page.evaluate(([s,v])=>{const el=document.querySelector(s);if(!el)return false;el.value=v;el.dispatchEvent(new Event('change',{bubbles:true}));return true;},[sel,val]);
const where=()=>page.evaluate(()=>window.TRACE.tuto.where());const best=()=>page.evaluate(()=>window.TRACE.tuto.best());
const snap=async()=>{DOM.push(await page.evaluate(()=>(document.getElementById('homeBody')||document.body).innerText));};
const card=()=>page.evaluate(()=>{const r=document.getElementById('tuto');if(!r)return null;const c=r.querySelector('.tutoCard'),h=r.querySelector('.tutoHole');const rc=c.getBoundingClientRect();
  const hole=h&&getComputedStyle(h).display!=='none'?(()=>{const x=h.getBoundingClientRect();return [Math.round(x.left),Math.round(x.top),Math.round(x.width),Math.round(x.height)];})():null;
  return {mod:c.querySelector('.tutoMod').textContent,t:c.querySelector('.tutoT').textContent,x:c.querySelector('.tutoX').textContent,left:Math.round(rc.left),right:Math.round(rc.right),top:Math.round(rc.top),bottom:Math.round(rc.bottom),W:innerWidth,H:innerHeight,hole,
    btns:[...c.querySelectorAll('button')].map(b=>Math.round(b.getBoundingClientRect().height)),open:window.TRACE.tuto.open()};});
/* la cible que le moteur doit surligner : 1re cible de la liste visible dans l'écran (tuto.js → target(), le défilement est déjà fait quand l'étape est peinte) */
const expected=sel=>page.evaluate(sel=>{for(const q of String(sel).split(',')){let el=null;try{el=document.querySelector(q.trim());}catch(e){}if(!el)continue;const r=el.getBoundingClientRect();if(r.width<4||r.height<4)continue;const cs=getComputedStyle(el);if(cs.visibility==='hidden'||cs.display==='none')continue;
  if(r.bottom<0||r.top>innerHeight||r.right<0||r.left>innerWidth)continue;const x=Math.max(4,r.left-6),y=Math.max(4,r.top-6);return {q:q.trim(),r:[Math.round(x),Math.round(y),Math.round(Math.min(innerWidth-8,r.right+6)-x),Math.round(Math.min(innerHeight-8,r.bottom+6)-y)]};}return null;},sel);
const near=(a,b)=>!!a&&!!b&&a.every((v,i)=>Math.abs(v-b[i])<=3);
const inScreen=c=>!!c&&c.left>=0&&c.right<=c.W&&c.top>=0&&c.bottom<=c.H&&c.btns.every(h=>h>=44);
/* déroule le tutoriel « key » sur l'écran affiché ; shot = {step:i (0-based), name} */
async function run(key,{shot,label}={}){const defs=TUT[key];const o={key,label:label||key,where:await where(),best:await best()};
  o.started=await page.evaluate(k=>window.TRACE.tuto.start(k),key);await wait(350);const c0=await card();o.n=c0&&c0.open?c0.open.n:0;o.steps=[];
  for(let i=0;i<20;i++){const c=await card();if(!c)break;const d=defs.find(s=>s.titre===c.t);const e=d&&d.sel?await expected(d.sel):null;
    o.steps.push({i:c.open&&c.open.i,t:c.t,known:!!d,sel:!!(d&&d.sel),hole:c.hole,exp:e&&e.q,ok:d&&d.sel?(e?near(c.hole,e.r):c.hole===null):c.hole===null,inScreen:inScreen(c),mod:c.mod});
    if(shot&&shot.step===i)await page.screenshot({path:path.join(SHOTS,shot.name)});
    const last=c.open&&c.open.i===c.open.n-1;await page.click('#tuto .tutoGo');await wait(280);if(last)break;}
  o.closed=!(await page.$('#tuto'));o.seen=await page.evaluate(k=>window.TRACE.tuto.seen(k),key);o.titre=o.steps.every(s=>s.mod.startsWith(TITRE[key]+' · '));return o;}
const TITRE={commerce:'Tracé Commerce','commerce:aff':'Tracé Commerce · Une affaire ouverte',flotte:'Tracé Flotte','flotte:x:veh':'Tracé Flotte · États des lieux',magasin:'Tracé Magasin','magasin:materiel':'Tracé Magasin · Matériel'}; /* titre de la carte (NOMS) */
/* résumé lisible + verdict : toutes les étapes vues, connues, dans l'écran ; « strict » = chaque étape à cible DOIT être surlignée (sauf liste « absentes ») */
const verdict=(o,{strict=true,absentes=[]}={})=>o.started&&o.n>=3&&o.steps.length===o.n&&o.titre&&o.steps.every(s=>s.known&&s.inScreen&&s.ok&&(!strict||!s.sel||!!s.hole||absentes.includes(s.t)))&&o.closed&&o.seen;
const show=o=>({key:o.key,label:o.label,where:o.where,best:o.best,n:o.n,closed:o.closed,steps:o.steps.map(s=>`${s.t}${s.sel?(s.hole?' ▣ '+s.exp:' ▢ (centre)'):' · centre'}${s.ok?'':' ✗ DÉCOUPE MAL PLACÉE'}${s.inScreen?'':' ✗ HORS ÉCRAN'}${s.known?'':' ✗ INCONNUE'}`)});
/* ── c1 : le fichier ── */
const SRC=fs.readdirSync(SRCDIR).filter(f=>/\.js$/.test(f)&&!/^tutos?_|^tuto\.js$/.test(f)).map(f=>fs.readFileSync(path.join(SRCDIR,f),'utf8')).join('\n').replace(/\\'/g,"'");
const LABELS=[];const lint=[];
for(const k of KEYS){const L=TUT[k];if(!L){lint.push(k+' : absente');continue;}if(L.length<3||L.length>12)lint.push(k+' : '+L.length+' étapes');
  L.forEach((s,i)=>{if(!s.titre||s.titre.length>40)lint.push(k+' · titre trop long : '+s.titre);if(!s.texte||s.texte.length>230)lint.push(k+' · texte trop long ('+(s.texte||'').length+') : '+s.titre);
    const nP=(s.texte.match(/[.!](\s|$)/g)||[]).length;if(nP>2||(!k.includes(':')&&i>0&&nP>1))lint.push(k+' · trop de phrases ('+nP+') : '+s.titre); /* vue d'ensemble : une phrase par option */if(/\bgars\b/i.test(s.titre+' '+s.texte))lint.push(k+' · vocabulaire : '+s.titre);
    [...s.texte.matchAll(/«\s*([^»]+?)\s*»/g)].forEach(m=>LABELS.push([k,m[1]]));if(/^[^\p{L}\d]/u.test(s.titre))LABELS.push([k,s.titre]);});
  if(new Set(L.map(s=>s.titre)).size!==L.length)lint.push(k+' : deux étapes ont le même titre');}
['Le responsable et moi','Je suis seul','Continuer ›','7 · Offre','Tracé & chantiers','Facturation','Fiche'].forEach(l=>LABELS.push(['titres',l])); /* titres qui sont des libellés de l'écran */
if(Object.keys(TUT).sort().join()!==KEYS.slice().sort().join())lint.push('clés en trop / en moins : '+Object.keys(TUT).join());
if(Object.keys(NOMS).sort().join()!==KEYS.filter(k=>k.includes(':')).sort().join())lint.push('NOMS : '+Object.keys(NOMS).join());
/* ── préparation (sans tutos automatiques : robot) : données fictives par l'interface ── */
await fresh();await as('ethan');
await tab('htCom');
const mkAff=async(num,nom,etat)=>{await click('#eq-app [data-act=af][data-v="new|"]');await page.evaluate(([n,nom,etat])=>{document.getElementById('afn-num').value=n;document.getElementById('afn-nom').value=nom;document.getElementById('afn-client').value='CLIENT FICTIF';document.getElementById('afn-ville').value='Villefictive';document.getElementById('afn-etat').value=etat;},[num,nom,etat]);await click('#eq-app [data-act=af][data-v="create|"]');await click('#eq-app [data-act=af][data-v="back|"]');};
await mkAff('O2611-01','Réseau fictif des Tilleuls','devis');await mkAff('O2611-02','Antenne fictive du Moulin','en_cours');
await page.evaluate(d=>{window.TRACE.affaires.set('O2611-01',{dateReponse:d,montant:85000});window.TRACE.affaires.set('O2611-02',{montant:120000});},isoPlus(1));
await tab('htParc');await click('#eq-app [data-act=fl][data-v="new|"]');
for(const [k,v] of [['marque','FICTIF'],['modele','FOURGON'],['type','Soudeur'],['km','120500'],['ctProchain',isoPlus(10)]]){await chg(`#eq-app [data-flf=${k}]`,v);await wait(120);}
await click('#eq-app [data-act=x][data-v="veh|cfg|"]');const cfgWhere=await where();await snap();
await page.setInputFiles('#eq-app input[data-xin="veh|packfile"]',{name:'pack_vehicules_fictif.json',mimeType:'application/json',buffer:Buffer.from(JSON.stringify(PACK_VEH))});await wait(1500);
const packVeh=await page.evaluate(()=>/Pack importé/.test(document.getElementById('homeBody').innerText));
await click('#homeBody .ac-back[data-act="xsub"]');await click('#eq-app [data-act=fl][data-v="back|"]');
await tab('htMag');await click('#eq-app [data-act=x][data-v="mag|mseg|cat"]');
await page.setInputFiles('#eq-app input[data-xin="mag|pack"]',{name:'pack_magasin_fictif.json',mimeType:'application/json',buffer:Buffer.from(JSON.stringify(PACK_MAG))});await wait(1500);await snap();
const packMag=await page.evaluate(()=>/3 articles/.test(document.getElementById('homeBody').innerText));
await as('karim');await tab('htEspace');await click('#eq-app .eq-subs [data-v="mag"]');await click('#eq-app [data-v="mag|new"]');await click('#eq-app [data-v^="mag|inc|"]');await click('#eq-app [data-v="mag|step|2"]');await click('#eq-app [data-v="mag|imp|depot"]');await click('#eq-app [data-v="mag|urgent"]');await click('#eq-app [data-v="mag|send"]');
await as('ethan');
console.log('préparation :',J({cfgWhere,packVeh,packMag,affaires:await page.evaluate(()=>window.TRACE.affaires.all().map(a=>a.num+':'+a.etat)),vehicules:await page.evaluate(()=>window.TRACE.flotte.all().map(v=>v.immat))}));
/* ── écrans ── */
const listeAffaires=async()=>{await page.evaluate(()=>{const s=window.TRACE.affaires.state();s.view='list';s.cur=null;s.seg='devis';s.etat='';s.secteur='';s.q='';});await tab('htCom');};
const S={
  commerce:async()=>{await listeAffaires();await snap();},
  'commerce:aff':async()=>{await tab('htHome');const ok=await page.evaluate(()=>{const r=[...document.querySelectorAll('#homeBody [data-act="notif"]')].find(e=>/Offre O2611-01/.test(e.textContent));if(r){r.click();return true;}return false;});await wait(700);await snap();return ok;}, /* Aujourd'hui → « Offre … à remettre » : l'affaire s'ouvre sur 7 · Offre */
  'commerce:aff#2':async()=>{await click('#homeBody [data-act="af"][data-v="back|"]');await click('#homeBody [data-act="af"][data-v="seg|cours"]');await click('#homeBody [data-act="af"][data-v="open|O2611-02"]');await snap();}, /* même sous-vue : une affaire en cours */
  flotte:async()=>{await tab('htParc');await click('#homeBody [data-act="fl"][data-v="back|"]');await click('#homeBody [data-act="fl"][data-v="vue|list"]');await snap();},
  'flotte:x:veh':async()=>{await S.flotte();await click('#homeBody [data-act="fl"][data-v="open|AB-123-CD"]');await snap();await click('#homeBody [data-act="x"][data-v^="veh|recep|"]');await wait(300);await snap();}, /* fiche → « 🤝 Remettre à… » (ou « ▶ Reprendre la remise ») */
  magasin:async()=>{await tab('htMag');await click('#homeBody [data-act="parcseg"][data-v="magasin"]');await click('#homeBody [data-act="x"][data-v="mag|mback|"]');await click('#homeBody [data-act="x"][data-v="mag|mseg|dem"]');await snap();},
  'magasin:materiel':async()=>{await S.magasin();await click('#homeBody [data-act="parcseg"][data-v="materiel"]');await snap();}};
const R={};const W0=k=>k.split(':')[0];
const keyOk=(o,k)=>k.includes(':')?o.where===k&&o.best===k:(o.where===k||String(o.where).startsWith(k+':'))&&o.best===k;
/* ── c2 : 390 px, chaque clé sur son écran ── */
await S.commerce();R.commerce=await run('commerce',{shot:{step:2,name:'tuto_commerce_390.png'}});
R.aff1=(await S['commerce:aff']())?await run('commerce:aff',{label:'commerce:aff (devis, depuis Aujourd\'hui, onglet 7 · Offre)'}):{key:'commerce:aff',started:false,steps:[]};
await click('#homeBody [data-act="af"][data-v="tab|offre"]');await snap(); /* relit l'onglet 7 · Offre (libellés cités) */
await S['commerce:aff#2']();R.aff2=await run('commerce:aff',{label:'commerce:aff (affaire en cours, même sous-vue)',shot:{step:1,name:'tuto_commerce_aff_390.png'}});
for(const t of ['quantites','chiffrage','memoire','dpgf','fact','debours','sites']){await click(`#homeBody [data-act="af"][data-v="tab|${t}"]`);await snap();} /* relit les onglets cités */
await S.flotte();R.flotte=await run('flotte');
await S['flotte:x:veh']();R.veh=await run('flotte:x:veh',{shot:{step:3,name:'tuto_flotte_etatsdeslieux_390.png'}});
await S.magasin();R.magasin=await run('magasin',{shot:{step:2,name:'tuto_magasin_390.png'}});
await click('#homeBody [data-v^="mag|mopen|"]');await snap();await click('#homeBody [data-v^="mag|start|"]');await snap();await click('#homeBody [data-v^="mag|pret|"]');await snap(); /* relit préparer / prête / remettre */
for(const m of ['fiches','stock','cmd','mvt','cat']){await click(`#homeBody [data-act="x"][data-v="mag|mseg|${m}"]`);await snap();}
await S['magasin:materiel']();R.materiel=await run('magasin:materiel');
for(const [k,o] of Object.entries(R))console.log('c2) '+k+' :',J(show(o)));
C.c2=keyOk(R.commerce,'commerce')&&verdict(R.commerce)&&keyOk(R.aff1,'commerce:aff')&&verdict(R.aff1)&&R.aff1.steps.find(s=>/l'état/.test(s.t)).exp.includes('tab|fiche') /* sur 7 · Offre : la puce Fiche */
  &&keyOk(R.aff2,'commerce:aff')&&verdict(R.aff2)&&R.aff2.steps.find(s=>/l'état/.test(s.t)).exp.includes('afin') /* sur la Fiche : le choix de l'état */
  &&keyOk(R.flotte,'flotte')&&verdict(R.flotte)&&!R.flotte.steps.some(s=>s.t==='📦 Magasin')&&R.flotte.steps.some(s=>s.t==='➕ Véhicule')&&keyOk(R.veh,'flotte:x:veh')&&verdict(R.veh)
  &&keyOk(R.magasin,'magasin')&&verdict(R.magasin)&&R.magasin.steps.find(s=>s.t==='Préparer').exp.includes('mopen')&&keyOk(R.materiel,'magasin:materiel')&&verdict(R.materiel)
  &&R.commerce.steps.some(s=>s.t==='➕ Affaire'&&s.hole);
/* ── c1 (fin) : libellés cités ↔ code ou DOM relu ── */
const DOMTXT=DOM.join('\n');const absents=LABELS.filter(([,l])=>!SRC.includes(l)&&!DOMTXT.includes(l));
console.log('c1) fichier :',J({cles:Object.fromEntries(KEYS.map(k=>[k,(TUT[k]||[]).length])),total:KEYS.reduce((a,k)=>a+(TUT[k]||[]).length,0),libelles:LABELS.length,absents,lint}));
C.c1=!lint.length&&!absents.length&&LABELS.length>=40;
/* ── c3 : droits (Sophie : bureau, sans droit Magasin → le dépôt est une puce de la Flotte) ── */
await as('sophie');await S.flotte();const so=await run('flotte',{label:'flotte (Sophie)'});console.log('c3) Sophie :',J(show(so)));await as('ethan');
C.c3=keyOk(so,'flotte')&&verdict(so)&&so.steps.some(s=>s.t==='📦 Magasin'&&s.hole&&/parcseg/.test(s.exp))&&so.n===R.flotte.n+1;
/* ── c4 : même clé, autre écran ── */
await S.flotte();await click('#homeBody [data-act="fl"][data-v="open|AB-123-CD"]');await click('#homeBody [data-act="x"][data-v="veh|cfg|"]');
const cfg=await run('flotte:x:veh',{label:'flotte:x:veh sur ⚙ Pack véhicules'});
await listeAffaires();await click('#homeBody [data-act="af"][data-v="open|O2611-01"]');const lw=await where();await click('#homeBody h2.vt .tuHelp');const lq=await card();await page.evaluate(()=>window.TRACE.tuto.close(null));
console.log('c4) autre écran :',J({cfg:show(cfg),listeOuverte:{where:lw,tuto:lq&&lq.open&&lq.open.k,mod:lq&&lq.mod}}));
C.c4=cfg.where==='flotte:x:veh'&&cfg.started&&cfg.steps.length===cfg.n&&cfg.steps.every(s=>s.known&&s.inScreen&&s.ok)&&cfg.steps.filter(s=>s.sel).every(s=>!s.hole)&&cfg.closed /* l'assistant n'est pas là : cartes au centre */
  &&/^commerce/.test(lw)&&!!lq&&/^commerce/.test(lq.open.k)&&inScreen(lq); /* where() = « commerce » aujourd'hui (voir le rapport : une ligne dans espaceViewKey la ferait passer à « commerce:aff ») */
/* ── c5 : 360 px ── */
await page.setViewportSize({width:360,height:740});await wait(300);const R3={};
await S['commerce:aff']();R3.aff=await run('commerce:aff',{label:'commerce:aff 360',shot:{step:3,name:'tuto_commerce_aff_360.png'}});
await S['flotte:x:veh']();R3.veh=await run('flotte:x:veh',{label:'flotte:x:veh 360'});
await S.magasin();R3.magasin=await run('magasin',{label:'magasin 360',shot:{step:6,name:'tuto_magasin_360.png'}});
for(const [k,o] of Object.entries(R3))console.log('c5) '+k+' :',J(show(o)));
C.c5=Object.values(R3).every(o=>o.where&&verdict(o))&&R3.aff.where==='commerce:aff'&&R3.veh.where==='flotte:x:veh'&&R3.magasin.where==='magasin';
await page.setViewportSize({width:390,height:844});await wait(300);
/* ── c6 : premier passage réel (drapeau de test : le robot voit les tutos comme une personne) ── */
const o6={};await page.evaluate(()=>{localStorage.setItem('trace:tuto:test','1');window.TRACE.tuto.reset();});
await page.evaluate(()=>{const s=window.TRACE.affaires.state();s.view='list';s.cur=null;s.seg='devis';});await click('#homeBody [data-act="xsub"][data-v=""]');
await tab('htHome');await wait(1300);if(await page.$('#tuto'))await page.evaluate(()=>window.TRACE.tuto.close('passe')); /* Aujourd'hui a son guide */
await tab('htCom');await wait(1400);o6.commerce=await page.evaluate(()=>window.TRACE.tuto.open());
for(let i=0;i<15&&await page.$('#tuto');i++){await page.click('#tuto .tutoGo');await wait(220);}o6.commerceVu=await page.evaluate(()=>window.TRACE.tuto.seen('commerce'));
await click('#homeBody [data-act="af"][data-v="open|O2611-01"]');await wait(1300);o6.listeWhere=await where();o6.ouverteListe=await page.evaluate(()=>window.TRACE.tuto.open());
if(o6.ouverteListe)await page.evaluate(()=>{window.TRACE.tuto.close('passe');window.TRACE.tuto.reset('commerce:aff');}); /* aujourd'hui where() = « commerce » (déjà vu → rien) ; avec la ligne proposée dans espaceViewKey : « commerce:aff » → son tutoriel */
await tab('htHome');await page.evaluate(()=>{const r=[...document.querySelectorAll('#homeBody [data-act="notif"]')].find(e=>/Offre O2611-01/.test(e.textContent));if(r)r.click();});await wait(1500);o6.aff=await page.evaluate(()=>window.TRACE.tuto.open());
await page.evaluate(()=>window.TRACE.tuto.close('passe'));await click('#homeBody h2.vt .tuHelp');o6.affHelp=await page.evaluate(()=>window.TRACE.tuto.open());await page.evaluate(()=>window.TRACE.tuto.close(null));
await page.evaluate(()=>{const s=window.TRACE.affaires.state();s.view='list';s.cur=null;});
await tab('htParc');await wait(1400);o6.flotte=await page.evaluate(()=>window.TRACE.tuto.open());await page.evaluate(()=>window.TRACE.tuto.close('passe'));
await click('#homeBody [data-act="fl"][data-v="open|AB-123-CD"]');await click('#homeBody [data-act="x"][data-v^="veh|recep|"]');await wait(1400);o6.veh=await page.evaluate(()=>window.TRACE.tuto.open());await page.evaluate(()=>window.TRACE.tuto.close('passe'));
await click('#homeBody [data-act="x"][data-v="veh|cancel|"]');await click('#homeBody .ac-back[data-act="xsub"]');await click('#homeBody [data-act="fl"][data-v="back|"]');
await tab('htMag');await wait(1400);o6.magasin=await page.evaluate(()=>window.TRACE.tuto.open());await page.evaluate(()=>window.TRACE.tuto.close('passe'));
await click('#homeBody [data-act="parcseg"][data-v="materiel"]');await wait(1400);o6.materiel=await page.evaluate(()=>window.TRACE.tuto.open());await page.evaluate(()=>window.TRACE.tuto.close('fait'));
await click('#homeBody [data-act="parcseg"][data-v="magasin"]');
await page.evaluate(()=>window.TRACE.tuto.catalog());await wait(400);o6.catalogue=await page.evaluate(()=>[...document.querySelectorAll('#modal [data-tuk]')].map(b=>b.dataset.tuk+'='+b.querySelector('span').textContent+'|'+b.querySelector('small').textContent));
if(SHOTS)await page.screenshot({path:path.join(SHOTS,'tuto_catalogue_390.png')});
await page.evaluate(()=>{const b=document.querySelector('#modal [data-close]');if(b)b.click();});await wait(200);
await page.evaluate(()=>localStorage.removeItem('trace:tuto:test'));
console.log('c6) premier passage :',J(o6));
const K=x=>x&&x.k;
C.c6=K(o6.commerce)==='commerce'&&o6.commerceVu&&(o6.listeWhere==='commerce'?!o6.ouverteListe:o6.listeWhere==='commerce:aff'&&K(o6.ouverteListe)==='commerce:aff')&&K(o6.aff)==='commerce:aff'&&K(o6.affHelp)==='commerce:aff'&&K(o6.flotte)==='flotte'&&K(o6.veh)==='flotte:x:veh'&&K(o6.magasin)==='magasin'&&K(o6.materiel)==='magasin:materiel'
  &&['commerce=Vue d\'ensemble du module','commerce:aff=Une affaire ouverte','flotte=Vue d\'ensemble du module','flotte:x:veh=États des lieux','magasin=Vue d\'ensemble du module','magasin:materiel=Matériel'].every(x=>o6.catalogue.includes(x+'|✓ vu')); /* « Passer » ou « Terminé » : vu */
/* ── c7 : console ── */
C.c7=!logs.length;if(logs.length)console.log('console :',logs);
console.log('RÉSULTATS',J(C));const OK=Object.values(C).every(Boolean);console.log('RESULTAT:',OK?'TOUT VERT':'ÉCHEC '+Object.keys(C).filter(k=>!C[k]).join(' '));await browser.close();process.exit(OK?0:1);
