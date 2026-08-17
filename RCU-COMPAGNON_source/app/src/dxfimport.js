// Lecture DXF (ASCII) dans le navigateur : entités du modèle + inventaire + proposition de rôles par calque + construction d'un chantier brut.
export function parseDXF(text){
  const lines=text.split(/\r?\n/);const ents=[];const blocks={};let section=null;let cur=null;let blk=null;let i=0;const n=lines.length;
  const push=e=>{const arr=blk?blk.ents:ents;if(e.type==='LWPOLYLINE'||e.type==='POLYLINE'){if(e.pts.length>=2)arr.push(e);}else if(e.type==='LINE'){if(e.p1&&e.p2){e.pts=[e.p1,e.p2];arr.push(e);}}else if(e.type==='ARC'||e.type==='CIRCLE'){arr.push(e);}else if(e.type!=='VERTEX'&&e.type!=='SEQEND'&&e.type!=='ATTRIB'&&e.type!=='ATTDEF'){arr.push(e);}};
  const flush=()=>{if(cur){push(cur);}cur=null;};
  while(i<n-1){const code=parseInt(lines[i].trim(),10);const val=lines[i+1];i+=2;if(isNaN(code))continue;const v=val.trim();
    if(code===0){
      if(v==='SECTION'){flush();section='?';continue;}
      if(v==='ENDSEC'){flush();section=null;blk=null;continue;}
      if(section==='BLOCKS'){if(v==='BLOCK'){flush();blk={name:'',ents:[]};cur=null;continue;}if(v==='ENDBLK'){flush();if(blk&&blk.name)blocks[blk.name]=blk.ents;blk=null;continue;}}
      if(section==='ENTITIES'||(section==='BLOCKS'&&blk)){flush();cur={type:v,layer:'0',pts:[]};}
      continue;}
    if(section==='?'&&code===2){section=v;continue;}
    if(section==='BLOCKS'&&blk&&!cur&&code===2){blk.name=v;continue;}
    if(!cur)continue;
    switch(code){
      case 8: cur.layer=v;break;
      case 2: cur.name=v;break;
      case 10: if(cur.type==='LWPOLYLINE'||cur.type==='POLYLINE'||cur.type==='VERTEX'){cur.pts.push([parseFloat(v),0]);}else if(cur.type==='LINE'){cur.p1=[parseFloat(v),0];}else{cur.x=parseFloat(v);}break;
      case 20: if(cur.type==='LWPOLYLINE'||cur.type==='POLYLINE'||cur.type==='VERTEX'){const p=cur.pts[cur.pts.length-1];if(p)p[1]=parseFloat(v);}else if(cur.type==='LINE'){if(cur.p1)cur.p1[1]=parseFloat(v);}else{cur.y=parseFloat(v);}break;
      case 11: if(cur.type==='LINE')cur.p2=[parseFloat(v),0];break;
      case 21: if(cur.type==='LINE'&&cur.p2)cur.p2[1]=parseFloat(v);break;
      case 1: cur.text=(cur.text||'')+v;break;
      case 3: cur.text=(cur.text||'')+v;break;
      case 40: cur.r=parseFloat(v);break;
      case 42: if(cur.type==='DIMENSION')cur.measure=parseFloat(v);else if(cur.type==='INSERT')cur.sy=parseFloat(v);break;
      case 50: cur.rot=parseFloat(v);break;
      case 51: cur.rot2=parseFloat(v);break;
      case 41: cur.sx=parseFloat(v);break;
      case 42.1: break;
      case 70: cur.flags=parseInt(v,10);break;
    }}
  flush();
  // VERTEX d'une POLYLINE (ancienne) : rattacher au POLYLINE précédent
  const fix=arr=>{const out=[];let pl=null;arr.forEach(e=>{if(e.type==='POLYLINE'){pl=e;pl.pts=[];out.push(e);}else if(e.type==='VERTEX'&&pl){if(isFinite(e.x))pl.pts.push([e.x,e.y]);}else out.push(e);});return out.filter(e=>!(e.type==='POLYLINE'&&e.pts.length<2));};
  const ents2=fix(ents);Object.keys(blocks).forEach(k=>blocks[k]=fix(blocks[k]));
  const layersCount={};ents2.forEach(e=>{layersCount[e.layer]=layersCount[e.layer]||{};layersCount[e.layer][e.type]=(layersCount[e.layer][e.type]||0)+1;});
  return {ents:ents2,blocks,layersCount};
}
// développe les blocs insérés d'un calque : la géométrie interne (lignes/polylignes) ramenée dans le dessin
export function expandInserts(dxf,layerSet,pick){const out=[];dxf.ents.forEach(e=>{if(e.type!=='INSERT'||!layerSet.has(e.layer)||!isFinite(e.x))return;const B=dxf.blocks[e.name];if(!B)return;const th=(e.rot||0)*Math.PI/180,sx=e.sx||1,sy=e.sy||1,c=Math.cos(th),s=Math.sin(th);const tf=p=>[e.x+(p[0]*sx*c-p[1]*sy*s),e.y+(p[0]*sx*s+p[1]*sy*c)];
  let cands=B.filter(b=>(b.type==='LWPOLYLINE'||b.type==='LINE'||b.type==='POLYLINE')&&b.pts.length>=2).map(b=>({...b,pts:b.pts.map(tf),layer:e.layer,fromBlock:e.name,ins:[e.x,e.y]}));
  if(pick==='longest'&&cands.length){cands.sort((a,b)=>plen(b.pts)-plen(a.pts));cands=[cands[0]];}
  out.push(...cands);});return out;}
