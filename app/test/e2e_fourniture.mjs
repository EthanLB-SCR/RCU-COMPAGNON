// ONGLET FOURNITURE (13/10, Ethan : « fourniture et pose : les pièces du tracé initial, importer la commande de tubes → comparatif permanent avec le tracé et les modifs,
// les pièces en plus, le reste à livrer ; entourer une zone du plan → la liste de tout ce qu'il faut prévoir en livraison ou en commande ; un plan avec le planning
// des tronçons entourés, quels camions ça crée et à quelle date »).
// Réseau du test (traceur) : Feeder DN200 120 m (10 barres par conduite) + Antenne DN100 84 m (7 barres par conduite), aller + retour.
import { chromium } from 'playwright';
import fs from 'fs';
const BASE=process.env.BASE||'http://localhost:8765';
const browser=await chromium.launch({headless:true, executablePath: process.env.CHROMIUM_PATH||undefined});
const ctx=await browser.newContext({viewport:{width:900,height:940},acceptDownloads:true});const page=await ctx.newPage();
const logs=[];page.on('pageerror',e=>logs.push('PAGEERROR: '+e.message.slice(0,300)));page.on('console',m=>{if(m.type()==='error'&&!/supabase|Failed to fetch|net::ERR|404/i.test(m.text()))logs.push(m.text().slice(0,200));});
page.on('dialog',d=>d.accept().catch(()=>{}));
const C={};const wait=ms=>page.waitForTimeout(ms);
await page.clock.install({time:new Date(2026,9,13,8,30,0)}); /* mardi 13/10/2026 */
const PNG='data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg==';
await page.goto(BASE+'/traceur.html');await wait(600);
await page.evaluate(()=>{localStorage.clear();});await page.reload();await wait(600);
await page.evaluate(()=>{const S=window.MAQ.state;S.supplier='AXIOM';S.lines=[{id:'L1',name:'Feeder',dn:200,bar:12,pts:[[0,50],[120,50]],specials:[],parent:null},{id:'L2',name:'Antenne',dn:100,bar:12,pts:[[0,100],[84,100]],specials:[],parent:null}];S.seq=3;window.MAQ.setMode('select');window.MAQ.rebuild();});
await page.click('#bSave');await wait(200);await page.fill('#svName','Fourniture test');await page.click('#svOk');await wait(800);
await page.click('#svGo');await wait(1500);await page.selectOption('#roleSel','ethan');await wait(300);
const R=()=>page.evaluate(()=>{const X=window.TRACE.fourniture.compute();const by={};X.rows.forEach(r=>{by[r.label]=r;});return {by,tot:X.tot,zones:X.zones.map(Z=>({name:Z.z.name,date:Z.date,livd:Z.livd,tot:Z.tot,trucks:Z.trucks.map(t=>({n:t.n,date:t.date,fill:Math.round(t.fill*100),kg:Math.round(t.kg),lines:t.lines.map(x=>x.label+'×'+x.qty+(x.aCmd?'(cde '+x.aCmd+')':''))})),ann:Z.announced.length})),trucks:X.trucks.map(x=>x.kind+':'+x.Z.z.name+':'+x.date+':'+x.n)};});
const pick=(r,l)=>{const x=r.by[l];return x?[x.ini,x.mod,x.plus,x.besoin,x.cde,x.liv,x.att,x.resteLiv,x.aCmd,x.surplus].join('/'):'∅';};
// ── 1) première ouverture : tracé initial figé, besoin par référence (barres, kits fin de ligne, manchons, mousse), bandeau « pas encore de commande »
let out=await page.evaluate(async()=>{const T=window.TRACE;document.querySelector('#facets [data-facet=tech]').click();await new Promise(r=>setTimeout(r,200));document.querySelector('#tabbar [data-tab="fourniture"]').click();await new Promise(r=>setTimeout(r,300));
  const el=document.getElementById('fourniture');return {tab:T.state.tab,init:T.net.fourniture.init&&T.net.fourniture.init.src,stats:[...el.querySelectorAll('.ac-stat')].map(x=>x.textContent.replace(/\s+/g,' ').trim()),warn:/Pas encore de commande importée/.test(el.textContent),pending:window.TRACE._pending().fourniture||null};});
