// captures : en-tête du chantier + 3 facettes + « ＋ Poser » (12/10)
import { chromium } from 'playwright';
const BASE=process.env.BASE||'http://localhost:8765';
const browser=await chromium.launch({headless:true, executablePath: process.env.CHROMIUM_PATH||undefined});
const ctx=await browser.newContext({viewport:{width:430,height:900},deviceScaleFactor:2});const page=await ctx.newPage();const errs=[];page.on('pageerror',e=>errs.push(e.message));
const wait=ms=>page.waitForTimeout(ms);
await page.clock.install({time:new Date(2026,9,9,8,30,0)});
await page.goto(BASE+'/index.html');await wait(600);await page.evaluate(()=>{localStorage.clear();});await page.reload();await wait(1200);const s=await page.$('#loginSkip');if(s&&await s.isVisible())await s.click();await wait(700);
await page.evaluate(()=>{const T=window.TRACE;T.state.userId='ethan';T.renderHome();document.getElementById('htList').click();});await wait(400);
await page.evaluate(()=>{document.querySelector('.siteCard[data-open]').click();});await wait(1800);
await page.screenshot({path:'shot_facette_plan.png'});
await page.evaluate(()=>document.getElementById('planFab').click());await wait(300);await page.screenshot({path:'shot_facette_poser.png'});
await page.evaluate(()=>document.querySelector('#modal [data-pose-mode=obj]').click());await wait(300);await page.screenshot({path:'shot_facette_objsheet.png'});
await page.evaluate(()=>window.TRACE.closeModal&&window.TRACE.closeModal());await page.evaluate(()=>{document.querySelector('#modal [data-close]')&&document.querySelector('#modal [data-close]').click();});await wait(200);
await page.evaluate(()=>document.querySelector('#facets [data-facet=vie]').click());await wait(500);await page.screenshot({path:'shot_facette_vie.png'});
await page.evaluate(()=>document.querySelector('#facets [data-facet=tech]').click());await wait(500);await page.screenshot({path:'shot_facette_tech.png'});
console.log(errs.length?errs:'ok');await browser.close();
