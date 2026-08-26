import { chromium } from 'playwright';
const BASE=process.env.BASE||'http://localhost:8765';
const browser=await chromium.launch({headless:true, executablePath: process.env.CHROMIUM_PATH||undefined});
const ctx=await browser.newContext({viewport:{width:520,height:800},deviceScaleFactor:2});const page=await ctx.newPage();
page.on('dialog',d=>d.accept().catch(()=>{}));
await page.goto(BASE+'/traceur.html');await page.waitForTimeout(500);
await page.evaluate(()=>{localStorage.clear();});await page.reload();await page.waitForTimeout(500);
await page.evaluate(()=>{const S=window.MAQ.state;S.supplier='RENALIA';S.lines=[
  {id:'L1',name:'Feeder',dn:100,bar:12,pts:[[10,50],[110,53]],specials:[],parent:null}];S.seq=2;window.MAQ.setMode('select');window.MAQ.rebuild();});
await page.click('#bSave');await page.waitForTimeout(200);await page.fill('#svName','Diag soudure');await page.click('#svOk');await page.waitForTimeout(700);
await page.click('#svGo');await page.waitForTimeout(1400);await page.selectOption('#roleSel','ethan');await page.waitForTimeout(300);
// P5 (élément aval du 4e manchon) tourné à 180°, soudure « à reprendre », comme chez Ethan
await page.evaluate(()=>{const T=window.TRACE;const L=Object.values(T.lines)[0];const j=L.cond.A.joints[3];const e=L.cond.A.els[4];
  e.rot=180;j.status='a_reprendre';j.events=[{type:'soudee',by:'karim',at:new Date(),photos:[]},{type:'controle',by:'ethan',at:new Date(),data:{result:'NOK'},photos:[]}];
  const p=L.cond.A.els[3];T.centerOn(p.to.x,p.to.y,180);T.renderAll();});
await page.waitForTimeout(600);
await page.screenshot({path:'/tmp/diag_soudure.png',animations:'disabled'});
// et la fiche de ce manchon, étape 2 (mini-vue + coupe)
await page.evaluate(()=>{const T=window.TRACE;const L=Object.values(T.lines)[0];const j=L.cond.A.joints[3];
  j.steps={1:{done:true,by:'karim',at:new Date().toISOString(),photos:[],visuel:true}};T.openJoint(L.id,'A',3);});
await page.waitForTimeout(500);
await page.evaluate(()=>{const d=[...document.querySelectorAll('.dstep')][1];if(d){d.open=true;d.scrollIntoView({block:'start'});}});
await page.waitForTimeout(300);
await page.screenshot({path:'/tmp/diag_fiche.png',animations:'disabled'});
console.log('ok');
await browser.close();
