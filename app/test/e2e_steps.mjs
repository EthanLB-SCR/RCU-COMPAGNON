// MODÈLE UNIQUE (Ethan 25/08 : « deux modèles s'opposent ») : tout se déclare dans les 4 sous-étapes,
// les statuts du plan en découlent, les blocages sont les mêmes, et une soudure déclarée « à l'ancienne » coche ses étapes.
import { chromium } from 'playwright';
const BASE=process.env.BASE||'http://localhost:8765';
const browser=await chromium.launch({headless:true, executablePath: process.env.CHROMIUM_PATH||undefined});
const ctx=await browser.newContext({viewport:{width:900,height:940}});const page=await ctx.newPage();
const logs=[];page.on('pageerror',e=>logs.push('PAGEERROR: '+e.message.slice(0,300)));page.on('console',m=>{if(m.type()==='error'&&!/supabase|Failed to fetch|net::ERR|404/i.test(m.text()))logs.push(m.text().slice(0,200));});
const PNG='data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg==';
await page.goto(BASE+'/traceur.html');await page.waitForTimeout(600);
await page.evaluate(()=>{localStorage.clear();});await page.reload();await page.waitForTimeout(600);
await page.evaluate(()=>{const S=window.MAQ.state;S.supplier='AXIOM';S.lines=[{id:'L1',name:'Feeder',dn:100,bar:12,pts:[[10,50],[110,50]],specials:[],parent:null}];S.seq=2;window.MAQ.setMode('select');window.MAQ.rebuild();});
await page.click('#bSave');await page.waitForTimeout(200);await page.fill('#svName','Etapes test');await page.click('#svOk');await page.waitForTimeout(800);
await page.click('#svGo');await page.waitForTimeout(1500);await page.selectOption('#roleSel','ethan');await page.waitForTimeout(300);
const L=await page.evaluate(()=>Object.values(window.TRACE.lines).find(l=>!l.parent).id);
const open=i=>page.evaluate(({L,i})=>window.TRACE.openJoint(L,'A',i),{L,i});
// 1) procédés simplifiés : TIG ou Cellulosique, rien d'autre
await open(1);await page.waitForTimeout(500);
let out=await page.evaluate(()=>{const sel=document.querySelector('#st1-proc');return {opts:sel?[...sel.options].map(o=>o.textContent):null,gostep:!!document.querySelector('#sheet [data-gostep]'),ancien:!!document.querySelector('#sheet [data-act="form-soudee"]')};});
console.log('1) procédés TIG/Cellulo + bouton vers l\'étape (plus de formulaire parallèle):',JSON.stringify(out));
const c1=out.opts&&out.opts.length===2&&/TIG/.test(out.opts[0])&&/Cellulo/.test(out.opts[1])&&out.gostep&&!out.ancien;
// 2) blocage photo : valider l'étape 1 sans photo est refusé (même règle que l'ancien « Déclarer soudée »)
await page.evaluate(()=>document.querySelector('#sheet [data-stepok="1"]').click());await page.waitForTimeout(400);
out=await page.evaluate(({L})=>{const j=window.TRACE.lines[L].cond.A.joints[1];return {status:j.status,done:!!(j.steps&&j.steps[1]&&j.steps[1].done)};},{L});
console.log('2) étape 1 sans photo → refusée:',JSON.stringify(out));
const c2=out.status==='a_souder'&&!out.done;
// 3) avec photo → étape 1 validée ET le statut du plan passe « soudée » (un seul modèle)
await page.evaluate(p=>{const j=window.TRACE.lines[Object.keys(window.TRACE.lines)[0]];},PNG);
await page.evaluate(({L,PNG})=>{const j=window.TRACE.lines[L].cond.A.joints[1];j.steps=j.steps||{};j.steps[1]={photos:[PNG]};window.TRACE.renderAll();},{L,PNG});
await open(1);await page.waitForTimeout(400);
await page.evaluate(()=>{const s=document.querySelector('#sheet');s.querySelector('#st1-proc').value='cellu';s.querySelector('#st1-vis').checked=true;});
await page.evaluate(()=>document.querySelector('#sheet [data-stepok="1"]').click());await page.waitForTimeout(600);
out=await page.evaluate(({L})=>{const j=window.TRACE.lines[L].cond.A.joints[1];const ev=(j.events||[]).find(e=>e.type==='soudee');
  return {status:j.status,done:!!(j.steps[1]&&j.steps[1].done),proc:j.steps[1].proc,ev:!!ev,evProc:ev&&ev.data&&ev.data.procede,evPh:ev&&(ev.photos||[]).length};},{L});
