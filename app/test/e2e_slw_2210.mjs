// 22/10 (Ethan : « décaler une soudure OK, mais les fils partent en vrille à l'endroit de la soudure décalée » — capture : à la soudure coulissée, les fils et la
// gaine s'écartent puis rejoignent la barre en diagonale). Cause : un coulissement refait en plusieurs fois (+0,1 puis −0,1…) retombe pile sur un ancien point
// de l'axe → point EN DOUBLE (écart ~1e-12) → offsetPoly prenait sa direction au hasard (+ facteur d'angle jusqu'à ×2,9).
// Réseau FICTIF du traceur, ligne INCLINÉE (coordonnées non rondes : c'est là que le bruit de calcul apparaît).
// c1 aller-retour au même endroit (−0,1 / 0 / −0,1 / −0,2 / −0,1 / 0 / −0,1, puis Valider) : aucun segment d'axe < 1 mm dans les barres coulissées
// c2 les fils / la gaine (offsetPoly de l'axe) restent à LEUR distance de l'axe sur toute la barre (écart ≤ 1 %) — c'était jusqu'à ×2,9 au point de la soudure
// c3 offsetPoly sur un axe qui a un point en double : même tracé que sans le point en double
// c4 offsetPoly IDENTIQUE à l'ancien calcul (au bit près) sur tous les axes d'un réseau normal (coudes, té, barres) — aucun autre dessin ne bouge
// c5 « Annuler le coulissement », puis deux coulissements validés qui reviennent au même endroit, rejoués au rechargement : axes propres · c6 console.
import { chromium } from 'playwright';
const BASE=process.env.BASE||'http://localhost:8765';const SHOTS=process.env.SHOTS||null;
const browser=await chromium.launch({headless:true, executablePath: process.env.CHROMIUM_PATH||undefined});
const C={};const logs=[];
const ctx=await browser.newContext({viewport:{width:1000,height:800},deviceScaleFactor:1});const page=await ctx.newPage();
page.on('pageerror',e=>logs.push('PAGEERROR: '+e.message.slice(0,300)));page.on('console',m=>{if(m.type()==='error'&&!/supabase|Failed to fetch|net::ERR|404|geopf|WebSocket/i.test(m.text()))logs.push(m.text().slice(0,200));});page.on('dialog',d=>d.accept().catch(()=>{}));
await page.goto(BASE+'/traceur.html');await page.waitForTimeout(500);await page.evaluate(()=>localStorage.clear());await page.reload();await page.waitForTimeout(500);
await page.evaluate(()=>{const S=window.MAQ.state;S.lines=[{id:'L1',name:'Rue Fictive',dn:100,bar:12,pts:[[103.37,250.11],[141.93,261.77],[148.2,287.45]],specials:[],parent:null},
  {id:'L2',name:'Allée Fictive',dn:80,bar:12,pts:[[103.37,300.11],[160.13,303.9],[171.5,330.2]],specials:[{id:'T1',type:'tee',m:20}],parent:null}];S.seq=3;window.MAQ.setMode('select');window.MAQ.rebuild();});
