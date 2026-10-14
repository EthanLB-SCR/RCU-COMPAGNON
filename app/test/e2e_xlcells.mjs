// LECTURE · DPGF EXCEL EN « VRAIES CELLULES » (14/10/2026 nuit, point en suspens d'Ethan : « la DPGF dans la visionneuse avec les vraies cellules »).
// Vérifié hors connexion : la pièce .xlsx du DCE s'affiche avec les lettres de colonnes (A, B, C…) et les VRAIS numéros de ligne Excel ; ces repères sont dessinés
// par le CSS (::before) et n'entrent pas dans le texte : la recherche et les surlignages (ancrés sur le texte) restent justes ; une note se pose sur une cellule.
import { chromium } from 'playwright';
import path from 'path';import {fileURLToPath} from 'url';
const HERE=path.dirname(fileURLToPath(import.meta.url));
const BASE=process.env.BASE||'http://localhost:8765';
const browser=await chromium.launch({headless:true, executablePath: process.env.CHROMIUM_PATH||undefined});
const ctx=await browser.newContext({viewport:{width:1280,height:900}});const page=await ctx.newPage();
const logs=[];page.on('pageerror',e=>logs.push('PAGEERROR: '+e.message.slice(0,300)));page.on('console',m=>{if(m.type()==='error'&&!/supabase|Failed to fetch|net::ERR|404|WebSocket|pdf\.worker|cdnjs/i.test(m.text()))logs.push(m.text().slice(0,200));});
page.on('dialog',d=>d.accept().catch(()=>{}));
const C={};const wait=ms=>page.waitForTimeout(ms);
await page.goto(BASE+'/index.html?pdfjs=/pdfjs/');await wait(600);await page.evaluate(()=>{localStorage.clear();localStorage.setItem('trace:wide','1');});await page.evaluate(()=>new Promise(r=>{try{const q=indexedDB.deleteDatabase('trace-kv');q.onsuccess=q.onerror=q.onblocked=()=>r();}catch(e){r();}}));
await page.reload();await wait(1200);
{const s=await page.$('#loginSkip');if(s&&await s.isVisible())await s.click();await wait(700);}
const click=async v=>{await page.evaluate(v=>{const el=document.querySelector(`#eq-app [data-act=af][data-v="${v}"]`);if(!el)throw new Error('bouton absent '+v);el.click();},v);await wait(250);};
await page.evaluate(async()=>{const T=window.TRACE;T.state.userId='ethan';T.renderHome();document.getElementById('htCom').click();await new Promise(x=>setTimeout(x,250));
  document.querySelector('#eq-app [data-act=af][data-v="new|"]').click();await new Promise(x=>setTimeout(x,150));document.getElementById('afn-num').value='O2610-31';document.getElementById('afn-nom').value='Cellules';document.getElementById('afn-client').value='CLIENT TEST';document.getElementById('afn-etat').value='devis';
  document.querySelector('#eq-app [data-act=af][data-v="create|"]').click();await new Promise(x=>setTimeout(x,250));document.querySelector('#eq-app [data-act=af][data-v="tab|dossier"]').click();await new Promise(x=>setTimeout(x,200));});
await page.setInputFiles('#eq-app input[data-affile]',path.join(HERE,'fixture_dce.zip'));await wait(2500);
const xid=await page.evaluate(()=>{const a=window.TRACE.affaires.get('O2610-31');const d=a.dce.find(x=>!x.deleted&&/DPGF_lot2\.xlsx$/.test(x.name));return d&&d.id;});
await click('dcopen|'+xid);await wait(2000);
let out=await page.evaluate(()=>{const t=document.querySelector('#cm-ldoc .cm-xl');if(!t)return {table:false};const h=[...t.querySelectorAll('.cm-xlh td[data-c]')].map(td=>td.dataset.c);const rn=[...t.querySelectorAll('td.cm-xlr[data-r]')].map(td=>td.dataset.r);
  const pseudoC=getComputedStyle(t.querySelector('.cm-xlh td[data-c]'),'::before').content;const pseudoR=getComputedStyle(t.querySelector('td.cm-xlr[data-r]'),'::before').content;
  const txt=document.querySelector('#cm-ldoc .cm-pages').textContent;return {table:true,h,rn,pseudoC,pseudoR,txt:txt.slice(0,160),hasLetters:/^\s*A\s*B/.test(txt)};});
console.log('1) cellules :',JSON.stringify(out));
const rnum=(out.rn||[]).map(Number);
C.c1=out.table&&out.h[0]==='A'&&out.h[1]==='B'&&out.h.length>=3&&rnum.length>=5&&rnum.every((n,i)=>n>0&&(i===0||n>rnum[i-1]))&&out.pseudoC==='"A"'&&/^"\d+"$/.test(out.pseudoR)&&!out.hasLetters;
// 2) note sur une cellule (texte sélectionné dans le tableau) → popover, note enregistrée avec l'extrait
const sel=await page.evaluate(()=>{const root=document.querySelector('#cm-ldoc .cm-pages');const td=[...root.querySelectorAll('.cm-xl td')].find(x=>!x.classList.contains('cm-xlr')&&x.textContent.trim().length>4);if(!td)return null;const n=[...td.childNodes].find(x=>x.nodeType===3);const r=document.createRange();r.setStart(n,0);r.setEnd(n,Math.min(n.nodeValue.length,12));const s=window.getSelection();s.removeAllRanges();s.addRange(r);const rect=r.getBoundingClientRect();td.dispatchEvent(new MouseEvent('mouseup',{bubbles:true,clientX:rect.right,clientY:rect.bottom}));return n.nodeValue.slice(0,12);});
await wait(400);
out=await page.evaluate(()=>{const pop=document.querySelector('.cm-lv .cm-pop');return {shown:!!pop&&!pop.hidden,extrait:pop&&pop.dataset.extrait};});
if(out.shown){await page.evaluate(()=>{document.getElementById('cm-pop-txt').value='Ligne DPGF à vérifier';const pop=document.querySelector('.cm-lv .cm-pop');const b=[...pop.querySelectorAll('button')].find(x=>/Ajouter|Noter|Enregistrer|OK/i.test(x.textContent));if(b)b.click();});await wait(600);}
const notes=await page.evaluate(()=>{const a=window.TRACE.affaires.get('O2610-31');const d=a.dce.find(x=>/DPGF_lot2\.xlsx$/.test(x.name));return (d.notes||[]).map(n=>({t:n.texte,e:n.extrait||''}));});
const hl=await page.evaluate(()=>document.querySelectorAll('#cm-ldoc .cm-hl').length);
console.log('2) note sur une cellule :',JSON.stringify({sel,out,notes,hl}));
C.c2=!!sel&&out.shown&&notes.length===1&&notes[0].t==='Ligne DPGF à vérifier'&&(!notes[0].e||notes[0].e.indexOf(sel.trim().slice(0,6))>=0);
// 3) téléphone : la page ne déborde pas (le tableau défile dans la visionneuse)
await page.setViewportSize({width:390,height:844});await wait(500);
const ov=await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth+1);console.log('3) 390 px sans débordement :',ov);C.c3=ov;
C.logs=logs.length===0;
const bad=Object.entries(C).filter(([k,v])=>!v).map(([k])=>k);console.log(bad.length?'RESULTAT: ECHEC '+bad.join(','):'RESULTAT: TOUT VERT');console.log(logs.length?logs:'[]');
await browser.close();
