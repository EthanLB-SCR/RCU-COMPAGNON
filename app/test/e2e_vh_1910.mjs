// LOT VH (19/10 après-midi) — remise SANS responsable sur place, « véhicule laissé » / pris par un collègue, changement de conducteur, premier état des lieux de chacun.
// Pack FICTIF (le même que e2e_reception), 4 comptes FICTIFS (administrateur / responsable d'exploitation, un chef de chantier sans droit « Flotte », deux gars), 2 véhicules
// inventés ; Supabase SIMULÉ (registre en mémoire) ; téléphone 390 px tout du long ; zéro erreur console ; pas de débordement.
//  1) pack importé ; flotte : « 2 véhicules sans premier état des lieux » (véhicule à clé, véhicule « nom libre ») + relance ;
//  2) Paul (gars) : « À faire » → premier état des lieux, mode seul (pas de permis, charte signée dans le parcours), enregistré HORS CONNEXION puis envoyé à la reconnexion →
//     vrec « à valider par Ethan », vignette du véhicule ;
//  3) Ethan : « À faire » → relecture (4 photos) → REFUS avec un mot ; 4) Paul : « refusée : à compléter » → saisie reprise (km, photos) → nouvelle remise ;
//  5) Ethan valide (signature) : remise complète, validée ; historique ; vignette dans la flotte ; plus qu'un véhicule sans premier état des lieux ;
//  6) Paul laisse le véhicule au dépôt (où, km, carburant, 4 photos, 1 impact) → véhicule libre, « laissé à … », signalement ;
//  7) Karim : Moi → Véhicule laissé → « Je prends ce véhicule » → remise seul (permis « à faire voir »), validateur changé : Luc (chef de chantier) ;
//  8) Luc (sans droit Flotte) valide depuis Moi, permis vu ; Ethan valide le « véhicule laissé » ;
//  9) Ethan déclare un changement de conducteur Karim → Paul (le véhicule passe sur Paul tout de suite, 2 formulaires attendus) ;
// 10) Karim : restitution de mémoire (sans photo) ; 11) Paul : remise à remplir ; 12) Ethan : formulaires reçus → valide → changement clos, historique en ordre ;
// 13) remise AVEC responsable inchangée (« Le responsable et moi », les deux signatures, complète d'emblée).
import { chromium } from 'playwright';
const BASE=process.env.BASE||'http://127.0.0.1:8813';
const SB='https://pghftlepduvfazbiavhq.supabase.co';
const b64u=o=>Buffer.from(JSON.stringify(o)).toString('base64').replace(/=+$/,'').replace(/\+/g,'-').replace(/\//g,'_');
const ETHAN={id:'11111111-2222-4333-8444-555555555555',email:'elebihan@scr-soudure.fr',prenom:'Ethan',nom:'LE BIHAN',poste:'resp_exploitation',admin:true};
const LUC={id:'22222222-2222-4333-8444-555555555555',email:'luc.test@scr-soudure.fr',prenom:'Luc',nom:'TESTCHEF',poste:'chef',admin:false}; /* fictif : chef de chantier, pas de droit « Flotte » */
const KARIM={id:'33333333-2222-4333-8444-555555555555',email:'karim.test@scr-soudure.fr',prenom:'Karim',nom:'TESTEUR',poste:'soudeur',admin:false}; /* fictif */
const PAUL={id:'44444444-2222-4333-8444-555555555555',email:'paul.test@scr-soudure.fr',prenom:'Paul',nom:'ESSAI',poste:'manchonneur',admin:false}; /* fictif */
const USERS=[ETHAN,LUC,KARIM,PAUL];let CUR=ETHAN;
const V1='TE-123-ST',V2='TE-456-ST';
const REG={['vehicule|'+V1]:{kind:'vehicule',id:V1,data:{immat:V1,marque:'FICTIF',modele:'FOURGON TEST',type:'Soudeur',agence:'OUEST',n:'99',km:12000,conducteur:'Karim TESTEUR'},updated_at:'2026-10-10T08:00:00Z'}, /* conducteur « nom libre » (import Excel), sans clé */
  ['vehicule|'+V2]:{kind:'vehicule',id:V2,data:{immat:V2,marque:'FICTIF',modele:'FOURGON ESSAI',type:'Soudeur',agence:'OUEST',n:'98',km:12500,conducteur:'Paul ESSAI',conducteurKey:PAUL.email},updated_at:'2026-10-10T08:00:00Z'}};
const calls=[];let OFFLINE=false; /* coupure réseau simulée : le serveur ne reçoit rien */
const lignes=Array.from({length:28},(_,i)=>'- Règle fictive numéro '+(i+1)+' : texte de test sans valeur.').join('\n');
const PACK={vehicule:{reception:{version:'test-19/10',
  etatDesLieux:{releves:[{id:'km',label:'Kilométrage',type:'nombre',unite:'km',obligatoire:true},{id:'nivHuile',label:'Huile',type:'choix',choix:['Ok','Non ok'],groupe:'Niveaux'},{id:'nivFrein',label:'Liquide de frein',type:'choix',choix:['Ok','Non ok'],groupe:'Niveaux'},{id:'carburant',label:'Niveau de carburant',type:'choix',choix:['Réserve','1/2','Plein'],obligatoire:false}],
    controles:[{id:'pneus',label:'Pneus',type:'choix',choix:['Ok','Non ok']},{id:'feux',label:'Feux',type:'choix',choix:['Ok','Non ok']}],
    documentsABord:[{id:'docGrise',label:'Carte grise',type:'choix',choix:['Ok','Non ok']},{id:'docAssur',label:'Assurance',type:'choix',choix:['Ok','Non ok']}],
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
const PCW=!!process.env.PCW; /* PCW=1 : les écrans du responsable (Ethan) en 1366 px pour les captures PC ; les gars restent au téléphone */
async function mkCtx(wide){const ctx=await browser.newContext({viewport:wide?{width:1366,height:900}:{width:390,height:844}});
  await ctx.route(u=>u.href.startsWith(SB),async route=>{const req=route.request();const u=new URL(req.url());const p=u.pathname;const acc=req.headers()['accept']||'';
    const json=(o,status=200)=>route.fulfill({status,contentType:'application/json',headers:CORS,body:JSON.stringify(o)});
    if(OFFLINE)return route.abort('internetdisconnected');
    if(req.method()==='OPTIONS')return route.fulfill({status:200,headers:CORS,body:''});
    let b={};try{b=JSON.parse(req.postData()||'{}');}catch(e){}
    const t=Math.floor(Date.now()/1000);const user={id:CUR.id,aud:'authenticated',role:'authenticated',email:CUR.email,email_confirmed_at:'2026-10-08T09:00:00Z',app_metadata:{provider:'email'},user_metadata:{},identities:[],created_at:'2026-10-08T09:00:00Z',updated_at:new Date().toISOString()};
    if(p==='/auth/v1/token')return json({access_token:b64u({alg:'HS256',typ:'JWT'})+'.'+b64u({iss:SB+'/auth/v1',sub:CUR.id,aud:'authenticated',exp:t+3600,iat:t,email:CUR.email,role:'authenticated'})+'.sig',token_type:'bearer',expires_in:3600,expires_at:t+3600,refresh_token:'rt-'+t,user});
    if(p==='/auth/v1/user')return json(user);if(p.startsWith('/auth/v1/'))return json({});
    if(p.startsWith('/storage/v1/'))return json({statusCode:'400',error:'test',message:'stockage simulé indisponible'},400);
    if(p==='/rest/v1/profiles'){const rows=USERS.map(x=>({id:x.id,email:x.email,name:x.prenom+' '+x.nom,prenom:x.prenom,nom:x.nom,role:x.admin?'chef':x.poste==='chef'?'bureau':x.poste,active:true,poste:x.poste,admin:x.admin,type:'salarie',rights:{},sites:null,created_at:'2026-10-08T09:00:00Z'}));const m=/id=eq\.([^&]+)/.exec(u.search);const r=m?rows.filter(x=>x.id===decodeURIComponent(m[1])):rows;return json(/object/.test(acc)?(r[0]||null):r);}
    if(p==='/rest/v1/rpc/registre_set'){calls.push({kind:b.p_kind,id:b.p_id,patch:b.p_patch,by:CUR.email,at:Date.now()});const k=b.p_kind+'|'+b.p_id;const old=(REG[k]||{}).data||{};const data=b.p_mode==='replace'?(b.p_patch||{}):Object.assign({},old,b.p_patch||{});Object.keys(b.p_patch||{}).forEach(x=>{if(b.p_patch[x]===null)delete data[x];});REG[k]={kind:b.p_kind,id:b.p_id,data,updated_at:new Date().toISOString()};return json(REG[k]);}
    if(p==='/rest/v1/registre'){const m=/kind=in\.%28([^)]+)%29/.exec(u.search)||/kind=in\.\(([^)]+)\)/.exec(decodeURIComponent(u.search));const kinds=m?decodeURIComponent(m[1]).replace(/"/g,'').split(','):null;return json(Object.values(REG).filter(r=>!kinds||kinds.includes(r.kind)));}
    if(p==='/rest/v1/app_settings')return json(/object/.test(acc)?null:[]);
    if(p.startsWith('/rest/v1/rpc/'))return json(null);
    if(p.startsWith('/rest/v1/'))return json(/object/.test(acc)?null:[]);
    return json([]);});
  const page=await ctx.newPage();page.on('dialog',d=>d.accept().catch(()=>{}));
  page.on('pageerror',e=>logs.push('PAGEERROR: '+e.message.slice(0,300)));page.on('console',m=>{if(m.type()==='error'&&!/realtime|websocket|Failed to fetch|net::ERR|status of 4\d\d|supabase/i.test(m.text()))logs.push(m.text().slice(0,200));});
  return {ctx,page};}
let ctx,page;const wait=ms=>page.waitForTimeout(ms);
const login=async who=>{CUR=who;({ctx,page}=await mkCtx(PCW&&who.admin));await page.goto(BASE+'/index.html');await wait(500);await page.evaluate(()=>{localStorage.clear();});await page.evaluate(()=>new Promise(r=>{try{const q=indexedDB.deleteDatabase('trace-kv');q.onsuccess=q.onerror=q.onblocked=()=>r();}catch(e){r();}}));await page.reload();await wait(900);await page.waitForSelector('#loginEmail',{timeout:20000});
  await page.fill('#loginEmail',who.email);await page.fill('#loginPwd','Test-2026!');await page.click('#loginGo');await wait(3000);};
const app=()=>page.evaluate(()=>(document.getElementById('eq-app')||document.body).textContent.replace(/\s+/g,' '));
const click=async(sel,ms)=>{await page.evaluate(s=>{const el=document.querySelector(s);if(!el)throw new Error('absent : '+s+' · '+((document.getElementById('eq-app')||document.body).textContent||'').replace(/\s+/g,' ').slice(0,400));el.click();},sel);await wait(ms||220);};
const vx=a=>`#eq-app [data-act=x][data-v="veh|${a}"]`;
const fill=async(sel,val)=>{await page.evaluate(([s,v])=>{const el=document.querySelector(s);if(!el)throw new Error('absent : '+s);el.value=v;el.dispatchEvent(new Event('input',{bubbles:true}));el.dispatchEvent(new Event('change',{bubbles:true}));},[sel,val]);await wait(120);};
const title=()=>page.evaluate(()=>(document.querySelector('#eq-app .veh-h')||{}).textContent||'');
const toastTxt=()=>page.evaluate(()=>(document.getElementById('toast')||{}).textContent||'');
const OVF=[];const ovf=async tag=>{const o=await page.evaluate(()=>{const hb=document.getElementById('homeBody');return {doc:document.documentElement.scrollWidth,win:window.innerWidth,hb:hb?hb.scrollWidth-hb.clientWidth:0};});if(o.doc>o.win+1||o.hb>1)OVF.push(tag+':'+JSON.stringify(o));};
let NSHOT=0;const shot=async n=>{if(process.env.SHOTS)await page.screenshot({path:process.env.SHOTS+'/'+String(++NSHOT).padStart(2,'0')+'_'+String(n).replace(/[^A-Za-z0-9]+/g,'_').slice(0,40)+'.png'});};
const next=async()=>{const t=await title();await ovf(t);await shot(t);await click('#veh-next',260);};
const draw=async id=>{await page.evaluate(i=>{const c=document.getElementById(i);if(!c)throw new Error('pad absent '+i);c.scrollIntoView({block:'center'});},id);await wait(200);const bx=await page.locator('#'+id).boundingBox();
  await page.mouse.move(bx.x+bx.width*.2,bx.y+bx.height*.55);await page.mouse.down();await page.mouse.move(bx.x+bx.width*.45,bx.y+bx.height*.3,{steps:6});await page.mouse.move(bx.x+bx.width*.8,bx.y+bx.height*.65,{steps:6});await page.mouse.up();await wait(150);};
const photo=async k=>{await page.setInputFiles(`#eq-app input[data-xin="veh|photo~${k}"]`,{name:k+'.png',mimeType:'image/png',buffer:PNG});await page.waitForFunction(k=>{const i=document.querySelector(`#eq-app input[data-xin="veh|photo~${k}"]`);return k==='imp'?!!document.querySelector('#eq-app .veh-impf label.on'):!!(i&&i.closest('label.ok'));},k,{timeout:10000});await wait(150);};
const fiche=async im=>{await page.evaluate(async im=>{const T=window.TRACE;if(T.state.screen!=='home'){const b=document.getElementById('btnHome');if(b)b.click();await new Promise(r=>setTimeout(r,300));}document.getElementById('htParc').click();await new Promise(r=>setTimeout(r,300));
  const bk=document.querySelector('#eq-app .ac-back[data-act="xsub"]');if(bk){bk.click();await new Promise(r=>setTimeout(r,250));}
  const sg=document.querySelector('#eq-app [data-act=parcseg][data-v=flotte]');if(sg){sg.click();await new Promise(r=>setTimeout(r,200));}
  const bk2=document.querySelector('#eq-app [data-act=fl][data-v="back|"]');if(bk2){bk2.click();await new Promise(r=>setTimeout(r,200));}
  const o=document.querySelector(`#eq-app [data-act=fl][data-v="open|${im}"]`);if(o){o.click();await new Promise(r=>setTimeout(r,250));}},im);await wait(200);};
const flotteList=async()=>{await page.evaluate(async()=>{const T=window.TRACE;if(T.state.screen!=='home'){const b=document.getElementById('btnHome');if(b)b.click();await new Promise(r=>setTimeout(r,300));}document.getElementById('htParc').click();await new Promise(r=>setTimeout(r,300));const bk=document.querySelector('#eq-app .ac-back[data-act="xsub"]');if(bk){bk.click();await new Promise(r=>setTimeout(r,250));}const sg=document.querySelector('#eq-app [data-act=parcseg][data-v=flotte]');if(sg){sg.click();await new Promise(r=>setTimeout(r,200));}const bk2=document.querySelector('#eq-app [data-act=fl][data-v="back|"]');if(bk2){bk2.click();await new Promise(r=>setTimeout(r,200));}});await wait(200);};
const accueil=async()=>{await page.evaluate(async()=>{const T=window.TRACE;if(T.state.screen!=='home'){const b=document.getElementById('btnHome');if(b)b.click();await new Promise(r=>setTimeout(r,300));}document.getElementById('htHome').click();await new Promise(r=>setTimeout(r,500));});await wait(200);};
const todo=()=>page.evaluate(()=>[...document.querySelectorAll('#eq-app .ac-notif')].map(x=>x.textContent.replace(/\s+/g,' ').trim()));
const clickTodo=async re=>{const i=await page.evaluate(src=>[...document.querySelectorAll('#eq-app .ac-notif')].findIndex(x=>new RegExp(src).test(x.textContent)),re.source);if(i<0)throw new Error('à faire absent : '+re.source+' · '+JSON.stringify(await todo()));await page.evaluate(i=>document.querySelectorAll('#eq-app .ac-notif')[i].click(),i);await wait(500);};
const moi=async()=>{await page.evaluate(async()=>{document.getElementById('htEspace').click();await new Promise(r=>setTimeout(r,400));const s=document.querySelector('#eq-app .eq-subs [data-act=sub][data-v=moi]');if(s){s.click();await new Promise(r=>setTimeout(r,300));}});await wait(200);};
const flushed=async()=>{await page.waitForFunction(()=>window.TRACE&&window.TRACE.reg&&window.TRACE.reg.pending().length===0,null,{timeout:15000}).catch(()=>{});await wait(200);};
const regRows=kind=>Object.values(REG).filter(r=>r.kind===kind);
const lastRec=(immat,type)=>regRows('vrec').filter(r=>r.data.vehId===immat&&r.data.type===type).sort((a,b)=>String(b.data.at).localeCompare(String(a.data.at)))[0];
const veh=im=>REG['vehicule|'+im].data;
const subs=()=>page.evaluate(()=>[...document.querySelectorAll('#eq-app .eq-subs .chip')].map(x=>x.textContent.replace(/\s+/g,' ').trim()));
const allOk=async()=>{const L=await page.evaluate(()=>[...document.querySelectorAll('#eq-app .veh-allok')].map(b=>b.dataset.v));for(const v of L){await page.evaluate(v=>{const b=document.querySelector(`#eq-app .veh-allok[data-v="${v}"]`);if(b)b.click();},v);await wait(150);}}; /* chaque « Tout Ok » redessine l'écran : on re-cherche le bouton */
const charteSign=async()=>{await page.evaluate(()=>{const b=document.getElementById('veh-cbody');b.scrollTop=b.scrollHeight;b.dispatchEvent(new Event('scroll'));});await wait(250);await click('#veh-cread',300);await draw('veh-pad-ch');};
// ── 1) Ethan : import du pack ; flotte : 2 véhicules sans premier état des lieux (clé / nom libre) → relance
await login(ETHAN);await fiche(V1);await click(vx('cfg|'),400);
await page.setInputFiles('#eq-app input[data-xin="veh|packfile"]',{name:'pack_test.json',mimeType:'application/json',buffer:Buffer.from(JSON.stringify(PACK))});await wait(1500);await flushed();
await flotteList();await shot('flotte_sans_edl');
let out={bloc:await page.evaluate(()=>{const c=document.querySelector('#eq-app .veh2-flotte');return c?c.textContent.replace(/\s+/g,' '):'';}),sansEdl:await page.evaluate(()=>document.querySelectorAll('#eq-app .veh2-edl .eq-row').length)};
await click(vx('relance|'),500);await flushed();out.relance=[veh(V1).edl1Relance,veh(V2).edl1Relance].map(x=>x&&x.par);out.bloc2=await page.evaluate(()=>{const c=document.querySelector('#eq-app .veh2-flotte');return c?c.textContent.replace(/\s+/g,' '):'';});
await ovf('flotte');console.log('1) pack + sans premier état des lieux :',JSON.stringify(out));
C.c1=/2 véhicules sans premier état des lieux/.test(out.bloc)&&out.sansEdl===2&&out.relance.join()==='Ethan LE BIHAN,Ethan LE BIHAN'&&/relancé le/.test(out.bloc2);
await ctx.close();
// ── 2) Paul : « À faire » → premier état des lieux, seul ; enregistré hors connexion puis envoyé
await login(PAUL);out={todo:await todo()};await shot('paul_a_faire');
await clickTodo(/premier état des lieux/);out.subs=await subs();out.t0=await title();await shot('paul_qui');
out.quiSeul=await page.evaluate(()=>!!document.querySelector('#eq-app [data-v="veh|qui|seul"].on'));await next();
out.t1=await title();await fill('#veh-km','12560');await allOk();await next();
out.t2=await title();await allOk();await next();
out.t3=await title();for(const k of ['avant','arriere','gauche','droit'])await photo(k);await wait(400);await next();
out.t4=await title();await next();
out.t5=await title();await fill('#eq-app [data-xin="veh|carteNum~carteVehicule"]','TEST-CV-0002');await click(vx('consignes|'));await next();
out.t6=await title();await charteSign();await next();
out.t7=await title();out.valPar=await page.evaluate(()=>{const s=[...document.querySelectorAll('#eq-app .veh-sec')].find(x=>/À valider par/.test(x.textContent));return s?s.textContent.replace(/\s+/g,' '):'';});out.btn=await page.evaluate(()=>document.getElementById('veh-next').textContent);out.padR=!!(await page.$('#veh-pad-r'));
await draw('veh-pad-c');await shot('paul_recap_seul');
OFFLINE=true;await ctx.setOffline(true);await click('#veh-next',600);out.done=await app();await wait(1500);out.pending=await page.evaluate(()=>window.TRACE.reg.pending().map(w=>w.kind));out.srvAvant=regRows('vrec').length;await shot('paul_fin_hors_ligne');
OFFLINE=false;await ctx.setOffline(false);await page.evaluate(()=>window.dispatchEvent(new Event('online')));await wait(1500);await flushed();
let rec=lastRec(V2,'reception');const v2=veh(V2);
out.rec=rec&&{seul:rec.data.sansResponsable,aValider:rec.data.aValider&&rec.data.aValider.par,premier:rec.data.premier,cond:rec.data.conducteurKey,by:rec.data.by,complete:rec.data.complete,manque:rec.data.manque,photos:Object.keys(rec.data.edl.photos).length,sigC:/^data:image/.test(rec.data.sigConducteur||''),sigR:rec.data.sigResponsable,charte:rec.data.charte&&!!rec.data.charte.sig};
out.veh={cond:v2.conducteurKey,aValider:v2.remise&&v2.remise.aValider,vignette:String(v2.vignette||'').slice(0,11),vLen:String(v2.vignette||'').length,km:v2.km};
out.docsig=!!REG['docsig|vcharte_service_v1|'+PAUL.email];
await click(vx('home|'),400);out.subsApres=await subs();await moi();out.mine=await page.evaluate(()=>{const c=[...document.querySelectorAll('#eq-app .card.fl-mine')].find(x=>/TE-456-ST/.test(x.textContent));return c?c.textContent.replace(/\s+/g,' '):'';});await ovf('Moi Paul');
console.log('2) premier état des lieux, seul, hors connexion :',JSON.stringify(out));
C.c2=out.todo.some(t=>/Ton véhicule TE-456-ST : premier état des lieux à faire/.test(t)&&/relance de Ethan/.test(t))&&out.subs.some(t=>/Ma remise/.test(t))&&out.t0==='1/8 · Qui est là ?'&&out.quiSeul&&out.t1==='2/8 · Kilométrage et niveaux'&&out.t2==='3/8 · Points d\'état et documents'&&out.t3==='4/8 · Photos et impacts'&&out.t4==='5/8 · Inventaire'&&out.t5==='6/8 · Cartes et dispositifs'&&out.t6==='7/8 · Charte véhicule'&&out.t7==='8/8 · Récapitulatif et signatures'
  &&/Ethan LE BIHAN/.test(out.valPar)&&/à valider par Ethan/.test(out.btn)&&!out.padR&&/à valider par Ethan LE BIHAN/.test(out.done)&&out.pending.includes('vrec')&&out.pending.includes('vehicule')&&out.srvAvant===0
  &&out.rec&&out.rec.seul===true&&out.rec.aValider===ETHAN.email&&out.rec.premier===true&&out.rec.cond===PAUL.email&&out.rec.by==='Paul ESSAI'&&out.rec.complete===true&&out.rec.photos===4&&out.rec.sigC&&!out.rec.sigR&&out.rec.charte
  &&out.veh.cond===PAUL.email&&out.veh.aValider===true&&out.veh.vignette==='data:image/'&&out.veh.vLen>0&&out.veh.vLen<=82000&&out.veh.km===12560&&out.docsig&&!out.subsApres.some(t=>/Ma remise/.test(t))&&/à valider par Ethan LE BIHAN/.test(out.mine);
await ctx.close();
// ── 3) Ethan : « À faire » → relecture → refus avec un mot
await login(ETHAN);out={todo:await todo()};await shot('ethan_a_faire');await clickTodo(/Remise de TE-456-ST par Paul ESSAI à valider/);
out.val=await page.evaluate(()=>({t:(document.querySelector('#eq-app .veh-h')||{}).textContent,photos:document.querySelectorAll('#eq-app .veh-vph').length,permisBloc:!!document.getElementById('vv-permis'),pad:!!document.getElementById('veh-pad-v'),txt:document.getElementById('eq-app').textContent.replace(/\s+/g,' ')}));await shot('ethan_validation');await ovf('validation');
await click(vx('valNo|'),300);await fill('#vv-motif','Photo du côté droit floue (test)');await click(vx('valRefus|'+rec.id),600);await flushed();
const rr=REG['vrec|'+rec.id].data;out.refus=rr.refus&&{par:rr.refus.par,motif:rr.refus.motif,aValider:rr.aValider||null};out.vehRefus=veh(V2).remise&&veh(V2).remise.refus;
await fiche(V2);out.fiche=await page.evaluate(()=>{const c=document.querySelector('#eq-app .veh-card');return c?c.textContent.replace(/\s+/g,' '):'';});
console.log('3) refus :',JSON.stringify(out));
C.c3=out.todo.some(t=>/Remise de TE-456-ST par Paul ESSAI à valider/.test(t))&&/Remise de TE-456-ST par Paul ESSAI/.test(out.val.t)&&out.val.photos===4&&!out.val.permisBloc&&out.val.pad&&/premier état des lieux/.test(out.val.txt)&&out.refus&&out.refus.par===ETHAN.email&&/floue/.test(out.refus.motif)&&out.refus.aValider===null&&out.vehRefus===true&&/refusée par Ethan LE BIHAN/.test(out.fiche)&&/Paul ESSAI doit la compléter/.test(out.fiche);
await ctx.close();
// ── 4) Paul : refusée → à compléter (saisie reprise : km et photos déjà là) → nouvelle remise
await login(PAUL);out={todo:await todo()};await clickTodo(/Remise de TE-456-ST refusée par Ethan LE BIHAN : à compléter/);
out.t0=await title();await next();out.t1=await title();out.km=await page.evaluate(()=>document.getElementById('veh-km').value);await next();await next();
out.t3=await title();out.photosOk=await page.evaluate(()=>document.querySelectorAll('#eq-app .veh-ph.ok').length);await next();await next();
out.t5=await title();await next();out.t6=await title();await draw('veh-pad-c');await next();await wait(300);await flushed();
const rec2=lastRec(V2,'reception');out.rec2=rec2&&{id:rec2.id!==rec.id,redoDe:rec2.data.redoDe,aValider:rec2.data.aValider&&rec2.data.aValider.par,km:rec2.data.edl.km,photos:Object.keys(rec2.data.edl.photos).length};out.old=REG['vrec|'+rec.id].data.remplacePar;
console.log('4) complétée :',JSON.stringify(out));
C.c4=out.todo.some(t=>/refusée par Ethan LE BIHAN : à compléter/.test(t)&&/floue/.test(t))&&out.t0==='1/7 · Qui est là ?'&&out.t1==='2/7 · Kilométrage et niveaux'&&out.km==='12560'&&out.t3==='4/7 · Photos et impacts'&&out.photosOk===4&&out.t5==='6/7 · Cartes et dispositifs'&&out.t6==='7/7 · Récapitulatif et signatures'
  &&out.rec2&&out.rec2.id&&out.rec2.redoDe===rec.id&&out.rec2.aValider===ETHAN.email&&out.rec2.km===12560&&out.rec2.photos===4&&out.old===rec2.id;
await ctx.close();
// ── 5) Ethan valide (signature) : complète, validée ; vignette dans la flotte ; historique
await login(ETHAN);out={todo:await todo()};await clickTodo(/Remise de TE-456-ST par Paul ESSAI à valider/);
await draw('veh-pad-v');await click(vx('valOk|'+rec2.id),600);await flushed();
const rv=REG['vrec|'+rec2.id].data;out.valide=rv.valide&&{par:rv.valide.par,sig:/^data:image/.test(rv.valide.sig||'')};out.complete=rv.complete;out.sigR=/^data:image/.test(rv.sigResponsable||'');out.aValider=rv.aValider||null;out.vehAV=veh(V2).remise&&veh(V2).remise.aValider;
await fiche(V2);out.fiche=await page.evaluate(()=>{const c=document.querySelector('#eq-app .veh-card');const h=document.querySelector('#eq-app .af-head');return {card:c?c.textContent.replace(/\s+/g,' '):'',head:h?h.textContent.replace(/\s+/g,' '):'',hist:[...document.querySelectorAll('#eq-app .veh-card .eq-row .eq-s')].map(x=>x.textContent.replace(/\s+/g,' '))};});await shot('ethan_fiche_validee');
await flotteList();out.liste=await page.evaluate(im=>{const r=[...document.querySelectorAll('#eq-app .fl-row')].find(x=>x.textContent.includes(im));return r?{photo:!!r.querySelector('.fl-photo img'),txt:r.textContent.replace(/\s+/g,' ')}:null;},V2);out.sansEdl=await page.evaluate(()=>document.querySelectorAll('#eq-app .veh2-edl .eq-row').length);
console.log('5) validée :',JSON.stringify(out));
C.c5=out.valide&&out.valide.par===ETHAN.email&&out.valide.sig&&out.complete===true&&out.sigR&&out.aValider===null&&out.vehAV===false&&/Remis à Paul ESSAI le .* — remise complète \(validée par Ethan LE BIHAN\)/.test(out.fiche.card)&&!/à valider|refusée/.test(out.fiche.head)&&out.fiche.hist.some(t=>/validée par Ethan LE BIHAN/.test(t))&&out.fiche.hist.some(t=>/refusée par Ethan LE BIHAN.*\(remplacée\)/.test(t))&&out.liste&&out.liste.photo&&!/premier état des lieux/.test(out.liste.txt)&&out.sansEdl===1;
await ctx.close();
// ── 6) Paul laisse le véhicule au dépôt (où, km, carburant, 4 photos, 1 impact)
await login(PAUL);await moi();await click(vx('lache|'+V2),500);out={t0:await title()};await shot('paul_ou');
await click('#veh-next');out.blocOu=await toastTxt();await click(vx('ou|depot'),250);await fill('#eq-app [data-xin="veh|ouTxt"]','clés au gardien (test)');await next();
out.t1=await title();await fill('#veh-km','12600');await click('#veh-next');out.blocCarb=await toastTxt();await click(vx('carb|1/2'),200);await next();
out.t2=await title();for(const k of ['avant','arriere','gauche','droit'])await photo(k);await fill('#eq-app [data-xin="veh|impZone"]','gauche');await fill('#eq-app [data-xin="veh|impNote"]','Rayure test');await click(vx('impadd|'),300);await next();
out.t3=await title();out.recap=await app();out.btn=await page.evaluate(()=>document.getElementById('veh-next').textContent);await draw('veh-pad-c');await next();await wait(300);await flushed();out.done=await app();await shot('paul_laisse_fin');
const rl=lastRec(V2,'restitution');const vl=veh(V2);out.rec=rl&&{lache:rl.data.lache&&rl.data.lache.ou,carb:rl.data.carburant,seul:rl.data.sansResponsable,aValider:rl.data.aValider&&rl.data.aValider.par,diffKm:rl.data.diff&&rl.data.diff.km,diffN:rl.data.diff&&rl.data.diff.n,cartes:Object.values(rl.data.cartes).map(c=>c.statut)};
out.veh={cond:vl.conducteur||null,key:vl.conducteurKey||null,laisse:vl.laisse&&[vl.laisse.ou,vl.laisse.par],km:vl.km,sig:(vl.signalements||[]).map(s=>s.text)};
console.log('6) véhicule laissé :',JSON.stringify(out));
C.c6=out.t0==='1/4 · Où est le véhicule ?'&&/Où est le véhicule/.test(out.blocOu)&&out.t1==='2/4 · Kilométrage et carburant'&&/carburant/.test(out.blocCarb)&&out.t2==='3/4 · Photos et impacts'&&out.t3==='4/4 · Récapitulatif et signatures'&&/Dépôt · clés au gardien \(test\)/.test(out.recap)&&/40 km/.test(out.recap)&&/Je laisse le véhicule/.test(out.btn)&&/laissé à Dépôt/.test(out.done)
  &&out.rec&&out.rec.lache==='Dépôt · clés au gardien (test)'&&out.rec.carb==='1/2'&&out.rec.seul===true&&out.rec.aValider===ETHAN.email&&out.rec.diffKm===40&&out.rec.diffN===1&&out.rec.cartes.join()==='abord'
  &&out.veh.cond===null&&out.veh.key===null&&out.veh.laisse&&out.veh.laisse[0]==='Dépôt · clés au gardien (test)'&&out.veh.laisse[1]==='Paul ESSAI'&&out.veh.km===12600&&out.veh.sig.some(t=>/Véhicule laissé par Paul ESSAI : 1 nouvel impact/.test(t));
await ctx.close();
// ── 7) Karim : Moi → Véhicule laissé → « Je prends ce véhicule » → remise seul, permis « à faire voir », validateur changé (Luc, chef de chantier)
await login(KARIM);await moi();out={subs:await subs()};await page.evaluate(()=>document.querySelector('#eq-app .eq-subs [data-act=sub][data-v=vlaisse]').click());await wait(400);await shot('karim_laisses');
out.liste=await app();await ovf('laissés');await click(vx('prendre|'+V2),500);
out.t0=await title();await next();out.t1=await title();out.permisTxt=await app();await fill('#eq-app [data-xin="veh|permisFin"]','2031-01-01');await next();
out.t2=await title();await fill('#veh-km','12610');await allOk();await next();await allOk();await next();
out.t4=await title();for(const k of ['avant','arriere','gauche','droit'])await photo(k);await next();await next();
out.t6=await title();await click(vx('consignes|'));await next();out.t7=await title();await charteSign();await next();
out.t8=await title();await click(vx('valPick|'),250);await fill('#eq-app [data-xin="veh|valq"]','luc');await click(`#eq-app [data-act=x][data-v="veh|valPar|${LUC.email}"]`,300);out.valPar=await page.evaluate(()=>{const s=[...document.querySelectorAll('#eq-app .veh-sec')].find(x=>/À valider par/.test(x.textContent));return s?s.textContent.replace(/\s+/g,' '):'';});
await draw('veh-pad-c');await shot('karim_recap');await next();await wait(300);await flushed();out.done=await app();
const rk=lastRec(V2,'reception');const vk=veh(V2);out.rec=rk&&{cond:rk.data.conducteurKey,aValider:rk.data.aValider&&rk.data.aValider.par,permis:rk.data.permis,seul:rk.data.sansResponsable,manque:rk.data.manque};out.veh={cond:vk.conducteur,key:vk.conducteurKey,laisse:vk.laisse||null,aValider:vk.remise&&vk.remise.aValider};
await click(vx('home|'),400);await moi();out.mine=await page.evaluate(()=>{const c=[...document.querySelectorAll('#eq-app .card.fl-mine')].find(x=>/TE-456-ST/.test(x.textContent));return c?c.textContent.replace(/\s+/g,' '):'';});out.subs2=await subs();
console.log('7) pris par Karim :',JSON.stringify(out));
C.c7=out.subs.some(t=>/Véhicule laissé 1/.test(t))&&/TE-456-ST/.test(out.liste)&&/Laissé à Dépôt · clés au gardien \(test\)/.test(out.liste)&&/par Paul ESSAI/.test(out.liste)&&out.t0==='1/9 · Qui est là ?'&&out.t1==='2/9 · Permis de conduire'&&/à faire voir/.test(out.permisTxt)&&out.t2==='3/9 · Kilométrage et niveaux'&&out.t4==='5/9 · Photos et impacts'&&out.t6==='7/9 · Cartes et dispositifs'&&out.t7==='8/9 · Charte véhicule'&&out.t8==='9/9 · Récapitulatif et signatures'
  &&/Luc TESTCHEF/.test(out.valPar)&&/à valider par Luc TESTCHEF/.test(out.done)&&/montrer ton permis/.test(out.done)&&out.rec&&out.rec.cond===KARIM.email&&out.rec.aValider===LUC.email&&out.rec.permis&&out.rec.permis.ok===false&&out.rec.permis.aFaireVoir===true&&out.rec.permis.fin==='2031-01-01'&&out.rec.seul===true&&out.rec.manque.join()==='permis'
  &&out.veh.cond==='Karim TESTEUR'&&out.veh.key===KARIM.email&&out.veh.laisse===null&&out.veh.aValider===true&&/à valider par Luc TESTCHEF/.test(out.mine)&&/montrer ton permis/.test(out.mine)&&!out.subs2.some(t=>/Véhicule laissé/.test(t));
await ctx.close();
// ── 8) Luc (chef, sans droit Flotte) valide depuis Moi, permis vu ; Ethan valide le « véhicule laissé » de Paul
await login(LUC);out={todo:await todo(),parc:await page.evaluate(()=>!![...document.querySelectorAll('#eq-app .ac-tile')].find(x=>/Parc/.test(x.textContent)))};await clickTodo(/Remise de TE-456-ST par Karim TESTEUR à valider/);
out.subs=await subs();out.val=await page.evaluate(()=>({t:(document.querySelector('#eq-app .veh-h')||{}).textContent,permisBloc:!!document.getElementById('vv-permis'),fin:(document.getElementById('vv-fin')||{}).value}));await shot('luc_validation_moi');await ovf('validation Luc');
await page.evaluate(()=>{document.getElementById('vv-permis').checked=true;});await draw('veh-pad-v');await click(vx('valOk|'+rk.id),600);await flushed();
const rkv=REG['vrec|'+rk.id].data;out.rec={valide:rkv.valide&&rkv.valide.par,permis:rkv.permis&&[rkv.permis.ok,rkv.permis.fin,rkv.permis.vuPar],complete:rkv.complete,manque:rkv.manque};out.subsApres=await subs();out.todoApres=await todo();
await ctx.close();
await login(ETHAN);out.todoE=await todo();await clickTodo(/Véhicule laissé TE-456-ST par Paul ESSAI à valider/);out.valE=await page.evaluate(()=>({t:(document.querySelector('#eq-app .veh-h')||{}).textContent,txt:document.getElementById('eq-app').textContent.replace(/\s+/g,' ')}));
await draw('veh-pad-v');await click(vx('valOk|'+rl.id),600);await flushed();out.rl=REG['vrec|'+rl.id].data.valide&&REG['vrec|'+rl.id].data.valide.par;
console.log('8) validations (chef depuis Moi, Ethan) :',JSON.stringify(out));
C.c8=out.todo.some(t=>/Remise de TE-456-ST par Karim TESTEUR à valider/.test(t))&&!out.parc&&out.subs.some(t=>/Validation/.test(t))&&/Remise de TE-456-ST par Karim TESTEUR/.test(out.val.t)&&out.val.permisBloc&&out.val.fin==='2031-01-01'&&out.rec.valide===LUC.email&&out.rec.permis&&out.rec.permis.join()==='true,2031-01-01,Luc TESTCHEF'&&out.rec.complete===true&&out.rec.manque.length===0&&!out.subsApres.some(t=>/Validation/.test(t))&&!out.todoApres.some(t=>/à valider/.test(t))
  &&out.todoE.some(t=>/Véhicule laissé TE-456-ST par Paul ESSAI à valider/.test(t))&&/Véhicule laissé de TE-456-ST par Paul ESSAI/.test(out.valE.t)&&/Dépôt · clés au gardien/.test(out.valE.txt)&&/Rayure test/.test(out.valE.txt)&&out.rl===ETHAN.email;
// ── 9) Ethan déclare un changement de conducteur Karim → Paul
await fiche(V2);out={btn:!!(await page.$(vx('switch|'+V2)))};await click(vx('switch|'+V2),400);out.t=await title();await shot('ethan_switch');
await click('#veh-next').catch(()=>{});await fill('#eq-app [data-xin="veh|swq"]','paul');await click(`#eq-app [data-act=x][data-v="veh|swpick|${PAUL.email}"]`,300);await fill('#eq-app [data-xin="veh|swou"]','chantier test');await ovf('switch');
await click(vx('swok|'+V2),600);await flushed();const vs=veh(V2);out.veh={cond:vs.conducteur,key:vs.conducteurKey,sw:vs.switch&&[vs.switch.ancien.nom,vs.switch.nouveau.nom,vs.switch.ou,vs.switch.declarePar]};
out.suivi=await app();await shot('ethan_switch_suivi');await accueil();out.todo=await todo();
console.log('9) changement de conducteur déclaré :',JSON.stringify(out));
C.c9=out.btn&&/Changement de conducteur/.test(out.t)&&out.veh.cond==='Paul ESSAI'&&out.veh.key===PAUL.email&&out.veh.sw&&out.veh.sw.join('|')==='Karim TESTEUR|Paul ESSAI|chantier test|Ethan LE BIHAN'&&/2 formulaires attendus/.test(out.suivi)&&out.todo.some(t=>/Changement de conducteur TE-456-ST : 2 formulaires attendus/.test(t));
await ctx.close();
// ── 10) Karim (ancien) : restitution de mémoire, sans photo
await login(KARIM);out={todo:await todo()};await clickTodo(/Restitution de TE-456-ST à remplir : tu l'as laissé à Paul ESSAI/);
out.t0=await title();await fill('#veh-km','12700');await allOk();await next();await allOk();await next();out.t2=await title();await next();out.t3=await title();await next();out.t4=await title();await next();out.t5=await title();out.btn=await page.evaluate(()=>document.getElementById('veh-next').textContent);await draw('veh-pad-c');await next();await wait(300);await flushed();out.done=await app();
const rm=lastRec(V2,'restitution');const vm=veh(V2);out.rec=rm&&{memoire:rm.data.memoire,sw:rm.data.switchId===vs.switch.id,cond:rm.data.conducteurKey,photos:Object.keys(rm.data.edl.photos).length,aValider:rm.data.aValider||null,diffKm:rm.data.diff&&rm.data.diff.km};out.veh={cond:vm.conducteur,key:vm.conducteurKey};
console.log('10) restitution de mémoire :',JSON.stringify(out));
C.c10=out.todo.some(t=>/Restitution de TE-456-ST à remplir/.test(t)&&/de mémoire/.test(t))&&out.t0==='1/6 · Kilométrage et niveaux'&&out.t2==='3/6 · Photos et impacts'&&out.t3==='4/6 · Inventaire'&&out.t5==='6/6 · Récapitulatif et signatures'&&/Enregistrer ma restitution/.test(out.btn)&&/de mémoire/.test(out.done)
  &&out.rec&&out.rec.memoire===true&&out.rec.sw&&out.rec.cond===KARIM.email&&out.rec.photos===0&&out.rec.aValider===null&&out.rec.diffKm===90&&out.veh.cond==='Paul ESSAI'&&out.veh.key===PAUL.email;
await ctx.close();
// ── 11) Paul (nouveau) : remise à remplir (charte déjà signée : écran « a déjà signé »)
await login(PAUL);out={todo:await todo()};await clickTodo(/Remise de TE-456-ST à remplir : tu as pris le véhicule de Karim TESTEUR/);
out.t0=await title();await next();await fill('#eq-app [data-xin="veh|permisFin"]','2032-01-01');await next();await fill('#veh-km','12700');await allOk();await next();await allOk();await next();for(const k of ['avant','arriere','gauche','droit'])await photo(k);await next();await next();await click(vx('consignes|'));await next();
out.t7=await title();out.deja=await page.evaluate(()=>/a déjà signé/.test(document.getElementById('eq-app').textContent));await next();out.t8=await title();out.valPar=await page.evaluate(()=>{const s=[...document.querySelectorAll('#eq-app .veh-sec')].find(x=>/À valider par/.test(x.textContent));return s?s.textContent.replace(/\s+/g,' '):'';});await draw('veh-pad-c');await next();await wait(300);await flushed();
const rp=lastRec(V2,'reception');out.rec=rp&&{sw:rp.data.switchId===vs.switch.id,cond:rp.data.conducteurKey,aValider:rp.data.aValider&&rp.data.aValider.par};
console.log('11) remise du nouveau conducteur :',JSON.stringify(out));
C.c11=out.todo.some(t=>/Remise de TE-456-ST à remplir : tu as pris le véhicule de Karim TESTEUR/.test(t))&&out.t0==='1/9 · Qui est là ?'&&out.t7==='8/9 · Charte véhicule'&&out.deja&&out.t8==='9/9 · Récapitulatif et signatures'&&/Ethan LE BIHAN/.test(out.valPar)&&out.rec&&out.rec.sw&&out.rec.cond===PAUL.email&&out.rec.aValider===ETHAN.email;
await ctx.close();
// ── 12) Ethan : formulaires reçus → valider → changement clos ; historique en ordre
await login(ETHAN);out={todo:await todo()};await shot('ethan_a_faire_switch');await clickTodo(/Changement de conducteur TE-456-ST : formulaires reçus, à valider/);out.suivi=await app();await shot('ethan_switch_recu');
await click(vx('swclose|'+V2),500);out.t=await title();out.fin=await page.evaluate(()=>(document.getElementById('vv-fin')||{}).value);await page.evaluate(()=>{document.getElementById('vv-permis').checked=true;});await draw('veh-pad-v');await click(vx('valOk|'+rp.id),600);await flushed();
const vf=veh(V2);out.veh={sw:vf.switch||null,hist:(vf.switchHist||[]).map(h=>[h.ancien.nom,h.nouveau.nom,h.valide===rp.id]),cond:vf.conducteur};out.valide=REG['vrec|'+rp.id].data.valide&&REG['vrec|'+rp.id].data.valide.par;
await fiche(V2);out.fiche=await page.evaluate(()=>{const c=document.querySelector('#eq-app .veh-card');return {card:c?c.textContent.replace(/\s+/g,' '):'',rows:[...document.querySelectorAll('#eq-app .veh-card .eq-row .eq-t')].map(x=>x.textContent.replace(/\s+/g,' '))};});await page.evaluate(()=>{const h=document.querySelector('#eq-app .veh-hh');if(h)h.scrollIntoView({block:'start'});});await wait(200);await shot('ethan_fiche_historique');await ovf('fiche');
await accueil();out.todoApres=await todo();
console.log('12) changement clos :',JSON.stringify(out));
C.c12=out.todo.some(t=>/formulaires reçus, à valider/.test(t))&&/restitution reçue|✓ reçue/.test(out.suivi)&&/Remise de TE-456-ST par Paul ESSAI/.test(out.t)&&out.fin==='2032-01-01'&&out.veh.sw===null&&out.veh.hist.length===1&&out.veh.hist[0].join()==='Karim TESTEUR,Paul ESSAI,true'&&out.veh.cond==='Paul ESSAI'&&out.valide===ETHAN.email
  &&/Remis à Paul ESSAI le .* — remise complète \(validée par Ethan LE BIHAN\)/.test(out.fiche.card)&&out.fiche.rows.length===7&&out.fiche.rows.some(t=>/Changement de conducteur · Karim TESTEUR → Paul ESSAI/.test(t))&&out.fiche.rows.some(t=>/Laissé à Dépôt/.test(t))&&out.fiche.rows.some(t=>/Restitution de mémoire · Karim TESTEUR/.test(t))&&!out.todoApres.some(t=>/TE-456-ST/.test(t));
// ── 13) remise AVEC responsable inchangée : TE-123-ST → Karim, « Le responsable et moi », les deux signatures, complète d'emblée
await fiche(V1);await click(vx('recep|'+V1),400);out={t0:await title()};await click(vx('qui|avec'),200);await next();
out.t1=await title();await fill('#eq-app [data-xin="veh|q"]','Karim');await click(`#eq-app [data-act=x][data-v="veh|cond|${KARIM.email}"]`);await next();
out.t2=await title();await click(vx('permis|'));await fill('#eq-app [data-xin="veh|permisFin"]','2031-05-01');await next();await fill('#veh-km','12050');await allOk();await next();await allOk();await next();for(const k of ['avant','arriere','gauche','droit'])await photo(k);await next();await next();await fill('#eq-app [data-xin="veh|carteNum~carteVehicule"]','TEST-CV-0001');await click(vx('consignes|'));await next();
out.t8=await title();out.deja=await page.evaluate(()=>/a déjà signé/.test(document.getElementById('eq-app').textContent));await next();out.t9=await title();out.padR=!!(await page.$('#veh-pad-r'));out.btn=await page.evaluate(()=>document.getElementById('veh-next').textContent);
await draw('veh-pad-c');await draw('veh-pad-r');await next();await wait(300);await flushed();out.done=await app();
const r1=lastRec(V1,'reception');const vv1=veh(V1);out.rec=r1&&{seul:!!r1.data.sansResponsable,aValider:r1.data.aValider||null,complete:r1.data.complete,sigR:/^data:image/.test(r1.data.sigResponsable||''),resp:r1.data.responsableNom,cond:r1.data.conducteurKey};out.veh={key:vv1.conducteurKey,av:vv1.remise&&vv1.remise.aValider};
await click('#eq-app [data-act=xsub]',400);out.fiche=await page.evaluate(()=>{const c=document.querySelector('#eq-app .veh-card');return c?c.textContent.replace(/\s+/g,' '):'';});await shot('ethan_fiche_remise_avec');
console.log('13) remise avec responsable (inchangée) :',JSON.stringify(out));
C.c13=out.t0==='1/10 · Qui est là ?'&&out.t1==='2/10 · Conducteur'&&out.t2==='3/10 · Permis de conduire'&&out.t8==='9/10 · Charte véhicule'&&out.deja&&out.t9==='10/10 · Récapitulatif et signatures'&&out.padR&&out.btn==='✓ Enregistrer la remise'&&/est remis à Karim TESTEUR/.test(out.done)
  &&out.rec&&out.rec.seul===false&&out.rec.aValider===null&&out.rec.complete===true&&out.rec.sigR&&out.rec.resp==='Ethan LE BIHAN'&&out.rec.cond===KARIM.email&&out.veh.key===KARIM.email&&!out.veh.av&&/Remis à Karim TESTEUR le .* — remise complète\./.test(out.fiche);
// ── 14) Ethan note depuis la fiche que TE-123-ST a été laissé sur place (pas de validation à part, pas de signature exigée)
await fiche(V1);await click(vx('lacheDe|'+V1),500);out={t0:await title()};await click(vx('ou|autre'),200);await fill('#eq-app [data-xin="veh|ouTxt"]','parking de la gare (test)');await next();await fill('#veh-km','12080');await click(vx('carb|Plein'),200);await next();
for(const k of ['avant','arriere','gauche','droit'])await photo(k);await next();out.t3=await title();out.btn=await page.evaluate(()=>document.getElementById('veh-next').textContent);out.valBloc=await page.evaluate(()=>/rien à valider à part/.test(document.getElementById('eq-app').textContent));await next();await wait(300);await flushed();out.done=await app();
const rld=lastRec(V1,'restitution');const vld=veh(V1);out.rec=rld&&{lache:rld.data.lache&&rld.data.lache.ou,valide:rld.data.valide&&rld.data.valide.par,aValider:rld.data.aValider||null,sigC:rld.data.sigConducteur||null,cond:rld.data.conducteurNom};out.veh={cond:vld.conducteur||null,laisse:vld.laisse&&vld.laisse.ou};
console.log('14) laissé noté par le responsable :',JSON.stringify(out));
C.c14=out.t0==='1/4 · Où est le véhicule ?'&&out.t3==='4/4 · Récapitulatif et signatures'&&/Noter le véhicule laissé/.test(out.btn)&&out.valBloc&&/noté par Ethan LE BIHAN/.test(out.done)&&out.rec&&out.rec.lache==='parking de la gare (test)'&&out.rec.valide===ETHAN.email&&out.rec.aValider===null&&out.rec.sigC===null&&out.rec.cond==='Karim TESTEUR'&&out.veh.cond===null&&out.veh.laisse==='parking de la gare (test)';
await wait(800);await ctx.close();
// ── 15) Luc (chef sans droit Flotte) : « À savoir » → déclarer un changement de conducteur depuis Moi (choix du véhicule), puis annuler la déclaration
await login(LUC);out={kt:await page.evaluate(()=>[...document.querySelectorAll('#eq-app .ac-kt')].map(x=>x.textContent.replace(/\s+/g,' ').trim()))};
await page.evaluate(()=>{const k=[...document.querySelectorAll('#eq-app .ac-kt')].find(x=>/changement de conducteur/.test(x.textContent));k.click();});await wait(500);out.subs=await subs();out.t=await title();await shot('luc_switch_choix');
await fill('#eq-app [data-xin="veh|swveh"]','456');await click(vx('swsel|'+V2),400);out.t2=await title();await fill('#eq-app [data-xin="veh|swq"]','karim');await click(`#eq-app [data-act=x][data-v="veh|swpick|${KARIM.email}"]`,300);await click(vx('swok|'+V2),600);await flushed();
const vsw=veh(V2);out.veh={cond:vsw.conducteur,sw:vsw.switch&&[vsw.switch.ancien.nom,vsw.switch.nouveau.nom,vsw.switch.declarePar]};out.suivi=await app();await ovf('switch Luc');
await click(vx('swundo|'+V2),600);await flushed();const vsu=veh(V2);out.apres={cond:vsu.conducteur,key:vsu.conducteurKey,sw:vsu.switch||null};out.subsApres=await subs();
console.log('15) changement déclaré depuis Moi par un chef, puis annulé :',JSON.stringify(out));
C.c15=out.kt.some(t=>/déclarer un changement de conducteur/.test(t))&&out.subs.some(t=>/Changement de conducteur/.test(t))&&/Quel véhicule/.test(out.t)&&/Changement de conducteur/.test(out.t2)&&out.veh.cond==='Karim TESTEUR'&&out.veh.sw&&out.veh.sw.join('|')==='Paul ESSAI|Karim TESTEUR|Luc TESTCHEF'&&/2 formulaires attendus/.test(out.suivi)&&out.apres.cond==='Paul ESSAI'&&out.apres.key===PAUL.email&&out.apres.sw===null&&!out.subsApres.some(t=>/Changement de conducteur/.test(t));
await wait(800);await ctx.close();
console.log('débordements :',OVF.length?OVF:'aucun');C.ovf=!OVF.length;C.console=!logs.length;
const bad=Object.entries(C).filter(([k,v])=>!v).map(([k])=>k);console.log(bad.length?'RESULTAT: ECHEC '+bad.join(','):'RESULTAT: TOUT VERT');console.log(logs.length?logs:'[]');
await browser.close();
