// 27/10 (Ethan : « ajoute aussi en SST de pouvoir choisir si c'est des coudes de remontée pour bien compter une paire de coudes du DN pour les remontées en SST » ;
// 27/10 soir : « deux soudures en plus pré-isolé puis le point de la SST, comme avant » — pas de vanne) — TRACEUR, réseau FICTIF : L1 DN 100, 40 m droit, départ chaufferie / fin sous-station.
// c1 sans remontée : 0 coude, 5 soudures par conduite, la fiche du raccordement de fin propose « Remontée dans le local » (pas sur un kit)
// c2 coche → par conduite : 1 coude 90° pré-isolé du DN (plane V, riser, référence catalogue ordinaire) soudé au bout du tube, raccordement au bout de sa jambe, 6 soudures (+1),
//    dessiné au-delà du bout (déplié), aucune erreur ; nomenclature : K – 100/90 comme un coude ordinaire
// c3 décoche → retour à 5 soudures, 0 coude ; recoche
// c4 remontée au départ (chaufferie) + fin : 2 coudes par conduite, PK < 0 au départ ; purge en bout : collée au bout, pas d'erreur
// c5 enregistrement → pont : els riser, ends.end.riser = true ; appli : coudes 4, soudures 12 (manchons 12 — 27/10 soir, Ethan : « S-1438 / 1439 ne doivent pas compter de soudure, juste le point à
//    prendre en photo parce que c'est à l'intérieur » : la soudure coude → raccordement = POINT SST (sst:true), hors soudures / manchons / fourniture / marché / phasage ; S-1402 / 1404
//    (tube → coude) = soudures enterrées, manchonnées), ml tranchée 40, ml tube avec les jambes des coudes, fourniture : 4 coudes 90° DN100 ; c5c appli : point SST = une étape (photo),
//    production « SST DN 100 », pas une soudure (activité, avancement de la tête de chantier)
// c6 console propre
import { chromium } from 'playwright';
const BASE=process.env.BASE||'http://localhost:8765';const SHOTS=process.env.SHOTS||null;
const browser=await chromium.launch({headless:true, executablePath: process.env.CHROMIUM_PATH||undefined});
const ctx=await browser.newContext({viewport:{width:1366,height:860},deviceScaleFactor:1});const page=await ctx.newPage();const logs=[];const C={};
page.on('pageerror',e=>logs.push('PAGEERROR: '+e.message.slice(0,300)));page.on('console',m=>{if(m.type()==='error'&&!/supabase|Failed to fetch|net::ERR|404|geopf|WebSocket|pdf\.worker|cdnjs/i.test(m.text()))logs.push(m.text().slice(0,200));});page.on('dialog',d=>d.accept().catch(()=>{}));
await ctx.route(u=>!/^(localhost|127\.0\.0\.1)$/.test(new URL(u).hostname),r=>r.fulfill({status:200,contentType:'application/json',body:'{}'}));
const wait=ms=>page.waitForTimeout(ms);
await page.goto(BASE+'/traceur.html');await wait(500);await page.evaluate(()=>localStorage.clear());await page.reload();await wait(600);
await page.evaluate(()=>{const S=window.MAQ.state;S.lines=[{id:'L1',name:'Feeder fictif',dn:100,bar:12,pts:[[0,100],[40,100]],specials:[],parent:null,startType:'chaufferie',endType:'sousstation'}];S.seq=2;window.MAQ.setMode('select');window.MAQ.rebuild();});await wait(300);
const shot=async n=>{if(SHOTS)await page.screenshot({path:`${SHOTS}/sst_${n}.png`});};
const info=()=>page.evaluate(()=>{const S=window.MAQ.state;const l=S.lines[0];const B=S.built.L1;const cd=c=>{const b=B[c];const P=b.pieces;return {nW:b.welds.length,nS:b.welds.filter(w=>w.sst).length,nWc:b.welds.filter(w=>!w.sst).length,wR:b.welds.filter(w=>w.riser).length,nB:P.filter(p=>p.kind==='bend').length,bV:P.filter(p=>p.kind==='bend'&&p.plane==='V'&&p.riser&&!p.nu).length,nV:P.filter(p=>p.kind==='valve').length,nu:b.welds.filter(w=>w.nu).length,tubeV:P.filter(p=>p.kind==='tube'&&p.riser).map(p=>+p.L.toFixed(2)),xs:P.filter(p=>p.kind==='endpoint').map(p=>[+p.m0.toFixed(2),+p.path[0][0].toFixed(2),!!p.riser]),pcs:P.map(p=>p.id+(p.riser?'*':'')).join(' '),errs:P.filter(p=>p.err).length,notes:b.notes.filter(n=>n.kind==='err').map(n=>n.txt),mins:Math.min(...P.map(p=>p.m0)),maxs:Math.max(...P.map(p=>p.m1)),len:b.length};};
  return {rs:!!l.riserStart,re:!!l.riserEnd,A:cd('A'),R:cd('R')};});
