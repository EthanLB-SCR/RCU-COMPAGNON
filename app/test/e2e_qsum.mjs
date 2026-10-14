// QUANTITÉS — SOMME DES TRACÉS (14/10/2026, Ethan) : « un chantier de 15 antennes se dessine en 15 tracés, un par antenne, tous liés à la même affaire :
// il faut LA SOMME de tous les tracés dans Quantités ». Affaire FICTIVE + 3 tracés FICTIFS liés (dont un vide), tous « étude » (affaire en devis) :
// 1) puce « Σ Tous les tracés · 2 tracés · N soudures » AVANT les tracés individuels, choisie par défaut ; synthèse par DN = somme EXACTE des quantités
//    de chaque tracé (TRACE.etude.qty), lignes triées par DN décroissant, total ;
// 2) en dessous une ligne par tracé (nom, soudures, ml de tranchée, « ↗ Ouvrir le tracé ») ; le tracé vide signalé « rien de tracé », pas compté ;
// 3) comparatif : colonne « Σ 2 tracés (somme) » avant les tracés ; « ★ En faire la référence » → a.quantites.src = {id:'trace:sum', sites:[…]},
//    « ★ référence » sur la puce, « → Préremplir le chiffrage » reprend ces DN ;
// 4) un seul tracé lié → plus de puce Σ, la puce du tracé redevient la première.
import { chromium } from 'playwright';
const BASE=process.env.BASE||'http://localhost:8765';
const browser=await chromium.launch({headless:true, executablePath: process.env.CHROMIUM_PATH||undefined});
const ctx=await browser.newContext({viewport:{width:1280,height:900}});const page=await ctx.newPage();
const logs=[];page.on('pageerror',e=>logs.push('PAGEERROR: '+e.message.slice(0,300)));page.on('console',m=>{if(m.type()==='error'&&!/supabase|Failed to fetch|net::ERR|404|WebSocket|pdf\.worker|cdnjs/i.test(m.text()))logs.push(m.text().slice(0,200));});
page.on('dialog',d=>d.accept().catch(()=>{}));
const C={};const wait=ms=>page.waitForTimeout(ms);
const NUM='O2610-61';
const click=async v=>{await page.evaluate(v=>{const el=document.querySelector(`#eq-app [data-act=af][data-v="${v}"]`);if(!el)throw new Error('bouton absent '+v);el.click();},v);await wait(260);};
const A=()=>page.evaluate(n=>window.TRACE.affaires.get(n),NUM);
const chips=()=>page.evaluate(()=>[...document.querySelectorAll('#eq-app .cm-qschips .chip')].map(c=>({t:c.textContent.replace(/\s+/g,' ').trim(),v:c.dataset.v||'',on:c.classList.contains('active'),sum:c.classList.contains('cm-qsum')})));
const numOf=t=>{const s=String(t).replace(/[^\d,.-]/g,'').replace(',','.');return s===''?null:+s;};
// ── préparation : une affaire en devis, 3 tracés fictifs liés (2 dessinés, 1 vide)
await page.goto(BASE+'/index.html');await wait(600);await page.evaluate(()=>{localStorage.clear();localStorage.setItem('trace:wide','1');});await page.reload();await wait(1200);
{const s=await page.$('#loginSkip');if(s&&await s.isVisible())await s.click();await wait(700);}
await page.evaluate(async n=>{const T=window.TRACE;T.state.userId='ethan';T.renderHome();document.getElementById('htCom').click();await new Promise(x=>setTimeout(x,300));
  document.querySelector('#eq-app [data-act=af][data-v="new|"]').click();await new Promise(x=>setTimeout(x,150));document.getElementById('afn-num').value=n;document.getElementById('afn-nom').value='Antennes test';document.getElementById('afn-client').value='CLIENT TEST';document.getElementById('afn-etat').value='devis';
  document.querySelector('#eq-app [data-act=af][data-v="create|"]').click();await new Promise(x=>setTimeout(x,250));},NUM);
