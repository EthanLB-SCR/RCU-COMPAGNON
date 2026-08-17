import { chromium } from 'playwright';
const browser=await chromium.launch({headless:true, executablePath: process.env.CHROMIUM_PATH||undefined});
const page=await browser.newPage({viewport:{width:1400,height:900}});
const logs=[];page.on('console',m=>{if(m.type()==='error'||m.type()==='warning')logs.push(m.type()+': '+m.text().slice(0,300));});page.on('pageerror',e=>logs.push('PAGEERROR: '+e.message.slice(0,400)));
await page.goto('file://'+new URL('../dist-maquette/index.html', import.meta.url).pathname);await page.waitForTimeout(500);
await page.evaluate(()=>{localStorage.clear();});await page.reload();await page.waitForTimeout(500);
await page.evaluate(()=>{const S=window.MAQ.state;S.lines=[];S.seq=1;S.view={k:6,tx:80,ty:80};window.dispatchEvent(new Event('resize'));window.MAQ.rebuild();});
const R=await page.evaluate(()=>{const r=document.querySelector('#svg').getBoundingClientRect();return {left:r.left,top:r.top};});
const W=(x,y)=>[R.left+80+x*6,R.top+80+y*6];const click=async(x,y)=>{const [sx,sy]=W(x,y);await page.mouse.move(sx,sy);await page.mouse.down();await page.mouse.up();await page.waitForTimeout(80);};
await page.click('#mTrace');await page.selectOption('#dn','100');
await click(10,50);await click(40,50);
// lyre par défaut (DN100 : bras 2,175 m sur l'axe, dos 3 m) via le bouton
await page.click('#tfLyre');await page.waitForSelector('#shOk');const defs=await page.evaluate(()=>({W:document.querySelector('#shW').value,H:document.querySelector('#shH').value}));console.log('lyre défauts DN100:',defs);await page.click('#shOk');await page.waitForTimeout(200);
// aimant de longueur : après la lyre, on continue tout droit ; puis un coude avec aimant « coude contre coude » : on vise ~1.9 m à 90°
await click(60,50);
const mags=await page.evaluate(()=>{const t=window.MAQ.state.tracing;return t.pts.map(p=>p.map(v=>+v.toFixed(2)));});console.log('sommets tracés:',JSON.stringify(mags));
// déplacer la souris à 90° vers le bas à ~1.9 m → l'aimant 2 m doit accrocher
const [mx,my]=W(60,51.9);await page.mouse.move(mx,my);await page.waitForTimeout(100);const magInfo=await page.evaluate(()=>{const t=window.MAQ.state.tracing;return {mag:t.mag&&t.mag.lbl,cursor:t.cursor&&t.cursor.map(v=>+v.toFixed(2)),nMag:(t.magnets||[]).length};});console.log('aimant actif:',magInfo);
await page.mouse.down();await page.mouse.up();await page.waitForTimeout(80);
await click(80,52);await page.keyboard.press('Enter');await page.waitForTimeout(400);
const info=await page.evaluate(()=>{const S=window.MAQ.state;const B=S.built['L1'];return ['A','R'].map(c=>c+': '+B[c].pieces.map(p=>p.id+(p.kind==='tube'?'('+p.L.toFixed(2)+(p.manchette?' m.':'')+')':p.kind==='bend'?'('+p.angle+'°,'+p.legIn.toFixed(2)+'+'+p.legOut.toFixed(2)+')':'('+p.kind+')')).join(' ')+' | notes: '+B[c].notes.map(n=>n.kind+':'+n.txt.slice(0,70)).join(' ; '));});
info.forEach(x=>console.log(x));
await page.click('#zFit');await page.waitForTimeout(300);await page.screenshot({path:new URL('./maq_lyre.png',import.meta.url).pathname});
await page.evaluate(()=>{const S=window.MAQ.state;const W=document.querySelector('#svg').clientWidth,H=document.querySelector('#svg').clientHeight;const k=45;S.view={k,tx:W/2-41.5*k,ty:H/2-49*k};window.dispatchEvent(new Event('resize'));});await page.waitForTimeout(300);await page.screenshot({path:new URL('./maq_lyre2.png',import.meta.url).pathname});
console.log('console:',logs);
await browser.close();
