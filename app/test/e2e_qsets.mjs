// QUANTITÉS (lot 3, 13/10/2026) : études fournisseur importées par la TRAME TYPE SCR (collée depuis Excel, ou fichier), ligne refusée avec sa raison,
// synthèse par DN (soudures = manchons, sinon estimées ≈ ; ml de tranchée = barres × longueur ÷ 2), 2e étude, comparatif, « → Prendre » vers les quantités
// repérées (« dont antennes » gardé), saisie à la main (lignes, unité ml → barres), retrait ; la carte vient AVANT les points techniques.
import { chromium } from 'playwright';
import {makePdf,pdfLines} from './mkpdf.mjs';
import {makeXlsx} from '../src/xlsx.js';
import {TRAME_COLS} from '../src/trame.js';
const BASE=process.env.BASE||'http://localhost:8765';
const browser=await chromium.launch({headless:true, executablePath: process.env.CHROMIUM_PATH||undefined});
const ctx=await browser.newContext({viewport:{width:1280,height:900}});const page=await ctx.newPage();
const logs=[];page.on('pageerror',e=>logs.push('PAGEERROR: '+e.message.slice(0,300)));page.on('console',m=>{if(m.type()==='error'&&!/supabase|Failed to fetch|net::ERR|404|WebSocket|pdf\.worker|cdnjs/i.test(m.text()))logs.push(m.text().slice(0,200));});
page.on('dialog',d=>d.accept().catch(()=>{}));
const C={};const wait=ms=>page.waitForTimeout(ms);
await page.goto(BASE+'/index.html');await wait(600);await page.evaluate(()=>{localStorage.clear();localStorage.setItem('trace:wide','1');});await page.reload();await wait(1200);
{const s=await page.$('#loginSkip');if(s&&await s.isVisible())await s.click();await wait(700);}
const chg=async(sel,val)=>{await page.evaluate(([s,v])=>{const el=document.querySelector(s);if(!el)throw new Error('absent '+s);if(el.type==='checkbox'){el.checked=!!v;}else el.value=v;el.dispatchEvent(new Event('change',{bubbles:true}));},[sel,val]);await wait(150);};
const click=async v=>{await page.evaluate(v=>{const el=document.querySelector(`#eq-app [data-act=af][data-v="${v}"]`);if(!el)throw new Error('bouton absent '+v);el.click();},v);await wait(250);};
const A=()=>page.evaluate(()=>window.TRACE.affaires.get('O2610-14'));
await page.evaluate(async()=>{const T=window.TRACE;T.state.userId='ethan';T.renderHome();document.getElementById('htCom').click();await new Promise(x=>setTimeout(x,250));
  document.querySelector('#eq-app [data-act=af][data-v="new|"]').click();await new Promise(x=>setTimeout(x,150));document.getElementById('afn-num').value='O2610-14';document.getElementById('afn-nom').value='Quantités fournisseur';document.getElementById('afn-client').value='CORIANCE';document.getElementById('afn-etat').value='devis';
  document.querySelector('#eq-app [data-act=af][data-v="create|"]').click();await new Promise(x=>setTimeout(x,250));document.querySelector('#eq-app [data-act=af][data-v="tab|quantites"]').click();await new Promise(x=>setTimeout(x,300));});