C.c0=await page.evaluate(n=>!!window.TRACE.affaires.get(n),NUM);
await page.evaluate(n=>{const T=window.TRACE;const mk=(id,els,joints,parent)=>Object.assign({id,els,joints,length:els.reduce((s,e)=>s+e.len,0)},parent?{parent}:{});
  /* antenne 1 : DN100 (2 tronçons, un coude) + piquage DN65 ; antenne 2 : DN100 avec un té, DN80 avec une vanne et un bouchon ; antenne 3 : rien de tracé */
  T.etude.addSite({id:'trc_ant1',name:'Antenne 1',w:100,h:100,fiche:{etude:{aff:n}},lines:[
    mk('L1',[{kind:'pipe',dn:100,len:12},{kind:'bend',dn:100,len:0.5},{kind:'pipe',dn:100,len:8}],[{idx:0},{idx:2}]),
    mk('L2',[{kind:'pipe',dn:65,len:6.5}],[{idx:0}],'L1')]});
  T.etude.addSite({id:'trc_ant2',name:'Antenne 2',w:100,h:100,fiche:{etude:{aff:n}},lines:[
    mk('L1',[{kind:'pipe',dn:100,len:20},{kind:'tee',dn:100,len:1},{kind:'pipe',dn:100,len:5}],[{idx:0},{idx:0},{idx:2}]),
    mk('L2',[{kind:'pipe',dn:80,len:10},{kind:'valve',dn:80,len:0.3},{kind:'pipe',dn:80,len:3},{kind:'endcap',dn:80,len:0.2}],[{idx:0},{idx:2}],'L1')]});
  T.etude.addSite({id:'trc_ant3',name:'Antenne 3',w:100,h:100,fiche:{etude:{aff:n}},lines:[]});
  T.affaires.set(n,{sites:['trc_ant1','trc_ant2','trc_ant3']});},NUM);
// l'attendu : la somme par DN des quantités de chaque tracé dessiné (calculée ici, pas lue dans l'appli)
const EXP=await page.evaluate(()=>{const T=window.TRACE;const K=['barres','mlTube','mlTr','soud','coudes','tes','piq','red','vannes','kits'];const by={};const parts={};
  ['trc_ant1','trc_ant2','trc_ant3'].forEach(id=>{const q=T.etude.qty(id);parts[id]=q?{rows:q.rows.length,soud:q.tot.soud,mlTr:q.tot.mlTr}:null;if(!q)return;q.rows.forEach(r=>{const o=by[r.dn]||(by[r.dn]={dn:r.dn});K.forEach(k=>{o[k]=(o[k]||0)+r[k];});});});
  const rows=Object.values(by).sort((x,y)=>y.dn-x.dn).map(r=>{r.mlTr=Math.round(r.mlTr*10)/10;r.mlTube=Math.round(r.mlTube*10)/10;return r;});const tot={};K.forEach(k=>{tot[k]=Math.round(rows.reduce((s,r)=>s+r[k],0)*10)/10;});
  return {rows,tot,parts,etude:['trc_ant1','trc_ant2','trc_ant3'].map(id=>T.etude.of(id))};});
