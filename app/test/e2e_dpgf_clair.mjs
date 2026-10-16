// LOT C2 (16/10) — le DPGF « comme dans Excel » plus clair et plus rapide à remplir. Ethan : « En double écran il ne faut pas que le « DPGF dans l'autre fenêtre »
// prenne la moitié de l'écran […] trop de menus déroulants, on ne sait plus où remonter pour re-cliquer « calculer cette cellule » […] quand tout le montant d'une
// ligne est rentré il faut qu'elle soit barrée ou grisée […] Il faut que ça calcule dans le tableau les autocontrôles […] le même panier de trucs cochés […] quand je
// rentre une fois des ml, ça remette les mêmes ml dans tout ce que je coche […] « répartir au ml » incompréhensible ». Données FICTIVES (dpgf_clair_setup.mjs :
// test/fixture_prix.xlsx, test/fixture_dpgf_clair.xlsx ; test/fixture_dpgf_clair_avant.json = un DPGF travaillé avec le build d'AVANT ce lot, e79e2a).
// c0 un DPGF déjà lié (liens, répartition) s'affiche et se calcule EXACTEMENT comme avant · c1 autre écran : barre fine, calculateur à gauche + ventilation à droite,
// « Mettre et ligne suivante » suit sur l'autre écran · c2 en-tête du calculateur toujours visible (liste qui défile), liste à plat, filtre en haut · c3 « ↦ Mettre et
// ligne suivante ▶ », ◀ ▶ sans rien mettre · c4 composante tout pointée barrée, non cochable, en bas de sa zone (cochée sur SA ligne) · c5 autocontrôle par type
// (prorata des minutes, somme = autocontrôle du DN, lien {k, q, sub, x}, reste par type, un lien sur le DN entier reste juste) · c6 « ↺ Comme la ligne » (quantités
// de CETTE ligne, DN suivi) et sélection gardée (« 3 / 4 : il manque … », supprimable) · c7 les ml tapés une fois → proposés partout, modifiables · c8 « ⇶ Mettre le
// reste au ml » en un clic (phrases, résultat par DN, ce qui ne trouve pas de ligne), ↶, puis « Personnaliser… » · c9 anciens outils dans un seul pli en bas (DPGF
// collé : comme avant) · c10 barre courte, le reste dans « ⋯ » · c11 téléphone 390 px · c12 1 920 px côte à côte · console sans erreur.
// Captures : SHOTS=dossier (défaut /root/work/dc_shots).
import { chromium } from 'playwright';
import fs from 'fs';import path from 'path';import {fileURLToPath} from 'url';
import {setupAffaire} from './dpgf_clair_setup.mjs';
import {cles} from './dpgf_cles.mjs'; /* 16/10 après-midi (lot C3) : les liens enregistrent des clés stables « z:<id de zone>|… » ; K('z0|…') / U(…) pour les lire ici */
const HERE=path.dirname(fileURLToPath(import.meta.url));
const BASE=process.env.BASE||'http://localhost:8765';const SHOTS=process.env.SHOTS||'/root/work/dc_shots';try{fs.mkdirSync(SHOTS,{recursive:true});}catch(e){}
const browser=await chromium.launch({headless:true, executablePath: process.env.CHROMIUM_PATH||undefined});
const ctx=await browser.newContext({viewport:{width:1366,height:768},acceptDownloads:true});const page=await ctx.newPage();
const logs=[];const watch=p=>{p.on('pageerror',e=>logs.push('PAGEERROR: '+e.message.slice(0,300)));p.on('console',m=>{if(m.type()==='error'&&!/supabase|Failed to fetch|net::ERR|404|WebSocket|pdf\.worker|cdnjs/i.test(m.text()))logs.push(m.text().slice(0,200));});p.on('dialog',d=>d.accept().catch(()=>{}));};watch(page);
const C={};const wait=ms=>page.waitForTimeout(ms);const sp=t=>String(t||'').replace(/[\s  ]+/g,' ').trim();
const nbv=t=>{const x=parseFloat(String(t||'').replace(/[\s  €]/g,'').replace(/[−–]/g,'-').replace(',','.'));return isFinite(x)?x:NaN;};
const S=await setupAffaire(page,BASE+'/index.html',HERE);const {chg,click,td,A,NUM}=S;const {K,U,KS}=await cles(page,NUM);
const has=v=>page.evaluate(v=>!!document.querySelector(`#eq-app [data-act=af][data-v="${v}"]`),v);
const rect=s=>page.evaluate(s=>{const e=document.querySelector(s);if(!e)return null;const b=e.getBoundingClientRect();return {l:Math.round(b.left),t:Math.round(b.top),r:Math.round(b.right),b:Math.round(b.bottom),w:Math.round(b.width),h:Math.round(b.height)};},s);
const ck=async(k,on=true)=>chg(`#dx-calc input[data-dx="ck"][data-k="${K(k)}"]`,on);const sk=async(k,t,on=true)=>chg(`#dx-calc input[data-c2="sk"][data-k="${K(k)}"][data-t="${t}"]`,on);
const cq=k=>page.$eval(`#dx-calc [data-dx="cq"][data-k="${K(k)}"]`,e=>e.value).catch(()=>null);
const h4=async()=>sp(await page.$eval('#dx-calc h4',e=>e.textContent).catch(()=>''));const toast=()=>page.evaluate(()=>{const t=document.getElementById('toast');return t?t.textContent:'';});
const shot=async(name,sel,p)=>{p=p||page;try{if(sel){const el=await p.$(sel);if(el)await el.screenshot({path:path.join(SHOTS,name)});}else await p.screenshot({path:path.join(SHOTS,name)});}catch(e){console.log('(capture '+name+' : '+e.message.slice(0,80)+')');}};
const lk=(a,ad)=>(a.dpgf.liens||[]).find(L=>L.a===ad);
const vrows=()=>page.evaluate(()=>[...document.querySelectorAll('#dx-vent .dx-vt tbody tr')].map(r=>[...r.cells].map(c=>c.textContent.replace(/[\s  ]+/g,' ').trim())));
const gridTop=async()=>{await page.evaluate(()=>{document.getElementById('dx-card').scrollIntoView({block:'start'});});await wait(250);};
// le prix de vente de la composante « Autocontrôle · DN x » de la zone 1 (comme compsOf : la part du DN dans le poste, ÷ coefficient de vente)
const autoV=dn=>page.evaluate(([n,dn])=>{const T=window.TRACE.affaires;const Cc=T.calc(T.get(n));const e=Cc.etudes[0];const rows=e.r.detail.dn.rows;const W=rows.reduce((s,r)=>s+(r.auto||0),0);const r=rows.find(x=>x.dn===dn);return r&&W?e.r.postes.autoctrl.achat*r.auto/W/Cc.coef:0;},[NUM,dn]);
await page.evaluate(()=>{window.sp0=t=>String(t||'').replace(/[\s\u00A0\u202F]+/g,' ').trim();});
let a=await A();const D0=JSON.parse(JSON.stringify(a.dpgf));
console.log('0) DPGF :',a.dpgf.lignes.filter(l=>!l.section).map(l=>l.row+':'+l.n+':'+l.u+':'+l.qte).join(' '));
// ── c0) COMPATIBILITÉ : un DPGF travaillé AVANT ce lot (liens, autocontrôle du DN entier, répartition) s'affiche et se calcule exactement pareil, sans rien réécrire
const REC=JSON.parse(fs.readFileSync(path.join(HERE,'fixture_dpgf_clair_avant.json'),'utf8'));
await page.evaluate(([n,d])=>{const T=window.TRACE.affaires;const a=T.get(n);T.set(n,{dpgf:Object.assign({},a.dpgf,d)});},[NUM,REC.dpgf]);await click('tab|offre');await click('tab|dpgf');await page.waitForSelector('#dx-vp',{timeout:15000});await wait(900);
let out=await page.evaluate(()=>{const sp=t=>String(t||'').replace(/[\s  ]+/g,' ').trim();
  return {vsum:sp((document.querySelector('#dx-vent .dx-vsum')||{}).textContent),rows:[...document.querySelectorAll('#dx-vent .dx-vt tbody tr')].map(r=>[...r.cells].map(c=>sp(c.textContent))),
    lkr:[...document.querySelectorAll('#dx-vent .dx-lkr')].map(x=>sp(x.textContent)),reps:[...document.querySelectorAll('#dx-vent .rp-rep')].map(x=>sp(x.querySelector('b').textContent)+' | '+sp(x.querySelector('.dim').textContent).replace(/ · \d\d\/\d\d\/\d{4}.*$/,'')),
    cells:Object.fromEntries([6,7,10,11,12,13,14,17,18,19,22,23,24,25,28].map(r=>[r,[5,6].map(c=>sp((document.querySelector(`#dx-vp td[data-r="${r}"][data-c="${c}"]`)||{}).textContent))])),
    lkCls:Object.fromEntries([6,10,17,25].map(r=>[r,((document.querySelector(`#dx-vp td[data-r="${r}"][data-c="5"]`)||{}).className||'').split(' ').filter(c=>/^dx-lk/.test(c)).join(' ')])),
    taches:[...document.querySelectorAll('#eq-app .cm-tache')].map(x=>(x.classList.contains('done')?'✓ ':'○ ')+sp(x.textContent)),stats:[...document.querySelectorAll('#eq-app .ac-stat')].slice(0,3).map(x=>sp(x.textContent))};});
