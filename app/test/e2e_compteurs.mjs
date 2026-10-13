// COMPTEURS D'HEURES PAR PERSONNE + « MOI » : MA NAVETTE ET LE COIN « COMMENT C'EST CALCULÉ » + PDF DU LIVRET (13/10, Ethan : « rajouter les compteurs d'heures
// 13/10 (f), règles d'Ethan : heures sup par RANG (36e → 1 h 15 au compteur, 44e → 1 h 30) jusqu'au plafond (surplus payé) ; repos pris / posé par l'entreprise ;
// au-delà de 48 h : à reporter × 1,5, prime ou replacées sur une semaine plus légère ; solde de départ arrêté à la fin d'une navette ; contrat 39 h : 125 % dès la 40e.
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
const modal=async(fill,ok)=>{await wait(250);await page.evaluate(([f])=>{Object.entries(f).forEach(([id,v])=>{const el=document.getElementById(id);el.value=v;});},[fill]);await page.click('#'+ok);await wait(350);};
const card=()=>page.evaluate(()=>{const c=[...document.querySelectorAll('#eq-app .cpt-card')][0];return c?{txt:c.textContent.replace(/\s+/g,' ').trim(),rows:[...c.querySelectorAll('.cpt-row')].map(r=>r.dataset.cpt+'='+r.querySelector('.eq-t').textContent.replace(/\s+/g,' ').trim()),gauge:(c.querySelector('.cpt-row[data-cpt=recup] .cpt-gauge')||{}).className||'',mv:[...c.querySelectorAll('.cpt-mv')].map(x=>x.textContent.replace(/\s+/g,' ').trim())}:null;});
// ── 1) fiche de Julien (Ethan, administrateur) : contrat 35 h ; compteur non suivi ; plus de CET (13/10 soir, Ethan : « on s'en fout ») ; « heures à reporter » reconstitué = 2 h au-delà de 48 h × 1,5 = 3 h
await fiche();let out={c:await card()};console.log('1) fiche :',JSON.stringify(out));
C.c1=out.c&&/Contrat\s*35 h \/ semaine/.test(out.c.txt)&&/Cas de déplacement\s*selon la distance/.test(out.c.txt)&&out.c.rows.includes("recup=Compteur d'heures non suivi")&&!out.c.rows.some(r=>/^cet=/.test(r))&&!/\bCET\b|Autres compteurs/.test(out.c.txt)&&/＋ Autre compteur/.test(out.c.txt)&&out.c.rows.includes('report=Heures à reporter 3 h')&&/reconstitué depuis le .* \+ 3 h \(2 h au-delà de 48 h × 1,5\)/.test(out.c.txt)&&/visible : gérant, direction, RH/.test(out.c.txt);
// ── 2) au vrai clic : compteur suivi ; solde de départ 35,5 h fin de la navette d'août ; plafond 50 h ; repos 7 h le 16/09 ; posé 14 h le 25/09
//      → S36 +6,25 = 41,75 ; S37 (50 h) : 8,25 h de place → 6,6 h à 125 % rentrent (8,25), 1,4 h à 125 % + 5 h à 150 % PAYÉES (plein) ; S38 −7 puis +6,25 ; S39 −14 puis +6,25 → 41,5 h (27 h entrées)
await page.click('#eq-app .cpt-card input[data-act=cpton][data-v="l:julien|recup"]');await wait(400);
await page.click('#eq-app .cpt-card [data-act=cptsolde][data-v="l:julien|recup"]');await modal({'cs-h':'35.5','cs-m':'2026-08'},'cs-ok');
await page.click('#eq-app .cpt-card [data-act=cptplafond][data-v="l:julien"]');await modal({'cpl-h':'50'},'cpl-ok');
await page.click('#eq-app .cpt-card [data-act=cptmvt][data-v="l:julien|repos"]');await modal({'cm-d':'2026-09-16','cm-h':'7','cm-n':'congé'},'cm-ok');
await page.click('#eq-app .cpt-card [data-act=cptmvt][data-v="l:julien|pose"]');await modal({'cm-d':'2026-09-25','cm-h':'14','cm-n':'intempéries'},'cm-ok');
out={c:await card(),tl:await page.evaluate(()=>{const T=window.TRACE.espace.compteurs('l:julien');return {solde:T.cpt.solde,pay125:T.cpt.pay125,pay150:T.cpt.pay150,pris:T.cpt.pris,poses:T.cpt.poses,w37:T.cpt.weeks.filter(w=>w.mon==='2026-09-07').map(w=>[w.in125,w.in150,w.pay125,w.pay150,w.bal,w.plein])[0]};})};
console.log('2) compteur :',JSON.stringify(out));
C.c2=out.c.rows.includes("recup=Compteur d'heures 41,5 h / 50 h")&&/warn/.test(out.c.gauge)&&/solde de départ 35,5 h \(fin de la navette d'août 2026\)/.test(out.c.txt)&&/\+ 27 h entrées \(majorées\)/.test(out.c.txt)&&/− 7 h de repos pris/.test(out.c.txt)&&/− 14 h posées par l'entreprise/.test(out.c.txt)&&/compteur plein : 6,4 h sup payées/.test(out.c.txt)
  &&out.c.mv.some(t=>/^25\/09\/2026 · 🏢 posé par l'entreprise · 14 h · intempéries/.test(t))&&out.c.mv.some(t=>/^16\/09\/2026 · 🏖 repos pris · 7 h · congé/.test(t))
  &&out.tl.solde===41.5&&out.tl.pay125===1.4&&out.tl.pay150===5&&out.tl.pris===7&&out.tl.poses===14&&JSON.stringify(out.tl.w37)==='[6.6,0,1.4,5,50,true]';
// ── 3) heures à reporter : solde de départ 1 h fin août → + 3 (S37) ; ↪ 1 h replacée sur la semaine légère du 28/09 ; 💶 prime de 3 h le 12/10 → 0 h ; puis on retire le repos du 16/09 (✕) et on le remet
await page.click('#eq-app .cpt-card [data-act=cptsolde][data-v="l:julien|report"]');await modal({'cs-h':'1','cs-m':'2026-08'},'cs-ok');
await page.click('#eq-app .cpt-card [data-act=cptmvt][data-v="l:julien|replace"]');await wait(250);
out={free:await page.evaluate(()=>{const d=document.getElementById('cm-d');d.value='2026-09-30';d.dispatchEvent(new Event('change'));return {h:document.getElementById('cm-h').value,hint:document.getElementById('cm-free').textContent};})};
await page.evaluate(()=>{document.getElementById('cm-h').value='1';document.getElementById('cm-n').value='semaine sans chantier';});await page.click('#cm-ok');await wait(350);
await page.click('#eq-app .cpt-card [data-act=cptprime][data-v="l:julien"]');await modal({'cp-h':'3','cp-d':'2026-10-12','cp-n':'prime de test'},'cp-ok');
out.c=await card();
const rid=await page.evaluate(()=>{const r=window.TRACE.reg.all('cpth').find(x=>x.id==='l:julien');return (r.mvts||[]).find(m=>m.type==='repos').id;});
await page.click(`#eq-app .cpt-card [data-act=cptmvtx][data-v="l:julien|${rid}"]`);await wait(350);out.sansRepos=await page.evaluate(()=>window.TRACE.espace.compteurs('l:julien').cpt.solde);
await page.click('#eq-app .cpt-card [data-act=cptmvt][data-v="l:julien|repos"]');await modal({'cm-d':'2026-09-16','cm-h':'7','cm-n':'congé'},'cm-ok');
await page.click('#eq-app .cpt-card [data-act=cptnew][data-v="l:julien"]');await modal({'cn-l':'Modulation'},'cn-ok');
out.row=await page.evaluate(()=>{const r=window.TRACE.reg.all('cpth').find(x=>x.id==='l:julien');return r?{on:r.on,plafond:r.plafond,soldes:Object.fromEntries(Object.entries(r.soldes||{}).map(([k,v])=>[k,[v.h,v.at,v.mois]])),primes:(r.primes||[]).map(p=>[p.h,p.at,p.note]),mvts:(r.mvts||[]).map(m=>[m.type,m.at,m.h,!!m.deleted]),labels:r.labels}:null;});
out.c2=await card();console.log('3) à reporter :',JSON.stringify(out));
C.c3=/Semaine du 28\/09\/2026 : 0 h pointées → de quoi atteindre le contrat : 35 h/.test(out.free.hint)&&out.free.h==='4'&&out.c.rows.includes('report=Heures à reporter 0 h')&&/solde de départ 1 h \(fin de la navette d'août 2026\) · \+ 3 h \(2 h au-delà de 48 h × 1,5\) · − 3 h payées en prime · − 1 h replacées/.test(out.c.txt)
  &&out.c.mv.some(t=>/^28\/09\/2026 · ↪ replacé · 1 h sur la semaine du 28\/09 · semaine sans chantier/.test(t))&&out.c.mv.some(t=>/^12\/10\/2026 · 💶 payé en prime · 3 h · prime de test/.test(t))&&out.sansRepos===42.25
  &&out.row&&out.row.on.recup===true&&out.row.plafond===50&&JSON.stringify(out.row.soldes.recup)==='[35.5,"2026-08-30","2026-08"]'&&JSON.stringify(out.row.soldes.report)==='[1,"2026-08-30","2026-08"]'&&JSON.stringify(out.row.primes)==='[[3,"2026-10-12","prime de test"]]'
  &&out.row.mvts.filter(m=>m[3]).length===1&&out.row.mvts.filter(m=>!m[3]).map(m=>m.slice(0,3).join(':')).join()==='pose:2026-09-25:14,replace:2026-09-28:1,repos:2026-09-16:7'&&out.row.labels.x_modulation==='Modulation'&&out.c2.rows.includes("recup=Compteur d'heures 41,5 h / 50 h");
// ── 4) contrat 39 h → 125 % dès la 40e heure : S36 +1,25 ; S37 4 h à 125 % + 5 h à 150 % = +12,5 (place 13,25) ; S38 −7 +1,25 ; S39 −14 +1,25 → 30,75 h ; navettes de septembre et d'octobre
await page.click('#eq-app .cpt-card [data-act=cptcontrat][data-v="l:julien"]');await modal({'cc-h':'39'},'cc-ok');out={c:await card()};
const r4=await page.evaluate(()=>{const nav=ym=>{const R=window.TRACE.espace.navette('l:julien',ym);const s=R.sheet;const c=a=>s.cells[a]||{};const ref=s.refs;return {R,s,c,ref};};
  const A=nav('2026-09'),B=nav('2026-10');const lab=(x,re)=>{const k=Object.keys(x.s.cells).find(a=>/^H\d+$/.test(a)&&re.test(String(x.s.cells[a].v||'')));return k?String(x.s.cells[k].v):null;};
  return {sep:{cPrev:A.c('I'+A.ref.cPrev).v,cRec:A.c('I'+A.ref.cRec).v,p125:A.c('I'+A.ref.p125).v,p150:A.c('I'+A.ref.p150).v,cEnt:A.c('I'+A.ref.cEnt).f,cFin:A.c('I'+A.ref.cFin).f,rPrev:A.c('I'+A.ref.rPrev).v,rEnt:A.c('I'+A.ref.rEnt).f,rPrime:A.c('I'+A.ref.rPrime).v,rRepl:A.c('I'+A.ref.rRepl).v,j13:A.c('J13').v,hs:A.c('I22').f,hs150:A.c('I23').f,w37:A.R.N.weeks.find(w=>w.n===37),head:lab(A,/^COMPTEUR D'HEURES/),recup:lab(A,/RÉCUP 7 H/),pose:lab(A,/RÉCUP \(ENTREPRISE\) 14 H/)},
    oct:{cPrev:B.c('I'+B.ref.cPrev).v,cRec:B.c('I'+B.ref.cRec).v,rPrev:B.c('I'+B.ref.rPrev).v,rPrime:B.c('I'+B.ref.rPrime).v,rRepl:B.c('I'+B.ref.rRepl).v,tot40:lab(B,/^TOTAL SEMAINE - 40/),w40:B.R.N.weeks.find(w=>w.n===40)},solde:window.TRACE.espace.compteurs('l:julien').cpt.solde};});
out.nav=r4;console.log('4) contrat 39 h + navettes :',JSON.stringify(out));
C.c4=/Contrat\s*39 h \/ semaine/.test(out.c.txt)&&out.c.rows.includes("recup=Compteur d'heures 30,75 h / 50 h")&&r4.solde===30.75
  &&r4.sep.cPrev===35.5&&r4.sep.cRec===21&&r4.sep.p125===0&&r4.sep.p150===0&&/^1\.25\*\(I\d+-I\d+\)\+1\.5\*\(I\d+-I\d+\)$/.test(r4.sep.cEnt||'') /* 13/10 soir : plus de cases CET dans la formule */&&/^I\d+\+I\d+$/.test(r4.sep.cFin||'')&&r4.sep.rPrev===1&&/^1\.5\*I\d+$/.test(r4.sep.rEnt||'')&&r4.sep.rPrime===0&&r4.sep.rRepl===0
  &&r4.sep.j13==='CONTRAT 39H'&&r4.sep.hs==='MAX(MIN(I21,43)-39,0)'&&r4.sep.hs150==='MAX(MIN(I21,48)-43,0)'&&r4.sep.w37.total===50&&r4.sep.w37.hs125===4&&r4.sep.w37.hs150===5&&r4.sep.w37.report===2&&r4.sep.head==="COMPTEUR D'HEURES (PLAFOND 50 H)"&&/RÉCUP 7 H$/.test(r4.sep.recup||'')&&/RÉCUP \(ENTREPRISE\) 14 H$/.test(r4.sep.pose||'')
  &&r4.oct.cPrev===30.75&&!r4.oct.cRec&&r4.oct.rPrev===4&&r4.oct.rPrime===3&&r4.oct.rRepl===1&&r4.oct.tot40==='TOTAL SEMAINE - 40 (DONT 1 H REPORTÉES)'&&r4.oct.w40.total===1&&r4.oct.w40.repl===1;
// ── 5) le PDF du livret : déposé par les RH dans Grands déplacements (règles), lien visible
const pdf=path.join(os.tmpdir(),'livret_'+process.pid+'.pdf');fs.writeFileSync(pdf,Buffer.from('%PDF-1.4\n1 0 obj<</Type/Catalog/Pages 2 0 R>>endobj 2 0 obj<</Type/Pages/Kids[3 0 R]/Count 1>>endobj 3 0 obj<</Type/Page/Parent 2 0 R/MediaBox[0 0 200 200]>>endobj\ntrailer<</Root 1 0 R>>\n%%EOF\n'));
await page.evaluate(async()=>{const w=ms=>new Promise(r=>setTimeout(r,ms));window.TRACE.espace.fiche(null);await w(200);[...document.querySelectorAll('#eq-app .ac-row')].find(x=>/Grands déplacements/.test(x.textContent)).click();await w(1200);});
await page.setInputFiles('#eq-app input[data-gdpdf]',pdf);await wait(900);
out={doc:await page.evaluate(()=>{const d=window.TRACE.reg.all('doc').find(x=>x.id==='livret_gd');return d?{kind:d.kind,file:d.file,data:!!d.data,none:!!(d.req&&d.req.none)}:null;}),link:await page.evaluate(()=>{const a=document.querySelector('#eq-app a[data-livret]');return a?a.textContent.trim():null;}),tables:await page.evaluate(()=>document.querySelectorAll('#eq-app table.gd-rt').length)};
console.log('5) livret :',JSON.stringify(out));
C.c5=out.doc&&out.doc.kind==='livret'&&/^livret_\d+\.pdf$/.test(out.doc.file)&&out.doc.data&&out.doc.none&&/📄 livret_\d+\.pdf/.test(out.link||'')&&out.tables===9; /* cas 2 (1) + cas 3 (4) + cas 4 (4) */
// ── 6) Julien, dans « Moi → Heures » : ma navette de septembre (variables), SON solde (lecture), « comment c'est calculé » (cas 2 + PDF), ⬇ ma navette
const dlP=page.waitForEvent('download',{timeout:8000}).catch(()=>null);
out=await page.evaluate(async()=>{const w=ms=>new Promise(r=>setTimeout(r,ms));const T=window.TRACE;T.state.userId='julien';T.renderHome();await w(300);const tab=document.getElementById('htMoi')||document.getElementById('htEspace');if(tab){tab.click();await w(300);}
  const go=[...document.querySelectorAll('#eq-app [data-act=sub],#eq-app [data-act=tab],#eq-app .ac-row,#eq-app button')].find(b=>/^\s*(⏱\s*)?Heures\b/.test(b.textContent)||/Mes heures/.test(b.textContent));if(go){go.click();await w(500);}
  const card=()=>document.querySelector('#eq-app .mynav');if(!card())return {card:false,tabs:[...document.querySelectorAll('#eq-app button')].slice(0,30).map(b=>b.textContent.trim().slice(0,20))};
  const prev=card().querySelector('[data-act=mynavm]');prev.click();await w(500);const c=card();const det=c.querySelector('details.gd-explain');det.open=true;
  return {card:true,titre:c.querySelector('.eq-wktitle').textContent.replace(/\s+/g,' ').trim(),tiles:[...c.querySelectorAll('.ac-stat')].map(x=>x.textContent.replace(/\s+/g,' ').trim()),rows:[...c.querySelectorAll('table.af-tab tr')].slice(1).map(tr=>tr.textContent.replace(/\s+/g,' ').trim()),
    cpts:[...c.querySelectorAll('.eq-kv')].map(x=>x.textContent.replace(/\s+/g,' ').trim()),expl:det.textContent.replace(/\s+/g,' ').slice(0,400),tables:det.querySelectorAll('table.gd-rt').length,pdf:!!det.querySelector('a[data-livret]')};});
if(out.card){await page.click('#eq-app .mynav [data-act=mynav]');}const dl=await dlP;out.dl=dl?dl.suggestedFilename():null;
console.log('6) Moi → ma navette :',JSON.stringify(out));
C.c6=out.card&&/septembre 2026/i.test(out.titre)&&/semaines du 30\/08 au 27\/09/.test(out.titre)&&out.tiles.some(t=>/^170 h\s*pointées/.test(t))&&out.tiles.some(t=>/^7 h\s*heures sup 125 %/.test(t))&&out.tiles.some(t=>/^5 h\s*heures sup 150 %/.test(t))&&out.tiles.some(t=>/^2 h\s*au-delà de 48 h → à reporter \(× 1,5 = 3 h\)/.test(t))&&out.tiles.some(t=>/^20\s*hôtels/.test(t))&&out.tiles.some(t=>/^60 €\s*indemnités de trajet/.test(t))
  &&out.rows.length===4&&/S37.*50 h.*\+ 2 h à reporter/.test(out.rows[1])&&out.cpts.some(t=>/^Compteur d'heures\s*30,75 h \/ 50 h \(à ce jour\)/.test(t))&&out.cpts.some(t=>/^Heures à reporter\s*0 h \(à ce jour\)/.test(t))&&out.cpts.some(t=>/^Modulation\s*—/.test(t))
  &&/Contrat 39 h par semaine \(les heures 36 à 39 sont dans ton salaire\)\. Heures sup : de la 40e à la 43e heure à 125 %, de la 44e à la 48e à 150 %/.test(out.expl)&&out.tables===1&&out.pdf&&/^Navette_.*Julien.*_2026-09\.xlsx$/.test(out.dl||'');
try{fs.unlinkSync(pdf);}catch(e){}
const bad=Object.entries(C).filter(([k,v])=>!v).map(([k])=>k);console.log(bad.length?'RESULTAT: ECHEC '+bad.join(','):'RESULTAT: TOUT VERT');console.log(logs.length?logs:'[]');
await browser.close();
