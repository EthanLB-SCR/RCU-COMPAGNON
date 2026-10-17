// dpgfxl.js — LE DPGF « COMME DANS EXCEL » (14/10 après-midi (lot C)). Ethan : « importer le DPGF mais qu'il reste exactement sous la même forme, qu'on puisse
// le modifier, ajouter des PU et quantités ou changer les quantités […] en double écran avec ses formules, tout ; puis l'autre grand tableau, vaste, de comment est
// ventilé le prix, visuellement […] quand tu retélécharges le DPGF pour le dossier, c'est la même version que le client, juste avec les prix et les quantités […]
// et pas le visuel […] je coche les cases pour que ça calcule ce prix, je le renseigne dans le DPGF et je pointe qu'ici j'ai mis tant de MO […] que ça fasse un
// lien visuel, et que ça décompte ce que j'ai pointé ».
// · le fichier du client est relu tel quel (xlsx.js readBook : styles, fusions, largeurs, volets, formules) ; nos changements = a.dpgf.xl :
//   ed {feuille: {A1: {v} | {f} (formule anglaise, comme le fichier)}} + ops [{op:'ins'|'del', sh, at, n, cells}] (lignes insérées / supprimées) — le fichier ne change pas ;
// · formules recalculées dans l'appli (xlcalc.js) ; une fonction non gérée garde sa valeur d'origine (« non recalculée ») ;
// · les lignes du bordereau (a.dpgf.lignes : n°, désignation, U, quantité, PU) sont RELUES dans la grille après chaque saisie : la grille fait foi ;
// · liens de pointage a.dpgf.liens = [{id, sh, a (cellule du PU), qa (cellule de la quantité), q, comps:[{k, q}], pu, amt, v, at, by, col}] : composantes de
//   notre chiffrage (soudures DN x d'une zone, manchons, purges, épreuve…, prix de VENTE) → PU = montant ÷ quantité ; recalculés quand le chiffrage change ;
// · ⬇ DPGF pour le dossier = le fichier d'origine, seules les cellules changées sont réécrites (formules gardées, valeurs en cache mises à jour, recalcul à
//   l'ouverture), sans aucun repère de l'appli ; ⬇ Détail unité = tous nos prix unitaires (achat, vente) par zone, poste et DN.
import {readBook,patchSheetXml,cellKey,rezip,inflate,dropCalcChain,makeStyledXlsx,xmlEsc,colName} from './xlsx.js';
import {parseFormula,evalFormula,Unsupported,fmtValue,fmtKind,parseInput,editText,shiftFormula,shiftRowsFormula,fxToFr,BUILTIN_FMT,addrOf,parseAddr,isErr} from './xlcalc.js';
import * as REP from './dpgfrep.js'; // 15/10 (lot R) : calculateur qui s'ouvre au clic, soudures en ml, « ⇶ Répartir au ml »
import * as CL from './dpgfclair.js'; // 16/10 (lot C2) : écran plus clair, « Mettre et ligne suivante », autocontrôle par type, même panier de cases, autre écran sans grand cadre
import * as SV from './dpgfsuivi.js'; // 16/10 après-midi (lot C3) : clés stables, liste des changements du chiffrage à traiter, écran plus léger (bouton flottant, groupes repliables, ventilation compacte)
import * as RC from './dpgfrecap.js'; // 16/10 nuit (lot DK) : « ⇶ Donner sa part » des postes répartis, imputer sur les lignes cochées, « 🔎 Récap » en lecture seule
import * as ZN from './dpgfzone.js'; // 17/10 (lot DZ) : installations communes ventilées par zone, « ⇶ sa part » d'un poste tout pointé, quantité d'une ligne insérée
let H=null;export function initDpgfXl(h){H=h;}
const esc=s=>String(s??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const nb=(x,d)=>{x=+x||0;return x.toLocaleString('fr-FR',{maximumFractionDigits:d===undefined?0:d,minimumFractionDigits:d===undefined?0:d});};
const eur=(x,d)=>nb(x,d)+' €';const r2=x=>Math.round((+x||0)*100)/100;
const say=t=>{try{H&&H.A&&H.A.toast&&H.A.toast(t);}catch(e){}};
export const LK_COLS=['#1f6fd0','#15803d','#9333ea','#c2410c','#0e7490','#be123c','#4d7c0f','#7c3aed','#b45309','#0f766e','#db2777','#475569'];
/* ═════════ 1 · ÉTAT DE L'ÉCRAN (par affaire) ═════════ */
const XS={sh:{},sel:{},zoom:{},lay:null,full:false,det:{},calc:{},undo:{},redo:{},scroll:{},edit:null,pop:null,ctx:null,num:null,focus:false,vopen:{},cfilter:'',czone:{},pick:{}};
export const dxState=()=>XS;
/* intégration 14/10 : version consultée (lot D, lecture seule) — ce qui se redessine après coup (montage de la grille, panneaux, autre écran) relit CETTE version, pas la version en cours */
const affOf=num=>XS.vva&&XS.vva.num===num&&typeof document!=='undefined'&&document.querySelector('.vv-band')?XS.vva:H.affGet(num); /* le bandeau « Tu consultes la vN » encore affiché = consultation en cours */
try{const l=localStorage.getItem('trace:dpgfxl:lay');if(l)XS.lay=l;}catch(e){}
/* ═════════ 2 · LE FICHIER DU CLIENT ═════════ */
const BOOK={};const kvKey=num=>'trace:dpgf:'+num;
async function fileOf(a){let f=null;try{f=await H.A.kv.get(kvKey(a.num));}catch(e){}if(f instanceof Blob)return f;const D=a.dpgf||{};
  if(D.url&&/^https:\/\//.test(D.url)){try{const r=await fetch(D.url);if(r.ok){const b=await r.blob();try{await H.A.kv.set(kvKey(a.num),b);}catch(e){}return b;}}catch(e){console.warn(e);}}return null;}
export const isXlDpgf=a=>{const D=(a&&a.dpgf)||{};return !!((D.lignes||[]).length&&(D.kept||D.url)&&D.cols&&D.hdrRow);};
export function bookOf(a){if(!isXlDpgf(a))return {st:'none'};const D=a.dpgf;let B=BOOK[a.num];if(B&&B.at===D.at)return B;
  B=BOOK[a.num]={st:'loading',at:D.at};B.p=(async()=>{const f=await fileOf(a);if(!f){B.st='nofile';return;}const book=await readBook(f);prepBook(book);B.book=book;B.name=f.name||D.fichier;B.st='ok';})()
    .catch(e=>{console.warn(e);B.st='err';B.err=e.message||String(e);}).finally(()=>{if(XS.num===a.num&&document.getElementById('dx-card')&&XS.ctx&&XS.ctx.render)XS.ctx.render();});return B;}
export async function bookReady(a){const B=bookOf(a);if(B.p)await B.p;return BOOK[a.num];}
/* formules partagées : le texte des dépendantes = celui du maître décalé ; feuille : bornes */
function prepBook(book){book.sheets.forEach((S,i)=>{S.i=i;S.cells.forEach(cell=>{if(cell.ft==='shared'&&!cell.f&&cell.si!==null&&S.sf[cell.si]){const m=S.sf[cell.si];cell.f=shiftFormula(m.f,cell.r-m.r,cell.c-m.c);}});});
  const st=book.styles;book.fmt=i=>{const x=st.xfs[i];if(!x)return 'General';const id=x.nf;return st.numFmts[id]!==undefined?st.numFmts[id]:(BUILTIN_FMT[id]||'General');};}
/* ═════════ 3 · LE MODÈLE : fichier + opérations de structure + saisies ═════════ */
const up=s=>String(s||'').toUpperCase();
export function modelOf(a){const B=bookOf(a);if(B.st!=='ok')return null;const xl=(a.dpgf||{}).xl||{};const key=JSON.stringify(xl);if(B.mk===key&&B.M)return B.M;B.M=buildModel(B.book,xl);B.mk=key;return B.M;}
const own=S=>{if(!S._own){S.cells=new Map(S.cells);S.rows=new Map(S.rows);S.merges=S.merges.slice();S._own=true;}};
function buildModel(book,xl){const M={book,sheets:book.sheets.map(s=>Object.assign({},s,{_own:false,_vals:new Map(),_busy:new Set(),_uns:new Map()})),names:book.names.map(n=>Object.assign({},n)),ops:xl.ops||[],struct:new Set(),fxChanged:new Map()};
  M.by=new Map(M.sheets.map(s=>[up(s.name),s]));M.S=sh=>M.by.get(up(sh));
  for(const op of M.ops){try{applyOp(M,op);}catch(e){console.warn('op',op,e);}}
  const ed=xl.ed||{};Object.keys(ed).forEach(sn=>{const S=M.S(sn);if(!S)return;own(S);Object.keys(ed[sn]).forEach(ad=>{const p=parseAddr(ad);if(!p)return;const e=ed[sn][ad];const k=cellKey(p.r,p.c);const old=S.cells.get(k);const cell=Object.assign({},old||{r:p.r,c:p.c});cell.ed=e;cell.o=old||null;
      if(e.f!==undefined){cell.f=e.f;delete cell.ft;delete cell.si;delete cell.fref;cell.v=null;}else{cell.v=e.v===undefined?null:e.v;delete cell.f;delete cell.ft;delete cell.si;delete cell.fref;}
      if(e.s!==undefined)cell.s=e.s;S.cells.set(k,cell);if(p.r>S.maxR)S.maxR=p.r;if(p.c>S.maxC)S.maxC=p.c;});});
  M.ctx={val:(sh,r,c)=>{const S=M.S(sh);return S?val(M,S,r,c):{e:'#REF!'};},hasSheet:sh=>M.by.has(up(sh)),bounds:sh=>{const S=M.S(sh);return S?{maxR:Math.max(1,S.maxR),maxC:Math.max(1,S.maxC)}:{maxR:1,maxC:1};},
    name:(n,cur)=>{const S=M.S(cur);const u=up(n);const g=M.names.find(x=>up(x.name)===u&&x.local!==null&&S&&x.local===S.i)||M.names.find(x=>up(x.name)===u&&x.local===null);if(!g)return null;try{return parseFormula(g.ref);}catch(e){return null;}},
    isSub:(sh,r,c)=>{const S=M.S(sh);const cell=S&&S.cells.get(cellKey(r,c));return !!(cell&&cell.f&&/SUBTOTAL\s*\(/i.test(cell.f));},
    rowHidden:(sh,r)=>{const S=M.S(sh);const P=S&&S.rows.get(r);return !!(P&&P.hidden);}};
  return M;}
/* valeur d'une cellule (formules recalculées, mémorisées ; une fonction non gérée → valeur en cache du fichier) */
export function val(M,S,r,c){const k=cellKey(r,c);const V=S._vals;if(V.has(k))return V.get(k);const cell=S.cells.get(k);if(!cell||!cell.f){const v=cell?cell.v:null;return v===undefined?null:v;}
  if(S._busy.has(k)){M.circ=(M.circ||0)+1;return 0;}S._busy.add(k);let v;
  try{v=evalFormula(parseFormula(cell.f),M.ctx,{sh:S.name,r,c});}catch(e){if(e instanceof Unsupported){S._uns.set(k,e.message||'?');v=cell.ed?null:cell.v;}else{S._uns.set(k,'formule illisible');v=cell.ed?{e:'#NAME?'}:cell.v;}}
  S._busy.delete(k);if(v===undefined)v=null;if(typeof v==='number'&&!isFinite(v))v={e:'#NUM!'};V.set(k,v);return v;}
/* tout calculer, ligne après ligne (les dépendances remontent : pas de pile profonde) */
export function warm(M){if(M._warm)return;M.sheets.forEach(S=>{const ks=[];S.cells.forEach((cell,k)=>{if(cell.f)ks.push(k);});ks.sort((x,y)=>x-y).forEach(k=>{const cell=S.cells.get(k);val(M,S,cell.r,cell.c);});});M._warm=true;}
const styleIdx=(S,r,c,cell)=>{if(cell&&cell.s!==undefined&&cell.s!==null)return cell.s;const P=S.rows.get(r);if(P&&P.s!==undefined)return P.s;const d=S.cols.find(x=>c>=x.min&&c<=x.max);return d&&d.s!==null&&d.s!==undefined?d.s:0;};
const fmtOf=(M,S,r,c,cell)=>M.book.fmt(styleIdx(S,r,c,cell));
/* ═════════ 4 · STRUCTURE : insérer / supprimer des lignes ═════════ */
/* op = {op:'ins', sh, at (1re ligne insérée), n, from (ligne modèle, déjà décalée), cells:[{c,s,f}] (copie de la ligne modèle), P (hauteur / style de ligne), grow}
       {op:'del', sh, at, n} */
function applyOp(M,op){const T=M.S(op.sh);if(!T)return;own(T);M.struct.add(up(T.name));const n=op.op==='ins'?op.n:-op.n;const at=op.at;
  const shiftR=r=>op.op==='ins'?(r>=at?r+n:r):(r<at?r:(r>=at-n?r+n:null));
  /* cellules et propriétés de ligne */const cells=new Map();T.cells.forEach((cell,k)=>{const nr=shiftR(cell.r);if(nr===null)return;let c2=nr===cell.r?cell:Object.assign({},cell,{r:nr});if(c2.fref){const f2=shiftRowsFormula(c2.fref,T.name,T.name,at,n,{});if(f2!==c2.fref)c2=Object.assign({},c2,{fref:f2});}cells.set(cellKey(nr,cell.c),c2);});T.cells=cells;
  const rows=new Map();T.rows.forEach((P,r)=>{const nr=shiftR(r);if(nr!==null)rows.set(nr,P);});T.rows=rows;
  T.merges=T.merges.map(m=>{if(op.op==='ins'){const g=m.r1>=at?{r1:m.r1+n,r2:m.r2+n}:m.r2>=at?{r1:m.r1,r2:m.r2+n}:{r1:m.r1,r2:m.r2};return Object.assign({},m,g);}
    const e=at-n-1;if(m.r1>=at&&m.r2<=e)return null;const r1=m.r1<at?m.r1:m.r1>e?m.r1+n:at,r2=m.r2<at?m.r2:m.r2>e?m.r2+n:at-1;return r2<r1||(r1===r2&&m.c1===m.c2)?null:Object.assign({},m,{r1,r2});}).filter(Boolean);
  T.maxR=Math.max(1,T.maxR+n);
  /* formules de TOUTES les feuilles, noms définis */
  M.sheets.forEach(S=>{let ch=false;const upd=new Map();S.cells.forEach((cell,k)=>{if(!cell.f)return;const f2=shiftRowsFormula(cell.f,S.name,T.name,at,n,{grow:!!op.grow});if(f2!==cell.f){upd.set(k,Object.assign({},cell,{f:f2}));ch=true;}});
    if(ch){own(S);upd.forEach((c2,k)=>S.cells.set(k,c2));if(S!==T){upd.forEach((c2,k)=>M.fxChanged.set(up(S.name)+'!'+k,true));}}});
  M.names=M.names.map(nm=>{const f2=shiftRowsFormula(nm.ref,null,T.name,at,n,{grow:!!op.grow});return f2===nm.ref?nm:Object.assign({},nm,{ref:f2});});
  if(op.op==='ins'){const fromPost=op.from>=at?op.from+op.n:op.from;for(let i=0;i<op.n;i++)T.rows.set(at+i,Object.assign({},op.P||{},{ins:true,attrs:(op.P&&op.P.attrs)||''}));
    (op.cells||[]).forEach(x=>{const fT=x.f?shiftRowsFormula(x.f,T.name,T.name,at,op.n,{grow:!!op.grow}):null;for(let i=0;i<op.n;i++){const r=at+i;const cell={r,c:x.c,v:null,ins:true};if(x.s!==undefined&&x.s!==null)cell.s=x.s;if(fT)cell.f=shiftFormula(fT,r-fromPost,0);T.cells.set(cellKey(r,x.c),cell);}});}}
/* décaler tout ce qui vit en adresses dans a.dpgf (saisies, liens, lignes, ligne d'en-tête) au moment où l'on ajoute une opération */
function shiftDpgf(D,op,isDp){const T=up(op.sh);const n=op.op==='ins'?op.n:-op.n;const at=op.at;const shiftR=r=>op.op==='ins'?(r>=at?r+n:r):(r<at?r:(r>=at-n?r+n:null));
  const mv=a=>{const p=parseAddr(a);if(!p)return a;const nr=shiftR(p.r);return nr===null?null:addrOf(nr,p.c);};
  const xl=D.xl=Object.assign({ed:{},ops:[]},D.xl||{});const ed=Object.assign({},xl.ed||{});Object.keys(ed).forEach(sn=>{const isT=up(sn)===T;const m={};Object.keys(ed[sn]).forEach(ad=>{let e=ed[sn][ad];const na=isT?mv(ad):ad;if(na===null)return;if(e&&e.f!==undefined){const f2=shiftRowsFormula(e.f,sn,op.sh,at,n,{grow:!!op.grow});if(f2!==e.f)e=Object.assign({},e,{f:f2});}m[na]=e;});ed[sn]=m;});xl.ed=ed;
  D.liens=(D.liens||[]).map(L=>{if(up(L.sh)!==T)return L;const a2=mv(L.a);if(a2===null)return null;return Object.assign({},L,{a:a2,qa:L.qa?mv(L.qa):L.qa});}).filter(Boolean);
  if(D.reps)D.reps=REP.shiftReps(D.reps,T,mv); /* 15/10 (lot R) : les répartitions suivent leurs lignes */
  if(isDp&&D.hdrRow){const h=shiftR(D.hdrRow);if(h)D.hdrRow=h;}
  return shiftR;}
/* ═════════ 5 · LES LIGNES DU BORDEREAU, RELUES DANS LA GRILLE ═════════ */
export const dpSheet=(M,D)=>(D.sheetName&&M.S(D.sheetName))||M.sheets.find(s=>s.path===D.sheet)||M.sheets[0];
export const puColOf=D=>{const C=D.cols||{};return C.pu>=0?C.pu+1:Math.max(C.qte??-1,C.des??-1,C.u??-1)+2;};
const qtyColOf=D=>{const C=D.cols||{};return C.qte>=0?C.qte+1:0;};const totColOf=D=>{const C=D.cols||{};return C.tot>=0?C.tot+1:0;};
const numOf=v=>{if(typeof v==='number')return v;if(v===null||v===undefined||isErr(v)||typeof v==='boolean')return null;const s=String(v).replace(/[\s  ]/g,'').replace(',','.');const x=parseFloat(s);return isFinite(x)?x:null;};
const strOf=v=>v===null||v===undefined||isErr(v)?'':String(v);
export function deriveLines(M,D){const S=dpSheet(M,D);const C=D.cols||{};const hr=D.hdrRow||0;const L=[];const puC=puColOf(D);
  for(let r=hr+1;r<=S.maxR;r++){const g=c=>c>0?val(M,S,r,c):null;const des=strOf(g((C.des??-1)+1)).trim();if(!des)continue;const n=C.n>=0?strOf(g(C.n+1)).trim():'';const u=C.u>=0?strOf(g(C.u+1)).trim():'';const q=C.qte>=0?numOf(g(C.qte+1)):null;const pu=numOf(g(puC));
    if(/^total/i.test(des))continue;if(!u&&q===null){L.push({n,des,section:true,row:r});continue;}L.push({n,des,u,qte:q||0,pu:pu||0,row:r});}
  return L;}
/* les anciennes cartes (atelier : D.map indexé par n° de ligne) suivent les lignes */
function remapMap(D,oldL,newL,rowMap){const same=oldL.length===newL.length&&oldL.every((l,i)=>(rowMap?rowMap(l.row):l.row)===newL[i].row);if(same)return D.map||{};
  const idx=new Map();newL.forEach((l,j)=>idx.set(l.row,j));const o2n={};oldL.forEach((l,i)=>{const nr=rowMap?rowMap(l.row):l.row;if(nr!==null&&idx.has(nr))o2n[i]=idx.get(nr);});
  const map={};Object.keys(D.map||{}).forEach(i=>{const j=o2n[i];if(j===undefined)return;const m=Object.assign({},D.map[i]);if(m.srcs)m.srcs=m.srcs.map(s=>{if(s.per===undefined||s.per===null||s.per==='')return s;const pj=o2n[+s.per];const o=Object.assign({},s);if(pj===undefined)delete o.per;else o.per=pj;return o;});map[j]=m;});return map;}
/* après une saisie : lignes relues, montants « auto » (colonne Montant sans formule dans le fichier) tenus à jour */
function syncFromGrid(a,D,rowMap){const B=BOOK[a.num];if(!B||B.st!=='ok')return;const M0=buildModel(B.book,D.xl||{});const S=dpSheet(M0,D);
  const tc=totColOf(D),pc=puColOf(D);let changed=false;
  if(tc){const L0=deriveLines(M0,D);const ed=Object.assign({},(D.xl.ed||{})[S.name]||{});L0.forEach(l=>{if(l.section)return;const ta=addrOf(l.row,tc);const tcell=S.cells.get(cellKey(l.row,tc));const base=tcell&&tcell.o!==undefined?tcell.o:tcell;
      if(base&&base.f&&!(tcell.ed&&tcell.ed.auto))return;/* une formule du client calcule déjà le montant */const cur=ed[ta];if(cur&&!cur.auto)return;/* saisi à la main : on n'y touche pas */
      const pv=val(M0,S,l.row,pc);const hasPu=pv!==null&&pv!==undefined&&pv!=='';const want=hasPu?r2((+l.pu||0)*(+l.qte||0)):null;
      if(want===null){if(cur){delete ed[ta];changed=true;}return;}if(!cur||cur.v!==want){ed[ta]={v:want,auto:1};changed=true;}});
    if(changed){D.xl=Object.assign({},D.xl,{ed:Object.assign({},D.xl.ed,{[S.name]:ed})});}}
  /* pas de colonne PU dans le fichier : la nôtre, après la quantité, avec son titre (comme l'ancien export) */
  if((D.cols||{}).pu<0&&D.hdrRow){const ha=addrOf(D.hdrRow,pc);const hv=val(M0,S,D.hdrRow,pc);const cur=((D.xl||{}).ed||{})[S.name]||{};const anyPu=deriveLines(M0,D).some(l=>!l.section&&+l.pu>0);
    if(anyPu&&isEmpty(hv)&&!cur[ha]){edSet(D,S.name,ha,{v:'PU HT (SCR)',auto:1});changed=true;}else if(!anyPu&&cur[ha]&&cur[ha].auto){edSet(D,S.name,ha,null);changed=true;}}
  const M=changed?buildModel(B.book,D.xl):M0;const oldL=D.lignes||[];const L=deriveLines(M,D);D.map=remapMap(D,oldL,L,rowMap);D.lignes=L;}
/* ═════════ 6 · SAISIES (et annuler / rétablir) ═════════ */
const snapOf=D=>JSON.stringify({xl:D.xl||null,lignes:D.lignes||[],map:D.map||{},liens:D.liens||[],hdrRow:D.hdrRow,reps:D.reps||null,suivi:D.suivi||null}); /* 16/10 (lot C3) : + le suivi des changements (un traitement s'annule d'un seul ↶) */
function pushUndo(a){const D=a.dpgf||{};const U=XS.undo[a.num]=XS.undo[a.num]||[];U.push(snapOf(D));if(U.length>40)U.shift();XS.redo[a.num]=[];}
function restore(a,snap){const o=JSON.parse(snap);const D=Object.assign({},a.dpgf||{},{xl:o.xl||undefined,lignes:o.lignes,map:o.map,liens:o.liens,hdrRow:o.hdrRow});if(!o.xl)delete D.xl;if(o.reps&&o.reps.length)D.reps=o.reps;else delete D.reps;if(o.suivi!==undefined){if(o.suivi)D.suivi=o.suivi;else delete D.suivi;}H.affSet(a.num,{dpgf:D});}
export function dxUndo(a,redo){const from=redo?XS.redo:XS.undo,to=redo?XS.undo:XS.redo;const L=from[a.num]||[];if(!L.length){say(redo?'Rien à rétablir':'Rien à annuler');return false;}const snap=L.pop();(to[a.num]=to[a.num]||[]).push(snapOf(a.dpgf||{}));restore(a,snap);return true;}
const sameV=(x,y)=>{if(x===undefined)x=null;if(y===undefined)y=null;if(typeof x==='number'&&typeof y==='number')return Math.abs(x-y)<=1e-9*Math.max(1,Math.abs(x));if(isErr(x)&&isErr(y))return x.e===y.e;return x===y;};
function edSet(D,sh,ad,e){const xl=D.xl=Object.assign({ed:{},ops:[]},D.xl||{});xl.ed=Object.assign({},xl.ed||{});const m=Object.assign({},xl.ed[sh]||{});if(e===null||e===undefined)delete m[ad];else m[ad]=e;xl.ed[sh]=m;if(!Object.keys(m).length)delete xl.ed[sh];xl.rev=(xl.rev||0)+1;}
/* une entrée de cellule (texte tapé) → saisie enregistrée ; renvoie false si illisible */
function inputToEd(M,S,r,c,text,D){const k=cellKey(r,c);const cell=S.cells.get(k);const base=cell?(cell.ed?cell.o:cell):null;let p;
  try{p=parseInput(text,fmtOf(M,S,r,c,cell));}catch(e){say('Formule illisible : '+(e.message||e));return undefined;}
  const C=(D&&D.cols)||{};if(D&&S===dpSheet(M,D)&&r>(D.hdrRow||0)&&[C.n,C.des,C.u].some(x=>x>=0&&x+1===c)&&p.f===undefined&&!isEmpty(p.v)&&typeof p.v!=='string')p={v:String(text).trim()};
  if(p.date&&fmtKind(fmtOf(M,S,r,c,cell))!=='date')p={v:String(text).trim()};
  if(p.f!==undefined){if(!p.f)return base&&!base.f&&(base.v===null||base.v===undefined)?null:{v:null};return base&&base.f===p.f?null:{f:p.f};}
  if(base&&!base.f&&sameV(base.v,p.v))return null;if(!base&&(p.v===null||p.v===''))return null;return {v:p.v};}
/* écrire plusieurs cellules (saisie, collage, calculateur) : vals = [{sh, r, c, text} | {sh, r, c, e}] */
export function dxWrite(a,vals,opt){opt=opt||{};const M=modelOf(a);if(!M)return false;const D=Object.assign({},a.dpgf||{});let n=0;pushUndo(a);
  for(const x of vals){const S=M.S(x.sh);if(!S)continue;const ad=addrOf(x.r,x.c);let e=x.e!==undefined?x.e:inputToEd(M,S,x.r,x.c,x.text,a.dpgf);if(e===undefined){XS.undo[a.num].pop();return false;}
    if(e&&e.f===undefined&&x.e!==undefined){const cell=S.cells.get(cellKey(x.r,x.c));const base=cell?(cell.ed?cell.o:cell):null;if((base&&!base.f&&sameV(base.v,e.v))||(!base&&isEmpty(e.v)))e=null;}edSet(D,S.name,ad,e);n++;}
  syncFromGrid(a,D);if(opt.liens)D.liens=opt.liens(D.liens||[]);if(opt.dp)opt.dp(D);SV.onWrite(a,D,opt); /* 16/10 (lot C3) : le suivi des changements du chiffrage suit chaque écriture */H.affSet(a.num,{dpgf:D});return n;}
/* rétablir la valeur d'origine d'une cellule */
export function dxRevert(a,sh,ad){const D=Object.assign({},a.dpgf||{});pushUndo(a);edSet(D,sh,ad,null);syncFromGrid(a,D);H.affSet(a.num,{dpgf:D});}
/* insérer n lignes sous la ligne r (copie des formats et des formules de la ligne r) / supprimer des lignes */
export function dxInsertRows(a,sh,r,n,above){const M=modelOf(a);if(!M)return false;const S=M.S(sh);if(!S)return false;pushUndo(a);const D=Object.assign({},a.dpgf||{});const at=above?r:r+1;const from=r;
  const cells=[];for(let c=1;c<=S.maxC;c++){const cell=S.cells.get(cellKey(from,c));if(!cell)continue;const o={c};if(cell.s!==undefined&&cell.s!==null)o.s=cell.s;if(cell.f&&!cell.ft)o.f=cell.f;else if(cell.f&&cell.ft==='shared')o.f=cell.f;cells.push(o);}
  const P=S.rows.get(from);const op={op:'ins',sh:S.name,at,n,from,cells,P:P?{ht:P.ht,ch:P.ch,s:P.s,attrs:P.attrs}:null,grow:!above};
  const shiftR=shiftDpgf(D,op,dpSheet(M,D)===S);D.xl=Object.assign({},D.xl,{ops:(D.xl.ops||[]).concat([op])});syncFromGrid(a,D,r0=>shiftR(r0));H.affSet(a.num,{dpgf:D});return true;}
export function dxDeleteRows(a,sh,r,n){const M=modelOf(a);if(!M)return false;const S=M.S(sh);if(!S)return false;const D=Object.assign({},a.dpgf||{});const isDp=dpSheet(M,D)===S;
  if(isDp&&D.hdrRow>=r&&D.hdrRow<r+n){say('La ligne d\'en-tête du bordereau (ligne '+D.hdrRow+') ne se supprime pas');return false;}pushUndo(a);const op={op:'del',sh:S.name,at:r,n};
  const shiftR=shiftDpgf(D,op,isDp);D.xl=Object.assign({},D.xl,{ops:(D.xl.ops||[]).concat([op])});syncFromGrid(a,D,r0=>shiftR(r0));H.affSet(a.num,{dpgf:D});return true;}
/* les anciens chemins (Répartir, Arrondir, Appliquer les PU, PU tapé dans le bordereau) écrivent aussi dans la grille : PU des lignes → cellules */
export function lignesToGrid(a,D,L){if(!D.cols||!D.hdrRow)return L;const B=bookOf(a);const pc=puColOf(D);const sh=D.sheetName||(B.book?(B.book.sheets.find(s=>s.path===D.sheet)||B.book.sheets[0]).name:null);if(!sh)return L;
  const D2=Object.assign({},D,{lignes:L});const M=B.st==='ok'?buildModel(B.book,D.xl||{}):null;const S=M&&M.S(sh);
  (L||[]).forEach(l=>{if(l.section||!l.row)return;const ad=addrOf(l.row,pc);const cur=((D2.xl||{}).ed||{})[sh]||{};const want=+l.pu||0;
    if(S){const cell=S.cells.get(cellKey(l.row,pc));const base=cell?(cell.ed?cell.o:cell):null;if(base&&!base.f&&sameV(base.v,want||null)){if(cur[ad])edSet(D2,sh,ad,null);return;}if(!base&&!want){if(cur[ad])edSet(D2,sh,ad,null);return;}}
    if(!want&&!cur[ad])return;if(cur[ad]&&cur[ad].f===undefined&&sameV(cur[ad].v,want||null))return;edSet(D2,sh,ad,want?{v:want}:{v:null});});
  if(B.st==='ok'){syncFromGrid(a,D2);}Object.assign(D,{xl:D2.xl,lignes:D2.lignes,map:D2.map});return D.lignes;}
/* ═════════ 7 · NOTRE PRIX EN COMPOSANTES (chiffrage v2, prix de VENTE) ═════════
   une composante = un morceau de poste d'une zone : soudures DN 100 (100 soud.), manchons DN 100, purges (3 paires), une SST, un panier…, ou un poste entier
   « au ml de la zone » (amené, épreuve, base vie…) ; installations = colonne à part. Somme des composantes = prix de vente. */
const typeLab=(t,des)=>t==='autre'?(des||'autre'):String(t||'').replace(/^(sst|racc)_/,'').replace(/_/g,' ');
function splitPoste(k,R,z,ml){const DT=R.detail||{};const dn=(DT.dn&&DT.dn.rows)||[];const whole=[{key:'',lab:'',u:ml?'ml':'%',qty:ml||100,w:1}];
  if((k==='soudure'||k==='manchons'||k==='autoctrl')&&dn.length){const wk=k==='soudure'?'soud':k==='manchons'?'manch':'auto';const tot=dn.reduce((s,r)=>s+(+r[wk]||0),0);
    return dn.map(r=>({key:'dn'+r.dn,lab:'DN '+r.dn,u:k==='soudure'?'soud.':'manch.',qty:k==='soudure'?(+r.J||0):(+r.K||0),w:tot>0?(+r[wk]||0):(k==='soudure'?(+r.J||0):(+r.K||0))})).filter(x=>x.w>0||x.qty>0);}
  const rowsOf=(list,lab,u)=>{const L=(list||[]).filter(x=>x&&(+x.q||0)>0);return L.length?L.map((x,i)=>({key:'r'+(x.idx!==undefined?x.idx:i),lab:lab(x),u,qty:+x.q||0,w:(+x.pu||0)*(+x.q||0)||1})):null;};
  let o=null;if(k==='vpi')o=rowsOf((DT.vpi||{}).rows,x=>'DN '+x.dn,'vanne');else if(k==='sst')o=rowsOf((DT.sst||{}).rows,x=>'DN '+x.dn+' · '+typeLab(x.type,x.des),'paire');else if(k==='racc')o=rowsOf((DT.racc||{}).rows,x=>'DN '+x.dn+' · '+typeLab(x.type),'u');
  else if(k==='extrusion')o=rowsOf((DT.extrusion||{}).rows,x=>'Ø '+x.dn+' · '+x.type,'u');else if(k==='paniers'){const L=((DT.paniers||{}).rows||[]);if(L.length)o=L.map((x,i)=>({key:'r'+i,lab:x.nom||'Panier',u:'u',qty:+x.q||1,w:+x.total||1}));}
  else if(k==='purges'&&z.purges&&+z.purges.paires>0)o=[{key:'',lab:'DN '+z.purges.dn,u:'paire',qty:+z.purges.paires,w:1}];else if(k==='vidanges'&&z.vidanges&&+z.vidanges.paires>0)o=[{key:'',lab:'DN '+z.vidanges.dn,u:'paire',qty:+z.vidanges.paires,w:1}];
  return o&&o.length?o:whole;}
const CPC={};const baseOf=()=>{try{return H.base?H.base():null;}catch(e){return null;}};
export function compsOf(a){const b=baseOf();const c0=CPC[a.num];const al=SV.alOf(a); /* 16/10 (lot C3) : les anciennes clés figées par le suivi */if(c0&&c0.ch===a.chiffrage&&c0.b===b&&c0.cl===a.client&&c0.v===a.chiffrageV&&c0.al===al)return c0.R;const C=H.calc(a);if(!C||!C.v2){CPC[a.num]={ch:a.chiffrage,b,cl:a.client,v:a.chiffrageV,al,R:null};return null;}
  const coef=C.coef>0?C.coef:1;const V=x=>x/coef;const out=[];const zones=C.etudes.map((e,i)=>({i,k:'z'+i,nom:e.z.nom||('Zone '+(i+1)),ml:e.r.ml||0}));
  const postes=C.postes.filter(p=>!p.tete);const grp={};C.postes.filter(p=>p.tete).forEach(p=>{grp[p.k]=p.label;});
  const add=(zi,zn,P,L,parts)=>{const W=parts.reduce((s,x)=>s+x.w,0)||1;parts.forEach(x=>{const f=x.w/W;const amtA=L.achat*f;out.push({k:(zi<0?'inst':'z'+zi)+'|'+P.k+(x.key?'|'+x.key:''),z:zi,zn,p:P.k,pl:P.label,g:grp[P.grp]||'',lab:x.lab,u:x.u,qty:x.qty,amtA,amtV:V(amtA),mo:(L.mo||0)*f,fo:(L.fo||0)*f,st:(L.st||0)*f,loc:(L.loc||0)*f});});};
  C.etudes.forEach((e,ei)=>{const R=e.r;const ml=R.ml||0;postes.forEach(P=>{const L=R.postes[P.k];if(!L||Math.abs(L.achat)<0.005)return;add(ei,zones[ei].nom,P,L,splitPoste(P.k,R,e.z||{},ml));});});
  if(C.inst)postes.forEach(P=>{const L=C.inst.postes[P.k];if(!L||Math.abs(L.achat)<0.005)return;const ml=C.ml||0;add(-1,'Installations',P,L,[{key:'',lab:'',u:ml?'ml':'%',qty:ml||100,w:1}]);});
  out.forEach(c=>{c.puV=c.qty?c.amtV/c.qty:0;c.puA=c.qty?c.amtA/c.qty:0;});
  const R={C,list:out,by:new Map(out.map(c=>[c.k,c])),zones,inst:!!C.inst,coef,postes,grp,v:a.chiffrageV||1};SV.stable(R,a); /* 16/10 (lot C3) : c.k = clé stable (zone par son id, lignes par leur contenu), c.ok = l'ancienne ; CP.by lit les deux */
  CPC[a.num]={ch:a.chiffrage,b,cl:a.client,v:a.chiffrageV,al,R};return ZN.virt(REP.withMl(R));} /* 17/10 (lot DZ) : les parts de zone des installations communes (CP.zv, clés virtuelles dans CP.by) */ /* 15/10 (lot R) : c.ml, c.dn des composantes par DN */
const compName=c=>c.pl+(c.lab?' · '+c.lab:'');
/* ═════════ 8 · LIENS DE POINTAGE (ligne du DPGF ↔ composantes) ═════════ */
const qOfCell=(M,sh,ad)=>{if(!M||!ad)return null;const S=M.S(sh);const p=parseAddr(ad);if(!S||!p)return null;return numOf(val(M,S,p.r,p.c));};
export function linkNow(L,CP,M){let amt=0,mo=0,fo=0,st=0,loc=0;const miss=[];(L.comps||[]).forEach(x=>{const c=CP&&CP.by.get(x.k);if(!c){miss.push(x.k);return;}const f=c.qty?(+x.q||0)/c.qty:0;amt+=(+x.q||0)*c.puV;mo+=c.mo*f;fo+=c.fo*f;st+=c.st*f;loc+=c.loc*f;});
  const qc=L.qfix?null:qOfCell(M,L.sh,L.qa);const q=qc!==null&&qc>0?qc:(+L.q||0);const pu=q?amt/q:0;const cell=qOfCell(M,L.sh,L.a);const stale=M?(cell===null?pu>0:Math.abs(cell-r2(pu))>=0.005):false;
  return {amt,q,pu,pur:r2(pu),cell,stale,miss,mo,fo,st,loc};}
/* pointé par composante (quantités) et par case zone × poste (montants), en laissant de côté un lien (celui qu'on recalcule) */
export function pointage(a,CP,M,skipId){const D=a.dpgf||{};const byComp=new Map(),byCell=new Map();
  (D.liens||[]).forEach(L=>{(L.comps||[]).forEach(x=>{if(L.id===skipId&&!x.rep)return; /* 15/10 (lot R) : les parts de répartition de la ligne recalculée restent pointées */const c=CP.by.get(x.k);if(!c)return;byComp.set(c.k,(byComp.get(c.k)||0)+(+x.q||0)); /* 16/10 (lot C3) : compté sous la clé stable (une ancienne clé y mène aussi) */const kk=(c.z<0?'inst':'z'+c.z)+'|'+c.p;if(!byCell.has(kk))byCell.set(kk,[]);byCell.get(kk).push({id:L.id,col:L.col,amt:(+x.q||0)*c.puV});});});
  try{const T=translateOf(a);Object.keys(T.usedAmt||{}).forEach(key=>{const m=key.split('|');let kk=null;if(m[0]==='p')kk='z'+m[1]+'|'+m[2];else if(m[0]==='b')kk='z'+m[1]+'|paniers';else if(m[0]==='i')kk='inst|'+m[1];const v=T.usedAmt[key];if(!kk||!(v>0.004))return;if(!byCell.has(kk))byCell.set(kk,[]);byCell.get(kk).push({id:'atelier',col:-1,amt:v});});}catch(e){}
  return {byComp,byCell};}
const TRC={};function translateOf(a){const b=baseOf();const t=TRC[a.num];if(t&&t.ch===a.chiffrage&&t.d===a.dpgf&&t.b===b)return t.T;const T=H.translate(a);TRC[a.num]={ch:a.chiffrage,d:a.dpgf,b,T};return T;}
const linkAt=(a,sh,ad)=>((a.dpgf||{}).liens||[]).find(L=>up(L.sh)===up(sh)&&L.a===ad)||null;
const linkOfRow=(a,sh,r)=>((a.dpgf||{}).liens||[]).find(L=>up(L.sh)===up(sh)&&parseAddr(L.a)&&parseAddr(L.a).r===r)||null;
const nextCol=D=>{const used=new Set((D.liens||[]).map(L=>L.col));for(let i=0;i<LK_COLS.length;i++)if(!used.has(i))return i;return (D.liens||[]).length%LK_COLS.length;};
/* prix liés devenus faux (chiffrage changé, quantité changée, PU retouché) → on les réécrit */
export function dxApplyLinks(a,ids){const M=modelOf(a);const CP=compsOf(a);if(!M||!CP)return 0;const D=a.dpgf||{};const vals=[];const now=new Date().toISOString();const upd={};
  (D.liens||[]).forEach(L=>{if(ids&&!ids.includes(L.id))return;const X=linkNow(L,CP,M);if(!X.stale)return;const p=parseAddr(L.a);if(!p)return;vals.push({sh:L.sh,r:p.r,c:p.c,e:{v:X.pur}});upd[L.id]={pu:X.pur,amt:r2(X.amt),v:CP.v,at:now,comps:SV.canonComps(L.comps,CP)};}); /* 16/10 (lot C3) : un lien réécrit passe aux clés stables */
  if(!vals.length)return 0;dxWrite(a,vals,{liens:LL=>LL.map(L=>upd[L.id]?Object.assign({},L,upd[L.id]):L)});return vals.length;}
/* ═════════ 9 · RENDU DE LA GRILLE « COMME DANS EXCEL » ═════════ */
const DX_CSS=`
.dx-card{container-type:inline-size}.dx-card.full{position:fixed;inset:0;z-index:60;margin:0;border-radius:0;overflow:auto;background:var(--surface,#fff);padding:10px}
.dx-head{display:flex;align-items:center;gap:6px 10px;flex-wrap:wrap;margin-bottom:6px}.dx-head h3{margin:0;flex:1 1 220px;min-width:0}.dx-head .hint{font-weight:400}.dx-head .btn,.dx-bar .btn{white-space:nowrap}.dx-head .eq-acts{flex:none}.dx-win .dx-head .btn.sm{min-height:32px;padding:3px 9px}
.dx-bar{display:flex;flex-wrap:wrap;gap:4px;align-items:center;margin:0 0 6px}.eq-app .dx-bar .btn.sm,.eq-app .dx-head .btn.sm{min-height:34px;padding:3px 9px}.dx-bar .sep{width:1px;align-self:stretch;background:var(--line,#ddd);margin:0 3px}
.dx-bar .dx-zv{min-width:46px;text-align:center;font-size:12px;color:#555}
.dx-fb{display:flex;align-items:stretch;border:1px solid #c6c6c6;border-radius:6px;background:#fff;overflow:hidden;margin:0 0 4px}
.eq-app .dx-fb input{min-height:32px}.dx-nm{width:78px;flex:none;border:0;border-right:1px solid #ddd;font:12px Consolas,Menlo,monospace;padding:0 6px;background:#fafafa}
.dx-fxl{flex:none;padding:0 8px;color:#777;font-style:italic;font-family:Georgia,serif;display:flex;align-items:center;border-right:1px solid #ddd;user-select:none}
.dx-fi{flex:1;min-width:0;border:0;font:13px Calibri,Carlito,"Segoe UI",Arial,sans-serif;padding:0 8px}.dx-fi:focus,.dx-nm:focus{outline:2px solid #1e7145;outline-offset:-2px}
.dx-fbx{flex:none;display:flex;align-items:center;padding:0 8px;font-size:11.5px;color:#7a5200;background:#fff7e6;border-left:1px solid #f0d9a8;max-width:45%;overflow:hidden;white-space:nowrap;text-overflow:ellipsis}
.dx-split{display:grid;grid-template-columns:minmax(0,1fr);gap:10px;align-items:start}
@container (min-width:1100px){.dx-split.side{grid-template-columns:minmax(0,1.2fr) minmax(380px,1fr)}.dx-split.side .dx-side{max-height:calc(var(--dxh,64vh) + 60px);overflow:auto}}
.dx-grid{position:relative;border:1px solid #bdbdbd;border-radius:6px;overflow:hidden;background:#fff;min-width:0}
.dx-vp{overflow:auto;height:var(--dxh,62vh);min-height:260px;position:relative;outline:none;background:#fff;overscroll-behavior:contain;-webkit-overflow-scrolling:touch}
.dx-card.full .dx-vp{height:calc(100vh - 210px)}
.dx-cnt{position:relative;width:max-content}
.dx-t{border-collapse:separate;border-spacing:0;table-layout:fixed;font-family:Calibri,Carlito,"Segoe UI",Arial,sans-serif;font-size:calc(var(--z)*14.67px);color:#000;background:#fff;line-height:1.18}
.dx-t td{border-right:1px solid #e3e3e3;border-bottom:1px solid #e3e3e3;padding:0 calc(var(--z)*3px);overflow:hidden;white-space:pre;vertical-align:bottom;background-clip:padding-box;text-overflow:clip;cursor:cell}
.dx-t.nogrid td{border-right-color:transparent;border-bottom-color:transparent}
.dx-t td>div{max-height:var(--h);overflow:hidden}
.dx-t td.dx-n{text-align:right}.dx-t td.dx-m{text-align:center}.dx-t td.dx-err{color:#c00000}
.dx-t td.dx-ovf{overflow:visible}.dx-t td .dx-ov{display:block;overflow:hidden;white-space:pre}
.dx-t th{background:#f2f2f2;color:#5c5c5c;font-weight:400;font-size:calc(min(var(--z),1.2)*11.5px + 1px);border-right:1px solid #d0d0d0;border-bottom:1px solid #d0d0d0;text-align:center;padding:0 2px;user-select:none;-webkit-user-select:none;overflow:hidden;white-space:nowrap;cursor:default}
.dx-t thead th,.dx-t thead td{position:sticky;z-index:3}.dx-t th.dx-rh{position:sticky;left:0;z-index:2}.dx-t thead th.dx-rh,.dx-t thead th.dx-corner{left:0;z-index:6}
.dx-t td.dx-fz{position:sticky;z-index:2}.dx-t thead td.dx-fz{z-index:5}
.dx-t th.on{background:#d2e6d9;color:#0f5132;font-weight:700}
.dx-t td.dx-on{outline:2px solid #1e7145;outline-offset:-2px}.dx-t td.dx-in{box-shadow:inset 0 0 0 999px rgba(30,113,69,.13)}
.dx-t td.dx-mod{background-image:linear-gradient(225deg,#1f6fd0 0,#1f6fd0 5px,transparent 5px)}.dx-t td.dx-mod.dx-auto{background-image:linear-gradient(225deg,#93b8e8 0,#93b8e8 5px,transparent 5px)}
.dx-t td.dx-nr{color:#6b6b6b;text-decoration:underline dotted #b45309}
.dx-t td.dx-lk{box-shadow:inset 4px 0 0 var(--lk),inset 0 0 0 999px color-mix(in srgb,var(--lk) 10%,transparent)}.dx-t td.dx-lk.dx-in{box-shadow:inset 4px 0 0 var(--lk),inset 0 0 0 999px rgba(30,113,69,.16)}
.dx-t td.dx-lks{box-shadow:inset 4px 0 0 #d97706,inset 0 0 0 999px rgba(217,119,6,.14)}
.dx-t td.dx-lkq{box-shadow:inset 0 -3px 0 var(--lk)}
.dx-t th .dx-dot{display:inline-block;min-width:14px;height:14px;line-height:14px;border-radius:7px;margin-right:2px;vertical-align:middle;color:#fff;font-size:9.5px;font-weight:700;padding:0 2px}
.dx-t tr.dx-insr th.dx-rh{box-shadow:inset 3px 0 0 #15803d}
.dx-t .dx-hl{outline:3px solid var(--lk,#1f6fd0)!important;outline-offset:-3px}
.dx-sp td{border:0!important;padding:0!important;background:transparent!important}
.dx-ed{position:absolute;z-index:20;margin:0;border:2px solid #1e7145;padding:0 3px;font:inherit;background:#fff;box-shadow:0 2px 8px rgba(0,0,0,.18);outline:none;min-height:0!important;border-radius:0}
.dx-tabs{display:flex;gap:2px;align-items:stretch;border-top:1px solid #bdbdbd;background:#f3f3f3;overflow-x:auto;min-height:34px}
.dx-tabs button{border:0;border-right:1px solid #d6d6d6;background:transparent;padding:0 14px;font-size:12.5px;color:#444;white-space:nowrap;min-height:34px!important}.dx-tabs button.on{background:#fff;color:#1e7145;font-weight:700;box-shadow:inset 0 3px 0 #1e7145}
.dx-tabs .dx-st{margin-left:auto;display:flex;align-items:center;gap:10px;padding:0 10px;font-size:12px;color:#555;white-space:nowrap}
.dx-ph{display:flex;flex-direction:column;align-items:center;justify-content:center;gap:8px;min-height:220px;text-align:center;padding:20px;color:#555}
.dx-side{display:flex;flex-direction:column;gap:10px;min-width:0}
.dx-panel{border:1px solid var(--line,#ddd);border-radius:10px;background:#fff;padding:10px;min-width:0}
.dx-panel h4{margin:0 0 6px;font-size:14px;display:flex;align-items:center;gap:6px;flex-wrap:wrap}
.dx-calc .dx-ln{font-size:12.5px;color:#444;margin-bottom:6px}
.dx-calc .dx-q{display:flex;gap:6px;align-items:center;flex-wrap:wrap;margin:4px 0 8px}.eq-app .dx-calc .dx-q input{width:110px;min-height:36px}.eq-app .dx-calc .dx-q input[type=checkbox]{width:18px;height:18px;min-height:0;margin:0}
.dx-cl{max-height:46vh;overflow:auto;border:1px solid #eee;border-radius:8px}
.dx-cz{border-bottom:1px solid #eee}.dx-cz>summary{cursor:pointer;padding:6px 8px;font-weight:700;font-size:12.5px;background:#fafafa;display:flex;gap:6px;align-items:center;min-height:34px;list-style:none}
.dx-cr{display:grid;grid-template-columns:30px minmax(0,1fr) auto;gap:2px 6px;align-items:center;padding:3px 8px;border-top:1px solid #f3f3f3;font-size:12.5px}.dx-cr.on{background:#eef6f1}
.eq-app .dx-cr input[type=checkbox]{width:20px;height:20px;min-height:0}.dx-cr .dx-cq{grid-column:2/4;display:flex;gap:6px;align-items:center;flex-wrap:wrap;color:#555;font-size:12px}
.eq-app .dx-cr .dx-cq input{width:92px;min-height:32px;padding:2px 6px}.dx-cr .m{font-weight:700;white-space:nowrap}.dx-cr small{color:#777}.dx-cr.full .dx-rst{color:#15803d}.dx-cr.over .dx-rst{color:#b91c1c;font-weight:700}
.dx-res{display:flex;flex-wrap:wrap;gap:6px 12px;align-items:center;margin-top:8px;padding:8px;border-radius:8px;background:#f6faf7;border:1px solid #cfe3d6}.dx-res b.pu{font-size:18px;color:#14532d}
.dx-lkh{display:inline-flex;align-items:center;gap:4px;border-radius:999px;padding:2px 9px;color:#fff;font-size:12px;font-weight:700}
.dx-stale{background:#fff7e6;border:1px solid #f3c27a;border-radius:8px;padding:6px 8px;margin:6px 0;font-size:12.5px;display:flex;gap:8px;align-items:center;flex-wrap:wrap}
.dx-vt{border-collapse:separate;border-spacing:0;font-size:12.5px;width:100%}.dx-vt th,.dx-vt td{padding:4px 6px;border-bottom:1px solid #eee;white-space:nowrap;text-align:right;vertical-align:top}
.dx-vt th:first-child,.dx-vt td:first-child{text-align:left;white-space:normal;min-width:150px;position:sticky;left:0;background:#fff;z-index:1}
.dx-vt thead th{position:sticky;top:0;background:#f5f5f2;z-index:2;font-size:11.5px;color:#444}.dx-vt thead th:first-child{z-index:3}
.dx-vt tr.g td{background:#f6f6f3;font-weight:700;color:#333;font-size:11.5px;text-transform:uppercase;letter-spacing:.02em}.dx-vt tr.g td:first-child{background:#f6f6f3}
.dx-vt tr.tot td{font-weight:700;border-top:2px solid #ccc;background:#fbfbf9}.dx-vt td.z{min-width:92px}.dx-vt td.z.click{cursor:pointer}.dx-vt td.z.click:hover{background:#f1f7ff}
.dx-vb{display:flex;height:6px;border-radius:3px;overflow:hidden;background:#ececec;margin-top:3px;min-width:60px}.dx-vb i{display:block;height:100%}.dx-vb i.at{background:repeating-linear-gradient(45deg,#9ca3af 0 3px,#d1d5db 3px 6px)}
.dx-vt td.over{background:#fdecec}.dx-vt td.over .dx-vb{outline:1px solid #dc2626}.dx-vt .sub{display:block;color:#888;font-size:10.5px}
.dx-vsum{display:flex;flex-wrap:wrap;gap:6px 14px;align-items:center;margin:0 0 8px;font-size:12.5px}.dx-vsum .dx-vb{height:10px;flex:1 1 200px}
.dx-leg{display:flex;flex-wrap:wrap;gap:4px 10px;font-size:11.5px;color:#555;margin-top:6px}.dx-leg span{display:inline-flex;align-items:center;gap:4px}.dx-leg i{width:10px;height:10px;border-radius:2px;display:inline-block}
.dx-lks-list{display:flex;flex-direction:column;gap:4px;margin-top:6px}.dx-lkr{display:flex;gap:6px;align-items:center;font-size:12.5px;border:1px solid #eee;border-radius:8px;padding:4px 6px;flex-wrap:wrap}.dx-lkr.hl{outline:2px solid var(--lk)}
.dx-mods{font-size:12px}.dx-mods table{width:100%}.dx-mods td{padding:2px 4px;border-bottom:1px solid #f0f0f0}
.dx-old{margin:0 0 10px}.dx-old>summary{cursor:pointer;font-weight:700;font-size:13px;padding:8px 10px;border:1px solid var(--line,#ddd);border-radius:10px;background:var(--surface,#fff);min-height:40px;display:flex;align-items:center;gap:6px}.dx-old[open]>summary{margin-bottom:8px}
@media (max-width:600px){.dx-vp{height:var(--dxh,55vh)}.dx-tabs .dx-st{display:none}.dx-cl{max-height:60vh}}
.dx-pud{margin:10px 0 0}.dx-pud>summary{cursor:pointer;font-weight:700;font-size:13px;padding:8px 10px;border:1px solid var(--line,#ddd);border-radius:10px;background:var(--surface,#fff);min-height:40px;display:flex;align-items:center;gap:6px;flex-wrap:wrap}.dx-pud[open]>summary{margin-bottom:8px}.dx-pud>summary .hint{font-weight:400}
.dx-pu .dx-pum{display:flex;flex-wrap:wrap;gap:4px;margin:0 0 6px}.dx-pu .dx-pum .btn.on{background:#1f3864;color:#fff;border-color:#1f3864}
.dx-pu .dx-puf{display:flex;flex-wrap:wrap;gap:4px 6px;align-items:center;margin:0 0 6px}.dx-pu .dx-puf input{flex:1 1 160px;min-width:0;max-width:280px}
.dx-pu .chip{border:1px solid var(--line,#ddd);border-radius:999px;padding:3px 10px;background:#fff;font-size:12px;cursor:pointer;white-space:nowrap}.dx-pu .chip.on{background:#e2efda;border-color:#7fb069;font-weight:700;color:#14532d}
.eq-app .dx-pu .chip{min-height:34px}
.dx-put{border-collapse:separate;border-spacing:0;font-size:12.5px;width:100%}.dx-put th,.dx-put td{padding:4px 6px;border-bottom:1px solid #eee;text-align:right;vertical-align:top;white-space:nowrap}
.dx-put th{position:sticky;top:0;background:#f5f5f2;z-index:2;font-size:11.5px;color:#444}.dx-put td.l,.dx-put th.l{text-align:left;white-space:normal}
.dx-put td.l{min-width:150px;max-width:340px}.dx-put tr.zg td{background:#e2efda;font-weight:700;text-align:left}.dx-put tr.st td{font-weight:700;background:#f6f6f3}.dx-put tr.tot td{font-weight:700;border-top:2px solid #ccc;background:#fbfbf9}
.dx-put .sub{display:block;color:#777;font-size:11px;white-space:normal}.dx-put .sub.nw{white-space:nowrap}.dx-put .pv{font-weight:700;color:#14532d}.dx-put .dim{color:#999}.dx-put td.sp{color:#555;font-size:12px}
.dx-put tr.nl td{color:#777}.dx-put td.sp[colspan]{text-align:center}.dx-put .cmp{display:block;font-size:11px;color:#555;white-space:normal;margin-top:2px}.dx-put .cmp i{font-style:normal;display:block}
.dx-puk{display:flex;flex-wrap:wrap;gap:4px 12px;font-size:12px;margin:0 0 6px;color:#444}.dx-puk b{color:#14532d}
`;
let CSS_DONE=null;function ensureCss(doc){doc=doc||document;if(doc.getElementById('css-lot-c'))return;const s=doc.createElement('style');s.id='css-lot-c';s.textContent=DX_CSS;doc.head.appendChild(s);}
function xfCss(book){if(book._css)return book._css;const st=book.styles;const out=[];const f0=st.fonts[0]||{};
  st.xfs.forEach((x,i)=>{const f=st.fonts[x.font]||f0;const fl=st.fills[x.fill]||{};const r=[];
    if(f.b)r.push('font-weight:700');if(f.i)r.push('font-style:italic');const deco=[f.u?'underline':'',f.s?'line-through':''].filter(Boolean).join(' ');if(deco)r.push('text-decoration:'+deco);
    if(f.color&&!/^#000000$/i.test(f.color))r.push('color:'+f.color);const sz=f.sz||11;if(Math.abs(sz-11)>0.01)r.push('font-size:calc(var(--z)*'+(sz*4/3).toFixed(2)+'px)');
    if(f.name&&!/^calibri$/i.test(f.name))r.push("font-family:'"+String(f.name).replace(/['\\]/g,'')+"',Calibri,Carlito,Arial,sans-serif");if(f.va==='superscript'||f.va==='subscript')r.push('font-size:smaller');
    if(fl.bg)r.push('background-color:'+fl.bg);const h=x.h;
    if(h==='center'||h==='centerContinuous'||h==='distributed')r.push('text-align:center');else if(h==='right')r.push('text-align:right');else if(h==='left'||h==='fill')r.push('text-align:left');else if(h==='justify')r.push('text-align:justify');
    if(x.v==='top')r.push('vertical-align:top');else if(x.v==='center'||x.v==='distributed'||x.v==='justify')r.push('vertical-align:middle');
    if(x.wrap)r.push('white-space:pre-wrap;word-break:break-word');if(x.ind)r.push('padding-left:calc(var(--z)*'+(x.ind*9+3)+'px)');
    if(r.length)out.push('.dx-t .dx-x'+i+'{'+r.join(';')+'}');});
  book._css=out.join('\n');return book._css;}
function ensureXfCss(doc,book){doc=doc||document;let el=doc.getElementById('dx-xf');if(!el){el=doc.createElement('style');el.id='dx-xf';doc.head.appendChild(el);}if(el._book!==book){el.textContent=xfCss(book);el._book=book;}}
/* largeurs (unités Excel → pixels), hauteurs (points → pixels), lignes / colonnes masquées, volets figés */
const pxW=w=>Math.trunc(((256*w+Math.trunc(128/7))/256)*7);
function mergesOf(S){if(S._mg)return S._mg;const top=new Map(),inn=new Map();S.merges.forEach(m=>{if(m.r2-m.r1>400){return;}top.set(cellKey(m.r1,m.c1),m);for(let r=m.r1;r<=m.r2;r++)for(let c=m.c1;c<=m.c2;c++)if(r!==m.r1||c!==m.c1)inn.set(cellKey(r,c),m);});S._mg={top,inn};return S._mg;}
let MCTX=null;const MW=new Map();
function textW(t,px,font,b){const k=px+'|'+font+'|'+(b?1:0)+'|'+t;if(MW.has(k))return MW.get(k);if(!MCTX){try{MCTX=document.createElement('canvas').getContext('2d');}catch(e){MCTX=null;}}let w=t.length*px*0.45;if(MCTX){MCTX.font=(b?'700 ':'')+px+'px '+font;w=MCTX.measureText(t).width;}if(MW.size>20000)MW.clear();MW.set(k,w);return w;}
function wrapLines(t,w,px,font,b){let n=0;String(t).split('\n').forEach(p=>{const words=p.split(/(\s+)/);let cur=0;n++;for(const x of words){const ww=textW(x,px,font,b);if(cur>0&&cur+ww>w&&x.trim()){n++;cur=textW(x.replace(/^\s+/,''),px,font,b);}else cur+=ww;}});return Math.max(1,n);}
function estH(M,S,r,dh,wOf){let h=dh;const MG=mergesOf(S);for(let c=1;c<=Math.min(S.maxC,60);c++){const cell=S.cells.get(cellKey(r,c));if(!cell)continue;const x=M.book.styles.xfs[styleIdx(S,r,c,cell)]||{};if(!x.wrap)continue;const v=val(M,S,r,c);if(typeof v!=='string'||!v)continue;const mg=MG.top.get(cellKey(r,c));if(mg&&mg.r2>mg.r1)continue;
    const f=M.book.styles.fonts[x.font]||{};const px=(f.sz||11)*4/3;let wc=wOf(c);if(mg)for(let c2=c+1;c2<=mg.c2;c2++)wc+=wOf(c2);const font=(f.name?"'"+f.name+"',":'')+'Calibri,Carlito,Arial,sans-serif';const lines=wrapLines(v,Math.max(20,wc-7),px,font,!!f.b);h=Math.max(h,lines*px*1.18+5);}return h;}
export function layOf(M,S,z){if(S._lay&&S._lay.z===z)return S._lay;const dW=S.fmt.defW?pxW(S.fmt.defW):Math.ceil(((S.fmt.baseW||8)*7+5)/8)*8;
  const wOf=c=>{const d=S.cols.find(x=>c>=x.min&&c<=x.max);if(d&&d.hidden)return 0;return d&&d.w!==null&&d.w!==undefined?pxW(d.w):dW;};
  const nC=Math.min(160,Math.max(S.maxC+2,(S.view.xs||0)+1,8));const VC=[];const cIdx=new Map();for(let c=1;c<=nC;c++){const w=Math.round(wOf(c)*z);if(w>0){cIdx.set(c,VC.length);VC.push({c,w});}}
  const dh=(S.fmt.defH||15)*4/3;const nR=Math.max(S.maxR+25,40);const VR=[];const rIdx=new Map();let y=0;
  for(let r=1;r<=nR;r++){const P=S.rows.get(r);if(P&&P.hidden)continue;let h=P&&P.ht!==undefined&&P.ht!==null?P.ht*4/3:estH(M,S,r,dh,wOf);h=Math.max(2,Math.round(h*z));rIdx.set(r,VR.length);VR.push({r,h,y});y+=h;}
  const ys=S.view.ys||0,xs=S.view.xs||0;let FH=0,nF=0;VR.forEach(x=>{if(x.r<=ys){FH+=x.h;nF++;}});const zz=Math.max(z,0.8);const hh=Math.round(20*zz);const rhW=Math.round((String(nR).length*7+18)*zz);
  let left=rhW;const fzL=new Map();VC.forEach(x=>{if(x.c<=xs){fzL.set(x.c,left);left+=x.w;}});
  S._lay={z,VC,VR,cIdx,rIdx,H:y,ys,xs,FH,nF,hh,rhW,W:rhW+VC.reduce((s,x)=>s+x.w,0),fzL,wOf,dh};return S._lay;}
const RK={hair:1,dotted:2,dashDotDot:3,dashDot:4,dashed:5,thin:6,mediumDashDotDot:7,slantDashDot:8,mediumDashDot:9,mediumDashed:10,medium:11,double:12,thick:13};
const bdOf=(M,S,r,c)=>{const x=M.book.styles.xfs[styleIdx(S,r,c,S.cells.get(cellKey(r,c)))];return x?(M.book.styles.borders[x.border]||{}):{};};
const strong=(a,b)=>!a?b:!b?a:(RK[b.st]||0)>(RK[a.st]||0)?b:a;
const cssB=e=>{const w={medium:2,mediumDashed:2,mediumDashDot:2,mediumDashDotDot:2,slantDashDot:2,thick:3,double:3}[e.st]||1;const ty=/dash/i.test(e.st)?'dashed':/dot|hair/i.test(e.st)?'dotted':e.st==='double'?'double':'solid';return w+'px '+ty+' '+(e.c||'#000');};
const fillOf=(M,S,r,c,cell)=>{const x=M.book.styles.xfs[styleIdx(S,r,c,cell)];return x?(M.book.styles.fills[x.fill]||{}).bg||null:null;};
const isEmpty=v=>v===null||v===undefined||v==='';
/* une cellule (td) ; o = {L, sel, links, ys, fzRow} */
function tdHTML(M,S,r,c,o){const L=o.L;const k=cellKey(r,c);const MG=mergesOf(S);const inn=MG.inn.get(k);if(inn&&!(inn.r1<=L.ys&&r>L.ys))return '';
  const mg=MG.top.get(k);const cell=S.cells.get(k);const si=styleIdx(S,r,c,cell);const xf=M.book.styles.xfs[si]||{};const v=val(M,S,r,c);const F=fmtValue(v,M.book.fmt(si));
  const cls=['dx-x'+si];const st=[];let attrs='';
  if(!xf.h){if(typeof v==='number')cls.push('dx-n');else if(typeof v==='boolean'||isErr(v))cls.push('dx-m');}
  if(isErr(v)||F.err)cls.push('dx-err');if(F.color)st.push('color:'+F.color);
  let c2=c,rr2=r,cs=1,rs=1;if(mg){c2=mg.c2;rr2=r<=L.ys?Math.min(mg.r2,L.ys):mg.r2;cs=0;for(let x=c;x<=c2;x++)if(L.cIdx.has(x))cs++;rs=0;for(let x=r;x<=rr2;x++)if(L.rIdx.has(x))rs++;cs=Math.max(1,cs);rs=Math.max(1,rs);if(cs>1)attrs+=` colspan="${cs}"`;if(rs>1)attrs+=` rowspan="${rs}"`;}
  /* bords : celui de droite et celui du bas (le plus marqué des deux voisins), à gauche / en haut seulement en bordure de feuille */
  const ci=L.cIdx.get(c2),nx=L.VC[ci+1];const ri=L.rIdx.get(rr2),ny=L.VR[ri+1];const me=bdOf(M,S,r,c),meR=c2===c?me:bdOf(M,S,r,c2),meB=rr2===r?me:bdOf(M,S,rr2,c);
  const eR=strong(meR.r,nx?bdOf(M,S,r,nx.c).l:null),eB=strong(meB.b,ny?bdOf(M,S,ny.r,c).t:null);const fill=fillOf(M,S,r,c,cell);
  if(eR)st.push('border-right:'+cssB(eR));else if(fill)st.push('border-right-color:'+fill);if(eB)st.push('border-bottom:'+cssB(eB));else if(fill)st.push('border-bottom-color:'+fill);
  if(me.l&&L.cIdx.get(c)===0)st.push('border-left:'+cssB(me.l));if(me.t&&L.rIdx.get(r)===0)st.push('border-top:'+cssB(me.t));
  /* volets figés */const fz=L.fzL.get(c);if(fz!==undefined){cls.push('dx-fz');st.push('left:'+fz+'px');if(!fill)st.push('background-color:#fff');}if(o.fzTop!==undefined){if(fz===undefined)st.push('top:'+o.fzTop+'px');else st.push('top:'+o.fzTop+'px');if(!fill&&fz===undefined)st.push('background-color:#fff');}
  /* sélection, liens, saisies, formules non recalculées */
  const s=o.sel;if(s&&s.r1<=r&&r<=s.r2&&s.c1<=c&&c<=s.c2){cls.push(r===s.r&&c===s.c?'dx-on':'dx-in');}
  const lk=o.lk.get(k);if(lk){const X=lk.X;cls.push(X&&X.stale?'dx-lks':'dx-lk');st.push('--lk:'+LK_COLS[lk.L.col%LK_COLS.length]);attrs+=` data-lk="${esc(lk.L.id)}"`;}const lq=o.lq.get(k);if(lq){cls.push('dx-lkq');st.push('--lk:'+LK_COLS[lq.col%LK_COLS.length]);}
  if(cell&&cell.ed){cls.push('dx-mod');if(cell.ed.auto)cls.push('dx-auto');}if(S._uns.has(k)){cls.push('dx-nr');attrs+=` title="${esc('Formule non recalculée par l\'appli ('+S._uns.get(k)+') : valeur du fichier')}"`;}
  /* texte : débordement sur les cellules vides de droite (comme Excel) */let txt=F.t;let inner='';
  if(txt!==''){if(!xf.wrap)txt=txt.replace(/\r?\n/g,' ');const isTxt=typeof v==='string'&&(!xf.h||xf.h==='left'||xf.h==='general');
    if(isTxt&&!mg&&!xf.wrap){const own=L.VC[L.cIdx.get(c)].w;const need=txt.length*7.2*L.z*((M.book.styles.fonts[xf.font]||{}).sz||11)/11+6;if(need>own){let W=own;let i=L.cIdx.get(c)+1;let n=0;while(W<need&&i<L.VC.length&&n<14){const c3=L.VC[i].c;if(MG.top.has(cellKey(r,c3))||MG.inn.has(cellKey(r,c3))||!isEmpty(val(M,S,r,c3)))break;W+=L.VC[i].w;i++;n++;}if(W>own){cls.push('dx-ovf');inner=`<span class="dx-ov" style="width:${W-Math.round(6*L.z)}px">${esc(txt)}</span>`;}}}
    if(!inner)inner=rs>1?`<div style="max-height:${L.VR.slice(L.rIdx.get(r),L.rIdx.get(r)+rs).reduce((x,y)=>x+y.h,0)}px">${esc(txt)}</div>`:`<div>${esc(txt)}</div>`;}
  return `<td data-r="${r}" data-c="${c}" class="${cls.join(' ')}"${st.length?` style="${st.join(';')}"`:''}${attrs}>${inner}</td>`;}
function rowHTML(M,S,x,o){const L=o.L;const lkr=o.rowLk.get(x.r);const sel=o.sel&&o.sel.r1<=x.r&&x.r<=o.sel.r2;const fzTop=x.r<=L.ys?o.fzTops.get(x.r):undefined;const P=S.rows.get(x.r);
  let h=`<tr data-r="${x.r}"${P&&P.ins?' class="dx-insr"':''} style="height:${x.h}px;--h:${x.h}px"><th class="dx-rh${sel?' on':''}" data-rh="${x.r}"${fzTop!==undefined?` style="top:${fzTop}px"`:''}>${lkr?`<b class="dx-dot" data-lk="${esc(lkr.id)}" style="background:${lkr.stale?'#d97706':LK_COLS[lkr.col%LK_COLS.length]}" title="Prix lié n° ${lkr.n} à notre chiffrage${lkr.stale?' — à mettre à jour':''}">${lkr.n}</b>`:''}${x.r}</th>`;
  const o2=Object.assign({},o,{fzTop});for(const y of L.VC)h+=tdHTML(M,S,x.r,y.c,o2);return h+'</tr>';}
/* fenêtre de lignes visibles (+ marge), étendue aux fusions qui la traversent */
function winOf(S,L,top,vh){const yT=Math.max(0,top-500),yB=top+vh+500;const body=L.VR.filter(x=>x.r>L.ys);if(!body.length)return {i0:0,i1:-1,body};let i0=0,i1=body.length-1;
  let lo=0,hi=body.length-1;while(lo<hi){const m=(lo+hi)>>1;if(body[m].y-L.FH+body[m].h<yT)lo=m+1;else hi=m;}i0=lo;lo=i0;hi=body.length-1;while(lo<hi){const m=(lo+hi+1)>>1;if(body[m].y-L.FH>yB)hi=m-1;else lo=m;}i1=lo;
  let r0=body[i0].r,r1=body[i1].r;S.merges.forEach(m=>{if(m.r2-m.r1>400||m.r1<=L.ys)return;if(m.r1<r0&&m.r2>=r0)r0=m.r1;if(m.r2>r1&&m.r1<=r1)r1=m.r2;});
  while(i0>0&&body[i0].r>r0)i0--;while(i1<body.length-1&&body[i1].r<r1)i1++;return {i0,i1,body};}
function selBox(sel){if(!sel)return null;return {r:sel.r,c:sel.c,r1:Math.min(sel.r,sel.r2??sel.r),r2:Math.max(sel.r,sel.r2??sel.r),c1:Math.min(sel.c,sel.c2??sel.c),c2:Math.max(sel.c,sel.c2??sel.c)};}
function renderOpts(a,M,S,L){const D=a.dpgf||{};const lk=new Map(),lq=new Map(),rowLk=new Map();const CP=compsOf(a);
  (D.liens||[]).forEach((Lk,i)=>{if(up(Lk.sh)!==up(S.name))return;const p=parseAddr(Lk.a);if(!p)return;const X=CP?linkNow(Lk,CP,M):null;lk.set(cellKey(p.r,p.c),{L:Lk,X,n:i+1});rowLk.set(p.r,Object.assign({n:i+1,stale:!!(X&&X.stale)},Lk));const q=parseAddr(Lk.qa||'');if(q)lq.set(cellKey(q.r,q.c),Lk);});
  const fzTops=new Map();let t=L.hh;L.VR.forEach(x=>{if(x.r<=L.ys){fzTops.set(x.r,t);t+=x.h;}});
  return {L,sel:selBox(XS.sel[a.num]&&up(XS.sel[a.num].sh)===up(S.name)?XS.sel[a.num]:null),lk,lq,rowLk,fzTops};}
function bodyHTML(M,S,o,win){const L=o.L;const ncol=L.VC.length+1;if(win.i1<win.i0)return '';const b=win.body;const top=b[win.i0].y-L.FH,last=b[win.i1];const bot=L.H-last.y-last.h;
  let h=top>0?`<tr class="dx-sp"><td colspan="${ncol}" style="height:${top}px"></td></tr>`:'';for(let i=win.i0;i<=win.i1;i++)h+=rowHTML(M,S,b[i],o);if(bot>0)h+=`<tr class="dx-sp"><td colspan="${ncol}" style="height:${bot}px"></td></tr>`;return h;}
export function tableHTML(a,M,S,z,scrollTop,vh){const L=layOf(M,S,z);const o=renderOpts(a,M,S,L);const win=winOf(S,L,scrollTop||0,vh||700);const sb=o.sel;
  const head=`<tr class="dx-hrow" style="height:${L.hh}px"><th class="dx-corner dx-rh" style="top:0"></th>${L.VC.map(x=>`<th class="dx-ch${sb&&x.c>=sb.c1&&x.c<=sb.c2?' on':''}" data-ch="${x.c}" style="top:0${L.fzL.has(x.c)?';left:'+L.fzL.get(x.c)+'px;z-index:6':''}">${colName(x.c)}</th>`).join('')}</tr>`;
  const fr=L.VR.filter(x=>x.r<=L.ys).map(x=>rowHTML(M,S,x,o)).join('');
  return {html:`<table class="dx-t${S.view.grid===false?' nogrid':''}" style="--z:${z};width:${L.W}px"><colgroup><col style="width:${L.rhW}px">${L.VC.map(x=>`<col style="width:${x.w}px">`).join('')}</colgroup><thead>${head}${fr}</thead><tbody>${bodyHTML(M,S,o,win)}</tbody></table>`,win,L};}
/* ═════════ 10 · LE CALCULATEUR (« je coche ce que le prix comprend ») ═════════ */
const fmtQ=x=>nb(x,Math.abs(x-Math.round(x))>1e-9?2:0);
function calcTarget(a,M){const s=XS.sel[a.num];if(!s||!M)return null;const D=a.dpgf||{};const S=M.S(s.sh);if(!S)return null;
  if(S===dpSheet(M,D)){const line=(D.lignes||[]).find(l=>!l.section&&l.row===s.r);if(line){const qc=qtyColOf(D);return {sh:S.name,r:s.r,a:addrOf(s.r,puColOf(D)),qa:qc?addrOf(s.r,qc):null,line,u:line.u||''};}}
  const lk=linkAt(a,S.name,addrOf(s.r,s.c));if(lk)return {sh:S.name,r:s.r,a:lk.a,qa:lk.qa||null,line:null,u:lk.u||''};
  if(XS.free&&XS.free.num===a.num&&up(XS.free.sh)===up(S.name)&&XS.free.a===addrOf(s.r,s.c))return {sh:S.name,r:s.r,a:XS.free.a,qa:null,line:null,u:''};return null;}
const tgtKey=t=>t?t.sh+'!'+t.a:'';
/* état du calculateur pour la cible : composantes cochées et quantités prises (repris du lien s'il existe) */
function calcState(a,t,M){let C=XS.calc[a.num];if(C&&C.key===tgtKey(t))return C;const lk=t?linkAt(a,t.sh,t.a):null;const qc=t&&t.qa?qOfCell(M,t.sh,t.qa):null;
  C=XS.calc[a.num]={key:tgtKey(t),chk:{},q:lk?String(qc!==null&&qc>0?qc:lk.q):(qc!==null?String(qc):''),wq:false,open:{}};const CP=lk?compsOf(a):null; /* 16/10 (lot C3) : cases sous la clé stable */
  if(lk)(lk.comps||[]).forEach(x0=>{if(x0.rep)return;if(ZN.load(CP,C,x0))return; /* 17/10 (lot DZ) : une prise d'installation avec zs → la case de sa zone */const x=Object.assign({},x0,{k:SV.ck(CP,x0.k)});if(x.sub){CL.subIn(C,x);return;} /* 16/10 (lot C2) : un type d'autocontrôle pris seul */C.chk[x.k]=C.chk[x.k]!==undefined?String(+C.chk[x.k]+(+x.q||0)):String(x.q);});return C;}
const parseQ=(txt,c)=>{const s=String(txt||'').trim().replace(/[\s  ]/g,'').replace(',','.');if(!s)return 0;if(/%$/.test(s)){const p=parseFloat(s);return isFinite(p)?c.qty*p/100:0;}const x=parseFloat(s);return isFinite(x)?x:0;};
function calcSum(a,CP,C){let amt=0;Object.keys(C.chk).forEach(k=>{const c=CP.by.get(k);if(!c)return;amt+=parseQ(C.chk[k],c)*c.puV;});return amt+REP.partsAmt(a,CP,C.key)+CL.subAmt(a,CP,C)+ZN.ppAmt(a,CP,C);} /* 17/10 (lot DZ) : + les parts « ⇶ sa part » cochées */
const dnOfTxt=t=>{const m=String(t||'').match(/\bDN\s?(\d{2,3})\b/i);return m?+m[1]:null;};
export function calcHTML(a,M,canEdit){const CP=compsOf(a);const t=calcTarget(a,M);
  {const h=CL.calcHTML(a,M,canEdit,CP,t);if(h!==null)return h;} /* 16/10 (lot C2) : en-tête collé en haut, liste à plat, tout pointé barré, autocontrôle par type, même panier de cases */
  if(!CP)return `<div class="dx-panel dx-calc" id="dx-calc"><h4>🧮 Calculer un prix</h4>${REP.calcHead(a,M,canEdit)}<div class="eq-s">Le calculateur s'appuie sur le chiffrage complet (zones, postes) : fais le chiffrage à l'étape 4, puis reviens ici.</div></div>`;
  if(!t)return `<div class="dx-panel dx-calc" id="dx-calc"><h4>🧮 Calculer un prix</h4>${REP.calcHead(a,M,canEdit)}<div class="eq-s">Touche une ligne du DPGF (ou sa cellule PU) : coche ce que le prix comprend (soudures, manchons, épreuve, installations…), la quantité de la ligne, et le PU se calcule → « ↦ Mettre dans le DPGF ». Pour une autre cellule : sélectionne-la puis « 🧮 Calculer cette cellule ».</div></div>`;
  const C=calcState(a,t,M);const lk=linkAt(a,t.sh,t.a);const P=pointage(a,CP,M,lk?lk.id:null);const q=parseQ(C.q,{qty:0});const amt=calcSum(a,CP,C);const pu=q>0?amt/q:0;const ro=!canEdit;
  const col=lk?LK_COLS[lk.col%LK_COLS.length]:null;const X=lk?linkNow(lk,CP,M):null;const ln=t.line;
  const dn=ln?dnOfTxt(ln.des):null;const sugg=dn?CP.list.filter(c=>c.lab==='DN '+dn&&['soudure','manchons','autoctrl'].includes(c.p)):[];
  const f=XS.cfilter.trim().toLowerCase();const groups=CP.zones.map(z=>({k:'z'+z.i,nom:z.nom,list:CP.list.filter(c=>c.z===z.i)})).concat(CP.inst?[{k:'inst',nom:'🏗 Installations',list:CP.list.filter(c=>c.z<0)}]:[]);
  const rowC=c=>{const on=C.chk[c.k]!==undefined;const used=P.byComp.get(c.k)||0;const rest=c.qty-used;const qq=on?parseQ(C.chk[c.k],c):0;const left=rest-qq;
    return `<div class="dx-cr${on?' on':''}${on&&left<-1e-6?' over':''}${on&&Math.abs(left)<1e-6?' full':''}" data-k="${esc(c.k)}"><input type="checkbox" data-dx="ck" data-k="${esc(c.k)}" ${on?'checked':''} ${ro?'disabled':''} aria-label="${esc(compName(c))}"><span>${esc(compName(c))}<small> · ${fmtQ(c.qty)} ${esc(c.u)}${REP.mlQ(c,c.qty)}${used>1e-9?' · déjà pointé '+fmtQ(used)+REP.restMl(c,rest):''} · ${nb(c.puV,2)} € / ${esc(c.u)}${REP.mlPu(c)}</small></span><span class="m">${eur(c.amtV)}</span>
      ${on?`<div class="dx-cq">prendre <input inputmode="decimal" data-dx="cq" data-k="${esc(c.k)}" value="${esc(C.chk[c.k])}" ${ro?'disabled':''}> ${esc(c.u)}${REP.mlTake(c,C,ro)} = <b data-amt="${esc(c.k)}">${eur(qq*c.puV,2)}</b> <span class="dx-rst">${left<-1e-6?'⚠ dépasse de '+fmtQ(-left):Math.abs(left)<1e-6?'✓ tout pointé':'reste '+fmtQ(left)+' '+esc(c.u)+REP.mlQ(c,left)}</span></div>`:''}</div>`;};
  const list=groups.map(g=>{const L=g.list.filter(c=>!f||compName(c).toLowerCase().includes(f)||g.nom.toLowerCase().includes(f));if(!L.length)return '';const nOn=L.filter(c=>C.chk[c.k]!==undefined).length;const open=f||nOn||XS.czone[g.k]!==false;
    return `<details class="dx-cz" data-dxz="${g.k}" ${open?'open':''}><summary>${esc(g.nom)} <small class="dim">· ${eur(L.reduce((s,c)=>s+c.amtV,0))}${nOn?' · '+nOn+' cochée'+(nOn>1?'s':''):''}</small></summary>${L.map(rowC).join('')}</details>`;}).join('')||'<div class="eq-s" style="padding:8px">Aucune composante ne correspond.</div>';
  return `<div class="dx-panel dx-calc" id="dx-calc"><h4>🧮 Calculer le prix · ligne ${t.r}${lk?` <span class="dx-lkh" style="background:${col}">🔗 lié</span>`:''}</h4>${REP.calcHead(a,M,canEdit)}
    <div class="dx-ln">${ln?`<b>${esc(ln.n||'')}</b> ${esc(ln.des)}`:'Cellule '+esc(t.a)} <span class="dim">· PU dans <b>${esc(t.a)}</b>${t.qa?' · quantité '+esc(t.qa):''}</span></div>${REP.calcParts(a,CP,lk)}
    ${X&&X.stale?`<div class="dx-stale">⚠ ${X.cell===null?'PU vide':'PU du DPGF '+nb(X.cell,2)+' €'} → le chiffrage donne <b>${nb(X.pur,2)} €</b>${lk.v&&lk.v!==CP.v?' (v'+lk.v+' → v'+CP.v+')':''}${ro?'':` <button class="btn sm" data-act="af" data-v="dxrelink|${esc(lk.id)}">↻ Appliquer</button>`}</div>`:''}
    ${X&&X.miss.length?`<div class="dx-stale">⚠ ${X.miss.length} composante${X.miss.length>1?'s':''} n'existe${X.miss.length>1?'nt':''} plus dans le chiffrage (comptée${X.miss.length>1?'s':''} 0 €) : recoche ce qu'il faut.</div>`:''}
    <div class="dx-q"><label class="f" style="margin:0">Quantité de la ligne</label><input inputmode="decimal" data-dx="q" value="${esc(C.q)}" ${ro?'disabled':''}> <span>${esc(t.u||'')}</span>${t.qa?`<label style="font-size:12px;display:inline-flex;gap:4px;align-items:center"><input type="checkbox" data-dx="wq" ${C.wq?'checked':''} ${ro?'disabled':''}> écrire aussi la quantité dans ${esc(t.qa)}</label>`:''}</div>
    ${sugg.length&&!ro?`<div class="hint" style="margin:0 0 6px">DN ${dn} dans la désignation → <button class="btn sm" data-act="af" data-v="dxsugg|${dn}">☑ soudures + manchons + autocontrôle DN ${dn}</button></div>`:''}
    <input class="f" data-dx="cf" placeholder="Filtrer les composantes (DN 100, épreuve, zone…)" value="${esc(XS.cfilter)}" style="margin:0 0 6px;min-height:36px">
    <div class="dx-cl" id="dx-cl">${list}</div>
    <div class="dx-res" id="dx-cres">${calcResHTML(a,t,C,amt,q,pu,lk,ro)}</div></div>`;}
function calcResHTML(a,t,C,amt,q,pu,lk,ro){if(compsOf(a))return CL.resHTML(a,t,C,amt,q,pu,lk,ro); /* 16/10 (lot C2) */const n=Object.keys(C.chk).length;return `<span>Σ <b>${eur(amt,2)}</b> ÷ ${q>0?fmtQ(q)+' '+esc(t.u||''):'<b style="color:#b91c1c">quantité ?</b>'}</span><span>= <b class="pu">${q>0?nb(r2(pu),2)+' €':'—'}</b>${t.u?' / '+esc(t.u):''}</span>
  ${ro?'':`<button class="btn sm primary" data-act="af" data-v="dxput|" ${n&&q>0?'':'disabled'}>↦ Mettre ${q>0&&n?nb(r2(pu),2)+' € ':''}dans ${esc(t.a)}</button>${lk?`<button class="btn sm" data-act="af" data-v="dxunlink|${esc(lk.id)}" title="Retirer le lien (le PU reste dans le DPGF)">✕ Délier</button>`:''}${n?`<button class="btn sm" data-act="af" data-v="dxcclr|">Tout décocher</button>`:''}`}`;}
/* ═════════ 11 · LA VENTILATION DE NOTRE PRIX (grand tableau postes × zones, ce qui est pointé) ═════════ */
export function ventHTML(a,M,canEdit){const CP=compsOf(a);if(!CP)return `<div class="dx-panel" id="dx-vent"><h4>📊 Ventilation de notre prix</h4><div class="eq-s">Pas encore de chiffrage complet (zones, postes) : la ventilation s'affichera ici.</div></div>`;
  const P=pointage(a,CP,M);const coef=CP.coef;const cols=CP.zones.map(z=>({k:'z'+z.i,nom:z.nom,ml:z.ml})).concat(CP.inst?[{k:'inst',nom:'🏗 Installations',ml:0}]:[]);
  const agg=new Map();CP.list.forEach(c=>{const kk=(c.z<0?'inst':'z'+c.z)+'|'+c.p;const o=agg.get(kk)||{amt:0,mo:0,fo:0,st:0,loc:0};o.amt+=c.amtV;o.mo+=c.mo/coef;o.fo+=c.fo/coef;o.st+=c.st/coef;o.loc+=c.loc/coef;agg.set(kk,o);});
  const ptOf=kk=>(P.byCell.get(kk)||[]).reduce((s,x)=>s+x.amt,0);const D=a.dpgf||{};const hasT=!!calcTarget(a,M);
  const lkN=new Map((D.liens||[]).map((L,i)=>[L.id,i+1]));const bar=(segs,tot)=>`<span class="dx-vb">${segs.map(x=>`<i ${x.id==='atelier'?'class="at" title="placé par l\'atelier"':`data-lk="${esc(x.id)}" title="${esc('n° '+(lkN.get(x.id)||'?')+' · '+nb(x.amt)+' €')}"`} style="width:${tot>0?Math.min(100,x.amt/tot*100).toFixed(2):0}%${x.id==='atelier'?'':';background:'+LK_COLS[x.col%LK_COLS.length]}"></i>`).join('')}</span>`;
  let rows='',lastG=null;const T={amt:0,mo:0,fo:0,st:0,loc:0,pt:0};const colT=cols.map(()=>({amt:0,pt:0}));
  CP.postes.forEach(Pp=>{const cells=cols.map(cl=>agg.get(cl.k+'|'+Pp.k));if(!cells.some(x=>x&&Math.abs(x.amt)>0.004))return;const g=CP.grp[Pp.grp]||'';if(g!==lastG){rows+=`<tr class="g"><td colspan="${cols.length+8}">${esc(g)}</td></tr>`;lastG=g;}
    let tot={amt:0,mo:0,fo:0,st:0,loc:0,pt:0};const tds=cols.map((cl,i)=>{const x=cells[i];if(!x||Math.abs(x.amt)<0.004)return '<td class="z"></td>';const kk=cl.k+'|'+Pp.k;const segs=P.byCell.get(kk)||[];const pt=ptOf(kk);['amt','mo','fo','st','loc'].forEach(f=>{tot[f]+=x[f];});tot.pt+=pt;colT[i].amt+=x.amt;colT[i].pt+=pt;const over=pt>x.amt+1;const rest=x.amt-pt;
      return `<td class="z${over?' over':''}${canEdit&&hasT?' click':''}" data-act="af" data-v="dxvpick|${esc(kk)}" title="${esc(Pp.label+' · '+cl.nom)} — touche pour cocher ces composantes dans le calculateur">${nb(x.amt)}${bar(segs,x.amt)}<span class="sub">${over?'⚠ +'+nb(-rest):Math.abs(rest)<1?'✓ placé':'reste '+nb(rest)}</span>${over||Math.abs(rest)<1?'':REP.ventMl(CP,P,kk)}</td>`;}).join('');
    ['amt','mo','fo','st','loc','pt'].forEach(f=>{T[f]+=tot[f];});const over=tot.pt>tot.amt+1;
    rows+=`<tr><td>${esc(Pp.label)}${CL.ventSub(CP,Pp.k)}</td>${tds}<td><b>${nb(tot.amt)}</b></td><td>${tot.mo>0.5?nb(tot.mo):''}</td><td>${tot.fo>0.5?nb(tot.fo):''}</td><td>${tot.st>0.5?nb(tot.st):''}</td><td>${tot.loc>0.5?nb(tot.loc):''}</td><td${over?' class="over"':''}>${tot.pt>0.5?nb(tot.pt):''}</td><td>${Math.abs(tot.amt-tot.pt)<1?'✓':nb(tot.amt-tot.pt)}</td></tr>`;});
  const allSegs=[];P.byCell.forEach(L=>L.forEach(x=>{const o=allSegs.find(y=>y.id===x.id);if(o)o.amt+=x.amt;else allSegs.push(Object.assign({},x));}));
  const pct=CP.C.vente>0?T.pt/CP.C.vente*100:0;const rest=CP.C.vente-T.pt;const liens=D.liens||[];
  const lkList=liens.length?`<div class="dx-lks-list">${liens.map((L,i)=>{const X=linkNow(L,CP,M);const ln=(D.lignes||[]).find(l=>!l.section&&up(L.sh)===up(dpSheetName(a,M))&&parseAddr(L.a)&&l.row===parseAddr(L.a).r);
      return `<div class="dx-lkr" data-lk="${esc(L.id)}" style="--lk:${LK_COLS[L.col%LK_COLS.length]}"><span class="dx-lkh" style="background:${LK_COLS[L.col%LK_COLS.length]}">${i+1}</span><button class="lnk" data-act="af" data-v="dxgo|${esc(L.sh)}|${esc(L.a)}" title="Aller à la cellule">${esc(L.a)}</button><span style="flex:1;min-width:120px">${ln?esc((ln.n?ln.n+' ':'')+ln.des).slice(0,70):esc(L.sh)}</span><b>${nb(X.pur,2)} €</b><span class="dim">${eur(X.amt)} · ${(L.comps||[]).length} comp.</span>${REP.lkTag(a,L)}${X.stale?`<span class="eq-tag warn">↻ ${X.cell===null?'vide':nb(X.cell,2)} → ${nb(X.pur,2)}</span>${canEdit?`<button class="btn sm" data-act="af" data-v="dxrelink|${esc(L.id)}">↻</button>`:''}`:''}${canEdit?`<button class="lnk" data-act="af" data-v="dxunlink|${esc(L.id)}" title="Délier" style="color:#9b2c22">✕</button>`:''}</div>`;}).join('')}</div>`:'';
  const nStale=liens.filter(L=>linkNow(L,CP,M).stale).length;
  return `<div class="dx-panel" id="dx-vent"><h4>📊 Ventilation de notre prix <span class="hint">· prix de vente HT${CP.v?' · chiffrage v'+CP.v:''} · ce que le DPGF a déjà pointé</span></h4>
    <div class="dx-vsum"><span>Notre prix <b>${eur(CP.C.vente)}</b></span><span>pointé <b>${eur(T.pt)}</b> (${nb(pct,0)} %)</span><span>${Math.abs(rest)<1?'<b style="color:#15803d">✓ tout est placé</b>':rest>0?'reste à placer <b>'+eur(rest)+'</b>':'<b style="color:#b91c1c">⚠ pointé au-delà de '+eur(-rest)+'</b>'}</span>${bar(allSegs,CP.C.vente)}${REP.ventBtn(a,canEdit)}</div>
    ${nStale&&canEdit?`<div class="dx-stale">⚠ ${nStale} prix lié${nStale>1?'s':''} à mettre à jour (chiffrage ou quantité changés) <button class="btn sm primary" data-act="af" data-v="dxrelink|*">↻ Appliquer ${nStale>1?'les '+nStale+' prix':'le prix'}</button></div>`:''}
    <div style="overflow:auto;max-height:60vh;border:1px solid #eee;border-radius:8px"><table class="dx-vt"><thead><tr><th>Poste</th>${cols.map(c=>`<th>${esc(c.nom)}${c.ml?`<span class="sub">${nb(c.ml)} ml</span>`:''}</th>`).join('')}<th>Total vente</th><th>dont MO</th><th>Fourn.</th><th>S.-trait.</th><th>Loc. / frais</th><th>Pointé</th><th>Reste</th></tr></thead>
      <tbody>${rows}<tr class="tot"><td>Total</td>${colT.map(x=>`<td>${nb(x.amt)}<span class="sub">${Math.abs(x.amt-x.pt)<1?'✓ placé':'reste '+nb(x.amt-x.pt)}</span></td>`).join('')}<td>${nb(T.amt)}</td><td>${nb(T.mo)}</td><td>${nb(T.fo)}</td><td>${nb(T.st)}</td><td>${nb(T.loc)}</td><td>${nb(T.pt)}</td><td>${Math.abs(T.amt-T.pt)<1?'✓':nb(T.amt-T.pt)}</td></tr></tbody></table></div>
    <div class="dx-leg">${liens.map((L,i)=>`<span data-lk="${esc(L.id)}"><i style="background:${LK_COLS[L.col%LK_COLS.length]}"></i>${i+1} · ${esc(L.a)}</span>`).join('')}${allSegs.some(x=>x.id==='atelier')?'<span><i class="at" style="background:repeating-linear-gradient(45deg,#9ca3af 0 3px,#d1d5db 3px 6px)"></i>atelier (prix composés / coûts placés)</span>':''}</div>
    ${liens.length?`<div class="eq-lab" style="margin-top:8px">Lignes pointées · ${liens.length}</div>${lkList}`:'<div class="hint" style="margin-top:6px">Aucune ligne pointée : touche une ligne du DPGF, coche ce que son prix comprend, « ↦ Mettre dans le DPGF ».</div>'}${REP.ventReps(a,M,CP,canEdit)}</div>`;}
const dpSheetName=(a,M)=>dpSheet(M,a.dpgf||{}).name;
/* ═════════ 12 · LA CARTE (barre d'outils, barre de formule, grille, onglets, calculateur, ventilation) ═════════ */
const ZOOMS=[0.5,0.6,0.7,0.8,0.9,1,1.1,1.25,1.5,1.75,2];
function curSheet(a,M){const n=XS.sh[a.num];const S=n&&M.S(n);if(S)return S;const D=a.dpgf||{};const d=dpSheet(M,D);XS.sh[a.num]=d.name;return d;}
function zoomOf(a,S){const z=XS.zoom[a.num+'|'+S.name];if(z)return z;const vz=S.view.zoom?S.view.zoom/100:1;return Math.max(0.5,Math.min(2,vz));}
function ensureSel(a,M,S){let s=XS.sel[a.num];if(s&&up(s.sh)===up(S.name))return s;const D=a.dpgf||{};let r=1,c=1;if(S===dpSheet(M,D)){const l=(D.lignes||[]).find(x=>!x.section);if(l){r=l.row;c=puColOf(D);}}else if(S.view.active){const p=parseAddr(S.view.active);if(p){r=p.r;c=p.c;}}
  s=XS.sel[a.num]={sh:S.name,r,c,r2:r,c2:c};return s;}
const popLive=()=>!!(XS.pop&&XS.pop.w&&!XS.pop.w.closed);
function cellInfo(a,M,S,s){const k=cellKey(s.r,s.c);const cell=S.cells.get(k);const ad=addrOf(s.r,s.c);const lk=linkAt(a,S.name,ad);const bits=[];
  if(lk){const CP=compsOf(a);const X=CP?linkNow(lk,CP,M):null;bits.push(`<span style="color:${LK_COLS[lk.col%LK_COLS.length]};font-weight:700">🔗 prix lié</span>${X&&X.stale?' · ↻ '+nb(X.pur,2)+' €':''}`);}
  if(S._uns.has(k))bits.push('⚠ non recalculée ('+esc(S._uns.get(k))+')');if(cell&&cell.ed)bits.push(cell.ed.auto?'auto : PU × quantité':'modifiée'+(XS.canEdit?` <button class="lnk" data-act="af" data-v="dxrevert|${esc(S.name)}|${ad}" title="Remettre la valeur du fichier du client">↺ d'origine</button>`:''));
  return bits.join(' · ');}
function statusHTML(a,M,S){const s=selBox(XS.sel[a.num]);let txt='';if(s&&(s.r2>s.r1||s.c2>s.c1)){let n=0,sum=0,cnt=0;for(let r=s.r1;r<=Math.min(s.r2,S.maxR);r++)for(let c=s.c1;c<=Math.min(s.c2,S.maxC);c++){const v=val(M,S,r,c);if(v!==null&&v!=='')cnt++;if(typeof v==='number'){n++;sum+=v;}}if(n)txt=`Somme : <b>${nb(sum,2)}</b> · Moyenne : ${nb(sum/n,2)} · Nb : ${cnt}`;else if(cnt)txt='Nb : '+cnt;}
  let mods=0;M.sheets.forEach(x=>x.cells.forEach(c=>{if(c.ed&&!c.ed.auto)mods++;}));const ops=(((a.dpgf||{}).xl||{}).ops||[]).length;let nr=0;M.sheets.forEach(x=>{nr+=x._uns.size;});
  return `${txt?`<span>${txt}</span>`:''}${mods||ops?`<button class="lnk" data-act="af" data-v="dxmods|" title="Les cellules changées par rapport au fichier du client">✎ ${mods} cellule${mods>1?'s':''} modifiée${mods>1?'s':''}${ops?' · '+ops+' ligne'+(ops>1?'s':'')+' insérée'+(ops>1?'s':'')+' / supprimée'+(ops>1?'s':''):''}</button>`:'<span>fichier du client inchangé</span>'}${nr?`<span title="Formules d'une fonction que l'appli ne calcule pas : elles gardent la valeur du fichier ; Excel les recalcule à l'ouverture">⚠ ${nr} non recalculée${nr>1?'s':''}</span>`:''}`;}
function modsHTML(a,M){const L=[];M.sheets.forEach(S=>S.cells.forEach(c=>{if(!c.ed)return;const o=c.o;const fo=o?(o.f?'='+fxToFr(o.f):fmtValue(o.v,M.book.fmt(styleIdx(S,c.r,c.c,o))).t):'(vide)';const fn=c.f?'='+fxToFr(c.f):fmtValue(val(M,S,c.r,c.c),M.book.fmt(styleIdx(S,c.r,c.c,c))).t;L.push({S,c,fo,fn});}));
  const ops=(((a.dpgf||{}).xl||{}).ops||[]);
  return `<div class="dx-panel dx-mods" id="dx-mods"><h4>✎ Ce qui change dans le fichier du client <button class="btn sm" data-act="af" data-v="dxmods|" style="margin-left:auto">✕</button></h4>${ops.length?`<div class="hint">${ops.map(o=>(o.op==='ins'?'＋ '+o.n+' ligne'+(o.n>1?'s':'')+' insérée'+(o.n>1?'s':'')+' en '+o.at:'− '+o.n+' ligne'+(o.n>1?'s':'')+' supprimée'+(o.n>1?'s':'')+' en '+o.at)+' ('+esc(o.sh)+')').join(' · ')}</div>`:''}
    ${L.length?`<div style="max-height:30vh;overflow:auto"><table><tr><th>Cellule</th><th>Avant</th><th>Maintenant</th><th></th></tr>${L.slice(0,400).map(x=>`<tr><td><button class="lnk" data-act="af" data-v="dxgo|${esc(x.S.name)}|${addrOf(x.c.r,x.c.c)}">${M.sheets.length>1?esc(x.S.name)+'!':''}${addrOf(x.c.r,x.c.c)}</button></td><td class="dim">${esc(String(x.fo).slice(0,40))}</td><td><b>${esc(String(x.fn).slice(0,40))}</b>${x.c.ed.auto?' <small class="dim">auto</small>':''}</td><td>${XS.canEdit?`<button class="lnk" data-act="af" data-v="dxrevert|${esc(x.S.name)}|${addrOf(x.c.r,x.c.c)}" title="Valeur d'origine">↺</button>`:''}</td></tr>`).join('')}</table></div>`:'<div class="eq-s">Aucune cellule modifiée.</div>'}</div>`;}
export function dpgfXlHTML(a,canEdit,ctx){ensureCss(document);wireSide();XS.ctx=ctx;XS.num=a.num;XS.canEdit=canEdit;XS.vva=a&&a._vview?a:null;const B=bookOf(a);const D=a.dpgf||{};
  const exp=`<span class="eq-acts" style="margin:0;flex-wrap:wrap"><button class="btn sm primary" data-act="af" data-v="dxexport|" title="Le fichier du client, seules les cellules changées : sans aucun repère de l'appli">⬇ DPGF pour le dossier</button><button class="btn sm" data-act="af" data-v="dxpu|" title="Le détail de nos prix unitaires, ici dans l'appli : chaque ligne du DPGF décomposée, et nos prix par zone, poste et DN">🔎 Détail des prix unitaires</button></span>`;
  const head=`<div class="dx-head"><h3>📊 DPGF du client <span class="hint">· ${esc(D.fichier||'')} · tel quel, modifiable comme dans Excel</span></h3>${B.st==='ok'||B.st==='loading'?exp:''}</div>`;
  if(B.st==='loading')return `<div class="card dx-card" id="dx-card">${head}<div class="dx-ph">⏳ Lecture du classeur du client…</div></div>`;
  if(B.st!=='ok')return `<div class="card dx-card" id="dx-card">${head}<div class="dx-ph">${B.st==='nofile'?'📄 Le fichier Excel du client n\'est pas sur cet appareil (importé sur un autre poste, hors connexion).<br><span class="hint">Réimporte-le pour le travailler ici comme dans Excel ; le bordereau simplifié et l\'atelier restent disponibles plus bas.</span>':'Classeur illisible : '+esc(B.err||'')}</div></div>`;
  const M=modelOf(a);ensureXfCss(document,M.book);const S=curSheet(a,M);const s=ensureSel(a,M,S);const z=zoomOf(a,S);const side=XS.lay==='side'||(XS.lay!=='stack'&&(window.innerWidth||0)>=1500);
  const key=a.num+'|'+S.name;const sc=XS.scroll[key]||{top:0,left:0};const pop=popLive();let grid;
  if(pop)grid=`<div class="dx-grid"><div class="dx-ph" style="min-height:160px"><div style="font-size:30px">⧉</div><b>Le DPGF est ouvert dans l'autre fenêtre</b><span class="hint">Glisse-la sur ton 2e écran : touche une ligne là-bas, le calcul se fait ici.</span><button class="btn sm" data-act="af" data-v="dxpopclose|">↩ Ramener ici</button></div></div>`;
  else{const T=tableHTML(a,M,S,z,sc.top,(window.innerHeight||900)*0.65);XS.win0={i0:T.win.i0,i1:T.win.i1,key,z};
    grid=`<div class="dx-grid" id="dx-grid"><div class="dx-vp" id="dx-vp" tabindex="0" role="grid" aria-label="DPGF : feuille ${esc(S.name)}"><div class="dx-cnt" id="dx-cnt">${T.html}</div></div>${tabsHTML(a,M,S)}</div>`;}
  const cur=S.cells.get(cellKey(s.r,s.c));const ro=!canEdit;
  const bar=`<div class="dx-bar">${ro?'':`<button class="btn sm" data-act="af" data-v="dxundo|" title="Annuler (Ctrl+Z)">↶</button><button class="btn sm" data-act="af" data-v="dxredo|" title="Rétablir (Ctrl+Y)">↷</button><span class="sep"></span><button class="btn sm" data-act="af" data-v="dxins|" title="Insérer une ligne sous la ligne sélectionnée (mêmes formats et formules)">＋ Ligne</button><button class="btn sm" data-act="af" data-v="dxins|up" title="Insérer une ligne au-dessus">＋ au-dessus</button><button class="btn sm" data-act="af" data-v="dxdel|" title="Supprimer la ou les lignes sélectionnées">− Ligne</button><span class="sep"></span><button class="btn sm primary" data-act="af" data-v="dxcalc|" title="Calculer le prix de la cellule sélectionnée à partir de notre chiffrage (le calculateur s'ouvre aussi tout seul au clic sur un PU)">🧮 Calculer cette cellule</button>${REP.barBtn(a,canEdit)}<span class="sep"></span>`}
    <button class="btn sm" data-act="af" data-v="dxzoom|-1" title="Zoom arrière">−</button><span class="dx-zv">${Math.round(z*100)} %</span><button class="btn sm" data-act="af" data-v="dxzoom|1" title="Zoom avant">+</button><span class="sep"></span>
    <button class="btn sm${side?' on':''}" data-act="af" data-v="dxlay|side" title="Le DPGF à gauche, notre prix à droite (grand écran)">◫ Côte à côte</button><button class="btn sm${side?'':' on'}" data-act="af" data-v="dxlay|stack" title="Notre prix sous le DPGF (écran simple)">⬒ Empilé</button><button class="btn sm${pop?' on':''}" data-act="af" data-v="dxpop|" title="Le DPGF dans une fenêtre à glisser sur le 2e écran">⧉ Autre écran</button><button class="btn sm" data-act="af" data-v="dxfull|" title="${XS.full?'Quitter le plein écran (Échap)':'Plein écran'}">${XS.full?'✕ Quitter':'⤢ Plein écran'}</button></div>`;
  const fb=`<div class="dx-fb"><input class="dx-nm" id="dx-nm" value="${addrOf(s.r,s.c)}" aria-label="Cellule" title="Aller à une cellule (ex. E12)"><span class="dx-fxl">fx</span><input class="dx-fi" id="dx-fi" value="${esc(editText(cur&&cur.f?cur:{v:val(M,S,s.r,s.c)}))}" ${ro?'readonly':''} aria-label="Contenu de la cellule"><span class="dx-fbx" id="dx-fbx"${cellInfo(a,M,S,s)?'':' hidden'}>${cellInfo(a,M,S,s)}</span></div>`;
  queueMicrotask(()=>{try{dxMount(a.num);}catch(e){console.warn(e);}});
  {const h=CL.cardHTML(a,M,canEdit,{z,side,pop,grid,fb,sideHTML:()=>sideHTML(a,M,canEdit),top:SV.topHTML(a,M,canEdit),end:SV.endHTML(a,M,canEdit)+RC.endHTML(a,M,canEdit) /* (lot DK) : récap, fenêtre « Donner sa part » */});if(h!==null)return h;} /* 16/10 (lot C2) : barre courte (« ⋯ »), autre écran = une barre fine, calculateur et ventilation sur toute la largeur — (lot C3) : top = bandeau « le chiffrage a changé », end = bouton flottant « 🧮 Calculer » et la liste à traiter */
  return `<div class="card dx-card${XS.full?' full':''}" id="dx-card">${head}${bar}${pop?'':fb}<div class="dx-split${side?' side':''}${REP.splitCls(a)}">${grid}<div class="dx-side" id="dx-side">${sideHTML(a,M,canEdit)}</div></div>
    <div class="hint" style="margin-top:6px">Clique une cellule et tape (formules en français : <i>=SOMME(F7:F9)</i>, <i>=ARRONDI(D10*E10;2)</i>) ; Entrée valide, Échap annule, Ctrl+Z annule. Le coin bleu = cellule modifiée ; « ⬇ DPGF pour le dossier » rend le fichier du client avec ces seules cellules changées.</div>${REP.toolHTML(a,M,canEdit)}</div>`;}
function tabsHTML(a,M,S){return `<div class="dx-tabs">${M.sheets.map((x,i)=>x.hidden?'':`<button class="${x===S?'on':''}" data-act="af" data-v="dxsheet|${i}">${esc(x.name)}</button>`).join('')}<span class="dx-st" id="dx-st">${statusHTML(a,M,S)}</span></div>`;}
function sideHTML(a,M,canEdit){return (XS.showMods?modsHTML(a,M):'')+calcHTML(a,M,canEdit)+(SV.ventHTML(a,M,canEdit)??ventHTML(a,M,canEdit))+puDetailBlock(a,canEdit);} /* 16/10 (lot C3) : ventilation compacte (zones repliables, coûts au choix), toujours sous le calculateur */
/* ═════════ 13 · MONTAGE APRÈS LE RENDU, ÉVÉNEMENTS DE LA GRILLE ═════════ */
function viewOf(doc){return {doc,win:doc.defaultView||window,vp:doc.getElementById('dx-vp'),cnt:doc.getElementById('dx-cnt'),fi:doc.getElementById('dx-fi'),nm:doc.getElementById('dx-nm'),fbx:doc.getElementById('dx-fbx'),st:doc.getElementById('dx-st')};}
export function dxMount(num,doc){doc=doc||document;const a=affOf(num);if(!a)return;const M=modelOf(a);if(!M)return;const V=viewOf(doc);if(!V.vp)return;const S=curSheet(a,M);V.num=num;V.sh=S.name;V.key=num+'|'+S.name;
  if(doc===document)XS.view=V;else XS.pview=V;const sc=XS.scroll[V.key];if(sc){V.vp.scrollTop=sc.top;V.vp.scrollLeft=sc.left;}V.wr=doc===document&&XS.win0&&XS.win0.key===V.key?XS.win0:null;refreshWin(V,true);
  if(V.vp._dx){REP.mount(V);return;}V.vp._dx=1;bindGrid(V);REP.mount(V); /* 15/10 (lot R) : pastille, ouverture au clic */if(XS.focus&&doc===document&&!document.querySelector('#modal.show'))try{V.vp.focus({preventScroll:true});}catch(e){}}
function refreshWin(V,force){const a=affOf(V.num);const M=a&&modelOf(a);if(!M)return;const S=M.S(V.sh);if(!S)return;const z=zoomOf(a,S);const L=layOf(M,S,z);const win=winOf(S,L,V.vp.scrollTop,V.vp.clientHeight||600);
  if(!force&&V.wr&&V.wr.i0===win.i0&&V.wr.i1===win.i1)return;if(force&&V.wr&&V.wr.i0===win.i0&&V.wr.i1===win.i1&&V.wr.z===z)return;const tb=V.cnt.querySelector('tbody');if(!tb)return;const o=renderOpts(a,M,S,L);tb.innerHTML=bodyHTML(M,S,o,win);V.wr={i0:win.i0,i1:win.i1,key:V.key,z};
  if(XS.edit&&XS.edit.V===V)placeEditor(V);}
function bindGrid(V){const vp=V.vp,doc=V.doc;let raf=0;
  vp.addEventListener('scroll',()=>{XS.scroll[V.key]={top:vp.scrollTop,left:vp.scrollLeft};if(raf)return;raf=V.win.requestAnimationFrame(()=>{raf=0;refreshWin(V);});},{passive:true});
  let drag=null;
  vp.addEventListener('pointerdown',e=>{const th=e.target.closest&&e.target.closest('th');const td=e.target.closest&&e.target.closest('td[data-r]');if(XS.edit&&XS.edit.V===V&&e.target!==XS.edit.el)commitEdit(0);
    if(th&&th.dataset.ch){e.preventDefault();vp.focus({preventScroll:true});const c=+th.dataset.ch;selectTo(V,{r:1,c,r2:Math.max(1,maxRowOf(V)),c2:c},false);return;}
    if(th&&th.dataset.rh){e.preventDefault();vp.focus({preventScroll:true});const r=+th.dataset.rh;const cur=XS.sel[V.num];if(e.shiftKey&&cur){selectTo(V,Object.assign({},cur,{c:1,c2:maxColOf(V),r2:r}),false);return;}selectTo(V,{r,c:1,r2:r,c2:maxColOf(V)},false);return;}
    if(!td)return;const r=+td.dataset.r,c=+td.dataset.c;if(e.pointerType==='touch'){drag={touch:true,x:e.clientX,y:e.clientY,r,c};return;}
    e.preventDefault();vp.focus({preventScroll:true});XS.focus=true;const cur=XS.sel[V.num];if(e.shiftKey&&cur&&up(cur.sh)===up(V.sh))selectTo(V,Object.assign({},cur,{r2:r,c2:c}));else selectTo(V,{r,c,r2:r,c2:c});drag={r,c};});
  vp.addEventListener('pointermove',e=>{if(!drag||drag.touch||!(e.buttons&1))return;const el=doc.elementFromPoint(e.clientX,e.clientY);const td=el&&el.closest&&el.closest('td[data-r]');if(!td)return;const r=+td.dataset.r,c=+td.dataset.c;const cur=XS.sel[V.num];if(cur&&(cur.r2!==r||cur.c2!==c))selectTo(V,Object.assign({},cur,{r2:r,c2:c}),false);});
  const endDrag=e=>{if(drag&&drag.touch&&e&&Math.abs(e.clientX-drag.x)<10&&Math.abs(e.clientY-drag.y)<10){selectTo(V,{r:drag.r,c:drag.c,r2:drag.r,c2:drag.c});}drag=null;};
  vp.addEventListener('pointerup',endDrag);vp.addEventListener('pointercancel',()=>{drag=null;});
  vp.addEventListener('dblclick',e=>{const td=e.target.closest&&e.target.closest('td[data-r]');if(!td||!XS.canEdit)return;e.preventDefault();startEdit(V,null,'edit');});
  vp.addEventListener('focus',()=>{XS.focus=true;});vp.addEventListener('blur',()=>{setTimeout(()=>{if(doc.activeElement!==vp&&!(XS.edit&&XS.edit.V===V))XS.focus=false;},0);});
  vp.addEventListener('keydown',e=>gridKey(V,e));
  vp.addEventListener('copy',e=>{const t=copyText(V);if(t===null)return;e.preventDefault();try{e.clipboardData.setData('text/plain',t);}catch(x){}});
  vp.addEventListener('paste',e=>{if(!XS.canEdit)return;const t=(e.clipboardData||V.win.clipboardData).getData('text/plain');if(!t)return;e.preventDefault();pasteText(V,t);});
  if(V.fi){V.fi.addEventListener('focus',()=>{if(!XS.canEdit)return;const s=XS.sel[V.num];XS.edit={V,bar:true,sh:V.sh,r:s.r,c:s.c,t0:V.fi.value};});
    V.fi.addEventListener('keydown',e=>{if(!XS.edit||!XS.edit.bar)return;if(e.key==='Enter'){e.preventDefault();commitEdit(1,V.fi.value);}else if(e.key==='Escape'){e.preventDefault();V.fi.value=XS.edit.t0;XS.edit=null;vp.focus({preventScroll:true});}});
    V.fi.addEventListener('blur',()=>{if(XS.edit&&XS.edit.bar&&V.fi.value!==XS.edit.t0)commitEdit(0,V.fi.value);else if(XS.edit&&XS.edit.bar)XS.edit=null;});}
  if(V.nm)V.nm.addEventListener('keydown',e=>{if(e.key!=='Enter')return;e.preventDefault();const p=parseAddr(V.nm.value.trim());if(!p){V.nm.value=addrOf(XS.sel[V.num].r,XS.sel[V.num].c);return;}selectTo(V,{r:p.r,c:p.c,r2:p.r,c2:p.c});vp.focus({preventScroll:true});});}
const maxRowOf=V=>{const a=affOf(V.num);const M=modelOf(a);const S=M&&M.S(V.sh);return S?Math.max(1,S.maxR):1;};const maxColOf=V=>{const a=affOf(V.num);const M=modelOf(a);const S=M&&M.S(V.sh);return S?Math.max(1,S.maxC):1;};
/* sélection : classes posées en place (sans redessiner l'appli) ; le calculateur suit la ligne */
function selectTo(V,s,scroll){const a=affOf(V.num);const M=modelOf(a);const S=M&&M.S(V.sh);if(!S)return;const prevT=tgtKey(calcTarget(a,M));
  s=Object.assign({sh:S.name},s);s.r=Math.max(1,s.r);s.c=Math.max(1,s.c);s.r2=Math.max(1,s.r2??s.r);s.c2=Math.max(1,s.c2??s.c);
  /* une cellule fusionnée : la sélection prend la fusion */const MG=mergesOf(S);const inn=MG.inn.get(cellKey(s.r,s.c));if(inn&&s.r===s.r2&&s.c===s.c2){s.r=inn.r1;s.c=inn.c1;s.r2=inn.r1;s.c2=inn.c1;}
  XS.sel[V.num]=s;paintSel(V,a,M,S);if(scroll!==false)scrollToCell(V,M,S,s.r2??s.r,s.c2??s.c);
  if(tgtKey(calcTarget(a,M))!==prevT)refreshCalc(a);REP.onSel(V);}
function paintSel(V,a,M,S){const b=selBox(XS.sel[V.num]);const cnt=V.cnt;if(!cnt)return;cnt.querySelectorAll('td.dx-on,td.dx-in').forEach(td=>td.classList.remove('dx-on','dx-in'));cnt.querySelectorAll('th.on').forEach(th=>th.classList.remove('on'));
  if(b){const big=(b.r2-b.r1+1)*(b.c2-b.c1+1)>400;const tds=big?[...cnt.querySelectorAll('td[data-r]')].filter(td=>{const r=+td.dataset.r,c=+td.dataset.c;return r>=b.r1&&r<=b.r2&&c>=b.c1&&c<=b.c2;}):null;
    if(tds)tds.forEach(td=>td.classList.add(+td.dataset.r===b.r&&+td.dataset.c===b.c?'dx-on':'dx-in'));else for(let r=b.r1;r<=b.r2;r++)for(let c=b.c1;c<=b.c2;c++){const td=cnt.querySelector(`td[data-r="${r}"][data-c="${c}"]`);if(td)td.classList.add(r===b.r&&c===b.c?'dx-on':'dx-in');}
    cnt.querySelectorAll('th[data-ch]').forEach(th=>{const c=+th.dataset.ch;if(c>=b.c1&&c<=b.c2)th.classList.add('on');});cnt.querySelectorAll('th[data-rh]').forEach(th=>{const r=+th.dataset.rh;if(r>=b.r1&&r<=b.r2)th.classList.add('on');});}
  const s=XS.sel[V.num];const cell=S.cells.get(cellKey(s.r,s.c));if(V.nm)V.nm.value=addrOf(s.r,s.c);if(V.fi&&!(XS.edit&&XS.edit.bar))V.fi.value=editText(cell&&cell.f?cell:{v:val(M,S,s.r,s.c)});
  if(V.fbx){const inf=cellInfo(a,M,S,s);V.fbx.innerHTML=inf;V.fbx.hidden=!inf;}if(V.st)V.st.innerHTML=statusHTML(a,M,S);}
function scrollToCell(V,M,S,r,c){const a=affOf(V.num);const L=layOf(M,S,zoomOf(a,S));const vp=V.vp;const ri=L.rIdx.get(r),ci=L.cIdx.get(c);
  if(ri!==undefined&&r>L.ys){const R=L.VR[ri];const top=R.y-L.FH;const vis=vp.clientHeight-L.hh-L.FH;if(top<vp.scrollTop)vp.scrollTop=top;else if(top+R.h>vp.scrollTop+vis)vp.scrollTop=top+R.h-vis;}
  if(ci!==undefined&&!L.fzL.has(c)){let x=L.rhW;for(let i=0;i<ci;i++)x+=L.VC[i].w;const fw=[...L.fzL.keys()].reduce((s,k)=>s+L.VC[L.cIdx.get(k)].w,0);const w=L.VC[ci].w;if(x-L.rhW-fw<vp.scrollLeft)vp.scrollLeft=x-L.rhW-fw;else if(x+w>vp.scrollLeft+vp.clientWidth)vp.scrollLeft=x+w-vp.clientWidth;}
  refreshWin(V);paintSel(V,a,M,S);}
function moveSel(V,dr,dc,extend){const a=affOf(V.num);const M=modelOf(a);const S=M.S(V.sh);const L=layOf(M,S,zoomOf(a,S));const s=XS.sel[V.num];let r=extend?(s.r2??s.r):s.r,c=extend?(s.c2??s.c):s.c;
  const MG=mergesOf(S);const m=MG.top.get(cellKey(r,c))||MG.inn.get(cellKey(r,c));if(m&&!extend){if(dr>0)r=m.r2;if(dc>0)c=m.c2;if(dr<0)r=m.r1;if(dc<0)c=m.c1;}
  const stepR=(x,d)=>{let i=L.rIdx.get(x);if(i===undefined)return Math.max(1,x+d);i=Math.max(0,Math.min(L.VR.length-1,i+d));return L.VR[i].r;};const stepC=(x,d)=>{let i=L.cIdx.get(x);if(i===undefined)return Math.max(1,x+d);i=Math.max(0,Math.min(L.VC.length-1,i+d));return L.VC[i].c;};
  if(dr)r=stepR(r,dr);if(dc)c=stepC(c,dc);if(extend)selectTo(V,Object.assign({},s,{r2:r,c2:c}));else selectTo(V,{r,c,r2:r,c2:c});}
function gridKey(V,e){if(XS.edit&&XS.edit.V===V&&!XS.edit.bar)return;const k=e.key;const ctl=e.ctrlKey||e.metaKey;const a=affOf(V.num);
  if(ctl&&(k==='z'||k==='Z')&&!e.shiftKey){e.preventDefault();if(XS.canEdit&&dxUndo(a))rerender();return;}if(ctl&&(k==='y'||k==='Y'||((k==='z'||k==='Z')&&e.shiftKey))){e.preventDefault();if(XS.canEdit&&dxUndo(a,true))rerender();return;}
  if(ctl&&(k==='c'||k==='C'||k==='v'||k==='V'||k==='x'||k==='X'))return;/* copier / coller : événements copy / paste */
  const vis=Math.max(1,Math.floor((V.vp.clientHeight-60)/22));
  switch(k){case 'ArrowDown':e.preventDefault();moveSel(V,ctl?vis*10:1,0,e.shiftKey);return;case 'ArrowUp':e.preventDefault();moveSel(V,ctl?-vis*10:-1,0,e.shiftKey);return;case 'ArrowRight':e.preventDefault();moveSel(V,0,ctl?20:1,e.shiftKey);return;case 'ArrowLeft':e.preventDefault();moveSel(V,0,ctl?-20:-1,e.shiftKey);return;
    case 'PageDown':e.preventDefault();moveSel(V,vis,0,e.shiftKey);return;case 'PageUp':e.preventDefault();moveSel(V,-vis,0,e.shiftKey);return;
    case 'Home':{e.preventDefault();const s=XS.sel[V.num];selectTo(V,ctl?{r:1,c:1}:{r:s.r,c:1});return;}
    case 'Enter':e.preventDefault();moveSel(V,e.shiftKey?-1:1,0,false);return;case 'Tab':e.preventDefault();moveSel(V,0,e.shiftKey?-1:1,false);return;
    case 'F2':e.preventDefault();if(XS.canEdit)startEdit(V,null,'edit');return;
    case 'Delete':e.preventDefault();if(XS.canEdit)clearSel(V);return;case 'Backspace':e.preventDefault();if(XS.canEdit)startEdit(V,'','enter');return;
    case 'Escape':if(XS.full){e.preventDefault();XS.full=false;rerender();}return;}
  if(k.length===1&&!ctl&&!e.altKey&&XS.canEdit){e.preventDefault();startEdit(V,k,'enter');}}
const rerender=()=>{if(XS.ctx&&XS.ctx.render)XS.ctx.render();refreshPopup();};
/* éditeur posé sur la cellule */
function startEdit(V,text,mode){const a=affOf(V.num);const M=modelOf(a);const S=M.S(V.sh);const s=XS.sel[V.num];scrollToCell(V,M,S,s.r,s.c);const cell=S.cells.get(cellKey(s.r,s.c));
  const t0=editText(cell&&cell.f?cell:{v:val(M,S,s.r,s.c)});const el=V.doc.createElement('input');el.className='dx-ed';el.value=text===null?t0:text;el.setAttribute('aria-label','Saisie de la cellule '+addrOf(s.r,s.c));
  XS.edit={V,el,sh:S.name,r:s.r,c:s.c,t0,mode,typed:text!==null};V.cnt.appendChild(el);placeEditor(V);el.focus({preventScroll:true});try{el.setSelectionRange(el.value.length,el.value.length);}catch(x){}
  if(V.fi)V.fi.value=el.value;
  el.addEventListener('input',()=>{if(V.fi)V.fi.value=el.value;placeEditor(V);});
  el.addEventListener('keydown',e=>{const k=e.key;if(k==='Enter'){e.preventDefault();commitEdit(e.shiftKey?-1:1);}else if(k==='Tab'){e.preventDefault();commitEdit(0,undefined,e.shiftKey?-1:1);}else if(k==='Escape'){e.preventDefault();cancelEdit();}
    else if(XS.edit&&XS.edit.mode==='enter'&&!String(el.value).startsWith('=')&&['ArrowDown','ArrowUp','ArrowLeft','ArrowRight'].includes(k)){e.preventDefault();const d={ArrowDown:[1,0],ArrowUp:[-1,0],ArrowRight:[0,1],ArrowLeft:[0,-1]}[k];commitEdit(d[0],undefined,d[1]);}e.stopPropagation();});
  el.addEventListener('blur',()=>{setTimeout(()=>{if(XS.edit&&XS.edit.el===el)commitEdit(0);},0);});}
function placeEditor(V){const E=XS.edit;if(!E||!E.el)return;const td=V.cnt.querySelector(`td[data-r="${E.r}"][data-c="${E.c}"]`);if(!td){E.el.style.display='none';return;}E.el.style.display='';const cr=V.cnt.getBoundingClientRect(),tr=td.getBoundingClientRect();
  const cs=V.win.getComputedStyle(td);E.el.style.left=(tr.left-cr.left)+'px';E.el.style.top=(tr.top-cr.top)+'px';E.el.style.height=Math.max(tr.height,22)+'px';E.el.style.font=cs.font;E.el.style.textAlign=cs.textAlign==='right'&&!String(E.el.value).startsWith('=')?'right':'left';
  const w=Math.max(tr.width,Math.min(600,String(E.el.value).length*8+24));E.el.style.width=w+'px';}
function cancelEdit(){const E=XS.edit;if(!E)return;XS.edit=null;if(E.el)E.el.remove();if(E.V.fi)E.V.fi.value=E.t0;try{E.V.vp.focus({preventScroll:true});}catch(x){}}
function commitEdit(dr,barText,dc){const E=XS.edit;if(!E)return;XS.edit=null;const text=barText!==undefined?barText:(E.el?E.el.value:E.t0);if(E.el)E.el.remove();const V=E.V;const a=affOf(V.num);
  if(dr||dc){const s=XS.sel[V.num];XS.sel[V.num]=Object.assign({},s,{r:Math.max(1,E.r+(dr||0)),c:Math.max(1,E.c+(dc||0)),r2:Math.max(1,E.r+(dr||0)),c2:Math.max(1,E.c+(dc||0))});}
  XS.focus=true;if(text===E.t0&&!E.typed){if(dr||dc){rerender();}else try{V.vp.focus({preventScroll:true});}catch(x){}return;}
  if(text===E.t0){if(dr||dc)rerender();return;}
  const ok=dxWrite(a,[{sh:E.sh,r:E.r,c:E.c,text}]);if(ok===false){XS.sel[V.num]=Object.assign({},XS.sel[V.num],{r:E.r,c:E.c,r2:E.r,c2:E.c});}rerender();}
function clearSel(V){const a=affOf(V.num);const M=modelOf(a);const S=M.S(V.sh);const b=selBox(XS.sel[V.num]);const vals=[];for(let r=b.r1;r<=Math.min(b.r2,S.maxR);r++)for(let c=b.c1;c<=Math.min(b.c2,S.maxC);c++){const cell=S.cells.get(cellKey(r,c));if(cell&&(cell.f||!isEmpty(cell.v)))vals.push({sh:S.name,r,c,text:''});}
  if(!vals.length)return;if(vals.length>200&&!confirm('Vider '+vals.length+' cellules ?'))return;dxWrite(a,vals);rerender();}
function copyText(V){const a=affOf(V.num);const M=modelOf(a);const S=M&&M.S(V.sh);const b=selBox(XS.sel[V.num]);if(!S||!b)return null;const L=layOf(M,S,zoomOf(a,S));const rows=[];
  for(let r=b.r1;r<=Math.min(b.r2,S.maxR);r++){if(!L.rIdx.has(r))continue;const row=[];for(let c=b.c1;c<=Math.min(b.c2,S.maxC);c++){if(!L.cIdx.has(c))continue;const v=val(M,S,r,c);row.push(typeof v==='number'?String(+v.toPrecision(15)).replace('.',','):fmtValue(v,'General').t);}rows.push(row.join('\t'));}return rows.join('\r\n');}
function pasteText(V,t){const a=affOf(V.num);const M=modelOf(a);const S=M.S(V.sh);const s=XS.sel[V.num];const b=selBox(s);const rows=String(t).replace(/\r/g,'').replace(/\n$/,'').split('\n').map(l=>l.split('\t'));const vals=[];
  if(rows.length===1&&rows[0].length===1&&(b.r2>b.r1||b.c2>b.c1)){for(let r=b.r1;r<=b.r2;r++)for(let c=b.c1;c<=b.c2;c++)vals.push({sh:S.name,r,c,text:rows[0][0]});}
  else rows.forEach((row,i)=>row.forEach((x,j)=>vals.push({sh:S.name,r:s.r+i,c:s.c+j,text:x})));
  if(dxWrite(a,vals)!==false){XS.sel[V.num]=Object.assign({},s,{r2:s.r+rows.length-1,c2:s.c+Math.max(...rows.map(x=>x.length))-1});say('Collé : '+vals.length+' cellule'+(vals.length>1?'s':''));}rerender();}
/* le panneau de droite (calculateur, ventilation) redessiné seul */
function refreshSide(a){const el=document.getElementById('dx-side');const M=modelOf(a);if(!el||!M)return;const cl=document.getElementById('dx-cl');const st=cl?cl.scrollTop:0;const k0=document.getElementById('dx-calc'),kt=k0?k0.scrollTop:0; /* 16/10 (lot C2) : le volet défile en entier */el.innerHTML=sideHTML(a,M,XS.canEdit);const cl2=document.getElementById('dx-cl');if(cl2)cl2.scrollTop=st;const k1=document.getElementById('dx-calc');if(k1&&kt)k1.scrollTop=kt;}
/* sélection d'une autre ligne : seul le calculateur change (la ventilation ne dépend pas de la sélection) */
function refreshCalc(a){const el=document.getElementById('dx-calc');const M=modelOf(a);if(!el||!M){refreshSide(a);return;}const t=document.createElement('div');t.innerHTML=calcHTML(a,M,XS.canEdit);const n=t.firstElementChild;if(n)el.replaceWith(n);
  const hasT=!!calcTarget(a,M);document.querySelectorAll('#dx-vent td.z').forEach(td=>td.classList.toggle('click',hasT&&XS.canEdit));}
let SIDE_WIRED=false;
function wireSide(){if(SIDE_WIRED)return;SIDE_WIRED=true;
  document.addEventListener('change',e=>{const t=e.target;if(!t||!t.dataset||t.dataset.dx===undefined||!t.closest('#dx-side'))return;const a=affOf(XS.num);const M=a&&modelOf(a);const CP=a&&compsOf(a);if(!M||!CP)return;const T=calcTarget(a,M);if(!T)return;const C=calcState(a,T,M);
    if(t.dataset.dx==='ck'){const k=t.dataset.k;const c=CP.by.get(k);if(t.checked&&c){const P=pointage(a,CP,M,(linkAt(a,T.sh,T.a)||{}).id);const rest=Math.max(0,c.qty-(P.byComp.get(k)||0));const q=parseQ(C.q,{qty:0});C.chk[k]=fmtIn(REP.defTake(c,T,q,rest)); /* 15/10 (lot R) : ligne au ml + composante par DN → la part de ses ml */}else delete C.chk[k];refreshSide(a);return;}
    if(t.dataset.dx==='wq'){C.wq=t.checked;return;}if(t.dataset.dx==='cq'||t.dataset.dx==='q'){refreshSide(a);return;}});
  document.addEventListener('input',e=>{const t=e.target;if(!t||!t.dataset||t.dataset.dx===undefined||!t.closest('#dx-side'))return;const a=affOf(XS.num);const M=a&&modelOf(a);const CP=a&&compsOf(a);if(!M||!CP)return;const T=calcTarget(a,M);
    if(t.dataset.dx==='cf'){XS.cfilter=t.value;clearTimeout(wireSide.t);wireSide.t=setTimeout(()=>{const el=document.getElementById('dx-calc');if(!el)return;const pos=t.selectionStart;refreshSide(a);const f=document.querySelector('#dx-calc [data-dx="cf"]');if(f){f.focus();try{f.setSelectionRange(pos,pos);}catch(x){}}},250);return;}
    if(!T)return;const C=calcState(a,T,M);if(t.dataset.dx==='q')C.q=t.value;else if(t.dataset.dx==='cq'){C.chk[t.dataset.k]=t.value;const c=CP.by.get(t.dataset.k);const b=document.querySelector(`#dx-calc b[data-amt="${CSS.escape(t.dataset.k)}"]`);if(b&&c)b.textContent=eur(parseQ(t.value,c)*c.puV,2);}
    const q=parseQ(C.q,{qty:0});const amt=calcSum(a,CP,C);const res=document.getElementById('dx-cres');if(res)res.innerHTML=calcResHTML(a,T,C,amt,q,q>0?amt/q:0,linkAt(a,T.sh,T.a),!XS.canEdit);});
  document.addEventListener('toggle',e=>{const d=e.target;if(!d||!d.dataset)return;if(d.dataset.dxz)XS.czone[d.dataset.dxz]=d.open;if(d.dataset.dxdet){if(String(d.open?1:0)===d.dataset.o)return;/* l'événement de la création (open déjà rendu) n'est pas un choix */d.dataset.o=d.open?'1':'0';XS.det[XS.num+'|'+d.dataset.dxdet]=d.open;if(d.open&&d.dataset.empty)rerender();}},true);
  document.addEventListener('keydown',e=>{if(e.key==='Escape'&&XS.full&&!document.querySelector('#modal.show')&&!XS.edit){XS.full=false;rerender();}});
  /* 14/10 : détail des prix unitaires — filtre au fil de la frappe, ouverture du panneau replié (dessiné à la demande) */
  document.addEventListener('input',e=>{const t=e.target;if(!t||!t.dataset||t.dataset.dxpu!=='f')return;const num=XS.num;if(!num)return;puSt(num).f=t.value;clearTimeout(wireSide.tp);wireSide.tp=setTimeout(()=>{const a=affOf(num);if(a)refreshPu(a);},200);});
  document.addEventListener('toggle',e=>{const d=e.target;if(!d||!d.dataset||d.dataset.dxpud===undefined)return;const num=XS.num;if(!num)return;XS.det[num+'|pu']=d.open;if(d.open&&d.dataset.empty){delete d.dataset.empty;const a=affOf(num);if(a)d.insertAdjacentHTML('beforeend',puDetailHTML(a,XS.canEdit));}},true);
  /* survol d'un lien : la ligne du DPGF et ses morceaux du tableau de ventilation s'allument ensemble */
  const hl=(doc,id,on)=>{doc.querySelectorAll('[data-lk]').forEach(el=>{if(el.dataset.lk===id)el.classList.toggle('dx-hl',on);});};
  document.addEventListener('mouseover',e=>{const el=e.target&&e.target.closest&&e.target.closest('[data-lk]');if(!el||!el.closest('#dx-card'))return;const id=el.dataset.lk;if(XS.hl===id)return;if(XS.hl){hl(document,XS.hl,false);if(popLive())hl(XS.pop.w.document,XS.hl,false);}XS.hl=id;hl(document,id,true);if(popLive())hl(XS.pop.w.document,id,true);});
  document.addEventListener('mouseout',e=>{const el=e.target&&e.target.closest&&e.target.closest('[data-lk]');if(!el||!XS.hl)return;const to=e.relatedTarget&&e.relatedTarget.closest&&e.relatedTarget.closest('[data-lk]');if(to&&to.dataset.lk===XS.hl)return;hl(document,XS.hl,false);if(popLive())hl(XS.pop.w.document,XS.hl,false);XS.hl=null;});}
const fmtIn=x=>String(+(+x).toFixed(3)).replace('.',',');
/* ═════════ 14 · ACTIONS (data-v="dx…|…", appelées par commerce.js) ═════════ */
export function dpgfXlAct(k,arg,arg2,a,ctx){if(!/^dx/.test(k))return false;XS.ctx=ctx||XS.ctx;const canEdit=!!(ctx&&ctx.canEdit);const M=modelOf(a);
  if(/^dxrp/.test(k))return REP.act(k,arg,arg2,a,canEdit,M); /* 15/10 (lot R) : calculateur à côté de la grille, « ⇶ Répartir au ml » */
  if(CL.act(k,arg,arg2,a,canEdit,M))return true; /* 16/10 (lot C2) : « ↦ Mettre » (aussi par type d'autocontrôle), « Mettre et ligne suivante », ◀ ▶, « Comme la ligne », sélections gardées */
  if(/^dxc3/.test(k))return SV.act(k,arg,arg2,a,canEdit,M); /* 16/10 après-midi (lot C3) : liste des changements à traiter, groupes repliables, bouton flottant */
  if(/^dxdk/.test(k))return RC.act(k,arg,arg2,a,canEdit,M); /* 16/10 nuit (lot DK) : donner sa part, lignes cochées, récap */
  if(/^dxdz/.test(k))return ZN.act(k,arg,arg2,a,canEdit,M); /* 17/10 (lot DZ) : reventiler, prendre les installations de toutes les zones, parts d'une sélection */
  switch(k){
    case 'dxsheet':{if(!M)return true;const S=M.sheets[+arg];if(S){XS.sh[a.num]=S.name;}rerender();return true;}
    case 'dxzoom':{if(!M)return true;const S=curSheet(a,M);const z=zoomOf(a,S);let i=0;ZOOMS.forEach((x,j)=>{if(Math.abs(x-z)<Math.abs(ZOOMS[i]-z))i=j;});i=Math.max(0,Math.min(ZOOMS.length-1,i+(+arg||0)));XS.zoom[a.num+'|'+S.name]=ZOOMS[i];rerender();return true;}
    case 'dxlay':XS.lay=arg==='side'?'side':'stack';try{localStorage.setItem('trace:dpgfxl:lay',XS.lay);}catch(e){}rerender();return true;
    case 'dxfull':XS.full=!XS.full;rerender();return true;
    case 'dxpop':openPopup(a);rerender();return true;
    case 'dxpopclose':{const P=XS.pop;XS.pop=null;try{P&&P.w&&P.w.close();}catch(e){}rerender();return true;}
    case 'dxexport':exportDossier(a).catch(e=>{console.warn(e);say('Export impossible : '+(e.message||e));});return true;
    case 'dxdetail':exportDetail(a).catch(e=>{console.warn(e);say('Détail impossible : '+(e.message||e));});return true;
    case 'dxpu':{XS.det[a.num+'|pu']=true;rerender();setTimeout(()=>{const el=document.getElementById('dx-pud');if(el){el.open=true;el.scrollIntoView({block:'start',behavior:'smooth'});}},80);return true;} /* 14/10 : le détail des prix unitaires se lit DANS l'appli */
    case 'dxpumode':puSt(a.num).mode=arg==='lignes'?'lignes':'comps';refreshPu(a);return true;
    case 'dxpuz':puSt(a.num).z=arg||'all';refreshPu(a);return true;
    case 'dxundo':case 'dxredo':{if(!canEdit)return true;const T0=M?calcTarget(a,M):null;const l0=T0?JSON.stringify(linkAt(a,T0.sh,T0.a)):null;if(dxUndo(a,k==='dxredo')){const a2=affOf(a.num);if(T0&&a2&&JSON.stringify(linkAt(a2,T0.sh,T0.a))!==l0)XS.calc[a.num]=null; /* 17/10 (lot DZ) : le lien de la ligne du calculateur a changé (↶ d'un « Mettre ») : ses cases repartent du lien rétabli */rerender();}return true;}
    case 'dxins':{if(!canEdit||!M)return true;const s=XS.sel[a.num];if(!s)return true;const b=selBox(s);const n=Math.min(20,b.r2-b.r1+1);const above=arg==='up';
      if(dxInsertRows(a,s.sh,above?b.r1:b.r2,n,above)){const nr=above?b.r1:b.r2+1;XS.sel[a.num]={sh:s.sh,r:nr,c:s.c,r2:nr+n-1,c2:s.c};say(n+' ligne'+(n>1?'s':'')+' insérée'+(n>1?'s':'')+' '+(above?'au-dessus':'sous la ligne '+b.r2)+' (formats et formules recopiés) — « ⬇ DPGF pour le dossier » la garde');}rerender();return true;}
    case 'dxdel':{if(!canEdit||!M)return true;const s=XS.sel[a.num];if(!s)return true;const b=selBox(s);const n=b.r2-b.r1+1;if(!confirm('Supprimer '+(n>1?'les lignes '+b.r1+' à '+b.r2:'la ligne '+b.r1)+' du DPGF ? (Ctrl+Z pour revenir)'))return true;
      if(dxDeleteRows(a,s.sh,b.r1,n)){XS.sel[a.num]={sh:s.sh,r:b.r1,c:s.c,r2:b.r1,c2:s.c};say(n+' ligne'+(n>1?'s':'')+' supprimée'+(n>1?'s':''));}rerender();return true;}
    case 'dxcalc':{if(!M)return true;const s=XS.sel[a.num];if(!s)return true;XS.free={num:a.num,sh:s.sh,a:addrOf(s.r,s.c)};XS.calc[a.num]=null;rerender();setTimeout(()=>REP.open(a.num),60);return true;} /* 15/10 (lot R) : à côté de la grille, sans défiler */
    case 'dxput':{if(!canEdit||!M)return true;const CP=compsOf(a);const T=calcTarget(a,M);if(!CP||!T)return true;const C=calcState(a,T,M);const q=parseQ(C.q,{qty:0});if(!(q>0)){say('Indique la quantité de la ligne');return true;}
      const comps=Object.keys(C.chk).map(k2=>{const c=CP.by.get(k2);return c?{k:k2,q:Math.round(parseQ(C.chk[k2],c)*1000)/1000}:null;}).filter(x=>x&&x.q>0).concat(REP.keepParts(linkAt(a,T.sh,T.a),CP));if(!comps.length){say('Coche au moins une composante');return true;}
      const amt=comps.reduce((s,x)=>s+x.q*CP.by.get(x.k).puV,0);const pu=r2(amt/q);const p=parseAddr(T.a);const vals=[{sh:T.sh,r:p.r,c:p.c,e:{v:pu}}];const qc=T.qa?qOfCell(M,T.sh,T.qa):null;let qfix=false;
      if(T.qa&&(qc===null||Math.abs(qc-q)>1e-9)){if(C.wq){const pq=parseAddr(T.qa);vals.push({sh:T.sh,r:pq.r,c:pq.c,e:{v:q}});}else qfix=true;}
      const D=a.dpgf||{};const old=linkAt(a,T.sh,T.a);const L={id:old?old.id:'L'+Date.now().toString(36)+Math.random().toString(36).slice(2,5),sh:T.sh,a:T.a,qa:T.qa||null,q,qfix,u:T.u||'',comps,pu,amt:r2(amt),v:CP.v,at:new Date().toISOString(),by:H.A&&H.A.userName?H.A.userName():'',col:old?old.col:nextCol(D)};
      dxWrite(a,vals,{liens:LL=>old?LL.map(x=>x.id===old.id?L:x):LL.concat([L])});XS.calc[a.num]=null;say((old?'Prix mis à jour':'Prix lié')+' : '+nb(pu,2)+' € dans '+T.a+' ('+comps.length+' composante'+(comps.length>1?'s':'')+', '+eur(amt)+')');rerender();return true;}
    case 'dxunlink':{if(!canEdit)return true;pushUndo(a);const D=Object.assign({},a.dpgf||{});D.liens=(D.liens||[]).filter(x=>x.id!==arg);H.affSet(a.num,{dpgf:D});XS.calc[a.num]=null;say('Lien retiré (le PU reste dans le DPGF)');rerender();return true;}
    case 'dxrelink':{if(!canEdit)return true;const n=dxApplyLinks(a,arg==='*'?null:[arg]);say(n?n+' prix lié'+(n>1?'s':'')+' mis à jour':'Rien à mettre à jour');rerender();return true;}
    case 'dxsugg':{const CP=compsOf(a);const T=M&&calcTarget(a,M);if(!CP||!T)return true;const C=calcState(a,T,M);const P=pointage(a,CP,M,(linkAt(a,T.sh,T.a)||{}).id);CP.list.filter(c=>c.lab==='DN '+arg&&['soudure','manchons','autoctrl'].includes(c.p)).forEach(c=>{if(C.chk[c.k]===undefined)C.chk[c.k]=fmtIn(Math.max(0,c.qty-(P.byComp.get(c.k)||0)));});refreshSide(a);return true;}
    case 'dxcclr':{const T=M&&calcTarget(a,M);if(T){const C=calcState(a,T,M);C.chk={};}refreshSide(a);return true;}
    case 'dxvpick':{const CP=compsOf(a);const T=M&&calcTarget(a,M);if(!CP||!T){say('Touche d\'abord une ligne du DPGF : les composantes de cette case iront dans son prix');return true;}const C=calcState(a,T,M);const P=pointage(a,CP,M,(linkAt(a,T.sh,T.a)||{}).id);const zk=arg,pk=arg2;if(zk==='inst'&&ZN.vpick(a,M,CP,T,C,pk)){refreshSide(a);return true;} /* 17/10 (lot DZ) : la part de la zone de la ligne */
      const L=CP.list.filter(c=>(c.z<0?'inst':'z'+c.z)===zk&&c.p===pk);const allOn=L.every(c=>C.chk[c.k]!==undefined);L.forEach(c=>{if(allOn)delete C.chk[c.k];else if(C.chk[c.k]===undefined)C.chk[c.k]=fmtIn(Math.max(0,c.qty-(P.byComp.get(c.k)||0)));});XS.czone[zk]=true;refreshSide(a);return true;}
    case 'dxgo':{if(!M)return true;const S=M.S(arg);const p=parseAddr(arg2);if(!S||!p)return true;XS.sh[a.num]=S.name;XS.sel[a.num]={sh:S.name,r:p.r,c:p.c,r2:p.r,c2:p.c};const L=layOf(M,S,zoomOf(a,S));const ri=L.rIdx.get(p.r);if(ri!==undefined)XS.scroll[a.num+'|'+S.name]={top:Math.max(0,L.VR[ri].y-L.FH-80),left:(XS.scroll[a.num+'|'+S.name]||{}).left||0};rerender();return true;}
    case 'dxrevert':{if(!canEdit)return true;dxRevert(a,arg,arg2);rerender();return true;}
    case 'dxmods':XS.showMods=!XS.showMods;refreshSide(a);return true;}
  return false;}
/* ═════════ 15 · ⬇ DPGF POUR LE DOSSIER : le fichier du client, seules les cellules changées ═════════ */
const MIME_X='application/vnd.openxmlformats-officedocument.spreadsheetml.sheet';
function saveBlob(blob,name){const u=URL.createObjectURL(blob);const el=document.createElement('a');el.href=u;el.download=name;document.body.appendChild(el);el.click();setTimeout(()=>{URL.revokeObjectURL(u);el.remove();},4000);}
const exportVal=v=>v===undefined?null:(typeof v==='number'&&!isFinite(v)?{e:'#NUM!'}:v);
const vX=v=>{if(v===null||v===undefined)return {t:'',v:''};if(typeof v==='number')return {t:'',v:`<v>${String(v)}</v>`};if(typeof v==='boolean')return {t:'b',v:`<v>${v?1:0}</v>`};if(isErr(v))return {t:'e',v:`<v>${xmlEsc(v.e)}</v>`};return {t:'str',v:`<v>${xmlEsc(String(v))}</v>`};};
function cellXmlRegen(M,S,c){const ad=addrOf(c.r,c.c);const s=c.s!==undefined&&c.s!==null?` s="${c.s}"`:'';const k=cellKey(c.r,c.c);
  if(c.f){const v=S._uns.has(k)?c.v:val(M,S,c.r,c.c);const x=vX(exportVal(v));const fa=c.ft==='array'&&c.fref?` t="array" ref="${c.fref}"`:'';return `<c r="${ad}"${s}${x.t?` t="${x.t}"`:''}><f${fa}>${xmlEsc(c.f)}</f>${x.v}</c>`;}
  const v=c.v;if(v===null||v===undefined||v==='')return s?`<c r="${ad}"${s}/>`:'';
  if(typeof v==='string'){if(c.ssi!==undefined&&!c.ed&&M.book.SS[c.ssi]===v)return `<c r="${ad}"${s} t="s"><v>${c.ssi}</v></c>`;return `<c r="${ad}"${s} t="inlineStr"><is><t xml:space="preserve">${xmlEsc(v)}</t></is></c>`;}
  const x=vX(v);return `<c r="${ad}"${s}${x.t?` t="${x.t}"`:''}>${x.v}</c>`;}
const xmlUn=s=>String(s||'').replace(/&lt;/g,'<').replace(/&gt;/g,'>').replace(/&quot;/g,'"').replace(/&apos;/g,"'").replace(/&amp;/g,'&');
function shiftSq(sq,sh,op){const n=op.op==='ins'?op.n:-op.n;return String(sq).split(/\s+/).filter(Boolean).map(x=>{const f=shiftRowsFormula(x,sh,sh,op.at,n,{});return /#REF!/.test(f)?null:f;}).filter(Boolean).join(' ');}
function shiftSheetParts(xml,sh,op){const n=op.op==='ins'?op.n:-op.n;const fx=f=>shiftRowsFormula(f,sh,sh,op.at,n,{grow:!!op.grow});
  xml=xml.replace(/(<(?:conditionalFormatting|dataValidation|selection|protectedRange|ignoredError)\b[^>]*?\ssqref=")([^"]*)(")/g,(m,p,sq,q)=>p+(shiftSq(sq,sh,op)||'A1')+q);
  xml=xml.replace(/(<(?:hyperlink|autoFilter)\b[^>]*?\sref=")([^"]*)(")/g,(m,p,r,q)=>p+(shiftSq(r,sh,op)||r)+q);
  xml=xml.replace(/<(formula|formula1|formula2)>([\s\S]*?)<\/\1>/g,(m,t,f)=>`<${t}>${xmlEsc(fx(xmlUn(f)))}</${t}>`);
  xml=xml.replace(/(<rowBreaks\b[^>]*>)([\s\S]*?)(<\/rowBreaks>)/,(m,a1,body,z1)=>a1+body.replace(/(<brk\b[^>]*\sid=")(\d+)(")/g,(m2,p,id,q)=>{const r=+id;const nr=op.op==='ins'?(r>=op.at?r+n:r):(r<op.at?r:r>=op.at-n?r+n:op.at-1);return p+Math.max(0,nr)+q;})+z1);
  return xml;}
const rowShift=(op,r)=>{const n=op.op==='ins'?op.n:-op.n;return op.op==='ins'?(r>=op.at?r+n:r):(r<op.at?r:(r>=op.at-n?r+n:op.at));};
function regenSheet(M,S,S0,ops){let xml=S0.xml;const rows=new Set();S.cells.forEach(c=>rows.add(c.r));S.rows.forEach((P,r)=>rows.add(r));const byRow=new Map();S.cells.forEach(c=>{if(!byRow.has(c.r))byRow.set(c.r,[]);byRow.get(c.r).push(c);});
  let sd='';[...rows].sort((x,y)=>x-y).forEach(r=>{const P=S.rows.get(r);const cs=(byRow.get(r)||[]).sort((x,y)=>x.c-y.c).map(c=>cellXmlRegen(M,S,c)).join('');const at=P?(P.attrs||''):'';if(!cs&&!at.trim())return;sd+=`<row r="${r}"${at}>${cs}</row>`;});
  xml=xml.replace(/<sheetData\b[^>]*>[\s\S]*?<\/sheetData>|<sheetData\b[^>]*\/>/,()=>'<sheetData>'+sd+'</sheetData>');
  const mg=S.merges.map(m=>`<mergeCell ref="${addrOf(m.r1,m.c1)}:${addrOf(m.r2,m.c2)}"/>`).join('');xml=xml.replace(/<mergeCells\b[^>]*>[\s\S]*?<\/mergeCells>|<mergeCells\b[^>]*\/>/,()=>S.merges.length?`<mergeCells count="${S.merges.length}">${mg}</mergeCells>`:'');
  xml=xml.replace(/(<dimension\b[^>]*\sref=")([^"]*)(")/,(m,p,r,q)=>p+'A1:'+addrOf(Math.max(1,S.maxR),Math.max(1,S.maxC))+q);
  ops.forEach(op=>{xml=shiftSheetParts(xml,S.name,op);});return xml;}
/* parties liées à une feuille décalée : tableaux, dessins (images, logos), commentaires */
async function shiftLinked(book,S0,ops,rep){const rp=S0.path.replace(/worksheets\/(sheet\d+\.xml)$/,'worksheets/_rels/$1.rels');const Z=book.Z;if(!Z[rp])return;const rx=await inflate(Z[rp]);
  const tg=(rx.match(/<Relationship\b[^>]*>/g)||[]).map(t=>{const m=t.match(/Target="([^"]*)"/);return m?m[1]:null;}).filter(Boolean).map(t=>t.startsWith('/')?t.slice(1):('xl/'+t.replace(/^\.\.\//,'')).replace(/xl\/worksheets\/\.\.\//,'xl/'));
  for(const p of tg){if(!Z[p])continue;let x=rep[p]||await inflate(Z[p]);const o=x;
    if(/\/tables\//.test(p))ops.forEach(op=>{x=x.replace(/(<(?:table|autoFilter)\b[^>]*\sref=")([^"]*)(")/g,(m,a1,r,b1)=>a1+(shiftSq(r,S0.name,op)||r)+b1);});
    else if(/\/drawings\/drawing/.test(p))ops.forEach(op=>{x=x.replace(/(<xdr:(?:from|to)>[\s\S]*?<xdr:row>)(\d+)(<\/xdr:row>)/g,(m,a1,r,b1)=>a1+(rowShift(op,+r+1)-1)+b1);});
    else if(/\/comments/.test(p)||/threadedComment/.test(p))ops.forEach(op=>{x=x.replace(/(<(?:comment|threadedComment)\b[^>]*\sref=")([^"]*)(")/g,(m,a1,r,b1)=>a1+(shiftSq(r,S0.name,op)||r)+b1);});
    else if(/vmlDrawing/.test(p))ops.forEach(op=>{x=x.replace(/(<x:Row>)(\d+)(<\/x:Row>)/g,(m,a1,r,b1)=>a1+(rowShift(op,+r+1)-1)+b1);});
    if(x!==o)rep[p]=x;}}
function calcPrOn(wx){if(/<calcPr\b/.test(wx))return /fullCalcOnLoad=/.test(wx)?wx.replace(/fullCalcOnLoad="[^"]*"/,'fullCalcOnLoad="1"'):wx.replace(/<calcPr\b/,'<calcPr fullCalcOnLoad="1"');
  /* à sa place dans le schéma : après sheets / functionGroups / externalReferences / definedNames */let pos=-1;['</sheets>','</functionGroups>','</externalReferences>','</definedNames>'].forEach(t=>{const i=wx.lastIndexOf(t);if(i>=0)pos=Math.max(pos,i+t.length);});
  return pos<0?wx.replace(/<\/workbook>/,'<calcPr fullCalcOnLoad="1"/></workbook>'):wx.slice(0,pos)+'<calcPr fullCalcOnLoad="1"/>'+wx.slice(pos);}
export async function buildDossier(a){const B=await bookReady(a);if(!B||B.st!=='ok')throw new Error('fichier du client absent de cet appareil');const M=modelOf(a);warm(M);const book=B.book;const rep={};const ops=M.ops||[];
  for(const S of M.sheets){const S0=book.sheets[S.i];if(!S0)continue;const so=ops.filter(o=>up(o.sh)===up(S.name));
    if(so.length){rep[S.path]=regenSheet(M,S,S0,so);await shiftLinked(book,S0,so,rep);continue;}
    const changes=new Map();const groups=new Set();
    S.cells.forEach((cell,k)=>{const ad=addrOf(cell.r,cell.c);const base=S0.cells.get(k);
      if(cell.ed){if(base&&base.ft==='shared')groups.add(base.si);if(cell.f){const v=val(M,S,cell.r,cell.c);changes.set(ad,{k:'f',f:cell.f,v:S._uns.has(k)?null:exportVal(v)});}else changes.set(ad,{k:isEmpty(cell.v)?'clear':'val',v:cell.v});return;}
      if(!cell.f)return;const uns=S._uns.has(k);if(M.fxChanged.has(up(S.name)+'!'+k)){if(base&&base.ft==='shared')groups.add(base.si);changes.set(ad,{k:'f',f:cell.f,v:uns?(base?base.v:null):exportVal(val(M,S,cell.r,cell.c))});return;}
      if(uns)return;const v=val(M,S,cell.r,cell.c);if(!sameV(base?base.v:null,v))changes.set(ad,{k:'cache',f:cell.f,v:exportVal(v)});});
    groups.forEach(si=>{S0.cells.forEach((c0,k)=>{if(c0.ft!=='shared'||c0.si!==si)return;const ad=addrOf(c0.r,c0.c);const ch=changes.get(ad);if(ch&&ch.k!=='cache')return;const cell=S.cells.get(k);if(!cell||!cell.f)return;changes.set(ad,{k:'unshare',f:cell.f,v:S._uns.has(k)?c0.v:exportVal(val(M,S,c0.r,c0.c))});});});
    if(changes.size)rep[S.path]=patchSheetXml(S0.xml,changes);}
  let wx=calcPrOn(book.wbXml);if(ops.length){let i=0;wx=wx.replace(/(<definedName\b[^>]*>)([\s\S]*?)(<\/definedName>)/g,(m,p,body,q)=>{const nm=M.names[i++];return nm?p+xmlEsc(nm.ref)+q:m;});}rep['xl/workbook.xml']=wx;
  if(Object.keys(rep).some(k=>/worksheets\//.test(k)))await dropCalcChain(book.Z,rep);
  const bytes=await rezip(book.Z,rep);const D=a.dpgf||{};const name=String(D.fichier||B.name||'DPGF.xlsx').replace(/\.xlsx$/i,'')+'_SCR.xlsx';return {bytes,name,changed:Object.keys(rep).length};}
/* prix liés qui ne correspondent plus au chiffrage (ou à la quantité) */
export function staleCount(a){const M=modelOf(a);const CP=compsOf(a);if(!M||!CP)return 0;return ((a.dpgf||{}).liens||[]).filter(L=>linkNow(L,CP,M).stale).length;}
export async function exportDossier(a){const B=await bookReady(a);if(!B||B.st!=='ok'){say('Le fichier Excel du client n\'est pas sur cet appareil : réimporte-le');return;}
  const ns=staleCount(a);if(ns&&!confirm(ns+' prix lié'+(ns>1?'s ne correspondent':' ne correspond')+' plus au chiffrage (« ↻ Appliquer » dans la ventilation). Exporter quand même avec les PU actuels du DPGF ?'))return;const o=await buildDossier(a);saveBlob(new Blob([o.bytes],{type:MIME_X}),o.name);
  const M=modelOf(a);let n=0;M.sheets.forEach(S=>S.cells.forEach(c=>{if(c.ed)n++;}));const nops=(((a.dpgf||{}).xl||{}).ops||[]).length;say('⬇ '+o.name+' : le fichier du client, '+n+' cellule'+(n>1?'s':'')+' changée'+(n>1?'s':'')+(nops?' · lignes insérées / supprimées':'')+' — formules gardées, recalcul à l\'ouverture');}
/* ═════════ 16 · ⬇ DÉTAIL UNITÉ : tous nos prix unitaires (le recours si le DPGF est trop dur à remplir) ═════════ */
export function detailSheets(a){const CP=compsOf(a);if(!CP)return null;const C=CP.C;const coef=CP.coef;const cells={};const merges=[];const H2={};let r=1;const put=(ad,v,s,f)=>{cells[ad]=f?{f,s}:{v,s};};
  put('A1','Détail des prix unitaires — '+(a.num||'')+' · '+(a.nom||'')+(a.client?' · '+a.client:''),'title');merges.push('A1:M1');H2[1]=26;
  put('A2','Coefficient de vente = 1 − (marge + RCFA) · prix de vente = prix d\'achat ÷ coefficient','note');merges.push('A2:F2');put('G2',Math.round(coef*1e6)/1e6,'coef');put('H2','chiffrage v'+(a.chiffrageV||1)+' · '+new Date().toLocaleDateString('fr-FR'),'note');merges.push('H2:M2');
  r=4;const hd=['Zone','Poste','Composante','Unité','Qté','PU achat','PU vente','Total achat','Total vente','dont MO (achat)','Fourn. (achat)','S.-trait. (achat)','Loc. / frais (achat)'];hd.forEach((h,i)=>put(colName(i+1)+r,h,'hdr'));H2[r]=30;r++;
  const subs=[];const groups=CP.zones.map(z=>({nom:z.nom,ml:z.ml,list:CP.list.filter(c=>c.z===z.i)})).concat(CP.inst?[{nom:'Installations',ml:C.ml||0,list:CP.list.filter(c=>c.z<0)}]:[]);
  groups.forEach(g=>{if(!g.list.length)return;put('A'+r,g.nom+(g.ml?' · '+nb(g.ml)+' ml':''),'grp');merges.push('A'+r+':M'+r);r++;const r0=r;
    g.list.forEach(c=>{put('A'+r,g.nom,'txt');put('B'+r,c.pl,'txt');put('C'+r,c.lab||(c.u==='ml'?'au ml de la zone':'forfait'),'txt');put('D'+r,c.u,'ctr');put('E'+r,Math.round(c.qty*1000)/1000,'num');put('F'+r,Math.round(c.puA*10000)/10000,'eur');put('G'+r,null,'eur','F'+r+'/$G$2');put('H'+r,null,'eur','E'+r+'*F'+r);put('I'+r,null,'eur','E'+r+'*G'+r);
      put('J'+r,r2(c.mo),'eur');put('K'+r,r2(c.fo),'eur');put('L'+r,r2(c.st),'eur');put('M'+r,r2(c.loc),'eur');r++;});
    put('A'+r,'Sous-total '+g.nom,'subt');merges.push('A'+r+':G'+r);put('H'+r,null,'subte','SUM(H'+r0+':H'+(r-1)+')');put('I'+r,null,'subte','SUM(I'+r0+':I'+(r-1)+')');['J','K','L','M'].forEach(cl=>put(cl+r,null,'subte','SUM('+cl+r0+':'+cl+(r-1)+')'));subs.push(r);r++;
    if(g.ml){put('A'+r,'Prix au ml de '+g.nom+' (vente, tout compris)','note');merges.push('A'+r+':H'+r);put('I'+r,null,'subte','I'+(r-1)+'/'+g.ml);r++;}r++;});
  put('A'+r,'TOTAL','tot');merges.push('A'+r+':G'+r);['H','I','J','K','L','M'].forEach(cl=>put(cl+r,null,'tote',subs.map(x=>cl+x).join('+')||'0'));r++;
  put('A'+r,'Contrôle : prix de vente du chiffrage','note');merges.push('A'+r+':H'+r);put('I'+r,r2(C.vente),'eur');
  const s1={name:'Prix unitaires',cells,merges,widths:[16,30,26,8,10,12,12,13,13,12,12,12,12],heights:H2};
  /* postes × zones */const c2={};const m2=[];const cols=CP.zones.map(z=>({k:'z'+z.i,nom:z.nom})).concat(CP.inst?[{k:'inst',nom:'Installations'}]:[]);const p2=(ad,v,s,f)=>{c2[ad]=f?{f,s}:{v,s};};
  p2('A1','Notre prix par poste et par zone (prix de vente HT)','title');m2.push('A1:'+colName(cols.length*2+3)+'1');let rr=3;p2('A'+rr,'Poste','hdr');cols.forEach((cl,i)=>{p2(colName(2+i*2)+rr,cl.nom+' · achat','hdr');p2(colName(3+i*2)+rr,cl.nom+' · vente','hdr');});p2(colName(2+cols.length*2)+rr,'Total achat','hdr');p2(colName(3+cols.length*2)+rr,'Total vente','hdr');rr++;const rr0=rr;
  CP.postes.forEach(P=>{const L=cols.map(cl=>CP.list.filter(c=>(c.z<0?'inst':'z'+c.z)===cl.k&&c.p===P.k));if(!L.some(x=>x.length))return;p2('A'+rr,P.label,'txt');L.forEach((x,i)=>{p2(colName(2+i*2)+rr,r2(x.reduce((s,c)=>s+c.amtA,0)),'eur');p2(colName(3+i*2)+rr,r2(x.reduce((s,c)=>s+c.amtV,0)),'eur');});
    p2(colName(2+cols.length*2)+rr,null,'eur',cols.map((c,i)=>colName(2+i*2)+rr).join('+'));p2(colName(3+cols.length*2)+rr,null,'eur',cols.map((c,i)=>colName(3+i*2)+rr).join('+'));rr++;});
  p2('A'+rr,'Total','tot');for(let i=0;i<cols.length*2+2;i++){const cl=colName(2+i);p2(cl+rr,null,'tote','SUM('+cl+rr0+':'+cl+(rr-1)+')');}
  const s2={name:'Postes × zones',cells:c2,merges:m2,widths:[30].concat(Array(cols.length*2+2).fill(14)),heights:{1:24,3:30}};
  /* lignes du DPGF pointées */const M=modelOf(a);const D=a.dpgf||{};const c3={};const p3=(ad,v,s,f)=>{c3[ad]=f?{f,s}:{v,s};};p3('A1','Lignes du DPGF reliées à notre chiffrage','title');let r3=3;['Cellule','N°','Désignation','Quantité','PU','Montant','Composantes (quantité prise × PU de vente)'].forEach((h,i)=>p3(colName(i+1)+r3,h,'hdr'));r3++;
  (D.liens||[]).forEach(L=>{const X=linkNow(L,CP,M);const p=parseAddr(L.a);const ln=p?(D.lignes||[]).find(l=>!l.section&&l.row===p.r):null;p3('A'+r3,(L.sh&&M&&M.sheets.length>1?L.sh+'!':'')+L.a,'txt');p3('B'+r3,ln?ln.n:'','txt');p3('C'+r3,ln?ln.des:'','wrap');p3('D'+r3,X.q,'num');p3('E'+r3,X.pur,'eur');p3('F'+r3,null,'eur','D'+r3+'*E'+r3);
    p3('G'+r3,(L.comps||[]).map(x=>{const c=CP.by.get(x.k);return c?(c.zn+' › '+compName(c)+(x.sub?CL.cmpSubTxt(CP,x,c):' : '+fmtQ(x.q)+' '+c.u+' × '+nb(c.puV,2)+' €')):'(composante disparue)';}).join(' ; '),'wrap');r3++;});
  if(!(D.liens||[]).length)p3('A'+r3,'Aucune ligne reliée pour l\'instant (calculateur du DPGF).','note');
  const s3={name:'DPGF · lignes reliées',cells:c3,merges:['A1:G1'],widths:[12,8,46,11,12,13,80],heights:{1:24}};
  const EUR='#,##0.00\\ "€"';const ST={title:{b:true,sz:13,color:'FFFFFF',fill:'1F3864'},note:{i:true,color:'555555'},coef:{b:true,fmt:'0.0000',fill:'FFF2CC',border:true},hdr:{b:true,fill:'D9D9D9',border:true,h:'center',wrap:true},grp:{b:true,fill:'E2EFDA',border:true},txt:{border:true},wrap:{border:true,wrap:true},ctr:{border:true,h:'center'},num:{border:true,fmt:'#,##0.###'},eur:{border:true,fmt:EUR},subt:{b:true,i:true,border:true,fill:'F2F2F2'},subte:{b:true,border:true,fill:'F2F2F2',fmt:EUR},tot:{b:true,border:true,fill:'DDEBF7'},tote:{b:true,border:true,fill:'DDEBF7',fmt:EUR}};
  return {sheets:[s1,s2,s3],styles:ST};}
export async function exportDetail(a){const X=detailSheets(a);if(!X){say('Pas de chiffrage complet : rien à détailler');return;}const bytes=await makeStyledXlsx(X.sheets,X.styles);saveBlob(new Blob([bytes],{type:MIME_X}),'Detail_prix_unitaires_'+String(a.num).replace(/[^A-Za-z0-9-]/g,'_')+'.xlsx');say('⬇ Détail des prix unitaires : toutes nos composantes, achat et vente');}
/* ═════════ 16b · 🔎 DÉTAIL DES PRIX UNITAIRES — dans l'appli ═════════
   Ethan (14/10) : « Plus un détail des prix unitaires » → « c'est sur l'appli, pas à exporter ». Deux lectures, sans quitter l'étape DPGF :
   · par ligne du DPGF : le PU de la ligne décomposé (main-d'œuvre, fourniture, sous-traitance, location / frais — au prix de vente) et les composantes qui le font
     (quantité prise × PU de vente) ; une ligne non reliée au chiffrage le dit (🧮 Calculer ce prix pour la relier) ;
   · nos prix unitaires : chaque composante du chiffrage (zone › poste › DN) — quantité, PU d'achat, PU de vente, total, décomposition du PU de vente.
   Filtre par zone et par texte (« DN 100 », « soudure »…). Le classeur Excel du lot C reste accessible depuis le panneau (« ⬇ Excel »). */
const PUS={};const puSt=num=>PUS[num]||(PUS[num]={mode:null,z:'all',f:''});
const normF=x=>String(x||'').normalize('NFD').replace(/[̀-ͯ]/g,'').toLowerCase();
const e2=x=>Math.abs(x)<0.005?'':nb(x,2);
export function puDetailBlock(a,canEdit){ensureCss(document);wireSide();XS.num=a.num;XS.canEdit=canEdit;XS.vva=a&&a._vview?a:null;const open=!!XS.det[a.num+'|pu'];const CP=compsOf(a);const D=a.dpgf||{};const nL=(D.liens||[]).length;
  const sum=CP?`${CP.list.length} composante${CP.list.length>1?'s':''}${nL?' · '+nL+' ligne'+(nL>1?'s':'')+' du DPGF reliée'+(nL>1?'s':''):''}`:'chiffrage incomplet';
  return `<details class="dx-pud" id="dx-pud" data-dxpud="1"${open?' open':''}${open?'':' data-empty="1"'}><summary>🔎 Détail des prix unitaires <span class="hint">· ${sum}</span></summary>${open?puDetailHTML(a,canEdit):''}</details>`;}
export function puDetailHTML(a,canEdit){ensureCss(document);wireSide();const CP=compsOf(a);const st=puSt(a.num);const D=a.dpgf||{};const liens=D.liens||[];
  const xlsBtn=CP?`<button class="btn sm" data-act="af" data-v="dxdetail|" style="margin-left:auto" title="Le même détail dans un classeur Excel (3 feuilles), si tu en as besoin hors de l'appli">⬇ Excel</button>`:'';
  const head=`<h4>🔎 Détail des prix unitaires <span class="hint">· prix de vente HT${CP&&CP.v?' · chiffrage v'+CP.v:''}</span>${xlsBtn}</h4>`;
  if(!CP)return `<div class="dx-panel dx-pu" id="dx-pu">${head}<div class="eq-s">Pas encore de chiffrage complet (zones, postes) : le détail s'affichera ici.</div></div>`;
  let M=null;try{M=modelOf(a);}catch(e){M=null;}const coef=CP.coef;const narrow=typeof window!=='undefined'&&(window.innerWidth||1000)<640; /* téléphone : 4 colonnes, la décomposition en sous-ligne */const spl=(mo,fo,stt,loc)=>[['MO',mo],['Fourn.',fo],['S.-trait.',stt],['Loc. / frais',loc]].filter(x=>Math.abs(x[1])>=0.005).map(x=>x[0]+' '+nb(x[1],2)).join(' · ');const lines=(D.lignes||[]).filter(l=>!l.section);const mode=st.mode||(liens.length?'lignes':'comps');
  const tabs=`<div class="dx-pum"><button class="btn sm${mode==='lignes'?' on':''}" data-act="af" data-v="dxpumode|lignes">Par ligne du DPGF · ${lines.length}</button><button class="btn sm${mode==='comps'?' on':''}" data-act="af" data-v="dxpumode|comps">Nos prix unitaires · ${CP.list.length}</button></div>`;
  const groups=CP.zones.map(z=>({k:'z'+z.i,nom:z.nom,ml:z.ml,list:CP.list.filter(c=>c.z===z.i)})).concat(CP.inst?[{k:'inst',nom:'Installations',ml:0,list:CP.list.filter(c=>c.z<0)}]:[]).filter(g=>g.list.length);
  const f=normF(st.f).trim();const fWords=f?f.split(/\s+/):[];const hit=txt=>!fWords.length||fWords.every(w=>normF(txt).includes(w));
  const flt=`<div class="dx-puf">${mode==='comps'?[['all','Toutes les zones']].concat(groups.map(g=>[g.k,g.nom])).map(([k,l])=>`<button class="chip${st.z===k?' on':''}" data-act="af" data-v="dxpuz|${esc(k)}">${esc(l)}</button>`).join(''):''}<input class="f" data-dxpu="f" value="${esc(st.f)}" placeholder="Filtrer : DN 100, soudure, épreuve…" aria-label="Filtrer le détail des prix unitaires"></div>`;
  let body='';
  if(mode==='lignes'){
    if(!lines.length)body='<div class="eq-s">Pas encore de DPGF importée : bascule sur « Nos prix unitaires ».</div>';
    else{const shName=M?dpSheetName(a,M):(D.sheetName||'');const lkOf=l=>l.row?liens.find(L=>(!shName||!L.sh||up(L.sh)===up(shName))&&parseAddr(L.a)&&parseAddr(L.a).r===l.row)||null:null;
      let rows='';let nShow=0,nLk=0,T=0,TL=0;
      lines.forEach(l=>{const L=lkOf(l);const q=+l.qte||0;const pu=+l.pu||0;let X=null;let cmp='';
        if(L){X=linkNow(L,CP,M);cmp=(L.comps||[]).map(x=>{const c=CP.by.get(x.k);return c?`<i>${x.rep?'⇶ ':''}${esc(c.zn)} › ${esc(compName(c))}${x.sub?CL.cmpSub(CP,x,c):` : ${fmtQ(+x.q||0)} ${esc(c.u)} × ${nb(c.puV,2)} € = ${eur(+x.q*c.puV,2)}`}</i>`:'<i>(composante disparue du chiffrage)</i>';}).join('');}
        const txt=(l.n||'')+' '+(l.des||'')+' '+(L?(L.comps||[]).map(x=>{const c=CP.by.get(x.k);return c?c.zn+' '+compName(c):'';}).join(' '):'');if(!hit(txt))return;nShow++;T+=pu*q;
        const col=L?LK_COLS[L.col%LK_COLS.length]:null;const n=L?liens.indexOf(L)+1:0;
        if(X&&X.q>0){nLk++;TL+=pu*q;const k=1/X.q/coef;const mo=X.mo*k,fo=X.fo*k,stt=X.st*k,loc=X.loc*k;const oth=X.pu-(mo+fo+stt+loc);
          const stl=X.stale?`<span class="sub" style="color:#b45309">↻ ${nb(X.pur,2)} au chiffrage</span>`:'';
          rows+=narrow?`<tr data-lk="${esc(L.id)}"><td class="l"><span class="dx-lkh" style="background:${col}">${n}</span> <b>${esc(l.n||'')}</b> ${esc(String(l.des||'').slice(0,70))}<span class="sub">dont ${spl(mo,fo,stt,loc)}${Math.abs(oth)>=0.01?' · autres '+nb(oth,2):''}</span><span class="cmp">${cmp}</span></td><td>${fmtQ(q)} ${esc(l.u||'')}</td><td class="pv">${nb(pu,2)}${stl}</td><td>${eur(pu*q)}</td></tr>`
            :`<tr data-lk="${esc(L.id)}"><td class="l"><span class="dx-lkh" style="background:${col}">${n}</span> <b>${esc(l.n||'')}</b> ${esc(String(l.des||'').slice(0,90))}<span class="cmp">${cmp}</span></td><td>${esc(l.u||'')}</td><td>${fmtQ(q)}</td><td class="pv">${nb(pu,2)}${stl}</td><td class="sp">${e2(mo)}</td><td class="sp">${e2(fo)}</td><td class="sp">${e2(stt)}</td><td class="sp">${e2(loc)}${Math.abs(oth)>=0.01?`<span class="sub">autres ${nb(oth,2)}</span>`:''}</td><td>${eur(pu*q)}</td></tr>`;}
        else rows+=narrow?`<tr class="nl"><td class="l"><b>${esc(l.n||'')}</b> ${esc(String(l.des||'').slice(0,70))}<span class="sub">${pu?'PU saisi : pas relié au chiffrage':'sans prix'}</span></td><td>${fmtQ(q)} ${esc(l.u||'')}</td><td>${pu?nb(pu,2):'—'}</td><td>${pu?eur(pu*q):'—'}</td></tr>`
          :`<tr class="nl"><td class="l"><b>${esc(l.n||'')}</b> ${esc(String(l.des||'').slice(0,90))}<span class="sub">${pu?'PU saisi : pas relié au chiffrage':'sans prix'}</span></td><td>${esc(l.u||'')}</td><td>${fmtQ(q)}</td><td>${pu?nb(pu,2):'—'}</td><td class="sp dim" colspan="4">—</td><td>${pu?eur(pu*q):'—'}</td></tr>`;});
      body=`<div class="dx-puk"><span>${nLk} ligne${nLk>1?'s':''} reliée${nLk>1?'s':''} (décomposée${nLk>1?'s':''}) sur ${lines.length}</span><span>total du DPGF <b>${eur(T)}</b>${f?' (lignes filtrées)':''}</span><span>dont relié <b>${eur(TL)}</b></span></div>
        <div style="overflow:auto;max-height:70vh;border:1px solid #eee;border-radius:8px"><table class="dx-put"><thead><tr>${narrow?'<th class="l">Ligne du DPGF · décomposition du PU</th><th>Qté</th><th>PU HT</th><th>Total HT</th>':'<th class="l">Ligne du DPGF · composantes (quantité × PU de vente)</th><th>U</th><th>Qté</th><th>PU HT</th><th>dont MO</th><th>Fourn.</th><th>S.-trait.</th><th>Loc. / frais</th><th>Total HT</th>'}</tr></thead><tbody>${rows||`<tr><td class="l" colspan="${narrow?4:9}">Aucune ligne ne correspond au filtre.</td></tr>`}</tbody></table></div>
        <div class="hint" style="margin-top:4px">Décomposition au prix de vente, par unité de la ligne : la part de main-d'œuvre, de fourniture, de sous-traitance et de location / frais des composantes reliées.${M&&canEdit?' Une ligne non reliée se décompose dès qu\'elle est calculée : touche son PU dans la grille (le calculateur s\'ouvre), coche ce qu\'elle comprend, « ↦ Mettre ».':''}</div>`;}}
  else{let rows='';let TV=0,TA=0,n=0;const gsel=groups.filter(g=>st.z==='all'||st.z===g.k);
    gsel.forEach(g=>{const L=g.list.filter(c=>hit(c.zn+' '+c.pl+' '+(c.lab||'')+' '+(c.g||'')));if(!L.length)return;let gv=0,ga=0;
      rows+=`<tr class="zg"><td class="l" colspan="${narrow?3:11}">${esc(g.nom)}${g.ml?' · '+nb(g.ml)+' ml':''}</td></tr>`;
      L.forEach(c=>{n++;gv+=c.amtV;ga+=c.amtA;const k=c.qty?1/c.qty/coef:0;
        const lab=esc(c.lab||(c.u==='ml'?'au ml de la zone':'forfait'));
        rows+=narrow?`<tr><td class="l">${esc(c.pl)}<span class="sub">${lab} · ${fmtQ(c.qty)} ${esc(c.u)}${spl(c.mo*k,c.fo*k,c.st*k,c.loc*k)?' · dont '+spl(c.mo*k,c.fo*k,c.st*k,c.loc*k):''}</span></td><td class="pv">${nb(c.puV,2)}<span class="sub nw">achat ${nb(c.puA,2)}</span></td><td>${eur(c.amtV)}</td></tr>`
          :`<tr><td class="l">${esc(c.pl)}</td><td class="l">${lab}</td><td>${esc(c.u)}</td><td>${fmtQ(c.qty)}</td><td>${nb(c.puA,2)}</td><td class="pv">${nb(c.puV,2)}</td><td>${eur(c.amtV)}</td><td class="sp">${e2(c.mo*k)}</td><td class="sp">${e2(c.fo*k)}</td><td class="sp">${e2(c.st*k)}</td><td class="sp">${e2(c.loc*k)}</td></tr>`;});
      TV+=gv;TA+=ga;rows+=narrow?`<tr class="st"><td class="l" colspan="2">Sous-total ${esc(g.nom)}${g.ml?` <span class="sub">soit ${nb(gv/g.ml,2)} € HT le ml de tranchée, tout compris · achat ${eur(ga)}</span>`:` <span class="sub">achat ${eur(ga)}</span>`}</td><td>${eur(gv)}</td></tr>`
        :`<tr class="st"><td class="l" colspan="6">Sous-total ${esc(g.nom)}${g.ml?` <span class="sub">soit ${nb(gv/g.ml,2)} € HT le ml de tranchée, tout compris</span>`:''}</td><td>${eur(gv)}</td><td colspan="4" class="sp">achat ${eur(ga)}</td></tr>`;});
    const all=st.z==='all'&&!f;const ok=Math.abs(TV-CP.C.vente)<1;
    const totTxt=`achat ${eur(TA)}${all?` · ${ok?'✓ = prix de vente du chiffrage':'⚠ prix de vente du chiffrage : '+eur(CP.C.vente)}`:''}`;
    body=`<div style="overflow:auto;max-height:70vh;border:1px solid #eee;border-radius:8px"><table class="dx-put"><thead><tr>${narrow?'<th class="l">Poste · composante · quantité</th><th>PU vente</th><th>Total vente</th>':'<th class="l">Poste</th><th class="l">Composante</th><th>U</th><th>Qté</th><th>PU achat</th><th>PU vente</th><th>Total vente</th><th>MO / u</th><th>Fourn. / u</th><th>S.-trait. / u</th><th>Loc. / frais / u</th>'}</tr></thead>
      <tbody>${rows||`<tr><td class="l" colspan="${narrow?3:11}">Aucune composante ne correspond au filtre.</td></tr>`}${n?(narrow?`<tr class="tot"><td class="l" colspan="2">Total${all?'':' (sélection)'}<span class="sub">${totTxt}</span></td><td>${eur(TV)}</td></tr>`:`<tr class="tot"><td class="l" colspan="6">Total${all?'':' (sélection)'}</td><td>${eur(TV)}</td><td colspan="4" class="sp">${totTxt}</td></tr>`):''}</tbody></table></div>
      <div class="hint" style="margin-top:4px">PU de vente = PU d'achat ÷ coefficient de vente (${nb(coef,4)}). Les colonnes « / u » décomposent le PU de vente.</div>`;}
  return `<div class="dx-panel dx-pu" id="dx-pu">${head}${tabs}${flt}${body}</div>`;}
function refreshPu(a){const el=document.getElementById('dx-pu');if(!el){rerender();return;}const fo=document.activeElement&&document.activeElement.dataset&&document.activeElement.dataset.dxpu!==undefined;const pos=fo?document.activeElement.selectionStart:0;
  const t=document.createElement('div');t.innerHTML=puDetailHTML(a,XS.canEdit);const n=t.firstElementChild;if(n)el.replaceWith(n);if(fo){const f=document.querySelector('#dx-pu [data-dxpu="f"]');if(f){f.focus();try{f.setSelectionRange(pos,pos);}catch(x){}}}}
/* ═════════ 17 · ⧉ AUTRE ÉCRAN : la grille dans une fenêtre à glisser sur le 2e écran ═════════ */
function openPopup(a){if(popLive()){try{XS.pop.w.focus();}catch(e){}refreshPopup();return;}const W=Math.round(Math.min(1500,(screen.availWidth||1400)*0.92)),Hh=Math.round((screen.availHeight||900)*0.92);const w=window.open('','trace_dpgfxl','popup=yes,width='+W+',height='+Hh);
  if(!w){say('Fenêtre bloquée par le navigateur : autorise les fenêtres surgissantes (pop-up) pour ce site');return;}const doc=w.document;doc.open();doc.write('<!doctype html><html lang="fr"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>DPGF</title></head><body class="dx-win" style="margin:0;padding:8px;background:#f3f3f1;font-family:system-ui,-apple-system,Segoe UI,Roboto,sans-serif"></body></html>');doc.close();
  document.querySelectorAll('style,link[rel="stylesheet"]').forEach(s=>{if(s.id==='dx-xf')return;try{doc.head.appendChild(doc.importNode(s,true));}catch(e){}});XS.pop={w,num:a.num};
  w.addEventListener('pagehide',()=>{if(XS.pop&&XS.pop.w===w){XS.pop=null;XS.pview=null;setTimeout(()=>{if(XS.ctx&&XS.ctx.render)XS.ctx.render();},60);}});
  doc.addEventListener('click',e=>{const t=e.target.closest&&e.target.closest('[data-act="af"][data-v]');if(!t)return;e.preventDefault();const [k,x,y]=String(t.dataset.v).split('|');const a2=XS.pop&&affOf(XS.pop.num);if(a2)dpgfXlAct(k,x,y,a2,XS.ctx);});
  const hl=(id,on)=>[document,doc].forEach(d=>d.querySelectorAll('[data-lk]').forEach(el=>{if(el.dataset.lk===id)el.classList.toggle('dx-hl',on);}));
  doc.addEventListener('mouseover',e=>{const el=e.target&&e.target.closest&&e.target.closest('[data-lk]');if(!el)return;if(XS.hl&&XS.hl!==el.dataset.lk)hl(XS.hl,false);XS.hl=el.dataset.lk;hl(XS.hl,true);});
  doc.addEventListener('mouseout',e=>{const el=e.target&&e.target.closest&&e.target.closest('[data-lk]');if(el&&XS.hl){hl(XS.hl,false);XS.hl=null;}});
  refreshPopup();}
export function refreshPopup(){if(!popLive())return;const a=affOf(XS.pop.num);const M=a&&modelOf(a);if(!M)return;const w=XS.pop.w;const doc=w.document;ensureCss(doc);ensureXfCss(doc,M.book);const S=curSheet(a,M);const s=ensureSel(a,M,S);const z=zoomOf(a,S);const key=a.num+'|'+S.name;const sc=XS.scroll[key]||{top:0,left:0};
  const T=tableHTML(a,M,S,z,sc.top,(w.innerHeight||800)*0.85);const cur=S.cells.get(cellKey(s.r,s.c));const had=doc.activeElement&&doc.activeElement.id==='dx-vp';
  doc.body.innerHTML=`<div class="dx-card" id="dx-card" style="--dxh:calc(100vh - 118px)"><div class="dx-head"><h3 style="font-size:15px">📊 ${esc(a.num)} · DPGF du client <span class="hint">· ${esc((a.dpgf||{}).fichier||'')}</span></h3><span class="eq-acts" style="display:flex;gap:4px;flex-wrap:wrap">${XS.canEdit?`<button class="btn sm" data-act="af" data-v="dxundo|">↶</button><button class="btn sm" data-act="af" data-v="dxredo|">↷</button>`:''}<button class="btn sm" data-act="af" data-v="dxzoom|-1">−</button><span class="dx-zv" style="align-self:center;font-size:12px">${Math.round(z*100)} %</span><button class="btn sm" data-act="af" data-v="dxzoom|1">+</button><button class="btn sm" data-act="af" data-v="dxpopclose|">↩ Ramener dans l'appli</button></span></div>
    <div class="dx-fb"><input class="dx-nm" id="dx-nm" value="${addrOf(s.r,s.c)}"><span class="dx-fxl">fx</span><input class="dx-fi" id="dx-fi" value="${esc(editText(cur&&cur.f?cur:{v:val(M,S,s.r,s.c)}))}" ${XS.canEdit?'':'readonly'}><span class="dx-fbx" id="dx-fbx"${cellInfo(a,M,S,s)?'':' hidden'}>${cellInfo(a,M,S,s)}</span></div>
    <div class="dx-grid"><div class="dx-vp" id="dx-vp" tabindex="0"><div class="dx-cnt" id="dx-cnt">${T.html}</div></div>${tabsHTML(a,M,S)}</div></div>`;
  doc.title=(a.num||'')+' — DPGF';dxMount(a.num,doc);if(had||doc.hasFocus()){const vp=doc.getElementById('dx-vp');if(vp&&XS.focus)try{vp.focus({preventScroll:true});}catch(e){}}}
export function dxReset(num){[XS.undo,XS.redo,XS.calc,XS.sel,XS.sh].forEach(m=>{delete m[num];});Object.keys(XS.det).forEach(k=>{if(k.startsWith(num+'|'))delete XS.det[k];});Object.keys(XS.scroll).forEach(k=>{if(k.startsWith(num+'|'))delete XS.scroll[k];});if(XS.free&&XS.free.num===num)XS.free=null;delete BOOK[num];REP.reset(num);SV.reset(num);RC.reset(num);ZN.reset(num);}
/* quantités changées dans la grille (contrôles avant export) */
export function qtyModsOf(a){const M=modelOf(a);if(!M)return 0;const D=a.dpgf||{};const S=dpSheet(M,D);const qc=qtyColOf(D);if(!qc)return 0;let n=0;(D.lignes||[]).forEach(l=>{if(l.section)return;const cell=S.cells.get(cellKey(l.row,qc));if(cell&&cell.ed&&!cell.ed.auto)n++;});return n;}
/* 15/10 (lot R) : ce que dpgfrep.js emprunte au DPGF (aucun import circulaire) */
REP.init({XS,H:()=>H,affOf,modelOf,compsOf,pointage,linkNow,linkAt,linkOfRow,dpSheet,puColOf,qtyColOf,totColOf,calcTarget,calcState,calcResHTML,calcSum,parseQ,fmtIn,compName,dxWrite,refreshSide,rerender,popLive,scrollToCell,LK_COLS,say,ZN});
/* 16/10 (lot C2) : ce que dpgfclair.js emprunte au DPGF */
CL.init({XS,H:()=>H,affOf,modelOf,compsOf,pointage,linkNow,linkAt,dpSheet,puColOf,calcTarget,calcState,calcSum,parseQ,fmtIn,compName,dxWrite,refreshSide,rerender,popLive,scrollToCell,qOfCell,nextCol,LK_COLS,say,RC,ZN});
/* 16/10 après-midi (lot C3) : ce que dpgfsuivi.js emprunte au DPGF */
SV.init({XS,H:()=>H,affOf,modelOf,compsOf,pointage,linkNow,linkAt,dpSheet,puColOf,qtyColOf,calcTarget,qOfCell,nextCol,compName,dxWrite,refreshSide,rerender,popLive,LK_COLS,say,REP,CL,RC,ZN});
/* 16/10 nuit (lot DK) : ce que dpgfrecap.js emprunte au DPGF */
RC.init({XS,H:()=>H,affOf,modelOf,compsOf,pointage,linkNow,linkAt,dpSheet,puColOf,qtyColOf,calcTarget,qOfCell,nextCol,compName,dxWrite,refreshSide,rerender,popLive,scrollToCell,LK_COLS,say,REP,CL,SV,ZN});
/* 17/10 (lot DZ) : ce que dpgfzone.js emprunte au DPGF */
ZN.init({XS,H:()=>H,affOf,modelOf,compsOf,pointage,linkNow,linkAt,dpSheet,puColOf,qtyColOf,calcTarget,calcState,calcSum,calcResHTML,parseQ,fmtIn,qOfCell,compName,dxWrite,refreshSide,rerender,popLive,LK_COLS,say,REP,CL,SV,RC});
