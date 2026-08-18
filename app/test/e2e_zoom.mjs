// Rendu de l'appli à différents zooms sur un réseau du traceur : rien ne doit disparaître, pas d'erreur
import { chromium } from 'playwright';
const BASE=process.env.BASE||'http://localhost:8765';
const browser=await chromium.launch({headless:true, executablePath: process.env.CHROMIUM_PATH||undefined});
const ctx=await browser.newContext({viewport:{width:560,height:940},deviceScaleFactor:1});const page=await ctx.newPage();
const logs=[];page.on('pageerror',e=>logs.push('PAGEERROR: '+e.message.slice(0,300)));page.on('console',m=>{if(m.type()==='error'&&!/supabase|Failed to fetch|net::ERR/i.test(m.text()))logs.push(m.text().slice(0,200));});
await page.goto(BASE+'/traceur.html');await page.waitForTimeout(500);
await page.evaluate(()=>{localStorage.clear();});await page.reload();await page.waitForTimeout(500);
// réseau : feeder DN100 avec vanne, purge, réduction, antenne DN80, kit fin de ligne
await page.evaluate(()=>{const S=window.MAQ.state;S.lines=[{id:'L1',name:'Feeder',dn:100,bar:12,pts:[[10,50],[70,50],[70,80]],specials:[{id:'v1',type:'valve',m:22},{id:'r1',type:'reducer',m:45},{id:'pv1',type:'tee',vert:'up',m:23.6},{id:'pv2',type:'tee',vert:'down',atEnd:true,m:0}],parent:null},{id:'L2',name:'A2',dn:80,bar:12,pts:[[40,50],[40,80]],specials:[],parent:{line:'L1',m:30,side:1}}];S.lines[0].specials[1].dn2=65;S.seq=3;window.MAQ.setMode('select');window.MAQ.rebuild();});
await page.click('#bSave');await page.waitForTimeout(200);await page.fill('#svName','Zoom test');await page.click('#svOk');await page.waitForTimeout(800);
await page.click('#svGo');await page.waitForTimeout(1500);await page.selectOption('#roleSel','karim');await page.waitForTimeout(300);
const dbg=await page.evaluate(()=>{const T=window.TRACE;const L=T.state.lines.L1;const els=L.cond.A.els;return {sel:document.querySelector('#siteSel').value,els:els.slice(0,12).map((e,i)=>i+':'+e.id+'/'+e.kind+'/'+(e.len||0).toFixed(2)+'/m0='+(e.m0!==undefined?e.m0.toFixed(2):'?')+'/bbox='+(e.bbox||[]).map(v=>Math.round(v*10)/10).join(',')),joints:L.cond.A.joints.slice(0,12).map((j,i)=>i+':'+j.idx+':'+j.weldId+'@'+j.m)};});
console.log(JSON.stringify(dbg,null,1));
// zooms successifs centrés sur la vanne (PK 22 du feeder)
for(const kpm of [4,8,15,25,40,80,160]){
  const out=await page.evaluate(k=>{const A=window.TRACE;A.centerOn(33,50,k);const svg=document.querySelector('#net');return {kpm:k,els:svg.querySelectorAll('g.el').length,markers:svg.querySelectorAll('g.marker').length,texts:svg.querySelectorAll('text').length,paths:svg.querySelectorAll('path').length,len:svg.innerHTML.length,zoom:document.querySelector('#zoominfo').textContent};},kpm);
  console.log(JSON.stringify(out));
  await page.waitForTimeout(150);await page.screenshot({path:new URL(`./e2e_zoom_${kpm}.png`,import.meta.url).pathname});
}
// panneau 👁 : cocher / décocher, persistance
await page.evaluate(()=>{window.TRACE.centerOn(33,50,25);});await page.waitForTimeout(100);
const cnt=async()=>page.evaluate(()=>{const svg=document.querySelector('#net');return {site:document.querySelector('#siteSel').value,els:svg.querySelectorAll('g.el').length,texts:svg.querySelectorAll('text').length,nums:svg.querySelectorAll('text.num').length,past:svg.querySelectorAll('g.marker line').length,rects:svg.querySelectorAll('g.marker rect').length,bg:document.querySelector('#bg').style.display};});
console.log('avant:',JSON.stringify(await cnt()));
await page.click('.zoomctl [data-z=eye]');await page.waitForTimeout(200);
let disp=await page.evaluate(()=>({show:document.querySelector('#disp').classList.contains('show'),labels:[...document.querySelectorAll('#disp label')].map(l=>l.textContent.trim()).length}));console.log('panneau:',JSON.stringify(disp));
await page.screenshot({path:new URL('./e2e_zoom_disp.png',import.meta.url).pathname});
await page.click('#disp input[data-k=pieces]');await page.waitForTimeout(100);await page.click('#disp input[data-k=cotes]');await page.waitForTimeout(100);console.log('sans pièces/cotes:',JSON.stringify(await cnt()));
await page.click('#disp input[data-k=nums]');await page.waitForTimeout(100);console.log('sans n°:',JSON.stringify(await cnt()));
await page.click('#disp input[data-k=soud]');await page.waitForTimeout(100);console.log('sans pastilles:',JSON.stringify(await cnt()));
await page.click('#disp input[data-k=manch]');await page.waitForTimeout(100);await page.click('#disp input[data-k=fond]');await page.waitForTimeout(100);console.log('sans manchons/fond:',JSON.stringify(await cnt()));
await page.screenshot({path:new URL('./e2e_zoom_epure.png',import.meta.url).pathname});
await page.reload();await page.waitForTimeout(1500);await page.evaluate(()=>{window.TRACE.centerOn(33,50,25);});await page.waitForTimeout(150);console.log('après rechargement (mémorisé):',JSON.stringify(await cnt()));
await page.click('.zoomctl [data-z=eye]');await page.waitForTimeout(100);await page.click('#disp [data-all="1"]');await page.waitForTimeout(150);console.log('tout:',JSON.stringify(await cnt()));
await page.click('#disp [data-all="0"]');await page.waitForTimeout(150);console.log('épuré:',JSON.stringify(await cnt()));
// un tap sur le plan referme le panneau
await page.mouse.click(200,400);await page.waitForTimeout(150);console.log('panneau fermé:',await page.evaluate(()=>!document.querySelector('#disp').classList.contains('show')));
console.log(logs);await browser.close();
