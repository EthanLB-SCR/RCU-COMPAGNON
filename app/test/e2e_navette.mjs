// NAVETTE DE PAIE AU FORMAT SCR (13/10 nuit, Ethan : « c'est ça une navette type » — NAVETTE_09-26, feuille d'heures récapitulative mensuelle des RH).
// Septembre 2026 reproduit à l'identique du modèle avec des personnages fictifs : Julien (Rennes) en cas 2 sur Caen (mardi 1/9 sur Bayeux), heures du modèle
// pointées dans l'appli ; Karim (Nantes) en cas 3 une semaine. Contrôles : semaines du mois (jeudi dans le mois : 30/08 → 27/09, 28-30/09 en régul. sur octobre),
// lignes jour par jour (cas, ½ trajets, hôtel, repas, chantier, heures, km), formules Excel recalculées par LibreOffice (totaux 20 hôtels · 40 repas, 4 trajets à
// 15 €, HS 27 h à 125 % et 5 h à 150 %, compteurs), classeur « toutes les navettes du mois » (un onglet par personne), CSV d'avant toujours là.
import { chromium } from 'playwright';
import fs from 'fs';
import os from 'os';
import path from 'path';
import { execFileSync } from 'child_process';
import { openXlsx, makeStyledXlsx } from '../src/xlsx.js';
import { buildNavette, navetteSheet, NAV_STYLES } from '../src/navette.js';
const calc=file=>{try{const dir=fs.mkdtempSync(path.join(os.tmpdir(),'navlo_'));execFileSync('soffice',['-env:UserInstallation=file://'+dir+'/profil','--headless','--convert-to','csv:Text - txt - csv (StarCalc):59,34,76,1,,0,false,true,false,false,false,-1',file,'--outdir',dir],{timeout:120000,stdio:'ignore'});
  return fs.readdirSync(dir).filter(n=>/\.csv$/.test(n)).sort().map(n=>fs.readFileSync(path.join(dir,n),'utf8').split(/\r?\n/).map(l=>l.split(';')));}catch(e){return null;}};
// ── 0) unités : plafond de 48 h par semaine (13/10 nuit, Ethan : « s'ils font plus ça va dans un compteur heures à reporter, qu'on peut vider en prime »)
//      semaine à 50 h → 8 h à 125 % + 5 h à 150 % + 2 h à reporter ; 47,5 h → 8 + 4,5 ; compteur à reporter : 3 (mois d'avant) + 2 × 1,5 (majorées à l'entrée, 13/10 f) − 1 (prime) = 5
const C0={};{const H={'2026-09-07':10,'2026-09-08':10,'2026-09-09':10,'2026-09-10':10,'2026-09-11':10,'2026-09-14':9.5,'2026-09-15':9.5,'2026-09-16':9.5,'2026-09-17':9.5,'2026-09-18':9.5};
  const day=d=>{const k=new Date(d+'T12:00').getDay();const w=k>=1&&k<=5&&!!H[d];return {sites:w?[{nom:'CAEN',km:190,idf:false}]:[],worked:w,hours:H[d]??null,N:0,L:0,D:0,ar:0,cas:0};};
  const N=buildNavette({ym:'2026-09',nom:'Test',prenom:'Plafond',adresse:'',day,cpt:{report:3,prime:1}});const sh=navetteSheet(N);const f=path.join(os.tmpdir(),'nav48_'+process.pid+'.xlsx');fs.writeFileSync(f,await makeStyledXlsx([sh],NAV_STYLES));
  const R0=calc(f);const L=R0&&R0[0];const v=(r,c)=>L&&L[r-1]?L[r-1][c.charCodeAt(0)-65]:undefined;const w37=N.weeks.find(w=>w.n===37);
  const out0={model:[w37.total,w37.hs125,w37.hs150,w37.report],hs:N.hs,lo:L?{hs:[v(22,'I'),v(23,'I'),v(23,'J')],w38:[v(30,'I'),v(31,'I'),v(31,'J')],box:[v(sh.refs.rPrev,'I'),v(sh.refs.rMois,'I'),v(sh.refs.rEnt,'I'),v(sh.refs.rPrime,'I'),v(sh.refs.rFin,'I')]}:null};try{fs.unlinkSync(f);}catch(e){}
  console.log('0) plafond 48 h :',JSON.stringify(out0));
  C0.u48=JSON.stringify(out0.model)==='[50,8,5,2]'&&out0.hs.h125===16&&out0.hs.h150===9.5&&out0.hs.report===2&&(!out0.lo||(JSON.stringify(out0.lo.hs)==='["8","5","2"]'&&JSON.stringify(out0.lo.w38)==='["8","4.5","0"]'&&JSON.stringify(out0.lo.box)==='["3","2","3","1","5"]'));}
