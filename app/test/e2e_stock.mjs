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
out=await page.evaluate(()=>{const el=document.querySelector('#stock');return {tab:window.TRACE.state.tab,zone:/Camion 1/.test(el.textContent)&&/déchargée/.test(el.textContent),barres:/Barre 12 m DN100/.test(el.textContent),general:/Stock général chantier/.test(el.textContent),mat:el.querySelectorAll('svg path').length>0,vert:el.querySelector('svg g[stroke="#0ca30c"]')&&el.querySelector('svg g[stroke="#0ca30c"]').children.length>0,ml:/posable avec le stock/.test(el.textContent)};});
console.log('4) cartes + vue matière:',JSON.stringify(out));
const c4=out.tab==='stock'&&out.zone&&out.barres&&out.general&&out.mat&&out.vert&&out.ml;
// 5) prélèvement : fiche d'une soudure → chips stock (Zone 1 pré-choisie) → valider soudée → take + décompte
await page.evaluate(()=>{const T=window.TRACE;const L=Object.values(T.lines).find(l=>!l.parent);T.openJoint(L.id,'A',1);});
await page.waitForTimeout(400);
await page.click('#sheet [data-act="form-soudee"]');await page.waitForTimeout(400);
out=await page.evaluate(()=>({chips:document.querySelectorAll('#sheet [data-stkpick]').length,pre:!!document.querySelector('#sheet [data-stkpick][data-on="1"]'),lab:/Barre DN100/.test(document.querySelector('#sheet').textContent)}));
console.log('5a) chips stock dans « déclarer soudée »:',JSON.stringify(out));
const c5a=out.chips>=2&&out.pre&&out.lab;
await page.evaluate(()=>{window.TRACE.state.pendingPhotos=['data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg=='];});
await page.click('#sheet [data-act="save-soudee"]');await page.waitForTimeout(700);
out=await page.evaluate(()=>{const s=window.TRACE.net.stock;const t=s.takes[0];return {takes:s.takes.length,zone:t&&t.zone,key:t&&t.key};});
console.log('5b) prélèvement enregistré:',JSON.stringify(out));
const c5b=out.takes===1&&out.zone==='Z1'&&out.key==='pipe:100';
await page.click('#tabbar [data-tab=stock]');await page.waitForTimeout(400);
out=await page.evaluate(()=>{const tr=[...document.querySelectorAll('#stock table tr')].find(r=>/Barre 12 m DN100/.test(r.textContent));const td=tr?[...tr.children].map(c=>c.textContent.trim().split('\n')[0]):[];return {td:td.slice(0,4)};});
console.log('5c) reste 12→11 affiché:',JSON.stringify(out));
const c5c=out.td[1]==='12'&&out.td[2]==='1'&&/^11/.test(out.td[3]);
// 6) scission : manchons… ici transférons 2 coudes vers une NOUVELLE zone (base vie) → pose au tap → 2 zones
await page.click('[data-stksplit="Z1"]');await page.waitForTimeout(300);
await page.evaluate(()=>{document.querySelectorAll('#modal [data-stksel]').forEach(cb=>cb.checked=false);const cbs=[...document.querySelectorAll('#modal [data-stksel]')];const i=cbs.findIndex(cb=>/Coude/.test(cb.closest('tr').textContent));cbs[i].checked=true;document.querySelector('#modal [data-stksq="'+cbs[i].dataset.stksel+'"]').value='2';document.querySelector('#stk-dest').value='__new';document.querySelector('#stk-dest').dispatchEvent(new Event('change'));document.querySelector('#stk-destname').value='Base vie';});
await page.click('#stk-splitok');await page.waitForTimeout(300);
await page.mouse.click(520,300);await page.waitForTimeout(400);
out=await page.evaluate(()=>{const s=window.TRACE.net.stock;const z2=s.zones.find(z=>z.name==='Base vie');const agg=z2&&s.lots.filter(l=>l.zone===z2.id).reduce((t,l)=>t+l.qty,0);return {zones:s.zones.length,bv:!!z2,q:agg,moves:s.moves.length};});
console.log('6) scission → Base vie (2 coudes):',JSON.stringify(out));
const c6=out.zones===2&&out.bv&&out.q===2&&out.moves===1;
await page.click('#stkDone');await page.waitForTimeout(300);
// 7) livraison PRÉVUE par BL (vrai PDF AXIOM) → lignes reconnues → zone hachurée → déchargement avec écart
await page.click('#stk-new');await page.waitForTimeout(300);
await page.click('#modal [data-stksrc="bl"]');await page.waitForTimeout(200);
await page.setInputFiles('#stk-pdf', new URL('./bl/axiom.pdf',import.meta.url).pathname);await page.waitForTimeout(2500);
out=await page.evaluate(()=>({info:(document.querySelector('#stk-srcbox .hint')||{}).innerHTML||'',lignes:document.querySelectorAll('#stk-lines tr').length-1,barre200:/Barre 12 m DN200/.test(document.querySelector('#modal').textContent)}));
console.log('7a) BL AXIOM lu:',JSON.stringify({info:out.info.slice(0,80),lignes:out.lignes,barre200:out.barre200}));
const c7a=out.lignes===11&&out.barre200&&/AXIOM/.test(out.info);
await page.click('#stk-ok');await page.waitForTimeout(300);
await page.mouse.click(650,500);await page.waitForTimeout(400);
out=await page.evaluate(()=>{const s=window.TRACE.net.stock;const z=s.zones[s.zones.length-1];return {status:z.status,dash:!!document.querySelector('#stockG rect[stroke-dasharray]')};});
console.log('7b) zone prévue (hachurée):',JSON.stringify(out));
const c7b=out.status==='prevu'&&out.dash;
await page.click('#stkDone');await page.waitForTimeout(300);
// déchargement : photo + un écart (16→15 barres DN200)
await page.click('[data-stkunload]');await page.waitForTimeout(300);
await page.setInputFiles('#stk-ph','/tmp/ph.png');await page.waitForTimeout(600);
await page.evaluate(()=>{const inp=[...document.querySelectorAll('#modal [data-stkr]')].find(i=>/DN200/.test(i.closest('tr').textContent)&&/Barre/.test(i.closest('tr').textContent));inp.value='15';});
await page.click('#stk-unok');await page.waitForTimeout(500);
out=await page.evaluate(()=>{const s=window.TRACE.net.stock;const liv=s.livs[s.livs.length-1];const el=document.querySelector('#stock');return {status:s.zones[s.zones.length-1].status,ecarts:(liv.ecarts||[]).length,chip:/écart/.test(el.textContent),cr:!!el.querySelector('[data-stkcr]'),csv:!!el.querySelector('[data-stkcsv]')&&!!el.querySelector('#stk-csvg')};});
console.log('7c) déchargée avec 1 écart + CR/CSV:',JSON.stringify(out));
const c7c=out.status==='ok'&&out.ecarts===1&&out.chip&&out.cr&&out.csv;
const ALL=c1&&c2&&c3&&c4&&c5a&&c5b&&c5c&&c6&&c7a&&c7b&&c7c;
console.log('RESULTAT:',ALL?'TOUT VERT':'ECHEC '+JSON.stringify({c1,c2,c3,c4,c5a,c5b,c5c,c6,c7a,c7b,c7c}));
console.log(logs.length?logs:'[]');
await browser.close();process.exit(ALL?0:1);
