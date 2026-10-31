// e2e_modmv_3010.mjs — 30/10 (lot 2910c). Ethan sur PLOEMEUR : « j'aime bien le principe mais des fois je ne comprends pas ce que sont les + et les −, pourquoi pas de − sur des
// coudes disparus (photo : le tracé a changé de côté, le coude du marché n'a pas de pastille), et mettre plus en évidence ce qui est sélectionné et ce qui ne l'est pas ».
//  c1  pièce appariée par la séquence mais plus au même endroit du plan (> 2,5 m) = DÉPLACÉE : − à l'ancienne place / + à la nouvelle, liés (pairOf), coudes 2 / 2 → écart 0 ;
//      fins de ligne jamais « déplacées » ; clés uniques ; Σ éléments = écart de la ligne
//  c2  plan : étiquettes « − coude DN 65 ×2 », « + tube DN 65 · 53 m » dès 2,5 px/m ; pastille pointillée = position inconnue (aucune ici)
//  c3  sélection : un toucher prend l'élément ET son pendant (pièce déplacée − / +, ancien / nouveau passage) ; pris = pastille pleine bleue + halo, les autres estompés
//      (opacité .45) ; étiquettes des pris toujours (≤ 6), des libres selon le zoom ; note « ✓ pris : … et … (vont ensemble) » ; re-toucher lâche les deux ; la lecture dit
//      « déplacement, même nombre » et Compris est proposé ; les tubes ancien / nouveau passage sont liés (pairOf) et s'étiquettent « ancien passage » / « nouveau passage »
//  c3b verrou : une fois dans une modif (« traité »), l'élément est GRIS avec le badge « ✓ n°X » à la couleur de la modif, plus touchable (hit null, note 🔒, sélection inchangée) ni entourable
//  c4  console propre
import { chromium } from 'playwright';
const BASE=process.env.BASE||'http://localhost:8765';const SHOTS=process.env.SHOTS||null;
const browser=await chromium.launch({headless:true, executablePath: process.env.CHROMIUM_PATH||undefined});
const C={};const logs=[];const J=x=>JSON.stringify(x);
const ctx=await browser.newContext({viewport:{width:1366,height:900},deviceScaleFactor:1});const page=await ctx.newPage();
page.on('pageerror',e=>logs.push('PAGEERROR: '+e.message.slice(0,300)));page.on('console',m=>{if(m.type()==='error'&&!/supabase|Failed to fetch|net::ERR|404|geopf|WebSocket/i.test(m.text()))logs.push(m.text().slice(0,200));});page.on('dialog',d=>d.accept().catch(()=>{}));
const shot=async n=>{if(SHOTS)await page.screenshot({path:`${SHOTS}/modmv_${n}.png`});};const wait=ms=>page.waitForTimeout(ms);
await page.goto(BASE+'/traceur.html');await wait(500);await page.evaluate(()=>localStorage.clear());await page.reload();await wait(500);
/* marché : une ligne DN 65 qui descend, tourne à PK 60, puis redescend ; une vanne au PK 20 */
await page.evaluate(()=>{const S=window.MAQ.state;S.lines=[{id:'L1',name:'Rue des Écoles',dn:65,bar:12,pts:[[0,0],[0,60],[40,60],[40,120]],specials:[{id:'V1',type:'valve',m:20}],parent:null}];S.seq=2;window.MAQ.setMode('select');window.MAQ.rebuild();});
await page.click('#bSave');await wait(200);await page.fill('#svName','Déplacé test');await page.click('#svOk');await wait(800);
await page.click('#svGo');await wait(1500);await page.selectOption('#roleSel','ethan');await wait(300);
const siteId=await page.evaluate(()=>window.TRACE.state.siteId);
/* version 2 : le passage horizontal remonte de 15 m (les deux coudes changent de place, la vanne ne bouge pas) */
await page.goto(BASE+'/traceur.html?site='+encodeURIComponent(siteId));await wait(1500);
await page.evaluate(()=>{const S=window.MAQ.state;const l=S.lines.find(l=>l.id==='L1');l.pts=[[0,0],[0,45],[40,45],[40,120]];window.MAQ.rebuild();});
await page.click('#bSave');await wait(200);await page.selectOption('#svMode','update');await page.click('#svOk');await wait(800);
await page.click('#svGo');await wait(1500);await page.selectOption('#roleSel','ethan');await wait(300);
let o=await page.evaluate(()=>{const T=window.TRACE;const E=T.mod.elements();const D=T.ts.diff();const sum=k=>+E.reduce((s,e)=>s+e.s*(+(e.q||{})[k]||0),0).toFixed(1);const ids=E.map(e=>e.id);
  return {n:E.length,els:E.map(e=>({id:e.id,s:e.s,kind:e.kind,k:e.k,n:e.n,moved:!!e.moved,pair:e.pairOf||null,q:e.q,lab:e.lab,at:(e.at||[]).length,path:(e.path||[]).length})),uniq:new Set(ids).size===ids.length,pairOk:E.filter(e=>e.pairOf).every(e=>E.some(z=>z.id===e.pairOf)),sum:{ml:sum('ml'),soud:sum('soud'),coudes:sum('coudes'),vannes:sum('vannes'),bouchons:sum('bouchons')},d:{ml:D.tot.d.ml,soud:D.tot.d.soud,coudes:D.tot.d.coudes,vannes:D.tot.d.vannes,bouchons:D.tot.d.bouchons}};});
