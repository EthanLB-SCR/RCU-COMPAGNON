import SITES from './sites.json';
import DB from './db.json';
import {createPieceEngine} from './pieces.js';
import CATALOGUE from './catalogue.json';
import {parseDXF,parseDXFFile,analyze,buildSite,buildSiteJBTP,drawingOf,buildDrawing,previewSVG,drawingSVG,drawingBBoxes,decimateDrawing} from './dxfimport.js';
import {sync} from './sync.js';
import {kv} from './kv.js';
import {geoOfSite,planToLonLat,lonLatToPlan,tilesFor,ignTileURL,IGN_LAYERS,distLL,fmtDist,crsName,similarityFromPairs,geocode,CRS} from './geo.js';
import {parseBL,stockLabel,stockKey,matchKey,zoneAgg,globalAgg,remainByMatch,zoneStatusOf,dnOfOd,isPU,K_LABEL as STK_LABEL} from './stock.js';
import {buildHydro,areaDN,needsFlow,HYDRO_DEFAULTS,PREST_LABEL,CAL_OPS} from './hydro.js';

/* ============================================================
   TRACÉ v0.3 — plan d'ensemble + calque tubes/fils + bouclage
   Fond : plan EXE SADE bd de Doulon (extrait), nœuds N482…N522 lus dans le PDF
   (texte vectoriel : X/Y Lambert 2) et recalés sur le ruban RCU du dessin.
   Données de chantier fictives, en mémoire.
   ============================================================ */
let NET = null; // site courant
const $=(s,el=document)=>el.querySelector(s), $$=(s,el=document)=>[...el.querySelectorAll(s)];
const esc=s=>String(s??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const fmt=n=>Number(n).toLocaleString('fr-FR',{maximumFractionDigits:1});
const pad3=n=>String(n).padStart(3,'0');
const STATUS={a_souder:{label:'À souder',color:'#898781',glyph:''},soudee:{label:'Soudée',color:'#eb6834',glyph:'S'},controlee:{label:'Contrôlée',color:'#2a78d6',glyph:'✓'},manchonnee:{label:'Manchonnée',color:'#0ca30c',glyph:'M'},a_reprendre:{label:'À reprendre',color:'#d03b3b',glyph:'!'}};
const ORDER=['a_souder','soudee','controlee','manchonnee','a_reprendre'];
const WIRE={E:{label:'fil étamé (alarme)',short:'étamé',color:'#dfe4ea',clock:300},N:{label:'fil nu (retour)',short:'nu',color:'#e2843a',clock:60}};
// position des fils selon le fournisseur (base fournisseurs) : Nordic classique 10 h / 2 h ; LOGSTOR au sommet (± 3-20 cm de 12 h)
const WIRE_POS={LOGSTOR:{E:335,N:25,label:'LOGSTOR : fils au sommet, ± 3-20 cm de 12 h (étamé côté gauche)'},RENALIA:{E:300,N:60,label:'Nordic (ZPU / Renalia) : étamé 10 h, nu 2 h'},AXIOM:{E:300,N:60,label:'Nordic (Axiom PI) : étamé 10 h, nu 2 h'},INPAL:{E:300,N:60,label:'Nordic (Inpal cuivre) : étamé 10 h, nu 2 h'},DEFAULT:{E:300,N:60,label:'Nordic : étamé 10 h, nu 2 h'}};
const wirePos=()=>WIRE_POS[(NET&&NET.supplier)||'DEFAULT']||WIRE_POS.DEFAULT;
const USERS=[{id:'karim',name:'Karim B.',role:'soudeur',detail:'Soudeur · QS 141/111'},{id:'julien',name:'Julien R.',role:'manchonneur',detail:'Manchonneur'},{id:'ethan',name:'Ethan L.',role:'chef',detail:'Chef de chantier'},{id:'sophie',name:'Sophie M.',role:'bureau',detail:'Bureau'}];
const ROLE_LABEL={soudeur:'Soudeur',manchonneur:'Manchonneur',chef:'Chef de chantier',bureau:'Bureau'};
const PROCEDES=[['tig','TIG'],['cellu','Cellulosique']]; // simplifié (Ethan 25/08) : sur le terrain c'est l'un ou l'autre
const MANCHONS=[['thermo','Manchon thermorétractable'],['electro','Manchon électrosoudable']];
const rad=a=>a*Math.PI/180;


/* ---------- photos de démo ---------- */
function makePhoto(label,kind){const c=document.createElement('canvas');c.width=480;c.height=360;const g=c.getContext('2d');const gr=g.createLinearGradient(0,0,0,360);gr.addColorStop(0,'#8d857a');gr.addColorStop(1,'#5b544b');g.fillStyle=gr;g.fillRect(0,0,480,360);g.fillStyle='#b8a98a';g.fillRect(0,250,480,110);g.fillStyle='#1e1e1e';g.fillRect(0,120,480,120);
  if(kind==='manchon'){g.fillStyle='#111';g.fillRect(150,108,180,144);}else if(kind==='fils'){g.fillStyle='#e9d36b';g.fillRect(200,120,80,120);g.strokeStyle='#dfe4ea';g.lineWidth=3;g.beginPath();g.moveTo(228,140);g.lineTo(150,90);g.stroke();g.strokeStyle='#e2843a';g.beginPath();g.moveTo(252,140);g.lineTo(330,90);g.stroke();}else{g.fillStyle='#9a9a9a';g.fillRect(120,132,240,96);g.fillStyle='#c9c1b0';g.fillRect(232,132,16,96);}
  g.fillStyle='rgba(0,0,0,.55)';g.fillRect(0,320,480,40);g.fillStyle='#fff';g.font='600 18px system-ui,sans-serif';g.fillText(label,12,346);return c.toDataURL('image/jpeg',.7);}

/* ---------- état ---------- */
const state={siteId:null,userId:'karim',tool:false,toolLine:null,toolCond:null,remoteLS:{},cloudUser:null,tab:'plan',filter:'all',listMode:false,tracing:false,tracePts:[],sheetId:null,sel:null,view:{k:1,tx:0,ty:0},sheetMode:'view',pendingPhotos:[],sw:{},conn:{},err:'',formVals:{},locate:{line:'R1',cond:'A',wire:'E',d:61},nextWeld:1,sheets:{},lines:{}};

// couches d'affichage du plan (cases 👁) : ce qu'on montre ou non pour épurer une zone — mémorisé sur l'appareil
const SHOW_KEYS=[['pieces','Noms des pièces (P7, C5, T2…)'],['cotes','Longueurs et angles'],['soud','Pastilles de soudure (statut)'],['nums','N° de soudure'],['manch','Manchons posés'],['fils','Fils E / N (au zoom)'],['fond','Fond de plan (DXF / image)'],['couleurs','Fond en couleurs (celles du DWG)'],['textes','Textes du fond'],['notes','Annotations']];
const SHOW_DEF=Object.assign(Object.fromEntries(SHOW_KEYS.map(([k])=>[k,true])),{carte:'none',cadastre:false}); // carte : none | ortho | plan (fond IGN sous le plan, si le chantier est géoréférencé)
function loadShow(){let o={};try{o=JSON.parse(localStorage.getItem('trace:show')||'{}')||{};}catch(e){}return Object.assign({},SHOW_DEF,o);}
function saveShow(){try{localStorage.setItem('trace:show',JSON.stringify(state.show));}catch(e){}}
state.show=loadShow();
function renderDisp(){const d=$('#disp');if(!d)return;const s=state.show;const g=siteGeo();
  const canCal=role()==='chef'||role()==='bureau';
  const mapUI=g?`<b style="margin-top:8px">Carte (IGN)</b><div class="maprow">${[['none','Aucune'],['ortho','Photo aérienne'],['plan','Plan IGN']].map(([v,l])=>`<button class="btn sm ${(s.carte||'none')===v?'on':''}" data-carte="${v}">${l}</button>`).join('')}</div><label class="${s.cadastre?'':'off'}"><input type="checkbox" data-k="cadastre" ${s.cadastre?'checked':''}> Cadastre (parcelles)</label><div class="maphint">Plan géoréférencé : ${esc(g.label)}</div>${canCal?`<div class="row" style="margin-top:2px"><button class="btn sm" data-cal="1">📍 ${g.auto?'Caler à la main':'Recaler sur la carte'}</button>${g.auto?'':'<button class="btn sm" data-cal="del" title="revenir au calage automatique s\'il existe">Oublier le calage</button>'}</div>`:''}`
    :`<b style="margin-top:8px">Carte (IGN)</b><div class="maphint">Ce plan n'est pas géoréférencé (pas de DXF en Lambert).</div>${canCal?`<div class="row" style="margin-top:2px"><button class="btn sm primary" data-cal="1">📍 Caler sur la carte</button></div>`:`<div class="maphint">Le chef peut le caler sur la carte (2 repères).</div>`}`;
  d.innerHTML=`<b>Affichage</b>`+SHOW_KEYS.map(([k,l])=>`<label class="${s[k]?'':'off'}"><input type="checkbox" data-k="${k}" ${s[k]?'checked':''} ${k==='nums'&&!s.soud?'disabled':''}> ${l}</label>`).join('')+mapUI+`<div class="row"><button class="btn sm" data-all="1">Tout</button><button class="btn sm" data-all="0">Épuré</button></div>`;}
function toggleDisp(force){const d=$('#disp');const on=force===undefined?!d.classList.contains('show'):force;d.classList.toggle('show',on);const b=$('.zoomctl [data-z=eye]');if(b)b.classList.toggle('on',on);if(on)renderDisp();}
const me=()=>(state.profile&&state.userId==='__me')?{id:state.profile.id,name:state.profile.name||state.profile.email||'moi',role:state.profile.role||'soudeur',detail:''}:(USERS.find(u=>u.id===state.userId)||USERS[0]), role=()=>me().role;

/* ---------- géométrie ---------- */
function polyLen(pts){let L=0;for(let i=1;i<pts.length;i++)L+=Math.hypot(pts[i].x-pts[i-1].x,pts[i].y-pts[i-1].y);return L;}
function ptAt(line,m){const pts=line.pts,ppm=line.ppm;let d=m*ppm;for(let i=1;i<pts.length;i++){const a=pts[i-1],b=pts[i];const L=Math.hypot(b.x-a.x,b.y-a.y);if(d<=L||i===pts.length-1){const t=Math.max(0,Math.min(1,L?d/L:0));return {x:a.x+(b.x-a.x)*t,y:a.y+(b.y-a.y)*t,tx:(b.x-a.x)/(L||1),ty:(b.y-a.y)/(L||1)};}d-=L;}return {x:pts[0].x,y:pts[0].y,tx:1,ty:0};}
function subPath(line,m0,m1){const pts=line.pts,ppm=line.ppm;const out=[];const a=ptAt(line,m0);out.push({x:a.x,y:a.y});let d=0;for(let i=1;i<pts.length-1;i++){d+=Math.hypot(pts[i].x-pts[i-1].x,pts[i].y-pts[i-1].y);const dm=d/ppm;if(dm>m0&&dm<m1)out.push({x:pts[i].x,y:pts[i].y});}const b=ptAt(line,m1);out.push({x:b.x,y:b.y});return out;}
function turnAngles(line){const pts=line.pts,ppm=line.ppm;const out=[];let d=0;for(let i=1;i<pts.length-1;i++){d+=Math.hypot(pts[i].x-pts[i-1].x,pts[i].y-pts[i-1].y);const a1=Math.atan2(pts[i].y-pts[i-1].y,pts[i].x-pts[i-1].x),a2=Math.atan2(pts[i+1].y-pts[i].y,pts[i+1].x-pts[i].x);let da=(a2-a1)*180/Math.PI;while(da>180)da-=360;while(da<-180)da+=360;out.push({m:d/ppm,ang:da});}return out;}
// décalage d'une polyligne (off en unités monde, >0 = côté aller)
function offsetPoly(pts,off){if(!off)return pts;const n=pts.length;const out=[];for(let i=0;i<n;i++){const p=pts[i];let tx=0,ty=0;if(i>0){tx+=p.x-pts[i-1].x;ty+=p.y-pts[i-1].y;}if(i<n-1){tx+=pts[i+1].x-p.x;ty+=pts[i+1].y-p.y;}const L=Math.hypot(tx,ty)||1;tx/=L;ty/=L;let nx=ty,ny=-tx;let sc=1;if(i>0&&i<n-1){const ax=p.x-pts[i-1].x,ay=p.y-pts[i-1].y,La=Math.hypot(ax,ay)||1;const na={x:ay/La,y:-ax/La};const dot=na.x*nx+na.y*ny;sc=1/Math.max(.35,dot);}out.push({x:p.x+nx*off*sc,y:p.y+ny*off*sc});}return out;}
const pathD=pts=>pts.map((p,i)=>(i?'L':'M')+p.x.toFixed(2)+' '+p.y.toFixed(2)).join(' ');
function axisSub(pl,m0,m1){ // portion [m0,m1] (m) d'une polyligne d'axe
  const L=polyLen(pl);m0=Math.max(0,Math.min(L,m0));m1=Math.max(m0,Math.min(L,m1));const out=[];let d=0;const at=m=>{let dd=0;for(let i=1;i<pl.length;i++){const a=pl[i-1],b=pl[i];const s=Math.hypot(b.x-a.x,b.y-a.y);if(dd+s>=m||i===pl.length-1){const t=s?Math.max(0,Math.min(1,(m-dd)/s)):0;return {x:a.x+(b.x-a.x)*t,y:a.y+(b.y-a.y)*t};}dd+=s;}return pl[pl.length-1];};
  out.push(at(m0));for(let i=1;i<pl.length-1;i++){d+=Math.hypot(pl[i].x-pl[i-1].x,pl[i].y-pl[i-1].y);if(d>m0&&d<m1)out.push(pl[i]);}out.push(at(m1));return out;}
function elBBox(e){let x0=1e9,y0=1e9,x1=-1e9,y1=-1e9;e.axis.forEach(pl=>pl.forEach(p=>{x0=Math.min(x0,p.x);y0=Math.min(y0,p.y);x1=Math.max(x1,p.x);y1=Math.max(y1,p.y);}));e.bbox=[x0,y0,x1,y1];}
function elMid(e){const pl=e.axis[0];const L=polyLen(pl)/2;let d=0;for(let i=1;i<pl.length;i++){const a=pl[i-1],b=pl[i];const s=Math.hypot(b.x-a.x,b.y-a.y);if(d+s>=L){const t=s?(L-d)/s:0;return {x:a.x+(b.x-a.x)*t,y:a.y+(b.y-a.y)*t,tx:(b.x-a.x)/(s||1),ty:(b.y-a.y)/(s||1)};}d+=s;}const p=pl[pl.length-1];return {x:p.x,y:p.y,tx:1,ty:0};}
function jointPos(line,i,c){const els=(c&&line.cond&&line.cond[c]&&line.cond[c].els[0]&&line.cond[c].els[0].ownAxis)?line.cond[c].els:line.els;const e=els[i];const pl=e.axis[0];const a=pl[pl.length-2]||pl[0],b=pl[pl.length-1];let tx=b.x-a.x,ty=b.y-a.y;let L=Math.hypot(tx,ty);if(L<1e-6&&els[i+1]){const q=els[i+1].axis[0];tx=q[1].x-q[0].x;ty=q[1].y-q[0].y;L=Math.hypot(tx,ty);}L=L||1;return {x:e.to.x,y:e.to.y,tx:tx/L,ty:ty/L};}
function posAtChainage(line,m){const e=line.els.find(e=>m>=e.m0&&m<=e.m1)||line.els[line.els.length-1];const pl=e.axis[0];const f=(m-e.m0)/Math.max(.001,e.m1-e.m0);const L=polyLen(pl)*f;let d=0;for(let i=1;i<pl.length;i++){const a=pl[i-1],b=pl[i];const s=Math.hypot(b.x-a.x,b.y-a.y);if(d+s>=L){const t=s?(L-d)/s:0;return {x:a.x+(b.x-a.x)*t,y:a.y+(b.y-a.y)*t};}d+=s;}return {x:e.to.x,y:e.to.y};}

/* ---------- construction des lignes (géométrie explicite par élément) ---------- */
const CASING_DN={20:.11,25:.11,32:.125,40:.125,50:.14,65:.16,80:.18,100:.225,125:.25,150:.28,200:.355,250:.45,300:.5};
function casingOf(e){ // gaine (m) : celle du plan si connue, sinon base fournisseurs (série du chantier), sinon table EN 253 série 2
  if(e.casing)return e.casing/1000;const sup=(NET&&NET.supplier)||'';const ser=(NET&&NET.serie)||2;const t=DB&&DB.casing&&(DB.casing[sup==='RENALIA'?'ZPU':sup]||null);
  if(t&&t[String(e.dn)]){const v=t[String(e.dn)];const c=Array.isArray(v)?(v[ser-1]||v[0]):v;if(c)return c/1000;}return CASING_DN[e.dn]||.2;}
function finalizeLine(line){ // à partir de line.els (géométrie partagée) : chainage, bbox, conduites A/R, joints
  let m=0;line.els.forEach(e=>{e.m0=m;e.m1=m+e.len;m+=e.len;elBBox(e);e.rot=0;e.flip=false;});line.length=m;
  line.cond={};(line.single?[line.single]:['A','R']).forEach(c=>{const my=line.els.map(e=>Object.assign(Object.create(e),{rot:0,flip:false,photos:[],note:'',cond:c}));const joints=[];for(let i=0;i<my.length-1;i++)joints.push({idx:i,weldId:'S-'+String(state.nextWeld++).padStart(4,'0'),cond:c,status:'a_souder',events:[],conn:{E:'E',N:'N'},wire:'a_raccorder',cont:false,iso:false,isoVal:'',photos:[],note:'',line:line.id});line.cond[c]={els:my,joints};});
  const dns={};line.els.forEach(e=>{if(e.kind==='pipe'||e.kind==='barre')dns[e.dn]=(dns[e.dn]||0)+e.len;});line.dn=+Object.entries(dns).sort((a,b)=>b[1]-a[1])[0]?.[0]||line.dn||100;
}
function genLine(line){ // réseau lu par l'axe : barres 12 m, coudes, tés, vannes, réductions le long de l'axe (pts) — les emprises des pièces sur l'axe sont celles du catalogue (jambes de coude, longueur de té…), pour que le moteur les pose au bon endroit
  const L=polyLen(line.pts)/line.ppm;const turns=turnAngles(line);const cuts=[];
  const dn0=line.dnNum||100;const dnAt=x=>{const sg=(line.dnSegs||[]).find(s=>x>=s.m0-1e-6&&x<=s.m1+1e-6);return sg&&sg.dn?sg.dn:dn0;};
  const legsOf=dn=>dn<=200?1.0:dn<=250?1.2:1.5;const teeL=dn=>dn<=80?1.0:dn<=200?1.5:2.0; // mêmes règles que le moteur (à brancher sur le catalogue)
  turns.forEach(t=>{if(Math.abs(t.ang)>=15){const g=legsOf(dnAt(t.m));cuts.push({m:t.m,type:'bend',len:2*g,angle:Math.round(Math.abs(t.ang)),dir:t.ang<0?'gauche':'droite'});}else cuts.push({m:t.m,type:'dev',ang:t.ang});});
  (line.specials||[]).forEach(sp=>cuts.push({m:sp.m,type:sp.type,len:sp.type==='tee'?teeL(dnAt(sp.m)):sp.type==='reducer'?1.0:sp.type==='valve'?1.5:.5,branch:sp.branch,dn1:sp.dn1,dn2:sp.dn2,block:sp.block,sub:sp.sub}));cuts.sort((a,b)=>a.m-b.m);
  // emprises qui se chevauchent (coude contre coude, coude collé à un té…) : la frontière est mise au milieu, pas de barre entre — le moteur les soude direct
  const solid=cuts.filter(c=>c.type!=='dev');for(let i=1;i<solid.length;i++){const p=solid[i-1],c=solid[i];const pEnd=p.m+(p.len2!==undefined?p.len2:p.len/2),cStart=c.m-(c.len1!==undefined?c.len1:c.len/2);if(cStart<pEnd){const mid=(p.m+c.m)/2;p.len2=Math.max(0.05,mid-p.m);c.len1=Math.max(0.05,c.m-mid);}}
  const els=[];let m=0,nb=0,nc=0,nt=0,nv=0,nr=0;
  const bars=(from,to)=>{ // barres 12 m entières + une chute ≥ 1 m (jamais plus de 12 m ; si le reste fait moins d'1 m, l'avant-dernière barre est recoupée pour laisser une chute d'1 m) ; une barre ne chevauche pas un changement de DN
    let x=from;const stops=(line.dnSegs||[]).map(s=>s.m0).filter(v=>v>from+0.05&&v<to-0.05).sort((p,q)=>p-q);stops.push(to);
    stops.forEach(stop=>{let rest=stop-x;if(rest<=0.05)return;const n=Math.max(1,Math.ceil(rest/12-1e-6));let parts=[];if(n===1)parts=[rest];else{let rem=rest-12*(n-1);if(rem<1.0){parts=[...Array(n-2).fill(12),12-(1.0-rem),1.0];}else parts=[...Array(n-1).fill(12),rem];}
      parts.forEach(len=>{els.push({id:'P'+(++nb),kind:'pipe',mm0:x,mm1:x+len,len,dn:dnAt(x+len/2)});x+=len;});x=stop;});};
  cuts.forEach(c=>{if(c.type==='dev'){bars(m,c.m);m=c.m;const last=els[els.length-1];if(last)last.devAfter=c.ang;return;}const h1=c.len1!==undefined?c.len1:c.len/2,h2=c.len2!==undefined?c.len2:c.len/2;const mm0=Math.max(m,c.m-h1),mm1=Math.min(L,c.m+h2);bars(m,mm0);const kd=c.type==='reducer'?(c.dn1||dnAt(mm0-0.01)):dnAt(c.m);
    els.push({id:c.type==='bend'?'C'+(++nc):c.type==='tee'?'T'+(++nt):c.type==='reducer'?'R'+(++nr):'V'+(++nv),kind:c.type,mm0,mm1,mc:c.m,len:mm1-mm0,dn:kd,dn2:c.type==='reducer'?(c.dn2||dnAt(mm1+0.01)):undefined,angle:c.angle,dir:c.dir,branch:c.branch,code:c.block||undefined,sub:c.sub,short:c.len1!==undefined||c.len2!==undefined});m=mm1;});bars(m,L);
  els.forEach(e=>{const pl=subPath(line,e.mm0,e.mm1);e.axis=[pl];e.from=pl[0];e.to=pl[pl.length-1];if(e.mc!==undefined){const c=posAtM(line,e.mc);e.corner={x:c.x,y:c.y};}});
  line.els=els;finalizeLine(line);
}
function posAtM(line,m){const a=ptAt(line,m);return {x:a.x,y:a.y};}
function seedStatuses(line,frac){['A','R'].forEach(c=>{if(!line.cond[c])return;const J=line.cond[c].joints;const n=J.length;J.forEach((j,i)=>{const p=i/n;const day=d=>new Date(Date.now()-d*864e5);
    if(p<frac.manch){j.status='manchonnee';j.events.push({type:'soudee',by:i%3?'karim':'sofiane',at:day(40-i*.2),data:{procede:'141+111'},photos:[]},{type:'controle',by:'ethan',at:day(39-i*.2),data:{result:'OK',mode:'Radiographie',ref:'RT-'+(300+i)},photos:[]},{type:'manchonnee',by:'julien',at:day(38-i*.2),data:{manchon:'thermo',etanch:true,mousse:true,fils:true},photos:[]});j.wire='raccorde';j.cont=j.iso=true;j.isoVal='>200';}
    else if(p<frac.ctrl){j.status='controlee';j.events.push({type:'soudee',by:'karim',at:day(6),data:{procede:'141+111'},photos:[]},{type:'controle',by:'ethan',at:day(5),data:{result:'OK',mode:'Radiographie',ref:'RT-'+(300+i)},photos:[]});}
    else if(p<frac.soud){j.status='soudee';j.events.push({type:'soudee',by:i%2?'karim':'sofiane',at:day(3),data:{procede:'141+111'},photos:[]});}});});}
function allJoints(){return Object.values(state.lines).flatMap(l=>['A','R'].filter(c=>l.cond[c]).flatMap(c=>l.cond[c].joints.map(j=>({j,l,c}))));}
function findWeld(id){for(const l of Object.values(state.lines))for(const c of ['A','R']){if(!l.cond[c])continue;const j=l.cond[c].joints.find(j=>j.weldId===id);if(j)return {j,l,c};}return null;}

/* ---------- moteur de pièces : chaque ligne est un puzzle de pièces catalogue ; l'appli garde ses fiches, statuts, photos, fils ---------- */
const KLABEL={pipe:'barre',bend:'coude',steelbend:'changement de direction au manchon (SXB)',tee:'té',valve:'vanne',endcap:'bouchon',reducer:'réduction',endpoint:'raccordement',bypass:'by-pass',teeout:'sortie de té'};
function othersOfLine(line){ // départs et fins des autres lignes du chantier (même conduite) : sert au moteur pour reconnaître un té là où le plan dessine un demi-tour
  const out=[];const P=q=>Array.isArray(q)?q:[q.x,q.y];Object.values(state.lines).forEach(L=>{if(L.id===line.id||!L.els||!L.els.length)return;if(line.single&&L.single&&L.single!==line.single)return;const e0=L.els[0],e1=L.els[L.els.length-1];if(!e0.from||!e1.to)return;out.push({id:L.id,pt:P(e0.from),pt2:P(e0.to),dn:e0.dn,len:L.length||0,n:L.els.length});out.push({id:L.id,pt:P(e1.to),pt2:P(e1.from),dn:e1.dn,len:L.length||0,n:L.els.length});});return out;}
function rawElsOf(line){return line.els.map(e=>({id:e.id,kind:e.kind,dn:e.dn,dn2:e.dn2,sub:e.sub,casing:e.casing,len:e.len,angle:e.angle,gap:e.gap,code:e.code,corner:e.corner?[e.corner.x,e.corner.y]:undefined,axis:e.axis.map(pl=>pl.map(p=>[p.x,p.y])),from:[e.from.x,e.from.y],to:[e.to.x,e.to.y]})).filter(e=>e.axis[0]&&e.axis[0].length>=2);}
function offsetRaw(raw,d){ // décale l'axe partagé du plan pour donner à chaque conduite son propre axe (entraxe réel), puis recolle les jonctions
  const out=raw.map(e=>{const axis=e.axis.map(pl=>offsetPoly(pl.map(p=>({x:p[0],y:p[1]})),d).map(q=>[q.x,q.y]));return {...e,axis,from:axis[0][0].slice(),to:axis[0][axis[0].length-1].slice()};});
  for(let i=0;i<out.length-1;i++){const a=out[i].axis[0],b=out[i+1].axis[0];const pa=a[a.length-1],pb=b[0];if(Math.hypot(pa[0]-pb[0],pa[1]-pb[1])<2.5){const m=[(pa[0]+pb[0])/2,(pa[1]+pb[1])/2];a[a.length-1]=m.slice();b[0]=m.slice();out[i].to=m.slice();out[i+1].from=m.slice();}}
  return out;}
function makeEngine(line,raw,c){let x0=1e9,y0=1e9,x1=-1e9,y1=-1e9;raw.forEach(e=>e.axis.forEach(pl=>pl.forEach(p=>{x0=Math.min(x0,p[0]);y0=Math.min(y0,p[1]);x1=Math.max(x1,p[0]);y1=Math.max(y1,p[1]);})));const M=8;
  const texts=(NET.ann||[]).filter(a=>a.p&&a.p[0]>x0-M&&a.p[0]<x1+M&&a.p[1]>y0-M&&a.p[1]<y1+M).map(a=>({x:a.p[0],y:a.p[1],t:String(a.text||'').replace(/\\[A-Za-z][^;]*;/g,'').trim()}));
  const saved=(state.remoteLS[state.siteId]||{})[line.id+':'+c]||null;const opts={SUB:{main:{id:line.id,els:raw},bbox:[x0,y0,x1,y1],texts,others:othersOfLine(line)},statuses:{},saved,onChange:()=>{resyncLine(line);scheduleRender();},onCommitReport:rep=>applyCommitReport(line,rep,c),onCommit:st=>{sync.ensureSite({id:state.siteId,name:NET.name,supplier:NET.supplier,serie:NET.serie}).then(()=>sync.saveLineState(state.siteId,line.id,c,st));}};
  Object.defineProperty(opts,'toolEl',{get:()=>state.tool&&state.toolLine===line.id&&state.toolCond===c?$('#toolPanel'):null});
  return createPieceEngine(opts);}
function engOf(line,c){return line.engines?line.engines[c]:line.engine;}
function attachEngine(line){const raw=rawElsOf(line);line.byUid={A:{},R:{}};line.jointByUid={A:{},R:{}};
  try{if(line.single){line.engine=makeEngine(line,raw,line.single);line.engines=null;}
    else{ // axe partagé sur le plan → deux puzzles, un par conduite, à l'entraxe réel : mêmes coudes catalogue, barres qui encaissent
      const half=raw.length?(casingOf({dn:raw[0].dn,casing:raw[0].casing})+.15)/2:.2;line.axisHalf=half;
      line.engines={A:makeEngine(line,offsetRaw(raw,half),'A'),R:makeEngine(line,offsetRaw(raw,-half),'R')};line.engine=line.engines.A;}
  }catch(err){console.warn('moteur : ligne '+line.id+' non lue',err);line.engine=null;line.engines=null;finalizeLine(line);return;}}
function chainToEls(eng,own){return eng.chain.map(p=>{const g=eng.worldGeom(p);const kind=p.kind==='tube'||p.kind==='connector'?'pipe':p.kind==='bend'?(p.steel?'steelbend':'bend'):p.kind;const axis=g.axis.map(pl=>pl.map(q=>({x:q.x,y:q.y})));const a0=axis[0];
    return {id:p.id,uid:p.uid,kind,kindLabel:KLABEL[kind]||kind,dn:p.dn,casing:p.casing,len:g.len,angle:p.angle,axis,from:a0[0],to:a0[a0.length-1],cut:!!p.cut,piece:p,unknown:!!p.unknown,interp:p.interp,ownAxis:!!own};});}
function resyncLine(line){if(!line.engine)return;const conds=line.single?[line.single]:['A','R'];line.cond=line.cond||{};
  conds.forEach((c,ci)=>{const eng=engOf(line,c);const base=chainToEls(eng,!!line.engines);let m=0;base.forEach(e=>{e.m0=m;e.m1=m+e.len;m+=e.len;elBBox(e);e.rot=0;e.flip=false;});
    if(ci===0){line.els=base;line.length=m;}
    const my=base.map(e=>{let o=line.byUid[c][e.uid];if(!o){o=Object.assign(Object.create(e),{rot:0,flip:false,photos:[],note:'',cond:c});line.byUid[c][e.uid]=o;}else Object.setPrototypeOf(o,e);return o;});
    const joints=[];for(let i=0;i<my.length-1;i++){const uid=base[i].uid;let j=line.jointByUid[c][uid];if(!j){j={idx:i,weldId:'S-'+String(state.nextWeld++).padStart(4,'0'),cond:c,status:'a_souder',events:[],conn:{E:'E',N:'N'},wire:'a_raccorder',cont:false,iso:false,isoVal:'',photos:[],note:'',line:line.id};line.jointByUid[c][uid]=j;}j.idx=i;joints.push(j);}
    line.cond[c]={els:my,joints};
    const map={};base.forEach((e,i)=>{if(i>=base.length-1)return;const j=line.jointByUid[c][e.uid];map[e.uid]=(j&&j.status!=='a_reprendre')?j.status:'a_souder';if(j)e.piece.jid=j.weldId;});eng.setStatuses(map);});
  const dns={};line.els.forEach(e=>{if(e.kind==='pipe')dns[e.dn]=(dns[e.dn]||0)+e.len;});line.dn=+Object.entries(dns).sort((a,b)=>b[1]-a[1])[0]?.[0]||line.dn||100;}
function applyCommitReport(line,rep,cond){const conds=cond?[cond]:(line.single?[line.single]:['A','R']);const now=new Date();const by=state.userId;
  (rep.cuts||[]).forEach(c=>conds.forEach(cd=>{const j=line.jointByUid[cd][c.uid];if(!j)return;if(c.mode==='redo'){j.events.push({type:'recoupee',by,at:now,data:{why:c.why},photos:[]});j.status='a_souder';j.note=(j.note?j.note+' · ':'')+'recoupée (décision chef) : '+c.why;}else{j.events.push({type:'ajustee',by,at:now,data:{why:c.why},photos:[]});j.note=(j.note?j.note+' · ':'')+'ajustée le '+now.toLocaleDateString('fr-FR')+' : '+c.why;}}));
  [...(rep.lost||[]),...(rep.merged||[])].forEach(l=>conds.forEach(cd=>{const src=line.jointByUid[cd][l.lostUid];const tgt=(l.targetUid!==null&&l.targetUid!==undefined)?line.jointByUid[cd][l.targetUid]:null;
    if(src&&tgt){tgt.events.push(...src.events);tgt.photos.push(...src.photos);tgt.note=(tgt.note?tgt.note+' · ':'')+'reçoit les infos de '+src.weldId+' ('+(STATUS[src.status]||{}).label+')'+(src.note?' — '+src.note:'');}
    if(src)delete line.jointByUid[cd][l.lostUid];const se=line.byUid[cd][l.lostUid],te=l.keptUid?line.byUid[cd][l.keptUid]:null;if(se&&te)te.photos.push(...(se.photos||[]));if(se)delete line.byUid[cd][l.lostUid];}));
  resyncLine(line);renderAll();toast('Calepinage modifié — soudures, statuts et photos conservés');}
function activateToolLine(id,c){if(state.toolLine&&(state.toolLine!==id||state.toolCond!==c)){const l0=state.lines[state.toolLine];const e0=l0&&engOf(l0,state.toolCond);if(e0)e0.setMode(null);}state.toolLine=id;state.toolCond=c;const l=state.lines[id];const e=l&&engOf(l,c);if(e&&e.mode!=='move')e.setMode('move');}
function toggleTool(){state.tool=!state.tool;closeSheet();if(!state.tool){if(state.toolLine){const l=state.lines[state.toolLine];const e=l&&engOf(l,state.toolCond);if(e)e.setMode(null);}state.toolLine=null;state.toolCond=null;$('#toolPanel').style.display='none';}else{$('#toolPanel').style.display='';$('#toolPanel').innerHTML=`<b>Modifier le calepinage</b><div class="muted" style="margin-top:4px">Touche une pièce ou une soudure du réseau : gris → <b style="color:#b8560f">orange</b> (encaisse : barre recoupée / tube créé à la soudure) → <b style="color:#1c3d6b">bleu</b> (bouge d'un bloc) → gris. Glisse une pièce bleue pour déplacer, une soudure entre deux barres pour la coulisser. Tout le reste ne bouge pas ; les soudures faites sont protégées (confirmation, statuts et photos conservés).</div>`;}renderPlan();}
/* ---------- données : chantiers (DWG lus bloc par bloc / axes + repères) ---------- */
const siteStore={};
// chantiers masqués (supprimés) : id → date ; un chantier ré-enregistré par le traceur après sa suppression réapparaît
function hiddenMap(){let m={};try{m=JSON.parse(localStorage.getItem('trace:hiddenAt')||'{}')||{};}catch(e){}try{const old=JSON.parse(localStorage.getItem('trace:hiddenSites')||'[]');old.forEach(id=>{if(!(id in m))m[id]=Date.now();});}catch(e){}return m;}
function isHidden(net){const m=hiddenMap();if(!(net.id in m))return false;const saved=net.traceur&&net.traceur.savedAt?Date.parse(net.traceur.savedAt):0;if(saved&&saved>m[net.id]){delete m[net.id];localStorage.setItem('trace:hiddenAt',JSON.stringify(m));const old=JSON.parse(localStorage.getItem('trace:hiddenSites')||'[]').filter(x=>x!==net.id);localStorage.setItem('trace:hiddenSites',JSON.stringify(old));return false;}return true;}
// ligne issue du traceur : deux chaînes de pièces déjà posées (une par conduite, à l'entraxe réel), soudures numérotées par le traceur — pas de moteur de recalage, la retouche se fait dans le traceur
function setupTraceurLine(L,sh){const line={id:L.id,sheetId:sh.id,name:L.name||L.id,parent:L.parent||null,parentM:L.parentM,parentElIdx:null,ppm:1,single:null,traceur:true,start:L.parent?'Sortie de té (ligne '+L.parent+')':'Départ',end:L.endType||'kit',pts:(L.axis||[]).map(p=>({x:p[0],y:p[1]})),dn:L.dn,axisHalf:(L.e||0.35)/2,engine:null,engines:null,cond:{}};
  const mk=(e)=>{const axis=(e.axis||[]).map(pl=>pl.map(p=>({x:p[0],y:p[1]})));if(!axis.length||!axis[0].length)axis.push([{x:e.from[0],y:e.from[1]},{x:e.to[0],y:e.to[1]}]);if(axis[0].length<2)axis[0].push({...axis[0][0]});const o={id:e.id,kind:e.kind,kindLabel:e.kindLabel||KLABEL[e.kind]||e.kind,dn:e.dn,dn2:e.dn2,casing:e.casing,len:e.len||0,angle:e.angle,plane:e.plane,axis,from:axis[0][0],to:axis[0][axis[0].length-1],cut:!!e.cut,std:!!e.std,manchette:!!e.manchette,nue:!!e.nue,ref:e.ref,sub:e.sub,vert:e.vert,dnb:e.dnb,teeType:e.teeType,saut:!!e.saut,under:!!e.under,photo:e.photo,branch:e.branch,err:e.err,m0:e.m0,m1:e.m1,ownAxis:true,rot:0,flip:false,photos:[],note:''};elBBox(o);return o;};
  ['A','R'].forEach(c=>{const cd=L.cond[c];if(!cd)return;const els=cd.els.map(mk);els.forEach(e=>{e.cond=c;});const joints=(cd.welds||[]).map((w,k)=>({idx:w.idx!==undefined?w.idx:k,weldId:w.weldId,cond:c,status:'a_souder',events:[],conn:{E:'E',N:'N'},wire:'a_raccorder',cont:false,iso:false,isoVal:'',photos:[],note:'',line:L.id,m:w.m,dn:w.dn,fc:!!w.fc,dev:w.dev||0,teeOut:!!w.teeOut,bypass:!!w.bypass,sleeveWith:w.sleeveWith||null})).filter(j=>j.idx>=0&&j.idx<els.length).sort((a,b)=>a.idx-b.idx);line.cond[c]={els,joints};});
  line.els=(line.cond.A||line.cond.R).els;line.length=line.els.length?line.els[line.els.length-1].m1:0;state.lines[L.id]=line;sh.lines.push(L.id);}
// chantiers remis par le traceur (même navigateur) : trace:handoff:<id> → ajoutés à la liste, envoyés au serveur dès qu'on est connecté
async function loadHandoffs(){const out=[];const seen=new Set();try{const keys=await kv.keys('trace:handoff:');for(const k of keys){const net=await kv.get(k);if(net&&net.id&&net.lines){net.handoff=true;out.push(net);seen.add(net.id);}}}catch(e){console.warn(e);}
  for(let i=0;i<localStorage.length;i++){const k=localStorage.key(i);if(!k||!k.startsWith('trace:handoff:'))continue;try{const net=JSON.parse(localStorage.getItem(k));if(net&&net.id&&net.lines&&!seen.has(net.id)){net.handoff=true;out.push(net);}}catch(e){}}return out;}
async function markSent(id){try{const net=await kv.get('trace:handoff:'+id);if(net){net.sent=true;net.sentAt=Date.now();await kv.set('trace:handoff:'+id,net);}}catch(e){}}
function removeSiteOption(id){delete SITES[id];delete siteStore[id];const o=[...siteSel.options].find(x=>x.value===id);if(o)o.remove();if(state.siteId===id){const first=Object.keys(SITES)[0];if(first){siteSel.value=first;switchSite(first);}}}
// chantiers remis par le traceur → serveur. remote = liste du serveur (si connue) : on n'envoie que le nouveau ou le plus récent ; un chantier déjà envoyé qui n'est plus sur le serveur a été supprimé depuis un autre appareil → retiré ici aussi (sinon il ressuscitait à chaque connexion)
async function pushHandoffs(remote){if(!(await sync.user()))return;const onServer={};(remote||[]).forEach(r=>{onServer[r.id]=r;});
  for(const net of await loadHandoffs()){const {handoff,sent,sentAt,...clean}=net;const srv=onServer[net.id];
    const tomb=srv&&srv.deleted;const localSaved=net.traceur&&net.traceur.savedAt?Date.parse(net.traceur.savedAt):0;const tombAt=tomb&&srv.deletedAt?Date.parse(srv.deletedAt):0;
    if(tomb&&!(localSaved&&localSaved>tombAt)){const hm=hiddenMap();hm[net.id]=tombAt||Date.now();try{localStorage.setItem('trace:hiddenAt',JSON.stringify(hm));}catch(e){}removeSiteOption(net.id);continue;} // supprimé depuis un autre appareil (pierre tombale) : masqué ici, jamais renvoyé — sauf si la copie locale est plus récente (ré-enregistrée depuis le traceur après la suppression)
    if(remote&&remote.length&&!srv&&net.sent){const hm=hiddenMap();hm[net.id]=Date.now();try{localStorage.setItem('trace:hiddenAt',JSON.stringify(hm));}catch(e){}removeSiteOption(net.id);continue;} // absent d'une liste serveur valide ET NON VIDE : masqué ici (la copie locale reste). Une liste vide n'est jamais une preuve de suppression (échec de requête, verrou d'auth, compte neuf) — c'est elle qui avait fait « disparaître » tous les chantiers le 20/08
    if(srv){const srvAt=(srv.traceur&&srv.traceur.savedAt?Date.parse(srv.traceur.savedAt):0)||(srv.updated_at?Date.parse(srv.updated_at):0);
      if(!(localSaved&&localSaved>srvAt+1000)){await markSent(net.id);continue;}} // le serveur a la même version ou plus récent : on n'écrase JAMAIS (une vieille copie de téléphone avait écrasé les retouches du PC)
    const okk=await sync.saveSite(clean);if(okk){state.ownSiteWrite=Date.now();await markSent(net.id);setCloudBadge('chantier « '+net.name+' » envoyé au serveur');}}}
function addSiteOption(net){if(!SITES[net.id]){SITES[net.id]=net;const o=document.createElement('option');o.value=net.id;o.textContent=net.name;siteSel.appendChild(o);}else{SITES[net.id]=net;const o=[...siteSel.options].find(x=>x.value===net.id);if(o)o.textContent=net.name;}}
// historique des versions du chantier (serveur) : chaque ré-enregistrement garde la version d'avant — restauration en deux clics
// remise à zéro d'une soudure (erreur de saisie) : tout l'avancement disparaît, la soudure elle-même reste
function wipeWeld(j){j.status='a_souder';j.events=[];j.photos=[];j.wire='a_raccorder';j.conn={E:'E',N:'N'};j.cont=false;j.iso=false;j.isoVal='';j.note='';delete j.steps;try{stockDropTakes(j.weldId);}catch(e){}}
const weldHasData=j=>j.status!=='a_souder'||(j.events&&j.events.length)||(j.photos&&j.photos.length)||(j.wire&&j.wire!=='a_raccorder');
async function pushWeld(j){try{await sync.ensureSite({id:state.siteId,name:NET.name,supplier:NET.supplier,serie:NET.serie});const okk=await sync.saveWeld(state.siteId,{...j});if(okk)setCloudBadge('enregistré '+new Date().toLocaleTimeString('fr-FR'));}catch(e){console.warn(e);}}
// transfert : les données d'avancement passent sur la soudure cible ; si la cible en a déjà, on ÉCHANGE (rien ne se perd)
const TFIELDS=['status','events','photos','wire','conn','cont','iso','isoVal','note','steps']; // 'steps' : les 4 sous-étapes du manchon suivent le transfert (photos, gars, dates, bouclage figé)
function startTransfer(lineId,c,i){const j=state.lines[lineId].cond[c].joints[i];state.transfer={line:lineId,cond:c,i,weldId:j.weldId};closeSheet();$('#transferBar').style.display='flex';$('#tfFrom').textContent=j.weldId;$('#tfNum').value='';renderPlan();toast('Touche la soudure qui doit recevoir les données');}
function endTransfer(){state.transfer=null;$('#transferBar').style.display='none';renderPlan();}
async function doTransferTo(lineId,c,i){const T0=state.transfer;if(!T0)return;const F=state.lines[T0.line].cond[T0.cond].joints[T0.i];const T=state.lines[lineId].cond[c].joints[i];
  if(F===T){toast('C\'est la même soudure');return;}
  const by=(me()||{}).name,at=new Date();
  if(weldHasData(T)){if(!confirm(`${T.weldId} a déjà des données (${(STATUS[T.status]||{}).label||T.status}${(T.photos||[]).length?', photos':''}). Échanger les données des deux soudures ?`))return;
    TFIELDS.forEach(k=>{const tmp=F[k];F[k]=T[k];T[k]=tmp;});
    T.events=[...(T.events||[]),{type:'transfert',by,at,data:{de:F.weldId},photos:[]}];F.events=[...(F.events||[]),{type:'transfert',by,at,data:{de:T.weldId},photos:[]}];
    toast(`Données échangées entre ${F.weldId} et ${T.weldId}`);}
  else{TFIELDS.forEach(k=>{T[k]=F[k];});wipeWeld(F);
    T.events=[...(T.events||[]),{type:'transfert',by,at,data:{de:F.weldId},photos:[]}];
    toast(`Données de ${F.weldId} transférées sur ${T.weldId}`);}
  try{sync.logEvent(state.siteId,T.weldId,'transfert',by,{de:F.weldId});}catch(e){}
  endTransfer();renderAll();const p=jointPos(state.lines[lineId],i,c);centerOn(p.x,p.y,state.view.k);openJoint(lineId,c,i);
  await pushWeld(T);await pushWeld(F);}
async function openVersionsModal(){const id=state.siteId;const rows=await sync.listVersions(id);
  if(rows===null){openModal('<h3>Versions</h3><div class="muted">Indisponible : connecte-toi, et exécute une fois tools/supabase_versions.sql dans Supabase (SQL Editor).</div><div class="actions" style="margin-top:8px"><button class="btn block" data-close>Fermer</button></div>');return;}
  if(!rows.length){openModal('<h3>Versions</h3><div class="muted">Pas encore d\'historique pour ce chantier : il se remplit à chaque « Enregistrer dans TRACÉ » (la version précédente est gardée, 15 maxi).</div><div class="actions" style="margin-top:8px"><button class="btn block" data-close>Fermer</button></div>');return;}
  let profs={};try{(await sync.listProfiles()).forEach(p=>{profs[p.id]=p.name||p.email;});}catch(e){}
  openModal(`<h3>Versions — ${esc(NET.name)}</h3><div class="muted" style="margin-bottom:6px">La version affichée actuellement n'est pas dans la liste : ce sont les états précédents (15 gardés). Restaurer n'efface rien : l'état actuel passera à son tour dans l'historique.</div>
   <table class="rc">${rows.map(r=>`<tr><td style="text-align:left">${new Date(r.created_at).toLocaleString('fr-FR')}</td><td style="text-align:left" class="dim">${esc(profs[r.saved_by]||'')}</td><td><button class="btn sm" data-restore="${r.id}">Restaurer</button></td></tr>`).join('')}</table>
   <div class="actions" style="margin-top:8px"><button class="btn block" data-close>Fermer</button></div>`);
  $('#modal').querySelectorAll('[data-restore]').forEach(b=>{b.onclick=async()=>{if(!confirm('Restaurer cette version du plan ? Les statuts de soudure ne bougent pas (ils sont rattachés aux numéros) ; l\'état actuel du plan sera gardé dans l\'historique.'))return;
    const v=await sync.loadVersion(+b.dataset.restore);if(!v||!v.data){toast('Version illisible');return;}
    const net={...v.data,id,name:v.name||NET.name};if(net.traceur)net.traceur.savedAt=new Date().toISOString();net.updated_at=undefined;
    const okk=await sync.saveSite(net);if(!okk){toast('Restauration refusée par le serveur');return;}state.ownSiteWrite=0;closeModal();toast('Version restaurée — rechargement');await refreshSiteFromServer(id);};});}
async function deleteCurrentSite(){const id=state.siteId;const net=SITES[id];if(!net)return;if(!confirm(`Supprimer le chantier « ${net.name} » (plan, soudures, statuts, photos) ? Cette action est définitive.`))return;
  let msg='';try{localStorage.removeItem('trace:handoff:'+id);}catch(e){}try{await kv.del('trace:handoff:'+id);}catch(e){}
  const hidden=JSON.parse(localStorage.getItem('trace:hiddenSites')||'[]');if(!hidden.includes(id))hidden.push(id);localStorage.setItem('trace:hiddenSites',JSON.stringify(hidden));const hm=hiddenMap();hm[id]=Date.now();localStorage.setItem('trace:hiddenAt',JSON.stringify(hm));
  try{const r=await sync.deleteSite(id,net.name);msg=r.ok?'supprimé sur le serveur':('serveur : '+(r.why||'refusé')+' — SQL à passer dans Supabase : delete from welds where site_id=\''+id+'\'; delete from line_state where site_id=\''+id+'\'; delete from events where site_id=\''+id+'\'; delete from sites where id=\''+id+'\';');}catch(e){msg='serveur injoignable';}
  delete SITES[id];delete siteStore[id];const o=[...siteSel.options].find(x=>x.value===id);if(o)o.remove();const next=Object.keys(SITES)[0];toast('Chantier supprimé — '+msg);
  if(next){siteSel.value=next;await switchSite(next);}else{location.reload();}}
function setupSite(id){
  state.hydroPose=null;hydroCache=null;state.hydroMapView=null;state.osmHydrants=null;state.hydroCalStart=null;state.hydroCalMonth=null;state.hydroCalT=0;state.dhShowLoc=false;state.loc=null;state.dhLocPending=null;state.dh.at=null;state.dh.dir=null;state.dh.meas=null;state.dh.iso=null;state.dh.locVal='';const hb=$('#hydroBar');if(hb)hb.style.display='none';
  state.stockPose=null;state.stockSel=null;state.stockMatSel='';const sb2=$('#stockBar');if(sb2)sb2.style.display='none';
  if(siteStore[id]){const st=siteStore[id];NET=st.NET;state.lines=st.lines;state.sheets=st.sheets;state.nextWeld=st.nextWeld;state.sheetId=st.sheetId;state.locate={...state.locate,line:st.firstLine};bgG.dataset.sheet='';return;}
  NET=SITES[id];state.lines={};state.sheets={};state.nextWeld=1;
  const sh={id:'s_'+id,name:NET.name,type:NET.sheetType||'blank',w:NET.w,h:NET.h,ppm:1,lines:[],ann:NET.ann||[],drawing:NET.drawing||null,plain:NET.source==='traceur',image:NET.image||null};state.sheets[sh.id]=sh;state.sheetId=sh.id;
  const KL={pipe:'barre',bend:'coude',steelbend:'changement de direction au manchon (SXB)',tee:'té',valve:'vanne',endcap:'bouchon',reducer:'réduction'};
  NET.lines.forEach(L=>{if(L.traceur&&L.cond){setupTraceurLine(L,sh);return;}
    if(L.pts&&!L.els){const line={id:L.id,sheetId:sh.id,name:L.name||L.id,parent:L.parent||null,parentElIdx:null,ppm:1,single:L.cond||null,start:L.parent?'Té (ligne '+L.parent+')':'Départ',end:'Extrémité',pts:L.pts.map(p=>({x:p[0],y:p[1]})),specials:(L.specials||[]).map(sp=>({...sp})),dnNum:L.dnNum||100,dnSegs:L.dnSegs||null};genLine(line);line.els.forEach(e=>{e.kindLabel=KLABEL[e.kind]||e.kind;e.casing=L.casing||undefined;});state.lines[L.id]=line;sh.lines.push(L.id);return;}
    const line={id:L.id,sheetId:sh.id,name:L.name||((L.parent?'Antenne ':'Ligne principale ')+L.id),parent:L.parent,parentElIdx:L.parentElIdx,ppm:1,single:L.cond||null,start:L.parent?'Té (ligne '+L.parent+')':'Départ',end:'Extrémité (bouchon / SST)',
      els:L.els.map(e=>({id:e.id,kind:e.kind,kindLabel:KL[e.kind]||e.kind,dn:e.dn,casing:e.casing,len:e.len,angle:e.angle,gap:e.gap,axis:e.axis.map(pl=>pl.map(p=>({x:p[0],y:p[1]}))),from:{x:e.from[0],y:e.from[1]},to:{x:e.to[0],y:e.to[1]},cut:e.kind==='pipe'&&e.len<11.9}))};
    line.els.forEach(e=>{e.axis.forEach((pl,k)=>{const d0=Math.hypot(pl[0].x-e.from.x,pl[0].y-e.from.y),d1=Math.hypot(pl[pl.length-1].x-e.from.x,pl[pl.length-1].y-e.from.y);if(k===0&&d1<d0)pl.reverse();});if(!e.axis.length)e.axis=[[e.from,e.to]];});
    state.lines[L.id]=line;sh.lines.push(L.id);});
  Object.values(state.lines).forEach(l=>{l.els.forEach((e,i)=>{if(!e.dn){e.dn=(l.els[i-1]||{}).dn||(l.els[i+1]||{}).dn||100;}});});
  Object.values(state.lines).forEach(l=>{if(l.parent&&state.lines[l.parent]){const pe=state.lines[l.parent].els[l.parentElIdx];if(pe&&!pe.branch)pe.branch=l.id;}});
  Object.values(state.lines).forEach(l=>{if(l.traceur)return;attachEngine(l);resyncLine(l);});
  // avancement fictif (démo) selon le chantier
  const roots=Object.values(state.lines).filter(l=>!l.parent).sort((a,b)=>b.length-a.length);
  if(NET.demo){(NET.demo.lines||[]).forEach(d=>{const l=state.lines[d.id];if(l)seedStatuses(l,d);});
    const main=roots[0];if(main){const c=main.single||'A';const A=main.cond[c];const b=A.els.filter(e=>e.kind==='pipe')[9];if(b)b.rot=180;const jI=A.joints[Math.floor(A.joints.length*.25)];if(jI&&jI.status==='manchonnee'){jI.conn={E:'N',N:'E'};jI.wire='inversion';jI.note='Fils croisés constatés au test — à reprendre avant fermeture';}}}
  Object.values(state.lines).forEach(l=>{if(l.engine)resyncLine(l);});
  { // numérotation des soudures : ne pas réutiliser un numéro déjà pris (lignes du traceur)
    let mx=0;Object.values(state.lines).forEach(l=>['A','R'].forEach(c=>{if(!l.cond[c])return;l.cond[c].joints.forEach(j=>{const n=+String(j.weldId).replace(/\D/g,'');if(n>mx)mx=n;});}));if(state.nextWeld<=mx)state.nextWeld=mx+1;}
  siteStore[id]={NET,lines:state.lines,sheets:state.sheets,nextWeld:state.nextWeld,sheetId:state.sheetId,firstLine:roots[0]?roots[0].id:null};
  state.locate={...state.locate,line:roots[0]?roots[0].id:null};bgG.dataset.sheet='';
}
async function preloadRemote(id){try{if(!siteStore[id]&&await sync.user()){state.remoteLS[id]=await sync.loadLineStates(id);state.remoteWelds=await sync.loadWelds(id);}else state.remoteWelds=null;}catch(e){console.warn(e);state.remoteWelds=null;}}
function applyRemoteWelds(){const rows=state.remoteWelds;if(!rows||!rows.length)return;let n=0;rows.forEach(r=>{const f=findWeld(r.weld_id);if(!f)return;const j=f.j;j.status=r.status||j.status;const d=r.data||{};if(d.events)j.events=d.events.map(e=>({...e,at:new Date(e.at)}));if(d.conn)j.conn=d.conn;if(d.wire)j.wire=d.wire;if(d.tee!==undefined)j.tee=d.tee||undefined;if(d.cont!==undefined)j.cont=d.cont;if(d.iso!==undefined)j.iso=d.iso;if(d.isoVal!==undefined)j.isoVal=d.isoVal;if(d.note!==undefined)j.note=d.note;if(d.steps!==undefined)j.steps=d.steps||undefined;if(d.photos)j.photos=d.photos;n++;});Object.values(state.lines).forEach(l=>{if(l.engine)resyncLine(l);});if(n)toast(n+' soudures rechargées depuis le serveur');state.remoteWelds=null;}
async function pullRemote(id){try{if(!(await sync.user()))return;state.remoteWelds=await sync.loadWelds(id);if(state.siteId===id){applyRemoteWelds();renderAll();}}catch(e){console.warn(e);}}
// date de version d'une copie locale de chantier (serveur > traceur > rien)
const localUpdatedOf=net=>net?(net.updated_at?Date.parse(net.updated_at):(net.traceur&&net.traceur.savedAt?Date.parse(net.traceur.savedAt):0)):0;
// recharge un chantier depuis le serveur (plan modifié sur un autre appareil) : copie locale et cache traceur remis à jour, rechargé à l'écran si c'est celui qui est ouvert
async function refreshSiteFromServer(id){try{const net=await sync.loadSite(id);if(!net)return;if(net.deleted){const hm=hiddenMap();hm[id]=net.deletedAt?Date.parse(net.deletedAt):Date.now();try{localStorage.setItem('trace:hiddenAt',JSON.stringify(hm));}catch(e){}removeSiteOption(id);toast('Chantier supprimé depuis un autre appareil');return;}
  if(!net.lines)return;SITES[id]=net;delete siteStore[id];if(net.traceur){try{await kv.set('trace:handoff:'+id,{...net,sent:true,sentAt:Date.now()});}catch(e){}}
  addSiteOption(net);if(state.siteId===id){const keep={k:state.view.k,tx:state.view.tx,ty:state.view.ty,tab:state.tab};await switchSite(id);state.view=keep;state.tab=keep.tab;applyView();renderAll();toast('Plan mis à jour depuis un autre appareil');}}catch(e){console.warn(e);}}
// abonnement temps réel au chantier ouvert : statuts de soudure appliqués en direct, plan rechargé s'il change ailleurs
function rtSubscribe(id){if(state.rtOff){try{state.rtOff();}catch(e){}state.rtOff=null;}if(!id||id==='__vide')return;
  state.rtOff=sync.subscribeSite(id,{
    onWeld:row=>{if(!row||!row.weld_id)return;const f=findWeld(row.weld_id);if(!f)return;const j=f.j;j.status=row.status||j.status;const d=row.data||{};if(d.events)j.events=d.events.map(e=>({...e,at:new Date(e.at)}));if(d.conn)j.conn=d.conn;if(d.wire)j.wire=d.wire;if(d.tee!==undefined)j.tee=d.tee||undefined;if(d.cont!==undefined)j.cont=d.cont;if(d.iso!==undefined)j.iso=d.iso;if(d.isoVal!==undefined)j.isoVal=d.isoVal;if(d.note!==undefined)j.note=d.note;if(d.photos)j.photos=d.photos;scheduleRender();if(state.tab!=='plan')renderAll();},
    onSite:row=>{if(!row||!row.id)return;if(Date.now()-(state.ownSiteWrite||0)<15000)return;const cur=SITES[row.id];const at=row.updated_at?Date.parse(row.updated_at):0;if(at&&at>localUpdatedOf(cur)+1000)refreshSiteFromServer(row.id);}});}
// filet de sécurité sans temps réel : toutes les 90 s (onglet visible), statuts + version du plan
setInterval(async()=>{try{if(document.visibilityState!=='visible'||!state.cloudUser||!state.siteId||state.siteId==='__vide')return;pullRemote(state.siteId);const meta=await sync.listSiteMeta();if(!meta)return;const m=meta.find(x=>x.id===state.siteId);if(m&&m.updated_at&&Date.parse(m.updated_at)>localUpdatedOf(SITES[state.siteId])+1000&&Date.now()-(state.ownSiteWrite||0)>=15000)refreshSiteFromServer(state.siteId);}catch(e){}},90000);
async function switchSite(id){if(state.calage)endCalage();if(siteStore[state.siteId]){siteStore[state.siteId].nextWeld=state.nextWeld;}state.siteId=id;rtSubscribe(id);try{if(id&&id!=='__vide')localStorage.setItem('trace:lastSite',id);}catch(e){}closeSheet();await preloadRemote(id);setupSite(id);applyRemoteWelds();if(siteStore[id])pullRemote(id);state.filter='all';renderAll();fitView();renderPlan();}
function importReportHTML(){const r=NET.report||{};let h=`<h2>Rapport d'import — ${esc(NET.name)}</h2><p><b>Source :</b> ${esc(NET.source||'')}<br><b>Fournisseur :</b> ${esc(NET.supplier)} (série ${NET.serie||'?'}) · <b>Système de coordonnées :</b> ${esc(NET.crs||'')}<br><b>Méthode :</b> ${esc(NET.method||'')}</p>`;
  const lines=Object.values(state.lines);const nJ=allJoints().length;h+=`<p><b>Résultat :</b> ${lines.length} lignes (${lines.filter(l=>!l.parent).length} racines, ${lines.filter(l=>l.parent).length} antennes), ${lines.reduce((s,l)=>s+l.els.length,0)} éléments, ${nJ} soudures (aller + retour).</p>`;
  if(r.A||r.R){['A','R'].forEach(c=>{const x=r[c];if(!x)return;h+=`<p><b>${c==='A'?'Aller':'Retour'} :</b> ${x.barres} barres, ${x.coudes} coudes, ${x.chaines} chaînes dont ${x.antennes} rattachées en antenne, ${x.longueur_m} m · DN (barres) : ${Object.entries(x.DN||{}).map(([k,v])=>k+' ×'+v).join(', ')}${x.racines>1?`<br><span style="color:#7a5200">⚠ ${x.racines-1} chaîne(s) non rattachée(s) : jonction non reconnue, à valider</span>`:''}</p>`;});}
  if(NET.report&&NET.report.pieces!==undefined){const r=NET.report;h+=`<p><b>Lecture des pièces :</b> ${r.pieces} pièces dessinées (${r.pipes} barres dont ${r.fullBars} entières de 12 m, ${r.bends} coudes, ${r.tees} tés, ${r.reducers} réductions), ${r.dnLabels} étiquettes DN → ${r.lines} lignes dont ${r.antennas} antennes rattachées${r.gaps?', '+r.gaps+' écarts entre pièces':''}.</p>`;}
  (NET.warnings||[]).forEach(w=>h+=`<p style="color:#7a5200">⚠ ${esc(w)}</p>`);
  if(NET.source==='traceur'){const rp=NET.report||{};if(rp.lost&&rp.lost.length)h+=`<p style="color:#8a1f1f">⚠ Soudures faites non retrouvées au dernier enregistrement : ${rp.lost.map(esc).join(', ')}</p>`;(NET.lines||[]).forEach(L=>{['A','R'].forEach(c=>{const ns=((L.cond&&L.cond[c]&&L.cond[c].notes)||[]).filter(n=>n.kind!=='info');if(!ns.length)return;h+=`<h3 style="margin:10px 0 4px">${esc(L.name)} — ${c==='A'?'aller':'retour'}</h3>`+ns.map(n=>`<p style="margin:2px 0;color:${n.kind==='err'?'#8a1f1f':n.kind==='doubt'?'#1c3d6b':n.kind==='warn'?'#7a5200':'#52514e'}">${n.kind==='err'?'✖ ':n.kind==='doubt'?'❓ ':n.kind==='warn'?'⚠ ':'↳ '}${esc(n.txt)}</p>`).join('');});});}
  Object.values(state.lines).filter(l=>l.engine&&l.engine.notes.length).forEach(l=>{h+=`<h3 style="margin:10px 0 4px">${esc(l.name)} (${esc(l.id)}) — moteur de pièces${l.engines?' (conduite aller ; le retour a son propre puzzle)':''}</h3>`+l.engine.notes.map(n=>`<p style="margin:2px 0;color:${n.kind==='unknown'||n.kind==='missing'?'#8a1f1f':n.kind==='doubt'?'#1c3d6b':'#7a5200'}">${n.kind==='interp'?'↳ ':n.kind==='missing'?'✚ ':n.kind==='doubt'?'❓ ':'⚠ '}${esc(n.txt)}</p>`).join('');});
  h+=`<p class="hint">Règle : rien n'est déplacé ni recoupé ; ce qui n'est pas reconnu est signalé ici, pas corrigé en silence.</p><div class="actions" style="margin-top:8px"><button class="btn primary block" data-close>Fermer</button></div>`;return h;}

/* ---------- vue plan : rendu ---------- */
const svg=$('#svg'),world=$('#world'),bgG=$('#bg'),netG=$('#net'),mkG=$('#markers'),canvas=$('#canvas'),mapG=$('#map'),gpsG=$('#gps'),hydroG=$('#hydroG'),dhG=$('#dhG'),stockG=$('#stockG');
// géoréférencement du chantier courant (mémorisé sur l'objet NET) : null si le plan n'a pas de coordonnées Lambert
const geoCache=new WeakMap();function siteGeo(){if(!NET)return null;if(!geoCache.has(NET))geoCache.set(NET,geoOfSite(NET));return geoCache.get(NET);}
/* ---------- fond de carte IGN (photo aérienne / plan IGN / cadastre) sous le plan, tuiles Web Mercator recalées dans le repère du plan ---------- */
function renderMap(geoOv,kindOv){const g=geoOv||siteGeo();const kind=kindOv||state.show.carte||'none';const cad=geoOv?false:!!state.show.cadastre;const credit=$('#mapcredit');
  if(!g||(kind==='none'&&!cad)){if(mapG.innerHTML)mapG.innerHTML='';mapG.dataset.key='';bgG.classList.remove('nopaper');if(credit)credit.style.display='none';return;}
  const sh=sheet();const v=state.view,k=v.k;const cw=canvas.clientWidth||400,ch=canvas.clientHeight||500;
  const box=[(-v.tx)/k,(-v.ty)/k,(cw-v.tx)/k,(ch-v.ty)/k];const T=tilesFor(g,box,k*sh.ppm,19,90);if(!T){mapG.innerHTML='';return;}
  bgG.classList.toggle('nopaper',kind!=='none');if(credit)credit.style.display='block';
  const xs=T.tiles.map(t=>t.x),ys=T.tiles.map(t=>t.y);const mx=Math.min(...xs),my=Math.min(...ys);const key=`${kind}:${cad?1:0}:${T.z}:${mx}-${Math.max(...xs)}:${my}-${Math.max(...ys)}`;
  // coordonnées LOCALES (première tuile à 0,0) : au-delà de ~2^25 px, Chrome ne dessine plus les <image> (tuiles z18-19 à 6·10^7–1,3·10^8 px) → l'origine passe dans la matrice
  const ox=mx*256,oy=my*256;const [a,b,c,d,e,f]=T.matrix;const mat=`matrix(${[a,b,c,d,e+a*ox+c*oy,f+b*ox+d*oy].map(x=>(+x).toPrecision(10)).join(' ')})`;
  if(mapG.dataset.key!==key){mapG.dataset.key=key;const img=(kd,op)=>T.tiles.map(t=>`<image href="${ignTileURL(kd,T.z,t.x,t.y)}" x="${(t.x-mx)*256}" y="${(t.y-my)*256}" width="256.5" height="256.5" ${op?`opacity="${op}"`:''}/>`).join('');
    mapG.innerHTML=(kind!=='none'?`<g data-layer="${kind}" transform="${mat}">${img(kind)}</g>`:'')+(cad?`<g data-layer="cadastre" transform="${mat}">${img('cadastre',.85)}</g>`:'');}
  else{[...mapG.children].forEach(ch=>ch.setAttribute('transform',mat));}}
/* ---------- position GPS de l'opérateur sur le plan (point bleu + cercle de précision), bouton ◎ ---------- */
state.gps={watch:null,fix:null,follow:false,err:null};
function gpsBtn(){return $('.zoomctl [data-z=gps]');}
function gpsToggle(){const g=siteGeo();if(!g){toast('Plan non géoréférencé : la position ne peut pas être placée dessus');return;}
  if(!('geolocation' in navigator)){toast('Géolocalisation indisponible sur cet appareil');return;}
  if(window.isSecureContext===false){toast('La localisation exige une page en https');return;}
  if(state.gps.watch!==null){navigator.geolocation.clearWatch(state.gps.watch);state.gps.watch=null;state.gps.follow=false;gpsBtn().classList.remove('gpsOn','gpsWait');renderGps();return;}
  state.gps.follow=true;state.gps.errAt=0;gpsBtn().classList.add('gpsWait');toast('Recherche de la position…');
  const opts={enableHighAccuracy:true,maximumAge:5000,timeout:20000};
  // 1) appel direct DANS le geste de l'utilisateur : c'est lui qui fait apparaître la demande d'autorisation du navigateur
  try{navigator.geolocation.getCurrentPosition(p=>gpsFix(p),e=>gpsError(e),opts);}catch(e){}
  // 2) puis le suivi continu
  state.gps.watch=navigator.geolocation.watchPosition(p=>gpsFix(p),e=>gpsError(e),opts);}
function gpsFix(p){const g=siteGeo();if(!g)return;state.gps.err=null;const first=!state.gps.fix;state.gps.fix={lat:p.coords.latitude,lon:p.coords.longitude,acc:p.coords.accuracy||0,at:Date.now()};const b=gpsBtn();if(b){b.classList.remove('gpsWait');b.classList.add('gpsOn');}
  if(first||state.gps.follow){const pp=lonLatToPlan(g,state.gps.fix.lon,state.gps.fix.lat);const bb=sheetBBox(sheet());const far=Math.hypot(Math.max(0,bb[0]-pp[0],pp[0]-bb[2]),Math.max(0,bb[1]-pp[1],pp[1]-bb[3]));
    if(far>20000)toast(`Tu es à ${fmtDist(far)} du chantier — position affichée hors plan`);if(first)centerOn(pp[0],pp[1],Math.max(state.view.k,6));else renderGps();state.gps.follow=false;}
  else renderGps();}
function gpsError(e){const now=Date.now();if(now-(state.gps.errAt||0)<2000)return;state.gps.errAt=now;state.gps.err=e.code;const b=gpsBtn();if(b)b.classList.remove('gpsWait');
  if(e.code===1){gpsHelpModal();return;}
  toast(e.code===3?'Position introuvable (délai dépassé) — réessaie à l\'extérieur, GPS activé':'Position introuvable pour le moment (GPS) — réessaie dehors');}
// la localisation a été refusée (ou bloquée dans les réglages) : le navigateur ne redemande jamais tout seul → on explique comment la réactiver, selon l'appareil
function gpsHelpModal(){const ua=navigator.userAgent;const ios=/iPhone|iPad|iPod/i.test(ua)||(navigator.platform==='MacIntel'&&navigator.maxTouchPoints>1);const android=/Android/i.test(ua);const standalone=window.matchMedia&&window.matchMedia('(display-mode: standalone)').matches||navigator.standalone;
  const steps=ios?`<ol style="padding-left:18px;margin:6px 0"><li>Réglages iPhone → <b>Confidentialité et sécurité</b> → <b>Service de localisation</b> : activé, puis <b>${standalone?'l\'app TRACÉ (écran d\'accueil)':'Safari'}</b> → « <b>Lors de l\'utilisation</b> ».</li>${standalone?'':'<li>Dans Safari, touche « <b>AA</b> » (ou « ⋯ ») à gauche de l\'adresse → <b>Réglages du site web</b> → <b>Position</b> → « Autoriser » (ou « Demander »).</li><li>Sinon : Réglages → Apps → <b>Safari</b> → <b>Position</b> → « Demander ».</li>'}</ol>`
    :android?`<ol style="padding-left:18px;margin:6px 0"><li>Touche le <b>cadenas</b> (ou ⓘ) à gauche de l\'adresse → <b>Autorisations</b> → <b>Position</b> → « Autoriser », puis recharge la page.</li><li>Sinon : Paramètres Android → Applications → <b>Chrome</b> → Autorisations → <b>Position</b> → « Autoriser ».</li><li>Vérifie que la <b>localisation du téléphone</b> est allumée (barre de raccourcis).</li></ol>`
    :`<ol style="padding-left:18px;margin:6px 0"><li>Clique l\'icône à gauche de l\'adresse (cadenas / réglages du site) → <b>Position</b> → « Autoriser », puis recharge.</li></ol>`;
  openModal(`<h3 style="margin-top:0">📍 Localisation refusée</h3><p class="muted" style="font-size:13px">Le navigateur a mémorisé un refus pour ce site (ou la localisation est coupée dans les réglages) : il ne redemande pas tout seul. Pour la réactiver :</p>${steps}<p class="hint">Quand c\'est fait, touche « Réessayer » : la demande d\'autorisation doit apparaître (sinon recharge la page et retouche ◎).</p><div class="actions" style="display:flex;gap:6px"><button class="btn primary" id="gpsRetry">Réessayer</button><button class="btn" id="gpsHelpClose">Fermer</button></div>`);
  $('#gpsHelpClose').onclick=closeModal;$('#gpsRetry').onclick=()=>{closeModal();if(state.gps.watch!==null){navigator.geolocation.clearWatch(state.gps.watch);state.gps.watch=null;}gpsToggle();};}
function renderGps(){const C=state.calage;if(C&&C.mode==='plan'){const k=state.view.k;gpsG.innerHTML=C.pairs.map((p,i)=>pin(p.plan[0],p.plan[1],i+1,k)).join('')+(C.cur.plan?pin(C.cur.plan[0],C.cur.plan[1],C.pairs.length+1,k):'');return;}
  const g=siteGeo();const fx=state.gps.fix;if(!g||!fx||state.gps.watch===null){gpsG.innerHTML='';return;}
  const [x,y]=lonLatToPlan(g,fx.lon,fx.lat);const k=state.view.k;const ppm=sheet().ppm;const r=Math.max(0,fx.acc)*ppm;const age=(Date.now()-fx.at)/1000;
  gpsG.innerHTML=`<g class="gpsdot" style="pointer-events:none"><circle cx="${x}" cy="${y}" r="${r}" fill="#1c6fd6" fill-opacity=".12" stroke="#1c6fd6" stroke-opacity=".35" stroke-width="${1/k}"/><circle cx="${x}" cy="${y}" r="${11/k}" fill="#fff" opacity=".95"/><circle cx="${x}" cy="${y}" r="${7.5/k}" fill="${age>60?'#8fa6c4':'#1c6fd6'}"/><text x="${x}" y="${y-15/k}" font-size="${11/k}" text-anchor="middle" fill="#1c3d6b" font-family="system-ui,sans-serif" font-weight="600" stroke="#fff" stroke-width="${3/k}" paint-order="stroke">± ${Math.round(fx.acc)} m</text></g>`;}
// position courante utilisable pour horodater une déclaration (fix de moins de 3 min), sinon null
function curPos(){const fx=state.gps.fix;if(!fx||Date.now()-fx.at>180000)return null;return {lat:+fx.lat.toFixed(6),lon:+fx.lon.toFixed(6),acc:Math.round(fx.acc),at:new Date(fx.at).toISOString()};}
// écart entre une déclaration géolocalisée et la soudure sur le plan (m), ou null
function posGap(ev,l,c,j){const g=siteGeo();if(!ev||!ev.pos||!g)return null;const p=jointPos(l,Math.min(j.idx,l.els.length-2),c);if(!p)return null;const [lon,lat]=planToLonLat(g,[p.x,p.y]);return distLL(lon,lat,ev.pos.lon,ev.pos.lat);}
/* ---------- calage à la main sur la carte (chef / bureau) : 1 ou 2 repères « sur le plan » ↔ « sur la photo aérienne » → affine plan→Lambert 93, enregistrée dans le chantier (net.geo) ---------- */
state.calage=null;
const cgMsg=t=>{const m=$('#cgMsg');if(m)m.innerHTML=t;};
function startCalage(){if(!(role()==='chef'||role()==='bureau')){toast('Réservé au chef / bureau');return;}if(!NET||NET.id==='__vide'){toast('Aucun chantier ouvert');return;}
  toggleDisp(false);closeSheet();state.calage={mode:'plan',pairs:[],cur:{},planView:{...state.view},mapView:null,mapGeo:null,layer:'ortho',geoName:null};
  $('#calageBar').style.display='flex';$('#cgMapRow').style.display='none';$('#cgOneRow').style.display='none';
  cgMsg('<b>Repère 1 — sur le PLAN :</b> touche un point précis (soudure à un angle, coude, bout de ligne…). Zoome d\'abord si besoin.');renderPlan();}
function endCalage(){if(!state.calage)return;if(state.calage.mode==='map')state.view={...state.calage.planView};state.calage=null;$('#calageBar').style.display='none';applyView();renderPlan();}
async function calageEnterMap(){const C=state.calage;C.mode='map';C.planView={...state.view};$('#cgMapRow').style.display='flex';$('#cgOneRow').style.display=C.pairs.length===1&&!C.cur.ll?'flex':'none';
  if(!C.mapGeo){// première entrée : on cherche la commune du chantier (nom du chantier avant le tiret), sinon centre de la France
    let c=null;const guess=(NET.name||'').split(/[—–-]/)[0].replace(/\(.*\)/,'').trim();if(guess.length>=3){cgMsg('Recherche de « '+esc(guess)+' »…');try{c=await geocode(guess);}catch(e){}}
    const lat=c?c.lat:46.6,lon=c?c.lon:2.3;const [X0,Y0]=CRS['EPSG:3857'].fwd(lon,lat);C.mapGeo={crs:'EPSG:3857',aff:{a:1,b:0,e:X0,c:0,d:-1,f:Y0}};C.geoName=c?c.label:null;
    const cw=canvas.clientWidth||400,ch=canvas.clientHeight||500;const k=c?0.35:0.00035;C.mapView={k,tx:cw/2,ty:ch/2};}
  state.view={...C.mapView};applyView();
  cgMsg(`<b>Repère ${C.pairs.length+1} — sur la PHOTO :</b> touche le même endroit${C.geoName?` (centrée sur ${esc(C.geoName)})`:''}. Cherche l'adresse ci-dessous si besoin, zoome, puis touche.`);renderPlan();}
function calageTap(wx,wy){const C=state.calage;if(!C)return;
  if(C.mode==='plan'){C.cur={plan:[wx,wy]};calageEnterMap();return;}
  C.cur.ll=planToLonLat(C.mapGeo,[wx,wy]);C.pairs.push(C.cur);C.cur={};C.mapView={...state.view};
  if(C.pairs.length>=2){calageFinish();return;}
  C.mode='plan';state.view={...C.planView};applyView();$('#cgMapRow').style.display='none';$('#cgOneRow').style.display='flex';
  cgMsg('<b>Repère 2 — sur le PLAN :</b> touche un second point, le plus loin possible du premier (l\'échelle et l\'orientation en dépendent).');renderPlan();}
function calageFinish(){const C=state.calage;const sh=sheet();const s0=1/(sh.ppm||1);const R=similarityFromPairs(C.pairs,s0);
  if(!R){toast('Repères trop proches — recommence');endCalage();return;}
  const ratioTxt=C.pairs.length>=2?`échelle ×${R.ratio.toFixed(2)}${Math.abs(R.ratio-1)>0.1?' ⚠ (le plan n\'est pas à l\'échelle, ou un repère est mal pointé)':' ✓'} · nord du plan tourné de ${Math.round(R.rot)}° · repères distants de ${fmtDist(R.d)}`:'1 repère : plan supposé à l\'échelle, nord en haut';
  if(!confirm(`Calage prêt — ${ratioTxt}.\nEnregistrer pour ce chantier ?`)){endCalage();return;}
  const geo={crs:R.crs,aff:R.aff,pts:C.pairs.map(p=>({plan:p.plan.map(v=>+v.toFixed(3)),ll:p.ll.map(v=>+v.toFixed(7))})),by:(me()||{}).name||state.userId,at:new Date().toISOString(),s:+R.s.toFixed(6),rot:+R.rot.toFixed(2)};
  endCalage();saveGeo(geo);}
async function saveGeo(geo){NET.geo=geo;geoCache.delete(NET);if(SITES[NET.id])SITES[NET.id].geo=geo;
  try{const h=await kv.get('trace:handoff:'+NET.id);if(h){h.geo=geo;await kv.set('trace:handoff:'+NET.id,h);}}catch(e){}
  if(geo){state.show.carte=state.show.carte&&state.show.carte!=='none'?state.show.carte:'ortho';saveShow();}
  renderDisp();renderPlan();toast(geo?'Plan calé sur la carte — enregistrement…':'Calage oublié');
  try{const {demo,...clean}=NET;const okk=await sync.saveSite(clean);if(okk){state.ownSiteWrite=Date.now();setCloudBadge('calage enregistré '+new Date().toLocaleTimeString('fr-FR'));}else toast('Calage gardé sur cet appareil (serveur injoignable ou non connecté)');}catch(e){console.warn(e);}}
function forgetGeo(){if(!NET||!NET.geo)return;if(!confirm('Oublier le calage à la main de ce chantier ?'))return;delete NET.geo;geoCache.delete(NET);saveGeo(undefined);}
function renderCalageMap(){const C=state.calage;netG.style.display='none';bgG.style.display='none';mkG.style.display='none';const ob=$('#offscreen');if(ob)ob.style.display='none';
  renderMap(C.mapGeo,C.layer);const k=state.view.k;let pins='';C.pairs.forEach((p,i)=>{const q=lonLatToPlan(C.mapGeo,p.ll[0],p.ll[1]);pins+=pin(q[0],q[1],i+1,k);});
  // réticule au centre pour viser précisément
  const cw=canvas.clientWidth||400,ch=canvas.clientHeight||500;const v=state.view;const cx=(cw/2-v.tx)/k,cy=(ch/2-v.ty)/k;
  pins+=`<g style="pointer-events:none" opacity=".55"><line x1="${cx-18/k}" y1="${cy}" x2="${cx+18/k}" y2="${cy}" stroke="#fff" stroke-width="${3/k}"/><line x1="${cx}" y1="${cy-18/k}" x2="${cx}" y2="${cy+18/k}" stroke="#fff" stroke-width="${3/k}"/><line x1="${cx-18/k}" y1="${cy}" x2="${cx+18/k}" y2="${cy}" stroke="#0b0b0b" stroke-width="${1/k}"/><line x1="${cx}" y1="${cy-18/k}" x2="${cx}" y2="${cy+18/k}" stroke="#0b0b0b" stroke-width="${1/k}"/></g>`;
  gpsG.innerHTML=pins;}
const pin=(x,y,n,k)=>`<g style="pointer-events:none"><circle cx="${x}" cy="${y}" r="${13/k}" fill="#d03b3b" stroke="#fff" stroke-width="${2.5/k}"/><text x="${x}" y="${y+4.5/k}" font-size="${12/k}" font-weight="700" text-anchor="middle" fill="#fff" font-family="system-ui,sans-serif">${n}</text></g>`;
$('#cgCancel').addEventListener('click',endCalage);
$('#cgOne').addEventListener('click',()=>{const C=state.calage;if(!C||C.pairs.length<1)return;calageFinish();});
$('#cgLayer').addEventListener('click',()=>{const C=state.calage;if(!C)return;C.layer=C.layer==='ortho'?'plan':'ortho';mapG.dataset.key='';renderPlan();});
$('#cgGo').addEventListener('click',async()=>{const C=state.calage;if(!C||C.mode!=='map')return;const q=$('#cgAddr').value;if(!q.trim())return;cgMsg('Recherche…');const c=await geocode(q);if(!c){cgMsg('<b>Adresse introuvable.</b> Essaie « commune, rue » ou des coordonnées « 47.84, -1.68 », ou déplace la carte à la main.');return;}
  const [x,y]=lonLatToPlan(C.mapGeo,c.lon,c.lat);const cw=canvas.clientWidth||400,ch=canvas.clientHeight||500;const k=Math.max(state.view.k,0.6);state.view={k,tx:cw/2-x*k,ty:ch/2-y*k};applyView();C.geoName=c.label;cgMsg(`<b>Repère ${C.pairs.length+1} — sur la PHOTO :</b> carte centrée sur ${esc(c.label)}. Zoome et touche le même endroit que sur le plan.`);renderPlan();});
$('#cgAddr').addEventListener('keydown',e=>{if(e.key==='Enter'){e.preventDefault();$('#cgGo').click();}});
document.addEventListener('visibilitychange',()=>{if(document.visibilityState!=='visible'&&state.gps.watch!==null){navigator.geolocation.clearWatch(state.gps.watch);state.gps.watch=null;const b=gpsBtn();if(b)b.classList.remove('gpsOn','gpsWait');gpsG.innerHTML='';}});
const sheet=()=>state.sheets[state.sheetId];
/* ---------- onglet Hydraulique : prestations, sectorisation en tronçons, volumes, by-pass / kits fin de ligne, skid ---------- */
state.hydroPose=null;let hydroCache=null;let hydroSaveT=null;
const TCOLS=['#eb6834','#2a78d6','#0ca30c','#8a2be2','#b8860b','#d03b3b','#0b7a75','#c2185b'];
const HYDRO_ICON={epreuve:'🧪',rincage:'🌊',passivation:'⚗️',remplissage:'💧'};
const HYDRO_DESC={epreuve:'Mise en pression (1,3 × PS, paliers). Statique : l’eau ne circule pas.',rincage:'Circulation ≥ vitesse cible pour évacuer laitier et débris. Aller → bout → retour.',passivation:'Circulation d’une solution de traitement, temps de contact à respecter.',remplissage:'Remplissage lent par le point bas, purges hautes ouvertes, eau traitée.'};
function hydroOf(){if(!NET||NET.id==='__vide')return null;if(!NET.hydro)NET.hydro={prest:{epreuve:true},params:{},cuts:[],water:[],fills:[],skids:[],cal:[]};const h=NET.hydro;h.prest=h.prest||{};h.params=h.params||{};h.cuts=h.cuts||[];h.water=h.water||[];h.cal=h.cal||[];
  if(!h.fills){h.fills=h.fill?[h.fill]:[];delete h.fill;} // migration : une seule zone → plusieurs zones de remplissage
  if(!h.skids){h.skids=h.skid?[h.skid]:[];delete h.skid;}
  return h;}
function hydroParams(){const h=hydroOf();return {...HYDRO_DEFAULTS,...((h&&h.params)||{})};}
function hydroLines(){const sh=sheet();return ((sh&&sh.lines)||[]).map(id=>state.lines[id]).filter(Boolean);}
function hydroNorm(){return hydroLines().map(l=>{const els=(l.els||[]).map(e=>({id:e.id,kind:e.kind,dn:e.dn,m0:e.m0,m1:e.m1,len:e.len}));
  const real=(l.els||[]).filter(e=>!e.link);const first=real[0],last=real[real.length-1];
  const endKind=(l.els||[]).slice(-3).some(e=>e.kind==='bypass')?'bypass':(last?last.kind:'pipe');
  let pm=l.parentM;if(pm==null&&l.parent&&state.lines[l.parent]){const P=state.lines[l.parent];const pe=(l.parentElIdx!=null&&P.els&&P.els[l.parentElIdx])||((P.els||[]).find(e=>e.branch===l.id||e.branchLine===l.id));pm=pe?((pe.m0+pe.m1)/2):0;}
  const endWelds=[];if(last&&last.kind==='endcap'){const iE=(l.els||[]).indexOf(last);['A','R'].forEach(c=>{const cd=l.cond[c];if(!cd)return;const j=cd.joints[iE-1]||cd.joints[cd.joints.length-1];if(j)endWelds.push({weldId:j.weldId,status:j.status,cond:c});});}
  return {id:l.id,name:l.name||l.id,length:l.length||0,nCond:l.single?1:2,els,parent:(l.parent&&state.lines[l.parent])?l.parent:null,parentM:pm||0,startKind:first?first.kind:'pipe',endKind,endWelds};});}
function nearestOnLines(wx,wy){let best=null;hydroLines().forEach(l=>{(l.els||[]).forEach(e=>{const pl=e.axis&&e.axis[0];if(!pl||pl.length<2)return;let dAcc=0;
  for(let i=1;i<pl.length;i++){const a=pl[i-1],b=pl[i];const vx=b.x-a.x,vy=b.y-a.y;const s2=vx*vx+vy*vy;const segL=Math.sqrt(s2);const t=s2?Math.max(0,Math.min(1,((wx-a.x)*vx+(wy-a.y)*vy)/s2)):0;
    const px=a.x+vx*t,py=a.y+vy*t;const d=Math.hypot(wx-px,wy-py);if(!best||d<best.d)best={d,x:px,y:py,line:l.id,el:e,frac:dAcc+segL*t};dAcc+=segL;}});});
  if(best){const pl=best.el.axis[0];best.m=best.el.m0+(best.frac/Math.max(.001,polyLen(pl)))*(best.el.m1-best.el.m0);}
  return best;}
function subAxis(l,ma,mb){const out=[];(l.els||[]).forEach(e=>{const a=Math.max(ma,e.m0),b=Math.min(mb,e.m1);if(b-a<=0.02)return;const pl=e.axis&&e.axis[0];if(!pl||pl.length<2)return;const L=polyLen(pl);const sp=e.m1-e.m0||1;out.push(axisSub(pl,L*(a-e.m0)/sp,L*(b-e.m0)/sp));});return out;}
function hydroBuild(){if(hydroCache)return hydroCache;const h=hydroOf();if(!h)return null;
  const fillAts=(h.fills||[]).map(f=>{const n=nearestOnLines(f.x,f.y);return n?{line:n.line,m:n.m,x:n.x,y:n.y,fx:f.x,fy:f.y}:null;}).filter(Boolean);
  hydroCache=buildHydro(hydroNorm(),{prest:h.prest,params:hydroParams(),cuts:h.cuts,fills:fillAts});hydroCache.fillAts=fillAts;return hydroCache;}
function saveHydro(){const h=hydroOf();if(!h)return;hydroCache=null;if(SITES[NET.id])SITES[NET.id].hydro=h;
  kv.get('trace:handoff:'+NET.id).then(x=>{if(x){x.hydro=h;return kv.set('trace:handoff:'+NET.id,x);}}).catch(()=>{});
  clearTimeout(hydroSaveT);hydroSaveT=setTimeout(async()=>{try{const {demo,...clean}=NET;const okk=await sync.saveSite(clean);if(okk){state.ownSiteWrite=Date.now();setCloudBadge('hydraulique enregistrée '+new Date().toLocaleTimeString('fr-FR'));}}catch(e){console.warn(e);}},1200);}
const hydroCanEdit=()=>role()==='chef'||role()==='bureau';
const HY_MSG={cut:'✂ <b>Sectoriser :</b> touche le réseau là où l’épreuve s’arrête (vanne ou soudure). Re-touche une coupe pour l’enlever.',water:'💧 <b>Point d’eau :</b> touche l’emplacement de la borne (une borne OSM affichée = tape dessus pour la retenir). Re-touche pour enlever.',fill:'🚰 <b>Zones de remplissage :</b> touche l’endroit où le skid se branche — une zone par tronçon. Re-touche pour enlever.',skid:'⬛ <b>Skids :</b> touche chaque emprise au sol souhaitée (↻ pivote le dernier posé).'};
function updateHydroBar(){const bar=$('#hydroBar');if(!bar)return;const on=!!state.hydroPose;bar.style.display=on?'flex':'none';if(!on)return;$('#hyMsg').innerHTML=HY_MSG[state.hydroPose]||'';const h=hydroOf();$('#hyRot').style.display=state.hydroPose==='skid'&&h&&h.skids&&h.skids.length?'':'none';}
function startHydroPose(kind){if(!hydroCanEdit()){toast('Réservé au chef / bureau');return;}if(!NET||NET.id==='__vide'||!hydroLines().length){toast('Aucun réseau dans ce chantier');return;}
  state.hydroPose=kind;hydroCache=null;state.tab='plan';closeSheet();renderAll();updateHydroBar();}
function endHydroPose(){if(!state.hydroPose)return;state.hydroPose=null;updateHydroBar();state.tab='hydro';renderAll();}
function hydroTap(wx,wy){const h=hydroOf();if(!h)return;const k=state.view.k;const rmR=18/k;const kind=state.hydroPose;
  if(kind==='cut'){const hitC=h.cuts.findIndex(c=>{const l=state.lines[c.line];if(!l)return false;const p=posAtChainage(l,c.m);return Math.hypot(p.x-wx,p.y-wy)<rmR;});
    if(hitC>=0){h.cuts.splice(hitC,1);saveHydro();toast('Coupe enlevée');renderPlan();return;}
    const n=nearestOnLines(wx,wy);if(!n||n.d>36/k){toast('Touche le réseau (zoome si besoin)');return;}
    h.cuts.push({line:n.line,m:+n.m.toFixed(1)});saveHydro();const H=hydroBuild();toast('Coupe posée — '+H.troncons.length+' tronçon'+(H.troncons.length>1?'s':''));renderPlan();return;}
  if(kind==='water'){const hit=h.water.findIndex(w=>Math.hypot(w.x-wx,w.y-wy)<rmR);
    if(hit>=0){h.water.splice(hit,1);saveHydro();toast('Point d’eau enlevé');renderPlan();return;}
    const osm=(state.osmHydrants||[]).reduce((b,o)=>{const d=Math.hypot(o.x-wx,o.y-wy);return d<rmR&&(!b||d<b.d)?{o,d}:b;},null); // borne OSM proche : on la retient à sa position exacte
    const px2=osm?osm.o.x:+wx.toFixed(1),py2=osm?osm.o.y:+wy.toFixed(1);
    h.water.push({x:px2,y:py2});saveHydro();toast(osm?'Borne OSM retenue (B'+h.water.length+')':'Point d’eau B'+h.water.length);renderPlan();return;}
  if(kind==='fill'){const hit=h.fills.findIndex(f=>Math.hypot(f.x-wx,f.y-wy)<rmR);
    if(hit>=0){h.fills.splice(hit,1);saveHydro();toast('Zone de remplissage enlevée');renderPlan();return;}
    h.fills.push({x:+wx.toFixed(1),y:+wy.toFixed(1)});saveHydro();const H=hydroBuild();toast('Zone de remplissage Z'+h.fills.length+(H&&H.totals.noFill?' — il reste '+H.totals.noFill+' tronçon(s) sans zone':''));renderPlan();return;}
  if(kind==='skid'){const hit=h.skids.findIndex(sk=>Math.hypot(sk.x-wx,sk.y-wy)<rmR*1.6);
    if(hit>=0){h.skids.splice(hit,1);saveHydro();updateHydroBar();toast('Skid enlevé');renderPlan();return;}
    h.skids.push({x:+wx.toFixed(1),y:+wy.toFixed(1),rot:0});saveHydro();updateHydroBar();toast('Skid posé — ↻ pour pivoter');renderPlan();return;}}
function hydroOverlaySVG(k,mini){const H=hydroBuild();if(!H)return '';const h=hydroOf();const ppm=sheet().ppm||1;let s='';
  H.troncons.forEach(t=>{const col=TCOLS[t.idx%TCOLS.length];t.segs.forEach(sg=>{const l=state.lines[sg.line];if(!l)return;
    subAxis(l,sg.m0,sg.m1).forEach(pl=>{const d=pathD(pl);s+=`<path d="${d}" stroke="#fff" stroke-width="${9/k}" fill="none" stroke-linejoin="round" stroke-linecap="round" opacity=".8"/><path d="${d}" stroke="${col}" stroke-width="${5/k}" fill="none" stroke-linejoin="round" stroke-linecap="round" opacity=".9"/>`;});});});
  (h.skids||[]).forEach(sk=>{const P=hydroParams();const W=P.skidL*ppm,Ht=P.skidW*ppm;s+=`<g transform="translate(${sk.x} ${sk.y}) rotate(${sk.rot||0})"><rect x="${-W/2}" y="${-Ht/2}" width="${W}" height="${Ht}" fill="#1c6fd6" fill-opacity=".13" stroke="#1c6fd6" stroke-width="${1.6/k}" stroke-dasharray="${5/k} ${3.5/k}"/><text font-size="${Math.min(11/k,Ht*.42)}" text-anchor="middle" dominant-baseline="central" fill="#1c3d6b" font-weight="700" font-family="system-ui,sans-serif">SKID ${fmt(P.skidW)}×${fmt(P.skidL)} m</text></g>`;});
  (state.osmHydrants||[]).forEach(o=>{s+=`<g opacity=".85"><rect x="${o.x-6/k}" y="${o.y-6/k}" width="${12/k}" height="${12/k}" rx="${3/k}" fill="#fff" stroke="#4a7dbb" stroke-width="${1.6/k}"/><text x="${o.x}" y="${o.y+2.8/k}" font-size="${7.5/k}" font-weight="800" text-anchor="middle" fill="#4a7dbb" font-family="system-ui,sans-serif">BI</text></g>`;}); // bornes incendie OSM (indicatives)
  const kpm=k*ppm; // px écran par mètre : pilote ce qui s'affiche — dézoomé pastilles seules, zoomé les textes (mêmes règles sur le plan et la vue d'ensemble)
  const badge=(x,y,txt,bg,fg)=>{const w2=txt.length*6+14;return `<g transform="translate(${x} ${y}) scale(${1/k})"><rect x="${-w2/2}" y="-23" width="${w2}" height="15" rx="7.5" fill="${bg}" opacity=".95"/><text y="-11.8" font-size="9.5" font-weight="800" text-anchor="middle" fill="${fg}" font-family="system-ui,sans-serif">${txt}</text></g>`;};
  H.troncons.forEach(t=>{const col=TCOLS[t.idx%TCOLS.length];t.ends.forEach(en=>{const l=state.lines[en.line];if(!l||!l.length)return;
    const p=posAtChainage(l,Math.max(0.05,Math.min(l.length-0.05,en.m)));let ox=0,oy=0;
    if(en.type==='cut'){const up=t.segs.some(sg=>sg.line===en.line&&Math.abs(sg.m1-en.m)<1e-6);const p0=posAtChainage(l,Math.max(0,en.m-1.5)),p1=posAtChainage(l,Math.min(l.length,en.m+1.5));const nx=p1.x-p0.x,ny=p1.y-p0.y;const nl=Math.hypot(nx,ny)||1;const sg2=up?-1:1;ox=nx/nl*sg2*14/k;oy=ny/nl*sg2*14/k;}
    const x=p.x+ox,y=p.y+oy;
    if(en.fill){s+=`<circle cx="${x}" cy="${y}" r="${5/k}" fill="#1c6fd6" stroke="#fff" stroke-width="${1.8/k}"/>`+badge(x,y,'🚰 remplissage','#1c6fd6','#fff');return;}
    if(en.welded&&en.need==='BP'){s+=`<circle cx="${x}" cy="${y}" r="${5/k}" fill="#d03b3b" stroke="#fff" stroke-width="${1.8/k}"/>`+badge(x,y,'⚠ soudé','#d03b3b','#fff');return;}
    if(en.need==='BP'){s+=`<circle cx="${x}" cy="${y}" r="${5/k}" fill="#0b0b0b" stroke="#ffd9a8" stroke-width="${2/k}"/>`+(kpm>=0.35?badge(x,y,'⇄ BP','#0b0b0b','#ffd9a8'):'');return;}
    if(en.need==='KFL'){s+=`<circle cx="${x}" cy="${y}" r="${4.5/k}" fill="#fff" stroke="${col}" stroke-width="${2/k}"/>`+(kpm>=0.6?badge(x,y,'KFL','#52514e','#fff'):'');return;}
    if(en.need==='EVAC'){s+=`<circle cx="${x}" cy="${y}" r="${4.5/k}" fill="#fff" stroke="${col}" stroke-width="${2/k}"/>`+(kpm>=0.6?badge(x,y,'évac. libre','#3f6480','#fff'):'');return;}
    if(en.already&&kpm>=1.2){s+=badge(x,y,en.already==='bp'?'✓ bouclé (BP)':en.already==='sst'?'✓ SST':'raccordement','#8f8d86','#fff');}});}); // rien à poser = info secondaire, visible seulement zoomé
  H.cuts.forEach(c=>{const l=state.lines[c.line];if(!l)return;const p=posAtChainage(l,c.m);const lab=c.valve?'coupe : vanne '+c.valve:'coupe '+(c.idx+1);const w2=lab.length*5.6+12;
    s+=`<g><circle cx="${p.x}" cy="${p.y}" r="${9/k}" fill="#fff" stroke="#0b0b0b" stroke-width="${1.6/k}"/><text x="${p.x}" y="${p.y+3.6/k}" font-size="${10/k}" text-anchor="middle">✂</text><g transform="translate(${p.x} ${p.y}) scale(${1/k})"><rect x="${-w2/2}" y="12" width="${w2}" height="14" rx="7" fill="#0b0b0b" opacity=".85"/><text y="22.5" font-size="8.5" text-anchor="middle" fill="#fff" font-family="system-ui,sans-serif">${esc(lab)}</text></g></g>`;});
  (h.water||[]).forEach((w,i)=>{s+=`<g><circle cx="${w.x}" cy="${w.y}" r="${12/k}" fill="#1c6fd6" opacity=".16">${mini?'':`<animate attributeName="r" values="${9/k};${14/k};${9/k}" dur="2s" repeatCount="indefinite"/>`}</circle><circle cx="${w.x}" cy="${w.y}" r="${7.5/k}" fill="#1c6fd6" stroke="#fff" stroke-width="${1.8/k}"/><text x="${w.x}" y="${w.y+3/k}" font-size="${8/k}" text-anchor="middle" fill="#fff">💧</text><text x="${w.x}" y="${w.y-11/k}" font-size="${9.5/k}" font-weight="700" text-anchor="middle" fill="#1c3d6b" font-family="system-ui,sans-serif" paint-order="stroke" stroke="#fff" stroke-width="${3/k}">B${i+1}</text></g>`;});
  (h.fills||[]).forEach((f,i)=>{const fa=(H.fillAts||[]).find(x=>x.fx===f.x&&x.fy===f.y);if(fa&&fa.x!==undefined)s+=`<path d="M${f.x} ${f.y} L${fa.x} ${fa.y}" stroke="#1c6fd6" stroke-width="${2/k}" stroke-dasharray="${4/k} ${3/k}" fill="none"/>`;
    const lab=`🚰 REMPLISSAGE Z${i+1}`;const w2=lab.length*6+16;s+=`<g transform="translate(${f.x} ${f.y}) scale(${1/k})"><rect x="${-w2/2}" y="-8" width="${w2}" height="16" rx="8" fill="#1c6fd6"/><text y="3.5" font-size="9" font-weight="800" text-anchor="middle" fill="#fff" font-family="system-ui,sans-serif">${lab}</text></g>`;});
  return s;}
function renderHydroOverlay(){if(!hydroG)return;if(!state.hydroPose||!NET||NET.id==='__vide'){hydroG.innerHTML='';return;}hydroG.innerHTML=`<g style="pointer-events:none">${hydroOverlaySVG(state.view.k,false)}</g>`;}
// bornes incendie de la ville (OpenStreetMap / Overpass) : indicatives, affichées « BI » — en mode 💧 un tap dessus les retient à leur position exacte
async function fetchOsmHydrants(){const g=siteGeo();if(!g){toast('Cale d’abord le chantier sur la carte (👁 → « Caler sur la carte ») pour chercher les bornes');return;}
  const sh=sheet();const bb=sheetBBox(sh);const [lo1,la1]=planToLonLat(g,[bb[0],bb[3]]);const [lo2,la2]=planToLonLat(g,[bb[2],bb[1]]);
  const S=Math.min(la1,la2)-0.003,N=Math.max(la1,la2)+0.003,W2=Math.min(lo1,lo2)-0.004,E=Math.max(lo1,lo2)+0.004;
  toast('Recherche des bornes incendie (OpenStreetMap)…');
  const q=`[out:json][timeout:25];node["emergency"="fire_hydrant"](${S.toFixed(5)},${W2.toFixed(5)},${N.toFixed(5)},${E.toFixed(5)});out;`;
  for(const base of ['https://overpass-api.de/api/interpreter','https://overpass.kumi.systems/api/interpreter']){
    try{const r=await fetch(base,{method:'POST',body:'data='+encodeURIComponent(q),headers:{'Content-Type':'application/x-www-form-urlencoded'}});
      if(!r.ok)continue;const j=await r.json();const el=(j.elements||[]).filter(e=>isFinite(e.lat)&&isFinite(e.lon));
      state.osmHydrants=el.map(e=>{const [x,y]=lonLatToPlan(g,e.lon,e.lat);return {x:+x.toFixed(1),y:+y.toFixed(1),lat:e.lat,lon:e.lon};});
      toast(el.length?el.length+' borne(s) « BI » affichées (OSM) — en mode 💧, tape dessus pour en retenir':'Aucune borne incendie OSM autour du chantier (la base OSM n’est pas exhaustive — pose-les à la main)');
      renderPlan();if(state.tab==='hydro')renderHydro();return;}catch(e){console.warn(e);}}
  toast('Serveur OSM injoignable — réessaie plus tard');}
const fmtMin=m=>!isFinite(m)||m<=0?'—':m<1?'< 1 min':m<90?'≈ '+Math.round(m)+' min':'≈ '+Math.floor(m/60)+' h '+String(Math.round(m%60)).padStart(2,'0');
const frDate=d=>{const x=new Date(d+'T00:00');return isFinite(x)?String(x.getDate()).padStart(2,'0')+'/'+String(x.getMonth()+1).padStart(2,'0'):d;};
/* calendrier prévisionnel (direction A+B validée le 20/08) : pastilles à GLISSER (nom écrit), deux vues sur les mêmes données —
   « Planning » (une ligne par tronçon, fenêtre 2 semaines) et « Mois » (agenda) ; formulaire gardé en secours */
const isoD=d=>d.getFullYear()+'-'+String(d.getMonth()+1).padStart(2,'0')+'-'+String(d.getDate()).padStart(2,'0');
const CAL_DOW=['dim','lun','mar','mer','jeu','ven','sam'];
const calTCol=t=>+t<0?'#0b0b0b':TCOLS[+t%TCOLS.length];
const calEvHTML=(c,i,showT)=>{const o=CAL_OPS[c.op]||CAL_OPS.autre;return `<span class="hyEv" data-ev="${i}" style="background:${o.color};--tc:${calTCol(c.t)}" title="${esc(o.label)} · ${+c.t<0?'tout le chantier':'tronçon '+(+c.t+1)} · ${frDate(c.d)}"><span class="tb"></span>${showT?`<b class="tn" style="background:${calTCol(c.t)}">${+c.t<0?'CH':'T'+(+c.t+1)}</b>`:''}${esc(o.short)}</span>`;};
function calPlanHTML(H,h,print,onlyT){const calAll=h.cal||[];
  const items=calAll.map((c,i)=>({c,i})).filter(x=>onlyT==null||+x.c.t===onlyT||+x.c.t===-1);
  // colonnes : jours {d} — et en impression, si la période est longue, les semaines vides sont repliées en séparateurs {gap:n} (tout apparaît, ça reste lisible)
  let cols=[];const today=isoD(new Date());
  if(print){const ds=[...new Set(items.map(x=>x.c.d))].sort();
    if(!ds.length)cols=[{d:new Date()}];
    else{const start=new Date(ds[0]+'T00:00'),end=new Date(ds[ds.length-1]+'T00:00');const span=Math.round((end-start)/864e5)+1;
      if(span<=21){for(let i=-1;i<span+1;i++)cols.push({d:new Date(start.getTime()+i*864e5)});}
      else{const keep=new Set();ds.forEach(dstr=>{const d=new Date(dstr+'T00:00');for(let o=-1;o<=1;o++)keep.add(isoD(new Date(d.getTime()+o*864e5)));});
        const keys=[...keep].sort();let prev=null;
        keys.forEach(k=>{const d=new Date(k+'T00:00');if(prev){const gap=Math.round((d-prev)/864e5)-1;if(gap>0)cols.push({gap});}cols.push({d});prev=d;});}}}
  else{if(!state.hydroCalStart){const ds=items.map(x=>x.c.d).sort();const d0=ds.length?new Date(ds[0]+'T00:00'):new Date();d0.setDate(d0.getDate()-1);state.hydroCalStart=isoD(d0);}
    const start=new Date(state.hydroCalStart+'T00:00');for(let i=0;i<14;i++)cols.push({d:new Date(start.getTime()+i*864e5)});}
  let rows;if(onlyT!=null){rows=[onlyT];if(items.some(x=>+x.c.t===-1))rows.push(-1);}
  else{rows=H.troncons.map(t=>t.idx);if(H.troncons.length>1||calAll.some(c=>+c.t===-1))rows.push(-1);}
  const tpl=cols.map(c=>c.gap?'30px':'1fr').join(' ');
  let g=`<div class="hyCalWrap"><div class="hyCalGrid" style="grid-template-columns:92px ${tpl};${print?'min-width:0':''}">`;
  g+=`<div class="hyGh"></div>`+cols.map(c=>{if(c.gap)return `<div class="hyGh hyGapH" title="${c.gap} jour(s) sans opération">⋯<small>+${c.gap} j</small></div>`;
    const d=c.d,we=d.getDay()%6===0;return `<div class="hyGh ${we?'we':''}">${String(d.getDate()).padStart(2,'0')}/${String(d.getMonth()+1).padStart(2,'0')}<small>${CAL_DOW[d.getDay()]}</small></div>`;}).join('');
  rows.forEach(t=>{g+=`<div class="hyRowh"><i style="background:${calTCol(t)}"></i>${t<0?'Chantier':'Tronçon '+(t+1)}</div>`;
    cols.forEach(c=>{if(c.gap){g+=`<div class="hyGap"></div>`;return;}
      const dd=isoD(c.d);const evs=items.filter(x=>+x.c.t===t&&x.c.d===dd);
      g+=`<div class="hyCell ${c.d.getDay()%6===0?'we':''} ${dd===today?'today':''}" ${print?'':`data-cald="${dd}" data-calt="${t}"`}>${evs.map(x=>calEvHTML(x.c,x.i)).join('')}</div>`;});});
  return g+'</div></div>';}
function calMoisHTML(H,h){const cal=h.cal||[];
  if(!state.hydroCalMonth){const ds=cal.map(c=>c.d).sort();const d0=ds.length?new Date(ds[0]+'T00:00'):new Date();state.hydroCalMonth=d0.getFullYear()+'-'+String(d0.getMonth()+1).padStart(2,'0');}
  const [y,m]=state.hydroCalMonth.split('-').map(Number);const first=new Date(y,m-1,1);const start=new Date(first.getTime()-((first.getDay()+6)%7)*864e5);
  const today=isoD(new Date());
  let g=`<div class="hyCalWrap"><div class="hyMonth">`+['lun','mar','mer','jeu','ven','sam','dim'].map(x=>`<div class="hyMh">${x}</div>`).join('');
  for(let i=0;i<42;i++){const d=new Date(start.getTime()+i*864e5);const dd=isoD(d);const off=d.getMonth()!==m-1;
    const evs=cal.map((c,j)=>({c,j})).filter(x=>x.c.d===dd);
    g+=`<div class="hyDay ${off?'off':''} ${d.getDay()%6===0?'we':''} ${dd===today?'today':''}" data-cald="${dd}"><span class="n">${d.getDate()}</span>${evs.map(x=>calEvHTML(x.c,x.j,true)).join('')}</div>`;}
  return g+'</div></div>';}
// glisser-déposer des pastilles (souris + doigt) : palette → jour, étiquette → autre jour, étiquette → 🗑
let calDrag=null,calGhost=null;
document.addEventListener('pointerdown',e=>{if(!e.target.closest('#hydro'))return;if(!hydroCanEdit())return;
  const pal=e.target.closest('.hyOp');const ev=e.target.closest('.hyEv');if(!pal&&!ev)return;const h=hydroOf();if(!h)return;e.preventDefault();
  calDrag=pal?{op:pal.dataset.op,idx:null}:{op:(h.cal[+ev.dataset.ev]||{}).op,idx:+ev.dataset.ev};
  const o=CAL_OPS[calDrag.op]||CAL_OPS.autre;calGhost=document.createElement('span');calGhost.className='hyEv hyGhost';calGhost.style.background=o.color;
  calGhost.style.setProperty('--tc',calDrag.idx!==null?calTCol(h.cal[calDrag.idx].t):'#0b0b0b');
  calGhost.innerHTML='<span class="tb"></span>'+esc(o.short);document.body.appendChild(calGhost);calGhost.style.left=e.clientX+'px';calGhost.style.top=e.clientY+'px';});
document.addEventListener('pointermove',e=>{if(!calGhost)return;e.preventDefault();calGhost.style.left=e.clientX+'px';calGhost.style.top=e.clientY+'px';
  $$('.hyCell.hot,.hyDay.hot,.hyTrash.hot').forEach(x=>x.classList.remove('hot'));
  calGhost.style.display='none';const under=document.elementFromPoint(e.clientX,e.clientY);calGhost.style.display='';
  const c=under&&under.closest?under.closest('[data-cald],[data-caltrash]'):null;if(c)c.classList.add('hot');
  const wrap=$('#hydro .hyCalWrap');if(wrap){const r=wrap.getBoundingClientRect();if(e.clientY>r.top-20&&e.clientY<r.bottom+20){if(e.clientX>r.right-44)wrap.scrollLeft+=16;else if(e.clientX<r.left+44)wrap.scrollLeft-=16;}}},{passive:false}); // près du bord : le bandeau défile tout seul pendant le glisser
document.addEventListener('pointerup',e=>{if(!calGhost)return;calGhost.style.display='none';const under=document.elementFromPoint(e.clientX,e.clientY);calGhost.remove();calGhost=null;
  const h=hydroOf();if(!h){calDrag=null;return;}
  const cell=under&&under.closest?under.closest('[data-cald]'):null;const trash=under&&under.closest?under.closest('[data-caltrash]'):null;
  if(trash&&calDrag.idx!==null)h.cal.splice(calDrag.idx,1);
  else if(cell){const d=cell.dataset.cald;const H=hydroBuild();
    const t=cell.dataset.calt!==undefined?+cell.dataset.calt:(calDrag.idx!==null?+h.cal[calDrag.idx].t:(state.hydroCalT!==undefined&&state.hydroCalT!==null?state.hydroCalT:(H&&H.troncons[0]?H.troncons[0].idx:0)));
    if(calDrag.idx!==null){h.cal[calDrag.idx].d=d;h.cal[calDrag.idx].t=t;}else h.cal.push({op:calDrag.op,t,d});}
  else{calDrag=null;return;}
  h.cal.sort((a,b)=>a.d<b.d?-1:a.d>b.d?1:0);calDrag=null;saveHydro();renderHydro();});
const fmtVol=v=>(v<.95?String(Math.max(.01,Math.round(v*100)/100).toFixed(2)).replace('.',','):fmt(Math.round(v*10)/10))+' m³';
// vue d'ensemble de l'onglet Hydro : le VRAI plan (fond DXF/image + réseau) en petit, zoomable comme le reste (molette / pincer / double-tap / + − ⌖)
function hydroBgSVG(sh){ // fond de plan léger, en cache par feuille
  if(sh.hydroBg&&sh.hydroBgId===sh.id)return sh.hydroBg;
  const imgTag=sh.image&&sh.image.src?`<image href="${sh.image.src}" x="${sh.image.x||0}" y="${sh.image.y||0}" width="${sh.image.w}" height="${sh.image.h}" opacity="${sh.image.opacity===undefined?.5:sh.image.opacity}" preserveAspectRatio="none"/>`:'';
  let g=`<rect x="-1e5" y="-1e5" width="2e5" height="2e5" fill="#f1f0eb"/>`+imgTag;
  if(sh.type==='vector'&&sh.drawing&&sh.drawing.length){if(sh.drawingFar===undefined){const np=sh.drawing.reduce((t,d)=>t+(d.pts?d.pts.length:(d.loops?d.loops.reduce((x,q)=>x+q.length,0):0)),0);sh.drawingFar=np>60000?decimateDrawing(sh.drawing,{cap:45000,simp:0.5,minLen:1.5}).drawing:null;}
    g+=`<g opacity=".5">${drawingSVG(sh.drawingFar||sh.drawing,{k:1,texts:false,colors:state.show.couleurs!==false,op:1,fillOp:1}).svg}</g>`;}
  else if(sh.type==='image'&&sh.src)g+=`<image href="${sh.src}" x="0" y="0" width="${sh.w}" height="${sh.h}" opacity=".45"/>`;
  sh.hydroBg=g;sh.hydroBgId=sh.id;return g;}
function initHydroMap(){const box=$('#hydroMap');if(!box)return;const sh=sheet();const ppm=sh.ppm||1;const geoH=siteGeo();
  let axes='';hydroLines().forEach(l=>{(l.els||[]).forEach(e=>{const pl=e.axis&&e.axis[0];if(pl&&pl.length>1)axes+=`<path d="${pathD(pl)}" stroke="${geoH?'#8b8577':'#b9b5a8'}" stroke-width="${Math.max(.25*ppm,2)}" fill="none" stroke-linejoin="round" stroke-linecap="round" opacity=".85"/>`;});});
  box.innerHTML=`<svg style="position:absolute;inset:0;width:100%;height:100%"><defs><filter id="hyGrayV">${HY_GRAY}</filter></defs><g id="hyWorld"><g id="hyBgT">${geoH?'':hydroBgSVG(sh)}</g><g>${axes}</g><g id="hyOv"></g></g></svg><div class="hmCtl hyCtl"><button data-a="+" title="Zoomer">+</button><button data-a="-" title="Dézoomer">−</button><button data-a="fit" title="Tout le réseau">⌖</button></div><div class="hmLegend">zoome (molette / pincer / double-tap) — la pose se fait sur l'onglet Plan</div>${geoH?'<div class="hmCredit">© IGN — Géoplateforme</div>':''}`;
  const world=box.querySelector('#hyWorld'),ov=box.querySelector('#hyOv'),bgT=box.querySelector('#hyBgT');
  const V=state.hydroMapView&&isFinite(state.hydroMapView.k)?state.hydroMapView:(state.hydroMapView={k:0,tx:0,ty:0});
  const updTiles=()=>{if(!geoH)return;const w=box.clientWidth||360,hh=box.clientHeight||400;
    const b2=[(-V.tx)/V.k,(-V.ty)/V.k,(w-V.tx)/V.k,(hh-V.ty)/V.k];const T=tilesFor(geoH,b2,V.k*ppm,19,90);if(!T){bgT.innerHTML='';bgT.dataset.key='';return;}
    const xs=T.tiles.map(t=>t.x),ys=T.tiles.map(t=>t.y);const mx=Math.min(...xs),my=Math.min(...ys);
    const ox=mx*256,oy=my*256;const [a,b,c,d,e,f]=T.matrix;const mat=`matrix(${[a,b,c,d,e+a*ox+c*oy,f+b*ox+d*oy].map(x=>(+x).toPrecision(10)).join(' ')})`;
    const key=`o:${T.z}:${mx}-${Math.max(...xs)}:${my}-${Math.max(...ys)}`;
    if(bgT.dataset.key!==key){bgT.dataset.key=key;bgT.innerHTML=`<g transform="${mat}" filter="url(#hyGrayV)">${T.tiles.map(t=>`<image href="${ignTileURL('ortho',T.z,t.x,t.y)}" x="${(t.x-mx)*256}" y="${(t.y-my)*256}" width="256.5" height="256.5"/>`).join('')}</g>`;}
    else{[...bgT.children].forEach(c2=>c2.setAttribute('transform',mat));}};
  let raf2=null;const apply=()=>{world.setAttribute('transform',`translate(${V.tx} ${V.ty}) scale(${V.k})`);if(raf2)return;raf2=requestAnimationFrame(()=>{raf2=null;ov.innerHTML=hydroOverlaySVG(V.k,true);updTiles();});};
  const fit=()=>{const bb=sheetBBox(sh);const cw=box.clientWidth||360,ch=box.clientHeight||400;const m=Math.max(20,(bb[2]-bb[0])*.06);const x0=bb[0]-m,y0=bb[1]-m,x1=bb[2]+m,y1=bb[3]+m;
    V.k=Math.min(cw/(x1-x0),ch/(y1-y0))*.97;V.tx=(cw-(x1-x0)*V.k)/2-x0*V.k;V.ty=(ch-(y1-y0)*V.k)/2-y0*V.k;apply();};
  const zoomAt=(f,mx,my)=>{const nk=Math.min(60/ppm,Math.max(0.02/ppm,V.k*f));const r=nk/V.k;V.tx=mx-(mx-V.tx)*r;V.ty=my-(my-V.ty)*r;V.k=nk;apply();}; // kpm borné 0,02 → 60 px/m
  box.addEventListener('wheel',e=>{e.preventDefault();const r=box.getBoundingClientRect();zoomAt(Math.exp(-e.deltaY*.0015),e.clientX-r.left,e.clientY-r.top);},{passive:false});
  box.addEventListener('dblclick',e=>{if(e.target.closest('.hyCtl'))return;const r=box.getBoundingClientRect();zoomAt(2,e.clientX-r.left,e.clientY-r.top);});
  box.querySelector('.hyCtl').addEventListener('click',e=>{const a=e.target.dataset.a;if(!a)return;e.stopPropagation();if(a==='fit'){fit();return;}zoomAt(a==='+'?1.6:1/1.6,box.clientWidth/2,box.clientHeight/2);});
  const ptrs2=new Map();let last2=null,pd2=null;
  box.addEventListener('pointerdown',e=>{if(e.target.closest('.hyCtl'))return;box.setPointerCapture(e.pointerId);ptrs2.set(e.pointerId,{x:e.clientX,y:e.clientY});if(ptrs2.size===1)last2={x:e.clientX,y:e.clientY};});
  box.addEventListener('pointermove',e=>{if(!ptrs2.has(e.pointerId))return;ptrs2.set(e.pointerId,{x:e.clientX,y:e.clientY});
    if(ptrs2.size===1&&last2){V.tx+=e.clientX-last2.x;V.ty+=e.clientY-last2.y;last2={x:e.clientX,y:e.clientY};apply();}
    else if(ptrs2.size===2){const [a,b]=[...ptrs2.values()];const d=Math.hypot(a.x-b.x,a.y-b.y);const r=box.getBoundingClientRect();if(pd2)zoomAt(d/pd2,(a.x+b.x)/2-r.left,(a.y+b.y)/2-r.top);pd2=d;}});
  const up2=e=>{ptrs2.delete(e.pointerId);if(ptrs2.size<2)pd2=null;if(!ptrs2.size)last2=null;};
  box.addEventListener('pointerup',up2);box.addEventListener('pointercancel',up2);
  if(!V.k)fit();else apply();}
function renderHydro(){const el=$('#hydro');if(!el)return;const h=hydroOf();
  if(!h||!hydroLines().length){el.innerHTML='<h2 class="vt">Hydraulique</h2><div class="card muted">Aucun réseau dans ce chantier — trace un réseau avec le traceur, l’onglet prépare ensuite épreuves, rinçage et remplissage.</div>';return;}
  const H=hydroBuild();const P=H.params;const canH=hydroCanEdit();const flow=H.flow;
  const needTag=k=>k==='epreuve'?'<span class="hyNeed">✓ kits fin de ligne suffisants</span>':'<span class="hyNeed bp">⇄ by-pass requis aux extrémités</span>';
  const prestCard=k=>`<div class="hyCard ${h.prest[k]?'on':''}" data-p="${k}"><div style="display:flex;gap:8px;align-items:baseline"><span>${HYDRO_ICON[k]}</span><b style="font-size:14px">${PREST_LABEL[k]}</b></div><div class="muted" style="font-size:12px;margin-top:3px">${HYDRO_DESC[k]}</div>${needTag(k)}<span class="tick">${h.prest[k]?'✓':''}</span></div>`;
  const chips=[];H.cuts.forEach((c,i)=>chips.push(`<span class="hyChip">✂ ${esc(c.valve?'coupe : vanne '+c.valve:'coupe '+(i+1))} · ${esc((state.lines[c.line]||{}).name||c.line)} pk ${fmt(c.m)}<button data-rmcut="${i}" title="enlever">✕</button></span>`));
  (h.water||[]).forEach((w,i)=>chips.push(`<span class="hyChip">💧 B${i+1}<button data-rmwater="${i}" title="enlever">✕</button></span>`));
  (h.fills||[]).forEach((f,i)=>chips.push(`<span class="hyChip">🚰 Z${i+1}<button data-rmfill="${i}" title="enlever">✕</button></span>`));
  (h.skids||[]).forEach((sk,i)=>chips.push(`<span class="hyChip">⬛ skid ${i+1} (${fmt(P.skidW)}×${fmt(P.skidL)} m)<button data-rmskid="${i}" title="enlever">✕</button></span>`));
  const fillOfT=t=>{const zs=[];(H.fillAts||[]).forEach((fa,i)=>{if(t.segs.some(sg=>sg.line===fa.line&&fa.m>=sg.m0-1e-6&&fa.m<=sg.m1+1e-6))zs.push('Z'+(i+1));});return zs;};
  const trCard=t=>{const col=TCOLS[t.idx%TCOLS.length];const dnTxt=t.dns.slice(0,3).map(d=>d[0]).join('/');
    const nBP=t.ends.filter(e=>e.need==='BP').length,nK=t.ends.filter(e=>e.need==='KFL').length,nE=t.ends.filter(e=>e.need==='EVAC').length;
    const zs=fillOfT(t);const pose=[];if(nBP)pose.push('<b>'+nBP+' BP</b>');if(nK)pose.push('<b>'+nK+' KFL</b>');if(nE)pose.push('<b>'+nE+' évac.</b>');if(zs.length)pose.push('remplissage 🚰 '+zs.join(' + '));
    const al=t.ends.filter(e=>e.need==='BP'&&e.welded);
    const calT=(h.cal||[]).filter(c=>+c.t===t.idx||+c.t===-1);
    return `<div class="hyTr"><div class="hd"><i style="width:12px;height:5px;background:${col};border-radius:2px"></i><b style="font-size:13.5px;flex:1">Tronçon ${t.idx+1} — ${t.lines.map(id=>esc((state.lines[id]||{}).name||id)).slice(0,3).join(' + ')}${t.lines.length>3?'…':''}</b><span class="muted" style="font-size:10.5px">${t.ends.length} extrémité${t.ends.length>1?'s':''}</span><button class="btn sm" data-trrep="${t.idx}" style="font-size:10.5px;padding:3px 8px" title="Dossier de ce tronçon seul (PDF)">📄 Dossier</button></div>
    <table><tr><td class="muted">Linéaire (aller)</td><td><b>${fmt(Math.round(t.lenA))} m</b>${dnTxt?' · DN'+dnTxt:''}</td></tr>
    <tr><td class="muted">Volume aller + retour</td><td><b>${fmtVol(t.vol)}</b></td></tr>
    ${h.prest.rincage?`<tr><td class="muted">Rinçage ≥ ${fmt(P.vitesse)} m/s (DN${t.dnMax})</td><td><b>${fmt(Math.round(t.debit))} m³/h</b></td></tr>`:''}
    ${t.pump?`<tr><td class="muted">Pompe de rinçage (estimation)</td><td><b>≥ ${fmt(t.pump.q)} m³/h · HMT ≈ ${t.pump.hmt} m</b> (ΔP ≈ ${String(t.pump.dp).replace('.',',')} bar)</td></tr>`:''}
    <tr><td class="muted">Remplissage à ${fmt(P.debit)} m³/h</td><td><b>${fmtMin(t.minutes)}</b></td></tr>
    <tr><td class="muted">À poser</td><td>${pose.length?pose.join(' · '):'—'}</td></tr>
    ${calT.length?`<tr><td class="muted">Calendrier</td><td>${calT.map(c=>{const op=CAL_OPS[c.op]||CAL_OPS.autre;return `<span style="white-space:nowrap" title="${esc(op.label)}"><i style="display:inline-block;width:8px;height:8px;border-radius:50%;background:${op.color};margin-right:3px;vertical-align:baseline"></i>${esc(op.short)} ${frDate(c.d)}</span>`;}).join(' <span class="muted">→</span> ')}</td></tr>`:''}
    ${t.needFill?'<tr><td colspan="2" style="color:#7a5200;background:#fff3d6">⚠ Pas de zone de remplissage sur ce tronçon — pose 🚰 (une zone par tronçon).</td></tr>':''}
    ${al.map(e=>`<tr><td colspan="2" style="color:#8a1f1f;background:#fdecec">⚠ ${esc(e.label)} : fond bombé déjà soudé (${e.welded.map(x=>x.weldId).join(', ')}) — un by-pass aurait été préférable${h.prest.rincage?' pour le rinçage':''}</td></tr>`).join('')}
    </table></div>`;};
  const tot=H.totals;const totPose=[];if(tot.nBP)totPose.push(tot.nBP+' BP');if(tot.nKFL)totPose.push(tot.nKFL+' KFL');if(tot.nEvac)totPose.push(tot.nEvac+' évac.');
  el.innerHTML=`<h2 class="vt">Hydraulique — ${esc(NET.name)}</h2>
  <h3 style="margin:10px 0 6px">1 · Prestations à préparer</h3>
  ${['epreuve','rincage','passivation','remplissage'].map(prestCard).join('')}
  ${h.prest.epreuve&&flow?'<div style="background:#fff3d6;border:1px solid #f0c76a;border-radius:10px;padding:7px 10px;font-size:12px;color:#7a5200;margin-bottom:8px"><b>Épreuve + circulation cochées</b> → la circulation impose des by-pass : autant les poser AVANT l’épreuve (ils servent aux deux).</div>':''}
  <details style="margin:4px 0 10px"><summary class="muted" style="cursor:pointer;font-size:13px">⚙ Paramètres (réglables)</summary>
   <div class="hyParam" style="display:flex;gap:12px;flex-wrap:wrap;margin-top:8px">
    <div><label>Vitesse de rinçage (m/s)</label><input type="number" step="0.1" min="0.2" data-hp="vitesse" value="${P.vitesse}" ${canH?'':'disabled'}></div>
    <div><label>Débit borne / skid (m³/h)</label><input type="number" step="1" min="1" data-hp="debit" value="${P.debit}" ${canH?'':'disabled'}></div>
    <div><label>Skid — largeur (m)</label><input type="number" step="0.5" min="1" data-hp="skidW" value="${P.skidW}" ${canH?'':'disabled'}></div>
    <div><label>Skid — longueur (m)</label><input type="number" step="0.5" min="1" data-hp="skidL" value="${P.skidL}" ${canH?'':'disabled'}></div>
   </div></details>
  <h3 style="margin:10px 0 6px">2 · Sectorisation & points d’eau <span class="muted" style="font-weight:400;font-size:12px">(la pose se fait sur le plan)</span></h3>
  <div style="display:flex;gap:6px;flex-wrap:wrap;margin-bottom:6px">
   <button class="hyPill" data-pose="cut" ${canH?'':'disabled'}>✂ Sectoriser${H.cuts.length?' ('+H.cuts.length+')':''}</button>
   <button class="hyPill" data-pose="water" ${canH?'':'disabled'}>💧 Point d’eau${h.water.length?' ('+h.water.length+')':''}</button>
   <button class="hyPill" data-pose="fill" ${canH?'':'disabled'}>🚰 Remplissage${h.fills.length?' ('+h.fills.length+')':''}</button>
   <button class="hyPill" data-pose="skid" ${canH?'':'disabled'}>⬛ Skid${h.skids.length?' ('+h.skids.length+')':''}</button>
   <button class="hyPill" id="hyOsm" style="background:#dfe8f4;color:#1c3d6b">🔎 Bornes de la ville${state.osmHydrants?' ('+state.osmHydrants.length+')':''}</button>
  </div>
  ${chips.length?`<div style="margin-bottom:6px">${chips.join('')}</div>`:''}
  <div class="hyMap" id="hydroMap"></div>
  <div class="muted" style="font-size:11.5px;margin:6px 0 10px;display:flex;gap:10px;flex-wrap:wrap">${H.troncons.length>6?`<span>${H.troncons.length} tronçons (couleurs sur la carte et dans le récap)</span>`:H.troncons.map(t=>`<span><i style="display:inline-block;width:11px;height:4px;background:${TCOLS[t.idx%TCOLS.length]};border-radius:2px;vertical-align:middle;margin-right:3px"></i>tronçon ${t.idx+1}</span>`).join('')}<span><i style="display:inline-block;width:9px;height:9px;border-radius:50%;background:#0b0b0b;border:2px solid #ffd9a8;vertical-align:middle;margin-right:3px"></i>⇄ BP = by-pass à poser</span><span>KFL = kit fin de ligne</span><span style="color:#d03b3b">⚠ = fond bombé déjà soudé</span></div>
  ${!H.cuts.length&&H.troncons.length>1?'<div class="muted" style="font-size:11.5px;margin:-4px 0 10px">Sans coupe, chaque réseau non relié aux autres forme déjà son propre tronçon.</div>':''}
  <h3 style="margin:10px 0 6px">3 · Calendrier prévisionnel <span class="muted" style="font-weight:400;font-size:12px">(glisse les pastilles sur les jours — autant d’opérations que besoin, dans l’ordre voulu)</span></h3>
  ${(()=>{const calView=state.hydroCalView||'plan';let label='';
    if(calView==='plan'){const st=new Date((state.hydroCalStart||isoD(new Date()))+'T00:00');const en=new Date(st.getTime()+13*864e5);label=frDate(isoD(st))+' → '+frDate(isoD(en));}
    else{const mm=state.hydroCalMonth;label=mm?new Date(mm+'-01T00:00').toLocaleDateString('fr-FR',{month:'long',year:'numeric'}):'';}
    return `<div style="display:flex;gap:5px;align-items:center;flex-wrap:wrap;margin-bottom:7px">
     <button class="btn sm ${calView==='plan'?'primary':''}" data-calview="plan">Planning</button><button class="btn sm ${calView==='mois'?'primary':''}" data-calview="mois">Mois</button>
     <button class="btn sm" data-calnav="-1">‹</button><label id="hyCalLbl" style="position:relative;cursor:pointer;display:inline-flex;align-items:center;gap:4px" title="Clique pour choisir une date"><b style="font-size:12.5px;text-transform:capitalize;border-bottom:1px dashed var(--muted)">${esc(label)}</b><span style="font-size:11px">📅</span><input type="date" id="hyCalJump" style="position:absolute;inset:0;opacity:0;cursor:pointer;width:100%;height:100%"></label><button class="btn sm" data-calnav="1">›</button>
     ${calView==='mois'&&H.troncons.length>1?`<span class="muted" style="font-size:11px;margin-left:4px">poser sur :</span>${[...H.troncons.map(t=>t.idx),-1].map(t=>`<button class="hyTchip ${state.hydroCalT===t?'on':''}" data-calt2="${t}" style="${state.hydroCalT===t?'background:'+calTCol(t):''}">${t<0?'Chantier':'T'+(t+1)}</button>`).join('')}`:''}
    </div>
    ${canH?`<div class="hyPal">${Object.entries(CAL_OPS).map(([k,o])=>`<span class="hyOp" data-op="${k}" style="background:${o.color}"><i></i>${esc(o.short)}</span>`).join('')}<span class="hyTrash" data-caltrash="1">🗑 glisser ici pour enlever</span></div>`:''}
    ${calView==='plan'?calPlanHTML(H,h):calMoisHTML(H,h)}`;})()}
  ${(h.cal||[]).length?`<details style="margin:6px 0 4px"><summary class="muted" style="cursor:pointer;font-size:12px">${h.cal.length} étape${h.cal.length>1?'s':''} — liste détaillée${canH?' (✕ pour enlever)':''}</summary><div style="margin-top:6px">${h.cal.map((c,i)=>{const op=CAL_OPS[c.op]||CAL_OPS.autre;return `<span class="hyChip" style="border-color:${op.color}"><i style="width:9px;height:9px;border-radius:50%;background:${op.color};display:inline-block"></i>${esc(op.short)} · ${+c.t<0?'chantier':'T'+(+c.t+1)} · <b>${frDate(c.d)}</b>${canH?`<button data-rmcal="${i}" title="enlever">✕</button>`:''}</span>`;}).join('')}</div></details>`:'<div class="muted" style="font-size:12px;margin:6px 0">Aucune étape — glisse une pastille sur un jour, ou ajoute par le formulaire.</div>'}
  ${canH?`<details style="margin:0 0 10px"><summary class="muted" style="cursor:pointer;font-size:12px">＋ Ajouter par formulaire (sans glisser)</summary>
  <div style="display:flex;gap:6px;flex-wrap:wrap;align-items:center;background:var(--surface);border:1px solid var(--line);border-radius:12px;padding:8px;margin-top:6px">
   <select id="hyCalOp" class="f" style="font-size:13px">${Object.entries(CAL_OPS).map(([k,o])=>`<option value="${k}">${o.label}</option>`).join('')}</select>
   <select id="hyCalT" class="f" style="font-size:13px">${H.troncons.length>1?`<option value="-1">Tout le chantier</option>`:''}${H.troncons.map(t=>`<option value="${t.idx}" ${H.troncons.length===1?'selected':''}>Tronçon ${t.idx+1}</option>`).join('')}</select>
   <input type="date" id="hyCalD" class="f" style="font-size:13px">
   <button class="btn sm primary" id="hyCalAdd">＋ Ajouter</button>
  </div></details>`:''}
  <h3 style="margin:10px 0 6px">4 · Récap par tronçon</h3>
  ${H.troncons.map(trCard).join('')}
  <div style="background:#eef1f5;border:1px solid #cdd4dd;border-radius:10px;padding:8px 10px;font-size:12.5px;color:#3f4750;margin-bottom:10px"><b>Total chantier :</b> ${fmt(Math.round(tot.lenA))} m · ${fmtVol(tot.vol)}${totPose.length?' · '+totPose.join(' · ')+' à poser':''}${tot.nAlert?` · <span style="color:#b02a2a;font-weight:700">${tot.nAlert} alerte${tot.nAlert>1?'s':''}</span>`:''}${tot.noFill?` · <span style="color:#7a5200;font-weight:700">${tot.noFill} tronçon${tot.noFill>1?'s':''} sans zone de remplissage</span>`:''}${h.skids.length?' · '+h.skids.length+' skid'+(h.skids.length>1?'s':'')+' ('+fmt(P.skidW)+'×'+fmt(P.skidL)+' m)':''}</div>
  <div style="display:flex;gap:6px;flex-wrap:wrap;margin-bottom:14px"><button class="btn primary" id="hyReport">📄 Dossier de prépa (global + 1 page par tronçon)</button>${canH?'<button class="btn sm" id="hyClear" style="color:#d03b3b">🗑 Tout effacer</button>':''}</div>`;
  $$('#hydro [data-p]').forEach(c=>c.addEventListener('click',()=>{if(!canH){toast('Réservé au chef / bureau');return;}h.prest[c.dataset.p]=!h.prest[c.dataset.p];saveHydro();renderHydro();}));
  $$('#hydro [data-hp]').forEach(inp=>inp.addEventListener('change',()=>{const v=parseFloat(String(inp.value).replace(',','.'));if(isFinite(v)&&v>0){h.params[inp.dataset.hp]=v;saveHydro();renderHydro();}}));
  $$('#hydro [data-pose]').forEach(b=>b.addEventListener('click',()=>startHydroPose(b.dataset.pose)));
  $$('#hydro [data-rmcut]').forEach(b=>b.addEventListener('click',()=>{if(!canH)return;h.cuts.splice(+b.dataset.rmcut,1);saveHydro();renderHydro();}));
  $$('#hydro [data-rmwater]').forEach(b=>b.addEventListener('click',()=>{if(!canH)return;h.water.splice(+b.dataset.rmwater,1);saveHydro();renderHydro();}));
  $$('#hydro [data-rmfill]').forEach(b=>b.addEventListener('click',()=>{if(!canH)return;h.fills.splice(+b.dataset.rmfill,1);saveHydro();renderHydro();}));
  $$('#hydro [data-rmskid]').forEach(b=>b.addEventListener('click',()=>{if(!canH)return;h.skids.splice(+b.dataset.rmskid,1);saveHydro();renderHydro();}));
  $$('#hydro [data-rmcal]').forEach(b=>b.addEventListener('click',()=>{if(!canH)return;h.cal.splice(+b.dataset.rmcal,1);saveHydro();renderHydro();}));
  const osmB=$('#hyOsm');if(osmB)osmB.addEventListener('click',fetchOsmHydrants);
  const calAdd=$('#hyCalAdd');if(calAdd)calAdd.addEventListener('click',()=>{const op=$('#hyCalOp').value;const t=+$('#hyCalT').value;const d=$('#hyCalD').value;
    if(!d){toast('Choisis une date');return;}h.cal.push({op,t,d});h.cal.sort((a,b)=>a.d<b.d?-1:a.d>b.d?1:0);saveHydro();renderHydro();});
  $$('#hydro [data-calview]').forEach(b=>b.addEventListener('click',()=>{state.hydroCalView=b.dataset.calview;renderHydro();}));
  $$('#hydro [data-calnav]').forEach(b=>b.addEventListener('click',()=>{const dir=+b.dataset.calnav;
    if((state.hydroCalView||'plan')==='plan'){const st=new Date((state.hydroCalStart||isoD(new Date()))+'T00:00');st.setDate(st.getDate()+dir*7);state.hydroCalStart=isoD(st);}
    else{const [y,m]=(state.hydroCalMonth||isoD(new Date()).slice(0,7)).split('-').map(Number);const d2=new Date(y,m-1+dir,1);state.hydroCalMonth=d2.getFullYear()+'-'+String(d2.getMonth()+1).padStart(2,'0');}
    renderHydro();}));
  $$('#hydro [data-calt2]').forEach(b=>b.addEventListener('click',()=>{state.hydroCalT=+b.dataset.calt2;renderHydro();}));
  const jmp=$('#hyCalJump');if(jmp){const lbl=$('#hyCalLbl');if(lbl)lbl.addEventListener('click',e=>{if(e.target!==jmp){try{jmp.showPicker();e.preventDefault();}catch(err){}}});
    jmp.addEventListener('change',()=>{const v=jmp.value;if(!v)return;
      if((state.hydroCalView||'plan')==='plan'){const d2=new Date(v+'T00:00');d2.setDate(d2.getDate()-1);state.hydroCalStart=isoD(d2);}
      else state.hydroCalMonth=v.slice(0,7);
      renderHydro();});}
  const rep=$('#hyReport');if(rep)rep.addEventListener('click',()=>openHydroReport(null));
  $$('#hydro [data-trrep]').forEach(b=>b.addEventListener('click',()=>openHydroReport(+b.dataset.trrep)));
  const clr=$('#hyClear');if(clr)clr.addEventListener('click',()=>{if(!confirm('Effacer prestations, coupes, points d’eau, zones de remplissage, skids et calendrier de ce chantier ?'))return;NET.hydro={prest:{epreuve:true},params:{},cuts:[],water:[],fills:[],skids:[],cal:[]};saveHydro();renderHydro();});
  initHydroMap();}
// filtre « photo aérienne délavée » : la photo passe en gris clair, le réseau coloré reste au premier plan (demande Ethan : ortho grisée plutôt que le DXF)
const HY_GRAY='<feColorMatrix type="saturate" values="0.12"/><feComponentTransfer><feFuncR type="linear" slope="0.52" intercept="0.4"/><feFuncG type="linear" slope="0.52" intercept="0.4"/><feFuncB type="linear" slope="0.52" intercept="0.4"/></feComponentTransfer>';
// tuiles ortho IGN recalées dans le repère du plan (même mécanique/piège Chrome que renderMap), pour la vue d'ensemble hydro et les cartes du dossier
function hydroTilesSVG(g,box2,pxPerM,fid){const T=tilesFor(g,box2,pxPerM,19,90);if(!T)return '';
  const xs=T.tiles.map(t=>t.x),ys=T.tiles.map(t=>t.y);const mx=Math.min(...xs),my=Math.min(...ys);
  const ox=mx*256,oy=my*256;const [a,b,c,d,e,f]=T.matrix;const mat=`matrix(${[a,b,c,d,e+a*ox+c*oy,f+b*ox+d*oy].map(x=>(+x).toPrecision(10)).join(' ')})`;
  return `<g transform="${mat}" filter="url(#${fid})">${T.tiles.map(t=>`<image href="${ignTileURL('ortho',T.z,t.x,t.y)}" x="${(t.x-mx)*256}" y="${(t.y-my)*256}" width="256.5" height="256.5"/>`).join('')}</g>`;}
// carte imprimable : photo aérienne grisée (si chantier géoréférencé, sinon fond DXF) + axes + overlay hydro, cadrée sur un viewBox (global ou zoom tronçon)
let hyPrintN=0;
function hydroPrintMap(vb,hMax){const sh=sheet();const k=720/Math.max(1,vb[2]); // taille des textes/badges comme si la carte faisait 720 px de large
  const g=siteGeo();const fid='hyGrayP'+(++hyPrintN);
  let axes='';hydroLines().forEach(l=>{(l.els||[]).forEach(e=>{const pl=e.axis&&e.axis[0];if(pl&&pl.length>1)axes+=`<path d="${pathD(pl)}" stroke="${g?'#8b8577':'#b9b5a8'}" stroke-width="${Math.max(.25*(sh.ppm||1),2/k)}" fill="none" stroke-linejoin="round" stroke-linecap="round" opacity=".85"/>`;});});
  const fond=g?`<defs><filter id="${fid}">${HY_GRAY}</filter></defs><rect x="${vb[0]}" y="${vb[1]}" width="${vb[2]}" height="${vb[3]}" fill="#eceae2"/>${hydroTilesSVG(g,[vb[0],vb[1],vb[0]+vb[2],vb[1]+vb[3]],k*(sh.ppm||1),fid)}`:`<g opacity=".55">${hydroBgSVG(sh)}</g>`;
  return `<svg viewBox="${vb.join(' ')}" style="width:100%;max-height:${hMax||420}px;background:#f1f0eb;border:1px solid #ccc;border-radius:8px" preserveAspectRatio="xMidYMid meet">${fond}<g>${axes}</g>${hydroOverlaySVG(k,true)}</svg>${g?'<div style="font-size:9px;color:#888;margin-top:1px">Fond : photo aérienne © IGN — Géoplateforme</div>':''}`;}
function tronconBBox(t){let x0=1e15,y0=1e15,x1=-1e15,y1=-1e15;t.segs.forEach(sg=>{const l=state.lines[sg.line];if(!l)return;subAxis(l,sg.m0,sg.m1).forEach(pl=>pl.forEach(p=>{x0=Math.min(x0,p.x);y0=Math.min(y0,p.y);x1=Math.max(x1,p.x);y1=Math.max(y1,p.y);}));});
  if(x0>x1)return null;const m=Math.max(15,(x1-x0)*.12,(y1-y0)*.12);return [x0-m,y0-m,(x1-x0)+2*m,(y1-y0)+2*m];}
function openHydroReport(only){if(typeof only!=='number')only=null;const H=hydroBuild();const h=hydroOf();if(!H||!h)return;const P=H.params;const sh=sheet();const bb=sheetBBox(sh);
  const TS=only==null?H.troncons:H.troncons.filter(t=>t.idx===only);if(!TS.length)return;
  const prests=Object.keys(PREST_LABEL).filter(k=>h.prest[k]).map(k=>PREST_LABEL[k]).join(' + ')||'—';
  const dot=c=>`<span style="display:inline-block;width:9px;height:9px;border-radius:50%;background:${c};margin-right:4px;vertical-align:baseline"></span>`;
  const needTxt=en=>en.fill?'zone de remplissage (bouclée par le skid)':en.need==='BP'?'by-pass à poser':en.need==='KFL'?'kit fin de ligne / fond bombé provisoire':en.need==='EVAC'?'évacuation libre (mono-tube)':en.valve?'vanne fermée':en.already==='bp'?'déjà bouclé (by-pass)':'—';
  const calRows=(h.cal||[]).map(c=>{const op=CAL_OPS[c.op]||CAL_OPS.autre;return `<tr><td>${frDate(c.d)}</td><td>${dot(op.color)}${esc(op.label)}</td><td>${+c.t<0?'Tout le chantier':'Tronçon '+(+c.t+1)}</td></tr>`;}).join('');
  const fillOfT=t=>{const zs=[];(H.fillAts||[]).forEach((fa,i)=>{if(t.segs.some(sg=>sg.line===fa.line&&fa.m>=sg.m0-1e-6&&fa.m<=sg.m1+1e-6))zs.push('Z'+(i+1));});return zs;};
  const rows=H.troncons.map(t=>{const nBP=t.ends.filter(e=>e.need==='BP').length,nK=t.ends.filter(e=>e.need==='KFL').length,nE=t.ends.filter(e=>e.need==='EVAC').length;
    return `<tr><td>T${t.idx+1}</td><td>${fmt(Math.round(t.lenA))} m · DN${t.dns.slice(0,3).map(d=>d[0]).join('/')}</td><td>${fmtVol(t.vol)}</td><td>${h.prest.rincage?fmt(Math.round(t.debit))+' m³/h':'—'}</td><td>${t.pump?'≥ '+fmt(t.pump.q)+' m³/h · '+t.pump.hmt+' m':'—'}</td><td>${fmtMin(t.minutes)}</td><td>${[nBP?nBP+' BP':'',nK?nK+' KFL':'',nE?nE+' évac.':'',fillOfT(t).length?'remplissage '+fillOfT(t).join('+'):''].filter(Boolean).join(' · ')||'—'}</td></tr>`;}).join('');
  const tronPage=(t,noBreak)=>{const col=TCOLS[t.idx%TCOLS.length];const vb=tronconBBox(t);const calT=(h.cal||[]).filter(c=>+c.t===t.idx||+c.t===-1);
    const al=t.ends.filter(e=>e.need==='BP'&&e.welded);
    return `<div class="${noBreak?'':'page'}"><h2 style="border-left:10px solid ${col};padding-left:8px">Tronçon ${t.idx+1} — ${t.lines.map(id=>esc((state.lines[id]||{}).name||id)).join(' + ')}</h2>
    ${vb?hydroPrintMap(vb,430):''}
    <table style="margin-top:8px"><tr><th style="width:38%">Linéaire (aller)</th><td>${fmt(Math.round(t.lenA))} m · DN${t.dns.map(d=>d[0]).join('/')}</td></tr>
    <tr><th>Volume aller + retour</th><td>${fmtVol(t.vol)}</td></tr>
    ${h.prest.rincage?`<tr><th>Débit de rinçage (≥ ${fmt(P.vitesse)} m/s dans le DN${t.dnMax})</th><td>${fmt(Math.round(t.debit))} m³/h</td></tr>`:''}
    ${t.pump?`<tr><th>Pompe (estimation pertes de charge)</th><td>≥ ${fmt(t.pump.q)} m³/h · HMT ≈ ${t.pump.hmt} m (ΔP ≈ ${String(t.pump.dp).replace('.',',')} bar)</td></tr>`:''}
    <tr><th>Durée de remplissage à ${fmt(P.debit)} m³/h</th><td>${fmtMin(t.minutes)}</td></tr>
    <tr><th>Zones de remplissage</th><td>${fillOfT(t).join(' + ')||(t.needFill?'⚠ AUCUNE — à définir':'—')}</td></tr></table>
    <h3>Extrémités du tronçon</h3><table><tr><th>Extrémité</th><th>À prévoir</th></tr>
    ${t.ends.map(en=>`<tr><td>${esc(en.label)}</td><td${en.need==='BP'?' style="font-weight:700"':''}>${needTxt(en)}${en.welded?' — <span style="color:#b02a2a">fond bombé déjà soudé ('+en.welded.map(x=>x.weldId).join(', ')+')</span>':''}</td></tr>`).join('')}</table>
    ${al.length?`<div style="background:#fdecec;border:1px solid #e8b6b6;border-radius:8px;padding:7px 10px;margin-top:8px;color:#8a1f1f">${al.map(e=>'⚠ '+esc(e.label)+' : fond bombé déjà soudé ('+e.welded.map(x=>x.weldId).join(', ')+') — un by-pass aurait été préférable').join('<br>')}</div>`:''}
    ${calT.length?`<h3>Planning du tronçon</h3>${calPlanHTML(H,h,true,t.idx)}<table style="margin-top:6px"><tr><th>Date</th><th>Opération</th></tr>${calT.map(c=>{const op=CAL_OPS[c.op]||CAL_OPS.autre;return `<tr><td>${frDate(c.d)}</td><td>${dot(op.color)}${esc(op.label)}${+c.t<0?' (tout le chantier)':''}</td></tr>`;}).join('')}</table>`:''}
    </div>`;};
  const html=`<!doctype html><html lang="fr"><head><meta charset="utf-8"><title>Prépa hydraulique — ${esc(NET.name)}</title><style>
  body{font-family:system-ui,sans-serif;color:#111;margin:24px;font-size:13px}h1{font-size:19px;margin:0 0 2px}h2{font-size:15px;margin:16px 0 6px}h3{font-size:13px;margin:12px 0 4px}
  table{border-collapse:collapse;width:100%;font-size:12px}td,th{border:1px solid #bbb;padding:5px 7px;text-align:left;vertical-align:top}th{background:#f0efe9}
  .muted{color:#666}.np{margin:12px 0;padding:9px 16px;font-size:14px;border-radius:8px;border:1px solid #888;background:#f5f5f2;cursor:pointer}
  .page{page-break-before:always;margin-top:26px}
  .hyCalWrap{border:1px solid #ddd;border-radius:10px;overflow:hidden;background:#fff}
  .hyCalGrid{display:grid}
  .hyGh{font-size:9px;color:#666;text-align:center;padding:4px 1px;border-bottom:1px solid #ddd;background:#f6f5f0;font-weight:600}
  .hyGh small{display:block;font-size:8px;color:#999;font-weight:400}.hyGh.we{background:#eeece4;color:#a8a49a}
  .hyRowh{font-size:11px;font-weight:800;padding:7px 6px;border-bottom:1px solid #eee;display:flex;align-items:center;gap:5px}
  .hyRowh i{width:11px;height:5px;border-radius:2px;display:inline-block}
  .hyCell{border-left:1px solid #f2f0ea;border-bottom:1px solid #eee;min-height:36px;padding:2px;display:flex;flex-direction:column}
  .hyCell.we{background:#f8f7f2}.hyCell.today{background:#fff}
  .hyEv{display:inline-flex;align-items:center;gap:4px;border-radius:7px;padding:2px 6px 2px 4px;font-size:9.5px;font-weight:700;color:#fff;line-height:1.25;margin:1px 0;white-space:nowrap}
  .hyEv .tb{width:4px;align-self:stretch;border-radius:3px;background:var(--tc,#0b0b0b);box-shadow:0 0 0 1px rgba(255,255,255,.5)}
  .hyGh.hyGapH{background:repeating-linear-gradient(135deg,#eeece4 0 4px,#f8f7f2 4px 8px);color:#8f8b80}
  .hyGap{background:repeating-linear-gradient(135deg,#f4f2ec 0 4px,#fff 4px 8px);border-left:1px dashed #d8d5cb;border-bottom:1px solid #eee}
  @media print{.np{display:none}body{margin:6mm}}</style></head><body>
  <button class="np" onclick="print()">🖨 Imprimer / enregistrer en PDF</button>
  <h1>${only==null?'Dossier de préparation hydraulique':'Dossier tronçon '+(only+1)} — ${esc(NET.name)}</h1>
  <div class="muted">Édité le ${new Date().toLocaleString('fr-FR')} — TRACÉ${only==null?' · vue globale + une page par tronçon':''}</div>
  <h2>Prestations</h2><div>${esc(prests)}${H.flow?' — circulation requise : extrémités bouclées par by-pass (SST et raccordements compris)':' — statique : kits fin de ligne suffisants'}</div>
  <h2>Paramètres retenus (réglables dans l’appli)</h2><div>Vitesse de rinçage ${fmt(P.vitesse)} m/s · débit borne/skid ${fmt(P.debit)} m³/h · skid ${fmt(P.skidW)} × ${fmt(P.skidL)} m</div>
  ${only==null?`
  ${(h.cal||[]).length?`<h2>Calendrier prévisionnel</h2>${calPlanHTML(H,h,true)}<table style="margin-top:6px"><tr><th>Date</th><th>Opération</th><th>Périmètre</th></tr>${calRows}</table>`:''}
  <h2>Vue d'ensemble</h2>${hydroPrintMap([bb[0]-20,bb[1]-20,(bb[2]-bb[0])+40,(bb[3]-bb[1])+40],460)}
  <div class="muted" style="margin-top:4px">${H.troncons.map(t=>`<span style="margin-right:10px"><span style="display:inline-block;width:10px;height:5px;background:${TCOLS[t.idx%TCOLS.length]};border-radius:2px"></span> T${t.idx+1}</span>`).join('')} · ⚫ BP à poser · ⚠ fond bombé déjà soudé</div>
  <h2>Synthèse par tronçon</h2><table><tr><th>T</th><th>Linéaire</th><th>Volume A+R</th><th>Débit rinçage</th><th>Pompe</th><th>Remplissage</th><th>À poser</th></tr>${rows}
  <tr><th>Total</th><th>${fmt(Math.round(H.totals.lenA))} m</th><th>${fmtVol(H.totals.vol)}</th><th></th><th></th><th>${fmtMin(H.totals.vol/(P.debit||1)*60)}</th><th>${[H.totals.nBP?H.totals.nBP+' BP':'',H.totals.nKFL?H.totals.nKFL+' KFL':'',H.totals.nEvac?H.totals.nEvac+' évac.':''].filter(Boolean).join(' · ')||'—'}</th></tr></table>
  ${H.totals.noFill?`<div style="background:#fff3d6;border:1px solid #f0c76a;border-radius:8px;padding:7px 10px;margin-top:8px;color:#7a5200">⚠ ${H.totals.noFill} tronçon(s) sans zone de remplissage — à définir avant l’épreuve.</div>`:''}
  ${H.cuts.length?`<h2>Coupes de sectorisation</h2><ul>${H.cuts.map((c,i)=>`<li>Coupe ${i+1} — ${esc((state.lines[c.line]||{}).name||c.line)}, pk ${fmt(c.m)} m${c.valve?' (vanne '+esc(c.valve)+', reste fermée)':' — raccordement entre tronçons à la remise en service (soudure de raccordement hors épreuve)'}</li>`).join('')}</ul>`:''}
  ${(h.water||[]).length?`<div class="muted">${h.water.length} point${h.water.length>1?'s':''} d’eau retenu${h.water.length>1?'s':''} · ${h.fills.length} zone${h.fills.length>1?'s':''} de remplissage · ${h.skids.length} skid${h.skids.length>1?'s':''}.</div>`:''}
  ${H.troncons.map(t=>tronPage(t)).join('')}`:tronPage(TS[0],true)}
  <div class="page"><h2>Visa</h2><table><tr><th style="width:33%">Préparé par</th><th style="width:33%">Vérifié par</th><th>Dates retenues</th></tr><tr><td style="height:56px"></td><td></td><td></td></tr></table>
  <div class="muted" style="margin-top:8px">Volumes calculés sur les Ø intérieurs acier P235 ; pompe estimée par pertes de charge (Darcy-Blasius, +20 % singularités, +3 m) — à confirmer par le loueur. Bornes « BI » : source OpenStreetMap, à vérifier sur site.</div></div>
  </body></html>`;
  const w=window.open('about:blank');if(!w){toast('Autorise l’ouverture de fenêtres pour le dossier');return;}w.document.write(html);w.document.close();}
function applyView(){const {k,tx,ty}=state.view;world.setAttribute('transform',`translate(${tx} ${ty}) scale(${k})`);$('#zoominfo').textContent=`1 m ≈ ${fmt(k*sheet().ppm)} px`;}
function sheetBBox(sh){let x0=1e9,y0=1e9,x1=-1e9,y1=-1e9;sh.lines.forEach(id=>state.lines[id].els.forEach(e=>{if(!e.bbox||!isFinite(e.bbox[0])||!isFinite(e.bbox[3])||(e.bbox[2]-e.bbox[0])>3000||(e.bbox[3]-e.bbox[1])>3000)return;x0=Math.min(x0,e.bbox[0]);y0=Math.min(y0,e.bbox[1]);x1=Math.max(x1,e.bbox[2]);y1=Math.max(y1,e.bbox[3]);}));if(x0>x1){x0=0;y0=0;x1=sh.w;y1=sh.h;}return [x0,y0,x1,y1];}
function fitView(){const sh=sheet();const cw=canvas.clientWidth||400,ch=canvas.clientHeight||500;let [x0,y0,x1,y1]=sheetBBox(sh);const m=Math.max(20,(x1-x0)*.04);x0-=m;x1+=m;y0-=m;y1+=m;const k=Math.min(cw/(x1-x0),ch/(y1-y0))*.97;state.view={k,tx:(cw-(x1-x0)*k)/2-x0*k,ty:(ch-(y1-y0)*k)/2-y0*k};applyView();}
function zoomAt(f,cx,cy){const v=state.view;const nk=Math.min(400,Math.max(0.02,v.k*f));const r=nk/v.k;v.tx=cx-(cx-v.tx)*r;v.ty=cy-(cy-v.ty)*r;v.k=nk;applyView();scheduleRender();}
function centerOn(x,y,kmin){const v=state.view;if(kmin&&v.k<kmin)v.k=kmin;v.tx=canvas.clientWidth/2-x*v.k;v.ty=canvas.clientHeight/2-y*v.k-40;applyView();renderPlan();}
let raf=null;function scheduleRender(){if(raf)return;raf=requestAnimationFrame(()=>{raf=null;renderPlan();});}
function forMe(j){const r=role();if(r==='soudeur')return j.status==='a_souder'||j.status==='a_reprendre';if(r==='manchonneur')return j.status==='soudee'||j.status==='controlee';if(r==='chef')return j.status==='soudee'||j.status==='a_reprendre'||j.wire==='inversion';return true;}
function passFilter(j){const f=state.filter;if(f==='all')return true;if(f==='me')return forMe(j);if(f==='fils')return j.wire==='inversion';return j.status===f;}
const clockPos=(e,w)=>{let a=wirePos()[w];if(e.flip)a=(360-a)%360;return (a+(e.rot||0)+360)%360;};
const clockText=a=>(Math.round(((a%360)+360)%360/30)||12)+' h';
// pièce figée : dès qu'un manchon est fermé à l'un de ses bouts, son orientation n'est plus modifiable (renvoie les n° de soudure qui la figent, ou null)
const elLock=(l,c,i)=>{const cd=l.cond[c];if(!cd||!cd.els[i])return null;const m=[];const lj=cd.joints[i-1],rj=cd.joints[i];if(lj&&lj.status==='manchonnee')m.push(lj.weldId);if(rj&&rj.status==='manchonnee')m.push(rj.weldId);return m.length?m:null;};
function renderPlan(){
  if(state.calage&&state.calage.mode==='map'){renderCalageMap();return;}
  netG.style.display='';mkG.style.display='';
  const sh=sheet();const k=state.view.k;const ppm=sh.ppm;const kpm=k*ppm;bgG.style.display=state.show.fond?'':'none';
  const js=allJoints().filter(x=>x.l.sheetId===sh.id);const counts={};js.forEach(({j})=>counts[j.status]=(counts[j.status]||0)+1);const inv=js.filter(({j})=>j.wire==='inversion').length;
  const chips=[['all',`Toutes (${js.length})`,null],['me',`Pour moi (${js.filter(({j})=>forMe(j)).length})`,null],...ORDER.map(s=>[s,`${STATUS[s].label} (${counts[s]||0})`,STATUS[s].color]),['fils',`Fils : inversion (${inv})`,'#d03b3b']];
  $('#filters').innerHTML=chips.map(([kk,l,c])=>`<button class="chip ${state.filter===kk?'active':''}" data-f="${kk}">${c?`<i class="dot" style="background:${c}"></i>`:''}${esc(l)}</button>`).join('');
  const r=role();const tools=[];const sheets=Object.values(state.sheets);if(sheets.length>1)tools.push(`<select class="btn sm" id="sheetSel">${sheets.map(s=>`<option value="${s.id}" ${s.id===state.sheetId?'selected':''}>${esc(s.name)}</option>`).join('')}</select>`);
  const isTr=!!(NET&&NET.source==='traceur'),isEmpty=!NET||NET.id==='__vide'||!(NET.lines||[]).length;
  if(!isEmpty)tools.push(`<button class="btn sm" id="btnReport">📋 ${isTr?'Rapport du tracé':'Rapport d\'import'}</button>`);
  if(r==='chef'||r==='bureau'){if(!isTr&&!isEmpty)tools.push(`<button class="btn sm ${state.tool?'on':''}" id="btnTool">${state.tool?'✓ Fin de modification':'✥ Modifier le calepinage'}</button>`);
    tools.push(`<button class="btn sm" id="btnTraceur">✎ Traceur : ${isTr?'modifier ce réseau':'créer un réseau'}</button>`);if(isTr)tools.push(`<button class="btn sm" id="btnNewTraceur">＋ Nouveau réseau</button>`);if(!isEmpty){tools.push(`<button class="btn sm" id="btnVersions">⏱ Versions</button>`);tools.push(`<button class="btn sm" id="btnDelSite" style="color:#d03b3b">🗑 Supprimer ce chantier</button>`);}}
  $('#planTools').innerHTML=tools.join('');$('#planTools').style.display=tools.length?'':'none';canvas.classList.toggle('tracing',state.tracing);
  $('#hintbar').textContent=state.tracing?`Tape les sommets de l'axe (${state.tracePts.length} point${state.tracePts.length>1?'s':''}) puis « Terminer le tracé »`:'';
  const imgTag=sh.image&&sh.image.src?`<image href="${sh.image.src}" x="${sh.image.x||0}" y="${sh.image.y||0}" width="${sh.image.w}" height="${sh.image.h}" opacity="${sh.image.opacity===undefined?.5:sh.image.opacity}" preserveAspectRatio="none"/>`:''; // fond image du traceur (plan scanné / capture), à l'échelle réglée dans le traceur
  // fond vectoriel (DXF) : vue entière en cache (couleurs du DWG, hachures ; textes seulement au zoom), rendu partagé avec le traceur
  const bgFull=()=>{const ck='c'+(state.show.couleurs===false?0:1);if(!sh.bgSVG||sh.bgKey!==ck){sh.bgKey=ck;if(sh.drawingFar===undefined){const np=sh.drawing.reduce((t,d)=>t+(d.pts?d.pts.length:(d.loops?d.loops.reduce((x,q)=>x+q.length,0):0)),0);sh.drawingFar=np>60000?decimateDrawing(sh.drawing,{cap:45000,simp:0.5,minLen:1.5}).drawing:null;}sh.bgSVG=`<rect x="-1e5" y="-1e5" width="2e5" height="2e5" fill="#f4f3ee"/>`+imgTag+`<g opacity=".78">${drawingSVG(sh.drawingFar||sh.drawing,{k:1,texts:false,colors:state.show.couleurs!==false,op:1,fillOp:1}).svg}</g>`+(sh.plain?'':`<text x="${sh.w-160}" y="${sh.h-12}" font-size="12" fill="#898781" font-family="system-ui,sans-serif">fond : dessin d'origine (${sh.drawing.length} traits)</text>`);}return sh.bgSVG;};
  if(bgG.dataset.sheet!==sh.id){
    if(sh.type==='vector'&&sh.drawing){bgG.innerHTML=bgFull();}
    else if(sh.type==='plain'||sh.plain){bgG.innerHTML=`<rect x="-1e5" y="-1e5" width="2e5" height="2e5" fill="#f1f0eb"/>`+imgTag;}
    else if(sh.type==='image')bgG.innerHTML=`<rect x="0" y="0" width="${sh.w}" height="${sh.h}" fill="#fff"/><image href="${sh.src}" x="0" y="0" width="${sh.w}" height="${sh.h}" opacity=".62"/>`;
    else{let g=`<rect x="-1e5" y="-1e5" width="2e5" height="2e5" fill="#f1f0eb"/>`;const st=100/ppm;for(let x=0;x<=sh.w;x+=st)g+=`<line x1="${x}" y1="0" x2="${x}" y2="${sh.h}" stroke="#e2e1da" stroke-width="${0.6}" vector-effect="non-scaling-stroke"/>`;for(let y=0;y<=sh.h;y+=st)g+=`<line x1="0" y1="${y}" x2="${sh.w}" y2="${y}" stroke="#e2e1da" stroke-width="0.6" vector-effect="non-scaling-stroke"/>`;bgG.innerHTML=g+`<text x="${sh.w-140}" y="${sh.h-20}" font-size="14" fill="#898781" font-family="system-ui,sans-serif">carroyage 100 m — RGF93 / CC48</text>`;}
    bgG.dataset.sheet=sh.id;bgG.dataset.mode='';fitView();}
  // fond vectoriel zoomé : on ne dessine que les traits visibles (un chemin de plusieurs km à 20 px/m fait disparaître tout le calque dans Chrome)
  if(sh.type==='vector'&&sh.drawing&&sh.drawing.length){const zoomed=kpm>=2;const v0=state.view;const ck='c'+(state.show.couleurs===false?0:1)+(state.show.textes?'':':nt');const key=(zoomed?`z:${Math.round(v0.k*100)}:${Math.round(v0.tx)}:${Math.round(v0.ty)}`:'full')+ck;
    if(bgG.dataset.mode!==key){bgG.dataset.mode=key;if(!zoomed){bgG.innerHTML=bgFull();}else{if(!sh._bb)sh._bb=drawingBBoxes(sh.drawing);
      const cw=canvas.clientWidth,ch=canvas.clientHeight;const mx=cw*.5/k,my=ch*.5/k;const box=[(-v0.tx)/k-mx,(-v0.ty)/k-my,(cw-v0.tx)/k+mx,(ch-v0.ty)/k+my];
      bgG.innerHTML=`<rect x="-1e5" y="-1e5" width="2e5" height="2e5" fill="#f4f3ee"/>`+imgTag+`<g opacity=".78">${drawingSVG(sh.drawing,{k,box,bb:sh._bb,texts:!!state.show.textes,colors:state.show.couleurs!==false,op:1,fillOp:1}).svg}</g>`;}}}
  renderMap();
  // fenêtre visible (monde) pour ne dessiner que ce qui est à l'écran quand on est zoomé
  const v=state.view;const vx0=(-v.tx)/k-20,vy0=(-v.ty)/k-20,vx1=(canvas.clientWidth-v.tx)/k+20,vy1=(canvas.clientHeight-v.ty)/k+20;const cull=kpm>=2.5;
  // gaine dessinée : quasi à l'échelle au zoom détail (l'entraxe réel se voit, les deux gaines ne sont plus collées), grossie 1,7 × en dessous pour rester lisible
  const EX=kpm>=12?1.15:1.7;const far=kpm<6;const minW=far?2.2:5,minSep=far?2.4:4.5;const casingW=e=>Math.max(minW/k,casingOf(e)*ppm*EX);const offM=e=>Math.max(minSep/(k*ppm),casingOf(e)*EX*.62); // dézoomé : traits fins côte à côte (lisible), zoomé : gaine à l'échelle
  const showJoints=kpm>=5,showLabels=kpm>=12,showElLabels=kpm>=20,showWires=kpm>=15,showManchon=kpm>=10,lod=kpm;const S=state.show; // S : cases 👁 (ce qu'on affiche)
  let net='';let netJ=''; // soudures dessinées après toutes les pièces : toujours au premier plan, cliquables
  sh.lines.forEach(id=>{const line=state.lines[id];['A','R'].forEach(c=>{if(!line.cond[c])return;const side=c==='A'?1:-1;const col=c==='A'?'#c8382f':'#2a5fb4';const {els,joints}=line.cond[c];
    els.forEach((e,i)=>{if(cull&&(e.bbox[2]<vx0||e.bbox[0]>vx1||e.bbox[3]<vy0||e.bbox[1]>vy1))return;
      const w=casingW(e);const d=(line.single?0:e.ownAxis?Math.max(0,(far?minSep/(k*ppm):(w*k+2)/(2*k*ppm))-(line.axisHalf||.2))*side:Math.max(offM(e),far?0:(w*k+2)/(2*k*ppm))*side)*ppm;const stJ=joints[i]||joints[i-1];const st=stJ?stJ.status:'a_souder';
      const selE=state.sel&&state.sel.kind==='el'&&state.sel.line===id&&state.sel.cond===c&&state.sel.i===i;
      const paths=e.axis.map(pl=>pathD(offsetPoly(pl,d)));const dd=paths.join(' ');
      const detail=kpm>=12; const Lax=e.len; const nueEl=!!e.nue||(e.manchette&&Lax<=0.35); const bare=(detail&&e.kind!=='valve'&&e.kind!=='endcap'&&Lax>0.6)?.15:0; // bouts d'acier nus (15 cm) au zoom près ; manchette nue : tout en acier
      const steelW=w*.5, foamT=Math.max(.05,casingOf(e)*EX*.07)*ppm;
      const cap='butt';
      if(state.tool&&e.piece&&(e.piece.role&&e.piece.role!=='fixed'||e.piece.orangeNo)){const col=e.piece.role==='block'?'#2a78d6':(e.piece.role==='man'||e.piece.role==='jm'||e.piece.orangeNo)?'#f28c28':e.piece.role==='new'?'#3aa655':null;if(col)net+=`<path d="${dd}" stroke="${col}" stroke-width="${w*2.3+4/k}" fill="none" opacity=".5" stroke-linecap="round" stroke-linejoin="round"/>`;}
      const isSteel=e.kind==='steelbend'; // courbe acier (SXB) : acier apparent tant que non manchonnée
      const jA=joints[i-1], jB=joints[i]; const bothMan=isSteel&&(!jA||jA.status==='manchonnee')&&(!jB||jB.status==='manchonnee')&&(jA||jB);
      net+=`<g class="el" data-line="${id}" data-cond="${c}" data-el="${i}"><path d="${dd}" stroke="transparent" stroke-width="${Math.max(w*1.8,16/k)}" fill="none" stroke-linecap="round" stroke-linejoin="round"/>`; // zone de prise large (doigt / souris)
      if(selE)net+=`<path d="${dd}" stroke="#2a78d6" stroke-width="${w*2}" fill="none" opacity=".45" stroke-linecap="round" stroke-linejoin="round"/>`;
      if(far){ // loin : un trait par conduite, aller rouge / retour bleu, teinté par l'avancement de la soudure aval
        const core=st==='a_souder'?col:STATUS[st].color;net+=`<path d="${dd}" stroke="${core}" stroke-width="${w}" fill="none" stroke-linecap="${cap}" stroke-linejoin="round" opacity=".92"/>`;
      } else if(lod<12){ // moyen : gaine sombre + âme colorée par l'avancement
        net+=`<path d="${dd}" stroke="#141414" stroke-width="${w}" fill="none" stroke-linecap="${cap}" stroke-linejoin="round"/>`;
        const core=st==='a_souder'?'#c9c7bf':STATUS[st].color;net+=`<path d="${dd}" stroke="${core}" stroke-width="${w*.7}" fill="none" stroke-linecap="${cap}" stroke-linejoin="round"/>`;
      } else if(nueEl){ // manchette nue : bout d'acier sans isolant entre deux pièces (deux soudures, un seul manchon)
        net+=`<path d="${dd}" stroke="#7c828a" stroke-width="${steelW*1.05}" fill="none" stroke-linecap="butt"/><path d="${e.axis.map(pl=>pathD(offsetPoly(pl,d-steelW*.28))).join(' ')}" stroke="#dfe3e8" stroke-width="${steelW*.25}" fill="none" opacity=".55"/>`;
      } else if(isSteel&&!bothMan){ // courbe acier nue
        net+=`<path d="${dd}" stroke="#7c828a" stroke-width="${steelW*1.05}" fill="none" stroke-linecap="butt" stroke-linejoin="round"/><path d="${e.axis.map(pl=>pathD(offsetPoly(pl,d-steelW*.28))).join(' ')}" stroke="#dfe3e8" stroke-width="${steelW*.25}" fill="none" opacity=".55" stroke-linejoin="round"/>`;
      } else {
        // gaine noire (raccourcie des bouts nus) + reflet + tranches jaunes + acier nu + colliers
        e.axis.forEach((pl,pi)=>{const isMain=pi===0;const m0=isMain?bare:0,m1=isMain?Lax-bare:polyLen(pl);const cas=offsetPoly(axisSub(pl,m0,m1),d);
          net+=`<path d="${pathD(cas)}" stroke="${bothMan?'#3a3d42':'#161616'}" stroke-width="${bothMan?w*1.18:w}" fill="none" stroke-linecap="${cap}" stroke-linejoin="round"/>`;
          if(bothMan){ // accordéon SXB : nervures perpendiculaires
            for(let m=m0+.06;m<m1-.05;m+=.045){const p=axisSub(pl,m,m+.001);const q=offsetPoly(p,d)[0];const t=axisSub(pl,m-.02,m+.02);const dx=t[1].x-t[0].x,dy=t[1].y-t[0].y;const L2=Math.hypot(dx,dy)||1;const nx=-dy/L2*w*.59,ny=dx/L2*w*.59;net+=`<line x1="${q.x-nx}" y1="${q.y-ny}" x2="${q.x+nx}" y2="${q.y+ny}" stroke="#8b9099" stroke-width="${Math.max(1/k,.012*ppm)}" opacity=".8"/>`;}
          }
          if(isMain&&bare){[[0,'L'],[1,'R']].forEach(([side2,_])=>{const mS=side2?Lax-bare:0,mE=side2?Lax:bare;const st2=offsetPoly(axisSub(pl,mS,mE),d);const stroke=(side2?jB:jA)&&(side2?jB:jA).status==='manchonnee'?null:'#aeb4bb';
            if(stroke){net+=`<path d="${pathD(st2)}" stroke="${stroke}" stroke-width="${steelW}" fill="none" stroke-linecap="butt"/><path d="${pathD(offsetPoly(axisSub(pl,mS,mE),d-steelW*.3))}" stroke="#e6e9ed" stroke-width="${steelW*.22}" fill="none" opacity=".6"/>`;
              const mF=side2?Lax-bare:bare;const t2=axisSub(pl,Math.max(0,mF-.03),Math.min(Lax,mF+.03));const q=offsetPoly(axisSub(pl,mF,mF+.001),d)[0];const dx=t2[t2.length-1].x-t2[0].x,dy=t2[t2.length-1].y-t2[0].y;const L2=Math.hypot(dx,dy)||1;const nx=-dy/L2*w/2,ny=dx/L2*w/2;
              net+=`<line x1="${q.x-nx}" y1="${q.y-ny}" x2="${q.x+nx}" y2="${q.y+ny}" stroke="#e3cd63" stroke-width="${Math.max(2/k,foamT)}" stroke-linecap="butt"/>`;}});}
          if(isMain&&e.kind==='pipe'&&Lax>3){const colr=line.single?(line.single==='A'?'#c8382f':'#2a5fb4'):col;for(let m=bare+.7*casingOf(e)*EX;m<Lax-bare-.5*casingOf(e)*EX;m+=2.5){net+=`<path d="${pathD(offsetPoly(axisSub(pl,m,m+.16*casingOf(e)*EX),d))}" stroke="${colr}" stroke-width="${w}" fill="none" stroke-linecap="butt"/>`;}}
        });
        if(e.kind==='pipe'&&e.cut&&Lax>1){const p=axisSub(e.axis[0],Lax*.5-.05,Lax*.5+.05);const q=offsetPoly(p,d);net+=`<path d="${pathD(q)}" stroke="#ffffff" stroke-width="${w*.5}" fill="none" opacity=".35" stroke-dasharray="${w*.12} ${w*.12}"/>`;}
      }
      if(e.kind==='tee'&&e.vert){const mid=elMid(e);const mx=mid.x+mid.ty*d,my=mid.y-mid.tx*d;const r=Math.max(w*.9,7/k);const up=e.vert==='up';const tri=up?`${mx},${my-r*.62} ${mx-r*.55},${my+r*.4} ${mx+r*.55},${my+r*.4}`:`${mx},${my+r*.62} ${mx-r*.55},${my-r*.4} ${mx+r*.55},${my-r*.4}`;net+=`<circle cx="${mx}" cy="${my}" r="${r}" fill="#fff" stroke="${col}" stroke-width="${Math.max(w*.18,1.5/k)}"/><polygon points="${tri}" fill="${up?'#0b0b0b':'#2a5fb4'}"/>`;if(showLabels&&S.pieces)net+=`<text x="${mx}" y="${my-r-3/k}" font-size="${Math.max(10/k,.3*ppm)}" text-anchor="middle" fill="#333" paint-order="stroke" stroke="#fff" stroke-width="${2/k}" font-family="system-ui,sans-serif" pointer-events="none">${up?'purge ▲':'vidange ▼'} DN${e.dnb||''}</text>`;} // té de purge / vidange : symbole rond + triangle
      if(e.kind==='tee'&&e.branch&&e.branch.length===2){const b0=e.branch[0],b1=e.branch[1];const wb=Math.max(minW/k,casingOf({dn:e.dnb||e.dn})*ppm*EX);if(e.saut)net+=`<line x1="${b0[0]}" y1="${b0[1]}" x2="${b1[0]}" y2="${b1[1]}" stroke="#f4f3ee" stroke-width="${wb*2}" stroke-linecap="butt"/>`;net+=`<line x1="${b0[0]}" y1="${b0[1]}" x2="${b1[0]}" y2="${b1[1]}" stroke="${far?col:'#161616'}" stroke-width="${wb}" stroke-linecap="butt"/>`;if(!far)net+=`<line x1="${b0[0]}" y1="${b0[1]}" x2="${b1[0]}" y2="${b1[1]}" stroke="${col}" stroke-width="${wb*.45}" stroke-linecap="butt" opacity=".9"/>`;} // branche du té (jusqu'à la sortie où repart l'antenne) ; té à saut : par-dessus la conduite voisine
      if(showWires&&S.fils&&e.kind!=='valve'&&e.kind!=='endcap'&&!isSteel){['E','N'].forEach(wn=>{const a=clockPos(e,wn);const o=(-Math.sin(rad(a)))*casingOf(e)*EX*.37*ppm;const front=Math.cos(rad(a))>=0;net+=`<path d="${e.axis.map(pl=>pathD(offsetPoly(axisSub(pl,bare+.02,polyLen(pl)-bare-.02),d+o))).join(' ')}" stroke="${WIRE[wn].color}" stroke-width="${Math.max(1.4/k,.022*ppm)}" fill="none" ${front?'':'stroke-dasharray="'+(.25*ppm)+' '+(.15*ppm)+'"'} opacity="${front?.95:.55}" stroke-linejoin="round"/>`;});}
      if(detail){const mid=elMid(e);const mx=mid.x+mid.ty*d,my=mid.y-mid.tx*d;const ang=Math.atan2(mid.ty,mid.tx)*180/Math.PI;
        if(e.kind==='valve')net+=`<g transform="translate(${mx} ${my}) rotate(${ang})"><rect x="${-w*.22}" y="${-w*.62}" width="${w*.44}" height="${w*1.24}" rx="${w*.06}" fill="#2b2e33"/><rect x="${-w*.05}" y="${-w*.62-w*.5}" width="${w*.1}" height="${w*.5}" fill="#2b2e33"/><rect x="${-w*.28}" y="${-w*.62-w*.6}" width="${w*.56}" height="${w*.12}" rx="${w*.04}" fill="#3d4147"/></g>`;
        else if(e.kind==='endcap'){const p=e.to;const nx=mid.ty,ny=-mid.tx;net+=`<line x1="${p.x+nx*d-nx*w*.6}" y1="${p.y+ny*d-ny*w*.6}" x2="${p.x+nx*d+nx*w*.6}" y2="${p.y+ny*d+ny*w*.6}" stroke="#2b2e33" stroke-width="${Math.max(2/k,.08*ppm)}" stroke-linecap="round"/>`;}
        else if(e.kind==='reducer')net+=`<text x="${mx}" y="${my+w*.2}" font-size="${w*.6}" font-weight="700" fill="#fff" text-anchor="middle" font-family="system-ui,sans-serif" pointer-events="none" opacity=".8">R</text>`;}
      if(showElLabels&&(S.pieces||S.cotes)&&(c==='A'||line.single)){const mid=elMid(e);const lp={x:mid.x+mid.ty*d*2.6,y:mid.y-mid.tx*d*2.6};const fs=Math.max(10/k,.3*ppm);
        // cases 👁 : nom de la pièce (P7, C5, T2 · té…) et/ou cote (longueur, angle) — les deux, l'un ou l'autre
        const isPB=e.kind==='pipe'||e.kind==='bend'||e.kind==='steelbend';const name=S.pieces?(isPB?e.id:`${e.id} · ${e.kindLabel||e.kind}`)+((e.rot||e.flip)?' ↻'+e.rot+'°':''):'';const cote=S.cotes?(e.kind==='pipe'?`${fmt(e.len)} m`:(e.kind==='bend'||e.kind==='steelbend')&&e.angle?`${e.angle}°`:''):'';const lab=[name,cote].filter(Boolean).join(' · ');
        if(lab)net+=`<text x="${lp.x}" y="${lp.y}" font-size="${fs}" fill="#333" text-anchor="middle" font-family="system-ui,sans-serif" paint-order="stroke" stroke="#fff" stroke-width="${fs*.25}" pointer-events="none">${esc(lab)}</text>`;}
      net+=`</g>`;});
    joints.forEach((j,i)=>{const e=els[i];if(cull&&(e.to.x<vx0||e.to.x>vx1||e.to.y<vy0||e.to.y>vy1))return;const p=jointPos(line,i,c);const w=casingW(e);const d=(line.single?0:e.ownAxis?Math.max(0,(far?minSep/(k*ppm):(w*k+2)/(2*k*ppm))-(line.axisHalf||.2))*side:Math.max(offM(e),far?0:(w*k+2)/(2*k*ppm))*side)*ppm;const px=p.x+p.ty*d,py=p.y-p.tx*d;
      const detail=kpm>=12;const st=STATUS[j.status];const sel=state.sel&&state.sel.kind==='j'&&state.sel.line===id&&state.sel.cond===c&&state.sel.i===i;const dim=!passFilter(j);const eB=els[i+1];const isSxb=e.kind==='steelbend'||(eB&&eB.kind==='steelbend');
      const seg=(m0,m1)=>[{x:px+p.tx*m0*ppm,y:py+p.ty*m0*ppm},{x:px+p.tx*m1*ppm,y:py+p.ty*m1*ppm}];
      const numTxt=(x)=>(S.nums&&(showLabels||sel))?`<text class="num" x="${side>0?x:-x}" y="4" text-anchor="${side>0?'start':'end'}">${j.weldId}</text>`:''; // n° de soudure (case 👁)
      const nd=(j.steps&&[1,2,3,4].filter(n2=>j.steps[n2]&&j.steps[n2].done).length)||0; // sous-étapes manchon faites → anneau vert ¼ / ½ / ¾ / plein autour de la pastille (maquette 20/08)
      const ring=(r0)=>{if(!nd||j.status==='manchonnee')return '';const C=2*Math.PI*r0;return `<circle r="${r0}" fill="none" stroke="#0ca30c" stroke-width="2.4" stroke-dasharray="${(C*nd/4).toFixed(1)} ${C.toFixed(1)}" transform="rotate(-90)" stroke-linecap="round" opacity=".95" data-ring="${nd}"/>`;}; // pathLength interdit ici : innerHTML le minusculise et SVG l'ignore
      netJ+=`<g class="marker" data-line="${id}" data-cond="${c}" data-j="${i}" ${dim?'opacity=".3"':''}>`;
      if(state.transfer&&state.transfer.line===id&&state.transfer.cond===c&&state.transfer.i===i)netJ+=`<g transform="translate(${px} ${py}) scale(${1/k})"><circle r="16" fill="none" stroke="#b8560f" stroke-width="3" class="tpulse"/><circle r="22" fill="none" stroke="#b8560f" stroke-width="1.5" opacity=".5" class="tpulse"/></g>`;
      if(state.tool&&e.piece&&e.piece.ojoint)netJ+=`<g transform="translate(${px} ${py}) scale(${1/k})"><circle r="14" fill="rgba(242,140,40,.18)" stroke="#f28c28" stroke-width="3"/></g>`;
      if(showJoints&&!detail){ // moyen : capsule cliquable, contour couleur statut
        const rr=Math.max(3.5/k,Math.min(9/k,.28*ppm));netJ+=`<path d="${pathD(seg(-.3,.3))}" stroke="${st.color}" stroke-width="${w*1.4+3/k}" fill="none" stroke-linecap="round"/><path d="${pathD(seg(-.3,.3))}" stroke="#33363a" stroke-width="${w*1.15}" fill="none" stroke-linecap="round"/>`;
        if(sel)netJ+=`<path d="${pathD(seg(-.4,.4))}" stroke="#0b0b0b" stroke-width="${w*1.4+6/k}" fill="none" stroke-linecap="round" opacity=".9"/><path d="${pathD(seg(-.4,.4))}" stroke="${st.color}" stroke-width="${w*1.4+2/k}" fill="none" stroke-linecap="round"/>`;
      }
      if(detail){
        if(j.status==='manchonnee'&&!isSxb){ // manchon droit : capsule graphite + bandes claires + reflet (case 👁 « manchons »)
          if(S.manch){const th=Math.atan2(p.ty,p.tx)*180/Math.PI;const h=w*1.18,Ls=.65*ppm;netJ+=`<g transform="translate(${px} ${py}) rotate(${th})"><rect x="${-Ls/2}" y="${-h/2}" width="${Ls}" height="${h}" rx="${h*.1}" fill="url(#gSleeve)"/><rect x="${-Ls/2+.025*ppm}" y="${-h/2+.012*ppm}" width="${Ls*.13}" height="${h-.024*ppm}" rx="${h*.05}" fill="#8b9099" opacity=".7"/><rect x="${Ls/2-.025*ppm-Ls*.13}" y="${-h/2+.012*ppm}" width="${Ls*.13}" height="${h-.024*ppm}" rx="${h*.05}" fill="#8b9099" opacity=".7"/></g>`;}
        } else if(j.status!=='a_souder'&&j.status!=='manchonnee'){ // cordon de soudure
          netJ+=`<path d="${pathD(seg(-.03,.03))}" stroke="#5d6269" stroke-width="${w*.56}" fill="none" stroke-linecap="butt"/>`;
        } else if(j.status==='a_souder'){ // jeu entre les deux aciers
          netJ+=`<path d="${pathD(seg(-.008,.008))}" stroke="#e9e8e2" stroke-width="${w*.6}" fill="none" stroke-linecap="butt"/>`;
        }
        if(sel)netJ+=`<path d="${pathD(seg(-.42,.42))}" stroke="#0b0b0b" stroke-width="${w*1.5}" fill="none" stroke-linecap="round" opacity=".18"/><path d="${pathD(seg(-.42,.42))}" stroke="#0b0b0b" stroke-width="${2/k}" fill="none" stroke-linecap="round" stroke-dasharray="${4/k} ${3/k}"/>`;
        // zone tactile (capsule invisible 0,7 m × 1,4 gaine)
        netJ+=`<path d="${pathD(seg(-.35,.35))}" stroke="transparent" stroke-width="${w*1.5}" fill="none" stroke-linecap="round" style="cursor:pointer"/>`;
        // pastille de statut, côté extérieur, à taille écran — reliée à sa soudure par un trait (on sait laquelle est visée), anneau à la couleur de la conduite (rouge aller / bleu retour) (case 👁 « pastilles »)
        if(S.soud){const so=side*(w*.62+13/k);const mx=px+p.ty*so,my=py-p.tx*so;
        netJ+=`<line x1="${px}" y1="${py}" x2="${mx}" y2="${my}" stroke="${col}" stroke-width="${1.6/k}" opacity=".9"/><g transform="translate(${mx} ${my}) scale(${1/k})"><circle r="12" fill="transparent"/><circle r="8.5" fill="#fff" stroke="${col}" stroke-width="2.2"/><circle r="6" fill="${st.color}"/>${st.glyph?`<text font-size="9" font-weight="700" fill="#fff" text-anchor="middle" dominant-baseline="central" font-family="system-ui,sans-serif">${st.glyph}</text>`:''}${ring(11.6)}${j.wire==='inversion'?`<circle cx="8" cy="-8" r="4" fill="#d03b3b" stroke="#fff" stroke-width="1.5"/>`:j.wire==='raccorde'?`<circle cx="8" cy="-8" r="3.5" fill="#dfe4ea" stroke="#555" stroke-width="1"/>`:''}${numTxt(14)}</g>`;}
      } else if(showJoints&&S.soud){const rr=Math.max(3.5/k,Math.min(9/k,.28*ppm));const so=side*(w*.9+rr*1.1+6/k);const mx=px+p.ty*so,my=py-p.tx*so;
        netJ+=`<line x1="${px}" y1="${py}" x2="${mx}" y2="${my}" stroke="${col}" stroke-width="${1.2/k}" opacity=".8"/><g transform="translate(${mx} ${my}) scale(${1/k})"><circle r="${rr*k+5}" fill="transparent"/><circle r="${Math.max(3,rr*k*.6)}" fill="${st.color}" stroke="${col}" stroke-width="1.6"/>${ring(Math.max(3,rr*k*.6)+3.4)}${numTxt(rr*k+4)}</g>`;}
      netJ+=`</g>`;
    });
  });});
  if(showElLabels&&S.notes&&sh.ann)sh.ann.forEach(a=>{if(cull&&(a.p[0]<vx0||a.p[0]>vx1||a.p[1]<vy0||a.p[1]>vy1))return;net+=`<g transform="translate(${a.p[0]} ${a.p[1]}) scale(${1/k})"><circle r="3" fill="#8a2be2"/><text x="6" y="-4" font-size="10" font-style="italic" fill="#6a1fb0" font-family="system-ui,sans-serif" paint-order="stroke" stroke="#fff" stroke-width="3">${esc(a.text)}</text></g>`;});
  if(state.tracing&&state.tracePts.length){net+=`<path d="${pathD(state.tracePts)}" stroke="#1c3d6b" stroke-width="${3/k}" fill="none" stroke-dasharray="${6/k} ${4/k}"/>`+state.tracePts.map(p=>`<circle cx="${p.x}" cy="${p.y}" r="${5/k}" fill="#1c3d6b" stroke="#fff" stroke-width="${1.5/k}"/>`).join('');}
  netG.innerHTML=net+netJ;
  { // réseau hors écran (fausse manip au zoom / glisser) : bouton pour le retrouver
    const bb=sheetBBox(sh);let off=(bb[2]<vx0+20||bb[0]>vx1-20||bb[3]<vy0+20||bb[1]>vy1-20);
    if(off){const s4=stockOf();if(s4&&s4.zones.some(z=>z.x+z.w>vx0&&z.x-z.w<vx1&&z.y+z.h>vy0&&z.y-z.h<vy1))off=false;} // une zone de stockage à l'écran (base vie...) = on n'est PAS perdu : pas de bouton qui barre la route
    const ob=$('#offscreen');if(ob)ob.style.display=off&&sh.lines.length?'':'none';}
  $('#legend').innerHTML=`<span><i class="bar" style="background:#c8382f"></i>aller</span><span><i class="bar" style="background:#2a5fb4"></i>retour</span>`+ORDER.map(s=>`<span><i style="${s==='a_souder'?`border-color:${STATUS[s].color};background:#fff`:`background:${STATUS[s].color};border-color:${STATUS[s].color}`}"></i>${STATUS[s].label}</span>`).join('')+`<span><i class="bar" style="background:#dfe4ea;border:1px solid #999"></i>étamé</span><span><i class="bar" style="background:#e2843a"></i>nu</span><span>${lod<3?'zoome : manchons puis détail':lod<12?'zoome pour le détail des pièces (bouts d\'acier, manchons, n°)':lod<30?'zoome encore pour les fils':'fils visibles'} · 👁 : choisir ce qui s\'affiche</span>`;
  $('#btnList').textContent=state.listMode?'Plan':'Liste';
  renderGps();renderHydroOverlay();renderDhOverlay();renderStockOverlay();
}

/* ---------- pan / zoom / tap ---------- */
const ptrs=new Map();let gesture=null;
canvas.addEventListener('pointerdown',e=>{if(e.target.closest('.zoomctl,.legend,.zoominfo,.disp,#offscreen,#transferBar,#calageBar,#hydroBar,#stockBar'))return;if($('#disp').classList.contains('show'))toggleDisp(false);try{canvas.setPointerCapture(e.pointerId);}catch(e2){}ptrs.set(e.pointerId,{x:e.clientX,y:e.clientY});const rect=canvas.getBoundingClientRect();
  const stkT=e.target.closest('[data-stkh],[data-stkz]'); // zone de stockage : glisser / poignées (chef/bureau)
  if(ptrs.size===1&&stkT&&stockCanEdit()&&!state.stockPose){const zid=stkT.dataset.stkzid||stkT.dataset.stkz;const z0=stockZoneById(zid);gesture={type:'stk',h:stkT.dataset.stkh||'move',zid,lx:e.clientX,ly:e.clientY,rect,moved:false,x0:z0?z0.x:0,y0:z0?z0.y:0};return;}
  if(ptrs.size===1){const tg=e.target.closest('[data-j],[data-el]');gesture={type:'pan',sx:e.clientX,sy:e.clientY,tx:state.view.tx,ty:state.view.ty,moved:false,target:tg,lx:e.clientX-rect.left,ly:e.clientY-rect.top,t0:Date.now()};
    if(state.tool&&tg){const l=state.lines[tg.dataset.line];const c=tg.dataset.cond;const eng=l&&engOf(l,c);const cels=l&&l.cond[c]?l.cond[c].els:null;if(eng&&cels&&state.toolLine===l.id&&state.toolCond===c){if(tg.dataset.el!==undefined){const el=cels[+tg.dataset.el];const r=el&&eng.roleOf(el.uid);if(r&&r.role==='block')gesture={type:'tdrag',line:l.id,cond:c,lx:e.clientX,ly:e.clientY,moved:false,target:tg};}
      else if(tg.dataset.j!==undefined){const el=cels[+tg.dataset.j];if(el)gesture={type:'jdrag',line:l.id,cond:c,uid:el.uid,sx:e.clientX,sy:e.clientY,lx:e.clientX,ly:e.clientY,moved:false,target:tg};}}}}
  else if(ptrs.size===2){const [a,b]=[...ptrs.values()];gesture={type:'pinch',d0:Math.hypot(a.x-b.x,a.y-b.y),k0:state.view.k,mx:(a.x+b.x)/2-rect.left,my:(a.y+b.y)/2-rect.top,tx0:state.view.tx,ty0:state.view.ty,moved:true};}});
canvas.addEventListener('pointermove',e=>{if(!ptrs.has(e.pointerId))return;ptrs.set(e.pointerId,{x:e.clientX,y:e.clientY});if(!gesture)return;
  if(gesture.type==='pan'){const dx=e.clientX-gesture.sx,dy=e.clientY-gesture.sy;if(Math.hypot(dx,dy)>5)gesture.moved=true;if(gesture.moved){state.view.tx=gesture.tx+dx;state.view.ty=gesture.ty+dy;applyView();}}
  else if(gesture.type==='tdrag'){const kk=state.view.k*sheet().ppm;const dx=(e.clientX-gesture.lx)/kk,dy=(e.clientY-gesture.ly)/kk;gesture.lx=e.clientX;gesture.ly=e.clientY;if(dx||dy){gesture.moved=true;const l=state.lines[gesture.line];const eng=l&&engOf(l,gesture.cond);if(eng)eng.dragBlock(dx,dy);}}
  else if(gesture.type==='jdrag'){if(!gesture.moved&&Math.hypot(e.clientX-gesture.sx,e.clientY-gesture.sy)<5)return;gesture.moved=true;const kk=state.view.k*sheet().ppm;const dx=(e.clientX-gesture.lx)/kk,dy=(e.clientY-gesture.ly)/kk;gesture.lx=e.clientX;gesture.ly=e.clientY;const l=state.lines[gesture.line];const eng=l&&engOf(l,gesture.cond);if(eng)eng.dragJoint(gesture.uid,dx,dy);}
  else if(gesture.type==='stk'){const z=stockZoneById(gesture.zid);if(!z)return;const v=state.view;const wx=(e.clientX-gesture.rect.left-v.tx)/v.k,wy=(e.clientY-gesture.rect.top-v.ty)/v.k;
    const dx=(e.clientX-gesture.lx)/v.k,dy=(e.clientY-gesture.ly)/v.k;gesture.lx=e.clientX;gesture.ly=e.clientY;if(Math.abs(dx)+Math.abs(dy)>0.01)gesture.moved=true;
    if(gesture.h==='move'){z.x=+(z.x+dx).toFixed(2);z.y=+(z.y+dy).toFixed(2);}
    else if(gesture.h==='rot'){z.rot=Math.round((Math.atan2(wy-z.y,wx-z.x)*180/Math.PI+90)/5)*5;}
    else{const a=(z.rot||0)*Math.PI/180;const lx2=(wx-z.x)*Math.cos(a)+(wy-z.y)*Math.sin(a);const ly2=-(wx-z.x)*Math.sin(a)+(wy-z.y)*Math.cos(a);
      if(gesture.h==='w')z.w=Math.max(2,+(2*Math.abs(lx2)).toFixed(1));else z.h=Math.max(1.5,+(2*Math.abs(ly2)).toFixed(1));}
    renderStockOverlay();}
  else if(gesture.type==='pinch'&&ptrs.size===2){const [a,b]=[...ptrs.values()];const dd=Math.hypot(a.x-b.x,a.y-b.y);const nk=Math.min(60,Math.max(.05,gesture.k0*dd/gesture.d0));const rr=nk/gesture.k0;state.view.k=nk;state.view.tx=gesture.mx-(gesture.mx-gesture.tx0)*rr;state.view.ty=gesture.my-(gesture.my-gesture.ty0)*rr;applyView();}});
let lastTap=0;
function endPtr(e){if(!ptrs.has(e.pointerId))return;ptrs.delete(e.pointerId);
  if(gesture&&gesture.type==='stk'){if(gesture.moved){
      const z=stockZoneById(gesture.zid);const s=stockOf();
      if(z&&s&&gesture.h==='move'){const dist=Math.hypot(z.x-gesture.x0,z.y-gesture.y0);
        if(dist>=5)s.moves.push({at:new Date().toISOString(),by:(me()||{}).name||state.userId,zoneMove:z.id,label:z.name,dist:+dist.toFixed(1),from:[+gesture.x0.toFixed(1),+gesture.y0.toFixed(1)],to:[+z.x.toFixed(1),+z.y.toFixed(1)]});} // déplacement significatif : tracé comme un mouvement (Ethan 25/08)
      saveStock();}else{const was=state.stockSel===gesture.zid;state.stockSel=gesture.zid;const z=stockZoneById(gesture.zid);
      if(z){updateStockBar('Zone « '+z.name+' » — glisser pour déplacer, poignées pour étirer, ↻ pour tourner, Terminer pour sortir.');if(!was)openStockZoneModal(z.id);} // tap = fiche de la zone (reste, provenance, attendu) ; re-tap = juste l'édition
      renderStockOverlay();}
    gesture=null;if(ptrs.size===0)scheduleRender();return;}
  if(state.tool&&gesture&&(gesture.type==='pan'||gesture.type==='tdrag'||gesture.type==='jdrag')&&!gesture.moved&&gesture.target){const t=gesture.target;const l=state.lines[t.dataset.line];
    const c=t.dataset.cond;const eng=l&&engOf(l,c);const cels=l&&l.cond[c]?l.cond[c].els:null;if(eng&&cels){activateToolLine(l.id,c);if(t.dataset.j!==undefined){const el=cels[+t.dataset.j];if(el)eng.toolTapJoint(el.uid);}else if(t.dataset.el!==undefined){const el=cels[+t.dataset.el];if(el)eng.toolTap(el.uid);}}
    gesture=null;if(ptrs.size===0)scheduleRender();return;}
  if(gesture&&gesture.type==='pan'&&!gesture.moved){const now=Date.now();const t=gesture.target;
    if(state.transfer&&t&&t.dataset.j!==undefined){doTransferTo(t.dataset.line,t.dataset.cond,+t.dataset.j);gesture=null;if(ptrs.size===0)scheduleRender();return;}
    if(state.calage){const v=state.view;calageTap((gesture.lx-v.tx)/v.k,(gesture.ly-v.ty)/v.k);gesture=null;if(ptrs.size===0)scheduleRender();return;}
    if(state.hydroPose){const v=state.view;hydroTap((gesture.lx-v.tx)/v.k,(gesture.ly-v.ty)/v.k);gesture=null;if(ptrs.size===0)scheduleRender();return;}
    if(state.stockPose){const v=state.view;stockTap((gesture.lx-v.tx)/v.k,(gesture.ly-v.ty)/v.k);gesture=null;if(ptrs.size===0)scheduleRender();return;}
    if(t&&t.dataset.j!==undefined)openJoint(t.dataset.line,t.dataset.cond,+t.dataset.j);
    else if(state.tracing){const v=state.view;state.tracePts.push({x:(gesture.lx-v.tx)/v.k,y:(gesture.ly-v.ty)/v.k});renderPlan();}
    else if(t&&t.dataset.el!==undefined&&state.view.k*sheet().ppm>=7)openEl(t.dataset.line,t.dataset.cond,+t.dataset.el);
    else if(now-lastTap<350){zoomAt(2.2,gesture.lx,gesture.ly);}
    else if(state.sel){closeSheet();}
    lastTap=now;}
  gesture=null;if(ptrs.size===0)scheduleRender();}
canvas.addEventListener('pointerup',endPtr);canvas.addEventListener('pointercancel',endPtr);
canvas.addEventListener('wheel',e=>{e.preventDefault();const rect=canvas.getBoundingClientRect();zoomAt(Math.exp(-e.deltaY*.0015),e.clientX-rect.left,e.clientY-rect.top);},{passive:false});
$('#offscreen').addEventListener('click',()=>{fitView();renderPlan();});
$('.zoomctl').addEventListener('click',e=>{const z=e.target.dataset.z;if(!z)return;if(z==='eye'){toggleDisp();return;}if(z==='gps'){gpsToggle();return;}const cw=canvas.clientWidth/2,ch=canvas.clientHeight/2;if(z==='+')zoomAt(1.6,cw,ch);else if(z==='-')zoomAt(1/1.6,cw,ch);else{fitView();renderPlan();}});
window.addEventListener('resize',()=>{fitView();renderPlan();});
$('#tfCancel').addEventListener('click',endTransfer);
$('#tfGo').addEventListener('click',()=>{const v=String($('#tfNum').value).replace(/\D/g,'');if(!v)return;let f=findWeld('S-'+v.padStart(4,'0'))||findWeld('S-'+v.padStart(3,'0'));if(!f){toast('Soudure introuvable : '+v);return;}const l=f.l,c=f.c,i=l.cond[c].joints.indexOf(f.j);doTransferTo(l.id,c,i);});
window.addEventListener('keydown',e=>{if(e.key==='Escape'&&state.transfer)endTransfer();if(e.key==='Escape'&&state.calage)endCalage();if(e.key==='Escape'&&state.hydroPose)endHydroPose();if(e.key==='Escape'&&(state.stockPose||state.stockSel))endStockPose();});
$('#hyDone').addEventListener('click',endHydroPose);
$('#stkDone').addEventListener('click',endStockPose);
$('#stkRot').addEventListener('click',()=>{const z=stockZoneById(state.stockSel);if(!z){toast('Touche d\'abord une zone');return;}z.rot=((z.rot||0)+15)%360;saveStock();renderStockOverlay();});
$('#hyRot').addEventListener('click',()=>{const h=hydroOf();if(!h||!h.skids||!h.skids.length)return;const sk=h.skids[h.skids.length-1];sk.rot=((sk.rot||0)+15)%360;saveHydro();renderPlan();});
$('#disp').addEventListener('change',e=>{const k=e.target.dataset.k;if(!k)return;state.show[k]=e.target.checked;saveShow();renderDisp();renderPlan();});
$('#disp').addEventListener('click',e=>{const cb=e.target.closest('[data-cal]');if(cb){if(cb.dataset.cal==='del'){forgetGeo();return;}startCalage();return;}const mb=e.target.closest('[data-carte]');if(mb){state.show.carte=mb.dataset.carte;saveShow();renderDisp();renderPlan();return;}const b=e.target.closest('[data-all]');if(!b)return;const on=b.dataset.all==='1';SHOW_KEYS.forEach(([k])=>{state.show[k]=on||k==='soud'||k==='fond'||k==='manch';});saveShow();renderDisp();renderPlan();});
$('#filters').addEventListener('click',e=>{const c=e.target.closest('.chip');if(!c)return;state.filter=c.dataset.f;renderPlan();});
$('#planTools').addEventListener('click',e=>{if(e.target.id==='btnTool'){if(NET&&NET.source==='traceur'){toast('Réseau du traceur : la retouche se fait dans le traceur (bouton ✎)');return;}toggleTool();return;}if(e.target.id==='btnReport')openModal(importReportHTML());if(e.target.id==='btnImport')openImport();
  if(e.target.id==='btnTraceur'){location.href='./traceur.html'+(NET&&NET.source==='traceur'?'?site='+encodeURIComponent(state.siteId):'?site=new')+'&v='+Date.now().toString(36);return;}if(e.target.id==='btnNewTraceur'){location.href='./traceur.html?site=new&v='+Date.now().toString(36);return;}if(e.target.id==='btnDelSite'){deleteCurrentSite();return;}if(e.target.id==='btnVersions'){openVersionsModal();return;}if(e.target.id==='btnTrace'){if(state.tracing){finishTrace();}else{state.tracing=true;state.tracePts=[];toast('Tape les sommets de l\'axe du réseau, dans le sens de pose');renderPlan();}}});
$('#planTools').addEventListener('change',e=>{if(e.target.id==='sheetSel'){state.sheetId=e.target.value;state.sel=null;renderPlan();}});
$('#btnList').addEventListener('click',()=>{state.tab='liste';renderAll();});
$('#search').addEventListener('keydown',e=>{if(e.key==='Enter')doSearch();});
function doSearch(){const q=$('#search').value.trim().replace(/^s-?/i,'');const n=parseInt(q,10)||0;const cands=['S-'+String(n).padStart(4,'0'),'S-'+pad3(n),'S-'+n];let f=null,id=cands[0];for(const c of cands){f=findWeld(c);if(f){id=c;break;}}if(!f){toast('Aucune soudure '+cands[0]);return;}goToJoint(f.l,f.c,f.j.idx);}
function goToJoint(l,c,i){if(l.sheetId!==state.sheetId){state.sheetId=l.sheetId;bgG.dataset.sheet='';}state.tab='plan';renderAll();const p=jointPos(l,i);centerOn(p.x,p.y,Math.max(state.view.k,14/l.ppm));openJoint(l.id,c,i);}
function finishTrace(){state.tracing=false;const pts=state.tracePts;state.tracePts=[];if(pts.length<2){renderPlan();return;}
  const sh=sheet();const id='L'+(Object.keys(state.lines).length+1);const dn=prompt('DN du réseau tracé (ex. 100/200) :','100/200')||'100/200';
  const line={id,sheetId:sh.id,name:`Réseau tracé ${id} — Dn${dn}`,dnNum:parseInt(dn,10)||100,ppm:sh.ppm,pts,start:'Départ',end:'Fin'};state.lines[id]=line;sh.lines.push(id);genLine(line);renderAll();toast(`${line.cond.A.els.length} éléments générés par conduite (barres 12 m, coudes) — ${fmt(line.length)} m`);}

/* ---------- fiches ---------- */
const sheetEl=$('#sheet');
function openUI(){sheetEl.classList.add('show');$('#backdrop').classList.add('show');}
function closeSheet(){sheetEl.classList.remove('show');$('#backdrop').classList.remove('show');state.sel=null;state.sheetMode='view';resetForm();renderPlan();}
function resetForm(){state.pendingPhotos=[];state.err='';state.formVals={};state.sw={};}
$('#backdrop').addEventListener('click',closeSheet);
const head=(t,sub)=>`<div class="grab"></div><div class="head"><b>${esc(t)}</b>${sub||''}<button class="iconbtn x" data-act="close">✕</button></div>`;
const badge=s=>{const st=STATUS[s];return `<span class="badge ${s}" style="${s==='a_souder'?'':`background:${st.color}`}">${st.glyph?st.glyph+' ':''}${st.label}</span>`;};
function snapshotForm(){state.formVals={};$$('#sheet [id^="f-"]').forEach(el=>state.formVals[el.id]=el.value);}
function restoreForm(){Object.entries(state.formVals).forEach(([id,v])=>{const el=$('#'+id,sheetEl);if(el)el.value=v;});}
function photoBlock(existing){const all=[...(existing||[]),...state.pendingPhotos];return `<label class="f">Photos ${all.length?`(${all.length})`:''}</label><div class="photobtns"><label class="btn">📷 Prendre une photo<input type="file" accept="image/*" capture="environment" multiple data-photo></label><button class="btn" data-act="demo-photo">＋ Photo de démo</button></div>${all.length?`<div class="thumbs">${all.map(p=>`<div class="thumb"><img src="${p}"></div>`).join('')}</div>`:''}`;}
function openJoint(lineId,c,i){state.sel={kind:'j',line:lineId,cond:c,i};state.sheetMode='view';resetForm();const j=state.lines[lineId].cond[c].joints[i];state.conn={...j.conn};state.sw={etanch:false,mousse:false,cont:j.cont,iso:j.iso};ensureVisible(lineId,c,i);renderSheet();openUI();renderPlan();}
function openEl(lineId,c,i){state.sel={kind:'el',line:lineId,cond:c,i};state.sheetMode='view';resetForm();renderSheet();openUI();renderPlan();}
function ensureVisible(lineId,c,i){const l=state.lines[lineId];const p=jointPos(l,Math.min(i,l.els.length-2),c);const v=state.view;const cw=canvas.clientWidth,ch=canvas.clientHeight;const panel=$('#app').classList.contains('wide')?460:0;const sx=p.x*v.k+v.tx,sy=p.y*v.k+v.ty;const visW=cw-panel,visH=panel?ch:ch*.42;if(sx<30||sx>visW-30)v.tx+=visW/2-sx;if(sy<30||sy>visH-30)v.ty+=visH/2-sy;applyView();}
function renderSheet(){const s=state.sel;if(!s)return;const l=state.lines[s.line];
  if(s.kind==='el'){sheetEl.innerHTML=elView(l,s.cond,s.i);restoreForm();return;}
  const j=l.cond[s.cond].joints[s.i];const m=state.sheetMode;
  sheetEl.innerHTML=m==='view'?jointView(l,s.cond,j):m==='form-soudee'?formSoudee(l,s.cond,j):m==='form-manchon'?formManchon(l,s.cond,j):m==='form-controle'?formControle(l,s.cond,j):m==='form-probleme'?formProbleme(l,s.cond,j):jointView(l,s.cond,j);restoreForm();}
const evText=e=>{const d=e.data||{};if(e.type==='soudee')return `Soudée · ${esc(PROCEDES.find(p=>p[0]===d.procede)?.[1]||'')}`;if(e.type==='controle')return `Contrôle ${esc(d.mode||'')} : <b>${d.result==='OK'?'OK':'NOK — à reprendre'}</b>${d.ref?` · ${esc(d.ref)}`:''}${d.note?` · ${esc(d.note)}`:''}`;if(e.type==='manchonnee')return `Manchonnée · ${esc(MANCHONS.find(p=>p[0]===d.manchon)?.[1]||'')} · étanchéité ${d.etanch?'OK':'—'} · mousse ${d.mousse?'OK':'—'} · fils ${d.fils?'raccordés':'—'}${d.inv?' · <b style="color:#d03b3b">inversion</b>':''}`;if(e.type==='probleme')return `Problème signalé : ${esc(d.note||'')}`;return esc(e.type);};
const evColor=e=>e.type==='soudee'?STATUS.soudee.color:e.type==='manchonnee'?STATUS.manchonnee.color:e.type==='controle'?(e.data.result==='OK'?STATUS.controlee.color:STATUS.a_reprendre.color):'#fab219';
const uname=id=>({karim:'Karim B.',sofiane:'Sofiane K.',julien:'Julien R.',ethan:'Ethan L.',sophie:'Sophie M.'})[id]||id;
const fmtDT=d=>`${String(d.getDate()).padStart(2,'0')}/${String(d.getMonth()+1).padStart(2,'0')} ${String(d.getHours()).padStart(2,'0')}:${String(d.getMinutes()).padStart(2,'0')}`;
function jointView(l,c,j){const {els}=l.cond[c];const a=els[j.idx],b=els[j.idx+1];const r=role();const st=j.status;const acts=[];const evs=j.events.slice().reverse();
  // MODÈLE UNIQUE : tout se déclare dans les 4 sous-étapes ci-dessous (Ethan 25/08 : « deux modèles s'opposent »).
  // Les gros boutons ne sont plus des formulaires parallèles : ils DÉPLIENT l'étape concernée. Les statuts en découlent.
  {const stp=j.steps||{};const dn=n=>!!(stp[n]&&stp[n].done);const nx=[1,2,3,4].find(n=>!dn(n))||0;
   const LAB={1:'① Soudure',2:'② Fils raccordés',3:'③ Manchon posé',4:'④ Moussage + finition'};
   if(nx&&r!=='bureau'){const mine=r==='soudeur'?(nx===1):r==='manchonneur'?(nx>1):true;
     if(mine)acts.push(`<button class="btn primary block" data-gostep="${nx}">${st==='a_reprendre'&&nx===1?'Reprendre la soudure':'Faire l\'étape '+LAB[nx].slice(2)} <span style="opacity:.7;font-weight:400">· ${nx}/4</span></button>`);
     else acts.push(`<p class="hint">${r==='soudeur'?'Soudure faite — la suite est au manchonneur.':'En attente de la soudure — rien à faire ici pour toi.'}</p>`);}
   else if(nx===0)acts.push(`<p class="hint">Manchon complet (4/4)${evs.find(e=>e.type==='soudee')?' — soudée par '+uname(evs.find(e=>e.type==='soudee').by):''}.</p>`);}
  if(r==='chef'&&(st==='soudee'||st==='manchonnee'))acts.push(`<button class="btn block" data-act="form-controle">Saisir le contrôle (visuel / radio)</button>`);
  if(r!=='bureau')acts.push(`<button class="btn block" data-act="form-probleme">Signaler un problème / ajouter une photo</button>`);
  acts.push(`<button class="btn block" data-act="dh-here">📏 DH : mesurer depuis ce manchon</button>`);
  {const dd3=dhDataOf();const hasTemp=dd3&&dd3.temps[j.weldId];
    acts.push(`<button class="btn block" data-act="dh-temp" style="${hasTemp?'border-color:#8a2be2;color:#8a2be2':''}">${hasTemp?'⟲ Bouclage temporaire posé ici ('+esc(dd3.temps[j.weldId].by||'')+') — retirer':'⟲ Bouclage temporaire des fils ici (test DH amont)'}</button>`);}
  const hasData=j.status!=='a_souder'||(j.events&&j.events.length)||(j.photos&&j.photos.length)||(j.wire&&j.wire!=='a_raccorder')||!!(j.steps&&Object.keys(j.steps).length);
  if(hasData||r==='chef'||r==='bureau')acts.push(`<button class="btn block" data-act="transfer">↪ Erreur de saisie : transférer vers une autre soudure <span class="hint">(statut, photos, fils, étapes déplacés)</span></button>`);
  if(hasData&&r==='chef')acts.push(`<button class="btn block" data-act="reset-weld" style="color:#d03b3b">⌫ Remettre à « À souder » (efface statut, photos, fils)</button>`);
  const teeUI=j.teeOut?(()=>{const t=j.tee||{};const dw=state.dh.antWire==='N'?'nu':'étamé';return `<div class="card" style="margin-top:8px;background:#f4f7fb"><b>Antenne au té</b> <span class="muted" style="font-size:12px">(sortie de té : comment l'antenne est prise dans la boucle DH)</span><div class="row" style="margin-top:6px;display:flex;gap:6px;flex-wrap:wrap"><select class="f" id="teeMode"><option value="serie" ${(t.mode||'serie')==='serie'?'selected':''}>en série dans la boucle de la parente</option><option value="boucle" ${t.mode==='boucle'?'selected':''}>bouclée sur elle-même au té (boucle à part)</option><option value="none" ${t.mode==='none'?'selected':''}>pas encore raccordée au té</option></select><select class="f" id="teeWire"><option value="" ${!t.wire?'selected':''}>fil dans l'antenne : ${dw} (réglage chantier)</option><option value="E" ${t.wire==='E'?'selected':''}>étamé dans l'antenne</option><option value="N" ${t.wire==='N'?'selected':''}>nu dans l'antenne</option></select></div></div>`;})():'';
  const wiringRO=(j.wire==='raccorde'||j.wire==='inversion')?`<div class="card" style="padding:6px 8px 2px">${wiringSVG(a,b,j.conn||{E:'E',N:'N'},null,false)}</div>`:'';
  const wireLine=(teeUI)+wiringRO+(j.wire==='raccorde'?`<div class="okbox">Fils raccordés (étamé ↔ étamé, nu ↔ nu), continuité ${j.cont?'OK':'—'}, isolement ${j.iso?'OK'+(j.isoVal?' ('+esc(j.isoVal)+' MΩ)':''):'—'}.</div>`:j.wire==='inversion'?`<div class="err">Inversion des fils enregistrée : étamé amont → nu aval. Manchon à reprendre avant fermeture. ${esc(j.note)}</div>`:`<p class="hint">Fils d'alarme : à raccorder au manchonnage.</p>`);
  // ---- manchon en 4 sous-étapes (maquette validée 20/08) : chaque étape a son gars, sa date, ses photos ; l'étape 2 affiche la valeur attendue CALCULÉE ----
  migrateSteps(j); // une soudure déclarée par l'ancien modèle coche ses sous-étapes : un seul et même objet
  const steps=j.steps||{};const sdone=n=>!!(steps[n]&&steps[n].done);const nDone=[1,2,3,4].filter(sdone).length;const curStep=[1,2,3,4].find(n=>!sdone(n))||0;
  const canStep=r!=='bureau'&&(r==='soudeur'?1:r==='manchonneur'?2:0); // le soudeur ne valide que l'étape 1, le manchonneur les 2-3-4, le chef tout
  const canN=n=>r==='chef'?true:r==='soudeur'?n===1:r==='manchonneur'?n>=2:false;
  const sPhotos=n=>{const ph=(steps[n]&&steps[n].photos)||[];return `<div class="thumbs" style="margin:4px 0">${ph.map(p=>`<div class="thumb"><img src="${p}"></div>`).join('')}${canN(n)&&!sdone(n)?`<label class="thumb" style="display:flex;align-items:center;justify-content:center;border:1.5px dashed #b8b4a8;cursor:pointer;color:#8f8b80">📷<input type="file" accept="image/*" capture="environment" data-stepph="${n}" style="display:none" multiple></label>`:''}</div>`;};
  const sHead=(n,t)=>{const s2=steps[n];return `<summary><span class="num">${sdone(n)?'✓':n}</span><b>${n} · ${t}</b><span class="who">${s2&&s2.done?esc(s2.by||'')+' · '+(s2.at?new Date(s2.at).toLocaleDateString('fr-FR'):''):(n===curStep?'à faire':'—')}</span></summary>`;};
  const sBtn=n=>!canN(n)?'':(sdone(n)?(r==='chef'?`<button class="btn block" data-stepundo="${n}" style="color:#d03b3b;font-size:12px;padding:6px">Annuler cette étape (erreur de saisie)</button>`:'')
    :(n>1&&!sdone(n-1))?`<p class="hint" style="margin:4px 0">L'étape ${n-1} doit être validée avant.</p>`
    :`<button class="btn primary block" data-stepok="${n}" style="padding:8px">Valider l'étape ${n} — ${(me()||{}).name||''} · aujourd'hui</button>`);
  // « Attendu au testeur » : tant que l'étape 2 n'est pas validée il est VIVANT (recalculé) ; une fois validée il est FIGÉ
  // avec le bouclage de l'instant t — sans quoi la valeur mesurée ce jour-là devient incomparable plus tard (retour Ethan 25/08).
  const frz=steps[2]&&steps[2].dh;let att2='',cc2=[];
  {const dj=dhOfJoint(l.id,c,j.idx);if(dj){const AP2=dhAtPoint(dj.D,dj.row);cc2=[AP2.up.closed&&AP2.up.R!==null?{dir:'amont',...AP2.up}:null,AP2.down.closed&&AP2.down.R!==null?{dir:'aval',...AP2.down}:null].filter(Boolean);
    // aucune fermeture déclarée MAIS les fils sont continus du départ jusqu'ici : la boucle amont entière a une valeur — c'est CELLE qu'on lit au testeur en faisant les fils (départ bouclé à la centrale, ou pont ⟲ posé ici) — retour Ethan 25/08
    if(!cc2.length&&dj.row.R!==null&&!dj.row.open)cc2=[{dir:'amont',self:true,R:dj.row.R,dE:dj.row.dE,dN:dj.row.dN}];}}
  if(frz){const okL=frz.meas&&frz.expected?Math.abs(Math.round(100*(frz.meas-frz.expected)/frz.expected))<=(frz.tol||5):null;
    att2=`<div class="${okL===false?'warnbox':'okbox'}" style="margin:4px 0;font-size:12.5px;cursor:pointer" data-dhfrz="1" title="afficher ce bouclage sur le plan">
     <b>Bouclage au moment du raccordement</b> <span class="dim">(${esc(frz.at?new Date(frz.at).toLocaleDateString('fr-FR'):'')})</span><br>
     boucle ${esc(frz.dir||'')} fermée par <b>${esc(frz.closure||'—')}</b> · attendu <b>${frz.expected?fmt2(frz.expected)+' Ω':'—'}</b>${frz.dE!==undefined?` <span class="dim">(étamé ${fmt(frz.dE)} + nu ${fmt(frz.dN)} m · ${esc(frz.rkm)} Ω/km)</span>`:''}<br>
     mesuré <b>${frz.meas?fmt2(frz.meas)+' Ω':'—'}</b>${okL===true?' <span style="color:#0ca30c">✓ dans la tolérance ± '+(frz.tol||5)+' %</span>':okL===false?' <b style="color:#d03b3b">⚠ hors tolérance</b>':''}${frz.iso!=null?` · isolement <b>${fmt2(frz.iso)} MΩ</b>${frz.iso>=(frz.isoMin||200)?' ✓':' <b style="color:#d03b3b">⚠</b>'}`:''}
     ${(frz.temps||[]).length?`<br><span class="dim">ponts ⟲ posés ce jour-là : ${frz.temps.map(esc).join(', ')}</span>`:''}
     <br><span style="color:#1c3d6b;font-weight:700;font-size:11.5px">👁 Voir ce bouclage sur le plan</span></div>`;}
  else att2=cc2.length?`<div class="okbox" style="margin:4px 0;font-size:12.5px">Attendu au testeur ici : ${cc2.map(x=>`<b>${fmt2(x.R)} Ω</b> (${x.dir} — ${x.self?'boucle amont entière, départ → ce manchon':dhDirLab(x)})`).join(' · ')}${cc2.some(x=>x.self)?`<br><span class="dim">Étamé ${fmt(cc2[0].dE)} + nu ${fmt(cc2[0].dN)} m depuis le départ : c'est ce que tu lis si le départ est bouclé (centrale) — ou depuis le départ en pontant ⟲ ici.</span>`:''}<br><span class="dim">Cette valeur sera FIGÉE avec l'état du bouclage quand tu valideras l'étape.</span></div>`:`<p class="hint" style="margin:4px 0">Pas de boucle fermée depuis ce manchon : pose un pont ⟲ (ou déclare un bout bouclé) pour avoir une valeur attendue au testeur.</p>`;
  const s2v=steps[2]||{},s3v=steps[3]||{};const lockA=elLock(l,c,j.idx),lockB=elLock(l,c,j.idx+1);
  const wireRow2=w=>`<div class="conn"><div class="w"><i style="background:${WIRE[w].color};border:1px solid #999"></i>${a.id} ${WIRE[w].short} <span class="hint">(${clockText(clockPos(a,w))})</span></div><span>→</span><select data-conn="${w}"><option value="E" ${state.conn[w]==='E'?'selected':''}>${b.id} étamé</option><option value="N" ${state.conn[w]==='N'?'selected':''}>${b.id} nu</option><option value="X" ${state.conn[w]==='X'?'selected':''}>non raccordé</option></select></div>`;
  const stepsCard=`<h3>Manchon — 4 sous-étapes <span class="muted" style="font-weight:400">· ${nDone}/4${nDone===4?' ✓':''}</span></h3>
   <details class="dstep ${sdone(1)?'done':curStep===1?'cur':''}" ${curStep===1?'open':''}>${sHead(1,'Soudure')}<div class="sb">
    ${sdone(1)?`<div class="dim" style="font-size:11.5px">Procédé : <b>${esc((PROCEDES.find(p=>p[0]===(steps[1]||{}).proc)||[])[1]||'—')}</b></div>`
      :`<div class="row" style="display:flex;gap:6px;flex-wrap:wrap;align-items:end"><div><label class="f">Procédé</label><select class="f" id="st1-proc" style="width:150px">${PROCEDES.map(p=>`<option value="${p[0]}" ${(steps[1]||{}).proc===p[0]?'selected':''}>${p[1]}</option>`).join('')}</select></div></div>
       ${stockPickHTML(l,c,j,'piece')}${stockPickHTML(l,c,j,'sleeve')}`}
    ${sPhotos(1)}<div class="hint" style="margin:0 0 4px">Photo du cordon obligatoire.</div><label class="tgl"><input type="checkbox" id="st1-vis" ${steps[1]&&steps[1].visuel?'checked':''} ${sdone(1)?'disabled':''}> Contrôle visuel fait par le soudeur</label>${sBtn(1)}</div></details>
   <details class="dstep ${sdone(2)?'done':curStep===2?'cur':''}" ${curStep===2?'open':''}>${sHead(2,'Fils raccordés')}<div class="sb">${att2}
    ${sdone(2)?`<div class="card" style="padding:6px 8px 2px">${wiringSVG(a,b,j.conn||{E:'E',N:'N'},null,false)}</div>`
      :`<div class="muted" style="font-size:11.5px;margin:4px 0">Relie les fils : touche un bout de fil du tube amont (à gauche) puis celui d'en face qu'il rejoint (ou « ∅ non raccordé »).${state.wsel?` <b>Fil ${state.wsel==='E'?'étamé':'nu'} amont choisi → touche le fil aval.</b>`:''}</div>
       <div class="card" style="padding:6px 8px 2px">${wiringSVG(a,b,state.conn,state.wsel,true)}</div>${rotCtlHTML(a,'a','amont',lockA)}${rotCtlHTML(b,'b','aval',lockB)}${wireRow2('E')}${wireRow2('N')}
       ${(state.conn.E!=='E'||state.conn.N!=='N')?'<div class="err" style="font-size:12px">Inversion : l\'étamé amont part sur le nu aval — enregistre si c\'est ce qui a été fait.</div>':'<div class="okbox" style="font-size:12px">Raccordement droit : étamé ↔ étamé, nu ↔ nu.</div>'}`}
    ${sPhotos(2)}<div class="row" style="display:flex;gap:6px;align-items:end;flex-wrap:wrap"><div><label class="f">Boucle mesurée (Ω)</label><input class="f" id="st2-meas" type="number" step="0.01" inputmode="decimal" value="${s2v.meas??''}" ${sdone(2)?'disabled':''} style="width:104px"></div><div><label class="f">Isolement (MΩ)</label><input class="f" id="st2-iso" type="number" step="0.01" inputmode="decimal" value="${s2v.iso??''}" ${sdone(2)?'disabled':''} style="width:104px"></div></div>
    ${!sdone(2)&&cc2.length&&s2v.meas?(()=>{const bst=cc2.reduce((p,x)=>Math.abs(s2v.meas-x.R)<=Math.abs(s2v.meas-p.R)?x:p);const pct=Math.round(100*(s2v.meas-bst.R)/bst.R);const tol=+state.dh.tol||5;
      return `<div class="${Math.abs(pct)<=tol?'okbox':'warnbox'}" style="font-size:12px">${Math.abs(pct)<=tol?'✓ Cohérent avec la boucle '+bst.dir+' ('+fmt2(bst.R)+' Ω ± '+tol+' %)':'Écart '+(pct>0?'+':'')+pct+' % vs la boucle '+bst.dir+' ('+fmt2(bst.R)+' Ω attendus)'}</div>`;})():''}
    <label class="tgl"><input type="checkbox" id="st2-masse" ${s2v.masse?'checked':''} ${sdone(2)?'disabled':''}> Masse OK</label><label class="tgl"><input type="checkbox" id="st2-cont" ${s2v.cont?'checked':''} ${sdone(2)?'disabled':''}> Continuité OK</label>${sBtn(2)}</div></details>
   <details class="dstep ${sdone(3)?'done':curStep===3?'cur':''}" ${curStep===3?'open':''}>${sHead(3,'Manchon posé')}<div class="sb"><div style="margin:2px 0"><label class="tgl" style="display:inline-flex;margin-right:10px"><input type="radio" name="st3-type" value="retracte" ${(s3v.type||'retracte')==='retracte'?'checked':''} ${sdone(3)?'disabled':''}> Rétracté</label><label class="tgl" style="display:inline-flex"><input type="radio" name="st3-type" value="electro" ${s3v.type==='electro'?'checked':''} ${sdone(3)?'disabled':''}> Électrosoudé</label></div>${sPhotos(3)}<div class="hint" style="margin:0 0 4px">Photo du manchon + du manomètre. Test de pression obligatoire.</div><label class="tgl"><input type="checkbox" id="st3-press" ${s3v.press?'checked':''} ${sdone(3)?'disabled':''}> Test de pression OK</label>${sBtn(3)}</div></details>
   <details class="dstep ${sdone(4)?'done':curStep===4?'cur':''}" ${curStep===4?'open':''}>${sHead(4,'Moussage + bouchons de finition')}<div class="sb">${sdone(4)?'':stockPickHTML(l,c,j,'pu')}${sPhotos(4)}${sBtn(4)}</div></details>
   <p class="hint" style="margin:4px 0 0">Les grands statuts du plan (soudée / contrôlée / manchonnée) ne changent pas : déclare-les comme d'habitude. Sur le plan, la pastille porte un anneau vert ¼ / ½ / ¾ selon l'avancement, plein à 4/4.</p>`;
  return head(j.weldId,badge(st))+`<div class="kv" style="margin-top:8px"><span>DN <b>${esc(a.dn||l.dn)}</b></span><span>${c==='A'?'Aller':'Retour'}</span><span>entre <b>${a.id}</b> et <b>${b.id}</b></span><span>PK <b>${fmt(a.m1)} m</b></span><span>${esc(l.name)}</span>${j.sleeveWith?`<span style="background:#fff3d6">même manchon que <b>${esc(j.sleeveWith)}</b> (manchette nue)</span>`:''}${a.devAfter?`<span>déviation ${fmt(Math.abs(a.devAfter))}°</span>`:''}</div>
   ${(a.rot||a.flip||b.rot||b.flip)?`<div class="warnbox">${a.rot||a.flip?a.id+' est tournée ('+a.rot+'°'+(a.flip?', retournée':'')+')':''}${(a.rot||a.flip)&&(b.rot||b.flip)?' et ':''}${b.rot||b.flip?b.id+' est tournée ('+b.rot+'°'+(b.flip?', retournée':'')+')':''} : l'étamé ne sort pas du côté habituel — vérifie avant de raccorder.</div>`:''}
   <div class="actions">${acts.join('')}</div>
   <h3>Fils d'alarme</h3>${wireLine}
   ${stepsCard}
   <h3>Historique</h3>${evs.length?`<ul class="hist">${evs.map(e=>`<li><span class="dot" style="background:${evColor(e)}"></span><div style="flex:1"><div>${evText(e)}</div><div class="who">${uname(e.by)} · ${fmtDT(e.at)}${(()=>{const d=posGap(e,l,c,j);if(d===null)return e.pos?' · 📍 position enregistrée':'';const lim=Math.max(80,3*(e.pos.acc||0));return d>lim?` · <b style="color:#d03b3b">📍 déclarée à ${fmtDist(d)} de la soudure</b> (GPS ± ${e.pos.acc} m)`:` · 📍 sur place (± ${e.pos.acc} m)`;})()}</div>${e.photos.length?`<div class="thumbs">${e.photos.map(p=>`<div class="thumb"><img src="${p}"></div>`).join('')}</div>`:''}</div></li>`).join('')}</ul>`:'<p class="hint">Aucun événement : soudure à faire.</p>'}
   <p class="hint" style="margin-top:8px"><a href="#" data-act="open-el-a" style="color:#1c3d6b">Voir ${a.id}</a> · <a href="#" data-act="open-el-b" style="color:#1c3d6b">Voir ${b.id}</a> (orientation des fils, photos)</p>`;}
// prélèvement au stock (maquette écran 5) : le stock le plus proche qui a la pièce est pré-choisi, un geste pour changer
const gaineMM=dn=>{const g=casingOf({dn:+dn});return g?Math.round(g*1000):null;};
function stockNeedOf(l,c,j,mode){if(mode==='piece')return stockPieceOf(l,c,j);
  const e=l.cond[c].els[j.idx];const dn=+((e&&e.dn)||l.dn);const g=(e&&e.casing)||gaineMM(dn);
  if(mode==='pu')return {kind:'pu',dn,label:'Mousse PU (A+B) DN'+dn}; // choisie par le manchonneur AU MOUSSAGE (étape 4) — par DN désormais
  return {kind:'sleeve',dn,casing:e&&e.casing,label:'Manchon DN'+dn+(g?' · Ø'+g:'')};}
function stockPickHTML(l,c,j,mode){const s=stockOf();if(!s||!s.zones.some(z=>z.status==='ok'))return '';
  const need=stockNeedOf(l,c,j,mode);if(!need)return '';
  if(mode==='sleeve'&&j.sleeveWith&&s.takes.some(t=>t.weldId===j.sleeveWith&&/^sleeve/.test(t.key)))return `<div class="hint">Manchon déjà compté avec ${esc(j.sleeveWith)} (manchette nue : un seul manchon pour les deux soudures).</div>`;
  const isK=t=>mode==='pu'?/^pu(:|$)/.test(t.key):mode==='sleeve'?/^sleeve/.test(t.key):(!/^pu(:|$)/.test(t.key)&&!/^sleeve/.test(t.key)); // chaque mode ne regarde QUE son propre décompte
  const already=s.takes.find(t=>t.weldId===j.weldId&&isK(t));
  const WHAT=mode==='piece'?'Pièce':mode==='sleeve'?'Manchon':'Mousse';
  if(already)return `<div class="hint">${WHAT} déjà décomptée${already.zone?' — '+esc((stockZoneById(already.zone)||{}).name||''):''}.</div>`;
  const p=posAtChainage(l,l.cond[c].els[j.idx].m1);const zs=stockZonesFor(need,p.x,p.y);
  if(!zs.length)return mode==='pu'?`<div class="hint">Aucune mousse en stock : ajoute-la à une livraison (catalogue → « Mousse PU (A+B) ») pour la suivre.</div>`:'';
  return `<h3>${mode==='piece'?'Pièce prise dans quel stockage ?':mode==='sleeve'?'Manchon enfilé sur le tube — pris dans quel stockage ?':'Mousse prise dans quel stockage ?'} <span class="muted" style="font-weight:400;font-size:11.5px">${esc(need.label)} — décompte en direct</span></h3>
   <div class="card" style="padding:8px">${zs.map((o,i)=>`<span class="hyChip" data-stkpick="${o.z.id}" data-stkneed="${mode}" style="cursor:pointer;margin:2px;${i===0?'border-color:#eb6834;background:#fff7f2':''}" ${i===0?'data-on="1"':''}>${esc(o.z.name)} <span class="dim" style="font-size:10px">${o.d<9e8?'à '+fmt(o.d)+' m · ':''}reste ${o.reste}</span></span>`).join('')}<span class="hyChip" data-stkpick="none" data-stkneed="${mode}" style="cursor:pointer;margin:2px">hors stock / ailleurs</span></div>`;}
// applique le choix de stockage ; renvoie FALSE si l'utilisateur ne confirme pas (le formulaire s'arrête pour qu'il re-choisisse)
function stockDoPick(l,c,j,mode){const s=stockOf();const pick=sheetEl.querySelector('[data-stkpick][data-on="1"][data-stkneed="'+mode+'"]');if(!pick||!s)return true;
  const need=stockNeedOf(l,c,j,mode);if(!need)return true;
  const p=posAtChainage(l,l.cond[c].els[j.idx].m1);const zs=stockZonesFor(need,p.x,p.y);
  if(pick.dataset.stkpick==='none'){ // « hors stock » alors qu'une zone l'a : on demande — sinon les stocks partent en vrille sans que personne s'en rende compte
    if(zs.length&&!confirm('« Hors stock » choisi, alors que « '+zs[0].z.name+' » a cette pièce'+(zs[0].d<9e8?' à '+fmt(zs[0].d)+' m':'')+'.\nLa pièce ne sera décomptée nulle part — tu confirmes ?'))return false;
    return true;}
  if(zs.length&&zs[0].z.id!==pick.dataset.stkpick){const zp=stockZoneById(pick.dataset.stkpick);
    if(!confirm('La zone la plus proche qui a cette pièce est « '+zs[0].z.name+' »'+(zs[0].d<9e8?' ('+fmt(zs[0].d)+' m)':'')+'.\nTu confirmes que la pièce vient de « '+(zp?zp.name:pick.dataset.stkpick)+' » ?'))return false;}
  stockTake(pick.dataset.stkpick,need,j.weldId,l.id,c,1);
  return true;}
function formSoudee(l,c,j){const u=me();return head(j.weldId,badge(j.status))+`<h3 style="margin-top:6px">Déclarer soudée</h3><label class="f">Soudeur</label><input class="f" readonly value="${esc(u.name)} — ${esc(u.detail)}"><label class="f">Procédé</label><select class="f" id="f-proc">${PROCEDES.map(p=>`<option value="${p[0]}">${p[1]}</option>`).join('')}</select>${stockPickHTML(l,c,j,'piece')}${photoBlock()}<label class="f">Remarque</label><textarea class="f" id="f-note"></textarea>${state.err?`<div class="err">${esc(state.err)}</div>`:''}<div class="actions"><button class="btn primary block" data-act="save-soudee">Valider — passe en « Soudée »</button><button class="btn block" data-act="back">Annuler</button></div>`;}
/* ---------- câblage d'un manchon — design validé avec Ethan (V2.3, 19/08/2026) :
   les deux bouts de tube vus de côté, l'œil un poil AU-DESSUS du tube. Chaque fil sort de la mousse à sa position
   horaire réelle (clockPos) et file TENDU vers la sortie d'en face (chemin le plus court) ; la plongée fait apparaître
   le fil de devant un peu plus bas que celui de derrière (jamais superposés). Acier et cordon estompés pour que les
   fils dominent, raccords sertis au milieu (halo rouge + changement de matière au raccord si inversion), écarteurs
   suggérés. Zones tactiles = les bouts de fils aux sorties de mousse (data-wire, logique inchangée). ---------- */
function wiringSVG(a,b,conn,sel,editable){
  const W=640,H=260,cy=136,xs=W/2,kx=34,Rg=54,Ra=22,bare=132;
  const kxa=kx*Ra/Rg,Rm=Rg-6,kxm=kx*Rm/Rg,rr=(Ra+Rm)/2,PL=8;
  const xgL=xs-bare,xgR=xs+bare;
  const lerp=(p,q,t)=>[p[0]+(q[0]-p[0])*t,p[1]+(q[1]-p[1])*t];
  // sortie d'un fil sur la tranche : position horaire + plongée (devant = plus bas, derrière = plus haut). Chaque tranche est vue
  // depuis le manchon : la moitié côté manchon est l'ARRIÈRE du tube (7 h–11 h), la moitié côté gaine l'AVANT (1 h–5 h)
  const exit=(e2,xg,dir,w)=>{const g=clockPos(e2,w);return [xg-dir*Math.sin(rad(g))*kxm*.9,cy-Math.cos(rad(g))*rr+Math.sin(rad(g))*PL,g];};
  const defs=`<defs><linearGradient id="wppe" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#2b3036"/><stop offset=".16" stop-color="#6a737d"/><stop offset=".30" stop-color="#31363c"/><stop offset=".58" stop-color="#101214"/><stop offset=".86" stop-color="#23272c"/><stop offset="1" stop-color="#0b0d0f"/></linearGradient><linearGradient id="wpst" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#dfe4e8"/><stop offset=".25" stop-color="#f2f5f7"/><stop offset=".55" stop-color="#d3d9dd"/><stop offset="1" stop-color="#b3bac0"/></linearGradient><linearGradient id="wpsc" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#c5cbd1"/><stop offset=".5" stop-color="#e4e8ec"/><stop offset="1" stop-color="#aab1b7"/></linearGradient><radialGradient id="wpfm" cx=".38" cy=".32" r=".9"><stop offset="0" stop-color="#f5e7ad"/><stop offset=".55" stop-color="#e5cd7d"/><stop offset="1" stop-color="#c3a552"/></radialGradient><linearGradient id="wpcu" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#e69a5c"/><stop offset=".5" stop-color="#b96f33"/><stop offset="1" stop-color="#874a1d"/></linearGradient><linearGradient id="wpsn" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#f6f8fa"/><stop offset=".5" stop-color="#c3cad2"/><stop offset="1" stop-color="#8a929a"/></linearGradient><linearGradient id="wpfl" x1="0" y1="0" x2="1" y2="0"><stop offset="0" stop-color="#fff" stop-opacity="1"/><stop offset="1" stop-color="#fff" stop-opacity="0"/></linearGradient><linearGradient id="wpfr" x1="0" y1="0" x2="1" y2="0"><stop offset="0" stop-color="#fff" stop-opacity="0"/><stop offset="1" stop-color="#fff" stop-opacity="1"/></linearGradient><filter id="wpbl" x="-40%" y="-300%" width="180%" height="700%"><feGaussianBlur stdDeviation="5"/></filter><linearGradient id="wpmg" x1="0" y1="0" x2="1" y2="0"><stop offset="0" stop-color="#000"/><stop offset=".09" stop-color="#fff"/><stop offset=".91" stop-color="#fff"/><stop offset="1" stop-color="#000"/></linearGradient><mask id="wpmk" maskUnits="userSpaceOnUse" x="0" y="0" width="${W}" height="${H}"><rect x="${xgL+kxm}" y="${cy-Ra-2}" width="${2*(bare-kxm)}" height="${2*Ra+4}" fill="url(#wpmg)"/></mask></defs>`;
  let s='';
  s+=`<ellipse cx="${xs}" cy="${cy+Rg+14}" rx="${W*.42}" ry="7" fill="#000" opacity=".12" filter="url(#wpbl)"/>`;
  // acier + cordon de soudure, estompés
  let st=`<rect x="${xgL}" y="${cy-Ra}" width="${2*bare}" height="${2*Ra}" fill="url(#wpst)" stroke="#b9c0c6" stroke-width=".8"/>`;
  const wR=Ra+3.5;
  st+=`<path d="M ${xs-8} ${cy-wR} Q ${xs-10.4} ${cy} ${xs-8} ${cy+wR} A 8 3.2 0 0 0 ${xs+8} ${cy+wR} Q ${xs+10.4} ${cy} ${xs+8} ${cy-wR} A 8 3.2 0 0 0 ${xs-8} ${cy-wR} Z" fill="url(#wpsn)" stroke="#aeb5bb" stroke-width=".8"/>`;
  for(let yy=cy-wR+4;yy<cy+wR-2;yy+=7)st+=`<path d="M ${xs-10} ${yy} Q ${xs} ${yy+2.6} ${xs+10} ${yy}" fill="none" stroke="#8a9198" stroke-opacity=".3" stroke-width="1.1"/>`;
  s+=`<g opacity=".42">${st}</g>`;
  // écarteurs (corps), très discrets
  [xs-56,xs+56].forEach(x=>{s+=`<rect x="${x-2.5}" y="${cy-Ra-8}" width="5" height="${2*Ra+16}" rx="2" fill="#22262b" opacity=".1"/>`;});
  // tubes : gaine + tranche (PE, mousse, naissance de l'acier)
  const tube=(xg,dir,x0)=>{const bx=Math.min(xg,x0),bw=Math.abs(xg-x0);
    return `<rect x="${bx}" y="${cy-Rg}" width="${bw}" height="${2*Rg}" fill="url(#wppe)"/><ellipse cx="${xg}" cy="${cy}" rx="${kx}" ry="${Rg}" fill="#111417"/><ellipse cx="${xg}" cy="${cy}" rx="${kxm}" ry="${Rm}" fill="url(#wpfm)"/><path d="M ${xg} ${cy-Rm} A ${kxm} ${Rm} 0 0 ${dir>0?1:0} ${xg} ${cy+Rm}" fill="none" stroke="#7c6a35" stroke-opacity=".3" stroke-width="2.5"/><ellipse cx="${xg}" cy="${cy}" rx="${kxa}" ry="${Ra}" fill="url(#wpsc)" opacity=".8"/>`;};
  s+=tube(xgL,+1,26)+tube(xgR,-1,W-26);
  // fils : chaque fil sort de la mousse à son heure et SUIT L'ACIER jusqu'à la sortie d'en face — s'il doit faire le tour,
  // il prend le chemin angulaire le plus court en épousant l'arrondi (hélice) ; l'œil étant un poil au-dessus, ce qui passe
  // derrière l'acier est vu à travers (estompé sous un voile d'acier translucide), ce qui passe devant est net par-dessus.
  const P={aE:exit(a,xgL,+1,'E'),aN:exit(a,xgL,+1,'N'),bE:exit(b,xgR,-1,'E'),bN:exit(b,xgR,-1,'N')};
  const PHI=Math.asin(PL/rr);
  const yOf=g=>cy-Math.cos(rad(g))*rr+Math.sin(rad(g))*PL;
  const behind=g=>Math.sin(rad(g)+PHI)<0&&Math.abs(yOf(g)-cy)<Ra-2;
  const bump=u=>u<1?4*u*(1-u):0;
  // hélice de (pA,gA) à (pB,gB) entre t1 et t2 → segments {f:devant?,pts}
  // ph : déphasage (0 = l'étamé fait sa torsion dans les 78 % premiers, 1 = le nu dans les 78 % derniers) → deux fils qui font le tour ne se superposent pas
  const helix=(pA,gA,pB,gB,t1,t2,ph)=>{let dG=((gB-gA)%360+540)%360-180;if(dG<=-180)dG+=360;const N=Math.max(10,Math.round(Math.abs(dG)/4)+10);const segs=[];let cur=null;
    const prog=t=>{const u=Math.min(1,Math.max(0,(t-(ph||0)*.22)/.78));return u*u*(3-2*u);};
    for(let i=0;i<=N;i++){const t=t1+(t2-t1)*i/N;const g=gA+dG*prog(t);const x=pA[0]+(pB[0]-pA[0])*t;const y=yOf(g)+2.2*Math.sin(Math.PI*t)-2.4*bump(t/.1)-2.4*bump((1-t)/.1);const f=!behind(g);
      if(!cur||cur.f!==f){const prev=cur;cur={f,pts:[]};if(prev)prev.pts.push([x,y]);segs.push(cur);}cur.pts.push([x,y]);}
    return segs;};
  const ptAt=(pA,gA,pB,gB,t,ph)=>helix(pA,gA,pB,gB,t,t,ph)[0].pts[0];
  const dOf=pts=>'M '+pts.map(p=>p[0].toFixed(1)+' '+p[1].toFixed(1)).join(' L ');
  const wcol=w=>w==='E'?{core:'url(#wpsn)',edge:'#6f777f',hi:'#ffffff'}:{core:'url(#wpcu)',edge:'#63370f',hi:'#f6c58c'};
  const strokes=(d,col,em)=>`<path d="${d}" fill="none" stroke="${em?'#0b0b0b':col.edge}" stroke-width="${em?6.6:5.2}" stroke-linecap="round" stroke-linejoin="round"/><path d="${d}" fill="none" stroke="${col.core}" stroke-width="3.8" stroke-linecap="round" stroke-linejoin="round"/><path d="${d}" fill="none" stroke="${col.hi}" stroke-width="1" stroke-linecap="round" stroke-linejoin="round" opacity=".8"/>`;
  let holes='',filsF='',filsB='',clipsF='',clipsB='',crimpsF='',crimpsB='',labels='',hits='';
  const drawSegs=(segs,col,em)=>{segs.forEach(sg=>{if(sg.pts.length<2)return;const d=strokes(dOf(sg.pts),col,em);if(sg.f)filsF+=d;else filsB+=d;});};
  // trous de sortie + heures, pour les quatre bouts
  Object.entries(P).forEach(([k,p])=>{const side=k[0],w=k[1];
    holes+=`<ellipse cx="${p[0]}" cy="${p[1]}" rx="4.4" ry="3.2" fill="#4d3f18" opacity=".8"/>`;
    const back=Math.sin(rad(p[2]))<0;const ax=side==='a'?-1:1;
    labels+=`<text x="${p[0]+ax*11}" y="${back?p[1]-11:p[1]+19}" font-size="12" text-anchor="${ax<0?'end':'start'}" fill="${w==='E'?'#5c646c':'#8a4c1e'}" font-weight="600" font-family="system-ui,sans-serif" stroke="#fff" stroke-width="3" paint-order="stroke">${clockText(p[2])}</text>`;});
  const usedB={};const hitPaths=[];
  ['E','N'].forEach((wA,wi)=>{const pA=P['a'+wA];const to=conn[wA];
    if(!to||to==='X'){
      // fil amont non raccordé : petit bout qui retombe + pointillé
      filsF+=strokes(`M ${pA[0]} ${pA[1]} C ${pA[0]+12} ${pA[1]-3} ${pA[0]+22} ${pA[1]+1} ${pA[0]+30} ${pA[1]+7}`,wcol(wA),editable&&sel===wA);
      filsF+=`<line x1="${pA[0]+34}" y1="${pA[1]+10}" x2="${pA[0]+52}" y2="${pA[1]+15}" stroke="${wA==='E'?'#9aa2aa':'#b96f33'}" stroke-width="3" stroke-dasharray="4 4" stroke-linecap="round"/><text x="${pA[0]+58}" y="${pA[1]+20}" font-size="12" fill="#898781" font-family="system-ui,sans-serif">∅ non raccordé</text>`;
      return;}
    usedB[to]=1;
    const pB=P['b'+to];const bad=to!==wA;const gA=pA[2],gB=pB[2];
    drawSegs(helix(pA,gA,pB,gB,0,1,wi),wcol(wA),editable&&sel===wA);
    const t0=wi?0.565:0.435;
    // en inversion, la couleur change AU raccord serti : partie aval recolorée
    if(bad)drawSegs(helix(pA,gA,pB,gB,t0,1,wi),wcol(to),false);
    // pattes des écarteurs sur le fil
    [xs-56,xs+56].forEach(x=>{const t=(x-pA[0])/(pB[0]-pA[0]);if(t>.12&&t<.88){const sg=helix(pA,gA,pB,gB,t,t,wi)[0];const Pt=sg.pts[0];const r=`<rect x="${x-5}" y="${(Pt[1]-3.2).toFixed(1)}" width="10" height="6.4" rx="2" fill="#22262b" opacity=".26"/>`;if(sg.f)clipsF+=r;else clipsB+=r;}});
    // raccord serti, posé sur le fil (orienté selon sa pente), décalé du cordon
    const sgJ=helix(pA,gA,pB,gB,t0-.01,t0+.01,wi)[0];const J=ptAt(pA,gA,pB,gB,t0,wi);const q1=sgJ.pts[0],q2=sgJ.pts[sgJ.pts.length-1];const ang=Math.atan2(q2[1]-q1[1],q2[0]-q1[0])*180/Math.PI;
    const cr=`<g transform="rotate(${ang.toFixed(1)} ${J[0].toFixed(1)} ${J[1].toFixed(1)})">${bad?`<rect x="${J[0]-15}" y="${J[1]-7.5}" width="30" height="15" rx="7.5" fill="#d03b3b" opacity=".33"/>`:''}<rect x="${J[0]-10.5}" y="${J[1]-4}" width="21" height="8" rx="3" fill="url(#wpsn)" stroke="#6f777f" stroke-width="1"/><line x1="${J[0]-4.5}" y1="${J[1]-4}" x2="${J[0]-4.5}" y2="${J[1]+4}" stroke="#868e96" stroke-width="1"/><line x1="${J[0]+4.5}" y1="${J[1]-4}" x2="${J[0]+4.5}" y2="${J[1]+4}" stroke="#868e96" stroke-width="1"/></g>`;
    if(!sgJ.f)crimpsB+=cr;else crimpsF+=cr;
    // zones tactiles le long du fil : moitié amont → a:wA, moitié aval → b:to
    hitPaths.push([`a:${wA}`,helix(pA,gA,pB,gB,0,.42,wi).flatMap(sg=>sg.pts)],[`b:${to}`,helix(pA,gA,pB,gB,.58,1,wi).flatMap(sg=>sg.pts)]);});
  // bouts aval auxquels rien n'arrive : petit bout qui retombe
  ['E','N'].forEach(wB=>{if(usedB[wB])return;const pB=P['b'+wB];
    filsF+=strokes(`M ${pB[0]} ${pB[1]} C ${pB[0]-12} ${pB[1]-3} ${pB[0]-22} ${pB[1]+1} ${pB[0]-30} ${pB[1]+7}`,wcol(wB),false);});
  // voile d'acier translucide (entre les tranches, fondu aux deux bouts) : ce qui est dessous est « derrière l'acier »
  const veil=`<rect x="${xgL+kxm}" y="${cy-Ra}" width="${2*(bare-kxm)}" height="${2*Ra}" fill="url(#wpst)" opacity=".3" mask="url(#wpmk)"/>`;
  s+=holes+`<g opacity=".62">${filsB}${clipsB}${crimpsB}</g>`+veil+filsF+clipsF+crimpsF;
  // anneau de sélection sur la sortie amont choisie
  if(editable&&(sel==='E'||sel==='N')){const p=P['a'+sel];s+=`<circle cx="${p[0]}" cy="${p[1]}" r="12" fill="none" stroke="#0b0b0b" stroke-width="2.5"/>`;}
  // fondu des bords (le réseau continue) + étiquettes + badge
  s+=`<rect x="25" y="${cy-Rg-4}" width="42" height="${2*Rg+8}" fill="url(#wpfl)"/><rect x="${W-67}" y="${cy-Rg-4}" width="42" height="${2*Rg+8}" fill="url(#wpfr)"/>`;
  s+=`<text x="${(26+xgL)/2}" y="${cy+Rg+30}" font-size="14.5" font-weight="600" text-anchor="middle" fill="#565c62" font-family="system-ui,sans-serif">${esc(a.id)} · amont</text><text x="${(W-26+xgR)/2}" y="${cy+Rg+30}" font-size="14.5" font-weight="600" text-anchor="middle" fill="#565c62" font-family="system-ui,sans-serif">${esc(b.id)} · aval</text>`;
  s+=labels;
  const inv=(conn.E&&conn.E!=='X'&&conn.E!=='E')||(conn.N&&conn.N!=='X'&&conn.N!=='N');
  if(inv)s+=`<g><rect x="${xs-64}" y="4" width="128" height="22" rx="11" fill="#d03b3b"/><text x="${xs}" y="20" font-size="12.5" font-weight="700" text-anchor="middle" fill="#fff" font-family="system-ui,sans-serif">⚠ INVERSION</text></g>`;
  // zones tactiles : les fils (moitié amont / moitié aval) puis cercles francs sur les quatre sorties (par-dessus), + « ∅ non raccordé »
  if(editable){hitPaths.forEach(([k,pts])=>{if(pts.length>1)hits+=`<path data-wire="${k}" style="cursor:pointer" d="${dOf(pts)}" stroke="transparent" stroke-width="18" fill="none"/>`;});
    ['E','N'].forEach(w=>{const p=P['a'+w],q=P['b'+w];
      hits+=`<g data-wire="a:${w}" style="cursor:pointer"><circle cx="${p[0]}" cy="${p[1]}" r="22" fill="transparent"/></g><g data-wire="b:${w}" style="cursor:pointer"><circle cx="${q[0]}" cy="${q[1]}" r="22" fill="transparent"/></g>`;});
    hits+=`<g data-wire="b:X" style="cursor:pointer"><rect x="${W-122}" y="5" width="116" height="21" rx="10.5" fill="#f4f2ec" stroke="#d9d6cf"/><text x="${W-64}" y="19.5" font-size="11.5" text-anchor="middle" fill="#52514e" font-family="system-ui,sans-serif">∅ non raccordé</text></g>`;}
  s+=hits;
  return `<svg viewBox="0 0 ${W} ${H}" width="100%" style="max-width:560px;display:block;margin:0 auto;touch-action:manipulation">${defs}${s}</svg>`;}
// contrôles de rotation d'un bout de tube (amont / aval du manchon) — partagés entre l'étape 2 « fils » et l'ancien formulaire (retour Ethan 25/08 : « on ne peut plus tourner les tubes au moment de faire les fils »)
const rotCtlHTML=(e2,suf,side,lock)=>lock?`<div class="lockbox">🔒 <b>${e2.id}</b> (${side}) : position figée — déjà manchonnée en ${lock.map(esc).join(' et ')}. Si ce manchon-là est bon, le tube est forcément en bonne position.</div>`
    :`<div class="btns" style="margin:2px 0;display:flex;gap:5px;flex-wrap:wrap;align-items:center;justify-content:center"><span class="muted" style="font-size:12px;min-width:74px">${e2.id} ${side}${e2.rot?' · '+e2.rot+'°':''}</span><button class="btn sm" data-rot${suf}="-90" title="tourner ${e2.id} de 90° vers la gauche" style="padding:4px 7px">⟲90</button><button class="btn sm" data-rot${suf}="-15" title="tourner ${e2.id} de 15° vers la gauche" style="padding:4px 7px">⟲15</button><button class="btn sm" data-rot${suf}="15" title="tourner ${e2.id} de 15° vers la droite" style="padding:4px 7px">15⟳</button><button class="btn sm" data-rot${suf}="90" title="tourner ${e2.id} de 90° vers la droite" style="padding:4px 7px">90⟳</button><button class="btn sm ${e2.flip?'on':''}" data-flip${suf}="1" title="${e2.id} retourné bout pour bout" style="padding:4px 7px">⇄</button></div>`;
function formManchon(l,c,j){const {els}=l.cond[c];const a=els[j.idx],b=els[j.idx+1];const inv=state.conn.E!=='E'||state.conn.N!=='N';
  const lockA=elLock(l,c,j.idx),lockB=elLock(l,c,j.idx+1);
  const wireRow=w=>`<div class="conn"><div class="w"><i style="background:${WIRE[w].color};border:1px solid #999"></i>${a.id} ${WIRE[w].short} <span class="hint">(${clockText(clockPos(a,w))})</span></div><span>→</span><select data-conn="${w}"><option value="E" ${state.conn[w]==='E'?'selected':''}>${b.id} étamé (${clockText(clockPos(b,'E'))})</option><option value="N" ${state.conn[w]==='N'?'selected':''}>${b.id} nu (${clockText(clockPos(b,'N'))})</option><option value="X" ${state.conn[w]==='X'?'selected':''}>non raccordé</option></select></div>`;
  return head(j.weldId,badge(j.status))+`<h3 style="margin-top:6px">Déclarer manchonnée</h3><label class="f">Manchonneur</label><input class="f" readonly value="${esc(me().name)}"><label class="f">Type de manchon</label><select class="f" id="f-manchon">${MANCHONS.map(p=>`<option value="${p[0]}">${p[1]}</option>`).join('')}</select>
   <h3>Raccordement des fils d'alarme (amont → aval)</h3><div class="card"><div class="muted" style="font-size:12px;margin-bottom:4px">Les deux bouts de tube vus de côté, l'œil un peu au-dessus : chaque fil sort de la mousse à son heure et rejoint en tendu la sortie d'en face en suivant l'acier (s'il fait le tour, il passe derrière : partie estompée). Touche un bout de fil du tube amont (à gauche), puis le bout d'en face qu'il rejoint (ou « ∅ non raccordé »).${state.wsel?` <b>Fil ${state.wsel==='E'?'étamé':'nu'} amont choisi → touche le fil aval.</b>`:''}</div>${wiringSVG(a,b,state.conn,state.wsel,true)}${rotCtlHTML(a,'a','amont',lockA)}${rotCtlHTML(b,'b','aval',lockB)}${wireRow('E')}${wireRow('N')}${inv?'<div class="err">Inversion : l\'étamé amont part sur le nu aval. Enregistre si c\'est ce qui a été fait — le manchon sera signalé « à reprendre ».</div>':'<div class="okbox">Raccordement droit : étamé ↔ étamé, nu ↔ nu.</div>'}
   <div class="toggle"><span>Continuité des deux fils OK</span><button class="switch ${state.sw.cont?'on':''}" data-sw="cont"></button></div><div class="toggle"><span>Isolement fils / tube OK <input id="f-iso" placeholder="MΩ" style="width:64px;border:1px solid var(--line);border-radius:6px;padding:3px 6px;margin-left:6px;font-size:14px"></span><button class="switch ${state.sw.iso?'on':''}" data-sw="iso"></button></div></div>
   <h3>Manchon</h3><div class="card" style="padding:2px 12px"><div class="toggle"><span>Test d'étanchéité à l'air : OK</span><button class="switch ${state.sw.etanch?'on':''}" data-sw="etanch"></button></div><div class="toggle"><span>Mousse injectée, bouchons posés</span><button class="switch ${state.sw.mousse?'on':''}" data-sw="mousse"></button></div></div>
   ${stockPickHTML(l,c,j,'sleeve')}${photoBlock()}<label class="f">Remarque</label><textarea class="f" id="f-note"></textarea>${state.err?`<div class="err">${esc(state.err)}</div>`:''}<div class="actions"><button class="btn primary block" data-act="save-manchon">Valider — passe en « Manchonnée »</button><button class="btn block" data-act="back">Annuler</button></div>`;}
function formControle(l,c,j){return head(j.weldId,badge(j.status))+`<h3 style="margin-top:6px">Contrôle de la soudure</h3><label class="f">Type</label><select class="f" id="f-mode"><option>Visuel</option><option selected>Radiographie</option><option>Ultrasons</option></select><label class="f">Référence du rapport / film</label><input class="f" id="f-ref" placeholder="ex. RT-231">${photoBlock()}<label class="f">Observation</label><textarea class="f" id="f-note"></textarea><div class="actions"><button class="btn primary block" data-act="save-controle-ok">Contrôle OK</button><button class="btn danger block" data-act="save-controle-nok">Contrôle NOK — à reprendre</button><button class="btn block" data-act="back">Annuler</button></div>`;}
function formProbleme(l,c,j){return head(j.weldId,badge(j.status))+`<h3 style="margin-top:6px">Signaler un problème</h3><label class="f">Description</label><textarea class="f" id="f-note"></textarea>${photoBlock()}${state.err?`<div class="err">${esc(state.err)}</div>`:''}<div class="actions"><button class="btn primary block" data-act="save-probleme">Envoyer au chef</button><button class="btn block" data-act="back">Annuler</button></div>`;}
function dialSVG(e){const s=90,c=45;let d=`<svg width="${s}" height="${s}" viewBox="0 0 ${s} ${s}"><defs><linearGradient id="ac" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#b9bec4"/><stop offset="1" stop-color="#6d7278"/></linearGradient></defs><circle cx="${c}" cy="${c}" r="42" fill="#111"/><circle cx="${c}" cy="${c}" r="35" fill="#e9d36b"/><circle cx="${c}" cy="${c}" r="18" fill="url(#ac)"/>`;[0,90,180,270].forEach(a=>{d+=`<line x1="${c+40*Math.sin(rad(a))}" y1="${c-40*Math.cos(rad(a))}" x2="${c+44*Math.sin(rad(a))}" y2="${c-44*Math.cos(rad(a))}" stroke="#fff" stroke-width="1.5"/>`;});d+=`<text x="${c}" y="9" font-size="8" fill="#52514e" text-anchor="middle">12 h</text>`;d+='<g id="dialw">';['E','N'].forEach(w=>{const a=clockPos(e,w);d+=`<circle cx="${c+27*Math.sin(rad(a))}" cy="${c-27*Math.cos(rad(a))}" r="5" fill="${WIRE[w].color}" stroke="#333"/><text x="${c+27*Math.sin(rad(a))}" y="${c-27*Math.cos(rad(a))+3}" font-size="7" font-weight="700" text-anchor="middle" fill="#0b0b0b">${w==='E'?'É':'N'}</text>`;});return d+'</g></svg>';}
function elView(l,c,i){const e=l.cond[c].els[i];const lock=elLock(l,c,i);const posOk=!e.rot&&!e.flip;const tl=e.kind==='pipe'?`barre ${fmt(e.len)} m${e.cut?' (coupée)':''}`:`${e.kindLabel||e.kind}${e.angle?' '+e.angle+'°':''}`;
  return head(`${e.id} · ${c==='A'?'aller':'retour'}`,`<span class="badge" style="background:${c==='A'?'#c8382f':'#2a5fb4'}">${c==='A'?'ALLER':'RETOUR'}</span>`)+`<div class="kv" style="margin-top:6px"><span>${esc(tl)} · DN ${esc(e.dn||l.dn)}</span><span>PK <b>${fmt(e.m0)}</b> → <b>${fmt(e.m1)} m</b></span><span>${esc(l.name)}</span></div>
   <h3>Orientation des fils (coupe vue depuis l'amont)</h3><div class="card"><div class="dial">${dialSVG(e)}${lock?`<div class="lockbox" style="flex:1;margin-top:0">🔒 Position figée : déjà manchonnée en ${lock.map(esc).join(' et ')}. Pour corriger, le chef remet d'abord ce manchon à « À souder ».</div>`:`<div class="btns"><button class="btn sm" data-rot="-90">⟲ 90°</button><button class="btn sm" data-rot="90">⟳ 90°</button><button class="btn sm" data-rot="-15">⟲ 15°</button><button class="btn sm" data-rot="15">⟳ 15°</button><button class="btn sm ${e.flip?'on':''}" data-act="flip">⇄ retournée bout pour bout</button><button class="btn sm" data-act="rot0">Remettre à 0°</button></div>`}</div>${e.kind==='tee'&&e.saut&&!lock?`<div class="row" style="margin-top:8px;display:flex;gap:6px;align-items:center;flex-wrap:wrap"><span class="muted" style="font-size:12.5px">Té à saut : la branche passe</span><button class="btn sm ${(e.sautDir||'haut')==='haut'?'on':''}" data-saut="haut">▲ au-dessus</button><button class="btn sm ${e.sautDir==='bas'?'on':''}" data-saut="bas">▼ en dessous</button></div>`:''}<p class="hint" style="margin-top:8px">Étamé à <b>${clockText(clockPos(e,'E'))}</b>, nu à <b>${clockText(clockPos(e,'N'))}</b> · rotation ${e.rot}°${e.flip?' · retournée':''}</p>${posOk?'<div class="okbox">Position standard du fournisseur — '+esc(wirePos().label)+'.</div>':'<div class="warnbox">Hors position standard : le manchonneur trouvera l\'étamé de l\'autre côté — l\'appli le prévient aux deux manchons voisins.</div>'}</div>
   ${(()=>{ // état DH des extrémités : piquages purge / vidange, fins de ligne (bouchons), raccordements SST — pris en compte dans les valeurs attendues
     const isEnd=e.kind==='endcap'||e.kind==='endpoint'||(e.kind==='tee'&&e.vert);if(!isEnd)return '';
     const dd4=dhDataOf();const st4=(dd4&&dd4.ends[dhEndKey(l.id,e)])||null;const cur=st4?st4.state:null;
     const lab4=e.kind==='endcap'?'Fin de ligne':e.kind==='endpoint'?'Raccordement / SST':(e.vert==='up'?'Piquage de purge':'Piquage de vidange');
     const opt=(v,t)=>`<button class="btn sm ${cur===v?'primary':''}" data-dhend="${v}" style="flex:1;min-width:0">${t}</button>`;
     return `<h3>État DH — ${lab4}</h3><div class="card"><div class="muted" style="font-size:12px;margin-bottom:5px">Le fil ${wireDefFournisseur()==='E'?'étamé':'cuivré'} passe par cette pièce${e.kind==='tee'&&e.vert?(wireOfTee(e)===wireDefFournisseur()?'':' (té retourné : c\'est l\'autre fil)'):''} — l'état compte dans les Ω attendus. Ajoute une photo à l'appui quand c'est bouclé.</div>
      <div style="display:flex;gap:5px;flex-wrap:wrap">${opt('non','Fils en attente')}${opt('coiffe','Bouclé DANS la coiffe')}${opt('sortie','Bouclé SORTIE de coiffe')}</div>
      ${st4?`<div class="okbox" style="margin-top:6px">${esc(DH_END_LABEL[st4.state]||st4.state)} — ${esc(st4.by||'')} · ${st4.at?esc(new Date(st4.at).toLocaleDateString('fr-FR')):''}</div>`:'<div class="hint" style="margin-top:5px">Aucun état déclaré : le calcul suppose que le fil traverse sans monter (signalé ⚠ dans l\'onglet DH).</div>'}</div>`;})()}
   ${photoBlock(e.photos)}<label class="f">Remarque</label><textarea class="f" id="f-note">${esc(e.note)}</textarea><div class="actions"><button class="btn primary block" data-act="save-el">Enregistrer</button><button class="btn block" data-act="close">Fermer</button></div>`;}
// UN SEUL MODÈLE : une soudure déclarée avant (ancien formulaire) ou par un autre appareil coche ses sous-étapes,
// pour qu'on ne se retrouve jamais avec « soudée » d'un côté et « étape 1 à faire » de l'autre (Ethan 25/08).
function migrateSteps(j){const st=j.status;if(st==='a_souder')return;j.steps=j.steps||{};let chg=false;
  const ev=t=>(j.events||[]).slice().reverse().find(e=>e.type===t);
  if(!(j.steps[1]&&j.steps[1].done)){const e=ev('soudee');
    j.steps[1]={done:true,by:e?uname(e.by):'(déclaré avant)',at:e?new Date(e.at).toISOString():new Date().toISOString(),photos:(e&&e.photos||[]).slice(),visuel:true,proc:e&&e.data&&e.data.procede||undefined,coulee:e&&e.data&&e.data.coulee||undefined,migr:true};chg=true;}
  if(st==='manchonnee'){const e=ev('manchonnee');
    if(!(j.steps[2]&&j.steps[2].done)){j.steps[2]={done:true,by:e?uname(e.by):'(déclaré avant)',at:e?new Date(e.at).toISOString():new Date().toISOString(),photos:[],cont:!!j.cont,iso:j.isoVal?parseFloat(String(j.isoVal).replace(',','.')):undefined,migr:true};chg=true;}
    if(!(j.steps[3]&&j.steps[3].done)){j.steps[3]={done:true,by:e?uname(e.by):'(déclaré avant)',at:e?new Date(e.at).toISOString():new Date().toISOString(),photos:(e&&e.photos||[]).slice(),type:e&&e.data&&e.data.manchon==='electro'?'electro':'retracte',press:!!(e&&e.data&&e.data.etanch),migr:true};chg=true;}}
  return chg;}
// lecture des champs d'une sous-étape manchon depuis la fiche (avant validation ou re-rendu)
function collectStep(j,n){const s=j.steps[n]=j.steps[n]||{photos:[]};s.photos=s.photos||[];const q=id=>$('#'+id,sheetEl);
  if(n===1){const v=q('st1-vis');if(v)s.visuel=v.checked;const p=q('st1-proc');if(p)s.proc=p.value;}
  if(n===2){const m2=q('st2-meas');if(m2&&m2.value!=='')s.meas=parseFloat(String(m2.value).replace(',','.'));const i2=q('st2-iso');if(i2&&i2.value!=='')s.iso=parseFloat(String(i2.value).replace(',','.'));const ma=q('st2-masse');if(ma)s.masse=ma.checked;const co=q('st2-cont');if(co)s.cont=co.checked;}
  if(n===3){const t=sheetEl.querySelector('input[name=st3-type]:checked');if(t)s.type=t.value;const p=q('st3-press');if(p)s.press=p.checked;}
  return s;}
sheetEl.addEventListener('click',e=>{const b=e.target.closest('[data-act],[data-rot],[data-sw],[data-wire],[data-rotb],[data-flipb],[data-rota],[data-flipa],[data-saut],[data-dhend],[data-stepok],[data-stepundo],[data-stkpick],[data-dhfrz],[data-gostep]');if(!b)return;const s=state.sel;if(!s)return;const l=state.lines[s.line];
  if(b.dataset.dhfrz&&s.kind==='j'){e.preventDefault();showFrozenLoop(l,s.cond,l.cond[s.cond].joints[s.i]);return;}
  if(b.dataset.gostep){e.preventDefault();const d=[...sheetEl.querySelectorAll('.dstep')][+b.dataset.gostep-1];if(d){d.open=true;d.scrollIntoView({block:'center',behavior:'smooth'});d.style.boxShadow='0 0 0 3px rgba(235,104,52,.35)';setTimeout(()=>{d.style.boxShadow='';},1200);}return;}
  if(b.dataset.stkpick!==undefined){sheetEl.querySelectorAll('[data-stkpick][data-stkneed="'+b.dataset.stkneed+'"]').forEach(x=>{x.removeAttribute('data-on');x.style.borderColor='';x.style.background='';});b.dataset.on='1';b.style.borderColor='#eb6834';b.style.background='#fff7f2';return;}
  const stp=b.dataset.stepok||b.dataset.stepundo;
  if(stp&&s.kind==='j'){e.preventDefault();const j2=l.cond[s.cond].joints[s.i];const n=+stp;j2.steps=j2.steps||{};
    if(b.dataset.stepundo){if(!confirm('Annuler l\'étape '+n+' de '+j2.weldId+' (erreur de saisie) ?'))return;delete j2.steps[n];}
    else{
      const ph=(j2.steps[n]&&j2.steps[n].photos)||[];
      if(n===1&&!ph.length){toast('Ajoute au moins une photo du cordon');return;}                     // même blocage que l'ancien « Déclarer soudée »
      if(n===3){const pr=sheetEl.querySelector('#st3-press');if(!pr||!pr.checked){toast('Le test de pression doit être validé (ou signale un problème)');return;}
        if(!ph.length){toast('Ajoute une photo du manchon');return;}}
      if(n===1&&stockDoPick(l,s.cond,j2,'piece')===false){toast('Tube : confirme la zone de stockage');return;}
      if(n===1&&stockDoPick(l,s.cond,j2,'sleeve')===false){toast('Manchon : confirme la zone de stockage');return;} // le manchon s'enfile AVANT de souder : son stock se choisit à la soudure
      if(n===4&&stockDoPick(l,s.cond,j2,'pu')===false){toast('Mousse : confirme la zone (ou choisis-en une autre)');return;} // le manchonneur choisit son stock de mousse AU MOUSSAGE
      collectStep(j2,n);
      if(n===2){ // les fils déclarés au schéma deviennent ceux de la soudure, ET on FIGE le bouclage de l'instant t
        const inv2=state.conn.E!=='E'||state.conn.N!=='N';j2.conn={...state.conn};j2.wire=inv2?'inversion':'raccorde';
        j2.cont=!!j2.steps[2].cont;j2.iso=j2.steps[2].iso!=null?j2.steps[2].iso>=(+state.dh.isoMin||200):j2.iso;if(j2.steps[2].iso!=null)j2.isoVal=String(j2.steps[2].iso);
        const dj2=dhOfJoint(l.id,s.cond,j2.idx);
        if(dj2){const AP3=dhAtPoint(dj2.D,dj2.row);const cc3=[AP3.up.closed&&AP3.up.R!==null?{dir:'amont',...AP3.up}:null,AP3.down.closed&&AP3.down.R!==null?{dir:'aval',...AP3.down}:null].filter(Boolean);
          if(!cc3.length&&dj2.row.R!==null&&!dj2.row.open)cc3.push({dir:'amont',self:true,R:dj2.row.R,dE:dj2.row.dE,dN:dj2.row.dN}); // pas de fermeture déclarée : on fige la boucle amont entière (départ → ce manchon)
          const mv=j2.steps[2].meas;const bst=cc3.length?(mv?cc3.reduce((p,x)=>Math.abs(mv-x.R)<=Math.abs(mv-p.R)?x:p):cc3[0]):null;
          const dd4=dhDataOf()||{temps:{}};
          j2.steps[2].dh={at:new Date().toISOString(),meas:mv||null,iso:j2.steps[2].iso!=null?j2.steps[2].iso:null,
            dir:bst?bst.dir:null,closure:bst?(bst.self?'boucle amont entière (départ → ce manchon)':bst.kind==='temp'?'pont ⟲ '+bst.row.weldId:'bout bouclé ('+(bst.state==='coiffe'?'dans la coiffe':'sortie de coiffe')+')'):null,
            closureId:bst?(bst.self?'self':bst.kind==='temp'?bst.row.weldId:'bout'):null,closureLine:bst&&bst.kind==='temp'?bst.row.line:null,closureIdx:bst&&bst.kind==='temp'?bst.row.idx:null,
            expected:bst?bst.R:null,dE:bst?bst.dE:undefined,dN:bst?bst.dN:undefined,cond:s.cond,
            rkm:+state.dh.rkm||12.5,tol:+state.dh.tol||5,isoMin:+state.dh.isoMin||200,temps:Object.keys(dd4.temps||{})};}}
      j2.steps[n].done=true;j2.steps[n].by=(me()||{}).name||state.userId;j2.steps[n].at=new Date().toISOString();
      // le STATUT du plan découle de l'étape : plus deux modèles en parallèle
      const S2=j2.steps[n];
      if(n===1){j2.status='soudee';j2.events=[...(j2.events||[]),{type:'soudee',by:state.userId,at:new Date(),pos:curPos(),data:{procede:S2.proc,visuel:!!S2.visuel},photos:(S2.photos||[]).slice()}];}
      if(n===3){const inv3=j2.wire==='inversion';j2.status='manchonnee';
        j2.events=[...(j2.events||[]),{type:'manchonnee',by:state.userId,at:new Date(),pos:curPos(),data:{manchon:S2.type||'retracte',etanch:!!S2.press,fils:true,inv:inv3},photos:(S2.photos||[]).slice()}];}
      try{sync.logEvent(state.siteId,j2.weldId,'etape'+n,(me()||{}).name,{});}catch(e2){}}
    pushWeld(j2);renderSheet();renderPlan();toast(b.dataset.stepundo?'Étape '+n+' annulée — '+j2.weldId:'Étape '+n+'/4 validée — '+j2.weldId);return;}
  if(b.dataset.dhend){const el2=l.cond[s.cond].els[s.i];const d5=dhDataOf();if(!d5)return;const k5=dhEndKey(l.id,el2);
    if(d5.ends[k5]&&d5.ends[k5].state===b.dataset.dhend)delete d5.ends[k5];else d5.ends[k5]={state:b.dataset.dhend,by:(me()||{}).name||state.userId,at:new Date().toISOString()};
    saveDhData();renderSheet();toast('État DH enregistré — valeurs attendues recalculées');return;}
  const lockedToast=ids=>toast('Position figée — déjà manchonnée en '+ids.join(' et '));
  if(b.dataset.sw){state.sw[b.dataset.sw]=!state.sw[b.dataset.sw];b.classList.toggle('on',!!state.sw[b.dataset.sw]);return;}
  if(b.dataset.rot!==undefined){const lk=elLock(l,s.cond,s.i);if(lk)return lockedToast(lk);const el=l.cond[s.cond].els[s.i];const dg=+b.dataset.rot;const g=$('#dialw',sheetEl);if(g){g.style.transition='transform .35s';g.style.transformOrigin='45px 45px';g.style.transform=`rotate(${dg}deg)`;}setTimeout(()=>{el.rot=((el.rot+dg)%360+360)%360;renderSheet();renderPlan();},g?340:0);return;}
  if(b.dataset.wire){const [side,w]=b.dataset.wire.split(':');snapshotForm();if(side==='a'){state.wsel=state.wsel===w?null:w;}else if(state.wsel){state.conn[state.wsel]=w;state.wsel=null;}else if(w==='X'){state.conn.E='X';state.conn.N='X';}renderSheet();return;}
  if(b.dataset.rotb!==undefined||b.dataset.rota!==undefined){const j=l.cond[s.cond].joints[s.i];const off=b.dataset.rotb!==undefined?1:0;const el=l.cond[s.cond].els[j.idx+off];if(!el)return;const lk=elLock(l,s.cond,j.idx+off);if(lk)return lockedToast(lk);snapshotForm();el.rot=(((el.rot||0)+ +(off?b.dataset.rotb:b.dataset.rota))%360+360)%360;renderSheet();renderPlan();return;}
  if(b.dataset.flipb!==undefined||b.dataset.flipa!==undefined){const j=l.cond[s.cond].joints[s.i];const off=b.dataset.flipb!==undefined?1:0;const el=l.cond[s.cond].els[j.idx+off];if(!el)return;const lk=elLock(l,s.cond,j.idx+off);if(lk)return lockedToast(lk);snapshotForm();el.flip=!el.flip;renderSheet();renderPlan();return;}
  const a=b.dataset.act;e.preventDefault();
  if(a==='close')return closeSheet();
  if(a==='transfer'){startTransfer(s.line,s.cond,s.i);return;}
  if(a==='reset-weld'){const j=l.cond[s.cond].joints[s.i];if(!confirm(`Tout effacer sur ${j.weldId} (statut, photos, fils, notes) et la remettre « À souder » ? Le journal serveur garde une trace.`))return;const by=(me()||{}).name;wipeWeld(j);try{sync.logEvent(state.siteId,j.weldId,'remise_a_zero',by,{});}catch(e){}closeSheet();renderAll();toast(j.weldId+' remise à « À souder »');pushWeld(j);return;}
  if(a==='dh-here'){const root=(id=>{let L=state.lines[id];while(L&&L.parent&&state.lines[L.parent])L=state.lines[L.parent];return L;})(l.id);state.locate={...state.locate,line:root?root.id:l.id,cond:s.cond};state.dh.at={line:l.id,idx:s.i};state.dh.meas=null;state.dh.iso=null;state.dh.locVal='';closeSheet();state.tab='bouclage';renderAll();return;}
  if(a==='dh-temp'){const j2=l.cond[s.cond].joints[s.i];const d3=dhDataOf();if(!d3){toast('Aucun chantier');return;}
    if(d3.temps[j2.weldId]){if(!confirm('Retirer le bouclage temporaire '+j2.weldId+' ? (fils dé-pontés sur place)'))return;delete d3.temps[j2.weldId];toast('Bouclage temporaire retiré — valeurs attendues recalculées');}
    else{d3.temps[j2.weldId]={by:(me()||{}).name||state.userId,at:new Date().toISOString()};toast('⟲ Bouclage temporaire déclaré en '+j2.weldId+' — pris en compte dans les valeurs attendues (pense à la photo dans la fiche)');}
    saveDhData();renderSheet();return;}
  if(a==='back'){state.sheetMode='view';resetForm();renderSheet();return;}
  if(a.startsWith('form-')){state.sheetMode=a;state.wsel=null;resetForm();const j=l.cond[s.cond].joints[s.i];state.conn={...j.conn};state.sw={cont:false,iso:false,etanch:false,mousse:false};renderSheet();return;}
  if(a==='open-el-a'||a==='open-el-b'){openEl(s.line,s.cond,s.i+(a==='open-el-b'?1:0));return;}
  if(a==='flip'){const lk=elLock(l,s.cond,s.i);if(lk)return lockedToast(lk);const el=l.cond[s.cond].els[s.i];el.flip=!el.flip;renderSheet();renderPlan();return;}
  if(b.dataset.saut){const lk=elLock(l,s.cond,s.i);if(lk)return lockedToast(lk);const el=l.cond[s.cond].els[s.i];el.sautDir=b.dataset.saut;renderSheet();renderPlan();return;}
  if(a==='rot0'){const lk=elLock(l,s.cond,s.i);if(lk)return lockedToast(lk);const el=l.cond[s.cond].els[s.i];el.rot=0;el.flip=false;renderSheet();renderPlan();return;}
  if(a==='demo-photo'){snapshotForm();state.err='';const kind=state.sheetMode==='form-manchon'?'fils':state.sheetMode==='form-soudee'?'soudure':'manchon';const label=s.kind==='el'?l.cond[s.cond].els[s.i].id:l.cond[s.cond].joints[s.i].weldId;state.pendingPhotos.push(makePhoto(label+' · photo',kind));renderSheet();return;}
  if(a==='save-el'){const el=l.cond[s.cond].els[s.i];el.note=$('#f-note',sheetEl).value;el.photos.push(...state.pendingPhotos);toast(`${el.id} enregistrée (rotation ${el.rot}°${el.flip?', retournée':''})`);closeSheet();return;}
  const j=l.cond[s.cond].joints[s.i];const val=id=>$('#'+id,sheetEl)?.value;
  if(a==='save-soudee'){if(!state.pendingPhotos.length){snapshotForm();state.err='Ajoute au moins une photo du cordon.';renderSheet();return;}if(stockDoPick(l,s.cond,j,'piece')===false){snapshotForm();state.err='Prélèvement au stock : confirme la zone (ou choisis-en une autre).';renderSheet();return;}j.events.push({type:'soudee',by:state.userId,at:new Date(),pos:curPos(),data:{procede:val('f-proc'),note:val('f-note')},photos:state.pendingPhotos});j.status='soudee';afterSave(`${j.weldId} déclarée soudée`);return;}
  if(a==='save-manchon'){if(!state.sw.etanch){snapshotForm();state.err='Le test d\'étanchéité doit être validé (ou signale un problème).';renderSheet();return;}if(!state.pendingPhotos.length){snapshotForm();state.err='Ajoute une photo du raccordement des fils et du manchon.';renderSheet();return;}
    if(stockDoPick(l,s.cond,j,'sleeve')===false){snapshotForm();state.err='Prélèvement au stock : confirme la zone (ou choisis-en une autre).';renderSheet();return;}
    const inv=state.conn.E!=='E'||state.conn.N!=='N';j.conn={...state.conn};j.cont=!!state.sw.cont;j.iso=!!state.sw.iso;j.isoVal=val('f-iso')||'';j.wire=inv?'inversion':'raccorde';if(inv)j.note='Inversion enregistrée au manchonnage';
    j.events.push({type:'manchonnee',by:state.userId,at:new Date(),pos:curPos(),data:{manchon:val('f-manchon'),etanch:true,mousse:!!state.sw.mousse,fils:true,inv,note:val('f-note')},photos:state.pendingPhotos});j.status='manchonnee';afterSave(inv?`${j.weldId} manchonnée — inversion signalée au chef`:`${j.weldId} manchonnée, fils raccordés ✓`);return;}
  if(a==='save-controle-ok'||a==='save-controle-nok'){const ok=a==='save-controle-ok';j.events.push({type:'controle',by:state.userId,at:new Date(),pos:curPos(),data:{result:ok?'OK':'NOK',mode:val('f-mode'),ref:val('f-ref'),note:val('f-note')},photos:state.pendingPhotos});j.status=ok?'controlee':'a_reprendre';afterSave(ok?`${j.weldId} contrôlée OK`:`${j.weldId} à reprendre`);return;}
  if(a==='save-probleme'){if(!val('f-note')&&!state.pendingPhotos.length){snapshotForm();state.err='Décris le problème ou ajoute une photo.';renderSheet();return;}j.events.push({type:'probleme',by:state.userId,at:new Date(),pos:curPos(),data:{note:val('f-note')},photos:state.pendingPhotos});afterSave('Signalement envoyé au chef');return;}
});
sheetEl.addEventListener('change',e=>{if(e.target.id==='teeMode'||e.target.id==='teeWire'){const s0=state.sel;if(!s0||s0.kind!=='j')return;const j=state.lines[s0.line].cond[s0.cond].joints[s0.i];j.tee={...(j.tee||{}),[e.target.id==='teeMode'?'mode':'wire']:e.target.value||undefined};if(!j.tee.wire)delete j.tee.wire;sync.saveWeld(state.siteId,{...j}).then(ok=>{if(ok)setCloudBadge('enregistré '+new Date().toLocaleTimeString('fr-FR'));});toast('Raccordement de l\'antenne enregistré');return;}const sph=e.target.closest('[data-stepph]');
  if(sph){const s0=state.sel;if(!s0||s0.kind!=='j')return;const j2=state.lines[s0.line].cond[s0.cond].joints[s0.i];const n=+sph.dataset.stepph;j2.steps=j2.steps||{};const st2=collectStep(j2,n);const files=[...sph.files];
    (async()=>{for(const f of files){const d=await compressPhoto(f);let u=null;try{u=await sync.uploadPhoto(state.siteId,j2.weldId,d);}catch(e2){}st2.photos.push(u||d);}
      pushWeld(j2);renderSheet();if(files.length)toast(files.length>1?files.length+' photos ajoutées à l\'étape '+n:'Photo ajoutée à l\'étape '+n);})();
    return;}
  const c=e.target.closest('[data-conn]');if(c){snapshotForm();state.conn[c.dataset.conn]=c.value;renderSheet();return;}const inp=e.target.closest('[data-photo]');if(inp){snapshotForm();const files=[...inp.files];(async()=>{for(const f of files){const d=await compressPhoto(f);state.pendingPhotos.push(d);}renderSheet();if(files.length){const kb=Math.round(state.pendingPhotos.slice(-files.length).reduce((t,d)=>t+d.length*0.75,0)/1024);toast(files.length>1?`${files.length} photos ajoutées (${kb} Ko)`:`Photo ajoutée (${kb} Ko)`);}})();}});
// photos du téléphone : 3 à 5 Mo pièce en sortie d'appareil → réduites à 1600 px de grand côté, JPEG 78 % (≈ 200-400 Ko) avant envoi : 10 à 15 × moins de stockage et de trafic, largement assez net pour un cordon ou un raccordement
async function compressPhoto(file,max=1600,q=.78){const raw=()=>new Promise(res=>{const rd=new FileReader();rd.onload=()=>res(rd.result);rd.onerror=()=>res(null);rd.readAsDataURL(file);});
  try{let bmp=null;try{bmp=await createImageBitmap(file,{imageOrientation:'from-image'});}catch(e){bmp=await new Promise((res,rej)=>{const img=new Image();img.onload=()=>res(img);img.onerror=rej;img.src=URL.createObjectURL(file);});}
    const w=bmp.naturalWidth||bmp.width,h=bmp.naturalHeight||bmp.height;if(!w||!h)throw 0;const sc=Math.min(1,max/Math.max(w,h));const cw=Math.max(1,Math.round(w*sc)),ch=Math.max(1,Math.round(h*sc));
    const c=document.createElement('canvas');c.width=cw;c.height=ch;c.getContext('2d').drawImage(bmp,0,0,cw,ch);if(bmp.close)bmp.close();const out=c.toDataURL('image/jpeg',q);
    if(out.length>8&&(sc<1||out.length<file.size*1.3))return out;return (await raw())||out;}
  catch(e){return await raw();}}
function afterSave(msg){state.sheetMode='view';resetForm();renderAll();toast(msg);try{const s0=state.sel;if(s0&&s0.kind==='j'){const j=state.lines[s0.line].cond[s0.cond].joints[s0.i];const jj={...j};const up=async()=>{await sync.ensureSite({id:state.siteId,name:NET.name,supplier:NET.supplier,serie:NET.serie});const conv=async arr=>{const out=[];for(const p of (arr||[])){if(typeof p==='string'&&p.startsWith('data:')){const u=await sync.uploadPhoto(state.siteId,j.weldId,p);out.push(u||p);}else out.push(p);}return out;};jj.photos=await conv(j.photos);jj.events=[];for(const e of (j.events||[]))jj.events.push({...e,photos:await conv(e.photos)});const okk=await sync.saveWeld(state.siteId,jj);if(okk){await sync.logEvent(state.siteId,j.weldId,j.status,(me()||{}).name,{});setCloudBadge('enregistré '+new Date().toLocaleTimeString('fr-FR'));}};up();}}catch(e){console.warn(e);}setTimeout(()=>{if(state.sheetMode==='view')closeSheet();},900);}

/* ---------- schéma de bouclage (généralisé aux lignes + antennes) ---------- */
function wirePath(lineId,cond,wire){const line=state.lines[lineId];const segs=[];let d=0,cur=wire;if(!line.cond[cond])return {segs,total:0};if(typeof linkTraceurBranches==='function')linkTraceurBranches();const {els,joints}=line.cond[cond];
  els.forEach((e,i)=>{const brId=e.branchLine||(typeof e.branch==='string'?e.branch:null);const am=brId&&state.lines[brId]?antennaMode(brId,cond,e):null;if(brId&&am&&am.mode==='serie'&&cur===am.wire&&state.lines[brId].cond[cond]){segs.push({line:lineId,elIdx:i,kind:'main',m0:d,m1:d+e.len/2,phys0:e.m0,phys1:e.m0+e.len/2,w:cur});d+=e.len/2;const br=state.lines[brId];const bl=br.cond[cond].els;bl.forEach((be,bi)=>{segs.push({line:brId,elIdx:bi,kind:'branchOut',m0:d,m1:d+be.len,phys0:be.m0,phys1:be.m1,w:cur});d+=be.len;});for(let bi=bl.length-1;bi>=0;bi--){const be=bl[bi];segs.push({line:brId,elIdx:bi,kind:'branchBack',m0:d,m1:d+be.len,phys0:be.m1,phys1:be.m0,w:cur});d+=be.len;}segs.push({line:lineId,elIdx:i,kind:'main',m0:d,m1:d+e.len/2,phys0:e.m0+e.len/2,phys1:e.m1,w:cur});d+=e.len/2;}
    else{segs.push({line:lineId,elIdx:i,kind:'main',m0:d,m1:d+e.len,phys0:e.m0,phys1:e.m1,w:cur});d+=e.len;}
    const j=joints[i];if(j&&j.wire!=='a_raccorder'){const to=j.conn[cur];if(to==='X'){segs.push({line:lineId,elIdx:i,kind:'cut',m0:d,m1:d,phys0:e.m1,phys1:e.m1});return;}cur=to;}});
  return {segs,total:d};}
function locate(lineId,cond,wire,dist){const {segs,total}=wirePath(lineId,cond,wire);if(dist>total)return {ok:false,total};const s=segs.find(x=>dist>=x.m0&&dist<=x.m1);if(!s)return {ok:false,total};const e=state.lines[s.line].cond[cond].els[s.elIdx];const f=(dist-s.m0)/Math.max(.001,s.m1-s.m0);const phys=s.phys0+(s.phys1-s.phys0)*f;return {ok:true,total,dist,seg:s,e,phys,fromJ:phys-e.m0,toJ:e.m1-phys,where:s.kind==='branchOut'?'dans l\'antenne (vers la SST)':s.kind==='branchBack'?'dans l\'antenne (retour vers le té)':'sur la ligne',lineName:state.lines[s.line].name,line:s.line};}
const jColor=j=>j.wire==='raccorde'?'#0ca30c':j.wire==='inversion'?'#d03b3b':j.status==='manchonnee'?'#fab219':'#898781';
function bouclageSVG(lineId){const line=state.lines[lineId];const conds=['A','R'].filter(c=>line.cond[c]);const SC=Math.max(2.2,Math.min(7,700/line.length));const W=70+line.length*SC+120;const rowH=215;const H=rowH*conds.length+16;
  let s=`<svg width="${W}" height="${H}" viewBox="0 0 ${W} ${H}"><rect width="${W}" height="${H}" fill="#fcfcfb"/>`;
  conds.forEach((c,ri)=>{const y=ri*rowH+28;const yE=y+30,yN=y+48,col=c==='A'?'#c8382f':'#2a5fb4';const X=m=>50+m*SC;const {els,joints}=line.cond[c];
    s+=`<text x="12" y="${y}" font-size="13" font-weight="700" fill="${col}">${c==='A'?'ALLER':'RETOUR'}</text><text x="70" y="${y}" font-size="11" fill="#52514e">${esc(line.start)} → ${esc(line.end)} · ${fmt(line.length)} m</text>`;
    let cur={E:'E',N:'N'};let x0=X(0);let lvl=0;
    els.forEach((e,i)=>{const x1=X(e.m1);['E','N'].forEach(w=>{const phys=cur[w];const yy=phys==='E'?yE:yN;s+=`<line x1="${x0}" y1="${yy}" x2="${x1}" y2="${yy}" stroke="${WIRE[w].color}" stroke-width="3" stroke-linecap="round" ${w==='E'?'style="filter:drop-shadow(0 0 1px #777)"':''}/>`;});
      if(e.branch&&state.lines[e.branch]&&state.lines[e.branch].cond[c]){const br=state.lines[e.branch];const bx=X((e.m0+e.m1)/2);const yb=yN+22;const bl=Math.min(90,br.length*SC*.8);const lw=cur.E==='E'?'E':'N';s+=`<path d="M${bx} ${yE} V${yb} H${bx+bl} a10 10 0 0 1 0 20 H${bx+6} V${yE}" fill="none" stroke="${WIRE[lw].color}" stroke-width="3" style="filter:drop-shadow(0 0 1px #777)"/><text x="${bx}" y="${yb+62}" font-size="10" fill="#52514e">${esc(e.id)} → ${esc(br.name.split(' — ')[0])} · boucle sur le fil ${WIRE[lw].short} · 2 × ${fmt(br.length)} m</text>`;br.cond[c].joints.forEach((bj,bi)=>{const jx=bx+(br.cond[c].els[bi].m1/br.length)*bl;s+=`<circle cx="${jx}" cy="${yb}" r="4" fill="${jColor(bj)}"/><circle cx="${jx}" cy="${yb+20}" r="4" fill="${jColor(bj)}"/>`;});}
      const j=joints[i];if(j){const jx=x1+2;if(j.wire!=='a_raccorder'){const nxt={};['E','N'].forEach(w=>{const to=j.conn[cur[w]];nxt[w]=to==='X'?cur[w]:to;});if(nxt.E!==cur.E)s+=`<path d="M${jx-8} ${yE} L${jx+8} ${yN} M${jx-8} ${yN} L${jx+8} ${yE}" stroke="#d03b3b" stroke-width="3" fill="none"/>`;cur=nxt;}
        const close=i>0&&(e.m1-els[i-1].m1)*SC<26;lvl=close?Math.min(lvl+1,3):0;const dyl=lvl*20;
        s+=`<circle cx="${jx}" cy="${yE-14}" r="5" fill="${jColor(j)}"/><text x="${jx}" y="${yN+30+dyl}" font-size="9" fill="#52514e" text-anchor="middle">${j.weldId.replace('S-','')}</text><text x="${jx}" y="${yN+40+dyl}" font-size="8" fill="#898781" text-anchor="middle">${fmt(e.m1)}</text>`;x0=x1+4;}else x0=x1;});
    if(state.loc&&state.loc.ok&&state.loc.cond===c&&state.loc.lineId===lineId){const r=state.loc;let lx=null,ly;if(r.line===lineId){lx=X(r.phys);ly=yE;}else{const te=els.find(e=>e.branch===r.line||e.branchLine===r.line);if(te){const bx=X((te.m0+te.m1)/2);const br=state.lines[r.line];const bl=Math.min(90,br.length*SC*.8);lx=bx+(r.phys/br.length)*bl;ly=yN+22+(r.seg&&r.seg.kind==='branchBack'?20:0);}}if(lx!==null)s+=`<circle cx="${lx}" cy="${ly}" r="9" fill="none" stroke="#d03b3b" stroke-width="3"/><circle cx="${lx}" cy="${ly}" r="3" fill="#d03b3b"/><text x="${lx}" y="${ly-14}" font-size="10" font-weight="700" fill="#d03b3b" text-anchor="middle">défaut ≈ ici</text>`;}
  });return s+'</svg>';}
/* ---------- DH (détection d'humidité) : récap de boucle, mesure en un point, localisation ---------- */
// paramètres DH (accessibles dans l'onglet ; mémorisés sur l'appareil) : résistance d'un fil (Ω/km), isolement mini (MΩ), tolérance verdict (%), fil ajouté par piquage bouclé en coiffe (m, aller)
const DH_DEF={rkm:12.5,isoMin:200,antWire:'auto',tol:5,piqL:2};
function loadDH(){let o={};try{o=JSON.parse(localStorage.getItem('trace:dh')||'{}')||{};}catch(e){}return Object.assign({},DH_DEF,o,{at:null});}
state.dh=loadDH();
function saveDH(){try{localStorage.setItem('trace:dh',JSON.stringify({rkm:state.dh.rkm,isoMin:state.dh.isoMin,antWire:state.dh.antWire,tol:state.dh.tol,piqL:state.dh.piqL}));}catch(e){}}
// fil qui passe dans la branche d'un té (confirmé Ethan 20/08) : LOGSTOR = ÉTAMÉ dans la branche (le cuivré traverse tout droit) ; AXIOM / Renalia = CUIVRÉ (nu) dans la branche, l'étamé tout droit.
// Té retourné vers le bas (piquage de vidange, ou té à saut passant dessous) : le cheminement s'inverse.
function wireDefFournisseur(){const w=state.dh.antWire;if(w==='E'||w==='N')return w;const sup=(NET&&NET.supplier)||'';return sup==='LOGSTOR'?'E':'N';}
function wireOfTee(e){const w=wireDefFournisseur();const down=!!(e&&(e.vert==='down'||e.sautDir==='bas'));return down?(w==='E'?'N':'E'):w;}
// nombre de fils par tube : AXIOM 4 fils dès DN300 compris, Renalia 4 fils dès DN350 compris (2 paires ; câblage des tés 4 fils à confirmer fournisseurs), sinon 2
function nWiresOf(dn){const sup=(NET&&NET.supplier)||'';return (sup==='AXIOM'&&+dn>=300)||((sup==='RENALIA'||sup==='ZPU')&&+dn>=350)?4:2;}
// données DH partagées entre appareils (comme hydro) : états des extrémités (piquages, fins de ligne, SST), bouclages temporaires, mesures enregistrées
function dhDataOf(){if(!NET||NET.id==='__vide')return null;if(!NET.dhData)NET.dhData={ends:{},temps:{},mesures:[]};const d=NET.dhData;d.ends=d.ends||{};d.temps=d.temps||{};d.mesures=d.mesures||[];return d;}
const dhEndKey=(lineId,e)=>lineId+':'+e.id;
let dhSaveT=null;
function saveDhData(){const d=dhDataOf();if(!d)return;if(SITES[NET.id])SITES[NET.id].dhData=d;
  kv.get('trace:handoff:'+NET.id).then(x=>{if(x){x.dhData=d;return kv.set('trace:handoff:'+NET.id,x);}}).catch(()=>{});
  clearTimeout(dhSaveT);dhSaveT=setTimeout(async()=>{try{const {demo,...clean}=NET;const okk=await sync.saveSite(clean);if(okk){state.ownSiteWrite=Date.now();setCloudBadge('DH enregistrée '+new Date().toLocaleTimeString('fr-FR'));}}catch(e){console.warn(e);}},1200);}
const DH_END_LABEL={non:'fils en attente (non bouclé)',coiffe:'bouclé dans la coiffe',sortie:'bouclé en sortie de coiffe'};
// raccordement d'une antenne au té : mode (serie = insérée dans la boucle de la parente ; boucle = bouclée sur elle-même au té ; none = pas encore raccordée) et fil emprunté — porté par la soudure de sortie de té de l'antenne (j.tee), sinon défaut fournisseur (té retourné : inversé)
function antennaMode(childId,cond,parentEl){const L=state.lines[childId];const cd=L&&L.cond[cond];const tj=cd&&cd.joints[0];const t=(tj&&tj.tee)||{};return {mode:t.mode||'serie',wire:t.wire||wireOfTee(parentEl||null),j:tj};}
// antennes du traceur : rattachées par PK sur la parente (parentM) → on pose e.branch sur l'élément (té) de la parente qui contient ce PK, pour que wirePath boucle l'antenne en série
function linkTraceurBranches(){Object.values(state.lines).forEach(l=>{if(!l.parent||!l.traceur)return;const P=state.lines[l.parent];if(!P)return;const L=P.parentLink=P.parentLink||{};['A','R'].forEach(c=>{const cd=P.cond[c];if(!cd||!l.cond[c])return;const els=cd.els;let bi=els.findIndex(e=>e.kind==='tee'&&l.parentM>=e.m0-0.01&&l.parentM<=e.m1+0.01);if(bi<0)bi=els.findIndex(e=>l.parentM>=e.m0-0.01&&l.parentM<=e.m1+0.01);if(bi>=0){const e=els[bi];if(!e.branchLine)e.branchLine=l.id;}});});}
// boucle électrique d'une conduite : stations (soudures) dans l'ordre du fil étamé, avec longueurs cumulées étamé (dE) et nu (dN), et R attendue si pontage à ce manchon
function dhLoop(lineId,cond){const line=state.lines[lineId];if(!line||!line.cond[cond])return null;linkTraceurBranches();
  const rkm=+state.dh.rkm||12.5;const rho=rkm/1000;const dd0=dhDataOf()||{ends:{},temps:{}};const piqL=+state.dh.piqL||2;
  const piqTodo=[];const piqCuts={E:null,N:null}; // piquages à déclarer ; première coupure « piquage non bouclé » par fil (distance de fil)
  const walk=(wire)=>{const segs=[];const cuts=[];let d=0,cur=wire;const rec=(lid,depth)=>{const L=state.lines[lid];const cd=L&&L.cond[cond];if(!cd)return;const {els,joints}=cd;
      els.forEach((e,i)=>{const br=e.branchLine||((typeof e.branch==='string')?e.branch:null);const child=br&&state.lines[br]&&state.lines[br].cond[cond]&&depth<4?br:null;
        const am=child?antennaMode(child,cond,e):null;
        if(child&&am.mode==='serie'&&cur===am.wire){const half=(e.len||0)/2;segs.push({line:lid,elIdx:i,kind:'main',m0:d,m1:d+half});d+=half;
          const bl=state.lines[child].cond[cond].els,bj=state.lines[child].cond[cond].joints;const d0=d;
          bl.forEach((be,bi)=>{segs.push({line:child,elIdx:bi,kind:'branchOut',m0:d,m1:d+(be.len||0)});d+=(be.len||0);const jj=bj[bi];if(jj)segs.push({line:child,elIdx:bi,kind:'jointOut',m0:d,m1:d,j:jj,parentLine:lid,parentIdx:i});});
          for(let bi=bl.length-1;bi>=0;bi--){const be=bl[bi];segs.push({line:child,elIdx:bi,kind:'branchBack',m0:d,m1:d+(be.len||0)});d+=(be.len||0);}
          segs.push({line:lid,elIdx:i,kind:'main',m0:d,m1:d+half});d+=half;}
        else if(e.kind==='tee'&&e.vert&&!child&&cur===wireOfTee(e)){ // piquage purge (haut) / vidange (bas) : LE fil concerné monte dans le piquage
          const st2=dd0.ends[dhEndKey(lid,e)];const half=(e.len||0)/2;segs.push({line:lid,elIdx:i,kind:'main',m0:d,m1:d+half});d+=half;
          if(st2&&(st2.state==='coiffe'||st2.state==='sortie')){segs.push({line:lid,elIdx:i,kind:'piq',m0:d,m1:d+2*piqL});d+=2*piqL;} // bouclé : aller-retour dans le piquage
          else if(st2&&st2.state==='non'){segs.push({line:lid,elIdx:i,kind:'cut',m0:d,m1:d,piq:true});cuts.push(d);if(piqCuts[wire]===null)piqCuts[wire]=d;} // fils en attente dans la coiffe : circuit coupé ici
          else piqTodo.push({line:lid,elIdx:i,id:e.id,vert:e.vert,wire,at:d}); // pas déclaré : le fil traverse (à déclarer dans la fiche du té)
          segs.push({line:lid,elIdx:i,kind:'main',m0:d,m1:d+half});d+=half;}
        else{segs.push({line:lid,elIdx:i,kind:'main',m0:d,m1:d+(e.len||0)});d+=(e.len||0);}
        const j=joints[i];if(j){segs.push({line:lid,elIdx:i,kind:'joint',m0:d,m1:d,j});if(j.wire!=='a_raccorder'){const to=(j.conn||{})[cur];if(to==='X'){segs.push({line:lid,elIdx:i,kind:'cut',m0:d,m1:d});cuts.push(d);}else if(to)cur=to;}}});};
    rec(lineId,0);return {segs,total:d,cuts};};
  const E=walk('E'),N=walk('N');
  // lignes du tableau : dans l'ordre du fil étamé ; le fil nu complète les distances (et apporte les soudures d'antenne quand l'antenne est prise sur son parcours, ex. après une inversion)
  const rows=[];const byKey={};const insAt={};
  const add=(segs,isE)=>{segs.forEach(s=>{if(s.kind!=='joint'&&s.kind!=='jointOut')return;const key=s.line+'|'+s.elIdx;let r=byKey[key];
    if(!r){const j=s.j;const L=state.lines[s.line];const e=L.cond[cond].els[s.elIdx];r=byKey[key]={weldId:j.weldId,line:s.line,lineName:L.name,idx:s.elIdx,pk:e?e.m1:0,wire:j.wire||'a_raccorder',status:j.status,dE:null,dN:null,R:null,antenna:s.kind==='jointOut',iso:j.iso,isoVal:j.isoVal,open:false};
      if(isE||s.kind!=='jointOut')rows.push(r);else{const pk=s.parentLine+'|'+s.parentIdx;if(insAt[pk]===undefined){let pos=rows.length;for(let k=rows.length-1;k>=0;k--){if(rows[k].line===s.parentLine&&rows[k].idx<=s.parentIdx-1&&!rows[k].antenna){pos=k+1;break;}}insAt[pk]=pos;}rows.splice(insAt[pk]++,0,r);}}
    if(isE)r.dE=+s.m0.toFixed(1);else r.dN=+s.m0.toFixed(1);});};
  add(E.segs,true);add(N.segs,false);
  let open=false,endIdx=-1;rows.forEach((r,i)=>{if(r.dE!==null&&r.dN!==null)r.R=+(rho*(r.dE+r.dN)).toFixed(2);
    r.open=open||(piqCuts.E!==null&&r.dE!==null&&r.dE>=piqCuts.E)||(piqCuts.N!==null&&r.dN!==null&&r.dN>=piqCuts.N); // au-delà d'un piquage déclaré « non bouclé », le circuit est coupé
    r.temp=!!dd0.temps[r.weldId];
    if(!r.open&&r.wire==='a_raccorder')open=true;else if(!r.open&&r.wire!=='a_raccorder')endIdx=i;});
  const end=endIdx>=0?rows[endIdx]:null;
  // fermeture réelle de la boucle : 1) bouclage TEMPORAIRE déclaré le plus proche (atteignable) ; 2) bout de ligne déclaré bouclé (coiffe / sortie) si tout est raccordé jusqu'au bout ; 3) sinon « si pontage au dernier raccordé » (comme avant)
  const bridge=rows.find(r=>!r.open&&r.temp&&r.wire!=='a_raccorder')||null;
  let endTip=null,tipState=null;{const rl=state.lines[lineId];const lastEl=rl&&rl.cond[cond]&&rl.cond[cond].els[rl.cond[cond].els.length-1];
    const st3=lastEl&&dd0.ends[dhEndKey(lineId,lastEl)];tipState=st3&&(st3.state==='coiffe'||st3.state==='sortie')?st3.state:null;
    if(st3&&(st3.state==='coiffe'||st3.state==='sortie')&&rows.length&&rows.every(r=>!r.open&&r.wire!=='a_raccorder'))endTip={R:+(rho*(E.total+N.total)).toFixed(2),state:st3.state,totalE:E.total,totalN:N.total};}
  const close=bridge?{kind:'temp',row:bridge,R:bridge.R}:endTip?{kind:'tip',R:endTip.R,state:endTip.state}:end?{kind:'pont',row:end,R:end.R}:null;
  return {rows,end,close,piqTodo,piqCuts,tipState,cutsE:E.cuts,cutsN:N.cuts,totalE:E.total,totalN:N.total,rho,rkm,nOk:rows.filter(r=>r.wire==='raccorde').length,nInv:rows.filter(r=>r.wire==='inversion').length,nTodo:rows.filter(r=>r.wire==='a_raccorder').length};}
// boucles RÉELLEMENT mesurables depuis une soudure : parcours amont / aval en continuité électrique, jusqu'à une FERMETURE
// (pont temporaire ⟲, bout de ligne déclaré bouclé) ou une OUVERTURE (manchon non raccordé, coupure de fil, départ, bout non bouclé).
// C'est le raisonnement terrain : deux ponts posés autour d'un tronçon → deux boucles distinctes, une par direction (demande Ethan 20/08).
function dhAtPoint(D,row){const i=D.rows.indexOf(row);if(i<0)return null;
  const between=(a,b,arr)=>(arr||[]).some(x=>x>Math.min(a,b)+0.01&&x<Math.max(a,b)-0.01);
  const mk=(r)=>{ // fermeture au pont ⟲ posé à la soudure r (raccordée ou non : le pont relie les fils là)
    if(row.dN===null||r.dN===null)return {closed:true,kind:'temp',row:r,dE:Math.abs(row.dE-r.dE),dN:null,R:null,antenne:true};
    if(between(row.dE,r.dE,D.cutsE)||between(row.dN,r.dN,D.cutsN))return {closed:false,openAt:r,why:'coupure'};
    const dE=+Math.abs(row.dE-r.dE).toFixed(1),dN=+Math.abs(row.dN-r.dN).toFixed(1);
    return {closed:true,kind:'temp',row:r,dE,dN,R:+(D.rho*(dE+dN)).toFixed(2)};};
  const dir=(step)=>{
    for(let j2=i+step;j2>=0&&j2<D.rows.length;j2+=step){const r=D.rows[j2];
      if(r.temp)return mk(r);
      if(r.wire==='a_raccorder')return {closed:false,openAt:r,dE:+Math.abs(row.dE-r.dE).toFixed(1),why:'manchon'};}
    if(step<0)return {closed:false,openAt:null,dE:row.dE,why:'depart'};
    if(D.tipState){const dE=+Math.max(0,D.totalE-row.dE).toFixed(1);const dN=row.dN!==null?+Math.max(0,D.totalN-row.dN).toFixed(1):null;
      if(dN!==null&&!between(row.dE,D.totalE,D.cutsE)&&!between(row.dN,D.totalN,D.cutsN))return {closed:true,kind:'tip',state:D.tipState,dE,dN,R:+(D.rho*(dE+dN)).toFixed(2)};
      return {closed:false,openAt:null,why:'coupure',dE};}
    return {closed:false,openAt:null,dE:+Math.max(0,D.totalE-row.dE).toFixed(1),why:'bout'};};
  return {up:dir(-1),down:dir(1)};}
// libellé court d'une direction (fermée / ouverte) pour l'onglet DH et la fiche soudure
function dhDirLab(d){if(!d)return '—';
  if(d.closed)return d.kind==='temp'?(d.antenne?'fermée au pont ⟲ '+esc(d.row.weldId)+' (antenne : calcul non géré)':'fermée au pont ⟲ '+esc(d.row.weldId)):'fermée au bout ('+(d.state==='coiffe'?'bouclé dans la coiffe':'sortie de coiffe')+')';
  return d.why==='manchon'?'ouverte — fils non raccordés à '+esc(d.openAt.weldId)+' ('+fmt(d.dE)+' m)':d.why==='depart'?'ouverte au départ (pas de bouclage)':d.why==='coupure'?'coupure de fil sur le trajet (piquage en attente ?)':'ouverte — bout de ligne non bouclé';}
// boucle DH d'une soudure vue depuis sa fiche : retrouve la ligne racine (ou l'antenne bouclée sur elle-même) et la ligne du tableau
function dhOfJoint(lineId,cond,jIdx){const mains=Object.values(state.lines).filter(l=>!l.parent||['A','R'].some(c2=>l.cond[c2]&&antennaMode(l.id,c2).mode==='boucle'));
  for(const m of mains){if(!m.cond[cond])continue;const D=dhLoop(m.id,cond);if(!D)continue;const row=D.rows.find(r=>r.line===lineId&&r.idx===jIdx);if(row)return {D,row};}
  return null;}
function renderBouclage(){const el=$('#bouclage');const L=state.locate;const mains=Object.values(state.lines).filter(l=>!l.parent||['A','R'].some(c=>l.cond[c]&&antennaMode(l.id,c).mode==='boucle'));if(!mains.length){el.innerHTML='<h2 class="vt">DH — détection d\'humidité</h2><div class="card muted">Aucune ligne dans ce chantier — trace un réseau avec le traceur.</div>';return;}if(!mains.find(l=>l.id===L.line))L.line=mains[0].id;const line=state.lines[L.line];
  if(!line.cond[L.cond])L.cond=line.cond.A?'A':'R';const cond=L.cond;const D=dhLoop(L.line,cond);const rho=D.rho;
  const colC=cond==='A'?'#c8382f':'#2a5fb4';const wlab=w=>w==='raccorde'?'<span style="color:#0ca30c">raccordés</span>':w==='inversion'?'<b style="color:#d03b3b">inversion</b>':'<span class="dim">à raccorder</span>';
  // point de mesure choisi (fiche soudure « Mesurer ici » ou liste)
  let at=state.dh.at;if(at&&!(D.rows.find(r=>r.line===at.line&&r.idx===at.idx)))at=null;
  const atRow=at?D.rows.find(r=>r.line===at.line&&r.idx===at.idx):null;const endR=D.end;
  // réflectomètre : branché AU MANCHON CHOISI (direction au choix) — retour Ethan 20/08 « ça part du point 0, il faut que ça parte du manchon choisi » — ou au départ de la ligne
  const useAt=!!atRow&&L.from!=='start';let res;
  if(!useAt)res=locate(L.line,cond,L.wire,+L.d||0);
  else{const refBase=L.wire==='E'?atRow.dE:atRow.dN;
    if(refBase===null)res={ok:false,noWire:true};
    else{const dFil=(L.dir==='up')?refBase-(+L.d||0):refBase+(+L.d||0);
      res=dFil<0?{ok:false,uphill:true,total:refBase}:locate(L.line,cond,L.wire,dFil);}}
  // legs = l'intervalle de FIL parcouru (du branchement au défaut), sur le walk du fil choisi : le tracé du plan suit LE FIL, pas l'axe (retour Ethan 25/08 « le visuel doit suivre le fil »)
  const legs0=res.ok?(()=>{const d0=useAt?(L.wire==='E'?atRow.dE:atRow.dN):0;return d0!==null&&d0!==undefined&&Math.abs(res.dist-d0)>0.05?[{wire:L.wire,d0,d1:res.dist}]:null;})():null;
  state.loc=res.ok?{...res,cond,lineId:L.line,wireLine:L.line,legs:legs0,dFil:+L.d||0,from:useAt?{line:atRow.line,idx:atRow.idx,pk:atRow.pk,weldId:atRow.weldId}:null}:null; // from = manchon de branchement → le trajet dessiné part de LÀ, sur la conduite mesurée
  let mesure='';let mesCtx=null; // contexte de la boucle choisie, gardé avec chaque mesure enregistrée (le bouclage de l'instant t donne son sens à la valeur — demande Ethan 20/08)
  if(atRow){const AP=dhAtPoint(D,atRow);const up=AP.up,dn=AP.down;const tol=+state.dh.tol||5;
    // les DEUX directions, chacune avec sa propre fermeture (pont ⟲ / bout bouclé) — l'utilisateur CHOISIT la boucle qu'il mesure (carte cliquable)
    const dirOk={up:up.closed&&up.R!==null,down:dn.closed&&dn.R!==null};
    if(!(state.dh.dir==='up'&&dirOk.up)&&!(state.dh.dir==='down'&&dirOk.down))state.dh.dir=dirOk.up?'up':dirOk.down?'down':null;
    const act=state.dh.dir==='up'?{dir:'amont',key:'up',...up}:state.dh.dir==='down'?{dir:'aval',key:'down',...dn}:null;
    const other=act?(act.key==='up'?(dirOk.down?{dir:'aval',...dn}:null):(dirOk.up?{dir:'amont',...up}:null)):null;
    const dirCard=(key,lab,d)=>{const okc=d.closed&&d.R!==null;const on=state.dh.dir===key;
      if(!okc)return `<div class="dhdir off"><div class="dt">${lab}</div><div class="dr" style="font-size:13px;color:#8a6d1f">ouverte — pas de valeur attendue</div><div class="dm">${dhDirLab(d)}</div></div>`;
      return `<div class="dhdir ${on?'on':''}" data-dhdir="${key}"><div class="dt">${lab}${on?' <span style="color:#eb6834">● celle que je mesure</span>':''}</div><div class="dr">${fmt2(d.R)} Ω <span class="du">attendu</span></div><div class="dm">${dhDirLab(d)}<br>étamé ${fmt(d.dE)} m + nu ${fmt(d.dN)} m = ${fmt(d.dE+d.dN)} m de fil</div></div>`;};
    const meas=state.dh.meas;let verdict='';
    if(meas>0){if(!act)verdict=`<div class="warnbox" style="margin-top:8px">Aucune boucle FERMÉE depuis ce point : rien à comparer. Pose un bouclage temporaire ⟲ (fiche d'une soudure) ou déclare un bout de ligne bouclé, la valeur attendue apparaîtra.</div>`;
      else{const diff=meas-act.R;const dm=diff/(2*rho);const pct=act.R?Math.round(100*diff/act.R):0;
        const otherFit=other&&other.R&&Math.abs(Math.round(100*(meas-other.R)/other.R))<=tol&&Math.abs(pct)>tol;
        verdict=`<div class="${Math.abs(pct)<=tol?'okbox':'warnbox'}" style="margin-top:8px">${Math.abs(pct)<=tol?`✓ Correspond à la <b>boucle ${act.dir}</b> (${dhDirLab(act)}) : attendu ${fmt2(act.R)} Ω ± ${tol} %.`:`Écart ${pct>0?'+':''}${pct} % vs la boucle ${act.dir} choisie (attendu ${fmt2(act.R)} Ω) — ${fmt(Math.abs(dm))} m de fil de ${diff>0?'plus':'moins'}, tolérance ± ${tol} %.${otherFit?` <b>⚠ Ta valeur colle avec la boucle ${other.dir} (${fmt2(other.R)} Ω)</b> — vérifie de quel côté tu as mesuré, ou clique l'autre carte ci-dessus.`:` ${diff<0?'Boucle plus courte : pontage ou défaut avant la fermeture.':'Boucle plus longue : fil supplémentaire, piquage non déclaré pris dans la boucle, ou inversion.'}`}`}</div>`;}}
    const iso=state.dh.iso;let isoV='';
    if(iso!==null&&iso!==undefined&&iso!==''){const isoN=parseFloat(String(iso).replace(',','.'));
      if(isFinite(isoN))isoV=isoN>=+state.dh.isoMin?`<div class="okbox" style="margin-top:6px">Isolement ${fmt2(isoN)} MΩ ≥ ${esc(state.dh.isoMin)} MΩ : sec ✓</div>`
        :`<div class="err" style="margin-top:6px">⚠ Isolement ${fmt2(isoN)} MΩ &lt; ${esc(state.dh.isoMin)} MΩ : humidité probable. Renseigne la localisation de l'appareil (m de fil ou %) puis « Localiser ».</div>`;}
    let locBox='';const lv=state.dh.locVal;
    if(lv){
      if(!act)locBox=`<div class="err" style="margin-top:6px">Localisation : aucune boucle fermée depuis ce point (pose un ⟲ ou déclare un bout bouclé).</div>`;
      else{const Lb=act.dE+act.dN;let x=null;const pm=String(lv).trim();
        if(/%$/.test(pm))x=parseFloat(pm)/100*Lb;else x=parseFloat(pm.replace(',','.'));
        if(isFinite(x)&&x>0){if(x>Lb+0.5)locBox=`<div class="err" style="margin-top:6px">Distance au-delà de la boucle ${act.dir} (${fmt(Lb)} m de fil au total).</div>`;
          else{const closeDN=act.kind==='tip'?D.totalN:act.row.dN;const closeDE=act.kind==='tip'?D.totalE:act.row.dE;let wire2,dFil;
            if(x<=act.dE){wire2='E';dFil=act.dir==='amont'?atRow.dE-x:atRow.dE+x;}
            else{wire2='N';dFil=act.dir==='amont'?closeDN+(x-act.dE):closeDN-(x-act.dE);}
            const res2=locate(L.line,cond,wire2,dFil);
            const legs2=(x<=act.dE?[{wire:'E',d0:atRow.dE,d1:dFil}]:[{wire:'E',d0:atRow.dE,d1:closeDE},{wire:'N',d0:closeDN,d1:dFil}]).filter(g=>g.d0!==null&&g.d0!==undefined&&g.d1!==null&&g.d1!==undefined&&Math.abs(g.d1-g.d0)>0.05);
            if(res2.ok)locBox=`<div class="warnbox" style="margin-top:6px"><b>Défaut estimé à ${fmt(x)} m de fil du point de mesure</b> (boucle ${act.dir}, fil ${wire2==='E'?'étamé':'nu'}) : ≈ <b>${esc(res2.e.id)}</b>, ${esc(res2.where)} — ${esc(res2.lineName)}, PK ${fmt(res2.phys)} m. <a href="#" id="dh-locshow" style="color:#1c3d6b;font-weight:700">Voir sur le plan (trajet + zone)</a></div>`;
            else locBox=`<div class="err" style="margin-top:6px">Distance au-delà du fil connu (${fmt(res2.total)} m).</div>`;
            state.dhLocPending=res2.ok?{...res2,cond,lineId:L.line,wireLine:L.line,legs:legs2,dFil:x,from:{line:atRow.line,idx:atRow.idx,pk:atRow.pk,weldId:atRow.weldId}}:null;}}}}
    mesCtx=act?{dir:act.dir,closure:act.kind==='temp'?'pont ⟲ '+act.row.weldId:'bout bouclé ('+(act.state==='coiffe'?'dans la coiffe':'sortie de coiffe')+')',closureId:act.kind==='temp'?act.row.weldId:'bout',expected:act.R,dE:act.dE,dN:act.dN}:null;
    const calc=act?`<details class="muted" style="font-size:12px;margin-top:6px"><summary style="cursor:pointer;color:#52514e">Le calcul, pas à pas (boucle ${act.dir})</summary>
      <div style="padding:6px 2px;line-height:1.65">Du manchon <b>${esc(atRow.weldId)}</b> jusqu'à la fermeture (${dhDirLab(act)}) :<br>
      · le courant fait l'aller par un fil et le retour par l'autre : fil étamé <b>${fmt(act.dE)} m</b> + fil nu <b>${fmt(act.dN)} m</b> = <b>${fmt(act.dE+act.dN)} m de fil</b><br>
      · × la résistance du fil : ${fmt(act.dE+act.dN)} m × <b>${esc(state.dh.rkm)} Ω/km</b> ÷ 1000 = <b>${fmt2(act.R)} Ω</b> <span class="dim">(le réglage « fil (Ω/km) » ci-dessus — mets la valeur du fournisseur)</span><br>
      <span class="dim">Un piquage purge / vidange « bouclé dans la coiffe » ajoute 2 × ${esc(state.dh.piqL)} m au fil qui y monte. Le pont ⟲ relie étamé ↔ nu à son manchon : c'est lui qui ferme la boucle.</span></div></details>`:'';
    mesure=`<div class="kv"><span>Point : <b>${esc(atRow.weldId)}</b> · ${esc(atRow.lineName)} · PK ${fmt(atRow.pk)} m</span>${atRow.temp?'<span style="background:#f3e8ff">⟲ un pont est posé À ce manchon (mesure ≈ 0 ici)</span>':''}</div>
      <div style="display:flex;gap:8px;margin-top:8px;flex-wrap:wrap">${dirCard('up','VERS L\'AMONT',up)}${dirCard('down','VERS L\'AVAL',dn)}</div>
      <div class="muted" style="font-size:12px;margin-top:6px">Deux boucles À PART, chacune fermée par SON pont ⟲ ou son bout bouclé. <b>Touche la carte de la boucle que tu mesures</b> — le verdict et la localisation travaillent sur celle-là. Isolement attendu ≥ ${esc(state.dh.isoMin)} MΩ.</div>
      ${calc}
      <div class="row" style="margin-top:8px;display:flex;gap:6px;align-items:end;flex-wrap:wrap"><div><label class="f">Boucle mesurée (Ω)${act?' — <b style="color:#eb6834">'+act.dir+'</b>':''}</label><input class="f" id="dh-meas" type="number" inputmode="decimal" step="0.01" value="${state.dh.meas||''}" style="width:110px"></div><div><label class="f">Isolement (MΩ)</label><input class="f" id="dh-iso2" type="number" inputmode="decimal" step="0.01" value="${state.dh.iso??''}" style="width:100px"></div><div><label class="f">Localisation (m ou %)</label><input class="f" id="dh-locval" placeholder="ex. 98 ou 52%" value="${esc(state.dh.locVal||'')}" style="width:110px"></div><button class="btn primary" id="dh-check">Comparer</button></div>
      ${verdict}${isoV}${locBox}
      ${(meas>0||isoV)?`<div class="row" style="margin-top:8px"><button class="btn" id="dh-save-mesure">💾 Enregistrer cette mesure (date, valeurs, verdict)</button></div>`:''}`;}
  else mesure=`<div class="muted">Choisis un manchon dans le récap ci-dessus (ou « Mesurer ici » dans sa fiche) : distances électriques amont / aval et résistance de boucle attendue.</div>`;
  const rowsHTML=D.rows.map((r,i)=>`<tr class="${r.open?'dim':''} ${endR&&r===endR?'tot':''} ${at&&r.line===at.line&&r.idx===at.idx?'sel':''}" data-line="${r.line}" data-idx="${r.idx}" style="cursor:pointer;${r.antenna?'background:#fbfaf6':''}"><td>${r.antenna?'↳ ':''}${esc(r.weldId)}${r.temp?' <b title="bouclage temporaire déclaré ici" style="color:#8a2be2">⟲</b>':''}${r.antenna?' <span class="dim">'+esc(r.lineName)+'</span>':''}</td><td>${fmt(r.pk)}</td><td>${wlab(r.wire)}</td><td>${fmt(r.dE)}</td><td>${r.dN===null?'—':fmt(r.dN)}</td><td>${r.R===null?'—':'<b>'+fmt2(r.R)+'</b>'}</td></tr>`).join('');
  const dd=dhDataOf()||{ends:{},temps:{},mesures:[]};
  const dnMaxL=Math.max(0,...Object.values(state.lines).map(l2=>+l2.dn||0));const nw4=nWiresOf(dnMaxL);
  const tempsChips=Object.entries(dd.temps).map(([wid,t])=>`<span class="hyChip" style="border-color:#8a2be2">⟲ ${esc(wid)} · ${esc(t.by||'')} ${t.at?esc(new Date(t.at).toLocaleDateString('fr-FR')):''}<button data-rmtemp="${esc(wid)}" title="retirer le bouclage temporaire">✕</button></span>`).join('');
  const mesRows=(dd.mesures||[]).slice(-5).reverse().map(m2=>{
    const bad=m2.okLoop===false||m2.ok===false;const good=!bad&&(m2.okLoop===true||m2.ok===true);
    const mCol=`${m2.loop?'<b>'+fmt2(m2.loop)+' Ω</b>'+(m2.expected?` <span class="dim">/ att. ${fmt2(m2.expected)}${m2.tolPct?' ± '+m2.tolPct+' %':''}</span>`:''):''}${m2.iso!==undefined&&m2.iso!==null?`${m2.loop?'<br>':''}${fmt2(m2.iso)} MΩ`:''}${!m2.loop&&(m2.iso===undefined||m2.iso===null)?'—':''}`;
    const bCol=m2.dir?`${esc(m2.dir)} · ${esc(m2.closure||'')}${m2.dE!==undefined?`<br><span class="dim">étamé ${fmt(m2.dE)} + nu ${fmt(m2.dN)} m</span>`:''}`:'<span class="dim">—</span>';
    return `<tr title="${esc('ponts ⟲ posés à ce moment-là : '+((m2.temps&&m2.temps.length)?m2.temps.join(', '):'aucun')+(m2.rkm?' · fil '+m2.rkm+' Ω/km':''))}"><td>${esc(new Date(m2.at).toLocaleDateString('fr-FR'))}</td><td>${esc(m2.weldId||'')}</td><td>${mCol}</td><td style="font-size:11.5px">${bCol}</td><td>${good?'<span style="color:#0ca30c">✓</span>':bad?'<b style="color:#d03b3b">⚠</b>':'—'}</td><td class="dim">${esc(m2.by||'')}</td></tr>`;}).join('');
  el.innerHTML=`<h2 class="vt">DH — détection d'humidité</h2>
   <div class="row" style="margin-bottom:6px;display:flex;gap:6px;flex-wrap:wrap;align-items:center"><select class="f" id="bl-line">${mains.map(l=>`<option value="${l.id}" ${l.id===L.line?'selected':''}>${l.parent?'↳ '+esc(l.name)+' (bouclée sur elle-même au té)':esc(l.name)}</option>`).join('')}</select><select class="f" id="bl-cond">${['A','R'].filter(c=>line.cond[c]).map(c=>`<option value="${c}" ${c===cond?'selected':''}>${c==='A'?'Aller':'Retour'}</option>`).join('')}</select>${nw4>2?`<span class="hyChip" style="border-color:#b8560f;color:#7a4a00" title="AXIOM : 4 fils dès DN300 · Renalia : 4 fils dès DN350 — deux paires ; le câblage des tés à 4 fils sera intégré avec les schémas fournisseurs">⚠ ${nw4} fils sur ce DN (2 paires)</span>`:''}</div>
   <div class="muted" style="font-size:12px;margin-bottom:8px;display:flex;gap:8px;flex-wrap:wrap;align-items:center"><span>Paramètres :</span><label title="Résistance du fil de détection, en ohms par kilomètre DE FIL. Boucle attendue = (m d'étamé + m de nu) × cette valeur ÷ 1000. 12,5 Ω/km par défaut — remplace par la valeur du fournisseur.">fil (Ω/km) <input class="f" id="dh-rkm" type="number" step="0.1" inputmode="decimal" value="${state.dh.rkm}" style="width:62px;padding:3px 6px"></label><label>isolement mini <input class="f" id="dh-iso" type="number" step="10" inputmode="numeric" value="${state.dh.isoMin}" style="width:62px;padding:3px 6px"> MΩ</label><label>tolérance ± <input class="f" id="dh-tol" type="number" step="1" inputmode="numeric" value="${state.dh.tol}" style="width:48px;padding:3px 6px"> %</label><label title="Longueur de fil qui MONTE dans un piquage purge / vidange (l'aller). Quand le piquage est déclaré « bouclé dans la coiffe », la boucle gagne 2 × cette longueur (aller-retour) sur le fil qui y passe.">fil monté dans un piquage <input class="f" id="dh-piql" type="number" step="0.5" inputmode="decimal" value="${state.dh.piqL}" style="width:52px;padding:3px 6px"> m (aller)</label><label>fil dans la branche <select class="f" id="dh-antwire" style="padding:3px 6px"><option value="auto" ${state.dh.antWire!=='E'&&state.dh.antWire!=='N'?'selected':''}>auto — ${wireDefFournisseur()==='E'?'étamé':'cuivré (nu)'} (${esc((NET&&NET.supplier)||'fournisseur')})</option><option value="E" ${state.dh.antWire==='E'?'selected':''}>étamé (forcé)</option><option value="N" ${state.dh.antWire==='N'?'selected':''}>cuivré / nu (forcé)</option></select></label><span title="Confirmé : LOGSTOR = l'étamé passe dans la branche ; AXIOM / Renalia = le cuivré. Té retourné vers le bas (vidange, saut dessous) : inversé automatiquement. Ω/km et fil par piquage : à affiner avec les fournisseurs.">ⓘ</span></div>
   <div class="card"><h3 style="margin-top:0;color:${colC}">Boucle ${cond==='A'?'aller':'retour'} — ${esc(line.name)}</h3>
     ${D.close&&D.close.kind==='temp'?`<div class="okbox">Boucle FERMÉE par le <b>bouclage temporaire ⟲ ${esc(D.close.row.weldId)}</b> (PK ${fmt(D.close.row.pk)} m) : <b>${fmt2(D.close.R)} Ω</b> attendus depuis le départ.</div>`
      :D.close&&D.close.kind==='tip'?`<div class="okbox">Boucle FERMÉE au bout de ligne (<b>${D.close.state==='coiffe'?'bouclé dans la coiffe':'bouclé en sortie de coiffe'}</b>) : étamé ${fmt(D.totalE)} m + nu ${fmt(D.totalN)} m → <b>${fmt2(D.close.R)} Ω</b> attendus depuis le départ.</div>`
      :endR?`<div class="okbox">Continue depuis le départ jusqu'à <b>${esc(endR.weldId)}</b> (PK ${fmt(endR.pk)} m) : étamé <b>${fmt(endR.dE)} m</b>, nu <b>${endR.dN===null?'—':fmt(endR.dN)+' m'}</b> → si pontage à ${esc(endR.weldId)} : <b>${endR.R===null?'—':fmt2(endR.R)+' Ω'}</b>. <span class="dim">Pas de bouclage déclaré (⟲ fiche soudure, ou état du bout de ligne).</span></div>`:`<div class="warnbox">Aucun manchon raccordé en continu depuis le départ : la boucle n'est pas commencée (ou le premier manchon est « à raccorder »).</div>`}
     ${D.piqTodo&&D.piqTodo.length?`<div class="warnbox" style="margin-top:6px">⚠ ${D.piqTodo.length} piquage${D.piqTodo.length>1?'s':''} (purge / vidange) sans état DH déclaré : ${D.piqTodo.slice(0,4).map(p2=>esc(p2.id)+' ('+(p2.vert==='up'?'purge':'vidange')+')').join(', ')}${D.piqTodo.length>4?'…':''} — déclare « bouclé dans la coiffe / non bouclé » dans la fiche de la pièce (le fil ${wireDefFournisseur()==='E'?'étamé':'cuivré'} y passe).</div>`:''}
     ${tempsChips?`<div style="margin-top:6px">${tempsChips}</div>`:''}
     <div class="kv" style="margin:6px 0"><span>${D.nOk} raccordés</span><span>${D.nTodo} à faire</span>${D.nInv?`<span style="background:#fdecec"><b style="color:#d03b3b">${D.nInv} inversion</b></span>`:''}<span>fil étamé total ${fmt(D.totalE)} m · nu ${fmt(D.totalN)} m</span></div>
     <div style="overflow:auto;max-height:52vh;border:1px solid var(--line);border-radius:8px"><table class="rc" id="dh-rows" style="margin:0"><tr><th>Soudure</th><th>PK</th><th>Fils</th><th title="longueur électrique cumulée du fil étamé depuis le départ">étamé</th><th title="fil nu cumulé">nu</th><th title="résistance de boucle attendue au départ si on ponte étamé ↔ nu à ce manchon">Ω pont.</th></tr>${rowsHTML}</table></div>
     <div class="muted" style="font-size:11.5px;margin-top:4px">Ligne surlignée = fin actuelle de la boucle. Lignes grisées = au-delà du premier manchon non raccordé. « ↳ » = soudure d'antenne, prise en série sur l'étamé (aller-retour compté).</div></div>
   <div class="card" id="dh-mesure"><h3 style="margin-top:0">Mesure en un point</h3>${mesure}</div>
   ${mesRows?`<div class="card"><h3 style="margin-top:0">Dernières mesures enregistrées</h3><div class="muted" style="font-size:11.5px;margin-bottom:4px">Chaque mesure garde le bouclage de l'instant t (direction, fermeture, longueurs, attendu) : la valeur reste interprétable même quand les ponts auront bougé.</div><table class="rc"><tr><th>Date</th><th>Point</th><th>Mesuré</th><th>Bouclage à l'instant t</th><th></th><th>Par</th></tr>${mesRows}</table>${(dd.mesures||[]).length>5?`<div class="muted" style="font-size:11px">${dd.mesures.length} mesures au total (les 5 dernières affichées).</div>`:''}</div>`:''}
   <div class="card"><h3 style="margin-top:0">Localiser un défaut</h3>
   <div class="muted" style="font-size:12px;margin-bottom:6px">L'appareil annonce une distance le long du fil où il est branché. Dis d'où tu es branché et vers où tu vises : l'appli remonte au bon endroit du plan.</div>
   <div class="row" style="display:flex;gap:6px;flex-wrap:wrap;align-items:end"><div style="flex:none"><label class="f">Branché à</label><select class="f" id="loc-from" style="min-width:132px">${atRow?`<option value="at" ${useAt?'selected':''}>${esc(atRow.weldId)} · choisi</option>`:''}<option value="start" ${!useAt?'selected':''}>${esc(line.start.split(' — ')[0])} · départ</option></select></div>${useAt?`<div style="flex:none"><label class="f">Je vise</label><select class="f" id="loc-dir" style="min-width:92px"><option value="down" ${L.dir!=='up'?'selected':''}>l'aval</option><option value="up" ${L.dir==='up'?'selected':''}>l'amont</option></select></div>`:''}<div style="flex:none"><label class="f">Fil</label><select class="f" id="loc-wire" style="min-width:86px"><option value="E" ${L.wire==='E'?'selected':''}>Étamé</option><option value="N" ${L.wire==='N'?'selected':''}>Nu</option></select></div><div><label class="f">Distance (m)</label><input class="f" id="loc-d" type="number" inputmode="decimal" step="0.1" value="${L.d}" style="width:96px"></div><button class="btn primary" id="loc-go" style="height:38px">Localiser</button></div>
   ${res.ok?`<div class="okbox" style="margin-top:10px"><b>≈ ${res.e.id} (${res.e.type==='barre'?'barre '+fmt(res.e.len)+' m':res.e.kind||res.e.type}), ${res.where}</b> — à ${fmt(res.fromJ)} m du manchon amont, ${fmt(res.toJ)} m du manchon aval · ${esc(res.lineName)} (PK ${fmt(res.phys)} m)${useAt?` · <span class="dim">${fmt(+L.d||0)} m depuis ${esc(atRow.weldId)} vers ${L.dir==='up'?"l'amont":"l'aval"} sur ${L.wire==='E'?"l'étamé":'le nu'}</span>`:''}. <a href="#" id="loc-show" style="color:#1c3d6b">Voir sur le plan</a></div>`
    :res.noWire?`<div class="err" style="margin-top:10px">Le fil nu ne passe pas par ce manchon (soudure d'antenne prise sur l'étamé) — branche-toi sur l'étamé.</div>`
    :res.uphill?`<div class="err" style="margin-top:10px">Vers l'amont, le fil ne fait que ${fmt(res.total)} m avant le départ — distance trop grande.</div>`
    :(+L.d>0?`<div class="err" style="margin-top:10px">Distance supérieure à la longueur de fil connue (${fmt(res.total)} m).</div>`:'')}</div>
   <details class="card"><summary style="cursor:pointer;color:var(--ink2);font-size:13px">Schéma filaire (ancienne vue)</summary><div style="overflow:auto;border:1px solid var(--line);border-radius:8px;margin-top:6px">${bouclageSVG(L.line)}</div></details>`;
  $('#bl-line').onchange=e=>{state.locate.line=e.target.value;state.dh.at=null;renderBouclage();};
  $('#bl-cond').onchange=e=>{state.locate.cond=e.target.value;state.dh.at=null;renderBouclage();};
  $('#dh-rkm').onchange=e=>{state.dh.rkm=parseFloat(String(e.target.value).replace(',','.'))||DH_DEF.rkm;saveDH();renderBouclage();};
  $('#dh-iso').onchange=e=>{state.dh.isoMin=parseFloat(String(e.target.value).replace(',','.'))||DH_DEF.isoMin;saveDH();renderBouclage();};
  $('#dh-tol').onchange=e=>{state.dh.tol=Math.max(1,parseFloat(String(e.target.value).replace(',','.'))||DH_DEF.tol);saveDH();renderBouclage();};
  $('#dh-piql').onchange=e=>{state.dh.piqL=Math.max(0,parseFloat(String(e.target.value).replace(',','.'))||DH_DEF.piqL);saveDH();renderBouclage();};
  $('#dh-antwire').onchange=e=>{state.dh.antWire=e.target.value==='N'?'N':e.target.value==='E'?'E':'auto';saveDH();renderBouclage();};
  $('#dh-rows').addEventListener('click',e=>{const tr=e.target.closest('tr[data-line]');if(!tr)return;state.dh.at={line:tr.dataset.line,idx:+tr.dataset.idx};state.dh.dir=null;state.dh.meas=null;state.dh.iso=null;state.dh.locVal='';renderBouclage();const m=$('#dh-meas');if(m)m.scrollIntoView({block:'center',behavior:'smooth'});});
  $$('#dh-mesure [data-dhdir]').forEach(d3=>d3.addEventListener('click',()=>{state.dh.dir=d3.dataset.dhdir;renderBouclage();}));
  const lf=$('#loc-from');if(lf)lf.onchange=e=>{state.locate.from=e.target.value;renderBouclage();};
  const ld2=$('#loc-dir');if(ld2)ld2.onchange=e=>{state.locate.dir=e.target.value;renderBouclage();};
  const chk=$('#dh-check');if(chk)chk.onclick=()=>{state.dh.meas=parseFloat(String($('#dh-meas').value).replace(',','.'))||0;state.dh.iso=$('#dh-iso2').value;state.dh.locVal=$('#dh-locval').value;renderBouclage();};
  $$('#bouclage [data-rmtemp]').forEach(b=>b.addEventListener('click',()=>{const d2=dhDataOf();if(!d2)return;if(!confirm('Retirer le bouclage temporaire '+b.dataset.rmtemp+' ? (fils dé-pontés sur place)'))return;delete d2.temps[b.dataset.rmtemp];saveDhData();renderBouclage();}));
  const svm=$('#dh-save-mesure');if(svm)svm.onclick=()=>{const d2=dhDataOf();if(!d2){toast('Aucun chantier');return;}const at2=state.dh.at;const row2=at2&&dhLoop(L.line,cond).rows.find(r=>r.line===at2.line&&r.idx===at2.idx);
    const isoN=parseFloat(String(state.dh.iso??'').replace(',','.'));const okIso=isFinite(isoN)?isoN>=+state.dh.isoMin:null;
    const mv=state.dh.meas||null;const okLoop=(mv&&mesCtx&&mesCtx.expected)?Math.abs(Math.round(100*(mv-mesCtx.expected)/mesCtx.expected))<=(+state.dh.tol||5):null;
    d2.mesures.push({at:new Date().toISOString(),by:(me()||{}).name||state.userId,weldId:row2?row2.weldId:'',cond,loop:mv,iso:isFinite(isoN)?isoN:null,loc:state.dh.locVal||null,ok:okIso===null?undefined:okIso,
      // le bouclage de l'instant t, sans lequel la valeur ne veut rien dire : direction, fermeture, longueurs, attendu, verdict, réglages, ponts posés
      dir:mesCtx?mesCtx.dir:undefined,closure:mesCtx?mesCtx.closure:undefined,closureId:mesCtx?mesCtx.closureId:undefined,expected:mesCtx?mesCtx.expected:undefined,dE:mesCtx?mesCtx.dE:undefined,dN:mesCtx?mesCtx.dN:undefined,
      okLoop:okLoop===null?undefined:okLoop,tolPct:+state.dh.tol||5,rkm:+state.dh.rkm||12.5,temps:Object.keys(d2.temps||{})});
    saveDhData();toast('Mesure enregistrée avec le bouclage du moment');renderBouclage();};
  const dls=$('#dh-locshow');if(dls)dls.onclick=ev=>{ev.preventDefault();const r=state.dhLocPending;if(!r)return;state.loc=r;state.dhShowLoc=true;state.tab='plan';renderAll();const l=state.lines[r.line];const p=posAtChainage(l,r.phys);centerOn(p.x,p.y,Math.max(state.view.k,10/(l.ppm||1)));toast('Défaut affiché : trajet + zone (± incertitude) sur le plan');};
  $('#loc-go').onclick=()=>{state.locate={...state.locate,line:$('#bl-line').value,cond:$('#bl-cond').value,wire:$('#loc-wire').value,d:parseFloat($('#loc-d').value.replace(',','.'))||0};renderBouclage();};
  const sh=$('#loc-show');if(sh)sh.onclick=ev=>{ev.preventDefault();const r=state.loc;state.dhShowLoc=true;const l=state.lines[r.line];state.tab='plan';renderAll();const p=posAtChainage(l,r.phys);centerOn(p.x,p.y,Math.max(state.view.k,14/l.ppm));toast('Défaut affiché : trajet + zone sur le plan (se retire en changeant de chantier ou via la fiche)');};}
// position sur LA CONDUITE (pas l'axe central de la ligne) à un chaînage donné — le fil suit le tube mesuré, pas le milieu de la tranchée (retour Ethan 20/08 : « ça part du tube d'à côté »)
function condPos(l,c,m){const cd=l&&l.cond&&l.cond[c];if(!cd||!cd.els.length)return posAtChainage(l,m);
  const els=cd.els;let e=els.find(x=>m>=x.m0&&m<=x.m1)||(m<els[0].m0?els[0]:els[els.length-1]);
  const t=(e.m1>e.m0)?Math.min(1,Math.max(0,(m-e.m0)/(e.m1-e.m0))):0;
  const pts=[];(e.axis&&e.axis.length?e.axis:[[e.from,e.to]]).forEach(pl=>pl.forEach(p=>pts.push(Array.isArray(p)?{x:p[0],y:p[1]}:p)));
  if(pts.length<2)return pts[0]||posAtChainage(l,m);
  const seg=[];let L2=0;for(let i=1;i<pts.length;i++){const d=Math.hypot(pts[i].x-pts[i-1].x,pts[i].y-pts[i-1].y);seg.push(d);L2+=d;}
  let target=t*L2;for(let i=1;i<pts.length;i++){if(target<=seg[i-1]||i===pts.length-1){const u=seg[i-1]?Math.min(1,target/seg[i-1]):0;return {x:pts[i-1].x+(pts[i].x-pts[i-1].x)*u,y:pts[i-1].y+(pts[i].y-pts[i-1].y)*u};}target-=seg[i-1];}
  return pts[pts.length-1];}
// portion d'axe de la CONDUITE entre deux chaînages (pièces entières + bords échantillonnés)
function condSubAxis(l,c,a,b){const cd=l&&l.cond&&l.cond[c];if(!cd||!cd.els.length)return subAxis(l,Math.min(a,b),Math.max(a,b));
  const lo=Math.min(a,b),hi=Math.max(a,b);const pts=[];
  cd.els.forEach(e=>{if(e.m1<=lo||e.m0>=hi)return;
    if(e.m0>=lo&&e.m1<=hi){(e.axis&&e.axis.length?e.axis:[[e.from,e.to]]).forEach(pl=>pl.forEach(p=>pts.push(Array.isArray(p)?{x:p[0],y:p[1]}:p)));}
    else{const m0=Math.max(lo,e.m0),m1=Math.min(hi,e.m1);const n=Math.max(2,Math.ceil((m1-m0)/1.5));for(let i=0;i<=n;i++)pts.push(condPos(l,c,m0+(m1-m0)*i/n));}});
  return pts.length>1?[pts]:[];}
// rejoue sur le plan LE BOUCLAGE FIGÉ au moment du raccordement d'un manchon : trajet du manchon jusqu'à la fermeture
// de l'époque (pont ⟲ ou bout bouclé), avec la valeur attendue d'alors — « la valeur ne veut dire quelque chose qu'avec son bouclage » (Ethan)
function showFrozenLoop(l,c,j){const f=j.steps&&j.steps[2]&&j.steps[2].dh;if(!f){toast('Pas de bouclage enregistré ici');return;}
  const cnd=f.cond||c;const els=l.cond[cnd]&&l.cond[cnd].els;if(!els){toast('Conduite introuvable');return;}
  let from={line:l.id,idx:j.idx,pk:els[j.idx]?els[j.idx].m1:0,weldId:j.weldId};
  let to=null,clJ=null;
  if(f.closureId==='self'){to={line:l.id,phys:els[j.idx]?els[j.idx].m1:0};from=null;} // boucle amont entière : trajet depuis le départ, ⟲ posé au manchon même
  if(!to&&f.closureLine&&state.lines[f.closureLine]){const L2=state.lines[f.closureLine];const e2=L2.cond[cnd]&&L2.cond[cnd].els[f.closureIdx];
    if(e2){to={line:L2.id,phys:e2.m1};clJ={line:L2.id,idx:f.closureIdx};}}
  if(!to&&f.closureId==='bout'){const last=els[els.length-1];to={line:l.id,phys:last?last.m1:0};}
  if(!to){ // le pont a pu être retiré depuis : on le retrouve par son n° de soudure
    for(const L2 of Object.values(state.lines)){const cd=L2.cond[cnd];if(!cd)continue;const jj=cd.joints.find(x=>x.weldId===f.closureId);if(jj){to={line:L2.id,phys:cd.els[jj.idx]?cd.els[jj.idx].m1:0};clJ={line:L2.id,idx:jj.idx};break;}}}
  if(!to){toast('Fermeture « '+(f.closure||'?')+' » introuvable sur le plan');return;}
  // la boucle = les DEUX fils entre le manchon et sa fermeture : tracés chacun de leur côté de la conduite, couleur du fil physique (inversions visibles)
  const rootL=(id=>{let L4=state.lines[id];while(L4&&L4.parent&&state.lines[L4.parent])L4=state.lines[L4.parent];return L4;})(l.id);
  const filAt=(wire,jl,ji)=>{const wp=wirePath(rootL.id,cnd,wire);if(jl==='bout')return wp.total;
    const sg=[...wp.segs].reverse().find(s2=>(s2.kind==='main'||s2.kind==='branchOut')&&s2.line===jl&&s2.elIdx===ji);return sg?sg.m1:null;};
  const legs=[];['E','N'].forEach(w=>{const d0=filAt(w,l.id,j.idx);const d1=f.closureId==='self'?0:f.closureId==='bout'?filAt(w,'bout'):clJ?filAt(w,clJ.line,clJ.idx):null;
    if(d0!==null&&d1!==null&&Math.abs(d1-d0)>0.05)legs.push({wire:w,d0,d1});});
  state.loc={line:to.line,cond:cnd,phys:to.phys,from,wireLine:rootL.id,legs:legs.length?legs:null,dFil:(f.dE||0)+(f.dN||0),loop:{weldId:j.weldId,closure:f.closure,expected:f.expected,meas:f.meas,at:f.at,temps:f.temps||[]},e:{id:f.closureId||''}};
  state.dhShowLoc=true;state.tab='plan';renderAll();
  const L3=state.lines[to.line];const p=posAtChainage(L3,to.phys);centerOn(p.x,p.y,Math.max(state.view.k,8));
  toast('Bouclage du '+(f.at?new Date(f.at).toLocaleDateString('fr-FR'):'')+' — '+(f.closure||''));}
// tracé d'un FIL sur le plan (retours Ethan 25/08) : UNE seule couleur de surbrillance (rouge = trajet jusqu'au défaut,
// violet = boucle figée rejouée), bien décalée du côté du fil physique — le trait CHANGE de côté à une inversion, plonge dans
// l'antenne au té (aller d'un côté, retour de l'autre) et chaque jonction (inversion, té, pont de fermeture) est reliée : zéro ambiguïté.
function offsetPl(pts,delta){const out=[];for(let i=0;i<pts.length;i++){const a2=pts[Math.max(0,i-1)],b2=pts[Math.min(pts.length-1,i+1)];const dx=b2.x-a2.x,dy=b2.y-a2.y;const L2=Math.hypot(dx,dy)||1;out.push({x:pts[i].x-dy/L2*delta,y:pts[i].y+dx/L2*delta});}return out;}
function wireTraceSVG(lineId,cond,legs,k,color,mode){const off=6/k;const col=color||'#e8102d';
  const groups=[];
  legs.forEach((leg,li)=>{const wp=wirePath(lineId,cond,leg.wire);const lo=Math.min(leg.d0,leg.d1),hi=Math.max(leg.d0,leg.d1);
    let g=null;const gs=[];const push=()=>{if(g)gs.push(g);g=null;};
    wp.segs.forEach(sg=>{if(sg.kind==='cut'||sg.m1<=lo||sg.m0>=hi)return;
      const t0=(Math.max(lo,sg.m0)-sg.m0)/Math.max(.001,sg.m1-sg.m0),t1=(Math.min(hi,sg.m1)-sg.m0)/Math.max(.001,sg.m1-sg.m0);
      const p0=sg.phys0+(sg.phys1-sg.phys0)*t0,p1=sg.phys0+(sg.phys1-sg.phys0)*t1;const w=sg.w||leg.wire;
      const side=(w==='E'?1:-1)*(sg.kind==='branchBack'?-1:1); // aller et retour d'antenne chacun de leur côté ; inversion = changement de côté
      if(g&&g.line===sg.line&&g.w===w&&g.side===side)g.p1=p1;
      else{push();g={line:sg.line,w,side,p0,p1,leg:li};}});
    push();
    if(leg.d1<leg.d0){gs.reverse();gs.forEach(g2=>{const t=g2.p0;g2.p0=g2.p1;g2.p1=t;});} // dans le SENS du parcours (amont : on remonte)
    groups.push(...gs);});
  let s2='';const ends=[];
  groups.forEach(g2=>{const L3=state.lines[g2.line];if(!L3)return;
    let pts=[];condSubAxis(L3,cond,Math.min(g2.p0,g2.p1),Math.max(g2.p0,g2.p1)).forEach(pl=>{pts=pts.concat(pl);});
    if(pts.length<2)return;
    const rev=g2.p0>g2.p1;if(rev)pts=pts.slice().reverse();
    const o=offsetPl(pts,off*g2.side*(rev?-1:1)); // polyligne retournée : le delta s'inverse pour rester du même côté MONDE
    const d2=pathD(o);
    s2+=`<path d="${d2}" stroke="#fff" stroke-width="${9/k}" fill="none" stroke-linecap="round" stroke-linejoin="round" opacity=".85"/><path d="${d2}" data-wtl="${esc(g2.line)}" stroke="${col}" stroke-width="${3.8/k}" fill="none" stroke-linecap="round" stroke-linejoin="round" stroke-dasharray="${11/k} ${5/k}"><animate attributeName="stroke-dashoffset" values="${32/k};0" dur="1.1s" repeatCount="indefinite"/></path>`;
    ends.push({a:o[0],b:o[o.length-1],leg:g2.leg});});
  const joint=(A,B)=>{const d3=Math.hypot(B.x-A.x,B.y-A.y);if(d3<0.01||d3>25*off)return '';
    return `<path d="M${A.x} ${A.y} L${B.x} ${B.y}" stroke="#fff" stroke-width="${9/k}" fill="none" stroke-linecap="round" opacity=".85"/><path d="M${A.x} ${A.y} L${B.x} ${B.y}" data-wtc="1" stroke="${col}" stroke-width="${3.8/k}" fill="none" stroke-linecap="round"/>`;};
  for(let i=1;i<ends.length;i++){if(mode==='loop'&&ends[i].leg!==ends[i-1].leg)continue; // boucle : les 2 fils sont parallèles, pas bout à bout
    s2+=joint(ends[i-1].b,ends[i].a);} // défaut : on relie TOUT (manchon d'inversion, entrée/sortie d'antenne, pont étamé→nu)
  if(mode==='loop'){const L0=ends.filter(e=>e.leg===0),L1=ends.filter(e=>e.leg===1);
    if(L0.length&&L1.length){s2+=joint(L0[0].a,L1[0].a);s2+=joint(L0[L0.length-1].b,L1[L1.length-1].b);}} // les 2 fils reliés aux 2 bouts : le testeur d'un côté, la fermeture ⟲ de l'autre
  return s2;}
// défaut DH sur le plan : le TRAJET du fil est surligné depuis le départ de la ligne racine, la distance cotée, la zone du défaut marquée (± incertitude) — « pas juste un point »
function renderDhOverlay(){if(!dhG)return;const r=state.loc;if(!r||!state.dhShowLoc||!state.lines[r.line]){dhG.innerHTML='';return;}
  const k=state.view.k;const l=state.lines[r.line];
  const segsP=[];{let L2=l,m=r.phys;while(L2){segsP.unshift({l:L2,m0:0,m1:m});const pm=+L2.parentM||0;L2=L2.parent&&state.lines[L2.parent]?state.lines[L2.parent]:null;m=pm;}}
  // le trajet part du MANCHON DE BRANCHEMENT (r.from) quand il est connu — pas du départ de la ligne (retour Ethan 20/08)
  if(r.from&&r.from.line){const i0=segsP.findIndex(sg=>sg.l.id===r.from.line);if(i0>=0){segsP.splice(0,i0);segsP[0].m0=r.from.pk;}}
  const cnd=r.cond||'A';
  const wireS=(r.legs&&r.legs.length&&r.wireLine&&state.lines[r.wireLine])?wireTraceSVG(r.wireLine,cnd,r.legs,k,r.loop?'#8a2be2':'#e8102d',r.loop?'loop':'fault'):'';
  let s='';if(wireS)s+=wireS; // le tracé SUIT LE FIL (couleur du fil physique, côté qui bascule aux inversions)
  else segsP.forEach(sg=>{const a=Math.min(sg.m0||0,sg.m1),b=Math.max(sg.m0||0,sg.m1);condSubAxis(sg.l,cnd,a,b).forEach(pl=>{const d=pathD(pl);
    s+=`<path d="${d}" stroke="#fff" stroke-width="${8/k}" fill="none" stroke-linejoin="round" stroke-linecap="round" opacity=".75"/><path d="${d}" stroke="#b8560f" stroke-width="${4/k}" fill="none" stroke-linejoin="round" stroke-linecap="round" stroke-dasharray="${9/k} ${5/k}"><animate attributeName="stroke-dashoffset" values="${28/k};0" dur="1.2s" repeatCount="indefinite"/></path>`;});});
  // point de branchement : rond bleu « M » + n° du manchon, posé EXACTEMENT sur le manchon de la conduite mesurée
  if(r.from&&r.from.line&&state.lines[r.from.line]){const jl=state.lines[r.from.line];const q0=(r.from.idx!==undefined&&jl.cond&&jl.cond[cnd])?jointPos(jl,r.from.idx,cnd):condPos(jl,cnd,r.from.pk);
    s+=`<circle cx="${q0.x}" cy="${q0.y}" r="${9/k}" fill="#1c6fd6" stroke="#fff" stroke-width="${2.4/k}"/><text x="${q0.x}" y="${q0.y+3.4/k}" font-size="${9/k}" font-weight="900" text-anchor="middle" fill="#fff" font-family="system-ui,sans-serif">M</text>`;
    const lm=`MESURE : ${r.from.weldId}`;const wm=lm.length*6.2+16;
    s+=`<g transform="translate(${q0.x} ${q0.y}) scale(${1/k})"><rect x="${-wm/2}" y="13" width="${wm}" height="16" rx="8" fill="#1c6fd6"/><text y="24.5" font-size="9.5" font-weight="700" text-anchor="middle" fill="#fff" font-family="system-ui,sans-serif">${esc(lm)}</text></g>`;}
  if(r.loop){ // rejeu d'un bouclage figé : pas de défaut, on marque la FERMETURE et on rappelle la valeur attendue d'alors
    const q1=condPos(l,cnd,r.phys);
    s+=`<circle cx="${q1.x}" cy="${q1.y}" r="${9/k}" fill="#8a2be2" stroke="#fff" stroke-width="${2.4/k}"/><text x="${q1.x}" y="${q1.y+3.4/k}" font-size="${10/k}" font-weight="900" text-anchor="middle" fill="#fff" font-family="system-ui,sans-serif">⟲</text>`;
    const lab2=`${r.loop.closure||'fermeture'} · attendu ${r.loop.expected?fmt2(r.loop.expected)+' Ω':'—'}${r.loop.meas?' · mesuré '+fmt2(r.loop.meas)+' Ω':''}`;const w4=lab2.length*6+18;
    s+=`<g transform="translate(${q1.x} ${q1.y}) scale(${1/k})"><rect x="${-w4/2}" y="-38" width="${w4}" height="17" rx="8.5" fill="#8a2be2"/><text y="-25.5" font-size="10" font-weight="800" text-anchor="middle" fill="#fff" font-family="system-ui,sans-serif">${esc(lab2)}</text></g>`;
    if(segsP.length){const sg1=segsP[0];const mm1=(Math.min(sg1.m0||0,sg1.m1)+Math.max(sg1.m0||0,sg1.m1))/2;const q2=condPos(sg1.l,cnd,mm1);const cl1=`boucle du ${r.loop.at?new Date(r.loop.at).toLocaleDateString('fr-FR'):''}`;const w5=cl1.length*6.5+14;
      s+=`<g transform="translate(${q2.x} ${q2.y}) scale(${1/k})"><rect x="${-w5/2}" y="-9" width="${w5}" height="17" rx="8.5" fill="#0b0b0b" opacity=".85"/><text y="3.8" font-size="10" font-weight="800" text-anchor="middle" fill="#e9d5ff" font-family="system-ui,sans-serif">${esc(cl1)}</text></g>`;}
    dhG.innerHTML=`<g style="pointer-events:none">${s}</g>`;return;}
  const tolM=Math.max(3,(r.dFil||r.phys)*0.02); // incertitude ± 2 % (mini 3 m)
  condSubAxis(l,cnd,Math.max(0,r.phys-tolM),Math.min(l.length,r.phys+tolM)).forEach(pl=>{s+=`<path d="${pathD(pl)}" stroke="#d03b3b" stroke-width="${13/k}" fill="none" stroke-linecap="round" opacity=".25"/>`;});
  let p=condPos(l,cnd,r.phys);
  if(wireS&&r.seg){const pa=condPos(l,cnd,Math.max(0,r.phys-1)),pb=condPos(l,cnd,r.phys+1);const dx=pb.x-pa.x,dy=pb.y-pa.y;const dl=Math.hypot(dx,dy)||1;
    const d6=6/k*(((r.seg.w||'E')==='E'?1:-1)*(r.seg.kind==='branchBack'?-1:1));p={x:p.x-dy/dl*d6,y:p.y+dx/dl*d6};} // posé SUR le fil, du bon côté
  s+=`<circle cx="${p.x}" cy="${p.y}" r="${14/k}" fill="#d03b3b" opacity=".2"><animate attributeName="r" values="${10/k};${18/k};${10/k}" dur="1.6s" repeatCount="indefinite"/></circle><circle cx="${p.x}" cy="${p.y}" r="${7/k}" fill="#d03b3b" stroke="#fff" stroke-width="${2.4/k}"/><text x="${p.x}" y="${p.y+3.4/k}" font-size="${9/k}" font-weight="900" text-anchor="middle" fill="#fff" font-family="system-ui,sans-serif">!</text>`;
  const lab=`défaut ≈ ${fmt(r.dFil||0)} m de fil · ${r.e?r.e.id:''} · ± ${fmt(tolM)} m`;const w2=lab.length*6+16;
  s+=`<g transform="translate(${p.x} ${p.y}) scale(${1/k})"><rect x="${-w2/2}" y="-38" width="${w2}" height="17" rx="8.5" fill="#d03b3b"/><text y="-25.5" font-size="10" font-weight="800" text-anchor="middle" fill="#fff" font-family="system-ui,sans-serif">${esc(lab)}</text></g>`;
  // cote à mi-trajet (distance DE FIL depuis le branchement quand elle est connue)
  if(segsP.length){const sg0=segsP[0];const mm=(Math.min(sg0.m0||0,sg0.m1)+Math.max(sg0.m0||0,sg0.m1))/2;const q=condPos(sg0.l,cnd,mm);const cl=`${fmt(r.dFil||r.phys)} m ►`;const w3=cl.length*6.5+14;
    s+=`<g transform="translate(${q.x} ${q.y}) scale(${1/k})"><rect x="${-w3/2}" y="-9" width="${w3}" height="17" rx="8.5" fill="#0b0b0b" opacity=".85"/><text y="3.8" font-size="10" font-weight="800" text-anchor="middle" fill="#ffd9a8" font-family="system-ui,sans-serif">${esc(cl)}</text></g>`;}
  dhG.innerHTML=`<g style="pointer-events:none">${s}</g>`;}
const fmt2=n=>Number(n).toLocaleString('fr-FR',{minimumFractionDigits:2,maximumFractionDigits:2});

/* ---------- stockage pré-isolé (maquette validée 20/08) : livraisons camion, zones sur le plan, pointage, scission, prélèvements ---------- */
const stockCanEdit=()=>role()==='chef'||role()==='bureau';
function stockOf(){if(!NET||NET.id==='__vide')return null;if(!NET.stock)NET.stock={zones:[],lots:[],livs:[],moves:[],takes:[]};const s=NET.stock;s.zones=s.zones||[];s.lots=s.lots||[];s.livs=s.livs||[];s.moves=s.moves||[];s.takes=s.takes||[];return s;}
let stockSaveT=null;
function saveStock(){if(!NET||NET.id==='__vide')return;clearTimeout(stockSaveT);stockSaveT=setTimeout(async()=>{try{SITES[state.siteId]=NET;const h=await kv.get('trace:handoff:'+state.siteId);if(h){h.stock=NET.stock;await kv.set('trace:handoff:'+state.siteId,h);}}catch(e){}try{state.ownSiteWrite=Date.now();const okk=await sync.saveSite(NET);if(okk)setCloudBadge('stock enregistré');}catch(e){console.warn(e);}},1200);}
function stockZoneById(id){const s=stockOf();return s&&s.zones.find(z=>z.id===id);}
const stkFmtQ=n=>Number(n||0).toLocaleString('fr-FR');
// pièce d'une soudure (la pièce amont) → besoin stock {kind,dn,dn2,angle,casing}
function stockPieceOf(l,c,j){const e=l.cond[c].els[j.idx];if(!e)return null;const k=e.kind;
  if(k==='pipe'&&!e.manchette&&!e.nue)return {kind:'pipe',dn:+e.dn||+l.dn,casing:e.casing,label:'Barre DN'+(e.dn||l.dn)};
  if(k==='bend')return {kind:'bend',dn:+e.dn||+l.dn,angle:Math.abs(+e.angle||90),casing:e.casing,label:'Coude '+Math.round(Math.abs(e.angle||90))+'° DN'+(e.dn||l.dn)};
  if(k==='tee')return {kind:'tee',dn:+e.dn||+l.dn,dn2:+e.dnb||undefined,casing:e.casing,label:'Té DN'+(e.dn||l.dn)+(e.dnb?'/'+e.dnb:'')};
  if(k==='reducer')return {kind:'reducer',dn:+e.dn||+l.dn,dn2:+e.dn2||undefined,casing:e.casing,label:'Réduction'};
  return null;}
// zones qui ont ENCORE la pièce (ou le manchon) demandée, triées par distance au point (wx,wy)
function stockZonesFor(need,wx,wy){const s=stockOf();if(!s)return [];const mk=matchKey(need);
  return s.zones.filter(z=>z.status==='ok').map(z=>{const agg=zoneAgg(s,z.id);
    let reste=0;agg.forEach(a=>{if(matchKey(a)===mk)reste+=a.reste;else if((need.kind==='sleeve')&&(a.kind==='sleeve'||a.kind==='sleeveEnd')&&a.gaine&&need.casing&&Math.abs(a.gaine-need.casing)<=6)reste+=a.reste;
      else if(need.kind==='pu'&&isPU(a.kind)&&matchKey(a)==='pu:')reste+=a.reste;});
    return {z,reste,d:(isFinite(wx)&&isFinite(z.x))?Math.hypot(z.x-wx,z.y-wy):1e9};}).filter(o=>o.reste>0).sort((a,b)=>a.d-b.d);}
function stockTakeKeyFor(need){const s=stockOf();return matchKey(need);}
// enregistre un prélèvement (1 pièce) dans une zone — TRAÇABILITÉ CAMION : imputé au plus ancien camion encore en stock ici pour cette référence (FIFO)
function stockTake(zoneId,need,weldId,lineId,cond2,qty){const s=stockOf();if(!s)return null;const key=matchKey(need);
  let liv=null;{const lots=s.lots.filter(l2=>l2.zone===zoneId&&!l2.pend&&matchKey(l2)===key);
    const consumed=s.takes.filter(t=>t.zone===zoneId&&t.key===key).reduce((a,t)=>a+(t.qty||1),0);
    let acc=0;for(const l2 of lots){acc+=l2.qty;if(consumed<acc){liv=l2.liv||null;break;}}}
  const take={at:new Date().toISOString(),by:(me()||{}).name||state.userId,weldId,line:lineId,cond:cond2,zone:zoneId,key,label:need.label||stockLabel(need),qty:qty||1,liv};
  s.takes.push(take);saveStock();return take;}
// détail par CAMION et par RÉFÉRENCE dans une zone (même FIFO) — pour la fiche de livraison
function livBreakdown2(s,zoneId){const per={};const keys=new Set(s.lots.filter(l2=>l2.zone===zoneId).map(l2=>matchKey(l2)));
  keys.forEach(key=>{const lots=s.lots.filter(l2=>l2.zone===zoneId&&matchKey(l2)===key);
    let consumed=s.takes.filter(t=>t.zone===zoneId&&t.key===key).reduce((a,t)=>a+(t.qty||1),0);
    lots.forEach(l2=>{const lv=l2.liv||'—';per[lv]=per[lv]||{};const cur=per[lv][key]=per[lv][key]||{label:l2.label,rest:0,pend:0};
      if(l2.pend){cur.pend+=l2.qty;return;}
      const eat=Math.min(consumed,l2.qty);consumed-=eat;cur.rest+=l2.qty-eat;});});
  return per;}
// fiche DÉTAILLÉE d'une livraison : lignes du BL, reçu/écarts, restant par zone et par référence, dates et reports (Ethan 25/08 : « XX pcs ne suffit pas »)
function openStockLivDetail(livId){const s=stockOf();const liv=s.livs.find(v=>v.id===livId);if(!liv)return;
  const dFR=d=>d?new Date(d+'T12:00:00').toLocaleDateString('fr-FR'):'—';
  const rows=(liv.prevu||[]).map(p=>{const ec=(liv.ecarts||[]).find(e2=>e2.label===p.label);
    return `<tr${ec?' style="background:#fdecec"':''}><td>${esc(p.label)}</td><td>${p.qty}</td><td>${liv.status==='prevu'?'<span class="dim">attendu</span>':(ec?'<b>'+ec.recu+'</b>':p.qty)}</td>${liv.status!=='prevu'?`<td>${ec?'<b style="color:#8a1f1f">'+(ec.recu-ec.prevu>0?'+':'')+(ec.recu-ec.prevu)+'</b>':'✓'}</td>`:'<td></td>'}</tr>`;}).join('');
  const zones=[...new Set(s.lots.filter(l2=>l2.liv===livId).map(l2=>l2.zone))];
  const perZone=zones.map(zid=>{const bd=livBreakdown2(s,zid)[livId];if(!bd)return '';
    const items=Object.values(bd).filter(o=>o.rest>0||o.pend>0);if(!items.length)return '';
    return `<div style="margin-top:4px"><b style="font-size:12px">${esc((stockZoneById(zid)||{}).name||zid)}</b><table class="rc" style="margin-top:2px">${items.map(o=>`<tr><td>${esc(o.label)}</td><td>${o.rest?'<b>'+stkFmtQ(o.rest)+'</b> restantes':''}${o.pend?' <span class="dim">'+stkFmtQ(o.pend)+' attendues</span>':''}</td></tr>`).join('')}</table></div>`;}).join('');
  openModal(`<h3 style="margin-top:0">${esc(liv.label)}${liv.bl?' <span class="dim" style="font-size:12px">· BL '+esc(liv.bl)+'</span>':''}</h3>
   <div class="kv" style="font-size:12px"><span>${liv.status==='prevu'?'attendu le <b>'+esc(dFR(liv.date))+'</b>':'reçu le <b>'+esc(liv.recuAt?new Date(liv.recuAt).toLocaleDateString('fr-FR'):dFR(liv.date))+'</b>'}</span><span>par ${esc(liv.by||'')}</span>${(liv.ecarts||[]).length?`<span style="background:#fdecec"><b style="color:#d03b3b">${liv.ecarts.length} écart(s)</b></span>`:''}</div>
   ${(liv.dateHist||[]).length?`<div class="warnbox" style="font-size:11.5px;margin:4px 0">Reports : ${liv.dateHist.map(h=>esc(dFR(h.from))+' → <b>'+esc(dFR(h.to))+'</b>'+(h.why?' ('+esc(h.why)+')':'')).join(' · ')}</div>`:''}
   <label class="f" style="margin-top:6px">Contenu du camion</label>
   <div style="overflow:auto;max-height:32vh"><table class="rc"><tr><th>Référence</th><th>BL</th><th>reçu</th><th></th></tr>${rows}</table></div>
   ${perZone?`<label class="f" style="margin-top:8px">Ce qu'il en reste, zone par zone</label>${perZone}`:'<p class="hint">Plus rien en stock de ce camion (tout posé ou transféré).</p>'}
   <div class="actions" style="margin-top:8px;display:flex;gap:6px;flex-wrap:wrap">${liv.status==='prevu'&&stockCanEdit()?`<button class="btn primary" id="stklv-un" style="flex:1">📦 Camion arrivé — pointer</button>`:''}${liv.status!=='prevu'?`<button class="btn" id="stklv-cr" style="flex:1">📄 Compte-rendu</button>`:''}<button class="btn block" data-close style="flex:1">Fermer</button></div>`);
  const un=$('#stklv-un');if(un)un.onclick=()=>{closeModal();openStockUnload(livId);};
  const cr=$('#stklv-cr');if(cr)cr.onclick=()=>{closeModal();openStockCR(livId);};}
// carte d'ensemble des stockages : pan/zoom continu, ortho grisée si géoréférencé, zones tapables (même moteur que la vue hydro)
function stockZonesSVG(k){const s=stockOf();if(!s)return '';let out='';
  s.zones.forEach(z=>{const agg=zoneAgg(s,z.id);const reste=agg.reduce((t,a)=>t+Math.max(0,a.reste),0);const pend=agg.reduce((t,a)=>t+(a.pend||0),0);const st4=zoneStatusOf(s,z);
    const col=st4==='ok'?'#0ca30c':'#c9a227';const fill=st4==='ok'?'rgba(12,163,12,.20)':'rgba(201,162,39,.16)';
    out+=`<g transform="translate(${z.x} ${z.y}) rotate(${z.rot||0})" data-stkmz="${z.id}" style="cursor:pointer"><rect x="${-z.w/2}" y="${-z.h/2}" width="${z.w}" height="${z.h}" rx="${Math.min(1,z.h/6)}" fill="${fill}" stroke="${col}" stroke-width="${2.2/k}" ${st4==='ok'?'':`stroke-dasharray="${6/k} ${4/k}"`}/></g>`;
    const lab=`${z.name} · ${st4==='ok'?stkFmtQ(reste)+' pcs':stkFmtQ(pend)+' att.'}`;const wl=lab.length*6.2+14;
    out+=`<g transform="translate(${z.x} ${z.y-z.h/2}) scale(${1/k})" style="pointer-events:none"><rect x="${-wl/2}" y="-24" width="${wl}" height="17" rx="8.5" fill="${col}" opacity=".92"/><text y="-11.5" font-size="10.5" font-weight="800" text-anchor="middle" fill="#fff" font-family="system-ui,sans-serif">${esc(lab)}</text></g>`;});
  return out;}
function initStockMap(){const box=$('#stkMap');if(!box)return;const sh=sheet();const ppm=sh.ppm||1;const geoH=siteGeo();
  let axes='';Object.values(state.lines).forEach(l=>{const cd=l.cond&&(l.cond.A||l.cond.R);((cd&&cd.els)||[]).forEach(e=>{const pl=e.axis&&e.axis[0];if(pl&&pl.length>1)axes+=`<path d="${pathD(pl)}" stroke="${geoH?'#8b8577':'#b9b5a8'}" stroke-width="${Math.max(.25*ppm,2)}" fill="none" stroke-linejoin="round" stroke-linecap="round" opacity=".85"/>`;});});
  box.innerHTML=`<svg style="position:absolute;inset:0;width:100%;height:100%"><defs><filter id="stkGrayV">${HY_GRAY}</filter></defs><g id="stkWorld"><g id="stkBgT">${geoH?'':hydroBgSVG(sh)}</g><g>${axes}</g><g id="stkOv"></g></g></svg><div class="hmCtl hyCtl"><button data-a="+" title="Zoomer">+</button><button data-a="-" title="Dézoomer">−</button><button data-a="fit" title="Tout le réseau">⌖</button></div><div class="hmLegend">zoome (molette / pincer / double-tap) — touche une zone pour sa fiche</div>${geoH?'<div class="hmCredit">© IGN — Géoplateforme</div>':''}`;
  const world=box.querySelector('#stkWorld'),ov=box.querySelector('#stkOv'),bgT=box.querySelector('#stkBgT');
  const V=state.stockMapView&&isFinite(state.stockMapView.k)?state.stockMapView:(state.stockMapView={k:0,tx:0,ty:0});
  const updTiles=()=>{if(!geoH)return;const w=box.clientWidth||360,hh=box.clientHeight||340;
    const b2=[(-V.tx)/V.k,(-V.ty)/V.k,(w-V.tx)/V.k,(hh-V.ty)/V.k];const T=tilesFor(geoH,b2,V.k*ppm,19,90);if(!T){bgT.innerHTML='';bgT.dataset.key='';return;}
    const xs=T.tiles.map(t=>t.x),ys=T.tiles.map(t=>t.y);const mx=Math.min(...xs),my=Math.min(...ys);
    const ox=mx*256,oy=my*256;const [a,b,c,d,e,f]=T.matrix;const mat=`matrix(${[a,b,c,d,e+a*ox+c*oy,f+b*ox+d*oy].map(x=>(+x).toPrecision(10)).join(' ')})`;
    const key=`o:${T.z}:${mx}-${Math.max(...xs)}:${my}-${Math.max(...ys)}`;
    if(bgT.dataset.key!==key){bgT.dataset.key=key;bgT.innerHTML=`<g transform="${mat}" filter="url(#stkGrayV)">${T.tiles.map(t=>`<image href="${ignTileURL('ortho',T.z,t.x,t.y)}" x="${(t.x-mx)*256}" y="${(t.y-my)*256}" width="256.5" height="256.5"/>`).join('')}</g>`;}
    else{[...bgT.children].forEach(c2=>c2.setAttribute('transform',mat));}};
  let raf3=null;const apply=()=>{world.setAttribute('transform',`translate(${V.tx} ${V.ty}) scale(${V.k})`);if(raf3)return;raf3=requestAnimationFrame(()=>{raf3=null;ov.innerHTML=stockZonesSVG(V.k);updTiles();});};
  const fit=()=>{const s=stockOf();let bb=sheetBBox(sh);
    if(s&&s.zones.length){let x0=1e12,y0=1e12,x1=-1e12,y1=-1e12;s.zones.forEach(z=>{x0=Math.min(x0,z.x-z.w);y0=Math.min(y0,z.y-z.h);x1=Math.max(x1,z.x+z.w);y1=Math.max(y1,z.y+z.h);});
      bb=[Math.min(bb[0],x0),Math.min(bb[1],y0),Math.max(bb[2],x1),Math.max(bb[3],y1)];} // les zones comptent dans le cadrage (base vie souvent hors emprise réseau)
    const cw=box.clientWidth||360,ch=box.clientHeight||340;const m=Math.max(20,(bb[2]-bb[0])*.06);const x0=bb[0]-m,y0=bb[1]-m,x1=bb[2]+m,y1=bb[3]+m;
    V.k=Math.min(cw/(x1-x0),ch/(y1-y0))*.97;V.tx=(cw-(x1-x0)*V.k)/2-x0*V.k;V.ty=(ch-(y1-y0)*V.k)/2-y0*V.k;apply();};
  const zoomAt=(f,mx,my)=>{const nk=Math.min(60/ppm,Math.max(0.02/ppm,V.k*f));const r=nk/V.k;V.tx=mx-(mx-V.tx)*r;V.ty=my-(my-V.ty)*r;V.k=nk;apply();};
  box.addEventListener('wheel',e=>{e.preventDefault();const r=box.getBoundingClientRect();zoomAt(Math.exp(-e.deltaY*.0015),e.clientX-r.left,e.clientY-r.top);},{passive:false});
  box.addEventListener('dblclick',e=>{if(e.target.closest('.hyCtl'))return;const r=box.getBoundingClientRect();zoomAt(2,e.clientX-r.left,e.clientY-r.top);});
  box.querySelector('.hyCtl').addEventListener('click',e=>{const a=e.target.dataset.a;if(!a)return;e.stopPropagation();if(a==='fit'){fit();return;}zoomAt(a==='+'?1.6:1/1.6,box.clientWidth/2,box.clientHeight/2);});
  const ptrs3=new Map();let last3=null,pd3=null,down3=null;
  box.addEventListener('pointerdown',e=>{if(e.target.closest('.hyCtl'))return;try{box.setPointerCapture(e.pointerId);}catch(e2){}ptrs3.set(e.pointerId,{x:e.clientX,y:e.clientY});if(ptrs3.size===1){last3={x:e.clientX,y:e.clientY};down3={x:e.clientX,y:e.clientY,tgt:e.target.closest('[data-stkmz]')};}});
  box.addEventListener('pointermove',e=>{if(!ptrs3.has(e.pointerId))return;ptrs3.set(e.pointerId,{x:e.clientX,y:e.clientY});
    if(ptrs3.size===1&&last3){V.tx+=e.clientX-last3.x;V.ty+=e.clientY-last3.y;last3={x:e.clientX,y:e.clientY};apply();}
    else if(ptrs3.size===2){const [a,b]=[...ptrs3.values()];const d=Math.hypot(a.x-b.x,a.y-b.y);const r=box.getBoundingClientRect();if(pd3)zoomAt(d/pd3,(a.x+b.x)/2-r.left,(a.y+b.y)/2-r.top);pd3=d;}});
  const up3=e=>{if(ptrs3.has(e.pointerId)&&down3&&down3.tgt&&Math.hypot(e.clientX-down3.x,e.clientY-down3.y)<7)openStockZoneModal(down3.tgt.dataset.stkmz); // tap zone → fiche
    ptrs3.delete(e.pointerId);if(ptrs3.size<2)pd3=null;if(!ptrs3.size){last3=null;down3=null;}};
  box.addEventListener('pointerup',up3);box.addEventListener('pointercancel',up3);
  if(!V.k)fit();else apply();}
// reste par CAMION dans une zone (FIFO par référence) — « d'où viennent les pièces encore posées là »
function livBreakdown(s,zoneId){const per={};const keys=new Set(s.lots.filter(l2=>l2.zone===zoneId).map(l2=>matchKey(l2)));
  keys.forEach(key=>{const lots=s.lots.filter(l2=>l2.zone===zoneId&&matchKey(l2)===key);
    let consumed=s.takes.filter(t=>t.zone===zoneId&&t.key===key).reduce((a,t)=>a+(t.qty||1),0);
    lots.forEach(l2=>{const lv=l2.liv||'—';per[lv]=per[lv]||{rest:0,pend:0};
      if(l2.pend){per[lv].pend+=l2.qty;return;}
      const eat=Math.min(consumed,l2.qty);consumed-=eat;per[lv].rest+=l2.qty-eat;});});
  return per;}
// reste par LOT d'une zone (FIFO par référence, comme livBreakdown — mais lot par lot, pour la provenance détaillée)
function zoneLotsDetail(s,zoneId){const out=[];const keys=new Set(s.lots.filter(l2=>l2.zone===zoneId).map(l2=>matchKey(l2)));
  keys.forEach(key=>{const lots=s.lots.filter(l2=>l2.zone===zoneId&&matchKey(l2)===key);
    let consumed=s.takes.filter(t=>t.zone===zoneId&&t.key===key).reduce((a,t)=>a+(t.qty||1),0);
    lots.forEach(l2=>{if(l2.pend){out.push({lot:l2,rest:0,pend:l2.qty});return;}
      const eat=Math.min(consumed,l2.qty);consumed-=eat;out.push({lot:l2,rest:l2.qty-eat,pend:0});});});
  return out;}
// parcours d'un lot à rebours : de sa zone actuelle jusqu'à la zone de DÉCHARGEMENT du camion, via les transferts enregistrés
// (les moves récents portent key+livs ; les anciens sont rapprochés par libellé). Renvoie {start, moves[] chronologiques}.
function lotTrail(s,lot){const zid0=lot.zone;let zid=zid0,before=Infinity;const used=new Set();const chain=[];
  for(let g=0;g<12;g++){const mv=(s.moves||[]).filter(m=>!m.zoneMove&&!m.pre&&m.to===zid&&m.from&&!used.has(m)&&new Date(m.at).getTime()<before&&(m.key?m.key===matchKey(lot):m.label===lot.label)&&(!m.livs||!m.livs.length||!lot.liv||m.livs.includes(lot.liv)))
      .sort((a,b)=>new Date(b.at)-new Date(a.at))[0];
    if(!mv)break;used.add(mv);chain.unshift(mv);zid=mv.from;before=new Date(mv.at).getTime();}
  return {start:zid,moves:chain};}
function stockDropTakes(weldId){const s=stockOf();if(!s)return;const n0=s.takes.length;s.takes=s.takes.filter(t=>t.weldId!==weldId);if(s.takes.length!==n0)saveStock();}
/* ----- pose / édition d'une zone sur le plan ----- */
function startStockPose(opt){state.stockPose=opt||{};state.tab='plan';closeSheet();renderAll();updateStockBar('Touche le plan à l\'endroit du déchargement : la zone (13 × 3 m) se pose là, puis ajuste-la (glisser · poignées · ↻).');}
function endStockPose(){state.stockPose=null;state.stockSel=null;updateStockBar(null);state.tab='stock';renderAll();}
function updateStockBar(msg){const bar=$('#stockBar');if(!bar)return;const on=!!(state.stockPose||state.stockSel);bar.style.display=on?'flex':'none';if(on)$('#stkMsg').textContent=msg||($('#stkMsg').textContent||'');}
function stockTap(wx,wy){const s=stockOf();if(!s)return;const P=state.stockPose||{};
  const z={id:'Z'+(1+s.zones.reduce((m,z2)=>Math.max(m,+String(z2.id).replace(/\D/g,'')||0),0)),name:P.name||('Zone '+(s.zones.length+1)),x:+wx.toFixed(2),y:+wy.toFixed(2),w:13,h:3,rot:0,status:P.status||'prevu',photos:[],liv:P.liv||null,at:new Date().toISOString(),by:(me()||{}).name||state.userId};
  s.zones.push(z);(P.lots||[]).forEach(l=>{l.zone=z.id;s.lots.push(l);});if(P.moveLots)P.moveLots(z.id);
  state.stockPose=null;state.stockSel=z.id;saveStock();renderPlan();updateStockBar('Zone « '+z.name+' » posée — glisse-la, étire-la (poignées), tourne (↻), puis Terminer.');}
function renderStockOverlay(){if(!stockG)return;const s=NET&&NET.stock;if(!s||!s.zones||!s.zones.length||!state.show.fond&&false){stockG.innerHTML='';if(!s||!s.zones.length)return;}
  const k=state.view.k;let out='';
  s.zones.forEach(z=>{const sel=state.stockSel===z.id;const agg=zoneAgg(s,z.id);const reste=agg.reduce((t,a)=>t+Math.max(0,a.reste),0);const pend=agg.reduce((t,a)=>t+(a.pend||0),0);
    const st4=zoneStatusOf(s,z);const col=st4==='ok'?'#0ca30c':'#c9a227';const fill=st4==='ok'?'rgba(12,163,12,.18)':'rgba(201,162,39,.14)';
    out+=`<g transform="translate(${z.x} ${z.y}) rotate(${z.rot||0})">
      <rect x="${-z.w/2}" y="${-z.h/2}" width="${z.w}" height="${z.h}" rx="${Math.min(1,z.h/6)}" fill="${fill}" stroke="${col}" stroke-width="${2.2/k}" ${st4==='ok'?'':`stroke-dasharray="${6/k} ${4/k}"`} data-stkz="${z.id}" style="cursor:pointer"/>
      ${sel?`<rect x="${-z.w/2}" y="${-z.h/2}" width="${z.w}" height="${z.h}" fill="none" stroke="#0b0b0b" stroke-width="${1.2/k}" stroke-dasharray="${3/k} ${3/k}" style="pointer-events:none"/>
        <circle cx="${z.w/2}" cy="0" r="${7/k}" fill="#fff" stroke="#0b0b0b" stroke-width="${2/k}" data-stkh="w" data-stkzid="${z.id}" style="cursor:ew-resize"/>
        <circle cx="0" cy="${z.h/2}" r="${7/k}" fill="#fff" stroke="#0b0b0b" stroke-width="${2/k}" data-stkh="h" data-stkzid="${z.id}" style="cursor:ns-resize"/>
        <circle cx="0" cy="${-z.h/2-14/k}" r="${7/k}" fill="#eb6834" stroke="#fff" stroke-width="${2/k}" data-stkh="rot" data-stkzid="${z.id}" style="cursor:grab"/>`:''}
    </g>`;
    const lab=`${z.name} · ${st4==='ok'?stkFmtQ(reste)+' pcs'+(pend?' (+'+stkFmtQ(pend)+' attendues)':''):'prévu · '+stkFmtQ(pend)+' pcs attendues'}`;const wl=lab.length*6.4+16;
    out+=`<g transform="translate(${z.x} ${z.y - (Math.abs(z.h/2*Math.cos((z.rot||0)*Math.PI/180))+Math.abs(z.w/2*Math.sin((z.rot||0)*Math.PI/180)))}) scale(${1/k})" style="pointer-events:none"><rect x="${-wl/2}" y="-26" width="${wl}" height="17" rx="8.5" fill="${col}" opacity=".92"/><text y="-13.5" font-size="10" font-weight="800" text-anchor="middle" fill="#fff" font-family="system-ui,sans-serif">${esc(lab)}</text></g>`;});
  stockG.innerHTML=out;}
/* ----- onglet Stock ----- */
const dlCSVFile=(name,rows)=>{const csv='﻿'+rows.map(r=>r.map(v=>{const s2=String(v??'');return /[;"\n]/.test(s2)?'"'+s2.replace(/"/g,'""')+'"':s2;}).join(';')).join('\r\n');const a=document.createElement('a');a.href=URL.createObjectURL(new Blob([csv],{type:'text/csv;charset=utf-8'}));a.download=name;document.body.appendChild(a);a.click();setTimeout(()=>{URL.revokeObjectURL(a.href);a.remove();},500);};
// besoin du calepinage par clé de rapprochement (barres = toute barre non manchette ; manchons ≈ 1 par soudure, paires de manchettes nues = 1)
function stockNeeds(){const need={};const lab={};Object.values(state.lines).forEach(l=>{['A','R'].forEach(c=>{const cd=l.cond[c];if(!cd)return;
  cd.els.forEach(e=>{let o=null;if(e.kind==='pipe'&&!e.manchette&&!e.nue)o={kind:'pipe',dn:+e.dn||+l.dn};
    else if(e.kind==='bend')o={kind:'bend',dn:+e.dn||+l.dn,angle:Math.abs(+e.angle||90)};
    else if(e.kind==='tee')o={kind:'tee',dn:+e.dn||+l.dn,dn2:+e.dnb||undefined};
    else if(e.kind==='reducer')o={kind:'reducer',dn:+e.dn||+l.dn,dn2:+e.dn2||undefined};
    if(o){const k=matchKey(o);need[k]=(need[k]||0)+1;lab[k]=stockLabel({...o,len:12});}});
  const seenSl=new Set();cd.joints.forEach(j=>{if(j.sleeveWith&&seenSl.has(j.weldId))return;if(j.sleeveWith)seenSl.add(j.sleeveWith);const e=cd.els[j.idx];const dn=+((e&&e.dn)||l.dn);const o={kind:'sleeve',dn,gaine:(e&&e.casing)||gaineMM(dn)||undefined};const k=matchKey(o);need[k]=(need[k]||0)+1;lab[k]=stockLabel(o);
    const kp='pu:'+dn;need[kp]=(need[kp]||0)+1;lab[kp]='Mousse PU (A+B) DN'+dn;});});});return {need,lab};} // 1 dose de mousse par manchon, au DN du manchon
// ce qui est DÉJÀ POSÉ (soudé ou plus) par référence : la moitié « demande » du récap besoin / livré / reste
function stockPosed(rootId){const done={};const inSel=l=>{if(!rootId)return true;let L2=l;for(let g=0;g<8&&L2;g++){if(L2.id===rootId)return true;L2=L2.parent&&state.lines[L2.parent]?state.lines[L2.parent]:null;}return false;};
  Object.values(state.lines).filter(inSel).forEach(l=>{['A','R'].forEach(c=>{const cd=l.cond[c];if(!cd)return;
    cd.joints.forEach(j=>{if(j.status==='a_souder'||j.status==='a_reprendre')return;
      const pc=stockPieceOf(l,c,j);if(pc){const k=matchKey(pc);done[k]=(done[k]||0)+1;}
      if(j.status==='manchonnee'){const e=cd.els[j.idx];const dn=+((e&&e.dn)||l.dn);const k2=matchKey({kind:'sleeve',dn});done[k2]=(done[k2]||0)+1;const kp='pu:'+dn;done[kp]=(done[kp]||0)+1;}});});});
  return done;}
// besoin limité à un tronçon (ligne principale + antennes) — même logique de sélection
function stockNeedsFor(rootId){if(!rootId)return stockNeeds();
  const keep=new Set();Object.values(state.lines).forEach(l=>{let L2=l;for(let g=0;g<8&&L2;g++){if(L2.id===rootId){keep.add(l.id);break;}L2=L2.parent&&state.lines[L2.parent]?state.lines[L2.parent]:null;}});
  const all=state.lines;const sub={};keep.forEach(id=>sub[id]=all[id]);const bak=state.lines;state.lines=sub;const r=stockNeeds();state.lines=bak;return r;}
// RÉCAP besoin / posé / livré / attendu → « du trop ou pas assez » (remplace la vue matière, retour Ethan 25/08 :
// avoir tout le réseau en image n'aide pas ; ce qu'il faut c'est le solde par référence, filtrable par tronçon)
function stockBalanceHTML(rootId,mains2){const s=stockOf();if(!s)return '';
  const {need,lab}=stockNeedsFor(rootId);const posed=stockPosed(rootId);
  const stock={},att={};globalAgg(s).forEach(a=>{const k=matchKey(a);stock[k]=(stock[k]||0)+Math.max(0,a.reste||0);att[k]=(att[k]||0)+(a.pend||0);});
  const keys=[...new Set([...Object.keys(need),...Object.keys(stock),...Object.keys(att)])];
  const rows=keys.map(k=>{const be=need[k]||0,po=Math.min(be||1e9,posed[k]||0),st=stock[k]||0,at=att[k]||0;const rp=Math.max(0,be-po);const ec=st+at-rp;
    return {k,label:lab[k]||(globalAgg(s).find(a=>matchKey(a)===k)||{}).label||k,be,po,rp,st,at,ec};})
   .filter(r=>r.be||r.st||r.at).sort((a,b)=>(a.ec-b.ec)||String(a.label).localeCompare(String(b.label)));
  const manque=rows.filter(r=>r.ec<0),trop=rows.filter(r=>r.ec>0&&r.be>0);
  const line=r=>`<tr${r.ec<0?' style="background:#fdecec"':r.ec>0&&r.be>0?' style="background:#fff8e6"':''}><td>${esc(r.label)}</td><td>${r.be||'—'}</td><td>${r.po||'—'}</td><td><b>${r.rp||0}</b></td><td>${r.st||'—'}</td><td>${r.at?'<span class="dim">'+r.at+'</span>':'—'}</td><td><b style="color:${r.ec<0?'#d03b3b':r.ec>0&&r.be>0?'#8a6d1f':'#0ca30c'}">${r.ec>0?'+':''}${r.ec}</b></td></tr>`;
  const UI2=state.stockUI||(state.stockUI={});
  return `<details class="card" data-stkui="bal" ${(UI2.bal===undefined?false:UI2.bal)?'open':''}><summary style="cursor:pointer;font-size:13.5px"><b>Besoin / livré / reste à poser</b> <span class="dim" style="font-size:12px">${manque.length?'⚠ il manque '+manque.length+' référence'+(manque.length>1?'s':''):'✓ couvert'}${trop.length?' · surplus sur '+trop.length:''}</span></summary>
   <div class="row" style="display:flex;margin:6px 0"><select class="f" id="stk-matline" style="font-size:12px;padding:4px 8px;margin-left:auto"><option value="">Tout le réseau</option>${mains2.map(l2=>`<option value="${l2.id}" ${rootId===l2.id?'selected':''}>${esc(l2.name)} + antennes</option>`).join('')}</select></div>
   ${manque.length?`<div class="err" style="margin:0 0 6px">⚠ <b>Il manque</b> : ${manque.slice(0,5).map(r=>esc(r.label)+' ('+(-r.ec)+')').join(' · ')}${manque.length>5?' …':''}</div>`:'<div class="okbox" style="margin:0 0 6px">✓ Le stock (+ attendu) couvre tout ce qu\'il reste à poser.</div>'}
   ${trop.length?`<div class="warnbox" style="margin:0 0 6px">Surplus prévisible : ${trop.slice(0,5).map(r=>esc(r.label)+' (+'+r.ec+')').join(' · ')}${trop.length>5?' …':''}</div>`:''}
   <div style="overflow:auto"><table class="rc" style="margin:0"><tr><th>Référence</th><th title="tout ce que le calepinage demande">besoin</th><th title="déjà soudé / manchonné">posé</th><th title="besoin − posé">reste à poser</th><th title="en stock, toutes zones">stock</th><th title="camions annoncés, pas encore pointés">attendu</th><th title="(stock + attendu) − reste à poser">solde</th></tr>${rows.map(line).join('')}</table></div>
   <div class="row" style="display:flex;gap:6px;margin-top:6px"><button class="btn sm" id="stk-csvbal" style="flex:1">⬇ CSV besoin / livré / reste</button></div></details>`;}
// (ancienne vue « matière » — gardée pour référence, plus affichée)
function stockMatSVG(rootId){const s=stockOf();if(!s)return '';const rem=remainByMatch(s);let nb=null;
  // zoom par tronçon : la ligne principale choisie + toutes ses antennes (chaîne des parents) — la vue globale ne dit rien sur un chantier de 30 camions
  const inSel=l=>{if(!rootId)return true;let L2=l;for(let g=0;g<8&&L2;g++){if(L2.id===rootId)return true;L2=L2.parent&&state.lines[L2.parent]?state.lines[L2.parent]:null;}return false;};
  const SEL=Object.values(state.lines).filter(inSel);
  SEL.forEach(l=>{(l.pts||[]).forEach(p=>{if(!nb)nb=[p.x,p.y,p.x,p.y];else{nb[0]=Math.min(nb[0],p.x);nb[1]=Math.min(nb[1],p.y);nb[2]=Math.max(nb[2],p.x);nb[3]=Math.max(nb[3],p.y);}});});
  if(!nb)return '<div class="muted">Aucune ligne.</div>';const pad=Math.max(8,(nb[2]-nb[0])*.05);const vb=[nb[0]-pad,nb[1]-pad,nb[2]-nb[0]+2*pad,nb[3]-nb[1]+2*pad];const sw=Math.max(vb[2],vb[3])/220;
  const lines=SEL.map(l=>{const cd=l.cond.A||l.cond.R;if(!cd)return null;const els=cd.els,joints=cd.joints;
    const posed=els.map((e,i)=>{const jA=joints.find(j=>j.idx===i-1),jB=joints.find(j=>j.idx===i);return !!((jA&&jA.status!=='a_souder')||(jB&&jB.status!=='a_souder'));});
    const pct=posed.filter(Boolean).length/(els.length||1);return {l,els,posed,pct};}).filter(Boolean).sort((a,b)=>b.pct-a.pct);
  let mlOk=0,mlNo=0;let sPo='',sOk='',sNo='';
  lines.forEach(({l,els,posed})=>{els.forEach((e,i)=>{const ax=(e.axis&&e.axis[0])||[[e.from[0]||e.from.x,e.from[1]||e.from.y],[e.to[0]||e.to.x,e.to[1]||e.to.y]];
    const pts=ax.map(p=>Array.isArray(p)?p:[p.x,p.y]);const d='M '+pts.map(p=>p[0].toFixed(1)+' '+p[1].toFixed(1)).join(' L ');
    if(posed[i]){sPo+=`<path d="${d}"/>`;return;}
    let o=null;if(e.kind==='pipe'&&!e.manchette&&!e.nue)o={kind:'pipe',dn:+e.dn||+l.dn};else if(e.kind==='bend')o={kind:'bend',dn:+e.dn||+l.dn,angle:Math.abs(+e.angle||90)};else if(e.kind==='tee')o={kind:'tee',dn:+e.dn||+l.dn,dn2:+e.dnb||undefined};else if(e.kind==='reducer')o={kind:'reducer',dn:+e.dn||+l.dn,dn2:+e.dn2||undefined};
    if(!o){sOk+=`<path d="${d}"/>`;return;} // manchettes, bouts… suivent le mouvement sans consommer
    const k=matchKey(o);if((rem[k]||0)>0){rem[k]--;sOk+=`<path d="${d}"/>`;mlOk+=e.len||0;}else{sNo+=`<path d="${d}"/>`;mlNo+=e.len||0;}});});
  return `<svg viewBox="${vb.join(' ')}" style="width:100%;max-height:280px;background:#f4f3ee;border-radius:10px">
    <g fill="none" stroke="#b6b2a6" stroke-width="${sw*2.2}" stroke-linecap="round">${sPo}</g>
    <g fill="none" stroke="#0ca30c" stroke-width="${sw*2.6}" stroke-linecap="round">${sOk}</g>
    <g fill="none" stroke="#e0a13c" stroke-width="${sw}" stroke-linecap="round" stroke-dasharray="${sw*4} ${sw*3}">${sNo}</g></svg>
   <div class="kv" style="margin-top:6px"><span><i style="display:inline-block;width:14px;height:4px;background:#b6b2a6;border-radius:2px;vertical-align:middle"></i> posé</span><span><i style="display:inline-block;width:14px;height:4px;background:#0ca30c;border-radius:2px;vertical-align:middle"></i> posable avec le stock : <b>${fmt(mlOk)} ml</b></span><span><i style="display:inline-block;width:14px;height:4px;background:#e0a13c;border-radius:2px;vertical-align:middle"></i> au-delà du stock : ${fmt(mlNo)} ml</span></div>`;}
function renderStock(){const el=$('#stock');const s=stockOf();
  if(!s){el.innerHTML='<h2 class="vt">Stock — pièces pré-isolées</h2><div class="card muted">Aucun chantier.</div>';return;}
  const canE=stockCanEdit();
  const UI=state.stockUI||(state.stockUI={});const UIo=(k,def)=>((UI[k]===undefined?def:UI[k])?'open':''); // chaque bloc se replie d'une flèche et l'appli s'en souvient (Ethan 25/08 : « ça prend de la place »)
  const livName=id=>{const v=s.livs.find(x=>x.id===id);return v?v.label+(v.bl?' · '+v.bl:''):'—';};
  const dFR=d=>d?new Date(d+'T12:00:00').toLocaleDateString('fr-FR'):'';
  const dRel=d=>{if(!d)return '';const j=Math.round((new Date(d+'T12:00:00')-new Date(isoD(new Date())+'T12:00:00'))/86400000);return j===0?"aujourd'hui":j===1?'demain':j>1?'dans '+j+' j':j===-1?'hier':'il y a '+(-j)+' j (en retard)';};
  const nPrevu=s.livs.filter(v=>v.status==='prevu').length;const nEcarts=s.livs.reduce((t,v)=>t+((v.ecarts||[]).length?1:0),0);
  // ----- registre des livraisons / BL (même les « fictifs » saisis au catalogue) : la trace de chaque camion -----
  const livRow=v=>{const zs=[...new Set(s.lots.filter(l2=>l2.liv===v.id).map(l2=>l2.zone))].map(zid=>(stockZoneById(zid)||{}).name||zid);
    const rest=s.zones.reduce((t,z)=>{const b=livBreakdown(s,z.id)[v.id];return t+(b?b.rest:0);},0);
    const pend=s.lots.filter(l2=>l2.liv===v.id&&l2.pend).reduce((t,l2)=>t+l2.qty,0);
    return `<tr><td data-stklivd="${v.id}" style="cursor:pointer" title="voir le détail : contenu, reçu, restant par zone"><b style="color:#1c3d6b">${esc(v.label)}</b>${v.bl?`<br><span class="dim" style="font-size:10.5px">BL ${esc(v.bl)}</span>`:''}</td>
     <td style="white-space:nowrap">${esc(dFR(v.date)||new Date(v.at).toLocaleDateString('fr-FR'))}${(v.dateHist||[]).length?` <span class="hyChip" style="border-color:#c9a227;font-size:9.5px;padding:0 5px" title="${esc((v.dateHist||[]).map(h=>dFR(h.from)+' → '+dFR(h.to)+' ('+(h.by||'')+(h.why?' : '+h.why:'')+')').join(' · '))}">décalé ×${v.dateHist.length}</span>`:''}${v.status==='prevu'&&v.date?`<br><span class="dim" style="font-size:10px">${esc(dRel(v.date))}</span>`:''}${canE&&v.status==='prevu'?` <button class="btn sm" data-stkdate="${v.id}" title="décaler la livraison (l'historique est gardé)" style="padding:1px 6px">📅</button>`:''}</td>
     <td>${v.status==='prevu'?'<span class="hyChip" style="border-color:#c9a227;font-size:10px;padding:1px 7px">attendu</span>':'<span class="hyChip" style="border-color:#9fd49f;font-size:10px;padding:1px 7px">déchargé</span>'}${(v.ecarts||[]).length?` <span class="hyChip" style="border-color:#e8a0a0;color:#8a1f1f;font-size:10px;padding:1px 7px">⚠ ${v.ecarts.length}</span>`:''}</td>
     <td style="font-size:11px">${zs.map(esc).join('<br>')||'—'}</td>
     <td>${v.status==='prevu'?stkFmtQ(pend)+' att.':'<b>'+stkFmtQ(rest)+'</b>'}</td>
     <td style="white-space:nowrap">${canE&&v.status==='prevu'?`<button class="btn sm primary" data-stkunload="${v.id}">📦 Camion arrivé</button> <button class="btn sm" data-stkpresplit="${v.id}" title="répartir sur plusieurs zones AVANT l'arrivée — le pointage validera le tout">⇄</button>`:''}${v.status!=='prevu'?`<button class="btn sm" data-stkcr="${v.id}">📄 CR</button>`:''}${canE?` <button class="btn sm" data-stkdelliv="${v.id}" title="supprimer cette livraison et ses lots" style="color:#d03b3b">✕</button>`:''}</td></tr>`;};
  // ----- carte compacte d'une zone (dépliable — un chantier peut avoir 30 camions) -----
  const zoneCard=z=>{const agg=zoneAgg(s,z.id).sort((a,b)=>String(a.label).localeCompare(String(b.label)));
    const reste=agg.reduce((t,a)=>t+Math.max(0,a.reste),0);const pend=agg.reduce((t,a)=>t+(a.pend||0),0);const st4=zoneStatusOf(s,z);
    const rows=agg.map(a=>{const pc=a.qty?Math.max(0,Math.min(100,Math.round(100*a.reste/a.qty))):0;
      return `<tr><td>${esc(a.label)}</td><td>${stkFmtQ(a.qty)}${a.pend?` <span class="dim" style="font-size:10px">(+${stkFmtQ(a.pend)} att.)</span>`:''}</td><td>${stkFmtQ(a.taken)}</td><td><b>${stkFmtQ(a.reste)}</b><div class="stbar"><i class="${pc<25?'low':''}" style="width:${pc}%"></i></div></td></tr>`;}).join('');
    const bd2=livBreakdown(s,z.id);const prov=Object.entries(bd2).filter(([,o])=>o.rest>0||o.pend>0).map(([lv,o])=>`<span class="hyChip" ${lv!=='—'?`data-stklivd="${lv}" style="font-size:10.5px;cursor:pointer"`:'style="font-size:10.5px"'} title="touche pour le détail de ce camion (références, zones, restant)">${esc(livName(lv))} : ${o.rest?stkFmtQ(o.rest)+' pcs':''}${o.pend?' '+stkFmtQ(o.pend)+' att.':''}</span>`).join(' ');
    return `<details class="card" data-stkui="z:${z.id}" style="border-left:4px solid ${st4==='ok'?'#0ca30c':'#c9a227'}" ${UIo('z:'+z.id,false)}>
     <summary style="cursor:pointer;display:flex;align-items:center;gap:8px;flex-wrap:wrap;font-size:13.5px"><b>${esc(z.name)}</b>
      <span class="hyChip" style="border-color:${st4==='ok'?'#9fd49f':'#c9a227'};font-size:10.5px">${st4==='ok'?'en stock':'prévue'}</span>
      <span class="dim" style="font-size:12px">reste <b>${stkFmtQ(reste)}</b> pcs${pend?' · '+stkFmtQ(pend)+' attendues':''}</span></summary>
     <div class="dim" style="font-size:11px;margin-top:4px">${fmt(z.w)} × ${fmt(z.h)} m${(z.photos||[]).length?' · 📷 '+z.photos.length:''}${prov?'<div style="margin-top:3px">'+prov+'</div>':''}</div>
     ${agg.filter(a=>a.qty||a.taken).length?`<div style="overflow:auto"><table class="rc" style="margin-top:4px"><tr><th></th><th>livré</th><th>pris</th><th>reste</th></tr>${rows}</table></div>`:'<div class="dim" style="font-size:12px;margin-top:4px">Rien de déchargé ici pour l\'instant.</div>'}
     <div class="row" style="display:flex;gap:5px;flex-wrap:wrap;margin-top:6px">
      <button class="btn sm" data-stkgo="${z.id}">📍 Plan</button>
      ${canE?`<button class="btn sm" data-stksplit="${z.id}">⇄ Scinder / transférer</button>`:''}
      <button class="btn sm" data-stkcsv="${z.id}">⬇ CSV</button>
      ${canE?`<button class="btn sm" data-stkdel="${z.id}" style="color:#d03b3b">✕</button>`:''}
     </div></details>`;};
  const G=globalAgg(s);const {need,lab}=stockNeeds();
  const gRows=G.sort((a,b)=>String(a.label).localeCompare(String(b.label))).map(a=>{const mk=matchKey(a);const nd=need[mk]||0;const short=nd&&(a.qty<nd);
    return `<tr${short?' style="background:#fdecec"':''}><td>${esc(a.label)}</td><td>${stkFmtQ(a.qty)}${a.pend?` <span class="dim" style="font-size:10px">(+${stkFmtQ(a.pend)} att.)</span>`:''}</td><td>${stkFmtQ(a.taken)}</td><td><b>${stkFmtQ(a.reste)}</b>${short?` <span class="dim" style="font-size:10.5px">(il en faut ${stkFmtQ(nd)} au calepinage)</span>`:''}</td></tr>`;}).join('');
  // vue matière : zoom par tronçon (ligne principale + ses antennes)
  const mains2=Object.values(state.lines).filter(l2=>!l2.parent);
  const matSel=state.stockMatSel&&state.lines[state.stockMatSel]?state.stockMatSel:'';
  el.innerHTML=`<h2 class="vt">Stock — pièces pré-isolées</h2>
   <div class="kv" style="margin-bottom:6px"><span>${s.zones.length} zone${s.zones.length>1?'s':''}</span><span>${s.livs.length} camion${s.livs.length>1?'s':''}${nPrevu?' · <b>'+nPrevu+' attendu'+(nPrevu>1?'s':'')+'</b>':''}</span>${nEcarts?`<span style="background:#fdecec"><b style="color:#d03b3b">${nEcarts} livraison${nEcarts>1?'s':''} avec écart</b></span>`:''}</div>
   ${canE?`<div class="row" style="display:flex;gap:6px;margin-bottom:8px"><button class="btn primary" id="stk-new" style="flex:1">＋ Nouvelle livraison (camion)</button></div>`:''}
   ${canE&&nPrevu?`<div class="warnbox" style="margin-bottom:8px"><b>${nPrevu} camion${nPrevu>1?'s':''} annoncé${nPrevu>1?'s':''}</b> — à son arrivée, « 📦 Camion arrivé » ouvre le contrôle des quantités (photo + réel vs BL), et la marchandise entre en stock.
    <div style="margin-top:6px;display:flex;gap:6px;flex-wrap:wrap">${s.livs.filter(v=>v.status==='prevu').sort((a,b)=>String(a.date||'').localeCompare(String(b.date||''))).map(v=>`<button class="btn sm primary" data-stkunload="${v.id}">📦 ${esc(v.label)}${v.date?' ('+esc(dFR(v.date))+')':''} est arrivé — pointer</button>`).join('')}</div></div>`:''}
   <details class="card" data-stkui="map" ${UIo('map',true)}><summary style="cursor:pointer;font-size:13.5px"><b>Plan d'ensemble des stockages</b> <span class="dim" style="font-size:12px">${s.zones.length?s.zones.length+' zone'+(s.zones.length>1?'s':'')+' — zoome, touche une zone':'aucune zone posée'}</span></summary>
    <div id="stkMap" style="position:relative;height:340px;border-radius:10px;overflow:hidden;background:#eceae2;margin-top:6px;touch-action:none"></div></details>
   ${s.livs.length?`<details class="card" data-stkui="livs" ${UIo('livs',false)}><summary style="cursor:pointer;font-size:13.5px"><b>Livraisons / BL</b> <span class="dim" style="font-size:12px">(${s.livs.length} — chaque pièce garde son camion d\'origine, même transférée)</span></summary>
    <div style="overflow:auto"><table class="rc" style="margin-top:6px"><tr><th>Camion / BL</th><th>Date</th><th>Statut</th><th>Zones</th><th>Reste</th><th></th></tr>${s.livs.slice().reverse().map(livRow).join('')}</table></div></details>`:''}
   ${s.zones.length?s.zones.map(zoneCard).join(''):'<div class="card muted">Aucune zone de stockage : crée une livraison, la zone se pose sur le plan.</div>'}
   ${G.length?`<details class="card" data-stkui="gen" ${UIo('gen',false)}><summary style="cursor:pointer;font-size:13.5px"><b>Stock général chantier</b> <span class="dim" style="font-size:12px">${stkFmtQ(G.reduce((t,a)=>t+Math.max(0,a.reste),0))} pcs restantes, toutes zones</span></summary><div style="overflow:auto"><table class="rc" style="margin-top:6px"><tr><th></th><th>livré</th><th>pris</th><th>reste</th></tr>${gRows}</table></div>
    <div class="row" style="display:flex;gap:6px;margin-top:6px"><button class="btn sm" id="stk-csvg" style="flex:1">⬇ CSV stock général</button></div></details>`:''}
   ${stockBalanceHTML(matSel,mains2)}
   ${(s.moves||[]).length?`<details class="card" data-stkui="mov" ${UIo('mov')}><summary style="cursor:pointer;font-size:13px;color:var(--ink2)">Mouvements et déplacements (${s.moves.length})</summary><table class="rc" style="margin-top:6px">${s.moves.slice(-15).reverse().map(m2=>m2.zoneMove?`<tr><td>${esc(new Date(m2.at).toLocaleDateString('fr-FR'))}</td><td colspan="2">📍 Zone « ${esc(m2.label||'')} » déplacée de <b>${fmt(m2.dist)} m</b> sur le plan</td><td class="dim">${esc(m2.by||'')}</td></tr>`:`<tr><td>${esc(new Date(m2.at).toLocaleDateString('fr-FR'))}</td><td>${stkFmtQ(m2.qty)} × ${esc(m2.label||'')}${m2.pre?' <span class="dim" style="font-size:10px">(répartition avant arrivée)</span>':''}</td><td>${esc((stockZoneById(m2.from)||{}).name||m2.from||'—')} → ${esc((stockZoneById(m2.to)||{}).name||m2.to)}</td><td class="dim">${esc(m2.by||'')}</td></tr>`).join('')}</table></details>`:''}`;
  el.querySelectorAll('details[data-stkui]').forEach(d=>d.addEventListener('toggle',()=>{state.stockUI[d.dataset.stkui]=d.open;if(d.dataset.stkui==='map'&&d.open)initStockMap();}));
  if(el.querySelector('details[data-stkui="map"][open]'))initStockMap();
  el.querySelectorAll('[data-stklivd]').forEach(b=>b.addEventListener('click',()=>openStockLivDetail(b.dataset.stklivd)));
  const q0=$('#stk-new');if(q0)q0.onclick=()=>openStockLiv();
  const qg=$('#stk-csvg');if(qg)qg.onclick=()=>{const rows=[['Référence','Livré','Pris','Reste']];globalAgg(s).forEach(a=>rows.push([a.label,a.qty,a.taken,a.reste]));dlCSVFile((NET.name||'chantier')+' - stock général.csv',rows);};
  const ml2=$('#stk-matline');if(ml2)ml2.onchange=()=>{state.stockMatSel=ml2.value;renderStock();};
  const cb2=$('#stk-csvbal');if(cb2)cb2.onclick=()=>{const {need,lab}=stockNeedsFor(matSel);const posed=stockPosed(matSel);const st={},at={};globalAgg(s).forEach(a=>{const k=matchKey(a);st[k]=(st[k]||0)+Math.max(0,a.reste||0);at[k]=(at[k]||0)+(a.pend||0);});
    const rows=[['Référence','Besoin','Posé','Reste à poser','Stock','Attendu','Solde']];
    [...new Set([...Object.keys(need),...Object.keys(st),...Object.keys(at)])].forEach(k=>{const be=need[k]||0,po=Math.min(be||1e9,posed[k]||0),rp=Math.max(0,be-po);rows.push([lab[k]||k,be,po,rp,st[k]||0,at[k]||0,(st[k]||0)+(at[k]||0)-rp]);});
    dlCSVFile((NET.name||'chantier')+' - besoin et stock.csv',rows);};
  el.querySelectorAll('[data-stkgo]').forEach(b=>b.onclick=()=>{const z=stockZoneById(b.dataset.stkgo);if(!z)return;state.stockSel=z.id;state.tab='plan';renderAll();centerOn(z.x,z.y,Math.max(state.view.k,6));updateStockBar('Zone « '+z.name+' » — glisser pour déplacer, poignées pour étirer, ↻ pour tourner, Terminer pour sortir.');});
  el.querySelectorAll('[data-stkcsv]').forEach(b=>b.onclick=()=>{const z=stockZoneById(b.dataset.stkcsv);const rows=[['Référence','Livré','Pris','Reste']];zoneAgg(s,z.id).forEach(a=>rows.push([a.label,a.qty,a.taken,a.reste]));dlCSVFile((NET.name||'chantier')+' - '+z.name+'.csv',rows);});
  el.querySelectorAll('[data-stkunload]').forEach(b=>b.onclick=()=>openStockUnload(b.dataset.stkunload));
  el.querySelectorAll('[data-stkpresplit]').forEach(b=>b.onclick=()=>openStockPreSplit(b.dataset.stkpresplit));
  el.querySelectorAll('[data-stksplit]').forEach(b=>b.onclick=()=>openStockSplit(b.dataset.stksplit));
  el.querySelectorAll('[data-stkcr]').forEach(b=>b.onclick=()=>openStockCR(b.dataset.stkcr));
  el.querySelectorAll('[data-stkdate]').forEach(b=>b.onclick=()=>openStockDate(b.dataset.stkdate));
  el.querySelectorAll('[data-stkdelliv]').forEach(b=>b.onclick=()=>{const id=b.dataset.stkdelliv;const v=s.livs.find(x=>x.id===id);if(!v)return;
    const nT=s.takes.filter(t=>t.liv===id).length;
    if(!confirm('Supprimer la livraison « '+v.label+' » ?\n'+(nT?nT+' prélèvement(s) y sont rattachés : ils resteront comptés mais sans camion d\'origine.\n':'')+'Ses lots encore en stock disparaissent du suivi.'))return;
    const touched=new Set(s.lots.filter(l2=>l2.liv===id).map(l2=>l2.zone));
    s.livs=s.livs.filter(x=>x.id!==id);s.lots=s.lots.filter(l2=>l2.liv!==id);s.takes.forEach(t=>{if(t.liv===id)t.liv=null;});
    s.zones=s.zones.filter(z=>!touched.has(z.id)||s.lots.some(l2=>l2.zone===z.id)||s.takes.some(t=>t.zone===z.id)); // une zone que CETTE livraison laisse vide disparaît du plan
    saveStock();renderStock();renderPlan();toast('Livraison supprimée');});
  el.querySelectorAll('[data-stkdel]').forEach(b=>b.onclick=()=>{const z=stockZoneById(b.dataset.stkdel);const agg=zoneAgg(s,z.id);const reste=agg.reduce((t,a)=>t+a.reste,0);
    if(!confirm(reste>0?('La zone « '+z.name+' » a encore '+reste+' pièce(s) : supprimer quand même ? (les lots et prélèvements de cette zone disparaissent du suivi)'):('Supprimer la zone « '+z.name+' » ?')))return;
    s.zones=s.zones.filter(z2=>z2.id!==z.id);s.lots=s.lots.filter(l2=>l2.zone!==z.id);s.takes=s.takes.filter(t=>t.zone!==z.id);saveStock();renderStock();renderPlan();});}
// fiche d\'une zone au TAP sur le plan : le restant, la provenance par camion, l\'attendu — sans quitter la carte
function openStockZoneModal(zoneId){const s=stockOf();const z=stockZoneById(zoneId);if(!s||!z)return;
  const agg=zoneAgg(s,z.id).filter(a=>a.qty||a.pend||a.taken);const st4=zoneStatusOf(s,z);
  const bd2=livBreakdown(s,z.id);const livName=id=>{const v=s.livs.find(x=>x.id===id);return v?v.label+(v.bl?' · '+v.bl:''):'(camion inconnu)';};
  const pendLivs=[...new Set(s.lots.filter(l2=>l2.zone===z.id&&l2.pend).map(l2=>l2.liv))];
  openModal(`<h3 style="margin-top:0">${esc(z.name)} <span class="hyChip" style="border-color:${st4==='ok'?'#9fd49f':'#c9a227'};font-size:10.5px">${st4==='ok'?'en stock':'prévue'}</span></h3>
   ${agg.length?`<div style="overflow:auto;max-height:40vh"><table class="rc"><tr><th></th><th>livré</th><th>pris</th><th>reste</th></tr>${agg.map(a=>`<tr><td>${esc(a.label)}</td><td>${stkFmtQ(a.qty)}${a.pend?` <span class="dim" style="font-size:10px">(+${stkFmtQ(a.pend)} att.)</span>`:''}</td><td>${stkFmtQ(a.taken)}</td><td><b>${stkFmtQ(a.reste)}</b></td></tr>`).join('')}</table></div>`:'<p class="hint">Rien ici pour l\'instant.</p>'}
   ${(()=>{const det=zoneLotsDetail(s,z.id).filter(d0=>d0.rest>0||d0.pend>0);if(!det.length)return '';
     const dShort=x=>x?new Date(x).toLocaleDateString('fr-FR',{day:'2-digit',month:'2-digit'}):'?';const zn=id2=>esc((stockZoneById(id2)||{}).name||id2||'?');
     return `<div style="margin-top:8px"><b style="font-size:12px">Provenance — pièce par pièce</b> <span class="dim" style="font-size:10.5px">(camion d'origine, parcours, dates — touche le camion pour sa fiche)</span>
      <div style="overflow:auto;max-height:34vh"><table class="rc" style="margin-top:4px">${det.map(d0=>{const l2=d0.lot;const lv=s.livs.find(x=>x.id===l2.liv);
        const tr2=lotTrail(s,l2);const path=tr2.moves.length?zn(tr2.start)+' <span class="dim">(déchargé '+dShort(lv&&(lv.recuAt||lv.date))+')</span>'+tr2.moves.map(m2=>' → '+(m2.to===z.id?'<b>ici</b>':zn(m2.to))+' <span class="dim">le '+dShort(m2.at)+'</span>').join(''):(d0.pend?'<span class="dim">attendu ici (pré-réparti avant l\'arrivée)</span>':'<span class="dim">déchargé directement ici'+(lv&&(lv.recuAt||lv.date)?' le '+dShort(lv.recuAt||lv.date):'')+'</span>');
        return `<tr><td>${esc(l2.label)}</td><td><b>${d0.rest?stkFmtQ(d0.rest):''}</b>${d0.pend?'<span class="dim" style="font-size:10px">'+stkFmtQ(d0.pend)+' att.</span>':''}</td><td><span class="hyChip" data-stklivz="${esc(l2.liv||'')}" style="cursor:pointer;font-size:10.5px">🚚 ${esc(lv?lv.label+(lv.bl?' · '+lv.bl:''):'camion inconnu')}</span><div class="dim" style="font-size:10.5px;margin-top:2px">${path}</div></td></tr>`;}).join('')}</table></div></div>`;})()}
   ${pendLivs.length?`<div class="warnbox" style="margin-top:6px">Camion${pendLivs.length>1?'s':''} attendu${pendLivs.length>1?'s':''} ici : ${pendLivs.map(lv=>esc(livName(lv))).join(', ')} — pointage à l\'arrivée (onglet Stock).</div>`:''}
   <div class="actions" style="margin-top:8px;display:flex;gap:6px;flex-wrap:wrap">
    ${stockCanEdit()?`<button class="btn" data-close style="flex:1">✥ Ajuster la zone (poignées)</button><button class="btn" id="stkzm-split" style="flex:1">⇄ Scinder</button>`:''}
    <button class="btn" id="stkzm-tab" style="flex:1">Onglet Stock</button><button class="btn block" data-close style="flex:1">Fermer</button></div>`);
  const sp=$('#stkzm-split');if(sp)sp.onclick=()=>{closeModal();openStockSplit(z.id);};
  const tb=$('#stkzm-tab');if(tb)tb.onclick=()=>{closeModal();endStockPose();};
  $('#modal').querySelectorAll('[data-stklivz]').forEach(ch=>ch.onclick=()=>{const lv=s.livs.find(x=>x.id===ch.dataset.stklivz);if(lv){closeModal();openStockLivDetail(lv.id);}});}

/* ----- nouvelle livraison ----- */
function stockLivLinesHTML(lines){return `<table class="rc" id="stk-lines"><tr><th>Référence</th><th style="width:88px">Qté</th><th></th></tr>${lines.map((l,i)=>`<tr><td>${esc(l.label)}</td><td><input class="f" type="number" min="0" step="1" value="${l.qty}" data-stkq="${i}" style="width:74px;padding:4px 6px"></td><td><button data-stkx="${i}" style="border:0;background:none;cursor:pointer;color:#d03b3b">✕</button></td></tr>`).join('')}</table>`;}
function openStockLiv(){const s=stockOf();if(!s){toast('Aucun chantier');return;}
  const st2={src:'cat',lines:[],blInfo:'',date:isoD(new Date()),name:null,bl:'',prev:true,dest:'__new'};
  const DNS=[20,25,32,40,50,65,80,100,125,150,200,250,300,350,400];
  const KINDS=[['pipe','Barre 12 m'],['bend','Coude'],['tee','Té'],['reducer','Réduction'],['sleeve','Manchon'],['sleeveEnd','Manchon fin de ligne'],['kit','Kit fin de ligne'],['dhec','DHEC'],['wall','Passage de mur'],['pu','Mousse PU (A+B) — 1 par manchon'],['acc','Autre / accessoire']];
  const NODN=k2=>k2==='acc'; // la mousse est PAR DN désormais (retour Ethan)
  const keep=()=>{const g=id=>document.getElementById(id);const n=g('stk-name');if(n)st2.name=n.value;const b=g('stk-bl');if(b)st2.bl=b.value;const d=g('stk-date');if(d&&d.value)st2.date=d.value;const pv=g('stk-prev');if(pv)st2.prev=pv.checked;const z3=g('stk-zone');if(z3)st2.dest=z3.value;}; // le modal se re-rend à chaque ajout : sans ça la date (et le nom) saisis retombaient sur les valeurs du jour — bug remonté par Ethan
  const rd=()=>{keep();openModal(`<h3 style="margin-top:0">Nouvelle livraison — camion</h3>
   <div class="row" style="display:flex;gap:6px"><div style="flex:1"><label class="f">Nom</label><input class="f" id="stk-name" value="${esc(st2.name==null?('Camion '+(s.livs.length+1)):st2.name)}"></div><div style="flex:1"><label class="f">N° de BL (optionnel)</label><input class="f" id="stk-bl" value="${esc(st2.bl||'')}"></div></div>
   <label class="f">Date de livraison ${st2.date?'':'(prévue)'}</label><input class="f" type="date" id="stk-date" value="${st2.date||isoD(new Date())}">
   <div class="seg" style="display:flex;border:1.5px solid var(--line);border-radius:10px;overflow:hidden;margin:8px 0">${[['cat','Catalogue'],['bl','BL (PDF)'],['nom','Depuis le calepinage']].map(([k,t])=>`<div data-stksrc="${k}" style="flex:1;text-align:center;padding:7px 4px;font-size:12px;font-weight:700;cursor:pointer;${st2.src===k?'background:var(--ink);color:#fff':''}">${t}</div>`).join('')}</div>
   <div id="stk-srcbox">${st2.src==='cat'?`<div class="row" style="display:flex;gap:6px;flex-wrap:wrap;align-items:end"><div><label class="f">Pièce</label><select class="f" id="stk-kind">${KINDS.map(k=>`<option value="${k[0]}">${k[1]}</option>`).join('')}</select></div><div><label class="f">DN (acier)</label><select class="f" id="stk-dn">${DNS.map(d=>`<option ${d===100?'selected':''}>${d}</option>`).join('')}</select><div class="dim" id="stk-od" style="font-size:10.5px;margin-top:2px"></div></div><div id="stk-dn2box" style="display:none"><label class="f">DN branche</label><select class="f" id="stk-dn2">${DNS.map(d=>`<option ${d===50?'selected':''}>${d}</option>`).join('')}</select></div><div id="stk-angbox" style="display:none"><label class="f">Angle</label><select class="f" id="stk-ang">${[90,75,60,45,30,15].map(a=>`<option>${a}</option>`).join('')}</select></div><div><label class="f">Qté</label><input class="f" id="stk-qty" type="number" value="12" style="width:70px"></div><button class="btn" id="stk-add">Ajouter</button></div>`
    :st2.src==='bl'?`<label class="f">Bon de livraison (PDF — AXIOM, Renalia, LOGSTOR reconnus)</label><input class="f" type="file" id="stk-pdf" accept="application/pdf">${st2.blInfo?`<div class="hint" style="margin-top:4px">${st2.blInfo}</div>`:''}<p class="hint">Les lignes reconnues arrivent ci-dessous : vérifie chaque quantité — jamais d'import aveugle. Un BL scanné (photo) n'a pas de texte : saisis alors par le catalogue.</p>`
    :`<p class="hint" style="margin-top:0">Ce qui MANQUE encore au calepinage (besoin − déjà livré), pré-rempli — ajuste :</p><button class="btn ghost" id="stk-fill">Remplir avec le manquant</button>`}</div>
   <div style="margin-top:8px">${st2.lines.length?stockLivLinesHTML(st2.lines):'<div class="dim" style="font-size:12px">Aucune ligne pour l\'instant.</div>'}</div>
   <label style="display:flex;gap:7px;align-items:center;font-size:12.5px;margin-top:8px"><input type="checkbox" id="stk-prev" ${st2.prev?'checked':''}> Déchargement <b>prévu</b> (camion pas encore arrivé — attendu jusqu'au pointage à l'arrivée ; pré-répartissable sur plusieurs zones)</label>
   <label class="f" style="margin-top:6px">Déchargé / à décharger dans</label>
   <select class="f" id="stk-zone"><option value="__new" ${st2.dest==='__new'?'selected':''}>➕ Nouvelle zone — à poser sur le plan</option>${s.zones.map(z2=>`<option value="${z2.id}" ${st2.dest===z2.id?'selected':''}>${esc(z2.name)} (zone existante — un camion de plus dedans)</option>`).join('')}</select>
   <div class="actions" style="margin-top:8px"><button class="btn primary block" id="stk-ok">Valider la livraison</button><button class="btn block" data-close>Annuler</button></div>`);
   $('#modal').querySelectorAll('[data-stksrc]').forEach(b=>b.onclick=()=>{st2.src=b.dataset.stksrc;rd();});
   const kd=$('#stk-kind');if(kd){const upd=()=>{$('#stk-dn2box').style.display=(kd.value==='tee'||kd.value==='reducer')?'':'none';$('#stk-angbox').style.display=kd.value==='bend'?'':'none';$('#stk-dn').parentElement.style.display=NODN(kd.value)?'none':'';
       const od=$('#stk-od');if(od){const g=/sleeve/.test(kd.value)?gaineMM(+$('#stk-dn').value):null;od.textContent=g?'Ø ext. gaine ≈ '+g+' mm':'';}};kd.onchange=upd;$('#stk-dn').onchange=upd;upd();
     $('#stk-add').onclick=()=>{const o={kind:kd.value,dn:NODN(kd.value)?undefined:+$('#stk-dn').value,qty:Math.max(1,+$('#stk-qty').value||1)};if(kd.value==='bend')o.angle=+$('#stk-ang').value;if(kd.value==='tee'||kd.value==='reducer')o.dn2=+$('#stk-dn2').value;if(kd.value==='pipe')o.len=12;
       if(/sleeve/.test(o.kind)&&!o.gaine){const g=gaineMM(o.dn);if(g)o.gaine=g;} // l'enveloppe extérieure sur le libellé : un manchon se pense en Ø gaine
       o.label=stockLabel(o);o.key=stockKey(o);
       const ex=st2.lines.find(l=>l.key===o.key);if(ex)ex.qty+=o.qty;else st2.lines.push(o);
       if(o.kind==='sleeve'||o.kind==='sleeveEnd'){const pu={kind:'pu',dn:o.dn,qty:o.qty};pu.label=stockLabel(pu);pu.key=stockKey(pu); // un manchon = sa mousse : la dose du même DN suit toute seule (ajuste ou supprime la ligne si besoin)
         const exp=st2.lines.find(l=>l.key===pu.key);if(exp)exp.qty+=pu.qty;else st2.lines.push(pu);toast('+ '+pu.qty+' × '+pu.label+' ajoutée(s) automatiquement (1 dose par manchon)');}
       rd();};}
   const pf=$('#stk-pdf');if(pf)pf.onchange=async()=>{const f=pf.files[0];if(!f)return;st2.blInfo='Lecture du PDF…';rd();
     try{const lib=await loadPdfJs();const doc=await lib.getDocument({data:await f.arrayBuffer()}).promise;let txt='';
       for(let p=1;p<=doc.numPages;p++){const pg=await doc.getPage(p);const tc=await pg.getTextContent();const rows=new Map();
         tc.items.forEach(it=>{const y=Math.round(it.transform[5]/3)*3;if(!rows.has(y))rows.set(y,[]);rows.get(y).push({x:it.transform[4],s:it.str});});
         [...rows.entries()].sort((a,b)=>b[0]-a[0]).forEach(([,items])=>{txt+=items.sort((a,b)=>a.x-b.x).map(i=>i.s).join(' ')+'\n';});}
       const R=parseBL(txt);
       if(R.empty||!R.lines.length){const smp=txt.split('\n').map(x=>x.trim()).filter(Boolean).slice(0,8).join('<br>').slice(0,600);
         st2.blInfo='<b style="color:#8a1f1f">Aucune ligne reconnue'+(R.empty?' (PDF scanné, sans texte — une photo de BL ne se lit pas)':'')+'</b> — saisis par le catalogue.'+(smp?'<details style="margin-top:4px"><summary style="cursor:pointer">Ce que je lis dans ce PDF (envoie-moi ce BL pour que je l\'apprenne)</summary><div class="dim" style="font-size:10.5px;line-height:1.5">'+smp+'</div></details>':'');}
       else{R.lines.forEach(l=>{l.key=stockKey(l);l.label=stockLabel(l).replace('Divers',l.label||'Divers');const ex=st2.lines.find(x=>x.key===l.key);if(ex)ex.qty+=l.qty;else st2.lines.push(l);});
         st2.blInfo='BL <b>'+esc(R.fmt.toUpperCase())+'</b> lu : '+R.lines.length+' lignes reconnues'+(R.others&&R.others.length?' · '+R.others.length+' ignorée(s)':'')+' — vérifie les quantités.';
         if(!$('#stk-bl').value&&/BL\s*[\dA-Z]/.test(f.name))$('#stk-bl').value=f.name.replace(/\.pdf$/i,'');}
       rd();}catch(err){console.warn(err);st2.blInfo='<b style="color:#8a1f1f">PDF illisible ici</b> ('+esc(err.message||err)+') — saisis par le catalogue.';rd();}};
   const fl=$('#stk-fill');if(fl)fl.onclick=()=>{const {need,lab}=stockNeeds();const have={};globalAgg(s).forEach(a=>{const mk2=matchKey(a);have[mk2]=(have[mk2]||0)+a.qty;});
     st2.lines=Object.entries(need).map(([k,n])=>{const man=n-(have[k]||0);if(man<=0)return null;const parts=k.split(':');const o={kind:parts[0],dn:+parts[1]||undefined,qty:man,label:lab[k]||k};if(parts[0]==='bend')o.angle=+parts[2];if(parts[0]==='tee'||parts[0]==='reducer')o.dn2=+parts[2]||undefined;if(parts[0]==='pipe')o.len=12;o.key=stockKey(o);return o;}).filter(Boolean);rd();};
   $('#modal').querySelectorAll('[data-stkq]').forEach(inp=>inp.onchange=()=>{st2.lines[+inp.dataset.stkq].qty=Math.max(0,+inp.value||0);});
   $('#modal').querySelectorAll('[data-stkx]').forEach(b=>b.onclick=()=>{st2.lines.splice(+b.dataset.stkx,1);rd();});
   $('#stk-ok').onclick=()=>{st2.lines=st2.lines.filter(l=>l.qty>0);if(!st2.lines.length){toast('Aucune ligne');return;}
     const prev2=$('#stk-prev').checked;
     const liv={id:'L'+Date.now().toString(36),label:$('#stk-name').value||'Camion',bl:$('#stk-bl').value||'',at:new Date().toISOString(),date:$('#stk-date').value||isoD(new Date()),dateHist:[],by:(me()||{}).name||state.userId,status:prev2?'prevu':'ok',prevu:st2.lines.map(l=>({label:l.label,qty:l.qty}))};
     s.livs.push(liv);const lots=st2.lines.map((l,i)=>({id:liv.id+':'+i,liv:liv.id,zone:null,pend:prev2,key:l.key||stockKey(l),label:l.label,kind:l.kind,dn:l.dn,dn2:l.dn2,gaine:l.gaine,len:l.len,angle:l.angle,qty:l.qty}));
     const dest=$('#stk-zone').value;
     if(dest!=='__new'){lots.forEach(l2=>{l2.zone=dest;s.lots.push(l2);});saveStock();closeModal();renderStock();renderPlan();toast(prev2?'Camion attendu — pointage à l\'arrivée (registre des livraisons)':'Livraison ajoutée à « '+((stockZoneById(dest)||{}).name||'')+' »');}
     else{closeModal();startStockPose({liv:liv.id,name:liv.label,status:prev2?'prevu':'ok',lots});}};};
  rd();}
/* ----- déchargement : pointage par LIVRAISON (le camion peut être réparti sur plusieurs zones : tout se valide d'un coup) ----- */
function openStockUnload(livId){const s=stockOf();const liv=s.livs.find(v=>v.id===livId);if(!liv)return;
  const lots=s.lots.filter(l=>l.liv===livId&&l.pend);if(!lots.length){toast('Rien à pointer pour ce camion');return;}
  const multi=new Set(lots.map(l=>l.zone)).size>1;const ph=[];
  openModal(`<h3 style="margin-top:0">Camion arrivé — ${esc(liv.label)}${liv.bl?' · BL '+esc(liv.bl):''}</h3>
   <label class="f">1 · Photo du déchargement (obligatoire)</label>
   <div class="thumbs" id="stk-phs"><label class="thumb" style="display:flex;align-items:center;justify-content:center;border:1.5px dashed #b8b4a8;cursor:pointer;color:#8f8b80">📷<input type="file" accept="image/*" capture="environment" id="stk-ph" style="display:none" multiple></label></div>
   <label class="f" style="margin-top:8px">2 · Pointage — le réel en face du prévu</label>
   <table class="rc">${lots.map((l,i)=>`<tr><td>${esc(l.label)}${multi?` <span class="dim" style="font-size:10px">→ ${esc((stockZoneById(l.zone)||{}).name||'')}</span>`:''}</td><td class="dim">prévu : ${l.qty}</td><td><input class="f" type="number" value="${l.qty}" data-stkr="${i}" style="width:74px;padding:4px 6px"></td></tr>`).join('')}</table>
   <div class="hint">Un écart est noté au compte-rendu (réserve à faire au chauffeur) — le stock démarre sur le RÉEL.</div>
   <div class="actions" style="margin-top:8px"><button class="btn primary block" id="stk-unok">Valider le déchargement${multi?' (toutes les zones du camion)':''}</button><button class="btn block" data-close>Annuler</button></div>`);
  $('#stk-ph').onchange=async e2=>{for(const f of [...e2.target.files]){const d=await compressPhoto(f);let u=null;try{u=await sync.uploadPhoto(state.siteId,'stock-'+liv.id,d);}catch(e3){}ph.push(u||d);}
    $('#stk-phs').insertAdjacentHTML('afterbegin',ph.map(p=>`<div class="thumb"><img src="${p}"></div>`).join(''));toast(ph.length+' photo(s)');};
  $('#stk-unok').onclick=()=>{if(!ph.length){toast('Ajoute une photo du déchargement');return;}
    const ecarts=[];$('#modal').querySelectorAll('[data-stkr]').forEach(inp=>{const l=lots[+inp.dataset.stkr];const reel=Math.max(0,+inp.value||0);if(reel!==l.qty)ecarts.push({label:l.label,prevu:l.qty,recu:reel});l.qty=reel;l.pend=false;});
    s.lots=s.lots.filter(l=>l.qty>0);
    [...new Set(lots.map(l=>l.zone))].forEach(zid=>{const z=stockZoneById(zid);if(z&&z.status!=='ok'){z.status='ok';z.at=new Date().toISOString();z.by=(me()||{}).name||state.userId;}});
    liv.status='ok';liv.ecarts=ecarts;liv.recuAt=new Date().toISOString();liv.photos=(liv.photos||[]).concat(ph);
    saveStock();closeModal();renderStock();renderPlan();toast(ecarts.length?('Déchargé — '+ecarts.length+' écart(s) noté(s) au compte-rendu'):'Déchargé — conforme au BL ✓');};}
/* ----- décaler une livraison : la nouvelle date remplace l'ancienne, mais CHAQUE report reste dans l'historique (qui, quand, pourquoi) ----- */
function openStockDate(livId){const s=stockOf();const liv=s.livs.find(v=>v.id===livId);if(!liv)return;
  const dFR=d=>d?new Date(d+'T12:00:00').toLocaleDateString('fr-FR'):'—';
  openModal(`<h3 style="margin-top:0">Décaler — ${esc(liv.label)}</h3>
   <div class="kv"><span>Date actuelle : <b>${esc(dFR(liv.date))}</b></span></div>
   <label class="f" style="margin-top:6px">Nouvelle date</label><input class="f" type="date" id="stk-nd" value="${esc(liv.date||isoD(new Date()))}">
   <label class="f" style="margin-top:6px">Motif (optionnel)</label><input class="f" id="stk-why" placeholder="ex. usine en retard, accès chantier bloqué">
   ${(liv.dateHist||[]).length?`<div class="card" style="margin-top:8px;padding:8px"><b style="font-size:12px">Historique des reports</b><table class="rc" style="margin-top:4px">${liv.dateHist.map(h=>`<tr><td>${esc(dFR(h.from))} → <b>${esc(dFR(h.to))}</b></td><td class="dim">${esc(h.why||'')}</td><td class="dim">${esc(h.by||'')} ${esc(new Date(h.at).toLocaleDateString('fr-FR'))}</td></tr>`).join('')}</table></div>`:''}
   <div class="actions" style="margin-top:8px"><button class="btn primary block" id="stk-dok">Enregistrer le report</button><button class="btn block" data-close>Annuler</button></div>`);
  $('#stk-dok').onclick=()=>{const nd=$('#stk-nd').value;if(!nd||nd===liv.date){closeModal();return;}
    liv.dateHist=(liv.dateHist||[]).concat([{from:liv.date||null,to:nd,at:new Date().toISOString(),by:(me()||{}).name||state.userId,why:$('#stk-why').value||''}]);
    liv.date=nd;saveStock();closeModal();renderStock();toast('Livraison décalée au '+dFR(nd)+' (report gardé dans l\'historique)');};}
/* ----- PRÉ-répartition d'un camion ATTENDU sur plusieurs zones (ça ne vaut pas déchargement : le pointage reste à faire) ----- */
function openStockPreSplit(livId){const s=stockOf();const liv=s.livs.find(v=>v.id===livId);if(!liv)return;
  const lots=s.lots.filter(l=>l.liv===livId&&l.pend);if(!lots.length){toast('Rien à répartir');return;}
  openModal(`<h3 style="margin-top:0">Répartir avant l'arrivée — ${esc(liv.label)}</h3>
   <p class="hint" style="margin-top:0">Le camion n'est PAS encore là : tu prépares où chaque chose sera déchargée. Le pointage à l'arrivée validera l'ensemble.</p>
   <table class="rc">${lots.map((l,i)=>`<tr><td><label style="display:flex;gap:6px;align-items:center"><input type="checkbox" data-stksel="${i}"> ${esc(l.label)}</label></td><td class="dim">${esc((stockZoneById(l.zone)||{}).name||'—')} · ${l.qty}</td><td><input class="f" type="number" value="${l.qty}" max="${l.qty}" min="1" data-stksq="${i}" style="width:70px;padding:4px 6px"></td></tr>`).join('')}</table>
   <label class="f" style="margin-top:8px">Vers</label>
   <select class="f" id="stk-dest">${s.zones.map(z2=>`<option value="${z2.id}">${esc(z2.name)}</option>`).join('')}<option value="__new">➕ Nouvelle zone — à poser sur le plan</option></select>
   <input class="f" id="stk-destname" placeholder="Nom de la nouvelle zone" style="margin-top:6px;display:none">
   <div class="actions" style="margin-top:8px"><button class="btn primary block" id="stk-preok">Répartir</button><button class="btn block" data-close>Annuler</button></div>`);
  const dsel=$('#stk-dest');dsel.onchange=()=>{$('#stk-destname').style.display=dsel.value==='__new'?'':'none';};if(!s.zones.length){dsel.value='__new';dsel.onchange();}
  $('#stk-preok').onclick=()=>{const picks=[];$('#modal').querySelectorAll('[data-stksel]').forEach(cb=>{if(!cb.checked)return;const i=+cb.dataset.stksel;const q=Math.max(1,Math.min(lots[i].qty,+$('#modal').querySelector('[data-stksq="'+i+'"]').value||lots[i].qty));picks.push({l:lots[i],q});});
    if(!picks.length){toast('Rien de coché');return;}
    const doPre=destId=>{picks.forEach(({l,q})=>{if(q>=l.qty)l.zone=destId;else{l.qty-=q;s.lots.push({...l,id:l.id+'>'+destId,zone:destId,qty:q});}
      s.moves.push({at:new Date().toISOString(),by:(me()||{}).name||state.userId,label:l.label,key:matchKey(l),livs:l.liv?[l.liv]:[],qty:q,from:l.zone===destId?null:l.zone,to:destId,pre:true});});
      saveStock();};
    if(dsel.value==='__new'){const nm=$('#stk-destname').value||('Zone '+(s.zones.length+1));closeModal();
      startStockPose({name:nm,status:'prevu',lots:[],moveLots:destId=>{doPre(destId);renderPlan();}});}
    else{doPre(dsel.value);closeModal();renderStock();renderPlan();toast('Réparti — pointage du camion à l\'arrivée');}};}
/* ----- scinder / transférer du stock RÉEL (la trace du camion d'origine suit chaque lot) ----- */
function openStockSplit(zoneId){const s=stockOf();const z=stockZoneById(zoneId);if(!z)return;const agg=zoneAgg(s,z.id).filter(a=>a.reste>0);
  if(!agg.length){toast('Rien à transférer dans cette zone');return;}
  const others=s.zones.filter(z2=>z2.id!==zoneId);
  openModal(`<h3 style="margin-top:0">Scinder / transférer — ${esc(z.name)}</h3>
   <p class="hint" style="margin-top:0">Coche ce qui part (quantité ajustable), choisis la destination. Ex. : manchons et mousse → base vie, les tubes restent. Chaque pièce garde la trace de son camion.</p>
   <table class="rc">${agg.map((a,i)=>`<tr><td><label style="display:flex;gap:6px;align-items:center"><input type="checkbox" data-stksel="${i}" ${/sleeve|kit|dhec|wall|pu|acc/.test(a.kind)?'checked':''}> ${esc(a.label)}</label></td><td class="dim">reste ${a.reste}</td><td><input class="f" type="number" value="${a.reste}" max="${a.reste}" min="1" data-stksq="${i}" style="width:70px;padding:4px 6px"></td></tr>`).join('')}</table>
   <label class="f" style="margin-top:8px">Destination</label>
   <select class="f" id="stk-dest">${others.map(z2=>`<option value="${z2.id}">${esc(z2.name)}</option>`).join('')}<option value="__new">➕ Nouvelle zone (base vie, autre dépôt…) — à poser sur le plan</option></select>
   <input class="f" id="stk-destname" placeholder="Nom de la nouvelle zone (ex. Base vie)" style="margin-top:6px;${others.length?'display:none':''}">
   <div class="actions" style="margin-top:8px"><button class="btn primary block" id="stk-splitok">Transférer</button><button class="btn block" data-close>Annuler</button></div>`);
  const dsel=$('#stk-dest');dsel.onchange=()=>{$('#stk-destname').style.display=dsel.value==='__new'?'':'none';};if(!others.length)dsel.value='__new';
  $('#stk-splitok').onclick=()=>{const picks=[];$('#modal').querySelectorAll('[data-stksel]').forEach(cb=>{if(!cb.checked)return;const i=+cb.dataset.stksel;const q=Math.max(1,Math.min(agg[i].reste,+$('#modal').querySelector('[data-stksq="'+i+'"]').value||agg[i].reste));picks.push({a:agg[i],q});});
    if(!picks.length){toast('Rien de coché');return;}
    const doMove=destId=>{picks.forEach(({a,q})=>{let left=q;const lvs=new Set();s.lots.filter(l=>l.zone===zoneId&&!l.pend&&l.key===a.key).forEach(l=>{if(left<=0)return;const take2=Math.min(l.qty,left);l.qty-=take2;left-=take2;if(l.liv)lvs.add(l.liv);
        const ex=s.lots.find(l2=>l2.zone===destId&&l2.key===a.key&&l2.liv===l.liv&&!l2.pend);if(ex)ex.qty+=take2;else s.lots.push({id:l.id+'>'+destId,liv:l.liv,zone:destId,key:a.key,label:a.label,kind:a.kind,dn:a.dn,dn2:a.dn2,gaine:a.gaine,len:a.len,angle:a.angle,qty:take2});});
      s.moves.push({at:new Date().toISOString(),by:(me()||{}).name||state.userId,label:a.label,key:matchKey(a),livs:[...lvs],qty:q,from:zoneId,to:destId});});
      s.lots=s.lots.filter(l=>l.qty>0);saveStock();};
    if(dsel.value==='__new'){const nm=$('#stk-destname').value||'Base vie';closeModal();
      startStockPose({name:nm,status:'ok',lots:[],moveLots:destId=>{doMove(destId);renderPlan();}});}
    else{doMove(dsel.value);closeModal();renderStock();renderPlan();toast('Transféré vers '+((stockZoneById(dsel.value)||{}).name||''));}};}
/* ----- compte-rendu de réception (1 clic, imprimable) — par LIVRAISON ----- */
function openStockCR(livId){const s=stockOf();const liv=s.livs.find(v=>v.id===livId);if(!liv)return;
  const zs=[...new Set(s.lots.filter(l=>l.liv===livId).map(l=>(stockZoneById(l.zone)||{}).name||l.zone))];
  const rows=(liv.prevu||[]).map(p=>{const ec=(liv.ecarts||[]).find(e2=>e2.label===p.label);return `<tr${ec?' style="background:#fdecec"':''}><td>${esc(p.label)}</td><td style="text-align:right">${p.qty}</td><td style="text-align:right">${ec?ec.recu:p.qty}</td><td>${ec?'<b>'+(ec.recu-ec.prevu>0?'+':'')+(ec.recu-ec.prevu)+' — réserve chauffeur</b>':'conforme'}</td></tr>`;}).join('');
  const w=window.open('','_blank');w.document.write(`<!doctype html><html lang="fr"><head><meta charset="utf-8"><title>Réception ${esc(liv.label)}</title>
   <style>body{font-family:system-ui,sans-serif;margin:28px;color:#111}h1{font-size:19px;margin:0}h2{font-size:14px;margin:18px 0 6px}table{border-collapse:collapse;width:100%;font-size:12.5px}th,td{border:1px solid #ccc;padding:5px 8px;text-align:left}th{background:#f2f1ec}img{max-width:220px;max-height:160px;border-radius:8px;margin:4px}@media print{button{display:none}}</style></head><body>
   <button onclick="print()" style="float:right;padding:8px 14px">🖨 Imprimer / PDF</button>
   <h1>Compte-rendu de réception — ${esc(NET.name||'')}</h1>
   <div style="color:#555;font-size:13px">${esc(liv.label)}${liv.bl?' · BL '+esc(liv.bl):''} · zone${zs.length>1?'s':''} ${zs.map(esc).join(', ')} · reçu le ${liv.recuAt?new Date(liv.recuAt).toLocaleDateString('fr-FR'):''} par ${esc(liv.by||'')}${liv.date?' · annoncé pour le '+esc(new Date(liv.date+'T12:00:00').toLocaleDateString('fr-FR')):''}</div>
   ${(liv.dateHist||[]).length?`<div style="color:#8a6d1f;font-size:12px;margin-top:4px">Livraison décalée ${liv.dateHist.length} fois : ${liv.dateHist.map(h=>new Date(h.to+'T12:00:00').toLocaleDateString('fr-FR')+(h.why?' ('+esc(h.why)+')':'')).join(' → ')}</div>`:''}
   <h2>Pointage</h2><table><tr><th>Référence</th><th>Prévu (BL)</th><th>Reçu</th><th>Écart</th></tr>${rows}</table>
   ${(liv.ecarts||[]).length?`<p style="color:#8a1f1f"><b>${liv.ecarts.length} écart(s)</b> — réserve portée au transporteur.</p>`:'<p style="color:#116611"><b>Réception conforme au bon de livraison.</b></p>'}
   ${(liv.photos||[]).length?'<h2>Photos</h2>'+liv.photos.map(p=>`<img src="${p}">`).join(''):''}
   <p style="margin-top:26px">Signature : ______________________</p></body></html>`);w.document.close();}

/* ---------- liste ---------- */
function renderListe(){const el=$('#liste');let h='<h2 class="vt">Liste des soudures</h2>';Object.values(state.lines).forEach(l=>{['A','R'].forEach(c=>{if(!l.cond[c])return;const J=l.cond[c].joints.filter(passFilter);if(!J.length)return;h+=`<h3 style="color:${c==='A'?'#c8382f':'#2a5fb4'}">${esc(l.name)} — ${c==='A'?'aller':'retour'} (${J.length})</h3><div class="card" style="padding:0 8px">${J.map(j=>`<div class="wrow" data-line="${l.id}" data-cond="${c}" data-i="${j.idx}"><b>${j.weldId}</b><span class="meta">PK ${fmt(l.cond[c].els[j.idx].m1)} m · Dn${esc(j.dn||l.dn)}${j.fc?' · <b style="color:#b8560f">FC '+fmt(Math.abs(j.dev))+'°</b>':''}${j.wire==='inversion'?' · <b style="color:#d03b3b">inversion fils</b>':j.wire==='raccorde'?' · fils ✓':''}</span>${badge(j.status)}</div>`).join('')}</div>`;});});el.innerHTML=h;}
$('#liste').addEventListener('click',e=>{const r=e.target.closest('.wrow');if(!r)return;goToJoint(state.lines[r.dataset.line],r.dataset.cond,+r.dataset.i);});

/* ---------- import PDF (pdf.js) ---------- */
const modal=$('#modal');function openModal(h){modal.innerHTML=`<div class="box">${h}</div>`;modal.classList.add('show');}function closeModal(){modal.classList.remove('show');modal.innerHTML='';}
modal.addEventListener('click',e=>{if(e.target===modal||e.target.closest('[data-close]'))closeModal();});
let pdfDoc=null,pdfPage=1;
function openImport(){openModal(`<h2>Importer un plan</h2><p><b>DXF</b> (export du DWG) : l'appli lit le fichier en flux (les plans de BE font souvent 200 à 500 Mo), reconnaît le type de dessin, te fait choisir les calques du réseau, construit les lignes et le puzzle catalogue, puis liste ce qu'elle n'a pas su lire. <b>PDF</b> : la page devient une feuille et tu traces l'axe dessus.</p><label class="btn primary block" style="margin-top:8px">Choisir un fichier<input type="file" id="planFile" accept=".pdf,.dwg,.dxf,application/pdf" style="display:none"></label><div id="importBody"></div><div class="actions" style="margin-top:8px"><button class="btn block" data-close>Fermer</button></div>`);$('#planFile').addEventListener('change',onPlanFile);}
let importCtx=null;
const PROFILE_LABEL={jbtp:'JBTP / Mensura — pièces dessinées en blocs (aller et retour séparés)',logstor:'LOGSTOR — plan de calepinage : chaque pièce est un bloc composant (2000, 2500, 3500…)',renalia:'Renalia / ZPU — axes + repères de soudure et blocs',"mensura-axis":'Plan projet BE (Mensura) — un axe, nœuds, étiquettes DN par tronçon : le calepinage est à construire',generic:'Générique — axes en polylignes'};
function rolesFromUI(){const an=importCtx.an;const roles={...an.roles,axesA:[],axesR:[],axes:[]};$$('#impLayers input[type=checkbox]').forEach(cb=>{if(!cb.checked)return;const lay=cb.dataset.layer;const sel=$$('#impLayers select').find(x=>x.dataset.layer===lay);const role=sel?sel.value:'S';if(role==='A')roles.axesA.push(lay);else if(role==='R')roles.axesR.push(lay);else roles.axes.push(lay);});return roles;}
function importOpts(){const {an,fileName}=importCtx;return {id:importCtx.id,name:($('#impName')?$('#impName').value:'')||fileName.replace(/\.[^.]+$/,''),supplier:$('#impSup')?$('#impSup').value:(an.supplierGuess||'AXIOM'),serie:$('#impSerie')?+$('#impSerie').value:1,fileName,defaultDn:$('#impDn')?(+$('#impDn').value||50):(an.dnSet[0]||50),closeGaps:$('#qGap')?$('#qGap').value==='close':false};}
function importPreview(){const {dxf,an,jbtp}=importCtx;const opts=importOpts();let net;try{net=jbtp?buildSiteJBTP(dxf,an,opts):buildSite(dxf,an,$('#impLayers')?rolesFromUI():an.roles,opts);}catch(err){console.error(err);$('#impPrev').innerHTML=`<div class="err">${esc(err.message||err)}</div>`;return null;}
  importCtx.net=net;const box=$('#impPrev');if(box){box.innerHTML=previewSVG(net,net.pieces||[],Math.min(560,box.clientWidth||360),300)+`<div class="hint" style="margin-top:4px">${net.lines.length} lignes${net.report.pieces?' · '+net.report.pieces+' pièces':''}${net.report.gaps?' · <span style="color:#d03b3b">'+net.report.gaps+' écarts en rouge</span>':''} · ${Math.round(net.lines.reduce((s,l)=>s+(l.length||0),0))} m — noir/gris : barres aller/retour, bleu : coudes, vert : tés, violet : réductions.</div>${net.warnings.length?'<div class="warnbox">'+net.warnings.map(esc).join('<br>')+'</div>':''}`;}
  return net;}
async function importDXF(f,body){
  body.innerHTML=`<div class="card" style="margin-top:10px"><b>${esc(f.name)}</b> — ${(f.size/1e6).toFixed(0)} Mo<div class="hint" id="impProg" style="margin-top:6px">Lecture du dessin… 0 %</div><div style="height:6px;background:var(--plane);border-radius:3px;margin-top:4px;overflow:hidden"><div id="impBar" style="height:100%;width:0;background:var(--ink);transition:width .2s"></div></div></div>`;
  const t0=Date.now();let dxf;
  try{dxf=await parseDXFFile(f,p=>{const el=$('#impProg');if(el)el.textContent=`Lecture du dessin… ${Math.round(p*100)} %`;const b=$('#impBar');if(b)b.style.width=Math.round(p*100)+'%';return new Promise(r=>setTimeout(r,0));});}
  catch(err){console.error(err);body.innerHTML=`<div class="err">Lecture impossible : ${esc(err.message||err)}</div>`;return;}
  try{const an=analyze(dxf);const jbtp=an.profile==='jbtp';importCtx={dxf,an,jbtp,fileName:f.name,id:'imp_'+Date.now().toString(36)};
    const nBlkEnts=Object.values(dxf.blocks).reduce((s,b)=>s+b.length,0);
    let h=`<div class="card" style="margin-top:10px"><b>${esc(f.name)}</b> — ${(f.size/1e6).toFixed(0)} Mo lus en ${((Date.now()-t0)/1000).toFixed(1)} s : ${dxf.ents.length} entités utiles, ${an.layers.length} calques, ${Object.keys(dxf.blocks).length} blocs (${nBlkEnts} entités)${an.truncated.length?` · <span style="color:#7a5200">${an.truncated.length} fond(s) de plan externe(s) tronqué(s) : ${an.truncated.map(esc).join(', ')}</span>`:''}.
      <p style="margin:6px 0 2px"><b>Type de plan reconnu :</b> ${esc(PROFILE_LABEL[an.profile]||an.profile)} · fournisseur pressenti <b>${esc(an.supplierGuess||'?')}</b> · DN lus : ${an.dnSet.length?an.dnSet.join(', '):'aucun'} (${an.dnTexts.length} étiquettes) · blocs nommés : ${an.namedBlocks.filter(([k])=>!/leader|alignedtxt/i.test(k)).slice(0,6).map(([k,v])=>esc(k)+' ×'+v).join(', ')||'—'}.</p>
      ${an.profile==='logstor'?'<div class="warnbox">Plan de calepinage LOGSTOR : la lecture bloc par bloc (composants) arrive à la prochaine étape ; en attendant, lecture par les axes.</div>':''}${an.profile==='renalia'?'<div class="warnbox">Plan Renalia : la lecture des repères de soudure et des blocs de pièces arrive à la prochaine étape ; en attendant, lecture par les axes.</div>':''}
      <div class="frow" style="margin-top:8px"><label>Nom du chantier<input id="impName" value="${esc(f.name.replace(/\.[^.]+$/,''))}"></label>
      <label>Fournisseur<select id="impSup">${['AXIOM','RENALIA','LOGSTOR','INPAL'].map(x=>`<option ${x===(an.supplierGuess||'AXIOM')?'selected':''}>${x}</option>`).join('')}</select></label>
      <label>Série d'isolation<select id="impSerie"><option value="1">1</option><option value="2" ${an.supplierGuess==='LOGSTOR'||an.supplierGuess==='RENALIA'?'selected':''}>2</option><option value="3">3</option></select></label>
      <label>DN par défaut (si aucune étiquette)<input id="impDn" type="number" value="${an.dnSet[0]||50}"></label></div>`;
    if(!jbtp){const auto=an.axisCandidates.filter(c=>c.checked);h+=`<details style="margin-top:10px"><summary style="cursor:pointer"><b>Tracé lu :</b> ${auto.length?auto.map(c=>esc(c.layer)+' ('+(c.role==='A'?'aller':c.role==='R'?'retour':'axe unique')+', '+c.nPoly+' traits)').join(' + '):'<span style="color:#d03b3b">aucun calque d\'axe reconnu — ouvre pour en choisir un</span>'} <span class="muted">— changer</span></summary><p class="hint" style="margin:6px 0 4px">Choix automatique. Ne touche à ça que si le tracé lu n'est pas le bon : coche les calques qui portent l'axe des conduites de chaleur (pas l'existant, pas les autres réseaux) et dis pour chacun : aller, retour, ou un seul axe pour les deux conduites.</p><div id="impLayers" style="max-height:220px;overflow:auto;border:1px solid var(--line);border-radius:8px;padding:4px 8px">${an.axisCandidates.map(c=>`<div class="toggle" style="padding:5px 0"><label style="display:flex;align-items:center;gap:8px;min-width:0"><input type="checkbox" data-layer="${esc(c.layer)}" ${c.checked?'checked':''}><span style="overflow:hidden;text-overflow:ellipsis;white-space:nowrap">${esc(c.layer)}</span><span class="muted" style="white-space:nowrap">${c.nPoly} tracé(s)${c.n-c.nPoly?' + '+(c.n-c.nPoly)+' blocs':''}</span></label><select data-layer="${esc(c.layer)}" style="flex:none"><option value="A" ${c.role==='A'?'selected':''}>aller</option><option value="R" ${c.role==='R'?'selected':''}>retour</option><option value="S" ${c.role==='S'?'selected':''}>un axe pour les deux</option></select></div>`).join('')||'<div class="hint">Aucun calque candidat — vérifie que le DXF contient bien le tracé (polylignes).</div>'}</div></details>`;}
    h+=`<h3 style="margin:10px 0 4px">Aperçu de la lecture</h3><div id="impPrev"></div>`;
    if(jbtp){h+=`<h3 style="margin:10px 0 4px">Questions avant de créer</h3>
      <label class="f">Les pièces sont dessinées sans se toucher (écarts entre une barre et la suivante). Qu'est-ce que c'est ?</label>
      <select id="qGap"><option value="close">Convention du dessinateur : les pièces se suivent bout à bout → refermer les écarts (longueurs catalogue conservées)</option><option value="keep">Vrais trous (pièce non dessinée) → laisser en gris, je compléterai à la main</option></select>`;}
    h+=`<div class="actions" style="margin-top:8px"><button class="btn" id="impRefresh">Recalculer l'aperçu</button><button class="btn primary" id="impGo">Créer le chantier</button></div>
      <p class="hint" style="margin-top:6px">Le dessin d'origine reste affiché sous le réseau (fond de plan) ; ce que l'appli n'a pas su lire ou relier est listé dans le rapport d'import.</p></div>`;
    body.innerHTML=h;importPreview();$('#impRefresh').onclick=()=>importPreview();if($('#qGap'))$('#qGap').onchange=()=>importPreview();if($('#impLayers'))$('#impLayers').addEventListener('change',()=>importPreview());$('#impGo').onclick=()=>createImportedSite();}
  catch(err){console.error(err);body.innerHTML=`<div class="err">Lecture impossible : ${esc(err.message||err)}</div>`;}}
function createImportedSite(){if(!importCtx)return;const net=importPreview();if(!net)return;const {dxf,fileName}=importCtx;const id=importCtx.id;
  try{if(net.T){const bbox=net.bbox||[0,0,net.w,net.h];const netLayers=net.netLayers||[];const D=buildDrawing(dxf,net.T,bbox,netLayers,{cap:45000});net.drawing=D.drawing;net.sheetType='vector';if(D.truncated)net.warnings.push('Fond de plan allégé : au-delà de 45 000 points, le dessin d\'origine est tronqué (le réseau reste complet).');}}catch(err){console.warn('fond vectoriel',err);}
  net.demo=null;SITES[id]=net;const o=document.createElement('option');o.value=id;o.textContent=net.name;siteSel.appendChild(o);siteSel.value=id;closeModal();switchSite(id).then(()=>{requestAnimationFrame(()=>{fitView();renderPlan();});setTimeout(()=>openModal(importReportHTML()),600);});sync.saveSite(net).then(okk=>{if(okk)setCloudBadge('chantier enregistré sur le serveur');});toast('Chantier créé : '+net.name+' — '+net.lines.length+' lignes');}
async function onPlanFile(e){const f=e.target.files[0];if(!f)return;const body=$('#importBody');const ext=f.name.split('.').pop().toLowerCase();if(ext==='dxf'){importDXF(f,body);return;}if(ext==='dwg'){body.innerHTML=`<div class="card" style="margin-top:10px"><b>${esc(f.name)}</b><p class="hint">Le navigateur ne lit pas le DWG (format fermé) : convertis-le en DXF (Enregistrer sous → DXF 2018 ASCII) ou envoie-le-moi, je le convertis. Le serveur le fera automatiquement ensuite.</p></div>`;return;}
  body.innerHTML='<p class="hint" style="margin-top:8px">Chargement du moteur PDF…</p>';try{const lib=await loadPdfJs();pdfDoc=await lib.getDocument({data:await f.arrayBuffer()}).promise;pdfPage=1;await renderPdfPreview(f.name);}catch(err){console.error(err);body.innerHTML=`<div class="err">Impossible de lire ce PDF ici (${esc(err.message||err)}).</div>`;}}
async function renderPdfPreview(name){const body=$('#importBody');const page=await pdfDoc.getPage(pdfPage);const vp=page.getViewport({scale:1});const scale=Math.min(3,2600/Math.max(vp.width,vp.height));const v2=page.getViewport({scale});const c=document.createElement('canvas');c.width=Math.round(v2.width);c.height=Math.round(v2.height);await page.render({canvasContext:c.getContext('2d'),viewport:v2}).promise;
  body.innerHTML=`<div class="pdfprev"></div><div class="pdfnav"><button class="btn sm" id="pdfPrev" ${pdfPage<=1?'disabled':''}>◀</button><span class="hint">Page ${pdfPage} / ${pdfDoc.numPages} — ${esc(name)}</span><button class="btn sm" id="pdfNext" ${pdfPage>=pdfDoc.numPages?'disabled':''}>▶</button></div><label class="f">Échelle du plan (1/…)</label><input class="f" id="pdfScale" type="number" value="150"><div class="actions" style="margin-top:8px"><button class="btn primary block" id="usePdf">Utiliser cette page comme feuille</button></div>`;
  $('.pdfprev',body).appendChild(c);$('#pdfPrev').onclick=()=>{pdfPage--;renderPdfPreview(name);};$('#pdfNext').onclick=()=>{pdfPage++;renderPdfPreview(name);};
  $('#usePdf').onclick=()=>{const id='pdf'+Object.keys(state.sheets).length;const denom=parseFloat($('#pdfScale').value)||150;const ppm=(scale*72/25.4*1000)/denom; // px par mètre réel : (px/pt × pt/mm) × 1000 mm / échelle
    state.sheets[id]={id,name:`${name.replace(/\.pdf$/i,'')} — p.${pdfPage}`,type:'image',src:c.toDataURL('image/jpeg',.82),w:c.width,h:c.height,ppm,lines:[]};state.sheetId=id;state.sel=null;closeModal();bgG.dataset.sheet='';renderPlan();toast('Feuille importée — « Tracer un réseau » pour dessiner l\'axe');};}
function loadPdfJs(){if(window.pdfjsLib)return Promise.resolve(window.pdfjsLib);const base=(new URLSearchParams(location.search).get('pdfjs'))||'https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/';return new Promise((res,rej)=>{const s=document.createElement('script');s.src=base+'pdf.min.js';s.onload=()=>{window.pdfjsLib.GlobalWorkerOptions.workerSrc=base+'pdf.worker.min.js';res(window.pdfjsLib);};s.onerror=()=>rej(new Error('moteur PDF non chargé'));document.head.appendChild(s);});}

/* ---------- global ---------- */
function renderCatalogue(){const el=$('#catalogue');if(!el)return;const sup=(NET&&NET.supplier||'').toUpperCase();const key=state.catSup||(sup==='RENALIA'?'renalia':sup==='LOGSTOR'?'logstor':sup==='AXIOM'?'axiom':sup==='INPAL'?'inpal':Object.keys(CATALOGUE.suppliers)[0]);const C=CATALOGUE.suppliers[key]||Object.values(CATALOGUE.suppliers)[0];
  const f=v=>v===undefined||v===null?'—':Array.isArray(v)?v.join(' × '):String(v).replace('.',',');const tbl=(cols,rows)=>`<table class="cat"><thead><tr>${cols.map(c=>`<th>${c}</th>`).join('')}</tr></thead><tbody>${rows.map(r=>`<tr>${r.map(v=>`<td>${v}</td>`).join('')}</tr>`).join('')}</tbody></table>`;
  let h=`<h2 class="vt">Catalogue des pièces</h2><div class="muted" style="margin:0 0 8px">Ce que le moteur utilise pour reconnaître les pièces du plan et les dessiner. Une valeur fausse ici = un puzzle faux : c'est ici qu'on corrige. Source : ${esc(C.source||'')}.</div>
  <div class="row" style="display:flex;gap:6px;flex-wrap:wrap;margin-bottom:8px">${Object.entries(CATALOGUE.suppliers).map(([k,v])=>`<button class="chip ${k===key?'active':''}" data-cat="${k}">${esc(v.name)}${(NET&&NET.supplier||'').toUpperCase()===k.toUpperCase()?' · ce chantier':''}</button>`).join('')}</div>`;
  if(C.pending){h+=`<div class="hint">${esc(C.pending)}</div>`;}
  const P=C.pipes||{};if(Object.keys(P).length){h+=`<h3>Tubes droits</h3>`+tbl(['DN','Ø acier','Gaine(s) mm','Longueurs (m)'],Object.entries(P).map(([dn,p])=>[dn,f(p.dext),f(p.casings||p.casing_s1),f((p.lengths||[]).join(' / '))]));}
  const B=C.bends||{};if(Object.keys(B).length){h+=`<h3>Coudes</h3>`+tbl(['DN','Jambes','Angles','Rayon'],Object.entries(B).map(([dn,b])=>{const bb=Array.isArray(b)?b[0]:b;return [dn,bb.legs_mm?f(bb.legs_mm)+' mm'+(bb.legs_long_mm?' (ou '+f(bb.legs_long_mm)+')':''):f(bb.legs_90_m)+' m (45° : '+f(bb.legs_45_m)+')',esc(bb.angles||''),bb.radius_mm?bb.radius_mm+' mm':'—'];}));}
  Object.entries(C.tees||{}).forEach(([k,T])=>{const rows=Object.entries(T);if(!rows.length)return;const dims=[...new Set(rows.flatMap(([_,v])=>(Array.isArray(v)?v:[v]).flatMap(o=>Object.keys(o).filter(x=>/_(mm|m)$/.test(x)))))];h+=`<h3>Té — ${esc(k.replace(/_/g,' '))}</h3>`+tbl(['DN / DN1',...dims.map(d=>d.replace('_mm',' (mm)').replace('_m',' (m)'))],rows.map(([dn,v])=>{const o=Array.isArray(v)?v[0]:v;return [dn,...dims.map(d=>f(o[d]))];}));});
  const Rd=C.reducers||{};if(Object.keys(Rd).length){h+=`<h3>Réductions</h3>`+(Rd.all?`<div class="muted">${esc(Rd.all.note||'')}</div>`:tbl(['DN / DN1','Gaines','L (mm)'],Object.entries(Rd).map(([k,r])=>[k,f(r.casing)+' / '+f(r.casing1),f(r.L_mm)])));}
  const V=C.valves||{};if(Object.keys(V).length){h+=`<h3>Vannes</h3>`+tbl(['DN','L','H (mm)'],Object.entries(V).map(([dn,v])=>{const o=Array.isArray(v)?v[0]:v;return [dn,o.L_mm?o.L_mm+' mm':f(o.L_m)+' m',f(o.H_mm)];}));}
  Object.entries(C.joints||{}).forEach(([k,J])=>{const rows=Object.entries(J);if(!rows.length)return;h+=`<h3>Manchons — ${esc(k.replace(/_/g,' '))}</h3>`+tbl(['DN','Gaine','Ø manchon','L (mm)'],rows.map(([dn,j])=>[dn,f(j.casing),f(j.sleeve_d),f(j.L_mm)]));});
  if(C.notes&&C.notes.length)h+=`<h3>Notes</h3>`+C.notes.map(n=>`<div class="muted" style="margin:2px 0">${esc(n)}</div>`).join('');
  el.innerHTML=h;el.querySelectorAll('[data-cat]').forEach(b=>b.onclick=()=>{state.catSup=b.dataset.cat;renderCatalogue();});}
/* ---------- Récap chantier : soudures par DN / par ligne / par statut, nomenclature des pièces, export CSV ---------- */
const KIND_ORDER={pipe:1,bend:2,steelbend:2,tee:3,teeout:3.5,reducer:4,valve:5,endcap:6,endpoint:7,bypass:8};
const kindOrder=k=>KIND_ORDER[k]||9;
function recapData(){
  const lines=Object.values(state.lines);const welds=[];const pieces={};let totalL=0;
  lines.forEach(l=>{['A','R'].forEach(c=>{const cd=l.cond[c];if(!cd)return;
    cd.joints.forEach(j=>{const e=cd.els[j.idx]||cd.els[cd.els.length-1];welds.push({j,l,c,dn:+(j.dn||e&&e.dn||l.dn)||0,pk:e?e.m1:0});});
    cd.els.forEach(e=>{if(e.kind==='teeout'||e.kind==='endpoint'||e.link)return;if(c==='A'&&e.kind==='pipe')totalL+=e.len||0;
      const dn=+e.dn||0;const lab=e.kind==='pipe'?(e.nue?'Manchette nue':e.manchette?'Manchette':e.cut?'Barre coupée':'Barre entière'):e.kind==='bend'?`Coude ${e.angle?e.angle+'°':''}${e.plane==='3D'?' (élévation)':''}`:e.kind==='steelbend'?`Courbe acier ${e.angle?e.angle+'°':''}`:e.kind==='tee'?(e.vert?(e.vert==='up'?'Té de purge':'Té de vidange')+(e.dnb?' DNb'+e.dnb:''):(e.saut?'Té à saut':'Té droit')+(e.dnb?' DNb'+e.dnb:'')):e.kind==='reducer'?`Réduction → DN${e.dn2||'?'}`:e.kind==='valve'?'Vanne':e.kind==='endcap'?(e.sub==='provisoire'?'Fin de ligne provisoire':'Kit fin de ligne'):e.kind==='bypass'?'By-pass':(e.kindLabel||e.kind);
      const ref=e.kind==='pipe'?String(e.ref||'').split(' · ')[0]:(e.ref||'');const key=e.kind+'|'+dn+'|'+lab+'|'+ref;const g=pieces[key]||(pieces[key]={kind:e.kind,dn,lab,ref,n:0,ml:0,nA:0,nR:0,order:kindOrder(e.kind)});g.n++;if(c==='A')g.nA++;else g.nR++;if(e.kind==='pipe')g.ml+=e.len||0;});});});
  return {lines,welds,pieces:Object.values(pieces).sort((a,b)=>(a.order-b.order)||(a.dn-b.dn)||a.lab.localeCompare(b.lab)),totalL};}
function statusCounts(ws){const c={total:ws.length};ORDER.forEach(s=>c[s]=0);let fc=0;ws.forEach(({j})=>{c[j.status]=(c[j.status]||0)+1;if(j.fc)fc++;});c.fc=fc;c.done=(c.soudee||0)+(c.controlee||0)+(c.manchonnee||0);return c;}
function renderRecap(){const el=$('#recap');if(!el)return;if(!NET||!Object.keys(state.lines).length){el.innerHTML='<h2 class="vt">Récap</h2><div class="muted">Aucun chantier.</div>';return;}
  const D=recapData();const all=statusCounts(D.welds);const pct=v=>all.total?Math.round(100*v/all.total):0;
  const dns=[...new Set(D.welds.map(w=>w.dn))].sort((a,b)=>a-b);
  const row=(label,ws,cls='')=>{const c=statusCounts(ws);return `<tr class="${cls}"><td>${label}</td><td>${c.total}</td><td class="${c.a_souder?'':'dim'}">${c.a_souder}</td><td class="${c.soudee?'':'dim'}">${c.soudee}</td><td class="${c.controlee?'':'dim'}">${c.controlee}</td><td class="${c.manchonnee?'':'dim'}">${c.manchonnee}</td><td class="${c.a_reprendre?'':'dim'}" style="${c.a_reprendre?'color:#d03b3b':''}">${c.a_reprendre}</td><td class="${c.fc?'':'dim'}">${c.fc}</td><td>${c.total?Math.round(100*c.done/c.total):0} %</td></tr>`;};
  const head=`<tr><th>${''}</th><th>Total</th><th title="à souder">À soud.</th><th title="soudées">Soud.</th><th title="contrôlées">Contr.</th><th title="manchonnées">Manch.</th><th title="à reprendre">À repr.</th><th title="fausses coupes">FC</th><th title="avancement : soudées, contrôlées ou manchonnées">%</th></tr>`;
  let h=`<h2 class="vt">Récap — ${esc(NET.name)}</h2>
  <div class="kpis"><div class="kpi"><b>${D.lines.length}</b><span>ligne${D.lines.length>1?'s':''}</span></div><div class="kpi"><b>${fmt(D.totalL)} m</b><span>de tracé (aller)</span></div><div class="kpi"><b>${all.total}</b><span>soudures</span></div><div class="kpi"><b>${pct(all.done)} %</b><span>soudées ou plus</span></div><div class="kpi"><b>${pct(all.manchonnee)} %</b><span>manchonnées</span></div></div>
  <div class="prog"><i style="width:${pct(all.manchonnee)}%;background:${STATUS.manchonnee.color}"></i><i style="width:${pct(all.controlee)}%;background:${STATUS.controlee.color}"></i><i style="width:${pct(all.soudee)}%;background:${STATUS.soudee.color}"></i><i style="width:${pct(all.a_reprendre)}%;background:${STATUS.a_reprendre.color}"></i></div><div class="muted" style="font-size:11.5px;margin-bottom:8px">${ORDER.map(s=>`<span style="margin-right:8px"><i style="display:inline-block;width:9px;height:9px;border-radius:50%;background:${STATUS[s].color};vertical-align:middle;margin-right:3px"></i>${STATUS[s].label} ${all[s]||0}</span>`).join('')}</div>
  <h3>Soudures par DN</h3><div style="overflow:auto"><table class="rc">${head.replace('<th></th>','<th>DN</th>')}${dns.map(dn=>row('DN'+dn,D.welds.filter(w=>w.dn===dn))).join('')}${row('Total',D.welds,'tot')}</table></div>
  <h3>Soudures par ligne</h3><div style="overflow:auto"><table class="rc">${head.replace('<th></th>','<th>Ligne</th>')}${D.lines.map(l=>row(esc(l.name)+(l.dn?' · DN'+l.dn:''),D.welds.filter(w=>w.l===l))).join('')}${row('Total',D.welds,'tot')}</table></div>
  <h3>Pièces (nomenclature du calepinage)</h3><div style="overflow:auto"><table class="rc"><tr><th>Pièce</th><th>DN</th><th>Qté</th><th>aller</th><th>retour</th><th>ml</th><th style="text-align:left">Réf. catalogue</th></tr>${D.pieces.map(g=>`<tr><td>${esc(g.lab)}</td><td>${g.dn||'—'}</td><td><b>${g.n}</b></td><td class="dim">${g.nA}</td><td class="dim">${g.nR}</td><td>${g.ml?fmt(g.ml):'—'}</td><td style="text-align:left" class="dim">${esc(g.ref||'')}</td></tr>`).join('')}</table></div>
  <h3>Manchons à poser</h3><div style="overflow:auto"><table class="rc"><tr><th>DN</th><th>Soudures</th><th>Manchons</th><th>Posés</th><th>Restants</th></tr>${dns.map(dn=>{const ws=D.welds.filter(w=>w.dn===dn);const pairs=ws.filter(w=>w.j.sleeveWith).length/2;const nm=ws.length-Math.floor(pairs);const done=ws.filter(w=>w.j.status==='manchonnee').length-Math.floor(ws.filter(w=>w.j.status==='manchonnee'&&w.j.sleeveWith).length/2);return `<tr><td>DN${dn}</td><td>${ws.length}</td><td><b>${nm}</b></td><td>${done}</td><td>${nm-done}</td></tr>`;}).join('')}</table></div><div class="muted" style="font-size:11.5px;margin-top:-6px">Deux soudures d'une manchette nue partagent un manchon.</div>
  <div class="row" style="margin-top:12px;display:flex;gap:6px;flex-wrap:wrap"><button class="btn sm" id="csvWelds">⤓ CSV soudures</button><button class="btn sm" id="csvPieces">⤓ CSV pièces</button></div>`;
  el.innerHTML=h;
  const dl=(name,rows)=>{const csv='﻿'+rows.map(r=>r.map(v=>{const s=String(v??'');return /[;"\n]/.test(s)?'"'+s.replace(/"/g,'""')+'"':s;}).join(';')).join('\r\n');const a=document.createElement('a');a.href=URL.createObjectURL(new Blob([csv],{type:'text/csv;charset=utf-8'}));a.download=name;document.body.appendChild(a);a.click();setTimeout(()=>{URL.revokeObjectURL(a.href);a.remove();},500);};
  const slug=String(NET.name||'chantier').replace(/[^\w.-]+/g,'_');
  $('#csvWelds').onclick=()=>{const rows=[['N°','Ligne','Conduite','DN','PK (m)','Statut','Fausse coupe (°)','Sortie de té','Même manchon que','Fils','Dernier événement','Par','Le','Photos','Note']];
    D.welds.forEach(({j,l,c,dn,pk})=>{const ev=(j.events||[]).slice(-1)[0];rows.push([j.weldId,l.name,c==='A'?'aller':'retour',dn,fmt(pk),(STATUS[j.status]||{}).label||j.status,j.fc?fmt(Math.abs(j.dev)):'',j.teeOut?'oui':'',j.sleeveWith||'',j.wire==='inversion'?'inversion':j.wire==='raccorde'?'raccordés':'',ev?ev.type:'',ev?ev.by:'',ev&&ev.at?new Date(ev.at).toLocaleString('fr-FR'):'',(j.photos||[]).length+(j.events||[]).reduce((s,e)=>s+((e.photos||[]).length),0),j.note||'']);});dl(slug+'_soudures.csv',rows);};
  $('#csvPieces').onclick=()=>{const rows=[['Pièce','DN','Quantité','Aller','Retour','ml','Référence catalogue']];D.pieces.forEach(g=>rows.push([g.lab,g.dn||'',g.n,g.nA,g.nR,g.ml?fmt(g.ml):'',g.ref||'']));dl(slug+'_pieces.csv',rows);};}
function renderAll(){if(state.tab==='catalogue')renderCatalogue();if(state.tab==='recap')renderRecap();if(state.tab==='hydro'){hydroCache=null;renderHydro();}if(state.tab==='stock')renderStock();$$('#tabbar button').forEach(b=>b.classList.toggle('active',b.dataset.tab===state.tab));$$('.view').forEach(v=>v.classList.toggle('active',v.id==='view-'+state.tab));renderPlan();if(state.tab==='bouclage')renderBouclage();renderListe();}
$('#tabbar').addEventListener('click',e=>{const b=e.target.closest('[data-tab]');if(!b)return;state.tab=b.dataset.tab;closeSheet();renderAll();});
const roleSel=$('#roleSel');function syncRoleSel(){roleSel.innerHTML='';if(state.profile){const o=document.createElement('option');o.value='__me';o.textContent=`${state.profile.name||state.profile.email} — ${ROLE_LABEL[state.profile.role]||state.profile.role}`;roleSel.appendChild(o);}USERS.forEach(u=>{const o=document.createElement('option');o.value=u.id;o.textContent=`${u.name} — ${ROLE_LABEL[u.role]}`;roleSel.appendChild(o);});roleSel.value=state.userId;}
USERS.forEach(u=>{const o=document.createElement('option');o.value=u.id;o.textContent=`${u.name} — ${ROLE_LABEL[u.role]}`;roleSel.appendChild(o);});
roleSel.addEventListener('change',e=>{state.userId=e.target.value;state.filter='all';closeSheet();renderAll();toast(`Connecté : ${me().name}`);});
$('#btnWide').addEventListener('click',()=>{$('#app').classList.toggle('wide');setTimeout(()=>{fitView();renderPlan();},50);});
$('#btnHelp').addEventListener('click',()=>openModal(`<h2>TRACÉ v0.5 — chantiers & base fournisseurs</h2>
 <p><b>Chantiers</b> : le sélecteur en haut à gauche bascule entre les chantiers importés (chacun garde ses soudures, statuts, photos, raccordements). « Rapport d'import » détaille ce qui a été reconnu dans le plan et ce qui reste à valider.</p>
 <p><b>Bain-de-Bretagne</b> (LOGSTOR) : DWG lu bloc par bloc via les codes composants LOGSTOR ; un seul axe dessiné → aller/retour déduits (approximation signalée). <b>Saint-Lô, tranche jaune</b> (Renalia / ZPU) : les deux conduites sont dessinées (calques CANALISATION aller / retour), barres coupées aux repères de soudure du plan, coudes aux changements de direction, DN et gaine lus sur les étiquettes « ALLER DNxx ENV. DNyy », antennes rattachées aux jonctions.</p>
 <p><b>Base fournisseurs</b> : gaine à la taille catalogue du fournisseur du chantier (série d'isolation), position des fils selon le fournisseur (LOGSTOR au sommet, Nordic 10 h / 2 h ailleurs), types de manchons.</p>
 <p>Zoome (pince, molette, double-tap, +) : de loin l'avancement, puis les manchons, les n°, les fils. 👁 (à côté du zoom) : choisis ce qui s'affiche (noms des pièces, longueurs, pastilles, n°, manchons, fils, fond) pour épurer une zone. Tape un manchon ou une barre. Schéma de bouclage par ligne. Avancement, photos et raccordements : fictifs.</p><div class="actions" style="margin-top:8px"><button class="btn primary block" data-close>Compris</button></div>`));
let tt;function toast(m){const t=$('#toast');t.textContent=m;t.classList.add('show');clearTimeout(tt);tt=setTimeout(()=>t.classList.remove('show'),2600);}
const siteSel=$('#siteSel');{const hidden=JSON.parse(localStorage.getItem('trace:hiddenSites')||'[]');hidden.forEach(id=>{delete SITES[id];});Object.keys(hiddenMap()).forEach(id=>{if(SITES[id]&&isHidden(SITES[id]))delete SITES[id];});}
Object.entries(SITES).forEach(([id,S])=>{const o=document.createElement('option');o.value=id;o.textContent=S.name;siteSel.appendChild(o);});
if(!Object.keys(SITES).length){SITES.__vide={id:'__vide',name:'Aucun chantier — crée un réseau avec le traceur',lines:[],w:100,h:100,sheetType:'plain'};const o=document.createElement('option');o.value='__vide';o.textContent=SITES.__vide.name;siteSel.appendChild(o);}
siteSel.addEventListener('change',e=>{openSiteFromHome(e.target.value).then(ok=>{if(ok)toast('Chantier : '+NET.name);});});
const wantSite=new URLSearchParams(location.search).get('site');if(wantSite)history.replaceState(null,'',location.pathname);
const lastSite=localStorage.getItem('trace:lastSite'); // dernier chantier ouvert sur cet appareil (carte « Reprendre » de l'accueil)
state.siteId=(wantSite&&SITES[wantSite])?wantSite:(lastSite&&SITES[lastSite])?lastSite:Object.keys(SITES)[0];siteSel.value=state.siteId;
setupSite(state.siteId);renderAll();requestAnimationFrame(()=>{fitView();renderPlan();});
// chantiers remis par le traceur (IndexedDB) ; ?site= ouvre directement, sinon écran d'accueil (ou connexion à la première visite)
loadHandoffs().then(async hs=>{hs.forEach(net=>{if(isHidden(net))return;if(SITES.__vide){delete SITES.__vide;const o=[...siteSel.options].find(x=>x.value==='__vide');if(o)o.remove();}addSiteOption(net);});
  if(wantSite){try{localStorage.setItem('trace:skipLogin','1');}catch(e){} // arrivé par le traceur : plus d'écran de connexion imposé au prochain lancement
    if(SITES[wantSite]){if(state.siteId!==wantSite){siteSel.value=wantSite;await switchSite(wantSite);}showScreen('site');}
    else{state.pendingOpen=wantSite;showScreen('home');renderHome();toast('Chantier en cours de récupération depuis le serveur…');}}
  else{const u=await sync.user().catch(()=>null);const seen=localStorage.getItem('trace:skipLogin');
    if(u||seen){showScreen('home');}else{showScreen('login');}
    renderHome();}
});
// ---- compte & serveur (Supabase, Europe) ----
function setCloudBadge(t){const b=$('#cloudBadge');if(b)b.textContent=t;}
function renderCloud(){let box=$('#cloudBox');if(!box){box=document.createElement('div');box.id='cloudBox';box.style.cssText='display:flex;gap:6px;align-items:center;flex-wrap:wrap;padding:4px 10px;font-size:12px;color:#52514e;border-bottom:1px solid #e6e3da;background:#fbfaf6';const anchor=$('#planTools')||document.body;anchor.parentNode.insertBefore(box,anchor);}
  const u=state.cloudUser;const pr=state.profile;box.innerHTML=u?`☁️ Connecté : <b>${esc(pr&&pr.name?pr.name:(u.email||''))}</b>${pr?` <span class="muted">(${esc(ROLE_LABEL[pr.role]||pr.role)})</span>`:''} · <span id="cloudBadge">synchronisé</span>${pr&&pr.active===false?' <b style="color:#b8560f">compte en attente d\'activation par le chef</b>':''}${pr&&pr.role==='chef'?' <button class="btn sm" id="cloudUsers">👥 Comptes</button>':''} <button class="btn sm" id="cloudOut">Se déconnecter</button>`:`☁️ Non connecté — les modifications restent sur cet appareil. <button class="btn sm primary" id="cloudIn">Se connecter (e-mail)</button> <span id="cloudBadge"></span>`;
  const bi=$('#cloudIn');if(bi)bi.onclick=async()=>{const email=prompt('Ton adresse e-mail (tu recevras un lien de connexion) :');if(!email)return;try{await sync.login(email.trim());toast('Lien envoyé — ouvre le mail sur cet appareil et clique le lien');}catch(e){toast('Envoi impossible : '+(e.message||e));}};
  const bo=$('#cloudOut');if(bo)bo.onclick=async()=>{await sync.logout();state.cloudUser=null;state.profile=null;state.userId=USERS[0].id;syncRoleSel();renderCloud();};
  const bu=$('#cloudUsers');if(bu)bu.onclick=openUsersModal;}
// gestion des comptes (chef) : activer les nouveaux, donner les rôles — les inscriptions se font par le lien e-mail, le compte n'a AUCUN accès tant qu'il n'est pas activé ici
async function openUsersModal(){const rows=await sync.listProfiles();if(!rows.length){openModal('<h3>Comptes</h3><div class="muted">Liste indisponible — exécute d\'abord tools/supabase_setup.sql dans Supabase (SQL Editor), puis reviens ici.</div><div class="actions" style="margin-top:8px"><button class="btn block" data-close>Fermer</button></div>');return;}
  const ROLES=['soudeur','manchonneur','chef','bureau'];
  openModal(`<h3>Comptes (${rows.length})</h3><div class="muted" style="margin-bottom:6px">Un nouveau se connecte une fois avec le lien e-mail → il apparaît ici, inactif. Tu l'actives et tu donnes son rôle. Un compte inactif ne voit rien.</div>
   <table class="rc">${rows.map(r=>`<tr><td style="text-align:left"><b>${esc(r.name||'')}</b><br><span class="muted" style="font-size:11px">${esc(r.email||'')}</span></td>
     <td><select class="f" data-uid="${r.id}" data-k="role">${ROLES.map(x=>`<option value="${x}" ${r.role===x?'selected':''}>${ROLE_LABEL[x]||x}</option>`).join('')}</select></td>
     <td><label style="white-space:nowrap"><input type="checkbox" data-uid="${r.id}" data-k="active" ${r.active?'checked':''}> actif</label></td></tr>`).join('')}</table>
   <div class="actions" style="margin-top:8px"><button class="btn block" data-close>Fermer</button></div>`);
  $('#modal').querySelectorAll('[data-uid]').forEach(el=>{el.addEventListener('change',async()=>{const uid=el.dataset.uid;const row=rows.find(r=>r.id===uid);if(!row)return;const role=$('#modal').querySelector(`select[data-uid="${uid}"]`).value;const active=$('#modal').querySelector(`input[data-uid="${uid}"]`).checked;const err=await sync.adminSetUser(uid,role,active);toast(err?('Refusé : '+err):'Compte mis à jour');});});}
sync.onAuth(async u=>{state.cloudUser=u;if(u){state.profile=await sync.profile();if(state.profile){state.userId='__me';}}else{state.profile=null;if(state.userId==='__me')state.userId=USERS[0].id;}syncRoleSel();renderCloud();
  if(u){rtSubscribe(state.siteId);pullRemote(state.siteId);
    // liste LÉGÈRE des chantiers du serveur (métas) — les plans complets ne sont chargés qu'à l'ouverture
    let metas=null;try{metas=await sync.listSiteMeta();}catch(e){console.warn(e);}
    const norm=(metas||[]).map(r=>({id:r.id,name:r.name,updated_at:r.updated_at,deleted:!!r.deleted,deletedAt:r.deletedAt||null,builtin:!!r.builtin,traceur:{savedAt:r.sat||null},w:+r.w||0,h:+r.h||0,geo:r.geo||null,origin:r.origin||null,bgo:r.bgo||null,bbox:r.bbox||null,nbox:r.nbox||null,nw:+r.nw||0}));
    // réparation : un chantier masqué AUTOMATIQUEMENT sur cet appareil (pierre tombale / absence de liste) mais bien VIVANT sur le serveur → dé-masqué ; un masquage MANUEL (« Supprimer » → trace:hiddenSites) est respecté
    try{if(metas){const manual=new Set(JSON.parse(localStorage.getItem('trace:hiddenSites')||'[]'));const hm=hiddenMap();let chg=false;norm.forEach(m=>{if(!m.deleted&&!m.builtin&&(m.id in hm)&&!manual.has(m.id)){delete hm[m.id];chg=true;}});if(chg)localStorage.setItem('trace:hiddenAt',JSON.stringify(hm));}}catch(e){console.warn(e);}
    try{await pushHandoffs(metas===null?null:norm);}catch(e){console.warn(e);} // liste inconnue (échec) = null, JAMAIS [] : pushHandoffs ne doit pas croire que tout a été supprimé
    state.serverMetas=norm.filter(m=>!m.deleted&&!m.builtin);
    try{
      norm.filter(m=>m.deleted).forEach(m=>{const at=m.deletedAt?Date.parse(m.deletedAt):Date.now();const cur=SITES[m.id];const curSaved=cur&&cur.traceur&&cur.traceur.savedAt?Date.parse(cur.traceur.savedAt):0;if(!(curSaved&&curSaved>at)){const hm=hiddenMap();if(!(m.id in hm)||hm[m.id]<at){hm[m.id]=at;try{localStorage.setItem('trace:hiddenAt',JSON.stringify(hm));}catch(e){}}if(cur)removeSiteOption(m.id);}});
      state.serverMetas.forEach(m=>{if(!SITES[m.id]&&!isHidden({id:m.id,traceur:m.traceur})&&![...siteSel.options].some(o=>o.value===m.id)){if(SITES.__vide&&state.siteId!=='__vide'){delete SITES.__vide;const o0=[...siteSel.options].find(x=>x.value==='__vide');if(o0)o0.remove();}const o=document.createElement('option');o.value=m.id;o.textContent=m.name;siteSel.appendChild(o);}});
    }catch(e){console.warn(e);} // quoi qu'il arrive, l'accueil est rendu avec ce qu'on a
    try{state.homeStats=await sync.siteStats();}catch(e){console.warn(e);}
    renderHome();
    if(state.pendingOpen){const p=state.pendingOpen;state.pendingOpen=null;openSiteFromHome(p);}
  } else renderHome();});
renderCloud();sync.user().then(u=>{state.cloudUser=u;renderCloud();});
// retour sur l'onglet TRACÉ après un enregistrement dans le traceur (autre onglet) : on relit les chantiers remis
document.addEventListener('visibilitychange',async()=>{if(document.visibilityState!=='visible')return;try{const hs=await loadHandoffs();let added=[];hs.forEach(net=>{if(isHidden(net))return;const known=SITES[net.id];const newer=!known||(net.traceur&&known.traceur&&net.traceur.savedAt>known.traceur.savedAt);if(!known){if(SITES.__vide){delete SITES.__vide;const o=[...siteSel.options].find(x=>x.value==='__vide');if(o)o.remove();}addSiteOption(net);added.push(net.name);}else if(newer&&!siteStore[net.id]){SITES[net.id]=net;}else if(newer&&siteStore[net.id]&&state.siteId!==net.id){delete siteStore[net.id];SITES[net.id]=net;}});if(added.length){toast('Reçu du traceur : '+added.join(', '));if(state.siteId==='__vide'||!SITES[state.siteId]){const first=hs.find(n=>!isHidden(n));if(first){siteSel.value=first.id;await switchSite(first.id);}}}}catch(e){console.warn(e);}});

/* ================== écrans d'entrée : connexion + accueil (choix du chantier, direction A validée le 19/08) ================== */
const logoSVG=(c1,c2,sz)=>`<svg width="${sz}" height="${sz}" viewBox="0 0 48 48"><g fill="none" stroke-linecap="round"><path d="M6 30 L20 30" stroke="${c1}" stroke-width="7"/><path d="M28 18 L42 18" stroke="${c1}" stroke-width="7"/><path d="M20 30 Q24 30 24 26 L24 22 Q24 18 28 18" stroke="${c1}" stroke-width="7"/><circle cx="24" cy="24" r="5.2" fill="${c2}"/></g></svg>`;
$('#loginLogo').innerHTML=logoSVG('#0b0b0b','#eb6834',72);$('#homeLogo').innerHTML=logoSVG('#0b0b0b','#eb6834',26);
state.screen='site';state.homeTab=localStorage.getItem('trace:homeTab')||'map';state.homeQ='';state.homeSort='recent';state.serverMetas=[];state.homeStats=null;state.homePin=null;state.pendingOpen=null;
function showScreen(sc){state.screen=sc;$('#loginView').classList.toggle('show',sc==='login');$('#homeView').classList.toggle('show',sc==='home');}
// carte des chantiers (accueil) : vraie carte IGN « plan éteint » (direction B validée le 20/08), web mercator, zoom/glisser/pincer, regroupement
// centre lon/lat d'un chantier : depuis sa copie complète si elle est là, sinon depuis la méta serveur
// centre du RÉSEAU d'un chantier (repère plan) : médiane des milieux de lignes — insensible à un cartouche, un fond étendu ou une ligne partie à des km
function netCenterOf(net){const lines=net&&net.lines;if(!lines||!lines.length)return null;const cs=[];
  lines.forEach(L=>{let x0=1e15,y0=1e15,x1=-1e15,y1=-1e15;const take=(x,y)=>{if(!isFinite(x)||!isFinite(y))return;x0=Math.min(x0,x);y0=Math.min(y0,y);x1=Math.max(x1,x);y1=Math.max(y1,y);};
    if(L.axis&&L.axis.length)L.axis.forEach(p=>take(+p[0],+p[1]));
    else if(L.pts&&L.pts.length)L.pts.forEach(p=>Array.isArray(p)?take(+p[0],+p[1]):take(+p.x,+p.y));
    else if(L.els&&L.els.length)L.els.forEach(e=>{if(e.from)Array.isArray(e.from)?take(+e.from[0],+e.from[1]):take(+e.from.x,+e.from.y);if(e.to)Array.isArray(e.to)?take(+e.to[0],+e.to[1]):take(+e.to.x,+e.to.y);});
    if(x0<=x1)cs.push([(x0+x1)/2,(y0+y1)/2]);});
  if(!cs.length)return null;const med=a=>{const s2=[...a].sort((p,q)=>p-q);return s2[Math.floor(s2.length/2)];};
  return [med(cs.map(c=>c[0])),med(cs.map(c=>c[1]))];}
function llOfMeta(m){const full=SITES[m.id];const net=full&&full.lines?full:{geo:m.geo||undefined,origin:m.origin||undefined,traceur:{bgOrigin:m.bgo||null},w:m.w||0,h:m.h||0};
  try{const g=geoOfSite(net);if(!g)return null;
    // centre RÉEL du réseau : repères de calage (posés sur le réseau) > médiane des lignes (copie locale) > emprise du réseau seul (nbox) > emprise étendue > milieu de feuille
    let c=null;const gp=net.geo&&net.geo.pts&&net.geo.pts.length?net.geo.pts:null;
    if(gp)c=[gp.reduce((s,p)=>s+p.plan[0],0)/gp.length,gp.reduce((s,p)=>s+p.plan[1],0)/gp.length];
    if(!c&&full&&full.lines)c=netCenterOf(full);
    if(!c){const nb=(full&&full.nbox)||m.nbox;if(nb&&isFinite(+nb[0])&&+nb[2]>=+nb[0])c=[(+nb[0]+ +nb[2])/2,(+nb[1]+ +nb[3])/2];}
    if(!c){const bb=(full&&full.bbox)||m.bbox;if(bb&&isFinite(+bb[0])&&+bb[2]>+bb[0])c=[(+bb[0]+ +bb[2])/2,(+bb[1]+ +bb[3])/2];else c=[(net.w||0)/2,(net.h||0)/2];}
    const ll=planToLonLat(g,c);return (isFinite(ll[0])&&isFinite(ll[1])&&ll[1]>40&&ll[1]<52)?ll:null;}catch(e){return null;}}
const nwOf=net=>{if(net&&net.report&&+net.report.welds)return +net.report.welds;let n=0;((net&&net.lines)||[]).forEach(L=>{if(L.cond)['A','R'].forEach(c=>{const cd=L.cond[c];if(cd&&cd.welds)n+=cd.welds.length;else if(cd&&cd.joints)n+=cd.joints.length;});});return n;}; // soudures du RÉSEAU entier (calepinage), pas seulement celles déjà déclarées
let HOME_NW={}; // total de soudures par chantier, pour le % de l'accueil
function homeMetas(){const out=new Map();const DEMOS=new Set(['bain','saintlo']);
  Object.entries(SITES).forEach(([id,net])=>{if(!net||id==='__vide')return;out.set(id,{id,name:net.name||id,local:true,demo:DEMOS.has(id),updatedAt:localUpdatedOf(net)||0,geo:net.geo||null,origin:net.origin||null,bgo:net.traceur&&net.traceur.bgOrigin||null,w:net.w,h:net.h,bbox:net.bbox||null,nbox:net.nbox||null,nw:nwOf(net)});});
  (state.serverMetas||[]).forEach(m=>{if(isHidden({id:m.id,traceur:m.traceur}))return;const cur=out.get(m.id);const upd=m.updated_at?Date.parse(m.updated_at):0;
    if(cur){cur.updatedAt=Math.max(cur.updatedAt,upd,m.traceur&&m.traceur.savedAt?Date.parse(m.traceur.savedAt):0);cur.geo=cur.geo||m.geo;cur.origin=cur.origin||m.origin;cur.bgo=cur.bgo||m.bgo;cur.w=cur.w||m.w;cur.h=cur.h||m.h;cur.bbox=cur.bbox||m.bbox;cur.nbox=cur.nbox||m.nbox;cur.nw=cur.nw||+m.nw||0;}
    else out.set(m.id,{id:m.id,name:m.name,local:false,demo:false,updatedAt:Math.max(upd,m.traceur&&m.traceur.savedAt?Date.parse(m.traceur.savedAt):0),geo:m.geo,origin:m.origin,bgo:m.bgo,w:m.w,h:m.h,bbox:m.bbox||null,nbox:m.nbox||null,nw:+m.nw||0});});
  HOME_NW={};out.forEach((m,id)=>{HOME_NW[id]=m.nw||0;});
  return [...out.values()];}
const agoTxt=t=>{if(!t)return '';const d=Date.now()-t;if(d<90e3)return 'à l\'instant';if(d<5400e3)return 'il y a '+Math.round(d/60e3)+' min';if(d<129600e3)return 'il y a '+Math.round(d/3600e3)+' h';return 'le '+new Date(t).toLocaleDateString('fr-FR');};
function statOf(id){const st=state.homeStats&&state.homeStats[id];if(!st||!st.total)return null;const done=st.soud!==undefined?st.soud:st.manch;
  const nw=HOME_NW[id]||0;const total=nw>st.total?nw:st.total; // total = TOUTES les soudures du réseau (la table welds n'a que celles déjà déclarées)
  return {total,done,pct:Math.min(100,Math.round(100*done/total))};} // % soudé = soudée+contrôlée+manchonnée / soudures du réseau — demande Ethan 20/08
const pctColor=p=>p>=100?'#0ca30c':p>=60?'#2a78d6':'#eb6834';
function renderHome(){if(!$('#homeView'))return;
  const u=state.cloudUser,pr=state.profile;
  $('#homeWho').innerHTML=u?`<b>${esc(pr&&pr.name?pr.name:(u.email||''))}</b><br>${esc(ROLE_LABEL[pr&&pr.role]||'')}`:`hors connexion`;
  $('#homeAva').textContent=u?((pr&&pr.name||u.email||'?').trim().split(/[\s.@]+/).slice(0,2).map(x=>x[0]||'').join('').toUpperCase()||'?'):'→';
  const banner=$('#homeBanner');if(u&&pr&&!pr.active){banner.style.display='';banner.textContent='Compte en attente d\'activation par le chef de chantier — seuls les chantiers de cet appareil sont visibles.';}
  else if(!u){banner.style.display='';banner.innerHTML='Hors connexion : chantiers de cet appareil seulement. <a href="#" id="hbLogin" style="color:#1c3d6b">Se connecter</a>';}
  else banner.style.display='none';
  const metas=homeMetas();$('#homeCount').textContent=metas.length?`${metas.length} chantier${metas.length>1?'s':''} · choisis pour ouvrir`:'aucun chantier pour l\'instant';
  $('#htMap').classList.toggle('on',state.homeTab==='map');$('#htList').classList.toggle('on',state.homeTab!=='map');
  $('#homeBody').innerHTML=state.homeTab==='map'?homeMapHTML(metas):homeListHTML(metas);
  if(state.homeTab==='map')initHomeMap(metas);
  const rs=$('#homeResume');const last=localStorage.getItem('trace:lastSite');const lm=metas.find(m=>m.id===last);
  if(lm){const st=statOf(lm.id);rs.style.display='';rs.innerHTML=`<div style="font-size:19px">↩</div><div style="flex:1"><div style="font-size:12.5px;font-weight:700">Reprendre : ${esc(lm.name)}</div><div style="font-size:10.5px;color:var(--ink2)">${st?st.pct+' % soudé · ':''}${esc(agoTxt(lm.updatedAt))}</div></div><div style="color:#eb6834;font-weight:800">›</div>`;rs.onclick=()=>openSiteFromHome(lm.id);}
  else rs.style.display='none';}
function homeMapHTML(metas){const noLL=metas.filter(m=>!llOfMeta(m));
  return `<div class="homeMapCard"><div class="homeMap" id="homeMap"></div></div>
    ${noLL.length?`<div style="margin-top:12px"><div style="font-size:11px;color:var(--ink2);margin-bottom:6px;font-weight:600">NON LOCALISÉS SUR LA CARTE</div>${noLL.map(siteCardHTML).join('')}</div>`:''}`;}
// web mercator (pixels monde au zoom z, tuiles 256)
const mercX=(lon,z)=>(lon+180)/360*256*Math.pow(2,z);
const mercY=(lat,z)=>{const r=lat*Math.PI/180;return (1-Math.log(Math.tan(r)+1/Math.cos(r))/Math.PI)/2*256*Math.pow(2,z);};
function initHomeMap(metas){const el=$('#homeMap');if(!el)return;
  const sites=metas.map(m=>({m,ll:llOfMeta(m)})).filter(s=>s.ll);
  el.innerHTML=`<div class="hmTiles"></div><div class="hmPins"></div><div class="hmLegend"><span style="color:#eb6834">●</span> en cours <span style="color:#0ca30c">●</span> terminé · pastille noire = plusieurs chantiers</div><div class="hmCtl"><button data-a="+" title="Zoomer">+</button><button data-a="-" title="Dézoomer">−</button><button data-a="fit" title="Tous les chantiers">⌖</button></div><div class="hmCredit">© IGN — Géoplateforme</div><div class="hmCard" id="hmCard"></div>`;
  const tilesEl=el.querySelector('.hmTiles'),pinsEl=el.querySelector('.hmPins'),card=el.querySelector('.hmCard');
  if(!sites.length){el.querySelector('.hmLegend').textContent='Aucun chantier localisé — cale un plan sur la carte (👁 → Caler sur la carte) ou trace sur fond DXF géoréférencé.';}
  const ZMIN=5,ZMAX=19;
  const st=state.homeMapView&&isFinite(state.homeMapView.cx)?state.homeMapView:null;
  const S=st||{z:6,cx:mercX(2.5,6),cy:mercY(46.6,6)};state.homeMapView=S;
  const fit=()=>{const w=el.clientWidth||340,h=el.clientHeight||400;
    if(!sites.length){S.z=6;S.cx=mercX(2.5,6);S.cy=mercY(46.6,6);render();return;}
    for(let z=13;z>=ZMIN;z--){let x0=1e15,y0=1e15,x1=-1e15,y1=-1e15;sites.forEach(s=>{x0=Math.min(x0,mercX(s.ll[0],z));x1=Math.max(x1,mercX(s.ll[0],z));y0=Math.min(y0,mercY(s.ll[1],z));y1=Math.max(y1,mercY(s.ll[1],z));});
      if(x1-x0<w-120&&y1-y0<h-150){S.z=z;S.cx=(x0+x1)/2;S.cy=(y0+y1)/2;break;}}
    render();};
  function render(){const w=el.clientWidth||340,h=el.clientHeight||400,z=S.z,n=Math.pow(2,z);
    const tx0=Math.floor((S.cx-w/2)/256),tx1=Math.floor((S.cx+w/2)/256),ty0=Math.floor((S.cy-h/2)/256),ty1=Math.floor((S.cy+h/2)/256);
    const want={};for(let ty=Math.max(0,ty0);ty<=Math.min(n-1,ty1);ty++)for(let tx=tx0;tx<=tx1;tx++)want[z+'/'+tx+'/'+ty]={xr:((tx%n)+n)%n,ty,tx};
    [...tilesEl.children].forEach(img=>{const k=img.dataset.k;if(!want[k]){img.remove();return;}const t=want[k];img.style.left=(t.tx*256-S.cx+w/2)+'px';img.style.top=(t.ty*256-S.cy+h/2)+'px';delete want[k];});
    Object.entries(want).forEach(([k,t])=>{const img=document.createElement('img');img.dataset.k=k;img.src=ignTileURL('plan',z,t.xr,t.ty);img.style.left=(t.tx*256-S.cx+w/2)+'px';img.style.top=(t.ty*256-S.cy+h/2)+'px';img.draggable=false;tilesEl.appendChild(img);});
    // pins + regroupement (< 36 px) ; au zoom maxi les chantiers d'une même adresse s'écartent en éventail
    const pts=sites.map(s=>({s,x:mercX(s.ll[0],z)-S.cx+w/2,y:mercY(s.ll[1],z)-S.cy+h/2}));
    const used=new Array(pts.length).fill(false);const groups=[];
    pts.forEach((p,i)=>{if(used[i])return;const g=[p];used[i]=true;pts.forEach((q,j)=>{if(!used[j]&&Math.hypot(p.x-q.x,p.y-q.y)<36){g.push(q);used[j]=true;}});groups.push(g);});
    pinsEl.innerHTML='';
    groups.forEach(g=>{
      const gx=g.reduce((a,p)=>a+p.x,0)/g.length,gy=g.reduce((a,p)=>a+p.y,0)/g.length;
      if(gx<-80||gx>w+80||gy<-80||gy>h+80)return; // hors écran
      if(g.length>1&&z<ZMAX){const x=gx,y=gy;
        const c=document.createElement('div');c.className='hmCluster';c.style.left=x+'px';c.style.top=y+'px';c.textContent=g.length;
        pinsEl.appendChild(c);return;}
      g.forEach((p,i)=>{let px=p.x,py=p.y;
        if(g.length>1){const a=i/g.length*2*Math.PI-Math.PI/2;px+=Math.cos(a)*24;py+=Math.sin(a)*24;} // éventail au zoom maxi
        const stt=statOf(p.s.m.id);const col=stt?pctColor(stt.pct):'#898781';
        const d=document.createElement('div');d.className='hmPin'+(z>=9?' lbled':'');d.style.left=px+'px';d.style.top=py+'px';d.dataset.site=p.s.m.id;
        d.innerHTML=`<span class="lbl">${esc(p.s.m.name.slice(0,30))}</span><span class="dot" style="border-color:${col};color:${col}">${stt&&stt.pct>=100?'✓':`<i style="width:10px;height:10px;border-radius:50%;background:${col}"></i>`}</span>`;
        pinsEl.appendChild(d);});});
  }
  const openCard=id=>{const s=sites.find(x=>x.m.id===id);if(!s)return;const s2=statOf(id);const col=s2?pctColor(s2.pct):'#898781';
    card.innerHTML=`<span class="st" style="background:${col}"></span><span style="min-width:0"><span class="nm">${esc(s.m.name)}</span><br><span class="mt">${s2?`${s2.pct} % soudé · ${s2.done}/${s2.total} soudures · `:''}${esc(agoTxt(s.m.updatedAt))||(s.m.local?'sur cet appareil':'sur le serveur')}</span></span><button class="go" data-open="${esc(s.m.id)}">Ouvrir</button>`;
    card.classList.add('show');};
  const zoomAt=(dz,mx,my)=>{const nz=Math.max(ZMIN,Math.min(ZMAX,S.z+dz));if(nz===S.z)return;const f=Math.pow(2,nz-S.z);const w=el.clientWidth,h=el.clientHeight;S.cx=(S.cx+(mx-w/2))*f-(mx-w/2);S.cy=(S.cy+(my-h/2))*f-(my-h/2);S.z=nz;render();};
  el.addEventListener('wheel',e=>{e.preventDefault();const r=el.getBoundingClientRect();zoomAt(e.deltaY<0?1:-1,e.clientX-r.left,e.clientY-r.top);},{passive:false});
  el.addEventListener('dblclick',e=>{if(e.target.closest('.hmCtl,.hmCard'))return;const r=el.getBoundingClientRect();zoomAt(1,e.clientX-r.left,e.clientY-r.top);});
  el.querySelector('.hmCtl').addEventListener('click',e=>{const a=e.target.dataset.a;if(!a)return;e.stopPropagation();if(a==='fit'){card.classList.remove('show');fit();return;}zoomAt(a==='+'?1:-1,el.clientWidth/2,el.clientHeight/2);});
  // la capture pointeur retargette les « click » vers le conteneur : les taps pins/pastilles se gèrent au pointerup (cible mémorisée au pointerdown), comme sur le canvas du plan
  const ptrs=new Map();let last=null,pinchD=null,moved=false,downTgt=null;
  el.addEventListener('pointerdown',e=>{if(e.target.closest('.hmCtl,.hmCard'))return;el.setPointerCapture(e.pointerId);ptrs.set(e.pointerId,{x:e.clientX,y:e.clientY});if(ptrs.size===1){last={x:e.clientX,y:e.clientY};moved=false;downTgt=e.target.closest('.hmPin,.hmCluster');}el.classList.add('dragging');});
  el.addEventListener('pointermove',e=>{if(!ptrs.has(e.pointerId))return;ptrs.set(e.pointerId,{x:e.clientX,y:e.clientY});
    if(ptrs.size===1&&last){const dx=e.clientX-last.x,dy=e.clientY-last.y;if(Math.hypot(dx,dy)>3)moved=true;S.cx-=dx;S.cy-=dy;last={x:e.clientX,y:e.clientY};render();}
    else if(ptrs.size===2){const [a,b]=[...ptrs.values()];const d=Math.hypot(a.x-b.x,a.y-b.y);const r=el.getBoundingClientRect();const mx=(a.x+b.x)/2-r.left,my=(a.y+b.y)/2-r.top;
      if(pinchD){if(d/pinchD>1.35){zoomAt(1,mx,my);pinchD=d;}else if(d/pinchD<0.74){zoomAt(-1,mx,my);pinchD=d;}}else pinchD=d;}});
  const up=e=>{ptrs.delete(e.pointerId);if(ptrs.size<2)pinchD=null;if(!ptrs.size){el.classList.remove('dragging');
    if(!moved&&last){const t=downTgt;
      if(t&&t.classList.contains('hmCluster')){const x=parseFloat(t.style.left),y=parseFloat(t.style.top);const w=el.clientWidth,h=el.clientHeight;const nz=Math.min(ZMAX,S.z+2);const f=Math.pow(2,nz-S.z);S.cx=(S.cx+(x-w/2))*f;S.cy=(S.cy+(y-h/2))*f;S.z=nz;render();}
      else if(t&&t.dataset.site)openCard(t.dataset.site);
      else card.classList.remove('show');}
    last=null;downTgt=null;}};
  el.addEventListener('pointerup',up);el.addEventListener('pointercancel',up);
  if(!st)fit();else render();}
function siteCardHTML(m){const st=statOf(m.id);const c=st?pctColor(st.pct):'#898781';
  return `<div class="siteCard" data-open="${esc(m.id)}"><div class="n"><i style="background:${c}"></i><span style="flex:1">${esc(m.name)}</span><span style="font-size:10px;color:var(--ink2);font-weight:400">${m.demo?'démo':(st&&st.pct>=100?'✓ terminé':(m.local?'':'serveur'))}</span></div>
    <div class="m">${st?st.total+' soudures':'—'}${m.local?' · sur cet appareil':''}</div>
    <div class="bar"><i style="width:${st?st.pct:0}%;background:${c}"></i></div>
    <div class="foot"><span>${st?st.pct+' % soudé':'avancement inconnu'}</span><span>${esc(agoTxt(m.updatedAt))}</span></div></div>`;}
function homeListHTML(metas){const q=(state.homeQ||'').toLowerCase();let list=metas.filter(m=>!q||m.name.toLowerCase().includes(q));
  const sort=state.homeSort;list.sort((a,b)=>sort==='az'?a.name.localeCompare(b.name,'fr'):sort==='pct'?((statOf(b.id)||{pct:-1}).pct-(statOf(a.id)||{pct:-1}).pct):(b.updatedAt-a.updatedAt));
  list=list.filter(m=>!m.demo).concat(list.filter(m=>m.demo)); // démos en bas
  const canNew=role()==='chef'||role()==='bureau';
  return `<input class="homeSearch" id="homeQ" placeholder="🔍 Rechercher un chantier…" value="${esc(state.homeQ||'')}">
    <div class="homeSorts">${[['recent','Récents'],['az','A → Z'],['pct','Avancement']].map(([v,l])=>`<button data-sort="${v}" class="${sort===v?'on':''}">${l}</button>`).join('')}</div>
    ${list.map(siteCardHTML).join('')||'<div class="muted" style="font-size:13px;padding:8px 2px">Aucun chantier ne correspond.</div>'}
    ${canNew?`<button class="siteNew" id="homeNew">＋ Nouveau chantier (tracer un réseau ou importer un DXF)</button>`:''}`;}
async function openSiteFromHome(id){if(!id)return false;const local=SITES[id];const hasFull=local&&local.lines&&!(local.bgTooBig&&state.cloudUser);
  if(hasFull){await switchSite(id);siteSel.value=id;showScreen('site');return true;}
  const w=$('#homeWait');if(state.screen==='home'){$('#homeWaitTxt').textContent='Chargement du chantier…';w.classList.add('show');}
  let net=null;try{net=state.cloudUser?await sync.loadSite(id):null;}catch(e){console.warn(e);}
  w.classList.remove('show');
  if(net&&net.lines&&!net.deleted){SITES[id]=net;delete siteStore[id];if(net.traceur){try{await kv.set('trace:handoff:'+id,{...net,sent:true,sentAt:Date.now()});}catch(e){}}
    addSiteOption(net);await switchSite(id);siteSel.value=id;showScreen('site');return true;}
  if(local&&local.lines){await switchSite(id);siteSel.value=id;showScreen('site');toast('Version de cet appareil (serveur injoignable)');return true;}
  toast(state.cloudUser?'Chantier introuvable sur le serveur':'Connecte-toi pour ouvrir ce chantier');return false;}
$('#btnHome').addEventListener('click',()=>{showScreen('home');renderHome();});
$('#htMap').addEventListener('click',()=>{state.homeTab='map';localStorage.setItem('trace:homeTab','map');renderHome();});
$('#htList').addEventListener('click',()=>{state.homeTab='list';localStorage.setItem('trace:homeTab','list');renderHome();});
$('#homeBody').addEventListener('click',e=>{
  const o=e.target.closest('[data-open]');if(o){openSiteFromHome(o.dataset.open);return;}
  const so=e.target.closest('[data-sort]');if(so){state.homeSort=so.dataset.sort;renderHome();return;}
  if(e.target.id==='homeNew'){openModal(`<h3>Nouveau chantier</h3><div class="actions"><button class="btn primary block" id="nwTrace">✎ Tracer un réseau (traceur)</button><button class="btn block" id="nwImport">📄 Importer un plan (DXF / PDF)</button><button class="btn block" data-close>Annuler</button></div>`);
    $('#nwTrace').onclick=()=>{location.href='./traceur.html?site=new';};
    $('#nwImport').onclick=async()=>{closeModal();const vid=Object.keys(SITES).find(k=>k==='__vide')||state.siteId;await openSiteFromHome('__vide')||showScreen('site');openImport();};return;}});
$('#homeBody').addEventListener('input',e=>{if(e.target.id==='homeQ'){state.homeQ=e.target.value;const list=$('#homeBody');const pos=e.target.selectionStart;renderHome();const q2=$('#homeQ');if(q2){q2.focus();q2.setSelectionRange(pos,pos);}}});
$('#homeAva').addEventListener('click',()=>{const u=state.cloudUser,pr=state.profile;
  if(!u){showScreen('login');return;}
  openModal(`<h3>${esc(pr&&pr.name?pr.name:(u.email||'Compte'))}</h3><div class="muted" style="font-size:12.5px;margin-bottom:8px">${esc(u.email||'')} · ${esc(ROLE_LABEL[pr&&pr.role]||'rôle non défini')}${pr&&!pr.active?' · <b style="color:#b25e00">en attente d’activation</b>':''}</div>
    <div class="actions">${pr&&pr.role==='chef'?'<button class="btn block" id="accUsers">👥 Comptes (activer, rôles)</button>':''}<button class="btn block" id="accName">✎ Mon nom affiché</button><button class="btn block" id="accOut" style="color:#d03b3b">Se déconnecter</button><button class="btn block" data-close>Fermer</button></div>`);
  const bu=$('#accUsers');if(bu)bu.onclick=()=>{closeModal();openUsersModal();};
  $('#accName').onclick=async()=>{const n=prompt('Ton nom affiché :',pr&&pr.name||'');if(!n)return;await sync.setMyName(n.trim());state.profile=await sync.profile();closeModal();renderHome();};
  $('#accOut').onclick=async()=>{await sync.logout();state.cloudUser=null;state.profile=null;state.serverMetas=[];state.homeStats=null;closeModal();renderHome();showScreen('login');};});
$('#loginGo').addEventListener('click',async()=>{const em=($('#loginEmail').value||'').trim();if(!em||!em.includes('@')){$('#loginHint').innerHTML='<b>Adresse invalide.</b>';return;}
  $('#loginGo').disabled=true;$('#loginHint').textContent='Envoi du lien…';
  try{await sync.login(em);$('#loginHint').innerHTML='<b>Lien envoyé ✓</b><br>Ouvre le mail SUR CET APPAREIL et touche le lien.';}
  catch(e){$('#loginHint').innerHTML='<b>Envoi impossible</b> (hors ligne ?). Réessaie, ou continue hors connexion.';}
  $('#loginGo').disabled=false;});
$('#loginEmail').addEventListener('keydown',e=>{if(e.key==='Enter')$('#loginGo').click();});
$('#loginSkip').addEventListener('click',e=>{e.preventDefault();localStorage.setItem('trace:skipLogin','1');renderHome();showScreen('home');});
document.addEventListener('click',e=>{if(e.target.id==='hbLogin'){e.preventDefault();showScreen('login');}});
// poignée de débogage / tests (module ES : rien n'est global sinon)
window.TRACE={state,USERS,role,renderAll,renderPlan,centerOn,closeSheet,openStockZoneModal,allJoints,switchSite,openJoint,openEl,siteGeo,startCalage,calageTap,openSiteFromHome,renderHome,showScreen,geo:{planToLonLat,lonLatToPlan},hydro:{of:hydroOf,build:hydroBuild,pose:startHydroPose,tap:hydroTap,end:endHydroPose,save:saveHydro,nearest:nearestOnLines},geoRefresh(){if(NET)geoCache.delete(NET);},go:async id=>{const t=id||Object.keys(SITES).find(k=>k!=='__vide');if(t)return openSiteFromHome(t);},get lines(){return state.lines;},get net(){return NET;},get sites(){return SITES;}};
