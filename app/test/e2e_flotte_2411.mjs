// FLOTTE — retours d'Ethan sur la recette du 19/11 (24/11/2026) :
//  « Qui a quoi : il faut pouvoir chercher un nom et qu'il y ait l'historique calendrier de tout ce qu'il a eu, s'il a eu plusieurs véhicules : de tel jour à tel jour tel
//    véhicule, avec un raccourci pour passer sur la fiche du véhicule, qui lui aussi doit afficher son historique entre quelles mains il est passé.
//    Où sont les véhicules : ça doit plutôt dire attribué à un collaborateur, sur chantier, au dépôt, et ceux laissés à prendre ; des véhicules peuvent être attribués à un
//    chantier et sont donc sous la responsabilité du chef de chantier de ce chantier, pour des véhicules qui dépannent et jonglent dans la journée entre plusieurs personnes.
//    Enlève l'ancienne vision Flotte, et le bas de l'écran est coupé. »
//  g1  données réelles : un véhicule créé (écran existant) → fiche → « Confié à » (au dépôt) → « Affecter à un chantier » → chantier fictif dont le chef est Ethan L. :
//      enregistré sur la fiche (chantierAffecte + historique), « sous la responsabilité de Ethan L. » ; « Retirer du chantier » → au dépôt, l'historique garde la période
//  g2  pas de bouton « Ancien écran Flotte » ; le menu du module tient dans l'écran (bas visible) à 1 366 × 768
//  g3  jeu fictif de la maquette : accueil « Où sont les véhicules » = Attribués à un collaborateur · Affectés à un chantier · Au dépôt · Laissés à prendre ;
//      la somme = le nombre de véhicules ; un bouton → la liste filtrée (« Confié »), chaque ligne a un conducteur
//  g4  Qui a quoi : « kevin » (sans accent) → la carte de Kévin R. : 2 véhicules (FL-104-AB aujourd'hui, FL-102-AA du 30/10/2020 au 06/01/2023), frise à 2 segments ;
//      une ligne → la fiche du véhicule, onglet Conducteurs (les mains successives) ; le tableau du dessous ne garde que ses véhicules
//  g5  jeu fictif : affecter FL-104-AB au chantier « Laval Démo » → accueil : « Affectés à un chantier » = 1 ; la fiche le dit ; retirer → 0
//  g6  téléphone 390 px : Qui a quoi avec la recherche, sans débordement de page ; console propre
import { chromium } from 'playwright'; import fs from 'fs';
const BASE=process.env.BASE||'http://127.0.0.1:8766';const J=x=>JSON.stringify(x);const C={};const logs=[];
const browser=await chromium.launch({headless:true});const FIX=fs.readFileSync(new URL('./fixtures/flotte_demo.js',import.meta.url),'utf8');const W=(pg,ms)=>pg.waitForTimeout(ms);
const page=await browser.newPage({viewport:{width:1366,height:768},deviceScaleFactor:1});const T=(f,a)=>page.evaluate(f,a);
page.on('pageerror',e=>logs.push('PAGEERROR: '+e.message.slice(0,300)));page.on('console',m=>{if(m.type()==='error'&&!/net::ERR|Failed to fetch|404|supabase|fonts/i.test(m.text()))logs.push(m.text().slice(0,200));});
page.on('dialog',d=>d.accept().catch(()=>{}));
await page.route(u=>/geopf|geo\.api|open-meteo/.test(u.hostname),r=>r.fulfill({status:200,contentType:'application/json',body:'{}'}));
await page.clock.install({time:new Date(2026,10,10,9,0,0)}); /* mardi 10/11/2026, comme la maquette */
await page.goto(BASE+'/index.html');await W(page,600);await T(()=>{localStorage.clear();localStorage.setItem('trace:wide','1');});await T(()=>new Promise(r=>{try{const q=indexedDB.deleteDatabase('trace-kv');q.onsuccess=q.onerror=q.onblocked=()=>r();}catch(e){r();}}));
await page.reload();await W(page,1500);{const s=await page.$('#loginSkip');if(s&&await s.isVisible())await s.click();await W(page,700);}
/* un chantier fictif dont le chef est Ethan L. */
await T(()=>{const Tr=window.TRACE;const src=Tr.sites[Object.keys(Tr.sites).find(k=>k!=='__vide'&&Tr.sites[k]&&Tr.sites[k].lines)];const x=JSON.parse(JSON.stringify(src));x.id='demo_vf';x.name='Villefictive — Centre';x.fiche={ville:'Caen',secteur:'ouest',chef:'l:ethan'};x.conv={msgs:[],seq:1};x.qse={docs:[]};delete x.geo;Tr.sites.demo_vf=x;Tr.state.userId='ethan';Tr.renderHome();});await W(page,500);
await T(()=>document.getElementById('htParc').click());await W(page,900);
const nav=h=>T(x=>{const b=document.querySelector('#eq-app .af-nav [data-h="'+x+'"]');if(b)b.click();},h).then(()=>W(page,600));
const txt=()=>T(()=>(document.getElementById('eq-app')||document.body).textContent.replace(/\s+/g,' '));
const clickTxt=(sel,re)=>T(([s,r])=>{const b=[...document.querySelectorAll(s)].find(x=>new RegExp(r).test(x.textContent));if(b){b.click();return true;}return false;},[sel,re]);
// ── g1) données réelles : créer un véhicule, l'affecter à un chantier, le retirer
await nav('vehicules');await clickTxt('#eq-app .af-main button','Véhicule');await W(page,500);
await T(()=>{const i=document.querySelector('#modal input, .modal input, [role=dialog] input');i.value='ZZ-902-ZZ';const b=[...document.querySelectorAll('#modal button, .modal button, [role=dialog] button')].find(x=>/Créer/.test(x.textContent));b.click();});await W(page,900);
await nav('vehicules');await T(()=>{const r=[...document.querySelectorAll('#eq-app .af-main tbody tr')].find(x=>/ZZ-902-ZZ/.test(x.textContent));if(r)r.click();});await W(page,600);
let out={confie0:await T(()=>{const s=document.querySelector('#eq-app [data-confie]');return s?s.dataset.confie+' | '+s.textContent.replace(/\s+/g,' ').slice(0,80):'';})};
await clickTxt('#eq-app [data-confie] button','Affecter à un chantier');await W(page,400);
out.opts=await T(()=>[...document.querySelectorAll('#fl-aff option')].map(o=>o.value+'|'+o.textContent));
await T(()=>{const s=document.getElementById('fl-aff');s.value='demo_vf';});await clickTxt('.fl-root .af-fenetre button','^\\s*Affecter\\s*$');await W(page,700);
out.reg=await T(()=>{const v=window.TRACE.flotte.get('ZZ-902-ZZ');return {aff:v&&v.chantierAffecte?v.chantierAffecte.id:null,hist:(v&&v.chantierHist||[]).map(h=>h.id+'|'+(h.au?'fini':'en cours'))};});
out.confie1=await T(()=>{const s=document.querySelector('#eq-app [data-confie]');return s?s.dataset.confie+' | '+s.textContent.replace(/\s+/g,' '):'';});
await clickTxt('#eq-app [data-confie] button','Retirer du chantier');await W(page,600);
out.reg2=await T(()=>{const v=window.TRACE.flotte.get('ZZ-902-ZZ');return {aff:v&&v.chantierAffecte?v.chantierAffecte.id:null,hist:(v&&v.chantierHist||[]).map(h=>h.id+'|'+(h.au?'fini':'en cours'))};});
out.confie2=await T(()=>{const s=document.querySelector('#eq-app [data-confie]');return s?s.dataset.confie+' | '+s.textContent.replace(/\s+/g,' '):'';});
console.log('g1)',J(out));
C.g1=/^depot \| Confié à\s*🏠 Au dépôt/.test(out.confie0)&&out.opts.some(o=>/^demo_vf\|Villefictive — Centre · chef : Ethan L\./.test(o))&&out.reg.aff==='demo_vf'&&J(out.reg.hist)===J(['demo_vf|en cours'])
  &&/^chantier \|/.test(out.confie1)&&/Affecté au chantier Villefictive — Centre · sous la responsabilité de Ethan L\. \(chef de chantier\)/.test(out.confie1)&&out.reg2.aff===null&&J(out.reg2.hist)===J(['demo_vf|fini'])&&/^depot \|/.test(out.confie2)&&/Affectations · 1/.test(out.confie2);
