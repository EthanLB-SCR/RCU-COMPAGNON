// e2e_ios_zoom_2611.mjs — 26/11/2026 : FICHE SOUDURE « COUPÉE » SUR IPHONE (démo d'Ethan, 25/11 au soir).
// Constat (capture d'Ethan, iPhone 430 pt) : fiche décalée vers la gauche, en-tête de l'appli sorti de l'écran. Mesures sur la capture : tout est agrandi
// de ×1,14 = 16 / 14 → zoom automatique d'iOS au toucher d'un champ écrit en 14 px (sélecteur des fils d'alarme de la fiche), zoom qui reste ensuite.
// Corrections : (1) iPhone / iPad seulement : maximum-scale=1 dans la balise viewport (plus de zoom automatique ; le zoom à deux doigts reste) ;
// (2) « Faire l'étape … » fait défiler la FICHE seulement (scrollIntoView faisait aussi défiler l'appli, masquée mais « défilable ») ;
// (3) garde-fou : l'appli (#app) et la page ne restent jamais décalées.
// Démo hors connexion, chantier de démonstration intégré, aucune donnée réelle.
//  z1  iPhone : la balise viewport porte maximum-scale=1, une seule fois (même après rechargement)
//  z2  Android et PC : balise inchangée (le zoom reste possible)
//  z3  iPhone 430 × 932 : fiche d'une soudure à souder → « Faire l'étape Soudure » : l'étape ① est dans la fiche, à l'écran, appli et page non décalées
//  z4  appli décalée de force (programme, scrollIntoView centré) → remise à zéro aussitôt
//  z5  390 × 844 et 360 × 740 : aucun élément de la fiche plus large que l'écran, appli non décalée
//  z6  console propre
import { chromium } from 'playwright';
const BASE=process.env.BASE||'http://127.0.0.1:8844';
const C={};const logs=[];const J=x=>JSON.stringify(x);
const UA_IPHONE='Mozilla/5.0 (iPhone; CPU iPhone OS 18_1 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/18.1 Mobile/15E148 Safari/604.1';
const UA_ANDROID='Mozilla/5.0 (Linux; Android 14; Pixel 8) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/130.0.0.0 Mobile Safari/537.36';
const browser=await chromium.launch({headless:true,executablePath:process.env.CHROMIUM_PATH||undefined});
let ctx,page;const wait=ms=>page.waitForTimeout(ms);
async function open(vp,{ua,mobile=true}={}){
  ctx=await browser.newContext(mobile?{viewport:vp,isMobile:true,hasTouch:true,deviceScaleFactor:1,userAgent:ua}:{viewport:vp,userAgent:ua});page=await ctx.newPage();
  page.on('pageerror',e=>logs.push('PAGEERROR '+e.message.slice(0,200)));
  page.on('console',m=>{if(m.type()==='error'&&!/supabase|Failed to fetch|net::ERR|404|WebSocket|geopf|open-meteo|nominatim|ERR_|tile/i.test(m.text()))logs.push(m.text().slice(0,200));});
  page.on('dialog',d=>d.dismiss().catch(()=>{}));
  await page.route(u=>/geopf|geo\.api|open-meteo|nominatim|tile\.openstreetmap|arcgis|ign\.fr/.test(u.hostname),r=>r.fulfill({status:200,contentType:'application/json',body:'{}'}));
  await page.clock.install({time:new Date(2026,10,26,9,0,0)});
  await page.goto(BASE+'/index.html');await wait(400);await page.evaluate(()=>localStorage.clear());
  await page.evaluate(()=>new Promise(r=>{try{const q=indexedDB.deleteDatabase('trace-kv');q.onsuccess=q.onerror=q.onblocked=()=>r();}catch(e){r();}}));
  await page.reload();await wait(1300);{const s=await page.$('#loginSkip');if(s&&await s.isVisible())await s.click();await wait(600);}
  await page.evaluate(()=>{const T=window.TRACE;T.state.userId='ethan';T.showScreen('home');T.renderHome();});await wait(300);}
const meta=()=>page.evaluate(()=>document.querySelector('meta[name="viewport"]').getAttribute('content'));
async function fiche(){await page.evaluate(()=>window.TRACE.openSiteFromHome('bain'));await wait(2300);
  const w=await page.evaluate(()=>{const T=window.TRACE;for(const [lid,L] of Object.entries(T.lines||{})){for(const c of Object.keys(L.cond||{})){const Jt=L.cond[c].joints||[];
    for(let i=0;i<Jt.length;i++){const j=Jt[i];if(j.status==='a_souder'&&!j.sst&&!j.extra){T.openJoint(lid,c,i);return j.weldId;}}}}return null;});await wait(900);return w;}
