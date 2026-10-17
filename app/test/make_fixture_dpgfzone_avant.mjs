// Fabrique test/fixture_dpgf_zone_avant.json — un DPGF pointé « à l'ancienne » AVANT le lot DZ (17/10), avec le build livré le 16/10 au soir (9ab20e) :
// les installations communes (onglet Installations du chiffrage, ventilées AUX JOURS D'ÉQUIPE) restent un paquet global, et « ⇶ Mettre le reste au ml » les
// répartit au prorata des ml de TOUTES les lignes (la ventilation choisie au chiffrage est cassée — le cas d'Ethan du 17/10). Données 100 % FICTIVES :
// test/fixture_prix.xlsx, test/fixture_dpgf_suivi.xlsx ; 3 zones fictives : Secteur Alpha (DN 100 : 60 soud., 600 ml ; DN 80 : 20 soud., 300 ml), Secteur Bêta
// (DN 65 : 100 soud., 250 ml), Secteur Gamma (DN 50 : 20 soud., 150 ml) ; installations : WC + conteneur + pelle (2 A/R), du 02/11 au 27/11/2026, amené / repli × 2, DOE.
// Pointage : 3.1 (soudures DN 100) et 4.1 (épreuves) au calculateur, 1.1 (au forfait) la moitié de l'amené / repli, 5.1 au PU tapé, puis « ⇶ Mettre le reste au ml ».
// Lancer (le build d'avant servi en PAGE, ex. base.html) : BASE=http://localhost:8806 PAGE=base.html node make_fixture_dpgfzone_avant.mjs
import { chromium } from 'playwright';
import fs from 'fs';import path from 'path';import {fileURLToPath} from 'url';
import {cles} from './dpgf_cles.mjs';
import {setupZoneAffaire,NUM} from './dpgf_zone_setup.mjs';
const HERE=path.dirname(fileURLToPath(import.meta.url));
const BASE=process.env.BASE||'http://localhost:8806';const PAGE=process.env.PAGE||'base.html';
const browser=await chromium.launch({headless:true, executablePath: process.env.CHROMIUM_PATH||undefined});
const ctx=await browser.newContext({viewport:{width:1366,height:768}});const page=await ctx.newPage();
const logs=[];page.on('pageerror',e=>logs.push('PAGEERROR: '+e.message.slice(0,300)));page.on('dialog',d=>d.accept().catch(()=>{}));
page.on('console',m=>{if(m.type()==='error'&&!/supabase|Failed to fetch|net::ERR|404|WebSocket|pdf\.worker|cdnjs/i.test(m.text()))logs.push(m.text().slice(0,200));});
const S=await setupZoneAffaire(page,BASE+'/'+PAGE,HERE);const {chg,click,td,A,wait}=S;
const {K}=await cles(page,NUM);
const ck=async(k,on=true)=>chg(`#dx-calc input[data-dx="ck"][data-k="${K(k)}"]`,on);
const fill=async(k,v)=>{const s=`#dx-calc [data-dx="cq"][data-k="${K(k)}"]`;await page.fill(s,v);await page.dispatchEvent(s,'change');await wait(250);};
const gridTop=async()=>{await page.evaluate(()=>{document.getElementById('dx-card').scrollIntoView({block:'start'});});await wait(250);};
const shut=async()=>{if(await page.evaluate(()=>/\bflt\b/.test((document.querySelector('#dx-card .dx-split')||{}).className||'')))await click('dxrpshut|');};
const open=async r=>{await gridTop();await page.click(td(r,5));await wait(500);};
const has=sel=>page.evaluate(s=>!!document.querySelector(s),sel);
// 3.1 (E16, 40 u) : les soudures DN 100 de Secteur Alpha
await open(16);await ck('z0|soudure|dn100');await click('dxput|');await shut();
// 1.1 (E6, au forfait) : la moitié de l'amené / repli (installation globale, au ml du projet)
await open(6);await ck('inst|amene');await fill('inst|amene','50 %');await click('dxput|');await shut();
// 4.1 (E23, au forfait) : les épreuves des 3 zones
await open(23);for(const k of ['z0|epreuve','z1|epreuve','z2|epreuve'])if(await has(`#dx-calc input[data-dx="ck"][data-k="${K(k)}"]`))await ck(k);await click('dxput|');await shut();
// 5.1 (E27) : PU tapé à la main
await gridTop();await page.click(td(27,5));await wait(300);await page.keyboard.type('1500');await page.keyboard.press('Enter');await wait(500);await shut();
// ⇶ Mettre le reste au ml (fenêtre courte du lot C2, telle quelle dans ce build)
await click('dxrpsimple|');await wait(500);await click('dxrpsimpleok|');await wait(800);
await click('tab|offre');await click('tab|dpgf');await page.waitForSelector('#dx-vp',{timeout:15000});await wait(900);
const a=await A();
const disp=await page.evaluate(()=>{const sp=t=>String(t||'').replace(/[\s  ]+/g,' ').trim();
  return {vsum:sp((document.querySelector('#dx-vent .dx-vsum')||{}).textContent),cells:Object.fromEntries([6,9,10,11,12,13,16,17,18,19,20,23,24,27].map(r=>[r,sp((document.querySelector(`#dx-vp td[data-r="${r}"][data-c="5"]`)||{}).textContent)]))};});
const comps=await page.evaluate(n=>{const T=window.TRACE.affaires;const Cc=T.calc(T.get(n));return {vente:Cc.vente,inst:Cc.inst?{mode:Cc.inst.ventil.mode,parts:Cc.inst.ventil.parts,total:Cc.inst.total,postes:Object.fromEntries(Object.entries(Cc.inst.postes).filter(([k,v])=>v.achat>0.005).map(([k,v])=>[k,v.achat]))}:null,ml:Cc.ml};},NUM);
const REC={_:'DPGF pointé avec le build 9ab20e (16/10, avant le lot DZ) — données fictives, voir make_fixture_dpgfzone_avant.mjs',build:await page.evaluate(()=>{const m=document.body.innerHTML.match(/\d\d\/\d\d\/\d{4} · [0-9a-f]{6}/);return m?m[0]:'';}),
  chiffrage:a.chiffrage,chiffrageV:a.chiffrageV||1,dpgf:a.dpgf,disp,comps};
fs.writeFileSync(path.join(HERE,'fixture_dpgf_zone_avant.json'),JSON.stringify(REC,null,1));
console.log('build :',REC.build,'· liens :',(a.dpgf.liens||[]).length,'· répartitions :',(a.dpgf.reps||[]).map(r=>r.nom).join(', '),'· ventilation :',disp.vsum);
console.log('installations :',JSON.stringify(comps.inst));console.log('PU :',JSON.stringify(disp.cells));
console.log(logs.length?logs:'[]');
await browser.close();
