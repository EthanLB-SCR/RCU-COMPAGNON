// ONGLET EXPORT · DOE (Ethan 07/10 soir) : carnet de soudage et manchonnage avec report sur plan, planches numérotées à l'échelle,
// photos classées par n° de soudure, plan interactif hors ligne, zip complet (QSE, modifications, dossier administratif, CSV/JSON).
import { chromium } from 'playwright';
import { unzipSync, strFromU8 } from 'fflate';
import fs from 'node:fs';
const BASE=process.env.BASE||'http://localhost:8765';
const browser=await chromium.launch({headless:true, executablePath: process.env.CHROMIUM_PATH||undefined});
const ctx=await browser.newContext({viewport:{width:1000,height:940},acceptDownloads:true});const page=await ctx.newPage();
const logs=[];page.on('pageerror',e=>logs.push('PAGEERROR: '+e.message.slice(0,300)));page.on('console',m=>{if(m.type()==='error'&&!/supabase|Failed to fetch|net::ERR|404/i.test(m.text()))logs.push(m.text().slice(0,200));});
page.on('dialog',d=>d.accept().catch(()=>{}));
const C={};
await page.goto(BASE+'/traceur.html');await page.waitForTimeout(500);
await page.evaluate(()=>{localStorage.clear();});await page.reload();await page.waitForTimeout(500);
await page.evaluate(()=>{const S=window.MAQ.state;S.supplier='RENALIA';S.lines=[
  {id:'L1',name:'Rue de la Gare',dn:150,bar:12,pts:[[10,50],[130,50]],specials:[{id:'v1',type:'valve',m:40}],parent:null},
  {id:'L2',name:'Impasse des Lilas',dn:80,bar:12,pts:[[70,50],[70,100]],specials:[],parent:{line:'L1',m:60,side:1}}];S.seq=3;window.MAQ.setMode('select');window.MAQ.rebuild();});
await page.click('#bSave');await page.waitForTimeout(200);await page.fill('#svName','DOE test');await page.click('#svOk');await page.waitForTimeout(700);
await page.click('#svGo');await page.waitForTimeout(1500);await page.selectOption('#roleSel','ethan');await page.waitForTimeout(300);
const PNG='data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNkYPhfDwAChwGA60e6kgAAAABJRU5ErkJggg==';
const PDF='data:application/pdf;base64,JVBERi0xLjQKJcOkw7zDtsOfCjEgMCBvYmoKPDwvVHlwZS9DYXRhbG9nPj4KZW5kb2JqCnRyYWlsZXIKPDwvUm9vdCAxIDAgUj4+CiUlRU9G';
// ── données : 3 soudures documentées (étapes avec photos), 1 extrusion, 1 modification, 1 accueil QSE émargé, 1 pièce au dossier administratif
await page.evaluate(({PNG,PDF})=>{let pi=0;const ph=()=>PNG.slice(0,60)+'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdef'[(pi++)%32]+PNG.slice(61); /* 12 photos distinctes (même contenu = dédoublonné, c'est voulu) */ const T=window.TRACE;const L=Object.values(T.lines).find(l=>l.name==='Rue de la Gare');const L2=Object.values(T.lines).find(l=>l.name==='Impasse des Lilas');
  const d=(h)=>new Date(Date.now()-h*3600e3).toISOString();
  const full=(j,who,extru)=>{const p1=ph(),p2=ph(),p3=ph();j.steps={1:{done:true,by:who,at:d(30),photos:[p1],proc:'tig'},2:{done:true,by:who,at:d(28),photos:[p2],dh:{meas:12.4,expected:12.1,iso:500,closure:'boucle amont entière'}},3:{done:true,by:'Julien R.',at:d(5),photos:[p3],type:extru?'extrude':'retracte',cause:extru?'angle':undefined,press:true}};j.status='manchonnee';j.wire='raccorde';
    j.events=[{type:'soudee',by:'karim',at:d(30),data:{procede:'tig'},photos:[p1]},{type:'manchonnee',by:'julien',at:d(5),data:{manchon:extru?'extrude':'retracte',etanch:true},photos:[p3]}];if(extru)j.extru={cause:'angle',by:'Julien R.',at:d(5)};};
  full(L.cond.A.joints[1],'Karim B.',false);full(L.cond.R.joints[1],'Karim B.',false);full(L.cond.A.joints[3],'Sofiane K.',true);
  const j4=L2.cond.A.joints[0];j4.steps={1:{done:true,by:'Karim B.',at:d(3),photos:[ph(),ph(),ph()],proc:'cellulosique'}};j4.status='soudee';j4.note='reprise de meulage';
  T.ts.markWeld(L,'A',L.cond.A.joints[3],{etat:'propose',ts:'DEV-07',label:'extrusion angle'});const it=T.ts.of().items[T.ts.of().items.length-1];if(it)it.desig='Manchon extrudé coude 45°';
  const NET=T.net;NET.qse={docs:[{id:'q1',type:'accueil',title:'Accueil chantier du 01/10/2026',by:'Ethan L.',at:d(100),qs:['Les accès ont été présentés.'],sigs:[{name:'Karim B.',uid:'l:karim',at:d(99),img:PNG},{name:'Julien R.',uid:'l:julien',at:d(99),img:PNG}]}]};
  NET.admin={docs:[{id:'D1',cat:'dt',name:'Récépissé DICT Enedis.pdf',size:120,data:PDF,by:'Sophie M.',at:d(200)},{id:'D2',cat:'qualif',name:'QS Karim 141.pdf',size:120,data:PDF,by:'Sophie M.',at:d(200)}]};
  T.renderAll();},{PNG,PDF});
