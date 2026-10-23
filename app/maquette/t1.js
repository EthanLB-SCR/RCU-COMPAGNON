// t1.js — 14/10 soir (lot T1) : TRACEUR, retours d'Ethan du 14/10 au soir. Branché sur maquette/main.js par des appels courts (T1.xxx), tout le reste est ici :
//  1 · extrémités de ligne (catalogue : extremites.js) — listes groupées aux deux bouts, repère au bout de chaque ligne (cliquable → fiche du bout), tableau type × DN ;
//  2 · contexte ÉTUDE (tracé d'une affaire en chiffrage, contexte « aff: ») — tranche ferme / option n, versions du chiffrage (v0 / vm, couleur par version, légende),
//      ni marché ni écarts ni TS. En contexte chantier rien de cela ne change ;
//  3 · nom de ligne — étiquette posée LE LONG de la ligne (une antenne avait son nom écrit sur la parente, au té, au milieu des pièces de la parente) ; le nom tapé
//      s'applique aussi à Entrée et en quittant le champ (avant : seulement avec le bouton « Renommer », sinon il était perdu sans rien dire) ;
//  4 · annuler / rétablir étape par étape (historique.js) ;
//  5 · sélection au rectangle → zones de chiffrage (contrat C4) ;
//  6 · règles de dilatation indicatives (tableau Lmax du pack SCR : src/regles.js, contrat C7).
// État propre au lot, rangé PAR CONTEXTE (comme le dessin) sous trace:maquette:t1[:contexte] : cv (version courante du chiffrage) et zones de chiffrage.
import {normEnd,endKindOf,isBypassEnd,endLabel,endTxt,endAbbr,endColor,endOrder,endOptionsHTML,END_HELP} from './extremites.js';
import {makeHistory} from './historique.js';
import {polyLen,ptAt,fmt,pvLabel} from './traceur.js';
import {reglesCheck,reglesSummary,lmaxOf,REGLES_LS,reglesFromStore} from '../src/regles.js';import {kv} from '../src/kv.js';import * as DX from './dilatx.js'; // 16/10 (lot TA) : tableau relu dans le registre de l'appareil, contrôle dit ligne par ligne
import {tbInit} from './tversions.js'; // 16/10 soir (lot TB) : version par tronçon (l.sv), ce qui a été supprimé reste grisé (l.del, lignes fantômes), historique des versions (🕑)
// couches d'affichage ajoutées au menu 👁 (cochées par défaut)
export const T1_SHOW=[['ext','Extrémités (PEC, Kit, SST… au bout des lignes)'],['versions','Versions du chiffrage (étude : couleur par version)'],['zones','Zones de chiffrage (surbrillance)'],['dilat','Dilatation : tronçons trop longs (indicatif)']];
// couleurs par version (v1 = couleurs normales aller / retour) : [aller, retour]
const VER=[['#e8710a','#a34e05'],['#8e44ad','#5b2c70'],['#0f9d58','#0a6b3c'],['#d6336c','#9c1f4d'],['#00838f','#005961'],['#8d6e63','#5d4037'],['#b59a00','#7a6800'],['#5c6bc0','#3949ab']];
export const verColor=v=>v>1?VER[(v-2)%VER.length]:null;
const ZCOL=['#4fc3f7','#81c784','#ffb74d','#ba68c8','#f06292','#4db6ac','#aed581','#90a4ae'];
const R4=v=>Math.round(v*1e4)/1e4;
const f2=v=>Number(v).toLocaleString('fr-FR',{minimumFractionDigits:2,maximumFractionDigits:2});
const v0Of=l=>Math.max(1,parseInt(l&&l.v0,10)||1),vmOf=l=>Math.max(1,parseInt(l&&l.vm,10)||v0Of(l)); // tracé d'avant (sans v0) : v0 = vm = 1
const trOf=l=>l&&l.tranche==='option'?'option':'ferme',optOf=l=>Math.max(1,parseInt(l&&l.option,10)||1);
const dnAtEnd=l=>{const reds=(l.specials||[]).filter(s=>s.type==='reducer'&&s.dn2).sort((a,b)=>a.m-b.m);return reds.length?reds[reds.length-1].dn2:l.dn;};
function normZones(z){const seen=new Set();return (Array.isArray(z)?z:[]).filter(x=>x&&x.id).map(x=>({id:String(x.id),nom:String(x.nom||x.id),lines:(Array.isArray(x.lines)?x.lines:[]).map(String).filter(id=>!seen.has(id)&&seen.add(id)),...(x.ch?{ch:String(x.ch)}:{})}));} /* 16/10 (lot TA, K4) : ch = id de la zone du chiffrage reliée */
// portion [m0, m1] d'un axe
function subPoly(pts,m0,m1){const out=[];const a=ptAt(pts,m0);out.push([a.x,a.y]);let acc=0;for(let i=1;i<pts.length;i++){acc+=Math.hypot(pts[i][0]-pts[i-1][0],pts[i][1]-pts[i-1][1]);if(acc>m0&&acc<m1)out.push(pts[i].slice());}const b=ptAt(pts,m1);out.push([b.x,b.y]);return out;}
const turnAbs=(a,b,c)=>{let d=(Math.atan2(c[1]-b[1],c[0]-b[0])-Math.atan2(b[1]-a[1],b[0]-a[0]))*180/Math.PI;while(d>180)d-=360;while(d<-180)d+=360;return Math.abs(d);};
// un segment touche-t-il le rectangle ? (extrémité dedans, ou découpage de Liang–Barsky)
function segHits(a,b,x0,y0,x1,y1){const inR=p=>p[0]>=x0&&p[0]<=x1&&p[1]>=y0&&p[1]<=y1;if(inR(a)||inR(b))return true;let t0=0,t1=1;const dx=b[0]-a[0],dy=b[1]-a[1];const P=[-dx,dx,-dy,dy],Q=[a[0]-x0,x1-a[0],a[1]-y0,y1-a[1]];
  for(let i=0;i<4;i++){if(P[i]===0){if(Q[i]<0)return false;}else{const r=Q[i]/P[i];if(P[i]<0){if(r>t1)return false;if(r>t0)t0=r;}else{if(r<t0)return false;if(r<t1)t1=r;}}}return t0<=t1;}
