import { chromium } from 'playwright';
const BASE='http://localhost:8765';
const browser=await chromium.launch({headless:true, executablePath: process.env.CHROMIUM_PATH||undefined});
const ctx=await browser.newContext({viewport:{width:520,height:860},deviceScaleFactor:2});const page=await ctx.newPage();
page.on('dialog',d=>d.accept().catch(()=>{}));
async function mk(sup,side,name){
  await page.goto(BASE+'/traceur.html');await page.waitForTimeout(500);
  await page.evaluate(()=>{localStorage.clear();});await page.reload();await page.waitForTimeout(500);
  await page.evaluate(([s2,sd])=>{const S=window.MAQ.state;S.supplier=s2;S.lines=[
    {id:'L1',name:'Feeder',dn:100,bar:12,pts:[[60,15],[60,90]],specials:[],parent:null},
    {id:'L2',name:'Antenne',dn:80,bar:12,pts:[[60,55],[sd>0?90:30,55]],specials:[],parent:{line:'L1',m:40,side:sd}}];S.seq=3;window.MAQ.setMode('select');window.MAQ.rebuild();},[sup,side]);
  await page.click('#bSave');await page.waitForTimeout(200);await page.fill('#svName',name);await page.click('#svOk');await page.waitForTimeout(700);
  await page.click('#svGo');await page.waitForTimeout(1400);await page.selectOption('#roleSel','ethan');await page.waitForTimeout(300);
  await page.evaluate(sd=>{const T=window.TRACE;T.centerOn(60+(sd>0?.9:-.9),55.2,150);T.renderAll();},side);await page.waitForTimeout(600);}
for(const [sd,tag] of [[-1,'gauche'],[1,'droite']]){
  await mk('RENALIA',sd,'Té antenne à '+tag);
  await page.evaluate(()=>{const T=window.TRACE;const L1=Object.values(T.lines).find(l=>!l.parent);const it=L1.cond.A.els.findIndex(x=>x.kind==='tee');const j=L1.cond.A.joints[it-1];
    j.steps={1:{done:true,by:'karim',at:new Date().toISOString(),photos:[],visuel:true}};j.status='soudee';T.openJoint(L1.id,'A',it-1);});
  await page.waitForTimeout(3500);
  const el=await page.$('#sheet svg[viewBox] >> nth=1');
  await page.evaluate(()=>{const sh=document.querySelector('#sheet');const w=[...sh.querySelectorAll('svg')].find(s=>/10 h/.test(s.textContent));if(w)w.scrollIntoView({block:'center'});});await page.waitForTimeout(400);
  await page.screenshot({path:`/tmp/shot_cut_${tag}.png`,animations:'disabled'});
  // retourné
  await page.evaluate(()=>{const b=document.querySelector('#sheet [data-teedownj]');if(b)b.click();});await page.waitForTimeout(600);
  await page.evaluate(()=>{const sh=document.querySelector('#sheet');const w=[...sh.querySelectorAll('svg')].find(s=>/8 h/.test(s.textContent));if(w)w.scrollIntoView({block:'center'});});await page.waitForTimeout(400);
  await page.screenshot({path:`/tmp/shot_cut_${tag}_ret.png`,animations:'disabled'});
}
console.log('ok');await browser.close();
