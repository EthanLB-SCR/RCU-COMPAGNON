// 21/10 (Ethan : « importation de chantiers commencés : déclarer en masse des tronçons posés sans traçabilité ») — ＋ → ✅ Déjà posé (reprise) → début / fin
// (ou « Jusqu'au bout » / « Toute la ligne ») → état (Manchonnées / Contrôlées / Soudées), fils raccordés au choix, note → les soudures « à souder » de l'aller et du
// retour passent à cet état avec un événement « reprise » (sans photo, sans étape, sans événement « soudée » : rien dans la production du jour) ; celles déjà saisies
// ne bougent pas ; fiche : « Déclarée posée avant l'appli … sans traçabilité » + « ↶ Annuler cette déclaration » (celles saisies depuis sont gardées).
// Réseau FICTIF du traceur : L1 DN 100, 40 m + coude + 25 m (8 soudures par conduite).
// c1 le ＋ : « Déjà posé » pour le chef, grisé pour le soudeur · c2 début PK 5 + « Jusqu'au bout » → fenêtre : 13 à déclarer, 1 déjà saisie · c3 déclarées
// Manchonnées + fils : 13 soudures, S-0001 (PK 0) et S-0003 (déjà soudée) intactes, événement reprise, pas d'événement « soudée », fils raccordés · c4 fiche : mention +
// annuler → tout revient (état, fils) · c5 annulation partielle : une soudure contrôlée depuis reste · c6 « Toute la ligne » (Soudées, sans fils) · c7 tronçon déjà
// saisi en entier → rien à déclarer · c8 téléphone 390 px · c9 console.
import { chromium } from 'playwright';
const BASE=process.env.BASE||'http://localhost:8765';const SHOTS=process.env.SHOTS||null;
const browser=await chromium.launch({headless:true, executablePath: process.env.CHROMIUM_PATH||undefined});
const C={};const logs=[];
async function mk(vp,who){const ctx=await browser.newContext({viewport:vp,deviceScaleFactor:1});const page=await ctx.newPage();
  page.on('pageerror',e=>logs.push('PAGEERROR: '+e.message.slice(0,300)));page.on('console',m=>{if(m.type()==='error'&&!/supabase|Failed to fetch|net::ERR|404|geopf|WebSocket/i.test(m.text()))logs.push(m.text().slice(0,200));});page.on('dialog',d=>d.accept().catch(()=>{}));
  await page.goto(BASE+'/traceur.html');await page.waitForTimeout(500);await page.evaluate(()=>localStorage.clear());await page.reload();await page.waitForTimeout(500);
  await page.evaluate(()=>{const S=window.MAQ.state;S.lines=[{id:'L1',name:'Rue Fictive',dn:100,bar:12,pts:[[10,50],[50,50],[50,75]],specials:[],parent:null}];S.seq=2;window.MAQ.setMode('select');window.MAQ.rebuild();});
  await page.click('#bSave');await page.waitForTimeout(200);await page.fill('#svName','Reprise test');await page.click('#svOk');await page.waitForTimeout(800);
  await page.click('#svGo');await page.waitForTimeout(1500);await page.selectOption('#roleSel',who);await page.waitForTimeout(300);await page.evaluate(()=>{window.TRACE.state.tab='plan';window.TRACE.renderAll();});await page.waitForTimeout(200);return {ctx,page};}
const shot=async(page,n)=>{if(SHOTS)await page.screenshot({path:`${SHOTS}/rp_${n}.png`});};
const st=page=>page.evaluate(()=>{const L=window.TRACE.state.lines.L1;const o={};['A','R'].forEach(c=>L.cond[c].joints.forEach(j=>{o[j.weldId]={s:j.status,w:j.wire,ev:(j.events||[]).map(e=>e.type).join('+')};}));return o;});
const tapAt=async(page,m)=>{await page.evaluate(m=>{const T=window.TRACE;const L=T.state.lines.L1;const e=L.cond.A.els.find(x=>m>=x.m0&&m<=x.m1);const pl=e.axis[0];const t=(m-e.m0)/Math.max(.001,e.m1-e.m0);const a=pl[0],b=pl[pl.length-1];T.rep.tap(a.x+(b.x-a.x)*t,a.y+(b.y-a.y)*t);},m);await page.waitForTimeout(250);};

