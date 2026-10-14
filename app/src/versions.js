// versions.js — VERSIONS DE CHIFFRAGE (14/10 après-midi (lot D)). Ethan : « il faut pouvoir revenir sur une ancienne version juste pour consulter, sans la modifier,
// sans que ça écrase tout et recrée une version […] ça va aussi changer les quantités potentiellement et les tracés, donc à garder en consultation et pour info […] ou ça
// doit te dire “attention nouvelle version mais pas de modification de quantité et de tracé” […] entre versions, ajouter des documents complémentaires — compte rendu
// après alignement technique, mail… — qui servent d'écrit officiel, sur lesquels on veut faire des notes, et qui modifient une version […] la v2 est un copier-coller de
// tout qu'on modifie point par point. Enlève les limites de version d'ailleurs, on s'en fiche. »
// MODÈLE (sur l'affaire, registre « affaire ») — 14/10 après-midi (lot D) :
//  · a.chiffrageV = n° de la version EN COURS (la seule modifiable) ; a.chiffrageNote = son motif ; a.chiffrageVAt / a.chiffrageVBy = son début ; a.chiffrageFrom = n° de la
//    version dont elle repart (« ⇢ Repartir de cette version », action vrestore).
//  · a.chiffrages[] = versions FIGÉES, sans limite de nombre. Ancien format {v, at, by, note, chiffrage, total} toujours lu (consultation : chiffrage seul) ; nouveau format
//    = INSTANTANÉ complet : + snap:{quantites, qsets, points, dpgf, memoire, offre, sites, traces:{<id du tracé>:{name, rows:[{dn, soud, mlTr, mlTube, barres…}], tot}}}
//    + sum:{total, achat, ml, nb, postes:{k:{l, v}}, dpgf:{tot, n}, base} + startAt. Un champ de snap identique à celui de la version précédente est stocké {$v:n}
//    (renvoi vers la version qui le porte : pas de copie inutile ; « ✕ » d'une version recopie d'abord ce qu'on lui emprunte).
//  · écrits officiels entre versions (mail .eml / .msg / .pdf, compte rendu, texte collé) = pièces du dossier (a.dce, catégorie « Courrier · mail · alignement »,
//    lisibles et annotables dans 2 · Lecture) avec ver:{v (reçu après / pendant la version v), kind, notes:[{t, at, by}], applied (n° de la version où c'est appliqué)}.
//  · CONSULTATION (affState().vview = n° de version) : les onglets Quantités, Chiffrage, Mémoire, DPGF, Offre se dessinent avec les renderers existants sur une affaire
//    VIRTUELLE (Object.assign({}, a, instantané), canEdit = false) ; affaires.js bloque toute écriture sur l'affaire pendant ce temps (affWithVirtual).
//  · ÉVÈNEMENT pour le DPGF (autre lot : PU liés à reprendre quand les prix changent d'une version à l'autre) : window « trace:chiffrageV »
//    {detail:{num, v (nouvelle version en cours), prev (version figée), action:'nouvelle'|'reprise', from (version reprise)}} + onChiffrageVersion(cb) ci-dessous.
//    a.chiffrageV est toujours le n° de la version modifiable ; la version figée v a ses PU DPGF dans snap.dpgf.
import {affGet,affSet,affState,calcAffaire} from './affaires.js';
import {lotDCss} from './docsoblig.js';
import {prixBase,baseOfAff} from './chiffrage.js';
let A=null;export function initVersions(api){A=api;}
const esc=s=>String(s??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const nb=(x,d)=>{x=+x||0;return x.toLocaleString('fr-FR',{maximumFractionDigits:d===undefined?0:d,minimumFractionDigits:d===undefined?0:d});};
const eur=x=>nb(Math.round(+x||0))+' €';const sg=x=>(x>0?'+':x<0?'−':'')+nb(Math.abs(x));const sgE=x=>(x>0?'+':x<0?'−':'')+eur(Math.abs(x));
const dFR=x=>x?new Date(String(x).length===10?x+'T00:00:00':x).toLocaleDateString('fr-FR'):'';const todayIso=()=>{const d=new Date();return d.getFullYear()+'-'+String(d.getMonth()+1).padStart(2,'0')+'-'+String(d.getDate()).padStart(2,'0');};
const clone=x=>x===undefined?undefined:JSON.parse(JSON.stringify(x));const J=x=>JSON.stringify(x===undefined?null:x);
const say=t=>{if(A&&A.toast)A.toast(t);};const who=()=>A&&A.userName?A.userName():'';
export const VFIELDS=['quantites','qsets','points','dpgf','memoire','offre']; /* + sites, traces */
export const VTABS=['quantites','chiffrage','memoire','dpgf','offre']; /* onglets versionnés (consultation en lecture seule) */
const WON=['a_debuter','en_cours','termine'];
/* ── écouteurs : le DPGF (autre lot) ou tout autre module peut suivre les changements de version ── */
const LISTEN=new Set();export function onChiffrageVersion(cb){LISTEN.add(cb);return ()=>LISTEN.delete(cb);}
function emitV(d){try{window.dispatchEvent(new CustomEvent('trace:chiffrageV',{detail:d}));}catch(e){}LISTEN.forEach(cb=>{try{cb(d);}catch(e){console.warn(e);}});}
/* ═════════ 1 · INSTANTANÉS ═════════ */
export const versionsOf=a=>((a&&a.chiffrages)||[]).filter(Boolean).slice().sort((x,y)=>(+x.v||0)-(+y.v||0));
export const entryOf=(a,v)=>versionsOf(a).find(x=>+x.v===+v)||null;
const prevEntry=(a,v)=>{const L=versionsOf(a).filter(x=>+x.v<+v);return L.length?L[L.length-1]:null;};
const isRef=x=>!!(x&&typeof x==='object'&&!Array.isArray(x)&&Object.keys(x).length===1&&x.$v!==undefined);
function resolveField(a,x,f){let o=x&&x.snap?x.snap[f]:undefined;let g=0;while(isRef(o)&&g++<60){const y=entryOf(a,o.$v);o=y&&y.snap?y.snap[f]:undefined;}return o;}
/* instantané résolu d'une version figée : {chiffrage, quantites…, sites, traces, sum, old} (old = ancien format : chiffrage seul) */
export function snapOfEntry(a,x){if(!x)return null;const S={chiffrage:x.chiffrage||{},sum:x.sum||{total:+x.total||0},old:!x.snap,v:+x.v,note:x.note||'',at:x.at,by:x.by,startAt:x.startAt||null};
  if(x.snap){VFIELDS.concat(['sites','traces']).forEach(f=>{S[f]=resolveField(a,x,f);});}return S;}
/* quantités des tracés liés (soudures, ml par DN) : comme l'onglet Quantités (traceQty), sinon la copie de l'appareil (traceAgg) ; mémorisées 2 s (rendus successifs) */
const TQ={};
export function traceSnap(a,ctx){const out={};const sites=(ctx&&ctx.sites)||[];(a.sites||[]).forEach(id=>{const s=sites.find(x=>x.id===id)||{};const name=s.name||id;const k=id;const c=TQ[k];if(c&&Date.now()-c.t<2000){out[id]=Object.assign({},c.v,{name});return;}
  let q=null;try{q=ctx&&ctx.traceQty?ctx.traceQty(id):null;}catch(e){q=null;}let v;
  if(q&&Array.isArray(q.rows)&&q.rows.length)v={rows:q.rows.filter(r=>+r.soud||+r.mlTr)/* 14/10 soir (lot Q) : sans les lignes « purges / vidanges seules » (0 soudure, 0 ml) — instantanés comme avant */.map(r=>({dn:+r.dn,soud:+r.soud||0,mlTr:+r.mlTr||0,mlTube:r.mlTube,barres:r.barres,coudes:r.coudes,tes:r.tes,piq:r.piq,red:r.red,vannes:r.vannes,kits:r.kits})),tot:q.tot||null};
  else{let g={};try{g=ctx&&ctx.traceAgg?(ctx.traceAgg(id)||{}):{};}catch(e){g={};}const rows=Object.keys(g).map(Number).filter(Boolean).sort((x,y)=>y-x).map(dn=>({dn,soud:+g[dn].nb||0,mlTr:Math.round((+g[dn].ml||0)*10)/10}));
    v=rows.length?{rows,tot:{soud:rows.reduce((x,r)=>x+r.soud,0),mlTr:Math.round(rows.reduce((x,r)=>x+r.mlTr,0)*10)/10},part:true}:{none:true};}
  TQ[k]={t:Date.now(),v};out[id]=Object.assign({},v,{name});});return out;}
/* résumé chiffré (figé avec la version : la consultation recalcule avec la base de prix du moment, le résumé garde les montants d'alors) */
export function sumOf(a){let C=null;try{C=calcAffaire(a);}catch(e){C=null;}const s={total:0,achat:0,ml:0,nb:0,postes:{},dpgf:null};if(!C)return s;
  s.total=Math.round((+C.total||0)*100)/100;s.achat=Math.round(+C.achat||0);s.ml=Math.round(+C.ml||0);s.nb=Math.round(+C.nb||0);
  if(C.v2&&Array.isArray(C.postes))C.postes.forEach(p=>{if(!p.tete&&Math.round(+p.vente||0))s.postes[p.k]={l:p.label,v:Math.round(+p.vente||0)};});
  else (C.zones||[]).forEach((z,i)=>{s.postes['z'+i]={l:(z.nom||'Zone '+(i+1))+' (achat)',v:Math.round(+z.achat||0)};});if(!C.v2&&C.chap)s.postes.chap={l:'Chapitres (achat)',v:Math.round(C.chap)};
  const L=(((a.dpgf||{}).lignes)||[]).filter(l=>!l.section);if(L.length)s.dpgf={n:L.length,tot:Math.round(L.reduce((x,l)=>x+(+l.pu||0)*(+l.qte||0),0)*100)/100};
  try{const b=prixBase();if(b)s.base=(b.version||'')+(b.at?' du '+dFR(b.at):'');}catch(e){}return s;}
/* l'état en cours, sous la forme d'un instantané résolu (pour comparer à la version précédente) */
export function liveSnap(a,ctx){const S={chiffrage:a.chiffrage||{},sites:(a.sites||[]).slice(),traces:traceSnap(a,ctx),sum:sumOf(a),old:false,v:a.chiffrageV||1,live:true};VFIELDS.forEach(f=>{S[f]=a[f]===undefined?null:a[f];});return S;}
/* figer la version en cours : instantané complet (copie profonde ; champ identique à la version précédente → renvoi {$v}) */
function freeze(a,ctx,noteSuffix){const cur=a.chiffrageV||1;const L=liveSnap(a,ctx);const prev=versionsOf(a).filter(x=>+x.v<cur).pop()||null;const snap={};
  VFIELDS.concat(['sites','traces']).forEach(f=>{const val=L[f]===undefined?null:L[f];if(prev&&prev.snap){const pv=resolveField(a,prev,f);if(J(pv)===J(val)){const r=prev.snap[f];snap[f]=isRef(r)?{$v:r.$v}:{$v:+prev.v};return;}}snap[f]=clone(val);});
  return {v:cur,at:new Date().toISOString(),by:who(),note:(a.chiffrageNote||(cur===1?'version initiale':''))+(noteSuffix||''),startAt:a.chiffrageVAt||null,chiffrage:clone(a.chiffrage||{}),total:Math.round(L.sum.total||0),snap,sum:L.sum};}
/* ═════════ 2 · CE QUI A CHANGÉ ═════════ */
const qMap=q=>{const m={};((q&&q.rows)||[]).forEach(r=>{const dn=+r.dn;if(!dn)return;const o=m[dn]||(m[dn]={soud:0,ml:0,nAnt:0});o.soud+=+r.soud||0;o.ml+=+r.ml||0;o.nAnt+=+r.nAnt||0;});return m;};
const QHEAD=[['ml','ml de tranchée'],['ss','sous-stations'],['coudes','coudes'],['tes','tés'],['reductions','réductions'],['vannes','vannes']];
/* P = version précédente, N = la suivante (instantanés résolus) → {qty, trace, money, other, qtyChanged, traceChanged, unknown} */
export function diffSnaps(P,N){const D={qty:[],trace:[],money:[],other:[],qtyChanged:false,traceChanged:false,unknown:false,traceUnknown:[]};if(!P||!N)return D;
  if(P.old||N.old){D.unknown=true;}else{
    const qa=qMap(P.quantites),qb=qMap(N.quantites);[...new Set(Object.keys(qa).concat(Object.keys(qb)).map(Number))].sort((x,y)=>x-y).forEach(dn=>{const x=qa[dn],y=qb[dn];
      if(!x){D.qty.push(`DN ${dn} ajouté : ${nb(y.soud)} soudures · ${nb(y.ml)} ml`);return;}if(!y){D.qty.push(`DN ${dn} retiré (${nb(x.soud)} soudures · ${nb(x.ml)} ml)`);return;}
      const p=[];if(x.soud!==y.soud)p.push(`soudures ${nb(x.soud)} → ${nb(y.soud)} (${sg(y.soud-x.soud)})`);if(Math.abs(x.ml-y.ml)>=0.5)p.push(`ml ${nb(x.ml)} → ${nb(y.ml)} (${sg(Math.round(y.ml-x.ml))})`);if(x.nAnt!==y.nAnt)p.push(`dont antennes ${nb(x.nAnt)} → ${nb(y.nAnt)}`);if(p.length)D.qty.push(`DN ${dn} : ${p.join(' · ')}`);});
    const hp=P.quantites||{},hn=N.quantites||{};QHEAD.forEach(([k,l])=>{const x=+hp[k]||0,y=+hn[k]||0;if(x!==y)D.qty.push(`${l} : ${nb(x)} → ${nb(y)}`);});
    const sa=(hp.src||{}).nom||'',sb=(hn.src||{}).nom||'';if(sa!==sb)D.qty.push(`référence : ${sa||'saisie à la main'} → ${sb||'saisie à la main'}`);
    const na=(P.qsets||[]).filter(s=>s&&!s.deleted).length,nn=(N.qsets||[]).filter(s=>s&&!s.deleted).length;if(J(P.qsets)!==J(N.qsets))D.qty.push(`quantitatifs fournisseur modifiés (${na} → ${nn})`);
    D.qtyChanged=D.qty.length>0;
    const ta=P.traces||{},tb=N.traces||{};[...new Set(Object.keys(ta).concat(Object.keys(tb)))].forEach(id=>{const x=ta[id],y=tb[id];const name=(y&&y.name)||(x&&x.name)||id;
      if(!x){D.trace.push(`tracé « ${name} » lié${y&&!y.none?' : '+nb((y.tot||{}).soud)+' soudures':''}`);return;}if(!y){D.trace.push(`tracé « ${name} » retiré`);return;}
      if(x.none||y.none){if(!x.none||!y.none)D.traceUnknown.push(name);return;}
      const m=r=>{const o={};(r.rows||[]).forEach(z=>{o[z.dn]=z;});return o;};const xa=m(x),yb=m(y);const p=[];
      [...new Set(Object.keys(xa).concat(Object.keys(yb)).map(Number))].sort((u,w)=>u-w).forEach(dn=>{const u=xa[dn]||{soud:0,mlTr:0},w=yb[dn]||{soud:0,mlTr:0};const q=[];if((+u.soud||0)!==(+w.soud||0))q.push(`${sg((+w.soud||0)-(+u.soud||0))} soudure${Math.abs((+w.soud||0)-(+u.soud||0))>1?'s':''} (${nb(u.soud)} → ${nb(w.soud)})`);if(Math.abs((+u.mlTr||0)-(+w.mlTr||0))>=0.5)q.push(`${sg(Math.round((+w.mlTr||0)-(+u.mlTr||0)))} ml`);if(q.length)p.push(`DN ${dn} ${q.join(', ')}`);});
      if(p.length)D.trace.push(`tracé « ${name} » : ${p.join(' · ')}`);});
    D.traceChanged=D.trace.length>0;
    const da=P.dpgf||{},db=N.dpgf||{};if(J(da)!==J(db)){const La=(da.lignes||[]),Lb=(db.lignes||[]);let n=0;Lb.forEach((l,i)=>{const o=La[i];if(!l.section&&(!o||(+o.pu||0)!==(+l.pu||0)))n++;});const t=L=>L.filter(l=>!l.section).reduce((x,l)=>x+(+l.pu||0)*(+l.qte||0),0);
      D.other.push(La.length&&!Lb.length?'DPGF retirée':!La.length&&Lb.length?`DPGF importée (${Lb.filter(l=>!l.section).length} lignes)`:`DPGF : ${n} PU modifié${n>1?'s':''}${Math.abs(t(La)-t(Lb))>=1?' · total '+eur(t(La))+' → '+eur(t(Lb)):''}`);}
    if(J(P.memoire)!==J(N.memoire))D.other.push('mémoire technique modifié');
    if(J((P.offre||{}).oblig)!==J((N.offre||{}).oblig))D.other.push('documents obligatoires modifiés (pièces déposées, à inclure)');}
  const sa=P.sum||{},sb=N.sum||{};if(Math.abs((+sa.total||0)-(+sb.total||0))>=1)D.money.push(`prix de vente : ${eur(sa.total)} → ${eur(sb.total)} (${sgE((+sb.total||0)-(+sa.total||0))})`);
  const pa=sa.postes||{},pb=sb.postes||{};[...new Set(Object.keys(pa).concat(Object.keys(pb)))].map(k=>({k,l:(pb[k]||pa[k]).l,x:(pa[k]||{}).v||0,y:(pb[k]||{}).v||0})).filter(o=>Math.abs(o.y-o.x)>=1).sort((u,w)=>Math.abs(w.y-w.x)-Math.abs(u.y-u.x)).slice(0,8).forEach(o=>D.money.push(`${o.l} : ${eur(o.x)} → ${eur(o.y)} (${sgE(o.y-o.x)})`));
  if(D.unknown&&J(P.chiffrage)!==J(N.chiffrage)&&!D.money.length)D.other.push('chiffrage modifié');
  return D;}
/* le texte « ce qui a changé » (HTML) ; live = version en cours */
export function changesHTML(D,vA,vB,live){if(!D)return '';const none=!D.unknown&&!D.qtyChanged&&!D.traceChanged;const li=L=>L.map(t=>`<li>${esc(t)}</li>`).join('');
  const warn=none?`<div class="vv-warn">⚠ ${live?`v${vB} : nouvelle version mais aucune modification de quantités ni de tracé depuis la v${vA}`:`Aucune modification de quantités ni de tracé par rapport à la v${vA}`}${live?' — logiquement, quantités et tracé se reprennent dans une nouvelle version (sinon, ce sont ceux de la v'+vA+')':''}.</div>`:'';
  const blocks=[[D.qty,'Quantités'],[D.trace,'Tracés'],[D.money,'Prix'],[D.other,'Autres']].filter(b=>b[0].length).map(([L,t])=>`<div class="vv-cg"><b>${t}</b><ul>${li(L)}</ul></div>`).join('');
  return warn+(D.unknown?`<div class="hint">La v${vA} a été créée avant le 14/10 : seul son chiffrage a été gardé (quantités, tracés, DPGF et mémoire non comparables).</div>`:'')+(D.traceUnknown.length?`<div class="hint">Tracé non comparable (pas sur cet appareil) : ${esc(D.traceUnknown.join(', '))}.</div>`:'')+(blocks||(none?'':`<div class="hint">Pas d'autre différence.</div>`));}
export const changesShort=D=>{if(!D)return '';const n=D.qty.length+D.trace.length+D.money.length+D.other.length;if(!D.unknown&&!D.qtyChanged&&!D.traceChanged)return 'aucune modification de quantités ni de tracé'+(D.money.length||D.other.length?' · '+(D.money.concat(D.other)[0]):'');return D.qty.concat(D.trace,D.money,D.other).slice(0,2).join(' · ')+(n>2?' · +'+(n-2):'');};
/* ═════════ 3 · ÉCRITS OFFICIELS (pièces du dossier rattachées à une version) ═════════ */
export const vdocsOf=(a,v)=>((a&&a.dce)||[]).filter(d=>d&&!d.deleted&&d.ver&&(v===undefined||+d.ver.v===+v));
const KINDS={mail:'✉ Mail',cr:'📝 Compte rendu',courrier:'📨 Courrier',autre:'📎 Autre'};
function docLine(a,d,canEdit,opt){const V=d.ver||{};const cur=a.chiffrageV||1;const notes=(V.notes||[]).map((n,i)=>`<span class="vv-dnote">✎ ${esc(n.t)}${canEdit&&!opt.ro?` <button class="lnk" data-act="af" data-v="vdocnoterm|${esc(d.id)}|${i}" title="Retirer la note" style="color:#9b2c22">✕</button>`:''}</span>`).join('');
  const opts=[''].concat(versionsOf(a).map(x=>+x.v).filter(n=>n>+V.v)).concat(cur>+V.v||cur===+V.v?[cur]:[]);const uniq=[...new Set(opts)];
  const app=V.applied?`<span class="vv-app ok">✓ appliqué dans la v${V.applied}</span>`:`<span class="vv-app">à appliquer</span>`;
  return `<div class="vv-doc"><div class="vv-dh"><span class="vv-dk">${KINDS[V.kind]||KINDS.autre}</span> <b>${esc(d.name||'Écrit')}</b> <span class="dim">${d.date?dFR(d.date):dFR(d.at)}${d.from?' · de '+esc(d.from):''}</span> ${app}</div>${notes?`<div class="vv-dnotes">${notes}</div>`:''}
    <div class="vv-dacts"><button class="btn sm" data-act="af" data-v="dcopen|${esc(d.id)}" title="Ouvrir dans 2 · Lecture : surligner, annoter">📖 Lire</button>${d.url?`<a class="btn sm" href="${esc(d.url)}" target="_blank" rel="noopener" title="Fichier d'origine">⤓</a>`:''}${canEdit&&!opt.ro?`<button class="btn sm" data-act="af" data-v="vdocnote|${esc(d.id)}">✎ Note</button><select class="f vv-dsel" data-vvapp="${esc(d.id)}" title="Appliqué dans quelle version ?">${uniq.map(n=>`<option value="${n}"${(+V.applied||'')===(n===''?'':+n)?' selected':''}>${n===''?'pas encore appliqué':'appliqué dans la v'+n+(n===cur?' (en cours)':'')}</option>`).join('')}</select><button class="btn sm" data-act="af" data-v="vdocrm|${esc(d.id)}" style="color:#9b2c22" title="Retirer cet écrit (et sa pièce du dossier)">✕</button>`:''}</div></div>`;}
/* .eml → {subject, from, date, text} (en-têtes encodés, multipart, quoted-printable, base64, charset) */
const b64u8=s=>{try{const b=atob(String(s).replace(/[^A-Za-z0-9+/=]/g,''));const u=new Uint8Array(b.length);for(let i=0;i<b.length;i++)u[i]=b.charCodeAt(i);return u;}catch(e){return new Uint8Array(0);}};
const qpu8=s=>{const t=String(s).replace(/=\r?\n/g,'');const out=[];for(let i=0;i<t.length;i++){const c=t[i];if(c==='='&&/^[0-9A-Fa-f]{2}$/.test(t.substr(i+1,2))){out.push(parseInt(t.substr(i+1,2),16));i+=2;}else{const code=t.charCodeAt(i);if(code<128)out.push(code);else new TextEncoder().encode(c).forEach(b=>out.push(b));}}return new Uint8Array(out);};
const dec8=(u8,cs)=>{try{return new TextDecoder((cs||'utf-8').toLowerCase().replace(/^us-ascii$/,'utf-8')).decode(u8);}catch(e){return new TextDecoder('utf-8').decode(u8);}};
const mimeWords=s=>String(s||'').replace(/=\?([^?]+)\?([QqBb])\?([^?]*)\?=/g,(m,cs,enc,txt)=>enc.toUpperCase()==='B'?dec8(b64u8(txt),cs):dec8(qpu8(txt.replace(/_/g,' ')),cs)).replace(/\?=\s+=\?/g,'');
function emlPart(raw){const s=String(raw).replace(/\r\n/g,'\n');const i=s.indexOf('\n\n');const head=i<0?s:s.slice(0,i);const body=i<0?'':s.slice(i+2);const H={};head.replace(/\n[ \t]+/g,' ').split('\n').forEach(l=>{const m=/^([\w-]+):\s*(.*)$/.exec(l);if(m)H[m[1].toLowerCase()]=m[2];});return {H,body};}
function emlText(H,body){const ct=H['content-type']||'text/plain';const bm=/boundary="?([^";]+)"?/i.exec(ct);
  if(/^multipart\//i.test(ct)&&bm){const parts=body.split('--'+bm[1]).slice(1).filter(p=>!/^--/.test(p.trim())||p.trim().length>2);let plain='',html='';for(const p of parts){const x=emlPart(p.replace(/^\n/,''));const c=x.H['content-type']||'text/plain';if(/attachment/i.test(x.H['content-disposition']||''))continue;
      if(/^multipart\//i.test(c)){const t=emlText(x.H,x.body);if(t&&!plain)plain=t;}else if(/text\/plain/i.test(c)&&!plain)plain=emlDecode(x.H,x.body);else if(/text\/html/i.test(c)&&!html)html=emlDecode(x.H,x.body);}
    return plain||htmlText(html);}
  const t=emlDecode(H,body);return /text\/html/i.test(ct)?htmlText(t):t;}