console.log('0) attendu :',JSON.stringify(EXP));
C.c0b=EXP.parts.trc_ant1&&EXP.parts.trc_ant2&&EXP.parts.trc_ant3===null&&EXP.rows.length===3&&EXP.rows.map(r=>r.dn).join()==='100,80,65'&&EXP.tot.soud===(EXP.parts.trc_ant1.soud+EXP.parts.trc_ant2.soud)&&EXP.tot.soud>0&&EXP.tot.tes>0&&EXP.tot.vannes>0&&EXP.tot.kits>0&&EXP.tot.piq>0&&EXP.etude.every(x=>x===true);
// ── 1) la puce Σ en tête, choisie par défaut ; la synthèse additionnée par DN
await click('tab|quantites');
let out={chips:await chips(),head:await page.evaluate(()=>[...document.querySelectorAll('#eq-app .cm-qst tr:first-child th')].map(t=>t.textContent.trim())),
  rows:await page.evaluate(()=>[...document.querySelectorAll('#eq-app .cm-qst tr')].slice(1).filter(r=>!r.classList.contains('tot')).map(r=>[...r.cells].map(c=>c.textContent.trim()))),
  tot:await page.evaluate(()=>{const r=document.querySelector('#eq-app .cm-qst tr.tot');return r?[...r.cells].map(c=>c.textContent.trim()):null;}),
  sh:await page.evaluate(()=>{const h=document.querySelector('#eq-app .cm-qsh');const t=s=>{const e=h&&h.querySelector(s);return e?e.textContent.replace(/\s+/g,' ').trim():'';};return {b:t('b'),dim:t('.dim'),btn:t('button.primary')};})};
console.log('1) puce Σ et synthèse :',JSON.stringify(out));
const K=['barres','mlTube','mlTr','soud','coudes','tes','piq','red','vannes','kits'];
const rowOk=(cells,r)=>cells[0]==='DN '+r.dn&&K.every((k,i)=>numOf(cells[i+1])===r[k]);
C.c1=out.chips.length===4&&out.chips[0].sum&&out.chips[0].on&&out.chips[0].v==='qssel|trace:sum'&&out.chips[0].t==='Σ Tous les tracés · 2 tracés · '+EXP.tot.soud+' soudures'
  &&out.chips[1].t.startsWith('📐 Tracé · Antenne 1 · ')&&out.chips[2].t.startsWith('📐 Tracé · Antenne 2 · ')&&/^📐 Tracé · Antenne 3 · rien de tracé$/.test(out.chips[3].t)&&!out.chips.slice(1).some(c=>c.on)
  &&out.head.join('|')==='DN|Barres|ml de tube|ml de tranchée|Soudures|Coudes|Tés|Piquages|Réductions|Vannes|Kits FDL'
  &&out.rows.length===3&&out.rows.every((cells,i)=>rowOk(cells,EXP.rows[i]))&&out.tot&&out.tot[0]==='Total'&&K.every((k,i)=>numOf(out.tot[i+1])===EXP.tot[k])
  &&out.sh.b==='Σ Tous les tracés'&&/^2 tracés liés, quantités additionnées par DN/.test(out.sh.dim)&&/1 tracé sans rien de tracé, pas compté/.test(out.sh.dim)&&out.sh.btn==='★ En faire la référence';
// ── 2) une ligne par tracé : nom, soudures, ml de tranchée, « ↗ Ouvrir le tracé » ; le vide signalé
out={lines:await page.evaluate(()=>[...document.querySelectorAll('#eq-app .cm-qsum-t')].map(l=>{const b=l.querySelector('button');const t=s=>{const e=l.querySelector(s);return e?e.textContent.replace(/\s+/g,' ').trim():'';};return {nom:t(':scope>b'),q:t(':scope>span'),off:l.classList.contains('off'),act:b&&b.dataset.act,v:b&&b.dataset.v,btn:b?b.textContent.trim():''};}))};
console.log('2) une ligne par tracé :',JSON.stringify(out));
const fr=(x,d)=>x.toLocaleString('fr-FR',{maximumFractionDigits:d});
C.c2=out.lines.length===3&&out.lines[0].nom==='📐 Antenne 1'&&out.lines[0].q===fr(EXP.parts.trc_ant1.soud,0)+' soudures · '+fr(EXP.parts.trc_ant1.mlTr,1)+' ml de tranchée'&&out.lines[0].btn==='↗ Ouvrir le tracé'&&out.lines[0].act==='opensite'&&out.lines[0].v==='trc_ant1'&&!out.lines[0].off
  &&out.lines[1].nom==='📐 Antenne 2'&&out.lines[1].q===fr(EXP.parts.trc_ant2.soud,0)+' soudures · '+fr(EXP.parts.trc_ant2.mlTr,1)+' ml de tranchée'&&out.lines[1].btn==='↗ Ouvrir le tracé'&&out.lines[1].v==='trc_ant2'
  &&out.lines[2].nom==='📐 Antenne 3'&&out.lines[2].q==='rien de tracé · pas compté'&&out.lines[2].btn==='✎ Tracer'&&out.lines[2].off&&out.lines[2].act==='opensite'&&out.lines[2].v==='trc_ant3';
