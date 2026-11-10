// 10/11 (Ethan : « pour besoin livré / reste à poser : un petit check rapide, entourer une ou plusieurs zones, valider, et que ça compare et dise s'il manque quelque chose »)
import { chromium } from 'playwright';
const BASE=process.env.BASE||'http://localhost:8765';const J=x=>JSON.stringify(x);
const browser=await chromium.launch({headless:true,args:['--ignore-gpu-blocklist','--enable-unsafe-swiftshader']});const page=await browser.newPage({viewport:{width:1366,height:900}});
const logs=[];page.on('pageerror',e=>logs.push('PAGEERROR: '+e.message.slice(0,300)));page.on('dialog',d=>d.accept().catch(()=>{}));const W=ms=>page.waitForTimeout(ms);const T=(f,a)=>page.evaluate(f,a);const C={};
await page.goto(BASE+'/traceur.html');await W(600);await T(()=>localStorage.clear());await page.reload();await W(700);
await T(()=>{const S=window.MAQ.state;S.supplier='AXIOM';S.lines=[{id:'L1',name:'Feeder',dn:200,bar:12,pts:[[0,50],[120,50]],specials:[],parent:null},{id:'L2',name:'Antenne',dn:100,bar:12,pts:[[0,100],[84,100]],specials:[],parent:null}];S.seq=3;window.MAQ.setMode('select');window.MAQ.rebuild();});
await page.click('#bSave');await W(200);await page.fill('#svName','Check fourniture');await page.click('#svOk');await W(800);
await page.click('#svGo');await W(1500);await page.selectOption('#roleSel','ethan');await W(300);await T(()=>{try{window.TRACE.tuto.close(null);}catch(e){}});
await T(async()=>{document.querySelector('#facets [data-facet=tech]').click();await new Promise(r=>setTimeout(r,200));document.querySelector('#tabbar [data-tab="stock"]').click();await new Promise(r=>setTimeout(r,300));});
// c1) le bouton « Ai-je la fourniture ? » est dans Stockage ; il ouvre le plan en mode vérification (barre dédiée, « ✓ Vérifier »)
const c1=await T(async()=>{const b=document.getElementById('stk-check');if(!b)return {btn:false};b.click();await new Promise(r=>setTimeout(r,400));const p=window.TRACE.state.fzPose;return {btn:true,check:!!(p&&p.check),tab:window.TRACE.state.tab,msg:(document.getElementById('fzMsg')||{}).textContent};});
console.log('c1)',J(c1));C.c1=c1.btn&&c1.check&&c1.tab==='plan'&&/Ai-je la fourniture/.test(c1.msg);
// c2) on entoure le Feeder seul (stock vide) → il manque tout : barres DN200 (10), manchons, mousse ; l'antenne DN100 n'est pas comptée
const poly=[[-5,40],[125,40],[125,60],[-5,60]];
const c2=await T(async P=>{const F=window.TRACE.fourniture;P.forEach(q=>F.tap(q[0],q[1]));await new Promise(r=>setTimeout(r,200));const ok=document.getElementById('fzOk');const okTxt=ok.textContent;ok.click();await new Promise(r=>setTimeout(r,500));
  const m=document.querySelector('#modal.show');const rows=[...(m?m.querySelectorAll('table tr'):[])].slice(1).map(tr=>[...tr.children].map(td=>td.textContent.trim()));return {okTxt,pose:!!window.TRACE.state.fzPose,zones:(window.TRACE.state.fzCheck||[]).length,h:m?m.querySelector('h3').textContent:'',warn:!!(m&&m.querySelector('.warnbox')),rows};},poly);
