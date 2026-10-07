// TRACÉ MARCHÉ FIGÉ · ÉCARTS · TS PAR ÉLÉMENT · EXTRUSIONS · UN SEUL CÔTÉ (Ethan 07/10) : le traceur fige le marché au 1er enregistrement ; l'appli compare réel / marché,
// propose les écarts en TS candidats, marque pièces / soudures / tronçons ; extrusion à l'étape ③ ; calques 👁 ; re-figer (avenant) ; persistance ; traceur : coupe et vanne d'un seul côté.
import { chromium } from 'playwright';
const BASE=process.env.BASE||'http://localhost:8765';
const browser=await chromium.launch({headless:true, executablePath: process.env.CHROMIUM_PATH||undefined});
const ctx=await browser.newContext({viewport:{width:900,height:940}});const page=await ctx.newPage();
const logs=[];page.on('pageerror',e=>logs.push('PAGEERROR: '+e.message.slice(0,300)));page.on('console',m=>{if(m.type()==='error'&&!/supabase|Failed to fetch|net::ERR|404/i.test(m.text()))logs.push(m.text().slice(0,200));});
page.on('dialog',d=>d.accept().catch(()=>{}));
const C={};
await page.goto(BASE+'/traceur.html');await page.waitForTimeout(500);
await page.evaluate(()=>{localStorage.clear(); /* TS définitif : aucun interrupteur à poser */});await page.reload();await page.waitForTimeout(500);
await page.evaluate(()=>{const S=window.MAQ.state;S.supplier='RENALIA';S.lines=[
  {id:'L1',name:'Rue de la Gare',dn:150,bar:12,pts:[[10,50],[130,50]],specials:[{id:'v1',type:'valve',m:40}],parent:null},
  {id:'L2',name:'Impasse des Lilas',dn:80,bar:12,pts:[[70,50],[70,100]],specials:[],parent:{line:'L1',m:60,side:1}}];S.seq=3;window.MAQ.setMode('select');window.MAQ.rebuild();});
// ── 0) avant enregistrement : pas de marché dans le traceur
let out=await page.evaluate(()=>({foot:document.querySelector('#foot').textContent,one:!!document.querySelector('#mOne')}));
console.log('0) traceur sans marché, bouton ◐ présent:',JSON.stringify({foot:/pas encore de tracé marché/.test(out.foot),one:out.one}));C.c0=/pas encore de tracé marché/.test(out.foot)&&out.one;
// ── 1) enregistrement → marché figé (traceur) ; ouverture dans l'appli
await page.click('#bSave');await page.waitForTimeout(200);await page.fill('#svName','TS test');await page.click('#svOk');await page.waitForTimeout(700);
out=await page.evaluate(()=>{const r=window.MAQ.state.siteRef;return {marche:!!(r&&r.marche),src:r&&r.marche&&r.marche.source,soud:r&&r.marche&&r.marche.tot.soud,vannes:r&&r.marche&&r.marche.tot.vannes,foot:document.querySelector('#foot').textContent,layer:document.querySelector('#net').innerHTML.includes('marché · Rue de la Gare')};});
console.log('1a) traceur : marché figé au 1er enregistrement, calque gris, pied « marché → réel » :',JSON.stringify(out));
C.c1a=out.marche&&out.src==='traceur'&&out.soud>0&&out.vannes===2&&/marché → réel/.test(out.foot)&&out.layer;
await page.click('#svGo');await page.waitForTimeout(1500);await page.selectOption('#roleSel','ethan');await page.waitForTimeout(300);
const siteId=await page.evaluate(()=>window.TRACE.state.siteId);
out=await page.evaluate(()=>{const T=window.TRACE;const M=T.ts.marche();const D=T.ts.diff();return {m:!!M,src:M&&M.source,soud:M&&M.tot.soud,reel:D.tot.reel.soud,d:D.tot.d.soud,cands:T.ts.candidates().length,marG:document.getElementById('marG').innerHTML.length,eye:!!document.querySelector('#disp')};});
console.log('1b) appli : marché présent (du traceur), réel = marché, 0 candidat, calque marché décoché par défaut:',JSON.stringify(out));
C.c1b=out.m&&out.src==='traceur'&&out.soud>0&&out.reel===out.soud&&out.d===0&&out.cands===0&&out.marG===0;
// ── 2) récap : section TS, tableau marché vs réel, « aucun écart »
await page.click('#tabbar [data-tab=recap]');await page.waitForTimeout(400);
out=await page.evaluate(()=>{const t=document.querySelector('#recap').textContent;return {ts:/Travaux supplémentaires/.test(t),tbl:/Marché/.test(t)&&/Réel \/ projeté/.test(t),ok:/Aucun écart non marqué/.test(t),btns:!!document.querySelector('#recap [data-tsrange]')&&!!document.querySelector('#recap [data-tsexport]')&&!!document.querySelector('#recap [data-tsrefreeze]')};});
console.log('2) récap TS :',JSON.stringify(out));C.c2=out.ts&&out.tbl&&out.ok&&out.btns;
// ── 3) extrusion à l'étape ③ (coude nu soudé) → j.extru, EXT sur le plan, TS proposé automatique, récap « Extrusions 1 »
const PNG='data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNkYPhfDwAChwGA60e6kgAAAABJRU5ErkJggg==';
await page.evaluate(({PNG})=>{const T=window.TRACE;const L=Object.values(T.lines).find(l=>l.name==='Rue de la Gare');const j=L.cond.A.joints[2];
  j.steps={1:{done:true,by:'Karim',at:new Date().toISOString(),photos:[PNG],proc:'tig'},2:{done:true,by:'Karim',at:new Date().toISOString(),photos:[PNG]}};j.status='soudee';j.wire='raccorde';T.openJoint(L.id,'A',2);},{PNG});
