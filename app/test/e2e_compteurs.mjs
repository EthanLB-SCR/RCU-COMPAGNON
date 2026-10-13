// COMPTEURS D'HEURES PAR PERSONNE + « MOI » : MA NAVETTE ET LE COIN « COMMENT C'EST CALCULÉ » + PDF DU LIVRET (13/10, Ethan : « rajouter les compteurs d'heures
// que l'on ne traite pas jusque-là ; tout le monde n'a pas le même compteur → paramètres du profil » ; « au-delà de 48 h ça va dans un compteur heures à reporter,
// qu'on peut vider en prime » ; « que les gars, dans leur section Moi, aient leurs heures avec leur navette et leurs variables, et dans le coin de quoi expliquer » ;
// « prévoir un endroit où je dépose la PJ »). Personnages de démo (rien ne part au serveur) : Julien (Rennes → Caen, cas 2), septembre pointé dont une semaine à 50 h.
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
const fiche=async()=>{await page.evaluate(async()=>{const w=ms=>new Promise(r=>setTimeout(r,ms));document.getElementById('htExpl').click();await w(250);window.TRACE.espace.fiche('l:julien');await w(500);});};
const card=()=>page.evaluate(()=>{const c=[...document.querySelectorAll('#eq-app .cpt-card')][0];return c?{txt:c.textContent.replace(/\s+/g,' ').trim(),rows:[...c.querySelectorAll('.cpt-row')].map(r=>r.dataset.cpt+'='+r.querySelector('.eq-t').textContent.replace(/\s+/g,' ').trim())}:null;});
const modal=async(fill,ok)=>{await wait(250);await page.evaluate(([f])=>{Object.entries(f).forEach(([id,v])=>{const el=document.getElementById(id);el.value=v;});},[fill]);await page.click('#'+ok);await wait(350);};
// ── 1) fiche de Julien (RH) : contrat 35 h ; récup et CET non suivis ; « heures à reporter » suivi d'office = 2 h (semaine du 7/09 à 50 h)
await fiche();let out={c:await card()};console.log('1) fiche :',JSON.stringify(out));
C.c1=out.c&&/Contrat\s*35 h \/ semaine/.test(out.c.txt)&&out.c.rows.includes('recup=Récupération non suivi')&&out.c.rows.includes('cet=CET non suivi')&&out.c.rows.includes('report=Heures à reporter 2 h')&&/calculé sur 26 semaines \+ 2 h au-delà de 48 h/.test(out.c.txt);
// ── 2) réglages au vrai clic : récup suivie + solde 35,5 h au 30/09 ; solde « à reporter » 1 h au 31/08 → 3 h ; prime de 3 h le 12/10 → 0 h ; autre compteur « Modulation » ; contrat 39 h
await page.click('#eq-app .cpt-card input[data-act=cpton][data-v="l:julien|recup"]');await wait(400);
await page.click('#eq-app .cpt-card [data-act=cptsolde][data-v="l:julien|recup"]');await modal({'cs-h':'35.5','cs-d':'2026-09-30'},'cs-ok');
await page.click('#eq-app .cpt-card [data-act=cptsolde][data-v="l:julien|report"]');await modal({'cs-h':'1','cs-d':'2026-08-31'},'cs-ok');out={avant:await card()};
await page.click('#eq-app .cpt-card [data-act=cptprime][data-v="l:julien"]');await modal({'cp-h':'3','cp-d':'2026-10-12','cp-n':'prime de test'},'cp-ok');
await page.click('#eq-app .cpt-card [data-act=cptnew][data-v="l:julien"]');await modal({'cn-l':'Modulation'},'cn-ok');
await page.click('#eq-app .cpt-card [data-act=cptcontrat][data-v="l:julien"]');await modal({'cc-h':'39'},'cc-ok');out.apres=await card();
out.row=await page.evaluate(()=>{const r=window.TRACE.reg.all('cpth').find(x=>x.id==='l:julien');return r?{contrat:r.contrat,on:r.on,soldes:Object.fromEntries(Object.entries(r.soldes||{}).map(([k,v])=>[k,[v.h,v.at]])),primes:(r.primes||[]).map(p=>[p.h,p.at,p.note]),labels:r.labels}:null;});
console.log('2) réglages :',JSON.stringify(out));
C.c2=out.avant.rows.includes('recup=Récupération 35,5 h')&&out.avant.rows.includes('report=Heures à reporter 3 h')&&out.apres.rows.includes('report=Heures à reporter 0 h')&&out.apres.rows.includes('x_modulation=Modulation —')&&/Contrat\s*39 h \/ semaine/.test(out.apres.txt)&&/12\/10\/2026 · 3 h · prime de test/.test(out.apres.txt)
  &&out.row&&out.row.contrat===39&&out.row.on.recup===true&&out.row.on.x_modulation===true&&JSON.stringify(out.row.soldes.recup)==='[35.5,"2026-09-30"]'&&JSON.stringify(out.row.soldes.report)==='[1,"2026-08-31"]'&&JSON.stringify(out.row.primes)==='[[3,"2026-10-12","prime de test"]]'&&out.row.labels.x_modulation==='Modulation';