// ── 3) comparatif avec la colonne Σ ; « ★ En faire la référence » → src trace:sum ; préremplissage du chiffrage avec ces DN
out={th:await page.evaluate(()=>[...document.querySelectorAll('#eq-app .cm-qcmp tr:first-child th')].map(x=>x.textContent.replace(/\s+/g,' ').trim())),
  btns:await page.evaluate(()=>[...document.querySelectorAll('#eq-app .cm-qsets [data-v^="qstake|"]')].map(b=>b.dataset.v))};
await click('qstake|trace:sum');await wait(300);
out.q=await A().then(a=>{const q=a.quantites||{};return {src:q.src,rows:(q.rows||[]).map(r=>r.dn+':'+r.soud+'/'+r.ml),ml:q.ml,coudes:q.coudes,tes:q.tes,reductions:q.reductions,vannes:q.vannes};});
out.after=await page.evaluate(()=>({chip:(document.querySelector('#eq-app .cm-qschips .chip')||{}).textContent||'',tag:!!document.querySelector('#eq-app .cm-qsh .eq-tag.ok'),btn:!![...document.querySelectorAll('#eq-app .cm-qsh button')].find(x=>/En faire la référence/.test(x.textContent)),src:(document.querySelector('#eq-app .cm-qsrc')||{}).textContent||'',hint:[...document.querySelectorAll('#eq-app .cm-qsets .hint')].map(h=>h.textContent).join(' ')}));
await click('qprefill|');await wait(400);
out.ch=await A().then(a=>{const E=(a.chiffrage||{}).etudes||(a.chiffrage||{}).zones||[];const z=E.find(z=>/Quantités de référence/.test(z.nom));return z?{dn:(z.dn||z.rows||[]).map(r=>r.dn+':'+(r.soud!==undefined?r.soud:r.nb)+'/'+r.ml)}:null;});
console.log('3) comparatif, référence, chiffrage :',JSON.stringify(out));
C.c3=out.th.join('|')==='DN|★ Référence|Σ 2 tracés (somme)|Tracé · Antenne 1 (tracé)|Tracé · Antenne 2 (tracé)|Tracé · Antenne 3 (tracé)'&&out.btns.filter(v=>v==='qstake|trace:sum').length===2 /* en tête et sous le comparatif */
  &&out.q.src&&out.q.src.id==='trace:sum'&&out.q.src.nom==='Σ 2 tracés'&&(out.q.src.sites||[]).join()==='trc_ant1,trc_ant2'&&out.q.rows.join()===EXP.rows.map(r=>r.dn+':'+r.soud+'/'+r.mlTr).join()
  &&out.q.ml===EXP.tot.mlTr&&out.q.coudes===EXP.tot.coudes&&out.q.tes===EXP.tot.tes&&out.q.reductions===EXP.tot.red&&out.q.vannes===EXP.tot.vannes
  &&/Σ Tous les tracés · 2 tracés · .* · ★ référence$/.test(out.after.chip.replace(/\s+/g,' ').trim())&&out.after.tag&&!out.after.btn&&/prises sur Σ 2 tracés/.test(out.after.src)&&/Référence prise sur « Σ 2 tracés »/.test(out.after.hint)
  &&out.ch&&out.ch.dn.join()===EXP.rows.map(r=>r.dn+':'+r.soud+'/'+r.mlTr).join();
