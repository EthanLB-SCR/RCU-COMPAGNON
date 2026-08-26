import { chromium } from 'playwright';
const BASE=process.env.BASE||'http://localhost:8765';
const browser=await chromium.launch({headless:true, executablePath: process.env.CHROMIUM_PATH||undefined});
const ctx=await browser.newContext({viewport:{width:520,height:860},deviceScaleFactor:2});const page=await ctx.newPage();
page.on('dialog',d=>d.accept().catch(()=>{}));
await page.goto(BASE+'/traceur.html');await page.waitForTimeout(500);
await page.evaluate(()=>{localStorage.clear();
  // pire cas : vieux réglages forcés « étamé » → ils doivent être IGNORÉS
  localStorage.setItem('trace:dh',JSON.stringify({rkm:12.5,isoMin:200,antWire:'E',tol:5,piqL:2}));});
await page.reload();await page.waitForTimeout(500);
await page.evaluate(()=>{const S=window.MAQ.state;S.supplier='RENALIA';S.lines=[
  {id:'L1',name:'Feeder',dn:100,bar:12,pts:[[10,50],[120,50]],specials:[],parent:null},
  {id:'L2',name:'Antenne',dn:80,bar:12,pts:[[60,50],[60,80]],specials:[],parent:{line:'L1',m:50,side:1}}];S.seq=3;window.MAQ.setMode('select');window.MAQ.rebuild();});
await page.click('#bSave');await page.waitForTimeout(200);await page.fill('#svName','Renalia té');await page.click('#svOk');await page.waitForTimeout(700);
await page.click('#svGo');await page.waitForTimeout(1400);await page.selectOption('#roleSel','ethan');await page.waitForTimeout(300);
await page.evaluate(()=>{const T=window.TRACE;const L2=Object.values(T.lines).find(l=>l.parent);L2.cond.A.joints[0].tee={mode:'serie',wire:'E'};T.centerOn(60.35,50.9,170);T.renderAll();});
await page.waitForTimeout(600);
await page.screenshot({path:'/tmp/shot_renalia_te.png',animations:'disabled'});
console.log('capture ok');
await browser.close();
