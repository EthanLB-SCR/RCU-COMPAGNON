// POINTS TECHNIQUES v2 (13/10/2026, retours d'Ethan) : dates → jours OUVRÉS (lun–ven, férié signalé) → location base vie dans le chiffrage (calculé, ✓ validé,
// saisi — le calcul reste affiché) ; 9 typologies SST sans la base + « autre » au prix saisi ; CND : taux feeder / antennes, répartition des soudures,
// soudures par vacation, vacations de raccordement → nombre de vacations et moteur ; essai hydraulique : cubature du chantier, tronçon « avec le reste »,
// répartition en N tronçons, prestations reliées à chaque tronçon (moteur par zone) ; boulet (tronçon coché + ligne libre) ; aérien : type de support
// et nombre, calo ; fonçage : colliers et schéma ; ancienne saisie (radio %, rangées d'essai, rinçage global) reprise sans perte.
import { chromium } from 'playwright';
import path from 'path';import {fileURLToPath} from 'url';
const HERE=path.dirname(fileURLToPath(import.meta.url));
const BASE=process.env.BASE||'http://localhost:8765';
const browser=await chromium.launch({headless:true, executablePath: process.env.CHROMIUM_PATH||undefined});
const ctx=await browser.newContext({viewport:{width:1280,height:900}});const page=await ctx.newPage();
const logs=[];page.on('pageerror',e=>logs.push('PAGEERROR: '+e.message.slice(0,300)));page.on('console',m=>{if(m.type()==='error'&&!/supabase|Failed to fetch|net::ERR|404|WebSocket|pdf\.worker|cdnjs/i.test(m.text()))logs.push(m.text().slice(0,200));});
page.on('dialog',d=>d.accept().catch(()=>{}));
const C={};const wait=ms=>page.waitForTimeout(ms);
await page.goto(BASE+'/index.html?pdfjs=/pdfjs/');await wait(600);await page.evaluate(()=>{localStorage.clear();localStorage.setItem('trace:wide','1');});await page.evaluate(()=>new Promise(r=>{try{const q=indexedDB.deleteDatabase('trace-kv');q.onsuccess=q.onerror=q.onblocked=()=>r();}catch(e){r();}}));
await page.reload();await wait(1200);
{const s=await page.$('#loginSkip');if(s&&await s.isVisible())await s.click();await wait(700);}
const chg=async(sel,val)=>{await page.evaluate(([s,v])=>{const el=document.querySelector(s);if(!el)throw new Error('absent '+s);if(el.type==='checkbox'){el.checked=!!v;}else el.value=v;el.dispatchEvent(new Event('change',{bubbles:true}));},[sel,val]);await wait(120);};
const click=async v=>{await page.evaluate(v=>{const el=document.querySelector(`#eq-app [data-act=af][data-v="${v}"]`);if(!el)throw new Error('bouton absent '+v);el.click();},v);await wait(250);};
const A=()=>page.evaluate(()=>window.TRACE.affaires.get('O2610-13'));
const T=()=>page.evaluate(()=>document.getElementById('eq-app').textContent.replace(/\s+/g,' '));
await page.evaluate(async()=>{const T=window.TRACE;T.state.userId='ethan';T.renderHome();document.getElementById('htCom').click();await new Promise(x=>setTimeout(x,250));
  document.querySelector('#eq-app [data-act=af][data-v="new|"]').click();await new Promise(x=>setTimeout(x,150));document.getElementById('afn-num').value='O2610-13';document.getElementById('afn-nom').value='Points v2';document.getElementById('afn-client').value='CORIANCE';document.getElementById('afn-etat').value='devis';
  document.querySelector('#eq-app [data-act=af][data-v="create|"]').click();await new Promise(x=>setTimeout(x,250));document.querySelector('#eq-app [data-act=af][data-v="tab|lecture"]').click();await new Promise(x=>setTimeout(x,300));});
