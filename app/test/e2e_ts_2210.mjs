// 22/10 (Ethan, sur un vrai chantier : « je ne comprends pas trop écart et toutes les modifs, pourquoi ce n'est pas pareil, genre tés écart −2 et toutes les modifs rien ?
// Plus clair, et par modif un récap de l'avant / après et des modifications de quantités, ml, coudes, pièces, soudures, manchons »).
// Réseau FICTIF du traceur (2 lignes), marché figé puis retouché pour simuler : ligne 1 = 5 ml et 1 té de moins que le marché (té retiré PK 30), ligne 2 = 10 ml et
// 4 soudures de plus. c1 tableau : Marché · Réel · Écart · dont ajouté · dont retiré, écart = ajouté − retiré sur chaque ligne (ml +5 = +10 − 5 ; tés −1 = — − 1 ;
// soudures +4 = +4 − —) · c2 tableau « Ce qui est en plus » : ajouté et « Toutes les modifs » côte à côte + explication (retiré jamais dans les modifs) · c3 carte à
// qualifier : avant → après de la ligne (ouvert) · c4 « Par ligne » : un bloc par ligne avec avant / après et « retiré : té PK 30 (aller) » · c5 qualifiée (TS proposé) :
// « Cette modif compte » + avant → après (fermé) ; tronçon déclaré : « Dans ce tronçon (réel, PK …) » · c6 export : mêmes colonnes + avant / après par ligne ·
// (22/10 après-midi : les pièces des listes portent leur DN — « té DN 100 PK 30 » ; le détail du DN des écarts : e2e_tsdn_2210) · c7 téléphone 390 : pas de débordement de page · c8 console.
import { chromium } from 'playwright';
const BASE=process.env.BASE||'http://localhost:8765';const SHOTS=process.env.SHOTS||null;
const browser=await chromium.launch({headless:true, executablePath: process.env.CHROMIUM_PATH||undefined});
const C={};const logs=[];
async function mk(vp){const ctx=await browser.newContext({viewport:vp,deviceScaleFactor:1});const page=await ctx.newPage();
  page.on('pageerror',e=>logs.push('PAGEERROR: '+e.message.slice(0,300)));page.on('console',m=>{if(m.type()==='error'&&!/supabase|Failed to fetch|net::ERR|404|geopf|WebSocket/i.test(m.text()))logs.push(m.text().slice(0,200));});page.on('dialog',d=>d.accept().catch(()=>{}));
  await page.goto(BASE+'/traceur.html');await page.waitForTimeout(500);await page.evaluate(()=>localStorage.clear());await page.reload();await page.waitForTimeout(500);
  await page.evaluate(()=>{const S=window.MAQ.state;S.lines=[{id:'L1',name:'Rue Fictive',dn:100,bar:12,pts:[[10,50],[50,50],[50,75]],specials:[{id:'v1',type:'valve',m:22}],parent:null},{id:'L2',name:'Allée Fictive',dn:80,bar:12,pts:[[10,100],[60,100]],specials:[],parent:null}];S.seq=3;window.MAQ.setMode('select');window.MAQ.rebuild();});
  await page.click('#bSave');await page.waitForTimeout(200);await page.fill('#svName','Modifs test');await page.click('#svOk');await page.waitForTimeout(800);
  await page.click('#svGo');await page.waitForTimeout(1500);await page.selectOption('#roleSel','ethan');await page.waitForTimeout(300);
  // marché figé puis retouché : L1 avait 5 ml et 1 té (PK 30, aller) de plus ; L2 avait 10 ml et 4 soudures de moins
  await page.evaluate(()=>{const T=window.TRACE;const M=T.ts.ensureMarche(true);const a=M.lines.find(x=>x.id==='L1'),b=M.lines.find(x=>x.id==='L2');
    a.c.ml=+(a.c.ml+5).toFixed(1);a.c.tes=(a.c.tes||0)+1;a.pcs=(a.pcs||[]).concat([{k:'tee',c:'A',m:30}]);b.c.ml=+(b.c.ml-10).toFixed(1);b.c.soud-=4;b.c.manchons-=4;
    M.tot.ml=+(a.c.ml+b.c.ml).toFixed(1);M.tot.tes=(a.c.tes||0)+(b.c.tes||0);M.tot.soud=a.c.soud+b.c.soud;M.tot.manchons=a.c.manchons+b.c.manchons;M.at=new Date(Date.now()+1000).toISOString();
    T.state.tab='ts';T.renderAll();});await page.waitForTimeout(300);return {ctx,page};}
const shot=async(page,n)=>{if(SHOTS)await page.screenshot({path:`${SHOTS}/ts22_${n}.png`,fullPage:false});};
const num=t=>{t=String(t||'').replace(/[\s  ]/g,'').replace('−','-').replace(',','.');if(t==='—'||t==='='||!t)return 0;return parseFloat(t);};

