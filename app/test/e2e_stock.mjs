// Onglet Stock : livraison catalogue → zone posée sur le plan → stock par zone + général + vue matière ;
// lecture d'un VRAI BL AXIOM (PDF) ; prélèvement à la soudure (zone pré-choisie, décompte) ; scission vers une nouvelle zone ;
// livraison « prévue » → déchargement (photo + pointage, écart noté) ; exports présents.
import { chromium } from 'playwright';
import { writeFileSync } from 'fs';
const BASE=process.env.BASE||'http://localhost:8765';
const browser=await chromium.launch({headless:true, executablePath: process.env.CHROMIUM_PATH||undefined});
const ctx=await browser.newContext({viewport:{width:900,height:940}});const page=await ctx.newPage();
const logs=[];page.on('pageerror',e=>logs.push('PAGEERROR: '+e.message.slice(0,300)));page.on('console',m=>{if(m.type()==='error'&&!/supabase|Failed to fetch|net::ERR|404/i.test(m.text()))logs.push(m.text().slice(0,200));});
// petit PNG pour les photos
const PNG=Buffer.from('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg==','base64');
writeFileSync('/tmp/ph.png',PNG);
// réseau traceur
await page.goto(BASE+'/traceur.html');await page.waitForTimeout(600);
await page.evaluate(()=>{localStorage.clear();});await page.reload();await page.waitForTimeout(600);
await page.evaluate(()=>{const S=window.MAQ.state;S.supplier='AXIOM';S.lines=[{id:'L1',name:'Feeder',dn:100,bar:12,pts:[[10,50],[110,50]],specials:[],parent:null}];S.seq=2;window.MAQ.setMode('select');window.MAQ.rebuild();});
await page.click('#bSave');await page.waitForTimeout(200);await page.fill('#svName','Stock test');await page.click('#svOk');await page.waitForTimeout(800);
await page.click('#svGo');await page.waitForTimeout(1600);
await page.evaluate(()=>history.replaceState(null,'',location.href+(location.search?'&':'?')+'pdfjs=/pdfjs/')); // moteur PDF servi localement (CDN bloqué dans le conteneur), sans recharger
await page.selectOption('#roleSel','ethan');await page.waitForTimeout(300);
// 1) onglet Stock : vide + bouton nouvelle livraison
await page.click('#tabbar [data-tab=stock]');await page.waitForTimeout(400);
let out=await page.evaluate(()=>({tab:!!document.querySelector('#view-stock.active'),btn:!!document.querySelector('#stk-new'),vide:/Aucune zone/.test(document.querySelector('#stock').textContent)}));
console.log('1) onglet Stock présent:',JSON.stringify(out));
const c1=out.tab&&out.btn&&out.vide;
// 2) nouvelle livraison par CATALOGUE : 12 barres DN100 + 4 coudes 90 DN100, déchargé direct → pose de la zone au tap
await page.click('#stk-new');await page.waitForTimeout(300);
await page.evaluate(()=>{document.querySelector('#stk-kind').value='pipe';document.querySelector('#stk-qty').value='12';});
await page.click('#stk-add');await page.waitForTimeout(150);
await page.evaluate(()=>{const k=document.querySelector('#stk-kind');k.value='bend';k.dispatchEvent(new Event('change'));document.querySelector('#stk-qty').value='4';});
await page.click('#stk-add');await page.waitForTimeout(150);
await page.evaluate(()=>{document.querySelector('#stk-prev').checked=false;});
await page.click('#stk-ok');await page.waitForTimeout(400);
out=await page.evaluate(()=>({pose:!!window.TRACE.state.stockPose,bar:document.querySelector('#stockBar').style.display!=='none',tab:window.TRACE.state.tab}));
console.log('2) mode pose actif sur le plan:',JSON.stringify(out));
const c2=out.pose&&out.bar&&out.tab==='plan';
// tap sur le plan → zone posée
await page.mouse.click(300,400);await page.waitForTimeout(400);
out=await page.evaluate(()=>{const s=window.TRACE.net.stock;return {zones:s.zones.length,status:s.zones[0]&&s.zones[0].status,lots:s.lots.length,rect:!!document.querySelector('#stockG [data-stkz]'),label:document.querySelector('#stockG').textContent}; });
console.log('3) zone posée (verte, 16 pcs):',JSON.stringify(out));
const c3=out.zones===1&&out.status==='ok'&&out.lots===2&&out.rect&&/16 pcs/.test(out.label);
await page.click('#stkDone');await page.waitForTimeout(400);
// 4) onglet Stock : carte zone + stock général + vue matière (paths verts = posable)
out=await page.evaluate(()=>{const el=document.querySelector('#stock');
  const bal=[...el.querySelectorAll('table tr')].find(r=>/Barre 12 m DN100/.test(r.textContent)&&r.children.length===7);
  return {tab:window.TRACE.state.tab,zone:/Camion 1/.test(el.textContent)&&/en stock/.test(el.textContent),barres:/Barre 12 m DN100/.test(el.textContent),general:/Stock général chantier/.test(el.textContent),
   recap:/Besoin \/ livré \/ reste à poser/.test(el.textContent),cols:bal?[...bal.children].map(c=>c.textContent.trim()):null,manque:/Il manque/.test(el.textContent),csv:!!el.querySelector('#stk-csvbal')};});
