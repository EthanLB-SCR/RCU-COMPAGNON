// DPGF « COMME DANS EXCEL » (14/10 après-midi, lot C). Ethan : « importer le DPGF mais qu'il reste exactement sous la même forme, qu'on puisse le modifier,
// ajouter des PU et quantités […] en double écran avec ses formules ; puis l'autre grand tableau de comment est ventilé le prix […] quand tu retélécharges le DPGF
// pour le dossier, c'est la même version que le client, juste avec les prix […] et créer le détail unité […] je coche les cases pour que ça calcule ce prix, je le
// renseigne dans le DPGF et je pointe […] que ça fasse un lien visuel, et que ça décompte ». Fixtures FICTIVES : test/fixture_dpgf_xl.xlsx (make_fixture_dpgfxl.py :
// 2 feuilles, fusions, styles, formats, formules dont une partagée, nom défini, une fonction non gérée), test/fixture_prix.xlsx ; hors connexion.
// 1) import : la feuille du bordereau, les lignes ; 2) rendu fidèle (fusions, formats, styles, largeurs, hauteurs, colonne masquée, volets figés, zoom) ;
// 3) saisie d'un PU → montants, sous-totaux, total, TVA, TTC et feuille Récap recalculés par les formules ; formule en français ; annuler / rétablir ;
// 4) calculateur : composantes cochées → PU → dans la cellule ; lien visuel des deux côtés (même couleur, survol) ; décompte dans la ventilation ;
// 5) ⬇ DPGF pour le dossier : le fichier d'origine, seules les cellules changées diffèrent, formules gardées, rien de l'appli ; relu par LibreOffice (avec et sans
//    valeurs en cache) ; 6) lignes insérées / supprimées → export relu ; 7) ⬇ Détail unité ; 8) chiffrage changé → prix lié signalé puis réappliqué ;
// 9) ⧉ autre écran ; 10) 2 000 lignes fluides ; 11) téléphone 390 px ; 12) l'existant (bordereau, atelier) reste.
import { chromium } from 'playwright';
import fs from 'fs';import os from 'os';import path from 'path';import {fileURLToPath} from 'url';import {execFileSync} from 'child_process';
import {zipEntries,inflate,openXlsx,makeStyledXlsx} from '../src/xlsx.js';
import {cles} from './dpgf_cles.mjs'; /* 16/10 après-midi (lot C3) : les liens enregistrent des clés stables « z:<id de zone>|… » ; K('z0|…') / U(…) pour les lire ici */
const HERE=path.dirname(fileURLToPath(import.meta.url));
const BASE=process.env.BASE||'http://localhost:8765';
const browser=await chromium.launch({headless:true, executablePath: process.env.CHROMIUM_PATH||undefined});
const ctx=await browser.newContext({viewport:{width:1600,height:1300},acceptDownloads:true});const page=await ctx.newPage();
const logs=[];page.on('pageerror',e=>logs.push('PAGEERROR: '+e.message.slice(0,300)));page.on('console',m=>{if(m.type()==='error'&&!/supabase|Failed to fetch|net::ERR|404|WebSocket|pdf\.worker|cdnjs/i.test(m.text()))logs.push(m.text().slice(0,200));});
page.on('dialog',d=>d.accept().catch(()=>{}));
const C={};const wait=ms=>page.waitForTimeout(ms);const NUM='O2610-44';const sp=t=>String(t||'').replace(/[\s\u00A0\u202F]+/g,' ').trim();
const ab=b=>b.buffer.slice(b.byteOffset,b.byteOffset+b.byteLength);
/* LibreOffice (si présent) : chaque feuille en CSV « ; » — recalcul forcé en retirant d'abord les valeurs en cache des formules */
const loCsv=(file,strip)=>{try{const dir=fs.mkdtempSync(path.join(os.tmpdir(),'dxlo_'));const f=path.join(dir,strip?'sans_cache.xlsx':'export.xlsx'); /* le fichier téléchargé n'a pas d'extension : LibreOffice la veut */
    if(strip)execFileSync('python3',[path.join(HERE,'xlsx_sans_cache.py'),file,f]);else fs.writeFileSync(f,fs.readFileSync(file));
    execFileSync('soffice',['-env:UserInstallation=file://'+dir+'/profil','--headless','--convert-to','csv:Text - txt - csv (StarCalc):59,34,76,1,,0,false,true,false,false,false,-1',f,'--outdir',dir],{timeout:120000,stdio:'ignore'});
    /* LibreOffice écrit les noms de fichiers accentués en Latin-1 : on lit le dossier en octets */
    const out={};fs.readdirSync(dir,{encoding:'buffer'}).forEach(b=>{const n=b.toString('latin1');if(!/\.csv$/.test(n))return;const k=/-DPGF\.csv$/.test(n)?'DPGF':/cap\.csv$/.test(n)?'Recap':/Prix unitaires/.test(n)?'PU':n;out[k]=fs.readFileSync(Buffer.concat([Buffer.from(dir+'/'),b]),'utf8').split(/\r?\n/).map(l=>l.split(';'));});return Object.keys(out).length?out:null;}catch(e){console.log('(LibreOffice indisponible : '+String(e.message||e).slice(0,120)+')');return null;}};
