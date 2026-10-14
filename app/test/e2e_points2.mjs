// POINTS TECHNIQUES → CHIFFRAGE DIRECT. À l'origine (13/10) : la checklist « Points techniques » (dates → jours ouvrés et base vie, typologies SST + « autre »,
// CND feeder / antennes / vacations, essai hydraulique par tronçons et prestations reliées, global, boulet, aérien, fonçage) puis « Préremplir le chiffrage ».
// 14/10 nuit (Ethan : « les points techniques à cocher font doublon avec l'espace chiffrage : je pense plutôt le supprimer, puis travailler directement dans le
// chiffrage et remplir les différentes zones ») : l'onglet est retiré. Même intention vérifiée, mais DANS la zone du chiffrage : un ancien lien « Points » ouvre
// le chiffrage ; les quantités préremplissent la zone ; jours ouvrés / férié / base vie ; typologies SST + autre ; CND (taux feeder / antennes, soudures par
// vacation, vacations de raccordement) ; 2 épreuves avec leurs prestations, rinçage limité à SON épreuve, rinçage GLOBAL ; boulet, aérien, fonçage, SST autre ;
// les anciens points techniques d'une affaire restent sur l'affaire (rien de perdu). Base de prix FICTIVE (fixture_prix.xlsx).
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
  document.querySelector('#eq-app [data-act=af][data-v="create|"]').click();await new Promise(x=>setTimeout(x,250));document.querySelector('#eq-app [data-act=af][data-v="tab|chiffrage"]').click();await new Promise(x=>setTimeout(x,300));});
await page.setInputFiles('#eq-app input[data-afprix]',path.join(HERE,'fixture_prix.xlsx'));await wait(1500);
const unfold=async k=>{if(await page.evaluate(k=>{const c=document.querySelector(`#eq-app .ch-bloc[data-bloc="${k}"]`);return !!c&&c.classList.contains('folded');},k))await click('chfold|'+k);};
const ZI=()=>page.evaluate(()=>{const a=window.TRACE.affaires.get('O2610-13');return ((a.chiffrage||{}).etudes||[]).findIndex(z=>z.source==='quantites');});
const R=()=>page.evaluate(()=>{const T=window.TRACE;const a=T.affaires.get('O2610-13');const E=a.chiffrage.etudes;const i=E.findIndex(z=>z.source==='quantites');const r=T.affaires.calc(a).etudes[i].r;return {z:E[i],postes:Object.fromEntries(Object.entries(r.postes).map(([k,p])=>[k,Math.round(p.achat)])),d:{conteneur:r.detail.conteneur,Radio:r.detail.Radio,hydro:{vols:r.detail.hydro.vols,on:r.detail.hydro.on},foncage:r.detail.foncage}};});
// ── 1) plus d'onglet Points : un ancien lien ouvre le chiffrage ; quantités DN 200 (300 soudures, 400 ml) + DN 100 (200, 300 ml) → « Préremplir » → la zone ;
//      dates 02/11 → 13/11 (11/11 férié) → 10 jours ouvrés, WC + benne en location base vie (calculé · à valider) ; typologies SST + « autre »
let out={pt:await page.evaluate(async()=>{const chip=!!document.querySelector('#eq-app [data-act=af][data-v="tab|points"]');const b=document.createElement('button');b.dataset.act='af';b.dataset.v='tab|points';document.getElementById('eq-app').appendChild(b);b.click();await new Promise(r=>setTimeout(r,300));return {chip,tab:window.TRACE.affaires.state().tab,pt:!!document.querySelector('#eq-app [data-afx^="pt§"]'),nav:!!document.querySelector('#eq-app .ch-nav')};})};
await click('tab|quantites');await click('qadd|');await chg('#eq-app [data-afqr="0|dn"]','200');await chg('#eq-app [data-afqr="0|soud"]','300');await chg('#eq-app [data-afqr="0|ml"]','400');
await click('qadd|');await chg('#eq-app [data-afqr="1|dn"]','100');await chg('#eq-app [data-afqr="1|soud"]','200');await chg('#eq-app [data-afqr="1|ml"]','300');
await click('qprefill|');await wait(300);out.zi=await ZI();
await unfold('chantier');await chg('#eq-app [data-afx="e§chantier.d0"]','2026-11-02');await chg('#eq-app [data-afx="e§chantier.d1"]','2026-11-13');await chg('#eq-app [data-afx="e§chantier.wc"]',true);await chg('#eq-app [data-afx="e§chantier.benne"]',true);
await unfold('sst');await click('chadd|sst');
out.opts=await page.evaluate(()=>[...document.querySelectorAll('#eq-app [data-afx="e§sst.0.type"] option')].map(o=>o.textContent).filter(t=>!/— type —/.test(t)));
out.loc=await page.evaluate(()=>({head:(document.querySelector('#eq-app .ch-loc .eq-lab')||{}).textContent||'',rows:[...document.querySelectorAll('#eq-app .ch-loc tr')].map(t=>t.textContent.replace(/\s+/g,' ').trim())}));
out.r=await R();
console.log('1) ancien lien, zone, jours, SST :',JSON.stringify({...out,r:{dn:out.r.z.dn,jours:out.r.d.conteneur.jours,nbJ:out.r.d.conteneur.nbJ,cal:out.r.d.conteneur.cal,feries:out.r.d.conteneur.feries}}));
C.c1=!out.pt.chip&&out.pt.tab==='chiffrage'&&!out.pt.pt&&out.pt.nav&&out.zi>=0&&out.r.z.dn.map(r=>r.dn+':'+r.soud+'/'+r.ml).join()==='200:300/400,100:200/300'
  &&out.opts.filter(x=>/VANNES/i.test(x)).length>=4 /* typologies = paniers SST de la base de prix (4 dans la base fictive) */&&['By-pass seul','Fonds bombés'].every(x=>out.opts.includes(x))&&out.opts.some(x=>/^Autre/.test(x))
  &&/10 jours ouvrés/.test(out.loc.head)&&/11 j calendaires/.test(out.loc.head)&&/11\/11/.test(out.loc.head)&&out.loc.rows.length===3&&out.loc.rows.slice(1).every(t=>/calculé · à valider/.test(t))
  &&out.r.d.conteneur.nbJ===10&&out.r.d.conteneur.cal===11&&out.r.d.conteneur.feries.join()==='2026-11-11'&&out.r.d.conteneur.jours.wc===10&&out.r.d.conteneur.jours.benne===10;
