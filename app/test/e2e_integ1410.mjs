// e2e_integ1410.mjs — 14/10 après-midi : INTÉGRATION des 4 lots (A base de prix figée par dossier, B mémoire, C DPGF « comme dans Excel », D versions / documents)
// Ce que chaque lot ne pouvait pas tester seul, faute de voir les autres :
//  1) PU saisi dans la grille du DPGF (C) → nouvelle version par la fenêtre du lot D → la v2 change le PU ; l'instantané de la v1 garde le sien
//  2) consultation de la v1 (D) dans l'onglet DPGF : la grille (C) montre le PU de la v1, aussi après défilement (montage différé) ; le détail des prix
//     unitaires DANS l'appli suit la version consultée ; rien ne s'écrit ; retour à la version en cours
//  3) base de prix modifiée (A) : v1 et v2 gardent leur révision ; « ↻ Passer à la base actuelle » sur la v2 ; la v1 consultée garde SON prix (pas de « recalculé »)
//  4) 📦 dossier de remise (D) : la DPGF du zip = le fichier du client tel que la grille l'exporte (C), avec le PU de la version en cours
// Données 100 % fictives (fixture_prix.xlsx, fixture_dpgf_xl.xlsx), hors connexion.
import { chromium } from 'playwright';
import { unzipSync, strFromU8 } from 'fflate';
import fs from 'fs';import path from 'path';import { fileURLToPath } from 'url';
const HERE=path.dirname(fileURLToPath(import.meta.url));
const BASE=process.env.BASE||'http://localhost:8765';
const browser=await chromium.launch({headless:true, executablePath: process.env.CHROMIUM_PATH||undefined});
const ctx=await browser.newContext({viewport:{width:1600,height:1300},acceptDownloads:true});const page=await ctx.newPage();
const logs=[];page.on('pageerror',e=>logs.push('PAGEERROR: '+e.message.slice(0,300)));page.on('console',m=>{if(m.type()==='error'&&!/supabase|Failed to fetch|net::ERR|404|WebSocket|pdf\.worker|cdnjs/i.test(m.text()))logs.push(m.text().slice(0,200));});
page.on('dialog',d=>d.accept().catch(()=>{}));
const C={};const wait=ms=>page.waitForTimeout(ms);const NUM='O2610-48';const sp=t=>String(t||'').replace(/[\s  ]+/g,' ').trim();
const chg=async(sel,val)=>{await page.evaluate(([s,v])=>{const el=document.querySelector(s);if(!el)throw new Error('absent '+s);if(el.type==='checkbox'){el.checked=!!v;}else el.value=v;el.dispatchEvent(new Event('change',{bubbles:true}));},[sel,val]);await wait(150);};
const click=async v=>{await page.evaluate(v=>{const el=document.querySelector(`#eq-app [data-act=af][data-v="${v}"]`);if(!el)throw new Error('bouton absent '+v);el.click();},v);await wait(300);};
const td=(r,c)=>`#dx-vp td[data-r="${r}"][data-c="${c}"]`;
const T=(r,c)=>page.evaluate(s=>{const e=document.querySelector(s);return e?sp(e.textContent):null;function sp(t){return String(t||'').replace(/[\s  ]+/g,' ').trim();}},td(r,c));
const A=()=>page.evaluate(n=>window.TRACE.affaires.get(n),NUM);
const typeIn=async(r,c,text)=>{await page.click(td(r,c));await wait(80);await page.keyboard.type(text);await page.keyboard.press('Enter');await wait(400);};
const edE10=a=>(((a.dpgf||{}).xl||{}).ed||{}).DPGF&&a.dpgf.xl.ed.DPGF.E10?a.dpgf.xl.ed.DPGF.E10.v:null;
// ── mise en place : affaire, base (classeur fictif), zone DN 100 × 100 soudures / 600 ml, DPGF du client importé tel quel
await page.goto(BASE+'/index.html');await wait(600);await page.evaluate(()=>{localStorage.clear();localStorage.setItem('trace:wide','1');});await page.evaluate(()=>new Promise(r=>{try{const q=indexedDB.deleteDatabase('trace-kv');q.onsuccess=q.onerror=q.onblocked=()=>r();}catch(e){r();}}));
await page.reload();await wait(1200);
{const s=await page.$('#loginSkip');if(s&&await s.isVisible())await s.click();await wait(700);}
await page.evaluate(async n=>{const T=window.TRACE;T.state.userId='ethan';T.renderHome();document.getElementById('htCom').click();await new Promise(x=>setTimeout(x,250));
  document.querySelector('#eq-app [data-act=af][data-v="new|"]').click();await new Promise(x=>setTimeout(x,150));document.getElementById('afn-num').value=n;document.getElementById('afn-nom').value='Intégration des lots';document.getElementById('afn-client').value='CLIENT TEST';document.getElementById('afn-etat').value='devis';
  document.querySelector('#eq-app [data-act=af][data-v="create|"]').click();await new Promise(x=>setTimeout(x,250));document.querySelector('#eq-app [data-act=af][data-v="tab|chiffrage"]').click();await new Promise(x=>setTimeout(x,200));},NUM);
