// CONTRÔLE CROISÉ CLASSEUR ↔ APPLI (lot 5, 13/10/2026) : Chiffrage → « ⇄ Contrôle classeur » → import d'un classeur REMPLI (maquette synthétique
// test/fixture_classeur.xlsx : base fictive + onglet « ZONE A » + Récap Prix) → l'appli relit l'onglet, le recalcule (moteur + base du classeur), compare
// au Récap poste par poste : écarts expliqués (base vie en jours ouvrés, soudures sans case) en orange, écart non expliqué (+120 € sur les purges) en
// rouge ; tous les postes ; rapport CSV ; « → Reprendre » crée la zone (DN, marge du classeur) ; résultat gardé sur l'affaire ; effacer.
import { chromium } from 'playwright';
import fs from 'fs';import path from 'path';import {fileURLToPath} from 'url';
const HERE=path.dirname(fileURLToPath(import.meta.url));
const BASE=process.env.BASE||'http://localhost:8765';
const browser=await chromium.launch({headless:true, executablePath: process.env.CHROMIUM_PATH||undefined});
const ctx=await browser.newContext({viewport:{width:1280,height:900},acceptDownloads:true});const page=await ctx.newPage();
const logs=[];page.on('pageerror',e=>logs.push('PAGEERROR: '+e.message.slice(0,300)));page.on('console',m=>{if(m.type()==='error'&&!/supabase|Failed to fetch|net::ERR|404|WebSocket|pdf\.worker|cdnjs/i.test(m.text()))logs.push(m.text().slice(0,200));});
page.on('dialog',d=>d.accept().catch(()=>{}));
const C={};const wait=ms=>page.waitForTimeout(ms);
await page.goto(BASE+'/index.html');await wait(600);await page.evaluate(()=>{localStorage.clear();localStorage.setItem('trace:wide','1');});await page.reload();await wait(1200);
{const s=await page.$('#loginSkip');if(s&&await s.isVisible())await s.click();await wait(700);}
const click=async v=>{await page.evaluate(v=>{const el=document.querySelector(`#eq-app [data-act=af][data-v="${v}"]`);if(!el)throw new Error('bouton absent '+v);el.click();},v);await wait(300);};
const A=()=>page.evaluate(()=>window.TRACE.affaires.get('O2610-16'));
await page.evaluate(async()=>{const T=window.TRACE;T.state.userId='ethan';T.renderHome();document.getElementById('htCom').click();await new Promise(x=>setTimeout(x,250));
  document.querySelector('#eq-app [data-act=af][data-v="new|"]').click();await new Promise(x=>setTimeout(x,150));document.getElementById('afn-num').value='O2610-16';document.getElementById('afn-nom').value='Contrôle classeur';document.getElementById('afn-client').value='IDEX';document.getElementById('afn-etat').value='devis';
  document.querySelector('#eq-app [data-act=af][data-v="create|"]').click();await new Promise(x=>setTimeout(x,250));document.querySelector('#eq-app [data-act=af][data-v="tab|chiffrage"]').click();await new Promise(x=>setTimeout(x,250));});
await page.setInputFiles('#eq-app input[data-afprix]',path.join(HERE,'fixture_prix.xlsx'));await wait(1500);
// ── 1) pas encore de zone : « ⇄ Depuis un classeur rempli » → la vue Contrôle (intro + import)
let out={entry:await page.evaluate(()=>!!document.querySelector('#eq-app [data-act=af][data-v="chview|ctrl"]'))};
await click('chview|ctrl');out.intro=await page.evaluate(()=>({h:[...document.querySelectorAll('#eq-app .card h3')].map(x=>x.textContent).find(t=>/Contrôle croisé/.test(t))||'',inp:!!document.querySelector('#eq-app input[data-afctrl]')}));
// ── 2) import du classeur rempli → résultat : 1 onglet, 1 écart à regarder (purges), 2 expliqués (base vie, radio)
await page.setInputFiles('#eq-app input[data-afctrl]',path.join(HERE,'fixture_classeur.xlsx'));await wait(2000);
out.res=await page.evaluate(()=>{const card=document.querySelector('#eq-app .cm-ctrl');if(!card)return null;const st=[...card.querySelectorAll('.ac-stat')].map(x=>x.textContent.replace(/\s+/g,' ').trim());
  const rows=[...card.querySelectorAll('table.cm-ctrlt tr[data-k]')].map(r=>r.className+':'+r.dataset.k+':'+r.cells[3].textContent.trim());return {st,verdict:(card.querySelector('.cm-ctrlv')||{}).textContent||'',base:(card.querySelector('.cm-ctrlb')||{}).textContent||'',rows,why:[...card.querySelectorAll('table.cm-ctrlt tr.exp td:last-child')].map(x=>x.textContent)};});
