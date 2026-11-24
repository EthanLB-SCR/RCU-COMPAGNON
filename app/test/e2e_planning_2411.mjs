// PLANNING — retours d'Ethan sur la recette du 19/11 (24/11/2026) :
//  « rajouter un bouton publier, par secteur, qui envoie à tous les collaborateurs sur quel chantier ils sont la semaine prochaine, et qui libère les infos ; une fois publié,
//    les changements se font en direct pour tout le monde ; mais que les gars ne se voient pas sur tel chantier avec tel gars tant que l'encadrement estime ne pas avoir fini.
//    Un export visuel envoyé par mail à tous ceux présents sur le planning, en copie RH et conducteur du secteur ; un planning exportable par secteur.
//    Une vue plus moderne : les gars à gauche et le planning à droite. »
// Personnages de démo, chantiers fictifs, aujourd'hui mardi 24/11/2026 → semaine prochaine = S49 (30/11 → 04/12).
//  p1  Pilotage → Planning de la semaine → S49 : bandeau « 📣 Pas encore publiée » ; vue « 📅 Grille : les gars × les jours » : une ligne par personne, 5 jours
//  p2  grille : la case lundi de Karim → fenêtre → « Aussi les autres jours libres » + Villefictive — Centre → Karim placé les 5 jours ; la case suivante change de
//      chantier pour un jour ; « Libérer ce jour » ; la recherche du planning (« kar ») filtre la grille
//  p3  Karim (compagnon) : semaine prochaine pas publiée → rien sur ses jours, la carte « pas encore publié », pas d'accès au chantier par le planning de S49
//  p4  Ethan publie l'Ouest → registre planpub « 2026-W49|ouest » ; la fenêtre du mail s'ouvre : objet, destinataires, copie RH / conducteurs, sans adresse : Karim
//  p5  Karim voit sa semaine (Villefictive — Centre) ; Julien, placé sur un chantier d'Île-de-France pas publié, ne voit toujours rien ; un changement après
//      publication est visible tout de suite
//  p6  export du secteur : une page « Planning semaine 49 — Ouest » (A4 paysage) avec la ligne de Karim
//  p7  « Retirer la publication » → Karim ne voit plus S49 ; la semaine en cours reste visible
//  p8  téléphone 390 px : grille sans débordement de page ; console propre
import { chromium } from 'playwright';
const BASE=process.env.BASE||'http://localhost:8765';
const browser=await chromium.launch({headless:true, executablePath: process.env.CHROMIUM_PATH||undefined});
const ctx=await browser.newContext({viewport:{width:1280,height:950}});const page=await ctx.newPage();
const logs=[];page.on('pageerror',e=>logs.push('PAGEERROR: '+e.message.slice(0,300)));page.on('console',m=>{if(m.type()==='error'&&!/supabase|Failed to fetch|net::ERR|404|WebSocket/i.test(m.text()))logs.push(m.text().slice(0,200));});
page.on('dialog',d=>d.accept().catch(()=>{}));
const C={};const wait=ms=>page.waitForTimeout(ms);const J=x=>JSON.stringify(x);
await page.route(u=>/(^|\.)geopf\.fr$|^geo\.api\.gouv\.fr$|open-meteo\.com$/.test(u.hostname),route=>route.fulfill({status:200,contentType:'application/json',body:JSON.stringify({type:'FeatureCollection',features:[],results:[],daily:{time:[],weathercode:[],temperature_2m_max:[],precipitation_sum:[],precipitation_probability_max:[]}})}));
await page.clock.install({time:new Date(2026,10,24,8,30,0)}); /* mardi 24/11/2026 */
await page.goto(BASE+'/index.html');await wait(600);await page.evaluate(()=>{localStorage.clear();localStorage.setItem('trace:wide','1');});await page.evaluate(()=>new Promise(r=>{try{const q=indexedDB.deleteDatabase('trace-kv');q.onsuccess=q.onerror=q.onblocked=()=>r();}catch(e){r();}}));
await page.reload();await wait(1200);{const s=await page.$('#loginSkip');if(s&&await s.isVisible())await s.click();await wait(700);}
await page.evaluate(()=>{const T=window.TRACE;const src=T.sites[Object.keys(T.sites).find(k=>k!=='__vide'&&T.sites[k]&&T.sites[k].lines)];const mk=(id,name,ville,sect)=>{const x=JSON.parse(JSON.stringify(src));x.id=id;x.name=name;x.fiche={ville,secteur:sect,chef:'l:ethan'};x.conv={msgs:[],seq:1};x.qse={docs:[]};delete x.geo;T.sites[id]=x;};
  mk('demo_vf','Villefictive — Centre','Caen','ouest');mk('demo_vn','Villefictive — Nord','Rennes','ouest');mk('demo_idf','Villefictive — Île','Paris','idf');T.state.userId='ethan';T.renderHome();});await wait(400);
