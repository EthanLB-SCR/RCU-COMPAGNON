import { chromium } from 'playwright';
const BASE=process.env.BASE||'http://localhost:8765';
const browser=await chromium.launch({headless:true, executablePath: process.env.CHROMIUM_PATH||undefined});
const ctx=await browser.newContext({viewport:{width:520,height:940},deviceScaleFactor:2});const page=await ctx.newPage();
page.on('dialog',d=>d.accept().catch(()=>{}));
await page.goto(BASE+'/traceur.html');await page.waitForTimeout(500);
await page.evaluate(()=>{localStorage.clear();});await page.reload();await page.waitForTimeout(500);
await page.evaluate(()=>{const S=window.MAQ.state;S.supplier='RENALIA';S.lines=[
  {id:'L1',name:'Feeder',dn:100,bar:12,pts:[[10,50],[110,50]],specials:[],parent:null}];S.seq=2;window.MAQ.setMode('select');window.MAQ.rebuild();});
await page.click('#bSave');await page.waitForTimeout(200);await page.fill('#svName','Shot loop');await page.click('#svOk');await page.waitForTimeout(700);
await page.click('#svGo');await page.waitForTimeout(1400);await page.selectOption('#roleSel','ethan');await page.waitForTimeout(300);
await page.evaluate(()=>{const T=window.TRACE;const L=Object.values(T.lines)[0];const j=L.cond.A.joints[1];
  j.steps={1:{done:true,by:'karim',at:new Date().toISOString(),photos:[],visuel:true}};j.status='soudee';T.openJoint(L.id,'A',1);});
await page.waitForTimeout(500);
const tap=s2=>page.evaluate(x=>{document.querySelector(x).dispatchEvent(new MouseEvent('click',{bubbles:true}));},s2);
await tap('#sheet g[data-wire="a:E"]');await page.waitForTimeout(200);
await tap('#sheet g[data-wire="a:N"]');await page.waitForTimeout(400);
await page.evaluate(()=>{const d=[...document.querySelectorAll('.dstep')][1];if(d){d.open=true;d.scrollIntoView({block:'start'});}});
await page.waitForTimeout(300);
const card=await page.evaluateHandle(()=>[...document.querySelectorAll('#sheet .card')].find(c=>c.querySelector('svg[viewBox="0 0 640 260"]')));
await (card.asElement()).screenshot({path:'/tmp/shot_loop_pont.png'});
// carte de prélèvement, zones éloignées
await page.evaluate(()=>{const T=window.TRACE;const s=T.net.stock||(T.net.stock={zones:[],lots:[],livs:[],moves:[],takes:[]});
  s.zones.push({id:'Z1',name:'Camion 1',x:28,y:44,w:6,h:3,rot:0,status:'ok'},{id:'Z2',name:'Base vie',x:96,y:57,w:6,h:3,rot:0,status:'ok'},
               {id:'Z3',name:'ZONE 2',x:93,y:55,w:5,h:3,rot:0,status:'ok'});
  s.livs.push({id:'V1',label:'Camion 1',bl:'BL-1',recuAt:new Date().toISOString()});
  ['Z1','Z2','Z3'].forEach((z,i)=>s.lots.push({id:'lot'+i,liv:'V1',zone:z,key:'pipe:100:12',label:'Barre DN100',kind:'pipe',dn:100,len:12,qty:5}));
  const L=Object.values(T.lines)[0];const j=L.cond.A.joints[2];T.openJoint(L.id,'A',2);});
await page.waitForTimeout(600);
await page.evaluate(()=>{const d=[...document.querySelectorAll('.dstep')][0];if(d){d.open=true;d.scrollIntoView({block:'start'});}});
await page.waitForTimeout(300);
const map=await page.evaluateHandle(()=>[...document.querySelectorAll('#sheet .card')].find(c=>c.querySelector('svg[preserveAspectRatio]')));
await (map.asElement()).screenshot({path:'/tmp/shot_loop_carte.png'});
console.log('captures ok');
await browser.close();
