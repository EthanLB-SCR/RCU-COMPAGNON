// 28/10 (lot 2810h) — « ✍ QUALIFIER SUR LE PLAN » (Ethan : « oublie les pastilles automatiques… une ligne à une pastille qui fait toute la ligne alors que sur la même ligne
// je peux avoir une modif TS et l'autre comprise ; sur le plan d'ensemble, sélectionner un ou des tronçons comme les phases, entourer ; choisir si c'est le changement de DN, la
// modif de tracé ; souple mais très clair »). Réseau FICTIF du traceur : L1 DN 150 (480 m, vanne PK 20, réduction 150 → 100 PK 300), L2 DN 80 (60 m).
// Retracé : réduction avancée au PK 250 (50 m passent du DN 150 au DN 100), bosse de 40 m sur la fin de L1 (+80 ml, +8 coudes), vanne ajoutée PK 100, L2 prolongée de 20 m.
//  c1  onglet Modifs → « ✍ Qualifier sur le plan » : plan d'ensemble, barre, plus de pastilles « ? », marché visible
//  c2  tronçon L1 PK 200 → bout : la fenêtre sépare TRACÉ (+80 ml, +8 coudes) · DN (50 ml DN 150 → 100) · SOUDURES ; DN en TS proposé, tracé + soudures compris
//      → 2 marques (DN TS DEV-S1 ; tracé + soudures compris) ; à qualifier : la vanne et L2 seulement ; les comptes de la ligne tombent juste (marques + reste = écart)
//  c3  ⭕ entourer la vanne + ▬ L2 entière, « Tout : compris » → un groupe de 2 (une modif pour le client), plus rien à qualifier
//  c4  requalifier depuis une carte (« ✍ Sur le plan ») : la fenêtre reprend ce qui était qualifié (pré-rempli), soudures passées en TS commandé → remplacées, rien de compté deux fois
//  c5  modif sur la modif (bosse réduite à 20 m) : tracé + soudures « dépassés », le DN reste juste ; « ↻ » recalcule en gardant la qualification
//  c6  geste réel : ⭕ entourer à la souris sur le plan → un tronçon ; 2 doigts / glisser hors mode inchangés · c7 téléphone 390 · c8 « Modifs sur le plan » (pastilles) toujours là · c9 console
import { chromium } from 'playwright';
const BASE=process.env.BASE||'http://localhost:8765';const SHOTS=process.env.SHOTS||null;
const browser=await chromium.launch({headless:true, executablePath: process.env.CHROMIUM_PATH||undefined});
const C={};const logs=[];
const ctx=await browser.newContext({viewport:{width:1366,height:900},deviceScaleFactor:1});const page=await ctx.newPage();
page.on('pageerror',e=>logs.push('PAGEERROR: '+e.message.slice(0,300)));page.on('console',m=>{if(m.type()==='error'&&!/supabase|Failed to fetch|net::ERR|404|geopf|WebSocket/i.test(m.text()))logs.push(m.text().slice(0,200));});page.on('dialog',d=>d.accept().catch(()=>{}));
const shot=async n=>{if(SHOTS)await page.screenshot({path:`${SHOTS}/tssel_${n}.png`});};
const wait=ms=>page.waitForTimeout(ms);
await page.goto(BASE+'/traceur.html');await wait(500);await page.evaluate(()=>localStorage.clear());await page.reload();await wait(500);
await page.evaluate(()=>{const S=window.MAQ.state;S.lines=[{id:'L1',name:'Rue Fictive',dn:150,bar:12,pts:[[0,0],[150,0],[150,80],[400,80]],specials:[{id:'v1',type:'valve',m:20},{id:'R1',type:'reducer',m:300,dn2:100}],parent:null},{id:'L2',name:'Impasse Fictive',dn:80,bar:12,pts:[[0,200],[60,200]],specials:[],parent:null}];S.seq=3;window.MAQ.setMode('select');window.MAQ.rebuild();});
await page.click('#bSave');await wait(200);await page.fill('#svName','Sélection test');await page.click('#svOk');await wait(800);
await page.click('#svGo');await wait(1500);await page.selectOption('#roleSel','ethan');await wait(300);
const siteId=await page.evaluate(()=>window.TRACE.state.siteId);
let o=await page.evaluate(()=>{const T=window.TRACE;const M=T.ts.marche();return {wk:!!(M&&M.lines.every(x=>x.wk&&x.wk.A&&x.wk.A.length)),dnp:!!(M&&M.lines.find(x=>x.id==='L1').dnp),cands:T.ts.candidates().length};});
console.log('c0) marché figé :',JSON.stringify(o));const c0=o.wk&&o.dnp&&o.cands===0;
await page.goto(BASE+'/traceur.html?site='+encodeURIComponent(siteId));await wait(1500);
await page.evaluate(()=>{const S=window.MAQ.state;const l=S.lines.find(x=>x.id==='L1');l.pts=[[0,0],[150,0],[150,80],[330,80],[330,120],[370,120],[370,80],[400,80]];l.specials=l.specials.map(sp=>sp.id==='R1'?Object.assign({},sp,{m:250}):sp);l.specials.push({id:'v3',type:'valve',m:100});const l2=S.lines.find(x=>x.id==='L2');l2.pts=[[0,200],[80,200]];window.MAQ.rebuild();});
await page.click('#bSave');await wait(200);await page.selectOption('#svMode','update');await page.click('#svOk');await wait(800);
await page.click('#svGo');await wait(1500);await page.selectOption('#roleSel','ethan');await wait(300);
await page.evaluate(()=>{const T=window.TRACE;T.state.tab='ts';T.renderAll();});await wait(400);
const lineSum=()=>page.evaluate(()=>{const T=window.TRACE;const D=T.ts.diff();const out={};['L1','L2'].forEach(id=>{const r=D.rows.find(x=>x.id===id);const its=T.ts.of().items.filter(x=>x.line===id&&(T.ts.live(x)||x.etat==='grouped')&&x.kind!=='group');const cs=T.ts.candidates().filter(c=>c.line===id);const s={};['ml','coudes','vannes','soud','reduc'].forEach(k=>{s[k]=+((its.reduce((a,x)=>a+(+(x.qty||{})[k]||0),0)+cs.reduce((a,c)=>a+(+(c.qty||{})[k]||0),0))).toFixed(1);});out[id]={d:{ml:r.d.ml,coudes:r.d.coudes,vannes:r.d.vannes,soud:r.d.soud,reduc:r.d.reduc||0},s};});return out;});
const sumOk=S=>Object.values(S).every(x=>['ml','coudes','vannes','soud','reduc'].every(k=>Math.abs((+x.d[k]||0)-(+x.s[k]||0))<=(k==='ml'?0.6:0)));
o=await page.evaluate(()=>{const T=window.TRACE;return {cands:T.ts.candidates().map(c=>c.kind+'|'+c.line+'|'+c.label),btn:(document.querySelector('#tsview [data-tsrange]')||{}).textContent||''};});
console.log('c1) avant :',JSON.stringify(o));const c1a=/Qualifier sur le plan/.test(o.btn)&&o.cands.length>=3;
// ── c1) entrée par l'onglet Modifs
await page.click('#tsview [data-tsrange]');await wait(500);
o=await page.evaluate(()=>{const T=window.TRACE;const bar=document.getElementById('tsSelBar');const g=document.getElementById('tsG');return {tab:T.state.tab,on:T.ts.sel.state().on,bar:!!bar&&bar.style.display!=='none'&&bar.getBoundingClientRect().height>60,tools:bar?[...bar.querySelectorAll('[data-tsb="tool"]')].map(b=>b.textContent.trim()):[],q:g?(g.innerHTML.match(/à qualifier ·/g)||[]).length:-1,marche:(document.getElementById('marG')||{}).innerHTML.length>50,go:bar?bar.querySelector('[data-tsb="go"]').disabled:null};});
await shot('1_mode');console.log('c1) mode :',JSON.stringify(o));
C.c1=c0&&c1a&&o.tab==='plan'&&o.on&&o.bar&&o.tools.length===3&&/Tronçon/.test(o.tools[0])&&/Ligne entière/.test(o.tools[1])&&/Entourer/.test(o.tools[2])&&o.q===0&&o.marche&&o.go===true;
// ── c2) tronçon L1 PK 200 → bout, DN en TS, tracé + soudures compris
await page.evaluate(()=>{const S=window.TRACE.ts.sel;S.tap(150,50);S.tap(400,80);});await wait(300);
o=await page.evaluate(()=>({tr:window.TRACE.ts.sel.state().tr,chips:[...document.querySelectorAll('#tsSelBar .tsbChip')].map(c=>c.textContent.replace(/\s+/g,' ').trim())}));
console.log('c2) sélection :',JSON.stringify(o));const c2a=o.tr.length===1&&o.tr[0].line==='L1'&&Math.abs(o.tr[0].m0-200)<1&&o.tr[0].m1>=559&&o.chips.length===1;
await page.click('#tsSelBar [data-tsb="go"]');await wait(400);
o=await page.evaluate(()=>{const P=document.getElementById('tssPanel');const rows={};P.querySelectorAll('[data-tsrow]').forEach(r=>{rows[r.dataset.tsrow]=r.querySelector('.tssQ').textContent;});return {rows,no:(P.querySelector('.tssNo')||{}).textContent||'',ok:P.querySelector('#tssOk').disabled};});
await shot('2_fenetre');console.log('c2) fenêtre :',JSON.stringify(o));
const c2b=!!o.rows.trace&&/\+80 ml/.test(o.rows.trace)&&/\+8 coudes/.test(o.rows.trace)&&!!o.rows.dn&&/passent du DN 150 au DN 100/.test(o.rows.dn)&&/50 ml/.test(o.rows.dn)&&!!o.rows.soud&&/\+\d+ soudures/.test(o.rows.soud)&&!o.rows.pcs&&/pièces/.test(o.no)&&o.ok===true;
await page.click('#tssPanel [data-tspe="dn:propose"]');await page.click('#tssPanel [data-tspe="trace:forfait"]');await page.click('#tssPanel [data-tspe="soud:forfait"]');await wait(150);
o=await page.evaluate(()=>({ts:getComputedStyle(document.querySelector('#tssPanel .tssTS')).display,ok:document.querySelector('#tssOk').textContent}));const c2c=o.ts!=='none'&&/3 natures → 2 modifs/.test(o.ok);
await page.fill('#tssDesig','Changement de DN fictif');await page.fill('#tssDevis','DEV-S1');await page.click('#tssOk');await wait(500);
o=await page.evaluate(()=>{const T=window.TRACE;const its=T.ts.of().items.filter(x=>x.kind==='sel');return {its:its.map(x=>({id:x.id,asp:x.aspects,etat:x.etat,ts:x.ts,desig:x.desig,qty:x.qty,dnq:(x.dnq||[]).map(Q=>Q.from+'>'+Q.to+':'+Q.ml),zone:x.zone})),cands:T.ts.candidates().map(c=>c.kind+'|'+c.line+'|'+c.label),note:(document.querySelector('#tsSelBar .tsbNote')||{}).textContent||'',tr:T.ts.sel.state().tr.length};});
await shot('2_qualifie');console.log('c2) marques :',JSON.stringify(o));
let S1=await lineSum();console.log('c2) comptes :',JSON.stringify(S1));
const iDN=o.its.find(x=>x.asp.join()==='dn'),iTR=o.its.find(x=>x.asp.join()==='trace,soud');
C.c2=c2a&&c2b&&c2c&&o.its.length===2&&!!iDN&&iDN.etat==='propose'&&iDN.ts==='DEV-S1'&&iDN.desig==='Changement de DN fictif'&&iDN.dnq.length===1&&/^150>100:50/.test(iDN.dnq[0])
  &&!!iTR&&iTR.etat==='forfait'&&!iTR.ts&&iTR.qty.ml===80&&iTR.qty.coudes===8&&iTR.qty.soud>=8&&o.cands.length===2&&o.cands.some(c=>/^delta\|L1\|PK 100/.test(c)&&/\+2 vannes/.test(c))&&o.cands.some(c=>/\|L2\|/.test(c))&&!o.cands.some(c=>/^dn\|/.test(c)||/reste/.test(c))&&/✓ n°\d+ (TS proposé|Compris) · n°\d+ (TS proposé|Compris)/.test(o.note)&&/TS proposé/.test(o.note)&&/Compris/.test(o.note)&&o.tr===0&&sumOk(S1);
