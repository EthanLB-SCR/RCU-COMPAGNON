// Regard sur le fond DXF Indre dans le traceur : où sont les gros textes, qu'est-ce que la « bande » épaisse ?
import { chromium } from 'playwright';
const BASE='http://localhost:8765';const FILE=process.argv[2]||'/root/plans/indre.dxf';
const browser=await chromium.launch({headless:true, executablePath: process.env.CHROMIUM_PATH||undefined, args:['--js-flags=--max-old-space-size=4096']});
const page=await browser.newPage({viewport:{width:1300,height:800}});const logs=[];page.on('pageerror',e=>logs.push('PAGEERROR: '+e.message.slice(0,300)));page.on('dialog',d=>{logs.push('DIALOG: '+d.message().slice(0,200));d.accept();});
await page.goto(BASE+'/traceur.html');await page.waitForTimeout(400);await page.evaluate(()=>{localStorage.clear();indexedDB.deleteDatabase('trace-kv');});await page.reload();await page.waitForTimeout(400);
await page.setInputFiles('#bgFile',FILE);
await page.waitForFunction(()=>window.MAQ.state.bg&&window.MAQ.state.bg.drawing&&!document.querySelector('#prog'),null,{timeout:900000});await page.waitForTimeout(300);
const info=await page.evaluate(()=>{const b=window.MAQ.state.bg;const D=b.drawing;const texts=D.filter(d=>d.text);const hs=texts.map(t=>t.h).sort((a,b)=>a-b);const med=hs[Math.floor(hs.length/2)];const big=texts.filter(t=>t.h>med*4).slice(0,12).map(t=>t.text.slice(0,20)+' h='+t.h.toFixed(2)+' @'+Math.round(t.x)+','+Math.round(t.y)+' '+t.layer);
  const ph=texts.find(t=>/Phase 6/.test(t.text));const mat=texts.find(t=>/MATERN/.test(t.text));const dn=texts.filter(t=>/DN50/.test(t.text)).slice(0,3).map(t=>t.text+' h='+t.h.toFixed(2)+' @'+Math.round(t.x)+','+Math.round(t.y));
  const layers={};D.forEach(d=>{if(d.text)return;layers[d.layer]=(layers[d.layer]||0)+1;});const top=Object.entries(layers).sort((a,b)=>b[1]-a[1]).slice(0,25);
  return {n:D.length,texts:texts.length,med,big,ph:ph&&{h:ph.h,x:ph.x,y:ph.y,layer:ph.layer},mat:mat&&{t:mat.text,h:mat.h,x:mat.x,y:mat.y,layer:mat.layer},dn,top};});
console.log(JSON.stringify(info,null,1));
// vue centrée sur le texte « Phase 6 » à 12 px/m
if(info.ph){await page.evaluate(([x,y])=>{const S=window.MAQ.state;const W=document.querySelector('#svg').clientWidth,H=document.querySelector('#svg').clientHeight;const k=12;S.view={k,tx:W/2-x*k,ty:H/2-y*k};window.dispatchEvent(new Event('resize'));},[info.ph.x,info.ph.y]);await page.waitForTimeout(600);await page.screenshot({path:new URL('./dxf_look_phase.png',import.meta.url).pathname});
  // ce qui est dessiné dans cette fenêtre : calques des traits visibles
  const vis=await page.evaluate(()=>{const S=window.MAQ.state;const b=S.bg;const v=S.view;const W=document.querySelector('#svg').clientWidth,H=document.querySelector('#svg').clientHeight;const wx0=(-v.tx)/v.k,wy0=(-v.ty)/v.k,wx1=(W-v.tx)/v.k,wy1=(H-v.ty)/v.k;const lay={};let n=0;b.drawing.forEach((d,i)=>{const bb=b._bb[i];if(bb[2]<wx0||bb[0]>wx1||bb[3]<wy0||bb[1]>wy1)return;n++;const key=(d.text?'TXT ':'')+d.layer+(d.net?' [net]':'');lay[key]=(lay[key]||0)+1;});return {n,lay:Object.entries(lay).sort((a,b)=>b[1]-a[1]).slice(0,20)};});
  console.log('visible @Phase 6:',JSON.stringify(vis));}
// zooms autour d'un texte DN50 (réseau) : 12 / 21 / 40 px/m
const dn=await page.evaluate(()=>{const t=window.MAQ.state.bg.drawing.find(d=>d.text&&/DN50/.test(d.text)&&d.h<2);return t&&{x:t.x,y:t.y};});
for(const k of [12,21,40]){await page.evaluate(([x,y,k])=>{const S=window.MAQ.state;const W=document.querySelector('#svg').clientWidth,H=document.querySelector('#svg').clientHeight;S.view={k,tx:W/2-x*k,ty:H/2-y*k};window.dispatchEvent(new Event('resize'));},[dn.x,dn.y,k]);await page.waitForTimeout(700);
  const n=await page.evaluate(()=>({paths:document.querySelectorAll('#bg path').length,texts:document.querySelectorAll('#bg text').length,len:document.querySelector('#bg').innerHTML.length}));console.log('k',k,JSON.stringify(n));
  await page.screenshot({path:new URL(`./dxf_look_${k}.png`,import.meta.url).pathname});}
console.log(logs);await browser.close();
