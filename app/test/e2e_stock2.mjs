// STOCK v5 (retours Ethan 25/08 soir) : mousse PAR DN + auto-ajoutée avec les manchons ; Ø gaine affiché (DN acier → enveloppe) ;
// BUG date corrigé (le modal re-rendu écrasait la saisie) ; fiche zone = provenance PIÈCE PAR PIÈCE (camion d'origine + parcours daté).
import { chromium } from 'playwright';
const BASE=process.env.BASE||'http://localhost:8765';
const browser=await chromium.launch({headless:true, executablePath: process.env.CHROMIUM_PATH||undefined});
const ctx=await browser.newContext({viewport:{width:900,height:940}});const page=await ctx.newPage();
const logs=[];page.on('pageerror',e=>logs.push('PAGEERROR: '+e.message.slice(0,300)));page.on('console',m=>{if(m.type()==='error'&&!/supabase|Failed to fetch|net::ERR|404/i.test(m.text()))logs.push(m.text().slice(0,200));});
const PNG='data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg==';
page.on('dialog',d=>d.accept());
await page.goto(BASE+'/traceur.html');await page.waitForTimeout(600);
await page.evaluate(()=>{localStorage.clear();});await page.reload();await page.waitForTimeout(600);
await page.evaluate(()=>{const S=window.MAQ.state;S.supplier='AXIOM';S.lines=[{id:'L1',name:'Feeder',dn:100,bar:12,pts:[[10,50],[110,50]],specials:[],parent:null}];S.seq=2;window.MAQ.setMode('select');window.MAQ.rebuild();});
await page.click('#bSave');await page.waitForTimeout(200);await page.fill('#svName','Stock2 test');await page.click('#svOk');await page.waitForTimeout(800);
await page.click('#svGo');await page.waitForTimeout(1500);await page.selectOption('#roleSel','ethan');await page.waitForTimeout(300);
const L=await page.evaluate(()=>Object.values(window.TRACE.lines).find(l=>!l.parent).id);
// ── 1) catalogue : un manchon DN100 → la mousse DN100 suit toute seule, Ø gaine affiché, DATE saisie conservée après re-render
await page.click('#tabbar [data-tab=stock]');await page.waitForTimeout(400);
await page.click('#stk-new');await page.waitForTimeout(300);
await page.fill('#stk-date','2026-08-28');
await page.selectOption('#stk-kind','sleeve');await page.waitForTimeout(150);
let out=await page.evaluate(()=>({od:(document.querySelector('#stk-od')||{}).textContent||''}));
console.log('1a) Ø gaine à côté du DN (manchon):',JSON.stringify(out));
const c1a=/Ø ext\. gaine ≈ \d+ mm/.test(out.od);
await page.evaluate(()=>{document.querySelector('#stk-qty').value='4';});
await page.click('#stk-add');await page.waitForTimeout(300); // re-render du modal ICI — la date saisie doit tenir
out=await page.evaluate(()=>{const rows=[...document.querySelectorAll('#stk-lines tr')].slice(1).map(r=>r.cells[0].textContent.trim()+' ×'+r.querySelector('input').value);
  return {rows,date:document.querySelector('#stk-date').value};});
console.log('1b) manchon + mousse auto, date conservée:',JSON.stringify(out));
const c1b=out.rows.length===2&&/Manchon DN100 · Ø\d+ ×4/.test(out.rows[0])&&/Mousse PU \(A\+B\) DN100 ×4/.test(out.rows[1])&&out.date==='2026-08-28';
// une barre en plus (deuxième re-render), déchargement direct (pas prévu), zone à poser
await page.selectOption('#stk-kind','pipe');await page.evaluate(()=>{document.querySelector('#stk-qty').value='2';});
await page.click('#stk-add');await page.waitForTimeout(250);
await page.evaluate(()=>{document.querySelector('#stk-prev').checked=false;});
await page.click('#stk-ok');await page.waitForTimeout(300);
await page.mouse.click(300,400);await page.waitForTimeout(400);
await page.click('#stkDone');await page.waitForTimeout(400);
out=await page.evaluate(()=>{const s=window.TRACE.net.stock;const lv=s.livs[0];return {date:lv.date,status:lv.status,lots:s.lots.map(l=>l.key).sort()};});
console.log('1c) livraison validée — la date du 28/08 a tenu:',JSON.stringify(out));
const c1c=out.date==='2026-08-28'&&out.status==='ok'&&out.lots.join(',')==='pipe:100:::12:,pu:100::::,sleeve:100::200::';
// ── 2) scission : 2 manchons + 2 mousses → « Base vie » ; les moves portent clé + camions
await page.evaluate(()=>{[...document.querySelectorAll('#stock details')].forEach(d=>d.open=true);});
await page.click('[data-stksplit]');await page.waitForTimeout(300);
await page.evaluate(()=>{document.querySelectorAll('#modal [data-stksel]').forEach(cb=>{const tr=cb.closest('tr');cb.checked=/Manchon|Mousse/.test(tr.textContent);if(cb.checked)document.querySelector('#modal [data-stksq="'+cb.dataset.stksel+'"]').value='2';});
  const d2=document.querySelector('#stk-dest');d2.value='__new';d2.dispatchEvent(new Event('change'));document.querySelector('#stk-destname').value='Base vie';});
