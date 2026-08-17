import { chromium } from 'playwright';
const browser=await chromium.launch({headless:true, executablePath: process.env.CHROMIUM_PATH||undefined});
const page=await browser.newPage();
await page.goto('file://'+new URL('../dist-maquette/index.html', import.meta.url).pathname);await page.waitForTimeout(500);
await page.evaluate(()=>{const S=window.MAQ.state;S.dn=100;S.bar=12;S.lines=[{id:'L1',name:'Ligne L1',dn:100,bar:12,pts:[[10,50],[60,50],[60,52],[110,52],[140,80]],specials:[],parent:null},{id:'L2',name:'Antenne L2',dn:50,bar:12,pts:[[85,52],[85,20],[100,20]],specials:[],parent:{line:'L1',m:75,side:1}}];S.seq=3;window.MAQ.rebuild();});await page.waitForTimeout(300);
const out=await page.evaluate(()=>{const S=window.MAQ.state;const B=S.built['L2'];const P=S.built['L1'];const tA=P.A.pieces.find(p=>p.kind==='tee'),tR=P.R.pieces.find(p=>p.kind==='tee');return {portA:tA&&tA.branchPort,portR:tR&&tR.branchPort,teeA:tA&&{x:tA.x,y:tA.y,mc:tA.mc,side:tA.side,path:tA.path,branch:tA.branch},L2A:B.A.pts,L2R:B.R.pts,axis:B.axis};});
console.log(JSON.stringify(out,null,1).slice(0,1500));
await browser.close();
