// LOT T1 — RETOURS D'ETHAN DU 14/10 AU SOIR (traceur : lignes). Données 100 % FICTIVES, hors connexion.
//  c1 · extrémités (contrat C1) : listes groupées aux deux bouts (raccordements en tête au départ, fins de ligne à la fin), l'ancien « bypass » affiché « By-pass nu en regard »,
//       pièce posée par famille (endcap / bypassEnd / endpoint, sub = type ; by-pass au départ), repère au bout de chaque ligne (cliquable → fiche du bout), tableau type × DN,
//       sortie du pont : startType / endType normalisés + ends {start, end} avec le DN au bout APRÈS réduction ;
//  c2 · renommage : nom posé le long de l'antenne (et plus sur la parente), appliqué à Entrée sans le bouton, relu dans le chantier enregistré et dans l'appli ;
//  c3 · annuler / rétablir : 3 lignes tracées → 3 × Ctrl+Z (une ligne à la fois) → 3 × Ctrl+Y ; ↷ ; une nouvelle action vide « rétablir » ; un glisser = une étape ; 60 étapes ;
//  c4 · étude (?site=new&aff=…&cv=1 puis ?site=<id>&aff=…&cv=2) : « Tranche » à la place de « Marché / modifications », option n (pointillé + « Opt n »), sélection multiple,
//       v0 / vm (cv=2 → vm=2 sur la ligne modifiée seulement, rien sur une sélection), couleur et légende des versions, couches marché / écarts / TS désactivées,
//       pont : ctx 'etude', cv, tranche / option / v0 / vm, ni marché ni TS même si la version précédente en avait ;
//  c5 · lasso → 2 zones de chiffrage (Maj = ajouter / retirer, ▭ au doigt, glisser au doigt = déplacer la vue) → renommer, annuler / rétablir → site.traceur.zones ;
//  c6 · dilatation (tableau FICTIF injecté dans localStorage['trace:regles']) : règle 1 « lyre » (DN absent → DN inférieur, profondeur interpolée / supposée, 110 °C),
//       règle 2 « té », liste cliquable, tronçon surligné, alerte désactivable, tableau absent → règle 1 désactivée avec le message, règle 2 toujours là ; import du pack (partie « regles ») ;
//  c7 · contexte chantier inchangé (Marché / modifications, couches marché / TS actives, pas de versions) ; un ancien tracé (sousstation / bypass) se dessine pareil ;
//  c8 · téléphone (390 px) : rien ne déborde, boutons ≥ 34 px, fiche flottante (renommer, extrémités, zone) ;
//  c9 · console vide.
import { chromium } from 'playwright';
const BASE=process.env.BASE||'http://localhost:8765';
const browser=await chromium.launch({headless:true, executablePath: process.env.CHROMIUM_PATH||undefined});
const ctx=await browser.newContext({viewport:{width:1280,height:900}});const page=await ctx.newPage();
const logs=[];const watch=p=>{p.on('pageerror',e=>logs.push('PAGEERROR: '+e.message.slice(0,300)));p.on('console',m=>{if(m.type()==='error'&&!/supabase|Failed to fetch|net::ERR|404|WebSocket|pdf\.worker|cdnjs/i.test(m.text()))logs.push(m.text().slice(0,200));});};watch(page);
await ctx.route(u=>!/^(localhost|127\.0\.0\.1)$/.test(new URL(u).hostname),r=>r.fulfill({status:200,contentType:'application/json',body:'{}'})); // aucun réseau extérieur
let dialogs=[];page.on('dialog',d=>{dialogs.push(d.type()+':'+d.message().slice(0,100));d.accept().catch(()=>{});});
const C={};const wait=ms=>page.waitForTimeout(ms);const near=(a,b,t=0.05)=>Math.abs(a-b)<=t;
const toScreen=async(wx,wy)=>page.evaluate(([x,y])=>{const v=window.MAQ.state.view;const r=document.getElementById('svg').getBoundingClientRect();return [r.left+x*v.k+v.tx,r.top+y*v.k+v.ty];},[wx,wy]);
const clickW=async(x,y)=>{const s=await toScreen(x,y);await page.mouse.click(s[0],s[1]);await wait(120);};
const hint=()=>page.evaluate(()=>document.getElementById('hint').textContent);
const handoff=id=>page.evaluate(id=>new Promise(res=>{const q=indexedDB.open('trace-kv');q.onsuccess=()=>{try{const g=q.result.transaction('kv','readonly').objectStore('kv').get('trace:handoff:'+id);g.onsuccess=()=>res(g.result||null);g.onerror=()=>res(null);}catch(e){res(null);}};q.onerror=()=>res(null);}),id);
const saveTrace=async(name)=>{await page.click('#bSave');await wait(250);await page.fill('#svName',name);await page.click('#svOk');await wait(1400);const id=await page.evaluate(()=>window.MAQ.state.siteRef&&window.MAQ.state.siteRef.id);const s=id?await handoff(id):null;return {id,site:s};};
const fresh=async(q)=>{await page.goto(BASE+'/traceur.html'+(q||''));await wait(700);};
const setLines=lines=>page.evaluate(lines=>{const M=window.MAQ;M.state.supplier='AXIOM';M.state.lines=lines;M.state.seq=Math.max(1,...lines.map(l=>+l.id.replace(/\D/g,'')))+1;M.setMode('select');M.state.sel=null;M.rebuild();document.getElementById('zFit').click();},lines);
const sel=(id,tab)=>page.evaluate(([id,tab])=>{const M=window.MAQ;M.state.sel={kind:'line',id};M.state.tab=tab||'sel';M.rebuild();},[id,tab]);
// ── mise en place : appareil vierge
await page.goto(BASE+'/traceur.html');await wait(500);await page.evaluate(()=>{localStorage.clear();localStorage.setItem('trace:wide','1');});await page.evaluate(()=>new Promise(r=>{try{const q=indexedDB.deleteDatabase('trace-kv');q.onsuccess=q.onerror=q.onblocked=()=>r();}catch(e){r();}}));
await fresh();
// ════ c1 · EXTRÉMITÉS
await setLines([
  {id:'L1',name:'Rue des Essais',dn:100,bar:12,pts:[[0,0],[80,0]],specials:[{id:'r1',type:'reducer',m:40,dn2:80}],parent:null,inv:true,startType:'pec',endType:'kit'},
  {id:'L2',name:'Antenne B',dn:65,bar:12,pts:[[20,0],[20,30]],specials:[],parent:{line:'L1',m:20,side:1},inv:true,endType:'bypass_extrusion'},
  {id:'L3',name:'Ligne C',dn:80,bar:12,pts:[[0,60],[50,60]],specials:[],parent:null,inv:true,startType:'chaufferie',endType:'bypass'},
  {id:'L4',name:'Ligne D',dn:50,bar:12,pts:[[0,90],[30,90]],specials:[{id:'v1',type:'tee',vert:'down',pvKind:'vidange',atEnd:true,m:30}],parent:null,inv:true,startType:'sousstation',endType:'fondbombe_regard'},
  {id:'L5',name:'Ligne E',dn:50,bar:12,pts:[[40,90],[70,90]],specials:[],parent:null,inv:true,startType:'bypass_regard',endType:'provisoire'},
  {id:'L6',name:'Ligne F',dn:50,bar:12,pts:[[0,120],[30,120]],specials:[],parent:null,inv:true,startType:'attente_chaufferie',endType:'libre'}]);
