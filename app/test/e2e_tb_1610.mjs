// LOT TB — RETOURS D'ETHAN DU 16/10 AU SOIR (traceur : versions). Données 100 % FICTIVES, hors connexion.
//  c1 · étude en v1 (?site=new&aff=…&cv=1) : 3 lignes, v0 / vm = 1, version de chaque tronçon l.sv = 1, pas de légende des versions ; enregistrée dans TRACÉ ;
//  c2 · passage en v2 (?site=<id>&aff=…&cv=2, comme le fait l'appli) : référence de version (vref) = le tracé de la fin de v1, légende « v1 · v2 (en cours) »,
//       interrupteur « Afficher ce qui a été supprimé » coché, 🕑 Versions ;
//  c3 · une longue ligne (2,4 km, 4 tronçons) raccourcie de 21 m (fiche de la ligne, longueur saisie) : SEUL le dernier tronçon passe en couleur v2 (sv = 1,1,1,2),
//       le bout enlevé reste dessiné en gris pointillé « supprimé en v2 » (l.del), un clic dessus dit « supprimé en v2 · 21 m » sans rien sélectionner, fiche de la ligne ;
//  c4 · une ligne supprimée (fiche, « Supprimer la ligne ») : fantôme grisé « « Rue Fictive » supprimée en v2 », clic → « … · 300 m », jamais sélectionnable (clic, rectangle),
//       sortie de sa zone, absente des extrémités ; une ligne ajoutée en v2 ;
//  c5 · pont : site.lines SANS les fantômes (ni L2, ni les 21 m), sv sur les lignes, traceur.ghosts / traceur.vref / traceur.lines[].del ; quantités du tracé (qtrace.js,
//       dans Node ET dans l'appli) sans rien de supprimé ; une ligne « ghost » passée par erreur n'est pas comptée ;
//  c6 · interrupteur « Afficher ce qui a été supprimé » (légende) : décoché → plus rien de grisé, plus de message au clic ; gardé au rechargement ; recoché ;
//  c7 · panneau 🕑 Versions : par version, ajouté / modifié / supprimé (lignes, ml par DN) ; clic sur v2 → ses changements en évidence (le reste estompé, cadré),
//       « Tout afficher », Échap ;
//  c8 · annuler (Ctrl+Z) : la ligne ajoutée, la ligne supprimée, puis le tronçon raccourci reviennent (plus rien de grisé, sv = 1,1,1,1) ; rétablir (Ctrl+Y) ;
//       une étape remise à l'identique (sommet déplacé puis remis) ne laisse ni couleur ni gris ;
//  c9 · ancienne étude SANS l.sv (remise du traceur d'avant) : mêmes couleurs qu'avant (ligne entière à la couleur de vm), rien de grisé, aucune donnée ajoutée tant
//       qu'on n'y touche pas ; retouchée en v3 : la v2 passe en fantôme figé, seul le tronçon touché passe en v3 ; contexte chantier : rien de tout cela ;
//  c10 · téléphone (390 px) : rien ne déborde, boutons ≥ 34 px, panneau 🕑, fantômes ;
//  c11 · console vide.
import { chromium } from 'playwright';
import path from 'path';
import {traceQtyOf} from '../src/qtrace.js';
const BASE=process.env.BASE||'http://localhost:8765';const SHOTS=process.env.SHOTS||'';
const browser=await chromium.launch({headless:true, executablePath: process.env.CHROMIUM_PATH||undefined});
const ctx=await browser.newContext({viewport:{width:1366,height:800}});const page=await ctx.newPage();
const logs=[];const watch=p=>{p.on('pageerror',e=>logs.push('PAGEERROR: '+e.message.slice(0,300)));p.on('console',m=>{if(m.type()==='error'&&!/supabase|Failed to fetch|net::ERR|404|WebSocket|pdf\.worker|cdnjs/i.test(m.text()))logs.push(m.text().slice(0,200));});};watch(page);
await ctx.route(u=>!/^(localhost|127\.0\.0\.1)$/.test(new URL(u).hostname),r=>r.fulfill({status:200,contentType:'application/json',body:'{}'})); // aucun réseau extérieur
page.on('dialog',d=>{d.accept().catch(()=>{});});
const C={};const wait=ms=>page.waitForTimeout(ms);const near=(a,b,t=0.05)=>Math.abs(a-b)<=t;const J=x=>JSON.stringify(x);const sp=t=>String(t||'').replace(/[\s\u202f\u00a0]+/g,' ').trim(); // espaces fines des nombres (fr-FR) → espace
const shot=async(p,n)=>{if(!SHOTS)return;try{await p.screenshot({path:path.join(SHOTS,n+'.png')});}catch(e){console.log('capture',n,e.message.slice(0,80));}};
const toScreen=async(wx,wy,p=page)=>p.evaluate(([x,y])=>{const v=window.MAQ.state.view;const r=document.getElementById('svg').getBoundingClientRect();return [r.left+x*v.k+v.tx,r.top+y*v.k+v.ty];},[wx,wy]);
const clickW=async(x,y)=>{const s=await toScreen(x,y);await page.mouse.click(s[0],s[1]);await wait(150);};
const hint=()=>page.evaluate(()=>document.getElementById('hint').textContent);
const flush=()=>page.evaluate(()=>window.MAQ.t1.hist.flush());
const handoff=id=>page.evaluate(id=>new Promise(res=>{const q=indexedDB.open('trace-kv');q.onsuccess=()=>{try{const g=q.result.transaction('kv','readonly').objectStore('kv').get('trace:handoff:'+id);g.onsuccess=()=>res(g.result||null);g.onerror=()=>res(null);}catch(e){res(null);}};q.onerror=()=>res(null);}),id);
const saveTrace=async(name)=>{await page.click('#bSave');await wait(250);await page.fill('#svName',name);await page.click('#svOk');await wait(1400);const id=await page.evaluate(()=>window.MAQ.state.siteRef&&window.MAQ.state.siteRef.id);const s=id?await handoff(id):null;await page.click('#svStay').catch(()=>{});await wait(150);return {id,site:s};};
const setLines=lines=>page.evaluate(lines=>{const M=window.MAQ;M.state.supplier='AXIOM';M.state.lines=lines;M.state.seq=Math.max(1,...lines.map(l=>+l.id.replace(/\D/g,'')))+1;M.setMode('select');M.state.sel=null;M.rebuild();document.getElementById('zFit').click();},lines);
const sel=(id,tab)=>page.evaluate(([id,tab])=>{const M=window.MAQ;M.state.sel=id?{kind:'line',id}:null;M.state.selV=[];M.state.tab=tab||'sel';M.rebuild();},[id,tab]);
const view=(x0,y0,x1,y1,p=page)=>p.evaluate(b=>{const M=window.MAQ;const svg=document.getElementById('svg');const W=svg.clientWidth,H=svg.clientHeight;const k=Math.min(W/(b[2]-b[0]),H/(b[3]-b[1]));M.state.view={k,tx:(W-(b[2]-b[0])*k)/2-b[0]*k,ty:(H-(b[3]-b[1])*k)/2-b[1]*k};window.dispatchEvent(new Event('resize'));},[x0,y0,x1,y1]);
const lineOf=id=>page.evaluate(id=>{const l=window.MAQ.state.lines.find(x=>x.id===id);return l?JSON.parse(JSON.stringify(l)):null;},id);
const len=pts=>pts.reduce((s,p,i)=>i?s+Math.hypot(p[0]-pts[i-1][0],p[1]-pts[i-1][1]):0,0);
// couleur de chaque pièce d'une conduite, classée par tronçon de l'axe (milieu de la pièce) — expect(x,y) → 'v1' | 'v2' | null (coin : l'un ou l'autre)
const colors=(id,cond)=>page.evaluate(([id,cond])=>{const M=window.MAQ;const B=M.state.built[id];if(!B)return [];return B[cond].pieces.filter(p=>p.kind!=='teeBranch'&&p.path&&p.path.length).map(p=>{const el=document.querySelector(`#net path.piece[data-line="${id}"][data-cond="${cond}"][data-id="${p.id}"]`)||document.querySelector(`#net rect.piece[data-line="${id}"][data-cond="${cond}"][data-id="${p.id}"]`);const m=p.path[Math.floor(p.path.length/2)];return {id:p.id,kind:p.kind,x:m[0],y:m[1],stroke:el?el.getAttribute('stroke'):null};});},[id,cond]);
const V1={A:'#c8382f',R:'#2a5fb4'},V2={A:'#e8710a',R:'#a34e05'},V3={A:'#8e44ad',R:'#5b2c70'};
// ── mise en place : appareil vierge
await page.goto(BASE+'/traceur.html');await wait(500);await page.evaluate(()=>{localStorage.clear();localStorage.setItem('trace:wide','1');});await page.evaluate(()=>new Promise(r=>{try{const q=indexedDB.deleteDatabase('trace-kv');q.onsuccess=q.onerror=q.onblocked=()=>r();}catch(e){r();}}));
const AFF='ETU-TB-01';
// ════ c1 · ÉTUDE EN V1 : 3 lignes
await page.goto(BASE+'/traceur.html?site=new&aff='+AFF+'&cv=1');await wait(900);
await setLines([
  {id:'L1',name:'Rue des Essais',dn:100,bar:12,pts:[[0,0],[600,0],[600,400],[1400,400],[1400,1000]],specials:[],parent:null,inv:true}, // 2 400 m, 4 tronçons
  {id:'L2',name:'Rue Fictive',dn:80,bar:12,pts:[[0,200],[300,200]],specials:[],parent:null,inv:true},
  {id:'L3',name:'Antenne Test',dn:65,bar:12,pts:[[300,0],[300,-150]],specials:[],parent:{line:'L1',m:300,side:1},inv:true}]);
