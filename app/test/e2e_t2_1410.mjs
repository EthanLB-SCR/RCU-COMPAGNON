// e2e_t2_1410.mjs — 14/10 soir, lot T2 (traceur : plans de fond, vue aérienne, calage). Données 100 % FICTIVES ; tout le réseau extérieur est intercepté
// (tuiles IGN → petite image, géocodage → JSON factice, pdf.js servi localement par ?pdfjs=/pdfjs/).
// c0  Node : formats (« ＋ Plan »), résolution lue dans les images (PNG pHYs, JPEG JFIF / EXIF), échelle 1/N, géoréférencement (adresse, DXF CC47 → Lambert 93), pont (site.geo)
// c1  « ＋ Plan (DXF, PDF, image) » : accept (.dxf, .pdf, images) ; DWG / TIFF / format inconnu → message, rien d'ajouté
// c2  PDF fictif de 2 pages (A3 paysage 420 × 297 mm) → choix de la page 2 → un plan « PDF » net (~6 000 px), taille réelle de la page gardée
// c3  échelle « valeurs » 1/200 dans l'onglet Fond (à côté de l'opacité) → le trait de 100 mm de la page mesure 20 m (± 1 %), centre et rotation gardés, « 1 cm sur le plan = 2 m »
// c4  image PNG fictive à 300 dpi (pHYs) → dpi lu ; 1/100 → le trait de 300 px (1 pouce) mesure 2,54 m (± 1 %)
// c5  📍 Vue aérienne (adresse fictive) → géoréférencement créé (Lambert 93, nord en haut, adresse au centre de la vue) ; tuiles SOUS les plans, © IGN ; œil, opacité, couche
// c6  ⌖ calage 1 point « un plan et toutes ses lignes » (2 lignes tracées sur la planche) : les deux lignes et le plan bougent du même vecteur ; ↶ annule tout (plan compris)
// c7  ⌖ calage 2 points d'une ligne (rotation + translation) : ses sommets tombent sur les repères ; son plan (qui n'a qu'elle) suit
// c8  DXF géoréférencés (Lambert 93 et CC47) importés avec la vue aérienne : placés seuls à leur vraie position, calés entre eux ; DXF sans coordonnées : posé à côté, à caler
// c9  💾 Enregistrer → site.geo = géoréférencement du traceur, plans PDF avec leur taille de page, lignes avec leur plan ; appli : chantier au bon endroit (carte des chantiers) ;
//     traceur rouvert sur le chantier : vue aérienne retrouvée
// c10 hors connexion : message, rien ne casse ; téléphone 390 px : rien ne déborde, boutons ≥ 34 px
// c11 console vide
import { chromium } from 'playwright';
import zlib from 'zlib';
import {planFileKind,imageDpi,planScaleK,planScaleN,tfScaleAbout,tfApply,paperName} from '../src/plans.js';
import {CRS,geoNorthUp,geoOfOrigin,geoMapPoint,planToLonLat,lonLatToPlan} from '../src/geo.js';
import {siteFromTraceur} from '../maquette/bridge.js';
const BASE=process.env.BASE||'http://localhost:8765';
const C={};const near=(a,b,t=1e-6)=>Math.abs(a-b)<=t;const R4=v=>+(+v).toFixed(4);
// ── fixtures fictives
function crc32(buf){let crc=0xFFFFFFFF;for(let n=0;n<buf.length;n++){let c=(crc^buf[n])&0xFF;for(let k=0;k<8;k++)c=c&1?0xEDB88320^(c>>>1):c>>>1;crc=(crc>>>8)^c;}return (crc^0xFFFFFFFF)>>>0;}
function chunk(type,data){const len=Buffer.alloc(4);len.writeUInt32BE(data.length);const td=Buffer.concat([Buffer.from(type,'latin1'),data]);const crc=Buffer.alloc(4);crc.writeUInt32BE(crc32(td));return Buffer.concat([len,td,crc]);}
function makePng(w,h,pix,dpi){const raw=Buffer.alloc((w*3+1)*h);for(let y=0;y<h;y++){raw[y*(w*3+1)]=0;for(let x=0;x<w;x++){const [r,g,b]=pix(x,y);const o=y*(w*3+1)+1+x*3;raw[o]=r;raw[o+1]=g;raw[o+2]=b;}}
  const ihdr=Buffer.alloc(13);ihdr.writeUInt32BE(w,0);ihdr.writeUInt32BE(h,4);ihdr[8]=8;ihdr[9]=2;const parts=[Buffer.from([0x89,0x50,0x4E,0x47,0x0D,0x0A,0x1A,0x0A]),chunk('IHDR',ihdr)];
  if(dpi){const p=Buffer.alloc(9);const ppm=Math.round(dpi/0.0254);p.writeUInt32BE(ppm,0);p.writeUInt32BE(ppm,4);p[8]=1;parts.push(chunk('pHYs',p));}
  parts.push(chunk('IDAT',zlib.deflateSync(raw)),chunk('IEND',Buffer.alloc(0)));return Buffer.concat(parts);}
// PDF : pages = [{w, h (points), ops (dessin)}] — même structure que test/mkpdf.mjs
function makePdf(pages){const objs=[];objs[1]='<< /Type /Catalog /Pages 2 0 R >>';const kids=[];let n=3;
  pages.forEach(pg=>{objs[n]=`<< /Length ${Buffer.byteLength(pg.ops,'latin1')} >>\nstream\n${pg.ops}\nendstream`;const c=n++;objs[n]=`<< /Type /Page /Parent 2 0 R /MediaBox [0 0 ${pg.w} ${pg.h}] /Contents ${c} 0 R >>`;kids.push(n++);});
  objs[2]=`<< /Type /Pages /Kids [${kids.map(k=>k+' 0 R').join(' ')}] /Count ${kids.length} >>`;
  let pdf='%PDF-1.4\n';const offs=[];for(let i=1;i<objs.length;i++){offs[i]=Buffer.byteLength(pdf,'latin1');pdf+=`${i} 0 obj\n${objs[i]}\nendobj\n`;}
  const x=Buffer.byteLength(pdf,'latin1');pdf+=`xref\n0 ${objs.length}\n0000000000 65535 f \n`+offs.slice(1).map(o=>String(o).padStart(10,'0')+' 00000 n \n').join('')+`trailer\n<< /Size ${objs.length} /Root 1 0 R >>\nstartxref\n${x}\n%%EOF\n`;
  return Buffer.from(pdf,'latin1');}