await sel('L1');
let out=await page.evaluate(()=>{const g=id=>[...document.querySelectorAll('#'+id+' optgroup')].map(x=>x.label);const v=id=>[...document.querySelectorAll('#'+id+' option')].map(o=>o.value);return {start:g('lineStart'),end:g('lineEnd'),sv:v('lineStart').join(),ev:v('lineEnd').join(),cur:[document.getElementById('lineStart').value,document.getElementById('lineEnd').value]};});
await sel('L3');out.L3end=await page.evaluate(()=>{const s=document.getElementById('lineEnd');return s.value+'|'+s.selectedOptions[0].textContent;});
out.pieces=await page.evaluate(()=>{const B=window.MAQ.state.built;const e=(id,at)=>{const p=B[id].A.pieces.find(x=>x.sid==='end:'+at);return p?p.kind+':'+p.sub:'—';};const bp=id=>B[id].A.welds.filter(w=>w.bypass).map(w=>w.bypassAt||'end').join();
  const L4=B.L4.A;const cap=L4.pieces.find(p=>p.kind==='endcap');const vid=L4.pieces.find(p=>p.kind==='tee'&&p.vert);return {L1:e('L1','start')+'/'+e('L1','end'),L2:e('L2','start')+'/'+e('L2','end'),L3:e('L3','start')+'/'+e('L3','end'),L4:e('L4','start')+'/'+e('L4','end'),L5:e('L5','start')+'/'+e('L5','end'),L6:e('L6','start')+'/'+e('L6','end'),bp2:bp('L2'),bp3:bp('L3'),bp5:bp('L5'),capL4:cap&&+cap.L.toFixed(2),vidEnd:vid&&cap?+(cap.m0-vid.m1).toFixed(3):null,dnEnd:B.L1.A.pieces.find(p=>p.sid==='end:end').dn};});
out.marks=await page.evaluate(()=>[...document.querySelectorAll('#net .t1-endmark')].map(g=>g.dataset.line+':'+g.dataset.end+':'+g.querySelector('text').textContent).sort());
console.log('1a) listes, pièces, repères :',JSON.stringify(out));
C.c1a=out.start.join('|')==='Raccordement sur existant|Fin de ligne|Chaufferie|Sous-station|Rien'&&out.end.join('|')==='Fin de ligne|Raccordement sur existant|Chaufferie|Sous-station|Rien'
  &&out.sv==='pec,insertion,attente,kit,bypass_extrusion,bypass_regard,fondbombe_regard,provisoire,chaufferie,attente_chaufferie,sousstation,libre'&&out.ev.split(',').length===12&&out.cur.join()==='pec,kit'&&out.L3end==='bypass_regard|By-pass nu en regard'
  &&out.pieces.L1==='endpoint:pec/endcap:kit'&&out.pieces.L2==='—/bypassEnd:bypass_extrusion'&&out.pieces.L3==='endpoint:chaufferie/bypassEnd:bypass'&&out.pieces.L4==='endpoint:sousstation/endcap:fondbombe_regard'&&out.pieces.L5==='bypassEnd:bypass_regard/endcap:provisoire'&&out.pieces.L6==='endpoint:attente_chaufferie/—'
  &&out.pieces.bp2==='end'&&out.pieces.bp3==='end'&&out.pieces.bp5==='start'&&out.pieces.capL4>0&&near(out.pieces.vidEnd,0,0.01)&&out.pieces.dnEnd===80
  &&out.marks.join()==='L1:end:Kit,L1:start:PEC,L2:end:BP extr.,L3:end:BP regard,L3:start:Chauff.,L4:end:FB regard,L4:start:SST,L5:end:Prov.,L5:start:BP regard,L6:start:Att. chauff.';
// 1b) repère cliquable → fiche du bout (liste groupée) → « Insertion de tés » ; couche « Extrémités » dans 👁 ; tableau type × DN (onglet Lignes)
{const b=await page.evaluate(()=>{const g=document.querySelector('#net .t1-endmark[data-line="L1"][data-end="end"] rect:nth-of-type(2)');const r=g.getBoundingClientRect();return [r.left+r.width/2,r.top+r.height/2];});await page.mouse.click(b[0],b[1]);await wait(200);}
out={sel:await page.evaluate(()=>window.MAQ.state.sel),groups:await page.evaluate(()=>[...document.querySelectorAll('#pcEnd optgroup')].map(x=>x.label).join('|'))};
await page.selectOption('#pcEnd','insertion');await wait(200);
out.after=await page.evaluate(()=>{const M=window.MAQ;const l=M.state.lines.find(x=>x.id==='L1');const p=M.state.built.L1.A.pieces.find(x=>x.sid==='end:end');return {end:l.endType,piece:p&&p.kind+':'+p.sub+':'+p.L,mark:(document.querySelector('#net .t1-endmark[data-line="L1"][data-end="end"] text')||{}).textContent};});
await page.click('#zEye');await wait(150);out.layer=await page.evaluate(()=>{const i=document.querySelector('#disp input[data-k="ext"]');return i?{on:i.checked,dis:i.disabled,lbl:i.parentElement.textContent.trim().slice(0,20)}:null;});
await page.evaluate(()=>{const i=document.querySelector('#disp input[data-k="ext"]');i.checked=false;i.dispatchEvent(new Event('change',{bubbles:true}));});await wait(120);out.hidden=await page.evaluate(()=>document.querySelectorAll('#net .t1-endmark').length);
await page.evaluate(()=>{const i=document.querySelector('#disp input[data-k="ext"]');i.checked=true;i.dispatchEvent(new Event('change',{bubbles:true}));});await page.click('#zEye');await wait(120);
await page.evaluate(()=>{const M=window.MAQ;M.state.tab='lignes';M.state.sel=null;M.rebuild();});await wait(100);
out.table=await page.evaluate(()=>{const t=document.querySelector('#panel table.t1-ends');return t?[...t.querySelectorAll('tr')].slice(1).map(tr=>[...tr.children].map(td=>td.textContent.trim()).join('|')):null;});
console.log('1b) repère → fiche du bout, couche, tableau :',JSON.stringify(out));
C.c1b=out.sel&&out.sel.kind==='piece'&&out.sel.line==='L1'&&out.groups==='Fin de ligne|Raccordement sur existant|Chaufferie|Sous-station|Rien'&&out.after.end==='insertion'&&out.after.piece==='endpoint:insertion:0'&&out.after.mark==='Té ins.'
  &&out.layer&&out.layer.on&&!out.layer.dis&&out.hidden===0&&out.table&&out.table.includes('PEC PEC (piquage en charge)|100|1')&&out.table.includes('Té ins. Insertion de tés|80|1')&&out.table.includes('SST Sous-station|50|1')&&out.table.includes('BP regard By-pass nu en regard|50|1')&&out.table.includes('BP regard By-pass nu en regard|80|1')&&out.table.length===10;
// 1c) le pont : types normalisés, ends (DN au bout après réduction), antenne sans départ ; chantier = ctx 'chantier', marché figé, pas de tranche / version sur les lignes
let sv=await saveTrace('Essai extrémités');const SITE1=sv.id;
out=(()=>{const s=sv.site;if(!s)return null;const g=id=>s.lines.find(l=>l.id===id);return {st:s.lines.map(l=>l.id+':'+l.startType+'>'+l.endType).join(' '),ends1:g('L1').ends,ends2:g('L2').ends,ends3:g('L3').ends,ends6:g('L6').ends,ctx:s.traceur.ctx,cv:s.traceur.cv,marche:!!s.marche,tr:s.lines.some(l=>l.tranche!==undefined||l.v0!==undefined),bpLink:g('L5').cond.A.els[0].link&&g('L5').cond.A.welds[0].bypass&&g('L5').cond.A.welds[0].idx===0,subs:g('L4').cond.A.els.filter(e=>e.sub).map(e=>e.kind+':'+e.sub).join()};})();
console.log('1c) sortie du pont :',JSON.stringify(out));
C.c1c=!!out&&out.st==='L1:pec>insertion L2:null>bypass_extrusion L3:chaufferie>bypass_regard L4:sousstation>fondbombe_regard L5:bypass_regard>provisoire L6:attente_chaufferie>libre'
  &&JSON.stringify(out.ends1)==='{"start":{"type":"pec","dn":100},"end":{"type":"insertion","dn":80}}'&&JSON.stringify(out.ends2)==='{"start":null,"end":{"type":"bypass_extrusion","dn":65}}'&&out.ends3.end.type==='bypass_regard'&&JSON.stringify(out.ends6.end)==='{"type":"libre","dn":50}'
  &&out.ctx==='chantier'&&out.cv===1&&out.marche&&!out.tr&&out.bpLink&&out.subs==='endpoint:sousstation,endcap:fondbombe_regard';
