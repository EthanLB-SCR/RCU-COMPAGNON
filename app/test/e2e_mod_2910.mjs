// 29/10 (lot 2910b) — MODIFICATIONS PAR ÉLÉMENTS. Ethan : « il faut qu'il y ait tout ce qui a changé et je dois regrouper et attribuer chacune des modifs, détaillé : sur une même
// modif il peut y avoir des choses comprises et d'autres non ; sélectionner le −, sélectionner le + et que ça compare ; le plan d'ensemble affiche tout ce qui a été modifié / enlevé ;
// suivi de date et de version » + son cas : « une antenne supprimée, une réduction du coup décalée, avec le prolongement de l'antenne d'après qui récupère le bâtiment ».
// Réseau FICTIF du traceur. MARCHÉ : feeder L1 DN 150 (0 → 420), réduction 150/125 à PK 135 ; antenne A (L2, DN 65, 90 m) au PK 120 ; antenne B (L3, DN 80, 70 m) au PK 260.
// VERSION 2 : L2 supprimée ; L3 prolongée (70 → 90 → 140 m vers le bâtiment A), passée en DN 100, té 100/80 au PK 70 ; réduction du feeder déplacée au PK 275.
// VERSION 3 : vanne DN 150 au PK 70 du feeder. TERRAIN : manchon extrudé sur une soudure.
//  c1  éléments : − té 150/65, − tube DN 65 (ligne supprimée), − fin de ligne 65, − réduction (PK 135), + réduction (PK 275), − tube DN 125 / + tube DN 150 même passage (paire),
//      − tube DN 80 / + tube DN 100 même passage (paire), + tube DN 100 prolongement, + coudes, + té 100/80, − fin de ligne 80 / + fin de ligne 100 ; tout « à attribuer » ; totaux = écart des lignes
//  c2  version 2 = tout sauf la vanne (v3) et l'extrusion (v4) ; « vu le » daté
//  c3  mode Attribuer : « Tout prendre » la version 2 → panneau : − / +, lecture (122 m DN 125 → 150, 70 m DN 80 → 100, réduction déplacée), comparatif par quantité et DN
//  c4  qualification ligne par ligne (tout TS proposé, soudures comprises, réduction pour mémoire) + nom + devis → modif n°1 ; plus que 2 éléments à attribuer ; calque : n°1 ; récap
//  c5  geste : toucher un élément sur le plan le prend ; ⭕ entourer la vanne la prend ; modif n°2 « Compris » sans devis
//  c6  modifier la modif n°1 depuis sa carte (pré-remplie), retirer un élément → il redevient à attribuer ; supprimer la modif n°2 → la vanne redevient à attribuer
//  c7  export : les modifs, le récap, « à attribuer » ; fiche d'une pièce : sa modif · c8 téléphone 390 (barre, panneau plein écran, sans débordement) · c9 console
import { chromium } from 'playwright';
const BASE=process.env.BASE||'http://localhost:8765';const SHOTS=process.env.SHOTS||null;
const browser=await chromium.launch({headless:true, executablePath: process.env.CHROMIUM_PATH||undefined});
const C={};const logs=[];const J=x=>JSON.stringify(x);
const ctx=await browser.newContext({viewport:{width:1366,height:900},deviceScaleFactor:1});const page=await ctx.newPage();
page.on('pageerror',e=>logs.push('PAGEERROR: '+e.message.slice(0,300)));page.on('console',m=>{if(m.type()==='error'&&!/supabase|Failed to fetch|net::ERR|404|geopf|WebSocket/i.test(m.text()))logs.push(m.text().slice(0,200));});page.on('dialog',d=>d.accept().catch(()=>{}));
const shot=async n=>{if(SHOTS)await page.screenshot({path:`${SHOTS}/mod_${n}.png`});};const wait=ms=>page.waitForTimeout(ms);
await page.goto(BASE+'/traceur.html');await wait(500);await page.evaluate(()=>localStorage.clear());await page.reload();await wait(500);
await page.evaluate(()=>{const S=window.MAQ.state;S.lines=[
  {id:'L1',name:'Rue Principale',dn:150,bar:12,pts:[[0,0],[420,0]],specials:[{id:'R1',type:'reducer',m:135,dn2:125}],parent:null},
  {id:'L2',name:'Antenne A',dn:65,bar:12,pts:[[120,0],[120,90]],specials:[],parent:{line:'L1',m:120,side:1}},
  {id:'L3',name:'Antenne B',dn:80,bar:12,pts:[[260,0],[260,70]],specials:[],parent:{line:'L1',m:260,side:1}}];S.seq=4;window.MAQ.setMode('select');window.MAQ.rebuild();});
