// 21/10 (Ethan : « simplifier l'œil … vue par défaut … retour au défaut simple ») : panneau 👁 en pastilles, vue par défaut commune,
// « ↺ Par défaut » / « Tout » / « Épuré », point orange sur 👁 quand la vue a changé, réglage d'avant le 21/10 remis à la vue par défaut (une fois),
// réglages rares sous « Plus de réglages » (reste ouvert quand on coche dedans), photo aérienne d'office sur un plan calé, téléphone 390 px.
import { chromium } from 'playwright';
const BASE=process.env.BASE||'http://localhost:8765';
const SHOTS=process.env.SHOTS||null;
const browser=await chromium.launch({headless:true, executablePath: process.env.CHROMIUM_PATH||undefined});
const C={};const logs=[];
// tuile IGN fictive (le bac à sable n'a pas le réseau) : PNG 1×1 vert
const PNG=Buffer.from('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAIAAACQd1PeAAAADElEQVR4nGNwaGgAAAHMAOFXDKBOAAAAAElFTkSuQmCC','base64');
async function mk(vp,geo){
  const ctx=await browser.newContext({viewport:vp,deviceScaleFactor:1});const page=await ctx.newPage();
  await page.route(/data\.geopf\.fr\/wmts/,r=>r.fulfill({body:PNG,contentType:'image/png'}));
  page.on('pageerror',e=>logs.push('PAGEERROR: '+e.message.slice(0,300)));page.on('console',m=>{if(m.type()==='error'&&!/supabase|Failed to fetch|net::ERR|404|geopf/i.test(m.text()))logs.push(m.text().slice(0,200));});
  await page.goto(BASE+'/traceur.html');await page.waitForTimeout(500);await page.evaluate(()=>localStorage.clear());await page.reload();await page.waitForTimeout(500);
  await page.evaluate(g=>{const S=window.MAQ.state;S.lines=[{id:'L1',name:'Feeder',dn:100,bar:12,pts:[[10,50],[70,50],[70,80]],specials:[{id:'v1',type:'valve',m:22}],parent:null}];S.seq=2;
    if(g)S.bg={drawing:[{layer:'0',pts:[[0,0],[80,0]],c:'#888'}],bbox:[0,0,80,100],name:'bain_test.dxf',origin:{x0:1349000,y1:7193500},netLayers:[],opacity:.5,show:true};
    window.MAQ.setMode('select');window.MAQ.rebuild();},geo);
  await page.click('#bSave');await page.waitForTimeout(200);await page.fill('#svName',geo?'Oeil géo':'Oeil test');await page.click('#svOk');await page.waitForTimeout(800);
  await page.click('#svGo');await page.waitForTimeout(1500);await page.selectOption('#roleSel','karim');await page.waitForTimeout(300);
  return {ctx,page};
}
const eye=page=>page.click('.zoomctl [data-z="eye"]').then(()=>page.waitForTimeout(250));
const st=page=>page.evaluate(()=>{const T=window.TRACE;const d=document.getElementById('disp');const b=document.querySelector('.zoomctl [data-z=eye]');
  return {show:{...T.state.show},open:d.classList.contains('show'),head:(d.querySelector('.dhead')||{}).textContent||'',dot:b.classList.contains('custom'),
    def:(d.querySelector('[data-def]')||{}).className||'',all:(d.querySelector('[data-all="1"]')||{}).className||'',ep:(d.querySelector('[data-all="0"]')||{}).className||'',
    hint:[...d.querySelectorAll('.maphint')].map(x=>x.textContent).join(' | '),chips:d.querySelectorAll('label.dchip').length,
    ls:(()=>{try{return JSON.parse(localStorage.getItem('trace:show')||'null');}catch(e){return 'ERR';}})()};});
const shot=async(page,n)=>{if(SHOTS)await page.screenshot({path:`${SHOTS}/oeil_${n}.png`});};

// ── 1) appareil neuf : vue par défaut (pièces décochées, photo aérienne), « ✓ vue par défaut », pas de point orange
let {ctx,page}=await mk({width:1366,height:860},false);
await page.evaluate(()=>window.TRACE.centerOn(40,50,25));await page.waitForTimeout(200);
await eye(page);let o=await st(page);await shot(page,'1_pc_defaut');
console.log('1) défaut :',JSON.stringify({head:o.head,dot:o.dot,def:o.def,chips:o.chips,pieces:o.show.pieces,fils:o.show.fils,carte:o.show.carte,conv:o.show.conv,convAll:o.show.convAll,fourn:o.show.fourn,obj:o.show.objectifs,cotes:o.show.cotes,nums:o.show.nums,manch:o.show.manch,soud:o.show.soud,hint:o.hint.slice(0,160)}));
C.c1=o.open&&/✓ vue par défaut/.test(o.head)&&!o.dot&&/\bon\b/.test(o.def)&&o.chips>=13&&o.show.pieces===false&&o.show.carte==='ortho'&&o.show.fils&&o.show.conv&&o.show.convAll===false&&o.show.fourn&&o.show.objectifs&&o.show.cotes&&o.show.nums&&o.show.manch&&o.show.soud
  &&/pas de photo aérienne/.test(o.hint);

