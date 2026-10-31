// LOT DB (19/10/2026) — L'ONGLET « 💶 DÉBOURS » D'UNE AFFAIRE. Ethan : « créer tout l'aspect débours : par affaire, pouvoir faire des bons de commande rattachés à une
// affaire, que ça rentre les dépenses, toutes les heures des gars pointées par chantier × notre coût horaire, enlever au facturé […] tout un onglet bien vaste, bien pro ».
// Données 100 % FICTIVES (affaires O26xx-7x, « Villefictive », personnages de démo, base de prix test/fixture_prix.xlsx), hors connexion (rien ne part au serveur).
// Mardi 20/10/2026 09:00 (horloge figée). Coûts horaires de la base fictive (taux + FG chantier + FG structure + sinistre) : Soudeur 100 €/h, Manchonneur 80 €/h ;
// « Chef de chantier » n'est pas dans la base → taux saisi pour l'affaire (65 €/h).
// CALCUL ATTENDU (affaire O2609-77, chantier db_nord, marché 250 000 €, situations : sept. 60 000 + oct. 45 000 = 105 000 € facturés) :
//  · Karim (soudeur) : 7→11/09 5 × 8 h validées (40), 14→17/09 4 × 9 h validées (36), 18/09 7 h NON validées (à confirmer), 5→9/10 5 × 8 h (40) ; 21/09 8 h sur un AUTRE
//    chantier (pas comptées) → sept. 83 h = 8 300 € (dont 700 à confirmer), oct. 40 h = 4 000 € → 12 300 €
//  · Julien (manchonneur) : 7→11/09 5 × 8 h + samedi 12/09 5 h = 45 h = 3 600 € ; 5→7/10 3 × 8 h = 24 h = 1 920 € ; dimanche 11/10 6 h : HORS navette (lundi → samedi),
//    pas comptées → 5 520 €
//  · Ethan (chef) : 5 et 6/10 2 × 10 h = 20 h → 0 € tant que le taux manque (alerte), puis 20 × 65 = 1 300 €
//  · Achats : BC-2609-01 reçue 10 × 120 + 4 × 50 = 1 400 € (sept.) ; BC-2610-01 envoyée 2 500 € (oct.) → marquée facturée 2 650 € ; BC-2610-02 brouillon 999 € : listé,
//    NON compté ; BC-2610-03 (autre affaire) : absent → 3 900 € puis 4 050 €
//  · Notes de frais : 120 € TTC validée (10/09) → 100 € HT à 20 % de TVA (109,09 € à 10 %) ; 60 € saisie (en attente, non comptée) ; 40 € sur un autre chantier : absente
//  · Dépense saisie dans l'onglet : sous-traitance 3 000 € HT (08/10)
//  → TOUT, avant taux du chef et facture : débours 17 820 + 3 900 + 100 + 3 000 = 24 820 € ; marge 105 000 − 24 820 = 80 180 € ; reste 250 000 − 105 000 = 145 000 €
//  → après (taux chef 65, BC-2610-01 facturé 2 650) : MO 19 120, achats 4 050 → débours 26 270 € ; marge 78 730 € (75,0 %)
//  → mois de septembre : MO 11 900 + achats 1 400 + frais 100 = 13 400 € ; facturé 60 000 → marge 46 600 € ; octobre : 7 220 + 2 650 + 3 000 = 12 870 € ; facturé 45 000 → 32 130 €
//  · Chantier partagé db_sud (lot MU) entre O2601-70 (origine, 6 soudures tracées) et O2609-71 (4 soudures) : Karim 2 × 8 h = 16 h en octobre → part 40 % pour O2609-71 :
//    6,4 h = 640 € ; 60 % pour O2601-70 : 9,6 h = 960 € ; part saisie 50 % → 800 €
import { chromium } from 'playwright';
import fs from 'fs';import path from 'path';import {fileURLToPath} from 'url';
import { openXlsx } from '../src/xlsx.js';
const HERE=path.dirname(fileURLToPath(import.meta.url));
const BASE=process.env.BASE||'http://localhost:8815';
const SHOTS=process.env.SHOTS||'/root/work/db_shots';try{fs.mkdirSync(SHOTS,{recursive:true});}catch(e){}
const browser=await chromium.launch({headless:true, executablePath: process.env.CHROMIUM_PATH||undefined});
const ctx=await browser.newContext({viewport:{width:1366,height:900},acceptDownloads:true});const page=await ctx.newPage();
const logs=[];const watch=pg=>{pg.on('pageerror',e=>logs.push('PAGEERROR: '+e.message.slice(0,300)));pg.on('console',m=>{if(m.type()==='error'&&!/supabase|Failed to fetch|net::ERR|404|WebSocket/i.test(m.text()))logs.push(m.text().slice(0,200));});pg.on('dialog',d=>d.accept().catch(()=>{}));};watch(page);
await ctx.route(u=>!u.href.startsWith(BASE)&&/^https?:/.test(u.href),rt=>rt.fulfill({status:200,contentType:'application/json',body:/geopf|geo\.api/.test(rt.request().url())?'{"type":"FeatureCollection","features":[]}':'{}'})); /* aucun réseau extérieur */
const C={};const wait=ms=>page.waitForTimeout(ms);const J=o=>JSON.stringify(o);
const shot=async(pg,name)=>{try{await pg.screenshot({path:SHOTS+'/'+name+'.png',fullPage:false});}catch(e){console.log('capture '+name+' : '+e.message);}};
await page.clock.install({time:new Date(2026,9,20,9,0,0)}); /* mardi 20/10/2026 */
await page.goto(BASE+'/index.html');await wait(600);await page.evaluate(()=>{localStorage.clear();localStorage.setItem('trace:wide','1');});
await page.goto(BASE+'/vendor/');await wait(200); /* page statique de la même origine : l'appli ne tient plus la base IndexedDB → on peut la vider et y écrire la fixture */
await page.evaluate(()=>new Promise(r=>{try{const q=indexedDB.deleteDatabase('trace-kv');q.onsuccess=q.onerror=q.onblocked=()=>r();}catch(e){r();}}));
/* ── la fixture : registre (affaires, bons, notes de frais) et pointages écrits dans le miroir de l'appareil avant le chargement ── */
const AFF='O2609-77',A70='O2601-70',A71='O2609-71',A72='O2609-72',A73='O2609-73';
const at='2026-09-01T08:00:00.000Z';const row=(id,data)=>[id,{id,data,updated_at:at}];
const REG={affaire:Object.fromEntries([row(AFF,{num:AFF,nom:'Villefictive — Réseau Nord',client:'RÉGIE FICTIVE DES RÉSEAUX',ville:'Villefictive',cp:'99000',secteur:'ouest',etat:'en_cours',montant:250000,fact:{'2026-09':60000,'2026-10':45000},sites:['db_nord'],at,by:'Ethan L.'}),
    row(A70,{num:A70,nom:'Villefictive — Sud 2025',client:'RÉGIE FICTIVE DES RÉSEAUX',ville:'Villefictive',etat:'en_cours',montant:120000,sites:['db_sud'],at,by:'Ethan L.'}),
    row(A71,{num:A71,nom:'Villefictive — Sud 2026',client:'RÉGIE FICTIVE DES RÉSEAUX',ville:'Villefictive',etat:'en_cours',montant:80000,sites:['db_sud'],mutu:{site:'db_sud',at,by:'Ethan L.',etude:'etude_71'},at,by:'Ethan L.'}),
    row(A72,{num:A72,nom:'Villefictive — Antenne Est (devis)',client:'RÉGIE FICTIVE DES RÉSEAUX',ville:'Villefictive',etat:'devis',montant:30000,at,by:'Ethan L.'}),
    row(A73,{num:A73,nom:'Villefictive — Antenne Ouest (devis, rien)',client:'RÉGIE FICTIVE DES RÉSEAUX',ville:'Villefictive',etat:'devis',montant:20000,at,by:'Ethan L.'})]),
  commande:Object.fromEntries([row('BC-2609-01',{num:'BC-2609-01',etat:'recue',affaire:AFF,site:'db_nord',fournisseur:'Fournisseur Fictif Tubes',objet:'Tubes DN100 + manchons',lignes:[{designation:'Tube DN100 12 m',qte:10,unite:'u',pu:120},{designation:'Manchon DN100',qte:4,unite:'u',pu:50}],livraison:'2026-09-20',by:'Ethan L.',at:'2026-09-15T10:00:00.000Z'}),
    row('BC-2610-01',{num:'BC-2610-01',etat:'envoyee',affaire:AFF,site:'db_nord',fournisseur:'Location Fictive Engins',objet:'Mini-pelle 2 semaines',typeDepense:'location',lignes:[{designation:'Mini-pelle 2,5 t · 2 semaines',qte:1,unite:'forfait',pu:2500}],by:'Ethan L.',at:'2026-10-02T08:00:00.000Z'}),
    row('BC-2610-02',{num:'BC-2610-02',etat:'brouillon',affaire:AFF,site:'db_nord',fournisseur:'Brouillon Fictif',objet:'à préciser',lignes:[{designation:'x',qte:1,unite:'u',pu:999}],by:'Ethan L.',at:'2026-10-12T08:00:00.000Z'}),
    row('BC-2610-03',{num:'BC-2610-03',etat:'envoyee',affaire:A72,site:null,fournisseur:'Autre Fournisseur Fictif',objet:'autre affaire',lignes:[{designation:'y',qte:1,unite:'u',pu:5000}],by:'Ethan L.',at:'2026-10-03T08:00:00.000Z'})]),
  debours:Object.fromEntries([row('l:karim|nf1',{key:'l:karim',name:'Karim B.',date:'2026-09-10',montant:120,nature:'carburant',site:'db_nord',moyen:'Mes deniers (à rembourser)',justif:'ticket remis au chef',etat:'valide',validePar:'Ethan L.',at:'2026-09-10T18:00:00.000Z'}),
    row('l:karim|nf2',{key:'l:karim',name:'Karim B.',date:'2026-10-06',montant:60,nature:'repas',site:'db_nord',moyen:'Mes deniers (à rembourser)',justif:'ticket remis au chef',etat:'saisi',at:'2026-10-06T18:00:00.000Z'}),
    row('l:julien|nf3',{key:'l:julien',name:'Julien R.',date:'2026-09-09',montant:40,nature:'peage',site:'db_autre',moyen:'Carte SCR',justif:'ticket remis au chef',etat:'valide',validePar:'Ethan L.',at:'2026-09-09T18:00:00.000Z'})])};
