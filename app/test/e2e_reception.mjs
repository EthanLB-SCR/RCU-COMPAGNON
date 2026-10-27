// RÉCEPTION / RESTITUTION DE VÉHICULE (14/10 nuit) — module « veh » (src/reception.js) branché sur la fiche véhicule de la flotte.
// Pack FICTIF (inventaire de 5 articles, 2 chartes courtes, personnes et véhicule inventés) ; Supabase SIMULÉ (registre en mémoire, 3 comptes fictifs) ; téléphone 390 px.
// 1) l'administrateur importe le pack (⚙ Pack véhicules) → registre vcfg/config (chartes v1) ;
// 2) réception complète au téléphone : « Qui est là ? » (19/10 VH : le responsable et moi), conducteur, permis vu, km + niveaux, points d'état (1 « Non ok »), 4 photos, inventaire conforme, cartes, charte déroulée puis
//    signée, récapitulatif signé (conducteur puis responsable) → vrec complète, docsig de la charte, le véhicule passe au conducteur ; document imprimable ;
// 3) restitution : 1 impact + 1 article manquant → l'écran ne montre QUE les différences (km parcourus, nouvel impact, manquant ; pas le « Non ok » déjà noté) ;
//    véhicule libre, signalement au responsable flotte ;
// 4) remise incomplète (charte « plus tard ») → en rouge dans la flotte ; chez le conducteur : « À faire » en haut de l'accueil → il lit et signe sur son téléphone ;
// 5) la remise devient complète chez le responsable ; restitution ; nouvelle remise au 1er conducteur : charte déjà signée (une fois par version et par personne).
// 6) nouvelle version de la charte (ré-import, texte modifié) → v2, v1 archivée (les documents déjà signés gardent leur texte).
// Pas de débordement horizontal, pas d'erreur console.
import { chromium } from 'playwright';
const BASE=process.env.BASE||'http://127.0.0.1:8773';
const SB='https://pghftlepduvfazbiavhq.supabase.co';
const b64u=o=>Buffer.from(JSON.stringify(o)).toString('base64').replace(/=+$/,'').replace(/\+/g,'-').replace(/\//g,'_');
const ETHAN={id:'11111111-2222-4333-8444-555555555555',email:'elebihan@scr-soudure.fr',prenom:'Ethan',nom:'LE BIHAN',poste:'resp_exploitation',admin:true};
const KARIM={id:'33333333-2222-4333-8444-555555555555',email:'karim.test@scr-soudure.fr',prenom:'Karim',nom:'TESTEUR',poste:'soudeur',admin:false}; /* fictif */
const PAUL={id:'44444444-2222-4333-8444-555555555555',email:'paul.test@scr-soudure.fr',prenom:'Paul',nom:'ESSAI',poste:'manchonneur',admin:false}; /* fictif */
const USERS=[ETHAN,KARIM,PAUL];let CUR=ETHAN;
const IMMAT='TE-123-ST';
const REG={['vehicule|'+IMMAT]:{kind:'vehicule',id:IMMAT,data:{immat:IMMAT,marque:'FICTIF',modele:'FOURGON TEST',type:'Soudeur',agence:'OUEST',n:'99',km:12000,cadenceVidange:30000,kmVidange:5000},updated_at:'2026-10-10T08:00:00Z'}};
const calls=[];
// ── pack FICTIF : 3 articles métier + 2 communs (= 5), 2 chartes courtes (la charte service dépasse l'écran : la lecture déroulée est testée)
const lignes=Array.from({length:28},(_,i)=>'- Règle fictive numéro '+(i+1)+' : texte de test sans valeur.').join('\n');
const PACK={vehicule:{reception:{version:'test-14/10',
  etatDesLieux:{releves:[{id:'km',label:'Kilométrage',type:'nombre',unite:'km',obligatoire:true},{id:'kmRestantVidange',label:'KM restant vidange',type:'nombre',unite:'km'},{id:'nivHuile',label:'Huile',type:'choix',choix:['Ok','Non ok'],groupe:'Niveaux'},{id:'nivFrein',label:'Liquide de frein',type:'choix',choix:['Ok','Non ok'],groupe:'Niveaux'},{id:'carburant',label:'Niveau de carburant',type:'choix',choix:['Réserve','1/2','Plein'],obligatoire:false}],
    controles:[{id:'pneus',label:'Pneus',type:'choix',choix:['Ok','Non ok']},{id:'feux',label:'Feux',type:'choix',choix:['Ok','Non ok']}],
    documentsABord:[{id:'docGrise',label:'Carte grise',type:'choix',choix:['Ok','Non ok']},{id:'docAssur',label:'Assurance',type:'choix',choix:['Ok','Non ok']}],
    equipement:{champs:[{id:'posteType',label:'Poste : type',type:'texte'}]},
    zones:[{id:'avant',label:'Face avant'},{id:'arriere',label:'Face arrière'},{id:'gauche',label:'Côté gauche'},{id:'droit',label:'Côté droit'}],
    photosDetail:[{id:'avant',label:'Face avant',obligatoire:true},{id:'arriere',label:'Face arrière',obligatoire:true},{id:'gauche',label:'Côté gauche',obligatoire:true},{id:'droit',label:'Côté droit',obligatoire:true},{id:'compteur',label:'Compteur',obligatoire:false},{id:'impacts',label:'Impacts',multiple:true}]},
  inventaire:{parMetier:{soudeur:[{id:'a1',designation:'Meuleuse fictive 125',qte:2},{id:'a2',designation:'Rallonge fictive 25 m',qte:1},{id:'a3',designation:'Boîte de disques test',qte:1,unite:'boîte',qteSource:'1 bte'}],chef:[]},
    commun:[{id:'c1',designation:'Trousse test',qte:1,pour:'tous'},{id:'c2',designation:'Extincteur test',qte:1,pour:'service'}],modeles:{soudeur:{titre:'MATÉRIEL TEST SOUDEUR'}}},
  dispositifs:{champs:[{id:'carteVehicule',label:'Carte carburant test',type:'dispositif',pour:'tous'},{id:'telebadge',label:'Badge test',type:'dispositif',pour:'tous'},{id:'cles',label:'Clés',type:'nombre'}],engagements:['Engagement fictif numéro un.','Engagement fictif numéro deux.']},
  documents:[{id:'charte_service',titre:'Charte test service',pour:'service',texte:'textes/charte_service_test.txt',version:'test'},{id:'charte_fonction',titre:'Charte test fonction',pour:'fonction',texte:'textes/charte_fonction_test.txt'}],
  correspondanceTypesAppli:{Soudeur:{charte:'charte_service',inventaire:'soudeur'},Fonction:{charte:'charte_fonction',inventaire:null}}},
 entretien:{modalitesEntretien:{auQuotidien:['Vérifier les niveaux (test).']}},
 textes:{'charte_service_test.txt':'# Charte test service\n\n## Règles\n\n'+lignes+'\n\n## Engagement\n\nJe soussigné : {{conducteur}}, atteste avoir lu la charte de test.\n\nLe : {{date}} — à : {{lieu}}\n\nVisa : {{signature_conducteur}}\n','charte_fonction_test.txt':'# Charte test fonction\n\n- Règle fictive.\n\nVisa : {{signature_conducteur}}\n'}}};
const PNG=Buffer.from('iVBORw0KGgoAAAANSUhEUgAAABAAAAAMCAIAAADkharWAAABU0lEQVR4nA3LIQHFIBRAUSIgCDCJJACCCC/CBAGQVy4AgggvwgQBJpEEQBCBCP8ff4wxWMNlCIZkEMNtKIbH0AxqeA2fYRq24RiMcVjH5QiO5BDH7SiOx9Ec6ngdn2M6tuO4f/BYz+UJnuQRz+0pnsfTPOp5PZ9nerbn+H+I2MgVCZEUkcgdKZEn0iIaeSNfZEZ25MR/EKxwCUFIggi3UIRHaIIKr/AJU9jCkX/I2MyVCZmUkcydKZkn0zKaeTNfZmZ25uR/AAsXBEggcEOBBxoovPDBhA2Hf6jYylUJlVSRyl0plafSKlp5K19lVnbl1H9QrHIpQUmKKLdSlEdpiiqv8ilT2crRf+jYztUJndSRzt0pnafTOtp5O19ndnbn9H8Y2ME1CIM0kME9KINn0AY6eAffYA724Ix/WNjFtQiLtJDFvSiLZ9EWungX32Iu9uIsflUEBpBsGbC5AAAAAElFTkSuQmCC','base64'); /* 16×12 */
const browser=await chromium.launch({headless:true, executablePath: process.env.CHROMIUM_PATH||undefined});
const CORS={'access-control-allow-origin':'*','access-control-allow-headers':'*','access-control-allow-methods':'GET, POST, PUT, PATCH, DELETE, OPTIONS'};
const logs=[];const C={};
async function mkCtx(){const ctx=await browser.newContext({viewport:{width:390,height:844}});
  await ctx.route(u=>u.href.startsWith(SB),async route=>{const req=route.request();const u=new URL(req.url());const p=u.pathname;const acc=req.headers()['accept']||'';
    const json=(o,status=200)=>route.fulfill({status,contentType:'application/json',headers:CORS,body:JSON.stringify(o)});
    if(req.method()==='OPTIONS')return route.fulfill({status:200,headers:CORS,body:''});
    let b={};try{b=JSON.parse(req.postData()||'{}');}catch(e){}
    const t=Math.floor(Date.now()/1000);const user={id:CUR.id,aud:'authenticated',role:'authenticated',email:CUR.email,email_confirmed_at:'2026-10-08T09:00:00Z',app_metadata:{provider:'email'},user_metadata:{},identities:[],created_at:'2026-10-08T09:00:00Z',updated_at:new Date().toISOString()};
    if(p==='/auth/v1/token')return json({access_token:b64u({alg:'HS256',typ:'JWT'})+'.'+b64u({iss:SB+'/auth/v1',sub:CUR.id,aud:'authenticated',exp:t+3600,iat:t,email:CUR.email,role:'authenticated'})+'.sig',token_type:'bearer',expires_in:3600,expires_at:t+3600,refresh_token:'rt-'+t,user});
    if(p==='/auth/v1/user')return json(user);if(p.startsWith('/auth/v1/'))return json({});
    if(p.startsWith('/storage/v1/'))return json({statusCode:'400',error:'test',message:'stockage simulé indisponible'},400); /* photos : repli en petite image dans l'enregistrement */
    if(p==='/rest/v1/profiles'){const rows=USERS.map(x=>({id:x.id,email:x.email,name:x.prenom+' '+x.nom,prenom:x.prenom,nom:x.nom,role:x.admin?'chef':x.poste,active:true,poste:x.poste,admin:x.admin,type:'salarie',rights:{},sites:null,created_at:'2026-10-08T09:00:00Z'}));const m=/id=eq\.([^&]+)/.exec(u.search);const r=m?rows.filter(x=>x.id===decodeURIComponent(m[1])):rows;return json(/object/.test(acc)?(r[0]||null):r);}
    if(p==='/rest/v1/rpc/registre_set'){calls.push({kind:b.p_kind,id:b.p_id,patch:b.p_patch,by:CUR.email});const k=b.p_kind+'|'+b.p_id;const old=(REG[k]||{}).data||{};const data=b.p_mode==='replace'?(b.p_patch||{}):Object.assign({},old,b.p_patch||{});Object.keys(b.p_patch||{}).forEach(x=>{if(b.p_patch[x]===null)delete data[x];});REG[k]={kind:b.p_kind,id:b.p_id,data,updated_at:new Date().toISOString()};return json(REG[k]);}
    if(p==='/rest/v1/registre'){const m=/kind=in\.%28([^)]+)%29/.exec(u.search)||/kind=in\.\(([^)]+)\)/.exec(decodeURIComponent(u.search));const kinds=m?decodeURIComponent(m[1]).replace(/"/g,'').split(','):null;return json(Object.values(REG).filter(r=>!kinds||kinds.includes(r.kind)));}
    if(p==='/rest/v1/app_settings')return json(/object/.test(acc)?null:[]);
    if(p.startsWith('/rest/v1/rpc/'))return json(null);
    if(p.startsWith('/rest/v1/'))return json(/object/.test(acc)?null:[]);
    return json([]);});
  const page=await ctx.newPage();page.on('dialog',d=>d.accept().catch(()=>{}));
  page.on('pageerror',e=>logs.push('PAGEERROR: '+e.message.slice(0,300)));page.on('console',m=>{if(m.type()==='error'&&!/realtime|websocket|Failed to fetch|net::ERR|status of 4\d\d|supabase/i.test(m.text()))logs.push(m.text().slice(0,200));});
  return {ctx,page};}
let ctx,page;const wait=ms=>page.waitForTimeout(ms);
const login=async who=>{CUR=who;({ctx,page}=await mkCtx());await page.goto(BASE+'/index.html');await wait(500);await page.evaluate(()=>{localStorage.clear();});await page.evaluate(()=>new Promise(r=>{try{const q=indexedDB.deleteDatabase('trace-kv');q.onsuccess=q.onerror=q.onblocked=()=>r();}catch(e){r();}}));await page.reload();await wait(900);
  await page.fill('#loginEmail',who.email);await page.fill('#loginPwd','Test-2026!');await page.click('#loginGo');await wait(3000);};
const app=()=>page.evaluate(()=>(document.getElementById('eq-app')||document.body).textContent.replace(/\s+/g,' '));
const click=async(sel,ms)=>{await page.evaluate(s=>{const el=document.querySelector(s);if(!el)throw new Error('absent : '+s+' · '+((document.getElementById('eq-app')||document.body).textContent||'').replace(/\s+/g,' ').slice(0,400));el.click();},sel);await wait(ms||220);};
const vx=a=>`#eq-app [data-act=x][data-v="veh|${a}"]`;
const fill=async(sel,val)=>{await page.evaluate(([s,v])=>{const el=document.querySelector(s);if(!el)throw new Error('absent : '+s);el.value=v;el.dispatchEvent(new Event('input',{bubbles:true}));el.dispatchEvent(new Event('change',{bubbles:true}));},[sel,val]);await wait(120);};
const title=()=>page.evaluate(()=>(document.querySelector('#eq-app .veh-h')||{}).textContent||'');
const OVF=[];const ovf=async tag=>{const o=await page.evaluate(()=>{const hb=document.getElementById('homeBody');return {doc:document.documentElement.scrollWidth,win:window.innerWidth,hb:hb?hb.scrollWidth-hb.clientWidth:0};});if(o.doc>o.win+1||o.hb>1)OVF.push(tag+':'+JSON.stringify(o));};
let NSHOT=0;const shot=async n=>{if(process.env.SHOTS)await page.screenshot({path:process.env.SHOTS+'/'+String(++NSHOT).padStart(2,'0')+'_'+String(n).replace(/[^A-Za-z0-9]+/g,'_').slice(0,40)+'.png'});}; /* SHOTS=<dossier> : captures du parcours */
const next=async()=>{const t=await title();await ovf(t);await shot(t);await click('#veh-next',260);};
const draw=async id=>{await page.evaluate(i=>{const c=document.getElementById(i);if(!c)throw new Error('pad absent '+i);c.scrollIntoView({block:'center'});},id);await wait(200);const bx=await page.locator('#'+id).boundingBox();
  await page.mouse.move(bx.x+bx.width*.2,bx.y+bx.height*.55);await page.mouse.down();await page.mouse.move(bx.x+bx.width*.45,bx.y+bx.height*.3,{steps:6});await page.mouse.move(bx.x+bx.width*.8,bx.y+bx.height*.65,{steps:6});await page.mouse.up();await wait(150);};
const photo=async k=>{await page.setInputFiles(`#eq-app input[data-xin="veh|photo~${k}"]`,{name:k+'.png',mimeType:'image/png',buffer:PNG});await page.waitForFunction(k=>{const i=document.querySelector(`#eq-app input[data-xin="veh|photo~${k}"]`);return k==='imp'?!!document.querySelector('#eq-app .veh-impf label.on'):!!(i&&i.closest('label.ok'));},k,{timeout:10000});await wait(120);};
const fiche=async()=>{await page.evaluate(async im=>{const T=window.TRACE;if(T.state.screen!=='home'){const b=document.getElementById('btnHome');if(b)b.click();await new Promise(r=>setTimeout(r,300));}document.getElementById('htParc').click();await new Promise(r=>setTimeout(r,300));
  const bk=document.querySelector('#eq-app .ac-back[data-act="xsub"]');if(bk){bk.click();await new Promise(r=>setTimeout(r,250));}
  const sg=document.querySelector('#eq-app [data-act=parcseg][data-v=flotte]');if(sg){sg.click();await new Promise(r=>setTimeout(r,200));}
  const o=document.querySelector(`#eq-app [data-act=fl][data-v="open|${im}"]`);if(o){o.click();await new Promise(r=>setTimeout(r,250));}},IMMAT);await wait(200);};
const flushed=async()=>{await page.waitForFunction(()=>window.TRACE&&window.TRACE.reg&&window.TRACE.reg.pending().length===0,null,{timeout:15000}).catch(()=>{});await wait(200);};
const regRows=kind=>Object.values(REG).filter(r=>r.kind===kind);
const lastRec=type=>regRows('vrec').filter(r=>r.data.type===type).sort((a,b)=>String(b.data.at).localeCompare(String(a.data.at)))[0];
// ── parcours de réception (téléphone) ; o.later : charte signée plus tard ; o.deja : charte déjà signée (attendu)
async function reception(drv,o={}){const R={titles:[]};await fiche();await click(vx('recep|'+IMMAT),400);
  R.titles.push(await title());R.quiAvec=await page.evaluate(()=>!!document.querySelector('#eq-app [data-v="veh|qui|avec"].on'));await next(); /* 19/10 (VH) : 1re étape « Qui est là ? » — « Le responsable et moi » présélectionné depuis la fiche */
  R.titles.push(await title());await fill('#eq-app [data-xin="veh|q"]',drv.prenom);R.filtre=await page.evaluate(()=>document.querySelectorAll('#eq-app .veh-pick').length);
  await click(`#eq-app [data-act=x][data-v="veh|cond|${drv.email}"]`);await next();
  R.titles.push(await title());if(!o.noPermis){await click(vx('permis|'));await fill('#eq-app [data-xin="veh|permisFin"]','2031-05-01');}else R.permisWarn=await page.evaluate(()=>/sera <b>incomplète|sera incomplète/.test(document.getElementById('eq-app').innerHTML));await next();
  R.titles.push(await title());R.kmRest=await page.evaluate(()=>/KM restant vidange : 23 000 km|KM restant vidange : 23\s000 km/.test(document.getElementById('eq-app').textContent));await fill('#veh-km',String(o.km||12050));
  await next();R.blocNiv=await page.evaluate(()=>((document.getElementById('toast')||{}).textContent||''));R.stillReleves=/Kilométrage et niveaux/.test(await title()); /* niveaux pas cochés : on reste */
  await click('#eq-app .veh-allok');await next();
  R.titles.push(await title());await click(`#eq-app .veh-allok[data-v^="veh|allok|ctl"]`);await click(`#eq-app .veh-allok[data-v^="veh|allok|doc"]`);if(o.feuxKo)await click(vx('set|ctl~feux~Non ok'));await next();
  R.titles.push(await title());await click('#veh-next');R.photoBloc=/Photos à prendre/.test(await page.evaluate(()=>(document.getElementById('toast')||{}).textContent||''));for(const k of ['avant','arriere','gauche','droit'])await photo(k);await next();
  R.titles.push(await title());R.inv=await page.evaluate(()=>({n:document.querySelectorAll('#eq-app .veh-inv').length,miss:document.querySelectorAll('#eq-app .veh-inv.miss').length,btn:document.getElementById('veh-next').textContent}));await next();
  R.titles.push(await title());await fill('#eq-app [data-xin="veh|carteNum~carteVehicule"]','TEST-CV-0001');await fill('#eq-app [data-xin="veh|carteNum~telebadge"]','TEST-TB-01');await fill('#eq-app [data-xin="veh|cles"]','2');
  await click('#veh-next');R.consBloc=/consignes/.test(await page.evaluate(()=>(document.getElementById('toast')||{}).textContent||''));await click(vx('consignes|'));await next();
  R.titles.push(await title());
  if(o.deja){R.deja=await page.evaluate(()=>/a déjà signé/.test(document.getElementById('eq-app').textContent));await next();}
  else if(o.later){await click(vx('later|'));R.laterTxt=await page.evaluate(()=>/sera signée plus tard/.test(document.getElementById('eq-app').textContent));await next();}
  else{R.gate0=await page.evaluate(()=>{const b=document.getElementById('veh-cread');return !!(b&&b.disabled);});await page.evaluate(()=>{const b=document.getElementById('veh-cbody');b.scrollTop=b.scrollHeight;b.dispatchEvent(new Event('scroll'));});await wait(250);
    R.gate1=await page.evaluate(()=>{const b=document.getElementById('veh-cread');return !!(b&&!b.disabled);});await click('#veh-cread',300);await click('#veh-next');R.sigBloc=/signature du conducteur/i.test(await page.evaluate(()=>(document.getElementById('toast')||{}).textContent||''));await draw('veh-pad-ch');await next();}
  R.titles.push(await title());R.recap=await app();await draw('veh-pad-c');await click('#veh-next');R.sigRBloc=/signature du responsable/i.test(await page.evaluate(()=>(document.getElementById('toast')||{}).textContent||''));await draw('veh-pad-r');await next();await wait(300);
  R.done=await app();await ovf('fin réception');await shot('fin_reception');await flushed();return R;}
async function restitution(o={}){const R={titles:[]};await fiche();await click(vx('resti|'+IMMAT),400);
  R.titles.push(await title());await next(); /* 19/10 (VH) : « Qui est là ? » */
  R.titles.push(await title());R.kmRef=await page.evaluate(()=>(document.getElementById('eq-app').textContent.match(/À la réception : ([\d\s  ]+) km/)||[])[1]||'');await fill('#veh-km',String(o.km||12500));R.kmd=await page.evaluate(()=>(document.getElementById('veh-kmd')||{}).textContent||'');await click('#eq-app .veh-allok');await next();
  R.titles.push(await title());await click(`#eq-app .veh-allok[data-v^="veh|allok|ctl"]`);await click(`#eq-app .veh-allok[data-v^="veh|allok|doc"]`);if(o.feuxKo)await click(vx('set|ctl~feux~Non ok'));await next();
  R.titles.push(await title());for(const k of ['avant','arriere','gauche','droit'])await photo(k);
  if(o.impact){R.oldImp=await page.evaluate(()=>/Déjà notés à la réception/.test(document.getElementById('eq-app').textContent));await fill('#eq-app [data-xin="veh|impZone"]','gauche');await fill('#eq-app [data-xin="veh|impNote"]',o.impact);await photo('imp');await click(vx('impadd|'),300);R.imp=await page.evaluate(()=>document.querySelectorAll('#eq-app .veh-imps:not(.old) li').length);}
  await next();
  R.titles.push(await title());if(o.manque){await click(vx('inv|'+o.manque));R.invBtn=await page.evaluate(()=>document.getElementById('veh-next').textContent);}await next();
  R.titles.push(await title());R.cartes=await page.evaluate(()=>[...document.querySelectorAll('#eq-app .veh-seg button.on')].map(b=>b.textContent));await next();
  R.titles.push(await title());R.recap=await page.evaluate(()=>{const d=document.querySelector('#eq-app .veh-diff');return {diff:d?d.textContent.replace(/\s+/g,' '):'',km:(document.getElementById('veh-kmp')||{}).textContent||'',items:[...document.querySelectorAll('#eq-app .veh-dl li')].map(x=>x.textContent.replace(/\s+/g,' ').trim()),sum:!!document.querySelector('#eq-app .veh-wiz .veh-sum:not(.veh-dl)')};});
  await draw('veh-pad-c');await draw('veh-pad-r');await next();await wait(300);R.done=await app();await ovf('fin restitution');await flushed();return R;}
// ── 1) administrateur : fiche véhicule sans pack → message ; import du pack fictif (⚙ Pack véhicules)
await login(ETHAN);
await fiche();
let out={card:await page.evaluate(()=>{const c=document.querySelector('#eq-app .veh-card');return c?c.textContent.replace(/\s+/g,' ').trim():null;})};
await click(vx('cfg|'),400);
await page.setInputFiles('#eq-app input[data-xin="veh|packfile"]',{name:'pack_test.json',mimeType:'application/json',buffer:Buffer.from(JSON.stringify(PACK))});await wait(1500);await flushed();
out.cfg=await page.evaluate(()=>{const t=document.getElementById('eq-app').textContent.replace(/\s+/g,' ');return {imp:/Pack importé le/.test(t),service:/Charte service : v1/.test(t),fonction:/Charte fonction : v1/.test(t),toast:(document.getElementById('toast')||{}).textContent};});
const cfgRow=REG['vcfg|config'];out.reg=cfgRow?{chartes:Object.keys(cfgRow.data.chartes||{}),inv:Object.keys(cfgRow.data.inventaire.listes),types:Object.keys(cfgRow.data.types)}:null;
console.log('1) pack :',JSON.stringify(out));
C.c1=out.card&&/Configuration véhicule absente/.test(out.card)&&out.cfg.imp&&out.cfg.service&&out.cfg.fonction&&/chartes service v1, fonction v1/.test(out.cfg.toast||'')&&out.reg&&out.reg.chartes.join()==='service,fonction'&&out.reg.inv.includes('soudeur');
// ── 2) réception complète au téléphone (Karim)
let R=await reception(KARIM,{feuxKo:true});
let rec=lastRec('reception');const sigK=REG['docsig|vcharte_service_v1|'+KARIM.email];const veh=REG['vehicule|'+IMMAT].data;
out={titles:R.titles,filtre:R.filtre,kmRest:R.kmRest,blocNiv:R.stillReleves,photoBloc:R.photoBloc,inv:R.inv,consBloc:R.consBloc,gate:[R.gate0,R.gate1],sigBloc:R.sigBloc,sigRBloc:R.sigRBloc,
  recap:/Permis : ✓ vu et valide/.test(R.recap)&&/12\s050 km/.test(R.recap)&&/Feux : Non ok/.test(R.recap),done:/Remise enregistrée/.test(R.done)&&/est remis à Karim TESTEUR/.test(R.done),
  rec:rec&&{complete:rec.data.complete,km:rec.data.edl.km,photos:Object.keys(rec.data.edl.photos).length,ph0:String(rec.data.edl.photos.avant||'').slice(0,15),sigC:/^data:image\/png/.test(rec.data.sigConducteur||''),sigR:/^data:image\/png/.test(rec.data.sigResponsable||''),charte:rec.data.charte&&[rec.data.charte.type,rec.data.charte.version,!!rec.data.charte.sig,!!rec.data.charte.lueA],permis:rec.data.permis,inv:[rec.data.inventaire.n,Object.keys(rec.data.inventaire.miss).length],cartes:Object.values(rec.data.cartes).map(c=>c.numero+':'+c.statut),cles:rec.data.cles,res:rec.data.reserves,cond:rec.data.conducteurKey},
  docsig:sigK&&{ver:sigK.data.ver,img:/^data:image\/png/.test(sigK.data.img||''),via:sigK.data.via},veh:{key:veh.conducteurKey,nom:veh.conducteur,km:veh.km,cartes:veh.cartes,remise:veh.remise&&veh.remise.complete}};
console.log('2) réception :',JSON.stringify(out));
C.c2=out.titles.join('|')==='1/10 · Qui est là ?|2/10 · Conducteur|3/10 · Permis de conduire|4/10 · Kilométrage et niveaux|5/10 · Points d\'état et documents|6/10 · Photos et impacts|7/10 · Inventaire|8/10 · Cartes et dispositifs|9/10 · Charte véhicule|10/10 · Récapitulatif et signatures'&&R.quiAvec /* 19/10 (VH) : + « Qui est là ? » en 1re étape */
  &&out.filtre===1&&out.kmRest&&out.blocNiv&&out.photoBloc&&out.inv.n===5&&out.inv.miss===0&&/Tout est conforme/.test(out.inv.btn)&&out.consBloc&&out.gate[0]===true&&out.gate[1]===true&&out.sigBloc&&out.sigRBloc&&out.recap&&out.done
  &&out.rec&&out.rec.complete===true&&out.rec.km===12050&&out.rec.photos===4&&/^data:image\//.test(out.rec.ph0)&&out.rec.sigC&&out.rec.sigR&&out.rec.charte.join()==='service,v1,true,true'&&out.rec.permis.ok&&out.rec.permis.fin==='2031-05-01'&&out.rec.inv.join()==='5,0'&&out.rec.cartes.join()==='TEST-CV-0001:remise,TEST-TB-01:remise'&&out.rec.cles===2&&out.rec.res.includes('Feux : Non ok')&&out.rec.cond===KARIM.email
  &&out.docsig&&out.docsig.ver==='v1'&&out.docsig.img&&/Ethan/.test(out.docsig.via)&&out.veh.key===KARIM.email&&out.veh.nom==='Karim TESTEUR'&&out.veh.km===12050&&out.veh.cartes.carteVehicule==='TEST-CV-0001'&&out.veh.remise===true;
// ── 2b) document imprimable : remise, état des lieux, photos, inventaire, cartes, signatures, charte en annexe
const recId=rec.id;await click('#eq-app [data-act=xsub]',400);
await shot('fiche_apres_remise');out={hist:await page.evaluate(()=>{const c=document.querySelector('#eq-app .veh-card');return c?c.textContent.replace(/\s+/g,' '):'';}),resti:!!(await page.$(vx('resti|'+IMMAT)))};
const [pop]=await Promise.all([ctx.waitForEvent('page'),page.locator(`#eq-app .veh-card [data-v="veh|print|${recId}"]`).click()]);await pop.waitForLoadState();await pop.waitForTimeout(300);
if(process.env.SHOTS)await pop.screenshot({path:process.env.SHOTS+'/doc_remise.png',fullPage:true});out.doc=await pop.evaluate(()=>{const t=document.body.innerText;return {h1:(document.querySelector('h1')||{}).textContent,karim:/Karim TESTEUR/.test(t),permis:/vu et valide/.test(t),inv:document.querySelectorAll('table.inv tr').length,photos:document.querySelectorAll('.ph figure').length,sig:document.querySelectorAll('table.sig img').length,annexe:/Annexe — Charte test service \(v1\)/.test(t),visa:!!document.querySelector('.charte img'),feux:/Feux/.test(t)&&/Non ok/.test(t),print:!!document.querySelector('.np.xbar button[onclick="print()"]')} /* 27/10 soir : barre d'envoi (⬇ fichier · 🖨 · 📤) */;});await pop.close();
console.log('2b) historique + document :',JSON.stringify(out));
C.c2b=/Remis à Karim TESTEUR/.test(out.hist)&&/remise complète/.test(out.hist)&&/Historique/.test(out.hist)&&/Remise par Ethan LE BIHAN à Karim TESTEUR/.test(out.hist) /* 20/10 VM : dans l'historique, la remise avec le responsable s'appelle « Remise par Z à X » */&&out.resti&&out.doc.h1==='Remise du véhicule'&&out.doc.karim&&out.doc.permis&&out.doc.inv===6&&out.doc.photos===4&&out.doc.sig===2&&out.doc.annexe&&out.doc.visa&&out.doc.feux&&out.doc.print;
// ── 3) restitution : 1 nouvel impact + 1 article manquant ; « Feux : Non ok » déjà noté à la réception → PAS une différence
R=await restitution({km:12500,impact:'Rayure test porte',manque:'a2',feuxKo:true});
rec=lastRec('restitution');const veh2=REG['vehicule|'+IMMAT].data;
out={titles:R.titles,kmRef:R.kmRef,kmd:R.kmd,oldImp:R.oldImp,imp:R.imp,invBtn:R.invBtn,cartes:R.cartes,recap:R.recap,done:/Restitution enregistrée/.test(R.done)&&/le véhicule est libre/.test(R.done),
  rec:rec&&{diff:rec.data.diff&&{km:rec.data.diff.km,n:rec.data.diff.n,imp:rec.data.diff.impacts.length,man:rec.data.diff.manquants,nonOk:rec.data.diff.nonOk},cartes:Object.values(rec.data.cartes).map(c=>c.statut),ref:rec.data.refReception},
  veh:{key:veh2.conducteurKey||null,nom:veh2.conducteur||null,km:veh2.km,sig:(veh2.signalements||[]).map(s=>s.text)}};
{const sid=rec&&rec.id;await click('#eq-app [data-act=xsub]',400);const [p2]=await Promise.all([ctx.waitForEvent('page'),page.locator(`#eq-app .veh-card [data-v="veh|print|${sid}"]`).click()]);await p2.waitForLoadState();await p2.waitForTimeout(300);
  out.doc=await p2.evaluate(()=>{const t=document.body.innerText;return {h1:(document.querySelector('h1')||{}).textContent,diff:/Différences avec la réception/.test(t)&&/450 km parcourus/.test(t)&&/Nouvel impact · Côté gauche : Rayure test porte/.test(t)&&/Manquant · Rallonge fictive 25 m/.test(t),sig:document.querySelectorAll('table.sig img').length,annexe:/Annexe/.test(t)};});await p2.close();}
console.log('3) restitution :',JSON.stringify(out));
C.c3=out.titles.join('|')==='1/7 · Qui est là ?|2/7 · Kilométrage et niveaux|3/7 · Points d\'état et documents|4/7 · Photos et impacts|5/7 · Inventaire|6/7 · Cartes et dispositifs|7/7 · Récapitulatif et signatures' /* 19/10 (VH) : + « Qui est là ? » */&&/12\s050/.test(out.kmRef)&&/450 km/.test(out.kmd)&&out.imp===1&&/Valider avec 1 écart/.test(out.invBtn)&&out.cartes.join()==='Rendue,Rendue'
  &&/450 km/.test(out.recap.km)&&out.recap.items.length===2&&out.recap.items.some(x=>/Nouvel impact · Côté gauche : Rayure test porte/.test(x))&&out.recap.items.some(x=>/Manquant · Rallonge fictive 25 m/.test(x))&&!/Feux/.test(out.recap.diff)&&!out.recap.sum&&out.done
  &&out.rec&&out.rec.diff.km===450&&out.rec.diff.n===2&&out.rec.diff.imp===1&&out.rec.diff.man.join()==='Rallonge fictive 25 m'&&out.rec.diff.nonOk.length===0&&out.rec.cartes.join()==='rendue,rendue'&&out.rec.ref===recId
  &&out.veh.key===null&&out.veh.nom===null&&out.veh.km===12500&&out.veh.sig.some(t=>/Restitution de Karim TESTEUR : 1 nouvel impact, 1 manquant/.test(t))
  &&out.doc.h1==='Restitution du véhicule'&&out.doc.diff&&out.doc.sig===2&&!out.doc.annexe;
// ── 4) remise INCOMPLÈTE (Paul, charte « plus tard ») → en rouge dans la flotte
R=await reception(PAUL,{later:true,km:12510});rec=lastRec('reception');
await click('#eq-app [data-act=xsub]',400);
out={laterTxt:R.laterTxt,rec:rec&&{complete:rec.data.complete,manque:rec.data.manque,charte:rec.data.charte},fiche:await page.evaluate(()=>{const c=document.querySelector('#eq-app .veh-card');const h=document.querySelector('#eq-app .af-head');return {card:c?c.textContent.replace(/\s+/g,' '):'',head:h?h.textContent.replace(/\s+/g,' '):'',btn:!!document.querySelector('#eq-app [data-v^="veh|charteRec|"]')};})};
await page.evaluate(async()=>{const b=document.querySelector('#eq-app [data-act=fl][data-v="back|"]');if(b)b.click();await new Promise(r=>setTimeout(r,250));});
out.liste=await page.evaluate(im=>{const r=[...document.querySelectorAll('#eq-app .fl-row')].find(x=>x.textContent.includes(im));return r?{txt:r.textContent.replace(/\s+/g,' '),bad:!!r.querySelector('.fl-pic.bad'),red:[...r.querySelectorAll('.eq-tag')].some(t=>/Remise incomplète/.test(t.textContent)&&/155, 44, 34|9b2c22/i.test(t.getAttribute('style')||''))}:null;},IMMAT);
await page.evaluate(async()=>{document.getElementById('htHome').click();await new Promise(r=>setTimeout(r,500));});
out.accueil=await page.evaluate(()=>[...document.querySelectorAll('#eq-app .ac-kt')].map(x=>x.textContent.replace(/\s+/g,' ').trim()).filter(t=>/Parc véhicules/.test(t)));
console.log('4) remise incomplète :',JSON.stringify(out));
C.c4=out.laterTxt&&out.rec&&out.rec.complete===false&&out.rec.manque.join()==='charte'&&out.rec.charte.later===true&&/incomplète : charte non signée/.test(out.fiche.card)&&out.fiche.btn&&/Remise incomplète : charte non signée/.test(out.fiche.head)
  &&out.liste&&out.liste.bad&&out.liste.red&&out.accueil.some(t=>/bloquante/.test(t));
await wait(1500);await ctx.close();
// ── 4b) Paul, sur SON téléphone : « À faire » en haut de l'accueil → lit la charte jusqu'en bas → signe ; Moi → Mon véhicule
await login(PAUL);await wait(800);
out={todo:await page.evaluate(()=>[...document.querySelectorAll('#eq-app .ac-notif')].map(x=>x.textContent.replace(/\s+/g,' ').trim())),first:await page.evaluate(()=>{const h=[...document.querySelectorAll('#eq-app .ac-h b')].map(x=>x.textContent);return h[0]||'';})};
const ti=await page.evaluate(()=>[...document.querySelectorAll('#eq-app .ac-notif')].findIndex(x=>/charte du véhicule TE-123-ST/.test(x.textContent)));
out.idx=ti;if(ti>=0){await page.evaluate(i=>document.querySelectorAll('#eq-app .ac-notif')[i].click(),ti);await wait(400);}
await shot('paul_modal_charte');out.modal=await page.evaluate(()=>{const m=document.getElementById('modal');return {open:m.classList.contains('show'),t:(m.querySelector('h3')||{}).textContent||'',gate:!!(document.getElementById('vc-read')&&document.getElementById('vc-read').disabled),paul:/Paul ESSAI/.test(m.textContent)};});
await page.evaluate(()=>{const b=document.getElementById('vc-body');b.scrollTop=b.scrollHeight;b.dispatchEvent(new Event('scroll'));});await wait(300);await page.evaluate(()=>document.getElementById('vc-read').click());await wait(200);
await draw('vc-pad');await page.evaluate(()=>document.getElementById('vc-ok').click());await wait(1800);
const sigP=REG['docsig|vcharte_service_v1|'+PAUL.email];await shot('paul_apres_signature');out.sig=sigP&&{by:calls.filter(c=>c.kind==='docsig'&&c.id==='vcharte_service_v1|'+PAUL.email).map(c=>c.by),img:/^data:image\/png/.test(sigP.data.img||''),read:!!sigP.data.readAt};
out.after=await page.evaluate(()=>[...document.querySelectorAll('#eq-app .ac-notif')].map(x=>x.textContent.replace(/\s+/g,' ').trim()).filter(t=>/charte du véhicule/.test(t)).length);
await page.evaluate(async()=>{document.getElementById('htEspace').click();await new Promise(r=>setTimeout(r,500));});
out.moi=await page.evaluate(()=>{const c=[...document.querySelectorAll('#eq-app .card.fl-mine')].find(x=>/TE-123-ST/.test(x.textContent));return c?{txt:c.textContent.replace(/\s+/g,' '),pdf:!!c.querySelector('[data-v^="veh|print|"]'),charte:!!c.querySelector('[data-v="veh|charteVoir|TE-123-ST"]')}:null;});
await ovf('Moi Paul');
console.log('4b) conducteur : à faire + signature :',JSON.stringify(out));
C.c4b=out.todo.some(t=>/À lire et signer : charte du véhicule TE-123-ST/.test(t))&&out.first==='À faire'&&out.modal.open&&/Charte test service/.test(out.modal.t)&&out.modal.gate&&out.modal.paul&&out.sig&&out.sig.by.join()===PAUL.email&&out.sig.img&&out.sig.read&&out.after===0
  &&out.moi&&/Remis le/.test(out.moi.txt)&&out.moi.pdf&&out.moi.charte&&/Charte signée \(v1/.test(out.moi.txt);
await ctx.close();
// ── 5) le responsable : la remise de Paul est devenue complète ; restitution ; nouvelle remise à Karim → charte déjà signée (une fois par version et par personne)
await login(ETHAN);await fiche();
out={fiche:await page.evaluate(()=>{const c=document.querySelector('#eq-app .veh-card');return c?c.textContent.replace(/\s+/g,' '):'';})};
R=await restitution({km:12600});out.resti=/Restitution enregistrée/.test(R.done);out.sansDiff=R.recap.items.length===0&&/Aucune différence/.test(R.recap.diff);
R=await reception(KARIM,{deja:true,noPermis:true,km:12610});rec=lastRec('reception');
out.deja=R.deja;out.permisWarn=R.permisWarn;out.rec=rec&&{complete:rec.data.complete,manque:rec.data.manque,deja:rec.data.charte&&rec.data.charte.deja,cond:rec.data.conducteurKey};
await click('#eq-app [data-act=xsub]',400);out.pcard=await page.evaluate(()=>{const c=document.querySelector('#eq-app .veh-card');return c?c.textContent.replace(/\s+/g,' '):'';});
await click(vx('permisRec|'+rec.id),300);await page.evaluate(()=>{document.getElementById('vp-ok').checked=true;document.getElementById('vp-fin').value='2030-01-31';document.getElementById('vp-save').click();});await wait(400);await flushed();
const rp=REG['vrec|'+rec.id];out.apres={permis:rp&&rp.data.permis&&[rp.data.permis.ok,rp.data.permis.fin],complete:rp&&rp.data.complete,card:await page.evaluate(()=>{const c=document.querySelector('#eq-app .veh-card');return c?c.textContent.replace(/\s+/g,' '):'';})};
out.nSig=calls.filter(c=>c.kind==='docsig'&&c.id==='vcharte_service_v1|'+KARIM.email).length;
console.log('5) complète, restitution, charte déjà signée :',JSON.stringify(out));
C.c5=/remise complète/.test(out.fiche)&&/Remis à Paul ESSAI/.test(out.fiche)&&out.resti&&out.sansDiff&&out.deja&&out.permisWarn&&out.rec&&out.rec.complete===false&&out.rec.manque.join()==='permis'&&out.rec.deja===true&&out.rec.cond===KARIM.email&&out.nSig===1
  &&/incomplète : permis non vu/.test(out.pcard)&&out.apres.permis&&out.apres.permis.join()==='true,2030-01-31'&&out.apres.complete===true&&/Remis à Karim TESTEUR le .* — remise complète/.test(out.apres.card);
// ── 6) nouvelle version de la charte service (texte modifié, ré-import) → v2 ; v1 archivée : le document d'une remise signée en v1 garde son texte v1
await click(vx('cfg|'),400);const P2=JSON.parse(JSON.stringify(PACK));P2.vehicule.textes['charte_service_test.txt']+='\n- Règle fictive ajoutée en version 2.\n';
await page.setInputFiles('#eq-app input[data-xin="veh|packfile"]',{name:'pack_v2.json',mimeType:'application/json',buffer:Buffer.from(JSON.stringify(P2))});await wait(1200);await flushed();
const cfg2=REG['vcfg|config'].data;out={toast:await page.evaluate(()=>(document.getElementById('toast')||{}).textContent||''),ver:[cfg2.chartes.service.version,cfg2.chartes.fonction.version],arch:Object.keys(cfg2.archives||{})};
await page.evaluate(()=>document.querySelector('#eq-app .ac-back').click());await wait(300);
const first=regRows('vrec').filter(r=>r.data.type==='reception').sort((a,b)=>String(a.data.at).localeCompare(String(b.data.at)))[0];
const [p3]=await Promise.all([ctx.waitForEvent('page'),page.locator(`#eq-app .veh-card [data-v="veh|print|${first.id}"]`).click()]);await p3.waitForLoadState();await p3.waitForTimeout(300);
out.doc=await p3.evaluate(()=>{const t=document.body.innerText;return {v1:/Annexe — Charte test service \(v1\)/.test(t),sansAjout:!/ajoutée en version 2/.test(t)};});await p3.close();
console.log('6) nouvelle version de charte :',JSON.stringify(out));
C.c6=/nouvelle version de la charte service \(v2\) : re-signature demandée/.test(out.toast)&&out.ver.join()==='v2,v1'&&out.arch.join()==='vcharte_service_v1'&&out.doc.v1&&out.doc.sansAjout;
await wait(1200);await ctx.close();
console.log('débordements :',OVF.length?OVF:'aucun');C.ovf=!OVF.length;C.console=!logs.length;
const bad=Object.entries(C).filter(([k,v])=>!v).map(([k])=>k);console.log(bad.length?'RESULTAT: ECHEC '+bad.join(','):'RESULTAT: TOUT VERT');console.log(logs.length?logs:'[]');
await browser.close();