function plen(pts){let L=0;for(let i=1;i<pts.length;i++)L+=Math.hypot(pts[i][0]-pts[i-1][0],pts[i][1]-pts[i-1][1]);return L;}
const clean=t=>String(t||'').replace(/\\[A-Za-z][^;]*;/g,'').replace(/[{}]/g,'').replace(/%%[cC]/g,'Ø').replace(/%%[dD]/g,'°').replace(/\\P/g,' ').trim();
export function analyze(dxf){
  const L=dxf.layersCount;const layers=Object.keys(L).sort();
  const cnt=(lay,type)=>(L[lay]||{})[type]||0;const total=lay=>Object.values(L[lay]||{}).reduce((a,b)=>a+b,0);
  const has=(lay,re)=>re.test(lay);
  const roles={axesA:[],axesR:[],axes:[],bends:[],tees:[],reducers:[],sleeves:[],welds:[],dn:[],valves:[]};
  layers.forEach(lay=>{const l=lay.toLowerCase();const isA=/aller/.test(l),isR=/retour/.test(l);
    if(/canalisation|axe|réseau|reseau|conduite|tube|pipe|présentation|presentation/.test(l)&&(cnt(lay,'LWPOLYLINE')+cnt(lay,'LINE')+cnt(lay,'POLYLINE')+cnt(lay,'INSERT'))>0&&!/légende|legende|tranchee|tranchée|ep_|eu_|aep|gaz|bta|hta|ecl|tel|ice|unit/.test(l)){if(isA)roles.axesA.push(lay);else if(isR)roles.axesR.push(lay);else roles.axes.push(lay);}
    if(/coude/.test(l))roles.bends.push(lay);
    if(/\bté\b|_té|te_|\bte\b|tee/.test(l)&&!/texte/.test(l))roles.tees.push(lay);
    if(/réduction|reduction/.test(l))roles.reducers.push(lay);
    if(/manchon/.test(l))roles.sleeves.push(lay);
    if(/soudure/.test(l))roles.welds.push(lay);
    if(/vanne/.test(l))roles.valves.push(lay);
    if(/texte/.test(l)&&(cnt(lay,'TEXT')+cnt(lay,'MTEXT'))>0)roles.dn.push(lay);});
  // étiquettes DN : textes « DN50 (60,3/125) »
  const dnTexts=[];dxf.ents.forEach(e=>{if(e.type!=='TEXT'&&e.type!=='MTEXT')return;if(/l[ée]gende/i.test(e.layer))return;const t=clean(e.text);const m=t.match(/DN\s*(\d{2,4})(?:\s*\(\s*([\d.,]+)\s*\/\s*(\d{2,4})\s*\))?/i);if(m&&isFinite(e.x))dnTexts.push({x:e.x,y:e.y,dn:+m[1],dext:m[2]?parseFloat(m[2].replace(',','.')):null,casing:m[3]?+m[3]:null,layer:e.layer,t});});
  const inserts={};dxf.ents.forEach(e=>{if(e.type==='INSERT'){const k=e.name||'?';inserts[k]=(inserts[k]||0)+1;}});
  const namedBlocks=Object.entries(inserts).filter(([k])=>!k.startsWith('*')).sort((a,b)=>b[1]-a[1]);
  const supplierGuess=/axiom|iso st/i.test(JSON.stringify(namedBlocks))?'AXIOM':/renalia|zpu/i.test(layers.join(' '))?'RENALIA':/logstor/i.test(layers.join(' '))?'LOGSTOR':/inpal/i.test(layers.join(' '))?'INPAL':null;
  const dnSet=[...new Set(dnTexts.map(d=>d.dn))].sort((a,b)=>a-b);
  return {layers,L,total,roles,dnTexts,inserts,namedBlocks,supplierGuess,dnSet,nEnts:dxf.ents.length};
}
// ---- construction du chantier brut : lignes par conduite à partir des polylignes d'axe, tés/réductions par blocs, DN par étiquettes ----
function d2(a,b){return Math.hypot(a[0]-b[0],a[1]-b[1]);}
function joinPolys(polys,tol){ // recolle bout à bout les polylignes qui se touchent (extrémité à extrémité)
  const P=polys.map(p=>p.slice());let changed=true;
  while(changed){changed=false;outer:for(let i=0;i<P.length;i++)for(let j=0;j<P.length;j++){if(i===j)continue;const a=P[i],b=P[j];
    if(d2(a[a.length-1],b[0])<tol){P[i]=a.concat(b.slice(1));P.splice(j,1);changed=true;break outer;}
    if(d2(a[a.length-1],b[b.length-1])<tol){P[i]=a.concat(b.slice().reverse().slice(1));P.splice(j,1);changed=true;break outer;}
    if(d2(a[0],b[0])<tol){P[i]=b.slice().reverse().concat(a.slice(1));P.splice(j,1);changed=true;break outer;}
    if(d2(a[0],b[b.length-1])<tol){P[i]=b.concat(a.slice(1));P.splice(j,1);changed=true;break outer;}}}
  return P;}
