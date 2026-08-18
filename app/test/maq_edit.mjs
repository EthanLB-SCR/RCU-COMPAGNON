// Retouche dans le traceur : glisser un sommet, une vanne, une soudure (coupe forcée), insérer / supprimer un sommet, annuler
import { chromium } from 'playwright';
const BASE=process.env.BASE||'http://localhost:8765';
const browser=await chromium.launch({headless:true, executablePath: process.env.CHROMIUM_PATH||undefined});
const page=await browser.newPage({viewport:{width:1400,height:900}});const logs=[];page.on('pageerror',e=>logs.push('PAGEERROR: '+e.message.slice(0,300)));page.on('dialog',d=>d.accept());
await page.goto(BASE+'/traceur.html');await page.waitForTimeout(400);await page.evaluate(()=>{localStorage.clear();indexedDB.deleteDatabase('trace-kv');});await page.reload();await page.waitForTimeout(400);
await page.evaluate(()=>{const S=window.MAQ.state;S.lines=[{id:'L1',name:'L1',dn:100,bar:12,pts:[[10,50],[60,50],[60,80]],specials:[{id:'v1',type:'valve',m:20},{id:'pv1',type:'tee',vert:'up',m:35}],parent:null},{id:'L2',name:'A2',dn:65,bar:12,pts:[[40,50],[40,70]],specials:[],parent:{line:'L1',m:30,side:1}}];S.seq=3;window.MAQ.setMode('select');S.sel={kind:'line',id:'L1'};window.MAQ.rebuild();
  const W=document.querySelector('#svg').clientWidth,H=document.querySelector('#svg').clientHeight;const k=14;S.view={k,tx:W/2-40*k,ty:H/2-60*k};window.dispatchEvent(new Event('resize'));});
await page.waitForTimeout(300);
const toScreen=async(x,y)=>page.evaluate(([x,y])=>{const v=window.MAQ.state.view;const r=document.querySelector('#svg').getBoundingClientRect();return [r.left+x*v.k+v.tx,r.top+y*v.k+v.ty];},[x,y]);
const drag=async(x0,y0,x1,y1)=>{const a=await toScreen(x0,y0),b=await toScreen(x1,y1);await page.mouse.move(a[0],a[1]);await page.mouse.down();await page.mouse.move((a[0]+b[0])/2,(a[1]+b[1])/2,{steps:4});await page.mouse.move(b[0],b[1],{steps:6});await page.mouse.up();await page.waitForTimeout(250);};
// 1) glisser le sommet 1 (coude) de (60,50) à (64,54)
await drag(60,50,64,54);
let out=await page.evaluate(()=>({pts:window.MAQ.state.lines[0].pts.map(p=>p.map(v=>+v.toFixed(1))),antStart:window.MAQ.state.lines[1].pts[0].map(v=>+v.toFixed(2)),hist:true}));console.log('sommet glissé:',JSON.stringify(out));
// 2) glisser la vanne (PK 20 → vers PK 26)
const vpos=await page.evaluate(()=>{const B=window.MAQ.state.built.L1;const v=B.A.pieces.find(p=>p.kind==='valve');return [(v.path[0][0]+v.path[1][0])/2,(v.path[0][1]+v.path[1][1])/2];});
await drag(vpos[0],vpos[1],vpos[0]+6,vpos[1]);
out=await page.evaluate(()=>({valveM:window.MAQ.state.lines[0].specials.find(s=>s.id==='v1').m}));console.log('vanne glissée:',JSON.stringify(out));
// 3) glisser une soudure entre deux tubes (la première barre-barre de l'aller de L1) de +3 m
const wpos=await page.evaluate(()=>{const B=window.MAQ.state.built.L1;const cd=B.A;const w=cd.welds.find(w=>{const a=cd.pieces[w.i],b=cd.pieces[w.i+1];return a&&b&&a.kind==='tube'&&b.kind==='tube';});return {x:w.x,y:w.y,m:w.m,id:w.id};});
await drag(wpos.x,wpos.y,wpos.x+3,wpos.y);
out=await page.evaluate(()=>{const S=window.MAQ.state;const B=S.built.L1;return {cuts:(S.lines[0].cuts||[]).map(c=>+c.m.toFixed(2)),piecesA:B.A.pieces.slice(0,6).map(p=>p.id+'('+(p.L||0).toFixed(2)+')'),notes:B.A.notes.filter(n=>n.kind==='err').length};});console.log('soudure coulissée:',JSON.stringify(out),'depuis PK',wpos.m.toFixed(2));
// 4) double-clic sur l'axe → sommet inséré ; Suppr → supprimé ; Ctrl+Z → annule
const mid=await toScreen(30,50);await page.mouse.dblclick(mid[0],mid[1]);await page.waitForTimeout(300);
out=await page.evaluate(()=>({n:window.MAQ.state.lines[0].pts.length,selV:window.MAQ.state.selV}));console.log('inséré:',JSON.stringify(out));
{const vp=await page.evaluate(()=>window.MAQ.state.lines[0].pts[1]);const sc=await toScreen(vp[0],vp[1]);await page.mouse.click(sc[0],sc[1]);await page.waitForTimeout(150);}
await page.keyboard.press('Delete');await page.waitForTimeout(300);out=await page.evaluate(()=>({n:window.MAQ.state.lines[0].pts.length,lines:window.MAQ.state.lines.length}));console.log('supprimé:',JSON.stringify(out));
await page.keyboard.press('Control+z');await page.waitForTimeout(300);out=await page.evaluate(()=>({n:window.MAQ.state.lines[0].pts.length}));console.log('annulé (sommet revenu):',JSON.stringify(out));
// 5) Maj+clic deux sommets → bloc
await page.evaluate(()=>{const S=window.MAQ.state;S.selV=[];window.MAQ.rebuild();});
const v1=await toScreen(...(await page.evaluate(()=>window.MAQ.state.lines[0].pts[1])));const v2=await toScreen(...(await page.evaluate(()=>window.MAQ.state.lines[0].pts[2])));
await page.keyboard.down('Shift');await page.mouse.click(v1[0],v1[1]);await page.mouse.click(v2[0],v2[1]);await page.keyboard.up('Shift');await page.waitForTimeout(200);
const p1=await page.evaluate(()=>window.MAQ.state.lines[0].pts[1]);await drag(p1[0],p1[1],p1[0]+5,p1[1]);
out=await page.evaluate(()=>({pts:window.MAQ.state.lines[0].pts.map(p=>p.map(v=>+v.toFixed(1)))}));console.log('bloc glissé (sommets 1 et 2 ensemble):',JSON.stringify(out));
await page.screenshot({path:'maq_edit.png'});
// 6) enregistrer → appli : symbole de purge dessiné, soudures au premier plan
await page.click('#bSave');await page.waitForTimeout(200);await page.click('#svOk');await page.waitForTimeout(1200);await page.click('#svGo');await page.waitForTimeout(2000);
await page.mouse.move(700,500);for(let i=0;i<6;i++){await page.mouse.wheel(0,-250);await page.waitForTimeout(60);}await page.waitForTimeout(500);
out=await page.evaluate(()=>({polys:document.querySelectorAll('#net polygon').length,lastIsMarker:(()=>{const g=document.querySelector('#net');const kids=[...g.children];const last=kids[kids.length-1];return last&&last.className&&String(last.getAttribute('class')||'').includes('marker');})(),hits:document.querySelectorAll('#net g.el > path[stroke="transparent"]').length}));console.log('appli:',JSON.stringify(out));
await page.screenshot({path:'maq_edit_app.png'});
console.log(logs);await browser.close();
