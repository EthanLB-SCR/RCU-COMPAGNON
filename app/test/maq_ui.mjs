import { chromium } from 'playwright';
const browser=await chromium.launch({headless:true, executablePath: process.env.CHROMIUM_PATH||undefined});
const page=await browser.newPage({viewport:{width:1400,height:900}});
const logs=[];page.on('console',m=>{if(m.type()==='error'||m.type()==='warning')logs.push(m.type()+': '+m.text().slice(0,300));});page.on('pageerror',e=>logs.push('PAGEERROR: '+e.message.slice(0,400)));
await page.goto('file://'+new URL('../dist-maquette/index.html', import.meta.url).pathname);await page.waitForTimeout(500);
await page.evaluate(()=>{localStorage.clear();});await page.reload();await page.waitForTimeout(500);
await page.evaluate(()=>{const S=window.MAQ.state;S.lines=[];S.seq=1;S.view={k:7,tx:0,ty:0};window.dispatchEvent(new Event('resize'));window.MAQ.rebuild();});
const R=await page.evaluate(()=>{const r=document.querySelector('#svg').getBoundingClientRect();return {left:r.left,top:r.top};});
const W=(x,y)=>[R.left+x*7,R.top+y*7];
const click=async(x,y,opts={})=>{const [sx,sy]=W(x,y);await page.mouse.move(sx,sy);await page.mouse.down();await page.mouse.up();await page.waitForTimeout(80);};
// mode tracer, DN100 : ligne L1 avec baïonnette de 2 m puis angle
await page.click('#mTrace');await page.selectOption('#dn','100');
for(const p of [[10,50],[60,50],[60,52],[110,52],[140,80]])await click(...p);
await page.keyboard.press('Enter');await page.waitForTimeout(300);
// antenne : premier clic SUR la ligne (x=83,y=52 → snap), puis vers le haut, puis à droite ; DN50
await page.selectOption('#dn','50');await click(83,52.3);await click(83,20);await click(100,20);await page.keyboard.press('Enter');await page.waitForTimeout(300);
// vanne sur L1 au PK ~30 (x=40,y=50)
await page.click('#mAdd');await click(40,50.2);await page.waitForSelector('#addOk');await page.selectOption('#addType','valve');await page.click('#addOk');await page.waitForTimeout(300);
const info=await page.evaluate(()=>{const S=window.MAQ.state;return {lines:S.lines.map(l=>({id:l.id,dn:l.dn,pts:l.pts.map(p=>p.map(v=>+v.toFixed(2))),parent:l.parent,specials:l.specials})),built:Object.fromEntries(Object.entries(S.built).map(([id,B])=>[id,['A','R'].map(c=>c+': '+B[c].pieces.map(p=>p.id+(p.kind==='tube'?'('+p.L.toFixed(2)+')':p.kind==='bend'?'('+p.angle+'°)':'('+p.kind+')')).join(' ')+' | notes: '+B[c].notes.map(n=>n.kind).join(','))]))};});
console.log(JSON.stringify(info.lines,null,0));for(const [k,v] of Object.entries(info.built)){console.log(k);v.forEach(x=>console.log('  ',x));}
await page.click('#zFit');await page.waitForTimeout(300);await page.screenshot({path:new URL('./maq_ui1.png',import.meta.url).pathname});
await page.evaluate(()=>{const S=window.MAQ.state;const W=document.querySelector('#svg').clientWidth,H=document.querySelector('#svg').clientHeight;const k=40;S.view={k,tx:W/2-83*k,ty:H/2-51*k};window.dispatchEvent(new Event('resize'));});await page.waitForTimeout(300);await page.screenshot({path:new URL('./maq_ui2.png',import.meta.url).pathname});
// clic sur une soudure et sur une pièce → panneau
await page.evaluate(()=>{const S=window.MAQ.state;S.sel={kind:'line',id:'L2'};S.tab='sel';window.MAQ.rebuild();});await page.waitForTimeout(200);const panel=await page.evaluate(()=>document.querySelector('#panel').innerText.slice(0,500));console.log('--- panneau ligne L2 ---\n'+panel);
console.log('console:',logs);
await browser.close();
