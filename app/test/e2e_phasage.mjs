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
let out=await page.evaluate(()=>({tab:window.TRACE.state.tab,txt:document.querySelector('#phasage').textContent.slice(0,120),btn:!!document.querySelector('#phasage [data-phnew="exe"]'),wk:document.querySelector('#phasage [data-phwk="4"].on')!==null}));
console.log('1) onglet Phasage:',JSON.stringify(out));const c1=out.tab==='phasage'&&out.btn&&out.wk&&/Phasage/.test(out.txt);
// ── 2) pose : début PK ~25 (milieu de barre), fin PK ~100, antenne touchée au PK ~30 → phase ferme créée
await page.evaluate(()=>document.querySelector('#phasage [data-phnew="exe"]').click());await page.waitForTimeout(400);
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
const c2c=out.tab==='phasage'&&out.n===1&&out.level==='exe'&&out.tr.length===2&&out.tr[1].line==='L2'&&out.open;
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
await page.evaluate(()=>document.querySelector('#phasage [data-phnew="exe"]').click());await page.waitForTimeout(300);
await tapWorld(102,50);await tapWorld(128,50);await page.evaluate(()=>document.querySelector('#phOk').click());await page.waitForTimeout(500);
await page.evaluate(()=>{document.querySelectorAll('#phasage [data-phchk]').forEach(c=>{c.checked=true;c.dispatchEvent(new Event('change',{bubbles:true}));});document.querySelector('#phGrpName').value='Secteur Gare';document.querySelector('#phGroup').click();});await page.waitForTimeout(400);
out=await page.evaluate(()=>{const T=window.TRACE;const P=T.net.phasage;const g=P.groups[0];const C=T.phasage.calc(g?g.phases.map(id=>P.phases.find(p=>p.id===id)):[],P.week);const n1=T.phasage.welds(P.phases[0]).n,n2=T.phasage.welds(P.phases[1]).n;return {n:P.phases.length,g:!!g,name:g&&g.name,gn:g&&g.phases.length,sum:C.n,n1,n2,txt:/Secteur Gare/.test(document.querySelector('#phasage').textContent)};});
console.log('6) 2e phase + groupe libre (calcul d\'ensemble):',JSON.stringify(out));const c6=out.n===2&&out.g&&out.gn===2&&out.sum===out.n1+out.n2&&out.txt;
// ── 7) import marché (texte) → phases figées ; rattachement → écart affiché
out=await page.evaluate(()=>{const T=window.TRACE;const n=T.phasage.importText('Rue de la Gare;12/10/2026;20/10/2026\nRue Pasteur;2026-11-09;2026-12-04');const P=T.net.phasage;const m=P.phases.filter(p=>p.level==='marche');P.phases[0].parent=m[0].id;T.state.phLv='exe';T.state.phOpen=P.phases[0].id;T.phasage.render();
  return {n,locked:m.every(p=>p.locked),so:m[0].dates.so,ecart:/Écart vs marché/.test(document.querySelector('#phasage').textContent),plus2:/soudure \+2 j/.test(document.querySelector('#phasage').textContent),gantt:document.querySelectorAll('#phasage .phGantt .bar.mar').length};});
console.log('7) marché importé (figé) + écart vs marché + planning:',JSON.stringify(out));const c7=out.n===2&&out.locked&&out.so[0]==='2026-10-12'&&out.so[1]==='2026-10-20'&&out.ecart&&out.plus2&&out.gantt===2;
// ── 8) persistance : rechargement → phases, groupe, semaine conservés ; overlay sur le plan
await page.evaluate(()=>{const P=window.TRACE.net.phasage;P.week=5;window.TRACE.phasage.render();});
await page.evaluate(()=>document.querySelector('#phasage [data-phwk="5"]').click());await page.waitForTimeout(1500);
await page.reload();await page.waitForTimeout(2500);await page.evaluate(id=>window.TRACE.go(id),siteId);await page.waitForTimeout(1500);
await page.selectOption('#roleSel','ethan');await page.waitForTimeout(300);
out=await page.evaluate(()=>{const T=window.TRACE;const P=T.net.phasage;const ov0=document.querySelectorAll('#phG path').length;T.state.show.phasage=true;T.renderPlan();const ov1=document.querySelectorAll('#phG path').length;T.state.show.phasage=false;T.renderPlan();
  document.querySelector('#tabbar [data-tab="phasage"]').click();const mini=document.querySelectorAll('#phasage .phMini [data-phmini]').length;const badges=document.querySelectorAll('#phasage .phMini g[data-phmini]').length;
  return {n:P&&P.phases.length,g:P&&P.groups.length,week:P&&P.week,ov0,ov1,mini,badges};});
