// MÉMOIRE TECHNIQUE — MOINS DE TROUS ROUGES (lot M2, 14/10/2026 soir). Ethan : « re-scanne bien tous les trous par défaut, il y en a qui sont complétables encore
// tout seuls, et avoir moins de trous ». Bibliothèque FICTIVE (test/memoire_fake_m2.mjs) injectée dans le registre « doc » ; affaire fictive (secteur Ouest) avec
// un chiffrage fictif à 2 zones (radio feeder / antennes, purges, vidanges déportées, raccordements, sous-stations) et l'annuaire fictif (téléphones) :
// nouvelles règles d'office (fronts, purges, vidanges, radio, zones, raccordements, lot, visite, SAV), libellé répété dans un tableau (pas d'office),
// contact par ligne de tableau, n° d'annexe automatique (aperçu + texte du .docx), trous facultatifs (gris, non comptés, absents de l'export sans séparateur
// orphelin), valeurs retenues pour tous les mémoires (visibles dans une AUTRE affaire, « agence » par secteur), priorité des valeurs, « 📝 Tout compléter »,
// fenêtre d'un trou (même valeur cochée d'office, puces « ex. », Retenir / Ne plus retenir), compteurs « n infos (m trous) », lecture seule ; puis téléphone (390 px).
// SHOTS=<dossier> : captures pour relecture (hors dépôt).
import { chromium } from 'playwright';
import fs from 'fs';import path from 'path';import {fileURLToPath} from 'url';
import {unzipSync,strFromU8} from 'fflate';
import {FAKE_STYLE} from './memoire_fake.mjs';
import {FAKE_M2_BLOCS,FAKE_M2_ACCOUNTS} from './memoire_fake_m2.mjs';
const HERE=path.dirname(fileURLToPath(import.meta.url));const SHOTS=process.env.SHOTS||'';
const BASE=process.env.BASE||'http://localhost:8765';
const browser=await chromium.launch({headless:true, executablePath: process.env.CHROMIUM_PATH||undefined});
const C={};const logs=[];const LIB={kind:'memlib',req:{none:true},title:'Mémoire technique : bibliothèque de blocs SCR',blocs:FAKE_M2_BLOCS,style:FAKE_STYLE,version:1,at:'2026-10-14T00:00:00.000Z',by:'Test',
  reglages:{trous:{"nom du maitre d'oeuvre":{v:'NE PAS PRENDRE',at:'2026-10-14T00:00:00.000Z',by:'Test'}}}}; /* une valeur retenue pour un libellé rempli d'office : jamais prise (d'office > retenu) */
async function open(ctxOpts){const ctx=await browser.newContext(Object.assign({acceptDownloads:true},ctxOpts));const page=await ctx.newPage();
  page.on('pageerror',e=>logs.push('PAGEERROR: '+e.message.slice(0,300)));page.on('console',m=>{if(m.type()==='error'&&!/supabase|Failed to fetch|net::ERR|404|WebSocket|pdf\.worker|cdnjs/i.test(m.text()))logs.push(m.text().slice(0,200));});page.on('dialog',d=>d.accept().catch(()=>{}));
  await page.route(u=>/(^|\.)geopf\.fr$|^geo\.api\.gouv\.fr$|open-meteo\.com$|ign\.fr$|openstreetmap|tile/.test(u.hostname),r=>r.fulfill({status:200,contentType:'application/json',body:'{}'}));
  await page.goto(BASE+'/index.html');await page.waitForTimeout(600);
  await page.evaluate(([acc,row])=>new Promise((res,rej)=>{localStorage.clear();localStorage.setItem('trace:wide','1');localStorage.setItem('trace:accounts',JSON.stringify(acc));const r=indexedDB.open('trace-kv',1);r.onupgradeneeded=()=>{r.result.createObjectStore('kv');};r.onerror=()=>rej(r.error);
    r.onsuccess=()=>{const db=r.result;const t=db.transaction('kv','readwrite');const st=t.objectStore('kv');st.delete('trace:reg:entdoc');st.put({memlib:{id:'memlib',data:row,updated_at:new Date().toISOString()}},'trace:reg:doc');t.oncomplete=()=>{db.close();res();};t.onerror=()=>rej(t.error);};}),[FAKE_M2_ACCOUNTS,LIB]);
  await page.reload();await page.waitForTimeout(1200);{const s=await page.$('#loginSkip');if(s&&await s.isVisible())await s.click();await page.waitForTimeout(700);}
  await page.evaluate(async()=>{const T=window.TRACE;T.state.userId='ethan';T.renderHome();await T.acces.list();const P=T.espace.state().people;const set=(k,o)=>{P[k]=Object.assign(P[k]||{},o);};
    set('alain.charge@exemple.test',{tel:'06 11 22 33 44'});set('remi.ouest@exemple.test',{tel:'06 55 44 33 22',secteur:'ouest'});set('iris.idf@exemple.test',{tel:'06 77 88 99 00',secteur:'idf'});set('cedric.c@exemple.test',{tel:'06 33 44 55 66'});
    set('charles.c@exemple.test',{tel:'06 12 12 12 12'});set('ada.a@exemple.test',{tel:'06 99 88 77 66'});});
  return {ctx,page};}
