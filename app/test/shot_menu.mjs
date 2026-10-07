// captures : ruban simplifié + menu par catégories (vue téléphone)
import { chromium } from 'playwright';
const BASE=process.env.BASE||'http://localhost:8765';
const browser=await chromium.launch({headless:true, executablePath: process.env.CHROMIUM_PATH||undefined});
const ctx=await browser.newContext({viewport:{width:390,height:800},deviceScaleFactor:2,isMobile:true,hasTouch:true});const page=await ctx.newPage();page.on('dialog',d=>d.accept().catch(()=>{}));
const logs=[];page.on('pageerror',e=>logs.push('PAGEERROR: '+e.message.slice(0,300)));
await page.goto(BASE+'/traceur.html');await page.waitForTimeout(500);
await page.evaluate(()=>{localStorage.clear();});await page.reload();await page.waitForTimeout(500);
await page.evaluate(()=>{const S=window.MAQ.state;S.supplier='RENALIA';S.lines=[{id:'L1',name:'Rue de la Gare',dn:150,bar:12,pts:[[10,50],[60,50],[60,90],[130,90]],specials:[{id:'v1',type:'valve',m:30}],parent:null},{id:'L2',name:'Impasse des Lilas',dn:80,bar:12,pts:[[35,50],[35,10]],specials:[],parent:{line:'L1',m:25,side:1}}];S.seq=3;window.MAQ.setMode('select');window.MAQ.rebuild();});
await page.click('#bSave');await page.waitForTimeout(200);await page.fill('#svName','Rue de la Gare');await page.click('#svOk');await page.waitForTimeout(700);await page.click('#svGo');await page.waitForTimeout(1500);await page.selectOption('#roleSel','ethan');await page.waitForTimeout(400);
await page.screenshot({path:'shot_menu_plan.png'});
await page.evaluate(()=>document.querySelector('#btnMenu').click());await page.waitForTimeout(300);
await page.screenshot({path:'shot_menu_open.png'});
await page.evaluate(()=>{[...document.querySelectorAll('#filters .chip')].find(c=>c.dataset.f==='a_souder').click();});await page.waitForTimeout(300);
await page.screenshot({path:'shot_menu_filter.png'});
console.log(await page.evaluate(()=>({menuOpen:document.querySelector('#menu').classList.contains('show'),pill:document.querySelector('#planPills').textContent,tabs:[...document.querySelectorAll('#tabbar [data-tab]')].filter(b=>getComputedStyle(b).display!=='none').map(b=>b.textContent)})));
console.log(logs.length?logs:'[]');await browser.close();