console.log('8) après rechargement : conservé ; plan d\'ensemble : liseré seulement si 👁 coché (décoché par défaut) ; vue plan de l\'onglet avec tronçons numérotés:',JSON.stringify(out));const c8=out.n===4&&out.g===1&&out.week===5&&out.ov0===0&&out.ov1>=2&&out.mini>=2&&out.badges===2;
// ── 9) week-end forcé : samedi 17/10 dans la fenêtre soudure → +1 jour ; jour ouvré exclu → −1 ; phase marché à la main + figée (non supprimable, dates verrouillées)
out=await page.evaluate(()=>{const T=window.TRACE;const P=T.net.phasage;const ph=P.phases[0];T.state.phOpen=ph.id;T.state.phLv='exe';T.phasage.render();const d0=T.phasage.calc([ph],P.week).days;
  const sat=document.querySelector('#phasage [data-phday="2026-10-17"]');if(sat)sat.click();const d1=T.phasage.calc([ph],P.week).days;
  const tue=document.querySelector('#phasage [data-phday="2026-10-20"]');if(tue)tue.click();const d2=T.phasage.calc([ph],P.week).days;
  const forced=document.querySelectorAll('#phasage .phCal .forced').length;return {d0,d1,d2,forced,force:ph.force,off:ph.off};});
console.log('9a) samedi forcé (+1), mardi exclu (−1):',JSON.stringify(out));const c9a=out.d1===out.d0+1&&out.d2===out.d1-1&&out.forced===1&&out.force[0]==='2026-10-17'&&out.off[0]==='2026-10-20';
await page.evaluate(()=>document.querySelector('#phasage #phImport').click());await page.waitForTimeout(300);
out=await page.evaluate(()=>({tab:window.TRACE.state.tab,lvl:window.TRACE.state.phPose&&window.TRACE.state.phPose.level,msg:document.querySelector('#phMsg').textContent}));
console.log('9b0) « Phase marché » = même parcours : pose sur le plan:',JSON.stringify(out));
await page.evaluate(()=>{const P=window.TRACE.net.phasage;P.phases.forEach(p=>{if(p.level==='exe')p.parent=null;});}); // on défait le rattachement du check 7 pour tester l'automatique
await tapWorld(12,50);await tapWorld(128,50);await page.evaluate(()=>document.querySelector('#phOk').click());await page.waitForTimeout(500);
await page.evaluate(()=>{const P=window.TRACE.net.phasage;const m=P.phases[P.phases.length-1];const set=(k,i,v)=>{const inp=document.querySelector(`#phasage [data-phd="${k}"][data-i="${i}"][data-ph="${m.id}"]`);if(inp){inp.value=v;inp.dispatchEvent(new Event('change',{bubbles:true}));}};set('so',0,'2026-10-12');set('so',1,'2026-10-20');});await page.waitForTimeout(400);
out=await page.evaluate(()=>{const T=window.TRACE;const P=T.net.phasage;const m=P.phases[P.phases.length-1];const exes=P.phases.filter(p=>p.level==='exe');T.state.phOpen=m.id;T.state.phLv='marche';T.phasage.render();const lockBtn=document.querySelector(`#phasage [data-phlock="${m.id}"]`);if(lockBtn)lockBtn.click();
  const dis=!!document.querySelector(`#phasage [data-phd="so"][data-ph="${m.id}"]:disabled`);const delBtn=document.querySelector(`#phasage [data-phdel="${m.id}"]`);if(delBtn)delBtn.click();return {level:m.level,tr:m.tr.length,so:m.dates.so,locked:m.locked,dis,still:P.phases.some(p=>p.id===m.id),attached:exes.filter(p=>p.parent===m.id).length,nExe:exes.length};});
console.log('9b) phase marché posée sur le plan, phases exé couvertes rattachées d\'office, figée : dates verrouillées, suppression refusée:',JSON.stringify(out));
const c9b=out.level==='marche'&&out.tr===1&&out.so[1]==='2026-10-20'&&out.locked&&out.dis&&out.still&&out.attached===out.nExe&&out.nExe===2;
// ── 10) week-ends GRISÉS dans toutes les périodes (liseré couleur), groupe affiché « phases 1 + 2 », fournitures besoin / posé / restant
out=await page.evaluate(()=>{const T=window.TRACE;const P=T.net.phasage;const ph=P.phases[0];T.state.phOpen=ph.id;T.state.phLv='exe';T.phasage.render();
  const sat=document.querySelector('#phasage .phCal div[title^="2026-10-24"]');const we=sat&&sat.classList.contains('we')&&sat.classList.contains('rb')&&getComputedStyle(sat).backgroundColor;
  const g=document.querySelector('#phasage .ph.grp');const gtxt=g?g.textContent:'';
  // posé : la 1re soudure du tronçon soudée → 1 barre posée, restant = besoin − 1
  const L1=Object.values(T.lines).find(l=>!l.parent);const j=L1.cond.A.joints.find(j2=>{const m=L1.cond.A.els[j2.idx].m1;return m>=25&&m<100;});j.status='soudee';T.phasage.render();
  const C=T.phasage.calc([ph],P.week);const pipeKey=Object.keys(C.need).find(k=>k.startsWith('pipe:'));const det=document.querySelector('#phasage .phDet');det.open=true;const t=det.textContent;
  return {we,sat:!!sat,group:/phases 1 \+ 2/.test(gtxt),noLongNames:!/Ferme 1 — Rue de la Gare PK 25/.test(gtxt),posed:(C.posed||{})[pipeKey],need:C.need[pipeKey],cols:/Posé/.test(t)&&/Restant/.test(t)};});
