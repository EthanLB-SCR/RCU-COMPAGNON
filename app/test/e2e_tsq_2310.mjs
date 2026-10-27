// 23/10 (Ethan : « déplacer une réduction par rapport au tracé initial, qui change des DN, est aussi une modif : il faut que la modif montre le changement de DN et les
// fournitures supprimées et remplacées ; pareil, une antenne qui change de DN c'est une modification »). Réseau FICTIF du traceur : L1 DN 150, 120 m, réduction en DN 100
// à PK 70 ; L2 (antenne fictive) DN 65, 30 m. Marché retouché : la réduction était à PK 95 (DN 150 jusqu'à 95) ; L2 était en DN 80.
// c1 le marché figé porte le profil de DN (dnp) ; l'écart de ligne L1 = « DN 150 → DN 100 sur 25 ml (PK ~70 → 95) », L2 = « DN 80 → DN 65 sur toute la ligne »
// c2 deux candidats kind 'dn' (pas d'écart de quantité) : libellé + bloc Fournitures (retiré : 25 ml tube DN 150, n manchons DN 150 · posé : 25 ml DN 100…) ; plan d'ensemble : tronçon surligné
// c3 qualifier (TS proposé via fenêtre) → marque 'dn' : « Cette modif compte : changement de DN », fournitures, le candidat disparaît, export avec « DN 150 → 100 : −25 ml DN 150 / +25 ml DN 100 »
// c4 marché d'avant (sans dnp) : complété au chargement si mêmes réductions (dnpGuess), sinon « marché figé sans le profil de DN » ; aucun écart de DN inventé
// c5 téléphone 390 : pas de débordement · c6 console.
import { chromium } from 'playwright';
const BASE=process.env.BASE||'http://localhost:8765';const SHOTS=process.env.SHOTS||null;
const browser=await chromium.launch({headless:true, executablePath: process.env.CHROMIUM_PATH||undefined});
const C={};const logs=[];
async function mk(vp){const ctx=await browser.newContext({viewport:vp,deviceScaleFactor:1});const page=await ctx.newPage();
  page.on('pageerror',e=>logs.push('PAGEERROR: '+e.message.slice(0,300)));page.on('console',m=>{if(m.type()==='error'&&!/supabase|Failed to fetch|net::ERR|404|geopf|WebSocket/i.test(m.text()))logs.push(m.text().slice(0,200));});page.on('dialog',d=>d.accept().catch(()=>{}));
  await page.goto(BASE+'/traceur.html');await page.waitForTimeout(500);await page.evaluate(()=>localStorage.clear());await page.reload();await page.waitForTimeout(500);
  await page.evaluate(()=>{const S=window.MAQ.state;S.lines=[{id:'L1',name:'Feeder fictif',dn:150,bar:12,pts:[[0,100],[120,100]],specials:[{id:'R1',m:70,type:'reducer',dn2:100}],parent:null},{id:'L2',name:'Antenne fictive',dn:65,bar:12,pts:[[0,150],[30,150]],specials:[],parent:null}];S.seq=3;window.MAQ.setMode('select');window.MAQ.rebuild();});
  await page.click('#bSave');await page.waitForTimeout(200);await page.fill('#svName','DN modifs');await page.click('#svOk');await page.waitForTimeout(800);
  await page.click('#svGo');await page.waitForTimeout(1500);await page.selectOption('#roleSel','ethan');await page.waitForTimeout(300);
  // marché : réduction à PK 95 (DN 150 jusqu'à 95) ; L2 en DN 80
  const info=await page.evaluate(()=>{const T=window.TRACE;const M=T.ts.ensureMarche(true);const a=M.lines.find(x=>x.id==='L1'),b=M.lines.find(x=>x.id==='L2');const dnp0=JSON.parse(JSON.stringify(a.dnp));
    const L=a.dnp[a.dnp.length-1].m1;a.dnp=[{m0:0,m1:95,dn:150},{m0:95,m1:L,dn:100}];a.pcs.forEach(p=>{if(p.k==='reducer')p.m=95;}); /* 23/10 soir : la réduction du marché était au PK 95 (pièces aussi) */b.dn=80;b.dnp=[{m0:0,m1:b.dnp[b.dnp.length-1].m1,dn:80}];M.at=new Date(Date.now()+1000).toISOString();
    T.state.tab='ts';T.renderAll();return {dnp0,hasDnp:!!dnp0.length};});
  await page.waitForTimeout(300);return {ctx,page,info};}
