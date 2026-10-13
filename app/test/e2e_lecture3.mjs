// LECTURE v3 (13/10/2026, retours d'Ethan sur la lecture des pièces) : visionneuse à hauteur d'écran ; note = TITRE tapé, notes déroulantes, recherche,
// modification ; recherche dans la pièce ; zoom net ; page entière ; ROTATION (surlignages qui suivent, note créée pivotée) ; ▭ zone encadrée sur un plan ;
// Word .docx / .doc / .rtf / .odt lus (titres numérotés, tableau, image ; .doc : texte + avertissement) ; surlignage ANCRÉ au texte (suit la remise en page) ;
// pièce illisible (DWG) : raison, téléchargement, note avec repère ; plein écran + Échap ; FENÊTRE SÉPARÉE (2e écran) annotable ; fichier déposé sur la lecture.
import { chromium } from 'playwright';
import fs from 'fs';import path from 'path';import {fileURLToPath} from 'url';
const HERE=path.dirname(fileURLToPath(import.meta.url));
const BASE=process.env.BASE||'http://localhost:8765';
const browser=await chromium.launch({headless:true, executablePath: process.env.CHROMIUM_PATH||undefined});
const ctx=await browser.newContext({viewport:{width:1280,height:900},acceptDownloads:true});const page=await ctx.newPage();
const logs=[];const watch=pg=>{pg.on('pageerror',e=>logs.push('PAGEERROR: '+e.message.slice(0,300)));pg.on('console',m=>{if(m.type()==='error'&&!/supabase|Failed to fetch|net::ERR|404|WebSocket|pdf\.worker|cdnjs/i.test(m.text()))logs.push(m.text().slice(0,200));});};watch(page);
page.on('dialog',d=>d.accept().catch(()=>{}));
const C={};const wait=ms=>page.waitForTimeout(ms);
await page.goto(BASE+'/index.html?pdfjs=/pdfjs/');await wait(600);await page.evaluate(()=>{localStorage.clear();localStorage.setItem('trace:wide','1');}); /* affichage large (comme Ethan sur PC) */await page.evaluate(()=>new Promise(r=>{try{const q=indexedDB.deleteDatabase('trace-kv');q.onsuccess=q.onerror=q.onblocked=()=>r();}catch(e){r();}}));
await page.reload();await wait(1200);
{const s=await page.$('#loginSkip');if(s&&await s.isVisible())await s.click();await wait(700);}
const click=async v=>{await page.evaluate(v=>{const el=document.querySelector(`#eq-app [data-act=af][data-v="${v}"]`);if(!el)throw new Error('bouton absent '+v);el.click();},v);await wait(250);};
const lv=async k=>{await page.evaluate(k=>{const b=document.querySelector(`#cm-ldoc [data-lv="${k}"]`);if(!b)throw new Error('bouton absent '+k);b.click();},k);await wait(450);};
const aff=()=>page.evaluate(()=>window.TRACE.affaires.get('O2610-12'));
const docId=async re=>page.evaluate(src=>{const a=window.TRACE.affaires.get('O2610-12');const d=a.dce.find(x=>!x.deleted&&!x.superseded&&new RegExp(src).test(x.name));return d&&d.id;},re.source);
/* sélectionne dans la page le texte « needle » (couche texte PDF ou paragraphe Word) et lâche la souris → popover */
const selectText=(pg,needle)=>pg.evaluate(needle=>{const root=document.querySelector('.cm-lv .cm-pages');const W=document.createTreeWalker(root,4,null);let n;while((n=W.nextNode())){const i=n.nodeValue.indexOf(needle);if(i>=0){const r=document.createRange();r.setStart(n,i);r.setEnd(n,i+needle.length);const s=window.getSelection();s.removeAllRanges();s.addRange(r);root.closest('.cm-lv').dispatchEvent(new MouseEvent('mouseup',{bubbles:true}));return true;}}return false;},needle);
const popInfo=pg=>pg.evaluate(()=>{const pop=document.querySelector('.cm-lv .cm-pop');const first=pop&&pop.querySelector('input');return {shown:!!pop&&!pop.hidden,firstId:first&&first.id,ref:(document.getElementById('cm-pop-ref')||{}).value,extrait:pop&&pop.dataset.extrait};});
const addNote=(pg,title,dests)=>pg.evaluate(([title,dests])=>{const pop=document.querySelector('.cm-lv .cm-pop');if(dests)pop.querySelectorAll('.cm-pd').forEach(b=>{const k=b.dataset.pop.split('|')[1];if(dests.includes(k)!==b.classList.contains('on'))b.click();});document.getElementById('cm-pop-txt').value=title;pop.querySelector('[data-pop="add|"]').click();},[title,dests]);
const overlap=(a,b)=>a&&b&&a.left<b.right&&b.left<a.right&&a.top<b.bottom&&b.top<a.bottom;
// ── 0) affaire + DCE (zip du jeu d'essai) → Lecture
await page.evaluate(async()=>{const T=window.TRACE;T.state.userId='ethan';T.renderHome();document.getElementById('htCom').click();await new Promise(x=>setTimeout(x,250));
  document.querySelector('#eq-app [data-act=af][data-v="new|"]').click();await new Promise(x=>setTimeout(x,150));document.getElementById('afn-num').value='O2610-12';document.getElementById('afn-nom').value='Lecture v3';document.getElementById('afn-client').value='CORIANCE';document.getElementById('afn-etat').value='devis';
  document.querySelector('#eq-app [data-act=af][data-v="create|"]').click();await new Promise(x=>setTimeout(x,250));document.querySelector('#eq-app [data-act=af][data-v="tab|dossier"]').click();await new Promise(x=>setTimeout(x,200));});
