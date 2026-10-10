// PLANNING — retours d'Ethan du 10/10 (midi) : recherche + filtres dans « À placer », deux équipes (A / B / C) sur un même chantier, chef de chantier
// sur deux chantiers « en autonomie » (chip distincte), étiquette d'équipe gardée à la reprise de la semaine ; rien d'ancien ne change (placer, jours, retirer).
import { chromium } from 'playwright';
const BASE=process.env.BASE||'http://localhost:8765';
const browser=await chromium.launch({headless:true, executablePath: process.env.CHROMIUM_PATH||undefined});
const ctx=await browser.newContext({viewport:{width:430,height:900}});const page=await ctx.newPage();
const logs=[];page.on('pageerror',e=>logs.push('PAGEERROR: '+e.message.slice(0,300)));page.on('console',m=>{if(m.type()==='error'&&!/supabase|Failed to fetch|net::ERR|404|WebSocket/i.test(m.text()))logs.push(m.text().slice(0,200));});
page.on('dialog',d=>d.accept().catch(()=>{}));
const C={};const wait=ms=>page.waitForTimeout(ms);
await page.clock.install({time:new Date(2026,9,9,8,30,0)}); /* vendredi 09/10/2026 : le planning ignore le week-end */
await page.goto(BASE+'/index.html');await wait(600);await page.evaluate(()=>{localStorage.clear();});await page.evaluate(()=>new Promise(r=>{try{const q=indexedDB.deleteDatabase('trace-kv');q.onsuccess=q.onerror=q.onblocked=()=>r();}catch(e){r();}}));
await page.reload();await wait(1200);
const skip=async()=>{const s=await page.$('#loginSkip');if(s&&await s.isVisible())await s.click();await wait(700);};await skip();
await page.evaluate(()=>{const T=window.TRACE;const src=T.sites[Object.keys(T.sites).find(k=>k!=='__vide'&&T.sites[k]&&T.sites[k].lines)];const mk=(id,name,ville)=>{const x=JSON.parse(JSON.stringify(src));x.id=id;x.name=name;x.fiche={ville,secteur:'ouest',chef:'l:ethan'};x.conv={msgs:[],seq:1};x.qse={docs:[]};T.sites[id]=x;};mk('demo_caen','Caen — Presqu\'île','Caen');mk('demo_rennes','Rennes — Baud','Rennes');T.renderHome();});
const openPlanning=async()=>{await page.evaluate(async()=>{const T=window.TRACE;T.state.userId='ethan';document.getElementById('htHome').click();T.renderHome();document.getElementById('htExpl').click();await new Promise(r=>setTimeout(r,200));[...document.querySelectorAll('#eq-app .ac-row')].find(x=>/Planning des équipes/.test(x.textContent)).click();});await wait(300);};
await openPlanning();
// ── 1) recherche + filtres dans « À placer »
let out=await page.evaluate(()=>({q:!!document.getElementById('pl-q'),chips:[...document.querySelectorAll('#eq-app .eq-pltray .eq-opts .chip')].map(c=>c.textContent),tray:[...document.querySelectorAll('#pl-tray .eq-plchip')].map(c=>c.querySelector('b').textContent)}));
await page.fill('#pl-q','kar');await wait(150);
out.search=await page.evaluate(()=>[...document.querySelectorAll('#pl-tray .eq-plchip')].filter(c=>c.style.display!=='none').map(c=>c.querySelector('b').textContent));
await page.fill('#pl-q','zzz');await wait(150);out.none=await page.evaluate(()=>document.getElementById('pl-none').style.display!=='none');
await page.fill('#pl-q','');await wait(150);out.cleared=await page.evaluate(()=>[...document.querySelectorAll('#pl-tray .eq-plchip')].filter(c=>c.style.display!=='none').length);
await page.evaluate(()=>{[...document.querySelectorAll('#eq-app .eq-pltray .eq-opts .chip')].find(c=>/Manchonneurs/.test(c.textContent)).click();});await wait(250);
out.filt=await page.evaluate(()=>({tray:[...document.querySelectorAll('#pl-tray .eq-plchip')].map(c=>c.querySelector('b').textContent),active:(document.querySelector('#eq-app .eq-pltray .eq-opts .chip.active')||{}).textContent}));
await page.evaluate(()=>{[...document.querySelectorAll('#eq-app .eq-pltray .eq-opts .chip')].find(c=>/^Tous$/.test(c.textContent)).click();});await wait(250);
out.back=await page.evaluate(()=>[...document.querySelectorAll('#pl-tray .eq-plchip')].length);
console.log('1) recherche + filtres :',JSON.stringify(out));
C.c1=out.q&&out.chips.includes('Soudeurs')&&out.chips.includes('Chefs')&&out.chips.includes('Intérim')&&out.tray.length>=3&&out.search.join()==='Karim B.'&&out.none&&out.cleared===out.tray.length&&out.filt.tray.join()==='Julien R.'&&/Manchonneurs/.test(out.filt.active)&&out.back===out.tray.length;
// ── 2) deux équipes sur Caen : Karim → équipe A, Julien → équipe B ; en-têtes de groupe ; changement d'équipe depuis la carte de la personne
const place=async(who,team)=>{await page.evaluate(({who2,team2})=>{const c=[...document.querySelectorAll('#eq-app .eq-pltray .eq-plchip')].find(x=>new RegExp(who2).test(x.textContent));c.querySelector('.eq-plmain').click();},{who2:who,team2:team});await wait(200);
  if(team!==undefined)await page.evaluate(t=>{[...document.querySelectorAll('#eq-app .eq-plsite[data-drop=demo_caen] .eq-opts .chip')].find(c=>c.textContent.trim()===(t?'Équipe '+t:'— sans équipe')).click();},team);await wait(200);
  await page.evaluate(()=>document.querySelector('#eq-app .eq-plsite[data-drop=demo_caen] [data-act=plput]').click());await wait(250);};