function emlDecode(H,body){const te=(H['content-transfer-encoding']||'').toLowerCase();const cs=(/charset="?([^";\s]+)"?/i.exec(H['content-type']||'')||[])[1]||'utf-8';if(te==='base64')return dec8(b64u8(body),cs);if(te==='quoted-printable')return dec8(qpu8(body),cs);return body;}
const htmlText=h=>String(h||'').replace(/<style[\s\S]*?<\/style>/gi,'').replace(/<br\s*\/?>/gi,'\n').replace(/<\/(p|div|tr|li|h\d)>/gi,'\n').replace(/<[^>]+>/g,'').replace(/&nbsp;/g,' ').replace(/&amp;/g,'&').replace(/&lt;/g,'<').replace(/&gt;/g,'>').replace(/&#39;|&apos;/g,"'").replace(/&quot;/g,'"').replace(/\n{3,}/g,'\n\n').trim();
export function parseEml(raw){const {H,body}=emlPart(raw);const d=Date.parse(H.date||'');return {subject:mimeWords(H.subject||'').trim(),from:mimeWords(H.from||'').trim(),date:isFinite(d)?(x=>x.getFullYear()+'-'+String(x.getMonth()+1).padStart(2,'0')+'-'+String(x.getDate()).padStart(2,'0'))(new Date(d)):'',text:String(emlText(H,body)||'').replace(/\r/g,'').trim()};}
const newId=()=>'D'+Date.now().toString(36)+Math.random().toString(36).slice(2,5);
/* pièce du dossier : fichier gardé sur l'appareil (même clé que dce.js : la Lecture l'ouvre) et envoyé au stockage si connecté */
async function storeFile(num,d,file){let ok=false;try{ok=await A.kv.set('trace:affdoc:'+d.id,file);}catch(e){ok=false;}if(ok)d.local=true;
  if(file.size<=50*1048576){try{const url=A.sync&&A.sync.uploadDoc?await A.sync.uploadDoc('aff_'+String(num).replace(/[^A-Za-z0-9_-]/g,'_'),'dce',file.name,file):null;if(url)d.url=url;}catch(e){}}
  if(!d.url&&!d.local)d.note='fichier ni envoyé ni gardé : redépose-le';return d;}
function docModal(a,ctx,v){const cur=a.chiffrageV||1;const later=versionsOf(a).map(x=>+x.v).filter(n=>n>+v).concat([cur]).filter((n,i,L)=>L.indexOf(n)===i&&n>=+v);
  A.openModal(`<h3 style="margin-top:0">Écrit officiel · v${v}${+v===cur?' (en cours)':''}</h3><div class="hint" style="margin:0 0 6px">Mail du MOE, compte rendu d'alignement technique, courrier… : il devient une pièce du dossier (lisible et annotable dans 2 · Lecture) et reste dans l'historique des versions. Ex. « finalement 10 % de radios au lieu de 15 % » → importe le mail, note-le, puis ＋ Nouvelle version et modifie.</div>
    <label class="f">Type</label><div class="eq-filtres" id="vd-kinds">${Object.entries(KINDS).map(([k,l],i)=>`<button type="button" class="chip${i===0?' active':''}" data-k="${k}">${l}</button>`).join('')}</div>
    <label class="f">Fichier <span class="dim">(.eml, .msg, .pdf, Word, photo)</span></label><input class="f" type="file" id="vd-file" accept=".eml,.msg,.pdf,.doc,.docx,.odt,.rtf,.txt,.png,.jpg,.jpeg,message/rfc822,application/pdf">
    <label class="f">… ou texte collé</label><textarea class="f" id="vd-text" style="min-height:90px" placeholder="Colle le mail ou le compte rendu…"></textarea>
    <label class="f">Titre <span class="dim">(sinon : l'objet du mail ou le nom du fichier)</span></label><input class="f" id="vd-name" placeholder="ex. Mail MOE — radios 10 %">
    <div class="row" style="display:flex;gap:6px;flex-wrap:wrap"><div style="flex:1;min-width:120px"><label class="f">Date</label><input class="f" type="date" id="vd-date" value="${todayIso()}"></div><div style="flex:1;min-width:120px"><label class="f">De</label><input class="f" id="vd-from" placeholder="MOE, MOA…"></div></div>
    <label class="f">Note <span class="dim">(ce que ça change)</span></label><input class="f" id="vd-note" placeholder="ex. radio 15 % → 10 %">
    <label class="f">Appliqué dans</label><select class="f" id="vd-app"><option value="">pas encore (à appliquer dans une prochaine version)</option>${later.map(n=>`<option value="${n}">v${n}${n===cur?' (en cours)':''}</option>`).join('')}</select>
    <div class="actions" style="margin-top:8px"><button class="btn primary block" id="vd-ok">Ajouter l'écrit</button><button class="btn block" data-close>Annuler</button></div>`);
  let kind='mail';document.querySelectorAll('#vd-kinds .chip').forEach(b=>b.onclick=()=>{kind=b.dataset.k;document.querySelectorAll('#vd-kinds .chip').forEach(x=>x.classList.toggle('active',x===b));});
  document.getElementById('vd-file').onchange=async e=>{const f=e.target.files&&e.target.files[0];if(!f)return;const nm=document.getElementById('vd-name');
    if(/\.eml$/i.test(f.name)||f.type==='message/rfc822'){try{const m=parseEml(await f.text());if(nm&&!nm.value)nm.value=m.subject||f.name;const fr=document.getElementById('vd-from');if(fr&&!fr.value)fr.value=m.from||'';if(m.date)document.getElementById('vd-date').value=m.date;}catch(err){console.warn(err);}}else if(nm&&!nm.value)nm.value=f.name.replace(/\.[a-z0-9]+$/i,'');};
  document.getElementById('vd-ok').onclick=async()=>{const g=id=>(document.getElementById(id)||{}).value||'';const fe=document.getElementById('vd-file');const f=fe&&fe.files&&fe.files[0];const text=g('vd-text');
    if(!f&&!text.trim()){say('Un fichier ou le texte collé');return;}const ok=document.getElementById('vd-ok');if(ok){ok.disabled=true;ok.textContent='Enregistrement…';}
    const note=g('vd-note').trim();const app=g('vd-app');const d={id:newId(),catKey:'courrier',name:g('vd-name').trim(),date:g('vd-date'),from:g('vd-from').trim(),by:who(),at:new Date().toISOString(),ver:{v:+v,kind,notes:note?[{t:note,at:new Date().toISOString(),by:who()}]:[],applied:app?+app:null}};
    try{if(f){d.size=f.size;d.type=f.type||'';if(/\.eml$/i.test(f.name)||f.type==='message/rfc822'){const m=parseEml(await f.text());d.text=m.text||'(mail sans texte)';d.name=d.name||m.subject||f.name;d.from=d.from||m.from;d.date=d.date||m.date;d.file=f.name;}else d.name=d.name||f.name;
        if(!d.text)d.name=/\.[a-z0-9]{2,5}$/i.test(d.name)?d.name:d.name+'.'+(f.name.split('.').pop()||'pdf'); /* la Lecture reconnaît la pièce par son extension */await storeFile(a.num,d,f);}
      else{d.text=text;d.size=text.length;d.name=d.name||'Écrit du '+dFR(d.date||d.at);}}catch(err){console.warn(err);}
    const c=affGet(a.num);affSet(a.num,{dce:(c.dce||[]).concat([d])});A.closeModal();say('Écrit ajouté à la v'+v+' · pièce du dossier (annotable dans 2 · Lecture)');if(ctx.render)ctx.render();};}
function noteModal(a,d,ctx){A.openModal(`<h3 style="margin-top:0">Note sur l'écrit <span class="hint">· ${esc(d.name||'')}</span></h3><label class="f">Ce que ça change</label><input class="f" id="vn-t" placeholder="ex. radio 15 % → 10 %"><div class="actions" style="margin-top:8px"><button class="btn primary block" id="vn-ok">Ajouter la note</button><button class="btn block" data-close>Annuler</button></div>`);
  setTimeout(()=>{const i=document.getElementById('vn-t');if(i)i.focus();},50);
  document.getElementById('vn-ok').onclick=()=>{const t=((document.getElementById('vn-t')||{}).value||'').trim();if(!t){say('La note');return;}const c=affGet(a.num);affSet(a.num,{dce:(c.dce||[]).map(x=>x.id!==d.id?x:Object.assign({},x,{ver:Object.assign({},x.ver||{},{notes:((x.ver||{}).notes||[]).concat([{t,at:new Date().toISOString(),by:who()}])})}))});A.closeModal();if(ctx.render)ctx.render();};}
/* ═════════ 4 · NOUVELLE VERSION · REPARTIR D'UNE VERSION · RETIRER ═════════ */
const pendingDocs=a=>vdocsOf(a).filter(d=>!(d.ver||{}).applied);
function newModal(a,ctx){const cur=a.chiffrageV||1;const nv=cur+1;const prev=prevEntry(a,cur);const L=liveSnap(a,ctx);const D=prev?diffSnaps(snapOfEntry(a,prev),L):null;const docs=pendingDocs(a);
  A.openModal(`<h3 style="margin-top:0">Nouvelle version · v${nv}</h3><div class="hint" style="margin:0 0 6px">La <b>v${cur}</b> (en cours) est <b>figée</b> et reste consultable telle quelle ; la <b>v${nv}</b> démarre comme une <b>copie de tout</b> (chiffrage, quantités, tracés liés, DPGF, mémoire, offre) qu'on modifie point par point. Pas de limite de versions.</div>
    <label class="f">Motif de la v${nv}</label><input class="f" id="vv-note" value="Négociation" placeholder="tour de négociation, alignement technique, variante…"><div class="eq-filtres vv-motifs">${['Négociation','Alignement technique','Variante','Remise finale'].map(m=>`<button type="button" class="chip" data-vvm="${esc(m)}">${esc(m)}</button>`).join('')}</div>
    <div class="vv-box"><b>v${cur} figée${a.chiffrageNote?' · '+esc(a.chiffrageNote):''}</b> · ${eur(L.sum.total)} HT · ${nb(L.sum.nb)} soudures · ${nb(L.sum.ml)} ml${Object.keys(L.traces).length?' · '+Object.keys(L.traces).length+' tracé'+(Object.keys(L.traces).length>1?'s':'')+' lié'+(Object.keys(L.traces).length>1?'s':''):''}
      ${prev?`<div class="vv-chg"><div class="eq-lab">Ce qui a changé dans la v${cur} depuis la v${prev.v}</div>${changesHTML(D,prev.v,cur,false)}</div>`:'<div class="hint">Première version : rien à comparer.</div>'}</div>
    ${docs.length?`<div class="vv-box"><b>Écrits officiels reçus</b> <span class="hint">· coche ceux que la v${nv} applique</span>${docs.map(d=>`<label class="vv-ck"><input type="checkbox" name="vv-app" value="${esc(d.id)}" checked> <span><b>${esc(d.name||'Écrit')}</b>${((d.ver||{}).notes||[]).length?' — '+esc(d.ver.notes.map(n=>n.t).join(' · ')):''} <span class="dim">(v${d.ver.v})</span></span></label>`).join('')}</div>`:''}
    <div class="actions" style="margin-top:8px"><button class="btn primary block" id="vv-ok">Créer la v${nv}</button><button class="btn block" data-close>Annuler</button></div>`);
  document.querySelectorAll('#modal [data-vvm]').forEach(b=>b.onclick=()=>{const i=document.getElementById('vv-note');if(i)i.value=b.dataset.vvm;});
  document.getElementById('vv-ok').onclick=()=>{const note=((document.getElementById('vv-note')||{}).value||'').trim();const ids=[...document.querySelectorAll('#modal input[name=vv-app]:checked')].map(x=>x.value);A.closeModal();doNew(a.num,note,ids,ctx);};}
export function doNew(num,note,docIds,ctx){const a=affGet(num);if(!a)return;const cur=a.chiffrageV||1;const x=freeze(a,ctx);const now=new Date().toISOString();
  const patch={chiffrages:(a.chiffrages||[]).concat([x]),chiffrageV:cur+1,chiffrageNote:String(note||'').trim(),chiffrageVAt:now,chiffrageVBy:who(),chiffrageFrom:null};
  if(docIds&&docIds.length)patch.dce=(a.dce||[]).map(d=>docIds.includes(d.id)?Object.assign({},d,{ver:Object.assign({},d.ver||{},{applied:cur+1})}):d);
  affSet(num,patch);affState().vview=null;emitV({num,v:cur+1,prev:cur,action:'nouvelle'});
  say(`v${cur} figée (consultable) · v${cur+1} en cours : copie de tout, à modifier point par point`);if(ctx&&ctx.render)ctx.render();}
/* « ⇢ Repartir de cette version » (ancien « ↺ reprendre ») : la version en cours part dans l'historique, une NOUVELLE version démarre depuis la vX — rien n'est écrasé */
const LIFE=['remiseAt','montant','version','gagneAt','perduAt','motif','prixGagnant']; /* le cycle de vie de l'offre reste celui de l'affaire */
function doRestore(num,v,ctx){const a=affGet(num);if(!a)return;const x=entryOf(a,v);if(!x)return;const cur=a.chiffrageV||1;
  if(!confirm(`Repartir de la v${x.v} ? La v${cur} (en cours) est figée dans l'historique, une v${cur+1} démarre comme une copie de la v${x.v}${x.snap?' (chiffrage, quantités, DPGF, mémoire, offre)':' (chiffrage : version d\'avant le 14/10)'}. Rien n'est écrasé.`))return;
  const fr=freeze(a,ctx,' (avant reprise de la v'+x.v+')');const S=snapOfEntry(a,x);const now=new Date().toISOString();
  const patch={chiffrages:(a.chiffrages||[]).concat([fr]),chiffrage:clone(S.chiffrage||{}),chiffrageV:cur+1,chiffrageNote:'reprise de la v'+x.v+(x.note?' · '+x.note:''),chiffrageVAt:now,chiffrageVBy:who(),chiffrageFrom:+x.v};
  if(!S.old){['quantites','qsets','points','dpgf','memoire'].forEach(f=>{patch[f]=S[f]===undefined||S[f]===null?null:clone(S[f]);});const O=Object.assign({},clone(S.offre||{})||{});LIFE.forEach(k=>{delete O[k];if(a.offre&&a.offre[k]!==undefined)O[k]=a.offre[k];});patch.offre=O;}
  affSet(num,patch);affState().vview=null;emitV({num,v:cur+1,prev:cur,action:'reprise',from:+x.v});say(`v${cur} figée · v${cur+1} en cours, repartie de la v${x.v}`);if(ctx&&ctx.render)ctx.render();}
function doRemove(num,v,ctx){const a=affGet(num);if(!a)return;const x=entryOf(a,v);if(!x)return;if(!confirm(`Retirer la v${x.v} de l'historique ? Elle ne sera plus consultable.`))return;
  const L=(a.chiffrages||[]).map(y=>{if(!y||y===x||!y.snap)return y;let ch=false;const sn=Object.assign({},y.snap);Object.keys(sn).forEach(f=>{if(isRef(sn[f])&&+sn[f].$v===+x.v){sn[f]=clone(resolveField(a,x,f));ch=true;}});return ch?Object.assign({},y,{snap:sn}):y;}).filter(y=>y!==x); /* ce que les autres versions lui empruntent est recopié avant */
  const after=(a.chiffrages||[]).map(y=>+y.v).filter(n=>n>+x.v).sort((p,q)=>p-q)[0]||(a.chiffrageV||1); /* ses écrits officiels passent à la version suivante */
  const dce=(a.dce||[]).map(d=>d&&d.ver&&+d.ver.v===+x.v?Object.assign({},d,{ver:Object.assign({},d.ver,{v:after})}):d);
  affSet(num,{chiffrages:L,dce});if(+affState().vview===+x.v)affState().vview=null;if(ctx&&ctx.render)ctx.render();}
/* ═════════ 5 · CONSULTATION (lecture seule) ═════════ */
/* l'affaire VIRTUELLE de la version v : Object.assign({}, a, instantané) ; ancien format : chiffrage seul (_vview.old) */
export function vVirtual(a,v){const x=entryOf(a,v);if(!x)return null;const S=snapOfEntry(a,x);const va=Object.assign({},a,{chiffrage:clone(S.chiffrage||{})});
  if(!S.old){VFIELDS.forEach(f=>{va[f]=S[f]===undefined?null:clone(S[f]);});va.sites=(S.sites||[]).slice();}
  va.chiffrageV=+x.v;va.chiffrageNote=x.note||'';va._vview={v:+x.v,old:S.old,traces:S.traces||{},sum:x.sum||null,total:+x.total||0};return va;}
/* contexte de rendu d'une version : lecture seule, tracés = ceux figés avec la version */
export function vCtx(va,ctx){const T=(va&&va._vview&&va._vview.traces)||{};const old=!!(va&&va._vview&&va._vview.old);
  return Object.assign({},ctx,{canEdit:false,canPrix:false,vview:va._vview,traceQty:id=>{const t=T[id];return !old&&t&&!t.none&&!t.part?{rows:(t.rows||[]).map(r=>Object.assign({src:'tracé'},r)),tot:t.tot||{}}:null;},
    traceAgg:id=>{const t=T[id];const o={};if(t&&!t.none)(t.rows||[]).forEach(r=>{o[r.dn]={nb:+r.soud||0,ml:+r.mlTr||0};});return o;},tracePhases:()=>[]});}
export const vConsulting=a=>{const AS=affState();if(!a||!AS.vview)return false;if((AS.vviewNum&&AS.vviewNum!==a.num)||+AS.vview===+(a.chiffrageV||1)||!entryOf(a,AS.vview)){AS.vview=null;return false;}return true;}; /* la consultation vaut pour UNE affaire (vviewNum) */
/* onglet Tracé & chantiers pendant une consultation : les quantités des tracés figées avec la version (pour info) */
export function vTracesHTML(va){const V=va&&va._vview;if(!V)return '';if(V.old)return `<div class="card soft"><b>Tracés de la v${V.v}</b> <span class="hint">· version d'avant le 14/10 : tracés non figés</span></div>`;const T=V.traces||{};const ids=Object.keys(T);
  return `<div class="card soft"><b>Tracés liés au moment de la v${V.v}</b> <span class="hint">· quantités figées avec la version, pour info (les tracés eux-mêmes continuent de vivre)</span>${ids.length?ids.map(id=>{const t=T[id];return `<div class="vv-cg"><b>${esc(t.name||id)}</b>${t.none?' <span class="hint">· rien de lisible sur l\'appareil au moment de la version</span>':`<ul>${(t.rows||[]).map(r=>`<li>DN ${r.dn} : ${nb(r.soud)} soudures · ${nb(r.mlTr,1)} ml</li>`).join('')}</ul>`}</div>`;}).join(''):'<div class="eq-s">Aucun tracé lié.</div>'}</div>`;}
/* bandeau de consultation : en tête des onglets versionnés (complet) et des autres (rappel) */
export function vBandHTML(a,va,tab,canEdit,ctx){lotDCss();const v=+va._vview.v;const L=versionsOf(a);const i=L.findIndex(x=>+x.v===v);const x=L[i];const p=L[i-1],n=L[i+1];const cur=a.chiffrageV||1;
  const nav=`<span class="vv-bnav">${p?`<button class="btn sm" data-act="af" data-v="vview|${p.v}" title="Version précédente">‹ v${p.v}</button>`:''}${n?`<button class="btn sm" data-act="af" data-v="vview|${n.v}" title="Version suivante">v${n.v} ›</button>`:''}<button class="btn sm primary" data-act="af" data-v="vexit|">↩ Revenir à la version en cours (v${cur})</button></span>`;
  if(!VTABS.includes(tab))return `<div class="vv-band slim"><span>👁 <b>v${v}</b> en consultation dans Quantités · Chiffrage · Mémoire · DPGF · Offre — cet onglet-ci est commun à toutes les versions.</span>${nav}</div>`;
  const S=snapOfEntry(a,x);const P=p?snapOfEntry(a,p):null;const D=P?diffSnaps(P,S):null;let recalc='';
  try{const C=calcAffaire(va);if(x.total&&Math.abs((+C.total||0)-(+x.total||0))>=1){let RB=null;try{RB=baseOfAff(va);}catch(e){} /* intégration 14/10 : la version garde SA révision de base (lot A) ; un écart vient alors des règles de calcul, sinon d'une base absente */const own=RB&&(RB.state==='courante'||RB.state==='ancienne');
    recalc=`<div class="hint">Recalculé ${own?'avec la base de prix de cette version (sa révision) : '+eur(C.total)+' — l\'écart vient d\'une évolution des règles de calcul de l\'appli':'avec la base de prix actuelle'+(RB&&RB.state==='introuvable'?' (la révision de cette version n\'est pas encore sur cet appareil)':'')+' : '+eur(C.total)} (au moment de la v${v} : ${eur(x.total)}${(x.sum||{}).base?' · base '+esc(x.sum.base):''}).</div>`;}}catch(e){}
  const docs=vdocsOf(a,v);
  return `<div class="vv-band"><div class="vv-bh"><span class="vv-eye">👁</span><span class="vv-bt"><b>Tu consultes la v${v}</b> <span class="vv-ro">lecture seule</span><small>${x.note?'« '+esc(x.note)+' » · ':''}${x.startAt?'du '+dFR(x.startAt)+' ':''}figée le ${dFR(x.at)}${x.by?' par '+esc(x.by):''} · ${eur(x.total)} HT</small></span>${nav}</div>
    ${S.old?`<div class="warnbox" style="margin-top:6px">Version créée avant le 14/10 : seul son <b>chiffrage</b> a été gardé.${tab!=='chiffrage'?' Cet onglet n\'a pas d\'instantané pour la v'+v+'.':''}</div>`:''}${recalc}
    <details class="vv-chgd"${D&&(D.qty.length+D.trace.length+D.money.length+D.other.length)<7?' open':''}><summary>${p?`Ce qui a changé par rapport à la v${p.v} · ${esc(changesShort(D))}`:'Première version de l\'affaire'}</summary>${p?changesHTML(D,p.v,v,false):''}</details>
    ${docs.length?`<div class="vv-docs"><div class="eq-lab">Écrits officiels reçus après la v${v}</div>${docs.map(d=>docLine(a,d,canEdit,{ro:true})).join('')}</div>`:''}
    ${canEdit?`<div class="eq-acts" style="margin-top:6px"><button class="btn sm" data-act="af" data-v="vrestore|${v}" title="Crée une nouvelle version à partir de la v${v} : rien n'est écrasé">⇢ Repartir de la v${v}</button><button class="btn sm" data-act="af" data-v="vdoc|${v}">＋ Écrit officiel (mail, CR)</button></div>`:''}</div>`;}
/* ═════════ 6 · L'HISTORIQUE (onglet Chiffrage : barre + historique ; onglet Offre : historique) ═════════ */
const OPEN={hist:false};let WIRED=false;
function wire(){if(WIRED||typeof document==='undefined')return;WIRED=true;document.addEventListener('toggle',e=>{const t=e.target;if(t&&t.dataset&&t.dataset.vvdet)OPEN[t.dataset.vvdet]=t.open;},true);
  document.addEventListener('change',e=>{const t=e.target;if(!t||!t.dataset||t.dataset.vvapp===undefined)return;e.stopPropagation();const AS=affState();const a=AS.cur?affGet(AS.cur):null;if(!a||!VCTX||!VCTX.canEdit)return;const id=t.dataset.vvapp;const n=t.value?+t.value:null;
    affSet(a.num,{dce:(a.dce||[]).map(d=>d.id!==id?d:Object.assign({},d,{ver:Object.assign({},d.ver||{},{applied:n})}))});say(n?'Appliqué dans la v'+n:'Pas encore appliqué');if(VCTX.render)VCTX.render();},true);}
let VCTX=null;
export function vHistoryHTML(a,canEdit,ctx,opt){lotDCss();wire();VCTX=ctx;opt=opt||{};const L=versionsOf(a);const cur=a.chiffrageV||1;const won=WON.includes(a.etat);const prev=L.filter(x=>+x.v<cur).pop()||null;
  const live=prev?(opt.live||diffSnaps(snapOfEntry(a,prev),liveSnap(a,ctx))):null; /* opt.live : l'écart déjà calculé par la barre du chiffrage */const remV=(a.offre||{}).remiseAt?+((a.offre||{}).version||0):0;
  const rowCur=`<div class="vv-row cur"><div class="vv-rh"><b>v${cur} · ${esc(a.chiffrageNote||(cur===1?'version initiale':'version en cours'))}</b> <span class="vv-tag cur">en cours</span>${won?'<span class="vv-tag vf" title="Version finale : celle de l\'affaire gagnée">VF</span>':''}${remV===cur?'<span class="vv-tag">📤 remise</span>':''}${a.chiffrageFrom?`<span class="vv-tag">repartie de la v${a.chiffrageFrom}</span>`:''}<small>${a.chiffrageVAt?'depuis le '+dFR(a.chiffrageVAt)+(a.chiffrageVBy?' · '+esc(a.chiffrageVBy):''):''}</small></div>
    ${prev?`<div class="vv-chg">${changesHTML(live,prev.v,cur,true)}</div>`:''}${vdocsOf(a,cur).map(d=>docLine(a,d,canEdit,{})).join('')}${canEdit?`<div class="vv-acts"><button class="btn sm" data-act="af" data-v="vdoc|${cur}" title="Mail, compte rendu, courrier reçu pendant cette version">＋ Écrit officiel</button></div>`:''}</div>`;
  const rows=L.slice().reverse().map(x=>{const p=L.filter(y=>+y.v<+x.v).pop()||null;const D=p?diffSnaps(snapOfEntry(a,p),snapOfEntry(a,x)):null;const docs=vdocsOf(a,x.v);
    return `<div class="vv-row"><div class="vv-rh"><b>v${x.v} · ${esc(x.note||'')}</b>${remV===+x.v?'<span class="vv-tag">📤 remise</span>':''}${x.snap?'':'<span class="vv-tag" title="Créée avant le 14/10 : chiffrage seul">chiffrage seul</span>'}<small>${esc(x.by||'')} · ${x.startAt?dFR(x.startAt)+' → ':''}${dFR(x.at)} · ${eur(x.total||0)}</small></div>
      ${p?`<details class="vv-chgd"><summary>par rapport à la v${p.v} · ${esc(changesShort(D))}</summary>${changesHTML(D,p.v,x.v,false)}</details>`:''}
      ${docs.map(d=>docLine(a,d,canEdit,{})).join('')}
      <div class="vv-acts"><button class="btn sm" data-act="af" data-v="vview|${x.v}" title="Ouvrir la v${x.v} en lecture seule (Quantités, Chiffrage, Mémoire, DPGF, Offre)">👁 Consulter</button>${canEdit?`<button class="btn sm" data-act="af" data-v="vrestore|${x.v}" title="Reprendre cette version comme point de départ : crée une nouvelle version, n'écrase rien">⇢ Repartir de cette version</button><button class="btn sm" data-act="af" data-v="vdoc|${x.v}" title="Mail, compte rendu reçu après cette version">＋ Écrit</button><button class="btn sm" data-act="af" data-v="vrm|${x.v}" style="color:#9b2c22" title="Retirer de l'historique">✕</button>`:''}</div></div>`;}).join('');
  const open=opt.open||OPEN.hist;
  return `<details class="vv-hist" data-vvdet="hist"${open?' open':''}><summary>🕘 Versions · ${L.length+1} <span class="dim">(v${cur} en cours${L.length?' · '+L.length+' figée'+(L.length>1?'s':'')+', consultables':''})</span>${live&&!live.unknown&&!live.qtyChanged&&!live.traceChanged?' <span class="vv-tag warn">⚠ quantités et tracé inchangés</span>':''}</summary>${rowCur}${rows}</details>`;}
/* barre de l'onglet Chiffrage : ＋ Nouvelle version, l'écart avec la version précédente (court), l'historique */
export function vBarHTML(a,canEdit,ctx){lotDCss();const L=versionsOf(a);const cur=a.chiffrageV||1;const prev=L.filter(x=>+x.v<cur).pop()||null;const D=prev?diffSnaps(snapOfEntry(a,prev),liveSnap(a,ctx)):null;
  const line=prev?(!D.unknown&&!D.qtyChanged&&!D.traceChanged?`<div class="vv-warn">⚠ v${cur} : nouvelle version mais aucune modification de quantités ni de tracé depuis la v${prev.v}${D.money.length?' · '+esc(D.money[0]):''}.</div>`:`<div class="vv-line">Depuis la v${prev.v} : ${esc(changesShort(D))}</div>`):'';
  return `<div class="vv-bar"><div class="eq-acts" style="margin:0">${canEdit?`<button class="btn" data-act="af" data-v="vnew|" title="Tour de négociation, alignement technique, variante : la version en cours est figée (consultable), la nouvelle est une copie de tout">＋ Nouvelle version <span class="dim">(v${cur} en cours · ${L.length} gardée${L.length>1?'s':''})</span></button>`:''}</div>${line}${vHistoryHTML(a,canEdit,ctx,{live:D})}</div>`;}
/* ═════════ 7 · ACTIONS (data-act="af" data-v="v…|…") ═════════ */
export function vAct(k,arg,arg2,ctx){if(!/^v(new|restore|rm|view|exit|doc|docnote|docnoterm|docrm)$/.test(k))return false;const AS=affState();const a=AS.cur?affGet(AS.cur):null;if(!a)return true;const canEdit=ctx.canEdit;const render=()=>{if(ctx.render)ctx.render();};
  switch(k){
    case 'vview':{const x=entryOf(a,arg);if(!x||+arg===+(a.chiffrageV||1)){AS.vview=null;render();return true;}AS.vview=+x.v;AS.vviewNum=a.num;if(!VTABS.includes(AS.tab))AS.tab='chiffrage';render();setTimeout(()=>{const el=document.querySelector('#eq-app .vv-band');if(el&&el.scrollIntoView)el.scrollIntoView({block:'nearest'});},60);return true;}
    case 'vexit':AS.vview=null;render();return true;
    case 'vnew':if(!canEdit)return true;newModal(a,ctx);return true;
    case 'vrestore':if(!canEdit)return true;doRestore(a.num,arg,ctx);return true;
    case 'vrm':if(!canEdit)return true;doRemove(a.num,arg,ctx);return true;
    case 'vdoc':if(!canEdit)return true;docModal(a,ctx,arg?+arg:(a.chiffrageV||1));return true;
    case 'vdocnote':{if(!canEdit)return true;const d=(a.dce||[]).find(x=>x.id===arg);if(d)noteModal(a,d,ctx);return true;}
    case 'vdocnoterm':{if(!canEdit)return true;affSet(a.num,{dce:(a.dce||[]).map(d=>d.id!==arg?d:Object.assign({},d,{ver:Object.assign({},d.ver||{},{notes:((d.ver||{}).notes||[]).filter((n,i)=>i!==+arg2)})}))});render();return true;}
    case 'vdocrm':{if(!canEdit)return true;const d=(a.dce||[]).find(x=>x.id===arg);if(!d)return true;if(!confirm('Retirer « '+(d.name||'cet écrit')+' » (et sa pièce du dossier) ?'))return true;affSet(a.num,{dce:(a.dce||[]).filter(x=>x.id!==arg)});try{A.kv.del('trace:affdoc:'+arg);}catch(e){}render();return true;}
  }
  return false;}
