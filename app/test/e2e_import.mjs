// ÉCRAN D'IMPORT COMMUN (13/10/2026 soir) : étude fournisseur (Commerce), commande (Fourniture), livraison / BL (Stock) — même écran, même lecture.
// Ethan : « il faudrait la même interface pour les imports de commande et de BL dans les onglets Stock et Fourniture » ; « je pose n'importe quel quantitatif
// sans l'étape manuelle et ça importe toutes les pièces » ; « je ne vois pas réduction et kit fin de ligne ». Fichiers FICTIFS au format des fournisseurs :
//  1) Fourniture → commande : classeur « LOGSTOR » (familles, EWJoint + bande + pochette, jonction réduite avec réduction acier) lu tout seul → synthèse avec
//     Réductions et Kits fin de ligne, lignes modifiables (une pièce corrigée à la main), enregistrée → libellés de la commande ;
//  2) Stock → nouvelle livraison : devis PDF « INPAL » (pas un BL connu) lu par la lecture automatique → lots de la livraison ;
//  3) les trois fenêtres ont la même structure (onglets, info, synthèse, lignes) ; téléphone : pas de défilement horizontal de la page.
import { chromium } from 'playwright';
import fs from 'fs';
import {makePdf,pdfLines} from './mkpdf.mjs';
import {makeXlsx} from '../src/xlsx.js';
const BASE=process.env.BASE||'http://localhost:8765';
const browser=await chromium.launch({headless:true, executablePath: process.env.CHROMIUM_PATH||undefined});
const ctx=await browser.newContext({viewport:{width:900,height:940},acceptDownloads:true});const page=await ctx.newPage();
const logs=[];page.on('pageerror',e=>logs.push('PAGEERROR: '+e.message.slice(0,300)));page.on('console',m=>{if(m.type()==='error'&&!/supabase|Failed to fetch|net::ERR|404|pdf\.worker|cdnjs/i.test(m.text()))logs.push(m.text().slice(0,200));});
page.on('dialog',d=>d.accept().catch(()=>{}));
const C={};const wait=ms=>page.waitForTimeout(ms);
await page.clock.install({time:new Date(2026,9,13,8,30,0)});
await page.goto(BASE+'/traceur.html');await wait(600);await page.evaluate(()=>{localStorage.clear();});await page.reload();await wait(600);
await page.evaluate(()=>{const S=window.MAQ.state;S.supplier='LOGSTOR';S.lines=[{id:'L1',name:'Feeder',dn:100,bar:12,pts:[[0,50],[120,50]],specials:[],parent:null}];S.seq=2;window.MAQ.setMode('select');window.MAQ.rebuild();});
await page.click('#bSave');await wait(200);await page.fill('#svName','Import test');await page.click('#svOk');await wait(800);
await page.click('#svGo');await wait(1500);await page.selectOption('#roleSel','ethan');await wait(300);
await page.evaluate(()=>history.replaceState(null,'',location.href+(location.search?'&':'?')+'pdfjs=/pdfjs/'));
const shape=()=>page.evaluate(()=>{const M=document.getElementById('modal');const T=M.querySelector('table.iq-syn');return {seg:[...M.querySelectorAll('.iq-seg [data-iqm]')].map(x=>x.dataset.iqm),info:(M.querySelector('.iq-info')||{}).textContent||'',H:T?[...T.rows[0].cells].map(c=>c.textContent.trim()):[],
  syn:T?[...T.rows].slice(1).map(r=>[...r.cells].map(c=>c.textContent.trim()).join('|')):[],lines:[...M.querySelectorAll('table.iq-tab tr')].slice(1).map(tr=>({t:tr.cells[0].textContent.replace(/\s+/g,' ').trim().slice(0,90),k:(tr.querySelector('[data-iqk]')||{}).value,dn:(tr.querySelector('[data-iqd]')||{}).value,q:(tr.querySelector('[data-iqq]')||{}).value})),ign:(M.querySelector('details.iq-ign summary')||{}).textContent||''};});
