// MÉMOIRE TECHNIQUE — COCHAGE / DÉCOCHAGE SIMPLIFIÉ (lot M1, 14/10/2026 soir). Ethan : « il faudrait faciliter davantage le cochage décochage, ça fait
// énormément de cases à cocher ». Bibliothèque FICTIVE (test/memoire_fake_m1.mjs : 4 sections, 8 blocs, 26 paragraphes) injectée dans le registre « doc » →
// étape 5 · Mémoire d'une affaire de démo : état de départ (cases à trois états, compteurs en blocs), réserve repliée, jeu standard d'un bloc sans rien par défaut
// (ni ajouts ni doublons de variantes), radio des variantes, retrait / remise d'un bloc avec ajouts, bloc entamé, case de section (section en réserve, section
// entamée), « ＋ tout le bloc », ↶ Annuler sur plusieurs niveaux, bloc décoché d'office par le chiffrage (case du bloc / case de la section), ✕ et ＋ dans l'aperçu, « ＋ n disponibles » (fenêtre, Ajouter / Remplacer / Ajouter tout),
// modèles (Référence SCR, Complet, enregistrer / appliquer / remplacer / supprimer, comme une autre affaire), export Word sans aucun bouton, lecture seule ;
// puis téléphone (390 px : rien ne déborde, boutons ≥ 34 px toujours visibles) ; aucune erreur console.
import { chromium } from 'playwright';
import fs from 'fs';
import {unzipSync,strFromU8} from 'fflate';
import {FAKE_STYLE} from './memoire_fake.mjs';
import {FAKE_M1_BLOCS,FAKE_M1_IMAGES} from './memoire_fake_m1.mjs';
const BASE=process.env.BASE||'http://localhost:8765';
const browser=await chromium.launch({headless:true, executablePath: process.env.CHROMIUM_PATH||undefined});
const C={};const logs=[];const LIB={kind:'memlib',req:{none:true},title:'Mémoire technique : bibliothèque de blocs SCR',blocs:FAKE_M1_BLOCS,style:FAKE_STYLE,images:FAKE_M1_IMAGES,version:1,at:'2026-10-14T00:00:00.000Z',by:'Test'};
async function open(ctxOpts,num,nom){const ctx=await browser.newContext(Object.assign({acceptDownloads:true},ctxOpts));const page=await ctx.newPage();
  page.on('pageerror',e=>logs.push('PAGEERROR: '+e.message.slice(0,300)));page.on('console',m=>{if(m.type()==='error'&&!/supabase|Failed to fetch|net::ERR|404|WebSocket|pdf\.worker|cdnjs/i.test(m.text()))logs.push(m.text().slice(0,200));});page.on('dialog',d=>d.accept().catch(()=>{}));
  await page.route(u=>/(^|\.)geopf\.fr$|^geo\.api\.gouv\.fr$|open-meteo\.com$|ign\.fr$|openstreetmap|tile/.test(u.hostname),r=>r.fulfill({status:200,contentType:'application/json',body:'{}'}));
  await page.goto(BASE+'/index.html');await page.waitForTimeout(600);await page.evaluate(()=>{localStorage.clear();localStorage.setItem('trace:wide','1');});
  await page.evaluate(row=>new Promise((res,rej)=>{const r=indexedDB.open('trace-kv',1);r.onupgradeneeded=()=>{r.result.createObjectStore('kv');};r.onerror=()=>rej(r.error);r.onsuccess=()=>{const db=r.result;const t=db.transaction('kv','readwrite');const st=t.objectStore('kv');const g=st.get('trace:reg:doc');g.onsuccess=()=>{const cur=g.result||{};cur.memlib={id:'memlib',data:row,updated_at:new Date().toISOString()};st.put(cur,'trace:reg:doc');};t.oncomplete=()=>{db.close();res();};t.onerror=()=>rej(t.error);};}),LIB);
  await page.reload();await page.waitForTimeout(1200);{const s=await page.$('#loginSkip');if(s&&await s.isVisible())await s.click();await page.waitForTimeout(700);}
  await page.evaluate(async([n,nm])=>{const T=window.TRACE;T.state.userId='ethan';T.renderHome();document.getElementById('htCom').click();await new Promise(x=>setTimeout(x,250));
    document.querySelector('#eq-app [data-act=af][data-v="new|"]').click();await new Promise(x=>setTimeout(x,150));document.getElementById('afn-num').value=n;document.getElementById('afn-nom').value=nm;document.getElementById('afn-client').value='CLIENT-TEST';document.getElementById('afn-ville').value='Testville';document.getElementById('afn-etat').value='devis';
    document.querySelector('#eq-app [data-act=af][data-v="create|"]').click();await new Promise(x=>setTimeout(x,250));document.querySelector('#eq-app [data-act=af][data-v="tab|memoire"]').click();await new Promise(x=>setTimeout(x,300));},[num,nom]);
  return {ctx,page};}