console.log('4) cartes + récap besoin/livré/reste:',JSON.stringify(out));
const c4=out.tab==='stock'&&out.zone&&out.barres&&out.general&&out.recap&&out.cols&&out.csv&&out.manque; // le réseau de test demande bien plus que 12 barres
// 5) prélèvement : ÉTAPE 1 du manchon (modèle unique) → chips stock (Zone 1 pré-choisie) → valider → take + décompte
await page.evaluate(({PNG})=>{const T=window.TRACE;const L=Object.values(T.lines).find(l=>!l.parent);const j=L.cond.A.joints[1];j.steps={1:{photos:[PNG]}};T.openJoint(L.id,'A',1);},{PNG:'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg=='});
await page.waitForTimeout(500);
out=await page.evaluate(()=>({chips:document.querySelectorAll('#sheet [data-stkpick]').length,pre:!!document.querySelector('#sheet [data-stkpick][data-on="1"]'),lab:/Barre DN100/.test(document.querySelector('#sheet').textContent)}));
console.log('5a) chips stock dans l\'étape 1 (soudure):',JSON.stringify(out));
const c5a=out.chips>=2&&out.pre&&out.lab;
await page.evaluate(()=>document.querySelector('#sheet [data-stepok="1"]').click());await page.waitForTimeout(700);
out=await page.evaluate(()=>{const s=window.TRACE.net.stock;const t=s.takes[0];return {takes:s.takes.length,zone:t&&t.zone,key:t&&t.key};});
console.log('5b) prélèvement enregistré:',JSON.stringify(out));
const c5b=out.takes===1&&out.zone==='Z1'&&out.key==='pipe:100';
await page.evaluate(()=>window.TRACE.closeSheet());await page.waitForTimeout(250);
await page.click('#tabbar [data-tab=stock]');await page.waitForTimeout(400);
out=await page.evaluate(()=>{const tr=[...document.querySelectorAll('#stock table tr')].find(r=>/Barre 12 m DN100/.test(r.textContent));const td=tr?[...tr.children].map(c=>c.textContent.trim().split('\n')[0]):[];return {td:td.slice(0,4)};});
console.log('5c) reste 12→11 affiché:',JSON.stringify(out));
const c5c=out.td[1]==='12'&&out.td[2]==='1'&&/^11/.test(out.td[3]);
// 6) scission : manchons… ici transférons 2 coudes vers une NOUVELLE zone (base vie) → pose au tap → 2 zones
await page.evaluate(()=>{[...document.querySelectorAll('#stock details')].forEach(d=>d.open=true);}); // blocs repliés par défaut
await page.click('[data-stksplit="Z1"]');await page.waitForTimeout(300);
await page.evaluate(()=>{document.querySelectorAll('#modal [data-stksel]').forEach(cb=>cb.checked=false);const cbs=[...document.querySelectorAll('#modal [data-stksel]')];const i=cbs.findIndex(cb=>/Coude/.test(cb.closest('tr').textContent));cbs[i].checked=true;document.querySelector('#modal [data-stksq="'+cbs[i].dataset.stksel+'"]').value='2';document.querySelector('#stk-dest').value='__new';document.querySelector('#stk-dest').dispatchEvent(new Event('change'));document.querySelector('#stk-destname').value='Base vie';});
await page.click('#stk-splitok');await page.waitForTimeout(300);
await page.mouse.click(520,300);await page.waitForTimeout(400);
out=await page.evaluate(()=>{const s=window.TRACE.net.stock;const z2=s.zones.find(z=>z.name==='Base vie');const agg=z2&&s.lots.filter(l=>l.zone===z2.id).reduce((t,l)=>t+l.qty,0);return {zones:s.zones.length,bv:!!z2,q:agg,moves:s.moves.length};});
console.log('6) scission → Base vie (2 coudes):',JSON.stringify(out));
const c6=out.zones===2&&out.bv&&out.q===2&&out.moves===1;
await page.click('#stkDone');await page.waitForTimeout(300);
// 7) livraison PRÉVUE par BL (vrai PDF AXIOM) → lignes reconnues → zone hachurée
await page.click('#stk-new');await page.waitForTimeout(300);
await page.click('#modal [data-stksrc="bl"]');await page.waitForTimeout(200);
await page.setInputFiles('#stk-pdf', new URL('./bl/axiom.pdf',import.meta.url).pathname);await page.waitForTimeout(2500);
out=await page.evaluate(()=>({info:(document.querySelector('#stk-srcbox .hint')||{}).innerHTML||'',lignes:document.querySelectorAll('#stk-lines tr').length-1,barre200:/Barre 12 m DN200/.test(document.querySelector('#modal').textContent)}));
console.log('7a) BL AXIOM lu:',JSON.stringify({info:out.info.slice(0,70),lignes:out.lignes,barre200:out.barre200}));
const c7a=out.lignes===11&&out.barre200&&/AXIOM/.test(out.info);
await page.click('#stk-ok');await page.waitForTimeout(300);
await page.mouse.click(650,500);await page.waitForTimeout(400);
out=await page.evaluate(()=>{const s=window.TRACE.net.stock;const z=s.zones[s.zones.length-1];const liv=s.livs[s.livs.length-1];return {liv:liv.status,pend:s.lots.filter(l=>l.liv===liv.id&&l.pend).length,dash:!!document.querySelector('#stockG rect[stroke-dasharray]')};});
console.log('7b) camion attendu (lots pend, zone hachurée):',JSON.stringify(out));
const c7b=out.liv==='prevu'&&out.pend===11&&out.dash;
await page.click('#stkDone');await page.waitForTimeout(400);
// 7c) PRÉ-répartition avant l'arrivée : 5 barres DN200 vers une nouvelle zone « Dépôt manchons » — le camion reste à pointer
await page.evaluate(()=>{[...document.querySelectorAll('#stock details')].forEach(d=>d.open=true);});
await page.click('[data-stkpresplit]');await page.waitForTimeout(300);
await page.evaluate(()=>{const cbs=[...document.querySelectorAll('#modal [data-stksel]')];const i=cbs.findIndex(cb=>/DN200/.test(cb.closest('tr').textContent)&&/Barre/.test(cb.closest('tr').textContent));cbs[i].checked=true;document.querySelector('#modal [data-stksq="'+cbs[i].dataset.stksel+'"]').value='5';const d=document.querySelector('#stk-dest');d.value='__new';d.dispatchEvent(new Event('change'));document.querySelector('#stk-destname').value='Dépôt manchons';});
await page.click('#stk-preok');await page.waitForTimeout(300);
await page.mouse.click(300,650);await page.waitForTimeout(400);
out=await page.evaluate(()=>{const s=window.TRACE.net.stock;const liv=s.livs[s.livs.length-1];const zs=new Set(s.lots.filter(l=>l.liv===liv.id).map(l=>l.zone));
  return {zones:zs.size,liv:liv.status,pendTot:s.lots.filter(l=>l.liv===liv.id&&l.pend).reduce((t,l)=>t+l.qty,0),poseLeft:!!window.TRACE.state.stockPose};});
