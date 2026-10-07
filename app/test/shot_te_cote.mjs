// Capture de contrôle 07/10 : fil plongeur CÔTÉ BRANCHE — antenne à gauche puis à droite du fût, té retourné, + coupe de la fiche manchon
import { chromium } from 'playwright';
const BASE=process.env.BASE||'http://localhost:8765';
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
await mk('RENALIA',1,'Té antenne à droite');
await page.screenshot({path:'/tmp/shot_te_droite.png',animations:'disabled'});
await page.evaluate(()=>{const T=window.TRACE;const L1=Object.values(T.lines).find(l=>!l.parent);['A','R'].forEach(c=>{const e=L1.cond[c].els.find(x=>x.kind==='tee');if(e)e.teeDown=true;});T.renderAll();});await page.waitForTimeout(500);
await page.screenshot({path:'/tmp/shot_te_droite_retourne.png',animations:'disabled'});
await mk('RENALIA',-1,'Té antenne à gauche');
await page.screenshot({path:'/tmp/shot_te_gauche.png',animations:'disabled'});
// coupe : manchon de fût contre le té (amont du té), conduite aller
await page.evaluate(()=>{const T=window.TRACE;const L1=Object.values(T.lines).find(l=>!l.parent);const it=L1.cond.A.els.findIndex(x=>x.kind==='tee');const j=L1.cond.A.joints[it-1];
  j.steps={1:{done:true,by:'karim',at:new Date().toISOString(),photos:[],visuel:true}};j.status='soudee';T.openJoint(L1.id,'A',it-1);});
await page.waitForTimeout(700);
await page.screenshot({path:'/tmp/shot_te_gauche_coupe.png',animations:'disabled',fullPage:false});
await page.evaluate(()=>{const sh=document.querySelector('#sheet');if(sh)sh.scrollTop=sh.scrollHeight*0.25;});await page.waitForTimeout(300);
await page.screenshot({path:'/tmp/shot_te_gauche_coupe2.png',animations:'disabled'});
await mk('LOGSTOR',-1,'LOGSTOR antenne à gauche');
await page.screenshot({path:'/tmp/shot_te_logstor_gauche.png',animations:'disabled'});
console.log('captures ok');
await browser.close();
