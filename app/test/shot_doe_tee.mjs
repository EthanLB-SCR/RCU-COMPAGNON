// capture : fils dans les tés — plan d'ensemble (référence) et plan DOE (1/200) côte à côte, antenne en série puis bouclée à sa tête (U)
import { chromium } from 'playwright';
import fs from 'node:fs';
const BASE=process.env.BASE||'http://localhost:8765';
const browser=await chromium.launch({headless:true, executablePath: process.env.CHROMIUM_PATH||undefined});
const ctx=await browser.newContext({viewport:{width:900,height:700}});const page=await ctx.newPage();page.on('dialog',d=>d.accept().catch(()=>{}));
await page.goto(BASE+'/traceur.html');await page.waitForTimeout(500);await page.evaluate(()=>{localStorage.clear();});await page.reload();await page.waitForTimeout(500);
await page.evaluate(()=>{const S=window.MAQ.state;S.supplier='RENALIA';S.lines=[{id:'L1',name:'Feeder',dn:100,bar:12,pts:[[10,50],[120,50]],specials:[],parent:null},{id:'L2',name:'Antenne',dn:80,bar:12,pts:[[60,50],[60,80]],specials:[],parent:{line:'L1',m:50,side:1}}];S.seq=3;window.MAQ.setMode('select');window.MAQ.rebuild();});
await page.click('#bSave');await page.waitForTimeout(200);await page.fill('#svName','Tee DOE');await page.click('#svOk');await page.waitForTimeout(700);await page.click('#svGo');await page.waitForTimeout(1800);await page.selectOption('#roleSel','ethan');await page.waitForTimeout(300);
const shoot=async(tag)=>{
  await page.evaluate(()=>{const T=window.TRACE;T.state.show.fils=true;T.state.tab='plan';T.renderAll();T.centerOn(60,51.2,160);});await page.waitForTimeout(500);
  await page.screenshot({path:`shot_doe_tee_plan_${tag}.png`,clip:{x:0,y:60,width:900,height:560}});
  const html=await page.evaluate(()=>window.TRACE.doe.viewer(window.TRACE.doe.data(),{fond:true}));fs.writeFileSync('/tmp/site/_viewer_tee.html',html);
  const pv=await ctx.newPage();await pv.setViewportSize({width:900,height:700});await pv.goto(BASE+'/_viewer_tee.html');await pv.waitForTimeout(800);
  await pv.evaluate(()=>{const w=D.welds.find(x=>x.line==='L2')||D.welds[0];const vw=svg.clientWidth/160,vh=svg.clientHeight/160;vb=[60-vw/2,51.2-vh/2,vw,vh];apply();});await pv.waitForTimeout(300);
  await pv.screenshot({path:`shot_doe_tee_doe_${tag}.png`,clip:{x:0,y:60,width:720,height:560}});await pv.close();};
await shoot('serie');
await page.evaluate(()=>{const T=window.TRACE;const ant=T.lines.L2;const j=ant.cond.A.joints[0];j.loopA=true;j.status='manchonnee';const jR=ant.cond.R.joints[0];jR.loopA=true;jR.status='manchonnee';T.renderAll();});
await shoot('boucle');
await browser.close();console.log('ok');
