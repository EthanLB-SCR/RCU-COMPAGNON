// Paquet du 25/08 soir (codé d'avance, DÉSACTIVÉ par défaut) : flags OFF = rien ne change ; flags ON = TS/hors marché,
// dossier administratif, QSE avec émargement au doigt, tabbar allégée, export DOE. Activation : panneau « Nouveautés » (home).
import { chromium } from 'playwright';
const BASE=process.env.BASE||'http://localhost:8765';
const browser=await chromium.launch({headless:true, executablePath: process.env.CHROMIUM_PATH||undefined});
const ctx=await browser.newContext({viewport:{width:900,height:940}});const page=await ctx.newPage();
const logs=[];page.on('pageerror',e=>logs.push('PAGEERROR: '+e.message.slice(0,300)));page.on('console',m=>{if(m.type()==='error'&&!/supabase|Failed to fetch|net::ERR|404/i.test(m.text()))logs.push(m.text().slice(0,200));});
const PNG='data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg==';
await page.goto(BASE+'/traceur.html');await page.waitForTimeout(600);
await page.evaluate(()=>{localStorage.clear();});await page.reload();await page.waitForTimeout(600);
// ── 0) FLAGS OFF : l'appli ne change pas (pas d'onglet Dossier/QSE, catalogue visible) — le réseau porte déjà un TS pour la suite
await page.evaluate(()=>{const S=window.MAQ.state;S.supplier='AXIOM';S.lines=[
  {id:'L1',name:'Feeder',dn:100,bar:12,pts:[[10,50],[110,50]],specials:[],parent:null,hm:{ts:'TS-01',etat:'propose'}}];S.seq=2;window.MAQ.setMode('select');window.MAQ.rebuild();});
await page.click('#bSave');await page.waitForTimeout(200);await page.fill('#svName','Next test');await page.click('#svOk');await page.waitForTimeout(800);
await page.click('#svGo');await page.waitForTimeout(1500);await page.selectOption('#roleSel','ethan');await page.waitForTimeout(300);
let out=await page.evaluate(()=>({adm:!!document.querySelector('#tabbar [data-tab="admin"]'),cat:getComputedStyle(document.querySelector('#tabbar [data-tab="catalogue"]')).display!=='none',ts:(document.getElementById('tsG')||{innerHTML:''}).innerHTML.length}));
console.log('0) flags OFF : rien ne change:',JSON.stringify(out));
const c0=!out.adm&&out.cat&&out.ts===0;
// ── activer TOUT (comme depuis le panneau Nouveautés) puis recharger
const sid=await page.evaluate(()=>{localStorage.setItem('trace:next',JSON.stringify({ts:1,admin:1,qse:1,tabs:1,doe:1}));return window.TRACE.state.siteId;});
await page.reload();await page.waitForTimeout(900);
await page.evaluate(id2=>window.TRACE.go(id2),sid);await page.waitForTimeout(1300);
await page.selectOption('#roleSel','ethan');await page.waitForTimeout(300);
// ── 1) tabbar : Dossier + QSE présents, catalogue/liste cachés, bouton ⋯
out=await page.evaluate(()=>({adm:!!document.querySelector('#tabbar [data-tab="admin"]'),qse:!!document.querySelector('#tabbar [data-tab="qse"]'),
  cat:getComputedStyle(document.querySelector('#tabbar [data-tab="catalogue"]')).display==='none',more:!!document.querySelector('#tabbar [data-tab="__more"]')}));
console.log('1) tabbar : Dossier + QSE, catalogue/liste sous ⋯:',JSON.stringify(out));
const c1=out.adm&&out.qse&&out.cat&&out.more;
// ── 2) TS : hachures + badge sur le plan, récap par TS avec bascule d'état
out=await page.evaluate(()=>({ts:document.getElementById('tsG').innerHTML.includes('TS-01'),dash:document.getElementById('tsG').innerHTML.includes('stroke-dasharray')}));
console.log('2a) plan : ligne TS hachurée + badge:',JSON.stringify(out));
const c2a=out.ts&&out.dash;
await page.click('#tabbar [data-tab=recap]');await page.waitForTimeout(500);
out=await page.evaluate(()=>{const el=document.getElementById('recap');return {bloc:/Travaux supplémentaires/.test(el.textContent),ts:/TS-01/.test(el.textContent),btns:el.querySelectorAll('[data-tsst]').length};});
console.log('2b) récap TS + boutons d\'état:',JSON.stringify(out));
const c2b=out.bloc&&out.ts&&out.btns>=4;
await page.evaluate(()=>{[...document.querySelectorAll('#recap [data-tsst]')].find(b=>b.dataset.tsst==='commande').click();});
await page.waitForTimeout(400);
out=await page.evaluate(()=>{const l=Object.values(window.TRACE.lines).find(x=>x.hm);return {etat:l&&l.hm.etat,net:(window.TRACE.net.lines.find(x=>x.hm)||{hm:{}}).hm.etat};});
console.log('2c) bascule proposé → commandé (persistée):',JSON.stringify(out));
const c2c=out.etat==='commande'&&out.net==='commande';
// ── 3) Dossier administratif : dépôt d'un PDF (hors connexion → gardé dans l'appli), listé, BL croisé au stock
await page.click('#tabbar [data-tab=admin]');await page.waitForTimeout(500);
await page.evaluate(()=>{document.getElementById('adm-cat').value='ppsps';});
await page.setInputFiles('#adm-file', new URL('./bl/axiom.pdf',import.meta.url).pathname);await page.waitForTimeout(900);
out=await page.evaluate(()=>{const ad=window.TRACE.net.admin;const el=document.getElementById('admin');
  return {n:ad.docs.length,cat:ad.docs[0]&&ad.docs[0].cat,data:!!(ad.docs[0]&&ad.docs[0].data),listed:/axiom\.pdf/.test(el.textContent)};});