const MM=72/25.4;const A3W=+(420*MM).toFixed(3),A3H=+(297*MM).toFixed(3);
const LINE={x0:200,x1:+(200+100*MM).toFixed(4),y:400}; // trait de 100 mm exactement, page 2
const PDF=makePdf([{w:A3W,h:A3H,ops:'3 w 0 0 0 RG 100 100 m 300 300 l S'},{w:A3W,h:A3H,ops:`4 w 0 0 0 RG ${LINE.x0} ${LINE.y} m ${LINE.x1} ${LINE.y} l S`}]);
const PNG300=makePng(600,400,(x,y)=>(y>=198&&y<=202&&x>=100&&x<400)?[0,0,0]:[235,240,250],300); // trait de 300 px = 1 pouce à 300 dpi
const TILE=makePng(256,256,(x,y)=>((x>>5)+(y>>5))%2?[96,140,80]:[120,170,100]); // tuile factice (damier vert)
// adresse fictive, coordonnées d'un point quelconque (aucune donnée de chantier)
const ADDR={lon:-0.55,lat:47.47,label:'12 rue Fictive, 49000 Ville-Test'};
// DXF fictifs : le MÊME lieu (100 m à l'est de l'adresse) en Lambert 93 et en Lambert CC47
const LL_P=[ADDR.lon+100/(111320*Math.cos(ADDR.lat*Math.PI/180)),ADDR.lat];
const L93=CRS['EPSG:2154'].fwd(LL_P[0],LL_P[1]),CC47=CRS['EPSG:3947'].fwd(LL_P[0],LL_P[1]);
const dxfText=(X,Y,lay='RCU')=>{const L=(x1,y1,x2,y2)=>['0','LINE','8',lay,'10',x1.toFixed(3),'20',y1.toFixed(3),'11',x2.toFixed(3),'21',y2.toFixed(3)].join('\n');return ['0','SECTION','2','HEADER','9','$INSUNITS','70','6','0','ENDSEC','0','SECTION','2','ENTITIES',L(X,Y,X+60,Y),L(X+60,Y,X+60,Y+40),'0','ENDSEC','0','EOF'].join('\n');};
// ── 0) unités Node
{const k=[planFileKind('a.dxf'),planFileKind('b.PDF'),planFileKind('c.jpeg'),planFileKind('d.png'),planFileKind('e.webp'),planFileKind('f.gif'),planFileKind('g.bmp'),planFileKind('h.dwg'),planFileKind('i.tif'),planFileKind('j.txt')];
  // JPEG minimal : JFIF 200 dpi ; JPEG avec EXIF seul (XResolution 150/1, unité pouce) ; JFIF « rapport d'aspect » (unités 0) → rien
  const jfif=u=>Buffer.from([0xFF,0xD8,0xFF,0xE0,0,16,0x4A,0x46,0x49,0x46,0,1,1,u,0,200,0,200,0,0,0xFF,0xD9]);
  const ifd=Buffer.alloc(2+2*12+4+8);ifd.writeUInt16LE(2,0);ifd.writeUInt16LE(0x011A,2);ifd.writeUInt16LE(5,4);ifd.writeUInt32LE(1,6);ifd.writeUInt32LE(8+2+24+4,10);ifd.writeUInt16LE(0x0128,14);ifd.writeUInt16LE(3,16);ifd.writeUInt32LE(1,18);ifd.writeUInt16LE(2,22);ifd.writeUInt32LE(0,26);ifd.writeUInt32LE(150,30);ifd.writeUInt32LE(1,34);
  const tiff=Buffer.concat([Buffer.from([0x49,0x49,42,0,8,0,0,0]),ifd]);const app1=Buffer.concat([Buffer.from('Exif\0\0','latin1'),tiff]);const seg=Buffer.alloc(4);seg[0]=0xFF;seg[1]=0xE1;seg.writeUInt16BE(app1.length+2,2);
  const exif=Buffer.concat([Buffer.from([0xFF,0xD8]),seg,app1,Buffer.from([0xFF,0xD9])]);
  const d=[imageDpi(new Uint8Array(PNG300)),imageDpi(new Uint8Array(jfif(1))),imageDpi(new Uint8Array(jfif(2))),imageDpi(new Uint8Array(exif)),imageDpi(new Uint8Array(jfif(0))),imageDpi(new Uint8Array(TILE))];
  // échelle : page A3 de 6 000 px à 1/200 → 84 m ; image de 600 px (fichier d'origine 1 200 px) à 300 dpi, 1/100 → 1200/300 × 25,4 × 100 / 1000 = 10,16 m
  const pP={kind:'image',image:{pw:6000,ph:4243},pageW_mm:420,transform:{tx:5,ty:7,rot:20,k:0.02}};const kP=planScaleK(pP,200);const pI={kind:'image',image:{pw:600,ph:400},srcW:1200,dpi:300,transform:{tx:0,ty:0,rot:0,k:1}};const kI=planScaleK(pI,100);
  const t2=tfScaleAbout(pP.transform,[3000,2121.5],kP);const c0=tfApply(pP.transform,[3000,2121.5]),c1=tfApply(t2,[3000,2121.5]);
  // géoréférencement par adresse : l'adresse au point (cx, cy) ; DXF CC47 → repère du tracé (Lambert 93) par similitude 2 points : écart < 1 cm sur 1 km
  const g=geoNorthUp(ADDR.lon,ADDR.lat,120,-35);const back=planToLonLat(g,[120,-35]);
  const o={x0:Math.floor(CC47[0]/100)*100-30,y1:Math.ceil(CC47[1]/100)*100+30};const go=geoOfOrigin(o,[50,50]);const Pl=[CC47[0]-o.x0,o.y1-CC47[1]];const w=geoMapPoint(go,g,Pl),wx=lonLatToPlan(g,LL_P[0],LL_P[1]);
  // pont : bg.geo → site.geo ; sans géoréférencement du traceur, l'ancien site.geo (calage de l'appli) reste
  const lines=[{id:'L1',name:'L',dn:100,pts:[[0,0],[10,0]],specials:[],parent:null,plan:null}];const built={L1:{A:{pieces:[],welds:[],notes:[],length:10},R:{pieces:[],welds:[],notes:[],length:10},e:0.5}};const old={crs:'EPSG:2154',aff:{a:1,b:0,c:0,d:-1,e:1,f:2}};
  const s1=siteFromTraceur({id:'t1',name:'t',supplier:'AXIOM',serie:1,lines,built,rules:{},bg:{plans:[],geo:{...g,src:'traceur'}},prev:{geo:old}}).site;const s2=siteFromTraceur({id:'t2',name:'t',supplier:'AXIOM',serie:1,lines,built,rules:{},bg:null,prev:{geo:old}}).site;
  const s3=siteFromTraceur({id:'t3',name:'t',supplier:'AXIOM',serie:1,lines,built,rules:{},bg:{plans:[{id:'p1',kind:'image',name:'x.pdf',transform:{tx:0,ty:0,rot:0,k:.01},image:{src:'data:image/jpeg;base64,AA',pw:100,ph:70},from:'pdf',page:2,pages:3,pageW_mm:420,pageH_mm:297,ech:200}]}}).site;
  console.log('0) unités :',JSON.stringify({k:k.map(x=>x.kind||'err'),d,kP,kI,c:[c1[0]-c0[0],c1[1]-c0[1]],back:[back[0]-ADDR.lon,back[1]-ADDR.lat],go:go&&go.crs,ecart:Math.hypot(w[0]-wx[0],w[1]-wx[1]),s1:s1.geo&&s1.geo.src,s2:s2.geo===old,s3:s3.plans[0]}));
  C.c0=k.slice(0,7).map(x=>x.kind).join()==='dxf,pdf,image,image,image,image,image'&&/ODA File Converter/.test(k[7].err)&&/^DWG/.test(k[7].err)&&/PNG ou en PDF/.test(k[8].err)&&/format non lu \(\.txt\)/.test(k[9].err)
    &&d[0]&&d[0].dpi===300&&d[0].src==='PNG'&&d[1]&&d[1].dpi===200&&d[1].src==='JFIF'&&d[2]&&d[2].dpi===508&&d[3]&&d[3].dpi===150&&d[3].src==='EXIF'&&d[4]===null&&d[5]===null
    &&near(kP*6000,84,1e-9)&&near(kI*600,10.16,1e-9)&&near(c1[0],c0[0],1e-9)&&near(c1[1],c0[1],1e-9)&&t2.rot===20&&near(back[0],ADDR.lon,1e-9)&&near(back[1],ADDR.lat,1e-9)&&go&&go.crs==='EPSG:3947'&&Math.hypot(w[0]-wx[0],w[1]-wx[1])<0.01
    &&s1.geo&&s1.geo.src==='traceur'&&s1.geo.aff.e===g.aff.e&&s2.geo===old&&s3.plans[0].from==='pdf'&&s3.plans[0].pageW_mm===420&&s3.plans[0].page===2&&s3.plans[0].ech===200&&paperName(420,297)==='A3 paysage (420 × 297 mm)';}
// ── navigateur
const browser=await chromium.launch({headless:true, executablePath: process.env.CHROMIUM_PATH||undefined});
const ctx=await browser.newContext({viewport:{width:1280,height:900}});
const net={tiles:0,geocode:0,app:0,other:[]};
await ctx.route(/^https?:\/\//,route=>{const u=route.request().url();if(u.startsWith(BASE))return route.fallback();
  if(/data\.geopf\.fr\/wmts/.test(u)){net.tiles++;return route.fulfill({status:200,contentType:'image/png',body:TILE});}
  if(/data\.geopf\.fr\/geocodage|api-adresse\.data\.gouv\.fr/.test(u)){net.geocode++;return route.fulfill({status:200,contentType:'application/json',body:JSON.stringify({type:'FeatureCollection',features:[{type:'Feature',geometry:{type:'Point',coordinates:[ADDR.lon,ADDR.lat]},properties:{label:ADDR.label}}]})});}
  if(/api\.open-meteo\.com/.test(u)){net.app++;return route.fulfill({status:200,contentType:'application/json',body:'{}'});} // appli : météo du chantier (il est maintenant géoréférencé)
  net.other.push(u.slice(0,80));return route.fulfill({status:204,body:''});});
