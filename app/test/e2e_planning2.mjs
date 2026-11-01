// PLANNING — retours d'Ethan du 10/10 (midi), repris le 01/11 soir sur le PLANNING UNIQUE (l'écran en 3 touchers + les options du détaillé) : recherche + filtres dans « À placer », deux équipes (A / B / C) sur un même chantier, chef de chantier
// sur deux chantiers « en autonomie » (chip distincte), étiquette d'équipe gardée à la reprise de la semaine, un gars sur deux chantiers dans sa semaine (jours déplacés ou en plus) ; rien d'ancien ne change (placer, jours, retirer).
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
const openPlanning=async()=>{await page.evaluate(async()=>{const T=window.TRACE;T.state.userId='ethan';document.getElementById('htHome').click();T.renderHome();document.getElementById('htExpl').click();await new Promise(r=>setTimeout(r,200));[...document.querySelectorAll('#eq-app .ac-row')].find(x=>/Planning de la semaine/.test(x.textContent)).click();});await wait(300);};
const PI=async(v,ms)=>{await page.evaluate(v=>{const b=document.querySelector(`#eq-app [data-act=pi][data-v="${v}"]`);if(!b)throw new Error('absent : '+v+' · '+document.getElementById('eq-app').textContent.replace(/\s+/g,' ').slice(0,200));b.click();},v);await wait(ms||200);};
const aff=wk=>page.evaluate(wk=>{const P=window.TRACE.espace.planning();const k=wk||Object.keys(P).sort()[0];return (P[k]||{}).aff||{};},wk);
const rowIn=(site,re)=>page.evaluate(([site,src])=>{const r=[...document.querySelectorAll(`#eq-app .pi-site[data-site=${site}] .pi-row[data-q]`)].find(x=>new RegExp(src).test(x.textContent));if(!r)throw new Error('pas de ligne '+src+' sur '+site);r.click();},[site,re]);
const teams=site=>page.evaluate(site=>[...document.querySelectorAll(`#eq-app .pi-site[data-site=${site}] .pi-team`)].map(h=>h.textContent.replace(/\s+/g,' ').trim()),site);
const tray=()=>page.evaluate(()=>[...document.querySelectorAll('#eq-app .pi-trayc > .pi-tray .pi-chip')].filter(c=>c.style.display!=='none').map(c=>c.querySelector('b').textContent));
await openPlanning();
// ── 1) recherche + filtres (la recherche est en haut du planning unique, elle filtre aussi « À placer »)
let out=await page.evaluate(()=>({q:!!document.getElementById('pi-q'),chips:[...document.querySelectorAll('#eq-app .pi-poste .chip')].map(c=>c.textContent)}));out.tray=await tray();
await page.fill('#pi-q','kar');await wait(150);out.search=await tray();
await page.fill('#pi-q','zzz');await wait(150);out.none=await page.evaluate(()=>/Personne ne correspond/.test((document.getElementById('pi-qn')||{}).textContent||''));
await page.fill('#pi-q','');await wait(150);out.cleared=(await tray()).length;
await page.evaluate(()=>{[...document.querySelectorAll('#eq-app .pi-poste .chip')].find(c=>/Manchonneurs/.test(c.textContent)).click();});await wait(250);
out.filt={tray:await tray(),active:await page.evaluate(()=>(document.querySelector('#eq-app .pi-poste .chip.active')||{}).textContent)};
await page.evaluate(()=>{[...document.querySelectorAll('#eq-app .pi-poste .chip')].find(c=>/^Tous$/.test(c.textContent)).click();});await wait(250);
out.back=(await tray()).length;
console.log('1) recherche + filtres :',JSON.stringify(out));
C.c1=out.q&&out.chips.includes('Soudeurs')&&out.chips.includes('Chefs')&&out.chips.includes('Intérim')&&out.tray.length>=3&&out.search.join()==='Karim B.'&&out.none&&out.cleared===out.tray.length&&out.filt.tray.join()==='Julien R.'&&/Manchonneurs/.test(out.filt.active)&&out.back===out.tray.length;
// ── 2) deux équipes sur Caen : Karim → équipe A, Julien → équipe B (panneau : qui → où → équipe → Placer) ; en-têtes ; changement d'équipe en touchant sa ligne
const place=async(who,team)=>{await page.evaluate(src=>{const c=[...document.querySelectorAll('#eq-app .pi-trayc .pi-chip')].find(x=>new RegExp(src).test(x.textContent));c.click();},who);await wait(200);
  await PI('site|demo_caen');if(team!==undefined)await PI('tteam|'+(team||''));await PI('ok|',250);};