// ── 2) location base vie : WC ✓ validé, benne saisie 12 j (le calcul reste affiché)
await click('chlocok|wc');await chg('#eq-app [data-afx="e§chantier.loc.benne"]','12');
out={r:await R(),rows:await page.evaluate(()=>[...document.querySelectorAll('#eq-app .ch-loc tr')].map(t=>t.textContent.replace(/\s+/g,' ').trim()))};
console.log('2) base vie :',JSON.stringify({loc:out.r.z.chantier.loc,jours:out.r.d.conteneur.jours,rows:out.rows}));
C.c2=out.r.z.chantier.loc.wc===10&&out.r.z.chantier.loc.benne===12&&out.r.d.conteneur.jours.benne===12&&out.rows.some(t=>/^WC.*validé/.test(t))&&out.rows.some(t=>/^Benne.*saisi · calculé 10 j/.test(t));
// ── 3) CND : DN 100 = 200 soudures en antennes (« dont antennes »), DN 200 en feeder ; radio feeder 10 % / antennes 20 %, 9 soudures par vacation, 2 vacations de
//      raccordement, 120 km → feeder 30 soudures → 4 vac., antennes 40 → 5 vac., raccordements 2
await chg('#eq-app [data-afx="e§dn.1.nAnt"]','200');
await unfold('cnd');await chg('#eq-app [data-afx="e§cnd.km"]','120');await chg('#eq-app [data-afx="e§cnd.radio.on"]',true);
await chg('#eq-app [data-afx="e§cnd.radio.fdPct"]','10');await chg('#eq-app [data-afx="e§cnd.radio.antPct"]','20');await chg('#eq-app [data-afx="e§cnd.radio.fdVac"]','9');await chg('#eq-app [data-afx="e§cnd.radio.antVac"]','9');await chg('#eq-app [data-afx="e§cnd.radio.raccVac"]','2');
out={r:await R(),tab:await page.evaluate(()=>{const t=[...document.querySelectorAll('#eq-app .ch-cndt')][0];return t?[...t.querySelectorAll('tr')].slice(1).map(r=>[...r.cells].map(c=>{const i=c.querySelector('input');return i?i.value:c.textContent.replace(/\s+/g,' ').trim();}).join('|')):[];})};
const RD=out.r.d.Radio;
console.log('3) CND :',JSON.stringify({fd:RD.fd,ant:RD.ant,racc:RD.racc&&RD.racc.vac,radio:out.r.postes.radio,tab:out.tab}));
C.c3=RD.fd.vac===4&&RD.ant.vac===5&&RD.racc.vac===2&&Math.abs(RD.fd.n-30)<0.01&&Math.abs(RD.ant.n-40)<0.01&&out.r.postes.radio>0
  &&out.tab.length===3&&/^Antennes\|200\|20\|40(,0)?\|9\|5\|/.test(out.tab[0])&&/^Feeders\|300\|10\|30(,0)?\|9\|4\|/.test(out.tab[1])&&/^Raccordements sur existant\|/.test(out.tab[2])&&/\|2\|/.test(out.tab[2]);
