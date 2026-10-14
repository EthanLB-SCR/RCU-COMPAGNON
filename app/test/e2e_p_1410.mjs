// LOT P (14/10/2026 nuit) — PANIERS DE LA BASE DE PRIX ET MARQUAGE DES MODIFICATIONS — base de prix FICTIVE (fixture_prix.xlsx + un bloc fictif
// « RACCORDEMENT — CANIVEAU » ajouté en mémoire), affaires fictives :
// c1  « ⧉ Copier vers d'autres paniers » d'un panier SST (heures par DN + variantes) : famille cochée d'office, aperçu avant → après, UNE révision, compte rendu,
//     « ↶ Annuler la copie » (la base d'avant, sa révision) ;
// c2  copie racc_insertion_de_tes → racc_caniveau : mêmes heures et variantes par DN ; DN absents ; « ajouter les DN qui manquent » (MO seule, fournitures signalées) ;
// c3  variantes : la condition suit l'équipe de la ligne à la saisie ; condition fausse → bandeau → Corriger ; plusieurs équipes = à vérifier ; conflit signalé ;
// c4  zone : cadence retouchée et retouche de panier / de prestation EN JAUNE avec « base : X » dessous ; une valeur égale à la base redevient vide ;
// c5  base : valeurs du classeur mémorisées à l'import ; « 🔍 Comparer au classeur » sur une base qui n'en a pas → jaune + « classeur : X », aucun prix ni révision ne bouge
//     (joué après c8 : il recharge la page avec une base « d'avant », sans référence) ;
// c6  ▲ sur une cadence vide → base + 1 (clavier, flèche du champ) ; ▼ revient à la base (vide) ;
// c7  extrusion modifiable dans les paniers de prestation, avec effet sur le prix d'une zone ; Paramètres : ce qui reste ;
// c8  by-pass derrière vannes SST : 2 coudes ACIER NU à souder 90° au DN + 1 vannette 15/21 ;
// c9  téléphone 390 px : rien ne déborde (Paniers, fenêtre de copie, base de prix, zone en jaune), boutons ≥ 34 px ;
// c10 console vide.
import { chromium } from 'playwright';
import path from 'path';import fs from 'fs';import {fileURLToPath} from 'url';
import {zipEntries,inflate,setCellsXml,rezip,openXlsx} from '../src/xlsx.js';
const HERE=path.dirname(fileURLToPath(import.meta.url));
const BASE=process.env.BASE||'http://localhost:8765';
/* ── la base FICTIVE : fixture_prix.xlsx + « RACCORDEMENT — CANIVEAU » (DN 50 à 300, S+T 5 h + M 3 h, pas de fourniture) ── */
async function fixtureP(){const buf=fs.readFileSync(path.join(HERE,'fixture_prix.xlsx'));const ab=buf.buffer.slice(buf.byteOffset,buf.byteOffset+buf.byteLength);
  const wb=await openXlsx(ab);const S=wb.sheets.find(s=>s.name==='Base Opération');const sh=await wb.sheet('Base Opération');const Z=await zipEntries(ab);let xml=await inflate(Z[S.path]);
  const r0=sh.maxR+3;const V={};V['A'+r0]='RACCORDEMENT — CANIVEAU';const H=['DN','Équipe 1','Nb heures 1','Équipe 2','Nb heures 2','Montant MO','Total Fourn.','TOTAL'];H.forEach((h,i)=>{V[String.fromCharCode(65+i)+(r0+2)]=h;});
  [50,65,80,100,125,150,200,300].forEach((dn,j)=>{const r=r0+3+j;Object.assign(V,{['A'+r]:dn,['B'+r]:'S+T',['C'+r]:5,['D'+r]:'M',['E'+r]:3,['F'+r]:1190,['G'+r]:0,['H'+r]:1190});});
  xml=setCellsXml(xml,V);const out=await rezip(Z,{[S.path]:xml});return Buffer.from(out);}
const FIXP={name:'fixture_prix_p.xlsx',mimeType:'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',buffer:await fixtureP()};
const browser=await chromium.launch({headless:true, executablePath: process.env.CHROMIUM_PATH||undefined});
const ctx=await browser.newContext({viewport:{width:1280,height:900}});const page=await ctx.newPage();
const logs=[];page.on('pageerror',e=>logs.push('PAGEERROR: '+e.message.slice(0,300)));page.on('console',m=>{if(m.type()==='error'&&!/supabase|Failed to fetch|net::ERR|404|WebSocket|pdf\.worker|cdnjs/i.test(m.text()))logs.push(m.text().slice(0,200));});
page.on('dialog',d=>d.accept().catch(()=>{}));
const C={};const wait=ms=>page.waitForTimeout(ms);
const SHOT=async(n,sel)=>{if(!process.env.SHOTS)return;const f=path.join(process.env.SHOTS,'p_'+n+'.png');try{if(sel)await page.locator(sel).first().screenshot({path:f,timeout:8000});else await page.screenshot({path:f,fullPage:true});}catch(e){console.log('capture',n,e.message.slice(0,80));}}; /* captures pour relecture (SHOTS=<dossier>), hors dépôt */const J=JSON.stringify;const NA='O2610-91',NB='O2610-92';
await page.goto(BASE+'/index.html');await wait(600);await page.evaluate(()=>{localStorage.clear();localStorage.setItem('trace:wide','1');});await page.evaluate(()=>new Promise(r=>{try{const q=indexedDB.deleteDatabase('trace-kv');q.onsuccess=q.onerror=q.onblocked=()=>r();}catch(e){r();}}));
await page.reload();await wait(1200);
{const s=await page.$('#loginSkip');if(s&&await s.isVisible())await s.click();await wait(700);}
const click=async v=>{await page.evaluate(v=>{const el=document.querySelector(`#eq-app [data-act=af][data-v="${v}"]`);if(!el)throw new Error('bouton absent '+v);el.click();},v);await wait(260);};
const chg=async(sel,val)=>{await page.evaluate(([s,v])=>{const el=document.querySelector(s);if(!el)throw new Error('absent '+s);if(el.type==='checkbox')el.checked=!!v;else el.value=v;el.dispatchEvent(new Event('change',{bubbles:true}));},[sel,val]);await wait(260);};
const BASE0=()=>page.evaluate(()=>JSON.parse(JSON.stringify(window.TRACE.reg.get('prix','base'))));
const AFF=n=>page.evaluate(n=>window.TRACE.affaires.get(n),n);
const openAff=async(n,tab)=>{await page.evaluate(([n,t])=>{const T=window.TRACE;const S=T.affaires.state();S.view='fiche';S.cur=n;S.tab=t||'chiffrage';T.renderHome();},[n,tab]);await wait(350);};
const newAff=async(n,nom)=>{await page.evaluate(async([n,nom])=>{const T=window.TRACE;T.state.userId='ethan';const S=T.affaires.state();S.cur=null;S.view='list';S.seg='devis';T.renderHome();document.getElementById('htCom').click();await new Promise(x=>setTimeout(x,300));
  const seg=document.querySelector('#eq-app [data-act=af][data-v="seg|devis"]');if(seg){seg.click();await new Promise(x=>setTimeout(x,300));}
  for(let k=0;k<20&&!document.querySelector('#eq-app [data-act=af][data-v="new|"]');k++)await new Promise(x=>setTimeout(x,100));
  document.querySelector('#eq-app [data-act=af][data-v="new|"]').click();await new Promise(x=>setTimeout(x,150));document.getElementById('afn-num').value=n;document.getElementById('afn-nom').value=nom;document.getElementById('afn-client').value='CLIENT TEST';document.getElementById('afn-etat').value='devis';
  document.querySelector('#eq-app [data-act=af][data-v="create|"]').click();await new Promise(x=>setTimeout(x,250));document.querySelector('#eq-app [data-act=af][data-v="tab|chiffrage"]').click();await new Promise(x=>setTimeout(x,250));},[n,nom]);await wait(200);};