const etat=()=>page.evaluate(()=>{const s=document.getElementById('sheet'),a=document.getElementById('app');const vw=innerWidth;
  const d=s.querySelector('.dstep[open]')||s.querySelector('.dstep');const sr=s.getBoundingClientRect(),dr=d?d.getBoundingClientRect():null;
  const large=[...s.querySelectorAll('*')].filter(e=>{const r=e.getBoundingClientRect();return r.width>0&&r.height>0&&(r.right>vw+0.5||r.left<-0.5);}).slice(0,5).map(e=>e.tagName.toLowerCase()+'.'+[...e.classList].join('.'));
  return {app:[a.scrollLeft,a.scrollTop],win:[scrollX,scrollY],sheet:[Math.round(sr.top),Math.round(sr.bottom),s.scrollTop],step:dr?[Math.round(dr.top),Math.round(dr.bottom),d.open]:null,large,head:Math.round(document.querySelector('#app').getBoundingClientRect().top)};});
/* ── z1 / z3 / z4 : iPhone 430 × 932 ── */
await open({width:430,height:932},{ua:UA_IPHONE});
const m1=await meta();await page.reload();await wait(1200);const m1b=await meta();
console.log('z1) viewport iPhone :',m1,'| après rechargement :',m1b);
C.z1=/maximum-scale=1/.test(m1)&&(m1b.match(/maximum-scale/g)||[]).length===1;
await page.evaluate(()=>{const T=window.TRACE;T.state.userId='ethan';T.showScreen('home');T.renderHome();});await wait(300);
const wid=await fiche();const e0=await etat();
await page.evaluate(()=>{const b=document.querySelector('#sheet [data-gostep]');if(b)b.click();});await wait(1400);
const e1=await etat();console.log('z3) soudure',wid,'avant :',J(e0),'\n    après « Faire l\'étape » :',J(e1));
C.z3=!!wid&&e1.step&&e1.step[2]===true&&e1.step[0]>=e1.sheet[0]-1&&e1.step[0]<e1.sheet[1]-40&&e1.app[0]===0&&e1.app[1]===0&&e1.win[0]===0&&!e1.large.length;
/* un élément caché qui déborde (comme un panneau poussé hors de l'écran sur iPhone) rend l'appli « défilable » : on la décale de force */
await page.evaluate(()=>{const a=document.getElementById('app');const x=document.createElement('div');x.id='zDeb';x.style.cssText='position:absolute;left:0;top:0;width:3000px;height:3000px;pointer-events:none;visibility:hidden';a.appendChild(x);a.scrollLeft=60;a.scrollTop=120;});await wait(150);const e2=await etat();
await page.evaluate(()=>{const d=document.querySelector('#sheet .dstep');d.scrollIntoView({block:'center',inline:'center'});});await wait(400);const e3=await etat();
await page.evaluate(()=>{const x=document.getElementById('zDeb');if(x)x.remove();});
console.log('z4) décalage forcé →',J(e2.app),'| scrollIntoView centré →',J(e3.app),'fenêtre',J(e3.win));
C.z4=e2.app[0]===0&&e2.app[1]===0&&e3.app[0]===0&&e3.app[1]===0&&e3.win[0]===0;
await ctx.close();
/* ── z2 : Android et PC ── */
await open({width:412,height:915},{ua:UA_ANDROID});const m2=await meta();await ctx.close();
await open({width:1366,height:768},{mobile:false});const m3=await meta();await ctx.close();
console.log('z2) Android :',m2,'| PC :',m3);C.z2=!/maximum-scale/.test(m2)&&!/maximum-scale/.test(m3);
/* ── z5 : 390 et 360 px ── */
const R5={};for(const [w,h] of [[390,844],[360,740]]){await open({width:w,height:h},{ua:UA_IPHONE});await fiche();
  await page.evaluate(()=>{const b=document.querySelector('#sheet [data-gostep]');if(b)b.click();});await wait(1300);R5[w]=await etat();await ctx.close();}
console.log('z5)',J(R5));C.z5=Object.values(R5).every(e=>!e.large.length&&e.app[0]===0&&e.app[1]===0&&e.step&&e.step[2]===true);
C.z6=!logs.length;console.log('console :',J(logs));
console.log(Object.entries(C).map(([k,v])=>k+':'+(v?'✓':'✗')).join(' '));
console.log('RESULTAT:',Object.values(C).every(Boolean)?'TOUT VERT':'ÉCHEC');
await browser.close();
