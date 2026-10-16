// LOT R (15/10) — DPGF : le calculateur qui s'ouvre tout seul, les soudures comptées en ml, « ⇶ Répartir au ml ». Ethan : « on remplit ce qui est un peu
// unitaire ou qui a clairement sa ligne dans le DPGF, on coche les prix qu'on a remplis, puis le reste est ventilé au prix en ml […] ça ne doit pas casser ce que
// tu as fait, les liens et tout ». Données FICTIVES : test/fixture_dpgf_rep.xlsx (make_fixture_dpgfrep.py : lignes au ml DN 100 × 2, DN 80, 2 antennes DN 50,
// une ligne au ml sans DN, des lignes à l'unité, une ligne « divers »), test/fixture_prix.xlsx ; 2 zones (DN 100 / 80 / 50, puis DN 50 / 40) ; hors connexion.
// c1 ouverture directe au clic sur un PU (volet à droite de la grille, sans défiler) · c2 pastille « 🧮 Calculer » · c3 saisie en ml (« 20 soud. ≈ 240 ml »)
// c4 groupe de lignes avec X soudures (au prorata des ml, sa couleur) · c5 par DN : même € / ml sur toutes les lignes d'un DN, PU saisi à la main laissé, DN sans
// ligne signalé non placé, ligne déjà liée qui garde ses composantes, écart d'arrondi · c6 un seul ↶ · c7 communes au prorata · c8 communes + non placé sur une
// ligne · c9 refaire après changement du chiffrage · c9b un lien avec parts passe en orange quand la marge change (↻ Appliquer, parts gardées) · c10 défaire ·
// c6b le calculateur montre les parts d'une ligne et « ↦ Mettre » les garde · c11 export du DPGF intact · c12 consultation de version : lecture seule ·
// c13 téléphone 390 px (volet en bas, outil plein écran, boutons ≥ 34 px) · c14 rien d'ancien ne change (liens classiques, pas de champ reps) · c15 côte à côte :
// le panneau de droite remonte sur le calculateur et clignote · c16 réglage « ouvrir au clic » · c17 « ⤓ dans le panneau » · c18 « 📊 Ventilation » ·
// c19 une ligne insérée : les répartitions suivent · c20 tout défaire = comme avant · console sans erreur. Captures : SHOTS=dossier (défaut /tmp/shots_dpgfrep).
import { chromium } from 'playwright';
import fs from 'fs';import path from 'path';import {fileURLToPath} from 'url';
import {zipEntries} from '../src/xlsx.js';
const HERE=path.dirname(fileURLToPath(import.meta.url));
const BASE=process.env.BASE||'http://localhost:8765';const SHOTS=process.env.SHOTS||'/tmp/shots_dpgfrep';try{fs.mkdirSync(SHOTS,{recursive:true});}catch(e){}
const browser=await chromium.launch({headless:true, executablePath: process.env.CHROMIUM_PATH||undefined});
const ctx=await browser.newContext({viewport:{width:1366,height:768},acceptDownloads:true});const page=await ctx.newPage();
const logs=[];page.on('pageerror',e=>logs.push('PAGEERROR: '+e.message.slice(0,300)));page.on('console',m=>{if(m.type()==='error'&&!/supabase|Failed to fetch|net::ERR|404|WebSocket|pdf\.worker|cdnjs/i.test(m.text()))logs.push(m.text().slice(0,200));});
page.on('dialog',d=>d.accept().catch(()=>{}));
const C={};const wait=ms=>page.waitForTimeout(ms);const NUM='O2610-77';const sp=t=>String(t||'').replace(/[\s\u00A0\u202F]+/g,' ').trim();
const nbv=t=>{const x=parseFloat(String(t||'').replace(/[\s\u00A0\u202F€]/g,'').replace(/[−–]/g,'-').replace(',','.'));return isFinite(x)?x:NaN;};
const chg=async(sel,val)=>{await page.evaluate(([s,v])=>{const el=document.querySelector(s);if(!el)throw new Error('absent '+s);if(el.type==='checkbox'||el.type==='radio'){el.checked=!!v;}else el.value=v;el.dispatchEvent(new Event('change',{bubbles:true}));},[sel,val]);await wait(150);};
const inp=async(sel,val)=>{await page.evaluate(([s,v])=>{const el=document.querySelector(s);if(!el)throw new Error('absent '+s);el.value=v;el.dispatchEvent(new Event('input',{bubbles:true}));el.dispatchEvent(new Event('change',{bubbles:true}));},[sel,val]);await wait(200);};
const click=async v=>{await page.evaluate(v=>{const el=document.querySelector(`#eq-app [data-act=af][data-v="${v}"]`);if(!el)throw new Error('bouton absent '+v);el.click();},v);await wait(300);};
const has=v=>page.evaluate(v=>!!document.querySelector(`#eq-app [data-act=af][data-v="${v}"]`),v);
const td=(r,c)=>`#dx-vp td[data-r="${r}"][data-c="${c}"]`;
const A=()=>page.evaluate(n=>window.TRACE.affaires.get(n),NUM);
const typeIn=async(r,c,text)=>{await page.click(td(r,c));await wait(120);await page.keyboard.type(text);await page.keyboard.press('Enter');await wait(400);};
const rect=s=>page.evaluate(s=>{const e=typeof s==='string'?document.querySelector(s):null;if(!e)return null;const b=e.getBoundingClientRect();return {l:Math.round(b.left),t:Math.round(b.top),r:Math.round(b.right),b:Math.round(b.bottom),w:Math.round(b.width),h:Math.round(b.height)};},s);
const hb=()=>page.evaluate(()=>{const h=document.getElementById('homeBody');return h?h.scrollTop:window.scrollY;});
const split=()=>page.evaluate(()=>(document.querySelector('#dx-card .dx-split')||{}).className||'');
const ck=async(k,on=true)=>chg(`#dx-calc input[data-dx="ck"][data-k="${k}"]`,on);
const shot=async(name,sel)=>{try{if(sel){const el=await page.$(sel);if(el)await el.screenshot({path:path.join(SHOTS,name)});}else await page.screenshot({path:path.join(SHOTS,name)});}catch(e){console.log('(capture '+name+' : '+e.message.slice(0,80)+')');}};
const pvRows=()=>page.evaluate(()=>[...document.querySelectorAll('#rp-pv .rp-pvt tbody tr')].map(tr=>[...tr.children].map(td=>td.textContent.replace(/[\s\u00A0\u202F]+/g,' ').trim())));
const parts=(a,id,ad)=>{const L=(a.dpgf.liens||[]).find(x=>x.a===ad);return L?(L.comps||[]).filter(x=>x.rep===id):[];};
const restOf=(a,k,qty)=>qty-(a.dpgf.liens||[]).reduce((s,L)=>s+(L.comps||[]).filter(x=>x.k===k).reduce((t,x)=>t+(+x.q||0),0),0);
// ── mise en place : affaire, classeur (base fictive), zone 1 : DN 100 (120 soud., 600 ml), DN 80 (50, 300), DN 50 (30, 200), purges, chantier ; zone 2 : DN 50 (20, 150), DN 40 (12, 60)
await page.goto(BASE+'/index.html');await wait(600);await page.evaluate(()=>{localStorage.clear();localStorage.setItem('trace:wide','1');});await page.evaluate(()=>new Promise(r=>{try{const q=indexedDB.deleteDatabase('trace-kv');q.onsuccess=q.onerror=q.onblocked=()=>r();}catch(e){r();}}));
await page.reload();await wait(1200);
{const s=await page.$('#loginSkip');if(s&&await s.isVisible())await s.click();await wait(700);}
await page.evaluate(async n=>{const T=window.TRACE;T.state.userId='ethan';T.renderHome();document.getElementById('htCom').click();await new Promise(x=>setTimeout(x,250));
  document.querySelector('#eq-app [data-act=af][data-v="new|"]').click();await new Promise(x=>setTimeout(x,150));document.getElementById('afn-num').value=n;document.getElementById('afn-nom').value='Répartition au ml (essai)';document.getElementById('afn-client').value='CLIENT TEST';document.getElementById('afn-etat').value='devis';
  document.querySelector('#eq-app [data-act=af][data-v="create|"]').click();await new Promise(x=>setTimeout(x,250));document.querySelector('#eq-app [data-act=af][data-v="tab|chiffrage"]').click();await new Promise(x=>setTimeout(x,200));},NUM);
