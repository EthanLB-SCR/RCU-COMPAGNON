// 22/10 (Ethan, sur « ✅ Déjà posé (reprise) » : « ça marche bien, il faudrait juste pouvoir retourner en arrière si une déclaration est faite par erreur »).
// Réseau FICTIF du traceur : L1 DN 100, 40 m + coude + 25 m (8 soudures par conduite).
// c1 juste après la déclaration : la barre du haut dit « ✅ 16 soudures déclarées … » avec « ↶ Annuler cette déclaration » (≥ 44 px) et « ✓ OK »
// c2 « ↶ Annuler » en un geste : toutes les soudures reviennent « à souder » (événement reprise retiré, fils d'avant), la barre disparaît, message clair
// c3 « ✓ OK » ferme la barre (la déclaration reste) · c4 mode « Déjà posé » : « ↶ Déclarations faites (1) » → la liste (ligne, toute la ligne / PK, nombre, état,
// date, auteur, note) → « ↶ Annuler » → revenues · c5 une soudure saisie depuis (contrôlée après coup) : la liste le dit et l'annulation la garde
// c6 soudeur : ni « Déjà posé » ni liste (droit weld.admin) · c7 téléphone 390 : la barre tient, boutons ≥ 44 px · c8 console.
import { chromium } from 'playwright';
const BASE=process.env.BASE||'http://localhost:8765';const SHOTS=process.env.SHOTS||null;
const browser=await chromium.launch({headless:true, executablePath: process.env.CHROMIUM_PATH||undefined});
const C={};const logs=[];
async function mk(vp,who){const ctx=await browser.newContext({viewport:vp,deviceScaleFactor:1});const page=await ctx.newPage();
  page.on('pageerror',e=>logs.push('PAGEERROR: '+e.message.slice(0,300)));page.on('console',m=>{if(m.type()==='error'&&!/supabase|Failed to fetch|net::ERR|404|geopf|WebSocket/i.test(m.text()))logs.push(m.text().slice(0,200));});page.on('dialog',d=>d.accept().catch(()=>{}));
  await page.goto(BASE+'/traceur.html');await page.waitForTimeout(500);await page.evaluate(()=>localStorage.clear());await page.reload();await page.waitForTimeout(500);
  await page.evaluate(()=>{const S=window.MAQ.state;S.lines=[{id:'L1',name:'Rue Fictive',dn:100,bar:12,pts:[[10,50],[50,50],[50,75]],specials:[],parent:null}];S.seq=2;window.MAQ.setMode('select');window.MAQ.rebuild();});
  await page.click('#bSave');await page.waitForTimeout(200);await page.fill('#svName','Reprise annuler');await page.click('#svOk');await page.waitForTimeout(800);
  await page.click('#svGo');await page.waitForTimeout(1500);await page.selectOption('#roleSel',who);await page.waitForTimeout(300);await page.evaluate(()=>{window.TRACE.state.tab='plan';window.TRACE.renderAll();});await page.waitForTimeout(200);return {ctx,page};}
const shot=async(page,n)=>{if(SHOTS)await page.screenshot({path:`${SHOTS}/rpu_${n}.png`});};
const st=page=>page.evaluate(()=>{const L=window.TRACE.state.lines.L1;const o={};['A','R'].forEach(c=>L.cond[c].joints.forEach(j=>{o[j.weldId]={s:j.status,w:j.wire,ev:(j.events||[]).map(e=>e.type).join('+')};}));return o;});
const tapAt=async(page,m)=>{await page.evaluate(m=>{const T=window.TRACE;const L=T.state.lines.L1;const e=L.cond.A.els.find(x=>m>=x.m0&&m<=x.m1);const pl=e.axis[0];const t=(m-e.m0)/Math.max(.001,e.m1-e.m0);const a=pl[0],b=pl[pl.length-1];T.rep.tap(a.x+(b.x-a.x)*t,a.y+(b.y-a.y)*t);},m);await page.waitForTimeout(250);};
const bar=page=>page.evaluate(()=>{const b=document.getElementById('slideBar');if(!b||b.style.display==='none')return null;const u=b.querySelector('[data-rp="undo"]'),k=b.querySelector('[data-rp="ok"]'),l=b.querySelector('[data-rp="list"]');
  return {txt:b.textContent.replace(/[\s  ]+/g,' ').trim(),undo:u?Math.round(u.getBoundingClientRect().height):0,ok:k?Math.round(k.getBoundingClientRect().height):0,list:l?l.textContent.trim():''};});
const declareAll=async(page,stv)=>{await page.evaluate(()=>window.TRACE.rep.start());await page.waitForTimeout(150);await tapAt(page,20);await page.click('#slideBar [data-rp="all"]');await page.waitForTimeout(300);
  await page.click(`#rpSt .chip[data-v="${stv}"]`);await page.click('#rpGo');await page.waitForTimeout(400);};
const nState=(S,s)=>Object.values(S).filter(x=>x.s===s).length;

