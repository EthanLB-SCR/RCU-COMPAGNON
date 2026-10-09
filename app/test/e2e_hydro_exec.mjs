// HYDRAULIQUE — EXÉCUTION (Ethan 09/10) : section 5 de l'onglet, fiche d'épreuve (pressions → chute et résultat calculés), rinçage, photos, rapport de réalisation + PV
import { chromium } from 'playwright';
const BASE=process.env.BASE||'http://localhost:8765';
const browser=await chromium.launch({headless:true, executablePath: process.env.CHROMIUM_PATH||undefined});
const ctx=await browser.newContext({viewport:{width:1000,height:940}});const page=await ctx.newPage();
const logs=[];page.on('pageerror',e=>logs.push('PAGEERROR: '+e.message.slice(0,300)));page.on('console',m=>{if(m.type()==='error'&&!/supabase|Failed to fetch|net::ERR|404/i.test(m.text()))logs.push(m.text().slice(0,200));});
page.on('dialog',d=>d.accept().catch(()=>{}));
const C={};
await page.goto(BASE+'/traceur.html');await page.waitForTimeout(500);await page.evaluate(()=>{localStorage.clear();});await page.reload();await page.waitForTimeout(500);
await page.evaluate(()=>{const S=window.MAQ.state;S.supplier='RENALIA';S.lines=[{id:'L1',name:'Rue de la Gare',dn:150,bar:12,pts:[[10,50],[130,50]],specials:[],parent:null}];S.seq=2;window.MAQ.setMode('select');window.MAQ.rebuild();});
await page.click('#bSave');await page.waitForTimeout(200);await page.fill('#svName','Hydro exé');await page.click('#svOk');await page.waitForTimeout(700);await page.click('#svGo');await page.waitForTimeout(1500);await page.selectOption('#roleSel','ethan');await page.waitForTimeout(300);
const PNG='data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNkYPhfDwAChwGA60e6kgAAAABJRU5ErkJggg==';
// ── 1) section 5 : une ligne par prestation cochée (épreuve seule par défaut), « à faire », bouton Renseigner ; coche rinçage → 2 lignes
let out=await page.evaluate(()=>{const T=window.TRACE;T.state.tab='hydro';T.renderAll();const el=document.getElementById('hydro');const r={sec:/5 · Exécution/.test(el.textContent),rows:el.querySelectorAll('.hxRow').length,afaire:[...el.querySelectorAll('.hxTag')].map(t=>t.textContent),btn:!!el.querySelector('[data-hxedit][data-hxkind=epreuve]'),report:!!el.querySelector('#hyExecReport')};
  el.querySelector('.hyCard[data-p=rincage]').click();r.rows2=document.querySelectorAll('#hydro .hxRow').length;return r;});
console.log('1) section exécution :',JSON.stringify(out));C.c1=out.sec&&out.rows===1&&out.afaire[0]==='à faire'&&out.btn&&out.report&&out.rows2===2;
// ── 2) épreuve T1 : PS 16 → PE 20,8 proposée ; début 20,8 fin 20,7, chute admise 0,2 → chute 0,1 CONFORME ; photo ; enregistré → ligne « conforme » + résumé + miniature
await page.evaluate(()=>document.querySelector('#hydro [data-hxedit="0"][data-hxkind=epreuve]').click());await page.waitForTimeout(300);
out=await page.evaluate(()=>{const m=document.getElementById('modal');const v=k=>m.querySelector('[data-hx="'+k+'"]').value;return {open:m.classList.contains('show'),title:(m.querySelector('h3')||{}).textContent,ps:v('ps'),pe:v('pe'),date:v('date'),chef:v('chef'),fields:m.querySelectorAll('[data-hx]').length,calc:(m.querySelector('#hxCalc')||{}).textContent};});
await page.evaluate(PNG=>{const m=document.getElementById('modal');const set=(k,v)=>{const i=m.querySelector('[data-hx="'+k+'"]');i.value=v;i.dispatchEvent(new Event('input'));};set('pDebut','20,8');set('pFin','20.7');set('duree','60');set('equipe','Karim B., Sofiane K.');set('temoin','M. Durand (MOE)');set('tEau','12');set('mano','MN-07 étal. 03/2026');set('obs','RAS');
  // la photo passe normalement par l'appareil : on la pousse directement dans la liste en attente via l'input
  const dt=new DataTransfer();const b=atob(PNG.split(',')[1]);const u8=new Uint8Array(b.length);for(let i=0;i<b.length;i++)u8[i]=b.charCodeAt(i);dt.items.add(new File([u8],'mano.png',{type:'image/png'}));const inp=m.querySelector('#hxPhoto');inp.files=dt.files;inp.dispatchEvent(new Event('change'));},PNG);