// ── 1) Fourniture → Importer une commande → fichier Excel « LOGSTOR » (FICTIF) lu tout seul
const L2=(pos,des,code,alarm,qty,unit)=>{const r=Array(24).fill('');r[0]=pos;r[2]=des;r[9]=code;r[16]=alarm;r[18]=qty;r[19]=unit;r[21]='9.99';r[23]='99.9';return r;};const cat=t=>{const r=Array(24).fill('');r[2]=t;return r;};
const X1=await makeXlsx([{name:'Table 1',rows:[['Offre','','','','','','','','','','','','','EUR'],['Ligne','','Description','','','','','','','N° d\'article / N° de plan','','','','','','','Alarme','','Qté','Pièce','','Prix unitaire','','Prix total EUR'],
  cat('Tube'),L2(20,'114 / 225 mm 12 m','90000114112651','NOR',10,'TUB'),cat('Coude'),L2(70,'114 / 225 mm 50 DEG 1.000 x 1.000 mm Horizontal','2500E','NOR',2,'PCS'),L2(80,'114 / 225 mm 90 DEG 1.000 x 1.000 mm Horizontal','95000114010651','NOR',4,'PCS'),
  cat('Réduction'),L2(520,'114 / 225 x 88 / 180 mm 1.000 mm','99010114002651','NOR',1,'PCS'),cat('Manchon EW - Complèt: Prix total par EUR 65,11 (Po'),L2(570,'EWJoint D225 L=700','90270225070000','',20,'PCS'),L2(580,'Bande à souder p. Manchon EW 225','95560225000000','',20,'PCS'),L2(590,'Pochette de mousse n° 9','9000000108109','',20,'PCS'),
  cat('Manchon EW - Complèt: Prix total par EUR 228,42 (P'),L2(1420,'EWJoint, réd. à souder D225/140 L=800','90280225140000','',2,'PCS'),L2(1450,'114,3×60,3 Reduktion St. 35.8I','90060114010060','',2,'PCS'),
  cat('Embouts'),L2(1500,'Kit fin de ligne 114 / 225','90000114000001','',2,'PCS'),cat('Montage'),L2(1760,'Transport aller retour','90799999999941','',1,'PCS')]}]);