// ── 4) essai hydraulique : 2 ÉPREUVES (DN 200 800 ml de tube ; DN 100 600 ml) ; rinçage sur l'épreuve 1, passivation + eau adoucie sur l'épreuve 2
await unfold('hydro');await click('chadd|hydro.zones.0.rows');await chg('#eq-app [data-afx="e§hydro.zones.0.rows.0.dn"]','200');await chg('#eq-app [data-afx="e§hydro.zones.0.rows.0.ml"]','800');
await click('chadd|hydro.zones');await wait(100);
out={n:await page.evaluate(()=>{const a=window.TRACE.affaires.get('O2610-13');const z=a.chiffrage.etudes.find(x=>x.source==='quantites');return (z.hydro.zones||[]).length;})};
if(!(await page.evaluate(()=>!!document.querySelector('#eq-app [data-afx="e§hydro.zones.1.rows.0.dn"]'))))await click('chadd|hydro.zones.1.rows');
await chg('#eq-app [data-afx="e§hydro.zones.1.rows.0.dn"]','100');await chg('#eq-app [data-afx="e§hydro.zones.1.rows.0.ml"]','600');
await chg('#eq-app [data-afx="e§hydro.zones.0.pr.rincage"]',true);await chg('#eq-app [data-afx="e§hydro.zones.1.pr.passivation"]',true);await chg('#eq-app [data-afx="e§hydro.zones.1.pr.eau"]',true);
out.r=await R();const P=out.r.postes;out.ui=await page.evaluate(()=>[...document.querySelectorAll('#eq-app .ch-hz .ch-hz-h input')].map(i=>i.value));
console.log('4) 2 épreuves :',JSON.stringify({n:out.n,zones:out.r.z.hydro.zones.map(x=>({nom:x.nom,pr:x.pr,rows:x.rows})),on:out.r.d.hydro.on,vols:out.r.d.hydro.vols,P:{ep:P.epreuve,rinc:P.rincage,pass:P.passivation,eau:P.eau,cons:P.conservation},ui:out.ui}));
C.c4=out.n===2&&out.r.z.hydro.zones.length===2&&out.r.d.hydro.on[0].epreuve&&out.r.d.hydro.on[1].epreuve&&out.r.d.hydro.on[0].rincage&&!out.r.d.hydro.on[1].rincage&&out.r.d.hydro.on[1].passivation&&out.r.d.hydro.on[1].eau&&!out.r.d.hydro.on[0].passivation
  &&P.epreuve>0&&P.rincage>0&&P.passivation>0&&P.eau>0&&P.conservation===0&&out.ui.length===2&&out.ui.every(v=>/^Épreuve \d$/.test(v));
// ── 5) rinçage limité à SON épreuve : même prix qu'une zone n'ayant que l'épreuve 1 ; puis rinçage aussi sur l'épreuve 2 en GLOBAL → une seule fois sur le volume cumulé
out={solo:await page.evaluate(()=>{const T=window.TRACE;const a=T.affaires.get('O2610-13');const z=JSON.parse(JSON.stringify(a.chiffrage.etudes.find(x=>x.source==='quantites')));const solo=JSON.parse(JSON.stringify(z));solo.hydro.zones=[z.hydro.zones[0]];const calc=e=>T.affaires.calc(Object.assign({},a,{chiffrage:Object.assign({},a.chiffrage,{etudes:[e]})})).etudes[0].r.postes.rincage.achat;return {two:Math.round(calc(z)),one:Math.round(calc(solo))};})};
await chg('#eq-app [data-afx="e§hydro.zones.1.pr.rincage"]',true);await chg('#eq-app [data-afx="e§hydro.global.rincage"]','1');
out.calc=await page.evaluate(()=>{const T=window.TRACE;const a=T.affaires.get('O2610-13');const z=JSON.parse(JSON.stringify(a.chiffrage.etudes.find(x=>x.source==='quantites')));const calc=e=>T.affaires.calc(Object.assign({},a,{chiffrage:Object.assign({},a.chiffrage,{etudes:[e]})})).etudes[0].r;
  const g=calc(z);const per=JSON.parse(JSON.stringify(z));per.hydro.global={};const one=JSON.parse(JSON.stringify(z));one.hydro.global={};one.hydro.zones=[{nom:'tout',rows:z.hydro.zones.flatMap(x=>x.rows),pr:{epreuve:true,rincage:true}}];
  return {glob:z.hydro.global,g:Math.round(g.postes.rincage.achat),per:Math.round(calc(per).postes.rincage.achat),one:Math.round(calc(one).postes.rincage.achat),ids:(g.detail.hydro.groups.rincage[0]||{}).ids,ep:Math.round(g.postes.epreuve.achat),epPer:Math.round(calc(per).postes.epreuve.achat)};});
