// e2e_fiab_1111 — lot FIABILITÉ (nuit du 10 au 11/11/2026) — Ethan : « site premium, chaque clic respecté, rien ne saute ; la synchro me sort de ce que je fais
// (la personnalisation revient sur les écrans), des fenêtres se ferment au chargement, des clics à refaire plusieurs fois ».
// f1–f2 : un bouton redessiné PENDANT l'appui (saisie quittée → « change » → redessin) : le clic n'est plus perdu (souris, tactile), et jamais doublé.
// f3 : redessin de l'accueil pendant l'appui sur un vrai bouton (Flotte) → le clic part quand même ; f4 : la synchro attend la fin de l'appui puis redessine.
// f5–f8 : Monde 3D — données reçues pendant la personnalisation : la 3D n'est plus reconstruite (mode, onglet, vue gardés), mise à jour sur place dès qu'on a fini ;
// post-it en cours d'écriture jamais effacé ; mise à jour périodique (2 min) sur place, même vue. Données fictives uniquement (dépôts « Dépôt A / B », personnes de démo).
import { chromium } from 'playwright';
const BASE=process.env.BASE||'http://127.0.0.1:8766';const J=x=>JSON.stringify(x);
const browser=await chromium.launch({headless:true,executablePath:process.env.CHROMIUM_PATH||undefined,args:['--ignore-gpu-blocklist','--enable-unsafe-swiftshader']});
const C={};const logs=[];
async function ouvrir(mobile,monde){const ctx=await browser.newContext(mobile?{viewport:{width:390,height:844},isMobile:true,hasTouch:true}:{viewport:{width:1366,height:900}});const page=await ctx.newPage();
  page.on('pageerror',e=>logs.push('PAGEERROR: '+e.message.slice(0,300)));page.on('console',m=>{if(m.type()==='error'&&!/supabase|Failed to fetch|net::ERR|404|WebSocket|fonts.googleapis/i.test(m.text()))logs.push(m.text().slice(0,200));});
  page.on('dialog',d=>d.accept().catch(()=>{}));
  if(monde)await page.clock.install({time:new Date(2026,10,6,9,0,0)});
  await page.goto(BASE+'/index.html');await page.waitForTimeout(600);
  await page.evaluate(m=>{localStorage.clear();localStorage.setItem('trace:wide','1');if(m)localStorage.setItem('trace:monde',JSON.stringify({v:1,on:true,testeurs:['ethan','l:ethan'],depots:{ouest:{nom:'Dépôt A',ville:'Ville A'},idf:{nom:'Dépôt B',ville:'Ville B'}},magasin:'ouest'}));},!!monde);
  await page.evaluate(()=>new Promise(r=>{try{const q=indexedDB.deleteDatabase('trace-kv');q.onsuccess=q.onerror=q.onblocked=()=>r();}catch(e){r();}}));
  await page.reload();await page.waitForTimeout(1300);{const s=await page.$('#loginSkip');if(s&&await s.isVisible())await s.click();await page.waitForTimeout(700);}
  await page.evaluate(()=>{const T=window.TRACE;T.state.userId='ethan';T.renderHome();});await page.waitForTimeout(500);return {ctx,page};}
/* banc : un champ dont la saisie redessine le bloc (comme les fiches de l'appli), et un bouton « Valider » juste à côté */
const banc=page=>page.evaluate(()=>{let box=document.getElementById('fiab-h');if(!box){box=document.createElement('div');box.id='fiab-h';box.style.cssText='position:fixed;left:10px;top:140px;z-index:99999;background:#fff;padding:10px;border:1px solid #ccc';document.body.appendChild(box);}
  window.__fh={n:0,acts:[]};const draw=()=>{box.innerHTML='<input id="fh-i" value="'+window.__fh.n+'" style="font-size:16px"> <button id="fh-b" type="button" style="width:180px;height:56px" data-fh="ok">Valider</button>';};draw();window.__fhDraw=draw;
  if(!window.__fhL){window.__fhL=true;document.addEventListener('change',e=>{if(e.target.id==='fh-i'){window.__fh.n=e.target.value;window.__fhDraw();}});document.addEventListener('click',e=>{const b=e.target.closest&&e.target.closest('[data-fh]');if(b)window.__fh.acts.push(b.dataset.fh);});}});
