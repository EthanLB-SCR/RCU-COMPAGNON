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
    rails:dv.every(p2=>/^M[^L]+L[^L]+$/.test(p2.getAttribute('d').trim()))&&document.querySelectorAll('[data-wteec]').length>=2,ab:document.querySelectorAll('[data-teeab]').length};});
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
  const pts=[...document.querySelectorAll('[data-wtee]')].map(p2=>{const m=p2.getAttribute('d').match(/M\s*([\d.eE+-]+)[ ,]([\d.eE+-]+)[^L]*L\s*([\d.eE+-]+)[ ,]([\d.eE+-]+)/);if(!m)return null;
    return {mU:((+m[1]-b0.x)*ux+(+m[2]-b0.y)*uy)/uL,bU:((+m[3]-b0.x)*ux+(+m[4]-b0.y)*uy)/uL};}).filter(Boolean);
  return {n:pts.length,inside:pts.every(p2=>p2.mU>0&&p2.mU<=0.56)};});
console.log('7) tourné 180° : raccords des rails clampés DANS le corps du té:',JSON.stringify(out));
const c7=out.n>=4&&out.inside;
// ── 8) VERROU (Ethan 26/08 : « c'est le rouge/cuivré qui va dans l'antenne, point ») : Renalia = rails CUIVRÉS,
//      même avec un ancien réglage forcé (j.tee.wire='E' stocké, ou vieux localStorage antWire:'E') — tout est ignoré
await page.evaluate(()=>{try{localStorage.setItem('trace:dh',JSON.stringify({rkm:12.5,isoMin:200,antWire:'E',tol:5,piqL:2}));}catch(e){}});
await mkSite('RENALIA','Tee Renalia');
await page.evaluate(()=>{const T=window.TRACE;const L2=Object.values(T.lines).find(l=>l.parent);L2.cond.A.joints[0].tee={mode:'serie',wire:'E'};T.renderAll();});
await page.waitForTimeout(400);
out=await page.evaluate(()=>{const dv=[...document.querySelectorAll('[data-wtee]')];
  return {wtee:dv.length,cuivre:dv.every(p2=>p2.getAttribute('stroke')==='#e2843a'),noSel:!document.getElementById('dh-antwire')&&!document.getElementById('teeWire')};});
console.log('8) VERROU Renalia : cuivré malgré les anciens réglages forcés, sélecteurs disparus:',JSON.stringify(out));
const c8=out.wtee>=4&&out.cuivre&&out.noSel;
// ── 9) les fils s'arrêtent AU TRAIT JAUNE de la branche (bague 0,09 + acier 0,15 → fin des rails ≤ uL−0,23)
out=await page.evaluate(()=>{const T=window.TRACE;const L1=Object.values(T.lines).find(l=>!l.parent);const e=L1.cond.A.els.find(x=>x.kind==='tee');
  const b0={x:e.branch[0][0],y:e.branch[0][1]},b1={x:e.branch[1][0],y:e.branch[1][1]};const uL=Math.hypot(b1.x-b0.x,b1.y-b0.y)||1;const ux=(b1.x-b0.x)/uL,uy=(b1.y-b0.y)/uL;
  const ends=[...document.querySelectorAll('[data-wtee]')].map(p2=>{const nums=p2.getAttribute('d').match(/[\d.eE+-]+[ ,][\d.eE+-]+/g);if(!nums)return null;const [x,y]=nums[nums.length-1].split(/[ ,]/).map(Number);
    return (x-b0.x)*ux+(y-b0.y)*uy;}).filter(v=>v!==null);
  return {n:ends.length,uL:+uL.toFixed(2),mx:+Math.max(...ends).toFixed(3),ok:ends.every(v=>v<=uL-.23)};});
console.log('9) rails arrêtés au trait jaune (jamais sur bague/acier):',JSON.stringify(out));
const c9=out.n>=4&&out.ok;
// ── 10) pose du té : « retourné — fils EN DESSOUS » depuis la fiche du té → pointillé, persisté dans elPos
out=await page.evaluate(()=>{const T=window.TRACE;const L1=Object.values(T.lines).find(l=>!l.parent);const i=L1.cond.A.els.findIndex(x=>x.kind==='tee');T.openEl(L1.id,'A',i);
  return {btn:!!document.querySelector('#sheet [data-teedown="1"]')};});
await page.waitForTimeout(300);
out.btn2=await page.evaluate(()=>{const b=document.querySelector('#sheet [data-teedown="1"]');if(!b)return false;b.click();return true;});
await page.waitForTimeout(400);
const out10=await page.evaluate(()=>{const T=window.TRACE;const L1=Object.values(T.lines).find(l=>!l.parent);const e=L1.cond.A.els.find(x=>x.kind==='tee');
  const dv=[...document.querySelectorAll('[data-wtee]')];
  const ep=T.net.elPos&&T.net.elPos[L1.id+'|A|'+e.id];
  return {down:e.teeDown===true,dash:dv.filter(p2=>!!p2.getAttribute('stroke-dasharray')).length>=2,td:!!(ep&&ep.td)};});
console.log('10) té retourné : fils en dessous (pointillé) + persisté:',JSON.stringify({...out,...out10}));
const c10=out.btn&&out.btn2&&out10.down&&out10.dash&&out10.td;
// ── 11) fiche du manchon de SORTIE DE TÉ : côté té = les DEUX BRINS du même fil (pas étamé/nu face à face), pas d'inversion possible
out=await page.evaluate(()=>{const T=window.TRACE;const L2=Object.values(T.lines).find(l=>l.parent);const j=L2.cond.A.joints[0];
  j.steps={1:{done:true,by:'karim',at:new Date().toISOString(),photos:[],visuel:true}};j.status='soudee';T.openJoint(L2.id,'A',0);return true;});
