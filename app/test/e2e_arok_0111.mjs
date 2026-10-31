// e2e_arok_0111 — 01/11 soir (Ethan : « pour les inversions il faut l'option, si le réseau ne raccorde pas directement la chaufferie, de dire vers où est la
//   chaufferie pour avoir un repère, et pouvoir déclarer que c'est normal si l'aller et le retour sont inversés pour faire disparaître ces repères »)
//  d1  toucher (vrai doigt) un repère ⇄ A/R du plan → sa fenêtre : « C'est normal » + « chaufferie » (chef / bureau)
//  d2  « ✓ C'est normal » → plus de repère sur cette ligne ; fiche de ses soudures : info neutre (plus d'alerte) ; gardé dans la fiche du chantier
//  d3  🏭 chaufferie posée (vrai doigt) au bout du feeder → le feeder (aller à droite du TRACÉ) se lit depuis sa fin : repères + alerte « repère 🏭 » ;
//      l'antenne n'est pas touchée (elle part de sa ligne mère) ; 🏭 dessinée sur le plan
//  d4  retirer le repère chaufferie → le feeder redevient normal, plus de 🏭
//  d5  annuler « c'est normal » depuis la liste de la fenêtre → les repères de l'antenne reviennent
//  d6  manchonneur : la fenêtre explique sans les boutons ; « ＋ Poser » : 🏭 grisé pour lui, actif pour le chef
//  d7  traceur : la ligne déclarée normale n'est plus « ⚠ Inversion A/R » (fiche du chantier relue)
//  d8  zéro erreur de page
import { chromium } from 'playwright';
const BASE=process.env.BASE||'http://localhost:8765';const C={};const J=x=>JSON.stringify(x);const errs=[];
const b=await chromium.launch({executablePath:process.env.CHROMIUM_PATH||undefined});const page=await (await b.newContext({viewport:{width:390,height:844}})).newPage();page.on('pageerror',e=>errs.push(String(e)));page.on('dialog',d=>d.accept().catch(()=>{}));
const W=ms=>page.waitForTimeout(ms);
await page.goto(BASE+'/traceur.html');await W(600);await page.evaluate(()=>{localStorage.clear();});await page.reload();await W(800);
await page.setViewportSize({width:1280,height:900});await W(200);
await page.evaluate(()=>{const S=window.MAQ.state;S.supplier='AXIOM';S.lines=[
  {id:'L1',name:'Feeder',dn:100,bar:12,inv:true,pts:[[10,50],[200,50]],specials:[],parent:null},
  {id:'L2',name:'Antenne SST',dn:80,bar:12,inv:false,pts:[[60,50],[60,80]],specials:[],parent:{line:'L1',m:50,side:1}}];S.seq=3;window.MAQ.setMode('select');window.MAQ.rebuild();});