// ── c3) ⭕ entourer la vanne + ▬ L2 entière, tout compris → un groupe
await page.evaluate(()=>{const S=window.TRACE.ts.sel;S.lasso([[85,-12],[115,-12],[115,12],[85,12]]);});await wait(200);
await page.click('#tsSelBar [data-tsb="tool"][data-v="line"]');await wait(100);await page.evaluate(()=>window.TRACE.ts.sel.tap(40,200));await wait(200);
o=await page.evaluate(()=>window.TRACE.ts.sel.state().tr);console.log('c3) sélection :',JSON.stringify(o));const c3a=o.length===2&&o.some(t=>t.line==='L1'&&t.m0>=84&&t.m1<=116)&&o.some(t=>t.line==='L2'&&t.m0===0&&t.m1>=79.9);
await page.click('#tsSelBar [data-tsb="go"]');await wait(400);
o=await page.evaluate(()=>{const P=document.getElementById('tssPanel');const rows={};P.querySelectorAll('[data-tsrow]').forEach(r=>{rows[r.dataset.tsrow]=r.querySelector('.tssQ').textContent;});return rows;});console.log('c3) fenêtre :',JSON.stringify(o));
const c3b=/\+2 vannes DN 150 \(PK 100\)/.test(o.pcs||'')&&/\+20 ml/.test(o.trace||'')&&!o.dn;
await page.click('#tssPanel [data-tspall="forfait"]');await wait(100);await page.click('#tssOk');await wait(500);
o=await page.evaluate(()=>{const T=window.TRACE;const g=T.ts.of().items.filter(x=>x.kind==='group');return {g:g.map(x=>({n:(x.members||[]).length,etat:x.etat,short:x.short})),cands:T.ts.candidates().length,cards:document.querySelectorAll('#tsview .tsCard').length};});
await shot('3_groupe');console.log('c3) groupe :',JSON.stringify(o));S1=await lineSum();console.log('c3) comptes :',JSON.stringify(S1));
C.c3=c3a&&c3b&&o.g.length===1&&o.g[0].n===2&&o.g[0].etat==='forfait'&&/Sélection/.test(o.g[0].short||'')&&o.cands===0&&sumOk(S1);
// ── c4) requalifier depuis la carte (« ✍ Sur le plan ») : pré-rempli, soudures en TS commandé, remplacement
await page.click('#tsSelBar [data-tsb="end"]');await wait(400);
o=await page.evaluate(()=>({tab:window.TRACE.state.tab,on:window.TRACE.ts.sel.state().on}));const c4a=o.tab==='ts'&&!o.on;
await page.evaluate(id=>{document.querySelectorAll('#tsview .tsCard.fold').forEach(c=>c.classList.remove('fold'));const b=document.querySelector(`#tsview [data-tssel="i:${id}"]`);if(b)b.click();},iTR.id);await wait(500);
o=await page.evaluate(()=>({tab:window.TRACE.state.tab,tr:window.TRACE.ts.sel.state().tr}));console.log('c4) présélection :',JSON.stringify(o));const c4b=o.tab==='plan'&&o.tr.length===1&&o.tr[0].line==='L1'&&Math.abs(o.tr[0].m0-200)<1;
await page.click('#tsSelBar [data-tsb="go"]');await wait(400);
o=await page.evaluate(()=>{const P=window.TRACE.ts.sel.panel();const el=document.getElementById('tssPanel');return {choice:P&&P.choice,pre:[...el.querySelectorAll('.tssPre')].map(x=>x.textContent),conf:(el.querySelector('.tssConf')||{}).textContent||'',desig:el.querySelector('#tssDesig').value,devis:el.querySelector('#tssDevis').value};});
await shot('4_prerempli');console.log('c4) pré-rempli :',JSON.stringify(o));
const c4c=o.choice&&o.choice.trace==='forfait'&&o.choice.soud==='forfait'&&o.choice.dn==='propose'&&o.pre.length===3&&/remplacées/.test(o.conf)&&o.devis==='DEV-S1'&&o.desig==='Changement de DN fictif';
await page.click('#tssPanel [data-tspe="soud:commande"]');await wait(100);await page.click('#tssOk');await wait(500);
o=await page.evaluate(id=>{const T=window.TRACE;const its=T.ts.of().items.filter(x=>x.kind==='sel'&&x.line==='L1'&&x.zone.m0>=199);return {old:!!T.ts.of().items.find(x=>x.id===id),its:its.map(x=>({asp:x.aspects.join(),etat:x.etat,ts:x.ts,qty:x.qty})),cands:T.ts.candidates().length};},iTR.id);
console.log('c4) remplacé :',JSON.stringify(o));S1=await lineSum();console.log('c4) comptes :',JSON.stringify(S1));
C.c4=c4a&&c4b&&c4c&&!o.old&&o.its.length===3&&o.its.some(x=>x.asp==='dn'&&x.etat==='propose')&&o.its.some(x=>x.asp==='trace'&&x.etat==='forfait'&&x.qty.ml===80)&&o.its.some(x=>x.asp==='soud'&&x.etat==='commande'&&x.ts==='DEV-S1'&&x.qty.soud>=8)&&o.cands===0&&sumOk(S1);
// ── c5) modif sur la modif : bosse réduite à 20 m → tracé + soudures dépassés, DN juste ; « ↻ » recalcule
await page.click('#tsSelBar [data-tsb="end"]');await wait(300);
await page.goto(BASE+'/traceur.html?site='+encodeURIComponent(siteId));await wait(1500);
await page.evaluate(()=>{const S=window.MAQ.state;const l=S.lines.find(x=>x.id==='L1');l.pts=[[0,0],[150,0],[150,80],[330,80],[330,100],[370,100],[370,80],[400,80]];window.MAQ.rebuild();});
await page.click('#bSave');await wait(200);await page.selectOption('#svMode','update');await page.click('#svOk');await wait(800);
await page.click('#svGo');await wait(1500);await page.selectOption('#roleSel','ethan');await wait(300);
await page.evaluate(()=>{const T=window.TRACE;T.state.tab='ts';T.renderAll();});await wait(400);
o=await page.evaluate(()=>{const T=window.TRACE;const its=T.ts.of().items.filter(x=>x.kind==='sel'&&x.line==='L1'&&x.zone.m0>=199);const el=document.getElementById('tsview');return {its:its.map(x=>({id:x.id,asp:x.aspects.join(),stale:T.ts.stale(x.id)})),section:/Modifs dépassées/.test(el.textContent),btns:el.querySelectorAll('.tsCard.stale [data-tsreplace]').length};});
console.log('c5) dépassées :',JSON.stringify(o));const c5a=o.its.length===3&&o.its.find(x=>x.asp==='dn').stale===false&&o.its.find(x=>x.asp==='trace').stale===true&&o.its.find(x=>x.asp==='soud').stale===true&&o.section&&o.btns===2;
for(let i=0;i<2;i++){await page.evaluate(()=>{const b=document.querySelector('#tsview .tsCard.stale [data-tsreplace]');if(b)b.click();});await wait(400);}
o=await page.evaluate(()=>{const T=window.TRACE;const its=T.ts.of().items.filter(x=>x.kind==='sel'&&x.line==='L1'&&x.zone.m0>=199);return {its:its.map(x=>({asp:x.aspects.join(),etat:x.etat,stale:T.ts.stale(x.id),qty:x.qty})),cands:T.ts.candidates().length,section:/Modifs dépassées/.test(document.getElementById('tsview').textContent)};});
await shot('5_recalcule');console.log('c5) recalculé :',JSON.stringify(o));S1=await lineSum();console.log('c5) comptes :',JSON.stringify(S1));
C.c5=c5a&&o.its.length===3&&o.its.every(x=>!x.stale)&&o.its.find(x=>x.asp==='trace').qty.ml===40&&o.its.find(x=>x.asp==='trace').etat==='forfait'&&o.its.find(x=>x.asp==='soud').etat==='commande'&&o.cands===0&&!o.section&&sumOk(S1);
// ── c6) geste réel : ⭕ entourer à la souris sur le plan d'ensemble
await page.evaluate(()=>{window.TRACE.ts.sel.start({from:'ts'});});await wait(400);
await page.evaluate(()=>{const T=window.TRACE;const v=T.state.view;v.k=2;v.tx=200;v.ty=500;T.renderPlan();});await wait(200);
await page.click('#tsSelBar [data-tsb="tool"][data-v="lasso"]');await wait(150);
const sc=await page.evaluate(()=>{const r=document.getElementById('canvas').getBoundingClientRect();const v=window.TRACE.state.view;const f=(x,y)=>[r.left+v.tx+x*v.k,r.top+v.ty+y*v.k];return [f(30,-15),f(70,-15),f(70,15),f(30,15)];});
await page.mouse.move(sc[0][0],sc[0][1]);await page.mouse.down();for(const p of [sc[1],sc[2],sc[3],sc[0]]){await page.mouse.move(p[0],p[1],{steps:6});}await page.mouse.up();await wait(300);
o=await page.evaluate(()=>({tr:window.TRACE.ts.sel.state().tr,view:{tx:window.TRACE.state.view.tx,ty:window.TRACE.state.view.ty}}));console.log('c6) geste :',JSON.stringify(o));
const c6a=o.tr.length===1&&o.tr[0].line==='L1'&&o.tr[0].m0>=29&&o.tr[0].m0<=31.5&&o.tr[0].m1>=68.5&&o.tr[0].m1<=71&&o.view.tx===200&&o.view.ty===500;
await page.click('#tsSelBar [data-tsb="tool"][data-v="tr"]');await wait(100);await page.mouse.move(600,600);await page.mouse.down();await page.mouse.move(650,640,{steps:5});await page.mouse.up();await wait(200);
o=await page.evaluate(()=>({tr:window.TRACE.ts.sel.state().tr.length,tx:window.TRACE.state.view.tx}));const c6b=o.tr===1&&o.tx!==200; /* glisser en mode tronçon = déplacer la vue */
await page.click('#tsSelBar [data-tsb="go"]');await wait(300);o=await page.evaluate(()=>{const P=document.getElementById('tssPanel');return {rows:P?P.querySelectorAll('[data-tsrow]').length:-1,ok:P?/Rien n'a changé/.test(P.textContent):false};});
const c6c=o.rows===0&&o.ok;await page.evaluate(()=>{const b=document.querySelector('#modal [data-close]');if(b)b.click();});await wait(200);
await page.click('#tsSelBar [data-tsb="end"]');await wait(300);
C.c6=c6a&&c6b&&c6c;console.log('c6) :',JSON.stringify({c6a,c6b,c6c}));
// ── c8) « Modifs sur le plan » (pastilles) toujours là, avec les nouvelles marques numérotées
await page.click('#tsview [data-tsmap]');await wait(500);
o=await page.evaluate(()=>{const m=document.getElementById('tsMap');return {open:!!m,n:m?m.querySelectorAll('[data-tsmn]').length:0};});await page.evaluate(()=>window.TRACE.ts.map().close());await wait(200);
C.c8=o.open&&o.n>=4;console.log('c8) pastilles :',JSON.stringify(o));
// ── c7) téléphone 390
const ph=await browser.newContext({viewport:{width:390,height:844},deviceScaleFactor:2,isMobile:true,hasTouch:true});const p2=await ph.newPage();p2.on('pageerror',e=>logs.push('PAGEERROR(390): '+e.message.slice(0,300)));
await p2.goto(BASE+'/');await p2.waitForTimeout(400);await p2.evaluate(()=>localStorage.clear());
await p2.goto(BASE+'/traceur.html?site='+encodeURIComponent(siteId));await p2.waitForTimeout(1200);
const dump=await page.evaluate(()=>{const o={};for(let i=0;i<localStorage.length;i++){const k=localStorage.key(i);o[k]=localStorage.getItem(k);}return o;});
await p2.evaluate(d=>{Object.entries(d).forEach(([k,v])=>localStorage.setItem(k,v));},dump);await p2.goto(BASE+'/?site='+encodeURIComponent(siteId));await p2.waitForTimeout(1800);
await p2.evaluate(async id=>{const T=window.TRACE;if(T.state.siteId!==id)await T.go(id);},siteId);await p2.waitForTimeout(800);
await p2.evaluate(()=>{const s=document.getElementById('roleSel');if(s){s.value='ethan';s.dispatchEvent(new Event('change',{bubbles:true}));}});await p2.waitForTimeout(300);
await p2.evaluate(()=>{const T=window.TRACE;T.ts.sel.start({tr:[{line:'L1',m0:200,m1:560}],from:'ts'});});await p2.waitForTimeout(500);
o=await p2.evaluate(()=>{const b=document.getElementById('tsSelBar');const r=b?b.getBoundingClientRect():null;return {on:window.TRACE.ts.sel.state().on,bar:r?{l:Math.round(r.left),r:Math.round(r.right),h:Math.round(r.height)}:null,sw:document.documentElement.scrollWidth,go:b?b.querySelector('[data-tsb="go"]').getBoundingClientRect().height:0};});
if(SHOTS)await p2.screenshot({path:`${SHOTS}/tssel_7_tel_barre.png`});console.log('c7) barre 390 :',JSON.stringify(o));
const c7a=o.on&&!!o.bar&&o.bar.l>=0&&o.bar.r<=390&&o.sw<=392&&o.go>=44;
await p2.evaluate(()=>document.querySelector('#tsSelBar [data-tsb="go"]').click());await p2.waitForTimeout(500);
o=await p2.evaluate(()=>{const P=document.getElementById('tssPanel');const box=P&&P.closest('.box');const r=box?box.getBoundingClientRect():null;return {rows:P?P.querySelectorAll('[data-tsrow]').length:0,r:r?{l:Math.round(r.left),r:Math.round(r.right)}:null,sw:document.documentElement.scrollWidth,btnH:P?Math.round(P.querySelector('[data-tspe]').getBoundingClientRect().height):0};});
if(SHOTS)await p2.screenshot({path:`${SHOTS}/tssel_7_tel_fenetre.png`});console.log('c7) fenêtre 390 :',JSON.stringify(o));
C.c7=c7a&&o.rows>=3&&!!o.r&&o.r.l>=0&&o.r.r<=390&&o.sw<=392&&o.btnH>=38;await ph.close();
C.c9=logs.length===0;if(logs.length)console.log('console :',logs.slice(0,8));
console.log('RÉSULTATS',JSON.stringify(C));await browser.close();process.exit(Object.values(C).every(Boolean)?0:1);