await page.waitForTimeout(800);
out.calc2=await page.evaluate(()=>document.querySelector('#hxCalc').textContent);out.thumbs=await page.evaluate(()=>document.querySelectorAll('#hxThumbs .thumb').length);
await page.evaluate(()=>document.querySelector('#hxOk').click());await page.waitForTimeout(400);
out.after=await page.evaluate(()=>{const T=window.TRACE;const r=T.hydroExec.of(0,'epreuve');const el=document.getElementById('hydro');const row=[...el.querySelectorAll('.hxRow')][0];return {saved:!!r,pDebut:r&&r.pDebut,photos:r&&r.photos.length,ps:T.net.hydro.ps,tag:row.querySelector('.hxTag').textContent,sum:row.textContent,res:T.hydroExec.result('epreuve',r).code,thumb:row.querySelectorAll('.thumb').length,modal:document.getElementById('modal').classList.contains('show')};});
console.log('2) épreuve conforme :',JSON.stringify(out));
C.c2=out.open&&/Épreuve hydraulique — Tronçon 1/.test(out.title)&&out.ps==='16'&&out.pe==='20,8'&&/^\d{4}-\d{2}-\d{2}$/.test(out.date)&&out.chef==='Ethan L.'&&out.fields>=15&&/Renseigne les pressions/.test(out.calc)&&/0,1 bar/.test(out.calc2)&&/CONFORME/.test(out.calc2)&&!/NON CONFORME/.test(out.calc2)&&out.thumbs===1&&out.after.saved&&out.after.pDebut==='20,8'&&out.after.photos===1&&out.after.ps===16&&out.after.tag==='conforme'&&/chute 0,1 bar \/ 0,2 admis en 60 min/.test(out.after.sum)&&/1 photo/.test(out.after.sum)&&out.after.res==='ok'&&out.after.thumb===1&&!out.after.modal;
// ── 3) non conforme : chute 0,5 > 0,2 ; et pression d'épreuve non atteinte signalée
out=await page.evaluate(()=>{const T=window.TRACE;const e1=T.hydroExec.epreuve({pDebut:'20.8',pFin:'20.3',chuteAdm:'0.2',pe:'20.8'});const e2=T.hydroExec.epreuve({pDebut:'18',pFin:'18',chuteAdm:'0.2',pe:'20.8'});const e3=T.hydroExec.epreuve({pDebut:'',pFin:'',chuteAdm:'0.2'});return {c1:e1.chute,ok1:e1.ok,c2:e2.chute,ok2:e2.ok,ok3:e3.ok,lab:T.hydroExec.result('epreuve',{pDebut:'20.8',pFin:'20.3',chuteAdm:'0.2',pe:'20.8'}).label};});
console.log('3) non conforme :',JSON.stringify(out));C.c3=out.c1===0.5&&out.ok1===false&&out.c2===0&&out.ok2===false&&out.ok3===null&&out.lab==='non conforme';
// ── 4) rinçage T1 : débit proposé d'après la prépa, eau claire, résultat conforme choisi → « conforme »
await page.evaluate(()=>document.querySelector('#hydro [data-hxedit="0"][data-hxkind=rincage]').click());await page.waitForTimeout(300);
out=await page.evaluate(()=>{const m=document.getElementById('modal');const v=k=>m.querySelector('[data-hx="'+k+'"]').value;const r={debit:v('debit'),volume:v('volume')};m.querySelector('[data-hx=clarte]').value='claire';m.querySelector('[data-hx=volume]').value='4.2';m.querySelector('[data-hxres=ok]').click();m.querySelector('#hxOk').click();return r;});
await page.waitForTimeout(400);
out.after=await page.evaluate(()=>{const T=window.TRACE;const r=T.hydroExec.of(0,'rincage');const row=[...document.querySelectorAll('#hydro .hxRow')][1];return {clarte:r.clarte,result:r.result,tag:row.querySelector('.hxTag').textContent,sum:row.textContent};});
console.log('4) rinçage :',JSON.stringify(out));C.c4=+out.debit>0&&+String(out.volume).replace(',','.')>0&&out.after.clarte==='claire'&&out.after.result==='ok'&&out.after.tag==='conforme'&&/eau claire/.test(out.after.sum)&&/4,2 m³/.test(out.after.sum);
// ── 5) rapport de réalisation : une page de garde (tableau) + un PV par prestation renseignée, résultat, chute, photos, signatures ; s'ouvre dans une fenêtre
const popup=page.waitForEvent('popup');await page.evaluate(()=>document.querySelector('#hyExecReport').click());const pop=await popup;await pop.waitForLoadState('domcontentloaded');await page.waitForTimeout(500);
out=await pop.evaluate(()=>({title:document.title,h1:(document.querySelector('h1')||{}).textContent,pages:document.querySelectorAll('.page').length,pv:document.body.textContent.match(/PV D'ÉPREUVE HYDRAULIQUE — CONFORME/g)?.length||0,rin:/Rinçage dynamique — Tronçon 1/.test(document.body.textContent),chute:/Chute de pression mesurée/.test(document.body.textContent),imgs:document.querySelectorAll('.ph img').length,sig:document.querySelectorAll('table.sig').length,temoin:/M\. Durand/.test(document.body.textContent),print:!!document.querySelector('.np')}));
await pop.close();
console.log('5) rapport + PV :',JSON.stringify(out));C.c5=/Rapport de réalisation/.test(out.title)&&/Hydro exé/.test(out.h1)&&out.pages===2&&out.pv===1&&out.rin&&out.chute&&out.imgs===1&&out.sig===2&&out.temoin&&out.print;
// ── 6) persistance (partie hydro) après rechargement
const siteId=await page.evaluate(()=>window.TRACE.state.siteId);await page.reload();await page.waitForTimeout(1500);
for(let i=0;i<6;i++){await page.evaluate(id=>window.TRACE.go(id),siteId);try{await page.waitForFunction(()=>window.TRACE.state.siteId&&window.TRACE.state.screen==='site'&&Object.keys(window.TRACE.lines).length>0,null,{timeout:4000});break;}catch(e){}}
out=await page.evaluate(()=>{const T=window.TRACE;const r=T.hydroExec.of(0,'epreuve');return {saved:!!r,pDebut:r&&r.pDebut,photos:r&&r.photos.length,rin:!!T.hydroExec.of(0,'rincage')};});
console.log('6) rechargement :',JSON.stringify(out));C.c6=out.saved&&out.pDebut==='20,8'&&out.photos===1&&out.rin;
const bad=Object.entries(C).filter(([k,v])=>!v).map(([k])=>k);console.log(bad.length?'RESULTAT: ECHEC '+bad.join(','):'RESULTAT: TOUT VERT');console.log(logs.length?logs:'[]');
await browser.close();