// ── g2) plus d'ancien écran, le menu tient dans l'écran
out=await T(()=>{const n=document.querySelector('#eq-app .af-nav');const r=n?n.getBoundingClientRect():null;const last=n?[...n.querySelectorAll('[data-h]')].pop():null;const lr=last?last.getBoundingClientRect():null;const sc=document.getElementById('homeBody');const sr=sc?sc.getBoundingClientRect():{bottom:innerHeight};
  const cs=n?getComputedStyle(n):{};return {ancien:!!document.querySelector('#eq-app [data-v="fl|ancien|1"]'),txt:/Ancien écran Flotte/.test(document.getElementById('eq-app').textContent),navBas:r?Math.round(r.bottom):0,dernier:lr?Math.round(lr.bottom):0,vue:Math.round(Math.min(innerHeight,sr.bottom)),defile:!!n&&/auto|scroll/.test(cs.overflowY)&&n.scrollHeight>n.clientHeight};});
console.log('g2)',J(out));C.g2=!out.ancien&&!out.txt&&out.navBas>0&&out.navBas<=out.vue+1&&(out.dernier<=out.vue+1||out.defile); /* le menu tient dans l'écran ; s'il est plus long, il défile en lui-même */
// ── jeu fictif de la maquette
await T(src=>{new Function(src)();window.TRACE.flotteM.demo(window.__FLDEMO);},FIX);await W(page,800);
// ── g3) accueil : où sont les véhicules
await nav('accueil');out=await T(()=>{const s=document.querySelector('#eq-app [data-flou]');if(!s)return null;const B=[...s.querySelectorAll('[data-act="vehAttr"]')].map(b=>({a:b.dataset.a,n:+b.querySelector('b').textContent,t:b.querySelector('span').textContent}));return {B,note:(s.querySelector('.af-note')||{}).textContent||''};});
const nVeh=await T(()=>window.TRACE.flotteM.fl().vehs().length);
await T(()=>{const b=document.querySelector('#eq-app [data-flou] [data-act="vehAttr"][data-a="collab"]');if(b)b.click();});await W(page,600);
out.liste=await T(()=>{const rows=[...document.querySelectorAll('#eq-app .af-main tbody tr')];return {n:rows.length,sansCond:rows.filter(r=>/sans conducteur/.test(r.textContent)).length,sel:(document.querySelector('#eq-app [data-chg="vehAttr"]')||{}).value,route:window.FL.etat.route};});
console.log('g3)',J({...out,nVeh}));
C.g3=!!out&&J(out.B.map(b=>b.a))===J(['collab','chantier','depot','laisse'])&&J(out.B.map(b=>b.t))===J(['Attribués à un collaborateur','Affectés à un chantier','Au dépôt','Laissés · à prendre'])&&out.B.reduce((s,b)=>s+b.n,0)===nVeh
  &&out.B[0].n>0&&/responsabilité du chef/.test(out.note)&&out.liste.route==='vehicules'&&out.liste.sel==='collab'&&out.liste.n===out.B[0].n&&out.liste.sansCond===0;
