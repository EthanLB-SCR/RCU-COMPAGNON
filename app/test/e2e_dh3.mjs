// DH v3 — scénario d'Ethan (20/08) : deux ponts temporaires autour d'un tronçon, mesure au milieu
// → DEUX boucles distinctes (amont / aval), chacune fermée à SON pont, valeurs attendues différentes ;
// + manchon en 4 sous-étapes (maquette validée) : attendu au testeur, validation d'étapes, anneau de progression sur la pastille.
import { chromium } from 'playwright';
const BASE=process.env.BASE||'http://localhost:8765';
const browser=await chromium.launch({headless:true, executablePath: process.env.CHROMIUM_PATH||undefined});
const ctx=await browser.newContext({viewport:{width:900,height:940}});const page=await ctx.newPage();
const logs=[];page.on('pageerror',e=>logs.push('PAGEERROR: '+e.message.slice(0,300)));page.on('console',m=>{if(m.type()==='error'&&!/supabase|Failed to fetch|net::ERR|404/i.test(m.text()))logs.push(m.text().slice(0,200));});
// réseau : une ligne droite de 100 m (barres 12 m), AXIOM
await page.goto(BASE+'/traceur.html');await page.waitForTimeout(600);
await page.evaluate(()=>{localStorage.clear();});await page.reload();await page.waitForTimeout(600);
await page.evaluate(()=>{const S=window.MAQ.state;S.supplier='AXIOM';S.lines=[{id:'L1',name:'Feeder',dn:100,bar:12,pts:[[10,50],[110,50]],specials:[],parent:null}];S.seq=2;window.MAQ.setMode('select');window.MAQ.rebuild();});
await page.click('#bSave');await page.waitForTimeout(200);await page.fill('#svName','DH3 test');await page.click('#svOk');await page.waitForTimeout(800);
await page.click('#svGo');await page.waitForTimeout(1500);await page.selectOption('#roleSel','ethan');await page.waitForTimeout(300);
// ponts ⟲ à joints[1] et joints[5] ; raccorder SEULEMENT joints[3] et joints[4] (le tronçon entre point et pont aval) ;
// point de mesure joints[2] — NON raccordé (comme S-0372 chez Ethan)
const ids=await page.evaluate(()=>{const T=window.TRACE;const L=Object.values(T.lines).find(l=>!l.parent);const J=L.cond.A.joints;
  [3,4].forEach(i=>{J[i].status='manchonnee';J[i].wire='raccorde';J[i].conn={E:'E',N:'N'};});
  const d=T.net.dhData||(T.net.dhData={ends:{},temps:{},mesures:[]});
  d.temps[J[1].weldId]={by:'test',at:new Date().toISOString()};d.temps[J[5].weldId]={by:'test',at:new Date().toISOString()};
  T.renderAll();return {line:L.id,w1:J[1].weldId,w2:J[2].weldId,w5:J[5].weldId,idx2:J[2].idx,pk:L.cond.A.els[J[2].idx].m1};});
console.log('réseau prêt:',JSON.stringify(ids));
await page.click('#tabbar [data-tab=bouclage]');await page.waitForTimeout(600);
// 1) choisir le point de mesure joints[2] → deux directions FERMÉES, deux R différents
await page.evaluate(({line,idx2})=>{const tr=document.querySelector(`#dh-rows tr[data-line="${line}"][data-idx="${idx2}"]`);tr.click();},{line:ids.line,idx2:ids.idx2});
await page.waitForTimeout(500);
let out=await page.evaluate(()=>{const cards=[...document.querySelectorAll('#dh-mesure .dhdir')].map(c=>c.textContent.replace(/\s+/g,' ').trim());
  const Rs=cards.map(c=>{const m=c.match(/([\d,]+) Ω attendu/);return m?m[1]:null;});
  return {amont:cards[0],aval:cards[1],deuxFermees:cards.length===2&&cards.every(c=>/fermée au pont ⟲/.test(c)),Rdiff:Rs[0]&&Rs[1]&&Rs[0]!==Rs[1],Rs,calc:!!document.querySelector('#dh-mesure details')};});
