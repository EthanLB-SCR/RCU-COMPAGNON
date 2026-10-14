// BASE DE PRIX ET PANIERS — RETOURS D'ETHAN DU 14/10/2026 APRÈS-MIDI (lot A) — base de prix fictive (fixture_prix.xlsx), affaires fictives :
// 1) révision de base figée par dossier : a.chiffrage.baseRev ; modifier la base archive la révision utilisée (prix/base@<rev>, compressée, une seule fois),
//    les dossiers en cours gardent leurs prix (bandeau), un dossier ancien sans révision est rattaché, un nouveau dossier prend la base actuelle,
//    « ↻ Passer à la base actuelle » ; une écriture qui ne change aucun prix (même classeur réimporté) garde la révision ; les versions copient la révision ;
// 2) cadence retouchée par DN dans la table des DN : colorée, « base : X », elle fait le prix de la soudure partout (table, purges, vannes, aérien, nuit, fonçage) ;
// 3) onglet « Contrôles CND » (plus « Sous-traitance ») ;
// 4) paramètres dans les paniers de prestation ; l'onglet Paramètres garde le général + les paramètres de l'appli ;
// 5) variantes d'équipe de la MO d'un panier : prise selon l'équipe soudure de la zone, sinon le panier de référence ; copie aux autres DN ;
// 6) équipe S+M : colonnes de cadence (à renseigner → repli), manchon « compris », jours = max(soudure, manchons), répartition au prorata ; variante S+M sur une SST ;
// 7) puces des paniers accessibles (passent à la ligne), aussi à 390 px ;
// 8) « Tés acier (purgeur automatique) » + explication.
import { chromium } from 'playwright';
import path from 'path';import fs from 'fs';import {fileURLToPath} from 'url';
const HERE=path.dirname(fileURLToPath(import.meta.url));
const BASE=process.env.BASE||'http://localhost:8765';
const browser=await chromium.launch({headless:true, executablePath: process.env.CHROMIUM_PATH||undefined});
const ctx=await browser.newContext({viewport:{width:1280,height:900}});const page=await ctx.newPage();
const logs=[];page.on('pageerror',e=>logs.push('PAGEERROR: '+e.message.slice(0,300)));page.on('console',m=>{if(m.type()==='error'&&!/supabase|Failed to fetch|net::ERR|404|WebSocket|pdf\.worker|cdnjs/i.test(m.text()))logs.push(m.text().slice(0,200));});
page.on('dialog',d=>d.accept().catch(()=>{}));
const C={};const wait=ms=>page.waitForTimeout(ms);const NA='O2610-81',NB='O2610-82',NC='O2610-83',ND='O2610-84';
const FIX={name:'fixture_prix.xlsx',mimeType:'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',buffer:fs.readFileSync(path.join(HERE,'fixture_prix.xlsx'))};
await page.goto(BASE+'/index.html');await wait(600);await page.evaluate(()=>{localStorage.clear();localStorage.setItem('trace:wide','1');});await page.evaluate(()=>new Promise(r=>{try{const q=indexedDB.deleteDatabase('trace-kv');q.onsuccess=q.onerror=q.onblocked=()=>r();}catch(e){r();}}));
await page.reload();await wait(1200);
{const s=await page.$('#loginSkip');if(s&&await s.isVisible())await s.click();await wait(700);}
const click=async v=>{await page.evaluate(v=>{const el=document.querySelector(`#eq-app [data-act=af][data-v="${v}"]`);if(!el)throw new Error('bouton absent '+v);el.click();},v);await wait(260);};
const chg=async(sel,val)=>{await page.evaluate(([s,v])=>{const el=document.querySelector(s);if(!el)throw new Error('absent '+s);if(el.type==='checkbox')el.checked=!!v;else el.value=v;el.dispatchEvent(new Event('change',{bubbles:true}));},[sel,val]);await wait(260);};
const BASE0=()=>page.evaluate(()=>window.TRACE.reg.get('prix','base'));
const ARCH=()=>page.evaluate(()=>window.TRACE.reg.all('prix').filter(r=>/^base@/.test(r.id)).map(r=>({id:r.id,rev:r.rev,z:!!r.z,zLen:String(r.z||'').length,at:(r.archived||{}).at,keys:Object.keys(r).sort().join(',')})));
const AFF=n=>page.evaluate(n=>window.TRACE.affaires.get(n),n);
const CALC=n=>page.evaluate(n=>{const T=window.TRACE;const C=T.affaires.calc(T.affaires.get(n));const e=C.etudes[0];const r=e?e.r:null;return {vente:C.vente,achat:C.achat,state:(C.baseInfo||{}).state,rev:(C.baseInfo||{}).rev,postes:r?Object.fromEntries(Object.entries(r.postes).map(([k,l])=>[k,Math.round(l.achat*100)/100])):{},dn:r&&r.detail.dn?r.detail.dn.rows.map(x=>({dn:x.dn,cadS:x.cadS,cadBase:x.cadBase,cadOv:x.cadOv,pPouce:x.pPouce,pManch:x.pManch,soud:x.soud,manch:x.manch,jS:x.jS,jM:x.jM,jours:x.jours,qS:x.qS,qM:x.qM,smMiss:x.smMiss})):[],T:r?r.T:null,detail:r?{purges:r.detail.purges,vpi:r.detail.vpi,nuit:r.detail.nuit,calo:r.detail.calo&&{rows:r.detail.calo.rows.map(x=>({pose:x.pose}))},foncage:r.detail.foncage&&{rows:r.detail.foncage.rows.map(x=>({jours:x.jours,nW:x.nW}))},sst:r.detail.sst,dnSm:r.detail.dn&&r.detail.dn.sm,smMissAny:r.detail.dn&&r.detail.dn.smMiss}:null};},n);
const openAff=async(n,tab)=>{await page.evaluate(([n,t])=>{const T=window.TRACE;const S=T.affaires.state();S.view='fiche';S.cur=n;S.tab=t||'chiffrage';T.renderHome();},[n,tab]);await wait(350);};
const newAff=async(n,nom)=>{await page.evaluate(async([n,nom])=>{const T=window.TRACE;T.state.userId='ethan';const S=T.affaires.state();S.cur=null;S.view='list';S.seg='devis';T.renderHome();document.getElementById('htCom').click();await new Promise(x=>setTimeout(x,300));
  const seg=document.querySelector('#eq-app [data-act=af][data-v="seg|devis"]');if(seg){seg.click();await new Promise(x=>setTimeout(x,300));}
  for(let k=0;k<20&&!document.querySelector('#eq-app [data-act=af][data-v="new|"]');k++)await new Promise(x=>setTimeout(x,100));
  document.querySelector('#eq-app [data-act=af][data-v="new|"]').click();await new Promise(x=>setTimeout(x,150));document.getElementById('afn-num').value=n;document.getElementById('afn-nom').value=nom;document.getElementById('afn-client').value='CLIENT TEST';document.getElementById('afn-etat').value='devis';
  document.querySelector('#eq-app [data-act=af][data-v="create|"]').click();await new Promise(x=>setTimeout(x,250));document.querySelector('#eq-app [data-act=af][data-v="tab|chiffrage"]').click();await new Promise(x=>setTimeout(x,250));},[n,nom]);await wait(200);};
