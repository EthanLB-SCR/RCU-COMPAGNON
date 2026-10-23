// 23/10 (Ethan : « je supprime une lyre, j'ai quand même 4 soudures sur mon feeder plutôt qu'une barre à la place » ; « décaler une lyre ou inverser son sens, petit
// raccourci » ; « sélectionner plusieurs sommets que l'on veut bouger ensemble ») — TRACEUR, réseau FICTIF : ligne L1 DN 100, 60 m droit avec une lyre à PK 30
// (insertShape), ligne L2 droite 40 m avec 2 sommets alignés (angle 0°) qui coupent les barres pour rien.
// c1 état de départ : la lyre est détectée (4 sommets), L2 a 2 sommets alignés → 4 soudures de trop par rapport au calepinage en barres de 12 m
// c2 fiche de la ligne L2 : « 2 sommets alignés coupent des barres pour rien » + 🧹 → l'axe est droit, les soudures sont celles d'une ligne droite de 40 m
// c3 fiche d'une soudure venue d'un sommet aligné : « ✂ Supprimer cette soudure » → le sommet part, la barre se recale · une soudure de calepinage n'a pas ✂
// c4 un sommet de la lyre sélectionné → barre « Lyre sommets a–d » : ◀ 1 m décale les 4 sommets d'1 m (axe inchangé ailleurs, limites affichées) ; ⇅ Inverser passe les bras
//    de l'autre côté ; 🗑 Supprimer : l'axe redevient droit (2 sommets), plus de lyre, barres de 12 m
// c5 ⊞ Sommets : touches successives = sélection multiple (pas de Maj) ; glisser l'un d'eux déplace les deux ; un clic sur un sommet sélectionné le retire ; ◀ 1 m au mètre
// c6 rectangle en mode ⊞ : les sommets englobés sont sélectionnés · c7 Ctrl+Z annule le dernier geste · c8 console propre.
import { chromium } from 'playwright';
const BASE=process.env.BASE||'http://localhost:8765';const SHOTS=process.env.SHOTS||null;
const browser=await chromium.launch({headless:true, executablePath: process.env.CHROMIUM_PATH||undefined});
const ctx=await browser.newContext({viewport:{width:1366,height:860},deviceScaleFactor:1});const page=await ctx.newPage();const logs=[];const C={};
page.on('pageerror',e=>logs.push('PAGEERROR: '+e.message.slice(0,300)));page.on('console',m=>{if(m.type()==='error'&&!/supabase|Failed to fetch|net::ERR|404|geopf|WebSocket/i.test(m.text()))logs.push(m.text().slice(0,200));});page.on('dialog',d=>d.accept().catch(()=>{}));
await page.goto(BASE+'/traceur.html');await page.waitForTimeout(500);await page.evaluate(()=>localStorage.clear());await page.reload();await page.waitForTimeout(600);
await page.evaluate(()=>{const S=window.MAQ.state;const H=2.4,W=2.6,m=30; // lyre : 4 sommets exacts sur un axe droit (0,100)→(60,100), côté +1
  const P0=[m-W/2,100],P1=[m-W/2,100+H],P2=[m+W/2,100+H],P3=[m+W/2,100];
  S.lines=[{id:'L1',name:'Feeder fictif',dn:100,bar:12,pts:[[0,100],P0,P1,P2,P3,[60,100]],specials:[],parent:null},
    {id:'L2',name:'Antenne fictive',dn:80,bar:12,pts:[[0,140],[13,140],[27,140],[40,140]],specials:[],parent:null}];S.seq=3;window.MAQ.setMode('select');window.MAQ.rebuild();});
