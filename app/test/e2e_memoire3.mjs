// MÉMOIRE « BIBLIOTHÈQUE SCR » (14/10/2026, nuit) : bibliothèque FICTIVE (test/memoire_fake.mjs : 3 sections, 5 blocs, 12 paragraphes, 3 trous) injectée dans le
// registre « doc » (ligne memlib, miroir de l'appareil) → étape 5 · Mémoire d'une affaire de démo : mode bibliothèque par défaut, décocher un paragraphe, cocher un bloc,
// combler un trou (compteur qui baisse, plus de rouge), variable vide en rouge, export Word au gabarit du pack (trous restants en rouge), impression, texte modifié pour
// l'affaire (trou rempli gardé), correction de la bibliothèque, ancien mode « sections libres » toujours là (et rien de perdu), affaire existante inchangée ;
// puis le même parcours court à 390 px (téléphone) : pas de débordement horizontal ; aucune erreur console.
import { chromium } from 'playwright';
import fs from 'fs';
import {FAKE_BLOCS,FAKE_STYLE} from './memoire_fake.mjs';
const BASE=process.env.BASE||'http://localhost:8765';
const browser=await chromium.launch({headless:true, executablePath: process.env.CHROMIUM_PATH||undefined});
const C={};const logs=[];const LIB={kind:'memlib',req:{none:true},title:'Mémoire technique : bibliothèque de blocs SCR',blocs:FAKE_BLOCS,style:FAKE_STYLE,version:1,at:'2026-10-14T00:00:00.000Z',by:'Test'};
async function open(ctxOpts,num,nom){const ctx=await browser.newContext(Object.assign({acceptDownloads:true},ctxOpts));const page=await ctx.newPage();
  page.on('pageerror',e=>logs.push('PAGEERROR: '+e.message.slice(0,300)));page.on('console',m=>{if(m.type()==='error'&&!/supabase|Failed to fetch|net::ERR|404|WebSocket|pdf\.worker|cdnjs/i.test(m.text()))logs.push(m.text().slice(0,200));});page.on('dialog',d=>d.accept().catch(()=>{}));
  await page.goto(BASE+'/index.html');await page.waitForTimeout(600);await page.evaluate(()=>{localStorage.clear();localStorage.setItem('trace:wide','1');});
  await page.evaluate(row=>new Promise((res,rej)=>{const r=indexedDB.open('trace-kv',1);r.onupgradeneeded=()=>{r.result.createObjectStore('kv');};r.onerror=()=>rej(r.error);r.onsuccess=()=>{const db=r.result;const t=db.transaction('kv','readwrite');const st=t.objectStore('kv');const g=st.get('trace:reg:doc');g.onsuccess=()=>{const cur=g.result||{};cur.memlib={id:'memlib',data:row,updated_at:new Date().toISOString()};st.put(cur,'trace:reg:doc');};t.oncomplete=()=>{db.close();res();};t.onerror=()=>rej(t.error);};}),LIB);
  await page.reload();await page.waitForTimeout(1200);{const s=await page.$('#loginSkip');if(s&&await s.isVisible())await s.click();await page.waitForTimeout(700);}
  await page.evaluate(async([n,nm])=>{const T=window.TRACE;T.state.userId='ethan';T.renderHome();document.getElementById('htCom').click();await new Promise(x=>setTimeout(x,250));
    document.querySelector('#eq-app [data-act=af][data-v="new|"]').click();await new Promise(x=>setTimeout(x,150));document.getElementById('afn-num').value=n;document.getElementById('afn-nom').value=nm;document.getElementById('afn-client').value='CLIENT-TEST';document.getElementById('afn-ville').value='Testville';document.getElementById('afn-etat').value='devis';
    document.querySelector('#eq-app [data-act=af][data-v="create|"]').click();await new Promise(x=>setTimeout(x,250));document.querySelector('#eq-app [data-act=af][data-v="tab|memoire"]').click();await new Promise(x=>setTimeout(x,300));},[num,nom]);
  return {ctx,page};}