const BAN=()=>page.evaluate(()=>{const b=document.querySelector('#eq-app .ch-rev');return b?{cls:b.className,t:b.textContent.replace(/\s+/g,' ').trim(),up:!!b.querySelector('[data-v="chrevup|"]'),pin:!!b.querySelector('[data-v="chrevpin|"]')}:null;});
const ZONE={id:'E1',nom:'Zone 1',chantier:{d0:'2026-11-02',d1:'2026-11-13'},eq:{soud:'S+T+P',manch:'M',typeManchon:'Thermo'},mlMode:'tranchee',dn:[{dn:100,soud:100,ml:600},{dn:50,soud:20,ml:80}],
  purges:{dn:100,paires:2,deporte:true},vpi:[{dn:100,soud:2,achat:false,prixVanne:''}],nuit:{on:true,dn:100,soud:30,rendement:0.8},aerien:{rows:[{dn:100,ml:12,c90:0,soud:4,type:'Tradi',support:'',calo:''}]},foncage:{rows:[{dn:100,ml:30,vac:0}]}};
let out;
// ══ 1) RÉVISION DE LA BASE FIGÉE PAR DOSSIER ══
await newAff(NA,'Révision figée');
await page.setInputFiles('#eq-app input[data-afprix]',FIX);await wait(1500);
const b0=await BASE0();const R0=b0&&b0.rev;
await page.evaluate(([n,z])=>{const T=window.TRACE;T.affaires.set(n,{chiffrage:{etudes:[z]}});T.renderHome();},[NA,ZONE]);await openAff(NA);await click('chei|0');
out={r0:R0,ban0:await BAN(),a0:(await AFF(NA)).chiffrage.baseRev||null};
await click('chrevpin|');out.ban1=await BAN();out.a1=(await AFF(NA)).chiffrage.baseRev;const c0=await CALC(NA);out.v0=Math.round(c0.vente);out.pP0=c0.dn[0].pPouce;
// dossier ancien (sans révision) : C — il sera rattaché à la révision qu'il utilisait quand la base change
await page.evaluate(([n,z])=>{const T=window.TRACE;T.affaires.set(n,{num:n,nom:'Dossier ancien',client:'CLIENT TEST',etat:'devis',chiffrage:{etudes:[Object.assign({},z,{id:'EC'})]}});},[NC,ZONE]);
const cC0=await CALC(NC);out.c0={state:cC0.state,v:Math.round(cC0.vente)};
// réimport du MÊME classeur : aucun prix ne bouge → même révision, pas d'archive
await click('chview|base');await click('chbase|import');await page.setInputFiles('#eq-app input[data-afprix]',FIX);await wait(1500);
out.reimp={rev:(await BASE0()).rev,arch:(await ARCH()).length};
// taux soudeur 70 → 80 : nouvelle révision, la révision du dossier est archivée (compressée), A et C gardent leurs prix
await click('chview|base');await click('chbase|mo');await chg('#eq-app [data-afx="b§mo§postes§0§taux"]','80');
const b1=await BASE0();const R1=b1.rev;out.r1=R1;out.arch1=await ARCH();const cA1=await CALC(NA);out.vA1=Math.round(cA1.vente);out.stA1=cA1.state;out.pPA1=cA1.dn[0].pPouce;
const aC1=await AFF(NC);const cC1=await CALC(NC);out.c1={rev:aC1.chiffrage.baseRev,state:cC1.state,v:Math.round(cC1.vente)};
await click('chei|0');out.ban2=await BAN();
// taux 80 → 81 : la révision intermédiaire ne sert à personne → pas de nouvelle archive
await click('chview|base');await click('chbase|mo');await chg('#eq-app [data-afx="b§mo§postes§0§taux"]','81');const R2=(await BASE0()).rev;out.arch2=(await ARCH()).length;
// une version du chiffrage copie la révision ; un NOUVEAU dossier prend la base actuelle
await click('chei|0');await click('vnew|');await wait(300);await page.evaluate(()=>{const n=document.getElementById('vv-note');if(n){n.value='Négociation (test)';document.getElementById('vv-ok').click();}});await wait(300); /* intégration 14/10 : « ＋ Nouvelle version » ouvre la fenêtre du lot D (motif, ce qui a changé) */const aV=await AFF(NA);out.ver={n:(aV.chiffrages||[]).length,rev:((aV.chiffrages||[])[0]||{chiffrage:{}}).chiffrage.baseRev};
await newAff(NB,'Dossier créé après');await click('chetudeadd|');await click('chadd|dn');await chg('#eq-app [data-afx="e§dn.0.dn"]','100');await chg('#eq-app [data-afx="e§dn.0.soud"]','100');await chg('#eq-app [data-afx="e§dn.0.ml"]','600');
const aB=await AFF(NB);const cB=await CALC(NB);out.B={rev:aB.chiffrage.baseRev,state:cB.state,pP:cB.dn[0].pPouce,ban:(await BAN()||{}).cls};
// A : « ↻ Passer à la base actuelle » → révision actuelle, prix de la base actuelle ; la version garde l'ancienne révision (archive gardée)
await openAff(NA);await click('chei|0');await click('chrevup|');const aA2=await AFF(NA);const cA2=await CALC(NA);out.up={rev:aA2.chiffrage.baseRev,state:cA2.state,pP:cA2.dn[0].pPouce,log:(aA2.chiffrage.baseRevLog||[]).length,ban:(await BAN()||{}).cls,verRev:((aA2.chiffrages||[])[0]||{chiffrage:{}}).chiffrage.baseRev};
// la base change encore : la révision de A (R2) est archivée, l'archive R0 (version + dossier C) reste ; archives immuables
const z0=(await ARCH()).find(x=>x.rev===R0);await click('chview|base');await click('chbase|mo');await chg('#eq-app [data-afx="b§mo§postes§0§taux"]','70');const arch3=await ARCH();out.arch3=arch3.map(x=>x.rev===R0?'R0':x.rev===R2?'R2':x.rev);out.z0same=!!z0&&arch3.find(x=>x.rev===R0).zLen===z0.zLen;
const cA3=await CALC(NA);out.A3={state:cA3.state,pP:cA3.dn[0].pPouce};
// révision d'un dossier pas (encore) reçue sur cet appareil : calcul avec la base actuelle, signalé ; « ↻ » la rattache à la base actuelle
await page.evaluate(n=>{const T=window.TRACE;const a=T.affaires.get(n);T.affaires.set(n,{chiffrage:Object.assign({},a.chiffrage,{baseRev:'2026-01-01T08:00:00.000Z'})});},NC);
const cC2=await CALC(NC);await openAff(NC);await click('chei|0');out.lost={state:cC2.state,pP:cC2.dn[0].pPouce,ban:await BAN()};await click('chrevup|');out.lost.after=(await CALC(NC)).state;
console.log('1) révision figée :',JSON.stringify(out));
/* fixture : S+T+P 275 €/h → 2 750 €/j ÷ (10 soud./j × 4 pouces) = 68,75 €/pouce ; soudeur 80 → 285 €/h → 71,25 ; 81 → 286 €/h → 71,50 */
C.c1=!!R0&&out.ban0&&/non rattaché/.test(out.ban0.cls+out.ban0.t)&&out.ban0.pin&&!out.a0&&out.a1===R0&&/ok/.test(out.ban1.cls)&&/c'est la base actuelle/.test(out.ban1.t)&&out.pP0===68.75&&out.c0.state==='libre'
  &&out.reimp.rev===R0&&out.reimp.arch===0
  &&R1&&R1!==R0&&out.arch1.length===1&&out.arch1[0].rev===R0&&out.arch1[0].z&&/archived/.test(out.arch1[0].keys)&&!/mo,/.test(out.arch1[0].keys)&&out.vA1===out.v0&&out.stA1==='ancienne'&&out.pPA1===68.75
  &&out.c1.rev===R0&&out.c1.state==='ancienne'&&out.c1.v===out.c0.v&&out.ban2&&/old/.test(out.ban2.cls)&&/La base a été modifiée depuis/.test(out.ban2.t)&&/ce dossier garde ses prix/.test(out.ban2.t)&&out.ban2.up
  &&R2&&R2!==R1&&out.arch2===1&&out.ver.n===1&&out.ver.rev===R0
  &&out.B.rev===R2&&out.B.state==='courante'&&out.B.pP===71.5&&/ok/.test(out.B.ban)
  &&out.up.rev===R2&&out.up.state==='courante'&&out.up.pP===71.5&&out.up.log===2&&/ok/.test(out.up.ban)&&out.up.verRev===R0
  &&out.arch3.length===2&&out.arch3.includes('R0')&&out.arch3.includes('R2')&&out.z0same&&out.A3.state==='ancienne'&&out.A3.pP===71.5
  &&out.lost.state==='introuvable'&&out.lost.pP===68.75&&/n'est pas encore sur cet appareil/.test(out.lost.ban.t)&&out.lost.ban.up&&out.lost.after==='courante';