let r=await R();
console.log('1) ouverture :',JSON.stringify(out),'·',Object.keys(r.by).join(' | '));
C.c1=out.tab==='fourniture'&&out.init==='trace'&&out.warn&&out.stats[0]==='98besoin (pièces)' /* 28/10 : plus de manchon ni de mousse aux bouts de ligne (raccordement, kit) : 114 → 98 */&&pick(r,'Barre DN200')==='20/0/0/20/0/0/0/0/20/0'&&pick(r,'Barre DN100')==='14/0/0/14/0/0/0/0/14/0'&&r.by['Manchon DN200'].besoin===18&&r.by['Mousse PU (A+B) DN100'].besoin===12&&r.by['Kit fin de ligne DN200'].besoin===2;
// ── 2) import de la commande par collage depuis Excel : 18 barres DN200, 84 ml de DN100 (→ 7 barres), manchons + mousse DN200, 2 coudes DN100 (hors tracé), « Transport » non reconnu
const PASTE=['Désignation\tQté\tUnité','Tube acier pré-isolé DN200 série 2 - 12 m\t18\tu','Tube acier pré-isolé DN100\t84\tml','Manchon thermorétractable DN200 Ø315\t22\tu','Mousse PU DN200\t22\tu','Coude 90° DN100\t2\tu','Transport\t1\tforfait'].join('\n');
out=await page.evaluate(async P=>{const w=ms=>new Promise(r=>setTimeout(r,ms));document.querySelector('#fourniture [data-fa=cmd][data-v=""]').click();await w(150);document.querySelector('#modal [data-iqm="paste"]').click();await w(120); // 13/10 soir : écran d'import commun
  document.getElementById('iq-paste').value=P;document.getElementById('iq-read').click();await w(150);const M=document.getElementById('modal');
  const rows=[...M.querySelectorAll('table.iq-tab tr')].slice(1).map(tr=>({raw:tr.cells[0].textContent.replace(/\s+/g,' ').trim(),kind:(tr.querySelector('[data-iqk]')||{}).value,dn:(tr.querySelector('[data-iqd]')||{}).value,qty:(tr.querySelector('[data-iqq]')||{}).value}));
  const r={rows,bad:/1 ligne ignorée/.test(M.textContent)&&/transport · Transport/.test(M.textContent),info:(M.querySelector('.iq-info')||{}).textContent};document.getElementById('fc-ref').value='AR-4512';document.getElementById('fc-ok').click();await w(250);return r;},PASTE);
r=await R();
console.log('2) commande collée :',JSON.stringify(out.rows),'· non reconnue',out.bad,'·',['Barre DN200','Barre DN100','Manchon DN200','Coude 90° DN100','Manchon DN100'].map(l=>l+' '+pick(r,l)).join(' ; '));
C.c2=out.rows.length===5&&out.rows[0].kind==='pipe'&&out.rows[0].dn==='200'&&out.rows[0].qty==='18'&&out.rows[1].qty==='84'&&/84 ml → 7 barres/.test(out.rows[1].raw)&&out.rows[2].kind==='sleeve'&&out.rows[3].kind==='pu'&&out.rows[4].kind==='bend'&&out.bad
  &&pick(r,'Barre DN200')==='20/0/0/20/18/0/0/18/2/0'&&pick(r,'Barre DN100')==='14/0/0/14/7/0/0/7/7/0'&&pick(r,'Manchon DN200')==='18/0/0/18/22/0/0/22/0/4'&&pick(r,'Coude 90° DN100')==='0/0/0/0/2/0/0/2/0/2'&&r.by['Manchon DN100'].aCmd===12;
// ── 3) pièces en plus (2 barres DN200, casse) + une modif du tracé (l'initial avait 12 barres DN100) → besoin, modifs, à commander ; filtre « À commander » ; CSV
await page.evaluate(async()=>{const w=ms=>new Promise(r=>setTimeout(r,ms));document.querySelector('#fourniture [data-fa=xadd]').click();await w(150);const s=(id,v)=>{const el=document.getElementById(id);el.value=v;el.dispatchEvent(new Event('change',{bubbles:true}));};s('fx-k','pipe');s('fx-dn','200');document.getElementById('fx-q').value='2';s('fx-why','Casse / pièce abîmée');document.getElementById('fx-ok').click();await w(200);
  const T=window.TRACE;T.net.fourniture.init.need['pipe:100']=12;T.fourniture.render();});
