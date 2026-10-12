// GRANDS DÉPLACEMENTS JOUR PAR JOUR (13/10 soir, retours d'Ethan) : 4 jours lun → jeu = même forfait que 5 jours (5 nuitées, 10 repas) ; congé la semaine
// d'après = pas de nuit du dimanche ; lundi pas travaillé = arrivée le lundi soir ; « pas de détente » = pas d'indemnité de trajet ; vue du mois (calendrier
// dim → sam, accordé / calculé), ajustement d'un jour par la RH (accord figé avec le jour corrigé), navette du mois (jours en colonnes) + CSV ; adresses à vérifier
// (introuvable, trouvée par le nom seul, code postal invalide) avec ↻.
import { chromium } from 'playwright';
import fs from 'fs';
const BASE=process.env.BASE||'http://localhost:8765';
const browser=await chromium.launch({headless:true, executablePath: process.env.CHROMIUM_PATH||undefined});
const ctx=await browser.newContext({viewport:{width:1100,height:1000},acceptDownloads:true});const page=await ctx.newPage();
const logs=[];page.on('pageerror',e=>logs.push('PAGEERROR: '+e.message.slice(0,300)));page.on('console',m=>{if(m.type()==='error'&&!/supabase|Failed to fetch|net::ERR|404|WebSocket/i.test(m.text()))logs.push(m.text().slice(0,200));});
page.on('dialog',d=>d.accept().catch(()=>{}));
const strip=s=>String(s||'').normalize('NFD').replace(/[̀-ͯ]/g,'').toLowerCase().replace(/[-']/g,' ').replace(/\s+/g,' ').trim();
/* géocodage simulé : Nantes 44000 et Rennes 35000 et Caen (chantier) à la Géoplateforme ; Vannes : ni Géoplateforme ni communes du code postal → trouvée par le NOM seul (Open-Meteo) */
await page.route(u=>/(^|\.)geopf\.fr$/.test(u.hostname),route=>{const url=new URL(route.request().url());const q=strip(url.searchParams.get('q'));
  const F=(lon,lat,pc)=>({type:'FeatureCollection',features:[{type:'Feature',geometry:{type:'Point',coordinates:[lon,lat]},properties:{postcode:pc,type:'municipality'}}]});
  const body=q.includes('nantes')?F(-1.5536,47.2184,'44000'):q.includes('rennes')?F(-1.6778,48.1173,'35000'):q==='caen'?F(-0.3707,49.1829,'14000'):{type:'FeatureCollection',features:[]};
  route.fulfill({status:200,contentType:'application/json',body:JSON.stringify(body)});});
await page.route(u=>u.hostname==='geo.api.gouv.fr',route=>route.fulfill({status:200,contentType:'application/json',body:'[]'}));
await page.route(u=>/open-meteo\.com$/.test(u.hostname),route=>{const url=route.request().url();if(url.includes('geocoding-api')){const n=strip(new URL(url).searchParams.get('name'));return route.fulfill({status:200,contentType:'application/json',body:JSON.stringify({results:n.includes('vannes')?[{name:'Vannes',latitude:47.658,longitude:-2.760}]:[]})});}
  return route.fulfill({status:200,contentType:'application/json',body:JSON.stringify({daily:{time:[],weathercode:[],temperature_2m_max:[],precipitation_sum:[],precipitation_probability_max:[]}})});});
const C={};const wait=ms=>page.waitForTimeout(ms);
await page.clock.install({time:new Date(2026,9,13,8,30,0)}); /* mardi 13/10/2026 : semaine 42 (12 → 16/10) */
await page.goto(BASE+'/index.html');await wait(600);await page.evaluate(()=>{localStorage.clear();localStorage.setItem('trace:wide','1');});await page.evaluate(()=>new Promise(r=>{try{const q=indexedDB.deleteDatabase('trace-kv');q.onsuccess=q.onerror=q.onblocked=()=>r();}catch(e){r();}}));
await page.reload();await wait(1200);
const skip=async()=>{const s=await page.$('#loginSkip');if(s&&await s.isVisible())await s.click();await wait(700);};await skip();
// ── 0) chantier Caen ; Julien à Rennes (cas 2) : S42 et S43 lun → jeu (4 jours), S44 congé (pas planifié, les autres le sont), S45 mar → jeu (lundi 2/11 pas travaillé) ;
//      Karim à Nantes (cas 3) : S41 → S44 lun → ven ; Ethan : adresse introuvable
await page.evaluate(()=>{const T=window.TRACE;const src=T.sites[Object.keys(T.sites).find(k=>k!=='__vide'&&T.sites[k]&&T.sites[k].lines)];const x=JSON.parse(JSON.stringify(src));x.id='demo_caen';x.name='Caen — Presqu\'île';x.fiche={ville:'Caen',secteur:'ouest',chef:'l:ethan'};x.conv={msgs:[],seq:1};x.qse={docs:[]};delete x.geo;T.sites.demo_caen=x;
  const P=T.espace.state().people;P['l:karim']=Object.assign({},P['l:karim']||{},{adresse:{voie:'',cp:'44000',ville:'NANTES'}});P['l:julien']=Object.assign({},P['l:julien']||{},{adresse:{voie:'',cp:'35000',ville:'RENNES'}});P['l:ethan']=Object.assign({},P['l:ethan']||{},{adresse:{voie:'',cp:'99999',ville:'Xyzville'}});
  const iso=d=>d.getFullYear()+'-'+String(d.getMonth()+1).padStart(2,'0')+'-'+String(d.getDate()).padStart(2,'0');const wkKey=d=>{const x2=new Date(d);x2.setDate(x2.getDate()+3-((x2.getDay()+6)%7));const y=x2.getFullYear();const j=new Date(y,0,4);const n=1+Math.round(((x2-j)/864e5-3+((j.getDay()+6)%7))/7);return y+'-W'+String(n).padStart(2,'0');};
  const days=(mon,idx)=>{const o={};idx.forEach(i=>{const d=new Date(mon);d.setDate(d.getDate()+i);o[iso(d)]=['demo_caen'];});return o;};
  for(let k=-1;k<=3;k++){const mon=new Date(2026,9,12+7*k);const patch={};if(k<=2)patch['l:karim']=days(mon,[0,1,2,3,4]);if(k===0||k===1)patch['l:julien']=days(mon,[0,1,2,3]);if(k===3)patch['l:julien']=days(mon,[1,2,3]);T.espace.savePlanning(wkKey(mon),patch);}
  T.state.userId='ethan';T.renderHome();});await wait(300);
const go=async k=>page.evaluate(async k2=>{const w=ms=>new Promise(r=>setTimeout(r,ms));const b=document.querySelector(`#eq-app [data-act=gdweek][data-v="${k2}"]`);if(b){b.click();await w(250);}},k);
const rowOf=async who=>page.evaluate(w2=>{const r=[...document.querySelectorAll('#eq-app .eq-row')].find(x=>x.textContent.includes(w2)&&x.querySelector('[data-act=gdpers]'));return r?r.textContent.replace(/\s+/g,' ').trim():'';},who);
// ── 1) semaine 42 : Julien 4 jours (lun → jeu) = 5 nuitées · 10 repas · 15 € (cas 2) ; Karim cas 3 ; adresses à vérifier : Ethan introuvable
let out=await page.evaluate(async()=>{const w=ms=>new Promise(r=>setTimeout(r,ms));document.getElementById('htExpl').click();await w(250);[...document.querySelectorAll('#eq-app .ac-row')].find(x=>/Grands déplacements/.test(x.textContent)).click();await w(1800);
  const card=document.querySelector('#eq-app details[data-gdaddr]');return {addr:card?card.textContent.replace(/\s+/g,' '):'',open:card&&card.open};});
out.julien=await rowOf('Julien');out.karim=await rowOf('Karim');
console.log('1) S42 :',JSON.stringify({...out,addr:out.addr.slice(0,700)}));
C.c1=/4 j · ~1\d\d km · cas 2 · 5 nuitées · 10 repas · 15 €/.test(out.julien)&&/cas 3/.test(out.karim)&&/Adresses à vérifier · \d+/.test(out.addr)&&/Ethan L\..*introuvable \(99999 Xyzville\)/.test(out.addr)&&out.open;
// ── 2) Karim : S42 est sa semaine de détente (cycle) → « ✗ pas de détente » : il reste sur place → 7 nuitées · 14 repas · 0 € ; S43 = détente, sans arrivée (resté le week-end) → 5 nuitées · 11 repas · 15 €
out={};out.before=await rowOf('Karim');await page.evaluate(async()=>{const r=[...document.querySelectorAll('#eq-app .eq-row')].find(x=>/Karim/.test(x.textContent)&&x.querySelector('[data-act=gdx]'));r.querySelector('[data-act=gdx]').click();await new Promise(x=>setTimeout(x,300));});
out.after=await rowOf('Karim');await go(1);out.s43=await rowOf('Karim');await go(0);
console.log('2) pas de détente :',JSON.stringify(out));
C.c2=/🏠 détente/.test(out.before)&&/7 nuitées · 14 repas · 0 €/.test(out.after)&&/réglé/.test(out.after)&&/🏠 détente/.test(out.s43)&&/5 nuitées · 11 repas · 15 €/.test(out.s43);
// ── 3) vue du mois de Julien (octobre) : S42, S43 calculées (5 n chacune) ; dim. 18/10 🌙, dim. 25/10 rien (congé S44) ; totaux du mois : 10 nuitées, 20 repas, 2 A/R
await page.evaluate(async()=>{[...document.querySelectorAll('#eq-app [data-act=gdpers]')].find(b=>b.dataset.v==='l:julien').click();await new Promise(r=>setTimeout(r,500));});
const cell=d=>page.evaluate(d2=>{const b=document.querySelector(`#eq-app [data-act=gdday][data-v="l:julien|${d2}"]`);return b?{cls:b.className,txt:b.textContent.replace(/\s+/g,' ').trim()}:null;},d);
out={c18:await cell('2026-10-18'),c25:await cell('2026-10-25'),c14:await cell('2026-10-14'),c16:await cell('2026-10-16'),c17:await cell('2026-10-17')};
out.stats=await page.evaluate(()=>[...document.querySelectorAll('#eq-app .ac-stat')].map(x=>x.textContent.replace(/\s+/g,' ').trim()));
out.wk=await page.evaluate(()=>[...document.querySelectorAll('#eq-app .gd-wkh')].map(x=>x.textContent.replace(/\s+/g,' ').trim()));
out.nav=await page.evaluate(()=>[...document.querySelectorAll('#eq-app table.gd-nav tr')].map(tr=>tr.cells[0].textContent+'='+tr.cells[tr.cells.length-1].textContent));
console.log('3) mois de Julien :',JSON.stringify(out));
C.c3=/🌙/.test(out.c18.txt)&&/calc/.test(out.c18.cls)&&!/🌙/.test(out.c25.txt)&&/none/.test(out.c25.cls)&&/🌙🍽×2/.test(out.c14.txt)&&/🍽m🚗½/.test(out.c16.txt)&&!/🌙/.test(out.c16.txt)&&!/🌙|🍽/.test(out.c17.txt)
  &&out.stats.some(t=>/^0\s*nuitées accordées · \+10 à accorder/.test(t))&&out.stats.some(t=>/^0\s*repas accordés · \+20 à accorder/.test(t))&&out.stats.some(t=>/^2\s*trajets A\/R/.test(t))&&out.stats.some(t=>/^30 €\s*indemnités trajet/.test(t))
  &&out.wk.length===5&&/S44 · pas planifié/.test(out.wk[4])&&out.nav.includes('Nuitée GD=10')&&out.nav.includes('Repas midi GD=10')&&out.nav.includes('Repas soir GD=10');
// ── 4) la RH ajuste le mercredi 14/10 (rentré le soir : pas de nuitée ni de repas du soir, motif) → la semaine S42 est accordée avec ce jour ajusté ; pas d'« écart planning »
await page.evaluate(()=>document.querySelector('#eq-app [data-act=gdday][data-v="l:julien|2026-10-14"]').click());await wait(300);
out={title:await page.evaluate(()=>(document.querySelector('#modal h3')||{}).textContent),btn:await page.evaluate(()=>(document.getElementById('gdd-ok')||{}).textContent)};
await page.evaluate(()=>{document.querySelector('#modal [data-gdt="N|0"]').click();});await wait(150);await page.evaluate(()=>{document.querySelector('#modal [data-gdt="D|0"]').click();});await wait(150);
await page.evaluate(()=>{document.getElementById('gdd-note').value='rentré mercredi soir (raison familiale)';document.getElementById('gdd-ok').click();});await wait(400);
out.reg=await page.evaluate(()=>{const x=window.TRACE.reg.all('gdx').find(r=>r&&r.p==='l:julien'&&r.accord);return x&&{wk:x.week,nuits:x.accord.nuits,repas:x.accord.repas,eur:x.accord.eur,adj:x.accord.adj,d14:x.accord.days.find(d=>d.d==='2026-10-14'),adjBy:x.adjBy};});
out.c14=await cell('2026-10-14');out.c13=await cell('2026-10-13');out.stats=await page.evaluate(()=>[...document.querySelectorAll('#eq-app .ac-stat')].map(x=>x.textContent.replace(/\s+/g,' ').trim()));
out.wk=await page.evaluate(()=>(document.querySelectorAll('#eq-app .gd-wkh')[2]||{}).textContent.replace(/\s+/g,' ').trim());
console.log('4) ajustement :',JSON.stringify(out));
C.c4=/mer\. 14\/10\/2026 — Julien R\./.test(out.title||'')&&/accorder la semaine/.test(out.btn||'')&&out.reg&&out.reg.wk==='2026-W42'&&out.reg.nuits===4&&out.reg.repas===9&&out.reg.eur===15&&out.reg.adj===1&&out.reg.d14.N===0&&out.reg.d14.D===0&&out.reg.d14.L===1&&out.reg.d14.adj===true&&/familiale/.test(out.reg.d14.note)&&out.reg.adjBy==='Ethan L.'
  &&/acc/.test(out.c14.cls)&&/adj/.test(out.c14.cls)&&/✎/.test(out.c14.txt)&&/acc/.test(out.c13.cls)&&out.stats.some(t=>/^4\s*nuitées accordées · \+5 à accorder/.test(t))&&out.stats.some(t=>/^1\s*jour ajusté/.test(t))&&/✓ accordé/.test(out.wk||'')&&!/planning changé/.test(out.wk||'');
// ── 5) navette du mois (CSV Excel) : jours en colonnes, nuitées 9 · repas midi 10 · repas soir 9 · 2 A/R ; novembre : lundi 2/11 pas travaillé → pas de nuit du dimanche 1/11, arrivée lundi soir
const dl=page.waitForEvent('download',{timeout:5000}).catch(()=>null);await page.evaluate(()=>document.querySelector('#eq-app [data-act=gdnavcsv]').click());const d=await dl;let csv='';if(d){csv=fs.readFileSync(await d.path(),'utf8');}
const L=csv.split(/\r\n/);out={name:d&&d.suggestedFilename(),head:L[0],nuit:(L.find(l=>/^Nuitée GD;/.test(l))||'').split(';').pop(),midi:(L.find(l=>/^Repas midi GD;/.test(l))||'').split(';').pop(),soir:(L.find(l=>/^Repas soir GD;/.test(l))||'').split(';').pop(),ar:(L.find(l=>/^Trajet/.test(l))||'').split(';').pop(),cols:(L.find(l=>/^;1;2;3/.test(l))||'').split(';').length};
await page.evaluate(async()=>{document.querySelectorAll('#eq-app [data-act=gdmonth]')[1].click();await new Promise(r=>setTimeout(r,500));});
out.n1=await cell('2026-11-01');out.n2=await cell('2026-11-02');out.n3=await cell('2026-11-03');out.n6=await cell('2026-11-06');out.title=await page.evaluate(()=>(document.querySelector('#eq-app .eq-wktitle b')||{}).textContent);
console.log('5) navette + novembre :',JSON.stringify(out));
C.c5=/^Navette_GD_Julien_R_2026-10\.csv$/.test(out.name||'')&&/Navette grands déplacements;Julien R\./.test(out.head||'')&&out.nuit==='9'&&out.midi==='10'&&out.soir==='9'&&out.ar==='2'&&out.cols===33
  &&/novembre 2026/.test(out.title||'')&&!/🌙/.test(out.n1.txt)&&/férié/.test(out.n1.txt)&&/🌙🍽s🚗½/.test(out.n2.txt)&&/🌙🍽×2/.test(out.n3.txt)&&/🍽m🚗½/.test(out.n6.txt);
// ── 6) adresses à vérifier : Ethan à « Vannes 56000 » (ni la Géoplateforme ni le code postal ne la trouvent → nom seul) puis code postal « 5600 » invalide ; ↻ relance
await page.evaluate(async()=>{const w=ms=>new Promise(r=>setTimeout(r,ms));document.querySelector('#eq-app [data-act=gdmode][data-v=semaine]').click();await w(200);const P=window.TRACE.espace.state().people;P['l:ethan']=Object.assign({},P['l:ethan'],{adresse:{voie:'',cp:'56000',ville:'Vannes'}});window.TRACE.renderHome();await w(300);});
await page.evaluate(async()=>{const w=ms=>new Promise(r=>setTimeout(r,ms));if(!document.querySelector('#eq-app [data-act=gdmode]')){document.getElementById('htExpl').click();await w(200);const r=[...document.querySelectorAll('#eq-app .ac-row')].find(x=>/Grands déplacements/.test(x.textContent));if(r)r.click();}await w(1800);});
out={nom:await page.evaluate(()=>((document.querySelector('#eq-app details[data-gdaddr]')||{}).textContent||document.querySelector('#eq-app .okbox')?.textContent||'').replace(/\s+/g,' '))};
await page.evaluate(async()=>{const P=window.TRACE.espace.state().people;P['l:ethan']=Object.assign({},P['l:ethan'],{adresse:{voie:'',cp:'5600',ville:'Vannes'}});const b=document.querySelector('#eq-app [data-act=gdretry]');if(b)b.click();await new Promise(r=>setTimeout(r,1500));});
out.cp=await page.evaluate(()=>((document.querySelector('#eq-app details[data-gdaddr]')||{}).textContent||'').replace(/\s+/g,' '));
console.log('6) adresses :',JSON.stringify({nom:out.nom.slice(0,260),cp:out.cp.slice(0,260)}));
C.c6=/Ethan L\..*trouvée par le nom de la ville seul/.test(out.nom)&&!/introuvable/.test(out.nom)&&/code postal « 5600 » invalide/.test(out.cp);
const bad=Object.entries(C).filter(([k,v])=>!v).map(([k])=>k);console.log(bad.length?'RESULTAT: ECHEC '+bad.join(','):'RESULTAT: TOUT VERT');console.log(logs.length?logs:'[]');
await browser.close();