// ══ 2) CADENCE RETOUCHÉE DANS LA TABLE DES DN (dossier A, révision R2 : S+T+P 286 €/h → 2 860 €/j) ══
await openAff(NA);await click('chrevup|');await click('chei|0'); /* A passe à la base actuelle (taux 70, comme la fixture) */
const k0=await CALC(NA);out={st:k0.state,dn0:k0.dn[0],purges:k0.postes.purges,vpiPu:k0.detail.vpi.rows[0].pu,nuit:{cadS:k0.detail.nuit.cadS,jours:k0.detail.nuit.jours},pose:k0.detail.calo.rows[0].pose,fon:k0.detail.foncage.rows[0].jours,ph:await page.evaluate(()=>(document.querySelector('#eq-app [data-afx="e§dn.0.cad"]')||{}).placeholder)};
await chg('#eq-app [data-afx="e§dn.0.cad"]','20');
const k1=await CALC(NA);out.after={dn0:k1.dn[0],purges:k1.postes.purges,vpiPu:k1.detail.vpi.rows[0].pu,nuit:{cadS:k1.detail.nuit.cadS,jours:k1.detail.nuit.jours,cadOv:k1.detail.nuit.cadOv},pose:k1.detail.calo.rows[0].pose,fon:k1.detail.foncage.rows[0].jours,soudure:k1.postes.soudure};
out.ui=await page.evaluate(()=>{const i=document.querySelector('#eq-app [data-afx="e§dn.0.cad"]');const td=i&&i.closest('td');const tr=i&&i.closest('tr');const head=document.querySelector('#eq-app .ch-bloc[data-bloc="dn"] .ch-head');return {cls:i&&i.className,bg:i&&getComputedStyle(i).backgroundColor,small:td&&td.querySelector('.ch-cadb')?td.querySelector('.ch-cadb').textContent:'',prix:tr&&tr.querySelector('td.ch-psoud')?tr.querySelector('td.ch-psoud').textContent.replace(/\s+/g,' '):'',col:tr?[...tr.cells].indexOf(td):-1,tag:head?head.textContent.replace(/\s+/g,' '):''};});
await chg('#eq-app [data-afx="e§dn.0.cad"]','10');out.same=await page.evaluate(()=>{const i=document.querySelector('#eq-app [data-afx="e§dn.0.cad"]');return i&&/ch-cadov/.test(i.className);});
await chg('#eq-app [data-afx="e§dn.0.cad"]','');const k2=await CALC(NA);out.back=k2.dn[0].pPouce;
console.log('2) cadence retouchée :',JSON.stringify(out));
/* base : DN100 S+T+P 10 soud./j → 275 €/soudure ; cadence 20 → 137,50 : soudure 100 × 137,5 (+ DN50 inchangé 2 750) ; vanne préisolée = soudure + manchon 160 ; purge DN100 = 2 soudures du panier ;
   nuit : cadence 20 → 2 jours au lieu de 3 ; aérien : 4 soudures × 137,5 ; fonçage : 4 soudures en fosse ÷ (20 × 0,5) → 0,5 j au lieu de 1 */
