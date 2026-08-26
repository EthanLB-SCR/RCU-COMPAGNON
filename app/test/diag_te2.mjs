import { chromium } from 'playwright';
const BASE=process.env.BASE||'http://localhost:8765';
const browser=await chromium.launch({headless:true, executablePath: process.env.CHROMIUM_PATH||undefined});
const ctx=await browser.newContext({viewport:{width:700,height:700},deviceScaleFactor:2});const page=await ctx.newPage();
page.on('dialog',d=>d.accept().catch(()=>{}));
await page.goto(BASE+'/traceur.html');await page.waitForTimeout(500);
await page.evaluate(()=>{localStorage.clear();});await page.reload();await page.waitForTimeout(500);
// cas d'Ethan : la parente descend en biais, l'antenne sort en angle AIGU (presque parallèle), conduites serrées
await page.evaluate(()=>{const S=window.MAQ.state;S.supplier='RENALIA';S.lines=[
  {id:'L1',name:'Feeder',dn:100,bar:12,pts:[[80,10],[60,60],[55,95]],specials:[],parent:null},
  {id:'L2',name:'Antenne',dn:65,bar:12,pts:[[62,55],[20,58]],specials:[],parent:{line:'L1',m:54,side:-1}}];S.seq=3;window.MAQ.setMode('select');window.MAQ.rebuild();});
await page.click('#bSave');await page.waitForTimeout(200);await page.fill('#svName','Té aigu');await page.click('#svOk');await page.waitForTimeout(700);
await page.click('#svGo');await page.waitForTimeout(1400);await page.selectOption('#roleSel','ethan');await page.waitForTimeout(300);
await page.evaluate(()=>{const T=window.TRACE;const L1=Object.values(T.lines).find(l=>!l.parent);const e=L1.cond.A.els.find(x=>x.kind==='tee');T.centerOn((e.from.x+e.to.x)/2,(e.from.y+e.to.y)/2,80);T.renderAll();});
await page.waitForTimeout(600);
await page.screenshot({path:'/tmp/diag_te2.png',animations:'disabled'});
console.log('ok');
await browser.close();
