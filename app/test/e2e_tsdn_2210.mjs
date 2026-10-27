// 22/10 (Ethan, onglet Modifs : « c'est mieux pour les TS, la liste des trucs ; juste ajoute le DN des écarts concernés » + « fais gaffe, la légende est en plein milieu »).
// Réseau FICTIF du traceur : ligne A en DN 150 réduite en DN 100 à PK 60 (coude à PK 90, vanne à PK 120 dans le DN 100), ligne B en DN 80. Marché figé puis retouché :
// ligne A = un coude de plus au marché à PK 30 (DN 150 → retiré), pas de vanne au marché (→ 2 vannes ajoutées, DN 100), 2 soudures de moins au marché + 1 soudure
// ajoutée sur place dans le DN 150, 5 ml de plus au marché avec la fin du tracé déviée (DN 100) ; ligne B = 2 soudures de moins au marché (DN 80).
// c1 tableau principal : le DN sous chaque écart (coudes DN 150 · vannes DN 100 · ml DN 100 · soudures « DN 150 : +1 · DN 100 : +2 · DN 80 : +2 ») — 27/10 soir : plus de « DN a ou b », répartition par les profils
// c2 « Par ligne » : DN de la ligne à côté de son nom, DN sous les écarts, « retiré : coude DN 150 PK 30 (aller) », « ajouté : vanne DN 100 PK … (aller) »
// c3 carte à qualifier : « Ligne Fictive A DN 150 / 100 » · c4 qualifiées : « Cette modif compte : +2 soudures · DN 80 » ; tronçon PK 50 → 80 : « · DN 150 / 100 »
// c5 export : DN sous les écarts et dans les listes · c6 lyres / baïonnettes : shapesAt compte exactement comme countShapes (mêmes règles) · c7 légende du plan
// d'ensemble SOUS le plan (plus en position absolue au milieu de l'écran) · c8 téléphone 390 : pas de débordement de page, chaque « DN … » sur une seule ligne (jamais « DN / 80 ») · c9 console.
import { chromium } from 'playwright';
const BASE=process.env.BASE||'http://localhost:8765';const SHOTS=process.env.SHOTS||null;
const browser=await chromium.launch({headless:true, executablePath: process.env.CHROMIUM_PATH||undefined});
const C={};const logs=[];
async function mk(vp){const ctx=await browser.newContext({viewport:vp,deviceScaleFactor:1});const page=await ctx.newPage();
  page.on('pageerror',e=>logs.push('PAGEERROR: '+e.message.slice(0,300)));page.on('console',m=>{if(m.type()==='error'&&!/supabase|Failed to fetch|net::ERR|404|geopf|WebSocket/i.test(m.text()))logs.push(m.text().slice(0,200));});page.on('dialog',d=>d.accept().catch(()=>{}));
  await page.goto(BASE+'/traceur.html');await page.waitForTimeout(500);await page.evaluate(()=>localStorage.clear());await page.reload();await page.waitForTimeout(500);
  await page.evaluate(()=>{const S=window.MAQ.state;S.lines=[{id:'L1',name:'Ligne Fictive A',dn:150,bar:12,pts:[[0,0],[90,0],[90,60]],specials:[{id:'R1',m:60,type:'reducer',dn2:100},{id:'V1',type:'valve',m:120}],parent:null},{id:'L2',name:'Ligne Fictive B',dn:80,bar:12,pts:[[0,100],[50,100]],specials:[],parent:null}];S.seq=3;window.MAQ.setMode('select');window.MAQ.rebuild();});
  await page.click('#bSave');await page.waitForTimeout(200);await page.fill('#svName','DN des écarts');await page.click('#svOk');await page.waitForTimeout(800);
  await page.click('#svGo');await page.waitForTimeout(1500);await page.selectOption('#roleSel','ethan');await page.waitForTimeout(300);
  const info=await page.evaluate(()=>{const T=window.TRACE;const L1=T.lines['L1'];const cd=L1.cond.A;
    const j=cd.joints.find(x=>{const e=cd.els[x.idx];return e&&e.m1>5&&e.m1<50;});if(j)j.extra=true; // une soudure ajoutée sur place dans le DN 150
    const M=T.ts.ensureMarche(true);const a=M.lines.find(x=>x.id==='L1'),b=M.lines.find(x=>x.id==='L2');
    a.c.coudes+=1;a.pcs.push({k:'bend',c:'A',m:30});const nV=a.pcs.filter(p=>p.k==='valve').length;a.pcs=a.pcs.filter(p=>p.k!=='valve');a.c.vannes-=nV;
    a.c.soud-=2;a.c.manchons-=2;a.c.ml=+(a.c.ml+5).toFixed(1);const last=a.axis[a.axis.length-1];a.axis[a.axis.length-1]=[last[0]+3,last[1]];
    if(a.dnp&&a.dnp.length)a.dnp[a.dnp.length-1].m1=+(a.dnp[a.dnp.length-1].m1+5).toFixed(2);if(a.wk){['A','R'].forEach(c=>{const i=(a.wk[c]||[]).findIndex(w=>w[0]>70);if(i>=0)a.wk[c].splice(i,1);});} /* 27/10 soir : marché synthétique cohérent — les 5 ml de plus et les 2 soudures de moins sont dans le DN 100 (profil dnp, mémoire des soudures wk) */
    b.c.soud-=2;b.c.manchons-=2;['ml','coudes','vannes','soud','manchons'].forEach(k=>{M.tot[k]=+M.lines.reduce((s,x)=>s+(+x.c[k]||0),0).toFixed(1);});M.at=new Date(Date.now()+1000).toISOString();
    T.state.tab='ts';T.renderAll();return {extra:!!j,nV,dns:T.ts.lineDns('L1'),red:(()=>{const e=cd.els.find(x=>x.kind==='reducer');return e?{dn:e.dn,dn2:e.dn2}:null;})()};});
  await page.waitForTimeout(300);return {ctx,page,info};}