// ── 2) toucher la pastille « Fils E / N » (vrai clic, comme au doigt) → décochée, « vue personnalisée », « Changé … : Fils », point orange, mémorisé (v2)
await page.click('#disp input[data-k="fils"]');await page.waitForTimeout(250);o=await st(page);await shot(page,'2_pc_fils_off');
const wires=await page.evaluate(()=>document.querySelectorAll('#net .wire, #net [data-wire]').length);
console.log('2) fils décochés :',JSON.stringify({head:o.head,dot:o.dot,def:o.def,fils:o.show.fils,ls:o.ls&&{v:o.ls._v,fils:o.ls.fils},hint:o.hint.slice(0,220)}));
C.c2=o.show.fils===false&&/vue personnalisée/.test(o.head)&&o.dot&&/ddef/.test(o.def)&&/Changé par rapport à la vue par défaut : Fils/.test(o.hint)&&o.ls&&o.ls._v===2&&o.ls.fils===false&&/masqués/.test(o.hint);

// ── 3) « ↺ Par défaut » → tout revient, plus de point orange
await page.click('#disp [data-def="1"]');await page.waitForTimeout(250);o=await st(page);
console.log('3) retour au défaut :',JSON.stringify({head:o.head,dot:o.dot,fils:o.show.fils,ls:o.ls&&o.ls.fils}));
C.c3=o.show.fils===true&&/✓ vue par défaut/.test(o.head)&&!o.dot&&o.ls&&o.ls.fils===true;

// ── 4) « Épuré » puis « Tout » : préréglages repérés ; « Plus de réglages » fermé d'office, reste ouvert quand on coche dedans
await page.click('#disp [data-all="0"]');await page.waitForTimeout(200);o=await st(page);const ep={head:o.head,ep:o.ep,fils:o.show.fils,cotes:o.show.cotes,dot:o.dot};
await page.click('#disp [data-all="1"]');await page.waitForTimeout(200);o=await st(page);const al={head:o.head,all:o.all,pieces:o.show.pieces,marche:o.show.marche};
await page.click('#disp [data-def="1"]');await page.waitForTimeout(200);
const more0=await page.evaluate(()=>{const d=document.querySelector('#disp details.dmore');return d?{open:d.open,txt:d.querySelector('summary').textContent}:null;});
await page.click('#disp details.dmore summary');await page.waitForTimeout(150);
await page.click('#disp details.dmore input[data-k="marche"]');await page.waitForTimeout(250);
const more1=await page.evaluate(()=>{const d=document.querySelector('#disp details.dmore');return {open:d.open,txt:d.querySelector('summary').textContent,marche:window.TRACE.state.show.marche,labs:[...document.querySelectorAll('#disp label')].map(l=>l.textContent.trim()).filter(x=>/marché|Écarts|Extrusions|Modifications/.test(x)).length};});
await shot(page,'4_pc_plus_de_reglages');
console.log('4) préréglages / plus de réglages :',JSON.stringify({ep,al,more0,more1}));
C.c4=/vue épurée/.test(ep.head)&&/\bon\b/.test(ep.ep)&&ep.fils===true&&ep.cotes===false&&ep.dot&&/tout affiché/.test(al.head)&&/\bon\b/.test(al.all)&&al.pieces===true&&al.marche===true
  &&more0&&more0.open===false&&/Plus de réglages \(\d\/7 affichés\)/.test(more0.txt)&&more1.open===true&&more1.marche===true&&more1.labs===4;

// ── 5) n° de soudure grisé tant que les pastilles sont décochées
await page.click('#disp [data-def="1"]');await page.waitForTimeout(150);await page.click('#disp input[data-k="soud"]');await page.waitForTimeout(200);
const nums=await page.evaluate(()=>{const i=document.querySelector('#disp input[data-k="nums"]');return {dis:i.disabled,cls:i.parentElement.className};});
await page.click('#disp [data-def="1"]');await page.waitForTimeout(150);
console.log('5) n° suit les pastilles :',JSON.stringify(nums));C.c5=nums.dis&&/\bdis\b/.test(nums.cls);

// ── 6) réglage enregistré AVANT le 21/10 (sans version, fils décochés, plan IGN) → au rechargement : vue par défaut (une fois)
await page.evaluate(()=>localStorage.setItem('trace:show',JSON.stringify({fils:false,carte:'plan',pieces:true,soud:true})));
const sid=await page.evaluate(()=>window.TRACE.state.siteId);await page.reload();await page.waitForTimeout(1500);await page.evaluate(id=>window.TRACE.go(id),sid);await page.waitForTimeout(700);
o=await st(page);console.log('6) ancien réglage :',JSON.stringify({fils:o.show.fils,carte:o.show.carte,pieces:o.show.pieces,dot:o.dot}));
C.c6=o.show.fils===true&&o.show.carte==='ortho'&&o.show.pieces===false&&!o.dot;
// … mais un réglage fait APRÈS (v2) est gardé
await eye(page);await page.click('#disp input[data-k="cotes"]');await page.waitForTimeout(200);await page.reload();await page.waitForTimeout(1500);await page.evaluate(id=>window.TRACE.go(id),sid);await page.waitForTimeout(700);
o=await st(page);console.log('6b) réglage v2 gardé :',JSON.stringify({cotes:o.show.cotes,dot:o.dot}));C.c6b=o.show.cotes===false&&o.dot;
await ctx.close();