console.log('7c) pré-réparti sur 2 zones, camion TOUJOURS à pointer:',JSON.stringify(out));
const c7c=out.zones===2&&out.liv==='prevu'&&out.pendTot===146; // 146 pcs prévues au BL — réparties sur 2 zones, rien validé
await page.click('#stkDone');await page.waitForTimeout(300);
// 7d) camion arrivé : POINTAGE PAR LIVRAISON (les 2 zones d'un coup), 1 écart → tout passe en stock
await page.click('[data-stkunload]');await page.waitForTimeout(300);
await page.setInputFiles('#stk-ph','/tmp/ph.png');await page.waitForTimeout(600);
await page.evaluate(()=>{const inp=[...document.querySelectorAll('#modal [data-stkr]')].find(i=>/DN200/.test(i.closest('tr').textContent)&&/Barre/.test(i.closest('tr').textContent));inp.value=String(+inp.value-1);});
await page.click('#stk-unok');await page.waitForTimeout(500);
out=await page.evaluate(()=>{const s=window.TRACE.net.stock;const liv=s.livs[s.livs.length-1];const el=document.querySelector('#stock');
  return {liv:liv.status,ecarts:(liv.ecarts||[]).length,pend:s.lots.filter(l=>l.liv===liv.id&&l.pend).length,registre:/Livraisons \/ BL/.test(el.textContent),cr:!!el.querySelector('[data-stkcr]')};});
