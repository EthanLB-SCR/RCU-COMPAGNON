import { chromium } from 'playwright';
const BASE=process.env.BASE||'http://localhost:8765';
const browser=await chromium.launch({headless:true, executablePath: process.env.CHROMIUM_PATH||undefined});
const ctx=await browser.newContext({viewport:{width:520,height:900},deviceScaleFactor:2});const page=await ctx.newPage();
page.on('dialog',d=>d.accept().catch(()=>{}));
await page.goto(BASE+'/traceur.html');await page.waitForTimeout(500);
await page.evaluate(()=>{localStorage.clear();});await page.reload();await page.waitForTimeout(500);
await page.evaluate(()=>{const S=window.MAQ.state;S.supplier='RENALIA';S.lines=[
  {id:'L1',name:'Feeder',dn:100,bar:12,pts:[[10,50],[120,50]],specials:[],parent:null},
  {id:'L2',name:'Antenne',dn:80,bar:12,pts:[[60,50],[60,80]],specials:[],parent:{line:'L1',m:50,side:1}}];S.seq=3;window.MAQ.setMode('select');window.MAQ.rebuild();});
await page.click('#bSave');await page.waitForTimeout(200);await page.fill('#svName','DH sortie bouclée');await page.click('#svOk');await page.waitForTimeout(700);
await page.click('#svGo');await page.waitForTimeout(1400);await page.selectOption('#roleSel','ethan');await page.waitForTimeout(300);
// scénario S-2505 : fils bouclés entre eux à la sortie de té ; mesure depuis un manchon parent amont du té
await page.evaluate(()=>{const T=window.TRACE;const L2=Object.values(T.lines).find(l=>l.parent);const jO=L2.cond.A.joints[0];
  jO.loopA=true;jO.loopB=true;jO.conn={E:'X',N:'X'};jO.wire='raccorde';
  const L1=Object.values(T.lines).find(l=>!l.parent);const it=L1.cond.A.els.findIndex(x=>x.kind==='tee');
  // fils raccordés jusqu'au manchon de mesure pour une lecture réaliste
  for(let i=0;i<it-1;i++){const j=L1.cond.A.joints[i];if(j){j.wire='raccorde';j.conn={E:'E',N:'N'};}}
  T.state.locate.line=L1.id;T.state.locate.cond='A';T.state.dh.at={line:L1.id,idx:it-1};T.state.tab='bouclage';T.renderAll();});
await page.waitForTimeout(700);
await page.evaluate(()=>{const el=[...document.querySelectorAll('#bouclage h3,#bouclage b')].find(x=>/MESURE EN UN POINT|Mesure/i.test(x.textContent));if(el)el.scrollIntoView({block:'start'});});
await page.waitForTimeout(300);
await page.screenshot({path:'/tmp/shot_dhfix.png',animations:'disabled'});
console.log('ok');
await browser.close();