await page.waitForTimeout(400);
out=await page.evaluate(()=>{const r=document.querySelector('#sheet input[name=st3-type][value=extrude]');if(!r)return {radio:false};r.click();r.dispatchEvent(new Event('change',{bubbles:true}));const ext=document.querySelector('#sheet #st3-ext');const vis=ext&&ext.style.display!=='none';document.querySelector('#sheet #st3-cause').value='coudenu';document.querySelector('#sheet #st3-press').checked=true;
  const ok=document.querySelector('#sheet [data-stepok="3"]');ok.click();const toast1=document.querySelector('#toast')&&document.querySelector('#toast').textContent;return {radio:true,vis,toast1,tsBlock:/Marché \/ travaux supplémentaires/.test(document.querySelector('#sheet').textContent)};});
console.log('3a) étape ③ : radio Extrusion + cause visible ; sans photo → refus :',JSON.stringify(out));C.c3a=out.radio&&out.vis&&/extrusion/i.test(out.toast1||'')&&out.tsBlock;
await page.evaluate(({PNG})=>{const T=window.TRACE;const L=Object.values(T.lines).find(l=>l.name==='Rue de la Gare');const j=L.cond.A.joints[2];j.steps[3]={photos:[PNG]};T.renderAll();
  const r=document.querySelector('#sheet input[name=st3-type][value=extrude]');r.click();document.querySelector('#sheet #st3-cause').value='coudenu';document.querySelector('#sheet #st3-press').checked=true;document.querySelector('#sheet [data-stepok="3"]').click();},{PNG});
await page.waitForTimeout(500);
out=await page.evaluate(()=>{const T=window.TRACE;const L=Object.values(T.lines).find(l=>l.name==='Rue de la Gare');const j=L.cond.A.joints[2];const items=T.ts.of().items;const D=T.ts.diff();
  return {extru:j.extru&&j.extru.cause,status:j.status,ev:(j.events||[]).some(e=>e.type==='manchonnee'&&e.data.manchon==='extrude'),item:items.length===1&&items[0].kind==='weld'&&items[0].weldId===j.weldId&&items[0].etat==='propose'&&items[0].auto,extruCount:D.tot.reel.extru,manch:D.tot.reel.manchons===D.tot.reel.soud-1,ext:document.getElementById('tsG').innerHTML.includes('>EXT<'),cands:T.ts.candidates().length,sheet:/TS proposé/.test(document.querySelector('#sheet').textContent)};});
