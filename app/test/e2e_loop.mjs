// Bouclage des fils ENTRE EUX dans un manchon (Ethan 26/08) : à l'étape 2, toucher les DEUX fils d'un même côté les ponte
// (amont ou aval). La boucle DH se ferme là (« fermée — fils bouclés entre eux au manchon X »), le fil ne traverse plus.
// + wireOfTee constant (té retourné : même fil) + suppression de zone de stockage = bascule des pièces d'abord.
import { chromium } from 'playwright';
const BASE=process.env.BASE||'http://localhost:8765';
const browser=await chromium.launch({headless:true, executablePath: process.env.CHROMIUM_PATH||undefined});
const ctx=await browser.newContext({viewport:{width:900,height:940}});const page=await ctx.newPage();
page.on('dialog',d=>d.accept().catch(()=>{}));
const logs=[];page.on('pageerror',e=>logs.push('PAGEERROR: '+e.message.slice(0,300)));page.on('console',m=>{if(m.type()==='error'&&!/supabase|Failed to fetch|net::ERR|404/i.test(m.text()))logs.push(m.text().slice(0,200));});
await page.goto(BASE+'/traceur.html');await page.waitForTimeout(600);
await page.evaluate(()=>{localStorage.clear();});await page.reload();await page.waitForTimeout(600);
await page.evaluate(()=>{const S=window.MAQ.state;S.supplier='RENALIA';S.lines=[
  {id:'L1',name:'Feeder',dn:100,bar:12,pts:[[10,50],[110,50]],specials:[],parent:null}];S.seq=2;window.MAQ.setMode('select');window.MAQ.rebuild();});
await page.click('#bSave');await page.waitForTimeout(200);await page.fill('#svName','Loop test');await page.click('#svOk');await page.waitForTimeout(800);
await page.click('#svGo');await page.waitForTimeout(1500);await page.selectOption('#roleSel','ethan');await page.waitForTimeout(300);
// étape 1 déjà faite sur S-0002 (2e manchon), fiche ouverte
await page.evaluate(()=>{const T=window.TRACE;const L=Object.values(T.lines)[0];const j=L.cond.A.joints[1];
  j.steps={1:{done:true,by:'karim',at:new Date().toISOString(),photos:[],visuel:true}};j.status='soudee';T.openJoint(L.id,'A',1);});
await page.waitForTimeout(600);
const tap=sel2=>page.evaluate(s2=>{document.querySelector(s2).dispatchEvent(new MouseEvent('click',{bubbles:true}));},sel2);
// ── 1) deux taps sur les deux fils AMONT → bouclés entre eux (état + pont dessiné + badge)
await tap('#sheet g[data-wire="a:E"]');await page.waitForTimeout(250);
await tap('#sheet g[data-wire="a:N"]');await page.waitForTimeout(350);
let out=await page.evaluate(()=>{const T=window.TRACE;const el=document.querySelector('#sheet');
  return {loopA:T.state.loopA===true,conn:JSON.stringify(T.state.conn),badge:/BOUCLÉS ENTRE EUX/.test(el.innerHTML),ok:/bouclés ENTRE EUX/i.test(el.textContent)};});
console.log('1) 2 taps amont → fils bouclés entre eux:',JSON.stringify(out));
const c1=out.loopA&&out.conn==='{"E":"X","N":"X"}'&&out.badge&&out.ok;
// ── 2) valider l'étape 2 → porté par la soudure : loopA, conn X/X, wire « raccorde » (PAS une fausse inversion), figeage parlant
await page.evaluate(()=>{[...document.querySelectorAll('#sheet [data-stepok]')].find(b=>b.dataset.stepok==='2').click();});
await page.waitForTimeout(600);
out=await page.evaluate(()=>{const T=window.TRACE;const L=Object.values(T.lines)[0];const j=L.cond.A.joints[1];
  return {loopA:j.loopA===true,conn:JSON.stringify(j.conn),wire:j.wire,frz:(j.steps[2]&&j.steps[2].dh&&j.steps[2].dh.closure)||''};});
