// MÉMOIRE « EN MODE LECTURE » (lot 4, 13/10/2026) : le mémoire affiché comme il sortira (page de garde, sommaire, sections) ; on écrit DANS la page
// (texte enregistré sans redessiner : le curseur reste) ; cliquer une section la sélectionne à droite ; décocher une section la retire du mémoire (et de
// l'export) ; note du DCE « ↧ dans la section » puis barrée ; plein écran + Échap ; un redessin pendant la frappe ne perd rien.
import { chromium } from 'playwright';
import fs from 'fs';
const BASE=process.env.BASE||'http://localhost:8765';
const browser=await chromium.launch({headless:true, executablePath: process.env.CHROMIUM_PATH||undefined});
const ctx=await browser.newContext({viewport:{width:1280,height:900},acceptDownloads:true});const page=await ctx.newPage();
const logs=[];page.on('pageerror',e=>logs.push('PAGEERROR: '+e.message.slice(0,300)));page.on('console',m=>{if(m.type()==='error'&&!/supabase|Failed to fetch|net::ERR|404|WebSocket|pdf\.worker|cdnjs/i.test(m.text()))logs.push(m.text().slice(0,200));});
page.on('dialog',d=>d.accept().catch(()=>{}));
const C={};const wait=ms=>page.waitForTimeout(ms);
await page.goto(BASE+'/index.html');await wait(600);await page.evaluate(()=>{localStorage.clear();localStorage.setItem('trace:wide','1');});await page.reload();await wait(1200);
{const s=await page.$('#loginSkip');if(s&&await s.isVisible())await s.click();await wait(700);}
const click=async v=>{await page.evaluate(v=>{const el=document.querySelector(`#eq-app [data-act=af][data-v="${v}"]`);if(!el)throw new Error('bouton absent '+v);el.click();},v);await wait(300);};
const A=()=>page.evaluate(()=>window.TRACE.affaires.get('O2610-15'));
await page.evaluate(async()=>{const T=window.TRACE;T.state.userId='ethan';T.renderHome();document.getElementById('htCom').click();await new Promise(x=>setTimeout(x,250));
  document.querySelector('#eq-app [data-act=af][data-v="new|"]').click();await new Promise(x=>setTimeout(x,150));document.getElementById('afn-num').value='O2610-15';document.getElementById('afn-nom').value='Mémoire v2';document.getElementById('afn-client').value='CORIANCE';document.getElementById('afn-ville').value='Caen';document.getElementById('afn-etat').value='devis';
  document.querySelector('#eq-app [data-act=af][data-v="create|"]').click();await new Promise(x=>setTimeout(x,250));
  T.affaires.set('O2610-15',{dce:[{id:'D1',name:'CCTP.pdf',catKey:'cctp',at:new Date().toISOString(),notes:[{ref:'art. 4.5',texte:'Prévoir la méthodologie de radio',extrait:'10 % des soudures',dests:['memoire'],dest:'memoire',by:'Ethan L.',at:new Date().toISOString()}]}]});
  document.querySelector('#eq-app [data-act=af][data-v="tab|memoire"]').click();await new Promise(x=>setTimeout(x,300));});