/* une affaire fictive : fiche (chargé, conducteur, maître d'ouvrage / d'œuvre, consultation), chiffrage fictif (2 zones) ; onglet 5 · Mémoire */
async function newAff(page,n,nom,sect,o){await page.evaluate(async([n,nom,sect])=>{const st=window.TRACE.affaires.state();st.view='list';st.cur=null;document.getElementById('htCom').click();await new Promise(x=>setTimeout(x,300));document.querySelector('#eq-app [data-act=af][data-v="new|"]').click();await new Promise(x=>setTimeout(x,150));
    const set=(id,v)=>{const e=document.getElementById(id);if(e)e.value=v;};set('afn-num',n);set('afn-nom',nom);set('afn-client','CLIENT-TEST');set('afn-ville','Testville');set('afn-sect',sect);set('afn-etat','devis');
    document.querySelector('#eq-app [data-act=af][data-v="create|"]').click();await new Promise(x=>setTimeout(x,250));document.querySelector('#eq-app [data-act=af][data-v="tab|chiffrage"]').click();await new Promise(x=>setTimeout(x,300));},[n,nom,sect]);
  if(!(await page.evaluate(()=>!!(window.TRACE.prixBase&&window.TRACE.prixBase()))))await page.setInputFiles('#eq-app input[data-afprix]',path.join(HERE,'fixture_prix.xlsx'));await page.waitForTimeout(1500);
  await page.evaluate(([n,o])=>{const T=window.TRACE;T.affaires.set(n,o);T.affaires.state().tab='memoire';T.renderHome();},[n,o]);await page.waitForTimeout(300);
  await page.evaluate(()=>{const b=document.querySelector('#eq-app [data-act=af][data-v="tab|memoire"]');if(b)b.click();});await page.waitForTimeout(700);}
const CHIFF={etudes:[
  {id:'E1',nom:'Zone A',chantier:{d0:'2026-11-02',d1:'2026-12-11',nbDecharg:0},eq:{soud:'S+T+P',manch:'M',typeManchon:'Thermo'},mlMode:'tranchee',dn:[{dn:100,soud:400,ml:1200},{dn:50,soud:60,ml:200}],sst:[{dn:50,type:'sst_vannes_bs_pn25',paires:3}],
    purges:{dn:40,paires:3,deporte:false},vidanges:{dn:50,type:'aspiration',paires:2,deporte:true},racc:[{dn:150,type:'racc_test',paires:2}],cnd:{km:'',radio:{on:true,antPct:10,antVac:0,fdPct:20,fdVac:0,raccFilms:0,raccVac:0}}},
  {id:'E2',nom:'Zone B',chantier:{d0:'2026-11-16',d1:'2026-12-04'},eq:{soud:'S+T+P',manch:'M',typeManchon:'Thermo'},mlMode:'tranchee',dn:[{dn:150,soud:80,ml:300}],purges:{dn:40,paires:1,deporte:false},racc:[{dn:200,type:'racc_test',paires:1}],cnd:{km:'',radio:{on:true,antPct:10,antVac:0,fdPct:30,fdVac:0,raccFilms:0,raccVac:0}}}]};
