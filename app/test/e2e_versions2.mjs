// 14/10 après-midi (lot D) — VERSIONS DE CHIFFRAGE v2 (Ethan : « revenir sur une ancienne version juste pour consulter, sans la modifier, sans que ça écrase tout
// et recrée une version […] la v2 est un copier-coller de tout […] des documents complémentaires (mail, CR) qui servent d'écrit officiel […] enlève les limites »).
// Hors connexion (Ethan, administrateur), données FICTIVES : (1) ＋ Nouvelle version = instantané complet (chiffrage, quantités, tracé lié, DPGF, mémoire, offre),
// « aucune modification de quantités ni de tracé » ; (2) consultation de la v1 en LECTURE SEULE (bandeau, champs refusés, rien d'écrasé ni recréé) dans les 5 onglets ;
// (3) quantités et tracé modifiés en v2 → écart détecté ; (4) écrit officiel : un mail .eml annoté « radio 15 % → 10 % », appliqué dans la v2, pièce du dossier ;
// (5) v3 : l'écart v1 → v2 à la création, champs identiques stockés en renvoi ; (6) consultations v1 / v2 justes ; (7) « Repartir de la v1 » = nouvelle version,
// rien d'écrasé ; (8) plus de limite (13 versions) ; (9) ✕ d'une version empruntée : recopie ; (10) ancien format {v, chiffrage, total} lisible et consultable ; évènement trace:chiffrageV.
import { chromium } from 'playwright';
const BASE=process.env.BASE||'http://localhost:8765';
const browser=await chromium.launch({headless:true, executablePath: process.env.CHROMIUM_PATH||undefined});
const ctx=await browser.newContext({viewport:{width:430,height:900}});const page=await ctx.newPage();
const logs=[];page.on('pageerror',e=>logs.push('PAGEERROR: '+e.message.slice(0,300)));page.on('console',m=>{if(m.type()==='error'&&!/supabase|Failed to fetch|net::ERR|404|WebSocket/i.test(m.text()))logs.push(m.text().slice(0,200));});
page.on('dialog',d=>d.accept().catch(()=>{}));
const C={};const wait=ms=>page.waitForTimeout(ms);
await page.goto(BASE+'/index.html');await wait(600);await page.evaluate(()=>{localStorage.clear();});await page.evaluate(()=>new Promise(r=>{try{const q=indexedDB.deleteDatabase('trace-kv');q.onsuccess=q.onerror=q.onblocked=()=>r();}catch(e){r();}}));
await page.reload();await wait(1200);const sk=await page.$('#loginSkip');if(sk&&await sk.isVisible())await sk.click();await wait(700);
const txt=()=>page.evaluate(()=>document.getElementById('eq-app').textContent.replace(/\s+/g,' '));
const click=async(v)=>{const ok=await page.evaluate(v=>{const b=document.querySelector(`#eq-app [data-act=af][data-v="${v}"]`);if(b)b.click();return !!b;},v);await wait(300);return ok;};
const set=async(sel,val)=>page.evaluate(([s,v])=>{const el=document.querySelector(s);if(!el)return false;el.value=v;el.dispatchEvent(new Event('change',{bubbles:true}));return true;},[sel,val]);
const aff=n=>page.evaluate(n=>window.TRACE.affaires.get(n),n);
const NUM='O2610-31';
/* tracé FICTIF lié à l'affaire : une ligne DN 100 (2 barres, 1 joint × 2 conduites) */
const net=n=>({id:'trace_fictif_v',name:'Tracé fictif',lines:Array.from({length:n},(x,i)=>({id:'L'+i,dn:100,els:[{kind:'pipe',len:12,dn:100},{kind:'pipe',len:12,dn:100}],joints:[{idx:1}]}))});
// ── 0) mise en place : paramètres V2B FICTIFS, affaire, tracé lié, quantités DN 100 / DN 150 → chiffrage prérempli
await page.evaluate(()=>{window.__ev=[];window.addEventListener('trace:chiffrageV',e=>window.__ev.push(e.detail));const T=window.TRACE;T.state.userId='ethan';T.renderHome();document.getElementById('htCom').click();});await wait(300);
await page.evaluate(()=>window.TRACE.affaires.v1Set({taux:80,heures:10,nSoud:3,nManch:1,autocontrole:0.05,ratioManchons:0.9,marge:0.1,dechets:0.1,radioPct:0.05,radioVac:10,radioForfait:1500,radioPU:[[65,80],[200,100],[400,120],[9999,140]],cad:{100:[10,10],150:[8,8]},rcfa:{}}));
await click('new|');await page.evaluate(n=>{document.getElementById('afn-num').value=n;document.getElementById('afn-nom').value='Ville fictive — réseau test';document.getElementById('afn-client').value='CLIENT FICTIF';document.getElementById('afn-etat').value='devis';},NUM);await click('create|');
await page.evaluate(([n,N])=>{window.TRACE.etude.addSite(N);window.TRACE.affaires.set(n,{sites:['trace_fictif_v']});},[NUM,net(1)]);
await click('tab|quantites');await click('qadd|');await set('#eq-app [data-afqr="0|dn"]','100');await wait(150);await set('#eq-app [data-afqr="0|soud"]','120');await wait(150);await set('#eq-app [data-afqr="0|ml"]','640');await wait(150);
await click('qadd|');await set('#eq-app [data-afqr="1|dn"]','150');await wait(150);await set('#eq-app [data-afqr="1|soud"]','40');await wait(150);await set('#eq-app [data-afqr="1|ml"]','300');await wait(150);
await click('qprefill|');await wait(200);
let out=await page.evaluate(n=>{const a=window.TRACE.affaires.get(n);const Cc=window.TRACE.affaires.calc(a);return {v:a.chiffrageV||1,total:Math.round(Cc.total),rows:(a.quantites.rows||[]).map(r=>r.dn+':'+r.soud),tab:window.TRACE.affaires.state().tab,qty:window.TRACE.etude.qty('trace_fictif_v')};},NUM);
console.log('0) mise en place :',JSON.stringify(out));const T1=out.total;
C.c0=out.v===1&&out.total>0&&out.rows.join()==='100:120,150:40'&&out.tab==='chiffrage'&&out.qty&&out.qty.tot.soud===2;
// ── 1) ＋ Nouvelle version → fenêtre (« première version ») → v2 : instantané complet de la v1, plus de « 10 au maximum », « aucune modification »
out={btn:await page.evaluate(()=>(document.querySelector('#eq-app [data-act=af][data-v="vnew|"]')||{}).textContent||'')};
await click('vnew|');out.modal=await page.evaluate(()=>{const m=document.getElementById('modal');return {open:m.classList.contains('show'),txt:m.textContent.replace(/\s+/g,' '),note:(document.getElementById('vv-note')||{}).value};});
await page.evaluate(()=>{document.getElementById('vv-note').value='Négociation · remise 3 %';document.getElementById('vv-ok').click();});await wait(400);
out.a=await page.evaluate(n=>{const a=window.TRACE.affaires.get(n);const x=(a.chiffrages||[])[0]||{};const S=x.snap||{};return {v:a.chiffrageV,kept:(a.chiffrages||[]).length,note:a.chiffrageNote,xv:x.v,xnote:x.note,keys:Object.keys(S).sort().join(),q:((S.quantites||{}).rows||[]).map(r=>r.dn+':'+r.soud).join(),tr:S.traces&&S.traces.trace_fictif_v&&S.traces.trace_fictif_v.rows.map(r=>r.dn+':'+r.soud+':'+r.mlTr).join(),sum:x.sum&&Math.round(x.sum.total),total:x.total,vat:!!a.chiffrageVAt,ev:window.__ev.slice()};},NUM);
out.t=await txt();
console.log('1) nouvelle version :',JSON.stringify({...out,t:out.t.slice(0,240)}));
C.c1=/Nouvelle version/.test(out.btn)&&!/maximum/.test(out.btn)&&out.modal.open&&/Première version/.test(out.modal.txt)&&/copie de tout/.test(out.modal.txt)&&out.a.v===2&&out.a.kept===1&&out.a.note==='Négociation · remise 3 %'&&out.a.xv===1&&out.a.xnote==='version initiale'
  &&out.a.keys==='dpgf,memoire,offre,points,qsets,quantites,sites,traces'&&out.a.q==='100:120,150:40'&&out.a.tr==='100:2:24'&&out.a.sum===T1&&out.a.total===T1&&out.a.vat&&out.a.ev.length===1&&out.a.ev[0].num===NUM&&out.a.ev[0].v===2&&out.a.ev[0].prev===1&&out.a.ev[0].action==='nouvelle'
  &&/v2 : nouvelle version mais aucune modification de quantités ni de tracé depuis la v1/.test(out.t)&&/v1 · version initiale/.test(out.t)&&/version 2 · Négociation · remise 3 %/.test(out.t);