console.log('10) week-end grisé, groupe « phases 1 + 2 », posé / restant:',JSON.stringify(out));
const c10=out.sat&&out.we==='rgb(233, 231, 224)'&&out.group&&out.noLongNames&&out.posed===1&&out.need>1&&out.cols;
// ── 11) antenne d'ANTENNE : L3 part de L2 (PK 15) → un tap sur L3 prend L3 jusqu'au PK touché ET L2 au moins jusqu'au départ de L3
await page.goto(BASE+'/traceur.html');await page.waitForTimeout(500);
await page.evaluate(()=>{const S=window.MAQ.state;S.supplier='RENALIA';S.lines=[
  {id:'L1',name:'Rue A',dn:150,bar:12,pts:[[10,50],[130,50]],specials:[],parent:null},
  {id:'L2',name:'Antenne B',dn:80,bar:12,pts:[[70,50],[70,110]],specials:[],parent:{line:'L1',m:60,side:1}},
  {id:'L3',name:'Sous-antenne C',dn:65,bar:12,pts:[[70,65],[110,65]],specials:[],parent:{line:'L2',m:15,side:1}}];S.seq=4;window.MAQ.setMode('select');window.MAQ.rebuild();});
await page.click('#bSave');await page.waitForTimeout(200);await page.fill('#svName','Sous-antenne');await page.click('#svOk');await page.waitForTimeout(600);
await page.click('#svGo');await page.waitForTimeout(1200);await page.selectOption('#roleSel','ethan');await page.waitForTimeout(300);
await page.evaluate(()=>{document.querySelector('#tabbar [data-tab="phasage"]').click();});await page.waitForTimeout(300);
await page.evaluate(()=>document.querySelector('#phasage [data-phnew="exe"]').click());await page.waitForTimeout(300);
await tapWorld(30,50);await tapWorld(110,50);await tapWorld(95,65);
out=await page.evaluate(()=>{const p=window.TRACE.state.phPose;const L=window.TRACE.lines;return {ant:p.ant.map(a=>({line:L[a.line].name,m1:a.m1})),parentM:L[Object.keys(L).find(k=>L[k].name==='Sous-antenne C')].parentM};});
console.log('11) antenne d\'antenne prise jusqu\'au PK touché, antenne intermédiaire prise jusqu\'à son départ:',JSON.stringify(out));
const c11=out.ant.length===2&&out.ant.some(a=>a.line==='Sous-antenne C'&&Math.abs(a.m1-25)<1.5)&&out.ant.some(a=>a.line==='Antenne B'&&Math.abs(a.m1-(out.parentM+0.5))<0.6);
await page.evaluate(()=>document.querySelector('#phOk').click());await page.waitForTimeout(400);
// ── 12) rechargement serveur pendant la saisie : les parties locales en attente (phasage) gagnent sur la copie serveur
out=await page.evaluate(()=>{const T=window.TRACE;const P=T.net.phasage;P.phases[0].dates.so=['2026-11-02','2026-11-06'];T.phasage.render();const inp=document.querySelector('#phasage [data-phd="so"][data-i="1"]');inp.dispatchEvent(new Event('change',{bubbles:true}));
  const pend=T._pending();const serverCopy=JSON.parse(JSON.stringify(T.net));delete serverCopy.phasage;const merged=T._keepPending(serverCopy,T.state.siteId);return {pending:!!pend.phasage,kept:!!(merged.phasage&&merged.phasage.phases.length===1&&merged.phasage.phases[0].dates.so[1]==='2026-11-06')};});
console.log('12) copie serveur sans notre phasage en attente → notre phasage conservé:',JSON.stringify(out));const c12=out.pending&&out.kept;
const ALL=c1&&c2a&&c2c&&c3&&c4&&c4b&&c5&&c6&&c7&&c8&&c9a&&c9b&&c10&&c11&&c12;
console.log('RESULTAT:',ALL?'TOUT VERT':'ECHEC '+JSON.stringify({c1,c2a,c2c,c3,c4,c4b,c5,c6,c7,c8,c9a,c9b,c10,c11,c12}));
console.log(logs.length?logs:'[]');
await browser.close();process.exit(ALL?0:1);
