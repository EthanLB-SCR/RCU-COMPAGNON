// Lot 25/08 (retours Ethan) : ① rotations des tubes À l'étape fils ; ② manchon décompté à la SOUDURE (il s'enfile avant) ;
// ③ plus de n° de coulée ; ④ attendu « boucle amont entière » quand aucune fermeture, figé pareil ; ⑤ le visuel suit LE FIL
// (trait décalé, couleur du fil physique, qui change de côté à une inversion — au lieu du milieu du tube).
import { chromium } from 'playwright';
const BASE=process.env.BASE||'http://localhost:8765';
const browser=await chromium.launch({headless:true, executablePath: process.env.CHROMIUM_PATH||undefined});
const ctx=await browser.newContext({viewport:{width:900,height:940}});const page=await ctx.newPage();
const logs=[];page.on('pageerror',e=>logs.push('PAGEERROR: '+e.message.slice(0,300)));page.on('console',m=>{if(m.type()==='error'&&!/supabase|Failed to fetch|net::ERR|404/i.test(m.text()))logs.push(m.text().slice(0,200));});
const PNG='data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg==';
await page.goto(BASE+'/traceur.html');await page.waitForTimeout(600);
await page.evaluate(()=>{localStorage.clear();});await page.reload();await page.waitForTimeout(600);
await page.evaluate(()=>{const S=window.MAQ.state;S.supplier='AXIOM';S.lines=[{id:'L1',name:'Feeder',dn:100,bar:12,pts:[[10,50],[110,50]],specials:[],parent:null}];S.seq=2;window.MAQ.setMode('select');window.MAQ.rebuild();});
await page.click('#bSave');await page.waitForTimeout(200);await page.fill('#svName','DH5 test');await page.click('#svOk');await page.waitForTimeout(800);
await page.click('#svGo');await page.waitForTimeout(1500);await page.selectOption('#roleSel','ethan');await page.waitForTimeout(300);
const L=await page.evaluate(()=>Object.values(window.TRACE.lines).find(l=>!l.parent).id);
const open=i=>page.evaluate(({L,i})=>{window.TRACE.openJoint(L,'A',i);setTimeout(()=>document.querySelectorAll('#sheet details').forEach(d=>d.open=true),50);},{L,i});
// ── A) fiche vierge : ① rotations dans l'étape 2, ③ plus de coulée, ② plus de pick manchon à l'étape 3
await open(1);await page.waitForTimeout(500);
let out=await page.evaluate(()=>{const ds=[...document.querySelectorAll('#sheet .dstep')];const t=document.querySelector('#sheet').textContent;
  return {coulee:/coulée/i.test(t),rota:ds[1].querySelectorAll('[data-rota]').length,rotb:ds[1].querySelectorAll('[data-rotb]').length,
    flips:ds[1].querySelectorAll('[data-flipa],[data-flipb]').length,slv3:!!ds[2].querySelector('[data-stkneed="sleeve"]')};});
console.log('A1) étape 2 avec rotations, plus de coulée, étape 3 sans pick manchon:',JSON.stringify(out));
const a1=!out.coulee&&out.rota===4&&out.rotb===4&&out.flips===2&&!out.slv3;
await page.evaluate(()=>{const ds=[...document.querySelectorAll('#sheet .dstep')];ds[1].open=true;ds[1].querySelector('[data-rota="90"]').click();});
await page.waitForTimeout(300);
await page.evaluate(()=>{document.querySelectorAll('#sheet details').forEach(d=>d.open=true);const ds=[...document.querySelectorAll('#sheet .dstep')];ds[1].querySelector('[data-flipb]').click();});
await page.waitForTimeout(300);
out=await page.evaluate(({L})=>{const els=window.TRACE.lines[L].cond.A.els;return {rot:els[1].rot,flip:!!els[2].flip};},{L});
console.log('A2) tubes tournés depuis l\'étape fils:',JSON.stringify(out));
const a2=out.rot===90&&out.flip===true;
await page.evaluate(({L})=>{const els=window.TRACE.lines[L].cond.A.els;els[1].rot=0;els[2].flip=false;window.TRACE.closeSheet();window.TRACE.renderAll();},{L});
// ── B) ④ aucune fermeture déclarée, fils continus depuis le départ → « boucle amont entière » affichée puis FIGÉE
await page.evaluate(({L})=>{const J=window.TRACE.lines[L].cond.A.joints;J[0].wire='raccorde';J[0].conn={E:'E',N:'N'};window.TRACE.renderAll();},{L});
await open(1);await page.waitForTimeout(500);
out=await page.evaluate(()=>{const t=document.querySelector('#sheet').textContent;const m=t.match(/Attendu au testeur ici : ([\d,]+) Ω/);
  return {att:m?m[1]:null,entiere:/boucle amont entière/.test(t),centrale:/centrale/.test(t)};});
