// 23/10 (Ethan : « grouper des modifs ensemble, ludique : une lyre retirée ici + une lyre ajoutée là = la même modif ; une antenne supprimée + une autre prolongée =
// traitées ensemble » ; « classer une modif comme comprise dans le marché de base (oubli du dessin initial) et que ça disparaisse des modifs, bien distinct de
// “compris global et forfaitaire” »). Réseau FICTIF du traceur, marché retouché : L1 a perdu 1 té (PK 30) et 5 ml ; L2 a gagné 10 ml et 4 soudures.
// c1 les RETRAITS sont des modifs à qualifier : carte « − retrait » (« −1 té (PK 30) · −5 ml ») + pastille « − » verte sur le plan d'ensemble
// c2 🔗 Regrouper : cartes touchées → bilan en direct (« +5 ml · +4 soudures · −1 té », ajouté / retiré) → Valider → UN groupe (net), les membres sortent de la liste,
//    le tableau « Modifications » compte le net ; la pastille d'un membre ouvre la carte du groupe
// c3 ⛓ Dégrouper → les deux candidats réapparaissent, plus de groupe
// c4 ✏ Correction du marché sur l'ajout de L2 : sort des modifs, Marché vs réel : L2 n'a plus d'écart (marché corrigé : 50 ml, 12 soudures), pli « Corrections du marché (1) »,
//    le retrait de L1 reste à qualifier ; export : section « Corrections du marché » · c5 ↶ Annuler la correction → l'écart et le candidat reviennent
// c6 un groupe se qualifie comme une modif (TS proposé via la fenêtre : désignation + devis) et le DOE / export le liste avec ses membres · c6b ligne supprimée du tracé = retrait de tout
// son marché (23/10 soir) · c7 téléphone 390 · c8 console.
import { chromium } from 'playwright';
const BASE=process.env.BASE||'http://localhost:8765';const SHOTS=process.env.SHOTS||null;
const browser=await chromium.launch({headless:true, executablePath: process.env.CHROMIUM_PATH||undefined});
const C={};const logs=[];
async function mk(vp){const ctx=await browser.newContext({viewport:vp,deviceScaleFactor:1});const page=await ctx.newPage();
  page.on('pageerror',e=>logs.push('PAGEERROR: '+e.message.slice(0,300)));page.on('console',m=>{if(m.type()==='error'&&!/supabase|Failed to fetch|net::ERR|404|geopf|WebSocket/i.test(m.text()))logs.push(m.text().slice(0,200));});page.on('dialog',d=>d.accept().catch(()=>{}));
  await page.goto(BASE+'/traceur.html');await page.waitForTimeout(500);await page.evaluate(()=>localStorage.clear());await page.reload();await page.waitForTimeout(500);
  await page.evaluate(()=>{const S=window.MAQ.state;S.lines=[{id:'L1',name:'Rue Fictive',dn:100,bar:12,pts:[[10,50],[50,50],[50,75]],specials:[{id:'v1',type:'valve',m:22}],parent:null},{id:'L2',name:'Allée Fictive',dn:80,bar:12,pts:[[10,100],[60,100]],specials:[],parent:null}];S.seq=3;window.MAQ.setMode('select');window.MAQ.rebuild();});
  await page.click('#bSave');await page.waitForTimeout(200);await page.fill('#svName','Groupes test');await page.click('#svOk');await page.waitForTimeout(800);
  await page.click('#svGo');await page.waitForTimeout(1500);await page.selectOption('#roleSel','ethan');await page.waitForTimeout(300);
  await page.evaluate(()=>{const T=window.TRACE;const M=T.ts.ensureMarche(true);const a=M.lines.find(x=>x.id==='L1'),b=M.lines.find(x=>x.id==='L2');
    a.c.ml=+(a.c.ml+5).toFixed(1);a.c.tes=(a.c.tes||0)+1;a.pcs=(a.pcs||[]).concat([{k:'tee',c:'A',m:30}]);b.c.ml=+(b.c.ml-10).toFixed(1);b.c.soud-=4;b.c.manchons-=4;
    M.tot.ml=+(a.c.ml+b.c.ml).toFixed(1);M.tot.tes=(a.c.tes||0)+(b.c.tes||0);M.tot.soud=a.c.soud+b.c.soud;M.tot.manchons=a.c.manchons+b.c.manchons;M.at=new Date(Date.now()+1000).toISOString();
    T.state.tab='ts';T.renderAll();});await page.waitForTimeout(300);return {ctx,page};}
