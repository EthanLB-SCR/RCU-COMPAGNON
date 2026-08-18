// Câblage virtuel du manchon : toucher un fil amont puis un fil aval, inversion détectée, rotation du tube aval, vue lecture seule après validation ; té à saut haut/bas
import { chromium } from 'playwright';
const BASE=process.env.BASE||'http://localhost:8765';
const browser=await chromium.launch({headless:true, executablePath: process.env.CHROMIUM_PATH||undefined});
const ctx=await browser.newContext({viewport:{width:560,height:940}});const page=await ctx.newPage();
const logs=[];page.on('pageerror',e=>logs.push('PAGEERROR: '+e.message.slice(0,300)));page.on('console',m=>{if(m.type()==='error'&&!/supabase|Failed to fetch|net::ERR|404/i.test(m.text()))logs.push(m.text().slice(0,200));});
await page.goto(BASE+'/traceur.html');await page.waitForTimeout(500);await page.evaluate(()=>{localStorage.clear();});await page.reload();await page.waitForTimeout(500);
await page.evaluate(()=>{const S=window.MAQ.state;S.lines=[{id:'L1',name:'Feeder',dn:100,bar:12,pts:[[10,50],[70,50]],specials:[],parent:null},{id:'L2',name:'A2',dn:80,bar:12,pts:[[40,50],[40,70]],specials:[],parent:{line:'L1',m:30,side:1}}];S.seq=3;window.MAQ.setMode('select');window.MAQ.rebuild();});
await page.click('#bSave');await page.waitForTimeout(200);await page.fill('#svName','Wiring test');await page.click('#svOk');await page.waitForTimeout(800);await page.click('#svGo');await page.waitForTimeout(1500);
await page.selectOption('#roleSel','julien');await page.waitForTimeout(300); // manchonneur
await page.evaluate(()=>{const T=window.TRACE;T.state.lines.L1.cond.A.joints[1].status='soudee';T.openJoint('L1','A',1);});await page.waitForTimeout(400);
await page.click('#sheet [data-act="form-manchon"]');await page.waitForTimeout(400);
let out=await page.evaluate(()=>({svg:!!document.querySelector('#sheet svg [data-wire="a:E"]'),conn:JSON.stringify(window.TRACE.state.conn)}));console.log('form:',JSON.stringify(out));
// étamé amont → nu aval (inversion)
await page.click('#sheet [data-wire="a:E"]');await page.waitForTimeout(150);await page.click('#sheet [data-wire="b:N"]');await page.waitForTimeout(250);
out=await page.evaluate(()=>({conn:JSON.stringify(window.TRACE.state.conn),err:!!document.querySelector('#sheet .err'),sel:document.querySelector('#sheet select[data-conn="E"]').value}));console.log('après E→N:',JSON.stringify(out));
// remettre droit : E→E
await page.click('#sheet [data-wire="a:E"]');await page.waitForTimeout(150);await page.click('#sheet [data-wire="b:E"]');await page.waitForTimeout(250);
out=await page.evaluate(()=>({conn:JSON.stringify(window.TRACE.state.conn),ok:!!document.querySelector('#sheet .okbox')}));console.log('après E→E:',JSON.stringify(out));
// tourner le tube aval
await page.click('#sheet [data-rotb="90"]');await page.waitForTimeout(250);
out=await page.evaluate(()=>window.TRACE.state.lines.L1.cond.A.els[2].rot);console.log('rot aval:',out);
await page.screenshot({path:new URL('./e2e_wiring.png',import.meta.url).pathname});
// valider (étanchéité + photo obligatoires) → vue lecture seule avec le câblage
await page.click('#sheet [data-sw="etanch"]');await page.waitForTimeout(100);await page.evaluate(()=>{window.TRACE.state.pendingPhotos.push('data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNkYAAAAAYAAjCB0C8AAAAASUVORK5CYII=');});
await page.click('#sheet [data-act="save-manchon"]');await page.waitForTimeout(600);
await page.evaluate(()=>{window.TRACE.openJoint('L1','A',1);});await page.waitForTimeout(400);
out=await page.evaluate(()=>({status:window.TRACE.state.lines.L1.cond.A.joints[1].status,wire:window.TRACE.state.lines.L1.cond.A.joints[1].wire,ro:document.querySelectorAll('#sheet svg').length}));console.log('après validation:',JSON.stringify(out));
// fiche pièce : rotation animée (groupe dialw) et té à saut
await page.evaluate(()=>{window.TRACE.openEl('L1','A',2);});await page.waitForTimeout(400);
out=await page.evaluate(()=>!!document.querySelector('#sheet #dialw'));console.log('dial animable:',out);
await page.click('#sheet [data-rot="90"]');await page.waitForTimeout(600);out=await page.evaluate(()=>window.TRACE.state.lines.L1.cond.A.els[2].rot);console.log('rot après clic (attendu 180):',out);
const teeIdx=await page.evaluate(()=>window.TRACE.state.lines.L1.cond.R.els.findIndex(e=>e.kind==='tee'&&e.saut));
if(teeIdx>=0){await page.evaluate(i=>{window.TRACE.openEl('L1','R',i);},teeIdx);await page.waitForTimeout(400);out=await page.evaluate(()=>!!document.querySelector('#sheet [data-saut="bas"]'));console.log('té à saut haut/bas:',out);await page.click('#sheet [data-saut="bas"]');await page.waitForTimeout(200);out=await page.evaluate(i=>window.TRACE.state.lines.L1.cond.R.els[i].sautDir,teeIdx);console.log('sautDir:',out);}
else console.log('pas de té à saut côté R (idx',teeIdx,')');
console.log(logs);await browser.close();