const shot=async(page,n)=>{if(SHOTS)await page.screenshot({path:`${SHOTS}/tsdn_${n}.png`,fullPage:false});};
const sp=t=>String(t||'').replace(/[\s  ]+/g,' ').trim();

let {ctx,page,info}=await mk({width:1366,height:900});console.log('réseau :',JSON.stringify(info));
// ── c1) tableau principal : le DN sous chaque écart
let o=await page.evaluate(()=>{const t=document.querySelector('#tsview table.tsMain');if(!t)return null;return Object.fromEntries([...t.querySelectorAll('tr')].slice(1).map(tr=>{const td=[...tr.querySelectorAll('td')];const dn=td[3]&&td[3].querySelector('.tsDn');return [td[0].textContent.trim(),{ec:td[3]?td[3].firstChild.textContent.trim():'',dn:dn?dn.textContent.replace(/[\s  ]+/g,' ').trim():''}];}));});
await page.evaluate(()=>document.querySelector('#tsview table.tsMain').scrollIntoView({block:'center'}));await page.waitForTimeout(150);await shot(page,'1_tableau');
console.log('c1) tableau :',JSON.stringify(o));
const g=k=>(o&&o[k])||{};
C.c1=!!o&&info.extra&&info.nV===2&&info.dns.join('/')==='150/100'&&g('Coudes').ec==='−1'&&g('Coudes').dn==='DN 150'&&g('Vannes').ec==='+2'&&g('Vannes').dn==='DN 100'
  &&g('Linéaire d\'axe (ml)').ec==='−5'&&g('Linéaire d\'axe (ml)').dn==='DN 100'&&g('Soudures (aller + retour)').ec==='+5'&&g('Soudures (aller + retour)').dn==='DN 150 : +1 · DN 100 : +2 · DN 80 : +2'
  &&g('Manchons posés (hors extrusions)').dn==='DN 150 : +1 · DN 100 : +2 · DN 80 : +2'&&!g('Tés').dn;
