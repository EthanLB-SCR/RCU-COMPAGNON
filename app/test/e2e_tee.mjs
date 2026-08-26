// Dessin des tés (maquette validée 25/08 soir) : T PLEIN à congés à l'angle réel ; le fil côté branche plonge ;
// fils BOUCLÉS = pontés AU MANCHON de sortie de té, de part et d'autre (té + antenne) ; LOGSTOR = positions é/nu inversées ;
// étiquettes plafonnées + sortie de té rangée le long de l'antenne.
import { chromium } from 'playwright';
const BASE=process.env.BASE||'http://localhost:8765';
const browser=await chromium.launch({headless:true, executablePath: process.env.CHROMIUM_PATH||undefined});
const ctx=await browser.newContext({viewport:{width:900,height:940}});const page=await ctx.newPage();
const logs=[];page.on('pageerror',e=>logs.push('PAGEERROR: '+e.message.slice(0,300)));page.on('console',m=>{if(m.type()==='error'&&!/supabase|Failed to fetch|net::ERR|404/i.test(m.text()))logs.push(m.text().slice(0,200));});
async function mkSite(sup,name){
  await page.goto(BASE+'/traceur.html');await page.waitForTimeout(500);
  await page.evaluate(()=>{localStorage.clear();});await page.reload();await page.waitForTimeout(500);
  await page.evaluate(s2=>{const S=window.MAQ.state;S.supplier=s2;S.lines=[
    {id:'L1',name:'Feeder',dn:100,bar:12,pts:[[10,50],[120,50]],specials:[],parent:null},
    {id:'L2',name:'Antenne',dn:80,bar:12,pts:[[60,50],[60,80]],specials:[],parent:{line:'L1',m:50,side:1}}];S.seq=3;window.MAQ.setMode('select');window.MAQ.rebuild();},sup);
  await page.click('#bSave');await page.waitForTimeout(200);await page.fill('#svName',name);await page.click('#svOk');await page.waitForTimeout(600);
  await page.click('#svGo');await page.waitForTimeout(1200);await page.selectOption('#roleSel','ethan');await page.waitForTimeout(300);
  await page.evaluate(()=>window.TRACE.centerOn(60.35,50.35,110));await page.waitForTimeout(500);}
// ── 1) AXIOM, mode série (défaut) : T plein dessiné, le CUIVRÉ plonge (4 brins : 2 conduites × aller/retour), pas de U
await mkSite('AXIOM','Tee test');
let out=await page.evaluate(()=>{const dv=[...document.querySelectorAll('[data-wtee]')];
  return {teep:document.querySelectorAll('[data-teep]').length,wtee:dv.length,cuivre:dv.every(p2=>p2.getAttribute('stroke')==='#e2843a'),u:document.querySelectorAll('[data-wteeu]').length,
    rails:dv.every(p2=>/^M[^L]+L[^L]+L[^L]+$/.test(p2.getAttribute('d').trim())),ab:document.querySelectorAll('[data-teeab]').length};});
console.log('1) T plein + cuivré en RAILS parallèles (pas de croisement) + about acier/bague au bout:',JSON.stringify(out));
const c1=out.teep>=2&&out.wtee>=4&&out.cuivre&&out.u===0&&out.rails&&out.ab>=4; // raccord court + montée le long du bord (3 points), bague + acier avant la soudure de sortie
// ── 2) sortie de té réglée BOUCLÉE → deux ponts AU MANCHON de sortie : côté té ET côté antenne
await page.evaluate(()=>{const T=window.TRACE;const L2=Object.values(T.lines).find(l=>l.parent);L2.cond.A.joints[0].tee={mode:'boucle'};T.renderAll();});
await page.waitForTimeout(400);
out=await page.evaluate(()=>({u:[...document.querySelectorAll('[data-wteeu]')].map(x=>x.dataset.wteeu).sort()}));
console.log('2) bouclé : pontés au manchon de sortie, de part et d\'autre:',JSON.stringify(out));
const c2=out.u.join(',')==='ant,tee';
// ── 3) non raccordé : brins en attente à mi-branche, aucun U
await page.evaluate(()=>{const T=window.TRACE;const L2=Object.values(T.lines).find(l=>l.parent);L2.cond.A.joints[0].tee={mode:'none'};T.renderAll();});
await page.waitForTimeout(400);
out=await page.evaluate(()=>({u:document.querySelectorAll('[data-wteeu]').length,wtee:document.querySelectorAll('[data-wtee]').length}));
console.log('3) non raccordé : brins en attente, pas de pont:',JSON.stringify(out));
const c3=out.u===0&&out.wtee>=4;
// ── 4) étiquette « sortie de té » rangée + taille plafonnée (fini les pavés géants au zoom fort)
out=await page.evaluate(()=>{const k=window.TRACE.state.view.k;const txts=[...document.querySelectorAll('#net text')].filter(t=>/sortie de té/.test(t.textContent));
  const fs=txts.length?parseFloat(txts[0].getAttribute('font-size')):null;return {n:txts.length,fs,cap:17/k+0.01,ok:fs!==null&&fs<=17/k+0.01};});