await page.click('#svStay');await wait(150);
// ════ c2 · RENOMMAGE d'une antenne : Entrée suffit (sans « Renommer »), nom le long de l'antenne (plus sur la parente), listes, chantier, appli
await sel('L2');
out={before:await page.evaluate(()=>{const t=document.querySelector('#net .t1-lname[data-line="L2"]');return t?t.getAttribute('transform'):null;})};
await page.fill('#lineName','Antenne Rue des Tilleuls');await page.press('#lineName','Enter');await wait(250);
out.name=await page.evaluate(()=>window.MAQ.state.lines.find(l=>l.id==='L2').name);
out.label=await page.evaluate(()=>{const t=document.querySelector('#net .t1-lname[data-line="L2"]');const m=/translate\(([-\d.e]+) ([-\d.e]+)\) rotate\(([-\d.e]+)\)/.exec(t.getAttribute('transform'));return {txt:t.textContent,x:+m[1],y:+m[2],rot:+m[3]};});
out.parentLbl=await page.evaluate(()=>[...document.querySelectorAll('#net .t1-lname')].filter(t=>/Tilleuls/.test(t.textContent)).length);
await page.evaluate(()=>{const M=window.MAQ;M.state.tab='lignes';M.rebuild();});await wait(80);out.list=await page.evaluate(()=>/Antenne Rue des Tilleuls/.test(document.getElementById('panel').textContent));
await sel('L2');out.fiche=await page.evaluate(()=>document.getElementById('lineName').value);
await page.fill('#lineName','Antenne des Tilleuls');await page.click('#mSelect');await wait(200);out.blur=await page.evaluate(()=>window.MAQ.state.lines.find(l=>l.id==='L2').name); // en quittant le champ, sans bouton
sv=await saveTrace('Essai extrémités');out.site=sv.site&&sv.site.lines.find(l=>l.id==='L2').name;out.same=sv.id===SITE1;
await page.click('#svGo');await wait(1500);try{await page.waitForFunction(id=>window.TRACE&&window.TRACE.state.siteId===id&&window.TRACE.state.screen==='site'&&window.TRACE.lines&&window.TRACE.lines.L2,{timeout:20000},SITE1);}catch(e){}
out.app=await page.evaluate(()=>window.TRACE&&window.TRACE.lines&&window.TRACE.lines.L2?window.TRACE.lines.L2.name:null);
console.log('2) renommage :',JSON.stringify(out));
C.c2=out.name==='Antenne Rue des Tilleuls'&&/^Antenne Rue des Tilleuls · DN65$/.test(out.label.txt)&&near(out.label.x,20,0.01)&&out.label.y>5&&Math.abs(out.label.rot)===90&&out.parentLbl===1&&out.list&&out.fiche==='Antenne Rue des Tilleuls'&&out.blur==='Antenne des Tilleuls'&&out.site==='Antenne des Tilleuls'&&out.same&&out.app==='Antenne des Tilleuls';
// ════ c3 · ANNULER / RÉTABLIR étape par étape
await page.evaluate(()=>{localStorage.removeItem('trace:maquette:ctx');});await fresh('?site=new');await wait(200);
out={lines0:await page.evaluate(()=>window.MAQ.state.lines.length),mode:await page.evaluate(()=>window.MAQ.state.mode)};
await page.evaluate(()=>{const M=window.MAQ;M.state.view={k:8,tx:100,ty:100};window.dispatchEvent(new Event('resize'));M.setMode('trace');});await wait(100);
for(const y of [0,15,30]){await clickW(0,y);await clickW(30,y);await page.keyboard.press('Enter');await wait(250);}
out.lines3=await page.evaluate(()=>window.MAQ.state.lines.map(l=>l.id+'='+l.name).join());out.steps=await page.evaluate(()=>window.MAQ.t1.hist.undoCount);
const IDS=await page.evaluate(()=>window.MAQ.state.lines.map(l=>l.id));const N=await page.evaluate(()=>window.MAQ.state.lines.map(l=>l.name));
await page.evaluate(()=>window.MAQ.setMode('select'));await page.mouse.click(5,600);
const seq=[];for(let i=0;i<3;i++){await page.keyboard.press('Control+z');await wait(150);seq.push({n:await page.evaluate(()=>window.MAQ.state.lines.length),h:await hint()});}
out.undo=seq.map(x=>x.n).join();out.undoHint=seq.map(x=>x.h);out.more=(await (async()=>{await page.keyboard.press('Control+z');await wait(120);return hint();})());
const seq2=[];for(let i=0;i<3;i++){await page.keyboard.press(i===1?'Control+Shift+Z':'Control+y');await wait(150);seq2.push({n:await page.evaluate(()=>window.MAQ.state.lines.length),h:await hint()});}
out.redo=seq2.map(x=>x.n).join();out.redoHint=seq2.map(x=>x.h);out.ids=await page.evaluate(()=>window.MAQ.state.lines.map(l=>l.id).join());
// boutons ↶ ↷, une nouvelle action vide « rétablir », un glisser de sommet = une étape
await page.click('#bUndo');await wait(120);out.btnUndo=await page.evaluate(()=>window.MAQ.state.lines.length);await page.click('#bRedo');await wait(120);out.btnRedo=await page.evaluate(()=>window.MAQ.state.lines.length);
await page.click('#bUndo');await wait(120);out.redoAvail=await page.evaluate(()=>window.MAQ.t1.hist.redoCount);
await page.evaluate(id=>{window.MAQ.setLineDn(id,80);},IDS[0]);await wait(100);out.redoAfter=await page.evaluate(()=>window.MAQ.t1.hist.redoCount);
await page.evaluate(id=>{const M=window.MAQ;M.state.sel={kind:'line',id};M.state.selV=[];M.state.tab='sel';M.rebuild();},IDS[0]);await wait(100);const h0=await page.evaluate(()=>window.MAQ.t1.hist.undoCount);
{const s=await toScreen(30,0);await page.mouse.move(s[0],s[1]);await page.mouse.down();for(let i=1;i<=6;i++){await page.mouse.move(s[0],s[1]+i*8);await wait(20);}await page.mouse.up();await wait(250);}
out.drag={steps:await page.evaluate(()=>window.MAQ.t1.hist.undoCount)-h0,pt:await page.evaluate(id=>window.MAQ.state.lines.find(l=>l.id===id).pts[1],IDS[0])};
await page.keyboard.press('Control+z');await wait(150);out.dragUndo={pt:await page.evaluate(id=>window.MAQ.state.lines.find(l=>l.id===id).pts[1],IDS[0]),h:await hint()};
await page.evaluate(()=>{const M=window.MAQ;for(let i=0;i<70;i++){M.state.lines[0].prof=+(0.8+i*0.01).toFixed(2);M.rebuild();M.t1.hist.flush();}});out.cap=await page.evaluate(()=>window.MAQ.t1.hist.undoCount);
console.log('3) annuler / rétablir :',JSON.stringify(out));
C.c3=out.lines0===0&&IDS.length===3&&out.steps===3&&out.undo==='2,1,0'&&out.undoHint[0]===`Annulé : création de « ${N[2]} »`&&out.undoHint[2]===`Annulé : création de « ${N[0]} »`&&/Rien à annuler/.test(out.more)
  &&out.redo==='1,2,3'&&out.redoHint[0]===`Rétabli : création de « ${N[0]} »`&&out.redoHint[2]===`Rétabli : création de « ${N[2]} »`&&out.ids===IDS.join()&&out.btnUndo===2&&out.btnRedo===3&&out.redoAvail===1&&out.redoAfter===0
  &&out.drag.steps===1&&out.drag.pt[1]>3&&near(out.dragUndo.pt[1],0,0.01)&&out.dragUndo.h===`Annulé : sommet déplacé sur « ${N[0]} »`&&out.cap===60;
