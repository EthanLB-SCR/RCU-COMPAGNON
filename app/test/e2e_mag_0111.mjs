// e2e_mag_0111 — 01/11 (Ethan : « ajout de sommet, il faut des aimants pour faire des angles à 90° ou tous les 15°, mais que l'aimant n'empêche pas de faire 16° »)
//  c1  glisser le sommet du milieu près de 45° / 45° : il s'accroche exactement (coudes de 45° aux deux bouts, 90° au sommet), cercle vert pendant le glisser
//  c2  zoomé, posé à 16° : il reste à 16° (l'aimant ne l'attrape pas)
//  c3  « G » coupe l'aimant : posé près de 45°, il reste où on l'a posé
//  c4  zéro erreur console
import { chromium } from 'playwright';
const BASE=process.env.BASE||'http://localhost:8765';
const browser=await chromium.launch();const page=await (await browser.newContext({viewport:{width:1280,height:900}})).newPage();
const logs=[];page.on('pageerror',e=>logs.push('PAGEERROR: '+e.message.slice(0,300)));page.on('console',m=>{if(m.type()==='error'&&!/supabase|Failed to fetch|net::ERR|404|WebSocket|pdf\.worker|cdnjs/i.test(m.text()))logs.push(m.text().slice(0,200));});
page.on('dialog',d=>d.accept().catch(()=>{}));
const C={};const J=x=>JSON.stringify(x);const wait=ms=>page.waitForTimeout(ms);const near=(a,b,t)=>Math.abs(a-b)<=t;
const toScreen=async(wx,wy)=>page.evaluate(([x,y])=>{const v=window.MAQ.state.view;const r=document.getElementById('svg').getBoundingClientRect();return [r.left+x*v.k+v.tx,r.top+y*v.k+v.ty];},[wx,wy]);
const clickW=async(x,y)=>{const s=await toScreen(x,y);await page.mouse.click(s[0],s[1]);await wait(120);};
const pts=()=>page.evaluate(()=>window.MAQ.state.lines.find(x=>x.id==='L1').pts.map(p=>[+p[0].toFixed(3),+p[1].toFixed(3)]));
const ang=(a,b)=>Math.atan2(b[1]-a[1],b[0]-a[0])*180/Math.PI;
const drag=async(from,to,mid)=>{const s=await toScreen(...from);const e=await toScreen(...to);await page.mouse.move(s[0],s[1]);await page.mouse.down();await page.mouse.move(s[0]+8,s[1]+8);await page.mouse.move(e[0],e[1],{steps:4});
  const g=mid?await page.evaluate(()=>!!document.querySelector('#svg .vmag')):null;await page.mouse.up();await wait(250);return g;};
const reset=async()=>{await page.evaluate(()=>{const M=window.MAQ;const l=M.state.lines.find(x=>x.id==='L1');l.pts=[[10,10],[40,10],[70,10]];M.state.sel={kind:'line',id:'L1'};M.state.view={k:6,tx:80,ty:80};M.applyView();M.rebuild();});await wait(150);};
await page.goto(BASE+'/traceur.html');await wait(600);await page.evaluate(()=>{localStorage.clear();localStorage.setItem('trace:wide','1');});await page.evaluate(()=>new Promise(r=>{try{const q=indexedDB.deleteDatabase('trace-kv');q.onsuccess=q.onerror=q.onblocked=()=>r();}catch(e){r();}}));
await page.reload();await wait(800);
await clickW(10,10);await clickW(40,10);await clickW(70,10);await page.keyboard.press('Enter');await wait(300);
await page.evaluate(()=>window.MAQ.setMode('select'));await wait(100);
const o={snap:await page.evaluate(()=>window.MAQ.state.snap)};
// c1 : près de 45° / 45° (à ~0,6 m du point exact)
await reset();o.g1=await drag([40,10],[40.5,39.5],true);o.p1=await pts();
o.a1={A:+ang(o.p1[0],o.p1[1]).toFixed(2),B:+ang(o.p1[2],o.p1[1]).toFixed(2)};
C.c1=o.snap>0&&o.g1===true&&near(o.p1[1][0],40,0.01)&&near(o.p1[1][1],40,0.01)&&near(o.a1.A,45,0.01)&&near(o.a1.B,135,0.01);
// c2 : zoomé (×5), posé à 16° depuis le départ
await reset();await page.evaluate(()=>{const M=window.MAQ;M.state.view={k:30,tx:640-40*30,ty:450-18*30};M.applyView();M.rebuild();});await wait(150);
const y16=10+30*Math.tan(16*Math.PI/180);o.g2=await drag([40,10],[40,y16],true);o.p2=await pts();o.a2=+ang(o.p2[0],o.p2[1]).toFixed(2);
C.c2=near(o.a2,16,0.05)&&o.g2===false;
// c3 : aimant coupé (G)
await reset();await page.keyboard.press('g');await wait(100);o.snapOff=await page.evaluate(()=>window.MAQ.state.snap);o.g3=await drag([40,10],[40.5,39.5],true);o.p3=await pts();await page.keyboard.press('g');await wait(100);o.snapBack=await page.evaluate(()=>window.MAQ.state.snap);
C.c3=o.snapOff===0&&!o.g3&&near(o.p3[1][0],40.5,0.25)&&near(o.p3[1][1],39.5,0.25)&&o.snapBack>0;
console.log('mesures :',J(o));
C.c4=!logs.length;if(logs.length)console.log('console :',logs);
await browser.close();
console.log('RÉSULTATS',J(C));const ko=Object.entries(C).filter(([,v])=>!v).map(([k])=>k);console.log(ko.length?'RESULTAT: ECHEC '+ko.join(' '):'RESULTAT: TOUT VERT');process.exit(ko.length?1:0);
