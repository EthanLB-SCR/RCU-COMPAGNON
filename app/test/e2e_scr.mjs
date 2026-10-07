// OPTIONS SCR INTERNE (Ethan 07/10, codées d'avance, interrupteurs « Nouveautés ») : POINTAGE (journée géolocalisée, pause ≥ 1 h, production du plan,
// validation chef puis conducteur, déclaration après coup / correction) et PROFIL (avatar, points, trophées, mes heures). Éteintes par défaut : rien ne change.
import { chromium } from 'playwright';
const BASE=process.env.BASE||'http://localhost:8765';
const browser=await chromium.launch({headless:true, executablePath: process.env.CHROMIUM_PATH||undefined});
const ctx=await browser.newContext({viewport:{width:900,height:940},geolocation:{latitude:48.1173,longitude:-1.6778,accuracy:12},permissions:['geolocation']});const page=await ctx.newPage();
const logs=[];page.on('pageerror',e=>logs.push('PAGEERROR: '+e.message.slice(0,300)));page.on('console',m=>{if(m.type()==='error'&&!/supabase|Failed to fetch|net::ERR|404/i.test(m.text()))logs.push(m.text().slice(0,200));});
page.on('dialog',d=>d.accept().catch(()=>{}));
await page.goto(BASE+'/traceur.html');await page.waitForTimeout(500);
await page.evaluate(()=>{localStorage.clear();});await page.reload();await page.waitForTimeout(500);
await page.evaluate(()=>{const S=window.MAQ.state;S.supplier='RENALIA';S.lines=[{id:'L1',name:'Feeder',dn:100,bar:12,pts:[[10,50],[130,50]],specials:[],parent:null}];S.seq=2;window.MAQ.setMode('select');window.MAQ.rebuild();});
await page.click('#bSave');await page.waitForTimeout(200);await page.fill('#svName','SCR test');await page.click('#svOk');await page.waitForTimeout(600);
await page.click('#svGo');await page.waitForTimeout(1200);await page.selectOption('#roleSel','karim');await page.waitForTimeout(300);
const siteId=await page.evaluate(()=>window.TRACE.state.siteId);
// ── 0) éteint par défaut : pas d'onglets Pointage / Profil
let out=await page.evaluate(()=>({pt:!!document.querySelector('#tabbar [data-tab="pointage"]'),pr:!!document.querySelector('#tabbar [data-tab="profil"]')}));
console.log('0) options éteintes → aucun onglet:',JSON.stringify(out));const c0=!out.pt&&!out.pr;
// ── 1) allumer les deux (comme depuis le panneau Nouveautés) → onglets présents
await page.evaluate(()=>{localStorage.setItem('trace:next',JSON.stringify({pointage:1,profil:1}));});await page.reload();await page.waitForTimeout(2500);
await page.evaluate(id=>window.TRACE.go(id),siteId);await page.waitForTimeout(1500);await page.selectOption('#roleSel','karim');await page.waitForTimeout(300);
out=await page.evaluate(()=>({pt:!!document.querySelector('#tabbar [data-tab="pointage"]'),pr:!!document.querySelector('#tabbar [data-tab="profil"]')}));
console.log('1) options allumées → onglets Pointage et Profil:',JSON.stringify(out));const c1=out.pt&&out.pr;
// ── 2) Karim (soudeur) pointe : début (géolocalisé) → pause → reprise → fin ; durées cohérentes, positions prises au début et à la fin seulement
await page.evaluate(()=>document.querySelector('#tabbar [data-tab="pointage"]').click());await page.waitForTimeout(400);
await page.evaluate(()=>document.querySelector('#pointage [data-pt="start"]').click());await page.waitForTimeout(900);
out=await page.evaluate(()=>{const e=Object.values(window.TRACE.net.pointage.days)[0]['Karim B.'];return {n:e.events.length,t:e.events[0].t,loc:e.events[0].loc,btns:[...document.querySelectorAll('#pointage [data-pt]')].map(b=>b.dataset.pt)};});
console.log('2a) début de journée géolocalisé:',JSON.stringify(out));const c2a=out.n===1&&out.t==='start'&&out.loc&&Math.abs(out.loc.lat-48.1173)<0.001&&out.btns.join()==='pause,leave,end';
// on antidate les événements pour avoir des durées mesurables : début 07:30, pause 12:00, reprise 13:05, fin 17:00
await page.evaluate(()=>document.querySelector('#pointage [data-pt="pause"]').click());await page.waitForTimeout(300);
await page.evaluate(()=>document.querySelector('#pointage [data-pt="resume"]').click());await page.waitForTimeout(300);
await page.evaluate(()=>document.querySelector('#pointage [data-pt="end"]').click());await page.waitForTimeout(900);
out=await page.evaluate(()=>{const day=Object.keys(window.TRACE.net.pointage.days)[0];const e=window.TRACE.net.pointage.days[day]['Karim B.'];const hh=(h,m)=>new Date(day+'T'+String(h).padStart(2,'0')+':'+String(m).padStart(2,'0')+':00').toISOString();
  e.events[0].at=hh(7,30);e.events[1].at=hh(12,0);e.events[2].at=hh(13,5);e.events[3].at=hh(17,0);window.TRACE.renderAll();const t=document.querySelector('#pointage').textContent;
  return {types:e.events.map(x=>x.t),endLoc:!!e.events[3].loc,pauseLoc:!!e.events[1].loc,work:/8 h 25/.test(t),pause:/1 h 05/.test(t)&&/≥ 1 h/.test(t),done:/Journée terminée/.test(t)};});