// ════ c4 · ÉTUDE (contexte aff:) — tranche / option, versions, ni marché ni TS
const AFF='ETU-T1-01';
await page.goto(BASE+'/traceur.html?site=new&aff='+AFF+'&cv=1');await wait(900);
out={etude:await page.evaluate(()=>window.MAQ.t1.etude()),cv:await page.evaluate(()=>window.MAQ.t1.cv()),lines0:await page.evaluate(()=>window.MAQ.state.lines.length)};
await setLines([
  {id:'L1',name:'Rue Ferme',dn:100,bar:12,pts:[[0,0],[80,0]],specials:[],parent:null,inv:true},
  {id:'L2',name:'Rue Option',dn:80,bar:12,pts:[[0,60],[60,60]],specials:[],parent:null,inv:true},
  {id:'L3',name:'Antenne Est',dn:65,bar:12,pts:[[20,0],[20,30]],specials:[],parent:{line:'L1',m:20,side:1},inv:true}]);
await page.evaluate(()=>window.MAQ.t1.hist.flush());out.v=await page.evaluate(()=>window.MAQ.state.lines.map(l=>l.id+':'+l.v0+'/'+l.vm).join());
await sel('L2');
out.fiche=await page.evaluate(()=>{const hs=[...document.querySelectorAll('#panel h3')].map(h=>h.textContent);return {marche:hs.includes('Marché / modifications'),tranche:hs.includes('Tranche'),hm:!!document.getElementById('lineHmEtat')};});
await page.selectOption('#panel [data-t1="tr"]','option');await wait(200);out.opt1=await page.evaluate(()=>{const l=window.MAQ.state.lines.find(x=>x.id==='L2');return l.tranche+':'+l.option;});
await page.fill('#panel [data-t1="trn"]','2');await page.press('#panel [data-t1="trn"]','Enter');await wait(200);out.opt2=await page.evaluate(()=>{const l=window.MAQ.state.lines.find(x=>x.id==='L2');return l.tranche+':'+l.option;});
// sélection multiple au plan (clic, puis Maj+clic sur l'antenne) : la tranche s'applique aux deux
await page.evaluate(()=>{const M=window.MAQ;M.state.sel=null;M.state.tab='sel';M.rebuild();});await clickW(66,0);await page.keyboard.down('Shift');await clickW(20,19);await page.keyboard.up('Shift');await wait(150);
out.multi=await page.evaluate(()=>window.MAQ.state.sel);out.multiPanel=await page.evaluate(()=>{const p=document.getElementById('panel');return /2 lignes sélectionnées/.test(p.textContent)&&!!p.querySelector('[data-t1="tr"]')&&!!p.querySelector('[data-act="t1-zoneNew"]');});
await page.selectOption('#panel [data-t1="tr"]','option');await wait(150);await page.fill('#panel [data-t1="trn"]','3');await page.press('#panel [data-t1="trn"]','Enter');await wait(150);
out.multiOpt=await page.evaluate(()=>window.MAQ.state.lines.filter(l=>l.id!=='L2').map(l=>l.id+':'+l.tranche+':'+l.option).join());
await page.selectOption('#panel [data-t1="tr"]','ferme');await wait(150);out.multiFerme=await page.evaluate(()=>window.MAQ.state.lines.filter(l=>l.id!=='L2').map(l=>l.id+':'+l.tranche+':'+(l.option||'')).join());
await page.click('#zEye');await wait(150);out.disp=await page.evaluate(()=>Object.fromEntries(['marche','ecart','ts','versions','ext'].map(k=>{const i=document.querySelector(`#disp input[data-k="${k}"]`);return [k,i?(i.checked?'on':'off')+(i.disabled?'-dis':''):'none'];})));await page.click('#zEye');
out.dash=await page.evaluate(()=>{const ps=[...document.querySelectorAll('#net path.piece[data-line="L2"]')];const p1=[...document.querySelectorAll('#net path.piece[data-line="L1"]')];return {n:ps.length,dashed:ps.filter(p=>p.getAttribute('stroke-dasharray')).length,l1:p1.filter(p=>p.getAttribute('stroke-dasharray')).length,opt:[...document.querySelectorAll('#net text.t1-opt')].map(t=>t.textContent)};});
out.foot=await page.evaluate(()=>document.getElementById('foot').textContent);out.layers=await page.evaluate(()=>document.getElementById('net').innerHTML.includes('marché · '));
console.log('4a) étude v1 :',JSON.stringify(out));
C.c4a=out.etude&&out.cv===1&&out.lines0===0&&out.v==='L1:1/1,L2:1/1,L3:1/1'&&!out.fiche.marche&&out.fiche.tranche&&!out.fiche.hm&&out.opt1==='option:1'&&out.opt2==='option:2'&&out.multi&&out.multi.kind==='lines'&&out.multi.ids.join()==='L1,L3'&&out.multiPanel
  &&out.multiOpt==='L1:option:3,L3:option:3'&&out.multiFerme==='L1:ferme:,L3:ferme:'&&out.disp.marche==='off-dis'&&out.disp.ecart==='off-dis'&&out.disp.ts==='off-dis'&&out.disp.versions==='on'&&out.disp.ext==='on'
  &&out.dash.n>0&&out.dash.dashed===out.dash.n&&out.dash.l1===0&&out.dash.opt.join()==='Opt 2'&&/chiffrage v1 en cours/.test(out.foot)&&!/marché →/.test(out.foot)&&!out.layers;