// ── 3) la navette de septembre pré-remplie : compteur récup 35,5 ; à reporter : 1 (avant le mois) + 2 (du mois) − 0 (prime d'octobre) ; contrat 39 h dans les formules
const r3=await page.evaluate(()=>{const R=window.TRACE.espace.navette('l:julien','2026-09');const s=R.sheet;const c=a=>s.cells[a]||{};const ref=s.refs;
  return {cpt:R.N.cpt,cPrev:c('I'+ref.cPrev).v,rPrev:c('I'+ref.rPrev).v,rPrime:c('I'+ref.rPrime).v,rMois:c('I'+ref.rMois).f,rFin:c('I'+ref.rFin).f,j13:c('J13').v,hs:c('I22').f,w37:R.N.weeks.find(w=>w.n===37)};});
console.log('3) navette pré-remplie :',JSON.stringify(r3));
C.c3=r3.cPrev===35.5&&r3.rPrev===1&&r3.rPrime===0&&r3.j13==='CONTRAT 39H'&&r3.hs==='MIN(MAX(MIN(I21,48)-39,0),8)'&&r3.w37.total===50&&r3.w37.hs125===8&&r3.w37.hs150===1&&r3.w37.report===2;
// ── 4) le PDF du livret : déposé par les RH dans Grands déplacements (règles), lien visible
const pdf=path.join(os.tmpdir(),'livret_'+process.pid+'.pdf');fs.writeFileSync(pdf,Buffer.from('%PDF-1.4\n1 0 obj<</Type/Catalog/Pages 2 0 R>>endobj 2 0 obj<</Type/Pages/Kids[3 0 R]/Count 1>>endobj 3 0 obj<</Type/Page/Parent 2 0 R/MediaBox[0 0 200 200]>>endobj\ntrailer<</Root 1 0 R>>\n%%EOF\n'));
await page.evaluate(async()=>{const w=ms=>new Promise(r=>setTimeout(r,ms));window.TRACE.espace.fiche(null);await w(200);[...document.querySelectorAll('#eq-app .ac-row')].find(x=>/Grands déplacements/.test(x.textContent)).click();await w(1200);});
await page.setInputFiles('#eq-app input[data-gdpdf]',pdf);await wait(900);
out={doc:await page.evaluate(()=>{const d=window.TRACE.reg.all('doc').find(x=>x.id==='livret_gd');return d?{kind:d.kind,file:d.file,data:!!d.data,none:!!(d.req&&d.req.none)}:null;}),link:await page.evaluate(()=>{const a=document.querySelector('#eq-app a[data-livret]');return a?a.textContent.trim():null;}),tables:await page.evaluate(()=>document.querySelectorAll('#eq-app table.gd-rt').length)};
console.log('4) livret :',JSON.stringify(out));
C.c4=out.doc&&out.doc.kind==='livret'&&/^livret_\d+\.pdf$/.test(out.doc.file)&&out.doc.data&&out.doc.none&&/📄 livret_\d+\.pdf/.test(out.link||'')&&out.tables===9; /* cas 2 (1) + cas 3 (4) + cas 4 (4) */
// ── 5) Julien, dans « Moi → Heures » : ma navette de septembre (variables), mes compteurs, « comment c'est calculé » (cas 2 + PDF), ⬇ ma navette
const dlP=page.waitForEvent('download',{timeout:8000}).catch(()=>null);
out=await page.evaluate(async()=>{const w=ms=>new Promise(r=>setTimeout(r,ms));const T=window.TRACE;T.state.userId='julien';T.renderHome();await w(300);const tab=document.getElementById('htMoi')||document.getElementById('htEspace');if(tab){tab.click();await w(300);}
  const go=[...document.querySelectorAll('#eq-app [data-act=sub],#eq-app [data-act=tab],#eq-app .ac-row,#eq-app button')].find(b=>/^\s*(⏱\s*)?Heures\b/.test(b.textContent)||/Mes heures/.test(b.textContent));if(go){go.click();await w(500);}
  const card=()=>document.querySelector('#eq-app .mynav');if(!card())return {card:false,tabs:[...document.querySelectorAll('#eq-app button')].slice(0,30).map(b=>b.textContent.trim().slice(0,20))};
  const prev=card().querySelector('[data-act=mynavm]');prev.click();await w(500);const c=card();const det=c.querySelector('details.gd-explain');det.open=true;
  return {card:true,titre:c.querySelector('.eq-wktitle').textContent.replace(/\s+/g,' ').trim(),tiles:[...c.querySelectorAll('.ac-stat')].map(x=>x.textContent.replace(/\s+/g,' ').trim()),rows:[...c.querySelectorAll('table.af-tab tr')].slice(1).map(tr=>tr.textContent.replace(/\s+/g,' ').trim()),
    cpts:[...c.querySelectorAll('.eq-kv')].map(x=>x.textContent.replace(/\s+/g,' ').trim()),expl:det.textContent.replace(/\s+/g,' ').slice(0,400),tables:det.querySelectorAll('table.gd-rt').length,pdf:!!det.querySelector('a[data-livret]')};});