const BASE=process.env.BASE||'http://localhost:8765';
const browser=await chromium.launch({headless:true, executablePath: process.env.CHROMIUM_PATH||undefined});
const ctx=await browser.newContext({viewport:{width:1100,height:1000},acceptDownloads:true});const page=await ctx.newPage();
const logs=[];page.on('pageerror',e=>logs.push('PAGEERROR: '+e.message.slice(0,300)));page.on('console',m=>{if(m.type()==='error'&&!/supabase|Failed to fetch|net::ERR|404|WebSocket/i.test(m.text()))logs.push(m.text().slice(0,200));});
page.on('dialog',d=>d.accept().catch(()=>{}));
const strip=s=>String(s||'').normalize('NFD').replace(/[̀-ͯ]/g,'').toLowerCase().replace(/[-']/g,' ').replace(/\s+/g,' ').trim();
await page.route(u=>/(^|\.)geopf\.fr$/.test(u.hostname),route=>{const url=new URL(route.request().url());const q=strip(url.searchParams.get('q'));
  const F=(lon,lat,pc)=>({type:'FeatureCollection',features:[{type:'Feature',geometry:{type:'Point',coordinates:[lon,lat]},properties:{postcode:pc,type:'municipality'}}]});
  const body=q.includes('nantes')?F(-1.5536,47.2184,'44000'):q.includes('rennes')?F(-1.6778,48.1173,'35000'):q==='caen'?F(-0.3707,49.1829,'14000'):q==='bayeux'?F(-0.7026,49.2765,'14400'):{type:'FeatureCollection',features:[]};
  route.fulfill({status:200,contentType:'application/json',body:JSON.stringify(body)});});
await page.route(u=>u.hostname==='geo.api.gouv.fr',route=>route.fulfill({status:200,contentType:'application/json',body:'[]'}));
await page.route(u=>/open-meteo\.com$/.test(u.hostname),route=>route.fulfill({status:200,contentType:'application/json',body:JSON.stringify({results:[],daily:{time:[],weathercode:[],temperature_2m_max:[],precipitation_sum:[],precipitation_probability_max:[]}})}));
const C=Object.assign({},C0);const wait=ms=>page.waitForTimeout(ms);
await page.clock.install({time:new Date(2026,9,13,8,30,0)}); /* mardi 13/10/2026 */
await page.goto(BASE+'/index.html');await wait(600);await page.evaluate(()=>{localStorage.clear();localStorage.setItem('trace:wide','1');});await page.evaluate(()=>new Promise(r=>{try{const q=indexedDB.deleteDatabase('trace-kv');q.onsuccess=q.onerror=q.onblocked=()=>r();}catch(e){r();}}));
await page.reload();await wait(1200);{const s=await page.$('#loginSkip');if(s&&await s.isVisible())await s.click();await wait(700);}
// ── 0) chantiers Caen et Bayeux ; Julien (Rennes) : semaines du 31/08 au 2/10, lun → ven sur Caen (mardi 1/9 sur Bayeux) ; heures du modèle pointées ;
//      Karim (Nantes) : semaine du 14/09 sur Caen (cas 3)
const H={'2026-08-31':8.5,'2026-09-01':8.5,'2026-09-02':8.5,'2026-09-03':8.5,'2026-09-04':9.5,'2026-09-07':8,'2026-09-08':8,'2026-09-09':8,'2026-09-10':8,'2026-09-11':9,'2026-09-14':9.5,'2026-09-15':9.5,'2026-09-16':9.5,'2026-09-17':9.5,'2026-09-18':9.5,'2026-09-21':8,'2026-09-22':8,'2026-09-23':8,'2026-09-24':8,'2026-09-25':8,'2026-09-28':7,'2026-09-29':7,'2026-09-30':7};
await page.evaluate(H=>{const T=window.TRACE;const src=T.sites[Object.keys(T.sites).find(k=>k!=='__vide'&&T.sites[k]&&T.sites[k].lines)];
  const mk=(id,name,ville)=>{const x=JSON.parse(JSON.stringify(src));x.id=id;x.name=name;x.fiche={ville,secteur:'ouest',chef:'l:ethan'};x.conv={msgs:[],seq:1};x.qse={docs:[]};delete x.geo;T.sites[id]=x;};
  mk('demo_caen','Caen — Presqu\'île','Caen');mk('demo_bayeux','Bayeux — Gare','Bayeux');
  const ST=T.espace.state();const P=ST.people;P['l:julien']=Object.assign({},P['l:julien']||{},{adresse:{voie:'4 rue des Essais',cp:'35000',ville:'RENNES'}});P['l:karim']=Object.assign({},P['l:karim']||{},{adresse:{voie:'',cp:'44000',ville:'NANTES'}});
  const iso=d=>d.getFullYear()+'-'+String(d.getMonth()+1).padStart(2,'0')+'-'+String(d.getDate()).padStart(2,'0');const wkKey=d=>{const x2=new Date(d);x2.setDate(x2.getDate()+3-((x2.getDay()+6)%7));const y=x2.getFullYear();const j=new Date(y,0,4);const n=1+Math.round(((x2-j)/864e5-3+((j.getDay()+6)%7))/7);return y+'-W'+String(n).padStart(2,'0');};
  for(let k=0;k<5;k++){const mon=new Date(2026,7,31+7*k,12);const pj={},pk={};for(let i=0;i<5;i++){const d=new Date(mon);d.setDate(d.getDate()+i);const s=iso(d);pj[s]=[s==='2026-09-01'?'demo_bayeux':'demo_caen'];if(k===2)pk[s]=['demo_caen'];}
    const patch={'l:julien':pj};if(k===2)patch['l:karim']=pk;T.espace.savePlanning(wkKey(mon),patch);}
  const end=h=>{const m=450+Math.round(h*60);return String(Math.floor(m/60)).padStart(2,'0')+':'+String(m%60).padStart(2,'0');};
  Object.entries(H).forEach(([d,h])=>{ST.pointages.push({p:'l:julien',d,site:d==='2026-09-01'?'demo_bayeux':'demo_caen',status:'valide',corr:null,events:[{t:'start',at:d+'T07:30'},{t:'end',at:d+'T'+end(h)}],val:[]});});
  T.state.userId='ethan';T.renderHome();},H);await wait(300);
// ── 1) Grands déplacements → par personne · mois → Julien → septembre : résumé de la navette
let out=await page.evaluate(async()=>{const w=ms=>new Promise(r=>setTimeout(r,ms));document.getElementById('htExpl').click();await w(250);[...document.querySelectorAll('#eq-app .ac-row')].find(x=>/Grands déplacements/.test(x.textContent)).click();await w(1500);
  const b=document.querySelector('#eq-app [data-act=gdmode][data-v=personne]');if(b){b.click();await w(400);}const sel=document.querySelector('#eq-app select[data-chg=gdPid]');if(sel){sel.value='l:julien';sel.dispatchEvent(new Event('change',{bubbles:true}));await w(500);}
  const prev=document.querySelector('#eq-app [data-act=gdmonth]');if(prev){prev.click();await w(1500);}
  return {mois:(document.querySelector('#eq-app .eq-wktitle b')||{}).textContent||'',sum:((document.querySelector('#eq-app .gd-navsum')||{}).textContent||'').replace(/\s+/g,' ').trim(),btn:!!document.querySelector('#eq-app [data-act=gdnavx]'),all:!!document.querySelector('#eq-app [data-act=gdnavall]'),csv:!!document.querySelector('#eq-app [data-act=gdnavcsv]')};});
console.log('1) résumé :',JSON.stringify(out));
C.c1=/Septembre 2026/i.test(out.mois)&&/Semaines comptées : 30\/08 → 27\/09 \(jeudi dans le mois\) · fin du mois en régul\. sur octobre · 20 hôtels · 40 repas · 4 trajets à 15 € · HS : 27 h à 125 %, 5 h à 150 %/.test(out.sum)&&!/sans pointage/.test(out.sum)&&out.btn&&out.all&&out.csv;
// ── 2) « ⬇ Navette du mois (Excel, format SCR) » au vrai clic : le fichier, lu cellule par cellule
await page.click('#eq-app details.gd-navcard > summary');await wait(300);
const dl=async sel=>{const p=page.waitForEvent('download',{timeout:8000}).catch(()=>null);await page.click(sel);const d=await p;if(!d)return null;const f=path.join(os.tmpdir(),'nav_'+process.pid+'_'+d.suggestedFilename());fs.copyFileSync(await d.path(),f);return {name:d.suggestedFilename(),file:f};};
const X1=await dl('#eq-app [data-act=gdnavx]');
const wb=X1?await openXlsx(new Uint8Array(fs.readFileSync(X1.file)).buffer):null;const sh=wb?await wb.sheet(wb.sheets[0].name):null;
const g=a=>sh?sh.get(a):null,f=a=>sh?sh.f(a):null;const rowOf=(col,re)=>{if(!sh)return -1;for(let r=1;r<=sh.maxR;r++){const v=sh.get(col+r);if(typeof v==='string'&&re.test(v))return r;}return -1;};
out={name:X1&&X1.name,sheet:wb&&wb.sheets.map(s=>s.name),nom:g('H2'),mois:g('J2'),adr:g('H4'),head:['A6','B6','E6','F6','G6','H6','I6','J6'].map(g),
  l7:['C7','D7','E7','G7'].map(g),l8:['A8','B8','C8','D8','E8','G8','H8','I8','J8'].map(g),l9:['H9','I9','J9'].map(g),l12:['B12','G12','I12'],tot36:[g('H13'),f('I13'),g('J13')],hs:[g('H14'),f('I14'),g('H15'),f('I15')],
  regul:rowOf('H',/^Régul\. HS et dépla\. sur octobre$/),last:rowOf('H',/^TOTAL SEMAINE - 39$/),sum:[f('E43'),f('G43')],ind:[g('A47'),f('C47')],box:rowOf('H',/^COMPTEUR FIN DE MOIS$/),rep:f('J15'),repBox:rowOf('H',/^HEURES À REPORTER \(> 48 h \/ semaine\)$/),note:g('A'+(rowOf('A',/^Pré-rempli par TRACÉ/)))};
out.l12=['B12','G12','I12'].map(g);
console.log('2) navette (Excel) :',JSON.stringify(out));
C.c2=/^Navette_.*Julien.*_2026-09\.xlsx$/i.test(out.name||'')&&/^NOM : /.test(out.nom||'')&&out.mois==='MOIS DE : SEPTEMBRE'&&/^ADRESSE : 4 RUE DES ESSAIS - 35000 RENNES$/.test(out.adr||'')
  &&JSON.stringify(out.head)===JSON.stringify(['TYPE CAS','IND. TPS DE TRAJET','HOTEL','HOTEL IDF','REPAS','CHANTIER','NB HEURES','NB KM'])
  &&JSON.stringify(out.l7)===JSON.stringify(['D',30,1,1])&&out.l8[0]==='CAS 2'&&out.l8[1]===0.5&&out.l8[2]==='L'&&out.l8[3]===31&&out.l8[4]===1&&out.l8[5]===2&&/^CAEN/.test(out.l8[6])&&out.l8[7]===8.5&&/^\d+ KM\/GD$/.test(out.l8[8])
  &&/^BAYEUX/.test(out.l9[0])&&out.l9[1]===8.5&&/^\d+ KM$/.test(out.l9[2])&&JSON.stringify(out.l12)===JSON.stringify([0.5,1,9.5])
  &&out.tot36[0]==='TOTAL SEMAINE - 36'&&out.tot36[1]==='SUM(I8:I12)'&&out.tot36[2]==='CONTRAT 35H'&&out.hs[0]==='HEURES SUP - 125%'&&out.hs[1]==='MAX(MIN(I13,43)-35,0)'/* 13/10 (f) : rang absolu (36e → 125 %, 44e → 150 %) */&&out.hs[2]==='HEURES SUP - 150%'&&out.hs[3]==='MAX(MIN(I13,48)-43,0)'&&out.rep==='MAX(I13-48,0)'&&out.repBox>0
  &&out.regul===40&&out.last===37&&out.sum[0]==='SUM(E7:E42)'&&out.sum[1]==='SUM(G7:G42)'&&out.ind[0]==='INDEM TRAJET 15€'&&out.ind[1]==='SUMIF(K7:K42,2,B7:B42)'&&out.box>0&&/^Pré-rempli par TRACÉ le 13\/10\/2026/.test(out.note||'');
// ── 3) formules recalculées (LibreOffice, comme Excel à l'ouverture) : totaux, trajets, heures sup, compteurs
const R=X1?calc(X1.file):null;const lo=!!R;const S0=R&&R[0];const cell=(r,c)=>S0&&S0[r-1]?S0[r-1][c.charCodeAt(0)-65]:undefined;const lab=(re)=>S0?S0.findIndex(l=>re.test(l[7]||'')):-1;
out=lo?{sem:[13,21,29,37].map(r=>cell(r,'I')),hs125:[14,22,30,38].map(r=>cell(r,'I')),hs150:[15,23,31,39].map(r=>cell(r,'I')),tot:['E','F','G'].map(c=>cell(43,c)),ind:[cell(47,'C'),cell(48,'C'),cell(49,'C')],
  hsm:[S0[lab(/^NB HEURES 125%$/)][8],S0[lab(/^NB HEURES 150%$/)][8]],fin:S0[lab(/^Compteur fin de mois$/)][8]}:{lo:false};
console.log('3) recalcul :',JSON.stringify(out));
C.c3=!lo||(JSON.stringify(out.sem)===JSON.stringify(['43.5','41','47.5','40'])&&JSON.stringify(out.hs125)===JSON.stringify(['8','6','8','5'])&&JSON.stringify(out.hs150)===JSON.stringify(['0.5','0','4.5','0'])
  &&JSON.stringify(out.tot)===JSON.stringify(['20','0','40'])&&JSON.stringify(out.ind)===JSON.stringify(['4','0','0'])&&out.hsm[0]==='27'&&out.hsm[1]==='5'&&out.fin==='0');
// ── 4) « Toutes les navettes du mois » : un onglet par personne (Julien, Karim) ; Karim en cas 3 → 1 trajet à 30 €
const X2=await dl('#eq-app [data-act=gdnavall]');const wb2=X2?await openXlsx(new Uint8Array(fs.readFileSync(X2.file)).buffer):null;
out={name:X2&&X2.name,sheets:wb2?wb2.sheets.map(s=>s.name):[]};const R2=X2?calc(X2.file):null;
if(wb2){const k=wb2.sheets.findIndex(s=>/Karim/.test(s.name));const shk=k>=0?await wb2.sheet(wb2.sheets[k].name):null;out.kCas=shk?Object.keys(shk.cells).map(a=>shk.cells[a].v).filter(v=>/^CAS \d$/.test(String(v))):[];
  if(R2&&R2[k]){const L=R2[k];const i30=L.findIndex(l=>l[0]==='INDEM TRAJET 30€');out.k30=i30>=0?L[i30][2]:null;const t=L.findIndex(l=>/^\d+$/.test(l[4]||'')&&l[2]===''&&l[7]===''&&l[0]===''&&l[3]===''&&l[6]!=='');out.kTot=t>=0?[L[t][4],L[t][6]]:null;}}
console.log('4) toutes les navettes :',JSON.stringify(out));
C.c4=out.name==='Navettes_2026-09.xlsx'&&out.sheets.length===2&&out.sheets.some(s=>/Julien/.test(s))&&out.sheets.some(s=>/Karim/.test(s))&&JSON.stringify(out.kCas)===JSON.stringify(['CAS 3'])&&(!R2||(out.k30==='1'&&out.kTot&&out.kTot[0]==='5'&&out.kTot[1]==='10'));
// ── 5) le CSV d'avant (jours en colonnes) est toujours là
const X3=await dl('#eq-app [data-act=gdnavcsv]');out={csv:X3&&X3.name};console.log('5) CSV :',JSON.stringify(out));
C.c5=/^Navette_GD_.*_2026-09\.csv$/.test(out.csv||'');
[X1,X2,X3].forEach(x=>{try{if(x)fs.unlinkSync(x.file);}catch(e){}});
const bad=Object.entries(C).filter(([k,v])=>!v).map(([k])=>k);console.log(lo?'(formules recalculées par LibreOffice)':'(LibreOffice absent : recalcul non vérifié)');console.log(bad.length?'RESULTAT: ECHEC '+bad.join(','):'RESULTAT: TOUT VERT');console.log(logs.length?logs:'[]');
await browser.close();
