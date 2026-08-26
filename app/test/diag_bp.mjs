import { chromium } from 'playwright';
const BASE=process.env.BASE||'http://localhost:8765';
const browser=await chromium.launch({headless:true, executablePath: process.env.CHROMIUM_PATH||undefined});
const ctx=await browser.newContext({viewport:{width:520,height:700},deviceScaleFactor:2});const page=await ctx.newPage();
page.on('dialog',d=>d.accept().catch(()=>{}));
await page.goto(BASE+'/traceur.html');await page.waitForTimeout(500);
await page.evaluate(()=>{localStorage.clear();});await page.reload();await page.waitForTimeout(500);
await page.evaluate(()=>{const S=window.MAQ.state;S.supplier='RENALIA';S.lines=[
  {id:'L1',name:'Feeder',dn:100,bar:12,pts:[[10,50],[46,50]],specials:[],parent:null,endType:'bypass'}];S.seq=2;window.MAQ.setMode('select');window.MAQ.rebuild();});
await page.click('#bSave');await page.waitForTimeout(200);await page.fill('#svName','Diag bypass');await page.click('#svOk');await page.waitForTimeout(700);
await page.click('#svGo');await page.waitForTimeout(1400);await page.selectOption('#roleSel','ethan');await page.waitForTimeout(300);
const out=await page.evaluate(()=>{const T=window.TRACE;const L=Object.values(T.lines)[0];
  const bp=['A','R'].map(c=>L.cond[c]?L.cond[c].els.filter(e=>e.kind==='bypass').map(e=>({id:e.id,len:+(e.len||0).toFixed(2),ax:e.axis&&e.axis[0]&&e.axis[0].length,kindLabel:e.kindLabel||''})):[]);
  const last=L.cond.A.els[L.cond.A.els.length-1];T.centerOn(last.to.x,last.to.y,110);T.renderAll();return bp;});
console.log(JSON.stringify(out));
await page.waitForTimeout(600);
await page.screenshot({path:'/tmp/diag_bp.png',animations:'disabled'});
console.log('ok');
await browser.close();
