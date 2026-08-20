// Onglet Hydraulique : prestations, paramètres variables, pose ✂/💧/🚰/skid sur le plan, tronçons, volumes, by-pass, alerte bouchon soudé, rapport
import { chromium } from 'playwright';
const BASE=process.env.BASE||'http://localhost:8765';
const browser=await chromium.launch({headless:true, executablePath: process.env.CHROMIUM_PATH||undefined});
const ctx=await browser.newContext({viewport:{width:560,height:940}});const page=await ctx.newPage();
const logs=[];page.on('pageerror',e=>logs.push('PAGEERROR: '+e.message.slice(0,300)));page.on('console',m=>{if(m.type()==='error'&&!/supabase|Failed to fetch|net::ERR|404/i.test(m.text()))logs.push(m.text().slice(0,200));});
await page.goto(BASE+'/index.html');await page.waitForTimeout(900);
await page.evaluate(()=>window.TRACE.go());await page.waitForTimeout(900);
// 1) onglet présent, chef par défaut ? on force un chef pour les droits
await page.evaluate(()=>{const u=window.TRACE.USERS.find(u=>u.role==='chef');window.TRACE.state.userId=u.id;});
let out=await page.evaluate(()=>({tab:!!document.querySelector('#tabbar [data-tab=hydro]'),view:!!document.querySelector('#view-hydro')}));
console.log('onglet présent:',JSON.stringify(out));
await page.click('#tabbar [data-tab=hydro]');await page.waitForTimeout(500);
out=await page.evaluate(()=>{const H=window.TRACE.hydro.build();return {cards:document.querySelectorAll('#hydro .hyCard').length,on:document.querySelectorAll('#hydro .hyCard.on').length,tr:H.troncons.length,lenA:Math.round(H.totals.lenA),vol:+H.totals.vol.toFixed(2),mini:!!document.querySelector('#hydro svg'),pills:document.querySelectorAll('#hydro [data-pose]').length};});
console.log('état initial (épreuve cochée, 1 tronçon):',JSON.stringify(out));
// 2) cocher rinçage → BP requis aux extrémités + encart jaune
await page.click('#hydro .hyCard[data-p=rincage]');await page.waitForTimeout(400);
out=await page.evaluate(()=>{const H=window.TRACE.hydro.build();const ends=H.troncons.flatMap(t=>t.ends);return {flow:H.flow,nBP:H.totals.nBP,nKFL:H.totals.nKFL,debit:Math.round(H.troncons[0].debit),encart:/AVANT l.épreuve/.test(document.querySelector('#hydro').textContent),ends:ends.map(e=>e.need)};});
console.log('rinçage coché (flow, BP):',JSON.stringify(out));
// 3) paramètre variable : vitesse 1,5 → débit ×1,5
const d0=out.debit;
await page.evaluate(()=>{const i=document.querySelector('#hydro [data-hp=vitesse]');i.value='1.5';i.dispatchEvent(new Event('change'));});await page.waitForTimeout(400);
out=await page.evaluate(()=>Math.round(window.TRACE.hydro.build().troncons[0].debit));
console.log('vitesse 1,5 m/s → débit',d0,'→',out,':',Math.abs(out-d0*1.5)<=2?'OK':'KO');
// 4) pose d'une coupe : bouton ✂ → bascule sur le plan, bandeau visible, tap au milieu d'une ligne
await page.click('#hydro [data-pose=cut]');await page.waitForTimeout(400);
out=await page.evaluate(()=>({tab:window.TRACE.state.tab,bar:document.querySelector('#hydroBar').style.display!=='none',pose:window.TRACE.state.hydroPose}));
console.log('mode pose ✂ (plan + bandeau):',JSON.stringify(out));
// tap programmatique au chaînage du milieu de la plus longue ligne
out=await page.evaluate(()=>{const L=Object.values(window.TRACE.lines).sort((a,b)=>b.length-a.length)[0];
  const els=L.els;const mid=L.length/2;const e=els.find(e=>mid>=e.m0&&mid<=e.m1)||els[0];const pl=e.axis[0];const p=pl[Math.floor(pl.length/2)];
  window.TRACE.hydro.tap(p.x,p.y);const H=window.TRACE.hydro.build();return {cuts:H.cuts.length,tr:H.troncons.length,line:L.id};});
