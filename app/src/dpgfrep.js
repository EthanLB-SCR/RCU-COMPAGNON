// dpgfrep.js — LOT R (15/10) : le DPGF « comme dans Excel », suite. Ethan (15/10) : « Les soudures peuvent être à décompter via les ml qu'elles représentent aussi
// et pas forcément en nombre de soudures directement, si on se cale sur le DPGF qui va parler majoritairement de prix au ml […] souvent on répartit au ml : on
// calcule le prix au ml avec les quantités souhaitées et tous les DN50 du tableau, peu importe l'antenne, sont au même prix au ml […] « calculer cette cellule »
// pour ouvrir le menu de cochage etc. est trop discret, il faudrait limite que ça s'ouvre directement […] on remplit ce qui est un peu unitaire ou qui a clairement
// sa ligne dans le DPGF, on coche les prix qu'on a remplis, puis le reste est ventilé au prix en ml pour la ligne soudure ou on vient mettre ce qui n'a pas trouvé
// de place […] ça ne doit pas casser ce que tu as fait, les liens et tout ».
// · le calculateur S'OUVRE AU CLIC sur le PU (ou le montant) d'une ligne, ou sur n'importe quelle cellule d'une ligne déjà liée : mise en page empilée → volet
//   à droite de la grille (téléphone : volet en bas), sans défiler ; côte à côte → le panneau de droite remonte sur lui et clignote ; ailleurs une pastille
//   « 🧮 Calculer » près de la cellule ; réglage « s'ouvre au clic » mémorisé sur l'appareil ; mini-récap de l'avancement (pointé %, reste à placer) ;
// · composantes « par DN » (soudures, manchons, autocontrôle) : c.ml = linéaire du DN dans la zone (lignes DN du chiffrage), c.dn → « 20 soud. ≈ 240 ml »,
//   € / ml ; la quantité gardée dans un lien reste en soudures (manchons) : rien ne change pour les liens existants ;
// · « ⇶ Répartir au ml » : a.dpgf.reps = [{id, nom, sh, lignes:[a…], ks:[k…], mode:'dn'|'grp', com:{mode:'prorata'|'ligne', ligne}, orphan, qs:{k:q},
//   dnOf:{a:dn}, col, v, at, by}] (optionnel : un DPGF sans répartition n'a pas ce champ) ; les parts vivent DANS les liens : comps [{k, q, rep:id}] ; un lien
//   créé par une répartition porte rep:id et prev:{e} (la saisie d'avant de sa cellule PU) : vidé de ses parts, il disparaît et la cellule redevient ce qu'elle
//   était ; on ne prend que le RESTE (quantité − pointé), jamais rien à un lien existant (sauf ses propres parts quand on la refait / défait) ; un seul pas
//   d'annulation (↶ du DPGF) par application. Tout ce que dpgfxl.js prête passe par init() (aucun import circulaire).
import {addrOf,parseAddr} from './xlcalc.js';
import {canonComps,canonRep,canonCfg} from './dpgfsuivi.js'; // 16/10 après-midi (lot C3) : clés stables (une répartition refaite ou réécrite y passe)
let X=null;export function init(api){X=api;}
const esc=s=>String(s??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const nb=(x,d)=>{x=+x||0;return x.toLocaleString('fr-FR',{maximumFractionDigits:d===undefined?0:d,minimumFractionDigits:d===undefined?0:d});};
const eur=(x,d)=>nb(x,d)+' €';const r2=x=>Math.round((+x||0)*100)/100;const up=s=>String(s||'').toUpperCase();
const fq=x=>nb(x,Math.abs(x-Math.round(x))>1e-9?2:0);const fml=x=>nb(x,Math.abs(x)<10&&Math.abs(x-Math.round(x))>0.05?1:0);
const numIn=s=>{s=String(s??'').trim().replace(/[\s  ]/g,'').replace(',','.');if(!s)return null;const x=parseFloat(s);return isFinite(x)?x:null;};
const fin=x=>String(+(+x).toFixed(3)).replace('.',',');const fin1=x=>String(+(+x).toFixed(1)).replace('.',',');
const RS={flt:{},tool:{},pd:null,chipAt:null};
const LS_AUTO='trace:dpgfxl:calcauto';let AUTO=true;try{AUTO=localStorage.getItem(LS_AUTO)!=='0';}catch(e){}
export function reset(num){delete RS.flt[num];delete RS.tool[num];if(RS.simple)delete RS.simple[num];}
/* ═════════ 1 · COMPOSANTES PAR DN : LEUR LINÉAIRE ═════════ */
const PDN=['soudure','manchons','autoctrl'];
export function withMl(CP){if(!CP||CP._ml)return CP;CP._ml=1;CP.list.forEach(c=>{const m=/\|dn(\d+)$/.exec(c.k);if(c.z<0||!m||!PDN.includes(c.p))return;const e=CP.C&&CP.C.etudes&&CP.C.etudes[c.z];
  const rows=(((e&&e.r&&e.r.detail)||{}).dn||{}).rows||[];const row=rows.find(r=>+r.dn===+m[1]);c.dn=+m[1];c.ml=row?Math.max(0,+row.ml||0):0;});return CP;}
const perMl=c=>!!(c&&c.dn&&c.ml>0&&c.qty>0);const toMl=(c,q)=>q*c.ml/c.qty;const fromMl=(c,m)=>m*c.qty/c.ml;
/* calculateur : « 30 soud. ≈ 200 ml », « 12,75 € / ml », reste en ml, saisie jumelle en ml */
export const mlQ=(c,q)=>perMl(c)?' ≈ '+fml(toMl(c,+q||0))+' ml':'';
export const mlPu=c=>perMl(c)?` · ${nb(c.amtV/c.ml,2)} € / ml`:'';
export const restMl=(c,r)=>perMl(c)&&r>1e-6?' · reste '+fq(r)+' '+esc(c.u)+mlQ(c,r):'';
export function mlTake(c,C,ro){if(!perMl(c))return '';const t=C.mlt&&C.mlt[c.k]!==undefined?C.mlt[c.k]:fin1(toMl(c,X.parseQ(C.chk[c.k],c)));
  return ` ≈ <input inputmode="decimal" data-rp="cqml" data-k="${esc(c.k)}" value="${esc(t)}" ${ro?'disabled':''} aria-label="${esc('En ml : '+c.lab)}" title="Saisir en ml : la quantité de ${esc(c.u)} = ml × ${esc(nb(c.qty/c.ml,4))}"> ml`;}
/* quantité prise d'office quand on coche : ligne au ml + composante par DN → la part de la ligne (ses ml en soudures), sinon comme avant
   16/10 (lot C2, Ethan : « quand je rentre une fois des ml, ça remette les mêmes ml dans tout ce que je coche, mais modifiable ») : les derniers ml tapés pour une
   composante de CETTE ligne (C.mlLast), sinon la quantité de la ligne si elle est au ml, pour tout ce qui se compte au ml ; ligne « à l'unité » (u, pce…) + soudures,
   manchons, vannes, unités → la quantité de la ligne (« Soudure DN 100 · 40 u » → 40 soudures, plus tout le reste) ; toujours limité au reste */
const CNT_C=['soud.','manch.','u','vanne'];
export const isCntU=u=>/^(u|un|unite|unites|nb|nbre|pc|pce|pces|piece|pieces)$/.test(String(u||'').normalize('NFD').replace(/[̀-ͯ]/g,'').toLowerCase().replace(/[\s.]/g,''));
export function mlDef(T,q){const C=X&&X.XS&&X.XS.calc[X.XS.num];return C&&T&&C.key===T.sh+'!'+T.a&&C.mlLast>0?C.mlLast:(q>0&&T&&isMlU(T.u)?q:0);}
export function defTake(c,T,q,rest){const ml=mlDef(T,q);if(ml>0&&perMl(c))return Math.min(rest,fromMl(c,ml));if(ml>0&&c.u==='ml')return Math.min(rest,ml);
  if(q>0&&T&&c.u===String(T.u||'').toLowerCase())return Math.min(rest,q);if(q>0&&T&&isCntU(T.u)&&CNT_C.includes(c.u))return Math.min(rest,q);return rest;}
/* ═════════ 2 · LES LIGNES DU DPGF (unité, DN lu, lien, PU saisi) ═════════ */
export const isMlU=u=>/^(ml|m|mlineaires?|metres?lineaires?)$/.test(String(u||'').normalize('NFD').replace(/[̀-ͯ]/g,'').toLowerCase().replace(/[\s.]/g,''));
const dnOf=t=>{const m=String(t||'').match(/\bDN\s?(\d{2,3})\b/i);return m?+m[1]:null;};
function linesOf(a,M){const D=a.dpgf||{};const S=X.dpSheet(M,D);const pc=X.CO?X.CO.puCol(a,M):X.puColOf(D),qc=X.CO?X.CO.qtyCol(a,M):X.qtyColOf(D); /* 19/10 (lot DY) : la lecture effective des colonnes */const ed=(((D.xl||{}).ed||{})[S.name])||{};const byA=new Map();(D.liens||[]).forEach(x=>{if(up(x.sh)===up(S.name)&&!byA.has(x.a))byA.set(x.a,x);});
  return (X.CO?X.CO.lines(a,M):(D.lignes||[]).filter(l=>!l.section&&l.row)).map(l=>{const ad=l.a||addrOf(l.row,pc);const L=byA.get(ad)||l.L||null; /* (lot DY) DPGF mal lu à l'import : les lignes déduites, et le lien de leur rangée */
    return {row:l.row,a:ad,qa:qc?addrOf(l.row,qc):null,n:l.n||'',des:l.des||'',u:l.u||'',q:+l.qte||0,pu:+l.pu||0,isMl:isMlU(l.u),dnR:dnOf(l.des),L,ed:ed[ad]||null,sh:S.name};});}
/* reste de chaque composante (quantité − pointé par les liens), en laissant de côté les parts d'une répartition (celle qu'on refait) */
function restFn(a,CP,skip){const by=new Map();((a.dpgf||{}).liens||[]).forEach(L=>(L.comps||[]).forEach(x=>{if(skip&&x.rep===skip)return;const c=CP.by.get(x.k);const k=c?c.k:x.k; /* 16/10 (lot C3) : sous la clé stable */by.set(k,(by.get(k)||0)+(+x.q||0));}));
  return k=>{const c=CP.by.get(k);return c?Math.max(0,c.qty-(by.get(k)||0)):0;};}
/* ═════════ 3 · LE CALCULATEUR À CÔTÉ DE LA GRILLE ═════════ */
const docOK=()=>typeof document!=='undefined';
function geo(){const g=document.getElementById('dx-grid'),s=document.getElementById('dx-side'),sp=document.querySelector('#dx-card .dx-split');if(!sp||!s)return null;
  /* volet réellement affiché (la classe peut rester en côte à côte large, où elle ne fait rien) : le panneau est alors « display: contents » */
  const fl=sp.classList.contains('flt')&&getComputedStyle(s).display==='contents';const beside=!fl&&!!g&&s.getBoundingClientRect().left>=g.getBoundingClientRect().right-2;return {g,s,sp,fl,beside};}
function flash(el){if(!el)return;el.classList.remove('rp-flash');void el.offsetWidth;el.classList.add('rp-flash');setTimeout(()=>el.classList.remove('rp-flash'),1300);}
/* ouvrir : côte à côte → le panneau de droite remonte sur le calculateur ; empilé → volet à droite (téléphone : en bas) ; autre écran → le calculateur ici */
export function open(num){if(!docOK())return;const calc=document.getElementById('dx-calc');if(!calc)return;
  if(X.popLive()){try{calc.scrollIntoView({block:'start',behavior:'smooth'});}catch(e){}flash(calc);return;}
  const G=geo();if(!G)return;if(G.beside){const s=G.s;s.scrollTop=Math.max(0,s.scrollTop+calc.getBoundingClientRect().top-s.getBoundingClientRect().top-4);
    /* la page a défilé (le haut du panneau est caché) : on la remonte juste assez pour voir le haut du calculateur, sans perdre la cellule touchée */
    const sc=G.sp.closest('.dx-card.full')||document.getElementById('homeBody');if(sc){const r0=sc.getBoundingClientRect();const ct=calc.getBoundingClientRect().top;if(ct<r0.top+6){const V=X.XS.view,s0=X.XS.sel[num];
      const td=V&&V.num===num&&V.cnt&&s0?V.cnt.querySelector(`td[data-r="${s0.r}"][data-c="${s0.c}"]`):null;const room=td?Math.max(0,r0.bottom-td.getBoundingClientRect().bottom-8):r0.height;const d=Math.min(r0.top+6-ct,room);if(d>0)sc.scrollBy({top:-d,behavior:'smooth'});}}
    flash(calc);return;}
  RS.flt[num]=true;if(!G.fl){G.sp.classList.add('flt');fitFlt();keepSel(num);}flash(document.getElementById('dx-calc'));chip();}
function keepSel(num){const V=X.XS.view;if(!V||!V.vp||V.num!==num)return;const a=X.affOf(num);const M=a&&X.modelOf(a);const S=M&&M.S(V.sh);const s=X.XS.sel[num];if(!S||!s)return;
  try{X.scrollToCell(V,M,S,s.r,s.c);}catch(e){}
  /* téléphone : la cellule ne doit pas finir sous le volet */
  const calc=document.getElementById('dx-calc');const td=V.cnt&&V.cnt.querySelector(`td[data-r="${s.r}"][data-c="${s.c}"]`);if(!calc||!td||getComputedStyle(calc).position!=='fixed')return;
  const hb=document.getElementById('homeBody');const st=hb?hb.getBoundingClientRect().top:0,ht=calc.getBoundingClientRect().top;const r=td.getBoundingClientRect();if(r.top>=st+4&&r.bottom<=ht-4)return;
  const d=Math.round((r.top+r.bottom)/2-(st+ht)/2);if(hb)hb.scrollTop+=d;else window.scrollBy(0,d);}
/* le volet (empilé) suit la partie visible de la grille : collé en haut de la zone qui défile, son bas = le bas de la grille ; grille hors de vue → caché */
export function fitFlt(){if(!docOK())return;const sp=document.querySelector('#dx-card .dx-split.flt');if(!sp)return;const c=document.getElementById('dx-calc'),g=document.getElementById('dx-grid');if(!c||!g)return;
  if(getComputedStyle(c).position!=='sticky'){sp.style.removeProperty('--rph');sp.classList.remove('rplow');return;}
  const gr=g.getBoundingClientRect();const top=Math.max(gr.top,c.getBoundingClientRect().top);const h=Math.floor(gr.bottom-top);sp.style.setProperty('--rph',Math.max(0,h)+'px');sp.classList.toggle('rplow',h<150);}
export function shut(num,dock){RS.flt[num]=false;const sp=document.querySelector('#dx-card .dx-split');if(sp)sp.classList.remove('flt');keepSel(num);chip();
  if(dock){const c=document.getElementById('dx-calc');if(c){try{c.scrollIntoView({block:'start',behavior:'smooth'});}catch(e){}flash(c);}}}
export const splitCls=a=>RS.flt[a.num]?' flt':'';
/* en-tête du calculateur : boutons du volet, mini-récap de l'avancement, réglage */
export function calcHead(a,M,canEdit){css(document);wire();const CP=X.compsOf(a);let rc='';
  if(CP&&M){const P=X.pointage(a,CP,M);const keys=new Set(CP.list.map(c=>(c.z<0?'inst':'z'+c.z)+'|'+c.p));let pt=0;P.byCell.forEach((L,kk)=>{if(keys.has(kk))L.forEach(x=>{pt+=x.amt;});});const V=CP.C.vente||0;const rest=V-pt;
    rc=`<span class="rp-rc">pointé <b>${nb(V>0?pt/V*100:0,0)} %</b> · ${Math.abs(rest)<1?'<b style="color:#15803d">✓ tout est placé</b>':rest>0?'reste à placer <b>'+eur(rest)+'</b>':'<b style="color:#b91c1c">⚠ pointé au-delà de '+eur(-rest)+'</b>'}</span>`;}
  return `<div class="rp-fo rp-fbar"><button class="btn sm" data-act="af" data-v="dxrpdock|" title="Remettre le calculateur sous la grille">⤓ dans le panneau</button><button class="btn sm" data-act="af" data-v="dxrpshut|" title="Fermer (Échap)" aria-label="Fermer le calculateur">✕</button></div>
    <div class="rp-ch">${rc}<button class="btn sm" data-act="af" data-v="dxrpvent|" title="Le grand tableau : postes × zones, ce qui est pointé, les répartitions">📊 Ventilation</button><label class="rp-auto" title="Ouvrir le calculateur au clic sur un PU, un montant ou une ligne liée (réglage mémorisé sur cet appareil)"><input type="checkbox" data-rp="auto"${AUTO?' checked':''}> ouvrir au clic</label></div>`;}
/* les parts de répartition déjà sur la ligne (comptées dans Σ, gardées quand on remet le prix) */
export function partsAmt(a,CP,key){const i=String(key||'').lastIndexOf('!');if(i<0||!CP)return 0;const sh=key.slice(0,i),ad=key.slice(i+1);const L=((a.dpgf||{}).liens||[]).find(x=>up(x.sh)===up(sh)&&x.a===ad);
  return L?(L.comps||[]).reduce((s,x)=>{if(!x.rep)return s;const c=CP.by.get(x.k);return s+(c?(+x.q||0)*c.puV:0);},0):0;}
export const keepParts=(L,CP)=>L?(L.comps||[]).filter(x=>x.rep&&CP.by.has(x.k)).map(x=>({k:CP.by.get(x.k).k,q:+x.q||0,rep:x.rep})):[]; /* 16/10 (lot C3) : clé stable */
export function calcParts(a,CP,lk){if(!lk||!CP)return '';const P=(lk.comps||[]).filter(x=>x.rep);if(!P.length)return '';const reps=(a.dpgf||{}).reps||[];const g=new Map();P.forEach(x=>{if(!g.has(x.rep))g.set(x.rep,[]);g.get(x.rep).push(x);});
  return `<div class="rp-parts">${[...g].map(([id,L])=>{const R=reps.find(r=>r.id===id);const amt=L.reduce((s,x)=>{const c=CP.by.get(x.k);return s+(c?(+x.q||0)*c.puV:0);},0);
    return `<div class="rp-ph">⇶ ${esc(R?R.nom:'Répartition au ml')} <span class="dim">· ${eur(amt,2)} déjà sur cette ligne, comptés dans Σ · se gère dans la ventilation</span></div><div class="rp-pl">${L.map(x=>{const c=CP.by.get(x.k);return c?`<span>${esc(c.zn)} › ${esc(X.compName(c))} : ${fq(+x.q)} ${esc(c.u)}${mlQ(c,+x.q)} = ${eur((+x.q)*c.puV,2)}</span>`:'<span>(composante disparue du chiffrage)</span>';}).join('')}</div>`;}).join('')}</div>`;}
/* ventilation : le reste des postes par DN aussi en ml ; repère des liens qui portent des parts de répartition */
export function ventMl(CP,P,kk){const i=kk.indexOf('|');const zk=kk.slice(0,i),pk=kk.slice(i+1);if(!PDN.includes(pk))return '';let q=0,m=0,u='';
  CP.list.forEach(c=>{if((c.z<0?'inst':'z'+c.z)!==zk||c.p!==pk||!perMl(c))return;const r=Math.max(0,c.qty-(P.byComp.get(c.k)||0));q+=r;m+=toMl(c,r);u=c.u;});return q>1e-6?`<span class="sub">${fq(q)} ${esc(u)} ≈ ${fml(m)} ml</span>`:'';}
export function lkTag(a,L){const ids=[...new Set((L.comps||[]).filter(x=>x.rep).map(x=>x.rep))];if(!ids.length)return '';const reps=(a.dpgf||{}).reps||[];
  return ids.map(id=>{const R=reps.find(r=>r.id===id);return `<span class="rp-tag" title="Ce que « ${esc(R?R.nom:'répartition')} » a mis au ml sur cette ligne">⇶ ${esc(R?R.nom:'répartition')}</span>`;}).join('');}
/* ═════════ 4 · LA PASTILLE « 🧮 Calculer » ET L'OUVERTURE AU CLIC ═════════ */
const autoCell=(a,M,s)=>{const D=a.dpgf||{};const S=M.S(s.sh);if(!S)return false;if(X.linkOfRow(a,S.name,s.r))return true;if(S!==X.dpSheet(M,D))return false;
  if(X.CO&&X.CO.isAuto(a,M)){if(!X.CO.lineAt(a,M,S,s.r))return false;const tc=X.CO.totCol(a,M);return s.c===X.CO.puCol(a,M)||(tc&&s.c===tc);} /* 19/10 (lot DY) : DPGF mal lu à l'import */
  const line=(D.lignes||[]).find(l=>!l.section&&l.row===s.r);if(!line)return false;const tc=X.totColOf(D);return s.c===X.puColOf(D)||(tc&&s.c===tc);};
function calcShown(num){if(X.popLive())return true;const G=docOK()&&geo();return !!(G&&(G.fl||G.beside));}
/* la pastille : seulement après un clic (jamais en se déplaçant au clavier), sur une ligne du DPGF dont le calculateur n'est pas à l'écran ; posée dans le contenu de la
   grille (elle défile avec), au bout de la désignation de la ligne : elle ne couvre ni l'unité, ni la quantité, ni le PU, ni les lignes voisines */
export function chip(V0){const views=V0?[V0]:[X.XS.view,X.XS.pview].filter(Boolean);views.forEach(V=>{try{chipOf(V);}catch(e){console.warn(e);}});}
function chipOf(V){if(!V||!V.cnt||!V.doc||!V.doc.contains(V.cnt))return;let el=V.cnt.querySelector('.rp-chip');const hide=()=>{if(el)el.hidden=true;};const a=X.affOf(V.num);const M=a&&X.modelOf(a);const s=X.XS.sel[V.num];
  if(!a||!M||!s||!X.XS.canEdit||X.XS.edit||up(s.sh)!==up(V.sh)||s.r!==s.r2||s.c!==s.c2)return hide();const P=RS.chipAt;if(!P||P.num!==V.num||up(P.sh)!==up(s.sh)||P.r!==s.r||P.c!==s.c)return hide();
  const t=X.calcTarget(a,M);if(!t||calcShown(V.num))return hide();const dc=((a.dpgf||{}).cols||{}).des;
  let td=t.line&&dc>=0?V.cnt.querySelector(`td[data-r="${s.r}"][data-c="${dc+1}"]`):null;const des=!!td;if(!td)td=V.cnt.querySelector(`td[data-r="${s.r}"][data-c="${s.c}"]`);if(!td)return hide();
  if(!el){el=V.doc.createElement('button');el.type='button';el.className='rp-chip';el.dataset.act='af';el.dataset.v='dxrpopen|';el.textContent='🧮 Calculer';el.title='Ouvrir le calculateur de cette ligne : cocher ce que son prix comprend';V.cnt.appendChild(el);}el.hidden=false;
  const cr=V.cnt.getBoundingClientRect(),tr=td.getBoundingClientRect();const w=el.offsetWidth||110,h=el.offsetHeight||28;let x=des&&tr.width>=w+40?tr.right-cr.left-w-4:tr.right-cr.left+4;x=Math.max(V.vp.scrollLeft+2,Math.min(x,V.vp.scrollLeft+V.vp.clientWidth-w-4));
  const y=tr.top-cr.top+(tr.height-h)/2;el.style.left=Math.max(0,Math.round(x))+'px';el.style.top=Math.max(0,Math.round(y))+'px';}
export function onSel(V){chip(V);}
/* montage de la grille : CSS dans la fenêtre (aussi l'autre écran), clic → ouverture (PU, montant, ligne liée) ou pastille */
export function mount(V){css(V.doc);wire();chip(V);if(V.doc===document)fitFlt();if(!V.doc._rp){V.doc._rp=1;V.doc.addEventListener('pointerup',()=>{setTimeout(()=>{RS.pd=null;},0);},true);}if(V.vp._rp)return;V.vp._rp=1;
  V.vp.addEventListener('pointerdown',e=>{const td=e.target.closest&&e.target.closest('td[data-r]');RS.pd=td&&e.button===0?{V,x:e.clientX,y:e.clientY,r:+td.dataset.r,c:+td.dataset.c}:null;},{capture:true});
  V.vp.addEventListener('pointercancel',()=>{RS.pd=null;});
  V.vp.addEventListener('pointerup',e=>{const P=RS.pd;RS.pd=null;if(!P||P.V!==V)return;if(Math.abs(e.clientX-P.x)>10||Math.abs(e.clientY-P.y)>10||e.shiftKey)return;
    const a=X.affOf(V.num);const M=a&&X.modelOf(a);const s=X.XS.sel[V.num];if(!M||!s||s.r!==P.r||s.c!==P.c||s.r!==s.r2||s.c!==s.c2)return;
    if(AUTO&&autoCell(a,M,s)&&X.calcTarget(a,M)&&(X.XS.canEdit||X.linkOfRow(a,s.sh,s.r))){RS.chipAt=null;open(V.num);return;}RS.chipAt={num:V.num,sh:s.sh,r:s.r,c:s.c};chip(V);});}
/* ═════════ 5 · « ⇶ RÉPARTIR AU ML » : le calcul ═════════ */
/* q réparti sur des poids : au millième, au plus fort reste (la somme des parts = q, exactement) */
function splitQ(q,ws){const U=1000;const tot=Math.round(q*U);const raw=ws.map(w=>w*tot);const fl=raw.map(Math.floor);let rem=tot-fl.reduce((s,x)=>s+x,0);
  raw.map((x,i)=>[x-fl[i],i]).sort((p,q2)=>q2[0]-p[0]).forEach(([,i])=>{if(rem>0){fl[i]++;rem--;}});return fl.map(x=>x/U);}
const lineDn=(cfg,l)=>cfg.dnOf[l.a]!==undefined&&cfg.dnOf[l.a]!==''&&cfg.dnOf[l.a]!==null?+cfg.dnOf[l.a]:l.dnR;
export function planOf(a,M,CP,cfg){const LS=linesOf(a,M);const rest=restFn(a,CP,cfg.id);const tgt=LS.filter(l=>cfg.sel[l.a]&&l.isMl&&l.q>0);const tgS=new Set(tgt);
  const add=new Map();const put=(l,k,q,cat,zs)=>{if(!(q>0))return;if(!add.has(l.a))add.set(l.a,[]);add.get(l.a).push({k,q,cat,zs});}; /* 17/10 (lot DZ) : zs = la zone d'une part d'installation */
  const hasPart=(l,k)=>!!l.L&&(l.L.comps||[]).some(x=>x.via==='part'&&(+x.q||0)>0&&(CP.by.get(x.k)||{}).k===k); /* 16/10 nuit (lot DK) : une ligne qui a reçu sa part d'un poste (« ⇶ Donner sa part ») ne le reçoit pas une 2e fois par une répartition */
  const spread=(c,q,ls,cat)=>{ls=ls.filter(l=>!hasPart(l,c.k));const W=ls.reduce((s,l)=>s+l.q,0);if(!ls.length||!(W>0))return false;const qs=splitQ(q,ls.map(l=>l.q/W));ls.forEach((l,i)=>put(l,c.k,qs[i],cat));return true;};
  const takes=[];CP.list.forEach(c=>{if(!cfg.ks[c.k])return;const r=rest(c.k);if(!(r>1e-9))return;let q=r,lim=false;const v=cfg.qs[c.k];if(v!==undefined&&v!==null&&v!==''&&isFinite(+v)){if(+v>r+1e-6)lim=true;q=Math.max(0,Math.min(r,+v));}if(q>1e-9)takes.push({c,q,lim,r});});
  const comL=cfg.com.mode==='ligne'?LS.find(l=>l.a===cfg.com.ligne)||null:null;const un=[];
  takes.forEach(T=>{const c=T.c,q=T.q;if(X.ZN&&X.ZN.repSpread(a,M,CP,cfg,T,tgt,put,un,hasPart))return; /* 17/10 (lot DZ) : installations — le reste de chaque zone sur les lignes au ml de cette zone */
    if(cfg.mode==='grp'){T.dest=spread(c,q,tgt,'grp')?'grp':null;if(!T.dest)un.push({c,q,why:'lignes'});return;}
    if(c.dn){const ls=tgt.filter(l=>lineDn(cfg,l)===c.dn);if(ls.length&&spread(c,q,ls,'dn')){T.dest='dn';T.n=ls.length;T.ml=ls.reduce((s,l)=>s+l.q,0);return;}if(!cfg.orphan){T.dest=null;un.push({c,q,why:'dn'});return;}}
    if(cfg.com.mode==='ligne'){if(comL&&comL.q>0&&spread(c,q,[comL],'one')){T.dest='one';return;}T.dest=null;un.push({c,q,why:'ligne'});return;}
    if(spread(c,q,tgt,'com')){T.dest='com';return;}T.dest=null;un.push({c,q,why:'lignes'});});
  /* par ligne : déjà lié, ajout, nouveau PU */
  const rows=[];let tot=0,gap=0;const seen=new Set();
  LS.forEach(l=>{const parts=add.get(l.a);const isT=tgS.has(l)||(comL&&comL.a===l.a);if(!isT&&!parts)return;if(seen.has(l.a))return;seen.add(l.a);
    const P=new Map();(parts||[]).forEach(x=>{const pk=x.k+'|'+(x.zs||'');const o=P.get(pk)||{k:x.k,q:0,cat:x.cat,zs:x.zs};o.q+=x.q;P.set(pk,o);}); /* (lot DZ) une part par zone */const ps=[...P.values()].map(x=>Object.assign(x,{q:Math.round(x.q*1000)/1000})).filter(x=>x.q>0);
    let q=l.q,old=0,oldPu=l.pu;if(l.L){const Xn=X.linkNow(l.L,CP,M);q=Xn.q;old=(l.L.comps||[]).reduce((s,x)=>{if(cfg.id&&x.rep===cfg.id)return s;const c=CP.by.get(x.k);return s+(c?(+x.q||0)*c.puV:0);},0);oldPu=q>0?old/q:0;}
    const addA=ps.reduce((s,x)=>s+x.q*CP.by.get(x.k).puV,0);const addDn=ps.filter(x=>x.cat==='dn'||x.cat==='com'||x.cat==='grp').reduce((s,x)=>s+x.q*CP.by.get(x.k).puV,0);
    const nAmt=old+addA;const npu=q>0?nAmt/q:0;if(ps.length){tot+=addA;gap+=r2(npu)*q-nAmt;}
    rows.push({l,q,old,oldPu,linked:!!l.L,manual:!l.L&&l.pu>0,parts:ps,addA,addDn,nAmt,npu,dn:lineDn(cfg,l)});});
  /* par DN : € / ml ajouté (le même pour toutes les lignes du DN) */
  const byDn=[];if(cfg.mode==='dn'){const dns=[...new Set(tgt.map(l=>lineDn(cfg,l)).filter(Boolean))].sort((x,y)=>y-x);dns.forEach(d=>{const R=rows.filter(r=>tgS.has(r.l)&&r.dn===d);const ml=R.reduce((s,r)=>s+r.l.q,0);const amt=R.reduce((s,r)=>s+r.addDn,0);byDn.push({dn:d,n:R.length,ml,amt,pm:ml>0?amt/ml:0});});}
  /* non placé, par DN (soudures, manchons) et communes */
  const unDn=new Map();let unCom=0,unComN=0;un.forEach(u=>{const amt=u.q*u.c.puV;if(u.why==='dn'){const o=unDn.get(u.c.dn)||{dn:u.c.dn,amt:0,soud:0,manch:0};o.amt+=amt;if(u.c.u==='soud.')o.soud+=u.q;else o.manch+=u.q;unDn.set(u.c.dn,o);}else if(u.why!=='zone'){unCom+=amt;unComN++;}}); /* (lot DZ) les installations d'une zone sans ligne : à part */
  return {LS,tgt,takes,rows,byDn,unDn:[...unDn.values()].sort((x,y)=>y.dn-x.dn),unCom,unComN,unWhy:(un.find(u=>u.why!=='dn')||{}).why||'',tot,gap,comL};}
/* écrire : retirer les parts de la répartition repId, poser les nouvelles, réécrire les PU ; un lien créé par une répartition et devenu vide disparaît (sa cellule PU
   redevient ce qu'elle était) ; reps à jour ; UN seul pas d'annulation (dxWrite) */
function commit(a,M,CP,repId,plan,rec){const D=a.dpgf||{};const now=new Date().toISOString();const H=X.H();const by=H&&H.A&&H.A.userName?H.A.userName():'';
  const old=(D.reps||[]).find(r=>r.id===repId)||null;const col=rec?rec.col:(old?old.col:0);
  let liens=(D.liens||[]).map(L=>Object.assign({},L,{comps:(L.comps||[]).slice()}));const touched=new Set();
  liens.forEach(L=>{const n0=L.comps.length;L.comps=L.comps.filter(x=>x.rep!==repId);if(L.comps.length!==n0)touched.add(L.id);});
  const byA=new Map();liens.forEach(x=>{const k=up(x.sh)+'!'+x.a;if(!byA.has(k))byA.set(k,x);});
  (plan?plan.rows:[]).forEach(R=>{if(!R.parts.length)return;const l=R.l;let L=byA.get(up(l.sh)+'!'+l.a);
    if(!L){L={id:'L'+Date.now().toString(36)+Math.random().toString(36).slice(2,6),sh:l.sh,a:l.a,qa:l.qa||null,q:l.q,qfix:false,u:l.u||'',comps:[],pu:0,amt:0,v:CP.v,at:now,by,col,rep:repId,prev:{e:l.ed||null}};liens.push(L);byA.set(up(l.sh)+'!'+l.a,L);}
    L.comps=L.comps.concat(R.parts.map(x=>x.zs?{k:x.k,q:x.q,rep:repId,zs:x.zs}:{k:x.k,q:x.q,rep:repId}));touched.add(L.id);}); /* (lot DZ) zs gardé */
  liens.forEach(L=>{if(touched.has(L.id))L.comps=canonComps(L.comps,CP);}); /* 16/10 (lot C3) : un lien réécrit passe aux clés stables */
  const vals=[];
  liens=liens.filter(L=>{if(L.rep&&touched.has(L.id)&&!L.comps.length){const p=parseAddr(L.a);if(p)vals.push({sh:L.sh,r:p.r,c:p.c,e:L.prev&&L.prev.e?L.prev.e:null});return false;}return true;});
  liens.forEach(L=>{if(!touched.has(L.id))return;const Xn=X.linkNow(L,CP,M);const p=parseAddr(L.a);if(!p)return;vals.push({sh:L.sh,r:p.r,c:p.c,e:{v:Xn.pur}});Object.assign(L,{pu:Xn.pur,amt:r2(Xn.amt),v:CP.v,at:now});});
  const R2=rec?Object.assign({},rec,{v:CP.v,at:now,by}):null;if(R2){delete R2.prev;canonRep(R2,CP);}
  X.dxWrite(a,vals,{liens:()=>liens,dp:D2=>{let L=(D2.reps||[]).slice();const i=L.findIndex(r=>r.id===repId);if(R2){if(i>=0)L[i]=R2;else L.push(R2);}else if(i>=0)L.splice(i,1);if(L.length)D2.reps=L;else delete D2.reps;}});
  X.XS.calc[a.num]=null;return vals.length;}
/* couleur d'une répartition : une libre, de préférence loin de l'orange « à mettre à jour » (#c2410c, #b45309 en dernier) */
const COL_PREF=[0,1,2,4,5,6,7,9,10,11,3,8];const freeCol=D=>{const used=new Set((D.liens||[]).map(L=>L.col).concat((D.reps||[]).map(r=>r.col)));const n=X.LK_COLS.length;const pref=COL_PREF.filter(i=>i<n);for(const i of pref)if(!used.has(i))return i;return pref[((D.liens||[]).length+(D.reps||[]).length)%pref.length];};
const cfgOfRep=R=>{const a=X.affOf(X.XS.num);return canonCfg(cfgOfRep0(R),a?X.compsOf(a):null);}; /* 16/10 (lot C3) : composantes et quantités sous les clés stables */
const cfgOfRep0=R=>({id:R.id,mode:R.mode==='grp'?'grp':'dn',sel:Object.fromEntries((R.lignes||[]).map(x=>[x,true])),dnOf:Object.assign({},R.dnOf||{}),ks:Object.fromEntries((R.ks||[]).map(k=>[k,true])),
  qs:Object.assign({},R.qs||{}),qt:{},qm:{},com:Object.assign({mode:'prorata',ligne:null},R.com||{}),orphan:!!R.orphan,nom:R.nom||'',nomSet:true});
/* défauts : par DN → les lignes au ml où un DN est lu (pas celles au PU saisi à la main), les composantes par DN qui ont un reste ; groupe → rien de coché */
function cfgNew(a,M,CP,mode){const LS=linesOf(a,M);const rest=restFn(a,CP,null);const cfg={id:null,mode,sel:{},dnOf:{},ks:{},qs:{},qt:{},qm:{},com:{mode:'prorata',ligne:null},orphan:false,nom:'',nomSet:false};
  if(mode==='dn'){LS.forEach(l=>{if(l.isMl&&l.q>0&&l.dnR&&!(!l.L&&l.pu>0))cfg.sel[l.a]=true;});CP.list.forEach(c=>{if(c.dn&&rest(c.k)>1e-9)cfg.ks[c.k]=true;});}
  const dv=LS.find(l=>/divers|sujétions|sujetions|imprévus|imprevus/i.test(l.des))||LS.filter(l=>!l.isMl).slice(-1)[0]||LS[0];cfg.com.ligne=dv?dv.a:null;return cfg;}
const autoName=(cfg,plan,D)=>{if(cfg.mode==='grp'){const ns=plan.tgt.map(l=>l.n||l.a);return 'Groupe '+(ns.length>3?ns.slice(0,2).join(', ')+'… ('+ns.length+' lignes)':ns.join(', '));}const n=(D.reps||[]).filter(r=>r.mode!=='grp').length;return 'Au ml par DN'+(n?' n° '+(n+1):'');};
/* ═════════ 6 · L'OUTIL (fenêtre) ═════════ */
const tool=num=>RS.tool[num]||null;
export function barBtn(a,canEdit){return canEdit?`<button class="btn sm" data-act="af" data-v="dxrpsimple|" title="Tout ce qui n'est pas encore pointé va sur les lignes au ml du DPGF (toutes les lignes d'un même DN au même € / ml) : on voit le résultat avant de valider">⇶ Mettre le reste au ml</button>`:'';} /* 16/10 (lot C2) : la fenêtre courte ; l'outil détaillé = « Personnaliser… » */
export function toolHTML(a,M,canEdit){const T=tool(a.num);if(!T||!canEdit||!M)return simpleHTML(a,M,canEdit);css(document);return `<div class="rp-ov" id="rp-ov"><div class="rp-dlg" id="rp-tool" role="dialog" aria-modal="true" aria-label="Répartir au ml">${toolInner(a,M,T)}</div></div>`;}
/* la fenêtre en morceaux : la liste des lignes (la plus lourde, jusqu'à des milliers) est dessinée une fois ; cocher met à jour les lignes en place, puis les
   en-têtes, les composantes, l'aperçu et le pied (petits) */
function toolInner(a,M,cfg){const CP=X.compsOf(a);const D=a.dpgf||{};const R=cfg.id?(D.reps||[]).find(r=>r.id===cfg.id):null;
  const hd=`<div class="rp-hd"><h3>⇶ ${R?'Répartition « '+esc(R.nom)+' »':'Répartir au ml'} <span class="hint">· le reste de notre prix sur les lignes au ml</span></h3><button class="btn sm" data-act="af" data-v="dxrpclose|" aria-label="Fermer">✕</button></div>`;
  if(!CP)return hd+`<div class="rp-body"><div class="eq-s">Pas encore de chiffrage complet (zones, postes) : fais le chiffrage à l'étape 4, puis reviens ici.</div></div>`;
  const P=toolParts(a,M,CP,cfg);const grp=cfg.mode==='grp';
  const modes=`<div class="rp-modes"><button class="btn sm${grp?'':' on'}" data-act="af" data-v="dxrpmode|dn" title="Le reste de chaque DN sur les lignes de ce DN, toutes zones ensemble : toutes les lignes DN 50 au même € / ml">Par DN · toutes les zones</button><button class="btn sm${grp?' on':''}" data-act="af" data-v="dxrpmode|grp" title="« Sur 100 soudures, X pour ces lignes » : une quantité donnée sur un groupe de lignes choisi à la main, au prorata des ml">Groupe de lignes</button>
    <span class="hint">${grp?'Coche les lignes du groupe (ex. les lignes d\'une antenne) et ce qu\'on y met : réparti au prorata de leurs ml.':'On ne prend que le reste (pas encore pointé) : rien n\'est retiré aux lignes déjà liées, elles reçoivent en plus.'}</span></div>`;
  const mlL=P.plan.LS.filter(l=>l.isMl);
  const sec1=`<section class="rp-sec"><h4 id="rp-s1h">${P.s1h}</h4>${mlL.length?`<div class="rp-chips" id="rp-chips1">${P.chips}</div><div class="rp-lines" id="rp-lines">${mlL.map(l=>lnRow(a,M,CP,cfg,l,P.dns)).join('')}</div>`:'<div class="eq-s">Aucune ligne à l\'unité ml (ml, m, m.l., mètre linéaire) dans le DPGF.</div>'}</section>`;
  return hd+modes+`<div class="rp-body" id="rp-body">${sec1}<section class="rp-sec" id="rp-s2">${P.s2}</section><section class="rp-sec"><h4>3 · Aperçu <span class="hint">· rien n'est écrit avant « Appliquer »</span></h4><div id="rp-pv">${P.pv}</div></section></div>`+P.ft;}
function toolParts(a,M,CP,cfg){const D=a.dpgf||{};const R=cfg.id?(D.reps||[]).find(r=>r.id===cfg.id):null;const plan=planOf(a,M,CP,cfg);const rest=restFn(a,CP,cfg.id);const LS=plan.LS;const grp=cfg.mode==='grp';
  /* 1 · lignes : en-tête, sélection rapide */
  const mlL=LS.filter(l=>l.isMl);const dns=[...new Set(CP.list.filter(c=>c.dn).map(c=>c.dn).concat(mlL.map(l=>l.dnR).filter(Boolean)))].sort((x,y)=>x-y);
  const nOn=mlL.filter(l=>cfg.sel[l.a]&&l.q>0);const byDnL=new Map();mlL.forEach(l=>{const d=lineDn(cfg,l);if(!d)return;if(!byDnL.has(d))byDnL.set(d,[]);byDnL.get(d).push(l);});
  const s1h=`1 · Lignes cibles <span class="hint">· ${nOn.length} cochée${nOn.length>1?'s':''} · ${nb(nOn.reduce((s,l)=>s+l.q,0))} ml${grp?'':' · d\'office les lignes au ml où un DN est lu'}</span>`;
  const chips=`<button class="btn sm" data-act="af" data-v="dxrpsel|all">Toutes</button><button class="btn sm" data-act="af" data-v="dxrpsel|none">Aucune</button>${[...byDnL].sort((x,y)=>y[0]-x[0]).map(([d,L])=>{const all=L.every(l=>cfg.sel[l.a]);return `<button class="btn sm${all?' on':''}" data-act="af" data-v="dxrpsel|dn${d}" title="Cocher / décocher toutes les lignes DN ${d}">${all?'☑':'☐'} toutes les lignes DN ${d} · ${L.length}</button>`;}).join('')}`;
  /* 2 · composantes */
  const cRow=c=>{const r=rest(c.k);const on=!!cfg.ks[c.k];const T=plan.takes.find(x=>x.c===c);const q=T?T.q:0;const qt=cfg.qt[c.k]!==undefined?cfg.qt[c.k]:fin(cfg.qs[c.k]!==undefined&&cfg.qs[c.k]!==''?Math.min(r,+cfg.qs[c.k]):r);
    const qm=cfg.qm[c.k]!==undefined?cfg.qm[c.k]:(perMl(c)?fin1(toMl(c,numIn(qt)||0)):'');
    let dest='';if(on&&T){if(T.dest==='dn')dest=`→ ${T.n} ligne${T.n>1?'s':''} DN ${c.dn} (${nb(T.ml)} ml)`;else if(T.dest==='grp')dest=`→ le groupe (${plan.tgt.length} ligne${plan.tgt.length>1?'s':''})`;else if(T.dest==='com')dest=`→ au prorata des ml des ${plan.tgt.length} lignes`;else if(T.dest==='one')dest=`→ ligne ${esc((plan.comL&&(plan.comL.n||plan.comL.a))||'')}`;else if(T.dest==='zone'&&X.ZN)dest=X.ZN.destTxt(T); /* (lot DZ) */else dest=`<span class="rp-w">⚠ ${c.dn&&!grp&&!cfg.orphan?'aucune ligne DN '+c.dn+' cochée':'aucune ligne pour la recevoir'}</span>`;}
    return `<div class="rp-c${on?' on':''}" data-k="${esc(c.k)}"><label><input type="checkbox" data-rp="ck" data-k="${esc(c.k)}"${on?' checked':''}><span class="nm">${esc(c.zn)} › ${esc(X.compName(c))}</span><small>reste ${fq(r)} ${esc(c.u)}${mlQ(c,r)} · ${eur(r*c.puV)}${mlPu(c)}</small></label>
      ${on?`<div class="rp-take">prendre <input inputmode="decimal" data-rp="q" data-k="${esc(c.k)}" value="${esc(qt)}" aria-label="${esc('Quantité prise : '+c.lab)}"> ${esc(c.u)}${perMl(c)?` ≈ <input inputmode="decimal" data-rp="qml" data-k="${esc(c.k)}" value="${esc(qm)}" aria-label="${esc('En ml : '+c.lab)}"> ml`:''} = <b data-rpamt="${esc(c.k)}">${eur(q*c.puV,2)}</b>${T&&T.lim?' <span class="rp-w">limité au reste</span>':''} <span class="rp-dest">${dest}</span></div>`:''}</div>`;};
  const withRest=c=>rest(c.k)>1e-9;const pd=CP.list.filter(c=>c.dn&&(withRest(c)||cfg.ks[c.k]));const cm=CP.list.filter(c=>!c.dn&&(withRest(c)||cfg.ks[c.k]));
  const dnG=[...new Set(pd.map(c=>c.dn))].sort((x,y)=>y-x).map(d=>`<div class="rp-gh">DN ${d}</div>`+pd.filter(c=>c.dn===d).map(cRow).join('')).join('');
  const zG=CP.zones.map(z=>({nom:z.nom,L:cm.filter(c=>c.z===z.i)})).concat([{nom:'Installations',L:cm.filter(c=>c.z<0)}]).filter(g=>g.L.length).map(g=>`<div class="rp-gh">${esc(g.nom)}</div>`+g.L.map(cRow).join('')).join('');
  const lineOpt=LS.map(l=>`<option value="${esc(l.a)}"${cfg.com.ligne===l.a?' selected':''}>${esc((l.n?l.n+' · ':'')+String(l.des).slice(0,60)+' ('+l.u+')')}</option>`).join('');
  const comOpt=grp?'':`<div class="rp-com"><span>Les autres postes cochés${cfg.orphan?' (et ce qui n\'a pas de ligne de son DN)':''} :</span><label><input type="radio" name="rp-cm" data-rp="cm" value="prorata"${cfg.com.mode!=='ligne'?' checked':''}> au prorata des ml de toutes les lignes cochées</label><label><input type="radio" name="rp-cm" data-rp="cm" value="ligne"${cfg.com.mode==='ligne'?' checked':''}> sur une seule ligne :</label><select data-rp="cl" aria-label="Ligne qui reçoit">${lineOpt}</select></div>`;
  const s2=`<h4>2 · Ce qu'on glisse au ml <span class="hint">· le reste non pointé${grp?' · coche et indique la quantité (en soudures ou en ml)':''}</span></h4>
    <div class="rp-chips"><button class="btn sm" data-act="af" data-v="dxrpks|dn">☑ toutes les « par DN »</button><button class="btn sm" data-act="af" data-v="dxrpks|com">☑ tous les autres postes</button><button class="btn sm" data-act="af" data-v="dxrpks|none">☐ rien</button></div>
    ${pd.length||cm.length?`<div class="rp-cols"><div class="rp-grp"><div class="rp-gt">Par DN <span class="hint">· soudures, manchons, autocontrôle : ${grp?'sur le groupe':'sur les lignes du même DN, au prorata de leurs ml'}</span></div>${dnG||'<div class="eq-s">Rien à placer.</div>'}</div><div class="rp-grp"><div class="rp-gt">Autres postes <span class="hint">· installations, épreuve, base vie, amené…</span></div>${zG||'<div class="eq-s">Rien à placer.</div>'}${comOpt}</div></div>`:'<div class="eq-s">✓ Tout notre prix est déjà pointé : rien à répartir.</div>'}`;
  return {plan,dns,s1h,chips,s2,pv:pvHTML(a,M,CP,cfg,plan),ft:ftHTML(a,cfg,plan,R)};}
/* une ligne cible : le DN se choisit à la main seulement là où la désignation n'en dit rien (sinon il est lu) */
function lnRow(a,M,CP,cfg,l,dns){const on=!!cfg.sel[l.a];const d=lineDn(cfg,l);const grp=cfg.mode==='grp';
  const st=l.L?`<span class="rp-lk" style="--lk:${X.LK_COLS[l.L.col%X.LK_COLS.length]}">🔗 lié ${nb(X.linkNow(l.L,CP,M).pur,2)} €</span>`:l.pu>0?`<span class="rp-man" title="PU saisi à la main, pas relié au chiffrage : coché, il est remplacé">✎ PU saisi ${nb(l.pu,2)} €</span>`:'<span class="dim">—</span>';
  const dsel=grp||l.dnR?`<span class="rp-dnt">${d?'DN '+d+(l.dnR&&!grp?' (lu)':''):''}</span>`:`<select data-rp="dn" data-a="${esc(l.a)}" aria-label="${esc('DN de la ligne '+(l.n||l.a))}"${d?'':' class="need"'}><option value=""${d?'':' selected'}>DN ?</option>${dns.map(x=>`<option value="${x}"${d===x?' selected':''}>DN ${x}</option>`).join('')}</select>`;
  return `<label class="rp-ln${on?' on':''}${l.q>0?'':' off'}" data-a="${esc(l.a)}"><input type="checkbox" data-rp="ln" data-a="${esc(l.a)}"${on?' checked':''}${l.q>0?'':' disabled'}><b class="n">${esc(l.n||l.a)}</b><span class="des" title="${esc(l.des)}">${esc(l.des)}</span>${dsel}<span class="ml">${nb(l.q,l.q%1?2:0)} ${esc(l.u)}</span><span class="st">${st}</span></label>`;}
const PV_MAX=150;
function pvHTML(a,M,CP,cfg,plan){const all=plan.rows.filter(r=>r.parts.length||cfg.sel[r.l.a]);const rows=all.slice(0,PV_MAX);
  const tr=rows.map(r=>{const l=r.l;const pm=r.q>0?r.addA/r.q:0;return `<tr${r.parts.length?'':' class="nil"'}><td class="l"><b>${esc(l.n||l.a)}</b> ${esc(String(l.des).slice(0,70))}${r.manual&&r.parts.length?' <span class="rp-w">remplace le PU saisi</span>':''}</td><td>${nb(r.q,r.q%1?2:0)} ${esc(l.u)}</td><td>${r.linked?nb(r.oldPu,2):r.manual?'<s>'+nb(l.pu,2)+'</s>':'—'}</td><td class="add">${r.parts.length?'+ '+nb(pm,2)+(l.isMl?' € / ml':' €'):'—'}</td><td class="pu">${r.parts.length?nb(r2(r.npu),2)+' €':'—'}</td></tr>`;}).join('')
    +(all.length>rows.length?`<tr class="nil"><td class="l" colspan="5">… et ${all.length-rows.length} autres lignes (même € / ml que les lignes de leur DN, ci-dessous)</td></tr>`:'');
  const dn=plan.byDn.length?`<div class="rp-dns">${plan.byDn.map(x=>`<span class="rp-dn"><b>DN ${x.dn}</b> : ${x.amt>0.004?'<b>+ '+nb(x.pm,2)+' € / ml</b>':'rien à ajouter'} · ${x.n} ligne${x.n>1?'s':''} · ${nb(x.ml)} ml${x.amt>0.004?' · '+eur(x.amt):''}</span>`).join('')}</div>`:'';
  const un=plan.unDn.length||plan.unCom>0.004||(X.ZN&&X.ZN.unZAmt(plan,CP)>0.004)?`<div class="rp-un">⚠ Non placé : ${plan.unDn.map(u=>`<span>DN ${u.dn} : aucune ligne DN ${u.dn} cochée — ${[u.soud?fq(u.soud)+' soud.':'',u.manch?fq(u.manch)+' manch.':''].filter(Boolean).join(', ')}, ${eur(u.amt)}</span>`).join('')}${plan.unCom>0.004?`<span>${plan.unComN} autre${plan.unComN>1?'s':''} poste${plan.unComN>1?'s':''} : ${plan.unWhy==='ligne'?'la ligne choisie n\'a pas de quantité':'aucune ligne cochée'} — ${eur(plan.unCom)}</span>`:''}${X.ZN?X.ZN.unZHTML(plan,CP):''}${!cfg.orphan&&(plan.unDn.length||(X.ZN&&X.ZN.unZAmt(plan,CP)>0.004))&&cfg.mode==='dn'?`<label class="rp-orph"><input type="checkbox" data-rp="orph"> le mettre avec les autres postes (prorata ou ligne choisie)</label>`:''}</div>`:'';
  const orphOn=cfg.orphan&&cfg.mode==='dn'?`<label class="rp-orph"><input type="checkbox" data-rp="orph" checked> ce qui n'a pas de ligne de son DN va avec les autres postes</label>`:'';
  return (all.length?`<div class="rp-pvw"><table class="rp-pvt"><thead><tr><th class="l">Ligne</th><th>Qté</th><th>PU déjà lié</th><th>+ répartition</th><th>= nouveau PU</th></tr></thead><tbody>${tr}</tbody></table></div>`:'<div class="eq-s">Coche des lignes et ce qu\'on y glisse : l\'aperçu s\'affiche ici.</div>')+dn+un+orphOn;}
function ftHTML(a,cfg,plan,R){const n=plan.rows.filter(r=>r.parts.length).length;const D=a.dpgf||{};const nom=cfg.nomSet?cfg.nom:autoName(cfg,plan,D);
  return `<div class="rp-ft" id="rp-ft"><label class="rp-nom">Nom <input data-rp="nom" value="${esc(nom)}" maxlength="80" aria-label="Nom de la répartition"></label><span class="rp-tot" id="rp-tot">${totHTML(plan,n)}</span><span class="rp-btns"><button class="btn sm" data-act="af" data-v="dxrpclose|">Annuler</button><button class="btn sm primary" data-act="af" data-v="dxrpapply|"${n?'':' disabled'}>⇶ ${R?'Appliquer les changements':'Appliquer'}${n?' · '+n+' ligne'+(n>1?'s':''):''}</button></span></div>`;}
const totHTML=(plan,n)=>n?`Total réparti <b>${eur(plan.tot,2)}</b> sur ${n} ligne${n>1?'s':''} · écart d'arrondi : <b>${(plan.gap<-0.004?'−':'')+eur(Math.abs(plan.gap),2)}</b>`:'Rien à répartir pour l\'instant';
/* rafraîchir : 'pv' = l'aperçu et le pied seulement (on tape une quantité) ; 'soft' = tout sauf la liste des lignes (mise à jour en place) ; sinon tout */
function refreshTool(num,how){const el=document.getElementById('rp-tool');const a=X.affOf(num);const M=a&&X.modelOf(a);const T=tool(num);if(!el||!a||!M||!T)return;const CP=X.compsOf(a);
  if(how===false||how==='pv'){if(!CP)return;const plan=planOf(a,M,CP,T);const pv=document.getElementById('rp-pv');if(pv)pv.innerHTML=pvHTML(a,M,CP,T,plan);const n=plan.rows.filter(r=>r.parts.length).length;const t=document.getElementById('rp-tot');if(t)t.innerHTML=totHTML(plan,n);
    const b=document.querySelector('#rp-ft [data-v="dxrpapply|"]');if(b){b.disabled=!n;b.textContent='⇶ '+(T.id?'Appliquer les changements':'Appliquer')+(n?' · '+n+' ligne'+(n>1?'s':''):'');}
    plan.takes.forEach(x=>{const e=document.querySelector(`#rp-tool b[data-rpamt="${CSS.escape(x.c.k)}"]`);if(e)e.textContent=eur(x.q*x.c.puV,2);});return;}
  const bd=document.getElementById('rp-body');const st=bd?bd.scrollTop:0;const f=document.activeElement&&el.contains(document.activeElement)?document.activeElement:null;const fk=f&&f.dataset?[f.dataset.rp,f.dataset.k||f.dataset.a||'']:null;
  if(how==='soft'&&CP&&document.getElementById('rp-lines')){const P=toolParts(a,M,CP,T);
    el.querySelectorAll('#rp-lines input[data-rp="ln"]').forEach(x=>{const on=!!T.sel[x.dataset.a];if(x.checked!==on)x.checked=on;const lb=x.closest('.rp-ln');if(lb)lb.classList.toggle('on',on);});el.querySelectorAll('#rp-lines select[data-rp="dn"]').forEach(x=>x.classList.toggle('need',!x.value));
    const set=(id,h)=>{const e=document.getElementById(id);if(e)e.innerHTML=h;};set('rp-s1h',P.s1h);set('rp-chips1',P.chips);set('rp-s2',P.s2);set('rp-pv',P.pv);const ft=document.getElementById('rp-ft');if(ft)ft.outerHTML=P.ft;}
  else{const ln=document.getElementById('rp-lines');const sl=ln?ln.scrollTop:0;el.innerHTML=toolInner(a,M,T);const ln2=document.getElementById('rp-lines');if(ln2)ln2.scrollTop=sl;}
  const bd2=document.getElementById('rp-body');if(bd2)bd2.scrollTop=st;
  if(fk&&fk[0]){const g=[...el.querySelectorAll(`[data-rp="${fk[0]}"]`)].find(x=>(x.dataset.k||x.dataset.a||'')===fk[1]);if(g&&g!==document.activeElement)try{g.focus({preventScroll:true});}catch(e){}}}
function closeTool(num){RS.tool[num]=null;const o=document.getElementById('rp-ov');if(o)o.remove();}
function openTool(a,M,repId){if(RS.simple)RS.simple[a.num]=null; /* 16/10 (lot C2) */const CP=X.compsOf(a);const D=a.dpgf||{};const R=repId?(D.reps||[]).find(r=>r.id===repId):null;if(repId&&!R){X.say('Répartition introuvable');return;}
  RS.tool[a.num]=R?cfgOfRep(R):CP?cfgNew(a,M,CP,'dn'):{id:null,mode:'dn',sel:{},dnOf:{},ks:{},qs:{},qt:{},qm:{},com:{mode:'prorata',ligne:null},orphan:false,nom:'',nomSet:false};
  const card=document.getElementById('dx-card');const o=document.getElementById('rp-ov');if(o)o.remove();if(card)card.insertAdjacentHTML('beforeend',toolHTML(a,M,true));
  setTimeout(()=>{const b=document.querySelector('#rp-tool .rp-hd button');if(b)try{b.focus({preventScroll:true});}catch(e){}},30);}
/* ═════════ 7 · LA VENTILATION : les répartitions (refaire, défaire, ouvrir) ═════════ */
export function ventBtn(a,canEdit){return canEdit&&X.compsOf(a)?`<button class="btn sm" data-act="af" data-v="dxrpsimple|" title="Tout ce qui n'est pas encore pointé va sur les lignes au ml du DPGF : on voit le résultat avant de valider">⇶ Mettre le reste au ml</button>`:'';} /* 16/10 (lot C2) */
export function ventReps(a,M,CP,canEdit){const D=a.dpgf||{};const R=D.reps||[];if(!R.length||!CP||!M)return '';
  const rows=R.map(r=>{let amt=0;const lines=new Set();(D.liens||[]).forEach(L=>(L.comps||[]).forEach(x=>{if(x.rep!==r.id)return;const c=CP.by.get(x.k);if(c)amt+=(+x.q||0)*c.puV;lines.add(L.a);}));
    /* ce que « ↻ Refaire » changerait : les quantités du chiffrage ont bougé → du reste à reprendre, ou trop pris */let left=0;try{left=planOf(a,M,CP,cfgOfRep(r)).tot-amt;}catch(e){left=0;}const dns=[...new Set((D.liens||[]).flatMap(L=>(L.comps||[]).filter(x=>x.rep===r.id).map(x=>{const c=CP.by.get(x.k);return c&&c.dn;})).filter(Boolean))].sort((x,y)=>y-x);
    const col=X.LK_COLS[(r.col||0)%X.LK_COLS.length];const dt=r.at?esc(new Date(r.at).toLocaleDateString('fr-FR')):'';
    return `<div class="rp-rep" data-rep="${esc(r.id)}" style="--lk:${col}"><b>${esc(r.nom||'Répartition')}</b><span class="dim">${r.mode==='grp'?'groupe de lignes':'par DN'} · ${lines.size} ligne${lines.size>1?'s':''} · ${eur(amt)}${dns.length?' · DN '+dns.join(', '):''}${dt?' · '+dt:''}${r.by?' · '+esc(r.by):''}</span>
      ${left>1?`<span class="eq-tag warn" title="Le chiffrage a changé : ses composantes ont un reste">↻ ${eur(left)} de reste à reprendre</span>`:left<-1?`<span class="eq-tag warn" title="Le chiffrage a baissé : elle a pris plus que ce qu'il reste">↻ ${eur(-left)} pris en trop</span>`:''}${canEdit?`<span class="rp-acts"><button class="btn sm" data-act="af" data-v="dxrptool|${esc(r.id)}" title="Voir et modifier : lignes, composantes, quantités">✎ Ouvrir</button><button class="btn sm" data-act="af" data-v="dxrpredo|${esc(r.id)}" title="Retire ses parts puis recalcule avec le reste actuel (après un changement du chiffrage)">↻ Refaire avec le reste actuel</button><button class="btn sm" data-act="af" data-v="dxrpundo|${esc(r.id)}" title="Retire ses parts et réécrit les PU (Ctrl+Z pour revenir)">✕ Défaire</button></span>`:''}</div>`;}).join('');
  return `<div class="rp-reps"><div class="eq-lab" style="margin-top:8px">⇶ Répartitions au ml · ${R.length}</div>${rows}</div>`;}
/* ═════════ 8 · ACTIONS (data-v="dxrp…|…", depuis dpgfXlAct) ═════════ */
export function act(k,arg,arg2,a,canEdit,M){const num=a.num;
  switch(k){
    case 'dxrpopen':{if(!M)return true;const t=X.calcTarget(a,M);if(!t){const s=X.XS.sel[num];if(!s)return true;X.XS.free={num,sh:s.sh,a:addrOf(s.r,s.c)};X.XS.calc[num]=null;X.rerender();setTimeout(()=>open(num),60);return true;}open(num);return true;}
    case 'dxrpshut':shut(num,false);return true;
    case 'dxrpdock':shut(num,true);return true;
    case 'dxrpvent':{const v=document.getElementById('dx-vent');if(!v)return true;if((window.innerWidth||1000)<=700&&RS.flt[num])shut(num,false);const G=geo();
      if(G&&G.beside&&G.s.contains(v))G.s.scrollTo({top:Math.max(0,G.s.scrollTop+v.getBoundingClientRect().top-G.s.getBoundingClientRect().top-4),behavior:'smooth'});else try{v.scrollIntoView({block:'start',behavior:'smooth'});}catch(e){}flash(v);return true;}
    case 'dxrptool':{if(!canEdit||!M)return true;openTool(a,M,arg||null);return true;}
    case 'dxrpclose':closeTool(num);return true;
    case 'dxrpmode':{const T=tool(num);const CP=X.compsOf(a);if(!T||!CP||!M)return true;const m=arg==='grp'?'grp':'dn';if(T.mode===m)return true;const n=cfgNew(a,M,CP,m);n.id=T.id;n.nom=T.nom;n.nomSet=T.nomSet&&!!T.id;RS.tool[num]=n;refreshTool(num);return true;}
    case 'dxrpsel':{const T=tool(num);if(!T||!M)return true;const L=linesOf(a,M).filter(l=>l.isMl&&l.q>0);
      if(arg==='all')L.forEach(l=>{T.sel[l.a]=true;});else if(arg==='none')T.sel={};else{const d=+String(arg).replace(/\D/g,'');const ls=L.filter(l=>lineDn(T,l)===d);const all=ls.every(l=>T.sel[l.a]);ls.forEach(l=>{if(all)delete T.sel[l.a];else T.sel[l.a]=true;});}refreshTool(num,'soft');return true;}
    case 'dxrpks':{const T=tool(num);const CP=X.compsOf(a);if(!T||!CP)return true;const rest=restFn(a,CP,T.id);if(arg==='none')T.ks={};else CP.list.forEach(c=>{if((arg==='dn')===!!c.dn&&rest(c.k)>1e-9)T.ks[c.k]=true;});refreshTool(num,'soft');return true;}
    case 'dxrpapply':{if(!canEdit||!M)return true;const T=tool(num);const CP=X.compsOf(a);if(!T||!CP)return true;const plan=planOf(a,M,CP,T);const n=plan.rows.filter(r=>r.parts.length).length;
      if(!n){X.say('Rien à répartir : coche des lignes et ce qu\'on y glisse (des composantes qui ont un reste)');return true;}const D=a.dpgf||{};const old=T.id?(D.reps||[]).find(r=>r.id===T.id):null;
      const rec={id:old?old.id:'R'+Date.now().toString(36)+Math.random().toString(36).slice(2,5),nom:String((T.nomSet?T.nom:autoName(T,plan,D))||'Répartition au ml').slice(0,80),sh:plan.LS.length?plan.LS[0].sh:'',
        lignes:plan.LS.filter(l=>T.sel[l.a]).map(l=>l.a),ks:Object.keys(T.ks).filter(k=>T.ks[k]&&CP.by.has(k)),mode:T.mode,com:{mode:T.com.mode==='ligne'?'ligne':'prorata',ligne:T.com.ligne||null},orphan:!!T.orphan,
        qs:Object.fromEntries(Object.keys(T.qs).filter(k=>T.ks[k]&&T.qs[k]!==''&&T.qs[k]!==undefined&&isFinite(+T.qs[k])).map(k=>[k,Math.round(+T.qs[k]*1000)/1000])),dnOf:Object.fromEntries(Object.keys(T.dnOf).filter(x=>T.dnOf[x]!==''&&T.dnOf[x]!==undefined).map(x=>[x,+T.dnOf[x]])),col:old?old.col:freeCol(D)};
      commit(a,M,CP,rec.id,plan,rec);closeTool(num);X.say('⇶ '+rec.nom+' : '+n+' ligne'+(n>1?'s':'')+', '+eur(plan.tot,2)+' répartis'+(Math.abs(plan.gap)>=0.005?' · écart d\'arrondi '+eur(plan.gap,2):'')+' — ↶ pour revenir');X.rerender();return true;}
    case 'dxrpredo':{if(!canEdit||!M)return true;const CP=X.compsOf(a);const R=((a.dpgf||{}).reps||[]).find(r=>r.id===arg);if(!CP||!R)return true;const cfg=cfgOfRep(R);cfg.qt={};const plan=planOf(a,M,CP,cfg);
      commit(a,M,CP,R.id,plan,Object.assign({},R,{ks:R.ks.filter(k=>CP.by.has(k))}));const n=plan.rows.filter(r=>r.parts.length).length;X.say('↻ '+R.nom+' refaite avec le reste actuel : '+n+' ligne'+(n>1?'s':'')+', '+eur(plan.tot,2));X.rerender();return true;}
    case 'dxrpundo':{if(!canEdit||!M)return true;const CP=X.compsOf(a);const R=((a.dpgf||{}).reps||[]).find(r=>r.id===arg);if(!CP||!R)return true;commit(a,M,CP,R.id,null,null);X.say('✕ '+R.nom+' défaite : parts retirées, PU réécrits (↶ pour revenir)');X.rerender();return true;}
    /* 16/10 (lot C2) : « ⇶ Mettre le reste au ml » (fenêtre courte, section 11) */
    case 'dxrpsimple':{if(!canEdit||!M)return true;closeTool(num);RS.simple[num]={orph:false};const card=document.getElementById('dx-card');if(card)card.insertAdjacentHTML('beforeend',simpleHTML(a,M,true));
      setTimeout(()=>{const b=document.querySelector('#rp-simple .rp-btns .primary:not([disabled])')||document.querySelector('#rp-simple .rp-hd button');if(b)try{b.focus({preventScroll:true});}catch(e){}},30);return true;}
    case 'dxrpsimplex':closeSimple(num);return true;
    case 'dxrpsimplecustom':{if(!canEdit||!M)return true;const CP=X.compsOf(a);const S=RS.simple[num]||{};closeSimple(num);if(!CP){openTool(a,M,null);return true;}RS.tool[num]=cfgSimple(a,M,CP,S.orph);
      const card=document.getElementById('dx-card');if(card)card.insertAdjacentHTML('beforeend',toolHTML(a,M,true));return true;}
    case 'dxrpsimpleok':{if(!canEdit||!M)return true;const CP=X.compsOf(a);const S=RS.simple[num];if(!CP||!S)return true;const cfg=cfgSimple(a,M,CP,S.orph);const plan=planOf(a,M,CP,cfg);const n=plan.rows.filter(r=>r.parts.length).length;
      if(!n){X.say('Rien à mettre au ml : pas de ligne au ml où un DN est lu, ou tout est déjà pointé');return true;}const D=a.dpgf||{};
      const rec={id:'R'+Date.now().toString(36)+Math.random().toString(36).slice(2,5),nom:cfg.nom,sh:plan.LS.length?plan.LS[0].sh:'',lignes:plan.LS.filter(l=>cfg.sel[l.a]).map(l=>l.a),ks:Object.keys(cfg.ks).filter(k=>cfg.ks[k]&&CP.by.has(k)),mode:'dn',com:{mode:'prorata',ligne:null},orphan:!!cfg.orphan,qs:{},dnOf:{},col:freeCol(D)};
      commit(a,M,CP,rec.id,plan,rec);closeSimple(num);X.say('⇶ '+rec.nom+' : '+eur(plan.tot,2)+' mis au ml sur '+n+' ligne'+(n>1?'s':'')+(Math.abs(plan.gap)>=0.005?' · écart d\'arrondi '+eur(plan.gap,2):'')+' — ↶ pour revenir');X.rerender();return true;}}
  return false;}
/* ═════════ 11 · « ⇶ METTRE LE RESTE AU ML » (16/10, lot C2) ═════════
   Ethan (16/10) : « « répartir au ml » incompréhensible aussi, trop compliqué je pense ». Une fenêtre courte, en phrases : tout ce qui n'est pas encore pointé va sur
   les lignes au ml où un DN est lu (pas celles au PU saisi à la main) : soudures, manchons et autocontrôles d'un DN sur les lignes de ce DN, le reste (installations,
   épreuves…) au prorata des ml de toutes ces lignes ; ce qui ne trouve pas de ligne est dit (et peut suivre le prorata, une case) ; « Mettre le reste au ml » = une
   répartition comme les autres (a.dpgf.reps, mode « par DN », nom « Reste au ml » : refaire / défaire dans la ventilation, un seul ↶) ; « Personnaliser… » = l'outil
   détaillé (section 6, inchangé), pré-rempli avec la même proposition. */
RS.simple={};
const simpleName=a=>{const n=((a.dpgf||{}).reps||[]).filter(r=>/^Reste au ml/.test(r.nom||'')).length;return 'Reste au ml'+(n?' n° '+(n+1):'');};
function cfgSimple(a,M,CP,orph){const c=cfgNew(a,M,CP,'dn');const rest=restFn(a,CP,null);c.ks={};CP.list.forEach(x=>{if(rest(x.k)>1e-9)c.ks[x.k]=true;});c.orphan=!!orph;c.com={mode:'prorata',ligne:null};c.nom=simpleName(a);c.nomSet=true;return c;}
function closeSimple(num){RS.simple[num]=null;const o=document.getElementById('rp-ov');if(o&&o.querySelector('#rp-simple'))o.remove();}
function refreshSimple(num){const el=document.getElementById('rp-simple');const a=X.affOf(num);const M=a&&X.modelOf(a);if(!el||!a||!M)return;const t=document.createElement('div');t.innerHTML=simpleHTML(a,M,X.XS.canEdit);const n=t.querySelector('#rp-simple');if(n)el.replaceWith(n);}
function simpleHTML(a,M,canEdit){const S=RS.simple[a.num];if(!S||!canEdit||!M)return '';css(document);const CP=X.compsOf(a);let body='',n=0,plan=null;
  const hd=`<div class="rp-hd"><h3>⇶ Mettre le reste au ml</h3><button class="btn sm" data-act="af" data-v="dxrpsimplex|" aria-label="Fermer">✕</button></div>`;
  if(!CP)body=`<div class="eq-s">Pas encore de chiffrage complet (zones, postes) : fais le chiffrage à l'étape 4, puis reviens ici.</div>`;
  else{const cfg=cfgSimple(a,M,CP,S.orph);plan=planOf(a,M,CP,cfg);const rest=restFn(a,CP,null);const R=CP.list.reduce((s,c)=>s+rest(c.k)*c.puV,0);n=plan.rows.filter(r=>r.parts.length).length;
    if(R<1)body=`<p class="c2r-p"><b style="color:#15803d">✓ Tout notre prix est déjà pointé</b> : il n'y a rien à mettre au ml.</p>`;
    else{const tg=plan.tgt;const ml=tg.reduce((s,l)=>s+l.q,0);const out=plan.LS.filter(l=>l.isMl&&l.q>0&&!cfg.sel[l.a]);const unAmt=plan.unDn.reduce((s,u)=>s+u.amt,0)+plan.unCom+(X.ZN?X.ZN.unZAmt(plan,CP):0);
      body=`<p class="c2r-p">Tout ce qui n'est pas encore pointé (<b>${eur(R)}</b>) va sur les lignes au ml : <b>soudures, manchons et autocontrôles d'un DN sur les lignes de ce DN</b>, ${X.ZN&&X.ZN.on(CP)?X.ZN.repTxt(CP):'le reste (installations, épreuves…) <b>au prorata des ml de toutes les lignes</b>' /* (lot DZ) */}.</p>
        <p class="c2r-p">${tg.length?`Lignes qui reçoivent : <b>${tg.length} ligne${tg.length>1?'s':''} au ml</b> où un DN est lu (${nb(ml)} ml). Ce qu'elles ont déjà ne bouge pas : elles reçoivent en plus.`:'⚠ Aucune ligne au ml où un DN est lu : rien ne peut aller au ml (« Personnaliser… » pour choisir les lignes).'}${out.length?` Ne bougent pas : ${out.slice(0,6).map(l=>esc(l.n||l.a)).join(', ')}${out.length>6?'…':''} (PU saisi à la main ou DN illisible).`:''}</p>
        ${plan.byDn.length?`<div class="c2r-dns">${plan.byDn.map(x=>`<div class="c2r-dn"><b>DN ${x.dn}</b> : ${x.amt>0.004?'<b>+ '+nb(x.pm,2)+' € / ml</b>':'rien à ajouter'} sur ${x.n} ligne${x.n>1?'s':''} <span class="dim">· ${nb(x.ml)} ml${x.amt>0.004?' · '+eur(x.amt):''}</span></div>`).join('')}</div>`:''}
        ${unAmt>0.5?`<div class="rp-un"><b>⚠ Ce qui ne trouve pas de ligne : ${eur(unAmt)}</b>${plan.unDn.map(u=>`<span>DN ${u.dn} : aucune ligne au ml de ce DN — ${[u.soud?fq(u.soud)+' soud.':'',u.manch?fq(u.manch)+' manch.':''].filter(Boolean).join(', ')}, ${eur(u.amt)}</span>`).join('')}${plan.unCom>0.004?`<span>installations, épreuves… : aucune ligne pour les recevoir — ${eur(plan.unCom)}</span>`:''}${X.ZN?X.ZN.unZHTML(plan,CP):''}<span class="dim">À placer au calculateur sur une ligne, ou avec « Personnaliser… ».</span></div>`:''}
        ${plan.unDn.length||S.orph||(X.ZN&&X.ZN.unZAmt(plan,CP)>0.004)?`<label class="rp-orph"><input type="checkbox" data-rp="sorph"${S.orph?' checked':''}> mettre aussi ce qui n'a pas de ligne de son DN${X.ZN&&X.ZN.on(CP)?' (et les installations d\'une zone sans ligne au ml)':''} au prorata des ml de toutes les lignes</label>`:''}
        <p class="c2r-p dim">Ensuite : la ventilation la montre (« ⇶ Répartitions au ml ») avec ↻ Refaire et ✕ Défaire ; ↶ annule tout d'un coup.</p>`;}}
  const ft=`<div class="rp-ft"><span class="rp-tot">${n?`<b>${eur(plan.tot,2)}</b> sur ${n} ligne${n>1?'s':''}${Math.abs(plan.gap)>=0.005?' · écart d\'arrondi '+(plan.gap<-0.004?'−':'')+eur(Math.abs(plan.gap),2):''}`:''}</span><span class="rp-btns"><button class="btn sm" data-act="af" data-v="dxrpsimplex|">Annuler</button>${CP?`<button class="btn sm" data-act="af" data-v="dxrpsimplecustom|" title="L'outil détaillé : choisir les lignes, ce qu'on y met, les quantités">Personnaliser…</button>`:''}<button class="btn sm primary" data-act="af" data-v="dxrpsimpleok|"${n?'':' disabled'}>⇶ Mettre le reste au ml</button></span></div>`;
  return `<div class="rp-ov" id="rp-ov"><div class="rp-dlg c2r-dlg" id="rp-simple" role="dialog" aria-modal="true" aria-label="Mettre le reste au ml">${hd}<div class="rp-body">${body}</div>${ft}</div></div>`;}
/* ═════════ 9 · SAISIES (calculateur en ml, outil), Échap ═════════ */
let WIRED=false;export function wire(){if(WIRED||!docOK())return;WIRED=true;
  document.addEventListener('input',e=>{const t=e.target;if(!t||!t.dataset)return;const num=X.XS.num;if(!num)return;
    if((t.dataset.rp==='cqml'||t.dataset.dx==='cq')&&t.closest('#dx-calc')){const a=X.affOf(num);const M=a&&X.modelOf(a);const CP=a&&X.compsOf(a);if(!M||!CP)return;const T=X.calcTarget(a,M);if(!T)return;const C=X.calcState(a,T,M);const k=t.dataset.k;const c=CP.by.get(k);if(!c||!perMl(c))return;const row=t.closest('.dx-cr');
      if(t.dataset.dx==='cq'){if(C.mlt)delete C.mlt[k];const mi=row&&row.querySelector('[data-rp="cqml"]');if(mi)mi.value=fin1(toMl(c,X.parseQ(t.value,c)));return;}
      const m=numIn(t.value);C.mlt=C.mlt||{};C.mlt[k]=t.value;C.chk[k]=m===null?'':fin(fromMl(c,m));const qi=row&&row.querySelector('[data-dx="cq"]');if(qi)qi.value=C.chk[k];const b=row&&row.querySelector('b[data-amt]');if(b)b.textContent=eur(X.parseQ(C.chk[k],c)*c.puV,2);
      const q=X.parseQ(C.q,{qty:0});const amt=X.calcSum(a,CP,C);const res=document.getElementById('dx-cres');if(res)res.innerHTML=X.calcResHTML(a,T,C,amt,q,q>0?amt/q:0,X.linkAt(a,T.sh,T.a),!X.XS.canEdit);return;}
    if(!t.closest('#rp-tool'))return;const T=tool(num);if(!T)return;const a=X.affOf(num);const CP=a&&X.compsOf(a);if(!CP)return;const k=t.dataset.k;const c=k&&CP.by.get(k);
    if(t.dataset.rp==='nom'){T.nom=t.value;T.nomSet=true;return;}
    if(t.dataset.rp==='q'&&c){T.qt[k]=t.value;delete T.qm[k];const v=X.parseQ(t.value,c);if(String(t.value).trim()==='')delete T.qs[k];else T.qs[k]=v;const mi=t.parentElement&&t.parentElement.querySelector('[data-rp="qml"]');if(mi&&perMl(c))mi.value=fin1(toMl(c,v));refreshTool(num,false);return;}
    if(t.dataset.rp==='qml'&&c&&perMl(c)){T.qm[k]=t.value;const m=numIn(t.value);if(m===null){delete T.qs[k];delete T.qt[k];}else{T.qs[k]=fromMl(c,m);T.qt[k]=fin(T.qs[k]);}const qi=t.parentElement&&t.parentElement.querySelector('[data-rp="q"]');if(qi)qi.value=T.qt[k]!==undefined?T.qt[k]:'';refreshTool(num,false);return;}});
  document.addEventListener('change',e=>{const t=e.target;if(!t||!t.dataset)return;const num=X.XS.num;
    if(t.dataset.rp==='auto'){AUTO=!!t.checked;try{localStorage.setItem(LS_AUTO,AUTO?'1':'0');}catch(x){}document.querySelectorAll('[data-rp="auto"]').forEach(x=>{x.checked=AUTO;});chip();return;}
    if(t.dataset.rp==='cqml'&&t.closest('#dx-calc')){const a=X.affOf(num);if(a)X.refreshSide(a);return;}
    if(!num||!t.closest('#rp-tool'))return;const T=tool(num);if(!T)return;const d=t.dataset.rp;
    if(d==='ln'){if(t.checked)T.sel[t.dataset.a]=true;else delete T.sel[t.dataset.a];}
    else if(d==='dn'){if(t.value==='')delete T.dnOf[t.dataset.a];else{T.dnOf[t.dataset.a]=+t.value;T.sel[t.dataset.a]=true;}}
    else if(d==='ck'){if(t.checked)T.ks[t.dataset.k]=true;else{delete T.ks[t.dataset.k];delete T.qs[t.dataset.k];delete T.qt[t.dataset.k];delete T.qm[t.dataset.k];}}
    else if(d==='cm'){T.com.mode=t.value==='ligne'?'ligne':'prorata';}else if(d==='cl'){T.com.ligne=t.value;T.com.mode='ligne';}else if(d==='orph'){T.orphan=!!t.checked;}
    else if(d==='q'||d==='qml'){refreshTool(num,'pv');return;}else if(d==='nom'){T.nom=t.value;T.nomSet=true;return;}else return;refreshTool(num,'soft');});
  document.addEventListener('change',e=>{const t=e.target;if(!t||!t.dataset||t.dataset.rp!=='sorph')return;const num=X.XS.num;const S=num&&RS.simple[num];if(!S)return;S.orph=!!t.checked;refreshSimple(num);}); /* 16/10 (lot C2) */
  document.addEventListener('keydown',e=>{if(e.key!=='Escape')return;const num=X.XS.num;if(!num)return;if(tool(num)){e.preventDefault();closeTool(num);return;}if(RS.simple[num]){e.preventDefault();closeSimple(num);return;}
    if(RS.flt[num]&&!X.XS.full&&!X.XS.edit&&!document.querySelector('#modal.show')){const ae=document.activeElement;if(ae&&/^(INPUT|SELECT|TEXTAREA)$/.test(ae.tagName)&&!ae.closest('#dx-calc'))return;shut(num,false);}});
  window.addEventListener('resize',()=>{clearTimeout(wire.t);wire.t=setTimeout(()=>{fitFlt();chip();},150);});
  let raf=0;document.addEventListener('scroll',()=>{if(raf||!document.querySelector('#dx-card .dx-split.flt'))return;raf=requestAnimationFrame(()=>{raf=0;fitFlt();});},{capture:true,passive:true});}
/* ═════════ 10 · CSS (injectée : <style id="css-lot-r">) ═════════ */
const FLT=s=>`${s}{grid-template-columns:minmax(0,1fr) minmax(320px,36%)}${s}>.dx-side{display:contents}${s}>.dx-grid{grid-column:1;grid-row:1}${s}>.dx-side>*{grid-column:1/-1;min-width:0}
${s}>.dx-side>.dx-calc{grid-column:2;grid-row:1;position:sticky;top:6px;z-index:5;max-height:var(--rph,min(calc(var(--dxh,62vh) + 38px),calc(100vh - 12px)));display:flex;flex-direction:column;overflow:auto;border:2px solid #1e7145;box-shadow:0 8px 26px rgba(0,0,0,.16);padding-top:8px}
${s} .dx-calc>*{flex:none}${s} .dx-calc>h4{order:-6;padding-right:186px;min-height:34px;margin:0 0 2px}${s} .dx-calc>.rp-ch{order:-5;margin:0 0 4px}${s} .dx-calc>.dx-ln{order:-4;margin-bottom:4px;font-size:12px}${s} .dx-calc>.dx-res{order:-3;margin:0 0 6px;padding:5px 8px;gap:4px 10px}${s} .dx-calc .dx-res b.pu{font-size:16px}${s} .dx-calc>.dx-q{order:-2;margin:0 0 4px}
.eq-app ${s} .dx-calc .btn.sm{min-height:34px;padding:2px 9px}
${s} .dx-calc .dx-cl{flex:1 1 auto;min-height:90px;max-height:none}${s} .rp-fo{display:flex}${s}.rplow>.dx-side>.dx-calc{visibility:hidden}`;
const SHEET=s=>`${s}{grid-template-columns:minmax(0,1fr)}${s}>.dx-side>.dx-calc{position:fixed;left:0;right:0;bottom:0;top:auto;z-index:75;max-height:60vh;visibility:visible;margin:0;border-radius:16px 16px 0 0;border:0;border-top:3px solid #1e7145;box-shadow:0 -10px 30px rgba(0,0,0,.25);padding:10px 12px calc(12px + env(safe-area-inset-bottom))}${s} .dx-calc>h4{padding-right:0;min-height:0}${s} .rp-fbar{position:static;order:-7;justify-content:flex-end;margin:-2px 0 4px}`;
const CSS_R=`
.dx-calc{position:relative}.rp-fo{display:none}.rp-fbar{position:absolute;top:6px;right:6px;gap:4px;z-index:2}.rp-fbar .btn{min-height:34px}
.rp-ch{display:flex;flex-wrap:wrap;gap:4px 8px;align-items:center;margin:0 0 6px;font-size:12.5px;color:#444}.rp-ch .rp-rc{flex:1 1 170px;min-width:0}.eq-app .rp-ch .btn.sm{min-height:34px}
.rp-auto{display:inline-flex;gap:5px;align-items:center;font-size:12px;color:#555;white-space:nowrap;min-height:34px;cursor:pointer}.eq-app .rp-auto input{width:18px;height:18px;min-height:0;margin:0}
.eq-app .dx-cr .dx-cq input[data-rp=cqml]{width:84px}
.rp-parts{border:1px dashed #94a3b8;border-radius:8px;padding:6px 8px;margin:0 0 6px;background:#f8fafc;font-size:12px}.rp-ph{font-weight:700;color:#334155}.rp-ph .dim{font-weight:400}.rp-pl span{display:block;color:#444}
.rp-tag{display:inline-flex;align-items:center;border:1px solid #cbd5e1;border-radius:999px;padding:0 7px;font-size:11px;color:#334155;background:#f8fafc;white-space:nowrap}
.rp-flash{animation:rpfl .5s ease-out 0s 2}@keyframes rpfl{0%{box-shadow:0 0 0 0 rgba(30,113,69,.65)}60%{box-shadow:0 0 0 8px rgba(30,113,69,.18)}100%{box-shadow:0 0 0 0 rgba(30,113,69,0)}}
.eq-app .rp-chip,.rp-chip{min-height:0;position:absolute;z-index:4;display:inline-flex;align-items:center;gap:4px;height:28px;padding:0 11px;margin:0;border-radius:999px;border:2px solid #fff;background:#1e7145;color:#fff;font:700 12.5px/1 system-ui,-apple-system,"Segoe UI",Roboto,sans-serif;box-shadow:0 3px 12px rgba(0,0,0,.3);cursor:pointer;white-space:nowrap;animation:rppop .16s ease-out}
.rp-chip:hover{background:#155c37}.rp-chip[hidden]{display:none}@keyframes rppop{from{transform:scale(.6);opacity:0}to{transform:scale(1);opacity:1}}
@media (pointer:coarse),(max-width:700px){.eq-app .rp-chip,.rp-chip{height:36px;padding:0 14px;font-size:14px}}
${FLT('.dx-split.flt:not(.side)')}
@container (max-width:1099.98px){${FLT('.dx-split.flt.side')}}
@media (max-width:700px){${SHEET('.dx-split.flt:not(.side)')}@container (max-width:1099.98px){${SHEET('.dx-split.flt.side')}}}
.rp-ov{position:fixed;inset:0;z-index:78;background:rgba(15,23,42,.45);display:flex;align-items:flex-start;justify-content:center;padding:3vh 14px;overscroll-behavior:contain}
.rp-dlg{background:var(--surface,#fff);border-radius:14px;box-shadow:0 20px 60px rgba(0,0,0,.35);width:min(1120px,100%);height:94vh;max-height:94vh;display:flex;flex-direction:column;overflow:hidden;font-size:13px}
.rp-hd{display:flex;align-items:center;gap:8px;padding:10px 14px;border-bottom:1px solid #e5e7eb}.rp-hd h3{margin:0;font-size:16px;flex:1;min-width:0}.rp-hd .btn{min-height:36px;min-width:36px}
.rp-modes{display:flex;gap:6px 6px;flex-wrap:wrap;align-items:center;padding:8px 14px 0}.rp-modes .btn.on,.rp-chips .btn.on{background:#1f3864;color:#fff;border-color:#1f3864}.rp-modes .hint{flex:1 1 260px}
.eq-app .rp-dlg .btn.sm{min-height:34px}
.rp-body{overflow:auto;padding:4px 14px 12px;flex:1 1 auto;overscroll-behavior:contain}
.rp-sec{margin:10px 0 4px}.rp-sec>h4{margin:0 0 6px;font-size:14px}.rp-chips{display:flex;flex-wrap:wrap;gap:4px;margin:0 0 6px}
.rp-lines{border:1px solid #e5e7eb;border-radius:8px;max-height:32vh;overflow:auto}
.rp-ln{display:grid;grid-template-columns:24px 44px minmax(0,1fr) 112px 78px 132px;gap:2px 8px;align-items:center;padding:3px 8px;border-top:1px solid #f1f1f1;cursor:pointer;min-height:36px}.rp-ln:first-child{border-top:0}
.rp-ln.on{background:#eef6f1}.rp-ln.off{opacity:.55}.rp-ln .des{overflow:hidden;text-overflow:ellipsis;white-space:nowrap}.rp-ln .ml{text-align:right;white-space:nowrap}.rp-ln .st{font-size:12px;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}
.eq-app .rp-ln input[type=checkbox],.eq-app .rp-c input[type=checkbox],.eq-app .rp-orph input,.eq-app .rp-com input[type=radio]{width:18px;height:18px;min-height:0;margin:0}
.eq-app .rp-ln select{min-height:34px;padding:2px 4px;font-size:12.5px;width:100%}.rp-ln select.need{border-color:#d97706}.rp-dnt{color:#555}
.rp-lk{color:var(--lk);font-weight:700}.rp-man{color:#9a3412}
.rp-cols{display:grid;grid-template-columns:minmax(0,1fr) minmax(0,1fr);gap:10px}@media (max-width:860px){.rp-cols{grid-template-columns:minmax(0,1fr)}}
.rp-grp{border:1px solid #e5e7eb;border-radius:8px;padding:6px 8px;min-width:0}.rp-gt{font-weight:700;margin:0 0 4px}.rp-gh{font-size:11.5px;font-weight:700;color:#555;text-transform:uppercase;letter-spacing:.02em;margin:6px 0 2px}
.rp-c{border-top:1px solid #f3f3f3;padding:3px 0}.rp-c>label{display:flex;flex-wrap:wrap;gap:2px 8px;align-items:center;cursor:pointer;min-height:34px}.rp-c .nm{font-weight:600}.rp-c small{color:#666;flex-basis:100%;padding-left:26px}.rp-c.on{background:#f6faf7}
.rp-take{display:flex;flex-wrap:wrap;gap:4px 6px;align-items:center;padding:2px 0 4px 26px;color:#444}.eq-app .rp-take input{width:86px;min-height:34px;padding:2px 6px}.rp-dest{color:#14532d}
.rp-com{display:flex;flex-wrap:wrap;gap:4px 10px;align-items:center;margin-top:8px;padding-top:6px;border-top:1px dashed #ddd}.rp-com label{display:inline-flex;gap:5px;align-items:center;min-height:34px}.eq-app .rp-com select{min-height:34px;max-width:100%;min-width:0;flex:1 1 220px}
.rp-pvw{overflow:auto;border:1px solid #e5e7eb;border-radius:8px;max-height:36vh}.rp-pvt{border-collapse:separate;border-spacing:0;width:100%;font-size:12.5px}.rp-pvt th,.rp-pvt td{padding:4px 6px;border-bottom:1px solid #f0f0f0;text-align:right;white-space:nowrap}
.rp-pvt th{position:sticky;top:0;background:#f5f5f2;font-size:11.5px;color:#444}.rp-pvt .l{text-align:left;white-space:normal;min-width:180px}.rp-pvt td.add{color:#14532d;font-weight:700}.rp-pvt td.pu{font-weight:700}.rp-pvt tr.nil td{color:#888}
.rp-dns{display:flex;flex-wrap:wrap;gap:4px 14px;margin:6px 0;font-size:12.5px}.rp-dn{white-space:nowrap}
.rp-un{background:#fff7e6;border:1px solid #f3c27a;border-radius:8px;padding:6px 8px;margin:6px 0;font-size:12.5px;display:flex;flex-direction:column;gap:2px}.rp-orph{display:inline-flex;gap:6px;align-items:center;min-height:34px;font-size:12.5px}
.rp-ft{display:flex;flex-wrap:wrap;gap:6px 12px;align-items:center;padding:8px 14px;border-top:1px solid #e5e7eb;background:#fafaf8}.rp-nom{display:inline-flex;gap:6px;align-items:center;flex:1 1 220px;min-width:0}.eq-app .rp-nom input{min-height:34px;flex:1;min-width:0}
.rp-tot{flex:1 1 260px;font-size:12.5px}.rp-btns{display:flex;gap:6px;margin-left:auto}.rp-ft .btn.primary[disabled]{opacity:.5}
.rp-reps{margin-top:6px}.rp-rep{display:flex;flex-wrap:wrap;gap:4px 8px;align-items:center;border:1px solid #eee;border-left:4px solid var(--lk);border-radius:8px;padding:5px 8px;margin-top:4px;font-size:12.5px}.rp-acts{display:flex;flex-wrap:wrap;gap:4px;margin-left:auto}
.rp-rep .btn.sm,.dx-vsum .btn.sm{min-height:34px}
.rp-w{color:#b45309}
@media (max-width:700px){.rp-ov{padding:0}.rp-dlg{max-height:none;height:100%;border-radius:0;width:100%}
  .rp-ln{grid-template-columns:24px minmax(0,1fr) 116px;grid-template-areas:"c n n" "c d dn" "c ml st"}.rp-ln>input{grid-area:c}.rp-ln .n{grid-area:n}.rp-ln .des{grid-area:d;white-space:normal}.rp-ln select,.rp-ln .rp-dnt{grid-area:dn}.rp-ln .ml{grid-area:ml;text-align:left}.rp-ln .st{grid-area:st;text-align:right}
  .rp-pvt th:nth-child(3),.rp-pvt td:nth-child(3){display:none}.rp-pvt .l{min-width:130px}.rp-btns{width:100%}.rp-btns .btn{flex:1}}
`;
export function css(doc){doc=doc||(docOK()?document:null);if(!doc||doc.getElementById('css-lot-r'))return;const s=doc.createElement('style');s.id='css-lot-r';s.textContent=CSS_R;doc.head.appendChild(s);}
/* décaler les adresses des répartitions quand on insère / supprime des lignes (comme les liens) */
export function shiftReps(reps,T,mv){const mk=o=>{const m={};Object.keys(o||{}).forEach(k=>{const k2=mv(k);if(k2!==null)m[k2]=o[k];});return m;};
  return reps.map(R=>up(R.sh||'')!==T&&R.sh?R:Object.assign({},R,{lignes:(R.lignes||[]).map(mv).filter(Boolean),com:R.com&&R.com.ligne?Object.assign({},R.com,{ligne:mv(R.com.ligne)}):R.com,dnOf:mk(R.dnOf)}));}
