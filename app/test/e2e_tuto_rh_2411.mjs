// e2e_tuto_rh_2411.mjs — 24/11/2026 (nuit) : TUTORIELS DU MODULE RESSOURCES HUMAINES (src/tutos_rh.js). Ethan (24/11 au soir) : « revois tous les tutos avec les nouveautés ».
// Démo hors connexion, données 100 % FICTIVES (chantier « Villefictive — Centre », intérimaire « Nina FICTIVE · Agence Fictive »), aujourd'hui mardi 01/12/2026.
//  r1  fichier : 9 clés (rh + 8 onglets), chaque option nommée, titres ≤ 40 caractères et uniques, textes ≤ 200 caractères et ≤ 2 phrases, cibles robustes ; l'appli connaît les clés
//  r2  390 px, gestion (Ethan, administrateur) : CHAQUE onglet ouvert → TRACE.tuto.where() = sa clé, le « ? » du titre lance CE tutoriel, toutes les étapes déroulées, chaque cible
//      surlignée et vraiment à l'écran, carte dans l'écran, boutons ≥ 44 px ; 3 à 8 étapes par onglet
//  r3  390 px, « mon dossier » (Karim, soudeur) : ses onglets seulement ; pas d'étape de gestion (Demandes à traiter, ＋ Absence, ＋ Contravention…) ; le RH « Ton dossier RH »
//  r4  Julien (absence posée par le bureau « à faire signer ») : l'étape « ✍ À signer » surligne la carte À signer
//  r5  360 px : Navettes et Absences (gestion) — mêmes contrôles
//  r6  1re arrivée (drapeau de test des tutoriels) : RH → vue d'ensemble ; 1er passage sur Navettes → son tutoriel ; plus rien ensuite ; 📚 range les nouvelles clés sous « Tracé Ressources humaines »
//  r7  anciens tutoriels du module inchangés (rh:gd, rh:cpt, rh:paie toujours lancés par leur écran) ; console propre
import { chromium } from 'playwright';
import path from 'path';import {fileURLToPath} from 'url';
const here=path.dirname(fileURLToPath(import.meta.url));
const BASE=process.env.BASE||'http://127.0.0.1:8844';
const M=await import(path.join(here,'..','src','tutos_rh.js'));const TU=M.default,NOMS=M.NOMS;const MP=await import(path.join(here,'..','src','tutos_pilotage.js'));const DEFS=Object.assign({},MP.default,TU); /* rh:gd, rh:cpt, rh:paie sont dans tutos_pilotage.js */
const C={};const logs=[];const J=x=>JSON.stringify(x);
/* ── r1 : le fichier ── */
const KEYS=['rh','rh:ctl','rh:nav','rh:abs','rh:hab','rh:form','rh:pv','rh:mut','rh:acc'];
const phrases=s=>(String(s).replace(/« \? »/g,'').match(/[.!?](\s|$)/g)||[]).length;
const o={miss:KEYS.filter(k=>!TU[k]),extra:Object.keys(TU).filter(k=>!KEYS.includes(k)),noms:KEYS.filter(k=>k.includes(':')&&!NOMS[k]),pb:[]};
for(const [k,st] of Object.entries(TU)){const T=st.map(s=>s.titre);if(new Set(T).size!==T.length)o.pb.push(k+' : titres en double');
  st.forEach((s,i)=>{const w=k+' #'+(i+1)+' « '+s.titre+' »';if(!s.titre||s.titre.length>40)o.pb.push(w+' titre '+(s.titre||'').length);if(!s.texte||s.texte.length>200)o.pb.push(w+' texte '+(s.texte||'').length);if(phrases(s.texte)>2)o.pb.push(w+' '+phrases(s.texte)+' phrases');
    if(s.sel&&/:nth-|:contains|text=|:has-text/.test(s.sel))o.pb.push(w+' cible fragile');if(/\b(les gars|Logstor|Renalia|Bain-de-Bretagne|Saint-Lô)\b/i.test(s.texte+s.titre))o.pb.push(w+' mot à éviter');});}