const R0=REC.disp;const noBtn=t=>t.replace(/⇶.*$/,'').trim();const sameRows=out.rows.length===R0.rows.length&&out.rows.every((r,i)=>{const o=R0.rows[i];return r.length===o.length&&r.every((c,j)=>j===0&&/^Autocontrôle interne/.test(o[0])?c.startsWith(o[0]):c===o[j]);});
await page.click(td(10,5));await wait(500);out.calcE10=sp(await page.$eval('#dx-cres',e=>e.textContent)).replace(/↦.*$/,'').trim();a=await A();
out.noWrite=JSON.stringify(a.dpgf.liens)===JSON.stringify(REC.dpgf.liens)&&JSON.stringify(a.dpgf.reps)===JSON.stringify(REC.dpgf.reps)&&JSON.stringify(a.dpgf.xl)===JSON.stringify(REC.dpgf.xl);
out.auto100=await page.evaluate(k=>[...document.querySelectorAll(`#dx-calc .c2-sub[data-k="${k}"]`)].map(x=>x.dataset.t+':'+(x.classList.contains('c2-done')?'done':'')+':'+(x.querySelector('input').disabled?'dis':'')),K('z0|autoctrl|dn100'));
out.par100=await page.evaluate(k=>{const r=document.querySelector(`#dx-calc .dx-cr[data-k="${k}"]`);return r?{on:r.classList.contains('on'),full:r.classList.contains('full')}:null;},K('z0|autoctrl|dn100'));
console.log('c0) compatibilité :',JSON.stringify({vsum:out.vsum,E10:out.calcE10,noWrite:out.noWrite,sameRows,auto100:out.auto100,par100:out.par100,lkr:out.lkr.length,reps:out.reps}));
C.c0=noBtn(out.vsum)===noBtn(R0.vsum)&&sameRows&&JSON.stringify(out.lkr)===JSON.stringify(R0.lkr)&&JSON.stringify(out.reps)===JSON.stringify(R0.reps)&&JSON.stringify(out.cells)===JSON.stringify(R0.cells)&&JSON.stringify(out.lkCls)===JSON.stringify(R0.lkCls)
  &&JSON.stringify(out.taches)===JSON.stringify(R0.taches)&&JSON.stringify(out.stats)===JSON.stringify(R0.stats)&&out.calcE10===R0.calcE10&&out.noWrite
  &&out.par100&&out.par100.on&&out.par100.full&&out.auto100.length===3&&out.auto100.every(x=>/:dis$/.test(x)); /* E10 a pris l'autocontrôle DN 100 entier (et la répartition le reste) : ses types sont « compris », non cochables */
await shot('pc_1366_compat_avant_lot.png');
// on repart du DPGF juste importé (sans lien)
await page.evaluate(([n,d])=>{window.TRACE.affaires.set(n,{dpgf:d});},[NUM,D0]);await click('tab|offre');await click('tab|dpgf');await page.waitForSelector('#dx-vp',{timeout:15000});await wait(700);
if(await page.evaluate(()=>/\bflt\b/.test((document.querySelector('#dx-card .dx-split')||{}).className||'')))await click('dxrpshut|');
// ── c10) barre courte : ↶ ↷, 🧮, ⇶ Mettre le reste au ml, ⧉, zoom, « ⋯ » (lignes, affichage, outil détaillé, détail des prix unitaires) ; en-tête : ⬇ DPGF pour le dossier
out=await page.evaluate(()=>{const bar=document.querySelector('#dx-card .dx-bar');const vis=[...bar.children].filter(x=>x.matches('button,details,.dx-zv')&&x.checkVisibility());
  return {vis:vis.map(x=>x.matches('details')?'⋯':x.textContent.trim()),menu:[...bar.querySelectorAll('.c2-menu [data-v]')].map(b=>b.dataset.v),head:[...document.querySelectorAll('#dx-card .dx-head [data-v]')].map(b=>b.dataset.v),menuShown:bar.querySelector('.c2-menu').checkVisibility()};});
