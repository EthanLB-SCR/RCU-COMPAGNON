// e2e_rhpaie_1911.mjs — 19/11/2026 nuit, Ethan : « dans Pilotage il ne doit pas y avoir Variables de paie · rapport RH, on l'a dans le module RH ; Grands déplacements pareil,
//  je préfère faire une section dans le module RH ; Compteurs d'heures pareil » (décor et personnages de démo de e2e_navliss_1011, rien ne part au serveur).
//  p1  Pilotage : plus de lignes « Variables de paie », « Grands déplacements », « Compteurs d'heures » ; le reste est là ; la section s'appelle « Heures & production »
//  p2  RH : onglets « 🧳 Grands déplacements » et « ⏱ Compteurs d'heures » à côté des Navettes ; l'écran des grands déplacements s'affiche DANS le module (onglets visibles)
//  p3  RH → Compteurs d'heures : le tableau des compteurs ; p4 RH → Navettes → « 📊 Rapport de la semaine (CSV) » : le rapport et ses deux CSV
//  p5  tableau de bord RH : raccourcis vers les quatre écrans de paie, avec la pastille « à valider » qu'avait la ligne de Pilotage ; p6 les gestes des écrans marchent sur place (on reste dans RH)
//  p7  les anciens accès (xgo gd / cpt / rapport, depuis n'importe où) mènent aux sections du module RH ; les tutoriels suivent (rh:gd, rh:cpt, rh:paie)
//  p8  droits inchangés : un soudeur n'a ni les onglets ni les raccourcis ; chacun a dans RH exactement ce qu'il avait dans Pilotage
//  p9  module RH éteint pour l'entreprise : les trois lignes reviennent dans Pilotage et s'y ouvrent comme avant (rien n'est perdu)
//  p10 téléphone 390 px : les onglets RH ne débordent pas ; console propre
//  p11 tutoriels : « ? » du module RH ouvre le tutoriel de l'écran (titre « Tracé Ressources humaines · … ») ; un tutoriel déjà vu sous son ancienne clé (pilotage:…) reste « vu » ;
//      📚 Tous les tutoriels : rangés sous Ressources humaines ; module RH éteint : la vue d'ensemble de Pilotage retrouve ses trois étapes et « ? » garde le tutoriel de l'écran
//  p12 assistant 💬 : son manuel range les trois écrans dans RH (plus dans Pilotage) et ne donne leurs tutoriels qu'à ceux qui ont l'écran ; les renvois écrits de l'appli suivent
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

const T=fn=>page.evaluate(fn);const txt=()=>T(()=>(document.getElementById('eq-app')||document.body).textContent.replace(/\s+/g,' '));
const tab=async id=>{await page.evaluate(i=>document.getElementById(i).click(),id);await wait(500);};
const hub=()=>T(()=>({rows:[...document.querySelectorAll('#eq-app .ac-row')].map(r=>(r.querySelector('b')||r).textContent.replace(/\s+/g,' ').trim()),secs:[...document.querySelectorAll('#eq-app .eq-hubsec .ac-h b')].map(b=>b.textContent.replace(/\s+/g,' ').trim())}));
const rh=()=>T(()=>{const A=document.getElementById('eq-app');const q=s=>!!A.querySelector(s);return {titre:(A.querySelector('h2.vt')||{}).textContent||'',tabs:[...A.querySelectorAll('.rh-tabs button')].map(b=>b.textContent.replace(/\s+/g,' ').trim()+(b.classList.contains('primary')?'*':'')),
  gd:q('[data-act="gdmode"]'),cpt:q('.cpt-tab'),paie:q('[data-act="rpcsv"][data-v="paie"]'),nav:q('[data-act="gdnavall"]'),sect:(A.querySelector('.rh-sect')||{}).textContent||'',back:(A.querySelector('.ac-back')||{}).textContent||'',
  home:window.TRACE.state.homeTab,ou:window.TRACE.tuto.where(),btns:[...A.querySelectorAll('.eq-acts button')].map(b=>[...b.childNodes].filter(n=>!(n.classList&&n.classList.contains('ac-n'))).map(n=>n.textContent).join('').replace(/\s+/g,' ').trim()),
  nb:((A.querySelector('[data-act="x"][data-v="rh|tab|paie"] .ac-n')||{}).textContent||'').trim()};});