console.log('r1) fichier :',J(o));
/* ── navigateur ── */
const browser=await chromium.launch({headless:true,executablePath:process.env.CHROMIUM_PATH||undefined});
let ctx=await browser.newContext({viewport:{width:390,height:844},isMobile:true,hasTouch:true,deviceScaleFactor:1});let page=await ctx.newPage();
const wait=ms=>page.waitForTimeout(ms);
const hook=p=>{p.on('pageerror',e=>logs.push('PAGEERROR: '+e.message.slice(0,300)));p.on('console',m=>{if(m.type()==='error'&&!/supabase|Failed to fetch|net::ERR|404|geopf|WebSocket|open-meteo|nominatim|ERR_/i.test(m.text()))logs.push(m.text().slice(0,200));});p.on('dialog',d=>d.accept().catch(()=>{}));
  p.route(u=>/(^|\.)geopf\.fr$|^geo\.api\.gouv\.fr$|open-meteo\.com$/.test(u.hostname),r=>r.fulfill({status:200,contentType:'application/json',body:'{"type":"FeatureCollection","features":[],"results":[]}'}));};
hook(page);
const SEED=async()=>page.evaluate(async()=>{const T=window.TRACE;const w=ms=>new Promise(r=>setTimeout(r,ms));document.getElementById('htRh').click();await w(400);
  T.rh.provTest('nina',{prenom:'Nina',nom:'FICTIVE',poste:'soudeur',type:'interim',agence:'Agence Fictive'});
  const src=T.sites[Object.keys(T.sites).find(k=>k!=='__vide'&&T.sites[k]&&T.sites[k].lines)];const x=JSON.parse(JSON.stringify(src));x.id='demo_vf';x.name='Villefictive — Centre';x.fiche={ville:'Caen',secteur:'ouest',chef:'l:ethan'};x.conv={msgs:[],seq:1};x.qse={docs:[]};delete x.geo;T.sites.demo_vf=x;
  const ST=T.espace.state();
  const wkKey=s=>{const x2=new Date(s+'T12:00:00');x2.setDate(x2.getDate()+3-((x2.getDay()+6)%7));const y=x2.getFullYear();const j=new Date(y,0,4);const n=1+Math.round(((x2-j)/864e5-3+((j.getDay()+6)%7))/7);return y+'-W'+String(n).padStart(2,'0');};
  const add=(s,n)=>{const d=new Date(s+'T12:00:00');d.setDate(d.getDate()+n);return d.getFullYear()+'-'+String(d.getMonth()+1).padStart(2,'0')+'-'+String(d.getDate()).padStart(2,'0');};
  const end=h=>{const m=420+60+Math.round(h*60);return String(Math.floor(m/60)).padStart(2,'0')+':'+String(m%60).padStart(2,'0');};
  const HRS={'l:julien':{'2026-11-16':[9,9,9.5,9,null],'2026-11-23':[8,8,8,8,8],'2026-11-30':[8,null,null,null,null]},'l:karim':{'2026-11-16':[8.3,8.3,8.3,8.3,null],'2026-11-23':[9,9,9,9,null],'2026-11-30':[8,null,null,null,null]}};
  Object.keys(HRS).forEach(p=>Object.keys(HRS[p]).forEach(mon=>{const pj={};HRS[p][mon].forEach((h,i)=>{pj[add(mon,i)]=['demo_vf'];});T.espace.savePlanning(wkKey(mon),{[p]:pj});}));
  Object.keys(HRS).forEach(p=>Object.keys(HRS[p]).forEach(mon=>HRS[p][mon].forEach((h,i)=>{if(h===null)return;const d=add(mon,i);ST.pointages.push({p,d,site:'demo_vf',status:'declare',corr:null,events:[{t:'start',at:d+'T07:00'},{t:'pause',at:d+'T12:00'},{t:'resume',at:d+'T13:00'},{t:'end',at:d+'T'+end(h)}],val:[]});})));
  const now='2026-11-30T09:00:00.000Z',PNG='data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==';
  const ok=[T.rh.testSet('rhdem','l:karim|d|1',{t:'dem',p:'l:karim',pKey:'l:karim',type:'cp',du:'2026-12-14',au:'2026-12-18',jours:5,jCpt:0,note:'',sig:{png:PNG,at:now,par:'Karim'},statut:'demande',at:now,upd:now,by:'Karim'}),
    T.rh.testSet('rhpv','l:karim|pv1',{recu:'2026-11-20',date:'2026-11-12',veh:'',p:'l:karim',pKey:'l:karim',lieu:'Villefictive (essai)',infraction:'Stationnement (essai)',montant:35,statut:'designee',hist:[{s:'recue',at:'2026-11-20T08:00:00.000Z',par:'Démo'},{s:'designee',at:'2026-11-21T08:00:00.000Z',par:'Démo'}],at:now}),
    T.rh.testSet('rhabs','l:julien|abs1',{p:'l:julien',type:'cp',du:'2026-12-21',au:'2026-12-24',jours:4,note:'',aSigner:true,at:now,by:'Démo'}),
    T.rh.testSet('rhmut','l:julien|mut1',{p:'l:julien',statut:'affilie',regime:'',effet:'2026-01-01',bulletin:true,at:now})];
  return ok.every(Boolean)&&ST.pointages.length;});
