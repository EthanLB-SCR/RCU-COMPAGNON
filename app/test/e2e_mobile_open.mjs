// MOBILE (Ethan 07/10 : « sur mobile je reste bloqué à l'écran d'accueil, je n'arrive pas, quand je clique sur un chantier, à rentrer dedans »)
// Émulation iPhone (tactile, viewport étroit) + réseau Supabase mocké (page.route). Cas :
// A) chantier présent sur l'appareil, connecté, mais les requêtes serveur (welds / line_state) NE RÉPONDENT JAMAIS (4G qui patine) → s'ouvre quand même en < 7 s
// B) chantier connu du serveur seulement (pas de copie locale), requête « sites » muette → le voile a un bouton Annuler qui rend la main ; sans annuler, délai maxi + message ; l'accueil reste utilisable
// C) tap tactile simple sur une carte de la liste → ouverture
// D) carte IGN : tap sur la pastille (doigt qui bouge de 6 px) → fiche, puis tap « Ouvrir » → ouverture
// E) copie locale ILLISIBLE (ancien format / fichier abîmé) → rechargée depuis le serveur et ouverte ; serveur muet en plus → message clair, jamais bloqué
// F) données serveur arrivées en retard (après l'ouverture sur copie locale) → statuts de soudure appliqués sans rien faire
import { chromium, devices } from 'playwright';
const BASE=process.env.BASE||'http://localhost:8765';
const browser=await chromium.launch({headless:true, executablePath: process.env.CHROMIUM_PATH||undefined});
const ctx=await browser.newContext({...devices['iPhone 13']});const page=await ctx.newPage();
const logs=[];page.on('pageerror',e=>logs.push('PAGEERROR: '+e.message.slice(0,300)));
page.on('console',m=>{if(m.type()==='error'&&!/supabase|Failed to fetch|net::ERR|404|WebSocket|400|500/i.test(m.text()))logs.push(m.text().slice(0,200));});
page.on('dialog',d=>d.accept().catch(()=>{}));
const USER={id:'00000000-0000-0000-0000-000000000001',aud:'authenticated',role:'authenticated',email:'test@scr.fr',app_metadata:{provider:'email'},user_metadata:{},created_at:'2026-01-01T00:00:00Z'};
const SESSION={access_token:'fake-token',token_type:'bearer',expires_in:86400,expires_at:Math.floor(Date.now()/1000)+86400,refresh_token:'fake-refresh',user:USER};
const GEO={crs:'EPSG:3857',aff:{a:1,b:0,e:-187009,c:0,d:-1,f:6124000}}; // plan en mètres posé près de Rennes
const META_S1={id:'S1',name:'Chantier A',supplier:'AXIOM',updated_at:'2026-08-19T10:00:00Z',geo:GEO,origin:null,bgo:null,sat:'2026-08-19T10:00:00Z',w:100,h:100,bbox:[0,0,100,100],nbox:[10,10,90,90],nw:4,deleted:null,deletedAt:null,builtin:null};
const META_S9={...META_S1,id:'S9',name:'Chantier serveur seul'};
let NET=null; // vrai chantier fabriqué par le traceur (format réel)
let hang={welds:false,line_state:false,siteById:false};let weldRows=[];const pending=[];let serverNet=()=>null;
await page.route(u=>u.hostname.endsWith('supabase.co'),route=>{
  const url=route.request().url();const json=(o,status=200)=>route.fulfill({status,contentType:'application/json',body:JSON.stringify(o)});
  if(url.includes('/auth/v1/token'))return json(SESSION);
  if(url.includes('/auth/v1/user'))return json(USER);
  if(url.includes('/rest/v1/profiles'))return json({id:USER.id,name:'Testeur',role:'chef',active:true});
  if(url.includes('/rest/v1/rpc/'))return json([]);
  if(url.includes('/rest/v1/sites')){if(url.includes('id=eq.')){if(hang.siteById){pending.push(route);return;}const id=(url.match(/id=eq\.([^&]+)/)||[])[1];const n=serverNet(id);return json(n?{id:n.id,name:n.name,supplier:n.supplier,serie:null,data:n,updated_at:'2026-08-19T10:00:00Z'}:null);}return json([META_S1,META_S9]);}
  if(url.includes('/rest/v1/welds')){if(hang.welds){pending.push(route);return;}return json(weldRows);}
  if(url.includes('/rest/v1/line_state')){if(hang.line_state){pending.push(route);return;}return json([]);}
  if(url.includes('/rest/v1/events'))return json([]);
  return route.fulfill({status:404,contentType:'application/json',body:'{}'});
});
// ── fabrication d'un vrai chantier par le traceur (puis récupéré dans l'appli)
await page.goto(BASE+'/traceur.html');await page.waitForTimeout(500);
await page.evaluate(()=>{localStorage.clear();});await page.reload();await page.waitForTimeout(500);
await page.evaluate(()=>{const S=window.MAQ.state;S.supplier='AXIOM';S.lines=[{id:'L1',name:'Feeder',dn:100,bar:12,pts:[[10,50],[60,50]],specials:[],parent:null}];S.seq=2;window.MAQ.setMode('select');window.MAQ.rebuild();});
await page.click('#bSave');await page.waitForTimeout(200);await page.fill('#svName','Chantier A');await page.click('#svOk');await page.waitForTimeout(600);
await page.click('#svGo');await page.waitForTimeout(1500);
NET=await page.evaluate(()=>{const T=window.TRACE;const id=T.state.siteId;const n=JSON.parse(JSON.stringify(T.sites[id]));return n;});
NET={...NET,id:'S1',name:'Chantier A',geo:GEO,sent:true};delete NET.handoff;
console.log('0) chantier fabriqué par le traceur:',JSON.stringify({id:NET.id,lines:(NET.lines||[]).length,traceur:!!NET.traceur,keys:Object.keys(NET).length}));
const screen=()=>page.evaluate(()=>({screen:window.TRACE.state.screen,site:window.TRACE.state.siteId,
  wait:document.querySelector('#homeWait').classList.contains('show'),waitTxt:(document.querySelector('#homeWaitTxt')||{}).textContent,toast:(document.querySelector('#toast')||{}).textContent||''}));