const shot=async(page,n)=>{if(SHOTS)await page.screenshot({path:`${SHOTS}/tsq_${n}.png`});};
let {ctx,page,info}=await mk({width:1366,height:900});
// ── c1
let o=await page.evaluate(()=>{const D=window.TRACE.ts.diff();return {dnd:Object.fromEntries(D.rows.map(r=>[r.id,r.dnd])),changed:D.changed.map(r=>r.id),d:D.rows.map(r=>[r.id,r.d.ml,r.d.soud])};});
console.log('c1) profil de DN :',JSON.stringify({dnp0:info.dnp0,o}));
const d1=o.dnd.L1||[],d2=o.dnd.L2||[];
C.c1=info.hasDnp&&info.dnp0.length===2&&info.dnp0[0].dn===150&&info.dnp0[1].dn===100&&d1.length===1&&d1[0].from===150&&d1[0].to===100&&Math.abs(d1[0].m1-95)<0.5&&Math.abs(d1[0].m0-70)<2&&d2.length===1&&d2[0].from===80&&d2[0].to===65&&Math.abs(d2[0].m0)<0.5&&d2[0].m1>29&&o.changed.join(',')==='L1,L2'&&o.d.every(x=>x[1]===0&&x[2]===0);
// ── c2 candidats 'dn'
o=await page.evaluate(()=>{const T=window.TRACE;const cs=T.ts.candidates();const cards=[...document.querySelectorAll('#tsview .tsCard.cand')].map(c=>c.textContent.replace(/[\s  ]+/g,' ').trim());const svg=document.querySelector('#tsview .tsOverview svg');return {cs:cs.map(c=>({kind:c.kind,line:c.line,label:c.label,dnq:c.dnq,m:c.m,pcs:(c.pcs||[]).length,reduc:(c.qty||{}).reduc||0})),cards,paths:svg?svg.querySelectorAll('path[stroke-dasharray]').length:0,minis:[...document.querySelectorAll('#tsview .tsOverview [data-tscandmini] text')].map(t=>t.textContent)};});
await shot(page,'2_candidats');console.log('c2) candidats :',JSON.stringify({cs:o.cs,cards:o.cards.map(x=>x.slice(0,220)),paths:o.paths,minis:o.minis}));
const c1=o.cs.find(c=>c.line==='L1'),c2=o.cs.find(c=>c.line==='L2');
C.c2=o.cs.length===2&&o.cs.every(c=>c.kind==='dn')&&!!c1&&/^2[45],?\d* ml( et \d soudures?)? passent du DN 150 au DN 100 \(PK 7\d(,\d)? → 95\) · réduction déplacée du PK 95 au PK 70$/.test(c1.label)&&c1.pcs===4&&c1.reduc===0&&c1.dnq[0].ml>=24&&c1.dnq[0].ml<=25.5&&!!c2&&/^30 ml, 2 fins de ligne et 8 soudures passent du DN 80 au DN 65 \(toute la ligne\)/.test(c2.label)
  &&o.cards.some(t=>/Pièce — réduction déplacée du PK 95 au PK 70 · Fournitures — retiré : 2[45],?\d* ml de tube DN 150/.test(t)&&/posé à la place : 2[45],?\d* ml de tube DN 100/.test(t))&&o.cards.some(t=>/retiré : 30 ml de tube DN 80/.test(t)&&/manchons DN 80/.test(t))&&o.minis.length===2&&o.minis.join()==='a,b'; /* 27/10 soir : lettres des candidats */
// ── c3 qualifier L1 en TS proposé
const i1=o.cs.findIndex(c=>c.line==='L1');await page.selectOption(`#tsview [data-tscet="${i1}"]`,'propose');await page.click(`#tsview [data-tscok="${i1}"]`);await page.waitForTimeout(300);
const modal=await page.evaluate(()=>!!document.querySelector('#modal #tsqDevis'));if(modal){await page.fill('#modal #tsqDesig','Réduction déplacée');await page.fill('#modal #tsqDevis','DEV-DN1');await page.click('#modal #tsqOk');await page.waitForTimeout(400);}
o=await page.evaluate(()=>{const T=window.TRACE;const it=T.ts.of().items.find(x=>x.kind==='dn');const card=document.querySelector('#tsview .tsCard:not(.cand)');const html=T.doe.tsHTML();return {it:it?{etat:it.etat,ts:it.ts,dnq:it.dnq.length,m:it.m,located:it.located,pcs:(it.pcs||[]).length}:null,cands:T.ts.candidates().map(c=>c.line),card:card?card.textContent.replace(/[\s  ]+/g,' ').trim().slice(0,900):null,exp:/DN 150 → 100 : −2[45],?\d* ml DN 150 \/ \+2[45],?\d* ml DN 100/.test(html)&&/changement de DN/.test(html),pos:!!window.TRACE.ts.candidates&&!!(it&&it.m!=null)};});
await shot(page,'3_qualifie');console.log('c3) qualifié :',JSON.stringify({modal,o:{...o,card:o.card&&o.card.slice(0,200)}}));
C.c3=modal&&!!o.it&&o.it.etat==='propose'&&o.it.ts==='DEV-DN1'&&o.it.dnq===1&&o.it.located&&o.pos&&o.cands.join(',')==='L2'&&o.it.pcs===4&&/Cette modif compte : changement de DN/.test(o.card)&&/Fournitures — retiré/.test(o.card)&&o.exp;
await ctx.close();
// ── c4 marché d'avant (sans dnp) : complété (mêmes réductions) ; puis une ligne dont le nombre de réductions a changé → « sans le profil de DN », pas d'écart inventé
({ctx,page,info}=await mk({width:1366,height:900}));
o=await page.evaluate(()=>{const T=window.TRACE;const M=T.ts.marche();M.lines.forEach(x=>{delete x.dnp;delete x.dnpGuess;});M.at=new Date(Date.now()+2000).toISOString();const M2=T.ts.ensureMarche(false);
  const a=M2.lines.find(x=>x.id==='L1');const D=T.ts.diff();const r1=D.rows.find(x=>x.id==='L1');return {guess:!!a.dnpGuess,dnp:a.dnp,dnd:r1.dnd,unknown:r1.dnpUnknown,cands:T.ts.candidates().length};});
