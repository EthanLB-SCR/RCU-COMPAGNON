// e2e_tp_3010.mjs — 30/10 (lot 2910e, traceur). Ethan : « fige les pièces (vannes, réductions…) qu'elles ne se décalent pas quand on rajoute des sommets ou bouge des sommets ».
//  c1  glisser un sommet (souris) : la vanne et la réduction de la ligne restent À LEUR PLACE EN PLAN (leur PK change, pas leur position) ; l'antenne accrochée en aval suit
//      la parente et SA vanne reste en place aussi
//  c2  sommet inséré sur un segment puis glissé : la pièce en aval ne bouge pas
//  c3  lyre insérée sur la ligne (allonge l'axe de 2 × profondeur) : la pièce en aval reste en place (PK augmenté d'autant) ; annulable (Ctrl+Z)
//  c4  console propre
import { chromium } from 'playwright';
const BASE=process.env.BASE||'http://localhost:8765';
const browser=await chromium.launch({headless:true, executablePath: process.env.CHROMIUM_PATH||undefined});
const C={};const logs=[];const J=x=>JSON.stringify(x);const near=(a,b,t)=>Math.abs(a-b)<=t;
const ctx=await browser.newContext({viewport:{width:1366,height:900},deviceScaleFactor:1});const page=await ctx.newPage();
page.on('pageerror',e=>logs.push('PAGEERROR: '+e.message.slice(0,300)));page.on('console',m=>{if(m.type()==='error'&&!/supabase|Failed to fetch|net::ERR|404|geopf|WebSocket/i.test(m.text()))logs.push(m.text().slice(0,200));});page.on('dialog',d=>d.accept().catch(()=>{}));
const wait=ms=>page.waitForTimeout(ms);
const toScreen=async(wx,wy)=>page.evaluate(([x,y])=>{const v=window.MAQ.state.view;const r=document.getElementById('svg').getBoundingClientRect();return [r.left+x*v.k+v.tx,r.top+y*v.k+v.ty];},[wx,wy]);
const drag=async(a,b)=>{const s=await toScreen(a[0],a[1]),e=await toScreen(b[0],b[1]);await page.mouse.move(s[0],s[1]);await page.mouse.down();await page.mouse.move(s[0]+4,s[1]+4);await page.mouse.move((s[0]+e[0])/2,(s[1]+e[1])/2);await page.mouse.move(e[0],e[1]);await page.mouse.up();await wait(300);};
const posOf=(id,m)=>page.evaluate(([id,m])=>{const l=window.MAQ.state.lines.find(x=>x.id===id);const pts=l.pts;let acc=0;for(let i=1;i<pts.length;i++){const s=Math.hypot(pts[i][0]-pts[i-1][0],pts[i][1]-pts[i-1][1]);if(acc+s>=m||i===pts.length-1){const t=s?Math.max(0,Math.min(1,(m-acc)/s)):0;return [+(pts[i-1][0]+(pts[i][0]-pts[i-1][0])*t).toFixed(2),+(pts[i-1][1]+(pts[i][1]-pts[i-1][1])*t).toFixed(2)];}acc+=s;}return null;},[id,m]);
const lineOf=id=>page.evaluate(id=>{const l=window.MAQ.state.lines.find(x=>x.id===id);return {pts:l.pts.map(p=>p.map(v=>+v.toFixed(2))),sp:(l.specials||[]).map(s=>({t:s.type,m:+s.m.toFixed(2)})),parentM:l.parent?+l.parent.m.toFixed(2):null};},id);
await page.goto(BASE+'/traceur.html');await wait(500);await page.evaluate(()=>{localStorage.clear();});await page.reload();await wait(600);
await page.evaluate(()=>{const S=window.MAQ.state;S.view={k:6,tx:150,ty:120};S.lines=[
  {id:'L1',name:'Feeder',dn:100,bar:12,pts:[[0,0],[0,50],[80,50]],specials:[{id:'V1',type:'valve',m:20},{id:'R1',type:'reducer',m:70,dn2:80}],parent:null},
  {id:'L2',name:'Antenne',dn:50,bar:12,pts:[[15,50],[15,80]],specials:[{id:'V2',type:'valve',m:10}],parent:{line:'L1',m:65,side:1}}];S.seq=3;window.MAQ.applyView();window.MAQ.setMode('select');S.sel={kind:'line',id:'L1'};window.MAQ.rebuild();});