console.log('coupe posée → 2 tronçons:',JSON.stringify(out));
// 5) marqueurs sur le plan (overlay) + volumes qui se somment
out=await page.evaluate(()=>{const H=window.TRACE.hydro.build();const g=document.querySelector('#hydroG');return {overlay:g.innerHTML.includes('✂'),pastilles:g.querySelectorAll('circle').length>0,sum:+(H.troncons.reduce((s,t)=>s+t.vol,0)).toFixed(2),tot:+H.totals.vol.toFixed(2)};});
console.log('overlay plan (✂ + pastilles, volumes cohérents):',JSON.stringify(out));
// zoomé sur une extrémité BP, le badge texte apparaît (seuil 0,35 px/m)
out=await page.evaluate(()=>{const H=window.TRACE.hydro.build();const en=H.troncons.flatMap(t=>t.ends).find(e=>e.need==='BP');if(!en)return {skip:true};
  const l=window.TRACE.lines[en.line];const els=l.els;const e=els.find(x=>en.m>=x.m0&&en.m<=x.m1)||els[els.length-1];const p=e.axis[0][e.axis[0].length-1];
  window.TRACE.centerOn(p.x,p.y,2);return {badge:(document.querySelector('#hydroG').innerHTML.match(/BP/g)||[]).length>0};});
console.log('badge ⇄ BP visible zoomé:',JSON.stringify(out));
// 6) point d'eau + remplissage + skid
await page.evaluate(()=>{window.TRACE.state.hydroPose='water';const L=Object.values(window.TRACE.lines)[0];const p=L.els[0].axis[0][0];window.TRACE.hydro.tap(p.x+30,p.y+30);});
await page.evaluate(()=>{window.TRACE.state.hydroPose='fill';const L=Object.values(window.TRACE.lines)[0];const p=L.els[0].axis[0][0];window.TRACE.hydro.tap(p.x+30,p.y+34);});
await page.evaluate(()=>{window.TRACE.state.hydroPose='skid';const L=Object.values(window.TRACE.lines)[0];const p=L.els[0].axis[0][0];window.TRACE.hydro.tap(p.x+60,p.y+60);});
await page.waitForTimeout(400);
out=await page.evaluate(()=>{const h=window.TRACE.hydro.of();const g=document.querySelector('#hydroG').innerHTML;return {water:h.water.length,fills:h.fills.length,skids:h.skids.length,gB:g.includes('B1'),gR:g.includes('REMPLISSAGE'),gS:g.includes('SKID')};});
console.log('💧 + 🚰 + skid posés et dessinés:',JSON.stringify(out));
// 6b) 2e zone de remplissage sur l'autre tronçon → plus de tronçon sans zone
out=await page.evaluate(()=>{const T=window.TRACE;const H0=T.hydro.build();const t2=H0.troncons.find(t=>!t.hasFill&&t.lenA>50);let posed=false;
  if(t2){const sg=t2.segs[0];const l=T.lines[sg.line];const m=(sg.m0+sg.m1)/2;const e=l.els.find(e=>m>=e.m0&&m<=e.m1)||l.els[0];const p=e.axis[0][0];T.state.hydroPose='fill';T.hydro.tap(p.x+8,p.y+8);posed=true;}
  const H=T.hydro.build();return {posed,fills:T.hydro.of().fills.length,noFillAvant:H0.totals.noFill,noFillApres:H.totals.noFill};});
console.log('2e zone de remplissage:',JSON.stringify(out));
// 6c) pompe estimée présente quand rinçage coché
out=await page.evaluate(()=>{const H=window.TRACE.hydro.build();const t=H.troncons.find(t=>t.pump);return t?{q:t.pump.q,hmt:t.pump.hmt,okQ:t.pump.q>0,okH:t.pump.hmt>3&&t.pump.hmt<200}:{aucune:true};});
console.log('pompe (débit+HMT):',JSON.stringify(out));
// 7) Terminer → retour onglet hydro, chips + récap + total
await page.click('#hyDone');await page.waitForTimeout(500);
out=await page.evaluate(()=>({tab:window.TRACE.state.tab,chips:document.querySelectorAll('#hydro .hyChip').length,trCards:document.querySelectorAll('#hydro .hyTr').length,total:/Total chantier/.test(document.querySelector('#hydro').textContent),fillTr:window.TRACE.hydro.build().troncons.some(t=>t.hasFill)}));
console.log('retour onglet (chips, cartes, remplissage rattaché):',JSON.stringify(out));
// 8) alerte bouchon soudé : on soude le joint du bouchon d'une ligne finissant en endcap puis rebuild
out=await page.evaluate(()=>{const Ls=Object.values(window.TRACE.lines);let done=null;
  for(const L of Ls){const last=L.els[L.els.length-1];if(last&&last.kind==='endcap'){const iE=L.els.indexOf(last);const j=L.cond.A&&L.cond.A.joints[iE-1];if(j){j.status='controlee';done={line:L.id,weld:j.weldId};break;}}}
  if(!done)return {skip:'aucune ligne en endcap dans ce chantier de démo'};
  window.TRACE.renderAll();const H=window.TRACE.hydro.build();return {done,alerts:H.totals.nAlert,txt:/fond bombé déjà soudé/i.test(document.querySelector('#hydro').textContent)};});
