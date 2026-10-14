// ATELIER DPGF · PRIX COMPOSÉS ET POINTAGE (14/10/2026 nuit, agent tests). Ethan : « un espace qui aide à remplir le DPGF, avec les prix au ml de chaque poste
// par zone ; pouvoir grouper deux postes, trois, tous les postes ; prix ventilé au ml, à l'unité ; puis en fonction des lignes du DPGF c'est du pointage :
// j'ai 500 ml de DN 400, je veux 3 postes noyés dans mon prix au ml, je les relie, ça calcule le prix au ml ; sur cette ligne il y a 220 ml, j'en pointe 220,
// ça me dit qu'il reste 280 ml à pointer à ce prix ».
// 1) mode par défaut « 🧮 Prix composés · pointage » : postes de la zone (vente, € / ml) ; 2) composé de 2 postes au ml (prix = somme ÷ ml de la zone, cohérent
// avec le chiffrage) ; 3) composé de 3 postes à l'unité ; 4) « tous les postes → un prix au ml » = le prix au ml du chiffrage ; 5) pointage partiel (220 sur
// 1 240 ml) → « reste à pointer » juste ; 6) pointage du reste, dépassement signalé, retrait d'un pointage ; 7) appliquer au DPGF (PU des lignes, total = prix
// de vente) ; 8) retrait d'un prix composé (et de ses pointages) ; 8 b) modification (base 600 → 500 : prix recalculé, « trop pointé ») ; 8 c) pointage depuis
// la 2e fenêtre (⧉ autre écran) ; 9) téléphone 390 px : pas de débordement horizontal, fenêtre de pointage dans l'écran.
// Classeur et DPGF = fixtures FICTIVES (test/fixture_prix.xlsx, test/fixture_dpgf.xlsx) ; hors connexion.
import { chromium } from 'playwright';
import path from 'path';import {fileURLToPath} from 'url';
const HERE=path.dirname(fileURLToPath(import.meta.url));
const BASE=process.env.BASE||'http://localhost:8765';
const browser=await chromium.launch({headless:true, executablePath: process.env.CHROMIUM_PATH||undefined});
const ctx=await browser.newContext({viewport:{width:1280,height:900}});const page=await ctx.newPage();
const logs=[];page.on('pageerror',e=>logs.push('PAGEERROR: '+e.message.slice(0,300)));page.on('console',m=>{if(m.type()==='error'&&!/supabase|Failed to fetch|net::ERR|404|WebSocket|pdf\.worker|cdnjs/i.test(m.text()))logs.push(m.text().slice(0,200));});
page.on('dialog',d=>d.accept().catch(()=>{}));
const C={};const wait=ms=>page.waitForTimeout(ms);const NUM='O2610-17';
await page.goto(BASE+'/index.html');await wait(600);await page.evaluate(()=>{localStorage.clear();localStorage.setItem('trace:wide','1');});await page.evaluate(()=>new Promise(r=>{try{const q=indexedDB.deleteDatabase('trace-kv');q.onsuccess=q.onerror=q.onblocked=()=>r();}catch(e){r();}}));
await page.reload();await wait(1200);
{const s=await page.$('#loginSkip');if(s&&await s.isVisible())await s.click();await wait(700);}
const chg=async(sel,val)=>{await page.evaluate(([s,v])=>{const el=document.querySelector(s);if(!el)throw new Error('absent '+s);if(el.type==='checkbox'){el.checked=!!v;}else el.value=v;el.dispatchEvent(new Event('change',{bubbles:true}));},[sel,val]);await wait(120);};
const click=async v=>{await page.evaluate(v=>{const el=document.querySelector(`#eq-app [data-act=af][data-v="${v}"]`);if(!el)throw new Error('bouton absent '+v);el.click();},v);await wait(220);};
const sp=t=>String(t||'').replace(/[\s  ]+/g,' ').trim();
const frN=(x,d=2)=>(+x).toLocaleString('fr-FR',{minimumFractionDigits:d,maximumFractionDigits:d}).replace(/[\s  ]/g,' ');
const enc=encodeURIComponent;
/* l'état calculé (dpgfTranslate) et le chiffrage, lus dans la page */
const ST=()=>page.evaluate(n=>{const T=window.TRACE.affaires;const a=T.get(n);const X=T.dpgfTranslate(a);const Cc=T.calc(a);
  return {compo:X.compo.map(c=>({id:c.id,nom:c.nom,keys:c.keys,mode:c.mode,unitLabel:c.unitLabel,base:c.base,zone:c.zone,tot:c.tot,unit:c.unit,pointe:c.pointe,reste:c.reste})),
    map:(a.dpgf||{}).map||{},lignes:((a.dpgf||{}).lignes||[]).map(l=>({n:l.n,qte:l.qte,u:l.u,pu:l.pu,section:!!l.section})),perLine:X.perLine.map(x=>({i:x.i,amt:x.amt,ptAmt:x.ptAmt,pu:x.pu,total:x.total})),
    assigned:X.assigned,reste:X.reste,vente:X.vente,total:Cc.total,parMl:Cc.parMl,ml:Cc.ml,coef:Cc.coef,
    opts:X.S.opts.filter(o=>/^[pb]\|0\|/.test(o.key)).map(o=>({key:o.key,label:o.label,vente:o.vente})),
    postes:Object.fromEntries(Object.entries(Cc.etudes[0].r.postes).map(([k,p])=>[k,p.achat]))};},NUM);