const NUM='O2610-31';
let {ctx,page}=await open({viewport:{width:1280,height:900}},NUM,'Réseau Lib');
const wait=ms=>page.waitForTimeout(ms);
const click=async v=>{await page.evaluate(v=>{const el=document.querySelector(`#eq-app [data-act=af][data-v="${v}"]`);if(!el)throw new Error('bouton absent '+v);el.click();},v);await wait(300);};
const A=()=>page.evaluate(n=>window.TRACE.affaires.get(n),NUM);
const holes=()=>page.evaluate(()=>{const b=document.querySelector('#memoire-nholes b');return b?+b.textContent:null;});
const prev=()=>page.evaluate(()=>(document.querySelector('#memoire-scroll .memoire-page')||{}).textContent||'');
const tabOk=()=>page.evaluate(()=>{const b=[...document.querySelectorAll('#eq-app [data-v^="tab|memoire"]')][0];return b?b.textContent.trim():'';});
const noOverflow=()=>page.evaluate(()=>document.documentElement.scrollWidth<=window.innerWidth);
// ── 1) mode bibliothèque par défaut : 3 sections, 9 / 12 paragraphes cochés, 2 trous rouges, variables remplies, page de garde
let out=await page.evaluate(()=>({modes:[...document.querySelectorAll('#eq-app .memoire-modes .chip')].map(c=>c.textContent.trim()+(c.classList.contains('active')?'*':'')),secs:document.querySelectorAll('#memoire-tree .memoire-sech').length,
  stats:[...document.querySelectorAll('#memoire-stats .ac-stat')].map(x=>x.textContent.replace(/\s+/g,' ').trim()),red:document.querySelectorAll('#memoire-scroll .memoire-h').length,h1:document.querySelectorAll('#memoire-scroll h1').length,h2:document.querySelectorAll('#memoire-scroll h2').length,
  cover:(document.querySelector('#memoire-scroll .memoire-cv')||{}).textContent||'',h2col:getComputedStyle(document.querySelector('#memoire-scroll h2')).color,th:getComputedStyle(document.querySelector('#memoire-scroll th')).backgroundColor,redCol:getComputedStyle(document.querySelector('#memoire-scroll .memoire-h')).color}));
out.txt=await prev();out.tab=await tabOk();out.lib=await A().then(a=>!!(a.memoire&&a.memoire.lib));
console.log('1) mode bibliothèque :',JSON.stringify({...out,txt:out.txt.slice(0,160)}));
C.c1=out.modes.join('|')==='📚 Bibliothèque SCR*|✎ Sections libres'&&out.secs===3&&/^2 ?trous à combler/.test(out.stats[0])&&/^9 \/ 12 ?paragraphes cochés/.test(out.stats[1])&&/^5 \/ 5 ?blocs/.test(out.stats[2])&&out.stats.length===4&&out.red===2&&out.h1===3&&out.h2===5
  &&/Testville/.test(out.cover)&&/O2610-31/.test(out.cover)&&/MÉMOIRE\s*TECHNIQUE TEST/.test(out.cover)&&/CLIENT-TEST/.test(out.cover)&&/Objet : Réseau Lib – Testville/.test(out.txt)&&/Fin du mémoire de Réseau Lib/.test(out.txt)&&out.h2col==='rgb(18, 52, 86)'&&out.th==='rgb(255, 102, 1)'&&out.redCol==='rgb(238, 0, 0)'&&!/✓/.test(out.tab)&&!out.lib;