await page.click('#bSave');await wait(200);await page.fill('#svName','Éléments test');await page.click('#svOk');await wait(800);
await page.click('#svGo');await wait(1500);await page.selectOption('#roleSel','ethan');await wait(300);
const siteId=await page.evaluate(()=>window.TRACE.state.siteId);
let o=await page.evaluate(()=>{const T=window.TRACE;const M=T.ts.marche();return {lines:M.lines.map(x=>[x.id,x.dn,x.c.ml,x.c.soud,(x.pcs||[]).length,!!x.wk,x.parent||null]),els:T.mod.elements().length};});
console.log('c0) marché :',J(o));const c0=o.lines.length===3&&o.els===0&&o.lines.every(x=>x[5]);
/* ── version 2 */
await page.goto(BASE+'/traceur.html?site='+encodeURIComponent(siteId));await wait(1500);
await page.evaluate(()=>{const S=window.MAQ.state;S.lines=S.lines.filter(l=>l.id!=='L2');const f=S.lines.find(l=>l.id==='L1');f.specials=[{id:'R1',type:'reducer',m:275,dn2:125}];const b=S.lines.find(l=>l.id==='L3');b.dn=100;b.pts=[[260,0],[260,70],[260,90],[120,90]];b.specials=[{id:'T2',type:'tee',m:70,dnb:80}];window.MAQ.rebuild();});
await page.click('#bSave');await wait(200);await page.selectOption('#svMode','update');await page.click('#svOk');await wait(800);
await page.click('#svGo');await wait(1500);await page.selectOption('#roleSel','ethan');await wait(300);
const dump=()=>page.evaluate(()=>{const T=window.TRACE;const E=T.mod.elements();const D=T.ts.diff();const sum=k=>+E.reduce((s,e)=>s+e.s*(+(e.q||{})[k]||0),0).toFixed(1);return {n:E.length,els:E.map(e=>({id:e.id,s:e.s,kind:e.kind,k:e.k,dn:e.dn,dn2:e.dn2,n:e.n,q:e.q,v:e.v,seen:!!e.seenAt,with:(e.with||[]).length,path:!!(e.path&&e.path.length),at:(e.at||[]).length,lab:e.lab})),sum:{ml:sum('ml'),soud:sum('soud'),coudes:sum('coudes'),tes:sum('tes'),reduc:sum('reduc'),bouchons:sum('bouchons')},d:{ml:D.tot.d.ml,soud:D.tot.d.soud,coudes:D.tot.d.coudes,tes:D.tot.d.tes,reduc:D.tot.d.reduc,bouchons:D.tot.d.bouchons},free:T.mod.free().length};});
o=await dump();console.log('c1) éléments :',J({n:o.n,sum:o.sum,d:o.d,free:o.free}));o.els.forEach(e=>console.log('    ',e.s>0?'+':'−',e.kind,e.k||'',e.dn,e.dn2||'',J(e.q),'v'+e.v,e.lab.slice(0,70)));
const has=(f)=>o.els.some(f);const E=o.els;
C.c1=o.n>=12&&has(e=>e.s<0&&e.k==='tee'&&e.dn===150&&e.dn2===65)&&has(e=>e.s<0&&e.kind==='tube'&&e.dn===65&&Math.abs(e.q.ml-90)<=1)&&has(e=>e.s<0&&e.k==='endcap'&&e.dn===65)
  &&has(e=>e.s<0&&e.k==='reducer'&&/135/.test(e.lab))&&has(e=>e.s>0&&e.k==='reducer'&&/27[0-9]/.test(e.lab))&&has(e=>e.s<0&&e.kind==='tube'&&e.dn===125&&e.q.ml>=120&&e.q.ml<=145)&&has(e=>e.s>0&&e.kind==='tube'&&e.dn===150&&e.q.ml>=120&&e.q.ml<=145&&/DN 125 → 150/.test(e.lab))
  &&has(e=>e.s<0&&e.kind==='tube'&&e.dn===80&&Math.abs(e.q.ml-70)<=1.5)&&has(e=>e.s>0&&e.kind==='tube'&&e.dn===100&&Math.abs(e.q.ml-70)<=1.5&&/DN 80 → 100/.test(e.lab))&&has(e=>e.s>0&&e.kind==='tube'&&e.dn===100&&e.q.ml>=155&&e.q.ml<=165&&/prolongement/.test(e.lab))
  &&has(e=>e.s>0&&e.k==='bend'&&e.dn===100)&&has(e=>e.s>0&&e.k==='tee'&&e.dn===100&&e.dn2===80)&&has(e=>e.s<0&&e.k==='endcap'&&e.dn===80&&/remplacé/.test(e.lab))&&has(e=>e.s>0&&e.k==='endcap'&&e.dn===100)&&has(e=>e.s<0&&e.k==='tee'&&e.dn===125&&e.dn2===80&&/remplacé/.test(e.lab))&&has(e=>e.s>0&&e.k==='tee'&&e.dn===150&&e.dn2===100&&/remplace/.test(e.lab)) /* au marché le feeder est en DN 125 au té B (réduction au PK 135) */
  &&Math.abs(o.sum.ml-o.d.ml)<=1&&o.sum.soud===o.d.soud&&o.sum.coudes===o.d.coudes&&o.sum.tes===o.d.tes&&o.sum.reduc===o.d.reduc&&o.sum.bouchons===o.d.bouchons&&o.free===o.n&&E.every(e=>e.seen&&e.path||e.at)&&E.filter(e=>e.kind==='tube'&&e.dn===150&&e.s>0)[0].with>0;