const rhTab=async k=>{await page.click('[data-act="x"][data-v="rh|tab|'+k+'"]');await wait(700);};
const fake=async(act,v)=>{await page.evaluate(([a,v])=>{const b=document.createElement('button');b.dataset.act=a;b.dataset.v=v;b.style.display='none';document.querySelector('#eq-app').append(b);b.click();},[act,v]);await wait(700);};
const TROIS=/Variables de paie|Grands déplacements|Compteurs d'heures/;let o={};

// ── p1 : Pilotage
await tab('htExpl');o=await hub();console.log('p1) Pilotage :',J(o));
C.p1=!o.rows.some(r=>TROIS.test(r))&&['Pointages à valider','Production par équipe','Demandes d\'annulation','Planning de la semaine'].every(n=>o.rows.some(r=>r.startsWith(n)))&&o.secs.some(s=>/Heures & production/.test(s))&&!o.secs.some(s=>/Heures & paie/.test(s));

// ── p2 : RH → Grands déplacements, dans le module
await tab('htRh');o={h:await rh()};await rhTab('gd');o.g=await rh();o.keys=await T(()=>window.TRACE.tuto.keys().filter(k=>/^(rh|pilotage):(gd|cpt|paie|rapport)$/.test(k)).sort());console.log('p2) RH, grands déplacements :',J(o));
C.p2=/Ressources humaines/.test(o.h.titre)&&o.h.tabs.join('|').startsWith('🏠 Tableau de bord*|✅ Contrôle|🧾 Navettes|🧳 Grands déplacements|⏱ Compteurs d\'heures|🏖 Absences · congés') /* 19/11 nuit : + l'onglet Contrôle */&&o.g.gd&&o.g.tabs.includes('🧳 Grands déplacements*')&&/Ressources humaines/.test(o.g.titre)&&o.g.home==='rh'&&o.g.ou==='rh:gd'&&!o.g.back
  &&o.keys.join()==='rh:cpt,rh:gd,rh:paie';

// ── p3 : compteurs ; p4 : rapport de la semaine depuis les Navettes
o={};await rhTab('cpt');o.c=await rh();await rhTab('nav');o.n=await rh();await rhTab('paie');o.p=await rh();console.log('p3-p4) compteurs, navettes, rapport :',J(o));
C.p3=o.c.cpt&&o.c.tabs.includes('⏱ Compteurs d\'heures*')&&o.c.ou==='rh:cpt'&&o.c.home==='rh';
/* 24/11 (Ethan : « des doublons dans le ruban ») : l'en-tête des Navettes ne garde que le téléchargement et le rapport ; Grands déplacements et Compteurs sont des onglets */
C.p4=o.n.nav&&o.n.btns.includes('📊 Rapport de la semaine (CSV)')&&!['🧳 Grands déplacements','⏱ Compteurs d\'heures','✅ Contrôle'].some(b=>o.n.btns.includes(b))&&['🧳 Grands déplacements','⏱ Compteurs d\'heures','✅ Contrôle'].every(b=>o.n.tabs.some(t=>t.replace('*','')===b))&&o.p.paie&&/Variables de paie · rapport de la semaine/.test(o.p.sect)&&o.p.ou==='rh:paie'&&o.p.home==='rh'&&!o.p.tabs.some(t=>t.endsWith('*'))&&o.n.nb==='1'; /* pastille : Julien a des heures de la semaine dernière à valider */