console.log('2) étape 2 validée:',JSON.stringify(out));
const c2=out.loopA&&out.conn==='{"E":"X","N":"X"}'&&out.wire==='raccorde'&&/bouclés entre eux à CE manchon/.test(out.frz);
// ── 3) le fil ne TRAVERSE plus (wirePath coupé) ; d'un manchon amont, la direction aval est « fermée au manchon bouclé » avec une valeur
out=await page.evaluate(()=>{const T=window.TRACE;const L=Object.values(T.lines)[0];
  const wp=T.wirePath(L.id,'A','E');const cut=wp.segs.find(s2=>s2.kind==='cut');
  const D=T.dhLoop(L.id,'A');const AP=T.dhAtPoint(D,D.rows[0]);
  return {cut:!!cut,kind:AP.down.kind,who:AP.down.row&&AP.down.row.weldId,R:AP.down.R,lab:T.dhDirLab(AP.down),up:T.dhDirLab(AP.up)};});
console.log('3) coupure + boucle fermée au manchon bouclé:',JSON.stringify(out));
const c3=out.cut&&out.kind==='loopW'&&out.R>0&&/fils bouclés entre eux au manchon/.test(out.lab);
// ── 4) fiche ré-ouverte : le pont est là ; « Annuler l'étape 2 » défait le bouclage pour de vrai
await page.evaluate(()=>{const T=window.TRACE;const L=Object.values(T.lines)[0];T.openJoint(L.id,'A',1);});
await page.waitForTimeout(500);
out=await page.evaluate(()=>({badge:/BOUCLÉS ENTRE EUX/.test(document.querySelector('#sheet').innerHTML)}));
console.log('4a) fiche ré-ouverte — pont visible:',JSON.stringify(out));
const c4a=out.badge;
await page.evaluate(()=>{[...document.querySelectorAll('#sheet [data-stepundo]')].find(b=>b.dataset.stepundo==='2').click();});
await page.waitForTimeout(600);
out=await page.evaluate(()=>{const T=window.TRACE;const L=Object.values(T.lines)[0];const j=L.cond.A.joints[1];
  return {gone:!j.loopA&&!j.loopB,wire:j.wire,st:!T.state.loopA&&!T.state.loopB};});
console.log('4b) étape 2 annulée — bouclage défait:',JSON.stringify(out));
const c4b=out.gone&&out.wire==='a_raccorder'&&out.st;
// ── 5) côté AVAL : deux taps sur les deux fils aval → loopB (sans fil amont choisi)
await tap('#sheet g[data-wire="b:E"]');await page.waitForTimeout(250);
await tap('#sheet g[data-wire="b:N"]');await page.waitForTimeout(350);
out=await page.evaluate(()=>{const T=window.TRACE;return {loopB:T.state.loopB===true,conn:JSON.stringify(T.state.conn)};});
console.log('5) 2 taps aval → bouclés entre eux côté aval:',JSON.stringify(out));
const c5=out.loopB&&out.conn==='{"E":"X","N":"X"}';
// ── 6) wireOfTee constant + clamp du raccord : vérifiés dans e2e_tee (checks 6-7)
const c6=true;
// ── 7) suppression d'une zone de stockage qui a encore des pièces : la modale « basculer » s'ouvre, la bascule garde les comptes
await page.evaluate(()=>{const T=window.TRACE;const s=T.net.stock||(T.net.stock={zones:[],lots:[],livs:[],moves:[],takes:[]});
  s.zones.push({id:'Z1',name:'Camion 1',x:30,y:45,w:6,h:3,rot:0,status:'ok'},{id:'Z2',name:'Base vie',x:90,y:55,w:6,h:3,rot:0,status:'ok'});
  s.livs.push({id:'V1',label:'Camion 1',bl:'BL-1',recuAt:new Date().toISOString()});
  s.lots.push({id:'lot1',liv:'V1',zone:'Z1',key:'pipe:100:12',label:'Barre DN100',kind:'pipe',dn:100,len:12,qty:5});
  s.takes.push({zone:'Z1',key:'pipe:100:12',qty:1,weldId:'S-0001',at:new Date().toISOString(),by:'karim'});
  T.state.tab='stock';T.renderAll();});