r=await R();
out=await page.evaluate(async()=>{const w=ms=>new Promise(r=>setTimeout(r,ms));document.querySelector('#fourniture [data-fa=fil][data-v=acmd]').click();await w(150);const rows=[...document.querySelectorAll('#fourniture table.fz-cmp tr')].slice(1,-1).map(tr=>tr.cells[0].textContent);const ex=document.querySelector('#fourniture details[data-fzui=extra]').textContent.replace(/\s+/g,' ');document.querySelector('#fourniture [data-fa=fil][data-v=all]').click();await w(100);return {rows,ex};});
const dl=page.waitForEvent('download',{timeout:5000}).catch(()=>null);await page.evaluate(()=>document.querySelector('#fourniture [data-fa=csv][data-v=cmp]').click());const d=await dl;const csv=d?fs.readFileSync(await d.path(),'utf8'):'';
console.log('3) en plus + modif + filtre + CSV :',pick(r,'Barre DN200'),'·',pick(r,'Barre DN100'),'·',JSON.stringify(out.rows),'·',d&&d.suggestedFilename(),csv.split(/\r\n/)[0]);
C.c3=pick(r,'Barre DN200')==='20/0/2/22/18/0/0/18/4/0'&&pick(r,'Barre DN100')==='12/2/0/14/7/0/0/7/7/0'&&r.tot.modP===2&&out.rows.length===6&&!out.rows.some(x=>/Coude|Manchon DN200|Mousse PU \(A\+B\) DN200/.test(x))&&/2 × Barre DN200/.test(out.ex)&&/Casse/.test(out.ex)
  &&/fourniture comparatif\.csv$/.test(d&&d.suggestedFilename()||'')&&/^﻿?Référence;Initial;Modifs;En plus;Besoin;Commandé;Livré;Attendu;Reste à livrer;À commander;Surplus;Posé/.test(csv)&&/Barre DN200;20;0;2;22;18;0;0;18;4;0;0/.test(csv);
// ── 4) un camion de 10 barres DN200 reçu dans Stock (pointé) → livré 10, reste à livrer 8 — rien à ressaisir dans Fourniture
await page.evaluate(()=>{const T=window.TRACE;const st=T.net.stock||(T.net.stock={});st.zones=[{id:'Z1',name:'Bord de fouille',x:30,y:70,w:13,h:3,status:'ok'}];st.livs=[{id:'LV1',label:'Camion 1',status:'ok',at:new Date().toISOString(),date:'2026-10-12'}];st.lots=[{id:'LV1:0',liv:'LV1',zone:'Z1',key:'pipe:200::315:12:',label:'Barre 12 m DN200',kind:'pipe',dn:200,gaine:315,len:12,qty:10}];st.takes=[];st.moves=[];T.fourniture.render();});
r=await R();console.log('4) livré (Stock) :',pick(r,'Barre DN200'));
C.c4=pick(r,'Barre DN200')==='20/0/2/22/18/10/0/8/4/0';
// ── 5) entourer la zone A au doigt sur le plan (moitié gauche du feeder) : 4 touchers, « Fermer » → nom + début lundi 19/10 → la liste de la zone
await page.evaluate(()=>{document.querySelector('#fourniture [data-fa=lasso]').click();});await wait(300);
const scr=await page.evaluate(()=>{const T=window.TRACE;T.centerOn(30,60,4);const v=T.state.view;const r2=document.getElementById('canvas').getBoundingClientRect();const P=[[-6,40],[55,40],[55,60],[-6,60]];return {bar:document.getElementById('fzBar').style.display,pts:P.map(p=>[r2.left+p[0]*v.k+v.tx,r2.top+p[1]*v.k+v.ty])};});
for(const p of scr.pts){await page.mouse.click(p[0],p[1]);await wait(200);}
out=await page.evaluate(async()=>{const w=ms=>new Promise(r=>setTimeout(r,ms));const T=window.TRACE;const r={n:T.state.fzPose&&T.state.fzPose.pts.length,msg:document.getElementById('fzMsg').textContent,ok:document.getElementById('fzOk').style.display!=='none',overlay:document.querySelectorAll('#fzG circle').length};document.getElementById('fzOk').click();await w(200);
  r.modal=!!document.getElementById('fzn-name');document.getElementById('fzn-name').value='Zone A';document.getElementById('fzn-date').value='2026-10-19';document.getElementById('fzn-ok').click();await w(400);const M=document.getElementById('modal');r.tab=T.state.tab;r.title=(M.querySelector('h3')||{}).textContent;r.hint=(M.querySelector('.hint')||{}).textContent;r.rows=[...M.querySelectorAll('table.rc tr')].slice(1).map(tr=>[...tr.cells].map(c=>c.textContent.replace(/\s+/g,' ').trim()).join('|'));r.stats=[...M.querySelectorAll('.ac-stat')].map(x=>x.textContent.replace(/\s+/g,' ').trim());
  M.querySelector('[data-close]').click();await w(150);return r;});
