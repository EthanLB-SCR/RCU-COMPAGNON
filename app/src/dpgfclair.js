// dpgfclair.js — LOT C2 (16/10) : le DPGF « comme dans Excel » plus clair et plus rapide à remplir. Ethan (16/10) : « pour le DPGF c'est bien comme ça. En double
// écran il ne faut pas que le « DPGF dans l'autre fenêtre » prenne la moitié de l'écran, le but c'est de libérer de la place justement. Là trop de menus déroulants, on
// ne sait plus où remonter pour re-cliquer « calculer cette cellule » pour valider pour passer les prestations… Aussi quand tout le montant d'une ligne est rentré il faut
// qu'elle soit barrée ou grisée […] Il faut que ça calcule dans le tableau les autocontrôles […] le même panier de trucs cochés je n'en oublie pas un ; et petit facilitant
// pour ce qui est au ml […] Sinon les fonctionnalités nickel, juste un meilleur affichage plus clair et c'est parfait ».
// · ⧉ autre écran : une barre fine à la place de la grille ; le calculateur (à gauche, collé en haut) et la ventilation (à droite) prennent toute la largeur ;
// · la carte : barre d'outils courte, les actions rares dans « ⋯ » (insérer / supprimer des lignes, affichage, outil détaillé, détail des prix unitaires) ;
// · le calculateur : en-tête collé en haut (n°, désignation, quantité, unité, Σ, PU, « ↦ Mettre », « ↦ Mettre et ligne suivante ▶ », ◀ ▶) ; liste à plat avec les titres
//   de zone et un filtre ; une composante tout pointée par les autres lignes est barrée, grisée, non cochable, en bas de sa zone, avec les lignes qui l'ont prise ;
// · AUTOCONTRÔLE PAR TYPE. prix.js (calcEtude) : par DN, montant = manchons × minutes par manchon des contrôles cochés dans la zone × coût / jour de l'équipe manchon
//   ÷ minutes d'une journée (en S+M ou « jours complets » : la part autocontrôle des journées, toujours au prorata de ces minutes) ; minutes par manchon et par type =
//   cadences par DN de la base de prix (colonnes « Autocontrôle · minutes par manchon » : Dépression, Fils DH, Ressuage, Itopo, Pression) ; types = cases
//   « Autocontrôle » de la carte « Équipes, manchons, autocontrôle » de la zone. Un type = la composante « Autocontrôle · DN x » au prorata de ses minutes. Pris seul
//   sur une ligne : {k: clé de l'autocontrôle du DN, q: x × min_type ÷ min_total, sub: type, x: manchons} — q en manchons « du DN » : linkNow, pointage, ventilation,
//   répartitions comptent juste sans rien changer ; si les minutes ou les types de la zone changent, q est remis à x × la nouvelle part (le prix passe « à mettre à jour ») ;
// · « ↺ Comme la ligne … » : les cases de la dernière ligne validée (ou d'une ligne liée choisie), quantités proposées pour CETTE ligne ; sélections gardées :
//   a.dpgf.sels = [{id, nom, ks:[k | k#type], at, by}] (optionnel), une puce « Installations · 4 / 5 : il manque … » ; les ml tapés une fois → proposés pour tout ce qui se
//   compte au ml (dpgfrep.js, defTake) ;
// · les anciens outils (bordereau simplifié, atelier) rangés tout en bas dans un pli « 🗄 Anciens outils » quand la grille Excel est là (commerce.js).
// Rien d'ancien ne change : liens, couleurs, répartitions, export, versions ; les boutons gardent leurs actions (dxput, dxcalc, dxrptool, dxpop…). Tout ce que dpgfxl.js
// prête passe par init() (aucun import circulaire).
import {parseAddr} from './xlcalc.js';
import * as REP from './dpgfrep.js';
import {calcGroups,grpHTML,chipsHTML,ckeys} from './dpgfsuivi.js'; // 16/10 après-midi (lot C3) : groupes repliables (installations en tête), puces, clés stables
let X=null;export function init(api){X=api;}
const esc=s=>String(s??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const nb=(x,d)=>{x=+x||0;return x.toLocaleString('fr-FR',{maximumFractionDigits:d===undefined?0:d,minimumFractionDigits:d===undefined?0:d});};
const eur=(x,d)=>nb(x,d)+' €';const r2=x=>Math.round((+x||0)*100)/100;const up=s=>String(s||'').toUpperCase();
const fq=x=>nb(x,Math.abs(x-Math.round(x))>1e-9?2:0);const fml=x=>nb(x,Math.abs(x)<10&&Math.abs(x-Math.round(x))>0.05?1:0);
const num=v=>{const x=parseFloat(String(v??'').replace(',','.'));return isFinite(x)?x:0;};
const numIn=s=>{s=String(s??'').trim().replace(/[\s  ]/g,'').replace(',','.');if(!s)return null;const x=parseFloat(s);return isFinite(x)?x:null;};
const fin=x=>String(+(+x).toFixed(3)).replace('.',',');const fin1=x=>String(+(+x).toFixed(1)).replace('.',',');
const normF=x=>String(x||'').normalize('NFD').replace(/[̀-ͯ]/g,'').toLowerCase();
const docOK=()=>typeof document!=='undefined';
const lst=(L,RO)=>{L=RO?L.slice().sort((x,y)=>(RO.get(x)||0)-(RO.get(y)||0)):L;return L.slice(0,4).join(', ')+(L.length>4?' +'+(L.length-4):'');};
const dur=m=>m<60?nb(m)+' min':nb(m/60,Math.abs(m/60-Math.round(m/60))>0.05?1:0)+' h';
const dnOfDes=t=>{const m=String(t||'').match(/\bDN\s?(\d{2,3})\b/i);return m?+m[1]:null;};
const CS={sav:{},last:{},sync:{}};
/* ═════════ 1 · AUTOCONTRÔLE PAR TYPE ═════════ */
const CTRL=[['depression','Dépression'],['filsDH','Fils DH'],['ressuage','Ressuage'],['itopo','Itopo'],['pression','Pression']];
export const typeLab=t=>(CTRL.find(x=>x[0]===t)||[t,String(t||'')])[1];
const CTC=new WeakMap();
/* types comptés pour la composante « Autocontrôle · DN x » d'une zone : cochés dans la zone, minutes > 0 au DN ; null sinon */
export function ctrlOf(CP,c){if(!CP||!c||c.p!=='autoctrl'||!c.dn||c.z<0)return null;let m=CTC.get(CP);if(!m){m=new Map();CTC.set(CP,m);}if(m.has(c.k))return m.get(c.k);let o=null;
  const e=CP.C&&CP.C.etudes?CP.C.etudes[c.z]:null;const E=(e&&e.z&&e.z.eq)||{};const row=(((((e||{}).r||{}).detail||{}).dn||{}).rows||[]).find(r=>+r.dn===+c.dn);
  if(row&&row.c&&row.c.ctrl&&E.ctrl){const ts=CTRL.filter(([t])=>E.ctrl[t]&&num(row.c.ctrl[t])>0).map(([t,lab])=>({t,lab,min:num(row.c.ctrl[t])}));const mm=ts.reduce((s,x)=>s+x.min,0);if(ts.length&&mm>0)o={ts,m:mm,K:+c.qty||0};}
  m.set(c.k,o);return o;}
export const ratioOf=(CP,k,t)=>{const c=CP&&CP.by.get(k);const o=ctrlOf(CP,c);const x=o&&o.ts.find(y=>y.t===t);return x?x.min/o.m:0;};
const perMl=c=>!!(c&&c.dn&&c.ml>0&&c.qty>0);const toMl=(c,q)=>q*c.ml/c.qty;const fromMl=(c,m)=>m*c.qty/c.ml;
/* les types pris sur une ligne : C.sub = {k: {type: texte}} (le lien garde x, les manchons) ; Σ du calculateur */
export function subIn(C,x){C.sub=C.sub||{};(C.sub[x.k]=C.sub[x.k]||{})[x.sub]=String(x.x!==undefined&&x.x!==null?x.x:0);}
export function subAmt(a,CP,C){if(!C||!C.sub||!CP)return 0;let s=0;Object.keys(C.sub).forEach(k=>{if(C.chk&&C.chk[k]!==undefined)return;const c=CP.by.get(k);if(!c)return;Object.keys(C.sub[k]).forEach(t=>{s+=X.parseQ(C.sub[k][t],c)*ratioOf(CP,k,t)*c.puV;});});return s;}
/* détail des prix unitaires (dans l'appli, et le classeur) : « › Itopo : 120 manch. × 2,63 € = 315,00 € » */
export const cmpSub=(CP,x,c)=>` › ${esc(typeLab(x.sub))} : ${fq(+x.x||0)} manch. × ${nb(c.puV*ratioOf(CP,x.k,x.sub),2)} € = ${eur((+x.q||0)*c.puV,2)}`;
export const cmpSubTxt=(CP,x,c)=>' › '+typeLab(x.sub)+' : '+fq(+x.x||0)+' manch. × '+nb(c.puV*ratioOf(CP,x.k,x.sub),2)+' €';
/* ventilation : sous « Autocontrôle interne », le prix de chaque type (toutes zones) — « dont Dépression 1 524 € · Itopo 610 € · Pression 914 € » */
export function ventSub(CP,pk){if(pk!=='autoctrl'||!CP)return '';const T={};CP.list.forEach(c=>{const o=ctrlOf(CP,c);if(o)o.ts.forEach(x=>{T[x.t]=(T[x.t]||0)+c.amtV*x.min/o.m;});});
  const ks=CTRL.map(x=>x[0]).filter(t=>T[t]>0.5);return ks.length?`<span class="sub c2-vsub" title="Au prorata des minutes par manchon de chaque contrôle (cadences de la base de prix, types cochés dans chaque zone)">dont ${ks.map(t=>esc(typeLab(t))+' '+eur(T[t])).join(' · ')}</span>`:'';}
/* les minutes ou les types de la zone ont changé : q = x × la nouvelle part (le lien passe « à mettre à jour » comme pour tout changement du chiffrage) */
function syncSubs(a,CP){const D=a.dpgf||{};let ch=false;const liens=(D.liens||[]).map(L=>{if(!(L.comps||[]).some(x=>x.sub&&!x.rep))return L;let m=false;
  const comps=L.comps.map(x=>{if(!x.sub||x.rep)return x;const qn=(+x.x||0)*ratioOf(CP,x.k,x.sub);if(Math.abs(qn-(+x.q||0))<=1e-9*Math.max(1,qn))return x;m=true;return Object.assign({},x,{q:qn});});if(!m)return L;ch=true;return Object.assign({},L,{comps});});return ch?liens:null;}
/* ═════════ 2 · QUI A PRIS QUOI (les autres lignes) ═════════ */
function labOfLink(a,M){const D=a.dpgf||{};const S=M?X.dpSheet(M,D):null;const byRow=new Map((D.lignes||[]).filter(l=>!l.section&&l.row).map(l=>[l.row,l.n||'']));
  return L=>{const p=parseAddr(L.a||'');const n=p&&S&&up(L.sh)===up(S.name)?byRow.get(p.r):'';return n||L.a;};}
/* par composante : q pris (les parts de répartition de la ligne comptent, comme dans pointage), dont pris par type (tq, tx en manchons), et les lignes qui l'ont prise */
function useOf(a,M,skipId){const D=a.dpgf||{};const lab=labOfLink(a,M);const U=new Map();const RO=U.rowOf=new Map(); /* les lignes citées dans l'ordre du DPGF */const CP=X.compsOf(a);const kk=k=>{const c=CP&&CP.by.get(k);return c?c.k:k;}; /* 16/10 (lot C3) : sous la clé stable */
  (D.liens||[]).forEach(L=>{const n=lab(L);const p=parseAddr(L.a||'');if(!RO.has(n))RO.set(n,p?p.r:1e9);(L.comps||[]).forEach(x=>{if(L.id===skipId&&!x.rep)return;let o=U.get(kk(x.k));if(!o){o={q:0,tq:0,tx:{},by:[],byT:{}};U.set(kk(x.k),o);}const q=+x.q||0;o.q+=q;
    if(x.sub&&!x.rep){o.tq+=q;o.tx[x.sub]=(o.tx[x.sub]||0)+(+x.x||0);const b=o.byT[x.sub]=o.byT[x.sub]||[];if(!b.includes(n))b.push(n);}else if(!o.by.includes(n))o.by.push(n);});});return U;}
/* reste d'un type (en manchons), vu de la ligne qu'on calcule (mine = ses prises par type, en manchons) : les prises par type (des autres lignes et de celle-ci) d'abord ;
   les prises du DN entier des autres lignes (parts de répartition comprises) couvrent ensuite ce qui reste de chaque type, au prorata — pas de « dépasse » tant que
   l'autocontrôle du DN n'est pas dépassé ; un type coché d'office prend ce qu'il lui reste vraiment (les ml d'une prise entière couvrent aussi ce type) */
function typeRest(o,u,t,mine){const K=o.K,m=o.m;const ox=u?u.tx:{};const sh=x=>x.min/m;let cap=0;const r={};
  o.ts.forEach(x=>{const v=(K-(+ox[x.t]||0)-(mine&&+mine[x.t]||0))*sh(x);r[x.t]=v;cap+=Math.max(0,v);});const x=o.ts.find(y=>y.t===t);if(!x)return 0;const W=u?Math.max(0,u.q-u.tq):0;
  const wt=cap>1e-9?W*Math.max(0,r[t])/cap:0;return Math.max(0,((K-(+ox[t]||0))*sh(x)-wt)/sh(x));}
const mineOf=(C,c,k)=>{const o={};const S=C&&C.sub&&C.sub[k];if(S&&C.chk[k]===undefined)Object.keys(S).forEach(t=>{o[t]=X.parseQ(S[t],c);});return o;};
function availOf(a,CP,M,T,C){const lk=T?X.linkAt(a,T.sh,T.a):null;const U=useOf(a,M,lk?lk.id:null);
  return {lk,U,rest:k=>{const c=CP.by.get(k);return c?c.qty-((U.get(k)||{}).q||0):0;},restT:(k,t)=>{const c=CP.by.get(k);const o=ctrlOf(CP,c);return o?typeRest(o,U.get(k),t,mineOf(C,c,k)):0;}};}
const stateOf=(a,M,T)=>{const C=X.calcState(a,T,M);if(!C.sub)C.sub={};return C;};
/* un type coché : les ml de la ligne (ou les derniers tapés), une ligne « à l'unité » → sa quantité, sinon tout le reste */
function subTake(c,T,q,av){const ml=REP.mlDef(T,q);if(ml>0&&perMl(c))return Math.min(av,fromMl(c,ml));if(q>0&&T&&REP.isCntU(T.u))return Math.min(av,q);return av;}
/* cocher une liste de cases (« Comme la ligne », sélection gardée, DN de la désignation) : quantités proposées pour CETTE ligne ; rien sur ce qui est déjà coché */
function pick(a,M,CP,T,keys){keys=ckeys(CP,keys); /* 16/10 (lot C3) : anciennes clés → clés stables */const C=stateOf(a,M,T);const AV=availOf(a,CP,M,T,C);const q=X.parseQ(C.q,{qty:0});const R={n:0,had:0,ex:[],gone:0};
  [...new Set(keys)].forEach(key=>{const i=key.indexOf('#');const k=i<0?key:key.slice(0,i),t=i<0?null:key.slice(i+1);const c=CP.by.get(k);if(!c){R.gone++;return;}
    if(t){if(!ratioOf(CP,k,t)){R.gone++;return;}if(C.chk[k]!==undefined||(C.sub[k]&&C.sub[k][t]!==undefined)){R.had++;return;}const av=AV.restT(k,t);if(av<=1e-6){R.ex.push(X.compName(c)+' › '+typeLab(t));return;}(C.sub[k]=C.sub[k]||{})[t]=fin(subTake(c,T,q,av));R.n++;return;}
    if(C.chk[k]!==undefined){R.had++;return;}const av=AV.rest(k);if(av<=1e-6){R.ex.push(X.compName(c));return;}C.chk[k]=X.fmtIn(REP.defTake(c,T,q,av));R.n++;});return R;}
const pickMsg=R=>`${R.n} case${R.n>1?'s':''} cochée${R.n>1?'s':''}${R.had?' ('+R.had+' déjà cochée'+(R.had>1?'s':'')+')':''}${R.ex.length?' · déjà tout pointé : '+R.ex.slice(0,3).join(', ')+(R.ex.length>3?'…':''):''}${R.gone?' · '+R.gone+' n\'existe'+(R.gone>1?'nt':'')+' plus dans le chiffrage':''}`;
const selKeys=C=>Object.keys(C.chk||{}).concat(Object.keys(C.sub||{}).flatMap(k=>C.chk&&C.chk[k]!==undefined?[]:Object.keys(C.sub[k]).map(t=>k+'#'+t)));
const nChecked=C=>selKeys(C).length;
function selStat(CP,C,AV,S){const ks=ckeys(CP,S.ks||[]);let on=0;const miss=[],ex=[],gone=[];
  ks.forEach(key=>{const i=key.indexOf('#');const k=i<0?key:key.slice(0,i),t=i<0?null:key.slice(i+1);const c=CP.by.get(k);if(!c||(t&&!ratioOf(CP,k,t))){gone.push(key);return;}
    const isOn=t?(C.chk[k]!==undefined||!!(C.sub[k]&&C.sub[k][t]!==undefined)):C.chk[k]!==undefined;if(isOn){on++;return;}const nm=X.compName(c)+(t?' › '+typeLab(t):'');if((t?AV.restT(k,t):AV.rest(k))>1e-6)miss.push(nm);else ex.push(nm);});
  return {n:ks.length,on,miss,ex,gone};}
/* « ↺ Comme la ligne » : la dernière ligne validée ici (sinon la plus récente), jamais la ligne elle-même ni un lien créé par une répartition */
const likeOK=(L,lk)=>!!L&&(!lk||L.id!==lk.id)&&!L.rep&&(L.comps||[]).some(x=>!x.rep);
function likeSrc(a,lk){const D=a.dpgf||{};const L0=(D.liens||[]).find(L=>L.id===CS.last[a.num]);if(likeOK(L0,lk))return L0;let b=null;(D.liens||[]).forEach(L=>{if(likeOK(L,lk)&&(!b||String(L.at||'')>String(b.at||'')))b=L;});return b;}
/* ═════════ 3 · LE CALCULATEUR ═════════ */
export function calcHTML(a,M,canEdit,CP,t){if(!CP||!M)return null;css(document);wire();const ro=!canEdit;
  if(!t)return `<div class="dx-panel dx-calc c2-calc" id="dx-calc"><h4>🧮 Calculer un prix</h4>${REP.calcHead(a,M,canEdit)}<div class="eq-s c2-empty">Touche le <b>PU d'une ligne</b> du DPGF : le calculateur s'ouvre sur elle. Coche ce que son prix comprend, puis « ↦ Mettre et ligne suivante ▶ ».${ro?'':' Pour une autre cellule : sélectionne-la puis « 🧮 Calculer cette cellule ».'}</div></div>`;
  const C=stateOf(a,M,t);const AV=availOf(a,CP,M,t,C);const lk=AV.lk;const q=X.parseQ(C.q,{qty:0});const amt=X.calcSum(a,CP,C);const pu=q>0?amt/q:0;const D=a.dpgf||{};
  const col=lk?X.LK_COLS[lk.col%X.LK_COLS.length]:null;const XL=lk?X.linkNow(lk,CP,M):null;const ln=t.line;const onDp=up(t.sh)===up(X.dpSheet(M,D).name);const qc=t.qa?X.qOfCell(M,t.sh,t.qa):null;const lab=labOfLink(a,M);
  const h4=`<h4>🧮 Calculer le prix · ligne ${t.r}${lk?` <span class="dx-lkh" style="background:${col}">🔗 lié</span>${ro?'':`<button class="btn sm c2-unl" data-act="af" data-v="dxunlink|${esc(lk.id)}" title="Retirer le lien avec notre chiffrage (le PU reste dans le DPGF)">✕ délier</button>`}`:''}</h4>`;
  /* en-tête collé en haut : la ligne, Σ, PU, Mettre */
  const top=`<div class="c2-top"><div class="c2-ln">${onDp?`<span class="c2-nav"><button class="btn sm" data-act="af" data-v="dxc2go|-1" title="Ligne précédente du DPGF (sans rien mettre)" aria-label="Ligne précédente">◀</button><button class="btn sm" data-act="af" data-v="dxc2go|1" title="Ligne suivante du DPGF (sans rien mettre)" aria-label="Ligne suivante">▶</button></span>`:''}
      <span class="c2-lt" title="${esc(ln?(ln.n?ln.n+' ':'')+ln.des:t.a)}">${ln?`<b class="c2-n">${esc(ln.n||'')}</b> ${esc(ln.des)}`:`Cellule <b>${esc(t.a)}</b>`}</span>
      <label class="c2-q">Qté <input inputmode="decimal" data-dx="q" value="${esc(C.q)}" ${ro?'disabled':''} aria-label="Quantité de la ligne"> <span>${esc(t.u||'')}</span></label><button class="btn sm rp-fo c2-shut" data-act="af" data-v="dxrpshut|" title="Fermer le calculateur (Échap)" aria-label="Fermer le calculateur">✕</button></div>
    ${t.qa&&!ro&&q>0&&(qc===null||Math.abs(qc-q)>1e-9)?`<label class="c2-wq"><input type="checkbox" data-dx="wq" ${C.wq?'checked':''}> écrire aussi ${esc(fq(q))} dans ${esc(t.qa)} <span class="dim">(sinon la quantité du DPGF ne change pas)</span></label>`:''}
    <div class="dx-res" id="dx-cres">${resHTML(a,t,C,amt,q,pu,lk,ro)}</div>${chipsHTML(a,CP) /* 16/10 après-midi (lot C3) : puces « 🏗 Installations · Zone 1 · … » pour aller droit à un groupe */}</div>`;
  const subOld=lk?(lk.comps||[]).filter(x=>x.sub&&!x.rep&&!ratioOf(CP,x.k,x.sub)):[];
  const warn=`${XL&&XL.stale?`<div class="dx-stale">⚠ ${XL.cell===null?'PU vide':'PU du DPGF '+nb(XL.cell,2)+' €'} → le chiffrage donne <b>${nb(XL.pur,2)} €</b>${lk.v&&lk.v!==CP.v?' (v'+lk.v+' → v'+CP.v+')':''}${ro?'':` <button class="btn sm" data-act="af" data-v="dxrelink|${esc(lk.id)}">↻ Appliquer</button>`}</div>`:''}${XL&&XL.miss.length?`<div class="dx-stale">⚠ ${XL.miss.length} case${XL.miss.length>1?'s':''} de cette ligne n'existe${XL.miss.length>1?'nt':''} plus dans le chiffrage (comptée${XL.miss.length>1?'s':''} 0 €) : recoche ce qu'il faut.</div>`:''}${subOld.length?`<div class="dx-stale">⚠ ${subOld.map(x=>esc(typeLab(x.sub))).join(', ')} : plus coché${subOld.length>1?'s':''} dans la zone (ou sans minutes), compté 0 € : recoche le type dans la zone, ou décoche-le ici.</div>`:''}`;
  /* outils : même panier de cases d'une ligne à l'autre ; ml proposés */
  const nOn=nChecked(C);const src=ro?null:likeSrc(a,lk);const others=ro?[]:((D.liens||[]).filter(L=>likeOK(L,lk)));const desOf=L=>{const p=parseAddr(L.a||'');const l=p?(D.lignes||[]).find(x=>!x.section&&x.row===p.r):null;return l?l.des:'';};
  const chips=(D.sels||[]).map(S=>{const st=selStat(CP,C,AV,S);const ok=!st.miss.length;const tip=(ok?'Tout est coché':'Il manque : '+st.miss.join(', '))+(st.ex.length?' · déjà tout pointé ailleurs : '+st.ex.join(', '):'')+(st.gone.length?' · '+st.gone.length+' n\'existe'+(st.gone.length>1?'nt':'')+' plus dans le chiffrage':'')+(ok?'':' — touche pour les cocher');
    return `<span class="c2-chip${ok?' ok':' miss'}"><button class="c2-cb" data-act="af" data-v="dxc2sel|${esc(S.id)}" title="${esc(tip)}">${esc(S.nom)} · ${st.on} / ${st.n}${ok?' ✓':' : il manque '+esc(st.miss.slice(0,2).join(', ')+(st.miss.length>2?' +'+(st.miss.length-2):''))}</button><button class="c2-cx" data-act="af" data-v="dxc2seldel|${esc(S.id)}" title="Supprimer la sélection « ${esc(S.nom)} »" aria-label="Supprimer la sélection ${esc(S.nom)}">✕</button></span>`;}).join('');
  const tools=ro?'':`<div class="c2-tools">${src?`<button class="btn sm" data-act="af" data-v="dxc2like|${esc(src.id)}" title="Coche les mêmes cases que la ligne ${esc(lab(src))} (la dernière validée), avec les quantités de CETTE ligne">↺ Comme la ligne ${esc(lab(src))}</button>`:''}${others.length>(src?1:0)?`<select class="c2-like" data-c2="like" aria-label="Reprendre les cases d'une autre ligne"><option value="">${src?'↺ une autre ligne…':'↺ Comme la ligne…'}</option>${others.filter(L=>!src||L.id!==src.id).map(L=>`<option value="${esc(L.id)}">${esc((lab(L)+' · '+desOf(L)).slice(0,64))}</option>`).join('')}</select>`:''}${chips}${nOn?`<button class="btn sm" data-act="af" data-v="dxc2save|1" title="Garder ces cases sous un nom (ex. « Installations ») : une puce les recoche d'un clic sur les autres lignes, sans en oublier">💾 Garder cette sélection</button><button class="btn sm" data-act="af" data-v="dxcclr|">Tout décocher</button>`:''}${C.mlLast>0?`<span class="c2-mlh" title="Les derniers ml tapés : chaque case cochée ensuite qui se compte au ml (soudures, manchons, autocontrôles d'un DN, postes au ml) les prend d'office ; modifiable case par case">📏 ${fml(C.mlLast)} ml proposés</span>`:''}</div>
    ${CS.sav[a.num]?`<div class="c2-save"><input class="f" data-c2="snom" maxlength="40" placeholder="Nom de la sélection (ex. Installations)" aria-label="Nom de la sélection"><button class="btn sm primary" data-act="af" data-v="dxc2savok|">💾 Garder</button><button class="btn sm" data-act="af" data-v="dxc2save|0">Annuler</button></div>`:''}`;
  const dn=ln?dnOfDes(ln.des):null;const sugg=dn&&!ro?CP.list.filter(c=>c.lab==='DN '+dn&&['soudure','manchons','autoctrl'].includes(c.p)):[];
  const flt=`<div class="c2-flt"><input class="f" data-dx="cf" placeholder="Filtrer (DN 100, épreuve, itopo…)" value="${esc(X.XS.cfilter)}" aria-label="Filtrer les cases du calculateur">${sugg.length?`<button class="btn sm" data-act="af" data-v="dxsugg|${dn}" title="DN ${dn} lu dans la désignation : coche ses soudures, ses manchons et son autocontrôle (quantités pour cette ligne)">☑ DN ${dn} : soud. + manch. + autocontrôle</button>`:''}</div>`;
  if(docOK())queueMicrotask(fitTop);
  return `<div class="dx-panel dx-calc c2-calc" id="dx-calc">${h4}${REP.calcHead(a,M,canEdit)}${top}${warn}${REP.calcParts(a,CP,lk)}${tools}${flt}<div class="dx-cl" id="dx-cl">${listHTML(a,M,CP,C,AV,ro)}</div></div>`;}
/* les titres de zone se collent juste sous l'en-tête (sa hauteur varie : ligne longue, quantité à écrire…) */
let ROT=null;function fitTop(){const k=document.getElementById('dx-calc'),t=k&&k.querySelector('.c2-top');if(!t)return;const set=()=>{const c=t.closest('#dx-calc');if(c)c.style.setProperty('--c2t',(t.offsetHeight-1)+'px');};set();
  if(typeof ResizeObserver!=='undefined'){if(!ROT)ROT=new ResizeObserver(es=>es.forEach(e=>{const c=e.target.closest('#dx-calc');if(c)c.style.setProperty('--c2t',(e.target.offsetHeight-1)+'px');}));ROT.disconnect();ROT.observe(t);}}
/* la liste à plat : titres de zone ; dans chaque zone ce qui reste à pointer, puis ce qui est tout pointé (barré, grisé, non cochable) */
function listHTML(a,M,CP,C,AV,ro){const f=normF(X.XS.cfilter).trim();const fw=f?f.split(/\s+/):[];const hit=s=>!fw.length||fw.every(w=>normF(s).includes(w));
  const groups=calcGroups(CP); /* 16/10 après-midi (lot C3) : 🏗 Installations en tête, les zones, ✔ Autocontrôles ; groupes repliables (dpgfsuivi.js) */
  const subRow=(c,o,x,u,pOn)=>{const k=c.k,t=x.t;const sOn=!pOn&&!!(C.sub[k]&&C.sub[k][t]!==undefined);const av=typeRest(o,u,t,pOn?{}:mineOf(C,c,k));const xq=sOn?X.parseQ(C.sub[k][t],c):0;const lft=av-xq;const amtT=c.amtV*x.min/o.m;const perM=o.K>0?amtT/o.K:0;const sDone=!pOn&&!sOn&&av<=1e-6;
    const by=u?[...new Set((u.byT[t]||[]).concat(u.by))]:[];
    return `<div class="c2-sub${sOn?' on':''}${sOn&&lft<-1e-6?' over':''}${sDone?' c2-done':''}${pOn?' c2-inc':''}" data-k="${esc(k)}" data-t="${esc(t)}"><input type="checkbox" data-c2="sk" data-k="${esc(k)}" data-t="${esc(t)}" ${sOn?'checked':''} ${ro||pOn||sDone?'disabled':''} aria-label="${esc(x.lab+' · DN '+c.dn)}"><span class="c2-nm">${esc(x.lab)} · DN ${c.dn}<small> · ${fq(o.K)} manch. × ${nb(x.min,x.min%1?1:0)} min = ${dur(o.K*x.min)} · ${eur(amtT)} · ${nb(perM,2)} € / manch.${!sDone&&!pOn&&!sOn&&av<o.K-1e-6?` · <b class="c2-rs">reste ${fq(av)} manch.</b>`:''}</small></span>
      ${sOn?`<div class="dx-cq">prendre <input inputmode="decimal" data-c2="sq" data-k="${esc(k)}" data-t="${esc(t)}" value="${esc(C.sub[k][t])}" ${ro?'disabled':''} aria-label="${esc('Manchons pris : '+x.lab)}"> manch.${perMl(c)?` ≈ <input inputmode="decimal" data-c2="sml" data-k="${esc(k)}" data-t="${esc(t)}" value="${esc(fin1(toMl(c,xq)))}" ${ro?'disabled':''} aria-label="${esc('En ml : '+x.lab)}"> ml`:''} = <b data-c2amt="${esc(k+'#'+t)}">${eur(xq*x.min/o.m*c.puV,2)}</b> <span class="dx-rst">${lft<-1e-6?'⚠ dépasse de '+fq(-lft):Math.abs(lft)<1e-6?'✓ tout pointé':'reste '+fq(lft)+' manch.'}</span></div>`:''}${pOn?'<div class="c2-dn">compris : l\'autocontrôle du DN est coché en entier</div>':''}${sDone?`<div class="c2-dn">✓ tout pointé${by.length?' · ligne'+(by.length>1?'s':'')+' '+esc(lst(by,AV.U.rowOf)):''}</div>`:''}</div>`;};
  const rowOf=(c,o,ts)=>{const k=c.k;const on=C.chk[k]!==undefined;const u=AV.U.get(k);const used=u?u.q:0;const rest=c.qty-used;const subOn=!on&&!!o&&!!C.sub[k]&&Object.keys(C.sub[k]).some(t=>o.ts.some(x=>x.t===t));
    const tR=o?o.ts.map(x=>typeRest(o,u,x.t,{})):[];const gone=rest<=1e-6*Math.max(1,c.qty)||(tR.length>0&&tR.every(r=>r<=1e-6));const done=!on&&!subOn&&gone;const qq=on?X.parseQ(C.chk[k],c):0;const left=rest-qq;const byAll=u?[...new Set(u.by.concat(...Object.values(u.byT)))]:[];
    const det=`${fq(c.qty)} ${esc(c.u)}${REP.mlQ(c,c.qty)} · ${nb(c.puV,2)} € / ${esc(c.u)}${REP.mlPu(c)}${!done&&!on&&used>1e-9&&rest>1e-6?` · <b class="c2-rs">reste ${fq(rest)} ${esc(c.u)}${REP.mlQ(c,rest)}</b>`:''}`;
    let h=`<div class="dx-cr c2-r${on?' on':''}${on&&left<-1e-6?' over':''}${on&&Math.abs(left)<1e-6?' full':''}${done?' c2-done':''}" data-k="${esc(k)}"><input type="checkbox" data-dx="ck" data-k="${esc(k)}" ${on?'checked':''} ${ro||done?'disabled':''} aria-label="${esc(X.compName(c))}"><span class="c2-nm">${esc(X.compName(c))}<small>${det}</small></span><span class="m">${eur(c.amtV)}</span>
      ${on?`<div class="dx-cq">prendre <input inputmode="decimal" data-dx="cq" data-k="${esc(k)}" value="${esc(C.chk[k])}" ${ro?'disabled':''}> ${esc(c.u)}${REP.mlTake(c,C,ro)} = <b data-amt="${esc(k)}">${eur(qq*c.puV,2)}</b> <span class="dx-rst">${left<-1e-6?'⚠ dépasse de '+fq(-left):Math.abs(left)<1e-6?'✓ tout pointé':'reste '+fq(left)+' '+esc(c.u)+REP.mlQ(c,left)}</span></div>`:''}${done?`<div class="c2-dn">✓ tout pointé${byAll.length?' · ligne'+(byAll.length>1?'s':'')+' '+esc(lst(byAll,AV.U.rowOf)):''}</div>`:''}</div>`;
    if(o&&ts.length)h+=`<div class="c2-subs${done?' c2-done':''}" data-k="${esc(k)}">${ts.map(x=>subRow(c,o,x,u,on)).join('')}</div>`;
    return {h,done,on:on||subOn};};
  return groups.map(g=>{const rows=[];g.list.forEach(c=>{const o=ctrlOf(CP,c);const base=g.nom+' '+(c.zn||'')+' '+X.compName(c);const mine=hit(base);const tH=o?o.ts.filter(x=>hit(base+' '+x.lab)):[];if(!mine&&!tH.length)return;rows.push(rowOf(c,o,mine&&o?o.ts:tH));});if(!rows.length)return '';
    const nOn=rows.filter(r=>r.on).length,nD=rows.filter(r=>r.done).length;
    return grpHTML(g,rows,nOn,nD,fw.length>0,CP);}).join('')||'<div class="eq-s" style="padding:8px">Rien ne correspond au filtre.</div>';} /* 16/10 après-midi (lot C3) : en-tête qui replie, lignes rangées (dpgfsuivi.js) */
/* Σ, PU et les boutons (redessiné seul pendant la frappe) */
export function resHTML(a,t,C,amt,q,pu,lk,ro){const ok=nChecked(C)>0&&q>0;
  return `<span class="c2-sum">Σ <b>${eur(amt,2)}</b> ÷ ${q>0?fq(q)+' '+esc(t.u||''):'<b style="color:#b91c1c">quantité ?</b>'}</span><span class="c2-pu">= <b class="pu">${q>0?nb(r2(pu),2)+' €':'—'}</b>${t.u?' / '+esc(t.u):''}</span>${ro?'':`<span class="c2-acts"><button class="btn sm" data-act="af" data-v="dxput|" ${ok?'':'disabled'} title="Écrire ce PU dans ${esc(t.a)} et relier la ligne à notre chiffrage">↦ Mettre dans ${esc(t.a)}</button>${t.line?`<button class="btn sm primary" data-act="af" data-v="dxc2next|" ${ok?'':'disabled'} title="Écrire ce PU dans ${esc(t.a)}, puis ouvrir la ligne suivante du DPGF (Ctrl+Entrée)">↦ Mettre et ligne suivante ▶</button>`:''}</span>`}`;}
/* ═════════ 4 · METTRE LE PRIX (aussi par type), LIGNE SUIVANTE ═════════ */
function put(a,M){const CP=X.compsOf(a);const T=X.calcTarget(a,M);if(!CP||!T)return null;const C=stateOf(a,M,T);const q=X.parseQ(C.q,{qty:0});if(!(q>0)){X.say('Indique la quantité de la ligne');return null;}const r3=x=>Math.round(x*1000)/1000;
  const comps=Object.keys(C.chk).map(k=>{const c=CP.by.get(k);return c?{k,q:r3(X.parseQ(C.chk[k],c))}:null;}).filter(x=>x&&x.q>0);
  Object.keys(C.sub).forEach(k=>{if(C.chk[k]!==undefined)return;const c=CP.by.get(k);if(!c)return;Object.keys(C.sub[k]).forEach(t=>{const x=r3(X.parseQ(C.sub[k][t],c));const r=ratioOf(CP,k,t);if(x>0&&r>0)comps.push({k,q:x*r,sub:t,x});});});
  const old=X.linkAt(a,T.sh,T.a);const all=comps.concat(REP.keepParts(old,CP));if(!all.length){X.say('Coche au moins une case');return null;}
  const amt=all.reduce((s,x)=>s+x.q*CP.by.get(x.k).puV,0);const pu=r2(amt/q);const p=parseAddr(T.a);const vals=[{sh:T.sh,r:p.r,c:p.c,e:{v:pu}}];const qc=T.qa?X.qOfCell(M,T.sh,T.qa):null;let qfix=false;
  if(T.qa&&(qc===null||Math.abs(qc-q)>1e-9)){if(C.wq){const pq=parseAddr(T.qa);vals.push({sh:T.sh,r:pq.r,c:pq.c,e:{v:q}});}else qfix=true;}
  const D=a.dpgf||{};const H=X.H();const L={id:old?old.id:'L'+Date.now().toString(36)+Math.random().toString(36).slice(2,5),sh:T.sh,a:T.a,qa:T.qa||null,q,qfix,u:T.u||'',comps:all,pu,amt:r2(amt),v:CP.v,at:new Date().toISOString(),by:H&&H.A&&H.A.userName?H.A.userName():'',col:old?old.col:X.nextCol(D)};
  X.dxWrite(a,vals,{liens:LL=>old?LL.map(x=>x.id===old.id?L:x):LL.concat([L])});X.XS.calc[a.num]=null;CS.last[a.num]=L.id;
  X.say((old?'Prix mis à jour':'Prix lié')+' : '+nb(pu,2)+' € dans '+T.a+' ('+all.length+' case'+(all.length>1?'s':'')+', '+eur(amt)+')');return L;}
const linesSorted=a=>((a.dpgf||{}).lignes||[]).filter(l=>!l.section&&l.row).slice().sort((x,y)=>x.row-y.row);
function stepLine(a,r,dir){const L=linesSorted(a);return dir>0?L.find(l=>l.row>r)||null:L.slice().reverse().find(l=>l.row<r)||null;}
/* aller sur une ligne de prix : la cellule PU sélectionnée (calculateur dessus), la grille (ici ou sur l'autre écran) défile jusqu'à elle */
function goLine(a,M,l){const D=a.dpgf||{};const S=X.dpSheet(M,D);const c=X.puColOf(D);const XS=X.XS;XS.sh[a.num]=S.name;XS.sel[a.num]={sh:S.name,r:l.row,c,r2:l.row,c2:c};XS.calc[a.num]=null;if(XS.free&&XS.free.num===a.num)XS.free=null;CS.sav[a.num]=false;X.rerender();
  setTimeout(()=>{const a2=X.affOf(a.num);const M2=a2&&X.modelOf(a2);const S2=M2&&M2.S(S.name);if(!S2)return;[XS.view,X.popLive()?XS.pview:null].forEach(V=>{if(V&&V.vp&&V.cnt&&V.num===a.num&&V.doc.contains(V.vp)&&up(V.sh)===up(S2.name))try{X.scrollToCell(V,M2,S2,l.row,c);}catch(e){console.warn(e);}});
    const k=document.getElementById('dx-calc');if(k){k.classList.remove('rp-flash');void k.offsetWidth;k.classList.add('rp-flash');setTimeout(()=>k.classList.remove('rp-flash'),1300);}},60);}
/* ═════════ 5 · ACTIONS (avant celles de dpgfxl.js : true = traitée) ═════════ */
export function act(k,arg,arg2,a,canEdit,M){const num=a.num;
  switch(k){
    case 'dxput':{if(!canEdit||!M)return true;if(put(a,M))X.rerender();return true;}
    case 'dxc2next':{if(!canEdit||!M)return true;const T=X.calcTarget(a,M);if(!T||!put(a,M))return true;const a2=X.affOf(num);const M2=a2&&X.modelOf(a2);const nx=M2?stepLine(a2,T.r,1):null;if(nx){goLine(a2,M2,nx);X.say('↦ Prix mis dans '+T.a+' — ligne suivante : '+(nx.n||'ligne '+nx.row));}else{X.say('↦ Prix mis dans '+T.a+' : c\'était la dernière ligne du DPGF');X.rerender();}return true;}
    case 'dxc2go':{if(!M)return true;const T=X.calcTarget(a,M);const s=X.XS.sel[num];const nx=stepLine(a,T?T.r:(s?s.r:0),+arg>0?1:-1);if(nx)goLine(a,M,nx);else X.say(+arg>0?'C\'est la dernière ligne du DPGF':'C\'est la première ligne du DPGF');return true;}
    case 'dxc2like':{if(!canEdit||!M)return true;const CP=X.compsOf(a);const T=X.calcTarget(a,M);const L=((a.dpgf||{}).liens||[]).find(x=>x.id===arg);if(!CP||!T||!L)return true;
      /* la ligne copiée parle d'un DN (« … DN 100 … ») et celle-ci d'un autre (« … DN 80 … ») : ses soudures, manchons, autocontrôles du DN suivent (même zone) */
      const p=parseAddr(L.a||'');const lS=p?((a.dpgf||{}).lignes||[]).find(x=>!x.section&&x.row===p.r):null;const dS=dnOfDes(lS&&lS.des),dT=dnOfDes(T.line&&T.line.des);let nod=0;
      const map=key=>{if(!dS||!dT||dS===dT)return key;const i=key.indexOf('#');const m=/^(z\d+|z:[^|]+)\|(soudure|manchons|autoctrl)\|dn(\d+)$/.exec(i<0?key:key.slice(0,i)); /* 16/10 (lot C3) : aussi « z:<id de zone> » */if(!m||+m[3]!==dS)return key;const k2=m[1]+'|'+m[2]+'|dn'+dT;if(!CP.by.has(k2)){nod++;return null;}return k2+(i<0?'':key.slice(i));};
      const R=pick(a,M,CP,T,ckeys(CP,(L.comps||[]).filter(x=>!x.rep).map(x=>x.sub?x.k+'#'+x.sub:x.k)).map(map).filter(Boolean));
      X.say('↺ Comme la ligne '+labOfLink(a,M)(L)+(dS&&dT&&dS!==dT?' (DN '+dS+' → DN '+dT+')':'')+' : '+pickMsg(R)+(nod?' · '+nod+' sans DN '+dT+' dans sa zone':'')+(R.n?' — quantités pour cette ligne':''));X.refreshSide(a);return true;}
    case 'dxc2sel':{if(!canEdit||!M)return true;const CP=X.compsOf(a);const T=X.calcTarget(a,M);const S=((a.dpgf||{}).sels||[]).find(x=>x.id===arg);if(!CP||!T||!S)return true;const R=pick(a,M,CP,T,S.ks||[]);X.say('« '+S.nom+' » : '+pickMsg(R));X.refreshSide(a);return true;}
    case 'dxc2seldel':{if(!canEdit)return true;const D=Object.assign({},a.dpgf||{});const S=(D.sels||[]).find(x=>x.id===arg);if(!S)return true;if(!confirm('Supprimer la sélection « '+S.nom+' » ? (les prix déjà mis ne changent pas)'))return true;
      const L=(D.sels||[]).filter(x=>x.id!==arg);if(L.length)D.sels=L;else delete D.sels;X.H().affSet(num,{dpgf:D});X.say('Sélection « '+S.nom+' » supprimée');X.rerender();return true;}
    case 'dxc2save':{if(!canEdit)return true;CS.sav[num]=arg==='1';X.refreshSide(a);if(CS.sav[num])setTimeout(()=>{const i=document.querySelector('#dx-calc [data-c2="snom"]');if(i)try{i.focus();}catch(e){}},30);return true;}
    case 'dxc2savok':{if(!canEdit||!M)return true;const T=X.calcTarget(a,M);if(!T)return true;const C=stateOf(a,M,T);const ks=selKeys(C);if(!ks.length){X.say('Coche d\'abord les cases à garder');return true;}const inp=document.querySelector('#dx-calc [data-c2="snom"]');
      const D=Object.assign({},a.dpgf||{});const L=(D.sels||[]).slice();const nom=String(((inp&&inp.value)||'').trim()||('Sélection '+(L.length+1))).slice(0,40);const H=X.H();
      L.push({id:'S'+Date.now().toString(36)+Math.random().toString(36).slice(2,5),nom,ks,at:new Date().toISOString(),by:H&&H.A&&H.A.userName?H.A.userName():''});D.sels=L;H.affSet(num,{dpgf:D});CS.sav[num]=false;
      X.say('💾 « '+nom+' » gardée ('+ks.length+' case'+(ks.length>1?'s':'')+') : sa puce, en haut du calculateur, les recoche sur les autres lignes');X.rerender();return true;}
    case 'dxsugg':{const CP=X.compsOf(a);const T=M&&X.calcTarget(a,M);if(!CP||!T)return true;const R=pick(a,M,CP,T,CP.list.filter(c=>c.lab==='DN '+arg&&['soudure','manchons','autoctrl'].includes(c.p)).map(c=>c.k));if(R.ex.length)X.say('Déjà tout pointé : '+R.ex.slice(0,3).join(', '));X.refreshSide(a);return true;}
    case 'dxcclr':{const T=M&&X.calcTarget(a,M);if(T){const C=stateOf(a,M,T);C.chk={};C.sub={};delete C.mlLast;delete C.mlt;}X.refreshSide(a);return true;}}
  return false;}
/* ═════════ 6 · LA CARTE : en-tête, barre courte (« ⋯ »), autre écran sans grand cadre ═════════ */
export function cardHTML(a,M,canEdit,o){if(!M)return null;css(document);wire();const D=a.dpgf||{};const XS=X.XS;const ro=!canEdit;const pop=!!o.pop;
  if(canEdit&&!a._vview&&!CS.sync[a.num]){const CP=X.compsOf(a);if(CP&&syncSubs(a,CP)){CS.sync[a.num]=1;setTimeout(()=>{CS.sync[a.num]=0;const a2=X.affOf(a.num);const CP2=a2&&X.compsOf(a2);const nl=CP2&&syncSubs(a2,CP2);if(nl&&!a2._vview){X.H().affSet(a.num,{dpgf:Object.assign({},a2.dpgf,{liens:nl})});X.rerender();}},0);}}
  const head=`<div class="dx-head"><h3>📊 DPGF du client <span class="hint">· ${esc(D.fichier||'')}</span></h3><span class="eq-acts" style="margin:0"><button class="btn sm primary" data-act="af" data-v="dxexport|" title="Le fichier du client, seules les cellules changées : sans aucun repère de l'appli">⬇ DPGF pour le dossier</button></span></div>`;
  const more=`<details class="c2-more"><summary class="btn sm" title="Plus d'actions : lignes, affichage, outil détaillé" aria-label="Plus d'actions">⋯</summary><div class="c2-menu">
    ${ro?'':`<div class="c2-mg">Lignes du DPGF</div><button class="btn sm" data-act="af" data-v="dxins|" title="Mêmes formats et formules">＋ Insérer une ligne dessous</button><button class="btn sm" data-act="af" data-v="dxins|up">＋ Insérer une ligne au-dessus</button><button class="btn sm" data-act="af" data-v="dxdel|">− Supprimer la ligne sélectionnée</button>`}
    <div class="c2-mg">Affichage</div><button class="btn sm${o.side&&!pop?' on':''}" data-act="af" data-v="dxlay|side" title="Le DPGF à gauche, le calculateur à droite (grand écran)">◫ Côte à côte</button><button class="btn sm${o.side||pop?'':' on'}" data-act="af" data-v="dxlay|stack" title="Le calculateur s'ouvre à droite de la grille, la ventilation dessous">⬒ Empilé</button><button class="btn sm" data-act="af" data-v="dxfull|">${XS.full?'✕ Quitter le plein écran':'⤢ Plein écran'}</button>
    <div class="c2-mg">Prix</div>${ro?'':`<button class="btn sm" data-act="af" data-v="dxrptool|" title="Choisir les lignes, ce qu'on y met et les quantités, ou un groupe de lignes">⇶ Répartir au ml, en détail…</button>`}<button class="btn sm" data-act="af" data-v="dxpu|">🔎 Détail des prix unitaires</button></div></details>`;
  const bar=`<div class="dx-bar c2-bar">${ro?'':`<button class="btn sm" data-act="af" data-v="dxundo|" title="Annuler (Ctrl+Z)" aria-label="Annuler">↶</button><button class="btn sm" data-act="af" data-v="dxredo|" title="Rétablir (Ctrl+Y)" aria-label="Rétablir">↷</button><span class="sep"></span><button class="btn sm primary" data-act="af" data-v="dxcalc|" title="Calculer le prix de la cellule sélectionnée à partir de notre chiffrage (le calculateur s'ouvre aussi tout seul au clic sur un PU)">🧮 Calculer cette cellule</button>${REP.barBtn(a,canEdit)}<span class="sep"></span>`}<button class="btn sm${pop?' on':''}" data-act="af" data-v="dxpop|" title="Le DPGF dans une fenêtre à glisser sur le 2e écran : ici il ne reste que le calculateur et la ventilation">⧉ Autre écran</button><span class="sep"></span><button class="btn sm" data-act="af" data-v="dxzoom|-1" title="Zoom arrière" aria-label="Zoom arrière">−</button><span class="dx-zv">${Math.round(o.z*100)} %</span><button class="btn sm" data-act="af" data-v="dxzoom|1" title="Zoom avant" aria-label="Zoom avant">+</button>${more}</div>`;
  const popbar=`<div class="c2-popbar" id="c2-popbar"><span class="c2-pt"><b>⧉ DPGF ouvert sur l'autre écran</b> <span class="hint">· touche un PU là-bas, le calcul se fait ici</span></span><button class="btn sm" data-act="af" data-v="dxpopclose|" title="Remettre le DPGF dans cette fenêtre">↩ Ramener ici</button></div>`;
  const hint=`<div class="hint c2-hint">Comme dans Excel : clique une cellule et tape (formules en français, ex. <i>=SOMME(F7:F9)</i>) ; Entrée valide, Échap annule, Ctrl+Z annule ; coin bleu = cellule modifiée.</div>`;
  if(pop)queueMicrotask(fit);
  return `<div class="card dx-card c2-card${XS.full?' full':''}" id="dx-card">${head}${o.top||''}${bar}${pop?popbar:o.fb}<div class="dx-split${pop?' c2-pop':(o.side?' side':'')+REP.splitCls(a)}">${pop?'':o.grid}<div class="dx-side" id="dx-side">${o.sideHTML()}</div></div>${pop?'':hint}${REP.toolHTML(a,M,canEdit)}${o.end||''}</div>`;} /* 16/10 après-midi (lot C3) : o.top = bandeau des changements, o.end = bouton flottant et liste */
/* autre écran : le calculateur collé en haut, aussi haut que la zone qui défile */
function fit(){if(!docOK())return;const sp=document.querySelector('#dx-card .dx-split.c2-pop');if(!sp)return;const sc=sp.closest('.dx-card.full')||document.getElementById('homeBody');const h=sc?sc.clientHeight:(window.innerHeight||800);sp.style.setProperty('--c2h',Math.max(320,h-16)+'px');}
/* ═════════ 7 · LES ANCIENS OUTILS (commerce.js) : un seul pli fermé, tout en bas ═════════ */
export function oldToolsHTML(a,inner,innerOpen){css(document);wire();const open=innerOpen||!!(X&&X.XS.det[a.num+'|old']);
  return `<details class="c2-old" data-c2old="1"${open?' open':''}><summary>🗄 Anciens outils (avant le DPGF comme dans Excel) <span class="hint">· bordereau simplifié, atelier</span></summary><div class="hint c2-oldh">Avant la grille « comme dans Excel », on remplissait le DPGF ici : le <b>bordereau simplifié</b> (répartir le prix de vente sur les lignes, arrondir à l'euro, CSV) et l'<b>atelier</b> (prix composés, coûts à placer ligne par ligne). Ils restent là, tels quels ; le calculateur au-dessus fait la même chose, en plus simple.</div>${inner}</details>`;}
/* ═════════ 8 · SAISIES (types d'autocontrôle, ml proposés, sélections), menu « ⋯ » ═════════ */
let WIRED=false;
function cur(){const num=X&&X.XS.num;const a=num&&X.affOf(num);const M=a&&X.modelOf(a);const CP=a&&X.compsOf(a);const T=M&&X.calcTarget(a,M);return a&&M&&CP&&T?{a,M,CP,T,C:stateOf(a,M,T)}:null;}
function liveRes(o){const q=X.parseQ(o.C.q,{qty:0});const amt=X.calcSum(o.a,o.CP,o.C);const res=document.getElementById('dx-cres');if(res)res.innerHTML=resHTML(o.a,o.T,o.C,amt,q,q>0?amt/q:0,X.linkAt(o.a,o.T.sh,o.T.a),!X.XS.canEdit);}
function wire(){if(WIRED||!docOK())return;WIRED=true;
  document.addEventListener('change',e=>{const t=e.target;if(!t||!t.dataset||t.dataset.c2===undefined||!t.closest('#dx-calc'))return;const o=cur();if(!o)return;const {a,M,CP,T,C}=o;const k=t.dataset.k,tt=t.dataset.t;
    if(t.dataset.c2==='sk'){const c=CP.by.get(k);if(!c||!ctrlOf(CP,c))return;if(t.checked){if(C.chk[k]!==undefined)return;const av=availOf(a,CP,M,T,C).restT(k,tt);(C.sub[k]=C.sub[k]||{})[tt]=fin(subTake(c,T,X.parseQ(C.q,{qty:0}),av));}
      else if(C.sub[k]){delete C.sub[k][tt];if(!Object.keys(C.sub[k]).length)delete C.sub[k];}X.refreshSide(a);return;}
    if(t.dataset.c2==='sq'||t.dataset.c2==='sml'){X.refreshSide(a);return;}
    if(t.dataset.c2==='like'&&t.value){act('dxc2like',t.value,undefined,a,!!X.XS.canEdit,M);return;}});
  document.addEventListener('input',e=>{const t=e.target;if(!t||!t.dataset||!t.closest||!t.closest('#dx-calc'))return;const d=t.dataset;if(d.c2===undefined&&d.rp!=='cqml'&&d.dx!=='cq')return;const o=cur();if(!o)return;const {CP,C}=o;
    const rec=v=>{const m=numIn(v);if(m!==null&&m>0)C.mlLast=m;}; /* les ml tapés une fois : proposés pour la suite (dpgfrep.js mlDef) */
    if(d.rp==='cqml'){rec(t.value);return;}if(d.dx==='cq'){const c=CP.by.get(d.k);if(c&&c.u==='ml')rec(t.value);return;}
    if(d.c2==='sq'||d.c2==='sml'){const k=d.k,tt=d.t;const c=CP.by.get(k);if(!c||!C.sub[k])return;const row=t.closest('.c2-sub');
      if(d.c2==='sq'){C.sub[k][tt]=t.value;const mi=row&&row.querySelector('[data-c2="sml"]');if(mi&&perMl(c))mi.value=fin1(toMl(c,X.parseQ(t.value,c)));}
      else{const m=numIn(t.value);rec(t.value);C.sub[k][tt]=m===null?'':fin(fromMl(c,m));const qi=row&&row.querySelector('[data-c2="sq"]');if(qi)qi.value=C.sub[k][tt];}
      const b=row&&row.querySelector('b[data-c2amt]');if(b)b.textContent=eur(X.parseQ(C.sub[k][tt],c)*ratioOf(CP,k,tt)*c.puV,2);liveRes(o);}});
  document.addEventListener('keydown',e=>{const t=e.target;if(!t||!t.dataset||t.dataset.c2!=='snom')return;if(e.key==='Enter'){e.preventDefault();const b=document.querySelector('#dx-calc [data-v="dxc2savok|"]');if(b)b.click();}else if(e.key==='Escape'){e.preventDefault();e.stopPropagation();const b=document.querySelector('#dx-calc [data-v="dxc2save|0"]');if(b)b.click();}},true);
  /* Ctrl+Entrée dans le calculateur = « ↦ Mettre et ligne suivante ▶ » (sinon « ↦ Mettre ») */
  document.addEventListener('keydown',e=>{if(e.key!=='Enter'||!(e.ctrlKey||e.metaKey))return;const t=e.target;if(!t||!t.closest||!t.closest('#dx-calc'))return;const b=document.querySelector('#dx-calc [data-v="dxc2next|"]:not([disabled])')||document.querySelector('#dx-calc [data-v="dxput|"]:not([disabled])');if(b){e.preventDefault();b.click();}});
  document.addEventListener('toggle',e=>{const d=e.target;if(!d||!d.dataset||d.dataset.c2old===undefined||!X)return;const num=X.XS.num;if(num)X.XS.det[num+'|old']=d.open;},true);
  /* menu « ⋯ » : se ferme au clic ailleurs (et après une action) */
  document.addEventListener('click',e=>{const m=e.target&&e.target.closest?e.target.closest('.c2-more'):null;document.querySelectorAll('details.c2-more[open]').forEach(d=>{if(d!==m||(e.target.closest&&e.target.closest('.c2-menu [data-act]')))d.open=false;});},true);
  window.addEventListener('resize',()=>{clearTimeout(wire.t);wire.t=setTimeout(fit,150);});}
/* ═════════ 9 · CSS (injectée : <style id="css-lot-c2">) ═════════ */
const CSS=`
.c2-bar{gap:4px}.c2-more{position:relative;display:inline-flex}.c2-more>summary{list-style:none;cursor:pointer;min-width:40px;font-weight:700;letter-spacing:.06em}.c2-more>summary::-webkit-details-marker{display:none}.c2-more[open]>summary{background:#eef2f0}
.c2-menu{position:absolute;right:0;top:calc(100% + 4px);z-index:45;background:#fff;border:1px solid var(--line,#ddd);border-radius:10px;box-shadow:0 12px 32px rgba(0,0,0,.2);padding:6px;display:flex;flex-direction:column;gap:2px;min-width:260px;max-width:calc(100vw - 32px)}
.c2-menu .btn{justify-content:flex-start;text-align:left;border-color:transparent;background:transparent;white-space:nowrap}.c2-menu .btn:hover{background:#f3f4f6}.c2-menu .btn.on{background:#e8f1ec;font-weight:700}
.c2-mg{font-size:11px;text-transform:uppercase;letter-spacing:.04em;color:#6b7280;padding:6px 8px 2px}
.c2-popbar{display:flex;align-items:center;justify-content:space-between;gap:4px 10px;flex-wrap:wrap;border:1px solid #b9d3c3;background:#f1f8f4;border-radius:8px;padding:3px 4px 3px 10px;margin:0 0 8px;font-size:13px;min-height:42px}.c2-pt{min-width:0}
.eq-app .c2-popbar .btn.sm{min-height:34px}
.c2-hint{margin-top:6px;font-size:11.5px}
.dx-split.c2-pop{grid-template-columns:minmax(0,1fr)}.dx-split.c2-pop>.dx-side{display:grid;grid-template-columns:minmax(0,1fr);gap:10px;align-items:start;max-height:none;overflow:visible}
@container (min-width:900px){.dx-split.c2-pop>.dx-side{grid-template-columns:minmax(400px,1fr) minmax(0,1.1fr)}.dx-split.c2-pop>.dx-side>.dx-calc{grid-column:1;grid-row:1/span 4;position:sticky;top:6px;max-height:var(--c2h,calc(100vh - 24px));display:flex;flex-direction:column;overflow:auto}
  .dx-split.c2-pop>.dx-side>:not(.dx-calc){grid-column:2;min-width:0}.dx-split.c2-pop .dx-calc>*{flex:none}}
.c2-calc .c2-top{position:sticky;top:0;z-index:4;background:var(--surface,#fff);margin:0 -10px 6px;padding:5px 10px 6px;border-top:1px solid #e5e7eb;border-bottom:1px solid #e5e7eb;box-shadow:0 -12px 0 0 var(--surface,#fff),0 6px 10px -8px rgba(0,0,0,.25)}
.c2-ln{display:flex;align-items:center;gap:4px 8px;flex-wrap:wrap}.c2-nav{display:inline-flex;gap:2px;flex:none}.eq-app .c2-nav .btn.sm{min-height:34px;min-width:34px;padding:0 6px}
.c2-lt{flex:1 1 180px;min-width:0;font-size:13px;line-height:1.3;display:-webkit-box;-webkit-line-clamp:2;-webkit-box-orient:vertical;overflow:hidden}.c2-n{color:#14532d}
.c2-q{display:inline-flex;align-items:center;gap:4px;font-size:12.5px;white-space:nowrap;flex:none;margin:0}.eq-app .c2-ln .c2-shut{min-width:34px;min-height:34px;padding:0 8px;flex:none}.eq-app .c2-q input{width:84px;min-height:34px;padding:2px 6px}
.c2-wq{display:flex;align-items:center;gap:6px;font-size:12px;margin:4px 0 0;min-height:34px}.eq-app .c2-wq input{width:18px;height:18px;min-height:0;margin:0}
.c2-calc .dx-res{margin:5px 0 0;padding:4px 8px;gap:3px 10px}.c2-calc .dx-res b.pu{font-size:17px}.c2-acts{display:flex;flex-wrap:wrap;gap:4px;margin-left:auto}
.eq-app #dx-calc .c2-acts .btn.sm{min-height:40px;font-size:13px;font-weight:700;padding:0 12px}.c2-acts .btn[disabled]{opacity:.45}
.c2-tools{display:flex;flex-wrap:wrap;gap:4px 6px;align-items:center;margin:0 0 6px}.eq-app .c2-tools .btn.sm,.eq-app .c2-tools select{min-height:34px}.c2-like{max-width:170px;min-width:0;font-size:12.5px;padding:0 6px}
.c2-unl{color:#9b2c22}.c2-mlh{font-size:12px;color:#14532d;background:#eef6f1;border-radius:999px;padding:3px 9px;white-space:nowrap}
.c2-chip{display:inline-flex;align-items:stretch;border:1px solid #c9d8cf;border-radius:999px;overflow:hidden;background:#fff;max-width:100%}.c2-chip.ok{border-color:#86b89a;background:#eef6f1}.c2-chip.miss{border-color:#eab308;background:#fff8e6}
.c2-chip .c2-cb{border:0;background:transparent;padding:0 10px;font-size:12.5px;cursor:pointer;text-align:left;min-width:0;overflow:hidden;text-overflow:ellipsis;white-space:nowrap}.c2-chip.ok .c2-cb{color:#14532d;font-weight:700}.c2-chip.miss .c2-cb{color:#7a4b00}
.c2-chip .c2-cx{border:0;border-left:1px solid rgba(0,0,0,.12);background:transparent;padding:0 9px;cursor:pointer;color:#9b2c22;flex:none}.eq-app .c2-chip button{min-height:34px}
.c2-save{display:flex;gap:4px;flex-wrap:wrap;margin:0 0 6px}.c2-save input{flex:1 1 200px;min-width:0}.eq-app .c2-save input{min-height:36px}.eq-app .c2-save .btn.sm{min-height:36px}
.c2-flt{display:flex;gap:4px 6px;flex-wrap:wrap;align-items:center;margin:0 0 6px}.c2-flt input{flex:1 1 140px;min-width:0;margin:0}.eq-app .c2-flt input{min-height:36px}.eq-app .c2-flt .btn.sm{min-height:36px}
#dx-calc.c2-calc #dx-cl{max-height:none;min-height:0;overflow:visible;flex:none;background:#fff}
.c2-zh{position:sticky;top:var(--c2t,0px);z-index:2;background:#f3f5f3;padding:5px 8px;font-weight:700;font-size:12.5px;border-bottom:1px solid #e3e6e3;border-top:1px solid #e3e6e3}.c2-zh small{font-weight:400;color:#666}
.c2-r{border-top:1px solid #f1f1f1}.c2-r .c2-nm{min-width:0}.c2-r .c2-nm small{display:block;color:#666;font-size:11.5px;line-height:1.35}.c2-rs{color:#14532d;font-weight:700}
.c2-done{background:#f6f6f4}.c2-done>.c2-nm,.c2-done>.m{color:#9ca3af;text-decoration:line-through}.c2-done>.c2-nm small,.c2-done>.c2-nm small *{color:#a3a3a3}
.c2-dn{grid-column:2/-1;font-size:11.5px;color:#3f7a54;text-decoration:none}
.c2-subs{margin:0 0 2px 30px;border-left:2px solid #dbe4dd}.c2-sub{display:grid;grid-template-columns:28px minmax(0,1fr);gap:1px 6px;align-items:center;padding:2px 8px 2px 4px;font-size:12px}
.c2-sub .c2-nm{min-width:0}.c2-sub .c2-nm small{color:#666;font-size:11.5px}.c2-sub.on{background:#eef6f1}.c2-sub .dx-cq{grid-column:2;display:flex;gap:6px;align-items:center;flex-wrap:wrap;color:#555;font-size:12px}
.eq-app .c2-sub input[type=checkbox]{width:18px;height:18px;min-height:0;margin:0 auto}.eq-app .c2-sub .dx-cq input{width:80px;min-height:32px;padding:2px 6px}.c2-sub.over .dx-rst{color:#b91c1c;font-weight:700}
.c2-sub.c2-done>.c2-nm{color:#9ca3af;text-decoration:line-through}.c2-sub.c2-inc{opacity:.6}.c2-sub .c2-dn{grid-column:2}
.c2-old{margin:10px 0}.c2-old>summary{cursor:pointer;font-weight:700;font-size:13px;padding:8px 10px;border:1px dashed var(--line,#ccc);border-radius:10px;background:var(--surface,#fff);min-height:40px;display:flex;align-items:center;gap:6px;flex-wrap:wrap;color:#555}.c2-old>summary .hint{font-weight:400}.c2-old[open]>summary{margin-bottom:8px}
.c2-oldh{margin:0 0 8px;font-size:12.5px}
.c2r-p{margin:8px 0;line-height:1.5;font-size:13.5px}.c2r-dns{display:flex;flex-direction:column;gap:4px;margin:10px 0;padding:8px 12px;background:#f6faf7;border:1px solid #cfe3d6;border-radius:8px;font-size:13.5px}
@media (min-width:701px){.rp-dlg.c2r-dlg{height:auto;width:min(760px,100%)}}
.eq-app .c2-calc .dx-cq input{min-height:34px}
@media (max-width:700px){.c2-acts{width:100%}.c2-acts .btn{flex:1 1 auto}.c2-like{max-width:100%;flex:1 1 160px}.c2-lt{flex-basis:100%;order:-1}.c2-hint{display:none}
  .c2-menu{position:fixed;left:12px;right:12px;top:auto;bottom:12px;min-width:0;max-width:none;max-height:72vh;overflow:auto;z-index:80}.c2-menu .btn{white-space:normal}}
`;
export function css(doc){doc=doc||(docOK()?document:null);if(!doc||doc.getElementById('css-lot-c2'))return;const s=doc.createElement('style');s.id='css-lot-c2';s.textContent=CSS;doc.head.appendChild(s);}
