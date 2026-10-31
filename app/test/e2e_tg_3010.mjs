// e2e_tg_3010.mjs — 30/10 (lot 2910d, traceur). Ethan après un gros réseau : « un raccourci clavier pour passer de traçage libre à guidé 15° » ; « ligne commencée en DN300,
// mise en pause, réductions, reprise : les aimants gardent l'encombrement du DN initial → manchettes dans les lyres et coudes sur coudes ».
//  c1  G : libre ↔ aimant d'angle (15° par défaut, le dernier réglage sinon), sélecteur du bandeau synchronisé, message ; Ctrl+G ne fait rien
//  c2  DN300 → pause → réduction 300/150 au PK 30 → reprise : le bandeau dit « → DN150 après réduction », les aimants de longueur (coude contre coude, coude tout de suite)
//      sont ceux du DN150 ; la lyre proposée « à la suite du tracé » prend les jambes du DN150 ; sur la ligne, une lyre au PK 50 aussi (après la réduction), au PK 10 : DN300
//  c3  demi-tour dans l'axe (sommet qui revient en arrière) : erreur « demi-tour » et AUCUNE coordonnée aberrante ; sommet doublé (deux points au même endroit) : un coude 90°
//      normal, pas de « coude de 180° » ; la ligne se construit (pièces bornées)
//  c4  console propre
import { chromium } from 'playwright';
const BASE=process.env.BASE||'http://localhost:8765';
const browser=await chromium.launch({headless:true, executablePath: process.env.CHROMIUM_PATH||undefined});
const C={};const logs=[];const J=x=>JSON.stringify(x);
const ctx=await browser.newContext({viewport:{width:1366,height:900},deviceScaleFactor:1});const page=await ctx.newPage();
page.on('pageerror',e=>logs.push('PAGEERROR: '+e.message.slice(0,300)));page.on('console',m=>{if(m.type()==='error'&&!/supabase|Failed to fetch|net::ERR|404|geopf|WebSocket/i.test(m.text()))logs.push(m.text().slice(0,200));});page.on('dialog',d=>d.accept().catch(()=>{}));
const wait=ms=>page.waitForTimeout(ms);
await page.goto(BASE+'/traceur.html');await wait(500);await page.evaluate(()=>localStorage.clear());await page.reload();await wait(600);
/* ── c1 : G */
await page.evaluate(()=>{window.MAQ.setMode('trace');});await wait(200);
const snap=()=>page.evaluate(()=>({snap:window.MAQ.state.snap,sel:(document.getElementById('tfSnap')||{}).value,hint:(document.getElementById('hint')||{}).textContent||''}));
let o={s0:await snap()};await page.keyboard.press('g');await wait(200);o.s1=await snap();await page.keyboard.press('G');await wait(200);o.s2=await snap();
await page.evaluate(()=>{window.MAQ.state.snap=45;});await page.keyboard.press('g');await wait(150);o.s3=await snap();await page.keyboard.press('g');await wait(150);o.s4=await snap();
await page.keyboard.press('Control+g');await wait(150);o.s5=await snap();
console.log('c1) G :',J(o));
const was=o.s0.snap;C.c1=(was>0?o.s1.snap===0:o.s1.snap>0)&&o.s2.snap===was&&String(o.s2.sel)===String(was)&&o.s3.snap===0&&/libre/i.test(o.s3.hint)&&o.s4.snap===45&&/45°/.test(o.s4.hint)&&o.s5.snap===45&&String(o.s1.sel)===String(o.s1.snap);
/* ── c2 : DN300, pause, réduction, reprise */
await page.evaluate(()=>{const S=window.MAQ.state;S.snap=0;S.dn=300;S.lines=[];S.seq=1;S.tracing={pts:[[0,0],[0,60]],cursor:null,parent:null,resume:null};window.MAQ.pauseTrace();});await wait(300);
const legs=await page.evaluate(()=>{const c=window.MAQ.cat();return {l300:c.bend(300).legs[0],l150:c.bend(150).legs[0]};});
await page.evaluate(()=>{const S=window.MAQ.state;const l=S.lines[0];l.specials=[{id:'R1',type:'reducer',m:30,dn2:150}];window.MAQ.rebuild();window.MAQ.resumeLine(l.id);});await wait(300);
const lineId=await page.evaluate(()=>window.MAQ.state.lines[0].id);
// souris : continuer tout droit vers le bas (direction +y), à 20 m du dernier sommet → aimants calculés
const pt=await page.evaluate(()=>{const S=window.MAQ.state;const r=document.getElementById('svg').getBoundingClientRect() /* 31/10 : le 1er <svg> de la page est maintenant le logo du bandeau */;const v=S.view;const w=[0,80];return {x:r.left+v.tx+w[0]*v.k,y:r.top+v.ty+w[1]*v.k};});
await page.mouse.move(pt.x,pt.y);await wait(150);await page.mouse.move(pt.x+1,pt.y+1);await wait(200);
o=await page.evaluate(()=>{const t=window.MAQ.state.tracing;const f=document.getElementById('traceForm');return {form:f?f.textContent.slice(0,200):'',mags:(t&&t.magnets||[]).map(m=>+m.d.toFixed(2)),dn:t&&t.dn};});
console.log('c2) reprise :',J({...o,legs}));
const dIm=o.mags.some(d=>Math.abs(d-legs.l150)<1e-6),dIm300=o.mags.some(d=>Math.abs(d-legs.l300)<1e-6);
// lyre proposée à la suite du tracé : jambes du DN150
await page.evaluate(()=>{document.getElementById('tfLyre').click();});await wait(250);
const ly=await page.evaluate(()=>({h3:(document.querySelector('#modalBody h3')||{}).textContent||'',H:+(document.getElementById('shH')||{}).value}));await page.evaluate(()=>document.getElementById('shCancel').click());await wait(150);
// lyre sur la ligne au PK 50 (après la réduction) puis au PK 10 (avant) — en terminant d'abord la reprise
await page.evaluate(()=>{window.MAQ.pauseTrace();});await wait(200);
const lyAt=async m=>{await page.evaluate(([id,m])=>{window.MAQ.openAddModal(id,m);},[lineId,m]);await wait(200);const r=await page.evaluate(()=>{const b=[...document.querySelectorAll('#modal button')].find(x=>/lyre/i.test(x.textContent));if(b)b.click();return !!b;});await wait(250);const v=await page.evaluate(()=>({h3:(document.querySelector('#modalBody h3')||{}).textContent||'',H:+(document.getElementById('shH')||{}).value}));await page.evaluate(()=>{const c=document.getElementById('shCancel');if(c)c.click();document.getElementById('modal').classList.remove('show');});await wait(100);return {btn:r,...v};};
const ly50=await lyAt(50),ly10=await lyAt(10);
console.log('c2) lyre :',J({ly,ly50,ly10}));
C.c2=/DN300/.test(o.form)&&/DN150/.test(o.form)&&/après réduction/.test(o.form)&&dIm&&!dIm300&&/DN150/.test(ly.h3)&&Math.abs(ly.H-2*legs.l150)<1e-6&&(!ly50.btn||(/DN150/.test(ly50.h3)&&Math.abs(ly50.H-2*legs.l150)<1e-6))&&(!ly10.btn||(/DN300/.test(ly10.h3)&&Math.abs(ly10.H-2*legs.l300)<1e-6));
if(!C.c2)console.log('   c2 détail :',J({form:/DN150/.test(o.form),dIm,dIm300,lyH:ly.H,l150:legs.l150}));
/* ── c3 : demi-tour, sommet doublé */
o=await page.evaluate(()=>{const S=window.MAQ.state;S.lines=[
  {id:'U1',name:'Demi-tour',dn:100,bar:12,pts:[[0,0],[0,60],[0,0]],specials:[],parent:null},
  {id:'D1',name:'Sommet doublé',dn:300,bar:12,pts:[[100,0],[160,0],[160,0],[160,-6],[168,-6],[168,0],[240,0]],specials:[],parent:null}];S.seq=5;window.MAQ.rebuild();
  const B=S.built;const big=P=>P.some(p=>Math.abs(p[0])>1e6||Math.abs(p[1])>1e6);const chk=id=>{const b=B[id];if(!b)return null;const pcs=b.A.pieces||[];return {n:pcs.length,bends:pcs.filter(p=>p.kind==='bend').map(p=>p.angle),bad:pcs.filter(p=>p.path&&big(p.path)).length,errs:b.A.notes.filter(n=>n.kind==='err').map(n=>n.txt.slice(0,80))};};
  return {u:chk('U1'),d:chk('D1'),keys:Object.keys(B)};});
console.log('c3) géométrie :',J(o));
C.c3=!!o.u&&o.u.bad===0&&o.u.errs.some(t=>/demi-tour/.test(t))&&!!o.d&&o.d.bad===0&&o.d.bends.length===4&&o.d.bends.every(a=>a===90)&&!o.d.errs.length;
C.c4=!logs.length;if(logs.length)console.log('console :',logs);
console.log('RÉSULTATS',J(C));console.log('RESULTAT:',Object.values(C).every(Boolean)?'TOUT VERT':'ÉCHEC '+Object.keys(C).filter(k=>!C[k]).join(' '));await browser.close();process.exit(Object.values(C).every(Boolean)?0:1);