await wait(300);
let o={before:{L1:await lineOf('L1'),L2:await lineOf('L2'),pV1:await posOf('L1',20),pR1:await posOf('L1',70),pV2:await posOf('L2',10)}};
/* ── c1 : sommet 1 (le coude) glissé de (0,50) à (0,60) */
await drag([0,50],[0,60]);
const L1=await lineOf('L1'),L2=await lineOf('L2');const r1=L1.sp.find(s=>s.t==='reducer'),v1=L1.sp.find(s=>s.t==='valve'),v2=L2.sp.find(s=>s.t==='valve');
o.after={L1,L2,pV1:await posOf('L1',v1.m),pR1:await posOf('L1',r1.m),pV2:await posOf('L2',v2.m),pStart2:L2.pts[0]};
console.log('c1) glisser :',J(o));
const d=(a,b)=>Math.hypot(a[0]-b[0],a[1]-b[1]);
C.c1=near(L1.pts[1][1],60,0.6)&&near(v1.m,20,0.3)&&d(o.after.pV1,o.before.pV1)<0.3&&r1.m>78&&r1.m<84&&d(o.after.pR1,o.before.pR1)<8&&Math.abs(o.after.pR1[0]-20)<2 /* la réduction est restée vers x = 20, pas repartie à 10 m du coude */
  &&L2.parentM>72&&L2.parentM<78&&Math.abs(L2.pts[0][0]-15)<1&&d(o.after.pV2,o.before.pV2)<0.8&&v2.m<5;
if(!C.c1)console.log('   c1 détail :',J({v1,r1,v2,parentM:L2.parentM}));
/* ── c2 : sommet inséré au PK 10 (1er segment, en (0,10)) puis glissé en (5,10) : l'axe s'allonge de 1,49 m en amont → la réduction (sur la 2e branche) reste à sa place en
      plan, son PK augmente d'autant ; avant : elle glissait de 1,49 m le long de la ligne */
await page.evaluate(()=>{window.MAQ.openAddModal('L1',10);});await wait(200);await page.selectOption('#addType','vertex');await page.evaluate(()=>{document.getElementById('addM').value='10';});await page.click('#addOk');await wait(300);
const mid=await lineOf('L1');const ins=mid.pts[1];const r1b=mid.sp.find(s=>s.t==='reducer');const pR1b=await posOf('L1',r1b.m);
await drag(ins,[ins[0]+5,ins[1]]);const L1c=await lineOf('L1');const r1c=L1c.sp.find(s=>s.t==='reducer');const pR1c=await posOf('L1',r1c.m);const dL=Math.hypot(5,10)+Math.hypot(5,L1c.pts[2][1]-10)-L1c.pts[2][1];
o={ins,pts:L1c.pts,r1b,r1c,pR1b,pR1c,dL:+dL.toFixed(2)};console.log('c2) sommet inséré puis glissé :',J(o));
C.c2=L1c.pts.length===4&&near(L1c.pts[1][0],5,0.6)&&d(pR1c,pR1b)<0.3&&near(r1c.m-r1b.m,dL,0.3);
/* ── c3 : lyre sur le Feeder au PK 25 (1er segment) : la vanne (PK 20 → avant la lyre) et la réduction restent en place ; Ctrl+Z la retire */
const pV1d=await posOf('L1',L1c.sp.find(s=>s.t==='valve').m),pR1d=pR1c;
await page.evaluate(()=>{window.MAQ.openAddModal('L1',30);});await wait(200);await page.selectOption('#addType','lyre');await page.evaluate(()=>{document.getElementById('addM').value='30';});await page.click('#addOk');await wait(250);
const H=await page.evaluate(()=>+document.getElementById('shH').value);await page.click('#shOk');await wait(350);
const L1e=await lineOf('L1');const v1e=L1e.sp.find(s=>s.t==='valve'),r1e=L1e.sp.find(s=>s.t==='reducer');const pV1e=await posOf('L1',v1e.m),pR1e=await posOf('L1',r1e.m);
await page.keyboard.press('Control+z');await wait(300);const L1f=await lineOf('L1');
o={n:L1e.pts.length,H,v1:v1e,r1:r1e,dV:+d(pV1e,pV1d).toFixed(2),dR:+d(pR1e,pR1d).toFixed(2),dm:+(r1e.m-r1c.m).toFixed(2),undoN:L1f.pts.length,undoR:L1f.sp.find(s=>s.t==='reducer').m};console.log('c3) lyre :',J(o));
C.c3=L1e.pts.length===8&&o.dV<0.3&&o.dR<0.6&&near(o.dm,2*H,0.6)&&L1f.pts.length===4&&near(o.undoR,r1c.m,0.01);
C.c4=!logs.length;if(logs.length)console.log('console :',logs);
console.log('RÉSULTATS',J(C));console.log('RESULTAT:',Object.values(C).every(Boolean)?'TOUT VERT':'ÉCHEC '+Object.keys(C).filter(k=>!C[k]).join(' '));await browser.close();process.exit(Object.values(C).every(Boolean)?0:1);
