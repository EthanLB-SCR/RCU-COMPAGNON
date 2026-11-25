// e2e_tuto_fl_2411.mjs — 24/11/2026 (nuit) : TUTORIELS DU MODULE FLOTTE (src/tutos_commerce.js). Ethan (24/11 au soir) : « revois tous les tutos avec les nouveautés ».
// Le tutoriel « Tracé Flotte » décrivait l'écran retiré le 24/11. Il décrit maintenant le module (11/11) pour qui a « gérer la flotte », et garde ses anciennes étapes pour
// l'ancien écran (sans ce droit, ou écran de test du serveur local) ; une page du module = son tutoriel.
// Jeu de données de la maquette (test/fixtures/flotte_demo.js, 100 % FICTIF), aujourd'hui mardi 10/11/2026.
//  f1  fichier : 6 nouvelles clés nommées ; règles des tutoriels (titres ≤ 40, textes ≤ 200 et ≤ 2 phrases, titres uniques, cibles robustes) ; « flotte » : 8 étapes pour le
//      module, 10 pour l'ancien écran, jamais mêlées
//  f2  390 px, administrateur : Accueil → « flotte » (étapes du module, toutes surlignées) ; Véhicules, une fiche, Qui a quoi, Calendrier, À traiter, Journal → leur clé, le « ? »
//      lance leur tutoriel, chaque cible surlignée et à l'écran, carte dans l'écran, boutons ≥ 44 px
//  f3  Parking 3D et Silhouettes 3D → la vue d'ensemble (pas de clé à part) ; ancien écran (drapeau de test) → les étapes d'avant (« 🚐 Véhicules », « ➕ Véhicule »)
//  f4  1 366 px (PC) : Accueil et une fiche — mêmes contrôles
//  f5  console propre
import { chromium } from 'playwright';import fs from 'fs';
import path from 'path';import {fileURLToPath} from 'url';
const here=path.dirname(fileURLToPath(import.meta.url));
const BASE=process.env.BASE||'http://127.0.0.1:8844';
const M=await import(path.join(here,'..','src','tutos_commerce.js'));const TU=M.default,NOMS=M.NOMS;
const C={};const logs=[];const J=x=>JSON.stringify(x);
const KEYS=['flotte:vehicules','flotte:fiche','flotte:qui','flotte:calendrier','flotte:mouvements','flotte:journal'];
const phrases=s=>(String(s).replace(/« \? »/g,'').match(/[.!?](\s|$)/g)||[]).length;
const o={miss:KEYS.filter(k=>!TU[k]),noms:KEYS.filter(k=>!NOMS[k]),pb:[]};
for(const k of ['flotte',...KEYS]){const st=TU[k]||[];const T=st.map(s=>s.titre);if(new Set(T).size!==T.length)o.pb.push(k+' : titres en double');
  st.forEach((s,i)=>{const w=k+' #'+(i+1)+' « '+s.titre+' »';if(!s.titre||s.titre.length>40)o.pb.push(w+' titre');if(!s.texte||s.texte.length>200)o.pb.push(w+' texte '+s.texte.length);if(phrases(s.texte)>2)o.pb.push(w+' phrases');if(s.sel&&/:nth-|:contains|text=|:has-text/.test(s.sel))o.pb.push(w+' cible fragile');});
  if(k!=='flotte'&&(st.length<3||st.length>8))o.pb.push(k+' : '+st.length+' étapes');}
