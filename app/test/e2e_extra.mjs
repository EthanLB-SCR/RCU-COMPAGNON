// SOUDURE SUPPLÉMENTAIRE (Ethan 07/10) : bouton sur l'écran du chantier → tap sur une barre → soudure ajoutée (numérotée à la suite, marquée ➕),
// barre scindée, fiche ouverte ; persistée dans le chantier (NET.extraWelds) et REJOUÉE à la reconstruction avec le même numéro ; retirable tant qu'elle est vierge ;
// pas sur un coude/té ni trop près d'un bout ; les anciennes fonctions (DH wirePath, liste, statuts) voient la soudure comme les autres.
import { chromium } from 'playwright';
const BASE=process.env.BASE||'http://localhost:8765';
const browser=await chromium.launch({headless:true, executablePath: process.env.CHROMIUM_PATH||undefined});
const ctx=await browser.newContext({viewport:{width:900,height:940}});const page=await ctx.newPage();
const logs=[];page.on('pageerror',e=>logs.push('PAGEERROR: '+e.message.slice(0,300)));page.on('console',m=>{if(m.type()==='error'&&!/supabase|Failed to fetch|net::ERR|404/i.test(m.text()))logs.push(m.text().slice(0,200));});
page.on('dialog',d=>d.accept().catch(()=>{}));
await page.goto(BASE+'/traceur.html');await page.waitForTimeout(500);
await page.evaluate(()=>{localStorage.clear();});await page.reload();await page.waitForTimeout(500);
await page.evaluate(()=>{const S=window.MAQ.state;S.supplier='RENALIA';S.lines=[
  {id:'L1',name:'Feeder',dn:100,bar:12,pts:[[10,50],[120,50]],specials:[],parent:null},
  {id:'L2',name:'Antenne',dn:80,bar:12,pts:[[60,50],[60,80]],specials:[],parent:{line:'L1',m:50,side:1}}];S.seq=3;window.MAQ.setMode('select');window.MAQ.rebuild();});
await page.click('#bSave');await page.waitForTimeout(200);await page.fill('#svName','Extra test');await page.click('#svOk');await page.waitForTimeout(600);
await page.click('#svGo');await page.waitForTimeout(1200);await page.selectOption('#roleSel','ethan');await page.waitForTimeout(300);
const snap=()=>page.evaluate(()=>{const T=window.TRACE;const L1=Object.values(T.lines).find(l=>!l.parent);const A=L1.cond.A;
  return {nEls:A.els.length,nJ:A.joints.length,ids:A.els.map(e=>e.id),idx:A.joints.map(j=>j.idx),welds:A.joints.map(j=>j.weldId),extra:A.joints.filter(j=>j.extra).map(j=>({id:j.weldId,idx:j.idx,m:j.m})),
    lens:A.els.map(e=>+e.len.toFixed(2)),recs:(T.net.extraWelds||[]).map(r=>({el:r.el,m:r.m,weldId:r.weldId})),next:T.state.nextWeld,site:T.state.siteId};});
let s0=await snap();console.log('0) état initial:',JSON.stringify({nEls:s0.nEls,nJ:s0.nJ,next:s0.next,first:s0.welds.slice(0,3)}));
// ── 1) bouton présent, mode pose ; tap au milieu de la 2e barre (P2) de l'aller
const btn=await page.$('#btnExtraWeld');console.log('1a) bouton « Soudure supplémentaire » présent:',!!btn);
await page.evaluate(()=>document.querySelector('#btnExtraWeld').click());await page.waitForTimeout(300);
const pose=await page.evaluate(()=>({pose:window.TRACE.state.extraPose,hint:document.querySelector('#hintbar').textContent,btn:document.querySelector('#btnExtraWeld').textContent}));
console.log('1b) mode pose + consigne:',JSON.stringify(pose));
// la 2e pièce « pipe » de l'aller, point à 4,2 m de son début
const tgt=await page.evaluate(()=>{const T=window.TRACE;const L1=Object.values(T.lines).find(l=>!l.parent);const A=L1.cond.A;const i=A.els.findIndex((e,q)=>e.kind==='pipe'&&q>0&&e.len>8);const e=A.els[i];const pl=e.axis[0];const t=4.2/e.len;
  const wx=pl[0].x+(pl[pl.length-1].x-pl[0].x)*t,wy=pl[0].y+(pl[pl.length-1].y-pl[0].y)*t;T.centerOn(wx,wy,60);return {i,id:e.id,m0:e.m0,len:e.len,wx,wy,line:L1.id};});
await page.waitForTimeout(400);
const tapAt=async(wx,wy)=>{const pt=await page.evaluate(([wx,wy])=>{const v=window.TRACE.state.view;const r=document.querySelector('#canvas').getBoundingClientRect();return {x:r.left+wx*v.k+v.tx,y:r.top+wy*v.k+v.ty};},[wx,wy]);
  await page.mouse.move(pt.x,pt.y);await page.mouse.down();await page.waitForTimeout(40);await page.mouse.up();await page.waitForTimeout(500);};
