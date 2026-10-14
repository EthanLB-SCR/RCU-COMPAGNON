// CHIFFRAGE, RETOURS D'ETHAN DU 14/10/2026 (matin) — base de prix fictive (fixture_prix.xlsx), affaire fictive :
// 1) purges / vidanges : les soudures du panier au prix de la soudure de la table des DN (même équipe, même cadence) ; texte « déporté » pour les vidanges aussi ;
// 2) vannes préisolées : 1 soudure + 1 manchon au prix de la table, prix d'achat de la vanne seulement si « achat vanne » ;
// 3) SST : alerte « PU manquant » quand la base n'a pas le prix (au lieu d'un panier pas cher), « + by-pass » = panier by-pass décomposé derrière la paire ;
// 4) épreuve : par défaut toute la table des DN (ml de tube), heures de mise en place / montée / décompression au prorata des m³, « ＋ épreuve » scinde la zone ;
// 5) nuit : détail (équipes, taux de nuit) + mode plus-value / coût complet ;
// 6) aérien : détail du calcul par ligne, équipe de pose, pose en soudures ou en journées ;
// 7) fonçage : jours calculés (tronçons ÷ cadence en fosse), tés à 0 par défaut, Ø iso absent signalé ;
// 8) récap : installations ventilées dans les zones, achat / vente / €/ml par zone ; catégories : déchets en frais, « ce qu'il contient » ;
// 9) fiche : plus de MOA / MOE / remise en double (renseignés dans Dossier).
import { chromium } from 'playwright';
import path from 'path';import {fileURLToPath} from 'url';
const HERE=path.dirname(fileURLToPath(import.meta.url));
const BASE=process.env.BASE||'http://localhost:8765';
const browser=await chromium.launch({headless:true, executablePath: process.env.CHROMIUM_PATH||undefined});
const ctx=await browser.newContext({viewport:{width:1280,height:900}});const page=await ctx.newPage();
const logs=[];page.on('pageerror',e=>logs.push('PAGEERROR: '+e.message.slice(0,300)));page.on('console',m=>{if(m.type()==='error'&&!/supabase|Failed to fetch|net::ERR|404|WebSocket|pdf\.worker|cdnjs/i.test(m.text()))logs.push(m.text().slice(0,200));});
page.on('dialog',d=>d.accept().catch(()=>{}));
const C={};const wait=ms=>page.waitForTimeout(ms);const NUM='O2610-71';
await page.goto(BASE+'/index.html');await wait(600);await page.evaluate(()=>{localStorage.clear();localStorage.setItem('trace:wide','1');});await page.evaluate(()=>new Promise(r=>{try{const q=indexedDB.deleteDatabase('trace-kv');q.onsuccess=q.onerror=q.onblocked=()=>r();}catch(e){r();}}));
await page.reload();await wait(1200);
{const s=await page.$('#loginSkip');if(s&&await s.isVisible())await s.click();await wait(700);}
const click=async v=>{await page.evaluate(v=>{const el=document.querySelector(`#eq-app [data-act=af][data-v="${v}"]`);if(!el)throw new Error('bouton absent '+v);el.click();},v);await wait(260);};
const chg=async(sel,val)=>{await page.evaluate(([s,v])=>{const el=document.querySelector(s);if(!el)throw new Error('absent '+s);el.value=v;el.dispatchEvent(new Event(el.tagName==='SELECT'?'change':'change',{bubbles:true}));},[sel,val]);await wait(260);};
const tick=async(sel,on)=>{await page.evaluate(([s,o])=>{const el=document.querySelector(s);if(!el)throw new Error('absent '+s);el.checked=!!o;el.dispatchEvent(new Event('change',{bubbles:true}));},[sel,on]);await wait(260);};
const CALC=()=>page.evaluate(n=>{const T=window.TRACE;const a=T.affaires.get(n);const C=T.affaires.calc(a);return {C,z:a.chiffrage.etudes[0]};},NUM);
const Z=()=>page.evaluate(n=>window.TRACE.affaires.get(n).chiffrage.etudes[0],NUM);
const TXT=()=>page.evaluate(()=>document.getElementById('eq-app').textContent.replace(/\s+/g,' '));
// ── affaire + base de prix fictive + une zone avec une table des DN
await page.evaluate(async n=>{const T=window.TRACE;T.state.userId='ethan';T.renderHome();document.getElementById('htCom').click();await new Promise(x=>setTimeout(x,300));
  document.querySelector('#eq-app [data-act=af][data-v="new|"]').click();await new Promise(x=>setTimeout(x,150));document.getElementById('afn-num').value=n;document.getElementById('afn-nom').value='Retours chiffrage';document.getElementById('afn-client').value='CLIENT TEST';document.getElementById('afn-etat').value='devis';
  document.querySelector('#eq-app [data-act=af][data-v="create|"]').click();await new Promise(x=>setTimeout(x,250));document.querySelector('#eq-app [data-act=af][data-v="tab|chiffrage"]').click();await new Promise(x=>setTimeout(x,250));},NUM);
