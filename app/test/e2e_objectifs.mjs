// OBJECTIFS DE LA JOURNÉE (refonte ④, nuit 09→10/10) : le chef / conducteur pose des missions en heures estimées par chantier et par jour ;
// l'opérateur les voit sur son accueil ; à la validation du pointage l'objectif est en face des heures ; faite / retirée ; copie de l'appareil mise à jour.
import { chromium } from 'playwright';
const BASE=process.env.BASE||'http://localhost:8765';
const browser=await chromium.launch({headless:true, executablePath: process.env.CHROMIUM_PATH||undefined});
const ctx=await browser.newContext({viewport:{width:430,height:900}});const page=await ctx.newPage();
const logs=[];page.on('pageerror',e=>logs.push('PAGEERROR: '+e.message.slice(0,300)));page.on('console',m=>{if(m.type()==='error'&&!/supabase|Failed to fetch|net::ERR|404|WebSocket/i.test(m.text()))logs.push(m.text().slice(0,200));});
page.on('dialog',d=>d.accept().catch(()=>{}));
const C={};const wait=ms=>page.waitForTimeout(ms);
await page.goto(BASE+'/index.html');await wait(600);await page.evaluate(()=>{localStorage.clear();});await page.evaluate(()=>new Promise(r=>{try{const q=indexedDB.deleteDatabase('trace-kv');q.onsuccess=q.onerror=q.onblocked=()=>r();}catch(e){r();}}));
await page.reload();await wait(1200);
const skip=async()=>{const s=await page.$('#loginSkip');if(s&&await s.isVisible())await s.click();await wait(700);};await skip();
await page.evaluate(()=>{const T=window.TRACE;const src=T.sites[Object.keys(T.sites).find(k=>k!=='__vide'&&T.sites[k]&&T.sites[k].lines)];const x=JSON.parse(JSON.stringify(src));x.id='demo_caen';x.name='Caen — Presqu\'île';x.fiche={ville:'Caen',secteur:'ouest',chef:'l:ethan'};x.conv={msgs:[],seq:1};x.qse={docs:[]};T.sites.demo_caen=x;T.renderHome();});await wait(300);
// ── 1) Ethan place Karim sur Caen puis pose un objectif (12 h) pour Karim
await page.evaluate(async()=>{const T=window.TRACE;T.state.userId='ethan';T.renderHome();document.getElementById('htExpl').click();await new Promise(r=>setTimeout(r,200));[...document.querySelectorAll('#eq-app .ac-row')].find(x=>/Planning des équipes/.test(x.textContent)).click();await new Promise(r=>setTimeout(r,200));
  const c=[...document.querySelectorAll('#eq-app .eq-pltray .eq-plchip')].find(x=>/Karim/.test(x.textContent));c.querySelector('.eq-plmain').click();document.querySelector('#eq-app .eq-plsite[data-drop=demo_caen] [data-act=plput]').click();});await wait(300);
let out=await page.evaluate(async()=>{document.querySelector('#eq-app .ac-back').click();await new Promise(r=>setTimeout(r,150));const row=[...document.querySelectorAll('#eq-app .ac-row')].find(x=>/Objectifs de la journée/.test(x.textContent));const soon=row.classList.contains('soon');row.click();await new Promise(r=>setTimeout(r,200));
  const r={soon,title:(document.querySelector('#eq-app h2.vt')||{}).textContent,chips:document.querySelectorAll('#eq-app .eq-filtres .chip').length,card:(document.querySelector('#eq-app .card h3')||{}).textContent,empty:/Aucun objectif/.test(document.getElementById('eq-app').textContent)};
  [...document.querySelectorAll('#eq-app [data-act=objadd]')].find(b=>b.dataset.v==='demo_caen').click();await new Promise(r2=>setTimeout(r2,150));r.form=!!document.getElementById('obj-type');r.who=[...document.querySelectorAll('#eq-app [data-objwho]')].map(i=>i.dataset.objwho);
  document.getElementById('obj-type').value='soud';document.getElementById('obj-h').value='12';document.getElementById('obj-label').value='Souder le tronçon 3 (DN 250)';document.querySelector('#eq-app [data-objwho]').checked=true;document.querySelector('#eq-app [data-act=objok]').click();await new Promise(r2=>setTimeout(r2,250));
  const T=window.TRACE;const day=new Date();const iso=day.getFullYear()+'-'+String(day.getMonth()+1).padStart(2,'0')+'-'+String(day.getDate()).padStart(2,'0');const ms=(T.sites.demo_caen.missions||{})[iso]||[];
  r.txt=document.getElementById('eq-app').textContent.replace(/\s+/g,' ');r.saved={n:ms.length,type:ms[0]&&ms[0].type,h:ms[0]&&ms[0].h,who:ms[0]&&ms[0].who,by:ms[0]&&ms[0].by};r.badge=[...document.querySelectorAll('#homeTabs button')].length;return r;});