// ── 1) sans base de prix : 9 typologies SST + autre ; dates → jours ouvrés, férié, base vie
await chg('#eq-app [data-afx="pt§sst.on"]',true);await click('ptadd|sst.rows');
let out={opts:await page.evaluate(()=>[...document.querySelectorAll('#eq-app [data-afx="pt§sst.rows.0.type"] option')].map(o=>o.textContent))};
await chg('#eq-app [data-afx="pt§d0"]','2026-11-02');await chg('#eq-app [data-afx="pt§d1"]','2026-11-13');await chg('#eq-app [data-afx="pt§wc"]',true);await chg('#eq-app [data-afx="pt§benne"]',true);
out.jours=await page.evaluate(()=>(document.querySelector('#eq-app .cm-jours')||{}).textContent||'');
console.log('1) SST / jours :',JSON.stringify(out));
C.c1=out.opts.length===10&&['Vannes BS PN25','Vannes BS PN40','Vannes BS brides PN25','Vannes BS brides PN40','Vannes PAP PN16','Vannes PAP PN25','Vannes PAP PN40','By-pass seul','Fonds bombés'].every(x=>out.opts.includes(x))&&out.opts.some(x=>/^Autre/.test(x))&&/10 jours ouvrés/.test(out.jours)&&/11 j calendaires/.test(out.jours)&&/11\/11/.test(out.jours)&&/location base vie : 10 j pour WC, benne/.test(out.jours);
// ── classeur (jeu d'essai) pour les prix
await page.evaluate(()=>document.querySelector('#eq-app [data-act=af][data-v="tab|chiffrage"]').click());await wait(300);
await page.setInputFiles('#eq-app input[data-afprix]',path.join(HERE,'fixture_prix.xlsx'));await wait(1500);
await page.evaluate(()=>document.querySelector('#eq-app [data-act=af][data-v="tab|lecture"]').click());await wait(400);
// ── 2) quantités + CND : DN 200 (300 soudures, 400 ml de tranchée) feeder, DN 100 (200 soudures, 300 ml) en antennes ; radio feeder 10 % / antennes 20 %, 9 soud./vac., 2 vacations de raccordement
await click('qadd|');await chg('#eq-app [data-afqr="0|dn"]','200');await chg('#eq-app [data-afqr="0|soud"]','300');await chg('#eq-app [data-afqr="0|ml"]','400');
await click('qadd|');await chg('#eq-app [data-afqr="1|dn"]','100');await chg('#eq-app [data-afqr="1|soud"]','200');await chg('#eq-app [data-afqr="1|ml"]','300');
await chg('#eq-app .cm-split [data-afqr="1|nAnt"]','200');
await chg('#eq-app [data-afx="pt§radio.on"]',true);await chg('#eq-app [data-afx="pt§radio.fdPct"]','10');await chg('#eq-app [data-afx="pt§radio.antPct"]','20');await chg('#eq-app [data-afx="pt§radio.raccVac"]','2');await chg('#eq-app [data-afx="pt§km"]','120');
out={split:await page.evaluate(()=>[...document.querySelectorAll('#eq-app .cm-split tr.tot td')].map(t=>t.textContent.trim())),cnd:await page.evaluate(()=>{const b=[...document.querySelectorAll('#eq-app .ch-cnd')].find(x=>/Radio/.test(x.textContent));return b?b.textContent.replace(/\s+/g,' '):'';}),labels:await page.evaluate(()=>[...document.querySelectorAll('#eq-app .cm-cndg label')].slice(0,3).map(l=>l.textContent))};
console.log('2) CND :',JSON.stringify(out));
C.c2=out.split.join('|')==='Total|500|200|300'&&/Feeder 300 × 10 % = 30 soudures → 4 vac\./.test(out.cnd)&&/antennes 200 × 20 % = 40 → 5 vac\./.test(out.cnd)&&/raccordements 2 vac\. → 11 vacations/.test(out.cnd)&&/soudures \/ vacation/.test(out.labels.join())&&/vacations déclenchées/.test(out.labels.join());
// ── 3) essai hydraulique : cubature du chantier ; tronçon avec le reste ; retiré ; reste réparti en 2 ; prestations par tronçon ; boulet
await chg('#eq-app [data-afx="pt§hydro.on"]',true);
out={hb0:await page.evaluate(()=>(document.querySelector('#eq-app .cm-hb')||{}).textContent||'')};
await click('pthyrest|');out.one=await A().then(a=>a.points.hydro.troncons.map(t=>t.rows));out.hb1=await page.evaluate(()=>(document.querySelector('#eq-app .cm-hb')||{}).textContent||'');
await click('ptrm|hydro.troncons|0');await chg('#eq-app [data-afx="pt§hydro.nRep"]','2');await click('pthysplit|');
out.two=await A().then(a=>a.points.hydro.troncons.map(t=>({nom:t.nom,rows:t.rows,ep:t.epreuve})));
await chg('#eq-app [data-afx="pt§hydro.troncons.0.rincage"]',true);await chg('#eq-app [data-afx="pt§hydro.troncons.0.boulet"]',true);await chg('#eq-app [data-afx="pt§hydro.troncons.1.passivation"]',true);await chg('#eq-app [data-afx="pt§hydro.troncons.1.eau"]',true);
await chg('#eq-app [data-afx="pt§boulet.on"]',true);await click('ptadd|boulet.rows');await chg('#eq-app [data-afx="pt§boulet.rows.0.dn"]','150');await chg('#eq-app [data-afx="pt§boulet.rows.0.ml"]','120');
out.trv=await page.evaluate(()=>[...document.querySelectorAll('#eq-app .cm-tr-h b')].map(b=>b.textContent));out.btr=await page.evaluate(()=>{const s=[...document.querySelectorAll('#eq-app .cm-pt')].find(x=>x.dataset.pt==='boulet');return s?s.textContent.replace(/\s+/g,' '):'';});
console.log('3) hydraulique :',JSON.stringify(out));
const vol=(d,ml)=>Math.PI*Math.pow(d/2,2)*ml;
C.c3=/DN 100 600 ml de tube · DN 200 800 ml de tube|DN 200 800 ml de tube · DN 100 600 ml de tube/.test(out.hb0)&&/reste à couvrir/.test(out.hb0)&&out.one.length===1&&out.one[0].length===2&&/tout est couvert/.test(out.hb1)&&out.two.length===2&&out.two.every(t=>t.ep===true&&t.rows.length===2)&&out.two[0].rows.some(r=>r.dn===200&&r.ml===400)&&out.two[1].rows.some(r=>r.dn===100&&r.ml===300)&&out.trv.length===2&&out.trv[0]===out.trv[1]&&/Tronçon 1 \(DN 200 400 ml, DN 100 300 ml\)|Tronçon 1 \(DN 100 300 ml, DN 200 400 ml\)/.test(out.btr);
// ── 4) aérien (supports Mural + calo Isoxal, nombre de supports) ; fonçage (colliers + schéma) ; SST autre
await chg('#eq-app [data-afx="pt§aerien.on"]',true);await chg('#eq-app [data-afx="pt§aerien.support"]',true);await chg('#eq-app [data-afx="pt§aerien.calo"]',true);await click('ptadd|aerien.rows');await chg('#eq-app [data-afx="pt§aerien.rows.0.ml"]','30');await chg('#eq-app [data-afx="pt§aerien.rows.0.support"]','Mural');await chg('#eq-app [data-afx="pt§aerien.rows.0.calo"]','Isoxal');
await chg('#eq-app [data-afx="pt§foncage.on"]',true);await click('ptadd|foncage.rows');await chg('#eq-app [data-afx="pt§foncage.rows.0.ml"]','30');await chg('#eq-app [data-afx="pt§foncage.rows.0.jours"]','2');
await chg('#eq-app [data-afx="pt§sst.rows.0.type"]','autre');await chg('#eq-app [data-afx="pt§sst.rows.0.dn"]','80');await chg('#eq-app [data-afx="pt§sst.rows.0.qty"]','2');await chg('#eq-app [data-afx="pt§sst.rows.0.des"]','Vanne motorisée PN25');await chg('#eq-app [data-afx="pt§sst.rows.0.pu"]','1500');
out={ae:await page.evaluate(()=>{const s=[...document.querySelectorAll('#eq-app .cm-pt')].find(x=>x.dataset.pt==='aerien');return {th:[...s.querySelectorAll('th')].map(t=>t.textContent),sup:(s.querySelector('td.num')||{}).textContent||''};}),fc:await page.evaluate(()=>{const f=document.querySelector('#eq-app .cm-fc');return f?{t:f.textContent.replace(/\s+/g,' '),svg:f.querySelectorAll('svg rect').length}:null;})};
console.log('4) aérien / fonçage :',JSON.stringify(out));
C.c4=out.ae.th.includes('Type de support')&&out.ae.th.includes('Calorifuge')&&out.ae.th.includes('Supports')&&/^10/.test(out.ae.sup)&&out.fc&&/44 colliers/.test(out.fc.t)&&/\(⌈30 ÷ 1,5 m⌉ \+ 2\) × 2 tubes/.test(out.fc.t)&&out.fc.svg>40;
// ── 5) → préremplir le chiffrage : étude complète (location calculée, CND, zones et prestations, boulet, aérien, fonçage, SST autre) ; location ✓ validée et saisie
await click('ptprefill|');await wait(400);
out=await page.evaluate(()=>{const T=window.TRACE;const a=T.affaires.get('O2610-13');const E=a.chiffrage.etudes;const z=E.find(x=>x.fromPoints);const C=T.affaires.calc(a);const r=C.etudes[E.indexOf(z)].r;const d=r.detail;
  return {jours:d.conteneur.jours,nbJ:d.conteneur.nbJ,cal:d.conteneur.cal,feries:d.conteneur.feries,radio:{fd:d.Radio.fd.vac,ant:d.Radio.ant.vac,racc:d.Radio.racc.vac,fdN:d.Radio.fd.n,antN:d.Radio.ant.n},zones:z.hydro.zones.map(x=>({nom:x.nom,pr:x.pr,rows:x.rows.length})),on:d.hydro.on,rinc:Math.round(r.postes.rincage.achat),pass:Math.round(r.postes.passivation.achat),eau:Math.round(r.postes.eau.achat),cons:Math.round(r.postes.conservation.achat),ep:Math.round(r.postes.epreuve.achat),boulet:z.boulet.rows.map(b=>b.dn+'/'+b.ml),bouletEur:Math.round(r.postes.boulet.achat),ae:z.aerien.rows[0],fc:d.foncage.rows[0]&&{nColl:d.foncage.rows[0].nColl,seg:d.foncage.rows[0].seg},sst:z.sst[0],sstEur:Math.round(r.postes.sst.achat),loc:[...document.querySelectorAll('#eq-app .ch-loc tr')].map(t=>t.textContent.replace(/\s+/g,' ').trim())};});