console.log('c1) éléments :',J({n:o.n,uniq:o.uniq,pairOk:o.pairOk,sum:o.sum,d:o.d}));o.els.forEach(e=>console.log('    ',e.s>0?'+':'−',e.kind,e.k||'',e.moved?'déplacé':'',J(e.q),e.lab.slice(0,95)));
const mv=o.els.filter(e=>e.moved);const mvM=mv.filter(e=>e.s<0),mvP=mv.filter(e=>e.s>0);
const tubM=o.els.find(e=>e.s<0&&e.kind==='tube'),tubP=o.els.find(e=>e.s>0&&e.kind==='tube');const tubePair=!!(tubM&&tubP&&tubM.pair===tubP.id&&tubP.pair===tubM.id);
C.c1=tubePair&&mvM.length===2&&mvP.length===2&&mv.every(e=>e.k==='bend'&&e.n===2&&e.q.coudes===2&&e.at===1&&e.pair&&mv.some(z=>z.id===e.pair&&z.s===-e.s))&&mvM.some(e=>/PK marché 59,9|PK marché 60/.test(e.lab)&&/ancienne place/.test(e.lab)&&/15 m/.test(e.lab))&&mvP.some(e=>/nouvelle place/.test(e.lab)&&/PK 44,9|PK 45/.test(e.lab))
  &&!o.els.some(e=>e.k==='endcap')&&!o.els.some(e=>e.k==='valve')&&o.els.some(e=>e.s<0&&e.kind==='tube'&&e.q.ml>=50&&e.q.ml<=56)&&o.els.some(e=>e.s>0&&e.kind==='tube'&&e.q.ml>=50&&e.q.ml<=56)&&o.uniq&&o.pairOk&&o.sum.coudes===0&&o.d.coudes===0&&Math.abs(o.sum.ml-o.d.ml)<=1&&o.sum.soud===o.d.soud&&o.sum.bouchons===0;
