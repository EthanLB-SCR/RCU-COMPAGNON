// Choix de zone AU DOIGT sur la carte (retour Ethan 25/08 soir) + Ø gaine sur les mousses.
import { chromium } from 'playwright';
const BASE=process.env.BASE||'http://localhost:8765';
const browser=await chromium.launch({headless:true, executablePath: process.env.CHROMIUM_PATH||undefined});
const ctx=await browser.newContext({viewport:{width:900,height:940}});const page=await ctx.newPage();
const logs=[];page.on('pageerror',e=>logs.push('PAGEERROR: '+e.message.slice(0,300)));page.on('console',m=>{if(m.type()==='error'&&!/supabase|Failed to fetch|net::ERR|404/i.test(m.text()))logs.push(m.text().slice(0,200));});
const PNG='data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg==';
await page.goto(BASE+'/traceur.html');await page.waitForTimeout(600);
await page.evaluate(()=>{localStorage.clear();});await page.reload();await page.waitForTimeout(600);
await page.evaluate(()=>{const S=window.MAQ.state;S.supplier='AXIOM';S.lines=[{id:'L1',name:'Feeder',dn:100,bar:12,pts:[[10,50],[110,50]],specials:[],parent:null}];S.seq=2;window.MAQ.setMode('select');window.MAQ.rebuild();});
await page.click('#bSave');await page.waitForTimeout(200);await page.fill('#svName','Stock3 test');await page.click('#svOk');await page.waitForTimeout(800);
await page.click('#svGo');await page.waitForTimeout(1500);await page.selectOption('#roleSel','ethan');await page.waitForTimeout(300);
const L=await page.evaluate(()=>Object.values(window.TRACE.lines).find(l=>!l.parent).id);
// deux zones : Z1 (loin, a les manchons+tubes+mousse) et Z2 (proche, a aussi la pièce) — le gars touche Z1 sur la carte
await page.evaluate(()=>{const T=window.TRACE;const st=T.net.stock||(T.net.stock={});
  st.zones=[{id:'Z1',name:'Base vie',x:90,y:70,w:10,h:5,status:'ok'},{id:'Z2',name:'Bord de fouille',x:20,y:54,w:8,h:4,status:'ok'}];
  st.livs=[{id:'LV1',label:'Camion 1',status:'ok',at:new Date().toISOString()}];
  st.lots=[{id:'A',liv:'LV1',zone:'Z1',key:'sleeve:100::200::',label:'Manchon DN100 · Ø200',kind:'sleeve',dn:100,gaine:200,qty:5},
           {id:'B',liv:'LV1',zone:'Z2',key:'sleeve:100::200::',label:'Manchon DN100 · Ø200',kind:'sleeve',dn:100,gaine:200,qty:3},
           {id:'C',liv:'LV1',zone:'Z1',key:'pipe:100:::12:',label:'Barre 12 m DN100',kind:'pipe',dn:100,len:12,qty:8},
           {id:'D',liv:'LV1',zone:'Z1',key:'pu:100::200::',label:'Mousse PU (A+B) DN100 · Ø200',kind:'pu',dn:100,gaine:200,qty:5}];
  st.takes=[];st.moves=[];T.renderAll();});
// 1) fiche étape 1 : la mini-carte est là — zones vertes touchables, la plus proche (Z2) pré-choisie, la soudure marquée
await page.evaluate(({L})=>{window.TRACE.openJoint(L,'A',1);setTimeout(()=>document.querySelectorAll('#sheet details').forEach(d=>d.open=true),60);},{L});
await page.waitForTimeout(500);
let out=await page.evaluate(()=>{const svgs=[...document.querySelectorAll('#sheet svg')].filter(s2=>s2.querySelector('rect[data-stkpick]'));
  const rects=[...document.querySelectorAll('#sheet svg rect[data-stkpick]')];
  return {maps:svgs.length,rects:rects.length,pre:rects.filter(r=>r.dataset.on==='1').map(r=>r.dataset.stkpick),soud:/la soudure/.test(document.querySelector('#sheet').textContent)};});
