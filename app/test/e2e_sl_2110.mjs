// 21/10 (Ethan : « + ajout rapide : coulisser une soudure sur une ou plusieurs barres ») — ＋ → ↔ Coulisser une soudure → toucher la soudure → décaler
// (± 0,1 / ± 1 m / saisie), « Cette soudure » ou « Et les suivantes » (jusqu'à la prochaine pièce), « + en face » (l'autre conduite) → Valider.
// Réseau FICTIF du traceur : L1 DN 100, 40 m droit + coude + 25 m (barres de 12 m : P1 P2 P3 = 12 m, P4 coupe ≈ 3 m, C1, P5 12 m, P6 coupe).
// c1 le ＋ propose « Coulisser une soudure » (soudeur) · c2 une soudure entre deux barres pleines, seule : une barre ferait plus de 12 m → refusé (message, Valider
// grisé) · c3 « et les suivantes » depuis S-0002 + en face : −1,5 m → les 3 soudures de chaque conduite reculent de 1,5 m, P1 = 10,5 m, P2 / P3 inchangées, la coupe
// P4 encaisse (+1,5 m) ; 2 enregistrements (aller, retour) dans weldSlides · c4 rejoué au rechargement (même géométrie) · c5 fiche de la soudure : « Coulissée sur
// place de −1,5 m » + « ↶ Annuler » → aller ET retour reviennent au calepinage (del:true) · c6 une soudure qui touche un coude ne coulisse pas · c7 une soudure
// d'un autre appareil (fusion du serveur) s'applique sans recharger · c8 téléphone 390 px : la barre tient, boutons ≥ 44 px · c9 fourniture calculable · c10 console.
import { chromium } from 'playwright';
const BASE=process.env.BASE||'http://localhost:8765';const SHOTS=process.env.SHOTS||null;
const browser=await chromium.launch({headless:true, executablePath: process.env.CHROMIUM_PATH||undefined});
const C={};const logs=[];
async function mk(vp){const ctx=await browser.newContext({viewport:vp,deviceScaleFactor:1});const page=await ctx.newPage();
  page.on('pageerror',e=>logs.push('PAGEERROR: '+e.message.slice(0,300)));page.on('console',m=>{if(m.type()==='error'&&!/supabase|Failed to fetch|net::ERR|404|geopf|WebSocket/i.test(m.text()))logs.push(m.text().slice(0,200));});page.on('dialog',d=>d.accept().catch(()=>{}));
  await page.goto(BASE+'/traceur.html');await page.waitForTimeout(500);await page.evaluate(()=>localStorage.clear());await page.reload();await page.waitForTimeout(500);
  await page.evaluate(()=>{const S=window.MAQ.state;S.lines=[{id:'L1',name:'Rue Fictive',dn:100,bar:12,pts:[[10,50],[50,50],[50,75]],specials:[],parent:null}];S.seq=2;window.MAQ.setMode('select');window.MAQ.rebuild();});
  await page.click('#bSave');await page.waitForTimeout(200);await page.fill('#svName','Coulisse test');await page.click('#svOk');await page.waitForTimeout(800);
  await page.click('#svGo');await page.waitForTimeout(1500);await page.selectOption('#roleSel','karim');await page.waitForTimeout(300);return {ctx,page};}
