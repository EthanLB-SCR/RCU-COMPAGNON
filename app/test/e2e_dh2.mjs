// DH v2 : règles fournisseur (fil dans la branche), piquages purge/vidange (état DH), bouclage temporaire,
// mesure (boucle + isolement + localisation), verdict avec tolérance, défaut dessiné sur le plan (trajet + cote + zone), mesures enregistrées
import { chromium } from 'playwright';
const BASE=process.env.BASE||'http://localhost:8765';
const browser=await chromium.launch({headless:true, executablePath: process.env.CHROMIUM_PATH||undefined});
const ctx=await browser.newContext({viewport:{width:900,height:940}});const page=await ctx.newPage();
const logs=[];page.on('pageerror',e=>logs.push('PAGEERROR: '+e.message.slice(0,300)));page.on('console',m=>{if(m.type()==='error'&&!/supabase|Failed to fetch|net::ERR|404/i.test(m.text()))logs.push(m.text().slice(0,200));});
// réseau traceur : feeder avec purge + vidange + antenne, AXIOM (cuivré dans la branche)
await page.goto(BASE+'/traceur.html');await page.waitForTimeout(600);
await page.evaluate(()=>{localStorage.clear();});await page.reload();await page.waitForTimeout(600);
await page.evaluate(()=>{const S=window.MAQ.state;S.supplier='AXIOM';S.lines=[{id:'L1',name:'Feeder',dn:100,bar:12,pts:[[10,50],[90,50]],specials:[{id:'pv1',type:'tee',vert:'up',m:20},{id:'pv2',type:'tee',vert:'down',m:40}],parent:null},{id:'L2',name:'A1',dn:80,bar:12,pts:[[60,50],[60,80]],specials:[],parent:{line:'L1',m:50,side:1}}];S.seq=3;window.MAQ.setMode('select');window.MAQ.rebuild();});
await page.click('#bSave');await page.waitForTimeout(200);await page.fill('#svName','DH2 test');await page.click('#svOk');await page.waitForTimeout(800);
await page.click('#svGo');await page.waitForTimeout(1500);await page.selectOption('#roleSel','ethan');await page.waitForTimeout(300);
// tout raccorder (fils droits) pour avoir une boucle continue
await page.evaluate(()=>{const T=window.TRACE;Object.values(T.lines).forEach(l=>['A','R'].forEach(c=>{const cd=l.cond[c];if(!cd)return;cd.joints.forEach(j=>{j.status='manchonnee';j.wire='raccorde';j.conn={E:'E',N:'N'};});}));T.renderAll();});
await page.click('#tabbar [data-tab=bouclage]');await page.waitForTimeout(600);
// 1) fil par défaut AXIOM = cuivré (nu) dans la branche ; piquages non déclarés signalés
let out=await page.evaluate(()=>{const el=document.querySelector('#bouclage');return {autoLab:document.querySelector('#dh-antwire option[value=auto]')?.textContent.trim().slice(0,30),piqWarn:/piquage/i.test(el.textContent)&&/sans état DH/.test(el.textContent),tol:!!document.querySelector('#dh-tol'),piql:!!document.querySelector('#dh-piql')};});
console.log('AXIOM auto=cuivré + piquages à déclarer:',JSON.stringify(out));
// 2) déclarer la purge bouclée en coiffe → le fil concerné gagne 2×piqL ; la vidange (té down) concerne L'AUTRE fil
out=await page.evaluate(()=>{const T=window.TRACE;const L=Object.values(T.lines).find(l=>!l.parent);
  const els=L.cond.A.els;const up=els.findIndex(e=>e.kind==='tee'&&e.vert==='up');const dn=els.findIndex(e=>e.kind==='tee'&&e.vert==='down');
  return {up:up>=0,dn:dn>=0,upId:els[up]&&els[up].id,dnId:els[dn]&&els[dn].id,line:L.id};});
console.log('piquages trouvés:',JSON.stringify(out));
const piq=out;
out=await page.evaluate(({line,upId})=>{const T=window.TRACE;const d=T.net.dhData||(T.net.dhData={ends:{},temps:{},mesures:[]});
  // avant : totaux
  const D0=(()=>{const el=document.querySelector('#bouclage');const m=el.textContent.match(/fil étamé total ([\d,]+) m · nu ([\d,]+) m/);return m?{E:m[1],N:m[2]}:null;})();
  d.ends[line+':'+upId]={state:'coiffe',by:'test',at:new Date().toISOString()};T.renderAll();
  const D1=(()=>{const el=document.querySelector('#bouclage');const m=el.textContent.match(/fil étamé total ([\d,]+) m · nu ([\d,]+) m/);return m?{E:m[1],N:m[2]}:null;})();
  return {avant:D0,apres:D1};},{line:piq.line,upId:piq.upId});