await page.click('#dx-card .c2-more>summary');await wait(200);out.open=await rect('#dx-card .c2-menu');await shot('pc_1366_menu_plus.png');await page.click('#dx-card .dx-head h3');await wait(200);out.closed=!await page.evaluate(()=>document.querySelector('#dx-card .c2-more').open);
console.log('c10) barre :',JSON.stringify(out));
C.c10=out.vis.join(' ')==='↶ ↷ 🧮 Calculer cette cellule ⇶ Mettre le reste au ml ⧉ Autre écran − 100 % + ⋯'&&['dxins|','dxins|up','dxdel|','dxlay|side','dxlay|stack','dxfull|','dxrptool|','dxpu|'].every(v=>out.menu.includes(v))&&!out.menuShown&&out.head.join()==='dxexport|'&&out.open&&out.open.r<=1366&&out.open.h>200&&out.closed;
// ── c2) le calculateur : clic sur le PU de la 3.1 (40 u) → en-tête collé en haut (n°, désignation, quantité, unité, Σ, PU, ↦ Mettre, ↦ Mettre et ligne suivante ▶, ◀ ▶),
//    liste à plat (titres de zone, aucun pli à ouvrir), filtre en haut, mini-récap ; les boutons restent visibles quand la liste défile
await gridTop();await page.click(td(17,5));await wait(600);
out={h4:await h4(),ln:sp(await page.$eval('#dx-calc .c2-ln',e=>e.textContent)),q:await page.$eval('#dx-calc [data-dx="q"]',e=>e.value),det:await page.$$eval('#dx-calc details',L=>L.length),zh:await page.$$eval('#dx-calc .c2-zh',L=>L.map(x=>x.textContent.split('·')[0].trim())),
  rc:sp(await page.$eval('#dx-calc .rp-ch',e=>e.textContent)),fTop:(await rect('#dx-calc [data-dx="cf"]')).t<(await rect('#dx-cl')).t,nav:await page.$$eval('#dx-calc .c2-nav button',L=>L.map(b=>b.dataset.v).join())};
await page.evaluate(()=>{const c=document.getElementById('dx-cl');c.scrollTop=c.scrollHeight;const k=document.getElementById('dx-calc');k.scrollTop=k.scrollHeight;});await wait(300);
const visBtn=v=>page.evaluate(v=>{const b=document.querySelector(`#dx-calc [data-v="${v}"]`);if(!b)return false;const r=b.getBoundingClientRect();const x=r.left+r.width/2,y=r.top+r.height/2;if(y<0||y>innerHeight||x<0||x>innerWidth)return false;const e=document.elementFromPoint(x,y);return !!e&&(e===b||b.contains(e));},v);
out.vis=[await visBtn('dxput|'),await visBtn('dxc2next|'),await visBtn('dxc2go|1'),await page.evaluate(()=>{const b=document.querySelector('#dx-calc .c2-top .c2-shut');return !!b&&b.checkVisibility();})];out.scrolled=await page.evaluate(()=>document.getElementById('dx-calc').scrollTop>50); /* le volet défile en entier (liste comprise), l'en-tête reste collé en haut */
await shot('pc_1366_calculateur_liste_defilee.png');
console.log('c2) calculateur :',JSON.stringify(out));
/* 16/10 après-midi (lot C3, changement voulu) : 🏗 Installations en tête, les zones, ✔ Autocontrôles en dernier ; chaque titre replie son groupe (▾) */
C.c2=/ligne 17/.test(out.h4)&&/3\.1 Soudure bout à bout DN 100 en fouille/.test(out.ln)&&/Qté u✕$/.test(out.ln)&&out.q==='40'&&out.det===0&&out.zh.join()==='▾ 🏗 Installations,▾ Zone 1,▾ Zone 2,▾ ✔ Autocontrôles'&&/pointé 0 %/.test(out.rc)&&/reste à placer/.test(out.rc)&&out.fTop&&out.nav==='dxc2go|-1,dxc2go|1'&&out.vis.every(Boolean)&&out.scrolled;
// ── c3) « ↦ Mettre et ligne suivante ▶ » (méthode d'Ethan, 1) : 3.1 à l'unité → cocher les soudures DN 100 propose 40 → la 3.2 s'ouvre ; ◀ ▶ sans rien mettre
await page.evaluate(()=>{document.getElementById('dx-calc').scrollTop=0;});await ck('z0|soudure|dn100');out={take:await cq('z0|soudure|dn100'),res:sp(await page.$eval('#dx-cres',e=>e.textContent))};
await page.focus(KS('#dx-calc [data-dx="cq"][data-k="z0|soudure|dn100"]'));await page.keyboard.press('Control+Enter');await wait(600); /* Ctrl+Entrée = « ↦ Mettre et ligne suivante ▶ » */a=await A();const L31=lk(a,'E17');
out.L31=L31&&{comps:JSON.stringify(L31.comps),pu:L31.pu,keys:Object.keys(L31).sort().join(',')};out.h4=await h4();out.sel=await page.evaluate(n=>{const s=window.TRACE&&document.querySelector('#dx-vp td.dx-on');return s?s.dataset.r+':'+s.dataset.c:'';},NUM);out.split=await page.evaluate(()=>document.querySelector('#dx-card .dx-split').className);
out.cellVis=await page.evaluate(()=>{const c=document.querySelector('#dx-vp td.dx-on'),vp=document.getElementById('dx-vp');if(!c)return false;const r=c.getBoundingClientRect(),v=vp.getBoundingClientRect();return r.top>=v.top&&r.bottom<=v.bottom;});
const n0=a.dpgf.liens.length;await click('dxc2go|-1');await wait(400);out.back=await h4();out.backOn=await page.$$eval('#dx-calc .dx-cr.on',L=>L.map(x=>x.dataset.k).join());await click('dxc2go|1');await wait(300);await click('dxc2go|1');await wait(400);out.fwd=await h4();a=await A();out.nLinks=[n0,a.dpgf.liens.length];
console.log('c3) mettre et ligne suivante :',JSON.stringify(out));
C.c3=out.take==='40'&&/= 314,29 € \/ u/.test(out.res)&&out.L31&&U(out.L31.comps)==='[{"k":"z0|soudure|dn100","q":40}]'&&out.L31.comps!==U(out.L31.comps)&&out.L31.pu===314.29&&out.L31.keys==='a,amt,at,by,col,comps,id,pu,q,qa,qfix,sh,u,v'&&/ligne 18/.test(out.h4)&&out.sel==='18:5'&&/\bflt\b/.test(out.split)&&out.cellVis
  &&/ligne 17 🔗 lié/.test(out.back)&&U(out.backOn)==='z0|soudure|dn100'&&/ligne 19/.test(out.fwd)&&out.nLinks[0]===1&&out.nLinks[1]===1; /* (lot C3) : la clé enregistrée est la clé stable de la zone */
