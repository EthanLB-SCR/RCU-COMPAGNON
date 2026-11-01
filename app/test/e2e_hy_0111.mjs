// e2e_hy_0111 — 01/11 soir (Ethan, onglet Hydraulique : « la prestation à préparer avec la liste, ça prend trop de place » ; « si on fait l'épreuve et que l'onglet
//   affiche fin de ligne alors que dans les faits c'est une sous-station avec des vannes et by-pass : super important » ; « sur un chantier ça m'affiche kit fin de ligne
//   alors que j'ai des sous-stations » ; « répare la recherche de borne » ; « les vannes de sectionnement sur le plan d'ensemble, pas en liste » ; « dossier de
//   préparation : tout en mots entiers, pas de raccourci comme PV »)
//  y1  prestations compactes (4 boutons sur une grille) + une ligne « aux extrémités » qui nomme la sous-station
//  y2  épreuve seule : la ligne qui finit en SOUS-STATION n'est jamais « kit fin de ligne » (vannes + by-pass) ; l'antenne en kit, si ; départ « sous-station » reconnu aussi
//  y3  rinçage coché : la sous-station passe par son by-pass (toujours « sous-station »), l'antenne → by-pass à poser
//  y4  vue d'ensemble : la vanne dessinée (⋈) ; la toucher → sa fiche ; la liste des vannes est repliée
//  y5  bornes : serveur OpenStreetMap simulé → bornes trouvées, écrites dans l'onglet et gardées dans le chantier ; serveurs en panne → message clair, rien de cassé
//  y6  dossier de préparation : « sous-station », « Tronçon 1 », pas de « KFL », « BP », « PV » ni « T1 »
//  y7  zéro erreur de page
import { chromium } from 'playwright';
const BASE=process.env.BASE||'http://localhost:8765';const C={};const J=x=>JSON.stringify(x);const errs=[];
const b=await chromium.launch({executablePath:process.env.CHROMIUM_PATH||undefined});const ctx=await b.newContext({viewport:{width:1280,height:900}});const page=await ctx.newPage();page.on('pageerror',e=>errs.push(String(e)));page.on('dialog',d=>d.accept().catch(()=>{}));
const W=ms=>page.waitForTimeout(ms);const T=(f,a)=>page.evaluate(f,a);
await page.goto(BASE+'/traceur.html');await W(500);await T(()=>localStorage.clear());await page.reload();await W(600);
await T(()=>{const S=window.MAQ.state;S.supplier='AXIOM';S.lines=[
  {id:'L1',name:'Feeder',dn:100,bar:12,inv:true,pts:[[10,50],[210,50]],specials:[{id:'V1',type:'valve',m:120}],parent:null,endType:'sousstation'},
  {id:'L2',name:'Antenne',dn:65,bar:12,inv:true,pts:[[60,50],[60,90]],specials:[],parent:{line:'L1',m:50,side:1},endType:'kit'},
  {id:'L3',name:'Retour SST',dn:65,bar:12,inv:true,pts:[[300,50],[400,50]],specials:[],parent:null,startType:'sousstation',endType:'kit'}];S.seq=4;window.MAQ.setMode('select');window.MAQ.rebuild();});
await page.click('#bSave');await W(200);await page.fill('#svName','Hydro SST test');await page.click('#svOk');await W(800);
await page.click('#svGo');await W(1600);await page.selectOption('#roleSel','ethan');await W(300);await T(()=>{try{window.TRACE.tuto.close(null);}catch(e){}});
await T(()=>{const X=window.TRACE;X.state.tab='hydro';X.renderAll();});await W(600);
const ends=()=>T(()=>{const H=window.TRACE.hydro.build();return H.troncons.flatMap(t=>t.ends.map(e=>({line:e.line,type:e.type,need:e.need,label:e.label,already:e.already})));});
const o={};
// y1
o.y1=await T(()=>{const el=document.getElementById('hydro');const g=el.querySelector('.hyPrests');return {grid:!!g,btns:g?g.querySelectorAll('.hyCard.hyPr').length:0,on:el.querySelectorAll('.hyCard.on').length,h:g?g.getBoundingClientRect().height:0,sum:(el.querySelector('.hyPrestSum')||{}).textContent||''};});
C.y1=o.y1.grid&&o.y1.btns===4&&o.y1.on===1&&o.y1.h<130&&/sous-station/.test(o.y1.sum)&&/kit/.test(o.y1.sum);
// y2
o.y2=await ends();
{const t1=o.y2.find(e=>e.line==='L1'&&e.type==='tip'),t2=o.y2.find(e=>e.line==='L2'&&e.type==='tip'),s3=o.y2.find(e=>e.line==='L3'&&e.type==='start');
 C.y2=!!t1&&t1.need==='SST'&&/Sous-station/.test(t1.label)&&!!t2&&t2.need==='KFL'&&!!s3&&s3.need==='SST';}