const cellsOf=x=>Object.fromEntries([...String(x).matchAll(/<c r="([A-Z]+\d+)"[^>]*?(?:\/>|>.*?<\/c>)/g)].map(m=>[m[1],m[0]]));
async function unzip(buf){const Z=await zipEntries(ab(buf));const o={};for(const n of Object.keys(Z))o[n]=Buffer.from(Z[n].method===0?Z[n].data:await (async()=>{const {inflateBytes}=await import('../src/xlsx.js');return inflateBytes(Z[n]);})());return o;}
const chg=async(sel,val)=>{await page.evaluate(([s,v])=>{const el=document.querySelector(s);if(!el)throw new Error('absent '+s);if(el.type==='checkbox'){el.checked=!!v;}else el.value=v;el.dispatchEvent(new Event('change',{bubbles:true}));},[sel,val]);await wait(120);};
const click=async v=>{await page.evaluate(v=>{const el=document.querySelector(`#eq-app [data-act=af][data-v="${v}"]`);if(!el)throw new Error('bouton absent '+v);el.click();},v);await wait(250);};
const td=(r,c)=>`#dx-vp td[data-r="${r}"][data-c="${c}"]`;
const T=(r,c)=>page.evaluate(s=>{const e=document.querySelector(s);return e?e.textContent:null;},td(r,c));
const A=()=>page.evaluate(n=>window.TRACE.affaires.get(n),NUM);
const typeIn=async(r,c,text)=>{await page.click(td(r,c));await wait(80);await page.keyboard.type(text);await page.keyboard.press('Enter');await wait(350);};
const selFx=async(r,c)=>{await page.click(td(r,c));await wait(120);return page.$eval('#dx-fi',e=>e.value);};
// ── mise en place : affaire, classeur (base), une zone DN 100 × 100 soudures / 600 ml + purges, SST, base vie, épreuve
await page.goto(BASE+'/index.html');await wait(600);await page.evaluate(()=>{localStorage.clear();localStorage.setItem('trace:wide','1');});await page.evaluate(()=>new Promise(r=>{try{const q=indexedDB.deleteDatabase('trace-kv');q.onsuccess=q.onerror=q.onblocked=()=>r();}catch(e){r();}}));
await page.reload();await wait(1200);
{const s=await page.$('#loginSkip');if(s&&await s.isVisible())await s.click();await wait(700);}
await page.evaluate(async n=>{const T=window.TRACE;T.state.userId='ethan';T.renderHome();document.getElementById('htCom').click();await new Promise(x=>setTimeout(x,250));
  document.querySelector('#eq-app [data-act=af][data-v="new|"]').click();await new Promise(x=>setTimeout(x,150));document.getElementById('afn-num').value=n;document.getElementById('afn-nom').value='DPGF comme dans Excel';document.getElementById('afn-client').value='CLIENT TEST';document.getElementById('afn-etat').value='devis';
  document.querySelector('#eq-app [data-act=af][data-v="create|"]').click();await new Promise(x=>setTimeout(x,250));document.querySelector('#eq-app [data-act=af][data-v="tab|chiffrage"]').click();await new Promise(x=>setTimeout(x,200));},NUM);
await page.setInputFiles('#eq-app input[data-afprix]',path.join(HERE,'fixture_prix.xlsx'));await wait(1500);
await click('chetudeadd|');await click('chadd|dn');await chg('#eq-app [data-afx="e§dn.0.dn"]','100');await chg('#eq-app [data-afx="e§dn.0.soud"]','100');await chg('#eq-app [data-afx="e§dn.0.ml"]','600');
const unfold=async k=>{if(await page.evaluate(k=>{const c=document.querySelector(`#eq-app .ch-bloc[data-bloc="${k}"]`);return !!c&&c.classList.contains('folded');},k))await click('chfold|'+k);};
await unfold('purges');await chg('#eq-app [data-afx="e§purges.dn"]','32');await chg('#eq-app [data-afx="e§purges.paires"]','3');
await unfold('sst');await click('chadd|sst');await chg('#eq-app [data-afx="e§sst.0.type"]','sst_vannes_bs_pn25');await chg('#eq-app [data-afx="e§sst.0.dn"]','50');await chg('#eq-app [data-afx="e§sst.0.paires"]','2');
await unfold('chantier');await chg('#eq-app [data-afx="e§chantier.d0"]','2026-11-02');await chg('#eq-app [data-afx="e§chantier.d1"]','2026-11-12');await chg('#eq-app [data-afx="e§chantier.benne"]',true);await chg('#eq-app [data-afx="e§chantier.wc"]',true);
await click('tab|dpgf');
const ORIG=fs.readFileSync(path.join(HERE,'fixture_dpgf_xl.xlsx'));
await page.setInputFiles('#eq-app [data-afdpgf]',{name:'DPGF_lot02_essai.xlsx',mimeType:'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',buffer:ORIG});
await page.waitForSelector('#dx-vp',{timeout:15000});await wait(400);const {K,U,KS}=await cles(page,NUM);
// ── 1) import : la feuille du bordereau (en-tête ligne 4), les lignes et chapitres ; la grille en tête ; l'existant replié dessous
let a=await A();let out={sheet:a.dpgf.sheetName,hdr:a.dpgf.hdrRow,cols:a.dpgf.cols,lines:a.dpgf.lignes.filter(l=>!l.section).map(l=>l.row+':'+l.n+':'+l.u+':'+l.qte),secs:a.dpgf.lignes.filter(l=>l.section).length,
  tabs:await page.$$eval('#dx-card .dx-tabs button',b=>b.map(x=>x.textContent)),old:await page.$$eval('#eq-app details.dx-old',d=>d.map(x=>x.dataset.dxdet+':'+x.open))};
console.log('1) import :',JSON.stringify(out));
C.c1=out.sheet==='DPGF'&&out.hdr===4&&out.cols.pu===4&&out.cols.qte===3&&out.cols.tot===5&&out.lines.join()==='6:1.1:ft:1,7:1.2:ft:1,10:2.1:ml:600,11:2.2:u:100,12:2.3:u:100,13:2.4:ens.:1,16:3.1:ft:1,17:3.2:u:10'&&out.secs>=6&&out.tabs.join()==='DPGF,Récap'&&out.old.join()==='bord:false,atelier:false';
// ── 2) rendu fidèle : fusions, styles, formats, largeurs, hauteurs, colonne masquée (G), volets figés (lignes 1 à 4), lettres et n° de ligne, zoom
out=await page.evaluate(()=>{const q=s=>document.querySelector('#dx-vp '+s);const cs=e=>getComputedStyle(e);const a1=q('td[data-r="1"][data-c="1"]'),b5=q('td[data-r="5"][data-c="2"]'),h4=q('td[data-r="4"][data-c="2"]'),f10=q('td[data-r="10"][data-c="6"]');
  return {a1:{cs:a1.colSpan,t:a1.textContent,fw:cs(a1).fontWeight,bg:cs(a1).backgroundColor,col:cs(a1).color,al:cs(a1).textAlign},b5:{cs:b5.colSpan,fw:cs(b5).fontWeight},h4:{bb:cs(h4).borderBottomWidth,bg:cs(h4).backgroundColor},
    d10:q('td[data-r="10"][data-c="4"]').textContent,f10:f10.textContent,f10al:cs(f10).textAlign,e21:q('td[data-r="21"][data-c="5"]').textContent,
    cols:[...document.querySelectorAll('#dx-vp th[data-ch]')].map(t=>t.textContent).slice(0,8).join(''),colB:Math.round(document.querySelectorAll('#dx-vp col')[2].getBoundingClientRect().width||parseFloat(document.querySelectorAll('#dx-vp col')[2].style.width)),
    h1:parseFloat(q('tr[data-r="1"]').style.height),h3:parseFloat(q('tr[data-r="3"]').style.height),thead:document.querySelectorAll('#dx-vp thead tr[data-r]').length,sticky:cs(q('thead td[data-r="4"]')||q('thead tr[data-r="4"] td')).position,rn:q('th[data-rh="10"]').textContent.trim()};});