await flush();
let out={etude:await page.evaluate(()=>window.MAQ.t1.etude()),cv:await page.evaluate(()=>window.MAQ.t1.cv())};
out.v=await page.evaluate(()=>window.MAQ.state.lines.map(l=>l.id+':'+l.v0+'/'+l.vm+':'+JSON.stringify(l.sv)).join(' '));
out.leg=await page.evaluate(()=>({t1:getComputedStyle(document.getElementById('t1VerLeg')).display,tb:getComputedStyle(document.getElementById('tbLeg')).display,btn:getComputedStyle(document.getElementById('tbVers')).display}));
out.ghost=await page.evaluate(()=>document.querySelectorAll('#net .tb-ghost').length);
let sv=await saveTrace('Étude TB essai');const SITE_E=sv.id;out.save=sv.site&&{ctx:sv.site.traceur.ctx,cv:sv.site.traceur.cv,sv:sv.site.lines.map(l=>l.id+':'+JSON.stringify(l.sv)).join(' '),ghosts:sv.site.traceur.ghosts===undefined,vref:sv.site.traceur.vref&&sv.site.traceur.vref.cv};
console.log('1) étude v1 :',J(out));
C.c1=out.etude&&out.cv===1&&out.v==='L1:1/1:[1,1,1,1] L2:1/1:[1] L3:1/1:[1]'&&out.leg.t1==='none'&&out.leg.tb==='none'&&out.leg.btn==='none'&&out.ghost===0&&!!SITE_E
  &&!!out.save&&out.save.ctx==='etude'&&out.save.cv===1&&out.save.sv==='L1:[1,1,1,1] L2:[1] L3:[1]'&&out.save.ghosts&&out.save.vref===1;