const pt=(p,d,site,h0,h1,pause,ok)=>({p,d,site,status:ok?'valide':'declare',corr:null,events:[{t:'start',at:d+'T'+h0}].concat(pause?[{t:'pause',at:d+'T12:00'},{t:'resume',at:d+'T12:30'}]:[]).concat([{t:'end',at:d+'T'+h1}]),val:ok?[{by:'l:ethan',at:d+'T18:00'}]:[]});
const PTS=[];['07','08','09','10','11'].forEach(j=>{PTS.push(pt('l:karim','2026-09-'+j,'db_nord','07:30','16:00',true,true));PTS.push(pt('l:julien','2026-09-'+j,'db_nord','07:30','16:00',true,true));});
['14','15','16','17'].forEach(j=>PTS.push(pt('l:karim','2026-09-'+j,'db_nord','07:30','17:00',true,true)));PTS.push(pt('l:karim','2026-09-18','db_nord','07:30','15:00',true,false)); /* 7 h déclarées, pas validées */
PTS.push(pt('l:julien','2026-09-12','db_nord','07:30','12:30',false,true)); /* samedi 5 h */PTS.push(pt('l:karim','2026-09-21','db_autre','07:30','16:00',true,true)); /* autre chantier */
['05','06','07','08','09'].forEach(j=>PTS.push(pt('l:karim','2026-10-'+j,'db_nord','07:30','16:00',true,true)));['05','06','07'].forEach(j=>PTS.push(pt('l:julien','2026-10-'+j,'db_nord','07:30','16:00',true,true)));
PTS.push(pt('l:julien','2026-10-11','db_nord','08:00','14:00',false,true)); /* dimanche : hors navette */['05','06'].forEach(j=>PTS.push(pt('l:ethan','2026-10-'+j,'db_nord','07:00','17:30',true,true)));
['12','13'].forEach(j=>PTS.push(pt('l:karim','2026-10-'+j,'db_sud','07:30','16:00',true,true))); /* chantier partagé */
const idbSet=(k,v)=>page.evaluate(([k,v])=>new Promise(res=>{const q=indexedDB.open('trace-kv',1);q.onupgradeneeded=()=>q.result.createObjectStore('kv');q.onsuccess=()=>{const db=q.result;const tx=db.transaction('kv','readwrite');tx.objectStore('kv').put(v,k);tx.oncomplete=()=>{db.close();res(true);};tx.onerror=()=>{db.close();res(false);};};q.onerror=()=>res(false);q.onblocked=()=>res(false);}),[k,v]);
for(const k of Object.keys(REG))await idbSet('trace:reg:'+k,REG[k]);await idbSet('trace:pointages',PTS);
console.log('… fixture écrite, chargement');await page.goto(BASE+'/index.html');await wait(1500);{const s=await page.$('#loginSkip');if(s&&await s.isVisible())await s.click();await wait(800);}
/* les chantiers fictifs (copies de l'appareil) : db_nord, db_autre, db_sud partagé (lignes de l'origine sans affaire, lignes de O2609-71 avec l.aff) */
await page.evaluate(([A70,A71])=>{const T=window.TRACE;const mk=(id,name,lines)=>T.etude.addSite({id,name,w:200,h:200,lines,fiche:{ville:'Villefictive',secteur:'ouest'},conv:{msgs:[],seq:1},qse:{docs:[]},report:{welds:lines.reduce((s,l)=>s+(l.joints||[]).length,0)}});
  const line=(id,dn,len,nj,aff)=>Object.assign({id,dn,bar:12,single:true,length:len,els:[{kind:'pipe',dn,len}],joints:Array.from({length:nj},()=>({idx:0}))},aff?{aff}:{});
  mk('db_nord','Villefictive — Nord',[line('N1',100,120,10)]);mk('db_autre','Villefictive — Autre chantier',[line('X1',80,60,5)]);
  const sud={id:'db_sud',name:'Villefictive — Sud (partagé)',w:200,h:200,affaires:[A70,A71],lines:[line('S1',100,36,6),line('S2',80,24,4,A71)],fiche:{ville:'Villefictive',secteur:'ouest'},conv:{msgs:[],seq:1},qse:{docs:[]},mutu:{hist:[{aff:A71,at:'2026-09-01T08:00:00.000Z',etudeNom:'Étude Sud 2026',added:{lines:['S2']}}]}};T.etude.addSite(sud);
  T.state.userId='ethan';T.renderHome();},[A70,A71]);await wait(400);