const H='Type de pièce\tDN\tDN 2\tAngle (°)\tLongueur (m)\tQuantité\tUnité\tGaine Ø (mm)\tRéf. fournisseur\tDésignation fournisseur';
const TA=[H,'Barre\t200\t\t\t12\t20\tu\t\tZ2T20012\tConduite DN 200/355 Lg 12 m','Coude\t200\t\t90\t\t6\tu\t\tZ2C20090\tCoude 90° DN 200','Té\t200\t80\t\t\t2\tu\t\tZ2TS20080\tTé à saut DN 200/80','Manchon\t200\t\t\t\t30\tu\t\tZ2J200\tKit joint DN 200','Barre\t80\t\t\t12\t10\tu\t\tZ2T8012\tConduite DN 80','Vanne\t80\t\t\t\t2\tu\t\tZ2V80\tVanne DN 80','Accessoire\t\t\t\t\t100\tu\t\tZMD2\tMatelas de dilatation','Truc\t80\t\t\t\t3\tu\t\t\tLigne inconnue'].join('\n');
// ── 1) la carte avant les points techniques ; import collé : 7 lignes lues, 1 refusée avec sa raison ; synthèse dans la fenêtre
let out={order:await page.evaluate(()=>{const h=[...document.querySelectorAll('#eq-app .card h3')].map(x=>x.textContent);const i=t=>h.findIndex(x=>x.startsWith(t));return {qs:i('Quantités · tracé et quantitatifs fournisseurs'),rep:i('★ Quantités de référence'),pt:i('Points techniques'),bub:(()=>{const c=document.querySelector('#eq-app .cm-qschips');return !!c&&!!c.firstElementChild&&c.firstElementChild.classList.contains('cm-qtchip');})() /* 14/10 nuit : le tracé = 1re puce des quantitatifs (plus une bulle) */,flow:!!document.querySelector('#eq-app .cm-qflow')};})};
await click('qsimp|');await wait(200);
await page.evaluate(()=>{document.getElementById('qi-nom').value='Fournisseur A';document.querySelector('#modal [data-iqm="paste"]').click();});await wait(200); // 13/10 soir : écran d'import commun (Fichier du fournisseur | Coller)
await page.evaluate(t=>{document.getElementById('iq-paste').value=t;document.getElementById('iq-read').click();},TA);await wait(300);
out.modal=await page.evaluate(()=>{const M=document.getElementById('modal');return {nom:document.getElementById('qi-nom').value,info:(M.querySelector('.iq-info')||{}).textContent||'',bad:([...M.querySelectorAll('details')].find(d=>/refusée/.test(d.textContent))||{}).textContent||'',rows:[...M.querySelectorAll('table.iq-syn tr')].slice(1).map(r=>[...r.cells].map(c=>c.textContent).join('|')),ok:!document.getElementById('qi-ok').disabled};});
await page.evaluate(()=>document.getElementById('qi-ok').click());await wait(400);
out.set=await A().then(a=>({n:a.qsets.length,nom:a.qsets[0].nom,kind:a.qsets[0].kind,lignes:a.qsets[0].lignes.length}));
out.tab=await page.evaluate(()=>[...document.querySelectorAll('#eq-app .cm-qst tr')].slice(1).map(r=>[...r.cells].map(c=>c.textContent.trim()).join('|')));
console.log('1) import collé :',JSON.stringify(out));
C.c1=out.order.rep>=0&&out.order.rep<out.order.qs&&out.order.pt===-1&&out.order.bub&&out.order.flow&&/7 lignes lues/.test(out.modal.info)&&/1 refusée/.test(out.modal.info)&&/ligne 9 : type « Truc » inconnu/.test(out.modal.bad)&&out.modal.rows.includes('DN 200|20|240|120|30|6|2|·|·|·|·')&&out.modal.rows.includes('DN 80|10|120|60|13 ≈|·|·|2|·|2|·')&&out.modal.ok&&out.modal.nom==='Fournisseur A'
  &&out.set.n===1&&out.set.nom==='Fournisseur A'&&out.set.kind==='fournisseur'&&out.set.lignes===7&&out.tab[0]==='DN 200|20|240|120|30|6|2|0|0|0|0'&&out.tab[1]==='DN 80|10|120|60|13 ≈|0|0|2|0|2|0';