console.log('1) poser un objectif :',JSON.stringify({...out,txt:out.txt.slice(0,260)}));
C.c1=!out.soon&&/Objectifs de la journée/.test(out.title)&&out.chips>=5&&/Caen/.test(out.card)&&/1 personne/.test(out.card)&&out.empty&&out.form&&out.who.join()==='l:karim'&&out.saved.n===1&&out.saved.type==='soud'&&out.saved.h===12&&out.saved.who.join()==='l:karim'&&/Ethan/.test(out.saved.by)&&/Souder le tronçon 3/.test(out.txt)&&/12 h estimées/.test(out.txt)&&/8 h d'équipe/.test(out.txt)&&/pas un plafond/.test(out.txt);
// ── 2) menu Exploitation : pastille 1 sur la ligne ; à savoir « Objectifs du jour : 1 mission posée » ; Karim : l'objectif est sur son accueil (héros)
out=await page.evaluate(async()=>{document.querySelector('#eq-app .ac-back').click();await new Promise(r=>setTimeout(r,150));const row=[...document.querySelectorAll('#eq-app .ac-row')].find(x=>/Objectifs de la journée/.test(x.textContent));const r={badge:(row.querySelector('.ac-n')||{}).textContent};document.getElementById('htHome').click();await new Promise(r2=>setTimeout(r2,250));r.kt=[...document.querySelectorAll('#eq-app .ac-kt .tx')].map(x=>x.textContent.replace(/\s+/g,' ').trim());
  window.TRACE.state.userId='karim';window.TRACE.renderHome();await new Promise(r2=>setTimeout(r2,250));const o=document.querySelector('#eq-app .ac-obj');r.karim=o&&o.textContent.replace(/\s+/g,' ').trim();return r;});
console.log('2) menu + accueil de Karim :',JSON.stringify(out));
C.c2=out.badge==='1'&&out.kt.some(t=>/Objectifs du jour.*1 mission posée/.test(t))&&/Objectif du jour · 1 mission · 12 h estimées/.test(out.karim||'')&&/Souder le tronçon 3/.test(out.karim||'')&&/pas un plafond/.test(out.karim||'');
// ── 3) Karim pointe (début → fin) ; Ethan valide : l'objectif est EN FACE du pointage ; marque la mission faite ; la retire
out=await page.evaluate(async()=>{const q=s=>document.querySelector('#eq-app '+s);q('[data-act=pointer][data-v=start]').click();await new Promise(r=>setTimeout(r,120));q('[data-act=pointer][data-v=end]').click();await new Promise(r=>setTimeout(r,120));
  window.TRACE.state.userId='ethan';document.getElementById('htExpl').click();await new Promise(r=>setTimeout(r,200));[...document.querySelectorAll('#eq-app .ac-row')].find(x=>/Pointages à valider/.test(x.textContent)).click();await new Promise(r=>setTimeout(r,250));
  const r={row:(document.querySelector('#eq-app .eq-vrow')||{}).textContent};r.row=r.row&&r.row.replace(/\s+/g,' ').trim();
  document.querySelector('#eq-app .ac-back').click();await new Promise(r2=>setTimeout(r2,150));[...document.querySelectorAll('#eq-app .ac-row')].find(x=>/Objectifs de la journée/.test(x.textContent)).click();await new Promise(r2=>setTimeout(r2,200));
  document.querySelector('#eq-app [data-act=objdone]').click();await new Promise(r2=>setTimeout(r2,200));r.done=/✓ faite/.test(document.getElementById('eq-app').textContent);
  document.querySelector('#eq-app [data-act=objrm]').click();await new Promise(r2=>setTimeout(r2,200));r.removed=/Aucun objectif/.test(document.getElementById('eq-app').textContent);const T=window.TRACE;const d=new Date();const iso=d.getFullYear()+'-'+String(d.getMonth()+1).padStart(2,'0')+'-'+String(d.getDate()).padStart(2,'0');r.left=((T.sites.demo_caen.missions||{})[iso]||[]).length;return r;});
console.log('3) validation + faite + retrait :',JSON.stringify(out));
C.c3=/Karim B\./.test(out.row||'')&&/Objectif du jour : 1 mission · 12 h estimées — Souder le tronçon 3/.test(out.row||'')&&out.done&&out.removed&&out.left===0;
const bad=Object.entries(C).filter(([k,v])=>!v).map(([k])=>k);console.log(bad.length?'RESULTAT: ECHEC '+bad.join(','):'RESULTAT: TOUT VERT');console.log(logs.length?logs:'[]');
await browser.close();