await ctx.routeWebSocket(/./,ws=>{}); // appli : temps réel du serveur, simulé (aucune connexion)
const page=await ctx.newPage();
const logs=[];page.on('pageerror',e=>logs.push('PAGEERROR: '+e.message.slice(0,300)));page.on('console',m=>{if(m.type()==='error')logs.push(m.text().slice(0,200));});
let dialogs=[];page.on('dialog',d=>{dialogs.push(d.message().slice(0,160));d.accept().catch(()=>{});});
const wait=ms=>page.waitForTimeout(ms);
const idbGet=k=>page.evaluate(k=>new Promise(res=>{const q=indexedDB.open('trace-kv');q.onsuccess=()=>{const g=q.result.transaction('kv','readonly').objectStore('kv').get(k);g.onsuccess=()=>res(g.result||null);g.onerror=()=>res(null);};q.onerror=()=>res(null);}),k);
const toScreen=(wx,wy)=>page.evaluate(([x,y])=>{const v=window.MAQ.state.view;const r=document.getElementById('svg').getBoundingClientRect();return [r.left+x*v.k+v.tx,r.top+y*v.k+v.ty];},[wx,wy]);
const clickW=async(wx,wy)=>{const s=await toScreen(wx,wy);await page.mouse.click(s[0],s[1]);await wait(90);};
const until=async(fn,arg,ms=15000)=>{const t0=Date.now();while(Date.now()-t0<ms){const v=await page.evaluate(fn,arg);if(v)return v;await wait(150);}return null;};
await page.goto(BASE+'/traceur.html?pdfjs=/pdfjs/');await wait(600);await page.evaluate(()=>{localStorage.clear();});await page.evaluate(()=>new Promise(r=>{try{const q=indexedDB.deleteDatabase('trace-kv');q.onsuccess=q.onerror=q.onblocked=()=>r();}catch(e){r();}}));
await page.reload();await wait(900);
// ── 1) « ＋ Plan » : formats
let out=await page.evaluate(()=>{const i=document.getElementById('bgAdd');const lab=i.closest('label');return {accept:i.getAttribute('accept'),lab:lab.textContent.trim(),multiple:i.multiple,aer:!!document.getElementById('bAer')};});
const acc=out.accept.split(',');
dialogs=[];await page.setInputFiles('#bgAdd',[{name:'reseau.dwg',mimeType:'application/octet-stream',buffer:Buffer.from('AC1032 fictif')}]);await wait(300);
await page.setInputFiles('#bgAdd',[{name:'scan.tif',mimeType:'image/tiff',buffer:Buffer.from('II*\0fictif')}]);await wait(300);
await page.setInputFiles('#bgAdd',[{name:'notes.txt',mimeType:'text/plain',buffer:Buffer.from('rien')}]);await wait(300);
await page.setInputFiles('#bgAdd',[{name:'abime.pdf',mimeType:'application/pdf',buffer:Buffer.from('%PDF-1.4\nrien de lisible ici\n%%EOF\n')}]);await until(()=>!document.getElementById('prog'),null,8000);await wait(600);
out={...out,dialogs:dialogs.slice(),plans:await page.evaluate(()=>window.MAQ.bg.plans().length)};
console.log('1) ＋ Plan :',JSON.stringify(out));
C.c1=['.dxf','.pdf','.png','.jpg','.jpeg','.webp','.gif','.bmp','image/*'].every(x=>acc.includes(x))&&out.lab==='＋ Plan (DXF, PDF, image)'&&out.multiple&&out.aer&&out.dialogs.length===4&&/abime\.pdf : PDF illisible/.test(out.dialogs[3])&&/reseau\.dwg : DWG : enregistre-le en DXF \(ODA File Converter, gratuit\) ou en PDF/.test(out.dialogs[0])&&/scan\.tif : TIFF : convertis en PNG ou en PDF/.test(out.dialogs[1])&&/notes\.txt : format non lu/.test(out.dialogs[2])&&out.plans===0;
// ── 2) PDF de 2 pages → page 2 seulement
await page.setInputFiles('#bgAdd',[{name:'planches_essai.pdf',mimeType:'application/pdf',buffer:PDF}]);
const modalOk=await until(()=>{const b=document.querySelector('#modalBody [data-t2="pdfOk"]');const t=[...document.querySelectorAll('#modalBody canvas[data-th]')];return b&&document.getElementById('modal').classList.contains('show')&&t.length===2&&(document.querySelector('#modalBody [data-fmt="2"]')||{}).textContent?{n:t.length,fmt:document.querySelector('#modalBody [data-fmt="2"]').textContent,title:document.querySelector('#modalBody h3').textContent}:null;});
await page.uncheck('#modalBody input[data-pg="1"]');await page.check('#modalBody input[data-pg="2"]');await page.click('#modalBody [data-t2="pdfOk"]');
const pdfPlan=await until(()=>{const P=window.MAQ.bg.plans().filter(p=>p.from==='pdf');return P.length?P.map(p=>({id:p.id,name:p.name,kind:p.kind,page:p.page,pages:p.pages,W:p.pageW_mm,H:p.pageH_mm,pw:p.image.pw,ph:p.image.ph,src:p.image.src.slice(0,23)})):null;});
out={modal:modalOk,plans:pdfPlan,tab:await page.evaluate(()=>window.MAQ.state.tab),card:await page.evaluate(()=>{const c=[...document.querySelectorAll('#panel .card[data-act=selPlan]')][0];return c?c.textContent.replace(/\s+/g,' ').slice(0,220):'';})};
console.log('2) PDF :',JSON.stringify(out));
const PID=pdfPlan&&pdfPlan[0].id;
C.c2=!!modalOk&&modalOk.n===2&&/A3 paysage \(420 × 297 mm\)/.test(modalOk.fmt)&&/2 pages/.test(modalOk.title)&&pdfPlan&&pdfPlan.length===1&&pdfPlan[0].kind==='image'&&pdfPlan[0].page===2&&pdfPlan[0].pages===2&&near(pdfPlan[0].W,420,0.05)&&near(pdfPlan[0].H,297,0.05)&&Math.max(pdfPlan[0].pw,pdfPlan[0].ph)===6000&&near(pdfPlan[0].ph/pdfPlan[0].pw,297/420,0.001)&&pdfPlan[0].src==='data:image/jpeg;base64,'&&out.tab==='fond'&&/📄/.test(out.card)&&/PDF p\. 2\/2 · A3 paysage/.test(out.card)&&/1\/N|1\//.test(out.card);
// ── 3) échelle 1/200 par l'onglet Fond (valeurs) : mesure du trait de 100 mm dans l'image rendue
const measure=(id,ypx,dark)=>page.evaluate(async([id,ypx,dark])=>{const M=window.MAQ;const p=M.bg.get(id);const im=new Image();im.src=p.image.src;await im.decode();const c=document.createElement('canvas');c.width=im.naturalWidth;c.height=3;const g=c.getContext('2d');g.drawImage(im,0,-Math.round(ypx)+1);const d=g.getImageData(0,1,c.width,1).data;let x0=-1,x1=-1;for(let x=0;x<c.width;x++){if(d[x*4]<dark){if(x0<0)x0=x;x1=x;}}
  const a=M.bg.toWorld(id,[x0,ypx]),b=M.bg.toWorld(id,[x1+1,ypx]);return {x0,x1,L:Math.hypot(b[0]-a[0],b[1]-a[1])};},[id,ypx,dark]);
