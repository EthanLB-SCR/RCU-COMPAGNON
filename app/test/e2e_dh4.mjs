// DH v4 (retours Ethan 25/08) : étape 2 du manchon = schéma des fils + boucle + isolement comparés ;
// l'attendu au testeur est FIGÉ avec le bouclage de l'instant t et rejouable sur le plan ; transfert de soudure retrouvable.
import { chromium } from 'playwright';
const BASE=process.env.BASE||'http://localhost:8765';
const browser=await chromium.launch({headless:true, executablePath: process.env.CHROMIUM_PATH||undefined});
const ctx=await browser.newContext({viewport:{width:900,height:940}});const page=await ctx.newPage();
const logs=[];page.on('pageerror',e=>logs.push('PAGEERROR: '+e.message.slice(0,300)));page.on('console',m=>{if(m.type()==='error'&&!/supabase|Failed to fetch|net::ERR|404/i.test(m.text()))logs.push(m.text().slice(0,200));});
await page.goto(BASE+'/traceur.html');await page.waitForTimeout(600);
await page.evaluate(()=>{localStorage.clear();});await page.reload();await page.waitForTimeout(600);
await page.evaluate(()=>{const S=window.MAQ.state;S.supplier='AXIOM';S.lines=[{id:'L1',name:'Feeder',dn:100,bar:12,pts:[[10,50],[110,50]],specials:[],parent:null}];S.seq=2;window.MAQ.setMode('select');window.MAQ.rebuild();});
await page.click('#bSave');await page.waitForTimeout(200);await page.fill('#svName','DH4 test');await page.click('#svOk');await page.waitForTimeout(800);
await page.click('#svGo');await page.waitForTimeout(1500);await page.selectOption('#roleSel','ethan');await page.waitForTimeout(300);
// tout raccorder jusqu'au pont, pont ⟲ posé à joints[5]
const ids=await page.evaluate(()=>{const T=window.TRACE;const L=Object.values(T.lines).find(l=>!l.parent);const J=L.cond.A.joints;
  J.slice(0,5).forEach(j=>{j.status='soudee';j.wire='raccorde';j.conn={E:'E',N:'N'};}); // soudées, fils continus : l'étape 2 reste À FAIRE sur la cible (le modèle unique coche l'étape 1 tout seul)
  const d=T.net.dhData||(T.net.dhData={ends:{},temps:{},mesures:[]});d.temps[J[5].weldId]={by:'test',at:new Date().toISOString()};
  T.renderAll();return {line:L.id,w2:J[2].weldId,w5:J[5].weldId,idx2:J[2].idx};});
console.log('réseau prêt (pont ⟲ à '+ids.w5+'):',JSON.stringify(ids));
// 1) fiche du manchon joints[2] : étape 2 porte le SCHÉMA des fils + boucle + isolement
await page.evaluate(({line,idx2})=>{const T=window.TRACE;const L=T.lines[line];const i=L.cond.A.joints.findIndex(j=>j.idx===idx2);T.openJoint(line,'A',i);},ids);
await page.waitForTimeout(500);
let out=await page.evaluate(()=>{const st2=[...document.querySelectorAll('#sheet .dstep')][1];
  return {schema:st2.querySelectorAll('svg [data-wire]').length>0,selects:st2.querySelectorAll('select[data-conn]').length,boucle:!!st2.querySelector('#st2-meas'),iso:!!st2.querySelector('#st2-iso'),attendu:/Attendu au testeur/.test(st2.textContent),figera:/FIGÉE/.test(st2.textContent)};});
console.log('1) étape 2 : schéma fils + boucle + isolement:',JSON.stringify(out));
const c1=out.schema&&out.selects===2&&out.boucle&&out.iso&&out.attendu&&out.figera;
// 2) le schéma est cliquable : relier l'étamé amont au nu aval = inversion déclarée
const att=await page.evaluate(()=>{const m=document.querySelector('#sheet .dstep:nth-of-type(2)').textContent.match(/([\d,]+) Ω/);return m?parseFloat(m[1].replace(',','.')):null;});
await page.evaluate(()=>{const st2=[...document.querySelectorAll('#sheet .dstep')][1];st2.querySelector('[data-wire="a:E"]').dispatchEvent(new MouseEvent('click',{bubbles:true}));});
await page.waitForTimeout(300);
await page.evaluate(()=>{const st2=[...document.querySelectorAll('#sheet .dstep')][1];st2.querySelector('[data-wire="b:N"]').dispatchEvent(new MouseEvent('click',{bubbles:true}));});
await page.waitForTimeout(300);
out=await page.evaluate(()=>({conn:window.TRACE.state.conn,inv:/Inversion/.test(document.querySelector('#sheet').textContent)}));
console.log('2) schéma cliquable → inversion détectée:',JSON.stringify(out));
const c2=out.conn.E==='N'&&out.inv;
// on remet droit
await page.evaluate(()=>{const st2=[...document.querySelectorAll('#sheet .dstep')][1];st2.querySelector('[data-wire="a:E"]').dispatchEvent(new MouseEvent('click',{bubbles:true}));});
await page.waitForTimeout(250);
await page.evaluate(()=>{const st2=[...document.querySelectorAll('#sheet .dstep')][1];st2.querySelector('[data-wire="b:E"]').dispatchEvent(new MouseEvent('click',{bubbles:true}));});
await page.waitForTimeout(300);
// 3) saisir boucle + isolement → comparaison immédiate, puis valider l'étape → tout est FIGÉ
await page.evaluate(v=>{const s=document.querySelector('#sheet');s.querySelector('#st2-meas').value=String(v);s.querySelector('#st2-iso').value='350';
  s.querySelector('#st2-masse').checked=true;s.querySelector('#st2-cont').checked=true;
  s.querySelector('#st2-meas').dispatchEvent(new Event('change',{bubbles:true}));},att);
