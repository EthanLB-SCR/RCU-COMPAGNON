// e2e_arinv_0111 — 01/11 (Ethan : inversion aller / retour = « aller rouge à droite, la chaufferie dans le dos ; si c'est l'inverse, c'est inversé » ;
//   « pour le manchonneur, au moment de faire les fils sur les tés, un rappel de regarder le plan de bouclage ou de demander au chef comment on boucle »)
//  c1  traceur : le bouton de la ligne dit « Inversion A/R » (rouge) quand l'aller est à gauche, « Aller à droite » sinon
//  c2  plan du chantier : repères « ⇄ A/R » sur la ligne inversée seulement (au départ puis tous les 60 m)
//  c3  fiche d'une soudure de la ligne inversée : alerte en tête ; ligne normale : rien
//  c4  soudure au té (sortie de té) : rappel du plan de bouclage à l'étape ② Fils raccordés ; soudure courante loin du té : pas de rappel
//  c5  zéro erreur de page
import { chromium } from 'playwright';
const BASE=process.env.BASE||'http://localhost:8765';const C={};const J=x=>JSON.stringify(x);const errs=[];
const b=await chromium.launch();const page=await (await b.newContext({viewport:{width:390,height:844}})).newPage();page.on('pageerror',e=>errs.push(String(e)));page.on('dialog',d=>d.accept().catch(()=>{}));
await page.goto(BASE+'/traceur.html');await page.waitForTimeout(600);await page.evaluate(()=>{localStorage.clear();localStorage.setItem('trace:wide','1');});await page.reload();await page.waitForTimeout(800);
await page.setViewportSize({width:1280,height:900});await page.waitForTimeout(200);
await page.evaluate(()=>{const S=window.MAQ.state;S.supplier='AXIOM';S.lines=[
  {id:'L1',name:'Feeder',dn:100,bar:12,inv:true,pts:[[10,50],[200,50]],specials:[],parent:null},
  {id:'L2',name:'Antenne SST',dn:80,bar:12,inv:false,pts:[[60,50],[60,80]],specials:[],parent:{line:'L1',m:50,side:1}}];S.seq=3;window.MAQ.setMode('select');window.MAQ.rebuild();});
const btn=async id=>{await page.evaluate(id=>{const M=window.MAQ;M.state.sel={kind:'line',id};M.state.tab='sel';M.rebuild();},id);await page.waitForTimeout(250);return page.evaluate(()=>{const x=document.querySelector('[data-act=invLine]');return x?x.textContent:null;});};
const o={t1:await btn('L1'),t2:await btn('L2')};
C.c1=/Aller à droite/.test(o.t1||'')&&/Inversion A\/R/.test(o.t2||'');
await page.click('#bSave');await page.waitForTimeout(200);await page.fill('#svName','Inversion test');await page.click('#svOk');await page.waitForTimeout(800);
await page.click('#svGo');await page.waitForTimeout(1500);await page.setViewportSize({width:390,height:844});await page.waitForTimeout(300);
await page.evaluate(()=>{try{window.TRACE.tuto.close(null);}catch(e){}});
o.ids=await page.evaluate(()=>{const T=window.TRACE;T.state.userId='julien';const L1=Object.values(T.lines).find(l=>!l.parent);const L2=Object.values(T.lines).find(l=>l.parent);T.renderAll();return {l1:L1.id,l2:L2.id,inv1:L1.inv,inv2:L2.inv,len1:+(L1.length||0).toFixed(1)};});
await page.waitForTimeout(300);
o.marks=await page.evaluate(ids=>({l1:document.querySelectorAll(`#net .arInv[data-l="${ids.l1}"]`).length,l2:document.querySelectorAll(`#net .arInv[data-l="${ids.l2}"]`).length}),o.ids);
C.c2=o.ids.inv1===true&&o.ids.inv2===false&&o.marks.l1===0&&o.marks.l2>=1;
const sheet=async(lid,i)=>{await page.evaluate(([lid,i])=>{window.TRACE.openJoint(lid,'A',i);},[lid,i]);await page.waitForTimeout(400);return page.evaluate(()=>{const s=document.getElementById('sheet');return {box:!!s.querySelector('.arInvBox'),boxFirst:(()=>{const h=s.querySelector(':scope > .head');return !!(h&&h.nextElementSibling&&h.nextElementSibling.classList.contains('arInvBox'));})(),tee:!!s.querySelector('.teeRemind'),teeOut:null};});};
o.s2=await sheet(o.ids.l2,0);o.s2.teeOut=await page.evaluate(lid=>!!window.TRACE.lines[lid].cond.A.joints[0].teeOut,o.ids.l2);
o.s1=await sheet(o.ids.l1,0);o.s1.teeOut=await page.evaluate(lid=>!!window.TRACE.lines[lid].cond.A.joints[0].teeOut,o.ids.l1);
console.log('mesures :',J(o));
C.c3=o.s2.box&&o.s2.boxFirst&&!o.s1.box;
C.c4=o.s2.teeOut&&o.s2.tee&&!o.s1.tee;
await b.close();C.c5=!errs.length;if(errs.length)console.log('erreurs',errs.slice(0,3));
console.log('RÉSULTATS',J(C));const ko=Object.entries(C).filter(([,v])=>!v).map(([k])=>k);console.log(ko.length?'RESULTAT: ECHEC '+ko.join(' '):'RESULTAT: TOUT VERT');process.exit(ko.length?1:0);
