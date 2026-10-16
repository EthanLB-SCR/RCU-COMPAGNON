// Fabrique test/fixture_dpgf_clair_avant.json — un DPGF « déjà travaillé AVANT le lot C2 » (16/10) : enregistré avec le build livré avant ce lot (e79e2a),
// pour vérifier que le nouvel écran l'affiche et le calcule EXACTEMENT pareil (e2e_dpgf_clair.mjs, c0). Données FICTIVES : test/fixture_prix.xlsx,
// test/fixture_dpgf_clair.xlsx ; même chiffrage que e2e_dpgf_clair.mjs. Liens faits au calculateur d'avant (2.1 au ml : soudures + manchons + autocontrôle DN 100 +
// conteneur ; 3.1 : 30 soudures ; 4.4 : autocontrôle DN 80 entier ; 1.1 : la moitié de l'amené), puis « ⇶ Répartir au ml » (par DN) → a.dpgf.liens, reps.
// Lancer (le build d'avant servi en PAGE, ex. base.html) : BASE=http://localhost:8794 PAGE=base.html node make_fixture_dpgfclair_avant.mjs
import { chromium } from 'playwright';
import fs from 'fs';import path from 'path';import {fileURLToPath} from 'url';
import {setupAffaire} from './dpgf_clair_setup.mjs';
const HERE=path.dirname(fileURLToPath(import.meta.url));
const BASE=process.env.BASE||'http://localhost:8765';const PAGE=process.env.PAGE||'base.html';
const browser=await chromium.launch({headless:true, executablePath: process.env.CHROMIUM_PATH||undefined});
const ctx=await browser.newContext({viewport:{width:1366,height:768}});const page=await ctx.newPage();
const logs=[];page.on('pageerror',e=>logs.push('PAGEERROR: '+e.message.slice(0,300)));page.on('dialog',d=>d.accept().catch(()=>{}));
const wait=ms=>page.waitForTimeout(ms);
const S=await setupAffaire(page,BASE+'/'+PAGE,HERE);const {chg,click,td,A,NUM}=S;
const ck=async(k,on=true)=>chg(`#dx-calc input[data-dx="ck"][data-k="${k}"]`,on);
const fill=async(k,v)=>{await page.fill(`#dx-calc [data-dx="cq"][data-k="${k}"]`,v);await page.dispatchEvent(`#dx-calc [data-dx="cq"][data-k="${k}"]`,'change');await wait(250);};
// 2.1 (E10, 420 ml) : soudures, manchons, autocontrôle DN 100 (la part de ses ml), conteneur (420 ml)
await page.click(td(10,5));await wait(500);for(const k of ['z0|soudure|dn100','z0|manchons|dn100','z0|autoctrl|dn100','z0|conteneur'])await ck(k);await click('dxput|');
// 3.1 (E17, 40 u) : 30 soudures DN 100
await page.click(td(17,5));await wait(500);await ck('z0|soudure|dn100');await fill('z0|soudure|dn100','30');await click('dxput|');
// 4.4 (E25, 50 u) : l'autocontrôle DN 80 entier
await page.click(td(25,5));await wait(500);await ck('z0|autoctrl|dn80');await click('dxput|');
// 1.1 (E6, ft) : la moitié de l'amené / repli
await page.click(td(6,5));await wait(500);await ck('z0|amene');await fill('z0|amene','50 %');await click('dxput|');
// ⇶ Répartir au ml (outil d'avant, par DN, réglages d'office)
await click('dxrptool|');await wait(500);await click('dxrpapply|');await wait(500);
await click('tab|offre');await click('tab|dpgf');await page.waitForSelector('#dx-vp',{timeout:15000});await wait(800);
const a=await A();
const disp=await page.evaluate(()=>{const sp=t=>String(t||'').replace(/[\s  ]+/g,' ').trim();
  return {vsum:sp((document.querySelector('#dx-vent .dx-vsum')||{}).textContent),rows:[...document.querySelectorAll('#dx-vent .dx-vt tbody tr')].map(r=>[...r.cells].map(c=>sp(c.textContent))),
    lkr:[...document.querySelectorAll('#dx-vent .dx-lkr')].map(x=>sp(x.textContent)),reps:[...document.querySelectorAll('#dx-vent .rp-rep')].map(x=>sp(x.querySelector('b').textContent)+' | '+sp(x.querySelector('.dim').textContent).replace(/ · \d\d\/\d\d\/\d{4}.*$/,'')),
    cells:Object.fromEntries([6,7,10,11,12,13,14,17,18,19,22,23,24,25,28].map(r=>[r,[5,6].map(c=>sp((document.querySelector(`#dx-vp td[data-r="${r}"][data-c="${c}"]`)||{}).textContent))])),
    lkCls:Object.fromEntries([6,10,17,25].map(r=>[r,((document.querySelector(`#dx-vp td[data-r="${r}"][data-c="5"]`)||{}).className||'').split(' ').filter(c=>/^dx-lk/.test(c)).join(' ')])),
    taches:[...document.querySelectorAll('#eq-app .cm-tache')].map(x=>(x.classList.contains('done')?'✓ ':'○ ')+sp(x.textContent)),stats:[...document.querySelectorAll('#eq-app .ac-stat')].slice(0,3).map(x=>sp(x.textContent))};});
await page.click(td(10,5));await wait(500);disp.calcE10=String(await page.$eval('#dx-cres',e=>e.textContent)).replace(/[\s  ]+/g,' ').replace(/↦.*$/,'').trim();
const out={note:'DPGF FICTIF travaillé avec le build e79e2a (avant le lot C2) — make_fixture_dpgfclair_avant.mjs',dpgf:{xl:a.dpgf.xl,lignes:a.dpgf.lignes,liens:a.dpgf.liens,reps:a.dpgf.reps},disp};
fs.writeFileSync(path.join(HERE,'fixture_dpgf_clair_avant.json'),JSON.stringify(out,null,1));
console.log('liens',a.dpgf.liens.length,'reps',(a.dpgf.reps||[]).length,'vsum',disp.vsum,'E10',disp.calcE10,'logs',JSON.stringify(logs));
await browser.close();