await tapAt(tgt.wx,tgt.wy);
let s1=await snap();const sheet=await page.evaluate(()=>({open:document.querySelector('#sheet').classList.contains('show'),txt:document.querySelector('#sheet').textContent.slice(0,400)}));
console.log('1c) après le tap : soudure ajoutée, barre scindée, fiche ouverte:',JSON.stringify({nEls:s1.nEls,nJ:s1.nJ,extra:s1.extra,recs:s1.recs,next:s1.next,ids:s1.ids.slice(tgt.i,tgt.i+3),lens:s1.lens.slice(tgt.i,tgt.i+2),pose:await page.evaluate(()=>window.TRACE.state.extraPose),sheetOpen:sheet.open,chip:/ajoutée sur place/.test(sheet.txt)}));
const c1=!!btn&&pose.pose===true&&s1.nEls===s0.nEls+1&&s1.nJ===s0.nJ+1&&s1.extra.length===1&&s1.extra[0].id==='S-'+String(s0.next).padStart(4,'0')&&s1.next===s0.next+1&&s1.ids[tgt.i]===tgt.id&&s1.ids[tgt.i+1]===tgt.id+'b'&&Math.abs(s1.lens[tgt.i]-4.2)<0.15&&Math.abs(s1.lens[tgt.i]+s1.lens[tgt.i+1]-tgt.len)<0.01&&s1.recs.length===1&&sheet.open&&/ajoutée sur place/.test(sheet.txt)&&(await page.evaluate(()=>window.TRACE.state.extraPose))===false;
// ── 2) cohérence : idx des soudures suivantes décalés, numérotation unique, pastille marquée ➕ sur le plan, DH wirePath traverse sans erreur
const s2=await page.evaluate(()=>{const T=window.TRACE;const L1=Object.values(T.lines).find(l=>!l.parent);const A=L1.cond.A;const ok=A.joints.every((j,q)=>q===0||j.idx>A.joints[q-1].idx);const uniq=new Set(A.joints.map(j=>j.weldId)).size===A.joints.length;
  const pos=A.joints.every(j=>!!A.els[j.idx]);let wp=null;try{wp=T.wirePath(L1.id,'A','N');}catch(e){wp={err:e.message};}
  T.closeSheet();T.renderAll();return {ok,uniq,pos,wpTotal:wp&&wp.total!==undefined?+wp.total.toFixed(1):(wp&&wp.err),mark:document.querySelectorAll('[data-extra]').length};});