console.log('B1) attendu « boucle amont entière » sans aucune fermeture:',JSON.stringify(out));
const b1=out.att==='0,30'&&out.entiere&&out.centrale; // J[1] est à 12 m (joint d'about au PK 0) : (12 + 12) × 12,5 Ω/km
await page.evaluate(({L,PNG})=>{const j=window.TRACE.lines[L].cond.A.joints[1];j.steps={1:{photos:[PNG]}};},{L,PNG});
await open(1);await page.waitForTimeout(400);
await page.evaluate(()=>{document.querySelector('#st1-vis').checked=true;});
await page.evaluate(()=>document.querySelector('#sheet [data-stepok="1"]').click());await page.waitForTimeout(500);
await page.evaluate(()=>{const s=document.querySelector('#sheet');s.querySelector('#st2-meas').value='0.3';s.querySelector('#st2-iso').value='400';s.querySelector('#st2-masse').checked=true;s.querySelector('#st2-cont').checked=true;});
await page.evaluate(()=>document.querySelector('#sheet [data-stepok="2"]').click());await page.waitForTimeout(600);
out=await page.evaluate(({L})=>{const j=window.TRACE.lines[L].cond.A.joints[1];const f=j.steps&&j.steps[2]&&j.steps[2].dh;
  return {id:f&&f.closureId,cl:f&&f.closure,exp:f&&f.expected,frzbox:/boucle amont entière/.test(document.querySelector('#sheet').textContent)};},{L});