console.log('3) PPSPS déposé au dossier (hors connexion : gardé dans l\'appli):',JSON.stringify(out));
const c3=out.n===1&&out.cat==='ppsps'&&out.data&&out.listed;
// ── 4) QSE : accueil chantier (voit le PPSPS du dossier), émargement au doigt, feuille imprimable
await page.click('#tabbar [data-tab=qse]');await page.waitForTimeout(500);
await page.evaluate(()=>{[...document.querySelectorAll('#qse [data-qnew]')].find(b=>b.dataset.qnew==='accueil').click();});
await page.waitForTimeout(500);
out=await page.evaluate(()=>{const t=document.querySelector('#modal').textContent;return {open:/Accueil chantier/.test(t),ppsps:/vaut AUSSI signature du PPSPS/.test(t),qs:/EPI obligatoires/.test(t)};});
console.log('4a) accueil créé — PPSPS du dossier rattaché:',JSON.stringify(out));
const c4a=out.open&&out.ppsps&&out.qs;
await page.evaluate(()=>document.getElementById('qse-sign').click());await page.waitForTimeout(400);
await page.evaluate(()=>{document.getElementById('sig-name').value='Karim B.';});
const pad=await page.evaluate(()=>{const c=document.getElementById('sig-pad');const r=c.getBoundingClientRect();return {x:r.left,y:r.top,w:r.width,h:r.height};});
await page.mouse.move(pad.x+30,pad.y+pad.h/2);await page.mouse.down();
await page.mouse.move(pad.x+pad.w/2,pad.y+30,{steps:6});await page.mouse.move(pad.x+pad.w-30,pad.y+pad.h-30,{steps:6});await page.mouse.up();
await page.evaluate(()=>document.getElementById('sig-ok').click());await page.waitForTimeout(500);
out=await page.evaluate(()=>{const d0=window.TRACE.net.qse.docs[0];return {sigs:d0.sigs.length,name:d0.sigs[0]&&d0.sigs[0].name,img:!!(d0.sigs[0]&&d0.sigs[0].img&&d0.sigs[0].img.startsWith('data:image/png'))};});
console.log('4b) Karim a émargé au doigt:',JSON.stringify(out));
const c4b=out.sigs===1&&out.name==='Karim B.'&&out.img;
const [pop1]=await Promise.all([page.waitForEvent('popup'),page.evaluate(()=>document.getElementById('qse-print').click())]);
await pop1.waitForLoadState('domcontentloaded');
out=await pop1.evaluate(()=>({t:/Émargements \(1\)/.test(document.body.textContent),img:!!document.querySelector('img[src^="data:image/png"]')}));
await pop1.close();
console.log('4c) feuille d\'émargement imprimable:',JSON.stringify(out));
const c4c=out.t&&out.img;
// ── 5) Export DOE : le carnet reprend les soudures documentées avec leurs photos
await page.evaluate(()=>{const m=document.querySelector('#modal [data-close]');if(m)m.click();});
await page.evaluate(({PNG})=>{const T=window.TRACE;const L=Object.values(T.lines).find(l=>!l.parent);const j=L.cond.A.joints[1];
  j.status='soudee';j.events=[{type:'soudee',by:'karim',at:new Date(),data:{procede:'tig'},photos:[PNG]}];T.renderAll();},{PNG});
await page.click('#tabbar [data-tab=recap]');await page.waitForTimeout(500);
const [pop2]=await Promise.all([page.waitForEvent('popup'),page.evaluate(()=>document.getElementById('doe-go').click())]);
await pop2.waitForLoadState('domcontentloaded');
out=await pop2.evaluate(()=>({t:/Carnet de soudage/.test(document.body.textContent),w:/S-\d{4}/.test(document.body.textContent),soudee:/Soudée \(TIG\)/.test(document.body.textContent),img:!!document.querySelector('img'),plan:!!document.querySelector('svg')}));
await pop2.close();
console.log('5) carnet DOE généré:',JSON.stringify(out));
const c5=out.t&&out.w&&out.soudee&&out.img&&out.plan;
// ── 6) le panneau « Nouveautés » existe sur la home (5/5 actives)
await page.evaluate(()=>{window.TRACE.showScreen&&window.TRACE.showScreen('home');window.TRACE.renderHome&&window.TRACE.renderHome();});
await page.waitForTimeout(400);
out=await page.evaluate(()=>{const b=document.getElementById('nextBtn');return {btn:!!b,txt:b?b.textContent:''};});
console.log('6) bouton Nouveautés (home):',JSON.stringify(out));
const c6=out.btn&&/5\/5/.test(out.txt);
const ALL=c0&&c1&&c2a&&c2b&&c2c&&c3&&c4a&&c4b&&c4c&&c5&&c6;
console.log('RESULTAT:',ALL?'TOUT VERT':'ECHEC '+JSON.stringify({c0,c1,c2a,c2b,c2c,c3,c4a,c4b,c4c,c5,c6}));
console.log(logs.length?logs:'[]');
await browser.close();
process.exit(ALL?0:1);