await page.setInputFiles('#eq-app input[data-afprix]',path.join(HERE,'fixture_prix.xlsx'));await wait(1500);
await page.evaluate(n=>{const T=window.TRACE;T.affaires.set(n,{chiffrage:{etudes:[{id:'E1',nom:'Zone 1',chantier:{d0:'2026-11-02',d1:'2026-11-13',wc:true},eq:{soud:'S+T+P',manch:'M',typeManchon:'Thermo'},mlMode:'tranchee',dn:[{dn:100,soud:100,ml:600},{dn:50,soud:20,ml:80}],
  purges:{dn:32,paires:2,deporte:true},vidanges:{dn:50,type:'gravite',paires:1,deporte:true},vpi:[{dn:100,soud:2,achat:false,prixVanne:''}],sst:[{dn:50,type:'sst_vannes_bs_pn25',paires:1},{dn:600,type:'sst_vannes_bs_pn25',paires:1}],
  nuit:{on:true,dn:100,soud:10,rendement:0.8},aerien:{rows:[{dn:80,ml:12,c90:2,soud:4,type:'Tradi',support:'Suspendu',calo:'PVC'}]},foncage:{rows:[{dn:100,ml:30,vac:1},{dn:100,ml:30,fosse:6,vac:0,jours:2}]}}]}});T.renderHome();},NUM);await wait(300);
await click('chei|0');await wait(300);
// ── 1) purges / vidanges : soudures au prix de la table
let {C:R0}=await CALC();let out={dn:R0.etudes[0].r.detail.dn.rows.map(r=>({dn:r.dn,pSoud:Math.round(r.pouce*r.pPouce*100)/100})),purges:R0.etudes[0].r.detail.purges,vidanges:R0.etudes[0].r.detail.vidanges};
const PRIX=dn=>page.evaluate(([n,dn])=>{const T=window.TRACE;const C=T.affaires.calc(T.affaires.get(n));const P=C.etudes[0].r.detail.prix;return {s:P.soud(dn),m:P.manch(dn)};},[NUM,dn]); /* les fonctions ne traversent pas evaluate */
const pSoud32=(await PRIX(32)).s;
await click('chpdet|purge|32');out.purgeDet=await page.evaluate(()=>[...document.querySelectorAll('#eq-app .ch-bloc[data-bloc="purges"] .ch-pdt tr')].map(r=>r.textContent.replace(/\s+/g,' ').trim()).slice(0,3));
out.vidTxt=await page.evaluate(()=>(document.querySelector('#eq-app .ch-bloc[data-bloc="vidanges"] .ch-sub')||{}).textContent||'');
console.log('1) purges / vidanges :',JSON.stringify(out));
// DN32 : équipe S+T+P 2 750 €/j, cadence 32 soud./j (fixture) → 85,94 € la soudure ; panier purge = 2 soudures → MO 171,88
C.c1=Math.abs(pSoud32-2750/32)<0.01&&out.purgeDet.some(t=>/MO · soudures/.test(t)&&/soud\./.test(t))&&Math.abs(out.purges.puSoud-pSoud32)<0.01&&Math.abs(out.purges.puDep-(out.purges.puSoud+out.purges.puManch))<0.01&&out.purges.dep===8
  &&/Déporté : 4 soudures/.test(out.vidTxt)&&/prix de la table des DN/.test(out.vidTxt)&&out.vidanges.dep===4;
