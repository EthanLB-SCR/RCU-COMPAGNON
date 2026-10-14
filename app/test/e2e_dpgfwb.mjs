// ATELIER DPGF + DEVIS DE RÉFÉRENCE (13/10/2026 soir, retours d'Ethan sur le chiffrage).
// DPGF : « comme dans Lecture, tu me lis le DPGF Excel de base, on travaille dessus directement, même option (autre écran) ; nos coûts d'un côté, le DPGF de
// l'autre ; cette dépense dans telle cellule ; cette dépense divisée par la quantité de telle cellule = le PU de telle cellule ».
// Base : « la base des prix, les paniers… une base dans le logiciel modifiable pour tout le monde en plus de dans chaque dossier » ; « un lien en face de chaque
// prix de fourniture vers le devis de référence ». Classeur et DPGF = fixtures FICTIVES (test/fixture_prix.xlsx, test/fixture_dpgf.xlsx) ; hors connexion.
import { chromium } from 'playwright';
import path from 'path';import {fileURLToPath} from 'url';
const HERE=path.dirname(fileURLToPath(import.meta.url));
const BASE=process.env.BASE||'http://localhost:8765';
const browser=await chromium.launch({headless:true, executablePath: process.env.CHROMIUM_PATH||undefined});
const ctx=await browser.newContext({viewport:{width:1280,height:900}});const page=await ctx.newPage();
const logs=[];page.on('pageerror',e=>logs.push('PAGEERROR: '+e.message.slice(0,300)));page.on('console',m=>{if(m.type()==='error'&&!/supabase|Failed to fetch|net::ERR|404|WebSocket|pdf\.worker|cdnjs/i.test(m.text()))logs.push(m.text().slice(0,200));});
page.on('dialog',d=>d.accept().catch(()=>{}));
const C={};const wait=ms=>page.waitForTimeout(ms);
await page.goto(BASE+'/index.html');await wait(600);await page.evaluate(()=>{localStorage.clear();localStorage.setItem('trace:wide','1');});await page.evaluate(()=>new Promise(r=>{try{const q=indexedDB.deleteDatabase('trace-kv');q.onsuccess=q.onerror=q.onblocked=()=>r();}catch(e){r();}}));
await page.reload();await wait(1200);
{const s=await page.$('#loginSkip');if(s&&await s.isVisible())await s.click();await wait(700);}
const chg=async(sel,val)=>page.evaluate(([s,v])=>{const el=document.querySelector(s);if(!el)throw new Error('absent '+s);if(el.type==='checkbox'){el.checked=!!v;}else el.value=v;el.dispatchEvent(new Event('change',{bubbles:true}));},[sel,val]);
const click=async v=>{await page.evaluate(v=>{const el=document.querySelector(`#eq-app [data-act=af][data-v="${v}"]`);if(!el)throw new Error('bouton absent '+v);el.click();},v);await wait(220);};
const A=()=>page.evaluate(()=>window.TRACE.affaires.get('O2610-16'));
// mise en place : affaire, classeur (base), une zone DN 100 × 100 soudures / 600 ml, le DPGF du client
await page.evaluate(async()=>{const T=window.TRACE;T.state.userId='ethan';T.renderHome();document.getElementById('htCom').click();await new Promise(x=>setTimeout(x,250));
  document.querySelector('#eq-app [data-act=af][data-v="new|"]').click();await new Promise(x=>setTimeout(x,150));document.getElementById('afn-num').value='O2610-16';document.getElementById('afn-nom').value='Atelier DPGF';document.getElementById('afn-client').value='CORIANCE';document.getElementById('afn-etat').value='devis';
  document.querySelector('#eq-app [data-act=af][data-v="create|"]').click();await new Promise(x=>setTimeout(x,250));document.querySelector('#eq-app [data-act=af][data-v="tab|chiffrage"]').click();await new Promise(x=>setTimeout(x,200));});
