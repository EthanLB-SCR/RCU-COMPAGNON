// AFFAIRES · COMMERCE (nuit 09→10/10) : liste et filtres, création, fiche (champs enregistrés), chiffrage par DN calé sur le tableau V2B (Saint-Lô zone bleue :
// DN250 × 540 soudures → 172 773 € de soudure, 48 952 € de manchons), chapitres, récap (marge 8 %, RCFA client), facturation mensuelle + situations, chantiers liés + pré-remplissage depuis le tracé ; droits (Karim ne voit pas).
import { chromium } from 'playwright';
const BASE=process.env.BASE||'http://localhost:8765';
const browser=await chromium.launch({headless:true, executablePath: process.env.CHROMIUM_PATH||undefined});
const ctx=await browser.newContext({viewport:{width:430,height:900}});const page=await ctx.newPage();
const logs=[];page.on('pageerror',e=>logs.push('PAGEERROR: '+e.message.slice(0,300)));page.on('console',m=>{if(m.type()==='error'&&!/supabase|Failed to fetch|net::ERR|404|WebSocket/i.test(m.text()))logs.push(m.text().slice(0,200));});
page.on('dialog',d=>d.accept('TS1').catch(()=>{}));
const C={};const wait=ms=>page.waitForTimeout(ms);
await page.goto(BASE+'/index.html');await wait(600);await page.evaluate(()=>{localStorage.clear();});await page.evaluate(()=>new Promise(r=>{try{const q=indexedDB.deleteDatabase('trace-kv');q.onsuccess=q.onerror=q.onblocked=()=>r();}catch(e){r();}}));
await page.reload();await wait(1200);
const skip=async()=>{const s=await page.$('#loginSkip');if(s&&await s.isVisible())await s.click();await wait(700);};await skip();
const chg=async(sel,val)=>page.evaluate(([s,v])=>{const el=document.querySelector(s);el.value=v;el.dispatchEvent(new Event('change',{bubbles:true}));},[sel,val]);
// ── 1) Karim (soudeur) : pas de ligne Affaires ; Ethan (admin) : Exploitation → Affaires, liste vide, création O2610-01
let out=await page.evaluate(async()=>{const T=window.TRACE;T.state.userId='karim';T.renderHome();const r={karimExpl:document.getElementById('htExpl').style.display};T.state.userId='ethan';T.renderHome();document.getElementById('htExpl').click();await new Promise(x=>setTimeout(x,200));
  r.rows=[...document.querySelectorAll('#eq-app .ac-row .tx > b')].map(b=>b.textContent);const row=[...document.querySelectorAll('#eq-app .ac-row')].find(x=>/Affaires · commerce/.test(x.textContent));row.click();await new Promise(x=>setTimeout(x,200));
  r.title=(document.querySelector('#eq-app h2.vt')||{}).textContent;r.empty=/Aucune affaire/.test(document.getElementById('eq-app').textContent);r.stats=document.querySelectorAll('#eq-app .ac-stat').length;
  document.querySelector('#eq-app [data-act=af][data-v="new|"]').click();await new Promise(x=>setTimeout(x,150));r.form=!!document.getElementById('afn-num');
  document.getElementById('afn-num').value='O2610-01';document.getElementById('afn-nom').value='Saint-Lô — Zone bleue';document.getElementById('afn-client').value='CORIANCE';document.getElementById('afn-ville').value='Saint-Lô';document.getElementById('afn-cp').value='50000';document.getElementById('afn-etat').value='devis';document.getElementById('afn-montant').value='1800000';
  document.querySelector('#eq-app [data-act=af][data-v="create|"]').click();await new Promise(x=>setTimeout(x,250));r.fiche=(document.querySelector('#eq-app .af-num')||{}).textContent;r.h2=(document.querySelector('#eq-app .af-head h2')||{}).textContent;r.tabs=[...document.querySelectorAll('#eq-app .eq-filtres .chip')].map(c=>c.textContent.trim());return r;});