await page.waitForTimeout(300);
await page.evaluate(()=>document.querySelector('#sheet [data-stepok="2"]').click());await page.waitForTimeout(600);
out=await page.evaluate(({line,idx2})=>{const T=window.TRACE;const L=T.lines[line];const j=L.cond.A.joints.find(x=>x.idx===idx2);const f=j.steps&&j.steps[2]&&j.steps[2].dh;
  return {gele:!!f,dir:f&&f.dir,closure:f&&f.closure,expected:f&&f.expected,meas:f&&f.meas,iso:f&&f.iso,rkm:f&&f.rkm,temps:f&&(f.temps||[]).length,
    wire:j.wire,conn:j.conn,box:/Bouclage au moment du raccordement/.test(document.querySelector('#sheet').textContent),lien:!!document.querySelector('#sheet [data-dhfrz]')};},ids);
console.log('3) étape 2 validée → bouclage FIGÉ:',JSON.stringify(out));
const c3=out.gele&&out.dir&&/pont ⟲/.test(out.closure||'')&&out.expected>0&&out.meas>0&&out.iso===350&&out.temps===1&&out.wire==='raccorde'&&out.box&&out.lien;
// 4) le pont est RETIRÉ plus tard : l'encart figé garde la valeur d'alors (elle reste comparable)
await page.evaluate(({w5})=>{delete window.TRACE.net.dhData.temps[w5];window.TRACE.renderAll();},ids);
await page.waitForTimeout(300);
await page.evaluate(({line,idx2})=>{const T=window.TRACE;const L=T.lines[line];const i=L.cond.A.joints.findIndex(j=>j.idx===idx2);T.openJoint(line,'A',i);},ids);
await page.waitForTimeout(500);
out=await page.evaluate(()=>{const t=document.querySelector('#sheet').textContent;return {box:/Bouclage au moment du raccordement/.test(t),pont:/pont ⟲/.test(t),ohm:/Ω/.test(t)};});
console.log('4) pont retiré → l\'encart figé tient toujours:',JSON.stringify(out));
const c4=out.box&&out.pont&&out.ohm;
// 5) clic sur l'encart → le bouclage d'alors s'affiche sur le plan (trajet + fermeture ⟲ + valeur)
await page.evaluate(()=>document.querySelector('#sheet [data-dhfrz]').click());await page.waitForTimeout(700);
out=await page.evaluate(()=>{const g=document.querySelector('#dhG');return {tab:window.TRACE.state.tab,trajet:g.querySelectorAll('path').length>0,M:/MESURE : /.test(g.textContent),ferm:/⟲/.test(g.textContent),val:/attendu/.test(g.textContent),date:/boucle du /.test(g.textContent)};});
console.log('5) bouclage figé rejoué sur le plan:',JSON.stringify(out));
const c5=out.tab==='plan'&&out.trajet&&out.M&&out.ferm&&out.val&&out.date;
// 6) le transfert « erreur de saisie » est de nouveau proposé, et emporte les sous-étapes
await page.evaluate(({line,idx2})=>{const T=window.TRACE;const L=T.lines[line];const i=L.cond.A.joints.findIndex(j=>j.idx===idx2);T.openJoint(line,'A',i);},ids);
await page.waitForTimeout(400);
out=await page.evaluate(()=>({btn:!!document.querySelector('#sheet [data-act="transfer"]'),txt:/Erreur de saisie/.test(document.querySelector('#sheet').textContent)}));
console.log('6) bouton transfert présent:',JSON.stringify(out));
const c6=out.btn&&out.txt;
const ALL=c1&&c2&&c3&&c4&&c5&&c6;
console.log('RESULTAT:',ALL?'TOUT VERT':'ECHEC '+JSON.stringify({c1,c2,c3,c4,c5,c6}));
console.log(logs.length?logs:'[]');
await browser.close();
process.exit(ALL?0:1);