await page.setInputFiles('#eq-app input[data-afprix]',path.join(HERE,'fixture_prix.xlsx'));await wait(1500);
const dnRow=async(i,dn,s,ml)=>{await click('chadd|dn');await chg(`#eq-app [data-afx="e§dn.${i}.dn"]`,String(dn));await chg(`#eq-app [data-afx="e§dn.${i}.soud"]`,String(s));await chg(`#eq-app [data-afx="e§dn.${i}.ml"]`,String(ml));};
const unfold=async k=>{if(await page.evaluate(k=>{const c=document.querySelector(`#eq-app .ch-bloc[data-bloc="${k}"]`);return !!c&&c.classList.contains('folded');},k))await click('chfold|'+k);};
await click('chetudeadd|');await dnRow(0,100,120,600);await dnRow(1,80,50,300);await dnRow(2,50,30,200);
await unfold('purges');await chg('#eq-app [data-afx="e§purges.dn"]','32');await chg('#eq-app [data-afx="e§purges.paires"]','3');
await unfold('chantier');await chg('#eq-app [data-afx="e§chantier.d0"]','2026-11-02');await chg('#eq-app [data-afx="e§chantier.d1"]','2026-11-20');await chg('#eq-app [data-afx="e§chantier.benne"]',true);await chg('#eq-app [data-afx="e§chantier.wc"]',true);
await click('chetudeadd|');await dnRow(0,50,20,150);await dnRow(1,40,12,60);
await click('tab|dpgf');
const ORIG=fs.readFileSync(path.join(HERE,'fixture_dpgf_rep.xlsx'));
await page.setInputFiles('#eq-app [data-afdpgf]',{name:'DPGF_lot03_rep.xlsx',mimeType:'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',buffer:ORIG});
await page.waitForSelector('#dx-vp',{timeout:15000});await wait(2600); /* le message « DPGF lue » s'efface */
let a=await A();let out={lines:a.dpgf.lignes.filter(l=>!l.section).map(l=>l.row+':'+l.n+':'+l.u+':'+l.qte).join(' ')};console.log('0) DPGF :',out.lines);
// ── c1) clic sur le PU de la ligne 3.1 (soudure DN 100, u) : le calculateur s'ouvre À CÔTÉ de la grille, sans défiler ; mini-récap
await page.evaluate(()=>{document.getElementById('dx-grid').scrollIntoView({block:'start'});});await wait(300);
const hb0=await hb();await page.click(td(18,5));await wait(600);
out={split:await split(),calc:await rect('#dx-calc'),grid:await rect('#dx-grid'),cell:await rect(td(18,5)),vp:await rect('#dx-vp'),hb:await hb(),hb0,h4:sp(await page.$eval('#dx-calc h4',e=>e.textContent)),recap:sp(await page.$eval('#dx-calc .rp-ch',e=>e.textContent)),
  btns:await page.$$eval('#dx-calc .rp-fbar button',L=>L.map(b=>b.textContent.trim()+':'+(b.offsetParent?1:0))),bar:await page.$eval('#eq-app [data-v="dxcalc|"]',e=>e.textContent.trim()+':'+e.className),auto:await page.$eval('#dx-calc [data-rp="auto"]',e=>e.checked),focus:await page.evaluate(()=>document.activeElement&&document.activeElement.id)};
out.vml=await page.evaluate(()=>{const r=[...document.querySelectorAll('#dx-vent .dx-vt tbody tr')].find(tr=>/^Soudure/.test(tr.cells[0].textContent));return r?r.cells[1].textContent.replace(/[\s\u00A0\u202F]+/g,' ').trim():'';});
console.log('1) ouverture au clic sur un PU :',JSON.stringify(out));
C.c1=/\bflt\b/.test(out.split)&&out.calc&&out.calc.l>=out.grid.r-2&&out.calc.t>=out.grid.t-2&&out.calc.b<=out.grid.b+2&&out.calc.b<=768&&out.hb===out.hb0&&/ligne 18/.test(out.h4)&&/pointé 0 %/.test(out.recap)&&/reste à placer [\d ]+ €/.test(out.recap)
  &&out.btns.join()==='⤓ dans le panneau:1,✕:1'&&out.bar==='🧮 Calculer cette cellule:btn sm primary'&&out.auto&&out.cell.r<=out.vp.r&&out.cell.l>=out.vp.l&&out.focus==='dx-vp'&&/^[\d ]+reste [\d ]+200 soud\. ≈ 1 100 ml$/.test(out.vml);