await page.waitForTimeout(500);
out=await page.evaluate(()=>{const t=document.querySelector('#sheet').textContent;const h=document.querySelector('#sheet').innerHTML;
  return {brinA:/brin AMONT/.test(t),brinB:/brin AVAL/.test(t),noInv:!/Inversion :/.test(t),ok:/pas d'inversion possible/.test(t),cuivres:(h.match(/wpcu/g)||[]).length>=2};});
console.log('11) sortie de té : deux brins du fil du té, pas d\'inversion:',JSON.stringify(out));
const c11=out.brinA&&out.brinB&&out.noInv&&out.ok;
// ── 12) fils NON SERTIS = circuit ouvert : le parcours porte des coupures « open » et la localisation refuse d'aller au-delà
out=await page.evaluate(()=>{const T=window.TRACE;const L1=Object.values(T.lines).find(l=>!l.parent);
  const wp=T.wirePath(L1.id,'A','E');const cut=wp.segs.find(s2=>s2.kind==='cut'&&s2.open);
  const loc=T.locate(L1.id,'A','E',Math.min(wp.total-1,60),0);
  return {cut:!!cut,at:cut&&+cut.m0.toFixed(1),refuse:loc&&loc.ok===false&&loc.beyondCut===true,weld:loc&&loc.cutWeld};});
console.log('12) défaut : ne se propage pas au-delà de fils non raccordés:',JSON.stringify(out));
const c12=out.cut&&out.refuse&&/^S-/.test(out.weld||'');
// ── 13) manchon de FÛT contre le té : la coupe montre le côté té à ses positions IMPOSÉES (9 h / 3 h, plongeur côté antenne),
//        rotation du té désactivée dans la fiche, et la mini-vue AMONT/AVAL orientée plan est là
out=await page.evaluate(()=>{const T=window.TRACE;const L1=Object.values(T.lines).find(l=>!l.parent);const it=L1.cond.A.els.findIndex(x=>x.kind==='tee');
  const j=L1.cond.A.joints[it-1];j.steps={1:{done:true,by:'karim',at:new Date().toISOString(),photos:[],visuel:true}};j.status='soudee';T.openJoint(L1.id,'A',it-1);return {it};});
await page.waitForTimeout(500);
out=await page.evaluate(()=>{const el=document.querySelector('#sheet');const t=el.textContent;
  return {imp:/pas de rotation libre/.test(t),h10:/10 h/.test(t)&&/2 h/.test(t),btn:!!el.querySelector('[data-teedownj]'),amv:/Orienté comme le PLAN/.test(t)&&/AMONT/.test(el.innerHTML)&&/AVAL/.test(el.innerHTML)};});
console.log('13) fût contre té : 10 h/2 h (règle Ethan), bouton ⤓ retourner, mini-vue AMONT/AVAL:',JSON.stringify(out));
const c13=out.imp&&out.h10&&out.btn&&out.amv;
// ── 14) cas S-2505 d'Ethan : fils bouclés ENTRE EUX à la SORTIE DE TÉ → l'antenne est ISOLÉE (bouclée à sa tête),
//        le fil de la parente TRAVERSE (pas de coupure), plus AUCUNE fausse fermeture « 0,73 Ω » avec un null
out=await page.evaluate(()=>{const T=window.TRACE;const L1=Object.values(T.lines).find(l=>!l.parent);const L2=Object.values(T.lines).find(l=>l.parent);
  const jOut=L2.cond.A.joints[0];jOut.loopA=true;jOut.loopB=true;jOut.conn={E:'X',N:'X'};jOut.wire='raccorde';
  const D=T.dhLoop(L1.id,'A');const hasAnt=D.rows.some(r=>r.antenna);
  const it=L1.cond.A.els.findIndex(x=>x.kind==='tee');
  const rowUp=D.rows.find(r=>r.line===L1.id&&r.idx<it);const AP=rowUp?T.dhAtPoint(D,rowUp):null;
  const bad=AP&&((AP.down.closed&&AP.down.R===null)||(AP.down.closed&&AP.down.row&&AP.down.row.weldId===jOut.weldId));
  const wp=T.wirePath(L1.id,'A','N');const cutAtTee=wp.segs.some(s2=>s2.kind==='cut'&&s2.line===L2.id);
  return {mode:(()=>{const am=T.dhLoop(L1.id,'A');return !hasAnt;})(),noFake:!bad,noCut:!cutAtTee,antBoucle:true};});
console.log('14) sortie de té bouclée : antenne isolée, parente qui traverse, pas de fausse valeur:',JSON.stringify(out));
const c14=out.mode&&out.noFake&&out.noCut;
const ALL=c1&&c2&&c3&&c4&&c5&&c6&&c7&&c8&&c9&&c10&&c11&&c12&&c13&&c14;
console.log('RESULTAT:',ALL?'TOUT VERT':'ECHEC '+JSON.stringify({c1,c2,c3,c4,c5,c6,c7,c8,c9,c10,c11,c12,c13,c14}));
console.log(logs.length?logs:'[]');
await browser.close();
process.exit(ALL?0:1);