const shot=async(page,n)=>{if(SHOTS)await page.screenshot({path:`${SHOTS}/tsg_${n}.png`});};
const sp=t=>String(t||'').replace(/[\s  ]+/g,' ').trim();
const cands=page=>page.evaluate(()=>window.TRACE.ts.candidates().map(c=>({line:c.line,neg:!!c.neg,label:c.label,qty:c.qty})));
const tblQ=page=>page.evaluate(()=>{const t=document.querySelector('#tsview table.tsQ');return Object.fromEntries([...t.querySelectorAll('tr')].slice(1).map(tr=>{const td=[...tr.querySelectorAll('td')].map(x=>x.textContent.trim());return [td[0],td.slice(1)];}));});
const tblMain=page=>page.evaluate(()=>{const t=document.querySelector('#tsview table.tsMain');return Object.fromEntries([...t.querySelectorAll('tr')].slice(1).map(tr=>{const td=[...tr.querySelectorAll('td')].map(x=>(x.firstChild&&x.firstChild.textContent||x.textContent).trim());return [td[0],td.slice(1)];}));});

let {ctx,page}=await mk({width:1366,height:900});
// ── c1) retrait = candidat à part
let K=await cands(page);const cardNeg=await page.evaluate(()=>{const c=[...document.querySelectorAll('#tsview .tsCard.cand.neg')];return c.map(x=>x.textContent.replace(/[\s  ]+/g,' ').trim().slice(0,160));});
const minis=await page.evaluate(()=>[...document.querySelectorAll('#tsview .tsOverview [data-tscandmini] text')].map(t=>t.textContent));await shot(page,'1_retrait');
console.log('c1) candidats :',JSON.stringify({K,cardNeg,minis}));
const neg=K.find(c=>c.neg),pos=K.find(c=>!c.neg);
C.c1=K.length===2&&!!neg&&neg.line==='L1'&&/^PK 30 : −1 té \(PK 30\) · -5 ml$/.test(neg.label)&&neg.qty.tes===-1&&neg.qty.ml===-5 /* 27/10 : une zone = ses pièces et son linéaire ; ce que la ligne a en plus ou en moins sans endroit (ici le −5 ml « synthétique ») va dans la plus grosse zone */&&!!pos&&pos.line==='L2'&&cardNeg.length===1&&/− retrait/.test(cardNeg[0])&&minis.includes('−')&&minis.includes('?');
// ── c2) 🔗 « Regrouper avec… » depuis la carte du retrait (présélectionné) → l'autre carte → bilan → Valider
const withBtn=await page.evaluate(()=>[...document.querySelectorAll('#tsview .tsCard.cand.neg [data-tsgwith]')].map(b=>b.dataset.tsgwith));await page.click('#tsview .tsCard.cand.neg [data-tsgwith]');await page.waitForTimeout(250);
const pre=await page.evaluate(()=>document.querySelectorAll('#tsview .tsCard.gsel').length);const keys=await page.evaluate(()=>[...document.querySelectorAll('#tsview [data-tsgsel]')].map(b=>b.dataset.tsgsel));
for(const k of keys){const on=await page.evaluate(k=>document.querySelector(`#tsview [data-tsgsel="${k}"]`).classList.contains('primary'),k);if(!on){await page.click(`#tsview [data-tsgsel="${k}"]`);await page.waitForTimeout(200);}}
console.log('c2) regrouper avec… :',JSON.stringify({withBtn,pre}));
const bar=await page.evaluate(()=>{const b=document.getElementById('tsGrpBar');const ok=b&&b.querySelector('[data-tsgok]');return b?{txt:b.textContent.replace(/[\s  ]+/g,' ').trim(),ok:ok?!ok.disabled:null,sel:document.querySelectorAll('#tsview .tsCard.gsel').length}:null;});await shot(page,'2_bilan');
await page.click('#tsview [data-tsgok]');await page.waitForTimeout(400);
let o=await page.evaluate(()=>{const T=window.TRACE.ts.of();const g=T.items.find(x=>x.kind==='group');const live=T.items.filter(window.TRACE.ts.live);const card=document.querySelector('#tsview .tsCard.grp');return {g:g?{qty:g.qty,n:g.members.length,etat:g.etat,label:g.label}:null,live:live.length,cands:window.TRACE.ts.candidates().length,card:card?card.textContent.replace(/[\s  ]+/g,' ').trim().slice(0,2000):null,toast:(document.getElementById('toast')||{}).textContent||''};});
const Q2=await tblQ(page);await shot(page,'2_groupe');
console.log('c2) groupe :',JSON.stringify({bar,g:o.g,live:o.live,cands:o.cands,card:o.card&&o.card.slice(0,700),Q2}));
C.c2=withBtn.length===1&&pre===1&&keys.length===2&&!!bar&&/2 choisies/.test(bar.txt)&&/Bilan net : \+5 ml · \+4 soudures · -1 té/.test(bar.txt)&&/ajouté \+10 ml · \+4 soudures/.test(bar.txt)&&/retiré -5 ml · -1 té/.test(bar.txt)&&bar.ok===true&&bar.sel===2
  &&!!o.g&&o.g.n===2&&o.g.qty.ml===5&&o.g.qty.soud===4&&o.g.qty.tes===-1&&o.live===1&&o.cands===0&&/🔗 groupe · 2 modifs/.test(o.card)&&/Bilan net : \+5 ml · \+4 soudures · -1 té/.test(o.card)&&/Avant → après des lignes concernées \(Rue Fictive, Allée Fictive\)/.test(o.card)&&/− Rue Fictive : PK 30 : −1 té \(PK 30\) · -5 ml/.test(o.card)
  &&(Q2['Linéaire d\'axe (ml)']||[])[2]==='+5'&&(Q2['Tés']||[])[2]==='−1';