const c3b=await page.evaluate(id=>{const M=window.MAQ;const p=M.bg.get(id);return {c:M.bg.toWorld(id,[p.image.pw/2,p.image.ph/2]),rot:p.transform.rot};},PID);
await page.evaluate(id=>{window.MAQ.bg.rotate(id,12);},PID);const c3r=await page.evaluate(id=>{const M=window.MAQ;const p=M.bg.get(id);return {c:M.bg.toWorld(id,[p.image.pw/2,p.image.ph/2]),rot:p.transform.rot};},PID);
await page.fill(`#panel .t2ech[data-plan="${PID}"] [data-t2="echN"]`,'200');await page.dispatchEvent(`#panel .t2ech[data-plan="${PID}"] [data-t2="echN"]`,'input');
const echTxt=await page.evaluate(id=>document.querySelector(`#panel .t2ech[data-plan="${id}"] [data-t2="echTxt"]`).textContent,PID);
await page.click(`#panel .t2ech[data-plan="${PID}"] [data-t2="echGo"]`);await wait(300);
const yLine=await page.evaluate(([id,H,y])=>{const p=window.MAQ.bg.get(id);return (H-y)*p.image.ph/H;},[PID,A3H,LINE.y]);
const m3=await measure(PID,yLine,128);
out=await page.evaluate(([id])=>{const M=window.MAQ;const p=M.bg.get(id);return {k:p.transform.k,rot:p.transform.rot,ech:p.ech,geo:p.geo,c:M.bg.toWorld(id,[p.image.pw/2,p.image.ph/2]),N:M.fond.scaleN(id),row:(document.querySelector(`#panel .t2ech[data-plan="${id}"]`)||{}).textContent||''};},[PID]);
console.log('3) échelle 1/200 :',JSON.stringify({...out,row:out.row.replace(/\s+/g,' ').slice(0,200),m3,echTxt,avant:c3r}));
C.c3=near(m3.L,20,0.2)&&near(out.k,420*200/1000/pdfPlan[0].pw,1e-9)&&near(out.rot,12,1e-9)&&near(out.c[0],c3r.c[0],1e-6)&&near(out.c[1],c3r.c[1],1e-6)&&out.ech===200&&near(out.N,200,1e-6)&&echTxt==='1 cm sur le plan = 2 m'&&/actuellement ≈ 1\/200/.test(out.row)&&/1 cm sur le plan = 2 m/.test(out.row)&&out.geo==='manual';
// ── 4) image PNG à 300 dpi : résolution lue ; 1/100 → 2,54 m pour 1 pouce
await page.setInputFiles('#bgAdd',[{name:'photo_planche.png',mimeType:'image/png',buffer:PNG300}]);
const IID=await until(()=>{const p=window.MAQ.bg.plans().find(x=>x.name==='photo_planche.png');return p?p.id:null;});
const r4=await page.evaluate(id=>{const p=window.MAQ.bg.get(id);const row=document.querySelector(`#panel .t2ech[data-plan="${id}"]`);return {from:p.from,dpi:p.dpi,src:p.dpiSrc,srcW:p.srcW,pw:p.image.pw,dpiField:row&&row.querySelector('[data-t2="echDpi"]').value,txt:row&&row.textContent.replace(/\s+/g,' ')};},IID);
await page.fill(`#panel .t2ech[data-plan="${IID}"] [data-t2="echN"]`,'100');await page.press(`#panel .t2ech[data-plan="${IID}"] [data-t2="echN"]`,'Enter');await wait(300);
const m4=await measure(IID,200,60);
out=await page.evaluate(id=>{const p=window.MAQ.bg.get(id);return {k:p.transform.k,ech:p.ech,W:p.image.pw*p.transform.k};},IID);
console.log('4) image 300 dpi, 1/100 :',JSON.stringify({...r4,txt:(r4.txt||'').slice(0,240),...out,m4}));
C.c4=r4.from==='image'&&r4.dpi===300&&r4.src==='PNG'&&r4.srcW===600&&r4.pw===600&&r4.dpiField==='300'&&/300 dpi lue dans le fichier/.test(r4.txt)&&/photo d'un plan : préfère 📏 2 points/.test(r4.txt)&&near(m4.L,2.54,0.0254)&&near(out.W,600/300*25.4*100/1000,1e-9)&&out.ech===100;
// ── 5) 📍 vue aérienne par adresse (pas encore de géoréférencement → créé, adresse au centre de la vue)
const tiles0=net.tiles;await page.evaluate(()=>window.MAQ.bg.fitAll());await wait(150);
const vc=await page.evaluate(()=>{const v=window.MAQ.state.view;const s=document.getElementById('svg');return [(s.clientWidth/2-v.tx)/v.k,(s.clientHeight/2-v.ty)/v.k];});
await page.click('#bAer');await wait(200);await page.fill('#modalBody [data-t2="aerAddr"]','12 rue Fictive Ville-Test');await page.click('#modalBody [data-t2="aerGo"]');
await until(()=>window.MAQ.fond.geo()&&document.querySelectorAll('#aerial image').length>0);await wait(300);
out=await page.evaluate(([ll])=>{const M=window.MAQ;const g=M.fond.geo();const w=document.getElementById('world');const kids=[...w.children].map(c=>c.id);const imgs=[...document.querySelectorAll('#aerial image')];const v=M.state.view;const s=document.getElementById('svg');
  return {crs:g.crs,aff:g.aff,src:g.src,kids,n:imgs.length,layer:(imgs[0].getAttribute('href').match(/LAYER=([^&]+)/)||[])[1],credit:getComputedStyle(document.getElementById('aerCredit')).display!=='none'?document.getElementById('aerCredit').textContent:'',modal:document.getElementById('modal').classList.contains('show'),btn:document.getElementById('bAer').textContent,
    center:[(s.clientWidth/2-v.tx)/v.k,(s.clientHeight/2-v.ty)/v.k],k:v.k,ls:!!localStorage.getItem('trace:geo:v1')};},[[ADDR.lon,ADDR.lat]]);
const addrW=lonLatToPlan(out,ADDR.lon,ADDR.lat);
console.log('5) vue aérienne :',JSON.stringify({...out,vc,addrW,tilesReq:net.tiles-tiles0,geocode:net.geocode}));
const c5a=out.crs==='EPSG:2154'&&out.aff.a===1&&out.aff.b===0&&out.aff.c===0&&out.aff.d===-1&&out.src==='traceur'&&near(addrW[0],vc[0],1e-6)&&near(addrW[1],vc[1],1e-6)&&near(out.center[0],vc[0],1e-6)&&out.kids.indexOf('aerial')===0&&out.kids.indexOf('bg')===1&&out.n>0&&out.layer==='ORTHOIMAGERY.ORTHOPHOTOS'&&/© IGN/.test(out.credit)&&!out.modal&&/✓/.test(out.btn)&&out.ls&&tiles0===0&&net.tiles>0&&net.geocode===1;
// œil, opacité, couche (onglet Fond)
await page.evaluate(()=>{window.MAQ.state.tab='fond';document.querySelector('.tabs button[data-tab="fond"]').click();});await wait(150);
await page.uncheck('#panel [data-t2="aerShow"]');await wait(150);const n0=await page.evaluate(()=>document.querySelectorAll('#aerial image').length);
await page.check('#panel [data-t2="aerShow"]');await wait(150);const n1=await page.evaluate(()=>document.querySelectorAll('#aerial image').length);
await page.fill('#panel [data-t2="aerOp"]','60');await page.dispatchEvent('#panel [data-t2="aerOp"]','input');
await page.selectOption('#panel [data-t2="aerLayer"]','plan');await wait(200);
const r5=await page.evaluate(()=>({op:document.getElementById('aerial').getAttribute('opacity'),layer:((document.querySelector('#aerial image')||{getAttribute:()=>''}).getAttribute('href').match(/LAYER=([^&]+)/)||[])[1],aer:window.MAQ.fond.aer()}));
await page.selectOption('#panel [data-t2="aerLayer"]','ortho');await wait(150);
console.log('5b) œil / opacité / couche :',JSON.stringify({n0,n1,op:r5.op,layer:r5.layer,show:r5.aer.show,lay:r5.aer.layer}));
C.c5=c5a&&n0===0&&n1>0&&r5.op==='0.6'&&r5.layer==='GEOGRAPHICALGRIDSYSTEMS.PLANIGNV2'&&r5.aer.op===0.6;
// ── 6) deux planches (images fictives) ; deux lignes TRACÉES sur la planche A, une sur la planche B ; ⌖ calage 1 point de « la planche A et ses lignes »
await page.evaluate(async()=>{const M=window.MAQ;const mk=(w,h,col,name)=>{const c=document.createElement('canvas');c.width=w;c.height=h;const g=c.getContext('2d');g.fillStyle=col;g.fillRect(0,0,w,h);g.fillStyle='#333';g.fillRect(20,20,w-40,3);return new Promise(r=>c.toBlob(b=>r(new File([b],name,{type:'image/png'})),'image/png'));};
  await M.bg.addFiles([await mk(400,300,'#ffd9a0','planche_A.png'),await mk(400,300,'#a0d9ff','planche_B.png')]);const P=M.bg.plans();const A=P.find(p=>p.name==='planche_A.png'),B=P.find(p=>p.name==='planche_B.png');
  M.bg.setTransform(A.id,{tx:0,ty:0,rot:0,k:0.1});M.bg.setTransform(B.id,{tx:60,ty:0,rot:0,k:0.1});
  P.filter(p=>p!==A&&p!==B).forEach(p=>M.bg.show(p.id,false)); /* les autres plans masqués : la ligne se rattache au plan VISIBLE sous son départ */
  M.state.view={k:8,tx:40,ty:300};M.setMode('select');M.rebuild();});