// ── c1) soudeur : « Déjà posé » grisé ; chef : actif
let {ctx,page}=await mk({width:1366,height:860},'karim');
await page.click('#planFab');await page.waitForTimeout(250);const soud=await page.evaluate(()=>{const b=document.querySelector('#modal [data-pose-mode="reprise"]');return b?{dis:b.disabled}:null;});await ctx.close();
({ctx,page}=await mk({width:1366,height:860},'ethan'));
await page.click('#planFab');await page.waitForTimeout(250);const chef=await page.evaluate(()=>{const b=document.querySelector('#modal [data-pose-mode="reprise"]');return b?{dis:b.disabled,t:b.textContent.replace(/\s+/g,' ').trim()}:null;});
await shot(page,'1_menu');await page.click('#modal [data-pose-mode="reprise"]');await page.waitForTimeout(250);let bar=await page.evaluate(()=>(document.getElementById('slideBar')||{}).textContent||'');
console.log('c1) menu :',JSON.stringify({soud,chef,bar}));C.c1=!!soud&&soud.dis&&!!chef&&!chef.dis&&/Déjà posé/.test(chef.t)&&/touche le DÉBUT/.test(bar);
// ── c2) S-0003 déjà soudée (saisie du jour) ; début PK 5 puis « Jusqu'au bout de la ligne » → la fenêtre compte 13 à déclarer, 1 déjà saisie
await page.evaluate(()=>{const L=window.TRACE.state.lines.L1;const j=L.cond.A.joints.find(x=>x.weldId==='S-0003');j.status='soudee';j.events.push({type:'soudee',by:'karim',at:new Date(),data:{procede:'141+111'},photos:[]});});
const S0=await st(page);await tapAt(page,5);bar=await page.evaluate(()=>(document.getElementById('slideBar')||{}).textContent||'');
await page.click('#slideBar [data-rp="end"]');await page.waitForTimeout(300);const modal=await page.evaluate(()=>{const m=document.getElementById('modal');return m?m.textContent.replace(/[\s  ]+/g,' '):'';});await shot(page,'2_fenetre');
console.log('c2) fenêtre :',JSON.stringify({bar:bar.slice(0,120),modal:modal.slice(0,400)}));
C.c2=/début Rue Fictive · PK 5 m — touche la FIN/.test(bar)&&/PK 5 → 65[,\d]* m/.test(modal)&&/13 soudures à souder passent posées sans traçabilité/.test(modal)&&/1 déjà saisie : ne bouge pas/.test(modal)&&/Déclarer 13 soudures posées/.test(modal);
// ── c3) « Manchonnées » + fils + note → déclarées
await page.click('#rpSt .chip[data-v="manchonnee"]');await page.check('#rpFils');await page.fill('#rpNote','posé par l\'entreprise précédente');await page.click('#rpGo');await page.waitForTimeout(400);
const S1=await st(page);const toast1=await page.evaluate(()=>(document.getElementById('toast')||{}).textContent||'');
const decl=await page.evaluate(()=>{const L=window.TRACE.state.lines.L1;const j=L.cond.A.joints.find(x=>x.weldId==='S-0004');const ev=j.events.find(e=>e.type==='reprise');return ev?{data:ev.data,photos:ev.photos.length,label:ev.label}:null;});
console.log('c3) déclarées :',JSON.stringify({S1,toast1,decl}));
const ids=Object.keys(S1);const changed=ids.filter(k=>S1[k].s!==S0[k].s);
C.c3=changed.length===13&&S1['S-0001'].s==='a_souder'&&S1['S-0003'].s==='soudee'&&S1['S-0003'].ev==='soudee'&&changed.every(k=>S1[k].s==='manchonnee'&&S1[k].ev==='reprise'&&S1[k].w==='raccorde')
  &&!!decl&&decl.data.status==='manchonnee'&&decl.data.from==='a_souder'&&decl.data.fils===true&&/entreprise précédente/.test(decl.data.note)&&decl.photos===0&&/sans traçabilité/.test(decl.label)&&/13 soudures déclarées Manchonnées/.test(toast1);
// ── c4) fiche de S-0004 : mention + annuler → les 13 reviennent « à souder », fils « à raccorder »
await page.evaluate(()=>{const T=window.TRACE;const L=T.state.lines.L1;const k=L.cond.A.joints.findIndex(j=>j.weldId==='S-0004');T.openJoint('L1','A',k);});await page.waitForTimeout(400);
const fiche=await page.evaluate(()=>{const s=document.getElementById('sheet');return {txt:s.textContent.replace(/[\s  ]+/g,' '),btn:!!s.querySelector('[data-act="rep-cancel"]'),next:(s.querySelector('[data-gostep]')||{dataset:{}}).dataset.gostep||''};});await shot(page,'4_fiche'); /* manchonnée en reprise : prochaine étape = moussage (4), pas la soudure */
const ops=await page.evaluate(()=>{const T=window.TRACE;const L=T.state.lines.L1;const j=L.cond.A.joints.find(x=>x.weldId==='S-0004');return {ops:T.act.ops(j,L).length,rep:Object.values(j.steps||{}).filter(x=>x&&x.rep).length,by:(j.steps&&j.steps[1]||{}).by};}); /* étapes cochées d'office à l'ouverture : jamais de la production */
if(fiche.btn){await page.click('#sheet [data-act="rep-cancel"]');await page.waitForTimeout(400);}const S2=await st(page);
console.log('c4) fiche + annuler :',JSON.stringify({ops,next:fiche.next,fiche:fiche.txt.match(/✅ Déclarée[^↶]*/)?.[0]||fiche.txt.slice(0,200),btn:fiche.btn,back:Object.keys(S2).filter(k=>S2[k].s!==S0[k].s)}));
C.c4=fiche.next==='4'&&ops.ops===0&&ops.rep===3&&/reprise, sans traçabilité/.test(ops.by)&&/✅ Déclarée posée avant l'appli \(reprise du .* par Ethan L\.\) — sans traçabilité · 13 soudures dans cette déclaration/.test(fiche.txt)&&/Déclarée Manchonnée avant l'appli/.test(fiche.txt)&&fiche.btn
  &&ids.every(k=>S2[k].s===S0[k].s&&S2[k].w===S0[k].w&&S2[k].ev===S0[k].ev);