await page.click('#bSave');await page.waitForTimeout(200);await page.fill('#svName','Fils coulissés');await page.click('#svOk');await page.waitForTimeout(800);
await page.click('#svGo');await page.waitForTimeout(1500);await page.selectOption('#roleSel','karim');await page.waitForTimeout(300);
const shot=async n=>{if(SHOTS)await page.screenshot({path:`${SHOTS}/slw_${n}.png`});};
const zoom=async(W)=>{await page.evaluate(W=>{const T=window.TRACE;T.state.tab='plan';T.renderAll();const L=T.state.lines.L1;const j=L.cond.A.joints.find(x=>x.weldId===W);const q=T.slide.pos('L1','A',j.idx);T.centerOn(q.x,q.y,60);},W);await page.waitForTimeout(400);};
// ancien offsetPoly (avant le 22/10), pour c4
const OLD=`(function(pts,off){if(!off)return pts;const n=pts.length;const out=[];for(let i=0;i<n;i++){const p=pts[i];let tx=0,ty=0;if(i>0){tx+=p.x-pts[i-1].x;ty+=p.y-pts[i-1].y;}if(i<n-1){tx+=pts[i+1].x-p.x;ty+=pts[i+1].y-p.y;}const L=Math.hypot(tx,ty)||1;tx/=L;ty/=L;let nx=ty,ny=-tx;let sc=1;if(i>0&&i<n-1){const ax=p.x-pts[i-1].x,ay=p.y-pts[i-1].y,La=Math.hypot(ax,ay)||1;const na={x:ay/La,y:-ax/La};const dot=na.x*nx+na.y*ny;sc=1/Math.max(.35,dot);}out.push({x:p.x+nx*off*sc,y:p.y+ny*off*sc});}return out;})`;
// c4 d'abord (réseau tel que posé, rien de coulissé)
let o=await page.evaluate(OLD=>{const old=eval(OLD);const T=window.TRACE;let n=0,diff=0,dup=0;Object.values(T.state.lines).forEach(l=>['A','R'].forEach(c=>{const cd=l.cond[c];if(!cd)return;cd.els.forEach(e=>(e.axis||[]).forEach(pl=>{
  if(pl.some((p,i)=>i&&Math.abs(p.x-pl[i-1].x)<=1e-6&&Math.abs(p.y-pl[i-1].y)<=1e-6)){dup++;return;}[0.07,-0.21,0.5,-1.3].forEach(off=>{const a=old(pl,off),b=T.ts.offsetPoly(pl,off);n++;a.forEach((p,i)=>{if(p.x!==b[i].x||p.y!==b[i].y)diff++;});});}));}));return {n,diff,dup};},OLD);
console.log('c4) offsetPoly = ancien calcul :',JSON.stringify(o));C.c4=o.n>=40&&o.diff===0;
await zoom('S-0004');await shot('0_avant');
// c1) coulissement refait en plusieurs fois au même endroit, puis Valider
await page.evaluate(()=>window.TRACE.slide.start());await page.waitForTimeout(150);
await page.evaluate(()=>{const T=window.TRACE;const L=T.state.lines.L1;const j=L.cond.A.joints.find(x=>x.weldId==='S-0004');const q=T.slide.pos('L1','A',j.idx);T.slide.tap(q.x,q.y);});await page.waitForTimeout(200);
for(const d of [-0.1,0,-0.1,-0.2,-0.1,0,-0.1]){ /* S-0004 : P3 est une barre pleine → on ne peut que reculer */await page.evaluate(d=>window.TRACE.slide.preview(d),d);await page.waitForTimeout(60);}
await page.evaluate(()=>window.TRACE.slide.end(true));await page.waitForTimeout(300);
const axes=()=>page.evaluate(()=>{const L=window.TRACE.state.lines.L1;const cd=L.cond.A;const j=cd.joints.find(x=>x.weldId==='S-0004');const E=[cd.els[j.idx],cd.els[j.idx+1]];
  const tiny=[];E.forEach(e=>(e.axis||[]).forEach(pl=>{for(let i=1;i<pl.length;i++){const s=Math.hypot(pl[i].x-pl[i-1].x,pl[i].y-pl[i-1].y);if(s<1e-3)tiny.push([e.id,i,s]);}}));
  // c2 : distance de chaque point décalé à l'axe (ce que dessinent la gaine et les fils)
  const dist=(q,pl)=>{let b=1e9;for(let i=1;i<pl.length;i++){const a=pl[i-1],c=pl[i];const dx=c.x-a.x,dy=c.y-a.y;const L2=dx*dx+dy*dy||1;let t=((q.x-a.x)*dx+(q.y-a.y)*dy)/L2;t=Math.max(0,Math.min(1,t));b=Math.min(b,Math.hypot(a.x+dx*t-q.x,a.y+dy*t-q.y));}return b;};
  let worst=0;E.forEach(e=>(e.axis||[]).forEach(pl=>[0.07,-0.07,0.2].forEach(off=>window.TRACE.ts.offsetPoly(pl,off).forEach(q=>{worst=Math.max(worst,Math.abs(dist(q,pl)-Math.abs(off))/Math.abs(off));}))));
  return {slid:j.slid,m:+(+j.m).toFixed(3),tiny,worst:+worst.toFixed(4),ids:E.map(e=>e.id+':'+(+e.len).toFixed(2))};});