// ── c4) tout pointé : la 3.3 prend toutes les purges ; sur la ligne suivante, « Purges · DN 32 » est barrée, grisée, non cochable, en bas de la zone 1, « ✓ tout pointé · ligne 3.3 » ;
//    sur la 3.3 elle-même, elle reste cochée et modifiable ; une composante en partie pointée dit son reste
await ck('z0|purges');out={take:await cq('z0|purges')};await click('dxc2next|');await wait(500);out.h4=await h4();
/* (lot C3) : les lignes vivent dans leur groupe repliable (.c3-g) : « en bas de la zone 1 » = en bas de son groupe */
out.row=await page.evaluate(k=>{const r=document.querySelector(`#dx-calc .dx-cr[data-k="${k}"]`);if(!r)return null;const nm=r.querySelector('.c2-nm');const g=r.closest('.c3-g');const rows=[...g.querySelectorAll('.dx-cr')];const i=rows.indexOf(r);
  const after=rows.slice(i+1);return {done:r.classList.contains('c2-done'),dis:r.querySelector('input').disabled,txt:r.querySelector('.c2-dn')?r.querySelector('.c2-dn').textContent:'',strike:getComputedStyle(nm).textDecorationLine,color:getComputedStyle(nm).color,afterNotDone:after.filter(x=>!x.classList.contains('c2-done')).length,grp:/Zone 1/.test(g.querySelector('.c3-gh').textContent)};},K('z0|purges'));