await page.click('#bSave');await wait(250);out={note:await page.evaluate(()=>document.getElementById('modalBody').textContent)};await page.fill('#svName','Étude T1');await page.click('#svOk');await wait(1400);
const SITE_E=await page.evaluate(()=>window.MAQ.state.siteRef&&window.MAQ.state.siteRef.id);let se=await handoff(SITE_E);
out.save=se&&{ctx:se.traceur.ctx,cv:se.traceur.cv,marche:se.marche===undefined,ts:se.ts===undefined,aff:se.fiche&&se.fiche.etude&&se.fiche.etude.aff,lines:se.lines.map(l=>l.id+':'+l.tranche+(l.option?'/'+l.option:'')+':v'+l.v0+'/'+l.vm).join()};
await page.click('#svStay');await wait(150);
console.log('4b) étude enregistrée :',JSON.stringify(out));
C.c4b=/pas de tracé marché ni de TS/.test(out.note)&&!/devient le tracé marché/.test(out.note)&&!!out.save&&out.save.ctx==='etude'&&out.save.cv===1&&out.save.marche&&out.save.ts&&out.save.aff===AFF&&out.save.lines==='L1:ferme:v1/1,L2:option/2:v1/1,L3:ferme:v1/1';
// rouverte en v2 (?site=<id>&aff=<n°>&cv=2) : une sélection, un zoom ne tamponnent pas ; la ligne MODIFIÉE passe en v2 (couleur, légende, pied) ; annuler / rétablir
await page.goto(BASE+'/traceur.html?site='+SITE_E+'&aff='+AFF+'&cv=2');await wait(1600);
out={etude:await page.evaluate(()=>window.MAQ.t1.etude()),cv:await page.evaluate(()=>window.MAQ.t1.cv()),n:await page.evaluate(()=>window.MAQ.state.lines.length),ref:await page.evaluate(()=>window.MAQ.state.siteRef&&window.MAQ.state.siteRef.id)};
await sel('L1');await page.click('#zIn');await wait(150);await page.evaluate(()=>window.MAQ.t1.hist.flush());out.noStamp=await page.evaluate(()=>window.MAQ.state.lines.map(l=>l.id+':'+l.vm).join());
const dn2=await page.evaluate(()=>[...document.querySelectorAll('#lineDn option')].map(o=>+o.value).find(v=>v>100));await page.selectOption('#lineDn',String(dn2));await wait(250);await page.evaluate(()=>window.MAQ.t1.hist.flush());
out.v=await page.evaluate(()=>window.MAQ.state.lines.map(l=>l.id+':'+(l.v0||'-')+'/'+l.vm).join());
out.legend=await page.evaluate(()=>document.getElementById('t1VerLeg').textContent);
out.col=await page.evaluate(()=>({L1:(document.querySelector('#net path.piece[data-line="L1"][data-cond="A"]')||{getAttribute:()=>''}).getAttribute('stroke'),L2:(document.querySelector('#net path.piece[data-line="L2"][data-cond="A"]')||{getAttribute:()=>''}).getAttribute('stroke')}));
out.foot=await page.evaluate(()=>document.getElementById('foot').textContent);out.fiche=await page.evaluate(()=>/modifiée en v2 \(en cours\)/.test(document.getElementById('panel').textContent));
await page.mouse.click(5,650);await page.keyboard.press('Control+z');await wait(150);out.undo=await page.evaluate(()=>{const l=window.MAQ.state.lines.find(x=>x.id==='L1');return l.dn+':'+l.vm;});out.undoHint=await hint();
await page.keyboard.press('Control+y');await wait(150);out.redo=await page.evaluate(()=>{const l=window.MAQ.state.lines.find(x=>x.id==='L1');return l.dn+':'+l.vm;});
// marché / TS hérités d'une version précédente : jamais recopiés pour une étude (C5)
await page.evaluate(()=>{const r=window.MAQ.state.siteRef;r.marche={at:Date.now(),source:'traceur',tot:{ml:1,soud:2},lines:[]};r.ts={items:[{id:'ts1',etat:'propose',kind:'line',line:'L1'}]};});
await page.click('#bSave');await wait(250);out.mode=await page.evaluate(()=>(document.getElementById('svMode')||{}).value);await page.click('#svOk');await wait(1400);se=await handoff(SITE_E);
out.save=se&&{ctx:se.traceur.ctx,cv:se.traceur.cv,marche:se.marche===undefined,ts:se.ts===undefined,L1:(l=>l.v0+'/'+l.vm+':'+l.dn)(se.lines.find(l=>l.id==='L1')),L2:(l=>l.tranche+'/'+l.option+':'+l.v0+'/'+l.vm)(se.lines.find(l=>l.id==='L2'))};
await page.click('#svStay');await wait(150);
console.log('4c) étude en v2 :',JSON.stringify(out));
C.c4c=out.etude&&out.cv===2&&out.n===3&&out.ref===SITE_E&&out.noStamp==='L1:1,L2:1,L3:1'&&out.v==='L1:1/2,L2:1/1,L3:1/1'&&/Versions : v1 · v2 \(en cours\)/.test(out.legend)&&out.col.L1==='#e8710a'&&out.col.L2==='#c8382f'
  &&/chiffrage v2 en cours · 1 ligne créée ou modifiée en v2/.test(out.foot)&&out.fiche&&out.undo==='100:1'&&/^Annulé : DN de « Rue Ferme »/.test(out.undoHint)&&out.redo===dn2+':2'&&out.mode==='update'
  &&!!out.save&&out.save.ctx==='etude'&&out.save.cv===2&&out.save.marche&&out.save.ts&&out.save.L1==='1/2:'+dn2&&out.save.L2==='option/2:1/1';
// ════ c5 · LASSO → ZONES DE CHIFFRAGE
await page.evaluate(()=>{const M=window.MAQ;M.state.sel=null;M.setMode('select');M.state.view={k:6,tx:200,ty:200};window.dispatchEvent(new Event('resize'));M.rebuild();});await wait(150);
const drag=async(a,b,shift)=>{const s=await toScreen(a[0],a[1]),e=await toScreen(b[0],b[1]);if(shift)await page.keyboard.down('Shift');await page.mouse.move(s[0],s[1]);await page.mouse.down();for(let i=1;i<=6;i++){await page.mouse.move(s[0]+(e[0]-s[0])*i/6,s[1]+(e[1]-s[1])*i/6);await wait(15);}
  out.rect=out.rect||await page.evaluate(()=>!!document.querySelector('#t1LassoG rect[stroke-dasharray]'));await page.mouse.up();if(shift)await page.keyboard.up('Shift');await wait(200);};
out={};const view0=await page.evaluate(()=>JSON.stringify(window.MAQ.state.view));
await drag([-15,-15],[90,40]);out.sel1=await page.evaluate(()=>window.MAQ.state.sel);out.viewSame=await page.evaluate(v=>JSON.stringify(window.MAQ.state.view)===v,view0);out.rectGone=await page.evaluate(()=>!document.querySelector('#t1LassoG rect'));
await page.click('#panel [data-act="t1-zoneNew"]');await wait(200);
await drag([-15,50],[70,70]);await page.click('#panel [data-act="t1-zoneNew"]');await wait(200);
out.zones=await page.evaluate(()=>JSON.stringify(window.MAQ.state.zones));
await drag([50,-5],[90,5],true);out.shift=await page.evaluate(()=>window.MAQ.state.sel&&window.MAQ.state.sel.ids.join());
await page.keyboard.press('Escape');await wait(100);out.esc=await page.evaluate(()=>window.MAQ.state.sel);
// glisser une LIGNE (pas le vide) déplace toujours la vue
{const s=await toScreen(40,60);await page.mouse.move(s[0],s[1]);await page.mouse.down();await page.mouse.move(s[0]+40,s[1]+30,{steps:5});await page.mouse.up();await wait(150);}out.pan=await page.evaluate(v=>JSON.stringify(window.MAQ.state.view)!==v,view0);out.panSel=await page.evaluate(()=>window.MAQ.state.sel&&window.MAQ.state.sel.kind);
// panneau ▦ Zones : nom, nombre de lignes, ml ; renommer → annuler / rétablir ; clic → sélection + cadrage
await page.click('#t1Zones');await wait(150);out.panel=await page.evaluate(()=>[...document.querySelectorAll('#t1Float .t1-zone')].map(r=>r.querySelector('input').value+'|'+r.querySelector('small').textContent));
await page.fill('#t1Float [data-t1="zname"][data-z="z2"]','Zone Nord');await page.press('#t1Float [data-t1="zname"][data-z="z2"]','Enter');await wait(200);out.ren=await page.evaluate(()=>window.MAQ.state.zones.map(z=>z.nom).join());
await page.keyboard.press('Control+z');await wait(150);out.renUndo=await page.evaluate(()=>window.MAQ.state.zones.map(z=>z.nom).join());out.renHint=await hint();await page.keyboard.press('Control+y');await wait(150);out.renRedo=await page.evaluate(()=>window.MAQ.state.zones.map(z=>z.nom).join());
const k0=await page.evaluate(()=>window.MAQ.state.view.k);await page.click('#t1Float .t1-zone[data-z="z1"] small');await wait(200);out.zsel=await page.evaluate(()=>window.MAQ.state.sel&&window.MAQ.state.sel.ids.join());out.framed=await page.evaluate(k=>Math.abs(window.MAQ.state.view.k-k)>0.01,k0);
out.under=await page.evaluate(()=>document.querySelectorAll('#net path[stroke="#4fc3f7"]').length);
// une ligne n'est que dans une zone : L3 « mise dans » Zone Nord (fiche) → quitte Zone 1 ; puis annulé
await sel('L3');await page.selectOption('#panel [data-t1="zmove"]','z2');await wait(200);out.move=await page.evaluate(()=>window.MAQ.state.zones.map(z=>z.id+':'+z.lines.join('+')).join(' '));await page.mouse.click(5,650);await page.keyboard.press('Control+z');await wait(150);out.moveUndo=await page.evaluate(()=>window.MAQ.state.zones.map(z=>z.id+':'+z.lines.join('+')).join(' '));
sv=await saveTrace('Étude T1');out.site=sv.site&&JSON.stringify(sv.site.traceur.zones);await page.click('#svStay');await wait(150);
console.log('5) lasso et zones :',JSON.stringify(out));
C.c5=out.rect&&out.rectGone&&out.sel1&&out.sel1.kind==='lines'&&out.sel1.ids.join()==='L1,L3'&&out.viewSame&&out.zones==='[{"id":"z1","nom":"Zone 1","lines":["L1","L3"]},{"id":"z2","nom":"Zone 2","lines":["L2"]}]'&&out.shift==='L2,L1'&&out.esc===null
  &&out.pan&&out.panSel!=='lines'&&out.panel.length===2&&/^Zone 1\|2 l\. · \d+ ml$/.test(out.panel[0])&&out.panel[1]==='Zone 2|1 l. · 60 ml'&&out.ren==='Zone 1,Zone Nord'&&out.renUndo==='Zone 1,Zone 2'&&/^Annulé : zone « Zone 2 » renommée « Zone Nord »/.test(out.renHint)&&out.renRedo==='Zone 1,Zone Nord'
  &&out.zsel==='L1,L3'&&out.framed&&out.under===2&&out.move==='z1:L1 z2:L2+L3'&&out.moveUndo==='z1:L1+L3 z2:L2'&&out.site==='[{"id":"z1","nom":"Zone 1","lines":["L1","L3"]},{"id":"z2","nom":"Zone Nord","lines":["L2"]}]';
