// e2e_wq_0411.mjs — 04/11 (Nantes, Ethan : « alors qu'il a mis ses photos, la production de Gary a disparu en milieu de journée ») : envoi des déclarations de soudure
//  q1 relecture du serveur PENDANT l'envoi des photos → la déclaration part AVEC son événement (qui, quand) et ses photos ; la soudure n'est pas écrasée à l'écran
//  q2 envoi raté : « Pas de réseau… », « ⚠ 1 soudure en attente d'envoi », la relecture ne l'écrase pas, appli rechargée → toujours déclarée, réseau revenu → envoyée, file vide
//  q3 console propre
import { chromium } from 'playwright';
const BASE=process.env.BASE||'http://localhost:8765';
const browser=await chromium.launch({headless:true, executablePath: process.env.CHROMIUM_PATH||undefined});const C={};const logs=[];const J=x=>JSON.stringify(x);
const ctx=await browser.newContext({viewport:{width:1280,height:850}});const page=await ctx.newPage();
page.on('pageerror',e=>logs.push('PAGEERROR: '+e.message.slice(0,300)));page.on('console',m=>{if(m.type()==='error'&&!/supabase|Failed to fetch|net::ERR|404|geopf|WebSocket|open-meteo/i.test(m.text()))logs.push(m.text().slice(0,200));});page.on('dialog',d=>d.accept().catch(()=>{}));
await ctx.route(u=>/(^|\.)geopf\.fr$|^geo\.api\.gouv\.fr$|open-meteo\.com$/.test(u.hostname),r=>r.fulfill({status:200,contentType:'application/json',body:'[]'}));
const wait=ms=>page.waitForTimeout(ms);
await page.goto(BASE+'/traceur.html');await wait(500);await page.evaluate(()=>{localStorage.clear();});await page.reload();await wait(600);
await page.evaluate(()=>{const S=window.MAQ.state;S.lines=[{id:'L1',name:'Feeder',dn:100,bar:12,pts:[[10,50],[70,50]],specials:[],parent:null}];S.seq=2;window.MAQ.setMode('select');window.MAQ.rebuild();});
await page.click('#bSave');await wait(200);await page.fill('#svName','WQ test');await page.click('#svOk');await wait(800);await page.click('#svGo');await wait(1800);
await page.evaluate(()=>{localStorage.setItem('trace:cloudSeen','1');});await page.selectOption('#roleSel','ethan');await wait(200);
const stub=(fail,delay)=>page.evaluate(([fail,delay])=>{const W=window.TRACE.wq;window.__sent=window.__sent||[];W.syncStub('ensureSite',async()=>true);W.syncStub('logEvent',async()=>{});
  W.syncStub('uploadPhoto',async(sid,id)=>{await new Promise(r=>setTimeout(r,delay));return fail?null:'https://x/'+id+'.jpg';});
  W.syncStub('saveWeld',async(sid,j)=>{if(fail)return false;window.__sent.push(JSON.parse(JSON.stringify(j)));return true;});},[fail,delay]);