console.log('c2)',J(c2).slice(0,600));const barres=c2.rows.find(r=>/Barre.*DN ?200|DN ?200.*Barre/i.test(r[0]));
C.c2=c2.okTxt==='✓ Vérifier'&&!c2.pose&&c2.zones===1&&/Ai-je la fourniture/.test(c2.h)&&c2.warn&&!!barres&&/^20 barres/.test(barres[1])&&barres[2]==='0'&&/− 20/.test(barres[3]) /* aller + retour : 2 × 10 barres */&&!c2.rows.some(r=>/DN ?100/.test(r[0]));
// c3) 20 barres DN200 + les manchons livrés sur le chantier → plus de manque sur ces lignes ; la mousse manque encore (et 22 doses attendues)
await T(()=>{const s=window.TRACE.net.stock;const liv={id:'Ltest',label:'Camion test',bl:'BL1',at:new Date().toISOString(),date:'2026-11-12',status:'recu',by:'test'};s.livs.push(liv);
  const n=window.TRACE.fourniture.needs(null).need;const nMan=Object.entries(n).filter(([k])=>/^sleeve:200/.test(k)).reduce((a,[,v])=>a+v,0);
  s.lots.push({id:'Ltest:0',liv:'Ltest',zone:null,pend:false,key:'pipe:200:::12:',label:'Barre DN200 12 m',kind:'pipe',dn:200,len:12,qty:20});
  s.lots.push({id:'Ltest:1',liv:'Ltest',zone:null,pend:false,key:'sleeve:200::315::',label:'Manchon DN200 Ø315',kind:'sleeve',dn:200,gaine:315,qty:nMan});
  s.livs.push({id:'Lprev',label:'Camion prévu',bl:'',at:new Date().toISOString(),date:'2026-11-20',status:'prevu',by:'test'});s.lots.push({id:'Lprev:0',liv:'Lprev',zone:null,pend:true,key:'pu:200::315::',label:'Mousse PU DN200',kind:'pu',dn:200,gaine:315,qty:22});});
const c3=await T(P=>{const R=window.TRACE.fourniture.check([P]);const by={};R.rows.forEach(r=>{by[r.k]=r;});return {n:R.rows.length,nManque:R.nManque,tout:R.tout,pipe:by['pipe:200'],sl:Object.entries(by).find(([k])=>/^sleeve:200/.test(k))?.[1],pu:Object.entries(by).find(([k])=>/^pu:/.test(k))?.[1]};},poly);
console.log('c3)',J(c3).slice(0,500));C.c3=!!c3.pipe&&c3.pipe.manque===0&&c3.pipe.dispo===20&&!!c3.sl&&c3.sl.manque===0&&!!c3.pu&&c3.pu.manque>0&&c3.pu.att===22&&c3.pu.attD==='2026-11-20'&&!c3.tout;
// c4) deux zones : « ＋ Entourer une autre zone » garde la première ; l'antenne entre dans le compte (barres DN100 : 7) ; « Fermer » efface tout
const c4=await T(async()=>{const w=ms=>new Promise(r=>setTimeout(r,ms));document.getElementById('fzc-more').click();await w(400);const F=window.TRACE.fourniture;[[-5,90],[90,90],[90,110],[-5,110]].forEach(q=>F.tap(q[0],q[1]));await w(150);document.getElementById('fzOk').click();await w(500);
  const m=document.querySelector('#modal.show');const rows=[...(m?m.querySelectorAll('table tr'):[])].slice(1).map(tr=>[...tr.children].map(td=>td.textContent.trim()));const zones=(window.TRACE.state.fzCheck||[]).length;const hint=(m&&m.querySelector('.hint')||{}).textContent||'';
  document.getElementById('fzc-close').click();await w(300);return {zones,hint,rows,after:window.TRACE.state.fzCheck,modal:!!document.querySelector('#modal.show'),svg:!!document.querySelector('#fzG polygon')};});
console.log('c4)',J(c4).slice(0,500));const b100=c4.rows.find(r=>/DN ?100/.test(r[0])&&/Barre/i.test(r[0]));C.c4=c4.zones===2&&/2 zones/.test(c4.hint)&&!!b100&&/^14 barres/.test(b100[1])&&c4.after===null&&!c4.modal;
// c5) une zone sans réseau dedans : message clair, pas d'erreur ; ✕ pendant le tracé → annulé proprement
const c5=await T(async()=>{const w=ms=>new Promise(r=>setTimeout(r,ms));window.TRACE.fourniture.checkStart();await w(300);const F=window.TRACE.fourniture;[[300,300],[320,300],[320,320]].forEach(q=>F.tap(q[0],q[1]));await w(150);document.getElementById('fzOk').click();await w(400);const m=document.querySelector('#modal.show');const txt=m?m.textContent:'';
  document.getElementById('fzc-redo').click();await w(300);F.tap(1,1);document.getElementById('fzCancel').click();await w(300);return {txt:txt.slice(0,160),pose:!!window.TRACE.state.fzPose,check:window.TRACE.state.fzCheck,modal:!!document.querySelector('#modal.show')};});
console.log('c5)',J(c5));C.c5=/Aucun tronçon/.test(c5.txt)&&!c5.pose&&!(c5.check||[]).length&&!c5.modal;
C.c6=!logs.length;if(logs.length)console.log('logs',J(logs.slice(0,3)));
const ko=Object.keys(C).filter(k=>!C[k]);console.log('RESULTAT',J(C),ko.length?'ECHEC '+ko.join(','):'TOUT VERT');await browser.close();
