// e2e_mdr_0111 — 01/11 soir (Ethan : « quand c'est compté sur plan, ça doit automatiquement être pointé sur plan ; et fais un récap dans les modifs quand elles sont
//   validées, pas juste une grande liste : un récap des ml par DN avant et après — induit par la modif — et pour les pièces, etc. »)
//  m1  compter sur le plan (vrais tronçons sur l'antenne B) → la modif est pointée toute seule : 1 point au milieu du tronçon (ligne + PK), lignes pointées au même endroit
//  m2  enregistrée : 1 point, le tronçon gardé ; sur le plan UN repère (pas un par ligne) + le tronçon surligné
//  m3  récap des modifs déclarées (2 modifs : comptée en TS, changement de DN + coudes pour mémoire) : linéaire par DN marché → modifs → après (le DN changé retire à
//      l'ancien DN, ajoute au nouveau), total du marché = linéaire du marché ; soudures et coudes par DN ; la liste des modifs repliable dessous
//  m4  filtre « TS » : seule la modif en TS compte (plus de DN 100 ni de coudes)
//  m5  rouvrir la modif comptée : le tronçon est toujours là ; ré-enregistrée telle quelle → toujours surligné
//  m6  zéro erreur de page
import { chromium } from 'playwright';
const BASE=process.env.BASE||'http://localhost:8765';const C={};const J=x=>JSON.stringify(x);const errs=[];
const b=await chromium.launch({executablePath:process.env.CHROMIUM_PATH||undefined});const page=await (await b.newContext({viewport:{width:1280,height:900}})).newPage();page.on('pageerror',e=>errs.push(String(e)));page.on('dialog',d=>d.accept().catch(()=>{}));
const W=ms=>page.waitForTimeout(ms);const T=(fn,arg)=>page.evaluate(fn,arg);
await page.goto(BASE+'/traceur.html');await W(500);await page.evaluate(()=>localStorage.clear());await page.reload();await W(600);
await page.evaluate(()=>{const S=window.MAQ.state;S.lines=[
  {id:'L1',name:'Rue Principale',dn:150,bar:12,pts:[[0,0],[420,0]],specials:[{id:'R1',type:'reducer',m:135,dn2:125}],parent:null},
  {id:'L2',name:'Antenne A',dn:65,bar:12,pts:[[120,0],[120,90]],specials:[],parent:{line:'L1',m:120,side:1}},
  {id:'L3',name:'Antenne B',dn:80,bar:12,pts:[[260,0],[260,70]],specials:[],parent:{line:'L1',m:260,side:1}}];S.seq=4;window.MAQ.setMode('select');window.MAQ.rebuild();});