// ════ c2 · PASSAGE EN V2 (adresse de l'appli : ?site=<id>&aff=<n°>&cv=2)
await page.goto(BASE+'/traceur.html?site='+SITE_E+'&aff='+AFF+'&cv=2');await wait(1600);
out={cv:await page.evaluate(()=>window.MAQ.t1.cv()),n:await page.evaluate(()=>window.MAQ.state.lines.length),vref:await page.evaluate(()=>{const r=window.MAQ.t1.tb.vref();return r&&{cv:r.cv,ids:r.lines.map(l=>l.id).join()};})};
out.legend=await page.evaluate(()=>document.getElementById('t1VerLeg').textContent);
out.tbLeg=await page.evaluate(()=>{const s=document.getElementById('tbLeg');const c=s.querySelector('input[data-tb="suppr"]');return {vis:getComputedStyle(s).display!=='none',txt:s.textContent.replace(/\s+/g,' ').trim(),checked:!!(c&&c.checked),btn:getComputedStyle(document.getElementById('tbVers')).display!=='none'};});
out.col=await colors('L1','A');out.allV1=out.col.every(p=>p.stroke===V1.A);out.col=out.col.length;
console.log('2) passage en v2 :',J(out));
C.c2=out.cv===2&&out.n===3&&out.vref&&out.vref.cv===2&&out.vref.ids==='L1,L2,L3'&&/Versions : v1 · v2 \(en cours\)/.test(out.legend)&&out.tbLeg.vis&&/Afficher ce qui a été supprimé/.test(out.tbLeg.txt)&&/🕑 Versions/.test(out.tbLeg.txt)&&out.tbLeg.checked&&out.tbLeg.btn&&out.allV1&&out.col>20;
// ════ c3 · RACCOURCIR LA LONGUE LIGNE DE 21 m : seul le tronçon touché change de couleur, le bout enlevé reste grisé
await sel('L1');await page.fill('#shortLen','2379');await page.click('#panel [data-act="shortenTo"]');await wait(300);await flush();await wait(100);
let L1=await lineOf('L1');
out={len:+len(L1.pts).toFixed(2),sv:J(L1.sv),vm:L1.vm,del:L1.del&&L1.del.map(d=>({v:d.v,dn:d.dn,len:+len(d.pts).toFixed(2),a:d.pts[0],b:d.pts[d.pts.length-1],at:!!d.at}))};
const cls=async(id)=>{const r={};for(const c of ['A','R']){const P=await colors(id,c);const V=c==='A'?V2[c]:V2[c];r[c]={v2ok:P.filter(p=>Math.abs(p.x-1400)<2&&p.y>405).every(p=>p.stroke===V2[c]),v2n:P.filter(p=>Math.abs(p.x-1400)<2&&p.y>405).length,v1ok:P.filter(p=>p.y<395&&p.x<1395).every(p=>p.stroke===V1[c]),v1n:P.filter(p=>p.y<395&&p.x<1395).length,cols:[...new Set(P.map(p=>p.stroke))].sort().join()};}return r;};
out.cls=await cls('L1');out.L3=(await colors('L3','A')).every(p=>p.stroke===V1.A);
out.tee=await page.evaluate(()=>{const B=window.MAQ.state.built.L1;const t=B.A.pieces.find(p=>p.sid==='auto:L3');const el=t&&document.querySelector(`#net path.piece[data-line="L1"][data-cond="A"][data-id="${t.id}"]`);return el&&el.getAttribute('stroke');});
// le bout enlevé : gris pointillé, étiquette « supprimé en v2 » (vue rapprochée), clic → message, rien de sélectionné
await page.evaluate(()=>{const M=window.MAQ;M.state.sel=null;M.rebuild();});await view(1230,330,1570,600);await wait(200);await shot(page,'pc_0_couleurs_par_troncon');
await view(1340,940,1460,1020);await wait(200);
out.ghost=await page.evaluate(()=>{const g=[...document.querySelectorAll('#net path.tb-ghost[data-kind="del"]')];const t=[...document.querySelectorAll('#net text.tb-glab')].map(x=>x.textContent);return {n:g.length,dash:g.every(p=>!!p.getAttribute('stroke-dasharray')),stroke:g[0]&&g[0].getAttribute('stroke'),labels:t};});
await shot(page,'pc_1_raccourci_21m');
await clickW(1400,996);out.tap={hint:await hint(),sel:await page.evaluate(()=>window.MAQ.state.sel)};
await clickW(1400,960);out.live=await page.evaluate(()=>window.MAQ.state.sel);
await sel('L1');out.fiche=sp(await page.evaluate(()=>document.getElementById('panel').textContent));
console.log('3) raccourcie de 21 m :',J(out));
C.c3=out.len===2379&&out.sv==='[1,1,1,2]'&&out.vm===2&&out.del&&out.del.length===1&&out.del[0].v===2&&out.del[0].dn===100&&near(out.del[0].len,21,0.01)&&J(out.del[0].a)==='[1400,979]'&&J(out.del[0].b)==='[1400,1000]'&&out.del[0].at
  &&out.cls.A.v2ok&&out.cls.A.v2n>=10&&out.cls.A.v1ok&&out.cls.A.v1n>=50&&out.cls.R.v2ok&&out.cls.R.v1ok&&out.cls.A.cols.split(',').length===2&&out.L3&&out.tee===V1.A
  &&out.ghost.n===1&&out.ghost.dash&&out.ghost.labels.includes('supprimé en v2')&&out.tap.hint==='supprimé en v2 · 21 m'&&out.tap.sel===null&&out.live&&(out.live.kind==='line'?out.live.id:out.live.line)==='L1'
  &&/tronçons : v1 1 800 m · v2 579 m/.test(out.fiche)&&/supprimé \(grisé, non compté\) : v2 21 m/.test(out.fiche);