await click('chlocok|wc');await chg('#eq-app [data-afx="e§chantier.loc.benne"]','12');
out.after=await page.evaluate(()=>{const T=window.TRACE;const a=T.affaires.get('O2610-13');const E=a.chiffrage.etudes;const z=E.find(x=>x.fromPoints);const r=T.affaires.calc(a).etudes[E.indexOf(z)].r;return {loc:z.chantier.loc,jours:r.detail.conteneur.jours,rows:[...document.querySelectorAll('#eq-app .ch-loc tr')].map(t=>t.textContent.replace(/\s+/g,' ').trim()),head:(document.querySelector('#eq-app .ch-loc .eq-lab')||{}).textContent||''};});
console.log('5) préremplissage :',JSON.stringify(out));
C.c5=out.jours.wc===10&&out.jours.benne===10&&out.nbJ===10&&out.cal===11&&out.feries.join()==='2026-11-11'&&out.radio.fd===4&&out.radio.ant===5&&out.radio.racc===2&&Math.abs(out.radio.fdN-30)<0.01&&Math.abs(out.radio.antN-40)<0.01
  &&out.zones.length===2&&out.zones[0].pr.rincage===true&&out.zones[0].pr.passivation===false&&out.zones[1].pr.passivation===true&&out.zones[1].pr.eau===true&&out.on[0].epreuve&&out.on[1].epreuve&&out.rinc>0&&out.pass>0&&out.eau>0&&out.cons===0&&out.ep>0
  &&out.boulet.join()==='150/120,100/300,200/400'&&out.bouletEur>0&&out.ae.support==='Mural'&&out.ae.calo==='Isoxal'&&out.fc&&out.fc.nColl===44&&out.sst.type==='autre'&&out.sst.pu===1500&&out.sstEur===3000
  &&out.loc.length===3&&/calculé · à valider/.test(out.loc[1])&&out.after.loc.wc===10&&out.after.loc.benne===12&&out.after.jours.benne===12&&out.after.rows.some(t=>/^WC.*validé/.test(t))&&out.after.rows.some(t=>/^Benne.*saisi · calculé 10 j/.test(t))&&/10 jours ouvrés/.test(out.after.head)&&/11\/11/.test(out.after.head);
