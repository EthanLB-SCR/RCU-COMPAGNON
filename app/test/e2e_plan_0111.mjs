// e2e_plan_0111.mjs — 01/11 soir (retours d'Ethan après le lot 0111n) : PLAN D'ENSEMBLE ÉPURÉ et LECTEUR PDF.
//  « le bouton raccourci + a carrément disparu ? » : il chevauchait la colonne zoom (− et ⌂) → remis, en bas AU MILIEU du plan, sans toucher aucun bouton
//  « la haute définition n'a pas fonctionné pour tous les documents » : le lecteur (zone qui défile) se rangeait À CÔTÉ des boutons flottants
//  (« 🔍 Agrandir · ⤢ Plein écran ») → PDF dessiné et affiché en ~107 px de large au téléphone. Données FICTIVES (PDF généré ici).
//  p1  arrivée sur un chantier : sans fond de plan, bandeau nom + % masqué sur le plan, légende repliée (« ℹ Légende »)
//  p2  ＋ visible sur le plan à 390, 360 et 1366 px, ne chevauche ni la colonne zoom, ni la légende (repliée ou ouverte), ni la 2e ligne ; toucher → « ＋ Poser sur le plan »
//  p3  légende : « ℹ Légende » l'ouvre (choix gardé), pas sous le ＋ ; « ✕ Légende » la replie
//  p4  Vie du chantier / Technique : pas de ＋ ; retour au plan : il revient
//  p5  lecteur PDF (téléphone, écran ×3) : zone de lecture sur toute la largeur de la fenêtre, page à la largeur de la zone, image ≥ 1,3 × les pixels de l'écran ;
//      « 🔍 Agrandir » : page ×2, toujours nette (≥ 0,95 × les pixels de l'écran)
//  p6  document texte (règlement) : zone de lecture sur toute la largeur aussi
//  p7  console propre
//  p8  un PDF déjà signé se rouvre et s'affiche (avant : « Chargement du document… » sans fin)
import { chromium, devices } from 'playwright';
import { makePdf } from './mkpdf.mjs';
const BASE=process.env.BASE||'http://localhost:8765';const SHOTS=process.env.SHOTS||'';
const browser=await chromium.launch({headless:true, executablePath: process.env.CHROMIUM_PATH||undefined});
const C={};const logs=[];const J=x=>JSON.stringify(x);
const watch=p=>{p.on('pageerror',e=>logs.push('PAGEERROR: '+e.message.slice(0,300)));p.on('console',m=>{if(m.type()==='error'&&!/supabase|Failed to fetch|net::ERR|404|geopf|WebSocket|open-meteo/i.test(m.text()))logs.push(m.text().slice(0,200));});p.on('dialog',d=>d.accept().catch(()=>{}));};
const inter=(a,b)=>!!a&&!!b&&a.left<b.right-0.5&&b.left<a.right-0.5&&a.top<b.bottom-0.5&&b.top<a.bottom-0.5;
/* ── téléphone (iPhone 13 : 390 × 664, écran ×3, tactile) */
let ctx=await browser.newContext({...devices['iPhone 13']});let page=await ctx.newPage();watch(page);const wait=ms=>page.waitForTimeout(ms);
await ctx.route(u=>/(^|\.)geopf\.fr$|^geo\.api\.gouv\.fr$|open-meteo\.com$|data\.geopf\.fr$/.test(u.hostname),r=>r.fulfill({status:200,contentType:'application/json',body:'[]'}));
await page.goto(BASE+'/index.html?pdfjs=/pdfjs/');await wait(500);await page.evaluate(()=>{localStorage.clear();});await page.evaluate(()=>new Promise(r=>{try{const q=indexedDB.deleteDatabase('trace-kv');q.onsuccess=q.onerror=q.onblocked=()=>r();}catch(e){r();}}));await page.reload();await wait(1200); /* la suppression se termine au rechargement (sinon l'écriture ci-dessous attend derrière elle) */
/* un document PDF FICTIF façon fiche de poste (A4, 12 pt et 8 pt), déposé dans le registre de l'appareil avant l'ouverture */
const rows=[];for(let i=0;i<40;i++)rows.push([50,780-i*18,i%3===0?8:12,(i%3===0?'Petit 8 pt : ':'Texte 12 pt : ')+'mission fictive '+(i+1)+' - verifier, controler, rendre compte.']);
const pdfUrl='data:application/pdf;base64,'+makePdf([rows,rows.slice(0,22)]).toString('base64');
await page.evaluate(u=>new Promise(res=>{const r=indexedDB.open('trace-kv',1);r.onupgradeneeded=()=>{r.result.createObjectStore('kv');};r.onsuccess=()=>{const t=r.result.transaction('kv','readwrite');t.objectStore('kv').put({tst_pdf:{id:'tst_pdf',data:{id:'tst_pdf',kind:'autre',title:'Fiche test PDF',version:'v1',at:'2026-10-20',on:'2026-10-20',req:{all:true},active:true,data:u},updated_at:new Date().toISOString()}},'trace:reg:doc');t.oncomplete=()=>{r.result.close();res(1);};t.onerror=()=>res(0);};r.onerror=()=>res(0);}),pdfUrl);
await page.reload();await wait(1500);{const sk=await page.$('#loginSkip');if(sk&&await sk.isVisible())await sk.click();await wait(800);}
const openPlan=async()=>{await page.evaluate(()=>{const T=window.TRACE;const id=Object.keys(T.sites).find(k=>k!=='__vide'&&T.sites[k]&&T.sites[k].lines);T.showScreen('site');if(T.state.siteId!==id)T.switchSite(id);T.state.tab='plan';T.renderAll();});await wait(900);};
const plan=()=>page.evaluate(()=>{const r=e=>{if(!e)return null;const cs=getComputedStyle(e);if(cs.display==='none'||cs.visibility==='hidden')return null;const b=e.getBoundingClientRect();return b.width<2||b.height<2?null:{left:b.left,right:b.right,top:b.top,bottom:b.bottom,w:Math.round(b.width),h:Math.round(b.height)};};
  const T=window.TRACE;const L=document.getElementById('legend');const cv=document.getElementById('canvas');
  return {W:innerWidth,fab:r(document.getElementById('planFab')),zoom:[...document.querySelectorAll('.zoomctl button')].map(r).filter(Boolean),leg:r(L),legTog:r(L&&L.querySelector('.legTog')),legFolded:!!L&&L.classList.contains('folded'),legItems:L?[...L.children].filter(x=>!x.classList.contains('legTog')&&getComputedStyle(x).display!=='none').length:0,
    ctxLine:r(document.querySelector('#tbSite .tbCtx')),canvas:r(cv),l1:getComputedStyle(document.querySelector('#siteHead .l1')).display,l2:getComputedStyle(document.querySelector('#siteHead .l2')).display,fond:T.state.show.fond,facet:(document.querySelector('#facets .on')||{}).dataset?document.querySelector('#facets .on').dataset.facet:null};});