function projOnPoly(pts,q){let best={d:1e9,m:0};let acc=0;for(let i=1;i<pts.length;i++){const a=pts[i-1],b=pts[i];const vx=b[0]-a[0],vy=b[1]-a[1];const L=Math.hypot(vx,vy)||1e-9;let t=((q[0]-a[0])*vx+(q[1]-a[1])*vy)/(L*L);t=Math.max(0,Math.min(1,t));const px=a[0]+vx*t,py=a[1]+vy*t;const d=Math.hypot(q[0]-px,q[1]-py);if(d<best.d)best={d,m:acc+L*t,i};acc+=L;}return best;}
export function buildSite(dxf,an,roles,opts){
  const E=dxf.ents;const axisLayers={A:new Set(roles.axesA),R:new Set(roles.axesR),S:new Set(roles.axes)};
  const allPts=[];E.forEach(e=>{if(e.pts&&e.pts.length)e.pts.forEach(p=>allPts.push(p));else if(isFinite(e.x))allPts.push([e.x,e.y]);});
  // seulement l'emprise du réseau (axes) pour ne pas embarquer tout le fond de plan
  const netPts=[];const allAxis=new Set([...axisLayers.A,...axisLayers.R,...axisLayers.S]);E.forEach(e=>{if((e.type==='LWPOLYLINE'||e.type==='LINE'||e.type==='POLYLINE')&&allAxis.has(e.layer))e.pts.forEach(p=>netPts.push(p));});expandInserts(dxf,allAxis,'longest').forEach(e=>e.pts.forEach(p=>netPts.push(p)));
  const src=netPts.length?netPts:allPts;let x0=1e9,y0=1e9,x1=-1e9,y1=-1e9;src.forEach(p=>{x0=Math.min(x0,p[0]);y0=Math.min(y0,p[1]);x1=Math.max(x1,p[0]);y1=Math.max(y1,p[1]);});
  const M=20;x0-=M;y0-=M;x1+=M;y1+=M;const T=p=>[+(p[0]-x0).toFixed(3),+(y1-p[1]).toFixed(3)];
  const site={id:opts.id,name:opts.name,supplier:opts.supplier,serie:opts.serie||1,crs:'plan importé (unités du dessin = mètres)',source:opts.fileName,method:'Import guidé v1 : axes des calques choisis, coudes aux changements de direction (≥ 15°), tés et réductions aux blocs, DN par étiquettes ; le puzzle catalogue est fabriqué ensuite par le moteur, conduite par conduite.',w:+(x1-x0).toFixed(2),h:+(y1-y0).toFixed(2),ann:[],lines:[],warnings:[],report:{}};
  an.dnTexts.forEach(t=>{const p=T([t.x,t.y]);site.ann.push({text:t.t,p});});
  const tees=E.filter(e=>e.type==='INSERT'&&roles.tees.includes(e.layer)&&isFinite(e.x)).map(e=>({p:T([e.x,e.y]),layer:e.layer,name:e.name}));
  const reds=E.filter(e=>e.type==='INSERT'&&(roles.reducers.includes(e.layer)||/r[ée]duction/i.test(e.name||''))&&isFinite(e.x)).map(e=>{const m=(e.name||'').match(/DN\s*(\d+)\s*[x×\/]\s*(\d+)/i);return {p:T([e.x,e.y]),name:e.name,dn1:m?+m[1]:null,dn2:m?+m[2]:null,layer:e.layer};});
  const bendsBlocks=E.filter(e=>e.type==='INSERT'&&(roles.bends.includes(e.layer)||/coude/i.test(e.name||''))&&isFinite(e.x)).map(e=>{const m=((e.name||'')+' '+e.layer).match(/(\d{1,3})\s*°/);return {p:T([e.x,e.y]),ang:m?+m[1]:null,layer:e.layer,name:e.name};});
  const dnPts=an.dnTexts.map(t=>({p:T([t.x,t.y]),dn:t.dn,casing:t.casing,dext:t.dext,cond:/retour/i.test(t.layer)?'R':/aller/i.test(t.layer)?'A':null}));
  let seq=0;const mk=(cond,polys)=>{const joined=joinPolys(polys.map(pl=>pl.map(T)),0.06);const lines=joined.map(pts=>({pts,cond,id:null,len:pts.reduce((s,p,i)=>i?s+d2(pts[i-1],p):0,0)})).filter(l=>l.len>=1).sort((a,b)=>b.len-a.len);
    lines.forEach((l,k)=>{l.id=(cond||'L')+(k+1);});
    // rattachement des antennes : un bout de ligne posé sur une autre ligne (< 0,6 m) → té sur la ligne parente
    lines.forEach(l=>{for(const end of [l.pts[0],l.pts[l.pts.length-1]]){let best=null;lines.forEach(o=>{if(o===l||o.len<l.len)return;const pr=projOnPoly(o.pts,end);if(pr.d<0.6&&(!best||pr.d<best.d))best={o,pr};});if(best){l.parent=best.o.id;l.parentM=best.pr.m;best.o.specials=best.o.specials||[];best.o.specials.push({m:best.pr.m,type:'tee',branch:l.id});if(end===l.pts[l.pts.length-1])l.pts.reverse();break;}}});
    // tés (blocs) non encore posés, réductions
    tees.forEach(t=>{let best=null;lines.forEach(o=>{const pr=projOnPoly(o.pts,t.p);if(pr.d<0.8&&(!best||pr.d<best.d))best={o,pr};});if(best){best.o.specials=best.o.specials||[];if(!best.o.specials.some(s=>s.type==='tee'&&Math.abs(s.m-best.pr.m)<1.5))best.o.specials.push({m:best.pr.m,type:'tee',branch:null,block:t.name});}});
    reds.forEach(r=>{let best=null;lines.forEach(o=>{const pr=projOnPoly(o.pts,r.p);if(pr.d<0.8&&(!best||pr.d<best.d))best={o,pr};});if(best){best.o.specials=best.o.specials||[];best.o.specials.push({m:best.pr.m,type:'reducer',dn1:r.dn1,dn2:r.dn2,block:r.name});}});
    // DN par ligne : étiquette la plus proche de la ligne (même conduite si précisé)
    lines.forEach(l=>{let best=null;dnPts.forEach(d=>{if(d.cond&&cond&&d.cond!==cond)return;const pr=projOnPoly(l.pts,d.p);const sc=pr.d;if(sc<6&&(!best||sc<best.sc))best={d,sc};});l.dnNum=best?best.d.dn:(opts.defaultDn||100);l.casing=best?best.d.casing:null;l.dnFrom=best?'étiquette « '+best.d.dn+' » à '+best.sc.toFixed(1)+' m':'par défaut ('+(opts.defaultDn||100)+')';});
    return lines;};
  const polysOf=set=>E.filter(e=>(e.type==='LWPOLYLINE'||e.type==='LINE'||e.type==='POLYLINE')&&set.has(e.layer)).map(e=>e.pts).concat(expandInserts(dxf,set,'longest').map(e=>e.pts));
  const out=[];if(axisLayers.A.size||axisLayers.R.size){out.push(...mk('A',polysOf(axisLayers.A)));out.push(...mk('R',polysOf(axisLayers.R)));}
  if(axisLayers.S.size)out.push(...mk(null,polysOf(axisLayers.S)));
  site.lines=out.map(l=>({id:l.id,name:(l.parent?'Antenne ':'Ligne ')+l.id+(l.cond?(l.cond==='A'?' · aller':' · retour'):''),cond:l.cond,parent:l.parent||null,pts:l.pts,specials:l.specials||[],dnNum:l.dnNum,casing:l.casing,dnFrom:l.dnFrom,length:+l.len.toFixed(1)}));
  site.report={lines:site.lines.length,tees:tees.length,reducers:reds.length,bendBlocks:bendsBlocks.length,dnLabels:dnPts.length,sleeves:E.filter(e=>roles.sleeves.includes(e.layer)).length,welds:E.filter(e=>roles.welds.includes(e.layer)).length};
  if(!site.lines.length)site.warnings.push('Aucun axe trouvé dans les calques choisis.');
  const noDn=site.lines.filter(l=>/défaut/.test(l.dnFrom));if(noDn.length)site.warnings.push(noDn.length+' ligne(s) sans étiquette DN à proximité — DN par défaut, à corriger dans la fiche.');
  if(bendsBlocks.length)site.warnings.push('Blocs de coudes lus ('+bendsBlocks.length+') : pour l\'instant les coudes sont posés aux changements de direction de l\'axe ; les blocs serviront de contrôle à l\'étape suivante.');
  return site;}