r=await R();
console.log('5) zone A entourée :',JSON.stringify(out),'·',JSON.stringify(r.zones[0]));
const zA=r.zones[0]||{tot:{}};
C.c5=scr.bar==='flex'&&out.n===4&&/Fermer/.test(out.msg)&&out.ok&&out.overlay===4&&out.modal&&out.tab==='fourniture'&&/Zone A/.test(out.title||'')&&/lun\. 19\/10/.test(out.hint||'')&&/jeu\. 15\/10/.test(out.hint||'')
  &&zA.name==='Zone A'&&zA.date==='2026-10-19'&&zA.livd==='2026-10-15'&&out.rows.some(x=>/^Barre DN200\|10\|10\|—\|—\|—$/.test(x))&&zA.tot.stock>=10&&zA.trucks.length===1;
// ── 6) zone B reprise du phasage (antenne entière, soudage du 26/10) → 14 barres DN100 : 7 sur la commande, 7 à commander ; camion daté du 22/10 ; planning chronologique
await page.evaluate(()=>{const T=window.TRACE;T.net.phasage={week:5,seq:2,groups:[],phases:[{id:'PH001',level:'exe',name:'Phase antenne',color:'#3aa655',tr:[{line:'L2',m0:0,m1:84}],dates:{tr:['',''],so:['2026-10-26','2026-10-30'],rb:['',''],en:['','']}}]};T.fourniture.render();document.querySelector('#fourniture [data-fa=phases]').click();});await wait(300);
r=await R();out=await page.evaluate(()=>({rows:[...document.querySelectorAll('#fourniture .fz-trucks .eq-row')].map(tr=>tr.textContent.replace(/\s+/g,' ').trim()),weeks:[...document.querySelectorAll('#fourniture .fz-trucks > .eq-s')].map(x=>x.textContent),mini:document.querySelectorAll('#fourniture svg.fz-mini polygon, #fourniture svg.fz-mini polyline[data-fzz]').length,labels:[...document.querySelectorAll('#fourniture svg.fz-mini text')].map(t=>t.textContent),fillB:Math.round((14+2*0.3)/window.TRACE.fourniture.cap(100,window.TRACE.fourniture.of().cfg)*100)}));
console.log('6) zone B (phasage) + planning :',JSON.stringify(r.zones[1]),'·',JSON.stringify(r.trucks),'·',JSON.stringify(out));
const zB=r.zones[1]||{tot:{},trucks:[]};
C.c6=r.zones.length===2&&zB.name==='Phase antenne'&&zB.date==='2026-10-26'&&zB.livd==='2026-10-22'&&zB.tot.rem===40&&zB.tot.order===7&&zB.trucks.length===1&&zB.trucks[0].lines.some(x=>/^Barre DN100×14\(cde 7\)$/.test(x))&&zB.trucks[0].fill===out.fillB
  &&r.trucks.join()==='prop:Zone A:2026-10-15:1,prop:Phase antenne:2026-10-22:1'&&out.rows.length===2&&out.weeks.join()==='Semaine 42,Semaine 43'&&/jeu\. 15\/10.*Zone A/.test(out.rows[0])&&/jeu\. 22\/10.*Phase antenne/.test(out.rows[1])&&out.mini>=2&&out.labels.some(t=>/Zone A · 19\/10 · 🚚1/.test(t))&&out.labels.some(t=>/Phase antenne · 26\/10 · 🚚1/.test(t));