await click('dxzoom|1');out.zoom=await page.evaluate(()=>({z:document.querySelector('#dx-card .dx-zv').textContent,b:parseFloat(document.querySelectorAll('#dx-vp col')[2].style.width)}));await click('dxzoom|-1');
console.log('2) rendu :',JSON.stringify(out));
C.c2=out.a1.cs===6&&/DÉCOMPOSITION DU PRIX/.test(out.a1.t)&&+out.a1.fw>=700&&out.a1.bg==='rgb(31, 56, 100)'&&out.a1.col==='rgb(255, 255, 255)'&&out.a1.al==='center'&&out.b5.cs===5&&+out.b5.fw>=700&&out.h4.bb==='2px'&&out.h4.bg==='rgb(217, 217, 217)'
  &&sp(out.d10)==='600,00'&&sp(out.f10)==='- €'&&out.e21==='20%'&&out.cols==='ABCDEFHI'&&out.colB===364&&Math.abs(out.h1-37)<=1&&Math.abs(out.h3-8)<=1&&out.thead===4&&out.sticky==='sticky'&&out.rn==='10'&&out.zoom.z==='110 %'&&out.zoom.b>out.colB;
// ── 3) saisie d'un PU (clavier) → formules recalculées ; formule française dans la barre de formule ; feuille Récap (renvois, nom défini, fonction non gérée) ; annuler / rétablir
await typeIn(10,5,'45,5');
out={e10:await T(10,5),f10:sp(await T(10,6)),f14:sp(await T(14,6)),f20:sp(await T(20,6)),f21:sp(await T(21,6)),f22:sp(await T(22,6)),nm:await page.$eval('#dx-nm',e=>e.value)};a=await A();out.ed=a.dpgf.xl.ed;out.pu21=a.dpgf.lignes.find(l=>l.n==='2.1').pu;
out.stat=sp(await page.evaluate(()=>{const s=[...document.querySelectorAll('#eq-app .ac-stat')].find(x=>/total DPGF HT/.test(x.textContent));return s?s.querySelector('b').textContent:'';}));
out.fx11=await selFx(11,6);out.fx14=await selFx(14,6);
await page.click(td(17,5));await page.click('#dx-fi');await page.fill('#dx-fi','=ARRONDI(150/1,2;2)');await page.press('#dx-fi','Enter');await wait(400);
a=await A();out.f17=a.dpgf.xl.ed.DPGF.E17;out.e17=sp(await T(17,5));out.fF17=sp(await T(17,6));out.fx17=await selFx(17,5);
await page.focus('#dx-vp');await page.keyboard.press('Control+z');await wait(400);out.undo={e17:sp(await T(17,5)),ed:!!((await A()).dpgf.xl.ed.DPGF||{}).E17};await page.keyboard.press('Control+y');await wait(400);out.redo=sp(await T(17,5));
await click('dxsheet|1');await wait(300);out.recap=await page.evaluate(()=>[4,5,6,7,8,9,10,11,12].map(r=>{const e=document.querySelector(`#dx-vp td[data-r="${r}"][data-c="2"]`);return (e?e.textContent:'?')+(e&&e.classList.contains('dx-nr')?'[NR]':'');}));await click('dxsheet|0');await wait(250);
console.log('3) saisie et formules :',JSON.stringify(out));
C.c3=out.e10==='45,50 €'&&/27 300/.test(out.stat)&&out.f10==='27 300,00 €'&&out.f14==='27 300,00 €'&&out.f20==='27 300,00 €'&&out.f21==='5 460,00 €'&&out.f22==='32 760,00 €'&&out.nm==='E11'&&JSON.stringify(out.ed)==='{"DPGF":{"E10":{"v":45.5}}}'&&out.pu21===45.5
  &&out.fx11==='=D11*E11'&&out.fx14==='=SOUS.TOTAL(9;F10:F13)'&&out.f17&&out.f17.f==='ROUND(150/1.2,2)'&&out.e17==='125,00 €'&&out.fF17==='1 250,00 €'&&out.fx17==='=ARRONDI(150/1,2;2)'&&out.undo.e17===''&&!out.undo.ed&&out.redo==='125,00 €'
  &&sp(out.recap[1])==='27 300,00 €'&&sp(out.recap[2])==='1 250,00 €'&&sp(out.recap[3])==='28 550,00 €'&&out.recap[6]==='OK'&&sp(out.recap[7])==='28 550,00 €'&&/\[NR\]$/.test(out.recap[8]);
