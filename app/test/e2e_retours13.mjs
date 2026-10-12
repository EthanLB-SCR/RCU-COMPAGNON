// RETOURS DE LA FEUILLE DU 09-10 (13/10) : n° d'affaire 01 → 02 → 03 (et secteur IDF), document en plein écran, plus rien sur les repas (prévention),
// géocodage code postal + ville (Géoplateforme → découpage administratif → Open-Meteo, homonyme écarté, ville introuvable), grands déplacements :
// détente AUTOMATIQUE sur un cycle long (cas 3 : 1 semaine sur 2), exception qui relance le cycle, accord figé + écart si le planning change, vue par personne · mois, CSV.
import { chromium } from 'playwright';
import fs from 'fs';
const BASE=process.env.BASE||'http://localhost:8765';
const browser=await chromium.launch({headless:true, executablePath: process.env.CHROMIUM_PATH||undefined});
const ctx=await browser.newContext({viewport:{width:430,height:900},acceptDownloads:true});const page=await ctx.newPage();
const logs=[];page.on('pageerror',e=>logs.push('PAGEERROR: '+e.message.slice(0,300)));page.on('console',m=>{if(m.type()==='error'&&!/supabase|Failed to fetch|net::ERR|404|WebSocket/i.test(m.text()))logs.push(m.text().slice(0,200));});
page.on('dialog',d=>d.accept().catch(()=>{}));
const strip=s=>String(s||'').normalize('NFD').replace(/[̀-ͯ]/g,'').toLowerCase().replace(/[-']/g,' ').replace(/\s+/g,' ').trim();
const REQ={geopf:[],geoapi:[],meteo:[]};
// Géoplateforme : Nantes (44000), Caen (chantier, sans CP) ; « Saint Lô » renvoie un homonyme d'un autre département (14) → doit être écarté
await page.route(u=>/(^|\.)geopf\.fr$/.test(u.hostname),route=>{const url=new URL(route.request().url());const q=strip(url.searchParams.get('q'));const cp=url.searchParams.get('postcode')||'';REQ.geopf.push(q+'|'+cp);
  const F=(lon,lat,pc)=>({type:'FeatureCollection',features:[{type:'Feature',geometry:{type:'Point',coordinates:[lon,lat]},properties:{postcode:pc,type:'municipality'}}]});
  const body=q.includes('nantes')?F(-1.5536,47.2184,'44000'):q==='caen'?F(-0.3707,49.1829,'14000'):q.includes('saint lo')?F(-0.10,49.20,'14310'):{type:'FeatureCollection',features:[]};
  route.fulfill({status:200,contentType:'application/json',body:JSON.stringify(body)});});
await page.route(u=>u.hostname==='geo.api.gouv.fr',route=>{const url=new URL(route.request().url());const cp=url.searchParams.get('codePostal');REQ.geoapi.push(cp);
  const L=cp==='50000'?[{nom:'Agneaux',centre:{type:'Point',coordinates:[-1.106,49.118]}},{nom:'Saint-Lô',centre:{type:'Point',coordinates:[-1.0903,49.1157]}}]:[];route.fulfill({status:200,contentType:'application/json',body:JSON.stringify(L)});});
await page.route(u=>/open-meteo\.com$/.test(u.hostname),route=>{const url=route.request().url();if(url.includes('geocoding-api')){REQ.meteo.push(strip(new URL(url).searchParams.get('name')));return route.fulfill({status:200,contentType:'application/json',body:JSON.stringify({results:[]})});}
  return route.fulfill({status:200,contentType:'application/json',body:JSON.stringify({daily:{time:[],weathercode:[],temperature_2m_max:[],precipitation_sum:[],precipitation_probability_max:[]}})});});
const C={};const wait=ms=>page.waitForTimeout(ms);
await page.clock.install({time:new Date(2026,9,13,8,30,0)}); /* mardi 13/10/2026 : semaine 42 (12 → 16/10) */
await page.goto(BASE+'/index.html');await wait(600);await page.evaluate(()=>{localStorage.clear();});await page.evaluate(()=>new Promise(r=>{try{const q=indexedDB.deleteDatabase('trace-kv');q.onsuccess=q.onerror=q.onblocked=()=>r();}catch(e){r();}}));
await page.reload();await wait(1200);
const skip=async()=>{const s=await page.$('#loginSkip');if(s&&await s.isVisible())await s.click();await wait(700);};await skip();
const chg=async(sel,val)=>page.evaluate(([s,v])=>{const el=document.querySelector(s);if(!el)throw new Error('introuvable : '+s);el.value=v;el.dispatchEvent(new Event('change',{bubbles:true}));},[sel,val]);
const txt=()=>page.evaluate(()=>document.getElementById('eq-app').textContent.replace(/\s+/g,' '));
// ── 1) n° d'affaire : O2610-01 proposé, créé → le formulaire propose O2610-02 → créé → O2610-03 ; secteur IDF → I2610-01
let out=await page.evaluate(async()=>{const T=window.TRACE;const w=ms=>new Promise(r=>setTimeout(r,ms));T.state.userId='ethan';T.renderHome();document.getElementById('htCom').click();await w(250);const r={props:[]};
  for(const nom of ['Caen — Presqu\'île','Rennes — Baud Chardonnet']){document.querySelector('#eq-app [data-act=af][data-v="new|"]').click();await w(150);const n=document.getElementById('afn-num');r.props.push(n.value);document.getElementById('afn-nom').value=nom;document.querySelector('#eq-app [data-act=af][data-v="create|"]').click();await w(250);document.querySelector('#eq-app [data-act=af][data-v="back|"]').click();await w(150);}
  document.querySelector('#eq-app [data-act=af][data-v="new|"]').click();await w(150);r.props.push(document.getElementById('afn-num').value);
  const s=document.getElementById('afn-sect');s.value='idf';s.dispatchEvent(new Event('change',{bubbles:true}));await w(100);r.idf=document.getElementById('afn-num').value;r.all=T.affaires.all().map(a=>a.num).sort();return r;});
console.log('1) numéros d\'affaire :',JSON.stringify(out));
C.c1=out.props.join()==='O2610-01,O2610-02,O2610-03'&&out.idf==='I2610-01'&&out.all.join()==='O2610-01,O2610-02';
// ── 2) prévention : plus aucune mention des repas ; document en plein écran (bouton ⤢, retiré à la fermeture)
out=await page.evaluate(async()=>{const T=window.TRACE;const w=ms=>new Promise(r=>setTimeout(r,ms));const r={repas:/repas/i.test(JSON.stringify(T.docs.prevention||{}))};T.state.userId='karim';T.renderHome();document.getElementById('htEspace').click();await w(300);
  const ch=[...document.querySelectorAll('#eq-app .eq-subs .chip')].find(x=>/Documents/.test(x.textContent));if(ch){ch.click();await w(300);}const row=[...document.querySelectorAll('#eq-app .ac-row')].find(x=>/Règlement intérieur/.test(x.textContent));if(row){row.click();await w(500);}
  const m=document.getElementById('modal');const b=document.getElementById('dr-fs');r.btn=b&&b.textContent.trim();if(b){b.click();await w(100);}r.full=m.classList.contains('full');r.btn2=b&&b.textContent.trim();r.bodyH=(document.getElementById('dr-body')||{}).clientHeight||0;r.winH=innerHeight;
  if(b){b.click();await w(100);}r.reduit=!m.classList.contains('full');if(b){b.click();await w(80);}const x=m.querySelector('[data-close]');if(x){x.click();await w(150);}r.closedFull=m.classList.contains('full');r.shown=m.classList.contains('show');return r;});
console.log('2) prévention + plein écran :',JSON.stringify(out));
C.c2=!out.repas&&/Plein écran/.test(out.btn||'')&&out.full&&/Réduire/.test(out.btn2||'')&&out.bodyH>out.winH*0.6&&out.reduit&&!out.closedFull&&!out.shown;
// ── 3) géocodage : Karim « NANTES » 44000 (Géoplateforme), Julien « ST LO » 50000 (homonyme du 14 écarté → communes du code postal → Saint-Lô), Ethan « Xyzville » 99999 (introuvable partout)
await page.evaluate(()=>{const T=window.TRACE;const src=T.sites[Object.keys(T.sites).find(k=>k!=='__vide'&&T.sites[k]&&T.sites[k].lines)];const x=JSON.parse(JSON.stringify(src));x.id='demo_caen';x.name='Caen — Presqu\'île';x.fiche={ville:'Caen',secteur:'ouest',chef:'l:ethan'};x.conv={msgs:[],seq:1};x.qse={docs:[]};delete x.geo;T.sites.demo_caen=x;
  const P=T.espace.state().people;P['l:karim']=Object.assign({},P['l:karim']||{},{adresse:{voie:'3 rue de Strasbourg',cp:'44000',ville:'NANTES'},entree:'2016-10-20'});P['l:julien']=Object.assign({},P['l:julien']||{},{adresse:{voie:'',cp:'50000',ville:'ST LO'},entree:'2019-03-01'});P['l:ethan']=Object.assign({},P['l:ethan']||{},{adresse:{voie:'',cp:'99999',ville:'Xyzville'},entree:'2015-01-05'});
  /* planning : Karim à Caen 5 semaines d'affilée (S40 → S44), Julien et Ethan cette semaine */
  const iso=d=>d.getFullYear()+'-'+String(d.getMonth()+1).padStart(2,'0')+'-'+String(d.getDate()).padStart(2,'0');const wkKey=d=>{const x=new Date(d);x.setDate(x.getDate()+3-((x.getDay()+6)%7));const y=x.getFullYear();const j=new Date(y,0,4);const n=1+Math.round(((x-j)/864e5-3+((j.getDay()+6)%7))/7);return y+'-W'+String(n).padStart(2,'0');};
  for(let k=-2;k<=2;k++){const mon=new Date(2026,9,12+7*k);const days={};for(let i=0;i<5;i++){const d=new Date(mon);d.setDate(d.getDate()+i);days[iso(d)]=['demo_caen'];}const patch={'l:karim':days};if(k===0){patch['l:julien']=Object.assign({},days);patch['l:ethan']=Object.assign({},days);}T.espace.savePlanning(wkKey(mon),patch);}
  T.state.userId='ethan';T.renderHome();});await wait(300);
out=await page.evaluate(async()=>{const w=ms=>new Promise(r=>setTimeout(r,ms));document.getElementById('htExpl').click();await w(250);[...document.querySelectorAll('#eq-app .ac-row')].find(x=>/Grands déplacements/.test(x.textContent)).click();await w(1500);
  const rows=[...document.querySelectorAll('#eq-app .eq-row')].map(x=>x.textContent.replace(/\s+/g,' ').trim());return {karim:rows.find(x=>/Karim/.test(x)),julien:rows.find(x=>/Julien/.test(x)),ethan:rows.find(x=>/Ethan/.test(x))};});
console.log('3) géocodage :',JSON.stringify(out),'· requêtes',JSON.stringify(REQ));
C.c3=/cas 3/.test(out.karim||'')&&/~29\d km/.test(out.karim||'')&&/cas 2/.test(out.julien||'')&&/~6\d km/.test(out.julien||'')&&/introuvable \(99999 Xyzville\)/.test(out.ethan||'')
  &&REQ.geopf.includes('nantes|44000')&&REQ.geopf.includes('saint lo|50000')&&REQ.geoapi.includes('50000')&&!REQ.geoapi.includes('44000')&&REQ.meteo.includes('xyzville')&&!REQ.meteo.includes('nantes');
// ── 4) détente automatique (cas 3 : cycle de 2 semaines) sur 5 semaines d'affilée : S40 1/2 · S41 détente · S42 1/2 · S43 détente · S44 1/2 (l'ancienne version s'arrêtait après le 1er cycle)
const karimTag=async k=>page.evaluate(async k2=>{const w=ms=>new Promise(r=>setTimeout(r,ms));const b=document.querySelector(`#eq-app [data-act=gdweek][data-v="${k2}"]`);if(b){b.click();await w(250);}const row=[...document.querySelectorAll('#eq-app .eq-row')].find(x=>/Karim/.test(x.textContent));return row?row.textContent.replace(/\s+/g,' ').trim():'';},k);
const tags={};for(const k of [-1,-2]){tags[k]=await karimTag(k);}await karimTag(-1);await karimTag(0);tags[0]=await karimTag(0);for(const k of [1,2]){tags[k]=await karimTag(k);}
const tg=t=>/🏠 détente/.test(t)?'D':(t.match(/S(\d)\/2/)||[])[1]||'?';
out={seq:[-2,-1,0,1,2].map(k=>tg(tags[k]||'')).join(''),auto:/détente(?! · réglé)/.test(tags[-1]||'')&&!/réglé/.test(tags[-1]||''),nuits:[(tags[-2].match(/(\d+) nuitées/)||[])[1],(tags[-1].match(/(\d+) nuitées/)||[])[1]]};
console.log('4) cycle automatique :',JSON.stringify(out));
C.c4=out.seq==='1D1D1'&&out.auto&&out.nuits[0]==='7'&&out.nuits[1]==='5';
// ── 5) exception « détente » posée en S42 (Karim rentre plus tôt) → S42 détente (réglé), S43 repart à 1/2, S44 détente — puis retrait (↺ auto) → retour au cycle
out=await page.evaluate(async()=>{const w=ms=>new Promise(r=>setTimeout(r,ms));const go=async k=>{const b=document.querySelector(`#eq-app [data-act=gdweek][data-v="${k}"]`);if(b){b.click();await w(200);}};const row=()=>([...document.querySelectorAll('#eq-app .eq-row')].find(x=>/Karim/.test(x.textContent))||{textContent:''});
  await go(1);await go(0);const ex=row().querySelector('[data-act=gdx]');const r={exBtn:ex&&ex.textContent.trim()};if(ex){ex.click();await w(250);}r.s42=row().textContent.replace(/\s+/g,' ');await go(1);r.s43=row().textContent.replace(/\s+/g,' ');await go(2);r.s44=row().textContent.replace(/\s+/g,' ');
  await go(1);await go(0);const back=row().querySelector('[data-act=gdx]');r.backBtn=back&&back.textContent.trim();if(back){back.click();await w(250);}r.s42b=row().textContent.replace(/\s+/g,' ');return r;});
console.log('5) exception :',JSON.stringify({exBtn:out.exBtn,backBtn:out.backBtn,s42:tg(out.s42),s43:tg(out.s43),s44:tg(out.s44),s42b:tg(out.s42b),regle:/réglé/.test(out.s42)}));
C.c5=/exception/.test(out.exBtn||'')&&tg(out.s42)==='D'&&/réglé/.test(out.s42)&&tg(out.s43)==='1'&&tg(out.s44)==='D'&&/auto/.test(out.backBtn||'')&&tg(out.s42b)==='1'&&!/réglé/.test(out.s42b);
// ── 6) accorder la semaine (S42) → figé ; le planning change (Karim retiré le vendredi) → « ⚠ accordé ≠ planning » ; ↻ ré-accorde ; tout accorder la semaine
out=await page.evaluate(async()=>{const T=window.TRACE;const w=ms=>new Promise(r=>setTimeout(r,ms));const row=()=>([...document.querySelectorAll('#eq-app .eq-row')].find(x=>/Karim/.test(x.textContent))||{textContent:'',querySelector:()=>null});const r={};
  r.before=row().textContent.replace(/\s+/g,' ');const acc=row().querySelector('[data-act=gdacc]');r.accBtn=acc&&acc.textContent.trim();if(acc){acc.click();await w(250);}r.after=row().textContent.replace(/\s+/g,' ');
  const reg=T.reg.all('gdx').find(x=>x&&x.p==='l:karim'&&x.accord);r.snap=reg&&reg.accord;r.pending=(T.reg.pending()||[]).filter(x=>x.kind==='gdx').length;
  const P=T.espace.planning();const wk=Object.keys(P).find(k=>P[k].aff&&P[k].aff['l:karim']&&P[k].aff['l:karim']['2026-10-16']);const days=Object.assign({},P[wk].aff['l:karim']);delete days['2026-10-16'];T.espace.savePlanning(wk,{'l:karim':days});
  document.querySelector('#eq-app [data-act=gdweek][data-v="1"]').click();await w(150);document.querySelector('#eq-app [data-act=gdweek][data-v="0"]').click();await w(250);r.changed=row().textContent.replace(/\s+/g,' ');
  const re=row().querySelector('[data-act=gdacc]');r.reBtn=re&&re.textContent.trim();if(re){re.click();await w(250);}r.reacc=row().textContent.replace(/\s+/g,' ');
  const all=document.querySelector('#eq-app [data-act=gdaccall]');r.allBtn=all&&all.textContent.trim();if(all){all.click();await w(250);}r.stats=[...document.querySelectorAll('#eq-app .ac-stat')].map(x=>x.textContent.replace(/\s+/g,' ').trim());return r;});
console.log('6) accord :',JSON.stringify({accBtn:out.accBtn,snap:out.snap,pending:out.pending,after:/✓ accordé/.test(out.after),changed:/accordé ≠ planning/.test(out.changed),reBtn:out.reBtn,reacc:/✓ accordé/.test(out.reacc)&&!/≠/.test(out.reacc),allBtn:out.allBtn,stats:out.stats}));
C.c6=/à accorder/.test(out.before)&&/Accorder/.test(out.accBtn||'')&&out.snap&&out.snap.cas===3&&out.snap.jours===5&&out.snap.nuits===7&&out.snap.detente===false&&out.pending===0&&/✓ accordé/.test(out.after)&&/accordé ≠ planning/.test(out.changed)&&out.reBtn==='↻'&&/✓ accordé/.test(out.reacc)&&!/≠/.test(out.reacc)&&/Accorder les 1 grand déplacement/.test(out.allBtn||'')&&out.stats.some(t=>/^2 \/ 2\s*accordés/.test(t));
// ── 7) vue par personne · octobre 2026 : 5 semaines (S40 → S44), chantiers, cas, accords, totaux ; mois précédent = historique ; CSV
out=await page.evaluate(async()=>{const w=ms=>new Promise(r=>setTimeout(r,ms));[...document.querySelectorAll('#eq-app .eq-row')].find(x=>/Karim/.test(x.textContent)).querySelector('[data-act=gdpers]').click();await w(400);
  const rows=[...document.querySelectorAll('#eq-app table.af-tab tr')].map(x=>x.textContent.replace(/\s+/g,' ').trim());const sel=document.querySelector('#eq-app select[data-chg=gdPid]');return {mode:[...document.querySelectorAll('#eq-app .af-segs .chip.active')].map(x=>x.textContent.trim()),sel:sel&&sel.value,title:(document.querySelector('#eq-app .eq-wktitle b')||{}).textContent,rows,loc:/📍 localisée/.test(document.getElementById('eq-app').textContent)};});
console.log('7) vue personne :',JSON.stringify({...out,rows:out.rows.map(x=>x.slice(0,110))}));
const R=out.rows;C.c7=/Par personne/.test(out.mode.join())&&out.sel==='l:karim'&&/octobre 2026/.test(out.title||'')&&R.length===7&&/^S40/.test(R[1])&&/^S44/.test(R[5])&&/Caen/.test(R[3])&&/cas 3/.test(R[3])&&/✓ accordé/.test(R[3])&&/à accorder/.test(R[1])&&/🏠 détente \(auto\)/.test(R[2])&&/^Mois/.test(R[6])&&/1 \/ 5/.test(R[6])&&out.loc;
const dl=page.waitForEvent('download',{timeout:5000}).catch(()=>null);await page.evaluate(()=>document.querySelector('#eq-app [data-act=gdcsv]').click());const d=await dl;let csv='';if(d){const pth=await d.path();csv=fs.readFileSync(pth,'utf8');}
out={name:d&&d.suggestedFilename(),lines:csv.split(/\r\n/).filter(Boolean)};
await page.evaluate(async()=>{document.querySelector('#eq-app [data-act=gdmonth]').click();await new Promise(r=>setTimeout(r,300));});out.prev=await page.evaluate(()=>({title:(document.querySelector('#eq-app .eq-wktitle b')||{}).textContent,hist:/historique/.test((document.querySelector('#eq-app .eq-wktitle span')||{}).textContent||'')}));
console.log('7b) CSV + historique :',JSON.stringify({name:out.name,n:out.lines.length,head:(out.lines[0]||'').slice(0,80),s42:out.lines.find(l=>/^S42/.test(l)),prev:out.prev}));
C.c7b=/^GD_.*_2026-10\.csv$/.test(out.name||'')&&out.lines.length===6&&/^﻿?Semaine;Du;Au;Chantier/.test(out.lines[0])&&/^S42;.*Caen.*;4;.*;3;.*Ethan L\./.test(out.lines.find(l=>/^S42/.test(l))||'')&&/septembre 2026/.test(out.prev.title||'')&&out.prev.hist;
const bad=Object.entries(C).filter(([k,v])=>!v).map(([k])=>k);console.log(bad.length?'RESULTAT: ECHEC '+bad.join(','):'RESULTAT: TOUT VERT');console.log(logs.length?logs:'[]');
await browser.close();