console.log('1) mini-carte dans l\'étape 1 (pièce + manchon):',JSON.stringify(out));
const c1=out.maps>=2&&out.rects>=4&&out.pre.length>=1&&out.soud;
// 2) TOUCHER Z1 (Base vie) sur la carte du manchon → la sélection bascule (carte + pastilles synchronisées)
await page.evaluate(()=>{const r=[...document.querySelectorAll('#sheet svg rect[data-stkpick="Z1"][data-stkneed="sleeve"]')][0];r.dispatchEvent(new MouseEvent('click',{bubbles:true}));});
await page.waitForTimeout(300);
out=await page.evaluate(()=>{const on=[...document.querySelectorAll('#sheet [data-stkpick][data-stkneed="sleeve"]')].filter(x=>x.dataset.on==='1');
  return {n:on.length,ids:[...new Set(on.map(x=>x.dataset.stkpick))],rect:on.some(x=>x instanceof SVGElement&&x.getAttribute('stroke')==='#eb6834'),chip:on.some(x=>!(x instanceof SVGElement))};});
console.log('2) tap Z1 → carte ET pastille passent sur Base vie:',JSON.stringify(out));
const c2=out.ids.length===1&&out.ids[0]==='Z1'&&out.rect&&out.chip;
// 3) valider l'étape 1 : le manchon vient bien de la zone TOUCHÉE (confirm car pas la plus proche → accepté)
page.on('dialog',d=>d.accept());
await page.evaluate(({L,PNG})=>{const j=window.TRACE.lines[L].cond.A.joints[1];j.steps={1:{photos:[PNG]}};},{L,PNG});
await page.evaluate(({L})=>{window.TRACE.openJoint(L,'A',1);setTimeout(()=>document.querySelectorAll('#sheet details').forEach(d=>d.open=true),60);},{L});
await page.waitForTimeout(500);
await page.evaluate(()=>{const r=[...document.querySelectorAll('#sheet svg rect[data-stkpick="Z1"][data-stkneed="sleeve"]')][0];r.dispatchEvent(new MouseEvent('click',{bubbles:true}));});
await page.waitForTimeout(250);
await page.evaluate(()=>{document.querySelector('#st1-vis').checked=true;document.querySelector('#sheet [data-stepok="1"]').click();});
await page.waitForTimeout(600);
out=await page.evaluate(()=>{const t=window.TRACE.net.stock.takes.filter(t2=>/^sleeve/.test(t2.key));return {n:t.length,zone:t[0]&&t[0].zone};});
console.log('3) manchon décompté de la zone touchée:',JSON.stringify(out));
const c3=out.n===1&&out.zone==='Z1';
// 4) étape 4 : la mousse s'affiche avec son Ø gaine
await page.evaluate(({L,PNG})=>{const T=window.TRACE;const j=T.lines[L].cond.A.joints[1];const now=new Date().toISOString();
  j.steps[2]={done:true,by:'t',at:now,photos:[]};j.steps[3]={done:true,by:'t',at:now,photos:[PNG],press:true,type:'retracte'};j.status='manchonnee';
  T.openJoint(L,'A',1);setTimeout(()=>document.querySelectorAll('#sheet details').forEach(d=>d.open=true),60);},{L,PNG});
await page.waitForTimeout(500);
out=await page.evaluate(()=>{const ds=[...document.querySelectorAll('#sheet .dstep')][3];return {lab:/Mousse PU \(A\+B\) DN100 · Ø\d+/.test(ds.textContent),map:!!ds.querySelector('svg rect[data-stkpick]')};});
console.log('4) mousse au moussage : Ø gaine affiché + carte:',JSON.stringify(out));
const c4=out.lab&&out.map;
const ALL=c1&&c2&&c3&&c4;
console.log('RESULTAT:',ALL?'TOUT VERT':'ECHEC '+JSON.stringify({c1,c2,c3,c4}));
console.log(logs.length?logs:'[]');
await browser.close();
process.exit(ALL?0:1);
