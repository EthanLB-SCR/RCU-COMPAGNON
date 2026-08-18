// Onglet DH : récap de boucle (antenne en série), mesure en un point, paramètre Ω/km, bouton « mesurer ici » depuis la fiche
import { chromium } from 'playwright';
const BASE=process.env.BASE||'http://localhost:8765';
const browser=await chromium.launch({headless:true, executablePath: process.env.CHROMIUM_PATH||undefined});
const ctx=await browser.newContext({viewport:{width:560,height:940}});const page=await ctx.newPage();
const logs=[];page.on('pageerror',e=>logs.push('PAGEERROR: '+e.message.slice(0,300)));page.on('console',m=>{if(m.type()==='error'&&!/supabase|Failed to fetch|net::ERR|404/i.test(m.text()))logs.push(m.text().slice(0,200));});
await page.goto(BASE+'/traceur.html');await page.waitForTimeout(500);await page.evaluate(()=>{localStorage.clear();});await page.reload();await page.waitForTimeout(500);
await page.evaluate(()=>{const S=window.MAQ.state;S.lines=[{id:'L1',name:'Feeder',dn:100,bar:12,pts:[[10,50],[70,50],[70,80]],specials:[],parent:null},{id:'L2',name:'A2',dn:80,bar:12,pts:[[40,50],[40,70]],specials:[],parent:{line:'L1',m:30,side:1}}];S.seq=3;window.MAQ.setMode('select');window.MAQ.rebuild();});
await page.click('#bSave');await page.waitForTimeout(200);await page.fill('#svName','DH test');await page.click('#svOk');await page.waitForTimeout(800);await page.click('#svGo');await page.waitForTimeout(1500);
// raccorder les 5 premiers manchons de l'aller du feeder, une inversion au 3e
await page.evaluate(()=>{const T=window.TRACE;const L=T.state.lines.L1;L.cond.A.joints.slice(0,5).forEach((j,i)=>{j.wire=i===2?'inversion':'raccorde';j.conn=i===2?{E:'N',N:'E'}:{E:'E',N:'N'};});});
await page.click('#tabbar [data-tab=bouclage]');await page.waitForTimeout(400);
let out=await page.evaluate(()=>{const el=document.querySelector('#bouclage');const rows=[...el.querySelectorAll('#dh-rows tr')].slice(1).map(r=>r.textContent.trim().replace(/\s+/g,' '));return {ok:el.querySelector('.okbox')?el.querySelector('.okbox').textContent.replace(/\s+/g,' ').slice(0,200):null,n:rows.length,first:rows.slice(0,8),ant:rows.filter(r=>r.startsWith('↳')).length};});
console.log(JSON.stringify(out,null,1));
// mesure en un point : clic sur la 2e ligne
await page.click('#dh-rows tr[data-line]:nth-of-type(3)');await page.waitForTimeout(300);
out=await page.evaluate(()=>document.querySelector('#dh-mesure').textContent.replace(/\s+/g,' ').slice(0,420));console.log('mesure:',out);
await page.fill('#dh-meas','1.5');await page.click('#dh-check');await page.waitForTimeout(300);
out=await page.evaluate(()=>{const b=document.querySelector('#dh-mesure .okbox, #dh-mesure .warnbox');return b?b.textContent.replace(/\s+/g,' ').slice(0,200):null;});console.log('verdict:',out);
// paramètre Ω/km
await page.fill('#dh-rkm','20');await page.dispatchEvent('#dh-rkm','change');await page.waitForTimeout(300);
out=await page.evaluate(()=>({rkm:localStorage.getItem('trace:dh'),ok:document.querySelector('#bouclage .okbox').textContent.replace(/\s+/g,' ').slice(0,160)}));console.log('rkm 20:',JSON.stringify(out));
await page.screenshot({path:new URL('./e2e_dh.png',import.meta.url).pathname,fullPage:true});
// depuis la fiche soudure
await page.click('#tabbar [data-tab=plan]');await page.waitForTimeout(300);await page.evaluate(()=>{window.TRACE.openJoint('L2','A',1);});await page.waitForTimeout(400);
const hasBtn=await page.evaluate(()=>!!document.querySelector('#sheet [data-act="dh-here"]'));console.log('bouton fiche:',hasBtn);
await page.click('#sheet [data-act="dh-here"]');await page.waitForTimeout(400);
out=await page.evaluate(()=>({tab:document.querySelector('#tabbar .active').dataset.tab,point:(document.querySelector('#dh-mesure .kv')||{}).textContent}));console.log('après mesurer ici:',JSON.stringify(out));
console.log(logs);await browser.close();