// ── mise en place : affaire, classeur (base), une zone DN 100 × 100 soudures / 600 ml + purges, SST, base vie, épreuve (assez de postes pour grouper 2, 3 puis le reste), le DPGF du client
await page.evaluate(async n=>{const T=window.TRACE;T.state.userId='ethan';T.renderHome();document.getElementById('htCom').click();await new Promise(x=>setTimeout(x,250));
  document.querySelector('#eq-app [data-act=af][data-v="new|"]').click();await new Promise(x=>setTimeout(x,150));document.getElementById('afn-num').value=n;document.getElementById('afn-nom').value='Prix composés';document.getElementById('afn-client').value='CORIANCE';document.getElementById('afn-etat').value='devis';
  document.querySelector('#eq-app [data-act=af][data-v="create|"]').click();await new Promise(x=>setTimeout(x,250));document.querySelector('#eq-app [data-act=af][data-v="tab|chiffrage"]').click();await new Promise(x=>setTimeout(x,200));},NUM);
await page.setInputFiles('#eq-app input[data-afprix]',path.join(HERE,'fixture_prix.xlsx'));await wait(1500);
await click('chetudeadd|');await click('chadd|dn');await chg('#eq-app [data-afx="e§dn.0.dn"]','100');await chg('#eq-app [data-afx="e§dn.0.soud"]','100');await chg('#eq-app [data-afx="e§dn.0.ml"]','600');
const unfold=async k=>{if(await page.evaluate(k=>{const c=document.querySelector(`#eq-app .ch-bloc[data-bloc="${k}"]`);return !!c&&c.classList.contains('folded');},k))await click('chfold|'+k);};
await unfold('purges');await chg('#eq-app [data-afx="e§purges.dn"]','32');await chg('#eq-app [data-afx="e§purges.paires"]','3');
await unfold('sst');await click('chadd|sst');await chg('#eq-app [data-afx="e§sst.0.type"]','sst_vannes_bs_pn25');await chg('#eq-app [data-afx="e§sst.0.dn"]','50');await chg('#eq-app [data-afx="e§sst.0.paires"]','2');
await unfold('chantier');await chg('#eq-app [data-afx="e§chantier.d0"]','2026-11-02');await chg('#eq-app [data-afx="e§chantier.d1"]','2026-11-12');await chg('#eq-app [data-afx="e§chantier.benne"]',true);await chg('#eq-app [data-afx="e§chantier.wc"]',true);
await unfold('hydro');await click('chadd|hydro.zones.0.rows');await chg('#eq-app [data-afx="e§hydro.zones.0.rows.0.dn"]','100');await chg('#eq-app [data-afx="e§hydro.zones.0.rows.0.ml"]','1200');
await click('tab|dpgf');await page.setInputFiles('#eq-app [data-afdpgf]',path.join(HERE,'fixture_dpgf.xlsx'));await wait(900);
// ── 1) mode par défaut : « 🧮 Prix composés · pointage » ; à gauche les postes de la zone (vente, € / ml de la zone) ; consigne ① ② ③
let s0=await ST();
let out=await page.evaluate(()=>{const on=b=>!!b&&b.classList.contains('active');const q=s=>document.querySelector('#eq-app '+s);
  return {compo:on(q('[data-act=af][data-v="dwmode|compo"]')),couts:on(q('[data-act=af][data-v="dwmode|couts"]')),idle:sp0((q('.cm-dwsel.idle')||{}).textContent),
    zchips:[...document.querySelectorAll('#eq-app .cm-dwl [data-v^="dwzone|"]')].map(b=>b.textContent.trim()),
    head:[...document.querySelectorAll('#eq-app .cm-dwpt tr:first-child th')].map(t=>sp0(t.textContent)),
    rows:[...document.querySelectorAll('#eq-app .cm-dwpt tr')].slice(1).map(r=>({pk:!!r.querySelector('input[data-v^="dwpick|"]'),key:(r.querySelector('input[data-v^="dwpick|"]')||{dataset:{}}).dataset.v,t:sp0(r.cells[1]&&r.cells[1].textContent),v:sp0(r.cells[2]&&r.cells[2].textContent),ml:sp0(r.cells[3]&&r.cells[3].textContent)})),
    groupDisabled:(q('[data-act=af][data-v="dwgroup|"]')||{}).disabled,none:/Aucun prix composé/.test((q('.cm-dwl')||{}).textContent||''),grid:document.querySelectorAll('#eq-app .cm-dwt tr.cm-dwrow').length};
  function sp0(t){return String(t||'').replace(/[\s  ]+/g,' ').trim();}});
