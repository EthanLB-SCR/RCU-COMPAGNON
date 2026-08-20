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
out=await page.evaluate(()=>{const h=window.TRACE.hydro.of();const g=document.querySelector('#hydroG').innerHTML;return {water:h.water.length,fill:!!h.fill,skid:!!h.skid,gB:g.includes('B1'),gR:g.includes('REMPLISSAGE'),gS:g.includes('SKID')};});
console.log('💧 + 🚰 + skid posés et dessinés:',JSON.stringify(out));
// 7) Terminer → retour onglet hydro, chips + récap + total
await page.click('#hyDone');await page.waitForTimeout(500);
out=await page.evaluate(()=>({tab:window.TRACE.state.tab,chips:document.querySelectorAll('#hydro .hyChip').length,trCards:document.querySelectorAll('#hydro .hyTr').length,total:/Total chantier/.test(document.querySelector('#hydro').textContent),fillTr:window.TRACE.hydro.build().troncons.some(t=>t.hasFill)}));
console.log('retour onglet (chips, cartes, remplissage rattaché):',JSON.stringify(out));
// 8) alerte bouchon soudé : on soude le joint du bouchon d'une ligne finissant en endcap puis rebuild
out=await page.evaluate(()=>{const Ls=Object.values(window.TRACE.lines);let done=null;
  for(const L of Ls){const last=L.els[L.els.length-1];if(last&&last.kind==='endcap'){const iE=L.els.indexOf(last);const j=L.cond.A&&L.cond.A.joints[iE-1];if(j){j.status='controlee';done={line:L.id,weld:j.weldId};break;}}}
  if(!done)return {skip:'aucune ligne en endcap dans ce chantier de démo'};
  window.TRACE.renderAll();const H=window.TRACE.hydro.build();return {done,alerts:H.totals.nAlert,txt:/bouchon déjà soudé/i.test(document.querySelector('#hydro').textContent)};});
console.log('alerte bouchon soudé:',JSON.stringify(out));
// 9) suppression par chip ✕ (une coupe) → retour à 1 tronçon de moins
out=await page.evaluate(()=>{const n0=window.TRACE.hydro.build().troncons.length;const b=document.querySelector('#hydro [data-rmcut]');if(b)b.click();return {n0};});
await page.waitForTimeout(400);
out.n1=await page.evaluate(()=>window.TRACE.hydro.build().troncons.length);
console.log('suppression coupe par chip:',JSON.stringify(out));
// 10) persistance : NET.hydro écrit + repris par hydroOf après re-切替 d'onglet
out=await page.evaluate(()=>{const net=window.TRACE.net;return {saved:!!net.hydro,cuts:net.hydro.cuts.length,water:net.hydro.water.length,prest:net.hydro.prest.rincage};});
console.log('persisté dans le chantier:',JSON.stringify(out));
await page.screenshot({path:new URL('./e2e_hydro.png',import.meta.url).pathname,fullPage:false});
// 11) rôle soudeur : boutons désactivés
await page.evaluate(()=>{const u=window.TRACE.USERS.find(u=>u.role==='soudeur');window.TRACE.state.userId=u.id;window.TRACE.renderAll();});await page.waitForTimeout(300);
out=await page.evaluate(()=>({disabled:[...document.querySelectorAll('#hydro [data-pose]')].every(b=>b.disabled)}));
console.log('soudeur : pose désactivée:',JSON.stringify(out));
console.log(logs);await browser.close();