await page.setInputFiles('#eq-app input[data-affile]',path.join(HERE,'fixture_dce.zip'));await wait(2500);
await click('dcopen|'+await docId(/CCTP_lot2/));await wait(2500);
// ── 1) hauteur : la visionneuse occupe la hauteur de l'écran ; la note tapée = TITRE ; déroulants ; recherche ; modifier
let out=await page.evaluate(()=>{const sc=document.querySelector('#cm-ldoc .cm-lscroll');return {h:sc.clientHeight,vh:innerHeight,canvas:document.querySelectorAll('#cm-ldoc canvas').length,tools:[...document.querySelectorAll('#cm-ldoc .cm-ltz [data-lv]')].map(b=>b.dataset.lv.split('|')[0])};});
out.sel=await selectText(page,'10 % des soudures');await wait(250);out.pop=await popInfo(page);
await addNote(page,'Radio 10 % feeders',['chiffrage','risque']);await wait(500);
await selectText(page,'choix des joints');await wait(250);await addNote(page,'',['memoire']);await wait(500);
out.list=await page.evaluate(()=>[...document.querySelectorAll('#cm-lnotes details.cm-n')].map(d=>({t:d.querySelector('.cm-nt').textContent,open:d.open,meta:d.querySelector('.cm-nm').textContent})));
await wait(2700);await click('lectdest|');await wait(200); /* la note qui vient d'être ajoutée s'affiche dépliée ~2,5 s, puis tout est replié */
out.closed=await page.evaluate(()=>[...document.querySelectorAll('#cm-lnotes details.cm-n')].map(d=>d.open));
await page.fill('#cm-nq','radio');await wait(400);out.q1=await page.evaluate(()=>({n:document.querySelectorAll('#cm-lnotes .cm-n').length,mark:!!document.querySelector('#cm-lnotes mark.cm-qm')}));
await page.fill('#cm-nq','zzz introuvable');await wait(400);out.q0=await page.evaluate(()=>({n:document.querySelectorAll('#cm-lnotes .cm-n').length,txt:document.getElementById('cm-lnotes').textContent}));
await page.fill('#cm-nq','');await wait(400);
const cid=await docId(/fixture_cctp|CCTP/);
await page.evaluate(()=>{const d=document.querySelector('#cm-lnotes details.cm-n');d.open=true;});await wait(100);
await page.evaluate(()=>{document.querySelector('#cm-lnotes [data-v^="dcenoteed|"]').click();});await wait(250);
await page.evaluate(()=>{document.getElementById('ne-txt').value='Radio 10 % feeders — prévoir 2 vacations';document.getElementById('ne-ok').click();});await wait(400);
out.edit=await page.evaluate(()=>{const a=window.TRACE.affaires.get('O2610-12');const d=a.dce.find(x=>x.notes&&x.notes.length);return {t:d.notes.map(n=>n.texte),ed:!!d.notes[0].editedAt,list:[...document.querySelectorAll('#cm-lnotes .cm-nt')].map(x=>x.textContent)};});
console.log('1) hauteur + notes :',JSON.stringify(out));
C.c1=out.h>=0.7*out.vh&&out.canvas===2&&['find','zoom','fit','rot','box','full','win','dl'].every(k=>out.tools.includes(k))&&out.sel&&out.pop.shown&&out.pop.firstId==='cm-pop-txt'&&out.list.length===2&&out.list.some(n=>n.t==='Radio 10 % feeders'&&/p\. 1 · art\. 4\.5/.test(n.meta))&&out.list.some(n=>/^« .*choix des joints/.test(n.t))
  &&out.closed.every(o=>!o)&&out.q1.n===1&&out.q1.mark&&out.q0.n===0&&/Aucune note ne contient/.test(out.q0.txt)&&out.edit.ed&&out.edit.list.includes('Radio 10 % feeders — prévoir 2 vacations');