// ── 2) 2e étude par FICHIER (CSV de la trame) → comparatif ; « → Prendre » A puis B : quantités repérées remplies, « dont antennes » gardé
const TB=[H,'Barre;200;;;12;22;u;;;Tube DN200','Manchon;200;;;;34;u;;;Joint','Barre;80;;;6;84;ml;;;Tube DN80 au mètre','Manchon;80;;;;16;u;;;Joint'].map(l=>l.includes('\t')?l:l).join('\n').replace(/^Type de pièce\t.*$/m,H.split('\t').join(';'));
await click('qsimp|');await wait(200);await page.evaluate(()=>{document.getElementById('qi-nom').value='Fournisseur B';});await wait(100);
await page.setInputFiles('#iq-file',{name:'trame_B.csv',mimeType:'text/csv',buffer:Buffer.from(TB)});await wait(500);
await page.evaluate(()=>document.getElementById('qi-ok').click());await wait(400);
out={cmp:await page.evaluate(()=>({th:[...document.querySelectorAll('#eq-app .cm-qcmp tr:first-child th')].map(x=>x.textContent.trim()),rows:[...document.querySelectorAll('#eq-app .cm-qcmp tr')].slice(1).map(r=>[...r.cells].map(c=>c.textContent.trim()).join('|'))})),b:await A().then(a=>({n:a.qsets.length,f:a.qsets[1].fichier,l:a.qsets[1].lignes.map(x=>x.kind+x.dn+':'+x.qty+(x.ml?'/'+x.ml+'ml':''))}))};
await click('qssel|'+(await A()).qsets[0].id);await click('qstake|'+(await A()).qsets[0].id);await wait(300);
out.q1=await A().then(a=>a.quantites);await chg('#eq-app [data-afqr="0|nAnt"]','10');
await click('qssel|'+(await A()).qsets[1].id);await click('qstake|'+(await A()).qsets[1].id);await wait(300);out.q2=await A().then(a=>a.quantites);
out.off=await page.evaluate(()=>document.querySelectorAll('#eq-app .cm-qcmp td.cm-off').length);
console.log('2) 2e étude + prendre :',JSON.stringify(out));
C.c2=out.b.n===2&&out.b.f==='trame_B.csv'&&out.b.l.join()==='pipe200:22,sleeve200:34,pipe80:14/84ml,sleeve80:16'&&out.cmp.th.join()==='DN,★ Référence,Fournisseur A,Fournisseur B'&&out.cmp.rows[0]==='DN 200|—|30 / 120 ml|34 / 132 ml'&&out.cmp.rows[1]==='DN 80|—|13 / 60 ml|16 / 42 ml'
  &&out.q1.rows.map(r=>r.dn+':'+r.soud+'/'+r.ml).join()==='200:30/120,80:13/60'&&out.q1.src.nom==='Fournisseur A'&&out.q1.coudes===6&&out.q1.tes===2&&out.q1.vannes===2&&out.q1.ml===180
  &&out.q2.rows.map(r=>r.dn+':'+r.soud+'/'+r.ml+(r.nAnt!==undefined?'/'+r.nAnt:'')).join()==='200:34/132/10,80:16/42'&&out.q2.src.nom==='Fournisseur B'&&out.off>=2;
// ── 3) saisie à la main : une ligne, unité ml → barres, ＋ ligne (manchons) ; retrait d'une étude
await click('qsnew|');await wait(300);const sid=(await A()).qsets[2].id;
await chg(`#eq-app [data-afx="qsl§${sid}§0§dn"]`,'100');await chg(`#eq-app [data-afx="qsl§${sid}§0§unit"]`,'ml');await chg(`#eq-app [data-afx="qsl§${sid}§0§qty"]`,'60');
await click('qsladd|'+sid);await chg(`#eq-app [data-afx="qsl§${sid}§1§kind"]`,'sleeve');await chg(`#eq-app [data-afx="qsl§${sid}§1§dn"]`,'100');await chg(`#eq-app [data-afx="qsl§${sid}§1§qty"]`,'7');
await chg(`#eq-app [data-afx="qs§${sid}§nom"]`,'Saisie bureau');
out={s:await A().then(a=>{const s=a.qsets[2];return {nom:s.nom,kind:s.kind,l:s.lignes.map(x=>x.kind+x.dn+':'+x.qty+(x.ml?'/'+x.ml+'ml':'')+x.unit)};}),tab:await page.evaluate(()=>[...document.querySelectorAll('#eq-app .cm-qst tr')].slice(1,2).map(r=>[...r.cells].map(c=>c.textContent.trim()).join('|'))[0])};
await click('qssel|'+(await A()).qsets[0].id);await click('qsrm|'+(await A()).qsets[0].id);await wait(300);out.after=await A().then(a=>a.qsets.map(s=>s.nom));
console.log('3) saisie + retrait :',JSON.stringify(out));
C.c3=out.s.nom==='Saisie bureau'&&out.s.kind==='saisie'&&out.s.l.join()==='pipe100:5/60mlml,sleeve100:7u'&&out.tab==='DN 100|5|60|30|7|0|0|0|0|0|0'&&out.after.join()==='Fournisseur B,Saisie bureau';
// ── 4) LECTURE AUTOMATIQUE d'un devis PDF au format INPAL (FICTIF) : sections DN, kit de jonction + manchette, kit réduit (réduction dans le manchon),
//      kit fin de ligne, une pièce inconnue à classer, transport ignoré, option (cales) non comptée sauf choix ; synthèse avec RÉDUCTIONS et KITS FIN DE LIGNE
const P4=makePdf([pdfLines([[[38,'Code Art.'],[199,'DESIGNATION'],[400,'QUANTITE'],[442,'UNITAIRE'],[521,'TOTAL']],[[176,'POLYURETUB 130'],[402,'1']],[[90,'DN80 - Ø88,9x180 Isolation+'],[397,'120'],[416,'m']],
  [[30,'91000001'],[90,'TUBE ACIER 88,9x180 - 12m - DF Nord.'],[397,'96'],[416,'m'],[470,'10,00'],[530,'960,00']],[[30,'91000002'],[90,'COUDE ACIER 5D 88,9x180 - 90° DH Nord.'],[397,'6'],[416,'P.']],
  [[30,'91000006'],[90,'I3 : KIT DE JONCTION (Produits) 88,9 x 180'],[397,'14'],[416,'P.']],[[30,'91000007'],[90,'I2/ I3: MANCHETTE PEHD THERMO ø 180'],[397,'14'],[416,'P.']],
  [[30,'91000008'],[90,'I6 : KIT REDUIT (Produits) 88,9x180 / 60,3x140'],[397,'2'],[416,'P.']],[[30,'91000009'],[90,'I6 : MANCHETTE REDUIT THERMO ø 180x140'],[397,'2'],[416,'P.']],
  [[30,'91000010'],[90,'I5 : KIT FIN DE LIGNE (Produits) 88,9 x 180'],[397,'2'],[416,'P.']],[[30,'91000020'],[90,'PIECE SPECIALE X12'],[397,'1'],[416,'P.']],
  [[90,'LIVRAISON SUR CHANTIER HORS TAXES (HT) - NON DECHARGE :'],[397,'1'],[416,'Cam.']],[[90,'OPTION - CALES et Grillage'],[442,'UNITAIRE']],[[30,'91000018'],[90,'CALE DE MOUSSE PU 100X100X1000 JAUNE'],[397,'9'],[416,'P.']]])]);