C.c2=out.st==='courante'&&out.dn0.cadS===10&&out.dn0.cadBase===10&&out.ph==='10'&&out.after.dn0.cadS===20&&out.after.dn0.cadOv===20&&Math.abs(out.after.dn0.pPouce*4-137.5)<1e-6&&Math.abs(out.after.soudure-(13750+2750))<0.01
  &&Math.abs(out.vpiPu-(275+160))<0.01&&Math.abs(out.after.vpiPu-(137.5+160))<0.01&&Math.abs((out.purges-out.after.purges)-2*2*(275-137.5)-2*4*(275-137.5))<0.05
  &&out.nuit.cadS===10&&out.nuit.jours===3&&out.after.nuit.cadS===20&&out.after.nuit.jours===2&&out.after.nuit.cadOv===true&&Math.abs(out.pose-1100)<0.01&&Math.abs(out.after.pose-550)<0.01&&out.fon===1&&out.after.fon===0.5
  &&/ch-cadov/.test(out.ui.cls)&&out.ui.bg==='rgb(255, 226, 198)'&&out.ui.small==='base : 10'&&/137,50/.test(out.ui.prix)&&out.ui.col===3&&/base : 275,00/.test(out.ui.prix)&&/1 cadence retouchée/.test(out.ui.tag)&&out.same===false&&out.back===68.75;