const as=async who=>{await page.evaluate(async w=>{const T=window.TRACE;T.state.userId=w;T.renderHome();await new Promise(x=>setTimeout(x,200));document.getElementById('htCom').click();await new Promise(x=>setTimeout(x,300));},who);await wait(200);};
const click=async(sel)=>{await page.evaluate(s=>{const el=document.querySelector(s);if(!el)throw new Error('bouton absent '+s);el.click();},sel);await wait(300);};
const chg=async(sel,val)=>{await page.evaluate(([s,v])=>{const el=document.querySelector(s);if(!el)throw new Error('absent '+s);el.value=v;el.dispatchEvent(new Event('change',{bubbles:true}));},[sel,val]);await wait(300);};
const txt=()=>page.evaluate(()=>document.getElementById('eq-app').textContent.replace(/\s+/g,' '));
const openAff=async(num,tab)=>{await page.evaluate(async([n,t])=>{const T=window.TRACE;T.affaires.state().seg='cours';T.affaires.state().view='list';const b=[...document.querySelectorAll('#eq-app [data-act=af]')].find(x=>x.dataset.v==='open|'+n);if(b)b.click();else{T.affaires.state().cur=n;T.affaires.state().view='fiche';T.renderHome();}await new Promise(x=>setTimeout(x,250));const tb=document.querySelector('#eq-app [data-act=af][data-v="tab|'+t+'"]');if(tb)tb.click();},[num,tab]);await wait(500);};
const tot=(num,P)=>page.evaluate(([n,P])=>window.TRACE.debours.totaux(n,P),[num,P||null]);
const rows=(title,i)=>page.evaluate(([t,i])=>{const c=[...document.querySelectorAll('#eq-app .card')].find(c=>new RegExp('^'+t).test((c.querySelector('h3')||{}).textContent||''));const tb=c&&c.querySelectorAll('table')[i||0];return tb?[...tb.querySelectorAll('tr')].map(tr=>[...tr.children].map(td=>td.textContent.replace(/\s+/g,' ').trim()).join(' | ')):null;},[title,i||0]); /* lignes d'un tableau d'une carte (titre) */
console.log('… chantiers posés');
/* ── 0) la base de prix fictive (Commerce → ⚙ Base de prix SCR) ── */
await as('ethan');await click('#eq-app [data-act=af][data-v="seg|prix"]');
await page.setInputFiles('#eq-app input[data-afprix]',{name:'fixture_prix.xlsx',mimeType:'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',buffer:fs.readFileSync(path.join(HERE,'fixture_prix.xlsx'))});await wait(1800);
let out=await page.evaluate(()=>{const T=window.TRACE;const b=T.reg.get('prix','base');return {base:!!(b&&b.mo&&b.mo.postes),soud:b&&b.mo.postes[0]&&(b.mo.postes[0].taux+b.mo.postes[0].fgC+b.mo.postes[0].fgS+b.mo.postes[0].sin),affs:T.affaires.all().map(a=>a.num).sort(),bons:T.commandes.all().length,nf:T.commandes.debours().length,pts:T.espace.state().pointages.length,api:!!T.debours};});
console.log('0) fixture :',J(out));C.c0=out.base&&out.soud===100&&out.affs.join()==='O2601-70,O2609-71,O2609-72,O2609-73,O2609-77'&&out.bons===4&&out.nf===3&&out.pts===PTS.length&&out.api;
/* ── 1) droits : Karim (soudeur) n'a pas Commerce ; Ethan : l'onglet 💶 Débours suit Facturation ; une affaire en devis sans débours n'a pas l'onglet ── */
out=await page.evaluate(()=>{const T=window.TRACE;T.state.userId='karim';T.renderHome();return {karim:document.getElementById('htCom').style.display};});
await as('ethan');await openAff(AFF,'debours');
out.tabs=await page.evaluate(()=>[...document.querySelectorAll('#eq-app .eq-filtres .chip')].map(c=>c.textContent.trim()));out.tab=await page.evaluate(()=>window.TRACE.affaires.state().tab);
await openAff(A72,'debours');out.tabsDevisBon=await page.evaluate(()=>[...document.querySelectorAll('#eq-app .eq-filtres .chip')].map(c=>c.textContent.trim())); /* en devis mais un bon rattaché : l'onglet est là */
await openAff(A73,'debours');out.tabsDevis=await page.evaluate(()=>[...document.querySelectorAll('#eq-app .eq-filtres .chip')].map(c=>c.textContent.trim()));out.tabDevis=await page.evaluate(()=>window.TRACE.affaires.state().tab);
console.log('1) droits + onglet :',J(out));
C.c1=out.karim==='none'&&out.tabs.indexOf('💶 Débours')===out.tabs.indexOf('Facturation')+1&&out.tab==='debours'&&out.tabsDevisBon.includes('💶 Débours')&&!out.tabsDevis.includes('💶 Débours')&&out.tabDevis==='fiche';
/* ── 2) la dépense saisie (sous-traitance 3 000 € HT, 08/10) puis les 4 chiffres (période « tout »), avant taux du chef et facture ── */
await openAff(AFF,'debours');await click('#eq-app [data-act=x][data-v="db|lnew"]');
await page.evaluate(()=>{const g=id=>document.getElementById(id);g('dbd-date').value='2026-10-08';g('dbd-type').value='st';g('dbd-m').value='3000';g('dbd-lib').value='Terrassement tranchée rue Fictive';g('dbd-f').value='Terrassement Fictif SARL';g('dbd-com').value='facture TF-2026-118';});await click('#dbd-ok');
out={T:await tot(AFF),tiles:await page.evaluate(()=>[...document.querySelectorAll('#eq-app .db-tile')].map(t=>t.textContent.replace(/\s+/g,' ').trim())),txt:await txt()};
out.lig=await page.evaluate(n=>{const a=window.TRACE.affaires.get(n);return (a.debours&&a.debours.lignes||[]).map(l=>[l.type,l.montant,l.lib,l.fournisseur,l.date,l.by]);},AFF);
console.log('2) 4 chiffres (tout) :',J({...out,txt:out.txt.slice(0,100)}));
const T2=out.T;
C.c2=T2&&T2.fact===105000&&T2.mo===17820&&T2.moConf===700&&T2.h===212&&T2.hConf===7&&T2.ach===3900&&T2.nf===100&&T2.st===3000&&T2.loc===0&&T2.aut===0&&T2.deb===24820&&T2.marge===80180&&T2.reste===145000&&T2.sansTaux===true
  &&out.tiles[0].startsWith('105 000 €')&&/facturé HT/.test(out.tiles[0])&&/marché 250 000 €/.test(out.tiles[0])&&out.tiles[1].startsWith('24 820 €')&&/dont 700 € de main-d'œuvre à confirmer/.test(out.tiles[1])&&out.tiles[2].startsWith('80 180 €')&&/76,4 % du facturé/.test(out.tiles[2])&&out.tiles[3].startsWith('145 000 €')&&/42 % facturé/.test(out.tiles[3])
  &&J(out.lig)===J([['st',3000,'Terrassement tranchée rue Fictive','Terrassement Fictif SARL','2026-10-08','Ethan L.']])&&/Chef de chantier.*pas dans la base de prix : à renseigner/.test(out.txt);