// ════ c6 · DILATATION (indicatif) — tableau FICTIF (rien à voir avec le vrai tableau de l'entreprise)
const FAKE={lmax:{titre:'Tableau FICTIF (essai)',serie:'1',unite:'m',source:'essai',profondeurs:[0.8,1.0,1.2,1.4,1.6],contraintes:[190,168,150],temperatures:[120,110],
  tables:{'120':[{dn:50,gaine:125,v:[[61,55,50],[52,47,42],[45,41,37],[40,36,33],[36,32,29]]},{dn:100,gaine:200,v:[[99,90,80],[88,79,70],[78,70,62],[70,63,56],[63,57,51]]},{dn:150,gaine:250,v:[[120,108,96],[106,95,85],[94,85,76],[85,77,69],[77,70,63]]}],
          '110':[{dn:50,gaine:125,v:[[66,60,54],[57,51,46],[49,45,40],[44,39,36],[39,35,32]]},{dn:100,gaine:200,v:[[108,98,88],[96,86,77],[85,77,68],[77,69,61],[69,62,56]]},{dn:150,gaine:250,v:[[131,118,105],[115,104,93],[103,93,83],[93,84,75],[84,76,69]]}]}},teMaxDroit:8};
await page.evaluate(F=>{localStorage.setItem('trace:regles',JSON.stringify(F));localStorage.removeItem('trace:maquette:ctx');},FAKE);await fresh('?site=new');
await setLines([
  {id:'L1',name:'Dil U',dn:100,bar:12,pts:[[0,0],[0,20],[100,20],[100,0]],specials:[],parent:null,inv:true},
  {id:'L2',name:'Dil DN80',dn:80,bar:12,pts:[[0,40],[0,50],[55,50],[55,40]],specials:[],parent:null,inv:true},
  {id:'L3',name:'Dil dévié',dn:100,bar:12,pts:[[0,70],[0,80],[40,80],[45,81],[90,80],[90,70]],specials:[],parent:null,inv:true},
  {id:'L4',name:'Ant droite',dn:65,bar:12,pts:[[30,20],[30,32]],specials:[],parent:{line:'L1',m:50,side:1},inv:true},
  {id:'L5',name:'Ant coudée',dn:65,bar:12,pts:[[60,20],[60,25],[70,25]],specials:[],parent:{line:'L1',m:80,side:1},inv:true}]);
const dl=()=>page.evaluate(()=>{const M=window.MAQ;M.state.tab='notes';M.state.sel=null;M.rebuild();return [...document.querySelectorAll('#panel [data-act="t1-dil"]')].map(n=>n.textContent);});
out={list:await dl()};out.plan=await page.evaluate(()=>document.querySelectorAll('#net path.t1-dil').length);out.foot=await page.evaluate(()=>/⚠ 4 alertes dilatation/.test(document.getElementById('foot').textContent));
const E1='Dil U · Ligne trop longue entre deux coudes à 90° : 100 m pour 80 m admissibles (DN 100, prof. 0,80 m supposée, 120 °C, 150 N/mm²) — insérer une lyre (indicatif)';
const E2='Dil DN80 · Ligne trop longue entre deux coudes à 90° : 55 m pour 50 m admissibles (DN 80, prof. 0,80 m supposée, 120 °C, 150 N/mm²) — insérer une lyre (indicatif)'; // DN 80 absent → ligne DN 50 (côté sécurité)
const E3='Dil dévié · Ligne trop longue entre deux coudes à 90° : 90 m pour 80 m admissibles (DN 100, prof. 0,80 m supposée, 120 °C, 150 N/mm²) — insérer une lyre (indicatif)'; // les petites déviations ne coupent pas le tronçon
const E4='Ant droite · Dilatation : 12 m en ligne droite après le té sans coude à 90° (8 m maxi)';
// profondeur de la ligne (interpolée), clic → ligne sélectionnée et tronçon cadré
await page.evaluate(()=>{const M=window.MAQ;M.state.lines[0].prof=1.1;M.rebuild();});out.prof=(await dl())[0];
const k1=await page.evaluate(()=>window.MAQ.state.view.k);await page.click('#panel [data-act="t1-dil"][data-i="1"]');await wait(200);out.click={sel:await page.evaluate(()=>window.MAQ.state.sel),zoom:await page.evaluate(k=>window.MAQ.state.view.k>k*1.2,k1),hint:await hint()};
// réglages (onglet Règles) : 110 °C, 190 N/mm², alerte désactivée
await page.evaluate(()=>{const M=window.MAQ;M.state.lines[0].prof=1.0;M.state.tab='regles';M.state.sel=null;M.rebuild();});out.regles=await page.evaluate(()=>document.getElementById('panel').textContent.includes('Tableau des longueurs maximales : 2 tableaux · 3 DN · 5 profondeurs — Tableau FICTIF (essai) (série 1)'));
await page.selectOption('#panel [data-t1="dT"]','110');await wait(150);out.t110=(await dl())[0];
await page.evaluate(()=>{const M=window.MAQ;M.state.tab='regles';M.rebuild();});await page.selectOption('#panel [data-t1="dS"]','190');await wait(150);out.s190=(await dl())[0];
await page.evaluate(()=>{const M=window.MAQ;M.state.tab='regles';M.rebuild();});await page.click('#panel [data-t1="dOn"]');await wait(150);out.off=await page.evaluate(()=>{const M=window.MAQ;M.state.tab='notes';M.rebuild();return {txt:/Alerte dilatation désactivée/.test(document.getElementById('panel').textContent),n:document.querySelectorAll('#panel [data-act="t1-dil"]').length,plan:document.querySelectorAll('#net path.t1-dil').length,rules:M.rules.dilatAlerte};});
await page.evaluate(()=>{const M=window.MAQ;Object.assign(M.rules,{dilatAlerte:true,dilatTemp:120,dilatContrainte:150});M.rebuild();});
// une lyre (4 coudes 90°) coupe le tronçon : plus d'alerte sur la ligne
await page.evaluate(()=>{const M=window.MAQ;M.state.lines[0].pts=[[0,0],[0,20],[45,20],[45,30],[55,30],[55,20],[100,20],[100,0]];M.rebuild();});out.lyre=(await dl()).filter(t=>/^Dil U/.test(t)).length;
// tableau absent : règle « lyre » désactivée avec le message, la règle du té reste
await page.evaluate(()=>localStorage.removeItem('trace:regles'));await page.reload();await wait(800);out.absent={list:await dl(),msg:await page.evaluate(()=>document.getElementById('panel').textContent.includes('tableau des longueurs maximales absent : importe le pack SCR (partie Règles)'))};
console.log('6) dilatation :',JSON.stringify(out));
C.c6=out.list.length===4&&out.list[0]===E1&&out.list[1]===E2&&out.list[2]===E3&&out.list[3]===E4&&out.plan===4&&out.foot
  &&out.prof==='Dil U · Ligne trop longue entre deux coudes à 90° : 100 m pour 66 m admissibles (DN 100, prof. 1,10 m, 120 °C, 150 N/mm²) — insérer une lyre (indicatif)'
  &&out.click.sel&&out.click.sel.kind==='line'&&out.click.sel.id==='L2'&&out.click.zoom&&/^⚠ Ligne trop longue/.test(out.click.hint)&&out.regles
  &&out.t110==='Dil U · Ligne trop longue entre deux coudes à 90° : 100 m pour 77 m admissibles (DN 100, prof. 1,00 m, 110 °C, 150 N/mm²) — insérer une lyre (indicatif)'
  &&out.s190==='Dil U · Ligne trop longue entre deux coudes à 90° : 100 m pour 96 m admissibles (DN 100, prof. 1,00 m, 110 °C, 190 N/mm²) — insérer une lyre (indicatif)'
  &&out.off.txt&&out.off.n===0&&out.off.plan===0&&out.off.rules===false&&out.lyre===0&&out.absent.msg&&out.absent.list.length===1&&out.absent.list[0]==='Ant droite · Dilatation : 12 m en ligne droite après le té sans coude à 90° (10 m maxi)';