await page.waitForTimeout(300);
// ── 0) onglet Export : présent, après QSE, avant « ⋯ » ; cartes et cases
let out=await page.evaluate(()=>{const tabs=[...document.querySelectorAll('#tabbar button')].filter(b=>b.style.display!=='none').map(b=>b.dataset.tab);document.querySelector('#tabbar [data-tab=export]').click();const v=document.querySelector('#exportview');
  return {tabs,visible:document.querySelector('#view-export').classList.contains('active'),title:/Export — DOE test/.test(v.textContent),parts:v.querySelectorAll('[data-part]').length,checked:v.querySelectorAll('[data-part]:checked').length,zipBtn:!!v.querySelector('#doeZip'),carte:!!v.querySelector('#doeCarnet')&&!!v.querySelector('#doePlan')&&!!v.querySelector('#doeViewer')&&!!v.querySelector('#doeTs')&&!!v.querySelector('#doeCsv'),people:/Karim B\./.test(v.textContent)&&/Julien R\./.test(v.textContent),counts:/4 soudures documentées/.test(v.textContent)&&/1 manchon extrudé/.test(v.textContent)&&/1 modification/.test(v.textContent)&&/2 pièces au dossier/.test(v.textContent)};});
console.log('0) onglet Export :',JSON.stringify(out));
C.c0=out.tabs.indexOf('qse')<out.tabs.indexOf('export')&&out.tabs[out.tabs.length-1]==='__more'&&out.tabs.includes('export')&&!out.tabs.includes('recap')&&out.visible&&out.title&&out.parts===8&&out.checked===8&&out.zipBtn&&out.carte&&out.people&&out.counts;
// ── 1) données normalisées
out=await page.evaluate(()=>{const D=window.TRACE.doe.data();const w=D.welds.find(x=>x.extru);const all=window.TRACE.ts&&Object.values(window.TRACE.lines).reduce((n,l)=>n+['A','R'].reduce((m,c)=>m+(l.cond[c]?l.cond[c].joints.length:0),0),0);
  return {n:D.welds.length,all,nDoc:D.nDoc,nPhotos:D.nPhotos,nExtru:D.nExtru,people:D.people.map(p=>p.name+':'+p.n[1]+'/'+p.n[3]),ts:D.ts.length,tsDevis:D.ts[0]&&D.ts[0].devis,qse:D.qse.length,admin:D.admin.length,adminCat:D.admin[0]&&D.admin[0].catLabel,extruCause:w&&w.extru.cause,steps:w&&Object.keys(w.steps).join(''),dh:w&&w.steps[2].dh.meas,files:w&&w.photos.map(p=>p.file),pos:w&&w.pos,lines:D.lines.map(l=>l.name+':'+l.nDoc+'/'+l.nW)};});
