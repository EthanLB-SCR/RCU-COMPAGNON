// NAVETTES LISSÉES (10/11 nuit, règles d'Ethan) — de bout en bout, personnages de démo (rien ne part au serveur), novembre 2026, aujourd'hui mardi 01/12.
// Julien (Rennes) : S45 rythme 4 jours (4 × 11 h, vendredi non travaillé → 8,5 × 4 + 10, vendredi = chantier du jeudi) ; S46 férié le mercredi 11/11, 4 × 13 h →
// plafond 48 h, 4 h au-delà × 1,5 = 6 h au compteur à reporter ; S47 32 h sur 5 jours → 3 h prises au compteur à reporter ; S48 congé payé le mardi (déclaré dans
// Tracé RH → Absences) → lissé sur 4 jours, trajet inter-chantier Bayeux → Caen déclaré le mercredi soir (45 min, payé à part) ; Karim : S46 mardi attendu sans
// pointage → « à traiter », puis « validée telle quelle » à la main (motif) ; fin de mois : 3 h à reporter → « Prime » ; Moi → Heures : réel et navette, et le pourquoi ;
// débours : heures RÉELLES ; pointage : la question du trajet le matin (Julien vient de Bayeux) ; validation : « trajet inter-chantier non déclaré » (Karim).
import { chromium } from 'playwright';
import fs from 'fs';
import os from 'os';
import path from 'path';
import { openXlsx } from '../src/xlsx.js';
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
await page.evaluate(async()=>{const w=ms=>new Promise(r=>setTimeout(r,ms));document.getElementById('htExpl').click();await w(250);const r=[...document.querySelectorAll('#eq-app .ac-row')].find(x=>/Grands déplacements/.test(x.textContent));if(r){r.click();await w(1800);}});
// ── 1) absence : congé payé de Julien le mardi 24/11, saisi dans Tracé RH → Absences (au vrai clic)
await page.evaluate(async()=>{const w=ms=>new Promise(r=>setTimeout(r,ms));const b=document.getElementById('htRh');if(b){b.click();await w(500);}});
await page.click('[data-act="x"][data-v="rh|tab|abs"]');await wait(400);await page.click('[data-act="x"][data-v="rh|new|rhabs"]');await wait(300);
await page.evaluate(()=>{const g=k=>document.getElementById(k);g('rh-p').value='l:julien';g('rh-type').value='cp';g('rh-du').value='2026-11-24';g('rh-au').value='2026-11-24';g('rh-du').dispatchEvent(new Event('change'));g('rh-note').value='test';});
await page.click('#rh-ok');await wait(500);
// ── 2) la navette de Julien (calcul) : semaines lissées et leurs raisons
let out=await page.evaluate(()=>{const R=window.TRACE.espace.navette('l:julien','2026-11');const N=R.N;const wk=m=>N.weeks.find(w=>w.mon===m);const L=m=>wk(m).liss;const day=d=>N.lines.find(l=>l.kind==='day'&&l.d===d)||{};
  return {etats:N.weeks.map(w=>w.liss&&w.liss.etat),s45:L('2026-11-02').jours.map(j=>j.h),ven6:[day('2026-11-06').hours,day('2026-11-06').chantier],s46:[L('2026-11-09').n,L('2026-11-09').cap,L('2026-11-09').versReport,L('2026-11-09').versReportMaj,day('2026-11-11').chantier],
    s47:[L('2026-11-16').deReport,L('2026-11-16').total,wk('2026-11-16').total],s48:[L('2026-11-23').n,L('2026-11-23').cible,day('2026-11-24').chantier,day('2026-11-25').chantier,L('2026-11-23').it],it:N.it,expl46:L('2026-11-09').expl.join(' | '),expl47:L('2026-11-16').expl.join(' | '),hs:N.hs,repl:R.sheet.cells,refs:R.sheet.refs};});
