// coudes rapprochés à angles quelconques (60°, 47°…) : plus de trou — manchette nue (2 soudures, un manchon) et fausses coupes
import { chromium } from 'playwright';
const BASE=process.env.BASE||'http://localhost:8765';const browser=await chromium.launch({headless:true, executablePath: process.env.CHROMIUM_PATH||undefined});
const page=await browser.newPage({viewport:{width:1400,height:900}});const logs=[];page.on('pageerror',e=>logs.push('PAGEERROR: '+e.message.slice(0,300)));
await page.goto(BASE+'/traceur.html');await page.waitForTimeout(400);await page.evaluate(()=>{localStorage.clear();});await page.reload();await page.waitForTimeout(400);
// axe : segment de 2,1 m entre deux coudes (jambes 1+1 = 2 → écart 0,10 m) puis 2,05 m (écart 5 cm) — angles 62° et 47°
await page.evaluate(()=>{const S=window.MAQ.state;const d=x=>x*Math.PI/180;const p0=[10,50],p1=[40,50];const a1=d(62);const p2=[p1[0]+2.1*Math.cos(a1),p1[1]+2.1*Math.sin(a1)];const a2=a1-d(47);const p3=[p2[0]+2.05*Math.cos(a2),p2[1]+2.05*Math.sin(a2)];const a3=a2+d(30);const p4=[p3[0]+20*Math.cos(a3),p3[1]+20*Math.sin(a3)];
  S.lines=[{id:'L1',name:'L1',dn:100,bar:12,pts:[p0,p1,p2,p3,p4],specials:[],parent:null}];S.seq=2;window.MAQ.setMode('select');window.MAQ.rebuild();});
const out=await page.evaluate(()=>{const B=window.MAQ.state.built.L1;const r={};['A','R'].forEach(c=>{const cd=B[c];r[c]={pieces:cd.pieces.map(p=>p.id+(p.kind==='tube'?'('+p.L.toFixed(2)+(p.nue?' nue':p.manchette?' m':'')+')':p.kind==='bend'?'('+p.angle+'°/'+p.angleReal+',fc '+p.resid+','+p.legIn.toFixed(2)+'+'+p.legOut.toFixed(2)+')':'('+p.kind+')')).join(' '),welds:cd.welds.filter(w=>w.sleeve||w.fc).map(w=>w.id+(w.sleeve?' manchon:'+w.sleeve:'')+(w.fc?' FC'+w.dev:'')).join(' ; '),errs:cd.notes.filter(n=>n.kind==='err').map(n=>n.txt),notes:cd.notes.filter(n=>n.kind==='interp').map(n=>n.txt.slice(0,110))};});return r;});
console.log(JSON.stringify(out,null,1));
await page.evaluate(()=>{const S=window.MAQ.state;const W=document.querySelector('#svg').clientWidth,H=document.querySelector('#svg').clientHeight;const k=40;S.view={k,tx:W/2-41.5*k,ty:H/2-51.5*k};window.dispatchEvent(new Event('resize'));});await page.waitForTimeout(300);await page.screenshot({path:'maq_nue.png'});
console.log(logs);await browser.close();