const o2=await page.evaluate(()=>{const T=window.TRACE;const M=T.ts.marche();const a=M.lines.find(x=>x.id==='L1');delete a.dnp;delete a.dnpGuess;a.c.reduc=4;M.at=new Date(Date.now()+3000).toISOString();T.ts.ensureMarche(false);const D=T.ts.diff();const r1=D.rows.find(x=>x.id==='L1');T.renderAll();return {dnp:a.dnp||null,unknown:r1.dnpUnknown,dnd:r1.dnd,txt:/marché figé sans le profil de DN/.test(document.getElementById('tsview').textContent),cands:T.ts.candidates().filter(c=>c.line==='L1').length};});
/* 23/10 soir : le chef renseigne les DN du marché à la main (fenêtre) → le changement de DN apparaît, avec la réduction déplacée */
const hasBtn=await page.evaluate(()=>!!document.querySelector('#tsview [data-tsdnp="L1"]'));await page.evaluate(()=>document.querySelector('#tsview [data-tsdnp="L1"]').click());await page.waitForTimeout(300);
const o3=await page.evaluate(()=>{const m=document.getElementById('modal');return {show:m.classList.contains('show'),dn0:(m.querySelector('#tsDnp0')||{}).value,rows:[...m.querySelectorAll('.tsDnpR')].map(r=>[r.querySelector('[data-dnpm]').value,r.querySelector('[data-dnpdn]').value])};});
await page.evaluate(()=>{const r=document.querySelector('#modal .tsDnpR');r.querySelector('[data-dnpm]').value='95';r.querySelector('[data-dnpdn]').value='100';document.getElementById('tsDnpOk').click();});await page.waitForTimeout(500);
const o4=await page.evaluate(()=>{const T=window.TRACE;const a=T.ts.marche().lines.find(x=>x.id==='L1');const D=T.ts.diff();const r1=D.rows.find(x=>x.id==='L1');const cs=T.ts.candidates().filter(c=>c.line==='L1');return {dnp:a.dnp,by:a.dnpBy,guess:!!a.dnpGuess,dnd:r1.dnd,unknown:r1.dnpUnknown,cands:cs.map(c=>c.kind+':'+c.label),txt:/sans le profil de DN|Marché figé avant le 23\/10/.test(document.getElementById('tsview').textContent)};});
console.log('c4) marché d\'avant :',JSON.stringify({o,o2,hasBtn,o3,o4}));
C.c4=hasBtn&&o3.show&&o3.dn0==='150'&&o3.rows.length>=1&&o4.dnp.length===2&&o4.dnp[0].m1===95&&o4.dnp[1].dn===100&&o4.by==='Ethan L.'&&!o4.guess&&o4.dnd.length===1&&!o4.unknown&&o4.cands.length===1&&/^dn:2[45],?\d* ml( et \d soudures?)? passent du DN 150 au DN 100 \(PK 7\d(,\d)? → 95\) · réduction déplacée du PK 95 au PK 70$/.test(o4.cands[0])&&!o4.txt&&o.guess&&o.dnp.length===2&&Math.abs(o.dnp[0].m1-95.5)<1&&o.dnd.length===1&&Math.abs(o.dnd[0].m0-70.5)<1&&!o.unknown&&o.cands===2&&o2.dnp===null /* 23/10 soir : profil reconstitué depuis les pièces du marché → la réduction déplacée est vue */&&o2.unknown&&o2.dnd.length===0&&o2.cands===1; /* profil inconnu : pas de changement de DN inventé, la réduction déplacée reste visible comme pièces (zone PK 70 → 95 : +2 / −2 réductions) */
await ctx.close();
// ── c5 téléphone
({ctx,page}=await mk({width:390,height:844}));o=await page.evaluate(()=>({sw:document.documentElement.scrollWidth,w:window.innerWidth,n:document.querySelectorAll('#tsview .tsCard.cand').length}));await shot(page,'5_tel');
console.log('c5) téléphone :',JSON.stringify(o));C.c5=o.sw<=o.w+1&&o.n===2;await ctx.close();
console.log('erreurs console :',JSON.stringify(logs));C.c6=logs.length===0;
const ko=Object.entries(C).filter(([k,v])=>!v).map(([k])=>k);console.log(JSON.stringify(C));console.log(ko.length?'RESULTAT: KO '+ko.join(','):'RESULTAT: TOUT VERT');
await browser.close();