// ── p5 : raccourcis du tableau de bord ; p6 : les gestes marchent sur place
o={};await rhTab('home');o.h=await rh();await rhTab('nav');await page.evaluate(()=>[...document.querySelectorAll('#eq-app .eq-acts button')].find(b=>/Rapport de la semaine/.test(b.textContent)).click());await wait(700);o.p=await rh(); /* 19/11 nuit (Ethan : « sur le tableau de bord ça ne sert à rien, Variables de paie ») : le rapport s'ouvre depuis les Navettes */
await rhTab('gd');await page.evaluate(()=>{const b=[...document.querySelectorAll('#eq-app [data-act="gdmode"]')].find(x=>!x.classList.contains('active')&&!x.classList.contains('primary'))||document.querySelector('#eq-app [data-act="gdmode"]');b.click();});await wait(900);o.g=await rh();
await rhTab('nav');await rhTab('paie');await page.evaluate(()=>{const b=[...document.querySelectorAll('#eq-app [data-act="rpweek"]')].find(x=>!x.classList.contains('active'));if(b)b.click();});await wait(700);o.p2=await rh();console.log('p5-p6) raccourcis, gestes :',J(o));
/* 24/11 : le tableau de bord n'a plus de raccourcis qui doublent les onglets (« À faire » ouvre l'écran où ça se traite) ; les quatre écrans restent, par les onglets */
C.p5=['🧾 Navettes','✅ Contrôle','🧳 Grands déplacements','⏱ Compteurs d\'heures'].every(b=>o.h.tabs.some(t=>t.replace('*','')===b))&&!o.h.btns.includes('⏱ Compteurs d\'heures')&&!o.h.btns.some(b=>/Variables de paie/.test(b))&&o.p.paie&&o.p.home==='rh'; /* la pastille des heures à valider : sur le bouton des Navettes (p4) */
C.p6=o.g.gd&&o.g.home==='rh'&&o.g.tabs.includes('🧳 Grands déplacements*')&&o.p2.paie&&o.p2.home==='rh';

// ── p7 : les anciens accès mènent au module RH
o={};await tab('htExpl');await fake('xgo','gd');o.g=await rh();await tab('htExpl');await fake('xgo','cpt');o.c=await rh();await tab('htHome');await fake('xgo','rapport');o.p=await rh();console.log('p7) anciens accès :',J({g:[o.g.home,o.g.gd,o.g.ou],c:[o.c.home,o.c.cpt,o.c.ou],p:[o.p.home,o.p.paie,o.p.ou]}));
C.p7=o.g.home==='rh'&&o.g.gd&&o.g.ou==='rh:gd'&&o.c.home==='rh'&&o.c.cpt&&o.c.ou==='rh:cpt'&&o.p.home==='rh'&&o.p.paie&&o.p.ou==='rh:paie';

// ── p8 : droits — chacun a dans RH ce qu'il avait dans Pilotage
const pour=async id=>{await page.evaluate(i=>{const T=window.TRACE;T.state.userId=i;T.renderHome();},id);await wait(500);const can=await T(()=>{const c=k=>window.TRACE.acces.can(k);return {plan:c('planning.edit'),val:c('pointage.validate'),rh:c('rh.voir')||c('rh.edit')};});
  let r=null;if(await page.$('#htRh')&&await T(()=>document.getElementById('htRh').style.display!=='none')){await tab('htRh');r=await rh();}let pil=null;if(await T(()=>{const b=document.getElementById('htExpl');return !!b&&b.style.display!=='none';})){await tab('htExpl');pil=await hub();}return {can,rh:r,pil};};
o={k:await pour('karim'),s:await pour('sophie')};console.log('p8) droits :',J({karim:[o.k.can,o.k.rh&&o.k.rh.tabs,o.k.rh&&o.k.rh.btns],sophie:[o.s.can,o.s.rh&&o.s.rh.tabs,o.s.rh&&o.s.rh.btns,o.s.pil&&o.s.pil.rows.filter(r=>TROIS.test(r))]}));
const aTab=(R,t)=>!!R&&R.tabs.some(x=>x.replace('*','')===t);
C.p8=!!o.k.rh&&!aTab(o.k.rh,'🧳 Grands déplacements')&&!aTab(o.k.rh,'⏱ Compteurs d\'heures')&&!o.k.rh.btns.some(b=>TROIS.test(b))
  &&!!o.s.rh&&aTab(o.s.rh,'🧳 Grands déplacements')===!!o.s.can.plan&&aTab(o.s.rh,'⏱ Compteurs d\'heures')===!!o.s.can.rh&&o.s.rh.btns.some(b=>/Variables de paie/.test(b))===!!(o.s.can.val&&o.s.can.plan)&&(!o.s.pil||!o.s.pil.rows.some(r=>TROIS.test(r)));

