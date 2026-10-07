// captures : récap TS (marché vs réel, candidats, marques), plan (calque marché + pastilles + EXT), fiche étape ③ extrusion, traceur (calque marché, ◐)
import { chromium } from 'playwright';
const BASE=process.env.BASE||'http://localhost:8765';
const browser=await chromium.launch({headless:true, executablePath: process.env.CHROMIUM_PATH||undefined});
const ctx=await browser.newContext({viewport:{width:1000,height:1100}});const page=await ctx.newPage();page.on('dialog',d=>d.accept().catch(()=>{}));
const logs=[];page.on('pageerror',e=>logs.push('PAGEERROR: '+e.message.slice(0,300)));
await page.goto(BASE+'/traceur.html');await page.waitForTimeout(500);
await page.evaluate(()=>{localStorage.clear(); /* TS définitif : aucun interrupteur à poser */});await page.reload();await page.waitForTimeout(500);
await page.evaluate(()=>{const S=window.MAQ.state;S.supplier='RENALIA';S.lines=[
  {id:'L1',name:'Rue de la Gare',dn:150,bar:12,pts:[[10,50],[60,50],[60,90],[130,90]],specials:[{id:'v1',type:'valve',m:30}],parent:null},
  {id:'L2',name:'Impasse des Lilas',dn:80,bar:12,pts:[[35,50],[35,10]],specials:[],parent:{line:'L1',m:25,side:1}}];S.seq=3;window.MAQ.setMode('select');window.MAQ.rebuild();});
await page.click('#bSave');await page.waitForTimeout(200);await page.fill('#svName','Rue de la Gare — TS');await page.click('#svOk');await page.waitForTimeout(700);await page.click('#svGo');await page.waitForTimeout(1500);await page.selectOption('#roleSel','ethan');await page.waitForTimeout(300);
const siteId=await page.evaluate(()=>window.TRACE.state.siteId);
const PNG='data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNkYPhfDwAChwGA60e6kgAAAABJRU5ErkJggg==';
// extrusion sur une soudure
await page.evaluate(({PNG})=>{const T=window.TRACE;const L=Object.values(T.lines).find(l=>l.name==='Rue de la Gare');const j=L.cond.A.joints[3];j.steps={1:{done:true,by:'Karim',at:new Date().toISOString(),photos:[PNG],proc:'tig'},2:{done:true,by:'Karim',at:new Date().toISOString(),photos:[PNG]},3:{photos:[PNG]}};j.status='soudee';j.wire='raccorde';T.openJoint(L.id,'A',3);},{PNG});
await page.waitForTimeout(400);
await page.evaluate(()=>{const r=document.querySelector('#sheet input[name=st3-type][value=extrude]');r.click();r.dispatchEvent(new Event('change',{bubbles:true}));document.querySelector('#sheet #st3-cause').value='coudenu';});await page.waitForTimeout(200);
{const el=await page.$('#sheet details.dstep.cur');if(el)await el.screenshot({path:'shot_ts_step3.png'});}
await page.evaluate(()=>{document.querySelector('#sheet #st3-press').checked=true;document.querySelector('#sheet [data-stepok="3"]').click();});await page.waitForTimeout(400);
{const el=await page.$('#sheet');await el.screenshot({path:'shot_ts_sheet.png'});}
// retour traceur : lyre + vanne en plus + prolongement, puis mise à jour
await page.goto(BASE+'/traceur.html?site='+encodeURIComponent(siteId));await page.waitForTimeout(1500);
await page.evaluate(()=>{const S=window.MAQ.state;const l=S.lines.find(x=>x.id==='L1');l.pts=[[10,50],[60,50],[60,90],[85,90],[85,82],[91,82],[91,90],[140,90]];l.specials.push({id:'v2',type:'valve',m:100});window.MAQ.rebuild();S.show.marche=true;window.MAQ.rebuild();});
await page.waitForTimeout(300);await page.evaluate(()=>document.querySelector('#zFit').click());await page.waitForTimeout(300);
await page.screenshot({path:'shot_ts_traceur.png'});
await page.click('#bSave');await page.waitForTimeout(200);await page.selectOption('#svMode','update');await page.click('#svOk');await page.waitForTimeout(800);await page.click('#svGo');await page.waitForTimeout(1500);await page.selectOption('#roleSel','ethan');await page.waitForTimeout(300);
await page.evaluate(()=>{const T=window.TRACE;const c=T.ts.candidates();if(c[0])T.ts.markCandidate(c[0],'propose','TS-01');const L=Object.values(T.lines).find(l=>l.name==='Rue de la Gare');const i=L.cond.A.els.findIndex(e=>e.kind==='valve'&&Math.abs((e.m0+e.m1)/2-100)<4);if(i>=0)T.ts.markEl(L,'A',i,{etat:'commande',ts:'TS-02',label:'vanne demandée par le client',pair:true});T.ts.markRange(L.id,100,115,{etat:'note',label:'reprise d\'enrobé'});T.state.show.marche=true;T.renderAll();});
await page.waitForTimeout(300);
await page.evaluate(()=>{document.querySelector('#app').classList.add('wide');document.querySelector('#tabbar [data-tab=plan]').click();window.TRACE.closeSheet();});await page.waitForTimeout(300);
await page.evaluate(()=>{const T=window.TRACE;T.centerOn(85,70,5);});await page.waitForTimeout(400);
await page.screenshot({path:'shot_ts_plan.png'});
await page.evaluate(()=>{document.querySelector('#tabbar [data-tab=recap]').click();});await page.waitForTimeout(400);
{const el=await page.$('#tsRecap');if(el)await el.screenshot({path:'shot_ts_recap.png'});}
console.log(await page.evaluate(()=>({items:window.TRACE.ts.of().items.map(x=>[x.kind,x.etat,x.ts,x.label]),cands:window.TRACE.ts.candidates().map(c=>c.label),d:window.TRACE.ts.diff().tot.d})));
console.log(logs.length?logs:'[]');await browser.close();