await shot('pc_1366_calculateur_volet.png');
// 3.1 = 40 soudures DN 100 de la zone 1 (on remplit ce qui a clairement sa ligne)
await ck('z0|soudure|dn100');out={take:await page.$eval('#dx-calc [data-dx="cq"][data-k="z0|soudure|dn100"]',e=>e.value),row:sp(await page.$eval('#dx-calc .dx-cr[data-k="z0|soudure|dn100"]',e=>e.textContent))};
await page.fill('#dx-calc [data-dx="cq"][data-k="z0|soudure|dn100"]','40');await page.dispatchEvent('#dx-calc [data-dx="cq"][data-k="z0|soudure|dn100"]','change');await wait(250);
out.ml=await page.$eval('#dx-calc [data-rp="cqml"][data-k="z0|soudure|dn100"]',e=>e.value);await click('dxput|');a=await A();const L1=a.dpgf.liens[0];
out.L1=L1&&{a:L1.a,keys:Object.keys(L1).sort().join(','),comps:JSON.stringify(L1.comps)};out.reps=a.dpgf.reps===undefined;out.split2=await split();
console.log('   lien 3.1 :',JSON.stringify(out));
// c14 (début) : un lien classique reste exactement comme avant (mêmes champs, quantité en soudures), pas de champ reps
// 16/10 (lot C2) : ligne « à l'unité » (3.1 : 40 u) → cocher les soudures DN 100 propose d'office 40 soudures (avant : tout le reste, 120) — changement voulu
C.c14=out.take==='40'&&/120 soud\. ≈ 600 ml/.test(out.row)&&/€ \/ ml/.test(out.row)&&out.ml==='200'&&out.L1&&out.L1.a==='E18'&&out.L1.keys==='a,amt,at,by,col,comps,id,pu,q,qa,qfix,sh,u,v'&&out.L1.comps==='[{"k":"z0|soudure|dn100","q":40}]'&&out.reps&&/\bflt\b/.test(out.split2);
// ── c2) la pastille : sur une désignation rien ne s'ouvre, une pastille « 🧮 Calculer » apparaît près de la cellule ; elle ouvre le calculateur
await click('dxrpshut|');out={closed:!/\bflt\b/.test(await split())};await page.click(td(10,2));await wait(400);
out.split=await split();out.chip=await page.evaluate(()=>{const c=document.querySelector('#dx-vp .rp-chip');if(!c||c.hidden)return null;const b=c.getBoundingClientRect();return {t:c.textContent,l:Math.round(b.left),r:Math.round(b.right),tp:Math.round(b.top),b:Math.round(b.bottom),h:Math.round(b.height)};});out.cell=await rect(td(10,2));
await shot('pc_1366_pastille.png');
await page.click('#dx-vp .rp-chip');await wait(500);out.after={split:await split(),h4:sp(await page.$eval('#dx-calc h4',e=>e.textContent)),chip:await page.evaluate(()=>{const c=document.querySelector('#dx-vp .rp-chip');return !!(c&&!c.hidden);})};
console.log('2) pastille :',JSON.stringify(out));
C.c2=out.closed&&!/\bflt\b/.test(out.split)&&out.chip&&/🧮 Calculer/.test(out.chip.t)&&out.chip.r<=out.cell.r+2&&out.chip.tp>=out.cell.t-8&&out.chip.b<=out.cell.b+8&&out.chip.l>out.cell.l+40&&out.chip.h>=28&&/\bflt\b/.test(out.after.split)&&/ligne 10/.test(out.after.h4)&&!out.after.chip;
// ── c3) saisie en ml : ligne 2.4 (antenne DN 50, 120 ml) ; cocher « soudures DN 50 zone 1 » prend d'office la part de ses ml (18 soud. ≈ 120 ml) ; « 100 ml » → 15 soud.
await page.click(td(13,5));await wait(400);await ck('z0|soudure|dn50');
out={h4:sp(await page.$eval('#dx-calc h4',e=>e.textContent)),q:await page.$eval('#dx-calc [data-dx="cq"][data-k="z0|soudure|dn50"]',e=>e.value),ml:await page.$eval('#dx-calc [data-rp="cqml"][data-k="z0|soudure|dn50"]',e=>e.value),row:sp(await page.$eval('#dx-calc .dx-cr[data-k="z0|soudure|dn50"] small',e=>e.textContent))};
await page.fill('#dx-calc [data-rp="cqml"][data-k="z0|soudure|dn50"]','100');await wait(200);out.q2=await page.$eval('#dx-calc [data-dx="cq"][data-k="z0|soudure|dn50"]',e=>e.value);out.res=sp(await page.$eval('#dx-cres',e=>e.textContent));
await page.dispatchEvent('#dx-calc [data-rp="cqml"][data-k="z0|soudure|dn50"]','change');await wait(300);out.rst=sp(await page.$eval('#dx-calc .dx-cr[data-k="z0|soudure|dn50"] .dx-rst',e=>e.textContent));
await shot('pc_1366_calculateur_ml.png');
await click('dxput|');a=await A();const L2=a.dpgf.liens.find(L=>L.a==='E13');out.L2=L2&&JSON.stringify(L2.comps);
console.log('3) saisie en ml :',JSON.stringify(out));
C.c3=/ligne 13/.test(out.h4)&&out.q==='18'&&out.ml==='120'&&/30 soud\. ≈ 200 ml/.test(out.row)&&/€ \/ ml/.test(out.row)&&out.q2==='15'&&/÷ 120 ml/.test(out.res)&&/reste 15 soud\. ≈ 100 ml/.test(out.rst)&&out.L2==='[{"k":"z0|soudure|dn50","q":15}]';
// un PU saisi à la main sur la ligne 2.6 (fourreau, sans DN) : la répartition ne doit pas l'écraser d'office
await click('dxrpshut|');await typeIn(15,5,'15');a=await A();const E15=((a.dpgf.xl.ed||{}).DPGF||{}).E15;
// ── c4) GROUPE de lignes : « 10 soudures DN 50 de la zone 2 sur les 2 lignes d'antenne », au prorata des ml (120 / 80 → 6 / 4) ; sa propre couleur
await click('dxrptool|');await wait(400);out={open:!!await page.$('#rp-tool'),mode:await page.$eval('#rp-tool .rp-modes .btn.on',e=>e.textContent.trim())};await click('dxrpmode|grp');
out.none=await page.evaluate(()=>[...document.querySelectorAll('#rp-tool input[data-rp="ln"]:checked,#rp-tool input[data-rp="ck"]:checked')].length);
await chg('#rp-tool input[data-rp="ln"][data-a="E13"]',true);await chg('#rp-tool input[data-rp="ln"][data-a="E14"]',true);await chg('#rp-tool input[data-rp="ck"][data-k="z1|soudure|dn50"]',true);
out.def=await page.$eval('#rp-tool input[data-rp="q"][data-k="z1|soudure|dn50"]',e=>e.value);await inp('#rp-tool input[data-rp="q"][data-k="z1|soudure|dn50"]','10');
out.pv=await pvRows();out.foot=sp(await page.$eval('#rp-ft',e=>e.textContent));
await click('dxrpapply|');await wait(300);a=await A();const R1=(a.dpgf.reps||[])[0];const L14=a.dpgf.liens.find(L=>L.a==='E14');const L13=a.dpgf.liens.find(L=>L.a==='E13');
out.R1=R1&&{mode:R1.mode,lignes:R1.lignes.join(),ks:R1.ks.join(),qs:JSON.stringify(R1.qs)};out.p13=R1&&JSON.stringify(parts(a,R1.id,'E13').map(x=>x.q));out.p14=R1&&JSON.stringify(parts(a,R1.id,'E14').map(x=>x.q));
out.cols=[a.dpgf.liens[0].col,L13&&L13.col,L14&&L14.col,R1&&R1.col];out.l14rep=L14&&L14.rep===(R1&&R1.id);out.l13own=L13&&JSON.stringify(L13.comps.filter(x=>!x.rep));out.closed=!await page.$('#rp-tool');
out.grid=await page.evaluate(()=>{const c=document.querySelector('#dx-vp td[data-r="14"][data-c="5"]');return c?{cls:c.className,txt:c.textContent.trim()}:null;});
console.log('4) groupe de lignes :',JSON.stringify(out));
const pm=r=>nbv((r[3]||'').replace(/^\+\s*/,'').replace(/€.*$/,''));
C.c4=out.open&&/Par DN/.test(out.mode)&&out.none===0&&out.def==='20'&&out.pv.length===2&&Math.abs(pm(out.pv[0])-pm(out.pv[1]))<0.011&&/Total réparti/.test(out.foot)&&out.R1&&out.R1.mode==='grp'&&out.R1.lignes==='E13,E14'&&out.R1.ks==='z1|soudure|dn50'&&out.R1.qs==='{"z1|soudure|dn50":10}'
  &&out.p13==='[6]'&&out.p14==='[4]'&&out.l14rep&&out.cols[2]===out.cols[3]&&out.cols[3]!==out.cols[0]&&out.cols[3]!==out.cols[1]&&out.l13own==='[{"k":"z0|soudure|dn50","q":15}]'&&out.closed&&out.grid&&/dx-lk/.test(out.grid.cls)&&out.grid.txt!==''&&E15&&E15.v===15;