await place('Karim','A');await place('Julien','B');
out=await aff();out={karim:out['l:karim']['eq:demo_caen'],julien:out['l:julien']['eq:demo_caen'],days:Object.keys(out['l:karim']).filter(k=>/^\d{4}/.test(k)).length,heads:await teams('demo_caen'),count:await page.evaluate(()=>(document.querySelector('#eq-app .pi-site[data-site=demo_caen] .pi-sh .n')||{}).textContent)};
await rowIn('demo_caen','Julien');
out.choices=await page.evaluate(()=>[...document.querySelectorAll('#pi-panel .eq-teams .eq-tb')].map(b=>b.textContent.trim())); /* discret : —, les équipes en place (A, B) et la suivante (C) seulement */
await PI('tteam|A');await PI('ok|',250);
out.after={julien:(await aff())['l:julien']['eq:demo_caen'],heads:await teams('demo_caen')};
console.log('2) deux équipes :',JSON.stringify(out));
C.c2=out.karim==='A'&&out.julien==='B'&&out.days===5&&out.heads.length===2&&/^Équipe A · 1/.test(out.heads[0])&&/^Équipe B · 1/.test(out.heads[1])&&out.count==='2'&&out.choices.join()==='—,A,B,C'&&out.after.julien==='A'&&out.after.heads.length===1&&/^Équipe A · 2/.test(out.after.heads[0]);
// ── 3) chef sur deux chantiers : Ethan placé sur Caen (sans équipe) puis aussi Rennes → « en autonomie (aussi sur …) » sur les deux cartes ; le chef en tête de la carte
await place('Ethan','');
await page.evaluate(()=>{const T=window.TRACE;const P=T.espace.planning();const wk=Object.keys(P)[0];const o=Object.assign({},P[wk].aff['l:ethan']);Object.keys(o).filter(k=>/^\d{4}/.test(k)).forEach(d=>{o[d]=[...o[d],'demo_rennes'];});T.espace.savePlanning(wk,{'l:ethan':o});});await wait(100);await openPlanning();
out=await page.evaluate(()=>{const q=id=>{const L=[...document.querySelectorAll('#eq-app .pi-site[data-site='+id+'] .pi-row[data-q]')];const c=L.find(x=>/Ethan/.test(x.textContent));return c?{role:(c.querySelector('small')||{}).textContent,first:L[0]===c,warn:c.querySelectorAll('.pi-c.on.warn').length}:null;};const k=[...document.querySelectorAll('#eq-app .pi-site[data-site=demo_caen] .pi-row[data-q]')].find(x=>/Karim/.test(x.textContent));return {caen:q('demo_caen'),rennes:q('demo_rennes'),karim:k?(k.querySelector('small')||{}).textContent:''};});
console.log('3) chef en autonomie sur deux chantiers :',JSON.stringify(out));
C.c3=out.caen&&out.caen.first /* le chef toujours en tête, même sans équipe */&&/en autonomie/.test(out.caen.role)&&/aussi sur Rennes/.test(out.caen.role)&&out.caen.warn===5&&out.rennes&&/aussi sur Caen/.test(out.rennes.role)&&!/autonomie|aussi/.test(out.karim);
// ── 4) copier la semaine dernière : l'étiquette d'équipe suit ; retirer du chantier efface l'étiquette et le remet dans « À placer »
await page.evaluate(()=>{[...document.querySelectorAll('#eq-app [data-act=plweek]')].find(b=>b.dataset.v==='1').click();});await wait(250);
await PI('copy|',300);
out=await page.evaluate(()=>{const P=window.TRACE.espace.planning();const wks=Object.keys(P).sort();const aff=P[wks[wks.length-1]].aff;return {wks:wks.length,karim:aff['l:karim']&&aff['l:karim']['eq:demo_caen'],julien:aff['l:julien']&&aff['l:julien']['eq:demo_caen']};});out.heads=await teams('demo_caen');
await rowIn('demo_caen','Karim');await PI('rm|',250);
out.rm=await page.evaluate(()=>{const P=window.TRACE.espace.planning();const wks=Object.keys(P).sort();const aff=P[wks[wks.length-1]].aff;return {karim:aff['l:karim']?Object.keys(aff['l:karim']):null};});out.rm.tray=(await tray()).some(t=>/Karim/.test(t));
console.log('4) copie de semaine + retrait :',JSON.stringify(out));
C.c4=out.wks===2&&out.karim==='A'&&out.julien==='A'&&out.heads.length===1&&/^Équipe A · 2/.test(out.heads[0]||'')&&out.rm.karim===null&&out.rm.tray;
// ── 5) un gars sur deux chantiers le même jour (10/10, 11/10 : garder les deux, signalé ⚠ ; pour qu'il quitte l'autre chantier : le décocher là-bas) :
//       Julien (Caen toute la semaine) → ＋ Placer → Julien → Rennes → jeudi : « déjà sur Caen » ; Placer → jeudi = Caen ET Rennes ; puis sur Caen, jeudi décoché → jeudi = Rennes
await page.evaluate(()=>{[...document.querySelectorAll('#eq-app [data-act=plweek]')].find(b=>b.dataset.v==='0').click();});await wait(250);
await PI('open|');await page.evaluate(()=>{const b=[...document.querySelectorAll('#pi-panel .pi-pick [data-act=pi]')].find(x=>/Julien/.test(x.textContent));b.click();});await wait(200);
out={complet:await page.evaluate(()=>/complet/.test(([...document.querySelectorAll('#pi-panel .pi-who .btn')].map(b=>b.textContent).join(''))||'complet'))};
await PI('site|demo_rennes');out.days0=await page.evaluate(()=>[...document.querySelectorAll('#pi-panel .pi-days .chip.active')].length);
await PI('day|2026-10-08');
out.panel=await page.evaluate(()=>({warn:/jeu\. : déjà sur Caen/.test((document.querySelector('#pi-panel').textContent||'').replace(/\s+/g,' ')),leave:!!document.querySelector('#pi-panel [data-act=pi][data-v="leave|"]'),ok:(document.querySelector('#pi-panel [data-act=pi][data-v="ok|"]')||{}).textContent||''}));
await PI('ok|',300);
out.jeudi=await page.evaluate(()=>{const o=window.TRACE.espace.planning()['2026-W41'].aff['l:julien'];const r=[...document.querySelectorAll('#eq-app .pi-site[data-site=demo_rennes] .pi-row[data-q]')].find(x=>/Julien/.test(x.textContent));return {j:o['2026-10-08'],v:o['2026-10-09'],eqCaen:o['eq:demo_caen'],role:r?(r.querySelector('small')||{}).textContent:'',warn:r?r.querySelectorAll('.pi-c.on.warn').length:0};});
await rowIn('demo_caen','Julien');await PI('day|2026-10-08');await PI('ok|',300);
out.moved=await page.evaluate(()=>{const o=window.TRACE.espace.planning()['2026-W41'].aff['l:julien'];return {j:o['2026-10-08'],lun:o['2026-10-05']};});
console.log('5) un gars sur deux chantiers le même jour :',JSON.stringify(out));
C.c5=out.days0===0&&out.panel.warn&&out.panel.leave&&/Placer Julien · jeu\./.test(out.panel.ok)&&out.jeudi.j.join()==='demo_caen,demo_rennes'&&out.jeudi.v.join()==='demo_caen'&&out.jeudi.eqCaen==='A'&&/aussi sur Caen/.test(out.jeudi.role)&&out.jeudi.warn===1&&out.moved.j.join()==='demo_rennes'&&out.moved.lun.join()==='demo_caen';
const bad=Object.entries(C).filter(([k,v])=>!v).map(([k])=>k);console.log(bad.length?'RESULTAT: ECHEC '+bad.join(','):'RESULTAT: TOUT VERT');console.log(logs.length?logs:'[]');
await browser.close();