let {ctx,page}=await mk({width:1366,height:900});
// ── c1) tableau principal
let o=await page.evaluate(()=>{const t=document.querySelector('#tsview table.tsMain');if(!t)return null;const th=[...t.querySelectorAll('tr th')].map(x=>x.textContent.trim());
  const rows=Object.fromEntries([...t.querySelectorAll('tr')].slice(1).map(tr=>{const td=[...tr.querySelectorAll('td')].map(x=>x.textContent.trim());return [td[0],td.slice(1)];}));return {th,rows};});
await page.evaluate(()=>document.querySelector('#tsview table.tsMain').scrollIntoView({block:'center'}));await page.waitForTimeout(150);await shot(page,'1_tableau');
console.log('c1) tableau :',JSON.stringify(o));
const R=k=>o&&o.rows[k]?o.rows[k].map(num):null;const ml=R('Linéaire d\'axe (ml)'),tes=R('Tés'),sd=R('Soudures (aller + retour)');
const coh=row=>row&&Math.abs(row[2]-(row[3]+row[4]))<0.051; // écart = ajouté + retiré (retiré négatif)
C.c1=!!o&&o.th.join('|')==='Quantité|Marché|Réel / projeté|Écart|dont ajouté|dont retiré'&&!!ml&&ml[2]===5&&ml[3]===10&&ml[4]===-5&&!!tes&&tes[2]===-1&&tes[3]===0&&tes[4]===-1&&!!sd&&sd[2]===4&&sd[3]===4&&sd[4]===0
  &&Object.keys(o.rows).every(k=>coh(R(k)))&&/Écart = ajouté − retiré/.test(await page.evaluate(()=>document.getElementById('tsview').textContent));
// ── c2) « Ce qui est en plus » : ajouté · Toutes les modifs (le candidat de L2 : +10 ml, +4 soudures) ; explication
o=await page.evaluate(()=>{const t=document.querySelector('#tsview table.tsQ');const th=[...t.querySelectorAll('tr th')].map(x=>x.textContent.trim());const rows=Object.fromEntries([...t.querySelectorAll('tr')].slice(1).map(tr=>{const td=[...tr.querySelectorAll('td')].map(x=>x.textContent.trim());return [td[0],td.slice(1)];}));
  return {th,rows,hint:document.getElementById('tsview').textContent.replace(/[\s  ]+/g,' ')};});
console.log('c2) en plus :',JSON.stringify({th:o.th,rows:o.rows}));
/* 23/10 : les retraits comptent aussi (−) : Modifications | Ajouté | Retiré | filtre (net) ; ml +10 / −5 → net +5 ; tés — / −1 → −1 */
C.c2=o.th.join('|')==='Modifications|Ajouté|Retiré|Toutes les modifs'&&num((o.rows['Linéaire d\'axe (ml)']||[])[0])===10&&num((o.rows['Linéaire d\'axe (ml)']||[])[1])===-5&&num((o.rows['Linéaire d\'axe (ml)']||[])[2])===5&&num((o.rows['Soudures (aller + retour)']||[])[2])===4&&num((o.rows['Tés']||[])[1])===-1&&num((o.rows['Tés']||[])[2])===-1
  &&/ajouté/.test(o.hint)&&/un groupe compte son net/.test(o.hint);