/* ── 3) le tableau main-d'œuvre par personne (tout), le taux du chef (65 €/h, gardé dans a.debours.taux), le bon marqué facturé (2 650 €) ── */
out={pers:await rows("Main-d'œuvre")};
await chg('#eq-app input[data-xin="db|taux|chef"]','65');
out.T3=await tot(AFF);out.taux=await page.evaluate(n=>window.TRACE.affaires.get(n).debours.taux,AFF);out.txt3=await txt();
await click('#eq-app [data-act=x][data-v="db|bcfact|BC-2610-01"]');await page.evaluate(()=>{document.getElementById('dbf-m').value='2650';document.getElementById('dbf-n').value='FA-FICTIVE-77';});await click('#dbf-ok');
out.T3b=await tot(AFF);out.bc=await page.evaluate(()=>{const c=window.TRACE.reg.get('commande','BC-2610-01');return {etat:c.etat,m:c.facture&&c.facture.montant,num:c.facture&&c.facture.num};});out.tiles=await page.evaluate(()=>[...document.querySelectorAll('#eq-app .db-tile')].map(t=>t.textContent.replace(/\s+/g,' ').trim()));
out.ach=await rows('Achats');
console.log('3) taux chef + facturé :',J({...out,txt3:undefined}));
C.c3=out.pers&&out.pers.length===5&&out.pers[1]==='Karim B. | Soudeur | 123 hdont 7 h à confirmer | 12 300 €dont 700 €'&&out.pers[2]==='Julien R. | Manchonneur | 69 h | 5 520 €'&&out.pers[3]==='Ethan L. | Chef de chantier ⚠ taux | 20 h | 0 €'&&out.pers[4]==='Total | 212 hdont 7 h à confirmer | 17 820 €'
  &&out.T3.mo===19120&&out.T3.deb===26120&&out.T3.sansTaux===false&&out.taux.chef===65&&/Chef de chantier.*taux de l'affaire/.test(out.txt3)
  &&out.T3b.ach===4050&&out.T3b.deb===26270&&out.T3b.marge===78730&&out.bc.etat==='facturee'&&out.bc.m===2650&&out.bc.num==='FA-FICTIVE-77'&&out.tiles[1].startsWith('26 270 €')&&out.tiles[2].startsWith('78 730 €')&&/75,0 % du facturé/.test(out.tiles[2])
  &&out.ach.some(r=>/^BC-2610-0102\/10\/2026 \| Location Fictive EnginsMini-pelle 2 semaines \| Facturée \| 2 500,00 € \| 2 650,00 € \| 2 650,00 € \| $/.test(r))&&out.ach.some(r=>/^BC-2609-0115\/09\/2026 \| Fournisseur Fictif TubesTubes DN100 \+ manchons \| Reçuelivr\. 20\/09\/2026 \| 1 400,00 € \| — \| 1 400,00 € \| ✓ Facturé$/.test(r))&&out.ach.some(r=>/^BC-2610-0212\/10\/2026 \| Brouillon Fictifà préciser \| Brouillon \| 999,00 € \| — \| non compté \| ✓ Facturé$/.test(r))&&!out.ach.some(r=>/BC-2610-03/.test(r))&&out.ach.some(r=>/^Total achats comptés \|  \| 4 050,00 € \| $/.test(r));