out.sou=sp(await page.$eval(KS('#dx-calc .dx-cr[data-k="z0|soudure|dn100"] small'),e=>e.textContent));await click('dxc2go|-1');await wait(400);
out.own=await page.evaluate(k=>{const r=document.querySelector(`#dx-calc .dx-cr[data-k="${k}"]`);return r?{on:r.classList.contains('on'),done:r.classList.contains('c2-done'),dis:r.querySelector('input').disabled,q:(r.querySelector('[data-dx="cq"]')||{}).value}:null;},K('z0|purges'));
console.log('c4) tout pointé :',JSON.stringify(out));
C.c4=out.take==='3'&&/ligne 22/.test(out.h4)&&out.row&&out.row.done&&out.row.dis&&/✓ tout pointé · ligne 3\.3/.test(out.row.txt)&&/line-through/.test(out.row.strike)&&out.row.afterNotDone===0&&out.row.grp&&/reste 80 soud\. ≈ 400 ml/.test(out.sou)&&out.own&&out.own.on&&!out.own.done&&!out.own.dis&&out.own.q==='3';
await click('dxc2go|1');await wait(300);await page.evaluate(k=>{const r=document.querySelector(`#dx-calc .dx-cr[data-k="${k}"]`);if(r){r.scrollIntoView({block:'center'});}},K('z0|purges'));await wait(200);await shot('pc_1366_tout_pointe_barre.png');
// ── c5) AUTOCONTRÔLE PAR TYPE (méthode d'Ethan, 3) : sous « Autocontrôle · DN 100 » une ligne par type coché dans la zone (dépression, itopo, pression ; la zone 2 n'en a pas) ;
//    4.2 « Contrôle Itopo DN 100 · 120 u » : Itopo seul → lien {k, q = 120 × 2 ÷ 10, sub, x} ; 4.3 dépression ; 2.2 prend le DN entier : il ne reste que la pression
const A100=await autoV(100);await click('dxc2go|1');await wait(400);out={h4:await h4()};
out.subs=(await page.evaluate(()=>[...document.querySelectorAll('#dx-calc .c2-sub')].map(x=>x.dataset.k+'#'+x.dataset.t))).map(U);
out.txt=await page.evaluate(k=>[...document.querySelectorAll(`#dx-calc .c2-sub[data-k="${k}"] .c2-nm`)].map(x=>x.textContent.replace(/[\s  ]+/g,' ').trim()),K('z0|autoctrl|dn100'));
out.amts=out.txt.map(t=>nbv((t.match(/= [\d,]+ (?:h|min) · ([\d\s  ]+) €/)||[])[1]));out.par=nbv(await page.$eval(KS('#dx-calc .dx-cr[data-k="z0|autoctrl|dn100"] .m'),e=>e.textContent));
await sk('z0|autoctrl|dn100','itopo');out.take=await page.$eval(KS('#dx-calc [data-c2="sq"][data-k="z0|autoctrl|dn100"][data-t="itopo"]'),e=>e.value).catch(()=>null);out.res=sp(await page.$eval('#dx-cres',e=>e.textContent));
await page.evaluate(kk=>{const r=document.querySelector(`#dx-calc .dx-cr[data-k="${kk}"]`);if(r)r.scrollIntoView({block:'start'});const k=document.getElementById('dx-calc');const t=k.querySelector('.c2-top');if(r&&t)k.scrollTop-=t.offsetHeight+30;},K('z0|autoctrl|dn100'));await wait(200);await shot('pc_1366_autocontrole_par_type.png');await click('dxc2next|');await wait(500);a=await A();const L42=lk(a,'E23');out.L42=L42&&L42.comps;out.pu42=L42&&L42.pu;
out.h4b=await h4();out.itopoDone=await page.evaluate(k=>{const r=document.querySelector(`#dx-calc .c2-sub[data-k="${k}"][data-t="itopo"]`);return r?{done:r.classList.contains('c2-done'),dis:r.querySelector('input').disabled,t:(r.querySelector('.c2-dn')||{}).textContent||''}:null;},K('z0|autoctrl|dn100'));
out.parRest=sp(await page.$eval(KS('#dx-calc .dx-cr[data-k="z0|autoctrl|dn100"] small'),e=>e.textContent));
await sk('z0|autoctrl|dn100','depression');out.take2=await page.$eval(KS('#dx-calc [data-c2="sq"][data-k="z0|autoctrl|dn100"][data-t="depression"]'),e=>e.value).catch(()=>null);await click('dxput|');await wait(400);a=await A();const L43=lk(a,'E24');out.L43=L43&&L43.comps;
// 2.2 (180 ml) : l'autocontrôle DN 100 entier → d'office la part de ses ml (36 manch.) = ce qui reste (la pression) ; les liens par type ne bougent pas
await gridTop();await page.click(td(11,5));await wait(500);await ck('z0|autoctrl|dn100');out.take3=await cq('z0|autoctrl|dn100');await click('dxput|');await wait(400);a=await A();const L22=lk(a,'E11');
out.sum=[lk(a,'E23'),lk(a,'E24'),L22].reduce((s,L)=>s+(L?L.amt:0),0);out.A100=A100;out.pu42b=lk(a,'E23').pu;
await page.click(td(23,5));await wait(500);out.again=await page.evaluate(k=>({rst:sp0((document.querySelector(`#dx-calc .c2-sub.on[data-k="${k}"][data-t="itopo"] .dx-rst`)||{}).textContent),over:document.querySelectorAll('#dx-calc .c2-sub.over,#dx-calc .dx-cr.over').length,pres:!!document.querySelector(`#dx-calc .c2-sub.c2-done[data-k="${k}"][data-t="pression"]`)}),K('z0|autoctrl|dn100'));
await page.click(td(25,5));await wait(500);out.full100=await page.evaluate(k=>{const r=document.querySelector(`#dx-calc .dx-cr[data-k="${k}"]`);return r?{done:r.classList.contains('c2-done'),subsDone:[...document.querySelectorAll(`#dx-calc .c2-sub[data-k="${k}"]`)].every(x=>x.classList.contains('c2-done'))}:null;},K('z0|autoctrl|dn100'));
out.vent=await page.evaluate(()=>{const r=[...document.querySelectorAll('#dx-vent .dx-vt tbody tr')].find(r=>/^Autocontrôle interne/.test(r.cells[0].textContent));return r?r.cells[0].textContent.replace(/[\s  ]+/g,' '):'';});
out.stale=await page.evaluate(()=>!!document.querySelector('#dx-vent .dx-stale'));
console.log('c5) autocontrôle par type :',JSON.stringify(out));
const parts=out.amts.reduce((s,x)=>s+x,0);
C.c5=/ligne 23/.test(out.h4)&&out.subs.filter(x=>/^z0\|autoctrl\|dn100#/.test(x)).join()==='z0|autoctrl|dn100#depression,z0|autoctrl|dn100#itopo,z0|autoctrl|dn100#pression'&&!out.subs.some(x=>/^z1/.test(x))
  &&/^Itopo · DN 100 · 120 manch\. × 2 min = 4 h · [\d ]+ € · [\d,]+ € \/ manch\.$/.test(out.txt[1])&&/^Dépression · DN 100 · 120 manch\. × 5 min = 10 h/.test(out.txt[0])&&Math.abs(parts-out.par)<=2&&Math.abs(out.amts[1]-Math.round(A100*0.2))<=1
  &&out.take==='120'&&out.L42&&out.L42.length===1&&U(out.L42[0].k)==='z0|autoctrl|dn100'&&out.L42[0].sub==='itopo'&&out.L42[0].x===120&&Math.abs(out.L42[0].q-24)<1e-9&&Math.abs(out.pu42-Math.round(A100*0.2/120*100)/100)<0.006
  &&/ligne 24/.test(out.h4b)&&out.itopoDone&&out.itopoDone.done&&out.itopoDone.dis&&/✓ tout pointé · ligne 4\.2/.test(out.itopoDone.t)&&/reste 96 manch\./.test(out.parRest)
  &&out.take2==='120'&&out.L43&&out.L43[0].sub==='depression'&&Math.abs(out.L43[0].q-60)<1e-9&&out.take3==='36'&&L22&&U(JSON.stringify(L22.comps))==='[{"k":"z0|autoctrl|dn100","q":36}]'&&Math.abs(out.sum-A100)<0.03&&out.pu42b===out.pu42
  &&out.again.rst==='✓ tout pointé'&&out.again.over===0&&out.again.pres&&out.full100&&out.full100.done&&out.full100.subsDone&&/dont Dépression [\d ]+ € · Itopo [\d ]+ € · Pression [\d ]+ €/.test(out.vent)&&!out.stale;
// ── c6) LE MÊME PANIER (méthode d'Ethan, 2) : 2.1 → amené, conteneur, épreuve, étiquettes (zone 1) = « 💾 Garder cette sélection » « Installations » ; + soudures / manchons DN 100 ;
//    2.2 : « ↺ Comme la ligne 2.1 » (180 ml) ; puce « Installations · 4 / 4 ✓ » ; décochée une → « 3 / 4 : il manque … » ; la puce recoche ; 2.3 (DN 80) : le DN suit ; ✕ supprime
await gridTop();await page.click(td(10,5));await wait(500);const INST=['z0|amene','z0|conteneur','z0|epreuve','z0|etiquettes'];for(const k of INST)await ck(k);
out={takes:await Promise.all(INST.map(cq))};await click('dxc2save|1');await wait(200);await page.fill('#dx-calc [data-c2="snom"]','Installations');await click('dxc2savok|');await wait(400);a=await A();
out.sels=(a.dpgf.sels||[]).map(s=>s.nom+':'+U(s.ks.join('+')));out.selKeys=Object.keys((a.dpgf.sels||[])[0]||{}).sort().join(',');
await ck('z0|soudure|dn100');await ck('z0|manchons|dn100');out.t100=[await cq('z0|soudure|dn100'),await cq('z0|manchons|dn100')];await click('dxc2next|');await wait(500);
out.h4=await h4();out.likeBtn=sp(await page.$eval('#dx-calc [data-v^="dxc2like|"]',e=>e.textContent).catch(()=>''));out.chip0=sp(await page.$eval('#dx-calc .c2-chip .c2-cb',e=>e.textContent).catch(()=>''));
await page.click('#dx-calc [data-v^="dxc2like|"]');await wait(400);out.on=U(await page.$$eval('#dx-calc .dx-cr.on',L=>L.map(x=>x.dataset.k+'='+x.querySelector('[data-dx="cq"]').value).sort().join(' ')));out.toast=await toast();
out.chip1=sp(await page.$eval('#dx-calc .c2-chip .c2-cb',e=>e.textContent));await ck('z0|etiquettes',false);out.chip2=sp(await page.$eval('#dx-calc .c2-chip .c2-cb',e=>e.textContent));out.miss=await page.$eval('#dx-calc .c2-chip',e=>e.classList.contains('miss'));
await shot('pc_1366_panier_il_manque.png');await page.click('#dx-calc .c2-chip .c2-cb');await wait(400);out.chip3=sp(await page.$eval('#dx-calc .c2-chip .c2-cb',e=>e.textContent));out.et=await cq('z0|etiquettes');
await click('dxc2next|');await wait(500);out.h4c=await h4();await page.click('#dx-calc [data-v^="dxc2like|"]');await wait(400);out.on80=U(await page.$$eval('#dx-calc .dx-cr.on',L=>L.map(x=>x.dataset.k).sort().join(' ')));out.toast80=await toast();
await shot('pc_1366_comme_la_ligne.png');await click('dxcclr|');out.cleared=await page.$$eval('#dx-calc .dx-cr.on',L=>L.length);
await click('dxc2seldel|'+(a.dpgf.sels||[])[0].id);await wait(300);a=await A();out.selsAfter=a.dpgf.sels;out.chipGone=!await page.$('#dx-calc .c2-chip');
console.log('c6) même panier :',JSON.stringify(out));
/* 2.1 : soudures DN 100 = le reste (80 : la 3.1 en a pris 40), manchons = la part de ses ml (84) ; 2.2 (déjà liée : l'autocontrôle DN 100, c5) : tout reprend 180 ml, sauf les
   soudures DN 100 (plus rien) ; 2.3 copie la 2.2 : DN 100 → DN 80 (autocontrôle et manchons DN 80) */
C.c6=out.takes.every(x=>x==='420')&&out.sels.join()==='Installations:z0|amene+z0|conteneur+z0|epreuve+z0|etiquettes'&&out.selKeys==='at,by,id,ks,nom'&&out.t100.join()==='80,84'&&/ligne 11/.test(out.h4)&&out.likeBtn==='↺ Comme la ligne 2.1'
  &&/^Installations · 0 \/ 4 : il manque/.test(out.chip0)&&out.on==='z0|amene=180 z0|autoctrl|dn100=36 z0|conteneur=180 z0|epreuve=180 z0|etiquettes=180 z0|manchons|dn100=36'&&/5 cases cochées/.test(out.toast)&&/déjà tout pointé : Soudure/.test(out.toast)
  &&out.chip1==='Installations · 4 / 4 ✓'&&/^Installations · 3 \/ 4 : il manque Étiquettes/.test(out.chip2)&&out.miss&&out.chip3==='Installations · 4 / 4 ✓'&&out.et==='180'
  &&/ligne 12/.test(out.h4c)&&out.on80==='z0|amene z0|autoctrl|dn80 z0|conteneur z0|epreuve z0|etiquettes z0|manchons|dn80'&&/DN 100 → DN 80/.test(out.toast80)&&out.cleared===0&&out.selsAfter===undefined&&out.chipGone;
// ── c7) LES ML UNE FOIS : sur une ligne au forfait (5.1), 60 ml tapés pour les soudures DN 50 → proposés pour les manchons DN 50, l'épreuve de la zone 2 ; modifiables ;
//    une ligne au ml (2.4, 120 ml) : ses ml d'office
await gridTop();await page.click(td(28,5));await wait(500);await ck('z0|soudure|dn50');out={t0:await cq('z0|soudure|dn50')};
await page.fill(KS('#dx-calc [data-rp="cqml"][data-k="z0|soudure|dn50"]'),'60');await wait(150);out.t1=await cq('z0|soudure|dn50');await page.dispatchEvent(KS('#dx-calc [data-rp="cqml"][data-k="z0|soudure|dn50"]'),'change');await wait(300);
await ck('z0|manchons|dn50');await ck('z1|epreuve');out.m=[await cq('z0|manchons|dn50'),await page.$eval(KS('#dx-calc [data-rp="cqml"][data-k="z0|manchons|dn50"]'),e=>e.value),await cq('z1|epreuve')];out.hint=sp(await page.$eval('#dx-calc .c2-mlh',e=>e.textContent).catch(()=>''));
await page.fill(KS('#dx-calc [data-dx="cq"][data-k="z1|epreuve"]'),'50');await page.dispatchEvent(KS('#dx-calc [data-dx="cq"][data-k="z1|epreuve"]'),'change');await wait(300);out.ep=await cq('z1|epreuve');await click('dxcclr|');
await gridTop();await page.click(td(13,5));await wait(500);await ck('z0|soudure|dn50');out.l24=[await cq('z0|soudure|dn50'),await page.$eval(KS('#dx-calc [data-rp="cqml"][data-k="z0|soudure|dn50"]'),e=>e.value)];await click('dxcclr|');
console.log('c7) ml une fois :',JSON.stringify(out));
C.c7=out.t0==='30'&&out.t1==='9'&&out.m.join()==='9,60,60'&&/60 ml proposés/.test(out.hint)&&out.ep==='50'&&out.l24.join()==='18,120';
// ── c8) « ⇶ Mettre le reste au ml » (méthode d'Ethan, 4) : une fenêtre courte, en phrases, résultat par DN, ce qui ne trouve pas de ligne ; un clic ; ↶ ; puis « Personnaliser… »
a=await A();const nL=a.dpgf.liens.length;await click('dxrpsimple|');await wait(500);
out={txt:sp(await page.$eval('#rp-simple',e=>e.textContent)),dns:await page.$$eval('#rp-simple .c2r-dn',L=>L.map(x=>x.textContent.replace(/[\s  ]+/g,' ').trim())),btns:await page.$$eval('#rp-simple .rp-btns button',L=>L.map(b=>b.textContent.trim())),dlg:await rect('#rp-simple')};
await shot('pc_1366_reste_au_ml.png');await chg('#rp-simple [data-rp="sorph"]',true);out.orph=sp(await page.$eval('#rp-simple',e=>e.textContent));await chg('#rp-simple [data-rp="sorph"]',false);
await click('dxrpsimpleok|');await wait(500);a=await A();const R=(a.dpgf.reps||[])[0];out.rep=R&&{nom:R.nom,mode:R.mode,lignes:R.lignes.join(),com:JSON.stringify(R.com),orphan:R.orphan};out.closed=!await page.$('#rp-simple');
out.vsum=sp(await page.$eval('#dx-vent .dx-vsum',e=>e.textContent));out.pus=['E10','E11','E12','E13','E14'].map(x=>{const L=lk(a,x);return L?L.pu:null;});out.nL=[nL,a.dpgf.liens.length];
out.repRow=sp(await page.$eval('#dx-vent .rp-rep',e=>e.textContent).catch(()=>''));
await click('dxundo|');await wait(400);a=await A();out.undo=[(a.dpgf.reps||[]).length,a.dpgf.liens.length];await click('dxredo|');await wait(400);a=await A();out.redo=(a.dpgf.reps||[]).length;
await click('dxrpsimple|');await wait(400);out.nothing=sp(await page.$eval('#rp-simple',e=>e.textContent).catch(()=>''));await click('dxrpsimplecustom|');await wait(500);
out.tool=!!await page.$('#rp-tool');out.toolKs=await page.$$eval('#rp-tool input[data-rp="ck"]:checked',L=>L.length);out.simpleGone=!await page.$('#rp-simple');await click('dxrpclose|');
console.log('c8) reste au ml :',JSON.stringify(out));
C.c8=/Tout ce qui n'est pas encore pointé \([\d ]+ €\) va sur les lignes au ml : soudures, manchons et autocontrôles d'un DN sur les lignes de ce DN, le reste \(installations, épreuves…\) au prorata des ml de toutes les lignes/.test(out.txt)
  &&out.dns.some(x=>/^DN 100 : \+ [\d ,]+ € \/ ml sur 2 lignes/.test(x))&&out.dns.some(x=>/^DN 50 : \+ [\d ,]+ € \/ ml sur 2 lignes/.test(x))&&/ne trouve pas de ligne/.test(out.txt)&&/DN 40 : aucune ligne au ml de ce DN/.test(out.txt)
  &&out.btns.join('|')==='Annuler|Personnaliser…|⇶ Mettre le reste au ml'&&!/ne trouve pas de ligne/.test(out.orph)&&out.dlg&&out.dlg.h<760
  &&out.rep&&out.rep.nom==='Reste au ml'&&out.rep.mode==='dn'&&out.rep.lignes==='E10,E11,E12,E13,E14'&&out.rep.com==='{"mode":"prorata","ligne":null}'&&out.rep.orphan===false&&out.closed&&out.pus.every(x=>x>0)&&/Reste au ml/.test(out.repRow)
  &&out.undo[0]===0&&out.undo[1]===out.nL[0]&&out.redo===1&&out.tool&&out.toolKs>0&&out.simpleGone;
// ── c1) ⧉ AUTRE ÉCRAN : ici une barre fine (plus de grand cadre), le calculateur puis la ventilation DESSOUS (lot C3), sur toute la largeur ;
//    touché là-bas → calculé ici ; « Mettre et ligne suivante » sélectionne la ligne suivante LÀ-BAS
await gridTop();const [pop]=await Promise.all([ctx.waitForEvent('page'),click('dxpop|')]);watch(pop);await wait(900);
out={grid:await page.evaluate(()=>!!document.querySelector('#dx-card .dx-grid')||!!document.getElementById('dx-vp')),bar:await rect('#c2-popbar'),barTxt:sp(await page.$eval('#c2-popbar',e=>e.textContent).catch(()=>'')),calc:await rect('#dx-calc'),vent:await rect('#dx-vent'),card:await rect('#dx-card')};
await pop.click('#dx-vp td[data-r="18"][data-c="5"]');await wait(500);out.h4=await h4();await shot('pc_1366_autre_ecran_principal.png');
await page.evaluate(()=>{document.getElementById('homeBody').scrollTop+=700;});await wait(300);out.calc2=await rect('#dx-calc');out.hb=await rect('#homeBody');out.vent2=await rect('#dx-vent');
/* 16/10 après-midi (lot C3, changement voulu) : la ventilation SOUS le calculateur ; descendu sur la ventilation, le bouton flottant « 🧮 Calculer » ramène le calculateur */
out.fab=await page.evaluate(()=>{const f=document.querySelector('#dx-card .c3-fab');return !!f&&f.checkVisibility()&&!f.classList.contains('c3-off');});await click('dxc3calc|');await wait(900);out.calc3=await rect('#dx-calc');out.fab2=await page.evaluate(()=>{const f=document.querySelector('#dx-card .c3-fab');return !!f&&f.checkVisibility();});
await click('dxc2go|1');await wait(600);out.popSel=await pop.evaluate(()=>{const c=document.querySelector('#dx-vp td.dx-on');const vp=document.getElementById('dx-vp');if(!c)return null;const r=c.getBoundingClientRect(),v=vp.getBoundingClientRect();return {rc:c.dataset.r+':'+c.dataset.c,vis:r.top>=v.top&&r.bottom<=v.bottom};});out.h4b=await h4();
await shot('pc_1366_autre_ecran_dpgf.png',null,pop);
await pop.evaluate(()=>document.querySelector('[data-v="dxpopclose|"]').click());await wait(800);out.back=await page.evaluate(()=>!!document.getElementById('dx-vp'));
console.log('c1) autre écran :',JSON.stringify(out));
C.c1=!out.grid&&out.bar&&out.bar.h<=48&&/⧉ DPGF ouvert sur l'autre écran/.test(out.barTxt)&&/↩ Ramener ici/.test(out.barTxt)&&out.calc&&out.vent&&out.vent.t>=out.calc.b-2&&out.calc.w>=0.9*out.card.w&&out.vent.w>=0.9*out.card.w
  &&/ligne 18/.test(out.h4)&&out.calc2.b<out.hb.t+60&&out.vent2.t<out.vent.t-300&&out.fab&&out.calc3.t>=out.hb.t-1&&out.calc3.t<=out.hb.t+60&&!out.fab2&&out.popSel&&out.popSel.rc==='19:5'&&out.popSel.vis&&/ligne 19/.test(out.h4b)&&out.back;
// ── c9) LES ANCIENS OUTILS : un seul pli fermé tout en bas « 🗄 Anciens outils (avant le DPGF comme dans Excel) » (bordereau simplifié, atelier : rien de supprimé) ;
//    un DPGF collé (sans fichier Excel) : l'écran reste comme avant
out=await page.evaluate(()=>{const o=document.querySelector('#eq-app details.c2-old');const kids=[...document.querySelectorAll('#eq-app > *, #eq-app .ac-body > *')];const last=[...o.parentElement.children].pop();
  return {o:!!o,open:o&&o.open,sum:o?o.querySelector('summary').textContent.replace(/\s+/g,' ').trim():'',inner:o?[...o.querySelectorAll('details.dx-old')].map(d=>d.dataset.dxdet+':'+d.open).join():'',last:last===o,afterCtrl:!!o&&(()=>{let p=o.previousElementSibling;return !!p&&/Contrôles avant export/.test(p.textContent);})(),
    hint:o?o.querySelector('.c2-oldh').textContent:'',outside:[...document.querySelectorAll('#eq-app details.dx-old')].filter(d=>!d.closest('.c2-old')).length};});
await page.evaluate(()=>{const o=document.querySelector('#eq-app details.c2-old');o.scrollIntoView({block:'center'});o.open=true;});await wait(300);await shot('pc_1366_anciens_outils.png','#eq-app details.c2-old');
await page.evaluate(()=>{document.querySelector('#eq-app details.c2-old').open=false;});
console.log('c9) anciens outils :',JSON.stringify(out));
const okOld=out.o&&!out.open&&/^🗄 Anciens outils \(avant le DPGF comme dans Excel\)/.test(out.sum)&&out.inner==='bord:false,atelier:false'&&out.last&&out.afterCtrl&&/bordereau simplifié/.test(out.hint)&&/atelier/.test(out.hint)&&out.outside===0;
// DPGF collé dans une autre affaire : bordereau et atelier comme avant, pas de pli « Anciens outils »
await click('back|');await wait(300);await page.evaluate(async()=>{document.querySelector('#eq-app [data-act=af][data-v="new|"]').click();await new Promise(x=>setTimeout(x,150));document.getElementById('afn-num').value='O2610-94';document.getElementById('afn-nom').value='DPGF collé (essai)';document.getElementById('afn-client').value='CLIENT TEST';document.getElementById('afn-etat').value='devis';
  document.querySelector('#eq-app [data-act=af][data-v="create|"]').click();await new Promise(x=>setTimeout(x,250));document.querySelector('#eq-app [data-act=af][data-v="tab|dpgf"]').click();await new Promise(x=>setTimeout(x,250));});
await page.fill('#cm-paste','N°\tDésignation\tU\tQuantité\n2.1\tFourniture et pose tube DN 100\tml\t420\n2.2\tSoudure DN 100\tu\t40');await click('dppaste|');await wait(500);
out.paste=await page.evaluate(()=>({old:!!document.querySelector('#eq-app details.c2-old'),bord:/Le bordereau du client/.test(document.getElementById('eq-app').textContent),grid:!!document.getElementById('dx-vp'),pu:document.querySelectorAll('#eq-app [data-afdp]').length}));
console.log('   DPGF collé :',JSON.stringify(out.paste));
C.c9=okOld&&!out.paste.old&&out.paste.bord&&!out.paste.grid&&out.paste.pu===2;
// retour sur l'affaire au DPGF Excel
await click('back|');await wait(300);await page.evaluate(async n=>{const b=[...document.querySelectorAll('#eq-app [data-act=af][data-v^="open|"]')].find(x=>x.dataset.v==='open|'+n);if(b)b.click();await new Promise(x=>setTimeout(x,300));const t=document.querySelector('#eq-app [data-act=af][data-v="tab|dpgf"]');if(t)t.click();await new Promise(x=>setTimeout(x,300));},NUM);
await page.waitForSelector('#dx-vp',{timeout:15000});await wait(600);
// ── c12) 1 920 px, côte à côte : la grille à gauche, le calculateur à droite (en-tête collé en haut quand le panneau défile)
await page.setViewportSize({width:1920,height:1080});await click('dxlay|side');await wait(500);await gridTop();await page.click(td(23,5));await wait(700);
out={split:await page.evaluate(()=>document.querySelector('#dx-card .dx-split').className),grid:await rect('#dx-grid'),calc:await rect('#dx-calc'),shut:await page.evaluate(()=>{const b=document.querySelector('#dx-calc .c2-shut');return !!b&&b.checkVisibility();})};
await page.evaluate(()=>{const s=document.getElementById('dx-side');s.scrollTop=400;});await wait(300);out.top=await rect('#dx-calc .c2-top');out.side=await rect('#dx-side');
await page.evaluate(()=>{document.getElementById('dx-side').scrollTop=0;});await wait(200);await shot('pc_1920_cote_a_cote.png');
// la fenêtre principale quand le DPGF est sur l'autre écran (le cas d'Ethan) : le calculateur, la ventilation dessous (lot C3)
{const [pop2]=await Promise.all([ctx.waitForEvent('page'),click('dxpop|')]);watch(pop2);await wait(900);await gridTop();out.pc=await rect('#dx-calc');out.pv=await rect('#dx-vent');out.pb=await rect('#c2-popbar');await shot('pc_1920_autre_ecran_principal.png');
  await pop2.evaluate(()=>document.querySelector('[data-v="dxpopclose|"]').click());await wait(800);}
console.log('c12) 1 920 px :',JSON.stringify(out));
/* (lot C3, changement voulu) : autre écran → la ventilation SOUS le calculateur, les deux sur toute la largeur */
C.c12=/\bside\b/.test(out.split)&&!out.shut&&out.calc.l>=out.grid.r-2&&out.top&&out.side&&Math.abs(out.top.t-out.side.t)<=4&&out.pc&&out.pv&&out.pv.t>=out.pc.b-2&&out.pc.w>=1700&&out.pv.w>=1700&&out.pb&&out.pb.h<=48;
await click('dxlay|stack');await wait(300);
// ── c11) TÉLÉPHONE 390 px : rien ne déborde ; calculateur en bas ; boutons ≥ 34 px (≥ 40 px pour Mettre) ; menu « ⋯ » et « Mettre le reste au ml » dans l'écran
await page.setViewportSize({width:390,height:844});await page.evaluate(()=>{document.getElementById('app').classList.remove('wide');});await click('tab|offre');await click('tab|dpgf');await page.waitForSelector('#dx-vp',{timeout:15000});await wait(600);
if(await page.evaluate(()=>/\bflt\b/.test((document.querySelector('#dx-card .dx-split')||{}).className||'')))await click('dxrpshut|');
out={sw:await page.evaluate(()=>document.documentElement.scrollWidth)};await page.click(td(24,5));await wait(700);
out.calc=await rect('#dx-calc');out.pos=await page.$eval('#dx-calc',e=>getComputedStyle(e).position);out.sw2=await page.evaluate(()=>document.documentElement.scrollWidth);
out.small=await page.$$eval('#dx-calc button, #dx-calc select, #dx-calc input:not([type=checkbox])',L=>L.filter(b=>b.offsetParent&&b.getBoundingClientRect().height<34).map(b=>(b.textContent||b.dataset.dx||b.dataset.c2||'').trim().slice(0,20)));
out.main=await page.$$eval('#dx-calc .c2-acts button',L=>L.filter(b=>b.offsetParent).map(b=>Math.round(b.getBoundingClientRect().height)));
out.over=await page.evaluate(()=>{const c=document.getElementById('dx-calc');return [...c.querySelectorAll('*')].filter(e=>{const r=e.getBoundingClientRect();return e.offsetParent&&r.width>0&&(r.right>window.innerWidth+1||r.left<-1);}).map(e=>e.className||e.tagName).slice(0,5);});
await shot('tel_390_calculateur.png');await click('dxrpshut|');await page.click('#dx-card .c2-more>summary');await wait(200);out.menu=await rect('#dx-card .c2-menu');out.menuSmall=await page.$$eval('#dx-card .c2-menu button',L=>L.filter(b=>b.getBoundingClientRect().height<34).length);await shot('tel_390_menu.png');
await page.click('#dx-card .dx-head h3');await wait(200);await click('dxrpsimple|');await wait(500);out.dlg=await rect('#rp-simple');out.dlgSmall=await page.$$eval('#rp-simple button',L=>L.filter(b=>b.offsetParent&&b.getBoundingClientRect().height<34).length);out.sw3=await page.evaluate(()=>{const b=document.querySelector('#rp-simple .rp-body');return b?b.scrollWidth-b.clientWidth:-1;});
await shot('tel_390_reste_au_ml.png');await click('dxrpsimplex|');
console.log('c11) téléphone 390 px :',JSON.stringify(out));
C.c11=out.sw<=390&&out.sw2<=390&&out.pos==='fixed'&&out.calc.w===390&&!out.small.length&&out.main.length>=1&&out.main.every(h=>h>=40)&&!out.over.length&&out.menu&&out.menu.l>=0&&out.menu.r<=390&&out.menuSmall===0&&out.dlg&&out.dlg.w<=390&&out.dlgSmall===0&&out.sw3<=0;
C.console=logs.length===0;
const bad=Object.entries(C).filter(([k,v])=>!v).map(([k])=>k);console.log(bad.length?'RESULTAT: ECHEC '+bad.join(','):'RESULTAT: TOUT VERT');console.log(logs.length?logs:'[]');
await browser.close();