// ════ c4 · SUPPRIMER UNE LIGNE (v1) → fantôme grisé ; une zone ; extrémités ; une ligne AJOUTÉE en v2
await page.evaluate(()=>window.MAQ.t1.zoneNew(['L1','L2']));await wait(150);await flush();
await sel('L2');await page.click('#panel [data-act="delLine"]');await wait(300);await flush();
await page.evaluate(()=>{const M=window.MAQ;M.state.sel=null;M.rebuild();});await view(-60,-200,760,460);await wait(200);await shot(page,'pc_2_ligne_supprimee');await view(-40,120,340,280);await wait(200);
out={ids:await page.evaluate(()=>window.MAQ.state.lines.map(l=>l.id).join())};
out.ghosts=await page.evaluate(()=>window.MAQ.t1.tb.ghosts().map(g=>g.id+':v'+g.v+':'+g.name+':'+g.ghost).join());
out.draw=await page.evaluate(()=>({n:document.querySelectorAll('#net path.tb-ghost[data-kind="ghost"]').length,labels:[...document.querySelectorAll('#net text.tb-glab')].map(x=>x.textContent)}));
await clickW(150,200);out.tap={hint:await hint(),sel:await page.evaluate(()=>window.MAQ.state.sel)};
// rectangle de sélection autour du fantôme : aucune ligne
{const a=await toScreen(-20,170),b=await toScreen(320,230);await page.mouse.move(a[0],a[1]);await page.mouse.down();for(let i=1;i<=6;i++){await page.mouse.move(a[0]+(b[0]-a[0])*i/6,a[1]+(b[1]-a[1])*i/6);await wait(15);}await page.mouse.up();await wait(200);}
out.lasso={sel:await page.evaluate(()=>window.MAQ.state.sel),hint:await hint()};
out.zones=await page.evaluate(()=>window.MAQ.state.zones.map(z=>z.id+':'+z.lines.join('+')).join(' '));
out.ends=await page.evaluate(()=>window.MAQ.t1.endsRows().rows.map(r=>r.t+'|'+r.dn+'|'+r.n).join(' '));
out.dil=await page.evaluate(()=>window.MAQ.t1.dilat().list.every(a=>a.line!=='L2'));
// une ligne ajoutée en v2 (tracée à la souris)
await view(-60,-260,700,520);await page.evaluate(()=>window.MAQ.setMode('trace'));await wait(100);await clickW(700,-200);await clickW(700,-100);await page.keyboard.press('Enter');await wait(300);await page.evaluate(()=>window.MAQ.setMode('select'));await flush();
out.added=await page.evaluate(()=>{const l=window.MAQ.state.lines[window.MAQ.state.lines.length-1];return l.id+':'+l.v0+'/'+l.vm+':'+JSON.stringify(l.sv)+':'+Math.round(window.MAQ.state.lines.length);});
out.addedCol=await page.evaluate(()=>{const M=window.MAQ;const l=M.state.lines[M.state.lines.length-1];const ps=[...document.querySelectorAll(`#net path.piece[data-line="${l.id}"][data-cond="A"]`)];return [...new Set(ps.map(p=>p.getAttribute('stroke')))].join();});
console.log('4) ligne supprimée, ligne ajoutée :',J(out));
const NEWID=out.added.split(':')[0];
C.c4=out.ids==='L1,L3'&&out.ghosts==='L2:v2:Rue Fictive:true'&&out.draw.n===1&&out.draw.labels.includes('« Rue Fictive » supprimée en v2')&&out.tap.hint==='« Rue Fictive » supprimée en v2 · 300 m'&&out.tap.sel===null
  &&out.lasso.sel===null&&/Aucune ligne dans le rectangle/.test(out.lasso.hint)&&out.zones==='z1:L1'&&!/80/.test(out.ends)&&out.dil&&/^L4:2\/2:\[2\]:3$/.test(out.added)&&out.addedCol===V2.A;
// ════ c5 · LE PONT ET LES QUANTITÉS : sans rien de ce qui a été supprimé
sv=await saveTrace('Étude TB essai');const S5=sv.site;
out={same:sv.id===SITE_E,lines:S5&&S5.lines.map(l=>l.id).join(),L1end:S5&&J(S5.lines.find(l=>l.id==='L1').axis.slice(-1)[0]),L1sv:S5&&J(S5.lines.find(l=>l.id==='L1').sv),
  ghosts:S5&&(S5.traceur.ghosts||[]).map(g=>g.id+':v'+g.v+':'+g.ghost).join(),vref:S5&&S5.traceur.vref&&S5.traceur.vref.cv+':'+S5.traceur.vref.lines.map(l=>l.id).join('+'),
  del:S5&&J((S5.traceur.lines.find(l=>l.id==='L1').del||[]).map(d=>d.v+':'+d.pts.length)),zones:S5&&J(S5.traceur.zones),welds:S5&&S5.report.welds,len:S5&&+S5.report.length.toFixed(1)};
const q=S5?traceQtyOf({lines:S5.lines,sess:false,meta:S5.lines,zones:S5.traceur.zones}):null;
const axisLen=S5?S5.lines.reduce((s,l)=>s+len(l.axis),0):0;
out.q=q&&{mlTr:q.tot.mlTr,soud:q.tot.soud,dn:q.rows.map(r=>r.dn).join(),ext:Object.keys(q.ext).sort().join()};out.axis=+axisLen.toFixed(1);
// une ligne « ghost » glissée par erreur dans les lignes n'est jamais comptée
const qg=S5?traceQtyOf({lines:S5.lines.concat([Object.assign(JSON.parse(J(S5.lines[0])),{id:'Lx',ghost:true})]),sess:false}):null;out.qg=qg&&qg.tot.mlTr===q.tot.mlTr&&qg.tot.soud===q.tot.soud;
// dans l'appli : mêmes quantités, le tracé s'ouvre
await page.goto(BASE+'/index.html');await wait(900);{const s=await page.$('#loginSkip');if(s&&await s.isVisible())await s.click();await wait(500);}
out.app=await page.evaluate(site=>{const T=window.TRACE;T.etude.addSite(site);const r=T.etude.qty(site.id);return r&&{mlTr:r.tot.mlTr,soud:r.tot.soud};},S5);
console.log('5) pont et quantités :',J(out));
C.c5=out.same&&out.lines==='L1,L3,L4'&&out.L1end==='[1400,979]'&&out.L1sv==='[1,1,1,2]'&&out.ghosts==='L2:v2:true'&&out.vref==='2:L1+L2+L3'&&out.del==='["2:2"]'&&out.zones==='[{"id":"z1","nom":"Zone 1","lines":["L1"]}]'
  &&!!out.q&&Math.abs(out.q.mlTr-out.axis)<3&&Math.abs(out.axis-(2379+150+100))<0.5&&out.q.soud===out.welds&&out.q.dn==='100,65'&&out.qg&&out.app&&out.app.mlTr===out.q.mlTr&&out.app.soud===out.q.soud;