// ── 2) vannes préisolées : 1 soudure + 1 manchon, pas de prix d'achat sans « achat vanne »
const vpi0=R0.etudes[0].r.detail.vpi.rows[0];out={lines:vpi0.lines.map(l=>l.id+':'+Math.round(l.amount*100)/100),pu:Math.round(vpi0.pu*100)/100,achat:vpi0.achat,inputPrix:await page.evaluate(()=>!!document.querySelector('#eq-app [data-afx="e§vpi.0.prixVanne"]'))};
const p100=await PRIX(100);const pS100=p100.s,pM100=p100.m;
await tick('#eq-app [data-afx="e§vpi.0.achat"]',true);await chg('#eq-app [data-afx="e§vpi.0.prixVanne"]','400');
let {C:R1}=await CALC();out.after={pu:Math.round(R1.etudes[0].r.detail.vpi.rows[0].pu*100)/100,lines:R1.etudes[0].r.detail.vpi.rows[0].lines.map(l=>l.id)};
console.log('2) vannes préisolées :',JSON.stringify(out));
C.c2=out.lines.length===2&&out.lines[0].startsWith('sw:')&&out.lines[1].startsWith('manch:')&&Math.abs(out.pu-(pS100+pM100))<0.02&&!out.achat&&!out.inputPrix&&out.after.lines.includes('vanne')&&Math.abs(out.after.pu-(pS100+pM100+400))<0.02;
// ── 3) SST : PU manquant signalé (DN 600 absent des vannes de la fixture) ; + by-pass derrière la paire
out={rows:R1.etudes[0].r.detail.sst.rows.map(r=>({dn:r.dn,pu:Math.round(r.pu),miss:(r.missing||[]).length})),warn:R1.etudes[0].r.warn,tag:await page.evaluate(()=>document.querySelectorAll('#eq-app .ch-bloc[data-bloc="sst"] .eq-tag.bad').length)};
await tick('#eq-app [data-afx="e§sst.0.bypass"]',true);let {C:R2}=await CALC();const s0=R2.etudes[0].r.detail.sst.rows[0];out.bp={pu:Math.round(s0.pu),bypass:Math.round(s0.bypass),det:await page.evaluate(()=>!!document.querySelector('#eq-app .ch-bloc[data-bloc="sst"] [data-v^="chpdet|bp_sst|50"]'))};
await page.evaluate(()=>{document.querySelector('#eq-app .ch-bloc[data-bloc="sst"] [data-v^="chpdet|bp_sst|50"]').click();});await wait(300);
out.bpLines=await page.evaluate(()=>[...document.querySelectorAll('#eq-app .ch-bloc[data-bloc="sst"] .ch-pdet.open table.ch-pdt tr')].map(r=>r.cells[0].textContent.trim()).filter(t=>/by-pass|MO|Coude|Vanne|fourn/i.test(t)).length);
console.log('3) SST :',JSON.stringify(out));
C.c3=out.rows[1].dn===600&&out.rows[1].miss>0&&out.warn.some(w=>/SST DN 600/.test(w))&&out.tag>=1&&out.rows[0].miss===0&&out.bp.bypass>0&&out.bp.pu===Math.round(out.rows[0].pu+out.bp.bypass)&&out.bp.det&&out.bpLines>=2;
// ── 4) épreuve : table des DN par défaut, prorata des m³, scinder
await click('chfold|hydro');out={auto:R2.etudes[0].r.detail.hydro.auto,rows:R2.etudes[0].r.detail.hydro.rows[0],vol:Math.round(R2.etudes[0].r.detail.hydro.vols[0]*100)/100,card:await page.evaluate(()=>(document.querySelector('#eq-app .ch-bloc[data-bloc="hydro"] .ch-instban')||{}).textContent||'')};
const epr=R2.etudes[0].r.detail.hydro.items.epreuve[0];out.mep=epr.lines.find(l=>l.id==='h_mep');out.montee=epr.lines.find(l=>l.id==='h_montee');
await click('chadd|hydro.zones');let {z:z4}=await CALC();out.split={n:z4.hydro.zones.length,rows0:z4.hydro.zones[0].rows.length,rows1:(z4.hydro.zones[1].rows||[]).map(r=>r.ml)};
console.log('4) épreuve :',JSON.stringify({...out,mep:out.mep&&out.mep.label,mepQ:out.mep&&out.mep.qty,montQ:out.montee&&out.montee.qty}));
// volume = DN100 1 200 ml + DN50 160 ml de tube (Ø int = DN dans la fixture) ≈ 9,42 + 0,31 = 9,74 m³ < 30 m³ de référence → heures × V/30, mini 1 h
C.c4=out.auto[0]===true&&out.rows.length===2&&out.rows[0].ml===1200&&Math.abs(out.vol-9.74)<0.02&&/toute la table des DN/.test(out.card)&&/÷ 30 m³/.test(out.mep.label)&&Math.abs(out.mep.qty-Math.max(1,2*out.vol/30))<0.01&&Math.abs(out.montee.qty-Math.max(1,2*out.vol/30))<0.01
  &&out.split.n===2&&out.split.rows0===2&&out.split.rows1.length===2&&out.split.rows1.every(v=>v==='');