// ── 7) plan calé (DXF en Lambert) : photo aérienne d'office sous le plan, boutons carte, cadastre en pastille
({ctx,page}=await mk({width:1366,height:860},false));
// origine DXF en Lambert CC48 (Bain-de-Bretagne) posée sur le chantier (comme un import DXF en Lambert) → géoréférencement détecté
await page.evaluate(()=>{const T=window.TRACE;T.net.origin={x0:1349000,y1:7193500};T.geoRefresh();T.renderAll();});
await page.waitForTimeout(900);
o=await page.evaluate(()=>({imgs:document.querySelectorAll('#map image').length,layer:(document.querySelector('#map image')?.getAttribute('href')||'').match(/LAYER=([^&]+)/)?.[1]||'',nopaper:document.querySelector('#bg').classList.contains('nopaper'),carte:window.TRACE.state.show.carte}));
await eye(page);const geoP=await page.evaluate(()=>({ortho:(document.querySelector('#disp [data-carte="ortho"]')||{}).className||'',cad:!!document.querySelector('#disp label.dchip input[data-k="cadastre"]'),hint:[...document.querySelectorAll('#disp .maphint')].map(x=>x.textContent).join(' | ')}));
await shot(page,'7_pc_geo_photo');
console.log('7) plan calé :',JSON.stringify({o,geoP}));
C.c7=o.carte==='ortho'&&o.imgs>0&&/ORTHO/i.test(o.layer)&&o.nopaper&&/\bon\b/.test(geoP.ortho)&&geoP.cad&&/Plan géoréférencé/.test(geoP.hint);
await ctx.close();

// ── 8) téléphone 390 : le panneau tient dans l'écran, pastilles ≥ 40 px de haut (gants), deux colonnes, pas de débordement
({ctx,page}=await mk({width:390,height:844},false));
await page.evaluate(()=>window.TRACE.centerOn(40,50,25));await page.waitForTimeout(200);await eye(page);
o=await page.evaluate(()=>{const d=document.getElementById('disp');const r=d.getBoundingClientRect();const ch=[...d.querySelectorAll('label.dchip')].map(l=>l.getBoundingClientRect());
  return {inScreen:r.left>=0&&r.right<=window.innerWidth+1,noHScroll:document.documentElement.scrollWidth<=window.innerWidth+1,minH:Math.min(...ch.map(x=>x.height)),cols:new Set(ch.slice(0,6).map(x=>Math.round(x.left))).size,w:Math.round(r.width)};});
await shot(page,'8_tel_390');
await page.click('#disp input[data-k="objectifs"]');await page.waitForTimeout(200);const tel=await st(page);
console.log('8) téléphone :',JSON.stringify(o),'objectifs',tel.show.objectifs,'dot',tel.dot);
C.c8=o.inScreen&&o.noHScroll&&o.minH>=40&&o.cols===2&&tel.show.objectifs===false&&tel.dot;
// un tap sur le plan referme le panneau
const free=await page.evaluate(()=>{const d=document.getElementById('disp').getBoundingClientRect();const cv=document.getElementById('canvas').getBoundingClientRect();
  for(let y=Math.round(d.bottom+6);y<cv.bottom-4;y+=4)for(const x of [30,90,150]){const el=document.elementFromPoint(x,y);if(el&&el.closest('#canvas')&&!el.closest('.disp,.zoomctl,.legend,button'))return {x,y};}return null;});
if(free)await page.mouse.click(free.x,free.y);await page.waitForTimeout(200);C.c8b=await page.evaluate(()=>!document.getElementById('disp').classList.contains('show'));
// … et le ✕ du panneau aussi (sur téléphone le panneau couvre le bouton 👁)
await page.evaluate(()=>document.querySelector('.zoomctl [data-z=eye]').click());await page.waitForTimeout(200);await page.click('#disp [data-dclose]');await page.waitForTimeout(150);C.c8c=await page.evaluate(()=>!document.getElementById('disp').classList.contains('show'));
await ctx.close();

console.log('erreurs console :',JSON.stringify(logs));C.c9=logs.length===0;
const ko=Object.entries(C).filter(([k,v])=>!v).map(([k])=>k);
console.log(JSON.stringify(C));console.log(ko.length?'RESULTAT: KO '+ko.join(','):'RESULTAT: TOUT VERT');
await browser.close();
