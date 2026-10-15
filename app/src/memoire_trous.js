// memoire_trous.js — 14/10 soir (lot M2) : MOINS DE TROUS ROUGES dans le mémoire technique (bibliothèque SCR, écran « 5 · Mémoire » de memoire2.js).
// Ethan : « re-scanne bien tous les trous par défaut, il y en a qui sont complétables encore tout seuls, et avoir moins de trous ».
// · Un trou [[À COMPLÉTER : …]] prend, dans l'ordre : la valeur saisie pour ce mémoire (lib.fill) > une valeur d'office (affaire, chiffrage, annuaire, contexte
//   du paragraphe, n° d'annexe) > la valeur retenue pour tous les mémoires (memlib.reglages.trous, contrat K2) > facultatif (gris, jamais compté, absent de
//   l'export) > rouge. Les clés des trous (pid|libellé|n) ne changent pas : les trous déjà remplis le restent.
// · Contexte du paragraphe : un libellé répété dans un même tableau (tranche ferme / tranche conditionnelle…) n'est pas rempli d'office (une valeur par ligne) ;
//   « téléphone et e-mail » (ou « téléphone », « e-mail ») prend le contact de la personne de la même ligne du tableau, ou nommée juste avant (annuaire).
// · Annexes : les puces cochées de la section (ou du bloc) « Annexes » sont numérotées « Annexe n – … » (texte simple : aperçu, Word, impression, PDF) ; un trou
//   « n° d'annexe » ailleurs prend le numéro de la puce qui correspond au texte de son paragraphe (mots communs) ; puce non cochée → rouge avec l'aide.
// · Facultatifs (OPT_HOLES de memoire3.js) : seulement là où la phrase reste juste sans eux (entre parenthèses, après « – » ou « : », seul dans sa cellule,
//   en fin de ligne après un nom, phrase entière) ; ailleurs le trou reste rouge. Export : rien, séparateurs orphelins et doubles espaces nettoyés (contrat K4).
// · « Retenir pour les prochains mémoires » (réglage de l'entreprise, coché d'office pour les valeurs de l'entreprise) ; « 📝 Tout compléter » : une fenêtre,
//   un champ par information (tous les trous du même libellé d'un coup), puces « ex. », facultatifs repliés ; compteurs « n infos à compléter (m trous) ».
import {normTxt,autoHoleVar,optHole,entHole,neverRet,contactKind,annexKind,exChips,affSecteur,persName,equipeModel,ROLE_LAB} from './memoire3.js';
let B=null; /* pont posé par memoire2.js (trousInit) : holeLab, filled, fmtVar, VAR_LAB, memSanitize, prepRich, srcOf, libIx, libOf, isSel, kindOf, scan, memLib, memK, baseOf, rowsOf, libSet, regSet, interModal, cur, api, say, who */
export function trousInit(api){B=api;}
const esc=s=>String(s??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const ent=s=>String(s??'').replace(/&nbsp;/g,' ').replace(/&lt;/g,'<').replace(/&gt;/g,'>').replace(/&quot;/g,'"').replace(/&#39;/g,"'").replace(/&amp;/g,'&');
const cut=(t,n)=>{t=String(t||'').trim();return t.length>n?t.slice(0,n-1)+'…':t;};
const pl=(n,s,p)=>n+' '+(n>1?(p||s+'s'):s);
const tail=(t,n)=>{t=String(t||'').trim();return t.length>n?'… '+t.slice(-n).replace(/^\S*\s+/,''):t;}; /* fin d'un texte, coupée à un mot */
const M='\uE000'; /* trou facultatif vide (mode 'doc') : marqueur retiré par le nettoyage, jamais dans l'export */

/* ═════════ contexte d'une affaire : posé (caché, non énumérable) sur K.V par memK — fillPara le retrouve même appelé sans lui (M1, fiche d'un paragraphe) ═════════ */
const HXS=Symbol('m2');
export function m2Bind(K,a,L){try{Object.defineProperty(K.V,HXS,{value:{a:a||{},L,K,c:{}},enumerable:false,configurable:true});}catch(e){}return K;}
export const m2X=V=>(V&&V[HXS])||null;
/* signature de l'annuaire (contacts) pour le mémo des comptes (rowsOf) */
export const m2Sig=K=>{try{return ((K.I&&K.I.dir)||[]).map(p=>p.name+'|'+(p.tel||'')+'|'+(p.email||'')).join(';');}catch(e){return '';}};

/* ═════════ analyse d'un paragraphe (HTML nettoyé) : trous dans l'ordre (même rang i que scan), tableau, ligne, bloc, texte autour ═════════ */
const TOK=/<(\/?)([a-zA-Z][a-zA-Z0-9]*)\b[^>]*>|\[\[([^\[\]<>]{1,400}?)\]\]|\{\{\s*([A-Za-z_][A-Za-z0-9_]*)\s*\}\}/g;
const BLK=new Set(['p','li','td','th','h4','tr','table','ul','ol','thead','tbody']);
const PIC=new Map();
export function m2Para(html,pid){const k=pid+'\u0001'+html;let v=PIC.get(k);if(!v){v=para_(String(html||''),pid);if(PIC.size>3000)PIC.clear();PIC.set(k,v);}return v;}
function para_(html,pid){const it=[],stk=[],tst=[];let last=0,m,blk=0,line=0,tbl=-1,tr=-1,tn=0,rn=0,hi=-1;const seen={};const re=new RegExp(TOK.source,'g');
  const push=o=>{o.blk=blk;o.line=line;o.tbl=tbl;o.tr=tr;o.cell=stk.includes('td')||stk.includes('th');it.push(o);};
  while((m=re.exec(html))){if(m.index>last)push({t:'x',s:ent(html.slice(last,m.index))});last=re.lastIndex;
    if(m[2]){const tag=m[2].toLowerCase(),cl=!!m[1];if(tag==='table'){if(!cl){tst.push(tbl);tbl=tn++;}else tbl=tst.length?tst.pop():-1;}if(tag==='tr')tr=cl?-1:rn++;
      if(BLK.has(tag)){blk++;line=0;if(!cl)stk.push(tag);else{const j=stk.lastIndexOf(tag);if(j>=0)stk.length=j;}}else if(tag==='br')line++;}
    else if(m[3]!==undefined){hi++;const lab=B.holeLab(m[3]);const n=seen[lab]=(seen[lab]===undefined?0:seen[lab]+1);push({t:'h',i:hi,lab,n,key:pid+'|'+lab+'|'+n,nl:normTxt(ent(lab))});}
    else push({t:'v',name:m[4]});}
  if(last<html.length)push({t:'x',s:ent(html.slice(last))});
  const tx=o=>o.t==='x'?o.s:'\u0002';const H=it.filter(o=>o.t==='h');
  H.forEach(h=>{const k=it.indexOf(h);let b4='',af='';for(let j=k-1;j>=0&&it[j].blk===h.blk&&it[j].line===h.line;j--)b4=tx(it[j])+b4;for(let j=k+1;j<it.length&&it[j].blk===h.blk&&it[j].line===h.line;j++)af+=tx(it[j]);
    h.b4=b4.replace(/\s+/g,' ');h.af=af.replace(/\s+/g,' ');let bt='';it.forEach(o=>{if(o.blk===h.blk)bt+=o===h?'\u0001':o.t==='x'?o.s:' ';});h.btx=bt.replace(/\s+/g,' ');
    const seg=o=>h.tr>=0?o.tr===h.tr:o.blk===h.blk;const bef=[],aft=[];it.forEach((o,j)=>{if(o!==h&&(o.t==='h'||o.t==='v')&&seg(o))(j<k?bef:aft).push(o);});h.refs=bef.reverse().concat(aft); /* personnes nommées autour : la plus proche d'abord */
    if(h.tr>=0){let r='';for(let j=0;j<k;j++)if(it[j].tr===h.tr)r+=tx(it[j]);h.row=r.replace(/\s+/g,' ').trim();const f=it.find(o=>o.tr===h.tr&&o.t==='x'&&o.s.trim());h.row0=f?f.s.trim():'';}
    h.multi=h.tbl>=0&&H.filter(x=>x.tbl===h.tbl&&x.nl===h.nl).length>1;});
  return {h:H,v:it.filter(o=>o.t==='v'),txt:it.filter(o=>o.t==='x').map(o=>o.s).join(' ').replace(/\s+/g,' ').trim()};}
/* place d'un trou facultatif : la phrase reste-t-elle juste sans lui ? */
const PREP=new Set('a au aux de du des d le la les l un une en par pour sur dans avec sans selon vers chez entre sous et ou que qui dont est sont soit son sa ses notre nos leur leurs ce cet cette ces afin'.split(' '));
function safePos(h){const b=h.b4.replace(/\s+$/,''),f=h.af.replace(/^\s+/,'');
  if(h.cell&&!b.trim()&&!f.trim())return true; /* seul dans sa cellule */
  if(/\($/.test(b)&&/^\)/.test(f))return true; /* (TROU) */
  if(/(^|\s)[–—-]$/.test(b))return true; /* … – TROU */
  if(/:$/.test(b)&&/^([,;.]|$)/.test(f))return true; /* Libellé : TROU */
  if(/^[.;]?$/.test(f)){if(!b||/[.!?]$/.test(b))return true;const w=normTxt(b).split(/[^a-z0-9\u0002]+/).filter(Boolean).pop()||'';return !!w&&!PREP.has(w);} /* phrase entière, fin de ligne après un nom (pas après « pour », « en »…) */
  if(/^[–—]/.test(f)&&(!b||/[.:]$/.test(b)))return true; /* TROU – suite */
  return false;}
const indiv=h=>h.multi||!!contactKind(h.nl)||annexKind(h.nl); /* un champ par trou (valeurs différentes) */

/* ═════════ résolution d'un trou : {st:'f'|'a'|'r'|'o'|'h', v, src, g (info : groupe de « Tout compléter »), rk (clé de valeur retenue), hint} ═════════ */
export function m2Res(X,PI,pid,i,lab,n,F,V){const key=pid+'|'+lab+'|'+n;const fv=F[key];if(B.filled(fv))return {st:'f',v:String(fv)};const h=PI&&PI.h[i];
  if(!X||!h){const av=autoHoleVar(lab);const aval=av?B.fmtVar(V[av]):'';return aval?{st:'a',v:aval,src:B.VAR_LAB[av]||av}:{st:'h',g:'L:'+lab};}
  let red=null;const nl=h.nl;
  const ck=contactKind(nl);if(ck){const r=contactRes(X,h,ck,F,V);if(r){if(r.st==='a')return r;red=r;}}
  if(annexKind(nl)){const r=annexRes(X,PI,pid,h);if(r.st==='a')return r;red=r;}
  if(!red&&!h.multi){const av=autoHoleVar(lab);const aval=av?B.fmtVar(V[av]):'';if(aval)return {st:'a',v:dedup(h,aval),src:B.VAR_LAB[av]||av};}
  const rk=retKey(X,h);if(rk){const T=((X.L&&X.L.reglages)||{}).trous||{};const r=T[rk.k];if(r&&B.filled(r.v))return {st:'r',v:String(r.v),rk,by:r.by||'',at:r.at||''};}
  if(optHole(nl)&&safePos(h))return {st:'o',g:indiv(h)?'K:'+key:'O:'+lab,rk,hint:red?red.hint:''};
  return {st:'h',g:indiv(h)?'K:'+key:'L:'+lab,rk,hint:red?red.hint:''};}
/* « … du lot » + « Lot 2 · … » → « … du lot 2 · … » (le mot juste avant le trou n'est pas répété) */
const dedup=(h,v)=>{const w=normTxt(h.b4).split(/[^a-z0-9]+/).filter(Boolean).pop()||'';const m=/^\s*(\S+)\s+/.exec(v);return w.length>=2&&m&&normTxt(m[1])===w?v.slice(m[0].length):v;};
/* clé d'une valeur retenue (null = jamais proposée) : libellé normalisé ; « agence… » par secteur ; adresse du maître d'ouvrage / d'œuvre par nom */
const rowRole=h=>{const t=normTxt(String(h.row||'').replace(/[\u0001\u0002]/g,' '));return /^maitre d'ouvrage(?! delegue)/.test(t)?'moa':/^maitre d'oeuvre/.test(t)?'moe':'';};
function retKey(X,h){const nl=h.nl;if(contactKind(nl)||annexKind(nl)||autoHoleVar(h.lab))return null;const role=h.tr>=0&&/^adresse et telephone$/.test(nl)?rowRole(h):'';if(h.multi&&!role)return null;
  const base=role==='moa'?"adresse et telephone du maitre d'ouvrage":role==='moe'?"adresse et telephone du maitre d'oeuvre":nl;if(neverRet(base))return null;const a=X.a||{};let k=base;
  if(/\bagence\b/.test(base))k+='|secteur:'+(affSecteur(a)||'');
  if(base==="adresse et telephone du maitre d'ouvrage"){const nm=normTxt(a.moa||a.client||'');if(!nm)return null;k+='|moa:'+nm;}
  if(base==="adresse et telephone du maitre d'oeuvre"){const nm=normTxt(a.moe||'');if(!nm)return null;k+='|moe:'+nm;}
  return {k,ent:entHole(base)};}
/* contact de la personne de la même ligne de tableau (ou nommée juste avant dans le paragraphe) */
const PERS=['re','charge','cdtx','chef','qhse','admin'];const CKV={tel:'Tel',email:'Email',both:'Contact'};
const ctOf=(p,ck)=>ck==='tel'?p.tel||'':ck==='email'?p.email||'':[p.tel,p.email].filter(Boolean).join(' · ');
function dirFind(X,name){const k=normTxt(name);if(!k)return null;const dir=(X.K&&X.K.I&&X.K.I.dir)||[];return dir.find(p=>[p.name,persName(p),[p.prenom,p.nom].join(' '),[p.nom,p.prenom].join(' ')].some(s=>normTxt(s)===k))||null;}
function contactRes(X,h,ck,F,V){let who=null,named=false;
  for(const r of h.refs){if(r.t==='v'){if(PERS.includes(r.name)){who={role:r.name,fk:'{{'+r.name+'}}'};break;}continue;}
    if(contactKind(r.nl)||annexKind(r.nl))continue;const av=autoHoleVar(r.lab);if(av&&PERS.includes(av)){who={role:av,fk:r.key};break;}if(/^nom\b/.test(r.nl)){named=true;break;}}
  if(!who)return h.tr>=0||named?{st:'h',hint:named?'contact de la personne nommée à côté : à saisir':'personne de cette ligne inconnue : contact à saisir'}:null; /* rien autour : règle générale (chargé d'affaires) */
  const lab=ROLE_LAB[who.role]||who.role;const fv=F[who.fk];
  if(B.filled(fv)){const p=dirFind(X,fv);if(!p)return {st:'h',hint:'« '+String(fv)+' » n’est pas dans l’annuaire : contact à saisir'};const v=ctOf(p,ck);return v?{st:'a',v,src:(persName(p)||p.name)+' · annuaire'}:{st:'h',hint:(persName(p)||p.name)+' : téléphone et e-mail absents de l’annuaire'};}
  const v=B.fmtVar(V[who.role+CKV[ck]]);if(v)return {st:'a',v,src:lab+' · annuaire'};
  return {st:'h',hint:B.fmtVar(V[who.role])?lab+' : téléphone et e-mail absents de l’annuaire':lab+' à choisir (👥 Interlocuteurs)'};}

/* ═════════ annexes : puces cochées de la section « Annexes » numérotées ; trou « n° d'annexe » = puce dont le texte correspond ═════════ */
const ANN=s=>/^annexes?$/.test(normTxt(s));
const liTxt=li=>ent(li.replace(/\[\[[^\]]*\]\]|\{\{[^}]*\}\}/g,' ').replace(/<[^>]+>/g,' ')).replace(/^\s*annexe\s*(n°\s*)?\d+\s*[-–—:.]\s*/i,'').replace(/\s+/g,' ').replace(/\s*:\s*$/,'').trim();
function annexes(X){if(X.c.ann)return X.c.ann;const out={list:[],by:{}};X.c.ann=out;const L=X.L;if(!L||!B)return out;const lib=B.libOf(X.a);const ix=B.libIx(L);let n=0;
  ix.secs.forEach(s=>{const sa=ANN(s.name);s.blocs.forEach(b=>{if(!sa&&!ANN(b.titre))return;(b.paragraphes||[]).forEach(p=>{if(B.kindOf(p)!=='html')return;const src=B.prepRich(B.memSanitize(B.srcOf(L,lib,p.id)));if(!/^<ul>[\s\S]*<\/ul>$/.test(src))return;
    const on=B.isSel(lib,p,X.K);out.by[p.id]=(src.match(/<li>[\s\S]*?<\/li>/g)||[]).map((li,j)=>{const t=liTxt(li);const x={pid:p.id,j,t,w:words(t),on,num:on?++n:0};out.list.push(x);return x.num;});});});});
  return out;}
