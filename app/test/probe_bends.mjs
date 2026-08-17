import { chromium } from 'playwright';
const dxfPath=process.argv[2];
const browser=await chromium.launch({headless:true, executablePath: process.env.CHROMIUM_PATH||undefined});
const page=await browser.newPage({viewport:{width:1300,height:900}});
await page.goto('file://'+new URL('../dist/index.html', import.meta.url).pathname);await page.waitForTimeout(500);
await page.evaluate(()=>{const sel=document.querySelector('#roleSel');sel.value='ethan';sel.dispatchEvent(new Event('change'));});await page.waitForTimeout(300);
await page.evaluate(()=>document.querySelector('#btnImport').click());await page.waitForSelector('#planFile',{state:'attached'});
await page.setInputFiles('#planFile', dxfPath);await page.waitForFunction(()=>!!document.querySelector('#impGo'),null,{timeout:900000});
await page.click('#impGo');await page.waitForFunction(()=>window.TRACE&&Object.keys(window.TRACE.lines).length>0,null,{timeout:600000});await page.waitForTimeout(1500);
const out=await page.evaluate(()=>{const R=[];const stats={pieces:0,tubes:0,short:0,tiny:0,bends:0,seq:0};Object.values(window.TRACE.lines).forEach(l=>{const eng=l.engines?l.engines.A:l.engine;if(!eng)return;const ch=eng.chain;stats.pieces+=ch.length;
  // aussi : les éléments bruts (genLine) de la ligne
  const raw=l.els.map(e=>e.kind+':'+(e.len||0).toFixed(2)+(e.angle?'@'+e.angle:''));
  ch.forEach((p,i)=>{if(p.kind==='tube'||p.kind==='connector'){stats.tubes++;if(p.L<1)stats.short++;if(p.L<0.3)stats.tiny++;}if(p.kind==='bend')stats.bends++;
    if(p.kind==='bend'&&ch[i+1]&&ch[i+2]&&(ch[i+1].kind==='tube'||ch[i+1].kind==='connector')&&ch[i+1].L<3&&ch[i+2].kind==='bend'){stats.seq++;if(R.length<12)R.push(l.id+' : '+[i-1,i,i+1,i+2,i+3].map(k=>ch[k]?`${ch[k].id}(${ch[k].kind}${ch[k].angle?' '+ch[k].angle+'°':''} L=${(ch[k].L||0).toFixed(2)}${ch[k].interp?' '+ch[k].interp:''})`:'').join(' → '));}});
  if(R.length<14&&l.id==='A1')R.push('A1 raw els (extrait 30..60): '+raw.slice(30,60).join(' | '));});return {R,stats};});
console.log(out.stats);out.R.forEach(r=>console.log(' ',r));
await browser.close();