await page.setInputFiles('#eq-app input[data-afprix]',path.join(HERE,'fixture_prix.xlsx'));await wait(1500);
await click('chetudeadd|');await click('chadd|dn');await chg('#eq-app [data-afx="e§dn.0.dn"]','100');await chg('#eq-app [data-afx="e§dn.0.soud"]','100');await chg('#eq-app [data-afx="e§dn.0.ml"]','600');
await click('tab|dpgf');
await page.setInputFiles('#eq-app [data-afdpgf]',{name:'DPGF_lot02_essai.xlsx',mimeType:'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',buffer:fs.readFileSync(path.join(HERE,'fixture_dpgf_xl.xlsx'))});
await page.waitForSelector('#dx-vp',{timeout:15000});await wait(400);
// ── 1) v1 : PU 50 dans E10 ; « ＋ Nouvelle version » (fenêtre du lot D) ; v2 : PU 60
await typeIn(10,5,'50');let a=await A();let out={v1:edE10(a),rev0:(a.chiffrage||{}).baseRev||null};
await click('tab|chiffrage');await click('vnew|');out.modal=await page.evaluate(()=>{const m=document.getElementById('modal');return !!(m&&m.classList.contains('show')&&document.getElementById('vv-note'));});
await page.evaluate(()=>{document.getElementById('vv-note').value='Négociation : remise sur la pose';document.getElementById('vv-ok').click();});await wait(400);
await click('tab|dpgf');await page.waitForSelector('#dx-vp',{timeout:15000});await wait(300);await typeIn(10,5,'60');a=await A();
const snap1=(a.chiffrages||[])[0]||{};out.v=a.chiffrageV;out.n=(a.chiffrages||[]).length;out.snapE10=snap1.snap&&snap1.snap.dpgf?((((snap1.snap.dpgf.xl||{}).ed||{}).DPGF||{}).E10||{}).v:null;out.v2=edE10(a);
out.revV1=((snap1.chiffrage)||{}).baseRev||null;out.revV2=(a.chiffrage||{}).baseRev||null;out.tot1=snap1.total;
console.log('1) versions et grille :',JSON.stringify(out));
C.c1=out.v1===50&&out.modal&&out.v===2&&out.n===1&&out.snapE10===50&&out.v2===60&&!!out.rev0&&out.revV1===out.rev0&&out.revV2===out.rev0&&out.tot1>0;
// ── 2) consultation de la v1 dans le DPGF : la grille et le détail des PU montrent la v1 ; lecture seule ; retour à la v2
await click('tab|chiffrage');await click('vview|1');await click('tab|dpgf');await page.waitForSelector('#dx-vp',{timeout:15000});await wait(700);out={band:sp(await page.$eval('#eq-app .vv-band',e=>e.textContent).catch(()=>'')),e10:await T(10,5)};
await page.evaluate(()=>{const vp=document.getElementById('dx-vp');if(vp){vp.scrollTop=400;vp.dispatchEvent(new Event('scroll'));}});await wait(400);
await page.evaluate(()=>{const vp=document.getElementById('dx-vp');if(vp){vp.scrollTop=0;vp.dispatchEvent(new Event('scroll'));}});await wait(400);out.e10scroll=await T(10,5);
await click('dxpu|');await wait(500);await click('dxpumode|lignes');await wait(300);out.vvAfterPu=await page.evaluate(()=>window.TRACE.affaires.state().vview);
out.pu=await page.evaluate(()=>{const r=[...document.querySelectorAll('#dx-pu .dx-put tbody tr')].find(tr=>/^2\.1\b/.test(tr.children[0].textContent.trim()));return r?[...r.children].map(td=>td.textContent.replace(/[\s  ]+/g,' ').trim()):null;});
await page.click(td(10,5));await wait(80);await page.keyboard.type('99');await page.keyboard.press('Enter');await wait(400);a=await A();out.after={cur:edE10(a),snap:((((((a.chiffrages||[])[0]||{}).snap||{}).dpgf||{}).xl||{}).ed||{}).DPGF?a.chiffrages[0].snap.dpgf.xl.ed.DPGF.E10.v:null};
await click('vexit|');await wait(600);out.back=await T(10,5);
console.log('2) consultation de la v1 :',JSON.stringify(out));
C.c2=/Tu consultes la v1/.test(out.band)&&out.vvAfterPu===1&&out.e10==='50,00 €'&&out.e10scroll==='50,00 €'&&!!out.pu&&out.pu[3]==='50,00'&&out.after.cur===60&&out.after.snap===50&&out.back==='60,00 €';
// ── 3) base de prix modifiée : v1 et v2 gardent leur révision ; « ↻ Passer à la base actuelle » sur la v2 ; la v1 consultée garde SON prix
const tot=n=>page.evaluate(n=>{const T=window.TRACE.affaires;return T.calc(T.get(n)).total;},NUM);
const totV1=()=>page.evaluate(n=>{const T=window.TRACE.affaires;const a=T.get(n);return T.calc(Object.assign({},a,{chiffrage:a.chiffrages[0].chiffrage})).total;},NUM);
out={t0:await tot(),v10:await totV1()};await click('tab|chiffrage');await click('chview|base');await click('chbase|mo');await chg('#eq-app [data-afx="b§mo§postes§0§taux"]','81');await wait(300);
out.rev1=await page.evaluate(()=>{const b=window.TRACE.reg.get('prix','base');return b&&b.rev;});out.arch=await page.evaluate(r=>!!window.TRACE.reg.get('prix','base@'+r),(await A()).chiffrage.baseRev);
out.t1=await tot();out.v11=await totV1();
await click('chei|0');await click('chrevup|');await wait(300);out.t2=await tot();out.v12=await totV1();a=await A();out.revV2=a.chiffrage.baseRev;out.revV1=a.chiffrages[0].chiffrage.baseRev;
await click('vview|1');await wait(600);out.band=sp(await page.$eval('#eq-app .vv-band',e=>e.textContent).catch(()=>''));await click('vexit|');await wait(300);
console.log('3) base de prix et versions :',JSON.stringify(out));
C.c3=out.t0>0&&out.v10===out.t0&&out.rev1&&out.rev1!==out.revV1&&out.arch&&Math.abs(out.t1-out.t0)<0.01&&Math.abs(out.v11-out.t0)<0.01&&out.t2>out.t0+1&&Math.abs(out.v12-out.t0)<0.01&&out.revV2===out.rev1&&out.revV1!==out.rev1
  &&/Tu consultes la v1/.test(out.band)&&!/Recalculé/.test(out.band);