console.log('2) idx croissants, numéros uniques, pastille ➕ dessinée, DH ok:',JSON.stringify(s2));const c2=s2.ok&&s2.uniq&&s2.pos&&typeof s2.wpTotal==='number'&&s2.mark>=1;
// ── 3) refus : coude / té, et trop près du bout
await page.evaluate(()=>document.querySelector('#btnExtraWeld').click());await page.waitForTimeout(200);
const tee=await page.evaluate(()=>{const T=window.TRACE;const L1=Object.values(T.lines).find(l=>!l.parent);const e=L1.cond.A.els.find(x=>x.kind==='tee');const m=window.TRACE;const mid=e.axis[0];const q={x:(mid[0].x+mid[mid.length-1].x)/2,y:(mid[0].y+mid[mid.length-1].y)/2};T.centerOn(q.x,q.y,60);return q;});
await page.waitForTimeout(300);await tapAt(tee.x,tee.y);
let s3=await snap();const t3=await page.evaluate(()=>document.querySelector('#toast').textContent);
console.log('3a) tap sur le té → refus, toujours en mode pose:',JSON.stringify({nJ:s3.nJ,toast:t3,pose:await page.evaluate(()=>window.TRACE.state.extraPose)}));
const c3a=s3.nJ===s1.nJ&&/BARRE|Touche une barre/.test(t3)&&(await page.evaluate(()=>window.TRACE.state.extraPose))===true;
const near=await page.evaluate(()=>{const T=window.TRACE;const L1=Object.values(T.lines).find(l=>!l.parent);const e=L1.cond.A.els.find(x=>x.kind==='pipe'&&x.len>1);const pl=e.axis[0];const t=0.15/e.len;const q={x:pl[0].x+(pl[pl.length-1].x-pl[0].x)*t,y:pl[0].y+(pl[pl.length-1].y-pl[0].y)*t};T.centerOn(q.x,q.y,60);return q;});
await page.waitForTimeout(300);await tapAt(near.x,near.y);
s3=await snap();const t3b=await page.evaluate(()=>document.querySelector('#toast').textContent);
console.log('3b) tap à 0,15 m du début de la ligne → refus 0,30 m:',JSON.stringify({nJ:s3.nJ,toast:t3b}));const c3b=s3.nJ===s1.nJ&&/0,30 m|Touche une barre/.test(t3b);
await page.evaluate(()=>document.querySelector('#btnExtraWeld').click());await page.waitForTimeout(200); // annuler le mode
// ── 4) PERSISTANCE : rechargement de la page → la soudure ajoutée est rejouée avec le MÊME numéro, même PK ; statut posé dessus conservé localement ? (statut via reload serveur mocké = non testé ici) 
await page.evaluate(()=>{const T=window.TRACE;const L1=Object.values(T.lines).find(l=>!l.parent);const j=L1.cond.A.joints.find(j=>j.extra);j.status='soudee';});
const siteId=s1.site;
await page.reload();await page.waitForTimeout(2500);
await page.evaluate(id=>window.TRACE.go(id),siteId);await page.waitForTimeout(1500);
await page.selectOption('#roleSel','ethan');await page.waitForTimeout(300);
const s4=await snap();console.log('4) après rechargement : rejouée, même n°, même PK, barre scindée:',JSON.stringify({site:s4.site,nEls:s4.nEls,nJ:s4.nJ,extra:s4.extra,recs:s4.recs,next:s4.next}));
const c4=s4.site===siteId&&s4.nEls===s1.nEls&&s4.nJ===s1.nJ&&s4.extra.length===1&&s4.extra[0].id===s1.extra[0].id&&Math.abs(s4.extra[0].m-s1.extra[0].m)<0.01&&s4.next===s1.next;
// ── 5) liste : tag « ajoutée » ; fiche : bouton retirer (vierge) → retrait, barre recollée, record effacé
const lst=await page.evaluate(()=>{const T=window.TRACE;T.state.tab='liste';T.renderAll();const h=document.querySelector('#liste').innerHTML;T.state.tab='plan';T.renderAll();return /➕ ajoutée/.test(h);});
await page.evaluate(()=>{const T=window.TRACE;const L1=Object.values(T.lines).find(l=>!l.parent);const q=L1.cond.A.joints.findIndex(j=>j.extra);T.openJoint(L1.id,'A',q);});await page.waitForTimeout(400);
const rm=await page.evaluate(()=>{const b=document.querySelector('#sheet [data-act="remove-extra"]');if(!b)return false;b.click();return true;});await page.waitForTimeout(500);
const s5=await snap();console.log('5) liste taguée, retrait depuis la fiche → barre recollée, record effacé:',JSON.stringify({lst,rm,nEls:s5.nEls,nJ:s5.nJ,extra:s5.extra,recs:s5.recs,lens:s5.lens.slice(tgt.i,tgt.i+2),ids:s5.ids.slice(tgt.i,tgt.i+2)}));
const c5=lst&&rm&&s5.nEls===s0.nEls&&s5.nJ===s0.nJ&&!s5.extra.length&&!s5.recs.length&&s5.ids[tgt.i]===tgt.id&&Math.abs(s5.lens[tgt.i]-tgt.len)<0.01;
// ── 6) une soudure ajoutée AVEC données n'a pas de bouton retirer
await page.evaluate(()=>document.querySelector('#btnExtraWeld').click());await page.waitForTimeout(200);await page.evaluate(([x,y])=>window.TRACE.centerOn(x,y,60),[tgt.wx,tgt.wy]);await page.waitForTimeout(300);await tapAt(tgt.wx,tgt.wy);
const s6=await page.evaluate(()=>{const T=window.TRACE;const L1=Object.values(T.lines).find(l=>!l.parent);const q=L1.cond.A.joints.findIndex(j=>j.extra);const j=L1.cond.A.joints[q];j.status='soudee';j.events=[{type:'soudee',by:'ethan',at:new Date(),photos:[]}];T.openJoint(L1.id,'A',q);return {n:L1.cond.A.joints.filter(j=>j.extra).length,id:j.weldId};});
await page.waitForTimeout(400);
const noRm=await page.evaluate(()=>({rm:!!document.querySelector('#sheet [data-act="remove-extra"]'),reset:!!document.querySelector('#sheet [data-act="reset-weld"]'),acts:[...document.querySelectorAll('#sheet [data-act]')].map(b=>b.dataset.act)}));
console.log('6) soudure ajoutée avec données : pas de retrait, mais « remettre à À souder » reste:',JSON.stringify({...s6,...noRm}));const c6=s6.n===1&&!noRm.rm&&noRm.reset;
const ALL=c1&&c2&&c3a&&c3b&&c4&&c5&&c6;
console.log('RESULTAT:',ALL?'TOUT VERT':'ECHEC '+JSON.stringify({c1,c2,c3a,c3b,c4,c5,c6}));
console.log(logs.length?logs:'[]');
await browser.close();process.exit(ALL?0:1);
