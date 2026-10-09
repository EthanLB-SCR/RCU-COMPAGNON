// captures : charte SCR des documents exportés (09/10 soir) — carnet DOE, planche, sommaire DOE, prépa hydraulique, phasage, modifications du tracé, QSE, réception
import { chromium } from 'playwright';
const BASE=process.env.BASE||'http://localhost:8765';
const browser=await chromium.launch({headless:true, executablePath: process.env.CHROMIUM_PATH||undefined});
const ctx=await browser.newContext({viewport:{width:1000,height:900}});const page=await ctx.newPage();page.on('dialog',d=>d.accept().catch(()=>{}));
const errs=[];page.on('pageerror',e=>errs.push(e.message));
await page.goto(BASE+'/traceur.html');await page.waitForTimeout(500);await page.evaluate(()=>{localStorage.clear();});await page.reload();await page.waitForTimeout(500);
await page.evaluate(()=>{const S=window.MAQ.state;S.supplier='RENALIA';S.lines=[{id:'L1',name:'Rue de la Gare',dn:150,bar:12,pts:[[10,50],[130,50]],specials:[],parent:null},{id:'L2',name:'Antenne école',dn:100,bar:12,pts:[[60,50],[60,90]],specials:[],parent:{line:'L1',m:50,side:1}}];S.seq=3;window.MAQ.setMode('select');window.MAQ.rebuild();});
await page.click('#bSave');await page.waitForTimeout(200);await page.fill('#svName','Saint-Lô — Zone Bleue');await page.click('#svOk');await page.waitForTimeout(700);await page.click('#svGo');await page.waitForTimeout(1500);await page.selectOption('#roleSel','ethan');await page.waitForTimeout(300);
const ph=(txt,c)=>`data:image/svg+xml;utf8,`+encodeURIComponent(`<svg xmlns="http://www.w3.org/2000/svg" width="320" height="240"><rect width="320" height="240" fill="${c}"/><circle cx="160" cy="120" r="80" fill="#fff"/><text x="110" y="128" font-size="24" font-family="sans-serif">${txt}</text></svg>`);
await page.evaluate((ph)=>{const T=window.TRACE;const d=n=>new Date(Date.now()-n*864e5+3600e3).toISOString();const L1=T.lines.L1,L2=T.lines.L2;const jA=L1.cond.A.joints,jB=L2.cond.A.joints;
  for(let i=0;i<5;i++){jA[i].steps={1:{done:true,by:'Karim B.',at:d(3),photos:[ph],proc:'tig'}};jA[i].status='soudee';}
  for(let i=0;i<3;i++){jA[i].steps[2]={done:true,by:'Julien R.',at:d(1),photos:[],dh:{meas:10,expected:10.4}};jA[i].wire='raccorde';}
  for(let i=0;i<2;i++){jA[i].steps[3]={done:true,by:'Julien R.',at:d(1),photos:[],type:'retracte',press:true};jA[i].status='manchonnee';}
  for(let i=0;i<2;i++){jB[i].steps={1:{done:true,by:'Sofiane K.',at:d(0),photos:[],proc:'tig'}};jB[i].status='soudee';}
  T.renderAll();},ph('S-0001','#2f3b4a'));