const oSou=s0.opts.find(o=>/Soudure/.test(o.label)),oMan=s0.opts.find(o=>/› Manchons$/.test(o.label));
const rowOf=k=>out.rows.find(r=>r.key==='dwpick|'+enc(k));
console.log('1) mode par défaut :',JSON.stringify({...out,opts:s0.opts.map(o=>o.label.replace(/^.*? › /,'')+' '+Math.round(o.vente))}));
C.c1=out.compo&&!out.couts&&/Regrouper/.test(out.idle)&&/pointe la quantité/.test(out.idle)&&out.zchips.join()==='Zone 1'&&out.head[1]==='Poste · Zone 1'&&/€ \/ ml \(600 ml\)/.test(out.head[3])
  &&s0.opts.length>=6&&out.rows.length===s0.opts.length&&out.rows.every(r=>r.pk)&&oSou&&oMan&&rowOf(oSou.key)&&rowOf(oSou.key).ml===frN(oSou.vente/600)&&rowOf(oMan.key).ml===frN(oMan.vente/600)
  &&out.groupDisabled===true&&out.none&&out.grid===5;
// ── 2) composé de DEUX postes au ml : Soudure + Manchons → « 🔗 Regrouper (2) » → fenêtre (base = ml de la zone, aperçu du prix) → prix au ml = (vente soudure + manchons) ÷ 600
await click('dwpick|'+enc(oSou.key));await click('dwpick|'+enc(oMan.key));
out={btn:await page.evaluate(()=>{const b=document.querySelector('#eq-app [data-act=af][data-v="dwgroup|"]');return b?{t:b.textContent.replace(/\s+/g,' ').trim(),dis:b.disabled}:null;}),checked:await page.evaluate(()=>[...document.querySelectorAll('#eq-app .cm-dwpt input[data-v^="dwpick|"]:checked')].length)};
await click('dwgroup|');await wait(150);
out.dlg=await page.evaluate(()=>{const b=document.getElementById('cm-dwplace');if(!b)return null;return {h:b.querySelector('h3').textContent,postes:b.querySelector('.cm-dwpl b').textContent,mode:b.querySelector('#dwc-mode').value,base:b.querySelector('#dwc-base').value,ulHidden:b.querySelector('#dwc-ul').hidden,prev:b.querySelector('#dwc-prev').textContent.replace(/[\s  ]+/g,' ')};});
await page.evaluate(()=>{document.getElementById('dwc-nom').value='DN 100 · soudure + manchons';document.getElementById('dwc-ok').click();});await wait(300);
let s=await ST();const cA=s.compo[0]||{};const expA=(s.postes.soudure+s.postes.manchons)/s.coef;
out.A=cA;out.toast=await page.evaluate(()=>document.getElementById('toast').textContent);
out.ui=await page.evaluate(()=>({band:(document.querySelector('#eq-app .cm-dwsel')||{}).textContent||'',cc:[...document.querySelectorAll('#eq-app .cm-cc')].map(x=>({t:x.textContent.replace(/[\s  ]+/g,' ').trim(),on:x.classList.contains('on')})),dots:document.querySelectorAll('#eq-app .cm-dwpt .cm-cdot').length,picked:document.querySelectorAll('#eq-app .cm-dwpt input[data-v^="dwpick|"]:checked').length,targets:document.querySelectorAll('#eq-app .cm-dwrow.target').length}));
console.log('2) composé de 2 postes au ml :',JSON.stringify({...out,expA}));
C.c2=out.btn&&/Regrouper la sélection \(2\)/.test(out.btn.t)&&!out.btn.dis&&out.checked===2&&out.dlg&&/Nouveau prix composé/.test(out.dlg.h)&&/Soudure/.test(out.dlg.postes)&&/Manchons/.test(out.dlg.postes)&&out.dlg.mode==='ml'&&+out.dlg.base===600&&out.dlg.ulHidden
  &&out.dlg.prev.includes(frN(expA/600)+' € / ml')&&cA.nom==='DN 100 · soudure + manchons'&&cA.mode==='ml'&&cA.base===600&&cA.zone==='z0'&&cA.keys.length===2&&cA.keys.includes(oSou.key)&&cA.keys.includes(oMan.key)
  &&Math.abs(cA.tot-expA)<0.01&&Math.abs(cA.unit-expA/600)<1e-6&&Math.abs(cA.tot-(oSou.vente+oMan.vente))<0.01&&cA.pointe===0&&cA.reste===600
  &&/créé/.test(out.toast)&&sp(out.ui.band).includes(frN(cA.unit)+' € / ml')&&sp(out.ui.band).includes('reste '+frN(600)+' ml')&&out.ui.cc.length===1&&out.ui.cc[0].on&&/2 postes/.test(out.ui.cc[0].t)&&/pointé 0,00 \/ 600,00 ml · reste 600,00/.test(out.ui.cc[0].t)&&out.ui.dots===2&&out.ui.picked===0&&out.ui.targets===5;