await page.setInputFiles('#eq-app input[data-afprix]',path.join(HERE,'fixture_prix.xlsx'));await wait(1500);
await click('chetudeadd|');await click('chadd|dn');await chg('#eq-app [data-afx="e§dn.0.dn"]','100');await chg('#eq-app [data-afx="e§dn.0.soud"]','100');await chg('#eq-app [data-afx="e§dn.0.ml"]','600');await wait(200);
// ── 1) chiffrage : « ❓ Comment ça marche » (base SCR commune / ajustements du dossier / classeur) ; page de la base : idem, ouvert
let out={how:await page.evaluate(()=>{const d=document.querySelector('#eq-app details.ch-how');return d?{open:d.open,t:d.textContent.replace(/\s+/g,' ')}:null;})};
await click('chview|base');await wait(200);
out.tabs=await page.evaluate(()=>[...document.querySelectorAll('#eq-app [data-v^="chbase|"]')].map(b=>b.textContent.trim()));
console.log('1) comment ça marche + onglets de la base :',JSON.stringify({how:out.how&&{open:out.how.open,t:out.how.t.slice(0,160)},tabs:out.tabs}));
C.c1=out.how&&!out.how.open&&/Base de prix SCR — commune/.test(out.how.t)&&/Ce dossier — tes ajustements/.test(out.how.t)&&/ne change que ce chiffrage/.test(out.how.t)&&/Le classeur/.test(out.how.t)&&out.tabs.some(t=>/Devis fournisseurs/.test(t));
// ── 2) bibliothèque de devis : ajout par lien (https) ; refus d'un lien non https ; puis un prix de fourniture relié à son devis (📎 en face du prix)
await click('chbase|devis');await click('chdevadd|');await wait(200);
await page.evaluate(()=>{document.getElementById('dv-four').value='INPAL';document.getElementById('dv-date').value='2026-09-15';document.getElementById('dv-url').value='javascript:alert(1)';document.getElementById('dv-ok').click();});await wait(200);
out={bad:await page.evaluate(()=>document.getElementById('dv-err').textContent)};
await page.evaluate(()=>{document.getElementById('dv-url').value='https://exemple.fr/devis_inpal_2026.pdf';document.getElementById('dv-ok').click();});await wait(400);
out.lib=await page.evaluate(()=>{const b=window.TRACE.reg.all('prix')[0];return {n:(b.devis||[]).length,d:b.devis&&b.devis[0]&&{four:b.devis[0].fournisseur,date:b.devis[0].date,url:b.devis[0].url},row:[...document.querySelectorAll('#eq-app table tr')].map(r=>r.textContent.replace(/\s+/g,' ')).find(t=>/INPAL/.test(t))||''};});
await click('chbase|fo');await wait(200);
const link=await page.evaluate(()=>{const b=document.querySelector('#eq-app [data-v^="chdevlink|"]');return b?b.dataset.v:null;});
await click(link);await wait(200);
await page.evaluate(()=>{const s=document.getElementById('dl-id');s.value=s.options[1].value;document.getElementById('dl-ref').value='p. 2';document.getElementById('dl-ok').click();});await wait(400);
out.linked=await page.evaluate(v=>{const b=window.TRACE.reg.all('prix')[0];const [k,tn,key]=v.split('|');const m=(b.foDevis||{})[tn+'|'+decodeURIComponent(key)];const cell=[...document.querySelectorAll('#eq-app .ch-dev')].map(x=>x.textContent.replace(/\s+/g,' ').trim());const a=document.querySelector('#eq-app .ch-dev a');return {m:m&&{id:m.id,ref:m.ref},cell,href:a&&a.getAttribute('href'),target:a&&a.getAttribute('target')};},link);
console.log('2) devis de référence :',JSON.stringify(out));
C.c2=/https:\/\//.test(out.bad)&&out.lib.n===1&&out.lib.d.four==='INPAL'&&out.lib.d.date==='2026-09-15'&&out.lib.d.url==='https://exemple.fr/devis_inpal_2026.pdf'&&/INPAL/.test(out.lib.row)&&out.linked.m&&out.linked.m.ref==='p. 2'&&out.linked.cell.some(t=>/📎 INPAL/.test(t)&&/p\. 2/.test(t))&&out.linked.href==='https://exemple.fr/devis_inpal_2026.pdf'&&out.linked.target==='_blank';
// ── 3) réimport du classeur : les devis et leurs liens restent
await click('chbase|import');await page.setInputFiles('#eq-app input[data-afprix]',path.join(HERE,'fixture_prix.xlsx'));await wait(1500);
out=await page.evaluate(()=>{const b=window.TRACE.reg.all('prix')[0];return {n:(b.devis||[]).length,links:Object.keys(b.foDevis||{}).length,imp:!!b.importedAt};});
console.log('3) réimport :',JSON.stringify(out));C.c3=out.n===1&&out.links===1&&out.imp;
// ── 4) l'ATELIER DPGF : coûts à gauche (postes de la zone, prix de vente), la feuille du client à droite (n° de ligne Excel) ; ancienne vue repliée
await click('tab|dpgf');await page.setInputFiles('#eq-app [data-afdpgf]',path.join(HERE,'fixture_dpgf.xlsx'));await wait(900);
/* 14/10 nuit : l'atelier s'ouvre en mode « Prix composés · pointage » (défaut) ; l'ancien mode « Coûts à placer » (ce que vérifie cette suite) s'obtient par dwmode|couts */
const mode0=await page.evaluate(()=>{const b=document.querySelector('#eq-app [data-act=af][data-v="dwmode|compo"]');return b?b.classList.contains('active'):null;});
await click('dwmode|couts');
out=await page.evaluate(()=>{const w=document.querySelector('#eq-app .cm-dw');const costs=[...document.querySelectorAll('#eq-app .cm-dwc')].map(b=>b.querySelector('.t').textContent);const rows=[...document.querySelectorAll('#eq-app .cm-dwt tr.cm-dwrow')].map(r=>r.querySelector('.xr').textContent);const old=document.querySelector('#eq-app details.cm-dwold');return {w:!!w,costs,rows,idle:!!document.querySelector('#eq-app .cm-dwsel.idle'),old:old?{open:old.open,map:!!old.querySelector('.cm-dpmap')}:null};});
console.log('4) atelier :',JSON.stringify({mode0,...out}));
C.c4=mode0===true&&out.w&&out.costs.includes('Manchons')&&out.costs.includes('Soudure (compris manutention)')&&out.rows.length===5&&out.rows.every(x=>/^\d+$/.test(x))&&out.idle&&out.old&&!out.old.open&&out.old.map;
// ── 5) toucher un coût puis une ligne → « Placer » : 100 % sur sa propre quantité → PU = montant ÷ quantité ; le coût passe « tout placé »
const costKey=async lab=>page.evaluate(l=>{const b=[...document.querySelectorAll('#eq-app .cm-dwc')].find(x=>x.querySelector('.t').textContent===l);return b?decodeURIComponent(b.dataset.v.split('|').slice(1).join('|')):null;},lab);
const kMan=await costKey('Manchons');const kSou=await costKey('Soudure (compris manutention)');const enc=encodeURIComponent;
await click('dwsel|'+enc(kMan));
out={sel:await page.evaluate(()=>({banner:(document.querySelector('#eq-app .cm-dwsel')||{}).textContent||'',targets:document.querySelectorAll('#eq-app .cm-dwrow.target').length}))};
await click('dwline|5');await wait(200);
out.dlg=await page.evaluate(()=>{const b=document.getElementById('cm-dwplace');return b?{pct:b.querySelector('#dwp-pct').value,prev:b.querySelector('#dwp-prev').textContent,opts:b.querySelectorAll('#dwp-per option').length}:null;});
await page.evaluate(()=>document.getElementById('dwp-ok').click());await wait(400);
out.after=await A().then(a=>({srcs:(a.dpgf.map||{})[5]&&a.dpgf.map[5].srcs,qte:a.dpgf.lignes[5].qte}));
out.ui=await page.evaluate(()=>{const r=[...document.querySelectorAll('#eq-app .cm-dwt tr.cm-dwrow')].find(x=>x.dataset.v==='dwline|5');const b=[...document.querySelectorAll('#eq-app .cm-dwc')].find(x=>x.querySelector('.t').textContent==='Manchons');return {chip:r?(r.querySelector('.cm-dwchip')||{}).textContent||'':'',pu:r?r.cells[5].textContent:'',done:b?b.classList.contains('done'):null,hidden:!b,selCleared:!!document.querySelector('#eq-app .cm-dwsel.idle'),toast:document.getElementById('toast').textContent};});
const manVente=await page.evaluate(k=>{const a=window.TRACE.affaires.get('O2610-16');const S=window.TRACE.affaires.dpgfSources(a);const o=S.opts.find(x=>x.key===k);return o?o.vente:0;},kMan);
console.log('5) placer un coût sur sa ligne :',JSON.stringify({...out,manVente}));
const puMan=manVente/out.after.qte;const frN=x=>x.toLocaleString('fr-FR',{minimumFractionDigits:2,maximumFractionDigits:2}).replace(/\s/g,' ');
C.c5=/Manchons/.test(out.sel.banner)&&out.sel.targets===5&&out.dlg&&+out.dlg.pct===100&&/au PU de cette ligne/.test(out.dlg.prev)&&out.dlg.opts>=4&&out.after.srcs&&out.after.srcs.length===1&&out.after.srcs[0].key===kMan&&out.after.srcs[0].pct===100&&out.after.srcs[0].per===undefined
  &&/Manchons · 100 %/.test(out.ui.chip)&&out.ui.pu.replace(/\s/g,' ')===frN(puMan)&&(out.ui.hidden||out.ui.done)&&out.ui.selCleared&&/entièrement placé/.test(out.ui.toast);
