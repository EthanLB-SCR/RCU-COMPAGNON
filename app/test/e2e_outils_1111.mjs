// e2e_outils_1111 — lot 7 (nuit du 10 au 11/11/2026) — Ethan : « outils tuyauterie, premier kit ». Compagnon → 🧰 Outils : baïonnette (décalage), coupe de coude,
// développé de cintrage, pente, équerrage 3-4-5. Valeurs vérifiées à la main (voir chaque étape) ; le champ garde le focus pendant qu'on tape (résultat en direct) ;
// valeurs gardées sur l'appareil ; téléphone 390 px sans débordement, champs ≥ 48 px. Aucune donnée réelle.
import { chromium } from 'playwright';
const BASE=process.env.BASE||'http://127.0.0.1:8766';const J=x=>JSON.stringify(x);
const browser=await chromium.launch({headless:true,executablePath:process.env.CHROMIUM_PATH||undefined});
const C={};const logs=[];const N=s=>String(s||'').replace(/[\s  ]/g,'');
async function ouvrir(vp){const ctx=await browser.newContext(vp);const page=await ctx.newPage();
  page.on('pageerror',e=>logs.push('PAGEERROR: '+e.message.slice(0,300)));page.on('console',m=>{if(m.type()==='error'&&!/supabase|Failed to fetch|net::ERR|404|WebSocket|fonts.googleapis/i.test(m.text()))logs.push(m.text().slice(0,200));});
  await page.goto(BASE+'/index.html');await page.waitForTimeout(600);await page.evaluate(()=>{localStorage.clear();});await page.reload();await page.waitForTimeout(1200);
  {const s=await page.$('#loginSkip');if(s&&await s.isVisible())await s.click();await page.waitForTimeout(700);}
  await page.evaluate(()=>{const T=window.TRACE;T.state.userId='karim';T.renderHome();});await page.waitForTimeout(400);
  await page.evaluate(()=>{const b=document.getElementById('htEspace');if(b)b.click();});await page.waitForTimeout(500);
  await page.evaluate(()=>{const c=document.querySelector('#eq-app [data-act=sub][data-v=outils]');if(c)c.click();});await page.waitForTimeout(400);return {ctx,page};}