await page.waitForTimeout(500);
await page.evaluate(()=>{const b=[...document.querySelectorAll('#stock [data-stkdel]')].find(x=>x.dataset.stkdel==='Z1');b.click();});
await page.waitForTimeout(400);
out=await page.evaluate(()=>{const m=document.querySelector('#modal');return {open:!!m&&/bascule-les d'abord/i.test(m.textContent),reste:/4 pièce/.test(m.textContent),dest:!!document.getElementById('stkzd-dest')};});
console.log('7a) modale de bascule ouverte (reste 4):',JSON.stringify(out));
const c7a=out.open&&out.reste&&out.dest;
await page.evaluate(()=>{document.getElementById('stkzd-dest').value='Z2';document.getElementById('stkzd-ok').click();});
await page.waitForTimeout(500);
out=await page.evaluate(()=>{const T=window.TRACE;const s=T.net.stock;
  const z1=s.zones.find(z=>z.id==='Z1');const lot=s.lots.find(l=>l.key==='pipe:100:12');const tk=s.takes[0];const mv=s.moves.find(m=>m.to==='Z2'&&m.from==='Z1');
  return {z1gone:!z1,lotZone:lot&&lot.zone,lotQty:lot&&lot.qty,takeZone:tk&&tk.zone,move:!!mv,mvQty:mv&&mv.qty};});
console.log('7b) bascule Z1→Z2 : lots + prélèvements suivent, mouvement tracé:',JSON.stringify(out));
const c7b=out.z1gone&&out.lotZone==='Z2'&&out.lotQty===5&&out.takeZone==='Z2'&&out.move&&out.mvQty===4;
// ── 8) carte de prélèvement : zones ÉLOIGNÉES → étiquettes empilées sans chevauchement + grandes cibles tactiles
await page.evaluate(()=>{const T=window.TRACE;const s=T.net.stock;
  s.zones.push({id:'Z3',name:'Camion 2',x:91,y:56,w:5,h:3,rot:0,status:'ok'},{id:'Z4',name:'ZONE 4',x:89,y:54,w:5,h:3,rot:0,status:'ok'});
  s.lots.push({id:'lot2',liv:'V1',zone:'Z3',key:'pipe:100:12',label:'Barre DN100',kind:'pipe',dn:100,len:12,qty:3},
              {id:'lot3',liv:'V1',zone:'Z4',key:'pipe:100:12',label:'Barre DN100',kind:'pipe',dn:100,len:12,qty:3});
  const L=Object.values(T.lines)[0];const j=L.cond.A.joints[2];j.steps={};T.openJoint(L.id,'A',2);});
await page.waitForTimeout(600);
out=await page.evaluate(()=>{const svg=document.querySelector('#sheet .card svg');if(!svg)return {svg:false};
  const txts=[...svg.querySelectorAll('text')].map(t=>({x:+t.getAttribute('x'),y:+t.getAttribute('y'),fs:+t.getAttribute('font-size'),t:t.textContent}));
  let overlap=false;for(let i=0;i<txts.length;i++)for(let k=i+1;k<txts.length;k++){const a=txts[i],b=txts[k];
    if(Math.abs(a.y-b.y)<Math.min(a.fs,b.fs)&&Math.abs(a.x-b.x)<(a.t.length+b.t.length)/2*a.fs*.5)overlap=true;}
  return {svg:true,n:txts.length,overlap,hits:svg.querySelectorAll('[data-stkhit]').length,halo:txts.length&&!!svg.querySelector('text[paint-order="stroke"]')};});
console.log('8) carte : étiquettes empilées sans chevauchement + cibles:',JSON.stringify(out));
const c8=out.svg&&out.n>=3&&!out.overlap&&out.hits>=3&&out.halo;
// ── 9) la question « pris dans quel stockage ? » ne disparaît PLUS quand aucune zone n'a la pièce (Ethan 26/08)
await page.evaluate(()=>{const T=window.TRACE;const s=T.net.stock;s.lots.forEach(l=>{l.qty=0;});
  const L=Object.values(T.lines)[0];T.openJoint(L.id,'A',3);});
await page.waitForTimeout(600);
out=await page.evaluate(()=>{const el=document.querySelector('#sheet');const t=el.textContent;
  const none=el.querySelector('[data-stkpick="none"][data-on="1"]');
  return {q:/Pièce prise dans quel stockage/.test(t),warn:/aucun stockage n'a/i.test(t),napas:/n'en a pas/.test(t),horsSel:!!none};});
console.log('9) plus de disparition : question posée même sans stock correspondant:',JSON.stringify(out));
const c9=out.q&&out.warn&&out.napas&&out.horsSel;
const ALL=c1&&c2&&c3&&c4a&&c4b&&c5&&c6&&c7a&&c7b&&c8&&c9;
console.log('RESULTAT:',ALL?'TOUT VERT':'ECHEC '+JSON.stringify({c1,c2,c3,c4a,c4b,c5,c7a,c7b,c8,c9}));
console.log(logs.length?logs:'[]');
await browser.close();
process.exit(ALL?0:1);