// ── 6) « divisée par la quantité de telle ligne » : 50 % de la soudure sur la ligne 3 (sa quantité), 50 % sur la ligne 4 ÷ la quantité de la ligne 3 → même taux €/u
await click('dwsel|'+enc(kSou));await click('dwline|3');await wait(150);await page.evaluate(()=>{document.getElementById('dwp-pct').value='50';document.getElementById('dwp-ok').click();});await wait(300);
await click('dwsel|'+enc(kSou));await click('dwline|4');await wait(150);await page.evaluate(()=>{document.getElementById('dwp-pct').value='50';const s=document.getElementById('dwp-per');s.value='3';s.dispatchEvent(new Event('change'));});await wait(100);
out={prev:await page.evaluate(()=>document.getElementById('dwp-prev').textContent)};await page.evaluate(()=>document.getElementById('dwp-ok').click());await wait(300);
out.calc=await page.evaluate(k=>{const a=window.TRACE.affaires.get('O2610-16');const T=window.TRACE.affaires.dpgfTranslate(a);const S=T.S.opts.find(x=>x.key===k);const L=a.dpgf.lignes;const p3=T.perLine.find(x=>x.i===3),p4=T.perLine.find(x=>x.i===4);return {sou:S.vente,q3:L[3].qte,q4:L[4].qte,pu3:p3.pu,pu4:p4.pu,amt4:p4.amt,per:a.dpgf.map[4].srcs[0].per,used:T.usedAmt[k]};},kSou);
console.log('6) divisée par la quantité d\'une autre ligne :',JSON.stringify(out));
const rate=out.calc.sou*0.5/out.calc.q3;
C.c6=/÷/.test(out.prev)&&out.calc.per===3&&Math.abs(out.calc.pu3-rate)<0.01&&Math.abs(out.calc.pu4-rate)<0.01&&Math.abs(out.calc.amt4-rate*out.calc.q4)<0.01&&Math.abs(out.calc.used-(out.calc.sou*0.5+rate*out.calc.q4))<0.01;
// ── 7) retirer un placement ; filtre « Tout » ; plein écran
await click('dwrm|4|0');out={srcs4:await A().then(a=>a.dpgf.map[4].srcs.length)};
await click('dwfilt|tout');out.all=await page.evaluate(()=>document.querySelectorAll('#eq-app .cm-dwc').length);await click('dwfilt|reste');out.reste=await page.evaluate(()=>document.querySelectorAll('#eq-app .cm-dwc').length);
await click('dwfull|');out.full=await page.evaluate(()=>{const w=document.querySelector('#eq-app .cm-dw');const r=w.getBoundingClientRect();return {cls:w.classList.contains('full'),pos:getComputedStyle(w).position,w:Math.round(r.width)};});await click('dwfull|');
console.log('7) retrait, filtre, plein écran :',JSON.stringify(out));
C.c7=out.srcs4===0&&out.all>out.reste&&out.full.cls&&out.full.pos==='fixed'&&out.full.w>=1200;
// ── 8) ⧉ AUTRE ÉCRAN : la feuille dans une 2e fenêtre ; coût choisi ici, ligne touchée là-bas → « Placer » dans la 2e fenêtre ; ↩ ramène la feuille dans l'appli
const [pop]=await Promise.all([ctx.waitForEvent('page'),click('dwpop|')]);await wait(600);
out={main:await page.evaluate(()=>/ouvert dans l'autre fenêtre/.test(document.querySelector('#eq-app .cm-dwr').textContent)),rows:await pop.evaluate(()=>document.querySelectorAll('#dwp-host tr.cm-dwrow').length)};
await click('dwsel|'+enc(kSou));await wait(200);out.hint=await pop.evaluate(()=>document.getElementById('dwp-hint').textContent);
await pop.evaluate(()=>[...document.querySelectorAll('#dwp-host tr.cm-dwrow')].find(r=>r.dataset.v==='dwline|4').click());await wait(250);
out.pdlg=await pop.evaluate(()=>!!document.getElementById('cm-dwplace'));await pop.evaluate(()=>{document.getElementById('dwp-pct').value='50';document.getElementById('dwp-ok').click();});await wait(400);
out.placed=await A().then(a=>a.dpgf.map[4].srcs.map(s=>s.key+':'+s.pct));out.popChip=await pop.evaluate(()=>([...document.querySelectorAll('#dwp-host tr.cm-dwrow')].find(r=>r.dataset.v==='dwline|4').querySelector('.cm-dwchip')||{}).textContent||'');
await pop.evaluate(()=>document.querySelector('[data-w="back"]').click());await wait(700);out.back=await page.evaluate(()=>document.querySelectorAll('#eq-app .cm-dwt tr.cm-dwrow').length);
console.log('8) autre écran :',JSON.stringify(out));
C.c8=out.main&&out.rows===5&&/Soudure/.test(out.hint)&&out.pdlg&&out.placed.join()===kSou+':50'&&/Soudure \(compris manutention\) · 50 %/.test(out.popChip)&&out.back===5;
// ── 9) « Appliquer les PU » : le bordereau prend les PU ; le total tombe sur le prix de vente (reste au ml sur 2 lignes)
await chg('#eq-app [data-afdm="3|ml|ml"]',true);await chg('#eq-app [data-afdm="4|ml|ml"]',true);await click('dpapply|');
out=await page.evaluate(()=>{const a=window.TRACE.affaires.get('O2610-16');const C=window.TRACE.affaires.calc(a);const L=a.dpgf.lignes.filter(l=>!l.section);return {tot:Math.round(L.reduce((s,l)=>s+l.pu*l.qte,0)*100)/100,vente:Math.round(C.total*100)/100,pu5:a.dpgf.lignes[5].pu};});
console.log('9) appliquer :',JSON.stringify(out));C.c9=Math.abs(out.tot-out.vente)<0.02&&out.pu5>0;
const bad=Object.entries(C).filter(([k,v])=>!v).map(([k])=>k);console.log(bad.length?'RESULTAT: ECHEC '+bad.join(','):'RESULTAT: TOUT VERT');console.log(logs.length?logs:'[]');
await browser.close();