// ── c2) « Par ligne »
o=await page.evaluate(()=>{const d=document.querySelector('#tsview details.tsLines');if(!d)return null;d.open=true;return [...d.querySelectorAll('.tsLn')].map(x=>({t:x.querySelector('b').textContent,dnT:(x.querySelector('.tsDnT')||{}).textContent||'',
  rows:Object.fromEntries([...x.querySelectorAll('table tr')].slice(1).map(tr=>{const td=[...tr.querySelectorAll('td')];const dn=td[3]&&td[3].querySelector('.tsDn');return [td[0].textContent.trim(),dn?dn.textContent.replace(/[\s  ]+/g,' ').trim():''];})),pcs:[...x.querySelectorAll('.tsPcs')].map(y=>y.textContent.replace(/[\s  ]+/g,' '))}));});
await page.evaluate(()=>{const d=document.querySelector('#tsview details.tsLines');if(d)d.scrollIntoView({block:'start'});});await page.waitForTimeout(150);await shot(page,'2_par_ligne');
console.log('c2) par ligne :',JSON.stringify(o));
const A=o&&o.find(x=>x.t==='Ligne Fictive A'),B=o&&o.find(x=>x.t==='Ligne Fictive B');
C.c2=!!A&&!!B&&A.dnT==='DN 150 / 100'&&B.dnT==='DN 80'&&A.rows['Coudes']==='DN 150'&&A.rows['Vannes']==='DN 100'&&A.rows['Linéaire d\'axe (ml)']==='DN 100'&&A.rows['Soudures (aller + retour)']==='DN 150 : +1 · DN 100 : +2'
  &&A.pcs.some(p=>/retiré : coude DN 150 PK 30 \(aller\)/.test(p))&&A.pcs.some(p=>/ajouté : vanne DN 100 PK \d+ \(aller\), vanne DN 100 PK \d+ \(retour\)/.test(p))&&B.rows['Soudures (aller + retour)']==='DN 80';
// ── c3) carte à qualifier de la ligne A : DN à côté du nom
o=await page.evaluate(()=>{const c=[...document.querySelectorAll('#tsview .tsCard.cand')].find(x=>/Ligne Fictive A/.test(x.textContent));return c?c.querySelector('.tsHead').textContent.replace(/[\s  ]+/g,' ').trim().replace(/^[▸▾]\s*/,''):null;}); /* 23/10 soir : l'en-tête repliable de la carte */
console.log('c3) carte :',JSON.stringify(o));C.c3=/^[a-z]+ \?\s*Ligne Fictive A DN 150 \/ 100/.test(o||''); /* 27/10 soir : « a ? » = lettre du candidat */
// ── c4) qualifiées : candidat de la ligne B (TS proposé) et tronçon PK 50 → 80 de la ligne A (à cheval sur la réduction)
o=await page.evaluate(()=>{const T=window.TRACE;const c=T.ts.candidates().find(x=>x.line==='L2');T.ts.markCandidate(c,'propose','DEV-F2');T.ts.markRange('L1',50,80,{etat:'forfait'});T.renderAll();
  const cards=[...document.querySelectorAll('#tsview .tsCard:not(.cand)')];const a=cards.find(x=>/Ligne Fictive B/.test(x.textContent)),b=cards.find(x=>/tronçon PK 50/.test(x.textContent));
  const t=x=>x?x.textContent.replace(/[\s  ]+/g,' '):'';return {a:(t(a).match(/Cette modif compte : [^·]*·[^·]*·/)||[''])[0].trim(),b:(t(b).match(/Dans ce tronçon[^·]*(·[^·]*)*?· DN [0-9 \/]+/)||[''])[0].trim(),bc:(t(b).match(/Cette modif compte : [^·]*(·[^·]*)*?· DN [0-9 \/]+/)||[''])[0].trim()};});
await shot(page,'4_qualifiees');console.log('c4) qualifiées :',JSON.stringify(o));
C.c4=/^Cette modif compte : \+2 soudures · DN 80 ·$/.test(o.a)&&/^Dans ce tronçon \(réel, PK 50 → 80\) : 30 ml .*· DN 150 \/ 100$/.test(o.b)&&/· DN 150 \/ 100$/.test(o.bc);
// ── c5) export
o=await page.evaluate(()=>{const html=window.TRACE.doe.tsHTML();return {n:html.length,ret:/retiré<\/b> : coude DN 150 PK 30 \(aller\)/.test(html),aj:/ajouté<\/b> : vanne DN 100 PK \d+ \(aller\)/.test(html),
  sd:/DN 150 : \+1 · DN 100 : \+2 · DN 80 : \+2/.test(html.replace(/<[^>]+>/g,''))&&/<span class="tsDnE">DN 150 : \+1<\/span>/.test(html) /* une entrée par ligne */,ttl:/Ligne Fictive A<\/b> <span class="dim">DN 150 \/ 100<\/span>/.test(html)};});