// ---------- Profil JBTP / Mensura (Nantes) : chaque pièce est un bloc « Présentation » dessiné (calques internes Tube / Isolation) ----------
function segsOf(ents){const out=[];ents.forEach(b=>{if(!(b.type==='LWPOLYLINE'||b.type==='LINE'||b.type==='POLYLINE'))return;for(let i=1;i<b.pts.length;i++)out.push([b.pts[i-1],b.pts[i]]);});return out;}
function blockAxis(B){ // axe d'une pièce à partir des traits « Tube » (paires de génératrices) : 1 direction → barre, 2 directions → coude
  const segs=segsOf(B.filter(b=>/tube/i.test(b.layer||''))).map(([a,b])=>({a,b,L:Math.hypot(b[0]-a[0],b[1]-a[1]),th:Math.atan2(b[1]-a[1],b[0]-a[0])})).filter(s=>s.L>0.25);
  if(!segs.length)return null;
  const groups=[];segs.forEach(s=>{let th=s.th;while(th<0)th+=Math.PI;while(th>=Math.PI)th-=Math.PI;let g=groups.find(g=>Math.min(Math.abs(g.th-th),Math.PI-Math.abs(g.th-th))<0.035);if(!g){g={th,segs:[]};groups.push(g);}g.segs.push(s);});
  const tot=g=>g.segs.reduce((s,x)=>s+x.L,0);groups.sort((a,b)=>tot(b)-tot(a));let G=groups.slice(0,2);if(G.length===2&&(tot(G[1])<0.3*tot(G[0])||Math.max(...G[1].segs.map(x=>x.L))<0.45))G=[G[0]];
  const axisOf=g=>{const c=Math.cos(g.th),s=Math.sin(g.th);let offs=[],pmin=1e9,pmax=-1e9;g.segs.forEach(sg=>{[sg.a,sg.b].forEach(p=>{const u=p[0]*c+p[1]*s,v=-p[0]*s+p[1]*c;pmin=Math.min(pmin,u);pmax=Math.max(pmax,u);offs.push(v);});});offs.sort((a,b)=>a-b);const v=(offs[0]+offs[offs.length-1])/2;return {th:g.th,v,pmin,pmax,p0:[pmin*c-v*s,pmin*s+v*c],p1:[pmax*c-v*s,pmax*s+v*c],len:pmax-pmin};};
  if(G.length===1){const a=axisOf(G[0]);return {kind:'pipe',pts:[a.p0,a.p1],len:a.len};}
  if(G.length===2){const a=axisOf(G[0]),b=axisOf(G[1]);const c1=Math.cos(a.th),s1=Math.sin(a.th),c2=Math.cos(b.th),s2=Math.sin(b.th);const den=c1*s2-s1*c2;if(Math.abs(den)<1e-6)return {kind:'pipe',pts:[a.p0,a.p1],len:a.len};
    const dx=b.p0[0]-a.p0[0],dy=b.p0[1]-a.p0[1];const t=(dx*s2-dy*c2)/den;const V=[a.p0[0]+c1*t,a.p0[1]+s1*t];
    const far=(ax,V)=>{const d0=Math.hypot(ax.p0[0]-V[0],ax.p0[1]-V[1]),d1=Math.hypot(ax.p1[0]-V[0],ax.p1[1]-V[1]);return d0>d1?ax.p0:ax.p1;};
    const A=far(a,V),Bp=far(b,V);const ang=Math.round(Math.abs(((Math.atan2(Bp[1]-V[1],Bp[0]-V[0])-Math.atan2(V[1]-A[1],V[0]-A[0])+Math.PI)%(2*Math.PI)+2*Math.PI)%(2*Math.PI)-Math.PI)*180/Math.PI);
    return {kind:'bend',pts:[A,V,Bp],angle:ang,legs:[Math.hypot(V[0]-A[0],V[1]-A[1]),Math.hypot(Bp[0]-V[0],Bp[1]-V[1])]};}
  return null;}