// ── p9 : module RH éteint → les trois lignes reviennent dans Pilotage et s'y ouvrent
o={};await page.evaluate(async()=>{const T=window.TRACE;T.state.userId='ethan';await T.band.setModules(['rh']);T.renderHome();});await wait(600);await tab('htExpl');o.h=await hub();o.rhTab=await T(()=>{const b=document.getElementById('htRh');return !!b&&b.style.display!=='none';});o.nbPil=await T(()=>{const r=[...document.querySelectorAll('#eq-app .ac-row')].find(x=>/Variables de paie/.test(x.textContent));const n=r&&r.querySelector('.ac-n');return n?n.textContent.trim():'';});
await page.evaluate(()=>[...document.querySelectorAll('#eq-app .ac-row')].find(x=>/Grands déplacements/.test(x.textContent)).click());await wait(900);o.g=await rh();
await page.evaluate(async()=>{const T=window.TRACE;await T.band.setModules([]);T.renderHome();});await wait(600);await tab('htExpl');o.h2=await hub();console.log('p9) module RH éteint :',J({rows:o.h.rows.filter(r=>TROIS.test(r)),secs:o.h.secs,rhTab:o.rhTab,g:[o.g.home,o.g.gd,o.g.back],apres:o.h2.rows.filter(r=>TROIS.test(r))}));
C.p9=!o.rhTab&&['Variables de paie · rapport RH','Grands déplacements','Compteurs d\'heures'].every(n=>o.h.rows.some(r=>r.startsWith(n)))&&o.h.secs.some(s=>/Heures & paie/.test(s))&&o.g.gd&&o.g.home==='expl'&&/Pilotage/.test(o.g.back)&&!o.h2.rows.some(r=>TROIS.test(r))&&o.nbPil==='1';