const AFF0={charge:'Alain Chargé',cdtx:'Cédric Conduite',moe:'BET Fictif',chiffrage:CHIFF,consult:{lot:'Lot 2 · réseau fictif',visite:'2026-10-20T10:00',procedure:'MAPA'}};
const NUM='O2610-61';
let {ctx,page}=await open({viewport:{width:1280,height:900}});
await newAff(page,NUM,'Réseau M2','ouest',AFF0);
const wait=ms=>page.waitForTimeout(ms);
const shot=async n=>{if(!SHOTS)return;fs.mkdirSync(SHOTS,{recursive:true});await wait(250);await page.screenshot({path:path.join(SHOTS,n+'.png')});};
const click=async v=>{await page.evaluate(v=>{const el=document.querySelector(`#eq-app [data-act=af][data-v="${v}"]`);if(!el)throw new Error('bouton absent '+v);el.click();},v);await wait(320);};
const A=n=>page.evaluate(n=>window.TRACE.affaires.get(n),n||NUM);
const LIBR=()=>page.evaluate(()=>window.TRACE.reg.get('doc','memlib'));
const P=id=>page.evaluate(id=>{const el=document.getElementById('memoire-p-'+id);return el?el.textContent.replace(/\s+/g,' ').trim():null;},id);
const red=id=>page.evaluate(id=>[...document.querySelectorAll(`#memoire-p-${id} .memoire-h`)].map(x=>x.textContent.trim()),id);
const auto=id=>page.evaluate(id=>[...document.querySelectorAll(`#memoire-p-${id} .memoire-auto`)].map(x=>x.textContent.trim()),id);
const tile=()=>page.evaluate(()=>(document.getElementById('memoire-nholes')||{}).textContent.replace(/\s+/g,' ').trim());
const nav=()=>page.evaluate(()=>{const n=document.getElementById('memoire-nav');return n?n.textContent.replace(/\s+/g,' ').trim():'';});
const toast=()=>page.evaluate(()=>(document.getElementById('toast')||{}).textContent||'');
const hole=async(pid,k)=>{await page.evaluate(([pid,k])=>{const b=[...document.querySelectorAll(`#memoire-p-${pid} [data-v^="mlbh|"]`)][k||0];if(!b)throw new Error('trou absent '+pid);b.click();},[pid,k]);await wait(300);};
await shot('01_depart');
// ── 1) re-scan : nouvelles règles d'office (fronts = équipes, purges, vidanges + déport, radio feeder / antennes, total des sous-stations, zones, raccordements,
//     visite du site, lot sans « lot Lot », SAV = chargé + téléphone) ; libellé répété dans un même tableau (tranche ferme / conditionnelle) : PAS d'office
let out={fr:await P('n-fr-1'),frT:await page.evaluate(()=>(document.querySelector('#memoire-p-n-fr-1 .memoire-auto')||{}).title||''),org:await P('n-org-1'),rad:await P('n-rad-1'),racc:await auto('n-rad-2'),tr1:{red:await red('n-tr-1'),auto:await auto('n-tr-1')},tr2:await P('n-tr-2'),ctr:await P('n-ctr-1'),sav:await auto('n-sav-1')};
console.log('1) re-scan :',JSON.stringify(out));
C.c1=/Jusqu’à 2 fronts ouverts en même temps/.test(out.fr)&&/nombre de fronts \(= équipes\)/.test(out.frT)&&/Accessoires fictifs : 4 purges, 2 vidanges en DN 50 par aspiration déportées\./.test(out.org)
  &&/Taux de radio fictifs : feeder 20 à 30 %, antennes 10 %, global \(20 % \/ 30 %\)\./.test(out.rad)&&out.racc.join()==='2 × DN 150 et 1 × DN 200'
  &&out.tr1.red.join('|')==='linéaire en ml|nombre de sous-stations|linéaire en ml|nombre de sous-stations'&&out.tr1.auto.join()==='3'&&/compte 2 secteurs de travail : Zone A \(1 400 ml\) et Zone B \(300 ml\)\./.test(out.tr2.replace(/\u202f/g,' '))
  &&/Repérage fictif fait par la visite du site du 20\/10\/2026\./.test(out.ctr)&&/en charge du lot 2 · réseau fictif\./.test(out.ctr)&&out.sav.join()==='CHARGÉ Alain – 06 11 22 33 44';
// ── 2) contact par ligne de tableau : chaque « téléphone et e-mail » prend la personne de SA ligne ; « [conducteur] au [téléphone] » = le conducteur nommé avant ;
//     chef pas choisi → nom et contact rouges (aide) ; nom saisi à la main (dans l'annuaire) → son contact
out={hum:await auto('n-hum-1'),red:await red('n-hum-1'),tip:await page.evaluate(()=>[...document.querySelectorAll('#memoire-p-n-hum-1 .memoire-h')].map(x=>x.title)[1]||''),hum2:await auto('n-hum-2')};
await hole('n-hum-1',4);await page.fill('#memoire-hv','Charles Chantier');await page.click('#memoire-hok');await wait(400);
out.after=await auto('n-hum-1');out.red2=await red('n-hum-1');
console.log('2) contacts par ligne :',JSON.stringify(out));
C.c2=out.hum.join('|')==='OUEST Rémi|06 55 44 33 22 · remi.ouest@exemple.test|Alain Chargé|06 11 22 33 44 · alain.charge@exemple.test|ADMINISTRATIVE Ada|06 99 88 77 66 · ada.a@exemple.test'
  &&out.red.join('|')==='nom du chef de chantier|téléphone et e-mail'&&/chef de chantier à choisir/.test(out.tip)&&out.hum2.join('|')==='Cédric Conduite|06 33 44 55 66'
  &&out.after.includes('06 12 12 12 12 · charles.c@exemple.test')&&out.red2.length===0;
// ── 3) annexes : puces cochées numérotées « Annexe n – … » ; renvois « n° d'annexe » (texte entre « … », phrase) ; annexe non cochée → rouge + aide ; on la coche → renumérotation
const ann=()=>page.evaluate(()=>[...document.querySelectorAll('#memoire-scroll .memoire-p[id^="memoire-p-n-ann-"]')].map(p=>p.textContent.replace(/[✎✕]/g,'').replace(/\s+/g,' ').trim()));
out={l0:await ann(),i2:await P('n-ident-2'),c2:await red('n-chif-2'),hint:await page.evaluate(()=>(document.querySelector('#memoire-p-n-chif-2 .memoire-h')||{}).title||''),m1:await auto('n-mat-1')};
await click('mlbsecall|1');await click('mlbexp|n-ann');await click('mlbres|n-ann');await click('mlbp|n-ann-3');
out.l1=await ann();out.c2b=await auto('n-chif-2');out.m1b=await auto('n-mat-1');out.i2b=await auto('n-ident-2');
console.log('3) annexes :',JSON.stringify(out));
C.c3=out.l0.join('|')==='Annexe 1 – Pièces administratives fictives|Annexe 2 – Livret de présentation fictif|Annexe 3 – Fiches techniques fictives|Annexe 4 – Plans de détail fictifs : précision, le cas échéant (facultatif)'
  &&/à part : annexe 2 « Livret de présentation fictif »/.test(out.i2)&&out.c2.join()==='n° d’annexe'&&/coche « Organigramme nominatif fictif » dans Annexes/.test(out.hint)&&out.m1.join()==='3'
  &&out.l1.join('|')==='Annexe 1 – Pièces administratives fictives|Annexe 2 – Livret de présentation fictif|Annexe 3 – Organigramme nominatif fictif|Annexe 4 – Fiches techniques fictives|Annexe 5 – Plans de détail fictifs : précision, le cas échéant (facultatif)'
  &&out.c2b.join()==='3'&&out.m1b.join()==='4'&&out.i2b.join()==='2';