// ── 4) 📦 dossier de remise : la DPGF du zip = le fichier du client exporté par la grille (E10 = 60, formule de F10 gardée)
await click('tab|offre');await wait(400);
const [dlz]=await Promise.all([page.waitForEvent('download',{timeout:20000}),click('obzip|')]);const Z=unzipSync(new Uint8Array(fs.readFileSync(await dlz.path())));const names=Object.keys(Z).sort();
const dp=names.find(n=>/DPGF_lot02_essai_SCR\.xlsx$/.test(n));out={names,dp};
if(dp){const X=unzipSync(Z[dp]);const sh=strFromU8(X['xl/worksheets/sheet1.xml']||new Uint8Array());const m=/<c r="E10"[^>]*>(.*?)<\/c>/.exec(sh);out.e10=m?m[1]:null;const f=/<c r="F10"[^>]*>(.*?)<\/c>/.exec(sh);out.f10=f?f[1]:null;}
console.log('4) dossier de remise :',JSON.stringify(out));
C.c4=!!dp&&/<v>60<\/v>/.test(out.e10||'')&&/<f[^>]*>D10\*E10<\/f>/.test(out.f10||'');
C.console=logs.length===0;
const bad=Object.entries(C).filter(([k,v])=>!v).map(([k])=>k);console.log(bad.length?'RESULTAT: ECHEC '+bad.join(','):'RESULTAT: TOUT VERT');console.log(logs.length?logs:'[]');
await browser.close();