// ── 2) recherche dans la pièce (toutes les pages), zoom net, page entière
await lv('find|');await page.fill('#cm-ldoc .cm-lq','radiographique');await wait(900);
out={s1:await page.evaluate(()=>({lab:document.querySelector('#cm-ldoc .cm-lqn').textContent,on:document.querySelectorAll('#cm-ldoc .cm-sh.on').length,sh:document.querySelectorAll('#cm-ldoc .cm-sh').length}))};
await page.press('#cm-ldoc .cm-lq','Escape');await wait(200);out.s0=await page.evaluate(()=>({sh:document.querySelectorAll('#cm-ldoc .cm-sh').length,hidden:document.querySelector('#cm-ldoc .cm-lsearch').hidden}));
const cw=()=>page.evaluate(()=>{const c=document.querySelector('#cm-ldoc .cm-page[data-p="1"] canvas');const p=document.querySelector('#cm-ldoc .cm-page[data-p="1"]');return {cw:c?c.width:0,pw:p.getBoundingClientRect().width,ph:p.getBoundingClientRect().height,hl:document.querySelectorAll('#cm-ldoc .cm-hl').length,sch:document.querySelector('#cm-ldoc .cm-lscroll').clientHeight};});
out.z0=await cw();await lv('zoom|+');await wait(900);out.z1=await cw();await lv('zoom|-');await wait(700);
await lv('fit|');await wait(900);out.fit=await cw();await lv('fit|');await wait(800);
console.log('2) recherche / zoom / page entière :',JSON.stringify(out));
C.c2=/^1\/\d+$/.test(out.s1.lab)&&out.s1.on===1&&out.s1.sh>=1&&out.s0.sh===0&&out.s0.hidden&&out.z1.cw>=out.z0.cw*1.15&&out.z1.pw>=out.z0.pw*1.15&&out.z1.hl===out.z0.hl&&out.z0.hl>=2&&out.fit.ph<=out.fit.sch+2;
// ── 3) rotation : la page pivote (largeur ↔ hauteur), gardée sur la pièce ; le surlignage suit le texte ; une note créée pivotée reste juste après un autre quart de tour
const spanBox=(needle,key)=>page.evaluate(([needle,key])=>{const s=[...document.querySelectorAll('#cm-ldoc .cm-page[data-p="1"] .textLayer span')].find(x=>x.textContent.includes(needle));const h=[...document.querySelectorAll(`#cm-ldoc .cm-hl[data-n="${key}"]`)];const R=e=>{const r=e.getBoundingClientRect();return {left:r.left,top:r.top,right:r.right,bottom:r.bottom};};return {span:s?R(s):null,hl:h.map(R)};},[needle,key]);
out={r0:await cw()};const k0=cid+'|0';out.b0=await spanBox('10 % des soudures',k0);
await lv('rot|');await wait(1300);out.r1=await cw();out.b1=await spanBox('10 % des soudures',k0);out.rot=(await aff()).dce.find(d=>d.id===cid).rot;
await selectText(page,'Toute soudure');await wait(250);await addNote(page,'Soudure non conforme = reprise',['risque']);await wait(500);
out.n3=(await aff()).dce.find(d=>d.id===cid).notes[2];
await lv('rot|');await wait(1300);out.b2=await spanBox('10 % des soudures',k0);out.b2b=await spanBox('Toute soudure',cid+'|2');
await lv('rot|');await wait(1000);await lv('rot|');await wait(1300);out.back=(await aff()).dce.find(d=>d.id===cid).rot;out.b4=await spanBox('Toute soudure',cid+'|2');
console.log('3) rotation :',JSON.stringify({r0:out.r0,r1:out.r1,rot:out.rot,n3rot:out.n3&&out.n3.rot,b1:out.b1.hl.length,b2:out.b2.hl.length,b2b:out.b2b.hl.length,back:out.back,ov:[overlap(out.b0.span,out.b0.hl[0]),out.b1.hl.some(h=>overlap(out.b1.span,h)),out.b2.hl.some(h=>overlap(out.b2.span,h)),out.b2b.hl.some(h=>overlap(out.b2b.span,h)),out.b4.hl.some(h=>overlap(out.b4.span,h))]}));
C.c3=Math.abs(out.r1.pw/out.r1.ph-out.r0.ph/out.r0.pw)<0.05&&out.rot===90&&out.n3&&out.n3.rot===90&&out.back===0&&overlap(out.b0.span,out.b0.hl[0])&&out.b1.hl.some(h=>overlap(out.b1.span,h))&&out.b2.hl.some(h=>overlap(out.b2.span,h))&&out.b2b.hl.some(h=>overlap(out.b2b.span,h))&&out.b4.hl.some(h=>overlap(out.b4.span,h));
// ── 4) ▭ zone encadrée sur un plan
await click('dcopen|'+await docId(/PL-01_trace/));await wait(2000);await lv('box|');
await page.evaluate(()=>{const pg=document.querySelector('#cm-ldoc .cm-page[data-p="1"]');const r=pg.getBoundingClientRect();const el=document.querySelector('#cm-ldoc .cm-lv');const ev=(t,x,y)=>el.dispatchEvent(new PointerEvent(t,{bubbles:true,clientX:x,clientY:y,pointerId:1,target:pg}));const tgt=pg.querySelector('canvas')||pg;tgt.dispatchEvent(new PointerEvent('pointerdown',{bubbles:true,clientX:r.left+r.width*0.2,clientY:r.top+r.height*0.2,pointerId:1}));el.dispatchEvent(new PointerEvent('pointermove',{bubbles:true,clientX:r.left+r.width*0.5,clientY:r.top+r.height*0.45,pointerId:1}));el.dispatchEvent(new PointerEvent('pointerup',{bubbles:true,clientX:r.left+r.width*0.5,clientY:r.top+r.height*0.45,pointerId:1}));});await wait(300);
out={pop:await popInfo(page)};await addNote(page,'Chambre de vannes à créer',['chiffrage','question']);await wait(500);
out.n=await page.evaluate(()=>{const a=window.TRACE.affaires.get('O2610-12');const d=a.dce.find(x=>/PL-01_trace/.test(x.name));const n=(d.notes||[])[0];return n&&{zone:n.zone,rects:n.rects.length,r:n.rects[0],ref:n.ref,hl:document.querySelectorAll('#cm-ldoc .cm-hl.zone').length};});
console.log('4) zone encadrée :',JSON.stringify(out));
C.c4=out.pop.shown&&/zone encadrée/.test(out.pop.ref)&&out.n&&out.n.zone&&out.n.rects===1&&Math.abs(out.n.r.x-0.2)<0.03&&Math.abs(out.n.r.w-0.3)<0.03&&out.n.hl===1;
// ── 5) Word : .docx / .doc / .rtf / .odt joints depuis la lecture (📎 Joindre) → lus ; surlignage ancré dans le .doc, qui suit la remise en page
await page.setInputFiles('#eq-app .cm-ljoin input[type=file]',['docx','doc','rtf','odt'].map(e=>path.join(HERE,'fixture_word.'+e)));await wait(3000);
out={opened:await page.evaluate(()=>{const a=window.TRACE.affaires.get('O2610-12');const id=document.getElementById('cm-ldoc').dataset.doc;return (a.dce.find(d=>d.id===id)||{}).name;})};
const word=async e=>{await click('dcopen|'+await docId(new RegExp('fixture_word\\.'+e+'$')));await wait(1500);return page.evaluate(()=>{const pg=document.querySelector('#cm-ldoc .cm-page');const t=pg?pg.textContent:'';return {h:[...pg.querySelectorAll('.cm-h1,.cm-h2')].map(x=>x.textContent.replace(/\s+/g,' ').trim()),tab:pg.querySelectorAll('.cm-dtab').length,img:[...pg.querySelectorAll('img.cm-dimg')].map(i=>(i.src||'').slice(0,5)),leak:/<w:|w:val/.test(t),warn:(pg.querySelector('.cm-lwarn')||{}).textContent||'',radio:/10 % des soudures sur les feeders/.test(t)};});};
out.docx=await word('docx');out.doc=await word('doc');out.rtf=await word('rtf');out.odt=await word('odt');
await click('dcopen|'+await docId(/fixture_word\.doc$/));await wait(1200);
await selectText(page,'20 % sur les antennes');await wait(250);out.pop=await popInfo(page);await addNote(page,'Antennes à 20 %',['chiffrage']);await wait(500);
const ancBox=()=>page.evaluate(()=>{const a=window.TRACE.affaires.get('O2610-12');const d=a.dce.find(x=>/fixture_word\.doc$/.test(x.name));const n=d.notes[0];const key=d.id+'|0';const pg=document.querySelector('#cm-ldoc .cm-page');const W=document.createTreeWalker(pg,4,null);let t,k=0,r=document.createRange(),ok=0;while((t=W.nextNode())){const L=t.nodeValue.length;if(!ok&&n.anchor.s<=k+L){r.setStart(t,n.anchor.s-k);ok=1;}if(ok&&n.anchor.e<=k+L){r.setEnd(t,n.anchor.e-k);break;}k+=L;}const R=e=>{const b=e.getBoundingClientRect();return {left:b.left,top:b.top,right:b.right,bottom:b.bottom};};return {anchor:n.anchor,rot:n.rot,txt:r.toString(),range:R(r),hl:[...document.querySelectorAll(`#cm-ldoc .cm-hl[data-n="${key}"]`)].map(R)};});
out.a1=await ancBox();await page.setViewportSize({width:760,height:900});await wait(1200);out.a2=await ancBox();await page.setViewportSize({width:1280,height:900});await wait(900);
console.log('5) Word :',JSON.stringify(out));
C.c5=/fixture_word\.odt/.test(out.opened||'')&&out.docx.h.includes('2.1 Radiographie')&&out.docx.h.includes('3. Réception')&&out.docx.tab===1&&out.docx.img.length===1&&out.docx.img[0]==='blob:'&&!out.docx.leak&&out.docx.radio
  &&/Word 97-2003/.test(out.doc.warn)&&out.doc.radio&&!out.doc.leak&&out.rtf.radio&&/RTF/.test(out.rtf.warn)&&out.odt.tab===1&&out.odt.img.length===1&&out.odt.radio
  &&out.pop.shown&&out.a1.anchor&&out.a1.txt==='20 % sur les antennes'&&out.a1.rot===undefined&&out.a1.hl.length>=1&&out.a1.hl.some(h=>overlap(h,out.a1.range))&&out.a2.hl.some(h=>overlap(h,out.a2.range))&&out.a2.range.left!==undefined;