await shot('02_annexes');
// ── 4) facultatifs : bouton gris « … (facultatif) », cliquable, NON compté ; le même libellé à une place où la phrase serait fausse reste rouge ; compteurs
const cnt=()=>page.evaluate(()=>({h:document.querySelectorAll('#memoire-scroll .memoire-h').length,o:[...document.querySelectorAll('#memoire-scroll .memoire-o')].map(x=>x.tagName+':'+x.textContent.replace(/\s+/g,' ').trim())}));
out={c:await cnt(),tile:await tile(),nav:await nav(),pass:await red('n-ess-5'),st:await page.evaluate(()=>{const b=document.querySelector('#memoire-p-n-docs-1 .memoire-o');return b?{dash:getComputedStyle(b).borderBottomStyle,col:getComputedStyle(b).color,act:b.dataset.v||''}:null;})};
console.log('4) facultatifs :',JSON.stringify(out));
const m4=/^(\d+) ?infos à compléter \((\d+) trous\)$/.exec(out.tile);
C.c4=out.c.o.length===9&&out.c.o.every(x=>/^BUTTON:.+ \(facultatif\)$/.test(x))&&out.c.o.filter(x=>/référence et indice du document/.test(x)).length===3&&out.pass.join()==='produit de passivation'
  &&!!m4&&+m4[2]===out.c.h&&+m4[1]===out.c.h-1&&/^⚠ \d+ infos à compléter \(\d+ trous\)📝 Tout compléter \(\d+\)/.test(out.nav)&&out.nav.includes('⚠ '+m4[1]+' infos à compléter ('+m4[2]+' trous)📝 Tout compléter ('+m4[1]+')')
  &&out.st&&out.st.dash==='dotted'&&/^mlbh\|n-docs-1\|0$/.test(out.st.act);
// ── 5) fenêtre d'un trou : « même valeur » cochée d'office, puces « ex. », Retenir (absent pour les libellés trop génériques / propres à l'affaire)
const modal=()=>page.evaluate(()=>{const m=document.querySelector('#modal.show');if(!m)return null;const r=document.getElementById('m2-hret');return {t:m.textContent.replace(/\s+/g,' ').trim(),same:(document.getElementById('memoire-hall')||{}).checked,chips:[...m.querySelectorAll('.m2-chip')].map(c=>c.textContent),ret:r?r.checked:null};});
const close=async()=>{await page.evaluate(()=>{const b=document.querySelector('#modal [data-close]');if(b)b.click();});await wait(200);};
await hole('n-ess-2',0);out={pr:await modal()};await close();await hole('n-ess-2',1);out.du=await modal();
await page.click('#modal .m2-chip');out.chipV=await page.evaluate(()=>document.getElementById('memoire-hv').value);await close();
await hole('n-ess-4',0);out.jo=await modal();await close();await hole('n-tr-1',0);out.li=await modal();await close();await hole('n-val-1',0);out.va=await modal();await close();
console.log('5) fenêtre d’un trou :',JSON.stringify(out));
C.c5=out.pr&&out.pr.same===true&&/Même valeur pour l’autre trou « pression d’épreuve en bar » encore vide/.test(out.pr.t)&&out.pr.ret===null&&out.pr.chips.length===0
  &&out.du.chips.join()==='24 h'&&out.du.ret===false&&out.chipV==='24 h'&&out.jo.chips.join('|')==='thermorétractable|électrosoudable'&&out.li.same===undefined&&out.li.ret===null&&out.va.ret===true&&out.va.chips.join()==='4 mois';