// ── 4) calculateur : ligne 2.2 (soudure DN 100, 100 u) → « DN 100 » coche soudures + manchons → PU = Σ ÷ 100 → dans E11 ; lien visuel ; décompte
const VS=await page.evaluate(n=>{const T=window.TRACE.affaires;const C=T.calc(T.get(n));const v=k=>{const p=C.etudes[0].r.postes[k];return p?p.achat/C.coef:0;};return {sou:v('soudure'),man:v('manchons'),ep:v('epreuve'),vente:C.total,coef:C.coef};},NUM);
await page.click(td(11,2));await wait(250);
out={h:await page.$eval('#dx-calc h4',e=>e.textContent),q:await page.$eval('#dx-calc [data-dx="q"]',e=>e.value)};await click('dxsugg|100');
out.on=await page.$$eval('#dx-calc .dx-cr.on',L=>L.map(x=>x.dataset.k+'='+x.querySelector('[data-dx="cq"]').value));out.res=sp(await page.$eval('#dx-cres',e=>e.textContent));
await click('dxput|');await wait(300);a=await A();const L1=a.dpgf.liens[0];const puExp=Math.round((VS.sou+VS.man)/100*100)/100;
out.link=L1&&{a:L1.a,qa:L1.qa,q:L1.q,pu:L1.pu,comps:L1.comps.map(x=>x.k+':'+x.q)};out.e11=sp(await T(11,5));
out.vis=await page.evaluate(id=>{const c=document.querySelector('#dx-vp td[data-r="11"][data-c="5"]');const segs=[...document.querySelectorAll(`#dx-vent .dx-vb i[data-lk="${id}"]`)];return {cls:c.className,lk:c.dataset.lk,col:getComputedStyle(c).getPropertyValue('--lk').trim(),dot:!!document.querySelector(`#dx-vp th[data-rh="11"] .dx-dot[data-lk="${id}"]`),segs:segs.length,segCol:segs[0]?getComputedStyle(segs[0]).backgroundColor:'',qa:document.querySelector('#dx-vp td[data-r="11"][data-c="4"]').classList.contains('dx-lkq')};},L1.id);
await page.hover(td(11,5));await wait(200);out.hover=await page.evaluate(id=>({cell:document.querySelector('#dx-vp td[data-r="11"][data-c="5"]').classList.contains('dx-hl'),segs:[...document.querySelectorAll(`#dx-vent [data-lk="${id}"]`)].filter(x=>x.classList.contains('dx-hl')).length}),L1.id);
out.vent=await page.evaluate(()=>{const rows=[...document.querySelectorAll('#dx-vent .dx-vt tbody tr')].map(r=>[...r.cells].map(c=>c.textContent.replace(/[\s\u00A0\u202F]+/g,' ').trim()));return {sum:document.querySelector('#dx-vent .dx-vsum').textContent.replace(/[\s\u00A0\u202F]+/g,' '),sou:rows.find(r=>/^Soudure/.test(r[0])),man:rows.find(r=>/^Manchons/.test(r[0])),ep:rows.find(r=>/^Épreuve/.test(r[0]))};});
out.calcDone=await page.$$eval('#dx-calc .dx-cr.full',L=>L.length);
// 2e ligne : 2.1 (600 ml) avec la moitié de l'épreuve (« 50 % ») → reste à placer sur l'épreuve
await page.click(td(10,2));await wait(250);await page.evaluate(k=>{const cb=document.querySelector(`#dx-calc input[data-dx="ck"][data-k="${k}"]`);cb.checked=true;cb.dispatchEvent(new Event('change',{bubbles:true}));},K('z0|epreuve'));await wait(250);
await page.fill(KS('#dx-calc [data-dx="cq"][data-k="z0|epreuve"]'),'50 %');await page.dispatchEvent(KS('#dx-calc [data-dx="cq"][data-k="z0|epreuve"]'),'change');await wait(250);
out.half=sp(await page.$eval('#dx-cres',e=>e.textContent));await click('dxput|');await wait(300);a=await A();
out.l2=a.dpgf.liens.length===2&&a.dpgf.liens[1].a==='E10'&&U(a.dpgf.liens[1].comps[0].k)==='z0|epreuve'?Math.abs(a.dpgf.liens[1].comps[0].q-300)<1e-6:false;out.e10=sp(await T(10,5));
out.ep2=await page.evaluate(()=>{const r=[...document.querySelectorAll('#dx-vent .dx-vt tbody tr')].find(r=>/^Épreuve/.test(r.cells[0].textContent));return r?[...r.cells].map(c=>c.textContent.replace(/[\s\u00A0\u202F]+/g,' ').trim()):null;});
// trop pointé : manchons DN 100 (déjà tout pris par la ligne 2.2) sur la ligne 2.3 → « ⚠ dépasse »
await page.click(td(12,2));await wait(250);await page.evaluate(k=>{const cb=document.querySelector(`#dx-calc input[data-dx="ck"][data-k="${k}"]`);cb.checked=true;cb.dispatchEvent(new Event('change',{bubbles:true}));},K('z0|manchons|dn100'));await wait(200);
await page.fill(KS('#dx-calc [data-dx="cq"][data-k="z0|manchons|dn100"]'),'50');await page.dispatchEvent(KS('#dx-calc [data-dx="cq"][data-k="z0|manchons|dn100"]'),'change');await wait(250);out.over=await page.$eval('#dx-calc .dx-cr.over',e=>e.textContent.replace(/[\s\u00A0\u202F]+/g,' ')).catch(()=>'');await click('dxcclr|');
console.log('4) calculateur, lien, décompte :',JSON.stringify(out),JSON.stringify({puExp}));
const colOf=x=>x.replace(/\s/g,'');
C.c4=/ligne 11/.test(out.h)&&out.q==='100'&&U(out.on.join())==='z0|soudure|dn100=100,z0|manchons|dn100=100'&&out.res.includes(String(puExp).replace('.',','))&&out.link&&out.link.a==='E11'&&out.link.qa==='D11'&&out.link.q===100&&out.link.pu===puExp
  &&U(out.link.comps.join())==='z0|soudure|dn100:100,z0|manchons|dn100:100'&&out.e11===puExp.toLocaleString('fr-FR',{minimumFractionDigits:2}).replace(/\u202F/g,' ')+' €'&&/dx-lk/.test(out.vis.cls)&&out.vis.lk===L1.id&&colOf(out.vis.col)==='#1f6fd0'&&out.vis.dot&&out.vis.segs>=3&&out.vis.segCol==='rgb(31, 111, 208)'&&out.vis.qa
  &&out.hover.cell&&out.hover.segs>=3&&/pointé/.test(out.vent.sum)&&out.vent.sou&&/✓ placé/.test(out.vent.sou[1])&&/✓ placé/.test(out.vent.man[1])&&out.calcDone===2&&/reste/.test(out.vent.ep[1])
  &&out.l2&&/= [\d ,]+ €/.test(out.half)&&out.e10!==''&&out.ep2&&/reste/.test(out.ep2[1])&&/dépasse de 50/.test(out.over);