// 6b) le pack SCR (partie « regles ») importé dans l'appli → registre prix / regles → localStorage['trace:regles'] ; recopié aussi au chargement du registre
await page.goto(BASE+'/index.html');await wait(800);{const s=await page.$('#loginSkip');if(s&&await s.isVisible())await s.click();await wait(600);}
await page.evaluate(()=>{const T=window.TRACE;T.state.userId='ethan';T.renderHome();});await wait(300);await page.evaluate(()=>document.getElementById('htEnt').click());await wait(400);
await page.evaluate(()=>{const b=[...document.querySelectorAll('#eq-app .ac-row')].find(x=>/Pack SCR/.test(x.textContent));if(b)b.click();});await wait(400);
await (await page.$('#eq-app input[type=file][data-xin="pack|file"]')).setInputFiles({name:'pack_essai.json',mimeType:'application/json',buffer:Buffer.from(JSON.stringify({format:'trace-pack-scr',version:'essai',regles:FAKE}))});await wait(600);
await page.evaluate(()=>{const b=[...document.querySelectorAll('#eq-app button')].find(x=>/Importer/.test(x.textContent));if(b)b.click();});for(let i=0;i<20;i++){await wait(250);if(await page.evaluate(()=>/Résultat/.test(document.getElementById('eq-app').textContent)))break;}
out={res:await page.evaluate(()=>[...document.querySelectorAll('#eq-app .okbox,#eq-app .warnbox')].map(x=>x.textContent.replace(/\s+/g,' ')).join(' | ')),ls:await page.evaluate(()=>{try{const o=JSON.parse(localStorage.getItem('trace:regles'));return o.lmax.titre+'|'+o.teMaxDroit+'|'+o.lmax.tables['110'][1].v[1][2];}catch(e){return null;}}),reg:await page.evaluate(()=>{const r=window.TRACE.reg.get('prix','regles');return r?r.lmax.titre:null;})};
await page.evaluate(()=>localStorage.removeItem('trace:regles'));await page.reload();await wait(1500);out.again=await page.evaluate(()=>!!localStorage.getItem('trace:regles'));
// format refusé : message clair, rien d'écrit
await page.evaluate(()=>{const T=window.TRACE;T.state.userId='ethan';T.renderHome();});await wait(300);await page.evaluate(()=>document.getElementById('htEnt').click());await wait(400);await page.evaluate(()=>{const b=[...document.querySelectorAll('#eq-app .ac-row')].find(x=>/Pack SCR/.test(x.textContent));if(b)b.click();});await wait(400);
await (await page.$('#eq-app input[type=file][data-xin="pack|file"]')).setInputFiles({name:'pack_faux.json',mimeType:'application/json',buffer:Buffer.from(JSON.stringify({format:'trace-pack-scr',regles:{lmax:{profondeurs:[0.8,1],contraintes:[150],tables:{'120':[{dn:100,v:[[1]]}]}}}}))});await wait(600);
await page.evaluate(()=>{const b=[...document.querySelectorAll('#eq-app button')].find(x=>/Importer/.test(x.textContent));if(b)b.click();});for(let i=0;i<20;i++){await wait(250);if(await page.evaluate(()=>/Résultat/.test(document.getElementById('eq-app').textContent)))break;}
out.bad=await page.evaluate(()=>[...document.querySelectorAll('#eq-app .warnbox')].map(x=>x.textContent.replace(/\s+/g,' ')).join(' | '));out.kept=await page.evaluate(()=>{try{return JSON.parse(localStorage.getItem('trace:regles')).lmax.titre;}catch(e){return null;}});
console.log('6b) pack SCR, partie Règles :',JSON.stringify(out));
C.c6b=/Règles de tracé : longueurs maximales entre coudes \(dilatation\) — 2 tableaux · 3 DN · 5 profondeurs/.test(out.res)&&out.ls==='Tableau FICTIF (essai)|8|77'&&out.reg==='Tableau FICTIF (essai)'&&out.again&&/échec : .*2 profondeurs attendues/.test(out.bad)&&out.kept==='Tableau FICTIF (essai)';
// ════ c7 · CONTEXTE CHANTIER INCHANGÉ (chantier de c1) ; un tracé d'avant se dessine pareil
await page.goto(BASE+'/traceur.html?site='+SITE1);await wait(1600);
await sel('L1');out={etude:await page.evaluate(()=>window.MAQ.t1.etude()),h3:await page.evaluate(()=>[...document.querySelectorAll('#panel h3')].map(h=>h.textContent)),hm:await page.evaluate(()=>!!document.getElementById('lineHmEtat'))};
await page.click('#zEye');await wait(150);out.disp=await page.evaluate(()=>Object.fromEntries(['marche','ecart','ts','versions'].map(k=>{const i=document.querySelector(`#disp input[data-k="${k}"]`);return [k,i?(i.checked?'on':'off')+(i.disabled?'-dis':''):'none'];})));await page.click('#zEye');
out.foot=await page.evaluate(()=>document.getElementById('foot').textContent);out.layer=await page.evaluate(()=>document.getElementById('net').innerHTML.includes('marché · '));out.leg=await page.evaluate(()=>getComputedStyle(document.getElementById('t1VerLeg')).display);
await page.evaluate(()=>{const M=window.MAQ;M.state.lines.find(l=>l.id==='L3').dn=65;M.rebuild();});await page.evaluate(()=>window.MAQ.t1.hist.flush());out.noV=await page.evaluate(()=>window.MAQ.state.lines.every(l=>l.v0===undefined&&l.vm===undefined));
out.old=await page.evaluate(()=>{const M=window.MAQ;M.state.lines=[{id:'L1',name:'Ancienne A',dn:100,bar:12,pts:[[0,0],[50,0],[50,40]],specials:[{id:'v1',type:'valve',m:20}],parent:null,startType:'sousstation',endType:'bypass'}];M.state.seq=2;M.rebuild();const B=M.state.built.L1;
  return {kinds:B.A.pieces.map(p=>p.kind).join(),ids:B.A.pieces.map(p=>p.id).join(),welds:B.A.welds.length+B.R.welds.length,bp:B.A.welds.filter(w=>w.bypass).length,end:B.A.pieces[B.A.pieces.length-1].ref};});