const shot=async(page,n)=>{if(SHOTS)await page.screenshot({path:`${SHOTS}/sl_${n}.png`});};
const geo=page=>page.evaluate(()=>{const L=window.TRACE.state.lines.L1;const o={};['A','R'].forEach(c=>{const cd=L.cond[c];o[c]={j:Object.fromEntries(cd.joints.map(j=>[j.weldId,+(+j.m).toFixed(2)])),e:Object.fromEntries(cd.els.map(e=>[e.id,+(+e.len).toFixed(2)])),cut:Object.fromEntries(cd.els.filter(e=>e.kind==='pipe').map(e=>[e.id,!!e.cut]))};});return o;});
const bar=page=>page.evaluate(()=>{const b=document.getElementById('slideBar');if(!b||b.style.display==='none')return null;const ok=b.querySelector('[data-sl="ok"]');return {txt:b.textContent.replace(/[\s  ]+/g,' ').trim(),ok:ok?!ok.disabled:null,mode:(b.querySelector('.chip.on[data-sl^="mode"]')||{}).dataset?.sl||'',face:!!b.querySelector('[data-sl="face"]'),faceOn:!!b.querySelector('[data-sl="face"].on')};});
const tapWeld=async(page,c,id)=>{await page.evaluate(([c,id])=>{const T=window.TRACE;const L=T.state.lines.L1;const j=L.cond[c].joints.find(x=>x.weldId===id);const q=T.slide.pos('L1',c,j.idx);T.slide.tap(q.x,q.y);},[c,id]);await page.waitForTimeout(250);};
const sl=async(page,v)=>{await page.click(`#slideBar [data-sl="${v}"]`);await page.waitForTimeout(200);};

let {ctx,page}=await mk({width:1366,height:860});
const G0=await geo(page);
// ── c1) le ＋ du plan propose « ↔ Coulisser une soudure » (droit weld.extra : le soudeur l'a)
await page.evaluate(()=>{window.TRACE.state.tab='plan';window.TRACE.renderAll();});await page.waitForTimeout(200);
await page.click('#planFab');await page.waitForTimeout(250);let o=await page.evaluate(()=>{const b=document.querySelector('#modal [data-pose-mode="slide"]');return b?{t:b.textContent.replace(/\s+/g,' ').trim(),dis:b.disabled}:null;});
await shot(page,'1_menu');await page.click('#modal [data-pose-mode="slide"]');await page.waitForTimeout(300);let B=await bar(page);
console.log('c1) ＋ :',JSON.stringify({o,B}));C.c1=!!o&&!o.dis&&/Coulisser une soudure/.test(o.t)&&!!B&&/touche la soudure/.test(B.txt);
// ── c2) S-0003 (entre P2 et P3, deux barres pleines) seule : +0,5 → P2 ferait 12,5 m → refusé ; −0,5 → P3 ferait 12,5 m → refusé
await tapWeld(page,'A','S-0003');B=await bar(page);const pk=B;
await sl(page,'d|0.1');await sl(page,'d|0.1');await sl(page,'d|0.1');await sl(page,'d|0.1');await sl(page,'d|0.1');B=await bar(page);const plus=B;const gPlus=await geo(page);
await page.fill('#slVal','-0,5');await page.dispatchEvent('#slVal','change');await page.waitForTimeout(200);const moins=await bar(page);await shot(page,'2_refus');
console.log('c2) seule entre deux barres pleines :',JSON.stringify({pk,plus,moins,j:gPlus.A.j['S-0003']}));
C.c2=!!pk&&/S-0003/.test(pk.txt)&&pk.mode==='mode|one'&&!pk.ok&&/barre P2 ferait 12,5 m : plus longue qu'une barre de 12 m/.test(plus.txt)&&plus.ok===false&&gPlus.A.j['S-0003']===24
  &&/barre P3 ferait 12,5 m/.test(moins.txt)&&moins.ok===false;