// ── 3) composé de TROIS postes À L'UNITÉ (« ens. », base 4) : prix = somme des 3 ventes ÷ 4
const rest3=s.opts.filter(o=>!cA.keys.includes(o.key)).slice(0,3);
for(const o of rest3)await click('dwpick|'+enc(o.key));
await click('dwgroup|');await wait(150);
await page.evaluate(()=>{const g=id=>document.getElementById(id);g('dwc-nom').value='Équipements SST et purges';const m=g('dwc-mode');m.value='u';m.dispatchEvent(new Event('change'));});await wait(80);
out={ul:await page.evaluate(()=>!document.getElementById('dwc-ul').hidden)};
await page.evaluate(()=>{const g=id=>document.getElementById(id);const u=g('dwc-unit');u.value='ens.';u.dispatchEvent(new Event('input'));const b=g('dwc-base');b.value='4';b.dispatchEvent(new Event('input'));});await wait(80);
out.prev=await page.evaluate(()=>document.getElementById('dwc-prev').textContent.replace(/[\s  ]+/g,' '));
await page.evaluate(()=>document.getElementById('dwc-ok').click());await wait(300);
s=await ST();const cB=s.compo[1]||{};const expB=rest3.reduce((x,o)=>x+o.vente,0);
out.B=cB;out.cc=await page.evaluate(()=>[...document.querySelectorAll('#eq-app .cm-cc')].map(x=>x.textContent.replace(/[\s  ]+/g,' ').trim()));
console.log('3) composé de 3 postes à l\'unité :',JSON.stringify({...out,rest3:rest3.map(o=>o.label),expB}));
C.c3=rest3.length===3&&out.ul&&out.prev.includes(frN(expB/4)+' € / ens.')&&cB.mode==='u'&&cB.unitLabel==='ens.'&&cB.base===4&&cB.keys.length===3&&rest3.every(o=>cB.keys.includes(o.key))&&Math.abs(cB.tot-expB)<0.01&&Math.abs(cB.unit-expB/4)<1e-6&&cB.reste===4
  &&out.cc.length===2&&out.cc[1].includes(frN(cB.unit)+' € / ens.')&&/3 postes/.test(out.cc[1]);