out.ui=await page.evaluate(()=>{const l=[...document.querySelectorAll('#eq-app .ch-prl')].find(x=>/Rinçage/.test(x.textContent));return l?l.textContent.replace(/\s+/g,' '):'';});
console.log('5) rinçage par épreuve / global :',JSON.stringify(out));
C.c5=out.solo.two>0&&out.solo.two===out.solo.one&&out.calc.glob&&+out.calc.glob.rincage===1&&out.calc.g===out.calc.one&&out.calc.g<out.calc.per&&(out.calc.ids||[]).join()==='0,1'&&out.calc.ep===out.calc.epPer&&/2 \/ 2 épreuves/.test(out.ui)&&/Globale : [\d,]+ m³ sur 2 épreuves/.test(out.ui);
// ── 6) boulet (DN 150 · 120 ml), aérien (support Mural, calorifuge Isoxal), fonçage (DN 200 · 30 ml → 44 colliers), SST « autre » au prix saisi (2 × 1 500 €)
await chg('#eq-app [data-afx="e§boulet.on"]',true);await unfold('boulet');await click('chadd|boulet.rows');await chg('#eq-app [data-afx="e§boulet.rows.0.dn"]','150');await chg('#eq-app [data-afx="e§boulet.rows.0.ml"]','120');
await unfold('aerien');await click('chadd|aerien.rows');await chg('#eq-app [data-afx="e§aerien.rows.0.ml"]','30');await chg('#eq-app [data-afx="e§aerien.rows.0.support"]','Mural');await chg('#eq-app [data-afx="e§aerien.rows.0.calo"]','Isoxal');
await unfold('foncage');await click('chadd|foncage.rows');await chg('#eq-app [data-afx="e§foncage.rows.0.dn"]','200');await chg('#eq-app [data-afx="e§foncage.rows.0.ml"]','30');await chg('#eq-app [data-afx="e§foncage.rows.0.jours"]','2');
await unfold('sst');await chg('#eq-app [data-afx="e§sst.0.type"]','autre');await chg('#eq-app [data-afx="e§sst.0.dn"]','80');await chg('#eq-app [data-afx="e§sst.0.paires"]','2');await chg('#eq-app [data-afx="e§sst.0.des"]','Vanne motorisée PN25');await chg('#eq-app [data-afx="e§sst.0.pu"]','1500');
out=await R();const fc=(out.d.foncage&&out.d.foncage.rows||[])[0]||{};
console.log('6) boulet / aérien / fonçage / SST autre :',JSON.stringify({boulet:out.z.boulet,ae:out.z.aerien.rows[0],fc:{nColl:fc.nColl},sst:out.z.sst[0],P:{boulet:out.postes.boulet,aerien:out.postes.aerien,foncage:out.postes.foncage,sst:out.postes.sst}}));
C.c6=out.z.boulet.on===true&&out.z.boulet.rows.length===1&&+out.z.boulet.rows[0].dn===150&&+out.z.boulet.rows[0].ml===120&&out.postes.boulet>0&&out.z.aerien.rows[0].support==='Mural'&&out.z.aerien.rows[0].calo==='Isoxal'&&fc.nColl===44
  &&out.z.sst[0].type==='autre'&&+out.z.sst[0].pu===1500&&out.postes.sst===3000;
// ── 7) une affaire qui avait des points techniques (ancienne saisie) : ils restent sur l'affaire (rien de perdu), un ancien lien « Points » ouvre le chiffrage
const OLD={radio:{on:true,pct:15,vac:8,raccFilms:2},hydro:{on:true,rows:[{nom:'Rue A',dn:100,ml:50},{nom:'Rue A',dn:80,ml:20},{nom:'',dn:150,ml:40}]},rincage:{on:true},purges:{on:true,dn:32,paires:4,auto:true}};
await page.evaluate(o=>{window.TRACE.affaires.set('O2610-13',{points:o});},OLD);await wait(300);
out={nav:await page.evaluate(async()=>{const b=document.createElement('button');b.dataset.act='af';b.dataset.v='tab|points';document.getElementById('eq-app').appendChild(b);b.click();await new Promise(r=>setTimeout(r,300));return {tab:window.TRACE.affaires.state().tab,pt:!!document.querySelector('#eq-app [data-afx^="pt§"]')};}),
  kept:await page.evaluate(()=>JSON.stringify(window.TRACE.affaires.get('O2610-13').points))};
console.log('7) anciens points techniques :',JSON.stringify(out));
C.c7=out.nav.tab==='chiffrage'&&!out.nav.pt&&out.kept===JSON.stringify(OLD);
const bad=Object.entries(C).filter(([k,v])=>!v).map(([k])=>k);console.log(bad.length?'RESULTAT: ECHEC '+bad.join(','):'RESULTAT: TOUT VERT');console.log(logs.length?logs:'[]');
await browser.close();