console.log('7) chantier inchangé, tracé d\'avant :',JSON.stringify(out));
C.c7=!out.etude&&out.h3.includes('Marché / modifications')&&!out.h3.includes('Tranche')&&out.hm&&out.disp.marche==='on'&&out.disp.ecart==='on'&&out.disp.ts==='on'&&out.disp.versions==='off-dis'&&/marché → réel/.test(out.foot)&&out.layer&&out.leg==='none'&&out.noV
  &&out.old.kinds==='endpoint,tube,tube,valve,tube,tube,tube,bend,tube,tube,tube,tube,bypassEnd'&&out.old.ids==='X1,P1,P2,V1,P3,P4,P5,C1,P6,P7,P8,P9,U1'&&out.old.welds===25&&out.old.bp===1&&/^by-pass : coude 90° .+ recoupé \(jambe 0,5 m\) vers l'autre conduite$/.test(out.old.end); // mêmes pièces, mêmes n°, mêmes soudures que la version livrée (85fcc6)
// ════ c8 · TÉLÉPHONE (390 px, au doigt)
const pctx=await browser.newContext({viewport:{width:390,height:844},isMobile:true,hasTouch:true,deviceScaleFactor:2});await pctx.route(u=>!/^(localhost|127\.0\.0\.1)$/.test(new URL(u).hostname),r=>r.fulfill({status:200,contentType:'application/json',body:'{}'}));
const ph=await pctx.newPage();watch(ph);ph.on('dialog',d=>d.accept().catch(()=>{}));
await ph.goto(BASE+'/traceur.html');await ph.waitForTimeout(600);await ph.evaluate(()=>{localStorage.clear();});await ph.reload();await ph.waitForTimeout(700);
await ph.evaluate(()=>{const M=window.MAQ;M.state.lines=[{id:'L1',name:'Rue Téléphone',dn:100,bar:12,pts:[[0,0],[60,0]],specials:[],parent:null,inv:true},{id:'L2',name:'Antenne Doigt',dn:65,bar:12,pts:[[30,0],[30,25]],specials:[],parent:{line:'L1',m:30,side:1},inv:true}];M.state.seq=3;M.setMode('select');M.rebuild();M.state.view={k:4.5,tx:60,ty:220};window.dispatchEvent(new Event('resize'));});await ph.waitForTimeout(200);
const cdp=await pctx.newCDPSession(ph);const pW=async(x,y)=>ph.evaluate(([x,y])=>{const v=window.MAQ.state.view;const r=document.getElementById('svg').getBoundingClientRect();return [r.left+x*v.k+v.tx,r.top+y*v.k+v.ty];},[x,y]);
const touchDrag=async(a,b)=>{await cdp.send('Input.dispatchTouchEvent',{type:'touchStart',touchPoints:[{x:a[0],y:a[1]}]});for(let i=1;i<=6;i++){await cdp.send('Input.dispatchTouchEvent',{type:'touchMove',touchPoints:[{x:a[0]+(b[0]-a[0])*i/6,y:a[1]+(b[1]-a[1])*i/6}]});await ph.waitForTimeout(16);}
  await ph.waitForTimeout(150);await cdp.send('Input.dispatchTouchEvent',{type:'touchMove',touchPoints:[{x:b[0],y:b[1]}]});await ph.waitForTimeout(150);await cdp.send('Input.dispatchTouchEvent',{type:'touchEnd',touchPoints:[]});await ph.waitForTimeout(250);}; // doigt posé puis immobile : pas de « lancer » (sinon le tap suivant ne fait que l'arrêter)
out={};const tx0=await ph.evaluate(()=>window.MAQ.state.view.tx);{const a=await pW(-8,-8),b=await pW(70,35);await touchDrag(a,b);}out.pan=await ph.evaluate(t=>Math.abs(window.MAQ.state.view.tx-t)>20,tx0);out.panSel=await ph.evaluate(()=>window.MAQ.state.sel);
await ph.evaluate(()=>{const M=window.MAQ;M.state.view={k:4.5,tx:60,ty:220};window.dispatchEvent(new Event('resize'));});await ph.waitForTimeout(100);
await ph.tap('#t1Lasso');await ph.waitForTimeout(150);out.armed=await ph.evaluate(()=>document.getElementById('t1Lasso').classList.contains('on'));{const a=await pW(-8,-8),b=await pW(70,35);await touchDrag(a,b);}
out.sel=await ph.evaluate(()=>window.MAQ.state.sel);out.card=await ph.evaluate(()=>{const c=document.querySelector('#t1Float .t1-fl-multi');return c?{vis:getComputedStyle(c).display!=='none',txt:/2 lignes sélectionnées/.test(c.textContent)}:null;});
await ph.tap('#t1Float [data-act="t1-zoneNew"]');await ph.waitForTimeout(200);out.zone=await ph.evaluate(()=>JSON.stringify(window.MAQ.state.zones));
await ph.tap('#t1Zones');await ph.waitForTimeout(150);out.zpanel=await ph.evaluate(()=>document.querySelectorAll('#t1Float .t1-zone').length);
// une ligne touchée : fiche flottante (le panneau de droite n'existe pas au téléphone) → renommer, extrémité
await ph.evaluate(()=>{const M=window.MAQ;M.state.sel={kind:'line',id:'L2'};M.rebuild();});await ph.waitForTimeout(150);
await ph.fill('#t1Float [data-t1="pname"]','Antenne Mobile');await ph.tap('#t1Float [data-act="t1-rename"]');await ph.waitForTimeout(200);out.name=await ph.evaluate(()=>window.MAQ.state.lines.find(l=>l.id==='L2').name);
await ph.selectOption('#t1Float [data-t1="pend"][data-at="end"]','sousstation');await ph.waitForTimeout(200);out.end=await ph.evaluate(()=>window.MAQ.state.lines.find(l=>l.id==='L2').endType);
out.layout=await ph.evaluate(()=>{const els=[...document.querySelectorAll('#t1Bar button,#t1Float button,#t1Float select,#t1Float input')].filter(e=>e.offsetParent);const small=els.filter(e=>e.getBoundingClientRect().height<34).map(e=>e.outerHTML.slice(0,60));const f=document.getElementById('t1Float').getBoundingClientRect();return {sw:document.documentElement.scrollWidth,small,fr:Math.round(f.right),n:els.length};});
await pctx.close();
console.log('8) téléphone :',JSON.stringify(out));
C.c8=out.pan&&!out.panSel&&out.armed&&out.sel&&out.sel.kind==='lines'&&out.sel.ids.join()==='L1,L2'&&out.card&&out.card.vis&&out.card.txt&&out.zone==='[{"id":"z1","nom":"Zone 1","lines":["L1","L2"]}]'&&out.zpanel===1
  &&out.name==='Antenne Mobile'&&out.end==='sousstation'&&out.layout.sw<=390&&out.layout.small.length===0&&out.layout.fr<=390&&out.layout.n>=6;
// ════ fin
C.logs=logs.length===0;
const bad=Object.entries(C).filter(([k,v])=>!v).map(([k])=>k);console.log(bad.length?'RESULTAT: ECHEC '+bad.join(','):'RESULTAT: TOUT VERT');console.log(logs.length?logs:'[]');
await browser.close();