// ── 6) pièce illisible (DWG) : la raison, ⤓ télécharger, note avec repère
await page.setInputFiles('#eq-app .cm-ljoin input[type=file]',{name:'PL-03_chambre.dwg',mimeType:'application/acad',buffer:Buffer.from('AC1027 fichier DWG factice pour le test')});await wait(1500);
out={fiche:await page.evaluate(()=>{const p=document.querySelector('#cm-ldoc .cm-nof');return p?{t:p.textContent.replace(/\s+/g,' '),dl:!!p.querySelector('[data-lv="dl|"]'),form:!!p.querySelector('.cm-nofn')}:null;})};
const [dl]=await Promise.all([page.waitForEvent('download',{timeout:5000}).catch(()=>null),page.evaluate(()=>document.querySelector('#cm-ldoc .cm-nof [data-lv="dl|"]').click())]);out.dl=dl?dl.suggestedFilename():null;
await page.evaluate(()=>{const b=document.querySelector('#cm-ldoc .cm-nofn');b.querySelector('[data-nf=ref]').value='Folio 3, rue Victor Hugo';b.querySelector('[data-nf=txt]').value='Chambre de vannes à reprendre';b.querySelector('.cm-pd.question').click();b.querySelector('[data-lv="nfadd|"]').click();});await wait(500);
out.n=await page.evaluate(()=>{const a=window.TRACE.affaires.get('O2610-12');const d=a.dce.find(x=>/\.dwg$/.test(x.name));const n=(d.notes||[])[0];return {n:n&&{ref:n.ref,t:n.texte,dests:n.dests,sp:n.sansPassage},list:[...document.querySelectorAll('#cm-lnotes .cm-nt')].map(x=>x.textContent)};});
console.log('6) DWG :',JSON.stringify(out));
C.c6=out.fiche&&/AutoCAD \(DWG\)/.test(out.fiche.t)&&/DWG TrueView/.test(out.fiche.t)&&out.fiche.dl&&out.fiche.form&&out.dl==='PL-03_chambre.dwg'&&out.n.n&&out.n.n.ref==='Folio 3, rue Victor Hugo'&&out.n.n.dests.join()==='chiffrage,question'&&out.n.n.sp&&out.n.list.includes('Chambre de vannes à reprendre');
// ── 7) plein écran (pièce + notes), Échap pour sortir
await click('dcopen|'+cid);await wait(1500);await lv('full|');await wait(900);
out={full:await page.evaluate(()=>{const c=document.getElementById('cm-lcard');const r=c.getBoundingClientRect();const sc=c.querySelector('.cm-lscroll');const side=c.querySelector('.cm-lside').getBoundingClientRect();return {cls:c.classList.contains('full'),w:r.width,h:r.height,sch:sc?sc.clientHeight:0,side:side.left>r.left+r.width*0.5,canvas:c.querySelectorAll('canvas').length};})};
await page.keyboard.press('Escape');await wait(600);out.after=await page.evaluate(()=>({cls:document.getElementById('cm-lcard').classList.contains('full'),canvas:document.querySelectorAll('#cm-ldoc canvas').length}));
console.log('7) plein écran :',JSON.stringify(out));
C.c7=out.full.cls&&out.full.w>=1270&&out.full.h>=890&&out.full.sch>=650&&out.full.side&&out.full.canvas>=1&&!out.after.cls&&out.after.canvas>=1;
// ── 8) fenêtre séparée (2e écran) : la pièce s'y ouvre, on y annote, la note arrive dans l'appli ; fermer → la pièce revient
const [pop]=await Promise.all([page.waitForEvent('popup'),page.evaluate(()=>document.querySelector('#cm-ldoc [data-lv="win|"]').click())]);watch(pop);await pop.waitForTimeout(3000);
out={pw:await pop.evaluate(()=>({canvas:document.querySelectorAll('.cm-lv canvas').length,spans:document.querySelectorAll('.cm-lv .textLayer span').length,opts:document.querySelectorAll('.cm-wdoc option').length,title:document.title})),ph:await page.evaluate(()=>!!document.querySelector('#cm-ldoc .cm-lpopph'))};
await selectText(pop,'selon DMOS');await pop.waitForTimeout(300);out.pop=await popInfo(pop);await addNote(pop,'DMOS à fournir',['memoire']);await pop.waitForTimeout(700);
out.main=await page.evaluate(()=>({list:[...document.querySelectorAll('#cm-lnotes .cm-nt')].map(x=>x.textContent),hlPop:0}));out.hlPop=await pop.evaluate(()=>document.querySelectorAll('.cm-lv .cm-hl').length);
await page.evaluate(()=>document.querySelector('#eq-app [data-act=af][data-v="lpopclose|"]').click());await wait(1500);
out.back=await page.evaluate(()=>({ph:!!document.querySelector('#cm-ldoc .cm-lpopph'),canvas:document.querySelectorAll('#cm-ldoc canvas').length,win:!!window.TRACE.lectureWin&&!!window.TRACE.lectureWin()}));
console.log('8) fenêtre séparée :',JSON.stringify(out));
C.c8=out.pw.canvas>=1&&out.pw.spans>5&&out.pw.opts>=8&&/Lecture/.test(out.pw.title)&&out.ph&&out.pop.shown&&out.main.list.includes('DMOS à fournir')&&out.hlPop>=3&&!out.back.ph&&out.back.canvas>=1&&!out.back.win;
// ── 9) fichier glissé-déposé sur la lecture → pièce ajoutée et ouverte
await page.evaluate(()=>{const dt=new DataTransfer();dt.items.add(new File(['Compte rendu de visite : accès chantier par la rue des Lilas.'],'CR_visite.txt',{type:'text/plain'}));const card=document.getElementById('cm-lcard');card.dispatchEvent(new DragEvent('dragover',{bubbles:true,dataTransfer:dt}));card.dispatchEvent(new DragEvent('drop',{bubbles:true,dataTransfer:dt}));});await wait(1500);
out=await page.evaluate(()=>{const a=window.TRACE.affaires.get('O2610-12');const id=document.getElementById('cm-ldoc').dataset.doc;const d=a.dce.find(x=>x.id===id);return {name:d&&d.name,txt:(document.querySelector('#cm-ldoc .cm-page')||{}).textContent||''};});
console.log('9) glisser-déposer :',JSON.stringify(out));
C.c9=out.name==='CR_visite.txt'&&/rue des Lilas/.test(out.txt);
const bad=Object.entries(C).filter(([k,v])=>!v).map(([k])=>k);console.log(bad.length?'RESULTAT: ECHEC '+bad.join(','):'RESULTAT: TOUT VERT');console.log(logs.length?logs:'[]');
await browser.close();