const NUM='O2610-51';
let {ctx,page}=await open({viewport:{width:1280,height:900}},NUM,'Réseau M1');
const wait=ms=>page.waitForTimeout(ms);
const click=async v=>{await page.evaluate(v=>{const el=document.querySelector(`#eq-app [data-act=af][data-v="${v}"]`);if(!el)throw new Error('bouton absent '+v);el.click();},v);await wait(320);};
const A=n=>page.evaluate(n=>window.TRACE.affaires.get(n),n||NUM);
const sel=async()=>{const a=await A();return Object.assign({},((a.memoire||{}).lib||{}).sel||{});};
const same=(x,y)=>{const kx=Object.keys(x).sort(),ky=Object.keys(y).sort();return kx.join()===ky.join()&&kx.every(k=>x[k]===y[k]);};
const ck=v=>page.evaluate(v=>{const i=document.querySelector(`#eq-app input[data-v="${v}"]`);return i?(i.checked?'x':i.indeterminate?'-':' '):null;},v);
const onP=()=>page.evaluate(()=>[...document.querySelectorAll('#memoire-scroll .memoire-p')].map(p=>p.dataset.pid));
const prev=()=>page.evaluate(()=>(document.querySelector('#memoire-scroll .memoire-page')||{}).textContent||'');
const toast=()=>page.evaluate(()=>(document.getElementById('toast')||{}).textContent||'');
const secTxt=i=>page.evaluate(i=>{const x=document.querySelector(`#eq-app input[data-v="mlbs|${i}"]`);const w=x&&x.closest('.m1-sechw');return w?w.querySelector('.memoire-sech small').textContent.replace(/\s+/g,' ').trim():null;},i);
const stat=()=>page.evaluate(()=>[...document.querySelectorAll('#memoire-stats .ac-stat')][1].textContent.replace(/\s+/g,' ').trim());
const rows=bid=>page.evaluate(b=>[...document.querySelectorAll(`#memoire-tb-${b} .memoire-prow`)].map(r=>r.id.replace('memoire-tr-','')),bid);
const S=[];const snap=async()=>{S.push(await sel());};
// ── 1) départ : 10 / 26 paragraphes ; cases de section à trois états, compteurs en blocs ; cases de bloc = jeu standard ; ✕ et ＋ dans l'aperçu, discrets sur PC
await click('mlbsecall|1');
let out=await page.evaluate(()=>({undo:(document.getElementById('memoire-undo')||{}).disabled,mods:[...document.querySelectorAll('#memoire-mod option')].map(o=>o.value),x:document.querySelectorAll('#memoire-scroll .m1-x').length,bx:document.querySelectorAll('#memoire-scroll .m1-bx').length,
  more:[...document.querySelectorAll('#memoire-scroll .m1-more')].map(b=>b.textContent.trim()),chips:[...document.querySelectorAll('#memoire-scroll .m1-chip')].map(b=>b.textContent.trim()),hn:matchMedia('(hover:none)').matches,op0:getComputedStyle(document.querySelector('#memoire-p-m-presta-2 .m1-x')).opacity,pe0:getComputedStyle(document.querySelector('#memoire-p-m-presta-2 .m1-x')).pointerEvents}));
out.stat=await stat();out.secs=[await secTxt(0),await secTxt(1),await secTxt(2),await secTxt(3)];out.sck=[await ck('mlbs|0'),await ck('mlbs|1'),await ck('mlbs|2'),await ck('mlbs|3')];
out.bck=[];for(const b of ['m-ident','m-visu','m-presta','m-docs','m-dech','m-ctrl','m-essai','m-ann'])out.bck.push(await ck('mlbb|'+b));
await page.hover('#memoire-p-m-presta-2');await wait(250);out.op1=await page.evaluate(()=>getComputedStyle(document.querySelector('#memoire-p-m-presta-2 .m1-x')).opacity);
await page.hover('#memoire-b-m-presta h2');await wait(250);out.bop=await page.evaluate(()=>[getComputedStyle(document.querySelector('#memoire-b-m-presta h2 .m1-bx')).opacity,getComputedStyle(document.querySelector('#memoire-p-m-presta-2 .m1-x')).opacity]);
console.log('1) départ :',JSON.stringify(out));
C.c1=/^10 \/ 26 ?paragraphes cochés/.test(out.stat)&&out.secs[0]==='1 / 2 blocs'&&/^2 \/ 3 blocs · 1 trou$/.test(out.secs[1])&&out.secs[2]==='0 / 2 blocs'&&out.secs[3]==='1 / 1 bloc'&&out.sck.join('|')==='-|x| |x'&&out.bck.join('|')==='x| |x|x| | | |x'
  &&out.undo===true&&out.mods.join()==='ref,complet'&&out.x===10&&out.bx===4&&out.more.join('|')==='＋ 1 paragraphe disponible|＋ 4 paragraphes disponibles|＋ 1 paragraphe disponible'&&out.chips.join()==='Visuels test,Déchargement test'
  &&!out.hn&&out.op0==='0'&&out.pe0==='none'&&out.op1==='1'&&out.bop[0]==='1'&&out.bop[1]==='0';
