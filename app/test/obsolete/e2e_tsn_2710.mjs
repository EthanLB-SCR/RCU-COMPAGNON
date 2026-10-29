// 27/10 soir (Ethan : « une zone où j'ai plein de modifs de coudes ne me met pas de pastille » ; « sur une antenne j'ai groupé des modifs mais une pastille 9 est apparue » ;
// « l'export est parfait mais le lien téléchargé est “user ethan le bihan…”, si je l'envoie à quelqu'un il ne peut pas l'ouvrir ») — réseau FICTIF.
// c1 une zone avec deux paquets de coudes (2 bosses, 16 coudes aller + retour) à 100 m l'un de l'autre, sans ancre entre : UNE modif, mais une pastille sur CHAQUE paquet (même lettre)
// c2 lettres : candidat « a » (carte de l'onglet, plan interactif, export) ; qualifié → numéro stable = celui de l'id (carte, plan, export)
// c3 numéros stables : une 2e modif arrive (lettre a), le numéro de la 1re ne bouge pas ; regroupement → le groupe prend un numéro neuf, rien d'autre ne change
// c4 marché sans soudures mémorisées (estimation) : une fois la zone qualifiée, pas de candidat « reste » fantôme (arrondis ≤ 2 soudures / 1 ml) ; au-delà : encart « Restes non localisés » (sans pastille), « Garder pour mémoire »
// c5 fichier de diagnostic : sans photos, rechargeable comme un chantier → mêmes candidats
// c6 fenêtres d'export : barre ⬇ fichier / 🖨 PDF / 📤 envoyer (script embarqué), pas de lien local · c7 console propre
import { chromium } from 'playwright';
const BASE=process.env.BASE||'http://localhost:8765';const SHOTS=process.env.SHOTS||null;
const browser=await chromium.launch({headless:true, executablePath: process.env.CHROMIUM_PATH||undefined});
const C={};const logs=[];
const ctx=await browser.newContext({viewport:{width:1366,height:900},deviceScaleFactor:1});const page=await ctx.newPage();
page.on('pageerror',e=>logs.push('PAGEERROR: '+e.message.slice(0,300)));page.on('console',m=>{if(m.type()==='error'&&!/supabase|Failed to fetch|net::ERR|404|geopf|WebSocket/i.test(m.text()))logs.push(m.text().slice(0,200));});page.on('dialog',d=>d.accept().catch(()=>{}));
const shot=async n=>{if(SHOTS)await page.screenshot({path:`${SHOTS}/tsn_${n}.png`});};
await page.goto(BASE+'/traceur.html');await page.waitForTimeout(500);await page.evaluate(()=>localStorage.clear());await page.reload();await page.waitForTimeout(500);
await page.evaluate(()=>{const S=window.MAQ.state;S.lines=[{id:'L1',name:'Rue Fictive',dn:100,bar:12,pts:[[0,0],[150,0],[150,80],[400,80]],specials:[{id:'v1',type:'valve',m:20},{id:'t1',type:'tee',m:100}],parent:null}];S.seq=2;window.MAQ.setMode('select');window.MAQ.rebuild();});
await page.click('#bSave');await page.waitForTimeout(200);await page.fill('#svName','Pastilles test');await page.click('#svOk');await page.waitForTimeout(800);
await page.click('#svGo');await page.waitForTimeout(1500);await page.selectOption('#roleSel','ethan');await page.waitForTimeout(300);
const siteId=await page.evaluate(()=>window.TRACE.state.siteId);
// retracé : deux bosses de 40 m × 30 m, à 100 m l'une de l'autre, sans ancre entre (PK ≈ 270 → 310 et 410 → 450)
await page.goto(BASE+'/traceur.html?site='+encodeURIComponent(siteId));await page.waitForTimeout(1500);
await page.evaluate(()=>{const S=window.MAQ.state;const l=S.lines.find(x=>x.id==='L1');l.pts=[[0,0],[150,0],[150,80],[190,80],[190,110],[230,110],[230,80],[330,80],[330,110],[370,110],[370,80],[400,80]];window.MAQ.rebuild();});
await page.click('#bSave');await page.waitForTimeout(200);await page.selectOption('#svMode','update');await page.click('#svOk');await page.waitForTimeout(800);
await page.click('#svGo');await page.waitForTimeout(1500);await page.selectOption('#roleSel','ethan');await page.waitForTimeout(300);
await page.evaluate(()=>{const T=window.TRACE;T.state.tab='ts';T.renderAll();});await page.waitForTimeout(400);
let o=await page.evaluate(()=>{const T=window.TRACE;const cs=T.ts.candidates();return {cs:cs.map(c=>({kind:c.kind,where:c.where,label:c.label,qty:c.qty,zone:c.zone,pcs:(c.pcs||[]).map(p=>Math.round(p.m))})),heads:[...document.querySelectorAll('#tsview .tsCard.cand .tsHead')].map(h=>h.textContent.replace(/[\s  ]+/g,' ').trim()),mini:[...document.querySelectorAll('#tsview [data-tscandmini] text')].map(t=>t.textContent)};});
console.log('c1) candidats :',JSON.stringify(o));
await page.evaluate(()=>window.TRACE.ts.map().open());await page.waitForTimeout(500);
let m=await page.evaluate(()=>{const el=document.getElementById('tsMap');const gs=[...el.querySelectorAll('[data-tsmn]')];const pos=gs.map(g=>{const c=g.querySelector('circle');const r=c.getBoundingClientRect();return {k:g.dataset.tsmn,x:Math.round(r.left),y:Math.round(r.top),t:(g.querySelector('text')||{}).textContent};});return {n:gs.length,pos};});
await shot('1_map');console.log('c1) pastilles :',JSON.stringify(m));
C.c1=o.cs.length===1&&o.cs[0].qty.coudes===16&&o.cs[0].zone&&o.cs[0].zone.m0<280&&o.cs[0].zone.m1>440&&m.n===2&&m.pos.every(p=>p.k==='c0'&&p.t==='a')&&Math.abs(m.pos[0].x-m.pos[1].x)>120&&/^[▾▸]?\s*a \?/.test(o.heads[0]||'')&&o.mini.every(t=>t==='a');
// ── c2) lettres / numéros : export avec le candidat ; qualifier → numéro de l'id
await page.click('#tsMap [data-tsmclose]');await page.waitForTimeout(300);
let x=await page.evaluate(()=>{const T=window.TRACE;const h=T.ts.exportHTML({sel:['c0']});const m2=h.match(/font-weight:800;font-size:13px;margin-right:6px;vertical-align:middle">([^<]+)</);return {badge:m2?m2[1]:null,bar:/xDl\(\)/.test(h)&&/Télécharger le fichier/.test(h)&&/function xDl\(\)/.test(h),noLocal:!/file:\/\//.test(h)};});
await page.selectOption('#tsview [data-tscet="0"]','propose');await page.click('#tsview [data-tscok="0"]');await page.waitForTimeout(300);
const modal=await page.evaluate(()=>!!document.querySelector('#modal #tsqDevis'));if(modal){await page.fill('#modal #tsqDesig','Deux bosses');await page.fill('#modal #tsqDevis','DEV-N1');await page.click('#modal #tsqOk');await page.waitForTimeout(400);}
o=await page.evaluate(()=>{const T=window.TRACE;const it=T.ts.of().items.find(i=>i.ts==='DEV-N1');const n=T.ts.numOf(it);const chip=document.querySelector(`#tsview [data-tscard="${it.id}"] .tsNum`);const h=T.ts.exportHTML({sel:[it.id]});const m2=h.match(/font-weight:800;font-size:13px;margin-right:6px;vertical-align:middle">([^<]+)</);return {id:it.id,n,chip:chip?chip.textContent:null,exp:m2?m2[1]:null,cands:T.ts.candidates().length};});
await page.evaluate(()=>window.TRACE.ts.map().open());await page.waitForTimeout(500);
m=await page.evaluate(()=>{const el=document.getElementById('tsMap');return [...el.querySelectorAll('[data-tsmn]')].map(g=>g.dataset.tsmn+':'+(g.querySelector('text')||{}).textContent);});
await shot('2_num');console.log('c2) lettres / numéros :',JSON.stringify({x,o,m}));
C.c2=x.badge==='a'&&x.bar&&x.noLocal&&o.n>0&&o.chip===String(o.n)&&o.exp===String(o.n)&&o.cands===0&&m.length===2&&m.every(s=>s===o.id+':'+o.n);
const N1=o.n,ID1=o.id;
// ── c3) une 2e modif (vanne PK 60) : lettre a ; le numéro de la 1re ne bouge pas ; regroupement → numéro neuf
await page.click('#tsMap [data-tsmclose]');await page.waitForTimeout(200);
await page.goto(BASE+'/traceur.html?site='+encodeURIComponent(siteId));await page.waitForTimeout(1500);
await page.evaluate(()=>{const S=window.MAQ.state;const l=S.lines.find(x=>x.id==='L1');l.specials.push({id:'v3',type:'valve',m:60});window.MAQ.rebuild();});
await page.click('#bSave');await page.waitForTimeout(200);await page.selectOption('#svMode','update');await page.click('#svOk');await page.waitForTimeout(800);
await page.click('#svGo');await page.waitForTimeout(1500);await page.selectOption('#roleSel','ethan');await page.waitForTimeout(300);
await page.evaluate(()=>{const T=window.TRACE;T.state.tab='ts';T.renderAll();T.ts.map().open();});await page.waitForTimeout(500);
m=await page.evaluate(()=>{const el=document.getElementById('tsMap');return [...el.querySelectorAll('[data-tsmn]')].map(g=>g.dataset.tsmn+':'+(g.querySelector('text')||{}).textContent).sort();});
const before=m.slice();
await page.evaluate(()=>{const el=document.getElementById('tsMap');['c0',window.TRACE.ts.of().items.find(i=>i.ts==='DEV-N1').id].forEach(k=>el.querySelector(`[data-tsmn="${k}"]`).dispatchEvent(new MouseEvent('click',{bubbles:true,cancelable:true})));});await page.waitForTimeout(300);
await page.click('#tsMap [data-tsmgroup]');await page.waitForTimeout(400);
const modal2=await page.evaluate(()=>!!document.querySelector('#modal #tsqDevis'));if(modal2){await page.fill('#modal #tsqDesig','Groupe pastilles');await page.fill('#modal #tsqDevis','DEV-G1');await page.click('#modal #tsqOk');await page.waitForTimeout(400);}
o=await page.evaluate(()=>{const T=window.TRACE;const g=T.ts.of().items.find(i=>i.kind==='group');const el=document.getElementById('tsMap');const bs=[...el.querySelectorAll('[data-tsmn]')].map(x=>x.dataset.tsmn+':'+(x.querySelector('text')||{}).textContent).sort();const m1=T.ts.of().items.find(i=>i.ts==='DEV-N1');return {g:g?{id:g.id,n:T.ts.numOf(g),members:g.members.length}:null,bs,m1:{etat:m1.etat,n:T.ts.numOf(m1)},cands:T.ts.candidates().length,side:(el.querySelector('.tsmN')||{}).textContent};});
await shot('3_groupe');console.log('c3) stable :',JSON.stringify({before,o}));
C.c3=before.length===3&&before.includes('c0:a')&&before.filter(s=>s===ID1+':'+N1).length===2&&!!o.g&&o.g.n>N1&&o.g.members===2&&o.m1.n===N1&&o.m1.etat==='grouped'&&o.cands===0&&o.bs.length===3&&o.bs.every(s=>s===o.g.id+':'+o.g.n)&&o.side===String(o.g.n);
// ── c4) marché sans soudures mémorisées : zone estimée, qualifiée → aucun « reste » fantôme
await page.click('#tsMap [data-tsmclose]');await page.waitForTimeout(200);
await page.goto(BASE+'/traceur.html?site='+encodeURIComponent(siteId));await page.waitForTimeout(1500);
await page.evaluate(()=>{const S=window.MAQ.state;const l=S.lines.find(x=>x.id==='L1');l.pts.push([400,120],[440,120]);window.MAQ.rebuild();}); /* +80 ml, 2 coudes en bout */
await page.click('#bSave');await page.waitForTimeout(200);await page.selectOption('#svMode','update');await page.click('#svOk');await page.waitForTimeout(800);
await page.click('#svGo');await page.waitForTimeout(1500);await page.selectOption('#roleSel','ethan');await page.waitForTimeout(300);
o=await page.evaluate(()=>{const T=window.TRACE;const M=T.ts.marche();M.lines.forEach(x=>{delete x.wk;});T.state.tab='ts';T.renderAll();const cs=T.ts.candidates();return {cs:cs.map(c=>({label:c.label,estim:!!c.estim,qty:c.qty,rest:!!c.rest}))};});
console.log('c4) estimation :',JSON.stringify(o));
const iE=o.cs.findIndex(c=>c.estim&&c.qty.coudes===4);const c4a=iE>=0&&o.cs.length===1;
if(iE>=0){const dbg0=await page.evaluate(i=>{const c=document.querySelector(`#tsview [data-tscard="c${i}"]`);return {card:!!c,fold:c?c.className:'',sel:!!document.querySelector(`#tsview [data-tscet="${i}"]`),ok:!!document.querySelector(`#tsview [data-tscok="${i}"]`)};},iE);console.log('c4) dbg0',JSON.stringify(dbg0));
  await page.selectOption(`#tsview [data-tscet="${iE}"]`,'propose');await page.click(`#tsview [data-tscok="${iE}"]`);await page.waitForTimeout(300);const md=await page.evaluate(()=>!!document.querySelector('#modal #tsqDevis'));if(md){await page.fill('#modal #tsqDesig','Bout estimé');await page.fill('#modal #tsqDevis','DEV-E1');await page.click('#modal #tsqOk');await page.waitForTimeout(400);}
  const dbg1=await page.evaluate(()=>({modal:document.getElementById('modal').className,toast:(document.getElementById('toast')||{}).textContent,items:window.TRACE.ts.of().items.map(x=>x.id+':'+x.etat+':'+(x.ts||'')+':'+((x.qty||{}).soud||0))}));console.log('c4) dbg1',JSON.stringify({md,dbg1}));}
o=await page.evaluate(()=>{const T=window.TRACE;const D=T.ts.diff();const r=D.rows.find(x=>x.id==='L1');const marked=T.ts.of().items.filter(x=>T.ts.live(x)).reduce((s,x)=>s+((x.qty||{}).soud||0),0);const cs=T.ts.candidates();return {dSoud:r.d.soud,marked,cs:cs.map(c=>c.label),rest:cs.filter(c=>c.rest).length};});
console.log('c4) après qualification :',JSON.stringify(o));
/* on force l'écart d'estimation : 2 soudures de moins dans la marque → rien ; 5 de moins → un « reste non localisé » (encart, sans pastille ni lettre), « Garder pour mémoire » → marque note ; puis on remet */
const o4=await page.evaluate(()=>{const T=window.TRACE;const it=T.ts.of().items.find(x=>x.ts==='DEV-E1');const s0=it.qty.soud;it.qty.soud=s0-2;const a=T.ts.candidates().length+T.ts.rests().length;it.qty.soud=s0-5;const b=T.ts.candidates().length;const R=T.ts.rests().map(c=>({label:c.label,qty:c.qty,def:c.def}));T.renderAll();const el=document.getElementById('tsview');return {a,b,R,notice:/Restes non localisés/.test(el.textContent),btn:!!el.querySelector('[data-tsrest="0"]'),badges:el.querySelectorAll('.tsOverview [data-tscandmini]').length,s0};});
await page.click('#tsview [data-tsrest="0"]');await page.waitForTimeout(400);
const o5=await page.evaluate(()=>{const T=window.TRACE;const notes=T.ts.of().items.filter(x=>x.etat==='note').map(x=>x.qty);const rests=T.ts.rests().length;const n=T.ts.of().items.find(x=>x.etat==='note'&&x.qty&&x.qty.soud===5);if(n)T.ts.remove(n.id);const it=T.ts.of().items.find(x=>x.ts==='DEV-E1');it.qty.soud=20;return {notes,rests,after:T.ts.candidates().length+T.ts.rests().length};});
console.log('c4) écart forcé :',JSON.stringify({o4,o5}));
C.c4=c4a&&o.cs.length===0&&o.rest===0&&o.dSoud===o.marked&&o4.a===0&&o4.b===0&&o4.R.length===1&&o4.R[0].def==='note'&&o4.R[0].qty.soud===5&&/reste non localisé/.test(o4.R[0].label)&&o4.notice&&o4.btn&&o4.badges===0&&o5.notes.some(q=>q&&q.soud===5)&&o5.rests===0&&o5.after===0;
// ── c5) diagnostic
o=await page.evaluate(async()=>{const T=window.TRACE;const d=T.ts.diag();const s=JSON.stringify(d);const n0=T.ts.candidates().length;const items0=T.ts.of().items.length;const d2=JSON.parse(s);d2.id='diag_'+d2.id;d2.name='Diag copie';T.etude.addSite(d2);await T.go(d2.id);return {format:d.format,keys:Object.keys(d),photos:/"photos":\[[^\]]/.test(s),drawing:'drawing' in d,n0,n1:T.ts.candidates().length,items0,items1:T.ts.of().items.length,size:s.length};});
console.log('c5) diagnostic :',JSON.stringify(o));
C.c5=o.format==='trace-diag-modifs'&&o.keys.includes('marche')&&o.keys.includes('ts')&&o.keys.includes('lines')&&!o.photos&&!o.drawing&&o.n1===o.n0&&o.items1===o.items0&&o.size<2e6;
// ── c6) barre d'envoi dans toutes les fenêtres d'export (docHTML)
o=await page.evaluate(()=>{const T=window.TRACE;const h=T.ts.exportHTML();return {ts:/class="np xbar"/.test(h)&&/xShare\(\)/.test(h)&&/n'existe que sur ton appareil/.test(h),print:/onclick="print\(\)"/.test(h)};});
console.log('c6) barre d\'envoi :',JSON.stringify(o));C.c6=o.ts&&o.print;
// ── c7
C.c7=logs.length===0;console.log('c7) console :',JSON.stringify(logs.slice(0,5)));
await browser.close();
const bad=Object.keys(C).filter(k=>!C[k]);console.log(bad.length?'RESULTAT: ECHEC '+bad.join(','):'RESULTAT: TOUT VERT');