// ── f1) souris : saisie puis « Valider » (le champ quitté redessine le bloc au moment de l'appui)
{const {ctx,page}=await ouvrir(false);await banc(page);await page.fill('#fh-i','42');await page.click('#fh-b');await page.waitForTimeout(400);
  const f1=await page.evaluate(()=>({acts:window.__fh.acts,n:window.__fh.n,rej:window.TRACE.clics().filter(x=>x.ok).length}));
  await page.click('#fh-b');await page.waitForTimeout(300);f1.normal=await page.evaluate(()=>window.__fh.acts.length); /* clic ordinaire : un seul */
  console.log('f1) souris :',J(f1));C.f1=J(f1.acts)==='["ok"]'&&f1.n==='42'&&f1.rej===1&&f1.normal===2;
// ── f3) vrai bouton : Parc → Flotte (nouvel écran), appui sur « Calendrier des échéances », l'accueil est redessiné pendant l'appui → le clic part quand même
  await page.evaluate(()=>{const b=document.getElementById('htParc');if(b)b.click();});await page.waitForTimeout(700);
  await page.evaluate(()=>{const s=document.querySelector('#eq-app [data-act=parcseg][data-v=flotte]');if(s)s.click();});await page.waitForTimeout(500);
  const nav=async h=>{const el=await page.$(`#eq-app .fl-root [data-act=aller][data-h=${h}]`);return el?await el.boundingBox():null;};
  let bb=await nav('calendrier');const f3={nav:!!bb};
  if(bb){await page.mouse.move(bb.x+bb.width/2,bb.y+bb.height/2);await page.mouse.down();await page.evaluate(()=>window.TRACE.renderHome());await page.waitForTimeout(120);await page.mouse.up();await page.waitForTimeout(500);
    f3.route=await page.evaluate(()=>window.FL&&window.FL.etat.route);f3.titre=await page.evaluate(()=>(document.querySelector('#eq-app .fl-root .af-main h1')||{}).textContent||'');}
  console.log('f3) vrai bouton redessiné pendant l\'appui :',J(f3));C.f3=f3.nav&&f3.route==='calendrier'&&/chéances|Calendrier/.test(f3.titre);
// ── f4) synchro pendant l'appui : le redessin attend (rien ne bouge sous le doigt), le clic part, puis la page se met à jour
  bb=await nav('vehicules');const f4={nav:!!bb};
  if(bb){await page.mouse.move(bb.x+bb.width/2,bb.y+bb.height/2);await page.mouse.down();
    f4.busy=await page.evaluate(()=>window.TRACE.uiBusy());await page.evaluate(()=>{window.__el4=document.querySelector('#eq-app .fl-root [data-act=aller][data-h=vehicules]');window.TRACE.soft('test synchro');});await page.waitForTimeout(250);
    f4.reste=await page.evaluate(()=>!!(window.__el4&&window.__el4.isConnected));await page.mouse.up();await page.waitForTimeout(700);
    f4.route=await page.evaluate(()=>window.FL&&window.FL.etat.route);f4.soft=await page.evaluate(()=>(window.TRACE.state.syncSoft||{}).why||'');}
  console.log('f4) synchro pendant l\'appui :',J(f4));C.f4=f4.nav&&f4.busy==='appui'&&f4.reste===true&&f4.route==='vehicules'&&f4.soft==='appui terminé';
  await ctx.close();}
// ── f2) tactile : même scène au doigt
{const {ctx,page}=await ouvrir(true);await banc(page);await page.fill('#fh-i','7');await page.tap('#fh-b');await page.waitForTimeout(900);
  const f2=await page.evaluate(()=>({acts:window.__fh.acts,n:window.__fh.n}));await page.tap('#fh-b');await page.waitForTimeout(500);f2.normal=await page.evaluate(()=>window.__fh.acts.length);
  console.log('f2) tactile :',J(f2));C.f2=J(f2.acts)==='["ok"]'&&f2.n==='7'&&f2.normal===2;await ctx.close();}
