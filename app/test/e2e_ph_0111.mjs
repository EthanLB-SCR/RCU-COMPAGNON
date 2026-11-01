// e2e_ph_0111 — 01/11 soir (Ethan, Phasage : « le fonctionnement est bien, mais c'est visuellement lourd ; on ne distingue pas trop le planning d'ensemble de la phase
//   repliée / pas repliée ; possibilité sur une plage donnée au phasage de décocher des jours pour la soudure et le terrassement s'ils ne sont pas là tous les jours »)
//  p1  vue d'ensemble à part (bandeau sombre) : UNE vue à la fois — 📊 Semaines par défaut, 🗺 Plan, 📅 Jours (planning soudure & terrassement)
//  p2  phases repliées = une ligne + petite frise placée dans le planning d'ensemble ; toucher la ligne déplie (carte détachée, bandeau à sa couleur), retoucher replie
//  p3  soudure : jours prévus cochés d'office (pointillés) ; toucher un jour ouvré le DÉCOCHE (absent) → un jour de soudure de moins, plus de soudure ce jour-là dans
//      le planning ; un samedi de la fenêtre → forcé (un de plus)
//  p4  « Rien » → tout décoché, on coche 2 jours → cadence sur 2 jours ; « ↺ Prévus » → retour aux jours prévus
//  p5  terrassement : jours ouvrés des périodes ouverture + remblai cochés d'office ; décocher un jour d'ouverture → un jour de moins, ml/j recalculés, plus de
//      « ml ouverts » ce jour-là au planning, barré dans le calendrier ; un samedi forcé → ml ouverts ce samedi ; « ↺ Tous les jours ouvrés » → retour
//  p6  export : jours sans terrassement listés ; p7 rechargement : tout est gardé ; p8 téléphone 390 : rien ne déborde, périodes sur 2 colonnes
//  p9  soudeur (pas le droit Phasage) : pastilles grisées ; p10 zéro erreur de page
import { chromium } from 'playwright';
const BASE=process.env.BASE||'http://localhost:8765';const C={};const J=x=>JSON.stringify(x);const errs=[];
const b=await chromium.launch({executablePath:process.env.CHROMIUM_PATH||undefined});const ctx=await b.newContext({viewport:{width:1280,height:900}});const page=await ctx.newPage();
page.on('pageerror',e=>errs.push(String(e)));page.on('dialog',d=>d.accept().catch(()=>{}));
const W=ms=>page.waitForTimeout(ms);const T=(fn,arg)=>page.evaluate(fn,arg);
await page.clock.install({time:new Date(2026,10,2,8,30,0)}); /* lundi 02/11/2026 */
await page.goto(BASE+'/traceur.html');await W(500);await T(()=>localStorage.clear());await page.reload();await W(600);
await T(()=>{const S=window.MAQ.state;S.supplier='RENALIA';S.lines=[
  {id:'L1',name:'Rue de la Gare',dn:150,bar:12,pts:[[10,50],[250,50]],specials:[],parent:null},
  {id:'L2',name:'Impasse des Lilas',dn:80,bar:12,pts:[[70,50],[70,140]],specials:[],parent:{line:'L1',m:60,side:1}}];S.seq=3;window.MAQ.setMode('select');window.MAQ.rebuild();});
await page.click('#bSave');await W(200);await page.fill('#svName','Phasage présence');await page.click('#svOk');await W(700);
await page.click('#svGo');await W(1500);await page.selectOption('#roleSel','ethan');await W(300);await T(()=>{try{window.TRACE.tuto.close(null);}catch(e){}});
await T(()=>{const X=window.TRACE;const L=Object.values(X.lines);const L1=L.find(l=>!l.parent),L2=L.find(l=>l.parent);
  const P=X.phasage.of();P.week=4;P.phases=[
  {id:'PH001',name:'Phase 1',level:'exe',parent:null,color:'#8a5a2b',tr:[{line:L1.id,m0:0,m1:120}],dates:{tr:['2026-11-02','2026-11-06'],so:['2026-11-04','2026-11-13'],rb:['2026-11-09','2026-11-13'],en:['2026-11-16','2026-11-16']},days:[]},
  {id:'PH002',name:'Phase 2',level:'exe',parent:null,color:'#2a78d6',tr:[{line:L2.id,m0:0,m1:90}],dates:{tr:['2026-11-16','2026-11-20'],so:['2026-11-17','2026-11-26'],rb:['2026-11-23','2026-11-27'],en:['2026-11-30','2026-11-30']},days:[]}];P.seq=3;
  X.state.tab='phasage';X.state.phOpen=null;X.renderAll();});await W(500);