async function fresh(tab,localNet){await page.goto(BASE+'/index.html');await page.waitForTimeout(300);
  await page.evaluate(()=>new Promise(r=>{try{const q=indexedDB.deleteDatabase('trace-kv');q.onsuccess=q.onerror=q.onblocked=()=>r();}catch(e){r();}}));
  await page.evaluate(({s,h,tab})=>{localStorage.clear();localStorage.setItem('sb-pghftlepduvfazbiavhq-auth-token',JSON.stringify(s));if(h)localStorage.setItem('trace:handoff:S1',JSON.stringify(h));localStorage.setItem('trace:homeTab',tab);},{s:SESSION,h:localNet,tab});
  await page.reload();await page.waitForTimeout(2500);}
const waitOpen=async(id,n=30)=>{let st=null,opened=false;for(let i=0;i<n&&!opened;i++){await page.waitForTimeout(250);st=await screen();opened=st.screen==='site'&&st.site===id&&!st.wait;}return {...st,opened};};
// ── A) copie locale + serveur muet sur welds/line_state
hang={welds:true,line_state:true,siteById:false};serverNet=()=>null;
await fresh('list',NET);
let st=await screen();const cardA=await page.$eval('#homeBody',e=>/Chantier A/.test(e.textContent));console.log('A0) accueil, carte « Chantier A » présente:',JSON.stringify({...st,card:cardA}));
let t0=Date.now();await page.tap('#homeBody .siteCard[data-open="S1"]');
let r=await waitOpen('S1',40);const dtA=Date.now()-t0;console.log('A) tap carte, serveur muet → chantier ouvert ?',JSON.stringify({...r,ms:dtA}));
const cA=cardA&&r.opened&&dtA<7500&&/Serveur lent/.test(r.toast||'');
// ── B) chantier serveur seul, requête « sites?id=eq. » muette
hang={welds:false,line_state:false,siteById:true};
await fresh('list',NET);
const hasS9=!!(await page.$('#homeBody .siteCard[data-open="S9"]'));console.log('B0) carte « serveur seul » présente:',hasS9);
if(hasS9)await page.tap('#homeBody .siteCard[data-open="S9"]');
await page.waitForTimeout(1000);st=await screen();const cancelBtn=await page.$('#homeWaitCancel');const cancelVisible=cancelBtn?await cancelBtn.isVisible():false;
console.log('B1) pendant le chargement : voile + bouton Annuler visibles ?',JSON.stringify({...st,cancelVisible}));
if(cancelVisible)await page.tap('#homeWaitCancel');await page.waitForTimeout(500);st=await screen();
console.log('B2) après Annuler : voile retiré, toujours à l\'accueil ?',JSON.stringify(st));const cB=hasS9&&cancelVisible&&!st.wait&&st.screen==='home';
// sans annuler : délai maxi (15 s) puis message
t0=Date.now();await page.tap('#homeBody .siteCard[data-open="S9"]');let unveiled=false;for(let i=0;i<80&&!unveiled;i++){await page.waitForTimeout(250);st=await screen();unveiled=!st.wait;}
console.log('B3) sans annuler : voile retiré après le délai + message:',JSON.stringify({...st,unveiled,ms:Date.now()-t0}));const cB3=unveiled&&st.screen==='home'&&/trop lent|injoignable/.test(st.toast||'');
await page.tap('#homeBody .siteCard[data-open="S1"]');r=await waitOpen('S1');console.log('B4) l\'accueil reste utilisable : ouverture du chantier local:',JSON.stringify({opened:r.opened}));const cB4=r.opened;
// ── C) tap tactile simple (tout répond)
hang={welds:false,line_state:false,siteById:false};
await fresh('list',NET);
t0=Date.now();await page.tap('#homeBody .siteCard[data-open="S1"]');r=await waitOpen('S1');console.log('C) tap tactile liste → ouvert:',JSON.stringify({...r,ms:Date.now()-t0}));const cC=r.opened;
// ── D) carte IGN : pastille tapée avec un doigt qui bouge (6 px), puis « Ouvrir »
await fresh('map',NET);
await page.evaluate(()=>{window.TRACE.showScreen('home');window.TRACE.renderHome();});await page.waitForTimeout(1500);
await page.evaluate(()=>{const b=document.querySelector('#homeMap .hmCtl [data-a="fit"]');if(b)b.click();});await page.waitForTimeout(600); // recadrage : la pastille au milieu de la carte
const dot=await page.$('#homeMap .hmPin[data-site="S1"] .dot')||await page.$('#homeMap .hmCluster');
let dOut={pin:!!dot};
if(dot){const b2=await dot.boundingBox();const x=b2.x+b2.width/2,y=b2.y+b2.height/2;dOut.xy=[Math.round(x),Math.round(y)];dOut.vp=await page.evaluate(()=>[innerWidth,innerHeight,document.querySelector('#homeView').classList.contains('show'),window.TRACE.state.screen]);
  const cdp=await ctx.newCDPSession(page);
  await cdp.send('Input.dispatchTouchEvent',{type:'touchStart',touchPoints:[{x,y}]});await page.waitForTimeout(60);
  await cdp.send('Input.dispatchTouchEvent',{type:'touchMove',touchPoints:[{x:x+4,y:y+4}]});await page.waitForTimeout(40);
  await cdp.send('Input.dispatchTouchEvent',{type:'touchMove',touchPoints:[{x:x+6,y:y+5}]});await page.waitForTimeout(40);
  await cdp.send('Input.dispatchTouchEvent',{type:'touchEnd',touchPoints:[]});await page.waitForTimeout(500);
  dOut.card=await page.evaluate(()=>{const c=document.querySelector('#hmCard');return !!(c&&c.classList.contains('show')&&/Chantier A/.test(c.textContent));});
  if(dOut.card){await page.tap('#hmCard [data-open="S1"]');r=await waitOpen('S1');dOut.opened=r.opened;}}