// ── 5) ⬇ DPGF pour le dossier : le fichier du client, seules les cellules changées ; formules d'origine ; valeurs en cache à jour ; recalcul à l'ouverture ; rien de l'appli
let [dl]=await Promise.all([page.waitForEvent('download'),click('dxexport|')]);const EXP=fs.readFileSync(await dl.path());const expName=dl.suggestedFilename();
const zo=await unzip(ORIG),ze=await unzip(EXP);const changed=Object.keys(zo).filter(n=>ze[n]&&!zo[n].equals(ze[n])).sort(),gone=Object.keys(zo).filter(n=>!ze[n]),added=Object.keys(ze).filter(n=>!zo[n]);
const s0=cellsOf(zo['xl/worksheets/sheet1.xml'].toString()),s1=cellsOf(ze['xl/worksheets/sheet1.xml'].toString());const diff=Object.keys(Object.assign({},s0,s1)).filter(k=>s0[k]!==s1[k]).sort((x,y)=>+x.replace(/\D/g,'')-+y.replace(/\D/g,'')||x.localeCompare(y));
const r0=cellsOf(zo['xl/worksheets/sheet2.xml'].toString()),r1=cellsOf(ze['xl/worksheets/sheet2.xml'].toString());const diffR=Object.keys(Object.assign({},r0,r1)).filter(k=>r0[k]!==r1[k]).sort((x,y)=>+x.replace(/\D/g,'')-+y.replace(/\D/g,''));
const allX=Object.keys(ze).filter(n=>/\.xml$|\.rels$/.test(n)).map(n=>ze[n].toString()).join('');a=await A();
out={name:expName,changed,gone,added,diff,diffR,f10:s1.F10,f11:s1.F11,e17:s1.E17,calc:/<calcPr[^>]*fullCalcOnLoad="1"/.test(ze['xl/workbook.xml'].toString()),trace:/dx-|data-lk|TRACÉ|RCU|Calculer|L[a-z0-9]{8,}/.test(allX.replace(/dxfId|xr:uid/g,'')),ids:a.dpgf.liens.some(L=>allX.includes(L.id))};
const lo=loCsv(await dl.path(),false),lo2=loCsv(await dl.path(),true);
const L5=a.dpgf.lignes.filter(l=>!l.section);const tot5=Math.round(L5.reduce((x,l)=>x+(+l.pu||0)*(+l.qte||0),0)*100)/100;const e10=(L5.find(l=>l.n==='2.1')||{}).pu;
if(lo&&lo2){const g=(t,r,c)=>(t.DPGF[r-1]||[])[c-1];out.lo={e10:g(lo,10,5),e11:g(lo,11,5),f20:g(lo,20,6),f22:g(lo,22,6)};out.lo2={f11:g(lo2,11,6),f20:g(lo2,20,6),f22:g(lo2,22,6),b7:(lo2.Recap[6]||[])[1]};out.same=[10,11,12,13,14,16,17,18,20,21,22].every(r=>g(lo,r,6)===g(lo2,r,6));}
out.tot=tot5;out.e10v=e10;
console.log('5) export :',JSON.stringify(out));
const DIFF_OK=['E10','F10','E11','F11','F14','E17','F17','F18','F20','F21','F22'];
/* le classeur fictif a déjà fullCalcOnLoad : workbook.xml peut rester identique ; la chaîne de calcul part (cellules changées) */
C.c5=out.name==='DPGF_lot02_essai_SCR.xlsx'&&changed.filter(n=>n!=='xl/workbook.xml').join()==='[Content_Types].xml,xl/_rels/workbook.xml.rels,xl/worksheets/sheet1.xml,xl/worksheets/sheet2.xml'&&gone.join()==='xl/calcChain.xml'&&!added.length&&['xl/styles.xml','xl/sharedStrings.xml','xl/theme/theme1.xml'].every(n=>zo[n].equals(ze[n]))
  &&diff.join()===DIFF_OK.join()&&diffR.join()==='B5,B6,B7,B8,B9,B11'&&out.f10.includes('<f t="shared" ref="F10:F13" si="0">D10*E10</f><v>'+String(Math.round(600*e10*100)/100)+'</v>')&&/<f t="shared" si="0"\/><v>[\d.]+<\/v>/.test(out.f11)&&/<f>ROUND\(150\/1\.2,2\)<\/f><v>125<\/v>/.test(out.e17)&&out.calc&&!out.trace&&!out.ids
  &&(!out.lo||(+out.lo.e10===e10&&+out.lo.e11===puExp&&Math.abs(+out.lo.f20-tot5)<0.02&&out.same&&out.lo2.f20===out.lo.f20&&out.lo2.b7===out.lo.f20));
