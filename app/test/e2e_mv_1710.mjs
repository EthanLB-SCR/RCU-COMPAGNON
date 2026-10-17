// LOT MV (17/10) — chantier partagé, suite : « l'affaire rattachée en noir complet sans détail », commun / séparé dossier par dossier, simple pour les gars.
// Données 100 % FICTIVES (ville « Villefictive », affaires O25xx / O26xx fictives), serveur Supabase SIMULÉ (sites, soudures, registre, parties de chantier).
// c0  fonctions pures (Node) : réglage (défauts, nettoyage), affaire d'un enregistrement, aperçu détaillé de l'étude, soudures d'un chantier IMPORTÉ jamais en double
// c1  V1, chemin RÉEL : étude DESSINÉE dans le traceur depuis l'affaire (✎ Dessiner le projet, contexte aff:), enregistrée, ↩ retour à l'affaire (rattachée toute seule),
//     jamais ouverte comme chantier ; au gain « ➕ Ajouter au chantier en cours » → « 🎯 Ajuster dans le traceur » : l'étude posée AVEC son détail (aller / retour,
//     soudures, nom · DN) même « Fond en couleurs » décoché (avant : ses axes seuls, en noir) ; calage validé ; pli « Commun / séparé » pré-réglé ; rattachée
// c2  rendu identique au plan d'ensemble : ligne 2026 rattachée = ligne 2025 = même étude gagnée en « Nouveau chantier » (couleurs de trait, soudures, n°, étiquettes)
// c3  on pointe une soudure 2026 (fiche, étape 1) : statut, serveur ; aucun n° de soudure en double sur le chantier
// c4  réglage par défaut (chantier MU sans réglage) : dossiers séparés = sélecteur « Affaire : 2025 · 2026 » (40 px, sans « Toutes »), communs sans ; plan sans ;
//     d'office la puce, sinon l'origine ; un choix vaut pour tous les dossiers séparés ; la puce remet son affaire
// c5  Modifs / TS : marché de l'affaire choisie ; TS posé sur une ligne 2026 → aff posée, dans 2026 seulement
// c6  fourniture : besoin = les lignes de l'affaire ; pièces en plus créées en 2026 → aff ; commandes de chaque affaire à part (totaux jamais mélangés)
// c7  phasage : phase marché importée en 2026 → aff ; phase posée sur une ligne 2025 → dans 2025 seulement
// c8  hydraulique : tronçons sur les lignes de l'affaire ; épreuve enregistrée en 2026 rangée à part ; PV nommé avec l'affaire
// c9  DH : mesure enregistrée sur une soudure 2026 → aff ; listée en 2026 seulement
// c10 liste / récap séparés : l'affaire choisie (totaux) ; DOE : lignes, soudures, TS, PV d'épreuve de l'affaire, nom « · affaire 2026 », jamais « Toutes »
// c11 ⚙ réglage (en tête d'un dossier) : Liste → commun (tout ensemble, plus de sélecteur), Conversation → séparée (chaque affaire son fil, message posté → aff) ;
//     retour : tout revient à sa place (aff gardées)
// c12 ⚙ depuis Tracé & chantiers et le Bureau ; lecture seule sans le droit ; hors connexion : « il faut la connexion », rien ne change
// c13 V3, opérateur (soudeur, téléphone 390 px) : nom de la ville, ni puces, ni couleurs d'affaire (légende, liseré) ; dossier séparé : sélecteur + phrase simple ;
//     il pointe une soudure 2026
// c14 chantier à une seule affaire : rien de nouveau (aucun sélecteur, aucune carte, DOE sans suffixe, liste complète)
// c15 téléphone 390 px (encadrement) : sélecteur, réglage, carte du Bureau sans débordement, boutons ≥ 40 px
// c16 console vide
import { chromium } from 'playwright';
import { mkdirSync } from 'node:fs';
import {MV_PARTS,partOf,partageClean,recAff,etudePreview,implicitWelds,mergeSites} from '../src/mutufus.js';
const BASE=process.env.BASE||'http://localhost:8808';
const SHOTS=process.env.SHOTS||'/root/work/mv_shots';try{mkdirSync(SHOTS,{recursive:true});}catch(e){}
const SB='https://pghftlepduvfazbiavhq.supabase.co';
const C={};const t0=Date.now();
// ── c0 · fonctions pures (Node)
{const ok=[];
  ok.push(partOf({},'liste')==='separe'&&partOf({},'conv')==='commun'&&partOf({},'plan')==='commun'&&partOf({},'export')==='separe'&&partOf({mutu:{partage:{ts:'commun',plan:'separe',stock:'separe'}}},'ts')==='separe');
  ok.push(partOf({mutu:{partage:{liste:'commun'}}},'liste')==='commun'&&partOf({mutu:{partage:{liste:'n\'importe quoi'}}},'liste')==='separe');
  ok.push(partageClean({liste:'commun',ts:'commun',conv:'commun',fourniture:'separe'})&&JSON.stringify(partageClean({liste:'commun',ts:'commun',conv:'commun',fourniture:'separe'}))==='{"liste":"commun"}'&&partageClean({})===null);
  const la=id=>({L3:'O26',L4:'O26',L1:''})[id];ok.push(recAff({aff:'X'},['L1'],la,'O25')==='X'&&recAff({},['L3','L4'],la,'O25')==='O26'&&recAff({},['L1','L3'],la,'O25')==='O25'&&recAff({},[],la,'O25')==='O25');
  const E={lines:[{id:'L1',name:'Ligne fictive',dn:80,e:0.4,axis:[[0,0],[24,0]],cond:{A:{els:[{axis:[[[0,0.2],[12,0.2]]]},{axis:[[[12,0.2],[24,0.2]]]}],welds:[{idx:0,weldId:'S-0007',x:12,y:0.2}]},R:{els:[{axis:[[[0,-0.2],[12,-0.2]]]},{axis:[[[12,-0.2],[24,-0.2]]]}],welds:[{idx:0,weldId:'S-0008',x:12,y:-0.2}]}}}]};
  const D=etudePreview(E);const cols=new Set(D.filter(d=>d.pts).map(d=>d.c));ok.push(cols.has('#c8382f')&&cols.has('#2a5fb4')&&cols.has('#1d1b17')&&!cols.has('#3f3d39')&&D.some(d=>d.text==='7')&&D.some(d=>d.text==='Ligne fictive · DN80')&&D.some(d=>d.fill));
  /* chantier IMPORTÉ (pas de soudures dans le plan : l'appli les numérote S-0001… à l'ouverture) : les soudures rattachées passent au-delà */
  const imp={id:'IMP',name:'Importé fictif 2025',lines:[{id:'R1',els:new Array(10).fill(0).map((x,i)=>({kind:'pipe',dn:100,len:12,axis:[[[i*12,0],[i*12+12,0]]],from:[i*12,0],to:[i*12+12,0]}))}]};
  const r=mergeSites(imp,E,{tx:0,ty:-30,rot:0,k:1},{aff:'O26',orig:'O25'});const nums=r.site.lines.filter(l=>l.aff==='O26').flatMap(l=>['A','R'].flatMap(c=>l.cond[c].welds.map(w=>+w.weldId.replace(/\D/g,''))));
  ok.push(implicitWelds(imp)>=18&&nums.length===2&&Math.min(...nums)>implicitWelds(imp));
  C.c0=ok.every(Boolean);console.log('c0) fonctions pures :',JSON.stringify(ok));}
