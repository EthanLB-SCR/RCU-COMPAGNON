// Tracé v2 (retour Ethan 25/08 soir) : surbrillance ROUGE unique du branchement au défaut, décalage renforcé,
// jonctions reliées — et au TÉ on VOIT le fil plonger dans l'antenne (aller d'un côté, retour de l'autre, tout relié).
import { chromium } from 'playwright';
const BASE=process.env.BASE||'http://localhost:8765';
const browser=await chromium.launch({headless:true, executablePath: process.env.CHROMIUM_PATH||undefined});
const ctx=await browser.newContext({viewport:{width:900,height:940}});const page=await ctx.newPage();
const logs=[];page.on('pageerror',e=>logs.push('PAGEERROR: '+e.message.slice(0,300)));page.on('console',m=>{if(m.type()==='error'&&!/supabase|Failed to fetch|net::ERR|404/i.test(m.text()))logs.push(m.text().slice(0,200));});
await page.goto(BASE+'/traceur.html');await page.waitForTimeout(600);
await page.evaluate(()=>{localStorage.clear();});await page.reload();await page.waitForTimeout(600);
// L1 110 m + antenne L2 (30 m) prise au té à m=50 — AXIOM : le fil CUIVRÉ (nu) plonge dans la branche
await page.evaluate(()=>{const S=window.MAQ.state;S.supplier='AXIOM';S.lines=[
  {id:'L1',name:'Feeder',dn:100,bar:12,pts:[[10,50],[120,50]],specials:[],parent:null},
  {id:'L2',name:'Antenne SST',dn:80,bar:12,pts:[[60,50],[60,80]],specials:[],parent:{line:'L1',m:50,side:1}}];S.seq=3;window.MAQ.setMode('select');window.MAQ.rebuild();});
await page.click('#bSave');await page.waitForTimeout(200);await page.fill('#svName','DH6 test');await page.click('#svOk');await page.waitForTimeout(800);
await page.click('#svGo');await page.waitForTimeout(1500);await page.selectOption('#roleSel','ethan');await page.waitForTimeout(300);
// tout raccorder droit sur L1 et L2 (continuité du fil à travers le té)
const ids=await page.evaluate(()=>{const T=window.TRACE;const L1=Object.values(T.lines).find(l=>!l.parent);const L2=Object.values(T.lines).find(l=>l.parent);
  [L1,L2].forEach(l=>l.cond.A.joints.forEach(j=>{j.wire='raccorde';j.conn={E:'E',N:'N'};}));T.renderAll();
  return {l1:L1.id,l2:L2.id,total:L1.length};});
console.log('réseau prêt (antenne en série au té):',JSON.stringify(ids));
// 1) branché au départ sur le NU (celui qui plonge dans l'antenne), 120 m : le défaut est APRÈS l'antenne, sur L1
await page.click('#tabbar [data-tab=bouclage]');await page.waitForTimeout(500);
await page.evaluate(()=>{document.querySelector('#loc-d').value='120';document.querySelector('#loc-wire').value='N';});
await page.click('#loc-go');await page.waitForTimeout(500);
let out=await page.evaluate(({l1})=>{const r=window.TRACE.state.loc;return {ok:r&&r.ok,line:r&&r.line,w:r&&r.seg&&r.seg.w,total:r&&r.total};},ids);
console.log('1) localisé après l\'antenne (le fil a fait l\'aller-retour dedans):',JSON.stringify(out));
const c1=out.ok&&out.line===ids.l1&&out.w==='N'&&out.total>160; // 110 + 2 × 30 = 170 m de fil nu
// 2) sur le plan : trajet ROUGE d'un bloc — L1 avant le té, PLONGÉE dans L2 (aller + retour), L1 après — jonctions reliées
await page.click('#loc-show');await page.waitForTimeout(700);
out=await page.evaluate(({l2})=>{const g=document.querySelector('#dhG');const h=g.innerHTML;
  const wtl=[...g.querySelectorAll('path[data-wtl]')].map(p2=>p2.dataset.wtl);
  return {tab:window.TRACE.state.tab,rouge:/#e8102d/.test(h),surL2:wtl.filter(x=>x===l2).length,surL1:wtl.filter(x=>x!==l2).length,joints:g.querySelectorAll('path[data-wtc]').length,cote:/120 m ►/.test(g.textContent)};},ids);
console.log('2) plongée visible dans l\'antenne + jonctions:',JSON.stringify(out));
const c2=out.tab==='plan'&&out.rouge&&out.surL2>=2&&out.surL1>=2&&out.joints>=3&&out.cote; // aller + retour dans L2, L1 des deux côtés, ≥3 jonctions (entrée té, bout d'antenne, sortie té)
// 3) défaut DANS l'antenne (70 m = 20 m après l'entrée) : le point est posé sur L2, trajet tronqué à l'aller
await page.click('#tabbar [data-tab=bouclage]');await page.waitForTimeout(400);
await page.evaluate(()=>{document.querySelector('#loc-d').value='70';document.querySelector('#loc-wire').value='N';});
await page.click('#loc-go');await page.waitForTimeout(400);
out=await page.evaluate(({l2})=>{const r=window.TRACE.state.loc;return {line:r&&r.line,kind:r&&r.seg&&r.seg.kind,ant:/antenne/.test((r&&r.where)||'')};},ids);
console.log('3) défaut localisé DANS l\'antenne:',JSON.stringify(out));
const c3=out.line===ids.l2&&out.kind==='branchOut'&&out.ant;
await page.click('#loc-show');await page.waitForTimeout(600);
out=await page.evaluate(({l2})=>{const g=document.querySelector('#dhG');const wtl=[...g.querySelectorAll('path[data-wtl]')].map(p2=>p2.dataset.wtl);
  return {surL2:wtl.filter(x=>x===l2).length,retour:false||wtl.filter(x=>x===l2).length,defaut:/défaut ≈ 70 m/.test(g.textContent)};},ids);
console.log('4) trajet tronqué au défaut dans l\'antenne:',JSON.stringify(out));
const c4=out.surL2>=1&&out.defaut;
const ALL=c1&&c2&&c3&&c4;
console.log('RESULTAT:',ALL?'TOUT VERT':'ECHEC '+JSON.stringify({c1,c2,c3,c4}));
console.log(logs.length?logs:'[]');
await browser.close();
process.exit(ALL?0:1);