// ── 6) structure : une ligne insérée sous la 2.4 (formats et formule recopiés, sous-total agrandi), la ligne 1.2 supprimée (plages, renvois, lien décalés) → export relu
await page.click(td(13,2));await wait(150);await click('dxins|');await wait(400);
await page.keyboard.press('Home');await page.keyboard.type('2.5');await page.keyboard.press('Tab');await page.keyboard.type('Chambre de vannes (ajout)');await page.keyboard.press('Tab');await page.keyboard.type('u');await page.keyboard.press('Tab');await page.keyboard.type('2');await page.keyboard.press('Tab');await page.keyboard.type('1500');await page.keyboard.press('Enter');await wait(400);
out={r14:await page.evaluate(()=>[1,2,3,4,5,6].map(c=>{const e=document.querySelector(`#dx-vp td[data-r="14"][data-c="${c}"]`);return e?e.textContent.replace(/[\s\u00A0\u202F]+/g,' ').trim():null;})),fx15:await selFx(15,6),ins:await page.evaluate(()=>document.querySelector('#dx-vp tr[data-r="14"]').classList.contains('dx-insr'))};
await page.click(td(7,2));await wait(150);await click('dxdel|');await wait(400);a=await A();out.ops=a.dpgf.xl.ops.map(o=>o.op+'@'+o.at);out.liens=a.dpgf.liens.map(L=>L.a);out.fx7=await selFx(7,6);out.l25=a.dpgf.lignes.find(l=>l.n==='2.5');
await click('dxsheet|1');await wait(250);out.b4=await selFx(4,2);await click('dxsheet|0');await wait(250);
[dl]=await Promise.all([page.waitForEvent('download'),click('dxexport|')]);const EXP2=fs.readFileSync(await dl.path());const wb2=await openXlsx(ab(EXP2));const sh2=await wb2.sheet('DPGF'),rc2=await wb2.sheet('Récap');
out.x={a13:sh2.get('A13'),b13:sh2.get('B13'),f13:sh2.f('F13'),f14:sh2.f('F14'),f7:sh2.f('F7'),f20:sh2.f('F20'),b4:rc2.f('B4'),name:/TotalHT">'Récap'!\$B\$7</.test((await unzip(EXP2))['xl/workbook.xml'].toString()),merges:((await unzip(EXP2))['xl/worksheets/sheet1.xml'].toString().match(/<mergeCell ref="([^"]+)"/g)||[]).map(m=>m.slice(16,-1)).sort().join(' ')};
const lo3=loCsv(await dl.path(),true);if(lo3){const g=(r,c)=>(lo3.DPGF[r-1]||[])[c-1];out.lo3={f13:g(13,6),f14:g(14,6),f20:g(20,6),b5:(lo3.Recap[4]||[])[1]};}
console.log('6) structure :',JSON.stringify(out));
C.c6=out.r14[0]==='2.5'&&out.r14[1]==='Chambre de vannes (ajout)'&&out.r14[5]==='3 000,00 €'&&out.fx15==='=SOUS.TOTAL(9;F10:F14)'&&out.ins&&out.ops.join()==='ins@14,del@7'&&out.liens.join()==='E10,E9'&&out.fx7==='=SOUS.TOTAL(9;F6:F6)'&&out.l25&&out.l25.row===13&&out.l25.pu===1500
  &&out.b4==='=DPGF!F7'&&out.x.a13==='2.5'&&out.x.f13==='D13*E13'&&out.x.f14==='SUBTOTAL(9,F9:F13)'&&out.x.f7==='SUBTOTAL(9,F6:F6)'&&out.x.f20==='F7+F14+F18'&&out.x.b4==='DPGF!F7'&&out.x.name&&out.x.merges==='A1:F1 A2:F2 B15:F15 B5:F5 B8:F8'
  &&(!out.lo3||(out.lo3.f13==='3000'&&+out.lo3.f14>3000&&out.lo3.b5===out.lo3.f14));
// ── 7) 🔎 Détail des prix unitaires DANS l'appli (Ethan, 14/10 : « c'est sur l'appli, pas à exporter ») : chaque ligne reliée du DPGF décomposée (MO, fourniture,
//    sous-traitance, location / frais = PU), nos prix par zone, poste et DN (total = prix de vente), filtre texte et par zone ; puis le classeur Excel depuis le panneau
const nbv=t=>{const x=parseFloat(String(t||'').replace(/[\s\u00A0\u202F€]/g,'').replace(',','.'));return isFinite(x)?x:0;};
const puRows=()=>page.evaluate(()=>{const P=document.getElementById('dx-pu');if(!P)return null;return {on:((P.querySelector('.dx-pum .btn.on')||{}).textContent||'').trim(),lk:P.querySelectorAll('.dx-put tr[data-lk]').length,
  rows:[...P.querySelectorAll('.dx-put tbody tr')].map(tr=>({cls:tr.className,lk:!!tr.dataset.lk,td:[...tr.children].map(td=>td.textContent.replace(/[\s\u00A0\u202F]+/g,' ').trim())}))};});
await click('dxpu|');await wait(500);out={open:await page.evaluate(()=>{const d=document.getElementById('dx-pud');return !!(d&&d.open);})};
out.l=await puRows();a=await A();const nLk=(a.dpgf.liens||[]).length;
const lr=(out.l&&out.l.rows||[]).filter(r=>r.lk).map(r=>({pu:nbv(r.td[3]),parts:r.td.slice(4,8).reduce((s,x)=>s+nbv(x),0)+nbv(((r.td[7]||'').match(/autres ([-\d\s\u00A0\u202F,]+)/)||[])[1]),cmp:/›.*×/.test(r.td[0])}));
out.lr=lr;try{fs.mkdirSync('/tmp/shots_dpgfxl',{recursive:true});await (await page.$('#dx-pu')).screenshot({path:'/tmp/shots_dpgfxl/07_detail_pu_lignes.png'});}catch(e){}await click('dxpumode|comps');await wait(300);out.c=await puRows();
const dnRow=(out.c.rows||[]).find(r=>r.td[0]==='Soudure (compris manutention)'&&r.td[1]==='DN 100');const tot=(out.c.rows||[]).find(r=>r.cls==='tot');
await page.fill('#dx-pu [data-dxpu="f"]','dn 100');await wait(600);const fr=await puRows();out.flt=(fr.rows||[]).filter(r=>!r.cls).map(r=>r.td[1]);
await page.fill('#dx-pu [data-dxpu="f"]','');await wait(600);await click('dxpuz|z0');out.z=(await puRows()).rows.filter(r=>r.cls==='zg').map(r=>r.td[0]);await click('dxpuz|all');
console.log('7a) détail des prix unitaires (appli) :',JSON.stringify({open:out.open,on:out.l&&out.l.on,lk:out.l&&out.l.lk,nLk,lr:out.lr,dn:dnRow&&dnRow.td,tot:tot&&tot.td,flt:out.flt,z:out.z}));
C.c7app=out.open&&/Par ligne du DPGF/.test(out.l.on)&&out.l.lk===nLk&&nLk>=1&&lr.length===nLk&&lr.every(x=>x.cmp&&x.pu>0&&Math.abs(x.pu-x.parts)<0.03)
  &&/Nos prix unitaires/.test(out.c.on)&&!!dnRow&&nbv(dnRow.td[5])>0&&!!tot&&/= prix de vente du chiffrage/.test(tot.td.join(' '))&&out.flt.length>=1&&out.flt.every(x=>/DN 100/.test(x))&&out.z.length===1;