/* ── 4) la période : septembre, octobre, année 2026 ; la courbe et le tableau des mois ── */
await click('#eq-app [data-act=x][data-v="db|per|mois"]');await click('#eq-app [data-act=x][data-v="db|m|2026-09"]');
out={sep:await tot(AFF,{k:'mois',m:'2026-09'}),tiles:await page.evaluate(()=>[...document.querySelectorAll('#eq-app .db-tile')].map(t=>t.textContent.replace(/\s+/g,' ').trim())),lab:await page.evaluate(()=>(document.querySelector('#eq-app .db-per .db-nav b')||{}).textContent)};
await click('#eq-app [data-act=x][data-v="db|m|2026-10"]');out.oct=await tot(AFF,{k:'mois',m:'2026-10'});out.tilesOct=await page.evaluate(()=>[...document.querySelectorAll('#eq-app .db-tile')].map(t=>t.textContent.replace(/\s+/g,' ').trim()));
await click('#eq-app [data-act=x][data-v="db|per|annee"]');out.an=await tot(AFF,{k:'annee',y:'2026'});out.an25=await tot(AFF,{k:'annee',y:'2025'});
out.chart=await page.evaluate(()=>{const c=document.querySelector('#eq-app .db-chart');const svg=c.querySelector('svg');c.querySelector('details').open=true;return {lines:svg.querySelectorAll('polyline').length,dots:svg.querySelectorAll('circle').length,labels:[...svg.querySelectorAll('text')].map(t=>t.textContent).filter(t=>/facturé|débours/.test(t)),rows:[...c.querySelectorAll('table tr')].map(tr=>[...tr.children].map(td=>td.textContent.replace(/\s+/g,' ').trim()).join(' | '))};});
await click('#eq-app [data-act=x][data-v="db|per|tout"]');
console.log('4) périodes + courbe :',J(out));
C.c4=out.sep.deb===13400&&out.sep.mo===11900&&out.sep.moConf===700&&out.sep.ach===1400&&out.sep.nf===100&&out.sep.st===0&&out.sep.fact===60000&&out.sep.marge===46600&&out.tiles[0].startsWith('60 000 €')&&out.tiles[1].startsWith('13 400 €')&&out.tiles[2].startsWith('46 600 €')&&out.lab==='septembre 2026'
  &&out.oct.deb===12870&&out.oct.mo===7220&&out.oct.ach===2650&&out.oct.st===3000&&out.oct.fact===45000&&out.oct.marge===32130&&out.tilesOct[1].startsWith('12 870 €')&&out.an.deb===26270&&out.an.fact===105000&&out.an25.deb===0&&out.an25.fact===0
  &&out.chart.lines===2&&out.chart.dots===20/* 10 mois jusqu'à octobre 2026 × 2 séries : les mois à venir ne sont pas tracés */&&out.chart.labels.join()==='facturé 45 k€,débours 13 k€'&&out.chart.rows.length===3&&out.chart.rows[1]==='Sept 2026 | 60 000 € | 13 400 € | 46 600 € | 77,7 %'&&out.chart.rows[2]==='Oct 2026 | 45 000 € | 12 870 € | 32 130 € | 71,4 %';
