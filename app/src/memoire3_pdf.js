// memoire3_pdf.js — 14/10 soir (lot M3) : EXPORT PDF DIRECT DU MÉMOIRE TECHNIQUE. Ethan : « export pdf plutôt serait mieux ».
// Un clic → Memoire_technique_<num>.pdf téléchargé, au gabarit SCR du Word (memoire3_docx.js) : page de garde (photo, ville, année, n°, titre, logo, badges,
// affaire, client, date), sommaire avec numéros de page et points de conduite, bandeau d'en-tête et pied « Réf. · logo · Page n / N » (sauf garde), titres
// numérotés aux styles du gabarit, texte 12 pt (justifié en HSE), puces carrées de couleur, tableaux (en-tête orange répété, bandes), images (largeur %,
// côte à côte, légende), organigramme « Moyens humains », trous [À COMPLÉTER : …] en rouge, titres jamais seuls en bas de page.
// · Moteur : pdfmake 0.2.23 (licence MIT) servi À CÔTÉ de l'appli (public/vendor → dist/vendor : pas dans le fichier unique de 4 Mo), chargé à la demande une
//   fois par session ; repli jsDelivr (version figée, empreinte SRI). Police : Carlito (SIL OFL 1.1, métriquement identique à Calibri), fichiers d'origine
//   NON modifiés (public/fonts, licence Carlito-OFL.txt), servis par l'appli seulement (intégration : pas de repli vers un dépôt non vérifiable d'ici) ;
//   italique chargée seulement si le document en contient.
// · Entrée : le modèle docModel(a, base, 'doc', true, ctx) de memoire2.js (contrat K5) + octets des images ; HTML du mode 'doc' = balises du contrat K4
//   (p, b, strong, i, em, u, ul, ol, li, table, thead, tbody, tr, th, td, h4, br, sup, sub, span.ac). Rien n'est exécuté : le HTML est découpé en texte
//   (entités décodées ici), jamais injecté dans une page ; les images passent par un canevas (SVG en image : sans script).
// · Sortie : Uint8Array (le PDF) ; pdfInfo = {pages, breaks, ms, bytes, src, fsrc, italic, imgs, skipped, err} pour le message et les tests.
const VER='0.2.23',LIB='vendor/pdfmake-'+VER+'.min.js',CDN='https://cdn.jsdelivr.net/npm/pdfmake@'+VER+'/build/pdfmake.min.js';
const SRI='sha384-8Fgcdr1c4x0qG8ByTWhXwvf1iBa6tQReFeLNBSkvCN9F+/RZuP1ha8RUydfLSGeG'; /* empreinte du fichier du paquet npm officiel (= celui de jsDelivr) */
const FF={normal:'Carlito-Regular.ttf',bold:'Carlito-Bold.ttf',italics:'Carlito-Italic.ttf',bolditalics:'Carlito-BoldItalic.ttf'};
export const pdfInfo={pages:0,breaks:0,ms:0,bytes:0,src:'',fsrc:'',italic:false,imgs:0,skipped:0,err:''};
const MM=v=>v*72/25.4;const LH=2500/2048; /* hauteur de ligne naturelle de Carlito (hhea : 1950 + 550 sur 2048) × taille */
const PW=595.28,PH=841.89;
const hexc=c=>{let h=String(c||'').trim().replace(/^#/,'');if(/^[0-9a-f]{3,4}$/i.test(h))h=h.slice(0,3).split('').map(x=>x+x).join('');return /^[0-9a-f]{6}/i.test(h)?'#'+h.slice(0,6).toUpperCase():'#000000';};
const up=s=>String(s||'').toLocaleUpperCase('fr-FR');

/* ═════════ 1 · CHARGEMENT À LA DEMANDE (une fois par session ; un échec n'est pas retenu : on réessaie au clic suivant) ═════════ */
let LIBP=null;const FB={};
function addScript(src,sri){return new Promise((res,rej)=>{const s=document.createElement('script');s.src=src;s.async=true;if(sri){s.integrity=sri;s.crossOrigin='anonymous';}s.dataset.lot='m3';let t=0;
  const end=e=>{clearTimeout(t);s.onload=s.onerror=null;if(e){s.remove();rej(e);}else res();};t=setTimeout(()=>end(new Error('délai dépassé')),30000);
  s.onload=()=>end(window.pdfMake&&window.pdfMake.createPdf?null:new Error('moteur absent du fichier'));s.onerror=()=>end(new Error('fichier refusé'));document.head.appendChild(s);});}
export function pdfLib(){const w=typeof window!=='undefined'?window:null;if(!w||!w.document)return Promise.reject(new Error('navigateur requis'));if(w.pdfMake&&w.pdfMake.createPdf)return Promise.resolve(w.pdfMake);
  if(!LIBP)LIBP=addScript(new URL(LIB,document.baseURI).href).then(()=>{pdfInfo.src='appli';},()=>addScript(CDN,SRI).then(()=>{pdfInfo.src='cdn';}))
    .then(()=>w.pdfMake,()=>{LIBP=null;throw new Error('moteur PDF non chargé : '+(navigator.onLine===false?'hors connexion':location.protocol==='file:'?'appli ouverte depuis un fichier':'fichier '+LIB+' introuvable'));});
  return LIBP;}
const isFont=u=>u&&u.length>1000&&((u[0]===0&&u[1]===1&&u[2]===0&&u[3]===0)||(u[0]===0x74&&u[1]===0x72)||(u[0]===0x4F&&u[1]===0x54)); /* TrueType / OpenType */
const why=()=>location.protocol==='file:'?'appli ouverte depuis un fichier':navigator.onLine===false?'hors connexion':'réseau';
async function fontFile(k){const name=FF[k];if(FB[name])return FB[name];let u=null,err='';
  try{const r=await fetch(new URL('fonts/'+name,document.baseURI).href);if(r.ok){const x=new Uint8Array(await r.arrayBuffer());if(isFont(x)){u=x;pdfInfo.fsrc='appli';}else err='illisible';}else err='introuvable, erreur '+r.status;}catch(e){err='non chargée : '+why();}
  if(!u)throw new Error('police '+name+' '+err);FB[name]=u;return u;}
export async function pdfFonts(ital){const out={};const keys=ital?['normal','bold','italics','bolditalics']:['normal','bold'];await Promise.all(keys.map(async k=>{out[k]=await fontFile(k);}));return out;}

/* ═════════ 2 · MESURE DU TEXTE (même police, chargée dans un canevas) : points de conduite du sommaire, centrage vertical, titres gardés avec la suite ═════════ */
const MC={c:null,fam:'',f:'',tried:false,cache:new Map()};
async function measInit(fb){if(MC.tried)return;MC.tried=true;try{if(typeof FontFace==='undefined'||!document.fonts)return;const fam='TracePdfCarlito';const mk=(b,wg)=>new FontFace(fam,b.slice().buffer,{weight:wg,style:'normal'});
  const fs=[mk(fb.normal,'400'),mk(fb.bold,'700')];await Promise.all(fs.map(f=>f.load()));fs.forEach(f=>document.fonts.add(f));const c=document.createElement('canvas').getContext('2d');if(c){MC.c=c;MC.fam=fam;}}catch(e){MC.c=null;}}
function tw(s,size,bold){s=String(s);const k=(bold?'b':'r')+size+'|'+s;let v=MC.cache.get(k);if(v!==undefined)return v;
  if(MC.c){const f=(bold?'700 ':'400 ')+size+'px '+MC.fam;if(MC.f!==f){MC.c.font=f;MC.f=f;}v=MC.c.measureText(s).width;}else v=s.length*size*(bold?0.52:0.49);if(MC.cache.size>30000)MC.cache.clear();MC.cache.set(k,v);return v;}
function nLines(s,size,bold,width){s=String(s||'');if(!s.trim())return 1;let n=0;const sp=tw(' ',size,bold);
  s.split('\n').forEach(seg=>{let cur=0,k=1;seg.split(/ +/).filter(Boolean).forEach(w=>{const x=tw(w,size,bold);if(cur>0&&cur+sp+x>width){k++;cur=x;}else cur=cur>0?cur+sp+x:x;if(x>width)k+=Math.floor(x/width);});n+=k;});return n;}
const lineH=(size,lh)=>size*LH*(lh||1);

/* ═════════ 3 · HTML du mode 'doc' → arbre (balises connues seulement) ; entités décodées ici, sans navigateur ═════════ */
const L1='nbsp iexcl cent pound curren yen brvbar sect uml copy ordf laquo not shy reg macr deg plusmn sup2 sup3 acute micro para middot cedil sup1 ordm raquo frac14 frac12 frac34 iquest Agrave Aacute Acirc Atilde Auml Aring AElig Ccedil Egrave Eacute Ecirc Euml Igrave Iacute Icirc Iuml ETH Ntilde Ograve Oacute Ocirc Otilde Ouml times Oslash Ugrave Uacute Ucirc Uuml Yacute THORN szlig agrave aacute acirc atilde auml aring aelig ccedil egrave eacute ecirc euml igrave iacute icirc iuml eth ntilde ograve oacute ocirc otilde ouml divide oslash ugrave uacute ucirc uuml yacute thorn yuml'.split(' ');
const ENT=Object.assign(Object.fromEntries(L1.map((k,i)=>[k,160+i])),{amp:38,lt:60,gt:62,quot:34,apos:39,OElig:338,oelig:339,Scaron:352,scaron:353,Yuml:376,fnof:402,circ:710,tilde:732,ensp:8194,emsp:8195,thinsp:8201,ndash:8211,mdash:8212,lsquo:8216,rsquo:8217,sbquo:8218,ldquo:8220,rdquo:8221,bdquo:8222,dagger:8224,Dagger:8225,bull:8226,hellip:8230,permil:8240,prime:8242,Prime:8243,lsaquo:8249,rsaquo:8250,euro:8364,trade:8482,larr:8592,rarr:8594,harr:8596,minus:8722,le:8804,ge:8805,ne:8800,asymp:8776,infin:8734});
const ent=s=>String(s).replace(/&(#x[0-9a-f]+|#\d+|[a-z][a-z0-9]*);/gi,(m,e)=>{const n=e[0]==='#'?(e[1]==='x'||e[1]==='X'?parseInt(e.slice(2),16):parseInt(e.slice(1),10)):ENT[e];return n>8&&n<0x110000&&!(n>=0xD800&&n<0xE000)?String.fromCodePoint(n):m;});
const ctl=s=>s.replace(/[\u0000-\u0008\u000B\u000C\u000E-\u001F\u007F]/g,'');
export function parseDoc(html){const root={tag:'#root',kids:[]};const st=[root];const re=/<(\/?)([a-zA-Z][a-zA-Z0-9]*)([^>]*)>|([^<]+)/g;let m;
  while((m=re.exec(String(html||'')))){if(m[4]!==undefined){const t=ctl(ent(m[4]));if(t)st[st.length-1].kids.push({tag:'#t',t});continue;}const close=m[1]==='/',tag=m[2].toLowerCase(),at=m[3]||'';
    if(close){for(let i=st.length-1;i>0;i--){if(st[i].tag===tag){st.length=i;break;}}continue;}
    const n={tag,kids:[],cls:(/class="([^"]*)"/.exec(at)||[])[1]||'',cs:Math.min(20,Math.max(1,+((/colspan="(\d+)"/.exec(at)||[])[1]||1))),rs:Math.min(60,Math.max(1,+((/rowspan="(\d+)"/.exec(at)||[])[1]||1)))};
    st[st.length-1].kids.push(n);if(tag!=='br')st.push(n);}
  return root.kids;}
const BLOCK=new Set(['p','ul','ol','table','h4','li','tr','td','th','div','figure','thead','tbody']);
const textOf=n=>n.tag==='#t'?n.t:n.tag==='br'?'\n':(n.kids||[]).map(textOf).join('');

/* ═════════ 4 · IMAGES : JPEG / PNG telles quelles (PNG entrelacé, 16 bits ou très grand avec transparence : redessiné ; photo JPEG de plus de 2600 px : ramenée
   à 2400 px, > 350 dpi sur la largeur de page — un PDF déposable sur les plateformes) ; WebP, GIF, SVG… → PNG par canevas ; image illisible → mise de côté ═════════ */
const sniff=u=>{if(!u||u.length<16)return '';if(u[0]===0xFF&&u[1]===0xD8)return 'jpeg';if(u[0]===0x89&&u[1]===0x50&&u[2]===0x4E&&u[3]===0x47)return 'png';if(u[0]===0x47&&u[1]===0x49&&u[2]===0x46)return 'gif';
  if(u[0]===0x52&&u[1]===0x49&&u[2]===0x46&&u[3]===0x46&&u[8]===0x57&&u[9]===0x45)return 'webp';if(u[0]===0x42&&u[1]===0x4D)return 'bmp';const h=String.fromCharCode.apply(null,u.subarray(0,256));return /<svg[\s>]/i.test(h)?'svg':'';};
const MIME={jpeg:'image/jpeg',png:'image/png',gif:'image/gif',webp:'image/webp',bmp:'image/bmp',svg:'image/svg+xml'};
function decode(u,mime){return new Promise(res=>{let url='';try{url=URL.createObjectURL(new Blob([u],{type:mime}));}catch(e){res(null);return;}const im=new Image();let done=false;
  const fin=v=>{if(done)return;done=true;clearTimeout(t);try{URL.revokeObjectURL(url);}catch(e){}res(v);};const t=setTimeout(()=>fin(null),15000);
  im.onload=()=>fin(im.naturalWidth||im.width?im:(mime==='image/svg+xml'?im:null));im.onerror=()=>fin(null);im.src=url;});}
async function redraw(im,mime,max,jpg){let w=im.naturalWidth||im.width||0,h=im.naturalHeight||im.height||0;if(!w||!h){if(mime!=='image/svg+xml')return null;w=800;h=600;}const k=Math.min(1,max/Math.max(w,h));
  const c=document.createElement('canvas');c.width=Math.max(1,Math.round(w*k));c.height=Math.max(1,Math.round(h*k));const g=c.getContext('2d');if(!g)return null;if(jpg){g.fillStyle='#fff';g.fillRect(0,0,c.width,c.height);}g.drawImage(im,0,0,c.width,c.height);
  const blob=await new Promise(r=>{try{c.toBlob(r,jpg?'image/jpeg':'image/png',jpg?0.88:undefined);}catch(e){r(null);}});if(!blob)return null;return {bytes:new Uint8Array(await blob.arrayBuffer()),w:c.width,h:c.height};}
async function prepImgs(imgs){const map={},vfs={},bad=new Set();let skipped=0;
  await Promise.all(Object.keys(imgs||{}).map(async(id,i)=>{const no=()=>{skipped++;bad.add(id);};try{const x=imgs[id];const u=x&&x.bytes;const kind=sniff(u);if(!kind){no();return;}const im=await decode(u,MIME[kind]);if(!im){no();return;}
    let bytes=u,ext=kind,w=im.naturalWidth||im.width,h=im.naturalHeight||im.height;
    if(kind==='png'){const depth=u[24],ctype=u[25],lace=u[28];if(lace===1||depth===16||((ctype===4||ctype===6)&&w*h>4e6)){const r=await redraw(im,'image/png',2400);if(!r){no();return;}bytes=r.bytes;w=r.w;h=r.h;}}
    else if(kind==='jpeg'){if(Math.max(w,h)>2600){const r=await redraw(im,'image/jpeg',2400,true);if(r){bytes=r.bytes;w=r.w;h=r.h;}}}
    else{const r=await redraw(im,MIME[kind],2400);if(!r){no();return;}bytes=r.bytes;ext='png';w=r.w;h=r.h;}
    if(!w||!h){no();return;}const key='img'+i+'.'+(ext==='jpeg'?'jpg':'png');vfs[key]=bytes;map[id]={key,w,h};}catch(e){no();}}));
  return {map,vfs,bad,skipped};}

/* ═════════ 5 · LE DOCUMENT (pdfmake) ═════════ */
function docDef(M,IM){const T=M.T,V=M.V,a=M.a;const mg=T.margins;const ML=MM(mg[3]),MR=MM(mg[1]),MT=MM(mg[0]),MB=MM(mg[2]);const W=PW-ML-MR,BOT=PH-MB,HC=PH-MT-MB;
  const OR=hexc(T.orange),RED=hexc(T.red),BUL=hexc(T.bul.color),TXT=hexc(T.body.color);const bs=T.body.size,blh=T.body.lh,aft=T.body.after,bind=MM(T.body.indent||0);
  let ital=false,kid=0,NP=0,BRK=0;const nid=p=>(p||'k')+'-'+(++kid);const EST=new WeakMap(),HEAD=new Map(),KEEP=new Map(),GLUE=new WeakSet();
  /* morceaux de texte : gras, italique, souligné, exposant / indice, trou en rouge */
  const run=(t,f)=>{const r={text:t};if(f.b)r.bold=true;if(f.i){r.italics=true;ital=true;}if(f.u)r.decoration='underline';if(f.sup)r.sup=true;else if(f.sub)r.sub=true;if(f.red)r.color=RED;else if(f.col)r.color=f.col;if(f.sz)r.fontSize=f.sz;return r;};
  const same=(x,y)=>x.bold===y.bold&&x.italics===y.italics&&x.decoration===y.decoration&&x.sup===y.sup&&x.sub===y.sub&&x.color===y.color&&x.fontSize===y.fontSize;
  function runs(nodes,f,out){out=out||[];(nodes||[]).forEach(n=>{if(n.tag==='#t'){const t=n.t.replace(/[ \t\r\n\f]+/g,' ');if(t)out.push(run(t,f));return;}if(n.tag==='br'){out.push(run('\n',f));return;}const g=Object.assign({},f);
    if(n.tag==='b'||n.tag==='strong')g.b=1;else if(n.tag==='i'||n.tag==='em')g.i=1;else if(n.tag==='u')g.u=1;else if(n.tag==='sup')g.sup=1;else if(n.tag==='sub')g.sub=1;else if(n.tag==='span'&&/\bac\b/.test(n.cls)){g.red=1;g.i=1;}
    runs(n.kids,g,out);});return out;}
  /* espaces comme en HTML (début, fin, autour d'un retour à la ligne, doublons) ; morceaux de même mise en forme fusionnés */
  function tidy(rs){const out=[];let sp=true;rs.forEach(r=>{let t=r.text.replace(/ *\n */g,'\n');if(sp)t=t.replace(/^ +/,'');if(!t)return;sp=/[ \n]$/.test(t);const p=out[out.length-1];if(p&&same(p,r))p.text+=t;else out.push(Object.assign({},r,{text:t}));});
    while(out.length){const l=out[out.length-1];l.text=l.text.replace(/[ \n]+$/,'');if(l.text)break;out.pop();}return out;}
  const plain=rs=>rs.map(r=>r.text).join('');
  const estL=(rs,sz,w)=>nLines(plain(rs),sz,rs.length>0&&rs.every(r=>r.bold),w);
  const est=(n,h,keep)=>{EST.set(n,{h,keep:keep===undefined?h:keep});return n;};
  const hOf=n=>(EST.get(n)||{h:0}).h;
  /* paragraphe — o : {w largeur, sz, lh, after, ind, jc, f} */
  function para(rs,o){const sz=o.sz||bs,lh=o.lh||blh,ml=o.ind===undefined?bind:o.ind,af=o.after===undefined?aft:o.after;const n={text:rs};if(o.sz)n.fontSize=sz;if(o.lh)n.lineHeight=lh;if(o.jc)n.alignment=o.jc;if(ml||af)n.margin=[ml,0,0,af];
    const L=estL(rs,sz,(o.w||W)-ml);const l1=lineH(sz,lh);return est(n,L*l1+af,Math.min(L,2)*l1);}
  /* titres : petites capitales (minuscules en capitales réduites) ou capitales, comme Word */
  function hruns(t,H){if(H.caps)return [{text:up(t)}];if(!H.sc)return [{text:String(t)}];const out=[];String(t).replace(/(\p{Ll}+)|([^\p{Ll}]+)/gu,(m,lo,hi)=>{out.push(lo?{text:up(lo),fontSize:Math.round(H.size*8)/10}:{text:hi});return m;});return out;}
  function heading(t,H,o){o=o||{};const n={text:hruns(t,H),fontSize:H.size,bold:!!H.bold,color:hexc(H.color),lineHeight:1,headlineLevel:o.lvl||1,id:o.id||nid('t'),margin:[0,o.top===undefined?H.before:o.top,0,H.after]};
    if(H.italic){n.italics=true;ital=true;}if(H.u)n.decoration='underline';if(o.pb)n.pageBreak='before';const L=nLines(H.caps||H.sc?up(t):t,H.size,!!H.bold,W);HEAD.set(n,L*lineH(H.size,1)+H.after);return est(n,L*lineH(H.size,1)+H.after+(n.margin[1]||0),0);}
  /* listes : puces carrées de la couleur du gabarit (niveau 1), rond puis carré noirs dessous ; numérotées 1. 2. 3. */
  function list(n,lvl,o){const isOl=n.tag==='ol';const items=[];let h=0,k0=0;const sz=o.sz||bs,lh=o.lh||blh;const indL=o.cell?MM(1.2):lvl?MM(4):MM(Math.max(0,(isOl?T.ol.indent:T.bul.indent)-(T.bul.hang||6.35)));
    const w=(o.w||W)-indL-tw('9. ',sz,false);
    (n.kids||[]).filter(k=>k.tag==='li').forEach(li=>{const inl=[],sub=[];(li.kids||[]).forEach(k=>{if(k.tag==='ul'||k.tag==='ol'||k.tag==='table')sub.push(k);else if(k.tag==='p'||k.tag==='div'){if(inl.length)inl.push({tag:'br'});inl.push(...(k.kids||[]));}else inl.push(k);});
      const rs=tidy(runs(inl,o.f||{}));const t={text:rs.length?rs:' '};if(o.jc==='justify')t.alignment='justify';const L=Math.max(1,estL(rs,sz,w));const ih=L*lineH(sz,lh);if(!items.length)k0=Math.min(ih,2*lineH(sz,lh));h+=ih;
      if(sub.length){const stk=[t];sub.forEach(s=>{const x=s.tag==='table'?table(s,Object.assign({},o,{w})):list(s,lvl+1,Object.assign({},o,{w}));if(x){stk.push(x);h+=hOf(x);}});items.push({stack:stk});}else items.push(t);});
    if(!items.length)return null;const af=lvl||o.cell?0:T.bul.after;const node=isOl?{ol:items}:{ul:items,type:lvl===1?'circle':'square',markerColor:lvl?TXT:BUL};node.margin=[indL,0,0,af];return est(node,h+af,k0);}
  /* tableau : grille (fusions), largeurs comme le Word (racine de la longueur du texte), en-tête orange répété, bandes, filets du gabarit ;
     tableau de signature (« Pour … » / « Pour … ») : traits noirs, sans fond, ligne des visas haute */
  function table(n,o){const rows=[];const walkR=k=>{(k.kids||[]).forEach(c=>{if(c.tag==='tr')rows.push(c);else if(c.tag==='thead'||c.tag==='tbody')walkR(c);});};walkR(n);if(!rows.length)return null;
    const cellsOf=r=>(r.kids||[]).filter(c=>c.tag==='td'||c.tag==='th');const isHead=r=>{const c=cellsOf(r);return c.length>0&&c.every(x=>x.tag==='th');};
    const grid=[];let ncol=0;rows.forEach((r,ri)=>{grid[ri]=grid[ri]||[];let ci=0;cellsOf(r).forEach(c=>{while(grid[ri][ci])ci++;for(let dr=0;dr<c.rs&&ri+dr<rows.length;dr++)for(let dc=0;dc<c.cs;dc++){grid[ri+dr]=grid[ri+dr]||[];grid[ri+dr][ci+dc]=dr===0&&dc===0?{c}:{span:true,c};}ci+=c.cs;});ncol=Math.max(ncol,grid[ri].length);});
    if(!ncol)return null;const valid=cellsOf(rows[0]).filter(c=>/^\s*pour\s/i.test(textOf(c))).length>=2;const longT=rows.some(r=>cellsOf(r).some(c=>textOf(c).length>=60));
    const PX=5.4,PY=1.4,bw=valid?0.75:T.tab.bw,bc=valid?'#000000':hexc(T.tab.bc),hb=hexc(T.tab.hb),sz=T.tab.size;const avail=(o.w||W)-ncol*2*PX-(ncol+1)*bw;
    const lens=new Array(ncol).fill(4);rows.forEach((r,ri)=>grid[ri].forEach((g,ci)=>{if(g&&g.c&&!g.span&&g.c.cs===1)lens[ci]=Math.max(lens[ci],Math.min(60,textOf(g.c).length));}));const sum=lens.reduce((s,x)=>s+Math.sqrt(x),0);
    let ws=lens.map(x=>Math.max(avail*0.08,avail*Math.sqrt(x)/sum));const k=avail/ws.reduce((s,x)=>s+x,0);ws=ws.map(x=>x*k);
    let band=0,nHead=0;const rowH=[];const body=rows.map((r,ri)=>{const head=isHead(r)&&(ri===0||isHead(rows[ri-1]));if(head&&ri===nHead)nHead++;if(!head)band++;
      const fill=valid?null:head?hexc(T.tab.hf):hexc(band%2?T.tab.odd:T.tab.even);const row=[];let mh=0;
      for(let ci=0;ci<ncol;ci++){const g=grid[ri][ci];if(!g){const e={text:''};if(fill)e.fillColor=fill;row.push(e);continue;}if(g.span){row.push({});continue;}
        const c=g.c;const cw=ws.slice(ci,ci+c.cs).reduce((s,v)=>s+v,0)+(c.cs-1)*(2*PX+bw);const hc=c.tag==='th'&&head;const jc=valid||hc?'center':(longT&&!head?'left':(T.tab.align==='justify'?'justify':T.tab.align));
        const f=hc?{b:T.tab.hbold?1:0,col:hexc(T.tab.hc)}:{b:valid&&ci===0&&!head?1:0};const inner=blocks(c.kids||[],{w:cw,cell:true,f,jc,sz,lh:1.02,after:0,ind:0});
        const cell=inner.length===1&&inner[0].text!==undefined?inner[0]:{stack:inner.length?inner:[{text:''}]};cell.alignment=jc;if(fill)cell.fillColor=fill;if(hc&&!valid)cell.borderColor=[hb,hb,hb,hb];if(c.cs>1)cell.colSpan=c.cs;if(c.rs>1)cell.rowSpan=c.rs;
        if(c.rs===1)mh=Math.max(mh,inner.reduce((s,x)=>s+hOf(x),0)||lineH(sz,1.02));row.push(cell);}
      rowH.push(Math.max(mh,lineH(sz,1.02))+2*PY+bw);return row;});
    const tot=rowH.reduce((s,x)=>s+x,0)+bw;const maxRow=Math.max(...rowH);const hr=nHead&&nHead<rows.length?nHead:0;
    const tn={table:{widths:ws,body,dontBreakRows:maxRow<HC*0.7},layout:{hLineWidth:()=>bw,vLineWidth:()=>bw,hLineColor:()=>bc,vLineColor:()=>bc,paddingLeft:()=>PX,paddingRight:()=>PX,paddingTop:()=>PY,paddingBottom:()=>PY},fontSize:sz,lineHeight:1.02,margin:[0,2,0,o.cell?2:8]};
    if(hr){tn.table.headerRows=hr;if(rowH.slice(0,hr+1).reduce((s,x)=>s+x,0)<HC*0.45)tn.table.keepWithHeaderRows=1;}
    if(valid)tn.table.heights=ri=>ri===0?0:(ri===rows.length-1?80:28.5);
    const keep=valid?Math.min(tot,HC*0.6):rowH.slice(0,(hr||0)+1).reduce((s,x)=>s+x,0)*1.12+6;return est(tn,tot+(valid?(rows.length-1)*20+50:0)+10,keep);}
  /* blocs d'un paragraphe de la bibliothèque — o : {w, jc, cell, f, sz, lh, after, ind} */
  function blocks(nodes,o){const out=[];let inl=[];const flush=()=>{if(inl.some(n=>n.tag!=='#t'||n.t.trim())){const rs=tidy(runs(inl,o.f||{}));if(rs.length)out.push(para(rs,o));}inl=[];};
    const push=x=>{if(!x)return;const p=out[out.length-1];if(p&&(p.ul||p.ol)&&(x.ul||x.ol)&&p.margin)p.margin[3]=0; /* listes qui se suivent : d'un seul tenant (Word : espacement contextuel) */out.push(x);};
    (nodes||[]).forEach(n=>{if(n.tag==='#t'||n.tag==='br'||!BLOCK.has(n.tag)){inl.push(n);return;}flush();
      if(n.tag==='p'||n.tag==='div'||n.tag==='figure'||n.tag==='thead'||n.tag==='tbody'||n.tag==='tr'||n.tag==='td'||n.tag==='th'){if((n.kids||[]).some(k=>BLOCK.has(k.tag)))blocks(n.kids,o).forEach(push);else{const rs=tidy(runs(n.kids,o.f||{}));if(rs.length)push(para(rs,o));}}
      else if(n.tag==='h4'){if(o.cell||o.side)push(para(tidy(runs(n.kids,Object.assign({},o.f,{b:1}))),o));else push(heading(textOf(n).replace(/\s+/g,' ').trim(),T.h4,{lvl:4}));}
      else if(n.tag==='ul'||n.tag==='ol')push(list(n,0,o));
      else if(n.tag==='table')push(table(n,o));
      else if(n.tag==='li')push(list({tag:'ul',kids:[n]},0,o));});
    flush();return out;}
  /* légende (italique grise, centrée) */
  function caption(html){const rs=tidy(runs(parseDoc(html),{}));if(!rs.length)return null;ital=true;const n={text:rs,italics:true,color:'#595959',fontSize:9,lineHeight:1,alignment:'center',margin:[0,1,0,10]};return est(n,estL(rs,9,W)*lineH(9,1)+11);}
  /* image (largeur %, hauteur plafonnée) + légende ; image + texte côte à côte (gauche / droite), centrés verticalement comme dans le Word */
  function figure(it){const I=IM.map[it.imgId];const cap=it.legende?caption(it.legende):null;const out=[];
    if(!I){ital=true;out.push(est({text:'[Image « '+(it.imgId||'?')+(IM.bad&&IM.bad.has(it.imgId)?' » illisible : à remplacer dans la bibliothèque]':' » indisponible : reconnecte-toi puis réexporte]'),italics:true,color:'#888888',fontSize:9,alignment:'center',margin:[0,2,0,cap?1:8]},14,14+(cap?hOf(cap):0)));if(cap)out.push(cap);return out;}
    if(it.cote){const wi=W*(it.largeur||40)/100,gap=MM(3);let iw=Math.max(10,wi-MM(3.5)),ih=iw*I.h/I.w;if(ih>MM(120)){iw=iw*MM(120)/ih;ih=MM(120);}
      const tb=blocks(parseDoc(it.html||''),{w:W-wi-gap,side:true});const l=tb[tb.length-1];let la=0;if(l&&l.margin){la=l.margin[3]||0;l.margin[3]=0;}const th=Math.max(0,tb.reduce((s,x)=>s+hOf(x),0)-la);
      const ic={width:wi,stack:[{image:I.key,width:iw,height:ih,alignment:'center'}]},tc={width:'*',stack:tb.length?tb:[{text:''}]};if(th<ih)tc.margin=[0,(ih-th)/2,0,0];else ic.margin=[0,(th-ih)/2,0,0];
      const H=Math.max(ih,th);out.push(est({columns:it.cote==='droite'?[tc,ic]:[ic,tc],columnGap:gap,margin:[0,3,0,cap?3:9]},H+12,Math.min(H,HC*0.6)+(cap?hOf(cap):0)));if(cap)out.push(cap);return out;}
    let w=W*(it.largeur||100)/100,h=w*I.h/I.w;if(h>MM(200)){w=w*MM(200)/h;h=MM(200);}const id=nid('i');const capH=cap?hOf(cap):0;
    out.push(est({image:I.key,width:w,height:h,alignment:'center',margin:[0,3,0,cap?2:8],id},h+(cap?5:11),h+5+capH));KEEP.set(id,{h:h+2,need:capH});if(cap)out.push(cap);return out;}
  /* organigramme « Moyens humains » : par pôle, cases rôle (orange, texte blanc, pictogramme) · personne · missions, séparées comme les cellules du Word */
  function equipe(E){const out=[];const bo=hexc(T.boxOr),bn=hexc(T.boxNom);const g=MM(1.3),lw=1.25,P=4.5,PY=3;const inner=W-2*g-3*2*P-6*lw;const w1=inner*0.31,w2=inner*0.31,w3=inner-w1-w2;
    const brd=on=>({border:[on,on,on,on],borderColor:[bo,bo,bo,bo]});const gapC=()=>({text:'',fontSize:1,lineHeight:1,border:[false,false,false,false]}); /* case vide d'écart : une « ligne » de 1 pt, pas une ligne de texte */
    (E.poles||[]).forEach(po=>{if(po.titre){out.push(heading(po.titre,{size:bs,bold:true,italic:true,color:TXT,before:8,after:1},{lvl:5}));const ln=est({canvas:[{type:'line',x1:0,y1:0.5,x2:W,y2:0.5,lineWidth:0.5,lineColor:'#BFBFBF'}],margin:[0,0,0,4]},5,5);GLUE.add(ln);out.push(ln);}
      const body=[];const hs=[];po.rows.forEach((r,ri)=>{const ic=r.ico&&IM.map[r.ico];const lab={text:r.label,bold:true,color:'#FFFFFF',fontSize:10,lineHeight:1.05};const hl=nLines(r.label,10,true,w1-(ic?MM(10):0))*lineH(10,1.05);
        let pers,hp;if(r.persons.length){if(r.nom){pers=[{text:r.persons.map(p=>p.name).join(' · '),fontSize:9}];hp=nLines(pers[0].text,9,false,w2)*lineH(9,1.1);}
          else{pers=[];hp=0;r.persons.forEach((p,i)=>{const rs=[{text:p.name,bold:true,color:bn,fontSize:9.5}];if(p.tel)rs.push({text:'\n'+p.tel,fontSize:9});if(p.email)rs.push({text:'\n'+p.email,fontSize:9,decoration:'underline'});pers.push({text:rs,margin:[0,i?3:0,0,0]});hp+=(1+(p.tel?1:0)+(p.email?nLines(p.email,9,false,w2):0))*lineH(9.5,1.1)+(i?3:0);});}}
        else if(r.missing){ital=true;pers=[{text:'[À COMPLÉTER : '+(r.label||'')+']',italics:true,color:RED,fontSize:9}];hp=nLines(pers[0].text,9,false,w2)*lineH(9,1.1);}else{pers=[{text:''}];hp=0;}
        const mis=r.missions.length?[{ul:r.missions.map(m=>({text:m})),type:'square',markerColor:hexc(T.bul.color),fontSize:9}]:[{text:''}];const hm=r.missions.reduce((s,m)=>s+nLines(m,9,false,w3-12)*lineH(9,1.1),0);
        const H=Math.max(hl,hp,hm,MM(8.5)*(ic?1:0),lineH(10,1.05));const c1=Object.assign({fillColor:bo,stack:[ic?{columns:[{width:'*',stack:[lab],margin:[0,(H-hl)/2,0,0]},{width:MM(8.5),image:ic.key,fit:[MM(8.5),MM(8.5)],margin:[0,(H-MM(8.5))/2,0,0]}],columnGap:3}:lab],margin:[0,ic?0:(H-hl)/2,0,0]},brd(true)); /* libellé centré en hauteur (le Word : vAlign center) */
        const c2=Object.assign({stack:pers,lineHeight:1.1,margin:[0,(H-hp)/2,0,0]},brd(!!r.persons.length||!!r.missing));const c3=Object.assign({stack:mis,lineHeight:1.1,margin:[0,(H-hm)/2,0,0]},brd(!!r.missions.length));
        if(ri)body.push([gapC(),gapC(),gapC(),gapC(),gapC()]);body.push([c1,gapC(),c2,gapC(),c3]);hs.push(H+2*PY+2*lw);});
      if(!body.length)return;const tn={table:{widths:[w1,g,w2,g,w3],body,dontBreakRows:true,heights:ri=>ri%2?Math.max(0,g-2*lw):0},layout:{defaultBorder:false,hLineWidth:()=>lw,vLineWidth:()=>lw,hLineColor:()=>bo,vLineColor:()=>bo,paddingLeft:i=>i%2?0:P,paddingRight:i=>i%2?0:P,paddingTop:ri=>ri%2?0:PY,paddingBottom:ri=>ri%2?0:PY},fontSize:9,margin:[0,0,0,6]};
      out.push(est(tn,hs.reduce((s,x)=>s+x+g,0)+6,hs[0]+4));});return out;}
  /* ── page de garde (fond de la page 1, pleine page) : photo à gauche, colonne de texte à droite ; sans photo : bandeau orange en haut ── */
  function cover(){const ph=IM.map[T.img.couverture],lg=IM.map[T.img.logo];const bd=(T.img.badges||[]).map(id=>IM.map[id]).filter(Boolean);const C=hexc(T.cover);const it=[];let x0,cw,y0,yb;
    if(ph){it.push({image:ph.key,width:MM(122),height:PH,cover:{width:MM(122),height:PH,align:'center',valign:'center'},absolutePosition:{x:0,y:0}});x0=MM(128);cw=MM(76);y0=MM(40);yb=PH-MM(14);}
    else{it.push({canvas:[{type:'rect',x:0,y:0,w:PW,h:MM(14),color:OR}],absolutePosition:{x:0,y:0}});x0=MM(25);cw=PW-MM(50);y0=MM(55);yb=PH-MM(18);}
    const fit=(s,size)=>{const lw_=Math.max(1,...String(s).split(/\s+/).map(x=>tw(x,size,true)));return lw_>cw?Math.max(12,Math.floor(size*cw/lw_*0.97*2)/2):size;};
    const ville=up(V.ville||a.client||''),titre=T.coverTitle.map(up).join('\n');const tz=Math.min(fit(titre,T.cvSize.titre),T.cvSize.titre);
    const top=[{text:ville,fontSize:fit(ville,T.cvSize.ville),bold:true,lineHeight:1.05},{text:String(V.annee||''),fontSize:Math.round(T.cvSize.annee*0.75),bold:true,margin:[0,MM(1.5),0,0]},
      {text:a.num||'',fontSize:T.cvSize.num,margin:[0,MM(7),0,MM(3)]},{canvas:[{type:'rect',x:(cw-Math.min(MM(62),cw))/2,y:0,w:Math.min(MM(62),cw),h:MM(1.1),color:OR}],margin:[0,0,0,MM(13)]},
      {text:titre,fontSize:tz,bold:true,lineHeight:1.3},{text:a.nom||'',fontSize:13,bold:true,margin:[0,MM(10),0,MM(1)]},{text:V.client||'',fontSize:11.5}];
    it.push({columns:[{width:cw,stack:top,alignment:'center',color:C}],absolutePosition:{x:x0,y:y0}});
    let y=yb-lineH(T.cvSize.date,1);it.push({columns:[{width:cw,text:V.date||'',fontSize:T.cvSize.date,bold:true,alignment:'right',color:C}],absolutePosition:{x:x0,y}});
    if(bd.length){const bh=MM(16);y-=MM(6)+bh;const cols=bd.map(b=>({width:bh*b.w/b.h,image:b.key,height:bh}));const tot=cols.reduce((s,c)=>s+c.width,0)+MM(4)*(cols.length-1);
      it.push({columns:cols,columnGap:MM(4),absolutePosition:{x:x0+Math.max(0,(cw-tot)/2),y}});}
    if(lg){let lw_=Math.min(cw,MM(ph?62:75)),lh_=lw_*lg.h/lg.w;if(lh_>MM(42)){lw_=lw_*MM(42)/lh_;lh_=MM(42);}y-=(bd.length?MM(4):MM(6))+lh_;it.push({image:lg.key,width:lw_,height:lh_,absolutePosition:{x:x0+(cw-lw_)/2,y}});}
    return {stack:it};}
  /* ── en-tête (bandeau orange : affaire · MÉMOIRE TECHNIQUE) et pied (référence, petit logo, Page n / N), sauf sur la garde ── */
  const nomH=String(a.nom||'Mémoire technique').slice(0,90);const ref='Réf. '+(a.num||'')+(V.ville?' – '+V.ville:'');const lgF=IM.map[T.img.logoPetit];
  const header=p=>p<2?null:{margin:[ML,MM(9),MR,0],table:{widths:['*','auto'],body:[[{text:nomH,color:'#FFFFFF',fontSize:8.5,margin:[0,0.6,0,0]},{text:'MÉMOIRE TECHNIQUE',color:'#FFFFFF',fontSize:9,bold:true,alignment:'right'}]]},
    layout:{hLineWidth:()=>0,vLineWidth:()=>0,paddingLeft:()=>4,paddingRight:()=>4,paddingTop:()=>4,paddingBottom:()=>3.5,fillColor:()=>OR},lineHeight:1};
  const footer=(p,n)=>{NP=n;if(p<2)return null;return {margin:[ML,MM(6.5),MR,0],stack:[{canvas:[{type:'line',x1:0,y1:0,x2:W,y2:0,lineWidth:1,lineColor:OR}]},
    {columns:[{width:'*',text:ref,fontSize:8,color:'#555555',margin:[0,5,0,0]},lgF?{width:MM(16),image:lgF.key,fit:[MM(14),MM(6)],alignment:'center',margin:[0,3,0,0]}:{width:MM(16),text:''},{width:'*',text:'Page '+p+' / '+n,fontSize:9,bold:true,color:OR,alignment:'right',margin:[0,4.5,0,0]}],columnGap:6}],lineHeight:1};};
  /* ── sommaire : titre, trous restants, entrées niveau 1 (gras) et 2 (en retrait) avec points de conduite ; numéro de page = renvoi pdfmake (pageReference) ── */
  const tsz=Math.max(9.5,bs-1.5);const nItems=M.secs.reduce((s,S)=>s+S.blocs.reduce((t,B)=>t+B.items.length,0),0);const PNW=tw(nItems>150?'000':'00',tsz,true)+3; /* place des numéros (2 chiffres ; 3 pour un très gros mémoire) */
  function tocRow(lvl,label,id){const bold=lvl===1,x0=lvl===1?0:MM(7),avail=W-x0-PNW;const wt=tw(label,tsz,bold);let tW=wt+1.5,L=1;if(wt>avail-16){tW=avail-16;L=nLines(label,tsz,bold,tW);}
    const y=(L-1)*lineH(tsz,1.02)+tsz*0.952-0.8;const dl=Math.max(0,avail-tW-4); /* points de conduite sur la ligne de base de la dernière ligne (Word : tabulation à points) */
    return {columns:[{width:tW,text:label,linkToDestination:id},{width:'*',canvas:[{type:'line',x1:2,y1:y,x2:Math.max(2,dl),y2:y,lineWidth:MC.c?(bold?1.15:0.95):0,dash:{length:0.001,space:2.8},lineCap:'round',lineColor:TXT}]},{width:PNW,text:'0',pageReference:id,alignment:'right',noWrap:true}],
      columnGap:0,bold,fontSize:tsz,lineHeight:1.02,margin:[x0,lvl===1?5:0,0,0]};}
  const toc=[{text:'SOMMAIRE',fontSize:T.h1.size,bold:true,lineHeight:1,margin:[0,0,0,18],pageBreak:'before'}];
  if(M.holes){ital=true;toc.push({text:M.holes+' trou'+(M.holes>1?'s':'')+' encore à compléter (en rouge).',italics:true,color:RED,fontSize:9.5,margin:[0,0,0,12]});}
  M.secs.forEach(S=>{toc.push(tocRow(1,S.n1+'. '+S.name,'s'+S.n1));S.blocs.forEach(B=>toc.push(tocRow(2,S.n1+'.'+B.n2+' '+(B.b.titre||''),'s'+S.n1+'_'+B.n2)));});
  /* ── corps ── */
  const flow=[];M.secs.forEach((S,k)=>{const pb=k===0||(T.h1.pb&&!S.nob);flow.push(heading(S.n1+'. '+S.name,T.h1,{id:'s'+S.n1,lvl:1,pb,top:pb?0:undefined}));const jc=S.hse?'justify':null;
    S.blocs.forEach(B=>{flow.push(heading(S.n1+'.'+B.n2+' '+(B.b.titre||''),T.h2,{id:'s'+S.n1+'_'+B.n2,lvl:2}));
      B.items.forEach(it=>{if(it.titre)flow.push(heading(it.num+' '+it.titre,T.h3,{lvl:3}));
        if(it.kind==='equipe')equipe(it.eq||{poles:[]}).forEach(x=>flow.push(x));else if(it.kind==='image')figure(it).forEach(x=>flow.push(x));
        else{const bl=blocks(parseDoc(it.html),{w:W,jc});if(it.list&&!it.end&&bl.length){const l=bl[bl.length-1];if(l.margin&&(l.ul||l.ol))l.margin[3]=0;}bl.forEach(x=>flow.push(x));}});});});
  if(!M.secs.length){ital=true;flow.push({text:'(aucun paragraphe coché)',italics:true,pageBreak:'before'});}
  /* titres jamais seuls en bas de page : place qu'il faut sous le titre (début de ce qui suit, titres en chaîne compris) */
  const keepAt=i=>{const n=flow[i];if(!n)return 0;if(HEAD.has(n))return hOf(n)+keepAt(i+1); /* titre suivant : sa marge haute comprise */if(GLUE.has(n))return hOf(n)+keepAt(i+1);const e=EST.get(n);return e?e.keep:lineH(bs,blh)*2;};
  flow.forEach((n,i)=>{if(HEAD.has(n)&&n.id)KEEP.set(n.id,{h:HEAD.get(n),need:Math.min(keepAt(i+1)+4,HC*0.6)});}); /* + 4 pt : marge d'erreur de l'estimation */
  const dd={pageSize:'A4',pageMargins:[ML,MT,MR,MB],info:{title:'Mémoire technique — '+(a.num||'')+' '+(a.nom||''),creator:'Tracé',producer:'Tracé (pdfmake '+VER+')',subject:'Mémoire technique'},language:'fr-FR',displayTitle:true,compress:true,
    defaultStyle:{font:'Carlito',fontSize:bs,lineHeight:blh,color:TXT},background:p=>p===1?cover():null,header,footer,content:toc.concat(flow),
    pageBreakBefore:(node)=>{const K=node.id&&KEEP.get(node.id);if(!K)return false;const p=node.startPosition;if(!p||p.pageNumber<2)return false;const b=BOT-p.top-K.h<K.need-0.5;if(b)BRK++;return b;}}; /* vrai → pdfmake refait la mise en page avec un saut avant ce titre */
  return {dd,ital,pages:()=>NP,breaks:()=>BRK};}

/* ═════════ 6 · RENDU (synchrone dans pdfmake : getStream sans rappel → les erreurs remontent ici) ═════════ */
function render(lib,dd,fb,ivfs){return new Promise((res,rej)=>{try{const vfs=Object.assign({},ivfs||{});Object.keys(fb).forEach(k=>{vfs[FF[k]]=fb[k];});
  const fonts={Carlito:{normal:FF.normal,bold:FF.bold,italics:fb.italics?FF.italics:FF.normal,bolditalics:fb.bolditalics?FF.bolditalics:FF.bold}}; /* italique absente : droit (jamais d'échec pour ça) */
  const doc=lib.createPdf(dd,null,fonts,vfs).getStream();const ch=[];doc.on('readable',()=>{let c;while((c=doc.read(9007199254740991))!==null)ch.push(c);});
  doc.on('end',()=>{let n=0;ch.forEach(c=>{n+=c.length;});const u=new Uint8Array(n);let o=0;ch.forEach(c=>{u.set(c,o);o+=c.length;});res(u);});doc.on('error',rej);doc.end();}catch(e){rej(e instanceof Error?e:new Error(String(e)));}});}
/* M = docModel(a, base, 'doc', true, ctx) ; imgs = {id:{bytes, w, h, png}} (memoire2.js memLibPdf, même collecte que le Word) → Uint8Array */
export async function buildPdf(M,imgs){const t0=Date.now();pdfInfo.err='';const lib=await pdfLib();let fb=await pdfFonts(false);await measInit(fb);const IM=await prepImgs(imgs||{});
  let D=docDef(M,IM);if(D.ital){try{fb=await pdfFonts(true);}catch(e){console.warn('PDF : italique non chargée, texte droit à la place',e);}}
  await new Promise(r=>setTimeout(r,16)); /* laisse le message s'afficher : la mise en page bloque l'écran quelques secondes */
  let u8;try{u8=await render(lib,D.dd,fb,IM.vfs);}catch(e){if(!Object.keys(IM.vfs).length)throw e;console.warn('PDF : nouvel essai sans les images',e);IM.skipped+=Object.keys(IM.map).length;D=docDef(M,{map:{},vfs:{},bad:new Set(Object.keys(IM.map))});u8=await render(lib,D.dd,fb,{});}
  Object.assign(pdfInfo,{pages:D.pages(),breaks:D.breaks(),ms:Date.now()-t0,bytes:u8.length,italic:!!(fb.italics),imgs:Object.keys(IM.map).length,skipped:IM.skipped});try{if(window.TRACE)window.TRACE.m3pdf=()=>pdfInfo;}catch(e){} /* tests */return u8;}

/* ═════════ 7 · BOUTONS D'EXPORT (en-tête du mémoire) + CSS du lot ═════════ */
const CSS_M3=`.mem3-exp .m3-pdf{font-weight:700}.memoire-head .mem3-exp .btn{min-height:34px}@media(max-width:600px){.memoire-head .mem3-exp .btn{min-height:38px}.memoire-head .mem3-exp{width:100%}}`;
export function injectLotM3(){if(typeof document==='undefined'||document.getElementById('css-lot-m3'))return;const st=document.createElement('style');st.id='css-lot-m3';st.textContent=CSS_M3;document.head.appendChild(st);}
export function pdfExportBtns(){injectLotM3();return `<button class="btn sm primary m3-pdf" data-act="af" data-v="mpdf|" title="Télécharge le mémoire en PDF au gabarit SCR (page de garde, sommaire paginé, en-têtes et pieds de page, images)">⬇ PDF</button><button class="btn sm" data-act="af" data-v="mword|" title="Document Word (.docx) au gabarit SCR : page de garde, sommaire, en-têtes / pieds de page, images">⬇ Word</button><button class="btn sm" data-act="af" data-v="mprint|" title="Mise en page A4 dans une fenêtre d’impression (ancien export PDF : « Enregistrer au format PDF »)">🖨 Imprimer</button>`;}