await page.click('#stk-splitok');await page.waitForTimeout(300);
await page.mouse.click(540,300);await page.waitForTimeout(400);
await page.click('#stkDone');await page.waitForTimeout(300);
out=await page.evaluate(()=>{const s=window.TRACE.net.stock;const mv=s.moves.filter(m=>!m.zoneMove);return {n:mv.length,keys:mv.map(m=>m.key).sort(),livs:mv.every(m=>Array.isArray(m.livs)&&m.livs.length===1)};});
console.log('2) transferts tracés avec clé + camion:',JSON.stringify(out));
const c2=out.n===2&&out.keys.join(',')==='pu:100,sleeve:100'&&out.livs; // clé de RAPPROCHEMENT sur les moves (le parcours se reconstruit avec)
// ── 3) fiche de la zone Base vie : provenance PIÈCE PAR PIÈCE — camion d'origine + parcours « Zone 1 → ici » daté
out=await page.evaluate(()=>{const s=window.TRACE.net.stock;const z2=s.zones.find(z=>z.name==='Base vie');window.TRACE.openStockZoneModal(z2.id);
  const t=document.querySelector('#modal').textContent;return {prov:/Provenance — pièce par pièce/.test(t),manchon:/Manchon DN100 · Ø\d+/.test(t),camion:/🚚 Camion 1/.test(t),ici:/→ ici le \d{2}\/\d{2}/.test(t),dech:/déchargé \d{2}\/\d{2}/.test(t),chips:document.querySelectorAll('#modal [data-stklivz]').length};});
console.log('3a) provenance détaillée dans la fiche zone:',JSON.stringify(out));
const c3a=out.prov&&out.manchon&&out.camion&&out.ici&&out.dech&&out.chips>=2;
await page.evaluate(()=>document.querySelector('#modal [data-stklivz]').click());await page.waitForTimeout(300);
out=await page.evaluate(()=>({t:(document.querySelector('#modal')||{textContent:''}).textContent.slice(0,400)}));
console.log('3b) chip camion → fiche livraison:',JSON.stringify({ok:/Camion 1/.test(out.t)&&/Reste|reste/.test(out.t)}));
const c3b=/Camion 1/.test(out.t)&&/reste/i.test(out.t);
await page.evaluate(()=>{const m=document.querySelector('#modal [data-close]');if(m)m.click();});await page.waitForTimeout(200);
// ── 4) la zone d'origine aussi : ses pièces = « déchargé directement ici »
out=await page.evaluate(()=>{const s=window.TRACE.net.stock;window.TRACE.openStockZoneModal(s.zones[0].id);
  const t=document.querySelector('#modal').textContent;return {direct:/déchargé directement ici/.test(t)};});
console.log('4) zone de déchargement : « déchargé directement ici »:',JSON.stringify(out));
const c4=out.direct;
await page.evaluate(()=>{const m=document.querySelector('#modal [data-close]');if(m)m.click();});await page.waitForTimeout(200);
// ── 5) besoin par DN dans le récap (Mousse PU DN100), et moussage étape 4 : mousse du DN + repli générique
await page.evaluate(()=>{const s=window.TRACE.net.stock; // un vieux stock de mousse SANS DN quelque part : il doit dépanner
  s.lots.push({id:'OLD1',liv:null,zone:s.zones[0].id,key:'pu:',label:'Mousse PU (A+B)',kind:'pu',qty:3});window.TRACE.renderAll();});
await page.click('#tabbar [data-tab=stock]');await page.waitForTimeout(400);
await page.evaluate(()=>{[...document.querySelectorAll('#stock details')].forEach(d=>d.open=true);});
out=await page.evaluate(()=>{const t=document.querySelector('#stock').textContent;return {dn:/Mousse PU \(A\+B\) DN100/.test(t),gen:/Mousse PU \(A\+B\)(?! DN)/.test(t)};});
console.log('5a) récap : mousse par DN + ligne générique à part:',JSON.stringify(out));
const c5a=out.dn&&out.gen;
await page.evaluate(({L,PNG})=>{const T=window.TRACE;const j=T.lines[L].cond.A.joints[1];const now=new Date().toISOString();
  j.steps={1:{done:true,by:'t',at:now,photos:[PNG]},2:{done:true,by:'t',at:now,photos:[]},3:{done:true,by:'t',at:now,photos:[PNG],press:true,type:'retracte'}};j.status='manchonnee';
  T.openJoint(L,'A',1);setTimeout(()=>document.querySelectorAll('#sheet details').forEach(d=>d.open=true),60);},{L,PNG});
await page.waitForTimeout(500);
out=await page.evaluate(()=>{const ds=[...document.querySelectorAll('#sheet .dstep')][3];
  return {lab:/Mousse PU \(A\+B\) DN100/.test(ds.textContent),chips:ds.querySelectorAll('[data-stkneed="pu"]').length};});
console.log('5b) étape 4 : mousse demandée AU DN, zones DN100 + générique proposées:',JSON.stringify(out));
const c5b=out.lab&&out.chips>=3; // Z1 (pu:100 restant + générique), Base vie (pu:100), hors stock
await page.evaluate(()=>document.querySelector('#sheet [data-stepok="4"]').click());await page.waitForTimeout(500);
out=await page.evaluate(({L})=>{const s=window.TRACE.net.stock;const t=s.takes.find(t2=>/^pu/.test(t2.key));const j=window.TRACE.lines[L].cond.A.joints[1];
  return {key:t&&t.key,zone:t&&t.zone,d4:!!(j.steps[4]&&j.steps[4].done)};},{L});
console.log('5c) moussage validé → take pu:100:',JSON.stringify(out));
const c5c=out.key==='pu:100'&&!!out.zone&&out.d4;
const ALL=c1a&&c1b&&c1c&&c2&&c3a&&c3b&&c4&&c5a&&c5b&&c5c;
console.log('RESULTAT:',ALL?'TOUT VERT':'ECHEC '+JSON.stringify({c1a,c1b,c1c,c2,c3a,c3b,c4,c5a,c5b,c5c}));
console.log(logs.length?logs:'[]');
await browser.close();
process.exit(ALL?0:1);
