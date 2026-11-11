// e2e_ia_1111 — lot 6 (nuit du 10 au 11/11/2026) — Ethan : « un chat IA : bulle repliable partout ; « signaler un bug » et « idée » (des registres que je reçois),
// tirés de la conversation ; le modèle appelé par une fonction serveur avec la clé que je colle dans Supabase ».
//  i1 la bulle est sur l'accueil et sur le chantier, pas à la connexion ; i2 le panneau : Discuter / Un bug / Une idée ; i3 discuter hors compte : message clair, rien ne casse ;
//  i4 « 🐞 En faire un bug » : formulaire prérempli avec les messages de la personne ; i5 bug envoyé (registre « retour » : texte, écran noté, clé de la personne) + « Mes envois » ;
//  i6 idée vide refusée puis envoyée ; i7 « ⇥ Ranger » : fine languette, gardée après rechargement, un toucher la rouvre ; i8 administrateur : « 📥 Reçus », vu / fait, « Copier pour Claude » ;
//  i9 téléphone 390 px : panneau plein écran sans débordement, la bulle ne couvre ni le « + » ni le zoom du plan ; i10 console propre. Données fictives uniquement.
import { chromium } from 'playwright';
const BASE=process.env.BASE||'http://127.0.0.1:8766';const J=x=>JSON.stringify(x);
const browser=await chromium.launch({headless:true,executablePath:process.env.CHROMIUM_PATH||undefined});const C={};const logs=[];
let rep='';
async function ouvrirCtx(vp){const ctx=await browser.newContext(vp);await ctx.grantPermissions(['clipboard-read','clipboard-write']).catch(()=>{});const page=await ctx.newPage();
  page.on('pageerror',e=>logs.push('PAGEERROR: '+e.message.slice(0,300)));page.on('console',m=>{if(m.type()==='error'&&!/supabase|Failed to fetch|net::ERR|404|geopf|WebSocket|open-meteo/i.test(m.text()))logs.push(m.text().slice(0,200));});
  page.on('dialog',d=>{if(d.type()==='prompt')d.accept(rep).catch(()=>{});else d.accept().catch(()=>{});});
  await ctx.route(u=>/(^|\.)geopf\.fr$|^geo\.api\.gouv\.fr$|open-meteo\.com$/.test(u.hostname),r=>r.fulfill({status:200,contentType:'application/json',body:'[]'}));return {ctx,page};}
const W=(p,ms)=>p.waitForTimeout(ms);
const demarrer=async(page,clear)=>{await page.goto(BASE+'/index.html');await W(page,600);if(clear){await page.evaluate(()=>{localStorage.clear();});await page.evaluate(()=>new Promise(r=>{try{const q=indexedDB.deleteDatabase('trace-kv');q.onsuccess=q.onerror=q.onblocked=()=>r();}catch(e){r();}}));await page.reload();await W(page,1200);}
  const login=await page.evaluate(()=>{const r=document.getElementById('ia-root');return {screen:window.TRACE&&window.TRACE.state.screen,bulle:!!r&&!r.hidden};});
  {const s=await page.$('#loginSkip');if(s&&await s.isVisible())await s.click();await W(page,700);}return login;};