await page.evaluate(()=>{document.getElementById('zIn').click();document.getElementById('zOut').click();});await wait(150);
const IDS6=await page.evaluate(()=>{const P=window.MAQ.bg.plans();return {A:P.find(p=>p.name==='planche_A.png').id,B:P.find(p=>p.name==='planche_B.png').id};});
const trace=async pts=>{await page.evaluate(()=>window.MAQ.setMode('trace'));for(const q of pts)await clickW(q[0],q[1]);await page.keyboard.press('Enter');await wait(250);};
await trace([[5,5],[35,5]]);await trace([[5,25],[35,25]]);await trace([[65,10],[85,20]]);
const L6=await page.evaluate(()=>window.MAQ.state.lines.map(l=>({id:l.id,plan:l.plan,pts:l.pts.map(p=>p.slice()),w:(window.MAQ.state.built[l.id].A.welds.length+window.MAQ.state.built[l.id].R.welds.length)})));
await page.evaluate(()=>window.MAQ.setMode('select'));
const tA0=await page.evaluate(id=>({...window.MAQ.bg.get(id).transform}),IDS6.A),tB0=await page.evaluate(id=>({...window.MAQ.bg.get(id).transform}),IDS6.B);
// par l'interface : ⌖ → « un plan et toutes ses lignes » (planche A) → 1 point → sommet (5,5) de la 1re ligne → sa place sur la vue aérienne (25, 12)
await page.click('.tabs button[data-tab="fond"]');await wait(150);await page.click('#panel [data-t2="calOpen"]');await wait(200);
const calModal=await page.evaluate(()=>({txt:document.getElementById('modalBody').textContent.replace(/\s+/g,' ').slice(0,400),opts:[...document.querySelectorAll('#modalBody [data-t2="calPlan"] option')].map(o=>o.textContent)}));
await page.check('#modalBody input[name="t2w"][value="plan"]');await page.selectOption('#modalBody [data-t2="calPlan"]',IDS6.A);await page.check('#modalBody input[name="t2n"][value="1"]');await page.click('#modalBody [data-t2="calGo"]');await wait(150);
const mode6=await page.evaluate(()=>({mode:window.MAQ.state.mode,hint:document.getElementById('hint').textContent,bar:getComputedStyle(document.querySelector('.t2calbar')).display,hl:document.querySelectorAll('#t2cal path').length}));
await clickW(L6[0].pts[0][0]+0.15,L6[0].pts[0][1]-0.1);const hint2=await page.evaluate(()=>document.getElementById('hint').textContent);await clickW(25,12);await wait(400);
out=await page.evaluate(([ids,L6])=>{const M=window.MAQ;const S=M.state;const ln=id=>S.lines.find(l=>l.id===id);const d=(id,i)=>{const a=L6.find(x=>x.id===id).pts[i],b=ln(id).pts[i];return [b[0]-a[0],b[1]-a[1]];};
  return {d1:d(L6[0].id,0),d1b:d(L6[0].id,1),d2:d(L6[1].id,0),d2b:d(L6[1].id,1),d3:d(L6[2].id,0),tA:{...M.bg.get(ids.A).transform},tB:{...M.bg.get(ids.B).transform},geoA:M.bg.get(ids.A).geo,w:S.lines.map(l=>S.built[l.id].A.welds.length+S.built[l.id].R.welds.length),mode:S.mode,p0:ln(L6[0].id).pts[0],bar:getComputedStyle(document.querySelector('.t2calbar')).display,cal:document.querySelectorAll('#t2cal *').length};},[IDS6,L6]);
const dA=[out.tA.tx-tA0.tx,out.tA.ty-tA0.ty];
out.persist=await page.evaluate(()=>{const m=document.querySelector('#panel .t2msg');return m?m.textContent:'';});
console.log('6) calage 1 point planche A + 2 lignes :',JSON.stringify({plans:L6.map(l=>l.plan),ids:IDS6,mode6:{...mode6,hint:mode6.hint.slice(0,90)},hint2:hint2.slice(0,80),calModal:{opts:calModal.opts},...out,dA}));
const c6a=L6[0].plan===IDS6.A&&L6[1].plan===IDS6.A&&L6[2].plan===IDS6.B&&mode6.mode==='calAer'&&/①/.test(mode6.hint)&&/②/.test(hint2)&&mode6.bar!=='none'&&mode6.hl>=3&&calModal.opts.some(o=>/planche_A\.png — 2 lignes/.test(o))
  &&near(out.p0[0],25,0.15)&&near(out.p0[1],12,0.15)&&[out.d1b,out.d2,out.d2b].every(v=>near(v[0],out.d1[0],1e-9)&&near(v[1],out.d1[1],1e-9))&&near(dA[0],out.d1[0],1e-9)&&near(dA[1],out.d1[1],1e-9)&&out.tA.rot===0&&out.tA.k===tA0.k&&out.geoA==='aerien'
  &&out.d3[0]===0&&out.d3[1]===0&&out.tB.tx===tB0.tx&&out.tB.ty===tB0.ty&&out.w.join()===L6.map(l=>l.w).join()&&out.mode==='select'&&out.bar==='none'&&out.cal===0&&/Calé sur la vue aérienne : 2 lignes et 1 plan/.test(out.persist);
