// e2e_navlive_1911.mjs — 19/11/2026 nuit, Ethan (Tracé RH → Navettes → une semaine) : « que ce soit dynamique : quand tu choisis, coches, décoches, que les valeurs lissées
//  s'ajustent en direct sous nos yeux, et modifiables seulement quand on met l'option lissage manuel » (décor et personnages de démo de e2e_navliss_1011, rien ne part au serveur).
//  Julien, S45 : 4 × 11 h pointées, vendredi non travaillé → lissée sur 5 jours : 8,75 × 4 + 9.
//  n1  à l'ouverture : les heures de la navette sont affichées, PAS modifiables (lissage automatique), pas de bandeau « aperçu »
//  n2  décocher « Ven » → en direct : 11 h × 4, vendredi vide ; tableau, explication et bandeau « aperçu » suivent ; RIEN n'est enregistré
//  n3  recocher « Ven » → retour à 8,75 × 4 + 9, le bandeau disparaît
//  n4  « Heures réelles » → 11 × 4 en direct, toujours pas modifiables ; « Compléter avec les compteurs » décoché → l'explication le dit
//  n5  « Heures saisies à la main » → les cases deviennent modifiables, pré-remplies avec ce qui était affiché ; on tape → tableau, total et explication suivent
//  n6  détour par « automatique » (cases verrouillées, valeurs du calcul) puis retour à « à la main » → les heures saisies reviennent
//  n7  le motif tapé apparaît dans l'explication ; « Fermer » sans enregistrer → rien n'a changé (ni la navette, ni le registre)
//  n8  « Enregistrer » → la navette prend les heures saisies ; à la réouverture : mode « à la main », cases modifiables ; « Revenir au calcul automatique » → comme au début
//  n9  téléphone 390 px : la fenêtre ne déborde pas ; console propre
//  n10 Karim, S46 « à compléter » (mardi attendu sans pointage) : cocher « Valider la semaine telle quelle » montre tout de suite la semaine lissée (6,75 × 4) ; fermer → toujours « à compléter »
import { chromium } from 'playwright';
const BASE=process.env.BASE||'http://localhost:8765';
const browser=await chromium.launch({headless:true, executablePath: process.env.CHROMIUM_PATH||undefined});
const ctx=await browser.newContext({viewport:{width:1280,height:1000},acceptDownloads:true});const page=await ctx.newPage();
const logs=[];page.on('pageerror',e=>logs.push('PAGEERROR: '+e.message.slice(0,300)));page.on('console',m=>{if(m.type()==='error'&&!/supabase|Failed to fetch|net::ERR|404|WebSocket/i.test(m.text()))logs.push(m.text().slice(0,200));});
page.on('dialog',d=>d.accept().catch(()=>{}));
const strip=s=>String(s||'').normalize('NFD').replace(/[̀-ͯ]/g,'').toLowerCase().replace(/[-']/g,' ').replace(/\s+/g,' ').trim();
await page.route(u=>/(^|\.)geopf\.fr$/.test(u.hostname),route=>{const q=strip(new URL(route.request().url()).searchParams.get('q'));const F=(lon,lat,pc)=>({type:'FeatureCollection',features:[{type:'Feature',geometry:{type:'Point',coordinates:[lon,lat]},properties:{postcode:pc,type:'municipality'}}]});
  const body=q.includes('rennes')?F(-1.6778,48.1173,'35000'):q.includes('nantes')?F(-1.5536,47.2184,'44000'):q==='caen'?F(-0.3707,49.1829,'14000'):q==='bayeux'?F(-0.7026,49.2765,'14400'):{type:'FeatureCollection',features:[]};route.fulfill({status:200,contentType:'application/json',body:JSON.stringify(body)});});
await page.route(u=>u.hostname==='geo.api.gouv.fr',route=>route.fulfill({status:200,contentType:'application/json',body:'[]'}));
await page.route(u=>/open-meteo\.com$/.test(u.hostname),route=>route.fulfill({status:200,contentType:'application/json',body:JSON.stringify({results:[],daily:{time:[],weathercode:[],temperature_2m_max:[],precipitation_sum:[],precipitation_probability_max:[]}})}));
const C={};const wait=ms=>page.waitForTimeout(ms);const J=x=>JSON.stringify(x);
await page.clock.install({time:new Date(2026,11,1,8,30,0)}); /* mardi 01/12/2026 */
await page.goto(BASE+'/index.html');await wait(600);await page.evaluate(()=>{localStorage.clear();localStorage.setItem('trace:wide','1');});await page.evaluate(()=>new Promise(r=>{try{const q=indexedDB.deleteDatabase('trace-kv');q.onsuccess=q.onerror=q.onblocked=()=>r();}catch(e){r();}}));
await page.reload();await wait(1200);{const s=await page.$('#loginSkip');if(s&&await s.isVisible())await s.click();await wait(700);}
// ── 0) chantiers Caen et Bayeux ; planning et pointages de novembre
await page.evaluate(()=>{const T=window.TRACE;const src=T.sites[Object.keys(T.sites).find(k=>k!=='__vide'&&T.sites[k]&&T.sites[k].lines)];
  const mk=(id,name,ville)=>{const x=JSON.parse(JSON.stringify(src));x.id=id;x.name=name;x.fiche={ville,secteur:'ouest',chef:'l:ethan'};x.conv={msgs:[],seq:1};x.qse={docs:[]};delete x.geo;T.sites[id]=x;};
  mk('demo_caen','Caen — Presqu\'île','Caen');mk('demo_bayeux','Bayeux — Gare','Bayeux');
  const ST=T.espace.state();const P=ST.people;P['l:julien']=Object.assign({},P['l:julien']||{},{adresse:{voie:'4 rue des Essais',cp:'35000',ville:'RENNES'}});P['l:karim']=Object.assign({},P['l:karim']||{},{adresse:{voie:'',cp:'44000',ville:'NANTES'}});
  const wkKey=s=>{const x2=new Date(s+'T12:00:00');x2.setDate(x2.getDate()+3-((x2.getDay()+6)%7));const y=x2.getFullYear();const j=new Date(y,0,4);const n=1+Math.round(((x2-j)/864e5-3+((j.getDay()+6)%7))/7);return y+'-W'+String(n).padStart(2,'0');};
  const add=(s,n)=>{const d=new Date(s+'T12:00:00');d.setDate(d.getDate()+n);return d.getFullYear()+'-'+String(d.getMonth()+1).padStart(2,'0')+'-'+String(d.getDate()).padStart(2,'0');};
  const end=h=>{const m=450+60+Math.round(h*60);return String(Math.floor(m/60)).padStart(2,'0')+':'+String(m%60).padStart(2,'0');};
  const pt=(p,d,site,h,extra)=>ST.pointages.push({p,d,site,status:'declare',corr:null,events:[{t:'start',at:d+'T07:30'},{t:'pause',at:d+'T12:00'},{t:'resume',at:d+'T13:00'},{t:'end',at:d+'T'+end(h)}].concat(extra||[]),val:[]});
  const J={'2026-11-02':[['demo_caen',11],['demo_caen',11],['demo_caen',11],['demo_caen',11],null],'2026-11-09':[['demo_caen',13],['demo_caen',13],null,['demo_caen',13],['demo_caen',13]],
    '2026-11-16':[['demo_caen',6.4],['demo_caen',6.4],['demo_caen',6.4],['demo_caen',6.4],['demo_caen',6.4]],'2026-11-23':[['demo_caen',9],null,['demo_bayeux',9],['demo_caen',9],['demo_caen',9]],'2026-11-30':[['demo_bayeux',8],'demo_caen',null,null,null]};
  const K={'2026-11-09':[['demo_caen',9],'demo_caen',null,['demo_caen',9],['demo_caen',9]],'2026-11-16':[['demo_caen',8],['demo_bayeux',8],['demo_bayeux',8],['demo_bayeux',8],['demo_bayeux',8]]};
  Object.entries({'l:julien':J,'l:karim':K}).forEach(([p,W])=>Object.entries(W).forEach(([mon,days])=>{const pj={};days.forEach((x,i)=>{const d=add(mon,i);if(x===null){pj[d]=[];return;}const site=Array.isArray(x)?x[0]:x;pj[d]=[site];
      if(Array.isArray(x))pt(p,d,site,x[1],p==='l:julien'&&d==='2026-11-25'?[{t:'route',at:d+'T18:30',min:45,quand:'soir',de:'demo_bayeux',vers:'demo_caen'}]:[]);});
    if(p==='l:julien'&&mon==='2026-11-09')pj['2026-11-11']=[];T.espace.savePlanning(wkKey(mon),{[p]:pj});}));
  T.state.userId='ethan';T.renderHome();});await wait(400);
// géocodage de Caen / Bayeux / Rennes / Nantes (le trajet et les distances en ont besoin) : on ouvre Grands déplacements une fois
await page.evaluate(async()=>{const w=ms=>new Promise(r=>setTimeout(r,ms));document.getElementById('htRh').click();await w(250);const r=document.querySelector('#eq-app [data-act="x"][data-v="rh|tab|gd"]');if(r){r.click();await w(1800);} /* 19/11 nuit : cet écran est dans le module RH (plus dans Pilotage) */});
// ── 1) absence : congé payé de Julien le mardi 24/11, saisi dans Tracé RH → Absences (au vrai clic)
await page.evaluate(async()=>{const w=ms=>new Promise(r=>setTimeout(r,ms));const b=document.getElementById('htRh');if(b){b.click();await w(500);}});
await page.click('[data-act="x"][data-v="rh|tab|abs"]');await wait(400);await page.click('[data-act="x"][data-v="rh|new|rhabs"]');await wait(300);
await page.evaluate(()=>{const g=k=>document.getElementById(k);g('rh-p').value='l:julien';g('rh-type').value='cp';g('rh-du').value='2026-11-24';g('rh-au').value='2026-11-24';g('rh-du').dispatchEvent(new Event('change'));g('rh-note').value='test';});
await page.click('#rh-ok');await wait(500);

await page.click('[data-act="x"][data-v="rh|tab|nav"]');await wait(600);await page.click('[data-act="x"][data-v="rh|navm|2026-11"]');await wait(900);
const MON='2026-11-02';const ouvrir=async()=>{await page.click('[data-act="x"][data-v="rh|navw|l:julien|'+MON+'"]');await wait(500);};
const etat=()=>page.evaluate(()=>{const g=i=>document.getElementById(i);const T=s=>(s||'').replace(/\s+/g,' ').trim();
  return {mode:(document.querySelector('input[name=nv-mode]:checked')||{}).value,h:[0,1,2,3,4,5].map(i=>g('nv-h'+i).value),off:[0,1,2,3,4,5].map(i=>g('nv-h'+i).disabled),liss:[0,1,2,3,4].map(i=>g('nv-l'+i).checked),
    hint:T(g('nv-hhint').textContent),apercu:!g('nv-apercu').hidden&&g('nv-apercu').offsetParent!==null,nav:[...g('nv-tab').querySelectorAll('tr')].slice(1).map(r=>T(r.children[2].textContent)),etatTxt:T(g('nv-tab').querySelector('tr.tot').children[3].textContent),
    expl:[...g('nv-expl').querySelectorAll('li')].map(l=>T(l.textContent)),auto:!!g('nv-auto')};});
const enreg=()=>page.evaluate(m=>{const N=window.TRACE.espace.navette('l:julien','2026-11').N;const L=N.weeks.find(w=>w.mon===m).liss;return {etat:L.etat,h:L.jours.map(j=>j.h),main:L.main?{mode:L.main.mode,h:L.main.h||null,motif:L.main.motif||''}:null,total:L.total};},MON);
const coche=async(id,v)=>{await page.evaluate(([id,v])=>{const el=document.getElementById(id);if(el.checked!==v)el.click();},[id,v]);await wait(250);};
const radio=async v=>{await page.evaluate(v=>document.querySelector('input[name=nv-mode][value="'+v+'"]').click(),v);await wait(250);};
let o={};

// ── n1 : à l'ouverture
await ouvrir();o.e=await etat();o.s=await enreg();console.log('n1) ouverture :',J(o));
C.n1=o.e.mode==='auto'&&o.e.h.join()==='8.75,8.75,8.75,8.75,9,'&&o.e.off.every(Boolean)&&o.e.liss.every(Boolean)&&/calculées par les règles/.test(o.e.hint)&&!o.e.apercu&&o.e.nav.join()==='8,75,8,75,8,75,8,75,9,—,44'&&o.e.etatTxt==='lissée'&&!o.e.auto&&o.s.main===null;

// ── n2 : décocher « Ven » → 4 jours, en direct, rien d'enregistré
o={};await coche('nv-l4',false);o.e=await etat();o.s=await enreg();console.log('n2) vendredi décoché :',J(o));
C.n2=o.e.h.join()==='11,11,11,11,,'&&o.e.off.every(Boolean)&&o.e.apercu&&o.e.nav.join()==='11,11,11,11,—,—,44'&&o.e.expl.some(t=>/Lissé sur 4 jours \(lun mar mer jeu\) au pas de ¼ h : 11 h par jour/.test(t))&&o.e.expl.some(t=>/vendredi 06\/11 : retiré du lissage \(à la main\)/.test(t))
  &&o.s.main===null&&o.s.h.join()==='8.75,8.75,8.75,8.75,9,';

// ── n3 : recocher → comme au début
o={};await coche('nv-l4',true);o.e=await etat();console.log('n3) vendredi recoché :',J(o));
C.n3=o.e.h.join()==='8.75,8.75,8.75,8.75,9,'&&!o.e.apercu&&o.e.nav.join()==='8,75,8,75,8,75,8,75,9,—,44'&&o.e.expl.some(t=>/Lissé sur 5 jours/.test(t));

// ── n4 : heures réelles ; compteurs décochés
o={};await radio('reel');o.e=await etat();await coche('nv-comble',false);o.e2=await etat();await coche('nv-comble',true);console.log('n4) heures réelles :',J(o));
C.n4=o.e.mode==='reel'&&o.e.h.join()==='11,11,11,11,,'&&o.e.off.every(Boolean)&&o.e.apercu&&/heures réelles/.test(o.e.hint)&&o.e.etatTxt==='heures réelles (à la main)'&&o.e.expl.some(t=>/Lissage retiré à la main/.test(t))&&o.e2.h.join()==='11,11,11,11,,'&&o.e2.apercu;

// ── n5 : à la main → modifiables, pré-remplies ; on tape
o={};await radio('main');o.e=await etat();await page.fill('#nv-h0','10');await wait(250);await page.fill('#nv-h4','0.5');await wait(250);o.e2=await etat();o.s=await enreg();console.log('n5) à la main :',J(o));
C.n5=o.e.mode==='main'&&o.e.h.join()==='11,11,11,11,,'&&o.e.off.every(x=>!x)&&/à toi de les saisir/.test(o.e.hint)&&o.e.etatTxt==='à la main'&&o.e.expl.some(t=>/Heures saisies à la main : lun 11 · mar 11 · mer 11 · jeu 11 · ven — · sam — = 44 h/.test(t))
  &&o.e2.h.join()==='10,11,11,11,0.5,'&&o.e2.nav.join()==='10,11,11,11,0,5,—,43,5'&&o.e2.expl.some(t=>/lun 10 · mar 11 · mer 11 · jeu 11 · ven 0,5 · sam — = 43,5 h ; 0,5 h pointées en plus/.test(t))&&o.e2.apercu&&o.s.main===null;

// ── n6 : détour par l'automatique, retour à la main
o={};await radio('auto');o.e=await etat();await radio('main');o.e2=await etat();console.log('n6) détour :',J(o));
C.n6=o.e.mode==='auto'&&o.e.h.join()==='8.75,8.75,8.75,8.75,9,'&&o.e.off.every(Boolean)&&!o.e.apercu&&o.e2.mode==='main'&&o.e2.h.join()==='10,11,11,11,0.5,'&&o.e2.off.every(x=>!x)&&o.e2.nav.join()==='10,11,11,11,0,5,—,43,5';

// ── n7 : le motif dans l'explication ; fermer sans enregistrer
o={};await page.fill('#nv-motif','essai en direct');await wait(250);o.e=await etat();await page.evaluate(()=>document.querySelector('.nav-main [data-close]').click());await wait(400);o.ferme=await page.evaluate(()=>!document.getElementById('nv-tab'));o.s=await enreg();
await ouvrir();o.e2=await etat();console.log('n7) motif, fermer sans enregistrer :',J(o));
C.n7=o.e.expl.some(t=>/Heures saisies à la main — essai en direct : lun 10/.test(t))&&o.ferme&&o.s.main===null&&o.s.h.join()==='8.75,8.75,8.75,8.75,9,'&&o.e2.mode==='auto'&&o.e2.h.join()==='8.75,8.75,8.75,8.75,9,'&&o.e2.off.every(Boolean)&&!o.e2.apercu;

// ── n8 : enregistrer à la main, rouvrir, revenir au calcul automatique
o={};await radio('main');await page.fill('#nv-h0','9');await page.fill('#nv-h1','9');await page.fill('#nv-h2','9');await page.fill('#nv-h3','9');await page.fill('#nv-h4','8');await wait(250);o.sansMotif=await page.evaluate(()=>{document.getElementById('nv-ok').click();return !!document.getElementById('nv-tab');});
await page.fill('#nv-motif','accord avec Julien');await page.click('#nv-ok');await wait(800);o.s=await enreg();await ouvrir();o.e=await etat();await page.click('#nv-auto');await wait(800);o.s2=await enreg();await ouvrir();o.e2=await etat();console.log('n8) enregistrer :',J(o));
C.n8=o.sansMotif&&o.s.etat==='main'&&o.s.h.join()==='9,9,9,9,8,'&&o.s.main&&o.s.main.mode==='main'&&o.s.main.motif==='accord avec Julien'&&o.s.total===44&&o.e.mode==='main'&&o.e.h.join()==='9,9,9,9,8,'&&o.e.off.every(x=>!x)&&!o.e.apercu&&o.e.auto
  &&o.s2.main===null&&o.s2.h.join()==='8.75,8.75,8.75,8.75,9,'&&o.e2.mode==='auto'&&o.e2.off.every(Boolean)&&!o.e2.auto;

// ── n10 : une semaine « à compléter » — l'effet de « Valider la semaine telle quelle » se voit avant d'enregistrer
o={};await page.evaluate(()=>document.querySelector('.nav-main [data-close]').click());await wait(400);await page.click('[data-act="x"][data-v="rh|navw|l:karim|2026-11-09"]');await wait(500);o.e=await etat();await coche('nv-force',true);o.e2=await etat();
await page.evaluate(()=>document.querySelector('.nav-main [data-close]').click());await wait(400);o.s=await page.evaluate(()=>{const L=window.TRACE.espace.navette('l:karim','2026-11').N.weeks.find(w=>w.mon==='2026-11-09').liss;return {etat:L.etat,main:L.main};});
console.log('n10) semaine à compléter :',J(o));
C.n10=o.e.etatTxt==='à compléter'&&o.e.h.join()==='9,,,9,9,'&&o.e.off.every(Boolean)&&o.e.expl.some(t=>/Lissage en attente : mardi 10\/11/.test(t))&&!o.e.apercu
  &&o.e2.etatTxt==='lissée'&&o.e2.h.join()==='6.75,6.75,,6.75,6.75,'&&o.e2.apercu&&!o.e2.expl.some(t=>/Lissage en attente/.test(t))&&o.e2.expl.some(t=>/Lissé sur 4 jours \(lun mar jeu ven\) au pas de ¼ h : 6,75 h par jour/.test(t))&&o.s.etat==='incomplet'&&o.s.main===null;
await ouvrir();
// ── n9 : téléphone
await page.setViewportSize({width:390,height:844});await wait(400);await coche('nv-l4',false);o=await page.evaluate(()=>{const m=document.getElementById('nv-tab').closest('.modal,.sheet,[role=dialog]')||document.getElementById('nv-tab').parentElement.parentElement;const r=m.getBoundingClientRect();const hin=document.querySelector('.nav-hin').getBoundingClientRect();
  return {vw:window.innerWidth,doc:document.documentElement.scrollWidth,l:Math.round(r.left),r:Math.round(r.right),hin:[Math.round(hin.left),Math.round(hin.right)],petit:[...document.querySelectorAll('.nav-main input[type=number]')].filter(e=>e.getBoundingClientRect().height<36).length,h:[0,1,2,3,4,5].map(i=>document.getElementById('nv-h'+i).value).join()};});
console.log('n9) téléphone :',J(o),'console :',J(logs.slice(0,5)));
C.n9=o.doc<=o.vw+1&&o.l>=-1&&o.r<=o.vw+1&&o.hin[0]>=0&&o.hin[1]<=o.vw+1&&o.petit===0&&o.h==='11,11,11,11,,'&&logs.length===0;
console.log('RÉSULTATS',J(C));const KO=Object.entries(C).filter(([,v])=>!v).map(([k])=>k);console.log('RESULTAT: '+(KO.length?'ECHEC '+KO.join(','):'TOUT VERT'));await browser.close();process.exit(KO.length?1:0);
