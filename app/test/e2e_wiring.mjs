// Câblage du manchon en VUE DE PROFIL : toucher un fil amont puis un fil aval, inversion détectée,
// rotation amont/aval depuis le formulaire, vue lecture seule après validation,
// VERROU : une pièce manchonnée à un bout n'est plus orientable (fiche pièce + formulaire) ; té à saut haut/bas
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
// vue V2.3 : bouts de fils cliquables, fils tendus (paths), cordon + tranches, boutons amont ET aval
let out=await page.evaluate(()=>({pastA:!!document.querySelector('#sheet svg [data-wire="a:E"]'),pastB:!!document.querySelector('#sheet svg [data-wire="b:N"]'),
  fils:document.querySelectorAll('#sheet svg path[stroke-linecap="round"]').length,defs:!!document.querySelector('#sheet svg #wpsn'),
  rota:!!document.querySelector('#sheet [data-rota]'),rotb:!!document.querySelector('#sheet [data-rotb]'),conn:JSON.stringify(window.TRACE.state.conn)}));
console.log('form V2.3 (fils>5, defs true):',JSON.stringify(out));
// étamé amont → nu aval (inversion)
await page.click('#sheet g[data-wire="a:E"]');await page.waitForTimeout(150);await page.click('#sheet g[data-wire="b:N"]');await page.waitForTimeout(250);
out=await page.evaluate(()=>({conn:JSON.stringify(window.TRACE.state.conn),err:!!document.querySelector('#sheet .err'),sel:document.querySelector('#sheet select[data-conn="E"]').value}));console.log('après E→N:',JSON.stringify(out));
// remettre droit : E→E
await page.click('#sheet g[data-wire="a:E"]');await page.waitForTimeout(150);await page.click('#sheet g[data-wire="b:E"]');await page.waitForTimeout(250);
out=await page.evaluate(()=>({conn:JSON.stringify(window.TRACE.state.conn),ok:!!document.querySelector('#sheet .okbox')}));console.log('après E→E:',JSON.stringify(out));
// tourner le tube AVAL puis le tube AMONT depuis le formulaire
await page.click('#sheet [data-rotb="90"]');await page.waitForTimeout(250);
await page.click('#sheet [data-rota="90"]');await page.waitForTimeout(250);
out=await page.evaluate(()=>({aval:window.TRACE.state.lines.L1.cond.A.els[2].rot,amont:window.TRACE.state.lines.L1.cond.A.els[1].rot}));console.log('rot aval/amont (attendu 90/90):',JSON.stringify(out));
await page.click('#sheet [data-rota="-90"]');await page.waitForTimeout(250); // on remet l'amont droit
// pas de 15° (amont et aval)
await page.click('#sheet [data-rota="15"]');await page.waitForTimeout(200);await page.click('#sheet [data-rotb="-15"]');await page.waitForTimeout(200);
out=await page.evaluate(()=>({amont:window.TRACE.state.lines.L1.cond.A.els[1].rot,aval:window.TRACE.state.lines.L1.cond.A.els[2].rot}));console.log('pas 15° amont/aval (attendu 15/75):',JSON.stringify(out));
await page.click('#sheet [data-rota="-15"]');await page.waitForTimeout(200);await page.click('#sheet [data-rotb="15"]');await page.waitForTimeout(200);
await page.screenshot({path:new URL('./e2e_wiring.png',import.meta.url).pathname});
// valider (étanchéité + photo obligatoires) → vue lecture seule avec le câblage
await page.click('#sheet [data-sw="etanch"]');await page.waitForTimeout(100);await page.evaluate(()=>{window.TRACE.state.pendingPhotos.push('data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNkYAAAAAYAAjCB0C8AAAAASUVORK5CYII=');});
await page.click('#sheet [data-act="save-manchon"]');await page.waitForTimeout(600);
await page.evaluate(()=>{window.TRACE.openJoint('L1','A',1);});await page.waitForTimeout(400);
out=await page.evaluate(()=>({status:window.TRACE.state.lines.L1.cond.A.joints[1].status,wire:window.TRACE.state.lines.L1.cond.A.joints[1].wire,ro:document.querySelectorAll('#sheet svg').length}));console.log('après validation:',JSON.stringify(out));
// VERROU fiche pièce : els[2] est manchonnée en joint 1 → orientation figée (lockbox, pas de boutons), rot inchangée
await page.evaluate(()=>{window.TRACE.openEl('L1','A',2);});await page.waitForTimeout(400);
out=await page.evaluate(()=>({lockbox:!!document.querySelector('#sheet .lockbox'),btnRot:!!document.querySelector('#sheet [data-rot]'),rot:window.TRACE.state.lines.L1.cond.A.els[2].rot}));
console.log('verrou fiche pièce (lockbox true, btnRot false, rot 90):',JSON.stringify(out));
// pièce LIBRE : els[0] (aucun manchon voisin fermé) → dial animable + rotation OK
await page.evaluate(()=>{window.TRACE.openEl('L1','A',0);});await page.waitForTimeout(400);
out=await page.evaluate(()=>!!document.querySelector('#sheet #dialw')&&!!document.querySelector('#sheet [data-rot="90"]'));console.log('pièce libre — dial + boutons:',out);
await page.click('#sheet [data-rot="90"]');await page.waitForTimeout(600);out=await page.evaluate(()=>window.TRACE.state.lines.L1.cond.A.els[0].rot);console.log('rot pièce libre (attendu 90):',out);
// VERROU dans le formulaire manchon voisin : joint 2 (els 2-3) → amont figé (lockbox, pas de data-rota), aval libre (data-rotb)
await page.evaluate(()=>{const T=window.TRACE;T.state.lines.L1.cond.A.joints[2].status='soudee';T.openJoint('L1','A',2);});await page.waitForTimeout(400);
await page.click('#sheet [data-act="form-manchon"]');await page.waitForTimeout(400);
out=await page.evaluate(()=>({lockbox:!!document.querySelector('#sheet .lockbox'),rota:!!document.querySelector('#sheet [data-rota]'),rotb:!!document.querySelector('#sheet [data-rotb]')}));
console.log('verrou formulaire (lockbox true, rota false, rotb true):',JSON.stringify(out));
await page.click('#sheet [data-rotb="90"]');await page.waitForTimeout(250);
out=await page.evaluate(()=>window.TRACE.state.lines.L1.cond.A.els[3].rot);console.log('rot aval libre au joint 2 (attendu 90):',out);
await page.screenshot({path:new URL('./e2e_wiring_lock.png',import.meta.url).pathname});
await page.click('#sheet [data-act="close"]');await page.waitForTimeout(200);
// fiche pièce : té à saut haut/bas (côté R, aucun manchon fermé)
const teeIdx=await page.evaluate(()=>window.TRACE.state.lines.L1.cond.R.els.findIndex(e=>e.kind==='tee'&&e.saut));
if(teeIdx>=0){await page.evaluate(i=>{window.TRACE.openEl('L1','R',i);},teeIdx);await page.waitForTimeout(400);out=await page.evaluate(()=>!!document.querySelector('#sheet [data-saut="bas"]'));console.log('té à saut haut/bas:',out);await page.click('#sheet [data-saut="bas"]');await page.waitForTimeout(200);out=await page.evaluate(i=>window.TRACE.state.lines.L1.cond.R.els[i].sautDir,teeIdx);console.log('sautDir:',out);}
else console.log('pas de té à saut côté R (idx',teeIdx,')');
console.log(logs);await browser.close();