const jo=i=>page.evaluate(i=>{const j=window.TRACE.state.lines.L1.cond.A.joints[i];return {id:j.weldId,st:j.status,ev:(j.events||[]).map(e=>e.type)};},i);
const sentOf=id=>page.evaluate(id=>(window.__sent||[]).filter(r=>r.weldId===id).map(r=>{const ph=[...(r.photos||[]),...(r.events||[]).flatMap(e=>e.photos||[])];return {st:r.status,ev:(r.events||[]).map(e=>e.type),ok:ph.filter(p=>/^https:\/\/x\//.test(p)).length,data:ph.filter(p=>/^data:/.test(p)).length};}),id);
const qk=async()=>Object.keys(await page.evaluate(()=>window.TRACE.wq.list()));
const declare=async i=>{await page.evaluate(i=>{window.TRACE.openJoint('L1','A',i);},i);await wait(300);await page.evaluate(()=>{const sh=document.getElementById('sheet');let b=sh.querySelector('[data-act="form-soudee"]');if(!b){b=document.createElement('button');b.dataset.act='form-soudee';sh.appendChild(b);}b.click();});await wait(300); /* le bouton n'est montré qu'au terrain (affectation) : on ouvre le formulaire directement — c'est l'ENVOI qu'on teste */
  await page.evaluate(()=>{window.TRACE.state.pendingPhotos.push('data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNkYAAAAAYAAjCB0C8AAAAASUVORK5CYII=');});
  await page.click('#sheet [data-act="save-soudee"]');};
/* q1 */
await stub(false,1500);const id1=(await jo(1)).id;
await declare(1);await wait(300);
await page.evaluate(id=>{window.TRACE.wq.remoteApply([{weld_id:id,status:'a_souder',data:{events:[],photos:[]}}]);},id1); // relecture (90 s / temps réel) pendant l'envoi de la photo
let o={during:await jo(1)};await wait(2600);o.sent=await sentOf(id1);o.after=await jo(1);o.q=await qk();
console.log('q1) relecture pendant l\'envoi des photos :',J(o));
C.q1=o.during.st==='soudee'&&o.sent.length===1&&o.sent[0].st==='soudee'&&o.sent[0].ev.includes('soudee')&&o.sent[0].ok>=1&&!o.sent[0].data&&o.after.st==='soudee'&&!o.q.length;
/* q2 */
await stub(true,50);const id2=(await jo(2)).id;
await declare(2);await wait(900);
o={toast:await page.evaluate(()=>(document.getElementById('toast')||{}).textContent||''),badge:await page.evaluate(()=>(document.getElementById('cloudBadge')||{}).textContent||''),q:await qk()};
await page.evaluate(id=>{window.TRACE.wq.remoteApply([{weld_id:id,status:'a_souder',data:{events:[],photos:[]}}]);},id2);o.afterPull=(await jo(2)).st;
const sid=await page.evaluate(()=>window.TRACE.state.siteId);
await page.reload();await wait(2500);await page.evaluate(id=>window.TRACE.go(id),sid);await wait(1500);
o.reload=(await jo(2)).st;o.q2=await qk();
await stub(false,50);o.n=await page.evaluate(()=>window.TRACE.wq.flush());await wait(300);
o.sent=await sentOf(id2);o.q3=await qk();o.badge2=await page.evaluate(()=>(document.getElementById('cloudBadge')||{}).textContent||'');
console.log('q2) envoi raté → gardé, rechargé, renvoyé :',J(o));
C.q2=/Pas de réseau/.test(o.toast)&&/1 soudure en attente/.test(o.badge)&&o.q.length===1&&o.afterPull==='soudee'&&o.reload==='soudee'&&o.q2.length===1&&o.n===1&&o.sent.length===1&&o.sent[0].ev.includes('soudee')&&!o.q3.length&&/enregistré/.test(o.badge2);
/* q4 (05/11) : version serveur de départ envoyée (_base ← updated_at reçu) et mise à jour après l'envoi (fusion côté serveur : sql/welds_fusion_0511.sql) */
await stub(false,30);await page.evaluate(()=>{window.TRACE.wq.syncStub('weldAt',()=>'2026-11-05T10:00:00.222222+00:00');});const id3=(await jo(3)).id;
await page.evaluate(id=>{window.TRACE.wq.remoteApply([{weld_id:id,status:'a_souder',data:{events:[]},updated_at:'2026-11-05T09:00:00.111111+00:00'}]);},id3);
await declare(3);await wait(1200);
o={base:await page.evaluate(id=>{const r=(window.__sent||[]).filter(x=>x.weldId===id);return r.length?r[r.length-1]._srvAt||null:'(pas envoyé)';},id3),after:await page.evaluate(()=>window.TRACE.state.lines.L1.cond.A.joints[3]._srvAt||null)};
console.log('q4) _base envoyé puis mis à jour :',J(o));
C.q4=o.base==='2026-11-05T09:00:00.111111+00:00'&&o.after==='2026-11-05T10:00:00.222222+00:00';
C.q3=!logs.length;if(logs.length)console.log('console :',logs);
console.log('RÉSULTATS',J(C));console.log('RESULTAT:',Object.values(C).every(Boolean)?'TOUT VERT':'ÉCHEC '+Object.keys(C).filter(k=>!C[k]).join(' '));await browser.close();process.exit(Object.values(C).every(Boolean)?0:1);