await page.waitForTimeout(300);
const shot=async n=>{if(SHOTS)await page.screenshot({path:`${SHOTS}/tr_${n}.png`});};
const info=()=>page.evaluate(()=>{const S=window.MAQ.state;const o={};S.lines.forEach(l=>{const B=S.built[l.id];o[l.id]={pts:l.pts.map(p=>[+p[0].toFixed(2),+p[1].toFixed(2)]),nW:B?B.A.welds.length:null,welds:B?B.A.welds.map(w=>+w.m.toFixed(2)):[],shapes:window.MAQ.shapes(l.id),aligned:window.MAQ.aligned(l.id)};});o.selV=(S.selV||[]).map(v=>v.line+':'+v.i);return o;});
const selVtx=async(line,i)=>{await page.evaluate(([line,i])=>{const S=window.MAQ.state;S.selV=[{line,i}];S.sel={kind:'line',id:line};S.tab='sel';window.MAQ.shapeBar();},[line,i]);await page.waitForTimeout(150);};
const panel=()=>page.evaluate(()=>document.getElementById('panel').textContent.replace(/[\s  ]+/g,' '));
const toScreen=async(wx,wy)=>page.evaluate(([x,y])=>{const v=window.MAQ.state.view;const r=document.getElementById('svg').getBoundingClientRect();return [r.left+x*v.k+v.tx,r.top+y*v.k+v.ty];},[wx,wy]);
// ── c1
let I=await info();console.log('c1) départ :',JSON.stringify({L1:{nW:I.L1.nW,shapes:I.L1.shapes},L2:{nW:I.L2.nW,aligned:I.L2.aligned,welds:I.L2.welds}}));
C.c1=I.L1.shapes.lyres.length===1&&I.L1.shapes.lyres[0].v.join(',')==='1,2,3,4'&&I.L2.aligned.join(',')==='1,2'&&I.L2.nW>=5; // 40 m droit = 3 barres + chute → 3 ou 4 soudures ; avec 2 coupes alignées → ≥ 5
// ── c2 : fiche L2 → 🧹
await page.evaluate(()=>{const S=window.MAQ.state;S.sel={kind:'line',id:'L2'};S.tab='sel';S.selV=[];});await page.evaluate(()=>window.MAQ.rebuild());await page.waitForTimeout(200);
let P=await panel();const hasWarn=/2 sommets alignés \(1, 2\) coupent des barres pour rien : 4 soudures en trop/.test(P);await shot('2_alignes');
await page.click('#panel [data-act="delAligned"]');await page.waitForTimeout(300);I=await info();
console.log('c2) 🧹 :',JSON.stringify({hasWarn,pts:I.L2.pts,nW:I.L2.nW,welds:I.L2.welds,aligned:I.L2.aligned}));
C.c2=hasWarn&&I.L2.pts.length===2&&I.L2.aligned.length===0&&I.L2.nW===5&&!I.L2.welds.includes(13)&&!I.L2.welds.includes(27)&&!/coupent des barres pour rien/.test(await panel());
// ── c3 : remettre un sommet aligné sur L2, fiche de SA soudure → ✂ ; soudure de calepinage : pas de ✂
await page.evaluate(()=>{const S=window.MAQ.state;const l=S.lines.find(x=>x.id==='L2');l.pts.splice(1,0,[20,140]);window.MAQ.rebuild();});await page.waitForTimeout(200);
let o=await page.evaluate(()=>{const S=window.MAQ.state;const B=S.built.L2;const w=B.A.welds.find(x=>x.vtx===1);const wc=B.A.welds.find(x=>x.vtx==null&&Math.abs(x.m-12)<0.01);if(!w)return {w:null};S.sel={kind:'weld',id:w.id};S.tab='sel';window.MAQ.rebuild();const t1=document.getElementById('panel').textContent.replace(/[\s  ]+/g,' ');const b=document.querySelector('#panel [data-act="delVertex"]');const has=!!b;
  S.sel={kind:'weld',id:wc.id};window.MAQ.rebuild();const t2=document.getElementById('panel').textContent.replace(/[\s  ]+/g,' ');const has2=!!document.querySelector('#panel [data-act="delVertex"]');S.sel={kind:'weld',id:w.id};window.MAQ.rebuild();return {w:w.id,m:w.m,t1,has,t2,has2};});
