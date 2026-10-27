// 27/10 — MODIFS PAR ZONE (Ethan : « j'ai retapé un gros plan et la liste des modifs est très dure à interpréter : +14 tés, +8 réductions, +48 coudes… ; bien regrouper les
// modifs entre elles, les nommer ; deux modifs sur la même ligne peuvent ne pas être la même ; une modif sur une modif doit presque supprimer la première pour toujours
// comparer à l'initiale »). Réseau FICTIF du traceur : L1 DN 100, 400 m avec un angle (2 coudes), vanne PK 20, té PK 100, vanne PK 350, té PK 380.
//  c1  marché figé au 1er enregistrement (avec les PK des soudures : wk) ; retracé : vanne ajoutée PK 60, détour de +40 m à l'angle (2 coudes en plus), té du PK 380 retiré
//      → DEUX modifs à qualifier, une par zone (« PK 60 : +2 vannes … », « PK 330 → 460 : +8 coudes · −2 tés · +80 ml · soudures · tracé dévié » — le té retiré est sur le tronçon retracé), aucune fausse pièce
//      (les pièces de l'aval sont reconnues malgré le décalage de 40 m), soudures exactes (pas d'estimation), pas de « reste »
//  c2  la zone du détour qualifiée en TS proposé (DEV-Z1) → marque avec sa zone ; les deux autres restent à qualifier
//  c3  modif sur la modif : le détour est déplacé de 30 m → la marque DEV-Z1 est « dépassée » (ne compte plus), la nouvelle zone ressort à qualifier ; « Reprendre » met DEV-Z1 dessus
//  c6  « Modifs sur le plan » : plein écran, pastilles numérotées, une pastille → sa fiche (avant → après) et sa qualification, ⭕ entourer au doigt → sélection, 🔗 regrouper (bilan net, devis), calques 👁, fermer
//  c4  téléphone 390 : pas de débordement · c5 console
import { chromium } from 'playwright';
const BASE=process.env.BASE||'http://localhost:8765';const SHOTS=process.env.SHOTS||null;
const browser=await chromium.launch({headless:true, executablePath: process.env.CHROMIUM_PATH||undefined});
const C={};const logs=[];
const ctx=await browser.newContext({viewport:{width:1366,height:900},deviceScaleFactor:1});const page=await ctx.newPage();
page.on('pageerror',e=>logs.push('PAGEERROR: '+e.message.slice(0,300)));page.on('console',m=>{if(m.type()==='error'&&!/supabase|Failed to fetch|net::ERR|404|geopf|WebSocket/i.test(m.text()))logs.push(m.text().slice(0,200));});page.on('dialog',d=>d.accept().catch(()=>{}));
const shot=async n=>{if(SHOTS)await page.screenshot({path:`${SHOTS}/tsz_${n}.png`});};
await page.goto(BASE+'/traceur.html');await page.waitForTimeout(500);await page.evaluate(()=>localStorage.clear());await page.reload();await page.waitForTimeout(500);
await page.evaluate(()=>{const S=window.MAQ.state;S.lines=[{id:'L1',name:'Rue Fictive',dn:100,bar:12,pts:[[0,0],[150,0],[150,80],[400,80]],specials:[{id:'v1',type:'valve',m:20},{id:'t1',type:'tee',m:100},{id:'v2',type:'valve',m:350},{id:'t2',type:'tee',m:380}],parent:null}];S.seq=2;window.MAQ.setMode('select');window.MAQ.rebuild();});
await page.click('#bSave');await page.waitForTimeout(200);await page.fill('#svName','Zones test');await page.click('#svOk');await page.waitForTimeout(800);
await page.click('#svGo');await page.waitForTimeout(1500);await page.selectOption('#roleSel','ethan');await page.waitForTimeout(300);
const siteId=await page.evaluate(()=>window.TRACE.state.siteId);
let o=await page.evaluate(()=>{const T=window.TRACE;const M=T.ts.marche();const x=M.lines.find(y=>y.id==='L1');return {wk:!!(x&&x.wk&&x.wk.A&&x.wk.A.length),nA:x&&x.wk?x.wk.A.length:0,soud:M.tot.soud,cands:T.ts.candidates().length};});
console.log('c1) marché figé :',JSON.stringify(o));const c1a=o.wk&&o.nA*2===o.soud&&o.cands===0;
// retracé : vanne PK 60 ; détour +40 m à l'angle ; té du bout retiré
await page.goto(BASE+'/traceur.html?site='+encodeURIComponent(siteId));await page.waitForTimeout(1500);
await page.evaluate(()=>{const S=window.MAQ.state;const l=S.lines.find(x=>x.id==='L1');l.pts=[[0,0],[150,0],[150,80],[250,80],[250,120],[300,120],[300,80],[400,80]];l.specials=l.specials.filter(sp=>sp.id!=='t2');l.specials.push({id:'v3',type:'valve',m:60}); /* une bosse de 50 m × 40 m : +80 ml, 4 coudes */window.MAQ.rebuild();});
await page.click('#bSave');await page.waitForTimeout(200);await page.selectOption('#svMode','update');await page.click('#svOk');await page.waitForTimeout(800);
await page.click('#svGo');await page.waitForTimeout(1500);await page.selectOption('#roleSel','ethan');await page.waitForTimeout(300);
await page.evaluate(()=>{const T=window.TRACE;T.state.tab='ts';T.renderAll();});await page.waitForTimeout(400);
o=await page.evaluate(()=>{const T=window.TRACE;const D=T.ts.diff();const r=D.rows.find(x=>x.id==='L1');const cs=T.ts.candidates();return {d:r.d,added:r.added.map(p=>p.k+'@'+p.m),removed:r.removed.map(p=>p.k+'@'+p.m+'→'+p.mr),pairs:r.pairs.length,cs:cs.map(c=>({kind:c.kind,where:c.where,label:c.label,qty:c.qty,zone:c.zone,estim:!!c.estim,pcs:(c.pcs||[]).map(p=>(p.rm?'−':'+')+p.k+'@'+p.m),geo:(c.geo||[]).length})),cards:[...document.querySelectorAll('#tsview .tsCard.cand .tsHead')].map(h=>h.textContent.replace(/[\s  ]+/g,' ').trim())};});
await shot('1_zones');console.log('c1) zones :',JSON.stringify(o));
const zV=o.cs.find(c=>/\+2 vannes/.test(c.label)),zD=o.cs.find(c=>/\+8 coudes/.test(c.label));
C.c1=c1a&&o.added.length===10&&o.removed.length===2&&o.pairs===12&&o.cs.length===2&&o.cs.every(c=>c.kind==='delta'&&c.zone&&!c.estim)
  &&!!zV&&/^PK 60 : \+2 vannes \(PK 60\)( · \+\d soudures?)?( · \+\d manchons?)?$/.test(zV.label)&&zV.qty.vannes===2&&!zV.qty.ml
  &&!!zD&&/^PK 3[23]\d(,\d)? → 4[56]\d(,\d)? : \+8 coudes \(PK 330, 370, 420, 460\) · −2 tés \(PK 380\) · \+80 ml · \+\d+ soudures · tracé dévié$/.test(zD.label)&&zD.qty.coudes===8&&zD.qty.tes===-2&&zD.qty.ml===80&&zD.qty.soud>=8&&zD.geo>=3
  &&!o.cs.some(c=>/reste de la ligne/.test(c.label))&&o.cards.length===2&&o.d.ml===80&&o.d.coudes===8&&o.d.vannes===2&&o.d.tes===-2&&o.d.soud===zV.qty.soud+zD.qty.soud;
