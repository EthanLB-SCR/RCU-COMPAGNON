// PHASAGE (maquette v2 validée 07/10) : onglet, pose d'un tronçon sur le plan (PK libres + antenne « jusqu'où on tape »), 4 périodes,
// soudures induites par DN + moyenne/jour (semaine 4/5 j, fériés), fournitures, groupes libres, import marché figé + écart, persistance (NET.phasage) après rechargement.
import { chromium } from 'playwright';
const BASE=process.env.BASE||'http://localhost:8765';
const browser=await chromium.launch({headless:true, executablePath: process.env.CHROMIUM_PATH||undefined});
const ctx=await browser.newContext({viewport:{width:900,height:940}});const page=await ctx.newPage();
const logs=[];page.on('pageerror',e=>logs.push('PAGEERROR: '+e.message.slice(0,300)));page.on('console',m=>{if(m.type()==='error'&&!/supabase|Failed to fetch|net::ERR|404/i.test(m.text()))logs.push(m.text().slice(0,200));});
page.on('dialog',d=>d.accept().catch(()=>{}));
await page.goto(BASE+'/traceur.html');await page.waitForTimeout(500);
await page.evaluate(()=>{localStorage.clear();});await page.reload();await page.waitForTimeout(500);
await page.evaluate(()=>{const S=window.MAQ.state;S.supplier='RENALIA';S.lines=[
  {id:'L1',name:'Rue de la Gare',dn:150,bar:12,pts:[[10,50],[130,50]],specials:[],parent:null},
  {id:'L2',name:'Impasse des Lilas',dn:80,bar:12,pts:[[70,50],[70,110]],specials:[],parent:{line:'L1',m:60,side:1}}];S.seq=3;window.MAQ.setMode('select');window.MAQ.rebuild();});
await page.click('#bSave');await page.waitForTimeout(200);await page.fill('#svName','Phasage test');await page.click('#svOk');await page.waitForTimeout(600);
await page.click('#svGo');await page.waitForTimeout(1200);await page.selectOption('#roleSel','ethan');await page.waitForTimeout(300);
const siteId=await page.evaluate(()=>window.TRACE.state.siteId);
// ── 1) onglet présent, vide
await page.evaluate(()=>{document.querySelector('#tabbar [data-tab="phasage"]').click();});await page.waitForTimeout(400);
let out=await page.evaluate(()=>({tab:window.TRACE.state.tab,txt:document.querySelector('#phasage').textContent.slice(0,120),btn:!!document.querySelector('#phasage [data-phnew="ferme"]'),wk:document.querySelector('#phasage [data-phwk="4"].on')!==null}));
console.log('1) onglet Phasage:',JSON.stringify(out));const c1=out.tab==='phasage'&&out.btn&&out.wk&&/Phasage/.test(out.txt);
// ── 2) pose : début PK ~25 (milieu de barre), fin PK ~100, antenne touchée au PK ~30 → phase ferme créée
await page.evaluate(()=>document.querySelector('#phasage [data-phnew="ferme"]').click());await page.waitForTimeout(400);
out=await page.evaluate(()=>({tab:window.TRACE.state.tab,bar:document.querySelector('#phBar').style.display!=='none',pose:!!window.TRACE.state.phPose}));
console.log('2a) mode pose sur le plan, barre affichée:',JSON.stringify(out));
const tapWorld=async(x,y)=>{await page.evaluate(([x,y])=>window.TRACE.centerOn(x,y,30),[x,y]);await page.waitForTimeout(150);const pt=await page.evaluate(([x,y])=>{const v=window.TRACE.state.view;const r=document.querySelector('#canvas').getBoundingClientRect();return {x:r.left+x*v.k+v.tx,y:r.top+y*v.k+v.ty};},[x,y]);await page.mouse.move(pt.x,pt.y);await page.mouse.down();await page.waitForTimeout(40);await page.mouse.up();await page.waitForTimeout(300);};
// l'axe de la conduite aller est décalé de la ligne (y=50±0,17) : on tape sur la ligne, nearestOnLines fait le reste
await tapWorld(35,50);await tapWorld(110,50);await tapWorld(70,80);
out=await page.evaluate(()=>{const p=window.TRACE.state.phPose;return {a:p&&p.a,b:p&&p.b,ant:p&&p.ant,ok:document.querySelector('#phOk').style.display!=='none'};});
console.log('2b) début / fin / antenne jusqu\'au PK:',JSON.stringify(out));
const c2a=out.a&&Math.abs(out.a.m-25)<1.5&&out.b&&Math.abs(out.b.m-100)<1.5&&out.ant&&out.ant.length===1&&Math.abs(out.ant[0].m1-30)<1.5&&out.ok;
await page.evaluate(()=>document.querySelector('#phOk').click());await page.waitForTimeout(500);
out=await page.evaluate(()=>{const P=window.TRACE.net.phasage;const ph=P.phases[0];return {tab:window.TRACE.state.tab,n:P.phases.length,level:ph&&ph.level,tr:ph&&ph.tr,name:ph&&ph.name,open:!!document.querySelector('#phasage [data-phd="so"]')};});
console.log('2c) phase ferme enregistrée, onglet rouvert avec la fiche:',JSON.stringify(out));
const c2c=out.tab==='phasage'&&out.n===1&&out.level==='ferme'&&out.tr.length===2&&out.tr[1].line==='L2'&&out.open;
// ── 3) soudures induites par DN : tracé L1 DN150 soudures tous les 12 m → PK 36,48,60,72,84,96 dans [25,100[ = 6 × 2 conduites + recoupe à 25 (×2) ; antenne DN80 : soudures ≤ 30 (sortie de té PK 0 et PK 12, 24) × 2
out=await page.evaluate(()=>{const T=window.TRACE;const ph=T.net.phasage.phases[0];const W=T.phasage.welds(ph);const L1=Object.values(T.lines).find(l=>!l.parent),L2=Object.values(T.lines).find(l=>l.parent);
  const exp150=['A','R'].reduce((s,c)=>s+L1.cond[c].joints.filter(j=>{const m=L1.cond[c].els[j.idx].m1;return m>=25-0.01&&m<100-0.01;}).length,0)+2;
  const exp80=['A','R'].reduce((s,c)=>s+L2.cond[c].joints.filter(j=>{const m=L2.cond[c].els[j.idx].m1;return m>=-0.01&&m<30-0.01;}).length,0);
  return {by:W.by,n:W.n,recut:W.recut,exp150,exp80};});