console.log('7d) pointé (2 zones validées, 1 écart, registre + CR):',JSON.stringify(out));
const c7d=out.liv==='ok'&&out.ecarts===1&&out.pend===0&&out.registre&&out.cr;
// 8) autres BL réels lus dans le navigateur : LOGSTOR et Renalia
async function tryBL(file){await page.click('#stk-new');await page.waitForTimeout(250);await page.click('#modal [data-stksrc="bl"]');await page.waitForTimeout(200);
  await page.setInputFiles('#stk-pdf', new URL('./bl/'+file,import.meta.url).pathname);await page.waitForTimeout(2500);
  const r=await page.evaluate(()=>({n:document.querySelectorAll('#stk-lines tr').length-1,info:(document.querySelector('#stk-srcbox .hint')||{}).textContent.slice(0,60)}));
  await page.evaluate(()=>document.querySelector('#modal [data-close]').click());await page.waitForTimeout(200);return r;}
const rl=await tryBL('logstor.pdf');const rr=await tryBL('renalia1.pdf');
console.log('8) BL LOGSTOR / Renalia dans le navigateur:',JSON.stringify({logstor:rl,renalia:rr}));
const c8=rl.n>=5&&rr.n===4;
// 9) fiche zone au TAP sur le plan : reste + provenance camion (vue posée sur la zone, sélection vierge)
await page.click('#tabbar [data-tab=plan]');await page.waitForTimeout(300);
await page.evaluate(()=>{const T=window.TRACE;const z=T.net.stock.zones.find(z2=>z2.id==='Z1');const v=T.state.view;v.k=8;v.tx=450-z.x*8;v.ty=470-z.y*8;T.state.stockSel=null;T.renderPlan();});
await page.waitForTimeout(300);
const zpos=await page.evaluate(()=>{const r=document.querySelector('#stockG [data-stkz="Z1"]').getBoundingClientRect();return {x:r.x+r.width/2,y:r.y+r.height/2};});
await page.evaluate(()=>{const r=document.querySelector('#stockG [data-stkz="Z1"]');const b=r.getBoundingClientRect();const o={bubbles:true,cancelable:true,pointerId:71,clientX:b.x+b.width/2,clientY:b.y+b.height/2,isPrimary:true};r.dispatchEvent(new PointerEvent('pointerdown',o));r.dispatchEvent(new PointerEvent('pointerup',o));});
await page.waitForTimeout(400);
out=await page.evaluate(()=>{const m=document.querySelector('#modal');return {show:m.classList.contains('show'),reste:/reste/.test(m.textContent)||/livré/.test(m.textContent),prov:/Provenance/.test(m.textContent),sel:window.TRACE.state.stockSel,tab:window.TRACE.state.tab,nz:document.querySelectorAll('#stockG [data-stkz]').length};});
console.log('9) tap zone → fiche (reste + provenance):',JSON.stringify(out));
const c9=out.show&&out.reste&&out.prov;
await page.evaluate(()=>document.querySelector('#modal [data-close]').click());await page.waitForTimeout(200);
// 10) prélèvement : « hors stock » alors qu'une zone l'a → confirmation demandée ; refus → le save est bloqué
await page.evaluate(({PNG})=>{const T=window.TRACE;const L=Object.values(T.lines).find(l=>!l.parent);const j=L.cond.A.joints[3];j.steps={1:{photos:[PNG]}};T.openJoint(L.id,'A',3);},{PNG:'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg=='});await page.waitForTimeout(500);
await page.evaluate(()=>{const none=[...document.querySelectorAll('#sheet [data-stkpick]')].find(x=>x.dataset.stkpick==='none');none.click();});
let dlgSeen=false;page.once('dialog',d=>{dlgSeen=true;d.dismiss();});
await page.evaluate(()=>document.querySelector('#sheet [data-stepok="1"]').click());await page.waitForTimeout(600);
out=await page.evaluate(({L2})=>{const j=window.TRACE.lines[L2].cond.A.joints[3];return {err:!(j.steps[1]&&j.steps[1].done),takes:window.TRACE.net.stock.takes.length};},{L2:Object.keys(await page.evaluate(()=>({[Object.values(window.TRACE.lines).find(l=>!l.parent).id]:1})))[0]});
console.log('10) hors stock refusé → étape bloquée:',JSON.stringify({dlgSeen,...out}));
const c10=dlgSeen&&out.err&&out.takes===1; // toujours le seul take du début

