// e2e_urg_0111.mjs — 01/11 soir : points « à corriger avant demain matin » relevés au tournage (version du 31/10 au soir), avant le test terrain du 02/11.
//  u1 pointage : l'heure enregistrée est celle du TOUCHER, pas celle du dernier affichage (écran ouvert à 7 h 04, « Commencer » touché à 7 h 28 → 7 h 28) ; pause et fin aussi
//  u2 note de frais : « 4,60 » tapé = 4,60 € (champ texte, clavier décimal, montant relu sous le champ) ; « 4,605 » illisible → refus clair
//  u3 note de frais : 460 € → avertissement « Montant élevé », rien d'enregistré ; 2e appui → enregistré ; même montant le même jour (< 15 min) → avertissement doublon
//  u4 console propre
//  (fils au manchon décrits sans jugement : e2e_dh4 ; barre opaque des assistants du véhicule : e2e_vm_2010 c8)
import { chromium } from 'playwright';
const BASE=process.env.BASE||'http://localhost:8765';
const browser=await chromium.launch({headless:true, executablePath: process.env.CHROMIUM_PATH||undefined});
const C={};const logs=[];const J=x=>JSON.stringify(x);
const ctx=await browser.newContext({viewport:{width:390,height:844},hasTouch:true,isMobile:true});const page=await ctx.newPage();
page.on('pageerror',e=>logs.push('PAGEERROR: '+e.message.slice(0,300)));page.on('console',m=>{if(m.type()==='error'&&!/supabase|Failed to fetch|net::ERR|404|geopf|WebSocket|open-meteo/i.test(m.text()))logs.push(m.text().slice(0,200));});page.on('dialog',d=>d.accept().catch(()=>{}));
await ctx.route(u=>/(^|\.)geopf\.fr$|^geo\.api\.gouv\.fr$|open-meteo\.com$/.test(u.hostname),r=>r.fulfill({status:200,contentType:'application/json',body:'[]'}));
const wait=ms=>page.waitForTimeout(ms);
await page.clock.install({time:new Date(2026,10,2,7,4,0)}); /* lundi 02/11/2026, 7 h 04 */
await page.goto(BASE+'/index.html');await wait(600);await page.evaluate(()=>{localStorage.clear();});await page.evaluate(()=>new Promise(r=>{try{const q=indexedDB.deleteDatabase('trace-kv');q.onsuccess=q.onerror=q.onblocked=()=>r();}catch(e){r();}}));
await page.reload();await wait(1500);{const sk=await page.$('#loginSkip');if(sk&&await sk.isVisible())await sk.click();await wait(800);}
await page.evaluate(()=>{const T=window.TRACE;T.state.userId='karim';document.getElementById('htEspace').click();});await wait(500);
const sub=async re=>{await page.evaluate(src=>{const re2=new RegExp(src);const c=[...document.querySelectorAll('#eq-app .eq-subs .chip')].find(x=>re2.test(x.textContent));if(c)c.click();},re.source);await wait(350);};
const evts=()=>page.evaluate(()=>{const P=window.TRACE.espace.state().pointages||{};const all=Object.values(P).flatMap(x=>Array.isArray(x)?x:[x]).filter(x=>x&&x.d==='2026-11-02');return all.flatMap(x=>(x.events||[]).map(e=>e.t+'@'+String(e.at).slice(11,16)));});
/* ── u1 : pointage */
await sub(/Accueil/);
let o={card:await page.evaluate(()=>!!document.querySelector('#eq-app [data-act=pointer][data-v=start]'))};
await page.clock.fastForward('24:00'); /* 24 min sans toucher l'écran */
await page.evaluate(()=>document.querySelector('#eq-app [data-act=pointer][data-v=start]').click());await wait(400);
o.toast1=await page.evaluate(()=>(document.getElementById('toast')||{}).textContent||'');o.e1=await evts();
await page.clock.fastForward('04:02:00'); /* 11 h 30 */
await page.evaluate(()=>{const b=document.querySelector('#eq-app [data-act=pointer][data-v=pause]');if(b)b.click();});await wait(300);
await page.clock.fastForward('45:00');await page.evaluate(()=>{const b=document.querySelector('#eq-app [data-act=pointer][data-v=resume]');if(b)b.click();});await wait(300);
await page.clock.fastForward('04:16:00'); /* 16 h 31 */
await page.evaluate(()=>{const b=document.querySelector('#eq-app [data-act=pointer][data-v=end]');if(b)b.click();});await wait(400);
o.e=await evts();
console.log('u1) pointage :',J(o));
C.u1=o.card&&/7 h 28|07:28|7:28/.test(o.toast1)&&J(o.e)===J(['start@07:28','pause@11:30','resume@12:15','end@16:31']);
/* ── u2 / u3 : note de frais */
const notes=()=>page.evaluate(()=>(window.TRACE.reg.all('debours')||[]).filter(d=>d&&d.key&&/karim/i.test(String(d.key)+String(d.name))).map(d=>d.montant));
const openForm=async()=>{await sub(/Notes de frais|Frais/);await page.evaluate(()=>{const b=document.querySelector('#eq-app [data-v^="dbnew"]');if(b)b.click();});await wait(400);return page.evaluate(()=>!!document.getElementById('db-montant'));};
const typeMt=async v=>{await page.fill('#db-montant',v);await wait(120);return page.evaluate(()=>({v:(document.getElementById('db-mt-v')||{}).textContent||'',type:document.getElementById('db-montant').type,im:document.getElementById('db-montant').inputMode}));};
const save=async()=>{await page.evaluate(()=>{document.getElementById('db-justif').value='ticket remis au chef';document.getElementById('db-ok').click();});await wait(350);return page.evaluate(()=>({open:!!document.getElementById('db-montant')&&document.getElementById('modal').classList.contains('show'),warn:(()=>{const w=document.getElementById('db-warn');return w&&w.style.display!=='none'?w.textContent:'';})(),ok:(document.getElementById('db-ok')||{}).textContent||''}));};
o={form:await openForm()};o.n0=(await notes()).length;
o.t1=await typeMt('4,60');o.s1=await save();o.after1=await notes();
o.form2=await openForm();o.bad=await typeMt('4,605');await page.evaluate(()=>document.getElementById('db-ok').click());await wait(250);o.badOpen=await page.evaluate(()=>!!document.getElementById('db-montant'));o.badToast=await page.evaluate(()=>(document.getElementById('toast')||{}).textContent||'');
o.t2=await typeMt('460');o.s2a=await save();o.mid=await notes();o.s2b=await save();o.after2=await notes();
o.form3=await openForm();await typeMt('4,6');o.s3a=await save();o.mid3=await notes();o.s3b=await save();o.after3=await notes();
console.log('u2/u3) note de frais :',J(o));
const n0=o.n0;
C.u2=o.form&&o.t1.type==='text'&&o.t1.im==='decimal'&&/= 4,60 €/.test(o.t1.v)&&!o.s1.open&&o.after1.length===n0+1&&o.after1.includes(4.6)&&/illisible/.test(o.bad.v)&&o.badOpen&&/ex\. 4,60/.test(o.badToast);
C.u3=/Montant élevé/.test(o.s2a.warn)&&o.s2a.open&&/Oui, enregistrer 460,00 €/.test(o.s2a.ok)&&o.mid.length===n0+1&&!o.s2b.open&&o.after2.includes(460)&&o.after2.length===n0+2
  &&/déjà saisi/.test(o.s3a.warn)&&o.s3a.open&&o.mid3.length===n0+2&&!o.s3b.open&&o.after3.length===n0+3;
C.u4=!logs.length;if(logs.length)console.log('console :',logs);
console.log('RÉSULTATS',J(C));console.log('RESULTAT:',Object.values(C).every(Boolean)?'TOUT VERT':'ÉCHEC '+Object.keys(C).filter(k=>!C[k]).join(' '));await browser.close();process.exit(Object.values(C).every(Boolean)?0:1);
