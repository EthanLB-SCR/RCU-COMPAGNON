// COMMERCE, RETOURS DU 13/10/2026 (nuit) :
// 1) notes du DCE dans le chiffrage : une BULLE (nombre à prendre en compte) qui ouvre un panneau sur le côté — plus de longue liste au-dessus des tableaux ;
// 2) onglet « Points » retiré (doublon du chiffrage) : 1 Dossier · 2 Lecture · 3 Quantités · 4 Chiffrage · 5 Mémoire · 6 DPGF · 7 Offre ;
// 3) Quantités : le TRACÉ du chantier lié est la première puce, présenté comme un quantitatif (barres, ml, soudures, coudes, tés, piquages, réductions, vannes,
//    kits FDL) ; « ★ En faire la référence » ;
// 4) un tracé lié à une affaire pas encore gagnée n'est PAS un chantier (absent de la liste) ; affaire gagnée → il apparaît.
import { chromium } from 'playwright';
const BASE=process.env.BASE||'http://localhost:8765';
const browser=await chromium.launch({headless:true, executablePath: process.env.CHROMIUM_PATH||undefined});
const ctx=await browser.newContext({viewport:{width:1280,height:900}});const page=await ctx.newPage();
const logs=[];page.on('pageerror',e=>logs.push('PAGEERROR: '+e.message.slice(0,300)));page.on('console',m=>{if(m.type()==='error'&&!/supabase|Failed to fetch|net::ERR|404|WebSocket|pdf\.worker|cdnjs/i.test(m.text()))logs.push(m.text().slice(0,200));});
page.on('dialog',d=>d.accept().catch(()=>{}));
const C={};const wait=ms=>page.waitForTimeout(ms);
await page.goto(BASE+'/index.html');await wait(600);await page.evaluate(()=>{localStorage.clear();localStorage.setItem('trace:wide','1');});await page.reload();await wait(1200);
{const s=await page.$('#loginSkip');if(s&&await s.isVisible())await s.click();await wait(700);}
const click=async v=>{await page.evaluate(v=>{const el=document.querySelector(`#eq-app [data-act=af][data-v="${v}"]`);if(!el)throw new Error('bouton absent '+v);el.click();},v);await wait(260);};
const NUM='O2610-41';
await page.evaluate(async n=>{const T=window.TRACE;T.state.userId='ethan';T.renderHome();document.getElementById('htCom').click();await new Promise(x=>setTimeout(x,300));
  document.querySelector('#eq-app [data-act=af][data-v="seg|devis"]').click();await new Promise(x=>setTimeout(x,200));document.querySelector('#eq-app [data-act=af][data-v="new|"]').click();await new Promise(x=>setTimeout(x,150));document.getElementById('afn-num').value=n;document.getElementById('afn-nom').value='Réseau test';document.getElementById('afn-client').value='IDEX';document.getElementById('afn-etat').value='devis';
  document.querySelector('#eq-app [data-act=af][data-v="create|"]').click();await new Promise(x=>setTimeout(x,250));},NUM);
// une pièce du DCE avec deux notes (chiffrage, risque)
await page.evaluate(n=>{const T=window.TRACE;T.affaires.set(n,{dce:[{id:'D1',name:'CCTP.pdf',cat:'cctp',notes:[{texte:'Prévoir 2 épreuves',dests:['chiffrage'],ref:'art. 4'},{texte:'Fouilles en zone de captage',dests:['risque'],ref:'art. 7'}]}]});},NUM);
await click('tab|chiffrage');
let out={tabs:await page.evaluate(()=>[...document.querySelectorAll('#eq-app [data-v^="tab|"]')].map(b=>b.textContent.replace(/^✓ /,'').trim())),
  bub:await page.evaluate(()=>{const b=document.querySelector('#eq-app .cm-nbub');return b?b.textContent.replace(/\s+/g,' ').trim():null;}),longList:await page.evaluate(()=>document.querySelectorAll('#eq-app > .cm-notes, #eq-app .card > .cm-notes').length)};