// ══ 3) ONGLET « CONTRÔLES CND » ══
await click('chview|base');out={tabs:await page.evaluate(()=>[...document.querySelectorAll('#eq-app [data-v^="chbase|"]')].map(b=>b.textContent.trim()))};
await click('chbase|st');out.st=await page.evaluate(()=>({chips:[...document.querySelectorAll('#eq-app [data-v^="chfotable|"]')].map(b=>b.textContent.trim()),hydro:!!document.querySelector('#eq-app [data-afx^="b§fo§params§FO_Epreuve"]'),link:!!document.querySelector('#eq-app [data-v="chpresta|epreuve"]')}));
console.log('3) contrôles CND :',JSON.stringify(out));
C.c3=out.tabs.includes('Contrôles CND')&&!out.tabs.some(t=>/Sous-traitance/.test(t))&&out.st.chips.join()==='Forfaits Distance,Prix Films'&&!out.st.hydro&&out.st.link;
// ══ 4) PARAMÈTRES DANS LES PANIERS DE PRESTATION ══
await click('chbase|params');out={params:await page.evaluate(()=>{const has=k=>!!document.querySelector(`#eq-app [data-afx="b§fo§params§${k}"]`);return {hpj:has('FO_Heures_Par_Jour'),ratio:has('FO_Ratio_Dechets'),transp:has('FO_Transport_Fournitures'),app:has('FO_Epreuve_Volume_Reference')&&has('FO_Foncage_Nb_Tes'),boulet:has('FO_Boulet_Nb_Boulets'),wc:has('FO_Cout_Journee_WC'),purg:has('FO_Purgeur_Auto'),links:[...document.querySelectorAll('#eq-app [data-v^="chpresta|"]')].length};})};
await click('chpresta|boulet');out.presta=await page.evaluate(()=>{const has=k=>!!document.querySelector(`#eq-app #ch-presta [data-afx="b§fo§params§${k}"]`);return {view:!!document.getElementById('ch-presta'),chips:[...document.querySelectorAll('#eq-app .ch-prestachips .chip')].map(c=>c.textContent.replace(/\s+/g,' ').trim()),boulet:has('FO_Boulet_Nb_Boulets')&&has('FO_Seuil_Volume_Compresseur_1'),epr:has('FO_Epreuve_Debit_Poteau')};});
await click('chpresta|epreuve');await chg('#eq-app #ch-presta [data-afx="b§fo§params§FO_Epreuve_Debit_Poteau"]','15');out.edit=(await BASE0()).fo.params.FO_Epreuve_Debit_Poteau;
out.eprApp=await page.evaluate(()=>!!document.querySelector('#eq-app #ch-presta [data-afx="b§fo§params§FO_Epreuve_Volume_Reference"]'));
await click('chpresta|decharg');out.dech=await page.evaluate(()=>!!document.querySelector('#eq-app #ch-presta [data-afx="b§op§dechargement§h1"]'));
await click('chpan|purge');await click('chpandn|32');out.pp=await page.evaluate(()=>{const b=document.querySelector('#eq-app .ch-pparams');return b?{purg:!!b.querySelector('[data-afx="b§fo§params§FO_Purgeur_Auto"]'),te:!!b.querySelector('[data-afx="b§fo§params§FO_Te_Acier"]')}:null;});
console.log('4) paniers de prestation :',JSON.stringify(out));
C.c4=out.params.hpj&&out.params.ratio&&out.params.transp&&out.params.app&&!out.params.boulet&&!out.params.wc&&!out.params.purg&&out.params.links>=14&&out.presta.view&&out.presta.chips.length===15&&out.presta.boulet&&!out.presta.epr
  &&out.edit===15&&out.eprApp&&out.dech&&out.pp&&out.pp.purg&&out.pp.te;
