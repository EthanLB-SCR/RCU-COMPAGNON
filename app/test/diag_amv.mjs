import { chromium } from 'playwright';
const BASE=process.env.BASE||'http://localhost:8765';
const browser=await chromium.launch({headless:true, executablePath: process.env.CHROMIUM_PATH||undefined});
const ctx=await browser.newContext({viewport:{width:520,height:900},deviceScaleFactor:2});const page=await ctx.newPage();
page.on('dialog',d=>d.accept().catch(()=>{}));
await page.goto(BASE+'/traceur.html');await page.waitForTimeout(500);
await page.evaluate(()=>{localStorage.clear();});await page.reload();await page.waitForTimeout(500);
// tronçon quasi VERTICAL (le cas où AVAL sortait du cadre)
await page.evaluate(()=>{const S=window.MAQ.state;S.supplier='RENALIA';S.lines=[
  {id:'L1',name:'Feeder',dn:100,bar:12,pts:[[50,10],[52,120]],specials:[],parent:null}];S.seq=2;window.MAQ.setMode('select');window.MAQ.rebuild();});
await page.click('#bSave');await page.waitForTimeout(200);await page.fill('#svName','AMV vertical');await page.click('#svOk');await page.waitForTimeout(700);
await page.click('#svGo');await page.waitForTimeout(1400);await page.selectOption('#roleSel','ethan');await page.waitForTimeout(300);
await page.evaluate(()=>{const T=window.TRACE;const L=Object.values(T.lines)[0];const j=L.cond.A.joints[4];
  j.steps={1:{done:true,by:'k',at:new Date().toISOString(),photos:[],visuel:true}};j.status='soudee';T.openJoint(L.id,'A',4);});
await page.waitForTimeout(600);
const small=await page.evaluate(()=>{const el=document.querySelector('#sheet [data-amvzoom]');if(!el)return {found:false};
  const t=el.innerHTML;return {found:true,amont:/AMONT/.test(t),aval:/AVAL/.test(t)};});
console.log('petite vue:',JSON.stringify(small));
await page.evaluate(()=>{const d=[...document.querySelectorAll('.dstep')][1];if(d){d.open=true;d.scrollIntoView({block:'start'});}});
await page.waitForTimeout(200);
const el=await page.$('#sheet [data-amvzoom]');
await el.screenshot({path:'/tmp/amv_small.png'});
await page.evaluate(()=>{document.querySelector('#sheet [data-amvzoom]').dispatchEvent(new MouseEvent('click',{bubbles:true}));});
await page.waitForTimeout(800);
const modal=await page.$('#modal');
await modal.screenshot({path:'/tmp/amv_modal.png'});
console.log('ok');
await browser.close();