console.log('3) soudures induites par DN (+ recoupe au début libre):',JSON.stringify(out));
const c3=out.by[150]===out.exp150&&out.by[80]===out.exp80&&out.recut===2&&out.n===out.exp150+out.exp80;
// ── 4) périodes : soudure du 13/10 au 22/10/2026 → semaine 4 j : 13,14,15,19,20,21,22 = 7 jours ; 5 j : + 16 = 8 ; moyenne/jour
await page.evaluate(()=>{const ph=window.TRACE.net.phasage.phases[0];const set=(k,i,v)=>{const inp=document.querySelector(`#phasage [data-phd="${k}"][data-i="${i}"]`);inp.value=v;inp.dispatchEvent(new Event('change',{bubbles:true}));};
  set('tr',0,'2026-10-12');set('tr',1,'2026-10-14');set('so',0,'2026-10-13');set('so',1,'2026-10-22');set('rb',0,'2026-10-15');set('rb',1,'2026-10-26');set('en',0,'2026-10-28');set('en',1,'2026-10-28');});
await page.waitForTimeout(400);
out=await page.evaluate(()=>{const T=window.TRACE;const ph=T.net.phasage.phases[0];const C4=T.phasage.calc([ph],4),C5=T.phasage.calc([ph],5);const t=document.querySelector('#phasage').textContent;return {d4:C4.days,d5:C5.days,pd:+C4.perDay.toFixed(2),n:C4.n,cal:document.querySelectorAll('#phasage .phCal .so').length,stat:/jours de soudure/.test(t)&&/soudures \/ jour/.test(t),dn:/DN 150/.test(t)&&/DN 80/.test(t)};});
console.log('4) périodes → jours de soudure 4 j / 5 j, moyenne par jour, calendrier, tableau DN:',JSON.stringify(out));
const c4=out.d4===7&&out.d5===8&&Math.abs(out.pd-out.n/7)<0.01&&out.cal===7&&out.stat&&out.dn;
// fériés : 11/11/2026 (mercredi) exclu ; Pâques 2027 = 28/03 → lundi 29/03 férié
out=await page.evaluate(()=>{const T=window.TRACE;return {h26:T.phasage.holidays(2026).has('2026-11-11'),paq27:T.phasage.holidays(2027).has('2027-03-29'),asc26:T.phasage.holidays(2026).has('2026-05-14'),w:T.phasage.workDays('2026-11-09','2026-11-13',5).size};});
console.log('4b) fériés français (fixes + Pâques):',JSON.stringify(out));const c4b=out.h26&&out.paq27&&out.asc26&&out.w===4;
// ── 5) fournitures : tableau présent, barres / manchons / mousse
out=await page.evaluate(()=>{const T=window.TRACE;const ph=T.net.phasage.phases[0];const N=T.phasage.needs(ph);const ks=Object.keys(N.need);return {keys:ks.length,pipe:ks.some(k=>k.startsWith('pipe:150')),sleeve:ks.some(k=>k.startsWith('sleeve:')),pu:ks.some(k=>k.startsWith('pu:')),tee:ks.some(k=>k.startsWith('tee:')),det:!!document.querySelector('#phasage .phDet')};});
console.log('5) fournitures du tronçon:',JSON.stringify(out));const c5=out.pipe&&out.sleeve&&out.pu&&out.tee&&out.det;
// ── 6) 2e phase ferme (PK 100 → fin) + groupe libre
await page.evaluate(()=>document.querySelector('#phasage [data-phnew="ferme"]').click());await page.waitForTimeout(300);
await tapWorld(102,50);await tapWorld(128,50);await page.evaluate(()=>document.querySelector('#phOk').click());await page.waitForTimeout(500);
await page.evaluate(()=>{document.querySelectorAll('#phasage [data-phchk]').forEach(c=>{c.checked=true;c.dispatchEvent(new Event('change',{bubbles:true}));});document.querySelector('#phGrpName').value='Secteur Gare';document.querySelector('#phGroup').click();});await page.waitForTimeout(400);
out=await page.evaluate(()=>{const T=window.TRACE;const P=T.net.phasage;const g=P.groups[0];const C=T.phasage.calc(g?g.phases.map(id=>P.phases.find(p=>p.id===id)):[],P.week);const n1=T.phasage.welds(P.phases[0]).n,n2=T.phasage.welds(P.phases[1]).n;return {n:P.phases.length,g:!!g,name:g&&g.name,gn:g&&g.phases.length,sum:C.n,n1,n2,txt:/Secteur Gare/.test(document.querySelector('#phasage').textContent)};});
console.log('6) 2e phase + groupe libre (calcul d\'ensemble):',JSON.stringify(out));const c6=out.n===2&&out.g&&out.gn===2&&out.sum===out.n1+out.n2&&out.txt;
// ── 7) import marché (texte) → phases figées ; rattachement → écart affiché
out=await page.evaluate(()=>{const T=window.TRACE;const n=T.phasage.importText('Rue de la Gare;12/10/2026;20/10/2026\nRue Pasteur;2026-11-09;2026-12-04');const P=T.net.phasage;const m=P.phases.filter(p=>p.level==='marche');P.phases[0].parent=m[0].id;T.state.phLv='ferme';T.state.phOpen=P.phases[0].id;T.phasage.render();
  return {n,locked:m.every(p=>p.locked),so:m[0].dates.so,ecart:/Écart vs marché/.test(document.querySelector('#phasage').textContent),plus2:/soudure \+2 j/.test(document.querySelector('#phasage').textContent),gantt:document.querySelectorAll('#phasage .phGantt .bar.mar').length};});