const start=async(flag)=>{await page.clock.install({time:new Date(2026,11,1,8,30,0)});await page.goto(BASE+'/index.html');await wait(500);
  await page.evaluate(f=>{localStorage.clear();if(f)localStorage.setItem('trace:tuto:test','1');},flag);await page.evaluate(()=>new Promise(r=>{try{const q=indexedDB.deleteDatabase('trace-kv');q.onsuccess=q.onerror=q.onblocked=()=>r();}catch(e){r();}}));
  await page.reload();await wait(1300);const s=await page.$('#loginSkip');if(s&&await s.isVisible())await s.click();await wait(600);return await SEED();};
const seeded=await start(false);console.log('données :',seeded);
const as=async id=>{await page.evaluate(id=>{const T=window.TRACE;T.state.userId=id;T.showScreen('home');T.renderHome();document.getElementById('htHome').click();},id);await wait(400);};
const rh=async t=>{await page.evaluate(async t=>{const w=ms=>new Promise(r=>setTimeout(r,ms));const tc=document.querySelector('#tuto .tutoSkip, #tuto [data-tu-skip]');if(tc)tc.click();document.getElementById('htRh').click();await w(450);const b=document.querySelector('#eq-app [data-act="x"][data-v="rh|tab|'+t+'"]');if(b){b.click();await w(650);}},t);};
const where=()=>page.evaluate(()=>window.TRACE.tuto.where());
const card=()=>page.evaluate(()=>{const r=document.getElementById('tuto');if(!r)return null;const c=r.querySelector('.tutoCard'),h=r.querySelector('.tutoHole');const rc=c.getBoundingClientRect();
  return {mod:c.querySelector('.tutoMod').textContent,t:c.querySelector('.tutoT').textContent,hole:!!h&&getComputedStyle(h).display!=='none',in:rc.left>=0&&rc.right<=innerWidth+0.5&&rc.top>=0&&rc.bottom<=innerHeight+0.5,
    btn:Math.min(...[...c.querySelectorAll('button')].map(b=>b.getBoundingClientRect().height)),open:window.TRACE.tuto.open()};});
const frac=sel=>page.evaluate(sel=>{for(const q of String(sel).split(',')){let el=null;try{el=document.querySelector(q.trim());}catch(e){}if(!el)continue;const r=el.getBoundingClientRect();if(r.width<4||r.height<4)continue;
  const cs=getComputedStyle(el);if(cs.visibility==='hidden'||cs.display==='none')continue;if(r.bottom<0||r.top>innerHeight||r.right<0||r.left>innerWidth)continue;
  const hb=document.getElementById('homeBody');const top=hb?Math.max(0,hb.getBoundingClientRect().top):0;const vis=Math.max(0,Math.min(r.bottom,innerHeight)-Math.max(r.top,top));
  return {f:Math.round(100*vis/Math.max(1,Math.min(r.height,innerHeight-top)))/100,haut:r.top<top};}return null;},sel);