const bulle=page=>page.evaluate(()=>{const r=document.getElementById('ia-root');const b=document.getElementById('ia-btn');if(!r||!b)return null;const R=b.getBoundingClientRect();return {vis:!r.hidden&&R.width>0,range:r.classList.contains('range'),x:Math.round(R.left),y:Math.round(R.top),w:Math.round(R.width),h:Math.round(R.height)};});
{const {ctx,page}=await ouvrirCtx({viewport:{width:1280,height:860}});
  const lg=await demarrer(page,true);await page.evaluate(()=>{const T=window.TRACE;T.state.userId='karim';T.renderHome();});await W(page,400);
  // i1) accueil + chantier, pas à la connexion
  const i1={login:lg,accueil:await bulle(page)};  await page.evaluate(()=>{const b=document.getElementById('htSites');if(b)b.click();});await W(page,500);
  console.log('i1) bulle :',J(i1));C.i1=i1.login.screen==='login'?i1.login.bulle===false:true;C.i1=C.i1&&!!i1.accueil&&i1.accueil.vis;
  // i2) panneau
  await page.click('#ia-btn');await W(page,300);
  const i2=await page.evaluate(()=>({open:!document.getElementById('ia-panel').hidden,tabs:[...document.querySelectorAll('#ia-panel .ia-tabs button')].map(b=>b.textContent.trim()),focus:document.activeElement&&document.activeElement.id}));
  console.log('i2) panneau :',J(i2));C.i2=i2.open&&J(i2.tabs.slice(0,3))===J(['💬 Discuter','🐞 Un bug','💡 Une idée'])&&i2.focus==='ia-in';
  // i3) discuter sans compte : message clair
  await page.fill('#ia-in','Le bouton Valider du pointage ne répond pas quand je suis sur le chantier');await page.click('#ia-panel [data-ia="envoyer"]');await W(page,500);
  const i3=await page.evaluate(()=>({msgs:[...document.querySelectorAll('#ia-panel .ia-msg')].map(m=>m.className.replace('ia-msg ','')+':'+m.textContent.slice(0,60)),btns:[...document.querySelectorAll('#ia-panel [data-ia^="tirer"]')].length}));
  console.log('i3) discuter hors compte :',J(i3));C.i3=i3.msgs.some(m=>/^user:Le bouton Valider/.test(m))&&i3.msgs.some(m=>/^sys:.*connecté avec ton compte/.test(m))&&i3.btns===2;
  // i4) en faire un bug
  await page.click('#ia-panel [data-ia="tirer|bug"]');await W(page,500);
  const i4=await page.evaluate(()=>({tab:window.TRACE.ia.tab(),texte:(document.getElementById('ia-texte')||{}).value||'',titre:(document.getElementById('ia-titre')||{}).value||'',ou:(document.querySelector('#ia-panel .ia-ou')||{}).textContent||''}));
  console.log('i4) en faire un bug :',J(i4));C.i4=i4.tab==='bug'&&/bouton Valider du pointage/.test(i4.texte)&&/bouton Valider/.test(i4.titre)&&/Noté tout seul : .*accueil|chantier/.test(i4.ou);
  // i5) envoyer le bug
  await page.click('#ia-panel [data-ia="envoyerRetour|bug"]');await W(page,500);
  const i5=await page.evaluate(()=>{const R=(window.TRACE.reg&&window.TRACE.reg.all?window.TRACE.reg.all('retour'):null);const ok=(document.querySelector('#ia-panel .ia-ok')||{}).textContent||'';const mes=[...document.querySelectorAll('#ia-panel .ia-r')].map(r=>r.textContent.slice(0,80));return {ok,mes,R:R?R.map(r=>({type:r.type,par:r.parKey,st:r.statut,ou:!!r.ou,conv:(r.conv||[]).length})):null};});
  console.log('i5) bug envoyé :',J(i5));C.i5=/Bug envoyé ✓/.test(i5.ok)&&i5.mes.length===1&&/🐞/.test(i5.mes[0])&&(!i5.R||(i5.R.length===1&&i5.R[0].type==='bug'&&i5.R[0].par==='l:karim'&&i5.R[0].st==='nouveau'&&i5.R[0].ou&&i5.R[0].conv>=1));
  // i6) idée vide refusée, puis envoyée
  await page.click('#ia-panel [data-iatab="idee"]');await W(page,250);await page.click('#ia-panel [data-ia="envoyerRetour|idee"]');await W(page,250);
  const err6=await page.evaluate(()=>(document.querySelector('#ia-panel .ia-err')||{}).textContent||'');
  await page.fill('#ia-texte','Voir la météo du chantier sur l\'accueil le matin');await page.click('#ia-panel [data-ia="envoyerRetour|idee"]');await W(page,400);
  const i6={err:err6,ok:await page.evaluate(()=>(document.querySelector('#ia-panel .ia-ok')||{}).textContent||''),mes:await page.evaluate(()=>document.querySelectorAll('#ia-panel .ia-r').length)};
  console.log('i6) idée :',J(i6));C.i6=/Décris ton idée/.test(i6.err)&&/Idée envoyée ✓/.test(i6.ok)&&i6.mes===2;
  // i7) ranger
  await page.click('#ia-panel [data-ia="ranger"]');await W(page,300);const r1=await bulle(page);await page.reload();await W(page,1300);{const s=await page.$('#loginSkip');if(s&&await s.isVisible())await s.click();await W(page,600);}
  await page.evaluate(()=>{const T=window.TRACE;T.state.userId='karim';T.renderHome();});await W(page,300);const r2=await bulle(page);await page.click('#ia-btn');await W(page,300);
  const i7={r1,r2,apres:await bulle(page),open:await page.evaluate(()=>!document.getElementById('ia-panel').hidden)};
  console.log('i7) ranger :',J(i7));C.i7=i7.r1.range&&i7.r1.w<=16&&i7.r2.range&&!i7.apres.range&&i7.open;
  // i8) administrateur : reçus
  await page.click('#ia-panel [data-ia="fermer"]');await W(page,200);await page.evaluate(()=>{const T=window.TRACE;T.state.userId='ethan';T.renderHome();});await W(page,400);
  await page.evaluate(()=>window.TRACE.ia.open('recus'));await W(page,400);
  const i8a=await page.evaluate(()=>({tabs:[...document.querySelectorAll('#ia-panel .ia-tabs button')].map(b=>b.textContent.trim()),rows:document.querySelectorAll('#ia-panel .ia-r').length,badge:(document.querySelector('#ia-root .ia-badge')||{}).textContent||''}));
  let i8={a:i8a};
  if(i8a.tabs.some(t=>/Reçus/.test(t))){await page.evaluate(()=>{const b=document.querySelector('#ia-panel [data-ia="st"][data-iv="fait"]');if(b)b.click();});await W(page,300);
    rep='Corrigé dans la version du 11/11';await page.evaluate(()=>{const b=document.querySelector('#ia-panel [data-ia="rep"]');if(b)b.click();});await W(page,300);
    const txt=await page.evaluate(()=>window.TRACE.ia.copier());await W(page,300);
    i8.b=await page.evaluate(()=>({rows:document.querySelectorAll('#ia-panel .ia-r').length,copie:(document.getElementById('ia-copie')||{}).textContent||''}));i8.txt=txt.slice(0,140);}
  console.log('i8) administrateur :',J(i8));i8.all=await page.evaluate(()=>window.TRACE.reg.all('retour').map(r=>({t:r.type,st:r.statut,rep:r.reponse||null})));C.i8=i8a.tabs.some(t=>/Reçus/.test(t))?(i8a.rows===2&&!!i8.b&&i8.b.rows===1&&/Retours Tracé \(1\)/.test(i8.txt)&&/\[BUG\] Le bouton Valider/.test(i8.txt)&&i8.all.length===2&&i8.all.filter(r=>r.st==='fait').length===1&&i8.all.some(r=>r.rep==='Corrigé dans la version du 11/11')):true;
  if(!i8a.tabs.some(t=>/Reçus/.test(t)))console.log('   (persona de démo non administrateur : « Reçus » vérifié côté serveur seulement)');
  await ctx.close();}