// ── serveur simulé (comme e2e_mu_1610)
const UID='aaaaaaaa-1111-4222-8333-555555555555',UID2='bbbbbbbb-2222-4333-8444-666666666666';
const CHEF={id:UID,email:'chef.mv@exemple.fr',name:'Camille FICTIVE',role:'chef',active:true,poste:'resp_exploitation',admin:true,type:'salarie',rights:{},sites:null,prenom:'Camille',nom:'FICTIVE',created_at:'2026-10-01T09:00:00Z'};
const SOUD={id:UID2,email:'soudeur.mv@exemple.fr',name:'Dominique FICTIF',role:'soudeur',active:true,poste:'soudeur',admin:false,type:'salarie',rights:{},sites:null,prenom:'Dominique',nom:'FICTIF',created_at:'2026-10-01T09:00:00Z'};
const sessionOf=P=>({access_token:'tok',token_type:'bearer',expires_in:3600,expires_at:Math.floor(Date.now()/1000)+3600,refresh_token:'ref',user:{id:P.id,email:P.email,aud:'authenticated',role:'authenticated',app_metadata:{},user_metadata:{},created_at:'2026-10-01T09:00:00Z'}});
const SITES={},REG={},WELDS={};const nowIso=()=>new Date().toISOString();
const regRows=(kinds,since)=>Object.values(REG).filter(r=>kinds.includes(r.kind)&&(!since||r.updated_at>since));
const regPut=(kind,id,data)=>{REG[kind+'|'+id]={kind,id,data:JSON.parse(JSON.stringify(data)),updated_at:nowIso()};};
const browser=await chromium.launch({headless:true,executablePath:process.env.CHROMIUM_PATH||undefined});
async function route(ctx,P){
  await ctx.route(u=>u.href.startsWith(SB),async rt=>{const req=rt.request();const u=new URL(req.url());const p=u.pathname;const acc=req.headers()['accept']||'';
    const json=(o,status=200)=>rt.fulfill({status,contentType:'application/json',headers:{'access-control-allow-origin':'*'},body:JSON.stringify(o)});
    if(p==='/auth/v1/token')return json(sessionOf(P));if(p==='/auth/v1/user')return json(sessionOf(P).user);if(p.startsWith('/auth/v1/'))return json({});
    if(p==='/rest/v1/profiles'){const rows=[P];return json(/object/.test(acc)?rows[0]:rows);}
    if(p==='/rest/v1/registre'){const m=/kind=in\.\(([^)]*)\)/.exec(decodeURIComponent(u.search));const kinds=m?m[1].split(',').map(s=>s.replace(/"/g,'')):[];const g=/updated_at=gt\.([^&]+)/.exec(u.search);return json(regRows(kinds,g?decodeURIComponent(g[1]):null));}
    if(p==='/rest/v1/rpc/registre_set'){let b={};try{b=JSON.parse(req.postData()||'{}');}catch(e){}const k=b.p_kind+'|'+b.p_id;const old=REG[k]?REG[k].data:{};let data;
      if(b.p_mode==='replace')data=b.p_patch;else{data=Object.assign({},old);Object.keys(b.p_patch||{}).forEach(x=>{if(b.p_patch[x]===null)delete data[x];else data[x]=b.p_patch[x];});}
      REG[k]={kind:b.p_kind,id:b.p_id,data,updated_at:nowIso()};return json(REG[k]);}
    if(p==='/rest/v1/rpc/site_set_part'){let b={};try{b=JSON.parse(req.postData()||'{}');}catch(e){}const row=SITES[b.p_site];if(!row)return json(null);row.data=Object.assign({},row.data,{[b.p_key]:b.p_value});row.updated_at=nowIso();return json({at:row.updated_at,value:b.p_value});}
    if(p.startsWith('/rest/v1/rpc/'))return json(null);
    if(p==='/rest/v1/sites'){const sel=u.searchParams.get('select')||'';const m=/id=eq\.([^&]+)/.exec(u.search);const id=m?decodeURIComponent(m[1]):null;
      if(req.method()==='POST'){let b={};try{b=JSON.parse(req.postData()||'{}');}catch(e){}const rows=Array.isArray(b)?b:[b];const prefer=req.headers()['prefer']||'';
        rows.forEach(r=>{if(SITES[r.id]&&/ignore-duplicates/.test(prefer))return;SITES[r.id]={id:r.id,name:r.name,supplier:r.supplier||null,serie:r.serie||null,data:r.data||{},updated_at:r.updated_at||nowIso()};});return json([]);}
      let rows=Object.values(SITES).filter(r=>!id||r.id===id);
      if(/sat:/.test(sel))rows=rows.map(r=>({id:r.id,name:r.name,supplier:r.supplier,updated_at:r.updated_at,geo:r.data.geo||null,origin:null,bgo:null,sat:r.data.traceur&&r.data.traceur.savedAt||null,w:r.data.w||null,h:r.data.h||null,bbox:null,nbox:null,nw:null,deleted:r.data.deleted||null,deletedAt:r.data.deletedAt||null,builtin:null,ville:(r.data.fiche||{}).ville||null,chef:(r.data.fiche||{}).chef||null,conducteur:(r.data.fiche||{}).conducteur||null,secteur:null,etude:(r.data.fiche||{}).etude||null}));
      return json(/object/.test(acc)?(rows[0]||null):rows);}
    if(p==='/rest/v1/welds'){if(req.method()==='POST'){let b={};try{b=JSON.parse(req.postData()||'{}');}catch(e){}(Array.isArray(b)?b:[b]).forEach(r=>{WELDS[r.site_id+'|'+r.weld_id]=r;});return json([]);}
      const m=/site_id=eq\.([^&]+)/.exec(u.search);const sid=m?decodeURIComponent(m[1]):null;return json(Object.values(WELDS).filter(r=>!sid||r.site_id===sid).map(r=>({weld_id:r.weld_id,line_id:r.line_id,cond:r.cond,status:r.status,data:r.data||{}})));}
    if(p.startsWith('/storage/v1/'))return json({Key:'x',signedURL:'/x'});
    if(p.startsWith('/rest/v1/'))return json(/object/.test(acc)?null:[]);
    return json([]);});
  await ctx.route(u=>!u.href.startsWith(BASE)&&!u.href.startsWith(SB)&&/^https?:/.test(u.href),rt=>rt.fulfill({status:204,body:''}));}
const logs=[];const watch=pg=>{pg.on('pageerror',e=>logs.push('PAGEERROR: '+e.message.slice(0,300)));pg.on('console',m=>{if(m.type()==='error'&&!/realtime|websocket|Failed to fetch|net::ERR|404|400|204/i.test(m.text()))logs.push(m.text().slice(0,200));});pg.on('dialog',d=>d.accept().catch(()=>{}));};
const ctx=await browser.newContext({viewport:{width:1366,height:900}});await route(ctx,CHEF);const page=await ctx.newPage();watch(page);
const wait=ms=>page.waitForTimeout(ms);const T=(fn,arg)=>page.evaluate(fn,arg);
const shot=async(pg,name)=>{try{const had=await pg.evaluate(()=>{const t=document.getElementById('toast');if(t&&t.classList.contains('show')){t.classList.remove('show');return true;}return false;}).catch(()=>false);if(had)await pg.waitForTimeout(450); /* le message passager (2,6 s) masquait le bas des captures */await pg.screenshot({path:SHOTS+'/'+name+'.png'});}catch(e){console.log('capture '+name+' : '+e.message);}};
const idbSet=(pg,k,v)=>pg.evaluate(([k,v])=>new Promise(res=>{const q=indexedDB.open('trace-kv',1);q.onupgradeneeded=()=>q.result.createObjectStore('kv');q.onsuccess=()=>{const tx=q.result.transaction('kv','readwrite');tx.objectStore('kv').put(v,k);tx.oncomplete=()=>res(true);tx.onerror=()=>res(false);};q.onerror=()=>res(false);}),[k,v]);
const idbGet=(pg,k)=>pg.evaluate(k=>new Promise(res=>{const q=indexedDB.open('trace-kv',1);q.onupgradeneeded=()=>q.result.createObjectStore('kv');q.onsuccess=()=>{const g=q.result.transaction('kv','readonly').objectStore('kv').get(k);g.onsuccess=()=>res(g.result||null);g.onerror=()=>res(null);};q.onerror=()=>res(null);}),k);
const login=async(pg,P)=>{await pg.goto(BASE+'/index.html');await pg.waitForTimeout(500);await pg.evaluate(()=>{localStorage.clear();localStorage.setItem('trace:wide','1');});
  await pg.evaluate(()=>new Promise(r=>{try{const q=indexedDB.deleteDatabase('trace-kv');q.onsuccess=q.onerror=q.onblocked=()=>r();}catch(e){r();}}));await pg.reload();await pg.waitForTimeout(900);
  await pg.fill('#loginEmail',P.email);await pg.fill('#loginPwd','Mot-de-passe-fictif-1');await pg.click('#loginGo');await pg.waitForTimeout(1800);};
const openAff=async(pg,n,tab)=>{await pg.evaluate(async([n,tab])=>{const T=window.TRACE;T.showScreen('home');document.getElementById('htCom').click();await new Promise(x=>setTimeout(x,250));
  const S=T.affaires.state();S.view='fiche';S.cur=n;S.vview=null;S.tab='fiche';T.renderHome();await new Promise(x=>setTimeout(x,200));const t=document.querySelector('#eq-app [data-act=af][data-v="tab|'+tab+'"]');if(t)t.click();},[n,tab]);await pg.waitForTimeout(450);};
const drawAndSave=async(lines,name)=>{await page.evaluate(L=>{const M=window.MAQ;M.state.supplier='AXIOM';M.state.serie=1;M.state.lines=JSON.parse(JSON.stringify(L));M.state.seq=L.length+1;M.setMode('select');M.rebuild();M.save();},lines);await wait(300);
  await page.click('#bSave');await wait(250);await page.fill('#svName',name);await page.click('#svOk');await wait(1500);return page.evaluate(()=>window.MAQ.state.siteRef&&window.MAQ.state.siteRef.id);};
const openSite=async(pg,id)=>{await pg.evaluate(id=>window.TRACE.openSiteFromHome(id),id);await pg.waitForFunction(id=>window.TRACE.state.screen==='site'&&window.TRACE.state.siteId===id,id,{timeout:20000}).catch(()=>{});await pg.waitForTimeout(1500);};
const tab=async(pg,t)=>{await pg.evaluate(t=>{const T=window.TRACE;T.state.tab=t;T.renderAll();},t);await pg.waitForTimeout(250);};
const bar=(pg,t)=>pg.evaluate(t=>{const v=document.getElementById('view-'+t);const b=v&&[...v.children].find(x=>x.classList.contains('mv-sel'));if(!b)return null;const btns=[...b.querySelectorAll('[data-mvaff]')];
  return {btns:btns.map(x=>x.textContent.trim()),on:(btns.find(x=>x.classList.contains('on'))||{}).dataset.mvaff||null,h:btns.map(x=>Math.round(x.getBoundingClientRect().height)),dots:b.querySelectorAll('.mu-dot').length,gear:!!b.querySelector('[data-mvgear]'),txt:(b.querySelector('.mv-txt')||{}).textContent||''};},t);
const pick=(pg,t,aff)=>pg.evaluate(([t,aff])=>{const v=document.getElementById('view-'+t);const b=v&&v.querySelector('.mv-sel [data-mvaff="'+aff+'"]');if(b)b.click();return !!b;},[t,aff]);
const chip=(pg,i)=>pg.evaluate(i=>{const b=document.querySelector('#muChips [data-muchip="'+i+'"]');if(b)b.click();return !!b;},i);
const A25='O2501-71',A26='O2610-72',A27='O2610-73',AD='O2410-74';const CLIENT='RÉGIE FICTIVE DES RÉSEAUX',VILLE='Villefictive';
regPut('affaire',A25,{num:A25,nom:'Réseau de chaleur Villefictive 2025',client:CLIENT,ville:VILLE,etat:'en_cours',secteur:'ouest',sites:[],at:'2025-03-01T09:00:00Z'});
regPut('affaire',A26,{num:A26,nom:'Extension Villefictive 2026',client:CLIENT,ville:VILLE,etat:'devis',secteur:'ouest',sites:[],offre:{remiseAt:'2026-09-20T09:00:00Z'},at:'2026-09-01T09:00:00Z'});
regPut('affaire',A27,{num:A27,nom:'Antenne Bourgfictif 2026',client:'AUTRE CLIENT FICTIF',ville:'Bourgfictif',etat:'devis',secteur:'ouest',sites:[],offre:{remiseAt:'2026-09-21T09:00:00Z'},at:'2026-09-02T09:00:00Z'});
regPut('affaire',AD,{num:AD,nom:'Chantier seul fictif 2024',client:'CLIENT SEUL FICTIF',ville:'Seulville',etat:'en_cours',secteur:'ouest',sites:[],at:'2024-10-01T09:00:00Z'});
await login(page,CHEF);
// ── tracés : chantier 2025 et chantier seul (traceur, contexte chantier)
await page.goto(BASE+'/traceur.html?site=new');await wait(1300);
const L25=[{id:'L1',name:'Feeder fictif',dn:100,bar:12,pts:[[0,0],[60,0],[120,0]],specials:[],parent:null},{id:'L2',name:'Antenne Nord fictive',dn:80,bar:12,pts:[[60,0],[60,-50]],specials:[],parent:{line:'L1',m:60,side:1}}];
const CID=await drawAndSave(L25,'Villefictive 2025');
await page.goto(BASE+'/traceur.html?site=new');await wait(1300);
const DID=await drawAndSave([{id:'L1',name:'Ligne seule fictive',dn:80,bar:12,pts:[[0,0],[80,0]],specials:[],parent:null}],'Chantier seul fictif 2024');
const set=(n,o)=>{const k='affaire|'+n;REG[k].data=Object.assign({},REG[k].data,o);REG[k].updated_at=nowIso();};set(A25,{sites:[CID]});set(AD,{sites:[DID]});
const th=30*Math.PI/180,cs=Math.cos(th),sn=Math.sin(th);const X0=480000,Y0=6670000;
const geoC={crs:'EPSG:2154',aff:{a:1,b:0,c:0,d:-1,e:X0,f:Y0},pts:[]};const geoE={crs:'EPSG:2154',aff:{a:cs,b:-sn,e:60+X0,c:-sn,d:-cs,f:Y0+50},pts:[]};
const patchSite=async(id,o)=>{const r=SITES[id];if(r){r.data=Object.assign({},r.data,o);r.updated_at=nowIso();}const h=await idbGet(page,'trace:handoff:'+id);if(h)await idbSet(page,'trace:handoff:'+id,Object.assign({},h,o,r?{updated_at:r.updated_at}:{}));};
await page.goto(BASE+'/index.html');await wait(2000);
await patchSite(CID,{geo:geoC,fiche:{ville:VILLE}});await patchSite(DID,{fiche:{ville:'Seulville'}});
/* chantier 2025 en cours : 3 soudures faites (serveur) */
const cW=(SITES[CID].data.lines||[]).flatMap(L=>['A','R'].flatMap(c=>((L.cond[c]||{}).welds||[]).map(w=>({line:L.id,c,id:w.weldId}))));
cW.slice(0,3).forEach(w=>{WELDS[CID+'|'+w.id]={site_id:CID,weld_id:w.id,line_id:w.line,cond:w.c,status:'soudee',data:{events:[{type:'soudee',by:'Soudeur fictif',at:'2026-10-10T10:00:00Z'}],photos:[]}};});
await page.reload();await wait(2500);
// ── c1 · le chemin RÉEL d'Ethan : l'étude dessinée DANS LE TRACEUR depuis l'affaire, enregistrée, retour à l'affaire, jamais ouverte comme chantier
const L26=[{id:'L1',name:'Prolongement Nord 2026',dn:80,bar:12,pts:[[0,0],[0,-40],[30,-40]],specials:[],parent:null},{id:'L2',name:'Antenne Est 2026',dn:65,bar:12,pts:[[15,-40],[15,-62]],specials:[],parent:{line:'L1',m:55,side:1}}];
const drawEtude=async(num,name)=>{await openAff(page,num,'sites');await wait(400);const btn=await T(()=>!!document.querySelector('#eq-app [data-act=tabgo][data-v=traceur]'));
  await page.evaluate(()=>{const b=document.querySelector('#eq-app [data-act=tabgo][data-v=traceur]');if(b)b.click();});await page.waitForURL(/traceur\.html/,{timeout:10000}).catch(()=>{});await wait(1400);
  const ctxT=await T(()=>localStorage.getItem('trace:maquette:ctx'));const id=await drawAndSave(L26,name);
  await page.evaluate(()=>{const b=document.getElementById('svGo');if(b)b.click();});await page.waitForURL(/index\.html/,{timeout:10000}).catch(()=>{});await wait(2600);return {btn,ctxT,id};};
const d26=await drawEtude(A26,'Étude Villefictive 2026');const EID=d26.id;
const d27=await drawEtude(A27,'Étude Bourgfictif 2026');const E27=d27.id;
let out={d26:{btn:d26.btn,ctx:d26.ctxT,id:EID,ctxSaved:SITES[EID]&&SITES[EID].data.traceur.ctx,sites:REG['affaire|'+A26].data.sites},d27:{ctx:d27.ctxT,sites:REG['affaire|'+A27].data.sites}};
await patchSite(EID,{geo:geoE});await page.reload();await wait(2500);
out.never=await T(([e,c])=>({sess:!!(window.TRACE.state.siteId===e),metas:window.TRACE.etude.metas().includes(e),cand:window.TRACE.mutu.cands(window.TRACE.affaires.get(window.TRACE.affaires.state().cur||'')?.num||'').length}),[EID,CID]);
await openAff(page,A26,'offre');await page.evaluate(()=>{const b=document.querySelector('#eq-app [data-act=af][data-v="ogagne|"]');if(b)b.click();});await wait(600);
out.choice=await T(()=>!!document.getElementById('muChoice'));await page.evaluate(()=>{const b=document.getElementById('muAdd');if(b)b.click();});
await page.waitForSelector('#muConf',{timeout:15000}).catch(()=>{});await wait(300);out.conf1=await T(()=>{const m=document.getElementById('muConf');return m?/géoréférencement/.test(m.textContent):null;});
/* « Fond en couleurs » décoché dans le traceur (réglage de l'appareil) — c'est là que l'étude ressortait « en noir complet, sans détail » */
await page.evaluate(()=>{let s={};try{s=JSON.parse(localStorage.getItem('trace:traceur:show')||'{}')||{};}catch(e){}s.couleurs=false;localStorage.setItem('trace:traceur:show',JSON.stringify(s));});
await page.evaluate(()=>{const b=document.getElementById('muCal');if(b)b.click();});
await page.waitForURL(/traceur\.html/,{timeout:10000}).catch(()=>{});await page.waitForFunction(()=>window.MAQ&&window.MAQ.mutu&&window.MAQ.mutu.plan(),null,{timeout:20000}).catch(()=>{});await wait(900);
const calStats=()=>T(()=>{const g=document.querySelector('#bg g.plan[data-plan="mutu_tmp"]');if(!g)return null;const st={},fi={};g.querySelectorAll('path').forEach(p=>{const s=p.getAttribute('stroke');if(s&&s!=='none')st[s]=(st[s]||0)+1;const f=p.getAttribute('fill');if(f&&f!=='none')fi[f]=(fi[f]||0)+1;});return {st,fi,txt:[...g.querySelectorAll('text')].map(t=>t.textContent).slice(0,40),k:window.MAQ.state.view.k};});
const E26=await idbGet(page,'trace:handoff:'+EID);
/* AVANT = reconstitution exacte de l'ancien dessin du calage (axes + noms, rendu des fonds, « couleurs du fond » décochées) ; APRÈS = le dessin livré */
await page.evaluate(E=>{const M=window.MAQ;const p=M.bg.get('mutu_tmp');window.__mvNew=p.drawing;const old=[];(E.lines||[]).forEach(l=>{const ax=l.axis;if(!ax||ax.length<2)return;old.push({pts:ax.map(q=>[+q[0],+q[1]]),c:'#6a32c9',w:160,net:true});const m=ax[Math.floor((ax.length-1)/2)];old.push({text:String(l.name||l.id),x:+m[0],y:+m[1],h:2.4,c:'#4b2a86',net:true});});window.__mvOld=old;},E26);
const setDraw=nv=>page.evaluate(nv=>{const M=window.MAQ;const p=M.bg.get('mutu_tmp');p.drawing=nv?window.__mvNew:window.__mvOld;p.mutuTmp=!!nv;p._lastKey=null;p._bb=null;p._far=undefined;M.bg.setActive('mutu_tmp');},nv).then(()=>wait(500));
const reView=()=>page.evaluate(()=>{document.dispatchEvent(new Event('resize'));window.dispatchEvent(new Event('resize'));window.MAQ.bg.setActive('mutu_tmp');}).then(()=>wait(400));
/* 1) la vue d'arrivée du calage (cadrage automatique sur le chantier et l'étude) — ce qu'Ethan voit en cliquant « Caler » */
await shot(page,'pc_2a_calage_apres_vue_arrivee');out.k0=await T(()=>window.MAQ.state.view.k);
await setDraw(false);await shot(page,'pc_1a_calage_avant_vue_arrivee');
/* 2) zoom sur le départ de l'antenne (1 m ≈ 12 px), sous le bandeau du calage */
await setDraw(true);await page.evaluate(()=>{const M=window.MAQ;M.setMode('select');M.state.view.k=12;});await reView();
await page.evaluate(E=>{const M=window.MAQ;const L=(E.lines||[]).find(l=>/Antenne Est/.test(l.name||''));if(!L||!L.axis)return;const tee=M.bg.toWorld('mutu_tmp',[+L.axis[0][0],+L.axis[0][1]]);const sr=document.getElementById('svg').getBoundingClientRect();
  M.state.view.tx=innerWidth*0.42-sr.left-tee[0]*12;M.state.view.ty=Math.min(innerHeight-290,610)-sr.top-tee[1]*12;},E26);await reView(); /* le té de l'antenne au milieu de la zone libre (sous le bandeau, au-dessus de la légende) */
await setDraw(false);out.avant=await calStats();await shot(page,'pc_1b_calage_avant_zoom_noir_sans_detail');
await setDraw(true);out.apres=await calStats();await shot(page,'pc_2b_calage_apres_zoom_detail');
await page.evaluate(()=>{const b=document.querySelector('#muCal [data-mc=ok]');if(b)b.click();});
await page.waitForURL(/index\.html/,{timeout:10000}).catch(()=>{});await page.waitForSelector('#muConf',{timeout:25000}).catch(()=>{});await wait(400);
out.fold=await T(()=>{const f=document.getElementById('mvFold');if(!f)return null;f.open=true;const rows=[...f.querySelectorAll('.mv-prow')].map(r=>({k:r.dataset.mvrow,on:(r.querySelector('.mv-seg button.on')||{}).dataset?.mvp||null,fix:(r.querySelector('.mv-fix')||{}).textContent||null}));return {rows,h:[...f.querySelectorAll('.mv-seg button')].map(b=>Math.round(b.getBoundingClientRect().height))};});
await wait(200);await shot(page,'pc_3_confirmation_pli_commun_separe');
await page.evaluate(()=>{const b=document.getElementById('muGo');if(b)b.click();});
await page.waitForFunction(n=>{const a=window.TRACE.affaires.get(n);return a&&a.mutu&&!document.querySelector('#modal.show');},A26,{timeout:20000}).catch(()=>{});await wait(1500);
const S1=SITES[CID].data;out.res={aff:S1.affaires,n26:S1.lines.filter(l=>l.aff===A26).length,partage:S1.mutu&&S1.mutu.partage,nom:S1.name,verse:!!((SITES[EID].data.fiche||{}).etude||{}).verse,etat:REG['affaire|'+A26].data.etat};
console.log('c1) chemin réel + calage :',JSON.stringify(out).slice(0,2600));
const st0=out.avant&&out.avant.st||{},st1=out.apres&&out.apres.st||{},fi1=out.apres&&out.apres.fi||{};
C.c1=out.d26.btn&&out.d26.ctx==='aff:'+A26&&out.d26.ctxSaved==='etude'&&out.d26.sites.join()===EID&&out.d27.sites.join()===E27&&!out.never.sess&&!out.never.metas&&out.choice&&out.conf1
  &&Object.keys(st0).length>0&&Object.keys(st0).every(c=>c==='#3f3d39')&&!st0['#c8382f'] /* AVANT : rien que des traits noirs (« noir complet, sans détail ») */
  &&!!st1['#c8382f']&&!!st1['#2a5fb4']&&!!st1['#1d1b17']&&!st1['#3f3d39']&&!!fi1['#cbb8f2']&&out.apres.txt.some(t=>/Prolongement Nord 2026 · DN80/.test(t)) /* APRÈS : aller / retour, soudures, nom · DN, halo */
  &&!!out.fold&&out.fold.rows.length===MV_PARTS.length&&out.fold.rows.find(r=>r.k==='liste').on==='liste|separe'&&out.fold.rows.find(r=>r.k==='conv').on==='conv|commun'&&/toujours/.test(out.fold.rows.find(r=>r.k==='plan').fix||'')&&out.fold.h.every(h=>h>=40)
  &&out.res.aff.join()===[A25,A26].join()&&out.res.n26===2&&out.res.partage===undefined&&out.res.nom==='Villefictive'&&out.res.verse&&out.res.etat==='a_debuter';
// ── c2 · rendu identique au plan d'ensemble
await openSite(page,CID);
const net=await T(()=>window.TRACE.net.lines.map(l=>({id:l.id,aff:l.aff||'',parent:l.parent||null})));const ids26=net.filter(l=>l.aff===A26).map(l=>l.id),ids25=net.filter(l=>!l.aff).map(l=>l.id);const L26id=net.find(l=>l.aff===A26&&!l.parent).id;
const lineStats=(pg,L,k)=>pg.evaluate(([L,k])=>{const T=window.TRACE;const l=T.lines[L];if(!l)return null;const e=l.els[Math.floor(l.els.length/2)];T.state.view.k=k;T.centerOn(e.from.x,e.from.y);T.renderPlan();
  const g=document.getElementById('net');const els=[...g.querySelectorAll('g.el[data-line="'+L+'"]')];const mk=[...g.querySelectorAll('g.marker[data-line="'+L+'"]')];const st=new Set();els.forEach(x=>x.querySelectorAll('path,line').forEach(p=>{const s=p.getAttribute('stroke');if(s&&s!=='transparent'&&s!=='null')st.add(s);}));
  const J=['A','R'].reduce((n,c)=>n+((l.cond[c]&&l.cond[c].joints.length)||0),0);return {st:[...st].sort(),els:els.length,mk:mk.length,J,nums:g.querySelectorAll('g.marker[data-line="'+L+'"] text.num').length,labs:els.reduce((n,x)=>n+x.querySelectorAll('text').length,0),dim:els.filter(x=>x.getAttribute('opacity')==='.16').length};},[L,k]);
out={};for(const k of [8,20]){out['a'+k]=await lineStats(page,L26id,k);if(k===20)await shot(page,'pc_4_plan_ligne_2026_rattachee_zoom');out['b'+k]=await lineStats(page,'L1',k);if(k===20)await shot(page,'pc_5_plan_ligne_2025_zoom');}
out.chips=await T(()=>[...document.querySelectorAll('#muChips button')].map(b=>b.textContent.trim()));
/* la même étude gagnée en « Nouveau chantier » (référence) */
await openAff(page,A27,'offre');await page.evaluate(()=>{const b=document.querySelector('#eq-app [data-act=af][data-v="ogagne|"]');if(b)b.click();});await wait(600);
out.c27=await T(()=>!!document.getElementById('muChoice'));await page.evaluate(()=>{const b=document.getElementById('muNew');if(b)b.click();});await wait(2500);
await openSite(page,E27);out.n20=await lineStats(page,'L1',20);await shot(page,'pc_6_reference_nouveau_chantier_zoom');
console.log('c2) rendu :',JSON.stringify(out));
/* couleurs d'AVANCEMENT des soudures (à souder, soudée, contrôlée, manchonnée, à reprendre) : elles dépendent du pointage, pas du rendu → hors comparaison (le 2025 a déjà 3 soudures faites) */
const STAT_COL=['#898781','#eb6834','#2a78d6','#0ca30c','#d03b3b'];const noStat=x=>x.st.filter(c=>!STAT_COL.includes(c)).join();
const sameSet=(x,y)=>x&&y&&noStat(x)===noStat(y);
C.c2=out.a8&&out.b8&&sameSet(out.a8,out.b8)&&out.a8.st.includes('#141414')&&!out.a8.st.includes('#eb6834')&&out.b8.st.includes('#eb6834')&&out.a20&&out.b20&&sameSet(out.a20,out.n20)&&['#161616','#c8382f','#2a5fb4','#aeb4bb'].every(c=>out.a20.st.includes(c)&&out.b20.st.includes(c))
  &&out.a20.mk===out.a20.J&&out.a20.nums===out.a20.mk&&out.b20.nums===out.b20.mk&&out.a20.mk===out.n20.mk&&out.a20.labs===out.n20.labs&&out.a20.labs>0&&out.a20.dim===0&&out.c27&&out.chips.join('|')==='Toutes|2025|2026';
// ── c3 · on pointe une soudure 2026 ; aucun n° en double
await openSite(page,CID);
const PNG='data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg==';
await page.evaluate(([L,PNG])=>{const T=window.TRACE;const j=T.lines[L].cond.A.joints[0];j.steps=j.steps||{};j.steps[1]={photos:[PNG]};T.openJoint(L,'A',0);},[L26id,PNG]);await wait(500);
await page.evaluate(()=>{const s=document.querySelector('#sheet');const p=s.querySelector('#st1-proc');if(p)p.value='cellu';const v=s.querySelector('#st1-vis');if(v)v.checked=true;const b=s.querySelector('[data-stepok="1"]');if(b)b.click();});await wait(1500);
out={w:await T(L=>{const j=window.TRACE.lines[L].cond.A.joints[0];return {id:j.weldId,st:j.status};},L26id)};await page.evaluate(()=>window.TRACE.closeSheet());await wait(300);
out.srv=WELDS[CID+'|'+out.w.id]&&WELDS[CID+'|'+out.w.id].status;out.dup=await T(()=>{const a=window.TRACE.allJoints().map(x=>x.j.weldId);return a.length-new Set(a).size;});
console.log('c3) soudure 2026 :',JSON.stringify(out));C.c3=out.w.st==='soudee'&&out.srv==='soudee'&&out.dup===0;
// ── c4 · réglage par défaut, sélecteur
const SEP=MV_PARTS.filter(p=>p[2]==='separe').map(p=>p[0]),COM=['bureau','conv','qse','admin','stock','catalogue'];
out={part:await T(()=>window.TRACE.mutu.mv.parts().map(p=>[p[0],window.TRACE.mutu.mv.part(p[0])]))};
await chip(page,-1);out.bars={};for(const t of ['liste','recap','export','ts','fourniture','phasage','hydro','bouclage',...COM,'plan']){await tab(page,t);out.bars[t]=await bar(page,t);}
await tab(page,'liste');await shot(page,'pc_7_selecteur_dossier_separe');
out.def=await T(()=>window.TRACE.mutu.mv.sel());await chip(page,1); /* puces : -1 = Toutes, 0 = 2025 (origine), 1 = 2026 */await wait(300);out.chip26=await T(()=>window.TRACE.mutu.mv.sel());await chip(page,-1);await wait(300);out.back=await T(()=>window.TRACE.mutu.mv.sel());
await tab(page,'liste');await pick(page,'liste',A26);await wait(300);await tab(page,'recap');out.recapBar=await bar(page,'recap');await chip(page,0);await wait(300);out.chip25=await T(()=>window.TRACE.mutu.mv.sel());await chip(page,-1);await wait(200);out.toutes2=await T(()=>window.TRACE.mutu.mv.sel()); /* puce touchée → le choix fait dans un dossier est oublié : « Toutes » = l'origine */
const okBar=t=>!!(out.bars[t]&&out.bars[t].btns.join()==='2025,2026'&&out.bars[t].h.every(h=>h>=40)&&out.bars[t].on===A25&&!out.bars[t].btns.includes('Toutes')&&out.bars[t].dots===2&&out.bars[t].gear);
const c4s={part:out.part.every(([k,v])=>v===MV_PARTS.find(p=>p[0]===k)[2]),sep:SEP.filter(t=>!okBar(t)),com:COM.filter(t=>!!out.bars[t]),plan:!out.bars.plan,ts:!!out.bars.ts&&/affaire 2025/.test(out.bars.ts.txt)&&/marché/.test(out.bars.ts.txt),doe:!!out.bars.export&&/DOE par marché/.test(out.bars.export.txt),def:out.def===A25,chip26:out.chip26===A26,back:out.back===A25,recap:!!out.recapBar&&out.recapBar.on===A26,chip25:out.chip25===A25,toutes2:out.toutes2===A25};
console.log('c4) défaut, sélecteur :',JSON.stringify({...out,bars:Object.fromEntries(Object.entries(out.bars).map(([k,b])=>[k,b&&{btns:b.btns.join(),on:b.on,h:b.h.join(),dots:b.dots,gear:b.gear}]))}),'· contrôles :',JSON.stringify(c4s));
C.c4=c4s.part&&!c4s.sep.length&&!c4s.com.length&&c4s.plan&&c4s.ts&&c4s.doe&&c4s.def&&c4s.chip26&&c4s.back&&c4s.recap&&c4s.chip25&&c4s.toutes2;
// ── c5 · Modifs / TS
out={};await tab(page,'ts');await pick(page,'ts',A26);await wait(300);
out.m26=await T(()=>{const M=window.TRACE.ts.marche();return {aff:M&&M.aff,n:M&&M.lines.length};});
out.it=await T(L=>{const T=window.TRACE;const it=T.ts.markRange(L,1,6,{etat:'propose',ts:'DEV-FICTIF-26',desig:'Coude supplémentaire fictif'});T.renderAll();const x=T.ts.of().items.find(i=>i.ts==='DEV-FICTIF-26');return x?{aff:x.aff,line:x.line}:null;},L26id);await wait(300);
out.see26=await T(()=>/DEV-FICTIF-26|Coude supplémentaire fictif/.test(document.getElementById('tsview').textContent));await shot(page,'pc_8_modifs_affaire_2026');
await pick(page,'ts',A25);await wait(300);out.m25=await T(()=>{const M=window.TRACE.ts.marche();return {aff:M&&M.aff||'origine',n:M&&M.lines.length};});out.see25=await T(()=>/DEV-FICTIF-26|Coude supplémentaire fictif/.test(document.getElementById('tsview').textContent));
/* l'envoi au serveur part 1,2 s après la dernière modification (file d'écriture) */for(let i=0;i<25&&!((SITES[CID].data.ts||{}).items||[]).some(i=>i.ts==='DEV-FICTIF-26');i++)await wait(200);
out.srv=((SITES[CID].data.ts||{}).items||[]).filter(i=>i.ts==='DEV-FICTIF-26').map(i=>i.aff);
console.log('c5) Modifs / TS :',JSON.stringify(out));
C.c5=out.m26.aff===A26&&out.m26.n===2&&out.m25.aff==='origine'&&out.m25.n===2&&!!out.it&&out.it.aff===A26&&out.see26&&!out.see25&&out.srv.join()===A26;
// ── c6 · fourniture
out={};await tab(page,'fourniture');await pick(page,'fourniture',A26);await wait(300);
const fz=()=>T(()=>{const R=window.TRACE.fourniture.compute();return R?{besoin:R.tot.besoin,cde:R.tot.cde,plus:R.tot.plus,act:R.tot.act}:null;});
out.f26=await fz();await page.evaluate(()=>{const b=document.querySelector('#fourniture [data-fa="xadd"]');if(b)b.click();});await wait(300);
await page.evaluate(()=>{const q=document.getElementById('fx-q');if(q)q.value='3';const b=document.getElementById('fx-ok');if(b)b.click();});await wait(500);
out.f26b=await fz();out.extra=await T(()=>(window.TRACE.net.fourniture.extra||[]).map(x=>({aff:x.aff,qty:x.qty})));
/* une commande de chaque affaire (enregistrements déjà là : celle sans aff = l'origine) */
await page.evaluate(A26=>{const F=window.TRACE.fourniture.of();F.cmds.push({id:'FCmv25',name:'Commande fictive 2025',lines:[{key:'pipe:100',kind:'pipe',dn:100,qty:7,label:'Barre DN100'}],at:new Date().toISOString(),upd:new Date().toISOString()});F.cmds.push({id:'FCmv26',name:'Commande fictive 2026',aff:A26,lines:[{key:'pipe:80',kind:'pipe',dn:80,qty:5,label:'Barre DN80'}],at:new Date().toISOString(),upd:new Date().toISOString()});window.TRACE.renderAll();},A26);await wait(300);
out.f26c=await fz();out.cmd26=await T(()=>[...document.querySelectorAll('#fourniture .eq-row b')].map(b=>b.textContent).filter(t=>/Commande fictive/.test(t)));await shot(page,'pc_9_fourniture_affaire_2026');
await pick(page,'fourniture',A25);await wait(300);out.f25=await fz();out.cmd25=await T(()=>[...document.querySelectorAll('#fourniture .eq-row b')].map(b=>b.textContent).filter(t=>/Commande fictive/.test(t)));
console.log('c6) fourniture :',JSON.stringify(out));
C.c6=out.f26&&out.f25&&out.f26.act>0&&out.f25.act>0&&out.f26b.plus===3&&out.f25.plus===0&&out.extra.length===1&&out.extra[0].aff===A26&&out.f26c.cde===5&&out.f25.cde===7&&out.cmd26.join()==='Commande fictive 2026'&&out.cmd25.join()==='Commande fictive 2025';
// ── c7 · phasage
out={};await tab(page,'phasage');await pick(page,'phasage',A26);await wait(300);
out.n=await T(()=>window.TRACE.phasage.importText('Phase marché fictive 2026;02/11/2026;27/11/2026'));
await page.evaluate(()=>{const P=window.TRACE.phasage.of();P.phases.push({id:'PHmv25',name:'Phase fictive 2025',level:'exe',color:'#e67e22',tr:[{line:'L1',m0:0,m1:40}],dates:{tr:['',''],so:['2026-11-02','2026-11-06'],rb:['',''],en:['','']},by:'test',at:new Date().toISOString()});window.TRACE.renderAll();});await wait(300);
const phNames=()=>T(()=>[...document.querySelectorAll('#phasage .phName')].map(i=>i.value).concat([...document.querySelectorAll('#phasage [data-phc]')].map(x=>x.getAttribute('data-phc'))));
await page.evaluate(()=>{window.TRACE.state.phLv='all';window.TRACE.renderAll();});await wait(200);out.v26=await T(()=>document.getElementById('phasage').textContent);await shot(page,'pc_10_phasage_affaire_2026');
await pick(page,'phasage',A25);await wait(300);out.v25=await T(()=>document.getElementById('phasage').textContent);
out.data=await T(()=>window.TRACE.phasage.of().phases.map(p=>({n:p.name,aff:p.aff||''})));
console.log('c7) phasage :',JSON.stringify({n:out.n,data:out.data,in26:[/Phase marché fictive 2026/.test(out.v26),/Phase fictive 2025/.test(out.v26)],in25:[/Phase marché fictive 2026/.test(out.v25),/Phase fictive 2025/.test(out.v25)]}));
C.c7=out.n===1&&out.data.find(p=>p.n==='Phase marché fictive 2026').aff===A26&&/Phase marché fictive 2026/.test(out.v26)&&!/Phase fictive 2025/.test(out.v26)&&/Phase fictive 2025/.test(out.v25)&&!/Phase marché fictive 2026/.test(out.v25);
// ── c8 · hydraulique
out={};await tab(page,'hydro');await pick(page,'hydro',A26);await wait(300);
const hyd=()=>T(()=>{const H=window.TRACE.hydro.build();return H?H.troncons.map(t=>t.lines).flat():null;});
out.h26=await hyd();await page.evaluate(()=>window.TRACE.hydroExec.open(0,'epreuve'));await wait(400);out.modal=await T(()=>!!document.getElementById('hxOk'));
await page.evaluate(()=>{const b=document.getElementById('hxOk');if(b)b.click();});await wait(500);
out.ex26=await T(()=>!!window.TRACE.hydroExec.of(0,'epreuve'));out.tag=await T(()=>window.TRACE.mutu.mv.tag('hydro'));await shot(page,'pc_11_hydraulique_affaire_2026');
await pick(page,'hydro',A25);await wait(300);out.h25=await hyd();out.ex25=await T(()=>!!window.TRACE.hydroExec.of(0,'epreuve'));
out.data=await T(A26=>{const h=window.TRACE.net.hydro||{};return {exec:Object.keys(h.exec||{}),aff:Object.keys((h.execAff||{})[A26]||{})};},A26);
console.log('c8) hydraulique :',JSON.stringify(out));
C.c8=Array.isArray(out.h26)&&out.h26.length>0&&out.h26.every(id=>ids26.includes(id))&&Array.isArray(out.h25)&&out.h25.length>0&&out.h25.every(id=>ids25.includes(id))&&out.modal&&out.ex26&&!out.ex25&&out.data.aff.join()==='0'&&!out.data.exec.includes('0')&&out.tag===' · affaire 2026';
// ── c9 · DH : mesure sur une soudure 2026
out={};await tab(page,'bouclage');await pick(page,'bouclage',A26);await wait(300);
await page.evaluate(L=>{const T=window.TRACE;T.state.locate.line=L;T.state.locate.cond='A';T.state.dh.at={line:L,idx:1};T.state.dh.iso='550';T.state.tab='bouclage';T.renderAll();},L26id);await wait(400);
out.btn=await T(()=>!!document.getElementById('dh-save-mesure'));await page.evaluate(()=>{const i=document.getElementById('dh-iso2');if(i)i.value='550';const c=document.getElementById('dh-check');if(c)c.click();});await wait(300);
await page.evaluate(()=>{const b=document.getElementById('dh-save-mesure');if(b)b.click();});await wait(500);
out.mes=await T(()=>((window.TRACE.net.dhData||{}).mesures||[]).map(m=>({aff:m.aff,w:m.weldId})));out.list26=await T(()=>{const c=[...document.querySelectorAll('#bouclage .card')].find(x=>/Dernières mesures/.test(x.textContent));return c?c.querySelectorAll('tr').length-1:0;});
out.main26=await T(()=>window.TRACE.state.locate.line);await shot(page,'pc_12_dh_affaire_2026');
await pick(page,'bouclage',A25);await wait(300);out.list25=await T(()=>{const c=[...document.querySelectorAll('#bouclage .card')].find(x=>/Dernières mesures/.test(x.textContent));return c?c.querySelectorAll('tr').length-1:0;});out.main25=await T(()=>window.TRACE.state.locate.line);
console.log('c9) DH :',JSON.stringify(out));
C.c9=out.btn&&out.mes.length===1&&out.mes[0].aff===A26&&out.list26===1&&out.list25===0&&ids26.includes(out.main26)&&ids25.includes(out.main25);
// ── c10 · liste / récap / DOE (dossiers séparés)
out={};await tab(page,'liste');await pick(page,'liste',A26);await wait(300);out.l26=await T(()=>[...new Set([...document.querySelectorAll('#liste .wrow')].map(r=>r.dataset.line))]);
await tab(page,'recap');out.r26=await T(()=>({lines:(()=>{const h=[...document.querySelectorAll('#recap h3')].find(x=>/par ligne/.test(x.textContent));const tb=h&&h.nextElementSibling;return tb?[...tb.querySelectorAll('tr')].slice(1,-1).map(r=>r.cells[0].textContent):[];})(),kpi:(document.querySelector('#recap .kpis .kpi:nth-child(3) b')||{}).textContent,title:(document.querySelector('#recap h2')||{}).textContent}));
const nW=ids=>T(ids=>ids.reduce((n,L)=>n+['A','R'].reduce((x,c)=>x+((window.TRACE.lines[L].cond[c]||{joints:[]}).joints.length),0),0),ids);out.nW26=await nW(ids26);out.nW25=await nW(ids25);
await tab(page,'export');out.doe26=await T(L=>{const D=window.TRACE.doe.data();return {lines:D.lines.map(l=>l.id),welds:D.welds.length,ts:D.ts.map(t=>t.devis),name:D.site.name,m:D.marche&&D.marche.at,adm:D.admin.length};},L26id);
await pick(page,'export',A25);await wait(300);out.doe25=await T(()=>{const D=window.TRACE.doe.data();return {lines:D.lines.map(l=>l.id),welds:D.welds.length,ts:D.ts.map(t=>t.devis),name:D.site.name};});await shot(page,'pc_13_export_doe_affaire_2025');
await pick(page,'liste',A25);await tab(page,'liste');out.l25=await T(()=>[...new Set([...document.querySelectorAll('#liste .wrow')].map(r=>r.dataset.line))]);
console.log('c10) liste / récap / DOE :',JSON.stringify(out));
C.c10=out.l26.length===ids26.length&&out.l26.every(l=>ids26.includes(l))&&out.r26.lines.length===2&&+out.r26.kpi===out.nW26&&/affaire 2026/.test(out.r26.title)&&out.doe26.lines.every(l=>ids26.includes(l))&&out.doe26.lines.length===ids26.length&&out.doe26.welds===out.nW26
  &&out.doe26.ts.join()==='DEV-FICTIF-26'&&/· affaire 2026$/.test(out.doe26.name)&&!!out.doe26.m&&out.doe25.lines.every(l=>ids25.includes(l))&&out.doe25.lines.length===ids25.length&&out.doe25.welds===out.nW25&&out.doe25.ts.length===0&&/· affaire 2025$/.test(out.doe25.name)&&out.l25.every(l=>ids25.includes(l))&&out.l25.length===ids25.length;
// ── c11 · ⚙ réglage : Liste → commun, Conversation → séparée ; puis retour
out={};await tab(page,'liste');await page.evaluate(()=>{const b=document.querySelector('#view-liste .mv-sel [data-mvgear]');if(b)b.click();});await wait(400);
out.modal=await T(()=>{const m=document.getElementById('mvPart');return m?{rows:m.querySelectorAll('.mv-prow').length,ro:!!m.querySelector('.warnbox'),h:[...m.querySelectorAll('.mv-seg button')].map(b=>Math.round(b.getBoundingClientRect().height))}:null;});
await page.evaluate(()=>{['liste|commun','conv|separe'].forEach(k=>{const b=document.querySelector('#mvPart [data-mvp="'+k+'"]');if(b)b.click();});});await wait(150);await shot(page,'pc_14_reglage_commun_separe');
await page.evaluate(()=>{const b=document.getElementById('mvPartGo');if(b)b.click();});await page.waitForFunction(()=>!document.querySelector('#modal.show'),null,{timeout:15000}).catch(()=>{});await wait(800);
out.srv=SITES[CID].data.mutu&&SITES[CID].data.mutu.partage;await tab(page,'liste');out.bl=await bar(page,'liste');out.lAll=await T(()=>[...new Set([...document.querySelectorAll('#liste .wrow')].map(r=>r.dataset.line))].length);
await tab(page,'conv');out.bc=await bar(page,'conv');
/* conversation séparée : un message posté en 2026 → aff ; absent du fil 2025 ; un ancien message (sans aff) → l'origine */
await page.evaluate(()=>{const C=window.TRACE.net.conv||(window.TRACE.net.conv={msgs:[],seq:1});C.msgs=C.msgs||[];C.msgs.push({id:'CMVold',at:'2026-10-15T08:00:00Z',upd:'2026-10-15T08:00:00Z',by:'Chef fictif',text:'Message fictif d\'avant',photos:[],kind:'msg'});window.TRACE.renderAll();});await wait(200);
await pick(page,'conv',A26);await wait(300);await page.evaluate(()=>{const t=document.getElementById('cvText');if(t)t.value='Message fictif affaire 2026';const b=document.getElementById('cvSend');if(b)b.click();});await wait(700);
out.c26=await T(()=>document.getElementById('convview').textContent);out.msgs=await T(()=>(window.TRACE.net.conv.msgs||[]).map(m=>({t:m.text,aff:m.aff||''})));
await pick(page,'conv',A25);await wait(300);out.c25=await T(()=>document.getElementById('convview').textContent);
/* retour : Liste → séparée (défaut), Conversation → commune (défaut) : plus de réglage, tout revient à sa place, les aff restent */
await openAff(page,A26,'sites');await wait(1200);await page.evaluate(id=>{const b=document.querySelector('#eq-app [data-v="mupart|'+id+'"]');if(b)b.click();},CID);await wait(400);
out.fromAff=await T(()=>!!document.getElementById('mvPart'));await shot(page,'pc_15_reglage_depuis_trace_et_chantiers');
await page.evaluate(()=>{['liste|separe','conv|commun'].forEach(k=>{const b=document.querySelector('#mvPart [data-mvp="'+k+'"]');if(b)b.click();});const g=document.getElementById('mvPartGo');if(g)g.click();});await page.waitForFunction(()=>!document.querySelector('#modal.show'),null,{timeout:15000}).catch(()=>{});await wait(800);
out.srv2=SITES[CID].data.mutu&&('partage' in SITES[CID].data.mutu);await openSite(page,CID);await tab(page,'liste');out.bl2=await bar(page,'liste');
out.affKept=await T(A26=>({ts:(window.TRACE.ts.of().items||[]).filter(i=>i.ts==='DEV-FICTIF-26').map(i=>i.aff).join(),fx:(window.TRACE.net.fourniture.extra||[]).map(x=>x.aff).join(),msg:(window.TRACE.net.conv.msgs||[]).filter(m=>m.text==='Message fictif affaire 2026').map(m=>m.aff).join()}),A26);
console.log('c11) réglage :',JSON.stringify({modal:out.modal,srv:out.srv,bl:!!out.bl,lAll:out.lAll,bc:out.bc&&out.bc.btns,msgs:out.msgs,in26:[/Message fictif affaire 2026/.test(out.c26),/Message fictif d'avant/.test(out.c26)],in25:[/Message fictif affaire 2026/.test(out.c25),/Message fictif d'avant/.test(out.c25)],fromAff:out.fromAff,srv2:out.srv2,bl2:!!out.bl2,affKept:out.affKept}));
C.c11=!!out.modal&&out.modal.rows===MV_PARTS.length&&!out.modal.ro&&out.modal.h.every(h=>h>=40)&&JSON.stringify(out.srv)===JSON.stringify({conv:'separe',liste:'commun'})&&!out.bl&&out.lAll===net.length&&!!out.bc&&out.bc.btns.join()==='2025,2026'
  &&out.msgs.find(m=>m.t==='Message fictif affaire 2026').aff===A26&&/Message fictif affaire 2026/.test(out.c26)&&!/Message fictif d'avant/.test(out.c26)&&!/Message fictif affaire 2026/.test(out.c25)&&/Message fictif d'avant/.test(out.c25)
  &&out.fromAff&&out.srv2===false&&!!out.bl2&&out.affKept.ts===A26&&out.affKept.fx===A26&&out.affKept.msg===A26;
// ── c12 · ⚙ dans le Bureau ; hors connexion
out={};await tab(page,'bureau');out.card=await T(()=>{const c=document.getElementById('mvBur');return c?{t:c.textContent,h:Math.round((c.querySelector('[data-mvset]')||{getBoundingClientRect:()=>({height:0})}).getBoundingClientRect().height)}:null;});await page.evaluate(()=>{const c=document.getElementById('mvBur');if(c)c.scrollIntoView({block:'center'});});await wait(300);await shot(page,'pc_16_bureau_carte_chantier_partage');
await page.evaluate(()=>{const b=document.querySelector('#mvBur [data-mvset]');if(b)b.click();});await wait(400);out.modal=await T(()=>!!document.getElementById('mvPart'));
const before=JSON.stringify(SITES[CID].data.mutu);await ctx.setOffline(true);
await page.evaluate(()=>{const b=document.querySelector('#mvPart [data-mvp="recap|commun"]');if(b)b.click();const g=document.getElementById('mvPartGo');if(g)g.click();});await wait(900);
out.toast=await T(()=>[...document.querySelectorAll('.toast,#toast')].map(x=>x.textContent).join(' | '));out.same=JSON.stringify(SITES[CID].data.mutu)===before;out.part=await T(()=>window.TRACE.mutu.mv.part('recap'));
await ctx.setOffline(false);await wait(300);
console.log('c12) bureau, hors connexion :',JSON.stringify(out));
C.c12=!!out.card&&/Chantier partagé par 2 affaires/.test(out.card.t)&&out.card.h>=40&&out.modal&&/connexion/.test(out.toast)&&out.same&&out.part==='separe';
// ── c14 · chantier à une seule affaire : rien de nouveau
await openSite(page,DID);out={bars:{}};for(const t of ['liste','recap','export','ts','fourniture','phasage','hydro','bouclage','conv','bureau']){await tab(page,t);out.bars[t]=await T(t=>!!document.querySelector('#view-'+t+' > .mv-sel'),t);}
out.bur=await T(()=>!!document.getElementById('mvBur'));out.chips=await T(()=>!!document.getElementById('muChips'));out.doe=await T(()=>{const D=window.TRACE.doe.data();return {name:D.site.name,lines:D.lines.length};});
await tab(page,'liste');out.liste=await T(()=>[...new Set([...document.querySelectorAll('#liste .wrow')].map(r=>r.dataset.line))].length);out.mu=await T(()=>{const n=window.TRACE.net;return {aff:n.affaires,mutu:n.mutu,ma:n.marchesAff};});
console.log('c14) chantier à une affaire :',JSON.stringify(out));
C.c14=Object.values(out.bars).every(v=>!v)&&!out.bur&&!out.chips&&out.doe.name==='Chantier seul fictif 2024'&&out.doe.lines===1&&out.liste===1&&!out.mu.aff&&!out.mu.mutu&&!out.mu.ma;
// ── c15 · téléphone 390 px (encadrement)
const ovf=pg=>pg.evaluate(()=>{const W=innerWidth;const bad=[...document.querySelectorAll('.mv-sel,.mv-sel *,#mvBur,#mvBur *,#modal .box,#modal .box *,#siteHead,#siteHead *')].filter(e=>{const s=getComputedStyle(e);if(s.display==='none'||s.visibility==='hidden')return false;const r=e.getBoundingClientRect();return r.width>0&&r.right>W+1&&!e.closest('.mu-chips');}).slice(0,5).map(e=>(e.id||e.className||e.tagName)+':'+Math.round(e.getBoundingClientRect().right));return {sw:document.documentElement.scrollWidth,W,bad};});
const ctxM=await browser.newContext({viewport:{width:390,height:844},isMobile:true,hasTouch:true,deviceScaleFactor:2});await route(ctxM,CHEF);const pm=await ctxM.newPage();watch(pm);
await login(pm,CHEF);await pm.waitForTimeout(1200);await openSite(pm,CID);await tab(pm,'liste');
out={liste:await ovf(pm),bar:await bar(pm,'liste')};await shot(pm,'tel_1_selecteur_dossier_separe');
await tab(pm,'bureau');await pm.evaluate(()=>{const c=document.getElementById('mvBur');if(c)c.scrollIntoView({block:'center'});});await pm.waitForTimeout(300);out.bur=await ovf(pm);await shot(pm,'tel_2_bureau_carte');
await pm.evaluate(()=>{const b=document.querySelector('#mvBur [data-mvset]');if(b)b.click();});await pm.waitForTimeout(500);out.modal=await ovf(pm);out.mh=await pm.evaluate(()=>[...document.querySelectorAll('#mvPart .mv-seg button,#mvPart .actions .btn')].map(b=>Math.round(b.getBoundingClientRect().height)));await shot(pm,'tel_3_reglage_commun_separe');
await pm.evaluate(()=>{const b=document.querySelector('#mvPart [data-close]');if(b)b.click();});await pm.waitForTimeout(300);
/* l'affaire 2026 → Tracé & chantiers → la ligne du chantier partagé et son « ⚙ Commun / séparé par dossier » */
await openAff(pm,A26,'sites');await pm.waitForTimeout(500);
out.row=await pm.evaluate(()=>{const r=document.querySelector('.mu-row[data-mu="1"]');if(!r)return null;r.scrollIntoView({block:'center'});const W=innerWidth;const bad=[r,...r.querySelectorAll('*')].filter(e=>{const s=getComputedStyle(e);if(s.display==='none'||s.visibility==='hidden')return false;const q=e.getBoundingClientRect();return q.width>0&&q.right>W+1;}).length;const g=r.querySelector('[data-v^="mupart|"]');return {sw:document.documentElement.scrollWidth,bad,gear:g?g.textContent.trim():null};});
await pm.waitForTimeout(300);await shot(pm,'tel_6_affaire_ligne_chantier_partage');
console.log('c15) téléphone 390 px :',JSON.stringify(out));
C.c15=out.liste.sw<=390&&!out.liste.bad.length&&!!out.bar&&out.bar.h.every(h=>h>=40)&&out.bur.sw<=390&&!out.bur.bad.length&&out.modal.sw<=390&&!out.modal.bad.length&&out.mh.length>0&&out.mh.every(h=>h>=40)
  &&!!out.row&&out.row.sw<=390&&out.row.bad===0&&out.row.gear==='⚙ Commun / séparé par dossier';
await ctxM.close();
// ── c13 · V3, l'opérateur (soudeur, téléphone 390 px)
const ctxO=await browser.newContext({viewport:{width:390,height:844},isMobile:true,hasTouch:true,deviceScaleFactor:2});await route(ctxO,SOUD);const po=await ctxO.newPage();watch(po);
await login(po,SOUD);await po.waitForTimeout(1500);out={op:await po.evaluate(()=>window.TRACE.mutu.mv.operator()),list:await po.evaluate(()=>{window.TRACE.showScreen('home');window.TRACE.state.homeTab='list';window.TRACE.renderHome();return true;})};await po.waitForTimeout(700);
out.home=await po.evaluate(()=>document.getElementById('homeBody').textContent);await openSite(po,CID);
out.head=await po.evaluate(()=>({name:document.getElementById('shName').textContent,chips:!!document.getElementById('muChips'),halo:!!document.querySelector('#net g.mu-halo'),leg:document.querySelectorAll('#legend .mu-leg').length,dim:document.querySelectorAll('#net g.el[opacity=".16"]').length}));
await shot(po,'tel_4_operateur_plan');await tab(po,'liste');out.bar=await bar(po,'liste');out.ovf=await ovf(po);await shot(po,'tel_5_operateur_dossier_separe');
out.ro=await po.evaluate(id=>{window.TRACE.mutu.mv.open(id);const m=document.getElementById('mvPart');const r=m?{warn:!!m.querySelector('.warnbox'),dis:[...m.querySelectorAll('.mv-seg button')].every(b=>b.disabled),go:!!document.getElementById('mvPartGo')}:null;const c=document.querySelector('#modal [data-close]');if(c)c.click();return r;},CID);
await tab(po,'plan');const L26j=await po.evaluate(L=>{const T=window.TRACE;const j=T.lines[L].cond.R.joints[0];return j?j.weldId:null;},L26id);
await po.evaluate(([L,PNG])=>{const T=window.TRACE;const j=T.lines[L].cond.R.joints[0];j.steps=j.steps||{};j.steps[1]={photos:[PNG]};T.openJoint(L,'R',0);},[L26id,PNG]);await po.waitForTimeout(500);
await po.evaluate(()=>{const s=document.querySelector('#sheet');const p=s&&s.querySelector('#st1-proc');if(p)p.value='cellu';const v=s&&s.querySelector('#st1-vis');if(v)v.checked=true;const b=s&&s.querySelector('[data-stepok="1"]');if(b)b.click();});await po.waitForTimeout(1500);
out.weld=await po.evaluate(L=>window.TRACE.lines[L].cond.R.joints[0].status,L26id);out.srv=WELDS[CID+'|'+L26j]&&WELDS[CID+'|'+L26j].status;
console.log('c13) opérateur :',JSON.stringify(out).slice(0,1500));
C.c13=out.op===true&&/Villefictive/.test(out.home)&&!/Étude Villefictive 2026/.test(out.home)&&out.head.name==='Villefictive'&&!out.head.chips&&!out.head.halo&&out.head.leg===0&&out.head.dim===0
  &&!!out.bar&&out.bar.dots===0&&!out.bar.gear&&/choisis celle de ton travail/.test(out.bar.txt)&&out.bar.h.every(h=>h>=40)&&out.ovf.sw<=390&&!out.ovf.bad.length&&!!out.ro&&out.ro.warn&&out.ro.dis&&!out.ro.go&&out.weld==='soudee'&&out.srv==='soudee';
await ctxO.close();
/* … et le même soudeur sur un PC (1366) : pas de puce d'affaire non plus */
{const ctxP=await browser.newContext({viewport:{width:1366,height:900}});await route(ctxP,SOUD);const pp=await ctxP.newPage();watch(pp);await login(pp,SOUD);await pp.waitForTimeout(1200);await openSite(pp,CID);
  const hp=await pp.evaluate(()=>({chips:!!document.getElementById('muChips'),halo:!!document.querySelector('#net g.mu-halo'),leg:document.querySelectorAll('#legend .mu-leg').length}));await shot(pp,'pc_17_operateur_plan');
  await tab(pp,'liste');const bp=await bar(pp,'liste');await shot(pp,'pc_18_operateur_dossier_separe');console.log('c13) opérateur sur PC :',JSON.stringify({hp,bar:bp&&{dots:bp.dots,gear:bp.gear,txt:bp.txt}}));
  C.c13=C.c13&&!hp.chips&&!hp.halo&&hp.leg===0&&!!bp&&bp.dots===0&&!bp.gear;await ctxP.close();}
// ── c16 · console
console.log('c16) console :',JSON.stringify(logs));C.c16=logs.length===0;
console.log('durée : '+Math.round((Date.now()-t0)/1000)+' s');
console.log(JSON.stringify(C));
console.log(Object.values(C).every(Boolean)?'RESULTAT: TOUT VERT':'RESULTAT: ÉCHEC '+Object.entries(C).filter(([k,v])=>!v).map(([k])=>k).join(','));
await browser.close();