export function profileJBTP(dxf,an,opts){
  const E=dxf.ents;const pieces=[];
  E.forEach(e=>{if(e.type!=='INSERT'||!isFinite(e.x))return;const lay=e.layer;const cond=/RETOUR/i.test(lay)?'R':/ALLER/i.test(lay)?'A':null;if(!cond){if(/r[ée]duction/i.test(e.name||'')){const m=(e.name||'').match(/DN\s*(\d+)\s*[x×\/]\s*(\d+)/i);pieces.push({cond:null,kind:'reducer',pts:[[e.x,e.y]],point:true,dn1:m?+m[1]:null,dn2:m?+m[2]:null,src:e.name});}return;}
    const th=(e.rot||0)*Math.PI/180,sx=e.sx||1,sy=e.sy||1,c=Math.cos(th),s=Math.sin(th);const tf=p=>[e.x+(p[0]*sx*c-p[1]*sy*s),e.y+(p[0]*sx*s+p[1]*sy*c)];const sc=Math.abs(sx);
    const B=dxf.blocks[e.name];
    if(/Présentation|Presentation/i.test(lay)){if(!B)return;const ax=blockAxis(B);if(!ax)return;pieces.push({cond,kind:ax.kind,pts:ax.pts.map(tf),len:ax.len?ax.len*sc:null,angle:ax.angle,legs:ax.legs?ax.legs.map(l=>l*sc):null,src:'présentation '+e.name});return;}
    if(/Coude/i.test(lay)){const m=lay.match(/(\d{1,3})\s*°/);let ax=B?blockAxis(B):null;if(ax&&ax.kind==='bend')pieces.push({cond,kind:'bend',pts:ax.pts.map(tf),angle:ax.angle,legs:ax.legs?ax.legs.map(l=>l*sc):null,src:'coude '+e.name});else pieces.push({cond,kind:'bend',pts:[[e.x,e.y]],angle:m?+m[1]:90,point:true,src:'coude (bloc sans axe) '+e.name});return;}
    if(/\bTé\b|_Té/i.test(lay)){pieces.push({cond,kind:'tee',pts:[[e.x,e.y]],point:true,src:'té '+e.name});return;}
    if(/Manchon/i.test(lay)){pieces.push({cond,kind:'sleeve',pts:[[e.x,e.y]],point:true,src:'manchon'});return;}
    if(/Soudure/i.test(lay)){pieces.push({cond,kind:'weld',pts:[[e.x,e.y]],point:true,src:'soudure'});return;}
    if(/r[ée]duction/i.test(e.name||'')){const m=(e.name||'').match(/DN\s*(\d+)\s*[x×\/]\s*(\d+)/i);pieces.push({cond,kind:'reducer',pts:[[e.x,e.y]],point:true,dn1:m?+m[1]:null,dn2:m?+m[2]:null,src:e.name});return;}
  });
  return pieces;}
export function chainPieces(pieces,tol){ // enchaîne les pièces (barres, coudes) par leurs extrémités → lignes
  const lin=pieces.filter(p=>!p.point&&p.pts.length>=2);const used=new Set();const lines=[];
  const ends=p=>[p.pts[0],p.pts[p.pts.length-1]];const near=(a,b)=>Math.hypot(a[0]-b[0],a[1]-b[1])<tol;
  lin.forEach((p,i)=>{if(used.has(i))return;used.add(i);const chain=[{p,rev:false}];
    let grow=true;while(grow){grow=false;const last=chain[chain.length-1];const tail=last.rev?last.p.pts[0]:last.p.pts[last.p.pts.length-1];
      for(let j=0;j<lin.length;j++){if(used.has(j))continue;const q=lin[j];const [q0,q1]=ends(q);if(q.cond!==p.cond)continue;if(near(tail,q0)){chain.push({p:q,rev:false});used.add(j);grow=true;break;}if(near(tail,q1)){chain.push({p:q,rev:true});used.add(j);grow=true;break;}}
      if(!grow){const first=chain[0];const head=first.rev?first.p.pts[first.p.pts.length-1]:first.p.pts[0];
        for(let j=0;j<lin.length;j++){if(used.has(j))continue;const q=lin[j];const [q0,q1]=ends(q);if(q.cond!==p.cond)continue;if(near(head,q1)){chain.unshift({p:q,rev:false});used.add(j);grow=true;break;}if(near(head,q0)){chain.unshift({p:q,rev:true});used.add(j);grow=true;break;}}}}
    lines.push({cond:p.cond,items:chain});});
  return lines;}

// ---------- assemblage JBTP : pièces → lignes par conduite → chantier (format NET) ----------
function dist(a,b){return Math.hypot(a[0]-b[0],a[1]-b[1]);}
function dedupe(pieces){const out=[];pieces.forEach(p=>{if(p.point){out.push(p);return;}const a=p.pts[0],b=p.pts[p.pts.length-1];const dup=out.some(q=>!q.point&&q.cond===p.cond&&q.kind===p.kind&&((dist(q.pts[0],a)<0.05&&dist(q.pts[q.pts.length-1],b)<0.05)||(dist(q.pts[0],b)<0.05&&dist(q.pts[q.pts.length-1],a)<0.05)));if(!dup)out.push(p);});return out;}
function chainTolerant(pieces,tol,alignedTol){
  const tees=pieces.filter(p=>p.kind==='tee');const lin=pieces.filter(p=>!p.point&&p.pts.length>=2);const used=new Set();const lines=[];
  const ptsOf=(p,rev)=>rev?p.pts.slice().reverse():p.pts;
  const dirEnd=pts=>Math.atan2(pts[pts.length-1][1]-pts[pts.length-2][1],pts[pts.length-1][0]-pts[pts.length-2][0]);
  const dirStart=pts=>Math.atan2(pts[1][1]-pts[0][1],pts[1][0]-pts[0][0]);
  const score=(tail,thTail,q,rev)=>{const pts=ptsOf(q,rev);const d=dist(tail,pts[0]);const nearTee=tees.some(t=>t.cond===q.cond&&dist(t.pts[0],tail)<2.2);let dth=Math.abs(dirStart(pts)-thTail);dth=Math.min(dth,2*Math.PI-dth);const lim=nearTee?3.6:(alignedTol&&dth<0.35?alignedTol:tol);if(d>lim)return null;if(dth>Math.PI/2+0.3)return null;return d+dth*0.5;};
  const growForward=(chain,cond)=>{let grow=true;while(grow){grow=false;const last=chain[chain.length-1];const pts=ptsOf(last.p,last.rev);const tail=pts[pts.length-1],thT=dirEnd(pts);let best=null;
      lin.forEach((q,j)=>{if(used.has(j)||q.cond!==cond)return;for(const rev of [false,true]){const sc=score(tail,thT,q,rev);if(sc!==null&&(!best||sc<best.sc))best={j,rev,sc};}});
      if(best){used.add(best.j);chain.push({p:lin[best.j],rev:best.rev});grow=true;}}};
  lin.sort((a,b)=>(b.len||0)-(a.len||0));
  lin.forEach((p,i)=>{if(used.has(i))return;used.add(i);let chain=[{p,rev:false}];growForward(chain,p.cond);
    chain=chain.slice().reverse().map(it=>({p:it.p,rev:!it.rev}));growForward(chain,p.cond);
    lines.push({cond:p.cond,items:chain});});
  return lines;}