// ── 2) consulter la v1 : bandeau, lecture seule dans les 5 onglets, rien d'écrasé ni recréé (aucune écriture de l'affaire en attente pendant la consultation)
const pend=()=>page.evaluate(n=>JSON.stringify((window.TRACE.reg.pending()||[]).find(w=>w.kind==='affaire'&&w.id===n)||null),NUM);const P0=await pend();
await click('vview|1');out=await page.evaluate(()=>({vview:window.TRACE.affaires.state().vview,band:(document.querySelector('#eq-app .vv-band')||{}).textContent||'',dis:[...document.querySelectorAll('#eq-app [data-afz]')].length&&[...document.querySelectorAll('#eq-app [data-afz]')].every(x=>x.disabled),vnew:!!document.querySelector('#eq-app [data-act=af][data-v="vnew|"]'),stat:[...document.querySelectorAll('#eq-app .af-head .ac-stat small')].map(x=>x.textContent).join('|')}));
await set('#eq-app [data-afz="0|nb"]','999');await wait(250);out.toast=await page.evaluate(()=>document.getElementById('toast').textContent);
out.after=await page.evaluate(n=>{const a=window.TRACE.affaires.get(n);const z=(a.chiffrage.zones||[])[0]||{};return {v:a.chiffrageV,kept:(a.chiffrages||[]).length,nb:(z.rows||[]).map(r=>r.nb).join()};},NUM);
const tabs={};for(const t of ['quantites','memoire','dpgf','offre','chiffrage']){await click('tab|'+t);tabs[t]=await page.evaluate(()=>({band:!!document.querySelector('#eq-app .vv-band:not(.slim)'),ro:/lecture seule/.test((document.querySelector('#eq-app .vv-band')||{}).textContent||''),qadd:!!document.querySelector('#eq-app [data-act=af][data-v="qadd|"]'),q:[...document.querySelectorAll('#eq-app [data-afqr$="|soud"]')].map(x=>x.value+(x.disabled?'d':'')).join(),offre:!!document.querySelector('#eq-app #dob-offre'),remise:!!document.querySelector('#eq-app [data-act=af][data-v="oremise|"]')}));}
await click('tab|dossier');tabs.dossier=await page.evaluate(()=>!!document.querySelector('#eq-app .vv-band.slim'));
out.pend=(await pend())===P0;await click('tab|chiffrage');await click('vexit|');out.exit=await page.evaluate(()=>({vview:window.TRACE.affaires.state().vview,band:!!document.querySelector('#eq-app .vv-band'),edit:[...document.querySelectorAll('#eq-app [data-afz]')].some(x=>!x.disabled)}));
console.log('2) consultation v1 :',JSON.stringify({...out,tabs,band:out.band.slice(0,160)}));
C.c2=out.vview===1&&/Tu consultes la v1/.test(out.band)&&/lecture seule/.test(out.band)&&/Revenir à la version en cours \(v2\)/.test(out.band)&&out.dis&&!out.vnew&&/v1 consultée/.test(out.stat)&&/Lecture seule/.test(out.toast)&&out.after.v===2&&out.after.kept===1&&!/999/.test(out.after.nb)
  &&Object.entries(tabs).filter(([k])=>k!=='dossier').every(([k,x])=>x.band&&x.ro)&&!tabs.quantites.qadd&&tabs.quantites.q==='120d,40d'&&tabs.offre.offre&&!tabs.offre.remise&&tabs.dossier&&out.pend&&out.exit.vview===null&&!out.exit.band&&out.exit.edit;
