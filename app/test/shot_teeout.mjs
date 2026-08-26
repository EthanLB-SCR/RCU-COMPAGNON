import { chromium } from 'playwright';
const BASE=process.env.BASE||'http://localhost:8765';
const browser=await chromium.launch({headless:true, executablePath: process.env.CHROMIUM_PATH||undefined});
const ctx=await browser.newContext({viewport:{width:520,height:940},deviceScaleFactor:2});const page=await ctx.newPage();
page.on('dialog',d=>d.accept().catch(()=>{}));
await page.goto(BASE+'/traceur.html');await page.waitForTimeout(500);
await page.evaluate(()=>{localStorage.clear();});await page.reload();await page.waitForTimeout(500);
await page.evaluate(()=>{const S=window.MAQ.state;S.supplier='RENALIA';S.lines=[
  {id:'L1',name:'Feeder',dn:100,bar:12,pts:[[10,50],[120,50]],specials:[],parent:null},
  {id:'L2',name:'Antenne',dn:80,bar:12,pts:[[60,50],[60,80]],specials:[],parent:{line:'L1',m:50,side:1}}];S.seq=3;window.MAQ.setMode('select');window.MAQ.rebuild();});
await page.click('#bSave');await page.waitForTimeout(200);await page.fill('#svName','Sortie de té');await page.click('#svOk');await page.waitForTimeout(700);
await page.click('#svGo');await page.waitForTimeout(1400);await page.selectOption('#roleSel','ethan');await page.waitForTimeout(300);
await page.evaluate(()=>{const T=window.TRACE;const L2=Object.values(T.lines).find(l=>l.parent);const j=L2.cond.A.joints[0];
  j.steps={1:{done:true,by:'karim',at:new Date().toISOString(),photos:[],visuel:true}};j.status='soudee';T.openJoint(L2.id,'A',0);});
await page.waitForTimeout(600);
await page.evaluate(()=>{const d=[...document.querySelectorAll('.dstep')][1];if(d){d.open=true;d.scrollIntoView({block:'start'});}});
await page.waitForTimeout(300);
const card=await page.evaluateHandle(()=>[...document.querySelectorAll('#sheet .card')].find(c=>c.querySelector('svg[viewBox="0 0 640 260"]')));
await (card.asElement()).screenshot({path:'/tmp/shot_teeout.png'});
console.log('ok');
await browser.close();