// ── 4) « Tous les postes → un prix au ml » : les postes PAS encore regroupés ; les 3 prix couvrent toute la zone → (A + B + C) ÷ 600 = le prix au ml du chiffrage ; 2e fois : « déjà regroupés »
await click('dwall|');await wait(150);out={dlg:await page.evaluate(()=>{const b=document.getElementById('cm-dwplace');return b?{nom:b.querySelector('#dwc-nom').value,base:b.querySelector('#dwc-base').value}:null;})};
await page.evaluate(()=>document.getElementById('dwc-ok').click());await wait(300);
s=await ST();const cC=s.compo[2]||{};const restAll=s.opts.filter(o=>o.vente>0&&!cA.keys.includes(o.key)&&!cB.keys.includes(o.key));
await click('dwall|');await wait(150);out.again={dlg:await page.evaluate(()=>!!document.getElementById('cm-dwplace')),toast:await page.evaluate(()=>document.getElementById('toast').textContent)};
const sumABC=cA.tot+cB.tot+cC.tot;
console.log('4) tous les postes :',JSON.stringify({...out,C:cC,sumABC,total:s.total,parMl:s.parMl,ml:s.ml}));
C.c4=out.dlg&&/Zone 1 · tous les postes/.test(out.dlg.nom)&&+out.dlg.base===600&&cC.mode==='ml'&&cC.keys.length===restAll.length&&restAll.length>=1&&restAll.every(o=>cC.keys.includes(o.key))
  &&Math.abs(sumABC-s.total)<0.01&&s.ml===600&&Math.abs((cA.tot+cC.tot+cB.tot)/600-s.parMl)<1e-6&&!out.again.dlg&&/déjà regroupés/.test(out.again.toast);
// ── 5) POINTAGE PARTIEL : prix A, ligne 2.1 (1 240 ml) → la fenêtre propose le reste (600) ; on en pointe 220 → « reste 380 ml » (fenêtre, bandeau, liste, message)
await click('dwcsel|'+cA.id);await click('dwline|3');await wait(150);
out={dlg:await page.evaluate(()=>{const b=document.getElementById('cm-dwplace');return b?{h:b.querySelector('h3').textContent,q:b.querySelector('#dwq-q').value,info:b.querySelector('.cm-dwpl small').textContent.replace(/[\s  ]+/g,' ')}:null;})};
await page.evaluate(()=>{const q=document.getElementById('dwq-q');q.value='220';q.dispatchEvent(new Event('input'));});await wait(60);
out.prev=await page.evaluate(()=>document.getElementById('dwq-prev').textContent.replace(/[\s  ]+/g,' '));
await page.evaluate(()=>document.getElementById('dwq-ok').click());await wait(300);
s=await ST();let a1=s.compo.find(c=>c.id===cA.id);
out.map3=s.map[3];out.toast=await page.evaluate(()=>document.getElementById('toast').textContent.replace(/[\s  ]+/g,' '));
out.ui=await page.evaluate(id=>{const r=[...document.querySelectorAll('#eq-app .cm-dwt tr.cm-dwrow')].find(x=>x.dataset.v==='dwline|3');return {band:(document.querySelector('#eq-app .cm-dwsel')||{}).textContent.replace(/[\s  ]+/g,' '),chip:r?(r.querySelector('.cm-dwpchip')||{}).textContent||'':'',pu:r?r.cells[5].textContent.replace(/[\s  ]+/g,' ').trim():'',cc:[...document.querySelectorAll('#eq-app .cm-cc')][0].textContent.replace(/[\s  ]+/g,' ')};},cA.id);
const pl3=s.perLine.find(x=>x.i===3);
console.log('5) pointage partiel :',JSON.stringify({...out,a1:{pointe:a1.pointe,reste:a1.reste},pl3}));
C.c5=out.dlg&&/Pointer un prix sur une ligne/.test(out.dlg.h)&&+out.dlg.q===600&&out.dlg.info.includes('reste '+frN(600)+' ml')&&out.prev.includes('reste '+frN(380)+' ml à pointer à '+frN(cA.unit)+' €')&&out.prev.includes(frN(220*cA.unit,0)+' €')
  &&out.map3&&out.map3.pts&&out.map3.pts.length===1&&out.map3.pts[0].c===cA.id&&out.map3.pts[0].q===220&&a1.pointe===220&&a1.reste===380
  &&/Pointé sur 2\.1 — reste 380,00 ml à pointer/.test(out.toast)&&out.ui.band.includes('reste 380,00 ml')&&out.ui.cc.includes('pointé 220,00 / 600,00 ml · reste 380,00')
  &&sp(out.ui.chip).includes('220,00 ml × '+frN(cA.unit)+' €')&&Math.abs(pl3.ptAmt-220*cA.unit)<0.01&&Math.abs(pl3.pu-220*cA.unit/1240)<1e-6&&out.ui.pu===frN(pl3.pu);