// la pastille d'un membre (plan d'ensemble) → la carte du groupe
const gid=o.g?await page.evaluate(()=>window.TRACE.ts.of().items.find(x=>x.kind==='group').id):null;
const miniG=await page.evaluate(()=>[...document.querySelectorAll('#tsview .tsOverview [data-tsmini]')].map(g=>g.dataset.tsmini));console.log('c2) pastilles du groupe :',JSON.stringify({miniG,gid}));C.c2=C.c2&&miniG.length>=1&&miniG.every(x=>x===gid);
// ── c2c) cartes repliables (23/10 soir, Ethan : « l'onglet Modifs, c'est vite un enfer la taille ») : une qualifiée est repliée (une ligne), une à qualifier dépliée ; toucher l'en-tête déplie ; « Tout replier / déplier »
const unfold=async key=>{await page.evaluate(k=>{const h=document.querySelector(`#tsview .tsHead[data-tsfold="${k}"]`);if(h&&h.closest('.tsCard').classList.contains('fold'))h.click();},key);await page.waitForTimeout(250);};
o=await page.evaluate(gid=>{const g=document.querySelector(`#tsview .tsCard[data-tscard="${gid}"]`);const vis=el=>!!el&&el.offsetParent!==null;return {fold:g.classList.contains('fold'),h:Math.round(g.getBoundingClientRect().height),bodyVis:vis(g.querySelector('.tsCardBody')),headTxt:g.querySelector('.tsHead').textContent.replace(/\s+/g,' ').trim().slice(0,120),btnAll:(document.querySelector('#tsview [data-tsfoldall]')||{}).textContent};},gid);
await unfold(gid);const o2=await page.evaluate(gid=>{const g=document.querySelector(`#tsview .tsCard[data-tscard="${gid}"]`);return {fold:g.classList.contains('fold'),bodyVis:g.querySelector('.tsCardBody').offsetParent!==null,ungroupVis:(document.querySelector('#tsview [data-tsungroup]')||{}).offsetParent!==null};},gid);
await page.click('#tsview [data-tsfoldall]');await page.waitForTimeout(250);const o3=await page.evaluate(()=>({folded:document.querySelectorAll('#tsview .tsCard.fold').length,all:document.querySelectorAll('#tsview .tsCard').length,btn:(document.querySelector('#tsview [data-tsfoldall]')||{}).textContent}));
await page.click('#tsview [data-tsfoldall]');await page.waitForTimeout(250);const o4=await page.evaluate(()=>({folded:document.querySelectorAll('#tsview .tsCard.fold').length,all:document.querySelectorAll('#tsview .tsCard').length}));
console.log('c2c) cartes repliables :',JSON.stringify({o,o2,o3,o4}));C.c2c=o.fold&&o.h<110&&!o.bodyVis&&/TS proposé/.test(o.headTxt)&&/Rue Fictive/.test(o.headTxt)&&/Tout replier/.test(o.btnAll)&&!o2.fold&&o2.bodyVis&&o2.ungroupVis&&o3.folded===o3.all&&o3.all>=1&&/Tout déplier/.test(o3.btn)&&o4.folded===0;
// ── c3) dégrouper
await page.click('#tsview [data-tsungroup]');await page.waitForTimeout(400);o=await page.evaluate(()=>({items:window.TRACE.ts.of().items.length,cands:window.TRACE.ts.candidates().length}));
console.log('c3) dégroupé :',JSON.stringify(o));C.c3=o.items===0&&o.cands===2;
// ── c4) correction du marché sur l'ajout de L2
const M0=await tblMain(page);const iPos=await page.evaluate(()=>window.TRACE.ts.candidates().findIndex(c=>!c.neg));
await page.selectOption(`#tsview [data-tscet="${iPos}"]`,'corr');await page.click(`#tsview [data-tscok="${iPos}"]`);await page.waitForTimeout(400);const M1=await tblMain(page); /* 23/10 soir : « correction du marché » = 5e choix du menu Qualifier */
o=await page.evaluate(()=>{const T=window.TRACE;const D=T.ts.diff();const r=D.rows.find(x=>x.id==='L2');const det=document.querySelector('#tsview details.tsCorr');const html=T.doe.tsHTML();return {r:{mar:r.mar,reel:r.reel,d:r.d,changed:D.changed.map(x=>x.id)},corrN:T.ts.of().items.filter(x=>x.etat==='corr').length,cands:T.ts.candidates().map(c=>!!c.neg),det:det?det.querySelector('summary').textContent.replace(/[\s  ]+/g,' ').trim():null,exp:/Corrections du marché/.test(html),live:T.ts.of().items.filter(T.ts.live).length};});
await page.evaluate(()=>{const d=document.querySelector('#tsview details.tsCorr');if(d)d.open=true;});await shot(page,'4_correction');
console.log('c4) correction :',JSON.stringify({before:{ml:M0['Linéaire d\'axe (ml)'],sd:M0['Soudures (aller + retour)']},after:{ml:M1['Linéaire d\'axe (ml)'],sd:M1['Soudures (aller + retour)']},o}));
C.c4=o.corrN===1&&o.live===0&&o.cands.length===1&&o.cands[0]===true&&o.r.mar.ml===50&&o.r.mar.soud===12&&o.r.d.ml===0&&o.r.d.soud===0&&o.r.changed.join(',')==='L1'&&/Corrections du marché \(1\)/.test(o.det)&&o.exp
  &&M0['Linéaire d\'axe (ml)'][0]==='110'&&M1['Linéaire d\'axe (ml)'][0]==='120'&&M1['Linéaire d\'axe (ml)'][2]==='−5'&&M1['Soudures (aller + retour)'][2]==='—';