if(!C.c1)console.log('   c1 détail :',J({tee65:has(e=>e.s<0&&e.k==='tee'&&e.dn2===65),sum:o.sum,d:o.d}));
/* ── version 3 (vanne) + terrain (extrusion) */
await page.goto(BASE+'/traceur.html?site='+encodeURIComponent(siteId));await wait(1500);
await page.evaluate(()=>{const S=window.MAQ.state;const f=S.lines.find(l=>l.id==='L1');f.specials.push({id:'V1',type:'valve',m:70});window.MAQ.rebuild();});
await page.click('#bSave');await wait(200);await page.selectOption('#svMode','update');await page.click('#svOk');await wait(800);
await page.click('#svGo');await wait(1500);await page.selectOption('#roleSel','ethan');await wait(300);
await page.evaluate(()=>{const T=window.TRACE;const l=T.lines.L1;const cd=l.cond.A;const j=cd.joints.find(x=>{const e=cd.els[x.idx];return e&&e.m1>300&&e.m1<330;});j.extru={cause:'angle',by:'test',at:new Date().toISOString()};T.renderAll();});await wait(300);
o=await dump();const v2=E.filter(e=>e.v===2).length;const vanne=o.els.find(e=>e.k==='valve'),extru=o.els.find(e=>e.kind==='extru');const nEls=o.n;console.log('c2) versions :',J({n:o.n,v:o.els.map(e=>e.v),free:o.free,sum:o.sum,d:o.d,vanne:vanne&&vanne.q,adj:o.els.filter(e=>e.kind==='adj').map(e=>e.lab)}));
C.c2=!!vanne&&vanne.v===3&&vanne.s>0&&vanne.dn===150&&vanne.q.vannes===2&&!!extru&&extru.v===3&&extru.q.extru===1 /* l'extrusion arrive après la version 3 sans nouvel enregistrement du traceur : version 3 */&&o.els.filter(e=>e.v===2).length>=12&&o.sum.soud===o.d.soud;
await page.evaluate(()=>{const T=window.TRACE;T.state.tab='ts';T.renderAll();});await wait(400);
await page.evaluate(()=>{const b=document.querySelector('#tsview [data-mod="adv"]');if(b&&!document.querySelector('#tsview .mdAdv'))b.click();});await wait(300); /* 31/10 (lot MD) : l'ancien mode « attribuer par éléments » est replié dans « Avancé » (par défaut tout est compris) */
o=await page.evaluate(()=>{const v=document.getElementById('tsview');const sp=s=>String(s||'').replace(/\s+/g,' ').trim();return {chips:[...v.querySelectorAll('.mdVers .chip')].map(x=>sp(x.textContent)),todo:sp((v.querySelector('h4.mdH')||{}).textContent),grp:[...v.querySelectorAll('.mdGrp')].map(x=>sp(x.textContent)),rows:v.querySelectorAll('.mdRow').length,start:!!v.querySelector('[data-mod="start"]'),old:!!v.querySelector('.tsCard, [data-tsmap], [data-tsgrp]'),badge:(document.querySelector('#tabbar [data-tab=ts] .tsBadge')||{}).textContent};});
await shot('2_onglet');console.log('c2) onglet :',J(o));console.log('   c2 parts :',J({a:!!vanne&&vanne.v===3&&vanne.s>0&&vanne.dn===150&&vanne.q.vannes===2,b:!!extru&&extru.v===3&&extru.q.extru===1,c:o.chips.length>=2&&/Version 2/.test(o.chips[0])&&/Version 3/.test(o.chips[1]),d:/À attribuer/.test(o.todo)&&o.grp.length===2&&/Tout prendre/.test(o.grp[0]),e:o.rows,f:o.start&&!o.old,g:+o.badge}));
C.c2=C.c2&&o.chips.length>=2&&/Version 2/.test(o.chips[0])&&/Version 3/.test(o.chips[1])&&/Non rangés dans une modif|À attribuer/.test(o.todo)&&o.grp.length===2&&/Tout prendre/.test(o.grp[0])&&o.rows===nEls&&o.start&&!o.old&&!o.badge; /* 31/10 (lot MD) : plus de pastille « à attribuer » sur l'onglet */
/* ── c3) Tout prendre la version 2 → panneau */
await page.evaluate(()=>document.querySelector('#tsview [data-mod^="takev:2"]').click());await wait(600);
o=await page.evaluate(()=>{const T=window.TRACE;const M=T.mod.state();const P=document.getElementById('modPanel');const B=document.getElementById('modBar');const sp=s=>String(s||'').replace(/\s+/g,' ').trim();return {tab:T.state.tab,on:M.on,sel:M.sel.length,panel:!!P&&P.style.display!=='none',bar:!!B&&B.style.display!=='none',cols:[...P.querySelectorAll('.mdCols h4')].map(x=>sp(x.textContent)),items:P.querySelectorAll('.mdIt').length,lect:sp((P.querySelector('.mdLect')||{}).textContent),rows:[...P.querySelectorAll('table.mdCmp tr')].slice(1).map(r=>{const td=[...r.cells];return sp(td[0].querySelector('b').textContent)+'|'+sp(td[1].textContent)+'|'+sp(td[2].textContent)+'|'+sp(td[3].textContent);}),sugg:P.querySelectorAll('.mdSugg button').length,ov:document.getElementById('tsG').querySelectorAll('[data-mod-el]').length,sw:document.documentElement.scrollWidth};});
await shot('3_panneau');console.log('c3) panneau :',J({tab:o.tab,on:o.on,sel:o.sel,panel:o.panel,bar:o.bar,cols:o.cols,items:o.items,lect:o.lect,sugg:o.sugg,ov:o.ov,sw:o.sw}));o.rows.forEach(r=>console.log('     ',r));
const row=k=>o.rows.find(r=>r.startsWith(k+'|'))||'';console.log('   c3 parts :',J({a:o.tab==='plan'&&o.on&&o.sel===v2&&o.panel&&o.bar&&o.items===v2,lect:/1[2-4][0-9](,\d)? m passent du DN 125 au DN 150/.test(o.lect)&&/70(,\d)? m passent du DN 80 au DN 100/.test(o.lect)&&/Réductions DN 150 : déplacement, même nombre/.test(o.lect),r150:/^Linéaire DN 150\|·\|1[2-4][0-9]/.test(row('Linéaire DN 150')),r125:/^Linéaire DN 125\|1[2-4][0-9]/.test(row('Linéaire DN 125')),r100:/^Linéaire DN 100\|·\|2[23][0-9]/.test(row('Linéaire DN 100')),r80:/^Linéaire DN 80\|70/.test(row('Linéaire DN 80')),r65:/^Linéaire DN 65\|90/.test(row('Linéaire DN 65')),red:/^Réductions DN 150\|2\|2\|0 \(déplacé\)/.test(row('Réductions DN 150')),f65:/^Fins de ligne DN 65\|2\|·\|−2/.test(row('Fins de ligne DN 65')),t100:/^Tés DN 100\|·\|2\|\+2/.test(row('Tés DN 100')),t150:/^Tés DN 150\|2\|2\|0 \(déplacé\)/.test(row('Tés DN 150')),t125:/^Tés DN 125\|2\|·\|−2/.test(row('Tés DN 125')),f80:/^Fins de ligne DN 80\|2\|·\|−2/.test(row('Fins de ligne DN 80')),f100:/^Fins de ligne DN 100\|·\|2\|\+2/.test(row('Fins de ligne DN 100')),sugg:o.sugg,ov:o.ov>=o.sel,sw:o.sw<=1366}));
C.c3=o.tab==='plan'&&o.on&&o.sel===v2&&o.panel&&o.bar&&o.items===v2&&/1[2-4][0-9](,\d)? m passent du DN 125 au DN 150/.test(o.lect)&&/70(,\d)? m passent du DN 80 au DN 100/.test(o.lect)&&/Réductions DN 150 : déplacement, même nombre/.test(o.lect)
  &&/^Linéaire DN 150\|·\|1[2-4][0-9]/.test(row('Linéaire DN 150'))&&/^Linéaire DN 125\|1[2-4][0-9]/.test(row('Linéaire DN 125'))&&/^Linéaire DN 100\|·\|2[23][0-9]/.test(row('Linéaire DN 100'))&&/^Linéaire DN 80\|70/.test(row('Linéaire DN 80'))&&/^Linéaire DN 65\|90/.test(row('Linéaire DN 65'))
  &&/^Réductions DN 150\|2\|2\|0 \(déplacé\)/.test(row('Réductions DN 150'))&&/^Fins de ligne DN 65\|2\|·\|−2/.test(row('Fins de ligne DN 65'))&&/^Tés DN 100\|·\|2\|\+2/.test(row('Tés DN 100'))&&/^Tés DN 150\|2\|2\|0 \(déplacé\)/.test(row('Tés DN 150'))&&/^Tés DN 125\|2\|·\|−2/.test(row('Tés DN 125'))&&/^Fins de ligne DN 80\|2\|·\|−2/.test(row('Fins de ligne DN 80'))&&/^Fins de ligne DN 100\|·\|2\|\+2/.test(row('Fins de ligne DN 100'))&&o.sugg===0&&o.ov>=o.sel&&o.sw<=1366;