// ── 6) le reste (380) sur la ligne 2.2 → « ✓ tout pointé » (prix désélectionné) ; un 2e pointage du même prix est signalé « dépasse » ; retrait d'un pointage → le reste revient
await click('dwline|4');await wait(150);out={q:await page.evaluate(()=>document.getElementById('dwq-q').value)};await page.evaluate(()=>document.getElementById('dwq-ok').click());await wait(300);
s=await ST();out.full={reste:s.compo.find(c=>c.id===cA.id).reste,toast:await page.evaluate(()=>document.getElementById('toast').textContent),idle:await page.evaluate(()=>!!document.querySelector('#eq-app .cm-dwsel.idle')),done:await page.evaluate(()=>document.querySelector('#eq-app .cm-cc').classList.contains('done'))};
await click('dwcsel|'+cA.id);await click('dwline|5');await wait(150);out.over=await page.evaluate(()=>{const b=document.getElementById('cm-dwplace');const r={q:b.querySelector('#dwq-q').value,prev:b.querySelector('#dwq-prev').textContent.replace(/[\s  ]+/g,' ')};b.querySelector('#dwq-no').click();r.closed=!document.getElementById('cm-dwplace');return r;});
s=await ST();out.overMap=(s.map[5]&&s.map[5].pts||[]).length;
await click('dwptrm|4|0');s=await ST();out.rm={reste:s.compo.find(c=>c.id===cA.id).reste,pts4:(s.map[4].pts||[]).length,chip4:await page.evaluate(()=>{const r=[...document.querySelectorAll('#eq-app .cm-dwt tr.cm-dwrow')].find(x=>x.dataset.v==='dwline|4');return r?r.querySelectorAll('.cm-dwpchip').length:-1;}),pu4:s.perLine.find(x=>x.i===4).pu};
console.log('6) reste, dépassement, retrait :',JSON.stringify(out));
C.c6=+out.q===380&&out.full.reste===0&&/entièrement pointé ✓/.test(out.full.toast)&&out.full.idle&&out.full.done&&+out.over.q===540&&/dépasse de 540,00 ml/.test(out.over.prev)&&out.over.closed&&out.overMap===0
  &&out.rm.reste===380&&out.rm.pts4===0&&out.rm.chip4===0&&out.rm.pu4===0;
// ── 7) tout pointer puis APPLIQUER AU DPGF : A 380 ml sur 2.2, B 4 ens. sur 3.2, C 600 ml sur 2.1 → tout le prix de vente est placé ; les PU écrits = ceux du pointage ; total = prix de vente
await click('dwcsel|'+cA.id);await click('dwline|4');await wait(150);await page.evaluate(()=>document.getElementById('dwq-ok').click());await wait(250);
await click('dwcsel|'+cB.id);await click('dwline|6');await wait(150);out={qB:await page.evaluate(()=>document.getElementById('dwq-q').value)};await page.evaluate(()=>document.getElementById('dwq-ok').click());await wait(250);
await click('dwcsel|'+cC.id);await click('dwline|3');await wait(150);out.qC=await page.evaluate(()=>document.getElementById('dwq-q').value);await page.evaluate(()=>document.getElementById('dwq-ok').click());await wait(250);
s=await ST();out.before={assigned:s.assigned,vente:s.vente,reste:s.reste,restes:s.compo.map(c=>c.reste),stat:await page.evaluate(()=>[...document.querySelectorAll('#eq-app .cm-dws .ac-stat')].map(x=>x.textContent.replace(/[\s  ]+/g,' ').trim()))};
const pl=Object.fromEntries(s.perLine.map(x=>[x.i,x]));
await click('dpapply|');await wait(300);
s=await ST();const L=s.lignes;const totL=L.filter(l=>!l.section).reduce((x,l)=>x+(+l.pu||0)*(+l.qte||0),0);
out.after={pu3:L[3].pu,pu4:L[4].pu,pu6:L[6].pu,tot:Math.round(totL*100)/100,vente:Math.round(s.total*100)/100,toast:await page.evaluate(()=>document.getElementById('toast').textContent)};
console.log('7) appliquer au DPGF :',JSON.stringify({...out,exp:{pu3:pl[3].pu,pu4:pl[4].pu,pu6:pl[6].pu}}));
C.c7=+out.qB===4&&+out.qC===600&&out.before.restes.every(r=>Math.abs(r)<0.01)&&Math.abs(out.before.assigned-out.before.vente)<0.01&&out.before.reste<0.01
  &&Math.abs(pl[4].pu-cA.unit)<1e-6&&Math.abs(pl[3].pu-(220*cA.unit+600*cC.unit)/1240)<1e-6 /* 2.1 : A (220 ml) + C (600 ml) */&&Math.abs(pl[6].pu-4*cB.unit/54)<1e-6
  &&out.after.pu3===Math.round(pl[3].pu*100)/100&&out.after.pu4===Math.round(pl[4].pu*100)/100&&out.after.pu6===Math.round(pl[6].pu*100)/100&&Math.abs(out.after.tot-out.after.vente)<0.02&&/PU écrits sur 3 lignes — total = prix de vente/.test(out.after.toast);