// ── 3) v2 : quantités (DN 100 : 120 → 132) et tracé (une 2e ligne) modifiés → écart détecté ; chiffrage repris
await click('tab|quantites');await set('#eq-app [data-afqr="0|soud"]','132');await wait(200);await page.evaluate(N=>window.TRACE.etude.addSite(N),net(2));await wait(2200);
await click('qprefill|');await wait(300);
out=await page.evaluate(n=>{const a=window.TRACE.affaires.get(n);return {total:Math.round(window.TRACE.affaires.calc(a).total),bar:(document.querySelector('#eq-app .vv-bar')||{}).textContent||''};},NUM);
console.log('3) écart en v2 :',JSON.stringify({...out,bar:out.bar.replace(/\s+/g,' ').slice(0,400)}));const T2=out.total;
C.c3=T2>T1&&/Depuis la v1 : DN 100 : soudures 120 → 132 \(\+12\)/.test(out.bar)&&/tracé « Tracé fictif » : DN 100 \+2 soudures \(2 → 4\)/.test(out.bar.replace(/\s+/g,' '))&&!/aucune modification de quantités ni de tracé depuis la v1\./.test(out.bar.split('🕘')[0]);
// ── 4) écrit officiel sur la v1 : un mail .eml (objet et texte encodés) annoté « radio 15 % → 10 % », appliqué dans la v2 → pièce du dossier, dans l'historique
const EML=['From: =?UTF-8?Q?Ma=C3=AEtre_d=27=C5=93uvre_fictif?= <moe@exemple.invalid>','To: bureau@exemple.invalid','Subject: =?UTF-8?Q?Radios_ramen=C3=A9es_=C3=A0_10_%?=','Date: Wed, 14 Oct 2026 09:12:00 +0200','MIME-Version: 1.0','Content-Type: multipart/alternative; boundary="b1"','','--b1','Content-Type: text/plain; charset=UTF-8','Content-Transfer-Encoding: quoted-printable','','Bonjour,','Apr=C3=A8s l=27alignement technique : finalement 10 % de radios au lieu de 15 %.','Cordialement','--b1','Content-Type: text/html; charset=UTF-8','','<p>HTML</p>','--b1--',''].join('\r\n');
await page.evaluate(()=>{const d=document.querySelector('#eq-app details.vv-hist');if(d)d.open=true;});await click('vdoc|1');
out={modal:await page.evaluate(()=>!!document.getElementById('vd-file')&&/Écrit officiel · v1/.test(document.getElementById('modal').textContent))};
await page.setInputFiles('#vd-file',{name:'mail-moe.eml',mimeType:'message/rfc822',buffer:Buffer.from(EML,'utf8')});await wait(400);
out.pre=await page.evaluate(()=>({name:document.getElementById('vd-name').value,from:document.getElementById('vd-from').value,date:document.getElementById('vd-date').value}));
await page.evaluate(()=>{document.getElementById('vd-note').value='radio 15 % → 10 %';document.getElementById('vd-app').value='2';document.getElementById('vd-ok').click();});await wait(900);
out.doc=await page.evaluate(n=>{const a=window.TRACE.affaires.get(n);const d=(a.dce||[]).find(x=>x.ver);return d&&{name:d.name,cat:d.catKey,v:d.ver.v,applied:d.ver.applied,notes:(d.ver.notes||[]).map(x=>x.t),text:/finalement 10 % de radios au lieu de 15 %/.test(d.text||''),from:d.from,date:d.date,local:!!d.local,id:d.id};},NUM);
await page.evaluate(()=>{const d=document.querySelector('#eq-app details.vv-hist');if(d)d.open=true;});out.hist=await page.evaluate(()=>((document.querySelector('#eq-app .vv-hist')||{}).textContent||'').replace(/\s+/g,' '));
await click('tab|dossier');out.dossier=await page.evaluate(()=>/📨 v1/.test(document.getElementById('eq-app').textContent));
await click('dcopen|'+out.doc.id);out.lect=await page.evaluate(()=>({tab:window.TRACE.affaires.state().tab,txt:/finalement 10 % de radios/.test(document.getElementById('eq-app').textContent)}));
console.log('4) écrit officiel :',JSON.stringify({...out,hist:out.hist.slice(0,300)}));
C.c4=out.modal&&out.pre.name==='Radios ramenées à 10 %'&&/Maître d'œuvre fictif/.test(out.pre.from)&&out.pre.date==='2026-10-14'&&out.doc&&out.doc.name==='Radios ramenées à 10 %'&&out.doc.cat==='courrier'&&out.doc.v===1&&out.doc.applied===2&&out.doc.notes.join()==='radio 15 % → 10 %'&&out.doc.text&&out.doc.local
  &&/Radios ramenées à 10 %/.test(out.hist)&&/✎ radio 15 % → 10 %/.test(out.hist)&&/appliqué dans la v2/.test(out.hist)&&out.dossier&&out.lect.tab==='lecture';