const CALC=n=>page.evaluate(n=>{const T=window.TRACE;const C=T.affaires.calc(T.affaires.get(n));const r=C.etudes[0].r;return {state:(C.baseInfo||{}).state,ext:r.detail.extrusion,postes:Object.fromEntries(Object.entries(r.postes).map(([k,l])=>[k,Math.round(l.achat*100)/100])),sst:r.detail.sst};},n);
const SAVES=()=>page.evaluate(()=>window.TRACE_P.saves());
const MOD=()=>page.evaluate(()=>{const m=document.getElementById('pcp');const t=e=>(e?e.textContent:'').replace(/\s+/g,' ').trim();return m?{dests:[...m.querySelectorAll('input[name=pcp-dest]')].filter(i=>i.checked).map(i=>i.value),all:[...m.querySelectorAll('input[name=pcp-dest]')].map(i=>i.value),sum:t(m.querySelector('.pcp-sum')),rows:[...m.querySelectorAll('.pcp-prev tr')].slice(1).map(r=>[...r.cells].map(c=>t(c)).join(' | ')),ban:t(m.querySelector('.pmv')),ok:!!m.querySelector('#pcp-ok')&&!m.querySelector('#pcp-ok').disabled,mo:m.querySelector('#pcp-mo').checked,mv:m.querySelector('#pcp-mv').checked,add:m.querySelector('#pcp-add').checked}:null;});
const modClick=async sel=>{await page.evaluate(s=>{const el=document.querySelector('#pcp '+s);if(!el)throw new Error('absent (fenêtre) '+s);el.click();},sel);await wait(200);};
const modCheck=async(v,on)=>{await page.evaluate(([v,on])=>{const el=document.querySelector(`#pcp input[name=pcp-dest][value="${v}"]`)||document.querySelector('#pcp #'+v);if(!el)throw new Error('case absente '+v);if(el.checked!==on){el.checked=on;el.dispatchEvent(new Event('change',{bubbles:true}));}},[v,on]);await wait(200);};
let out;
// ══ 0) affaire, import de la base fictive ══
await newAff(NA,'Paniers — copie');
await page.setInputFiles('#eq-app input[data-afprix]',FIXP);await wait(1500);
const b0=await BASE0();out={rev:!!b0.rev,orig:!!b0.orig,origSrc:b0.orig&&b0.orig.src,can:(b0.op.paniers||[]).some(p=>p.id==='racc_caniveau'),diffs:await page.evaluate(()=>window.TRACE_P.diffs())};
console.log('0) import :',J(out));const ok0=out.rev&&out.orig&&out.origSrc==='fixture_prix_p.xlsx'&&out.can&&out.diffs===0;
// ══ 1) COPIE D'UN PANIER SST (heures par DN + variantes) VERS LES AUTRES SST ══
const SRC='sst_vannes_bs_pn40';
await click('chview|paniers');await click('chpan|'+SRC);await click('chpandn|50');await chg(`#eq-app [data-afx="ov§${SRC}§50§mo0§h"]`,'3');await click('chmvadd|'+SRC+'|50');await chg(`#eq-app [data-afx="mv§${SRC}§50§0§lignes§0§h"]`,'2');
await click('chpandn|80');await chg(`#eq-app [data-afx="ov§${SRC}§80§mo0§h"]`,'4.5');await chg(`#eq-app [data-afx="ov§${SRC}§80§mo0§eq"]`,'S+T+P');
await click('chmvadd|'+SRC+'|80');await chg(`#eq-app [data-afx="mv§${SRC}§80§0§lignes§0§h"]`,'2.5');await click('chmvadd|'+SRC+'|80');await chg(`#eq-app [data-afx="mv§${SRC}§80§1§eq"]`,'S+T');await chg(`#eq-app [data-afx="mv§${SRC}§80§1§lignes§0§h"]`,'3');
const bS=await BASE0();const R0=bS.rev;const s0=await SAVES();
out={src:{over:bS.over[SRC],mv:bS.mvar[SRC]},btn:await page.evaluate(()=>!!document.querySelector('#eq-app .pcp-tools [data-v^="chpcopy|"]'))};
await click('chpcopy|'+SRC);out.m0=await MOD();await SHOT('1_fenetre_copie','#modal .box');
await modCheck('pcp-mo',false);out.m1=await MOD();await modCheck('pcp-mo',true); /* MO décochée : l'aperçu le dit */
await modClick('#pcp-ok');await wait(300);
await SHOT('1_compte_rendu','#eq-app .pcp-res');const bC=await BASE0();const R1=bC.rev;out.saves=(await SAVES())-s0;out.res=await page.evaluate(()=>((document.querySelector('#eq-app .pcp-res')||{}).textContent||'').replace(/\s+/g,' ').trim());out.modal=await page.evaluate(()=>!!document.getElementById('pcp'));
const sameMv=pid=>J(bC.mvar[pid]&&{50:bC.mvar[pid][50],80:bC.mvar[pid][80]})===J({50:bS.mvar[SRC][50],80:bS.mvar[SRC][80]});
out.dst={pn25:bC.over.sst_vannes_bs_pn25,papH:bC.over.sst_vannes_pap_pn25&&[20,50,80,100].map(d=>bC.over.sst_vannes_pap_pn25[d]),mv:['sst_vannes_bs_pn25','sst_vannes_pap_pn25','sst_vannes_bs_brides_pn25'].map(sameMv),racc:!!(bC.mvar||{}).racc_insertion_de_tes};
await click('chpan|sst_vannes_pap_pn25');await click('chpandn|80');out.ui=await page.evaluate(()=>({h:(document.querySelector('#eq-app [data-afx="ov§sst_vannes_pap_pn25§80§mo0§h"]')||{}).value,eq:(document.querySelector('#eq-app [data-afx="ov§sst_vannes_pap_pn25§80§mo0§eq"]')||{}).value,mv:[...document.querySelectorAll('#eq-app .ch-mv-h select')].map(s=>s.value)}));
// annulation : la base d'avant (et sa révision)
await click('chpundo|');const bU=await BASE0();out.undo={rev:bU.rev===R0,over:J(bU.over)===J(bS.over),mvar:J(bU.mvar)===J(bS.mvar),res:await page.evaluate(()=>((document.querySelector('#eq-app .pcp-res')||{}).textContent||'').replace(/\s+/g,' ').trim()),btn:await page.evaluate(()=>!!document.querySelector('#eq-app [data-v="chpundo|"]'))};
console.log('1) copie SST :',J(out));
/* fixture : SST DN 50 (k=2, cadence S 10/j) = 2 h ; PAP / brides (k=3) = 3 h ; source PN40 : DN 50 = 3 h, DN 80 = S+T+P 4,5 h ; variantes : DN 50 S+T+P 2 h, DN 80 S+T+P 2,5 h + S+T 3 h → 3 × 3 = 9 */
C.c1=ok0&&out.btn&&out.src.over[50].mo0.h===3&&out.src.mv[80].length===2&&out.src.mv[80][1].eq==='S+T'&&out.src.mv[80][1].lignes[0].eq==='S+T'
  &&out.m0&&J(out.m0.dests.sort())===J(['sst_vannes_bs_brides_pn25','sst_vannes_bs_pn25','sst_vannes_pap_pn25'])&&out.m0.all.includes('racc_insertion_de_tes')&&!out.m0.dests.includes('racc_insertion_de_tes')&&out.m0.mo&&out.m0.mv&&!out.m0.add
  &&/3 paniers · 24 DN · 9 variantes/.test(out.m0.sum)&&out.m0.rows.length===24&&out.m0.rows.some(r=>/SST — VANNES BS PN25 \| DN 50 \| S\+T 2 h → S\+T 3 h \| — → S\+T\+P : S\+T\+P 2 h/.test(r))&&out.m0.rows.some(r=>/VANNES PAP PN25 \| DN 80 \| S\+T [\d,]+ h → S\+T\+P 4,5 h \| — → S\+T\+P : S\+T\+P 2,5 h · S\+T : S\+T 3 h/.test(r))&&out.m0.ok
  &&out.m1&&out.m1.rows.every(r=>/pas copiée/.test(r))
  &&R1&&R1!==R0&&out.saves===1&&/Copié vers 3 paniers : 24 DN, 9 variantes/.test(out.res)&&!out.modal
  &&out.dst.pn25[50].mo0.h===3&&out.dst.pn25[80].mo0.h===4.5&&out.dst.pn25[80].mo0.eq==='S+T+P'&&!out.dst.pn25[20]&&out.dst.papH[0].mo0.h===1&&!out.dst.papH[1]&&out.dst.papH[2].mo0.eq==='S+T+P'&&out.dst.mv.every(Boolean)&&!out.dst.racc
  &&out.ui.h==='4.5'&&out.ui.eq==='S+T+P'&&J(out.ui.mv)===J(['S+T+P','S+T'])
  &&out.undo.rev&&out.undo.over&&out.undo.mvar&&/Copie annulée/.test(out.undo.res)&&!out.undo.btn;
