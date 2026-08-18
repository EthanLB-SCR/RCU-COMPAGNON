// Petits correctifs : réseau hors écran (traceur + appli), fils dès 15 px/m, entraxe selon DN, gros DN sans gaines collées
import { chromium } from 'playwright';
const BASE=process.env.BASE||'http://localhost:8765';
const browser=await chromium.launch({headless:true, executablePath: process.env.CHROMIUM_PATH||undefined});
const ctx=await browser.newContext({viewport:{width:900,height:800}});const page=await ctx.newPage();
const logs=[];page.on('pageerror',e=>logs.push('PAGEERROR: '+e.message.slice(0,300)));page.on('console',m=>{if(m.type()==='error'&&!/supabase|Failed to fetch|net::ERR|404/i.test(m.text()))logs.push(m.text().slice(0,200));});
await page.goto(BASE+'/traceur.html');await page.waitForTimeout(500);await page.evaluate(()=>{localStorage.clear();});await page.reload();await page.waitForTimeout(500);
// DN250 : entraxe = gaine + 0,25 (règle entraxeSupParDN)
await page.evaluate(()=>{const S=window.MAQ.state;S.lines=[{id:'L1',name:'Gros',dn:250,bar:12,pts:[[10,50],[60,50]],specials:[],parent:null},{id:'L2',name:'Petit',dn:50,bar:12,pts:[[10,70],[60,70]],specials:[],parent:null}];S.seq=3;window.MAQ.setMode('select');window.MAQ.rebuild();});
let out=await page.evaluate(()=>{const S=window.MAQ.state;const B1=S.built.L1,B2=S.built.L2;const cas=window.MAQ.cat();return {e250:+B1.e.toFixed(3),casing250:cas.casing(250),e50:+B2.e.toFixed(3),casing50:cas.casing(50),rule:window.MAQ.rules.entraxeSupParDN};});
console.log('entraxe:',JSON.stringify(out));
// hors écran : on déplace la vue très loin → bouton visible ; clic → revient
await page.evaluate(()=>{const S=window.MAQ.state;S.view={k:20,tx:-50000,ty:-50000};window.dispatchEvent(new Event('resize'));});await page.waitForTimeout(200);
out=await page.evaluate(()=>getComputedStyle(document.querySelector('#offscreen')).display);console.log('traceur hors écran, bouton:',out);
await page.click('#offscreen');await page.waitForTimeout(200);out=await page.evaluate(()=>({btn:getComputedStyle(document.querySelector('#offscreen')).display,k:+window.MAQ.state.view.k.toFixed(2)}));console.log('après clic:',JSON.stringify(out));
// enregistrer → appli : gaines DN250 non collées à 20 px/m, fils visibles à 15 px/m, bouton hors écran
await page.click('#bSave');await page.waitForTimeout(200);await page.fill('#svName','Misc test');await page.click('#svOk');await page.waitForTimeout(800);await page.click('#svGo');await page.waitForTimeout(1500);
out=await page.evaluate(()=>{const T=window.TRACE;T.centerOn(35,50,20);const L=T.state.lines.L1;const eA=L.cond.A.els[1],eR=L.cond.R.els[1];const gA=document.querySelector(`#net g.el[data-line="L1"][data-cond="A"][data-el="1"] path:nth-child(2)`),gR=document.querySelector(`#net g.el[data-line="L1"][data-cond="R"][data-el="1"] path:nth-child(2)`);const bA=gA.getBBox(),bR=gR.getBBox();return {yA:[+bA.y.toFixed(3),+(bA.y+bA.height).toFixed(3)],yR:[+bR.y.toFixed(3),+(bR.y+bR.height).toFixed(3)],wA:+gA.getAttribute('stroke-width'),axisHalf:L.axisHalf};});
console.log('DN250 à 20 px/m (gaines A / R, y monde ; largeur trait):',JSON.stringify(out));
out=await page.evaluate(()=>{const T=window.TRACE;T.centerOn(35,50,16);const w=document.querySelectorAll('#net path[stroke="#dfe4ea"],#net path[stroke="#e2843a"]').length;T.centerOn(35,50,12);const w2=document.querySelectorAll('#net path[stroke="#dfe4ea"],#net path[stroke="#e2843a"]').length;return {fils16:w,fils12:w2};});
console.log('fils:',JSON.stringify(out));
await page.evaluate(()=>{const T=window.TRACE;T.state.view.tx=-1e6;T.state.view.ty=-1e6;T.renderPlan();});await page.waitForTimeout(150);
out=await page.evaluate(()=>getComputedStyle(document.querySelector('#offscreen')).display);console.log('appli hors écran, bouton:',out);
await page.click('#offscreen');await page.waitForTimeout(300);out=await page.evaluate(()=>({btn:getComputedStyle(document.querySelector('#offscreen')).display,els:document.querySelectorAll('#net g.el').length}));console.log('après clic:',JSON.stringify(out));
await page.screenshot({path:new URL('./e2e_misc.png',import.meta.url).pathname});
console.log(logs);await browser.close();
