// 23/10 (Ethan : « de petites étiquettes du DN tous les x mètres, qu'on n'ait pas besoin de cliquer sur la pièce et le tube pour voir les DN, dans le traceur comme dans la
// vue plan d'ensemble »). Réseau FICTIF du traceur : L1 DN 150, 120 m, réduction en DN 100 à PK 70 ; L2 DN 80, 30 m.
// c1 traceur : étiquettes « DN 150 » puis « DN 100 » après la réduction, « DN 80 » sur L2 ; une tous les ~25 m au zoom ; la case 👁 « DN » les retire
// c2 appli (plan) : mêmes étiquettes au zoom (≥ 4 px/m), DN 150 avant la réduction, DN 100 après ; la case 👁 « DN » (groupe Réseau) les retire ; rien dézoomé loin
// c3 téléphone 390 : étiquettes présentes, pas d'erreur · c4 console.
import { chromium } from 'playwright';
const BASE=process.env.BASE||'http://localhost:8765';const SHOTS=process.env.SHOTS||null;
const browser=await chromium.launch({headless:true, executablePath: process.env.CHROMIUM_PATH||undefined});
const ctx=await browser.newContext({viewport:{width:1366,height:860},deviceScaleFactor:1});const page=await ctx.newPage();const logs=[];const C={};
page.on('pageerror',e=>logs.push('PAGEERROR: '+e.message.slice(0,300)));page.on('console',m=>{if(m.type()==='error'&&!/supabase|Failed to fetch|net::ERR|404|geopf|WebSocket/i.test(m.text()))logs.push(m.text().slice(0,200));});page.on('dialog',d=>d.accept().catch(()=>{}));
await page.goto(BASE+'/traceur.html');await page.waitForTimeout(500);await page.evaluate(()=>localStorage.clear());await page.reload();await page.waitForTimeout(600);
await page.evaluate(()=>{const S=window.MAQ.state;S.lines=[{id:'L1',name:'Feeder fictif',dn:150,bar:12,pts:[[0,100],[120,100]],specials:[{id:'R1',m:70,type:'reducer',dn2:100}],parent:null},{id:'L2',name:'Antenne fictive',dn:80,bar:12,pts:[[0,150],[30,150]],specials:[],parent:null}];S.seq=3;window.MAQ.setMode('select');window.MAQ.rebuild();
  const v=S.view;v.k=8;v.tx=40;v.ty=-100*8+300;window.MAQ.applyView();window.MAQ.rebuild();});await page.waitForTimeout(300);
const shot=async n=>{if(SHOTS)await page.screenshot({path:`${SHOTS}/dn_${n}.png`});};
const labs=()=>page.evaluate(()=>[...document.querySelectorAll('#svg text')].filter(t=>/^DN \d+$/.test(t.textContent.trim())).map(t=>({t:t.textContent.trim(),x:+t.getAttribute('x')})).sort((a,b)=>a.x-b.x));
let L=await labs();await shot('1_traceur');
await page.evaluate(()=>{window.MAQ.state.show.dn=false;window.MAQ.rebuild();});const L0=await labs();await page.evaluate(()=>{window.MAQ.state.show.dn=true;window.MAQ.rebuild();});
console.log('c1) traceur :',JSON.stringify({L,off:L0.length}));
const l150=L.filter(x=>x.t==='DN 150'),l100=L.filter(x=>x.t==='DN 100'),l80=L.filter(x=>x.t==='DN 80');
C.c1=l150.length>=2&&l150.every(x=>x.x<71.5)&&l100.length>=2&&l100.every(x=>x.x>=71)&&l80.length===1&&L0.length===0;
// ── c2 appli
await page.click('#bSave');await page.waitForTimeout(200);await page.fill('#svName','DN étiquettes');await page.click('#svOk');await page.waitForTimeout(800);
await page.click('#svGo');await page.waitForTimeout(1500);await page.selectOption('#roleSel','karim');await page.waitForTimeout(300);
const labsApp=()=>page.evaluate(()=>[...document.querySelectorAll('#net text.dnlab')].map(t=>({t:t.textContent.trim(),x:+t.getAttribute('x')})).sort((a,b)=>a.x-b.x));
await page.evaluate(()=>{const T=window.TRACE;T.state.tab='plan';T.renderAll();T.centerOn(30,100,8);});await page.waitForTimeout(400);
let A=await labsApp();await shot('2_appli');await page.evaluate(()=>window.TRACE.centerOn(95,100,8));await page.waitForTimeout(300);(await labsApp()).forEach(x=>{if(!A.some(y=>y.t===x.t&&y.x===x.x))A.push(x);});A.sort((a,b)=>a.x-b.x); /* le plan ne dessine que ce qui est à l'écran : deux vues */
await page.evaluate(()=>{window.TRACE.state.show.dn=false;window.TRACE.renderPlan();});const A0=await labsApp();await page.evaluate(()=>{window.TRACE.state.show.dn=true;window.TRACE.renderPlan();});
await page.evaluate(()=>{const T=window.TRACE;T.state.view.k=2;T.centerOn(60,100);});await page.waitForTimeout(300);const Afar=await labsApp();await page.evaluate(()=>window.TRACE.centerOn(60,100,8));await page.waitForTimeout(300);
await page.click('.zoomctl [data-z="eye"]');await page.waitForTimeout(250);const chip=await page.evaluate(()=>{const b=document.querySelector('#disp input[data-k="dn"]');const lab=b&&b.closest('label');return b?{checked:b.checked,txt:lab?lab.textContent.replace(/\s+/g,' ').trim():''}:null;});
console.log('c2) appli :',JSON.stringify({A,off:A0.length,far:Afar.length,chip}));
const a150=A.filter(x=>x.t==='DN 150'),a100=A.filter(x=>x.t==='DN 100');
C.c2=a150.length>=2&&a150.every(x=>x.x<71.5)&&a100.length>=2&&a100.every(x=>x.x>=71)&&A.some(x=>x.t==='DN 80')&&A0.length===0&&Afar.length===0&&!!chip&&chip.checked&&/DN/.test(chip.txt);
await page.evaluate(()=>{const d=document.getElementById('disp');if(d)d.classList.remove('show');});const sidK=await page.evaluate(()=>window.TRACE.state.siteId);
// ── c3 téléphone (même appareil : le chantier du traceur y est)
await page.setViewportSize({width:390,height:844});await page.reload();await page.waitForTimeout(1800);
await page.evaluate(async id=>{const T=window.TRACE;if(T.state.siteId!==id)await T.go(id);T.state.tab='plan';T.renderAll();T.centerOn(60,100,8);},sidK);await page.waitForTimeout(500);
const A3=await labsApp();await shot('3_tel');console.log('c3) téléphone :',JSON.stringify({sid:sidK,A3:A3.map(x=>x.t)}));C.c3=!!sidK&&A3.length>=2;
await ctx.close();
console.log('erreurs console :',JSON.stringify(logs));C.c4=logs.length===0;
const ko=Object.entries(C).filter(([k,v])=>!v).map(([k])=>k);console.log(JSON.stringify(C));console.log(ko.length?'RESULTAT: KO '+ko.join(','):'RESULTAT: TOUT VERT');
await browser.close();