// ── c5) PAR DN, toutes les zones : lignes au ml où un DN est lu (pas la 2.6 au PU saisi), composantes par DN cochées, communes non ; DN 40 sans ligne → non placé
await click('dxrptool|');await wait(400);
out={lines:await page.$$eval('#rp-tool input[data-rp="ln"]',L=>L.map(x=>x.dataset.a+(x.checked?'+':'-')).join(' ')),man:sp(await page.$eval('#rp-tool .rp-ln[data-a="E15"]',e=>e.textContent)),
  ks:await page.$$eval('#rp-tool input[data-rp="ck"]:checked',L=>L.map(x=>x.dataset.k).sort().join(' ')),com:await page.$$eval('#rp-tool .rp-grp:nth-child(2) input[data-rp="ck"]',L=>L.map(x=>x.dataset.k+(x.checked?'+':'-')).join(' ')),
  chips:await page.$$eval('#rp-tool .rp-chips:first-of-type .btn',L=>L.map(b=>b.textContent.trim()).join(' | '))};
out.pv=await pvRows();out.dns=sp(await page.$eval('#rp-pv .rp-dns',e=>e.textContent));out.un=sp(await page.$eval('#rp-pv .rp-un',e=>e.textContent));out.foot=sp(await page.$eval('#rp-ft',e=>e.textContent));
await chg('#rp-tool select[data-rp="dn"][data-a="E15"]','80');const pvDn=await pvRows();out.dnMain={on:await page.$eval('#rp-tool input[data-rp="ln"][data-a="E15"]',e=>e.checked),r26:(pvDn.find(r=>/^2\.6/.test(r[0]))||[]).join(' | '),r23:(pvDn.find(r=>/^2\.3/.test(r[0]))||[]).join(' | ')};
await chg('#rp-tool select[data-rp="dn"][data-a="E15"]','');await chg('#rp-tool input[data-rp="ln"][data-a="E15"]',false);out.dnBack=(await pvRows()).length;
await shot('pc_1366_repartir_au_ml.png');await shot('pc_1366_repartir_apercu.png','#rp-pv');
await click('dxrpapply|');await wait(300);a=await A();const R2=(a.dpgf.reps||[])[1];
const DNL={100:[['E10',420],['E11',180]],80:[['E12',300]],50:[['E13',120],['E14',80]]};const ratio={};let sameMl=true;
Object.entries(DNL).forEach(([d,L])=>{L.forEach(([ad,ml])=>{parts(a,R2.id,ad).forEach(x=>{(ratio[x.k]=ratio[x.k]||[]).push(x.q/ml);});});});Object.values(ratio).forEach(v=>{if(Math.max(...v)-Math.min(...v)>0.001/80+1e-9)sameMl=false;});
const lp=Object.fromEntries(a.dpgf.liens.map(L=>[L.a,L.pu]));const lpu=Object.fromEntries(a.dpgf.lignes.filter(l=>!l.section).map(l=>[l.n,l.pu]));
out.R2=R2&&{mode:R2.mode,lignes:R2.lignes.join(),n:R2.ks.length,com:JSON.stringify(R2.com)};out.sameMl=sameMl;out.ratio=Object.keys(ratio).length;
out.rest={s100:restOf(a,'z0|soudure|dn100',120),m100:restOf(a,'z0|manchons|dn100',120),s80:restOf(a,'z0|soudure|dn80',50),s50:restOf(a,'z0|soudure|dn50',30),s50b:restOf(a,'z1|soudure|dn50',20),s40:restOf(a,'z1|soudure|dn40',12)};
out.l13=a.dpgf.liens.find(L=>L.a==='E13').comps.map(x=>(x.rep?x.rep===R2.id?'R2':'R1':'own')+':'+x.k+':'+x.q).filter(x=>!/^R2/.test(x)).join(' ');out.l13col=a.dpgf.liens.find(L=>L.a==='E13').col;
out.pus={E10:lp.E10,E11:lp.E11,E12:lp.E12,E13:lp.E13,E14:lp.E14,E15:lp.E15};out.cellPu={'2.1':lpu['2.1'],'2.2':lpu['2.2'],'2.6':lpu['2.6']};out.newCol=a.dpgf.liens.filter(L=>L.rep===R2.id).map(L=>L.col);
console.log('5) par DN :',JSON.stringify(out));
const pmL=Object.fromEntries(out.pv.map(r=>[r[0].split(' ')[0],pm(r)]));
C.c5=out.lines==='E10+ E11+ E12+ E13+ E14+ E15-'&&/PU saisi 15,00 €/.test(out.man)&&out.ks.split(' ').length===10&&/z0\|soudure\|dn100/.test(out.ks)&&/z1\|manchons\|dn40/.test(out.ks)&&!/\+/.test(out.com)&&/toutes les lignes DN 50 · 2/.test(out.chips)
  &&Math.abs(pmL['2.1']-pmL['2.2'])<0.011&&Math.abs(pmL['2.4']-pmL['2.5'])<0.011&&/DN 100 : \+ [\d ,]+ € \/ ml · 2 lignes · 600 ml/.test(out.dns)&&/DN 40 : aucune ligne DN 40 cochée — 12 soud\., 12 manch\., [\d ]+ €/.test(out.un)&&/écart d'arrondi : −?[\d ,]+ €/.test(out.foot)
  &&out.R2&&out.R2.mode==='dn'&&out.R2.lignes==='E10,E11,E12,E13,E14'&&out.sameMl&&out.ratio>=8&&Math.abs(out.rest.s100)<1e-6&&Math.abs(out.rest.m100)<1e-6&&Math.abs(out.rest.s80)<1e-6&&Math.abs(out.rest.s50)<1e-6&&Math.abs(out.rest.s50b)<1e-6&&Math.abs(out.rest.s40-12)<1e-9
  &&out.l13==='own:z0|soudure|dn50:15 R1:z1|soudure|dn50:6'&&out.l13col===L13.col&&out.pus.E10>0&&out.pus.E10===out.cellPu['2.1']&&out.pus.E15===undefined&&out.cellPu['2.6']===15&&out.newCol.length===3&&new Set(out.newCol).size===1
  &&out.dnMain.on&&/remplace le PU saisi/.test(out.dnMain.r26)&&out.dnMain.r26.split(' | ')[3]===out.dnMain.r23.split(' | ')[3]&&/€ \/ ml/.test(out.dnMain.r23)&&out.dnBack===5;