const as=async u=>{await page.evaluate(u=>{const T=window.TRACE;T.state.userId=u;T.renderHome();},u);await wait(400);};
const openPlanning=async()=>{await page.evaluate(async()=>{const T=window.TRACE;document.getElementById('htHome').click();T.renderHome();document.getElementById('htExpl').click();await new Promise(r=>setTimeout(r,250));[...document.querySelectorAll('#eq-app .ac-row')].find(x=>/Planning de la semaine/.test(x.textContent)).click();});await wait(400);};
const act=async(a,v)=>{await page.evaluate(([a,v])=>{const b=document.querySelector(`#eq-app [data-act="${a}"][data-v="${v}"], #modal.show [data-act="${a}"][data-v="${v}"]`);if(!b)throw new Error('absent : '+a+'|'+v);b.click();},[a,v]);await wait(350);};
const aff=k=>page.evaluate(k=>((window.TRACE.espace.planning()['2026-W49']||{}).aff||{})[k]||{},k);
const S49=['2026-11-30','2026-12-01','2026-12-02','2026-12-03','2026-12-04'];
// ── p1) le planning, semaine prochaine, bandeau de publication, vue grille (bouton « 📅 Grille » dans la barre du planning)
await openPlanning();await page.evaluate(()=>{const b=[...document.querySelectorAll('#eq-app [data-act="plweek"]')].find(x=>x.dataset.v==='1');if(b)b.click();});await wait(400);
await page.evaluate(()=>{const s=document.querySelector('#eq-app select[data-chg="plSect"]');if(s){s.value='ouest';s.dispatchEvent(new Event('change',{bubbles:true}));}});await wait(400);
let out={pub:await page.evaluate(()=>{const c=document.querySelector('#eq-app [data-plpub]');return c?c.dataset.plpub+' | '+c.textContent.replace(/\s+/g,' ').slice(0,160):'';})};
await act('plvue','grille');
out.grille=await page.evaluate(()=>{const t=document.querySelector('#eq-app table.pg');if(!t)return null;return {cols:t.querySelectorAll('thead th').length,rows:t.querySelectorAll('tbody tr[data-pgp]').length,noms:[...t.querySelectorAll('tbody tr[data-pgp] .pg-n')].map(x=>x.textContent).slice(0,6),tri:!!document.querySelector('#eq-app .pi-trayc')};});
console.log('p1)',J(out));C.p1=/^non \| 📣 Semaine 49 · Ouest/.test(out.pub)&&/Pas encore publiée/.test(out.pub)&&!!out.grille&&out.grille.cols===6&&out.grille.rows>=2&&out.grille.noms.some(n=>/Karim/.test(n))&&!out.grille.tri;
// ── p2) placer dans la grille
await act('plcell','l:karim|2026-11-30');out={m:await page.evaluate(()=>(document.querySelector('#modal.show h3')||{}).textContent||'')};
await page.check('#pg-sem');await act('plcellok','l:karim|2026-11-30|demo_vf');out.a1=await aff('l:karim');
await act('plcell','l:karim|2026-12-03');await act('plcellok','l:karim|2026-12-03|demo_vn');out.a2=await aff('l:karim');
await act('plcell','l:karim|2026-12-04');await act('plcellok','l:karim|2026-12-04|');out.a3=await aff('l:karim');
await act('plcell','l:karim|2026-12-04');await act('plcellok','l:karim|2026-12-04|demo_vf');
out.cell=await page.evaluate(()=>(document.querySelector('#eq-app tr[data-pgp="l:karim"] td:nth-child(2) .pg-s')||{}).textContent||'');
await page.fill('#pi-q','kar');await wait(250);out.q=await page.evaluate(()=>[...document.querySelectorAll('#eq-app .pg tbody tr[data-pgp]')].filter(r=>r.style.display!=='none').map(r=>r.dataset.pgp));await page.fill('#pi-q','');await wait(200);
console.log('p2)',J(out));
C.p2=/Karim B\. · lundi 30 novembre/.test(out.m)&&J(S49.map(d=>(out.a1[d]||[]).join()))===J(['demo_vf','demo_vf','demo_vf','demo_vf','demo_vf'])&&(out.a2['2026-12-03']||[]).join()==='demo_vn'&&!out.a3['2026-12-04']&&(out.a3['2026-12-01']||[]).join()==='demo_vf'&&/Caen/.test(out.cell)&&J(out.q)===J(['l:karim']);
/* Julien sur le chantier d'Île-de-France en S49 ; Karim aussi cette semaine (S48) pour vérifier que la semaine en cours reste visible */
await page.evaluate(()=>{const T=window.TRACE;const pj={};['2026-11-30','2026-12-01','2026-12-02','2026-12-03','2026-12-04'].forEach(d=>{pj[d]=['demo_idf'];});T.espace.savePlanning('2026-W49',{'l:julien':pj});const pk={};['2026-11-23','2026-11-24','2026-11-25','2026-11-26','2026-11-27'].forEach(d=>{pk[d]=['demo_vn'];});T.espace.savePlanning('2026-W48',{'l:karim':pk});});await wait(200);
// ── p3) Karim ne voit pas S49
const semK=async(u)=>{await as(u||'karim');return page.evaluate(async()=>{const T=window.TRACE;document.getElementById('htEspace').click();await new Promise(r=>setTimeout(r,300));const go=document.querySelector('#eq-app [data-act="sub"][data-v="planning"]');
  if(go)go.click();await new Promise(r=>setTimeout(r,300));const nx=document.querySelector('#eq-app [data-act="plansem"][data-v="1"]');if(nx)nx.click();await new Promise(r=>setTimeout(r,300));
  const sem=document.querySelector('#eq-app .eq-semaine');const pl=T.espace.planned(T.acces.current());return {sem:sem?sem.textContent.replace(/\s+/g,' '):'',nonpub:!!document.querySelector('#eq-app [data-plnonpub]'),planned:pl===null?null:[...pl].sort()};});};