console.log('4) étiquette sortie de té plafonnée:',JSON.stringify(out));
const c4=out.n>=1&&out.ok;
// ── 5) LOGSTOR : positions é/nu INVERSÉES (l'étamé prend la place du cuivré) et c'est l'ÉTAMÉ qui plonge
await mkSite('LOGSTOR','Tee LOGSTOR');
out=await page.evaluate(()=>{const dv=[...document.querySelectorAll('[data-wtee]')];
  const L1=Object.values(window.TRACE.lines).find(l=>!l.parent);const e=L1.cond.A.els.find(x=>x.kind==='pipe');
  return {wtee:dv.length,etame:dv.every(p2=>p2.getAttribute('stroke')==='#dfe4ea'),
    swap:e&&e._wo&&e._wo.E!==undefined&&e._wo.N!==undefined&&Math.sign(e._wo.E-e._wo.N)!==0&&(e._wo.E<e._wo.N)};});
console.log('5) LOGSTOR : l\'étamé est côté branche et plonge:',JSON.stringify(out));
const c5=out.wtee>=4&&out.etame;
// ── 6) té à saut vers le bas / retourné : le MÊME fil part dans la branche (Ethan 26/08 — seule la position change de côté)
await page.evaluate(()=>{const T=window.TRACE;const L1=Object.values(T.lines).find(l=>!l.parent);const e=L1.cond.A.els.find(x=>x.kind==='tee');e.sautDir='bas';e.saut=true;T.renderAll();});
await page.waitForTimeout(400);
out=await page.evaluate(()=>({etame:[...document.querySelectorAll('[data-wtee]')].every(p2=>p2.getAttribute('stroke')==='#dfe4ea')}));
console.log('6) saut vers le bas : toujours le même fil (étamé chez LOGSTOR):',JSON.stringify(out));
const c6=out.etame;
// ── 7) tube tourné à 180° (fils de l'autre côté) : le raccord reste DANS le corps du té (fini les fils qui dépassent du calo)
await page.evaluate(()=>{const T=window.TRACE;const L1=Object.values(T.lines).find(l=>!l.parent);const e=L1.cond.A.els.find(x=>x.kind==='tee');e.rot=180;T.renderAll();});
await page.waitForTimeout(400);
out=await page.evaluate(()=>{const T=window.TRACE;const L1=Object.values(T.lines).find(l=>!l.parent);const e=L1.cond.A.els.find(x=>x.kind==='tee');
  const b0={x:e.branch[0][0],y:e.branch[0][1]},b1={x:e.branch[1][0],y:e.branch[1][1]};const uL=Math.hypot(b1.x-b0.x,b1.y-b0.y)||1;const ux=(b1.x-b0.x)/uL,uy=(b1.y-b0.y)/uL;
  const tUs=[...document.querySelectorAll('[data-wtee]')].map(p2=>{const m=p2.getAttribute('d').match(/M[^L]+L\s*([\d.eE+-]+)[ ,]([\d.eE+-]+)/);if(!m)return null;
    return ((+m[1]-b0.x)*ux+(+m[2]-b0.y)*uy)/uL;}).filter(v=>v!==null);
  return {n:tUs.length,mn:Math.min(...tUs).toFixed(3),inside:tUs.every(t=>t>0&&t<=0.56)};});
console.log('7) tourné 180° : raccords clampés dans le corps:',JSON.stringify(out));
const c7=out.n>=4&&out.inside;
const ALL=c1&&c2&&c3&&c4&&c5&&c6&&c7;
console.log('RESULTAT:',ALL?'TOUT VERT':'ECHEC '+JSON.stringify({c1,c2,c3,c4,c5,c6,c7}));
console.log(logs.length?logs:'[]');
await browser.close();
process.exit(ALL?0:1);