const fabOk=o=>!!o.fab&&o.fab.w>=48&&o.fab.h>=48&&o.zoom.length>=4&&!o.zoom.some(z=>inter(z,o.fab))&&!inter(o.leg,o.fab)&&!inter(o.ctxLine,o.fab)&&!!o.canvas&&o.fab.left>=o.canvas.left&&o.fab.right<=o.canvas.right&&o.fab.bottom<=o.canvas.bottom+1&&o.fab.top>=o.canvas.top;
/* ── p1 */
await openPlan();let o=await plan();if(SHOTS)await page.screenshot({path:SHOTS+'/plan_0111_390.png'});
console.log('p1) arrivée sur le plan (390) :',J({fond:o.fond,l1:o.l1,l2:o.l2,legFolded:o.legFolded,legItems:o.legItems,legTog:o.legTog,facet:o.facet}));
C.p1=o.fond===false&&o.l1==='none'&&o.l2==='none'&&o.legFolded&&o.legItems===0&&!!o.legTog&&o.legTog.h>=36&&o.facet==='plan';
/* ── p2 + p3 à 390 */
const p2={w390:o};
await page.tap('#legend .legTog');await wait(250);o=await plan();p2.open390=o;p2.saved=await page.evaluate(()=>localStorage.getItem('trace:legend'));
if(SHOTS)await page.screenshot({path:SHOTS+'/plan_0111_legende_390.png'});
if(p2.open390.fab){await page.tap('#planFab');await wait(300);}p2.sheet=await page.evaluate(()=>{const m=document.getElementById('modal');return !!m&&m.classList.contains('show')&&/Poser sur le plan/.test(m.textContent);});
await page.evaluate(()=>{const c=document.querySelector('#modal [data-close]');if(c)c.click();});await wait(200);
await page.tap('#legend .legTog');await wait(250);p2.refold=await plan();
await page.setViewportSize({width:360,height:740});await wait(400);p2.w360=await plan();
await page.tap('#legend .legTog');await wait(250);p2.open360=await plan();await page.tap('#legend .legTog');await wait(200);
console.log('p2) ＋ :',J({w390:{fab:p2.w390.fab,zoom:p2.w390.zoom.length,leg:p2.w390.leg},open390:{fab:!!p2.open390.fab,leg:p2.open390.leg},sheet:p2.sheet,w360:{fab:p2.w360.fab},open360:{leg:p2.open360.leg}}));
console.log('p3) légende :',J({open:p2.open390.legItems,folded:p2.open390.legFolded,saved:p2.saved,refold:p2.refold.legFolded}));
C.p3=!p2.open390.legFolded&&p2.open390.legItems>=5&&p2.saved==='1'&&p2.refold.legFolded&&p2.refold.legItems===0;
/* ── p4 : Vie du chantier → pas de ＋ ; retour au plan */
await page.setViewportSize({width:390,height:664});await wait(300);
await page.tap('#facets [data-facet="vie"]');await wait(400);const vie=await plan();await page.tap('#facets [data-facet="tech"]');await wait(400);const tech=await plan();
await page.tap('#facets [data-facet="plan"]');await wait(500);const back=await plan();
console.log('p4) familles :',J({vie:!!vie.fab,tech:!!tech.fab,back:!!back.fab}));
C.p4=!vie.fab&&!tech.fab&&fabOk(back);
/* ── p5 : lecteur PDF au téléphone */
await page.evaluate(()=>{window.TRACE.showScreen('home');document.getElementById('htEspace').click();});await wait(500);
await page.evaluate(()=>{const c=[...document.querySelectorAll('#eq-app .eq-subs .chip')].find(x=>/Documents/.test(x.textContent));if(c)c.click();});await wait(400);
await page.evaluate(()=>{const r=[...document.querySelectorAll('#eq-app .ac-row')].find(x=>/Fiche test PDF/.test(x.textContent));if(r)r.click();});
await page.waitForFunction(()=>document.querySelectorAll('#dr-body img.pdfPg').length>=2&&[...document.querySelectorAll('#dr-body img.pdfPg')].every(i=>i.naturalWidth>0),null,{timeout:20000}).catch(()=>{});await wait(400);
const rd=()=>page.evaluate(()=>{const box=document.querySelector('#modal .box')||document.getElementById('modal');const b=document.getElementById('dr-body');const cs=b?getComputedStyle(b):null;const inner=b?b.clientWidth-parseFloat(cs.paddingLeft)-parseFloat(cs.paddingRight):0;
  return {dpr:devicePixelRatio,box:Math.round(box.getBoundingClientRect().width),body:b?Math.round(b.getBoundingClientRect().width):0,inner:Math.round(inner),imgs:[...document.querySelectorAll('#dr-body img.pdfPg')].map(i=>({css:Math.round(i.getBoundingClientRect().width),nat:i.naturalWidth}))};});