console.log('B2) figé avec closureId=self:',JSON.stringify(out));
const b2=out.id==='self'&&/boucle amont entière/.test(out.cl||'')&&out.exp===0.3&&out.frzbox;
await page.evaluate(()=>document.querySelector('#sheet [data-dhfrz]').click());await page.waitForTimeout(700);
out=await page.evaluate(()=>{const g=document.querySelector('#dhG');const h=g.innerHTML;
  return {tab:window.TRACE.state.tab,ferm:/⟲/.test(g.textContent),att:/attendu/.test(g.textContent),fils:/#dfe4ea/.test(h)&&/#e2843a/.test(h)};});
console.log('B3) rejeu sur le plan : les DEUX fils tracés (étamé + nu) depuis le départ:',JSON.stringify(out));
const b3=out.tab==='plan'&&out.ferm&&out.att&&out.fils;
// ── C) ⑤ une INVERSION sur le trajet : le tracé change de fil (les 2 couleurs), le défaut est localisé sur le bon fil
await page.evaluate(({L})=>{const T=window.TRACE;const J=T.lines[L].cond.A.joints;
  J[2].wire='raccorde';J[2].conn={E:'E',N:'N'};J[3].wire='inversion';J[3].conn={E:'N',N:'E'};J[4].wire='raccorde';J[4].conn={E:'E',N:'N'};T.closeSheet();T.renderAll();},{L});
await page.click('#tabbar [data-tab=bouclage]');await page.waitForTimeout(500);
await page.evaluate(()=>{document.querySelector('#loc-d').value='50';const w=document.querySelector('#loc-wire');if(w)w.value='E';});
await page.click('#loc-go');await page.waitForTimeout(500);
out=await page.evaluate(()=>{const r=window.TRACE.state.loc;return {ok:r&&r.ok,w:r&&r.seg&&r.seg.w,legs:r&&r.legs&&r.legs.length,d0:r&&r.legs&&r.legs[0].d0,d1:r&&r.legs&&r.legs[0].d1};});
console.log('C1) branché étamé au départ, 50 m : après l\'inversion (PK 48) on est sur le NU:',JSON.stringify(out));
const c1=out.ok&&out.w==='N'&&out.legs===1&&out.d0===0&&out.d1===50;
await page.click('#loc-show');await page.waitForTimeout(700);
out=await page.evaluate(()=>{const g=document.querySelector('#dhG');const h=g.innerHTML;
  return {tab:window.TRACE.state.tab,gris:/#dfe4ea/.test(h),cuivre:/#e2843a/.test(h),cote:/50 m ►/.test(g.textContent),lab:/défaut ≈ 50 m/.test(g.textContent)};});
console.log('C2) tracé sur le plan : étamé PUIS nu (bascule à l\'inversion), cote et défaut:',JSON.stringify(out));
const c2=out.tab==='plan'&&out.gris&&out.cuivre&&out.cote&&out.lab;
// ── D) ② avec un stock qui a des manchons : le pick « Manchon enfilé » est à l'étape 1 et le décompte part à la SOUDURE
await page.evaluate(({L})=>{const T=window.TRACE;const st=T.net.stock||(T.net.stock={});
  st.zones=[{id:'Z1',name:'Base vie',x:60,y:62,w:8,h:5,status:'ok'}];st.livs=[{id:'LV1',label:'Camion 1',status:'recu',at:new Date().toISOString()}];
  st.lots=[{id:'LO1',liv:'LV1',zone:'Z1',key:'sleeve:100',label:'Manchon DN100',kind:'sleeve',dn:100,qty:5}];st.takes=[];st.moves=[];T.renderAll();},{L});
await open(5);await page.waitForTimeout(500);
out=await page.evaluate(()=>{const ds=[...document.querySelectorAll('#sheet .dstep')];
  return {slv1:ds[0].querySelectorAll('[data-stkneed="sleeve"]').length,enfile:/Manchon enfilé/.test(ds[0].textContent),slv3:!!ds[2].querySelector('[data-stkneed="sleeve"]')};});
console.log('D1) pick manchon dans l\'étape 1 (« Manchon enfilé »), pas à la 3:',JSON.stringify(out));
const d1=out.slv1>=2&&out.enfile&&!out.slv3;
await page.evaluate(({L,PNG})=>{const j=window.TRACE.lines[L].cond.A.joints[5];j.steps={1:{photos:[PNG]}};},{L,PNG});
await open(5);await page.waitForTimeout(400);
await page.evaluate(()=>{document.querySelector('#st1-vis').checked=true;});
await page.evaluate(()=>document.querySelector('#sheet [data-stepok="1"]').click());await page.waitForTimeout(600);
out=await page.evaluate(({L})=>{const T=window.TRACE;const s=T.net.stock;const j=T.lines[L].cond.A.joints[5];
  return {takes:s.takes.length,key:s.takes[0]&&s.takes[0].key,zone:s.takes[0]&&s.takes[0].zone,d1:!!(j.steps[1]&&j.steps[1].done),status:j.status};},{L});
console.log('D2) étape 1 validée → manchon décompté du stock à la soudure:',JSON.stringify(out));
const d2=out.takes===1&&out.key==='sleeve:100'&&out.zone==='Z1'&&out.d1&&out.status==='soudee';
const ALL=a1&&a2&&b1&&b2&&b3&&c1&&c2&&d1&&d2;
console.log('RESULTAT:',ALL?'TOUT VERT':'ECHEC '+JSON.stringify({a1,a2,b1,b2,b3,c1,c2,d1,d2}));
console.log(logs.length?logs:'[]');
await browser.close();
process.exit(ALL?0:1);