/* ── c4) qualifier ligne par ligne → modif n°1 */
await page.evaluate(()=>document.querySelector('#modPanel [data-mod="qall:propose"]').click());await wait(150);
for(let i=0;i<8;i++){const ok=await page.evaluate(()=>{const b=[...document.querySelectorAll('#modPanel [data-mod^="q:soud|"]')].find(b=>/:forfait$/.test(b.dataset.mod)&&!b.classList.contains('on'));if(b){b.click();return true;}return false;});if(!ok)break;await wait(80);}
await page.evaluate(()=>{const r=document.querySelector('#modPanel [data-mod="q:reduc|150:note"]');if(r)r.click();});await wait(150);
await page.evaluate(()=>{document.getElementById('modNom').value='Suppression antenne A, bâtiment A repris par l\'antenne B';document.getElementById('modDev').value='DEV-2026-046';});
await shot('4_qualifie');await page.evaluate(()=>document.querySelector('#modPanel [data-mod="create"]').click());await wait(500);
o=await page.evaluate(()=>{const T=window.TRACE;const Mo=T.mod.of();const m=Mo.items[0];const sp=s=>String(s||'').replace(/\s+/g,' ').trim();const B=document.getElementById('modBar');return {n:Mo.items.length,m:m?{n:m.n,nom:m.nom,devis:m.devis,els:m.els.length,q:m.q,at:!!m.at,by:m.by,v:m.v,log:(m.log||[]).length}:null,free:T.mod.free().length,sel:T.mod.state().sel.length,note:sp((B.querySelector('.mbNote')||{}).textContent),badges:(document.getElementById('tsG').innerHTML.match(/n°1/g)||[]).length,seen:Object.keys(Mo.seen).length};});
console.log('c4) modif :',J(o));
const qv=Object.values(o.m?o.m.q:{});
C.c4=o.n===1&&!!o.m&&o.m.n===1&&o.m.els===v2&&o.m.devis==='DEV-2026-046'&&o.m.by&&o.m.at&&qv.length>=10&&qv.filter(x=>x==='propose').length>=7&&Object.entries(o.m.q).filter(([k])=>k.startsWith('soud|')).every(([,v])=>v==='forfait')&&o.m.q['reduc|150']==='note'&&o.free===2&&o.sel===0&&/n°1/.test(o.note)&&o.badges>=3&&o.seen>=o.m.els;
await page.evaluate(()=>{const T=window.TRACE;T.state.tab='ts';T.renderAll();});await wait(300);
o=await page.evaluate(()=>{const v=document.getElementById('tsview');const sp=s=>String(s||'').replace(/\s+/g,' ').trim();const c=v.querySelector('.mdCard');return {card:!!c,hd:sp((c&&c.querySelector('.mdHd')||{}).textContent),meta:sp((c&&c.querySelector('.mdMeta')||{}).textContent),chips:[...(c?c.querySelectorAll('.mdChip'):[])].map(x=>sp(x.textContent)),recap:sp((v.querySelector('.mdRecap')||{}).textContent),todo:sp((v.querySelector('h4.mdH')||{}).textContent)};});
await shot('4_carte');console.log('c4) carte :',J(o));
C.c4=C.c4&&o.card&&/n°1/.test(o.hd)&&/Suppression antenne A/.test(o.hd)&&/DEV-2026-046/.test(o.hd)&&/créée le/.test(o.meta)&&/Version 3/.test(o.meta)&&o.chips.includes('TS proposé')&&o.chips.includes('Compris')&&o.chips.includes('Pour mémoire')&&/TS proposé/.test(o.recap)&&!/À attribuer/.test(o.recap)&&/(Non rangés dans une modif|À attribuer).*2/.test(o.todo); /* 31/10 (lot MD) : le récap n'a plus de colonne « à attribuer » (ce qui n'est pas rangé est compris) */
await page.evaluate(()=>window.TRACE.mod.end());await wait(300);
/* ── c5) gestes sur le plan : toucher la vanne, entourer l'extrusion */
await page.evaluate(()=>{window.TRACE.mod.start({});});await wait(400);
o=await page.evaluate(()=>{const T=window.TRACE;const E=T.mod.elements();const v=E.find(e=>e.k==='valve');const p=v.at[0];const hit=T.mod.hit(p[0],p[1]);T.mod.tap(p[0],p[1]);const x=E.find(e=>e.kind==='extru');const q=x.at[0];const n=T.mod.lasso([[q[0]-3,q[1]-3],[q[0]+3,q[1]-3],[q[0]+3,q[1]+3],[q[0]-3,q[1]+3]]);return {hit:hit&&hit.id===v.id,sel:T.mod.state().sel.length,n};});
console.log('c5) gestes :',J(o));const c5a=o.hit&&o.sel===2&&o.n===1;
await page.evaluate(()=>{document.querySelector('#modPanel [data-mod="qall:forfait"]').click();document.getElementById('modNom').value='Vanne de sectionnement + extrusion';});await wait(100);
await page.evaluate(()=>document.querySelector('#modPanel [data-mod="create"]').click());await wait(400);
o=await page.evaluate(()=>{const T=window.TRACE;const Mo=T.mod.of();return {n:Mo.items.length,m2:Mo.items[1]?{n:Mo.items[1].n,els:Mo.items[1].els.length,devis:Mo.items[1].devis,q:Mo.items[1].q}:null,free:T.mod.free().length};});
console.log('c5) modif 2 :',J(o));C.c5=c5a&&o.n===2&&!!o.m2&&o.m2.n===2&&o.m2.els===2&&o.m2.devis===''&&Object.values(o.m2.q).every(x=>x==='forfait')&&o.free===0;
await page.evaluate(()=>window.TRACE.mod.end());await wait(300);
/* ── c6) modifier n°1 (pré-rempli), retirer un élément ; supprimer n°2 */
await page.evaluate(()=>{const T=window.TRACE;T.state.tab='ts';T.renderAll();});await wait(300);
await page.evaluate(()=>document.querySelector('#tsview [data-mod^="edit:"]').click());await wait(500);
o=await page.evaluate(()=>{const T=window.TRACE;const M=T.mod.state();const P=document.getElementById('modPanel');return {edit:M.edit,sel:M.sel.length,qual:Object.keys(M.qual).length,nom:(P.querySelector('#modNom')||{}).value,dev:(P.querySelector('#modDev')||{}).value,btn:(P.querySelector('[data-mod="create"]')||{}).textContent};});
console.log('c6) modifier :',J(o));const c6a=!!o.edit&&o.sel===v2&&o.qual>=10&&/Suppression antenne A/.test(o.nom)&&o.dev==='DEV-2026-046'&&/Enregistrer la modif n°1/.test(o.btn);
await page.evaluate(()=>{const T=window.TRACE;const id=T.mod.elements().find(e=>e.k==='bend').id;document.querySelector(`#modPanel [data-mod="rm:${id}"]`).click();});await wait(200);
await page.evaluate(()=>document.querySelector('#modPanel [data-mod="create"]').click());await wait(400);
o=await page.evaluate(()=>{const T=window.TRACE;const Mo=T.mod.of();const m=Mo.items.find(x=>x.n===1);return {els:m.els.length,log:(m.log||[]).map(x=>x.txt),free:T.mod.free().map(e=>e.k),edit:T.mod.state().edit};});
console.log('c6) après retrait :',J(o));const c6b=o.els===v2-1&&o.log.some(t=>/modifiée/.test(t))&&o.free.length===1&&o.free[0]==='bend'&&!o.edit;
await page.evaluate(()=>window.TRACE.mod.end());await wait(300);
await page.evaluate(()=>{const T=window.TRACE;T.state.tab='ts';T.renderAll();});await wait(200);
await page.evaluate(()=>{const b=[...document.querySelectorAll('#tsview [data-mod^="del:"]')].pop();b.click();});await wait(200);
o=await page.evaluate(()=>({confirm:[...document.querySelectorAll('#tsview [data-mod^="del:"]')].some(b=>/Confirmer/.test(b.textContent))}));
await page.evaluate(()=>{const b=[...document.querySelectorAll('#tsview [data-mod^="del:"]')].find(b=>/Confirmer/.test(b.textContent));b.click();});await wait(300);
const o6=await page.evaluate(()=>{const T=window.TRACE;return {n:T.mod.of().items.length,free:T.mod.free().length};});
console.log('c6) suppression :',J({confirm:o.confirm,after:o6}));C.c6=c6a&&c6b&&o.confirm&&o6.n===1&&o6.free===3;
/* ── c7) export + fiche d'une pièce */
o=await page.evaluate(()=>{const T=window.TRACE;const h=T.mod.exportHTML();const d=T.doe.tsHTML();return {len:h.length,same:h===d,mod:/n°1/.test(h)&&/Suppression antenne A/.test(h)&&/DEV-2026-046/.test(h),recap:/Récap par qualification/.test(h),free:!/attribuer/i.test(h) /* 31/10 (lot MD) : plus de rubrique « à attribuer » */,svg:(h.match(/<svg/g)||[]).length,ts:/TS proposé/.test(h)&&/Compris/.test(h)&&/Pour mémoire/.test(h)};});
console.log('c7) export :',J(o));const c7a=o.len>5000&&o.same&&o.mod&&o.recap&&o.free&&o.svg>=2&&o.ts;
o=await page.evaluate(()=>{const T=window.TRACE;const l=T.lines.L3;const i=l.cond.A.els.findIndex(e=>e.kind==='tee');T.state.tab='plan';T.renderAll();T.openEl('L3','A',i);const sh=document.getElementById('sheet');const sp=s=>String(s||'').replace(/\s+/g,' ').trim();const box=sh.querySelector('.infobox');return {txt:sp(box&&box.textContent),btn:!!sh.querySelector('[data-mod^="dcl-here:"]')};}); /* 31/10 (lot MD) : « Déclarer une modif ici » remplace « Attribuer sur le plan » */
console.log('c7) fiche :',J(o));C.c7=c7a&&/Modifications/.test(o.txt)&&/té DN 100\/80/i.test(o.txt)&&/modif n°1/.test(o.txt)&&o.btn;
await page.evaluate(()=>window.TRACE.closeSheet());
/* ── c8) téléphone 390 */
const ph=await browser.newContext({viewport:{width:390,height:844},deviceScaleFactor:2,isMobile:true,hasTouch:true});const p2=await ph.newPage();p2.on('pageerror',e=>logs.push('PAGEERROR(390): '+e.message.slice(0,300)));
await p2.goto(BASE+'/');await p2.waitForTimeout(400);await p2.evaluate(()=>localStorage.clear());
const dumpLS=await page.evaluate(()=>{const o={};for(let i=0;i<localStorage.length;i++){const k=localStorage.key(i);o[k]=localStorage.getItem(k);}return o;});
await p2.evaluate(d=>{Object.entries(d).forEach(([k,v])=>localStorage.setItem(k,v));},dumpLS);await p2.goto(BASE+'/?site='+encodeURIComponent(siteId));await p2.waitForTimeout(1800);
await p2.evaluate(async id=>{const T=window.TRACE;if(T.state.siteId!==id)await T.go(id);},siteId);await p2.waitForTimeout(800);
await p2.evaluate(()=>{const s=document.getElementById('roleSel');if(s){s.value='ethan';s.dispatchEvent(new Event('change',{bubbles:true}));}});await p2.waitForTimeout(300);
await p2.evaluate(()=>{const T=window.TRACE;T.mod.start({sel:T.mod.free().map(e=>e.id)});});await p2.waitForTimeout(500);
o=await p2.evaluate(()=>{const B=document.getElementById('modBar');const P=document.getElementById('modPanel');const r=B.getBoundingClientRect();return {bar:{l:Math.round(r.left),r:Math.round(r.right),h:Math.round(r.height)},panel:P&&P.style.display!=='none',go:!!B.querySelector('[data-mod="panel"]'),sw:document.documentElement.scrollWidth};});
if(SHOTS)await p2.screenshot({path:`${SHOTS}/mod_8_tel_barre.png`});console.log('c8) barre 390 :',J(o));const c8a=o.bar.l>=0&&o.bar.r<=390&&!o.panel&&o.go&&o.sw<=392;
await p2.evaluate(()=>document.querySelector('#modBar [data-mod="panel"]').click());await p2.waitForTimeout(400);
o=await p2.evaluate(()=>{const P=document.getElementById('modPanel');const r=P.getBoundingClientRect();return {panel:P.style.display!=='none',w:Math.round(r.width),items:P.querySelectorAll('.mdIt').length,rows:P.querySelectorAll('table.mdCmp tr').length-1,back:!!P.querySelector('[data-mod="panelclose"]'),sw:document.documentElement.scrollWidth,psw:P.scrollWidth<=P.clientWidth+1};});
if(SHOTS)await p2.screenshot({path:`${SHOTS}/mod_8_tel_panneau.png`});console.log('c8) panneau 390 :',J(o));C.c8=c8a&&o.panel&&o.w===390&&o.items>=3&&o.rows>=3&&o.back&&o.sw<=392&&o.psw;await ph.close();
C.c9=logs.length===0;if(logs.length)console.log('console :',logs.slice(0,8));
console.log('RÉSULTATS',J(C));console.log('RESULTAT:',Object.values(C).every(Boolean)?'TOUT VERT':'KO '+Object.keys(C).filter(k=>!C[k]).join(' '));await browser.close();process.exit(Object.values(C).every(Boolean)?0:1);
