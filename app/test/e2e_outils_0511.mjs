// e2e_outils_0511.mjs — 05/11 (Ethan : « raccourcis outils très faciles pour les gars de terrain : décaler, ajouter, retirer une soudure, sans rien supprimer de pointé ;
//  retirer seulement si ça ne crée pas une barre de plus de 12 m ») — o1 fiche : ↔ Décaler / ➕ Ajouter / ✂ Retirer ; o2 pas de ✂ sur une soudure pointée ni si > 12 m ;
//  o3 ✂ Retirer : deux barres → une (12 m), retrait gardé et rejoué ; o4 ↔ Décaler ouvre le réglage sur CETTE soudure, ➕ Ajouter → toucher la barre ;
//  o5 menu « + » : outils soudure en tête, rien de grisé ; o6 console propre
import { chromium } from 'playwright';
const BASE=process.env.BASE||'http://localhost:8765';
const browser=await chromium.launch({headless:true, executablePath: process.env.CHROMIUM_PATH||undefined});const C={};const logs=[];const J=x=>JSON.stringify(x);
const ctx=await browser.newContext({viewport:{width:1280,height:850}});const page=await ctx.newPage();
page.on('pageerror',e=>logs.push('PAGEERROR: '+e.message.slice(0,300)));page.on('console',m=>{if(m.type()==='error'&&!/supabase|Failed to fetch|net::ERR|404|geopf|WebSocket|open-meteo/i.test(m.text()))logs.push(m.text().slice(0,200));});page.on('dialog',d=>d.accept().catch(()=>{}));
await ctx.route(u=>/(^|\.)geopf\.fr$|^geo\.api\.gouv\.fr$|open-meteo\.com$/.test(u.hostname),r=>r.fulfill({status:200,contentType:'application/json',body:'[]'}));
const wait=ms=>page.waitForTimeout(ms);
await page.goto(BASE+'/traceur.html');await wait(500);await page.evaluate(()=>{localStorage.clear();});await page.reload();await wait(600);
await page.evaluate(()=>{const S=window.MAQ.state;S.lines=[{id:'L1',name:'Feeder',dn:100,bar:12,pts:[[10,50],[16,50.15],[40,50]],specials:[],parent:null}];S.seq=2;window.MAQ.setMode('select');window.MAQ.rebuild();});
await page.click('#bSave');await wait(200);await page.fill('#svName','Outils test');await page.click('#svOk');await wait(800);await page.click('#svGo');await wait(1800);
await page.selectOption('#roleSel','ethan');await wait(200);
const st=()=>page.evaluate(()=>{const A=window.TRACE.state.lines.L1.cond.A;return {els:A.els.map(e=>e.kind+':'+(+e.len).toFixed(2)),j:A.joints.map(j=>({id:j.weldId,idx:j.idx,st:j.status})),rec:(window.TRACE.net.removedWelds||[]).map(r=>r.weldId)};});
const cand=await page.evaluate(()=>{const A=window.TRACE.state.lines.L1.cond.A;return A.joints.map((j,i)=>{const a=A.els[j.idx],b=A.els[j.idx+1];return {i,id:j.weldId,pp:!!(a&&b&&a.kind==='pipe'&&b.kind==='pipe'),sum:a&&b?+(+a.len+ +b.len).toFixed(2):null};});});
const ok=cand.find(x=>x.pp&&x.sum<=12.01),big=cand.find(x=>x.pp&&x.sum>12.01);
const tools=async i=>{await page.evaluate(i=>{const T=window.TRACE;const n=T.state.lines.L1.cond.A.joints.length;T.openJoint('L1','A',(i+1)%n);},i);await wait(250);await page.evaluate(i=>{window.TRACE.openJoint('L1','A',i);},i);await wait(350); /* ouvrir une autre soudure d'abord : retoucher la même referme la fiche */return page.evaluate(()=>[...document.querySelectorAll('#sheet .jtools [data-act]')].map(b=>b.dataset.act));};
let o={ok,big,s0:await st()};
o.tOk=ok?await tools(ok.i):null;o.tBig=big?await tools(big.i):null;
await page.evaluate(i=>{window.TRACE.state.lines.L1.cond.A.joints[i].status='soudee';},ok.i);o.tPointee=await tools(ok.i);await page.evaluate(i=>{const j=window.TRACE.state.lines.L1.cond.A.joints[i];j.status='a_souder';delete j.steps;j.events=[];},ok.i); /* la fiche migre l'état en étapes : on remet la soudure vierge */
console.log('o1/o2) boutons :',J(o));
C.o1=!!ok&&J(o.tOk)===J(['j-slide','j-add','j-del']);C.o2=!!big&&!o.tBig.includes('j-del')&&!o.tPointee.includes('j-del');
/* o3 */
await tools(ok.i);await page.click('#sheet [data-act="j-del"]');await wait(500);const s1=await st();
await page.evaluate(()=>window.TRACE.extraReplay());await wait(500);const s2=await st();
o={s1,s2,gone1:!s1.j.some(j=>j.id===ok.id),gone2:!s2.j.some(j=>j.id===ok.id)};console.log('o3) retrait + rejoué :',J(o));
C.o3=o.gone1&&o.gone2&&s1.rec.includes(ok.id)&&s1.els.includes('pipe:12.00')&&s1.j.length===o.s1.j.length&&s2.j.length===s1.j.length&&s1.j.length===cand.length-1;
/* o4 */
const ji=await page.evaluate(()=>window.TRACE.state.lines.L1.cond.A.joints.findIndex((j,i,A)=>{const E=window.TRACE.state.lines.L1.cond.A.els;return E[j.idx]&&E[j.idx+1]&&E[j.idx].kind==='pipe'&&E[j.idx+1].kind==='pipe';}));
await tools(ji);await page.click('#sheet [data-act="j-slide"]');await wait(500);
o={slide:await page.evaluate(()=>{const P=window.TRACE.state.slidePose;return P?{step:P.step,id:P.weldId}:null;}),want:await page.evaluate(i=>window.TRACE.state.lines.L1.cond.A.joints[i].weldId,ji)};
await page.evaluate(()=>{const b=document.querySelector('#slideBar [data-sl="cancel"]');if(b)b.click();});await wait(300);
await tools(ji);await page.click('#sheet [data-act="j-add"]');await wait(400);o.extra=await page.evaluate(()=>!!window.TRACE.state.extraPose);await page.evaluate(()=>{if(window.TRACE.state.extraPose)document.querySelector('#btnExtraWeld')&&document.querySelector('#btnExtraWeld').click();});
console.log('o4) Décaler / Ajouter :',J(o));C.o4=o.slide&&o.slide.step==='adj'&&o.slide.id===o.want&&o.extra;
/* o5 */
await page.evaluate(()=>{window.TRACE.state.extraPose=false;const f=document.getElementById('planFab');if(f)f.click();});await wait(400);
o=await page.evaluate(()=>{const B=[...document.querySelectorAll('#modal [data-pose-mode]')];return {first:B.slice(0,3).map(b=>b.dataset.poseMode),dis:B.filter(b=>b.disabled).length};});
console.log('o5) menu + :',J(o));C.o5=J(o.first)===J(['extra','slide','del'])&&o.dis===0;
C.o6=!logs.length;if(logs.length)console.log('console :',logs);
console.log('RÉSULTATS',J(C));console.log('RESULTAT:',Object.values(C).every(Boolean)?'TOUT VERT':'ÉCHEC '+Object.keys(C).filter(k=>!C[k]).join(' '));await browser.close();process.exit(Object.values(C).every(Boolean)?0:1);
