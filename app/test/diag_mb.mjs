import { chromium } from 'playwright';
const BASE='http://localhost:8765';
const browser=await chromium.launch({headless:true, executablePath: process.env.CHROMIUM_PATH||undefined});
const ctx=await browser.newContext({viewport:{width:900,height:940}});const page=await ctx.newPage();
await page.goto(BASE+'/traceur.html');await page.waitForTimeout(500);
await page.evaluate(()=>{localStorage.clear();});await page.reload();await page.waitForTimeout(500);
await page.evaluate(()=>{const S=window.MAQ.state;S.supplier='RENALIA';S.lines=[
  {id:'L1',name:'Feeder',dn:100,bar:12,pts:[[10,50],[120,50]],specials:[],parent:null},
  {id:'L2',name:'Antenne',dn:80,bar:12,pts:[[60,50],[60,80]],specials:[],parent:{line:'L1',m:50,side:1}}];S.seq=3;window.MAQ.setMode('select');window.MAQ.rebuild();});
await page.click('#bSave');await page.waitForTimeout(200);await page.fill('#svName','diag');await page.click('#svOk');await page.waitForTimeout(600);
await page.click('#svGo');await page.waitForTimeout(1200);await page.selectOption('#roleSel','ethan');await page.waitForTimeout(300);
await page.evaluate(()=>window.TRACE.centerOn(60.35,50.35,110));await page.waitForTimeout(500);
const r=await page.evaluate(()=>{const T=window.TRACE;const L1=Object.values(T.lines).find(l=>!l.parent);return ['A','R'].map(c=>{const e=L1.cond[c].els.find(x=>x.kind==='tee');const pl=e.axis[0];
  const Lax=pl.slice(1).reduce((s,p,i)=>s+Math.hypot(p.x-pl[i].x,p.y-pl[i].y),0);const b0={x:e.branch[0][0],y:e.branch[0][1]};
  // exact projection on first segment
  const a=pl[0],b=pl[pl.length-1];const vx=b.x-a.x,vy=b.y-a.y;const L2=vx*vx+vy*vy;const t=((b0.x-a.x)*vx+(b0.y-a.y)*vy)/L2;
  return {c,id:e.id,saut:e.saut,npts:pl.length,Lax:+Lax.toFixed(3),mBexact:+(t*Math.sqrt(L2)).toFixed(3),m0:e.m0,m1:e.m1,len:e.len,b0,axis:pl.map(p=>[+p.x.toFixed(3),+p.y.toFixed(3)]),casing:e.casing,dnb:e.dnb};});});
console.log(JSON.stringify(r,null,1));
await browser.close();