/* ── c2 étiquettes sur le plan (calque seul, hors mode), à 3 px/m puis à 1 px/m */
await page.evaluate(()=>{const T=window.TRACE;T.state.show.modEls=true;T.state.tab='plan';T.renderAll();});await wait(300); /* 31/10 (lot MD) : les éléments − / + hors mode = calque « Écarts détaillés » (éteint par défaut : tout est compris) */
const labelsAt=async k=>page.evaluate(k=>{const T=window.TRACE;const E=T.mod.elements();let x0=1e9,y0=1e9,x1=-1e9,y1=-1e9;E.forEach(e=>(e.path||[]).concat(e.at||[]).forEach(p=>{x0=Math.min(x0,p[0]);y0=Math.min(y0,p[1]);x1=Math.max(x1,p[0]);y1=Math.max(y1,p[1]);}));const cx=(x0+x1)/2,cy=(y0+y1)/2;T.state.view.k=k;T.state.view.x=innerWidth/2-cx*k;T.state.view.y=innerHeight/2-cy*k;T.renderPlan();const g=document.getElementById('tsG');const txt=[...g.querySelectorAll('g[style*="pointer-events:none"] text')].map(t=>t.textContent);return {k:T.state.view.k,txt,els:g.querySelectorAll('[data-mod-el]').length,dashed:g.querySelectorAll('circle[stroke-dasharray]').length};},k);
let o3=await labelsAt(3);let o1=await labelsAt(1);console.log('c2) étiquettes :',J({k3:o3.txt.filter(t=>t.length>1),k1:o1.txt.filter(t=>t.length>1),els:o3.els,dashed:o3.dashed}));await shot('2_calque');
C.c2=o3.els===o.n&&o3.txt.some(t=>/^− coude DN 65 ×2$/.test(t))&&o3.txt.some(t=>/^\+ coude DN 65 ×2$/.test(t))&&o3.txt.some(t=>/^\+ nouveau passage DN 65 · 5[0-9](,\d)? m$/.test(t))&&o3.txt.some(t=>/^− ancien passage DN 65/.test(t))&&!o1.txt.some(t=>/coude|passage/.test(t))&&o1.txt.filter(t=>t==='−'||t==='+').length>=4&&o3.dashed===0;
/* ── c3 sélection : toucher l'ancien coude (−), puis son pendant */
await page.evaluate(()=>{window.TRACE.mod.start({});});await wait(400);await labelsAt(3);
const old=mvM[0];const hitOld=await page.evaluate(id=>{const T=window.TRACE;const e=T.mod.elements().find(z=>z.id===id);const a=e.at[0];const h=T.mod.hit(a[0],a[1]);T.mod.tap(a[0],a[1]);return h&&h.id===id;},old.id);await wait(300);
let st=await page.evaluate(id=>{const T=window.TRACE;const MU=T.mod.state();const g=document.getElementById('tsG');const sel=g.querySelector(`[data-mod-el="${CSS.escape(id)}"]`);const other=[...g.querySelectorAll('[data-mod-el]')].find(x=>!MU.sel.includes(x.getAttribute('data-mod-el')));const c=sel&&sel.querySelector('circle[fill="#1f5fd6"][stroke="#fff"]');const halo=sel&&sel.querySelectorAll('circle').length>=2;const bar=document.getElementById('modBar');const note=bar&&bar.querySelector('.mbNote');const txt=[...g.querySelectorAll('g[style*="pointer-events:none"] text')].map(t=>t.textContent);const selLab=[...g.querySelectorAll('rect[fill="#1f5fd6"]')].length;const lect=document.getElementById('modPanel')&&document.getElementById('modPanel').innerText;
  return {sel:MU.sel,selOp:sel&&sel.getAttribute('opacity'),otherOp:other&&other.getAttribute('opacity'),blueFill:!!c,halo,note:note?note.textContent:'',selLab,txt:txt.filter(t=>t.length>1),incomplet:/déplacement incomplet/.test(lect||''),row:(lect||'').match(/Coudes DN 65[^\n]*\n?[^\n]*/)&&(lect||'').match(/Coudes DN 65[\s\S]{0,40}/)[0].replace(/\s+/g,' ')};},old.id);