const vis=sel=>T(sel=>{const e=document.querySelector(sel);if(!e)return null;const r=e.getBoundingClientRect();return r.width>0&&r.height>0&&getComputedStyle(e).display!=='none';},sel);
const o={};
// ── p1
o.p1={sem:await vis('#phasage .phV-sem .phGantt'),plan:await vis('#phasage .phV-plan .phMini'),jours:await vis('#phasage #phPlanning'),seg:await T(()=>[...document.querySelectorAll('#phasage .phSeg button')].map(b=>b.textContent+(b.classList.contains('on')?'*':''))),head:await T(()=>(document.querySelector('#phasage .phEns>.phSecH b')||{}).textContent)};
await T(()=>document.querySelector('#phasage [data-phens="plan"]').click());await W(250);o.p1.plan2={plan:await vis('#phasage .phMini'),sem:await vis('#phasage .phGantt')};
await T(()=>document.querySelector('#phasage [data-phens="jours"]').click());await W(250);o.p1.jours2={jours:await vis('#phasage #phPlanning .phPlan'),plan:await vis('#phasage .phMini')};
await T(()=>document.querySelector('#phasage [data-phens="sem"]').click());await W(250);
C.p1=o.p1.head==="Vue d'ensemble"&&o.p1.sem===true&&o.p1.plan===false&&o.p1.jours===false&&J(o.p1.seg)==='["🗺 Plan","📊 Semaines*","📅 Jours"]'&&o.p1.plan2.plan&&!o.p1.plan2.sem&&o.p1.jours2.jours&&!o.p1.jours2.plan;
// ── p2 : lignes repliées, frise, ouvrir en touchant la ligne
o.p2={fold:await T(()=>[...document.querySelectorAll('#phList .ph')].map(c=>({id:c.dataset.phc,fold:c.classList.contains('phFold'),tl:c.querySelectorAll('.phTl i').length,body:!!c.querySelector('.phBody')})))};
await T(()=>{const n=document.querySelector('#phList .ph[data-phc="PH001"] .phH .phHt');n.click();});await W(300);
o.p2.open=await T(()=>{const c=document.querySelector('#phList .ph[data-phc="PH001"]');const h=c.querySelector('.phH');return {open:c.classList.contains('phOpen'),body:!!c.querySelector('.phBody'),bg:getComputedStyle(h).backgroundColor,other:document.querySelector('#phList .ph[data-phc="PH002"]').classList.contains('phFold'),secs:[...c.querySelectorAll('.phSecT')].map(x=>x.textContent)};});
C.p2=o.p2.fold.length===2&&o.p2.fold.every(x=>x.fold&&!x.body&&x.tl>=3)&&o.p2.open.open&&o.p2.open.body&&o.p2.open.bg==='rgb(138, 90, 43)'&&o.p2.open.other&&J(o.p2.open.secs)==='["Périodes","Présence sur le chantier","Soudures, cadence et fournitures"]';
// ── p3 : soudure prévue, décocher un jour, forcer un samedi
const calc=()=>T(()=>{const X=window.TRACE;const P=X.phasage.of();const ph=P.phases.find(p=>p.id==='PH001');const Cc=X.phasage.calc([ph],P.week);return {days:Cc.days,picked:Cc.picked,trDays:Cc.trDays,rbDays:Cc.rbDays,mlTr:Cc.mlTr&&+Cc.mlTr.toFixed(2),len:+Cc.len.toFixed(2),off:ph.off||[],force:ph.force||[],pdays:ph.days||[],set:!!ph.daysSet,offT:ph.offT||[],forceT:ph.forceT||[]};});
const loads=d=>T(d=>{const X=window.TRACE;const M=X.phasage.loads(X.phasage.of());const L=M[d];return L?{so:L.so.length,theo:L.so.some(x=>x.theo),tr:L.tr.length,rb:L.rb.length}:null;},d);
o.p3={c0:await calc(),pv:await T(()=>[...document.querySelectorAll('#phasage .phDays:not(.phTer) .phDay.pv[data-ph="PH001"]')].map(x=>x.dataset.phpick)),l5:await loads('2026-11-05')};
await T(()=>document.querySelector('#phasage .phDays:not(.phTer) [data-phpick="2026-11-05"]').click());await W(250);
o.p3.c1=await calc();o.p3.l5b=await loads('2026-11-05');o.p3.chip=await T(()=>{const c=document.querySelector('#phasage .phDays:not(.phTer) [data-phpick="2026-11-05"]');return c?c.className:'';});
await T(()=>document.querySelector('#phasage .phDays:not(.phTer) [data-phpick="2026-11-07"]').click());await W(250);o.p3.c2=await calc();o.p3.l7=await loads('2026-11-07');
C.p3=o.p3.c0.days===5&&J(o.p3.pv)==='["2026-11-04","2026-11-05","2026-11-09","2026-11-10","2026-11-12"]'&&!!o.p3.l5&&o.p3.l5.so===1&&o.p3.l5.theo
  &&o.p3.c1.days===4&&J(o.p3.c1.off)==='["2026-11-05"]'&&o.p3.c1.picked===0&&(!o.p3.l5b||o.p3.l5b.so===0)&&!/\bpv\b/.test(o.p3.chip)
  &&o.p3.c2.days===5&&J(o.p3.c2.force)==='["2026-11-07"]'&&!!o.p3.l7&&o.p3.l7.so===1;