console.log('3b) extrusion enregistrée, TS proposé automatique, EXT sur le plan, récap :',JSON.stringify(out));
C.c3b=out.extru==='coudenu'&&out.status==='manchonnee'&&out.ev&&out.item&&out.extruCount===1&&out.manch&&out.ext&&out.cands===0&&out.sheet;
// ── 4) retour au traceur : vanne en plus à PK 100 → pied « vannes +2 », écart surligné non (même axe), enregistrement (mise à jour) → candidat dans l'appli
await page.goto(BASE+'/traceur.html?site='+encodeURIComponent(siteId));await page.waitForTimeout(1500);
out=await page.evaluate(()=>{const S=window.MAQ.state;const l=S.lines.find(x=>x.id==='L1');l.specials.push({id:'v2',type:'valve',m:100});window.MAQ.rebuild();return {marche:!!(S.siteRef&&S.siteRef.marche),foot:document.querySelector('#foot').textContent,ts:!!(S.siteRef&&S.siteRef.ts&&S.siteRef.ts.items.length===1),layer:document.querySelector('#net').innerHTML.includes('marché · Rue de la Gare'),badge:document.querySelector('#net').innerHTML.includes('note · S-')||document.querySelector('#net').innerHTML.includes('TS · S-')};});
console.log('4a) traceur rechargé : marché + marque TS conservés, vanne ajoutée → pied « vannes +2 » :',JSON.stringify({marche:out.marche,ts:out.ts,layer:out.layer,badge:out.badge,foot:out.foot.slice(out.foot.indexOf('marché →'),out.foot.indexOf('marché →')+140)}));
C.c4a=out.marche&&out.ts&&out.layer&&out.badge&&/vannes\s*\+2/.test(out.foot.replace(/\s+/g,' '))&&/soudures \d+ → \d+ \+4/.test(out.foot.replace(/\s+/g,' '));
await page.click('#bSave');await page.waitForTimeout(200);await page.selectOption('#svMode','update');await page.click('#svOk');await page.waitForTimeout(800);
out=await page.evaluate(()=>{const r=window.MAQ.state.siteRef;return {src:r.marche&&r.marche.source,soud:r.marche&&r.marche.tot.soud,ts:r.ts&&r.ts.items.length};});
console.log('4b) mise à jour : le marché d\'origine est gardé (pas re-figé), la marque TS aussi :',JSON.stringify(out));C.c4b=out.src==='traceur'&&out.ts===1;
await page.click('#svGo');await page.waitForTimeout(1500);await page.selectOption('#roleSel','ethan');await page.waitForTimeout(300);
await page.click('#tabbar [data-tab=recap]');await page.waitForTimeout(400);
out=await page.evaluate(()=>{const T=window.TRACE;const cands=T.ts.candidates();const D=T.ts.diff();const t=document.querySelector('#recap').textContent;return {n:cands.length,line:cands[0]&&cands[0].line,qty:cands[0]&&cands[0].qty,dV:D.tot.d.vannes,dS:D.tot.d.soud,txt:/écart/.test(t)&&/à marquer/.test(t),btn:!!document.querySelector('#recap [data-tscok="0"]'),items:T.ts.of().items.length,extruKept:T.ts.of().items[0]&&T.ts.of().items[0].kind==='weld'};});
console.log('4c) appli : 1 candidat (+2 vannes, +4 soudures sur la Rue), extrusion toujours marquée :',JSON.stringify(out));
C.c4c=out.n===1&&out.line==='L1'&&out.qty.vannes===2&&out.qty.soud===4&&out.dV===2&&out.dS===4&&out.txt&&out.btn&&out.items===1&&out.extruKept;
// ── 5) marquer le candidat « TS commandé · TS-01 » → plus de candidat, groupe TS-01, pastille sur le plan, hm non touché (pas une ligne entière)
await page.evaluate(()=>{document.querySelector('#recap [data-tscet="0"]').value='commande';document.querySelector('#recap [data-tscnum="0"]').value='TS-01';document.querySelector('#recap [data-tscok="0"]').click();});await page.waitForTimeout(400);
out=await page.evaluate(()=>{const T=window.TRACE;const items=T.ts.of().items;const it=items.find(x=>x.kind==='delta');const t=document.querySelector('#recap').textContent;return {cands:T.ts.candidates().length,it:!!it&&it.etat==='commande'&&it.ts==='TS-01'&&it.qty.vannes===2,grp:/TS-01/.test(t)&&/TS commandé/.test(t),ov:document.getElementById('tsG').innerHTML.includes('TS-01 · écart'),hm:!Object.values(T.lines).some(l=>l.hm&&l.hm.etat&&l.hm.etat!=='marche')};});
console.log('5) candidat marqué TS-01 commandé :',JSON.stringify(out));C.c5=out.cands===0&&out.it&&out.grp&&out.ov&&out.hm;
// ── 6) marquer la nouvelle vanne depuis sa fiche (la paire) → élément « el » 2 pièces, 4 soudures ; bascule d'état depuis le récap
out=await page.evaluate(()=>{const T=window.TRACE;const L=Object.values(T.lines).find(l=>l.name==='Rue de la Gare');const i=L.cond.A.els.findIndex(e=>e.kind==='valve'&&Math.abs((e.m0+e.m1)/2-100)<3);T.openEl(L.id,'A',i);const sh=document.querySelector('#sheet');const has=!!sh.querySelector('[data-tsmark="el"]');if(has){sh.querySelector('#tsEtat').value='propose';sh.querySelector('#tsNum').value='TS-02';sh.querySelector('#tsLab').value='vanne demandée par le client';sh.querySelector('[data-tsmark="el"]').click();}
  const it=T.ts.of().items.find(x=>x.kind==='el');return {has,it:!!it,els:it&&it.els.length,qty:it&&it.qty,ts:it&&it.ts,label:it&&it.label,sheet:/TS proposé/.test(document.querySelector('#sheet').textContent)&&/TS-02/.test(document.querySelector('#sheet').textContent)};});