// ── 2) réserve repliée : 7 lignes (cochés d'office, dont la puce à condition décochée d'office) ; les 3 ajouts sous « ＋ 3 en réserve », dépliables
await click('mlbexp|m-presta');
out={r0:await rows('m-presta'),res:await page.evaluate(()=>{const b=document.querySelector('#memoire-tb-m-presta .m1-res');return b?{t:b.textContent.replace(/\s+/g,' ').trim(),ex:b.getAttribute('aria-expanded')}:null;}),c7:await ck('mlbp|m-presta-7'),tag7:await page.evaluate(()=>(document.querySelector('#memoire-tr-m-presta-7 .memoire-tg.auto')||{}).textContent||'')};
await click('mlbres|m-presta');out.r1=(await rows('m-presta')).length;out.t1=await page.evaluate(()=>document.querySelector('#memoire-tb-m-presta .m1-res').textContent.replace(/\s+/g,' ').trim());await click('mlbres|m-presta');out.r2=(await rows('m-presta')).length;
console.log('2) réserve repliée :',JSON.stringify(out));
C.c2=out.r0.join()===[1,2,3,4,5,6,7].map(i=>'m-presta-'+i).join()&&out.res&&out.res.t==='＋ 3 en réserve (à relire avant d’ajouter)'&&out.res.ex==='false'&&out.c7===' '&&/pas de DCE/.test(out.tag7)&&out.r1===10&&/^－ 3 en réserve/.test(out.t1)&&out.r2===7;
// ── 3) jeu standard d'un bloc SANS rien par défaut : tous ses paragraphes sauf la variante en double (une par groupe) ; radios et étiquettes de variantes
await snap();await click('mlbexp|m-visu');out={r0:await rows('m-visu'),fold:await page.evaluate(()=>!document.querySelector('#memoire-tb-m-visu .m1-res'))};
await click('mlbb|m-visu');out.toast=await toast();const s3=await sel();out.sel=Object.keys(s3).filter(k=>/^m-visu/.test(k)).sort().map(k=>k+'='+s3[k]);
out.tree=await page.evaluate(()=>{const r=id=>{const i=document.querySelector(`#memoire-tr-${id} input`);return i?i.type+(i.checked?'*':''):null;};const tg=id=>(document.querySelector(`#memoire-tr-${id} .m1-var`)||{}).textContent||'';return {r1:r('m-visu-1'),r2:r('m-visu-2'),r3:r('m-visu-3'),t1:tg('m-visu-1'),t2:tg('m-visu-2')};});
out.pv=await page.evaluate(()=>({img:!!document.querySelector('#memoire-p-m-visu-1 figure img'),v2:!!document.getElementById('memoire-p-m-visu-2'),n:((document.querySelector('#memoire-scroll .memoire-page').textContent).match(/Nos équipes fictives interviennent/g)||[]).length}));
out.bck=await ck('mlbb|m-visu');out.sck=await ck('mlbs|0');out.sec=await secTxt(0);
console.log('3) jeu standard (bloc sans défaut) :',JSON.stringify(out));
C.c3=out.r0.length===4&&out.fold&&out.sel.join()==='m-visu-1=true,m-visu-3=true,m-visu-4=true'&&out.tree.r1==='radio*'&&out.tree.r2==='radio'&&out.tree.r3==='checkbox*'&&out.tree.t1==='variante · avec image'&&out.tree.t2==='variante · texte seul'
  &&out.pv.img&&!out.pv.v2&&out.pv.n===1&&out.bck==='x'&&out.sck==='x'&&out.sec==='2 / 2 blocs'&&/^Bloc « Visuels test » : jeu standard \(3 paragraphes\) — ↶ Annuler dans la barre$/.test(out.toast);
