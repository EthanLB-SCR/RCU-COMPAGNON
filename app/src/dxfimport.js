// Lecture DXF (ASCII) dans le navigateur : entités du modèle + inventaire + proposition de rôles par calque + construction d'un chantier brut.
// ---------- lecture DXF ASCII : un seul automate (paires code/valeur), alimenté soit par une chaîne, soit par un fichier lu en flux ----------
// Types gardés (géométrie + texte). Le reste (3DFACE, POINT, HATCH, IMAGE, SOLID…) est compté dans layersCount mais pas conservé : sur un plan de BE (topo, MNT, cadastre) c'est 90 % du fichier.
const KEEP=new Set(['LWPOLYLINE','POLYLINE','LINE','ARC','CIRCLE','INSERT','TEXT','MTEXT','DIMENSION','ATTDEF']);
const BLOCK_CAP=20000; // au-delà, c'est un fond de plan externe (xref lié) : tronqué et signalé, jamais une pièce (l'appli) ; le traceur, qui veut le fond entier, passe une limite plus haute
export function createDXFParser(opts={}){const blockCap=opts.blockCap||BLOCK_CAP;
  const ents=[];const blocks={};const layersCount={};const layerTable=[];const header={};const truncated=[];let hdrVar=null;
  let section=null,cur=null,blk=null,openPoly=null,openInsert=null,inTable=null;
  const count=(e)=>{if(blk)return;const L=layersCount[e.layer]||(layersCount[e.layer]={});L[e.type]=(L[e.type]||0)+1;};
  const emit=e=>{if(blk){if(blk.ents.length>=blockCap){if(!blk.trunc){blk.trunc=true;truncated.push(blk.name);}return;}blk.ents.push(e);}else ents.push(e);};
  const finish=()=>{if(!cur)return;const e=cur;cur=null;
    if(e.type==='VERTEX'){if(openPoly&&isFinite(e.x)&&!((e.flags||0)&(16|64|128)))openPoly.pts.push([e.x,e.y]);return;} // 16 = point de contrôle spline, 64/128 = maillages : ignorés
    if(e.type==='SEQEND'){if(openPoly){if(openPoly.pts.length>=2)emit(openPoly);openPoly=null;}openInsert=null;return;}
    if(e.type==='ATTRIB'){if(openInsert){(openInsert.attribs=openInsert.attribs||[]).push({tag:e.tag||'',text:e.text||''});}return;}
    count(e);if(!KEEP.has(e.type))return;
    if(e.type==='POLYLINE'){if(e.flags&(16|64))return;e.pts=[];openPoly=e;return;} // 3D mesh / polyface : ignorés ; le POLYLINE est émis au SEQEND
    if(e.type==='LWPOLYLINE'){if(e.pts.length>=2)emit(e);return;}
    if(e.type==='LINE'){if(e.p1&&e.p2){e.pts=[e.p1,e.p2];emit(e);}return;}
    if(e.type==='INSERT'){emit(e);if(e.attFollow)openInsert=e;return;}
    if(e.type==='ARC'||e.type==='CIRCLE'){if(isFinite(e.x)&&e.r>0)emit(e);return;}
    emit(e);};
  const feed=(code,v)=>{
    if(code===0){const t=v.trim();
      if(t==='SECTION'){finish();section='?';return;}
      if(t==='ENDSEC'){finish();if(openPoly){if(openPoly.pts.length>=2)emit(openPoly);openPoly=null;}section=null;blk=null;inTable=null;return;}
      if(t==='EOF'){finish();return;}
      if(section==='BLOCKS'){if(t==='BLOCK'){finish();blk={name:'',ents:[]};cur=null;return;}if(t==='ENDBLK'){finish();if(openPoly){if(openPoly.pts.length>=2)emit(openPoly);openPoly=null;}if(blk&&blk.name)blocks[blk.name]=blk.ents;blk=null;return;}}
      if(section==='TABLES'){if(t==='TABLE'){inTable='?';return;}if(t==='ENDTAB'){inTable=null;return;}if(t==='LAYER'&&inTable==='LAYER'){cur={type:'LAYERDEF'};return;}cur=null;return;}
      if(section==='ENTITIES'||(section==='BLOCKS'&&blk)){finish();cur={type:t,layer:'0',pts:[]};return;}
      cur=null;return;}
    if(section==='?'&&code===2){section=v.trim();return;}
    if(section==='HEADER'){if(code===9){hdrVar=v.trim();return;}if(hdrVar){if(code===70||code===10||code===20||code===40){const k=hdrVar+(code===20?'_y':'');header[k]=parseFloat(v);}else if(code===1||code===2||code===3)header[hdrVar]=v.trim();}return;}
    if(section==='TABLES'){if(inTable==='?'&&code===2){inTable=v.trim();return;}if(cur&&cur.type==='LAYERDEF'&&code===2){layerTable.push(v);cur=null;}return;}
    if(section==='BLOCKS'&&blk&&!cur&&code===2){blk.name=v.trim();return;}
    if(!cur)return;
    switch(code){
      case 8: cur.layer=v;break;
      case 2: if(cur.type==='ATTRIB'||cur.type==='ATTDEF')cur.tag=v.trim();else cur.name=v.trim();break;
      case 10: if(cur.type==='LWPOLYLINE'){cur.pts.push([parseFloat(v),0]);}else if(cur.type==='LINE'){cur.p1=[parseFloat(v),0];}else{cur.x=parseFloat(v);}break;
      case 20: if(cur.type==='LWPOLYLINE'){const p=cur.pts[cur.pts.length-1];if(p)p[1]=parseFloat(v);}else if(cur.type==='LINE'){if(cur.p1)cur.p1[1]=parseFloat(v);}else{cur.y=parseFloat(v);}break;
      case 11: if(cur.type==='LINE')cur.p2=[parseFloat(v),0];else cur.x2=parseFloat(v);break;
      case 21: if(cur.type==='LINE'){if(cur.p2)cur.p2[1]=parseFloat(v);}else cur.y2=parseFloat(v);break;
      case 1: cur.text=(cur.text||'')+v;break;
      case 3: if(cur.type==='MTEXT')cur.text=(cur.text||'')+v;else if(cur.type==='ATTDEF')cur.prompt=v;break;
      case 40: cur.r=parseFloat(v);break; // rayon (ARC/CIRCLE) ou hauteur de texte
      case 41: cur.sx=parseFloat(v);break;
      case 42: if(cur.type==='DIMENSION')cur.measure=parseFloat(v);else if(cur.type==='INSERT')cur.sy=parseFloat(v);break;
      case 50: cur.rot=parseFloat(v);break;
      case 51: cur.rot2=parseFloat(v);break;
      case 66: if(cur.type==='INSERT'&&parseInt(v,10)===1)cur.attFollow=true;break;
      case 70: cur.flags=parseInt(v,10);break;
    }};
  const end=()=>{finish();if(openPoly){if(openPoly.pts.length>=2)emit(openPoly);openPoly=null;}
    return {ents,blocks,layersCount,layerTable,header,units:header.$INSUNITS,truncated};};
  return {feed,end};
}
// texte complet en mémoire (petits fichiers, tests)
export function parseDXF(text){const P=createDXFParser();const lines=text.split(/\r?\n/);const n=lines.length;for(let i=0;i<n-1;i+=2){const code=parseInt(lines[i],10);if(isNaN(code))continue;P.feed(code,lines[i+1]);}return P.end();}
// lecture en flux d'un File/Blob (jamais tout le texte en mémoire) : onProgress(0..1) — les DXF de BE font couramment 200 à 500 Mo
export async function parseDXFFile(file,onProgress,opts){
  const P=createDXFParser(opts||{});const size=file.size||0;let done=0;
  const head=new Uint8Array(await file.slice(0,Math.min(size,1<<20)).arrayBuffer());let enc='utf-8';
  try{new TextDecoder('utf-8',{fatal:true}).decode(head);}catch(e){enc='windows-1252';} // exports AutoCAD anciens (ANSI)
  const dec=new TextDecoder(enc);const reader=file.stream().getReader();
  let rest='';let pendingCode=null;let last=0;
  const run=chunkText=>{let s=rest+chunkText;let i=0;const n=s.length;
    while(true){const j=s.indexOf('\n',i);if(j<0)break;let line=s.slice(i,j);if(line.endsWith('\r'))line=line.slice(0,-1);i=j+1;
      if(pendingCode===null){const c=parseInt(line,10);pendingCode=isNaN(c)?-9999:c;}else{if(pendingCode!==-9999)P.feed(pendingCode,line);pendingCode=null;}}
    rest=s.slice(i);};
  while(true){const {value,done:d}=await reader.read();if(d)break;done+=value.byteLength;run(dec.decode(value,{stream:true}));
    if(onProgress&&size&&done-last>size/100){last=done;try{await onProgress(done/size);}catch(e){}}}
  run(dec.decode()+'\n');if(rest.trim()&&pendingCode!==null&&pendingCode!==-9999)P.feed(pendingCode,rest);
  if(onProgress)try{await onProgress(1);}catch(e){}
  return P.end();}