const shots=[];
async function shotHTML(name,html,w=1000){const p=await ctx.newPage();await p.setViewportSize({width:w,height:1300});await p.setContent(html,{waitUntil:'load'});await p.waitForTimeout(400);await p.screenshot({path:name,fullPage:false});await p.close();shots.push(name);}
async function shotPopup(name,trigger,w=1000){const pp=ctx.waitForEvent('page');await trigger();const pop=await pp;await pop.waitForLoadState('domcontentloaded');await pop.setViewportSize({width:w,height:1300});await pop.waitForTimeout(600);await pop.screenshot({path:name,fullPage:false});await pop.close();shots.push(name);}
// DOE : carnet, planche, sommaire-like (galerie)
const doe=await page.evaluate(()=>{const T=window.TRACE;const D=T.doe.data({all:true});const pl=T.doe.plan(D,{scale:200,format:'A3',all:true});return {carnet:T.doe.carnet(D,{planches:pl.planches,all:true}),plan:pl.html,gal:T.doe.gallery(D,{all:true})};});
await shotHTML('shot_doc_carnet.png',doe.carnet,1300);await shotHTML('shot_doc_planche.png',doe.plan,1300);await shotHTML('shot_doc_galerie.png',doe.gal);
// hydraulique : prépa (dossier) + exécution (rapport)
await page.evaluate(()=>{const T=window.TRACE;T.state.tab='hydro';T.renderAll();const h=T.net.hydro;h.prest.rincage=true;T.renderAll();});await page.waitForTimeout(300);
await shotPopup('shot_doc_hydro_prepa.png',()=>page.evaluate(()=>document.querySelector('#hyReport').click()));
// phasage
await page.evaluate(()=>{const T=window.TRACE;const P=T.phasage.of();const iso=n=>new Date(Date.now()+n*864e5).toISOString().slice(0,10);P.phases.push({id:'PH1',name:'Rue de la Gare — tranche 1',level:'exe',parent:null,color:'#eb6834',tr:[{line:'L1',m0:0,m1:60}],dates:{tr:[iso(-10),iso(-5)],so:[iso(-4),iso(6)],rb:[iso(7),iso(10)],en:[iso(11),iso(12)]},days:[],by:'Ethan L.',at:new Date().toISOString()});T.phasage.render&&T.phasage.render();T.state.tab='phasage';T.renderAll();});await page.waitForTimeout(300);
await shotPopup('shot_doc_phasage.png',()=>page.evaluate(()=>{const b=document.querySelector('#phExport');if(b)b.click();}));
// modifications du tracé
await page.evaluate(()=>{const T=window.TRACE;T.ts.ensureMarche();const t=T.ts.of();t.items.push({id:'X1',etat:'propose',ts:'DEV-01',desig:'Vanne de sectionnement ajoutée',label:'Rue de la Gare · PK 32 m',qty:{soud:2,ml:0},by:'Ethan L.',at:new Date().toISOString(),photos:[]});T.state.tab='ts';T.renderAll();});
await shotPopup('shot_doc_ts.png',()=>page.evaluate(()=>window.TRACE.ts.export()));
// QSE : accueil chantier + impression
await page.evaluate(()=>{const T=window.TRACE;T.state.tab='qse';T.renderAll();});await page.waitForTimeout(200);
await page.evaluate(()=>{document.querySelector('[data-qnew=accueil]').click();});await page.waitForTimeout(400);
await shotPopup('shot_doc_qse.png',()=>page.evaluate(()=>{const b=[...document.querySelectorAll('#modal button')].find(x=>/Feuille d.émargement/.test(x.textContent));if(b)b.click();}));
// réception de livraison
await page.evaluate(()=>{const T=window.TRACE;const s=T.net.stock=T.net.stock||{zones:[],lots:[],livs:[],moves:[],takes:[]};s.zones.push({id:'Z1',name:'Base vie',x:30,y:70,w:8,h:5});s.livs.push({id:'LV1',label:'Camion Renalia n° 3',bl:'BL-4471',at:new Date().toISOString(),date:new Date().toISOString().slice(0,10),recuAt:new Date().toISOString(),by:'Ethan L.',status:'ok',prevu:[{label:'Tube DN150 12 m',qty:20},{label:'Coude 90° DN150',qty:6},{label:'Manchon DN150',qty:40}],ecarts:[{label:'Coude 90° DN150',prevu:6,recu:5}],photos:[]});s.lots.push({id:'LT1',liv:'LV1',zone:'Z1',label:'Tube DN150 12 m',qty:20});T.state.tab='stock';T.renderAll();});await page.waitForTimeout(300);
await shotPopup('shot_doc_reception.png',()=>page.evaluate(()=>{const b=document.querySelector('[data-stkcr]')||[...document.querySelectorAll('#stock button')].find(x=>/compte-rendu|réception/i.test(x.textContent));if(b)b.click();else window.TRACE.openStockCR&&window.TRACE.openStockCR('LV1');}));
console.log(JSON.stringify({shots,errs}));
await browser.close();