await page.evaluate(async()=>{const w=ms=>new Promise(r=>setTimeout(r,ms));document.querySelector('#facets [data-facet=tech]').click();await w(200);document.querySelector('#tabbar [data-tab="fourniture"]').click();await w(300);document.querySelector('#fourniture [data-fa=cmd][data-v=""]').click();await w(250);});
await page.setInputFiles('#iq-file',{name:'devis_logstor.xlsx',mimeType:'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',buffer:Buffer.from(X1)});await wait(1200);
let out={a:await shape()};
// une ligne corrigée à la main : la bande à souder (accessoire) passée en « Manchon » puis remise en « Accessoire » ; une quantité modifiée (barres 10 → 11)
await page.evaluate(()=>{const tr=[...document.querySelectorAll('#modal table.iq-tab tr')].find(t=>/Bande à souder/.test(t.textContent));const s=tr.querySelector('[data-iqk]');s.value='sleeve';s.dispatchEvent(new Event('change'));});await wait(250);out.b=await shape();
await page.evaluate(()=>{const tr=[...document.querySelectorAll('#modal table.iq-tab tr')].find(t=>/Bande à souder/.test(t.textContent));const s=tr.querySelector('[data-iqk]');s.value='acc';s.dispatchEvent(new Event('change'));});await wait(250);
await page.evaluate(()=>{const tr=[...document.querySelectorAll('#modal table.iq-tab tr')].find(t=>/114 \/ 225 mm 12 m/.test(t.textContent));const i=tr.querySelector('[data-iqq]');i.value='11';i.dispatchEvent(new Event('change'));});await wait(250);out.c=await shape();
await page.evaluate(async()=>{document.getElementById('fc-ref').value='CDE-1';document.getElementById('fc-ok').click();await new Promise(r=>setTimeout(r,300));});
out.cmd=await page.evaluate(()=>{const c=window.TRACE.net.fourniture.cmds[0];return c&&{name:c.name,ref:c.ref,file:c.file,lines:c.lines.map(l=>l.label+'×'+l.qty)};});
console.log('1) commande (Excel LOGSTOR lu tout seul) :',JSON.stringify(out));
const col=(x,h)=>x.H.indexOf(h);const row=(x,dn)=>(x.syn.find(r=>r.startsWith('DN '+dn+'|'))||'').split('|');
C.c1=out.a.seg.join()==='file,paste,add'&&/Lecture automatique/.test(out.a.info)&&/LOGSTOR/.test(out.a.info)&&/ignorée/.test(out.a.info)&&col(out.a,'Réductions')>0&&col(out.a,'Kits fin de ligne')>0
  &&row(out.a,100)[col(out.a,'Barres')]==='10'&&row(out.a,100)[col(out.a,'Soudures')]==='22'&&row(out.a,100)[col(out.a,'Coudes')]==='6'&&row(out.a,100)[col(out.a,'Réductions')]==='3'&&row(out.a,100)[col(out.a,'Kits fin de ligne')]==='2'
  &&row(out.a,50)[col(out.a,'Soudures')]==='2 ≈'&&out.a.lines.length===10&&out.a.lines.some(l=>/Pochette/.test(l.t)&&l.k==='pu'&&l.dn==='100')&&out.a.lines.some(l=>/50 DEG/.test(l.t)&&l.k==='bend')&&out.a.lines.some(l=>/Bande/.test(l.t)&&l.k==='acc')&&/transport/i.test(out.a.ign+out.a.info)
  &&row(out.b,100)[col(out.b,'Soudures')]==='42'&&/corrigée à la main/.test(out.b.lines.find(l=>/Bande/.test(l.t)).t)&&row(out.c,100)[col(out.c,'Soudures')]==='22'&&row(out.c,100)[col(out.c,'Barres')]==='11'
  &&out.cmd&&out.cmd.ref==='CDE-1'&&out.cmd.file==='devis_logstor.xlsx'&&out.cmd.lines.includes('Barre DN100×11')&&out.cmd.lines.includes('Coude 50° DN100×2')&&out.cmd.lines.includes('Kit fin de ligne DN100×2')&&out.cmd.lines.some(l=>/^Réduction .*100.*80.*×1$/.test(l))&&out.cmd.lines.length===10;
// ── 2) Stock → Nouvelle livraison → un devis PDF « INPAL » (FICTIF, pas un BL connu) : lecture automatique → lots de la livraison
const P2=makePdf([pdfLines([[[38,'Code Art.'],[199,'DESIGNATION'],[400,'QUANTITE'],[442,'UNITAIRE'],[521,'TOTAL']],[[176,'POLYURETUB 130'],[402,'1']],[[90,'DN100 - Ø114,3x225 Isolation+'],[397,'48'],[416,'m']],
  [[30,'91000001'],[90,'TUBE ACIER 114,3x225 - 12m - DF Nord.'],[397,'48'],[416,'m']],[[30,'91000002'],[90,'COUDE ACIER 5D 114,3x225 - 90° DH Nord.'],[397,'2'],[416,'P.']],
  [[30,'91000006'],[90,'I3 : KIT DE JONCTION (Produits) 114,3 x 225'],[397,'6'],[416,'P.']],[[30,'91000007'],[90,'I2/ I3: MANCHETTE PEHD THERMO ø 225'],[397,'6'],[416,'P.']],
  [[30,'91000010'],[90,'I5 : KIT FIN DE LIGNE (Produits) 114,3 x 225'],[397,'1'],[416,'P.']],[[90,'LIVRAISON SUR CHANTIER HORS TAXES (HT) - NON DECHARGE :'],[397,'1'],[416,'Cam.']]])]);