// ── 4) radio : l'autre variante remplace la première ; le bloc reste « coché » (son jeu standard est là, sous l'autre version)
await snap();await click('mlbalt|m-visu-2');const s4=await sel();
out={v1:s4['m-visu-1'],v2:s4['m-visu-2'],p:await onP(),bck:await ck('mlbb|m-visu'),r:await page.evaluate(()=>[document.querySelector('#memoire-tr-m-visu-1 input').checked,document.querySelector('#memoire-tr-m-visu-2 input').checked]),toast:await toast()};
console.log('4) variante :',JSON.stringify(out));
C.c4=out.v1===false&&out.v2===true&&out.p.includes('m-visu-2')&&!out.p.includes('m-visu-1')&&out.bck==='x'&&out.r.join()==='false,true'&&/^Variante « texte seul » choisie \(« avec image » retirée\)/.test(out.toast);
// ── 5) bloc avec défauts + ajout : la case le retire, puis remet son jeu standard (le paragraphe coché d'office, PAS l'ajout à relire)
await snap();await click('mlbb|m-ident');out={p1:await onP(),c1:await ck('mlbb|m-ident'),t1:await toast()};await snap();
await click('mlbb|m-ident');const s5=await sel();out.p2=await onP();out.c2=await ck('mlbb|m-ident');out.k=Object.keys(s5).filter(k=>/^m-ident/.test(k));
console.log('5) bloc retiré puis remis :',JSON.stringify(out));
C.c5=!out.p1.some(p=>/^m-ident/.test(p))&&out.c1===' '&&/^Bloc « Identité test » retiré du mémoire/.test(out.t1)&&out.p2.includes('m-ident-1')&&!out.p2.includes('m-ident-2')&&out.c2==='x'&&out.k.length===0;
// ── 6) bloc entamé (une puce retirée) : case partielle → elle retire tout ; recochée → jeu standard (6 puces : ni la puce à condition, ni les 3 ajouts)
await snap();await click('mlbp|m-presta-2');out={c0:await ck('mlbb|m-presta')};await snap();
await click('mlbb|m-presta');out.p1=(await onP()).filter(p=>/^m-presta/.test(p));out.c1=await ck('mlbb|m-presta');await snap();
await click('mlbb|m-presta');out.p2=(await onP()).filter(p=>/^m-presta/.test(p));out.c2=await ck('mlbb|m-presta');
console.log('6) bloc entamé :',JSON.stringify(out));
C.c6=out.c0==='-'&&out.p1.length===0&&out.c1===' '&&out.p2.join()===[1,2,3,4,5,6].map(i=>'m-presta-'+i).join()&&out.c2==='x';
// ── 7) case de section : section en réserve → jeu standard de ses 2 blocs ; recochée → retirée ; section entière retirée puis remise
await snap();await click('mlbs|2');out={sec1:await secTxt(2),ck1:await ck('mlbs|2'),p1:(await onP()).filter(p=>/^m-(ctrl|essai)/.test(p)),t1:await toast(),s2:await page.evaluate(()=>!!document.getElementById('memoire-s-2'))};await snap();
await click('mlbs|2');out.sec2=await secTxt(2);out.ck2=await ck('mlbs|2');out.p2=(await onP()).filter(p=>/^m-(ctrl|essai)/.test(p));await snap();
await click('mlbs|0');out.sec3=await secTxt(0);out.p3=(await onP()).filter(p=>/^m-(ident|visu)/.test(p));out.t3=await toast();await snap();
await click('mlbs|0');out.p4=(await onP()).filter(p=>/^m-(ident|visu)/.test(p));out.ck4=await ck('mlbs|0');await snap();
console.log('7) case de section :',JSON.stringify(out));
C.c7=out.sec1==='2 / 2 blocs'&&out.ck1==='x'&&out.p1.join()==='m-ctrl-1,m-ctrl-2,m-ctrl-3,m-essai-1,m-essai-2'&&/^Section « Réserve test » : jeu standard de 2 blocs/.test(out.t1)&&out.s2&&out.sec2==='0 / 2 blocs'&&out.ck2===' '&&out.p2.length===0
  &&out.sec3==='0 / 2 blocs'&&out.p3.length===0&&/^Section « Présentation test » retirée du mémoire/.test(out.t3)&&out.p4.join()==='m-ident-1,m-visu-1,m-visu-3,m-visu-4'&&out.ck4==='x';