// ── 1) plan type → la page du mémoire : garde, sommaire, 10 sections
await click('mplan|');
let out=await page.evaluate(()=>({cover:(document.querySelector('#eq-app .cm-mcover')||{}).textContent||'',som:document.querySelectorAll('#eq-app .cm-msom li').length,secs:document.querySelectorAll('#eq-app .cm-ms').length,editable:document.querySelectorAll('#eq-app .cm-msb[contenteditable="true"]').length,ph:(document.querySelector('#eq-app .cm-msb[data-i="1"]')||{}).dataset.ph||'',side:!!document.querySelector('#cm-mside .cm-sec'),notes:(document.querySelector('#cm-mside .cm-notes')||{}).textContent||''}));
console.log('1) page :',JSON.stringify(out));
C.c1=/Mémoire technique/.test(out.cover)&&/O2610-15/.test(out.cover)&&/Caen/.test(out.cover)&&out.som===10&&out.secs===10&&out.editable===10&&/clique ici pour rédiger/.test(out.ph)&&out.side&&/Prévoir la méthodologie de radio/.test(out.notes);
// ── 2) écrire DANS la page : la section 2 se sélectionne ; le texte s'enregistre sans redessiner (même élément, toujours le curseur dedans)
await page.click('#eq-app .cm-msb[data-i="1"]');await wait(300);
out={sel:await page.evaluate(()=>({on:(document.querySelector('#cm-mside .cm-sec.on')||{}).dataset.i,title:(document.querySelector('#cm-mside [data-afm=titre]')||{}).value,doc:(document.querySelector('#eq-app .cm-ms.on')||{}).dataset.i}))};
await page.evaluate(()=>{document.querySelector('#eq-app .cm-msb[data-i="1"]')._mark=42;});
await page.keyboard.type('Le chantier se situe en centre-ville de Caen.');await page.keyboard.press('Enter');await page.keyboard.type('Accès par la rue des Lilas.');await wait(1400);
out.typing=await page.evaluate(()=>{const el=document.querySelector('#eq-app .cm-msb[data-i="1"]');const a=window.TRACE.affaires.get('O2610-15');return {same:el&&el._mark===42,focus:document.activeElement===el,saved:a.memoire.sections[1].texte};});
await page.mouse.click(5,300);await wait(400);
out.blur=await page.evaluate(()=>({words:(document.querySelector('#cm-mside .cm-sec[data-i="1"] small')||{}).textContent,stat:[...document.querySelectorAll('#eq-app .ac-stat')].map(x=>x.textContent.replace(/\s+/g,' ').trim()).find(t=>/mots dans le mémoire/.test(t))}));
console.log('2) frappe :',JSON.stringify(out));
C.c2=out.sel.on==='1'&&out.sel.doc==='1'&&/Compréhension du projet/.test(out.sel.title)&&out.typing.same&&out.typing.focus&&out.typing.saved==='Le chantier se situe en centre-ville de Caen.\n\nAccès par la rue des Lilas.'&&out.blur.words==='14 mots'&&/^14 ?mots dans le mémoire/.test(out.blur.stat||'');
// ── 3) décocher une section : hors de la page, du sommaire et de l'export Word
await click('msecoff|9');
out={doc:await page.evaluate(()=>({secs:document.querySelectorAll('#eq-app .cm-ms').length,som:document.querySelectorAll('#eq-app .cm-msom li').length,excl:(document.querySelector('#eq-app .cm-mexcl')||{}).textContent||'',off:document.querySelector('#cm-mside .cm-secrow.off')!==null}))};
const [dl]=await Promise.all([page.waitForEvent('download'),page.evaluate(()=>document.querySelector('#eq-app [data-act=af][data-v="mword|"]').click())]);const html=fs.readFileSync(await dl.path(),'utf8');
out.word={refs:/Références récentes/.test(html),typed:/centre-ville de Caen/.test(html),plan:(html.match(/<h2>/g)||[]).length};
console.log('3) section décochée :',JSON.stringify(out));
C.c3=out.doc.secs===9&&out.doc.som===9&&/Références récentes/.test(out.doc.excl)&&out.doc.off&&!out.word.refs&&out.word.typed&&out.word.plan===9;
// ── 4) note du DCE → « ↧ dans la section » (section 2), puis barrée
await click('msec|1');await page.evaluate(()=>document.querySelector('#cm-mside [data-act=af][data-v^="mnote|"]').click());await wait(300);
out={t:await A().then(a=>a.memoire.sections[1].texte),mark:await page.evaluate(()=>(document.querySelector('#eq-app .cm-msb[data-i="1"] mark.cm-todo')||{}).textContent||'')};
await page.evaluate(()=>document.querySelector('#cm-mside .cm-note input[data-v^="notedone|"]').click());await wait(300);
out.done=await page.evaluate(()=>!!document.querySelector('#cm-mside .cm-note.done'));
console.log('4) note :',JSON.stringify(out));
C.c4=/\n\nÀ ADAPTER : Prévoir la méthodologie de radio — « 10 % des soudures » \(art\. 4\.5 · CCTP\.pdf\)$/.test(out.t)&&/^À ADAPTER : Prévoir/.test(out.mark)&&out.done;
// ── 5) plein écran + Échap ; 6) redessin pendant la frappe : rien de perdu
await click('mfull|');out={full:await page.evaluate(()=>{const c=document.getElementById('cm-mcard');const r=c.getBoundingClientRect();return {cls:c.classList.contains('full'),w:r.width,h:r.height};})};
await page.mouse.click(640,20);await page.keyboard.press('Escape');await wait(400);out.after=await page.evaluate(()=>document.getElementById('cm-mcard').classList.contains('full'));
await page.click('#eq-app .cm-msb[data-i="2"]');await wait(200);await page.keyboard.type('Soudure TIG en racine, électrode en remplissage.');
await page.evaluate(()=>document.querySelector('#eq-app [data-act=af][data-v="mfull|"]').click());await wait(500);
out.redraw=await page.evaluate(()=>({txt:(document.querySelector('#eq-app .cm-msb[data-i="2"]')||{}).textContent||'',full:document.getElementById('cm-mcard').classList.contains('full')}));
await page.evaluate(()=>document.querySelector('#eq-app [data-act=af][data-v="mfull|"]').click());await wait(300);await page.mouse.click(5,300);await wait(1200);
out.saved=await A().then(a=>a.memoire.sections[2].texte);
console.log('5-6) plein écran / redessin :',JSON.stringify(out));
C.c5=out.full.cls&&out.full.w>=1270&&out.full.h>=890&&!out.after&&/Soudure TIG en racine/.test(out.redraw.txt)&&out.redraw.full&&/Soudure TIG en racine, électrode en remplissage\./.test(out.saved||'');
const bad=Object.entries(C).filter(([k,v])=>!v).map(([k])=>k);console.log(bad.length?'RESULTAT: ECHEC '+bad.join(','):'RESULTAT: TOUT VERT');console.log(logs.length?logs:'[]');
await browser.close();
