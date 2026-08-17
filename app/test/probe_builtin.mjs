import { chromium } from 'playwright';
const browser=await chromium.launch({headless:true, executablePath: process.env.CHROMIUM_PATH||undefined});
const page=await browser.newPage({viewport:{width:1300,height:900}});
const logs=[];page.on('console',m=>{if(m.type()==='error'||m.type()==='warning')logs.push(m.type()+': '+m.text().slice(0,200));});page.on('pageerror',e=>logs.push('PAGEERROR: '+e.message.slice(0,300)));
await page.goto('file://'+new URL('../dist/index.html', import.meta.url).pathname);await page.waitForTimeout(800);
for(const site of ['bain','saintlo']){
  await page.evaluate(async s=>{await window.TRACE.switchSite(s);},site);await page.waitForTimeout(2500);
  const st=await page.evaluate(()=>{const o={lines:0,eng:0,pieces:0,follow:0,doubt:0,interp:0,notes:0,over12:0,tiny:0};Object.values(window.TRACE.lines).forEach(l=>{o.lines++;const E=l.engines?[l.engines.A,l.engines.R]:[l.engine];E.forEach(e=>{if(!e)return;o.eng++;o.pieces+=e.chain.length;e.chain.forEach(p=>{if(p.follow)o.follow++;if((p.kind==='tube')&&p.L>12.06)o.over12++;if(p.kind==='tube'&&p.L<.3)o.tiny++;});e.notes.forEach(n=>{o.notes++;if(n.kind==='doubt')o.doubt++;if(n.kind==='interp'&&/coude contre coude/.test(n.txt))o.interp++;});});});return o;});
  console.log(site,JSON.stringify(st));}
console.log('console:',logs.slice(0,5));
await browser.close();