await page.click('#bSave');await W(200);await page.fill('#svName','Récap modifs test');await page.click('#svOk');await W(800);
await page.click('#svGo');await W(1600);await page.selectOption('#roleSel','ethan');await W(300);await T(()=>{try{window.TRACE.tuto.close(null);}catch(e){}});
const o={};
o.M=await T(()=>{const X=window.TRACE;const U=X.mod.api();return {marche:!!X.mod&&!!(U&&U.msTest('av').length),ml:(()=>{try{return null;}catch(e){return null;}})()};});
// m1 — compter sur l'antenne B (+ linéaire, + soudures), deux touchers sur la ligne
await T(()=>{const X=window.TRACE;X.state.tab='ts';X.renderAll();});await W(300);await T(()=>window.TRACE.mod.decl({fresh:true}));await W(300);
await T(()=>document.querySelector('#modal [data-mod="dcl-count"]').click());await W(250);await T(()=>document.querySelector('#modal [data-mod="ct-go"]').click());await W(400);
const P3=await T(()=>window.TRACE.mod.api().msTest('ap').find(l=>l.id==='L3').P);
await T(([a,b])=>{const X=window.TRACE;X.mod.pickTap(a[0],a[1]);X.mod.pickTap(b[0],b[1]);},[[P3[0][0],P3[0][1]+2],[P3[1][0],P3[1][1]-2]]);await W(200);
o.ct=await T(()=>{const U=window.TRACE.mod.api();return {tr:U.CT.tr.length,rows:U.ctCount().rows.map(r=>r.k+':'+r.dn+':'+r.q)};});
await T(()=>document.querySelector('#modPickBar [data-mod="ct-add"]').click());await W(400);
o.m1=await T(()=>{const U=window.TRACE.mod.api();const d=U.DC.draft;return {pts:d.pts.map(p=>({line:p.line,m:p.m})),tr:(d.tr||[]).length,lp:d.lignes.map(l=>(l.pts||[]).length),ui:document.querySelectorAll('#modal .dclPt').length};});
C.m1=o.ct.tr===1&&o.m1.pts.length===1&&o.m1.pts[0].line==='L3'&&Math.abs(o.m1.pts[0].m-35)<2&&o.m1.tr===1&&o.m1.lp.length>=2&&o.m1.lp.every(n=>n===1)&&o.m1.ui===1;
// m2 — enregistrer, repère unique + tronçon surligné
await page.fill('#modal [data-dcf="nom"]','Antenne B rallongée');await T(()=>document.querySelector('#modal [data-mod="dcl-save"]').click());await W(500);
o.m2=await T(()=>{const X=window.TRACE;const Mo=X.mod.of();const m=Mo.items.find(x=>x.nom==='Antenne B rallongée');X.state.tab='plan';X.renderAll();return m?{id:m.id,pts:(m.decl.pts||[]).length,tr:(m.decl.tr||[]).length,line:m.line,etat:m.etat}:null;});await W(500);
if(o.m2)o.m2.plan=await T(id=>({pins:document.querySelectorAll(`#tsG [data-modpin="${id}"]`).length,tr:document.querySelectorAll(`#tsG [data-modtr="${id}"]`).length}),o.m2.id);
C.m2=!!o.m2&&o.m2.pts===1&&o.m2.tr===1&&o.m2.line==='L3'&&o.m2.etat==='propose'&&o.m2.plan.pins===1&&o.m2.plan.tr===1;
// m3 — 2e modif (pour mémoire) : DN 80 → 100 sur 20 m, + 2 coudes DN 80
await T(()=>{const X=window.TRACE;X.state.tab='ts';X.renderAll();});await W(300);await T(()=>window.TRACE.mod.decl({fresh:true}));await W(300);
await T(()=>document.querySelector('#modal [data-mod="dcl-add:dn"]').click());await W(200);await page.selectOption('#modal [data-dcl="0:dnA"]','80');await page.selectOption('#modal [data-dcl="0:dnB"]','100');await page.fill('#modal [data-dcl="0:abs"]','20');await W(150);
await T(()=>document.querySelector('#modal [data-mod="dcl-add:piece"]').click());await W(200);await page.selectOption('#modal [data-dcl="1:k"]','coudes');await W(200);await page.fill('#modal [data-dcl="1:abs"]','2');await page.selectOption('#modal [data-dcl="1:dn"]','80');await W(150);
await T(()=>document.querySelector('#modal [data-mod="dcl-et:note"]').click());await W(200);await page.fill('#modal [data-dcf="nom"]','Mémoire DN');await T(()=>document.querySelector('#modal [data-mod="dcl-save"]').click());await W(500);
await T(()=>{const X=window.TRACE;X.state.tab='ts';X.renderAll();});await W(400);
const table=()=>T(()=>{const t=document.querySelector('#tsview .impT');if(!t)return null;const out={};let g='';[...t.querySelectorAll('tr')].forEach(tr=>{if(tr.classList.contains('impG')){g=tr.textContent.trim();out[g]={};return;}const td=[...tr.querySelectorAll('td')].map(x=>x.textContent.trim());if(g&&td.length===4)out[g][td[0]]=td.slice(1);});return out;});
const num=s=>parseFloat(String(s||'').replace(/\s/g,'').replace('−','-').replace(',','.'));
o.m3={t:await table(),list:await T(()=>{const d=document.querySelector('#tsview details.mdList');return d?{open:d.open,cards:d.querySelectorAll('.dclCard').length}:null;}),mar:await T(()=>{const X=window.TRACE;const M=X.state&&X.mod&&X.mod.api&&X.mod.api();return null;}),mlTot:await T(()=>{const n=document.querySelector('#tsview .tsMain tr:nth-child(2) td:nth-child(2)');return n?n.textContent.trim():null;})};
{const t=o.m3.t||{};const ml=t['Linéaire (m)']||{};const d80=ml['DN 80']||[],d100=ml['DN 100']||[],tot=ml['Total']||[];const so=(t['Soudures']||{})['DN 80']||[];const co=(t['Coudes']||{})['DN 80']||[];
 o.m3.chk={d80,d100,tot,so,co,dns:Object.keys(ml)};
 const add=num(d80[1]),av=num(d80[0]),ap=num(d80[2]);
 C.m3=!!o.m3.t&&['DN 150','DN 125','DN 80','DN 65','DN 100'].every(k=>ml[k])&&Math.abs(av-70)<1.5&&add>40&&Math.abs(ap-(av+add))<0.15&&num(d100[0])===0&&Math.abs(num(d100[1])-20)<0.01&&Math.abs(num(d100[2])-20)<0.01
   &&Math.abs(num(tot[0])-num(o.m3.mlTot))<1&&Math.abs(num(tot[2])-(num(tot[0])+num(tot[1])))<0.2&&so.length===3&&num(so[1])>0&&Math.abs(num(so[2])-(num(so[0])+num(so[1])))<0.01&&co.length===3&&num(co[1])===2&&!!o.m3.list&&o.m3.list.open&&o.m3.list.cards===2;}