// développe les blocs insérés d'un calque : la géométrie interne (lignes/polylignes) ramenée dans le dessin
export function expandInserts(dxf,layerSet,pick){const out=[];dxf.ents.forEach(e=>{if(e.type!=='INSERT'||!layerSet.has(e.layer)||!isFinite(e.x))return;const B=dxf.blocks[e.name];if(!B)return;const th=(e.rot||0)*Math.PI/180,sx=e.sx||1,sy=e.sy||1,c=Math.cos(th),s=Math.sin(th);const tf=p=>[e.x+(p[0]*sx*c-p[1]*sy*s),e.y+(p[0]*sx*s+p[1]*sy*c)];
  let cands=B.filter(b=>(b.type==='LWPOLYLINE'||b.type==='LINE'||b.type==='POLYLINE')&&b.pts.length>=2).map(b=>({...b,pts:b.pts.map(tf),layer:e.layer,fromBlock:e.name,ins:[e.x,e.y]}));
  if(pick==='longest'&&cands.length){cands.sort((a,b)=>plen(b.pts)-plen(a.pts));cands=[cands[0]];}
  out.push(...cands);});return out;}
function plen(pts){let L=0;for(let i=1;i<pts.length;i++)L+=Math.hypot(pts[i][0]-pts[i-1][0],pts[i][1]-pts[i-1][1]);return L;}
const clean=t=>String(t||'').replace(/\\[A-Za-z][^;]*;/g,'').replace(/[{}]/g,'').replace(/%%[cC]/g,'Ø').replace(/%%[dD]/g,'°').replace(/\\P/g,' ').trim();
export function analyze(dxf){
  const L=dxf.layersCount;const layers=Object.keys(L).sort();
  const cnt=(lay,type)=>(L[lay]||{})[type]||0;const total=lay=>Object.values(L[lay]||{}).reduce((a,b)=>a+b,0);const geo=lay=>cnt(lay,'LWPOLYLINE')+cnt(lay,'LINE')+cnt(lay,'POLYLINE')+cnt(lay,'INSERT');
  const roles={axesA:[],axesR:[],axes:[],bends:[],tees:[],reducers:[],sleeves:[],welds:[],dn:[],valves:[]};
  // calques candidats « axe du réseau » : proposés cochés quand ils parlent de RCU / chaleur / canalisation projet, décochés pour l'existant et les autres réseaux
  const OTHER=/l[ée]gende|tranch[ée]e|cartouche|\bep\b|ep_|ep |\beu\b|eu_|eu |aep|gaz|\bbt\b|bta|hta|\bht\b|ecl|t[ée]l[ée]com|\bft\b|fibre|unit|assain|egout|[ée]gout|eau|voirie|topo|mnt|cadastre|b[âa]ti|cl[ôo]ture|jardin|veget|mobilier|coupe|profil|phasage|xref|fond de plan|caniveau|fil d'eau|regard/i;
  const NET=/rcu|chauff|chaleur|calep|logstor|renalia|axiom|inpal|canalisation|conduite|pr[ée]sentation|\bcu\b|cu_|cu |_ch_|pro_ch|axe/i;
  const axisCandidates=[];
  layers.forEach(lay=>{const l=lay.toLowerCase();const isA=/aller|all[ée]|_a_|\ba\b/.test(l)&&!/retour/.test(l),isR=/retour|_r_|\br\b/.test(l)&&!/aller/.test(l);
    const g=geo(lay);if(!g)return;
    const netScore=(NET.test(lay)?2:0)+(/projet|pro[_ -]/i.test(lay)?1:0)+(/r[ée]seau|reseau|tube|pipe|trac[ée]/i.test(lay)?1:0);
    const bad=/exist|existant|abandon|supprim|dt |^dt_|d[ée]mol/i.test(lay)||(OTHER.test(lay)&&!/rcu|chauff|calep|logstor|renalia/i.test(lay));
    const nPoly=cnt(lay,'LWPOLYLINE')+cnt(lay,'LINE')+cnt(lay,'POLYLINE');const notAxis=/texte|text|regard|[ée]quipement|commentaire|\bcot|rep[èe]re|indice|accessoire|_e$|_t$|prf|manchon|soudure|coude|(^|[^a-zà-ÿ])t[ée]s?([^a-zà-ÿ]|$)|vanne|l[ée]gende|tranch|pr[ée]lim|fil d'eau|xref|inda|hydro|coupe|gaz|t[ée]l[ée]com|protection|foncage|fon[çc]age/i.test(lay);
    if(netScore>0&&!bad){axisCandidates.push({layer:lay,n:g,nPoly,role:isA?'A':isR?'R':'S',score:netScore,checked:(netScore>=2||/rcu|chauff/i.test(lay))&&nPoly>0&&!notAxis});}
    else if(netScore>0){axisCandidates.push({layer:lay,n:g,nPoly,role:isA?'A':isR?'R':'S',score:netScore-2,checked:false});}
    if(/coude/.test(l))roles.bends.push(lay);
    if((/(^|[^a-zà-ÿ])t[ée]s?([^a-zà-ÿ]|$)/i.test(lay)||/tee/i.test(lay))&&!/texte|t[ée]l[ée]|rte/i.test(lay))roles.tees.push(lay);
    if(/réduction|reduction/.test(l))roles.reducers.push(lay);
    if(/manchon/.test(l))roles.sleeves.push(lay);
    if(/soudure/.test(l))roles.welds.push(lay);
    if(/vanne|equipement|équipement|accessoire/.test(l))roles.valves.push(lay);
    if(/texte/.test(l)&&(cnt(lay,'TEXT')+cnt(lay,'MTEXT'))>0)roles.dn.push(lay);});
  // deux calques cochés qui dessinent le même tracé (ex. « Tracé projet » + « Réseau » détaillé) : on garde le plus détaillé, l'autre est décoché
  const cellsOf=lay=>{const S=new Set();dxf.ents.forEach(e=>{if(e.layer!==lay||!e.pts||e.pts.length<2)return;for(let i=1;i<e.pts.length;i++){const a=e.pts[i-1],b=e.pts[i];const L=Math.hypot(b[0]-a[0],b[1]-a[1]);const n=Math.max(1,Math.ceil(L/5));for(let k=0;k<=n;k++){const x=a[0]+(b[0]-a[0])*k/n,y=a[1]+(b[1]-a[1])*k/n;S.add(Math.round(x/5)+':'+Math.round(y/5));}}});return S;};
  const chk=axisCandidates.filter(c=>c.checked&&c.nPoly>0);const sigs={};chk.forEach(c=>{sigs[c.layer]=cellsOf(c.layer);});
  for(let i=0;i<chk.length;i++)for(let j=i+1;j<chk.length;j++){const a=chk[i],b=chk[j];if(!a.checked||!b.checked)continue;if((a.role==='A'&&b.role==='R')||(a.role==='R'&&b.role==='A'))continue; /* aller et retour se longent : pas un doublon */ const A=sigs[a.layer],B=sigs[b.layer];if(!A.size||!B.size)continue;let inter=0;const [small,big]=A.size<=B.size?[A,B]:[B,A];small.forEach(k=>{if(big.has(k))inter++;});
    if(inter/small.size>0.6){const loser=a.nPoly>=b.nPoly?b:a,winner=loser===a?b:a;loser.checked=false;loser.dup=winner.layer;}}
  // règles de cochage par défaut : jamais un calque sans tracé ; si un aller ET un retour existent, on ne coche pas les calques « axe unique » ; un seul calque par rôle (le mieux noté), les autres restent proposés décochés
  axisCandidates.forEach(c=>{if(c.nPoly===0)c.checked=false;});
  const hasA=axisCandidates.some(c=>c.checked&&c.role==='A'),hasR=axisCandidates.some(c=>c.checked&&c.role==='R');
  if(hasA&&hasR)axisCandidates.forEach(c=>{if(c.role==='S')c.checked=false;});
  ['A','R','S'].forEach(role=>{const cs=axisCandidates.filter(c=>c.checked&&c.role===role).sort((a,b)=>(b.score-a.score)||(b.nPoly-a.nPoly));cs.slice(1).forEach(c=>{const best=cs[0];const samePrefix=c.layer.replace(/[^a-zà-ÿ0-9]/gi,'').slice(0,12).toLowerCase()===best.layer.replace(/[^a-zà-ÿ0-9]/gi,'').slice(0,12).toLowerCase();if(!samePrefix)c.checked=false;});});
  axisCandidates.sort((a,b)=>(b.checked-a.checked)||(b.score-a.score)||(b.n-a.n));
  axisCandidates.forEach(c=>{if(!c.checked)return;if(c.role==='A')roles.axesA.push(c.layer);else if(c.role==='R')roles.axesR.push(c.layer);else roles.axes.push(c.layer);});
  // étiquettes DN : textes « DN50 (60,3/125) », « ALLER DN65 ENV. DN160 », et blocs-étiquettes dont le texte est écrit lettre par lettre (Mensura : D,N,1,0,0)
  const dnTexts=[];const DNRE=/DN\s*(\d{2,4})(?:\s*\(\s*([\d.,]+)\s*\/\s*(\d{2,4})\s*\))?(?:\s*ENV\.?\s*DN\s*(\d{2,4}))?/i;
  const pushDn=(x,y,t,layer)=>{const m=t.match(DNRE);if(!m||!isFinite(x))return;dnTexts.push({x,y,dn:+m[1],dext:m[2]?parseFloat(m[2].replace(',','.')):null,casing:m[3]?+m[3]:m[4]?+m[4]:null,layer,t});};
  dxf.ents.forEach(e=>{if(e.type!=='TEXT'&&e.type!=='MTEXT')return;if(/l[ée]gende/i.test(e.layer))return;pushDn(e.x,e.y,clean(e.text),e.layer);});
  const blockText={};const labelOf=name=>{if(blockText[name]!==undefined)return blockText[name];const B=dxf.blocks[name]||[];const T=B.filter(b=>(b.type==='TEXT'||b.type==='MTEXT')&&b.text&&isFinite(b.x)).slice().sort((a,b)=>(a.x-b.x)||(b.y-a.y));const t=T.length&&T.length<=40?T.map(b=>clean(b.text)).join(T.every(b=>clean(b.text).length<=1)?'':' '):'';blockText[name]=t;return t;};
  dxf.ents.forEach(e=>{if(e.type!=='INSERT'||!e.name||/l[ée]gende/i.test(e.layer))return;const t=labelOf(e.name);if(t&&/DN/i.test(t))pushDn(e.x,e.y,t,e.layer);(e.attribs||[]).forEach(a=>{if(/DN/i.test(a.text||''))pushDn(e.x,e.y,clean(a.text),e.layer);});});
  { // DN porté par le nom du calque des blocs de pièces (ex. Renalia « A_B_DN300 », « SST004_DN40 ») : une étiquette par bloc, dédoublonnée à 2 m
    const seen=[];dxf.ents.forEach(e=>{if(e.type!=='INSERT'||!isFinite(e.x))return;const m=e.layer.match(/(?:^|[_ -])DN\s*(\d{2,3})(?:$|[_ -])/i);if(!m)return;const dn=+m[1];if(seen.some(q=>q.dn===dn&&Math.abs(q.x-e.x)<2&&Math.abs(q.y-e.y)<2))return;seen.push({x:e.x,y:e.y,dn});dnTexts.push({x:e.x,y:e.y,dn,dext:null,casing:null,layer:e.layer,t:'DN'+dn+' (calque '+e.layer+')',fromLayer:true});});}
  const inserts={};dxf.ents.forEach(e=>{if(e.type==='INSERT'){const k=e.name||'?';inserts[k]=(inserts[k]||0)+1;}});
  const namedBlocks=Object.entries(inserts).filter(([k])=>!k.startsWith('*')).sort((a,b)=>b[1]-a[1]);
  const names=namedBlocks.map(x=>x[0]).join(' ');const layStr=layers.join(' ');
  // profil de dessin : quel type de plan on a sous les yeux (décide du lecteur)
  const sig={logstor:/(^|\s)(2000|2500|3500|3600|4200|4900|5031|5033|5252|5600)[\s_-]|joint_single|logstor/i.test(names+' '+layStr),
    renalia:/renalia|zpu/i.test(layStr)||/(^|\s)\d{4,5}\+(\s|$)|(^|\s)kj\d{2,3}(\s|$)|(^|\s)tm\d{2,3}(\s|$)/i.test(names),
    jbtp:layers.some(l=>/Présentation|Presentation/i.test(l))&&layers.some(l=>/ALLER/i.test(l))&&layers.some(l=>/RETOUR/i.test(l)),
    mensuraAxis:layers.some(l=>/Ass - Projet .*(RCU|chauff|chaleur).* - R[ée]seau/i.test(l))||layers.some(l=>/PROJET RCU - Trac/i.test(l))};
  const profile=sig.jbtp?'jbtp':sig.logstor?'logstor':sig.renalia?'renalia':sig.mensuraAxis?'mensura-axis':'generic';
  const supplierGuess=/axiom|iso st/i.test(names)?'AXIOM':sig.renalia?'RENALIA':sig.logstor?'LOGSTOR':/inpal/i.test(layStr)?'INPAL':null;
  const dnSet=[...new Set(dnTexts.map(d=>d.dn))].sort((a,b)=>a-b);
  return {layers,L,total,roles,axisCandidates,dnTexts,inserts,namedBlocks,supplierGuess,dnSet,profile,sig,nEnts:dxf.ents.length,truncated:dxf.truncated||[],units:dxf.units};
}
// ---- construction du chantier brut : lignes par conduite à partir des polylignes d'axe, tés/réductions par blocs, DN par étiquettes ----
function d2(a,b){return Math.hypot(a[0]-b[0],a[1]-b[1]);}
function joinPolys(polys,tol){ // recolle bout à bout les polylignes qui se touchent (extrémité à extrémité) ; chaque polyligne = {pts, dn} → chaînes {pts, segs:[{L,dn}]}
  const P=polys.map(p=>({pts:p.pts.slice(),segs:[{L:plen(p.pts),dn:p.dn===undefined?null:p.dn,src:p.src||null}]}));let changed=true;
  const rev=x=>({pts:x.pts.slice().reverse(),segs:x.segs.slice().reverse()});const cat=(a,b)=>({pts:a.pts.concat(b.pts.slice(1)),segs:a.segs.concat(b.segs)});
  while(changed){changed=false;outer:for(let i=0;i<P.length;i++)for(let j=0;j<P.length;j++){if(i===j)continue;const a=P[i],b=P[j];const A0=a.pts[0],A1=a.pts[a.pts.length-1],B0=b.pts[0],B1=b.pts[b.pts.length-1];
    if(d2(A1,B0)<tol){P[i]=cat(a,b);P.splice(j,1);changed=true;break outer;}
    if(d2(A1,B1)<tol){P[i]=cat(a,rev(b));P.splice(j,1);changed=true;break outer;}
    if(d2(A0,B0)<tol){P[i]=cat(rev(b),a);P.splice(j,1);changed=true;break outer;}
    if(d2(A0,B1)<tol){P[i]=cat(b,a);P.splice(j,1);changed=true;break outer;}}}
  return P;}