// ── 3b) un 4e tracé dessiné et lié APRÈS la prise de référence : la puce dit « à reprendre », le bouton revient ; reprise → 3 tracés dans src.sites
await page.evaluate(n=>{const T=window.TRACE;T.etude.addSite({id:'trc_ant4',name:'Antenne 4',w:100,h:100,fiche:{etude:{aff:n}},lines:[{id:'L1',els:[{kind:'pipe',dn:100,len:12}],joints:[{idx:0}],length:12}]});T.affaires.set(n,{sites:['trc_ant1','trc_ant2','trc_ant3','trc_ant4']});},NUM);
await click('tab|quantites');await click('qssel|trace:sum');
out={chip:(await chips())[0],btn:await page.evaluate(()=>{const b=[...document.querySelectorAll('#eq-app .cm-qsh button')].find(x=>/référence/.test(x.textContent));return b?b.textContent.trim():null;}),tag:await page.evaluate(()=>!!document.querySelector('#eq-app .cm-qsh .eq-tag.ok'))};
await click('qstake|trace:sum');await wait(300);out.after={chip:(await chips())[0].t,sites:await A().then(a=>(a.quantites.src.sites||[]).join()),soud:await A().then(a=>a.quantites.rows.reduce((s,r)=>s+r.soud,0))};
console.log('3b) tracé ajouté après la référence :',JSON.stringify(out));
C.c3b=out.chip.t==='Σ Tous les tracés · 3 tracés · '+(EXP.tot.soud+2)+' soudures · ★ référence · à reprendre'&&out.btn==='★ Reprendre la référence'&&!out.tag
  &&out.after.chip==='Σ Tous les tracés · 3 tracés · '+(EXP.tot.soud+2)+' soudures · ★ référence'&&out.after.sites==='trc_ant1,trc_ant2,trc_ant4'&&out.after.soud===EXP.tot.soud+2;
// ── 4) la puce d'un tracé seul marche toujours (ses quantités, « ↗ Ouvrir le tracé ») ; Σ choisie puis un seul tracé lié → plus de puce Σ, le tracé redevient la 1re puce
await click('qssel|trace:trc_ant1');
out={one:await page.evaluate(()=>{const h=document.querySelector('#eq-app .cm-qsh');const b=h&&h.querySelector('[data-act="opensite"]');return {sh:h?h.textContent.replace(/\s+/g,' ').trim().slice(0,40):'',v:b&&b.dataset.v,n:document.querySelectorAll('#eq-app .cm-qsum-t').length,soud:(()=>{const r=document.querySelector('#eq-app .cm-qst tr.tot');return r?r.cells[4].textContent.trim():'';})()};})};
await click('qssel|trace:sum');out.back=(await chips())[0].on;
await page.evaluate(n=>{window.TRACE.affaires.set(n,{sites:['trc_ant1']});},NUM);await click('tab|dossier');await click('tab|quantites');
out.chips=await chips();out.th=await page.evaluate(()=>[...document.querySelectorAll('#eq-app .cm-qcmp tr:first-child th')].map(x=>x.textContent.replace(/\s+/g,' ').trim()));out.sumBtn=await page.evaluate(()=>!!document.querySelector('#eq-app [data-v="qstake|trace:sum"]'));
console.log('4) tracé seul, puis un seul tracé lié :',JSON.stringify(out));
C.c4=/^📐 Tracé · Antenne 1/.test(out.one.sh)&&out.one.v==='trc_ant1'&&out.one.n===0&&numOf(out.one.soud)===EXP.parts.trc_ant1.soud&&out.back
  &&out.chips.length===1&&!out.chips.some(c=>c.sum)&&out.chips[0].v==='qssel|trace:trc_ant1'&&out.chips[0].on&&!out.th.some(t=>/somme/.test(t))&&!out.sumBtn;
C.logs=logs.length===0;
const bad=Object.entries(C).filter(([k,v])=>!v).map(([k])=>k);console.log(bad.length?'RESULTAT: ECHEC '+bad.join(','):'RESULTAT: TOUT VERT');console.log(logs.length?logs:'[]');
await browser.close();