// ── p4 : « Rien » puis 2 jours ; « ↺ Prévus »
await T(()=>document.querySelector('#phasage [data-phpicknone="PH001"]').click());await W(250);o.p4={c0:await calc(),on:await T(()=>document.querySelectorAll('#phasage .phDays:not(.phTer) .phDay.on, #phasage .phDays:not(.phTer) .phDay.pv').length)};
for(const k of ['2026-11-04','2026-11-10']){await T(k=>document.querySelector(`#phasage .phDays:not(.phTer) [data-phpick="${k}"]`).click(),k);await W(200);}
o.p4.c1=await calc();o.p4.txt=await T(()=>/2 jours cochés/.test(document.querySelector('#phasage').textContent));
await T(()=>document.querySelector('#phasage [data-phpickreset="PH001"]').click());await W(250);o.p4.c2=await calc();
C.p4=o.p4.c0.set&&o.p4.c0.pdays.length===0&&o.p4.on===0&&J(o.p4.c1.pdays)==='["2026-11-04","2026-11-10"]'&&o.p4.c1.picked===2&&o.p4.txt&&o.p4.c2.pdays.length===0&&!o.p4.c2.set&&o.p4.c2.days===5;
// ── p5 : terrassement (ouverture 02 → 06/11 : 5 j ; remblai 09 → 13/11 : 4 j, le 11/11 est férié ; samedi / dimanche 07-08 hors périodes)
o.p5={c0:await calc(),chips:await T(()=>document.querySelectorAll('#phasage .phTer .phDay[data-phter]').length),on:await T(()=>document.querySelectorAll('#phasage .phTer .phDay.on').length),l3:await loads('2026-11-03')};
await T(()=>document.querySelector('#phasage .phTer [data-phter="2026-11-03"]').click());await W(250);
o.p5.c1=await calc();o.p5.l3b=await loads('2026-11-03');o.p5.cal=await T(()=>{const d=document.querySelector('#phasage .phCal div[title^="2026-11-03"]');return d?d.className:'';});o.p5.cardTxt=await T(()=>document.querySelector('#phasage .phTer').textContent.replace(/\s+/g,' '));
o.p5.gap=await T(()=>{const c=document.querySelector('#phasage .phTer .phDay[title^="2026-11-07"]');return c?{dis:c.disabled,cls:c.className,at:c.hasAttribute('data-phter')}:null;});
await T(()=>{const X=window.TRACE;const ph=X.phasage.of().phases.find(p=>p.id==='PH001');ph.dates.rb=['2026-11-07','2026-11-13'];X.phasage.render();});await W(200); /* le remblai commence le samedi : on peut le forcer */
await T(()=>document.querySelector('#phasage .phTer [data-phter="2026-11-07"]').click());await W(250);o.p5.c3=await calc();o.p5.l7b=await loads('2026-11-07');
await T(()=>document.querySelector('#phasage [data-phterreset="PH001"]').click());await W(250);o.p5.c4=await calc();
C.p5=o.p5.c0.trDays===5&&o.p5.c0.rbDays===4&&o.p5.chips===10&&o.p5.on===9&&!!o.p5.l3&&o.p5.l3.tr===1
  &&o.p5.c1.trDays===4&&J(o.p5.c1.offT)==='["2026-11-03"]'&&Math.abs(o.p5.c1.mlTr-o.p5.c1.len/4)<0.02&&(!o.p5.l3b||o.p5.l3b.tr===0)&&/\bxT\b/.test(o.p5.cal)&&/1 décoché/.test(o.p5.cardTxt)
  &&!!o.p5.gap&&o.p5.gap.dis&&!o.p5.gap.at&&/\bgap\b/.test(o.p5.gap.cls)
  &&J(o.p5.c3.forceT)==='["2026-11-07"]'&&o.p5.c3.rbDays===5&&!!o.p5.l7b&&o.p5.l7b.rb===1&&o.p5.c4.offT.length===0&&o.p5.c4.forceT.length===0&&o.p5.c4.trDays===5&&o.p5.c4.rbDays===4;