function projOnPoly(pts,q){let best={d:1e9,m:0};let acc=0;for(let i=1;i<pts.length;i++){const a=pts[i-1],b=pts[i];const vx=b[0]-a[0],vy=b[1]-a[1];const L=Math.hypot(vx,vy)||1e-9;let t=((q[0]-a[0])*vx+(q[1]-a[1])*vy)/(L*L);t=Math.max(0,Math.min(1,t));const px=a[0]+vx*t,py=a[1]+vy*t;const d=Math.hypot(q[0]-px,q[1]-py);if(d<best.d)best={d,m:acc+L*t,i};acc+=L;}return best;}
export function simplify(pts,tol){ // Douglas-Peucker : garde les vrais angles, efface le bruit du dessin
  if(pts.length<3||tol<=0)return pts;const keep=new Array(pts.length).fill(false);keep[0]=keep[pts.length-1]=true;
  const stack=[[0,pts.length-1]];while(stack.length){const [a,b]=stack.pop();const A=pts[a],B=pts[b];const vx=B[0]-A[0],vy=B[1]-A[1];const L2=vx*vx+vy*vy;let imax=-1,dmax=0;
    for(let i=a+1;i<b;i++){const P=pts[i];let d;if(L2<1e-12)d=Math.hypot(P[0]-A[0],P[1]-A[1]);else{const t=((P[0]-A[0])*vx+(P[1]-A[1])*vy)/L2;const px=A[0]+vx*Math.max(0,Math.min(1,t)),py=A[1]+vy*Math.max(0,Math.min(1,t));d=Math.hypot(P[0]-px,P[1]-py);}if(d>dmax){dmax=d;imax=i;}}
    if(dmax>tol&&imax>0){keep[imax]=true;stack.push([a,imax],[imax,b]);}}
  return pts.filter((p,i)=>keep[i]);}