// ══ 2) RACCORDEMENT CANIVEAU = RACCORDEMENT INSERTION DE TÉS (heures, variantes) ══
await click('chpan|racc_insertion_de_tes');await click('chpandn|100');await chg('#eq-app [data-afx="ov§racc_insertion_de_tes§100§mo0§h"]','9');await click('chmvadd|racc_insertion_de_tes|100');await chg('#eq-app [data-afx="mv§racc_insertion_de_tes§100§0§lignes§0§h"]','6');
await click('chpcopy|racc_insertion_de_tes');out={m0:await MOD()};
await modCheck('racc_attente',false);await modCheck('racc_piquage_en_charge',false);out.m1=await MOD();await modCheck('pcp-add',true);out.m2=await MOD();await modClick('#pcp-ok');await wait(300);
const bR=await BASE0();const CAN=bR.over.racc_caniveau||{};out.can={d100:CAN[100],d50:CAN[50],d300:CAN[300],add20:CAN[20]&&CAN[20].add,mv100:(bR.mvar.racc_caniveau||{})[100],mvSrc:bR.mvar.racc_insertion_de_tes[100],att:!!(bR.over||{}).racc_attente};
await click('chpan|racc_caniveau');await click('chpandn|20');await SHOT('2_dn_ajoute','#eq-app .ch-pan-detail');out.ui=await page.evaluate(()=>{const d=document.querySelector('#eq-app .ch-pan-detail');const t=e=>(e?e.textContent:'').replace(/\s+/g,' ').trim();return {chips:[...document.querySelectorAll('#eq-app .ch-dnchips .chip')].map(c=>t(c)),added:t(d.querySelector('.pcp-added')),mo:[...d.querySelector('.ch-2col>div:first-child table').querySelectorAll('tr')].slice(1).map(r=>(r.querySelector('select')||{}).value+' '+(r.querySelector('input')||{}).value),fo:[...d.querySelectorAll('.ch-2col>div:nth-child(2) table tr')].slice(1).map(r=>t(r.cells[0])),rm:t(document.querySelector('#eq-app [data-v="chovclear|racc_caniveau|20"]'))};});
await click('chpandn|100');out.ui100=await page.evaluate(()=>[...document.querySelector('#eq-app .ch-pan-detail .ch-2col>div:first-child table').querySelectorAll('tr')].slice(1).map(r=>(r.querySelector('select')||{}).value+' '+(r.querySelector('input')||{}).value));
console.log('2) caniveau :',J(out));
/* insertion de tés : DN 20-250, S+T+P 8 h + M 8 h (12 + 12 au-dessus de DN 100) ; caniveau : DN 50-300, S+T 5 h + M 3 h ; DN 100 : S+T+P 9 h + M 8 h, variante S+T+P 6 h */
C.c2=out.m0&&J(out.m0.dests.sort())===J(['racc_attente','racc_caniveau','racc_piquage_en_charge'])&&/1 panier · 7 DN · 1 variante/.test(out.m1.sum)&&/DN absents des destinataires \(pas copiés\) : CANIVEAU : DN 20, 25, 32, 40, 250/.test(out.m1.sum)&&out.m1.rows.length===7
  &&/1 panier · 12 DN · 1 variante/.test(out.m2.sum)&&/DN ajoutés \(MO seule, fournitures à compléter — signalées\) : CANIVEAU : DN 20, 25, 32, 40, 250/.test(out.m2.sum)&&out.m2.rows.length===12&&out.m2.rows.some(r=>/DN 20 ajouté \| — → S\+T\+P 8 h \+ M 8 h/.test(r))
  &&out.can.d100.mo0.eq==='S+T+P'&&out.can.d100.mo0.h===9&&out.can.d100.mo1.h===8&&!out.can.d100.mo1.eq&&out.can.d50.mo0.eq==='S+T+P'&&out.can.d50.mo0.h===8&&!out.can.d300&&out.can.add20&&J(out.can.add20.mo)===J([{eq:'S+T+P',h:8},{eq:'M',h:8}])&&J(out.can.mv100)===J(out.can.mvSrc)&&!out.can.att
  &&out.ui.chips.includes('DN 20 +')&&/DN 20 ajouté par une copie du panier « RACCORDEMENT — INSERTION DE TÉS »/.test(out.ui.added)&&/fournitures à vérifier ou compléter/.test(out.ui.added)&&J(out.ui.mo)===J(['S+T+P 8','M 8'])&&/Retirer ce DN ajouté/.test(out.ui.rm)
  &&J(out.ui100)===J(['S+T+P 9','M 8']);