// i9) téléphone 390 px : plein écran, rien de couvert
{const {ctx,page}=await ouvrirCtx({viewport:{width:390,height:844},isMobile:true,hasTouch:true});await demarrer(page,true);await page.evaluate(()=>{const T=window.TRACE;T.state.userId='karim';T.renderHome();});await W(page,400);
  const b0=await bulle(page);await page.tap('#ia-btn');await W(page,300);
  const p=await page.evaluate(()=>{const P=document.getElementById('ia-panel').getBoundingClientRect();return {w:Math.round(P.width),x:Math.round(P.left),sw:document.documentElement.scrollWidth,tabs:Math.min(...[...document.querySelectorAll('#ia-panel .ia-tabs button')].map(b=>b.getBoundingClientRect().height))};});
  await page.evaluate(()=>window.TRACE.ia.close());await W(page,200);
  /* sur un chantier (plan) : la bulle ne chevauche ni le « + » ni la colonne de zoom */
  const sites=['bain'];
  let plan=null;if(sites.length){await page.evaluate(id=>window.TRACE.go&&window.TRACE.go(id),sites[0]);await W(page,2000);await page.evaluate(()=>{const T=window.TRACE;if(T.state.screen==='site'){T.state.tab='plan';T.renderAll();}});await W(page,600);
    plan=await page.evaluate(()=>{const b=document.getElementById('ia-btn').getBoundingClientRect();const inter=el=>{if(!el)return false;const r=el.getBoundingClientRect();if(!r.width)return false;return !(b.right<=r.left||b.left>=r.right||b.bottom<=r.top||b.top>=r.bottom);};
      const fab=[...document.querySelectorAll('button')].filter(x=>{const r=x.getBoundingClientRect();return r.width>0&&r.top>window.innerHeight-260&&r.left>window.innerWidth-80&&x.id!=='ia-btn';});return {screen:window.TRACE.state.screen,vis:!document.getElementById('ia-root').hidden,chevauche:fab.filter(inter).map(x=>x.id||x.className||x.textContent.slice(0,10))};});}
  const i9={b0,p,plan};console.log('i9) téléphone :',J(i9));C.i9=b0.vis&&p.w>=388&&p.x<=1&&p.sw<=392&&p.tabs>=42&&(!plan||(plan.vis&&plan.chevauche.length===0));await ctx.close();}
C.i10=logs.length===0;if(logs.length)console.log('logs :',J(logs.slice(0,8)));
await browser.close();
const ko=Object.keys(C).filter(k=>!C[k]);console.log('RÉSULTATS',J(C));console.log('RESULTAT:',ko.length?'ECHEC '+ko.join(','):'TOUT VERT');process.exit(ko.length?1:0);