// 11) récap : le solde suit le stock (besoin vs stock vs attendu) et se filtre par tronçon
await page.evaluate(()=>window.TRACE.closeSheet());await page.waitForTimeout(300);
await page.click('#tabbar [data-tab=stock]');await page.waitForTimeout(400);
out=await page.evaluate(()=>{const el=document.querySelector('#stock');
  const row=[...el.querySelectorAll('table tr')].find(r=>/Mousse PU \(A\+B\)/.test(r.textContent)&&r.children.length===7);
  const sel=!!el.querySelector('#stk-matline');
  return {mousse:row?[...row.children].map(c=>c.textContent.trim()):null,sel,unePU:(el.textContent.match(/Mousse PU \(A\+B\)/g)||[]).length};});
console.log('11) récap : mousse regroupée A+B, besoin = nb de manchons:',JSON.stringify(out));
const c11=out.sel&&out.mousse&&+out.mousse[1]>0&&out.mousse[0]==='Mousse PU (A+B) DN100'; // v5 : la mousse est PAR DN
// 12) mousse choisie AU MOUSSAGE (étape 4 du manchon), pas au manchon — on met de la mousse en stock dans Z1
await page.evaluate(()=>{const s=window.TRACE.net.stock;s.lots.push({id:'PU1',liv:null,zone:'Z1',key:'pu',label:'Mousse PU (A+B)',kind:'pu',qty:24});
  const L=Object.values(window.TRACE.lines).find(l=>!l.parent);const j=L.cond.A.joints[1];const now=new Date().toISOString();
  j.steps=j.steps||{};j.steps[2]={done:true,by:'t',at:now,photos:[]};j.steps[3]={done:true,by:'t',at:now,photos:[],type:'retracte',press:true};}); // étapes 1-3 faites : l'étape 4 (moussage) est la suivante