out=await semK();console.log('p3)',J(out));C.p3=!/Villefictive/.test(out.sem)&&out.nonpub&&Array.isArray(out.planned)&&!out.planned.includes('demo_vf')&&out.planned.includes('demo_vn');
// ── p4) Ethan publie l'Ouest
await as('ethan');await openPlanning();await page.evaluate(()=>{const b=[...document.querySelectorAll('#eq-app [data-act="plweek"]')].find(x=>x.dataset.v==='1');if(b)b.click();});await wait(400);
await act('plpub','2026-W49|ouest');out={m:await page.evaluate(()=>(document.querySelector('#modal.show')||{}).textContent||'')};await act('plpubok','2026-W49|ouest');await wait(400);
out.reg=await page.evaluate(()=>window.TRACE.reg.all('planpub').map(r=>r.id));
out.mail=await page.evaluate(()=>{const m=document.querySelector('#modal.show');const a=m&&m.querySelector('a[data-plmail]');return {t:m?m.textContent.replace(/\s+/g,' '):'',href:a?a.getAttribute('href'):''};});
out.bandeau=await page.evaluate(()=>{const c=document.querySelector('#eq-app [data-plpub]');return c?c.dataset.plpub:'';});
console.log('p4)',J({m:out.m.slice(0,200),reg:out.reg,mail:out.mail.t.slice(0,400),href:decodeURIComponent(out.mail.href).slice(0,300),bandeau:out.bandeau}));
C.p4=/1 compagnon placé/.test(out.m)&&J(out.reg)===J(['2026-W49|ouest'])&&/Planning semaine 49 — Ouest/.test(out.mail.t)&&/Sans adresse e-mail : .*Karim B\./.test(out.mail.t)&&/^mailto:/.test(out.mail.href)&&/subject=Planning semaine 49 — Ouest/.test(decodeURIComponent(out.mail.href))&&/Karim B\. — lun→jeu : Villefictive — Centre|Karim B\. — /.test(decodeURIComponent(out.mail.href))&&out.bandeau==='oui';
await page.evaluate(()=>{const b=document.querySelector('#modal.show [data-close]');if(b)b.click();});await wait(200);
// ── p5) Karim voit sa semaine ; Julien (IDF) non ; un changement après publication est en direct
out={k:await semK()};out.j=await semK('julien'); /* Julien : chantier d'Île-de-France, secteur pas publié */
await page.evaluate(()=>{const T=window.TRACE;const P=T.espace.planning()['2026-W49'].aff['l:karim'];const o=Object.assign({},P);o['2026-12-02']=['demo_vn'];T.espace.savePlanning('2026-W49',{'l:karim':o});});await wait(200);out.k2=await semK();
console.log('p5)',J({k:out.k.sem.slice(0,200),nonpub:out.k.nonpub,j:out.j.sem.slice(0,120),jnp:out.j.nonpub,jpl:out.j.planned,k2:out.k2.sem.slice(0,220)}));
C.p5=/Villefictive\s*(—\s*)?Centre/.test(out.k.sem)&&!out.k.nonpub&&out.k.planned.includes('demo_vf')&&!/Villefictive/.test(out.j.sem)&&out.j.nonpub&&!(out.j.planned||[]).includes('demo_idf')&&/Villefictive\s*(—\s*)?Nord/.test(out.k2.sem);
// ── p6) export du secteur
await as('ethan');await openPlanning();await page.evaluate(()=>{const b=[...document.querySelectorAll('#eq-app [data-act="plweek"]')].find(x=>x.dataset.v==='1');if(b)b.click();});await wait(400);
const [pop]=await Promise.all([ctx.waitForEvent('page',{timeout:8000}).catch(()=>null),page.evaluate(()=>{const b=document.querySelector('#eq-app [data-act="plexport"][data-v="2026-W49|ouest"]');b.click();})]);
out={pop:!!pop};if(pop){await pop.waitForLoadState().catch(()=>{});await pop.waitForTimeout(300);out.t=await pop.title().catch(()=>'');out.txt=await pop.evaluate(()=>document.body.textContent.replace(/\s+/g,' ')).catch(()=>'');out.page=await pop.evaluate(()=>[...document.querySelectorAll('style')].map(s=>s.textContent).join('').includes('A4 landscape')).catch(()=>false);await pop.close().catch(()=>{});}
console.log('p6)',J({pop:out.pop,t:out.t,txt:(out.txt||'').slice(0,220),page:out.page}));C.p6=out.pop&&/Planning semaine 49 — Ouest/.test(out.t)&&/Karim B\./.test(out.txt)&&/Villefictive — Centre/.test(out.txt)&&!/Julien/.test(out.txt)&&out.page;
// ── p7) retirer la publication
await act('plunpub','2026-W49|ouest');out={reg:await page.evaluate(()=>window.TRACE.reg.all('planpub').length)};out.k=await semK();
out.cours=await page.evaluate(async()=>{const nx=document.querySelector('#eq-app [data-act="plansem"][data-v="0"]');if(nx)nx.click();await new Promise(r=>setTimeout(r,300));return (document.querySelector('#eq-app .eq-semaine')||{textContent:''}).textContent.replace(/\s+/g,' ');});
console.log('p7)',J({reg:out.reg,k:out.k.sem.slice(0,120),nonpub:out.k.nonpub,cours:out.cours.slice(0,160)}));C.p7=out.reg===0&&!/Villefictive/.test(out.k.sem)&&out.k.nonpub&&/Villefictive\s*(—\s*)?Nord/.test(out.cours);
// ── p8) téléphone
await page.setViewportSize({width:390,height:844});await as('ethan');await openPlanning();await page.evaluate(()=>{const b=[...document.querySelectorAll('#eq-app [data-act="plweek"]')].find(x=>x.dataset.v==='1');if(b)b.click();});await wait(400);
out=await page.evaluate(()=>{const w=document.querySelector('#eq-app .pg-wrap');return {doc:document.documentElement.scrollWidth,grille:!!w,scroll:w?w.scrollWidth>w.clientWidth:false,cellH:Math.round(((document.querySelector('#eq-app .pg-cell')||{getBoundingClientRect:()=>({height:0})}).getBoundingClientRect()).height)};});
console.log('p8)',J(out));C.p8=out.doc<=390&&out.grille&&out.cellH>=44;
C.p9=!logs.length;if(logs.length)console.log('logs',J(logs.slice(0,4)));
const ko=Object.keys(C).filter(k=>!C[k]);console.log('RESULTAT',J(C),ko.length?'ECHEC '+ko.join(','):'TOUT VERT');await browser.close();