console.log('7) marché importé (figé) + écart vs marché + planning:',JSON.stringify(out));const c7=out.n===2&&out.locked&&out.so[0]==='2026-10-12'&&out.so[1]==='2026-10-20'&&out.ecart&&out.plus2&&out.gantt===2;
// ── 8) persistance : rechargement → phases, groupe, semaine conservés ; overlay sur le plan
await page.evaluate(()=>{const P=window.TRACE.net.phasage;P.week=5;window.TRACE.phasage.render();});
await page.evaluate(()=>document.querySelector('#phasage [data-phwk="5"]').click());await page.waitForTimeout(1500);
await page.reload();await page.waitForTimeout(2500);await page.evaluate(id=>window.TRACE.go(id),siteId);await page.waitForTimeout(1500);
out=await page.evaluate(()=>{const P=window.TRACE.net.phasage;return {n:P&&P.phases.length,g:P&&P.groups.length,week:P&&P.week,ov:document.querySelectorAll('#phG path').length};});
console.log('8) après rechargement : phases / groupe / semaine conservés, tronçons dessinés sur le plan:',JSON.stringify(out));const c8=out.n===4&&out.g===1&&out.week===5&&out.ov>=2;
const ALL=c1&&c2a&&c2c&&c3&&c4&&c4b&&c5&&c6&&c7&&c8;
console.log('RESULTAT:',ALL?'TOUT VERT':'ECHEC '+JSON.stringify({c1,c2a,c2c,c3,c4,c4b,c5,c6,c7,c8}));
console.log(logs.length?logs:'[]');
await browser.close();process.exit(ALL?0:1);