await place('Karim','A');await place('Julien','B');
out=await page.evaluate(()=>{const T=window.TRACE;const P=T.espace.planning();const wk=Object.keys(P)[0];const aff=P[wk].aff;const card=document.querySelector('#eq-app .eq-plsite[data-drop=demo_caen]');return {wk,karim:aff['l:karim']['eq:demo_caen'],julien:aff['l:julien']['eq:demo_caen'],days:Object.keys(aff['l:karim']).filter(k=>/^\d{4}/.test(k)).length,heads:[...card.querySelectorAll('.eq-plteam')].map(h=>h.textContent.replace(/\s+/g,' ').trim()),badges:[...card.querySelectorAll('.eq-team')].map(b=>b.className+':'+b.textContent),count:card.querySelector('.eq-plcount').textContent};});
await page.evaluate(()=>{[...document.querySelectorAll('#eq-app .eq-plsite[data-drop=demo_caen] .eq-plchip')].find(x=>/Julien/.test(x.textContent)).querySelector('.eq-plmain').click();});await wait(200);
await page.evaluate(()=>{[...document.querySelectorAll('#eq-app .eq-pledit .chip')].find(c=>/Équipe A/.test(c.textContent)).click();});await wait(250);
out.after=await page.evaluate(()=>{const T=window.TRACE;const P=T.espace.planning();const wk=Object.keys(P)[0];const aff=P[wk].aff;const card=document.querySelector('#eq-app .eq-plsite[data-drop=demo_caen]');return {julien:aff['l:julien']['eq:demo_caen'],heads:[...card.querySelectorAll('.eq-plteam')].map(h=>h.textContent.replace(/\s+/g,' ').trim())};});
console.log('2) deux équipes :',JSON.stringify(out));
C.c2=out.karim==='A'&&out.julien==='B'&&out.days===5&&out.heads.length===2&&/^Équipe A · 1$/.test(out.heads[0])&&/^Équipe B · 1$/.test(out.heads[1])&&out.badges.join()==='eq-team t-A:A,eq-team t-B:B'&&out.count==='2'&&out.after.julien==='A'&&out.after.heads.length===1&&/^Équipe A · 2$/.test(out.after.heads[0]);
// ── 3) chef sur deux chantiers : Ethan placé sur Caen puis Rennes → chip « en autonomie : aussi sur … » sur les deux cartes, liseré (classe multi) ; chef de ce chantier
await place('Ethan',''); /* Caen, sans équipe */
await page.evaluate(()=>{const c=[...document.querySelectorAll('#eq-app .eq-plsite[data-drop=demo_caen] .eq-plchip')].find(x=>/Ethan/.test(x.textContent));c.querySelector('.eq-plmain').click();});await wait(200); /* ouvre ses jours : il est complet, donc plus dans le plateau → on le re-place par glisser : simulé par plsel depuis la carte ? non : on passe par le planning direct */
await page.evaluate(()=>{const T=window.TRACE;const P=T.espace.planning();const wk=Object.keys(P)[0];const o=Object.assign({},P[wk].aff['l:ethan']);Object.keys(o).filter(k=>/^\d{4}/.test(k)).forEach(d=>{o[d]=[...o[d],'demo_rennes'];});T.espace.savePlanning(wk,{'l:ethan':o});});await wait(100);await openPlanning();
out=await page.evaluate(()=>{const q=id=>{const c=[...document.querySelectorAll('#eq-app .eq-plsite[data-drop='+id+'] .eq-plchip')].find(x=>/Ethan/.test(x.textContent));return c?{multi:c.classList.contains('multi'),chef:c.classList.contains('chef'),role:(c.querySelector('small')||{}).textContent}:null;};return {caen:q('demo_caen'),rennes:q('demo_rennes'),karim:(()=>{const c=[...document.querySelectorAll('#eq-app .eq-plsite[data-drop=demo_caen] .eq-plchip')].find(x=>/Karim/.test(x.textContent));return {multi:c.classList.contains('multi'),role:(c.querySelector('small')||{}).textContent};})()};});
console.log('3) chef en autonomie sur deux chantiers :',JSON.stringify(out));
C.c3=out.caen&&out.caen.multi&&out.caen.chef&&/en autonomie/.test(out.caen.role)&&/aussi sur Rennes/.test(out.caen.role)&&out.rennes&&out.rennes.multi&&/aussi sur Caen/.test(out.rennes.role)&&!out.karim.multi&&!/autonomie/.test(out.karim.role);
// ── 4) reprise de la semaine passée : l'étiquette d'équipe suit ; retirer du chantier efface l'étiquette
await page.evaluate(()=>{[...document.querySelectorAll('#eq-app [data-act=plweek]')].find(b=>/Semaine prochaine/.test(b.textContent)).click();});await wait(250);
await page.evaluate(()=>document.querySelector('#eq-app [data-act=plcopy]').click());await wait(300);
out=await page.evaluate(()=>{const T=window.TRACE;const P=T.espace.planning();const wks=Object.keys(P).sort();const aff=P[wks[wks.length-1]].aff;return {wks:wks.length,karim:aff['l:karim']&&aff['l:karim']['eq:demo_caen'],julien:aff['l:julien']&&aff['l:julien']['eq:demo_caen'],heads:[...document.querySelectorAll('#eq-app .eq-plsite[data-drop=demo_caen] .eq-plteam')].map(h=>h.textContent.replace(/\s+/g,' ').trim())};});
await page.evaluate(()=>{[...document.querySelectorAll('#eq-app .eq-plsite[data-drop=demo_caen] .eq-plchip')].find(x=>/Karim/.test(x.textContent)).querySelector('.eq-plmain').click();});await wait(200);
await page.evaluate(()=>document.querySelector('#eq-app [data-act=plrm]').click());await wait(250);
out.rm=await page.evaluate(()=>{const T=window.TRACE;const P=T.espace.planning();const wks=Object.keys(P).sort();const aff=P[wks[wks.length-1]].aff;return {karim:aff['l:karim']?Object.keys(aff['l:karim']):null,tray:[...document.querySelectorAll('#pl-tray .eq-plchip')].some(c=>/Karim/.test(c.textContent))};});
console.log('4) reprise de semaine + retrait :',JSON.stringify(out));
C.c4=out.wks===2&&out.karim==='A'&&out.julien==='A'&&/^Équipe A · 2$/.test(out.heads[0]||'')&&out.rm.karim===null&&out.rm.tray;
const bad=Object.entries(C).filter(([k,v])=>!v).map(([k])=>k);console.log(bad.length?'RESULTAT: ECHEC '+bad.join(','):'RESULTAT: TOUT VERT');console.log(logs.length?logs:'[]');
await browser.close();
