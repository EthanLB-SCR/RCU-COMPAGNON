// capture : les fils du plan interactif (DOE) suivent le plan d'ensemble — tube tourné à 180° (fils derrière, pointillés, côtés échangés), tube retourné, manchon inversé — sur le chantier saintlo (lignes DXF à axes propres)
import { chromium } from 'playwright';
import fs from 'node:fs';
const BASE=process.env.BASE||'http://localhost:8765';
const browser=await chromium.launch({headless:true, executablePath: process.env.CHROMIUM_PATH||undefined});
const ctx=await browser.newContext({viewport:{width:1100,height:800}});const page=await ctx.newPage();page.on('dialog',d=>d.accept().catch(()=>{}));
const logs=[];page.on('pageerror',e=>logs.push('PAGEERROR: '+e.message.slice(0,300)));
await page.goto(BASE+'/');await page.waitForTimeout(1200);
const Z=+(process.env.Z||70);
const pick=process.env.SITE||'saintlo';
for(let i=0;i<6;i++){await page.evaluate(id=>window.TRACE.go(id),pick);try{await page.waitForFunction(()=>window.TRACE.state.siteId&&window.TRACE.state.screen==='site'&&Object.keys(window.TRACE.lines).length>0,null,{timeout:4000});break;}catch(e){}}
await page.selectOption('#roleSel','ethan').catch(()=>{});await page.waitForTimeout(300);
// un tube tourné de 180°, le suivant retourné (miroir), le manchon entre les deux inversé ; étapes faites pour que la fiche ait de la matière
const info=await page.evaluate(()=>{const T=window.TRACE;const S=T.state;const L=Object.values(T.lines).filter(l=>l.cond&&l.cond.A&&l.cond.A.els.length>6&&l.sheetId===S.sheetId);const l=L.sort((a,b)=>b.cond.A.els.length-a.cond.A.els.length)[0];if(!l)return null;const cd=l.cond.A;
  let i=cd.els.findIndex((e,k)=>k>1&&e.kind!=='tee'&&e.kind!=='valve'&&e.kind!=='endcap'&&cd.els[k+1]&&cd.els[k+1].kind!=='tee'&&cd.els[k+1].kind!=='valve');if(i<0)i=2;
  const e1=cd.els[i],e2=cd.els[i+1];e1.rot=180;e2.flip=true;const j=cd.joints[i];const d=h=>new Date(Date.now()-h*3600e3).toISOString();
  j.steps={1:{done:true,by:'Karim B.',at:d(30),photos:[],proc:'tig'},2:{done:true,by:'Karim B.',at:d(20),photos:[],dh:{meas:12.4,expected:10,iso:500}}};j.status='soudee';j.wire='inversion';
  const jp=cd.joints[i-1];jp.steps={1:{done:true,by:'Karim B.',at:d(40),photos:[],proc:'tig'},2:{done:true,by:'Karim B.',at:d(35),photos:[],dh:{meas:11,expected:10,iso:500}}};jp.status='soudee';jp.wire='raccorde';
  S.show.fils=true;T.renderAll();const p=T.doe.data().welds.find(w=>w.id===j.weldId);return {line:l.name,i,own:!!e1.ownAxis,kinds:[e1.kind,e2.kind],weld:j.weldId,pos:p&&p.pos,sheet:S.sheetId};});
console.log('cible :',JSON.stringify(info));
// plan d'ensemble zoomé sur le manchon (référence visuelle)
await page.evaluate(info=>{const T=window.TRACE;const sh=T.state.sheets[T.state.sheetId];const ppm=sh.ppm||1;T.centerOn(info.pos[0]*ppm,info.pos[1]*ppm,info.Z/ppm);},{...info,Z});await page.waitForTimeout(600);
await page.screenshot({path:'shot_doe_fils_plan.png'});
// plan interactif du DOE : même endroit, même zoom
const html=await page.evaluate(()=>window.TRACE.doe.viewer(window.TRACE.doe.data(),{fond:true}));
fs.writeFileSync('/tmp/site/_viewer.html',html);
const pv=await ctx.newPage();await pv.setViewportSize({width:1100,height:800});await pv.goto(BASE+'/_viewer.html');await pv.waitForTimeout(800);
const r=await pv.evaluate(([id,Z])=>{select(id,true);const w=byId[id];center(w,Z);const k=svg.clientWidth/vb[2];const vis=[...document.querySelectorAll('#lods .lod')].find(g=>g.style.display!=='none');return {k:+k.toFixed(1),lod:vis&&vis.dataset.s,wires:vis?vis.querySelectorAll('.wires path').length:0,dashed:vis?vis.querySelectorAll('.wires path[stroke-dasharray]').length:0,winv:vis?vis.querySelectorAll('.winv').length:0,pipes:vis?vis.querySelectorAll('.pipes path').length:0};},[info.weld,Z]);
console.log('visionneuse :',JSON.stringify(r));
await pv.screenshot({path:'shot_doe_fils_viewer.png'});
await browser.close();console.log(logs.length?logs:'ok');