// ── 6) retenir pour les prochains mémoires (réglage de l'entreprise, contrat K2 : les autres réglages sont gardés) ; bleu « valeur retenue » ; compteurs à jour
await click('mlbinter|');await page.selectOption('#mem3-qhse','quentin.q@exemple.test');await page.click('#mem3-iok');await wait(400); /* QHSE réglé pour tous les mémoires (memlib.reglages.qhse) : doit rester après « Retenir » (contrat K2) */
const t0=await tile();
await hole('n-chif-1',0);out={m:await modal()};await page.fill('#memoire-hv','12,5');await page.click('#memoire-hok');await wait(450);
await hole('n-ident-1',0);await page.fill('#memoire-hv','Agence Ouest fictive, 1 rue du Test');await page.click('#memoire-hok');await wait(450);
await hole('n-act-1',0);out.moa=await modal();await page.fill('#memoire-hv','1 place Fictive – 01 02 03 04 05');await page.click('#memoire-hok');await wait(450);
let L6=await LIBR();let a6=await A();out.trous=L6.reglages&&L6.reglages.trous;out.qhse=!!(L6.reglages&&L6.reglages.qhse);out.fill=Object.keys(a6.memoire.lib.fill);
out.ret=await page.evaluate(()=>[...document.querySelectorAll('#memoire-scroll .memoire-ret')].map(x=>x.textContent+'|'+/valeur retenue pour tous les mémoires/.test(x.title)));out.t1=await tile();
console.log('6) retenir :',JSON.stringify(out),t0);
C.c6=out.m.ret===true&&/Retenir pour les prochains mémoires/.test(out.m.t)&&out.moa&&out.moa.ret===true&&/^Facultatif/.test(out.moa.t)
  &&out.trous&&out.trous["chiffre d'affaires annuel en m€"]&&out.trous["chiffre d'affaires annuel en m€"].v==='12,5'&&!!out.trous["chiffre d'affaires annuel en m€"].at&&out.trous["agence et adresse|secteur:ouest"].v==='Agence Ouest fictive, 1 rue du Test'
  &&out.trous["adresse et telephone du maitre d'ouvrage|moa:client-test"].v==='1 place Fictive – 01 02 03 04 05'&&out.trous["nom du maitre d'oeuvre"].v==='NE PAS PRENDRE'&&out.qhse&&!out.fill.some(k=>/chiffre d’affaires|agence|maître d’ouvrage/.test(k))
  &&out.ret.join('#')==='Agence Ouest fictive, 1 rue du Test|true#12,5|true#1 place Fictive – 01 02 03 04 05|true'&&+(/^\d+/.exec(out.t1)||[0])[0]===+(/^\d+/.exec(t0)||[0])[0]-2;
// ── 7) priorité : saisi (ce mémoire) > d'office > retenu > facultatif > rouge
await hole('n-ess-5',0);out={m:await modal()};await page.fill('#memoire-hv','Produit fictif P');await page.click('#memoire-hok');await wait(450);
out.r1={e1:await page.evaluate(()=>(document.querySelector('#memoire-p-n-ess-1 .memoire-ret')||{}).textContent||''),e5:await page.evaluate(()=>(document.querySelector('#memoire-p-n-ess-5 .memoire-ret')||{}).textContent||'')};
await hole('n-ess-1',0);await page.evaluate(()=>{document.getElementById('m2-hret').checked=false;});await page.fill('#memoire-hv','Produit local');await page.click('#memoire-hok');await wait(450);
out.r2={e1:await page.evaluate(()=>(document.querySelector('#memoire-p-n-ess-1 .memoire-f')||{}).textContent||''),e5:await page.evaluate(()=>(document.querySelector('#memoire-p-n-ess-5 .memoire-ret')||{}).textContent||'')};
await hole('n-ess-1',0);out.clr=await page.evaluate(()=>(document.getElementById('memoire-hclr')||{}).textContent||'');await page.click('#memoire-hclr');await wait(450);out.r3=await page.evaluate(()=>(document.querySelector('#memoire-p-n-ess-1 .memoire-ret')||{}).textContent||'');
out.moe=await auto('n-act-2');
await hole('n-ess-5',0);out.un=await page.evaluate(()=>(document.getElementById('m2-hunret')||{}).textContent||'');await page.click('#m2-hunret');await wait(450);
L6=await LIBR();a6=await A();out.after={k:!!(L6.reglages.trous['produit de passivation']),f5:a6.memoire.lib.fill['n-ess-5|produit de passivation|0'],f1:a6.memoire.lib.fill['n-ess-1|produit de passivation|0']};
console.log('7) priorité :',JSON.stringify(out));
C.c7=out.m.ret===true&&out.r1.e1==='Produit fictif P'&&out.r1.e5==='Produit fictif P'&&out.r2.e1==='Produit local'&&out.r2.e5==='Produit fictif P'&&out.clr==='Revenir à la valeur retenue'&&out.r3==='Produit fictif P'
  &&out.moe.join()==='BET Fictif'&&/Ne plus retenir/.test(out.un)&&!out.after.k&&out.after.f5==='Produit fictif P'&&out.after.f1==='Produit fictif P';