function projPoly(pts,q){let best={d:1e9,m:0,i:1};let acc=0;for(let i=1;i<pts.length;i++){const a=pts[i-1],b=pts[i];const vx=b[0]-a[0],vy=b[1]-a[1];const L=Math.hypot(vx,vy)||1e-9;let t=((q[0]-a[0])*vx+(q[1]-a[1])*vy)/(L*L);t=Math.max(0,Math.min(1,t));const px=a[0]+vx*t,py=a[1]+vy*t;const d=Math.hypot(q[0]-px,q[1]-py);if(d<best.d)best={d,m:acc+L*t,i,px,py};acc+=L;}return best;}
export function buildSiteJBTP(dxf,an,opts){
  let pieces=dedupe(profileJBTP(dxf,an,opts));const tol=opts.tol||1.3;const ignored=[];
  // plusieurs zones de dessin (détail, légende, copie) : on garde la zone qui contient le plus de pièces
  {const cells={};pieces.forEach(p=>{const k=Math.round(p.pts[0][0]/2000)+':'+Math.round(p.pts[0][1]/2000);(cells[k]=cells[k]||[]).push(p);});const keys=Object.keys(cells).sort((a,b)=>cells[b].length-cells[a].length);const kx=+keys[0].split(':')[0],ky=+keys[0].split(':')[1];const keep=[];pieces.forEach(p=>{const okAll=p.pts.every(q=>isFinite(q[0])&&isFinite(q[1])&&Math.abs(Math.round(q[0]/2000)-kx)<=1&&Math.abs(Math.round(q[1]/2000)-ky)<=1);const okLen=!(p.len>40)&&!(p.legs&&(p.legs[0]>10||p.legs[1]>10));if(okAll&&okLen)keep.push(p);else ignored.push(p);});pieces=keep;}
  const chains=chainTolerant(pieces,tol,opts.closeGaps?Math.max(tol,2.8):0);
  let x0=1e9,y0=1e9,x1=-1e9,y1=-1e9;pieces.forEach(p=>p.pts.forEach(q=>{x0=Math.min(x0,q[0]);y0=Math.min(y0,q[1]);x1=Math.max(x1,q[0]);y1=Math.max(y1,q[1]);}));const M=15;x0-=M;y0-=M;x1+=M;y1+=M;const T=p=>[+(p[0]-x0).toFixed(3),+(y1-p[1]).toFixed(3)];
  const dnPts=an.dnTexts.map(t=>({p:T([t.x,t.y]),dn:t.dn,casing:t.casing,cond:/retour/i.test(t.layer)?'R':/aller/i.test(t.layer)?'A':null}));
  const dnAt=(p,cond)=>{let best=null;dnPts.forEach(d=>{if(d.cond&&d.cond!==cond)return;const dd=dist(d.p,p);if(dd<8&&(!best||dd<best.dd))best={dd,d};});return best?best.d:null;};
  const site={id:opts.id,name:opts.name,supplier:opts.supplier||'AXIOM',serie:opts.serie||1,crs:'plan importé (unités du dessin)',source:opts.fileName,method:'Import guidé — profil JBTP/Mensura : pièces lues dans les blocs dessinés (tube/isolation), coudes et tés par blocs, DN par étiquettes ; enchaînement par extrémités (tolérance '+tol+' m, les trous sont signalés par le moteur).',w:+(x1-x0).toFixed(2),h:+(y1-y0).toFixed(2),ann:[],lines:[],warnings:[],report:{}};
  an.dnTexts.forEach(t=>site.ann.push({text:t.t,p:T([t.x,t.y])}));
  const seqs={A:0,R:0};const lines=[];
  chains.sort((a,b)=>b.items.length-a.items.length).forEach(ch=>{const cond=ch.cond;const id=cond+(++seqs[cond]);const els=[];let n={p:0,c:0};
    ch.items.forEach(it=>{const pts=(it.rev?it.p.pts.slice().reverse():it.p.pts).map(T);const mid=pts[Math.floor(pts.length/2)];const lab=dnAt(mid,cond);const dn=lab?lab.dn:(opts.defaultDn||50);const casing=lab?lab.casing:null;
      if(it.p.kind==='pipe'){els.push({id:'P'+(++n.p),kind:'pipe',dn,casing,len:+it.p.len.toFixed(3),axis:[pts],from:pts[0],to:pts[pts.length-1],angle:null});}
      else if(it.p.kind==='bend'){els.push({id:'C'+(++n.c),kind:'bend',dn,casing,len:+((it.p.legs[0]+it.p.legs[1])).toFixed(3),axis:[pts],from:pts[0],to:pts[pts.length-1],angle:it.p.angle,legs:it.p.legs.map(l=>+l.toFixed(3))});}});
    if(!els.length)return;
    if(opts.closeGaps){ // les écarts de dessin sont absorbés par une barre coupée voisine (elle s'allonge jusqu'à toucher) ; les barres entières et les coudes ne bougent pas
      for(let i=1;i<els.length;i++){const a=els[i-1],b=els[i];const g=dist(a.to,b.from);if(g<0.02||g>1.6)continue;const isCut=e=>e.kind==='pipe'&&Math.abs(e.len-12)>0.3&&Math.abs(e.len-6)>0.3&&Math.abs(e.len-16)>0.3;
        if(isCut(a)){const pl=a.axis[0];pl[pl.length-1]=b.from.slice();a.to=b.from.slice();a.len=+(a.len+g).toFixed(3);a.absorbed=(a.absorbed||0)+g;}
        else if(isCut(b)){const pl=b.axis[0];pl[0]=a.to.slice();b.from=a.to.slice();b.len=+(b.len+g).toFixed(3);b.absorbed=(b.absorbed||0)+g;}}}
    const length=els.reduce((s,e)=>s+e.len,0);lines.push({id,name:'Ligne '+id+(cond==='A'?' · aller':' · retour'),cond,parent:null,parentElIdx:null,els,length:+length.toFixed(1),n:els.length});});
  const teePts=pieces.filter(p=>p.kind==='tee').map(p=>({p:T(p.pts[0]),cond:p.cond}));const redPts=pieces.filter(p=>p.kind==='reducer').map(p=>({p:T(p.pts[0]),cond:p.cond,dn1:p.dn1,dn2:p.dn2}));
  const polyOf=l=>{const pts=[];l.els.forEach((e,i)=>{e.axis[0].forEach((q,k)=>{if(i&&k===0)return;pts.push(q);});});return pts;};
  let nT=0,nR=0;const specials=[];
  teePts.forEach(t=>{let best=null;lines.forEach(l=>{if(l.cond!==t.cond)return;const pr=projPoly(polyOf(l),t.p);if(pr.d<1.2&&(!best||pr.d<best.d))best={l,pr};});if(best){specials.push({l:best.l,m:best.pr.m,type:'tee'});}else site.warnings.push('Té à '+t.p.map(v=>v.toFixed(1)).join(',')+' ('+t.cond+') sans ligne à moins de 1,2 m.');});
  redPts.forEach(r=>{let best=null;lines.forEach(l=>{if(r.cond&&l.cond!==r.cond)return;const pr=projPoly(polyOf(l),r.p);if(pr.d<1.5&&(!best||pr.d<best.d))best={l,pr};});if(best)specials.push({l:best.l,m:best.pr.m,type:'reducer',dn1:r.dn1,dn2:r.dn2});});
  specials.forEach(sp=>{const l=sp.l;let m=0;for(let i=0;i<l.els.length;i++){const e=l.els[i];const m1=m+e.len;if(sp.m>=m&&sp.m<=m1&&e.kind==='pipe'){const L=1.0;const a=e.axis[0][0],b=e.axis[0][e.axis[0].length-1];const th=Math.atan2(b[1]-a[1],b[0]-a[0]);const t0=Math.max(0,sp.m-m-L/2),t1=Math.min(e.len,sp.m-m+L/2);const P=t=>[+(a[0]+Math.cos(th)*t).toFixed(3),+(a[1]+Math.sin(th)*t).toFixed(3)];
        const parts=[];if(t0>0.05)parts.push({...e,id:e.id+'a',len:+t0.toFixed(3),axis:[[a,P(t0)]],from:a,to:P(t0)});
        const kind=sp.type;const idx=kind==='tee'?'T'+(++nT):'R'+(++nR);const mid=P((t0+t1)/2);const stub=kind==='tee'?[mid,[+(mid[0]-Math.sin(th)*0.8).toFixed(3),+(mid[1]+Math.cos(th)*0.8).toFixed(3)]]:null;
        parts.push({id:idx,kind,dn:e.dn,casing:e.casing,len:+(t1-t0).toFixed(3),axis:stub?[[P(t0),P(t1)],stub]:[[P(t0),P(t1)]],from:P(t0),to:P(t1),angle:null,dn2:sp.dn2});
        if(e.len-t1>0.05)parts.push({...e,id:e.id+'b',len:+(e.len-t1).toFixed(3),axis:[[P(t1),b]],from:P(t1),to:b,dn:sp.type==='reducer'&&sp.dn2?sp.dn2:e.dn});
        l.els.splice(i,1,...parts);break;}m=m1;}});
  lines.forEach(l=>{const a=l.els[0].from,b=l.els[l.els.length-1].to;let best=null;lines.forEach(o=>{if(o===l||o.cond!==l.cond)return;o.els.forEach((e,i)=>{if(e.kind!=='tee')return;const c=e.axis[0][0];const mid=[(c[0]+e.to[0])/2,(c[1]+e.to[1])/2];const da=dist(mid,a),db=dist(mid,b);const d=Math.min(da,db);if(d<2.5&&(!best||d<best.d))best={o,i,d,rev:db<da};});});
    if(best){l.parent=best.o.id;l.parentElIdx=best.i;l.name='Antenne '+l.id+(l.cond==='A'?' · aller':' · retour');if(best.rev){l.els.reverse();l.els.forEach(e=>{e.axis=e.axis.map(pl=>pl.slice().reverse());const f=e.from;e.from=e.to;e.to=f;});}}});
  lines.forEach(l=>{l.els.forEach(e=>{if(!e.dn)e.dn=opts.defaultDn||50;});});
  site.pieces=pieces.map(p=>({kind:p.kind,cond:p.cond,pts:p.pts.map(T)}));site.T=T;site.lines=lines;site.report={pieces:pieces.length,pipes:pieces.filter(p=>p.kind==='pipe').length,fullBars:pieces.filter(p=>p.kind==='pipe'&&Math.abs(p.len-12)<0.3).length,bends:pieces.filter(p=>p.kind==='bend'&&!p.point).length,tees:teePts.length,reducers:redPts.length,sleeves:pieces.filter(p=>p.kind==='sleeve').length,welds:pieces.filter(p=>p.kind==='weld').length,dnLabels:dnPts.length,lines:lines.length,antennas:lines.filter(l=>l.parent).length};
  if(ignored.length)site.warnings.push(ignored.length+' pièces dessinées dans une autre zone du fichier (détail, légende ou copie à '+Math.round(dist(ignored[0].pts[0],pieces[0].pts[0])/1000)+' km) : ignorées.');
  // trous entre pièces consécutives (convention du dessinateur ?) : mesurés et signalés
  {let gaps=0,gsum=0;lines.forEach(l=>{for(let i=1;i<l.els.length;i++){const g=dist(l.els[i-1].to,l.els[i].from);if(g>0.25){gaps++;gsum+=g;}}});if(gaps)site.warnings.push(gaps+' écarts entre pièces consécutives (moyenne '+(gsum/gaps).toFixed(2)+' m) : les pièces sont dessinées sans se toucher — le moteur les signale en gris ; à confirmer avec le dessinateur (manchon non dessiné ? convention ?).');if(opts.closeGaps){let na=0,sa=0;lines.forEach(l=>l.els.forEach(e=>{if(e.absorbed){na++;sa+=e.absorbed;}}));site.warnings.push(na+' écarts de dessin absorbés par des barres coupées voisines (+'+sa.toFixed(1)+' m au total) ; '+(gaps||0)+' écarts restent en gris (entre deux pièces rigides).');}site.report.gaps=gaps;}
  const orphan=lines.filter(l=>l.n<=2&&!l.parent);if(orphan.length)site.warnings.push(orphan.length+' tronçon(s) isolé(s) de 1–2 pièces non raccordés — à vérifier (pièces dessinées à l\'écart ou trou > '+tol+' m).');
  if(!dnPts.length)site.warnings.push('Aucune étiquette DN lue : DN par défaut '+(opts.defaultDn||50)+'.');
  return site;}