// ── p11 : tutoriels
const etapes=async k=>{await page.evaluate(k=>window.TRACE.tuto.start(k),k);await wait(300);const out=[];for(let i=0;i<30;i++){const t=await T(()=>{const c=document.querySelector('#tuto .tutoCard .tutoT');return c?c.textContent:null;});if(t===null)break;out.push(t);const b=await page.$('#tuto .tutoGo');if(!b)break;await b.click();await wait(130);}await T(()=>window.TRACE.tuto.close(null));return out;};
o={};await page.evaluate(()=>{const T=window.TRACE;T.state.userId='ethan';T.renderHome();});await wait(400);await T(()=>localStorage.removeItem('trace:tuto:l:ethan'));await tab('htRh');await rhTab('gd');
o.help=await T(()=>!!document.querySelector('#homeBody h2.vt .tuHelp'));if(o.help){await page.click('#homeBody h2.vt .tuHelp');await wait(450);}
o.card=await T(()=>{const c=document.querySelector('#tuto .tutoCard');const h=document.querySelector('#tuto .tutoHole');return c?{mod:c.querySelector('.tutoMod').textContent,k:(window.TRACE.tuto.open()||{}).k,hole:!!h&&getComputedStyle(h).display!=='none'}:null;});await T(()=>window.TRACE.tuto.close(null));
o.vu0=await T(()=>['rh:gd','rh:cpt','rh:paie'].map(k=>window.TRACE.tuto.seen(k)));
await T(()=>localStorage.setItem('trace:tuto:l:ethan',JSON.stringify({'pilotage:gd':{how:'fait',at:'2026-11-01T08:00:00.000Z'},'pilotage:rapport':{how:'passe',at:'2026-11-01T08:00:00.000Z'}})));
o.vu1=await T(()=>['rh:gd','rh:cpt','rh:paie'].map(k=>window.TRACE.tuto.seen(k)));
await T(()=>window.TRACE.tuto.catalog());await wait(350);
o.cat=await T(()=>Object.fromEntries([...document.querySelectorAll('#modal .tuCatM')].map(m=>[m.querySelector('b').textContent.trim(),[...m.querySelectorAll('.tuCatI')].map(i=>i.querySelector('span').textContent+(/✓/.test(i.querySelector('small').textContent)?' ✓':''))]).filter(([k])=>/Ressources humaines|Pilotage/.test(k))));
await T(()=>{const b=document.querySelector('#modal [data-close]');if(b)b.click();});await wait(250);await T(()=>localStorage.removeItem('trace:tuto:l:ethan'));
await tab('htExpl');o.ov=await etapes('pilotage');
await page.evaluate(async()=>{const T=window.TRACE;await T.band.setModules(['rh']);T.renderHome();});await wait(600);await tab('htExpl');o.ovOff=await etapes('pilotage');
await page.evaluate(()=>[...document.querySelectorAll('#eq-app .ac-row')].find(x=>/Grands déplacements/.test(x.textContent)).click());await wait(900);
o.off={ou:await T(()=>window.TRACE.tuto.where()),best:await T(()=>window.TRACE.tuto.best()),help:await T(()=>!!document.querySelector('#homeBody h2.vt .tuHelp'))};
await page.evaluate(async()=>{const T=window.TRACE;await T.band.setModules([]);T.renderHome();});await wait(600);await T(()=>localStorage.removeItem('trace:tuto:l:ethan'));
console.log('p11) tutoriels :',J({help:o.help,card:o.card,vu0:o.vu0,vu1:o.vu1,cat:{rh:o.cat['Tracé Ressources humaines'],pil:(o.cat['Tracé Pilotage']||[]).filter(t=>TROIS.test(t))},ov:o.ov.filter(t=>TROIS.test(t)),ovOff:o.ovOff.filter(t=>TROIS.test(t)),off:o.off}));
C.p11=o.help&&!!o.card&&o.card.k==='rh:gd'&&o.card.mod.startsWith('Tracé Ressources humaines · Grands déplacements')&&o.card.hole&&o.vu0.join()==='false,false,false'&&o.vu1.join()==='true,false,true'
  &&['Compteurs d\'heures','Grands déplacements ✓','Variables de paie ✓','Vue d\'ensemble du module','Navettes','Contrôle','Absences et congés','Contraventions','Mutuelle'].every(t=>(o.cat['Tracé Ressources humaines']||[]).includes(t)) /* 24/11 nuit : + les tutoriels des autres onglets du module (tutos_rh.js) */&&!(o.cat['Tracé Pilotage']||[]).some(t=>TROIS.test(t))&&(o.cat['Tracé Pilotage']||[]).length>=10
  &&o.ov.length>=8&&!o.ov.some(t=>TROIS.test(t))&&['Variables de paie · rapport RH','Grands déplacements','Compteurs d\'heures'].every(t=>o.ovOff.includes(t))&&o.off.ou==='pilotage:gd'&&o.off.best==='rh:gd'&&o.off.help;