const WARN=[];
const run=async k=>{const defs=DEFS[k]||[];const out={k,steps:[],miss:[],out:[],small:[],cut:[],n:0};const c0=await card();if(!c0||!c0.open||c0.open.k!==k){out.err='pas ouvert ('+J(c0&&c0.open)+')';return out;}out.n=c0.open.n;out.mod=c0.mod;
  for(let i=0;i<out.n;i++){await wait(130);const c=await card();if(!c)break;const d=defs.find(s=>s.titre===c.t);out.steps.push(c.t+(c.hole?' ◉':''));
    if(d&&d.sel&&!c.hole)out.miss.push(c.t);if(d&&d.sel&&c.hole){const f=await frac(d.sel);if(f&&f.f<0.6){if(f.haut)out.cut.push(c.t+' '+f.f);else WARN.push(k+' « '+c.t+' » '+f.f);}}if(!d)out.miss.push('?'+c.t);if(!c.in)out.out.push(c.t);if(c.btn<44)out.small.push(c.t);
    const b=await page.$('#tuto .tutoGo');if(!b)break;await b.click();}
  await wait(150);out.closed=!(await page.$('#tuto'));return out;};
const help=async()=>{const h=await page.$('#homeBody h2.vt .tuHelp');if(!h)return false;await h.click();await wait(300);return true;};
const ok=r=>!r.err&&r.n>=1&&!r.miss.length&&!r.out.length&&!r.small.length&&!r.cut.length&&r.closed;
const nOk=(r,k)=>k.includes(':')?(r.n>=3&&r.n<=8):r.n>=2;
const show=r=>({k:r.k,n:r.n,err:r.err,steps:r.steps,miss:r.miss,out:r.out,small:r.small,cut:r.cut});
const tab=k=>k==='rh'?'home':k.split(':')[1];
const ouvre=async k=>{await rh(tab(k));const w=await where();const h=await help();const r=await run(k);r.where=w;r.help=h;return r;};
/* ── r2 : gestion ── */
await as('ethan');const R2={};for(const k of KEYS)R2[k]=await ouvre(k);
for(const k of KEYS)console.log('r2) '+k+' :',J(Object.assign(show(R2[k]),{where:R2[k].where,help:R2[k].help})));
C.r1=!o.miss.length&&!o.extra.length&&!o.noms.length&&!o.pb.length&&await page.evaluate(K=>K.every(k=>window.TRACE.tuto.keys().includes(k)),KEYS);
C.r2=KEYS.every(k=>R2[k].where===k&&R2[k].help&&ok(R2[k])&&nOk(R2[k],k))&&/^Tracé Ressources humaines · 1 \//.test(R2.rh.mod)&&/^Tracé Ressources humaines · Navettes · 1 \//.test(R2['rh:nav'].mod)
  &&R2['rh:abs'].steps.some(s=>s==='📨 Demandes à traiter ◉')&&R2.rh.steps.some(s=>s==='Ressources humaines')&&!R2.rh.steps.some(s=>/Ton dossier/.test(s));
/* ── r3 : mon dossier ── */
await as('karim');const KM=['rh','rh:abs','rh:hab','rh:form','rh:pv','rh:mut'];const R3={};for(const k of KM)R3[k]=await ouvre(k);
const tabsK=await page.evaluate(()=>[...document.querySelectorAll('#eq-app .rh-tabs [data-act="x"]')].map(b=>b.dataset.v.split('|')[2]));
for(const k of KM)console.log('r3) '+k+' :',J(Object.assign(show(R3[k]),{where:R3[k].where})));console.log('r3) onglets de Karim :',J(tabsK));
const GEST=['📨 Demandes à traiter','＋ Absence','＋ Contravention','✏️ Le statut','＋ Ligne mutuelle','＋ Habilitation','＋ Formation','Tous · Salariés · Intérimaires','À faire','🧾 Navettes','✅ Contrôle'];
C.r3=KM.every(k=>R3[k].where===k&&ok(R3[k])&&R3[k].n>=2)&&J(tabsK)===J(['home','abs','hab','form','pv','mut'])&&R3.rh.steps.some(s=>s==='Ton dossier RH')
  &&!KM.some(k=>R3[k].steps.some(s=>GEST.includes(s.replace(' ◉',''))))&&R3['rh:pv'].steps[0]==='Tes contraventions'&&R3['rh:abs'].steps.includes('＋ Demander un congé ◉');