const cells=out.repl;const refs=out.refs;delete out.repl;delete out.refs;
const sat46=cells['I'+refs.satRow[1]],hs150_46=refs.hs150Rows.find(r=>r>refs.satRow[1]);out.xl46={tot:sat46&&sat46.f,j:(cells['J'+hs150_46]||{}).v,l:(cells['L'+hs150_46]||{}).v};out.itBox=refs.rIt?cells['I'+refs.rIt].v:null;
console.log('2) navette de Julien :',J(out));
C.c2=J(out.etats)==='["lisse","lisse","lisse","lisse"]'&&J(out.s45)==='[8.5,8.5,8.5,8.5,10,null]'&&out.ven6[0]===10&&/^Caen/.test(out.ven6[1])&&J(out.s46.slice(0,4))==='[4,48,4,6]'&&/FÉRIÉ/.test(out.s46[4])
  &&J(out.s47)==='[3,35,35]'&&out.s48[0]===4&&out.s48[1]===28&&/CONGÉS PAYÉS/.test(out.s48[2])&&/INTER-CHANTIER 0,75 H/.test(out.s48[3])&&out.s48[4]===0.75&&out.it===0.75&&out.itBox===0.75
  &&/Plafond 48 h \(48 h par semaine = 12 h × 4 j\) : 4 h au-delà \(49e → 52e heure\)/.test(out.expl46)&&/= 6 h au compteur à reporter/.test(out.expl46)&&/mercredi 11\/11 : férié/.test(out.expl46)&&/il manque 3 h → 3 h prises au compteur à reporter/.test(out.expl47)&&out.xl46.j===4&&out.xl46.l===6;
// ── 3) Tracé RH → Navettes (Ethan, administrateur) : novembre, à traiter (Karim), la semaine de Karim « validée telle quelle » à la main
await page.click('[data-act="x"][data-v="rh|tab|nav"]');await wait(600);await page.click('[data-act="x"][data-v="rh|navm|2026-11"]');await wait(900);
const rh=()=>page.evaluate(()=>{const A=document.getElementById('eq-app')||document.body;return {txt:A.textContent.replace(/\s+/g,' '),tiles:[...A.querySelectorAll('.ac-stat')].map(x=>x.textContent.replace(/\s+/g,' ').trim()),todo:[...A.querySelectorAll('[data-v^="rh|navw|"]')].map(b=>b.dataset.v),
  cells:[...A.querySelectorAll('.nav-cell')].length,choix:[...A.querySelectorAll('[data-v^="rh|navchoix|"]')].map(b=>b.dataset.v+'='+b.textContent.trim())};});
out=await rh();console.log('3) Tracé RH → Navettes :',J({tiles:out.tiles,todo:out.todo.slice(0,6),cells:out.cells,choix:out.choix}));
C.c3=/Novembre 2026/.test(out.txt)&&out.tiles.some(t=>/^1\s*à traiter/.test(t))&&out.tiles.some(t=>/au-delà du plafond/.test(t))&&out.todo.includes('rh|navw|l:karim|2026-11-09')&&/Karim.*S46.*jour attendu sans pointage/.test(out.txt)&&out.cells>=8
  &&out.choix.some(c=>/^rh\|navchoix\|l:julien\|2026-11\|prime\|3=💶 Prime 3 h$/.test(c))&&out.choix.some(c=>/reporter=↪ Reporter$/.test(c));
await page.click('[data-act="x"][data-v="rh|navw|l:karim|2026-11-09"]');await wait(500);
out={modal:await page.evaluate(()=>{const m=document.querySelector('.modal, #modal, [role=dialog]')||document.body;return m.textContent.replace(/\s+/g,' ');})};
await page.evaluate(()=>{document.getElementById('nv-force').checked=true;document.getElementById('nv-motif').value='malade, arrêt à recevoir';});await page.click('#nv-ok');await wait(800);
out.after=await rh();out.k=await page.evaluate(()=>{const N=window.TRACE.espace.navette('l:karim','2026-11').N;const L=N.weeks.find(w=>w.mon==='2026-11-09').liss;return {etat:L.etat,total:L.total,expl:L.expl.join(' | '),flags:L.flags};});
console.log('3b) Karim, S46 :',J({modal:out.modal.slice(0,260),tiles:out.after.tiles,k:out.k}));
C.c3b=/Lissage en attente : mardi 10\/11 \(attendu, sans pointage ni absence\)/.test(out.modal)&&/Avoir la main sur cette semaine/.test(out.modal)&&out.k.etat==='lisse'&&out.k.flags.includes('main')&&/Réglé à la main par .* — malade, arrêt à recevoir/.test(out.k.expl)
  /* validée telle quelle : 27 h sur 4 jours, objectif 28 h, compteurs vides → 1 h « sans solde à poser » (reste à traiter, pour une autre raison) */&&/il manque 1 h — ⚠ 1 h non couvertes, compteurs vides : faire poser du sans solde/.test(out.k.expl)&&out.k.flags.includes('sansSolde')&&out.after.tiles.some(t=>/^1\s*sans solde à poser/.test(t))&&out.after.tiles.some(t=>/^1\s*réglées à la main/.test(t))&&/Karim.*S46.*sans solde à poser/.test(out.after.txt);