// ── c3) carte « à qualifier » de L2 : avant → après (ouvert)
o=await page.evaluate(()=>{const c=[...document.querySelectorAll('#tsview .tsCard.cand')].find(x=>/Allée Fictive/.test(x.textContent));if(!c)return null;const d=c.querySelector('details.tsAAd');const rows=d?[...d.querySelectorAll('table tr')].slice(1).map(tr=>[...tr.querySelectorAll('td')].map(x=>x.textContent.trim())):[];return {open:!!d&&d.open,sum:d?d.querySelector('summary').textContent.replace(/\s+/g,' '):'',rows};});
console.log('c3) carte à qualifier :',JSON.stringify(o));
const rowOf=(rows,lab)=>(rows||[]).find(r=>r[0]===lab);
C.c3=!!o&&o.open&&/Avant → après de la ligne : \+10 ml · \+4 soudures/.test(o.sum)&&!!rowOf(o.rows,'Linéaire d\'axe (ml)')&&num(rowOf(o.rows,'Linéaire d\'axe (ml)')[3])===10&&num(rowOf(o.rows,'Soudures (aller + retour)')[3])===4;
// ── c4) « Par ligne » : un bloc par ligne modifiée, avant / après, « retiré : té PK 30 (aller) »
o=await page.evaluate(()=>{const d=document.querySelector('#tsview details.tsLines');if(!d)return null;d.open=true;const L=[...d.querySelectorAll('.tsLn')].map(x=>({t:x.querySelector('b').textContent,sum:x.querySelector('summary').textContent.replace(/\s+/g,' '),rows:[...x.querySelectorAll('table tr')].slice(1).map(tr=>[...tr.querySelectorAll('td')].map(y=>y.textContent.trim())),pcs:[...x.querySelectorAll('.tsPcs')].map(y=>y.textContent.replace(/\s+/g,' '))}));return {sum:d.querySelector('summary').textContent,L};});
await page.evaluate(()=>{const d=document.querySelector('#tsview details.tsLines');if(d)d.scrollIntoView({block:'start'});});await page.waitForTimeout(150);await shot(page,'4_par_ligne');
console.log('c4) par ligne :',JSON.stringify(o));
const l1=o&&o.L.find(x=>x.t==='Rue Fictive'),l2=o&&o.L.find(x=>x.t==='Allée Fictive');
C.c4=!!o&&/Par ligne \(2 lignes modifiées\) — avant → après/.test(o.sum)&&!!l1&&!!l2&&num(rowOf(l1.rows,'Tés')[3])===-1&&num(rowOf(l1.rows,'Linéaire d\'axe (ml)')[3])===-5&&l1.pcs.some(p=>/retiré : té DN 100 PK 30 \(aller\)/.test(p))&&num(rowOf(l2.rows,'Linéaire d\'axe (ml)')[3])===10;
// ── c5) qualifier le candidat de L2 (TS proposé) → « Cette modif compte » + avant → après (fermé) ; tronçon déclaré sur L1 → « Dans ce tronçon »
o=await page.evaluate(()=>{const T=window.TRACE;const c=T.ts.candidates().find(x=>x.line==='L2');T.ts.markCandidate(c,'propose','DEV-F1');T.ts.markRange('L1',5,20,{etat:'forfait'});T.renderAll();
  const cards=[...document.querySelectorAll('#tsview .tsCard:not(.cand)')];const a=cards.find(x=>/Allée Fictive/.test(x.textContent)),b=cards.find(x=>/tronçon PK 5/.test(x.textContent));
  return {a:a?{txt:a.textContent.replace(/[\s  ]+/g,' '),open:a.querySelector('details.tsAAd').open}:null,b:b?b.textContent.replace(/[\s  ]+/g,' '):null};});
await shot(page,'5_qualifiees');console.log('c5) qualifiées :',JSON.stringify({a:o.a&&{open:o.a.open,cpt:(o.a.txt.match(/Cette modif compte : [^·]*·[^·]*/)||[''])[0]},b:o.b&&(o.b.match(/Dans ce tronçon[^.]*/)||[''])[0]}));
C.c5=!!o.a&&/Cette modif compte : \+10 ml · \+4 soudures/.test(o.a.txt)&&!o.a.open&&/Avant → après de la ligne/.test(o.a.txt)&&!!o.b&&/Dans ce tronçon \(réel, PK 5 → 20\) : 15 ml · \d+ soudures/.test(o.b);
// ── c6) export : mêmes colonnes + avant / après par ligne
o=await page.evaluate(()=>{const h=window.TRACE.ts.export?null:null;const T=window.TRACE;const html=T.doe&&T.doe.tsHTML?T.doe.tsHTML():'';return {n:html.length,cols:/dont ajouté/.test(html)&&/dont retiré/.test(html),ex:/Écart = ajouté − retiré/.test(html),par:/Par ligne — avant \(marché\) → après \(réel\)/.test(html),te:/retiré<\/b> : té DN 100 PK 30 \(aller\)/.test(html)};});
console.log('c6) export :',JSON.stringify(o));C.c6=o.n>1000&&o.cols&&o.ex&&o.par&&o.te;
await ctx.close();
// ── c7) téléphone 390 : l'onglet tient (tableaux défilants dans leur cadre, pas la page)
({ctx,page}=await mk({width:390,height:844}));
o=await page.evaluate(()=>{const d=document.querySelector('#tsview details.tsLines');if(d)d.open=true;return {sw:document.documentElement.scrollWidth,w:window.innerWidth,tv:document.getElementById('tsview').scrollWidth<=document.getElementById('tsview').clientWidth+1};});
await page.evaluate(()=>document.querySelector('#tsview table.tsMain').scrollIntoView({block:'center'}));await page.waitForTimeout(150);await shot(page,'7_tel');
console.log('c7) téléphone :',JSON.stringify(o));C.c7=o.sw<=o.w+1&&o.tv;
await ctx.close();
console.log('erreurs console :',JSON.stringify(logs));C.c8=logs.length===0;
const ko=Object.entries(C).filter(([k,v])=>!v).map(([k])=>k);console.log(JSON.stringify(C));console.log(ko.length?'RESULTAT: KO '+ko.join(','):'RESULTAT: TOUT VERT');
await browser.close();