// ── c6) UN seul ↶ : la répartition entière part (liens créés, parts, PU) ; ↷ la remet
const before=JSON.stringify({l:a.dpgf.liens,r:a.dpgf.reps,ed:a.dpgf.xl.ed});await click('dxundo|');await wait(300);a=await A();
out={reps:(a.dpgf.reps||[]).map(r=>r.mode).join(),links:a.dpgf.liens.map(L=>L.a).join(),e10:((a.dpgf.xl.ed||{}).DPGF||{}).E10,l13:a.dpgf.liens.find(L=>L.a==='E13').comps.length};
await click('dxredo|');await wait(300);a=await A();out.back=JSON.stringify({l:a.dpgf.liens,r:a.dpgf.reps,ed:a.dpgf.xl.ed})===before;
console.log('6) un seul ↶ :',JSON.stringify(out));
C.c6=out.reps==='grp'&&out.links==='E18,E13,E14'&&out.e10===undefined&&out.l13===2&&out.back;
// ── c6b) le calculateur d'une ligne qui porte des parts de répartition : il les montre (comptées dans Σ), « ↦ Mettre » les garde ; ↶ remet
await page.click(td(13,5));await wait(500);let l13a=(await A()).dpgf.liens.find(L=>L.a==='E13');
out={parts:sp(await page.$eval('#dx-calc .rp-parts',e=>e.textContent).catch(()=>'')),own:await page.$$eval('#dx-calc .dx-cr.on',L=>L.map(x=>x.dataset.k).join()),res:sp(await page.$eval('#dx-cres',e=>e.textContent))};
await page.fill('#dx-calc [data-dx="cq"][data-k="z0|soudure|dn50"]','12');await page.dispatchEvent('#dx-calc [data-dx="cq"][data-k="z0|soudure|dn50"]','change');await wait(300);await click('dxput|');a=await A();let l13b=a.dpgf.liens.find(L=>L.a==='E13');
out.before=l13a.comps.filter(x=>x.rep).length;out.after=l13b.comps.filter(x=>x.rep).length;out.ownQ=l13b.comps.filter(x=>!x.rep).map(x=>x.q).join();out.sameParts=JSON.stringify(l13a.comps.filter(x=>x.rep))===JSON.stringify(l13b.comps.filter(x=>x.rep));out.pu=[l13a.pu,l13b.pu];
await click('dxundo|');await wait(300);a=await A();out.undo=a.dpgf.liens.find(L=>L.a==='E13').comps.filter(x=>!x.rep).map(x=>x.q).join();
console.log('6b) calculateur et parts :',JSON.stringify(out));
C.c6b=/⇶ Groupe 2\.4, 2\.5/.test(out.parts)&&/⇶ Au ml par DN/.test(out.parts)&&out.own==='z0|soudure|dn50'&&nbv((out.res.match(/Σ ([\d\s\u00A0\u202F,]+) €/)||[])[1])>3000&&out.before>2&&out.after===out.before&&out.sameParts&&out.ownQ==='12'&&out.pu[1]<out.pu[0]&&out.undo==='15';
// ── c7) COMMUNES au prorata des ml : l'épreuve des 2 zones sur les 5 lignes cochées (même € / ml partout)
await click('dxrptool|');await wait(400);out={ks:await page.$$eval('#rp-tool input[data-rp="ck"]:checked',L=>L.map(x=>x.dataset.k).join(' '))};
await chg('#rp-tool input[data-rp="ck"][data-k="z0|epreuve"]',true);await chg('#rp-tool input[data-rp="ck"][data-k="z1|epreuve"]',true);out.pv=await pvRows();out.un=sp(await page.$eval('#rp-pv',e=>e.textContent));
await click('dxrpapply|');await wait(300);a=await A();const R3=(a.dpgf.reps||[])[2];const r3={};['E10','E11','E12','E13','E14'].forEach((ad,i)=>{parts(a,R3.id,ad).forEach(x=>{(r3[x.k]=r3[x.k]||[]).push(x.q/[420,180,300,120,80][i]);});});
out.R3=R3&&{ks:R3.ks.join(),com:R3.com.mode,n:Object.values(r3).map(v=>v.length).join()};out.same=Object.values(r3).every(v=>Math.max(...v)-Math.min(...v)<0.001/80+1e-9);
console.log('7) communes au prorata :',JSON.stringify(out));
C.c7=out.ks==='z1|soudure|dn40 z1|manchons|dn40'&&out.pv.length===5&&new Set(out.pv.map(r=>r[3])).size===1&&/DN 40 : aucune ligne DN 40 cochée/.test(out.un)&&out.R3&&/z0\|epreuve/.test(out.R3.ks)&&/z1\|epreuve/.test(out.R3.ks)&&out.R3.com==='prorata'&&out.R3.n==='5,5'&&out.same;
// ── c8) sur UNE ligne (« divers ») : conteneur + purges, et le non placé (DN 40) avec les communes
await click('dxrptool|');await wait(400);await chg('#rp-tool input[data-rp="ck"][data-k="z0|conteneur"]',true);await chg('#rp-tool input[data-rp="ck"][data-k="z0|purges"]',true);
await chg('#rp-tool input[data-rp="cm"][value="ligne"]',true);out={sel:await page.$eval('#rp-tool select[data-rp="cl"]',e=>e.value)};
out.unBefore=sp(await page.$eval('#rp-pv',e=>e.textContent));await chg('#rp-pv input[data-rp="orph"]',true);out.unAfter=await page.evaluate(()=>!!document.querySelector('#rp-pv .rp-un'));out.pv=await pvRows();
await click('dxrpapply|');await wait(300);a=await A();const R4=(a.dpgf.reps||[])[3];const L27=a.dpgf.liens.find(L=>L.a==='E27');
out.R4=R4&&{com:JSON.stringify(R4.com),orphan:R4.orphan};out.L27=L27&&{rep:L27.rep===R4.id,k:L27.comps.map(x=>x.k).sort().join(),pu:L27.pu};out.cell=((a.dpgf.lignes||[]).find(l=>l.n==='5.1')||{}).pu;out.s40=restOf(a,'z1|soudure|dn40',12);
console.log('8) sur une ligne :',JSON.stringify(out));
C.c8=out.sel==='E27'&&/DN 40 : aucune ligne DN 40 cochée/.test(out.unBefore)&&!out.unAfter&&out.pv.some(r=>/^5\.1/.test(r[0]))&&out.R4&&out.R4.com==='{"mode":"ligne","ligne":"E27"}'&&out.R4.orphan&&out.L27&&out.L27.rep&&out.L27.k==='z0|conteneur,z0|purges,z1|manchons|dn40,z1|soudure|dn40'&&out.L27.pu>0&&out.cell===out.L27.pu&&Math.abs(out.s40)<1e-6;
await page.evaluate(()=>{const e=document.querySelector("#dx-vent .rp-reps");if(e)e.scrollIntoView({block:"center"});});await wait(300);await shot("pc_1366_ventilation_repartitions.png",".rp-reps");
// ── c9) le chiffrage change (zone 1 : 150 soudures DN 100 au lieu de 120) → « ↻ … de reste à reprendre » ; « ↻ Refaire avec le reste actuel » reprend le reste, un seul ↶
await click('tab|chiffrage');await click('chei|0');await chg('#eq-app [data-afx="e§dn.0.soud"]','150');await click('tab|dpgf');await wait(500);
out={hint:sp(await page.$eval(`#dx-vent .rp-rep[data-rep="${R2.id}"]`,e=>e.textContent)),rest:restOf(await A(),'z0|soudure|dn100',150)};
await click('dxrpredo|'+R2.id);await wait(300);a=await A();out.sum100=parts(a,R2.id,'E10').concat(parts(a,R2.id,'E11')).filter(x=>x.k==='z0|soudure|dn100').reduce((s,x)=>s+x.q,0);out.rest2=restOf(a,'z0|soudure|dn100',150);
out.hint2=sp(await page.$eval(`#dx-vent .rp-rep[data-rep="${R2.id}"]`,e=>e.textContent));out.stale=await page.evaluate(()=>!!document.querySelector('#dx-vent .dx-stale'));
await click('dxundo|');await wait(300);out.undo=restOf(await A(),'z0|soudure|dn100',150);await click('dxredo|');await wait(300);
console.log('9) refaire :',JSON.stringify(out));
C.c9=/↻ [\d ]+ € de reste à reprendre/.test(out.hint)&&Math.abs(out.rest-30)<1e-6&&Math.abs(out.sum100-110)<1e-6&&Math.abs(out.rest2)<1e-6&&!/reste à reprendre/.test(out.hint2)&&!out.stale&&Math.abs(out.undo-30)<1e-6;
// ── c9b) la marge change : les liens qui portent des parts de répartition passent en orange comme les autres ; « ↻ Appliquer » les réécrit, parts gardées
a=await A();const p10=JSON.stringify(a.dpgf.liens.find(L=>L.a==='E10').comps);const pu10=a.dpgf.liens.find(L=>L.a==='E10').pu;
await page.evaluate(n=>{const T=window.TRACE.affaires;const a=T.get(n);T.set(n,{chiffrage:Object.assign({},a.chiffrage,{marge:(+a.chiffrage.marge||0)+0.05})});},NUM);await click('tab|chiffrage');await click('tab|dpgf');await wait(500);
out={cls:await page.$eval(td(10,5),e=>e.className),banner:sp(await page.$eval('#dx-vent .dx-stale',e=>e.textContent).catch(()=>'')),hint:sp(await page.$eval(`#dx-vent .rp-rep[data-rep="${R2.id}"]`,e=>e.textContent))};
await click('dxrelink|*');await wait(300);a=await A();const l10=a.dpgf.liens.find(L=>L.a==='E10');out.after={cls:await page.$eval(td(10,5),e=>e.className),same:JSON.stringify(l10.comps)===p10,pu:[pu10,l10.pu]};
console.log('9b) chiffrage changé, lien avec parts :',JSON.stringify(out));
C.c9b=/dx-lks/.test(out.cls)&&/prix liés? à mettre à jour/.test(out.banner)&&!/reste à reprendre|pris en trop/.test(out.hint)&&!/dx-lks/.test(out.after.cls)&&out.after.same&&out.after.pu[1]>0&&Math.abs(out.after.pu[1]-out.after.pu[0])>0.5;
// ── c10) ✕ Défaire : la répartition « sur une ligne » part (le lien qu'elle avait créé disparaît, PU d'avant remis) ; le groupe défait rend ses 10 soudures
await click('dxrpundo|'+R4.id);await wait(300);a=await A();out={reps:(a.dpgf.reps||[]).length,L27:!!a.dpgf.liens.find(L=>L.a==='E27'),e27:((a.dpgf.xl.ed||{}).DPGF||{}).E27,cell:((a.dpgf.lignes||[]).find(l=>l.n==='5.1')||{}).pu,s40:restOf(a,'z1|soudure|dn40',12)};
await click('dxrpundo|'+R1.id);await wait(300);a=await A();out.r1=(a.dpgf.reps||[]).some(r=>r.id===R1.id);out.s50b=restOf(a,'z1|soudure|dn50',20);out.L14=a.dpgf.liens.find(L=>L.a==='E14');out.L14=out.L14&&{n:out.L14.comps.length,r1:out.L14.comps.some(x=>x.rep===R1.id)};
out.l13=a.dpgf.liens.find(L=>L.a==='E13').comps.filter(x=>!x.rep).length;
console.log('10) défaire :',JSON.stringify(out));
C.c10=out.reps===3&&!out.L27&&out.e27===undefined&&(out.cell===0||out.cell===undefined)&&Math.abs(out.s40-12)<1e-9&&!out.r1&&Math.abs(out.s50b-10)<1e-6&&out.L14&&out.L14.n>0&&!out.L14.r1&&out.l13===1;
// ── c16) réglage « ouvrir au clic » (mémorisé sur l'appareil) : décoché → le clic sur un PU n'ouvre rien, la pastille le propose ; recoché → s'ouvre
if(/\bflt\b/.test(await split()))await click('dxrpshut|');await page.click(td(12,2));await wait(500); /* ligne liée : s'ouvre */
await chg('#dx-calc [data-rp="auto"]',false);out={ls:await page.evaluate(()=>localStorage.getItem('trace:dpgfxl:calcauto'))};await click('dxrpshut|');await page.click(td(12,5));await wait(500);
out.off={split:await split(),chip:await page.evaluate(()=>{const c=document.querySelector('#dx-vp .rp-chip');return !!(c&&!c.hidden);})};await page.click('#dx-vp .rp-chip');await wait(400);out.chipOpens=/\bflt\b/.test(await split());
await chg('#dx-calc [data-rp="auto"]',true);out.ls2=await page.evaluate(()=>localStorage.getItem('trace:dpgfxl:calcauto'));await click('dxrpshut|');await page.click(td(14,5));await wait(500);out.on=/\bflt\b/.test(await split());
// ── c17) « ⤓ dans le panneau » : le volet se range, la page descend sur le calculateur sous la grille · c18) « 📊 Ventilation » va au grand tableau
const hbA=await hb();await click('dxrpdock|');await wait(900);out.dock={split:await split(),hb:[hbA,await hb()],calc:await rect('#dx-calc')};
await page.evaluate(()=>{document.getElementById('dx-grid').scrollIntoView({block:'start'});});await wait(300);await click('dxrpvent|');await wait(900);out.vent=await rect('#dx-vent');
console.log('16-18) réglage, ⤓, 📊 :',JSON.stringify(out));
C.c16=out.ls==='0'&&!/\bflt\b/.test(out.off.split)&&out.off.chip&&out.chipOpens&&out.ls2==='1'&&out.on;
C.c17=!/\bflt\b/.test(out.dock.split)&&out.dock.hb[1]>out.dock.hb[0]&&out.dock.calc.t>=200&&out.dock.calc.t<768;
C.c18=out.vent&&out.vent.t>=200&&out.vent.t<500;
// ── c19) une ligne insérée au-dessus de la 2.1 : les répartitions suivent leurs lignes (comme les liens) ; ↶ remet
await page.evaluate(()=>{document.getElementById('dx-grid').scrollIntoView({block:'start'});});await wait(200);await page.click(td(10,2));await wait(200);await click('dxins|up');await wait(400);a=await A();
const rr=x=>(a.dpgf.reps||[]).find(r=>r.id===x)||{};out={ins:{lignes:(rr(R2.id).lignes||[]).join(),com:JSON.stringify(rr(R2.id).com),link:a.dpgf.liens.some(L=>L.a==='E11'&&L.comps.some(x=>x.rep===R2.id)),e10:a.dpgf.liens.some(L=>L.a==='E10')}};
await click('dxundo|');await wait(400);a=await A();out.undo=(rr(R2.id).lignes||[]).join();
console.log('19) insertion de ligne :',JSON.stringify(out));
C.c19=out.ins.lignes==='E11,E12,E13,E14,E15'&&out.ins.com==='{"mode":"prorata","ligne":"E28"}'&&out.ins.link&&!out.ins.e10&&out.undo==='E10,E11,E12,E13,E14';
// ── c11) ⬇ DPGF pour le dossier : le fichier du client, seules les cellules PU (et les montants recalculés) changent ; rien de l'appli
const ab=b=>b.buffer.slice(b.byteOffset,b.byteOffset+b.byteLength);const unz=async buf=>{const Z=await zipEntries(ab(buf));const o={};const {inflateBytes}=await import('../src/xlsx.js');for(const n of Object.keys(Z))o[n]=Buffer.from(Z[n].method===0?Z[n].data:await inflateBytes(Z[n]));return o;};
const cellsOf=x=>Object.fromEntries([...String(x).matchAll(/<c r="([A-Z]+\d+)"[^>]*?(?:\/>|>.*?<\/c>)/g)].map(m=>[m[1],m[0]]));
let [dl]=await Promise.all([page.waitForEvent('download'),click('dxexport|')]);const EXP=fs.readFileSync(await dl.path());const zo=await unz(ORIG),ze=await unz(EXP);
const s0=cellsOf(zo['xl/worksheets/sheet1.xml'].toString()),s1=cellsOf(ze['xl/worksheets/sheet1.xml'].toString());const diff=Object.keys(Object.assign({},s0,s1)).filter(k=>s0[k]!==s1[k]);
a=await A();const allX=Object.keys(ze).filter(n=>/\.xml$|\.rels$/.test(n)).map(n=>ze[n].toString()).join('');
out={name:dl.suggestedFilename(),cols:[...new Set(diff.map(k=>k.replace(/\d+/g,'')))].sort().join(),e10:s1.E10,f10:s1.F10,ids:a.dpgf.liens.some(L=>allX.includes(L.id))||(a.dpgf.reps||[]).some(r=>allX.includes(r.id)),trace:/rep:|Répartition|rp-|dx-|data-/.test(allX)};
console.log('11) export :',JSON.stringify(out));
C.c11=out.name==='DPGF_lot03_rep_SCR.xlsx'&&out.cols==='E,F'&&/<f>D10\*E10<\/f>/.test(out.f10)&&new RegExp('<v>'+String(a.dpgf.liens.find(L=>L.a==='E10').pu).replace('.','\\.')+'</v>').test(out.e10)&&!out.ids&&!out.trace;
// ── c12) consultation d'une version : lecture seule (pas d'outil, pas de pastille, pas de bouton qui écrit) ; le calculateur montre les parts
await click('tab|chiffrage');await click('vnew|');await page.evaluate(()=>{document.getElementById('vv-note').value='Essai répartition';document.getElementById('vv-ok').click();});await wait(500);
await click('vview|1');await click('tab|dpgf');await page.waitForSelector('#dx-vp',{timeout:15000});await wait(600);
out={band:sp(await page.$eval('#eq-app .vv-band',e=>e.textContent).catch(()=>'')),tool:await has('dxrptool|'),redo:await has('dxrpredo|'+R2.id),undo:await has('dxrpundo|'+R2.id),reps:await page.$$eval('#dx-vent .rp-rep',L=>L.length)};
await page.click(td(10,2));await wait(400);out.chip=await page.evaluate(()=>{const c=document.querySelector('#dx-vp .rp-chip');return !!(c&&!c.hidden);});
await page.click(td(10,5));await wait(500);out.split=await split();out.put=await has('dxput|');out.parts=sp(await page.$eval('#dx-calc .rp-parts',e=>e.textContent).catch(()=>''));out.dis=await page.$$eval('#dx-calc input:not([data-rp="auto"])',L=>L.every(x=>x.disabled||x.dataset.dx==='cf'));
await click('vexit|');await wait(500);out.back=await has('dxrptool|');
console.log('12) version en lecture seule :',JSON.stringify(out));
C.c12=/Tu consultes la v1/.test(out.band)&&!out.tool&&!out.redo&&!out.undo&&out.reps===2&&!out.chip&&/\bflt\b/.test(out.split)&&!out.put&&/⇶ Au ml par DN/.test(out.parts)&&out.dis&&out.back;
// ── c15) côte à côte (écran ≥ 1 500 px) : clic sur un PU → le panneau de droite remonte sur le calculateur et clignote ; pas de volet ni de pastille
await page.setViewportSize({width:1600,height:1000});await click('tab|offre');await click('tab|dpgf');await page.waitForSelector('#dx-vp',{timeout:15000});await wait(500);
await page.evaluate(()=>{const s=document.getElementById('dx-side');s.scrollTop=s.scrollHeight;});await wait(200);out={side0:await page.evaluate(()=>document.getElementById('dx-side').scrollTop)};
await page.click(td(12,5));await wait(250);out.flash=await page.evaluate(()=>document.getElementById('dx-calc').classList.contains('rp-flash'));await wait(900);
out.side1=await page.evaluate(()=>{const s=document.getElementById('dx-side'),c=document.getElementById('dx-calc');return {top:s.scrollTop,d:Math.round(c.getBoundingClientRect().top-s.getBoundingClientRect().top)};});out.split=await split();
out.fbar=await page.$$eval('#dx-calc .rp-fbar button',L=>L.filter(b=>b.offsetParent).length);out.h4=sp(await page.$eval('#dx-calc h4',e=>e.textContent));
await page.click(td(11,2));await wait(400);out.chip=await page.evaluate(()=>{const c=document.querySelector('#dx-vp .rp-chip');return !!(c&&!c.hidden);});out.h4b=sp(await page.$eval('#dx-calc h4',e=>e.textContent));
await shot('pc_1600_cote_a_cote.png');
console.log('15) côte à côte :',JSON.stringify(out));
C.c15=out.side0>100&&out.flash&&out.side1.d>=-2&&out.side1.d<=12&&/\bside\b/.test(out.split)&&out.fbar===0&&/ligne 12/.test(out.h4)&&!out.chip&&/ligne 11/.test(out.h4b);
// ── c13) téléphone 390 px : le calculateur en volet en bas, plein largeur ; l'outil plein écran ; rien ne déborde ; boutons ≥ 34 px
await click('dxrpshut|').catch(()=>{});await page.setViewportSize({width:390,height:844});await page.evaluate(()=>{document.getElementById('app').classList.remove('wide');});await click('tab|offre');await click('tab|dpgf');await wait(600);
await page.click(td(13,5));await wait(600);
out={split:await split(),pos:await page.$eval('#dx-calc',e=>getComputedStyle(e).position),calc:await rect('#dx-calc'),sw:await page.evaluate(()=>document.documentElement.scrollWidth),cell:await rect(td(13,5)),
  small:await page.$$eval('#dx-calc button, #dx-calc .rp-auto',L=>L.filter(b=>b.offsetParent&&b.getBoundingClientRect().height<34).map(b=>b.textContent.trim().slice(0,20)))};