out.saved=await A().then(a=>({n:a.ctrlCl&&a.ctrlCl.par.length,bad:a.ctrlCl&&a.ctrlCl.nBad,exp:a.ctrlCl&&a.ctrlCl.nExp,etudes:a.ctrlCl&&a.ctrlCl.etudes.length,fichier:a.ctrlCl&&a.ctrlCl.fichier}));
console.log('1-2) import :',JSON.stringify(out));
C.c1=out.entry&&/Contrôle croisé classeur/.test(out.intro.h)&&out.intro.inp&&out.res&&out.res.rows.length===3&&out.res.rows.includes('bad:purges:-120,00')&&out.res.rows.some(r=>/^exp:conteneur:-75,00$/.test(r))&&out.res.rows.some(r=>/^exp:radio:\+50,00$/.test(r))
  &&/1 écart non expliqué/.test(out.res.verdict)&&out.res.why.some(w=>/20 jours ouvrés.*25 jours calendaires/.test(w))&&out.res.why.some(w=>/6 soudures sans case/.test(w))&&/V99.*= base de l'appli ✓/.test(out.res.base)&&/marge du classeur 12,5 %/.test(out.res.base)
  &&out.res.st.some(s=>/^33 \/ 36\s*postes identiques/.test(s))&&out.res.st.some(s=>/^1\s*à regarder/.test(s))&&out.saved.n===1&&out.saved.bad===1&&out.saved.exp===2&&out.saved.etudes===1&&out.saved.fichier==='fixture_classeur.xlsx';
// ── 3) tous les postes ; rapport CSV
await click('ctrlall|1');out=await page.evaluate(()=>({all:document.querySelectorAll('#eq-app table.cm-ctrlt tr[data-k]').length,ok:document.querySelectorAll('#eq-app table.cm-ctrlt tr.ok').length}));
const [dl]=await Promise.all([page.waitForEvent('download'),click('ctrlcsv|')]);const csv=fs.readFileSync(await dl.path(),'utf8');
out.csv={name:dl.suggestedFilename(),purges:csv.split(/\r\n/).find(l=>/"Purges"/.test(l))||'',lines:csv.split(/\r\n/).length};
console.log('3) tous / CSV :',JSON.stringify(out));
C.c2=out.all===36&&out.ok===33&&out.csv.name==='Controle_classeur_O2610-16.csv'&&/"ZONE A";"Purges";1867,4;1747,4;-120;"à regarder"/.test(out.csv.purges)&&out.csv.lines===38;
// ── 4) « → Reprendre » : la zone du classeur entre dans le chiffrage (DN, purges, SST, CND, marge 12,5 %) ; récap recalculé
await click('ctrltake|replace');await wait(400);
out={a:await A().then(a=>{const z=(a.chiffrage.etudes||[])[0]||{};return {n:a.chiffrage.etudes.length,nom:z.nom,dn:(z.dn||[]).map(r=>r.dn+':'+r.soud+'/'+r.ml).join(),sst:(z.sst||[]).map(s=>s.type+':'+s.paires).join(),radio:z.cnd&&z.cnd.radio.antPct+'/'+z.cnd.radio.fdPct,marge:a.chiffrage.marge,src:z.source,repris:!!(a.ctrlCl&&a.ctrlCl.repris)};}),
  achat:await page.evaluate(()=>{const s=[...document.querySelectorAll('#eq-app .ac-stat')].map(x=>x.textContent.replace(/\s+/g,' ').trim());return s.find(t=>/prix d'achat/.test(t))||'';})};
await click('chview|ctrl');out.taken=await page.evaluate(()=>(document.querySelector('#eq-app .cm-ctrl')||{}).textContent.includes('Repris dans le chiffrage'));
console.log('4) reprise :',JSON.stringify(out));
C.c3=out.a.n===1&&out.a.nom==='ZONE A'&&out.a.dn==='32:6/10,50:12/60,100:40/200'&&out.a.sst==='sst_vannes_bs_pn25:2'&&out.a.radio==='10/10'&&out.a.marge===0.125&&/^classeur fixture_classeur\.xlsx$/.test(out.a.src)&&out.a.repris&&/^57\s?142\s?€\s*prix d'achat/.test(out.achat)&&out.taken;
// ── 5) effacer le contrôle (le chiffrage reste)
await click('ctrlclr|');out={a:await A().then(a=>({ctrl:a.ctrlCl,n:a.chiffrage.etudes.length})),intro:await page.evaluate(()=>!document.querySelector('#eq-app .cm-ctrl')&&!!document.querySelector('#eq-app input[data-afctrl]'))};
console.log('5) effacer :',JSON.stringify(out));
C.c4=!out.a.ctrl&&out.a.n===1&&out.intro;
const bad=Object.entries(C).filter(([k,v])=>!v).map(([k])=>k);console.log(bad.length?'RESULTAT: ECHEC '+bad.join(','):'RESULTAT: TOUT VERT');console.log(logs.length?logs:'[]');
await browser.close();
