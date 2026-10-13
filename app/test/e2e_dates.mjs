// CHAMPS DATE TAPÉS AU CLAVIER (13/10 nuit, Ethan, capture « Début des travaux 10/10/0001 » : « pour rentrer l'année tu mets un chiffre et tu sors de la date »).
// Cause reproduite : un champ date envoie un changement dès que la date est valide — au 1er chiffre de l'année (0002) — et l'appli enregistrait puis redessinait
// le formulaire : la frappe était coupée (« 10102026 » donnait 10/10/0002). Correctif global (app.js) : pendant la frappe rien n'est transmis, la date part à la
// sortie du champ ou sur Entrée ; année sur moins de 4 chiffres → retour à la valeur d'avant + message ; le calendrier (sans clavier) reste immédiat.
// Banc : le filtre « activité » d'un chantier (du … au …), dont le changement redessine le panneau — comme « Début des travaux » du chiffrage.
import { chromium } from 'playwright';
const BASE=process.env.BASE||'http://localhost:8765';
const browser=await chromium.launch({headless:true, executablePath: process.env.CHROMIUM_PATH||undefined});
const ctx=await browser.newContext({viewport:{width:1100,height:900},locale:'fr-FR'});const page=await ctx.newPage();
const logs=[];page.on('pageerror',e=>logs.push('PAGEERROR: '+e.message.slice(0,300)));page.on('console',m=>{if(m.type()==='error'&&!/supabase|Failed to fetch|net::ERR|404|WebSocket/i.test(m.text()))logs.push(m.text().slice(0,200));});
page.on('dialog',d=>d.accept().catch(()=>{}));
const C={};const wait=ms=>page.waitForTimeout(ms);
await page.goto(BASE+'/index.html');await wait(600);await page.evaluate(()=>{localStorage.clear();});await page.reload();await wait(1200);
{const s=await page.$('#loginSkip');if(s&&await s.isVisible())await s.click();await wait(700);}
await page.evaluate(async()=>{const T=window.TRACE;const id=Object.keys(T.sites).find(k=>k!=='__vide'&&T.sites[k]&&T.sites[k].lines);await T.go(id);await new Promise(r=>setTimeout(r,600));T.act.toggle(true);await new Promise(r=>setTimeout(r,300));});
const daySeg=async sel=>{const el=await page.$(sel);const bb=await el.boundingBox();await page.mouse.click(bb.x+8,bb.y+bb.height/2);await wait(150);for(let i=0;i<3;i++)await page.keyboard.press('ArrowLeft');await wait(60);}; /* curseur sur le jour, quelle que soit la case cliquée */
const state=()=>page.evaluate(()=>({from:(document.getElementById('actFrom')||{}).value,to:(document.getElementById('actTo')||{}).value,act:window.TRACE.state.act,focus:document.activeElement&&document.activeElement.id,toast:(document.getElementById('toast')||{}).textContent||''}));
// ── 1) « 10102026 » tapé d'affilée : la frappe n'est plus coupée ; rien n'est enregistré pendant la frappe ; la date part au clic ailleurs
await daySeg('#actFrom');const seen=[];for(const k of '10102026'){await page.keyboard.press(k);await wait(90);seen.push(await page.evaluate(()=>{const e=document.getElementById('actFrom');return (e?e.value:'∅')+(document.activeElement===e?'':'!');}));}
let out={seen,typing:await state()};await page.mouse.click(5,5);await wait(400);out.after=await state();
console.log('1) frappe :',JSON.stringify(out));
C.c1=out.seen[out.seen.length-1]==='2026-10-10'&&!out.seen.some(v=>v.endsWith('!'))&&out.typing.act===null&&out.typing.focus==='actFrom'&&out.after.act&&out.after.act.from==='2026-10-10';
// ── 2) Entrée valide la date tapée
await daySeg('#actTo');for(const k of '11112026'){ /* jour = mois : juste quel que soit l'ordre des cases (jj/mm en français, mm/jj dans Chromium sans interface) */await page.keyboard.press(k);await wait(60);}await page.keyboard.press('Enter');await wait(400);out=await state();
console.log('2) Entrée :',JSON.stringify(out));
C.c2=out.act&&out.act.to==='2026-11-11'&&out.to==='2026-11-11';
// ── 3) année commencée puis abandonnée (0002) : retour à la date d'avant, message, rien d'enregistré
await daySeg('#actTo');await page.keyboard.press('ArrowRight');await page.keyboard.press('ArrowRight');await wait(80);await page.keyboard.press('2');await wait(80);
out={pendant:await page.evaluate(()=>document.getElementById('actTo').value)};await page.mouse.click(5,5);await wait(400);out.after=await state();
console.log('3) année incomplète :',JSON.stringify(out));
C.c3=out.pendant==='0002-11-11'&&out.after.to==='2026-11-11'&&out.after.act.to==='2026-11-11'&&/Date incomplète/.test(out.after.toast);
// ── 4) le calendrier (valeur posée sans clavier) passe tout de suite, comme avant
out.cal=await page.evaluate(async()=>{const el=document.getElementById('actFrom');el.focus();el.value='2026-10-05';el.dispatchEvent(new Event('input',{bubbles:true}));el.dispatchEvent(new Event('change',{bubbles:true}));await new Promise(r=>setTimeout(r,250));return window.TRACE.state.act;});
console.log('4) calendrier :',JSON.stringify(out.cal));
C.c4=out.cal&&out.cal.from==='2026-10-05';
const bad=Object.entries(C).filter(([k,v])=>!v).map(([k])=>k);console.log(bad.length?'RESULTAT: ECHEC '+bad.join(','):'RESULTAT: TOUT VERT');console.log(logs.length?logs:'[]');
await browser.close();