// ── 8) retirer un prix composé (B) : ses pointages partent avec lui ; les autres restent
await click('dwcrm|'+cB.id);await wait(200);s=await ST();
out={n:s.compo.length,ids:s.compo.map(c=>c.id),pts6:(s.map[6].pts||[]).length,pts3:(s.map[3].pts||[]).length,pts4:(s.map[4].pts||[]).length,cc:await page.evaluate(()=>document.querySelectorAll('#eq-app .cm-cc').length)};
console.log('8) retrait d\'un prix composé :',JSON.stringify(out));
C.c8=out.n===2&&!out.ids.includes(cB.id)&&out.pts6===0&&out.pts3===2&&out.pts4===1&&out.cc===2; /* ligne 2.1 : A (220) + C (600) */
// ── 8 b) ✎ modifier un prix composé : la quantité de base passe de 600 à 500 ml → prix = montant ÷ 500 ; déjà 600 ml pointés → « ⚠ trop pointé de 100 »
await click('dwcedit|'+cA.id);await wait(150);
out={dlg:await page.evaluate(()=>{const b=document.getElementById('cm-dwplace');return b?{h:b.querySelector('h3').textContent,nom:b.querySelector('#dwc-nom').value,base:b.querySelector('#dwc-base').value,mode:b.querySelector('#dwc-mode').value,ok:b.querySelector('#dwc-ok').textContent}:null;})};
await page.evaluate(()=>{const b=document.getElementById('dwc-base');b.value='500';b.dispatchEvent(new Event('input'));document.getElementById('dwc-ok').click();});await wait(300);
s=await ST();const a8=s.compo.find(c=>c.id===cA.id);
out.a8={base:a8.base,unit:a8.unit,pointe:a8.pointe,reste:a8.reste,keys:a8.keys.length,nom:a8.nom};out.cc=await page.evaluate(()=>{const x=document.querySelector('#eq-app .cm-cc');return x?{t:x.textContent.replace(/[\s  ]+/g,' '),over:x.classList.contains('over')}:null;});
out.stat=await page.evaluate(()=>{const st=[...document.querySelectorAll('#eq-app .cm-dws .ac-stat')][1];return st?st.classList.contains('bad'):null;});
console.log('8 b) modifier un prix composé :',JSON.stringify(out));
C.c8b=out.dlg&&/Modifier le prix composé/.test(out.dlg.h)&&out.dlg.nom===cA.nom&&+out.dlg.base===600&&out.dlg.mode==='ml'&&/Enregistrer/.test(out.dlg.ok)&&out.a8.base===500&&out.a8.keys===2&&out.a8.nom===cA.nom&&Math.abs(out.a8.unit-cA.tot/500)<1e-6&&out.a8.pointe===600&&out.a8.reste===-100
  &&out.cc&&out.cc.over&&/⚠ trop pointé de 100,00/.test(out.cc.t)&&out.stat===true;