// ── 6) rinçage limité à SA zone : le moteur ne rince que la zone 1 (même résultat qu'une étude à une seule zone)
out=await page.evaluate(()=>{const T=window.TRACE;const a=T.affaires.get('O2610-13');const z=JSON.parse(JSON.stringify(a.chiffrage.etudes.find(x=>x.fromPoints)));const solo=JSON.parse(JSON.stringify(z));solo.hydro.zones=[z.hydro.zones[0]];const calc=e=>T.affaires.calc(Object.assign({},a,{chiffrage:{etudes:[e]}})).etudes[0].r.postes.rincage.achat;return {two:Math.round(calc(z)),one:Math.round(calc(solo))};});
console.log('6) rinçage par zone :',JSON.stringify(out));
C.c6=out.two>0&&out.two===out.one;
// ── 7) ancienne saisie (radio « % », rangées d'essai, rinçage global) : reprise sans perte
await page.evaluate(()=>{const T=window.TRACE;T.affaires.set('O2610-13',{points:{radio:{on:true,pct:15,vac:8,raccFilms:2},hydro:{on:true,rows:[{nom:'Rue A',dn:100,ml:50},{nom:'Rue A',dn:80,ml:20},{nom:'',dn:150,ml:40}]},rincage:{on:true}}});});await wait(300);
await page.evaluate(()=>document.querySelector('#eq-app [data-act=af][data-v="tab|lecture"]').click());await wait(500);
out={v:await page.evaluate(()=>({fd:(document.querySelector('#eq-app [data-afx="pt§radio.fdPct"]')||{}).value,ant:(document.querySelector('#eq-app [data-afx="pt§radio.antPct"]')||{}).value,vac:(document.querySelector('#eq-app [data-afx="pt§radio.fdVac"]')||{}).value,tr:[...document.querySelectorAll('#eq-app .cm-tr')].map(t=>({nom:t.querySelector('.cm-tr-h input').value,rows:t.querySelectorAll('tr').length-1,rinc:(t.querySelector('[data-afx$=".rincage"]')||{}).checked}))}))};
await chg('#eq-app [data-afx="pt§radio.antPct"]','25');out.saved=await A().then(a=>({radio:a.points.radio,tr:a.points.hydro.troncons.map(t=>t.nom+':'+t.rows.length+':'+t.rincage),rows:a.points.hydro.rows,rinc:a.points.rincage}));
console.log('7) ancienne saisie :',JSON.stringify(out));
C.c7=out.v.fd==='15'&&out.v.ant==='15'&&out.v.vac==='8'&&out.v.tr.length===2&&out.v.tr[0].nom==='Rue A'&&out.v.tr[0].rows===2&&out.v.tr[1].nom==='Tronçon 3'&&out.v.tr.every(t=>t.rinc)&&out.saved.radio.antPct===25&&out.saved.radio.fdPct===15&&out.saved.radio.pct===undefined&&out.saved.tr.join()==='Rue A:2:true,Tronçon 3:1:true'&&out.saved.rows===undefined&&out.saved.rinc===undefined;
const bad=Object.entries(C).filter(([k,v])=>!v).map(([k])=>k);console.log(bad.length?'RESULTAT: ECHEC '+bad.join(','):'RESULTAT: TOUT VERT');console.log(logs.length?logs:'[]');
await browser.close();