// fond de plan : le dessin d'origine sous notre réseau (les tubes du BE, la voirie, le bâti…) — calques du réseau en foncé, contexte en clair, jamais la topo ni les symboles répétés des milliers de fois
export function buildDrawing(dxf,T,bbox,netLayers,opts={}){
  const cap=opts.cap||40000,M=opts.margin||40;const [bx0,by0,bx1,by1]=bbox;const inBox=p=>p[0]>bx0-M&&p[0]<bx1+M&&p[1]>by0-M&&p[1]<by1+M;
  const JUNK=/topo|pts|mnt|altitude|alti|cot_|cotation|cartouche|l[ée]gende|point|matricule|carroyage|grille|cadre|titre|hachur|hatch|trame|xref|inda/i;
  const isNet=l=>netLayers.some(n=>l===n||(l.startsWith(n.split(' - ')[0]+' - ')&&/rcu|chauff|(^|[^a-z])cu([^a-z]|$)|ch_|renalia|jbtp|canalis/i.test(l)))||(/rcu|chauff|renalia|logstor|calep|jbtp_cu|pro_ch|canalisation|(^|[^a-z])cu([^a-z]|$)|_dn\d|^sst\d/i.test(l)&&!/exist|l[ée]gende|coupe|profil/i.test(l));
  const insCount={};dxf.ents.forEach(e=>{if(e.type==='INSERT')insCount[e.name]=(insCount[e.name]||0)+1;});
  const out=[];let n=0;const arcPts=(e,tf)=>{const a0=(e.rot||0)*Math.PI/180,a1=(e.rot2===undefined?360:e.rot2)*Math.PI/180;let sweep=a1-a0;while(sweep<=0)sweep+=2*Math.PI;const k=Math.max(4,Math.ceil(sweep/(Math.PI/12)));const pts=[];for(let i=0;i<=k;i++){const a=a0+sweep*i/k;pts.push(tf([e.x+e.r*Math.cos(a),e.y+e.r*Math.sin(a)]));}return pts;};
  const emit=(e,tf,layer,net)=>{let pts=null;if((e.type==='LWPOLYLINE'||e.type==='LINE'||e.type==='POLYLINE')&&e.pts.length>=2){pts=e.pts.map(tf);if(e.flags&1)pts.push(pts[0]);}else if((e.type==='ARC'||e.type==='CIRCLE')&&isFinite(e.x)&&e.r>0&&e.r<50){pts=arcPts(e.type==='CIRCLE'?{...e,rot:0,rot2:360}:e,tf);}if(!pts)return;const q=pts.map(T);if(!q.some(inBox))return;out.push({layer,pts:q,net});n+=q.length;};
  const pass=(wantNet)=>{for(const e of dxf.ents){if(n>cap)break;const lay=e.layer;if(JUNK.test(lay))continue;const net=isNet(lay);if(net!==wantNet)continue;
    if(e.type==='INSERT'){const B=dxf.blocks[e.name];if(!B||!isFinite(e.x)||(insCount[e.name]||0)>250)continue;const th=(e.rot||0)*Math.PI/180,sx=e.sx||1,sy=e.sy||1,c=Math.cos(th),s=Math.sin(th);const tf=p=>[e.x+(p[0]*sx*c-p[1]*sy*s),e.y+(p[0]*sx*s+p[1]*sy*c)];if(!inBox(T([e.x,e.y])))continue;B.forEach(b=>{if(b.type==='INSERT'){const B2=dxf.blocks[b.name];if(!B2||B2.length>400)return;const th2=(b.rot||0)*Math.PI/180,c2=Math.cos(th2),s2=Math.sin(th2),sx2=b.sx||1,sy2=b.sy||1;const tf2=p=>tf([b.x+(p[0]*sx2*c2-p[1]*sy2*s2),b.y+(p[0]*sx2*s2+p[1]*sy2*c2)]);B2.forEach(b2=>emit(b2,tf2,lay+'/'+(b2.layer||''),net));}else emit(b,tf,lay+'/'+(b.layer||''),net);});}
    else emit(e,p=>p,lay,net);}};
  pass(true);pass(false);
  return {drawing:out,truncated:n>cap};}
/* fond de plan automatique (traceur) : TOUT le dessin (calques et blocs compris) sans rien demander — zone principale = l'amas le plus dense de traits (cellules de 250 m + voisines), calques réseau (si reconnus) en foncé, le reste en clair ; les traits sont simplifiés (Douglas-Peucker) et les plus longs passent d'abord sous la limite de points.
   opts : {netLayers:[], cap:200000, margin:60, keepOrigin:{x0,y1}|null, zoneAll:false, minLen:0.3, simp:0.1, units}
   → {drawing:[{layer,pts,net}], bbox (repère du dessin, sans marge), origin, truncated, stats} */
