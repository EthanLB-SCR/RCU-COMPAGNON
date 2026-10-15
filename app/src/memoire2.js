// memoire2.js — 14/10 nuit : BIBLIOTHÈQUE DE BLOCS DU MÉMOIRE TECHNIQUE SCR (volet Commerce, étape « 5 · Mémoire » de commerce.js).
// Ethan : « il faut créer les blocs pré-faits, qu'ils soient vraiment garnis, design comme sur nos mémoires actuels, je ne dois pas perdre ; juste c'est plusieurs
// blocs et je choisis les paragraphes que je mets ou non ; que tout soit bien rédigé et que ça mette en rouge le vide à combler quand c'est une quantité,
// le nom d'un dossier ou quelque chose comme ça ».
// · Bibliothèque = registre « doc », ligne « memlib » : {kind:'memlib', req:{none:true} (jamais « à signer »), blocs, style, images, reglages, version, at, by, corr}.
//   Le vrai contenu n'entre QUE par le pack SCR (privé) : memoirePackImport. corr = corrections faites dans l'appli {<paraId>:{html, at, by}} (gardées si on réimporte).
// · Par affaire : affaire.memoire.lib = {sel:{<paraId>:true|false}, fill:{<clé du trou>:valeur}, edits:{<paraId>:html}, inter:{re, chef, ops}} ; affaire.memoire.mode = 'lib' | 'sections'.
//   Coché = sel[id] si choisi, sinon « defaut » du paragraphe (et sa condition « cond » d'après le chiffrage). Trou = [[À COMPLÉTER : …]] (clé <paraId>|<libellé>|<rang>)
//   ou variable {{nom}} vide / inconnue (clé {{nom}}). L'ancien mode « sections libres » (commerce.js) reste entier : rien n'est supprimé.
// 14/10 après-midi (lot B) — retours d'Ethan : visuels du pack (paragraphes « image » avec légende, organigramme « Moyens humains » dessiné depuis l'annuaire),
//   bibliothèque recentrée sur le mémoire du Mans (pack), paragraphes cochés / décochés d'office selon le chiffrage (cond), description de la prestation et
//   hors prestations depuis les postes chiffrés, équipes du planning = jours de soudure ÷ jours ouvrés, trous remplis seuls (affaire, annuaire, DCE, documents
//   d'entreprise), table numérotée comme le mémoire (titres vides grisés, clic au milieu → table), défilement vers un bloc ajouté / retiré, navigation des trous
//   collante, pages estimées, export Word .docx (memoire3_docx.js) et PDF mis en page (garde, sommaire paginé, en-têtes / pieds de page). Données : memoire3.js.
import {regGet,regSet} from './reg.js';
import {mem3Init,memFacts,memInter,memVars3,VAR_LAB3,condEval,condLabel,autoHoleVar,equipeModel,equipeHTML,entDocs,imgOf,imgBytes,packImages,estimatePages,injectLotB,persName,SECT_LAB,ROLE_LAB,memDocsDce,entValid} from './memoire3.js';
import {buildDocx} from './memoire3_docx.js';
import {selInit,selAct,selPCk,selPTag,selBCk,selRows,selSCk,selSCount,selVarTag,m1Intro,m1Models,m1Tools,m1ParaX,m1BlocX,m1BlocAdd,m1SecAdd} from './memoire_sel.js'; // 14/10 soir (lot M1) : cochage / décochage simplifié
import {trousInit,m2Bind,m2X,m2Sig,m2Para,m2Res,m2Show,m2Post,m2EqLabs,m2Tile,m2Nav,m2HoleModal,m2AllModal} from './memoire_trous.js'; // 14/10 soir (lot M2) : moins de trous rouges
import {buildPdf,pdfInfo,pdfExportBtns} from './memoire3_pdf.js'; // 14/10 soir (lot M3) : export PDF direct (pdfmake servi à côté de l'appli)
let A=null,H={};
export function memLibInit(api,helpers){A=api;H=helpers||{};mem3Init(api);wire();}
const esc=s=>String(s??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const qa=s=>String(s??'').replace(/"/g,'&quot;'); // texte déjà nettoyé (sans < >) → attribut
const nb=x=>(+x||0).toLocaleString('fr-FR');
const dFR=x=>x?new Date(x).toLocaleDateString('fr-FR'):'';
const norm=s=>String(s||'').normalize('NFD').replace(/[\u0300-\u036f]/g,'').replace(/[’‘`]/g,"'").toLowerCase();
const AS=()=>(H.AS?H.AS():(H._as||(H._as={})));
const say=t=>{try{if(A&&A.toast)A.toast(t);}catch(e){}};
const who=ctx=>{try{if(ctx&&ctx.api&&ctx.api.userName)return ctx.api.userName();if(ctx&&ctx.me)return [ctx.me.prenom,ctx.me.nom].filter(Boolean).join(' ')||ctx.me.id||'';if(A&&A.userName)return A.userName();}catch(e){}return '';};
const cssStr=s=>String(s??'').replace(/[\\"]/g,'').replace(/[\r\n]+/g,' '); // chaîne CSS (content:"…")

/* ═════════ PACK : import de la bibliothèque (appelé par l'écran d'import du pack SCR) ═════════ */
const ID_OK=/^[A-Za-z0-9._:-]{1,80}$/;
export async function memoirePackImport(part,ctx){let p=part;if(typeof p==='string')p=JSON.parse(p);if(!p||typeof p!=='object')throw new Error('Mémoire : partie « memoire » du pack absente ({blocs, style})');
  let blocs=p.blocs;if(typeof blocs==='string')blocs=JSON.parse(blocs);let style=p.style;if(typeof style==='string')style=JSON.parse(style);let imgs=p.images;if(typeof imgs==='string')imgs=JSON.parse(imgs);
  if(!Array.isArray(blocs)||!blocs.length)throw new Error('Mémoire : blocs.json doit être une liste de blocs');
  const imgIds=new Set(Object.keys(imgs&&typeof imgs==='object'?imgs:{}));const missing=new Set();
  const bIds=new Set(),pIds=new Set();let np=0,nd=0,nh=0,ni=0;const secs=new Set();
  const clean=blocs.map((b,i)=>{if(!b||typeof b!=='object'||!ID_OK.test(String(b.id||''))||!Array.isArray(b.paragraphes))throw new Error('Mémoire : bloc n° '+(i+1)+' invalide (id, paragraphes)');if(bIds.has(b.id))throw new Error('Mémoire : bloc en double « '+b.id+' »');bIds.add(b.id);secs.add(String(b.section||'Autres'));
    return Object.assign({},b,{id:String(b.id),section:String(b.section||'Autres'),titre:String(b.titre||''),ordre:isFinite(+b.ordre)?+b.ordre:(i+1)*10,paragraphes:b.paragraphes.map((q,j)=>{if(!q||!ID_OK.test(String(q.id||'')))throw new Error('Mémoire : paragraphe n° '+(j+1)+' du bloc « '+b.id+' » sans identifiant valable');if(pIds.has(q.id))throw new Error('Mémoire : paragraphe en double « '+q.id+' »');pIds.add(q.id);np++;if(q.defaut===true)nd++;nh+=(String(q.html||'').match(/\[\[[^\[\]]{1,400}?\]\]/g)||[]).length;
      const o=Object.assign({},q,{id:String(q.id),titre:String(q.titre||''),html:String(q.html||''),defaut:q.defaut===true});
      if(q.type==='image'){o.type='image';ni++;o.img=String(q.img||'');if(!imgIds.has(o.img))missing.add(o.img||'?');}else if(q.type==='equipe')o.type='equipe';else delete o.type; /* 14/10 après-midi (lot B) : paragraphes image et organigramme */
      if(q.cond!==undefined&&q.cond!==null&&q.cond!=='')o.cond=String(q.cond).slice(0,120);else delete o.cond;return o;})});});
  if(missing.size)throw new Error('Mémoire : image(s) absente(s) de « images » : '+[...missing].slice(0,6).join(', '));
  const old=regGet('doc','memlib');const version=((old&&+old.version)||0)+1;const kept=old&&old.corr?Object.keys(old.corr).filter(k=>pIds.has(k)).length:0;
  const IM=imgIds.size?await packImages(imgs,ctx):{images:{},up:0,kept:0,bad:0}; /* stockage si connecté, data URL sinon (memoire3.js) */
  const row={kind:'memlib',req:{none:true},title:'Mémoire technique : bibliothèque de blocs SCR',blocs:clean,images:IM.images,version,at:new Date().toISOString(),by:who(ctx)};
  if(style&&typeof style==='object')row.style=style;
  regSet('doc','memlib',row); /* fusion : les corrections (corr) et les réglages (QHSE, administratif) faits dans l'appli sont gardés */
  const ni2=Object.keys(IM.images).length;
  return `Mémoire technique : ${clean.length} blocs, ${np} paragraphes (${nd} cochés par défaut), ${secs.size} sections, ${nh} trous à compléter${row.style?', gabarit SCR':(old&&old.style?', gabarit déjà en place conservé':', sans gabarit (style par défaut)')}${ni2?` · ${ni2} image${ni2>1?'s':''} (${ni} paragraphe${ni>1?'s':''} image ; ${IM.up?IM.up+' au stockage':'gardées dans l’appli, hors connexion'}${IM.up&&IM.kept?', '+IM.kept+' gardées dans l’appli':''}${IM.bad?', '+IM.bad+' illisible'+(IM.bad>1?'s':''):''})`:''} · version ${version}${kept?' · '+kept+' correction'+(kept>1?'s':'')+' de l’appli conservée'+(kept>1?'s':''):''}`;}
export const memoirePack={key:'memoire',label:'Mémoire technique : bibliothèque de blocs SCR',import:memoirePackImport};

/* ═════════ bibliothèque, index, texte des paragraphes ═════════ */
export function memLib(){let r=null;try{r=regGet('doc','memlib');}catch(e){r=null;}return r&&!r.deleted&&Array.isArray(r.blocs)&&r.blocs.length?r:null;}
let IX=null;
function libIx(L){if(IX&&IX.blocs===L.blocs)return IX;const list=L.blocs.map((b,i)=>({b,i})).sort((x,y)=>((+x.b.ordre||0)-(+y.b.ordre||0))||x.i-y.i).map(x=>x.b);const secs=[];const S={};const P={};
  list.forEach(b=>{const k=String(b.section||'Autres');let s=S[k];if(!s){s=S[k]={name:k,blocs:[],i:secs.length};secs.push(s);}s.blocs.push(b);(b.paragraphes||[]).forEach(p=>{P[p.id]={p,b,s};});});
  IX={blocs:L.blocs,list,secs,P};return IX;}
const libOf=a=>(((a||{}).memoire||{}).lib)||{};
const kindOf=p=>p&&p.type==='image'?'image':p&&p.type==='equipe'?'equipe':'html';
/* coché : choix de l'affaire, sinon « defaut » ; 14/10 après-midi : un paragraphe « cond » suit le chiffrage (déchargement non chiffré → décoché d'office ;
   « !k » = hors prestation quand k n'est pas chiffré, jamais sans chiffrage) */
const isSel=(lib,p,K)=>{const v=(lib.sel||{})[p.id];if(v!==undefined)return !!v;const d=p.defaut===true;if(!p.cond||!K)return d;const c=condEval(p.cond,K.F,K.ext);if(c===null)return d&&!/^\s*!/.test(p.cond);return d&&c;};
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
const VAR_LAB=Object.assign({nom:'nom de l’affaire',ville:'ville',client:'client',num:'n° d’affaire',nb:'nombre de soudures (chiffrage)',ml:'ml de tranchée (chiffrage)',jS:'jours de soudage (chiffrage)',jM:'jours de manchonnage (chiffrage)',dns:'DN du réseau (chiffrage)',soudParDn:'soudures par DN (chiffrage)',equipes:'nombre de soudeurs',delai:'délai d’exécution (1 · Dossier)',date:'date du mémoire',annee:'année',moa:'maître d’ouvrage',moe:'maître d’œuvre',lot:'lot',procedure:'procédure',cp:'code postal',charge:'chargé d’affaires',cdtx:'conducteur de travaux',dateReponse:'date de remise de l’offre'},VAR_LAB3);
/* variables « bloc » : HTML généré par l'appli (listes, tableaux) — seules dans leur paragraphe */
const RICH=new Set(['listeDn','prestationsZones','datesZones','docsDce','listeRacc','listeSst','listeEssais','docsEntreprise','autresPrestations','autresFournitures']);
const RICH_RX=new RegExp('<p>\\s*(\\{\\{\\s*(?:'+[...RICH].join('|')+')\\s*\\}\\})\\s*</p>','g');
const prepRich=s=>s.indexOf('{{')<0?s:s.replace(RICH_RX,'$1');
/* valeurs : champs de l'affaire, puis memoireVars(a) de commerce.js (passé en « base ») qui a le dernier mot */
export function memLibVars(a,base){a=a||{};const c=a.consult||{};const now=new Date();return Object.assign({num:a.num||'',nom:a.nom||'',client:a.client||'',ville:a.ville||'',cp:a.cp||'',moa:a.moa||'',moe:a.moe||'',charge:a.charge||'',cdtx:a.cdtx||'',lot:c.lot||'',procedure:c.procedure||'',delai:c.delai||'',dateReponse:a.dateReponse?dFR(a.dateReponse):'',date:now.toLocaleDateString('fr-FR'),annee:String(now.getFullYear())},base||{});}
const fmtVar=x=>{if(x===null||x===undefined)return '';if(typeof x==='number'){if(!isFinite(x)||x===0)return '';return x.toLocaleString('fr-FR',{maximumFractionDigits:Number.isInteger(x)?0:1});}if(typeof x==='object')return '';return String(x).trim();}; // 0 = pas de chiffrage → trou rouge
const RX=/\[\[([^\[\]<>]{1,400}?)\]\]|\{\{\s*([A-Za-z_][A-Za-z0-9_]*)\s*\}\}/g;
const holeLab=t=>String(t).replace(/^\s*À\s+COMPL[ÉE]TER\s*:?\s*/i,'').trim()||'à compléter';
const filled=v=>v!==undefined&&v!==null&&String(v).trim()!=='';
/* trous d'un paragraphe (HTML nettoyé), dans l'ordre : {t:'h', i, lab, key} | {t:'v', name} */
function scan(html,pid){const out=[];let i=-1;const seen={};html.replace(RX,(m,h,vn)=>{if(h!==undefined){i++;const lab=holeLab(h);const n=seen[lab]=(seen[lab]===undefined?0:seen[lab]+1);out.push({t:'h',i,lab,key:pid+'|'+lab+'|'+n});}else out.push({t:'v',name:vn});return m;});return out;}
/* rendu d'un paragraphe : mode 'app' (trous cliquables), 'doc' (export : trou = [À COMPLÉTER : …] en rouge) ; renvoie {html, holes}
   14/10 après-midi : une valeur saisie pour ce mémoire passe avant la valeur calculée ; un trou dont le libellé est connu (e-mail de contact, nom du maître
   d'œuvre, nombre de sous-stations…) est rempli d'office (bleu, touche pour changer) ; variable « bloc » ({html}) = liste générée */
/* 14/10 soir (lot M2, memoire_trous.js) : saisi > d'office (affaire, chiffrage, annuaire, contexte du paragraphe, n° d'annexe) > retenu pour tous les mémoires > facultatif > rouge ;
   X = contexte de l'affaire (sinon celui posé sur V par memK) ; renvoie aussi labs (infos rouges : un libellé = une info) */
function fillPara(html,pid,F,V,mode,ro,X){let i=-1;const seen={};let holes=0;const doc=mode==='doc';X=X||m2X(V);const PI=m2Para(html,pid);const labs=[];
  const out=html.replace(RX,(m,h,vn)=>{
    if(h!==undefined){i++;const lab=holeLab(h);const n=seen[lab]=(seen[lab]===undefined?0:seen[lab]+1);const r=m2Res(X,PI,pid,i,lab,n,F,V);const val=r.st==='f'?r.v:'';
      if(filled(val))return doc?esc(val):`<span class="memoire-f"${ro?'':` data-act="af" data-v="mlbh|${esc(pid)}|${i}" role="button" tabindex="0"`} title="${qa(lab)}${ro?'':' — touche pour modifier'}">${esc(val)}</span>`;
      if(r.st!=='h')return m2Show(r,lab,pid,i,doc,ro);
      holes++;labs.push(r.g);return doc?`<span class="ac">[À COMPLÉTER : ${lab}]</span>`:ro?`<span class="memoire-h">${lab}</span>`:`<button type="button" class="memoire-h" data-act="af" data-v="mlbh|${esc(pid)}|${i}" title="${r.hint?esc(r.hint)+' · ':''}À compléter — touche pour saisir">${lab}</button>`;}
    const fv=F['{{'+vn+'}}'];if(filled(fv))return doc?esc(fv):`<span class="memoire-f"${ro?'':` data-act="af" data-v="mlbv|${vn}" role="button" tabindex="0"`} title="{{${vn}}} · valeur saisie pour ce mémoire${ro?'':' — touche pour modifier'}">${esc(fv)}</span>`;
    const raw=V[vn];if(raw&&typeof raw==='object'&&typeof raw.html==='string'&&raw.html){const hh=memSanitize(raw.html);return doc?hh:`<div class="memoire-gen" title="{{${vn}}} · ${qa(VAR_LAB[vn]||vn)} — généré par l’appli">${hh}</div>`;}
    const val=fmtVar(raw);if(val)return doc?esc(val):`<span class="memoire-v${ro?'':' memoire-vc'}"${ro?'':` data-act="af" data-v="mlbv|${vn}" role="button" tabindex="0"`} title="{{${vn}}} · valeur de l’affaire${ro?'':' — touche pour la changer dans ce mémoire'}">${esc(val)}</span>`;
    holes++;labs.push('V:'+vn);const lab=esc(VAR_LAB[vn]||vn);return doc?`<span class="ac">[À COMPLÉTER : ${lab}]</span>`:ro?`<span class="memoire-h">${lab}</span>`:`<button type="button" class="memoire-h" data-act="af" data-v="mlbv|${vn}" title="${vn in V?'Vide dans l’affaire':'Variable inconnue'} — touche pour saisir">${lab}</button>`;});
  return {html:m2Post(out,pid,X,doc),holes,labs};}
/* contexte d'une affaire : faits du chiffrage (F), interlocuteurs (I), documents d'entreprise (E), variables (V) — memoire3.js */
function memK(a,base,ctx){const L=memLib();const F=memFacts(a);const I=memInter(a,L,ctx);const E=entDocs(()=>{if(CUR&&CUR.render)try{CUR.render();}catch(e){}});
  const V=Object.assign(memLibVars(a,base),memVars3(a,F,I,E));return m2Bind({F,I,E,V,ext:{assurance:entValid(E.assurance_rc)||entValid(E.assurance_decennale),decennale:entValid(E.assurance_decennale),docsent:Object.keys(E).some(k=>E[k]&&k!=='rib')}},a,L);} /* 14/10 soir (lot M2) : contexte des trous posé sur V */
const baseOf=a=>H.vars?H.vars(a):{};
/* état d'une affaire : par paragraphe {p, b, on, holes, kind, auto} + totaux */
let RC=null; /* un rendu = un seul calcul (stepState + écran) : mémo tant que l'affaire, la bibliothèque et les valeurs ne changent pas */
function rowsOf(a,L,K){const I=K.I;const vk=JSON.stringify([K.V,K.F.has,K.F.v2,K.ext,[I.re,I.qhse,I.chef,I.charge,I.cdtx].map(p=>p&&p.name),(I.ops||[]).map(p=>p.name),(I.admin||[]).map(p=>p.name),m2Sig(K)]); /* 14/10 soir (lot M2) : contacts de l'annuaire et valeurs retenues (reglages) dans le mémo */
  if(RC&&RC.num===a.num&&RC.m===a.memoire&&RC.b===L.blocs&&RC.c===L.corr&&RC.g===L.reglages&&RC.vk===vk)return RC.r;const r=rowsOf_(a,L,K);RC={num:a.num,m:a.memoire,b:L.blocs,c:L.corr,g:L.reglages,vk,r};return r;}
function rowsOf_(a,L,K){const lib=libOf(a);const F=lib.fill||{};const V=K.V;const ix=libIx(L);let holes=0,sel=0,tot=0,words=0;const R={};const IN=new Set(); /* 14/10 soir (lot M2) : IN = infos à compléter (libellés distincts des trous rouges) */
  ix.list.forEach(b=>(b.paragraphes||[]).forEach(p=>{tot++;const on=isSel(lib,p,K);const kind=kindOf(p);const src=kind==='equipe'?'':prepRich(memSanitize(srcOf(L,lib,p.id)));let h,w,lb;
    if(kind==='equipe'){const em=equipeModel(p,K.I);h=em.holes;lb=m2EqLabs(em);w=0;}else{const fr=fillPara(src,p.id,F,V,'doc');h=fr.holes;lb=fr.labs;w=plain(src).split(' ').filter(Boolean).length+(kind==='image'?String(p.legende||'').split(/\s+/).filter(Boolean).length:0);}
    R[p.id]={p,b,on,holes:h,src,kind,auto:p.cond?condEval(p.cond,K.F,K.ext):null};if(on){sel++;holes+=h;words+=w;lb.forEach(g=>IN.add(g));}}));
  return {R,holes,sel,tot,words,lib,F,infos:IN.size};}
export function memLibCount(a,base){const L=memLib();if(!L)return {holes:0,sel:0,tot:0,words:0,infos:0};const r=rowsOf(a,L,memK(a,base,null));return {holes:r.holes,sel:r.sel,tot:r.tot,words:r.words,infos:r.infos};}
/* mode affiché : choix de l'affaire, sinon bibliothèque si elle est là et que l'affaire n'a pas déjà des sections libres */
export function memLibMode(a){const M=(a&&a.memoire)||{};const loc=(AS().mlbView||{})[a&&a.num];if(loc&&(memLib()||loc==='sections'))return loc;if(M.mode==='lib'||M.mode==='sections')return M.mode==='lib'&&!memLib()?'sections':M.mode;if(!memLib())return 'sections';if(M.lib)return 'lib';return (M.sections||[]).length?'sections':'lib';}
/* étape « prête » (stepState) : en mode bibliothèque choisi pour l'affaire (memoire.lib ou mode 'lib'), plus aucun trou dans les paragraphes cochés */
export function memLibActive(a){const M=(a&&a.memoire)||{};if(!memLib())return false;if(M.mode==='sections')return false;return !!(M.lib||M.mode==='lib');}
export function memLibReady(a,base){const c=memLibCount(a,base);return c.sel>0&&c.holes===0;}

/* ═════════ style SCR (style.json du pack) → CSS ; valeurs contrôlées (couleurs, polices, tailles) ═════════ */
const col=(x,d)=>typeof x==='string'&&/^#[0-9a-fA-F]{3,8}$/.test(x.trim())?x.trim():d;
const fontOk=x=>typeof x==='string'&&/^[\w\s,'À-ÿ.-]{1,160}$/.test(x); // pas de guillemet double : la police va aussi dans des style="…"
const num=(x,d,lo,hi)=>{const v=+x;return isFinite(v)&&v>=lo&&v<=hi?v:d;};
const idOk=x=>typeof x==='string'&&ID_OK.test(x)?x:'';
let TS=null;
function styleOf(L){const s=(L&&L.style&&typeof L.style==='object')?L.style:{};if(TS&&TS.src===s)return TS.v;const F=s.fonts||{};const fb=F.fallbacks||{};const c=s.colors||{};
  const fam=(n,d)=>{n=n||d||'Calibri';const f=fb[n];if(fontOk(f))return f;return fontOk(n)?`'${n.replace(/'/g,'')}', Calibri, Carlito, Arial, sans-serif`:'Calibri, Carlito, Arial, sans-serif';};
  const b=s.body||{},h1=s.h1||{},h2=s.h2||{},h3=s.h3||{},h4=s.h4||{};const tb=((s.table||{}).default)||{};const th=tb.header||{};const bd=tb.bandedRows||{};const bo=tb.border||{};const bu=((s.bullets||{}).level1)||{};const ol=s.orderedLists||{};const pg=(s.page||{}).marginsMm||{};
  const cv=(s.cover||{}).blocs||[];const cvT=cv.find(x=>x&&Array.isArray(x.lignes))||cv.find(x=>x&&typeof x.texte==='string')||{};const cvs=o=>num((cv.find(x=>x&&x.ordre===o)||{}).sizePt,0,4,60);const im=s.images||{};
  const H=(h,dSize,dCol,dBold)=>({font:fam(h.font,F.headings||F.body),size:num(h.sizePt,dSize,6,40),bold:h.bold===undefined?dBold:!!h.bold,italic:!!h.italic,caps:!!h.caps,sc:!!h.smallCaps,u:!!h.underline,color:col(h.color,dCol),before:num(h.spaceBeforePt,10,0,60),after:num(h.spaceAfterPt,4,0,60),pb:h.pageBreakBefore!==false,raw:h});
  const v={body:{font:fam(b.font,F.body),size:num(b.sizePt,12,7,20),color:col(b.color,'#000000'),lh:num(b.lineHeight,1.15,0.8,3),after:Math.max(num(b.spaceAfterPt,0,0,40),6),indent:num(b.indentLeftMm,0,0,40),hse:b.alignHSE==='justify',name:String(b.font||F.body||'Calibri')},
    h1:H(h1,16,'#000000',true),h2:H(h2,15,col(c.titre2,'#E8572B'),false),h3:H(h3,13,col(c.titre3,'#EB6834'),false),h4:H(h4,12,'#000000',true),
    tab:{font:fam(tb.font,F.tables||F.body),size:num(tb.sizePt,10.5,6,16),align:['left','center','right','justify'].includes(tb.align)?tb.align:'center',hf:col(th.fill,col(c.tableauEntete,'#EB6834')),hc:col(th.color,'#000000'),hb:col(th.borderColor,col(c.tableauBordureEntete,'#C0504D')),hbold:!!th.bold,odd:col(bd.odd,col(c.tableauBandeClaire,'#FBE3D3')),even:col(bd.even,'#FFFFFF'),bc:col(bo.color,col(c.tableauBordure,'#D99594')),bw:num(bo.widthPt,0.5,0.25,3)},
    bul:{ch:typeof bu.char==='string'&&bu.char.length<=2&&!/["\\<>]/.test(bu.char)?bu.char:'▪',color:col(bu.color,col(c.puce,'#C0504D')),indent:num(bu.indentMm,12.7,0,40),hang:num(bu.hangingMm,6.35,0,30),after:num((s.bullets||{}).spaceAfterPt,8,0,30)},
    ol:{indent:num(ol.indentMm,12.7,0,40)},red:col(c.aCompleter,'#FF0000'),orange:col(c.orangeSCR,'#EB6834'),orangeClair:col(c.orangeClairBandeau,'#EE825B'),gris:col(c.grisFonceBandeau,'#3F3F3F'),cover:col(c.texteCouverture,'#212121'),
    boxOr:col(c.schemaBoiteOrange,'#ED7D31'),boxNom:col(c.schemaNomContact,'#C0504D'),refCol:col(c.referencesVilleAnnee,'#FF572F'),
    margins:[num(pg.top,25,0,60),num(pg.right,21,0,60),num(pg.bottom,22,0,60),num(pg.left,19,0,60)],coverTitle:Array.isArray(cvT.lignes)?cvT.lignes.filter(x=>typeof x==='string').slice(0,5):(typeof cvT.texte==='string'?[cvT.texte]:['MÉMOIRE TECHNIQUE']),
    cvSize:{ville:cvs(1)||32,annee:cvs(2)||32,num:cvs(3)||20,titre:cvs(5)||26,date:cvs(7)||9},numFont:fam((F.coverNumeroAffaire)||'Tahoma'),
    img:{couverture:idOk(im.couverture),logo:idOk(im.logo),logoPetit:idOk(im.logoPetit)||idOk(im.logo),badges:Array.isArray(im.badges)?im.badges.map(idOk).filter(Boolean).slice(0,4):[]},
    noBreak:(((s.pageBreaks||{}).exceptions)||[]).filter(x=>typeof x==='string').map(norm)};
  TS={src:s,v};return v;}
const hCSS=(sel,h,pad)=>`${sel}{font-family:${h.font};font-size:${h.size}pt;font-weight:${h.bold?'bold':'normal'};font-style:${h.italic?'italic':'normal'};text-transform:${h.caps?'uppercase':'none'};letter-spacing:normal;font-variant:${h.sc?'small-caps':'normal'};text-decoration:${h.u?'underline':'none'};color:${h.color};margin:${pad?0:h.before}pt 0 ${h.after}pt;${pad?`padding-top:${h.before}pt;`:''}line-height:1.2;page-break-after:avoid;break-after:avoid}`;
/* CSS du mémoire : sc = portée (aperçu) ou '' (document exporté) ; word = listes à puces « carré » (Word ne lit pas les puces texte) ; lh = interligne réel (Word : 1,15 × 1,22) */
function docCSS(T,sc,word,lhW){const s=sc?sc+' ':'';const root=sc||'body';const lh=lhW?Math.round(T.body.lh*122):Math.round(T.body.lh*100);
  return `${root}{font-family:${T.body.font};font-size:${T.body.size}pt;color:${T.body.color};line-height:${lh}%}${s}p{margin:0 0 ${T.body.after}pt ${T.body.indent}mm}`
   +hCSS(s+'h1',T.h1)+hCSS(s+'h2',T.h2)+hCSS(s+'h3',T.h3)+hCSS(s+'h4',T.h4)
   +`${s}ul{margin:0 0 ${T.bul.after}pt;padding-left:${T.bul.indent}mm;list-style-type:${word?'square':`"${T.bul.ch}  "`}}${s}ul>li::marker{color:${T.bul.color}}${s}ol{margin:0 0 ${T.bul.after}pt;padding-left:${T.ol.indent}mm;list-style-type:decimal}${s}li{margin:0}`
   +`${s}table{border-collapse:collapse;width:100%;font-family:${T.tab.font};font-size:${T.tab.size}pt;margin:4pt 0 ${T.bul.after}pt}${s}td,${s}th{padding:0.5mm 1.9mm;vertical-align:middle}${s}td p,${s}th p{margin:0}${s}.ac{color:${T.red};font-style:italic}`;}
/* tableaux : en-tête et lignes alternées en style en ligne (Word ne lit pas :nth-child) ; texte long aligné à gauche ; head = en-tête dans <thead> (répété à l'impression) */
function styleTables(html,T,wrap,head){if(html.indexOf('<table>')<0)return html;
  return html.replace(/<table>([\s\S]*?)<\/table>/g,(m,inner)=>{let r=0;const long=/<td[^>]*>[^<]{60,}/.test(inner);let hd='';
    /* 14/10 après-midi (lot B) : tableau de signature (« Pour … » / « Pour … » en tête, ex. Validité de l'offre) : traits noirs, sans fond, ligne des visas haute — comme le Word */
    const r0=(/<tr>([\s\S]*?)<\/tr>/.exec(inner)||[])[1]||'';const sign=r0.split(/<t[dh](?:\s[^>]*)?>/).filter(c=>/^\s*pour\s/i.test(c.replace(/<[^>]+>/g,''))).length>=2;const ntr=(inner.match(/<tr>/g)||[]).length;let ti=0;
    const rows=inner.replace(/<\/?t(?:head|body)>/g,'').replace(/<tr>([\s\S]*?)<\/tr>/g,(mm,cells)=>{ti++;if(/<th[\s>]/.test(cells)&&!/<td[\s>]/.test(cells)){const t=`<tr>${cells.replace(/<th(\s[^>]*)?>/g,(t,at)=>sign?`<th${at||''} style="background:transparent;color:${T.body.color};border:0.75pt solid #000;font-weight:normal;text-align:center">`:`<th${at||''} style="background:${T.tab.hf};color:${T.tab.hc};border:${T.tab.bw}pt solid ${T.tab.hb};font-weight:${T.tab.hbold?'bold':'normal'};text-align:center">`)}</tr>`;if(head&&!r&&!hd){hd=t;return '';}return t;}
      r++;const bg=r%2?T.tab.odd:T.tab.even;return `<tr>${cells.replace(/<t([dh])(\s[^>]*)?>/g,(t,k,at)=>sign?`<t${k}${at||''} style="background:transparent;border:0.75pt solid #000;text-align:center${wrap?'':`;height:${ti===ntr?28:10}mm`}">`:`<t${k}${at||''} style="background:${bg};border:${T.tab.bw}pt solid ${T.tab.bc};text-align:${long?'left':T.tab.align}">`)}</tr>`;});
    const t=`<table>${hd?`<thead>${hd}</thead><tbody>${rows}</tbody>`:rows}</table>`;return wrap?`<div class="memoire-tw">${t}</div>`:t;});}
/* Word : puce couleur SCR, texte noir (la puce prend la couleur du paragraphe de liste) */
const wordLists=(html,T)=>html.replace(/<ul>([\s\S]*?)<\/ul>/g,(m,inner)=>`<ul style="list-style-type:square">${inner.replace(/<li>/g,`<li style="color:${T.bul.color}"><span style="color:${T.body.color}">`).replace(/<\/li>/g,'</span></li>')}</ul>`);
const imgSrc=(L,id)=>{const x=id&&imgOf(L,id);return x?x.src:'';};
const cssUrl=s=>String(s||'').replace(/["\\\n\r]/g,'');

/* ═════════ MODÈLE DU DOCUMENT (un seul calcul pour l'aperçu, le PDF, le Word et l'estimation des pages) ═════════
   secs[] = sections qui ont au moins un paragraphe coché (n1), blocs (n2), items {pid, kind:'html'|'image'|'equipe', titre, num (n1.n2.n3), html, img, eq} ;
   num = numéros pour la table de gauche (les mêmes que le mémoire) */
function docModel(a,base,mode,ro,ctx){const L=memLib();if(!L)return null;const T=styleOf(L);const K=memK(a,base,ctx);const st=rowsOf(a,L,K);const ix=libIx(L);const F=st.F;const V=K.V;
  let n1=0,holes=0;const secs=[];const N={sec:{},bloc:{},para:{}};
  ix.secs.forEach((s,si)=>{let n2=0;const bl=[];s.blocs.forEach(b=>{const ps=(b.paragraphes||[]).filter(p=>st.R[p.id].on);if(!ps.length)return;n2++;let n3=0;
      const items=ps.map(p=>{const R=st.R[p.id];const it={pid:p.id,kind:R.kind,titre:String(p.titre||''),num:p.titre?`${n1+1}.${n2}.${++n3}`:''};if(it.num)N.para[p.id]=it.num;
        if(R.kind==='equipe'){it.eq=equipeModel(p,K.I);holes+=it.eq.holes;}else{const r=fillPara(R.src,p.id,F,V,mode,ro);it.html=r.html;holes+=r.holes;}
        if(R.kind==='image'){it.imgId=p.img;it.img=imgOf(L,p.img);it.legende=fillPara(memSanitize(String(p.legende||'')),p.id+'#leg',F,V,mode,true).html;it.largeur=num(p.largeur,100,5,100);it.cote=p.cote==='gauche'||p.cote==='droite'?p.cote:'';}
        it.list=R.kind==='html'&&/^<ul>[\s\S]*<\/ul>$/.test(R.src);return it;});
      items.forEach((it,j)=>{it.end=it.list&&!(items[j+1]&&items[j+1].list);});N.bloc[b.id]=`${n1+1}.${n2}`;bl.push({b,n2,items});});
    if(!bl.length)return;n1++;N.sec[si]=n1;secs.push({s,si,n1,name:s.name,blocs:bl,nob:T.noBreak.includes(norm(s.name)),hse:T.body.hse&&/\bHSE\b/i.test(s.name)});});
  return {a,L,T,K,V,st,secs,num:N,holes,mode};}
export function memDocModel(a,base,ctx){return docModel(a,base||baseOf(a),'doc',true,ctx);}
export function memPages(a,base,ctx){const M=docModel(a,base||baseOf(a),'doc',true,ctx);return M?estimatePages(M,M.T):{word:0,pdf:0};}

/* ═════════ document exporté : impression / PDF (mise en page A4) et ancien Word .doc HTML ═════════ */
function figDoc(it,M,app){const src=it.img&&it.img.src;const cap=it.legende?`<figcaption class="mem3-cap">${it.legende}</figcaption>`:'';const T=M.T;
  const im=src?`<img src="${esc(src)}" alt="${qa(plain(it.legende||'')||it.imgId||'')}"${it.img.w?` width="${it.img.w}" height="${it.img.h}"`:''}>`:`<div class="mem3-miss">image « ${esc(it.imgId||'?')} » absente de la bibliothèque</div>`;
  if(it.cote)return `<figure class="mem3-fig mem3-sw"><div class="mem3-side ${it.cote}"><div class="mem3-im" style="width:${it.largeur}%">${im}</div><div class="mem3-tx">${styleTables(it.html||'',T,app)}</div></div>${cap}</figure>`;
  return `<figure class="mem3-fig"><div class="mem3-iw" style="width:${it.largeur}%">${im}</div>${cap}</figure>`;}
function printCSS(T){const m=T.margins;const W=210-m[1]-m[3];const Hc=297-m[0]-m[2];const lh=Math.round(T.body.lh*122);
  return `html,body{margin:0;padding:0;background:#fff}body{font-family:${T.body.font};font-size:${T.body.size}pt;color:${T.body.color};line-height:${lh}%;-webkit-print-color-adjust:exact;print-color-adjust:exact}
#flow{width:${W}mm;margin:0 auto}@media screen{body{background:#e9e7e1}.cover,#flow{box-shadow:0 1px 6px rgba(0,0,0,.2);background:#fff;margin:12px auto}#flow{padding:${m[0]}mm ${m[1]}mm ${m[2]}mm ${m[3]}mm;width:${W}mm;box-sizing:content-box}}
p{margin:0 0 ${T.body.after}pt ${T.body.indent}mm}`+hCSS('h1',T.h1,true)+hCSS('h2',T.h2,true)+hCSS('h3',T.h3,true)+hCSS('h4',T.h4,true)+`h1{padding-top:0}h1.pbb{break-before:page;page-break-before:always}
ul{margin:0 0 ${T.bul.after}pt;padding-left:${T.bul.indent}mm;list-style-type:"${T.bul.ch}  "}ul>li::marker{color:${T.bul.color}}ol{margin:0 0 ${T.bul.after}pt;padding-left:${T.ol.indent}mm;list-style-type:decimal}li{margin:0}
table{border-collapse:collapse;width:100%;font-family:${T.tab.font};font-size:${T.tab.size}pt;margin:2pt 0 ${T.bul.after}pt;line-height:118%}td,th{padding:0.6mm 1.9mm;vertical-align:middle}td p,th p{margin:0}thead{display:table-header-group}
p,li,tr,figure,h4,.mem3-row,.mem3-side,.te{break-inside:avoid;page-break-inside:avoid}.ac{color:${T.red};font-style:italic}
.mem3-fig{margin:3pt 0 ${T.body.after+2}pt;text-align:center}.mem3-fig img{max-width:100%;height:auto;max-height:${Math.round(Hc*0.8)}mm;object-fit:contain}.mem3-iw{margin:0 auto}.mem3-cap{font-size:9pt;font-style:italic;color:#555;margin:2pt 0 0;text-align:center}
.mem3-side{display:flex;gap:4mm;align-items:center;text-align:left}.mem3-side.droite{flex-direction:row-reverse}.mem3-side .mem3-im{flex:0 0 auto;text-align:center}.mem3-side .mem3-im img{max-width:100%}.mem3-side .mem3-tx{flex:1 1 0;min-width:0}.mem3-side .mem3-tx>*:last-child{margin-bottom:0}.mem3-miss{border:1px dashed #bbb;color:#888;padding:8mm;font-size:9pt}
.mem3-eq{margin:2pt 0 8pt}.mem3-pole{margin:0 0 6pt;break-inside:avoid;page-break-inside:avoid}.mem3-pt{font-weight:bold;font-style:italic;margin:0 0 4pt;border-bottom:0.6pt solid #ccc;padding-bottom:1pt;break-after:avoid}
.mem3-row{display:grid;grid-template-columns:30% 30% 1fr;gap:2mm;margin:0 0 2mm}.mem3-role{background:${T.boxOr};color:#fff;font-weight:bold;border-radius:2.5mm;padding:1.5mm 2.5mm;display:flex;align-items:center;justify-content:space-between;gap:2mm;font-size:10pt;line-height:1.15}
.mem3-role img{width:9mm;height:9mm;object-fit:contain}.mem3-pers,.mem3-mis{border:0.9pt solid ${T.boxOr};border-radius:2.5mm;padding:1.2mm 2.5mm;font-size:9pt;line-height:1.25;display:flex;flex-direction:column;justify-content:center;overflow-wrap:anywhere}.mem3-pers b{color:${T.boxNom}}.mem3-pers>div+div{margin-top:1.2mm}.mem3-mis ul{margin:0;padding-left:4mm}.mem3-mis.vide{border-color:transparent}
.cover{width:210mm;height:297mm;position:relative;overflow:hidden;break-after:page;page-break-after:always;color:${T.cover};box-sizing:border-box}.cv-ph{position:absolute;left:0;top:0;bottom:0;width:122mm;background-size:cover;background-position:center}
.cv-col{position:absolute;right:0;top:0;bottom:0;width:${'88mm'};display:flex;flex-direction:column;align-items:center;text-align:center;padding:40mm 6mm 14mm;box-sizing:border-box}.cover.noph .cv-col{left:0;width:auto;padding:55mm 25mm 18mm}.cover.noph{border-top:14mm solid ${T.orange}}
.cv-v{font-size:${T.cvSize.ville}pt;font-weight:bold;text-transform:uppercase;line-height:1.1;overflow-wrap:anywhere}.cv-y{font-size:${Math.round(T.cvSize.annee*0.75)}pt;font-weight:bold;margin:2mm 0 0}.cv-n{font-family:${T.numFont};font-size:${T.cvSize.num}pt;margin:8mm 0 2mm}
.cv-r{width:62mm;height:1.1mm;background:${T.orange};margin:0 0 14mm}.cv-t{font-size:${T.cvSize.titre}pt;font-weight:bold;text-transform:uppercase;line-height:1.45}.cv-a{font-size:13pt;font-weight:bold;margin:10mm 0 1mm}.cv-c{font-size:11.5pt}
.cv-sp{flex:1}.cv-lg{width:62mm;max-height:42mm;object-fit:contain}.cv-bd{display:flex;gap:4mm;justify-content:center;margin:4mm 0 0}.cv-bd img{height:16mm;width:auto}.cv-d{align-self:flex-end;font-size:${T.cvSize.date}pt;font-weight:bold;margin-top:6mm}
.toc{padding:0}.som{font-size:${T.h1.size}pt;font-weight:bold;text-transform:uppercase;margin:0 0 6mm;letter-spacing:.02em}.te{display:flex;align-items:baseline;gap:1.5mm;color:inherit;text-decoration:none;margin:0 0 0.6pt;font-size:${Math.max(9.5,T.body.size-1.5)}pt;line-height:1.3}
.te.t1{font-weight:bold;margin-top:1.8mm}.toc .ac{font-size:9.5pt;margin:0 0 4mm}.te.t2{padding-left:7mm}.te .tn{min-width:9mm}.te .tl{flex:1;border-bottom:0.8pt dotted #999;transform:translateY(-1mm)}.te .pn{min-width:6mm;text-align:right}.toc.nopn .tl,.toc.nopn .pn{display:none}
.hse{text-align:justify}`;}
function pageCSS(T,a,V,M){const m=T.margins;const or=T.orange;const f=T.body.font;const head=cssStr((a.nom||'Mémoire technique').slice(0,90));const ref=cssStr(`Réf. ${a.num||''}${V.ville?' – '+V.ville:''}`);const lg=imgSrc(M.L,T.img.logoPetit);
  return `@page{size:A4;margin:${m[0]}mm ${m[1]}mm ${m[2]}mm ${m[3]}mm;@top-left{content:"${head}";background:${or};color:#fff;font:8.5pt ${f};padding:0 0 0 4mm;height:7mm;margin-top:9mm;vertical-align:middle}@top-center{content:"";background:${or};height:7mm;margin-top:9mm}@top-right{content:"MÉMOIRE TECHNIQUE";background:${or};color:#fff;font:bold 9pt ${f};padding:0 4mm 0 0;height:7mm;margin-top:9mm;vertical-align:middle;text-align:right}`
   +`@bottom-left{content:"${ref}";font:8pt ${f};color:#555;border-top:0.9pt solid ${or};vertical-align:top;padding-top:2.5mm}@bottom-center{content:"";width:36mm;border-top:0.9pt solid ${or};${lg?`background:url("${cssUrl(lg)}") no-repeat center 2mm / auto 6mm;`:''}}@bottom-right{content:"Page " counter(page) " / " counter(pages);font:bold 9pt ${f};color:${or};border-top:0.9pt solid ${or};vertical-align:top;padding-top:2.5mm;text-align:right}}`
   +`@page:first{margin:0;@top-left{content:none;background:none}@top-center{content:none;background:none}@top-right{content:none;background:none}@bottom-left{content:none;border:0}@bottom-center{content:none;border:0;background:none}@bottom-right{content:none;border:0}}`;}
function coverDoc(M){const T=M.T,V=M.V,a=M.a;const ph=imgSrc(M.L,T.img.couverture),lg=imgSrc(M.L,T.img.logo);const bd=T.img.badges.map(id=>imgSrc(M.L,id)).filter(Boolean);
  return `<div class="cover${ph?'':' noph'}">${ph?`<div class="cv-ph" style="background-image:url('${cssUrl(ph)}')"></div>`:''}<div class="cv-col"><div class="cv-v">${esc(V.ville||a.client||'')}</div><div class="cv-y">${esc(V.annee)}</div><div class="cv-n">${esc(a.num||'')}</div><div class="cv-r"></div><div class="cv-t">${T.coverTitle.map(esc).join('<br>')}</div><div class="cv-a">${esc(a.nom||'')}</div><div class="cv-c">${esc(V.client||'')}</div><div class="cv-sp"></div>${lg?`<img class="cv-lg" src="${esc(lg)}" alt="">`:''}${bd.length?`<div class="cv-bd">${bd.map(s=>`<img src="${esc(s)}" alt="">`).join('')}</div>`:''}<div class="cv-d">${esc(V.date)}</div></div></div>`;}
function printHTML(M){const T=M.T,V=M.V,a=M.a;const toc=M.secs.map(S=>`<a class="te t1" href="#h${S.n1}"><span class="tn">${S.n1}.</span><span class="tt">${esc(S.name)}</span><span class="tl"></span><span class="pn" data-for="h${S.n1}"></span></a>`+S.blocs.map(B=>`<a class="te t2" href="#h${S.n1}-${B.n2}"><span class="tn">${S.n1}.${B.n2}</span><span class="tt">${esc(B.b.titre)}</span><span class="tl"></span><span class="pn" data-for="h${S.n1}-${B.n2}"></span></a>`).join('')).join('');
  const body=M.secs.map((S,k)=>{const h=`<section class="sec${S.hse?' hse':''}"><h1 id="h${S.n1}" class="${k===0||!S.nob?'pbb':''}">${S.n1}. ${esc(S.name)}</h1>${S.blocs.map(B=>`<div class="bk"><h2 id="h${S.n1}-${B.n2}">${S.n1}.${B.n2} ${esc(B.b.titre)}</h2>${B.items.map(it=>`<div class="it">${it.titre?`<h3>${it.num} ${esc(it.titre)}</h3>`:''}${it.kind==='equipe'?equipeHTML(it.eq,id=>imgSrc(M.L,id),'doc',true):it.kind==='image'?figDoc(it,M,false):styleTables(it.html,T,false,true).replace(/<\/ul>\s*<ul>/g,'')}</div>`).join('')}</div>`).join('')}</section>`;return h;}).join('');
  const left=M.holes;
  return `<!doctype html><html lang="fr"><head><meta charset="utf-8"><title>Mémoire technique — ${esc(a.num||'')} ${esc(a.nom||'')}</title><style>${printCSS(T)}${pageCSS(T,a,V,M)}</style></head><body>${coverDoc(M)}<div id="flow"><div class="toc nopn" id="toc"><p class="som">Sommaire</p>${left?`<p class="ac">${left} trou${left>1?'s':''} encore à compléter (en rouge).</p>`:''}${toc}</div>${body||'<h1 class="pbb">Mémoire</h1><p><i>(aucun paragraphe coché)</i></p>'}</div></body></html>`;}
/* PAGINATION du PDF (dans la fenêtre d'impression, avant print()) : chaque unité (titre, paragraphe, puce, ligne de tableau, figure, ligne d'organigramme)
   est mesurée à la largeur A4 ; on remplit les pages comme Chromium (titres gardés avec la suite, sauts avant les grandes sections), on FIXE les sauts aux
   endroits calculés (rien ne peut glisser) et on écrit les numéros de page dans le sommaire. Renvoie le nombre de pages. */
export async function memPaginate(w,T){const d=w.document;try{await Promise.all([...d.images].map(im=>im.complete?0:new Promise(r=>{im.onload=im.onerror=r;setTimeout(r,5000);})));}catch(e){}try{if(d.fonts&&d.fonts.ready)await d.fonts.ready;}catch(e){}
  const m=(T&&T.margins)||[25,21,22,19];const mm=96/25.4;const Hc=(297-m[0]-m[2])*mm-8;const flow=d.getElementById('flow');if(!flow)return 0;
  const U=[];const walk=el=>{for(const c of el.children){if(c.matches('section,.bk,.it,.toc,.mem3-eq'))walk(c);else if(c.matches('ul,ol'))[...c.children].forEach(li=>U.push(li));else if(c.matches('.memoire-tw'))walk(c);else if(c.matches('table'))[...c.rows].forEach(tr=>U.push(tr));else U.push(c);}};walk(flow);
  const R=U.map(u=>u.getBoundingClientRect());const n=U.length;const eff=U.map((u,i)=>{const t=R[i].top;const nx=i+1<n?R[i+1].top:R[i].bottom;const h=nx-t;return h>0&&i+1<n&&!U[i+1].classList.contains('pbb')?Math.max(h,R[i].height):R[i].height+4;});
  const kn=u=>u.matches('h1,h2,h3,h4,.mem3-pt,.som')||(u.tagName==='TR'&&u.parentElement&&u.parentElement.tagName==='THEAD');
  let page=2,cur=0;const pageOf=new Map();let lastTable=null,headH=0;
  for(let i=0;i<n;i++){const u=U[i];const h=eff[i];if(u.classList.contains('pbb')&&i>0&&cur>0){page++;cur=0;}
    const tbl=u.tagName==='TR'?u.closest('table'):null;if(tbl!==lastTable){lastTable=tbl;headH=tbl&&tbl.tHead?tbl.tHead.getBoundingClientRect().height:0;}
    let need=h;if(kn(u)){let j=i+1,acc=h;while(j<n&&kn(U[j])&&!U[j].classList.contains('pbb')&&acc<Hc*0.5){acc+=eff[j];j++;}need=acc+(j<n&&!U[j].classList.contains('pbb')?Math.min(eff[j],Hc*0.25):0);}
    if(cur>0&&cur+need>Hc){page++;cur=0;if(!u.classList.contains('pbb'))u.style.breakBefore='page';if(tbl&&tbl.tHead&&u.parentElement.tagName!=='THEAD')cur+=headH;}
    pageOf.set(u,page);cur+=h;if(cur>Hc){page+=Math.floor(cur/Hc);cur=cur%Hc;}}
  d.querySelectorAll('#toc .pn').forEach(s=>{const t=d.getElementById(s.dataset.for);if(t&&pageOf.has(t))s.textContent=String(pageOf.get(t));});const toc=d.getElementById('toc');if(toc)toc.classList.remove('nopn');
  d.documentElement.dataset.paged=String(page);return page;}
export function memLibDocHTML(a,base,opt){opt=opt||{};const word=!!opt.word;const L=memLib();if(!L)return '';const T=styleOf(L);
  if(!word){const M=docModel(a,base,'doc',true,opt.ctx||null);return printHTML(M);} /* 14/10 après-midi : impression / PDF mise en page */
  /* ancien Word .doc (HTML lu par Word) — gardé tel quel, en format secondaire ; images remplacées par leur légende */
  const K=memK(a,base,opt.ctx||null);const V=K.V;const lib=libOf(a);const F=lib.fill||{};const ix=libIx(L);let n1=0,left=0;const toc=[];const body=[];
  ix.secs.forEach(s=>{let n2=0;const bl=[];s.blocs.forEach(b=>{const ps=(b.paragraphes||[]).filter(p=>isSel(lib,p,K));if(!ps.length)return;n2++;let n3=0;
      const html=ps.map(p=>{const kind=kindOf(p);let body2;if(kind==='equipe'){const E=equipeModel(p,K.I);left+=E.holes;body2=E.poles.map(po=>`<p><b><i>${esc(po.titre)}</i></b></p><table><tr><th>Fonction</th><th>Nom</th><th>Missions</th></tr>${po.rows.map(r=>`<tr><td>${esc(r.label)}</td><td>${r.persons.map(x=>esc(x.name)+(x.tel?' – '+esc(x.tel):'')+(x.email?' – '+esc(x.email):'')).join('<br>')||(r.missing?`<span class="ac">[À COMPLÉTER : ${esc(ROLE_LAB[r.k]||r.label)}]</span>`:'')}</td><td>${r.missions.map(esc).join('<br>')}</td></tr>`).join('')}</table>`).join('');}
        else{const r=fillPara(prepRich(memSanitize(srcOf(L,lib,p.id))),p.id,F,V,'doc');left+=r.holes;body2=r.html;if(kind==='image')body2=`<p style="text-align:center"><i>[Image : ${esc(plain(String(p.legende||''))||p.img)}]</i></p>`+(p.cote?body2:'');}
        return (p.titre?`<h3>${n1+1}.${n2}.${++n3} ${esc(p.titre)}</h3>`:'')+body2;}).join('').replace(/<\/ul>\s*<ul>/g,'');
      bl.push({b,n2,html});toc.push(`<p class="toc2">${n1+1}.${n2} ${esc(b.titre)}</p>`);});
    if(!bl.length)return;n1++;toc.splice(toc.length-bl.length,0,`<p class="toc1">${n1}. ${esc(s.name)}</p>`);const nob=T.noBreak.includes(norm(s.name));
    let h=`<h1${nob?' style="page-break-before:auto"':''}>${n1}. ${esc(s.name)}</h1>`+bl.map(x=>`<h2>${n1}.${x.n2} ${esc(x.b.titre)}</h2>${x.html}`).join('');h=styleTables(h,T,false);h=wordLists(h,T);
    body.push(T.body.hse&&/\bHSE\b/i.test(s.name)?`<div style="text-align:justify">${h}</div>`:h);});
  const yr=String(new Date().getFullYear());const m=T.margins;
  const cover=`<div class="cover" style="text-align:center;color:${T.cover}"><p style="font-size:${T.cvSize.ville}pt;font-weight:bold;text-transform:uppercase;margin:110pt 0 0;line-height:110%">${esc(V.ville||'')}</p><p style="font-size:${T.cvSize.annee}pt;font-weight:bold;margin:0;line-height:110%">${yr}</p><p style="font-family:${T.numFont};font-size:${T.cvSize.num}pt;margin:14pt 0 6pt">${esc(a.num||'')}</p><p style="margin:0 22%;border-bottom:3pt solid ${T.orange};font-size:3pt;line-height:3pt">&nbsp;</p><p style="font-size:${T.cvSize.titre}pt;font-weight:bold;text-transform:uppercase;line-height:145%;margin:28pt 0 18pt">${T.coverTitle.map(esc).join('<br>')}</p><p style="font-size:14pt;font-weight:bold;margin:0 0 4pt">${esc(a.nom||'')}</p><p style="font-size:13pt;margin:0">${esc(V.client||'')}</p><p style="font-size:${T.cvSize.date}pt;font-weight:bold;margin:60pt 0 0;text-align:right">${esc(V.date)}</p></div>`;
  const css=docCSS(T,'',true)+`.toc1{font-weight:bold;margin:6pt 0 0}.toc2{margin:0 0 0 8mm}.som{font-size:${T.h1.size}pt;font-weight:bold;text-transform:uppercase;margin:0 0 10pt}h1{page-break-before:${T.h1.pb?'always':'auto'}}`
    +`@page WordSection1{size:595.3pt 841.9pt;margin:${m[0]}mm ${m[1]}mm ${m[2]}mm ${m[3]}mm}div.WordSection1{page:WordSection1}`;
  return `<!doctype html><html lang="fr" xmlns:o="urn:schemas-microsoft-com:office:office" xmlns:w="urn:schemas-microsoft-com:office:word"><head><meta charset="utf-8"><title>Mémoire technique — ${esc(a.num||'')} ${esc(a.nom||'')}</title><!--[if gte mso 9]><xml><w:WordDocument><w:View>Print</w:View><w:Zoom>100</w:Zoom></w:WordDocument></xml><![endif]--><style>${css}</style></head><body><div class="WordSection1">${cover}<p class="som" style="page-break-before:always">Sommaire</p>${toc.join('')}${left?`<p class="ac" style="margin-top:14pt">${left} trou${left>1?'s':''} encore à compléter (en rouge).</p>`:''}${body.join('')||'<p><i>(aucun paragraphe coché)</i></p>'}</div></body></html>`;}
const fname=(a,ext)=>'Memoire_technique_'+String(a.num).replace(/[^A-Za-z0-9-]/g,'_')+'.'+ext;
function download(blob,name){const u=URL.createObjectURL(blob);const l=document.createElement('a');l.href=u;l.download=name;document.body.appendChild(l);l.click();setTimeout(()=>{URL.revokeObjectURL(u);l.remove();},2000);}
/* ancien format (.doc HTML) : gardé en lien secondaire */
export function memLibWordDoc(a,base,ctx){const html=memLibDocHTML(a,base,{word:true,ctx});download(new Blob(['\ufeff'+html],{type:'application/msword'}),fname(a,'doc'));const c=memLibCount(a,base);say('⬇ Mémoire technique (.doc, ancien format)'+(c.holes?' — '+c.holes+' trou'+(c.holes>1?'s':'')+' encore en rouge':''));}
/* 14/10 après-midi : vrai Word (.docx) — page de garde, sommaire (champ mis à jour par Word), en-têtes / pieds de page « page n / N », titres et tableaux au
   gabarit du pack, images et organigramme */
export async function memLibDocx(a,base,ctx){const M=docModel(a,base,'doc',true,ctx);if(!M)return null;const ids=new Set();const T=M.T;[T.img.couverture,T.img.logo,T.img.logoPetit].concat(T.img.badges).forEach(x=>{if(x)ids.add(x);});
  M.secs.forEach(S=>S.blocs.forEach(B=>B.items.forEach(it=>{if(it.kind==='image'&&it.imgId)ids.add(it.imgId);if(it.kind==='equipe')it.eq.poles.forEach(po=>po.rows.forEach(r=>{if(r.ico)ids.add(r.ico);}));})));
  const imgs={};await Promise.all([...ids].map(async id=>{const im=imgOf(M.L,id);if(!im)return;const bytes=await imgBytes(M.L,id);if(bytes)imgs[id]={bytes,w:im.w,h:im.h,png:im.png||(bytes[0]===0x89&&bytes[1]===0x50)};}));
  return buildDocx(M,imgs);}
export async function memLibWord(a,base,ctx){try{const u8=await memLibDocx(a,base,ctx);if(!u8)return;download(new Blob([u8],{type:'application/vnd.openxmlformats-officedocument.wordprocessingml.document'}),fname(a,'docx'));
  const c=memLibCount(a,base);say('⬇ Mémoire technique (Word .docx) au gabarit SCR'+(c.holes?' — '+c.holes+' trou'+(c.holes>1?'s':'')+' encore en rouge':'')+' · à l’ouverture, Word propose de mettre à jour le sommaire : accepte');}
  catch(e){console.warn(e);say('Export Word impossible : '+(e&&e.message||e));}}
export function memLibPrint(a,base,ctx){const w=window.open('','_blank');if(!w){say('Autorise les fenêtres pour imprimer');return;}const L=memLib();const T=styleOf(L);w.document.write(memLibDocHTML(a,base,{word:false,ctx}));w.document.close();
  setTimeout(async()=>{let n=0;try{n=await memPaginate(w,T);}catch(e){console.warn(e);}if(n)say('PDF : '+n+' pages — choisis « Enregistrer au format PDF » dans la fenêtre d’impression');try{w.focus();w.print();}catch(e){}},250);}
/* 14/10 soir (lot M3) : PDF DIRECT (memoire3_pdf.js) — même modèle (contrat K5) et même collecte d'images que le Word ; Uint8Array, ou null sans bibliothèque.
   Le modèle est calculé AVANT le premier await : la consultation d'une version (affWithVirtual, dossier de remise) s'applique. */
export async function memLibPdf(a,base,ctx){const M=docModel(a,base,'doc',true,ctx);if(!M)return null;const ids=new Set();const T=M.T;[T.img.couverture,T.img.logo,T.img.logoPetit].concat(T.img.badges).forEach(x=>{if(x)ids.add(x);});
  M.secs.forEach(S=>S.blocs.forEach(B=>B.items.forEach(it=>{if(it.kind==='image'&&it.imgId)ids.add(it.imgId);if(it.kind==='equipe')it.eq.poles.forEach(po=>po.rows.forEach(r=>{if(r.ico)ids.add(r.ico);}));})));
  const imgs={};await Promise.all([...ids].map(async id=>{const im=imgOf(M.L,id);if(!im)return;const bytes=await imgBytes(M.L,id);if(bytes)imgs[id]={bytes,w:im.w,h:im.h,png:im.png||(bytes[0]===0x89&&bytes[1]===0x50)};}));
  return buildPdf(M,imgs);}
/* « ⬇ PDF » : un clic → Memoire_technique_<num>.pdf ; impossible (hors connexion sans moteur chargé, fichiers absents…) → message + l'ancienne fenêtre d'impression */
let PDFBUSY=false;
export async function memLibPdfDownload(a,base,ctx){if(PDFBUSY){say('PDF déjà en préparation…');return false;}PDFBUSY=true;say('PDF en préparation…');let u8=null,why='';
  try{u8=await memLibPdf(a,base,ctx);}catch(e){console.warn(e);why=String((e&&e.message)||e||'erreur');}finally{PDFBUSY=false;}
  if(u8&&u8.length){download(new Blob([u8],{type:'application/pdf'}),fname(a,'pdf'));const n=pdfInfo.pages,c=memLibCount(a,base);const k=pdfInfo.skipped;say('⬇ Mémoire PDF : '+n+' page'+(n>1?'s':'')+(c.holes?' — '+c.holes+' trou'+(c.holes>1?'s':'')+' encore en rouge':'')+(k?' · '+k+' image'+(k>1?'s':'')+' illisible'+(k>1?'s':'')+' laissée'+(k>1?'s':'')+' de côté':''));return true;}
  if(!why)return false;pdfInfo.err=why;const tx='PDF direct impossible ('+why+') : la fenêtre d’impression s’ouvre à la place — choisis « Enregistrer au format PDF ».';memLibPrint(a,base,ctx);
  try{A.openModal(`<h3 style="margin-top:0">PDF direct impossible</h3><div class="hint" id="m3-pdf-err" style="margin:0 0 8px">${esc(tx)}</div><div class="actions"><button class="btn primary block" id="m3-pdf-print">🖨 Rouvrir la fenêtre d’impression</button><button class="btn block" data-close>Fermer</button></div>`);
    const b=document.getElementById('m3-pdf-print');if(b)b.onclick=()=>{A.closeModal();memLibPrint(a,base,ctx);};}catch(e){}
  setTimeout(()=>say(tx),1200);return false;}

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
.memoire-doc{border:1px solid var(--line);border-radius:12px;background:#ecebe5;overflow:clip;min-width:0}.memoire-scroll{padding:14px 12px}
.memoire-page{background:#fff;color:#000;max-width:820px;margin:0 auto;padding:36px 46px 46px;box-shadow:0 1px 4px rgba(0,0,0,.15);overflow-wrap:anywhere}.memoire-tw{overflow-x:auto;max-width:100%}
.memoire-page .memoire-h{display:inline;font:inherit;font-style:italic;color:#d50000;background:#ffecec;border:0;border-bottom:1.5px dashed currentColor;border-radius:3px;padding:0 3px;margin:0;cursor:pointer;line-height:inherit;text-align:left;min-height:0;box-shadow:none}
.memoire-page .memoire-h:focus{outline:2px solid #1f6fd0}.memoire-page span.memoire-h{cursor:default}.memoire-f{border-bottom:1px dotted #1f6fd0;cursor:pointer}.memoire-p{position:relative}
.memoire-vc,.memoire-auto{cursor:pointer;border-bottom:1px dotted #9db7dd}.memoire-auto{background:#f1f6fd;border-radius:3px}.memoire-gen{border-left:3px solid #c9dbf3;padding-left:6px;margin:0 0 4px}.memoire-gen>*:last-child{margin-bottom:0}
.memoire-pe{position:absolute;right:-42px;top:0;min-width:34px;min-height:34px;border:1px solid var(--line);border-radius:8px;background:#fff;cursor:pointer;opacity:.4;font-size:14px;padding:0}.memoire-p:hover .memoire-pe,.memoire-pe:focus{opacity:1}
.memoire-p.lst:not(.end) ul{margin-bottom:0}.memoire-cv{text-align:center;padding:10px 0 22px;border-bottom:3px solid var(--memoire-or,#EB6834);margin-bottom:16px;color:#212121}.memoire-cv .v{font-size:24px;font-weight:700;text-transform:uppercase}.memoire-cv .y{font-size:20px;font-weight:700}.memoire-cv .n{font-size:16px;margin:6px 0}.memoire-cv .t{font-size:20px;font-weight:700;text-transform:uppercase;line-height:1.35;margin:10px 0}.memoire-cv .c{font-size:13px;color:#555}
.memoire-cv.mem3-cvp{display:grid;grid-template-columns:40% 1fr;padding:0;min-height:300px}.mem3-cvph{background-size:cover;background-position:center;border-radius:4px 0 0 4px;min-height:240px}.mem3-cvt{padding:18px 10px 14px;display:flex;flex-direction:column;justify-content:center}.mem3-cvlg{max-width:60%;max-height:90px;object-fit:contain;margin:6px auto}
.memoire-som{background:#f6f5f0;border-radius:8px;padding:8px 14px;margin:0 0 18px;font-size:13px}.memoire-som ol{margin:4px 0 0;padding-left:0;list-style:none}.memoire-som li{display:flex;gap:6px;align-items:baseline}.memoire-somn{flex:0 0 auto;min-width:1.6em;text-align:right;color:#6b6b66}.memoire-som .lnk{font:inherit;padding:0;text-align:left;min-height:26px;display:inline;line-height:1.5}
.memoire-card.full{position:fixed;inset:0;z-index:1200;margin:0;border-radius:0;overflow:auto;max-width:none}
.memoire-ed{min-height:150px;max-height:52vh;overflow:auto;border:1px solid var(--line);padding:10px 12px;margin:8px 0;box-shadow:none;outline:none}.memoire-ed:focus{box-shadow:0 0 0 2px #1f6fd0}
.memoire-tok{background:#eef3fb;border-radius:3px;padding:0 3px}.memoire-tok.red{color:#d50000;background:#ffecec;font-style:italic}.memoire-mpv{max-height:46vh;overflow:auto;padding:12px 14px;box-shadow:none;border:1px solid var(--line);margin:8px 0}
.memoire-same{display:flex;gap:8px;align-items:center;margin-top:8px;font-size:13px;min-height:44px}.memoire-same input{width:20px;height:20px;flex:none}
.memoire-head{display:flex;flex-wrap:wrap;gap:6px 10px;align-items:flex-start;justify-content:space-between;margin:0 0 4px}.memoire-head h3{flex:1 1 240px;min-width:0;margin:0}
@media(max-width:600px){.memoire-page{padding:18px 14px 26px}.memoire-scroll{padding:8px 6px}.memoire-pe{position:static;float:right;margin:0 0 4px 6px}.memoire-cv.mem3-cvp{grid-template-columns:1fr}.mem3-cvph{min-height:140px}}`;
let STY=null;
function injectCSS(T){if(typeof document==='undefined')return;if(!document.getElementById('memoire-css')){const st=document.createElement('style');st.id='memoire-css';st.textContent=CSS;document.head.appendChild(st);}
  if(STY!==T){STY=T;let st=document.getElementById('memoire-style');if(!st){st=document.createElement('style');st.id='memoire-style';document.head.appendChild(st);}st.textContent=docCSS(T,'.memoire-page.memoire-scr',false,true)+`.memoire-page.memoire-scr .memoire-h{color:${T.red}}.memoire-page.memoire-scr{--memoire-or:${T.orange}}.memoire-page.memoire-scr h1{text-decoration-thickness:1px}`;}
  injectLotB(T);}
/* défilement gardé d'un rendu à l'autre (arbre, aperçu) ; cases « partiellement cochées » ; 14/10 après-midi : bloc ajouté / retiré → on y va ; clic au milieu → table */
const SCR={};let WIRED=false;let CUR=null;let NEXT=-1;let FOCUS=null;
function wire(){if(WIRED||typeof document==='undefined')return;WIRED=true;
  document.addEventListener('scroll',e=>{const t=e.target;if(t&&t.id&&(t.id==='memoire-scroll'||t.id==='memoire-tree'))SCR[t.id]=t.scrollTop;},true);
  document.addEventListener('input',e=>{const t=e.target;if(!t||!t.classList||!t.classList.contains('memoire-q')||!CUR)return;AS().mlbQ=t.value;refreshTree();});
  document.addEventListener('keydown',e=>{if(e.key==='Escape'&&AS().mlbFull&&CUR&&!document.querySelector('#modal.show')){AS().mlbFull=false;if(CUR.render)CUR.render();}});
  document.addEventListener('click',e=>{const t=e.target;if(!t||!t.closest||!CUR)return;const p=t.closest('#memoire-scroll .memoire-p');if(!p||t.closest('button,a,[data-act],input,select,textarea'))return;selectPara(p.dataset.pid,false);});
  document.addEventListener('toggle',e=>{const t=e.target;if(t&&t.id==='memoire-inter')AS().mlbInterOpen=t.open;},true);}
function refreshTree(){if(!CUR)return;const a=H.affGet?H.affGet(CUR.num):null;const L=memLib();const box=document.getElementById('memoire-tree-body');if(!a||!L||!box)return;const M=docModel(a,baseOf(a),'app',CUR.ro,CUR.ctx);box.innerHTML=treeBody(a,L,M.st,CUR.ro,M);after(true);}
/* clic sur un paragraphe du mémoire : sa ligne s'ouvre et s'éclaire dans la table de gauche (sans bouger le mémoire) */
function selectPara(pid,scrollDoc){const L=memLib();if(!L||!pid)return;const x=libIx(L).P[pid];if(!x)return;AS().mlbHL=pid;const o=AS().mlbSec=Object.assign({},AS().mlbSec||{});o[x.s.i]=true;const ex=AS().mlbExp=Object.assign({},AS().mlbExp||{});ex[x.b.id]=true;
  document.querySelectorAll('#memoire-scroll .memoire-p.mem3-sel').forEach(el=>el.classList.remove('mem3-sel'));const el=document.getElementById('memoire-p-'+pid);if(el)el.classList.add('mem3-sel');
  refreshTree();setTimeout(()=>{const r=document.getElementById('memoire-tr-'+pid);const tree=document.getElementById('memoire-tree');if(r){if(tree&&tree.scrollHeight>tree.clientHeight+4){const tr=tree.getBoundingClientRect(),rr=r.getBoundingClientRect();tree.scrollTop+=rr.top-tr.top-tree.clientHeight/2+rr.height/2;SCR['memoire-tree']=tree.scrollTop;}else if(scrollDoc!==false)r.scrollIntoView({block:'center'});r.classList.remove('mem3-flash');void r.offsetWidth;r.classList.add('mem3-flash');}},30);}
function after(treeOnly){setTimeout(()=>{['memoire-scroll','memoire-tree'].forEach(id=>{if(treeOnly&&id==='memoire-scroll')return;const el=document.getElementById(id);if(el&&SCR[id])el.scrollTop=SCR[id];});document.querySelectorAll('#eq-app input[data-mlbind]').forEach(x=>{x.indeterminate=true;});
    if(!treeOnly){const hl=AS().mlbHL;if(hl){const el=document.getElementById('memoire-p-'+hl);if(el)el.classList.add('mem3-sel');}if(FOCUS){const f=FOCUS;FOCUS=null;goFocus(f);}navPos();}},0);}
/* 14/10 après-midi (Ethan : « quand on ajoute ou supprime un bloc, ça doit nous emmener dessus, à sa place ») */
function goFocus(f){const sc=document.getElementById('memoire-scroll');let el=null;if(f.pid&&f.on)el=document.getElementById('memoire-p-'+f.pid);if(!el&&f.bid&&f.on)el=document.getElementById('memoire-b-'+f.bid);
  if(!el&&f.order){for(const id of f.order){el=document.getElementById(id);if(el)break;}}if(!el)return;const inner=sc&&sc.scrollHeight>sc.clientHeight+4;
  if(inner){const sr=sc.getBoundingClientRect(),er=el.getBoundingClientRect();sc.scrollTop+=er.top-sr.top-(f.pid?sc.clientHeight/3:12);SCR['memoire-scroll']=sc.scrollTop;}else el.scrollIntoView({block:f.pid?'center':'start'});
  el.classList.remove('mem3-flash');void el.offsetWidth;el.classList.add('mem3-flash');}
/* ordre des ancres à viser quand un paragraphe / bloc a disparu : les suivants dans la bibliothèque (paragraphes, blocs, section), puis les précédents */
function focusOrder(L,pid,bid){const ix=libIx(L);const ids=[];ix.list.forEach(b=>{ids.push('B:'+b.id);(b.paragraphes||[]).forEach(p=>ids.push('P:'+p.id+':'+b.id));});const k=ids.findIndex(x=>pid?x.startsWith('P:'+pid+':'):x==='B:'+bid);if(k<0)return [];
  const conv=x=>x.startsWith('B:')?'memoire-b-'+x.slice(2):'memoire-p-'+x.split(':')[1];const x=pid?ix.P[pid]:null;const s=x?x.s:ix.secs.find(s=>s.blocs.some(b=>b.id===bid));
  return ids.slice(k+1).map(conv).concat(s?['memoire-s-'+s.i]:[]).concat(ids.slice(0,k).reverse().map(conv));}
/* 14/10 soir (lot M1) : cochage simplifié (memoire_sel.js) — pont vers les fonctions internes du mémoire */
selInit({isSel,libIx,libOf,libSet,kindOf,plain,AS,say,memLib,srcOf,prepRich,memSanitize,fillPara,styleTables,styleOf,focusOrder,K:(a,ctx)=>memK(a,baseOf(a),ctx),cur:a=>(H.affGet&&H.affGet(a.num))||a,focus:f=>{FOCUS=f;},api:()=>A});
/* 14/10 soir (lot M2) : moins de trous rouges (memoire_trous.js) — pont vers les fonctions internes du mémoire */
trousInit({holeLab,filled,fmtVar,VAR_LAB,memSanitize,prepRich,srcOf,libIx,libOf,isSel,kindOf,scan,memLib,memK,baseOf,rowsOf,libSet,regSet,interModal,AS,say,cur:()=>CUR,api:()=>A,who:()=>who(CUR&&CUR.ctx)});
function treeBody(a,L,st,ro,M){const ix=libIx(L);const q=norm(AS().mlbQ||'').trim();const open=AS().mlbSec||{};const exp=AS().mlbExp||{};let found=0;const hl=AS().mlbHL||'';const N=M.num;const sel=st.lib.sel||{};
  const prow=x=>{const p=x.p;const lib=st.lib;const ed=!!(lib.edits&&typeof lib.edits[p.id]==='string');const co=!!(L.corr&&L.corr[p.id]);const t=plain(x.src);const n=x.on?N.para[p.id]:'';
    const lab=x.kind==='image'?'🖼 '+(plain(String(p.legende||''))||((imgOf(L,p.img)||{}).titre)||'Image')+(t?' · '+t:''):x.kind==='equipe'?'👥 Organigramme « moyens humains » (annuaire)':t;
    const auto=p.cond&&sel[p.id]===undefined&&x.auto!==null?`<span class="memoire-tg auto" title="Coché ou décoché d’office d’après le chiffrage (touche la case pour décider toi-même)">⚙ ${esc(condLabel(p.cond,x.auto))}</span>`:'';
    return `<div class="memoire-prow${x.on?' on':''}${hl===p.id?' mem3-hl':''}" id="memoire-tr-${esc(p.id)}">${selPCk(L,x,ro)}<button type="button" class="memoire-ptx" data-act="af" data-v="mlbo|${esc(p.id)}"><span>${n?`<b class="mem3-n">${n}</b> `:''}${p.titre?'<b>'+esc(p.titre)+'</b> · ':''}${esc(lab.length>110?lab.slice(0,107)+'…':lab||'(vide)')}</span><small>${x.holes?`<span class="memoire-tg red">${x.holes} trou${x.holes>1?'s':''}</span>`:''}${auto}${selPTag(L,x)}${p.defaut?'':'<span class="memoire-tg">ajout · à relire</span>'}${ed?'<span class="memoire-tg">modifié ici</span>':''}${co?'<span class="memoire-tg">corrigé</span>':''}</small></button></div>`;};
  const secs=ix.secs.map((s,si)=>{const all=s.blocs.flatMap(b=>(b.paragraphes||[]).map(p=>st.R[p.id]));const hit=x=>!q||norm(s.name+' '+x.b.titre+' '+(x.p.titre||'')+' '+plain(x.src)+' '+(x.p.legende||'')).includes(q);
    const shown=all.filter(hit);if(q&&!shown.length)return '';found+=q?shown.length:0;const on=all.filter(x=>x.on).length;const holes=all.filter(x=>x.on).reduce((n,x)=>n+x.holes,0);const isOpen=!!q||!!open[si];const n1=N.sec[si];
    const blocs=isOpen?s.blocs.map(b=>{const ps=(b.paragraphes||[]).map(p=>st.R[p.id]);const sh=ps.filter(hit);if(q&&!sh.length)return '';const n=ps.length,k=ps.filter(x=>x.on).length,hb=ps.filter(x=>x.on).reduce((m,x)=>m+x.holes,0);const bo=!!q||!!exp[b.id];const n2=N.bloc[b.id];
      return `<div class="memoire-bloc${n2?'':' mem3-off'}" id="memoire-tb-${esc(b.id)}"><div class="memoire-brow">${selBCk(L,M,b,ro)}<button type="button" class="memoire-btx" data-act="af" data-v="mlbexp|${esc(b.id)}"><b>${bo?'▾':'▸'} ${n2?`<span class="mem3-n">${n2}</span> `:''}${esc(b.titre||'(sans titre)')}</b><small>${k} / ${n} paragraphe${n>1?'s':''}${hb?` · <span class="memoire-bad">${hb} trou${hb>1?'s':''}</span>`:''}</small></button></div>${bo?selRows(L,M,b,q?sh:ps,prow,!!q,ro):''}</div>`;}).join(''):'';
    return `<div class="memoire-sec${n1?'':' mem3-empty'}"><div class="m1-sechw">${selSCk(L,M,s,ro)}<button type="button" class="memoire-sech${isOpen?' on':''}" data-act="af" data-v="mlbsec|${si}" title="${n1?'Section '+n1+' du mémoire':'Rien de coché : cette section n’est pas dans le mémoire'}"><b>${isOpen?'▾':'▸'} <span class="mem3-n">${n1?n1+'.':'–'}</span> ${esc(s.name)}</b><small>${selSCount(L,M,s)}${holes?` · <span class="memoire-bad">${holes} trou${holes>1?'s':''}</span>`:''}</small></button></div>${blocs}</div>`;}).join('');
  return (q?`<div class="hint" style="margin:0 0 6px">${found} paragraphe${found>1?'s':''} trouvé${found>1?'s':''}</div>`:'')+(secs||'<div class="eq-s">Rien ne correspond.</div>');}
function itemApp(it,M,canEdit,ro){const pe=canEdit?`<button type="button" class="memoire-pe" data-act="af" data-v="mlbo|${esc(it.pid)}" title="Modifier ce paragraphe, le retirer…" aria-label="Modifier ce paragraphe">✎</button>`:'';
  const inner=it.kind==='equipe'?equipeHTML(it.eq,id=>imgSrc(M.L,id),'app',ro):it.kind==='image'?figDoc(it,M,true):styleTables(it.html,M.T,true);
  return `<div class="memoire-p${it.list?' lst':''}${it.end?' end':''}" id="memoire-p-${esc(it.pid)}" data-pid="${esc(it.pid)}">${pe}${m1ParaX(M,it,canEdit)}${it.titre?`<h3>${it.num} ${esc(it.titre)}</h3>`:''}${inner}</div>`;}
function previewHTML(M,canEdit,ro){const T=M.T,V=M.V,a=M.a;const toc=[];const parts=[];
  M.secs.forEach((S,k)=>{toc.push(`<li><span class="memoire-somn">${S.n1}.</span><button class="lnk" data-act="af" data-v="mlbgo|${S.si}">${esc(S.name)}</button></li>`); /* 14/10 nuit : numéro écrit (un bouton qui passe à la ligne décalait le numéro de la liste sur sa dernière ligne) */
    const body=S.blocs.map(B=>`<div class="mem3-bk" id="memoire-b-${esc(B.b.id)}"><h2>${m1BlocX(M,B,canEdit)}${S.n1}.${B.n2} ${esc(B.b.titre)}</h2>${B.items.map(it=>itemApp(it,M,canEdit,ro)).join('')}${m1BlocAdd(M,B,canEdit)}</div>`).join('');
    const h=`${k>0&&!S.nob?'<hr class="mem3-pb" aria-hidden="true">':''}<section id="memoire-s-${S.si}"><h1>${S.n1}. ${esc(S.name)}</h1>${body}${m1SecAdd(M,S,canEdit)}</section>`;parts.push(S.hse?`<div style="text-align:justify">${h}</div>`:h);});
  const ph=imgSrc(M.L,T.img.couverture),lg=imgSrc(M.L,T.img.logo);
  const cover=`<div class="memoire-cv${ph?' mem3-cvp':''}">${ph?`<div class="mem3-cvph" style="background-image:url('${cssUrl(ph)}')"></div>`:''}<div class="mem3-cvt"><div class="v">${esc(V.ville||'')}</div><div class="y">${new Date().getFullYear()}</div><div class="n">${esc(a.num||'')}</div><div class="t">${T.coverTitle.map(esc).join('<br>')}</div>${lg?`<img class="mem3-cvlg" src="${esc(lg)}" alt="">`:''}<div class="c"><b>${esc(a.nom||'')}</b>${V.client?' · '+esc(V.client):''} · ${esc(V.date)}</div></div></div>`;
  return cover+(toc.length?`<div class="memoire-som"><b>Sommaire</b><ol>${toc.join('')}</ol></div>`:'')+(parts.join('')||'<div class="eq-s">Aucun paragraphe coché : coche à gauche ce qui va dans le mémoire.</div>');}
/* barre des trous, toujours visible en haut du mémoire (comme une recherche : précédent / suivant, n / N) */
function navHTML(holes,st){return m2Nav(holes,st||(RC&&RC.r));} /* 14/10 soir (lot M2, memoire_trous.js) : « n infos à compléter (m trous) », 📝 Tout compléter */
function navPos(){const el=document.getElementById('memoire-navpos');if(!el)return;const hs=[...document.querySelectorAll('#memoire-scroll .memoire-h')];el.textContent=(NEXT>=0&&NEXT<hs.length?NEXT+1:'–')+' / '+hs.length;}
function holeGo(dir){const hs=[...document.querySelectorAll('#memoire-scroll .memoire-h')];if(!hs.length){say('Aucun trou rouge');return;}
  if(NEXT<0||NEXT>=hs.length){const sc=document.getElementById('memoire-scroll');const top=sc&&sc.scrollHeight>sc.clientHeight+4?sc.getBoundingClientRect().top+60:60;const i=hs.findIndex(h=>h.getBoundingClientRect().top>top);NEXT=dir>0?(i<0?0:i):(i<=0?hs.length-1:i-1);}else NEXT=(NEXT+dir+hs.length)%hs.length;
  const h=hs[NEXT];const sc=document.getElementById('memoire-scroll');if(sc&&sc.scrollHeight>sc.clientHeight+4){const sr=sc.getBoundingClientRect(),hr=h.getBoundingClientRect();sc.scrollTop+=hr.top-sr.top-sc.clientHeight/2;SCR['memoire-scroll']=sc.scrollTop;}else h.scrollIntoView({block:'center'});
  try{h.focus({preventScroll:true});}catch(e){}h.classList.remove('mem3-flash');void h.offsetWidth;h.classList.add('mem3-flash');navPos();}
/* 14/10 après-midi : interlocuteurs (annuaire) — panneau de la colonne de gauche */
function interPanel(a,M,canEdit){const I=M.K.I;const nm=p=>p?esc(persName(p)||p.name):'';const miss=[];const line=(lab,v,bad)=>`<div class="mem3-il"><span>${lab}</span><b${bad?' class="bad"':''}>${v}</b></div>`;
  const ch=I.charge?nm(I.charge)+(I.charge.email?'<br><small>'+esc(I.charge.email)+'</small>':''):'à renseigner (fiche de l’affaire)';if(!I.charge)miss.push('chargé');
  const re=I.re?nm(I.re)+(I.reAuto?' <small>(auto)</small>':''):'à choisir';if(!I.re)miss.push('re');const qh=I.qhse?nm(I.qhse):'à régler une fois';if(!I.qhse)miss.push('qhse');
  return `<details class="mem3-inter" id="memoire-inter"${AS().mlbInterOpen?' open':''}><summary>👥 Interlocuteurs${miss.length?` <span class="memoire-tg red">${miss.length} à compléter</span>`:''}</summary>
    ${line('Chargé d’affaires',ch,!I.charge)}${line('Resp. d’exploitation'+(I.sect?' · '+esc(SECT_LAB[I.sect]||I.sect):''),re,!I.re)}${line('Conducteur de travaux',I.cdtx?nm(I.cdtx):'fiche de l’affaire',!I.cdtx)}${line('Chef de chantier',I.chef?nm(I.chef):'à choisir')}
    ${line('Opérateurs',I.ops.length?I.ops.length+' choisi'+(I.ops.length>1?'s':''):'aucun')}${line('QHSE <small>(tous les mémoires)</small>',qh,!I.qhse)}${line('Administratif <small>(tous)</small>',I.admin.length?I.admin.map(nm).join(', '):'—')}
    ${canEdit?`<div class="eq-acts" style="margin:6px 0 2px"><button class="btn sm" data-act="af" data-v="mlbinter|">✎ Choisir les interlocuteurs</button></div>`:''}</details>`;}
export function memLibModeBar(a,mode){const n=(((a||{}).memoire||{}).sections||[]).length;return `<div class="eq-filtres memoire-modes" style="margin-bottom:8px"><button class="chip${mode==='lib'?' active':''}" data-act="af" data-v="mlbmode|lib">📚 Bibliothèque SCR</button><button class="chip${mode==='sections'?' active':''}" data-act="af" data-v="mlbmode|sections">✎ Sections libres${n?' · '+n:''}</button></div>`;}
/* l'étape « 5 · Mémoire » en mode bibliothèque — opt.notes : bulle des notes du DCE pour le mémoire (commerce.js) */
export function memLibHTML(a,canEdit,ctx,opt){opt=opt||{};const L=memLib();if(!L)return '';const T=styleOf(L);injectCSS(T);const ro=!canEdit;CUR={num:a.num,ro,render:ctx&&ctx.render,ctx};const Mm=a.memoire||{};const ix=libIx(L);
  const M=docModel(a,baseOf(a),'app',ro,ctx);const st=M.st;const used=ix.list.filter(b=>(b.paragraphes||[]).some(p=>st.R[p.id].on)).length;const full=!!AS().mlbFull;const pg=estimatePages(M,T);
  const stats=`<div class="ac-stats" id="memoire-stats" style="margin-bottom:8px"><div class="ac-stat ${st.holes?'bad':'ok'}" id="memoire-nholes">${m2Tile(st)}</div><div class="ac-stat"><b>${st.sel} / ${st.tot}</b><small>paragraphes cochés</small></div><div class="ac-stat"><b>${used} / ${ix.list.length}</b><small>blocs utilisés</small></div><div class="ac-stat"><b>${nb(st.words)}</b><small>mots dans le mémoire</small></div><div class="ac-stat" id="memoire-npages" title="Estimation : page de garde, sommaire, saut de page à chaque grande section, images à leur taille"><b>≈ ${pg.word} · ${pg.pdf}</b><small>pages Word · PDF (estimation)</small></div></div>`;
  const intro=!Mm.lib&&!ro?`<div class="hint" style="margin:0 0 8px">Coché d'office : ce qui figure dans le mémoire SCR de référence, et ce que le chiffrage contient (⚙ : coché ou décoché d’après le chiffrage). « Ajout · à relire » : paragraphes rédigés pour compléter, à lire avant de les cocher. En rouge : ce qu'il reste à compléter pour cette affaire (touche pour saisir) ; en bleu : rempli d’office (touche pour changer).${m1Intro()}</div>`:'';
  const tree=`<div class="memoire-tree" id="memoire-tree">${interPanel(a,M,canEdit)}${m1Models(a,L,canEdit)}<input class="f memoire-q" type="search" placeholder="🔎 Rechercher un paragraphe, un bloc…" value="${esc(AS().mlbQ||'')}" aria-label="Rechercher dans la bibliothèque"><div class="memoire-tools"><button class="btn sm" data-act="af" data-v="mlbsecall|1">Tout déplier</button><button class="btn sm" data-act="af" data-v="mlbsecall|0">Tout replier</button>${canEdit&&Mm.lib&&Object.keys(Mm.lib.sel||{}).length?`<button class="btn sm" data-act="af" data-v="mlbreset|" title="Revenir aux paragraphes cochés par défaut et d’après le chiffrage (les trous remplis sont gardés)">↺ Choix par défaut</button>`:''}${m1Tools(a,canEdit)}</div><div id="memoire-tree-body">${treeBody(a,L,st,ro,M)}</div></div>`;
  const card=`<div class="card memoire-card${full?' full':''}" id="memoire-card"><div class="memoire-head"><h3>Mémoire technique · bibliothèque SCR</h3><span class="eq-acts mem3-exp" style="margin:0">${opt.notes||''}${pdfExportBtns() /* 14/10 soir (lot M3) : ⬇ PDF (direct) · ⬇ Word · 🖨 Imprimer */}<button class="btn sm" data-act="af" data-v="mlbfull|" title="${full?'Quitter le plein écran':'Plein écran'}">${full?'⤡ Quitter':'⤢'}</button></span></div>
    <div class="hint" style="margin:0 0 8px">Coche les paragraphes ; l’aperçu montre le mémoire tel qu’il sortira (gabarit SCR${L.version?' · bibliothèque v'+esc(L.version):''}). <button class="lnk" data-act="af" data-v="mlbdoc|" title="Ancien export Word (.doc HTML, sans images)" style="font-size:11.5px">ancien format .doc</button></div>${intro}<div class="memoire-lay">${tree}<div class="memoire-doc"><div class="memoire-scroll" id="memoire-scroll">${navHTML(st.holes)}<div class="memoire-page memoire-scr">${previewHTML(M,canEdit,ro)}</div></div></div></div></div>`;
  after();return (opt.top||'')+stats+card;}

/* ═════════ actions (data-act="af" data-v="mlb…") — renvoie true si traitée ═════════ */
function libSet(a,fn){const cur=(H.affGet&&H.affGet(a.num))||a;const M=Object.assign({},cur.memoire||{});const lib=Object.assign({},M.lib||{});lib.sel=Object.assign({},lib.sel||{});lib.fill=Object.assign({},lib.fill||{});lib.edits=Object.assign({},lib.edits||{});if(lib.inter)lib.inter=Object.assign({},lib.inter);fn(lib);M.lib=lib;if(!M.mode)M.mode='lib';M.libAt=new Date().toISOString();H.affSet(a.num,{memoire:M});}
export function memLibAct(k,arg,arg2,arg3,a,ctx){if(!/^mlb/.test(k))return false;const canEdit=!!ctx.canEdit;const render=()=>{if(ctx.render)ctx.render();};const L=memLib();
  if(k==='mlbmode'){const mode=arg==='lib'?'lib':'sections';if(mode==='lib'&&!L){say('Bibliothèque SCR absente : à importer avec le pack SCR');return true;}const v=AS().mlbView=AS().mlbView||{};if(canEdit){delete v[a.num];const M=Object.assign({},a.memoire||{},{mode});H.affSet(a.num,{memoire:M});}else v[a.num]=mode;render();return true;}
  if(!L)return true;const ix=libIx(L);const K=()=>memK(a,baseOf(a),ctx);
  switch(k){
    case 'mlbsec':{const o=AS().mlbSec=Object.assign({},AS().mlbSec||{});o[arg]=!o[arg];render();return true;}
    case 'mlbsecall':{AS().mlbSec=arg==='1'?Object.fromEntries(ix.secs.map((s,i)=>[i,true])):{};if(arg!=='1')AS().mlbExp={};render();return true;}
    case 'mlbexp':{const o=AS().mlbExp=Object.assign({},AS().mlbExp||{});o[arg]=!o[arg];render();return true;}
    case 'mlbp':return selAct(k,arg,arg2,a,ctx); /* 14/10 soir (lot M1, memoire_sel.js) : ↶ Annuler, variantes, message */
    case 'mlbb':return selAct(k,arg,arg2,a,ctx); /* 14/10 soir (lot M1) : la case d'un bloc met son JEU STANDARD (bloc vide) ou retire tout le bloc (entamé ou plein) */
    case 'mlbreset':return selAct(k,arg,arg2,a,ctx); /* 14/10 soir (lot M1) : annulable */
    case 'mlbs':case 'mlbalt':case 'mlbball':case 'mlbres':case 'mlbx':case 'mlbbx':case 'mlbbstd':case 'mlbdisp':case 'mlbpset':case 'mlbundo':case 'mlbmodapp':case 'mlbmodsave':case 'mlbmoddel':return selAct(k,arg,arg2,a,ctx); /* 14/10 soir (lot M1) : section, variantes, réserve, ✕ / ＋ de l'aperçu, ↶ Annuler, modèles */
    case 'mlbh':{if(!canEdit)return true;holeModal(a,L,arg,+arg2,ctx);return true;}
    case 'mlbv':{if(!canEdit)return true;varModal(a,arg,ctx);return true;}
    case 'mlbtc':{if(!canEdit)return true;m2AllModal(a,L,ctx);return true;} /* 14/10 soir (lot M2) : 📝 Tout compléter */
    case 'mlbo':{paraModal(a,L,arg,ctx);return true;}
    case 'mlbgo':{const el=document.getElementById('memoire-s-'+arg);if(el)el.scrollIntoView({block:'start',behavior:'smooth'});return true;}
    case 'mlbnext':holeGo(1);return true;
    case 'mlbprev':holeGo(-1);return true;
    case 'mlbsel':selectPara(arg,true);return true;
    case 'mlbinter':{if(!canEdit){say('Lecture seule');return true;}interModal(a,L,ctx);return true;}
    case 'mlbdoc':{try{memLibWordDoc(a,baseOf(a),ctx);}catch(e){console.warn(e);}return true;}
    case 'mlbfull':{AS().mlbFull=!AS().mlbFull;render();return true;}
  }
  return true;}
/* saisie d'un trou [[À COMPLÉTER : …]] — 14/10 soir (lot M2, memoire_trous.js) : « même valeur pour les n autres trous » cochée d'office, puces « ex. »,
   « Retenir pour les prochains mémoires » (réglage de l'entreprise), « Ne plus retenir » ; un trou rempli d'office ou retenu se change ici */
function holeModal(a,L,pid,i,ctx){return m2HoleModal(a,L,pid,i,ctx);}
const CALC_VARS=['nb','ml','jS','jM','dns','soudParDn','equipes','nbEquipes','joursOuvres','debut','fin','nbSst','nbVpi','nbRacc','nbEpreuves','nbDecharg','radioPct','purgesDn','purgesPaires','vidangesDn','vidangesPaires','vidangesType','typeManchon','nbZones','nbFronts','radioFd','radioAnt','zonesListe','raccTxt','vidangesMode'];
function varModal(a,name,ctx){const K=memK(a,baseOf(a),ctx);const V=K.V;const lib=libOf(a);const key='{{'+name+'}}';const cur=(lib.fill||{})[key]||'';const known=name in V;const calc=typeof V[name]==='object'?'':fmtVar(V[name]);const F=K.F;
  const why=name==='nbEquipes'?`Calcul : ${nb(F.tot.qS)} jours de soudure ÷ ${F.ouvres?nb(F.ouvres)+' jours ouvrés ('+esc(F.ouvresSrc)+')':'jours ouvrés inconnus (mets les dates des zones dans le chiffrage, ou le délai dans 1 · Dossier)'}${calc?' = '+esc(calc)+' équipe(s)':''}. Tu peux mettre un autre nombre pour ce mémoire.`
    :calc?`Valeur ${CALC_VARS.includes(name)?'calculée depuis le chiffrage':['chargeEmail','chargeTel','email','tel','re','reEmail','reTel','qhse','chef','cdtxEmail','cdtxTel'].includes(name)?'prise dans l’annuaire':['assureurRc','policeRc','validiteRc','assureurDec','policeDec','validiteDec'].includes(name)?'prise dans les documents d’entreprise':'de l’affaire'} : <b>${esc(calc)}</b>. Saisis une autre valeur pour ce mémoire seulement (vide = garder ${esc(calc)}).`
    :known?(name==='delai'?'Vide dans l’affaire : renseigne-le dans 1 · Dossier, ou saisis ici la valeur pour ce mémoire.':CALC_VARS.includes(name)?'Calculé depuis le chiffrage (vide tant qu’il n’est pas fait) : saisis ici une valeur pour ce mémoire, ou fais le chiffrage.':['assureurRc','policeRc','validiteRc','assureurDec','policeDec','validiteDec'].includes(name)?'L’attestation d’assurance n’est pas (ou plus) déposée dans les documents d’entreprise : saisis la valeur ici, ou dépose l’attestation.':'Vide dans l’affaire : saisis ici la valeur pour ce mémoire (ou renseigne la fiche de l’affaire / l’annuaire).'):'Variable {{'+esc(name)+'}} inconnue de l’appli : saisis la valeur pour ce mémoire.';
  A.openModal(`<h3 style="margin-top:0">${calc?'':'À compléter : '}${esc(VAR_LAB[name]||name)}</h3><div class="hint" style="margin:0 0 6px">${why}</div><input class="f" id="memoire-vv" value="${esc(cur)}" placeholder="${qa(calc||'')}" autocomplete="off">
    <div class="actions" style="margin-top:8px"><button class="btn primary block" id="memoire-vok">Enregistrer</button>${cur?`<button class="btn block" id="memoire-vclr">${calc?'Revenir au calcul':'Vider (redevient rouge)'}</button>`:''}<button class="btn block" data-close>Annuler</button></div>`);
  const inp=document.getElementById('memoire-vv');const save=clear=>{const v=clear?'':String(inp.value||'').trim();libSet(a,lib2=>{if(v)lib2.fill[key]=v;else delete lib2.fill[key];});A.closeModal();if(ctx.render)ctx.render();say(v?'Valeur enregistrée pour ce mémoire':(calc?'Valeur calculée reprise':'Valeur vidée'));};
  document.getElementById('memoire-vok').onclick=()=>save(false);const c=document.getElementById('memoire-vclr');if(c)c.onclick=()=>save(true);inp.onkeydown=e=>{if(e.key==='Enter'){e.preventDefault();save(false);}};setTimeout(()=>{try{inp.focus();}catch(e){}},50);}
/* fiche d'un paragraphe : lire (même décoché), mettre / retirer, modifier pour cette affaire, corriger la bibliothèque */
function paraModal(a,L,pid,ctx){const ix=libIx(L);const x=ix.P[pid];if(!x)return;const canEdit=!!ctx.canEdit;const lib=libOf(a);const K=memK(a,baseOf(a),ctx);const on=isSel(lib,x.p,K);const ed=typeof (lib.edits||{})[pid]==='string';const co=L.corr&&L.corr[pid];const T=styleOf(L);injectCSS(T);const kind=kindOf(x.p);
  let body;if(kind==='equipe')body=equipeHTML(equipeModel(x.p,K.I),id=>imgSrc(L,id),'app',true);else{const r=fillPara(prepRich(memSanitize(srcOf(L,lib,pid))),pid,lib.fill||{},K.V,'app',true);body=kind==='image'?figDoc({imgId:x.p.img,img:imgOf(L,x.p.img),legende:esc(plain(String(x.p.legende||''))),largeur:num(x.p.largeur,100,5,100),cote:x.p.cote==='gauche'||x.p.cote==='droite'?x.p.cote:'',html:r.html},{T,L},true):styleTables(r.html,T,true);}
  const auto=x.p.cond?condEval(x.p.cond,K.F,K.ext):null;
  A.openModal(`<h3 style="margin-top:0">${esc(x.b.titre||'(sans titre)')}</h3><div class="hint">${esc(x.s.name)}${x.p.titre?' › '+esc(x.p.titre):''} · ${on?'<b>dans le mémoire</b>':'pas dans le mémoire'}${x.p.defaut?' · coché d’office':' · ajout à relire'}${selVarTag(L,pid)}${x.p.cond?' · ⚙ '+esc(condLabel(x.p.cond,auto===null?true:auto))+(auto===null?' (pas de chiffrage : choix par défaut)':''):''}${ed?' · modifié pour cette affaire':''}${co?' · corrigé dans la bibliothèque le '+esc(dFR(co.at))+(co.by?' par '+esc(co.by):''):''}</div>
    <div class="memoire-page memoire-scr memoire-mpv">${body}</div>
    <div class="actions" style="display:flex;flex-direction:column;gap:6px">${canEdit?`<button class="btn ${on?'':'primary '}block" id="memoire-pon">${on?'☐ Retirer du mémoire':'☑ Mettre dans le mémoire'}</button>${kind==='equipe'?'<button class="btn block" id="memoire-pint">👥 Choisir les interlocuteurs</button>':`<button class="btn block" id="memoire-ped">✎ Modifier ${kind==='image'?'le texte ':''}pour cette affaire</button>${ed?'<button class="btn block" id="memoire-prs">↺ Revenir au texte de la bibliothèque</button>':''}<button class="btn block" id="memoire-pco">📚 Corriger dans la bibliothèque (tous les mémoires)</button>${co?'<button class="btn block" id="memoire-pcr">↺ Bibliothèque : revenir au texte importé</button>':''}`}`:''}<button class="btn block" data-close>Fermer</button></div>`);
  if(!canEdit)return;const g=id=>document.getElementById(id);const done=t=>{A.closeModal();if(ctx.render)ctx.render();if(t)say(t);};
  g('memoire-pon').onclick=()=>{A.closeModal();selAct('mlbpset',pid,on?'0':'1',a,ctx);}; /* 14/10 soir (lot M1) : annulable ; une variante mise remplace les autres */
  if(g('memoire-pint'))g('memoire-pint').onclick=()=>interModal(a,L,ctx);
  if(g('memoire-ped'))g('memoire-ped').onclick=()=>editModal(a,L,pid,ctx,'aff');if(g('memoire-pco'))g('memoire-pco').onclick=()=>editModal(a,L,pid,ctx,'lib');
  if(g('memoire-prs'))g('memoire-prs').onclick=()=>{if(!confirm('Reprendre le texte de la bibliothèque pour ce paragraphe ? Ta version pour cette affaire est abandonnée.'))return;libSet(a,l=>{delete l.edits[pid];});done('Texte de la bibliothèque repris');};
  if(g('memoire-pcr'))g('memoire-pcr').onclick=()=>{if(!confirm('Annuler la correction de la bibliothèque (retour au texte importé du pack) ?'))return;const c2=Object.assign({},L.corr||{});delete c2[pid];regSet('doc','memlib',{corr:c2});done('Bibliothèque : texte importé repris');};}
/* éditeur : trous et valeurs = jetons non modifiables (on les garde ou on les supprime) ; enregistré en HTML nettoyé, trous et variables remis en [[…]] / {{…}} */
function editModal(a,L,pid,ctx,scope){const lib=libOf(a);const src=memSanitize(scope==='aff'?srcOf(L,lib,pid):libSrc(L,pid));const F=scope==='aff'?(lib.fill||{}):{};const V=scope==='aff'?memK(a,baseOf(a),ctx).V:{};const seen={};
  const html=src.replace(RX,(m,h,vn)=>{if(h!==undefined){const lab=holeLab(h);const n=seen[lab]=(seen[lab]===undefined?0:seen[lab]+1);const key=pid+'|'+lab+'|'+n;const val=F[key];return `<span class="memoire-tok${filled(val)?'':' red'}" contenteditable="false" data-src="${qa(m)}" data-k="${qa(key)}" data-lab="${qa(lab)}">${filled(val)?esc(val):lab}</span>`;}
    const val=(typeof V[vn]==='object'?(V[vn]?'[liste générée : '+(VAR_LAB[vn]||vn)+']':''):fmtVar(V[vn]))||(filled(F['{{'+vn+'}}'])?String(F['{{'+vn+'}}']):'');return `<span class="memoire-tok${val?'':' red'}" contenteditable="false" data-src="${qa(m)}">${val?esc(val):'{{'+vn+'}}'}</span>`;});
  A.openModal(`<h3 style="margin-top:0">${scope==='aff'?'Modifier pour cette affaire':'Corriger dans la bibliothèque SCR'}</h3><div class="hint">${scope==='aff'?'Seulement le mémoire de '+esc(a.num)+' : la bibliothèque ne change pas.':'<b>Pour tous les mémoires</b> qui utilisent ce paragraphe (y compris ceux en cours) ; un texte modifié pour une affaire reste tel quel.'} Les zones en couleur sont des trous ou des valeurs de l’affaire : garde-les ou supprime-les, sans les retaper.</div>
    <div class="memoire-page memoire-scr memoire-ed" id="memoire-ed" contenteditable="true" spellcheck="true">${html}</div><div class="actions" style="margin-top:8px"><button class="btn primary block" id="memoire-eok">Enregistrer</button><button class="btn block" data-close>Annuler</button></div>`);
  const ed=document.getElementById('memoire-ed');ed.addEventListener('paste',e=>{e.preventDefault();const t=(e.clipboardData||window.clipboardData).getData('text/plain');document.execCommand('insertText',false,t);});
  document.getElementById('memoire-eok').onclick=()=>{const c=ed.cloneNode(true);const oldBy={};c.querySelectorAll('.memoire-tok').forEach(t=>{if(t.dataset.k){(oldBy[t.dataset.lab]=oldBy[t.dataset.lab]||[]).push(t.dataset.k);}t.replaceWith(document.createTextNode(t.dataset.src||''));});
    const out=memSanitize(c.innerHTML);const x=libIx(L).P[pid];if(!plain(out)&&!/<table>/.test(out)&&!(x&&x.p.type==='image')){say('Texte vide : pour enlever le paragraphe, décoche-le');return;}
    if(scope==='aff'){const same=out===memSanitize(libSrc(L,pid));const newBy={};scan(out,pid).forEach(it=>{if(it.t==='h')(newBy[it.lab]=newBy[it.lab]||[]).push(it.key);});
      libSet(a,l=>{const f2={};Object.keys(l.fill).forEach(k2=>{if(!k2.startsWith(pid+'|'))f2[k2]=l.fill[k2];});Object.keys(newBy).forEach(lab=>{newBy[lab].forEach((nk,j)=>{const ok=(oldBy[lab]||[])[j];if(ok&&filled(l.fill[ok]))f2[nk]=l.fill[ok];});});l.fill=f2;if(same)delete l.edits[pid];else l.edits[pid]=out;});
      A.closeModal();if(ctx.render)ctx.render();say(same?'Texte identique à la bibliothèque':'Paragraphe modifié pour '+a.num+' (la bibliothèque ne change pas)');}
    else{if(!confirm('Corriger ce paragraphe dans la bibliothèque SCR, pour tous les mémoires ?'))return;const c2=Object.assign({},L.corr||{});c2[pid]={html:out,at:new Date().toISOString(),by:who(null)};regSet('doc','memlib',{corr:c2});A.closeModal();if(ctx.render)ctx.render();say('📚 Bibliothèque corrigée');}};
  setTimeout(()=>{try{ed.focus();}catch(e){}},50);}
/* 14/10 après-midi (Ethan : « chargé d'affaires tu l'as ; responsable d'exploitation c'est selon le secteur du chiffrage ; responsable QHSE toujours la même ;
   les opérateurs peuvent changer : tu mets la liste du personnel pour choisir ») — QHSE et administratif : réglages de la bibliothèque (memlib.reglages) */
const TERRAIN=['chef','soudeur','tuyauteur','manchonneur','activites_specifiques','chauffeur_engin','autre'];
const posteLab=k=>{try{const P=window.TRACE&&window.TRACE.acces&&window.TRACE.acces.POSTES;if(P&&P[k])return P[k];}catch(e){}return String(k||'').replace(/_/g,' ');};
function interModal(a,L,ctx){const I=memInter(a,L,ctx);const dir=I.dir;const lib=libOf(a);const X=lib.inter||{};const R=(L&&L.reglages)||{};const ref=p=>p?{id:p.id,name:p.name}:null;
  const opt=(list,cur,first)=>`<option value="">${first}</option>`+list.map(p=>`<option value="${esc(p.id)}"${cur&&(cur.id===p.id||cur.name===p.name)?' selected':''}>${esc(p.name)}${p.poste?' · '+esc(posteLab(p.poste)):''}</option>`).join('');
  const sortBy=(list,postes)=>list.slice().sort((x,y)=>(postes.includes(y.poste)-postes.includes(x.poste))||x.name.localeCompare(y.name,'fr'));
  const reAuto=I.reAuto&&I.re?I.re:null;const opsSel=new Set((X.ops||[]).map(o=>typeof o==='object'?o.id:o));const admSel=new Set((Array.isArray(R.admin)?R.admin:I.admin).map(o=>typeof o==='object'?o.id:o));
  const terrain=sortBy(dir.filter(p=>TERRAIN.includes(p.poste)||!p.poste),['soudeur','tuyauteur','manchonneur']);
  A.openModal(`<h3 style="margin-top:0">👥 Interlocuteurs du mémoire</h3><div class="hint" style="margin:0 0 8px">Chargé d’affaires (<b>${esc(I.charge?I.charge.name:'à renseigner')}</b>) et conducteur (<b>${esc(I.cdtx?I.cdtx.name:'à renseigner')}</b>) : fiche de l’affaire. Le responsable d’exploitation est celui du secteur de l’affaire${I.sect?' ('+esc(SECT_LAB[I.sect]||I.sect)+')':''}, sauf choix ici.</div>
    ${dir.length?'':'<div class="warnbox" style="margin:0 0 8px">Annuaire vide sur cet appareil : les comptes ne sont pas encore chargés.</div>'}
    <label class="f">Responsable d’exploitation</label><select class="f" id="mem3-re">${opt(sortBy(dir,['resp_exploitation']),X.re?I.re:null,reAuto?'Auto : '+esc(reAuto.name)+' (secteur)':'— à choisir —')}</select>
    <label class="f">Chef de chantier / chef d’équipe</label><select class="f" id="mem3-chef">${opt(sortBy(dir,['chef']),I.chef,'—')}</select>
    <label class="f">Opérateurs <span class="dim">(liste du personnel)</span></label><input class="f" id="mem3-opq" type="search" placeholder="🔎 Filtrer" autocomplete="off"><div class="mem3-ops-list" id="mem3-ops">${terrain.map(p=>`<label data-n="${esc(p.name.toLowerCase())}"><input type="checkbox" value="${esc(p.id)}" ${opsSel.has(p.id)||opsSel.has(p.name)?'checked':''}> ${esc(p.name)} <span class="dim">· ${esc(posteLab(p.poste))}</span></label>`).join('')||'<div class="eq-s">Personne sur le terrain dans l’annuaire.</div>'}</div>
    <div class="eq-lab" style="margin-top:6px">Réglés une fois, pour tous les mémoires</div>
    <label class="f">Responsable QHSE</label><select class="f" id="mem3-qhse">${opt(dir,I.qhse,'— à choisir dans l’annuaire —')}</select>
    <label class="f">Administratif et finances</label><div class="mem3-ops-list" id="mem3-adm">${sortBy(dir,['resp_admin_fin','resp_rh','assist_rh']).map(p=>`<label><input type="checkbox" value="${esc(p.id)}" ${admSel.has(p.id)||admSel.has(p.name)?'checked':''}> ${esc(p.name)} <span class="dim">· ${esc(posteLab(p.poste))}</span></label>`).join('')}</div>
    <div class="actions" style="margin-top:8px"><button class="btn primary block" id="mem3-iok">Enregistrer</button><button class="btn block" data-close>Annuler</button></div>`);
  const g=id=>document.getElementById(id);const q=g('mem3-opq');if(q)q.oninput=()=>{const v=q.value.trim().toLowerCase();g('mem3-ops').querySelectorAll('label[data-n]').forEach(l=>{l.style.display=!v||l.dataset.n.includes(v)?'':'none';});};
  g('mem3-iok').onclick=()=>{const byId=id=>ref(dir.find(p=>p.id===id));const re=g('mem3-re').value,chef=g('mem3-chef').value;const ops=[...g('mem3-ops').querySelectorAll('input:checked')].map(i=>byId(i.value)).filter(Boolean);
    const qh=g('mem3-qhse').value;const adm=[...g('mem3-adm').querySelectorAll('input:checked')].map(i=>byId(i.value)).filter(Boolean);
    libSet(a,l=>{l.inter=Object.assign({},l.inter||{},{re:re?byId(re):null,chef:chef?byId(chef):null,ops});});
    const R2=Object.assign({},R);let ch=false;const q2=qh?byId(qh):null;if(JSON.stringify(q2)!==JSON.stringify(R.qhse||null)){R2.qhse=q2;ch=true;}const autoIds=I.adminAuto?I.admin.map(p=>p.id).sort().join('|'):null;const newIds=adm.map(p=>p.id).sort().join('|');
    if(!I.adminAuto||newIds!==autoIds){if(JSON.stringify(adm)!==JSON.stringify(R.admin||null)){R2.admin=adm;ch=true;}}
    if(ch)regSet('doc','memlib',{reglages:R2});A.closeModal();if(ctx.render)ctx.render();say('Interlocuteurs enregistrés'+(ch?' (QHSE / administratif : pour tous les mémoires)':''));};}