console.log('c5) export :',JSON.stringify(o));C.c5=o.n>1000&&o.ret&&o.aj&&o.sd&&o.ttl;
// ── c6) lyres / baïonnettes : shapesAt = countShapes (une lyre puis une baïonnette sur un axe fictif)
o=await page.evaluate(()=>{const T=window.TRACE;const P=[[0,0],[50,0],[50,10],[60,10],[60,0],[130,0],[140,8],[200,8]];const s=T.ts.shapes(P);const c=T.ts.counts({pts:P.map(p=>({x:p[0],y:p[1]}))},true);
  const P2=[[0,0],[40,0],[40,12],[52,12],[52,0],[90,0],[90,15],[101,15],[101,0],[150,0],[158,6],[190,6],[200,0],[240,0]];const s2=T.ts.shapes(P2);const c2=T.ts.counts({pts:P2.map(p=>({x:p[0],y:p[1]}))},true);
  return {s,c:{lyres:c.lyres,baio:c.baio},s2:{lyres:s2.lyres.length,baio:s2.baio.length},c2:{lyres:c2.lyres,baio:c2.baio}};});
console.log('c6) formes :',JSON.stringify(o));
C.c6=o.s.lyres.length===1&&o.s.baio.length===1&&o.c.lyres===1&&o.c.baio===1&&o.s.lyres[0]>50&&o.s.lyres[0]<80&&o.s2.lyres===o.c2.lyres&&o.s2.baio===o.c2.baio&&o.c2.lyres>=2;
// ── c7) légende du plan d'ensemble : sous le plan, dans sa carte
o=await page.evaluate(()=>{const ov=document.querySelector('#tsview .tsOverview');const lg=document.querySelector('#tsview .legend.tsLeg');if(!ov||!lg)return null;const a=ov.getBoundingClientRect(),b=lg.getBoundingClientRect(),cd=lg.closest('.card').getBoundingClientRect();
  return {pos:getComputedStyle(lg).position,gap:Math.round(b.top-a.bottom),inCard:b.top>=cd.top&&b.bottom<=cd.bottom+1,left:Math.round(b.left-cd.left)};});
await page.evaluate(()=>document.querySelector('#tsview .tsOverview').scrollIntoView({block:'start'}));await page.waitForTimeout(150);await shot(page,'7_legende');
console.log('c7) légende :',JSON.stringify(o));C.c7=!!o&&o.pos==='static'&&o.gap>=0&&o.gap<=12&&o.inCard&&o.left<=20;
await ctx.close();
// ── c8) téléphone 390
({ctx,page}=await mk({width:390,height:844}));
o=await page.evaluate(()=>{const d=document.querySelector('#tsview details.tsLines');if(d)d.open=true;const E=[...document.querySelectorAll('#tsview .tsDn .tsDnE')];const one=E.every(e=>{const r=e.getClientRects();return r.length===1&&r[0].height<20;});return {sw:document.documentElement.scrollWidth,w:window.innerWidth,tv:document.getElementById('tsview').scrollWidth<=document.getElementById('tsview').clientWidth+1,nE:E.length,one};});
await page.evaluate(()=>document.querySelector('#tsview table.tsMain').scrollIntoView({block:'center'}));await page.waitForTimeout(150);await shot(page,'8_tel');
console.log('c8) téléphone :',JSON.stringify(o));C.c8=o.sw<=o.w+1&&o.tv&&o.nE>=10&&o.one; /* chaque « DN … » tient sur une ligne */
await ctx.close();
console.log('erreurs console :',JSON.stringify(logs));C.c9=logs.length===0;
const ko=Object.entries(C).filter(([k,v])=>!v).map(([k])=>k);console.log(JSON.stringify(C));console.log(ko.length?'RESULTAT: KO '+ko.join(','):'RESULTAT: TOUT VERT');
await browser.close();