// y3
await T(()=>document.querySelector('#hydro .hyCard[data-p=rincage]').click());await W(400);
o.y3={e:await ends(),sum:await T(()=>(document.querySelector('#hydro .hyPrestSum')||{}).textContent||'')};
{const t1=o.y3.e.find(e=>e.line==='L1'&&e.type==='tip'),t2=o.y3.e.find(e=>e.line==='L2'&&e.type==='tip');C.y3=t1.need==='SST'&&t2.need==='BP'&&/by-pass/.test(o.y3.sum)&&/circulation par leur by-pass/.test(o.y3.sum);}
// y4 — vanne sur la vue d'ensemble
await W(300);o.y4={v:await T(()=>{const g=document.querySelector('#hydroMap [data-hyv]');if(!g)return null;g.scrollIntoView({block:'center'});const r=g.getBoundingClientRect();return {x:r.left+r.width/2,y:r.top+r.height/2,key:g.dataset.hyv};})};
if(o.y4.v){await W(200);o.y4.v=await T(()=>{const g=document.querySelector('#hydroMap [data-hyv]');const r=g.getBoundingClientRect();return {x:r.left+r.width/2,y:r.top+r.height/2,key:g.dataset.hyv};});await page.mouse.click(o.y4.v.x,o.y4.v.y);await W(500);}
o.y4.sheet=await T(()=>{const s=document.getElementById('sheet');return {show:s.classList.contains('show'),txt:s.textContent.replace(/\s+/g,' ').slice(0,120)};});
o.y4.list=await T(()=>{const d=document.querySelector('#hydro details.pt-vlist');return {d:!!d,open:d?d.open:null,rows:document.querySelectorAll('#hydro .pt-vannes .pt-row').length,onMap:/vue d'ensemble/.test((document.querySelector('#hydro .pt-vOnMap')||{}).textContent||'')};});
await T(()=>window.TRACE.closeSheet());await W(200);
C.y4=!!o.y4.v&&o.y4.sheet.show&&/anne/.test(o.y4.sheet.txt)&&o.y4.list.d&&o.y4.list.open===false&&o.y4.list.rows===1&&o.y4.list.onMap;
// y5 — bornes (OpenStreetMap simulé)
const R=6378137,D=Math.PI/180;const X0=R*(-3.42*D),Y0=R*Math.log(Math.tan(Math.PI/4+47.73*D/2));
const ll=(x,y)=>{const X=X0+x,Y=Y0-y;return {lon:X/R/D,lat:(2*Math.atan(Math.exp(Y/R))-Math.PI/2)/D};};
let mode='ok';await page.route('**/api/interpreter**',route=>{if(mode==='down')return route.fulfill({status:504,body:'busy',headers:{'Access-Control-Allow-Origin':'*'}});const p=ll(70,30),q=ll(150,70);return route.fulfill({status:200,contentType:'application/json',headers:{'Access-Control-Allow-Origin':'*'},body:JSON.stringify({elements:[{type:'node',id:1,lat:p.lat,lon:p.lon,tags:{emergency:'fire_hydrant',ref:'PI 12'}},{type:'node',id:2,lat:q.lat,lon:q.lon,tags:{emergency:'fire_hydrant','fire_hydrant:type':'underground'}}]})});});
await page.route('**/osm/tools/overpass/**',route=>route.fulfill({status:504,body:'',headers:{'Access-Control-Allow-Origin':'*'}}));
o.y5={geo:await T(g=>window.TRACE.hyTest.geo(g),{crs:'EPSG:3857',aff:{a:1,b:0,e:X0,c:0,d:-1,f:Y0}})};
await T(()=>{const X=window.TRACE;X.state.tab='hydro';X.renderAll();});await W(300);
await T(()=>window.TRACE.hyTest.osm());await W(800);
o.y5.ok=await T(()=>{const h=window.TRACE.hydro.of();const st=window.TRACE.state;return {n:(st.osmHydrants||[]).length,saved:h.osm&&h.osm.pts.length,msg:(document.querySelector('#hydro .hyOsmMsg')||{}).textContent||'',near:(st.osmHydrants||[]).some(p=>Math.abs(p.x-70)<2&&Math.abs(p.y-30)<2),btn:(document.getElementById('hyOsm')||{}).textContent||''};});
mode='down';await T(()=>{window.TRACE.state.osmHydrants=null;});await T(()=>window.TRACE.hyTest.osm());await W(800);
o.y5.down=await T(()=>({msg:(document.querySelector('#hydro .hyOsmMsg')||{}).textContent||'',busy:!!window.TRACE.state.osmBusy}));
C.y5=o.y5.geo&&o.y5.ok.n===2&&o.y5.ok.saved===2&&o.y5.ok.near&&/2 bornes incendie/.test(o.y5.ok.msg)&&/\(2\)/.test(o.y5.ok.btn)&&/injoignables/.test(o.y5.down.msg)&&!o.y5.down.busy;
// y6 — dossier de préparation
const [pop]=await Promise.all([page.waitForEvent('popup'),T(()=>window.TRACE.hyTest.report(null))]);await pop.waitForLoadState().catch(()=>{});await W(500);
const doc=await pop.evaluate(()=>document.body.innerText);await pop.close();
o.y6={len:doc.length,sst:/sous-station/i.test(doc),tr:/Tronçon 1/.test(doc),kfl:/\bKFL\b/.test(doc),bp:/\bBP\b/.test(doc),pv:/\bPV\b/.test(doc),t1:/\bT1\b/.test(doc),title:/Dossier de préparation hydraulique/.test(doc)};
C.y6=o.y6.title&&o.y6.sst&&o.y6.tr&&!o.y6.kfl&&!o.y6.bp&&!o.y6.pv&&!o.y6.t1;
console.log('mesures :',J(o).slice(0,3000));
await b.close();C.y7=!errs.length;if(errs.length)console.log('erreurs',errs.slice(0,3));
console.log('RÉSULTATS',J(C));const ko=Object.entries(C).filter(([,v])=>!v).map(([k])=>k);console.log(ko.length?'RESULTAT: ECHEC '+ko.join(' '):'RESULTAT: TOUT VERT');process.exit(ko.length?1:0);
