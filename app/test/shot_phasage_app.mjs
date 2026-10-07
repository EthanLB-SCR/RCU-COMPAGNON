import { chromium } from 'playwright';
const BASE=process.env.BASE||'http://localhost:8765';
const browser=await chromium.launch({headless:true, executablePath: process.env.CHROMIUM_PATH||undefined});
const ctx=await browser.newContext({viewport:{width:520,height:900},deviceScaleFactor:2});const page=await ctx.newPage();
page.on('dialog',d=>d.accept().catch(()=>{}));
await page.goto(BASE+'/traceur.html');await page.waitForTimeout(500);
await page.evaluate(()=>{localStorage.clear();});await page.reload();await page.waitForTimeout(500);
await page.evaluate(()=>{const S=window.MAQ.state;S.supplier='RENALIA';S.lines=[
  {id:'L1',name:'Rue de la Gare',dn:150,bar:12,pts:[[10,50],[130,50]],specials:[],parent:null},
  {id:'L2',name:'Impasse des Lilas',dn:80,bar:12,pts:[[70,50],[70,110]],specials:[],parent:{line:'L1',m:60,side:1}}];S.seq=3;window.MAQ.setMode('select');window.MAQ.rebuild();});
await page.click('#bSave');await page.waitForTimeout(200);await page.fill('#svName','Phasage démo');await page.click('#svOk');await page.waitForTimeout(600);
await page.click('#svGo');await page.waitForTimeout(1200);await page.selectOption('#roleSel','ethan');await page.waitForTimeout(300);
await page.evaluate(()=>{document.querySelector('#tabbar [data-tab="phasage"]').click();});await page.waitForTimeout(400);
await page.screenshot({path:'/tmp/ph_app_0.png'});
await page.evaluate(()=>document.querySelector('#phasage [data-phnew="ferme"]').click());await page.waitForTimeout(400);
const tapWorld=async(x,y)=>{await page.evaluate(([x,y])=>window.TRACE.centerOn(x,y,14),[x,y]);await page.waitForTimeout(150);const pt=await page.evaluate(([x,y])=>{const v=window.TRACE.state.view;const r=document.querySelector('#canvas').getBoundingClientRect();return {x:r.left+x*v.k+v.tx,y:r.top+y*v.k+v.ty};},[x,y]);await page.mouse.move(pt.x,pt.y);await page.mouse.down();await page.waitForTimeout(40);await page.mouse.up();await page.waitForTimeout(300);};
await tapWorld(35,50);await tapWorld(110,50);await tapWorld(70,80);
await page.evaluate(()=>{window.TRACE.fitViewAll&&window.TRACE.fitViewAll();});await page.evaluate(()=>window.TRACE.centerOn(70,65,4.2));await page.waitForTimeout(300);
await page.screenshot({path:'/tmp/ph_app_1.png'});
await page.evaluate(()=>document.querySelector('#phOk').click());await page.waitForTimeout(500);
await page.evaluate(()=>{const set=(k,i,v)=>{const inp=document.querySelector(`#phasage [data-phd="${k}"][data-i="${i}"]`);inp.value=v;inp.dispatchEvent(new Event('change',{bubbles:true}));};
  set('tr',0,'2026-10-12');set('tr',1,'2026-10-14');set('so',0,'2026-10-13');set('so',1,'2026-10-22');set('rb',0,'2026-10-15');set('rb',1,'2026-10-26');set('en',0,'2026-10-28');set('en',1,'2026-10-28');});
await page.waitForTimeout(400);
await page.evaluate(()=>{window.TRACE.phasage.importText('Rue de la Gare;12/10/2026;20/10/2026');const P=window.TRACE.net.phasage;P.phases[0].parent=P.phases[1].id;window.TRACE.state.phLv='ferme';window.TRACE.phasage.render();});await page.waitForTimeout(300);
await page.screenshot({path:'/tmp/ph_app_2.png'});
for(const [i,y] of [[3,760],[4,1500],[5,2300]]){await page.evaluate(y=>{const v=document.querySelector('#view-phasage');(v.scrollTop!==undefined)&&(v.scrollTop=y);const pd=document.querySelector('#phasage');if(pd.parentElement.scrollHeight>pd.parentElement.clientHeight)pd.parentElement.scrollTop=y;window.scrollTo(0,y);},y);await page.waitForTimeout(250);await page.screenshot({path:`/tmp/ph_app_${i}.png`});}
console.log('ok');await browser.close();