console.log('2b) pause / reprise / fin → 8 h 25 de travail, pause 1 h 05 ✓:',JSON.stringify(out));const c2b=out.types.join()==='start,pause,resume,end'&&out.endLoc&&!out.pauseLoc&&out.work&&out.pause&&out.done;
// ── 3) production du jour : Karim déclare 2 soudures (étape 1) sur le plan → visible dans son pointage
await page.evaluate(()=>{const T=window.TRACE;const L=Object.values(T.lines)[0];const now=new Date().toISOString();[1,2].forEach(i=>{const j=L.cond.A.joints[i];j.steps={1:{done:true,by:'Karim B.',at:now,photos:[],visuel:true}};j.status='soudee';});T.renderAll();});await page.waitForTimeout(300);
out=await page.evaluate(()=>({prod:/2 soudures/.test(document.querySelector('#pointage').textContent)}));
console.log('3) production du jour prise sur le plan:',JSON.stringify(out));const c3=out.prod;
// ── 4) chef : vue équipe, validation niveau 1 ; conducteur : niveau 2 ; statut « Validé »
await page.selectOption('#roleSel','ethan');await page.waitForTimeout(400);
out=await page.evaluate(()=>{const t=document.querySelector('#pointage').textContent;return {team:/Équipe du/.test(t),row:/Karim B\./.test(t),val:!!document.querySelector('#pointage [data-ptval="Karim B."]'),decl:!!document.querySelector('#ptDeclBtn')};});
console.log('4a) vue chef : équipe du jour + boutons:',JSON.stringify(out));const c4a=out.team&&out.row&&out.val&&out.decl;
await page.evaluate(()=>document.querySelector('#pointage [data-ptval="Karim B."]').click());await page.waitForTimeout(300);
out=await page.evaluate(()=>{const e=Object.values(window.TRACE.net.pointage.days)[0]['Karim B.'];return {st:e.status,by:e.val[0].by,v2:!!document.querySelector('#pointage [data-ptval2="Karim B."]')};});
console.log('4b) validé chef (pas encore conducteur) :',JSON.stringify(out));const c4b=out.st==='chef'&&out.by==='Ethan L.'&&!out.v2;
// Sophie (bureau) joue le conducteur de travaux pour le second niveau
await page.selectOption('#roleSel','sophie');await page.waitForTimeout(400);
await page.evaluate(()=>{const b=document.querySelector('#pointage [data-ptval2="Karim B."]');if(b)b.click();});await page.waitForTimeout(300);
out=await page.evaluate(()=>{const e=Object.values(window.TRACE.net.pointage.days)[0]['Karim B.'];return {st:e.status,n:e.val.length,lvl2:e.val[1]&&e.val[1].lvl};});
console.log('4c) validé en second (conducteur / bureau):',JSON.stringify(out));const c4c=out.st==='valide'&&out.n===2&&out.lvl2===2;
// ── 5) chef déclare après coup les heures de Julien (07:30 → 16:30, pause 60) → 8 h 00, validé chef
await page.selectOption('#roleSel','ethan');await page.waitForTimeout(300);
await page.evaluate(()=>document.querySelector('#ptDeclBtn').click());await page.waitForTimeout(300);
await page.evaluate(()=>{document.querySelector('#ptdN').value='Julien R.';document.querySelector('#ptdS').value='07:30';document.querySelector('#ptdE').value='16:30';document.querySelector('#ptdP').value='60';document.querySelector('#ptdOk').click();});await page.waitForTimeout(400);
out=await page.evaluate(()=>{const D=Object.values(window.TRACE.net.pointage.days)[0];const e=D['Julien R.'];const t=document.querySelector('#pointage').textContent;return {st:e&&e.status,n:e&&e.events.length,byChef:e&&e.events[0].byChef,txt:/Julien R\./.test(t)&&/8 h 00/.test(t)};});
console.log('5) déclaration après coup par le chef:',JSON.stringify(out));const c5=out.st==='chef'&&out.n===4&&out.byChef==='Ethan L.'&&out.txt;
// ── 6) correction : le chef refuse les heures de Julien et met 07:30 → 15:30 → statut refusé-corrigé, visible côté Julien
await page.evaluate(()=>{const b=document.querySelector('#pointage [data-ptref="Julien R."]');b.click();});await page.waitForTimeout(300);
await page.evaluate(()=>{document.querySelector('#ptdE').value='15:30';document.querySelector('#ptdNote').value='parti plus tôt';document.querySelector('#ptdOk').click();});await page.waitForTimeout(400);
await page.selectOption('#roleSel','julien');await page.waitForTimeout(400);
out=await page.evaluate(()=>{const D=Object.values(window.TRACE.net.pointage.days)[0];const e=D['Julien R.'];const t=document.querySelector('#pointage').textContent;return {st:e.status,corr:e.corr&&e.corr.end,seen:/Heures corrigées par le chef/.test(t)&&/parti plus tôt/.test(t)};});
console.log('6) correction par le chef, vue par Julien:',JSON.stringify(out));const c6=out.st==='refuse'&&out.corr==='15:30'&&out.seen;
// ── 7) profil de Karim : avatar, points, trophées (2 soudures, 1 journée validée non contestée, 1 pause ≥ 1 h), mes heures ; personnalisation sauvegardée
await page.selectOption('#roleSel','karim');await page.waitForTimeout(300);
await page.evaluate(()=>document.querySelector('#tabbar [data-tab="profil"]').click());await page.waitForTimeout(400);
out=await page.evaluate(()=>{const t=document.querySelector('#profil').textContent;const svg=!!document.querySelector('#profil svg');document.querySelector('#profil [data-av="beard"]').click();return {svg,name:/Karim B\./.test(t),pts:/points/.test(t),soud:/Soudures/.test(t),hours:/8 h 25/.test(t),valid:/Validé/.test(t),av:JSON.parse(localStorage.getItem('trace:avatar:karim b.')||'{}').beard};});
console.log('7) profil : avatar, points, trophées, heures validées, avatar personnalisé:',JSON.stringify(out));const c7=out.svg&&out.name&&out.pts&&out.soud&&out.hours&&out.valid&&out.av===1;
// ── 8) persistance : rechargement → pointage du chantier conservé (NET.pointage synchronisé comme le reste)
await page.reload();await page.waitForTimeout(2500);await page.evaluate(id=>window.TRACE.go(id),siteId);await page.waitForTimeout(1500);
out=await page.evaluate(()=>{const P=window.TRACE.net.pointage;const D=P&&Object.values(P.days)[0];return {k:D&&D['Karim B.']&&D['Karim B.'].status,j:D&&D['Julien R.']&&D['Julien R.'].status};});
console.log('8) après rechargement :',JSON.stringify(out));const c8=out.k==='valide'&&out.j==='refuse';
const ALL=c0&&c1&&c2a&&c2b&&c3&&c4a&&c4b&&c4c&&c5&&c6&&c7&&c8;
console.log('RESULTAT:',ALL?'TOUT VERT':'ECHEC '+JSON.stringify({c0,c1,c2a,c2b,c3,c4a,c4b,c4c,c5,c6,c7,c8}));
console.log(logs.length?logs:'[]');
await browser.close();process.exit(ALL?0:1);