await page.evaluate(()=>{const T=window.TRACE;const L=Object.values(T.lines).find(l=>!l.parent);T.openJoint(L.id,'A',1);});await page.waitForTimeout(400);
out=await page.evaluate(()=>{const sh=document.querySelector('#sheet');const st4=[...sh.querySelectorAll('.dstep')][3];
  return {titre:/Moussage/.test(st4.textContent),pick:!!st4.querySelector('[data-stkneed="pu"]'),pasAuManchon:![...sh.querySelectorAll('.dstep')][2]||!sh.querySelectorAll('.dstep')[2].querySelector('[data-stkneed="pu"]')};});
console.log('12) étape 4 = moussage avec choix du stock mousse:',JSON.stringify(out));
const c12=out.titre&&out.pick;
// valider l'étape 4 → 1 dose de mousse décomptée
const puBefore=await page.evaluate(()=>window.TRACE.net.stock.takes.filter(t=>/^pu(:|$)/.test(t.key)).length);
await page.evaluate(()=>{const st4=[...document.querySelectorAll('#sheet .dstep')][3];st4.open=true;});await page.waitForTimeout(200);
await page.evaluate(()=>document.querySelector('#sheet [data-stepok="4"]').click());await page.waitForTimeout(600);
out=await page.evaluate(()=>({pu:window.TRACE.net.stock.takes.filter(t=>/^pu(:|$)/.test(t.key)).length,zone:(window.TRACE.net.stock.takes.filter(t=>/^pu(:|$)/.test(t.key)).pop()||{}).zone}));
console.log('12b) moussage validé → 1 mousse décomptée:',JSON.stringify(out));
const c12b=out.pu===puBefore+1&&!!out.zone;
// 13) suppression d'une livraison (le « Camion 1 » qu'on n'arrivait pas à supprimer)
await page.evaluate(()=>window.TRACE.closeSheet());await page.waitForTimeout(300);
await page.click('#tabbar [data-tab=stock]');await page.waitForTimeout(400);
await page.evaluate(()=>{[...document.querySelectorAll('#stock details')].forEach(d=>d.open=true);});
const nLiv=await page.evaluate(()=>window.TRACE.net.stock.livs.length);
page.once('dialog',d=>d.accept());
await page.click('#stock [data-stkdelliv]');await page.waitForTimeout(500);
out=await page.evaluate(()=>{const s=window.TRACE.net.stock;return {livs:s.livs.length,orphan:s.takes.some(t=>t.liv&&!s.livs.find(v=>v.id===t.liv))};});
console.log('13) livraison supprimée:',JSON.stringify({avant:nLiv,...out}));
const c13=out.livs===nLiv-1&&!out.orphan;