// ↶ (Ctrl+Z) : les lignes ET la planche reviennent
await page.mouse.click(5,300);await page.keyboard.press('Control+z');await wait(400);
out=await page.evaluate(([ids,L6])=>{const M=window.MAQ;const S=M.state;return {same:L6.every(x=>JSON.stringify(S.lines.find(l=>l.id===x.id).pts)===JSON.stringify(x.pts)),tA:{...M.bg.get(ids.A).transform},geoA:M.bg.get(ids.A).geo};},[IDS6,L6]);
console.log('6b) ↶ annulé :',JSON.stringify(out));
C.c6=c6a&&out.same&&out.tA.tx===tA0.tx&&out.tA.ty===tA0.ty&&out.geoA!=='aerien';
// 6c) réglage du rattachement (onglet Fond → 🔗 Lignes ↔ plans) : la 3e ligne passe sur la planche A, puis revient sur la B ; ordre des plans (▲)
await page.click('.tabs button[data-tab="fond"]');await wait(150);await page.click('#panel [data-t2="linksOpen"]');await wait(150);
const lk=await page.evaluate(()=>({rows:document.querySelectorAll('#modalBody [data-t2="lnkPlan"]').length,title:document.querySelector('#modalBody h3').textContent}));
await page.selectOption(`#modalBody [data-t2="lnkPlan"][data-line="${L6[2].id}"]`,IDS6.A);await wait(100);const lkA=await page.evaluate(id=>window.MAQ.state.lines.find(l=>l.id===id).plan,L6[2].id);
await page.selectOption(`#modalBody [data-t2="lnkPlan"][data-line="${L6[2].id}"]`,IDS6.B);await wait(100);const lkB=await page.evaluate(id=>window.MAQ.state.lines.find(l=>l.id===id).plan,L6[2].id);await page.click('#modalBody [data-t2="close"]');await wait(100);
const ord0=await page.evaluate(()=>window.MAQ.bg.plans().map(p=>p.id));await page.click(`#panel [data-t2="plDown"][data-plan="${IDS6.B}"]`);await wait(150);const ord1=await page.evaluate(()=>window.MAQ.bg.plans().map(p=>p.id));
await page.click(`#panel [data-t2="plUp"][data-plan="${IDS6.B}"]`);await wait(150);const ord2=await page.evaluate(()=>({ids:window.MAQ.bg.plans().map(p=>p.id),g:[...document.querySelectorAll('#bg g.plan')].map(g=>g.dataset.plan)}));
console.log('6c) rattachement / ordre :',JSON.stringify({lk,lkA,lkB,iB:[ord0.indexOf(IDS6.B),ord1.indexOf(IDS6.B),ord2.ids.indexOf(IDS6.B)]}));
C.c6c=lk.rows===3&&/Lignes ↔ plans/.test(lk.title)&&lkA===IDS6.A&&lkB===IDS6.B&&ord1.indexOf(IDS6.B)===ord0.indexOf(IDS6.B)-1&&ord2.ids.join()===ord0.join()&&ord2.g.join()===ord0.filter(id=>ord2.g.includes(id)).join();
// ── 7) ⌖ calage 2 points de la 3e ligne (seule sur la planche B) : rotation + translation ; la planche B suit
const L3=L6[2];const len3=Math.hypot(L3.pts[1][0]-L3.pts[0][0],L3.pts[1][1]-L3.pts[0][1]);const ang0=Math.atan2(L3.pts[1][1]-L3.pts[0][1],L3.pts[1][0]-L3.pts[0][0])*180/Math.PI;const th=(ang0+25)*Math.PI/180;const Q1=[60,8],Q2=[60+len3*Math.cos(th),8+len3*Math.sin(th)];
await page.click('.tabs button[data-tab="lignes"]');await wait(150);await page.click(`#panel tr[data-act="selLine"][data-line="${L3.id}"]`);await wait(200); // la ligne choisie dans l'onglet Lignes
const sel7=await page.evaluate(()=>window.MAQ.state.sel);
await page.click('.tabs button[data-tab="fond"]');await wait(150);
await page.evaluate(()=>window.MAQ.fond.openCal());await wait(150);const def7=await page.evaluate(()=>(document.querySelector('#modalBody input[name="t2w"]:checked')||{}).value);
await page.check('#modalBody input[name="t2n"][value="2"]');await page.click('#modalBody [data-t2="calGo"]');await wait(150);
await clickW(L3.pts[0][0]+0.1,L3.pts[0][1]+0.1);await clickW(Q1[0],Q1[1]);await clickW(L3.pts[1][0]-0.1,L3.pts[1][1]);await clickW(Q2[0],Q2[1]);await wait(400);
out=await page.evaluate(([id3,idB,idA])=>{const M=window.MAQ;const l=M.state.lines.find(x=>x.id===id3);return {pts:l.pts,tB:{...M.bg.get(idB).transform},tA:{...M.bg.get(idA).transform},mode:M.state.mode};},[L3.id,IDS6.B,IDS6.A]);
const ang=Math.atan2(out.pts[1][1]-out.pts[0][1],out.pts[1][0]-out.pts[0][0])*180/Math.PI;const len3b=Math.hypot(out.pts[1][0]-out.pts[0][0],out.pts[1][1]-out.pts[0][1]);
// la planche B a tourné comme la ligne : le point de la planche sous l'ancien départ de la ligne est sous le nouveau
const chk=await page.evaluate(([idB,t0,p0])=>{const M=window.MAQ;const inv=t=>{const k=1/t.k,r=-t.rot*Math.PI/180;const c=Math.cos(r),s=Math.sin(r);return q=>{const x=q[0]-t.tx,y=q[1]-t.ty;return [k*(c*x-s*y),k*(s*x+c*y)];};};const loc=inv(t0)(p0);return M.bg.toWorld(idB,loc);},[IDS6.B,tB0,L3.pts[0]]);
console.log('7) calage 2 points d\'une ligne :',JSON.stringify({sel:sel7,def:def7,pts:out.pts,ang,ang0,len3,len3b,tB:out.tB,chk,mode:out.mode}));
C.c7=sel7&&sel7.kind==='line'&&sel7.id===L3.id&&def7==='line'&&near(out.pts[0][0]+out.pts[1][0],Q1[0]+Q2[0],0.3)&&near(out.pts[0][1]+out.pts[1][1],Q1[1]+Q2[1],0.3)&&near(ang,ang0+25,0.6)&&near(len3b,len3,1e-9)&&near(out.tB.rot,ang-ang0,1e-6)&&near(out.tB.rot,25,0.6)&&near(chk[0],out.pts[0][0],1e-6)&&near(chk[1],out.pts[0][1],1e-6)&&out.tA.tx===tA0.tx&&out.mode==='select';
// 7b) « un plan et toutes ses lignes » + « ajuster l'échelle » (API) : planche A ×1,1 autour du départ de la 1re ligne ; une ligne D'AVANT (sans plan retenu) posée sur la planche
//     est rattachée au premier calage et suit ; la vanne à PK 10 passe à PK 11 (même place sur le plan) ; ↶ remet tout
{const P1=L6[0].pts[0],P2=L6[0].pts[1];const Q2=[P1[0]+1.1*(P2[0]-P1[0]),P1[1]+1.1*(P2[1]-P1[1])];
  out=await page.evaluate(([idA,l1,P1,P2,Q2])=>{const M=window.MAQ;const S=M.state;const L1=S.lines.find(l=>l.id===l1);L1.specials=[{id:'vt',type:'valve',m:10}];S.lines.push({id:'L9',name:'Ligne d\'avant',dn:80,bar:12,pts:[[10,15],[30,15]],specials:[],parent:null,inv:true});S.seq=10;M.rebuild();
    const had='plan' in S.lines.find(l=>l.id==='L9');const k0=M.bg.get(idA).transform.k;const R=M.fond.cal({what:'plan',plan:idA,scale:true},[[P1,P1],[P2,Q2]]);const L1b=S.lines.find(l=>l.id===l1),L9=S.lines.find(l=>l.id==='L9');
    return {had,plan9:L9.plan,pts9:L9.pts,pts1:L1b.pts,vm:L1b.specials[0].m,k0,k:M.bg.get(idA).transform.k,T:R&&R.T,msg:R&&R.msg};},[IDS6.A,L6[0].id,P1,P2,Q2]);
  const e9=[P1[0]+1.1*(10-P1[0]),P1[1]+1.1*(15-P1[1])];
  await page.mouse.click(5,300);await page.keyboard.press('Control+z');await wait(400);
  const back=await page.evaluate(([idA,l1])=>{const M=window.MAQ;const S=M.state;const L9=S.lines.find(l=>l.id==='L9');const r={k:M.bg.get(idA).transform.k,pts9:L9&&L9.pts,plan9:L9&&L9.plan,vm:S.lines.find(l=>l.id===l1).specials[0].m};
    S.lines=S.lines.filter(l=>l.id!=='L9');S.lines.find(l=>l.id===l1).specials=[];M.rebuild();return r;},[IDS6.A,L6[0].id]);
  console.log('7b) calage avec échelle :',JSON.stringify({...out,e9,back}));
  C.c7b=out.had===false&&out.plan9===IDS6.A&&near(out.pts9[0][0],e9[0],1e-9)&&near(out.pts9[0][1],e9[1],1e-9)&&near(out.pts1[1][0],Q2[0],1e-9)&&near(out.pts1[1][1],Q2[1],1e-9)&&near(out.vm,11,1e-9)&&near(out.k,out.k0*1.1,1e-12)&&near(out.T.k,1.1,1e-9)&&/échelle ×1,1/.test(out.msg)
    &&near(back.k,out.k0,1e-12)&&back.pts9&&back.pts9[0][0]===10&&back.pts9[0][1]===15&&back.plan9===IDS6.A&&back.vm===10;}
// 7b2) plan SANS ligne (la photo à 300 dpi) recalé seul (1 point) → annulable par ↶ / Ctrl+Z aussi
{const t0=await page.evaluate(id=>({...window.MAQ.bg.get(id).transform}),IID);const R=await page.evaluate(id=>{const r=window.MAQ.fond.cal({what:'plan',plan:id},[[[0,0],[3,4]]]);return r&&r.nL;},IID);const t1=await page.evaluate(id=>({...window.MAQ.bg.get(id).transform}),IID);
  await page.mouse.click(5,300);await page.keyboard.press('Control+z');await wait(250);const t2=await page.evaluate(id=>({...window.MAQ.bg.get(id).transform}),IID);
  console.log('7b2) plan seul :',JSON.stringify({nL:R,d:[t1.tx-t0.tx,t1.ty-t0.ty],back:[t2.tx-t0.tx,t2.ty-t0.ty]}));
  C.c7b2=R===0&&near(t1.tx-t0.tx,3,1e-9)&&near(t1.ty-t0.ty,4,1e-9)&&t2.tx===t0.tx&&t2.ty===t0.ty;}
// 7c) ⌖ « tout le tracé » (1 point) : RIEN ne bouge dans le tracé, c'est le géoréférencement qui est recalé (le sommet cliqué tombe, sur la photo, là où était le repère) ; ↶ le remet
{const G0=await page.evaluate(()=>JSON.parse(JSON.stringify(window.MAQ.fond.geo())));const LB=await page.evaluate(()=>JSON.stringify(window.MAQ.state.lines.map(l=>l.pts)));const P=L6[1].pts[0],Q=[P[0]+6.5,P[1]-3.25];
  await page.evaluate(()=>window.MAQ.fond.openCal());await wait(150);await page.check('#modalBody input[name="t2w"][value="all"]');await page.check('#modalBody input[name="t2n"][value="1"]');await page.click('#modalBody [data-t2="calGo"]');await wait(150);
  const s0=await toScreen(P[0],P[1]);await clickW(P[0]+0.1,P[1]+0.1);await clickW(Q[0],Q[1]);await wait(300);const s1=await toScreen(P[0],P[1]);
  out=await page.evaluate(()=>({g:JSON.parse(JSON.stringify(window.MAQ.fond.geo())),L:JSON.stringify(window.MAQ.state.lines.map(l=>l.pts)),mode:window.MAQ.state.mode}));
  const a=planToLonLat(out.g,P),b=planToLonLat(G0,Q),dm=Math.hypot((a[0]-b[0])*75000,(a[1]-b[1])*111320);const qq=await page.evaluate(([G0,Q])=>{const v=window.MAQ.state.view;return [Q[0]*v.k+v.tx,Q[1]*v.k+v.ty];},[G0,Q]);
  await page.mouse.click(5,300);await page.keyboard.press('Control+z');await wait(300);
  const back=await page.evaluate(()=>({g:JSON.parse(JSON.stringify(window.MAQ.fond.geo())),L:JSON.stringify(window.MAQ.state.lines.map(l=>l.pts))}));
  console.log('7c) tout le tracé :',JSON.stringify({aff0:G0.aff,aff:out.g.aff,dm,same:out.L===LB,moved:[s1[0]-s0[0],s1[1]-s0[1]],backSame:JSON.stringify(back.g.aff)===JSON.stringify(G0.aff),backL:back.L===LB}));
  C.c7c=out.L===LB&&dm<0.15&&out.g.aff.e!==G0.aff.e&&out.g.aff.a===1&&out.mode==='select'&&near(s1[0]-s0[0],6.5*(await page.evaluate(()=>window.MAQ.state.view.k)),2)&&JSON.stringify(back.g.aff)===JSON.stringify(G0.aff)&&back.L===LB;}
