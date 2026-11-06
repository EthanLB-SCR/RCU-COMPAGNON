// e2e_lot2_0511.mjs — 05/11 soir : relevé du tournage, lot 2 « affichage cassé (visible devant un client) »
//  t8 DPGF : la règle .dx-n du Dossier ne s'applique plus hors du Dossier ; t9 fiches (card eq-form) en grand écran : plus de grille en 3 colonnes (les petits formulaires la gardent) ;
//  t10 plus de nom de fichier SQL / Supabase dans les messages des Réglages et des Versions ; t12 Pilotage : RH / direction sans droit planning ≠ chef de chantier ;
//  t13 contrôle chantier : chef / conducteur repris de la fiche ; t14 Flotte : plus de prompt / confirm natifs ; t15 console propre
import { chromium } from 'playwright';
import fs from 'node:fs';
const BASE=process.env.BASE||'http://localhost:8765';const C={};const logs=[];const J=x=>JSON.stringify(x);
const src=f=>fs.readFileSync(new URL('../'+f,import.meta.url),'utf8');
/* t8 */ {const d=src('src/dossier.js');C.t8=!/(^|\n)\.dx-n[{.\s]/.test(d)&&/\.dx \.dx-n\{/.test(d);console.log('t8) .dx-n limité au Dossier :',C.t8);}
/* t10 */ {const a=src('src/acces.js'),p=src('src/app.js');C.t10=!/<code>sql\/comptes_acces_v2\.sql<\/code>/.test(a)&&!/exécute une fois sql\/versions_v2\.sql/.test(p);console.log('t10) messages sans SQL :',C.t10);}
/* t12 */ {const e=src('src/espace.js');C.t12=/const chef=!can\(me,'planning\.edit'\)&&!\['rh','direction'\]\.includes\(accueilType\(me\)\)/.test(e);console.log('t12) RH ≠ chef de chantier :',C.t12);}
/* t13 */ {const e=src('src/espace.js'),a=src('src/accueil.js');C.t13=/chef:c&&c\.chef\?nomC\(pers\(c\.chef\)\):nm\(fi\.chef\)/.test(e)&&/A\.presents\(NET\.id\)\)\|\|\{\}\)\.chef/.test(a);console.log('t13) chef / conducteur depuis la fiche :',C.t13);}
/* t14 */ {const f=src('src/flotte.js');C.t14=!/\bprompt\(|\bconfirm\(/.test(f)&&/flAsk\('Nouveau véhicule'/.test(f);console.log('t14) Flotte sans boîtes natives :',C.t14);}
const browser=await chromium.launch({headless:true, executablePath: process.env.CHROMIUM_PATH||undefined});
const ctx=await browser.newContext({viewport:{width:1400,height:900}});const page=await ctx.newPage();
page.on('pageerror',e=>logs.push('PAGEERROR: '+e.message.slice(0,300)));page.on('console',m=>{if(m.type()==='error'&&!/supabase|Failed to fetch|net::ERR|404|geopf|WebSocket|open-meteo/i.test(m.text()))logs.push(m.text().slice(0,200));});
await ctx.route(u=>/(^|\.)geopf\.fr$|^geo\.api\.gouv\.fr$|open-meteo\.com$/.test(u.hostname),r=>r.fulfill({status:200,contentType:'application/json',body:'[]'}));
await page.goto(BASE+'/');await page.waitForTimeout(1500);
/* t9 */
const o9=await page.evaluate(()=>{const w=document.createElement('div');w.style.cssText='container-type:inline-size;container-name:eq;width:1200px;position:absolute;left:-5000px;top:0';
  w.innerHTML='<div class="card eq-form" id="t9a"><h3>Fiche</h3><table><tr><td>PU HT</td><td>Total</td></tr></table></div><div class="eq-form" id="t9b"><div>a</div><div>b</div><div>c</div></div>';document.body.appendChild(w);
  const a=getComputedStyle(document.getElementById('t9a')).display,b=getComputedStyle(document.getElementById('t9b')).display;w.remove();return {fiche:a,petit:b};});
console.log('t9) fiche pleine largeur, petit formulaire en grille :',J(o9));C.t9=o9.fiche!=='grid'&&o9.petit==='grid';
C.t15=logs.length===0;if(logs.length)console.log('console :',logs.slice(0,5));
console.log('RESULTAT',J(C),Object.values(C).every(Boolean)?'TOUT VERT':'ÉCHEC');await browser.close();