await shot('03_retenus');
// ── 8) « 📝 Tout compléter » : un champ par information (même libellé = un champ, « · 2 trous »), lignes de tableau à part, puces « ex. », Retenir là où il a lieu
//     d'être, facultatifs repliés ; Enregistrer remplit TOUTES les occurrences et retient ce qui est coché
const n8=+(/^\d+/.exec(await tile())||[0])[0];await click('mlbtc|');
const rowsTC=()=>page.evaluate(()=>[...document.querySelectorAll('#m2-all .m2-row')].map(r=>({lab:(r.querySelector('.m2-lab b')||{}).textContent||'',n:(r.querySelector('.m2-n')||{}).textContent||'',sm:[...r.querySelectorAll('.m2-lab small')].map(x=>x.textContent).join(' / '),chips:[...r.querySelectorAll('.m2-chip')].map(c=>c.textContent),ret:(()=>{const c=r.querySelector('.m2-ret input');return c?c.checked:null;})(),opt:!!r.closest('details'),id:(r.querySelector('.m2-in')||{}).id||''})));
out={rows:await rowsTC(),open:await page.evaluate(()=>{const d=document.querySelector('#m2-all details');return d?d.open:null;}),hint:await page.evaluate(()=>(document.querySelector('#modal.show .hint')||{}).textContent||'')};
const R8=lab=>out.rows.filter(r=>r.lab===lab);const fillTC=async(lab,v,k)=>{const r=R8(lab)[k||0];await page.fill('#'+r.id,v);};
const redRows=out.rows.filter(r=>!r.opt);
await fillTC('pression d’épreuve en bar','16');await page.click(`#${R8('durée de l’essai, ex. 24 h')[0].id} ~ .m2-chips .m2-chip`);await page.click(`#${R8('type de jonction, ex. thermorétractable ou électrosoudable')[0].id} ~ .m2-chips .m2-chip:nth-child(2)`);
await fillTC('durée de validité, ex. 4 mois','4 mois');await fillTC('linéaire en ml','900',0);
await page.evaluate(()=>{const d=document.querySelector('#m2-all details');if(d)d.open=true;});await fillTC('référence et indice du document','Rév. B');
await page.click('#m2-allok');await wait(500);const a8=await A();const L8=await LIBR();const F8=a8.memoire.lib.fill;
out.after={pr:[F8['n-ess-2|pression d’épreuve en bar|0'],F8['n-ess-3|pression d’épreuve en bar|0']],du:F8['n-ess-2|durée de l’essai, ex. 24 h|0'],jo:F8['n-ess-4|type de jonction, ex. thermorétractable ou électrosoudable|0'],
  va:(L8.reglages.trous['duree de validite, ex. 4 mois']||{}).v,vaF:F8['n-val-1|durée de validité, ex. 4 mois|0'],li:[F8['n-tr-1|linéaire en ml|0'],F8['n-tr-1|linéaire en ml|1']],ref:['n-docs-1','n-docs-2','n-docs-3'].map(p=>F8[p+'|référence et indice du document|0']),
  toast:await toast(),tile:await tile(),docs1:await P('n-docs-1'),ess2:await P('n-ess-2'),ess3:await P('n-ess-3')};
console.log('8) tout compléter :',JSON.stringify(out));
C.c8=redRows.length===n8&&R8('pression d’épreuve en bar').length===1&&R8('pression d’épreuve en bar')[0].n==='· 2 trous'&&R8('pression d’épreuve en bar')[0].ret===null&&R8('linéaire en ml').length===2&&/ligne « Partie ferme fictive »/.test(R8('linéaire en ml')[0].sm)&&/ligne « Partie optionnelle fictive »/.test(R8('linéaire en ml')[1].sm)
  &&R8('durée de l’essai, ex. 24 h')[0].chips.join()==='24 h'&&R8('type de jonction, ex. thermorétractable ou électrosoudable')[0].chips.join('|')==='thermorétractable|électrosoudable'&&R8('durée de validité, ex. 4 mois')[0].ret===true&&R8('durée de la garantie fictive')[0].ret===true
  &&R8('n° d’annexe').length===0&&out.open===false&&R8('référence et indice du document')[0].opt&&R8('référence et indice du document')[0].n==='· 3 trous'&&/^\d+ infos à compléter \(\d+ trous\) dans les paragraphes cochés/.test(out.hint)
  &&out.after.pr.join()==='16,16'&&out.after.du==='24 h'&&out.after.jo==='électrosoudable'&&out.after.va==='4 mois'&&out.after.vaF===undefined&&out.after.li[0]==='900'&&out.after.li[1]===undefined&&out.after.ref.join()==='Rév. B,Rév. B,Rév. B'
  &&/^✓ 6 infos complétées \(9 trous\) · 1 valeur retenue pour tous les mémoires$/.test(out.after.toast)&&+(/^\d+/.exec(out.after.tile)||[0])[0]===n8-5&&/Pièce fictive A – Rév\. B/.test(out.after.docs1)&&/Essai fictif : 16 bars tenus 24 h\./.test(out.after.ess2)&&/pression d’essai : 16 bars/.test(out.after.ess3);
