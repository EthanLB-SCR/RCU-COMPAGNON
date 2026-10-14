// xlcalc.js — MOTEUR DE FORMULES EXCEL + FORMATS DE NOMBRES (14/10 après-midi (lot C)). Pur (aucun DOM) : sert à la grille « comme dans Excel » du DPGF
// (dpgfxl.js) et se teste en Node (test/dpgfxl_test.mjs). Les formules sont lues / écrites comme dans le fichier (.xlsx : noms anglais, « , » entre les
// arguments, « . » décimal) ; la barre de formule les montre et les accepte en français (SOMME, ARRONDI, SI… « ; » et « , » décimale).
// · tokenize / parseFormula → arbre ; evalFormula(arbre, ctx, cellule courante) ; une fonction inconnue lève Unsupported → la cellule garde sa valeur
//   d'origine (« non recalculée ») ;
// · shiftFormula (formules partagées, recopie), shiftRowsFormula (insertion / suppression de lignes), fxToFr / fxFromUser (barre de formule) ;
// · fmtValue(valeur, code de format) → texte affiché à la française (1 240,00 €, 12,5 %, dates), couleur ([Rouge]) ; parseInput (saisie dans une cellule).
export const colIdx=c=>{let n=0;for(const ch of String(c).toUpperCase())n=n*26+(ch.charCodeAt(0)-64);return n;};
export const colName=i=>{let s='';while(i>0){const r=(i-1)%26;s=String.fromCharCode(65+r)+s;i=Math.floor((i-1)/26);}return s;};
export const addrOf=(r,c)=>colName(c)+r;
export const parseAddr=a=>{const m=String(a||'').toUpperCase().match(/^\$?([A-Z]{1,3})\$?(\d+)$/);return m?{c:colIdx(m[1]),r:+m[2]}:null;};
export const MAXR=1048576,MAXC=16384;
export class Unsupported extends Error{}
/* ═════════ 1 · JETONS ═════════ */
const R_SHEET=/(?:'((?:[^']|'')+)'|([A-Za-z_\u00C0-\uFFFF][\w.\u00C0-\uFFFF]*))!/y;
const R_AREA=/(\$?)([A-Za-z]{1,3})(\$?)(\d+):(\$?)([A-Za-z]{1,3})(\$?)(\d+)(?![\w.(!])/y;
const R_COLS=/(\$?)([A-Za-z]{1,3}):(\$?)([A-Za-z]{1,3})(?![\w.(!])/y;
const R_ROWS=/(\$?)(\d+):(\$?)(\d+)(?![\w.(!])/y;
const R_CELL=/(\$?)([A-Za-z]{1,3})(\$?)(\d+)(?![\w.(!])/y;
const R_NUM=/(?:\d+\.?\d*|\.\d+)(?:[eE][+-]?\d+)?/y;
const R_ERR=/#(?:DIV\/0!|N\/A|NAME\?|NULL!|NUM!|REF!|VALUE!|GETTING_DATA)/y;
const R_ID=/(?:_xlfn\.|_xlws\.)?[A-Za-z_\\\u00C0-\uFFFF][\w.\u00C0-\uFFFF]*/y;
const R_OP=/<>|<=|>=|[-+*\/^&=<>%:,;(){}]/y;
const R_STR=/"(?:[^"]|"")*"/y;
const stick=(re,src,i)=>{re.lastIndex=i;const m=re.exec(src);return m&&m.index===i?m:null;};
const okCol=s=>colIdx(s)<=MAXC,okRow=s=>+s>=1&&+s<=MAXR;
export function tokenize(src){src=String(src||'');const T=[];let i=0;const n=src.length;
  while(i<n){const ch=src[i];if(ch===' '||ch==='\n'||ch==='\r'||ch==='\t'||ch==='\u00A0'){i++;continue;}
    let m;
    if(ch==='"'){m=stick(R_STR,src,i);if(!m)throw new Error('texte non fermé');T.push({k:'str',v:m[0].slice(1,-1).replace(/""/g,'"'),s:i,e:i+m[0].length});i+=m[0].length;continue;}
    /* référence (éventuellement précédée d'un nom de feuille) */
    let sh=null,p=i,shEnd=i;if((m=stick(R_SHEET,src,i))){sh=m[1]!==undefined?m[1].replace(/''/g,"'"):m[2];p=i+m[0].length;shEnd=p;}
    if(sh!==null&&(m=stick(R_ERR,src,p))){T.push({k:'err',v:m[0],sh,s:i,e:p+m[0].length,se:shEnd});i=p+m[0].length;continue;}
    if((m=stick(R_AREA,src,p))&&okCol(m[2])&&okCol(m[6])&&okRow(m[4])&&okRow(m[8])){T.push({k:'area',kind:'cells',sh,c1:colIdx(m[2]),ac1:!!m[1],r1:+m[4],ar1:!!m[3],c2:colIdx(m[6]),ac2:!!m[5],r2:+m[8],ar2:!!m[7],s:i,e:p+m[0].length,se:shEnd});i=p+m[0].length;continue;}
    if((m=stick(R_COLS,src,p))&&okCol(m[2])&&okCol(m[4])&&(sh!==null||!/^[A-Za-z]/.test(src[p-1]||''))){T.push({k:'area',kind:'cols',sh,c1:colIdx(m[2]),ac1:!!m[1],c2:colIdx(m[4]),ac2:!!m[3],r1:1,r2:MAXR,s:i,e:p+m[0].length,se:shEnd});i=p+m[0].length;continue;}
    if((m=stick(R_ROWS,src,p))&&okRow(m[2])&&okRow(m[4])){T.push({k:'area',kind:'rows',sh,r1:+m[2],ar1:!!m[1],r2:+m[4],ar2:!!m[3],c1:1,c2:MAXC,s:i,e:p+m[0].length,se:shEnd});i=p+m[0].length;continue;}
    if((m=stick(R_CELL,src,p))&&okCol(m[2])&&okRow(m[4])){T.push({k:'ref',sh,c:colIdx(m[2]),ac:!!m[1],r:+m[4],ar:!!m[3],s:i,e:p+m[0].length,se:shEnd});i=p+m[0].length;continue;}
    if(sh!==null)throw new Error('référence de feuille illisible');
    if((m=stick(R_ERR,src,i))){T.push({k:'err',v:m[0],s:i,e:i+m[0].length});i+=m[0].length;continue;}
    if((m=stick(R_NUM,src,i))){T.push({k:'num',v:+m[0],s:i,e:i+m[0].length});i+=m[0].length;continue;}
    if((m=stick(R_ID,src,i))){const id=m[0];let j=i+id.length;while(src[j]===' ')j++;
      if(src[j]==='(')T.push({k:'fn',v:id.replace(/^_xl(?:fn|ws)\./i,'').toUpperCase(),raw:id,s:i,e:i+id.length});
      else if(/^(TRUE|FALSE)$/i.test(id))T.push({k:'bool',v:/^TRUE$/i.test(id),s:i,e:i+id.length});
      else T.push({k:'name',v:id,s:i,e:i+id.length});
      i+=id.length;continue;}
    if((m=stick(R_OP,src,i))){T.push({k:'op',v:m[0],s:i,e:i+m[0].length});i+=m[0].length;continue;}
    throw new Error('caractère inattendu « '+ch+' »');}
  return T;}
/* ═════════ 2 · ARBRE ═════════ */
const BIN={'=':1,'<>':1,'<':1,'>':1,'<=':1,'>=':1,'&':2,'+':3,'-':3,'*':4,'/':4,'^':5};
const ACACHE=new Map();
export function parseFormula(src){const key=String(src||'');const c=ACACHE.get(key);if(c)return c;const T=tokenize(key);let i=0;
  const peek=()=>T[i],isOp=(v)=>T[i]&&T[i].k==='op'&&T[i].v===v;
  const expr=(min)=>{let a=unary();for(;;){const t=T[i];if(!t||t.k!=='op'||BIN[t.v]===undefined||BIN[t.v]<min)break;i++;const p=BIN[t.v];const b=expr(p+1);a={t:'bin',op:t.v,a,b};}return a;};
  const unary=()=>{const t=T[i];if(t&&t.k==='op'&&(t.v==='-'||t.v==='+')){i++;return {t:'un',op:t.v,x:unary()};}return postfix(primary());};
  const postfix=(x)=>{for(;;){if(isOp('%')){i++;x={t:'pct',x};continue;}if(isOp(':')){i++;const y=primary();if((x.t==='ref'||x.t==='area')&&(y.t==='ref'||y.t==='area')&&(!y.sh||String(y.sh).toUpperCase()===String(x.sh||'').toUpperCase())){const r1=Math.min(x.r1||x.r,y.r1||y.r),c1=Math.min(x.c1||x.c,y.c1||y.c),r2=Math.max(x.r2||x.r,y.r2||y.r),c2=Math.max(x.c2||x.c,y.c2||y.c);x={t:'area',sh:x.sh||y.sh||null,r1,c1,r2,c2};continue;}throw new Unsupported('plage composée');}return x;}};
  const primary=()=>{const t=T[i++];if(!t)throw new Error('formule incomplète');
    switch(t.k){case 'num':return {t:'n',v:t.v};case 'str':return {t:'s',v:t.v};case 'bool':return {t:'b',v:t.v};case 'err':return {t:'e',v:t.v};
      case 'ref':return {t:'ref',sh:t.sh,r:t.r,c:t.c};case 'area':return {t:'area',sh:t.sh,r1:t.r1,c1:t.c1,r2:t.r2,c2:t.c2,kind:t.kind};case 'name':return {t:'name',n:t.v};
      case 'fn':{if(!isOp('('))throw new Error('( attendue');i++;const args=[];if(isOp(')')){i++;return {t:'fn',n:t.v,args};}
        for(;;){if(isOp(',')||isOp(')')){args.push({t:'miss'});}else args.push(expr(1));if(isOp(',')){i++;continue;}if(isOp(')')){i++;break;}throw new Error('« ) » attendue');}return {t:'fn',n:t.v,args};}
      case 'op':if(t.v==='('){const x=expr(1);if(!isOp(')'))throw new Error('« ) » attendue');i++;return x;}if(t.v==='{')throw new Unsupported('tableau constant');throw new Error('opérateur inattendu « '+t.v+' »');}
    throw new Error('formule illisible');};
  const ast=expr(1);if(i<T.length)throw new Error('formule illisible après « '+key.slice(T[i].s,T[i].s+12)+' »');
  if(ACACHE.size>20000)ACACHE.clear();ACACHE.set(key,ast);return ast;}
/* fonctions utilisées par une formule (non gérées → la cellule garde sa valeur d'origine) */
export function formulaFns(src){try{return tokenize(src).filter(t=>t.k==='fn').map(t=>t.v);}catch(e){return null;}}
/* ═════════ 3 · VALEURS ═════════ */
const E=v=>({e:v});export const isErr=v=>!!(v&&typeof v==='object'&&v.e);const isRg=v=>!!(v&&typeof v==='object'&&v.rg);
export const ERR_FR={'#DIV/0!':'#DIV/0!','#VALUE!':'#VALEUR!','#REF!':'#REF!','#NAME?':'#NOM?','#N/A':'#N/A','#NUM!':'#NOMBRE!','#NULL!':'#NUL!','#GETTING_DATA':'#CHARGEMENT'};
export const fix15=x=>typeof x==='number'&&isFinite(x)?+x.toPrecision(15):x;
const numStr=s=>{const t=String(s).trim().replace(/[\s\u00A0\u202F]/g,'');if(t==='')return null;let u=t;const pct=/%$/.test(u);if(pct)u=u.slice(0,-1);if(/^[-+]?(\d+[.,]?\d*|[.,]\d+)([eE][-+]?\d+)?$/.test(u)){const x=+u.replace(',','.');return pct?x/100:x;}return null;};
function toNum(v){if(typeof v==='number')return v;if(v===null||v===undefined)return 0;if(typeof v==='boolean')return v?1:0;if(isErr(v))return v;if(typeof v==='string'){const x=numStr(v);return x===null?E('#VALUE!'):x;}return E('#VALUE!');}
export function toText(v){if(v===null||v===undefined)return '';if(typeof v==='boolean')return v?'VRAI':'FAUX';if(typeof v==='number')return fmtGeneral(v);if(isErr(v))return ERR_FR[v.e]||v.e;return String(v);}
function toBool(v){if(typeof v==='boolean')return v;if(typeof v==='number')return v!==0;if(v===null||v===undefined)return false;if(isErr(v))return v;const s=String(v).toUpperCase();if(s==='TRUE'||s==='VRAI')return true;if(s==='FALSE'||s==='FAUX')return false;return E('#VALUE!');}
const okN=x=>typeof x==='number'&&!isFinite(x)?E('#NUM!'):x;
/* comparaison Excel : nombres < textes < booléens ; textes sans casse ; une cellule vide vaut 0, "" ou FAUX selon l'autre côté */
function cmp(a,b){if(a===null||a===undefined)a=typeof b==='string'?'':typeof b==='boolean'?false:0;if(b===null||b===undefined)b=typeof a==='string'?'':typeof a==='boolean'?false:0;
  const rk=x=>typeof x==='number'?0:typeof x==='string'?1:2;if(rk(a)!==rk(b))return rk(a)-rk(b);if(typeof a==='string'){const x=a.toUpperCase(),y=b.toUpperCase();return x<y?-1:x>y?1:0;}if(typeof a==='boolean')return (a?1:0)-(b?1:0);return a<b?-1:a>b?1:0;}
/* ═════════ 4 · ÉVALUATION ═════════ */
/* ctx : val(sh,r,c), hasSheet(sh), bounds(sh)→{maxR,maxC}, name(n,sh)→arbre|null, isSub(sh,r,c), rowHidden(sh,r) ; cur = {sh,r,c} */
export function evalFormula(ast,ctx,cur){const X={ctx,cur};const v=ev(ast,X);return out(v,X);}
function out(v,X){if(isRg(v))v=inter(v.rg,X);if(typeof v==='number')return okN(v);return v===undefined?null:v;}
function inter(rg,X){if(rg.r1===rg.r2&&rg.c1===rg.c2)return X.ctx.val(rg.sh,rg.r1,rg.c1);const {r,c}=X.cur;if(rg.c1===rg.c2&&r>=rg.r1&&r<=rg.r2&&(rg.sh||'').toUpperCase()===(X.cur.sh||'').toUpperCase())return X.ctx.val(rg.sh,r,rg.c1);if(rg.r1===rg.r2&&c>=rg.c1&&c<=rg.c2&&(rg.sh||'').toUpperCase()===(X.cur.sh||'').toUpperCase())return X.ctx.val(rg.sh,rg.r1,c);return E('#VALUE!');}
const sc=(v,X)=>isRg(v)?inter(v.rg,X):v;
function areaOf(n,X){const sh=n.sh||X.cur.sh;if(!X.ctx.hasSheet(sh))return null;let {r1,c1,r2,c2}=n;if(n.kind==='cols'||n.kind==='rows'||r2>=MAXR||c2>=MAXC){const b=X.ctx.bounds(sh);if(r2>b.maxR)r2=Math.max(r1,b.maxR);if(c2>b.maxC)c2=Math.max(c1,b.maxC);}return {sh,r1:Math.min(r1,r2),c1:Math.min(c1,c2),r2:Math.max(r1,r2),c2:Math.max(c1,c2)};}
function ev(n,X){switch(n.t){
  case 'n':return n.v;case 's':return n.v;case 'b':return n.v;case 'e':return E(n.v);case 'miss':return null;
  case 'ref':{const sh=n.sh||X.cur.sh;if(!X.ctx.hasSheet(sh))return E('#REF!');return X.ctx.val(sh,n.r,n.c);}
  case 'area':{const rg=areaOf(n,X);return rg?{rg}:E('#REF!');}
  case 'name':{const a=X.ctx.name(n.n,X.cur.sh);if(!a)throw new Unsupported('nom '+n.n);return ev(a,X);}
  case 'un':{const v=toNum(sc(ev(n.x,X),X));if(isErr(v))return v;return n.op==='-'?-v:v;}
  case 'pct':{const v=toNum(sc(ev(n.x,X),X));if(isErr(v))return v;return v/100;}
  case 'bin':{const a=sc(ev(n.a,X),X),b=sc(ev(n.b,X),X);const op=n.op;
    if(op==='&'){if(isErr(a))return a;if(isErr(b))return b;return toText(a)+toText(b);}
    if(BIN[op]===1){if(isErr(a))return a;if(isErr(b))return b;const k=cmp(a,b);return op==='='?k===0:op==='<>'?k!==0:op==='<'?k<0:op==='>'?k>0:op==='<='?k<=0:k>=0;}
    const x=toNum(a);if(isErr(x))return x;const y=toNum(b);if(isErr(y))return y;
    if(op==='+')return x+y;if(op==='-')return x-y;if(op==='*')return x*y;if(op==='/')return y===0?E('#DIV/0!'):x/y;
    if(op==='^'){if(x===0&&y===0)return E('#NUM!');const r=Math.pow(x,y);return isFinite(r)?r:E('#NUM!');}return E('#VALUE!');}
  case 'fn':{const F=FN[n.n];if(!F)throw new Unsupported(n.n);return F(n.args,X);}}
  throw new Unsupported(n.t);}
/* valeurs des arguments : {v, r (vient d'une plage)} */
function cells(rg,X,fn){for(let r=rg.r1;r<=rg.r2;r++)for(let c=rg.c1;c<=rg.c2;c++)fn(X.ctx.val(rg.sh,r,c),r,c);}
function flat(args,X){const L=[];for(const a of args){if(a.t==='miss'){L.push({v:null,r:false,miss:true});continue;}const v=ev(a,X);if(isRg(v))cells(v.rg,X,x=>L.push({v:x,r:true}));else L.push({v,r:a.t==='ref'});}return L;}
function grid(v,X){/* plage → tableau 2D */if(isRg(v)){const g=[];const rg=v.rg;for(let r=rg.r1;r<=rg.r2;r++){const row=[];for(let c=rg.c1;c<=rg.c2;c++)row.push(X.ctx.val(rg.sh,r,c));g.push(row);}return g;}return [[v]];}
function nums(args,X,opt){opt=opt||{};const L=flat(args,X);const out=[];for(const {v,r} of L){if(isErr(v))return v;if(typeof v==='number')out.push(v);else if(!r){if(typeof v==='boolean')out.push(v?1:0);else if(typeof v==='string'){const x=numStr(v);if(x===null){if(opt.strict)return E('#VALUE!');}else out.push(x);}else if(v===null&&opt.blank0)out.push(0);}}return out;}
const a1=(args,X,i,def)=>args[i]===undefined||args[i].t==='miss'?def:sc(ev(args[i],X),X);
const n1=(args,X,i,def)=>{const v=a1(args,X,i,def);return toNum(v);};
export function roundX(x,d,mode){d=Math.trunc(d)||0;const p=Math.pow(10,Math.abs(d));const y=+(d>=0?Math.abs(x)*p:Math.abs(x)/p).toPrecision(15);const r=mode==='up'?Math.ceil(y):mode==='down'?Math.floor(y):Math.round(y);const z=d>=0?r/p:r*p;return x<0?-z:z;}
/* critères de SOMME.SI / NB.SI : ">=10", "<>x", "abc*", 12, "" */
function crit(c){if(isErr(c))return ()=>false;if(typeof c==='number'||typeof c==='boolean')return v=>typeof c==='boolean'?v===c:(typeof v==='number'?v===c:(typeof v==='string'&&numStr(v)===c));
  let s=c===null||c===undefined?'':String(c);let op='=';const m=s.match(/^(<=|>=|<>|<|>|=)/);if(m){op=m[1];s=s.slice(m[1].length);}
  const n=numStr(s);if(n!==null&&s.trim()!==''){return v=>{if(typeof v!=='number'){if(op==='<>')return true;return false;}return op==='='?v===n:op==='<>'?v!==n:op==='<'?v<n:op==='>'?v>n:op==='<='?v<=n:v>=n;};}
  if(s===''){return op==='<>'?v=>v!==null&&v!=='':v=>v===null||v==='';}
  const re=new RegExp('^'+s.replace(/[.+^${}()|[\]\\]/g,'\\$&').replace(/~\*/g,'\u0001').replace(/~\?/g,'\u0002').replace(/\*/g,'.*').replace(/\?/g,'.').replace(/\u0001/g,'\\*').replace(/\u0002/g,'\\?')+'$','i');
  if(op==='='||op==='<>')return v=>{const ok=v!==null&&typeof v!=='number'&&re.test(String(v));return op==='='?ok:!ok;};
  return v=>{if(typeof v!=='string')return false;const k=cmp(v,s);return op==='<'?k<0:op==='>'?k>0:op==='<='?k<=0:k>=0;};}
function rgArg(args,X,i){const v=ev(args[i],X);if(isRg(v))return v.rg;throw new Unsupported('plage attendue');}
function lookupEq(a,b){if(typeof a==='string'&&typeof b==='string')return a.toUpperCase()===b.toUpperCase();return a===b;}
function wildEq(pat,v){if(typeof pat!=='string'||typeof v!=='string')return lookupEq(pat,v);if(!/[*?~]/.test(pat))return pat.toUpperCase()===v.toUpperCase();return crit(pat)(v);}
const DAY=86400000;export const serialToDate=s=>{const d=Math.floor(s);const ms=Math.round((s-d)*DAY);const base=d>60?Date.UTC(1899,11,30):Date.UTC(1899,11,31);return new Date(base+d*DAY+ms);};
export const dateToSerial=(y,m,d)=>{const t=Date.UTC(y,m-1,d);const s=(t-Date.UTC(1899,11,30))/DAY;return s<61?s-1:s;};
const FN={
  SUM:(a,X)=>{const L=nums(a,X,{strict:true});return isErr(L)?L:L.reduce((s,x)=>s+x,0);},
  PRODUCT:(a,X)=>{const L=nums(a,X,{strict:true});return isErr(L)?L:(L.length?L.reduce((s,x)=>s*x,1):0);},
  MIN:(a,X)=>{const L=nums(a,X,{strict:true});return isErr(L)?L:(L.length?Math.min(...L):0);},
  MAX:(a,X)=>{const L=nums(a,X,{strict:true});return isErr(L)?L:(L.length?Math.max(...L):0);},
  AVERAGE:(a,X)=>{const L=nums(a,X,{strict:true});return isErr(L)?L:(L.length?L.reduce((s,x)=>s+x,0)/L.length:E('#DIV/0!'));},
  MEDIAN:(a,X)=>{const L=nums(a,X,{strict:true});if(isErr(L))return L;if(!L.length)return E('#NUM!');L.sort((x,y)=>x-y);const m=L.length>>1;return L.length%2?L[m]:(L[m-1]+L[m])/2;},
  COUNT:(a,X)=>{let n=0;for(const {v,r} of flat(a,X)){if(typeof v==='number')n++;else if(!r&&(typeof v==='boolean'||(typeof v==='string'&&numStr(v)!==null)))n++;}return n;},
  COUNTA:(a,X)=>{let n=0;for(const {v,r,miss} of flat(a,X)){if(r){if(v!==null&&v!==undefined)n++;}else if(!miss)n++;}return n;},
  COUNTBLANK:(a,X)=>{let n=0;for(const {v} of flat(a,X))if(v===null||v==='')n++;return n;},
  ROUND:(a,X)=>{const x=n1(a,X,0,0),d=n1(a,X,1,0);if(isErr(x))return x;if(isErr(d))return d;return roundX(x,d);},
  ROUNDUP:(a,X)=>{const x=n1(a,X,0,0),d=n1(a,X,1,0);if(isErr(x))return x;if(isErr(d))return d;return roundX(x,d,'up');},
  ROUNDDOWN:(a,X)=>{const x=n1(a,X,0,0),d=n1(a,X,1,0);if(isErr(x))return x;if(isErr(d))return d;return roundX(x,d,'down');},
  INT:(a,X)=>{const x=n1(a,X,0,0);return isErr(x)?x:Math.floor(x);},
  TRUNC:(a,X)=>{const x=n1(a,X,0,0),d=n1(a,X,1,0);if(isErr(x))return x;if(isErr(d))return d;return roundX(x,d,'down');},
  ABS:(a,X)=>{const x=n1(a,X,0,0);return isErr(x)?x:Math.abs(x);},
  SIGN:(a,X)=>{const x=n1(a,X,0,0);return isErr(x)?x:Math.sign(x);},
  SQRT:(a,X)=>{const x=n1(a,X,0,0);return isErr(x)?x:(x<0?E('#NUM!'):Math.sqrt(x));},
  POWER:(a,X)=>{const x=n1(a,X,0,0),y=n1(a,X,1,0);if(isErr(x))return x;if(isErr(y))return y;if(x===0&&y===0)return E('#NUM!');const r=Math.pow(x,y);return isFinite(r)?r:E('#NUM!');},
  EXP:(a,X)=>{const x=n1(a,X,0,0);return isErr(x)?x:Math.exp(x);},
  LN:(a,X)=>{const x=n1(a,X,0,0);return isErr(x)?x:(x<=0?E('#NUM!'):Math.log(x));},
  LOG:(a,X)=>{const x=n1(a,X,0,0),b=n1(a,X,1,10);if(isErr(x))return x;if(isErr(b))return b;return x<=0||b<=0||b===1?E('#NUM!'):Math.log(x)/Math.log(b);},
  LOG10:(a,X)=>{const x=n1(a,X,0,0);return isErr(x)?x:(x<=0?E('#NUM!'):Math.log10(x));},
  PI:()=>Math.PI,
  MOD:(a,X)=>{const x=n1(a,X,0,0),y=n1(a,X,1,0);if(isErr(x))return x;if(isErr(y))return y;if(y===0)return E('#DIV/0!');return fix15(x-y*Math.floor(x/y));},
  CEILING:(a,X)=>{const x=n1(a,X,0,0),s=n1(a,X,1,1);if(isErr(x))return x;if(isErr(s))return s;if(s===0)return 0;if(x>0&&s<0)return E('#NUM!');return fix15(s<0?-Math.ceil(fix15(-x/-s))*-s:Math.ceil(fix15(x/s))*s);},
  FLOOR:(a,X)=>{const x=n1(a,X,0,0),s=n1(a,X,1,1);if(isErr(x))return x;if(isErr(s))return s;if(s===0)return x===0?0:E('#DIV/0!');if(x>0&&s<0)return E('#NUM!');return fix15(s<0?-Math.floor(fix15(-x/-s))*-s:Math.floor(fix15(x/s))*s);},
  'CEILING.MATH':(a,X)=>{const x=n1(a,X,0,0),s=Math.abs(n1(a,X,1,1)||1);if(isErr(x))return x;return fix15(Math.ceil(fix15(x/s))*s);},
  'FLOOR.MATH':(a,X)=>{const x=n1(a,X,0,0),s=Math.abs(n1(a,X,1,1)||1);if(isErr(x))return x;return fix15(Math.floor(fix15(x/s))*s);},
  MROUND:(a,X)=>{const x=n1(a,X,0,0),m=n1(a,X,1,0);if(isErr(x))return x;if(isErr(m))return m;if(m===0)return 0;if(x*m<0)return E('#NUM!');return fix15(roundX(x/m,0)*m);},
  IF:(a,X)=>{const c=toBool(a1(a,X,0,false));if(isErr(c))return c;if(c)return a.length>1?(a[1].t==='miss'?0:ev(a[1],X)):true;return a.length>2?(a[2].t==='miss'?0:ev(a[2],X)):false;},
  IFERROR:(a,X)=>{let v;try{v=sc(ev(a[0],X),X);}catch(e){if(e instanceof Unsupported)throw e;v=E('#VALUE!');}return isErr(v)?a1(a,X,1,0):v;},
  IFNA:(a,X)=>{const v=sc(ev(a[0],X),X);return isErr(v)&&v.e==='#N/A'?a1(a,X,1,0):v;},
  AND:(a,X)=>{let any=false;for(const {v,r} of flat(a,X)){if(isErr(v))return v;if(r&&typeof v!=='number'&&typeof v!=='boolean')continue;const b=toBool(v);if(isErr(b))return b;any=true;if(!b)return false;}return any?true:E('#VALUE!');},
  OR:(a,X)=>{let any=false,res=false;for(const {v,r} of flat(a,X)){if(isErr(v))return v;if(r&&typeof v!=='number'&&typeof v!=='boolean')continue;const b=toBool(v);if(isErr(b))return b;any=true;if(b)res=true;}return any?res:E('#VALUE!');},
  XOR:(a,X)=>{let n=0;for(const {v} of flat(a,X)){if(isErr(v))return v;if(toBool(v)===true)n++;}return n%2===1;},
  NOT:(a,X)=>{const b=toBool(a1(a,X,0,false));return isErr(b)?b:!b;},
  TRUE:()=>true,FALSE:()=>false,
  ISBLANK:(a,X)=>{const v=a1(a,X,0,null);return v===null||v===undefined;},
  ISNUMBER:(a,X)=>typeof a1(a,X,0,null)==='number',ISTEXT:(a,X)=>typeof a1(a,X,0,null)==='string',ISLOGICAL:(a,X)=>typeof a1(a,X,0,null)==='boolean',
  ISERROR:(a,X)=>isErr(a1(a,X,0,null)),ISERR:(a,X)=>{const v=a1(a,X,0,null);return isErr(v)&&v.e!=='#N/A';},ISNA:(a,X)=>{const v=a1(a,X,0,null);return isErr(v)&&v.e==='#N/A';},
  NA:()=>E('#N/A'),
  N:(a,X)=>{const v=a1(a,X,0,null);return typeof v==='number'?v:v===true?1:isErr(v)?v:0;},
  VALUE:(a,X)=>{const v=a1(a,X,0,'');if(typeof v==='number')return v;if(isErr(v))return v;const x=numStr(String(v).replace(/[€$]/g,''));return x===null?E('#VALUE!'):x;},
  LEN:(a,X)=>{const v=a1(a,X,0,'');return isErr(v)?v:toText(v).length;},
  LEFT:(a,X)=>{const v=a1(a,X,0,''),n=n1(a,X,1,1);if(isErr(v))return v;if(isErr(n))return n;return toText(v).slice(0,Math.max(0,n));},
  RIGHT:(a,X)=>{const v=a1(a,X,0,''),n=n1(a,X,1,1);if(isErr(v))return v;if(isErr(n))return n;const s=toText(v);return n<=0?'':s.slice(-n);},
  MID:(a,X)=>{const v=a1(a,X,0,''),p=n1(a,X,1,1),n=n1(a,X,2,0);if(isErr(v))return v;if(isErr(p))return p;if(isErr(n))return n;if(p<1||n<0)return E('#VALUE!');return toText(v).substr(p-1,n);},
  UPPER:(a,X)=>{const v=a1(a,X,0,'');return isErr(v)?v:toText(v).toUpperCase();},LOWER:(a,X)=>{const v=a1(a,X,0,'');return isErr(v)?v:toText(v).toLowerCase();},
  TRIM:(a,X)=>{const v=a1(a,X,0,'');return isErr(v)?v:toText(v).replace(/ +/g,' ').trim();},
  CONCATENATE:(a,X)=>{let s='';for(let i=0;i<a.length;i++){const v=a1(a,X,i,'');if(isErr(v))return v;s+=toText(v);}return s;},
  CONCAT:(a,X)=>{let s='';for(const {v} of flat(a,X)){if(isErr(v))return v;s+=toText(v);}return s;},
  TEXTJOIN:(a,X)=>{const d=toText(a1(a,X,0,'')),ign=toBool(a1(a,X,1,true));const L=[];for(const {v} of flat(a.slice(2),X)){if(isErr(v))return v;const s=toText(v);if(ign===true&&s==='')continue;L.push(s);}return L.join(d);},
  REPT:(a,X)=>{const v=a1(a,X,0,''),n=n1(a,X,1,0);if(isErr(v))return v;if(isErr(n))return n;return toText(v).repeat(Math.max(0,Math.floor(n)));},
  TEXT:(a,X)=>{const v=a1(a,X,0,''),f=a1(a,X,1,'');if(isErr(v))return v;return fmtValue(typeof v==='string'&&numStr(v)!==null?numStr(v):v,toText(f)).t;},
  SUBTOTAL:(a,X)=>{let k=n1(a,X,0,9);if(isErr(k))return k;const hid=k>100;k=k%100;const L=[];for(const arg of a.slice(1)){const v=ev(arg,X);if(isRg(v)){const rg=v.rg;for(let r=rg.r1;r<=rg.r2;r++){if(hid&&X.ctx.rowHidden(rg.sh,r))continue;for(let c=rg.c1;c<=rg.c2;c++){if(X.ctx.isSub(rg.sh,r,c))continue;L.push(X.ctx.val(rg.sh,r,c));}}}else L.push(v);}
    const ns=[];for(const v of L){if(isErr(v))return v;if(typeof v==='number')ns.push(v);}
    switch(k){case 1:return ns.length?ns.reduce((s,x)=>s+x,0)/ns.length:E('#DIV/0!');case 2:return ns.length;case 3:return L.filter(v=>v!==null&&v!==undefined).length;case 4:return ns.length?Math.max(...ns):0;case 5:return ns.length?Math.min(...ns):0;case 6:return ns.length?ns.reduce((s,x)=>s*x,1):0;case 9:return ns.reduce((s,x)=>s+x,0);}throw new Unsupported('SOUS.TOTAL '+k);},
  SUMIF:(a,X)=>{const rg=rgArg(a,X,0);const f=crit(a1(a,X,1,''));const srg=a.length>2&&a[2].t!=='miss'?rgArg(a,X,2):rg;let s=0;for(let r=0;r<=rg.r2-rg.r1;r++)for(let c=0;c<=rg.c2-rg.c1;c++){if(f(X.ctx.val(rg.sh,rg.r1+r,rg.c1+c))){const v=X.ctx.val(srg.sh,srg.r1+r,srg.c1+c);if(isErr(v))return v;if(typeof v==='number')s+=v;}}return s;},
  COUNTIF:(a,X)=>{const rg=rgArg(a,X,0);const f=crit(a1(a,X,1,''));let n=0;cells(rg,X,v=>{if(f(v))n++;});return n;},
  AVERAGEIF:(a,X)=>{const rg=rgArg(a,X,0);const f=crit(a1(a,X,1,''));const srg=a.length>2&&a[2].t!=='miss'?rgArg(a,X,2):rg;let s=0,n=0;for(let r=0;r<=rg.r2-rg.r1;r++)for(let c=0;c<=rg.c2-rg.c1;c++){if(f(X.ctx.val(rg.sh,rg.r1+r,rg.c1+c))){const v=X.ctx.val(srg.sh,srg.r1+r,srg.c1+c);if(typeof v==='number'){s+=v;n++;}}}return n?s/n:E('#DIV/0!');},
  SUMIFS:(a,X)=>{const srg=rgArg(a,X,0);const C=[];for(let i=1;i+1<a.length;i+=2)C.push({rg:rgArg(a,X,i),f:crit(a1(a,X,i+1,''))});let s=0;for(let r=0;r<=srg.r2-srg.r1;r++)for(let c=0;c<=srg.c2-srg.c1;c++){if(C.every(k=>k.f(X.ctx.val(k.rg.sh,k.rg.r1+r,k.rg.c1+c)))){const v=X.ctx.val(srg.sh,srg.r1+r,srg.c1+c);if(isErr(v))return v;if(typeof v==='number')s+=v;}}return s;},
  COUNTIFS:(a,X)=>{const C=[];for(let i=0;i+1<a.length;i+=2)C.push({rg:rgArg(a,X,i),f:crit(a1(a,X,i+1,''))});if(!C.length)return 0;const g=C[0].rg;let n=0;for(let r=0;r<=g.r2-g.r1;r++)for(let c=0;c<=g.c2-g.c1;c++)if(C.every(k=>k.f(X.ctx.val(k.rg.sh,k.rg.r1+r,k.rg.c1+c))))n++;return n;},
  SUMPRODUCT:(a,X)=>{const G=a.map(x=>{const v=ev(x,X);if(!isRg(v)&&typeof v!=='number')throw new Unsupported('SOMMEPROD sur un calcul de tableau');return grid(v,X);});if(!G.length)return 0;const h=G[0].length,w=G[0][0].length;if(G.some(g=>g.length!==h||g[0].length!==w))return E('#VALUE!');let s=0;for(let r=0;r<h;r++)for(let c=0;c<w;c++){let p=1;for(const g of G){const v=g[r][c];if(isErr(v))return v;p*=typeof v==='number'?v:0;}s+=p;}return s;},
  VLOOKUP:(a,X)=>{const v=a1(a,X,0,null);if(isErr(v))return v;const rg=rgArg(a,X,1);const k=n1(a,X,2,1);if(isErr(k))return k;const approx=a.length>3?toBool(a1(a,X,3,true)):true;if(k<1)return E('#VALUE!');if(k>rg.c2-rg.c1+1)return E('#REF!');
    let hit=-1;for(let r=rg.r1;r<=rg.r2;r++){const x=X.ctx.val(rg.sh,r,rg.c1);if(approx===true){if(x===null)continue;if(cmp(x,v)<=0&&typeof x===typeof v)hit=r;else if(typeof x===typeof v&&cmp(x,v)>0)break;}else if(wildEq(v,x)){hit=r;break;}}return hit<0?E('#N/A'):X.ctx.val(rg.sh,hit,rg.c1+k-1);},
  HLOOKUP:(a,X)=>{const v=a1(a,X,0,null);if(isErr(v))return v;const rg=rgArg(a,X,1);const k=n1(a,X,2,1);if(isErr(k))return k;const approx=a.length>3?toBool(a1(a,X,3,true)):true;if(k<1)return E('#VALUE!');if(k>rg.r2-rg.r1+1)return E('#REF!');
    let hit=-1;for(let c=rg.c1;c<=rg.c2;c++){const x=X.ctx.val(rg.sh,rg.r1,c);if(approx===true){if(x===null)continue;if(cmp(x,v)<=0&&typeof x===typeof v)hit=c;else if(typeof x===typeof v&&cmp(x,v)>0)break;}else if(wildEq(v,x)){hit=c;break;}}return hit<0?E('#N/A'):X.ctx.val(rg.sh,rg.r1+k-1,hit);},
  INDEX:(a,X)=>{const v=ev(a[0],X);if(!isRg(v)){return v;}const rg=v.rg;let r=n1(a,X,1,0),c=n1(a,X,2,0);if(isErr(r))return r;if(isErr(c))return c;const h=rg.r2-rg.r1+1,w=rg.c2-rg.c1+1;if(a.length<3&&h===1&&w>1){c=r;r=1;}if(r===0||c===0){if(r===0&&c===0)return {rg};if(r===0)return {rg:{sh:rg.sh,r1:rg.r1,r2:rg.r2,c1:rg.c1+c-1,c2:rg.c1+c-1}};return {rg:{sh:rg.sh,r1:rg.r1+r-1,r2:rg.r1+r-1,c1:rg.c1,c2:rg.c2}};}if(r>h||c>w||r<0||c<0)return E('#REF!');return X.ctx.val(rg.sh,rg.r1+r-1,rg.c1+(c||1)-1);},
  MATCH:(a,X)=>{const v=a1(a,X,0,null);if(isErr(v))return v;const rg=rgArg(a,X,1);const t=n1(a,X,2,1);if(isErr(t))return t;const L=[];cells(rg,X,x=>L.push(x));
    if(t===0){const i=L.findIndex(x=>wildEq(v,x));return i<0?E('#N/A'):i+1;}let hit=-1;for(let i=0;i<L.length;i++){const x=L[i];if(x===null||typeof x!==typeof v)continue;const k=cmp(x,v);if(t>0){if(k<=0)hit=i;else break;}else{if(k>=0)hit=i;else break;}}return hit<0?E('#N/A'):hit+1;},
  CHOOSE:(a,X)=>{const i=n1(a,X,0,0);if(isErr(i))return i;const k=Math.floor(i);if(k<1||k>=a.length)return E('#VALUE!');return ev(a[k],X);},
  ROW:(a,X)=>{if(!a.length||a[0].t==='miss')return X.cur.r;const n=a[0];return n.t==='ref'?n.r:n.t==='area'?n.r1:E('#VALUE!');},
  COLUMN:(a,X)=>{if(!a.length||a[0].t==='miss')return X.cur.c;const n=a[0];return n.t==='ref'?n.c:n.t==='area'?n.c1:E('#VALUE!');},
  ROWS:(a,X)=>{const v=ev(a[0],X);return isRg(v)?v.rg.r2-v.rg.r1+1:1;},COLUMNS:(a,X)=>{const v=ev(a[0],X);return isRg(v)?v.rg.c2-v.rg.c1+1:1;},
  DATE:(a,X)=>{const y=n1(a,X,0,1900),m=n1(a,X,1,1),d=n1(a,X,2,1);if(isErr(y))return y;if(isErr(m))return m;if(isErr(d))return d;const yy=y<1900?y+1900:y;const t=Date.UTC(yy,m-1,d);return (t-Date.UTC(1899,11,30))/DAY;},
  YEAR:(a,X)=>{const s=n1(a,X,0,0);return isErr(s)?s:serialToDate(s).getUTCFullYear();},MONTH:(a,X)=>{const s=n1(a,X,0,0);return isErr(s)?s:serialToDate(s).getUTCMonth()+1;},DAY:(a,X)=>{const s=n1(a,X,0,0);return isErr(s)?s:serialToDate(s).getUTCDate();},
  TODAY:()=>{const d=new Date();return dateToSerial(d.getFullYear(),d.getMonth()+1,d.getDate());},
};
export const FN_EN=Object.keys(FN);
/* ═════════ 5 · DÉCALER LES RÉFÉRENCES ═════════ */
const refTxt=(c,ac,r,ar)=>(ac?'$':'')+colName(c)+(ar?'$':'')+r;
function rebuild(src,T,fn){let out='',p=0;for(const t of T){const rep=fn(t);if(rep===undefined)continue;out+=src.slice(p,t.s)+rep;p=t.e;}return out+src.slice(p);}
const prefix=(src,t)=>t.se!==undefined&&t.se>t.s&&t.sh!==null?src.slice(t.s,t.se):'';
/* formule partagée / recopie : les parties relatives bougent de (dr, dc) — hors feuille → #REF! */
export function shiftFormula(src,dr,dc){if(!dr&&!dc)return src;let T;try{T=tokenize(src);}catch(e){return src;}
  return rebuild(src,T,t=>{const px=prefix(src,t);
    if(t.k==='ref'){const r=t.ar?t.r:t.r+dr,c=t.ac?t.c:t.c+dc;if(r<1||r>MAXR||c<1||c>MAXC)return px+'#REF!';return px+refTxt(c,t.ac,r,t.ar);}
    if(t.k==='area'){if(t.kind==='cols'){const c1=t.ac1?t.c1:t.c1+dc,c2=t.ac2?t.c2:t.c2+dc;if(c1<1||c2<1||c1>MAXC||c2>MAXC)return px+'#REF!';return px+(t.ac1?'$':'')+colName(c1)+':'+(t.ac2?'$':'')+colName(c2);}
      if(t.kind==='rows'){const r1=t.ar1?t.r1:t.r1+dr,r2=t.ar2?t.r2:t.r2+dr;if(r1<1||r2<1||r1>MAXR||r2>MAXR)return px+'#REF!';return px+(t.ar1?'$':'')+r1+':'+(t.ar2?'$':'')+r2;}
      const r1=t.ar1?t.r1:t.r1+dr,c1=t.ac1?t.c1:t.c1+dc,r2=t.ar2?t.r2:t.r2+dr,c2=t.ac2?t.c2:t.c2+dc;if([r1,r2].some(x=>x<1||x>MAXR)||[c1,c2].some(x=>x<1||x>MAXC))return px+'#REF!';return px+refTxt(c1,t.ac1,r1,t.ar1)+':'+refTxt(c2,t.ac2,r2,t.ar2);}});}
/* insertion (n > 0, AVANT la ligne at) ou suppression (n < 0 : lignes at … at-n-1) de lignes dans la feuille target. Les références (relatives ET absolues) qui pointent
   au-delà suivent ; une plage qui traverse s'agrandit / rétrécit ; une cellule supprimée → #REF!. opt.grow : une plage qui finit juste au-dessus de l'insertion
   s'agrandit aussi (insérer « sous la dernière ligne d'un chapitre » : le sous-total la compte). curSheet = feuille de la formule. */
export function shiftRowsFormula(src,curSheet,target,at,n,opt){opt=opt||{};let T;try{T=tokenize(src);}catch(e){return src;}const same=sh=>String(sh===null||sh===undefined?curSheet:sh).toUpperCase()===String(target).toUpperCase();let changed=false;
  const out=rebuild(src,T,t=>{if((t.k!=='ref'&&t.k!=='area')||!same(t.sh))return undefined;const px=prefix(src,t);
    if(t.k==='ref'){if(n>0){if(t.r>=at){changed=true;return px+refTxt(t.c,t.ac,t.r+n,t.ar);}return undefined;}const d=-n;if(t.r>=at&&t.r<at+d){changed=true;return px+'#REF!';}if(t.r>=at+d){changed=true;return px+refTxt(t.c,t.ac,t.r-d,t.ar);}return undefined;}
    if(t.kind==='cols')return undefined;let r1=t.r1,r2=t.r2;
    if(n>0){if(r1>=at)r1+=n;if(r2>=at||(opt.grow&&r2===at-1&&r1<r2))r2+=n;}
    else{const d=-n,e=at+d-1;if(r1>=at&&r2<=e){changed=true;return px+'#REF!';}r1=r1<at?r1:r1>e?r1-d:at;r2=r2<at?r2:r2>e?r2-d:at-1;if(r2<r1)r2=r1;}
    if(r1===t.r1&&r2===t.r2)return undefined;changed=true;
    if(t.kind==='rows')return px+(t.ar1?'$':'')+r1+':'+(t.ar2?'$':'')+r2;return px+refTxt(t.c1,t.ac1,r1,t.ar1)+':'+refTxt(t.c2,t.ac2,r2,t.ar2);});
  return changed?out:src;}
/* renommer une feuille dans les formules (non utilisé par l'appli aujourd'hui, gardé pour la structure) */
export const sheetRef=n=>/^[A-Za-z_\u00C0-\uFFFF][\w.\u00C0-\uFFFF]*$/.test(n)&&!/^[A-Za-z]{1,3}\d+$/.test(n)?n:"'"+String(n).replace(/'/g,"''")+"'";
/* ═════════ 6 · FRANÇAIS ⇄ ANGLAIS (barre de formule) ═════════ */
const FR2EN={SOMME:'SUM',SOMMEPROD:'SUMPRODUCT','SOMME.SI':'SUMIF','SOMME.SI.ENS':'SUMIFS',NB:'COUNT',NBVAL:'COUNTA','NB.SI':'COUNTIF','NB.SI.ENS':'COUNTIFS','NB.VIDE':'COUNTBLANK',MOYENNE:'AVERAGE','MOYENNE.SI':'AVERAGEIF',MEDIANE:'MEDIAN',MIN:'MIN',MAX:'MAX',PRODUIT:'PRODUCT',
  ARRONDI:'ROUND','ARRONDI.SUP':'ROUNDUP','ARRONDI.INF':'ROUNDDOWN',ENT:'INT',TRONQUE:'TRUNC',ABS:'ABS',SIGNE:'SIGN',RACINE:'SQRT',PUISSANCE:'POWER',EXP:'EXP',LN:'LN',LOG:'LOG',LOG10:'LOG10',PI:'PI',MOD:'MOD',PLAFOND:'CEILING',PLANCHER:'FLOOR','PLAFOND.MATH':'CEILING.MATH','PLANCHER.MATH':'FLOOR.MATH','ARRONDI.AU.MULTIPLE':'MROUND',
  SI:'IF',SIERREUR:'IFERROR','SI.NON.DISP':'IFNA',ET:'AND',OU:'OR',OUX:'XOR',NON:'NOT',VRAI:'TRUE',FAUX:'FALSE',ESTVIDE:'ISBLANK',ESTNUM:'ISNUMBER',ESTTEXTE:'ISTEXT',ESTLOGIQUE:'ISLOGICAL',ESTERREUR:'ISERROR',ESTERR:'ISERR',ESTNA:'ISNA',NA:'NA',N:'N',CNUM:'VALUE',
  NBCAR:'LEN',GAUCHE:'LEFT',DROITE:'RIGHT',STXT:'MID',MAJUSCULE:'UPPER',MINUSCULE:'LOWER',SUPPRESPACE:'TRIM',CONCATENER:'CONCATENATE',CONCAT:'CONCAT',JOINDRE:'TEXTJOIN','JOINDRE.TEXTE':'TEXTJOIN',REPT:'REPT',TEXTE:'TEXT','SOUS.TOTAL':'SUBTOTAL',
  RECHERCHEV:'VLOOKUP',RECHERCHEH:'HLOOKUP',INDEX:'INDEX',EQUIV:'MATCH',CHOISIR:'CHOOSE',LIGNE:'ROW',COLONNE:'COLUMN',LIGNES:'ROWS',COLONNES:'COLUMNS',DATE:'DATE',ANNEE:'YEAR',MOIS:'MONTH',JOUR:'DAY',AUJOURDHUI:'TODAY'};
const EN2FR=Object.fromEntries(Object.entries(FR2EN).map(([f,e])=>[e,f]));
const ERR_EN=Object.fromEntries(Object.entries(ERR_FR).map(([e,f])=>[f,e]));
const deAcc=s=>s.normalize('NFD').replace(/[\u0300-\u036f]/g,'');
/* formule du fichier (anglais) → barre de formule (français : SOMME(F5:F9;2), 1,5) */
export function fxToFr(src){let T;try{T=tokenize(src);}catch(e){return src;}return rebuild(src,T,t=>{if(t.k==='fn')return EN2FR[t.v]||t.raw;if(t.k==='op'&&t.v===',')return ';';if(t.k==='num')return src.slice(t.s,t.e).replace('.',',');if(t.k==='bool')return t.v?'VRAI':'FAUX';if(t.k==='err'&&!t.sh)return ERR_FR[t.v]||t.v;return undefined;});}
/* saisie de l'utilisateur (avec ou sans « = », en français ou en anglais) → formule du fichier (anglais) ; lève une erreur lisible si illisible */
export function fxFromUser(text){let s=String(text||'').trim().replace(/^=/,'');if(!s)return '';
  /* français si « ; » hors textes, ou un nom de fonction français ; sinon anglais tel quel */
  const semi=s.replace(/"(?:[^"]|"")*"/g,'').includes(';');
  const fnNames=[];s.replace(/"(?:[^"]|"")*"/g,'').replace(/([A-Za-zÀ-ÿ_][\wÀ-ÿ.]*)\s*\(/g,(m,n)=>{fnNames.push(n);return m;});
  const frHit=fnNames.some(n=>{const u=deAcc(n.toUpperCase());return FR2EN[u]&&FR2EN[u]!==u;}),enHit=fnNames.some(n=>FN[n.toUpperCase()]&&!FR2EN[n.toUpperCase()]);
  const fr=semi||frHit||!enHit;
  if(fr){/* « , » décimale entre deux chiffres, « ; » séparateur ; VRAI / FAUX ; erreurs */let o='',q=false;for(let i=0;i<s.length;i++){const ch=s[i];if(ch==='"'){q=!q;o+=ch;continue;}if(q){o+=ch;continue;}if(ch===','&&/\d/.test(s[i-1]||'')&&/\d/.test(s[i+1]||'')){let j=i-1;while(j>=0&&/\d/.test(s[j]))j--;if(!(j>=0&&/[A-Za-z$]/.test(s[j]))){o+='.';continue;}}if(ch===';'){o+=',';continue;}o+=ch;}s=o;
    s=s.replace(/"(?:[^"]|"")*"|([A-Za-zÀ-ÿ_][\wÀ-ÿ.]*)(\s*\()?|#[A-Z\/0!?]+[!?]?/g,(m,id,par)=>{if(m[0]==='"')return m;if(m[0]==='#')return ERR_EN[m]||m;if(par){const u=deAcc(id.toUpperCase());return (FR2EN[u]||id)+par;}const u=id.toUpperCase();if(u==='VRAI')return 'TRUE';if(u==='FAUX')return 'FALSE';return m;});}
  parseFormula(s);/* lève si illisible */return canon(s);}
/* écriture « comme Excel » : références et fonctions en majuscules, préfixe _xlfn. des fonctions récentes (sinon Excel affiche #NOM?) */
const XLFN=new Set(['CONCAT','TEXTJOIN','IFNA','XOR','CEILING.MATH','FLOOR.MATH','IFS','MAXIFS','MINIFS','SWITCH']);
export function canon(src){let T;try{T=tokenize(src);}catch(e){return src;}return rebuild(src,T,t=>{const px=prefix(src,t);
  if(t.k==='fn')return (XLFN.has(t.v)?'_xlfn.':'')+t.v;
  if(t.k==='ref')return px+refTxt(t.c,t.ac,t.r,t.ar);
  if(t.k==='area'){if(t.kind==='cols')return px+(t.ac1?'$':'')+colName(t.c1)+':'+(t.ac2?'$':'')+colName(t.c2);if(t.kind==='rows')return px+(t.ar1?'$':'')+t.r1+':'+(t.ar2?'$':'')+t.r2;return px+refTxt(t.c1,t.ac1,t.r1,t.ar1)+':'+refTxt(t.c2,t.ac2,t.r2,t.ar2);}
  if(t.k==='bool')return t.v?'TRUE':'FALSE';return undefined;});}
/* ═════════ 7 · FORMATS DE NOMBRES (affichage « à la française ») ═════════ */
const NBSP='\u202F';
export const BUILTIN_FMT={0:'General',1:'0',2:'0.00',3:'#,##0',4:'#,##0.00',5:'#,##0\\ "€";\\-#,##0\\ "€"',6:'#,##0\\ "€";[Red]\\-#,##0\\ "€"',7:'#,##0.00\\ "€";\\-#,##0.00\\ "€"',8:'#,##0.00\\ "€";[Red]\\-#,##0.00\\ "€"',9:'0%',10:'0.00%',11:'0.00E+00',12:'# ?/?',13:'# ??/??',14:'dd/mm/yyyy',15:'d-mmm-yy',16:'d-mmm',17:'mmm-yy',18:'h:mm AM/PM',19:'h:mm:ss AM/PM',20:'h:mm',21:'h:mm:ss',22:'dd/mm/yyyy h:mm',37:'#,##0 ;(#,##0)',38:'#,##0 ;[Red](#,##0)',39:'#,##0.00;(#,##0.00)',40:'#,##0.00;[Red](#,##0.00)',41:'_-* #,##0\\ _€_-;\\-* #,##0\\ _€_-;_-* "-"\\ _€_-;_-@_-',42:'_-* #,##0\\ "€"_-;\\-* #,##0\\ "€"_-;_-* "-"\\ "€"_-;_-@_-',43:'_-* #,##0.00\\ _€_-;\\-* #,##0.00\\ _€_-;_-* "-"??\\ _€_-;_-@_-',44:'_-* #,##0.00\\ "€"_-;\\-* #,##0.00\\ "€"_-;_-* "-"??\\ "€"_-;_-@_-',45:'mm:ss',46:'[h]:mm:ss',47:'mm:ss.0',48:'##0.0E+0',49:'@'};
export function fmtGeneral(v){if(!isFinite(v))return '#NOMBRE!';if(v===0)return '0';const a=Math.abs(v);if(Number.isInteger(v)&&a<1e11)return String(v);
  if(a>=1e11||a<1e-9){let s=v.toExponential(5).replace(/\.?0+e/,'e');const m=s.match(/^(-?[\d.]+)e([+-])(\d+)$/);if(m)s=m[1]+'E'+m[2]+m[3].padStart(2,'0');return s.replace('.',',');}
  const ip=Math.floor(Math.log10(a))+1;const d=Math.max(0,Math.min(14,(v<0?9:10)-Math.max(ip,1)));let s=(+v.toFixed(d)).toString();if(/e/.test(s))s=(+v.toPrecision(10)).toString();return s.replace('.',',');}
const COLORS={black:'#000',blue:'#0000ff',cyan:'#00ffff',green:'#00b050',magenta:'#ff00ff',red:'#ff0000',white:'#fff',yellow:'#ffff00',noir:'#000',bleu:'#0000ff',vert:'#00b050',rouge:'#ff0000',blanc:'#fff',jaune:'#ffff00'};
const FCACHE=new Map();
function splitSec(code){const out=[];let cur='',q=false,b=false;for(let i=0;i<code.length;i++){const ch=code[i];if(ch==='\\'&&!q){cur+=ch+(code[i+1]||'');i++;continue;}if(ch==='"')q=!q;else if(!q&&ch==='[')b=true;else if(!q&&ch===']')b=false;if(ch===';'&&!q&&!b){out.push(cur);cur='';continue;}cur+=ch;}out.push(cur);return out;}
function compileSec(s){const sec={toks:[],color:null,cond:null,date:false,pct:0,text:false,hasNum:false,elapsed:false};let i=0;
  const lit=t=>{const L=sec.toks[sec.toks.length-1];if(L&&L.k==='lit')L.v+=t;else sec.toks.push({k:'lit',v:t});};
  while(i<s.length){const ch=s[i];
    if(ch==='"'){const j=s.indexOf('"',i+1);lit(s.slice(i+1,j<0?s.length:j));i=j<0?s.length:j+1;continue;}
    if(ch==='\\'){lit(s[i+1]||'');i+=2;continue;}
    if(ch==='_'){lit(' ');i+=2;continue;}
    if(ch==='*'){i+=2;continue;}
    if(ch==='['){const j=s.indexOf(']',i);const inner=s.slice(i+1,j<0?s.length:j);i=j<0?s.length:j+1;const low=inner.toLowerCase();
      if(COLORS[low])sec.color=COLORS[low];else if(/^color\s*\d+$/i.test(inner))sec.color=null;
      else if(/^(<=|>=|<>|<|>|=)/.test(inner)){const m=inner.match(/^(<=|>=|<>|<|>|=)\s*(-?[\d.]+)/);if(m)sec.cond={op:m[1],v:+m[2]};}
      else if(/^\$/.test(inner)){const cur=inner.slice(1).split('-')[0];if(cur)lit(cur);}
      else if(/^(h+|m+|s+)$/i.test(inner)){sec.toks.push({k:'dt',v:inner.toLowerCase(),el:true});sec.date=true;sec.elapsed=true;}
      continue;}
    if(ch==='@'){sec.toks.push({k:'at'});sec.text=true;i++;continue;}
    if(/[0#?]/.test(ch)){sec.toks.push({k:'ph',v:ch});sec.hasNum=true;i++;continue;}
    if(ch==='.'){sec.toks.push({k:'dot'});i++;continue;}
    if(ch===','){sec.toks.push({k:'com'});i++;continue;}
    if(ch==='%'){sec.toks.push({k:'lit',v:'%'});sec.pct++;i++;continue;}
    if((ch==='E'||ch==='e')&&/[+-]/.test(s[i+1]||'')&&sec.hasNum){sec.toks.push({k:'exp',sign:s[i+1]});i+=2;continue;}
    if(/^(AM\/PM|A\/P)/i.test(s.slice(i))){const m=s.slice(i).match(/^(AM\/PM|A\/P)/i)[0];sec.toks.push({k:'dt',v:'ampm'});sec.date=true;i+=m.length;continue;}
    if(/[ymdhs]/i.test(ch)&&!sec.hasNum){let j=i;while(j<s.length&&s[j].toLowerCase()===ch.toLowerCase())j++;sec.toks.push({k:'dt',v:s.slice(i,j).toLowerCase()});sec.date=true;i=j;continue;}
    if(ch==='/'&&sec.hasNum){sec.toks.push({k:'lit',v:'/'});i++;continue;}
    lit(ch);i++;}
  /* m = minutes après h ou avant s */
  const D=sec.toks.filter(t=>t.k==='dt');D.forEach((t,j)=>{if(t.v[0]!=='m'||t.v.length>2)return;const prev=D[j-1],next=D[j+1];if((prev&&prev.v[0]==='h')||(next&&next.v[0]==='s'))t.min=true;});
  return sec;}
function compile(code){let c=FCACHE.get(code);if(c)return c;const secs=splitSec(code).map(compileSec);c={secs,general:/^general$/i.test(code.trim())||code.trim()===''};if(FCACHE.size>500)FCACHE.clear();FCACHE.set(code,c);return c;}
const MOIS=['janvier','février','mars','avril','mai','juin','juillet','août','septembre','octobre','novembre','décembre'],JOURS=['dimanche','lundi','mardi','mercredi','jeudi','vendredi','samedi'];
function fmtDate(v,sec){const d=serialToDate(v);const Y=d.getUTCFullYear(),M=d.getUTCMonth(),Dd=d.getUTCDate(),h=d.getUTCHours(),mi=d.getUTCMinutes(),se=d.getUTCSeconds(),wd=d.getUTCDay();const ampm=sec.toks.some(t=>t.v==='ampm');const p2=x=>String(x).padStart(2,'0');let s='';
  for(const t of sec.toks){if(t.k==='lit'){s+=t.v;continue;}if(t.k!=='dt'){continue;}const v2=t.v;
    if(t.el){const tot=v*24;s+=v2[0]==='h'?String(Math.floor(tot)):v2[0]==='m'?String(Math.floor(v*1440)):String(Math.floor(v*86400));continue;}
    if(v2==='ampm'){s+=h<12?'AM':'PM';continue;}
    if(v2[0]==='y'){s+=v2.length<=2?p2(Y%100):String(Y);continue;}
    if(v2[0]==='m'&&t.min){s+=v2.length===2?p2(mi):String(mi);continue;}
    if(v2[0]==='m'){s+=v2.length===1?String(M+1):v2.length===2?p2(M+1):v2.length===3?MOIS[M].slice(0,4).replace(/\.$/,'')+'.':v2.length===5?MOIS[M][0].toUpperCase():MOIS[M];continue;}
    if(v2[0]==='d'){s+=v2.length===1?String(Dd):v2.length===2?p2(Dd):v2.length===3?JOURS[wd].slice(0,3)+'.':JOURS[wd];continue;}
    if(v2[0]==='h'){const hh=ampm?((h+11)%12+1):h;s+=v2.length>=2?p2(hh):String(hh);continue;}
    if(v2[0]==='s'){s+=v2.length>=2?p2(se):String(se);continue;}}
  return s;}
function grp(intStr){return intStr.replace(/\B(?=(\d{3})+(?!\d))/g,NBSP);}
function fmtNumSec(v,sec,neg){let x=Math.abs(v)*Math.pow(100,sec.pct);
  const T=sec.toks;const di=T.findIndex(t=>t.k==='dot');const ei=T.findIndex(t=>t.k==='exp');
  const phIdx=T.map((t,i)=>t.k==='ph'?i:-1).filter(i=>i>=0);if(!phIdx.length){/* pas de chiffre : texte littéral seul */return (neg?'-':'')+T.filter(t=>t.k==='lit').map(t=>t.v).join('');}
  const firstPh=phIdx[0],lastPh=phIdx[phIdx.length-1];const intEnd=di>=0?di:(ei>=0?ei:lastPh+1);
  const intPh=phIdx.filter(i=>i<intEnd),decPh=phIdx.filter(i=>i>intEnd&&(ei<0||i<ei)),expPh=ei>=0?phIdx.filter(i=>i>ei):[];
  /* virgules : séparateur de milliers (entre deux chiffres de la partie entière) ; en fin de partie entière : ÷ 1000 */
  let thou=false,scale=0;for(let i=firstPh;i<intEnd;i++){if(T[i].k==='com'){const after=T.slice(i+1,intEnd).some(t=>t.k==='ph');if(after)thou=true;else scale++;}}
  for(let i=intEnd;i<T.length&&T[i]&&T[i].k==='com';i++)scale++;
  x=x/Math.pow(1000,scale);let expStr='';
  if(ei>=0){let e=x===0?0:Math.floor(Math.log10(x));const nInt=Math.max(1,intPh.length);if(intPh.length>1){e=Math.floor(e/nInt)*nInt;}else e=e-(Math.max(1,intPh.filter(i=>T[i].v==='0').length)-1);x=x/Math.pow(10,e);const md=decPh.length;if(+x.toFixed(md)>=Math.pow(10,Math.max(1,intPh.length))){x/=10;e+=1;}const es=String(Math.abs(e)).padStart(Math.max(1,expPh.length),'0');expStr='E'+(e<0?'-':(T[ei].sign==='+'?'+':''))+es;}
  const nd=decPh.length;let fixed=roundX(x,nd).toFixed(nd);let [ip,fp]=fixed.split('.');fp=fp||'';
  /* décimales : « # » retire les zéros de fin, « ? » les remplace par une espace */
  let fpo='';for(let k=0;k<nd;k++){fpo+=fp[k];}
  let cut=fpo.length;for(let k=nd-1;k>=0;k--){const ph=T[decPh[k]].v;if(fpo[k]!=='0'||ph==='0')break;cut=k;}
  const fpShow=fpo.slice(0,cut)+decPh.slice(cut).map(i=>T[i].v==='?'?' ':'').join('');
  /* partie entière : au moins autant de chiffres que de « 0 » */
  const minInt=intPh.filter(i=>T[i].v==='0').length;if(ip==='0'&&minInt===0)ip='';while(ip.length<minInt)ip='0'+ip;const qInt=intPh.filter(i=>T[i].v==='?').length;if(ip.length<qInt&&minInt<qInt)ip=' '.repeat(qInt-ip.length)+ip;
  const ipShow=thou?grp(ip):ip;
  let s='',intDone=false,decDone=false;
  for(let i=0;i<T.length;i++){const t=T[i];
    if(t.k==='lit'){s+=t.v;continue;}if(t.k==='at'){continue;}if(t.k==='dt'){continue;}
    if(t.k==='ph'){if(i<intEnd){if(!intDone){s+=ipShow;intDone=true;}continue;}if(ei>=0&&i>ei){continue;}if(!decDone){s+=fpShow;decDone=true;}continue;}
    if(t.k==='dot'){s+=',';continue;}
    if(t.k==='com'){continue;}
    if(t.k==='exp'){s+=expStr;continue;}}
  if(!intDone)s=ipShow+s;
  return (neg?'-':'')+s;}
/* valeur → texte affiché ; opt.width (caractères) non géré : le CSS coupe */
export function fmtValue(v,code){if(v===null||v===undefined||v==='')return {t:''};if(isErr(v))return {t:ERR_FR[v.e]||v.e,err:true};if(typeof v==='boolean')return {t:v?'VRAI':'FAUX'};
  code=code===undefined||code===null?'General':String(code);const C=compile(code);
  if(typeof v==='string'){const ts=C.secs.length>=4?C.secs[3]:C.secs.find(s=>s.text);if(!ts)return {t:v};return {t:ts.toks.map(t=>t.k==='lit'?t.v:t.k==='at'?v:'').join(''),color:ts.color};}
  if(typeof v!=='number'||!isFinite(v))return {t:String(v)};
  if(C.general)return {t:fmtGeneral(v)};
  let S=C.secs;let sec=null,neg=v<0;
  const condOk=(c,x)=>!c?null:c.op==='<'?x<c.v:c.op==='>'?x>c.v:c.op==='<='?x<=c.v:c.op==='>='?x>=c.v:c.op==='='?x===c.v:x!==c.v;
  if(S.some(s=>s.cond)){const nn=S.filter(s=>!s.text);sec=nn.find(s=>condOk(s.cond,v))||nn.find(s=>!s.cond)||nn[nn.length-1];neg=v<0&&!sec.cond;}
  else{const nn=S.filter((s,i)=>i<3);if(nn.length===1){sec=nn[0];}else if(nn.length===2){sec=v<0?nn[1]:nn[0];if(v<0)neg=false;}else{sec=v>0?nn[0]:v<0?nn[1]:nn[2];if(v<0)neg=false;}}
  if(!sec)return {t:fmtGeneral(v)};
  if(sec.date){if(v<0)return {t:'#'.repeat(8),err:true};return {t:fmtDate(v,sec),color:sec.color};}
  if(/^general$/i.test(sec.toks.map(t=>t.v||'').join('').trim())||(!sec.hasNum&&sec.toks.some(t=>t.k==='lit'&&/general/i.test(t.v)))){const g=fmtGeneral(Math.abs(v));const L=sec.toks.map(t=>t.k==='lit'?t.v.replace(/general/i,g):'').join('');return {t:(neg?'-':'')+L,color:sec.color};}
  if(sec.text&&!sec.hasNum)return {t:sec.toks.map(t=>t.k==='lit'?t.v:t.k==='at'?fmtGeneral(v):'').join(''),color:sec.color};
  const r=fmtNumSec(v,sec,neg&&v<0);return {t:r,color:sec.color};}
/* le format affiche-t-il une date / un pourcentage ? (saisie : « 12 % » → 0,12) */
export const fmtKind=code=>{const C=compile(String(code||'General'));const s=C.secs[0];if(!s||C.general)return 'general';if(s.date)return 'date';if(s.pct)return 'pct';if(s.text&&!s.hasNum)return 'text';return 'num';};
/* ═════════ 8 · SAISIE DANS UNE CELLULE ═════════ */
/* texte tapé → {v} (nombre, texte, booléen, vide) ou {f} (formule anglaise) ; nombres à la française : « 1 240,50 », « 12,5 % », « 15 € » */
export function parseInput(text,code){const s=String(text===undefined||text===null?'':text);if(s.trim()==='')return {v:null};
  if(s[0]==='=')return {f:fxFromUser(s)};if(s[0]==="'")return {v:s.slice(1)};
  const t=s.trim().replace(/[\u00A0\u202F]/g,' ');const up=t.toUpperCase();if(up==='VRAI'||up==='TRUE')return {v:true};if(up==='FAUX'||up==='FALSE')return {v:false};
  let u=t.replace(/\s/g,'').replace(/^€|€$|^\$|\$$|EUR$/gi,'');const pct=/%$/.test(u);if(pct)u=u.slice(0,-1);
  if(/^[-+]?\d{1,3}(\.\d{3})+,\d+$/.test(u))u=u.replace(/\./g,'').replace(',','.');else if(/^[-+]?\d{1,3}(,\d{3})+\.\d+$/.test(u))u=u.replace(/,/g,'');else u=u.replace(',','.');
  if(/^[-+]?(\d+\.?\d*|\.\d+)([eE][-+]?\d+)?$/.test(u)){let x=+u;if(pct||fmtKind(code)==='pct')x/=100;return {v:x};}
  const dm=t.match(/^(\d{1,2})\/(\d{1,2})\/(\d{2}|\d{4})$/);if(dm){const y=+dm[3]<100?2000+ +dm[3]:+dm[3];return {v:dateToSerial(y,+dm[2],+dm[1]),date:true};}
  return {v:s};}
/* contenu d'une cellule dans la barre de formule / l'éditeur : formule en français, nombre à la française (sans séparateur de milliers) */
export function editText(cell){if(!cell)return '';if(cell.f)return '='+fxToFr(cell.f);const v=cell.v;if(v===null||v===undefined)return '';if(typeof v==='number')return String(+v.toPrecision(15)).replace('.',',');if(typeof v==='boolean')return v?'VRAI':'FAUX';if(isErr(v))return ERR_FR[v.e]||v.e;return String(v);}