// ── c5) annulation partielle : déclarée à nouveau (hooks), S-0006 contrôlée depuis → annuler : S-0006 gardée, les autres reviennent
let o=await page.evaluate(()=>{const T=window.TRACE;const L=T.state.lines.L1;const n=T.rep.apply('L1',5,1e9,'controlee',false,'');const j=L.cond.A.joints.find(x=>x.weldId==='S-0006');j.events.push({type:'controle',by:'ethan',at:new Date(),data:{result:'OK',mode:'Visuel'},photos:[]});
  const id=j.events.find(e=>e.type==='reprise').data.decl;const R=T.rep.cancel(id);return {n,R,s6:j.status,s7:L.cond.A.joints.find(x=>x.weldId==='S-0007').status};});
console.log('c5) annulation partielle :',JSON.stringify(o));C.c5=o.n===13&&o.R.n===12&&o.R.kept===1&&o.s6==='controlee'&&o.s7==='a_souder';
// ── c6) « Toute la ligne » (Soudées, sans fils) : tout ce qui est encore à souder sur la ligne ; S-0003 / S-0006 déjà saisies
await page.evaluate(()=>window.TRACE.rep.start());await page.waitForTimeout(150);await tapAt(page,20);await page.click('#slideBar [data-rp="all"]');await page.waitForTimeout(300);
const modal6=await page.evaluate(()=>(document.getElementById('modal')||{}).textContent.replace(/[\s  ]+/g,' '));await page.click('#rpSt .chip[data-v="soudee"]');await page.click('#rpGo');await page.waitForTimeout(400);const S6=await st(page);
console.log('c6) toute la ligne :',JSON.stringify({m:modal6.slice(0,200),n:Object.values(S6).filter(x=>x.ev.endsWith('reprise')).length}));
C.c6=/Toute la ligne/.test(modal6)&&/14 soudures à souder/.test(modal6)&&/2 déjà saisies/.test(modal6)&&Object.keys(S6).filter(k=>S6[k].s==='soudee'&&S6[k].ev==='reprise'&&S6[k].w==='a_raccorder').length===14;
// ── c7) tout est déjà saisi → « Rien à déclarer »
await page.evaluate(()=>window.TRACE.rep.start());await page.waitForTimeout(150);await tapAt(page,20);await page.click('#slideBar [data-rp="all"]');await page.waitForTimeout(300);
const t7=await page.evaluate(()=>({toast:(document.getElementById('toast')||{}).textContent||'',modal:!!document.querySelector('#modal #rpGo')}));console.log('c7) rien à déclarer :',JSON.stringify(t7));C.c7=/Rien à déclarer : les 16 soudures du tronçon sont déjà saisies/.test(t7.toast)&&!t7.modal;
await ctx.close();
// ── c8) téléphone 390 : la barre et la fenêtre tiennent
({ctx,page}=await mk({width:390,height:844},'ethan'));await page.evaluate(()=>window.TRACE.rep.start());await page.waitForTimeout(150);await tapAt(page,5);
o=await page.evaluate(()=>{const b=document.getElementById('slideBar').getBoundingClientRect();return {l:Math.round(b.left),r:Math.round(b.right),w:window.innerWidth,sw:document.documentElement.scrollWidth};});
await page.click('#slideBar [data-rp="end"]');await page.waitForTimeout(300);const o2=await page.evaluate(()=>{const g=document.getElementById('rpGo');const r=g.getBoundingClientRect();return {h:Math.round(r.height),r:Math.round(r.right),sw:document.documentElement.scrollWidth};});await shot(page,'8_tel');
console.log('c8) téléphone :',JSON.stringify({o,o2}));C.c8=o.l>=0&&o.r<=o.w&&o.sw<=o.w+1&&o2.h>=40&&o2.r<=390&&o2.sw<=391;
await ctx.close();
console.log('erreurs console :',JSON.stringify(logs));C.c9=logs.length===0;
const ko=Object.entries(C).filter(([k,v])=>!v).map(([k])=>k);console.log(JSON.stringify(C));console.log(ko.length?'RESULTAT: KO '+ko.join(','):'RESULTAT: TOUT VERT');
await browser.close();