await shot('04_tout_complete');
// ── 9) export Word (.docx) : n° d'annexe et « Annexe n – … » en texte, valeurs retenues, facultatifs vides ABSENTS sans séparateur orphelin, aucun bouton ni « (facultatif) »
let [dl]=await Promise.all([page.waitForEvent('download'),page.evaluate(()=>document.querySelector('#eq-app [data-act=af][data-v="mword|"]').click())]);const zip=unzipSync(new Uint8Array(fs.readFileSync(await dl.path())));const dx=zip['word/document.xml']?strFromU8(zip['word/document.xml']):'';
const txt=dx.replace(/<\/w:p>/g,'\n').replace(/<[^>]+>/g,'').replace(/&amp;/g,'&').replace(/&lt;/g,'<').replace(/&gt;/g,'>').replace(/&quot;/g,'"').replace(/&apos;/g,"'");
out={name:dl.suggestedFilename(),ann:['Annexe 1 – Pièces administratives fictives','Annexe 2 – Livret de présentation fictif','Annexe 3 – Organigramme nominatif fictif','Annexe 4 – Fiches techniques fictives','Annexe 5 – Plans de détail fictifs'].filter(s=>!txt.includes(s)),
  refs:['à part : annexe 2 « Livret de présentation fictif »','organigramme nominatif fictif en annexe 3.','fiches techniques fictives en annexe 4.'].filter(s=>!txt.includes(s)),
  lines:txt.split('\n').filter(l=>/Plans de détail fictifs|Traitement fictif des parois|Plans fictifs \(|Maître d’ouvrage|Maître d’œuvre|Bilan carbone|Contrôleur technique|Coordination sécurité/.test(l)),
  vals:['12,5','Agence Ouest fictive, 1 rue du Test','1 place Fictive – 01 02 03 04 05','Produit fictif P','4 mois','06 12 12 12 12 · charles.c@exemple.test'].filter(s=>!txt.includes(s)),
  bad:['facultatif','référence et indice','le cas échéant','si exigé','Contrôleur technique','memoire-','Tout compléter','\uE000','()',' : .',' ,','– \n','détail fictifs :'].filter(s=>txt.includes(s)||dx.includes(s)),red:(txt.match(/\[À COMPLÉTER : /g)||[]).length};
console.log('9) export Word :',JSON.stringify(out));
C.c9=out.name==='Memoire_technique_O2610-61.docx'&&out.ann.length===0&&out.refs.length===0&&out.vals.length===0&&out.bad.length===0&&out.red>0
  &&out.lines.join('|')==='Maître d’ouvrage : CLIENT-TEST 1 place Fictive – 01 02 03 04 05|Maître d’œuvre : BET Fictif|Coordination sécurité : [À COMPLÉTER : nom du coordinateur sécurité]|Plans fictifs (Rév. B)|Traitement fictif des parois (Produit fictif P)|Bilan carbone fictif, calcul indicatif.|Annexe 5 – Plans de détail fictifs';
// mêmes règles pour l'impression (fenêtre A4) et l'ancien .doc : un seul modèle (docModel)
out=await page.evaluate(n=>{const T=window.TRACE;const a=T.affaires.get(n);const H=T.affaires.memoireDocHTML?T.affaires.memoireDocHTML(a):'';return {h:H.length};},NUM);
// ── 10) une AUTRE affaire (même secteur, même client) : les valeurs retenues y sont (bleu) ; un mémoire déjà commencé garde ses trous remplis
await newAff(page,'O2610-62','Autre réseau M2','ouest',Object.assign({},AFF0,{memoire:{mode:'lib',lib:{sel:{},fill:{'n-env-2|point fictif sans règle|0':'Valeur ancienne'},edits:{}}}}));
const retv=()=>page.evaluate(()=>[...document.querySelectorAll('#memoire-scroll .memoire-ret')].map(x=>x.closest('.memoire-p').dataset.pid+'='+x.textContent));
out={o:await retv(),f:await page.evaluate(()=>(document.querySelector('#memoire-p-n-env-2 .memoire-f')||{}).textContent||''),ess3:await red('n-ess-3')};
// même valeur cochée d'office : le trou de l'autre paragraphe se remplit avec
await hole('n-ess-3',0);out.same=await modal();await page.fill('#memoire-hv','25');await page.click('#memoire-hok');await wait(400);out.ess3b=await page.evaluate(()=>['n-ess-2','n-ess-3'].map(p=>(document.querySelector('#memoire-p-'+p+' .memoire-f')||{}).textContent||'').join());
// autre secteur, autre client : l'agence et l'adresse du maître d'ouvrage ne suivent pas ; le chiffre d'affaires, si
await newAff(page,'I2610-63','Réseau IDF M2','idf',Object.assign({},AFF0,{client:'AUTRE-CLIENT'}));
out.i=await retv();out.iRed=await red('n-ident-1');out.iOpt=await page.evaluate(()=>[...document.querySelectorAll('#memoire-p-n-act-1 .memoire-o')].map(x=>x.textContent.trim()));
console.log('10) autres affaires :',JSON.stringify(out));
C.c10=out.o.join('|')==='n-ident-1=Agence Ouest fictive, 1 rue du Test|n-chif-1=12,5|n-act-1=1 place Fictive – 01 02 03 04 05|n-val-1=4 mois'&&out.f==='Valeur ancienne'&&out.ess3.join()==='pression d’épreuve en bar'&&out.same.same===true&&out.ess3b==='25,25'
  &&out.i.join('|')==='n-chif-1=12,5|n-val-1=4 mois'&&out.iRed.join()==='agence et adresse'&&out.iOpt.join()==='adresse et téléphone du maître d’ouvrage (facultatif)';
// ── 11) lecture seule (conducteur) : ni « Tout compléter », ni boutons ; facultatifs et valeurs retenues en simple texte
await page.evaluate(async n=>{const T=window.TRACE;T.demoPoste('sophie','conducteur');T.state.userId='sophie';T.renderHome();const st=T.affaires.state();st.cur=n;st.view='fiche';st.tab='memoire';document.getElementById('htCom').click();await new Promise(r=>setTimeout(r,500));},'O2610-62');
out=await page.evaluate(()=>({tc:!!document.querySelector('[data-v="mlbtc|"]'),btn:document.querySelectorAll('#memoire-scroll button.memoire-h,#memoire-scroll button.memoire-o').length,o:[...document.querySelectorAll('#memoire-scroll .memoire-o')].map(x=>x.tagName),ret:[...document.querySelectorAll('#memoire-scroll .memoire-ret')].map(x=>x.dataset.act||'-'),act:document.querySelectorAll('#memoire-scroll [data-v^="mlbh|"]').length,nav:(document.getElementById('memoire-nav')||{}).textContent||''}));
await page.evaluate(async n=>{const T=window.TRACE;T.demoPoste('sophie',null);T.state.userId='ethan';T.renderHome();const st=T.affaires.state();st.cur=n;st.view='fiche';st.tab='memoire';document.getElementById('htCom').click();await new Promise(r=>setTimeout(r,500));},NUM);
out.back=await page.evaluate(()=>!!document.querySelector('[data-v="mlbtc|"]'));
console.log('11) lecture seule :',JSON.stringify(out));
C.c11=!out.tc&&out.btn===0&&out.o.length>=6&&out.o.every(t=>t==='SPAN')&&out.ret.length===4&&out.ret.every(x=>x==='-')&&out.act===0&&/infos à compléter/.test(out.nav)&&out.back;
// ── 12) tout compléter jusqu'au bout : « aucun trou : prêt », étape ✓ 5 · Mémoire — les facultatifs laissés vides ne bloquent pas
await click('mlbtc|');await page.evaluate(()=>{document.querySelectorAll('#m2-all .m2-row:not(details .m2-row) .m2-in').forEach((i,k)=>{i.value='Valeur '+(k+1);});document.querySelectorAll('#m2-all .m2-ret input').forEach(c=>{c.checked=false;});});
await page.click('#m2-allok');await wait(500);
out={tile:await tile(),nav:await nav(),tab:await page.evaluate(()=>{const b=document.querySelector('#eq-app [data-v="tab|memoire"]');return b?b.textContent.trim():'';}),opt:await page.evaluate(()=>document.querySelectorAll('#memoire-scroll .memoire-o').length),tc:await page.evaluate(()=>!!document.querySelector('[data-v="mlbtc|"]'))};
console.log('12) prêt :',JSON.stringify(out));
C.c12=/^0 ?aucun trou : prêt$/.test(out.tile)&&/Aucun trou : prêt à exporter/.test(out.nav)&&/^✓ 5 · Mémoire/.test(out.tab)&&out.opt>=3&&!out.tc;
await ctx.close();
// ── 13) téléphone (390 px) : rien ne déborde ; barre des trous et « Tout compléter » (une colonne, champs pleine largeur, boutons et puces ≥ 34 px)
({ctx,page}=await open({viewport:{width:390,height:844},isMobile:true,hasTouch:true,deviceScaleFactor:2}));
await newAff(page,'O2610-64','Réseau tel M2','ouest',AFF0);
const w2=ms=>page.waitForTimeout(ms);const ov=()=>page.evaluate(()=>({sw:document.documentElement.scrollWidth,iw:window.innerWidth}));
out={o1:await ov(),nav:await page.evaluate(()=>{const n=document.getElementById('memoire-nav');if(!n)return null;const r=n.getBoundingClientRect();const bs=[...n.querySelectorAll('button')].map(b=>{const q=b.getBoundingClientRect();return Math.round(q.width)+'x'+Math.round(q.height);});return {r:Math.round(r.right),bs,t:n.textContent.replace(/\s+/g,' ').trim()};})};
await page.evaluate(()=>document.querySelector('#eq-app [data-act=af][data-v="mlbtc|"]').scrollIntoView({block:'center'}));await page.tap('#eq-app [data-act=af][data-v="mlbtc|"]');await w2(450);
out.o2=await ov();out.m=await page.evaluate(()=>{const b=document.querySelector('#modal.show .box');const rows=[...document.querySelectorAll('#m2-all .m2-row')].slice(0,6);return {right:b?Math.round(b.getBoundingClientRect().right):0,cols:rows.map(r=>getComputedStyle(r).gridTemplateColumns.split(' ').length),
  full:rows.filter(r=>r.querySelector('.m2-in')).every(r=>{const i=r.querySelector('.m2-in').getBoundingClientRect(),q=r.getBoundingClientRect();return i.width>=q.width-2;}),small:[...document.querySelectorAll('#modal.show .m2-chip,#modal.show .btn,#modal.show .m2-ret')].filter(e=>e.offsetParent&&e.getBoundingClientRect().height<34).length};});
await page.tap('#m2-in-0');await page.fill('#m2-in-0','Agence tel');await page.tap('#m2-allok');await w2(450);out.done=await toast();out.o3=await ov();
console.log('13) téléphone :',JSON.stringify(out));
C.c13=[out.o1,out.o2,out.o3].every(o=>o.sw<=o.iw)&&out.nav&&out.nav.r<=391&&out.nav.bs.every(s=>s.split('x').every(v=>+v>=34))&&/^⚠ \d+ infos/.test(out.nav.t)&&out.m.right<=391&&out.m.cols.every(n=>n===1)&&out.m.full&&out.m.small===0&&/^✓ 1 info complétée/.test(out.done);
await ctx.close();
C.console=logs.length===0;
const bad=Object.entries(C).filter(([k,v])=>!v).map(([k])=>k);console.log(bad.length?'RESULTAT: ECHEC '+bad.join(','):'RESULTAT: TOUT VERT');console.log(logs.length?logs:'[]');
await browser.close();