const neuf=TU.flotte.filter(s=>s.si&&s.si({can:()=>true})).map(s=>s.titre),vieux=TU.flotte.filter(s=>!s.si||s.si({can:k=>k!=='flotte.manage'&&k!=='mag.manage',feat:()=>true})).map(s=>s.titre);
console.log('f1) fichier :',J(o),'module :',neuf.length,'ancien écran :',vieux.length);
C.f1=!o.miss.length&&!o.noms.length&&!o.pb.length&&neuf.length===8&&vieux.length===9&&!neuf.some(t=>vieux.includes(t));
const browser=await chromium.launch({headless:true,executablePath:process.env.CHROMIUM_PATH||undefined});
const FIX=fs.readFileSync(path.join(here,'fixtures','flotte_demo.js'),'utf8');
let ctx,page;const wait=ms=>page.waitForTimeout(ms);
const open=async(vp,mobile)=>{ctx=await browser.newContext(mobile?{viewport:vp,isMobile:true,hasTouch:true,deviceScaleFactor:1}:{viewport:vp});page=await ctx.newPage();
  page.on('pageerror',e=>logs.push('PAGEERROR: '+e.message.slice(0,300)));page.on('console',m=>{if(m.type()==='error'&&!/supabase|Failed to fetch|net::ERR|404|geopf|WebSocket|open-meteo|nominatim|fonts|ERR_/i.test(m.text()))logs.push(m.text().slice(0,200));});page.on('dialog',d=>d.accept().catch(()=>{}));
  await page.route(u=>/geopf|geo\.api|open-meteo/.test(u.hostname),r=>r.fulfill({status:200,contentType:'application/json',body:'{}'}));
  await page.clock.install({time:new Date(2026,10,10,9,0,0)});await page.goto(BASE+'/index.html');await wait(500);await page.evaluate(()=>{localStorage.clear();});
  await page.evaluate(()=>new Promise(r=>{try{const q=indexedDB.deleteDatabase('trace-kv');q.onsuccess=q.onerror=q.onblocked=()=>r();}catch(e){r();}}));await page.reload();await wait(1400);
  const s=await page.$('#loginSkip');if(s&&await s.isVisible())await s.click();await wait(600);
  await page.evaluate(()=>{const T=window.TRACE;T.state.userId='ethan';T.showScreen('home');T.renderHome();document.getElementById('htParc').click();});await wait(900);
  await page.evaluate(src=>{new Function(src)();window.TRACE.flotteM.demo(window.__FLDEMO);},FIX);await wait(900);};
const where=()=>page.evaluate(()=>window.TRACE.tuto.where());
const nav=async h=>{await page.evaluate(h=>{const b=document.querySelector('#eq-app .af-nav [data-h="'+h+'"]');if(b)b.click();},h);await wait(700);};
const fiche=async im=>{await nav('vehicules');await page.evaluate(im=>{const r=document.querySelector('#fl-main tr[data-immat="'+im+'"]');if(r)r.click();},im);await wait(800);};
const card=()=>page.evaluate(()=>{const r=document.getElementById('tuto');if(!r)return null;const c=r.querySelector('.tutoCard'),h=r.querySelector('.tutoHole');const rc=c.getBoundingClientRect();
  return {mod:c.querySelector('.tutoMod').textContent,t:c.querySelector('.tutoT').textContent,hole:!!h&&getComputedStyle(h).display!=='none',in:rc.left>=0&&rc.right<=innerWidth+0.5&&rc.top>=0&&rc.bottom<=innerHeight+0.5,
    btn:Math.min(...[...c.querySelectorAll('button')].map(b=>b.getBoundingClientRect().height)),open:window.TRACE.tuto.open()};});
const frac=sel=>page.evaluate(sel=>{for(const q of String(sel).split(',')){let el=null;try{el=document.querySelector(q.trim());}catch(e){}if(!el)continue;const r=el.getBoundingClientRect();if(r.width<4||r.height<4)continue;
  const cs=getComputedStyle(el);if(cs.visibility==='hidden'||cs.display==='none')continue;if(r.bottom<0||r.top>innerHeight||r.right<0||r.left>innerWidth)continue;
  const hb=document.getElementById('homeBody');const top=hb?Math.max(0,hb.getBoundingClientRect().top):0;const vis=Math.max(0,Math.min(r.bottom,innerHeight)-Math.max(r.top,top));
  return {f:Math.round(100*vis/Math.max(1,Math.min(r.height,innerHeight-top)))/100,haut:r.top<top};}return null;},sel);
