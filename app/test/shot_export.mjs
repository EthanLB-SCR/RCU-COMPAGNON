// captures : onglet Export, planche du plan des soudures numérotées, carnet (couverture + tableau + photos), plan interactif — sur le chantier de démo le plus fourni
import { chromium } from 'playwright';
import fs from 'node:fs';
const BASE=process.env.BASE||'http://localhost:8765';
const browser=await chromium.launch({headless:true, executablePath: process.env.CHROMIUM_PATH||undefined});
const ctx=await browser.newContext({viewport:{width:1100,height:1000}});const page=await ctx.newPage();page.on('dialog',d=>d.accept().catch(()=>{}));
const logs=[];page.on('pageerror',e=>logs.push('PAGEERROR: '+e.message.slice(0,300)));
await page.goto(BASE+'/');await page.waitForTimeout(1200);
const ids=await page.evaluate(()=>Object.keys(window.TRACE.sites));console.log('sites:',ids);
const pick=process.env.SITE||ids.find(i=>/bain/i.test(i))||ids[0];
await page.evaluate(id=>window.TRACE.go(id),pick);await page.waitForTimeout(3000);await page.selectOption('#roleSel','ethan');await page.waitForTimeout(300);
// quelques étapes documentées avec photos de démo pour que le carnet ait de la matière
await page.evaluate(()=>{const T=window.TRACE;const ls=Object.values(T.lines).filter(l=>l.cond&&l.cond.A).slice(0,3);let k=0;const d=h=>new Date(Date.now()-h*3600e3).toISOString();
  ls.forEach(l=>['A','R'].forEach(c=>{const cd=l.cond[c];if(!cd)return;cd.joints.slice(0,6).forEach((j,i)=>{k++;const who=k%2?'Karim B.':'Sofiane K.';const ph=n=>{const cv=document.createElement('canvas');cv.width=320;cv.height=240;const g=cv.getContext('2d');g.fillStyle=['#6b7280','#8d857a','#5b544b'][n%3];g.fillRect(0,0,320,240);g.fillStyle='#e9d36b';g.fillRect(60+n*20,80,200,60);g.fillStyle='#fff';g.font='bold 22px sans-serif';g.fillText(j.weldId+' · étape '+n,16,220);return cv.toDataURL('image/jpeg',.7);};
    j.steps={1:{done:true,by:who,at:d(200-k),photos:[ph(1)],proc:k%3?'tig':'cellulosique'},2:{done:true,by:who,at:d(190-k),photos:[ph(2)],dh:{meas:10+k/10,expected:10,iso:500}}};j.status='soudee';j.wire='raccorde';
    if(i<4){j.steps[3]={done:true,by:'Julien R.',at:d(100-k),photos:[ph(3)],type:i===3&&c==='A'?'extrude':'retracte',cause:i===3&&c==='A'?'enfiler':undefined,press:true};j.status='manchonnee';if(i===3&&c==='A')j.extru={cause:'enfiler',by:'Julien R.',at:d(100-k)};}
    if(i===1)j.steps[4]={done:true,by:'Julien R.',at:d(50-k),photos:[]};});}));T.renderAll();});
await page.evaluate(()=>{document.querySelector('#tabbar [data-tab=export]').click();});await page.waitForTimeout(500);
await page.screenshot({path:'shot_export_tab.png',fullPage:true});
const D=await page.evaluate(()=>{const D=window.TRACE.doe.data();return {n:D.welds.length,nDoc:D.nDoc,nPhotos:D.nPhotos,lines:D.lines.length};});console.log('data:',D);
const scale=+(process.env.SCALE||500);
const plan=await page.evaluate(sc=>window.TRACE.doe.plan(window.TRACE.doe.data(),{scale:sc,format:'A3',all:false}),scale);console.log('plan pages:',plan.nPages,plan.note||'');
fs.writeFileSync('/tmp/site/_plan.html',plan.html);
const pp=await ctx.newPage();await pp.setViewportSize({width:1600,height:1180});await pp.goto(BASE+'/_plan.html');await pp.waitForTimeout(800);
const secs=await pp.$$('section.pg');console.log('sections:',secs.length);
if(secs[0])await secs[0].screenshot({path:'shot_export_plan_decoupage.png'});
const tile=secs.length>1?secs[1]:secs[0];if(tile)await tile.screenshot({path:'shot_export_plan_planche.png'});
await pp.pdf({path:'shot_export_plan.pdf',preferCSSPageSize:true,printBackground:true}).catch(e=>console.log('pdf:',e.message));
await pp.close();
const carnet=await page.evaluate(sc=>{const D=window.TRACE.doe.data();const pl=window.TRACE.doe.plan(D,{scale:sc,format:'A3'});return window.TRACE.doe.carnet(D,{planches:pl.planches});},scale);
fs.writeFileSync('/tmp/site/_carnet.html',carnet);
const cp=await ctx.newPage();await cp.setViewportSize({width:1123,height:794});await cp.goto(BASE+'/_carnet.html');await cp.waitForTimeout(800);
const cs=await cp.$$('section.pg');console.log('carnet sections:',cs.length);
if(cs[0])await cs[0].screenshot({path:'shot_export_carnet_couv.png'});for(const [i,name] of [[1,'shot_export_carnet_table.png'],[2,'shot_export_carnet_photos.png']]){if(!cs[i])continue;await cs[i].scrollIntoViewIfNeeded();await cp.waitForTimeout(200);await cp.screenshot({path:name});} // la page défile jusqu'à la section : capture de la fenêtre (haut de la section)
await cp.pdf({path:'shot_export_carnet.pdf',preferCSSPageSize:true,printBackground:true}).catch(e=>console.log('pdf:',e.message));
await cp.close();
const viewer=await page.evaluate(()=>window.TRACE.doe.viewer(window.TRACE.doe.data(),{}));fs.writeFileSync('/tmp/site/_viewer.html',viewer);
const vp=await ctx.newPage();await vp.setViewportSize({width:1300,height:850});await vp.goto(BASE+'/_viewer.html');await vp.waitForTimeout(800);
await vp.screenshot({path:'shot_export_viewer_home.png'});
await vp.evaluate(()=>{const w=window.VIEW.data.welds.find(x=>x.extru)||window.VIEW.data.welds.find(x=>x.doc);window.VIEW.select(w.id);});await vp.waitForTimeout(500);
await vp.screenshot({path:'shot_export_viewer_weld.png'});
await vp.close();
console.log('viewer bytes:',viewer.length,'carnet bytes:',carnet.length,'plan bytes:',plan.html.length);
console.log(logs.length?logs:'[]');await browser.close();
