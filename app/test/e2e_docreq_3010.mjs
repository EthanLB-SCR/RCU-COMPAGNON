// e2e_docreq_3010.mjs — 30/10 soir. Ethan : « le courrier contingent annuel d'heures supplémentaires (accord 2027), c'est que pour les gars de terrain : chef de chantier et les
// différents métiers, opérateur, manchonneur… ». Avant : impossible de changer qui doit signer un document publié (archiver puis republier, tout le monde re-signait).
//  c1  création d'une note : nouvelle option « Terrain + chefs de chantier »
//  c2  note publiée pour « tout le monde » : Sophie (bureau) l'a à signer ; fiche du document → « 👥 Qui doit signer ? » → Terrain + chefs de chantier → compteur, Enregistrer
//  c3  après : Karim (soudeur), Julien (manchonneur), Ethan (chef de chantier) l'ont à signer ; Sophie (bureau) ne l'a plus ; la fiche affiche « terrain + chefs de chantier »
//  c4  console propre
import { chromium } from 'playwright';
const BASE=process.env.BASE||'http://localhost:8765';
const browser=await chromium.launch({headless:true, executablePath: process.env.CHROMIUM_PATH||undefined});
const ctx=await browser.newContext({viewport:{width:430,height:900}});const page=await ctx.newPage();
const logs=[];page.on('pageerror',e=>logs.push('PAGEERROR: '+e.message.slice(0,300)));page.on('console',m=>{if(m.type()==='error'&&!/supabase|Failed to fetch|net::ERR|404|WebSocket/i.test(m.text()))logs.push(m.text().slice(0,200));});
page.on('dialog',d=>d.accept().catch(()=>{}));
const C={};const J=x=>JSON.stringify(x);const wait=ms=>page.waitForTimeout(ms);
await page.goto(BASE+'/index.html');await wait(500);await page.evaluate(()=>{localStorage.clear();});await page.evaluate(()=>new Promise(r=>{try{const q=indexedDB.deleteDatabase('trace-kv');q.onsuccess=q.onerror=q.onblocked=()=>r();}catch(e){r();}}));
await page.reload();await wait(1200);const s=await page.$('#loginSkip');if(s&&await s.isVisible())await s.click();await wait(700);
const TITLE='Courrier — contingent annuel d\'heures supplémentaires (accord 2027)';
const asUser=async id=>{await page.evaluate(id=>{const T=window.TRACE;T.state.userId=id;T.showScreen('home');document.getElementById('htHome').click();},id);await wait(400);return page.evaluate(()=>[...document.querySelectorAll('#eq-app .ac-notif .tx b')].map(b=>b.textContent));};
const docsList=async()=>{await page.evaluate(()=>{const T=window.TRACE;T.state.userId='ethan';T.showScreen('home');document.getElementById('htEnt').click();});await wait(300);
  await page.evaluate(()=>{const bk=document.querySelector('#eq-app .ac-back');if(bk)bk.click();});await wait(150);await page.evaluate(()=>{[...document.querySelectorAll('#eq-app .ac-row')].find(x=>/Documents d.entreprise/.test(x.textContent)).click();});await wait(300);};
/* ── c1 + c2 : création pour tout le monde */
await docsList();
await page.evaluate(()=>document.querySelector('#eq-app [data-act=docnew]').click());await wait(300);
let o={opts:await page.evaluate(()=>[...document.querySelectorAll('#modal input[name=dn-req]')].map(r=>r.value))};
await page.evaluate(t=>{document.getElementById('dn-title').value=t;document.getElementById('dn-text').value='Contingent annuel d\'heures supplémentaires porté à 300 h par l\'accord 2027.';const r=document.querySelector('#modal input[name=dn-req][value=all]');r.checked=true;r.dispatchEvent(new Event('change'));document.getElementById('dn-ok').click();},TITLE);await wait(500);
C.c1=o.opts.includes('terrain')&&o.opts.includes('exploit')&&o.opts.includes('all')&&o.opts.includes('postes');
console.log('c1) options à la création :',J(o));
o={sophieAvant:(await asUser('sophie')).some(t=>t.includes(TITLE))};
await docsList();
await page.evaluate(t=>{const r=[...document.querySelectorAll('#eq-app [data-act=docadm]')].find(x=>x.textContent.includes(t));r.click();},TITLE);await wait(300);
o.btn=await page.evaluate(()=>{const b=document.getElementById('dad-req');return b?b.textContent.trim():null;});
await page.evaluate(()=>document.getElementById('dad-req').click());await wait(300);
o.modal=await page.evaluate(()=>({title:(document.querySelector('#modal h3')||{}).textContent,checked:(document.querySelector('#modal input[name=rq-req]:checked')||{}).value}));
await page.evaluate(()=>{const r=document.querySelector('#modal input[name=rq-req][value=terrain]');r.checked=true;r.dispatchEvent(new Event('change',{bubbles:true}));});await wait(150);
o.count=await page.evaluate(()=>document.getElementById('rq-count').textContent);
await page.evaluate(()=>document.getElementById('rq-ok').click());await wait(600);
o.after=await page.evaluate(()=>({sheet:(document.querySelector('#modal .kv')||{}).textContent||'',btn:(document.getElementById('dad-req')||{}).textContent||''}));
await page.evaluate(()=>{const m=document.getElementById('modal');if(m)m.classList.remove('show');});
console.log('c2) qui doit signer :',J(o));
C.c2=o.sophieAvant&&/Qui doit signer/.test(o.btn||'')&&/tout le monde/.test(o.btn||'')&&/Qui doit signer/.test(o.modal.title||'')&&o.modal.checked==='all'&&/terrain \+ chefs de chantier/.test(o.count)&&/concernée/.test(o.count)&&/terrain \+ chefs de chantier/.test(o.after.sheet);
/* ── c3 : qui l'a à signer maintenant */
o={karim:(await asUser('karim')).some(t=>t.includes(TITLE)),julien:(await asUser('julien')).some(t=>t.includes(TITLE)),ethan:(await asUser('ethan')).some(t=>t.includes(TITLE)),sophie:(await asUser('sophie')).some(t=>t.includes(TITLE))};
console.log('c3) après :',J(o));
C.c3=o.karim&&o.julien&&o.ethan&&!o.sophie;
C.c4=!logs.length;if(logs.length)console.log('console :',logs);
console.log('RÉSULTATS',J(C));console.log('RESULTAT:',Object.values(C).every(Boolean)?'TOUT VERT':'ÉCHEC '+Object.keys(C).filter(k=>!C[k]).join(' '));await browser.close();process.exit(Object.values(C).every(Boolean)?0:1);