o=await axes();await zoom('S-0004');await shot('1_apres');
console.log('c1/c2) après aller-retour :',JSON.stringify(o));C.c1=Math.abs(o.slid+0.1)<1e-6&&o.tiny.length===0;C.c2=o.worst<=0.01;
// c3) offsetPoly sur un axe avec un point en double
o=await page.evaluate(OLD=>{const old=eval(OLD);const T=window.TRACE;const A=[{x:103.37,y:250.11},{x:110.2051,y:252.1767},{x:120.0000000000001,y:255.1385},{x:120.00000000000011,y:255.13850000000002},{x:141.93,y:261.77}];const B=[A[0],A[1],A[2],A[4]];
  const dev=f=>{const a=f(A,0.2),b=f(B,0.2);return Math.max(...[0,1,2,4].map((i,k)=>Math.hypot(a[i].x-b[k].x,a[i].y-b[k].y)),Math.hypot(a[3].x-b[2].x,a[3].y-b[2].y));};return {d:dev(T.ts.offsetPoly),dOld:dev(old)};},OLD);
console.log('c3) point en double :',JSON.stringify(o));C.c3=o.d<1e-6&&o.dOld>1e-3; /* l'ancien calcul part de travers sur ce cas (c'est le défaut), le nouveau non */
// c5) annuler ; puis deux coulissements validés l'un après l'autre (−0,1 puis +0,1 : le 2e retombe sur l'ancien point) → rejoués au rechargement : axes propres
await page.evaluate(()=>window.TRACE.slide.cancel('S-0004'));await page.waitForTimeout(300);const afterCancel=await axes();
for(const d of [-0.1,0.1]){await page.evaluate(()=>window.TRACE.slide.start());await page.waitForTimeout(120);
  await page.evaluate(()=>{const T=window.TRACE;const L=T.state.lines.L1;const j=L.cond.A.joints.find(x=>x.weldId==='S-0004');const q=T.slide.pos('L1','A',j.idx);T.slide.tap(q.x,q.y);});await page.waitForTimeout(150);
  await page.evaluate(d=>window.TRACE.slide.preview(d),d);await page.waitForTimeout(80);await page.evaluate(()=>window.TRACE.slide.end(true));await page.waitForTimeout(250);}
const nRec=await page.evaluate(()=>window.TRACE.slide.recs().filter(r=>!r.del).length);
const sid=await page.evaluate(()=>window.TRACE.state.siteId);await page.reload();await page.waitForTimeout(2200);const dbg=await page.evaluate(async sid=>{const T=window.TRACE;const o={sites:Object.keys(T.sites),sid:T.state.siteId,lines:Object.keys(T.state.lines),screen:document.querySelector('.view.show,section.show')?.id||''};if(!T.state.lines.L1){try{await T.go(sid);}catch(e){o.err=String(e);}}o.lines2=Object.keys(T.state.lines);return o;},sid);console.log('rechargement :',JSON.stringify(dbg));await page.waitForTimeout(800);
await page.evaluate(()=>{const T=window.TRACE;T.state.tab='plan';T.renderAll();});await page.waitForTimeout(300);
const afterReload=await page.evaluate(()=>{const L=window.TRACE.state.lines.L1;if(!L)return null;let tiny=0;['A','R'].forEach(c=>L.cond[c].els.forEach(e=>{if(e.kind!=='pipe')return;(e.axis||[]).forEach(pl=>{for(let i=1;i<pl.length;i++)if(Math.hypot(pl[i].x-pl[i-1].x,pl[i].y-pl[i-1].y)<1e-3)tiny++;});}));const j=L.cond.A.joints.find(x=>x.weldId==='S-0004');return {tiny,slid:j.slid||0,m:+(+j.m).toFixed(3)};});
await zoom('S-0004');await shot('5_recharge');
console.log('c5) annulé, 2 coulissements, rechargé :',JSON.stringify({afterCancel:{slid:afterCancel.slid||0,m:afterCancel.m,tiny:afterCancel.tiny},nRec,afterReload}));
C.c5=!afterCancel.slid&&afterCancel.tiny.length===0&&nRec===2&&!!afterReload&&afterReload.tiny===0&&!afterReload.slid&&Math.abs(afterReload.m-afterCancel.m)<0.002;
console.log('erreurs console :',JSON.stringify(logs));C.c6=logs.length===0;
const ko=Object.entries(C).filter(([k,v])=>!v).map(([k])=>k);console.log(JSON.stringify(C));console.log(ko.length?'RESULTAT: KO '+ko.join(','):'RESULTAT: TOUT VERT');
await browser.close();