await page.click('#bSave');await W(200);await page.fill('#svName','AR normal test');await page.click('#svOk');await W(800);
await page.click('#svGo');await W(1500);await page.setViewportSize({width:390,height:844});await W(300);
await page.evaluate(()=>{try{window.TRACE.tuto.close(null);}catch(e){}});
const o={};
o.ids=await page.evaluate(()=>{const T=window.TRACE;T.state.userId='ethan';T.state.tab='plan';T.closeSheet&&T.closeSheet();T.renderAll();const L1=Object.values(T.lines).find(l=>!l.parent);const L2=Object.values(T.lines).find(l=>l.parent);return {l1:L1.id,l2:L2.id,site:T.state.siteId};});
await W(300);
const marks=()=>page.evaluate(ids=>({l1:document.querySelectorAll(`#net .arInv[data-l="${ids.l1}"]`).length,l2:document.querySelectorAll(`#net .arInv[data-l="${ids.l2}"]`).length,chauf:!!document.querySelector('#net .arChauf')}),o.ids);
const closeModal=()=>page.evaluate(()=>{const m=document.getElementById('modal');const x=m&&m.querySelector('[data-close]');if(x)x.click();});
const sheetBox=async(lid,i)=>{await page.evaluate(([lid,i])=>{window.TRACE.openJoint(lid,'A',i);},[lid,i]);await W(400);const r=await page.evaluate(()=>{const s=document.getElementById('sheet');const bx=s.querySelector('.arInvBox');return {box:!!bx,alert:!!s.querySelector('.arInvBox[role=alert]'),ok:!!s.querySelector('.arInvBox.ok'),txt:bx?bx.textContent:''};});await page.evaluate(()=>window.TRACE.closeSheet&&window.TRACE.closeSheet());await W(250);return r;};
o.m0=await marks();
// d1 — vrai doigt sur un repère de l'antenne
o.tap=await page.evaluate(id=>{const g=document.querySelector(`#net .arInv[data-l="${id}"]`);if(!g)return null;const r=g.getBoundingClientRect();return {x:r.left+r.width/2,y:r.top+r.height/2};},o.ids.l2);
if(o.tap){await page.mouse.click(o.tap.x,o.tap.y);await W(400);}
o.d1=await page.evaluate(()=>{const m=document.getElementById('modal');return {open:!!(m&&m.classList.contains('show')),ok:!!document.querySelector('#modal #arOk'),chauf:!!document.querySelector('#modal #arChauf'),h:(document.querySelector('#modal h2')||{}).textContent||''};});
C.d1=o.m0.l1===0&&o.m0.l2>=1&&!!o.tap&&o.d1.ok&&o.d1.chauf&&/Antenne SST/.test(o.d1.h);
// d2 — c'est normal
await page.click('#modal #arOk');await W(500);
o.d2={m:await marks(),fi:await page.evaluate(id=>{const f=window.TRACE.ar.fiche();return {ok:!!(f.arOk&&f.arOk[id]),by:f.arOk&&f.arOk[id]&&f.arOk[id].by};},o.ids.l2),inv:await page.evaluate(id=>window.TRACE.ar.inv(id),o.ids.l2),raw:await page.evaluate(id=>window.TRACE.ar.raw(id),o.ids.l2)};
o.d2.sheet=await sheetBox(o.ids.l2,0);
C.d2=o.d2.m.l2===0&&o.d2.fi.ok&&/Ethan/.test(o.d2.fi.by||'')&&!o.d2.inv&&o.d2.raw&&o.d2.sheet.ok&&!o.d2.sheet.alert&&/normal/.test(o.d2.sheet.txt);
// d3 — 🏭 chaufferie au bout du feeder (vrai doigt sur le plan)
await page.evaluate(id=>window.TRACE.ar.open(id),o.ids.l2);await W(300);await page.click('#modal #arChauf');await W(300);
o.d3={pose:await page.evaluate(()=>window.TRACE.ar.pose()),bar:await page.evaluate(()=>{const x=document.getElementById('arBar');return !!x&&getComputedStyle(x).display!=='none';})};
o.d3.pt=await page.evaluate(()=>{const v=window.TRACE.state.view;const r=document.getElementById('canvas').getBoundingClientRect();return {x:r.left+196*v.k+v.tx,y:r.top+50*v.k+v.ty};});
await page.mouse.click(o.d3.pt.x,o.d3.pt.y);await W(500);
o.d3.fi=await page.evaluate(()=>{const f=window.TRACE.ar.fiche();return f.chauf?{x:f.chauf.x,y:f.chauf.y,by:f.chauf.by}:null;});o.d3.rev=await page.evaluate(()=>window.TRACE.ar.rev());o.d3.m=await marks();o.d3.poseEnd=!(await page.evaluate(()=>window.TRACE.ar.pose()));
o.d3.sheet=await sheetBox(o.ids.l1,1);
C.d3=o.d3.pose&&o.d3.bar&&!!o.d3.fi&&Math.abs(o.d3.fi.x-196)<3&&Math.abs(o.d3.fi.y-50)<3&&o.d3.rev.includes(o.ids.l1)&&!o.d3.rev.includes(o.ids.l2)&&o.d3.m.l1>=1&&o.d3.m.l2===0&&o.d3.m.chauf&&o.d3.poseEnd&&o.d3.sheet.alert&&/🏭/.test(o.d3.sheet.txt);
// d4 — retirer le repère chaufferie
await page.evaluate(id=>window.TRACE.ar.open(id),o.ids.l1);await W(300);o.d4={del:!!(await page.$('#modal #arChaufDel'))};if(o.d4.del){await page.click('#modal #arChaufDel');await W(500);}
o.d4.fi=await page.evaluate(()=>window.TRACE.ar.fiche().chauf||null);o.d4.m=await marks();
C.d4=o.d4.del&&!o.d4.fi&&o.d4.m.l1===0&&!o.d4.m.chauf;
// d5 — annuler « c'est normal » depuis la liste
await page.evaluate(()=>window.TRACE.ar.open(''));await W(300);o.d5={row:!!(await page.$(`#modal [data-arun="${o.ids.l2}"]`))};if(o.d5.row){await page.click(`#modal [data-arun="${o.ids.l2}"]`);await W(500);}
o.d5.m=await marks();o.d5.ok=await page.evaluate(id=>{const f=window.TRACE.ar.fiche();return !!(f.arOk&&f.arOk[id]);},o.ids.l2);
C.d5=o.d5.row&&o.d5.m.l2>=1&&!o.d5.ok;
// d6 — manchonneur : explications sans boutons ; ＋ Poser : 🏭 grisé pour lui, actif pour le chef
const poseChauf=async()=>{await page.evaluate(()=>{const f=document.getElementById('planFab');if(f)f.click();});await W(300);const r=await page.evaluate(()=>{const x=document.querySelector('#modal [data-pose-mode="chauf"]');return x?{on:!x.disabled}:null;});await closeModal();await W(200);return r;};
o.d6={chefPose:await poseChauf()};
await page.evaluate(()=>{const T=window.TRACE;T.state.userId='julien';T.renderAll();});await W(300);
await page.evaluate(id=>window.TRACE.ar.open(id),o.ids.l2);await W(300);
o.d6.modal=await page.evaluate(()=>({ok:!!document.querySelector('#modal #arOk'),chauf:!!document.querySelector('#modal #arChauf'),txt:(document.getElementById('modal')||{}).textContent||''}));await closeModal();await W(200);
o.d6.julPose=await poseChauf();
C.d6=!!o.d6.chefPose&&o.d6.chefPose.on&&!o.d6.modal.ok&&!o.d6.modal.chauf&&/chef de chantier ou le bureau/.test(o.d6.modal.txt)&&!!o.d6.julPose&&!o.d6.julPose.on;
// d7 — le traceur relit la fiche : la ligne déclarée normale n'est plus « ⚠ Inversion A/R »
await page.evaluate(()=>{const T=window.TRACE;T.state.userId='ethan';T.renderAll();});await W(200);
await page.evaluate(id=>window.TRACE.ar.open(id),o.ids.l2);await W(300);await page.click('#modal #arOk');await W(800);
await page.goto(BASE+'/traceur.html?site='+encodeURIComponent(o.ids.site)+'&v=t');await W(2500);await page.setViewportSize({width:1280,height:900});await W(300);
const btn=async id=>{await page.evaluate(id=>{const M=window.MAQ;M.state.sel={kind:'line',id};M.state.tab='sel';M.rebuild();},id);await W(250);return page.evaluate(()=>{const x=document.querySelector('[data-act=invLine]');return x?x.textContent:null;});};
o.d7={t1:await btn('L1'),t2:await btn('L2'),fiche:await page.evaluate(()=>{const r=window.MAQ.state.siteRef;return !!(r&&r.fiche&&r.fiche.arOk);})};
C.d7=o.d7.fiche&&/Aller à droite/.test(o.d7.t1||'')&&/déclarée normale/.test(o.d7.t2||'')&&!/⚠/.test(o.d7.t2||'');
console.log('mesures :',J(o));
await b.close();C.d8=!errs.length;if(errs.length)console.log('erreurs',errs.slice(0,3));
console.log('RÉSULTATS',J(C));const ko=Object.entries(C).filter(([,v])=>!v).map(([k])=>k);console.log(ko.length?'RESULTAT: ECHEC '+ko.join(' '):'RESULTAT: TOUT VERT');process.exit(ko.length?1:0);
