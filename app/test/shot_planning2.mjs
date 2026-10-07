// capture : planning soudure & terrassement (grille) + tuiles ml dans la carte
import { chromium } from 'playwright';
const BASE=process.env.BASE||'http://localhost:8765';
const browser=await chromium.launch({headless:true, executablePath: process.env.CHROMIUM_PATH||undefined});
const ctx=await browser.newContext({viewport:{width:1000,height:1400}});const page=await ctx.newPage();
const logs=[];page.on('pageerror',e=>logs.push('PAGEERROR: '+e.message.slice(0,300)));
page.on('dialog',d=>d.accept().catch(()=>{}));
await page.goto(BASE+'/traceur.html');await page.waitForTimeout(500);
await page.evaluate(()=>{localStorage.clear();});await page.reload();await page.waitForTimeout(500);
await page.evaluate(()=>{const S=window.MAQ.state;S.supplier='RENALIA';S.lines=[
  {id:'L1',name:'Rue de la Gare',dn:150,bar:12,pts:[[10,50],[130,50]],specials:[],parent:null},
  {id:'L2',name:'Impasse des Lilas',dn:80,bar:12,pts:[[70,50],[70,110]],specials:[],parent:{line:'L1',m:60,side:1}}];S.seq=3;window.MAQ.setMode('select');window.MAQ.rebuild();});
await page.click('#bSave');await page.waitForTimeout(200);await page.fill('#svName','Planning test');await page.click('#svOk');await page.waitForTimeout(600);
await page.click('#svGo');await page.waitForTimeout(1200);await page.selectOption('#roleSel','ethan');await page.waitForTimeout(300);
await page.evaluate(()=>{document.querySelector('#tabbar [data-tab="phasage"]').click();});await page.waitForTimeout(300);
const tapWorld=async(x,y)=>{await page.evaluate(([x,y])=>window.TRACE.centerOn(x,y,30),[x,y]);await page.waitForTimeout(150);const pt=await page.evaluate(([x,y])=>{const v=window.TRACE.state.view;const r=document.querySelector('#canvas').getBoundingClientRect();return {x:r.left+x*v.k+v.tx,y:r.top+y*v.k+v.ty};},[x,y]);await page.mouse.move(pt.x,pt.y);await page.mouse.down();await page.waitForTimeout(40);await page.mouse.up();await page.waitForTimeout(300);};
await page.evaluate(()=>document.querySelector('#phasage [data-phnew="exe"]').click());await page.waitForTimeout(300);
await tapWorld(35,50);await tapWorld(100,50);await tapWorld(70,80);await page.evaluate(()=>document.querySelector('#phOk').click());await page.waitForTimeout(400);
await page.evaluate(()=>document.querySelector('#phasage [data-phnew="exe"]').click());await page.waitForTimeout(300);
await tapWorld(102,50);await tapWorld(128,50);await page.evaluate(()=>document.querySelector('#phOk').click());await page.waitForTimeout(400);
await page.evaluate(()=>{const T=window.TRACE;const P=T.net.phasage;const [p1,p2]=P.phases;
  p1.dates={tr:['2026-10-05','2026-10-09'],so:['2026-10-07','2026-10-16'],rb:['2026-10-12','2026-10-20'],en:['2026-10-22','2026-10-22']};p1.days=['2026-10-07','2026-10-08','2026-10-13','2026-10-14','2026-10-17'];p1.force=['2026-10-17'];
  p2.dates={tr:['2026-10-19','2026-10-21'],so:['2026-10-21','2026-10-29'],rb:['2026-10-26','2026-11-04'],en:['2026-11-10','2026-11-10']};
  T.state.phOpen=p1.id;T.phasage.render();});
await page.evaluate(()=>{document.querySelector('#app').classList.add('wide');});await page.waitForTimeout(300);
const el=await page.$('#phPlanning');await el.screenshot({path:'shot_planning2.png'});
const card=await page.$('#phasage [data-phc]');await card.screenshot({path:'shot_planning2_card.png'});
const info=await page.evaluate(()=>{const T=window.TRACE;const P=T.net.phasage;const C=T.phasage.calc([P.phases[0]],P.week);const L=T.phasage.loads(P);return {len:C.len,trDays:C.trDays,mlTr:C.mlTr,rbDays:C.rbDays,mlRb:C.mlRb,enDays:C.enDays,mlEn:C.mlEn,d5:L['2026-10-05'],d7:L['2026-10-07']&&L['2026-10-07'].so.map(x=>({per:x.per,theo:x.theo})),d21:L['2026-10-21']&&{so:L['2026-10-21'].so.map(x=>({per:x.per,theo:x.theo})),tr:L['2026-10-21'].tr.map(x=>x.ml)},sum:document.querySelector('#phPlanning td.sum').textContent};});
console.log(JSON.stringify(info,null,1));
// export
const [pop]=await Promise.all([page.waitForEvent('popup'),page.evaluate(()=>document.querySelector('#phExport').click())]);await pop.waitForLoadState('domcontentloaded');await pop.waitForTimeout(400);
await pop.setViewportSize({width:1000,height:1400});const pl=await pop.$('.phPlan');if(pl)await pl.screenshot({path:'shot_planning2_export.png'});
console.log(await pop.evaluate(()=>({h2:[...document.querySelectorAll('h2')].map(h=>h.textContent.trim().slice(0,40)),so:document.querySelectorAll('.phPlan .ld.so').length,tr:document.querySelectorAll('.phPlan .ld.tr').length,muted:[...document.querySelectorAll('.muted')].map(m=>m.textContent.slice(0,160))})));
await pop.close();
console.log(logs.length?logs:'[]');
await browser.close();