if(out.card){await page.click('#eq-app .mynav [data-act=mynav]');}const dl=await dlP;out.dl=dl?dl.suggestedFilename():null;
console.log('5) Moi → ma navette :',JSON.stringify(out));
C.c5=out.card&&/septembre 2026/i.test(out.titre)&&/semaines du 30\/08 au 27\/09/.test(out.titre)&&out.tiles.some(t=>/^170 h\s*pointées/.test(t))&&out.tiles.some(t=>/^11 h\s*heures sup 125 %/.test(t))&&out.tiles.some(t=>/^1 h\s*heures sup 150 %/.test(t))&&out.tiles.some(t=>/^2 h\s*au-delà de 48 h → à reporter/.test(t))&&out.tiles.some(t=>/^20\s*hôtels/.test(t))&&out.tiles.some(t=>/^60 €\s*indemnités de trajet/.test(t))
  &&out.rows.length===4&&/S37.*50 h.*\+ 2 h à reporter/.test(out.rows[1])&&out.cpts.some(t=>/^Récupération\s*35,5 h \(au 30\/09\/2026\)/.test(t))&&out.cpts.some(t=>/^Heures à reporter\s*0 h \(à ce jour\)/.test(t))&&out.cpts.some(t=>/^Modulation\s*—/.test(t))
  &&/Contrat 39 h par semaine\. De la 40e à la 47e heure : heures sup à 125 % ; la 48e : 150 %/.test(out.expl)&&out.tables===1&&out.pdf&&/^Navette_.*Julien.*_2026-09\.xlsx$/.test(out.dl||'');
try{fs.unlinkSync(pdf);}catch(e){}
const bad=Object.entries(C).filter(([k,v])=>!v).map(([k])=>k);console.log(bad.length?'RESULTAT: ECHEC '+bad.join(','):'RESULTAT: TOUT VERT');console.log(logs.length?logs:'[]');
await browser.close();