console.log('3) étape 1 validée → statut « soudée » + événement:',JSON.stringify(out));
const c3=out.status==='soudee'&&out.done&&out.proc==='cellu'&&out.ev&&out.evProc==='cellu'&&out.evPh===1;
// 4) blocage étape 3 : sans test de pression, refus ; le statut ne bouge pas
await page.evaluate(({L,PNG})=>{const j=window.TRACE.lines[L].cond.A.joints[1];j.steps[2]={done:true,by:'t',at:new Date().toISOString(),photos:[]};j.steps[3]={photos:[PNG]};window.TRACE.renderAll();},{L,PNG});
await open(1);await page.waitForTimeout(400);
await page.evaluate(()=>document.querySelector('#sheet [data-stepok="3"]').click());await page.waitForTimeout(400);
out=await page.evaluate(({L})=>{const j=window.TRACE.lines[L].cond.A.joints[1];return {status:j.status,d3:!!(j.steps[3]&&j.steps[3].done)};},{L});
console.log('4) étape 3 sans test de pression → refusée:',JSON.stringify(out));
const c4=out.status==='soudee'&&!out.d3;
// 5) avec pression cochée → étape 3 validée + statut « manchonnée »
await page.evaluate(()=>{const p=document.querySelector('#sheet #st3-press');p.checked=true;});
await page.evaluate(()=>document.querySelector('#sheet [data-stepok="3"]').click());await page.waitForTimeout(600);
out=await page.evaluate(({L})=>{const j=window.TRACE.lines[L].cond.A.joints[1];const ev=(j.events||[]).find(e=>e.type==='manchonnee');
  return {status:j.status,d3:!!(j.steps[3]&&j.steps[3].done),ev:!!ev,type:j.steps[3].type};},{L});
console.log('5) étape 3 validée → statut « manchonnée » + événement:',JSON.stringify(out));
const c5=out.status==='manchonnee'&&out.d3&&out.ev;
// 6) MIGRATION : une soudure déclarée à l'ancienne (statut seul) coche ses sous-étapes à l'ouverture
await page.evaluate(({L,PNG})=>{const j=window.TRACE.lines[L].cond.A.joints[3];j.status='soudee';j.events=[{type:'soudee',by:'ethan',at:new Date(),data:{procede:'tig'},photos:[PNG]}];delete j.steps;window.TRACE.renderAll();},{L,PNG});
await open(3);await page.waitForTimeout(500);
out=await page.evaluate(({L})=>{const j=window.TRACE.lines[L].cond.A.joints[3];return {d1:!!(j.steps&&j.steps[1]&&j.steps[1].done),proc:j.steps&&j.steps[1]&&j.steps[1].proc,ph:j.steps&&j.steps[1]&&(j.steps[1].photos||[]).length,txt:/1\/4|2\/4|3\/4|4\/4/.test(document.querySelector('#sheet').textContent)};},{L});
console.log('6) ancienne soudure → étape 1 cochée automatiquement:',JSON.stringify(out));
const c6=out.d1&&out.proc==='tig'&&out.ph===1&&out.txt;
// 7) rôles : le soudeur ne valide que l'étape 1, le manchonneur pas l'étape 1
await page.selectOption('#roleSel','karim');await page.waitForTimeout(300); // soudeur
await open(5);await page.waitForTimeout(400);
out=await page.evaluate(()=>({s1:!!document.querySelector('#sheet [data-stepok="1"]'),s3:!!document.querySelector('#sheet [data-stepok="3"]')}));
console.log('7) rôle soudeur : étape 1 seulement:',JSON.stringify(out));
const c7=out.s1&&!out.s3;
const ALL=c1&&c2&&c3&&c4&&c5&&c6&&c7;
console.log('RESULTAT:',ALL?'TOUT VERT':'ECHEC '+JSON.stringify({c1,c2,c3,c4,c5,c6,c7}));
console.log(logs.length?logs:'[]');
await browser.close();
process.exit(ALL?0:1);
