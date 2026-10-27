// 27/10 (Ethan : « ajoute aussi en SST de pouvoir choisir si c'est des coudes de remontée pour bien compter une paire de coudes du DN pour les remontées en SST » ;
// 27/10 soir : « deux soudures en plus pré-isolé puis le point de la SST, comme avant » — pas de vanne) — TRACEUR, réseau FICTIF : L1 DN 100, 40 m droit, départ chaufferie / fin sous-station.
// c1 sans remontée : 0 coude, 5 soudures par conduite, la fiche du raccordement de fin propose « Remontée dans le local » (pas sur un kit)
// c2 coche → par conduite : 1 coude 90° pré-isolé du DN (plane V, riser, référence catalogue ordinaire) soudé au bout du tube, raccordement au bout de sa jambe, 6 soudures (+1),
//    dessiné au-delà du bout (déplié), aucune erreur ; nomenclature : K – 100/90 comme un coude ordinaire
// c3 décoche → retour à 5 soudures, 0 coude ; recoche
// c4 remontée au départ (chaufferie) + fin : 2 coudes par conduite, PK < 0 au départ ; purge en bout : collée au bout, pas d'erreur
// c5 enregistrement → pont : els riser, ends.end.riser = true ; appli : coudes 4, soudures 18 (manchons 18), ml tranchée 40, ml tube avec les jambes des coudes, fourniture : 4 coudes 90° DN100
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
const info=()=>page.evaluate(()=>{const S=window.MAQ.state;const l=S.lines[0];const B=S.built.L1;const cd=c=>{const b=B[c];const P=b.pieces;return {nW:b.welds.length,wR:b.welds.filter(w=>w.riser).length,nB:P.filter(p=>p.kind==='bend').length,bV:P.filter(p=>p.kind==='bend'&&p.plane==='V'&&p.riser&&!p.nu).length,nV:P.filter(p=>p.kind==='valve').length,nu:b.welds.filter(w=>w.nu).length,tubeV:P.filter(p=>p.kind==='tube'&&p.riser).map(p=>+p.L.toFixed(2)),xs:P.filter(p=>p.kind==='endpoint').map(p=>[+p.m0.toFixed(2),+p.path[0][0].toFixed(2),!!p.riser]),pcs:P.map(p=>p.id+(p.riser?'*':'')).join(' '),errs:P.filter(p=>p.err).length,notes:b.notes.filter(n=>n.kind==='err').map(n=>n.txt),mins:Math.min(...P.map(p=>p.m0)),maxs:Math.max(...P.map(p=>p.m1)),len:b.length};};
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
C.c2=I.re===true&&I.A.nW===6&&I.A.wR===2&&I.A.nu===0&&I.A.nB===1&&I.A.bV===1&&I.A.nV===0&&I.R.nB===1&&I.R.nW===6&&I.A.errs===0&&I.A.xs[1][0]>40&&I.A.xs[1][1]>40&&I.A.xs[1][2]&&I.A.maxs>40&&Math.abs(I.A.len-40)<0.01&&nomen['K – 100/90']===2&&!Object.keys(nomen).some(k=>/vanne/.test(k))&&/X1 P1 P2 P3 P4 C1\* X2\*/.test(I.A.pcs);
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
C.c4=I6.rs===true&&I6.A.nB===2&&I6.A.nV===0&&I6.A.nW===7&&I6.A.xs[0][0]<0&&I6.A.xs[0][1]<0&&I6.A.mins<0&&I7.A.errs===0&&/T1/.test(I7.A.pcs)&&I7.A.nW===8;
// ── c5 : enregistrement → pont → appli
const handoff=id=>page.evaluate(id=>new Promise(res=>{const q=indexedDB.open('trace-kv');q.onsuccess=()=>{try{const g=q.result.transaction('kv','readonly').objectStore('kv').get('trace:handoff:'+id);g.onsuccess=()=>res(g.result||null);g.onerror=()=>res(null);}catch(e){res(null);}};q.onerror=()=>res(null);}),id);
await page.click('#bSave');await wait(250);await page.fill('#svName','SST fictif');await page.click('#svOk');await wait(1400);const sid=await page.evaluate(()=>window.MAQ.state.siteRef&&window.MAQ.state.siteRef.id);const site=sid?await handoff(sid):null;
const L=site&&site.lines[0];const elsA=L?L.cond.A.els:[];const o5={ends:L&&L.ends,riserEls:elsA.filter(e=>e.riser).map(e=>e.kind+(e.plane||'')+(e.nu?'·nu':'')),riserW:L?L.cond.A.welds.filter(w=>w.riser).length:0,nuW:L?L.cond.A.welds.filter(w=>w.nu).length:0,len:L&&L.cond.A.length};
await page.goto(BASE+'/index.html');await wait(900);{const s=await page.$('#loginSkip');if(s&&await s.isVisible())await s.click();await wait(600);}
const app=await page.evaluate(async site=>{const T=window.TRACE;T.etude.addSite(site);await T.go(site.id);const l=T.lines[site.lines[0].id];const c=T.ts.counts(l);const q=T.etude.qty(site.id);const row=q&&q.rows&&q.rows.find(r=>r.dn===100);const kinds=Object.values(l.cond.A.els).filter(e=>e.riser).map(e=>e.kind+(e.nu?'·nu':''));const needs=T.fourniture.needs?T.fourniture.needs():null;const nk=needs?Object.keys(needs.need||needs).filter(k=>/bend|valve/.test(k)):null;return {c:{coudes:c.coudes,vannes:c.vannes,soud:c.soud,manchons:c.manchons,ml:c.ml,purges:c.purges},qty:row?{mlTr:row.mlTr,mlTube:row.mlTube,coudes:row.coudes,vannes:row.vannes,soud:row.soud}:null,kinds,nk};},site);
console.log('c5) pont + appli :',JSON.stringify({...o5,app}));
C.c5=!!L&&L.ends.end.riser===true&&L.ends.start.riser===true&&o5.riserEls.join(',')==='endpoint,bendV,bendV,endpoint'&&o5.riserW===4&&o5.nuW===0&&Math.abs(o5.len-40)<0.01&&app.c.coudes===4&&app.c.vannes===0&&app.c.soud===16&&app.c.manchons===16&&app.c.purges===2&&Math.abs(app.c.ml-40)<0.2&&app.qty&&Math.abs(app.qty.mlTr-40)<0.3&&Math.abs(app.qty.mlTube-88)<0.5&&app.qty.coudes===4&&app.qty.vannes===0&&app.kinds.filter(k=>k==='bend').length===2&&Array.isArray(app.nk)&&app.nk.some(k=>/bend:100:90/.test(k));
// ── c6
C.c6=logs.length===0;console.log('c6) console :',JSON.stringify(logs.slice(0,5)));
await browser.close();
const bad=Object.keys(C).filter(k=>!C[k]);console.log(bad.length?'RESULTAT: ECHEC '+bad.join(','):'RESULTAT: TOUT VERT');