// ════ c6 · INTERRUPTEUR « Afficher ce qui a été supprimé »
await page.goto(BASE+'/traceur.html?site='+SITE_E+'&aff='+AFF+'&cv=2');await wait(1600);
await page.evaluate(()=>{const M=window.MAQ;M.state.sel=null;M.rebuild();});await view(-40,120,340,280);await wait(150);
out={before:await page.evaluate(()=>document.querySelectorAll('#net .tb-ghost').length)};
await page.click('#tbLeg input[data-tb="suppr"]');await wait(200);
out.off=await page.evaluate(()=>({n:document.querySelectorAll('#net .tb-ghost').length,show:window.MAQ.state.show.suppr,cb:document.querySelector('#tbLeg input[data-tb="suppr"]').checked}));
await page.evaluate(()=>{document.getElementById('hint').textContent='';});await clickW(150,200);out.offTap=await hint();
await page.reload();await wait(1500);await page.evaluate(()=>{const M=window.MAQ;M.state.sel=null;M.rebuild();});await view(-40,120,340,280);await wait(150);
out.reload=await page.evaluate(()=>({n:document.querySelectorAll('#net .tb-ghost').length,cb:document.querySelector('#tbLeg input[data-tb="suppr"]').checked}));
await page.click('#tbLeg input[data-tb="suppr"]');await wait(200);out.on=await page.evaluate(()=>({n:document.querySelectorAll('#net .tb-ghost').length,show:window.MAQ.state.show.suppr}));
console.log('6) interrupteur :',J(out));
C.c6=out.before>=2&&out.off.n===0&&out.off.show===false&&!out.off.cb&&!/supprimée en v2/.test(out.offTap)&&out.reload.n===0&&!out.reload.cb&&out.on.n>=2&&out.on.show===true;
// ════ c7 · PANNEAU 🕑 VERSIONS : comptes par version, mise en évidence au clic
await page.evaluate(()=>{document.getElementById('zFit').click();});await wait(150);
await page.click('#tbVers');await wait(250);
out={rows:(await page.evaluate(()=>[...document.querySelectorAll('#t1Float .tb-card .tb-v')].map(b=>[...b.children].map(c=>c.textContent).join(' ')))).map(sp)};
await shot(page,'pc_3_panneau_versions');
const k0=await page.evaluate(()=>window.MAQ.state.view.k);
await page.click('#t1Float .tb-v[data-v="2"]');await wait(300);
out.focus=await page.evaluate(()=>{const net=document.getElementById('net');const hl=[...net.querySelectorAll('.tb-hl')];const dim=net.querySelector('path.piece[data-line="L3"]');const g=net.querySelector('path.tb-ghost.tb-hl[data-kind="ghost"]');
  return {cls:net.classList.contains('tb-focus'),hl:hl.length,dimOp:dim?+getComputedStyle(dim).opacity:null,hlOp:hl.length?+getComputedStyle(hl[0]).opacity:null,ghost:!!g,on:!!document.querySelector('#t1Float .tb-v.on[data-v="2"]'),focused:window.MAQ.t1.tb.focused()};});
out.framed=await page.evaluate(k=>Math.abs(window.MAQ.state.view.k-k)>1e-3,k0);
out.visible=await page.evaluate(()=>{const M=window.MAQ;const v=M.state.view;const svg=document.getElementById('svg').getBoundingClientRect();const F=document.getElementById('t1Float').getBoundingClientRect();const sx=x=>svg.left+x*v.k+v.tx,sy=y=>svg.top+y*v.k+v.ty;
  const pts=[[0,200],[300,200],[1400,979],[1400,1000],[700,-200]];return pts.map(p=>{const x=sx(p[0]),y=sy(p[1]);return x>=F.right-2&&x<=svg.right&&y>=svg.top&&y<=svg.bottom;});});
await shot(page,'pc_4_v2_en_evidence');
await page.click('#t1Float [data-act="tb-all"]');await wait(200);out.all=await page.evaluate(()=>({cls:document.getElementById('net').classList.contains('tb-focus'),hl:document.querySelectorAll('#net .tb-hl').length}));
await page.click('#t1Float .tb-v[data-v="1"]');await wait(250);out.v1=await page.evaluate(()=>({f:window.MAQ.t1.tb.focused(),hl:document.querySelectorAll('#net path.tb-hl').length}));
await page.mouse.click(700,500);await page.keyboard.press('Escape');await wait(200);out.esc=await page.evaluate(()=>({f:window.MAQ.t1.tb.focused(),cls:document.getElementById('net').classList.contains('tb-focus')}));
await page.click('#t1Float [data-act="tb-close"]');await wait(150);out.closed=await page.evaluate(()=>!document.querySelector('#t1Float .tb-card'));
console.log('7) panneau 🕑 Versions :',J(out));
C.c7=out.rows.length===2&&/^v1 tracé de départ : 3 lignes \(dont 1 supprimée depuis\) — encore tel quel : 1 950 m \(DN100 1 800 m · DN65 150 m\)$/.test(out.rows[0])
  &&/^v2 \(en cours\) ＋ ajouté : 1 ligne · 100 m \(DN100 100 m\) ✎ modifié : 1 ligne · 579 m de tronçons \(DN100 579 m\) − supprimé : 1 ligne \+ 1 tronçon · 321 m \(DN100 21 m · DN80 300 m\) — « Rue Fictive »$/.test(out.rows[1])
  &&out.focus.cls&&out.focus.hl>10&&out.focus.dimOp!==null&&out.focus.dimOp<0.2&&out.focus.hlOp>0.9&&out.focus.ghost&&out.focus.on&&out.focus.focused===2&&out.framed&&out.visible.every(Boolean)
  &&!out.all.cls&&out.all.hl===0&&out.v1.f===1&&out.v1.hl>10&&out.esc.f===null&&!out.esc.cls&&out.closed;