console.log('1) deux cartes fermées, R différents + calcul dépliable:',JSON.stringify(out));
const c1=out.deuxFermees&&out.Rdiff&&out.calc;
// 2) verdict sur la boucle CHOISIE : amont présélectionnée ; puis clic carte aval → verdict aval
const Rvals=out.Rs.map(r=>parseFloat(r.replace(',','.')));
await page.fill('#dh-meas',String(Rvals[0]));await page.click('#dh-check');await page.waitForTimeout(400);
out=await page.evaluate(()=>{const b=document.querySelector('#dh-mesure .okbox, #dh-mesure .warnbox');return b?b.textContent.replace(/\s+/g,' ').slice(0,160):null;});
console.log('2a) mesure = R amont (carte amont choisie):',JSON.stringify(out));
const c2a=/Correspond à la boucle amont/.test(out||'');
await page.click('#dh-mesure .dhdir[data-dhdir="down"]');await page.waitForTimeout(400);
await page.fill('#dh-meas',String(Rvals[1]));await page.click('#dh-check');await page.waitForTimeout(400);
out=await page.evaluate(()=>{const b=document.querySelector('#dh-mesure .okbox, #dh-mesure .warnbox');return b?b.textContent.replace(/\s+/g,' ').slice(0,160):null;});
console.log('2b) carte aval cliquée, mesure = R aval:',JSON.stringify(out));
const c2b=/Correspond à la boucle aval/.test(out||'');
// 2c) enregistrer la mesure → gardée AVEC le bouclage de l'instant t (direction, fermeture, longueurs, attendu, ponts posés)
await page.click('#dh-save-mesure');await page.waitForTimeout(400);
out=await page.evaluate(()=>{const m=window.TRACE.net.dhData.mesures[0];const hist=document.querySelector('#bouclage').textContent;
  return {dir:m.dir,closure:m.closure,expected:m.expected,dE:m.dE,okLoop:m.okLoop,temps:(m.temps||[]).length,histCtx:/Bouclage à l'instant t/.test(hist)&&/aval · pont ⟲/.test(hist)};});
console.log('2c) mesure gardée avec le bouclage du moment:',JSON.stringify(out));
const c2c=out.dir==='aval'&&/pont ⟲/.test(out.closure||'')&&out.expected>0&&out.okLoop===true&&out.temps===2&&out.histCtx;
// 3) retirer le pont amont → amont OUVERTE (fils non raccordés), aval toujours fermée
await page.evaluate(({w1})=>{delete window.TRACE.net.dhData.temps[w1];window.TRACE.renderAll();},{w1:ids.w1});
await page.waitForTimeout(400);
await page.evaluate(({line,idx2})=>{document.querySelector(`#dh-rows tr[data-line="${line}"][data-idx="${idx2}"]`).click();},{line:ids.line,idx2:ids.idx2});
await page.waitForTimeout(400);
out=await page.evaluate(()=>{const cards=[...document.querySelectorAll('#dh-mesure .dhdir')].map(c=>c.textContent.replace(/\s+/g,' ').trim());return {amont:cards[0].slice(0,80),avalFermee:/fermée au pont ⟲/.test(cards[1]),amontOff:!!document.querySelector('#dh-mesure .dhdir.off')};});
console.log('3) pont amont retiré → carte amont ouverte, aval fermée:',JSON.stringify(out));
const c3=/ouverte/.test(out.amont)&&out.avalFermee&&out.amontOff;
// remettre le pont pour la fiche
await page.evaluate(({w1})=>{window.TRACE.net.dhData.temps[w1]={by:'test',at:new Date().toISOString()};window.TRACE.renderAll();},{w1:ids.w1});
await page.waitForTimeout(300);
// 3b) réflectomètre branché AU MANCHON CHOISI : 5 m vers l'aval sur l'étamé → localisé + mention « depuis S-xxxx »
await page.evaluate(()=>{document.querySelector('#loc-d').value='5';});
await page.click('#loc-go');await page.waitForTimeout(400);
out=await page.evaluate(()=>{const el=document.querySelector('#bouclage');const ok=[...el.querySelectorAll('.okbox')].map(b=>b.textContent.replace(/\s+/g,' ')).find(t=>/depuis S-/.test(t));
  return {fromSel:!!document.querySelector('#loc-from'),dirSel:!!document.querySelector('#loc-dir'),res:ok?ok.slice(0,150):null};});
console.log('3b) localisation depuis le manchon choisi:',JSON.stringify(out));
const c3b=out.fromSel&&out.dirSel&&!!out.res;
// 3c) « Voir sur le plan » : le trajet part DU MANCHON (badge M + n°), cote = distance de fil depuis le branchement
await page.click('#loc-show');await page.waitForTimeout(600);
out=await page.evaluate(({line,idx2})=>{const g=document.querySelector('#dhG');const T=window.TRACE;
  const cM=g.querySelector('circle[fill="#1c6fd6"]');const to=T.lines[line].cond.A.els[idx2].to; // le badge M doit être SUR le manchon de la conduite mesurée, pas sur l'axe central
  const dM=cM?Math.hypot(+cM.getAttribute('cx')-to.x,+cM.getAttribute('cy')-to.y):99;
  return {tab:T.state.tab,M:/MESURE : S-0003/.test(g.textContent),cote:/5 m ►/.test(g.textContent),lab:/défaut ≈ 5 m/.test(g.textContent),trajet:g.querySelectorAll('path').length>0,dM:+dM.toFixed(2)};},{line:ids.line,idx2:ids.idx2});
console.log('3c) trajet depuis le manchon, badge M SUR la conduite:',JSON.stringify(out));
const c3c=out.M&&out.cote&&out.lab&&out.trajet&&out.dM<0.5;
// 4) fiche soudure joints[2] : 4 sous-étapes + attendu au testeur (les 2 boucles)
await page.click('#tabbar [data-tab=plan]');await page.waitForTimeout(300);
await page.evaluate(({line,idx2})=>{const T=window.TRACE;const L=T.lines[line];const i=L.cond.A.joints.findIndex(j=>j.idx===idx2);T.openJoint(line,'A',i);},{line:ids.line,idx2:ids.idx2});
await page.waitForTimeout(500);
out=await page.evaluate(()=>{const sh=document.querySelector('#sheet');return {steps:sh.querySelectorAll('.dstep').length,attendu:/Attendu au testeur ici/.test(sh.textContent),deuxVals:(sh.textContent.match(/Ω \((amont|aval)/g)||[]).length,btn1:!!sh.querySelector('[data-stepok="1"]')};});
console.log('4) fiche : 4 étapes + attendu (2 boucles):',JSON.stringify(out));
const c4=out.steps===4&&out.attendu&&out.deuxVals===2&&out.btn1;
// 5) valider l'étape 1 (avec contrôle visuel), puis l'étape 2 avec la mesure → done, anneau ½ sur la pastille
// (modèle unique : la photo du cordon est obligatoire à l'étape 1 — on la seed comme sur le terrain)
const PNG='data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg==';
await page.evaluate(({line,idx2,PNG})=>{const T=window.TRACE;const j=T.lines[line].cond.A.joints.find(x=>x.idx===idx2);j.steps=j.steps||{};j.steps[1]={...(j.steps[1]||{}),photos:[PNG]};const i=T.lines[line].cond.A.joints.findIndex(x=>x.idx===idx2);T.openJoint(line,'A',i);},{line:ids.line,idx2:ids.idx2,PNG});
await page.waitForTimeout(400);
await page.evaluate(()=>{document.querySelector('#st1-vis').checked=true;});
await page.click('[data-stepok="1"]');await page.waitForTimeout(500);
await page.evaluate(v=>{const m=document.querySelector('#st2-meas');m.value=String(v);document.querySelector('#st2-masse').checked=true;document.querySelector('#st2-cont').checked=true;},Rvals[0]);
await page.click('[data-stepok="2"]');await page.waitForTimeout(500);
out=await page.evaluate(({line,idx2})=>{const T=window.TRACE;const L=T.lines[line];const j=L.cond.A.joints.find(x=>x.idx===idx2);
  const px=L.cond.A.els[idx2].m1;const v=T.state.view;v.k=20;v.tx=450-px*20;v.ty=470-50*20;T.renderPlan(); // zoom détail sur la soudure (l'anneau n'existe qu'avec les pastilles)
  const ring=[...document.querySelectorAll('circle[data-ring]')].map(c2=>c2.dataset.ring);
  return {s1:!!(j.steps&&j.steps[1]&&j.steps[1].done&&j.steps[1].visuel),s2:!!(j.steps&&j.steps[2]&&j.steps[2].done&&j.steps[2].masse),meas:j.steps&&j.steps[2]&&j.steps[2].meas,compteur:/2\/4/.test(document.querySelector('#sheet').textContent),ring};},{line:ids.line,idx2:ids.idx2});
console.log('5) étapes 1+2 validées, anneau 2/4:',JSON.stringify(out));
const c5=out.s1&&out.s2&&out.compteur&&out.ring.includes('2');
// 6) annulation d'étape (chef) : étape 2 annulée → 1/4
await page.click('[data-stepundo="2"]').catch(()=>{});
page.on('dialog',d=>d.accept());
out=await page.evaluate(()=>({undo:!!document.querySelector('[data-stepundo="2"]')}));
console.log('6) bouton annuler présent:',JSON.stringify(out));
const ALL=c1&&c2a&&c2b&&c2c&&c3&&c3b&&c3c&&c4&&c5;
console.log('RESULTAT:',ALL?'TOUT VERT':'ECHEC '+JSON.stringify({c1,c2a,c2b,c2c,c3,c3b,c3c,c4,c5}));
console.log(logs.length?logs:'[]');
await browser.close();
process.exit(ALL?0:1);