// ── 7) « → Stock » : le camion de la zone B devient une livraison PRÉVUE de Stock (zone de déchargement à choisir à l'arrivée) → attendu ; plus de camion proposé pour B
out=await page.evaluate(async()=>{const w=ms=>new Promise(r=>setTimeout(r,ms));const b=[...document.querySelectorAll('#fourniture [data-fa=ann]')].find(x=>/Phase|FZ/.test(x.dataset.v)&&x.closest('.eq-row')&&/Phase antenne/.test(x.closest('.eq-row').textContent));b.click();await w(150);const M=document.getElementById('modal');const r={warn:/pas sur la commande/.test(M.textContent),opts:[...document.querySelectorAll('#fz-anz option')].map(o=>o.textContent)};document.getElementById('fz-anok').click();await w(250);
  const st=window.TRACE.net.stock;const v=st.livs.find(x=>x.src==='fourniture');r.liv=v&&{label:v.label,date:v.date,status:v.status,fzn:v.fzn};r.lots=st.lots.filter(l=>l.liv===(v&&v.id)).map(l=>l.label+'×'+l.qty+(l.zone?'@'+l.zone:'@—')+(l.pend?' att.':''));return r;});
r=await R();
console.log('7) annoncé dans Stock :',JSON.stringify(out),'·',pick(r,'Barre DN100'),'·',JSON.stringify(r.trucks));
C.c7=out.warn&&out.opts[0]==='À choisir à l\'arrivée du camion'&&out.liv&&out.liv.label==='Camion Phase antenne n° 1'&&out.liv.date==='2026-10-22'&&out.liv.status==='prevu'&&out.lots.includes('Barre 12 m DN100×14@— att.')&&pick(r,'Barre DN100')==='12/2/0/14/7/0/14/7/7/0'&&r.trucks.join()==='prop:Zone A:2026-10-15:1,ann:Phase antenne:2026-10-22:1'&&r.zones[1].ann===1&&r.zones[1].trucks.length===0;
// ── 8) Stock : « 📦 Camion arrivé » → zone de déchargement choisie à l'arrivée (Bord de fouille) + photo → en stock ; Fourniture : livré 14, attendu 0
out=await page.evaluate(async()=>{const w=ms=>new Promise(r=>setTimeout(r,ms));const T=window.TRACE;T.state.tab='stock';T.renderAll();await w(200);const v=T.net.stock.livs.find(x=>x.src==='fourniture');const b=document.querySelector(`#stock [data-stkunload="${v.id}"]`);const r={btn:!!b,zoneCol:/à l'arrivée/.test(document.getElementById('stock').textContent)};if(b){b.click();await w(200);}r.sel=[...document.querySelectorAll('#stk-unz option')].map(o=>o.textContent);return r;});
await page.setInputFiles('#stk-ph',{name:'dechargement.png',mimeType:'image/png',buffer:Buffer.from(PNG.split(',')[1],'base64')});await wait(500);
out.after=await page.evaluate(async()=>{const w=ms=>new Promise(r=>setTimeout(r,ms));const s=document.getElementById('stk-unz');s.value='Z1';document.getElementById('stk-unok').click();await w(300);const st=window.TRACE.net.stock;const v=st.livs.find(x=>x.src==='fourniture');return {status:v.status,lots:st.lots.filter(l=>l.liv===v.id).map(l=>l.label+'×'+l.qty+'@'+l.zone+(l.pend?' att.':''))};});
r=await R();
console.log('8) pointé dans Stock :',JSON.stringify(out),'·',pick(r,'Barre DN100'),'·',JSON.stringify(r.zones[1].tot));
C.c8=out.btn&&out.zoneCol&&out.sel.join()==='Bord de fouille,➕ Nouvelle zone — à poser sur le plan après validation'&&out.after.status==='ok'&&out.after.lots.includes('Barre 12 m DN100×14@Z1')&&pick(r,'Barre DN100')==='12/2/0/14/7/14/0/0/0/0'&&r.zones[1].tot.stock>=14;
// ── 9) plan : la zone entourée sur le calque ; Karim (soudeur) ne voit pas l'onglet ; téléphone : Technique sans défilement ; « ＋ Poser » propose la zone à livrer
out=await page.evaluate(async()=>{const w=ms=>new Promise(r=>setTimeout(r,ms));const T=window.TRACE;T.state.tab='plan';T.renderAll();await w(150);const r={poly:document.querySelectorAll('#fzG polygon').length,label:[...document.querySelectorAll('#fzG text')].map(t=>t.textContent)};
  document.getElementById('planFab').click();await w(150);r.pose=[...document.querySelectorAll('#modal [data-pose-mode]')].map(b=>b.dataset.poseMode);document.querySelector('#modal [data-close]').click();await w(100);return r;});
await page.selectOption('#roleSel','karim');await wait(300);
out.karim=await page.evaluate(()=>({allowed:window.TRACE.tabAllowed('fourniture'),btn:document.querySelector('#tabbar [data-tab="fourniture"]').style.display}));
await page.selectOption('#roleSel','ethan');await wait(200);await page.setViewportSize({width:390,height:844});await wait(200);
out.phone=await page.evaluate(async()=>{document.querySelector('#facets [data-facet=tech]').click();await new Promise(r=>setTimeout(r,250));const tb=document.getElementById('tabbar');return {vis:[...tb.querySelectorAll('[data-tab]')].filter(b=>b.style.display!=='none'&&!b.classList.contains('fhide')).map(b=>b.dataset.tab),scroll:tb.scrollWidth>tb.clientWidth+2};});
console.log('9) plan + droits + téléphone :',JSON.stringify(out));
C.c9=out.poly===1&&out.label.some(t=>/Zone A · 19\/10/.test(t))&&out.pose.includes('fourn')&&out.karim.allowed===false&&out.karim.btn==='none'&&out.phone.vis.join()==='bouclage,hydro,stock,fourniture,phasage,ts,points,__more' /* 20/10 (lot PA) : + 📍 Points */&&!out.phone.scroll;
// ── 10) lecteur de commandes (PDF / texte libre) : quantité en bout de ligne, prix ignorés, dates jamais lues comme DN, codes fournisseur
out=await page.evaluate(()=>{const F=window.TRACE.fourniture;const L=s=>{const x=F.parseLine(s);return x?x.key+'×'+x.qty:null;};return [L('Tube DN100 12 m 24'),L('Manchon DN100 40 u 12,50 500,00'),L('[R-200/315-12] Tube pré-isolé 16'),L('Coude 45° 114,3/200 6'),L('Té DN150 x DN80 3 pcs'),L('Commande du 20/10/2026 n° 1234'),L('Tube DN250 96 ml'),L('Réduction 168,3/250 - 114,3/200 2')];});
console.log('10) lecteur :',JSON.stringify(out));
C.c10=out.join()==='pipe:100×24,sleeve:100×40,pipe:200×16,bend:100:45×6,tee:150:80×3,,pipe:250×8,reducer:150:100×2';
// ── 11) deux zones qui se chevauchent : la plus tardive le signale (pièces comptées deux fois)
await page.setViewportSize({width:900,height:940});
out=await page.evaluate(async()=>{const T=window.TRACE;const F=T.net.fourniture;F.zones.push({id:'FZtest',name:'Zone C',poly:[[40,40],[75,40],[75,60],[40,60]],date:'2026-11-02',at:new Date().toISOString(),upd:new Date().toISOString()});T.state.tab='fourniture';T.renderAll();await new Promise(r=>setTimeout(r,200));const X=T.fourniture.compute();const Z=X.zones.find(z=>z.z.id==='FZtest');const row=[...document.querySelectorAll('#fourniture .fz-zrow')].find(x=>/Zone C/.test(x.textContent));return {ov:Z&&Z.overlap,first:X.zones[0].overlap,warn:!!row&&/comptées deux fois|comptée deux fois/.test(row.textContent)};});
console.log('11) chevauchement :',JSON.stringify(out));
C.c11=out.ov===4&&out.first===0&&out.warn;
const bad=Object.entries(C).filter(([k,v])=>!v).map(([k])=>k);console.log(bad.length?'RESULTAT: ECHEC '+bad.join(','):'RESULTAT: TOUT VERT');console.log(logs.length?logs:'[]');
await browser.close();