const WARN=[];
const run=async k=>{const defs=TU[k]||[];const out={k,steps:[],miss:[],out:[],small:[],cut:[],n:0};const c0=await card();if(!c0||!c0.open||c0.open.k!==k){out.err='pas ouvert ('+J(c0&&c0.open)+')';return out;}out.n=c0.open.n;out.mod=c0.mod;
  for(let i=0;i<out.n;i++){await wait(130);const c=await card();if(!c)break;const d=defs.find(s=>s.titre===c.t);out.steps.push(c.t+(c.hole?' ◉':''));
    if(d&&d.sel&&!c.hole)out.miss.push(c.t);if(d&&d.sel&&c.hole){const f=await frac(d.sel);if(f&&f.f<0.6){if(f.haut)out.cut.push(c.t+' '+f.f);else WARN.push(k+' « '+c.t+' » '+f.f);}}if(!d)out.miss.push('?'+c.t);if(!c.in)out.out.push(c.t);if(c.btn<44)out.small.push(c.t);
    const b=await page.$('#tuto .tutoGo');if(!b)break;await b.click();}
  await wait(150);out.closed=!(await page.$('#tuto'));return out;};
const help=async()=>{const h=await page.$('#homeBody .tuHelp');if(!h)return false;await h.click();await wait(300);return true;};
const ok=r=>!r.err&&r.n>=1&&!r.miss.length&&!r.out.length&&!r.small.length&&!r.cut.length&&r.closed;
const show=r=>({k:r.k,n:r.n,err:r.err,where:r.where,help:r.help,steps:r.steps,miss:r.miss,out:r.out,small:r.small,cut:r.cut});
const go=async(k,prep)=>{await prep();const w=await where();const h=await help();const r=await run(k);r.where=w;r.help=h;return r;};
/* ── f2 : téléphone ── */
await open({width:390,height:844},true);
const R={};R.flotte=await go('flotte',()=>nav('accueil'));R['flotte:vehicules']=await go('flotte:vehicules',()=>nav('vehicules'));R['flotte:fiche']=await go('flotte:fiche',()=>fiche('FL-104-AB'));
R['flotte:qui']=await go('flotte:qui',()=>nav('qui'));R['flotte:calendrier']=await go('flotte:calendrier',()=>nav('calendrier'));R['flotte:mouvements']=await go('flotte:mouvements',()=>nav('mouvements'));R['flotte:journal']=await go('flotte:journal',()=>nav('journal'));
for(const k of Object.keys(R))console.log('f2) '+k+' :',J(show(R[k])));
C.f2=Object.entries(R).every(([k,r])=>r.where===k&&r.help&&ok(r))&&R.flotte.n===8&&R.flotte.steps.includes('Où sont les véhicules ◉')&&!R.flotte.steps.some(s=>/🚐 Véhicules/.test(s));
/* ── f3 : parking, silhouettes, ancien écran ── */
await nav('parking');const w1=await where();await nav('reglages');const w2=await where();
await page.evaluate(()=>{localStorage.setItem('trace:flotteAncien','1');window.TRACE.flotteM.ancien(true);});await wait(800);
const w3=await where();await page.evaluate(()=>window.TRACE.tuto.start('flotte'));await wait(300);const vieux2=[];for(let i=0;i<12;i++){const c=await card();if(!c)break;vieux2.push(c.t);const b=await page.$('#tuto .tutoGo');if(!b)break;await b.click();await wait(120);}
console.log('f3) parking :',w1,'| silhouettes :',w2,'| ancien écran :',w3,J(vieux2));
await page.evaluate(()=>{localStorage.removeItem('trace:flotteAncien');window.TRACE.flotteM.ancien(false);});await wait(500);
C.f3=w1==='flotte'&&w2==='flotte'&&w3==='flotte'&&vieux2.includes('🚐 Véhicules')&&vieux2.includes('➕ Véhicule')&&!vieux2.includes('Où sont les véhicules');
await ctx.close();
/* ── f4 : PC ── */
await open({width:1366,height:768},false);
const P={};P.flotte=await go('flotte',()=>nav('accueil'));P['flotte:fiche']=await go('flotte:fiche',()=>fiche('FL-102-AA'));
for(const k of Object.keys(P))console.log('f4) '+k+' :',J(show(P[k])));
C.f4=Object.entries(P).every(([k,r])=>r.where===k&&r.help&&ok(r));
C.f5=!logs.length;
if(WARN.length)console.log('avertissements :',J(WARN));
console.log('console :',J(logs));
console.log(Object.entries(C).map(([k,v])=>k+':'+(v?'✓':'✗')).join(' '));
console.log('RESULTAT:',Object.values(C).every(Boolean)?'TOUT VERT':'ÉCHEC');
await browser.close();