console.log('purge bouclée coiffe (AXIOM: le NU gagne 2×piqL=4 m):',JSON.stringify(out));
// 3) vidange déclarée « non bouclé » → coupure sur L'AUTRE fil (étamé, té down inversé) → lignes grisées au-delà
out=await page.evaluate(({line,dnId})=>{const T=window.TRACE;const d=T.net.dhData;d.ends[line+':'+dnId]={state:'non',by:'test',at:new Date().toISOString()};T.renderAll();
  const el=document.querySelector('#bouclage');const dim=el.querySelectorAll('#dh-rows tr.dim').length;return {dim,warn:/coup|grisé/i.test(el.textContent)||dim>0};},{line:piq.line,dnId:piq.dnId});
console.log('vidange non bouclée → coupure fil étamé (lignes grisées):',JSON.stringify(out));
// retirer la coupure pour la suite
await page.evaluate(({line,dnId})=>{const T=window.TRACE;delete T.net.dhData.ends[line+':'+dnId];T.renderAll();},{line:piq.line,dnId:piq.dnId});
// 4) bouclage temporaire via la fiche soudure → boucle FERMÉE au pont
out=await page.evaluate(()=>{const T=window.TRACE;const L=Object.values(T.lines).find(l=>!l.parent);const j=L.cond.A.joints[2];
  T.openJoint(L.id,'A',2);return {weld:j.weldId};});
await page.waitForTimeout(400);
await page.click('[data-act=dh-temp]');await page.waitForTimeout(400);
out=await page.evaluate(()=>({temps:Object.keys(window.TRACE.net.dhData.temps),btn:document.querySelector('[data-act=dh-temp]')?.textContent.includes('retirer')}));
console.log('bouclage temporaire posé:',JSON.stringify(out));
await page.evaluate(()=>{document.querySelector('[data-act=close]')?.click();});
await page.click('#tabbar [data-tab=bouclage]');await page.waitForTimeout(500);
out=await page.evaluate(()=>{const el=document.querySelector('#bouclage');return {ferme:/FERMÉE par le/.test(el.textContent)&&/bouclage temporaire/.test(el.textContent),chip:!!el.querySelector('[data-rmtemp]'),icone:/⟲/.test(el.querySelector('#dh-rows').textContent)};});
console.log('boucle fermée au pont ⟲:',JSON.stringify(out));
// 5) mesure : choisir un point, comparer avec tolérance, isolement bas → localisation → voir sur le plan (trajet+cote+zone)
await page.evaluate(()=>{const tr=document.querySelector('#dh-rows tr[data-line]');tr.click();});await page.waitForTimeout(400);
out=await page.evaluate(()=>{document.querySelector('#dh-meas').value='2.0';document.querySelector('#dh-iso2').value='0.02';document.querySelector('#dh-locval').value='30';document.querySelector('#dh-check').click();return true;});
await page.waitForTimeout(500);
out=await page.evaluate(()=>{const el=document.querySelector('#bouclage');return {verdict:/Écart/.test(el.textContent),iso:/humidité probable/.test(el.textContent),loc:/Défaut estimé à/.test(el.textContent),lien:!!document.querySelector('#dh-locshow'),save:!!document.querySelector('#dh-save-mesure')};});
console.log('mesure (verdict + iso + localisation):',JSON.stringify(out));
// enregistrer la mesure
await page.click('#dh-save-mesure');await page.waitForTimeout(400);
out=await page.evaluate(()=>({n:window.TRACE.net.dhData.mesures.length,hist:/Dernières mesures/.test(document.querySelector('#bouclage').textContent)}));
console.log('mesure enregistrée + historique:',JSON.stringify(out));
// voir le défaut sur le plan
await page.click('#dh-locshow');await page.waitForTimeout(600);
out=await page.evaluate(()=>{const g=document.querySelector('#dhG');return {tab:window.TRACE.state.tab,trajet:g.querySelectorAll('path').length>0,cote:/m ►/.test(g.textContent),zone:/défaut ≈/.test(g.textContent),anim:g.innerHTML.includes('animate')};});
console.log('défaut sur plan (trajet + cote + zone):',JSON.stringify(out));
// 6) état DH fiche pièce : ouvrir le bouchon de fin de ligne → boutons non/coiffe/sortie
out=await page.evaluate(()=>{const T=window.TRACE;const L=Object.values(T.lines).find(l=>!l.parent);const els=L.cond.A.els;const iE=els.findIndex(e=>e.kind==='endcap');if(iE<0)return {skip:'pas d\'endcap'};T.openEl(L.id,'A',iE);return {iE};});
await page.waitForTimeout(400);
out=await page.evaluate(()=>({btns:document.querySelectorAll('[data-dhend]').length,titre:/État DH — Fin de ligne/.test(document.querySelector('#sheet').textContent)}));
console.log('fiche bouchon : état DH (3 boutons):',JSON.stringify(out));
await page.evaluate(()=>{document.querySelector('[data-dhend=coiffe]').click();});await page.waitForTimeout(400);
out=await page.evaluate(()=>{const T=window.TRACE;const keys=Object.keys(T.net.dhData.ends);return {ends:keys.length,coiffe:Object.values(T.net.dhData.ends).some(x=>x.state==='coiffe')};});
console.log('bout déclaré bouclé coiffe:',JSON.stringify(out));
console.log(logs.length?logs:'[]');await browser.close();