await shot('tel_390_calculateur_volet.png');
await click('dxrpshut|');await click('dxrptool|');await wait(500);
out.tool=await rect('#rp-tool');out.toolSw=await page.evaluate(()=>{const b=document.getElementById('rp-body');return b?b.scrollWidth-b.clientWidth:-1;});out.sw2=await page.evaluate(()=>document.documentElement.scrollWidth);
out.small2=await page.$$eval('#rp-tool button, #rp-tool select, #rp-tool input:not([type=checkbox]):not([type=radio])',L=>L.filter(b=>b.offsetParent&&b.getBoundingClientRect().height<34).map(b=>(b.textContent||b.dataset.rp||'').trim().slice(0,20)));
await shot('tel_390_repartir_au_ml.png');await page.evaluate(()=>{const b=document.getElementById('rp-body');if(b)b.scrollTop=b.scrollHeight;});await wait(200);await shot('tel_390_repartir_apercu.png');
await click('dxrpclose|');
console.log('13) téléphone 390 px :',JSON.stringify(out));
C.c13=/\bflt\b/.test(out.split)&&out.pos==='fixed'&&out.calc.l===0&&out.calc.w===390&&Math.abs(out.calc.b-844)<=1&&out.sw<=390&&out.cell.b<=out.calc.t&&!out.small.length&&out.tool&&out.tool.w===390&&out.tool.h>=800&&out.toolSw<=0&&out.sw2<=390&&!out.small2.length;
// ── c20) tout défaire = comme avant : il ne reste que les liens faits au calculateur (3.1, 2.4), les cellules PU des liens créés par les répartitions redeviennent vides, plus de champ reps
a=await A();for(const r of (a.dpgf.reps||[]).slice()){await click('dxrpundo|'+r.id);await wait(300);}a=await A();const ed=(a.dpgf.xl.ed||{}).DPGF||{};
out={reps:a.dpgf.reps,links:a.dpgf.liens.map(L=>L.a+':'+L.comps.map(x=>x.k+'='+x.q+(x.rep?'R':'')).join('+')).join(' '),ed:['E10','E11','E12','E13','E14','E15','E27'].map(k=>k+'='+(ed[k]?ed[k].v:'-')).join(' '),keys:a.dpgf.liens.map(L=>Object.keys(L).sort().join(',')).join(' | ')};
console.log('20) tout défaire :',JSON.stringify(out));
C.c20=out.reps===undefined&&out.links==='E18:z0|soudure|dn100=40 E13:z0|soudure|dn50=15'&&/E10=- E11=- E12=- E13=[\d.]+ E14=- E15=15 E27=-/.test(out.ed)&&out.keys==='a,amt,at,by,col,comps,id,pu,q,qa,qfix,sh,u,v | a,amt,at,by,col,comps,id,pu,q,qa,qfix,sh,u,v';
C.console=logs.length===0;
const bad=Object.entries(C).filter(([k,v])=>!v).map(([k])=>k);console.log(bad.length?'RESULTAT: ECHEC '+bad.join(','):'RESULTAT: TOUT VERT');console.log(logs.length?logs:'[]');
await browser.close();