/* ── 5) TVA des notes de frais réglable (10 % → 109,09 € HT), puis retour à 20 ── */
await chg('#eq-app input[data-xin="db|tva"]','10');out={t10:await tot(AFF),tva:await page.evaluate(n=>window.TRACE.affaires.get(n).debours.tva,AFF),txt:await txt()};
await chg('#eq-app input[data-xin="db|tva"]','20');out.t20=await tot(AFF);
console.log('5) TVA :',J({...out,txt:(out.txt.match(/Notes de frais.{0,160}/)||[''])[0]}));
C.c5=out.tva===10&&Math.abs(out.t10.nf-109.09)<0.01&&Math.abs(out.t10.deb-26279.09)<0.01&&/109,09 €/.test(out.txt)&&out.t20.nf===100&&out.t20.deb===26270;
/* ── 6) une 2e dépense (location 500 €) : ajoutée, modifiée (550), retirée ; la note de frais « en attente » est à part ── */
await click('#eq-app [data-act=x][data-v="db|lnew"]');await page.evaluate(()=>{const g=id=>document.getElementById(id);g('dbd-date').value='2026-10-14';g('dbd-type').value='loc';g('dbd-m').value='500';g('dbd-lib').value='Groupe électrogène';g('dbd-f').value='Loueur Fictif';});await click('#dbd-ok');
out={add:await tot(AFF)};const lid=await page.evaluate(n=>(window.TRACE.affaires.get(n).debours.lignes.find(l=>l.type==='loc')||{}).id,AFF);
await click(`#eq-app [data-act=x][data-v="db|ledit|${lid}"]`);await page.evaluate(()=>{document.getElementById('dbd-m').value='550';});await click('#dbd-ok');out.edit=await tot(AFF);
await click(`#eq-app [data-act=x][data-v="db|lrm|${lid}"]`);out.rm=await tot(AFF);out.lignes=await page.evaluate(n=>window.TRACE.affaires.get(n).debours.lignes.map(l=>[l.type,l.montant,!!l.deleted]),AFF);
out.nf=await rows('Notes de frais');
console.log('6) dépenses + notes de frais :',J(out));
C.c6=out.add.loc===500&&out.add.deb===26770&&out.edit.loc===550&&out.edit.deb===26820&&out.rm.loc===0&&out.rm.deb===26270&&J(out.lignes)===J([['st',3000,false],['loc',550,true]])
  &&out.nf.includes('10/09/2026 | Karim B. | Carburant | Validé | 120,00 € | 100,00 €')&&out.nf.includes('Total validées (comptées) |  | 100,00 €')&&out.nf.some(r=>/En attente de validation \(non comptées\) : 1/.test(r))&&out.nf.includes('06/10/2026 | Karim B. | Repas | Saisi | 60,00 € | 50,00 €')&&!out.nf.some(r=>/Julien/.test(r));
/* ── 7) ⬇ Excel : 5 feuilles, la synthèse porte les chiffres, la main-d'œuvre une ligne par jour pointé (26 : pas le dimanche, pas l'autre chantier) ── */
const dlP=page.waitForEvent('download',{timeout:8000}).catch(()=>null);await click('#eq-app [data-act=x][data-v="db|xls"]');const dl=await dlP;
out={fn:dl?dl.suggestedFilename():null};if(dl){const p=await dl.path();const buf=fs.readFileSync(p);const wb=await openXlsx(buf.buffer.slice(buf.byteOffset,buf.byteOffset+buf.byteLength));out.sheets=wb.sheets.map(s=>s.name);const syn=await wb.sheet('Synthèse');const find=lab=>{for(let r=1;r<=60;r++)if(syn.at(1,r)===lab)return syn.at(2,r);return null;};out.fact=find('Facturé HT');out.deb=find('Débours HT');out.marge=find('Marge HT');out.mo=find('Main-d\'œuvre');out.sept=(()=>{for(let r=1;r<=60;r++)if(syn.at(1,r)==='Sept 2026')return [syn.at(2,r),syn.at(3,r),syn.at(4,r)];return null;})();
  const mo=await wb.sheet('Main-d\'œuvre');let n=0;for(let r=2;r<=200;r++){if(mo.at(1,r))n++;}out.moRows=n;out.moHead=[1,2,3,4,5,6,7,8,9,10,11].map(c=>mo.at(c,1));out.sun=(()=>{for(let r=2;r<=200;r++)if(mo.at(1,r)==='2026-10-11')return true;return false;})();}