/* mots significatifs : sans accents, pluriel simple, mots vides et « annexe / scr / mémoire / présent » ignorés ; sigles de 2 lettres gardés (CV, PV) */
const STOP=new Set(('les des une dans pour par sur avec sans aux est sont ete etre sera seront cette ces son ses notre nos votre vos leur leurs qui que dont ainsi plus moins tres voir savoir trouver joint jointe jointes joints '
  +'figure figurent present presente presents presentes memoire annexe scr etc tout tous toute toutes chaque selon entre nous vous elle elles ils lui sous ci cf').split(' '));
function words(t){const out=new Set();String(t||'').replace(/[’‘`]/g,"'").split(/[^A-Za-z0-9À-ÖØ-öø-ÿŒœÆæ]+/).forEach(w0=>{if(!w0)return;const up=/^[A-Z0-9]{2,}$/.test(w0)&&/[A-Z]/.test(w0);let w=normTxt(w0).replace(/[^a-z0-9]/g,'');
  if(!w||/^\d+$/.test(w)||STOP.has(w))return;if(w.length<3&&!up)return;if(w.length>3&&/[sx]$/.test(w))w=w.slice(0,-1);if(STOP.has(w))return;out.add(w);});return out;}
/* meilleure puce : ≥ 2 mots communs, ou 1 mot de ≥ 7 lettres — et seule à ce score */
function best(W,list){let b=null,b2=null;list.forEach(x=>{let c=0,lg=0;W.forEach(w=>{if(x.w.has(w)){c++;if(w.length>lg)lg=w.length;}});if(!c)return;const s={x,c,lg};if(!b||c>b.c||(c===b.c&&lg>b.lg)){b2=b;b=s;}else if(!b2||c>b2.c||(c===b2.c&&lg>b2.lg))b2=s;});
  if(!b)return null;const tie=!!b2&&b2.c===b.c;return {x:b.x,c:b.c,ok:!tie&&(b.c>=2||b.lg>=7),tie:tie?b2.x:null};}
/* texte entre « … » d'abord (celui qui suit le trou, sinon le dernier avant), puis la phrase du trou, puis tout le paragraphe et ses titres (un seul trou d'annexe) */
function annexMatch(X,A,PI,pid,h){const bt=h.btx;const at=bt.indexOf('\u0001');const qs=[];bt.replace(/«\s*([^«»]{2,200}?)\s*»|“([^”]{2,200})”|"([^"]{2,200})"/g,(m,q1,q2,q3,off)=>{qs.push({t:q1||q2||q3,off});return m;});
  const tries=[];const q=qs.find(x=>x.off>at)||qs.filter(x=>x.off<at).pop();if(q)tries.push(q.t);tries.push(bt.split(/(?<=[.!?;])\s+/).find(s=>s.includes('\u0001'))||bt);
  if(PI.h.filter(x=>annexKind(x.nl)).length===1){const x=B.libIx(X.L).P[pid];tries.push(PI.txt+' '+(x?(x.p.titre||'')+' '+(x.b.titre||''):''));}
  let first=null;for(const t of tries){const W=words(String(t).replace(/[\u0001\u0002]/g,' '));if(!W.size)continue;const r=best(W,A.list);if(r&&r.ok)return r;if(r&&!first)first=r;}return first;}
function annexRes(X,PI,pid,h){const A=annexes(X);const bp=String(pid).replace(/#leg$/,'');if(!A.list.length)return {st:'h',hint:'pas de liste d’annexes (puces) dans la section « Annexes »'};if(A.by[bp])return {st:'h',hint:''};
  const ck='an|'+pid+'|'+h.i;let r=X.c[ck];if(r===undefined){r=annexMatch(X,A,PI,bp,h);X.c[ck]=r;}
  if(r&&r.ok&&r.x.on){const n=String(r.x.num);const b=normTxt(h.b4.replace(/[\u0001\u0002]/g,' ')).trim();return {st:'a',v:/\bannexes?( n°)?$/.test(b)?n:'annexe '+n,src:'annexe « '+cut(r.x.t,60)+' »'};}
  if(r&&r.ok)return {st:'h',hint:'coche « '+cut(r.x.t,60)+' » dans Annexes'};
  if(r&&r.tie)return {st:'h',hint:'plusieurs annexes possibles (« '+cut(r.x.t,40)+' », « '+cut(r.tie.t,40)+' ») : saisis le n°'};
  return {st:'h',hint:'aucune annexe ne correspond : ajoute-la dans Annexes, ou saisis le n°'};}
/* test et rapport (sans navigateur) : la correspondance d'un texte avec une liste de puces */
export function m2AnnexMatchText(text,bullets){const list=(bullets||[]).map((t,j)=>({t,j,w:words(t),on:true,num:j+1}));const r=best(words(text),list);return r?{t:r.x.t,ok:r.ok,c:r.c,tie:r.tie?r.tie.t:''}:null;}

/* ═════════ rendu (fillPara de memoire2.js) ═════════ */
/* valeur d'office, retenue ou facultatif (mode 'doc' : texte échappé, ou marqueur du facultatif) */
export function m2Show(r,lab,pid,i,doc,ro){if(r.st==='o')return doc?M:ro?`<span class="memoire-o">${lab} <small>(facultatif)</small></span>`:`<button type="button" class="memoire-o" data-act="af" data-v="mlbh|${esc(pid)}|${i}" title="Facultatif : vide, il n’apparaît pas dans le document — touche pour saisir">${lab} <small>(facultatif)</small></button>`;
  if(doc)return esc(r.v);const act=ro?'':` data-act="af" data-v="mlbh|${esc(pid)}|${i}" role="button" tabindex="0"`;
  if(r.st==='r')return `<span class="memoire-v memoire-ret"${act} title="${esc(ent(lab))} · valeur retenue pour tous les mémoires${ro?'':' — touche pour changer ici'}">${esc(r.v)}</span>`;
  return `<span class="memoire-v memoire-auto"${act} title="${esc(ent(lab))} · rempli d’office (${esc(r.src||'')})${ro?'':' — touche pour changer'}">${esc(r.v)}</span>`;}
/* après le remplacement des trous : « Annexe n – » devant les puces cochées de la liste des annexes ; export : nettoyage des facultatifs vides */
export function m2Post(out,pid,X,doc){if(X&&B){const nums=annexes(X).by[pid];if(nums&&nums.some(Boolean)){let j=-1;out=out.replace(/<li>/g,()=>{j++;const n=nums[j];return n?`<li>Annexe ${n} – `:'<li>';}).replace(/(<li>Annexe \d+ – )\s*annexe\s*(n°\s*)?\d+\s*[-–—:.]\s*/gi,'$1');}}
  return doc&&out.indexOf(M)>=0?optClean(out):out;}
const RM=s=>new RegExp(s.replace(/E/g,M),'g');
const R_PAR=RM('\\s*\\(\\s*E\\s*\\)'),R_D1=RM('\\s*[–—]\\s*E'),R_D2=RM('\\s+-\\s*E'),R_D3=RM('E\\s*[–—]\\s*'),R_COL=RM('\\s*:\\s*E(?=\\s*(?:[,;.]|<|$))'),R_SEN=RM('([.!?])\\s*E\\s*\\.'),R_IN=RM('<(b|strong|i|em|u|sup|sub)>(\\s*E\\s*)</\\1>');
const R_LAB=new RegExp('^\\s*[^:'+M+']{1,60}:\\s*'+M+'\\s*\\.?\\s*$');
function optLine(l,tag){let s=l.replace(R_PAR,'').replace(R_D1,'').replace(R_D2,'').replace(R_D3,'');
  if((tag==='p'||tag==='h4')&&R_LAB.test(ent(s.replace(/<[^>]+>/g,''))))return null; /* « Libellé : » seul sur sa ligne : la ligne part */
  s=s.replace(R_COL,'').replace(R_SEN,'$1').split(M).join('');
  return s.replace(/ {2,}/g,' ').replace(/\s+([,.)])/g,'$1').replace(/\(\s*\)/g,'').replace(/,\s*,/g,',').replace(/,\s*\./g,'.').trim();}
function optClean(h){h=h.replace(R_IN,'$2').replace(R_IN,'$2').replace(/<(p|li|td|th|h4)((?:\s[^>]*)?)>([\s\S]*?)<\/\1>/g,(m,tag,at,inner)=>{if(inner.indexOf(M)<0)return m;const ls=inner.split('<br>').map(l=>l.indexOf(M)<0?l:optLine(l,tag)).filter(l=>l!==null);
    return `<${tag}${at}>${ls.join('<br>').replace(/^(\s*<br>)+|(<br>\s*)+$/g,'')}</${tag}>`;});
  return h.split(M).join('').replace(/<(p|li|h4)>\s*<\/\1>/g,'').replace(/<(ul|ol)>\s*<\/\1>/g,'');}
/* infos de l'organigramme : un rôle à choisir = une info (même s'il apparaît dans deux pôles) */
export const m2EqLabs=em=>[...new Set(((em&&em.poles)||[]).flatMap(po=>po.rows.filter(r=>r.missing).map(r=>'E:'+r.k)))];

/* ═════════ compteurs : vignette « trous » et barre des trous (« n infos à compléter (m trous) », 📝 Tout compléter) ═════════ */
export function m2Tile(st){css();const h=st.holes,n=st.infos||h;return h?`<b>${n}</b><small>info${n>1?'s':''} à compléter (${pl(h,'trou')})</small>`:'<b>0</b><small>aucun trou : prêt</small>';}
export function m2Nav(holes,st){css();const c=B&&B.cur&&B.cur();const ro=!c||c.ro;const n=(st&&st.infos)||holes;
  return `<div class="mem3-nav${holes?'':' ok'}" id="memoire-nav">${holes?`<span class="mem3-nt">⚠ <b id="memoire-navn">${n}</b> info${n>1?'s':''}<span class="mem3-ntx"> à compléter</span> <span class="m2-nt">(${pl(holes,'trou')})</span></span>${ro?'':`<button class="btn sm m2-allb" data-act="af" data-v="mlbtc|" title="Tous les trous rouges, regroupés par information : une valeur remplit tous les trous identiques">📝<span class="m2-allt"> Tout compléter</span> (${n})</button>`}<span class="mem3-grow"></span><button class="btn sm" data-act="af" data-v="mlbprev|" title="Trou précédent" aria-label="Trou précédent">◀</button><span class="mem3-pos" id="memoire-navpos">– / ${holes}</span><button class="btn sm" data-act="af" data-v="mlbnext|" title="Aller au prochain trou rouge" aria-label="Trou suivant"><span class="mem3-sv">Suivant </span>▶</button>`:'<span class="mem3-nt">✓ <b>Aucun trou</b> : prêt à exporter</span>'}</div>`;}

/* ═════════ écriture des valeurs retenues (contrat K2 : relire les réglages et les recopier — QHSE, administratif…) ═════════ */
function retWrite(pairs){try{const L=B.memLib();if(!L)return false;const R=L.reglages||{};const T=Object.assign({},R.trous||{});const at=new Date().toISOString();const by=B.who();
    pairs.forEach(([k,v])=>{if(v===null)delete T[k];else T[k]={v:String(v),at,by};});B.regSet('doc','memlib',{reglages:Object.assign({},R,{trous:T})});return true;}
  catch(e){console.warn(e);B.say('Réglage de l’entreprise refusé ('+((e&&e.message)||e)+') : la valeur reste dans ce mémoire');return false;}}
const chipsHTML=(lab,id)=>{const c=exChips(ent(lab));return c.length?`<div class="m2-chips" role="group" aria-label="Suggestions">${c.map(x=>`<button type="button" class="m2-chip" data-m2chip="${esc(id)}" data-m2v="${esc(x)}">${esc(x)}</button>`).join('')}</div>`:'';};
const wireChips=()=>{document.querySelectorAll('#modal [data-m2chip]').forEach(b=>{b.onclick=()=>{const i=document.getElementById(b.dataset.m2chip);if(i){i.value=b.dataset.m2v;try{i.focus();}catch(e){}}};});};
const retLab='<span>Retenir pour les prochains mémoires <small>(réglage de l’entreprise)</small></span>';

/* ═════════ fenêtre d'un trou : valeur, puces « ex. », « même valeur » (cochée d'office), « Retenir », « Ne plus retenir » ═════════ */
export function m2HoleModal(a,L,pid,i,ctx){const A=B.api();const lib=B.libOf(a);const F=lib.fill||{};const src=B.prepRich(B.memSanitize(B.srcOf(L,lib,pid)));const it=B.scan(src,pid).filter(x=>x.t==='h')[i];if(!it)return;css();
  const K=B.memK(a,B.baseOf(a),ctx);const X=m2X(K.V);const PI=m2Para(src,pid);const h=PI.h[i];const x=B.libIx(L).P[pid];const F2=Object.assign({},F);delete F2[it.key];
  const r=m2Res(X,PI,pid,i,it.lab,h?h.n:0,F2,K.V);const cur=B.filled(F[it.key])?String(F[it.key]):'';const auto=r.st==='a'?r.v:'',ret=r.st==='r'?r.v:'',opt=r.st==='o';
  const rk=!auto&&h?retKey(X,h):null;const retOn=!!rk&&(!!ret||rk.ent);
  const res=(p2,h2)=>{const s2=B.prepRich(B.memSanitize(B.srcOf(L,lib,p2)));const P2=m2Para(s2,p2);const hh=P2.h[h2.i];return hh?{hh,r:m2Res(X,P2,p2,h2.i,h2.lab,hh.n,F,K.V)}:null;};
  const same=[],held=[];if(h&&!indiv(h))B.libIx(L).list.forEach(b=>(b.paragraphes||[]).forEach(p=>{if(B.kindOf(p)==='equipe')return;B.scan(B.prepRich(B.memSanitize(B.srcOf(L,lib,p.id))),p.id).forEach(y=>{if(y.t!=='h'||y.lab!==it.lab||y.key===it.key||B.filled(F[y.key]))return;const z=res(p.id,y);if(!z||indiv(z.hh))return;
    if(z.r.st==='h'||z.r.st==='o')same.push(y.key);else if(z.r.st==='r'&&rk&&z.r.rk&&z.r.rk.k===rk.k)held.push(y.key);});}));
  A.openModal(`<h3 style="margin-top:0">${opt?'Facultatif':'À compléter'}</h3><div class="hint" style="margin:0 0 6px">${x?esc(x.b.titre)+' · ':''}<b style="color:${opt?'#6b6b66':'#d50000'}">${it.lab}</b>${auto&&!cur?`<br>Rempli d’office : <b>${esc(auto)}</b> (${esc(r.src||'')}) — saisis autre chose pour ce mémoire, ou garde-le.`:''}${ret&&!cur?`<br>Valeur retenue pour tous les mémoires : <b>${esc(ret)}</b>${r.by?' ('+esc(r.by)+')':''} — change-la pour tous, ou décoche « Retenir » pour ce mémoire seulement.`:''}${opt&&!cur?'<br>Facultatif : laissé vide, il n’apparaît pas dans le document.':''}${r.hint?`<br><span class="m2-hint">💡 ${esc(r.hint)}</span>`:''}</div>
    <input class="f" id="memoire-hv" value="${esc(cur||auto||ret)}" placeholder="${esc(ent(it.lab))}" autocomplete="off">${chipsHTML(it.lab,'memoire-hv')}${same.length?`<label class="memoire-same"><input type="checkbox" id="memoire-hall" checked> Même valeur pour ${same.length===1?'l’autre trou':'les '+same.length+' autres trous'} « ${it.lab} » encore vide${same.length>1?'s':''}</label>`:''}${rk?`<label class="memoire-same m2-retl"><input type="checkbox" id="m2-hret"${retOn?' checked':''}> ${retLab}</label>`:''}
    <div class="actions" style="margin-top:8px"><button class="btn primary block" id="memoire-hok">Enregistrer</button>${cur?`<button class="btn block" id="memoire-hclr">${auto?'Revenir à la valeur d’office':ret?'Revenir à la valeur retenue':opt?'Vider (facultatif : n’apparaît plus)':'Vider (redevient rouge)'}</button>`:''}${ret?'<button class="btn block" id="m2-hunret">Ne plus retenir (garder pour ce mémoire seulement)</button>':''}<button class="btn block" data-close>Annuler</button></div>`);
  wireChips();const g=id=>document.getElementById(id);const inp=g('memoire-hv');const done=t=>{A.closeModal();if(ctx.render)ctx.render();if(t)B.say(t);};
  const save=()=>{const v=String(inp.value||'').trim();const all=!!(g('memoire-hall')||{}).checked;const wr=!!(g('m2-hret')||{}).checked;
    if(!v){if(!cur){A.closeModal();return;}B.libSet(a,l=>{delete l.fill[it.key];});done(auto?'Valeur d’office reprise':ret?'Valeur retenue reprise':opt?'Facultatif vidé : il n’apparaît plus':'Trou vidé : il redevient rouge');return;}
    if(rk&&wr&&(v!==ret||cur)){const ok=retWrite([[rk.k,v]]);B.libSet(a,l=>{if(ok){delete l.fill[it.key];}else{l.fill[it.key]=v;if(all)same.forEach(k=>{l.fill[k]=v;});}});done(ok?'📌 Retenu pour tous les mémoires (réglage de l’entreprise)':'');return;}
    if(v===auto&&!cur||v===ret&&!cur&&wr){A.closeModal();return;}
    B.libSet(a,l=>{l.fill[it.key]=v;if(all)same.forEach(k=>{l.fill[k]=v;});});done(all&&same.length?'Rempli ici et sur '+pl(same.length,'autre trou','autres trous'):'Trou rempli'+(ret?' (pour ce mémoire seulement)':''));};
  g('memoire-hok').onclick=save;inp.onkeydown=e=>{if(e.key==='Enter'){e.preventDefault();save();}};
  if(g('memoire-hclr'))g('memoire-hclr').onclick=()=>{B.libSet(a,l=>{delete l.fill[it.key];});done(auto?'Valeur d’office reprise':ret?'Valeur retenue reprise':opt?'Facultatif vidé : il n’apparaît plus':'Trou vidé : il redevient rouge');};
  if(g('m2-hunret'))g('m2-hunret').onclick=()=>{const v=String(inp.value||'').trim()||ret;const ok=retWrite([[rk.k,null]]);if(!ok)return;B.libSet(a,l=>{l.fill[it.key]=v;held.forEach(k=>{l.fill[k]=ret;});});done('Plus retenue pour les prochains mémoires (gardée dans celui-ci)');};
  setTimeout(()=>{try{inp.focus();inp.select();}catch(e){}},50);}

/* ═════════ « 📝 Tout compléter » : les trous rouges des paragraphes cochés, regroupés par information ═════════ */
function groups(a,L,ctx){const K=B.memK(a,B.baseOf(a),ctx);const X=m2X(K.V);const st=B.rowsOf(a,L,K);const lib=B.libOf(a);const F=lib.fill||{};const red=new Map(),opt=new Map(),eq=new Set();
  const add=(Mp,g,o)=>{let e=Mp.get(g);if(!e){e=Object.assign({g,keys:[],n:0,blocs:[]},o);Mp.set(g,e);}return e;};
  B.libIx(L).list.forEach(b=>(b.paragraphes||[]).forEach(p=>{const R=st.R[p.id];if(!R||!R.on)return;
    if(R.kind==='equipe'){equipeModel(p,K.I).poles.forEach(po=>po.rows.forEach(r=>{if(r.missing)eq.add(r.k);}));return;}
    const PI=m2Para(R.src,p.id);
    PI.h.forEach(h=>{const r=m2Res(X,PI,p.id,h.i,h.lab,h.n,F,K.V);if(r.st!=='h'&&r.st!=='o')return;const e=add(r.st==='h'?red:opt,r.g,{lab:h.lab,rk:r.rk||null,hint:r.hint||'',where:/^K:/.test(r.g)?(h.tr>=0&&h.row0?'ligne « '+cut(h.row0,40)+' »':h.b4.trim()?'« '+tail(h.b4.replace(/\u0002/g,'…'),48)+' »':''):''});
      e.keys.push(h.key);e.n++;if(!e.blocs.includes(b.titre))e.blocs.push(b.titre);});
    PI.v.forEach(v=>{const k='{{'+v.name+'}}';if(B.filled(F[k]))return;const raw=K.V[v.name];if(raw&&typeof raw==='object')return;if(B.fmtVar(raw))return;const e=add(red,'V:'+v.name,{lab:esc(B.VAR_LAB[v.name]||v.name),v:v.name,where:''});if(!e.keys.length)e.keys.push(k);e.n++;if(!e.blocs.includes(b.titre))e.blocs.push(b.titre);});}));
  return {st,red:[...red.values()],opt:[...opt.values()],eq:[...eq]};}
export function m2AllModal(a,L,ctx){const A=B.api();css();const G=groups(a,L,ctx);const rows=G.red.concat(G.opt);const ni=G.st.infos||0,nh=G.st.holes||0;
  if(!rows.length&&!G.eq.length){B.say('Aucun trou à compléter');return;}
  const row=(e,k)=>{const id='m2-in-'+k;const ch=exChips(ent(e.lab));return `<div class="m2-row"><label class="m2-lab" for="${id}"><b>${e.lab}</b>${e.n>1?` <span class="m2-n">· ${pl(e.n,'trou')}</span>`:''}<small>${esc(e.where?e.where+' · ':'')}${esc(e.blocs.slice(0,3).join(', ')+(e.blocs.length>3?'…':''))}</small>${e.hint?`<small class="m2-hint">💡 ${esc(e.hint)}</small>`:''}</label>`
    +`<div class="m2-fld"><input class="f m2-in" id="${id}" data-m2k="${k}" placeholder="${esc(ch.length?'ex. '+ch.join(', '):'')}" autocomplete="off">${chipsHTML(e.lab,id)}${e.rk?`<label class="m2-ret"><input type="checkbox" id="m2-ret-${k}"${e.rk.ent?' checked':''}> ${retLab}</label>`:''}</div></div>`;};
  const red=G.red.map((e,k)=>row(e,k)).join(''),opt=G.opt.map((e,k)=>row(e,G.red.length+k)).join('');
  const eqRow=G.eq.length?`<div class="m2-row m2-eqr"><div class="m2-lab"><b>Organigramme : ${esc(G.eq.map(k=>ROLE_LAB[k]||k).join(', '))} à choisir</b><small>dans l’annuaire (pas de saisie libre)</small></div><div class="m2-fld"><button type="button" class="btn block" id="m2-inter">👥 Choisir les interlocuteurs</button></div></div>`:'';
  A.openModal(`<h3 style="margin-top:0">📝 Tout compléter</h3><div class="hint" style="margin:0 0 4px">${pl(ni,'info')} à compléter (${pl(nh,'trou')}) dans les paragraphes cochés : une valeur remplit tous les trous de la même information. Laisse vide ce que tu ne sais pas encore.</div>
    <div class="m2-all" id="m2-all">${red}${eqRow}${G.opt.length?`<details class="m2-optg"><summary>Facultatifs (${G.opt.length}) — laissés vides, ils n’apparaissent pas dans le document</summary>${opt}</details>`:''}</div>
    <div class="actions" style="margin-top:8px"><button class="btn primary block" id="m2-allok">Enregistrer</button><button class="btn block" data-close>Annuler</button></div>`);
  wireChips();const g=id=>document.getElementById(id);if(g('m2-inter'))g('m2-inter').onclick=()=>{A.closeModal();B.interModal(a,L,ctx);};
  g('m2-allok').onclick=()=>{const fills={},rets=[];let ni=0,nt=0;rows.forEach((e,k)=>{const v=String((g('m2-in-'+k)||{}).value||'').trim();if(!v)return;ni++;nt+=e.n;if(e.rk&&(g('m2-ret-'+k)||{}).checked)rets.push([e.rk.k,v,e]);else e.keys.forEach(key=>{fills[key]=v;});});
    if(!ni){B.say('Rien de saisi');return;}const ok=rets.length?retWrite(rets.map(x=>[x[0],x[1]])):true;if(!ok)rets.forEach(([k,v,e])=>e.keys.forEach(key=>{fills[key]=v;}));
    B.libSet(a,l=>{Object.assign(l.fill,fills);if(ok)rets.forEach(([k,v,e])=>e.keys.forEach(key=>{delete l.fill[key];}));});A.closeModal();if(ctx.render)ctx.render();
    B.say(`✓ ${pl(ni,'info complétée','infos complétées')} (${pl(nt,'trou')})${ok&&rets.length?' · '+pl(rets.length,'valeur retenue','valeurs retenues')+' pour tous les mémoires':''}`);};}

/* ═════════ CSS du lot (injectée une fois) ═════════ */
const CSS2=`.memoire-page .memoire-o{display:inline;font:inherit;font-style:italic;color:#86827a;background:transparent;border:0;border-bottom:1.5px dotted #a9a499;border-radius:3px;padding:0 3px;margin:0;cursor:pointer;line-height:inherit;text-align:left;min-height:0;box-shadow:none}
.memoire-page .memoire-o small{font-size:.82em}.memoire-page span.memoire-o{cursor:default}.memoire-page .memoire-o:focus{outline:2px solid #1f6fd0}
.memoire-ret{background:#eaf2fd;border-radius:3px;cursor:pointer;border-bottom:1px dotted #5f8fd0}
.mem3-nav .m2-nt{font-weight:400;color:#7a5b4f;font-size:12.5px}.mem3-nav .m2-allb{white-space:nowrap;min-height:36px}.mem3-nav .btn{min-width:36px}
.m2-chips{display:flex;flex-wrap:wrap;gap:6px;margin:6px 0 0}.m2-chip{min-height:34px;padding:2px 12px;border:1px dashed #a9bcd8;border-radius:999px;background:#f4f8fd;color:#1c3d6b;font:inherit;font-size:13px;cursor:pointer;max-width:100%;overflow-wrap:anywhere;text-align:left}.m2-chip:hover{border-style:solid}
.m2-hint{color:#8a5a00}.m2-retl{margin-top:2px}
.modal .box:has(.m2-all){max-width:780px}.m2-all{max-height:58vh;overflow:auto;margin:6px 0 0;padding-right:2px}
.m2-row{display:grid;grid-template-columns:minmax(0,1fr) minmax(0,1.25fr);gap:4px 12px;align-items:start;padding:8px 0;border-top:1px solid var(--line)}
.m2-lab{font-size:13px;display:flex;flex-direction:column;gap:2px;min-width:0;overflow-wrap:anywhere}.m2-lab small{color:var(--ink2);font-size:11.5px}.m2-lab .m2-n{color:#b42318;font-weight:600;font-size:12px}
.m2-fld{min-width:0}.m2-fld .f{width:100%;box-sizing:border-box;margin:0;min-height:40px}
.m2-ret{display:flex;gap:8px;align-items:center;font-size:12.5px;min-height:38px;margin-top:4px;cursor:pointer}.m2-ret input{width:20px;height:20px;flex:none;margin:0}
.m2-optg{margin:10px 0 0;border-top:1px solid var(--line)}.m2-optg summary{cursor:pointer;font-weight:700;font-size:13px;min-height:42px;display:flex;align-items:center}
@media(max-width:600px){.m2-row{grid-template-columns:minmax(0,1fr)}.mem3-nav .m2-allt{display:none}.mem3-nav .m2-nt{display:none}.m2-all{max-height:46vh}}`;
function css(){if(typeof document==='undefined'||document.getElementById('css-lot-m2'))return;const st=document.createElement('style');st.id='css-lot-m2';st.textContent=CSS2;document.head.appendChild(st);}
