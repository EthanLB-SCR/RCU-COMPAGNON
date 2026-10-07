// PHOTOS OBLIGATOIRES aux étapes (Ethan 07/10) : ② fils raccordés et ③ manchon rétracté + manomètre ne se valident pas sans photo (① déjà le cas) ;
// sans photo, l'appareil photo est sollicité (input de l'étape déclenché) ; avec photo, l'étape passe. ④ reste libre (photo conseillée).
import { chromium } from 'playwright';
const BASE=process.env.BASE||'http://localhost:8765';
const browser=await chromium.launch({headless:true, executablePath: process.env.CHROMIUM_PATH||undefined});
const ctx=await browser.newContext({viewport:{width:900,height:940}});const page=await ctx.newPage();
const logs=[];page.on('pageerror',e=>logs.push('PAGEERROR: '+e.message.slice(0,300)));page.on('console',m=>{if(m.type()==='error'&&!/supabase|Failed to fetch|net::ERR|404/i.test(m.text()))logs.push(m.text().slice(0,200));});
page.on('dialog',d=>d.accept().catch(()=>{}));
const PNG='data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg==';
await page.goto(BASE+'/traceur.html');await page.waitForTimeout(500);
await page.evaluate(()=>{localStorage.clear();});await page.reload();await page.waitForTimeout(500);
await page.evaluate(()=>{const S=window.MAQ.state;S.supplier='RENALIA';S.lines=[{id:'L1',name:'Feeder',dn:100,bar:12,pts:[[10,50],[80,50]],specials:[],parent:null}];S.seq=2;window.MAQ.setMode('select');window.MAQ.rebuild();});
await page.click('#bSave');await page.waitForTimeout(200);await page.fill('#svName','Photos test');await page.click('#svOk');await page.waitForTimeout(600);
await page.click('#svGo');await page.waitForTimeout(1200);await page.selectOption('#roleSel','ethan');await page.waitForTimeout(300);
const L=await page.evaluate(()=>Object.values(window.TRACE.lines)[0].id);
const open=i=>page.evaluate(({L,i})=>window.TRACE.openJoint(L,'A',i),{L,i});
const J=()=>page.evaluate(({L})=>{const j=window.TRACE.lines[L].cond.A.joints[1];return {status:j.status,d1:!!(j.steps&&j.steps[1]&&j.steps[1].done),d2:!!(j.steps&&j.steps[2]&&j.steps[2].done),d3:!!(j.steps&&j.steps[3]&&j.steps[3].done),d4:!!(j.steps&&j.steps[4]&&j.steps[4].done),toast:document.querySelector('#toast').textContent};},{L});
// espion : l'input photo de l'étape est-il déclenché ?
await page.evaluate(()=>{window.__cam=[];const orig=HTMLInputElement.prototype.click;HTMLInputElement.prototype.click=function(){if(this.dataset&&this.dataset.stepph)window.__cam.push(+this.dataset.stepph);return orig.call(this);};});
// ── 1) étape 1 avec photo (déjà obligatoire) → ok
await page.evaluate(({L,PNG})=>{const j=window.TRACE.lines[L].cond.A.joints[1];j.steps={1:{photos:[PNG]}};},{L,PNG});
await open(1);await page.waitForTimeout(400);
await page.evaluate(()=>{document.querySelector('#st1-vis').checked=true;document.querySelector('#sheet [data-stepok="1"]').click();});await page.waitForTimeout(500);
let out=await J();console.log('1) étape 1 (photo présente) validée:',JSON.stringify(out));const c1=out.d1&&out.status==='soudee';
// ── 2) étape 2 SANS photo → refusée + appareil photo sollicité
await page.evaluate(()=>{const s=document.querySelector('#sheet');s.querySelector('#st2-meas').value='0.3';s.querySelector('#st2-masse').checked=true;s.querySelector('#st2-cont').checked=true;});
await page.evaluate(()=>document.querySelector('#sheet [data-stepok="2"]').click());await page.waitForTimeout(500);
out=await J();const cam2=await page.evaluate(()=>window.__cam.slice());console.log('2) étape 2 sans photo → refusée, caméra sollicitée:',JSON.stringify({...out,cam:cam2}));
const c2=!out.d2&&/[Pp]hoto/.test(out.toast)&&cam2.includes(2);
// ── 3) avec photo → validée (fils déclarés raccordés)
await page.evaluate(({L,PNG})=>{const j=window.TRACE.lines[L].cond.A.joints[1];j.steps[2]={...(j.steps[2]||{}),photos:[PNG]};},{L,PNG});
await open(1);await page.waitForTimeout(400);
await page.evaluate(()=>{const s=document.querySelector('#sheet');s.querySelector('#st2-meas').value='0.3';s.querySelector('#st2-masse').checked=true;s.querySelector('#st2-cont').checked=true;document.querySelector('#sheet [data-stepok="2"]').click();});await page.waitForTimeout(600);
out=await J();const wire=await page.evaluate(({L})=>window.TRACE.lines[L].cond.A.joints[1].wire,{L});console.log('3) étape 2 avec photo → validée:',JSON.stringify({...out,wire}));const c3=out.d2&&wire==='raccorde';
// ── 4) étape 3 : pression cochée mais SANS photo → refusée + caméra ; avec photo → validée (manchonnée)
await page.evaluate(()=>{const p=document.querySelector('#sheet #st3-press');p.checked=true;document.querySelector('#sheet [data-stepok="3"]').click();});await page.waitForTimeout(500);
out=await J();const cam3=await page.evaluate(()=>window.__cam.slice());console.log('4a) étape 3 sans photo → refusée, caméra sollicitée:',JSON.stringify({...out,cam:cam3}));const c4a=!out.d3&&/[Pp]hoto/.test(out.toast)&&cam3.includes(3);
await page.evaluate(({L,PNG})=>{const j=window.TRACE.lines[L].cond.A.joints[1];j.steps[3]={...(j.steps[3]||{}),photos:[PNG]};},{L,PNG});
await open(1);await page.waitForTimeout(400);
await page.evaluate(()=>{const p=document.querySelector('#sheet #st3-press');p.checked=true;document.querySelector('#sheet [data-stepok="3"]').click();});await page.waitForTimeout(600);
out=await J();console.log('4b) étape 3 avec photo → validée, manchonnée:',JSON.stringify(out));const c4b=out.d3&&out.status==='manchonnee';
// ── 5) étape 4 sans photo → passe (photo conseillée seulement)
await page.evaluate(()=>{const st4=[...document.querySelectorAll('#sheet .dstep')][3];st4.open=true;});await page.waitForTimeout(200);
await page.evaluate(()=>document.querySelector('#sheet [data-stepok="4"]').click());await page.waitForTimeout(600);
out=await J();console.log('5) étape 4 sans photo → passe:',JSON.stringify(out));const c5=out.d4;
// ── 6) consignes affichées dans la fiche
const hints=await page.evaluate(()=>{const t=document.querySelector('#sheet').textContent;return {h2:/fils sertis \+ lecture du testeur/.test(t),h3:/manchon rétracté \+ manomètre/.test(t),h4:/Photo conseillée/.test(t)};});
console.log('6) consignes « photo obligatoire » visibles:',JSON.stringify(hints));const c6=hints.h2&&hints.h3&&hints.h4;
const ALL=c1&&c2&&c3&&c4a&&c4b&&c5&&c6;
console.log('RESULTAT:',ALL?'TOUT VERT':'ECHEC '+JSON.stringify({c1,c2,c3,c4a,c4b,c5,c6}));
console.log(logs.length?logs:'[]');
await browser.close();process.exit(ALL?0:1);