// ---------- aperçu + fond de plan vectoriel (le dessin d'origine, tel quel, sous nos pièces) ----------
export function drawingOf(dxf,filterLayer,T){ // segments du dessin (polylignes, lignes, arcs approchés, blocs développés) → [{layer,pts:[[x,y]...]}]
  const out=[];const arcPts=(e,tf)=>{const a0=(e.rot||0)*Math.PI/180,a1=(e.rot2===undefined?360:e.rot2)*Math.PI/180;let sweep=a1-a0;while(sweep<=0)sweep+=2*Math.PI;const n=Math.max(4,Math.ceil(sweep/(Math.PI/12)));const pts=[];for(let i=0;i<=n;i++){const a=a0+sweep*i/n;pts.push(tf([e.x+e.r*Math.cos(a),e.y+e.r*Math.sin(a)]));}return pts;};
  const emit=(e,tf,layer)=>{if((e.type==='LWPOLYLINE'||e.type==='LINE'||e.type==='POLYLINE')&&e.pts.length>=2){const pts=e.pts.map(tf);if(e.flags&1)pts.push(pts[0]);out.push({layer,pts:pts.map(T)});}else if((e.type==='ARC'||e.type==='CIRCLE')&&isFinite(e.x)&&e.r){out.push({layer,pts:arcPts(e.type==='CIRCLE'?{...e,rot:0,rot2:360}:e,tf).map(T)});}};
  dxf.ents.forEach(e=>{if(!filterLayer(e.layer))return;if(e.type==='INSERT'){const B=dxf.blocks[e.name];if(!B||!isFinite(e.x))return;const th=(e.rot||0)*Math.PI/180,sx=e.sx||1,sy=e.sy||1,c=Math.cos(th),s=Math.sin(th);const tf=p=>[e.x+(p[0]*sx*c-p[1]*sy*s),e.y+(p[0]*sx*s+p[1]*sy*c)];B.forEach(b=>emit(b,tf,e.layer+'/'+(b.layer||'')));}else emit(e,p=>p,e.layer);});
  return out;}