await page.evaluate(async()=>{const w=ms=>new Promise(r=>setTimeout(r,ms));document.querySelector('#tabbar [data-tab=stock]').click();await w(300);document.getElementById('stk-new').click();await w(250);});
await page.setInputFiles('#iq-file',{name:'devis_inpal.pdf',mimeType:'application/pdf',buffer:P2});await wait(2500);
out={a:await shape()};
await page.evaluate(async()=>{const w=ms=>new Promise(r=>setTimeout(r,ms));const T=window.TRACE;const st=T.net.stock;st.zones=st.zones&&st.zones.length?st.zones:[];document.getElementById('stk-prev').checked=true;document.getElementById('stk-ok').click();await w(400);});
await page.mouse.click(400,400);await wait(400);await page.evaluate(()=>{const b=document.getElementById('stkDone');if(b)b.click();});await wait(300);
out.liv=await page.evaluate(()=>{const st=window.TRACE.net.stock;const v=st.livs[st.livs.length-1];return v&&{status:v.status,lots:st.lots.filter(l=>l.liv===v.id).map(l=>l.label+'×'+l.qty+(l.pend?' att.':''))};});
console.log('2) livraison (PDF INPAL lu tout seul) :',JSON.stringify(out));
C.c2=out.a.seg.join()==='file,paste,cat,nom'&&/Lecture automatique/.test(out.a.info)&&/INPAL/.test(out.a.info)&&row(out.a,100)[col(out.a,'Barres')]==='4'&&row(out.a,100)[col(out.a,'Soudures')]==='6'&&row(out.a,100)[col(out.a,'Kits fin de ligne')]==='1'
  &&out.a.lines.length===5&&out.a.lines.some(l=>/→ Barre 12 m DN100/.test(l.t))&&out.liv&&out.liv.status==='prevu'&&out.liv.lots.includes('Barre 12 m DN100×4 att.')&&out.liv.lots.includes('Kit fin de ligne DN100×1 att.')&&out.liv.lots.some(l=>/^Manchon DN100 · Ø225×6 att\.$/.test(l));
// ── 3) téléphone : la fenêtre d'import (commande) tient dans l'écran — pas de défilement horizontal de la page ; la synthèse défile dans son cadre
await page.setViewportSize({width:390,height:844});await wait(300);
await page.evaluate(async()=>{const w=ms=>new Promise(r=>setTimeout(r,ms));window.TRACE.state.tab='fourniture';window.TRACE.renderAll();await w(250);document.querySelector('#fourniture [data-fa=cmd][data-v=""]').click();await w(250);});
await page.setInputFiles('#iq-file',{name:'devis_logstor.xlsx',mimeType:'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',buffer:Buffer.from(X1)});await wait(1200);
out=await page.evaluate(()=>{const M=document.querySelector('#modal .box');const T=document.querySelector('#modal table.iq-syn');return {page:document.documentElement.scrollWidth<=window.innerWidth+1,box:Math.round(M.getBoundingClientRect().width),tbl:T?(T.parentElement.scrollWidth>T.parentElement.clientWidth||T.scrollWidth>T.clientWidth):null}; /* 14/10 nuit : au téléphone le tableau défile lui-même (passe téléphone : table.rc en bloc défilant) ou dans son parent */});
console.log('3) téléphone :',JSON.stringify(out));
C.c3=out.page&&out.box<=390&&out.tbl===true;
const bad=Object.entries(C).filter(([k,v])=>!v).map(([k])=>k);console.log(bad.length?'RESULTAT: ECHEC '+bad.join(','):'RESULTAT: TOUT VERT');console.log(logs.length?logs:'[]');
await browser.close();
