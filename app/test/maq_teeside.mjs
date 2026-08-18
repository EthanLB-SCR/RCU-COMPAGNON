// Coquille Saint-Lô : la branche des tés automatiques partait toujours du côté +1 — antennes des DEUX côtés + parente en biais : la branche doit viser l'antenne
import { chromium } from 'playwright';
const browser=await chromium.launch({headless:true, executablePath: process.env.CHROMIUM_PATH||undefined});
const page=await browser.newPage({viewport:{width:1400,height:900}});
const logs=[];page.on('pageerror',e=>logs.push('PAGEERROR: '+e.message.slice(0,300)));
await page.goto('file://'+new URL('../dist-maquette/index.html', import.meta.url).pathname);await page.waitForTimeout(400);
await page.evaluate(()=>{localStorage.clear();});await page.reload();await page.waitForTimeout(400);
const out=await page.evaluate(()=>{const S=window.MAQ.state;
  S.lines=[{id:'L1',name:'Feeder',dn:100,bar:12,pts:[[10,50],[60,50],[90,75]],specials:[],parent:null},
    {id:'L2',name:'Haut',dn:50,bar:12,pts:[[25,50],[25,30]],specials:[],parent:{line:'L1',m:15,side:0}},   // antenne vers le HAUT (y-)
    {id:'L3',name:'Bas',dn:50,bar:12,pts:[[40,50],[40,72]],specials:[],parent:{line:'L1',m:30,side:0}},    // antenne vers le BAS (y+)
    {id:'L4',name:'Biais',dn:50,bar:12,pts:[[72,60],[85,45]],specials:[],parent:{line:'L1',m:65.6,side:0}}]; // sur le tronçon en biais, côté « droit »
  S.seq=5;window.MAQ.setMode('select');window.MAQ.rebuild();
  const r=[];['L2','L3','L4'].forEach(id=>{const l=S.lines.find(x=>x.id===id);const a1=window.MAQ.state.built[id].A.pts[1]||window.MAQ.state.built[id].A.pts[0];
    ['A','R'].forEach(c=>{const t=S.built.L1[c].pieces.find(p=>p.kind==='tee'&&p.sid==='auto:'+id);if(!t){r.push(id+'/'+c+': PAS DE TÉ');return;}
      const b=t.branch;const port=t.branchPort;const q1=l.pts[1];const mid=l.pts[0];
      // côté : la branche et l'antenne doivent être du même côté de la parente au droit du té
      const vAnt=[q1[0]-mid[0],q1[1]-mid[1]];const vBr=[b[1][0]-b[0][0],b[1][1]-b[0][1]];const dot=vAnt[0]*vBr[0]+vAnt[1]*vBr[1];
      // le port doit toucher le départ de la conduite d'antenne correspondante
      const cd=S.built[id][c];const d0=Math.hypot(cd.pts[0][0]-port.x,cd.pts[0][1]-port.y);
      r.push(`${id}/${c}: dot=${dot.toFixed(1)} ${dot>0?'OK':'MAUVAIS CÔTÉ'} · port→antenne ${d0.toFixed(2)} m ${d0<0.05?'OK':'DÉCROCHÉ'}${t.saut?' (saut)':''}`);});});
  return r;});
out.forEach(x=>console.log(x));
await page.evaluate(()=>{const S=window.MAQ.state;const W=document.querySelector('#svg').clientWidth,H=document.querySelector('#svg').clientHeight;const k=12;S.view={k,tx:W/2-50*k,ty:H/2-52*k};window.dispatchEvent(new Event('resize'));});
await page.waitForTimeout(300);await page.screenshot({path:new URL('./maq_teeside.png',import.meta.url).pathname});
console.log(logs);await browser.close();