console.log('1) données :',JSON.stringify(out));
C.c1=out.n===out.all&&out.nDoc===4&&out.nPhotos===12&&out.nExtru===1&&out.people.includes('Karim B.:3/0')&&out.people.includes('Julien R.:0/3')&&out.people.includes('Sofiane K.:1/0')&&out.ts===1&&out.tsDevis==='DEV-07'&&out.qse===1&&out.admin===2&&out.adminCat==='DT / DICT'&&out.extruCause==='angle trop important'&&out.steps==='123'&&out.dh===12.4&&out.files.length===3&&/^S-\d{4}_1-soudure_\d{4}-\d{2}-\d{2}_1\.jpg$/.test(out.files[0])&&Array.isArray(out.pos)&&isFinite(out.pos[0]);
// ── 2) plan des soudures numérotées : A3 1/200 (planches), auto (une planche), A4 1/100 (découpage)
out=await page.evaluate(()=>{const D=window.TRACE.doe.data();const a3=window.TRACE.doe.plan(D,{scale:200,format:'A3',all:true});const auto=window.TRACE.doe.plan(D,{scale:200,format:'auto',all:true});const a4=window.TRACE.doe.plan(D,{scale:100,format:'A4',all:true});
  const ids=D.welds.map(w=>w.id);const inA3=ids.filter(id=>a3.html.includes('>'+id+'</text>')).length;const planchesOk=ids.every(id=>a3.planches[id]);
  return {a3Pages:a3.nPages,a3Size:/@page\{size:420mm 297mm/.test(a3.html),inA3,n:ids.length,planchesOk,planchesVals:[...new Set(Object.values(a3.planches))],autoPages:auto.nPages,autoSize:/@page\{size:\d+mm \d+mm/.test(auto.html),autoNoCut:!/plan de découpage/.test(auto.html),a4Pages:a4.nPages,a4Cut:/plan de découpage/.test(a4.html),a4Planches:[...new Set(Object.values(a4.planches))].length,cart:/Plan des soudures numérotées/.test(a3.html)&&/échelle 1\/200/.test(a3.html)&&/DOE test/.test(a3.html),glyph:/vanne/.test(a3.html),pk:/>50</.test(a3.html),ts:/DEV-07/.test(a3.html),useDefs:/<use href="#w/.test(a3.html)};});
console.log('2) planches :',JSON.stringify(out));
C.c2=out.a3Pages>=1&&out.a3Size&&out.inA3===out.n&&out.planchesOk&&out.autoPages===1&&out.autoSize&&out.autoNoCut&&out.a4Pages>=3&&out.a4Cut&&out.a4Planches>=2&&out.a4Pages===out.a4Planches+1&&out.cart&&out.glyph&&out.pk&&out.ts&&out.useDefs;
// ── 3) carnet : une ligne par soudure documentée, planche, étapes, extrusion, photos, intervenants
out=await page.evaluate(()=>{const D=window.TRACE.doe.data();const pl=window.TRACE.doe.plan(D,{scale:200,format:'A3'});const h=window.TRACE.doe.carnet(D,{planches:pl.planches});const docs=D.welds.filter(w=>w.doc);const nd=D.welds.filter(w=>!w.doc);
  const rows=docs.filter(w=>h.includes('<td class="id"><b>'+w.id+'</b></td>')).length;const nope=nd.filter(w=>h.includes('<td class="id"><b>'+w.id+'</b></td>')).length;const imgs=(h.match(/<img /g)||[]).length;
  const hAll=window.TRACE.doe.carnet(D,{all:true,photos:'none'});const rowsAll=D.welds.filter(w=>hAll.includes('<td class="id"><b>'+w.id+'</b></td>')).length;
  return {title:/Carnet de soudage et manchonnage/.test(h),rows,nDocs:docs.length,nope,imgs,nPhotos:D.nPhotos,planche:/<th>Planche<\/th>/.test(h)&&/<td>1<\/td>/.test(h),extru:/extrudé<\/span> — angle trop important/.test(h),dh:/R 12,4 Ω/.test(h)&&/iso 500 MΩ/.test(h),people:/Karim B\./.test(h)&&/Sofiane K\./.test(h),note:/reprise de meulage/.test(h),landscape:/size:A4 landscape/.test(h),rowsAll,n:D.welds.length,imgsNone:(hAll.match(/<img /g)||[]).length};});
console.log('3) carnet :',JSON.stringify(out));
C.c3=out.title&&out.rows===out.nDocs&&out.nope===0&&out.imgs===out.nPhotos&&out.planche&&out.extru&&out.dh&&out.people&&out.note&&out.landscape&&out.rowsAll===out.n&&out.imgsNone===0;
// ── 4) plan interactif hors ligne : fichier autonome ouvert dans un autre onglet (file sans serveur simulé par le même hôte)
const viewerHtml=await page.evaluate(()=>window.TRACE.doe.viewer(window.TRACE.doe.data(),{}));
fs.writeFileSync('/tmp/site/_viewer_test.html',viewerHtml);
const vp=await ctx.newPage();const vlogs=[];vp.on('pageerror',e=>vlogs.push('PAGEERROR: '+e.message.slice(0,300)));
await vp.goto(BASE+'/_viewer_test.html');await vp.waitForTimeout(600);
out=await vp.evaluate(()=>{const n=window.VIEW.data.welds.length;const lods=[...document.querySelectorAll('#lods .lod')];const shown=lods.filter(g=>g.style.display!=='none').length;const far=document.querySelector('#far').style.display!=='none';
  const id=window.VIEW.data.welds.find(w=>w.extru).id;window.VIEW.select(id);const side=document.querySelector('#side').textContent;const selN=document.querySelectorAll('circle.w.sel').length;const lods2=lods.filter(g=>g.style.display!=='none').length;
  const homeParts=[/Rue de la Gare/.test(side),/Étapes/.test(side),/manchon extrudé/.test(side),/DEV-07/.test(side),/Photos \(3\)/.test(side)];const home=homeParts.every(Boolean);
  // recherche par n°
  const q=document.querySelector('#q');q.value=window.VIEW.data.welds[0].id;q.dispatchEvent(new KeyboardEvent('keydown',{key:'Enter'}));const side2=document.querySelector('#side').textContent;
  return {homeParts,n,lods:lods.length,farOrOne:(far&&shown===0)||(!far&&shown===1),id,home,selN,lods2,search:side2.includes(window.VIEW.data.welds[0].id)&&/Étapes/.test(side2),circles:document.querySelectorAll('circle.w').length,hasFond:!!document.querySelector('#fond'),title:document.title};});
console.log('4) plan interactif :',JSON.stringify(out),vlogs.length?vlogs:'');
C.c4=out.n>0&&out.lods===4&&out.farOrOne&&out.home&&out.selN>=1&&out.lods2===1&&out.search&&out.circles>=out.n*4&&/Plan interactif — DOE test/.test(out.title)&&!vlogs.length;
await vp.close();
// ── 5) zip : contenu complet et cohérent (photos nommées par n°, chemins relatifs du carnet et du plan interactif, QSE, modifs, dossier admin, CSV/JSON)
const b64=await page.evaluate(async()=>{const T=window.TRACE;const D=T.doe.data();const r=await T.doe.zip(D,{format:'A3',scale:200,photos:'all'});const buf=new Uint8Array(await r.blob.arrayBuffer());let s='';for(let i=0;i<buf.length;i+=0x8000)s+=String.fromCharCode.apply(null,buf.subarray(i,i+0x8000));return {b64:btoa(s),name:r.name,size:r.size,report:r.report};});
const files=unzipSync(new Uint8Array(Buffer.from(b64.b64,'base64')));const names=Object.keys(files);const root=names[0].split('/')[0]+'/';const rel=names.map(n=>n.slice(root.length));
const carnet=strFromU8(files[root+'01_Carnet/Carnet_soudage_manchonnage.html']||new Uint8Array());const viewer=strFromU8(files[root+'03_Plan_interactif/Plan_interactif.html']||new Uint8Array());const lisez=strFromU8(files[root+'Lisez-moi.html']||new Uint8Array());
const photoRel=rel.filter(n=>n.startsWith('02_Photos/'));const carnetRefs=[...carnet.matchAll(/src="\.\.\/(02_Photos\/[^"]+)"/g)].map(m=>m[1]);const viewerRefs=[...viewer.matchAll(/\.\.\/(02_Photos\/[^"\\]+)/g)].map(m=>m[1]);
out={name:b64.name,size:b64.size,nFiles:names.length,rootOk:/^DOE_DOE_test_\d{4}-\d{2}-\d{2}\/$/.test(root),lisez:/Dossier des ouvrages exécutés — DOE test/.test(lisez)&&/Carnet de soudage/.test(lisez)&&/Plan des soudures/.test(lisez),
  carnet:carnet.length>1000&&/Carnet de soudage et manchonnage/.test(carnet),plan:rel.includes('01_Carnet/Plan_soudures_numerotees.html'),viewer:viewer.length>1000,ts:rel.includes('04_Modifications/Modifications_du_trace.html'),qse:rel.filter(n=>n.startsWith('05_QSE/')).length,admin:rel.filter(n=>n.startsWith('06_Dossier_administratif/')),csv:rel.includes('donnees/soudures.csv'),json:rel.includes('donnees/doe.json'),
  photos:photoRel.length,photosOk:b64.report.photosOk,photosKo:b64.report.photosKo,carnetRefs:carnetRefs.length,carnetRefsOk:carnetRefs.every(p=>rel.includes(p)),viewerRefsOk:viewerRefs.length>0&&viewerRefs.every(p=>rel.includes(p)),sample:photoRel[0],jpgBytes:files[root+photoRel[0]]&&files[root+photoRel[0]].length};
console.log('5) zip :',JSON.stringify(out));
C.c5=out.rootOk&&out.lisez&&out.carnet&&out.plan&&out.viewer&&out.ts&&out.qse===1&&out.admin.length===2&&out.admin.some(a=>/06_Dossier_administratif\/DT_DICT\/Recepisse_DICT_Enedis\.pdf$/.test(a))&&out.csv&&out.json&&out.photos===12&&out.photosOk===12&&out.photosKo===0&&out.carnetRefs===12&&out.carnetRefsOk&&out.viewerRefsOk&&/^02_Photos\/Rue_de_la_Gare\/S-\d{4}\/S-\d{4}_1-soudure_/.test(out.sample)&&out.jpgBytes>50;
// CSV : une ligne par soudure documentée + en-tête, séparateur ;
{const raw=files[root+'donnees/soudures.csv'];const bom=raw[0]===0xEF&&raw[1]===0xBB&&raw[2]===0xBF;const csv=strFromU8(raw);const lines=csv.trim().split(/\r?\n/);const js=JSON.parse(strFromU8(files[root+'donnees/doe.json']));out={rows:lines.length-1,head:bom&&/^N°;Ligne;Conduite;PK \(m\)/.test(lines[0]),extru:/extrudé;angle trop important;oui/.test(csv),json:js.welds.length===4&&js.welds[0].photos[0].path.startsWith('02_Photos/')&&!js.welds[0].photos[0].src};
 console.log('5b) données :',JSON.stringify(out));C.c5b=out.rows===4&&out.head&&out.extru&&out.json;}
// ── 6) interface : carnet et plan s'ouvrent dans un nouvel onglet ; le zip se télécharge ; options mémorisées
{const p1=ctx.waitForEvent('page');await page.click('#doeCarnet');const w1=await p1;await w1.waitForLoadState('domcontentloaded');await w1.waitForTimeout(300);const t1=await w1.title();const h1=await w1.evaluate(()=>document.body.textContent.slice(0,400));await w1.close();
 const p2=ctx.waitForEvent('page');await page.click('#doePlan');const w2=await p2;await w2.waitForLoadState('domcontentloaded');await w2.waitForTimeout(300);const t2=await w2.title();const pg=await w2.evaluate(()=>document.querySelectorAll('section.pg').length);await w2.close();
 await page.selectOption('#exportview [data-opt=format]','A4');await page.waitForTimeout(200);await page.evaluate(()=>{document.querySelector('#exportview [data-part=admin]').click();});
 const dl=page.waitForEvent('download');await page.click('#doeZip');const d=await dl;const fn=d.suggestedFilename();await page.waitForTimeout(600);
 const st=await page.evaluate(()=>({prog:document.querySelector('#doeProg').textContent,opts:window.TRACE.state.doeOpts.format,admin:window.TRACE.state.doeOpts.parts.admin,btn:document.querySelector('#doeZip').textContent}));
 out={t1,carnet:/Carnet de soudage et manchonnage/.test(h1),t2,pg,fn,prog:st.prog,opts:st.opts,admin:st.admin,btn:st.btn};console.log('6) interface :',JSON.stringify(out));
 C.c6=/Carnet de soudage/.test(t1)&&out.carnet&&/Plan des soudures/.test(t2)&&pg>=1&&/^DOE_DOE_test_.*\.zip$/.test(fn)&&/✓/.test(st.prog)&&/12 photos/.test(st.prog)&&st.opts==='A4'&&st.admin===false&&/Fabriquer/.test(st.btn);}
// ── 7) définitif : plus d'interrupteur « Export DOE » dans Nouveautés ; carte du Récap → onglet Export ; onglet Modifs : l'export des modifications marche toujours
out=await page.evaluate(()=>{const T=window.TRACE;T.state.tab='recap';T.renderAll();const card=document.querySelector('#recap #doe-go');const txt=card&&card.closest('.card').textContent;card&&card.click();const tab=T.state.tab;
  T.state.tab='plan';T.renderAll();const home=document.querySelector('#nextBtn');return {card:!!card,txt:/onglet Export/.test(txt||''),tab,home:home?home.textContent:'(pas de bouton)',tsHtml:/Modifications du tracé — DOE test/.test(T.doe.tsHTML())};});
console.log('7) définitif :',JSON.stringify(out));C.c7=out.card&&out.txt&&out.tab==='export'&&out.tsHtml;
// ── 8) après rechargement : l'onglet est toujours là et le chantier s'exporte pareil (données persistées)
const siteId=await page.evaluate(()=>window.TRACE.state.siteId);await page.reload();await page.waitForTimeout(1500);await page.evaluate(id=>window.TRACE.go(id),siteId);await page.waitForTimeout(2500);await page.selectOption('#roleSel','ethan');await page.waitForTimeout(300);
out=await page.evaluate(()=>{document.querySelector('#tabbar [data-tab=export]').click();const D=window.TRACE.doe.data();const pl=window.TRACE.doe.plan(D,{scale:200,format:'A3'});return {tab:window.TRACE.state.tab,n:D.welds.length,ts:D.ts.length,view:/Export — DOE test/.test(document.querySelector('#exportview').textContent),pages:pl.nPages,carnet:/Carnet de soudage/.test(window.TRACE.doe.carnet(D,{all:true,photos:'none'}))};});
console.log('8) après rechargement (hors ligne : l\'avancement des soudures vit sur le serveur, la structure et les marques sur l\'appareil) :',JSON.stringify(out));C.c8=out.tab==='export'&&out.n===40&&out.ts===1&&out.view&&out.pages>=1&&out.carnet;
const bad=Object.entries(C).filter(([k,v])=>!v).map(([k])=>k);console.log(bad.length?'RESULTAT: ECHEC '+bad.join(','):'RESULTAT: TOUT VERT');console.log(logs.length?logs:'[]');
try{fs.unlinkSync('/tmp/site/_viewer_test.html');}catch(e){}
await browser.close();
