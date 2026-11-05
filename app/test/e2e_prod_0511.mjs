// e2e_prod_0511.mjs — 05/11 (Ethan : « production de Gary disparue… règle ça pour que ce ne soit pas le cas ») : la production d'un chantier PAS ouvert sur l'appareil
//  r1 appli redémarrée, chantier pas rouvert : sa production vient des soudures relues du serveur (copie gardée sur l'appareil) — étapes 1 et 3 comptées, au bon nom
//  r2 sans copie ni réseau : rien d'inventé (0) ; r3 console propre
import { chromium } from 'playwright';
const BASE=process.env.BASE||'http://localhost:8765';
const browser=await chromium.launch({headless:true, executablePath: process.env.CHROMIUM_PATH||undefined});const C={};const logs=[];const J=x=>JSON.stringify(x);
const ctx=await browser.newContext({viewport:{width:1280,height:850}});const page=await ctx.newPage();
page.on('pageerror',e=>logs.push('PAGEERROR: '+e.message.slice(0,300)));page.on('console',m=>{if(m.type()==='error'&&!/supabase|Failed to fetch|net::ERR|404|geopf|WebSocket|open-meteo/i.test(m.text()))logs.push(m.text().slice(0,200));});page.on('dialog',d=>d.accept().catch(()=>{}));
await ctx.route(u=>/(^|\.)geopf\.fr$|^geo\.api\.gouv\.fr$|open-meteo\.com$/.test(u.hostname),r=>r.fulfill({status:200,contentType:'application/json',body:'[]'}));
const wait=ms=>page.waitForTimeout(ms);
await page.goto(BASE+'/traceur.html');await wait(500);await page.evaluate(()=>{localStorage.clear();});await page.reload();await wait(600);
await page.evaluate(()=>{const S=window.MAQ.state;S.lines=[{id:'L1',name:'Feeder',dn:100,bar:12,pts:[[10,50],[70,50]],specials:[],parent:null}];S.seq=2;window.MAQ.setMode('select');window.MAQ.rebuild();});
await page.click('#bSave');await wait(200);await page.fill('#svName','Prod test');await page.click('#svOk');await wait(800);await page.click('#svGo');await wait(1800);
const info=await page.evaluate(()=>{const T=window.TRACE;const A=T.state.lines.L1.cond.A.joints;return {sid:T.state.siteId,w:[A[1].weldId,A[2].weldId]};});
const P=await page.evaluate(()=>window.TRACE.espace.prod().personnes.find(p=>p.prenom&&p.nom)||null);
const who=P?P.prenom+' '+P.nom:'?';
const day='2026-11-05';
const count=()=>page.evaluate(([id,day])=>{const pr=window.TRACE.espace.prod().productions;const t=(pr[id]||{})[day]||{};return {s:t.soudures||0,r:t.retractions||0};},[P&&P.id,day]);
/* r2 d'abord : appli redémarrée, aucune copie → 0 */
await page.reload();await wait(2500);let o={sid:info.sid,who,opened:await page.evaluate(()=>window.TRACE.state.siteId||null)};
o.r2=await count();
/* r1 : copie des soudures du serveur posée sur l'appareil (comme après une relecture), appli redémarrée, chantier PAS rouvert */
await page.evaluate(([sid,w,who,day])=>new Promise(res=>{const rq=indexedDB.open('trace-kv',1);rq.onsuccess=()=>{const tx=rq.result.transaction('kv','readwrite');tx.objectStore('kv').put({at:Date.now(),rows:[
  {weld_id:w[0],line_id:'L1',cond:'A',status:'soudee',steps:{1:{done:true,at:day+'T08:10:00.000Z',by:who,photos:[]}},events:[]},
  {weld_id:w[1],line_id:'L1',cond:'A',status:'manchonnee',steps:{1:{done:true,at:day+'T09:00:00.000Z',by:who,photos:[]},3:{done:true,at:day+'T10:00:00.000Z',by:who,photos:[]}},events:[]}]},'trace:prodRows:'+sid);tx.oncomplete=()=>res(true);};}),[info.sid,info.w,who,day]);
await page.reload();await wait(2500);o.opened2=await page.evaluate(()=>window.TRACE.state.siteId||null);
await count();await wait(800);await page.evaluate(()=>{try{window.TRACE.espaceInvalidate&&window.TRACE.espaceInvalidate();}catch(e){}});o.r1=await count();
console.log('production d\'un chantier pas ouvert :',J(o));
C.r2=o.r2.s===0&&o.r2.r===0;
C.r1=o.opened2!==info.sid&&o.r1.s===2&&o.r1.r===1;
C.r3=!logs.length;if(logs.length)console.log('console :',logs);
console.log('RÉSULTATS',J(C));console.log('RESULTAT:',Object.values(C).every(Boolean)?'TOUT VERT':'ÉCHEC '+Object.keys(C).filter(k=>!C[k]).join(' '));await browser.close();process.exit(Object.values(C).every(Boolean)?0:1);