// 14) carte d'ensemble des stockages : zones dessinées, tap → fiche zone
out=await page.evaluate(()=>{const m=document.querySelector('#stkMap');return {map:!!m,zones:m?m.querySelectorAll('[data-stkmz]').length:0,open:!!document.querySelector('details[data-stkui="map"][open]')};});
console.log('14) carte d\'ensemble (zones dessinées):',JSON.stringify(out));
const c14=out.map&&out.zones>=2&&out.open;
await page.evaluate(()=>{const r=document.querySelector('#stkMap [data-stkmz="Z1"] rect');const b=r.getBoundingClientRect();const o={bubbles:true,pointerId:81,clientX:b.x+b.width/2,clientY:b.y+b.height/2,isPrimary:true};const g=r.closest('[data-stkmz]');g.dispatchEvent(new PointerEvent('pointerdown',o));g.dispatchEvent(new PointerEvent('pointerup',o));});
await page.waitForTimeout(400);
out=await page.evaluate(()=>({show:document.querySelector('#modal').classList.contains('show'),fiche:/livré|Rien ici/.test(document.querySelector('#modal').textContent)}));
console.log('14b) tap zone sur la carte → fiche:',JSON.stringify(out));
const c14b=out.show&&out.fiche;
await page.evaluate(()=>document.querySelector('#modal [data-close]').click());await page.waitForTimeout(200);
// 15) fiche DÉTAILLÉE d'une livraison : contenu + restant zone par zone
await page.evaluate(()=>document.querySelector('#stock td[data-stklivd]').click());await page.waitForTimeout(400);
out=await page.evaluate(()=>{const m=document.querySelector('#modal');return {show:m.classList.contains('show'),contenu:/Contenu du camion/.test(m.textContent),parZone:/zone par zone|Plus rien en stock/.test(m.textContent)};});
console.log('15) fiche livraison détaillée:',JSON.stringify(out));
const c15=out.show&&out.contenu&&out.parZone;
await page.evaluate(()=>document.querySelector('#modal [data-close]').click());await page.waitForTimeout(200);
// 16) déplacer une zone sur le PLAN de façon significative → tracé dans les mouvements
await page.evaluate(()=>{window.TRACE.closeSheet();const bd=document.querySelector('#backdrop');if(bd)bd.classList.remove('show');});
await page.click('#tabbar [data-tab=plan]');await page.waitForTimeout(400);
const nMov=await page.evaluate(()=>window.TRACE.net.stock.moves.length);
await page.evaluate(()=>{const T=window.TRACE;T.state.stockSel=null;const z=T.net.stock.zones.find(z2=>z2.id==='Z1');T.state.view.k=5;T.centerOn(z.x,z.y,6);}); // centerOn gère l'offset réel du canvas ; 120 px ≈ 20 m au k=6
await page.waitForTimeout(250);
const bZ=await page.evaluate(()=>{const r=document.querySelector('#stockG [data-stkz="Z1"]').getBoundingClientRect();return {x:r.x+r.width/2,y:r.y+r.height/2};});
const hit=await page.evaluate(({x,y})=>{const el=document.elementFromPoint(x,y);return el?(el.tagName+'#'+(el.id||'')+'.'+(el.className.baseVal||el.className||'').toString().slice(0,40)+' stkz='+(el.getAttribute&&el.getAttribute('data-stkz')||'')):'null';},bZ);
console.log('16-hit: point',JSON.stringify(bZ),'→',hit);
await page.mouse.move(bZ.x,bZ.y);await page.mouse.down();
for(let i=1;i<=12;i++)await page.mouse.move(bZ.x+i*10,bZ.y);
await page.mouse.up();
await page.waitForTimeout(400);
out=await page.evaluate(()=>{const mv=window.TRACE.net.stock.moves;const last=mv[mv.length-1]||{};const z=window.TRACE.net.stock.zones.find(z2=>z2.id==='Z1');return {n:mv.length,zoneMove:!!last.zoneMove,dist:last.dist,zx:z.x,sel:window.TRACE.state.stockSel,modal:document.querySelector('#modal').classList.contains('show')};});
console.log('16) déplacement de zone tracé:',JSON.stringify({avant:nMov,...out}));
const c16=out.n===nMov+1&&out.zoneMove&&out.dist>5;
const ALL=c1&&c2&&c3&&c4&&c5a&&c5b&&c5c&&c6&&c7a&&c7b&&c7c&&c7d&&c8&&c9&&c10&&c11&&c12&&c12b&&c13&&c14&&c14b&&c15&&c16;
console.log('RESULTAT:',ALL?'TOUT VERT':'ECHEC '+JSON.stringify({c1,c2,c3,c4,c5a,c5b,c5c,c6,c7a,c7b,c7c,c7d,c8,c9,c10,c11,c12,c12b,c13,c14,c14b,c15,c16}));
console.log(logs.length?logs:'[]');
await browser.close();process.exit(ALL?0:1);
