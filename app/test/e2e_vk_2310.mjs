// 23/10 — VÉHICULES, suite (Ethan) : « pouvoir valider l'état des lieux d'un véhicule laissé SANS le prendre (véhicule sur parc ou base vie), validé par le chef » ;
// « j'ai enlevé le Sprinter de Sofiane pour Nadir : ça dit à Sofiane que son état des lieux est attendu mais ça ne lui propose pas de le faire — notif écran d'accueil et Mon véhicule » ;
// « je choisis un véhicule → son historique ; je choisis un gars → l'historique de ses véhicules ; à telle date qu'avait-il, tel véhicule qui l'avait tel jour ».
// Même harnais FICTIF que e2e_vm_2010 (comptes inventés, Supabase simulé avec les règles de droits, pack de test). Rien de réel.
//  c1 Ethan déclare DD-444-DD (conducteur « Karim TESTEUR » venu de l'import, SANS clé) : Karim → Paul → la clé de l'ancien est retrouvée par le nom
//  c2 Karim (390) : écran d'accueil « Tu laisses DD-444-DD à Paul ESSAI → Faire l'état des lieux de sortie » ; Moi → Mon véhicule : bouton « Faire l'état des lieux de sortie » ; la tâche ouvre l'assistant
//  c3 Bruno (390) : EE-555-EE, changement déclaré AVANT la correction (ancien sans clé) → reconnu par le nom : même tâche, même bouton, aucune écriture sur la fiche
//  c4 Ethan (PC) : FF-666-FF laissé « à qui le prendra » au dépôt par Paul → tâche « Lire et valider son état des lieux (sans le prendre) » → signe « Exact, je valide sans le prendre »
//     → état des lieux validé (sansPrise), FF reste laissé, plus rien d'attendu ; fil des mouvements ; fiche
//  c5 Paul (390) : « ton état des lieux de sortie est validé » ; Karim (390) : prend FF après la validation (signe) → FF à Karim ; « Mon historique complet » depuis Moi
//  c6 Ethan (PC) : Parc → Flotte → 🕓 Historique : qui avait quoi à la date ; un véhicule (qui l'avait, à une autre date) ; une personne (ce qu'elle avait) ; bouton depuis la fiche
//  c7 390 px sans débordement · zéro erreur console · aucune écriture refusée par le serveur simulé
import { chromium } from 'playwright';
const BASE=process.env.BASE||'http://127.0.0.1:8819';
const SB='https://pghftlepduvfazbiavhq.supabase.co';
const SHOTS=process.env.SHOTS||'';
const b64u=o=>Buffer.from(JSON.stringify(o)).toString('base64').replace(/=+$/,'').replace(/\+/g,'-').replace(/\//g,'_');
const ETHAN={id:'11111111-2222-4333-8444-555555555555',email:'elebihan@scr-soudure.fr',prenom:'Ethan',nom:'LE BIHAN',poste:'resp_exploitation',admin:true,role:'chef',pc:true};
const FANNY={id:'aaaaaaaa-2222-4333-8444-555555555555',email:'fanny.test@scr-soudure.fr',prenom:'Fanny',nom:'TESTFLOTTE',poste:'resp_flotte',admin:false,role:'bureau',pc:true}; /* fictif : responsable flotte */
const DENIS={id:'bbbbbbbb-2222-4333-8444-555555555555',email:'denis.test@scr-soudure.fr',prenom:'Denis',nom:'TESTCONDUC',poste:'conducteur',admin:false,role:'bureau',pc:true}; /* fictif : conducteur de travaux */
const LUC={id:'22222222-2222-4333-8444-555555555555',email:'luc.test@scr-soudure.fr',prenom:'Luc',nom:'TESTCHEF',poste:'chef',admin:false,role:'bureau'}; /* fictif : chef de chantier, pas de droit « Flotte » */
const BRUNO={id:'55555555-2222-4333-8444-555555555555',email:'bruno.test@scr-soudure.fr',prenom:'Bruno',nom:'TESTSOUDEUR',poste:'soudeur',admin:false,role:'soudeur'}; /* fictif */
const KARIM={id:'33333333-2222-4333-8444-555555555555',email:'karim.test@scr-soudure.fr',prenom:'Karim',nom:'TESTEUR',poste:'soudeur',admin:false,role:'soudeur'}; /* fictif */
const PAUL={id:'44444444-2222-4333-8444-555555555555',email:'paul.test@scr-soudure.fr',prenom:'Paul',nom:'ESSAI',poste:'manchonneur',admin:false,role:'manchonneur'}; /* fictif */
const USERS=[ETHAN,FANNY,DENIS,LUC,BRUNO,KARIM,PAUL];let CUR=ETHAN;
const isMgr=u=>!!u.admin||['chef','bureau'].includes(u.role);
const AA='AA-111-AA',BB='BB-222-BB',CC='CC-333-CC';
const REG={['vehicule|'+AA]:{kind:'vehicule',id:AA,data:{immat:AA,marque:'FICTIF',modele:'FOURGON UN',type:'Soudeur',agence:'OUEST',n:'91',km:12000,conducteur:'Bruno TESTSOUDEUR',conducteurKey:BRUNO.email},updated_at:'2026-10-10T08:00:00Z'},
  ['vehicule|'+BB]:{kind:'vehicule',id:BB,data:{immat:BB,marque:'FICTIF',modele:'FOURGON DEUX',type:'Soudeur',agence:'OUEST',n:'92',km:30000,conducteur:'Paul ESSAI',conducteurKey:PAUL.email},updated_at:'2026-10-10T08:00:00Z'},
  ['vehicule|'+CC]:{kind:'vehicule',id:CC,data:{immat:CC,marque:'FICTIF',modele:'FOURGON TROIS',type:'Soudeur',agence:'OUEST',n:'93',km:5000},updated_at:'2026-10-10T08:00:00Z'}}; /* libre */
const SITES=[{id:'SRV_A',name:'Chantier fictif Alpha',supplier:'LOGSTOR',updated_at:'2026-10-01T08:00:00Z',geo:null,origin:null,bgo:null,sat:null,w:null,h:null,bbox:null,nbox:null,nw:40,deleted:null,deletedAt:null,builtin:null,ville:'Villefictive',chef:LUC.email,conducteur:DENIS.email,secteur:'ouest',etude:null}];
// planning fictif : Bruno, Karim, Paul et Luc sur Alpha cette semaine et la suivante → chef du chantier du jour = Luc, conducteur = Denis (alerte en cas de contestation)
const pad2=n=>String(n).padStart(2,'0');const isoD=d=>d.getFullYear()+'-'+pad2(d.getMonth()+1)+'-'+pad2(d.getDate());
const weekKey=d=>{const x=new Date(d);x.setDate(x.getDate()+3-((x.getDay()+6)%7));const j=new Date(x.getFullYear(),0,4,12);return x.getFullYear()+'-W'+pad2(1+Math.round(((x-j)/864e5-3+((j.getDay()+6)%7))/7));};
const PLAN={};{const t=new Date();t.setHours(12,0,0,0);const mon=new Date(t);mon.setDate(t.getDate()-((t.getDay()+6)%7));for(const k of [0,1]){const l=new Date(mon);l.setDate(mon.getDate()+7*k);const js=[0,1,2,3,4,5,6].map(i=>{const d=new Date(l);d.setDate(l.getDate()+i);return isoD(d);});const aff={};[BRUNO.email,KARIM.email,PAUL.email,LUC.email].forEach(key=>{aff[key]={};js.forEach(d=>{aff[key][d]=['SRV_A'];});});const wk=weekKey(l);PLAN[wk]={week:wk,data:{aff},updated_at:'2026-10-10T10:00:00Z'};}}
const TODAY=isoD(new Date());const NEXTMON=(()=>{const d=new Date();d.setDate(d.getDate()+((8-d.getDay())%7||7));return isoD(d);})();
const dFR=s=>{const [y,m,d]=String(s).split('-');return d+'/'+m+'/'+y;};const dC=s=>dFR(s).slice(0,5);const JOURS=['dimanche','lundi','mardi','mercredi','jeudi','vendredi','samedi'];const jC=s=>JOURS[new Date(s+'T12:00:00').getDay()]+' '+dC(s);
const calls=[];const refus=[];let OFFLINE=false; /* coupure réseau simulée : le serveur ne reçoit rien */
const lignes=Array.from({length:28},(_,i)=>'- Règle fictive numéro '+(i+1)+' : texte de test sans valeur.').join('\n');
const PACK={vehicule:{reception:{version:'test-20/10',
  etatDesLieux:{releves:[{id:'km',label:'Kilométrage',type:'nombre',unite:'km',obligatoire:true},{id:'nivHuile',label:'Huile',type:'choix',choix:['Ok','Non ok'],groupe:'Niveaux'},{id:'nivFrein',label:'Liquide de frein',type:'choix',choix:['Ok','Non ok'],groupe:'Niveaux'},{id:'carburant',label:'Niveau de carburant',type:'choix',choix:['Réserve','1/2','Plein'],obligatoire:false}],
    controles:[{id:'pneus',label:'Pneus',type:'choix',choix:['Ok','Non ok']},{id:'feux',label:'Feux',type:'choix',choix:['Ok','Non ok']}],documentsABord:[{id:'docGrise',label:'Carte grise',type:'choix',choix:['Ok','Non ok']},{id:'docAssur',label:'Assurance',type:'choix',choix:['Ok','Non ok']}],
    zones:[{id:'avant',label:'Face avant'},{id:'arriere',label:'Face arrière'},{id:'gauche',label:'Côté gauche'},{id:'droit',label:'Côté droit'}],
    photosDetail:[{id:'avant',label:'Face avant',obligatoire:true},{id:'arriere',label:'Face arrière',obligatoire:true},{id:'gauche',label:'Côté gauche',obligatoire:true},{id:'droit',label:'Côté droit',obligatoire:true},{id:'impacts',label:'Impacts',multiple:true}]},
  inventaire:{parMetier:{soudeur:[{id:'a1',designation:'Meuleuse fictive 125',qte:2},{id:'a2',designation:'Rallonge fictive 25 m',qte:1}]},commun:[{id:'c1',designation:'Trousse test',qte:1,pour:'tous'}],modeles:{soudeur:{titre:'MATÉRIEL TEST SOUDEUR'}}},
  dispositifs:{champs:[{id:'carteVehicule',label:'Carte carburant test',type:'dispositif',pour:'tous'},{id:'cles',label:'Clés',type:'nombre'}],engagements:['Engagement fictif numéro un.']},
  documents:[{id:'charte_service',titre:'Charte test service',pour:'service',texte:'textes/charte_service_test.txt',version:'test'}],
  correspondanceTypesAppli:{Soudeur:{charte:'charte_service',inventaire:'soudeur'}}},
 entretien:{modalitesEntretien:{auQuotidien:['Vérifier les niveaux (test).']}},
 textes:{'charte_service_test.txt':'# Charte test service\n\n## Règles\n\n'+lignes+'\n\n## Engagement\n\nJe soussigné : {{conducteur}}, atteste avoir lu la charte de test.\n\nVisa : {{signature_conducteur}}\n'}}};
const PNG=Buffer.from('iVBORw0KGgoAAAANSUhEUgAAABAAAAAMCAIAAADkharWAAABU0lEQVR4nA3LIQHFIBRAUSIgCDCJJACCCC/CBAGQVy4AgggvwgQBJpEEQBCBCP8ff4wxWMNlCIZkEMNtKIbH0AxqeA2fYRq24RiMcVjH5QiO5BDH7SiOx9Ec6ngdn2M6tuO4f/BYz+UJnuQRz+0pnsfTPOp5PZ9nerbn+H+I2MgVCZEUkcgdKZEn0iIaeSNfZEZ25MR/EKxwCUFIggi3UIRHaIIKr/AJU9jCkX/I2MyVCZmUkcydKZkn0zKaeTNfZmZ25uR/AAsXBEggcEOBBxoovPDBhA2Hf6jYylUJlVSRyl0plafSKlp5K19lVnbl1H9QrHIpQUmKKLdSlEdpiiqv8ilT2crRf+jYztUJndSRzt0pnafTOtp5O19ndnbn9H8Y2ME1CIM0kME9KINn0AY6eAffYA724Ix/WNjFtQiLtJDFvSiLZ9EWungX32Iu9uIsflUEBpBsGbC5AAAAAElFTkSuQmCC','base64'); /* 16×12 */
const browser=await chromium.launch({headless:true, executablePath: process.env.CHROMIUM_PATH||undefined});
const CORS={'access-control-allow-origin':'*','access-control-allow-headers':'*','access-control-allow-methods':'GET, POST, PUT, PATCH, DELETE, OPTIONS'};
const logs=[];const C={};
/* ── serveur simulé : règles de sql/retours_19-10vh.sql + sql/retours_20-10vm.sql (écriture ET lecture) ; la présence d'une clé de validation (même à null) est refusée comme
      le fait le SQL d'hier : l'appli ne doit plus l'envoyer (un état des lieux fait seul passe donc aussi avec le seul SQL d'hier) ── */
function regleSet(U,k,id,patch,mode){const mgr=isMgr(U);const me=U.email;const old=(REG[k+'|'+id]||{}).data||null;
  if(k==='vrec'&&!mgr){if(mode==='replace')return 'remise de véhicule : remplacement réservé à l\'encadrement / bureau';
    if(['valide','refus','sigResponsable','arbitre'].some(x=>x in patch))return 'remise de véhicule : la validation est réservée à l\'encadrement / bureau';
    if('conducteurKey' in patch&&String(patch.conducteurKey||'').toLowerCase()!==me)return 'remise de véhicule d\'une autre personne : réservé à l\'encadrement / bureau';
    if(!old){if(!('conducteurKey' in patch))return 'remise de véhicule : conducteur absent';}
    else if(String(old.conducteurKey||'').toLowerCase()!==me){if(!('lache' in old))return 'remise de véhicule d\'une autre personne : réservé à l\'encadrement / bureau';const a=String((old.a||{}).key||'').toLowerCase();if(a&&a!==me)return 'véhicule laissé à quelqu\'un d\'autre : c\'est à lui de signer (ou à l\'encadrement / bureau)';if('pris' in old||'contest' in old)return 'état des lieux déjà signé ou contesté';
      for(const key of Object.keys(patch)){if(!['pris','contest'].includes(key))return 'remise de véhicule d\'une autre personne : seule la signature « pris » ou la contestation « contest » (réservé sinon à l\'encadrement / bureau)';if(!patch[key]||typeof patch[key]!=='object'||String(patch[key].par||'').toLowerCase()!==me)return 'signature de véhicule : à son propre nom seulement';}}}
  if(k==='vehicule'&&!mgr){if(mode==='replace')return 'fiche véhicule : réservé à l\'encadrement / bureau';for(const key of Object.keys(patch)){if(!['conducteur','conducteurKey','depuis','km','remise','laisse','vignette','vignetteAt','cartes','signalements'].includes(key))return 'fiche véhicule : « '+key+' » réservé à l\'encadrement / bureau';}
    if(('conducteurKey' in patch&&patch.conducteurKey!==null&&String(patch.conducteurKey||'').toLowerCase()!==me)||('conducteur' in patch&&patch.conducteur!==null&&String(patch.conducteurKey||'').toLowerCase()!==me))return 'fiche véhicule : on ne pose pas un véhicule sur quelqu\'un d\'autre (réservé à l\'encadrement / bureau)';
    if(!old)return 'fiche véhicule : véhicule inconnu (création réservée à l\'encadrement / bureau)';const cond=String(old.conducteurKey||'').toLowerCase();if(cond&&cond!==me)return 'fiche véhicule : véhicule d\'une autre personne (réservé à l\'encadrement / bureau)';}
  if(['vcfg','doc','affaire'].includes(k)&&!mgr)return 'réservé à l\'encadrement / bureau';
  if(k==='docsig'&&!(mgr||String(id.split('|')[1]||'').toLowerCase()===me))return 'signature réservée à la personne elle-même';
  return null;}
const regleRead=(U,r)=>{if(r.kind!=='vrec'||isMgr(U))return true;const d=r.data||{};const me=U.email;if(String(d.conducteurKey||'').toLowerCase()===me)return true;return 'lache' in d&&['',me].includes(String((d.a||{}).key||'').toLowerCase());};
async function mkCtx(U){const ctx=await browser.newContext({viewport:U.pc?{width:1366,height:900}:{width:390,height:844}});
  await ctx.route(u=>u.href.startsWith(SB),async route=>{const req=route.request();const u=new URL(req.url());const p=u.pathname;const acc=req.headers()['accept']||'';const direct=req.headers()['x-test-direct']==='1';
    if(OFFLINE)return route.abort('internetdisconnected');
    const json=(o,status=200)=>route.fulfill({status,contentType:'application/json',headers:CORS,body:JSON.stringify(o)});
    if(req.method()==='OPTIONS')return route.fulfill({status:200,headers:CORS,body:''});
    let b={};try{b=JSON.parse(req.postData()||'{}');}catch(e){}
    const t=Math.floor(Date.now()/1000);const user={id:U.id,aud:'authenticated',role:'authenticated',email:U.email,email_confirmed_at:'2026-10-08T09:00:00Z',app_metadata:{provider:'email'},user_metadata:{},identities:[],created_at:'2026-10-08T09:00:00Z',updated_at:new Date().toISOString()};
    if(p==='/auth/v1/token')return json({access_token:b64u({alg:'HS256',typ:'JWT'})+'.'+b64u({iss:SB+'/auth/v1',sub:U.id,aud:'authenticated',exp:t+3600,iat:t,email:U.email,role:'authenticated'})+'.sig',token_type:'bearer',expires_in:3600,expires_at:t+3600,refresh_token:'rt-'+t,user});
    if(p==='/auth/v1/user')return json(user);if(p.startsWith('/auth/v1/'))return json({});
    if(p.startsWith('/storage/v1/'))return json({statusCode:'400',error:'test',message:'stockage simulé indisponible'},400);
    if(p==='/rest/v1/profiles'){const rows=USERS.map(x=>({id:x.id,email:x.email,name:x.prenom+' '+x.nom,prenom:x.prenom,nom:x.nom,role:x.role,active:true,poste:x.poste,admin:x.admin,type:'salarie',rights:{},sites:null,created_at:'2026-10-08T09:00:00Z'}));const m=/id=eq\.([^&]+)/.exec(u.search);const r=m?rows.filter(x=>x.id===decodeURIComponent(m[1])):rows;return json(/object/.test(acc)?(r[0]||null):r);}
    if(p==='/rest/v1/invites')return json([]);
    if(p==='/rest/v1/rpc/registre_set'){const k=b.p_kind,id=String(b.p_id||'');const patch=b.p_patch||{};const deny=regleSet(U,k,id,patch,b.p_mode);if(!direct)calls.push({who:U.email,kind:k,id,patch,mode:b.p_mode});
      if(deny){if(!direct)refus.push(U.email+' '+k+' '+id+' : '+deny);return json({code:'P0001',message:deny},400);}
      const key=k+'|'+id;const old=(REG[key]||{}).data||{};const data=b.p_mode==='replace'?patch:Object.assign({},old,patch);Object.keys(patch).forEach(x=>{if(patch[x]===null)delete data[x];});REG[key]={kind:k,id,data,updated_at:new Date().toISOString()};return json(REG[key]);}
    if(p==='/rest/v1/registre'){const m=/kind=in\.%28([^)]+)%29/.exec(u.search)||/kind=in\.\(([^)]+)\)/.exec(decodeURIComponent(u.search));const kinds=m?decodeURIComponent(m[1]).replace(/"/g,'').split(','):null;return json(Object.values(REG).filter(r=>!kinds||kinds.includes(r.kind)).filter(r=>regleRead(U,r)));}
    if(p==='/rest/v1/rpc/planning_set'){const row=PLAN[b.p_week]||(PLAN[b.p_week]={week:b.p_week,data:{aff:{}},updated_at:''});Object.entries((b.p_patch||{}).aff||{}).forEach(([k,v])=>{if(v===null)delete row.data.aff[k];else row.data.aff[k]=v;});row.updated_at=new Date().toISOString();return json(row);}
    if(p==='/rest/v1/planning')return json(Object.values(PLAN));
    if(p==='/rest/v1/sites'){const sel=u.searchParams.get('select')||'';if(req.method()!=='GET')return json([]);if(/chef:data/.test(sel)||/name/.test(sel)&&!/data,/.test(sel))return json(SITES);return json(/object/.test(acc)?null:[]);}
    if(p==='/rest/v1/app_settings')return json(/object/.test(acc)?null:[]);
    if(p.startsWith('/rest/v1/rpc/'))return json(null);
    if(p.startsWith('/rest/v1/'))return json(/object/.test(acc)?null:[]);
    return json([]);});
  const page=await ctx.newPage();page.on('dialog',d=>d.accept().catch(()=>{}));
  page.on('pageerror',e=>logs.push(U.prenom+' PAGEERROR: '+e.message.slice(0,300)));page.on('console',m=>{if(m.type()==='error'&&!/realtime|websocket|Failed to fetch|net::ERR|status of 4\d\d|supabase|open-meteo|geopf|geo\.api/i.test(m.text()))logs.push(U.prenom+': '+m.text().slice(0,200));});
  await page.route(u=>/open-meteo\.com$|(^|\.)geopf\.fr$|^geo\.api\.gouv\.fr$/.test(u.hostname),r=>r.fulfill({status:200,contentType:'application/json',body:'{}'}));
  return {ctx,page};}
let ctx,page;const wait=ms=>page.waitForTimeout(ms);
const login=async who=>{CUR=who;({ctx,page}=await mkCtx(who));await page.goto(BASE+'/index.html');await wait(500);await page.evaluate(()=>{localStorage.clear();});await page.evaluate(()=>new Promise(r=>{try{const q=indexedDB.deleteDatabase('trace-kv');q.onsuccess=q.onerror=q.onblocked=()=>r();}catch(e){r();}}));await page.reload();await wait(900);await page.waitForSelector('#loginEmail',{timeout:20000});
  await page.fill('#loginEmail',who.email);await page.fill('#loginPwd','Test-2026!');await page.click('#loginGo');await wait(3000);
  await page.evaluate(()=>{window.__docs=[];window.open=()=>({document:{write:h=>{window.__docs.push(h);},close(){}}});});}; /* impression : on garde le HTML au lieu d'ouvrir une fenêtre */
const app=()=>page.evaluate(()=>(document.getElementById('eq-app')||document.body).textContent.replace(/\s+/g,' '));
const click=async(sel,ms)=>{await page.evaluate(s=>{const el=document.querySelector(s);if(!el)throw new Error('absent : '+s+' · '+((document.getElementById('eq-app')||document.body).textContent||'').replace(/\s+/g,' ').slice(0,400));el.click();},sel);await wait(ms||220);};
const vx=a=>`#eq-app [data-act=x][data-v="veh|${a}"]`;
const has=a=>page.evaluate(s=>!!document.querySelector(s),vx(a));
const fill=async(sel,val)=>{await page.evaluate(([s,v])=>{const el=document.querySelector(s);if(!el)throw new Error('absent : '+s);el.value=v;el.dispatchEvent(new Event('input',{bubbles:true}));el.dispatchEvent(new Event('change',{bubbles:true}));},[sel,val]);await wait(120);};
const title=()=>page.evaluate(()=>(document.querySelector('#eq-app .veh-h')||{}).textContent||'');
const toastTxt=()=>page.evaluate(()=>(document.getElementById('toast')||{}).textContent||'');
const OVF=[];const ovf=async tag=>{const o=await page.evaluate(()=>{const hb=document.getElementById('homeBody');const app=document.getElementById('eq-app');return {doc:document.documentElement.scrollWidth,win:window.innerWidth,hb:hb?hb.scrollWidth-hb.clientWidth:0,app:app?app.scrollWidth-app.clientWidth:0};});if(o.doc>o.win+1||o.hb>1||o.app>1)OVF.push(CUR.prenom+' '+tag+':'+JSON.stringify(o));};
let NSHOT=0;const shot=async n=>{if(SHOTS)await page.screenshot({path:SHOTS+'/'+(CUR.pc?'pc':'tel')+'_'+String(++NSHOT).padStart(2,'0')+'_'+String(n).replace(/[^A-Za-z0-9]+/g,'_').slice(0,40)+'.png'});};
const shotAt=async(n,sel)=>{await page.evaluate(s=>{const el=document.querySelector(s);if(el)el.scrollIntoView({block:'start'});},sel);await wait(200);await shot(n);};
const shotNotif=async(n,re)=>{await page.evaluate(src=>{const el=[...document.querySelectorAll('#eq-app .ac-notif, #eq-app .ac-kt')].find(x=>new RegExp(src).test(x.textContent));if(el)el.scrollIntoView({block:'center'});},re.source);await wait(200);await shot(n);}; /* la capture montre la tâche visée */
const next=async()=>{const t=await title();await ovf(t);await shot(t);await click('#veh-next',260);};
const draw=async id=>{await page.evaluate(i=>{const c=document.getElementById(i);if(!c)throw new Error('pad absent '+i);c.scrollIntoView({block:'center'});},id);await wait(200);const bx=await page.locator('#'+id).boundingBox();
  await page.mouse.move(bx.x+bx.width*.2,bx.y+bx.height*.55);await page.mouse.down();await page.mouse.move(bx.x+bx.width*.45,bx.y+bx.height*.3,{steps:6});await page.mouse.move(bx.x+bx.width*.8,bx.y+bx.height*.65,{steps:6});await page.mouse.up();await wait(150);};
const photo=async k=>{await page.setInputFiles(`#eq-app input[data-xin="veh|photo~${k}"]`,{name:k+'.png',mimeType:'image/png',buffer:PNG});await page.waitForFunction(k=>{const i=document.querySelector(`#eq-app input[data-xin="veh|photo~${k}"]`);return k==='imp'?!!document.querySelector('#eq-app .veh-impf label.on'):!!(i&&i.closest('label.ok'));},k,{timeout:10000});await wait(150);};
const photos4=async()=>{for(const k of ['avant','arriere','gauche','droit'])await photo(k);await wait(300);};
const fiche=async im=>{await page.evaluate(async im=>{const T=window.TRACE;if(T.state.screen!=='home'){const b=document.getElementById('btnHome');if(b)b.click();await new Promise(r=>setTimeout(r,300));}document.getElementById('htParc').click();await new Promise(r=>setTimeout(r,300));
  const bk=document.querySelector('#eq-app .ac-back[data-act="xsub"]');if(bk){bk.click();await new Promise(r=>setTimeout(r,250));}
  const sg=document.querySelector('#eq-app [data-act=parcseg][data-v=flotte]');if(sg){sg.click();await new Promise(r=>setTimeout(r,200));}
  const bk2=document.querySelector('#eq-app [data-act=fl][data-v="back|"]');if(bk2){bk2.click();await new Promise(r=>setTimeout(r,200));}
  const lst=document.querySelector('#eq-app [data-act=fl][data-v="vue|list"]');if(lst){lst.click();await new Promise(r=>setTimeout(r,200));}
  const o=document.querySelector(`#eq-app [data-act=fl][data-v="open|${im}"]`);if(o){o.click();await new Promise(r=>setTimeout(r,250));}},im);await wait(200);};
const flotteVue=async k=>{await page.evaluate(async k=>{const T=window.TRACE;if(T.state.screen!=='home'){const b=document.getElementById('btnHome');if(b)b.click();await new Promise(r=>setTimeout(r,300));}document.getElementById('htParc').click();await new Promise(r=>setTimeout(r,300));const bk=document.querySelector('#eq-app .ac-back[data-act="xsub"]');if(bk){bk.click();await new Promise(r=>setTimeout(r,250));}const sg=document.querySelector('#eq-app [data-act=parcseg][data-v=flotte]');if(sg){sg.click();await new Promise(r=>setTimeout(r,200));}const bk2=document.querySelector('#eq-app [data-act=fl][data-v="back|"]');if(bk2){bk2.click();await new Promise(r=>setTimeout(r,200));}const c=document.querySelector(`#eq-app [data-act=fl][data-v="vue|${k}"]`);if(!c)throw new Error('vue absente : '+k);c.click();},k);await wait(300);};
const accueil=async()=>{await page.evaluate(async()=>{const T=window.TRACE;if(T.state.screen!=='home'){const b=document.getElementById('btnHome');if(b)b.click();await new Promise(r=>setTimeout(r,300));}document.getElementById('htHome').click();await new Promise(r=>setTimeout(r,500));});await wait(200);};
const todo=()=>page.evaluate(()=>[...document.querySelectorAll('#eq-app .ac-notif')].map(x=>x.textContent.replace(/\s+/g,' ').trim()));
const kts=()=>page.evaluate(()=>[...document.querySelectorAll('#eq-app .ac-kt')].map(x=>x.textContent.replace(/\s+/g,' ').trim()));
const clickTodo=async re=>{const i=await page.evaluate(src=>[...document.querySelectorAll('#eq-app .ac-notif')].findIndex(x=>new RegExp(src).test(x.textContent)),re.source);if(i<0)throw new Error('à faire absent : '+re.source+' · '+JSON.stringify(await todo()));await page.evaluate(i=>document.querySelectorAll('#eq-app .ac-notif')[i].click(),i);await wait(500);};
const clickKt=async re=>{const i=await page.evaluate(src=>[...document.querySelectorAll('#eq-app .ac-kt')].findIndex(x=>new RegExp(src).test(x.textContent)),re.source);if(i<0)throw new Error('à savoir absent : '+re.source+' · '+JSON.stringify(await kts()));await page.evaluate(i=>document.querySelectorAll('#eq-app .ac-kt')[i].click(),i);await wait(500);};
const moi=async()=>{await page.evaluate(async()=>{document.getElementById('htEspace').click();await new Promise(r=>setTimeout(r,400));const s=document.querySelector('#eq-app .eq-subs [data-act=sub][data-v=moi]');if(s){s.click();await new Promise(r=>setTimeout(r,300));}});await wait(200);};
const flushed=async()=>{await page.waitForFunction(()=>window.TRACE&&window.TRACE.reg&&window.TRACE.reg.pending().length===0,null,{timeout:15000}).catch(()=>{});await wait(200);};
const regRows=kind=>Object.values(REG).filter(r=>r.kind===kind);
const lastRec=(immat,type)=>regRows('vrec').filter(r=>r.data.vehId===immat&&r.data.type===type).sort((a,b)=>String(b.data.at).localeCompare(String(a.data.at)))[0];
const veh=im=>REG['vehicule|'+im].data;
const subs=()=>page.evaluate(()=>[...document.querySelectorAll('#eq-app .eq-subs .chip')].map(x=>x.textContent.replace(/\s+/g,' ').trim()));
const allOk=async()=>{const L=await page.evaluate(()=>[...document.querySelectorAll('#eq-app .veh-allok')].map(b=>b.dataset.v));for(const v of L){await page.evaluate(v=>{const b=document.querySelector(`#eq-app .veh-allok[data-v="${v}"]`);if(b)b.click();},v);await wait(150);}};
const charteSign=async()=>{await page.evaluate(()=>{const b=document.getElementById('veh-cbody');b.scrollTop=b.scrollHeight;b.dispatchEvent(new Event('scroll'));});await wait(250);await click('#veh-cread',300);await draw('veh-pad-ch');};
const card=()=>page.evaluate(()=>{const c=document.querySelector('#eq-app .veh-card');return c?c.textContent.replace(/\s+/g,' '):'';});
const histRows=()=>page.evaluate(()=>[...document.querySelectorAll('#eq-app .veh-card .eq-row')].map(x=>x.textContent.replace(/\s+/g,' ').trim()));
const docs=()=>page.evaluate(()=>window.__docs||[]);
const minBtn=()=>page.evaluate(()=>{const L=[...document.querySelectorAll('#eq-app .veh-wiz button, #eq-app .veh-wiz .btn, #eq-app .veh2-card .btn')].filter(b=>b.offsetParent!==null&&!b.classList.contains('sm')&&!b.classList.contains('chip')).map(b=>b.getBoundingClientRect().height);return L.length?Math.min(...L):99;});
let out;
const DD='DD-444-DD',EE='EE-555-EE',FF='FF-666-FF';const old3=new Date(Date.now()-3*864e5).toISOString();const old8=new Date(Date.now()-8*864e5).toISOString();
REG['vehicule|'+DD]={kind:'vehicule',id:DD,data:{immat:DD,marque:'FICTIF',modele:'FOURGON QUATRE',type:'Soudeur',agence:'OUEST',n:'94',km:8000,conducteur:'Karim TESTEUR'},updated_at:'2026-10-10T08:00:00Z'}; /* import : nom sans clé */
REG['vehicule|'+EE]={kind:'vehicule',id:EE,data:{immat:EE,marque:'FICTIF',modele:'FOURGON CINQ',type:'Soudeur',agence:'OUEST',n:'95',km:9000,conducteur:'Bruno TESTSOUDEUR',switch:{id:'W0test',ancien:{key:'',nom:'Bruno TESTSOUDEUR'},nouveau:{key:PAUL.email,nom:'Paul ESSAI'},depuis:TODAY,ou:'',note:'',declarePar:'Ethan LE BIHAN',declareKey:ETHAN.email,at:old3,etat:'prevu'}},updated_at:old3}; /* changement déclaré avant la correction */
REG['vehicule|'+FF]={kind:'vehicule',id:FF,data:{immat:FF,marque:'FICTIF',modele:'FOURGON SIX',type:'Soudeur',agence:'OUEST',n:'96',km:7000,laisse:{ou:'Dépôt',at:old3,par:'Paul ESSAI',parKey:PAUL.email,aKey:null,aNom:null,quand:null,recId:FF+'|Sold'}},updated_at:old3};
REG['vrec|'+FF+'|Sold']={kind:'vrec',id:FF+'|Sold',data:{type:'restitution',vehId:FF,immat:FF,vehLabel:'FICTIF FOURGON SIX',conducteurKey:PAUL.email,conducteurNom:'Paul ESSAI',lache:{ou:'Dépôt',k:'depot',at:old3},at:old3,by:'Paul ESSAI',sansResponsable:true,edl:{km:7000,rel:{},ctl:{},doc:{},equip:{},photos:{},impacts:[],remarques:''},inventaire:{items:[],miss:{},n:0},cartes:{},reserves:[],diff:{km:null,impacts:[],manquants:[],retrouves:[],nonOk:[],cartesPerdues:[],sansRef:true,n:0}},updated_at:old3};
const ovfAll=async tag=>{await ovf(tag);};
// ── 0) Ethan : pack fictif
await login(ETHAN);await fiche(AA);await click(vx('cfg|'),400);
await page.setInputFiles('#eq-app input[data-xin="veh|packfile"]',{name:'pack_test.json',mimeType:'application/json',buffer:Buffer.from(JSON.stringify(PACK))});await wait(1500);await flushed();
// ── c1) Ethan déclare DD : Karim (nom seul) → Paul
await fiche(DD);await click(vx('switch|'+DD),400);await fill('#eq-app [data-xin="veh|swq"]','paul');await click(`#eq-app [data-act=x][data-v="veh|swpick|${PAUL.email}"]`,300);await click(vx('swok|'+DD),700);await flushed();
out={sw:veh(DD).switch&&{ancien:veh(DD).switch.ancien,nouveau:veh(DD).switch.nouveau.key,etat:veh(DD).switch.etat},toast:await toastTxt()};await fiche(DD);out.card=await card();await shot('ethan_dd_declare');
console.log('c1) clé retrouvée par le nom :',JSON.stringify({...out,card:out.card.slice(0,220)}));
C.c1=!!out.sw&&out.sw.ancien.key===KARIM.email&&out.sw.ancien.nom==='Karim TESTEUR'&&out.sw.nouveau===PAUL.email&&/Karim TESTEUR → Paul ESSAI/.test(out.card);
await ctx.close();
// ── c2) Karim (390) : tâche d'accueil + Mon véhicule → bouton, la tâche ouvre l'assistant
await login(KARIM);out={todo:await todo()};await moi();out.moi=await app();out.btn=await has('swsortie|'+DD);await ovf('karim moi');await shot('karim_moi_sortie');
await accueil();await clickTodo(/Tu laisses DD-444-DD/);out.t=await title();out.wiz=await page.evaluate(()=>!!document.querySelector('#eq-app .veh-wiz'));await ovf('karim assistant');await shot('karim_sortie_assistant');
console.log('c2) Karim :',JSON.stringify({todo:out.todo.filter(t=>/DD-444-DD/.test(t)),btn:out.btn,t:out.t,wiz:out.wiz,moi:out.moi.slice(out.moi.indexOf('DD-444-DD'),out.moi.indexOf('DD-444-DD')+260)}));
C.c2=out.todo.some(t=>/Déclaré par Ethan LE BIHAN/.test(t)&&/Tu laisses DD-444-DD à Paul ESSAI/.test(t)&&/Faire l'état des lieux de sortie/.test(t))&&out.btn&&/tu laisses ce véhicule à Paul ESSAI/.test(out.moi)&&out.wiz&&/^1\//.test(out.t);
await ctx.close();
// ── c3) Bruno (390) : changement déclaré avant la correction (ancien sans clé) → reconnu par le nom ; aucune écriture
const n0=calls.filter(c=>c.who===BRUNO.email&&c.kind==='vehicule').length;
await login(BRUNO);out={todo:await todo()};await moi();out.btn=await has('swsortie|'+EE);out.moi=await app();await accueil();await clickTodo(/Tu laisses EE-555-EE/);out.t=await title();out.wiz=await page.evaluate(()=>!!document.querySelector('#eq-app .veh-wiz'));await flushed();
out.writes=calls.filter(c=>c.who===BRUNO.email&&c.kind==='vehicule').length-n0;out.ancien=veh(EE).switch.ancien;
console.log('c3) Bruno (ancien sans clé) :',JSON.stringify({todo:out.todo.filter(t=>/EE-555-EE/.test(t)),btn:out.btn,t:out.t,wiz:out.wiz,writes:out.writes,ancien:out.ancien}));
C.c3=out.todo.some(t=>/Tu laisses EE-555-EE à Paul ESSAI/.test(t))&&out.btn&&/tu laisses ce véhicule à Paul ESSAI/.test(out.moi)&&out.wiz&&out.writes===0&&out.ancien.key==='';
await ctx.close();
// ── c4) Ethan (PC) : FF laissé au dépôt par Paul → « Lire et valider son état des lieux (sans le prendre) » → signe → validé sans prise, FF reste laissé
await login(ETHAN);out={todo:await todo()};await clickTodo(/Paul ESSAI a laissé FF-666-FF/);out.t=await title();out.btns=await page.evaluate(()=>[...document.querySelectorAll('#eq-app .veh-nav .btn')].map(b=>b.textContent.trim()));out.hint=await app();
await shotAt('ethan_valider_sans_prendre','#eq-app .veh-sec');await draw('veh-pad-p');await click(vx('valSans|'+FF+'|Sold'),600);await flushed();
const rFF=REG['vrec|'+FF+'|Sold'].data;out.rec={valide:rFF.valide&&{par:rFF.valide.par,sansPrise:rFF.valide.sansPrise,ou:rFF.valide.ou,sig:!!rFF.valide.sig},pris:!!rFF.pris};out.veh={laisse:!!veh(FF).laisse,cond:veh(FF).conducteurKey||null};out.toast=await toastTxt();
await accueil();out.todo2=await todo();out.kt=await kts();await click(vx('voir|'+FF+'|Sold'),500).catch(()=>{});await fiche(FF);out.card=await card();await shot('ethan_ff_fiche');
await flotteVue('mouv');out.rows=await page.evaluate(()=>[...document.querySelectorAll('#eq-app .mv-row')].map(x=>x.textContent.replace(/\s+/g,' ').trim()).filter(t=>/FF-666-FF/.test(t)));out.stats=await page.evaluate(()=>[...document.querySelectorAll('#eq-app .mv-stats .ac-stat')].map(x=>x.textContent.replace(/\s+/g,' ').trim()));
console.log('c4) validé sans prendre :',JSON.stringify({todo:out.todo.filter(t=>/FF-666-FF/.test(t)),t:out.t,btns:out.btns,hint:/je ne le prends pas/.test(out.hint),rec:out.rec,veh:out.veh,toast:out.toast,todo2:out.todo2.filter(t=>/FF-666-FF/.test(t)),card:out.card.slice(0,900),rows:out.rows,stats:out.stats}));
C.c4=out.todo.some(t=>/Paul ESSAI a laissé FF-666-FF \(Dépôt\)/.test(t)&&/Lire et valider son état des lieux \(sans le prendre\)/.test(t))&&/FF-666-FF a été laissé par Paul ESSAI/.test(out.t)&&out.btns.includes('✓ Exact, je valide sans le prendre')&&out.btns.includes('✓ C\'est exact, je signe')&&/je ne le prends pas/.test(out.hint)
  &&!!out.rec.valide&&out.rec.valide.par===ETHAN.email&&out.rec.valide.sansPrise===true&&out.rec.valide.ou==='Dépôt'&&out.rec.valide.sig&&!out.rec.pris&&out.veh.laisse&&out.veh.cond===null&&/validé — FF-666-FF reste laissé Dépôt/.test(out.toast)
  &&!out.todo2.some(t=>/Lire et valider/.test(t)&&/FF-666-FF/.test(t))&&/état des lieux validé par Ethan LE BIHAN le .{10} sans prise · à prendre/.test(out.card)&&/validé par Ethan LE BIHAN le .{10} sans prendre le véhicule \(reste Dépôt\)/.test(out.card)&&out.rows.some(t=>/État des lieux de Paul ESSAI validé par Ethan LE BIHAN sans prendre le véhicule — reste Dépôt, à prendre/.test(t))&&!out.stats.some(t=>/1 signature attendue/.test(t));
await ctx.close();
// ── c5) Paul : « ton état des lieux de sortie est validé » ; Karim prend FF après la validation ; « Mon historique complet »
await login(PAUL);out={kt:await kts()};await ovf('paul accueil');await ctx.close();
await login(KARIM);const rid=FF+'|Sold';out.kt2=await kts();await clickKt(/1 véhicule laissé à prendre/);out.liste=await app();await click(vx('voir|'+rid),500);out.t=await title();out.st=await page.evaluate(()=>(document.querySelector('#eq-app .okbox')||{}).textContent||'');out.canTake=await has('prisOk|'+rid);
await draw('veh-pad-p');await click(vx('prisOk|'+rid),600);await flushed();out.veh={cond:veh(FF).conducteurKey,pris:REG['vrec|'+rid].data.pris&&REG['vrec|'+rid].data.pris.par,valide:!!REG['vrec|'+rid].data.valide};
await moi();out.histBtn=await has('hist|pers~'+KARIM.email);await click(vx('hist|pers~'+KARIM.email),500);out.hist=await app();await ovf('karim historique');await shot('karim_mon_historique');
console.log('c5) Paul / Karim :',JSON.stringify({kt:out.kt.filter(t=>/FF-666-FF/.test(t)),t:out.t,st:out.st.slice(0,200),canTake:out.canTake,veh:out.veh,histBtn:out.histBtn,hist:out.hist.slice(out.hist.indexOf('Historique'),out.hist.indexOf('Historique')+300)}));
C.c5=out.kt.some(t=>/FF-666-FF : ton état des lieux de sortie est validé/.test(t)&&/par Ethan LE BIHAN/.test(t))&&/FF-666-FF a été laissé par Paul ESSAI/.test(out.t)&&/validé par Ethan LE BIHAN/.test(out.st)&&/tu peux le prendre/.test(out.st)&&out.canTake&&out.veh.cond===KARIM.email&&out.veh.pris===KARIM.email&&out.veh.valide
  &&out.histBtn&&/Historique des véhicules/.test(out.hist)&&/Karim TESTEUR/.test(out.hist)&&new RegExp('Le '+dFR(TODAY)+' : FF-666-FF').test(out.hist);
await ctx.close();
// ── c6) Ethan (PC) : 🕓 Historique
await login(ETHAN);await flotteVue('hist');out={chips:await page.evaluate(()=>[...document.querySelectorAll('#eq-app .eq-filtres .chip')].map(x=>x.textContent.trim()))};out.tbl=await page.evaluate(()=>[...document.querySelectorAll('#eq-app .hist-tbl tr')].slice(1).map(tr=>[...tr.children].map(td=>td.textContent.replace(/\s+/g,' ').trim())));await shot('ethan_hist_parc');await ovf('historique parc');
await fill('#eq-app [data-xin="veh|hist~veh"]',AA);out.ansAA=await page.evaluate(()=>(document.querySelector('#eq-app .hist-ans')||{}).textContent||'');out.condAA=await page.evaluate(()=>!!document.querySelector('#eq-app .veh-hh'));
await fill('#eq-app [data-xin="veh|hist~date"]','2026-01-01');out.ansAAold=await page.evaluate(()=>(document.querySelector('#eq-app .hist-ans')||{}).textContent||'');
await fill('#eq-app [data-xin="veh|hist~veh"]','');await fill('#eq-app [data-xin="veh|hist~date"]',TODAY);await fill('#eq-app [data-xin="veh|hist~pers"]',KARIM.email);out.ansK=await page.evaluate(()=>(document.querySelector('#eq-app .hist-ans')||{}).textContent||'');out.persK=await app();await shot('ethan_hist_karim');
await fill('#eq-app [data-xin="veh|hist~veh"]',FF);out.ansFF=await page.evaluate(()=>[...document.querySelectorAll('#eq-app .hist-ans')].map(x=>x.textContent.replace(/\s+/g,' ')));
await fiche(AA);out.ficheBtn=await has('hist|veh~'+AA);await click(vx('hist|veh~'+AA),500);out.view=await page.evaluate(()=>({sel:(document.querySelector('#eq-app [data-xin="veh|hist~veh"]')||{}).value,ans:(document.querySelector('#eq-app .hist-ans')||{}).textContent||''}));
console.log('c6) historique :',JSON.stringify({chips:out.chips,tbl:out.tbl,ansAA:out.ansAA,condAA:out.condAA,ansAAold:out.ansAAold,ansK:out.ansK,ansFF:out.ansFF,ficheBtn:out.ficheBtn,view:out.view}));
const rowFF=out.tbl.find(r=>/FF-666-FF/.test(r[0]));
C.c6=out.chips.includes('🕓 Historique')&&out.tbl.length>=6&&!!rowFF&&/Karim TESTEUR/.test(rowFF[1])&&/Bruno TESTSOUDEUR/.test(out.ansAA)&&out.condAA&&/Bruno TESTSOUDEUR/.test(out.ansAAold)&&new RegExp('Le '+dFR(TODAY)+' : FF-666-FF').test(out.ansK)&&/Karim TESTEUR/.test(out.persK)
  &&out.ansFF.length===2&&/Karim TESTEUR/.test(out.ansFF[0])&&/FF-666-FF/.test(out.ansFF[1])&&out.ficheBtn&&out.view.sel===AA&&/Bruno TESTSOUDEUR/.test(out.view.ans);
await ovf('historique');await ctx.close();
// ── c7
console.log('débordements :',JSON.stringify(OVF));console.log('refus serveur :',JSON.stringify(refus));console.log('erreurs console :',JSON.stringify(logs));
C.c7=OVF.length===0&&refus.length===0&&logs.length===0;
const ko=Object.entries(C).filter(([k,v])=>!v).map(([k])=>k);console.log(JSON.stringify(C));console.log(ko.length?'RESULTAT: KO '+ko.join(','):'RESULTAT: TOUT VERT');
await browser.close();
