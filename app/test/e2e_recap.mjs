// Onglet Récap : soudures par DN / ligne, nomenclature, manchons, CSV
import { chromium } from 'playwright';
const BASE=process.env.BASE||'http://localhost:8765';
const browser=await chromium.launch({headless:true, executablePath: process.env.CHROMIUM_PATH||undefined});
const ctx=await browser.newContext({viewport:{width:560,height:940},acceptDownloads:true});const page=await ctx.newPage();
const logs=[];page.on('pageerror',e=>logs.push('PAGEERROR: '+e.message.slice(0,300)));page.on('console',m=>{if(m.type()==='error'&&!/supabase|Failed to fetch|net::ERR|404/i.test(m.text()))logs.push(m.text().slice(0,200));});
await page.goto(BASE+'/traceur.html');await page.waitForTimeout(500);await page.evaluate(()=>{localStorage.clear();});await page.reload();await page.waitForTimeout(500);
await page.evaluate(()=>{const S=window.MAQ.state;S.lines=[{id:'L1',name:'Feeder',dn:100,bar:12,pts:[[10,50],[70,50],[70,80]],specials:[{id:'v1',type:'valve',m:22},{id:'r1',type:'reducer',m:45,dn2:65},{id:'pv1',type:'tee',vert:'up',m:23.6}],parent:null},{id:'L2',name:'A2',dn:80,bar:12,pts:[[40,50],[40,80]],specials:[],parent:{line:'L1',m:30,side:1}}];S.seq=3;window.MAQ.setMode('select');window.MAQ.rebuild();});
await page.click('#bSave');await page.waitForTimeout(200);await page.fill('#svName','Recap test');await page.click('#svOk');await page.waitForTimeout(800);await page.click('#svGo');await page.waitForTimeout(1500);
// quelques statuts
await page.evaluate(()=>{const T=window.TRACE;const js=T.allJoints();js.slice(0,6).forEach(x=>x.j.status='soudee');js.slice(6,9).forEach(x=>x.j.status='manchonnee');js.slice(9,10).forEach(x=>x.j.status='a_reprendre');});
await page.click('#tabbar [data-tab=recap]');await page.waitForTimeout(400);
const out=await page.evaluate(()=>{const el=document.querySelector('#recap');return {kpis:[...el.querySelectorAll('.kpi')].map(k=>k.textContent.trim().replace(/\s+/g,' ')),tables:el.querySelectorAll('table.rc').length,dnRows:[...el.querySelectorAll('table.rc')][0].querySelectorAll('tr').length,pieces:[...[...el.querySelectorAll('table.rc')][2].querySelectorAll('tr')].slice(1,8).map(r=>r.textContent.trim().replace(/\s+/g,' ')),manchons:[...[...el.querySelectorAll('table.rc')][3].querySelectorAll('tr')].slice(1).map(r=>r.textContent.trim().replace(/\s+/g,' '))};});
console.log(JSON.stringify(out,null,1));
await page.screenshot({path:new URL('./e2e_recap.png',import.meta.url).pathname,fullPage:true});
const [dl]=await Promise.all([page.waitForEvent('download'),page.click('#csvWelds')]);const path=await dl.path();const fs=await import('fs');const txt=fs.readFileSync(path,'utf8');console.log('csv:',dl.suggestedFilename(),txt.split('\n').length,'lignes ;',txt.split('\n').slice(0,3).join(' | ').slice(0,300));
console.log(logs);await browser.close();