// ── 8) DXF géoréférencés (Lambert 93, CC47) importés avec la vue aérienne → à leur vraie position, calés entre eux ; DXF sans coordonnées → à côté, à caler
out=await page.evaluate(async([t93,tcc,tloc])=>{const M=window.MAQ;await M.bg.addDxfText(t93,'reseau_L93.dxf');await M.bg.addDxfText(tcc,'reseau_CC47.dxf');await M.bg.addDxfText(tloc,'croquis_local.dxf');const P=M.bg.plans();const f=n=>P.find(p=>p.name===n);
  const a=f('reseau_L93.dxf'),b=f('reseau_CC47.dxf'),c=f('croquis_local.dxf');return {a:{id:a.id,geo:a.geo,origin:a.origin,t:a.transform},b:{id:b.id,geo:b.geo,origin:b.origin,t:b.transform},c:{geo:c.geo},btn:document.querySelectorAll('#panel [data-t2="dxfTrue"]').length};},[dxfText(L93[0],L93[1]),dxfText(CC47[0],CC47[1]),dxfText(10,10,'CROQUIS')]);
{const g=await page.evaluate(()=>window.MAQ.fond.geo());const tw=(o,t,X,Y)=>tfApply(t,[X-o.x0,o.y1-Y]);const wa=tw(out.a.origin,out.a.t,L93[0],L93[1]),wb=tw(out.b.origin,out.b.t,CC47[0],CC47[1]);const wt=lonLatToPlan(g,LL_P[0],LL_P[1]);
  console.log('8) DXF géoréférencés :',JSON.stringify({a:{geo:out.a.geo,t:out.a.t},b:{geo:out.b.geo,rot:R4(out.b.t.rot),k:R4(out.b.t.k)},c:out.c,wa,wb,wt,ab:Math.hypot(wa[0]-wb[0],wa[1]-wb[1]),btn:out.btn}));
  // DXF déplacé à la main → « 📍 vraie position » (onglet Fond) le remet à sa place
  await page.evaluate(id=>{window.MAQ.bg.move(id,50,20);},out.a.id);await page.click('.tabs button[data-tab="fond"]');await wait(150);
  const btn=await page.evaluate(id=>!!document.querySelector(`#panel [data-t2="dxfTrue"][data-plan="${id}"]`),out.a.id);await page.click(`#panel [data-t2="dxfTrue"][data-plan="${out.a.id}"]`);await wait(250);
  const back=await page.evaluate(id=>{const p=window.MAQ.bg.get(id);return {t:{...p.transform},geo:p.geo,btn:!!document.querySelector(`#panel [data-t2="dxfTrue"][data-plan="${id}"]`)};},out.a.id);const wa2=tw(out.a.origin,back.t,L93[0],L93[1]);
  console.log('8b) 📍 vraie position :',JSON.stringify({btn,back,wa2}));
  C.c8b=btn&&back.geo==='coords'&&!back.btn&&Math.hypot(wa2[0]-wt[0],wa2[1]-wt[1])<0.02;
  C.c8=out.a.geo==='coords'&&out.b.geo==='coords'&&Math.hypot(wa[0]-wt[0],wa[1]-wt[1])<0.02&&Math.hypot(wb[0]-wt[0],wb[1]-wt[1])<0.02&&Math.hypot(wa[0]-wb[0],wa[1]-wb[1])<0.02&&Math.abs(out.b.t.rot)>0.005&&Math.abs(out.b.t.k-1)>1e-4&&out.c.geo==='manual'&&out.btn===0;}
// ── 9) 💾 Enregistrer → site.geo ; appli : chantier au bon endroit ; traceur rouvert : vue aérienne retrouvée
const GEO=await page.evaluate(()=>JSON.parse(JSON.stringify(window.MAQ.fond.geo())));
await page.click('#bSave');await wait(250);await page.fill('#svName','Essai vue aérienne');await page.click('#svOk');await wait(1500);
const SID=await page.evaluate(()=>window.MAQ.state.siteRef&&window.MAQ.state.siteRef.id);const site=await idbGet('trace:handoff:'+SID);
out={geo:site&&site.geo,plans:site&&site.plans.filter(p=>p.from).map(p=>[p.from,p.page,p.pageW_mm,p.dpi,p.ech]),lplan:site&&site.traceur.lines.map(l=>l.plan),aer:site&&site.plans.filter(p=>p.geo==='aerien').length};
console.log('9) chantier enregistré :',JSON.stringify(out));
const c9a=!!site&&out.geo&&out.geo.crs===GEO.crs&&JSON.stringify(out.geo.aff)===JSON.stringify(GEO.aff)&&out.geo.src==='traceur'&&out.geo.addr===ADDR.label&&out.plans.some(p=>p[0]==='pdf'&&p[1]===2&&near(p[2],420,0.05)&&p[4]===200)&&out.plans.some(p=>p[0]==='image'&&p[3]===300&&p[4]===100)&&out.lplan.filter(x=>x===IDS6.A).length===2&&out.lplan.includes(IDS6.B)&&out.aer>=1;
// centre du réseau (comme l'appli : médiane des centres de ligne) → lon / lat attendus de l'épingle
const ctr=(()=>{const cs=site.lines.map(L=>{const xs=L.axis.map(p=>p[0]),ys=L.axis.map(p=>p[1]);return [(Math.min(...xs)+Math.max(...xs))/2,(Math.min(...ys)+Math.max(...ys))/2];});const med=a=>{const s=[...a].sort((p,q)=>p-q);return s[Math.floor(s.length/2)];};return [med(cs.map(c=>c[0])),med(cs.map(c=>c[1]))];})();
const llExp=planToLonLat(GEO,ctr);
await page.click('#svGo');await wait(2000);{const s=await page.$('#loginSkip');if(s&&await s.isVisible())await s.click();await wait(700);}
try{await page.selectOption('#roleSel','ethan');}catch(e){}await wait(400);
out=await page.evaluate(id=>{const T=window.TRACE;const g=T.siteGeo();return {site:T.net&&T.net.id,geo:g&&{crs:g.crs,auto:g.auto,label:g.label},ll:T.rebase.homeLL(id)};},SID);
const dPin=out.ll?Math.hypot((out.ll[0]-llExp[0])*111320*Math.cos(llExp[1]*Math.PI/180),(out.ll[1]-llExp[1])*111320):1e9;const dAddr=out.ll?Math.hypot((out.ll[0]-ADDR.lon)*75000,(out.ll[1]-ADDR.lat)*111320):1e9;
console.log('9b) appli :',JSON.stringify({...out,llExp,dPin,dAddr}));
const c9b=out.site===SID&&out.geo&&out.geo.crs==='EPSG:2154'&&out.geo.auto===false&&dPin<0.5&&dAddr<400;
// traceur rouvert sur le chantier, mémoire locale du géoréférencement effacée : il vient du chantier, vue aérienne affichée
await page.evaluate(()=>{Object.keys(localStorage).filter(k=>k.startsWith('trace:geo:v1')).forEach(k=>localStorage.removeItem(k));});
await page.goto(BASE+'/traceur.html?site='+SID);await wait(1600);
out=await page.evaluate(()=>{const F=window.MAQ.fond;const P=window.MAQ.bg.plans();const pdf=P.find(p=>p.from==='pdf'),img=P.find(p=>p.name==='photo_planche.png');return {geo:F.geo(),show:F.aer().show,tiles:F.tiles(),lines:window.MAQ.state.lines.map(l=>l.plan),pdf:pdf&&[pdf.page,pdf.pageW_mm,pdf.pageH_mm,pdf.ech,F.scaleN(pdf.id)],img:img&&[img.dpi,img.dpiSrc,img.srcW,img.ech]};});
console.log('9c) traceur rouvert :',JSON.stringify({crs:out.geo&&out.geo.crs,aff:out.geo&&out.geo.aff,show:out.show,tiles:out.tiles,lines:out.lines,pdf:out.pdf,img:out.img}));
C.c9=c9a&&c9b&&out.geo&&JSON.stringify(out.geo.aff)===JSON.stringify(GEO.aff)&&out.show===true&&out.tiles>0&&out.lines.filter(x=>x===IDS6.A).length===2&&out.pdf&&out.pdf[0]===2&&near(out.pdf[1],420,0.05)&&near(out.pdf[2],297,0.05)&&out.pdf[3]===200&&near(out.pdf[4],200,1e-6)&&out.img&&out.img[0]===300&&out.img[1]==='PNG'&&out.img[2]===600&&out.img[3]===100;
// 9d) chantier rouvert (tracé marché figé au 1er enregistrement) : la planche A et ses 2 lignes recalées → le tracé marché de ces lignes suit (pas d'écart au marché) ; ↶ remet tout
out=await page.evaluate(([idA])=>{const M=window.MAQ;const S=M.state;const mk=()=>JSON.stringify((S.siteRef.marche.lines||[]).map(x=>[x.id,x.axis]));const m0=mk();const L0=JSON.stringify(S.lines.map(l=>l.pts));
  const ids=S.lines.filter(l=>l.plan===idA).map(l=>l.id);const R=M.fond.cal({what:'plan',plan:idA},[[S.lines.find(l=>l.id===ids[0]).pts[0],[S.lines.find(l=>l.id===ids[0]).pts[0][0]+4,S.lines.find(l=>l.id===ids[0]).pts[0][1]+2]]]);
  const mv=S.siteRef.marche.lines.map(x=>{const l=S.lines.find(y=>y.id===x.id);return [x.id,x.axis[0][0]-l.pts[0][0],x.axis[0][1]-l.pts[0][1]];});const ecart=document.querySelectorAll('#net path[stroke="#ffe08a"]').length;
  return {ids,n:R&&R.nL,mv,ecart,m0,L0,changed:mk()!==m0};},[IDS6.A]);
