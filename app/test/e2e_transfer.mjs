// Transfert / remise à zéro d'une soudure : bouton fiche, cible touchée sur le plan, échange si la cible a des données, saisie par n°, Échap
import { chromium } from 'playwright';
const BASE=process.env.BASE||'http://localhost:8765';
const browser=await chromium.launch({headless:true, executablePath: process.env.CHROMIUM_PATH||undefined});
const ctx=await browser.newContext({viewport:{width:560,height:940}});const page=await ctx.newPage();
const logs=[];page.on('pageerror',e=>logs.push('PAGEERROR: '+e.message.slice(0,300)));page.on('console',m=>{if(m.type()==='error'&&!/supabase|Failed to fetch|net::ERR|404/i.test(m.text()))logs.push(m.text().slice(0,200));});
await page.goto(BASE+'/traceur.html');await page.waitForTimeout(500);await page.evaluate(()=>{localStorage.clear();});await page.reload();await page.waitForTimeout(500);
await page.evaluate(()=>{const S=window.MAQ.state;S.lines=[{id:'L1',name:'Feeder',dn:100,bar:12,pts:[[10,50],[70,50]],specials:[],parent:null}];S.seq=2;window.MAQ.setMode('select');window.MAQ.rebuild();});
await page.click('#bSave');await page.waitForTimeout(200);await page.fill('#svName','Transfert test');await page.click('#svOk');await page.waitForTimeout(800);await page.click('#svGo');await page.waitForTimeout(1500);
// S-0002 soudée avec photo ; ouvrir sa fiche
await page.evaluate(()=>{const T=window.TRACE;const j=T.state.lines.L1.cond.A.joints[1];j.status='soudee';j.events=[{type:'soudee',by:'Karim',at:new Date(),data:{procede:'141'},photos:[]}];j.photos=['x'];T.renderAll();T.openJoint('L1','A',1);});
await page.waitForTimeout(400);
let out=await page.evaluate(()=>({transfer:!!document.querySelector('#sheet [data-act=transfer]'),reset:!!document.querySelector('#sheet [data-act="reset-weld"]')}));console.log('boutons (soudeur):',JSON.stringify(out));
// transfert vers S-0004 en touchant le plan
await page.click('#sheet [data-act=transfer]');await page.waitForTimeout(400);
out=await page.evaluate(()=>({bar:getComputedStyle(document.querySelector('#transferBar')).display,from:document.querySelector('#tfFrom').textContent,pulse:!!document.querySelector('#net .tpulse')}));console.log('mode transfert:',JSON.stringify(out));
await page.evaluate(()=>{window.TRACE.centerOn(46,50,20);});await page.waitForTimeout(300);
await page.locator('#net g.marker[data-line="L1"][data-cond="A"][data-j="3"] path').first().click({force:true});await page.waitForTimeout(600);
out=await page.evaluate(()=>{const T=window.TRACE;const J=T.state.lines.L1.cond.A.joints;return {src:J[1].status+'/'+(J[1].photos||[]).length,dst:J[3].status+'/'+(J[3].photos||[]).length+'/'+(J[3].events||[]).map(e=>e.type).join('+'),bar:getComputedStyle(document.querySelector('#transferBar')).display,sheet:document.querySelector('#sheet').textContent.slice(0,30)};});
console.log('après transfert plan:',JSON.stringify(out));
// échange par n° : S-0004 (données) → transférer vers S-0002 ? non : depuis S-0004, cible S-0006 vide par n°, puis re-transfert vers soudure pleine = échange
await page.evaluate(()=>{window.TRACE.openJoint('L1','A',3);});await page.waitForTimeout(300);await page.click('#sheet [data-act=transfer]');await page.waitForTimeout(200);
await page.fill('#tfNum','6');page.on('dialog',d=>d.accept());await page.click('#tfGo');await page.waitForTimeout(600);
out=await page.evaluate(()=>{const J=window.TRACE.state.lines.L1.cond.A.joints;return {j3:J[3].status,j5:J[5].status+'/'+(J[5].photos||[]).length};});console.log('par n° :',JSON.stringify(out));
if(out.j5.startsWith('a_souder')){console.log('ÉCHEC transfert par n°');}
// remise à zéro (chef)
await page.selectOption('#roleSel','ethan');await page.waitForTimeout(200);await page.evaluate(()=>{window.TRACE.openJoint('L1','A',5);});await page.waitForTimeout(300);
out=await page.evaluate(()=>({reset:!!document.querySelector('#sheet [data-act="reset-weld"]')}));console.log('bouton reset (chef):',JSON.stringify(out));
await page.click('#sheet [data-act="reset-weld"]');await page.waitForTimeout(500);
out=await page.evaluate(()=>{const J=window.TRACE.state.lines.L1.cond.A.joints;return {j5:J[5].status+'/'+(J[5].photos||[]).length+'/'+(J[5].events||[]).length};});console.log('après reset:',JSON.stringify(out));
await page.screenshot({path:new URL('./e2e_transfer.png',import.meta.url).pathname});
console.log(logs);await browser.close();