// ── c5) ↶
await page.click('#tsview [data-tscorrx]');await page.waitForTimeout(400);o=await page.evaluate(()=>({corrN:window.TRACE.ts.of().items.filter(x=>x.etat==='corr').length,cands:window.TRACE.ts.candidates().length,marMl:window.TRACE.ts.diff().tot.mar.ml}));
console.log('c5) annulée :',JSON.stringify(o));C.c5=o.corrN===0&&o.cands===2&&o.marMl===110;
// ── c6) groupe qualifié TS proposé (fenêtre : désignation + devis), export avec les membres
await page.evaluate(()=>{const T=window.TRACE;const cs=T.ts.candidates();T.ts.group(cs.map(c=>({cand:c})),'propose');T.renderAll();});await page.waitForTimeout(300);
const gid2=await page.evaluate(()=>window.TRACE.ts.of().items.find(x=>x.kind==='group').id);await unfold(gid2);
await page.click(`#tsview [data-tsst="propose"][data-tsid="${gid2}"]`);await page.waitForTimeout(300);const modal=await page.evaluate(()=>!!document.querySelector('#modal #tsqDevis'));
if(modal){await page.fill('#modal #tsqDesig','Lyre déplacée (groupe)');await page.fill('#modal #tsqDevis','DEV-G1');await page.click('#modal #tsqOk');await page.waitForTimeout(400);}
o=await page.evaluate(()=>{const T=window.TRACE;const g=T.ts.of().items.find(x=>x.kind==='group');const html=T.doe.tsHTML();return {etat:g.etat,ts:g.ts,desig:g.desig,exp:/Devis DEV-G1/.test(html)&&/\(net\)/.test(html)&&/<li>− Rue Fictive/.test(html)&&/<li>\+ Allée Fictive/.test(html)};});
console.log('c6) groupe qualifié :',JSON.stringify({modal,o}));C.c6=modal&&o.etat==='propose'&&o.ts==='DEV-G1'&&o.desig==='Lyre déplacée (groupe)'&&o.exp;
// ── c6c) export au choix (23/10 soir) : fenêtre avec cases (groupe coché, candidats décochés), export de la sélection = une fiche par modif retenue avec schéma zoomé + avant → après
await page.click('#tsview [data-tsexport]');await page.waitForTimeout(300);
o=await page.evaluate(()=>{const m=document.getElementById('modal');const boxes=[...m.querySelectorAll('input[data-xk]')].map(i=>({k:i.dataset.xk,on:i.checked}));const vig=m.querySelectorAll('.tsXv svg').length;return {boxes,vig,txt:m.textContent.replace(/[\s  ]+/g,' ').slice(0,200)};});
const exp=await page.evaluate(()=>({sel:[...document.querySelectorAll('#modal input[data-xk]:checked')].map(i=>i.dataset.xk)}));
const xhtml=await page.evaluate(sel=>window.TRACE.ts.exportHTML({sel}),exp.sel);
await page.evaluate(()=>{const b=document.querySelector('#modal [data-close]');if(b)b.click();});await page.waitForTimeout(200);
if(SHOTS){const fs=await import('node:fs');fs.writeFileSync(SHOTS+'/export_sel.html',xhtml);} /* pour regarder le document */
console.log('c6c) export au choix :',JSON.stringify({boxes:o.boxes,vig:o.vig,sel:exp.sel,n:xhtml.length,num:(xhtml.match(/<svg class="tsSvg tsNum"/g)||[]).length,retenu:/dont retenu ici/.test(xhtml),plan:/Plan d'ensemble — 1 modification retenue/.test(xhtml),aa:/Avant \(marché\)/.test(xhtml),grp:/Groupe — /.test(xhtml),full:/Modifications qualifiées/.test(xhtml)}));
C.c6c=o.boxes.length>=1&&o.boxes.filter(b=>!b.k.startsWith('c')).every(b=>b.on)&&o.boxes.filter(b=>b.k.startsWith('c')).every(b=>!b.on)&&o.vig>=1&&xhtml.length>1000&&/Plan d'ensemble — 1 modification retenue/.test(xhtml)&&(xhtml.match(/<svg class="tsSvg tsNum"/g)||[]).length===2&&/dont retenu ici/.test(xhtml)&&/Groupe — /.test(xhtml)&&/Avant \(marché\)/.test(xhtml)&&!/Modifications qualifiées/.test(xhtml)&&!/Par ligne — avant/.test(xhtml);
// ── c6b) une ligne supprimée du tracé = un retrait (tout son marché), positionné sur l'axe du marché, qualifiable
await page.evaluate(()=>{const T=window.TRACE;T.ts.of().items.length=0;delete T.state.lines.L2;Object.values(T.state.sheets||{}).forEach(sh=>{if(sh&&sh.lines)sh.lines=sh.lines.filter(id=>id!=='L2');});T.renderAll();});await page.waitForTimeout(300); /* comme après une mise à jour du traceur sans L2 */
o=await page.evaluate(()=>{const T=window.TRACE;const cs=T.ts.candidates();const g=cs.find(c=>c.gone);const card=[...document.querySelectorAll('#tsview .tsCard.cand')].map(x=>x.textContent.replace(/[\s  ]+/g,' ').trim().slice(0,160));return {n:cs.length,g:g?{line:g.line,label:g.label,qty:g.qty,pos:!!g.pos}:null,card,vig:document.querySelectorAll('#tsview .tsCard.cand .tsVig svg').length};});
if(o.g){const i=await page.evaluate(()=>window.TRACE.ts.candidates().findIndex(c=>c.gone));await page.selectOption(`#tsview [data-tscet="${i}"]`,'forfait');await page.click(`#tsview [data-tscok="${i}"]`);await page.waitForTimeout(300);}
const after=await page.evaluate(()=>{const T=window.TRACE;const it=T.ts.of().items.find(x=>x.gone);return {it:it?{etat:it.etat,pos:!!it.pos}:null,cands:T.ts.candidates().filter(c=>c.gone).length,card:!!document.querySelector('#tsview .tsCard:not(.cand)')};});
console.log('c6b) ligne supprimée :',JSON.stringify({o,after}));C.c6b=!!o.g&&o.g.line==='L2'&&/ligne supprimée \(tout le marché de la ligne\) : -40 ml · -8 soudures/.test(o.g.label)&&o.g.qty.ml===-40&&o.g.pos&&o.card.some(t=>/ligne supprimée/.test(t))&&!!after.it&&after.it.etat==='forfait'&&after.it.pos&&after.cands===0&&after.card;
await ctx.close();
// ── c7) téléphone : mode regrouper, barre collante, pas de débordement
({ctx,page}=await mk({width:390,height:844}));await page.click('#tsview [data-tsgrp]');await page.waitForTimeout(250);
const ks=await page.evaluate(()=>[...document.querySelectorAll('#tsview [data-tsgsel]')].map(b=>b.dataset.tsgsel));for(const k of ks){await page.click(`#tsview [data-tsgsel="${k}"]`);await page.waitForTimeout(150);}
o=await page.evaluate(()=>{const b=document.getElementById('tsGrpBar');const ok=b&&b.querySelector('[data-tsgok]');return {sw:document.documentElement.scrollWidth,w:window.innerWidth,bar:!!b,okH:ok?Math.round(ok.getBoundingClientRect().height):0,pos:b?getComputedStyle(b).position:''};});
await shot(page,'7_tel');console.log('c7) téléphone :',JSON.stringify(o));C.c7=o.sw<=o.w+1&&o.bar&&o.okH>=44&&o.pos==='sticky';
await ctx.close();
console.log('erreurs console :',JSON.stringify(logs));C.c8=logs.length===0;
const ko=Object.entries(C).filter(([k,v])=>!v).map(([k])=>k);console.log(JSON.stringify(C));console.log(ko.length?'RESULTAT: KO '+ko.join(','):'RESULTAT: TOUT VERT');
await browser.close();
