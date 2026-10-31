// e2e_dhar_0111 — 01/11 soir (Ethan : « assure-toi que les distances de calcul prennent bien aller retour ») : la résistance de boucle attendue compte le fil
//   qui part ET celui qui revient (étamé + cuivré, pontés au bout), l'antenne en série deux fois (le fil y plonge et en revient), chaque conduite (aller / retour)
//   a sa boucle ; le plan de bouclage (théorie) et le calcul du chantier (bouclage réel) donnent la même valeur.
//  r1  feeder seul, fils raccordés partout, bout bouclé : R = Ω/km × (étamé + cuivré) ≈ 2 × longueur × Ω/km ; même valeur sur la conduite retour
//  r2  + antenne EN SÉRIE : le fil qui plonge compte 2 × l'antenne ; R terrain = R du plan de bouclage (± 3 %)
//  r3  antenne ISOLÉE (bouclée au té) : feeder 2 × feeder, antenne 2 × antenne — chacune sa boucle, au terrain comme au plan
//  r4  zéro erreur de page
import { chromium } from 'playwright';
const BASE=process.env.BASE||'http://localhost:8765';const C={};const J=x=>JSON.stringify(x);const errs=[];
const b=await chromium.launch({executablePath:process.env.CHROMIUM_PATH||undefined});const page=await (await b.newContext({viewport:{width:900,height:940}})).newPage();page.on('pageerror',e=>errs.push(String(e)));page.on('dialog',d=>d.accept().catch(()=>{}));
const W=ms=>page.waitForTimeout(ms);
const build=async(lines,name)=>{await page.goto(BASE+'/traceur.html');await W(600);await page.evaluate(()=>{localStorage.clear();});await page.reload();await W(800);
  await page.evaluate(L=>{const S=window.MAQ.state;S.supplier='AXIOM';S.lines=L;S.seq=9;window.MAQ.setMode('select');window.MAQ.rebuild();},lines);
  await page.click('#bSave');await W(200);await page.fill('#svName',name);await page.click('#svOk');await W(800);await page.click('#svGo');await W(1500);await page.evaluate(()=>{try{window.TRACE.tuto.close(null);}catch(e){}});};
const wireAll=(antMode)=>page.evaluate(antMode=>{const T=window.TRACE;const N=typeof T.net==='function'?T.net():T.net;const d=N.dhData||(N.dhData={ends:{},temps:{},mesures:[]});d.ends=d.ends||{};d.temps=d.temps||{};
  Object.values(T.lines).forEach(l=>['A','R'].forEach(c=>{const cd=l.cond[c];if(!cd)return;cd.joints.forEach(j=>{j.wire='raccorde';j.conn={E:'E',N:'N'};delete j.loopA;delete j.loopB;});const last=cd.els[cd.els.length-1];d.ends[l.id+':'+last.id]={state:'coiffe'};
    if(l.parent&&antMode){const tj=cd.joints[0];if(tj){tj.tee={mode:antMode};}}}));
  const p=(d.plan=d.plan||{tees:{},cuts:[],boxes:[]});Object.values(T.lines).forEach(l=>{if(l.parent)p.tees[l.id]=antMode==='boucle'?'isole':'serie';});T.renderAll();return true;},antMode);