// ── 4) fin de mois : Julien a 3 h à reporter (6 − 3) → « Prime » → l'Excel les porte en prime, le compteur repart de zéro
await page.click('[data-act="x"][data-v="rh|navchoix|l:julien|2026-11|prime|3"]');await wait(800);
const dlP=page.waitForEvent('download',{timeout:8000}).catch(()=>null);await page.click('[data-act="gdnavx"][data-v="l:julien|2026-11"]');const dl=await dlP;
let X=null;if(dl){const f=path.join(os.tmpdir(),'navliss_'+process.pid+'.xlsx');fs.copyFileSync(await dl.path(),f);const wb=await openXlsx(new Uint8Array(fs.readFileSync(f)).buffer);const sh=await wb.sheet(wb.sheets[0].name);
  const rowOf=(col,re)=>{for(let r=1;r<=sh.maxR;r++){const v=sh.get(col+r);if(typeof v==='string'&&re.test(v))return r;}return -1;};const rP=rowOf('H',/^Payées en prime ce mois$/),rI=rowOf('H',/^Payées en plus des heures ci-dessus$/),rV=rowOf('H',/^CAEN — PRESQU'ÎLE$/);
  X={name:dl.suggestedFilename(),prime:sh.get('I'+rP),it:sh.get('I'+rI),note:sh.get('A'+rowOf('A',/^Pré-rempli par Tracé/)),fri:(()=>{for(let r=1;r<=sh.maxR;r++){if(sh.get('C'+r)==='V'&&sh.get('D'+r)===6)return [sh.get('H'+r),sh.get('I'+r)];}return null;})()};try{fs.unlinkSync(f);}catch(e){}}
out={X,rep:await page.evaluate(()=>{const T=window.TRACE.espace.compteurs('l:julien','2026-11-29');return T.rep.solde;}),choix:(await rh()).txt.match(/Julien[^·]*· payées en prime : 3 h/)?.[0]||''};
console.log('4) prime de fin de mois :',J(out));
C.c4=out.X&&out.X.prime===3&&out.X.it===0.75&&/lissées sur 5 jours/.test(out.X.note||'')&&out.X.fri&&/^CAEN/.test(out.X.fri[0])&&out.X.fri[1]===10&&out.rep===0&&!!out.choix;
// ── 5) Moi → Heures (Julien) : réel et navette, et semaine par semaine le pourquoi
out=await page.evaluate(async()=>{const w=ms=>new Promise(r=>setTimeout(r,ms));const T=window.TRACE;T.state.userId='julien';T.renderHome();await w(300);const tab=document.getElementById('htMoi')||document.getElementById('htEspace');if(tab){tab.click();await w(300);}
  const go=[...document.querySelectorAll('#eq-app [data-act=sub],#eq-app [data-act=tab],#eq-app .ac-row,#eq-app button')].find(b=>/^\s*(⏱\s*)?Heures\b/.test(b.textContent)||/Mes heures/.test(b.textContent));if(go){go.click();await w(500);}
  const c=()=>document.querySelector('#eq-app .mynav');if(!c())return {card:false};const prev=c().querySelector('[data-act=mynavm]');prev.click();await w(600);const k=c();const d=k.querySelector('details.nav-expl');if(d)d.open=true;
  return {card:true,titre:k.querySelector('.eq-wktitle').textContent.replace(/\s+/g,' ').trim(),tiles:[...k.querySelectorAll('.ac-stat')].map(x=>x.textContent.replace(/\s+/g,' ').trim()),expl:d?d.textContent.replace(/\s+/g,' ').slice(0,600):''};});
console.log('5) Moi → ma navette :',J(out));
C.c5=out.card&&/novembre 2026/i.test(out.titre)&&out.tiles.some(t=>/^164 h\s*pointées/.test(t))&&out.tiles.some(t=>/^163 h\s*sur la navette \(lissées\)/.test(t))&&out.tiles.some(t=>/^0,75 h\s*inter-chantier/.test(t))&&/S45 · lissée/.test(out.expl)&&/Vendredi non travaillé : chantier du jeudi/.test(out.expl);
// ── 6) débours : les heures RÉELLES (jamais la navette lissée) — lundi 02/11 : 11 h pointées (8,5 sur la navette) ; mercredi 25/11 : 9 h + 0,75 h de trajet
out=await page.evaluate(()=>{const ST=window.TRACE.espace.state();const x=d=>ST.pointages.find(p=>p.p==='l:julien'&&p.d===d);const h=d=>Math.round(window.TRACE.espace.heures(x(d)).h*100)/100;return [h('2026-11-02'),h('2026-11-25')];});
console.log('6) débours (réel) :',J(out));C.c6=J(out)==='[11,9.75]';
// ── 7) pointage de Julien ce matin : il vient de Bayeux (hier), planifié à Caen → la question du trajet ; « 45 min » → payé à part
out=await page.evaluate(async()=>{const w=ms=>new Promise(r=>setTimeout(r,ms));const T=window.TRACE;T.state.userId='julien';T.renderHome();await w(400);const home=document.getElementById('htHome')||document.getElementById('htAccueil');if(home){home.click();await w(400);}
  const st=document.querySelector('[data-act=pointer][data-v=start]');if(!st)return {start:false,txt:(document.getElementById('eq-app')||document.body).textContent.replace(/\s+/g,' ').slice(0,300)};st.click();await w(600);
  const q=document.querySelector('.pt-route');const r={start:true,q:q?q.textContent.replace(/\s+/g,' ').trim():''};const b=[...document.querySelectorAll('[data-act=ptroute]')].find(x=>/^45 min$/.test(x.textContent.trim()));if(b){b.click();await w(500);}
  const ST=T.espace.state();const x=ST.pointages.find(p=>p.p==='l:julien'&&p.d==='2026-12-01');r.ev=x?(x.events||[]).map(e=>e.t+(e.min?':'+e.min:'')).join():'';r.ok=(document.querySelector('.pt-route-ok')||{}).textContent||'';return r;});
console.log('7) trajet le matin :',J(out));
C.c7=out.start&&/Tu viens de Bayeux — Gare · ~\d+ km — trajet inter-chantier ce matin \?/.test(out.q)&&/route:45/.test(out.ev)&&/Trajet inter-chantier déclaré : 45 min/.test(out.ok);
// ── 8) validation (Ethan) : Karim, mardi 17/11 sur Bayeux après Caen la veille, rien de déclaré → « trajet inter-chantier non déclaré » ; « 1 h » → réglé
out=await page.evaluate(async()=>{const w=ms=>new Promise(r=>setTimeout(r,ms));const T=window.TRACE;T.state.userId='ethan';T.renderHome();await w(300);document.getElementById('htExpl').click();await w(300);
  const r=[...document.querySelectorAll('#eq-app .ac-row')].find(x=>/Pointages à valider/.test(x.textContent));if(!r)return {row:false};r.click();await w(600);
  const jb=document.querySelector('#eq-app [data-act=valjour][data-v="2026-11-17"]');if(jb){jb.click();await w(500);}else{window.TRACE.espace.state();}
  const row=()=>[...document.querySelectorAll('#eq-app .eq-vrow')].find(x=>/Karim/.test(x.textContent));const k=row();const o={row:!!k,ano:k?(k.querySelector('.pi-ano')||{}).textContent||'':'',q:!!(k&&k.querySelector('[data-act=ptroutechef]'))};
  const b=k&&[...k.querySelectorAll('[data-act=ptroutechef]')].find(x=>/^1 h$/.test(x.textContent.trim()));if(b){b.click();await w(600);}const k2=row();o.after=k2?(k2.querySelector('.pi-ano')||{}).textContent||'':'?';o.trace=k2?(k2.querySelector('.pi-trace')||{}).textContent||'':'';return o;});
console.log('8) validation : trajet non déclaré :',J(out));
C.c8=out.row&&/trajet inter-chantier non déclaré \(\d+ km depuis la veille\)/.test(out.ano)&&out.q&&!/trajet inter-chantier/.test(out.after)&&/🚐 trajet inter-chantier 1 h \(payé à part\) · ajouté par/.test(out.trace);
console.log('console :',J(logs));C.c9=!logs.length;
const bad=Object.keys(C).filter(k=>!C[k]);console.log(J(C));console.log(bad.length?'RESULTAT: ECHEC '+bad.join(','):'RESULTAT: TOUT VERT');
await browser.close();