// ════ c8 · ANNULER / RÉTABLIR : la ligne ajoutée, la ligne supprimée, le tronçon raccourci reviennent
// (rechargé : l'historique repart du chantier chargé — on refait les trois actions dans cette session)
await page.goto(BASE+'/traceur.html?site=new&aff=ETU-TB-02&cv=1');await wait(900);
await setLines([{id:'L1',name:'Rue des Essais',dn:100,bar:12,pts:[[0,0],[600,0],[600,400],[1400,400],[1400,1000]],specials:[],parent:null,inv:true},{id:'L2',name:'Rue Fictive',dn:80,bar:12,pts:[[0,200],[300,200]],specials:[],parent:null,inv:true}]);await flush();
sv=await saveTrace('Étude TB annuler');const SITE_U=sv.id;await page.goto(BASE+'/traceur.html?site='+SITE_U+'&aff=ETU-TB-02&cv=2');await wait(1600);
await page.evaluate(()=>window.MAQ.shortenLine('L1',2379));await flush();await page.evaluate(()=>{const M=window.MAQ;M.state.lines=M.state.lines.filter(l=>l.id!=='L2');M.rebuild();});await flush();
await page.evaluate(()=>{const M=window.MAQ;M.state.lines.push({id:'L3',name:'Rue Neuve',dn:50,bar:12,pts:[[700,-200],[700,-100]],specials:[],parent:null,inv:true});M.state.seq=4;M.rebuild();});await flush();
const snap=()=>page.evaluate(()=>{const M=window.MAQ;const l=M.state.lines.find(x=>x.id==='L1');return {ids:M.state.lines.map(x=>x.id).join(),len:Math.round(l.pts.reduce((s,p,i)=>i?s+Math.hypot(p[0]-l.pts[i-1][0],p[1]-l.pts[i-1][1]):0,0)),sv:JSON.stringify(l.sv),del:(l.del||[]).length,g:M.t1.tb.ghosts().map(g=>g.id).join(),dom:document.querySelectorAll('#net path.tb-ghost[data-kind]').length,last:(()=>{const p=M.state.built.L1.A.pieces;const e=document.querySelector(`#net path.piece[data-line="L1"][data-cond="A"][data-id="${p[p.length-2].id}"]`);return e&&e.getAttribute('stroke');})()};});
await page.evaluate(()=>{const M=window.MAQ;M.state.sel=null;M.rebuild();document.getElementById('zFit').click();});await wait(150);
out={s0:await snap()};await page.mouse.click(1000,700);
for(let i=1;i<=3;i++){await page.keyboard.press('Control+z');await wait(200);out['u'+i]=await snap();out['h'+i]=await hint();}
await page.keyboard.press('Control+y');await wait(200);out.r1=await snap();await page.keyboard.press('Control+y');await wait(200);out.r2=await snap();
// un sommet déplacé puis remis à sa place (deux étapes) : ni couleur ni gris
await page.evaluate(()=>{const M=window.MAQ;const l=M.state.lines.find(x=>x.id==='L1');l.pts[1]=[600,30];M.rebuild();});await flush();out.moved=await snap();
await page.evaluate(()=>{const M=window.MAQ;const l=M.state.lines.find(x=>x.id==='L1');l.pts[1]=[600,0];M.rebuild();});await flush();out.back=await snap();
// une antenne ajoutée en v2 sur un tronçon v1 : les tés qu'elle pose sur la parente prennent la couleur v2 (le reste de la parente garde la sienne)
await page.evaluate(()=>{const M=window.MAQ;M.state.lines.push({id:'L9',name:'Antenne v2',dn:65,bar:12,pts:[[800,400],[800,500]],specials:[],parent:{line:'L1',m:1200,side:1},inv:true});M.state.seq=10;M.rebuild();});await flush();
out.tee=await page.evaluate(()=>{const M=window.MAQ;const cols=c=>M.state.built.L1[c].pieces.filter(p=>p.sid==='auto:L9').map(p=>{const e=document.querySelector(`#net path.piece[data-line="L1"][data-cond="${c}"][data-id="${p.id}"]`);return e&&e.getAttribute('stroke');}).join();return cols('A')+'|'+cols('R')+'|'+JSON.stringify(M.state.lines.find(l=>l.id==='L1').sv);});
// « Opt n » : une ligne passée en option en v2 reste en pointillé avec son étiquette, et prend la couleur v2 (la tranche vaut pour toute la ligne)
await page.evaluate(()=>window.MAQ.t1.setTranche(['L9'],'option',1));await flush();
out.opt=await page.evaluate(()=>{const ps=[...document.querySelectorAll('#net path.piece[data-line="L9"][data-cond="A"]')];return {n:ps.length,dash:ps.filter(p=>p.getAttribute('stroke-dasharray')).length,cols:[...new Set(ps.map(p=>p.getAttribute('stroke')))].join(),lab:[...document.querySelectorAll('#net text.t1-opt')].map(t=>t.textContent).join(),sv:JSON.stringify(window.MAQ.state.lines.find(l=>l.id==='L9').sv)};});
console.log('8) annuler / rétablir :',J(out));
C.c8=out.s0.ids==='L1,L3'&&out.s0.len===2379&&out.s0.sv==='[1,1,1,2]'&&out.s0.del===1&&out.s0.g==='L2'&&out.s0.dom===2&&out.s0.last===V2.A
  &&out.u1.ids==='L1'&&out.u1.g==='L2'&&/^Annulé : création de « Rue Neuve »/.test(out.h1)
  &&out.u2.ids==='L1,L2'&&out.u2.g===''&&out.u2.dom===1&&out.u2.del===1&&/^Annulé : suppression de « Rue Fictive »/.test(out.h2)
  &&out.u3.ids==='L1,L2'&&out.u3.len===2400&&out.u3.sv==='[1,1,1,1]'&&out.u3.del===0&&out.u3.dom===0&&out.u3.last===V1.A&&/^Annulé : raccourcissement de « Rue des Essais »/.test(out.h3)
  &&out.r1.len===2379&&out.r1.sv==='[1,1,1,2]'&&out.r1.del===1&&out.r1.dom===1&&out.r2.ids==='L1'&&out.r2.g==='L2'&&out.r2.dom===2
  &&out.moved.sv==='[2,2,1,2]'&&out.moved.del===2&&out.back.sv==='[1,1,1,2]'&&out.back.del===1&&out.tee===V2.A+'|'+V2.R+'|[1,1,1,2]'&&out.opt.n>0&&out.opt.dash===out.opt.n&&out.opt.cols===V2.A&&out.opt.lab==='Opt 1'&&out.opt.sv==='[2]';