// ── c2) qualifier la zone du détour en TS proposé
const iD=o.cs.indexOf(zD);await page.selectOption(`#tsview [data-tscet="${iD}"]`,'propose');await page.click(`#tsview [data-tscok="${iD}"]`);await page.waitForTimeout(300);
const modal=await page.evaluate(()=>!!document.querySelector('#modal #tsqDevis'));if(modal){await page.fill('#modal #tsqDesig','Détour à l\'angle');await page.fill('#modal #tsqDevis','DEV-Z1');await page.click('#modal #tsqOk');await page.waitForTimeout(400);}
o=await page.evaluate(()=>{const T=window.TRACE;const it=T.ts.of().items.find(x=>x.ts==='DEV-Z1');return {it:it?{etat:it.etat,zone:it.zone,where:it.where,m:it.m,pcs:(it.pcs||[]).length,located:it.located,qty:it.qty}:null,cands:T.ts.candidates().map(c=>c.where),cards:document.querySelectorAll('#tsview .tsCard:not(.cand)').length};});
await shot('2_qualifie');console.log('c2) qualifié :',JSON.stringify({modal,o}));
C.c2=modal&&!!o.it&&o.it.etat==='propose'&&!!o.it.zone&&/^PK 3/.test(o.it.where||'')&&o.it.pcs===10&&o.it.located&&o.it.qty.coudes===8&&o.it.qty.ml===80&&o.cands.length===1&&o.cards===1;
// ── c3) modif sur la modif : le détour est déplacé de 30 m vers l'amont → marque dépassée, nouvelle zone à qualifier, « Reprendre »
await page.goto(BASE+'/traceur.html?site='+encodeURIComponent(siteId));await page.waitForTimeout(1500);
await page.evaluate(()=>{const S=window.MAQ.state;const l=S.lines.find(x=>x.id==='L1');l.pts=[[0,0],[150,0],[150,80],[220,80],[220,120],[270,120],[270,80],[400,80]]; /* la bosse déplacée de 30 m vers l'amont */window.MAQ.rebuild();});
await page.click('#bSave');await page.waitForTimeout(200);await page.selectOption('#svMode','update');await page.click('#svOk');await page.waitForTimeout(800);
await page.click('#svGo');await page.waitForTimeout(1500);await page.selectOption('#roleSel','ethan');await page.waitForTimeout(300);
await page.evaluate(()=>{const T=window.TRACE;T.state.tab='ts';T.renderAll();});await page.waitForTimeout(400);
o=await page.evaluate(()=>{const T=window.TRACE;const it=T.ts.of().items.find(x=>x.ts==='DEV-Z1');const cs=T.ts.candidates();const el=document.getElementById('tsview');return {stale:T.ts.stale(it.id),live:T.ts.live(it),cands:cs.map(c=>c.label),section:/Modifs dépassées/.test(el.textContent),card:!!el.querySelector('.tsCard.stale'),btn:!!el.querySelector(`[data-tsreplace="${it.id}"]`),qualN:(el.textContent.match(/Modifications qualifiées \((\d+)/)||[])[1]};});
await shot('3_depassee');console.log('c3) dépassée :',JSON.stringify(o));
const c3a=o.stale&&!o.live&&o.section&&o.card&&o.btn&&o.qualN==='0'&&o.cands.length===2&&o.cands.some(t=>/^PK (29|30)\d(,\d)? → 4[23]\d(,\d)? : \+8 coudes \(PK 300, 340, 390, 430\) · −2 tés/.test(t)&&/\+80 ml/.test(t));
await page.evaluate(()=>document.querySelector('#tsview [data-tsreplace]').click());await page.waitForTimeout(500);
o=await page.evaluate(()=>{const T=window.TRACE;const its=T.ts.of().items.filter(x=>x.ts==='DEV-Z1');const it=its[0];const el=document.getElementById('tsview');return {n:its.length,it:it?{etat:it.etat,desig:it.desig,where:it.where,stale:T.ts.stale(it.id),qty:it.qty}:null,section:/Modifs dépassées/.test(el.textContent),cands:T.ts.candidates().length,toast:(document.getElementById('toast')||{}).textContent||''};});
await shot('3_reprise');console.log('c3) reprise :',JSON.stringify(o));
C.c3=c3a&&o.n===1&&!!o.it&&o.it.etat==='propose'&&o.it.desig==='Détour à l\'angle'&&/^PK (29|30)\d/.test(o.it.where||'')&&!o.it.stale&&o.it.qty.coudes===8&&!o.section&&o.cands===1&&/Qualification reprise/.test(o.toast);
// ── c6) « Modifs sur le plan » : plein écran, pastilles numérotées, choisir, entourer au doigt, regrouper (bilan net), calques 👁
await page.click('#tsview [data-tsmap]');await page.waitForTimeout(400);
o=await page.evaluate(()=>{const m=document.getElementById('tsMap');return {open:!!m,badges:[...m.querySelectorAll('[data-tsmn]')].map(g=>g.dataset.tsmn),hint:!!m.querySelector('.tsmHint'),eyes:m.querySelectorAll('[data-tsmeye]').length,svg:!!m.querySelector('#tsmPlan svg.tsNum')};});
await shot('6_map');const m1=o.open&&o.badges.length===2&&o.badges.includes('c0')&&o.hint&&o.eyes===5&&o.svg;
await page.evaluate(()=>document.querySelector('#tsMap [data-tsmn="c0"]').dispatchEvent(new MouseEvent('click',{bubbles:true,cancelable:true})));await page.waitForTimeout(300);
o=await page.evaluate(()=>{const m=document.getElementById('tsMap');const it=m.querySelector('.tsmItem');return {sel:window.TRACE.ts.map().state.sel,items:m.querySelectorAll('.tsmItem').length,cand:!!(it&&/à qualifier/.test(it.textContent)),selOk:!!m.querySelector('.tsmItem [data-tscet="0"]'),vig:!!m.querySelector('.tsmItem .tsmVig svg'),txt:it?it.textContent.replace(/\s+/g,' ').slice(0,160):''};});
console.log('c6) pastille choisie :',JSON.stringify(o));const m2=o.sel.join()==='c0'&&o.items===1&&o.cand&&o.selOk&&o.vig&&/PK 60 : \+2 vannes/.test(o.txt);
/* entourer au doigt : un contour autour des deux pastilles */
await page.click('#tsMap [data-tsmlasso]');await page.waitForTimeout(200);
const bb=await page.evaluate(()=>{const r=[...document.querySelectorAll('#tsMap [data-tsmn] circle')].map(c=>c.getBoundingClientRect());const x0=Math.min(...r.map(x=>x.left)),y0=Math.min(...r.map(x=>x.top)),x1=Math.max(...r.map(x=>x.right)),y1=Math.max(...r.map(x=>x.bottom));return {x0,y0,x1,y1};});
await page.mouse.move(bb.x0-30,bb.y0-30);await page.mouse.down();for(const [x,y] of [[bb.x1+30,bb.y0-30],[bb.x1+30,bb.y1+30],[bb.x0-30,bb.y1+30],[bb.x0-30,bb.y0-30]]){await page.mouse.move(x,y,{steps:6});}await page.mouse.up();await page.waitForTimeout(400);
o=await page.evaluate(()=>{const m=document.getElementById('tsMap');return {sel:window.TRACE.ts.map().state.sel.slice().sort(),bar:(m.querySelector('.tsmBar')||{}).textContent||'',grp:!!m.querySelector('[data-tsmgroup]'),toast:(document.getElementById('toast')||{}).textContent||''};});
await shot('6_lasso');console.log('c6) entourer :',JSON.stringify(o));const m3=o.sel.length===2&&/2 modifs choisies/.test(o.bar)&&/bilan net/.test(o.bar)&&o.grp&&/ajoutée/.test(o.toast);
await page.click('#tsMap [data-tsmgroup]');await page.waitForTimeout(400);
const modal2=await page.evaluate(()=>!!document.querySelector('#modal #tsqDevis'));if(modal2){await page.fill('#modal #tsqDesig','Groupe plan');await page.fill('#modal #tsqDevis','DEV-G9');await page.click('#modal #tsqOk');await page.waitForTimeout(400);}
o=await page.evaluate(()=>{const T=window.TRACE;const g=T.ts.of().items.find(x=>x.kind==='group');const m=document.getElementById('tsMap');return {g:g?{n:g.members.length,ts:g.ts,desig:g.desig,qty:g.qty}:null,sel:T.ts.map().state.sel,badges:[...new Set([...m.querySelectorAll('[data-tsmn]')].map(x=>x.dataset.tsmn))].length,nb:m.querySelectorAll('[data-tsmn]').length,side:(m.querySelector('.tsmItem')||{}).textContent||''};});
await shot('6_groupe');console.log('c6) groupe :',JSON.stringify({modal2,o:{...o,side:o.side.replace(/\s+/g,' ').slice(0,200)}}));
const m4=modal2&&!!o.g&&o.g.n===2&&o.g.ts==='DEV-G9'&&o.g.qty.vannes===2&&o.g.qty.coudes===8&&o.badges===1&&o.nb===2&&o.sel.length===1&&/DEV-G9/.test(o.side)&&/Bilan net/.test(o.side); /* un groupe : le même numéro sur chacun de ses deux membres */
await page.evaluate(()=>{const cb=document.querySelector('#tsMap [data-tsmeye="items"]');cb.checked=false;cb.dispatchEvent(new Event('change',{bubbles:true}));});await page.waitForTimeout(300);
const eyeOff=await page.evaluate(()=>document.querySelectorAll('#tsMap [data-tsmn]').length);
await page.evaluate(()=>{const cb=document.querySelector('#tsMap [data-tsmeye="items"]');cb.checked=true;cb.dispatchEvent(new Event('change',{bubbles:true}));});await page.waitForTimeout(300);
const eyeOn=await page.evaluate(()=>document.querySelectorAll('#tsMap [data-tsmn]').length);
await page.click('#tsMap [data-tsmclose]');await page.waitForTimeout(300);const closed=await page.evaluate(()=>!document.getElementById('tsMap'));
console.log('c6) calques / fermeture :',JSON.stringify({eyeOff,eyeOn,closed}));C.c6=m1&&m2&&m3&&m4&&eyeOff===0&&eyeOn===2&&closed;
// ── c4) téléphone
await page.setViewportSize({width:390,height:844});await page.evaluate(()=>window.TRACE.renderAll());await page.waitForTimeout(400);
o=await page.evaluate(()=>({sw:document.documentElement.scrollWidth,w:window.innerWidth,n:document.querySelectorAll('#tsview .tsCard').length}));await shot('4_tel');console.log('c4) téléphone :',JSON.stringify(o));C.c4=o.sw<=o.w+1&&o.n>=1;
console.log('erreurs console :',JSON.stringify(logs));C.c5=logs.length===0;
const ko=Object.entries(C).filter(([k,v])=>!v).map(([k])=>k);console.log(JSON.stringify(C));console.log(ko.length?'RESULTAT: KO '+ko.join(','):'RESULTAT: TOUT VERT');
await browser.close();