console.log('1) accès + création :',JSON.stringify(out));
C.c1=out.karimExpl==='none'&&out.rows.some(t=>/Affaires · commerce/.test(t))&&/Affaires/.test(out.title)&&out.empty&&out.stats===5&&out.form&&/O2610-01/.test(out.fiche)&&/Devis/.test(out.fiche)&&/Saint-Lô — Zone bleue/.test(out.h2)&&out.tabs.join()==='Fiche,DCE · documents,Chiffrage,Facturation,Chantiers liés';
// ── 2) fiche : un champ modifié est enregistré (registre) ; chiffrage : zone + DN 250 × 540 soudures / 1075 ml → chiffres du tableau V2B
await chg('#eq-app [data-afin=charge]','ELB');await wait(100);
out=await page.evaluate(()=>({charge:(window.TRACE.affaires.get('O2610-01')||{}).charge}));
await page.evaluate(()=>{document.querySelector('#eq-app [data-act=af][data-v="tab|chiffrage"]').click();});await wait(150);
await page.evaluate(()=>{document.querySelector('#eq-app [data-act=af][data-v="zoneadd|"]').click();});await wait(150);
await chg('#eq-app [data-afz="0|dn"]','250');await wait(100);await chg('#eq-app [data-afz="0|nb"]','540');await wait(100);await chg('#eq-app [data-afz="0|ml"]','1075');await wait(150);
out.ch=await page.evaluate(()=>{const T=window.TRACE;const a=T.affaires.get('O2610-01');const C=T.affaires.calc(a);const Z=C.zones[0];const r=Z.rows[0];return {dn:r.dn,pouces:r.pouces,pPouce:+r.pPouce.toFixed(3),soud:+r.soud.toFixed(2),manch:+r.manch.toFixed(2),auto:+r.auto.toFixed(2),jS:+r.jS.toFixed(2),rcfaPct:C.rcfaPct,vente:Math.round(C.vente),total:Math.round(C.total),achat:Math.round(C.achat),txt:document.getElementById('eq-app').textContent.replace(/\s+/g,' ')};});
console.log('2) fiche + chiffrage V2B :',JSON.stringify({...out,ch:{...out.ch,txt:out.ch.txt.slice(0,80)}}));
C.c2=out.charge==='ELB'&&out.ch.dn===250&&out.ch.pouces===5400&&out.ch.pPouce===31.995&&out.ch.soud===172773&&out.ch.manch===48952.35&&out.ch.auto===8638.65&&out.ch.jS===67.5&&out.ch.rcfaPct===0.05&&out.ch.achat===Math.round(172773+48952.35+8638.65+(27*125)+3*1945)&&out.ch.vente===Math.round(out.ch.achat/0.92)&&out.ch.total===Math.round(out.ch.vente*1.05)&&/172 773/.test(out.ch.txt)&&/48 952/.test(out.ch.txt)&&/RCFA 5/.test(out.ch.txt);
// ── 3) chapitre + facturation (mois, situations → dépôt alimente le mois) + sous-affaire
await page.evaluate(()=>{document.querySelector('#eq-app [data-act=af][data-v="chapadd|"]').click();});await wait(150);await chg('#eq-app [data-afc="0|achat"]','104378.37');await wait(150);
out=await page.evaluate(()=>{const T=window.TRACE;const a=T.affaires.get('O2610-01');const C=T.affaires.calc(a);return {chap:C.chap,achat:Math.round(C.achat)};});
await page.evaluate(()=>{document.querySelector('#eq-app [data-act=af][data-v="tab|fact"]').click();});await wait(150);
const y=new Date().getFullYear();await chg(`#eq-app [data-aff="${y}-03"]`,'82597.4');await wait(100);await chg(`#eq-app [data-aff="${y}-04"]`,'44612');await wait(150);
out.fact=await page.evaluate(()=>{const txt=document.getElementById('eq-app').textContent.replace(/\s+/g,' ');return {cumul:/127 209 €/.test(txt),restant:/1 672 791 €/.test(txt),pct:/7 %/.test(txt)};});
await page.evaluate(()=>{document.querySelector('#eq-app [data-act=af][data-v="sitadd|"]').click();});await wait(150);
out.sit=await page.evaluate(async()=>{const T=window.TRACE;const a=T.affaires.get('O2610-01');const s=a.situations[0];const set=(k,v)=>{const el=document.querySelector(`#eq-app [data-afs="${s.id}|${k}"]`);el.value=v;el.dispatchEvent(new Event('change',{bubbles:true}));};set('mois',new Date().getFullYear()+'-06');await new Promise(r=>setTimeout(r,80));set('montant','237099');await new Promise(r=>setTimeout(r,80));set('num','FAC-00070');await new Promise(r=>setTimeout(r,80));set('etape','depot');await new Promise(r=>setTimeout(r,150));const a2=T.affaires.get('O2610-01');return {n:a2.situations.length,etape:a2.situations[0].etape,num:a2.situations[0].num,juin:a2.fact[new Date().getFullYear()+'-06']};});
await page.evaluate(()=>{document.querySelector('#eq-app [data-act=af][data-v="tab|fiche"]').click();});await wait(120);
await page.evaluate(()=>{document.querySelector('#eq-app [data-act=af][data-v="sub|"]').click();});await wait(200);
out.sub=await page.evaluate(()=>{const T=window.TRACE;const s=T.affaires.get('O2610-01-TS1');return {exists:!!s,client:s&&s.client,fiche:(document.querySelector('#eq-app .af-num')||{}).textContent,parentLink:!!document.querySelector('#eq-app .af-num .lnk')};});
console.log('3) chapitre + facturation + sous-affaire :',JSON.stringify(out));
C.c3=out.chap===104378.37&&out.fact.cumul&&out.fact.restant&&out.fact.pct&&out.sit.n===1&&out.sit.etape==='depot'&&out.sit.num==='FAC-00070'&&out.sit.juin===237099&&out.sub.exists&&out.sub.client==='CORIANCE'&&/O2610-01-TS1/.test(out.sub.fiche)&&out.sub.parentLink;
// ── 4) retour à la liste : 2 affaires, filtres par état ; chantiers liés : lier le chantier de démo → pré-remplir le chiffrage depuis le tracé (copie de l'appareil)
out=await page.evaluate(async()=>{document.querySelector('#eq-app [data-act=af][data-v="back|"]').click();await new Promise(r=>setTimeout(r,150));const r={n:document.querySelectorAll('#eq-app .af-row').length,txt:document.getElementById('eq-app').textContent.replace(/\s+/g,' ')};
  document.querySelector('#eq-app [data-act=af][data-v="etat|devis"]').click();await new Promise(r2=>setTimeout(r2,150));r.devis=document.querySelectorAll('#eq-app .af-row').length;document.querySelector('#eq-app [data-act=af][data-v="etat|"]').click();await new Promise(r2=>setTimeout(r2,120));
  [...document.querySelectorAll('#eq-app .af-row')].find(x=>/O2610-01 ·/.test(x.textContent)).click();await new Promise(r2=>setTimeout(r2,150));document.querySelector('#eq-app [data-act=af][data-v="tab|sites"]').click();await new Promise(r2=>setTimeout(r2,150));
  const sel=document.getElementById('afs-site');r.opts=sel.options.length;sel.value=[...sel.options].find(o=>o.value&&o.value!=='__vide').value;document.querySelector('#eq-app [data-act=af][data-v="link|"]').click();await new Promise(r2=>setTimeout(r2,150));r.linked=(window.TRACE.affaires.get('O2610-01').sites||[]).length;r.traceBtn=!!document.querySelector('#eq-app [data-act=tabgo][data-v=traceur]');
  document.querySelector('#eq-app [data-act=af][data-v="tab|chiffrage"]').click();await new Promise(r2=>setTimeout(r2,150));const s2=document.getElementById('afz-site');s2.value=s2.options[1].value;document.querySelector('#eq-app [data-act=af][data-v="prefill|"]').click();await new Promise(r2=>setTimeout(r2,250));
  const a=window.TRACE.affaires.get('O2610-01');const z=a.chiffrage.zones[0];r.rows=z.rows.length;r.nb=z.rows.reduce((s,x)=>s+x.nb,0);r.ml=z.rows.reduce((s,x)=>s+x.ml,0);r.src=z.source;r.dns=z.rows.map(x=>x.dn);return r;});
console.log('4) liste + chantiers liés + pré-remplissage :',JSON.stringify({...out,txt:out.txt.slice(0,120)}));
C.c4=out.n===2&&/2affaires|2 affaires/.test(out.txt.replace(/\s/g,' '))&&out.devis===2&&out.opts>=2&&out.linked===1&&out.traceBtn&&out.rows>=1&&out.nb>100&&out.ml>100&&!!out.src;
const bad=Object.entries(C).filter(([k,v])=>!v).map(([k])=>k);console.log(bad.length?'RESULTAT: ECHEC '+bad.join(','):'RESULTAT: TOUT VERT');console.log(logs.length?logs:'[]');
await browser.close();
