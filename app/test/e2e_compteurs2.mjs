// COMPTEURS D'HEURES — DROITS, IMPORT DU COMPTEUR EXISTANT, CAS DE DÉPLACEMENT FORCÉ (13/10/2026 f, Ethan : « il n'y a que les RH et moi qui peuvent modifier la durée du
// contrat, les compteurs… ; sur la fiche, forcer un cas de déplacement (certains gars ont toujours le même cas, peu importe la distance) ; ces choses-là visibles que par
// le gérant, la direction, moi et RH, modifiables que par moi et RH » ; « je vais importer le compteur existant »). Personnages de démo, rien ne part au serveur.
import { chromium } from 'playwright';
import fs from 'fs';
import os from 'os';
import path from 'path';
import { openXlsx } from '../src/xlsx.js';
const BASE=process.env.BASE||'http://localhost:8765';
const browser=await chromium.launch({headless:true, executablePath: process.env.CHROMIUM_PATH||undefined});
const ctx=await browser.newContext({viewport:{width:1100,height:1000},acceptDownloads:true});const page=await ctx.newPage();
const logs=[];page.on('pageerror',e=>logs.push('PAGEERROR: '+e.message.slice(0,300)));page.on('console',m=>{if(m.type()==='error'&&!/supabase|Failed to fetch|net::ERR|404|WebSocket/i.test(m.text()))logs.push(m.text().slice(0,200));});
page.on('dialog',d=>d.accept().catch(()=>{}));
const strip=s=>String(s||'').normalize('NFD').replace(/[̀-ͯ]/g,'').toLowerCase().replace(/[-']/g,' ').replace(/\s+/g,' ').trim();
await page.route(u=>/(^|\.)geopf\.fr$/.test(u.hostname),route=>{const q=strip(new URL(route.request().url()).searchParams.get('q'));const F=(lon,lat,pc)=>({type:'FeatureCollection',features:[{type:'Feature',geometry:{type:'Point',coordinates:[lon,lat]},properties:{postcode:pc,type:'municipality'}}]});
  const body=q.includes('rennes')?F(-1.6778,48.1173,'35000'):q==='caen'?F(-0.3707,49.1829,'14000'):{type:'FeatureCollection',features:[]};route.fulfill({status:200,contentType:'application/json',body:JSON.stringify(body)});});
await page.route(u=>u.hostname==='geo.api.gouv.fr',route=>route.fulfill({status:200,contentType:'application/json',body:'[]'}));
await page.route(u=>/open-meteo\.com$/.test(u.hostname),route=>route.fulfill({status:200,contentType:'application/json',body:JSON.stringify({results:[],daily:{time:[],weathercode:[],temperature_2m_max:[],precipitation_sum:[],precipitation_probability_max:[]}})}));
const C={};const wait=ms=>page.waitForTimeout(ms);
await page.clock.install({time:new Date(2026,9,13,8,30,0)}); /* mardi 13/10/2026 */
await page.goto(BASE+'/index.html');await wait(600);await page.evaluate(()=>{localStorage.clear();localStorage.setItem('trace:wide','1');});await page.evaluate(()=>new Promise(r=>{try{const q=indexedDB.deleteDatabase('trace-kv');q.onsuccess=q.onerror=q.onblocked=()=>r();}catch(e){r();}}));
await page.reload();await wait(1200);{const s=await page.$('#loginSkip');if(s&&await s.isVisible())await s.click();await wait(700);}
// ── 0) Julien (Rennes) sur Caen du 31/08 au 25/09 (lun → ven) ; semaine du 7/09 pointée 5 × 10 h = 50 h (2 h au-delà de 48), les autres 8 h / jour
await page.evaluate(()=>{const T=window.TRACE;const src=T.sites[Object.keys(T.sites).find(k=>k!=='__vide'&&T.sites[k]&&T.sites[k].lines)];const x=JSON.parse(JSON.stringify(src));x.id='demo_caen';x.name='Caen — Presqu\'île';x.fiche={ville:'Caen',secteur:'ouest',chef:'l:ethan'};x.conv={msgs:[],seq:1};x.qse={docs:[]};delete x.geo;T.sites.demo_caen=x;
  const ST=T.espace.state();const P=ST.people;P['l:julien']=Object.assign({},P['l:julien']||{},{adresse:{voie:'4 rue des Essais',cp:'35000',ville:'RENNES'}});
  const iso=d=>d.getFullYear()+'-'+String(d.getMonth()+1).padStart(2,'0')+'-'+String(d.getDate()).padStart(2,'0');const wkKey=d=>{const x2=new Date(d);x2.setDate(x2.getDate()+3-((x2.getDay()+6)%7));const y=x2.getFullYear();const j=new Date(y,0,4);const n=1+Math.round(((x2-j)/864e5-3+((j.getDay()+6)%7))/7);return y+'-W'+String(n).padStart(2,'0');};
  for(let k=0;k<4;k++){const mon=new Date(2026,7,31+7*k,12);const pj={};for(let i=0;i<5;i++){const d=new Date(mon);d.setDate(d.getDate()+i);const s=iso(d);pj[s]=['demo_caen'];const h=k===1?10:8;const m=450+h*60;ST.pointages.push({p:'l:julien',d:s,site:'demo_caen',status:'valide',corr:null,events:[{t:'start',at:s+'T07:30'},{t:'end',at:s+'T'+String(Math.floor(m/60)).padStart(2,'0')+':'+String(m%60).padStart(2,'0')}],val:[]});}T.espace.savePlanning(wkKey(mon),{'l:julien':pj});}
  T.state.userId='ethan';T.renderHome();});await wait(300);
const fiche=async(who,id)=>{await page.evaluate(async([who,id])=>{const w=ms=>new Promise(r=>setTimeout(r,ms));const T=window.TRACE;T.state.userId=who;T.renderHome();await w(200);document.getElementById('htExpl').click();await w(250);T.espace.fiche(id);await w(450);},[who,id]);};
const cardOf=()=>page.evaluate(()=>{const c=document.querySelector('#eq-app .cpt-card');return c?{edit:!!c.querySelector('[data-act=cptcontrat]'),ro:/lecture seule/.test(c.textContent),acts:c.querySelectorAll('button[data-act^=cpt]').length}:null;});
const hubRow=()=>page.evaluate(async()=>{const w=ms=>new Promise(r=>setTimeout(r,ms));window.TRACE.espace.fiche(null);await w(150);document.getElementById('htExpl').click();await w(250);return !![...document.querySelectorAll('#eq-app .ac-row')].find(x=>/Compteurs d'heures/.test(x.textContent));});
const modal=async(fill,ok)=>{await wait(250);await page.evaluate(([f])=>{Object.entries(f).forEach(([id,v])=>{const el=document.getElementById(id);el.value=v;});},[fill]);await page.click('#'+ok);await wait(350);};
const as=async(id,poste)=>{await page.evaluate(([id,poste])=>window.TRACE.demoPoste(id,poste),[id,poste]);};
// ── 1) qui voit, qui modifie : Ethan (administrateur) modifie ; Sophie chargée d'affaires : rien ; gérante : lecture ; RH : modifie ; conductrice : rien ; Karim (soudeur) : rien
const R1={};await fiche('ethan','l:julien');R1.ethan=await cardOf();R1.ethanHub=await hubRow();
await fiche('sophie','l:julien');R1.ca=await cardOf();R1.caHub=await hubRow();
await as('sophie','gerant');await fiche('sophie','l:julien');R1.ger=await cardOf();R1.gerHub=await hubRow();
await as('sophie','conducteur');await fiche('sophie','l:julien');R1.cond=await cardOf();R1.condHub=await hubRow();
await as('sophie','resp_rh');await fiche('sophie','l:julien');R1.rh=await cardOf();
await page.click('#eq-app .cpt-card input[data-act=cpton][data-v="l:julien|recup"]');await wait(400);await page.click('#eq-app .cpt-card [data-act=cptplafond][data-v="l:julien"]');await modal({'cpl-h':'45'},'cpl-ok');R1.rhSaved=await page.evaluate(()=>{const r=window.TRACE.reg.all('cpth').find(x=>x.id==='l:julien');return r&&r.plafond;});
await fiche('karim','l:julien');R1.karim=await cardOf();
console.log('1) droits :',JSON.stringify(R1));
C.c1=R1.ethan&&R1.ethan.edit&&R1.ethanHub&&R1.ca===null&&!R1.caHub&&R1.ger&&!R1.ger.edit&&R1.ger.ro&&R1.ger.acts===0&&R1.gerHub&&R1.cond===null&&!R1.condHub&&R1.rh&&R1.rh.edit&&R1.rhSaved===45&&R1.karim===null;
// ── 2) import du compteur existant (Sophie, RH) : tableau collé (titre, en-tête, 2 lignes bonnes, 1 inconnue, 1 en double), soldes à la fin de la navette de septembre
await page.evaluate(async()=>{const w=ms=>new Promise(r=>setTimeout(r,ms));const T=window.TRACE;T.state.userId='sophie';T.renderHome();await w(200);document.getElementById('htExpl').click();await w(250);[...document.querySelectorAll('#eq-app .ac-row')].find(x=>/Compteurs d'heures/.test(x.textContent)).click();await w(500);});
let out={view:await page.evaluate(()=>({h2:(document.querySelector('#eq-app h2.vt')||{}).textContent||'',imp:!!document.querySelector('#eq-app details.cpt-imp'),open:(document.querySelector('#eq-app details.cpt-imp')||{}).open,mois:(document.querySelector('#eq-app select[data-chg=cptMois]')||{}).value}))};
await page.evaluate(()=>{document.getElementById('cpt-paste').value=['Compteurs SCR au 30/09','Nom\tPrénom\tCompteur (h)\tPlafond du compteur (h)\tHeures à reporter (h)\tCas de déplacement forcé','R.\tJulien\t20\t40\t5\t','B.\tKarim\t12,5\t\t2\t3','Inconnu\tToto\t4\t\t\t','R.\tJulien\t1\t\t\t'].join('\n');});
await page.click('#eq-app [data-act=cptimpread]');await wait(400);
const prev=()=>page.evaluate(()=>({rows:[...document.querySelectorAll('#eq-app table.cpt-prev tr')].slice(1).map(r=>[...r.cells].map(c=>c.textContent.replace(/\s+/g,' ').trim()).join('|')),bad:[...document.querySelectorAll('#eq-app details.cpt-imp .eq-s')].map(x=>x.textContent.replace(/\s+/g,' ').trim()).filter(t=>/^Ligne/.test(t)),btn:(document.querySelector('#eq-app [data-act=cptimpok]')||{}).textContent||''}));
out.p1=await prev();await page.selectOption('#eq-app select[data-chg=cptMois]','2026-08');await wait(400);out.p2=(await prev()).rows;await page.selectOption('#eq-app select[data-chg=cptMois]','2026-09');await wait(400);
await page.click('#eq-app [data-act=cptimpok]');await wait(500);
out.after=await page.evaluate(()=>{const g=id=>window.TRACE.reg.all('cpth').find(x=>x.id===id)||{};const J=g('l:julien'),K=g('l:karim');const f=window.TRACE.reg.all('gdx').find(x=>x.id==='force|l:karim');
  const T=window.TRACE.espace.compteurs;return {j:[J.soldes&&J.soldes.recup&&[J.soldes.recup.h,J.soldes.recup.at,J.soldes.recup.mois].join(),J.plafond,J.soldes&&J.soldes.report&&J.soldes.report.h,T('l:julien').cpt.solde,T('l:julien').rep.solde],k:[K.on&&K.on.recup,K.soldes&&K.soldes.recup&&K.soldes.recup.h,K.plafond===undefined?'—':K.plafond,T('l:karim').rep.solde],f:f&&[f.cas,f.note,!!f.deleted].join(),
    kpis:[...document.querySelectorAll('#eq-app .eq-kpi')].map(x=>x.textContent.replace(/\s+/g,' ').trim()),tab:[...document.querySelectorAll('#eq-app table.cpt-tab tr')].slice(1).map(r=>[...r.cells].slice(0,5).map(c=>c.textContent.replace(/\s+/g,' ').trim()).join('|'))};});
console.log('2) import :',JSON.stringify(out));
C.c2=/Compteurs d'heures/.test(out.view.h2)&&out.view.imp&&out.view.mois==='2026-09'&&out.p1.rows.length===2&&/^3\|Julien R\.\|20 h\|40 h\|5 h\|—\|distance\|27\/09\/2026$/.test(out.p1.rows[0])&&/^4\|Karim B\.\|12,5 h\|—\|2 h\|—\|cas 3\|27\/09\/2026$/.test(out.p1.rows[1])
  &&out.p1.bad.length===2&&out.p1.bad.some(t=>/^Ligne 5 : personne introuvable dans l'annuaire : Inconnu Toto/.test(t))&&out.p1.bad.some(t=>/^Ligne 6 : en double : R\. Julien/.test(t))&&/Importer 2 lignes/.test(out.p1.btn)&&out.p2.every(r=>/30\/08\/2026$/.test(r))
  &&out.after.j[0]==='20,2026-09-27,2026-09'&&out.after.j[1]===40&&out.after.j[2]===5&&out.after.j[3]===20&&out.after.j[4]===5&&out.after.k[0]===true&&out.after.k[1]===12.5&&out.after.k[2]==='—'&&out.after.k[3]===2&&out.after.f==='3,import,false'
  &&out.after.kpis.some(t=>/^2 \/ 2\s*ont un compteur/.test(t))&&out.after.kpis.some(t=>/^32,5 h\s*dans les compteurs/.test(t))&&out.after.kpis.some(t=>/^7 h\s*heures à reporter/.test(t))&&out.after.kpis.some(t=>/^1\s*cas forcé/.test(t))
  &&out.after.tab.some(r=>/^Julien R\..*\|35 h\|20 h \/ 40\|5 h\|distance$/.test(r))&&out.after.tab.some(r=>/^Karim B\..*\|35 h\|12,5 h\|2 h\|cas 3 forcé$/.test(r));
// ── 3) export Excel (soldes à la fin de la navette de septembre) → ré-import du même fichier : mêmes valeurs
const dlP=page.waitForEvent('download',{timeout:8000}).catch(()=>null);await page.evaluate(()=>[...document.querySelectorAll('#eq-app [data-act=cptxls]')].pop().click());const dl=await dlP;
out={name:dl&&dl.suggestedFilename()};if(dl){const f=path.join(os.tmpdir(),'cpt_'+process.pid+'.xlsx');fs.copyFileSync(await dl.path(),f);const wb=await openXlsx(new Uint8Array(fs.readFileSync(f)).buffer);const sh=await wb.sheet(wb.sheets[0].name);
  const row=r=>[1,2,3,4,5,6,7,8].map(c=>sh.at(c,r));out.title=sh.at(1,1);out.head=row(2);out.r3=row(3);out.r4=row(4);
  await page.setInputFiles('#eq-app input[data-cptimp]',f);await wait(800);out.re=(await prev()).rows;try{fs.unlinkSync(f);}catch(e){}await page.click('#eq-app [data-act=cptimpx]');await wait(300);}
console.log('3) export / ré-import :',JSON.stringify(out));
C.c3=out.name==='Compteurs_heures_2026-09.xlsx'&&/fin de la navette de septembre 2026 \(dimanche 27\/09\/2026\)/.test(out.title||'')&&out.head&&out.head[0]==='Nom'&&out.head[3]==='Compteur (h)'&&out.head[7]==='Arrêté au'
  &&JSON.stringify(out.r3)==='["R.","Julien",35,20,40,5,null,"27/09/2026"]'&&JSON.stringify(out.r4)==='["B.","Karim",35,12.5,null,2,3,"27/09/2026"]'&&out.re&&out.re.length===2&&/^3\|Julien R\.\|20 h\|40 h\|5 h\|35 h\|distance\|27\/09\/2026$/.test(out.re[0]);
// ── 4) cas forcé sur Julien (Sophie, RH, depuis la fiche) : sa navette passe en CAS 3 ; « forcé » visible dans Grands déplacements pour la RH, pas pour une conductrice ; Julien voit « cas 3 », jamais « forcé »
await fiche('sophie','l:julien');await page.click('#eq-app .cpt-card [data-act=cptcas][data-v="l:julien"]');await modal({'cf-c':'3','cf-n':'accord à l\'embauche'},'cf-ok');
out={card:await page.evaluate(()=>(document.querySelector('#eq-app .cpt-card .eq-kv:nth-of-type(2)')||{}).textContent.replace(/\s+/g,' ').trim()),nav:await page.evaluate(()=>{const R=window.TRACE.espace.navette('l:julien','2026-09');return {a8:(R.sheet.cells.A8||{}).v,cas:R.N.weeks.map(w=>w.cas).join()};})};
const gdView=async who=>page.evaluate(async who=>{const w=ms=>new Promise(r=>setTimeout(r,ms));const T=window.TRACE;T.state.userId=who;T.renderHome();await w(200);T.espace.fiche(null);await w(150);document.getElementById('htExpl').click();await w(250);const bk=document.querySelector('#eq-app [data-act=xsub][data-v=""]');if(bk){bk.click();await w(250);}
  const r=[...document.querySelectorAll('#eq-app .ac-row')].find(x=>/Grands déplacements/.test(x.textContent));if(!r)return null;r.click();await w(400);const m=document.querySelector('#eq-app [data-act=gdmode][data-v=personne]');if(m){m.click();await w(400);}
  const sel=document.querySelector('#eq-app select[data-chg=gdPid]');if(sel){sel.value='l:julien';sel.dispatchEvent(new Event('change',{bubbles:true}));await w(400);}
  const prevM=document.querySelector('#eq-app [data-act=gdmonth][data-v="2026-09"]');if(prevM){prevM.click();await w(500);}
  const t=[...document.querySelectorAll('#eq-app table.af-tab')].find(x=>/Cas · cycle/.test(x.textContent));return t?{txt:t.textContent.replace(/\s+/g,' ').slice(0,300),forced:t.querySelectorAll('.eq-tag.warn').length}:{none:true};},who);
out.rh=await gdView('sophie');await as('sophie','conducteur');out.cond=await gdView('sophie');await as('sophie','resp_rh');
out.julien=await page.evaluate(async()=>{const w=ms=>new Promise(r=>setTimeout(r,ms));const T=window.TRACE;T.espace.fiche(null);await w(150);T.state.userId='julien';T.renderHome();await w(300);const tab=document.getElementById('htMoi')||document.getElementById('htEspace');if(tab){tab.click();await w(300);}
  const go=[...document.querySelectorAll('#eq-app button')].find(b=>/^\s*(⏱\s*)?Heures\b/.test(b.textContent)||/Mes heures/.test(b.textContent));if(go){go.click();await w(500);}
  const c=document.querySelector('#eq-app .mynav');if(!c)return {none:[...document.querySelectorAll('#eq-app button')].slice(0,40).map(b=>b.textContent.trim().slice(0,24))};c.querySelector('[data-act=mynavm]').click();await w(500);const c2=document.querySelector('#eq-app .mynav');return {rows:[...c2.querySelectorAll('table.af-tab tr')].slice(1).map(tr=>tr.textContent.replace(/\s+/g,' ').trim()),forced:/forcé/i.test(document.getElementById('eq-app').textContent)};});
console.log('4) cas forcé :',JSON.stringify(out));
C.c4=/forcé : cas 3 · Très grand déplacement · accord à l'embauche/.test(out.card||'')&&out.nav.a8==='CAS 3'&&/^3,3,3,3$/.test(out.nav.cas)&&out.rh&&/cas 3/.test(out.rh.txt||'')&&out.rh.forced>0&&out.cond&&/cas 3/.test(out.cond.txt||'')&&out.cond.forced===0&&out.julien&&out.julien.rows.every(r=>/cas 3/.test(r))&&!out.julien.forced;
// ── 5) retour au calcul par la distance : la navette repasse en CAS 2
await fiche('sophie','l:julien');await page.click('#eq-app .cpt-card [data-act=cptcas][data-v="l:julien"]');await modal({'cf-c':'0'},'cf-ok');
out=await page.evaluate(()=>{const R=window.TRACE.espace.navette('l:julien','2026-09');const f=window.TRACE.reg.get('gdx','force|l:julien');return {a8:(R.sheet.cells.A8||{}).v,deleted:!!(f&&f.deleted),txt:(document.querySelector('#eq-app .cpt-card')||{}).textContent.replace(/\s+/g,' ')};});
console.log('5) distance :',JSON.stringify({a8:out.a8,deleted:out.deleted}));
C.c5=out.a8==='CAS 2'&&out.deleted===true&&/Cas de déplacement\s*selon la distance/.test(out.txt);
await as('sophie',null);
const bad=Object.entries(C).filter(([k,v])=>!v).map(([k])=>k);console.log(bad.length?'RESULTAT: ECHEC '+bad.join(','):'RESULTAT: TOUT VERT');console.log(logs.length?logs:'[]');
await browser.close();