console.log('alerte fond bombé soudé:',JSON.stringify(out));
// 8b) calendrier : ajout de 2 étapes par le formulaire (eau brute puis épreuve), frise + chips
await page.evaluate(()=>{document.querySelector('#hyCalOp').value='brut';document.querySelector('#hyCalT').value=String(window.TRACE.hydro.build().troncons[0].idx);document.querySelector('#hyCalD').value='2026-08-24';document.querySelector('#hyCalAdd').click();});
await page.waitForTimeout(300);
await page.evaluate(()=>{document.querySelector('#hyCalOp').value='epreuve';document.querySelector('#hyCalT').value=String(window.TRACE.hydro.build().troncons[0].idx);document.querySelector('#hyCalD').value='2026-08-26';document.querySelector('#hyCalAdd').click();});
await page.waitForTimeout(300);
out=await page.evaluate(()=>{const h=window.TRACE.hydro.of();return {n:h.cal.length,ordre:h.cal.map(c=>c.op).join('>'),frise:!!document.querySelector('#hydro svg circle'),chips:document.querySelectorAll('#hydro [data-rmcal]').length,dansCarte:/Calendrier/.test(document.querySelector('#hydro .hyTr')?.textContent||'')};});
console.log('calendrier (2 étapes, triées):',JSON.stringify(out));
// 8c) répéter la même opération une 2e fois (2 remplissages eau brute possibles)
await page.evaluate(()=>{document.querySelector('#hyCalOp').value='brut';document.querySelector('#hyCalD').value='2026-08-27';document.querySelector('#hyCalAdd').click();});
await page.waitForTimeout(300);
out=await page.evaluate(()=>({n:window.TRACE.hydro.of().cal.length,deuxBrut:window.TRACE.hydro.of().cal.filter(c=>c.op==='brut').length===2}));
console.log('opération répétable:',JSON.stringify(out));
// 9) suppression par chip ✕ (une coupe) → retour à 1 tronçon de moins
out=await page.evaluate(()=>{const n0=window.TRACE.hydro.build().troncons.length;const b=document.querySelector('#hydro [data-rmcut]');if(b)b.click();return {n0};});
await page.waitForTimeout(400);
out.n1=await page.evaluate(()=>window.TRACE.hydro.build().troncons.length);
console.log('suppression coupe par chip:',JSON.stringify(out));
// 10) persistance : NET.hydro écrit + repris par hydroOf après re-切替 d'onglet
out=await page.evaluate(()=>{const net=window.TRACE.net;return {saved:!!net.hydro,cuts:net.hydro.cuts.length,water:net.hydro.water.length,fills:net.hydro.fills.length,cal:net.hydro.cal.length,prest:net.hydro.prest.rincage};});
console.log('persisté dans le chantier:',JSON.stringify(out));
await page.screenshot({path:new URL('./e2e_hydro.png',import.meta.url).pathname,fullPage:false});
// 11) rôle soudeur : boutons désactivés
await page.evaluate(()=>{const u=window.TRACE.USERS.find(u=>u.role==='soudeur');window.TRACE.state.userId=u.id;window.TRACE.renderAll();});await page.waitForTimeout(300);
out=await page.evaluate(()=>({disabled:[...document.querySelectorAll('#hydro [data-pose]')].every(b=>b.disabled)}));
console.log('soudeur : pose désactivée:',JSON.stringify(out));
console.log(logs);await browser.close();