export function previewSVG(site,pieces,w,h){ // aperçu des pièces lues : barres noir, coudes bleu, tés vert, réductions violet, écarts rouge
  const W=site.w,H=site.h;const k=Math.min(w/W,h/H);let s=`<svg viewBox="0 0 ${W} ${H}" width="${Math.round(W*k)}" height="${Math.round(H*k)}" style="background:#f6f5f0;border-radius:8px;max-width:100%">`;
  const sw=Math.max(0.6,1.4/k);
  site.lines.forEach(l=>{for(let i=1;i<l.els.length;i++){const a=l.els[i-1].to,b=l.els[i].from;const g=Math.hypot(a[0]-b[0],a[1]-b[1]);if(g>0.25)s+=`<line x1="${a[0]}" y1="${a[1]}" x2="${b[0]}" y2="${b[1]}" stroke="#d03b3b" stroke-width="${sw*1.6}" stroke-dasharray="${sw*2} ${sw*2}"/>`;}
    l.els.forEach(e=>{const col=e.kind==='bend'?'#2a5fb4':e.kind==='tee'?'#2f8f4e':e.kind==='reducer'?'#7b3fb2':(l.cond==='R'?'#555':'#111');e.axis.forEach(pl=>{s+=`<polyline points="${pl.map(p=>p.join(',')).join(' ')}" fill="none" stroke="${col}" stroke-width="${e.kind==='pipe'?sw:sw*1.8}" stroke-linecap="round" stroke-linejoin="round"/>`;});});});
  s+='</svg>';return s;}