const panel=()=>page.evaluate(()=>document.getElementById('panel').textContent.replace(/[\s  ]+/g,' '));
const selX=async(end)=>{await page.evaluate(end=>{const S=window.MAQ.state;const B=S.built.L1;const p=B.A.pieces.find(x=>x.kind==='endpoint'&&x.sid==='end:'+end);S.sel={kind:'piece',line:'L1',cond:'A',id:p.id};S.tab='sel';window.MAQ.rebuild();},end);await wait(200);};
// ── c1
let I=await info();await selX('end');let P=await panel();const hasOpt=await page.$('#panel .riserOn[data-start="0"]');
await page.evaluate(()=>{const S=window.MAQ.state;S.lines[0].endType='kit';window.MAQ.rebuild();});await wait(150);await page.evaluate(()=>{const S=window.MAQ.state;const B=S.built.L1;const p=B.A.pieces.find(x=>x.kind==='endcap');S.sel={kind:'piece',line:'L1',cond:'A',id:p.id};S.tab='sel';window.MAQ.rebuild();});await wait(150);const kitOpt=await page.$('#panel .riserOn');
await page.evaluate(()=>{const S=window.MAQ.state;S.lines[0].endType='sousstation';window.MAQ.rebuild();});await wait(150);
console.log('c1) sans remontée :',JSON.stringify({nW:I.A.nW,nB:I.A.nB,xs:I.A.xs,hasOpt:!!hasOpt,kitOpt:!!kitOpt,txt:/Remontée dans le local/.test(P)}));
C.c1=I.A.nW===5&&I.A.nB===0&&I.R.nB===0&&!!hasOpt&&!kitOpt&&/Remontée dans le local/.test(P)&&I.A.xs.length===2&&I.A.xs[1][1]===40;
// ── c2 : coche depuis la fiche du raccordement
await selX('end');await page.click('#panel .riserOn[data-start="0"]');await wait(300);I=await info();await shot('2_remontee');
const nomen=await page.evaluate(()=>{const S=window.MAQ.state;const B=S.built.L1;const refs={};['A','R'].forEach(c=>B[c].pieces.forEach(p=>{if(p.kind==='tube'||p.kind==='endpoint')return;refs[p.ref]=(refs[p.ref]||0)+1;}));return refs;});
console.log('c2) remontée :',JSON.stringify({re:I.re,A:{nW:I.A.nW,wR:I.A.wR,nB:I.A.nB,bV:I.A.bV,nV:I.A.nV,nu:I.A.nu,xs:I.A.xs,errs:I.A.errs,maxs:I.A.maxs,len:I.A.len,pcs:I.A.pcs},R:{nW:I.R.nW,bV:I.R.bV},nomen}));
C.c2=I.re===true&&I.A.nW===6&&I.A.nS===1&&I.A.nWc===5&&I.R.nS===1&&I.A.wR===2&&I.A.nu===0&&I.A.nB===1&&I.A.bV===1&&I.A.nV===0&&I.R.nB===1&&I.R.nW===6&&I.A.errs===0&&I.A.xs[1][0]>40&&I.A.xs[1][1]>40&&I.A.xs[1][2]&&I.A.maxs>40&&Math.abs(I.A.len-40)<0.01&&nomen['K – 100/90']===2&&!Object.keys(nomen).some(k=>/vanne/.test(k))&&/X1 P1 P2 P3 P4 C1\* X2\*/.test(I.A.pcs);
// ── c3 : décoche depuis la fiche de la ligne → retour à l'état d'avant
await page.evaluate(()=>{const S=window.MAQ.state;S.sel={kind:'line',id:'L1'};S.tab='sel';window.MAQ.rebuild();});await wait(200);
await page.click('#panel .riserOn[data-start="0"]');await wait(300);const I3=await info();
await page.click('#panel .riserOn[data-start="0"]');await wait(300);const I5=await info();
console.log('c3) décoche / recoche :',JSON.stringify({off:{re:I3.re,nW:I3.A.nW,nB:I3.A.nB},on:{re:I5.re,nW:I5.A.nW,nB:I5.A.nB}}));
C.c3=I3.re===false&&I3.A.nW===5&&I3.A.nB===0&&I5.re===true&&I5.A.nW===6&&I5.A.nB===1;
// ── c4 : remontée au départ (chaufferie) + purge en bout
await page.click('#panel .riserOn[data-start="1"]');await wait(300);let I6=await info();
await page.evaluate(()=>{const S=window.MAQ.state;S.sel={kind:'line',id:'L1'};S.tab='sel';window.MAQ.rebuild();});await wait(150);await page.selectOption('#lineEndPV','up');await wait(300);const I7=await info();await shot('4_depart_purge');
console.log('c4) départ + purge :',JSON.stringify({rs:I6.rs,nW:I6.A.nW,nB:I6.A.nB,xs:I6.A.xs,mins:I6.A.mins,purge:{nW:I7.A.nW,errs:I7.A.errs,pcs:I7.A.pcs,notes:I7.A.notes}}));
C.c4=I6.rs===true&&I6.A.nB===2&&I6.A.nV===0&&I6.A.nW===7&&I6.A.nS===2&&I6.A.xs[0][0]<0&&I6.A.xs[0][1]<0&&I6.A.mins<0&&I7.A.errs===0&&/T1/.test(I7.A.pcs)&&I7.A.nW===8;
// ── c5 : enregistrement → pont → appli
const handoff=id=>page.evaluate(id=>new Promise(res=>{const q=indexedDB.open('trace-kv');q.onsuccess=()=>{try{const g=q.result.transaction('kv','readonly').objectStore('kv').get('trace:handoff:'+id);g.onsuccess=()=>res(g.result||null);g.onerror=()=>res(null);}catch(e){res(null);}};q.onerror=()=>res(null);}),id);
await page.click('#bSave');await wait(250);await page.fill('#svName','SST fictif');await page.click('#svOk');await wait(1400);const sid=await page.evaluate(()=>window.MAQ.state.siteRef&&window.MAQ.state.siteRef.id);const site=sid?await handoff(sid):null;
const L=site&&site.lines[0];const elsA=L?L.cond.A.els:[];const o5={ends:L&&L.ends,riserEls:elsA.filter(e=>e.riser).map(e=>e.kind+(e.plane||'')+(e.nu?'·nu':'')),riserW:L?L.cond.A.welds.filter(w=>w.riser).length:0,sstW:L?L.cond.A.welds.filter(w=>w.sst).length:0,nuW:L?L.cond.A.welds.filter(w=>w.nu).length:0,len:L&&L.cond.A.length,repW:site&&site.report&&site.report.welds};
await page.goto(BASE+'/index.html');await wait(900);{const s=await page.$('#loginSkip');if(s&&await s.isVisible())await s.click();await wait(600);}
const app=await page.evaluate(async site=>{const T=window.TRACE;T.etude.addSite(site);await T.go(site.id);const l=T.lines[site.lines[0].id];const c=T.ts.counts(l);const q=T.etude.qty(site.id);const row=q&&q.rows&&q.rows.find(r=>r.dn===100);const kinds=Object.values(l.cond.A.els).filter(e=>e.riser).map(e=>e.kind+(e.nu?'·nu':''));const needs=T.fourniture.needs?T.fourniture.needs():null;const nk=needs?Object.keys(needs.need||needs).filter(k=>/bend|valve/.test(k)):null;return {c:{coudes:c.coudes,vannes:c.vannes,soud:c.soud,manchons:c.manchons,ml:c.ml,purges:c.purges},qty:row?{mlTr:row.mlTr,mlTube:row.mlTube,coudes:row.coudes,vannes:row.vannes,soud:row.soud}:null,kinds,nk};},site);
console.log('c5) pont + appli :',JSON.stringify({...o5,app}));
C.c5=!!L&&L.ends.end.riser===true&&L.ends.start.riser===true&&o5.riserEls.join(',')==='endpoint,bendV,bendV,endpoint'&&o5.riserW===4&&o5.sstW===2&&o5.repW===12&&o5.nuW===0&&Math.abs(o5.len-40)<0.01&&app.c.coudes===4&&app.c.vannes===0&&app.c.soud===12&&app.c.manchons===12&&app.qty.soud===12&&app.c.purges===2&&Math.abs(app.c.ml-40)<0.2&&app.qty&&Math.abs(app.qty.mlTr-40)<0.3&&Math.abs(app.qty.mlTube-88)<0.5&&app.qty.coudes===4&&app.qty.vannes===0&&app.kinds.filter(k=>k==='bend').length===2&&Array.isArray(app.nk)&&app.nk.some(k=>/bend:100:90/.test(k));
// ── c5b) étiquettes des plans DOE (27/10 soir, Ethan : « étiquette sur la maquette interactive et les plans exportés : coude angle et fausse coupe ») : coude de remontée « 90° remontée » + symbole, fausse coupe « FC x° » (sommet à 7°), légendes
const o6=await page.evaluate(()=>{const T=window.TRACE;const l=T.lines['L1'];const cd=l.cond.A;const j=cd.joints.find(x=>!x.fc&&cd.els[x.idx]&&cd.els[x.idx].kind==='pipe');j.fc=true;j.dev=7.4; /* on force une fausse coupe sur une soudure de tube */
  const D=T.doe.data();const sh=D.sheets[0];const w=T.doe.world(D,sh.id,{s:.2,fond:false,wires:false});const g=w&&w.svg||'';const v=T.doe.viewer(D,{fond:false});const pl=T.doe.plan(D,{scale:200,format:'A3'});const ph=pl&&pl.html||'';
  j.fc=false;j.dev=0;return {rem:(g.match(/90° remontée/g)||[]).length,arrow:/<polygon points="[^"]+" fill="#1c3d6b"/.test(g),fc:(g.match(/>FC 7,4°</g)||[]).length,ring:/stroke="#f4a24a"/.test(g),vLeg:/FC x° = fausse coupe/.test(v)&&/angle des coudes/.test(v),pLeg:/FC x° = fausse coupe/.test(ph)&&/angle du coude/.test(ph),vRem:/90° remontée/.test(v)};});
console.log('c5b) étiquettes DOE :',JSON.stringify(o6));
C.c5b=o6.rem===2&&o6.arrow&&o6.fc===1&&o6.ring&&o6.vLeg&&o6.pLeg&&o6.vRem;
// ── c5c) POINT SST dans l'appli (27/10 soir, Ethan : « 1438 et 1439 ne doivent pas compter de soudure, juste le point à prendre en photo ; quand un gars le pointe avec photo,
//    ça lui met en prod une SST du DN ») : 2 points SST par conduite (départ chaufferie + fin SST), fiche à une étape, validation avec photo → prod « SST DN 100 », rien en soudures
const o7=await page.evaluate(()=>{const T=window.TRACE;const l=T.lines['L1'];const cd=l.cond.A;const S=cd.joints.map((j,i)=>({i,j})).filter(x=>x.j.sst);const sstEnd=S.find(x=>cd.els[x.j.idx]&&cd.els[x.j.idx].kind==='bend')||S[S.length-1];
  T.state.userId='karim';T.role&&T.role('soudeur');T.openJoint('L1','A',sstEnd.i);const sh=document.getElementById('sheet');const txt=sh.textContent.replace(/[\s  ]+/g,' ');
  const before={shStat:(document.getElementById('shStat')||{}).textContent||'',steps:sh.querySelectorAll('.dstep').length,sstTitle:/Point SST — raccordement à l'intérieur/.test(txt),noMan:!/Manchon — 4 sous-étapes/.test(txt),btn:!!sh.querySelector('[data-gostep="1"]')&&/Prendre le point SST/.test(txt),chip:/point SST — pas une soudure comptée/.test(txt),noDh:!sh.querySelector('[data-act="dh-here"]')};
  const j=sstEnd.j;j.steps={1:{photos:['data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNkYPhfDwAChwGA60e6kgAAAABJRU5ErkJggg==']}};T.renderAll();
  const ok=sh.querySelector('[data-stepok="1"]');if(ok)ok.click();
  const today=new Date().toISOString().slice(0,10);T.state.act={from:today,to:today,who:''};const st=T.act.stats();const ops=T.act.ops(j,l).map(o=>o.kind);
  const needs=T.fourniture.needs();const sl=Object.entries(needs.need||{}).filter(([k])=>k.startsWith('sleeve:')).reduce((a,[,v])=>a+v,0);
  const D=T.doe.data();const w=D.welds.find(x=>x.id===j.weldId);const shw=D.sheets[0];const g=(T.doe.world(D,shw.id,{s:.2,fond:false,wires:false})||{}).svg||'';const v=T.doe.viewer(D,{fond:false});
  const after={status:j.status,shStat:(document.getElementById('shStat')||{}).textContent||'',pris:/Point SST pris/.test(document.getElementById('sheet').textContent),ops,byKind:st.byKind,dnSst:st.dn.sst,dnSoud:st.dn.soud,prog:T.ts.counts(l).soud,sleeves:sl,doeLabel:w&&w.statusLabel,doeSst:D.welds.filter(x=>x.sst).length,diam:(g.match(/<polygon class="w"/g)||[]).length,vLeg:/point SST/.test(v)};
  T.state.act=null;return {nS:S.length,before,after};});
console.log('c5c) point SST appli :',JSON.stringify(o7));
if(SHOTS){await page.evaluate(()=>{const T=window.TRACE;const l=T.lines['L1'];const cd=l.cond.A;const i=cd.joints.findIndex(j=>j.sst&&cd.els[j.idx]&&cd.els[j.idx].kind==='bend');T.openJoint('L1','A',i);const q=T.slide.pos('L1','A',cd.joints[i].idx);if(q)T.centerOn(q.x,q.y,40);});await wait(600);await shot('7_point_sst');}
C.c5c=o7.nS===2&&o7.before.steps===1&&o7.before.sstTitle&&o7.before.noMan&&o7.before.btn&&o7.before.chip&&o7.before.noDh&&/^0\/12 soudures$/.test(o7.before.shStat)&&o7.after.status==='soudee'&&o7.after.shStat===o7.before.shStat&&o7.after.pris
  &&o7.after.ops.join()==='sst'&&o7.after.byKind.sst===1&&!o7.after.byKind.soud&&o7.after.dnSst&&o7.after.dnSst.DN100===1&&!Object.keys(o7.after.dnSoud||{}).length&&o7.after.prog===12&&o7.after.sleeves===12&&o7.after.doeLabel==='Point SST pris'&&o7.after.doeSst===4&&o7.after.diam===4&&o7.after.vLeg;
// ── c6
C.c6=logs.length===0;console.log('c6) console :',JSON.stringify(logs.slice(0,5)));
await browser.close();
const bad=Object.keys(C).filter(k=>!C[k]);console.log(bad.length?'RESULTAT: ECHEC '+bad.join(','):'RESULTAT: TOUT VERT');
