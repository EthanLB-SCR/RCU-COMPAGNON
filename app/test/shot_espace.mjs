// capture : Mon espace (accueil, avatar) et Entreprise — personnage de démo hors connexion (Ethan L., administrateur), téléphone et large
import { chromium } from 'playwright';
const BASE=process.env.BASE||'http://localhost:8765';
const browser=await chromium.launch({headless:true, executablePath: process.env.CHROMIUM_PATH||undefined});
const ctx=await browser.newContext({viewport:{width:430,height:900}});const page=await ctx.newPage();
const errs=[];page.on('pageerror',e=>errs.push(e.message));page.on('console',m=>{if(m.type()==='error'&&!/supabase|Failed to fetch|net::ERR|404/i.test(m.text()))errs.push(m.text().slice(0,200));});
await page.goto(BASE+'/index.html');await page.waitForTimeout(600);await page.evaluate(()=>{localStorage.clear();});await page.reload();await page.waitForTimeout(1200);
const skip=async()=>{const s=await page.$('#loginSkip');if(s&&await s.isVisible())await s.click();await page.waitForTimeout(600);};await skip();
page.on('pageerror',e=>console.log('STACK',e.stack&&e.stack.split('\n').slice(0,3).join(' | ')));
const st=await page.evaluate(()=>({screen:window.TRACE.state.screen,tabs:[...document.querySelectorAll('.homeTabs button')].filter(b=>b.style.display!=='none').map(b=>b.id)}));console.log(JSON.stringify(st));
await page.evaluate(()=>document.getElementById('htEspace').click());await page.waitForTimeout(700);
await page.screenshot({path:'shot_espace_accueil.png'});
await page.evaluate(()=>{const b=[...document.querySelectorAll('#eq-app .eq-subs .chip')].find(x=>/Avatar/.test(x.textContent));b&&b.click();});await page.waitForTimeout(700);
await page.screenshot({path:'shot_espace_avatar.png'});
await page.evaluate(()=>document.getElementById('htEnt').click());await page.waitForTimeout(700);
await page.screenshot({path:'shot_espace_entreprise.png'});
await page.setViewportSize({width:1400,height:900});await page.evaluate(()=>{localStorage.setItem('trace:wide','1');});await page.reload();await page.waitForTimeout(1200);await skip();
await page.evaluate(()=>document.getElementById('htEspace').click());await page.waitForTimeout(700);await page.screenshot({path:'shot_espace_large.png'});
console.log(JSON.stringify({errs}));await browser.close();