await sl(page,'cancel');
// ── c3) S-0002 « et les suivantes » + en face : −1,5 m → aller : S-0002 / 3 / 4 à 10,5 / 22,5 / 34,5 ; P1 10,5 m, P2 P3 12 m, P4 +1,5 m ; pareil au retour
await page.evaluate(()=>window.TRACE.slide.start());await page.waitForTimeout(200);await tapWeld(page,'A','S-0002');
await sl(page,'mode|suite');B=await bar(page);const suite=B;await sl(page,'face');await sl(page,'d|-1');await sl(page,'d|-0.1');await sl(page,'d|-0.1');await sl(page,'d|-0.1');await sl(page,'d|-0.1');await sl(page,'d|-0.1');
B=await bar(page);const G1=await geo(page);await shot(page,'3_suite_en_face');
await sl(page,'ok');await page.waitForTimeout(300);const recs=await page.evaluate(()=>JSON.parse(JSON.stringify(window.TRACE.slide.recs())));const G2=await geo(page);const toast1=await page.evaluate(()=>(document.getElementById('toast')||{}).textContent||'');
console.log('c3) et les suivantes + en face :',JSON.stringify({suite,B,GA:G1.A,GR:G1.R.j,recs,toast1}));
const near=(a,b)=>Math.abs(a-b)<0.011;
C.c3=/Et les suivantes \(3 soudures\)/.test(suite.txt)&&B.ok&&B.faceOn&&/P1 12 → 10,5 m · P4 3,1[78] → 4,6[78] m/.test(B.txt)&&/possible : −8,8[23] à 0 m/.test(suite.txt)&&/seule, elle ne peut pas bouger/.test(pk.txt)&&/les barres du milieu ne changent pas/.test(B.txt)
  &&near(G2.A.j['S-0002'],10.5)&&near(G2.A.j['S-0003'],22.5)&&near(G2.A.j['S-0004'],34.5)&&near(G2.A.j['S-0005'],G0.A.j['S-0005'])&&near(G2.A.e.P1,10.5)&&near(G2.A.e.P2,12)&&near(G2.A.e.P3,12)&&near(G2.A.e.P4,G0.A.e.P4+1.5)
  &&G2.A.cut.P1===true&&G2.A.cut.P2===G0.A.cut.P2&&near(G2.R.j['S-0010'],10.5)&&near(G2.R.j['S-0012'],34.5)&&near(G2.R.e.P4,G0.R.e.P4+1.5)
  &&recs.length===2&&recs.every(r=>r.d===-1.5&&r.w.length===3&&r.by&&r.at&&r.g===recs[0].g)&&recs.map(r=>r.cond).sort().join()==='A,R'&&/S-0002 coulissée de −?-?1,5 m \(6 soudures\)/.test(toast1.replace('−','-'));