await shot('3_soudure');if(o.has){await page.click('#panel [data-act="delVertex"]');await page.waitForTimeout(300);}I=await info();
console.log('c3) ✂ soudure :',JSON.stringify({w:o.w,has:o.has,txt:(o.t1.match(/Cette soudure vient du sommet[^.]*\./)||[''])[0],has2:o.has2,calep:(o.t2.match(/Soudure du calepinage[^—]*/)||[''])[0],pts:I.L2.pts.length,nW:I.L2.nW}));
C.c3=!!o.w&&o.has&&/sommet 1 de l'axe — aligné \(0°\)/.test(o.t1)&&!o.has2&&/Soudure du calepinage \(barres de 12 m\)/.test(o.t2)&&I.L2.pts.length===2;
// ── c4 : la lyre — barre, ◀ 1 m, ⇅, 🗑
await selVtx('L1',2);let bar=await page.evaluate(()=>{const b=document.getElementById('shapeBar');return b?{txt:b.textContent.replace(/[\s  ]+/g,' ').trim(),btns:[...b.querySelectorAll('button')].map(x=>[x.dataset.sh,x.disabled,Math.round(x.getBoundingClientRect().height)])}:null;});await shot('4_lyre_barre');
const sel0=await page.evaluate(()=>window.MAQ.shapeSel());const before=(await info()).L1.pts;
await page.click('#shapeBar [data-sh="d|-1"]');await page.waitForTimeout(250);const afterShift=(await info()).L1.pts;
await page.click('#shapeBar [data-sh="flip"]');await page.waitForTimeout(250);const afterFlip=(await info()).L1.pts;await shot('4_lyre_inversee');
const okShift=[1,2,3,4].every(i=>Math.abs(afterShift[i][0]-(before[i][0]-1))<1e-6&&Math.abs(afterShift[i][1]-before[i][1])<1e-6)&&afterShift[0].join()===before[0].join()&&afterShift[5].join()===before[5].join();
const okFlip=Math.abs(afterFlip[2][1]-(100-2.4))<1e-6&&Math.abs(afterFlip[3][1]-(100-2.4))<1e-6&&afterFlip[1][1]===100&&afterFlip[4][1]===100;
await page.click('#shapeBar [data-sh="del"]');await page.waitForTimeout(350);I=await info();const barGone=await page.evaluate(()=>!document.getElementById('shapeBar'));
console.log('c4) lyre :',JSON.stringify({bar:bar&&bar.txt.slice(0,80),sel0,okShift,okFlip,after:I.L1.pts,nW:I.L1.nW,shapes:I.L1.shapes.lyres.length,barGone}));
C.c4=!!bar&&/Lyre sommets 1–4/.test(bar.txt)&&bar.btns.every(b=>b[2]>=40)&&sel0&&sel0.kind==='lyre'&&sel0.lim.min<=-1&&okShift&&okFlip&&I.L1.pts.length===2&&I.L1.shapes.lyres.length===0&&I.L1.nW===6&&barGone; // 60 m droit : départ, 12, 24, 36, 48, kit → 6 soudures par conduite
// ── c5 : ⊞ Sommets au doigt (sans Maj) sur L2 (remettre 2 sommets)
await page.evaluate(()=>{const S=window.MAQ.state;const l=S.lines.find(x=>x.id==='L2');l.pts=[[0,140],[12,140],[28,140],[40,140]];S.selV=[];window.MAQ.rebuild();window.MAQ.vtxSel(true);S.sel={kind:'line',id:'L2'};S.tab='sel';window.MAQ.rebuild();});await page.waitForTimeout(200);
await page.evaluate(()=>{const v=window.MAQ.state.view;v.k=12;v.tx=60;v.ty=-140*12+400;window.MAQ.applyView();window.MAQ.rebuild();});await page.waitForTimeout(200);
const tapV=async(x,y)=>{const [sx,sy]=await toScreen(x,y);await page.mouse.move(sx,sy);await page.mouse.down();await page.waitForTimeout(40);await page.mouse.up();await page.waitForTimeout(150);};
await tapV(12,140);await tapV(28,140);I=await info();const sel2=I.selV.slice();
P=await panel();const multiTxt=(P.match(/⊞ 2 sommets sélectionnés[^.]*\./)||[''])[0];await shot('5_multi');
const [sx,sy]=await toScreen(12,140);await page.mouse.move(sx,sy);await page.mouse.down();await page.mouse.move(sx+6,sy,{steps:2});await page.mouse.move(sx+12*2,sy,{steps:4});await page.mouse.up();await page.waitForTimeout(300);I=await info();const dragged=I.L2.pts;
await tapV(dragged[1][0],dragged[1][1]);const selAfterTap=(await info()).selV;
await page.evaluate(()=>{const S=window.MAQ.state;S.selV=[{line:'L2',i:1},{line:'L2',i:2}];window.MAQ.rebuild();});await page.click('#panel [data-act="nudge"][data-dx="-1"]');await page.waitForTimeout(250);const nudged=(await info()).L2.pts;
console.log('c5) ⊞ :',JSON.stringify({sel2,multiTxt,dragged,selAfterTap,nudged}));
C.c5=sel2.join(',')==='L2:1,L2:2'&&/⊞ 2 sommets sélectionnés/.test(multiTxt)&&Math.abs(dragged[1][0]-14)<0.3&&Math.abs(dragged[2][0]-30)<0.3&&selAfterTap.length===1&&selAfterTap[0]==='L2:2'&&Math.abs(nudged[1][0]-(dragged[1][0]-1))<1e-6&&Math.abs(nudged[2][0]-(dragged[2][0]-1))<1e-6;
// ── c6 : rectangle en mode ⊞
await page.evaluate(()=>{window.MAQ.state.selV=[];window.MAQ.rebuild();});const [ax,ay]=await toScreen(8,135);const [bx,by]=await toScreen(34,145);
await page.mouse.move(ax,ay);await page.mouse.down();await page.mouse.move(ax+10,ay+5,{steps:2});await page.mouse.move(bx,by,{steps:5});await page.mouse.up();await page.waitForTimeout(300);I=await info();
console.log('c6) rectangle :',JSON.stringify({selV:I.selV}));C.c6=I.selV.length===2&&I.selV.includes('L2:1')&&I.selV.includes('L2:2');
// ── c7 : Ctrl+Z annule le nudge précédent (dernier geste géométrique)
await page.evaluate(()=>window.MAQ.vtxSel(false));await page.keyboard.press('Control+z');await page.waitForTimeout(300);const undone=(await info()).L2.pts;
console.log('c7) Ctrl+Z :',JSON.stringify({undone,nudged}));C.c7=Math.abs(undone[1][0]-dragged[1][0])<1e-6;
console.log('erreurs console :',JSON.stringify(logs));C.c8=logs.length===0;
const ko=Object.entries(C).filter(([k,v])=>!v).map(([k])=>k);console.log(JSON.stringify(C));console.log(ko.length?'RESULTAT: KO '+ko.join(','):'RESULTAT: TOUT VERT');
await browser.close();