export function buildBackground(dxf,opts={}){
  const cap=opts.cap||200000,M=opts.margin===undefined?60:opts.margin,netLayers=opts.netLayers||[],minLen=opts.minLen===undefined?0.3:opts.minLen,simp=opts.simp===undefined?0.1:opts.simp;
  const JUNK=/cartouche|l[ée]gende|hachur|hatch|trame|carroyage|grille|cadre|titre|matricule/i;
  const isNet=l=>netLayers.some(n=>l===n||l.startsWith(n+'/'))||(netLayers.length===0&&false);
  // 1) tous les traits (entités + blocs, 3 niveaux), en coordonnées du dessin
  const traits=[];const arcPts=(e,tf)=>{const a0=(e.rot||0)*Math.PI/180,a1=(e.rot2===undefined?360:e.rot2)*Math.PI/180;let sweep=a1-a0;while(sweep<=0)sweep+=2*Math.PI;const k=Math.max(4,Math.ceil(sweep/(Math.PI/12)));const pts=[];for(let i=0;i<=k;i++){const a=a0+sweep*i/k;pts.push(tf([e.x+e.r*Math.cos(a),e.y+e.r*Math.sin(a)]));}return pts;};
  const emit=(e,tf,layer)=>{let pts=null;if((e.type==='LWPOLYLINE'||e.type==='LINE'||e.type==='POLYLINE')&&e.pts&&e.pts.length>=2){pts=e.pts.map(tf);if(e.flags&1)pts.push(pts[0]);}else if((e.type==='ARC'||e.type==='CIRCLE')&&isFinite(e.x)&&e.r>0&&e.r<200){pts=arcPts(e.type==='CIRCLE'?{...e,rot:0,rot2:360}:e,tf);}if(!pts)return;traits.push({layer,pts,net:isNet(layer)});};
  const insCount={};dxf.ents.forEach(e=>{if(e.type==='INSERT')insCount[e.name]=(insCount[e.name]||0)+1;});
  const expand=(e,tf,depth,layerPrefix)=>{const B=dxf.blocks[e.name];if(!B||!isFinite(e.x)||depth>3)return;if((insCount[e.name]||0)>3000)return;const th=(e.rot||0)*Math.PI/180,sx=e.sx||1,sy=e.sy||1,c=Math.cos(th),s=Math.sin(th);const tf2=p=>tf([e.x+(p[0]*sx*c-p[1]*sy*s),e.y+(p[0]*sx*s+p[1]*sy*c)]);
    B.forEach(b=>{if(JUNK.test(b.layer||''))return;if(b.type==='INSERT')expand(b,tf2,depth+1,layerPrefix);else emit(b,tf2,layerPrefix+'/'+(b.layer||''));});};
  dxf.ents.forEach(e=>{if(JUNK.test(e.layer||''))return;if(e.type==='INSERT')expand(e,p=>p,1,e.layer||'');else emit(e,p=>p,e.layer||'');});
  // 2) unités : $INSUNITS 4 = mm, 5 = cm ; sinon mètres — vérifié par la taille de la zone (entre 20 m et 50 km)
  let f=opts.units===4?0.001:opts.units===5?0.01:1;
  const len=pts=>{let L=0;for(let i=1;i<pts.length;i++)L+=Math.hypot(pts[i][0]-pts[i-1][0],pts[i][1]-pts[i-1][1]);return L;};
  // 3) zone principale : cellules de 250 m (en unités du dessin corrigées) comptées en traits (pas en longueur : un cadre de 4 km ne pèse rien), la plus dense + voisines ≥ 2 %
  let bbox=null;
  const zoneOf=(fac)=>{const CELL=250/fac;const cells={};const key=p=>Math.floor(p[0]/CELL)+':'+Math.floor(p[1]/CELL);traits.forEach(t=>{const L=len(t.pts)*fac;if(L<minLen)return;const k=key(t.pts[0]);cells[k]=(cells[k]||0)+1;});const ent=Object.entries(cells);if(!ent.length)return null;ent.sort((a,b)=>b[1]-a[1]);const best=ent[0];const thr=Math.max(3,best[1]*0.02);const sel=new Set([best[0]]);const q=[best[0]];
    while(q.length){const c=q.pop();const [cx,cy]=c.split(':').map(Number);for(let dx=-1;dx<=1;dx++)for(let dy=-1;dy<=1;dy++){const k=(cx+dx)+':'+(cy+dy);if((cells[k]||0)>=thr&&!sel.has(k)){sel.add(k);q.push(k);}}}
    let x0=1e18,y0=1e18,x1=-1e18,y1=-1e18;traits.forEach(t=>{if(!sel.has(key(t.pts[0])))return;t.pts.forEach(p=>{if(p[0]<x0)x0=p[0];if(p[0]>x1)x1=p[0];if(p[1]<y0)y0=p[1];if(p[1]>y1)y1=p[1];});});return x0>x1?null:{x0,y0,x1,y1,cells:sel.size,n:best[1]};};
  if(opts.zoneAll){let x0=1e18,y0=1e18,x1=-1e18,y1=-1e18;traits.forEach(t=>t.pts.forEach(p=>{if(p[0]<x0)x0=p[0];if(p[0]>x1)x1=p[0];if(p[1]<y0)y0=p[1];if(p[1]>y1)y1=p[1];}));bbox={x0,y0,x1,y1,cells:0,n:0};}
  else{bbox=zoneOf(f);if(bbox&&f!==1){const w=Math.max(bbox.x1-bbox.x0,bbox.y1-bbox.y0)*f;if(w<20||w>50000){f=1;bbox=zoneOf(1);}}}
  if(!bbox)return {drawing:[],bbox:[0,0,0,0],origin:{x0:0,y1:0},truncated:false,stats:{traits:0,net:0}};
  // 4) repère : origine arrondie à 100 m (ou celle imposée), y vers le haut du plan (SVG y vers le bas → inversé), mètres
  const X0=bbox.x0*f,Y1=bbox.y1*f;const origin=opts.keepOrigin||{x0:Math.floor(X0/100)*100-30,y1:Math.ceil(Y1/100)*100+30};const T=p=>[+(p[0]*f-origin.x0).toFixed(2),+(origin.y1-p[1]*f).toFixed(2)];
  const bx0=bbox.x0*f-M/1,by0=bbox.y0*f-M,bx1=bbox.x1*f+M,by1=bbox.y1*f+M;const inBox=p=>{const x=p[0]*f,y=p[1]*f;return x>=bx0&&x<=bx1&&y>=by0&&y<=by1;};
  // 5) sélection : réseau d'abord, puis le contexte du plus long au plus court, simplifié ; limite de points
  const keep=[];traits.forEach(t=>{const L=len(t.pts)*f;if(L<minLen)return;if(!t.pts.some(inBox))return;t.L=L;keep.push(t);});
  keep.sort((a,b)=>(b.net-a.net)||(b.L-a.L));const out=[];let n=0,truncated=false;
  for(const t of keep){let q=t.pts.map(T);if(simp>0&&q.length>2)q=simplify(q,simp);if(n+q.length>cap){truncated=true;if(!t.net)break;}out.push({layer:t.layer,pts:q,net:t.net});n+=q.length;}
  const q0=T([bbox.x0,bbox.y1]),q1=T([bbox.x1,bbox.y0]);const bb=[Math.min(q0[0],q1[0]),Math.min(q0[1],q1[1]),Math.max(q0[0],q1[0]),Math.max(q0[1],q1[1])];
  return {drawing:out,bbox:bb,origin,truncated,units:f,stats:{traits:out.length,net:out.filter(d=>d.net).length,total:traits.length,kept:keep.length,cells:bbox.cells,points:n}};
}
function midOf(pts){const L=plen(pts)/2;let d=0;for(let i=1;i<pts.length;i++){const s=d2(pts[i-1],pts[i]);if(d+s>=L){const t=s?(L-d)/s:0;return [pts[i-1][0]+(pts[i][0]-pts[i-1][0])*t,pts[i-1][1]+(pts[i][1]-pts[i-1][1])*t];}d+=s;}return pts[pts.length-1];}
export function buildSite(dxf,an,roles,opts){
  const E=dxf.ents;const axisLayers={A:new Set(roles.axesA),R:new Set(roles.axesR),S:new Set(roles.axes)};
  const allPts=[];E.forEach(e=>{if(e.pts&&e.pts.length)e.pts.forEach(p=>allPts.push(p));else if(isFinite(e.x))allPts.push([e.x,e.y]);});
  // seulement l'emprise du réseau (axes) pour ne pas embarquer tout le fond de plan
  const allAxis=new Set([...axisLayers.A,...axisLayers.R,...axisLayers.S]);const axisPolys=E.filter(e=>(e.type==='LWPOLYLINE'||e.type==='LINE'||e.type==='POLYLINE')&&allAxis.has(e.layer)&&e.pts.length>=2);
  // zone principale du réseau : cellules de 1,5 km, la plus chargée (en mètres de tracé) et ses voisines ; le reste (légende, détail, copie à des km) est ignoré
  const CELL=500;const cells={};const key=p=>Math.round(p[0]/CELL)+':'+Math.round(p[1]/CELL);axisPolys.forEach(e=>{e.pts.forEach(p=>{cells[key(p)]=(cells[key(p)]||0)+0;});cells[key(e.pts[0])]+=plen(e.pts);});
  // amas de cellules voisines (8 voisins) : le réseau est un amas continu ; une légende ou un détail à des kilomètres est un autre amas
  const comp={};let nc=0;Object.keys(cells).forEach(k=>{if(comp[k]!==undefined)return;const id=nc++;const st=[k];comp[k]=id;while(st.length){const c=st.pop();const [cx,cy]=c.split(':').map(Number);for(let dx=-1;dx<=1;dx++)for(let dy=-1;dy<=1;dy++){const nk=(cx+dx)+':'+(cy+dy);if(cells[nk]!==undefined&&comp[nk]===undefined){comp[nk]=id;st.push(nk);}}}});
  const compLen={};Object.keys(cells).forEach(k=>{compLen[comp[k]]=(compLen[comp[k]]||0)+cells[k];});const mainComp=+Object.keys(compLen).sort((a,b)=>compLen[b]-compLen[a])[0];
  const inZone=p=>comp[key(p)]===mainComp;
  const netPts=[];axisPolys.forEach(e=>{if(inZone(e.pts[0]))e.pts.forEach(p=>netPts.push(p));});
  const src=netPts.length?netPts:allPts;let x0=1e9,y0=1e9,x1=-1e9,y1=-1e9;src.forEach(p=>{x0=Math.min(x0,p[0]);y0=Math.min(y0,p[1]);x1=Math.max(x1,p[0]);y1=Math.max(y1,p[1]);});
  const M=20;x0-=M;y0-=M;x1+=M;y1+=M;const T=p=>[+(p[0]-x0).toFixed(3),+(y1-p[1]).toFixed(3)];
  const site={id:opts.id,name:opts.name,supplier:opts.supplier,serie:opts.serie||1,crs:'plan importé (unités du dessin = mètres)',source:opts.fileName,method:'Import guidé v2 : axes des calques choisis (DN par tronçon d\'après les étiquettes), coudes aux changements de direction (≥ 15°), tés aux jonctions et blocs, vannes et réductions aux blocs ; le puzzle catalogue est fabriqué ensuite par le moteur, conduite par conduite.',w:+(x1-x0).toFixed(2),h:+(y1-y0).toFixed(2),ann:[],lines:[],warnings:[],report:{}};
  an.dnTexts.forEach(t=>{const p=T([t.x,t.y]);site.ann.push({text:t.t,p});});
  const isIns=e=>e.type==='INSERT'&&isFinite(e.x)&&!/l[ée]gende/i.test(e.layer);
  const tees=E.filter(e=>isIns(e)&&(roles.tees.includes(e.layer)||/(^|[^a-zà-ÿ])t[ée]s?([^a-zà-ÿ]|$)/i.test(e.name||''))).map(e=>({p:T([e.x,e.y]),layer:e.layer,name:e.name}));
  const reds=E.filter(e=>isIns(e)&&(roles.reducers.includes(e.layer)||/r[ée]duction/i.test(e.name||''))).map(e=>{const m=(e.name||'').match(/DN\s*(\d+)\s*[x×\/]\s*(\d+)/i)||(e.name||'').match(/(\d{2,3})\s*[x×\/]\s*(\d{2,3})/);return {p:T([e.x,e.y]),name:e.name,dn1:m?+m[1]:null,dn2:m?+m[2]:null,layer:e.layer};});
  const valves=E.filter(e=>isIns(e)&&/vanne|valve|purge|vidange/i.test(e.name||'')).map(e=>({p:T([e.x,e.y]),name:e.name,layer:e.layer,kind:/purge|vidange/i.test(e.name||'')?'purge':'valve'}));
  const bendsBlocks=E.filter(e=>isIns(e)&&(roles.bends.includes(e.layer)||/coude/i.test(e.name||''))).map(e=>{const m=((e.name||'')+' '+e.layer).match(/(\d{1,3})\s*°/);return {p:T([e.x,e.y]),ang:m?+m[1]:null,layer:e.layer,name:e.name};});
  const dnPts=an.dnTexts.map(t=>({p:T([t.x,t.y]),dn:t.dn,casing:t.casing,dext:t.dext,cond:/retour/i.test(t.layer+' '+t.t)?'R':/aller/i.test(t.layer+' '+t.t)?'A':null}));
  const dnNear=(p,cond,maxD)=>{let best=null;dnPts.forEach(d=>{if(d.cond&&cond&&d.cond!==cond)return;const dd=d2(d.p,p);if(dd<maxD&&(!best||dd<best.dd))best={dd,d};});return best;};
  // nœuds du plan (Mensura : symboles « Regards » sur le calque frère de l'axe) — les tronçons s'y arrêtent au bord du symbole (10-30 cm)
  const nodeLayers=new Set();[...allAxis].forEach(l=>{const cand=[l.replace(/R[ée]seau/i,'Regards'),l.replace(/R[ée]seau/i,'Noeuds'),l.replace(/R[ée]seau/i,'Nœuds')];cand.forEach(c=>{if(c!==l&&dxf.layersCount[c])nodeLayers.add(c);});});
  const nodePts=E.filter(e=>e.type==='INSERT'&&isFinite(e.x)&&nodeLayers.has(e.layer)).map(e=>T([e.x,e.y]));
  const mk=(cond,polys)=>{
    // 1) DN par tronçon dessiné (étiquette la plus proche du milieu, < 6 m)
    const segs=[];const ignored=[];polys.forEach(pl=>{const raw=pl;const pts=pl.map(T);const L=plen(pts);if(L<=0.02)return;if(!inZone(raw[0])){ignored.push({L});return;}const b=dnNear(midOf(pts),cond,6);segs.push({pts,dn:b?b.d.dn:null,casing:b?b.d.casing:null,L});});
    // 2) zone principale : les tracés à l'écart (légende, détail, copie à des km) ont été ignorés
    if(ignored.length)site.warnings.push(ignored.length+' tracé(s) '+(cond?('('+(cond==='A'?'aller':'retour')+') '):'')+'dessinés à l\'écart du réseau ('+Math.round(ignored.reduce((s,x)=>s+x.L,0))+' m, légende ou détail) : ignorés.');
    // 3) nœuds : extrémités recalées sur les symboles de nœud (< 0,6 m) ou entre elles (< 0,35 m)
    const nodes=[];const nodeOf=p=>{let best=null;for(let i=0;i<nodes.length;i++){const d=d2(nodes[i].p,p);if(d<(nodes[i].sym?0.6:0.35)&&(!best||d<best.d))best={i,d};}if(best)return best.i;nodes.push({p:p.slice(),sym:false,edges:[]});return nodes.length-1;};
    nodePts.forEach(p=>{nodes.push({p:p.slice(),sym:true,edges:[]});});
    const edges=segs.map((sg,ei)=>{const a=nodeOf(sg.pts[0]),b=nodeOf(sg.pts[sg.pts.length-1]);const pts=sg.pts.slice();pts[0]=nodes[a].p.slice();pts[pts.length-1]=nodes[b].p.slice();const e={id:ei,a,b,pts,L:plen(pts),dn:sg.dn,casing:sg.casing,used:false};nodes[a].edges.push(e);nodes[b].edges.push(e);return e;});
    // interruptions du tracé (un bloc de pièce posé sur l'axe coupe le trait) : deux bouts libres, proches (< 2,5 m), à peu près alignés → on ponte, et on le note (le moteur/les doutes verront ce qu'il y a dedans)
    let bridged=0;{const deg1=nodes.map((nd,i)=>({i,nd})).filter(x=>x.nd.edges.length===1);const dirOut=(nd,i)=>{const e=nd.edges[0];const pts=e.a===i?e.pts:e.pts.slice().reverse();return Math.atan2(pts[0][1]-pts[1][1],pts[0][0]-pts[1][0]);};
      const used=new Set();deg1.forEach(x=>{if(used.has(x.i))return;let best=null;deg1.forEach(y=>{if(y.i===x.i||used.has(y.i))return;const d=d2(x.nd.p,y.nd.p);if(d>4||d<0.001)return;const dx=dirOut(x.nd,x.i),dy=dirOut(y.nd,y.i);let t=Math.abs(dx-(dy+Math.PI));while(t>Math.PI)t=Math.abs(t-2*Math.PI);if(t>(d>2.5?Math.PI/6:Math.PI/3))return;const sc=d+t;if(!best||sc<best.sc)best={y,sc,d};});
        if(best){used.add(x.i);used.add(best.y.i);const e={id:edges.length,a:x.i,b:best.y.i,pts:[x.nd.p.slice(),best.y.nd.p.slice()],L:best.d,dn:null,casing:null,used:false,gap:true};edges.push(e);x.nd.edges.push(e);best.y.nd.edges.push(e);bridged++;}});}
    if(bridged)site.warnings.push(bridged+' interruption(s) du tracé '+(cond?('('+(cond==='A'?'aller':'retour')+') '):'')+'de moins de 4 m refermée(s) (symbole ou pièce dessinée sur l\'axe ?) — à vérifier.');
    const dirAt=(e,from)=>{const pts=from===e.a?e.pts:e.pts.slice().reverse();return Math.atan2(pts[1][1]-pts[0][1],pts[1][0]-pts[0][0]);};
    const dirIn=(e,to)=>{const pts=to===e.b?e.pts:e.pts.slice().reverse();const n=pts.length;return Math.atan2(pts[n-1][1]-pts[n-2][1],pts[n-1][0]-pts[n-2][0]);};
    const turn=(a,b)=>{let d=b-a;while(d>Math.PI)d-=2*Math.PI;while(d<-Math.PI)d+=2*Math.PI;return Math.abs(d);};
    // 4) marche : depuis une feuille, on continue au nœud suivant par l'arête la plus dans l'axe ; la plus longue marche = ligne principale, puis les autres (leur départ tombe sur une ligne déjà faite → antenne)
    const walk=(start,commit)=>{const chain=[];let n=start,prevDir=null;const seen=new Set();
      while(true){const cand=nodes[n].edges.filter(e=>!e.used&&!seen.has(e.id));if(!cand.length)break;let e;if(prevDir===null)e=cand.sort((x,y)=>y.L-x.L)[0];else{e=cand.map(x=>({x,t:turn(prevDir,dirAt(x,n))})).sort((p,q)=>p.t-q.t)[0].x;}
        const rev=e.a!==n;const pts=rev?e.pts.slice().reverse():e.pts;chain.push({e,pts,rev});seen.add(e.id);prevDir=dirIn(e,rev?e.a:e.b);n=rev?e.a:e.b;if(nodes[n].edges.filter(x=>!x.used&&!seen.has(x.id)).length===0)break;}
      if(commit)chain.forEach(c=>{c.e.used=true;});return chain;};
    const lines=[];let guard=0;
    while(edges.some(e=>!e.used)&&guard++<5000){
      const leaves=nodes.map((nd,i)=>({i,deg:nd.edges.filter(e=>!e.used).length})).filter(x=>x.deg===1).map(x=>x.i);
      const starts=leaves.length?leaves:nodes.map((nd,i)=>i).filter(i=>nodes[i].edges.some(e=>!e.used));
      let best=null;starts.forEach(st=>{const ch=walk(st,false);const L=ch.reduce((s,c)=>s+c.e.L,0);if(!best||L>best.L)best={st,ch,L};});
      if(!best||!best.ch.length)break;const ch=walk(best.st,true);
      const pts=[];ch.forEach((c,i)=>{c.pts.forEach((p,k)=>{if(i&&k===0)return;pts.push(p);});});
      const dnSegs=[];let m=0;ch.forEach(c=>{const last=dnSegs[dnSegs.length-1];const dn=c.e.dn;if(last&&last.dn===dn)last.m1=+(m+c.e.L).toFixed(3);else dnSegs.push({m0:+m.toFixed(3),m1:+(m+c.e.L).toFixed(3),dn});m+=c.e.L;});
      lines.push({pts,cond,id:null,len:plen(pts),dnSegs,startNode:best.st,endNode:(()=>{const c=ch[ch.length-1];return c.rev?c.e.a:c.e.b;})(),casing:ch.find(c=>c.e.casing)?.casing||null});}
    // règle du chef : le réseau se dessine à la règle, droit entre les vrais angles ; les petites cassures du dessin (< 35 cm d'écart) sont lissées
    lines.forEach(l=>{const before=l.len;const pts=simplify(l.pts,opts.ruler===undefined?0.35:opts.ruler);if(pts.length<l.pts.length){l.pts=pts;l.len=plen(pts);const k=before>0?l.len/before:1;l.dnSegs=l.dnSegs.map(sg=>({m0:+(sg.m0*k).toFixed(3),m1:+(sg.m1*k).toFixed(3),dn:sg.dn}));}});
    lines.sort((a,b)=>b.len-a.len);lines.forEach((l,k)=>{l.id=(cond||'L')+(k+1);});
    lines.forEach(l=>{const S=l.dnSegs.filter(sg=>sg.dn!==null);if(S.length>=2&&S[0].dn<S[S.length-1].dn){l.pts.reverse();l.dnSegs=l.dnSegs.slice().reverse().map(sg=>({m0:+(l.len-sg.m1).toFixed(3),m1:+(l.len-sg.m0).toFixed(3),dn:sg.dn}));const t=l.startNode;l.startNode=l.endNode;l.endNode=t;}}); // du gros DN (chaufferie) vers le petit
    // DN manquants : hérités du voisin dans la ligne, sinon de la ligne parente / par défaut ; tronçons contigus de même DN fusionnés
    lines.forEach(l=>{const S=l.dnSegs;for(let i=0;i<S.length;i++)if(S[i].dn===null){for(let j=i-1;j>=0;j--)if(S[j].dn!==null){S[i].dn=S[j].dn;break;}}for(let i=S.length-1;i>=0;i--)if(S[i].dn===null){for(let j=i+1;j<S.length;j++)if(S[j].dn!==null){S[i].dn=S[j].dn;break;}}
      const M=[];S.forEach(sg=>{const last=M[M.length-1];if(last&&last.dn===sg.dn)last.m1=sg.m1;else M.push({...sg});});l.dnSegs=M;const byLen={};M.forEach(sg=>{byLen[sg.dn]=(byLen[sg.dn]||0)+(sg.m1-sg.m0);});const mainDn=Object.entries(byLen).sort((a,b)=>b[1]-a[1])[0];l.dnNum=mainDn&&mainDn[0]!=='null'?+mainDn[0]:null;});
    // 5) antennes : le départ (ou l'arrivée) d'une ligne tombe sur une autre ligne plus longue → té sur la parente
    lines.forEach(l=>{for(const which of ['start','end']){const end=which==='start'?l.pts[0]:l.pts[l.pts.length-1];let best=null;lines.forEach(o=>{if(o===l||o.len<l.len)return;const pr=projOnPoly(o.pts,end);if(pr.d<0.7&&(!best||pr.d<best.d))best={o,pr};});
      if(best){l.parent=best.o.id;l.parentM=best.pr.m;best.o.specials=best.o.specials||[];if(!best.o.specials.some(s=>s.type==='tee'&&Math.abs(s.m-best.pr.m)<0.5))best.o.specials.push({m:best.pr.m,type:'tee',branch:l.id});if(which==='end'){l.pts.reverse();l.dnSegs=l.dnSegs.slice().reverse().map(sg=>({m0:+(l.len-sg.m1).toFixed(3),m1:+(l.len-sg.m0).toFixed(3),dn:sg.dn}));}break;}}});
    lines.forEach(l=>{if(l.dnNum===null&&l.parent){const p=lines.find(o=>o.id===l.parent);if(p&&p.dnNum){l.dnNum=p.dnNum;l.dnSegs=[{m0:0,m1:l.len,dn:p.dnNum}];l.dnInherited=true;}}});
    // 6) tés (blocs) non encore posés, réductions, vannes
    const near=(pt,maxD)=>{let best=null;lines.forEach(o=>{const pr=projOnPoly(o.pts,pt);if(pr.d<maxD&&(!best||pr.d<best.d))best={o,pr};});return best;};
    tees.forEach(t=>{const best=near(t.p,0.8);if(best){best.o.specials=best.o.specials||[];if(!best.o.specials.some(s=>s.type==='tee'&&Math.abs(s.m-best.pr.m)<1.5))best.o.specials.push({m:best.pr.m,type:'tee',branch:null,block:t.name});}});
    reds.forEach(r=>{const best=near(r.p,1.5);if(best){best.o.specials=best.o.specials||[];best.o.specials.push({m:best.pr.m,type:'reducer',dn1:r.dn1,dn2:r.dn2,block:r.name});}});
    valves.forEach(v=>{const best=near(v.p,1.5);if(best){v.hit=true;best.o.specials=best.o.specials||[];if(!best.o.specials.some(s=>s.type==='valve'&&Math.abs(s.m-best.pr.m)<1))best.o.specials.push({m:best.pr.m,type:'valve',block:v.name,sub:v.kind});}});
    // 7) changements de DN sans bloc de réduction → réduction posée au changement (signalée)
    lines.forEach(l=>{for(let i=1;i<l.dnSegs.length;i++){const a=l.dnSegs[i-1],b=l.dnSegs[i];if(a.dn===b.dn||a.dn===null||b.dn===null)continue;const m=b.m0;l.specials=l.specials||[];if(!l.specials.some(s=>s.type==='reducer'&&Math.abs(s.m-m)<3))l.specials.push({m,type:'reducer',dn1:a.dn,dn2:b.dn,block:null,implied:true});}});
    lines.forEach(l=>{if(l.dnNum===null){l.dnNum=opts.defaultDn||100;l.dnFrom='par défaut ('+l.dnNum+')';l.dnSegs=[{m0:0,m1:l.len,dn:l.dnNum}];}else l.dnFrom=(l.dnInherited?'hérité de la ligne parente ':'étiquettes du plan ')+'('+l.dnSegs.map(sg=>'DN'+sg.dn+' sur '+(sg.m1-sg.m0).toFixed(0)+' m').join(', ')+')';});
    return lines.filter(l=>l.len>=0.5);};
  const polysOf=set=>E.filter(e=>(e.type==='LWPOLYLINE'||e.type==='LINE'||e.type==='POLYLINE')&&set.has(e.layer)).map(e=>e.pts).concat(opts.expandBlocks?expandInserts(dxf,set,'longest').map(e=>e.pts):[]);
  const out=[];if(axisLayers.A.size||axisLayers.R.size){out.push(...mk('A',polysOf(axisLayers.A)));out.push(...mk('R',polysOf(axisLayers.R)));}
  if(axisLayers.S.size)out.push(...mk(null,polysOf(axisLayers.S)));
  const lostV=valves.filter(v=>!v.hit&&inZone([v.p[0]+x0,y1-v.p[1]]));if(lostV.length)site.warnings.push(lostV.length+' bloc(s) vanne/purge/vidange à plus de 1,5 m de tout axe coché ('+[...new Set(lostV.map(v=>v.name))].join(', ')+') : ignorés (légende, détail ?).');
  site.lines=out.map(l=>({id:l.id,name:(l.parent?'Antenne ':'Ligne ')+l.id+(l.cond?(l.cond==='A'?' · aller':' · retour'):''),cond:l.cond,parent:l.parent||null,pts:l.pts,specials:(l.specials||[]).sort((a,b)=>a.m-b.m),dnNum:l.dnNum,dnSegs:l.dnSegs,casing:l.casing,dnFrom:l.dnFrom,length:+l.len.toFixed(1)}));
  site.T=T;site.netLayers=[...allAxis];site.bbox=[M,M,+(x1-x0-M).toFixed(2),+(y1-y0-M).toFixed(2)];
  const nSpec=t=>site.lines.reduce((s,l)=>s+l.specials.filter(x=>x.type===t).length,0);
  site.report={lines:site.lines.length,antennas:site.lines.filter(l=>l.parent).length,tees:nSpec('tee'),reducers:nSpec('reducer'),valves:nSpec('valve'),bendBlocks:bendsBlocks.length,dnLabels:dnPts.length,sleeves:E.filter(e=>roles.sleeves.includes(e.layer)).length,welds:E.filter(e=>roles.welds.includes(e.layer)).length,length_m:Math.round(site.lines.reduce((s,l)=>s+l.length,0))};
  if(!site.lines.length)site.warnings.push('Aucun axe trouvé dans les calques cochés.');
  const noDn=site.lines.filter(l=>/défaut/.test(l.dnFrom));if(noDn.length)site.warnings.push(noDn.length+' ligne(s) sans étiquette DN à moins de 6 m — DN par défaut, à corriger dans la fiche.');
  const impl=site.lines.reduce((s,l)=>s+l.specials.filter(x=>x.type==='reducer'&&x.implied).length,0);if(impl)site.warnings.push(impl+' changement(s) de DN sans bloc de réduction sur le plan : réduction posée au changement d\'étiquette (à vérifier).');
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
export function previewSVG(site,pieces,w,h){ // aperçu : lignes (axes ou pièces), coudes bleu, tés vert, réductions violet, vannes orange, écarts rouge
  const W=site.w,H=site.h;const k=Math.min(w/W,h/H);let s=`<svg viewBox="0 0 ${W} ${H}" width="${Math.round(W*k)}" height="${Math.round(H*k)}" style="background:#f6f5f0;border-radius:8px;max-width:100%">`;
  const sw=Math.max(0.6,1.4/k);const colOf=cond=>cond==='R'?'#2a5fb4':cond==='A'?'#c8382f':'#111';
  const ptAt=(pts,m)=>{let d=0;for(let i=1;i<pts.length;i++){const L=Math.hypot(pts[i][0]-pts[i-1][0],pts[i][1]-pts[i-1][1]);if(d+L>=m){const t=L?(m-d)/L:0;return [pts[i-1][0]+(pts[i][0]-pts[i-1][0])*t,pts[i-1][1]+(pts[i][1]-pts[i-1][1])*t];}d+=L;}return pts[pts.length-1];};
  site.lines.forEach(l=>{
    if(l.els){for(let i=1;i<l.els.length;i++){const a=l.els[i-1].to,b=l.els[i].from;const g=Math.hypot(a[0]-b[0],a[1]-b[1]);if(g>0.25)s+=`<line x1="${a[0]}" y1="${a[1]}" x2="${b[0]}" y2="${b[1]}" stroke="#d03b3b" stroke-width="${sw*1.6}" stroke-dasharray="${sw*2} ${sw*2}"/>`;}
      l.els.forEach(e=>{const col=e.kind==='bend'?'#2a5fb4':e.kind==='tee'?'#2f8f4e':e.kind==='reducer'?'#7b3fb2':(l.cond==='R'?'#555':'#111');e.axis.forEach(pl=>{s+=`<polyline points="${pl.map(p=>p.join(',')).join(' ')}" fill="none" stroke="${col}" stroke-width="${e.kind==='pipe'?sw:sw*1.8}" stroke-linecap="round" stroke-linejoin="round"/>`;});});}
    else if(l.pts){s+=`<polyline points="${l.pts.map(p=>p.join(',')).join(' ')}" fill="none" stroke="${colOf(l.cond)}" stroke-width="${l.parent?sw:sw*1.6}" stroke-linecap="round" stroke-linejoin="round" opacity=".9"/>`;
      (l.specials||[]).forEach(sp=>{const p=ptAt(l.pts,sp.m);const col=sp.type==='tee'?'#2f8f4e':sp.type==='reducer'?'#7b3fb2':sp.type==='valve'?'#e08a1e':'#2a5fb4';s+=`<circle cx="${p[0]}" cy="${p[1]}" r="${sw*2.2}" fill="${col}" stroke="#fff" stroke-width="${sw*.6}"/>`;});}});
  s+='</svg>';return s;}