// ══ 5) VARIANTES D'ÉQUIPE (purge DN 50 : « 3 gars : 1 h ; à 2 : 1 h 15 ») ══
await click('chpandn|50');await click('chmvadd|purge|50');out={v1:((await BASE0()).mvar||{}).purge};
await chg('#eq-app [data-afx="mv§purge§50§0§lignes§0§h"]','1');
await click('chmvadd|purge|50');await chg('#eq-app [data-afx="mv§purge§50§1§eq"]','S+T');await chg('#eq-app [data-afx="mv§purge§50§1§lignes§0§h"]','1.25');
const bv=await BASE0();out.mvar=bv.mvar.purge[50];out.grid=await page.evaluate(()=>[...document.querySelectorAll('#eq-app table tr.on td')].map(t=>t.textContent.trim()).join('|'));
await click('chmvcopy|purge|50|0');out.copy=Object.keys((await BASE0()).mvar.purge).length;
// dossier D (créé après) : zone S+T+P, purge DN 50 → variante S+T+P (1 h × 275) ; zone S+T → variante S+T (1,25 h × 190) ; zone S → pas de variante → panier de référence
await newAff(ND,'Variantes');await page.evaluate(n=>{const T=window.TRACE;T.affaires.set(n,{chiffrage:{etudes:[{id:'ED',nom:'Zone D',eq:{soud:'S+T+P',manch:'M'},mlMode:'tranchee',dn:[{dn:50,soud:20,ml:80}],purges:{dn:50,paires:2},sst:[{dn:50,type:'sst_vannes_bs_pn25',paires:1}]}]}});T.renderHome();},ND);await openAff(ND);await click('chei|0');await click('chrevpin|');
const pD=async()=>{const c=await CALC(ND);return {pu:Math.round(c.detail.purges.pu*100)/100,mo:Math.round(c.postes.purges*100)/100};};
out.d1=await pD();await click('chpdet|purge|50');out.det1=await page.evaluate(()=>{const b=document.querySelector('#eq-app .ch-bloc[data-bloc="purges"] .ch-pdet.open');return b?{tag:(b.querySelector('.ch-pdsum .ch-tag.var')||{}).textContent||'',rows:[...b.querySelectorAll('table.ch-pdt tr')].map(r=>r.textContent.replace(/\s+/g,' ').trim()).slice(1,3),mv:!!b.querySelector('[data-afx="eov§purge§50§mv0§h"]'),hint:(b.querySelector('.hint')||{}).textContent||''}:null;});
await chg('#eq-app [data-afx="e§eq.soud"]','S+T');out.d2=await pD();
await chg('#eq-app [data-afx="e§eq.soud"]','S');out.d3=await pD();out.det3=await page.evaluate(()=>{const b=document.querySelector('#eq-app .ch-bloc[data-bloc="purges"] .ch-pdet.open');return b?(b.querySelector('.hint')||{}).textContent||'':'';});
console.log('5) variantes :',JSON.stringify(out));
/* purge DN50 (fixture) : fournitures sans purgeur auto 273 ; MO : variante S+T+P = 1 h × 275 ; S+T = 1,25 h × 190 = 237,5 ; S : pas de variante → 2 soudures × (1 000 €/j ÷ 10) = 200 */
const foP=out.d1.pu-275;
C.c5=Array.isArray(out.v1&&out.v1[50])&&out.v1[50][0].eq==='S+T+P'&&out.mvar.length===2&&out.mvar[0].lignes[0].h===1&&out.mvar[1].eq==='S+T'&&out.mvar[1].lignes[0].eq==='S+T'&&out.mvar[1].lignes[0].h===1.25&&/S\+T\+P/.test(out.grid)&&/S\+T/.test(out.grid)&&out.copy===8
  &&Math.abs(foP-273)<0.01&&out.det1&&/variante S\+T\+P/.test(out.det1.tag)&&out.det1.mv&&/variante S\+T\+P de la base/.test(out.det1.hint)&&Math.abs(out.d2.pu-(foP+237.5))<0.01&&Math.abs(out.d3.pu-(foP+200))<0.01&&/pas de variante pour l'équipe S/.test(out.det3)&&/variantes : S\+T\+P, S\+T/.test(out.det3);