// ── g4) qui a quoi : la recherche par nom
await nav('qui');const nTous=await T(()=>document.querySelectorAll('#eq-app .af-main > .af-page > .af-tabwrap tbody tr, #eq-app .af-page > .af-tabwrap tbody tr').length);
await T(()=>{const i=document.querySelector('#eq-app [data-in="quiQ"]');i.value='kevin';i.dispatchEvent(new Event('input',{bubbles:true}));});await W(page,700);
out=await T(()=>{const c=document.querySelector('#eq-app [data-histo]');if(!c)return null;const rows=[...c.querySelectorAll('tbody tr')].map(r=>r.textContent.replace(/\s+/g,' ').trim());const seg=c.querySelectorAll('.fl-frise__s').length;
  const bas=[...document.querySelectorAll('#eq-app .af-page > .af-tabwrap tbody tr')].map(r=>(r.querySelector('b')||{}).textContent);return {nom:c.dataset.histo,rows,seg,bas,focus:document.activeElement&&document.activeElement.dataset.in};});
console.log('g4)',J({...out,nTous}));
const okRows=!!out&&out.rows.length===2&&/^FL-104-AB/.test(out.rows[0])&&/aujourd'hui/.test(out.rows[0])&&/^FL-102-AA.*30\/10\/2020.*06\/01\/2023/.test(out.rows[1]);
await T(()=>{const r=document.querySelector('#eq-app [data-histo] tbody tr:nth-child(2)');if(r)r.click();});await W(page,700);
const fiche=await T(()=>({route:window.FL.etat.route,onglet:window.FL.etat.ficheOnglet,t:(document.getElementById('eq-app')||{}).textContent.replace(/\s+/g,' ')}));
console.log('g4b)',J({route:fiche.route,onglet:fiche.onglet,mains:/Conducteurs successifs/.test(fiche.t)&&/Kévin R\./.test(fiche.t)&&/Julien M\./.test(fiche.t)}));
C.g4=!!out&&out.nom==='Kévin R.'&&okRows&&out.seg===2&&J(out.bas.slice().sort())===J(['FL-102-AA','FL-104-AB'])&&nTous>2&&fiche.route==='veh-FL-102-AA'&&fiche.onglet==='conducteurs'&&/Conducteurs successifs/.test(fiche.t)&&/Kévin R\./.test(fiche.t)&&/Julien M\./.test(fiche.t);
// ── g5) jeu fictif : affecter un véhicule à un chantier
await T(()=>{window.FL.etat.quiQ='';});await nav('vehicules');await T(()=>{window.FL.etat.vehAttr='';window.FL.render();});await W(page,300);
await T(()=>{const r=[...document.querySelectorAll('#eq-app .af-main tbody tr')].find(x=>/FL-104-AB/.test(x.textContent));if(r)r.click();});await W(page,600);
await clickTxt('#eq-app [data-confie] button','Affecter à un chantier');await W(page,400);await T(()=>{document.getElementById('fl-aff').value='ch2';});await clickTxt('.fl-root .af-fenetre button','^\\s*Affecter\\s*$');await W(page,600);
out={fiche:await T(()=>{const s=document.querySelector('#eq-app [data-confie]');return s?s.dataset.confie+' | '+s.textContent.replace(/\s+/g,' ').slice(0,120):'';})};
await nav('accueil');out.n1=await T(()=>+document.querySelector('#eq-app [data-flou] [data-act="vehAttr"][data-a="chantier"] b').textContent);
await nav('vehicules');await T(()=>{const r=[...document.querySelectorAll('#eq-app .af-main tbody tr')].find(x=>/FL-104-AB/.test(x.textContent));if(r)r.click();});await W(page,600);
await clickTxt('#eq-app [data-confie] button','Retirer du chantier');await W(page,500);await nav('accueil');out.n0=await T(()=>+document.querySelector('#eq-app [data-flou] [data-act="vehAttr"][data-a="chantier"] b').textContent);
console.log('g5)',J(out));C.g5=/^chantier \| Confié à\s*🦺 Affecté au chantier Laval Démo/.test(out.fiche)&&out.n1===1&&out.n0===0;
// ── g6) téléphone
await page.setViewportSize({width:390,height:844});await nav('qui');await T(()=>{const i=document.querySelector('#eq-app [data-in="quiQ"]');i.value='kevin';i.dispatchEvent(new Event('input',{bubbles:true}));});await W(page,700);
out=await T(()=>({doc:document.documentElement.scrollWidth,carte:!!document.querySelector('#eq-app [data-histo]')}));console.log('g6)',J(out));C.g6=out.doc<=390&&out.carte;
C.g7=!logs.length;if(logs.length)console.log('logs',J(logs.slice(0,4)));
const ko=Object.keys(C).filter(k=>!C[k]);console.log('RESULTAT',J(C),ko.length?'ECHEC '+ko.join(','):'TOUT VERT');await browser.close();