const rk=12.5;const o={};
// r1 — feeder seul (100 m)
await build([{id:'L1',name:'Feeder',dn:100,bar:12,inv:true,pts:[[10,50],[110,50]],specials:[],parent:null}],'DH AR 1');
await page.evaluate(()=>{window.TRACE.state.dh.rkm=12.5;});await wireAll(null);
o.r1={A:await page.evaluate(()=>window.TRACE.dhLoopSum('L1','A')),R:await page.evaluate(()=>window.TRACE.dhLoopSum('L1','R')),plan:await page.evaluate(()=>window.TRACE.bp.loops().map(x=>({pipe:+x.pipe.toFixed(1),wire:+x.wire.toFixed(1),R:+x.R.toFixed(3)})))};
const near=(a,b,t)=>Math.abs(a-b)<=t*Math.max(1,Math.abs(b));
C.r1=!!o.r1.A&&o.r1.A.close&&o.r1.A.close.kind==='tip'&&near(o.r1.A.close.R,rk*(o.r1.A.totalE+o.r1.A.totalN)/1000,.005)&&near(o.r1.A.totalE,100,.03)&&near(o.r1.A.totalN,100,.03)&&near(o.r1.A.close.R,2.5,.03)
  &&!!o.r1.R&&o.r1.R.close&&near(o.r1.R.close.R,o.r1.A.close.R,.03)&&o.r1.plan.length===1&&near(o.r1.plan[0].R,o.r1.A.close.R,.03);
// r2 — + antenne EN SÉRIE (30 m au PK 50)
const NET2=[{id:'L1',name:'Feeder',dn:100,bar:12,inv:true,pts:[[10,50],[110,50]],specials:[],parent:null},{id:'L2',name:'Antenne',dn:80,bar:12,inv:true,pts:[[60,50],[60,80]],specials:[],parent:{line:'L1',m:50,side:1}}];
await build(NET2,'DH AR 2');await page.evaluate(()=>{window.TRACE.state.dh.rkm=12.5;});await wireAll('serie');
o.r2={A:await page.evaluate(()=>window.TRACE.dhLoopSum('L1','A')),plan:await page.evaluate(()=>window.TRACE.bp.loops().map(x=>({pipe:+x.pipe.toFixed(1),wire:+x.wire.toFixed(1),R:+x.R.toFixed(3)})))};
{const a=o.r2.A;const long=Math.max(a.totalE,a.totalN),court=Math.min(a.totalE,a.totalN);o.r2.long=long;o.r2.court=court;
 C.r2=a.close&&a.close.kind==='tip'&&near(court,100,.03)&&near(long,160,.04)&&near(a.close.R,rk*(long+court)/1000,.005)&&o.r2.plan.length===1&&near(o.r2.plan[0].wire,260,.03)&&near(a.close.R,o.r2.plan[0].R,.03);}
// r3 — antenne ISOLÉE (bouclée au té)
await wireAll('boucle');await page.evaluate(()=>{const T=window.TRACE;const tj=T.lines.L2.cond.A.joints[0];if(tj){tj.loopA=true;}const tr=T.lines.L2.cond.R&&T.lines.L2.cond.R.joints[0];if(tr)tr.loopA=true;T.renderAll();});
o.r3={L1:await page.evaluate(()=>window.TRACE.dhLoopSum('L1','A')),L2:await page.evaluate(()=>window.TRACE.dhLoopSum('L2','A')),plan:await page.evaluate(()=>window.TRACE.bp.loops().map(x=>({pipe:+x.pipe.toFixed(1),wire:+x.wire.toFixed(1),R:+x.R.toFixed(3)})))};
{const f=o.r3.L1,a=o.r3.L2;const P=o.r3.plan.slice().sort((x,y)=>y.pipe-x.pipe);
 C.r3=!!f&&f.close&&near(f.totalE,100,.03)&&near(f.totalN,100,.03)&&near(f.close.R,2.5,.03)&&P.length===2&&near(P[0].R,f.close.R,.03)&&near(P[1].wire,60,.05)&&!!a&&near(a.totalE+a.totalN,60,.06);}
console.log('mesures :',J(o));
await b.close();C.r4=!errs.length;if(errs.length)console.log('erreurs',errs.slice(0,3));
console.log('RÉSULTATS',J(C));const ko=Object.entries(C).filter(([,v])=>!v).map(([k])=>k);console.log(ko.length?'RESULTAT: ECHEC '+ko.join(' '):'RESULTAT: TOUT VERT');process.exit(ko.length?1:0);