// ══ 6) ÉQUIPE S+M ══
await click('chview|base');await click('chbase|mo');
out={eq:await page.evaluate(()=>{const b=window.TRACE.reg.get('prix','base');const e=(b.mo.equipes||[]).find(x=>x.code==='S+M');return e?{comp:e.comp,app:!!e.app}:null;}),cols:await page.evaluate(()=>({s:!!document.querySelector('#eq-app [data-afx="b§mo§cad§7§soud§S+M"]'),m:!!document.querySelector('#eq-app [data-afx="b§mo§cad§7§manchSM"]'),ph:(document.querySelector('#eq-app [data-afx="b§mo§cad§7§manchSM"]')||{}).placeholder,head:[...document.querySelectorAll('#eq-app table.ch-cad2 th.g')].map(t=>t.textContent.replace(/\s+/g,' ').trim())}))};
await openAff(ND);await click('chei|0');await chg('#eq-app [data-afx="e§eq.soud"]','S+M');await page.evaluate(n=>{const T=window.TRACE;const a=T.affaires.get(n);const ch=JSON.parse(JSON.stringify(a.chiffrage));ch.etudes[0].dn=[{dn:100,soud:100,ml:600}];T.affaires.set(n,{chiffrage:ch});T.renderHome();},ND);await wait(300);
const s0=await CALC(ND);out.fb={dn:s0.dn[0],soud:s0.postes.soudure,manch:s0.postes.manchons,qM:s0.T.qM,qS:s0.T.qS,miss:s0.detail.smMissAny,sm:s0.detail.dnSm};
out.ui=await page.evaluate(()=>{const s=document.querySelector('#eq-app .ch-bloc[data-bloc="eq"] select[disabled]');const t=document.querySelector('#eq-app .ch-bloc[data-bloc="eq"]');return {dis:s?s.textContent:'',tag:t?/cadences S\+M à renseigner/.test(t.textContent):false};});
// cadences S+M renseignées dans la base (DN 100 : 8 soudures / j, 16 manchons / j) → le dossier passe à la base actuelle
await click('chview|base');await click('chbase|mo');await chg('#eq-app [data-afx="b§mo§cad§7§soud§S+M"]','8');await chg('#eq-app [data-afx="b§mo§cad§7§manchSM"]','16');
await click('chei|0');await click('chrevup|');const s1=await CALC(ND);out.ok={dn:s1.dn[0],soud:s1.postes.soudure,manch:s1.postes.manchons,qS:s1.T.qS,qM:s1.T.qM,prix:await page.evaluate(n=>{const T=window.TRACE;return T.affaires.calc(T.affaires.get(n)).etudes[0].r.detail.prix.soud(100);},ND)};
// variante S+M sur une SST (BS PN25 DN 50) : 1,5 h × 180 €/h
await click('chview|paniers');await click('chpan|sst_vannes_bs_pn25');await click('chpandn|50');await click('chmvadd|sst_vannes_bs_pn25|50');await chg('#eq-app [data-afx="mv§sst_vannes_bs_pn25§50§0§eq"]','S+M');await chg('#eq-app [data-afx="mv§sst_vannes_bs_pn25§50§0§lignes§0§h"]','1.5');
await click('chei|0');await click('chrevup|');const s2=await CALC(ND);out.sst={pu:s2.detail.sst.rows[0].pu};
console.log('6) équipe S+M :',JSON.stringify(out));
/* fixture : S+M = soudeur 100 + manchonneur 80 = 180 €/h → 1 800 €/j. Repli (à renseigner) : DN100 S = 5 soud./j, M = 5 manch./j → 20 j / 20 j → 20 j × 1 800 = 36 000, moitié / moitié.
   Renseigné : 100 ÷ 8 = 12,5 j ; 100 ÷ 16 = 6,25 j → 12,5 j × 1 800 = 22 500 → soudure 15 000 (12,5 / 18,75), manchons 7 500 ; une soudure = 1 800 ÷ 8 = 225.
   SST BS PN25 DN50 : fournitures 140 + boîtiers 60 ; MO = variante S+M 1,5 h × 180 = 270 → 470 la paire */