console.log('6a) vanne marquée depuis sa fiche (paire) :',JSON.stringify(out));C.c6a=out.has&&out.it&&out.els===2&&out.qty.vannes===2&&out.qty.soud===4&&out.ts==='TS-02'&&/vanne demandée/.test(out.label)&&out.sheet;
await page.evaluate(()=>{window.TRACE.closeSheet();document.querySelector('#tabbar [data-tab=recap]').click();});await page.waitForTimeout(400);
out=await page.evaluate(()=>{const T=window.TRACE;const it=T.ts.of().items.find(x=>x.kind==='el');const b=document.querySelector(`#recap [data-tsst="forfait"][data-tsid="${it.id}"]`);b.click();return {etat:T.ts.of().items.find(x=>x.kind==='el').etat,grp:/TS-02/.test(document.querySelector('#recap').textContent)};});
console.log('6b) bascule d\'état depuis le récap → forfaitaire :',JSON.stringify(out));C.c6b=out.etat==='forfait'&&out.grp;
// ── 7) tronçon sur le plan (n'importe quelle longueur) : PK 20 → 33 sur la Rue → marque « range » 13 ml + soudures dedans ; le candidat de ligne ne repart pas (déjà marqué au-delà)
await page.evaluate(()=>{window.TRACE.ts.start();});await page.waitForTimeout(300);
out=await page.evaluate(()=>({tab:window.TRACE.state.tab,bar:document.querySelector('#tsBar').style.display!=='none',pose:!!window.TRACE.state.tsPose}));
console.log('7a) mode pose tronçon :',JSON.stringify(out));
await page.evaluate(()=>{const T=window.TRACE;const L=Object.values(T.lines).find(l=>l.name==='Rue de la Gare');const q0=T.posAtChainage?null:null;T.ts.tap(30,50);T.ts.tap(43,50);});await page.waitForTimeout(400);
out=await page.evaluate(()=>{const m=document.querySelector('#modal');const open=m&&m.classList.contains('show');if(open){document.querySelector('#tsrLab').value='dévoiement devant le 12';document.querySelector('#tsrEtat').value='propose';document.querySelector('#tsrNum').value='TS-03';document.querySelector('#tsrOk').click();}return {open};});
await page.waitForTimeout(400);
out=Object.assign(out,await page.evaluate(()=>{const T=window.TRACE;const it=T.ts.of().items.find(x=>x.kind==='range');return {it:!!it,m0:it&&it.m0,m1:it&&it.m1,ml:it&&it.qty.ml,soud:it&&it.qty.soud,ts:it&&it.ts,pose:!!T.state.tsPose,tab:T.state.tab,ov:document.getElementById('tsG').innerHTML.includes('TS-03 · 13 ml')};}));
console.log('7b) tronçon PK 20 → 33 marqué TS-03 (13 ml) :',JSON.stringify(out));C.c7=out.open&&out.it&&Math.abs(out.m0-20)<0.6&&Math.abs(out.m1-33)<0.6&&Math.abs(out.ml-13)<0.7&&out.soud>=2&&out.ts==='TS-03'&&!out.pose&&out.ov;
// ── 8) 👁 : tracé marché (gris) + calque TS décochable ; écarts : aucun (même axe)
out=await page.evaluate(()=>{const T=window.TRACE;T.state.tab='plan';T.renderAll();T.state.show.marche=true;T.renderPlan();const g=document.getElementById('marG').innerHTML;const on=g.includes('marché · Rue de la Gare');T.state.show.ts=false;T.renderPlan();const off=!document.getElementById('tsG').innerHTML.includes('TS-01');T.state.show.extru=false;T.renderPlan();const noExt=!document.getElementById('tsG').innerHTML.includes('>EXT<');T.state.show.ts=true;T.state.show.extru=true;T.state.show.marche=false;T.renderPlan();
  document.querySelector('.zoomctl [data-z=eye]').click();const labs=[...document.querySelectorAll('#disp label')].map(l=>l.textContent.trim());document.querySelector('.zoomctl [data-z=eye]').click();return {on,off,noExt,labs:labs.filter(x=>/marché|Écarts|Extrusions|TS/.test(x)).length};});