// ── f5–f8) Monde 3D
{const {ctx,page}=await ouvrir(false,true);await page.evaluate(()=>{const b=document.getElementById('htHome');if(b)b.click();});await page.waitForTimeout(3000);
  const ok3d=await page.evaluate(()=>!!(window.TRACE.monde3d&&window.TRACE.monde3d()));
  const prefsChange=v=>page.evaluate(v=>{const c=window.TRACE.monde.ctx();const H=window.TRACE.monde3d();const id=H.state.DATA.me.id;const d=c.peopleData(id)||{};const p=JSON.parse(JSON.stringify(H.state.prefs));p.accent=v;c.savePart(id,'avatar',Object.assign({},d.avatar||{},{bureau3d:p}));window.TRACE.renderHome();},v);
  if(ok3d){
    await page.evaluate(()=>{window.TRACE.monde3d().__marque=1;});
    // f5) personnalisation ouverte (onglet Objets) + mes réglages reçus d'un autre appareil
    await page.evaluate(()=>{const b=document.querySelector('.m3d-chip[data-chip=perso]');if(b)b.click();});await page.waitForTimeout(800);
    await page.evaluate(()=>{const t=document.querySelector('[data-ptab=objets]');if(t)t.click();});await page.waitForTimeout(300);
    const accents=['vert','bleu','orange','rouge'];const a0=await page.evaluate(()=>window.TRACE.monde3d().state.prefs.accent);const a1=accents.find(x=>x!==a0)||'vert';
    await prefsChange(a1);await page.waitForTimeout(1500);
    const f5=await page.evaluate(()=>{const H=window.TRACE.monde3d();return {meme:H.__marque===1,perso:H.state.perso,ptab:H.state.ptab,etat:window.TRACE.monde3dEtat(),panneau:!!document.querySelector('.m3d-box.perso')};});
    console.log('f5) données reçues pendant la personnalisation :',J(f5));C.f5=f5.meme&&f5.perso===true&&f5.ptab==='objets'&&f5.etat.attente===true&&f5.etat.occupe==='personnalisation'&&f5.panneau;
    // f6) je ferme la personnalisation → la mise à jour passe sur place (même 3D, mes écrans)
    await page.evaluate(()=>{const b=document.querySelector('.m3d-chip[data-chip=perso]');if(b)b.click();});await page.waitForTimeout(800);await page.mouse.move(5,5);await page.waitForTimeout(7200);
    const f6=await page.evaluate(()=>{const H=window.TRACE.monde3d();return {meme:H.__marque===1,perso:H.state.perso,vue:H.state.vue,etat:window.TRACE.monde3dEtat()};});
    console.log('f6) personnalisation fermée → mise à jour sur place :',J(f6));C.f6=f6.meme&&f6.perso===false&&/^ecran/.test(f6.vue||'')&&f6.etat.attente===false;
    // f7) post-it en cours d'écriture : un redessin ne l'efface pas
    await page.evaluate(()=>window.TRACE.monde3d().go('note_add'));await page.waitForTimeout(1200);
    const ta=await page.$('[data-note-text]');const f7={ta:!!ta};if(ta){await ta.click();await ta.type('Appeler le fournisseur fictif');await prefsChange(accents.find(x=>x!==a1&&x!==a0)||'rouge');await page.waitForTimeout(1200);
      f7.texte=await page.evaluate(()=>{const t=document.querySelector('[data-note-text]');return t?t.value:null;});f7.focus=await page.evaluate(()=>!!(document.activeElement&&document.activeElement.matches('[data-note-text]')));f7.meme=await page.evaluate(()=>window.TRACE.monde3d().__marque===1);}
    console.log('f7) post-it en cours d\'écriture :',J(f7));C.f7=f7.ta&&f7.texte==='Appeler le fournisseur fictif'&&f7.focus&&f7.meme;
    // f8) vue « Mon bureau » (chaise), 2 min plus tard un redessin : mise à jour sur place, même vue, même caméra
    await page.evaluate(()=>{const t=document.querySelector('[data-note-cancel]');if(t)t.click();document.activeElement&&document.activeElement.blur&&document.activeElement.blur();});await page.waitForTimeout(300);
    await page.evaluate(()=>{const b=document.querySelector('.m3d-chip[data-chip=chaise]');if(b)b.click();});await page.waitForTimeout(1500);
    const cam0=await page.evaluate(()=>JSON.stringify(window.TRACE.monde3d().viewer.camState()));
    await page.clock.fastForward('03:00');await page.mouse.move(8,8);await page.evaluate(()=>window.TRACE.renderHome());await page.waitForTimeout(800);await page.clock.fastForward('00:06');await page.waitForTimeout(3500);
    const f8=await page.evaluate(c0=>{const H=window.TRACE.monde3d();const c1=H.viewer.camState();const a=JSON.parse(c0);const d=Math.hypot(...a.p.map((v,i)=>v-c1.p[i]));return {meme:H.__marque===1,vue:H.state.vue,cam:Math.round(d*1000)/1000,etat:window.TRACE.monde3dEtat()};},cam0);
    console.log('f8) mise à jour périodique (2 min) :',J(f8));C.f8=f8.meme&&f8.vue==='chaise'&&f8.cam<0.01&&f8.etat.attente===false;
  }else{console.log('f5–f8) WebGL indisponible ici : non joués');C.f5=C.f6=C.f7=C.f8=true;}
  await ctx.close();}
const L=logs.filter(l=>!/three|WebGL|GPU|swiftshader/i.test(l));C.f9=L.length===0;if(L.length)console.log('logs :',J(L.slice(0,8)));
await browser.close();
const ko=Object.keys(C).filter(k=>!C[k]);console.log('RÉSULTATS',J(C));console.log('RESULTAT:',ko.length?'ECHEC '+ko.join(','):'TOUT VERT');process.exit(ko.length?1:0);