const pdf={normal:await rd()};if(SHOTS)await page.screenshot({path:SHOTS+'/plan_0111_pdf_390.png'});
await page.tap('#dr-zoom');await wait(400);pdf.zoom=await rd();pdf.zoomTxt=await page.evaluate(()=>document.getElementById('dr-zoom').textContent);if(SHOTS)await page.screenshot({path:SHOTS+'/plan_0111_pdf_agrandi_390.png'});
await page.evaluate(()=>{const c=document.querySelector('#modal [data-close]');if(c)c.click();});await wait(300);
console.log('p5) lecteur PDF :',J(pdf));
const n=pdf.normal,z=pdf.zoom;
C.p5=n.imgs.length===2&&n.body>=0.85*n.box&&n.imgs.every(i=>i.css>=0.9*n.inner&&i.nat>=1.3*i.css*n.dpr)&&z.imgs.every(i=>i.css>=1.8*n.inner&&i.nat>=0.95*i.css*z.dpr)&&/Taille normale/.test(pdf.zoomTxt);
/* ── p6 : document texte (règlement intérieur) */
await page.evaluate(()=>{const r=[...document.querySelectorAll('#eq-app .ac-row')].find(x=>/Règlement intérieur/.test(x.textContent));if(r)r.click();});await wait(600);
const txt=await rd();await page.evaluate(()=>{const c=document.querySelector('#modal [data-close]');if(c)c.click();});await wait(200);
console.log('p6) document texte :',J({box:txt.box,body:txt.body}));
C.p6=txt.body>=0.85*txt.box&&txt.box>300;
/* ── p8 (01/11 soir, Ethan : « la note de service n° 1 ne s'affiche pas, ça charge à l'infini ») : un PDF déjà SIGNÉ se rouvre et s'affiche (avant : « Chargement du document… » sans fin) */
const openPdf=async()=>{await page.evaluate(()=>{const r=[...document.querySelectorAll('#eq-app .ac-row')].find(x=>/Fiche test PDF/.test(x.textContent));if(r)r.click();});await page.waitForFunction(()=>document.querySelectorAll('#dr-body img.pdfPg').length>=2,null,{timeout:15000}).catch(()=>{});await wait(300);};
await openPdf();
await page.evaluate(()=>{const b=document.getElementById('dr-body');b.scrollTop=b.scrollHeight;b.dispatchEvent(new Event('scroll'));});await wait(300);
const p8={canRead:await page.evaluate(()=>{const b=document.getElementById('dr-read');return !!b&&!b.disabled;})};
await page.evaluate(()=>{const b=document.getElementById('dr-read');if(b&&!b.disabled)b.click();});await wait(250);
await page.evaluate(()=>{const cv=document.getElementById('dr-pad');if(!cv)return;const r=cv.getBoundingClientRect();const ev=(t,x,y)=>cv.dispatchEvent(new PointerEvent(t,{bubbles:true,clientX:r.left+x,clientY:r.top+y,pointerId:1,pointerType:'touch'}));ev('pointerdown',20,40);ev('pointermove',80,60);ev('pointermove',140,30);ev('pointerup',140,30);});
await page.evaluate(()=>{const b=document.getElementById('dr-ok');if(b)b.click();});await wait(600);
await page.evaluate(()=>{const c=document.querySelector('#modal [data-close]');if(c&&document.getElementById('modal').classList.contains('show'))c.click();});await wait(300);
await openPdf();await wait(1200);
Object.assign(p8,await page.evaluate(()=>({signed:/✓ Signé par/.test((document.getElementById('modal')||{}).textContent||''),pages:document.querySelectorAll('#dr-body img.pdfPg').length,loading:/Chargement du document/.test((document.getElementById('dr-body')||{}).textContent||''),alt:(()=>{const a=document.getElementById('dr-alt');return !!a&&a.style.display!=='none';})()})));
await page.evaluate(()=>{const c=document.querySelector('#modal [data-close]');if(c)c.click();});await wait(200);
console.log('p8) PDF déjà signé, rouvert :',J(p8));
C.p8=p8.canRead&&p8.signed&&p8.pages===2&&!p8.loading&&!p8.alt;
/* ── p2 (suite) : PC 1366 */
await ctx.close();ctx=await browser.newContext({viewport:{width:1366,height:820}});page=await ctx.newPage();watch(page);
await ctx.route(u=>/(^|\.)geopf\.fr$|^geo\.api\.gouv\.fr$|open-meteo\.com$|data\.geopf\.fr$/.test(u.hostname),r=>r.fulfill({status:200,contentType:'application/json',body:'[]'}));
await page.goto(BASE+'/index.html');await page.waitForTimeout(500);await page.evaluate(()=>{localStorage.clear();});await page.reload();await page.waitForTimeout(1500);{const sk=await page.$('#loginSkip');if(sk&&await sk.isVisible())await sk.click();await page.waitForTimeout(800);}
await openPlan();p2.pc=await plan();await page.click('#legend .legTog');await page.waitForTimeout(250);p2.pcOpen=await plan();if(SHOTS)await page.screenshot({path:SHOTS+'/plan_0111_1366.png'});
console.log('p2) PC :',J({fab:p2.pc.fab,leg:p2.pcOpen.leg}));
C.p2=fabOk(p2.w390)&&fabOk(p2.open390)&&p2.sheet&&fabOk(p2.refold)&&fabOk(p2.w360)&&fabOk(p2.open360)&&fabOk(p2.pc)&&fabOk(p2.pcOpen);
C.p7=!logs.length;if(logs.length)console.log('console :',logs);
console.log('RÉSULTATS',J(C));console.log('RESULTAT:',Object.values(C).every(Boolean)?'TOUT VERT':'ÉCHEC '+Object.keys(C).filter(k=>!C[k]).join(' '));await browser.close();process.exit(Object.values(C).every(Boolean)?0:1);
