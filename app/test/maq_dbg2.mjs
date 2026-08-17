import { chromium } from 'playwright';
const browser=await chromium.launch({headless:true, executablePath: process.env.CHROMIUM_PATH||undefined});
const page=await browser.newPage({viewport:{width:1400,height:900}});
await page.goto('file://'+new URL('../dist-maquette/index.html', import.meta.url).pathname);await page.waitForTimeout(400);
await page.evaluate(()=>{localStorage.clear();});await page.reload();await page.waitForTimeout(400);
const out=await page.evaluate(()=>{const S=window.MAQ.state;S.lines=[{id:'L1',name:'L1',dn:100,bar:12,pts:[[10,50],[60,50],[60,52],[110,52],[140,80]],specials:[],parent:null}];S.seq=2;window.MAQ.rebuild();const B=S.built.L1;return {rules:window.MAQ.rules,A:B.A.pieces.filter(p=>p.kind==='bend').map(p=>({id:p.id,angle:p.angle,real:p.angleReal,resid:p.resid,fc:p.fcWhere})),notes:B.A.notes.map(n=>n.kind+': '+n.txt)};});
console.log(JSON.stringify(out,null,1));
await browser.close();