const res=page=>page.evaluate(()=>[...document.querySelectorAll('#ot-res .ot-r')].map(r=>r.querySelector('small').textContent+' = '+r.querySelector('b').textContent));
const outil=async(page,k)=>{await page.evaluate(k=>{const b=document.querySelector(`#eq-app [data-act=x][data-v="outils|open|${k}"]`);if(b)b.click();},k);await page.waitForTimeout(300);};
const retour=async page=>{await page.evaluate(()=>{const b=document.querySelector('#eq-app [data-act=x][data-v="outils|open|"]');if(b)b.click();});await page.waitForTimeout(300);};
const tape=async(page,sel,val)=>{await page.click(sel,{clickCount:3});await page.keyboard.press('Backspace');await page.type(sel,val,{delay:20});await page.waitForTimeout(150);};
{const {ctx,page}=await ouvrir({viewport:{width:1280,height:900}});
  // o1) la rubrique et ses 5 outils
  const o1=await page.evaluate(()=>({chip:!!document.querySelector('#eq-app [data-act=sub][data-v=outils]'),tiles:[...document.querySelectorAll('#eq-app .ot-tile b')].map(b=>b.textContent)}));
  console.log('o1) rubrique :',J(o1));C.o1=o1.chip&&J(o1.tiles)===J(['Baïonnette','Coupe de coude','Développé de cintrage','Pente','Équerrage 3-4-5']);
  // o2) baïonnette : H 500, DN 100 (R 152,4), écartement 2, 45° → L 707,1 · avance 500 · coude 63,1 · tube 500/sin45 − 2×63,13 − 4 = 576,9
  await outil(page,'baio');await page.evaluate(()=>{window.__h=document.getElementById('ot-baio-H');});
  await tape(page,'#ot-baio-H','500');const foc=await page.evaluate(()=>({meme:window.__h===document.getElementById('ot-baio-H')&&window.__h.isConnected,focus:document.activeElement&&document.activeElement.id}));
  await page.selectOption('#ot-baio-dn','100');await page.waitForTimeout(150);await tape(page,'#ot-baio-g','2');
  await page.evaluate(()=>{const b=document.querySelector('[data-v="outils|set|baio|a|45"]');if(b)b.click();});await page.waitForTimeout(300);
  const o2=await res(page);const R2=await page.evaluate(()=>document.getElementById('ot-baio-R').value);
  console.log('o2) baïonnette :',J({foc,R2,o2}));C.o2=foc.meme&&foc.focus==='ot-baio-H'&&R2==='152,4'&&N(o2[0]).endsWith('=576,9mm')&&N(o2[1]).endsWith('=707,1mm')&&N(o2[2]).endsWith('=500mm')&&N(o2[3]).endsWith('=63,1mm');
  // o3) coupe d'un coude 90° DN 100 à 30° : extrados (152,4 + 57,15) × π/6 = 109,7 · axe 79,8 · intrados 49,9 · reste 60°
  await retour(page);await outil(page,'coude');await page.selectOption('#ot-coude-dn','100');await page.waitForTimeout(150);
  await page.evaluate(()=>{const b=document.querySelector('[data-v="outils|set|coude|b|30"]');if(b)b.click();});await page.waitForTimeout(300);const o3=await res(page);
  console.log('o3) coupe de coude :',J(o3));C.o3=N(o3[0]).endsWith('=109,7mm')&&N(o3[1]).endsWith('=79,8mm')&&N(o3[2]).endsWith('=49,9mm')&&N(o3[3]).endsWith('=60°');
  // o4) cintrage R 500, 90°, a 800, b 600 : arc 785,4 · T 500 · gain 214,6 · tube 800 + 600 − 1 000 + 785,4 = 1 185,4
  await retour(page);await outil(page,'cint');await tape(page,'#ot-cint-R','500');await page.evaluate(()=>{const b=document.querySelector('[data-v="outils|set|cint|t|90"]');if(b)b.click();});await page.waitForTimeout(300);
  await tape(page,'#ot-cint-a','800');await tape(page,'#ot-cint-b','600');const o4=await res(page);
  console.log('o4) cintrage :',J(o4));C.o4=N(o4[0]).endsWith('=785,4mm')&&N(o4[1]).endsWith('=500mm')&&N(o4[2]).endsWith('=214,6mm')&&N(o4[3]).endsWith('=1185,4mm');
  // o5) pente : 50 m à 5 ‰ → 250 mm ; 0,5 % → 250 mm ; 250 mm sur 50 m → 5 ‰
  await retour(page);await outil(page,'pente');await tape(page,'#ot-pente-L','50');await tape(page,'#ot-pente-p','5');const o5a=await res(page);
  await page.evaluate(()=>{const b=document.querySelector('[data-v="outils|set|pente|u|pc"]');if(b)b.click();});await page.waitForTimeout(300);await tape(page,'#ot-pente-p','0,5');const o5b=await res(page);
  await page.evaluate(()=>{const b=document.querySelector('[data-v="outils|set|pente|mode|p"]');if(b)b.click();});await page.waitForTimeout(300);await tape(page,'#ot-pente-dh','250');const o5c=await res(page);
  console.log('o5) pente :',J({o5a,o5b,o5c}));C.o5=N(o5a[0]).endsWith('=250mm')&&N(o5b[0]).endsWith('=250mm')&&N(o5c[0]).startsWith('Pente=5‰');
  // o6) 3-4-5 : a 1,2 → b 1,6 · diagonale 2 ; a 3 et b 4 → diagonale 5
  await retour(page);await outil(page,'equ');await tape(page,'#ot-equ-a','1,2');const o6a=await res(page);await tape(page,'#ot-equ-a','3');await tape(page,'#ot-equ-b','4');const o6b=await res(page);
  console.log('o6) 3-4-5 :',J({o6a,o6b}));C.o6=N(o6a[0]).endsWith('=2m')&&N(o6a[2]).endsWith('=1,6m')&&N(o6b[0]).endsWith('=5m');
  // o7) valeurs gardées sur l'appareil
  await page.reload();await page.waitForTimeout(1200);{const s=await page.$('#loginSkip');if(s&&await s.isVisible())await s.click();await page.waitForTimeout(600);}
  await page.evaluate(()=>{const T=window.TRACE;T.state.userId='karim';T.renderHome();});await page.waitForTimeout(300);await page.evaluate(()=>{const b=document.getElementById('htEspace');if(b)b.click();});await page.waitForTimeout(400);
  await page.evaluate(()=>{const c=document.querySelector('#eq-app [data-act=sub][data-v=outils]');if(c)c.click();});await page.waitForTimeout(300);await outil(page,'baio');
  const o7=await page.evaluate(()=>({H:(document.getElementById('ot-baio-H')||{}).value,R:(document.getElementById('ot-baio-R')||{}).value}));
  console.log('o7) gardé sur l\'appareil :',J(o7));C.o7=o7.H==='500'&&o7.R==='152,4';
  await ctx.close();}
// o8) téléphone 390 px : pas de débordement, champs et boutons ≥ 48 px
{const {ctx,page}=await ouvrir({viewport:{width:390,height:844},isMobile:true,hasTouch:true});await outil(page,'baio');
  const o8=await page.evaluate(()=>{const sw=document.documentElement.scrollWidth;const ins=[...document.querySelectorAll('#eq-app .ot-card input,#eq-app .ot-card select')].map(i=>Math.round(i.getBoundingClientRect().height));const bs=[...document.querySelectorAll('#eq-app .ot-seg button')].map(b=>Math.round(b.getBoundingClientRect().height));return {sw,ins:Math.min(...ins),bs:Math.min(...bs)};});
  await page.tap('#ot-baio-H');await page.keyboard.type('300');await page.waitForTimeout(300);o8.live=await page.evaluate(()=>document.querySelectorAll('#ot-res .ot-r').length);
  console.log('o8) téléphone :',J(o8));C.o8=o8.sw<=392&&o8.ins>=48&&o8.bs>=46&&o8.live===4;await ctx.close();}
C.o9=logs.length===0;if(logs.length)console.log('logs :',J(logs.slice(0,8)));
await browser.close();
const ko=Object.keys(C).filter(k=>!C[k]);console.log('RÉSULTATS',J(C));console.log('RESULTAT:',ko.length?'ECHEC '+ko.join(','):'TOUT VERT');process.exit(ko.length?1:0);