// ════ c9 · ANCIENNE ÉTUDE SANS l.sv (remise du traceur d'avant), puis contexte chantier
const OLD={id:'trc_tb_old',name:'Ancienne étude',source:'traceur',w:300,h:300,fiche:{etude:{aff:'ETU-TB-OLD'}},lines:[],traceur:{v:1,ctx:'etude',cv:2,savedAt:'2026-10-15T10:00:00Z',zones:[],
  lines:[{id:'L1',name:'Ancienne A',dn:100,bar:12,pts:[[0,0],[120,0],[120,80]],specials:[{id:'v1',type:'valve',m:40}],parent:null,inv:true,v0:1,vm:2},{id:'L2',name:'Ancienne B',dn:80,bar:12,pts:[[0,40],[100,40]],specials:[],parent:null,inv:true,v0:1,vm:1}]}};
await page.evaluate(s=>localStorage.setItem('trace:handoff:'+s.id,JSON.stringify(s)),OLD);
await page.goto(BASE+'/traceur.html?site='+OLD.id+'&aff=ETU-TB-OLD&cv=2');await wait(1600);
await page.evaluate(()=>{const M=window.MAQ;M.state.sel=null;M.rebuild();});await wait(100);await flush();
const oc=async id=>[...new Set((await colors(id,'A')).map(p=>p.stroke))].join();
out={L1:await oc('L1'),L2:await oc('L2'),sv:await page.evaluate(()=>window.MAQ.state.lines.map(l=>l.id+':'+(l.sv===undefined?'-':JSON.stringify(l.sv))+':'+(l.del===undefined?'-':'del')).join(' ')),ghosts:await page.evaluate(()=>document.querySelectorAll('#net .tb-ghost').length),legend:await page.evaluate(()=>document.getElementById('t1VerLeg').textContent),vm:await page.evaluate(()=>window.MAQ.state.lines.map(l=>l.v0+'/'+l.vm).join())};
// même chose que la base livrée : couleur de la ligne = couleur de sa version (lineCol)
out.lineCol=await page.evaluate(()=>[window.MAQ.t1.lineCol('L1','A'),window.MAQ.t1.lineCol('L2','A')].join());
// enregistrée telle quelle (v2), puis rouverte en v3 : retouche d'UN tronçon de l'ancienne ligne B et suppression de l'ancienne ligne A en v3
sv=await saveTrace('Ancienne étude');out.save=sv.site&&{sv:sv.site.lines.map(l=>l.id+':'+(l.sv?JSON.stringify(l.sv):'-')).join(' '),vref:sv.site.traceur.vref&&sv.site.traceur.vref.cv};
await page.goto(BASE+'/traceur.html?site='+OLD.id+'&aff=ETU-TB-OLD&cv=3');await wait(1600);
await page.evaluate(()=>window.MAQ.shortenLine('L2',90));await flush();
out.v3={L2:await lineOf('L2'),c1:await oc('L1')};out.v3={sv:J(out.v3.L2.sv),del:out.v3.L2.del&&out.v3.L2.del.map(d=>d.v+':'+(+len(d.pts).toFixed(1))).join(),c1:out.v3.c1,legend:await page.evaluate(()=>document.getElementById('t1VerLeg').textContent)};
await page.evaluate(()=>{const M=window.MAQ;M.state.lines=M.state.lines.filter(l=>l.id!=='L1');M.rebuild();});await flush();out.v3.g=await page.evaluate(()=>window.MAQ.t1.tb.ghosts().map(g=>g.id+':v'+g.v).join());
out.v3.rows=await page.evaluate(()=>{const s=window.MAQ.t1.tb.stats();return [...s.keys()].map(v=>{const o=s.get(v);return v+':'+o.cre+'/'+o.mod.n+'/'+o.del.lines+'/'+o.del.n;}).join(' ');});
// contexte chantier (?site=<id> sans affaire) : rien de tout cela (couleurs normales, rien de grisé, pas de 🕑), même avec l.sv / l.del / traceur.ghosts
await page.goto(BASE+'/traceur.html?site='+SITE_E);await wait(1600);await page.evaluate(()=>{const M=window.MAQ;M.state.sel=null;M.rebuild();});await wait(100);
out.chantier={etude:await page.evaluate(()=>window.MAQ.t1.etude()),cols:[...new Set((await colors('L1','A')).map(p=>p.stroke))].join(),ghost:await page.evaluate(()=>document.querySelectorAll('#net .tb-ghost').length),
  btn:await page.evaluate(()=>!document.getElementById('tbVers')||getComputedStyle(document.getElementById('tbVers')).display==='none'||!document.getElementById('t1Bar').contains(document.getElementById('tbVers'))),leg:await page.evaluate(()=>getComputedStyle(document.getElementById('tbLeg')).display),
  tap:await (async()=>{await page.evaluate(()=>{document.getElementById('hint').textContent='';});await page.evaluate(()=>window.MAQ.t1.ghostTap([150,200]));return hint();})()};
