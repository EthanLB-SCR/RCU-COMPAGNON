// memoire2.js — 14/10 nuit : BIBLIOTHÈQUE DE BLOCS DU MÉMOIRE TECHNIQUE SCR (volet Commerce, étape « 5 · Mémoire » de commerce.js).
// Ethan : « il faut créer les blocs pré-faits, qu'ils soient vraiment garnis, design comme sur nos mémoires actuels, je ne dois pas perdre ; juste c'est plusieurs
// blocs et je choisis les paragraphes que je mets ou non ; que tout soit bien rédigé et que ça mette en rouge le vide à combler quand c'est une quantité,
// le nom d'un dossier ou quelque chose comme ça ».
// · Bibliothèque = registre « doc », ligne « memlib » : {kind:'memlib', req:{none:true} (jamais « à signer »), blocs, style, version, at, by, corr}.
//   Le vrai contenu n'entre QUE par le pack SCR (privé) : memoirePackImport. corr = corrections faites dans l'appli {<paraId>:{html, at, by}} (gardées si on réimporte).
// · Par affaire : affaire.memoire.lib = {sel:{<paraId>:true|false}, fill:{<clé du trou>:valeur}, edits:{<paraId>:html}} ; affaire.memoire.mode = 'lib' | 'sections'.
//   Coché = sel[id] si choisi, sinon « defaut » du paragraphe. Trou = [[À COMPLÉTER : …]] (clé <paraId>|<libellé>|<rang du libellé dans le paragraphe>) ou variable
//   {{nom}} vide / inconnue (clé {{nom}}). L'ancien mode « sections libres » (commerce.js) reste entier : rien n'est supprimé.
// Ce fichier n'importe que reg.js (affaire, appli, variables : passés par commerce.js via memLibInit) — testable seul.
import {regGet,regSet} from './reg.js';
let A=null,H={};
export function memLibInit(api,helpers){A=api;H=helpers||{};wire();}
const esc=s=>String(s??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const qa=s=>String(s??'').replace(/"/g,'&quot;'); // texte déjà nettoyé (sans < >) → attribut
const nb=x=>(+x||0).toLocaleString('fr-FR');
const dFR=x=>x?new Date(x).toLocaleDateString('fr-FR'):'';
const norm=s=>String(s||'').normalize('NFD').replace(/[\u0300-\u036f]/g,'').replace(/[’‘`]/g,"'").toLowerCase();
const AS=()=>(H.AS?H.AS():(H._as||(H._as={})));
const say=t=>{try{if(A&&A.toast)A.toast(t);}catch(e){}};
const who=ctx=>{try{if(ctx&&ctx.api&&ctx.api.userName)return ctx.api.userName();if(ctx&&ctx.me)return [ctx.me.prenom,ctx.me.nom].filter(Boolean).join(' ')||ctx.me.id||'';if(A&&A.userName)return A.userName();}catch(e){}return '';};

/* ═════════ PACK : import de la bibliothèque (appelé par l'écran d'import du pack SCR) ═════════ */
const ID_OK=/^[A-Za-z0-9._:-]{1,80}$/;
export async function memoirePackImport(part,ctx){let p=part;if(typeof p==='string')p=JSON.parse(p);if(!p||typeof p!=='object')throw new Error('Mémoire : partie « memoire » du pack absente ({blocs, style})');
  let blocs=p.blocs;if(typeof blocs==='string')blocs=JSON.parse(blocs);let style=p.style;if(typeof style==='string')style=JSON.parse(style);
  if(!Array.isArray(blocs)||!blocs.length)throw new Error('Mémoire : blocs.json doit être une liste de blocs');
  const bIds=new Set(),pIds=new Set();let np=0,nd=0,nh=0;const secs=new Set();
  const clean=blocs.map((b,i)=>{if(!b||typeof b!=='object'||!ID_OK.test(String(b.id||''))||!Array.isArray(b.paragraphes))throw new Error('Mémoire : bloc n° '+(i+1)+' invalide (id, paragraphes)');if(bIds.has(b.id))throw new Error('Mémoire : bloc en double « '+b.id+' »');bIds.add(b.id);secs.add(String(b.section||'Autres'));
    return Object.assign({},b,{id:String(b.id),section:String(b.section||'Autres'),titre:String(b.titre||''),ordre:isFinite(+b.ordre)?+b.ordre:(i+1)*10,paragraphes:b.paragraphes.map((q,j)=>{if(!q||!ID_OK.test(String(q.id||'')))throw new Error('Mémoire : paragraphe n° '+(j+1)+' du bloc « '+b.id+' » sans identifiant valable');if(pIds.has(q.id))throw new Error('Mémoire : paragraphe en double « '+q.id+' »');pIds.add(q.id);np++;if(q.defaut===true)nd++;nh+=(String(q.html||'').match(/\[\[[^\[\]]{1,400}?\]\]/g)||[]).length;
      return Object.assign({},q,{id:String(q.id),titre:String(q.titre||''),html:String(q.html||''),defaut:q.defaut===true});})});});
  const old=regGet('doc','memlib');const version=((old&&+old.version)||0)+1;const kept=old&&old.corr?Object.keys(old.corr).filter(k=>pIds.has(k)).length:0;
  const row={kind:'memlib',req:{none:true},title:'Mémoire technique : bibliothèque de blocs SCR',blocs:clean,version,at:new Date().toISOString(),by:who(ctx)};
  if(style&&typeof style==='object')row.style=style;
  regSet('doc','memlib',row); /* fusion : les corrections (corr) faites dans l'appli sont gardées */
  return `Mémoire technique : ${clean.length} blocs, ${np} paragraphes (${nd} cochés par défaut), ${secs.size} sections, ${nh} trous à compléter${row.style?', gabarit SCR':(old&&old.style?', gabarit déjà en place conservé':', sans gabarit (style par défaut)')} · version ${version}${kept?' · '+kept+' correction'+(kept>1?'s':'')+' de l’appli conservée'+(kept>1?'s':''):''}`;}
export const memoirePack={key:'memoire',label:'Mémoire technique : bibliothèque de blocs SCR',import:memoirePackImport};

/* ═════════ bibliothèque, index, texte des paragraphes ═════════ */
export function memLib(){let r=null;try{r=regGet('doc','memlib');}catch(e){r=null;}return r&&!r.deleted&&Array.isArray(r.blocs)&&r.blocs.length?r:null;}
let IX=null;
function libIx(L){if(IX&&IX.blocs===L.blocs)return IX;const list=L.blocs.map((b,i)=>({b,i})).sort((x,y)=>((+x.b.ordre||0)-(+y.b.ordre||0))||x.i-y.i).map(x=>x.b);const secs=[];const S={};const P={};
  list.forEach(b=>{const k=String(b.section||'Autres');let s=S[k];if(!s){s=S[k]={name:k,blocs:[]};secs.push(s);}s.blocs.push(b);(b.paragraphes||[]).forEach(p=>{P[p.id]={p,b,s};});});
  IX={blocs:L.blocs,list,secs,P};return IX;}
const libOf=a=>(((a||{}).memoire||{}).lib)||{};
const isSel=(lib,p)=>{const v=(lib.sel||{})[p.id];return v===undefined?p.defaut===true:!!v;};
const libSrc=(L,pid)=>{const c=L.corr&&L.corr[pid];if(c&&typeof c.html==='string')return c.html;const x=libIx(L).P[pid];return x?String(x.p.html||''):'';};
const srcOf=(L,lib,pid)=>{const e=lib.edits&&lib.edits[pid];return typeof e==='string'?e:libSrc(L,pid);};
/* nettoyage du HTML (pack, corrections, textes modifiés) : balises de texte seulement, aucun attribut (sauf colspan / rowspan), scripts et styles retirés */
const OK_TAGS=new Set(['p','b','strong','i','em','u','ul','ol','li','table','thead','tbody','tr','th','td','h4','br','sup','sub']);const MAPT={div:'p',h1:'h4',h2:'h4',h3:'h4',h5:'h4',h6:'h4'};
const DROP=new Set(['script','style','iframe','object','embed','noscript','template','svg','math','head','title','textarea','select','button','canvas','video','audio']);
const escT=t=>t.replace(/&(?!(?:[a-zA-Z][a-zA-Z0-9]{1,31}|#\d{1,7}|#x[0-9a-fA-F]{1,6});)/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;');
function sanitize_(html){const s=String(html||'').replace(/<!--[\s\S]*?-->/g,'');let out='',i=0,skip=null,m;const re=/<(\/?)([a-zA-Z][a-zA-Z0-9]*)\b([^>]*)>/g;
  while((m=re.exec(s))){if(!skip)out+=escT(s.slice(i,m.index));i=re.lastIndex;const close=m[1]==='/';let tag=m[2].toLowerCase();
    if(skip){if(close&&tag===skip)skip=null;continue;}if(DROP.has(tag)){if(!close&&!/\/\s*$/.test(m[3]))skip=tag;continue;}
    tag=MAPT[tag]||tag;if(!OK_TAGS.has(tag))continue;if(tag==='br'){if(!close)out+='<br>';continue;}
    let at='';if(!close&&(tag==='td'||tag==='th')){const cs=/\bcolspan\s*=\s*["']?(\d{1,2})/i.exec(m[3]);const rs=/\browspan\s*=\s*["']?(\d{1,2})/i.exec(m[3]);if(cs)at+=` colspan="${cs[1]}"`;if(rs)at+=` rowspan="${rs[1]}"`;}
    out+=close?`</${tag}>`:`<${tag}${at}>`;}
  if(!skip)out+=escT(s.slice(i));return out.replace(/<p>\s*(<br>\s*)*<\/p>/g,'').trim();}
const SAN=new Map();
export function memSanitize(html){const k=String(html||'');let v=SAN.get(k);if(v!==undefined)return v;v=sanitize_(k);if(SAN.size>4000)SAN.clear();SAN.set(k,v);return v;}
const PLAIN=new Map();const plain=h=>{let v=PLAIN.get(h);if(v===undefined){v=String(h).replace(/<[^>]+>/g,' ').replace(/&nbsp;/g,' ').replace(/&amp;/g,'&').replace(/&#39;/g,"'").replace(/&quot;/g,'"').replace(/\s+/g,' ').trim();if(PLAIN.size>4000)PLAIN.clear();PLAIN.set(h,v);}return v;};

/* ═════════ variables et trous ═════════ */
const VAR_LAB={nom:'nom de l’affaire',ville:'ville',client:'client',num:'n° d’affaire',nb:'nombre de soudures (chiffrage)',ml:'ml de tranchée (chiffrage)',jS:'jours de soudage (chiffrage)',jM:'jours de manchonnage (chiffrage)',dns:'DN du réseau (chiffrage)',soudParDn:'soudures par DN (chiffrage)',equipes:'nombre de soudeurs',delai:'délai d’exécution (1 · Dossier)',date:'date du mémoire',annee:'année',moa:'maître d’ouvrage',moe:'maître d’œuvre',lot:'lot',procedure:'procédure',cp:'code postal',charge:'chargé d’affaires',cdtx:'conducteur de travaux',dateReponse:'date de remise de l’offre'};
/* valeurs : champs de l'affaire, puis memoireVars(a) de commerce.js (passé en « base ») qui a le dernier mot */
export function memLibVars(a,base){a=a||{};const c=a.consult||{};const now=new Date();return Object.assign({num:a.num||'',nom:a.nom||'',client:a.client||'',ville:a.ville||'',cp:a.cp||'',moa:a.moa||'',moe:a.moe||'',charge:a.charge||'',cdtx:a.cdtx||'',lot:c.lot||'',procedure:c.procedure||'',delai:c.delai||'',dateReponse:a.dateReponse?dFR(a.dateReponse):'',date:now.toLocaleDateString('fr-FR'),annee:String(now.getFullYear())},base||{});}
const fmtVar=x=>{if(x===null||x===undefined)return '';if(typeof x==='number'){if(!isFinite(x)||x===0)return '';return x.toLocaleString('fr-FR',{maximumFractionDigits:Number.isInteger(x)?0:1});}if(typeof x==='object')return '';return String(x).trim();}; // 0 = pas de chiffrage → trou rouge
const RX=/\[\[([^\[\]<>]{1,400}?)\]\]|\{\{\s*([A-Za-z_][A-Za-z0-9_]*)\s*\}\}/g;
const holeLab=t=>String(t).replace(/^\s*À\s+COMPL[ÉE]TER\s*:?\s*/i,'').trim()||'à compléter';
const filled=v=>v!==undefined&&v!==null&&String(v).trim()!=='';
/* trous d'un paragraphe (HTML nettoyé), dans l'ordre : {t:'h', i, lab, key} | {t:'v', name} */
function scan(html,pid){const out=[];let i=-1;const seen={};html.replace(RX,(m,h,vn)=>{if(h!==undefined){i++;const lab=holeLab(h);const n=seen[lab]=(seen[lab]===undefined?0:seen[lab]+1);out.push({t:'h',i,lab,key:pid+'|'+lab+'|'+n});}else out.push({t:'v',name:vn});return m;});return out;}
/* rendu d'un paragraphe : mode 'app' (trous cliquables), 'doc' (export : trou = [À COMPLÉTER : …] en rouge) ; renvoie {html, holes} */
function fillPara(html,pid,F,V,mode,ro){let i=-1;const seen={};let holes=0;const doc=mode==='doc';
  const out=html.replace(RX,(m,h,vn)=>{
    if(h!==undefined){i++;const lab=holeLab(h);const n=seen[lab]=(seen[lab]===undefined?0:seen[lab]+1);const val=F[pid+'|'+lab+'|'+n];
      if(filled(val))return doc?esc(val):`<span class="memoire-f"${ro?'':` data-act="af" data-v="mlbh|${esc(pid)}|${i}" role="button" tabindex="0"`} title="${qa(lab)}${ro?'':' — touche pour modifier'}">${esc(val)}</span>`;
      holes++;return doc?`<span class="ac">[À COMPLÉTER : ${lab}]</span>`:ro?`<span class="memoire-h">${lab}</span>`:`<button type="button" class="memoire-h" data-act="af" data-v="mlbh|${esc(pid)}|${i}" title="À compléter — touche pour saisir">${lab}</button>`;}
    const val=fmtVar(V[vn]);if(val)return doc?esc(val):`<span class="memoire-v" title="{{${vn}}} · valeur de l’affaire">${esc(val)}</span>`;
    const fv=F['{{'+vn+'}}'];if(filled(fv))return doc?esc(fv):`<span class="memoire-f"${ro?'':` data-act="af" data-v="mlbv|${vn}" role="button" tabindex="0"`} title="{{${vn}}}${ro?'':' — touche pour modifier'}">${esc(fv)}</span>`;
    holes++;const lab=esc(VAR_LAB[vn]||vn);return doc?`<span class="ac">[À COMPLÉTER : ${lab}]</span>`:ro?`<span class="memoire-h">${lab}</span>`:`<button type="button" class="memoire-h" data-act="af" data-v="mlbv|${vn}" title="${vn in V?'Vide dans l’affaire':'Variable inconnue'} — touche pour saisir">${lab}</button>`;});
  return {html:out,holes};}
/* état d'une affaire : par paragraphe {p, b, on, holes} + totaux */
let RC=null; /* un rendu = un seul calcul (stepState + écran) : mémo tant que l'affaire, la bibliothèque et les valeurs ne changent pas */
function rowsOf(a,L,V){const vk=JSON.stringify(V);if(RC&&RC.num===a.num&&RC.m===a.memoire&&RC.b===L.blocs&&RC.c===L.corr&&RC.vk===vk)return RC.r;const r=rowsOf_(a,L,V);RC={num:a.num,m:a.memoire,b:L.blocs,c:L.corr,vk,r};return r;}
function rowsOf_(a,L,V){const lib=libOf(a);const F=lib.fill||{};const ix=libIx(L);let holes=0,sel=0,tot=0,words=0;const R={};
  ix.list.forEach(b=>(b.paragraphes||[]).forEach(p=>{tot++;const on=isSel(lib,p);const src=memSanitize(srcOf(L,lib,p.id));const h=fillPara(src,p.id,F,V,'doc').holes;R[p.id]={p,b,on,holes:h,src};if(on){sel++;holes+=h;words+=plain(src).split(' ').filter(Boolean).length;}}));
  return {R,holes,sel,tot,words,lib,F};}
export function memLibCount(a,base){const L=memLib();if(!L)return {holes:0,sel:0,tot:0,words:0};const r=rowsOf(a,L,memLibVars(a,base));return {holes:r.holes,sel:r.sel,tot:r.tot,words:r.words};}
/* mode affiché : choix de l'affaire, sinon bibliothèque si elle est là et que l'affaire n'a pas déjà des sections libres */
export function memLibMode(a){const M=(a&&a.memoire)||{};const loc=(AS().mlbView||{})[a&&a.num];if(loc&&(memLib()||loc==='sections'))return loc;if(M.mode==='lib'||M.mode==='sections')return M.mode==='lib'&&!memLib()?'sections':M.mode;if(!memLib())return 'sections';if(M.lib)return 'lib';return (M.sections||[]).length?'sections':'lib';}
/* étape « prête » (stepState) : en mode bibliothèque choisi pour l'affaire (memoire.lib ou mode 'lib'), plus aucun trou dans les paragraphes cochés */
export function memLibActive(a){const M=(a&&a.memoire)||{};if(!memLib())return false;if(M.mode==='sections')return false;return !!(M.lib||M.mode==='lib');}
export function memLibReady(a,base){const c=memLibCount(a,base);return c.sel>0&&c.holes===0;}

/* ═════════ style SCR (style.json du pack) → CSS ; valeurs contrôlées (couleurs, polices, tailles) ═════════ */
const col=(x,d)=>typeof x==='string'&&/^#[0-9a-fA-F]{3,8}$/.test(x.trim())?x.trim():d;
const fontOk=x=>typeof x==='string'&&/^[\w\s,'À-ÿ.-]{1,160}$/.test(x); // pas de guillemet double : la police va aussi dans des style="…"
const num=(x,d,lo,hi)=>{const v=+x;return isFinite(v)&&v>=lo&&v<=hi?v:d;};
let TS=null;
function styleOf(L){const s=(L&&L.style&&typeof L.style==='object')?L.style:{};if(TS&&TS.src===s)return TS.v;const F=s.fonts||{};const fb=F.fallbacks||{};const c=s.colors||{};
  const fam=(n,d)=>{n=n||d||'Calibri';const f=fb[n];if(fontOk(f))return f;return fontOk(n)?`'${n.replace(/'/g,'')}', Calibri, Carlito, Arial, sans-serif`:'Calibri, Carlito, Arial, sans-serif';};
  const b=s.body||{},h1=s.h1||{},h2=s.h2||{},h3=s.h3||{},h4=s.h4||{};const tb=((s.table||{}).default)||{};const th=tb.header||{};const bd=tb.bandedRows||{};const bo=tb.border||{};const bu=((s.bullets||{}).level1)||{};const ol=s.orderedLists||{};const pg=(s.page||{}).marginsMm||{};
  const cv=(s.cover||{}).blocs||[];const cvT=cv.find(x=>x&&Array.isArray(x.lignes))||cv.find(x=>x&&typeof x.texte==='string')||{};const cvs=o=>num((cv.find(x=>x&&x.ordre===o)||{}).sizePt,0,4,60);
  const H=(h,dSize,dCol,dBold)=>({font:fam(h.font,F.headings||F.body),size:num(h.sizePt,dSize,6,40),bold:h.bold===undefined?dBold:!!h.bold,italic:!!h.italic,caps:!!h.caps,sc:!!h.smallCaps,u:!!h.underline,color:col(h.color,dCol),before:num(h.spaceBeforePt,10,0,60),after:num(h.spaceAfterPt,4,0,60),pb:h.pageBreakBefore!==false});
  const v={body:{font:fam(b.font,F.body),size:num(b.sizePt,12,7,20),color:col(b.color,'#000000'),lh:num(b.lineHeight,1.15,0.8,3),after:Math.max(num(b.spaceAfterPt,0,0,40),6),indent:num(b.indentLeftMm,0,0,40),hse:b.alignHSE==='justify'},
    h1:H(h1,16,'#000000',true),h2:H(h2,15,col(c.titre2,'#E8572B'),false),h3:H(h3,13,col(c.titre3,'#EB6834'),false),h4:H(h4,12,'#000000',true),
    tab:{font:fam(tb.font,F.tables||F.body),size:num(tb.sizePt,10.5,6,16),align:['left','center','right','justify'].includes(tb.align)?tb.align:'center',hf:col(th.fill,col(c.tableauEntete,'#EB6834')),hc:col(th.color,'#000000'),hb:col(th.borderColor,col(c.tableauBordureEntete,'#C0504D')),hbold:!!th.bold,odd:col(bd.odd,col(c.tableauBandeClaire,'#FBE3D3')),even:col(bd.even,'#FFFFFF'),bc:col(bo.color,col(c.tableauBordure,'#D99594')),bw:num(bo.widthPt,0.5,0.25,3)},
    bul:{ch:typeof bu.char==='string'&&bu.char.length<=2&&!/["\\<>]/.test(bu.char)?bu.char:'▪',color:col(bu.color,col(c.puce,'#C0504D')),indent:num(bu.indentMm,12.7,0,40),after:num((s.bullets||{}).spaceAfterPt,8,0,30)},
    ol:{indent:num(ol.indentMm,12.7,0,40)},red:col(c.aCompleter,'#FF0000'),orange:col(c.orangeSCR,'#EB6834'),cover:col(c.texteCouverture,'#212121'),
    margins:[num(pg.top,25,0,60),num(pg.right,21,0,60),num(pg.bottom,22,0,60),num(pg.left,19,0,60)],coverTitle:Array.isArray(cvT.lignes)?cvT.lignes.filter(x=>typeof x==='string').slice(0,5):(typeof cvT.texte==='string'?[cvT.texte]:['MÉMOIRE TECHNIQUE']),
    cvSize:{ville:cvs(1)||32,annee:cvs(2)||32,num:cvs(3)||20,titre:cvs(5)||26,date:cvs(7)||9},numFont:fam((F.coverNumeroAffaire)||'Tahoma'),
    noBreak:(((s.pageBreaks||{}).exceptions)||[]).filter(x=>typeof x==='string').map(norm)};
  TS={src:s,v};return v;}
const hCSS=(sel,h)=>`${sel}{font-family:${h.font};font-size:${h.size}pt;font-weight:${h.bold?'bold':'normal'};${h.italic?'font-style:italic;':''}${h.caps?'text-transform:uppercase;':''}${h.sc?'font-variant:small-caps;':''}${h.u?'text-decoration:underline;':''}color:${h.color};margin:${h.before}pt 0 ${h.after}pt;line-height:1.2;page-break-after:avoid}`;
/* CSS du mémoire : sc = portée (aperçu) ou '' (document exporté) ; word = listes à puces « carré » (Word ne lit pas les puces texte) */
function docCSS(T,sc,word){const s=sc?sc+' ':'';const root=sc||'body';
  return `${root}{font-family:${T.body.font};font-size:${T.body.size}pt;color:${T.body.color};line-height:${Math.round(T.body.lh*100)}%}${s}p{margin:0 0 ${T.body.after}pt ${T.body.indent}mm}`
   +hCSS(s+'h1',T.h1)+hCSS(s+'h2',T.h2)+hCSS(s+'h3',T.h3)+hCSS(s+'h4',T.h4)
   +`${s}ul{margin:0 0 ${T.bul.after}pt;padding-left:${T.bul.indent}mm;list-style-type:${word?'square':`"${T.bul.ch}  "`}}${s}ul>li::marker{color:${T.bul.color}}${s}ol{margin:0 0 ${T.bul.after}pt;padding-left:${T.ol.indent}mm;list-style-type:decimal}${s}li{margin:0}`
   +`${s}table{border-collapse:collapse;width:100%;font-family:${T.tab.font};font-size:${T.tab.size}pt;margin:4pt 0 ${T.bul.after}pt}${s}td,${s}th{padding:0.5mm 1.9mm;vertical-align:middle}${s}td p,${s}th p{margin:0}${s}.ac{color:${T.red};font-style:italic}`;}
/* tableaux : en-tête et lignes alternées en style en ligne (Word ne lit pas :nth-child) ; texte long aligné à gauche */
function styleTables(html,T,wrap){if(html.indexOf('<table>')<0)return html;
  return html.replace(/<table>([\s\S]*?)<\/table>/g,(m,inner)=>{let r=0;const long=/<td[^>]*>[^<]{60,}/.test(inner);
    const rows=inner.replace(/<tr>([\s\S]*?)<\/tr>/g,(mm,cells)=>{if(/<th[\s>]/.test(cells)&&!/<td[\s>]/.test(cells))return `<tr>${cells.replace(/<th(\s[^>]*)?>/g,(t,at)=>`<th${at||''} style="background:${T.tab.hf};color:${T.tab.hc};border:${T.tab.bw}pt solid ${T.tab.hb};font-weight:${T.tab.hbold?'bold':'normal'};text-align:center">`)}</tr>`;
      r++;const bg=r%2?T.tab.odd:T.tab.even;return `<tr>${cells.replace(/<t([dh])(\s[^>]*)?>/g,(t,k,at)=>`<t${k}${at||''} style="background:${bg};border:${T.tab.bw}pt solid ${T.tab.bc};text-align:${long?'left':T.tab.align}">`)}</tr>`;});
    const t=`<table>${rows}</table>`;return wrap?`<div class="memoire-tw">${t}</div>`:t;});}
/* Word : puce couleur SCR, texte noir (la puce prend la couleur du paragraphe de liste) */
const wordLists=(html,T)=>html.replace(/<ul>([\s\S]*?)<\/ul>/g,(m,inner)=>`<ul style="list-style-type:square">${inner.replace(/<li>/g,`<li style="color:${T.bul.color}"><span style="color:${T.body.color}">`).replace(/<\/li>/g,'</span></li>')}</ul>`);

/* ═════════ document exporté (Word .doc HTML et impression) ═════════ */
export function memLibDocHTML(a,base,opt){opt=opt||{};const word=!!opt.word;const L=memLib();if(!L)return '';const T=styleOf(L);const V=memLibVars(a,base);const lib=libOf(a);const F=lib.fill||{};const ix=libIx(L);let n1=0,left=0;const toc=[];const body=[];
  ix.secs.forEach(s=>{let n2=0;const bl=[];s.blocs.forEach(b=>{const ps=(b.paragraphes||[]).filter(p=>isSel(lib,p));if(!ps.length)return;n2++;let n3=0;
      const html=ps.map(p=>{const r=fillPara(memSanitize(srcOf(L,lib,p.id)),p.id,F,V,'doc');left+=r.holes;return (p.titre?`<h3>${n1+1}.${n2}.${++n3} ${esc(p.titre)}</h3>`:'')+r.html;}).join('').replace(/<\/ul>\s*<ul>/g,'');
      bl.push({b,n2,html});toc.push(`<p class="toc2">${n1+1}.${n2} ${esc(b.titre)}</p>`);});
    if(!bl.length)return;n1++;toc.splice(toc.length-bl.length,0,`<p class="toc1">${n1}. ${esc(s.name)}</p>`);const nob=T.noBreak.includes(norm(s.name));
    let h=`<h1${nob?' style="page-break-before:auto"':''}>${n1}. ${esc(s.name)}</h1>`+bl.map(x=>`<h2>${n1}.${x.n2} ${esc(x.b.titre)}</h2>${x.html}`).join('');h=styleTables(h,T,false);if(word)h=wordLists(h,T);
    body.push(T.body.hse&&/\bHSE\b/i.test(s.name)?`<div style="text-align:justify">${h}</div>`:h);});
  const yr=String(new Date().getFullYear());const m=T.margins;
  const cover=`<div class="cover" style="text-align:center;color:${T.cover}"><p style="font-size:${T.cvSize.ville}pt;font-weight:bold;text-transform:uppercase;margin:110pt 0 0;line-height:110%">${esc(V.ville||'')}</p><p style="font-size:${T.cvSize.annee}pt;font-weight:bold;margin:0;line-height:110%">${yr}</p><p style="font-family:${T.numFont};font-size:${T.cvSize.num}pt;margin:14pt 0 6pt">${esc(a.num||'')}</p><p style="margin:0 22%;border-bottom:3pt solid ${T.orange};font-size:3pt;line-height:3pt">&nbsp;</p><p style="font-size:${T.cvSize.titre}pt;font-weight:bold;text-transform:uppercase;line-height:145%;margin:28pt 0 18pt">${T.coverTitle.map(esc).join('<br>')}</p><p style="font-size:14pt;font-weight:bold;margin:0 0 4pt">${esc(a.nom||'')}</p><p style="font-size:13pt;margin:0">${esc(V.client||'')}</p><p style="font-size:${T.cvSize.date}pt;font-weight:bold;margin:60pt 0 0;text-align:right">${esc(V.date)}</p></div>`;
  const css=docCSS(T,'',word)+`.toc1{font-weight:bold;margin:6pt 0 0}.toc2{margin:0 0 0 8mm}.som{font-size:${T.h1.size}pt;font-weight:bold;text-transform:uppercase;margin:0 0 10pt}h1{page-break-before:${T.h1.pb?'always':'auto'}}`
    +(word?`@page WordSection1{size:595.3pt 841.9pt;margin:${m[0]}mm ${m[1]}mm ${m[2]}mm ${m[3]}mm}div.WordSection1{page:WordSection1}`
          :`@page{size:A4;margin:${m[0]}mm ${m[1]}mm ${m[2]}mm ${m[3]}mm;@bottom-left{content:"${qa(String(a.num||'').replace(/[\\"]/g,''))}";font-size:9pt;color:#555}@bottom-right{content:"Page | " counter(page);font-size:10pt;color:#555}}@page:first{@bottom-left{content:none}@bottom-right{content:none}}body{margin:0}.cover{min-height:230mm}`);
  return `<!doctype html><html lang="fr"${word?' xmlns:o="urn:schemas-microsoft-com:office:office" xmlns:w="urn:schemas-microsoft-com:office:word"':''}><head><meta charset="utf-8"><title>Mémoire technique — ${esc(a.num||'')} ${esc(a.nom||'')}</title>${word?'<!--[if gte mso 9]><xml><w:WordDocument><w:View>Print</w:View><w:Zoom>100</w:Zoom></w:WordDocument></xml><![endif]-->':''}<style>${css}</style></head><body><div class="WordSection1">${cover}<p class="som" style="page-break-before:always">Sommaire</p>${toc.join('')}${left?`<p class="ac" style="margin-top:14pt">${left} trou${left>1?'s':''} encore à compléter (en rouge).</p>`:''}${body.join('')||'<p><i>(aucun paragraphe coché)</i></p>'}</div></body></html>`;}
export function memLibWord(a,base){const html=memLibDocHTML(a,base,{word:true});const blob=new Blob(['\ufeff'+html],{type:'application/msword'});const u=URL.createObjectURL(blob);const l=document.createElement('a');l.href=u;l.download='Memoire_technique_'+String(a.num).replace(/[^A-Za-z0-9-]/g,'_')+'.doc';document.body.appendChild(l);l.click();setTimeout(()=>{URL.revokeObjectURL(u);l.remove();},2000);
  const c=memLibCount(a,base);say('⬇ Mémoire technique (.doc), au gabarit SCR'+(c.holes?' — '+c.holes+' trou'+(c.holes>1?'s':'')+' encore en rouge':''));}
export function memLibPrint(a,base){const w=window.open('','_blank');if(!w){say('Autorise les fenêtres pour imprimer');return;}w.document.write(memLibDocHTML(a,base,{word:false}));w.document.close();setTimeout(()=>{try{w.print();}catch(e){}},300);}

/* ═════════ écran : mode bibliothèque ═════════ */
const CSS=`.memoire-card{container-type:inline-size}.memoire-lay{display:grid;grid-template-columns:minmax(0,1fr);gap:10px}.memoire-tree{min-width:0}
@container (min-width:880px){.memoire-lay{grid-template-columns:minmax(300px,380px) minmax(0,1fr)}.memoire-tree{max-height:calc(100dvh - 120px);overflow:auto;position:sticky;top:8px;align-self:start}.memoire-scroll{height:calc(100vh - 170px);height:calc(100dvh - 170px);min-height:420px;overflow:auto}}
.memoire-q{width:100%;box-sizing:border-box;margin:0 0 6px}.memoire-tools{display:flex;flex-wrap:wrap;gap:6px;margin:0 0 6px}
.memoire-sech{display:flex;align-items:center;gap:6px;flex-wrap:wrap;width:100%;min-height:44px;text-align:left;border:1px solid var(--line);border-radius:10px;background:var(--surface);color:inherit;padding:6px 10px;margin:0 0 5px;font:inherit;cursor:pointer}
.memoire-sech b{font-size:13px;flex:1;min-width:0}.memoire-sech small{color:var(--ink2);font-size:11.5px}.memoire-sech.on{border-color:#e7b9a3;background:#fff8f3}
.memoire-bloc{margin:0 0 4px 6px;border-left:2px solid var(--line);padding-left:4px}.memoire-brow,.memoire-prow{display:flex;align-items:stretch;gap:2px}.memoire-prow{margin-left:12px}
.memoire-ck{display:flex;align-items:center;justify-content:center;width:44px;min-height:44px;flex:none;cursor:pointer}.memoire-ck input{width:20px;height:20px;margin:0;cursor:pointer}
.memoire-btx,.memoire-ptx{flex:1;min-width:0;text-align:left;border:0;background:none;font:inherit;color:inherit;padding:4px 6px;cursor:pointer;min-height:44px;display:flex;flex-direction:column;justify-content:center;border-radius:8px}
.memoire-btx b{font-size:13px}.memoire-btx small,.memoire-ptx small{display:block;color:var(--ink2);font-size:11px}.memoire-ptx span{font-size:12.5px;overflow-wrap:anywhere}.memoire-prow:not(.on) .memoire-ptx span{opacity:.6}
.memoire-btx:hover,.memoire-ptx:hover{background:rgba(0,0,0,.05)}.memoire-bad{color:#c62828;font-weight:700}.memoire-tg{display:inline-block;font-size:10.5px;border-radius:6px;padding:0 5px;margin-right:4px;background:#eceae3;color:#555}.memoire-tg.red{background:#fdecea;color:#c62828}
.memoire-doc{border:1px solid var(--line);border-radius:12px;background:#ecebe5;overflow:hidden;min-width:0}.memoire-scroll{padding:14px 12px}
.memoire-page{background:#fff;color:#000;max-width:820px;margin:0 auto;padding:36px 46px 46px;box-shadow:0 1px 4px rgba(0,0,0,.15);overflow-wrap:anywhere}.memoire-tw{overflow-x:auto;max-width:100%}
.memoire-page .memoire-h{display:inline;font:inherit;font-style:italic;color:#d50000;background:#ffecec;border:0;border-bottom:1.5px dashed currentColor;border-radius:3px;padding:0 3px;margin:0;cursor:pointer;line-height:inherit;text-align:left;min-height:0;box-shadow:none}
.memoire-page .memoire-h:focus{outline:2px solid #1f6fd0}.memoire-page span.memoire-h{cursor:default}.memoire-f{border-bottom:1px dotted #1f6fd0;cursor:pointer}.memoire-p{position:relative}
.memoire-pe{position:absolute;right:-42px;top:0;min-width:34px;min-height:34px;border:1px solid var(--line);border-radius:8px;background:#fff;cursor:pointer;opacity:.4;font-size:14px;padding:0}.memoire-p:hover .memoire-pe,.memoire-pe:focus{opacity:1}
.memoire-p.lst:not(.end) ul{margin-bottom:0}.memoire-cv{text-align:center;padding:10px 0 22px;border-bottom:3px solid var(--memoire-or,#EB6834);margin-bottom:16px;color:#212121}.memoire-cv .v{font-size:24px;font-weight:700;text-transform:uppercase}.memoire-cv .y{font-size:20px;font-weight:700}.memoire-cv .n{font-size:16px;margin:6px 0}.memoire-cv .t{font-size:20px;font-weight:700;text-transform:uppercase;line-height:1.35;margin:10px 0}.memoire-cv .c{font-size:13px;color:#555}
.memoire-som{background:#f6f5f0;border-radius:8px;padding:8px 14px;margin:0 0 18px;font-size:13px}.memoire-som ol{margin:4px 0 0;padding-left:0;list-style:none}.memoire-som li{display:flex;gap:6px;align-items:baseline}.memoire-somn{flex:0 0 auto;min-width:1.6em;text-align:right;color:#6b6b66}.memoire-som .lnk{font:inherit;padding:0;text-align:left;min-height:26px;display:inline;line-height:1.5}
.memoire-card.full{position:fixed;inset:0;z-index:1200;margin:0;border-radius:0;overflow:auto;max-width:none}
.memoire-ed{min-height:150px;max-height:52vh;overflow:auto;border:1px solid var(--line);padding:10px 12px;margin:8px 0;box-shadow:none;outline:none}.memoire-ed:focus{box-shadow:0 0 0 2px #1f6fd0}
.memoire-tok{background:#eef3fb;border-radius:3px;padding:0 3px}.memoire-tok.red{color:#d50000;background:#ffecec;font-style:italic}.memoire-mpv{max-height:46vh;overflow:auto;padding:12px 14px;box-shadow:none;border:1px solid var(--line);margin:8px 0}
.memoire-same{display:flex;gap:8px;align-items:center;margin-top:8px;font-size:13px;min-height:44px}.memoire-same input{width:20px;height:20px;flex:none}
.memoire-head{display:flex;flex-wrap:wrap;gap:6px 10px;align-items:flex-start;justify-content:space-between;margin:0 0 4px}.memoire-head h3{flex:1 1 240px;min-width:0;margin:0}
@media(max-width:600px){.memoire-page{padding:18px 14px 26px}.memoire-scroll{padding:8px 6px}.memoire-pe{position:static;float:right;margin:0 0 4px 6px}}`;
let STY=null;
function injectCSS(T){if(typeof document==='undefined')return;if(!document.getElementById('memoire-css')){const st=document.createElement('style');st.id='memoire-css';st.textContent=CSS;document.head.appendChild(st);}
  if(STY!==T){STY=T;let st=document.getElementById('memoire-style');if(!st){st=document.createElement('style');st.id='memoire-style';document.head.appendChild(st);}st.textContent=docCSS(T,'.memoire-page.memoire-scr',false)+`.memoire-page.memoire-scr .memoire-h{color:${T.red}}.memoire-page.memoire-scr{--memoire-or:${T.orange}}.memoire-page.memoire-scr h1{text-decoration-thickness:1px}`;}}
/* défilement gardé d'un rendu à l'autre (arbre, aperçu) ; cases « partiellement cochées » */
const SCR={};let WIRED=false;let CUR=null;let NEXT=-1;
function wire(){if(WIRED||typeof document==='undefined')return;WIRED=true;
  document.addEventListener('scroll',e=>{const t=e.target;if(t&&t.id&&(t.id==='memoire-scroll'||t.id==='memoire-tree'))SCR[t.id]=t.scrollTop;},true);
  document.addEventListener('input',e=>{const t=e.target;if(!t||!t.classList||!t.classList.contains('memoire-q')||!CUR)return;AS().mlbQ=t.value;const a=H.affGet?H.affGet(CUR.num):null;const L=memLib();const box=document.getElementById('memoire-tree-body');if(a&&L&&box){box.innerHTML=treeBody(a,L,rowsOf(a,L,vars(a)),CUR.ro);after();}});
  document.addEventListener('keydown',e=>{if(e.key==='Escape'&&AS().mlbFull&&CUR&&!document.querySelector('#modal.show')){AS().mlbFull=false;if(CUR.render)CUR.render();}});}
function after(){setTimeout(()=>{['memoire-scroll','memoire-tree'].forEach(id=>{const el=document.getElementById(id);if(el&&SCR[id])el.scrollTop=SCR[id];});document.querySelectorAll('#eq-app input[data-mlbind]').forEach(x=>{x.indeterminate=true;});},0);}
const vars=a=>memLibVars(a,H.vars?H.vars(a):{});
function treeBody(a,L,st,ro){const ix=libIx(L);const q=norm(AS().mlbQ||'').trim();const open=AS().mlbSec||{};const exp=AS().mlbExp||{};let found=0;
  const prow=x=>{const p=x.p;const lib=st.lib;const ed=!!(lib.edits&&typeof lib.edits[p.id]==='string');const co=!!(L.corr&&L.corr[p.id]);const t=plain(x.src);
    return `<div class="memoire-prow${x.on?' on':''}"><label class="memoire-ck"><input type="checkbox" ${x.on?'checked':''} ${ro?'disabled':''} data-act="af" data-v="mlbp|${esc(p.id)}" aria-label="Mettre ce paragraphe dans le mémoire"></label><button type="button" class="memoire-ptx" data-act="af" data-v="mlbo|${esc(p.id)}"><span>${p.titre?'<b>'+esc(p.titre)+'</b> · ':''}${esc(t.length>110?t.slice(0,107)+'…':t||'(vide)')}</span><small>${x.holes?`<span class="memoire-tg red">${x.holes} trou${x.holes>1?'s':''}</span>`:''}${p.defaut?'':'<span class="memoire-tg">ajout · à relire</span>'}${ed?'<span class="memoire-tg">modifié ici</span>':''}${co?'<span class="memoire-tg">corrigé</span>':''}</small></button></div>`;};
  const secs=ix.secs.map((s,si)=>{const all=s.blocs.flatMap(b=>(b.paragraphes||[]).map(p=>st.R[p.id]));const hit=x=>!q||norm(s.name+' '+x.b.titre+' '+(x.p.titre||'')+' '+plain(x.src)).includes(q);
    const shown=all.filter(hit);if(q&&!shown.length)return '';found+=q?shown.length:0;const on=all.filter(x=>x.on).length;const holes=all.filter(x=>x.on).reduce((n,x)=>n+x.holes,0);const isOpen=!!q||!!open[si];
    const blocs=isOpen?s.blocs.map(b=>{const ps=(b.paragraphes||[]).map(p=>st.R[p.id]);const sh=ps.filter(hit);if(q&&!sh.length)return '';const n=ps.length,k=ps.filter(x=>x.on).length,hb=ps.filter(x=>x.on).reduce((m,x)=>m+x.holes,0);const bo=!!q||!!exp[b.id];
      return `<div class="memoire-bloc"><div class="memoire-brow"><label class="memoire-ck"><input type="checkbox" ${k===n?'checked':''} ${k&&k<n?'data-mlbind="1"':''} ${ro?'disabled':''} data-act="af" data-v="mlbb|${esc(b.id)}" aria-label="Tout le bloc"></label><button type="button" class="memoire-btx" data-act="af" data-v="mlbexp|${esc(b.id)}"><b>${bo?'▾':'▸'} ${esc(b.titre||'(sans titre)')}</b><small>${k} / ${n} paragraphe${n>1?'s':''}${hb?` · <span class="memoire-bad">${hb} trou${hb>1?'s':''}</span>`:''}</small></button></div>${bo?(q?sh:ps).map(prow).join(''):''}</div>`;}).join(''):'';
    return `<div class="memoire-sec"><button type="button" class="memoire-sech${isOpen?' on':''}" data-act="af" data-v="mlbsec|${si}"><b>${isOpen?'▾':'▸'} ${si+1}. ${esc(s.name)}</b><small>${on} / ${all.length} ¶${holes?` · <span class="memoire-bad">${holes} trou${holes>1?'s':''}</span>`:''}</small></button>${blocs}</div>`;}).join('');
  return (q?`<div class="hint" style="margin:0 0 6px">${found} paragraphe${found>1?'s':''} trouvé${found>1?'s':''}</div>`:'')+(secs||'<div class="eq-s">Rien ne correspond.</div>');}
function previewHTML(a,L,st,V,T,ro,canEdit){const ix=libIx(L);const F=st.F;let n1=0;const secs=[];const toc=[];
  ix.secs.forEach((s,si)=>{let n2=0;const bl=[];s.blocs.forEach(b=>{const ps=(b.paragraphes||[]).filter(p=>st.R[p.id].on);if(!ps.length)return;n2++;let n3=0;const isL=ps.map(p=>/^<ul>[\s\S]*<\/ul>$/.test(st.R[p.id].src));
      const body=ps.map((p,j)=>{const r=fillPara(st.R[p.id].src,p.id,F,V,'app',ro);return `<div class="memoire-p${isL[j]?' lst':''}${isL[j]&&!isL[j+1]?' end':''}" id="memoire-p-${esc(p.id)}">${canEdit?`<button type="button" class="memoire-pe" data-act="af" data-v="mlbo|${esc(p.id)}" title="Modifier ce paragraphe, le retirer…" aria-label="Modifier ce paragraphe">✎</button>`:''}${p.titre?`<h3>${n1+1}.${n2}.${++n3} ${esc(p.titre)}</h3>`:''}${styleTables(r.html,T,true)}</div>`;}).join('');
      bl.push(`<h2>${n1+1}.${n2} ${esc(b.titre)}</h2>${body}`);});
    if(!bl.length)return;n1++;toc.push(`<li><span class="memoire-somn">${n1}.</span><button class="lnk" data-act="af" data-v="mlbgo|${si}">${esc(s.name)}</button></li>`); /* 14/10 nuit : numéro écrit (un bouton qui passe à la ligne décalait le numéro de la liste sur sa dernière ligne) */const h=`<section id="memoire-s-${si}"><h1>${n1}. ${esc(s.name)}</h1>${bl.join('')}</section>`;secs.push(T.body.hse&&/\bHSE\b/i.test(s.name)?`<div style="text-align:justify">${h}</div>`:h);});
  const cover=`<div class="memoire-cv"><div class="v">${esc(V.ville||'')}</div><div class="y">${new Date().getFullYear()}</div><div class="n">${esc(a.num||'')}</div><div class="t">${T.coverTitle.map(esc).join('<br>')}</div><div class="c"><b>${esc(a.nom||'')}</b>${V.client?' · '+esc(V.client):''} · ${esc(V.date)}</div></div>`;
  return cover+(toc.length?`<div class="memoire-som"><b>Sommaire</b><ol>${toc.join('')}</ol></div>`:'')+(secs.join('')||'<div class="eq-s">Aucun paragraphe coché : coche à gauche ce qui va dans le mémoire.</div>');}
export function memLibModeBar(a,mode){const n=(((a||{}).memoire||{}).sections||[]).length;return `<div class="eq-filtres memoire-modes" style="margin-bottom:8px"><button class="chip${mode==='lib'?' active':''}" data-act="af" data-v="mlbmode|lib">📚 Bibliothèque SCR</button><button class="chip${mode==='sections'?' active':''}" data-act="af" data-v="mlbmode|sections">✎ Sections libres${n?' · '+n:''}</button></div>`;}
/* l'étape « 5 · Mémoire » en mode bibliothèque — opt.notes : notes du DCE pour le mémoire (commerce.js) */
export function memLibHTML(a,canEdit,ctx,opt){opt=opt||{};const L=memLib();if(!L)return '';const T=styleOf(L);injectCSS(T);const V=vars(a);const st=rowsOf(a,L,V);const ro=!canEdit;CUR={num:a.num,ro,render:ctx&&ctx.render};const M=a.memoire||{};const ix=libIx(L);
  const used=ix.list.filter(b=>(b.paragraphes||[]).some(p=>st.R[p.id].on)).length;const full=!!AS().mlbFull;
  const stats=`<div class="ac-stats" id="memoire-stats" style="margin-bottom:8px"><div class="ac-stat ${st.holes?'bad':'ok'}" id="memoire-nholes"><b>${st.holes}</b><small>${st.holes?`trou${st.holes>1?'s':''} à combler`:'aucun trou : prêt'}</small></div><div class="ac-stat"><b>${st.sel} / ${st.tot}</b><small>paragraphes cochés</small></div><div class="ac-stat"><b>${used} / ${ix.list.length}</b><small>blocs utilisés</small></div><div class="ac-stat"><b>${nb(st.words)}</b><small>mots dans le mémoire</small></div></div>`;
  const intro=!M.lib&&!ro?`<div class="hint" style="margin:0 0 8px">Coché d'office : ce qui figure dans les mémoires SCR actuels. « Ajout · à relire » : paragraphes rédigés pour compléter, à lire avant de les cocher. En rouge : ce qu'il reste à compléter pour cette affaire (touche pour saisir).</div>`:'';
  const tree=`<div class="memoire-tree" id="memoire-tree"><input class="f memoire-q" type="search" placeholder="🔎 Rechercher un paragraphe, un bloc…" value="${esc(AS().mlbQ||'')}" aria-label="Rechercher dans la bibliothèque"><div class="memoire-tools"><button class="btn sm" data-act="af" data-v="mlbsecall|1">Tout déplier</button><button class="btn sm" data-act="af" data-v="mlbsecall|0">Tout replier</button>${canEdit&&M.lib&&Object.keys(M.lib.sel||{}).length?`<button class="btn sm" data-act="af" data-v="mlbreset|" title="Revenir aux paragraphes cochés par défaut (les trous remplis sont gardés)">↺ Choix par défaut</button>`:''}</div><div id="memoire-tree-body">${treeBody(a,L,st,ro)}</div></div>`;
  const card=`<div class="card memoire-card${full?' full':''}" id="memoire-card"><div class="memoire-head"><h3>Mémoire technique · bibliothèque SCR</h3><span class="eq-acts" style="margin:0">${st.holes&&!ro?`<button class="btn sm" data-act="af" data-v="mlbnext|" title="Aller au prochain trou rouge">⚠ Trou suivant</button>`:''}<button class="btn sm" data-act="af" data-v="mprint|">🖨 PDF</button><button class="btn sm" data-act="af" data-v="mword|">⬇ Word (.doc)</button><button class="btn sm" data-act="af" data-v="mlbfull|" title="${full?'Quitter le plein écran':'Plein écran'}">${full?'⤡ Quitter':'⤢'}</button></span></div>
    <div class="hint" style="margin:0 0 8px">Coche les paragraphes ; l’aperçu montre le mémoire tel qu’il sortira (gabarit SCR${L.version?' · bibliothèque v'+esc(L.version):''}).</div>${intro}<div class="memoire-lay">${tree}<div class="memoire-doc"><div class="memoire-scroll" id="memoire-scroll"><div class="memoire-page memoire-scr">${previewHTML(a,L,st,V,T,ro,canEdit)}</div></div></div></div></div>`;
  after();return (opt.top||'')+(opt.notes||'')+stats+card;}

/* ═════════ actions (data-act="af" data-v="mlb…") — renvoie true si traitée ═════════ */
function libSet(a,fn){const cur=(H.affGet&&H.affGet(a.num))||a;const M=Object.assign({},cur.memoire||{});const lib=Object.assign({},M.lib||{});lib.sel=Object.assign({},lib.sel||{});lib.fill=Object.assign({},lib.fill||{});lib.edits=Object.assign({},lib.edits||{});fn(lib);M.lib=lib;if(!M.mode)M.mode='lib';M.libAt=new Date().toISOString();H.affSet(a.num,{memoire:M});}
export function memLibAct(k,arg,arg2,arg3,a,ctx){if(!/^mlb/.test(k))return false;const canEdit=!!ctx.canEdit;const render=()=>{if(ctx.render)ctx.render();};const L=memLib();
  if(k==='mlbmode'){const mode=arg==='lib'?'lib':'sections';if(mode==='lib'&&!L){say('Bibliothèque SCR absente : à importer avec le pack SCR');return true;}const v=AS().mlbView=AS().mlbView||{};if(canEdit){delete v[a.num];const M=Object.assign({},a.memoire||{},{mode});H.affSet(a.num,{memoire:M});}else v[a.num]=mode;render();return true;}
  if(!L)return true;const ix=libIx(L);
  switch(k){
    case 'mlbsec':{const o=AS().mlbSec=Object.assign({},AS().mlbSec||{});o[arg]=!o[arg];render();return true;}
    case 'mlbsecall':{AS().mlbSec=arg==='1'?Object.fromEntries(ix.secs.map((s,i)=>[i,true])):{};if(arg!=='1')AS().mlbExp={};render();return true;}
    case 'mlbexp':{const o=AS().mlbExp=Object.assign({},AS().mlbExp||{});o[arg]=!o[arg];render();return true;}
    case 'mlbp':{if(!canEdit)return true;const x=ix.P[arg];if(!x)return true;libSet(a,lib=>{lib.sel[arg]=!isSel(lib,x.p);});render();return true;}
    case 'mlbb':{if(!canEdit)return true;const b=ix.list.find(x=>x.id===arg);if(!b)return true;const lib0=libOf(a);const all=(b.paragraphes||[]).every(p=>isSel(lib0,p));libSet(a,lib=>{(b.paragraphes||[]).forEach(p=>{lib.sel[p.id]=!all;});});const o=AS().mlbExp=Object.assign({},AS().mlbExp||{});o[b.id]=true;render();say(all?'Bloc « '+b.titre+' » retiré du mémoire':'Bloc « '+b.titre+' » : tous ses paragraphes sont dans le mémoire');return true;}
    case 'mlbreset':{if(!canEdit)return true;if(!confirm('Revenir aux paragraphes cochés par défaut ? Les trous déjà remplis et les textes modifiés sont gardés.'))return true;libSet(a,lib=>{lib.sel={};});render();return true;}
    case 'mlbh':{if(!canEdit)return true;holeModal(a,L,arg,+arg2,ctx);return true;}
    case 'mlbv':{if(!canEdit)return true;varModal(a,arg,ctx);return true;}
    case 'mlbo':{paraModal(a,L,arg,ctx);return true;}
    case 'mlbgo':{const el=document.getElementById('memoire-s-'+arg);if(el)el.scrollIntoView({block:'start',behavior:'smooth'});return true;}
    case 'mlbnext':{const hs=[...document.querySelectorAll('#memoire-scroll button.memoire-h')];if(!hs.length){say('Aucun trou rouge');return true;}NEXT=(NEXT+1)%hs.length;hs[NEXT].scrollIntoView({block:'center',behavior:'smooth'});try{hs[NEXT].focus({preventScroll:true});}catch(e){}return true;}
    case 'mlbfull':{AS().mlbFull=!AS().mlbFull;render();return true;}
  }
  return true;}
/* saisie d'un trou [[À COMPLÉTER : …]] ; « même valeur partout » = les autres trous de même libellé encore vides (cochés ou non) */
function holeModal(a,L,pid,i,ctx){const lib=libOf(a);const F=lib.fill||{};const it=scan(memSanitize(srcOf(L,lib,pid)),pid).filter(x=>x.t==='h')[i];if(!it)return;const cur=F[it.key]||'';const ix=libIx(L);
  const others=[];ix.list.forEach(b=>(b.paragraphes||[]).forEach(p=>{scan(memSanitize(srcOf(L,lib,p.id)),p.id).forEach(x=>{if(x.t==='h'&&x.lab===it.lab&&x.key!==it.key&&!filled(F[x.key]))others.push(x.key);});}));
  const x=ix.P[pid];A.openModal(`<h3 style="margin-top:0">À compléter</h3><div class="hint" style="margin:0 0 6px">${x?esc(x.b.titre)+' · ':''}<b style="color:#d50000">${it.lab}</b></div><input class="f" id="memoire-hv" value="${esc(cur)}" placeholder="${qa(it.lab)}" autocomplete="off">${others.length?`<label class="memoire-same"><input type="checkbox" id="memoire-hall"> Même valeur pour ${others.length===1?'l’autre trou':'les '+others.length+' autres trous'} « ${it.lab} » encore vide${others.length>1?'s':''}</label>`:''}
    <div class="actions" style="margin-top:8px"><button class="btn primary block" id="memoire-hok">Enregistrer</button>${cur?'<button class="btn block" id="memoire-hclr">Vider (redevient rouge)</button>':''}<button class="btn block" data-close>Annuler</button></div>`);
  const inp=document.getElementById('memoire-hv');const save=clear=>{const v=clear?'':String(inp.value||'').trim();const all=!clear&&!!(document.getElementById('memoire-hall')||{}).checked;libSet(a,lib2=>{if(v)lib2.fill[it.key]=v;else delete lib2.fill[it.key];if(all&&v)others.forEach(k2=>{lib2.fill[k2]=v;});});A.closeModal();if(ctx.render)ctx.render();say(v?(all?'Rempli ici et sur '+others.length+' autre'+(others.length>1?'s':'')+' trou'+(others.length>1?'s':''):'Trou rempli'):'Trou vidé : il redevient rouge');};
  document.getElementById('memoire-hok').onclick=()=>save(false);const c=document.getElementById('memoire-hclr');if(c)c.onclick=()=>save(true);inp.onkeydown=e=>{if(e.key==='Enter'){e.preventDefault();save(false);}};setTimeout(()=>{try{inp.focus();}catch(e){}},50);}
function varModal(a,name,ctx){const V=vars(a);const lib=libOf(a);const key='{{'+name+'}}';const cur=(lib.fill||{})[key]||'';const known=name in V;
  A.openModal(`<h3 style="margin-top:0">À compléter : ${esc(VAR_LAB[name]||name)}</h3><div class="hint" style="margin:0 0 6px">${known?(name==='delai'?'Vide dans l’affaire : renseigne-le dans 1 · Dossier, ou saisis ici la valeur pour ce mémoire.':['nb','ml','jS','jM','dns','soudParDn','equipes'].includes(name)?'Calculé depuis le chiffrage (vide tant qu’il n’est pas fait) : saisis ici une valeur pour ce mémoire, ou fais le chiffrage.':'Vide dans l’affaire : saisis ici la valeur pour ce mémoire (ou renseigne la fiche de l’affaire).'):'Variable {{'+esc(name)+'}} inconnue de l’appli : saisis la valeur pour ce mémoire.'}</div><input class="f" id="memoire-vv" value="${esc(cur)}" autocomplete="off">
    <div class="actions" style="margin-top:8px"><button class="btn primary block" id="memoire-vok">Enregistrer</button>${cur?'<button class="btn block" id="memoire-vclr">Vider (redevient rouge)</button>':''}<button class="btn block" data-close>Annuler</button></div>`);
  const inp=document.getElementById('memoire-vv');const save=clear=>{const v=clear?'':String(inp.value||'').trim();libSet(a,lib2=>{if(v)lib2.fill[key]=v;else delete lib2.fill[key];});A.closeModal();if(ctx.render)ctx.render();say(v?'Valeur enregistrée pour ce mémoire':'Valeur vidée');};
  document.getElementById('memoire-vok').onclick=()=>save(false);const c=document.getElementById('memoire-vclr');if(c)c.onclick=()=>save(true);inp.onkeydown=e=>{if(e.key==='Enter'){e.preventDefault();save(false);}};setTimeout(()=>{try{inp.focus();}catch(e){}},50);}
/* fiche d'un paragraphe : lire (même décoché), mettre / retirer, modifier pour cette affaire, corriger la bibliothèque */
function paraModal(a,L,pid,ctx){const ix=libIx(L);const x=ix.P[pid];if(!x)return;const canEdit=!!ctx.canEdit;const lib=libOf(a);const on=isSel(lib,x.p);const ed=typeof (lib.edits||{})[pid]==='string';const co=L.corr&&L.corr[pid];const T=styleOf(L);injectCSS(T);
  const r=fillPara(memSanitize(srcOf(L,lib,pid)),pid,lib.fill||{},vars(a),'app',true);
  A.openModal(`<h3 style="margin-top:0">${esc(x.b.titre||'(sans titre)')}</h3><div class="hint">${esc(x.s.name)}${x.p.titre?' › '+esc(x.p.titre):''} · ${on?'<b>dans le mémoire</b>':'pas dans le mémoire'}${x.p.defaut?' · coché d’office':' · ajout à relire'}${ed?' · modifié pour cette affaire':''}${co?' · corrigé dans la bibliothèque le '+esc(dFR(co.at))+(co.by?' par '+esc(co.by):''):''}</div>
    <div class="memoire-page memoire-scr memoire-mpv">${styleTables(r.html,T,true)}</div>
    <div class="actions" style="display:flex;flex-direction:column;gap:6px">${canEdit?`<button class="btn ${on?'':'primary '}block" id="memoire-pon">${on?'☐ Retirer du mémoire':'☑ Mettre dans le mémoire'}</button><button class="btn block" id="memoire-ped">✎ Modifier pour cette affaire</button>${ed?'<button class="btn block" id="memoire-prs">↺ Revenir au texte de la bibliothèque</button>':''}<button class="btn block" id="memoire-pco">📚 Corriger dans la bibliothèque (tous les mémoires)</button>${co?'<button class="btn block" id="memoire-pcr">↺ Bibliothèque : revenir au texte importé</button>':''}`:''}<button class="btn block" data-close>Fermer</button></div>`);
  if(!canEdit)return;const g=id=>document.getElementById(id);const done=t=>{A.closeModal();if(ctx.render)ctx.render();if(t)say(t);};
  g('memoire-pon').onclick=()=>{libSet(a,l=>{l.sel[pid]=!on;});done(on?'Paragraphe retiré du mémoire':'Paragraphe ajouté au mémoire');};
  g('memoire-ped').onclick=()=>editModal(a,L,pid,ctx,'aff');g('memoire-pco').onclick=()=>editModal(a,L,pid,ctx,'lib');
  if(g('memoire-prs'))g('memoire-prs').onclick=()=>{if(!confirm('Reprendre le texte de la bibliothèque pour ce paragraphe ? Ta version pour cette affaire est abandonnée.'))return;libSet(a,l=>{delete l.edits[pid];});done('Texte de la bibliothèque repris');};
  if(g('memoire-pcr'))g('memoire-pcr').onclick=()=>{if(!confirm('Annuler la correction de la bibliothèque (retour au texte importé du pack) ?'))return;const c2=Object.assign({},L.corr||{});delete c2[pid];regSet('doc','memlib',{corr:c2});done('Bibliothèque : texte importé repris');};}
/* éditeur : trous et valeurs = jetons non modifiables (on les garde ou on les supprime) ; enregistré en HTML nettoyé, trous et variables remis en [[…]] / {{…}} */
function editModal(a,L,pid,ctx,scope){const lib=libOf(a);const src=memSanitize(scope==='aff'?srcOf(L,lib,pid):libSrc(L,pid));const F=scope==='aff'?(lib.fill||{}):{};const V=scope==='aff'?vars(a):{};const seen={};
  const html=src.replace(RX,(m,h,vn)=>{if(h!==undefined){const lab=holeLab(h);const n=seen[lab]=(seen[lab]===undefined?0:seen[lab]+1);const key=pid+'|'+lab+'|'+n;const val=F[key];return `<span class="memoire-tok${filled(val)?'':' red'}" contenteditable="false" data-src="${qa(m)}" data-k="${qa(key)}" data-lab="${qa(lab)}">${filled(val)?esc(val):lab}</span>`;}
    const val=fmtVar(V[vn])||(filled(F['{{'+vn+'}}'])?String(F['{{'+vn+'}}']):'');return `<span class="memoire-tok${val?'':' red'}" contenteditable="false" data-src="${qa(m)}">${val?esc(val):'{{'+vn+'}}'}</span>`;});
  A.openModal(`<h3 style="margin-top:0">${scope==='aff'?'Modifier pour cette affaire':'Corriger dans la bibliothèque SCR'}</h3><div class="hint">${scope==='aff'?'Seulement le mémoire de '+esc(a.num)+' : la bibliothèque ne change pas.':'<b>Pour tous les mémoires</b> qui utilisent ce paragraphe (y compris ceux en cours) ; un texte modifié pour une affaire reste tel quel.'} Les zones en couleur sont des trous ou des valeurs de l’affaire : garde-les ou supprime-les, sans les retaper.</div>
    <div class="memoire-page memoire-scr memoire-ed" id="memoire-ed" contenteditable="true" spellcheck="true">${html}</div><div class="actions" style="margin-top:8px"><button class="btn primary block" id="memoire-eok">Enregistrer</button><button class="btn block" data-close>Annuler</button></div>`);
  const ed=document.getElementById('memoire-ed');ed.addEventListener('paste',e=>{e.preventDefault();const t=(e.clipboardData||window.clipboardData).getData('text/plain');document.execCommand('insertText',false,t);});
  document.getElementById('memoire-eok').onclick=()=>{const c=ed.cloneNode(true);const oldBy={};c.querySelectorAll('.memoire-tok').forEach(t=>{if(t.dataset.k){(oldBy[t.dataset.lab]=oldBy[t.dataset.lab]||[]).push(t.dataset.k);}t.replaceWith(document.createTextNode(t.dataset.src||''));});
    const out=memSanitize(c.innerHTML);if(!plain(out)&&!/<table>/.test(out)){say('Texte vide : pour enlever le paragraphe, décoche-le');return;}
    if(scope==='aff'){const same=out===memSanitize(libSrc(L,pid));const newBy={};scan(out,pid).forEach(it=>{if(it.t==='h')(newBy[it.lab]=newBy[it.lab]||[]).push(it.key);});
      libSet(a,l=>{const f2={};Object.keys(l.fill).forEach(k2=>{if(!k2.startsWith(pid+'|'))f2[k2]=l.fill[k2];});Object.keys(newBy).forEach(lab=>{newBy[lab].forEach((nk,j)=>{const ok=(oldBy[lab]||[])[j];if(ok&&filled(l.fill[ok]))f2[nk]=l.fill[ok];});});l.fill=f2;if(same)delete l.edits[pid];else l.edits[pid]=out;});
      A.closeModal();if(ctx.render)ctx.render();say(same?'Texte identique à la bibliothèque':'Paragraphe modifié pour '+a.num+' (la bibliothèque ne change pas)');}
    else{if(!confirm('Corriger ce paragraphe dans la bibliothèque SCR, pour tous les mémoires ?'))return;const c2=Object.assign({},L.corr||{});c2[pid]={html:out,at:new Date().toISOString(),by:who(null)};regSet('doc','memlib',{corr:c2});A.closeModal();if(ctx.render)ctx.render();say('📚 Bibliothèque corrigée');}};
  setTimeout(()=>{try{ed.focus();}catch(e){}},50);}