const T1CSS=`#t1Bar{position:absolute;left:8px;top:44px;display:flex;gap:6px;z-index:6;flex-wrap:wrap}
#t1Bar .btn{min-height:34px;background:rgba(252,252,251,.96);box-shadow:0 2px 10px rgba(0,0,0,.1)}#t1Bar .btn.on{background:var(--ink);color:#fff;border-color:var(--ink)}
#t1Float{position:absolute;left:8px;top:88px;width:min(360px,calc(100% - 64px));max-height:calc(100% - 150px);overflow:auto;z-index:6;display:flex;flex-direction:column;gap:8px;pointer-events:none}
#t1Float>*{pointer-events:auto}.t1-card{background:rgba(252,252,251,.98);border:1px solid var(--line);border-radius:10px;padding:8px 10px;box-shadow:0 6px 24px rgba(0,0,0,.14);font-size:12.5px}
.t1-card h4,.t1-multi h4{margin:0 0 6px;font-size:12px;text-transform:uppercase;letter-spacing:.05em;color:var(--ink2);display:flex;align-items:center;gap:6px}.t1-card h4 span.t1-sp,.t1-multi h4 span.t1-sp{flex:1}
.t1-row{display:flex;gap:6px;flex-wrap:wrap;align-items:center;margin-top:6px}.t1-card .btn,.t1-card select.f,.t1-card input.f,.t1-multi .btn,.t1-multi select.f,.t1-multi input.f{min-height:34px}
.t1-zone{display:flex;gap:6px;align-items:center;padding:5px 0;border-bottom:1px solid var(--line);cursor:pointer}.t1-zone:last-child{border-bottom:0}.t1-zone input.f{flex:1;min-width:0;width:auto}
.t1-zone small{color:var(--ink2);white-space:nowrap}.t1-sw{display:inline-block;width:14px;height:14px;border-radius:4px;flex:none;border:1px solid rgba(0,0,0,.15)}
.t1-names{color:var(--ink2);font-size:12px;margin-top:2px;overflow:hidden;text-overflow:ellipsis;display:-webkit-box;-webkit-line-clamp:2;-webkit-box-orient:vertical}
.t1-fl-multi{display:none}#t1VerLeg{display:inline-flex;gap:6px;align-items:center;flex-wrap:wrap}#t1VerLeg i{display:inline-block;width:14px;height:5px;border-radius:2px;margin-right:3px;vertical-align:middle}
.t1-endmark,.t1-zlab{cursor:pointer}.t1-tag{display:inline-block;border-radius:999px;padding:0 6px;font-size:11px;font-weight:700;color:#fff;vertical-align:middle}
.legend{right:52px} /* la légende (avec les versions) s'arrête avant la colonne des boutons de zoom */
@media (max-width:800px){header .btn{min-height:34px}.t1-fl-multi{display:block}#t1Float{width:calc(100% - 64px);top:auto;bottom:8px;max-height:calc(100% - 100px)}.t1-hlp{display:none}} /* téléphone : fiche en bas de l'écran (sous le pouce), par-dessus la légende */`;
export function t1Init(api){const {state,esc}=api;
  const ETUDE=String(api.CTX||'').startsWith('aff:');const AFFN=ETUDE?String(api.CTX).slice(4):'';const KEY=api.SLOT('trace:maquette:t1');
  const L=id=>state.lines.find(x=>x.id===id)||null;const rules=()=>api.rules;
  /* ---------- état du lot : version courante (URL cv, sinon celle du contexte, sinon 1) et zones ---------- */
  let saved=null;try{saved=JSON.parse(localStorage.getItem(KEY)||'null');}catch(e){}
  const qcv=parseInt(api.Q0.get('cv'),10);state.cv=qcv>=1?qcv:(saved&&+saved.cv>=1?+saved.cv:1);state.zones=normZones(saved&&saved.zones);
  const persist=()=>{try{localStorage.setItem(KEY,JSON.stringify({cv:state.cv,zones:state.zones}));}catch(e){}};persist();
  try{const R=JSON.parse(localStorage.getItem('trace:maquette:slots')||'{}')||{};for(let i=localStorage.length-1;i>=0;i--){const k=localStorage.key(i);if(k&&k.startsWith('trace:maquette:t1:')&&!(k.slice(18) in R)&&k!==KEY)localStorage.removeItem(k);}}catch(e){} // contextes purgés par le traceur (au plus 8 gardés)
  /* ---------- historique : une étape par action (lignes + zones) ---------- */
  const netKey=()=>JSON.stringify([state.lines,state.zones||[]],(k,v)=>k==='autoSpecials'?undefined:k==='photo'?(v?1:0):typeof v==='number'?R4(v):v);
  const PHK=new Map(),PHV=new Map();const phIn=v=>{let k=PHK.get(v);if(!k){k='§ph'+PHK.size;PHK.set(v,k);PHV.set(k,v);}return k;}; // photos (data URL) gardées UNE fois, pas dans chacune des 60 étapes
  const take=()=>({lines:JSON.stringify(state.lines,(k,v)=>k==='photo'&&typeof v==='string'&&v.length>64?phIn(v):v),zones:JSON.stringify(state.zones||[]),key:netKey()});
  function restore(s){state.lines=JSON.parse(s.lines,(k,v)=>k==='photo'&&typeof v==='string'&&v.startsWith('§ph')?(PHV.get(v)||null):v);state.zones=normZones(JSON.parse(s.zones||'[]'));state.sel=null;state.selV=[];api.rebuild();persist();}
  const q=l=>`« ${l.name} »`;
  const spLbl=sp=>sp.type==='tee'&&sp.vert?pvLabel(sp):sp.type==='tee'?'té d\'attente':sp.type==='valve'?'vanne':sp.type==='reducer'?'réduction':sp.type||'pièce';
  // ce qui a changé entre deux états → nom de l'étape (« Annulé : … »)
  function describe(a,b){let A,B;try{A=JSON.parse(a.lines);B=JSON.parse(b.lines);}catch(e){return 'retouche';}const mA=new Map(A.map(l=>[l.id,l])),mB=new Map(B.map(l=>[l.id,l]));
    const add=B.filter(l=>!mA.has(l.id)),del=A.filter(l=>!mB.has(l.id));
    if(add.length&&!del.length)return add.length===1?(add[0].parent?'création de l\'antenne ':'création de ')+q(add[0]):`création de ${add.length} lignes`;
    if(del.length&&!add.length){if(del.length===1)return 'suppression de '+q(del[0]);const top=del.filter(l=>!l.parent||!del.some(x=>x.id===l.parent.line));return top.length===1?`suppression de ${q(top[0])} et de ses antennes`:`suppression de ${del.length} lignes`;}
    if(add.length&&del.length)return 'remplacement des lignes';
    const J=x=>JSON.stringify(x,(k,v)=>typeof v==='number'?R4(v):k==='photo'?(v?1:0):v);const ch=[];
    B.forEach(l=>{const o=mA.get(l.id);if(!o)return;const d=lineDiff(o,l);if(d)ch.push(d);});
    if(ch.length===1)return ch[0].txt;if(ch.length>1){const k=ch[0].k;return ch.every(c=>c.k===k)?`${ch[0].kl} de ${ch.length} lignes`:`retouche de ${ch.length} lignes`;}
    if(a.zones!==b.zones)return 'zones de chiffrage';return 'retouche';
    function lineDiff(o,l){const P=J(o.pts),P2=J(l.pts);
      if(o.name!==l.name)return {k:'nom',kl:'renommage',txt:`renommage de « ${o.name} » en « ${l.name} »`};
      if((o.tranche||'ferme')!==(l.tranche||'ferme')||(o.tranche==='option'&&optOf(o)!==optOf(l)))return {k:'tr',kl:'tranche',txt:`tranche de ${q(l)} : ${trOf(l)==='option'?'option '+optOf(l):'ferme'}`};
      if(o.dn!==l.dn)return {k:'dn',kl:'DN',txt:`DN de ${q(l)} (DN${o.dn} → DN${l.dn})`};
      if((o.startType||'')!==(l.startType||'')||(o.endType||'')!==(l.endType||''))return {k:'ext',kl:'extrémités',txt:`extrémité de ${q(l)} : ${(o.startType||'')!==(l.startType||'')?'départ '+endLabel(l.startType):'fin '+endLabel(l.endType)}`};
      if(!!o.pause!==!!l.pause&&P===P2)return {k:'pause',kl:'pause',txt:(l.pause?'mise en pause de ':'reprise de ')+q(l)};
      if(P!==P2){const n0=o.pts.length,n1=l.pts.length;const pre=o.pts.slice(0,Math.min(n0,n1)-1).every((p,i)=>Math.hypot(p[0]-l.pts[i][0],p[1]-l.pts[i][1])<1e-6);const L0=polyLen(o.pts),L1=polyLen(l.pts);
        if(pre&&L1<L0-0.01&&n1<=n0)return {k:'geo',kl:'tracé',txt:`raccourcissement de ${q(l)} (${fmt(L1)} m)`};if(pre&&n1>n0&&!o.pts.slice(0,n0).some((p,i)=>Math.hypot(p[0]-l.pts[i][0],p[1]-l.pts[i][1])>1e-6))return {k:'geo',kl:'tracé',txt:`prolongement de ${q(l)} (${fmt(L1)} m)`};
        if(n1===n0+1)return {k:'geo',kl:'tracé',txt:'sommet ajouté sur '+q(l)};if(n1===n0-1)return {k:'geo',kl:'tracé',txt:'sommet supprimé sur '+q(l)};if(n1>n0)return {k:'geo',kl:'tracé',txt:`${n1-n0} sommets ajoutés sur ${q(l)}`};
        const mv=o.pts.filter((p,i)=>l.pts[i]&&Math.hypot(p[0]-l.pts[i][0],p[1]-l.pts[i][1])>1e-4).length;return {k:'geo',kl:'tracé',txt:(mv===1?'sommet déplacé sur ':mv>1&&n1===n0?`${mv} sommets déplacés sur `:'tracé de ')+q(l)};}
      const S0=o.specials||[],S1=l.specials||[];if(J(S0)!==J(S1)){if(S1.length>S0.length){const n=S1.find(s=>!S0.some(x=>x.id===s.id));return {k:'sp',kl:'pièces',txt:`${n?spLbl(n):'pièce'} ajoutée sur ${q(l)}`};}
        if(S1.length<S0.length){const n=S0.find(s=>!S1.some(x=>x.id===s.id));return {k:'sp',kl:'pièces',txt:`${n?spLbl(n):'pièce'} supprimée sur ${q(l)}`};}
        const m=S1.find(s=>{const x=S0.find(y=>y.id===s.id);return x&&(R4(x.m)!==R4(s.m)||R4(x.mR||0)!==R4(s.mR||0));});return {k:'sp',kl:'pièces',txt:m?`${spLbl(m)} déplacée sur ${q(l)}`:'pièce modifiée sur '+q(l)};}
      if(J(o.cuts||[])!==J(l.cuts||[]))return {k:'cut',kl:'soudures coulissées',txt:((l.cuts||[]).length<(o.cuts||[]).length?'coupe retirée sur ':'soudure coulissée sur ')+q(l)};
      if(J(o.drapeaux||[])!==J(l.drapeaux||[]))return {k:'drap',kl:'drapeaux',txt:((l.drapeaux||[]).length<(o.drapeaux||[]).length?'drapeau supprimé sur ':'drapeau sur ')+q(l)};
      if(!!o.inv!==!!l.inv)return {k:'inv',kl:'aller / retour',txt:'aller / retour inversés sur '+q(l)};
      if((o.bar||0)!==(l.bar||0))return {k:'bar',kl:'barres',txt:'longueur de barre de '+q(l)};
      if(J(o.prof)!==J(l.prof))return {k:'prof',kl:'profondeur',txt:'profondeur de '+q(l)};
      if(J(o.hm||null)!==J(l.hm||null))return {k:'hm',kl:'marché / TS',txt:'marché / TS de '+q(l)};
      if(!!o.pause!==!!l.pause)return {k:'pause',kl:'pause',txt:(l.pause?'mise en pause de ':'reprise de ')+q(l)};
      if(J(o.parent||null)!==J(l.parent||null))return {k:'geo',kl:'tracé',txt:'départ de l\'antenne '+q(l)};
      return null;}}
  // versions (étude) : une ligne créée → v0 = vm = cv ; modifiée (géométrie, DN, extrémités, pièces, tranche, nom) → vm = cv. Jamais sur une sélection ou un affichage.
  const stampKey=l=>JSON.stringify([l.name,l.dn,l.bar||0,l.pts,l.startType||'',l.endType||'',!!l.pause,(l.specials||[]).map(s=>{const o=Object.assign({},s);delete o.photo;return o;}),l.cuts||[],l.drapeaux||[],trOf(l),trOf(l)==='option'?optOf(l):0,!!l.inv,l.parent?l.parent.line:''],(k,v)=>typeof v==='number'?R4(v):v);
  function stamp(prev){if(!ETUDE)return false;let P;try{P=JSON.parse(prev.lines);}catch(e){return false;}const pk=new Map(P.map(l=>[l.id,stampKey(l)]));const cv=state.cv;let ch=false;const before=P.some(l=>vmOf(l)>1);
    state.lines.forEach(l=>{if(!pk.has(l.id)){if(l.v0!==cv||l.vm!==cv){l.v0=cv;l.vm=cv;ch=true;}return;}if(pk.get(l.id)!==stampKey(l)){if(l.v0==null){l.v0=1;ch=true;}if(l.vm!==cv){l.vm=cv;ch=true;}}});
    if(TB.stamp(P,cv))ch=true; /* 16/10 soir (lot TB) : version de chaque tronçon (l.sv) et morceaux supprimés (l.del), calculés par rapport au début de la version */
    if(ch){if(!before&&state.lines.some(l=>vmOf(l)>1)&&state.show.versions===false){state.show.versions=true;api.saveShow();} /* couche « Versions » activée d'office dès qu'une ligne a vm > 1 */api.save();api.render();api.renderPanel();api.renderFoot();}return ch;}
  const hist=makeHistory({take,restore,describe,stamp,flash:m=>api.flash(m)});
  /* ---------- règles de dilatation (indicatives) ---------- */
  let RG=null,RGerr='';function loadRegles(){RG=null;RGerr='';try{const s=localStorage.getItem(REGLES_LS);if(s){const o=JSON.parse(s);const e=reglesCheck(o);if(e)RGerr=e;else RG=o;}}catch(e){RGerr='tableau illisible';}
    if(!RG)reglesFromStore(kv).then(o=>{if(o&&!RG){RG=o;RGerr='';api.render();api.renderPanel();api.renderFoot();}});} /* 16/10 (lot TA) : copie absente de localStorage → le registre de l'appareil (IndexedDB) */
  loadRegles();window.addEventListener('storage',e=>{if(e.key===REGLES_LS){loadRegles();api.render();api.renderPanel();}}); // pack importé dans l'appli (autre onglet) : pris tout de suite
  const minDn=(l,m0,m1)=>{const reds=(l.specials||[]).filter(s=>s.type==='reducer'&&s.dn2).sort((a,b)=>a.m-b.m);let cur=l.dn;reds.forEach(r=>{if(r.m<=m0)cur=r.dn2;});let mn=cur;reds.forEach(r=>{if(r.m>m0&&r.m<m1)mn=Math.min(mn,r.dn2);});return mn;};
  const NO_TABLE='tableau des longueurs maximales absent : importe le pack SCR (partie Règles)';
  function dilat(){const r=rules();const on=r.dilatAlerte!==false;const T=+r.dilatTemp||120,S=+r.dilatContrainte||150;const teMax=RG&&+RG.teMaxDroit>0?+RG.teMaxDroit:10;const out={list:[],off:!on,noTable:!RG,T,S,teMax,miss:false,st:{}};if(!on)return out; /* 16/10 (lot TA) : st[ligne] = ce qui a été vérifié (dilatx.js) */
    state.lines.forEach(l=>{const P=l.pts;if(!P||P.length<2)return;const cum=[0];for(let i=1;i<P.length;i++)cum.push(cum[i-1]+Math.hypot(P[i][0]-P[i-1][0],P[i][1]-P[i-1][1]));
      const bends=[];for(let i=1;i<P.length-1;i++){if(turnAbs(P[i-1],P[i],P[i+1])>=80)bends.push(i);} // coude à 90° = déviation au sommet ≥ 80° (les petites déviations ne coupent pas le tronçon)
      const own=l.prof!=null&&l.prof!==''&&isFinite(+l.prof);const prof=own?+l.prof:(state.prof!=null&&isFinite(+state.prof)?+state.prof:1);const ST=out.st[l.id]={runs:[],own,prof,te:null};
      if(RG)for(let k=0;k+1<bends.length;k++){const a=bends[k],b=bends[k+1];const len=cum[b]-cum[a];const dn=minDn(l,cum[a],cum[b]);const lm=lmaxOf(RG,dn,prof,T,S);ST.runs.push({len,lmax:lm?lm.L:null,dn,below:!!(lm&&lm.below)});if(!lm){out.miss=true;continue;}
        if(len>lm.L+1e-6)out.list.push({rule:1,line:l.id,m0:cum[a],m1:cum[b],len,lmax:lm.L,dn,prof,txt:`Ligne trop longue entre deux coudes à 90° : ${Math.round(len)} m pour ${Math.round(lm.L)} m admissibles (DN ${dn}, prof. ${f2(lm.prof)} m${own?'':' supposée'}, ${T} °C, ${S} N/mm²) — insérer une lyre (indicatif)`});}
      if(l.parent){const first=bends.length?cum[bends[0]]:cum[P.length-1];ST.te=first;if(first>teMax+1e-6)out.list.push({rule:2,line:l.id,m0:0,m1:first,len:first,max:teMax,txt:`Dilatation : ${Math.round(first)} m en ligne droite après le té sans coude à 90° (${fmt(teMax)} m maxi)`});}});
    return out;}
  /* ---------- sélection multiple, lasso, zones ---------- */
  const multiIds=()=>state.sel&&state.sel.kind==='lines'?state.sel.ids.filter(id=>L(id)):[];
  const curIds=()=>{const s=state.sel;if(!s)return [];if(s.kind==='lines')return multiIds();const id=s.kind==='line'?s.id:s.kind==='piece'?s.line:null;return id&&L(id)?[id]:[];}; // une ligne, ou la ligne de la pièce sélectionnée
  function setMulti(ids){ids=ids.filter((id,i)=>L(id)&&ids.indexOf(id)===i);state.sel=ids.length?{kind:'lines',ids}:null;state.selV=[];state.tab='sel';api.render();api.renderPanel();}
  const zNum=z=>parseInt(String(z.id).replace(/\D/g,''),10)||1;const zColor=z=>ZCOL[(zNum(z)-1)%ZCOL.length];
  const zoneOf=id=>(state.zones||[]).find(z=>z.lines.includes(id))||null;
  const zoneMl=z=>z.lines.reduce((s,id)=>{const l=L(id);return s+(l?polyLen(l.pts):0);},0);
  function act(label,fn){fn();hist.label(label);api.rebuild();persist();} // une action du lot = une étape d'historique, nommée
  const ofIds=ids=>ids.length===1&&L(ids[0])?q(L(ids[0])):`${ids.length} lignes`;
  function zoneAssign(ids,zid){state.zones.forEach(z=>{z.lines=z.lines.filter(id=>!ids.includes(id));});const z=state.zones.find(x=>x.id===zid);if(z)z.lines=z.lines.concat(ids);}
  function zoneNew(ids){if(!ids.length){api.flash('Sélectionne d\'abord des lignes (▭ Sélection, ou glisser dans le vide)');return null;}const n=Math.max(0,...state.zones.map(zNum))+1;const z={id:'z'+n,nom:api.zonesX?api.zonesX.freeName('Zone '+n):'Zone '+n,lines:[]}; /* 16/10 (K4) : pas le nom d'une zone déjà dans le chiffrage */
    act(`création de la zone « ${z.nom} » (${ofIds(ids)})`,()=>{state.zones.push(z);zoneAssign(ids,z.id);});api.flash(`« ${z.nom} » : ${ids.length} ligne${ids.length>1?'s':''} — renomme-la dans le panneau Zones`);return z;}
  function zoneMove(ids,zid){const z=state.zones.find(x=>x.id===zid);if(!z||!ids.length)return;act(`${ofIds(ids)} dans « ${z.nom} »`,()=>zoneAssign(ids,zid));}
  function zoneOut(ids){if(!ids.some(id=>zoneOf(id))){api.flash('Ces lignes ne sont dans aucune zone');return;}act(`${ofIds(ids)} retirée(s) de leur zone`,()=>zoneAssign(ids,null));}
  function zoneDel(zid){const z=state.zones.find(x=>x.id===zid);if(!z)return;act(`suppression de la zone « ${z.nom} »`,()=>{state.zones=state.zones.filter(x=>x.id!==zid);});}
  function zoneRename(zid,nom){const z=state.zones.find(x=>x.id===zid);nom=String(nom||'').trim();if(!z||!nom||nom===z.nom)return;const old=z.nom;act(`zone « ${old} » renommée « ${nom} »`,()=>{z.nom=nom;});}
  function zoneShow(zid){const z=state.zones.find(x=>x.id===zid);if(!z)return;const ids=z.lines.filter(id=>L(id));if(!ids.length){api.flash(`« ${z.nom} » est vide`);return;}setMulti(ids);frame(ids.map(id=>L(id).pts).flat());}
  function frame(pts){if(!pts.length)return;let x0=1e9,y0=1e9,x1=-1e9,y1=-1e9;pts.forEach(p=>{x0=Math.min(x0,p[0]);y0=Math.min(y0,p[1]);x1=Math.max(x1,p[0]);y1=Math.max(y1,p[1]);});api.fitBox(x0,y0,x1,y1);}
  function setTranche(ids,tr,n){const ls=ids.map(L).filter(Boolean);if(!ls.length)return;const nn=Math.max(1,parseInt(n,10)||1);
    act(`tranche de ${ofIds(ids)} : ${tr==='option'?'option '+nn:'ferme'}`,()=>ls.forEach(l=>{if(tr==='option'){l.tranche='option';l.option=nn;}else{l.tranche='ferme';delete l.option;}}));}
  function setEnd(id,at,v){const l=L(id);if(!l)return;if(at==='start'){if(l.parent)return;l.startType=v;}else l.endType=v;api.rebuild();}
  function rename(id,nom){const l=L(id);nom=String(nom||'').trim();if(!l||!nom||nom===l.name)return false;l.name=nom;api.rebuild();api.flash(`Ligne renommée : « ${nom} »`);return true;}
  // lasso : souris → glisser dans le VIDE du plan ; doigt → après « ▭ Sélection » (sinon le glisser déplace la vue)
  let armed=false;const lassoG=document.createElementNS('http://www.w3.org/2000/svg','g');lassoG.id='t1LassoG';api.world.appendChild(lassoG);
  function arm(on){armed=on===undefined?!armed:!!on;if(armed&&state.mode!=='select')api.setMode('select');const b=document.getElementById('t1Lasso');if(b)b.classList.toggle('on',armed);if(armed)api.flash('▭ Glisse un rectangle autour des lignes à sélectionner (Maj : ajouter / retirer)');}
  function lassoStart(e,p){if(state.mode!=='select'||e.button!==0)return null;const touch=e.pointerType&&e.pointerType!=='mouse';const t=e.target;
    if(state.vtxSel){if(t&&t.closest&&t.closest('.vtx'))return null;return {w0:p,shift:!!e.shiftKey,vtx:true};} /* 23/10 : ⊞ Sommets armé → le rectangle sélectionne des SOMMETS (même en partant près d'une ligne) */
    if(touch&&!armed)return null;if(t&&t.closest&&t.closest('.vtx, .piece, .weld, .pause'))return null;if(api.nearestLine(p,Math.max(1.5,10/state.view.k)))return null;return {w0:p,shift:!!e.shiftKey};}
  function lassoMove(ptr,e,p){if(Math.hypot(e.clientX-ptr.x,e.clientY-ptr.y)>4)ptr.moved=true;if(!ptr.moved)return;const a=ptr.lasso.w0;ptr.lasso.w1=p;const k=state.view.k;
    lassoG.innerHTML=`<rect x="${Math.min(a[0],p[0])}" y="${Math.min(a[1],p[1])}" width="${Math.abs(p[0]-a[0])}" height="${Math.abs(p[1]-a[1])}" fill="rgba(42,95,180,.08)" stroke="#1c3d6b" stroke-width="${1.5/k}" stroke-dasharray="${6/k} ${4/k}"/>`;}
  function lassoEnd(ptr,e){lassoG.innerHTML='';const S=ptr.lasso;if(!S||!S.w1)return;const a=S.w0,b=S.w1;const x0=Math.min(a[0],b[0]),x1=Math.max(a[0],b[0]),y0=Math.min(a[1],b[1]),y1=Math.max(a[1],b[1]);
    if(S.vtx){const hits=[];state.lines.forEach(l=>l.pts.forEach((p,i)=>{if(p[0]>=x0&&p[0]<=x1&&p[1]>=y0&&p[1]<=y1)hits.push({line:l.id,i});}));let V=(S.shift||e.shiftKey)?(state.selV||[]).slice():[];hits.forEach(h=>{const k=V.findIndex(v=>v.line===h.line&&v.i===h.i);if(k>=0){if(S.shift||e.shiftKey)V.splice(k,1);}else V.push(h);});
      state.selV=V;if(V.length)state.sel={kind:'line',id:V[0].line};state.tab='sel';api.render();api.renderPanel();if(api.shapeBar)api.shapeBar();api.flash(V.length?`${V.length} sommet${V.length>1?'s':''} sélectionné${V.length>1?'s':''} — glisse l'un d'eux pour tout bouger, ou ◀ ▶ ▲ ▼ dans la fiche`:'Aucun sommet dans le rectangle');return;} /* 23/10 */
    const hits=state.lines.filter(l=>l.pts.some((p,i)=>i&&segHits(l.pts[i-1],p,x0,y0,x1,y1))).map(l=>l.id);arm(false);
    let ids;if(S.shift||e.shiftKey){ids=curIds();hits.forEach(id=>{const i=ids.indexOf(id);if(i>=0)ids.splice(i,1);else ids.push(id);});}else ids=hits;setMulti(ids);
    api.flash(ids.length?`${ids.length} ligne${ids.length>1?'s':''} sélectionnée${ids.length>1?'s':''} — ＋ Créer une zone de chiffrage${ETUDE?', tranche':''}…`:'Aucune ligne dans le rectangle');}
  function toggleSel(x){const id=Array.isArray(x)?((api.nearestLine(x,Math.max(1.5,6/state.view.k))||{l:{}}).l.id):x;if(!id||!L(id))return false;const ids=curIds();const i=ids.indexOf(id);if(i>=0)ids.splice(i,1);else ids.push(id);setMulti(ids);return true;} // Maj+clic sur une ligne (id, ou point du plan → la ligne la plus proche)
  /* ---------- HTML des panneaux ---------- */
  const zoneSelect=(ids,cur)=>`<select class="f" data-t1="zmove" data-ids="${esc(ids.join(','))}"><option value="">${cur?'— retirer de sa zone —':'Mettre dans la zone…'}</option>${state.zones.map(z=>`<option value="${esc(z.id)}" ${cur&&cur.id===z.id?'selected':''}>${esc(z.nom)}</option>`).join('')}<option value="+">＋ nouvelle zone</option></select>`;
  function trancheCtl(ids){const ls=ids.map(L).filter(Boolean);if(!ls.length)return '';const trs=[...new Set(ls.map(trOf))],ns=[...new Set(ls.filter(l=>trOf(l)==='option').map(optOf))];const mix=trs.length>1;const op=!mix&&trs[0]==='option';
    return `<span>tranche <select class="f" data-t1="tr" data-ids="${esc(ids.join(','))}">${mix?'<option value="" selected>— mélange —</option>':''}<option value="ferme" ${!mix&&!op?'selected':''}>Ferme</option><option value="option" ${op?'selected':''}>Option</option></select></span><span ${op?'':'style="display:none"'} class="t1-optn">n° <input class="f" type="number" min="1" step="1" data-t1="trn" data-ids="${esc(ids.join(','))}" value="${op&&ns.length===1?ns[0]:''}" placeholder="1" style="width:58px"></span>`;}
  function trancheHTML(ids){const ls=ids.map(L).filter(Boolean);if(!ls.length)return '';const l=ls[0];
    return `<h3>Tranche</h3><div class="card"><div class="kv">${trancheCtl(ids)}</div><div class="muted" style="margin-top:4px">Étude (affaire ${esc(AFFN)}, chiffrage <b>v${state.cv}</b>) : la ligne compte en tranche ferme ou dans l'option n° … — en option, trait pointillé et étiquette « Opt n » sur le plan. Pas de marché ni de TS en étude : ils viendront quand l'affaire sera gagnée.</div>${ls.length===1?`<div class="kv" style="margin-top:6px"><span>créée en v${v0Of(l)}</span><span>modifiée en v${vmOf(l)}${vmOf(l)===state.cv&&state.cv>1?' (en cours)':''}</span></div>`+TB.lineInfo(l)/* 16/10 soir (lot TB) */:''}</div>`;}
  function multiHTML(cls){const ids=multiIds();if(!ids.length)return '';const ml=ids.reduce((s,id)=>s+polyLen(L(id).pts),0);const zs=[...new Set(ids.map(id=>{const z=zoneOf(id);return z?z.nom:'hors zone';}))];
    return `<div class="${cls||'card'} t1-multi"><h4>${ids.length} ligne${ids.length>1?'s':''} sélectionnée${ids.length>1?'s':''}<span class="t1-sp"></span><button class="btn sm" data-act="t1-unsel" title="désélectionner (Échap)">✕</button></h4>
      <div class="t1-names">${ids.map(id=>esc(L(id).name)).join(', ')}</div><div class="muted" style="font-size:12px">${fmt(ml)} ml · ${esc(zs.join(', '))}</div>
      <div class="t1-row"><button class="btn on" data-act="t1-zoneNew" data-ids="${esc(ids.join(','))}">＋ Créer une zone de chiffrage</button></div>${api.zonesX?api.zonesX.pickHTML(ids):''}
      <div class="t1-row">${zoneSelect(ids,null)}<button class="btn" data-act="t1-zoneOut" data-ids="${esc(ids.join(','))}">Retirer de sa zone</button></div>
      ${ETUDE?`<div class="t1-row">${trancheCtl(ids)}</div>`:''}<div class="muted t1-hlp" style="margin-top:6px;font-size:11.5px">Maj + glisser (ou Maj + clic sur une ligne) : ajouter / retirer. Une ligne n'est que dans une zone ; les antennes se sélectionnent elles-mêmes.</div></div>`;}
  function lineExtra(l){let h='';const z=zoneOf(l.id);h+=`<h3>Zone de chiffrage</h3><div class="card"><div class="kv"><span>${z?`<i class="t1-sw" style="background:${zColor(z)};vertical-align:middle"></i> <b>${esc(z.nom)}</b>`:'hors zone'}</span><span>${zoneSelect([l.id],z)}</span></div></div>`;
    const D=dilat();const mine=D.list.filter(a=>a.line===l.id);if(mine.length)h+=`<h3>⚠ Dilatation (indicatif)</h3>`+mine.map(a=>`<div class="note warn" data-act="t1-dil" data-i="${D.list.indexOf(a)}" style="cursor:pointer">${esc(a.txt)}</div>`).join('');
    h+=DX.lineHTML(D,l,mine.length)+(api.lineX?api.lineX(l):'');return h;} /* 16/10 (lot TA) : contrôle de dilatation de la ligne (même sans alerte), ses planches */
  // fiche du téléphone (le panneau de droite n'existe pas sous 800 px) : ligne, bout de ligne
  function phoneHTML(){const s=state.sel;if(!s)return '';
    if(s.kind==='lines')return multiHTML('t1-card');
    const endOf=s.kind==='piece'?(()=>{const B=state.built[s.line];const p=B&&B[s.cond]&&B[s.cond].pieces.find(x=>x.id===s.id);return p&&String(p.sid||'').startsWith('end:')?String(p.sid).slice(4):null;})():null;
    const l=L(s.kind==='line'?s.id:s.line);if(!l||(s.kind!=='line'&&!endOf))return '';const z=zoneOf(l.id);
    const endSel=at=>`<label class="muted" style="font-size:12px">${at==='start'?'départ':'fin'} <select class="f" data-t1="pend" data-line="${l.id}" data-at="${at}">${endOptionsHTML(at==='start',at==='start'?(l.startType||'sousstation'):(l.endType||'kit'),esc)}</select></label>`;
    if(endOf)return `<div class="t1-card"><h4>${endOf==='start'?'Départ':'Fin'} de ${esc(l.name)}<span class="t1-sp"></span><button class="btn sm" data-act="t1-unsel">✕</button></h4><div class="t1-row">${endSel(endOf)}</div></div>`;
    const D=dilat().list.filter(a=>a.line===l.id);
    return `<div class="t1-card"><h4>${l.parent?'Antenne':'Ligne'}<span class="t1-sp"></span><button class="btn sm" data-act="t1-unsel">✕</button></h4><div class="t1-row"><input class="f" data-t1="pname" data-line="${l.id}" value="${esc(l.name)}" style="flex:1;min-width:0"><button class="btn sm" data-act="t1-rename" data-line="${l.id}">Renommer</button></div>
      <div class="muted" style="margin-top:4px">DN${l.dn} · ${fmt(polyLen(l.pts))} m${l.parent?' · départ sur le té':''}</div><div class="t1-row">${l.parent?'':endSel('start')}${endSel('end')}</div>
      <div class="t1-row">${z?`<i class="t1-sw" style="background:${zColor(z)}"></i>`:''}${zoneSelect([l.id],z)}</div>${ETUDE?`<div class="t1-row">${trancheCtl([l.id])}</div>`:''}${D.map(a=>`<div class="note warn" style="margin-top:6px">⚠ ${esc(a.txt)}</div>`).join('')}${DX.phoneHTML(dilat(),l)}</div>`;} /* 16/10 (lot TA) : tableau absent, profondeur manquante, ✓ vérifié */
  let zonesOpen=false;
  function zonesHTML(){const Z=state.zones;const out=state.lines.filter(l=>!zoneOf(l.id)).length;
    return `<div class="t1-card t1-zones"><h4>▦ Zones de chiffrage (${Z.length})<span class="t1-sp"></span><button class="btn sm" data-act="t1-zclose" title="fermer">✕</button></h4>${Z.length?Z.map(z=>`<div class="t1-zone" data-act="t1-zoneSel" data-z="${esc(z.id)}" title="sélectionner ses lignes et cadrer"><i class="t1-sw" style="background:${zColor(z)}"></i><input class="f" data-t1="zname" data-z="${esc(z.id)}" value="${esc(z.nom)}" aria-label="nom de la zone"><small>${z.lines.length} l. · ${fmt(Math.round(zoneMl(z)))} ml</small>${api.zonesX?api.zonesX.tagHTML(z):''}<button class="btn sm danger" data-act="t1-zoneDel" data-z="${esc(z.id)}" title="supprimer la zone (les lignes restent)">✕</button></div>`).join(''):'<div class="muted">Aucune zone. Sélectionne des lignes (▭ Sélection, ou glisser dans le vide à la souris) puis « ＋ Créer une zone de chiffrage ».</div>'}
      ${Z.length&&state.lines.length?`<div class="muted" style="margin-top:6px;font-size:11.5px">${out?out+' ligne'+(out>1?'s':'')+' hors zone · ':''}touche une zone : ses lignes sont sélectionnées et cadrées.</div>`:''}${api.zonesX?api.zonesX.listHTML():''}</div>`;} /* 16/10 (K4) : zones du chiffrage de l'affaire */
  /* ---------- barre et panneau flottants (sur le plan : lisibles au téléphone) ---------- */
  const st=document.createElement('style');st.id='css-lot-t1';st.textContent=T1CSS;document.head.appendChild(st);
  const bar=document.createElement('div');bar.id='t1Bar';bar.innerHTML=`<button class="btn" id="t1Lasso" title="▭ Sélection : le prochain glisser trace un rectangle — les lignes englobées sont sélectionnées (à la souris : glisser dans le vide suffit)">▭ Sélection</button><button class="btn" id="t1Vtx" title="⊞ Sommets : touche des sommets pour les sélectionner ensemble (ou trace un rectangle), puis glisse l'un d'eux : ils bougent tous">⊞ Sommets</button><button class="btn" id="t1Zones" title="zones de chiffrage : liste, nom, lignes, ml">▦ Zones</button>`;api.main.appendChild(bar);
  const fl=document.createElement('div');fl.id='t1Float';api.main.appendChild(fl);
  const leg=document.querySelector('.legend');const vleg=document.createElement('span');vleg.id='t1VerLeg';vleg.style.display='none';if(leg)leg.insertBefore(vleg,leg.firstChild);
  document.getElementById('t1Lasso').onclick=()=>arm();document.getElementById('t1Vtx').onclick=()=>{state.vtxSel=!state.vtxSel;if(state.vtxSel&&state.mode!=='select')api.setMode('select');document.getElementById('t1Vtx').classList.toggle('on',!!state.vtxSel);api.flash(state.vtxSel?'⊞ Touche les sommets à sélectionner (ou glisse un rectangle) — glisse l\'un d\'eux : ils bougent tous ensemble':'Sélection de sommets terminée');}; /* 23/10 */document.getElementById('t1Zones').onclick=()=>{zonesOpen=!zonesOpen;syncFloat(true);};
  const TB=tbInit({state,esc,api,ETUDE,L,verColor,stampKey,fl,syncFloat}); /* 16/10 soir (lot TB) : maquette/tversions.js */
  let flSig='';function syncFloat(force){const ph=phoneHTML();const zh=(zonesOpen?zonesHTML():'')+TB.cardHTML(); /* 16/10 soir (lot TB) : + panneau 🕑 Versions */const sig=ph+'|'+zh;const zb=document.getElementById('t1Zones');if(zb){zb.classList.toggle('on',zonesOpen);zb.textContent=`▦ Zones${state.zones.length?' ('+state.zones.length+')':''}`;}
    if(!force&&sig===flSig)return;const ae=document.activeElement;if(!force&&ae&&fl.contains(ae)&&ae.tagName==='INPUT')return; // saisie en cours dans le panneau : on ne le redessine pas sous le doigt
    flSig=sig;fl.innerHTML=(ph?`<div class="t1-fl-multi">${ph}</div>`:'')+zh;}
  function legend(){let h='';if(ETUDE&&state.show.versions!==false){const mx=Math.max(state.cv,...state.lines.map(vmOf));if(mx>1){const parts=[];for(let v=1;v<=mx;v++){const c=verColor(v);parts.push(`<span><i style="background:${c?c[0]:'linear-gradient(90deg,#c8382f 50%,#2a5fb4 50%)'}"></i>v${v}${v===state.cv?' (en cours)':''}</span>`);}h='<b>Versions :</b> '+parts.join(' · ');}}
    if(ETUDE&&state.lines.some(l=>trOf(l)==='option'))h+=`${h?' · ':''}<span>┄ Opt n = option</span>`;if(vleg.dataset.h!==h){vleg.dataset.h=h;vleg.innerHTML=h;vleg.style.display=h?'':'none';}}
  /* ---------- couches du plan ---------- */
  const axisD=pts=>'M'+pts.map(p=>p[0]+' '+p[1]).join('L');
  function under(k){let h='';const S=state.show;if(S.zones!==false)(state.zones||[]).forEach(z=>{const col=zColor(z);z.lines.forEach(id=>{const l=L(id);const B=state.built[id];if(!l||l.pts.length<2)return;h+=`<path d="${axisD(l.pts)}" stroke="${col}" stroke-width="${Math.max((B?B.e:0.4)*3.2,30/k)}" fill="none" opacity=".38" stroke-linecap="round" stroke-linejoin="round" pointer-events="none"/>`;});});
    multiIds().forEach(id=>{const l=L(id);const B=state.built[id];if(!l||l.pts.length<2)return;h+=`<path class="t1-msel" d="${axisD(l.pts)}" stroke="#f0c76a" stroke-width="${Math.max((B?B.e:0.4)*2.4,18/k)}" fill="none" opacity=".8" stroke-linecap="round" stroke-linejoin="round" pointer-events="none"/>`;});return TB.under(k)+h;} /* 16/10 soir (lot TB) : ce qui a été supprimé, grisé, tout en dessous */
  function over(k){const S=state.show;let h='';const D=dilat();
    if(S.dilat!==false)D.list.forEach(a=>{const l=L(a.line);if(!l)return;const d=axisD(subPoly(l.pts,a.m0,a.m1));const q2=ptAt(l.pts,a.m0+(a.m1-a.m0)*0.3); /* ⚠ au tiers du tronçon : le nom de la ligne est au milieu */
      h+=`<path d="${d}" stroke="#e8710a" stroke-width="${Math.max(3,16/k)}" fill="none" opacity=".22" stroke-linecap="round" stroke-linejoin="round" pointer-events="none"/><path class="t1-dil" d="${d}" stroke="#e8710a" stroke-width="${2.5/k}" fill="none" stroke-dasharray="${8/k} ${5/k}" pointer-events="none"/><g transform="translate(${q2.x} ${q2.y}) scale(${1/k})" pointer-events="none"><rect x="-11" y="-32" width="22" height="19" rx="9.5" fill="#e8710a" stroke="#fff" stroke-width="1.5"/><text y="-18.5" font-size="12" font-weight="800" text-anchor="middle" fill="#fff" font-family="system-ui,sans-serif">⚠</text></g>`;});
    if(S.ext!==false)state.lines.forEach(l=>{const B=state.built[l.id];if(!B||!B.A||!B.axis||B.axis.length<2)return;
      [['start',l.parent?null:(l.startType||'sousstation')],['end',api.endTypeOf(l)]].forEach(([at,t])=>{if(!t||!endKindOf(t))return;const ab=endAbbr(t);const pc=B.A.pieces.find(p=>p.sid==='end:'+at);if(!ab||!pc)return;
        const a=B.axis,n=a.length;const P=at==='start'?a[0]:a[n-1],Q=at==='start'?a[1]:a[n-2];const d=Math.hypot(P[0]-Q[0],P[1]-Q[1])||1;const ux=(P[0]-Q[0])/d,uy=(P[1]-Q[1])/d;
        const w=ab.length*6.6+14;const ext=(isBypassEnd(t)?B.e/2:0)+B.e/2+(20+Math.abs(ux)*w/2+Math.abs(uy)*9.5)/k;const x=P[0]+ux*ext,y=P[1]+uy*ext; // au-delà du bout, sans recouvrir le dernier sommet (carré à glisser)
        h+=`<g class="piece t1-endmark" data-line="${esc(l.id)}" data-cond="A" data-id="${esc(pc.id)}" data-end="${at}" transform="translate(${x} ${y}) scale(${1/k})"><rect x="${-w/2-6}" y="-17" width="${w+12}" height="34" fill="transparent"/><rect x="${-w/2}" y="-9.5" width="${w}" height="19" rx="9.5" fill="${endColor(t)}" stroke="#fff" stroke-width="1.5"/><text y="4" font-size="11" font-weight="700" text-anchor="middle" fill="#fff" font-family="system-ui,sans-serif">${esc(ab)}</text><title>${esc((at==='start'?'départ : ':'fin : ')+endLabel(t))} — clic : fiche du bout</title></g>`;});});
    if(S.zones!==false)(state.zones||[]).forEach(z=>{const ls=z.lines.map(L).filter(l=>l&&l.pts.length>=2&&state.built[l.id]);if(!ls.length)return;const l=ls.reduce((a,b)=>polyLen(b.pts)>polyLen(a.pts)?b:a);const B=state.built[l.id];const p=bestSeg(B.axis);const w=z.nom.length*6.4+16; // sous la ligne, sous l'étiquette « Opt n »
      h+=`<g class="t1-zlab" transform="translate(${p.mx} ${p.my}) rotate(${p.ang}) translate(0 ${B.e/2+0.4}) scale(${1/k})" pointer-events="none"><rect x="${-w/2}" y="26" width="${w}" height="18" rx="5" fill="${zColor(z)}" stroke="#fff" stroke-width="1.5"/><text y="39" font-size="11" font-weight="700" text-anchor="middle" fill="#0b0b0b" font-family="system-ui,sans-serif">${esc(z.nom)}</text></g>`;});
    if(ETUDE)state.lines.forEach(l=>{if(trOf(l)!=='option')return;const B=state.built[l.id];if(!B||!B.axis||B.axis.length<2)return;const p=bestSeg(B.axis);const lab='Opt '+optOf(l);const w=lab.length*6.6+14;
      h+=`<g transform="translate(${p.mx} ${p.my}) rotate(${p.ang}) translate(0 ${B.e/2+0.4}) scale(${1/k})" pointer-events="none"><rect x="${-w/2}" y="4" width="${w}" height="18" rx="9" fill="#52514e" stroke="#fff" stroke-width="1.5"/><text class="t1-opt" y="17" font-size="11" font-weight="700" text-anchor="middle" fill="#fff" font-family="system-ui,sans-serif">${esc(lab)}</text></g>`;});
    h+=TB.over(k); /* 16/10 soir (lot TB) : version mise en évidence (🕑), légende */syncFloat();legend();return h;}
  function bestSeg(a){let best=-1,bi=1;for(let i=1;i<a.length;i++){const d=Math.hypot(a[i][0]-a[i-1][0],a[i][1]-a[i-1][1]);if(d>best){best=d;bi=i;}}const p=a[bi-1],q2=a[bi];let ang=Math.atan2(q2[1]-p[1],q2[0]-p[0])*180/Math.PI;if(ang>90)ang-=180;if(ang<=-90)ang+=180;return {mx:(p[0]+q2[0])/2,my:(p[1]+q2[1])/2,ang};}
  // nom de ligne LE LONG de la ligne (milieu du plus long tronçon, dans son sens) — avant : au 1er sommet, donc pour une antenne SUR la parente, au té
  function lineLabel(l,B,k){if(!B.axis||B.axis.length<2)return '';const p=bestSeg(B.axis);const off=B.e/2+(k>=7?26:10)/k;
    return `<text class="t1-lname" data-line="${esc(l.id)}" transform="translate(${p.mx} ${p.my}) rotate(${p.ang})" y="${-off}" font-size="${12/k}" text-anchor="middle" fill="#52514e" font-weight="600" stroke="#fff" stroke-width="${3/k}" paint-order="stroke" font-family="system-ui,sans-serif" pointer-events="none">${esc(l.name)} · DN${l.dn}</text>`;}
  /* ---------- tableaux de l'onglet Lignes ---------- */
  function endsRows(){const m=new Map();let libres=0;state.lines.forEach(l=>{const add=(t,dn)=>{const v=normEnd(t);if(!endKindOf(v)){libres++;return;}const k=v+'|'+dn;m.set(k,(m.get(k)||0)+1);};if(!l.parent)add(l.startType||'sousstation',l.dn);add(api.endTypeOf(l),dnAtEnd(l));});
    return {rows:[...m.entries()].map(([k,n])=>{const [t,dn]=k.split('|');return {t,dn:+dn,n};}).sort((a,b)=>endOrder(a.t)-endOrder(b.t)||a.dn-b.dn),libres};}
  function lignesExtra(){if(!state.lines.length)return '';const E=endsRows();let h=`<h3>Extrémités</h3>${E.rows.length?`<table class="t1-ends"><tr><th>Type</th><th>DN</th><th>Nb</th></tr>${E.rows.map(r=>`<tr><td><span class="t1-tag" style="background:${endColor(r.t)}">${esc(endAbbr(r.t))}</span> ${esc(endLabel(r.t))}</td><td>${r.dn}</td><td><b>${r.n}</b></td></tr>`).join('')}</table>`:''}<div class="muted">Un bout = les deux conduites ; une antenne part du té (pas de départ compté)${E.libres?` · ${E.libres} bout${E.libres>1?'s':''} libre${E.libres>1?'s':''}`:''}.</div>`;
    if(ETUDE){const g=new Map();state.lines.forEach(l=>{const k=trOf(l)==='option'?'Option '+optOf(l):'Tranche ferme';const o=g.get(k)||{n:0,ml:0};o.n++;o.ml+=polyLen(l.pts);g.set(k,o);});const keys=[...g.keys()].sort((a,b)=>a==='Tranche ferme'?-1:b==='Tranche ferme'?1:(parseInt(a.slice(7),10)||0)-(parseInt(b.slice(7),10)||0));
      const vs=new Map();state.lines.forEach(l=>{const v=vmOf(l);vs.set(v,(vs.get(v)||0)+1);});
      h+=`<h3>Tranches (étude ${esc(AFFN)})</h3><table><tr><th>Tranche</th><th>Lignes</th><th>ml</th></tr>${keys.map(k=>`<tr><td>${esc(k)}</td><td>${g.get(k).n}</td><td>${fmt(Math.round(g.get(k).ml))}</td></tr>`).join('')}</table>
        <h3>Versions du chiffrage</h3><div class="kv">${[...vs.keys()].sort((a,b)=>a-b).map(v=>`<span>${verColor(v)?`<i class="t1-sw" style="background:${verColor(v)[0]};vertical-align:middle"></i> `:''}v${v} : ${vs.get(v)} ligne${vs.get(v)>1?'s':''}${v===state.cv?' (en cours)':''}</span>`).join('')}</div><div class="muted">Version de la dernière modification de chaque ligne (création, géométrie, DN, extrémités, pièces, tranche, nom) ; version en cours : v${state.cv}.</div>`;}
    return h;}
  /* ---------- onglets Notes et Règles ---------- */
  function dilatHTML(){const D=dilat();const nm=id=>(L(id)||{}).name||id;
    return `<h3>⚠ Dilatation (indicatif)</h3>${D.off?'<div class="note info">Alerte dilatation désactivée (onglet Règles).</div>':`${D.noTable?`<div class="note warn">⚠ ${esc(DX.NO_RULES[0].toUpperCase()+DX.NO_RULES.slice(1))}. Règle « lyre » désactivée : ${NO_TABLE}. La règle du té (${fmt(D.teMax)} m) reste active.</div>`:''}${D.miss?`<div class="note warn">${D.T} °C / ${D.S} N/mm² absents du tableau pour certains tronçons : non vérifiés.</div>`:''}${D.list.length?D.list.map((a,i)=>`<div class="note warn" data-act="t1-dil" data-i="${i}" style="cursor:pointer" title="voir le tronçon"><b>${esc(nm(a.line))}</b> · ${esc(a.txt)}</div>`).join(''):'<div class="muted">Aucune alerte.</div>'}${DX.notesExtra(D,state.lines)}`}`;}
  function reglesHTML(){const r=rules();const T=RG&&RG.lmax;const temps=T&&Array.isArray(T.temperatures)&&T.temperatures.length?T.temperatures.map(Number):[120,110];const sig=T&&Array.isArray(T.contraintes)&&T.contraintes.length?T.contraintes.map(Number).slice().sort((a,b)=>a-b):[150,168,190];const ct=+r.dilatTemp||120,cs=+r.dilatContrainte||150;
    return `<h3>Dilatation (indicatif)</h3><div class="card"><div class="kv"><span>température de calcul <select class="f" data-t1="dT">${[...new Set(temps.concat([ct]))].map(t=>`<option value="${t}" ${t===ct?'selected':''}>${t} °C</option>`).join('')}</select></span><span>contrainte admissible <select class="f" data-t1="dS">${[...new Set(sig.concat([cs]))].map(s=>`<option value="${s}" ${s===cs?'selected':''}>${s}</option>`).join('')}</select> N/mm²</span><span><label><input type="checkbox" data-t1="dOn" ${r.dilatAlerte!==false?'checked':''}> alerte activée</label></span></div>
      <div class="muted" style="margin-top:4px">Profondeur : celle de la ligne (fiche), sinon celle du tracé (bandeau, ${fmt(state.prof)} m) — dite « supposée » tant qu'elle n'est pas saisie sur la ligne. Règle 1 (lyre) : longueur le long du tracé entre deux coudes à 90° (déviation ≥ 80°) comparée au tableau Lmax (DN absent → DN inférieur ; profondeur interpolée, bornée à 0,80 – 1,60 m). Règle 2 (té) : ${fmt(RG&&+RG.teMaxDroit>0?+RG.teMaxDroit:10)} m maxi en ligne droite après le té d'une antenne. Jamais bloquant.</div>
      <div class="note ${RG?'info':'warn'}" style="margin-top:6px">${RG?`Tableau des longueurs maximales : ${esc(reglesSummary(RG))}${T.titre?' — '+esc(T.titre):''}${T.serie?' (série '+esc(T.serie)+')':''}`:(RGerr?`Tableau des longueurs maximales illisible (${esc(RGerr)}) : réimporte le pack SCR (partie Règles)`:NO_TABLE[0].toUpperCase()+NO_TABLE.slice(1))}</div></div>`;}
  /* ---------- évènements des panneaux (onglets à droite et panneau flottant) ---------- */
  const idsOf=el=>String(el.dataset.ids||'').split(',').filter(Boolean);
  function onClick(e){const el=e.target.closest('[data-act]');if(!el)return;const a=el.dataset.act;if(!a.startsWith('t1-'))return;
    if(a==='t1-unsel'){state.sel=null;state.selV=[];api.render();api.renderPanel();}
    else if(a==='t1-zoneNew')zoneNew(idsOf(el));else if(a==='t1-zoneOut')zoneOut(idsOf(el));
    else if(a==='t1-zoneDel'){e.stopPropagation();const z=state.zones.find(x=>x.id===el.dataset.z);if(z&&(!z.lines.length||confirm(`Supprimer la zone « ${z.nom} » ? (ses ${z.lines.length} ligne(s) restent, hors zone)`)))zoneDel(z.id);}
    else if(a==='t1-zoneSel'){if(e.target.closest('input,button'))return;zoneShow(el.dataset.z);}
    else if(a==='t1-zclose'){zonesOpen=false;syncFloat(true);}
    else if(a==='t1-rename'){const i=[...fl.querySelectorAll('[data-t1="pname"]')].find(x=>x.dataset.line===el.dataset.line);if(i)rename(el.dataset.line,i.value);}
    else if(a==='t1-dil'){const D=dilat();const x=D.list[+el.dataset.i];const l=x&&L(x.line);if(!l)return;state.sel={kind:'line',id:l.id};state.selV=[];state.tab='sel';frame(subPoly(l.pts,x.m0,x.m1));api.renderPanel();api.flash('⚠ '+x.txt);}}
  function onChange(e){const t=e.target;const k=t.dataset&&t.dataset.t1;
    if(t.id==='lineName'){const b=document.querySelector('#panel [data-act="renameLine"]');if(b)rename(b.dataset.line,t.value);return;} // le nom tapé s'applique aussi sans le bouton « Renommer »
    if(!k)return;
    if(k==='zmove'){const ids=idsOf(t);if(t.value==='+')zoneNew(ids);else if(t.value)zoneMove(ids,t.value);else zoneOut(ids);}
    else if(k==='tr'){if(!t.value)return;const ids=idsOf(t);const n=t.closest('.kv,.t1-row,.card');const inp=n&&n.querySelector('[data-t1="trn"]');setTranche(ids,t.value,inp&&inp.value||1);}
    else if(k==='trn'){setTranche(idsOf(t),'option',t.value);}
    else if(k==='zname')zoneRename(t.dataset.z,t.value);
    else if(k==='pname')rename(t.dataset.line,t.value);
    else if(k==='pend')setEnd(t.dataset.line,t.dataset.at,t.value);
    else if(k==='dT'||k==='dS'||k==='dOn'){const r=rules();if(k==='dT')r.dilatTemp=+t.value;else if(k==='dS')r.dilatContrainte=+t.value;else r.dilatAlerte=!!t.checked;api.rebuild();}}
  function onKey(e){const t=e.target;if(e.key==='Enter'&&(t.id==='lineName'||(t.dataset&&(t.dataset.t1==='pname'||t.dataset.t1==='zname'||t.dataset.t1==='trn')))){e.preventDefault();t.blur();}}
  [document.getElementById('panel'),fl].forEach(el=>{if(!el)return;el.addEventListener('click',onClick);el.addEventListener('change',onChange);el.addEventListener('keydown',onKey);});
  document.addEventListener('keydown',e=>{if(e.key==='Escape'&&!/INPUT|TEXTAREA|SELECT/.test(e.target.tagName)){if(armed)arm(false);if(state.sel&&state.sel.kind==='lines'){state.sel=null;api.render();api.renderPanel();}}});
  let versionsChecked=false;
  /* ---------- l'objet branché sur main.js ---------- */
  const T1={
    etude:()=>ETUDE,cv:()=>state.cv,
    endLen:(t,dn)=>{const k=endKindOf(t);return k==='endcap'?(api.cat().endcap(dn).L||0.3):k==='bypass'?rules().jambeMin:0;}, // longueur de la pièce de bout (purge / vidange collée au bout)
    isBypass:isBypassEnd,endShort:t=>endTxt(t),
    endOptions:(atStart,cur)=>endOptionsHTML(atStart,cur,esc),endHelp:()=>END_HELP,
    // by-pass au départ : la soudure de jonction (aller ↔ retour), portée par l'aller, en tête des soudures (ordre du chaînage)
    bypassStart(l,conds,e,dn){if(l.parent||!isBypassEnd(l.startType)||!conds.A||!conds.R)return;const uA=conds.A.pieces.find(p=>p.kind==='bypassEnd'&&p.sid==='end:start'),uR=conds.R.pieces.find(p=>p.kind==='bypassEnd'&&p.sid==='end:start');if(!uA||!uR||!uA.apex)return;
      conds.A.welds.unshift({i:-1,m:0,x:uA.apex[0],y:uA.apex[1],between:[uA.id,uR.id+' (retour)'],dev:0,fc:false,dn:uA.dn||dn,bypass:true,bypassAt:'start'});
      conds.A.notes.push({kind:'doubt',m:0,txt:`by-pass en départ de ligne : 2 coudes 90° recoupés + soudure entre eux, à l'entraxe ${fmt(e)} m — les jambes pré-isolées (mini ${fmt(rules().jambeMin)} m) ne rentrent pas dans ${fmt(e/2)} m : à réaliser en coudes acier nus isolés sur place ou en élargissant l'entraxe (à cadrer)`});},
    afterRebuild(opts){if(opts&&opts.light)return;const ids=new Set(state.lines.map(l=>l.id));state.zones.forEach(z=>{z.lines=z.lines.filter(id=>ids.has(id));}); // une ligne supprimée quitte sa zone (même étape)
      if(ETUDE&&!versionsChecked&&state.lines.length){versionsChecked=true;if(state.lines.some(l=>vmOf(l)>1)&&state.show.versions===false){state.show.versions=true;api.saveShow();api.render();}}
      TB.afterRebuild(); /* 16/10 soir (lot TB) : changement de version (adresse) → ce qui a été supprimé pendant la version finie est figé, nouvelle référence */
      hist.schedule();persist();},
    undo:()=>hist.undo(),redo:()=>hist.redo(),flush:()=>hist.flush(), /* intégration 14/10 soir : snapshot() d'un autre module (calage T2…) = clore l'étape en attente avant SA modification */
    under,over,lineLabel,
    lineCol:(id,c)=>{if(!ETUDE||state.show.versions===false)return null;const col=verColor(vmOf(L(id)));return col?(c==='R'?col[1]:col[0]):null;},
    pcol:(p,c,col,base)=>TB.pcol(p,c,col,base),ghostTap:p=>TB.tap(p),tb:TB, /* 16/10 soir (lot TB) : couleur d'une pièce = version de SON tronçon (ligne sans l.sv : lineCol) ; clic sur ce qui a été supprimé */
    dash:(id,k)=>ETUDE&&trOf(L(id))==='option'?` stroke-dasharray="${Math.max(0.8,9/k)} ${Math.max(0.5,6/k)}"`:'',
    trancheHTML,lineExtra,multiHTML:()=>multiHTML(),lignesExtra,dilatHTML,reglesHTML,
    footEtude:()=>{const n=state.lines.filter(l=>vmOf(l)===state.cv).length;return `<span>étude <b>${esc(AFFN)}</b> · chiffrage <b>v${state.cv}</b> en cours${state.cv>1&&n?` · ${n} ligne${n>1?'s':''} créée${n>1?'s':''} ou modifiée${n>1?'s':''} en v${state.cv}`:''} · pas de marché (figé quand l'affaire sera gagnée)</span>`;},
    footDilat:()=>DX.footHTML(dilat(),state.lines.length), /* 16/10 (lot TA) : alertes, ou tableau non chargé, ou ✓ vérifié — touchable (dilatx.js) */
    saveNote:()=>{const n=state.lines.filter(l=>vmOf(l)===state.cv).length;return `<div class="note info" style="margin-top:6px">Étude ${esc(AFFN)} — chiffrage <b>v${state.cv}</b>${state.cv>1?` (${n} ligne${n>1?'s':''} créée${n>1?'s':''} ou modifiée${n>1?'s':''} dans cette version)`:''} : pas de tracé marché ni de TS — ils viendront quand l'affaire sera gagnée.${state.zones.length?` ${state.zones.length} zone${state.zones.length>1?'s':''} de chiffrage enregistrée${state.zones.length>1?'s':''}.`:''}</div>`;},
    dispOff:k=>ETUDE?(k==='marche'||k==='ecart'||k==='ts'):k==='versions', // étude : ni marché ni écarts ni TS ; chantier : pas de versions
    siteLoaded(site){state.zones=normZones(site&&site.traceur&&site.traceur.zones);versionsChecked=false;hist.resetOnNext();persist();TB.siteLoaded(site);}, // chantier / étude chargé : ses zones ; l'historique repart de là — 16/10 soir (lot TB) : référence de version, lignes supprimées
    bridgeOpts:()=>Object.assign({ctx:ETUDE?'etude':'chantier',cv:state.cv,zones:api.zonesX?api.zonesX.forBridge(state.zones):state.zones},TB.bridgeOpts()), /* 16/10 (K4, lot TA) : zones reliées au chiffrage → zone.ch ; 16/10 soir (lot TB) : + ghosts, vref (étude) */
    lassoStart,lassoMove,lassoEnd,toggleSel,
    // pour les tests et l'automatisation
    hist,dilat,loadRegles,select:setMulti,zoneNew:ids=>zoneNew(ids||multiIds()),zoneMove,zoneOut,zoneDel,zoneRename,zoneShow,setTranche,rename,arm,openZones:on=>{zonesOpen=on!==false;syncFloat(true);},endsRows};
  return T1;}