try{fs.mkdirSync('/tmp/shots_dpgfxl',{recursive:true});await (await page.$('#dx-pu')).screenshot({path:'/tmp/shots_dpgfxl/07_detail_pu_appli.png'});}catch(e){}
[dl]=await Promise.all([page.waitForEvent('download'),click('dxdetail|')]);const DET=fs.readFileSync(await dl.path());const wd=await openXlsx(ab(DET));const pu=await wd.sheet('Prix unitaires');
const comps=await page.evaluate(n=>{const T=window.TRACE.affaires;return T.calc(T.get(n)).total;},NUM);
out={name:dl.suggestedFilename(),sheets:wd.sheets.map(s=>s.name),rows:[...Array(40).keys()].map(i=>pu.get('C'+(i+6))).filter(Boolean).length,dn:[...Array(40).keys()].some(i=>pu.get('C'+(i+6))==='DN 100'&&pu.get('B'+(i+6))==='Soudure (compris manutention)'),g6:pu.f('G6'),i6:pu.f('I6')};
const loD=loCsv(await dl.path(),true);if(loD){const tot=(loD.PU||[]).find(r=>r[0]==='TOTAL');out.totV=tot?+tot[8]:null;out.vente=comps;}
console.log('7) détail unité :',JSON.stringify(out));
C.c7=/^Detail_prix_unitaires_O2610-44\.xlsx$/.test(out.name)&&out.sheets.join()==='Prix unitaires,Postes × zones,DPGF · lignes reliées'&&out.rows>=7&&out.dn&&out.g6==='F6/$G$2'&&out.i6==='E6*G6'&&(out.totV===undefined||Math.abs(out.totV-out.vente)<1);
// ── 8) le chiffrage change (marge 20 %, v2) → le prix lié est signalé (ancien → nouveau), « ↻ Appliquer » le réécrit
await page.evaluate(n=>{const T=window.TRACE.affaires;const a=T.get(n);T.set(n,{chiffrage:Object.assign({},a.chiffrage,{marge:0.2}),chiffrageV:2});},NUM);await click('tab|chiffrage');await click('tab|dpgf');await wait(500);
a=await A();const Ls=a.dpgf.liens.find(L=>L.comps.length===2);const pS=Ls.a;const rS=+pS.replace(/\D/g,'');
const ctrlTxt=()=>page.evaluate(()=>[...document.querySelectorAll('#eq-app .cm-tache')].map(x=>(x.classList.contains('done')?'✓ ':'○ ')+x.textContent.replace(/[\s\u00A0\u202F]+/g,' ').trim()).filter(t=>/Prix liés|prix liés/.test(t)).join(' | '));
out={banner:sp(await page.$eval('#dx-vent .dx-stale',e=>e.textContent).catch(()=>'')),cls:await page.$eval(td(rS,5),e=>e.className),row:sp(await page.$eval(`#dx-vent .dx-lkr[data-lk="${Ls.id}"]`,e=>e.textContent)),ctrl:await ctrlTxt()};
await click('dxrelink|*');await wait(400);a=await A();const L2=a.dpgf.liens.find(L=>L.id===Ls.id);const V2=await page.evaluate(n=>{const T=window.TRACE.affaires;const C=T.calc(T.get(n));const v=k=>C.etudes[0].r.postes[k].achat/C.coef;return Math.round((v('soudure')+v('manchons'))/100*100)/100;},NUM);
out.after={pu:L2.pu,v:L2.v,exp:V2,cell:sp(await T(rS,5)),cls:await page.$eval(td(rS,5),e=>e.className),banner:await page.$('#dx-vent .dx-stale'),ctrl:await ctrlTxt()};
console.log('8) prix liés et chiffrage :',JSON.stringify(out));
C.c8=/à mettre à jour/.test(out.banner)&&/dx-lks/.test(out.cls)&&/↻ [\d ,]+ → [\d ,]+/.test(out.row)&&out.after.pu===V2&&out.after.v===2&&out.after.cell===V2.toLocaleString('fr-FR',{minimumFractionDigits:2}).replace(/\u202F/g,' ')+' €'&&!/dx-lks/.test(out.after.cls)&&!out.after.banner&&/^○ 2 prix liés à mettre à jour/.test(out.ctrl)&&/^✓ Prix liés au chiffrage à jour \(2\)/.test(out.after.ctrl);
// ── 9) ⧉ autre écran : la grille dans une 2e fenêtre ; la ligne touchée là-bas → le calculateur ici ; saisie là-bas → l'appli à jour ; ↩ ramène
const [pop]=await Promise.all([ctx.waitForEvent('page'),click('dxpop|')]);await wait(800);
/* 16/10 (lot C2) : plus de grand cadre « ouvert dans l'autre fenêtre » — une barre fine « ⧉ DPGF ouvert sur l'autre écran · ↩ Ramener ici » (changement voulu) */
out={main:await page.evaluate(()=>!document.getElementById('dx-vp')&&/ouvert sur l'autre écran/.test(document.getElementById('dx-card').textContent)),rows:await pop.evaluate(()=>document.querySelectorAll('#dx-vp tr[data-r]').length)};
await pop.click('#dx-vp td[data-r="11"][data-c="2"]');await wait(300);out.calc=await page.$eval('#dx-calc h4',e=>e.textContent);
await pop.click('#dx-vp td[data-r="12"][data-c="5"]');await pop.keyboard.type('77');await pop.keyboard.press('Enter');await wait(500);a=await A();out.pu23=a.dpgf.lignes.find(l=>l.n==='2.4').pu; /* après la suppression de la 1.2, la 2.4 est en ligne 12 */out.popCell=await pop.evaluate(()=>document.querySelector('#dx-vp td[data-r="12"][data-c="5"]').textContent);
await pop.evaluate(()=>document.querySelector('[data-v="dxpopclose|"]').click());await wait(800);out.back=await page.evaluate(()=>!!document.getElementById('dx-vp'));
console.log('9) autre écran :',JSON.stringify(out));
C.c9=out.main&&out.rows>=20&&/ligne 11/.test(out.calc)&&out.pu23===77&&out.popCell==='77,00 €'&&out.back;
// ── 12) l'existant reste : bordereau simplifié et atelier, repliés sous la grille, s'ouvrent ; les PU du bordereau = ceux de la grille
await page.evaluate(()=>{const d=document.querySelector('#eq-app details.dx-old[data-dxdet="atelier"]');d.open=true;});await wait(400);
out={dw:await page.evaluate(()=>!!document.querySelector('#eq-app .cm-dw')),pu:await page.evaluate(()=>{const i=[...document.querySelectorAll('#eq-app [data-afdp]')].map(x=>x.value);return i;}),open:await page.evaluate(()=>document.querySelector('#eq-app details.dx-old[data-dxdet="atelier"]').open)};
a=await A();out.lines=a.dpgf.lignes.filter(l=>!l.section).map(l=>String(l.pu||''));
console.log('12) existant :',JSON.stringify(out));C.c12=out.dw&&out.open&&JSON.stringify(out.pu.map(x=>x===''?'':String(+x)))===JSON.stringify(out.lines.map(x=>x===''||x==='0'?'':String(+x)));
// ── 10) 2 000 lignes : import, grille, défilement, saisie, flèches, export restent fluides (grille fenêtrée)
const cells={};const put=(ad,v,s,f)=>{cells[ad]=f?{f,s}:{v,s};};['N°','Désignation','U','Qté','PU HT','Montant HT'].forEach((h,i)=>put(String.fromCharCode(65+i)+'3',h,'h'));let rr=4;const subs=[];
for(let ch=1;ch<=40;ch++){put('A'+rr,String(ch),'c');put('B'+rr,'CHAPITRE '+ch,'c');rr++;const r0=rr;for(let i=1;i<=50;i++){put('A'+rr,ch+'.'+i,'x');put('B'+rr,'Fourniture et pose tube pré-isolé DN '+[50,65,80,100,125,150][i%6]+' — tronçon '+i+' (désignation longue renvoyée à la ligne)','w');put('C'+rr,'ml','x');put('D'+rr,10+i,'n');put('E'+rr,null,'e');put('F'+rr,null,'e','D'+rr+'*E'+rr);rr++;}put('B'+rr,'Sous-total chapitre '+ch,'st');put('F'+rr,null,'e','SUBTOTAL(9,F'+r0+':F'+(rr-1)+')');subs.push(rr);rr++;}
put('B'+rr,'TOTAL HT','st');put('F'+rr,null,'e',subs.map(x=>'F'+x).join('+'));
const BIG=Buffer.from(await makeStyledXlsx([{name:'DPGF',cells,widths:[8,60,6,10,12,14]}],{h:{b:true,fill:'D9D9D9',border:true},c:{b:true,fill:'F2F2F2',border:true},x:{border:true},w:{border:true,wrap:true},n:{border:true,fmt:'#,##0.00'},e:{border:true,fmt:'#,##0.00\\ "€"'},st:{b:true,i:true,border:true}}));
await click('dpclear|');await wait(300);let t0=Date.now();await page.setInputFiles('#eq-app [data-afdpgf]',{name:'DPGF_2000.xlsx',mimeType:'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',buffer:BIG});
await page.waitForSelector('#dx-vp',{timeout:30000});out={grid:Date.now()-t0,lines:(await A()).dpgf.lignes.filter(l=>!l.section).length,rendered:await page.$$eval('#dx-vp tr[data-r]',x=>x.length),dom:await page.$$eval('#eq-app *',x=>x.length)};
t0=Date.now();for(let i=1;i<=10;i++){await page.evaluate(i=>{document.getElementById('dx-vp').scrollTop=i*4000;},i);await wait(20);}out.scroll=Date.now()-t0;out.win=await page.evaluate(()=>{const tr=[...document.querySelectorAll('#dx-vp tbody tr[data-r]')];return tr.length+':'+tr[0].dataset.r+'-'+tr[tr.length-1].dataset.r;});
const rowE=await page.evaluate(()=>{const tr=[...document.querySelectorAll('#dx-vp tbody tr[data-r]')];for(const t of tr.slice(5)){const d=t.querySelector('td[data-c="4"]');if(d&&d.textContent.trim())return +t.dataset.r;}return 0;});
await page.click(td(rowE,5));t0=Date.now();await page.keyboard.type('12,5');await page.keyboard.press('Enter');await page.waitForFunction(s=>{const e=document.querySelector(s);return e&&/\d/.test(e.textContent);},td(rowE,6));out.edit=Date.now()-t0;
t0=Date.now();for(let i=0;i<10;i++)await page.keyboard.press('ArrowDown');out.arrows=Date.now()-t0;
t0=Date.now();[dl]=await Promise.all([page.waitForEvent('download'),click('dxexport|')]);out.export=Date.now()-t0;
console.log('10) 2 000 lignes :',JSON.stringify(out));
C.c10=out.lines===2000&&out.grid<6000&&out.rendered<160&&out.dom<9000&&/^\d+:\d+-\d+$/.test(out.win)&&+out.win.split(':')[0]<160&&out.edit<2500&&out.arrows<2500&&out.export<6000&&out.scroll<4000;
// ── 11) téléphone 390 px : rien ne déborde (la grille défile dans son cadre)
await page.setViewportSize({width:390,height:844});await page.evaluate(()=>{document.getElementById('app').classList.remove('wide');});await click('tab|offre');await click('tab|dpgf');await wait(500);
out=await page.evaluate(()=>({sw:document.documentElement.scrollWidth,iw:innerWidth,card:Math.round(document.getElementById('dx-card').getBoundingClientRect().width),vp:Math.round(document.getElementById('dx-vp').getBoundingClientRect().width)}));
console.log('11) téléphone 390 px :',JSON.stringify(out));C.c11=out.sw<=out.iw&&out.card<=390&&out.vp<=390&&out.vp>200;
C.console=logs.length===0;
const bad=Object.entries(C).filter(([k,v])=>!v).map(([k])=>k);console.log(bad.length?'RESULTAT: ECHEC '+bad.join(','):'RESULTAT: TOUT VERT');console.log(logs.length?logs:'[]');
await browser.close();