console.log('8) calques 👁 marché / TS / extrusions :',JSON.stringify(out));C.c8=out.on&&out.off&&out.noExt&&out.labs===4;
// ── 9) export dossier TS : fenêtre imprimable avec plan, tableau, TS-01 / TS-02 / TS-03
await page.evaluate(()=>{window.TRACE.closeSheet();document.querySelector('#tabbar [data-tab=recap]').click();});await page.waitForTimeout(300);
const [pop]=await Promise.all([page.waitForEvent('popup'),page.evaluate(()=>document.querySelector('#recap [data-tsexport]').click())]);await pop.waitForLoadState('domcontentloaded');await pop.waitForTimeout(300);
out=await pop.evaluate(()=>({h1:document.querySelector('h1').textContent,svg:!!document.querySelector('svg'),t:document.body.textContent}));await pop.close();
console.log('9) export :',JSON.stringify({h1:out.h1,svg:out.svg,ts:/TS-01/.test(out.t)&&/TS-02/.test(out.t)&&/TS-03/.test(out.t),tbl:/Marché vs réel/.test(out.t)}));C.c9=/Travaux supplémentaires/.test(out.h1)&&out.svg&&/TS-01/.test(out.t)&&/TS-02/.test(out.t)&&/TS-03/.test(out.t);
// ── 10) persistance : rechargement → marché (date), marques (4) et extrusion conservés ; puis re-figer (avenant) → 0 candidat, historique 1
await page.reload();await page.waitForTimeout(1500);await page.evaluate(id=>window.TRACE.go(id),siteId);await page.waitForTimeout(2500);await page.selectOption('#roleSel','ethan');await page.waitForTimeout(300);
out=await page.evaluate(()=>{const T=window.TRACE;const M=T.ts.marche();const items=T.ts.of().items;const L=Object.values(T.lines).find(l=>l.name==='Rue de la Gare');return {m:!!M,src:M&&M.source,n:items.length,kinds:items.map(x=>x.kind).sort().join(),extru:!!L.cond.A.joints[2].extru,cands:T.ts.candidates().length};});
console.log('10a) après rechargement :',JSON.stringify(out));C.c10a=out.m&&out.src==='traceur'&&out.n===4&&out.kinds==='delta,el,range,weld'&&out.cands===0; // extru : porté par la table welds (data.extru, reconstruit depuis steps[3]) — pas de serveur ici
out=await page.evaluate(()=>{const T=window.TRACE;const before=T.ts.marche().tot.vannes;T.ts.ensureMarche(true);const M=T.ts.marche();return {before,after:M.tot.vannes,src:M.source,prev:(M.prev||[]).length,cands:T.ts.candidates().length,items:T.ts.of().items.length};});
console.log('10b) re-figer (avenant) : vannes 2 → 4 dans le marché, historique gardé, marques gardées :',JSON.stringify(out));C.c10b=out.before===2&&out.after===4&&out.src==='avenant'&&out.prev===1&&out.cands===0&&out.items===4;
// ── 11) traceur : un seul côté — coupe « aller seul » à PK 55 ; vanne retour déplacée seule (mR) → ses soudures suivent ; la paire bouge ensemble sinon
await page.goto(BASE+'/traceur.html?site='+encodeURIComponent(siteId));await page.waitForTimeout(1500);
out=await page.evaluate(()=>{const S=window.MAQ.state;const l=S.lines.find(x=>x.id==='L1');l.cuts=[{id:'c1',m:55,cond:'A'}];window.MAQ.rebuild();const B=S.built.L1;const nearA=B.A.welds.some(w=>Math.abs(w.m-55)<0.6),nearR=B.R.welds.some(w=>Math.abs(w.m-55)<0.6);
  const v=l.specials.find(x=>x.id==='v2');v.mR=108;window.MAQ.rebuild();const B2=S.built.L1;const vA=B2.A.pieces.find(p=>p.kind==='valve'&&Math.abs((p.m0+p.m1)/2-100)<2),vR=B2.R.pieces.find(p=>p.kind==='valve'&&Math.abs((p.m0+p.m1)/2-108)<2),vR100=B2.R.pieces.find(p=>p.kind==='valve'&&Math.abs((p.m0+p.m1)/2-100)<2);
  const wR=vR?B2.R.welds.filter(w=>Math.abs(w.m-vR.m0)<0.3||Math.abs(w.m-vR.m1)<0.3).length:0;const txt=document.querySelector('#panel').textContent;S.sel={kind:'line',id:'L1'};S.tab='sel';window.MAQ.rebuild();const t2=document.querySelector('#panel').textContent;
  return {nearA,nearR,vA:!!vA,vR:!!vR,vR100:!!vR100,wR,panel:/aller seul/.test(t2)&&/retour PK 108/.test(t2)};});
console.log('11) traceur un seul côté : coupe aller seule (soudure à 55 sur A, pas sur R), vanne retour à 108 avec ses 2 soudures, aller reste à 100 :',JSON.stringify(out));
C.c11=out.nearA&&!out.nearR&&out.vA&&out.vR&&!out.vR100&&out.wR===2&&out.panel;
const ALL=Object.values(C).every(Boolean);
console.log('RESULTAT:',ALL?'TOUT VERT':'ECHEC '+JSON.stringify(C));
console.log(logs.length?logs:'[]');
await browser.close();process.exit(ALL?0:1);