await click('notesdrawer|');out.drawer=await page.evaluate(()=>{const d=document.querySelector('.cm-ndrawer');return d?{n:d.querySelectorAll('input[type=checkbox]').length,t:d.textContent.replace(/\s+/g,' ').slice(0,120)}:null;});
await page.evaluate(()=>{const c=document.querySelector('.cm-ndrawer input[type=checkbox]');c.click();});await wait(400);
out.after=await page.evaluate(()=>{const b=document.querySelector('#eq-app .cm-nbub');return b?b.textContent.replace(/\s+/g,' ').trim():null;});
await page.evaluate(()=>{const c=[...document.querySelectorAll('.cm-ndrawer input[type=checkbox]')].find(x=>!x.checked);if(c)c.click();});await wait(400);out.done=await page.evaluate(()=>{const b=document.querySelector('#eq-app .cm-nbub');return b?b.className:'';});
await click('notesdrawer|');out.closed=await page.evaluate(()=>!document.querySelector('.cm-ndrawer'));
console.log('1-2) bulle des notes, onglets :',JSON.stringify(out));
C.c12=out.tabs.join('|').includes('1 · Dossier|2 · Lecture|3 · Quantités|4 · Chiffrage|5 · Mémoire|6 · DPGF|7 · Offre')&&!out.tabs.some(t=>/Points/.test(t))&&/Notes du DCE 2/.test(out.bub)&&out.longList===0&&out.drawer&&out.drawer.n===2&&/Notes du DCE 1/.test(out.after)&&/\bok\b/.test(out.done)&&out.closed;
// ── 3) Quantités : le tracé (chantier de démo lié)
await page.evaluate(n=>{window.TRACE.affaires.set(n,{sites:['bain']});},NUM);await click('tab|quantites');
out={chips:await page.evaluate(()=>[...document.querySelectorAll('#eq-app .cm-qschips .chip')].map(c=>c.textContent.replace(/\s+/g,' ').trim())),
  head:await page.evaluate(()=>[...document.querySelectorAll('#eq-app .cm-qst tr:first-child th')].map(t=>t.textContent.trim())),
  tot:await page.evaluate(()=>{const r=[...document.querySelectorAll('#eq-app .cm-qst tr.tot td')].map(t=>t.textContent.trim());return r;}),
  bubble:await page.evaluate(()=>!!document.querySelector('#eq-app .cm-tbub')),open:await page.evaluate(()=>!!document.querySelector('#eq-app .cm-qsh [data-act="opensite"][data-v="bain"]'))};
const q=await page.evaluate(()=>window.TRACE.etude.qty('bain'));out.q={rows:q.rows.length,soud:q.tot.soud,coudes:q.tot.coudes,tes:q.tot.tes,piq:q.tot.piq,vannes:q.tot.vannes,kits:q.tot.kits,red:q.tot.red};
await click('qstake|trace:bain');out.ref=await page.evaluate(n=>{const a=window.TRACE.affaires.get(n);return {rows:(a.quantites.rows||[]).length,coudes:a.quantites.coudes,tes:a.quantites.tes,src:a.quantites.src&&a.quantites.src.nom};},NUM);
console.log('3) quantités du tracé :',JSON.stringify(out));
C.c3=out.chips.length>=1&&/^📐 Tracé · /.test(out.chips[0])&&/soudures/.test(out.chips[0])&&out.head.join('|')==='DN|Barres|ml de tube|ml de tranchée|Soudures|Coudes|Tés|Piquages|Réductions|Vannes|Kits FDL'&&!out.bubble&&out.open
  &&out.q.rows>=3&&out.q.soud>100&&out.q.coudes>0&&out.q.tes>0&&out.q.piq>0&&out.q.vannes>0&&out.q.kits>0&&out.ref.rows===out.q.rows&&out.ref.coudes===out.q.coudes&&/Tracé/.test(out.ref.src||'');
// ── 4) un tracé de commerce n'est pas un chantier tant que l'affaire n'est pas gagnée
await page.evaluate(()=>{const T=window.TRACE;const b=JSON.parse(JSON.stringify(T.SITES?T.SITES.bain:null)||'null');});
await page.evaluate(n=>{const T=window.TRACE;T.etude.addSite({id:'trc_etude1',name:'Tracé étude',w:100,h:100,lines:[{id:'L1',els:[{id:'P1',kind:'pipe',dn:100,len:12,axis:[[[0,0],[12,0]]],from:[0,0],to:[12,0]}],joints:[],length:12}],fiche:{etude:{aff:n}}});
  T.affaires.set(n,{sites:['bain','trc_etude1']});},NUM);
out={etude:await page.evaluate(()=>window.TRACE.etude.of('trc_etude1')),inList:await page.evaluate(()=>window.TRACE.etude.metas().includes('trc_etude1')),demo:await page.evaluate(()=>window.TRACE.etude.of('bain'))};
await page.evaluate(n=>{window.TRACE.affaires.set(n,{etat:'a_debuter'});},NUM);
out.won={etude:await page.evaluate(()=>window.TRACE.etude.of('trc_etude1')),inList:await page.evaluate(()=>window.TRACE.etude.metas().includes('trc_etude1'))};
await page.evaluate(n=>{window.TRACE.affaires.set(n,{etat:'perdu'});},NUM);out.lost=await page.evaluate(()=>window.TRACE.etude.of('trc_etude1'));
console.log('4) tracé de commerce :',JSON.stringify(out));
C.c4=out.etude===true&&out.inList===false&&out.demo===false&&out.won.etude===false&&out.won.inList===true&&out.lost===true;
const bad=Object.entries(C).filter(([k,v])=>!v).map(([k])=>k);console.log(bad.length?'RESULTAT: ECHEC '+bad.join(','):'RESULTAT: TOUT VERT');console.log(logs.length?logs:'[]');
await browser.close();