// ── c4) rechargement : rejoué à l'identique (registre de l'appareil)
const sid=await page.evaluate(()=>window.TRACE.state.siteId);await page.reload();await page.waitForTimeout(1500);await page.evaluate(id=>window.TRACE.go(id),sid);await page.waitForTimeout(800);
const G3=await geo(page);console.log('c4) rechargé :',JSON.stringify({A:G3.A.j,P1:G3.A.e.P1,P4:G3.A.e.P4}));
C.c4=JSON.stringify(G3.A.j)===JSON.stringify(G2.A.j)&&JSON.stringify(G3.R.j)===JSON.stringify(G2.R.j)&&near(G3.A.e.P1,10.5)&&near(G3.A.e.P4,G2.A.e.P4);
// ── c5) fiche de S-0003 : « Coulissée sur place de −1,5 m … avec 2 soudures suivantes » + « ↶ Annuler le coulissement » → aller ET retour reviennent
await page.selectOption('#roleSel','karim').catch(()=>{});await page.waitForTimeout(200);
await page.evaluate(()=>{const T=window.TRACE;const L=T.state.lines.L1;const k=L.cond.A.joints.findIndex(j=>j.weldId==='S-0003');T.openJoint('L1','A',k);});await page.waitForTimeout(400);
const fiche=await page.evaluate(()=>{const s=document.getElementById('sheet');return {txt:s.textContent.replace(/[\s  ]+/g,' '),btn:!!s.querySelector('[data-act="slide-cancel"]')};});await shot(page,'5_fiche');
if(fiche.btn){await page.click('#sheet [data-act="slide-cancel"]');await page.waitForTimeout(400);}
const G4=await geo(page);const recs2=await page.evaluate(()=>JSON.parse(JSON.stringify(window.TRACE.slide.recs())));
console.log('c5) annuler depuis la fiche :',JSON.stringify({fiche:fiche.txt.match(/↔ Coulissée[^↶]*/)?.[0],btn:fiche.btn,A:G4.A.j,del:recs2.map(r=>!!r.del)}));
C.c5=/↔ Coulissée sur place de −?-?1,5 m \(vers l'amont\)/.test(fiche.txt.replace('−','-'))&&/avec 2 soudures suivantes/.test(fiche.txt)&&fiche.btn&&JSON.stringify(G4.A.j)===JSON.stringify(G0.A.j)&&JSON.stringify(G4.R.j)===JSON.stringify(G0.R.j)
  &&JSON.stringify(G4.A.e)===JSON.stringify(G0.A.e)&&JSON.stringify(G4.A.cut)===JSON.stringify(G0.A.cut)&&recs2.length===2&&recs2.every(r=>r.del&&r.upd);
// ── c6) S-0005 touche le coude C1 : ne coulisse pas (message), la pose reste sur « touche la soudure »
await page.evaluate(()=>window.TRACE.slide.start());await page.waitForTimeout(200);await tapWeld(page,'A','S-0005');B=await bar(page);const t6=await page.evaluate(()=>(document.getElementById('toast')||{}).textContent||'');
console.log('c6) soudure au coude :',JSON.stringify({B,t6}));C.c6=!!B&&/touche la soudure/.test(B.txt)&&/S-0005 touche une pièce/.test(t6);await sl(page,'cancel');
// ── c7) un coulissement venu d'un autre appareil (fusion du serveur) : appliqué sans recharger, une seule fois ; son annulation se défait aussi
o=await page.evaluate(()=>{const T=window.TRACE;const n=T.net;n.weldSlides=(n.weldSlides||[]).concat([{id:'SLx1',line:'L1',cond:'A',w:['S-0007'],d:-0.1,by:'Autre appareil',at:'2026-10-21T10:00:00.000Z'}]);const a=T.slide.sync();const b=T.slide.sync();
  const L=T.state.lines.L1;const m1=+L.cond.A.joints.find(j=>j.weldId==='S-0007').m;n.weldSlides.find(r=>r.id==='SLx1').del=true;const c=T.slide.sync();const m2=+L.cond.A.joints.find(j=>j.weldId==='S-0007').m;return {a,b,c,m1:+m1.toFixed(2),m2:+m2.toFixed(2)};});
console.log('c7) autre appareil :',JSON.stringify(o));C.c7=o.a===1&&o.b===0&&o.c===1&&near(o.m1,G0.A.j['S-0007']-0.1)&&near(o.m2,G0.A.j['S-0007']);
// ── c9) la fourniture et le stock se calculent toujours après un coulissement (barres recomptées sur les longueurs du plan)
o=await page.evaluate(()=>{const T=window.TRACE;let ok=true,err='';try{T.stk.needs();T.fourniture.compute();}catch(e){ok=false;err=e.message;}return {ok,err};});C.c9=o.ok;console.log('c9) fourniture :',JSON.stringify(o));
await ctx.close();
// ── c8) téléphone 390 : la barre tient dans l'écran, boutons ≥ 44 px
({ctx,page}=await mk({width:390,height:844}));await page.evaluate(()=>window.TRACE.slide.start());await page.waitForTimeout(200);await tapWeld(page,'A','S-0002');await sl(page,'mode|suite');await sl(page,'d|-1');
o=await page.evaluate(()=>{const b=document.getElementById('slideBar');const r=b.getBoundingClientRect();const hs=[...b.querySelectorAll('.slB .btn,[data-sl="ok"]')].map(x=>Math.round(x.getBoundingClientRect().height));return {l:Math.round(r.left),r:Math.round(r.right),w:window.innerWidth,sw:document.documentElement.scrollWidth,minH:Math.min(...hs),ok:!b.querySelector('[data-sl="ok"]').disabled};});
await shot(page,'8_tel');console.log('c8) téléphone :',JSON.stringify(o));C.c8=o.l>=0&&o.r<=o.w&&o.sw<=o.w+1&&o.minH>=44&&o.ok;await sl(page,'cancel');
const G5=await geo(page);C.c8b=JSON.stringify(G5.A.j)===JSON.stringify(G0.A.j); /* Annuler : rien n'a bougé */
await ctx.close();
console.log('erreurs console :',JSON.stringify(logs));C.c10=logs.length===0;
const ko=Object.entries(C).filter(([k,v])=>!v).map(([k])=>k);console.log(JSON.stringify(C));console.log(ko.length?'RESULTAT: KO '+ko.join(','):'RESULTAT: TOUT VERT');
await browser.close();