await page.mouse.click(5,300);await page.keyboard.press('Control+z');await wait(400);
const back9=await page.evaluate(()=>{const S=window.MAQ.state;return {m:JSON.stringify((S.siteRef.marche.lines||[]).map(x=>[x.id,x.axis])),L:JSON.stringify(S.lines.map(l=>l.pts))};});
console.log('9d) chantier, tracé marché qui suit :',JSON.stringify({ids:out.ids,n:out.n,mv:out.mv,ecart:out.ecart,changed:out.changed,backM:back9.m===out.m0,backL:back9.L===out.L0}));
C.c9d=out.ids.length===2&&out.n===2&&out.changed&&out.mv.every(x=>near(x[1],0,1e-6)&&near(x[2],0,1e-6))&&out.ecart===0&&back9.m===out.m0&&back9.L===out.L0;
// ── 10) hors connexion : la recherche d'adresse le dit, rien ne casse ; puis téléphone 390 px
await ctx.setOffline(true);const g0=net.geocode;
await page.click('#bAer');await wait(200);await page.fill('#modalBody [data-t2="aerAddr"]','rue Fictive Ville-Test');await page.click('#modalBody [data-t2="aerGo"]');await wait(500);
out=await page.evaluate(()=>({msg:document.querySelector('#modalBody .t2msg').textContent,modal:document.getElementById('modal').classList.contains('show'),tiles:document.querySelectorAll('#aerial image').length,credit:document.getElementById('aerCredit').textContent,geo:!!window.MAQ.fond.geo()}));
await page.click('#modalBody [data-t2="close"]');await ctx.setOffline(false);
console.log('10) hors connexion :',JSON.stringify(out));
const c10a=/Pas de réseau/.test(out.msg)&&out.modal&&out.tiles>0&&/hors connexion/.test(out.credit)&&out.geo&&net.geocode===g0;
const ctxP=await browser.newContext({viewport:{width:390,height:844},deviceScaleFactor:2,isMobile:true,hasTouch:true});
await ctxP.route(/^https?:\/\//,route=>{const u=route.request().url();if(u.startsWith(BASE))return route.fallback();if(/data\.geopf\.fr\/wmts/.test(u))return route.fulfill({status:200,contentType:'image/png',body:TILE});if(/geocodage|api-adresse/.test(u))return route.fulfill({status:200,contentType:'application/json',body:JSON.stringify({features:[{geometry:{coordinates:[ADDR.lon,ADDR.lat]},properties:{label:ADDR.label}}]})});return route.fulfill({status:204,body:''});});
const pg=await ctxP.newPage();pg.on('pageerror',e=>logs.push('PAGEERROR (tél.): '+e.message.slice(0,300)));pg.on('console',m=>{if(m.type()==='error')logs.push('(tél.) '+m.text().slice(0,200));});pg.on('dialog',d=>d.accept().catch(()=>{}));
await pg.goto(BASE+'/traceur.html?pdfjs=/pdfjs/');await pg.waitForTimeout(800);
const phone=[];const ph=async lab=>phone.push({lab,...await pg.evaluate(()=>{const vis=el=>el&&el.offsetParent!==null&&getComputedStyle(el).display!=='none';const bs=[...document.querySelectorAll('#bAer,#bgEch,#modalBody .btn,.t2calbar .btn')].filter(vis);return {sw:document.documentElement.scrollWidth,mw:Math.round((document.getElementById('modalBody').getBoundingClientRect()||{}).right||0),minH:bs.length?Math.min(...bs.map(b=>Math.round(b.getBoundingClientRect().height))):0,nb:bs.length};})});
await ph('bandeau');await pg.tap('#bAer');await pg.waitForTimeout(200);await ph('fenêtre adresse');
await pg.fill('#modalBody [data-t2="aerAddr"]','12 rue Fictive');await pg.tap('#modalBody [data-t2="aerGo"]');await pg.waitForTimeout(700);
await pg.evaluate(async()=>{const S=window.MAQ.state;S.lines=[{id:'L1',name:'Ligne essai',dn:100,bar:12,pts:[[0,0],[30,0]],specials:[],parent:null}];S.seq=2;window.MAQ.rebuild();
  const c=document.createElement('canvas');c.width=120;c.height=90;const f=await new Promise(r=>c.toBlob(b=>r(new File([b],'planche_tel.png',{type:'image/png'})),'image/png'));await window.MAQ.bg.addFiles([f]);}); /* un plan : la barre d'outils du fond apparaît (elle passe à la ligne) */
await pg.waitForTimeout(200);await ph('bandeau avec un plan');await pg.tap('#bgEch');await pg.waitForTimeout(200);await ph('fenêtre 1/N');await pg.tap('#modalBody [data-t2="close"]');await pg.waitForTimeout(150);
await pg.tap('#bAer');await pg.waitForTimeout(200);await ph('fenêtre géoréférencée');await pg.tap('#modalBody [data-t2="calOpen"]');await pg.waitForTimeout(200);await ph('fenêtre calage');
await pg.check('#modalBody input[name="t2w"][value="all"]');await pg.tap('#modalBody [data-t2="calGo"]');await pg.waitForTimeout(200);await ph('calage en cours');
await pg.tap('.t2calbar .btn');await pg.waitForTimeout(150);const pm=await pg.evaluate(()=>({mode:window.MAQ.state.mode,tiles:window.MAQ.fond.tiles(),px:window.MAQ.fond.pdfMaxSide()}));
console.log('10b) téléphone :',JSON.stringify({phone,pm}));
C.c10=c10a&&phone.length===7&&phone.every(x=>x.sw<=390&&x.mw<=390&&x.minH>=34&&x.nb>=1)&&pm.mode==='select'&&pm.tiles>0&&pm.px===4000;
await ctxP.close();
console.log('réseau extérieur non prévu :',JSON.stringify(net.other));
C.c11=logs.length===0&&net.other.length===0;
const bad=Object.entries(C).filter(([k,v])=>!v).map(([k])=>k);
console.log(logs);await browser.close();
console.log(bad.length?'RESULTAT: ECHEC '+bad.join(' '):'RESULTAT: TOUT VERT');
