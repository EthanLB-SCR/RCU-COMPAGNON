// e2e_concept_0511.mjs — 05/11 (lot 3, Ethan : « quand des soudures sont ajoutées via le raccourci, il faut qu'elles soient intégrées dans le concepteur ») :
//  n1 appli : une soudure AJOUTÉE sur place (barre de 12 m coupée) + une soudure RETIRÉE (6 + 6 → 12 m)
//  n2 Concepteur ouvert sur le chantier : les deux sont dans le tracé (barre coupée au bon PK, barres réunies), les autres soudures n'ont pas bougé
//  n3 enregistré : dans l'appli, la soudure ajoutée est une soudure du plan AVEC SON NUMÉRO, la retirée n'existe plus, plus rien à rejouer ; n4 console propre
import { chromium } from 'playwright';
const BASE=process.env.BASE||'http://localhost:8765';
const browser=await chromium.launch({headless:true, executablePath: process.env.CHROMIUM_PATH||undefined});const C={};const logs=[];const J=x=>JSON.stringify(x);
const ctx=await browser.newContext({viewport:{width:1280,height:850}});const page=await ctx.newPage();
page.on('pageerror',e=>logs.push('PAGEERROR: '+e.message.slice(0,300)));page.on('console',m=>{if(m.type()==='error'&&!/supabase|Failed to fetch|net::ERR|404|geopf|WebSocket|open-meteo/i.test(m.text()))logs.push(m.text().slice(0,200));});page.on('dialog',d=>d.accept().catch(()=>{}));
await ctx.route(u=>/(^|\.)geopf\.fr$|^geo\.api\.gouv\.fr$|open-meteo\.com$/.test(u.hostname),r=>r.fulfill({status:200,contentType:'application/json',body:'[]'}));
const wait=ms=>page.waitForTimeout(ms);
await page.goto(BASE+'/traceur.html');await wait(500);await page.evaluate(()=>{localStorage.clear();});await page.reload();await wait(600);
await page.evaluate(()=>{const S=window.MAQ.state;S.lines=[{id:'L1',name:'Feeder',dn:100,bar:12,pts:[[10,50],[16,50.15],[40,50]],specials:[],parent:null}];S.seq=2;window.MAQ.setMode('select');window.MAQ.rebuild();});
await page.click('#bSave');await wait(200);await page.fill('#svName','Concepteur test');await page.click('#svOk');await wait(800);await page.click('#svGo');await wait(1800);
await page.selectOption('#roleSel','ethan');await wait(200);
const app=()=>page.evaluate(()=>{const A=window.TRACE.state.lines.L1.cond.A;return {els:A.els.map(e=>e.kind+':'+(+e.len).toFixed(2)),w:A.joints.map(j=>j.weldId+'@'+(+j.m).toFixed(2)+(j.extra?'+':'')),ex:(window.TRACE.net.extraWelds||[]).map(r=>r.weldId),rm:(window.TRACE.net.removedWelds||[]).map(r=>r.weldId)};});
const sid=await page.evaluate(()=>window.TRACE.state.siteId);const a0=await app();
/* n1 : soudure ajoutée au PK 18 (dans la barre de 12 m), puis retrait de la soudure de déviation (6 + 6) */
const tgt=await page.evaluate(()=>{const T=window.TRACE;const A=T.state.lines.L1.cond.A;const e=A.els.find(x=>x.kind==='pipe'&&x.m0<18&&x.m1>18);const pl=e.axis[0];const t=(18-e.m0)/e.len;const wx=pl[0].x+(pl[pl.length-1].x-pl[0].x)*t,wy=pl[0].y+(pl[pl.length-1].y-pl[0].y)*t;T.centerOn(wx,wy,60);return {wx,wy};});await wait(400);
await page.evaluate(()=>{if(!window.TRACE.state.extraPose)document.querySelector('#btnExtraWeld').click();});await wait(300);
{const pt=await page.evaluate(([wx,wy])=>{const v=window.TRACE.state.view;const r=document.querySelector('#canvas').getBoundingClientRect();return {x:r.left+wx*v.k+v.tx,y:r.top+wy*v.k+v.ty};},[tgt.wx,tgt.wy]);await page.mouse.move(pt.x,pt.y);await page.mouse.down();await wait(40);await page.mouse.up();await wait(600);}
const addRec=await page.evaluate(()=>{const R=(window.TRACE.net.extraWelds||[]);return R.length?{id:R[R.length-1].weldId,m:+R[R.length-1].m}:null;});const add=addRec&&addRec.id;await page.evaluate(()=>{if(window.TRACE.state.extraPose)document.querySelector('#btnExtraWeld').click();});await wait(200);
const rmId=await page.evaluate(()=>{const A=window.TRACE.state.lines.L1.cond.A;const i=A.joints.findIndex(j=>{const a=A.els[j.idx],b=A.els[j.idx+1];return a&&b&&a.kind==='pipe'&&b.kind==='pipe'&&(+a.len+ +b.len)<=12.01;});const id=A.joints[i].weldId;window.TRACE.openJoint('L1','A',i);return id;});await wait(350);
await page.click('#sheet [data-act="j-del"]');await wait(600);
await page.evaluate(()=>{const T=window.TRACE;/* parties gardées sur l'appareil (copie remise au Concepteur) */});
const a1=await app();console.log('n1) appli :',J({a0,a1,add,rmId}));
C.n1=!!addRec&&Math.abs(addRec.m-18)<0.3&&a1.w.some(x=>x.startsWith(add+'@'))&&!a1.w.some(x=>x.startsWith(rmId+'@'))&&a1.ex.includes(add)&&a1.rm.includes(rmId);
await page.evaluate(id=>{const T=window.TRACE;T.net.extraWelds=T.net.extraWelds;},sid);await wait(300);
/* n2 : Concepteur */
await page.evaluate(sid=>{try{const k='trace:handoff:'+sid;return true;}catch(e){}},sid);
await page.goto(BASE+'/traceur.html?site='+sid);await wait(2200);
const t=await page.evaluate(()=>{const S=window.MAQ.state;const L=S.lines[0];const B=S.built&&S.built[L.id];const A=B&&B.A;return {splits:(L.splits||[]).map(x=>x.weldId+'@'+x.m),merges:(L.merges||[]).map(x=>x.weldId+'@'+(+x.m).toFixed(2)),w:A?A.welds.map(w=>(+w.m).toFixed(2)):[],p:A?A.pieces.filter(p=>p.kind==='tube').map(p=>(+p.L).toFixed(2)):[]};});
console.log('n2) Concepteur :',J(t));
C.n2=t.splits.includes(add+'@'+addRec.m)&&t.merges.length===1&&t.w.includes((addRec.m).toFixed(2))&&!t.w.includes('6.00')&&t.p.includes('12.00')&&t.p.includes('6.00')&&t.w.includes('12.00')&&t.w.includes('24.00');
/* n3 : enregistrer (mise à jour) → retour dans l'appli */
await page.click('#bSave');await wait(300);await page.evaluate(()=>{const m=document.getElementById('svMode');if(m)m.value='update';});await page.click('#svOk');await wait(1200);await page.click('#svGo');await wait(2200);
await page.evaluate(id=>window.TRACE.go(id),sid);await wait(1500);
const a2=await app();console.log('n3) appli après enregistrement :',J(a2));
C.n3=a2.w.some(x=>x===add+'@'+(addRec.m).toFixed(2))&&!a2.w.some(x=>x.startsWith(rmId+'@'))&&!a2.ex.length&&!a2.rm.length;
C.n4=!logs.length;if(logs.length)console.log('console :',logs);
console.log('RÉSULTATS',J(C));console.log('RESULTAT:',Object.values(C).every(Boolean)?'TOUT VERT':'ÉCHEC '+Object.keys(C).filter(k=>!C[k]).join(' '));await browser.close();process.exit(Object.values(C).every(Boolean)?0:1);