// ── 2) décocher un paragraphe (section 3 › bloc Annexes) → absent de l'aperçu, choix enregistré sur l'affaire
await click('mlbsec|2');await click('mlbexp|t-annexes');await click('mlbp|t-annexes-2');
out={txt:await prev(),sel:await A().then(a=>a.memoire.lib.sel),stat:await page.evaluate(()=>[...document.querySelectorAll('#memoire-stats .ac-stat')][1].textContent.replace(/\s+/g,' ').trim())};
console.log('2) paragraphe décoché :',JSON.stringify({...out,txt:undefined}));
C.c2=!/Fin du mémoire/.test(out.txt)&&out.sel['t-annexes-2']===false&&/^8 \/ 12/.test(out.stat);
// ── 3) cocher un bloc entier (Contrôles : 1 / 2 → 2 / 2) : la variable {{delai}} vide arrive en rouge
await click('mlbsec|1');await click('mlbexp|t-controles');
out={ind:await page.evaluate(()=>document.querySelector('#eq-app input[data-v="mlbb|t-controles"]').indeterminate)};await click('mlbb|t-controles');
out.after=await page.evaluate(()=>({checked:document.querySelector('#eq-app input[data-v="mlbb|t-controles"]').checked,rows:[...document.querySelectorAll('#eq-app .memoire-prow input')].filter(x=>/t-controles/.test(x.dataset.v)).map(x=>x.checked)}));
out.holes=await holes();out.txt=await prev();out.redVar=await page.evaluate(()=>!!document.querySelector('#memoire-p-t-controles-2 button.memoire-h[data-v="mlbv|delai"]'));
console.log('3) bloc coché :',JSON.stringify({...out,txt:undefined}));
C.c3=out.ind===true&&out.after.checked&&out.after.rows.join()==='true,true'&&out.holes===3&&/Délai d’exécution proposé/.test(out.txt)&&out.redVar;
// ── 4) combler un trou : le compteur baisse, plus de rouge pour ce trou
await page.evaluate(()=>document.querySelector('#memoire-p-t-controles-1 button.memoire-h').click());await wait(250);
out={modal:await page.evaluate(()=>({t:(document.querySelector('#modal.show')||{}).textContent||'',inp:!!document.getElementById('memoire-hv')}))};
await page.fill('#memoire-hv','Jean Test');await page.click('#memoire-hok');await wait(400);
out.holes=await holes();out.p=await page.evaluate(()=>({red:document.querySelectorAll('#memoire-p-t-controles-1 .memoire-h').length,f:(document.querySelector('#memoire-p-t-controles-1 .memoire-f')||{}).textContent}));out.fill=await A().then(a=>a.memoire.lib.fill);
console.log('4) trou comblé :',JSON.stringify(out));
C.c4=/nom du conducteur de travaux/.test(out.modal.t)&&out.modal.inp&&out.holes===2&&out.p.red===0&&out.p.f==='Jean Test'&&out.fill['t-controles-1|nom du conducteur de travaux|0']==='Jean Test';
// ── 5) export Word (2 trous encore vides) : gabarit du pack, page de garde, trous restants en rouge
let [dl]=await Promise.all([page.waitForEvent('download'),page.evaluate(()=>document.querySelector('#eq-app [data-act=af][data-v="mword|"]').click())]);let html=fs.readFileSync(await dl.path(),'utf8');
out={name:dl.suggestedFilename(),size:html.length,h2:/h2\{[^}]*color:#123456/.test(html),th:/<th style="background:#FF6601/.test(html),band:/background:#FABF8E/.test(html),puce:/<li style="color:#AA0011">/.test(html)&&/list-style-type:square/.test(html),
  cover:/O2610-31/.test(html)&&/CLIENT-TEST/.test(html)&&/Testville/.test(html)&&/MÉMOIRE<br>TECHNIQUE TEST/.test(html)&&/\d\d\/\d\d\/\d{4}/.test(html),filled:/Jean Test/.test(html)&&!/nom du conducteur de travaux\]/.test(html),
  red:/\.ac\{color:#EE0000;font-style:italic\}/.test(html)&&/<span class="ac">\[À COMPLÉTER : nom du maître d’œuvre\]<\/span>/.test(html)&&/<span class="ac">\[À COMPLÉTER : délai d’exécution/.test(html),out:!/Fin du mémoire/.test(html),word:/urn:schemas-microsoft-com:office:word/.test(html)};
console.log('5) export Word :',JSON.stringify(out));
C.c5=out.name==='Memoire_technique_O2610-31.doc'&&out.h2&&out.th&&out.band&&out.puce&&out.cover&&out.filled&&out.red&&out.out&&out.word;
// ── 6) variable vide + dernier trou → 0 trou : étape prête (✓ 5 · Mémoire)
await click('mlbv|delai');await page.fill('#memoire-vv','12 semaines');await page.click('#memoire-vok');await wait(350);
await page.evaluate(()=>document.querySelector('#memoire-p-t-acteurs-1 button.memoire-h').click());await wait(250);out={same:await page.evaluate(()=>!!document.getElementById('memoire-hall'))};await page.fill('#memoire-hv','BET Fictif');await page.keyboard.press('Enter');await wait(400);
out.holes=await holes();out.stat=await page.evaluate(()=>document.getElementById('memoire-nholes').textContent.replace(/\s+/g,' ').trim());out.tab=await tabOk();out.txt=await prev();out.next=await page.evaluate(()=>!!document.querySelector('#eq-app [data-v="mlbnext|"]'));
console.log('6) plus de trou :',JSON.stringify({...out,txt:undefined}));
C.c6=!out.same&&out.holes===0&&/aucun trou : prêt/.test(out.stat)&&/^✓ 5 · Mémoire/.test(out.tab)&&/12 semaines/.test(out.txt)&&/BET Fictif/.test(out.txt)&&!out.next;
// ── 7) modifier un paragraphe POUR CETTE AFFAIRE : la bibliothèque ne change pas ; un trou déjà rempli le reste
const endOf=async id=>{await page.evaluate(id=>{const ed=document.getElementById('memoire-ed');ed.focus();const r=document.createRange();r.selectNodeContents(ed.lastElementChild||ed);r.collapse(false);const s=getSelection();s.removeAllRanges();s.addRange(r);},id);};
await click('mlbo|t-controles-1');out={modal:await page.evaluate(()=>!!document.getElementById('memoire-ped'))};await page.click('#memoire-ped');await wait(250);
out.tok=await page.evaluate(()=>[...document.querySelectorAll('#memoire-ed .memoire-tok')].map(t=>t.textContent));await endOf();await page.keyboard.type(' Ajout pour cette affaire.');await page.click('#memoire-eok');await wait(400);
const a7=await A();const L7=await page.evaluate(()=>window.TRACE.reg.get('doc','memlib'));
out.edit=a7.memoire.lib.edits['t-controles-1'];out.fill=a7.memoire.lib.fill['t-controles-1|nom du conducteur de travaux|0'];out.libTxt=L7.blocs.find(b=>b.id==='t-controles').paragraphes[0].html;out.txt=await prev();out.holes=await holes();
console.log('7) modifié pour l’affaire :',JSON.stringify({...out,txt:undefined}));
C.c7=out.modal&&out.tok.join()==='Jean Test'&&/\[\[À COMPLÉTER : nom du conducteur de travaux\]\], valide chaque contrôle\. Ajout pour cette affaire\./.test(out.edit||'')&&out.fill==='Jean Test'&&!/Ajout/.test(out.libTxt)&&/Jean Test, valide chaque contrôle\. Ajout pour cette affaire\./.test(out.txt)&&out.holes===0;
// ── 8) corriger un paragraphe DANS LA BIBLIOTHÈQUE (encadrement / bureau) : corr gardée sur la ligne memlib, visible dans l'aperçu
await click('mlbo|t-annexes-1');await page.click('#memoire-pco');await wait(250);await endOf();await page.keyboard.type(' Correction de la bibliothèque.');await page.click('#memoire-eok');await wait(400);
const L8=await page.evaluate(()=>window.TRACE.reg.get('doc','memlib'));out={corr:L8.corr&&L8.corr['t-annexes-1'],orig:L8.blocs.find(b=>b.id==='t-annexes').paragraphes[0].html,txt:await prev(),tag:await page.evaluate(()=>/corrigé/.test((document.querySelector('#memoire-tree')||{}).textContent||''))};
console.log('8) bibliothèque corrigée :',JSON.stringify({...out,txt:undefined}));
C.c8=!!out.corr&&/Correction de la bibliothèque\./.test(out.corr.html)&&!!out.corr.at&&!/Correction/.test(out.orig)&&/Correction de la bibliothèque\./.test(out.txt)&&out.tag;
// ── 9) recherche dans la bibliothèque ; impression (fenêtre au gabarit, n° de page)
await page.fill('#memoire-tree .memoire-q','chanfreins');await wait(300);out={search:await page.evaluate(()=>({hint:(document.querySelector('#memoire-tree-body .hint')||{}).textContent||'',rows:[...document.querySelectorAll('#memoire-tree-body .memoire-ptx span')].map(x=>x.textContent)}))};
await page.fill('#memoire-tree .memoire-q','');await wait(200);
const [pop]=await Promise.all([page.waitForEvent('popup'),page.evaluate(()=>document.querySelector('#eq-app [data-act=af][data-v="mprint|"]').click())]);await pop.waitForLoadState().catch(()=>{});await pop.waitForTimeout(500);const ph=await pop.content().catch(()=>'');await pop.close().catch(()=>{});
out.print={cover:/MÉMOIRE<br>TECHNIQUE TEST/.test(ph)&&/O2610-31/.test(ph),page:/Page \| " counter\(page\)/.test(ph),noRed:!/<span class="ac">/.test(ph)};
console.log('9) recherche, impression :',JSON.stringify(out));
C.c9=/1 paragraphe trouvé/.test(out.search.hint)&&out.search.rows.length===1&&/Préparation des chanfreins/.test(out.search.rows[0])&&out.print.cover&&out.print.page&&out.print.noRed;
// ── 10) ancien mode toujours là : « Sections libres » → plan type SCR (10 sections) ; la bibliothèque de l'affaire n'est pas perdue ; retour au mode bibliothèque
await click('mlbmode|sections');out={old:await page.evaluate(()=>({empty:/Pas encore de mémoire/.test(document.getElementById('eq-app').textContent),plan:!!document.querySelector('#eq-app [data-act=af][data-v="mplan|"]'),chip:[...document.querySelectorAll('#eq-app .memoire-modes .chip.active')].map(c=>c.textContent.trim())}))};
await click('mplan|');out.secs=await page.evaluate(()=>document.querySelectorAll('#eq-app .cm-ms').length);out.tab=await tabOk();const a10=await A();out.kept={mode:a10.memoire.mode,fill:a10.memoire.lib&&a10.memoire.lib.fill['t-controles-1|nom du conducteur de travaux|0'],secs:(a10.memoire.sections||[]).length};
[dl]=await Promise.all([page.waitForEvent('download'),page.evaluate(()=>document.querySelector('#eq-app [data-act=af][data-v="mword|"]').click())]);html=fs.readFileSync(await dl.path(),'utf8');out.oldWord=(html.match(/<h2>/g)||[]).length===10&&!/WordSection1/.test(html);
await click('mlbmode|lib');out.back={txt:/Jean Test/.test(await prev()),tab:await tabOk(),secs:(await A()).memoire.sections.length};
console.log('10) ancien mode :',JSON.stringify(out));
C.c10=out.old.empty&&out.old.plan&&out.old.chip.join()==='✎ Sections libres'&&out.secs===10&&!/✓/.test(out.tab)&&out.kept.mode==='sections'&&out.kept.fill==='Jean Test'&&out.kept.secs===10&&out.oldWord&&out.back.txt&&/^✓ 5 · Mémoire/.test(out.back.tab)&&out.back.secs===10;
// ── 11) une affaire existante (sections libres, sans memoire.lib) reste en mode sections, inchangée
await page.evaluate(async()=>{const T=window.TRACE;T.affaires.set('O2610-32',{num:'O2610-32',nom:'Ancienne',client:'X',etat:'devis',memoire:{sections:[{id:'S1',titre:'Présentation de SCR',etat:'pret',texte:'Texte existant.'}]}});T.affaires.state().cur='O2610-32';T.affaires.state().view='fiche';T.affaires.state().tab='memoire';document.getElementById('htCom').click();await new Promise(r=>setTimeout(r,300));});
out=await page.evaluate(()=>{const a=window.TRACE.affaires.get('O2610-32');return {secs:document.querySelectorAll('#eq-app .cm-ms').length,txt:/Texte existant\./.test((document.querySelector('#eq-app .cm-msb')||{}).textContent||''),chip:[...document.querySelectorAll('#eq-app .memoire-modes .chip.active')].map(c=>c.textContent.trim()),lib:!!a.memoire.lib,mode:a.memoire.mode||null,tab:([...document.querySelectorAll('#eq-app [data-v^="tab|memoire"]')][0]||{}).textContent};});
out.overflow=await noOverflow();
console.log('11) affaire existante :',JSON.stringify(out));
C.c11=out.secs===1&&out.txt&&/Sections libres/.test(out.chip.join())&&!out.lib&&out.mode===null&&/^✓ 5 · Mémoire/.test((out.tab||'').trim())&&out.overflow;
await ctx.close();
// ── 12) téléphone (390 px) : parcours court — décocher, combler un trou, fiche d'un paragraphe — sans débordement horizontal
({ctx,page}=await open({viewport:{width:390,height:844},isMobile:true,hasTouch:true,deviceScaleFactor:2},'O2610-33','Réseau tel'));
const w2=ms=>page.waitForTimeout(ms);const tap=async v=>{await page.evaluate(v=>{const el=document.querySelector(`#eq-app [data-act=af][data-v="${v}"]`);if(!el)throw new Error('bouton absent '+v);el.scrollIntoView({block:'center'});},v);await page.tap(`#eq-app [data-act=af][data-v="${v}"]`);await w2(350);};
const ov=()=>page.evaluate(()=>({sw:document.documentElement.scrollWidth,iw:window.innerWidth}));
out={o1:await ov(),h0:await page.evaluate(()=>+document.querySelector('#memoire-nholes b').textContent)};
await tap('mlbsecall|1');await tap('mlbexp|t-objet');await tap('mlbexp|t-acteurs');await tap('mlbp|t-acteurs-1');out.h1=await page.evaluate(()=>+document.querySelector('#memoire-nholes b').textContent);out.o2=await ov();
await tap('mlbp|t-acteurs-1');await page.evaluate(()=>document.querySelector('#memoire-p-t-controles-1 button.memoire-h').scrollIntoView({block:'center'}));await page.tap('#memoire-p-t-controles-1 button.memoire-h');await w2(300);out.o3=await ov();
await page.fill('#memoire-hv','Paul Tel');await page.tap('#memoire-hok');await w2(400);out.h2=await page.evaluate(()=>+document.querySelector('#memoire-nholes b').textContent);
await page.evaluate(()=>document.querySelector('#memoire-p-t-acteurs-1 .memoire-pe').scrollIntoView({block:'center'}));await page.tap('#memoire-p-t-acteurs-1 .memoire-pe');await w2(300);out.o4=await ov();out.pm=await page.evaluate(()=>!!document.getElementById('memoire-pon'));
await page.evaluate(()=>{const b=document.querySelector('#modal [data-close]');if(b)b.click();});await w2(200);
out.tbl=await page.evaluate(()=>{const t=document.querySelector('#memoire-scroll table');const w=document.querySelector('#memoire-scroll .memoire-tw');return t&&w?{tw:t.getBoundingClientRect().right<=window.innerWidth+1||w.scrollWidth>w.clientWidth}:null;});out.o5=await ov();
console.log('12) téléphone :',JSON.stringify(out));
C.c12=[out.o1,out.o2,out.o3,out.o4,out.o5].every(o=>o.sw<=o.iw)&&out.h0===2&&out.h1===1&&out.h2===1&&out.pm&&out.tbl&&out.tbl.tw;
await ctx.close();
C.console=logs.length===0;
const bad=Object.entries(C).filter(([k,v])=>!v).map(([k])=>k);console.log(bad.length?'RESULTAT: ECHEC '+bad.join(','):'RESULTAT: TOUT VERT');console.log(logs.length?logs:'[]');
await browser.close();