console.log('7) export :',J(out));
C.c7=out.fn==='Debours_O2609-77.xlsx'&&J(out.sheets)===J(['Synthèse','Main-d\'œuvre','Achats','Notes de frais','Dépenses'])&&out.fact===105000&&out.deb===26270&&out.marge===78730&&out.mo===19120&&J(out.sept)===J([60000,13400,46600])&&out.moRows===26&&out.moHead[8]==='Coût horaire'&&out.moHead[9]==='Coût HT'&&!out.sun;
/* ── 8) 🖨 Imprimer : la page A4 (charte) porte les 4 chiffres et les tableaux ── */
const popP=ctx.waitForEvent('page',{timeout:8000}).catch(()=>null);await click('#eq-app [data-act=x][data-v="db|print"]');const pop=await popP;
out={pop:!!pop};if(pop){await pop.waitForTimeout(500);out.title=await pop.title();out.t=await pop.evaluate(()=>([...document.body.childNodes].filter(n=>n.nodeName!=='SCRIPT').map(n=>n.textContent).join('') /* 31/10 : le gros script est en fin de <body> (écran de chargement) — son texte n'est pas du texte de la page */).replace(/\s+/g,' '));out.h2=await pop.evaluate(()=>[...document.querySelectorAll('h2')].map(h=>h.textContent.replace(/\s+/g,' ').trim()));await pop.close();}
console.log('8) impression :',J({...out,t:(out.t||'').slice(0,1500)}));
C.c8=out.pop&&out.title==='Débours — O2609-77'&&/105 000 €/.test(out.t)&&/26 270 €/.test(out.t)&&/78 730 €/.test(out.t)&&/145 000 €/.test(out.t)&&/Karim B\./.test(out.t)&&/Terrassement Fictif SARL/.test(out.t)&&out.h2.some(h=>/^Main-d'œuvre · 212 h · 19 120 €$/.test(h))&&out.h2.some(h=>/^Achats · bons de commande · 4 050 €$/.test(h));
await wait(2800);await page.setViewportSize({width:1366,height:3000});await wait(300);await shot(page,'db_pc_onglet');await page.setViewportSize({width:1366,height:900});await wait(200); /* capture PC : tout l'onglet d'un coup */
/* ── 9) « ＋ Bon de commande » : l'écran des bons s'ouvre sur le nouveau bon pré-rempli (affaire, chantier) ; « ‹ Affaire » revient à l'onglet ; le bon vide (0 €) reste listé ── */
await click('#eq-app [data-act=x][data-v="db|bcnew"]');
out=await page.evaluate(()=>{const T=window.TRACE;const c=T.commandes.all().find(x=>x.num==='BC-2610-04');return {tab:T.state.homeTab,fiche:(document.querySelector('#eq-app .af-num')||{}).textContent,aff:c&&c.affaire,site:c&&c.site,etat:c&&c.etat,sel:(document.querySelector('#eq-app select[data-cmdf=affaire]')||{}).value,back:!!document.querySelector('#eq-app [data-act=cmd][data-v="aff|O2609-77"]')};});
await chg('#eq-app input[data-cmdf=fournisseur]','Fournisseur Fictif Béton');await click('#eq-app [data-act=cmd][data-v="aff|O2609-77"]');
out.ret={tab:await page.evaluate(()=>window.TRACE.state.homeTab),aTab:await page.evaluate(()=>window.TRACE.affaires.state().tab),cur:await page.evaluate(()=>window.TRACE.affaires.state().cur),listed:(await rows('Achats')||[]).some(r=>/^BC-2610-0420\/10\/2026 \| Fournisseur Fictif Béton \| Brouillon \| 0,00 € \| — \| non compté \| ✓ Facturé$/.test(r))};
console.log('9) bon depuis l\'onglet :',J(out));
C.c9=out.tab==='affaire' /* 31/10 matin : les bons de commande vivent dans le module Affaire (avant : Pilotage) */&&/BC-2610-04/.test(out.fiche)&&out.aff==='O2609-77'&&out.site==='db_nord'&&out.etat==='brouillon'&&out.sel==='O2609-77'&&out.back&&out.ret.tab==='commerce'&&out.ret.aTab==='debours'&&out.ret.cur==='O2609-77'&&out.ret.listed;
/* ── 10) lecture seule : Sophie en conducteur (voit les affaires, ne les modifie pas) — heures visibles, ni coûts horaires ni boutons ; un champ forcé est refusé ── */
await page.evaluate(()=>window.TRACE.demoPoste('sophie','conducteur'));await as('sophie');await openAff(AFF,'debours');
out={can:await page.evaluate(()=>window.TRACE.acces.can('affaires.edit')),view:await page.evaluate(()=>window.TRACE.acces.can('affaires.view')),txt:await txt(),inputs:await page.evaluate(()=>document.querySelectorAll('#eq-app [data-xin^="db|"]').length),btns:await page.evaluate(()=>[...document.querySelectorAll('#eq-app [data-act=x][data-v^="db|"]')].map(b=>b.dataset.v).filter(v=>/bcnew|lnew|ledit|lrm|bcfact/.test(v)).length),tiles:await page.evaluate(()=>[...document.querySelectorAll('#eq-app .db-tile')].map(t=>t.textContent.replace(/\s+/g,' ').trim()))};
out.pers=await rows("Main-d'œuvre");
await page.evaluate(()=>{const i=document.createElement('input');i.dataset.xin='db|taux|chef';i.value='999';document.getElementById('eq-app').appendChild(i);i.dispatchEvent(new Event('change',{bubbles:true}));});await wait(300);
out.taux=await page.evaluate(n=>window.TRACE.affaires.get(n).debours.taux,AFF);out.toast=await page.evaluate(()=>(document.querySelector('#toast')||{}).textContent||'');
console.log('10) lecture seule :',J({...out,txt:(out.txt.match(/Main-d'œuvre.{0,120}/)||[''])[0]}));
C.c10=out.can===false&&out.view===true&&out.inputs===0&&out.btns===0&&out.tiles[1].startsWith('26 270 €')&&out.pers.length===5&&out.pers[1]==='Karim B. | Soudeur | 123 hdont 7 h à confirmer'&&out.pers[0]==='Personne | Poste | Heures'&&!/€\/h/.test(out.txt)&&/réservés au bureau/.test(out.txt)&&out.taux.chef===65&&/Lecture seule/.test(out.toast);
/* ── 11) chantier partagé (lot MU) : seulement la part de l'affaire — 40 % pour O2609-71 (4 / 10 soudures), 60 % pour l'origine ; part saisie 50 % ── */
await as('ethan');await openAff(A71,'debours');
out={T71:await tot(A71),txt:await txt(),pc:await page.evaluate(()=>(document.querySelector('#eq-app input[data-xin^="db|part|"]')||{}).placeholder)};
await openAff(A70,'debours');out.T70=await tot(A70);
await openAff(A71,'debours');await chg('#eq-app input[data-xin="db|part|db_sud"]','50');out.T71b=await tot(A71);out.part=await page.evaluate(n=>window.TRACE.affaires.get(n).debours.part,A71);out.txt2=await txt();
console.log('11) chantier partagé :',J({...out,txt:(out.txt.match(/Chantier partagé.{0,200}/)||[''])[0],txt2:(out.txt2.match(/Chantier partagé.{0,120}/)||[''])[0]}));
C.c11=Math.abs(out.T71.h-6.4)<0.001&&out.T71.mo===640&&out.T71.deb===640&&/Chantier partagé « Villefictive — Sud \(partagé\) » \(avec O2601-70\) : seule la part de l'affaire compte — 40 % \(soudures du tracé : 4 \/ 10\)/.test(out.txt)&&out.pc==='40'
  &&Math.abs(out.T70.h-9.6)<0.001&&out.T70.mo===960&&out.T71b.mo===800&&out.part.db_sud===50&&/50 % \(saisie\)/.test(out.txt2);
/* ── 12) vue d'ensemble (Commerce → Reporting) : affaires en cours triées par marge la plus faible, alerte débours > facturé, clic → l'onglet ── */
await click('#eq-app [data-act=af][data-v="back|"]');await click('#eq-app [data-act=af][data-v="seg|rep"]');
out=await page.evaluate(()=>{const c=document.querySelector('#eq-app .db-ov');return c?{rows:[...c.querySelectorAll('table tr')].map(tr=>[...tr.children].map(td=>td.textContent.replace(/\s+/g,' ').trim()).join(' | ')),alerts:c.querySelectorAll('tr.db-alert').length,h3:c.querySelector('h3').textContent.replace(/\s+/g,' ').trim()}:null;});
await wait(2800);await page.setViewportSize({width:1366,height:1500});await wait(300);await shot(page,'db_pc_reporting');await page.setViewportSize({width:1366,height:900});await wait(200);
await click('#eq-app .db-ov [data-act=x][data-v="db|open|O2609-77"]');out.open={cur:await page.evaluate(()=>window.TRACE.affaires.state().cur),tab:await page.evaluate(()=>window.TRACE.affaires.state().tab),view:await page.evaluate(()=>window.TRACE.affaires.state().view)};
console.log('12) vue d\'ensemble :',J(out));
C.c12=out&&out.rows.length===5&&/^O2601-70 Villefictive — Sud 2025 ⚠ débours > facturé \| — \| 960 € \| [-−]960 € \| — \| 120 000 €$/.test(out.rows[1])&&/^O2609-71 Villefictive — Sud 2026 ⚠ débours > facturé \| — \| 800 € \| [-−]800 € \| — \| 80 000 €$/.test(out.rows[2])&&out.rows[3]==='O2609-77 Villefictive — Réseau Nord | 105 000 € | 26 270 € | 78 730 € | 75,0 % | 145 000 €'&&out.rows[4]==='Total | 105 000 € | 28 030 € | 76 970 € | 73,3 % | '&&out.alerts===2&&/3 affaires · 2 en alerte/.test(out.h3)&&out.open.cur==='O2609-77'&&out.open.tab==='debours'&&out.open.view==='fiche';
/* ── 13) téléphone 390 px : rien ne déborde, boutons ≥ 40 px (secondaires ≥ 34), fenêtre de dépense lisible ── */
await page.setViewportSize({width:390,height:844});await wait(400);await page.evaluate(()=>{localStorage.removeItem('trace:wide');window.TRACE.renderHome();});await wait(300);await openAff(AFF,'debours');
out=await page.evaluate(()=>{const app=document.getElementById('eq-app');const sw=document.documentElement.scrollWidth;const over=[...app.querySelectorAll('.card,.db-tiles,.db-per,.db-tile')].filter(e=>e.getBoundingClientRect().right>391).map(e=>e.className).slice(0,5);
  const small=[...app.querySelectorAll('[data-act=x][data-v^="db|"],[data-xin^="db|"]')].filter(b=>{const r=b.getBoundingClientRect();return r.height>0&&r.height<(b.classList.contains('primary')?40:34);}).map(b=>(b.dataset.v||b.dataset.xin)+':'+Math.round(b.getBoundingClientRect().height));
  const tables=[...app.querySelectorAll('table')].every(t=>{let p=t.parentElement;while(p&&p!==app){if(getComputedStyle(p).overflowX==='auto'||getComputedStyle(p).overflowX==='scroll')return true;p=p.parentElement;}return false;});return {sw,over,small,tables,tiles:app.querySelectorAll('.db-tile').length};});
await wait(2800);await shot(page,'db_tel_onglet');const scrollTo=t=>page.evaluate(t=>{const c=[...document.querySelectorAll('#eq-app .card')].find(c=>new RegExp('^'+t).test((c.querySelector('h3')||{}).textContent||''));if(c)c.scrollIntoView({block:'start'});},t);
await scrollTo('Facturé / débours');await wait(300);await shot(page,'db_tel_courbe');await scrollTo("Main-d'œuvre");await wait(300);await shot(page,'db_tel_mo');await scrollTo('Achats');await wait(300);await shot(page,'db_tel_achats');await page.evaluate(()=>{const c=document.querySelector('#eq-app .card');if(c)c.scrollIntoView({block:'start'});});await wait(200);
await click('#eq-app [data-act=x][data-v="db|lnew"]');out.modal=await page.evaluate(()=>{const b=document.querySelector('#modal .box');const r=b.getBoundingClientRect();return {w:Math.round(r.width),ok:[...b.querySelectorAll('.btn')].every(x=>x.getBoundingClientRect().height>=40),h:[...b.querySelectorAll('.btn')].map(x=>Math.round(x.getBoundingClientRect().height))};});await shot(page,'db_tel_depense');await page.evaluate(()=>{const b=document.querySelector('#modal [data-close]');if(b)b.click();});await wait(200);
console.log('13) 390 px :',J(out));
C.c13=out.sw<=390&&out.over.length===0&&out.small.length===0&&out.tables&&out.tiles===4&&out.modal.w<=390&&out.modal.ok;
C.c14=logs.length===0;
const bad=Object.entries(C).filter(([k,v])=>!v).map(([k])=>k);console.log(bad.length?'RESULTAT: ECHEC '+bad.join(','):'RESULTAT: TOUT VERT');console.log(logs.length?logs:'[]');
await browser.close();