// ── 5) nuit : détail + mode
out={det:await page.evaluate(()=>{const b=document.querySelector('#eq-app .ch-bloc[data-bloc="nuit"]');return {rows:b.querySelectorAll('table.ch-pdt tr').length,txt:b.textContent.replace(/\s+/g,' ')};}),d:R2.etudes[0].r.detail.nuit,pv:Math.round(R2.etudes[0].r.postes.nuit.achat)};
await chg('#eq-app [data-afx="e§nuit.mode"]','cout');let {C:R5}=await CALC();out.cout=Math.round(R5.etudes[0].r.postes.nuit.achat);
console.log('5) nuit :',JSON.stringify({...out,det:{rows:out.det.rows,txt:out.det.txt.slice(0,200)}}));
C.c5=out.det.rows>=6&&/majoré/.test(out.det.txt)&&/Soudeur/.test(out.det.txt)&&/Chauffeur/.test(out.det.txt)&&out.d.rS.length===3&&out.d.nS.nuitH>out.d.nS.h&&out.pv===Math.round(out.d.E58-out.d.E54)&&out.cout===Math.round(out.d.E58)&&out.cout>out.pv;
// ── 6) aérien : détail par ligne, équipe, soudures → journées
const ae0=R5.etudes[0].r.detail.calo.rows[0];out={ids:ae0.lines.map(l=>l.id),eq:R5.etudes[0].r.detail.calo.eq,mode:R5.etudes[0].r.detail.calo.mode,pose:Math.round(ae0.pose*100)/100,det:await page.evaluate(()=>!!document.querySelector('#eq-app .ch-bloc[data-bloc="aerien"] [data-v^="chpv|e|aer"]'))};
const pS80=(await PRIX(80)).s;await chg('#eq-app [data-afx="e§aerien.mode"]','jours');await chg('#eq-app [data-afx="e§aerien.rows.0.jours"]','1.5');let {C:R6}=await CALC();out.jours={mode:R6.etudes[0].r.detail.calo.mode,pose:Math.round(R6.etudes[0].r.detail.calo.rows[0].pose),cA:R6.etudes[0].r.detail.calo.cA.jour};
console.log('6) aérien :',JSON.stringify(out));
C.c6=['sup_fo','sup_mo','peint','calo_ml','calo_c','calo_mo','pose','tubes','coudes','cert'].every(k=>out.ids.includes(k))&&out.eq==='S+T+P'&&out.mode==='soud'&&Math.abs(out.pose-4*pS80)<0.05&&out.det&&out.jours.mode==='jours'&&out.jours.pose===Math.round(1.5*out.jours.cA);
// ── 7) fonçage : jours calculés, tés 0, colliers
const fo=R6.etudes[0].r.detail.foncage;out={r0:{jours:fo.rows[0].jours,hasJ:fo.rows[0].hasJ,nW:fo.rows[0].nW,sec:fo.rows[0].sec,lt:fo.rows[0].lt,tes:fo.rows[0].lines.find(l=>l.id==='tes').qty,seg:fo.rows[0].segPer},r1:{jours:fo.rows[1].jours,hasJ:fo.rows[1].hasJ,sec:fo.rows[1].sec,lt:fo.rows[1].lt},eq:fo.eq,txt:await page.evaluate(()=>(document.querySelector('#eq-app .ch-bloc[data-bloc="foncage"] .ch-sub')||{}).textContent||'')};
console.log('7) fonçage :',JSON.stringify(out));
// 30 m en tronçons de 12 m → 3 tronçons → 2 × 2 tubes = 4 soudures en fosse ; cadence DN100 S+T+P 10/j × 0,5 = 5/j → 0,8 j → 1 j (demi-journée arrondie au-dessus) ; fosse 6 m → 5 tronçons → 8 soudures → 1,6 → 2 j (mais 2 j saisis : gardés)
C.c7=out.r0.sec===3&&out.r0.lt===12&&out.r0.nW===4&&!out.r0.hasJ&&out.r0.jours===1&&out.r0.tes===0&&out.r0.seg>0&&out.r1.lt===6&&out.r1.sec===5&&out.r1.hasJ&&out.r1.jours===2&&out.eq==='S+T+P'&&/insertions de tés : 0 par défaut/.test(out.txt)&&!/2 insertions de tés/.test(out.txt);
// ── 8) récap ventilé + catégories
await page.evaluate(n=>{const T=window.TRACE;const a=T.affaires.get(n);const ch=a.chiffrage;ch.etudes.push({id:'E2',nom:'Zone 2',chantier:{d0:'2026-11-02',d1:'2026-11-13'},eq:{soud:'S+T+P',manch:'M'},mlMode:'tranchee',dn:[{dn:100,soud:50,ml:400}]});ch.inst={on:true,items:{wc:{on:true}},ventil:'ml'};T.affaires.set(n,{chiffrage:ch});T.renderHome();},NUM);await wait(300);
await click('chview|recap');await wait(300);
out=await page.evaluate(()=>{const t=document.querySelector('#eq-app table.ch-recap');const th=[...t.querySelectorAll('tr:first-child th')].map(x=>x.textContent.trim());const tots=[...t.querySelectorAll('tr.tot')].map(r=>r.textContent.replace(/\s+/g,' ').trim().slice(0,60));const cont=[...t.querySelectorAll('tr')].find(r=>/^Contener/.test(r.textContent.trim()));return {th,tots,cont:cont?[...cont.cells].slice(1,3).map(c=>c.textContent.trim()):null,ml:[...t.querySelectorAll('tr')].some(r=>/€ \/ ml de tranchée/.test(r.textContent))};});
const {C:R8}=await CALC();out.zones=R8.zonesV.map(z=>({achat:Math.round(z.achat),vente:Math.round(z.vente),ml:z.ml}));out.sum=Math.round(R8.zonesV.reduce((s,z)=>s+z.achat,0));out.achat=Math.round(R8.achat);
await click('chview|cat');await wait(300);out.cat=await page.evaluate(()=>{const t=document.querySelector('#eq-app table');const th=[...t.querySelectorAll('tr:first-child th')].map(x=>x.textContent.trim());const cont=[...t.querySelectorAll('tr')].find(r=>/^Contener/.test(r.textContent.trim()));return {th,cont:cont?[...cont.cells].map(c=>c.textContent.trim()):null};});
console.log('8) récap / catégories :',JSON.stringify(out));
C.c8=!out.th.includes('🏗 Installations')&&out.tots.some(t=>/^Prix d'achat/.test(t))&&out.tots.some(t=>/^Prix de vente HT/.test(t))&&out.ml&&out.cont&&out.cont.every(x=>/\d/.test(x))&&out.sum===out.achat&&out.zones.every(z=>z.vente>z.achat)
  &&out.cat.th[1]==='Ce qu\'il contient'&&out.cat.cont&&/Location/.test(out.cat.cont[1])&&out.cat.cont[3]===''&&out.cat.cont[5]!=='';
// ── 9) fiche sans doublons
await page.evaluate(()=>{document.querySelector('#eq-app [data-act=af][data-v="tab|fiche"]').click();});await wait(250);out={moaInput:await page.evaluate(()=>!!document.querySelector('#eq-app [data-afin="moa"]')),dateRep:await page.evaluate(()=>!!document.querySelector('#eq-app [data-afin="dateReponse"]')),txt:(await TXT()).slice(0,900)};
await page.evaluate(()=>{document.querySelector('#eq-app [data-act=af][data-v="tab|dossier"]').click();});await wait(250);out.dossier=await page.evaluate(()=>({moa:!!document.querySelector('#eq-app [data-afcs="moa"]'),rep:!!document.querySelector('#eq-app [data-afcs="dateReponse"]')}));
console.log('9) fiche :',JSON.stringify({...out,txt:out.txt.slice(0,160)}));
C.c9=!out.moaInput&&!out.dateRep&&/renseignent une seule fois/.test(out.txt)&&out.dossier.moa&&out.dossier.rep;
C.logs=logs.length===0;
const bad=Object.entries(C).filter(([k,v])=>!v).map(([k])=>k);console.log(bad.length?'RESULTAT: ECHEC '+bad.join(','):'RESULTAT: TOUT VERT');console.log(logs.length?logs:'[]');
await browser.close();