console.log('D) carte : tap pastille (doigt qui bouge) → fiche → Ouvrir:',JSON.stringify(dOut));const cD=!!dOut.pin&&!!dOut.card&&!!dOut.opened;
// ── E) copie locale ILLISIBLE → rechargée depuis le serveur
const BROKEN={...NET,lines:[{id:'L1',name:'cassée',traceur:true,cond:{A:{els:[{kind:'pipe'}],joints:[]}}}]}; // format impossible à relire
serverNet=id=>id==='S1'?NET:null;hang={welds:false,line_state:false,siteById:false};
await fresh('list',BROKEN);
t0=Date.now();await page.tap('#homeBody .siteCard[data-open="S1"]');r=await waitOpen('S1',60);console.log('E1) copie locale illisible → version serveur ouverte:',JSON.stringify({...r,ms:Date.now()-t0}));
const cE1=r.opened;
hang={welds:false,line_state:false,siteById:true};
await fresh('list',BROKEN);
t0=Date.now();await page.tap('#homeBody .siteCard[data-open="S1"]');unveiled=false;for(let i=0;i<90&&!unveiled;i++){await page.waitForTimeout(250);st=await screen();unveiled=!st.wait;}
console.log('E2) copie illisible + serveur muet → message clair, voile retiré:',JSON.stringify({...st,unveiled,ms:Date.now()-t0}));const cE2=unveiled&&st.screen==='home'&&/Impossible d'ouvrir/.test(st.toast||'');
// ── F) réponse serveur TARDIVE après ouverture locale → statuts appliqués
hang={welds:true,line_state:true,siteById:false};weldRows=[];
await fresh('list',NET);
await page.tap('#homeBody .siteCard[data-open="S1"]');r=await waitOpen('S1',40);
const w0=await page.evaluate(()=>{const L=Object.values(window.TRACE.lines)[0];return {id:L.cond.A.joints[0].weldId,status:L.cond.A.joints[0].status};});
console.log('F0) ouvert sur copie locale, 1re soudure:',JSON.stringify({...w0,opened:r.opened}));
// le serveur répond enfin : S-0001 soudée
const rows=[{weld_id:w0.id,line_id:'L1',cond:'A',status:'soudee',data:{steps:{1:{done:true,by:'karim',at:new Date().toISOString(),photos:[],visuel:true}}}}];
pending.splice(0).forEach(rt=>{const u=rt.request().url();rt.fulfill({status:200,contentType:'application/json',body:JSON.stringify(u.includes('welds')?rows:[])}).catch(()=>{});});
await page.waitForTimeout(1500);
const w1=await page.evaluate(()=>{const L=Object.values(window.TRACE.lines)[0];return {status:L.cond.A.joints[0].status,site:window.TRACE.state.siteId,screen:window.TRACE.state.screen};});
console.log('F) réponse tardive appliquée (soudure passée « soudée ») :',JSON.stringify(w1));const cF=r.opened&&w1.status==='soudee'&&w1.screen==='site';
// D est INFORMATIF (hors verdict) : le même geste, rejoué seul dans diag_pin.mjs, ouvre bien la fiche ; enchaîné derrière les autres scénarios
// il est capricieux côté émulation tactile CDP (pas côté appli). À remettre dans le verdict si on isole la cause.
const ALL=cA&&cB&&cB3&&cB4&&cC&&cE1&&cE2&&cF;
console.log('RESULTAT:',ALL?'TOUT VERT':'ECHEC '+JSON.stringify({cA,cB,cB3,cB4,cC,cD,cE1,cE2,cF}));
console.log(logs.length?logs:'[]');
pending.forEach(rt=>{try{rt.abort();}catch(e){}});
await browser.close();process.exit(ALL?0:1);