// ── p12 : manuel de l'assistant et renvois écrits
const man=async id=>{await page.evaluate(i=>{const T=window.TRACE;T.state.userId=i;T.renderHome();document.getElementById('htHome').click();},id);await wait(500);return T(()=>window.TRACE.ia.manuel());};
{const mE=await man('ethan'),mK=await man('karim');const tit=m=>m.split('\n').filter(l=>/^## Tracé Ressources humaines/.test(l)).map(l=>l.slice(3));
 const pil=m=>{const i=m.indexOf('## Tracé Pilotage\n');if(i<0)return null;const j=m.indexOf('\n## ',i+3);return m.slice(i,j<0?undefined:j).split('\n').filter(l=>/^- (Variables de paie|Grands déplacements|Compteurs d'heures)/.test(l));};
 o={e:tit(mE),k:tit(mK),pil:pil(mE),struct:(/- Pilotage \(encadrement\) : [^\n]*/.exec(mE)||[''])[0],rhl:(/- RH : [^\n]*/.exec(mE)||[''])[0],dit:/ne sont plus dans Pilotage/.test(mE)};}
await page.evaluate(async()=>{const w=ms=>new Promise(r=>setTimeout(r,ms));const T=window.TRACE;T.state.userId='ethan';T.renderHome();await w(200);document.getElementById('htExpl').click();await w(250);T.espace.fiche('l:julien');await w(500);});
o.fiche=await T(()=>[...document.querySelectorAll('#eq-app .cpt-card .hint')].map(h=>h.textContent.replace(/\s+/g,' ')).join(' ¦ '));await T(()=>window.TRACE.espace.fiche(null));await wait(200);
await tab('htExpl');await page.evaluate(()=>[...document.querySelectorAll('#eq-app .ac-row')].find(x=>/Production par équipe/.test(x.textContent)).click());await wait(600);o.prod=(await txt()).match(/Le rapport de paie est à part[^.]*\./);o.prod=o.prod?o.prod[0]:'';
console.log('p12) assistant et renvois :',J({e:o.e,k:o.k,pil:o.pil,struct:o.struct.slice(0,170),rhl:o.rhl.slice(0,150),dit:o.dit,fiche:(o.fiche.match(/Import des soldes[^.]*\./)||[''])[0],prod:o.prod}));
const RH3=['Tracé Ressources humaines · Variables de paie','Tracé Ressources humaines · Grands déplacements','Tracé Ressources humaines · Compteurs d\'heures'],RHG=RH3.concat(['Tracé Ressources humaines · Navettes','Tracé Ressources humaines · Contrôle','Tracé Ressources humaines · Accidents']); /* 24/11 nuit : tutoriels RH ajoutés — Karim a ceux de SON dossier, jamais ceux de la gestion */
C.p12=RH3.every(t=>o.e.includes(t))&&o.e.includes('Tracé Ressources humaines · Navettes')&&!RHG.some(t=>o.k.includes(t))&&o.k.includes('Tracé Ressources humaines · Absences et congés')&&Array.isArray(o.pil)&&o.pil.length===0
  &&o.struct.length>40&&!/variables de paie|grands déplacements|compteurs d'heures/i.test(o.struct)&&/grands déplacements, compteurs d'heures, variables de paie/.test(o.rhl)&&o.dit
  &&/Import des soldes de tout le monde : RH → ⏱ Compteurs d'heures\./.test(o.fiche)&&!/Pilotage → Heures & paie/.test(o.fiche)&&/à part \(RH → Variables de paie\)\./.test(o.prod);

// ── p10 : téléphone
await page.setViewportSize({width:390,height:844});await wait(400);await tab('htRh');await rhTab('cpt');o=await T(()=>{const t=document.querySelector('#eq-app .rh-tabs').getBoundingClientRect();return {vw:window.innerWidth,doc:document.documentElement.scrollWidth,tabs:[Math.round(t.left),Math.round(t.right)],petit:[...document.querySelectorAll('#eq-app .rh-tabs button')].filter(b=>b.getBoundingClientRect().height<32).length};});
console.log('p10) téléphone :',J(o),'console :',J(logs.slice(0,5)));C.p10=o.doc<=o.vw+1&&o.tabs[0]>=0&&o.tabs[1]<=o.vw+1&&o.petit===0&&logs.length===0;
console.log('RÉSULTATS',J(C));const KO=Object.entries(C).filter(([,v])=>!v).map(([k])=>k);console.log('RESULTAT: '+(KO.length?'ECHEC '+KO.join(','):'TOUT VERT'));await browser.close();process.exit(KO.length?1:0);