out.chantier.opts=await page.evaluate(()=>Object.keys(window.MAQ.t1.bridgeOpts()).sort().join());
await page.click('#bSave');await wait(250);await page.selectOption('#svMode','new');await page.fill('#svName','Chantier TB');await page.click('#svOk');await wait(1400);{const id=await page.evaluate(()=>window.MAQ.state.siteRef&&window.MAQ.state.siteRef.id);sv={id,site:id?await handoff(id):null};await page.click('#svStay').catch(()=>{});await wait(150);}
out.chantier.newId=sv.id!==SITE_E;out.chantier.save=sv.site&&{ctx:sv.site.traceur.ctx,ghosts:sv.site.traceur.ghosts===undefined,vref:sv.site.traceur.vref===undefined,marche:!!sv.site.marche};
console.log('9) ancienne étude, chantier :',J(out));
C.c9=out.L1===V2.A&&out.L2===V1.A&&out.sv==='L1:-:- L2:-:-'&&out.ghosts===0&&/Versions : v1 · v2 \(en cours\)/.test(out.legend)&&out.vm==='1/2,1/1'&&out.lineCol===V2.A+','
  &&!!out.save&&out.save.sv==='L1:- L2:-'&&out.save.vref===2
  &&out.v3.sv==='[3]'&&out.v3.del==='3:10'&&out.v3.c1===V2.A&&/v1 · v2 · v3 \(en cours\)/.test(out.v3.legend)&&out.v3.g==='L1:v3'&&out.v3.rows==='1:2/0/0/0 2:0/1/0/0 3:0/1/1/1'
  &&out.chantier.etude===false&&out.chantier.cols===V1.A&&out.chantier.ghost===0&&out.chantier.btn&&out.chantier.leg==='none'&&out.chantier.tap===''&&!!out.chantier.save&&out.chantier.save.ctx==='chantier'&&out.chantier.save.ghosts&&out.chantier.save.vref&&out.chantier.save.marche&&out.chantier.newId&&out.chantier.opts==='ctx,cv,zones';
// ════ c10 · TÉLÉPHONE (390 px)
const pctx=await browser.newContext({viewport:{width:390,height:844},isMobile:true,hasTouch:true,deviceScaleFactor:2});await pctx.route(u=>!/^(localhost|127\.0\.0\.1)$/.test(new URL(u).hostname),r=>r.fulfill({status:200,contentType:'application/json',body:'{}'}));
const ph=await pctx.newPage();watch(ph);ph.on('dialog',d=>d.accept().catch(()=>{}));
await ph.goto(BASE+'/traceur.html');await ph.waitForTimeout(500);
await ph.evaluate(s=>{localStorage.clear();localStorage.setItem('trace:handoff:'+s.id,JSON.stringify(s));},S5);
await ph.goto(BASE+'/traceur.html?site='+SITE_E+'&aff='+AFF+'&cv=2');await ph.waitForTimeout(1800);
await ph.evaluate(()=>{const M=window.MAQ;M.state.sel=null;M.rebuild();document.getElementById('zFit').click();});await ph.waitForTimeout(200);
out={ghosts:await ph.evaluate(()=>document.querySelectorAll('#net path.tb-ghost[data-kind]').length)};
const lay=()=>ph.evaluate(()=>{const els=[...document.querySelectorAll('#t1Bar button,#tbLeg button,#tbLeg label,#t1Float button,#t1Float label')].filter(e=>e.offsetParent);const small=els.filter(e=>e.getBoundingClientRect().height<34).map(e=>e.outerHTML.slice(0,60));
  const over=[...document.querySelectorAll('#t1Bar,#t1Float,.legend,#tbLeg')].filter(e=>e.offsetParent).map(e=>Math.round(e.getBoundingClientRect().right)).filter(r=>r>390);return {sw:document.documentElement.scrollWidth,small,over,n:els.length};});
out.l0=await lay();await shot(ph,'tel_1_fantomes_legende');
await ph.tap('#tbVers');await ph.waitForTimeout(250);out.card=await ph.evaluate(()=>{const c=document.querySelector('#t1Float .tb-card');if(!c)return null;const r=c.getBoundingClientRect();return {right:Math.round(r.right),left:Math.round(r.left),rows:c.querySelectorAll('.tb-v').length,rowH:Math.min(...[...c.querySelectorAll('.tb-v')].map(b=>b.getBoundingClientRect().height))};});
out.l1=await lay();await shot(ph,'tel_2_panneau_versions');
await ph.tap('#t1Float .tb-v[data-v="2"]');await ph.waitForTimeout(300);out.focus=await ph.evaluate(()=>window.MAQ.t1.tb.focused());out.slim=await ph.evaluate(()=>{const R=document.getElementById('svg').getBoundingClientRect(),c=document.querySelector('#t1Float .tb-card').getBoundingClientRect();return Math.round((c.top-R.top)/R.height*100);});out.l2=await lay();await shot(ph,'tel_3_v2_en_evidence');
await ph.tap('#t1Float [data-act="tb-all"]');await ph.waitForTimeout(200);out.all=await ph.evaluate(()=>window.MAQ.t1.tb.focused());
await pctx.close();
console.log('10) téléphone :',J(out));
C.c10=out.ghosts===2&&out.l0.sw<=390&&!out.l0.small.length&&!out.l0.over.length&&out.l0.n>=3&&!!out.card&&out.card.right<=390&&out.card.left>=0&&out.card.rows===2&&out.card.rowH>=40&&out.l1.sw<=390&&!out.l1.small.length&&!out.l1.over.length
  &&out.focus===2&&out.slim>=50&&out.l2.sw<=390&&!out.l2.small.length&&out.all===null;
// ════ fin
C.logs=logs.length===0;
const bad=Object.entries(C).filter(([k,v])=>!v).map(([k])=>k);console.log(bad.length?'RESULTAT: ECHEC '+bad.join(','):'RESULTAT: TOUT VERT');console.log(logs.length?logs:'[]');
await browser.close();