// m4 — filtre TS
await T(()=>document.querySelector('#tsview [data-mod="imp-f:ts"]').click());await W(400);
o.m4={t:await table()};{const t=o.m4.t||{};const ml=t['Linéaire (m)']||{};o.m4.dns=Object.keys(ml);o.m4.co=!!t['Coudes'];o.m4.d80=ml['DN 80'];
 C.m4=!!o.m4.t&&!ml['DN 100']&&!o.m4.co&&!!o.m4.d80&&Math.abs(num(o.m4.d80[1])-num(o.m3.chk.d80[1])-20)<0.15;}
await T(()=>document.querySelector('#tsview [data-mod="imp-f:all"]').click());await W(300);
// m5 — rouvrir, ré-enregistrer
await T(id=>window.TRACE.mod.decl({edit:id}),o.m2&&o.m2.id);await W(300);o.m5={tr:await T(()=>(window.TRACE.mod.api().DC.draft.tr||[]).length)};
await T(()=>document.querySelector('#modal [data-mod="dcl-save"]').click());await W(500);
o.m5.after=await T(id=>{const X=window.TRACE;const m=X.mod.of().items.find(x=>x.id===id);X.state.tab='plan';X.renderAll();return m?(m.decl.tr||[]).length:-1;},o.m2&&o.m2.id);await W(300);
o.m5.plan=await T(id=>document.querySelectorAll(`#tsG [data-modtr="${id}"]`).length,o.m2&&o.m2.id);
C.m5=o.m5.tr===1&&o.m5.after===1&&o.m5.plan===1;
console.log('mesures :',J(o));
await b.close();C.m6=!errs.length;if(errs.length)console.log('erreurs',errs.slice(0,3));
console.log('RÉSULTATS',J(C));const ko=Object.entries(C).filter(([,v])=>!v).map(([k])=>k);console.log(ko.length?'RESULTAT: ECHEC '+ko.join(' '):'RESULTAT: TOUT VERT');process.exit(ko.length?1:0);