C.c6=out.eq&&out.eq.app&&out.eq.comp.Soudeur===1&&out.eq.comp.Manchonneur===1&&out.cols.s&&out.cols.m&&/à renseigner/.test(out.cols.ph)&&out.cols.head.some(h=>/Soudeur \+ manchonneur/.test(h))&&out.cols.head.some(h=>/THERMO/.test(h))&&out.cols.head.some(h=>/ÉLECTRO/.test(h))&&out.cols.head.some(h=>/Autocontrôle/.test(h))
  &&out.fb.sm&&out.fb.miss&&out.fb.dn.cadS===5&&out.fb.dn.jS===20&&out.fb.dn.jM===20&&Math.abs(out.fb.soud-18000)<0.01&&Math.abs(out.fb.manch-18000)<0.01&&out.fb.qM===0&&/compris dans S\+M/.test(out.ui.dis)&&out.ui.tag
  &&out.ok.dn.cadS===8&&out.ok.dn.jS===12.5&&out.ok.dn.jM===6.25&&out.ok.dn.jours===12.5&&Math.abs(out.ok.soud-15000)<0.01&&Math.abs(out.ok.manch-7500)<0.01&&out.ok.qS===13&&out.ok.qM===0&&Math.abs(out.ok.prix-225)<1e-6&&out.ok.dn.smMiss&&!out.ok.dn.smMiss.soud
  &&Math.abs(out.sst.pu-470)<0.01;
// ══ 8) « TÉS ACIER (PURGEUR AUTOMATIQUE) » ══
await click('chview|paniers');await click('chpan|purge');await click('chpandn|32');
out={labels:await page.evaluate(()=>[...document.querySelectorAll('#eq-app .ch-pan-detail table tr td:first-child')].map(t=>t.textContent.trim()).filter(t=>/acier|urgeur/i.test(t))),note:await page.evaluate(()=>(document.querySelector('#eq-app .ch-tesnote')||{}).textContent||'')};
await click('chei|0');await page.evaluate(n=>{const T=window.TRACE;const a=T.affaires.get(n);const ch=JSON.parse(JSON.stringify(a.chiffrage));ch.etudes[0].purges={dn:32,paires:1,purgeurAuto:false};T.affaires.set(n,{chiffrage:ch});T.renderHome();},ND);await wait(300);
await click('chpdet|purge|32');out.zone=await page.evaluate(()=>{const b=document.querySelector('#eq-app .ch-bloc[data-bloc="purges"] .ch-pdet.open');return b?{x:[...b.querySelectorAll('tr.ch-x td:first-child')].map(t=>t.textContent.trim()),hint:(b.querySelector('.hint')||{}).textContent||''}:null;});
console.log('8) tés acier :',JSON.stringify(out));
C.c8=out.labels.some(t=>t==='Tés acier (purgeur automatique)')&&/purgeur automatique se monte sur des tés acier/.test(out.note)&&/ne comptent que si « Purgeur automatique » est coché/.test(out.note)&&out.zone&&out.zone.x.some(t=>/^Tés acier \(purgeur automatique\)/.test(t))&&/comptées seulement quand « Purgeur automatique » est coché/.test(out.zone.hint);
// ══ 7) PUCES DES PANIERS ACCESSIBLES (ordinateur, puis téléphone 390 px) ══
await click('chview|paniers');
const chips=()=>page.evaluate(()=>{const bar=document.querySelector('#eq-app .ch-panchips');const L=[...bar.querySelectorAll('.chip')];const vw=document.documentElement.clientWidth;const card=bar.closest('.card').getBoundingClientRect();return {n:L.length,wrap:getComputedStyle(bar).flexWrap,out:L.filter(c=>{const r=c.getBoundingClientRect();return r.right>Math.min(vw,card.right)+1||r.left<-1||r.width<20;}).map(c=>c.textContent.trim()),last:L[L.length-1].textContent.trim(),lines:new Set(L.map(c=>Math.round(c.getBoundingClientRect().top))).size,pageW:document.documentElement.scrollWidth,vw};});
out={desk:await chips()};
await page.setViewportSize({width:390,height:844});await wait(500);await click('chview|paniers');out.mob=await chips();
await click('chpan|bp_sst');out.mobLast=await page.evaluate(()=>((document.querySelector('#eq-app .ch-pan-detail .ac-stat.or small')||{}).textContent||''));
console.log('7) puces :',JSON.stringify(out));
C.c7=out.desk.n===11&&out.desk.wrap==='wrap'&&!out.desk.out.length&&out.mob.n===11&&out.mob.wrap==='wrap'&&!out.mob.out.length&&out.mob.lines>=3&&out.mob.pageW<=out.mob.vw+1&&/BY-PASS DERRIÈRE VANNES SST/.test(out.mobLast);
C.logs=logs.length===0;
const bad=Object.entries(C).filter(([k,v])=>!v).map(([k])=>k);console.log(bad.length?'RESULTAT: ECHEC '+bad.join(','):'RESULTAT: TOUT VERT');console.log(logs.length?logs:'[]');
await browser.close();