await page.evaluate(()=>history.replaceState(null,'',location.href+(location.search?'&':'?')+'pdfjs=/pdfjs/')); // moteur PDF servi localement (CDN bloqué dans le conteneur)
await click('qsimp|');await wait(200);await page.setInputFiles('#iq-file',{name:'devis_inpal.pdf',mimeType:'application/pdf',buffer:P4});await wait(2500);
const syn=()=>page.evaluate(()=>{const M=document.getElementById('modal');const T=M.querySelector('table.iq-syn');const H=T?[...T.rows[0].cells].map(c=>c.textContent.trim()):[];return {nom:document.getElementById('qi-nom').value,info:(M.querySelector('.iq-info')||{}).textContent||'',H,rows:T?[...T.rows].slice(1).map(r=>[...r.cells].map(c=>c.textContent.trim()).join('|')):[],unk:M.querySelectorAll('[data-iquk]').length,opt:(M.querySelector('details.iq-opt summary')||{}).textContent||'',ign:(M.querySelector('details.iq-ign')||{}).textContent||'',ok:document.getElementById('qi-ok').textContent};});
out={a:await syn()};
await page.evaluate(()=>{const s=document.querySelector('#modal [data-iqud="0"]');s.value='80';const k=document.querySelector('#modal [data-iquk="0"]');k.value='valve';k.dispatchEvent(new Event('change'));});await wait(250);out.b=await syn();
await page.evaluate(()=>{const c=document.querySelector('#modal [data-iqopt]');c.checked=true;c.dispatchEvent(new Event('change'));});await wait(250);out.c=await syn();
await page.evaluate(()=>document.getElementById('qi-ok').click());await wait(400);out.set=await A().then(a=>{const s=a.qsets[a.qsets.length-1];return {nom:s.nom,n:s.lignes.length,red:s.lignes.filter(l=>l.kind==='reducer'&&l.joint).length,kit:s.lignes.filter(l=>l.kind==='kit').length,fichier:s.fichier};});
out.card=await page.evaluate(()=>[...document.querySelectorAll('#eq-app .cm-qst tr')].slice(1,2).map(r=>[...r.cells].map(c=>c.textContent.trim()).join('|'))[0]);
console.log('4) devis PDF lu automatiquement :',JSON.stringify(out));
const r80=x=>x.rows.find(r=>r.startsWith('DN 80|'))||'';const col=(x,h)=>x.H.indexOf(h);
C.c4=/Lecture automatique/.test(out.a.info)&&/INPAL/.test(out.a.info)&&out.a.nom==='INPAL — devis_inpal'&&col(out.a,'Réductions')>0&&col(out.a,'Kits fin de ligne')>0
  &&r80(out.a).split('|')[col(out.a,'Barres')]==='8'&&r80(out.a).split('|')[col(out.a,'Soudures')]==='16'&&r80(out.a).split('|')[col(out.a,'Réductions')]==='2'&&r80(out.a).split('|')[col(out.a,'Kits fin de ligne')]==='2'
  &&out.a.rows.some(r=>/^DN 50\|.*\|2 ≈\|/.test(r))&&out.a.unk===1&&/1 ligne en OPTION/.test(out.a.opt)&&/non comptée/.test(out.a.opt)&&/transport/.test(out.a.ign)
  &&out.b.unk===0&&r80(out.b).split('|')[col(out.b,'Vannes')]==='1'&&/\(8 lignes\)/.test(out.b.ok)&&/\(9 lignes\)/.test(out.c.ok)&&/comptées/.test(out.c.opt)
  &&out.set.nom==='INPAL — devis_inpal'&&out.set.n===9&&out.set.red===1&&out.set.kit===1&&out.set.fichier==='devis_inpal.pdf'&&/^DN 80\|8\|96\|48\|16\|6\|0\|0\|2\|1\|2$/.test(out.card||'');