/* ── r4 : une absence à signer ── */
await as('julien');const r4=await ouvre('rh:abs');const sig=await page.evaluate(()=>!!document.querySelector('#eq-app [data-tu="a-signer"]'));console.log('r4) Julien :',J(Object.assign(show(r4),{carte:sig})));
C.r4=sig&&ok(r4)&&r4.steps.includes('✍ À signer ◉');
/* ── r5 : 360 px ── */
await page.setViewportSize({width:360,height:740});await as('ethan');const r5a=await ouvre('rh:nav'),r5b=await ouvre('rh:abs');console.log('r5) 360 :',J([show(r5a),show(r5b)]));
C.r5=ok(r5a)&&ok(r5b);await page.setViewportSize({width:390,height:844});
/* ── r7 (1re partie) : les trois anciens tutoriels du module ── */
const anc={};for(const [k,t] of [['rh:gd','gd'],['rh:cpt','cpt']]){await rh(t);anc[k]={where:await where(),help:await help()};const r=await run(k);anc[k].ok=ok(r);anc[k].n=r.n;}
await rh('nav');await page.evaluate(()=>{const b=document.querySelector('#eq-app [data-act="x"][data-v="rh|tab|paie"]');if(b)b.click();});await wait(700);anc['rh:paie']={where:await where(),help:await help()};{const r=await run('rh:paie');anc['rh:paie'].ok=ok(r);anc['rh:paie'].n=r.n;}
console.log('r7) anciens :',J(anc));
/* ── r6 : 1re arrivée ── */
await ctx.close();ctx=await browser.newContext({viewport:{width:390,height:844},isMobile:true,hasTouch:true,deviceScaleFactor:1});page=await ctx.newPage();hook(page);await start(true);
await page.evaluate(()=>{const T=window.TRACE;T.state.userId='ethan';T.showScreen('home');T.renderHome();});await wait(300);await page.evaluate(()=>{window.TRACE.tuto.close('passe');window.TRACE.tuto.reset();});
await page.evaluate(()=>document.getElementById('htRh').click());await wait(2600);const a1=await page.evaluate(()=>window.TRACE.tuto.open());await page.evaluate(()=>window.TRACE.tuto.close('passe'));
await page.evaluate(()=>{const b=document.querySelector('#eq-app [data-act="x"][data-v="rh|tab|nav"]');if(b)b.click();});await wait(2600);const a2=await page.evaluate(()=>window.TRACE.tuto.open());await page.evaluate(()=>window.TRACE.tuto.close('passe'));
await page.evaluate(()=>{const b=document.querySelector('#eq-app [data-act="x"][data-v="rh|tab|abs"]');if(b)b.click();});await wait(400);await page.evaluate(()=>{const b=document.querySelector('#eq-app [data-act="x"][data-v="rh|tab|nav"]');if(b)b.click();});await wait(2600);const a3=await page.evaluate(()=>window.TRACE.tuto.open());
await page.evaluate(()=>{if(window.TRACE.tuto.open())window.TRACE.tuto.close('passe');window.TRACE.tuto.catalog();});await wait(500);
const cat=await page.evaluate(()=>{const m=document.querySelector('#modal.show');return m?m.textContent.replace(/\s+/g,' '):'';});
console.log('r6) arrivées :',J([a1&&a1.k,a2&&a2.k,a3&&a3.k]),'catalogue :',/Ressources humaines/.test(cat),/Navettes/.test(cat),/Contraventions/.test(cat),/Mutuelle/.test(cat));
C.r6=!!a1&&a1.k==='rh'&&!!a2&&a2.k==='rh:nav'&&!a3&&/Navettes/.test(cat)&&/Contraventions/.test(cat)&&/Absences et congés/.test(cat);
C.r7=Object.entries(anc).every(([k,v])=>v.where===k&&v.help&&v.ok)&&!logs.length;
if(WARN.length)console.log('avertissements (cible à cheval sur le bas de l\'écran) :',J(WARN));
console.log('console :',J(logs));
console.log(Object.entries(C).map(([k,v])=>k+':'+(v?'✓':'✗')).join(' '));
console.log('RESULTAT:',Object.values(C).every(Boolean)?'TOUT VERT':'ÉCHEC');
await browser.close();