// ── 8) « ＋ tout le bloc » (détail du bloc) : ajouts compris
await click('mlbball|m-ident');out={p:(await onP()).filter(p=>/^m-ident/.test(p)),t:await toast(),link:await page.evaluate(()=>!document.querySelector('#eq-app [data-v="mlbball|m-ident"]'))};
console.log('8) tout le bloc :',JSON.stringify(out));
C.c8=out.p.join()==='m-ident-1,m-ident-2'&&/^Bloc « Identité test » : tous ses paragraphes \(2\)/.test(out.t)&&out.link;
// ── 9) ↶ Annuler, plusieurs niveaux (pile par affaire) : on remonte exactement les états précédents
const n0=S.length;out={u:[]};
for(let i=1;i<=4;i++){await click('mlbundo|');out.u.push(same(await sel(),S[n0-i]));}
out.t=await toast();out.btn=await page.evaluate(()=>{const b=document.getElementById('memoire-undo');return b?{dis:b.disabled,t:b.title}:null;});
console.log('9) annuler :',JSON.stringify(out));
C.c9=out.u.every(Boolean)&&/^↶ Choix précédent rétabli \(\d+ autres possibles\)$/.test(out.t)&&out.btn&&!out.btn.dis&&/Annuler le dernier changement de sélection \(\d+ possibles\)/.test(out.btn.t);
// ── 10) bloc décoché d'office par le chiffrage (pas de pièce du DCE) : n'empêche pas la section d'être « cochée » ; sa case le met quand même (touchée exprès) ;
//     la case de la section, elle, ne force pas ce qu'exclut le chiffrage
out={sck0:await ck('mlbs|1'),bck0:await ck('mlbb|m-dech'),t0:await page.evaluate(()=>(document.querySelector('#eq-app input[data-v="mlbb|m-dech"]').closest('label')||{}).title||'')};
await click('mlbb|m-dech');out.s1=(await sel())['m-dech-1'];out.p1=(await onP()).includes('m-dech-1');out.bck1=await ck('mlbb|m-dech');out.t1=await toast();
await click('mlbs|1');out.p2=(await onP()).filter(p=>/^m-(presta|docs|dech)/.test(p)).length;await click('mlbs|1');out.p3=(await onP()).filter(p=>/^m-(presta|docs|dech)/.test(p));out.sck3=await ck('mlbs|1');out.sec3=await secTxt(1);
console.log('10) chiffrage :',JSON.stringify(out));
C.c10=out.sck0==='x'&&out.bck0===' '&&/jeu standard du bloc \(1 paragraphe,/.test(out.t0)&&out.s1===true&&out.p1&&out.bck1==='x'&&/^Bloc « Déchargement test » : jeu standard \(1 paragraphe\)/.test(out.t1)
  &&out.p2===0&&out.p3.join()===[1,2,3,4,5,6].map(i=>'m-presta-'+i).concat(['m-docs-1','m-docs-3']).join()&&out.sck3==='x'&&/^2 \/ 3 blocs/.test(out.sec3);
// état : section 0 (m-ident 1, m-visu 2, 3, 4), section 2 mise (5 paragraphes), section 1 au jeu standard (m-presta 1 à 6, m-docs 1 et 3, rien pour m-dech)
// ── 11) aperçu : ✕ sur un paragraphe (au survol), ✕ sur le titre d'un bloc, « ＋ Ajouter un bloc » en fin de section (jeu standard, on y va)
await page.hover('#memoire-p-m-docs-3');await wait(250);out={op:await page.evaluate(()=>getComputedStyle(document.querySelector('#memoire-p-m-docs-3 .m1-x')).opacity)};
await page.click('#memoire-p-m-docs-3 .m1-x');await wait(400);out.p1=await onP();out.s1=(await sel())['m-docs-3'];out.t1=await toast();
await page.hover('#memoire-b-m-docs h2');await wait(250);await page.click('#memoire-b-m-docs h2 .m1-bx');await wait(400);out.b2=await page.evaluate(()=>!!document.getElementById('memoire-b-m-docs'));out.t2=await toast();
out.chip=await page.evaluate(()=>[...document.querySelectorAll('#memoire-s-1 .m1-chip')].map(b=>b.textContent.trim()));
await page.click('#memoire-s-1 .m1-chip[data-v="mlbbstd|m-docs"]');await wait(450);
out.b3=await page.evaluate(()=>{const b=document.getElementById('memoire-b-m-docs');return b?{fl:b.classList.contains('mem3-flash'),p:[...b.querySelectorAll('.memoire-p')].map(p=>p.dataset.pid)}:null;});out.t3=await toast();
console.log('11) ✕ et ＋ dans l’aperçu :',JSON.stringify(out));
C.c11=out.op==='1'&&!out.p1.includes('m-docs-3')&&out.s1===false&&/^Paragraphe retiré du mémoire — ↶ Annuler dans la barre$/.test(out.t1)&&!out.b2&&/^Bloc « Documents test » retiré du mémoire/.test(out.t2)&&out.chip.join()==='Documents test,Déchargement test'
  &&out.b3&&out.b3.fl&&out.b3.p.join()==='m-docs-1,m-docs-3'&&/^Bloc « Documents test » ajouté : jeu standard \(2 paragraphes\)/.test(out.t3);
// ── 12) « ＋ n paragraphes disponibles » : fenêtre lisible (étiquettes, condition), Ajouter (on y va), variante « remplace … », Ajouter tout
out={more:await page.evaluate(()=>(document.querySelector('#memoire-b-m-presta .m1-more')||{}).textContent||'')};await page.click('#memoire-b-m-presta .m1-more');await wait(350);
out.m=await page.evaluate(()=>({n:document.querySelectorAll('#modal.show [data-m1add]').length,t:(document.querySelector('#modal.show .m1-dl')||{}).textContent||'',all:(document.getElementById('m1-addall')||{}).textContent||'',tg7:(document.querySelector('#m1-dli-m-presta-7 .m1-dlg')||{}).textContent||''}));
await page.click('#modal [data-m1add="m-presta-8"]');await wait(450);out.a8={modal:await page.evaluate(()=>!!document.querySelector('#modal.show')),p:(await onP()).includes('m-presta-8'),s:(await sel())['m-presta-8'],fl:await page.evaluate(()=>{const p=document.getElementById('memoire-p-m-presta-8');return !!p&&p.classList.contains('mem3-flash');}),more:await page.evaluate(()=>(document.querySelector('#memoire-b-m-presta .m1-more')||{}).textContent||'')};
await click('mlbdisp|m-docs');out.d=await page.evaluate(()=>({n:document.querySelectorAll('#modal.show [data-m1add]').length,tg:(document.querySelector('#m1-dli-m-docs-2 .m1-var')||{}).textContent||'',btn:(document.querySelector('#modal [data-m1add="m-docs-2"]')||{}).textContent||'',all:!document.getElementById('m1-addall')}));
await page.evaluate(()=>document.querySelector('#modal [data-close]').click());await wait(200);
await page.click('#memoire-b-m-presta .m1-more');await wait(350);await page.click('#m1-addall');await wait(450);out.all={p:(await onP()).filter(p=>/^m-presta/.test(p)).length,more:await page.evaluate(()=>!document.querySelector('#memoire-b-m-presta .m1-more')),t:await toast()};
console.log('12) paragraphes disponibles :',JSON.stringify(out));
C.c12=out.more==='＋ 4 paragraphes disponibles'&&out.m.n===4&&/Prestation fictive n° 8/.test(out.m.t)&&/ajout · à relire/.test(out.m.t)&&/coché d’office · retiré/.test(out.m.tg7)&&/pas de DCE/.test(out.m.tg7)&&out.m.all==='＋ Ajouter tout (4)'
  &&!out.a8.modal&&out.a8.p&&out.a8.s===true&&out.a8.fl&&out.a8.more==='＋ 3 paragraphes disponibles'&&out.d.n===1&&/^variante : remplace « Notre offre fictive est établie sur la base/.test(out.d.tg)&&/Remplacer/.test(out.d.btn)&&out.d.all
  &&out.all.p===10&&out.all.more&&/^Bloc « Prestations test » : 3 paragraphes ajoutés/.test(out.all.t);
// ── 13) modèles : Référence SCR, Complet, enregistrer / appliquer / remplacer / supprimer, comme une autre affaire (sélection seulement : trous et textes gardés)
const apply=async v=>{await page.selectOption('#memoire-mod',v);await wait(120);await click('mlbmodapp|');};
const info=()=>page.evaluate(()=>(document.getElementById('memoire-modinfo')||{}).textContent||'');
await apply('ref');out={ref:{s:await sel(),st:await stat(),i:await info()}};
await apply('complet');const SC=await sel();out.comp={k:Object.keys(SC).sort().join(),st:await stat(),i:await info(),allTrue:Object.values(SC).every(v=>v===true)};
await click('mlbmodsave|');await page.fill('#m1-mname','Modèle test M1');await page.click('#m1-mok');await wait(450);
let L12=await page.evaluate(()=>window.TRACE.reg.get('doc','memlib'));const M1=(L12.modeles||[])[0]||{};out.save={n:(L12.modeles||[]).length,nom:M1.nom,same:same(M1.sel||{},SC),by:!!M1.by,at:!!M1.at,opt:await page.evaluate(()=>{const s=document.getElementById('memoire-mod');return s?s.value:'';}),del:await page.evaluate(()=>{const b=document.getElementById('memoire-moddel');return !!b&&!b.hidden;})};
await apply('ref');out.back=await stat();await apply('m:'+M1.id);out.app={same:same(await sel(),SC),i:await info()};
await click('mlbx|m-ann-1');await click('mlbmodsave|');await page.fill('#m1-mname','modèle test m1');await page.click('#m1-mok');await wait(450);
L12=await page.evaluate(()=>window.TRACE.reg.get('doc','memlib'));out.repl={n:(L12.modeles||[]).length,id:(L12.modeles||[])[0]&&L12.modeles[0].id===M1.id,ann:((L12.modeles||[])[0]||{sel:{}}).sel['m-ann-1']};
await page.selectOption('#memoire-mod','m:'+M1.id);await wait(150);out.delVis=await page.evaluate(()=>!document.getElementById('memoire-moddel').hidden);await click('mlbmoddel|');
L12=await page.evaluate(()=>window.TRACE.reg.get('doc','memlib'));out.del={n:(L12.modeles||[]).length,opt:await page.evaluate(id=>!!document.querySelector(`#memoire-mod option[value="m:${id}"]`),M1.id)};
// une autre affaire en mode bibliothèque ; ce mémoire a un trou rempli et un texte modifié (gardés)
await page.evaluate(async n=>{const T=window.TRACE;T.affaires.set('O2610-52',{num:'O2610-52',nom:'Autre réseau test',client:'X',etat:'devis',memoire:{mode:'lib',lib:{sel:{'m-ident-2':true,'m-presta-1':false,'zz-absent':true},fill:{'m-docs-3|référence fictive du dossier|0':'NE-PAS-REPRENDRE'},edits:{}}}});
  const a=T.affaires.get(n);const M=Object.assign({},a.memoire);M.lib=Object.assign({},M.lib,{fill:{'m-docs-3|référence fictive du dossier|0':'REF-TEST-42'},edits:{'m-ann-1':'<p>Liste fictive modifiée pour cette affaire.</p>'}});T.affaires.set(n,{memoire:M});},NUM);
await click('mlbsecall|1');out.aff={opt:await page.evaluate(()=>[...document.querySelectorAll('#memoire-mod option')].map(o=>o.value).filter(v=>/^a:/.test(v)))};
await apply('a:O2610-52');const a12=await A();out.aff.sel=a12.memoire.lib.sel;out.aff.fill=a12.memoire.lib.fill['m-docs-3|référence fictive du dossier|0'];out.aff.ed=!!a12.memoire.lib.edits['m-ann-1'];out.aff.i=await info();out.aff.mo=a12.memoire.lib.modele&&a12.memoire.lib.modele.id;
out.aff.txt=await page.evaluate(()=>{const t=document.querySelector('#memoire-scroll .memoire-page').textContent;return {ref:/REF-TEST-42/.test(t),ed:/Liste fictive modifiée pour cette affaire/.test(t)};});
console.log('13) modèles :',JSON.stringify(out));
C.c13=same(out.ref.s,{})&&/^10 \/ 26/.test(out.ref.st)&&/^Modèle : Référence SCR · appliqué le \d\d\/\d\d\/\d{4}$/.test(out.ref.i)
  &&out.comp.k==='m-ctrl-1,m-ctrl-2,m-ctrl-3,m-essai-1,m-essai-2,m-visu-1,m-visu-3,m-visu-4'&&out.comp.allTrue&&/^18 \/ 26/.test(out.comp.st)&&/^Modèle : Complet/.test(out.comp.i)
  &&out.save.n===1&&out.save.nom==='Modèle test M1'&&out.save.same&&out.save.by&&out.save.at&&out.save.opt==='m:'+M1.id&&out.save.del&&/^10 \/ 26/.test(out.back)&&out.app.same&&/^Modèle : Modèle test M1/.test(out.app.i)
  &&out.repl.n===1&&out.repl.id&&out.repl.ann===false&&out.delVis&&out.del.n===0&&!out.del.opt
  &&out.aff.opt.join()==='a:O2610-52'&&same(out.aff.sel,{'m-ident-2':true,'m-presta-1':false})&&out.aff.fill==='REF-TEST-42'&&out.aff.ed&&/^Modèle : Comme l’affaire O2610-52/.test(out.aff.i)&&out.aff.mo==='aff:O2610-52'&&out.aff.txt.ref&&out.aff.txt.ed;
// ── 14) export Word (.docx) : la sélection, et AUCUN bouton de l'aperçu (✕, ＋, disponibles, réserve)
let [dl]=await Promise.all([page.waitForEvent('download'),page.evaluate(()=>document.querySelector('#eq-app [data-act=af][data-v="mword|"]').click())]);const zip=unzipSync(new Uint8Array(fs.readFileSync(await dl.path())));const dx=zip['word/document.xml']?strFromU8(zip['word/document.xml']):'';const txt=dx.replace(/<[^>]+>/g,'');
out={name:dl.suggestedFilename(),on:/Prestation fictive n° 2/.test(txt)&&/historique fictif de l’entreprise test/.test(txt)&&/REF-TEST-42/.test(txt),off:!/Prestation fictive n° 1</.test(dx)&&!/Contrôle visuel fictif/.test(txt),ui:['✕','＋','disponible','Ajouter un bloc','en réserve','Retirer','m1-'].filter(s=>dx.includes(s))};
console.log('14) export Word :',JSON.stringify(out));
C.c14=out.name==='Memoire_technique_O2610-51.docx'&&out.on&&out.off&&out.ui.length===0;
// ── 15) lecture seule (conducteur : voit les affaires sans les modifier) : aucune case active, aucun ✕ / ＋, ni modèles ni ↶ ; la réserve se déplie quand même
const s14=await sel();
await page.evaluate(async n=>{const T=window.TRACE;T.demoPoste('sophie','conducteur');T.state.userId='sophie';T.renderHome();const st=T.affaires.state();st.cur=n;st.view='fiche';st.tab='memoire';document.getElementById('htCom').click();await new Promise(r=>setTimeout(r,500));},NUM);
out=await page.evaluate(()=>{const ins=[...document.querySelectorAll('#memoire-tree input[type=checkbox],#memoire-tree input[type=radio]')];return {n:ins.length,dis:ins.every(i=>i.disabled),ui:['.m1-x','.m1-bx','.m1-more','.m1-chip','#memoire-mod','#memoire-undo','[data-v^="mlbball|"]','#memoire-moddel'].filter(s=>document.querySelector(s)),info:(document.getElementById('memoire-modinfo')||{}).textContent||'',res:!!document.querySelector('#memoire-tb-m-presta .m1-res')};});
if(out.res){out.r0=(await rows('m-presta')).length;await click('mlbres|m-presta');out.r1=(await rows('m-presta')).length;}
await page.evaluate(()=>{const i=document.querySelector('#eq-app input[data-v="mlbb|m-ann"]');if(i)i.click();});await wait(300);out.same=same(await sel(),s14);
await page.evaluate(async n=>{const T=window.TRACE;T.demoPoste('sophie',null);T.state.userId='ethan';T.renderHome();const st=T.affaires.state();st.cur=n;st.view='fiche';st.tab='memoire';document.getElementById('htCom').click();await new Promise(r=>setTimeout(r,500));},NUM);
out.back=await page.evaluate(()=>!!document.getElementById('memoire-mod')&&!!document.querySelector('#memoire-scroll .m1-x'));
console.log('15) lecture seule :',JSON.stringify(out));
C.c15=out.n>=10&&out.dis&&out.ui.length===0&&/^Modèle : Comme l’affaire O2610-52/.test(out.info)&&out.res&&out.r1!==out.r0&&out.same&&out.back;
await ctx.close();
// ── 16) téléphone (390 px) : rien ne déborde ; ✕ / ＋ toujours visibles et ≥ 34 px ; ✕ au doigt puis ↶ Annuler ; fenêtre « disponibles » ; modèles
({ctx,page}=await open({viewport:{width:390,height:844},isMobile:true,hasTouch:true,deviceScaleFactor:2},'O2610-53','Réseau tel M1'));
const w2=ms=>page.waitForTimeout(ms);const ov=()=>page.evaluate(()=>({sw:document.documentElement.scrollWidth,iw:window.innerWidth}));
const tap=async v=>{await page.evaluate(v=>{const el=document.querySelector(`#eq-app [data-act=af][data-v="${v}"]`);if(!el)throw new Error('bouton absent '+v);el.scrollIntoView({block:'center'});},v);await page.tap(`#eq-app [data-act=af][data-v="${v}"]`);await w2(350);};
const sz=()=>page.evaluate(()=>{const L=[...document.querySelectorAll('#memoire-scroll .m1-x,#memoire-scroll .m1-bx,#memoire-scroll .m1-more,#memoire-scroll .m1-chip,#memoire-tree .m1-lnk,#memoire-undo,.m1-mod .btn:not([hidden]),#memoire-tree .m1-sechw .memoire-ck')].filter(e=>e.offsetParent);
  return {n:L.length,small:L.filter(e=>{const r=e.getBoundingClientRect();return r.height<34||r.width<34;}).map(e=>e.className+':'+Math.round(e.getBoundingClientRect().width)+'x'+Math.round(e.getBoundingClientRect().height)),hidden:L.filter(e=>e.closest('#memoire-scroll')&&(getComputedStyle(e).opacity!=='1'||getComputedStyle(e).pointerEvents==='none')).length};});
out={o1:await ov(),hn:await page.evaluate(()=>matchMedia('(hover:none)').matches)};
await tap('mlbsecall|1');await tap('mlbexp|m-presta');await tap('mlbres|m-presta');out.o2=await ov();out.sz=await sz();
await page.evaluate(()=>document.querySelector('#memoire-p-m-presta-3 .m1-x').scrollIntoView({block:'center'}));await page.tap('#memoire-p-m-presta-3 .m1-x');await w2(400);out.x=!(await onP()).includes('m-presta-3');out.o3=await ov();
await tap('mlbundo|');out.u=(await onP()).includes('m-presta-3');
await page.evaluate(()=>document.querySelector('#memoire-b-m-presta .m1-more').scrollIntoView({block:'center'}));await page.tap('#memoire-b-m-presta .m1-more');await w2(400);out.o4=await ov();out.mw=await page.evaluate(()=>{const b=document.querySelector('#modal.show .box');return b?Math.round(b.getBoundingClientRect().right):0;});
await page.tap('#modal [data-m1add="m-presta-9"]');await w2(450);out.add=(await onP()).includes('m-presta-9');
await tap('mlbmodsave|');out.o5=await ov();await page.evaluate(()=>document.querySelector('#modal [data-close]').click());await w2(200);
await tap('mlbs|2');out.sec=await page.evaluate(()=>{const x=document.querySelector('#eq-app input[data-v="mlbs|2"]');return x?x.checked:null;});out.o6=await ov();
console.log('16) téléphone :',JSON.stringify(out));
C.c16=[out.o1,out.o2,out.o3,out.o4,out.o5,out.o6].every(o=>o.sw<=o.iw)&&out.hn&&out.sz.n>=15&&out.sz.small.length===0&&out.sz.hidden===0&&out.x&&out.u&&out.mw<=391&&out.add&&out.sec===true;
await ctx.close();
C.console=logs.length===0;
const bad=Object.entries(C).filter(([k,v])=>!v).map(([k])=>k);console.log(bad.length?'RESULTAT: ECHEC '+bad.join(','):'RESULTAT: TOUT VERT');console.log(logs.length?logs:'[]');
await browser.close();