// ── 8 c) ⧉ AUTRE ÉCRAN en mode prix composés : le prix se choisit ici, la ligne se touche dans la 2e fenêtre → la fenêtre de pointage s'ouvre LÀ-BAS ; ↩ ramène la feuille
const [pop]=await Promise.all([ctx.waitForEvent('page'),click('dwpop|')]);await wait(600);
await click('dwcsel|'+cC.id);await wait(200);
out={main:await page.evaluate(()=>/ouvert dans l'autre fenêtre/.test((document.querySelector('#eq-app .cm-dwr')||{}).textContent||'')),rows:await pop.evaluate(()=>document.querySelectorAll('#dwp-host tr.cm-dwrow').length),hint:await pop.evaluate(()=>document.getElementById('dwp-hint').textContent)};
await pop.evaluate(()=>[...document.querySelectorAll('#dwp-host tr.cm-dwrow')].find(r=>r.dataset.v==='dwline|5').click());await wait(250);
out.dlg=await pop.evaluate(()=>{const b=document.getElementById('cm-dwplace');return b?{h:b.querySelector('h3').textContent,q:b.querySelector('#dwq-q').value}:null;});out.dlgMain=await page.evaluate(()=>!!document.getElementById('cm-dwplace'));
await pop.evaluate(()=>{const q=document.getElementById('dwq-q');q.value='100';q.dispatchEvent(new Event('input'));document.getElementById('dwq-ok').click();});await wait(400);
s=await ST();out.map5=(s.map[5]||{}).pts||[];out.chip=await pop.evaluate(()=>{const r=[...document.querySelectorAll('#dwp-host tr.cm-dwrow')].find(x=>x.dataset.v==='dwline|5');return r?(r.querySelector('.cm-dwpchip')||{}).textContent||'':'';});
await pop.evaluate(()=>document.querySelector('[data-w="back"]').click());await wait(700);out.back=await page.evaluate(()=>document.querySelectorAll('#eq-app .cm-dwt tr.cm-dwrow').length);
console.log('8 c) autre écran :',JSON.stringify(out));
C.c8c=out.main&&out.rows===5&&/Zone 1 · tous les postes/.test(out.hint)&&/touche la ligne où pointer/.test(out.hint)&&out.dlg&&/Pointer un prix/.test(out.dlg.h)&&!out.dlgMain&&out.map5.length===1&&out.map5[0].c===cC.id&&out.map5[0].q===100
  &&/100,00 ml/.test(String(out.chip).replace(/[\s  ]+/g,' '))&&out.back===5;
// ── 9) TÉLÉPHONE 390 px : l'atelier tient dans l'écran (pas de défilement horizontal de la page) ; la fenêtre de pointage aussi
await page.evaluate(()=>{document.getElementById('app').classList.remove('wide');});await page.setViewportSize({width:390,height:844});await wait(300);
await click('tab|offre');await click('tab|dpgf');await wait(300);
out={page:await page.evaluate(()=>({sw:document.documentElement.scrollWidth,iw:window.innerWidth,dw:Math.round((document.querySelector('#eq-app .cm-dw')||{getBoundingClientRect:()=>({width:-1})}).getBoundingClientRect().width),rows:document.querySelectorAll('#eq-app .cm-dwt tr.cm-dwrow').length}))};
await click('dwcsel|'+cA.id);await click('dwline|5');await wait(200);
out.dlg=await page.evaluate(()=>{const b=document.querySelector('#cm-dwplace .box');const r=b?b.getBoundingClientRect():null;const o={box:r?Math.round(r.width):-1,left:r?Math.round(r.left):-1,sw:document.documentElement.scrollWidth,iw:window.innerWidth,ok:!!document.getElementById('dwq-ok')};const no=document.getElementById('dwq-no');if(no)no.click();return o;});
await click('dwcsel|');out.after=await page.evaluate(()=>({sw:document.documentElement.scrollWidth,iw:window.innerWidth}));
console.log('9) téléphone 390 px :',JSON.stringify(out));
C.c9=out.page.rows===5&&out.page.sw<=out.page.iw&&out.page.dw>0&&out.page.dw<=390&&out.dlg.ok&&out.dlg.box>0&&out.dlg.box<=390&&out.dlg.left>=0&&out.dlg.sw<=out.dlg.iw&&out.after.sw<=out.after.iw;
C.console=logs.length===0;
const bad=Object.entries(C).filter(([k,v])=>!v).map(([k])=>k);console.log(bad.length?'RESULTAT: ECHEC '+bad.join(','):'RESULTAT: TOUT VERT');console.log(logs.length?logs:'[]');
await browser.close();