// ══ 3) VARIANTES : la condition suit l'équipe de la ligne ; bandeau, Corriger, à vérifier, conflit ══
await click('chpan|purge');await click('chpandn|50');await click('chmvadd|purge|50');out={v0:(await BASE0()).mvar.purge[50][0].eq};
await chg('#eq-app [data-afx="mv§purge§50§0§lignes§0§eq"]','S+T');out.v1=(await BASE0()).mvar.purge[50][0];
await click('chpandn|65');await click('chmvadd|purge|65');await click('chmvladd|purge|65|0');await chg('#eq-app [data-afx="mv§purge§65§0§lignes§1§eq"]','S+T');out.mix=(await BASE0()).mvar.purge[65][0].eq;
await click('chmvlrm|purge|65|0.0');out.rm=(await BASE0()).mvar.purge[65][0];
await page.evaluate(()=>{const b=window.TRACE.reg.get('prix','base');b.mvar.purge[32]=[{eq:'S+T+P',lignes:[{eq:'S+T',h:1}]},{eq:'S+T',lignes:[{eq:'S+T',h:1.25}]}];b.mvar.purge[40]=[{eq:'S+T+P',lignes:[{eq:'S+T',h:1},{eq:'M',h:1}]}];}); /* une base d'Ethan : condition oubliée */
await click('chview|paniers');await click('chpan|purge');await click('chpandn|32');out.tag=await page.evaluate(()=>[...document.querySelectorAll('#eq-app .ch-mv-h .eq-tag')].map(t=>t.textContent.trim()));const BAN=()=>page.evaluate(()=>{const b=document.querySelector('#eq-app .pmv');return b?{t:b.textContent.replace(/\s+/g,' ').trim(),fix:!!b.querySelector('[data-v^="chpmvfix|"]'),items:[...b.querySelectorAll('li')].map(l=>l.textContent.replace(/\s+/g,' ').trim())}:null;});
out.ban0=await BAN();await SHOT('3_bandeau_variantes','#eq-app .pmv');await click('chpcopy|purge');out.modBan=(await MOD()||{}).ban;await page.evaluate(()=>document.querySelector('#pcp [data-close]').click());await wait(200);
await click('chpmvfix|');const bF=await BASE0();out.fix={c32:bF.mvar.purge[32].map(v=>v.eq),c40:bF.mvar.purge[40][0].eq};out.ban1=await BAN();
console.log('3) variantes :',J(out));
C.c3=out.v0==='S+T+P'&&out.v1.eq==='S+T'&&out.v1.lignes[0].eq==='S+T'&&out.mix==='S+T+P'&&out.rm.eq==='S+T'&&J(out.rm.lignes.map(l=>l.eq))===J(['S+T'])&&J(out.tag)===J(['⚠ ≠ équipe de la ligne (S+T)'])
  &&out.ban0&&/⚠ 2 variantes : « quand l'équipe est » ≠ l'équipe choisie pour chiffrer/.test(out.ban0.t)&&out.ban0.fix&&out.ban0.items.some(t=>/PURGE · DN 32 : « quand l'équipe est S\+T\+P » → équipe de la ligne S\+T/.test(t))&&out.ban0.items.some(t=>/PURGE · DN 40 .*à vérifier \(plusieurs équipes\)/.test(t))
  &&/PURGE · DN 32/.test(out.modBan||'')&&J(out.fix.c32)===J(['S+T','S+T'])&&out.fix.c40==='S+T+P'&&out.ban1&&out.ban1.items.some(t=>/conflit · PURGE · DN 32 : 2 variantes « quand l'équipe est S\+T »/.test(t))&&out.ban1.items.some(t=>/DN 40 .*à vérifier/.test(t))&&!out.ban1.fix;
// ══ 4) ZONE : TOUTE RETOUCHE EN JAUNE, « base : X » DESSOUS ══
const ZONE={id:'EB',nom:'Zone B',chantier:{d0:'2026-11-02',d1:'2026-11-13'},eq:{soud:'S+T+P',manch:'M',typeManchon:'Thermo'},mlMode:'tranchee',dn:[{dn:100,soud:20,ml:100},{dn:50,soud:10,ml:40}],sst:[{dn:50,type:'sst_vannes_bs_pn25',paires:1,bypass:true}],extrusion:[{dn:110,type:'Manchons',paires:2}],foncage:{rows:[{dn:100,ml:24,vac:0}]}};
await newAff(NB,'Zone jaune');await page.evaluate(([n,z])=>{const T=window.TRACE;T.affaires.set(n,{chiffrage:{etudes:[z]}});T.renderHome();},[NB,ZONE]);await openAff(NB);await click('chei|0');await click('chrevpin|');
const YEL='rgb(255, 243, 166)';
await chg('#eq-app [data-afx="e§dn.0.cad"]','12');
const cadUI=()=>page.evaluate(()=>{const i=document.querySelector('#eq-app [data-afx="e§dn.0.cad"]');const td=i.closest('td');return {v:i.value,cls:i.className,bg:getComputedStyle(i).backgroundColor,small:(td.querySelector('.ch-cadb.ov')||{}).textContent||'',bv:i.dataset.bv,step:i.step,ph:i.placeholder,tag:(document.querySelector('#eq-app .ch-bloc[data-bloc="dn"] .ch-head .ch-tag.ov')||{}).textContent||''};});
out={cad:await cadUI()};
await page.evaluate(()=>{const b=document.querySelector('#eq-app .ch-bloc[data-bloc="sst"].folded .ch-fold');if(b)b.click();});await wait(250);await click('chpdet|sst_vannes_bs_pn25|50|0');
await chg('#eq-app [data-afx="eov§sst_vannes_bs_pn25§50§fo0§pu"]','150');
const panUI=()=>page.evaluate(()=>{const i=document.querySelector('#eq-app [data-afx="eov§sst_vannes_bs_pn25§50§fo0§pu"]');const td=i.closest('td');return {v:i.value,cls:i.className,bg:getComputedStyle(i).backgroundColor,small:(td.querySelector('.ch-base')||{}).textContent||'',smallBelow:td.querySelector('.ch-base')?getComputedStyle(td.querySelector('.ch-base')).display:'',bv:i.dataset.bv};});
out.pan=await panUI();await SHOT('4_zone_cadence','#eq-app .ch-bloc[data-bloc="dn"]');await SHOT('4_zone_panier','#eq-app .ch-bloc[data-bloc="sst"]');out.zov=(await AFF(NB)).chiffrage.etudes[0].over;
await chg('#eq-app [data-afx="eov§sst_vannes_bs_pn25§50§fo0§pu"]','60');out.pan2=await panUI();out.zov2=(await AFF(NB)).chiffrage.etudes[0].over||{};
await page.evaluate(()=>{const b=document.querySelector('#eq-app .ch-bloc[data-bloc="extrusion"].folded .ch-fold');if(b)b.click();});await wait(250);await click('chpv|e|'+encodeURIComponent('ext|110|Manchons'));
const pvSel='#eq-app [data-afx="pov§ext|110|Manchons§mo§qty"]';await chg(pvSel,'3');out.pv=await page.evaluate(s=>{const i=document.querySelector(s);const p=i.closest('.ch-pair');return {cls:i.className,bg:getComputedStyle(i).backgroundColor,small:(p.querySelector('.ch-base')||{}).textContent||''};},pvSel);await chg(pvSel,'');
await page.evaluate(()=>{const b=document.querySelector('#eq-app .ch-bloc[data-bloc="foncage"].folded .ch-fold');if(b)b.click();});await wait(250);await chg('#eq-app [data-afx="e§foncage.rows.0.jours"]','4');out.fon=await page.evaluate(()=>{const i=document.querySelector('#eq-app [data-afx="e§foncage.rows.0.jours"]');const td=i.closest('td');return {cls:i.className,small:(td.querySelector('.ch-base')||{}).textContent||''};});await chg('#eq-app [data-afx="e§foncage.rows.0.jours"]','');
console.log('4) zone en jaune :',J(out));
/* fixture : DN 100 S+T+P = 10 soud. / j ; vanne BS PN25 DN 50 = 60 € (×2) ; extrusion Ø 110 manchons = 2 h (M+M) ; fonçage 24 ml → 1 j calculé */
C.c4=out.cad.v==='12'&&/ch-cadov/.test(out.cad.cls)&&out.cad.bg===YEL&&out.cad.small==='base : 10'&&out.cad.bv==='10'&&out.cad.step==='1'&&out.cad.ph==='10'&&/1 cadence retouchée/.test(out.cad.tag)
  &&out.pan.v==='150'&&/ch-ov/.test(out.pan.cls)&&out.pan.bg===YEL&&out.pan.small==='base : 60,00'&&out.pan.smallBelow==='block'&&out.pan.bv==='60'&&out.zov.sst_vannes_bs_pn25['50'].fo0.pu===150
  &&out.pan2.v===''&&!/ch-ov/.test(out.pan2.cls)&&!out.zov2.sst_vannes_bs_pn25
  &&/ch-ov/.test(out.pv.cls)&&out.pv.bg===YEL&&out.pv.small==='base : 2,00'&&/ch-ov/.test(out.fon.cls)&&/^calcul : 0,5 j$/.test(out.fon.small);
// ══ 6) ▲ / ▼ SUR UNE CADENCE VIDE : la base ± 1 ══
await chg('#eq-app [data-afx="e§dn.0.cad"]','');const cadOf=async()=>(await AFF(NB)).chiffrage.etudes[0].dn[0].cad;
out={empty:await cadOf()};await page.focus('#eq-app [data-afx="e§dn.0.cad"]');await page.keyboard.press('ArrowUp');await wait(400);out.up=await cadOf();out.ui=await cadUI();out.focus=await page.evaluate(()=>(document.activeElement||{}).dataset?document.activeElement.dataset.afx:'');
await page.keyboard.press('ArrowUp');await wait(400);out.up2=await cadOf();await page.keyboard.press('ArrowDown');await wait(400);await page.keyboard.press('ArrowDown');await wait(400);out.down=await cadOf();out.ui2=await cadUI();
await page.keyboard.press('ArrowDown');await wait(400);out.down2=await cadOf();await chg('#eq-app [data-afx="e§dn.0.cad"]','');
await page.locator('#eq-app [data-afx="e§dn.0.cad"]').scrollIntoViewIfNeeded();const bb=await page.locator('#eq-app [data-afx="e§dn.0.cad"]').boundingBox();const pad=await page.evaluate(()=>{const s=getComputedStyle(document.querySelector('#eq-app [data-afx="e§dn.0.cad"]'));return parseFloat(s.paddingRight)+parseFloat(s.borderRightWidth);}); /* la flèche du champ est dans la boîte de contenu (après la marge intérieure) */
await page.mouse.move(bb.x+bb.width-pad-6,bb.y+bb.height*0.32);await wait(150);await page.mouse.down();await wait(60);await page.mouse.up();await wait(450);out.spin=await cadOf();
await chg('#eq-app [data-afx="e§dn.0.cad"]','');await page.focus('#eq-app [data-afx="e§dn.0.cad"]');await page.keyboard.type('13');await page.keyboard.press('Tab');await wait(350);out.typed=await cadOf();await chg('#eq-app [data-afx="e§dn.0.cad"]','');
console.log('6) flèches :',J(out));
C.c6=out.empty===''&&out.up===11&&out.ui.v==='11'&&/ch-cadov/.test(out.ui.cls)&&out.focus==='e§dn.0.cad'&&out.up2===12&&out.down===''&&out.ui2.v===''&&!/ch-cadov/.test(out.ui2.cls)&&out.down2===9&&out.spin===11&&out.typed===13;
// ══ 7) EXTRUSION DANS LES PANIERS DE PRESTATION — effet sur le prix d'une zone ; PARAMÈTRES ══
const e0=await CALC(NB);out={state:e0.state,ext0:e0.postes.extrusion,pu0:e0.ext.rows[0].pu};
await click('chview|paniers');await click('chpresta|extrusion');out.card=await page.evaluate(()=>{const c=document.getElementById('ch-presta');const t=e=>(e?e.textContent:'').replace(/\s+/g,' ').trim();return {chip:[...c.querySelectorAll('.ch-prestachips .chip')].map(t).filter(x=>/^Extrusion/.test(x)),inp:!!c.querySelector('[data-afx="b§op§extrusion§rows§1§h§manchons"]'),eq:!!c.querySelector('select[data-afx="b§op§extrusion§rows§1§eq"]'),am:!!c.querySelector('[data-afx="b§op§extrusion§rows§1§amort"]'),co:!!c.querySelector('[data-afx="b§op§extrusion§rows§1§conso"]'),head:t(c.querySelector('.pex tr'))};});
await chg('#ch-presta [data-afx="b§op§extrusion§rows§1§h§manchons"]','4');const bE=await BASE0();await SHOT('7_extrusion','#ch-presta');out.base=bE.op.extrusion.rows[1].h.manchons;out.yel=await page.evaluate(()=>{const i=document.querySelector('#ch-presta [data-afx="b§op§extrusion§rows§1§h§manchons"]');return {cls:i.className,small:(i.parentElement.querySelector('.ch-cl')||{}).textContent||'',row:(i.closest('tr').querySelector('td.num b')||{}).textContent||''};});
await openAff(NB);await click('chei|0');const e1=await CALC(NB);out.kept=e1.postes.extrusion;await click('chrevup|');const e2=await CALC(NB);out.ext2=e2.postes.extrusion;out.pu2=e2.ext.rows[0].pu;
await click('chview|base');await click('chbase|params');out.params=await page.evaluate(()=>{const has=k=>!!document.querySelector(`#eq-app [data-afx="b§fo§params§${k}"]`);return {hpj:has('FO_Heures_Par_Jour'),ratio:has('FO_Ratio_Dechets'),transp:has('FO_Transport_Fournitures'),vref:has('FO_Volume_Reference_Ratios'),app:has('FO_Epreuve_Volume_Reference')||has('FO_Foncage_Nb_Tes')};});
await click('chpresta|locations');out.loc=await page.evaluate(()=>!!document.querySelector('#ch-presta [data-afx="b§fo§params§FO_Ratio_Dechets"]'));await click('chpresta|aerien');out.aer=await page.evaluate(()=>!!document.querySelector('#ch-presta [data-afx="b§fo§params§FO_Transport_Fournitures"]'));
await click('chpresta|epreuve');await chg('#ch-presta [data-afx="b§fo§params§FO_Epreuve_Volume_Reference"]','20');out.appP=await page.evaluate(()=>{const i=document.querySelector('#ch-presta [data-afx="b§fo§params§FO_Epreuve_Volume_Reference"]');return {cls:i.className,small:(i.parentElement.querySelector('.ch-base')||{}).textContent||'',bv:i.dataset.bv};});await chg('#ch-presta [data-afx="b§fo§params§FO_Epreuve_Volume_Reference"]','30');out.appP2=(await BASE0()).fo.params.FO_Epreuve_Volume_Reference;
await click('chpresta|rincage');out.rin=await page.evaluate(()=>!!document.querySelector('#ch-presta [data-afx="b§fo§params§FO_Volume_Reference_Ratios"]'));await click('chpresta|foncage');out.fonApp=await page.evaluate(()=>!!document.querySelector('#ch-presta [data-afx="b§fo§params§FO_Foncage_Nb_Tes"]'));
console.log('7) extrusion / paramètres :',J(out));
/* Ø 110 manchons : 2 h × 160 €/h (M+M) + 200 + 50 = 570 € → 4 h : 890 € ; 2 pièces : 1 140 → 1 780 */
C.c7=out.state==='courante'&&Math.abs(out.pu0-570)<0.01&&Math.abs(out.ext0-1140)<0.01&&out.card.chip.length===1&&out.card.inp&&out.card.eq&&out.card.am&&out.card.co&&/Heures par pièce/.test(out.card.head)&&out.base===4&&/ch-clov/.test(out.yel.cls)&&out.yel.small==='classeur : 2'&&out.yel.row==='890'
  &&Math.abs(out.kept-1140)<0.01&&Math.abs(out.ext2-1780)<0.01&&Math.abs(out.pu2-890)<0.01&&out.params.hpj&&!out.params.ratio&&!out.params.transp&&!out.params.vref&&!out.params.app&&out.loc&&out.aer&&out.rin&&out.fonApp&&/ch-ov/.test(out.appP.cls)&&out.appP.small==='défaut : 30'&&out.appP.bv==='30'&&out.appP2===undefined;
// ══ 8) BY-PASS DERRIÈRE VANNES SST : 2 coudes ACIER NU à souder 90° + 1 vannette 15/21 ══
await click('chview|paniers');await click('chpan|bp_sst');await click('chpandn|50');out={pan:await page.evaluate(()=>{const d=document.querySelector('#eq-app .ch-pan-detail');const t=e=>e.textContent.replace(/\s+/g,' ').trim();return {fo:[...d.querySelectorAll('.ch-2col>div:nth-child(2) table tr')].slice(1).map(r=>t(r.cells[0])+' | '+((r.cells[1].querySelector('input')||{}).value||'')),note:t(document.querySelector('#eq-app .ch-bpnote')||{textContent:''})};})};
await openAff(NB);await click('chei|0');await click('chpdet|bp_sst|50|bp0');out.zone=await page.evaluate(()=>{const b=[...document.querySelectorAll('#eq-app .ch-bloc[data-bloc="sst"] .ch-pdet.open')].find(x=>/By-pass derrière/.test(x.textContent));return b?{rows:[...b.querySelectorAll('table.ch-pdt tr')].map(r=>r.cells[0].textContent.replace(/\s+/g,' ').trim()),hint:(b.querySelector('.hint')||{}).textContent||''}:null;});
out.coude50=await page.evaluate(()=>{const b=window.TRACE.reg.get('prix','base');const T=b.fo.tables.FO_Accessoires_Acier;const r=T.rows.find(x=>+x[T.cols[0]]===50);return +r['Coudes à souder'];});
console.log('8) by-pass :',J(out));
C.c8=out.pan.fo.some(t=>/^Coude acier nu à souder 90° DN 50 \| 2$/.test(t))&&out.pan.fo.some(t=>/^Vannette 15\/21.* \| 1$/.test(t))&&/2 coudes ACIER NU à souder 90° au DN du by-pass/.test(out.pan.note)
  &&out.zone&&out.zone.rows.some(t=>/^Coude acier nu à souder 90° DN 50/.test(t))&&out.zone.rows.some(t=>/^Vannette 15\/21/.test(t))&&/2 coudes acier nu à souder 90° au DN des vannes, 1 vannette 15\/21/.test(out.zone.hint)&&out.coude50===7;
// ══ 5) « 🔍 COMPARER AU CLASSEUR » SUR UNE BASE SANS RÉFÉRENCE (base d'Ethan importée avant ce soir) ══
await page.evaluate(async()=>{const KEY='trace:reg:prix';const db=await new Promise((res,rej)=>{const r=indexedDB.open('trace-kv',1);r.onsuccess=()=>res(r.result);r.onerror=()=>rej(r.error);});
  const get=()=>new Promise((res,rej)=>{const t=db.transaction('kv','readonly');const q=t.objectStore('kv').get(KEY);q.onsuccess=()=>res(q.result);q.onerror=()=>rej(q.error);});const put=v=>new Promise((res,rej)=>{const t=db.transaction('kv','readwrite');t.objectStore('kv').put(v,KEY);t.oncomplete=()=>res();t.onerror=()=>rej(t.error);});
  await new Promise(r=>setTimeout(r,500));const R=await get();const B=R.base.data;delete B.orig;B.mo.postes[0].taux=80;B.fo.params.FO_Epreuve_Pompe=111;await put(R);db.close();});
await page.reload();await wait(1500);{const s=await page.$('#loginSkip');if(s&&await s.isVisible())await s.click();await wait(700);}
const cssAtStart=await page.evaluate(()=>!!document.getElementById('css-lot-p'));
await page.evaluate(()=>{window.TRACE.state.userId='ethan';document.getElementById('htCom').click();});await wait(500);await openAff(NB);await click('chview|base');await click('chbase|mo');const bN=await BASE0();
out={css:cssAtStart,noOrig:!bN.orig,taux:bN.mo.postes[0].taux,rev:bN.rev,help:await page.evaluate(()=>((document.querySelector('#eq-app .pcl-help')||{}).textContent||'').replace(/\s+/g,' ').trim()),yel0:await page.evaluate(()=>document.querySelectorAll('#eq-app .ch-clov').length),s0:await SAVES()};
await page.setInputFiles('#eq-app input[data-afx="pcmp"]',FIXP);await wait(1500);
const bO=await BASE0();out.after={orig:!!bO.orig,src:bO.orig&&bO.orig.src,taux:bO.mo.postes[0].taux,rev:bO.rev===out.rev,pompe:bO.fo.params.FO_Epreuve_Pompe,saves:(await SAVES())-out.s0};
out.ui=await page.evaluate(()=>{const i=document.querySelector('#eq-app [data-afx="b§mo§postes§0§taux"]');const t2=document.querySelector('#eq-app [data-afx="b§mo§postes§1§taux"]');return {cls:i.className,bg:getComputedStyle(i).backgroundColor,small:(i.parentElement.querySelector('.ch-cl')||{}).textContent||'',other:t2.className,help:((document.querySelector('#eq-app .pcl-help')||{}).textContent||'').replace(/\s+/g,' ').trim()};});
await SHOT('5_base_aide','#eq-app .pcl-help');await SHOT('5_base_taux','#eq-app .card:has(.pcl-help) table.ch-tab');await page.locator('#eq-app [data-afx="b§mo§postes§1§taux"]').scrollIntoViewIfNeeded();await page.locator('#eq-app [data-afx="b§mo§postes§1§taux"]').click();await wait(120);await page.keyboard.type('65');await page.keyboard.press('Tab');await wait(400);out.typedBase=(await BASE0()).mo.postes[1].taux; /* la frappe remplace la valeur (sélection au focus) */
await click('chbase|params');out.par=await page.evaluate(()=>{const i=document.querySelector('#eq-app [data-afx="b§fo§params§FO_Epreuve_Pompe"]');return i?{cls:i.className,small:(i.parentElement.querySelector('.ch-cl')||{}).textContent||''}:null;});
await click('chpresta|epreuve');out.par2=await page.evaluate(()=>{const i=document.querySelector('#ch-presta [data-afx="b§fo§params§FO_Epreuve_Pompe"]');return i?{cls:i.className,small:(i.parentElement.querySelector('.ch-cl')||{}).textContent||''}:null;});
await click('chpan|sst_vannes_bs_pn40');await click('chpandn|50');out.pan=await page.evaluate(()=>{const i=document.querySelector('#eq-app [data-afx="ov§sst_vannes_bs_pn40§50§mo0§h"]');return {cls:i.className,small:(i.parentElement.querySelector('.ch-cl')||{}).textContent||''};});
console.log('5) comparer au classeur :',J(out));
/* fixture : taux soudeur 70, pompe d'épreuve 100 ; SST PN40 DN 50 = 2 h au classeur (3 h retouchées au § 1) */
C.c5=out.css&&out.noOrig&&out.taux===80&&/pas encore de classeur de référence/.test(out.help)&&/Comparer au classeur/.test(out.help)&&out.yel0===0&&out.after.orig&&out.after.src==='fixture_prix_p.xlsx'&&out.after.taux===80&&out.after.pompe===111&&out.after.rev&&out.after.saves===1
  &&/ch-clov/.test(out.ui.cls)&&out.ui.bg===YEL&&out.ui.small==='classeur : 70'&&!/ch-clov/.test(out.ui.other)&&/différent du classeur de référence fixture_prix_p\.xlsx/.test(out.ui.help)&&/Taux 1/.test(out.ui.help)
  &&out.typedBase===65&&!out.par&&out.par2&&/ch-clov/.test(out.par2.cls)&&out.par2.small==='classeur : 100'&&/ch-clov/.test(out.pan.cls)&&out.pan.small==='classeur : 2';
// ══ 9) TÉLÉPHONE 390 px ══
await page.setViewportSize({width:390,height:844});await wait(500);
const fit=()=>page.evaluate(()=>{const vw=document.documentElement.clientWidth;const over=[...document.querySelectorAll('#eq-app .pcp-res, #eq-app .pmv, #eq-app .pcl-help, #eq-app .pcp-tools, #eq-app .pcp-added, #eq-app .ch-pan-detail .ac-stats')].filter(e=>{const r=e.getBoundingClientRect();return r.width>0&&(r.right>vw+1||r.left<-1);}).map(e=>e.className);
  const small=[...document.querySelectorAll('#eq-app .pcp-tools .btn, #eq-app .pmv .btn, #eq-app .pcp-res .btn, #eq-app .pcl-help .btn')].filter(b=>b.getBoundingClientRect().height>0&&b.getBoundingClientRect().height<34).map(b=>b.textContent.trim());return {pageW:document.documentElement.scrollWidth,vw,over,small};});
await openAff(NA);await click('chview|paniers');await click('chpan|racc_caniveau');await click('chpandn|20');out={pan:await fit()};await SHOT('9_tel_paniers');
await click('chpcopy|racc_caniveau');out.mod=await page.evaluate(()=>{const box=document.querySelector('#modal .box');const vw=document.documentElement.clientWidth;const r=box.getBoundingClientRect();const btns=[...box.querySelectorAll('.btn,.pcp-ck')].filter(b=>b.getBoundingClientRect().height>0);
  return {right:r.right,left:r.left,vw,sw:box.scrollWidth,cw:box.clientWidth,low:btns.filter(b=>b.getBoundingClientRect().height<34).map(b=>b.textContent.trim().slice(0,30)),wide:[...box.querySelectorAll('*')].filter(e=>{const q=e.getBoundingClientRect();return q.width>0&&q.right>r.right+1&&!e.closest('.pcp-prev');}).length};});
await SHOT('9_tel_fenetre','#modal .box');await page.evaluate(()=>document.querySelector('#pcp [data-close]').click());await wait(200);
await click('chview|base');await click('chbase|mo');out.base=await fit();await SHOT('9_tel_base');
await openAff(NB);await click('chei|0');await chg('#eq-app [data-afx="e§dn.0.cad"]','12');out.zone=await page.evaluate(()=>{const vw=document.documentElement.clientWidth;const i=document.querySelector('#eq-app [data-afx="e§dn.0.cad"]');return {pageW:document.documentElement.scrollWidth,vw,yel:/ch-cadov/.test(i.className)};});await SHOT('9_tel_zone');await chg('#eq-app [data-afx="e§dn.0.cad"]','');
console.log('9) téléphone :',J(out));
C.c9=out.pan.pageW<=out.pan.vw+1&&!out.pan.over.length&&!out.pan.small.length&&out.mod.right<=out.mod.vw+1&&out.mod.left>=-1&&out.mod.sw<=out.mod.cw+1&&!out.mod.low.length&&out.mod.wide===0&&out.base.pageW<=out.base.vw+1&&!out.base.over.length&&!out.base.small.length&&out.zone.pageW<=out.zone.vw+1&&out.zone.yel;
C.c10=logs.length===0;
const bad=Object.entries(C).filter(([k,v])=>!v).map(([k])=>k);console.log(bad.length?'RESULTAT: ECHEC '+bad.join(','):'RESULTAT: TOUT VERT');console.log(logs.length?logs:'[]');
await browser.close();