let {ctx,page}=await mk({width:1366,height:860},'ethan');
const S0=await st(page);
// ── c1) déclaration de toute la ligne (Manchonnées) → la barre « ↶ Annuler »
await page.click('#planFab');await page.waitForTimeout(250);await page.click('#modal [data-pose-mode="reprise"]');await page.waitForTimeout(250);
let B0=await bar(page);await tapAt(page,20);await page.click('#slideBar [data-rp="all"]');await page.waitForTimeout(300);await page.click('#rpSt .chip[data-v="manchonnee"]');await page.check('#rpFils');await page.click('#rpGo');await page.waitForTimeout(400);
let B=await bar(page);const S1=await st(page);await shot(page,'1_barre');
console.log('c1) après déclaration :',JSON.stringify({B0,B,man:nState(S1,'manchonnee')}));
C.c1=!!B0&&!B0.list&&!!B&&/✅ 16 soudures déclarées Manchonnées \(fini\) · sans traçabilité/.test(B.txt)&&/↶ Annuler cette déclaration/.test(B.txt)&&B.undo>=44&&B.ok>=44&&nState(S1,'manchonnee')===16;
// ── c2) ↶ en un geste
await page.click('#slideBar [data-rp="undo"]');await page.waitForTimeout(400);
let S2=await st(page);B=await bar(page);let t2=await page.evaluate(()=>(document.getElementById('toast')||{}).textContent||'');
console.log('c2) annulé :',JSON.stringify({B,t2,aSouder:nState(S2,'a_souder'),ev:Object.values(S2).filter(x=>x.ev).length,w:Object.values(S2).filter(x=>x.w==='raccorde').length}));
C.c2=!B&&nState(S2,'a_souder')===16&&Object.values(S2).every(x=>!/reprise/.test(x.ev))&&Object.values(S2).every((x,i)=>x.w===Object.values(S0)[i].w)&&/↶ Déclaration annulée : 16 soudures revenues comme avant/.test(t2);
// ── c3) « ✓ OK » ferme la barre, la déclaration reste
await declareAll(page,'soudee');B=await bar(page);const okBefore=!!B&&/16 soudures déclarées Soudées seulement/.test(B.txt);await page.click('#slideBar [data-rp="ok"]');await page.waitForTimeout(250);B=await bar(page);let S3=await st(page);
console.log('c3) OK :',JSON.stringify({okBefore,B,soud:nState(S3,'soudee')}));C.c3=okBefore&&!B&&nState(S3,'soudee')===16;
// ── c5 d'abord) une soudure contrôlée depuis (saisie après coup)
await page.evaluate(()=>{const L=window.TRACE.state.lines.L1;const j=L.cond.A.joints.find(x=>x.weldId==='S-0004');j.status='controlee';j.events.push({type:'controlee',by:'ethan',at:new Date(),data:{},photos:[]});});
// ── c4) mode « Déjà posé » → « Déclarations faites (1) » → liste → ↶ Annuler
await page.evaluate(()=>window.TRACE.rep.start());await page.waitForTimeout(200);B=await bar(page);
await page.click('#slideBar [data-rp="list"]');await page.waitForTimeout(300);
const L=await page.evaluate(()=>{const m=document.getElementById('modal');const cards=[...m.querySelectorAll('[data-rpd]')];return {n:cards.length,t:cards.map(c=>c.textContent.replace(/[\s  ]+/g,' ').trim()),btn:cards.map(c=>{const b=c.querySelector('[data-rpx]');return b?Math.round(b.getBoundingClientRect().height):0;})};});
await shot(page,'4_liste');
await page.click('#modal [data-rpx]');await page.waitForTimeout(400);const S4=await st(page);const t4=await page.evaluate(()=>(document.getElementById('toast')||{}).textContent||'');
console.log('c4/c5) liste et annulation :',JSON.stringify({B,L,t4,aSouder:nState(S4,'a_souder'),s4:S4['S-0004']}));
C.c4=!!B&&/↶ Déclarations faites \(1\)/.test(B.list)&&L.n===1&&/Rue Fictive · toute la ligne · 16 soudures soudées seulement/.test(L.t[0])&&/le \d{2}\/\d{2}/.test(L.t[0])&&/par Ethan/.test(L.t[0])&&L.btn[0]>=44&&nState(S4,'a_souder')===15;
C.c5=/1 saisie depuis : elle reste/.test(L.t[0]||'')&&S4['S-0004'].s==='controlee'&&/15 soudures revenues comme avant · 1 gardée \(saisie depuis\)/.test(t4);
await ctx.close();
// ── c6) soudeur : « Déjà posé » grisé, pas de liste
({ctx,page}=await mk({width:1366,height:860},'karim'));
await page.click('#planFab');await page.waitForTimeout(250);const soud=await page.evaluate(()=>{const b=document.querySelector('#modal [data-pose-mode="reprise"]');return b?b.disabled:null;});
await page.evaluate(()=>window.TRACE.rep.start());await page.waitForTimeout(200);const Bs=await bar(page);
console.log('c6) soudeur :',JSON.stringify({soud,Bs}));C.c6=soud===true&&!Bs;
await ctx.close();
// ── c7) téléphone 390
({ctx,page}=await mk({width:390,height:844},'ethan'));
await declareAll(page,'manchonnee');B=await bar(page);const g=await page.evaluate(()=>{const b=document.getElementById('slideBar').getBoundingClientRect();return {l:Math.round(b.left),r:Math.round(b.right),w:window.innerWidth,sw:document.documentElement.scrollWidth};});await shot(page,'7_tel');
console.log('c7) téléphone :',JSON.stringify({B,g}));C.c7=!!B&&B.undo>=44&&g.l>=0&&g.r<=g.w&&g.sw<=g.w+1;
await ctx.close();
console.log('erreurs console :',JSON.stringify(logs));C.c8=logs.length===0;
const ko=Object.entries(C).filter(([k,v])=>!v).map(([k])=>k);console.log(JSON.stringify(C));console.log(ko.length?'RESULTAT: KO '+ko.join(','):'RESULTAT: TOUT VERT');
await browser.close();