// ── 5) classeur du fournisseur (format AXIOM FICTIF : une feuille par DN, colonne TOTAL) + une trame remplie à moitié par Claude (1 type vide) :
//      la lecture automatique passe devant (la trame a des lignes refusées) ; la trame reste proposée (↔) et l'échange marche dans les deux sens
const X5=await makeXlsx([{name:'DN200',rows:[[],['','PIECE/TRONCON','T1','T2','TOTAL'],['','LONGUEUR TRANCHEE',100,50,150],['','R-200/355-12',9,4,13],['','K-200-355/75',2,'',2],['','NT-200/355',20,10,30],['','NK-200/355',2,'',2],['','Z-200-355/150-280',2,'',2]]},
  {name:'Feuil1',rows:[TRAME_COLS.slice(),['Barre',200,'','',12,13,'u','','R-200/355-12',''],['Coude',200,'','','',2,'u','','K-200-355/75',''],['Manchon',200,'','','',30,'u','','NT-200/355',''],['',200,'','','',2,'u','','NK-200/355','']]}]);
await click('qsimp|');await wait(200);await page.setInputFiles('#iq-file',{name:'axiom.xlsx',mimeType:'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',buffer:Buffer.from(X5)});await wait(900);
const s5=()=>page.evaluate(()=>{const M=document.getElementById('modal');return {info:(M.querySelector('.iq-info')||{}).textContent||'',alt:(M.querySelector('.iq-alt')||{}).textContent||'',ctl:(M.querySelector('.iq-ctl')||{}).textContent||'',bad:M.querySelectorAll('details.iq-bad').length,ok:document.getElementById('qi-ok').textContent};});
out={a:await s5()};await page.evaluate(()=>document.querySelector('#modal [data-iqalt]').click());await wait(250);out.b=await s5();
await page.evaluate(()=>document.querySelector('#modal [data-iqalt]').click());await wait(250);out.c=await s5();await page.evaluate(()=>document.querySelector('#modal [data-close]').click());await wait(150);
console.log('5) classeur + trame à moitié :',JSON.stringify(out));
C.c5=/Lecture automatique/.test(out.a.info)&&/AXIOM/.test(out.a.info)&&/trame SCR remplie/.test(out.a.alt)&&/1 refusée/.test(out.a.alt)&&/\(5 lignes\)/.test(out.a.ok)&&/tranchée du fournisseur : DN200 150 m \(lu 78\)/.test(out.a.ctl)
  &&/Trame SCR/.test(out.b.info)&&out.b.bad===1&&/\(3 lignes\)/.test(out.b.ok)&&/Lecture automatique du tableau/.test(out.b.alt)&&/Lecture automatique/.test(out.c.info)&&/\(5 lignes\)/.test(out.c.ok);
const bad=Object.entries(C).filter(([k,v])=>!v).map(([k])=>k);console.log(bad.length?'RESULTAT: ECHEC '+bad.join(','):'RESULTAT: TOUT VERT');console.log(logs.length?logs:'[]');
await browser.close();
