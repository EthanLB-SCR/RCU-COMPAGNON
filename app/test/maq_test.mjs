import { chromium } from 'playwright';
const browser=await chromium.launch({headless:true, executablePath: process.env.CHROMIUM_PATH||undefined});
const page=await browser.newPage({viewport:{width:1400,height:900}});
const logs=[];page.on('console',m=>{if(m.type()==='error'||m.type()==='warning')logs.push(m.type()+': '+m.text().slice(0,300));});page.on('pageerror',e=>logs.push('PAGEERROR: '+e.message.slice(0,400)));
await page.goto('file://'+new URL('../dist-maquette/index.html', import.meta.url).pathname);await page.waitForTimeout(600);
await page.evaluate(()=>{localStorage.clear();});await page.reload();await page.waitForTimeout(600);
// tracer une ligne programmatique : L1 = polyligne avec un décrochement (baïonnette 2 m) et un angle 45°
await page.evaluate(()=>{const S=window.MAQ.state;S.dn=100;S.bar=12;S.lines=[];S.seq=1;
  S.lines.push({id:'L1',name:'Ligne L1',dn:100,bar:12,pts:[[10,50],[60,50],[60,52],[110,52],[140,80]],specials:[{id:'sp1',type:'valve',m:30},{id:'sp2',type:'reducer',m:100,dn2:80}],parent:null});
  S.lines.push({id:'L2',name:'Antenne L2',dn:50,bar:12,pts:[[85,52],[85,20],[100,20]],specials:[],parent:{line:'L1',m:75,side:1}});
  S.seq=3;window.MAQ.rebuild();});
await page.waitForTimeout(500);
await page.click('#zFit');await page.waitForTimeout(400);
const info=await page.evaluate(()=>{const S=window.MAQ.state;const out={};Object.entries(S.built).forEach(([id,B])=>{['A','R'].forEach(c=>{const cd=B[c];out[id+':'+c]={pieces:cd.pieces.map(p=>p.id+(p.kind==='tube'?'('+p.L.toFixed(2)+')':p.kind==='bend'?'('+p.angle+'°,'+p.legIn.toFixed(2)+'+'+p.legOut.toFixed(2)+')':'('+p.kind+')')).join(' '),welds:cd.welds.length,notes:cd.notes.map(n=>'['+n.kind+'] '+n.txt.slice(0,110))};});});return out;});
for(const [k,v] of Object.entries(info)){console.log('==',k,'| soudures',v.welds);console.log('  ',v.pieces);v.notes.forEach(n=>console.log('   ',n));}
await page.screenshot({path:new URL('./maq_1.png',import.meta.url).pathname});
// zoom sur la baïonnette
await page.evaluate(()=>{const S=window.MAQ.state;const W=document.querySelector('#svg').clientWidth,H=document.querySelector('#svg').clientHeight;const k=30;S.view={k,tx:W/2-60*k,ty:H/2-51*k};window.dispatchEvent(new Event('resize'));});await page.waitForTimeout(400);
await page.screenshot({path:new URL('./maq_2.png',import.meta.url).pathname});
// zoom sur le té
await page.evaluate(()=>{const S=window.MAQ.state;const W=document.querySelector('#svg').clientWidth,H=document.querySelector('#svg').clientHeight;const k=30;S.view={k,tx:W/2-85*k,ty:H/2-50*k};window.dispatchEvent(new Event('resize'));});await page.waitForTimeout(400);
await page.screenshot({path:new URL('./maq_3.png',import.meta.url).pathname});
console.log('console:',logs);
await browser.close();