// ── p6 : export
await T(()=>document.querySelector('#phasage .phTer [data-phter="2026-11-04"]').click());await W(250);
const popup=page.waitForEvent('popup',{timeout:8000}).catch(()=>null);await T(()=>document.getElementById('phExport').click());const pop=await popup;
o.p6=pop?await pop.evaluate(()=>{const t=document.body.innerText;return {off:/Jours sans terrassement \(décochés\)\s*04\/11/.test(t)};}).catch(e=>({err:String(e)})):null;if(pop)await pop.close();
C.p6=!!o.p6&&o.p6.off;
// ── p7 : rechargement
const siteId=await T(()=>window.TRACE.state.siteId);await page.reload();await W(1500);
for(let i=0;i<6;i++){await T(id=>window.TRACE.go(id),siteId);try{await page.waitForFunction(()=>window.TRACE.state.siteId&&window.TRACE.state.screen==='site'&&Object.keys(window.TRACE.lines).length>0,null,{timeout:4000});break;}catch(e){}}
o.p7=await T(()=>{const ph=window.TRACE.net.phasage.phases.find(p=>p.id==='PH001');return {offT:ph.offT,off:ph.off,force:ph.force};});
C.p7=J(o.p7.offT)==='["2026-11-04"]'&&J(o.p7.off)==='["2026-11-05"]'&&J(o.p7.force)==='["2026-11-07"]';
// ── p8 : téléphone 390, phase dépliée
await page.setViewportSize({width:390,height:844});await page.selectOption('#roleSel','ethan').catch(()=>{});await W(200);
await T(()=>{const X=window.TRACE;X.state.tab='phasage';X.state.phOpen='PH001';X.renderAll();});await W(400);
o.p8=await T(()=>{const se=document.scrollingElement;const card=document.querySelector('#phList .ph.phOpen');const cr=card.getBoundingClientRect();const over=[...card.querySelectorAll('*')].filter(e=>{const r=e.getBoundingClientRect();return r.width>0&&r.right>cr.right+1&&!e.closest('.phPlan,.phGantt,.phDayRow,.phT,div[style*="overflow"]');}).map(e=>e.tagName+'.'+e.className).slice(0,4);
  const steps=[...card.querySelectorAll('.phSteps>div')].map(d=>Math.round(d.getBoundingClientRect().left));return {sw:se.scrollWidth,iw:innerWidth,over,cols:new Set(steps).size};});
C.p8=o.p8.sw<=o.p8.iw+1&&!o.p8.over.length&&o.p8.cols===2;
// ── p9 : soudeur
await page.selectOption('#roleSel','karim');await W(300);await T(()=>{const X=window.TRACE;X.state.phOpen='PH001';X.phasage.render();});await W(300); /* l'onglet n'est pas le sien : on dessine le contenu directement, avec SES droits */
o.p9=await T(()=>({uid:window.TRACE.state.userId,can:window.TRACE.acces.can('phasage.edit'),sel:document.getElementById('roleSel').value,chips:document.querySelectorAll('#phasage .phDays .phDay').length,dis:[...document.querySelectorAll('#phasage .phDays .phDay')].every(b=>b.disabled),btn:!!document.querySelector('#phasage [data-phpicknone],#phasage [data-phterreset]')}));
C.p9=o.p9.chips>0&&o.p9.dis&&!o.p9.btn;
console.log('mesures :',J(o).slice(0,5000));
await b.close();C.p10=!errs.length;if(errs.length)console.log('erreurs',errs.slice(0,3));
console.log('RÉSULTATS',J(C));const ko=Object.entries(C).filter(([,v])=>!v).map(([k])=>k);console.log(ko.length?'RESULTAT: ECHEC '+ko.join(' '):'RESULTAT: TOUT VERT');process.exit(ko.length?1:0);