console.log('c3) un pris :',J({hit:hitOld,...st}));await shot('3_un_pris');
const c3a=hitOld&&st.sel.length===2&&st.sel.includes(old.id)&&st.sel.includes(old.pair)&&st.selOp==='1'&&st.otherOp==='0.45'&&st.blueFill&&st.halo&&/✓ pris/.test(st.note)&&/coude DN 65 ×2/.test(st.note)&&/vont ensemble/.test(st.note)&&st.selLab>=1&&!st.incomplet;
if(!c3a)console.log('   c3a détail :',J({sel:st.sel,note:st.note,incomplet:st.incomplet}));
st=await page.evaluate(()=>{const T=window.TRACE;const MU=T.mod.state();const p=document.getElementById('modPanel');const t=p?p.innerText:'';const row=/0\s*\(déplacé\)/.test(t);const comp=T.mod.compare(MU.sel);const q=MU.qual;return {sel:MU.sel.length,row,comp:comp.map(r=>[r.key,r.m,r.p,r.d]),lect:/déplacement, même nombre/.test(t),incomplet:/déplacement incomplet/.test(t),qual:q,note:(document.querySelector('#modBar .mbNote')||{}).textContent||''};});
console.log('c3) paire prise :',J(st));await shot('3_paire');
const c3b=st.sel===2&&st.comp.length===1&&st.comp[0][0]==='coudes|65'&&st.comp[0][1]===2&&st.comp[0][2]===2&&st.comp[0][3]===0&&st.lect&&!st.incomplet&&st.row&&/✓ pris/.test(st.note);
/* re-toucher (le +) = lâcher les deux */
await page.evaluate(id=>{const T=window.TRACE;const e=T.mod.elements().find(z=>z.id===id);const a=e.at[0];T.mod.tap(a[0],a[1]);},old.pair);await wait(200);
const rel=await page.evaluate(()=>({sel:window.TRACE.mod.state().sel.length,note:(document.querySelector('#modBar .mbNote')||{}).textContent||''}));console.log('c3) lâché :',J(rel));
/* toucher l'ancien passage (tube −) prend aussi le nouveau */
const midSeg=P=>{let bi=1,bl=-1;for(let i=1;i<P.length;i++){const l=Math.hypot(P[i][0]-P[i-1][0],P[i][1]-P[i-1][1]);if(l>bl){bl=l;bi=i;}}return [(P[bi][0]+P[bi-1][0])/2,(P[bi][1]+P[bi-1][1])/2];};
const tt=await page.evaluate(([id,midSegSrc])=>{const midSeg=eval(midSegSrc);const T=window.TRACE;const e=T.mod.elements().find(z=>z.id===id);const q=midSeg(e.path);T.mod.tap(q[0],q[1]);const MU=T.mod.state();const p=document.getElementById('modPanel');const t=p?p.innerText:'';return {sel:MU.sel.slice(),pair:e.pairOf,lect:/passage incomplet/.test(t),va:/⇄ va avec/.test(t),rows:T.mod.compare(MU.sel).map(r=>[r.key,r.m,r.p])};},[tubM.id,midSeg.toString()]);console.log('c3) passage :',J(tt));
C.c3=c3a&&c3b&&rel.sel===0&&/✕ lâché/.test(rel.note)&&tt.sel.length===2&&tt.sel.includes(tubM.id)&&tt.sel.includes(tt.pair)&&!tt.lect&&tt.va&&tt.rows.some(r=>r[0]==='ml|65'&&r[1]>50&&r[2]>50);
/* ── c3b verrou : la paire de tubes devient la modif n°1 ; ensuite plus touchable ni entourable */
await page.evaluate(()=>{const T=window.TRACE;T.mod.compare(T.mod.state().sel).forEach(r=>T.mod.setQual(r.key,'forfait'));});const mk=await page.evaluate(()=>{const m=window.TRACE.mod.commit({nom:'Passage déplacé',devis:''});return m&&{n:m.n,els:m.els.length};});await wait(300);
const lk=await page.evaluate(([id,midSegSrc])=>{const midSeg=eval(midSegSrc);const T=window.TRACE;const e=T.mod.elements().find(z=>z.id===id);const q=midSeg(e.path);const h=T.mod.hit(q[0],q[1]);T.mod.tap(q[0],q[1]);const MU=T.mod.state();const note=(document.querySelector('#modBar .mbNote')||{}).textContent||'';const n0=MU.sel.length;const B=(()=>{let x0=1e9,y0=1e9,x1=-1e9,y1=-1e9;T.mod.elements().forEach(z=>(z.path||[]).concat(z.at||[]).forEach(p=>{x0=Math.min(x0,p[0]);y0=Math.min(y0,p[1]);x1=Math.max(x1,p[0]);y1=Math.max(y1,p[1]);}));return [[x0-5,y0-5],[x1+5,y0-5],[x1+5,y1+5],[x0-5,y1+5]];})();const added=T.mod.lasso(B);const sel=T.mod.state().sel.slice();const g=document.getElementById('tsG');const own=g.querySelector(`[data-mod-el="${CSS.escape(id)}"]`);const full=own&&own.querySelector('circle, path');const lockLab=[...g.querySelectorAll('text')].some(t=>/✓ n°1/.test(t.textContent));const grey=!!(own&&own.querySelector('path[stroke="#9a9a9a"], circle[fill="#9a9a9a"]'));return {hit:h&&h.id,note,n0,added,sel,ownedIn:sel.includes(id),cursor:own&&own.getAttribute('style'),lockLab,grey};},[tubM.id,midSeg.toString()]);
console.log('c3b) verrou :',J({mk,...lk}));await page.evaluate(()=>{window.TRACE.mod.select([]);});await wait(200);await shot('4_verrou');
C.c3b=mk&&mk.n===1&&mk.els===2&&lk.hit===null&&/🔒/.test(lk.note)&&/modif n°1/.test(lk.note)&&lk.n0===0&&lk.added>0&&!lk.ownedIn&&lk.sel.length===lk.added&&/not-allowed/.test(lk.cursor||'')&&lk.lockLab&&lk.grey;
await page.evaluate(()=>{window.TRACE.mod.select([]);});
await page.evaluate(()=>window.TRACE.mod.end());await wait(300);
C.c4=!logs.length;if(logs.length)console.log('console :',logs);
console.log('RÉSULTATS',J(C));console.log('RESULTAT:',Object.values(C).every(Boolean)?'TOUT VERT':'ÉCHEC '+Object.keys(C).filter(k=>!C[k]).join(' '));await browser.close();process.exit(Object.values(C).every(Boolean)?0:1);