// ── 5) v3 : la fenêtre montre l'écart v1 → v2 ; dans la v2 figée, les champs identiques à la v1 sont des renvois ({$v:1})
await click('tab|chiffrage');await click('vnew|');out={modal:await page.evaluate(()=>document.getElementById('modal').textContent.replace(/\s+/g,' '))};
await page.evaluate(()=>{document.getElementById('vv-note').value='Alignement technique';document.getElementById('vv-ok').click();});await wait(400);
out.a=await page.evaluate(n=>{const a=window.TRACE.affaires.get(n);const x=(a.chiffrages||[]).find(y=>y.v===2)||{};const S=x.snap||{};return {v:a.chiffrageV,kept:(a.chiffrages||[]).length,memRef:JSON.stringify(S.memoire),offreRef:JSON.stringify(S.offre),q:((S.quantites||{}).rows||[]).map(r=>r.dn+':'+r.soud).join(),tr:JSON.stringify(S.traces&&S.traces.trace_fictif_v&&S.traces.trace_fictif_v.rows.map(r=>r.soud)),total:x.total};},NUM);
console.log('5) v3 :',JSON.stringify({...out,modal:out.modal.slice(0,420)}));
C.c5=/Ce qui a changé dans la v2 depuis la v1/.test(out.modal)&&/DN 100 : soudures 120 → 132 \(\+12\)/.test(out.modal)&&/prix de vente/.test(out.modal)&&out.a.v===3&&out.a.kept===2&&out.a.memRef==='{"$v":1}'&&out.a.offreRef==='{"$v":1}'&&out.a.q==='100:132,150:40'&&out.a.tr==='[4]'&&out.a.total===T2;
// ── 6) consulter la v1 puis la v2 : chacune ses quantités ; l'écart de la v2 par rapport à la v1 dans le bandeau
await click('vview|1');await click('tab|quantites');out={v1:await page.evaluate(()=>[...document.querySelectorAll('#eq-app [data-afqr$="|soud"]')].map(x=>x.value).join())};
await click('vview|2');out.v2=await page.evaluate(()=>({q:[...document.querySelectorAll('#eq-app [data-afqr$="|soud"]')].map(x=>x.value).join(),band:((document.querySelector('#eq-app .vv-band')||{}).textContent||'').replace(/\s+/g,' ')}));
out.cur=await page.evaluate(n=>{const a=window.TRACE.affaires.get(n);return (a.quantites.rows||[]).map(r=>r.soud).join();},NUM);
await click('vexit|');
console.log('6) consultations :',JSON.stringify({...out,v2:{...out.v2,band:out.v2.band.slice(0,300)}}));
C.c6=out.v1==='120,40'&&out.v2.q==='132,40'&&/Tu consultes la v2/.test(out.v2.band)&&/par rapport à la v1/.test(out.v2.band)&&/DN 100 : soudures 120 → 132/.test(out.v2.band)&&/Radios ramenées à 10 %/.test(out.v2.band)===false&&out.cur==='132,40';
// ── 7) « ⇢ Repartir de la v1 » : la v3 est figée, une v4 démarre comme une copie de la v1 ; la v2 reste intacte
await click('tab|chiffrage');await page.evaluate(()=>{const d=document.querySelector('#eq-app details.vv-hist');if(d)d.open=true;});out={lab:await page.evaluate(()=>(document.querySelector('#eq-app [data-act=af][data-v="vrestore|1"]')||{}).textContent||'')};
await click('vrestore|1');out.a=await page.evaluate(n=>{const a=window.TRACE.affaires.get(n);const v2=(a.chiffrages||[]).find(y=>y.v===2)||{};return {v:a.chiffrageV,kept:(a.chiffrages||[]).map(y=>y.v).join(),note:a.chiffrageNote,from:a.chiffrageFrom,q:(a.quantites.rows||[]).map(r=>r.soud).join(),v2q:((v2.snap||{}).quantites||{rows:[]}).rows.map(r=>r.soud).join(),v3note:((a.chiffrages||[]).find(y=>y.v===3)||{}).note,ev:window.__ev.slice(-1)[0]};},NUM);
console.log('7) repartir de la v1 :',JSON.stringify(out));
C.c7=/Repartir de cette version/.test(out.lab)&&out.a.v===4&&out.a.kept==='1,2,3'&&/reprise de la v1/.test(out.a.note)&&out.a.from===1&&out.a.q==='120,40'&&out.a.v2q==='132,40'&&/avant reprise de la v1/.test(out.a.v3note||'')&&out.a.ev.action==='reprise'&&out.a.ev.from===1&&out.a.ev.v===4;
// ── 8) plus de limite : 9 versions de plus (v13 en cours, 12 figées), pas de « maximum »
for(let i=0;i<9;i++){await click('vnew|');await page.evaluate(i=>{document.getElementById('vv-note').value='Tour '+(i+5);document.getElementById('vv-ok').click();},i);await wait(150);}
out=await page.evaluate(n=>{const a=window.TRACE.affaires.get(n);return {v:a.chiffrageV,kept:(a.chiffrages||[]).length,toast:document.getElementById('toast').textContent};},NUM);
await page.evaluate(()=>{const T=window.TRACE;document.querySelector('#eq-app [data-act=af][data-v="back|"]').click();});await wait(250);await click('seg|rep');out.rep=/v13 \(12 gardées\)/.test(await txt());
console.log('8) sans limite :',JSON.stringify(out));
C.c8=out.v===13&&out.kept===12&&!/maximum/.test(out.toast)&&out.rep;
// ── 9) ✕ la v1 (la v2 lui emprunte mémoire et offre) : recopie avant retrait ; l'écrit officiel passe à la v2 ; la v2 reste consultable
await page.evaluate(n=>{const T=window.TRACE;T.affaires.state().cur=n;T.affaires.state().view='fiche';T.affaires.state().tab='chiffrage';},NUM);await click('seg|devis');await page.evaluate(n=>{const b=[...document.querySelectorAll('#eq-app .af-row')].find(x=>x.textContent.includes(n));if(b)b.click();},NUM);await wait(250);await click('tab|chiffrage');
await page.evaluate(()=>{const d=document.querySelector('#eq-app details.vv-hist');if(d)d.open=true;});await click('vrm|1');
out=await page.evaluate(n=>{const a=window.TRACE.affaires.get(n);const v2=(a.chiffrages||[]).find(y=>y.v===2)||{};const d=(a.dce||[]).find(x=>x.ver);return {kept:(a.chiffrages||[]).map(y=>y.v).slice(0,3).join(),mem:JSON.stringify((v2.snap||{}).memoire),offre:JSON.stringify((v2.snap||{}).offre).slice(0,20),docV:d&&d.ver.v};},NUM);
await click('vview|2');await click('tab|offre');out.v2=await page.evaluate(()=>({band:/Tu consultes la v2/.test((document.querySelector('#eq-app .vv-band')||{}).textContent||''),offre:!!document.querySelector('#eq-app #dob-offre')}));await click('vexit|');
console.log('9) retrait de la v1 :',JSON.stringify(out));
C.c9=out.kept==='2,3,4'&&out.mem!=='{"$v":1}'&&!/\$v/.test(out.offre)&&out.docV===2&&out.v2.band&&out.v2.offre;
// ── 10) ancien format (avant le 14/10) : {v, at, by, note, chiffrage, total} lisible et consultable (chiffrage seul)
await page.evaluate(()=>{window.TRACE.affaires.set('O2610-32',{num:'O2610-32',nom:'Ancienne affaire fictive',client:'CLIENT FICTIF',etat:'devis',chiffrageV:2,chiffrageNote:'Négociation',chiffrage:{zones:[{nom:'Z actuelle',rows:[{dn:100,nb:60,ml:250}]}]},chiffrages:[{v:1,at:'2026-10-12T10:00:00.000Z',by:'Ethan L.',note:'version initiale',chiffrage:{zones:[{nom:'Z ancienne',rows:[{dn:100,nb:50,ml:200}]}]},total:12345}]});const S=window.TRACE.affaires.state();S.cur='O2610-32';S.view='fiche';S.tab='chiffrage';S.vview=null;});
await click('seg|devis');await page.evaluate(()=>{const b=[...document.querySelectorAll('#eq-app .af-row')].find(x=>x.textContent.includes('O2610-32'));if(b)b.click();});await wait(250);await click('tab|chiffrage');
out={hist:await page.evaluate(()=>((document.querySelector('#eq-app .vv-hist')||{}).textContent||'').replace(/\s+/g,' '))};
await click('vview|1');out.v1=await page.evaluate(()=>({band:((document.querySelector('#eq-app .vv-band')||{}).textContent||'').replace(/\s+/g,' '),zone:[...document.querySelectorAll('#eq-app [data-afzn]')].map(x=>x.value).join(),nb:[...document.querySelectorAll('#eq-app [data-afz$="|nb"]')].map(x=>x.value).join()}));
await click('tab|quantites');out.q=await page.evaluate(()=>/créée avant le 14\/10/.test(document.getElementById('eq-app').textContent));await click('vexit|');
console.log('10) ancien format :',JSON.stringify({...out,hist:out.hist.slice(0,200),v1:{...out.v1,band:out.v1.band.slice(0,200)}}));
C.c10=/v1 · version initiale/.test(out.hist)&&/chiffrage seul/.test(out.hist)&&/Tu consultes la v1/.test(out.v1.band)&&/seul son chiffrage a été gardé/.test(out.v1.band)&&out.v1.zone==='Z ancienne'&&out.v1.nb==='50'&&out.q;
const bad=Object.entries(C).filter(([k,v])=>!v).map(([k])=>k);console.log(bad.length?'RESULTAT: ECHEC '+bad.join(','):'RESULTAT: TOUT VERT');console.log(logs.length?logs:'[]');
await browser.close();
