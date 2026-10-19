// dpgfzone.js — LOT DZ (17/10) : les installations communes ventilées PAR ZONE dans le DPGF, « ⇶ sa part » d'un poste tout pointé, la quantité d'une ligne
// insérée. Ethan (17/10, en testant le lot DK) : « je calcule une nouvelle ligne avec des quantités en plus, mais je ne trouve pas comment lui imputer des lignes
// qui ont déjà été pointées au max […] les installations, on peut les ventiler selon les zones selon plusieurs critères, mais du coup après, dans le remplissage du
// DPGF, il ne faut pas que ce soit juste imputable au ml : ça revient à casser cette répartition-là choisie […] il faut que ces prix-là ventilés apparaissent dans
// cet outil dans chaque zone selon les montants choisis ventilés, pas un paragraphe installations seul ».
// · PART DE ZONE : chaque installation commune (composante globale « inst|<poste> », z = −1, au ml de tout le projet) a, pour chaque zone i, une composante
//   VIRTUELLE « inst|<poste>@<jeton de zone> » (dans CP.by seulement : jamais dans CP.list ni dans un lien) : part = parts[i] × montant (C.inst.ventil ; des %
//   qui ne font pas 100 sont ramenés au prorata), unité = les ml de la zone (une zone sans ml : « % de la part »). Une prise s'enregistre {k:'inst|<poste>', q,
//   zs:'<jeton>'} — q en unités de la composante globale (linkNow : q × PU, rien d'autre ne change). Une prise SANS zs (tout DPGF pointé avant ce lot) reste
//   valable : attribuée à la zone de sa ligne (comme le lot DK : ses postes par DN, sinon ses autres postes, sinon le DN de sa désignation ; plusieurs zones → au
//   prorata de leurs montants), à défaut au prorata de la ventilation. Reste d'une zone = sa part − ce qui lui est attribué.
// · CALCULATEUR : le groupe « 🏗 Installations » devient un récapitulatif (total, mode, part de chaque zone en puces cliquables, écarts + « ↻ Reventiler »,
//   « Prendre les installations de toutes les zones » pour une ligne au forfait, les prises d'avant sans zone de la ligne) ; chaque zone a son sous-bloc
//   « 🏗 Installations de la zone » (part, %, € / ml de la zone, pointé, reste ; cocher = la part de la ligne : € / ml de la zone × ml de la ligne, au plus le reste).
// · « ⇶ SA PART » (calculateur) : sur une composante tout pointée portée par au moins 2 lignes (installations de la zone, postes communs, postes du DN de la ligne) :
//   la part comme le lot DK (au ml : tenu par les donneuses × ml de la ligne ÷ (leurs ml + ml de la ligne) ; donneuses = les lignes au ml qui la portent dans la
//   zone ; ligne pas au ml : au prorata des montants), écrite au « Mettre » AVEC la ligne : un seul ↶ (run du lot C3 → give du lot DK, rendu sensible aux zones).
// · LISTE DES CHANGEMENTS : « Installations : ventilation par zone à refaire » (une zone portée au-delà de sa part, ex. DPGF pointé au ml global) et « …: la
//   ventilation par zone a changé » (référence suivi.vz = {poste: {jeton: montant}}, prise à la 1re ouverture : pas de fausse alerte) → « ↻ Reventiler » : par poste
//   et par zone, les parts portées par les lignes au ml de la zone mises à l'échelle de la part ventilée (proportions gardées), en zs ; les lignes au forfait ne
//   bougent pas (leur montant est retiré de la zone d'abord) ; une zone sans ligne garde son montant à placer (c'est dit) ; total pointé inchangé.
// · Un chiffrage sans installations communes (C.inst absent) : rien ne change. Tout ce que dpgfxl.js prête passe par init() (aucun import circulaire).
import {addrOf} from './xlcalc.js';
let X=null;export function init(api){X=api;}
const esc=s=>String(s??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const nb=(x,d)=>{x=+x||0;return x.toLocaleString('fr-FR',{maximumFractionDigits:d===undefined?0:d,minimumFractionDigits:d===undefined?0:d});};
const eur=(x,d)=>nb(x,d)+' €';const r2=x=>Math.round((+x||0)*100)/100;const r3=x=>Math.round((+x||0)*1000)/1000;const r6=x=>Math.round((+x||0)*1e6)/1e6;const up=s=>String(s||'').toUpperCase();
const fq=x=>nb(x,Math.abs(x-Math.round(x))>1e-9?(Math.abs(x*100-Math.round(x*100))>1e-6?3:2):0);const fin=x=>String(+(+x).toFixed(3)).replace('.',',');
const numIn=s=>{s=String(s??'').trim().replace(/[\s  ]/g,'').replace(',','.');if(!s)return null;const x=parseFloat(s);return isFinite(x)?x:null;};
const enc=s=>encodeURIComponent(String(s));const dec=s=>{try{return decodeURIComponent(String(s||''));}catch(e){return String(s||'');}};
const docOK=()=>typeof document!=='undefined';const pc=x=>{const v=(+x||0)*100;return nb(v,v<10&&Math.abs(v-Math.round(v))>0.05?1:0)+' %';};
const dnOfTxt=t=>{const m=String(t||'').match(/\bDN\s?(\d{2,3})\b/i);return m?+m[1]:null;};
const cdn=c=>{if(!c)return 0;if(c.dn)return +c.dn;const m=/\|d(\d+)(?:\.|$)/.exec(c.k||'');return m?+m[1]:0;};
const TOL=0.5; /* € : en dessous, une zone est « juste » */const GAP=1; /* € : une zone portée au-delà de sa part d'au moins 1 € */
export const MODE={ml:'au ml de tranchée',prix:'au prix (achat de la zone)',mo:'aux jours d\'équipe (soudure + manchon)',egal:'à parts égales',pct:'en % saisis'};
const MODE_S={ml:'au ml',prix:'au prix',mo:'aux jours d\'équipe',egal:'à parts égales',pct:'en %'};
const ZS={force:{},busy:{},msg:''};
export function reset(num){delete ZS.force[num];delete ZS.busy[num];}
/* ═════════ 1 · LES PARTS DE ZONE : composantes virtuelles (compsOf, dpgfxl.js) ═════════ */
export const on=CP=>!!(CP&&CP.zv);
export const bkOf=k=>{k=String(k||'');const i=k.indexOf('@');return i<0?k:k.slice(0,i);};
const tokOf=(CP,i)=>(CP.tok&&CP.tok[i])||'z'+i;
export function virt(R){if(!R||R._zv)return R;R._zv=1;R.zv=null;const C=R.C;const I=C&&C.inst;const n=R.zones.length;const G=R.list.filter(c=>c.z<0);
  if(!I||!I.ventil||!n||!G.length)return R;const V=I.ventil;const P=R.zones.map((z,i)=>Math.max(0,+((V.parts||[])[i])||0));const S=P.reduce((s,x)=>s+x,0);
  const sh=P.map(x=>S>0?x/S:1/n);const tok=R.zones.map((z,i)=>tokOf(R,i));const vcs=new Map();
  G.forEach(c=>{vcs.set(c.k,R.zones.map((z,i)=>{const ml=+z.ml||0;const u=ml>0&&c.u==='ml'?'ml':'%';const qty=u==='ml'?ml:100;const f=sh[i];const amtV=f*c.amtV;
    const v={k:c.k+'@'+tok[i],bk:c.k,b:c,v:1,z:i,zt:tok[i],zn:z.nom,p:c.p,pl:'Installations · '+c.pl,g:c.g,lab:'',u,qty,sh:f,amtV,amtA:f*c.amtA,mo:f*c.mo,fo:f*c.fo,st:f*c.st,loc:f*c.loc,puV:qty?amtV/qty:0,puA:qty?f*c.amtA/qty:0};
    v.f=c.puV>0?v.puV/c.puV:0; /* unités de la zone → unités de la composante globale */R.by.set(v.k,v);return v;}));});
  R.zv={mode:V.mode||'ml',sh,sum:+V.somme||S,tok,ti:new Map(tok.map((t,i)=>[t,i])),one:tok.map((t,i)=>tok.map((x,j)=>i===j?1:0)),vcs,G};return R;}
/* ═════════ 2 · QUI PORTE QUOI, PAR ZONE ═════════ */
/* les lignes du DPGF des liens (rangée, n°, désignation, unité, quantité, au ml ?) */
const LIC=new WeakMap();
function lineIdx(a,M){const D=a.dpgf||{};const liens=D.liens||[];const lg=D.lignes||[];const o=LIC.get(liens);if(o&&o.lg===lg&&o.M===M&&o.u===D.uOf&&o.c===D.cols)return o.m;
  const S=M?X.dpSheet(M,D):null;const sh=up(S?S.name:(D.sheetName||''));const pcol=X.puColOf(D);const byA=new Map();lg.forEach(l=>{if(!l.section&&l.row)byA.set(addrOf(l.row,pcol),l);});
  const m=new Map();liens.forEach(L=>{if(sh&&up(L.sh)!==sh)return;const l=X.CO&&M?X.CO.lineOf(a,M,L):byA.get(L.a); /* 19/10 (lot DY) : la ligne d'un lien par sa rangée, lue même sur un DPGF mal lu à l'import */if(!l)return;m.set(L.id,{row:l.row,n:String(l.n||''),des:String(l.des||''),u:String(l.u||''),q:+l.qte||0,isMl:X.REP.isMlU(l.u)});});
  if(liens.length)LIC.set(liens,{lg,m,M,u:D.uOf,c:D.cols});return m;}
/* zones d'une ligne : ses postes par DN, sinon ses autres postes de zone, au prorata de leurs montants ; sinon les zones du DN de sa désignation (au prorata de leurs
   ml de ce DN) ; une seule zone : elle ; sinon null (rien ne dit sa zone) */
function zwOf(CP,L,des){const n=CP.zones.length;if(!n)return null;const a=new Array(n).fill(0),b=new Array(n).fill(0);let A=0,B=0;const ha=new Set(),hb=new Set();
  if(L)(L.comps||[]).forEach(x=>{const c=CP.by.get(x.k);const q=+x.q||0;if(!c||c.v||c.z<0||!(q>0))return;const e=Math.abs(q*c.puV);if(cdn(c)){a[c.z]+=e;A+=e;ha.add(c.z);}else{b[c.z]+=e;B+=e;hb.add(c.z);}});
  const norm=(w,W,hs)=>W>0?w.map(x=>x/W):w.map((x,i)=>hs.has(i)?1/hs.size:0);if(ha.size)return norm(a,A,ha);if(hb.size)return norm(b,B,hb);
  const dn=dnOfTxt(des);if(dn){const m=new Array(n).fill(0);const hs=new Set();CP.list.forEach(c=>{if(c.z<0||c.dn!==dn)return;hs.add(c.z);m[c.z]=Math.max(m[c.z],+c.ml||0);});if(hs.size)return norm(m,m.reduce((s,x)=>s+x,0),hs);}
  return n===1?[1]:null;}
function wPiece(Z,CP,L,x,l,W){if(x.zs){const i=Z.ti.get(x.zs);if(i!==undefined)return Z.one[i];}let w=W?W.get(L.id):undefined;if(w===undefined){w=zwOf(CP,L,l?l.des:'')||Z.sh;if(W)W.set(L.id,w);}return w;}
/* par installation : ce qui est attribué à chaque zone (unités globales), par lien, sur les lignes au ml (mov) ou non (fix) ; skip = une répartition qu'on refait */
const ZDC=new WeakMap();
function zd(a,M,CP,skip){const Z=CP&&CP.zv;if(!Z)return null;const D=a.dpgf||{};const liens=D.liens||[];skip=skip||'';
  let c0=ZDC.get(liens);if(!c0||c0.cp!==CP||c0.lg!==D.lignes){c0={cp:CP,lg:D.lignes,m:{}};if(liens.length)ZDC.set(liens,c0);}if(c0.m[skip])return c0.m[skip];
  const n=CP.zones.length;const LI=lineIdx(a,M);const P=new Map();const W=new Map();
  liens.forEach(L=>{const l=LI.get(L.id)||null;const mv=!!(l&&l.isMl&&l.q>0);(L.comps||[]).forEach(x=>{if(skip&&x.rep===skip)return;const c=CP.by.get(x.k);const q=+x.q||0;if(!c||c.v||c.z>=0||!(q>0))return;
    const ws=wPiece(Z,CP,L,x,l,W);let o=P.get(c.k);if(!o)P.set(c.k,o={c,z:new Float64Array(n),fix:new Float64Array(n),mov:new Float64Array(n),by:new Map()});
    let b=o.by.get(L.id);if(!b)o.by.set(L.id,b=new Float64Array(n));for(let i=0;i<n;i++){const v=q*ws[i];if(!v)continue;o.z[i]+=v;b[i]+=v;(mv?o.mov:o.fix)[i]+=v;}});});
  const d={P,LI,W};c0.m[skip]=d;return d;}
const hasInst=(a,M,CP)=>{const d=zd(a,M,CP);return !!d&&d.P.size>0;};
/* par poste et par zone : part ventilée (S €), portée (P €) */
/* gapN : l'écart à la part, la part mise à l'échelle de ce qui est pointé quand le poste est pointé au-delà de 100 % (un linéaire du projet qui baisse : c'est la balance du lot C3,
   pas une ventilation à refaire) — c'est lui qui dit « une zone portée au-delà de sa part » */
function stOf(a,M,CP){const Z=CP.zv;const d=zd(a,M,CP);return Z.G.map(c=>{const o=d.P.get(c.k);const z=Z.vcs.get(c.k).map((v,i)=>{const P=(o?o.z[i]:0)*c.puV;return {i,v,S:v.amtV,P,gap:P-v.amtV};});
  const SP=z.reduce((s,x)=>s+x.P,0),SS=z.reduce((s,x)=>s+x.S,0);const f=SS>0?Math.max(1,SP/SS):1;z.forEach(x=>{x.gapN=x.P-x.S*f;});return {c,o,z};});}
function zTot(CP,st){return CP.zones.map((z,i)=>{let S=0,P=0;st.forEach(p=>{S+=p.z[i].S;P+=p.z[i].P;});return {i,z,S,P,gap:P-S,sh:CP.zv.sh[i]};});}
const isOver=st=>st.some(p=>p.z.some(x=>x.gapN>=GAP));
const gapSig=st=>st.map(p=>p.c.k+':'+p.z.map(x=>Math.round(x.gap)).join(',')).join(';');
const labOfL=(LI,L)=>{const l=LI.get(L.id);return l?(l.n||L.a):L.a;};
/* les lignes qui portent la part de la zone i d'une installation */
function holders(a,M,CP,v,skipId){const d=zd(a,M,CP);const o=d&&d.P.get(v.bk);if(!o)return [];const byId=new Map(((a.dpgf||{}).liens||[]).map(L=>[L.id,L]));const out=[];
  o.by.forEach((arr,id)=>{if(id===skipId||!(arr[v.z]>1e-9))return;const L=byId.get(id);if(L)out.push({L,l:d.LI.get(id)||null,q:arr[v.z],arr});});return out.sort((x,y)=>((x.l||{}).row||9e9)-((y.l||{}).row||9e9));}
const lst=L=>L.slice(0,5).join(', ')+(L.length>5?' +'+(L.length-5):'');
/* ═════════ 3 · LE CALCULATEUR (dpgfclair.js, dpgfxl.js) ═════════ */
/* une prise d'un lien avec zs → la case de la zone (calcState) ; la quantité exacte gardée (C.zx) : « Mettre » sans y toucher la réécrit telle quelle */
export function load(CP,C,x0){if(!on(CP)||!x0||!x0.zs||x0.sub)return false;const c=CP.by.get(x0.k);if(!c||c.v||c.z>=0)return false;const v=(CP.zv.vcs.get(c.k)||[])[CP.zv.ti.get(x0.zs)];if(!v||!(v.f>0))return false;
  C.zx=C.zx||{};C.zx[v.k]=(C.zx[v.k]||0)+(+x0.q||0);C.chk[v.k]=X.fmtIn(r3(C.zx[v.k]/v.f));return true;}
/* « Mettre » : la case d'une zone → {k: l'installation globale, q en unités globales, zs} (en place) */
export function toLink(CP,C,comps){if(!on(CP))return comps;for(let i=comps.length-1;i>=0;i--){const x=comps[i];const v=CP.by.get(x.k);if(!v||!v.v)continue;const ex=C.zx&&C.zx[v.k];
  let q=r6(x.q*v.f);if(ex!==undefined&&Math.abs(x.q-r3(ex/v.f))<=0.0006)q=ex;if(q>1e-9)comps[i]={k:v.bk,q,zs:v.zt};else comps.splice(i,1);}return comps;}
/* Σ du calculateur : les parts « ⇶ sa part » cochées */
export function ppAmt(a,CP,C){if(!C||!C.pp||!CP)return 0;let s=0;Object.keys(C.pp).forEach(k=>{const c=CP.by.get(k);const v=numIn(C.pp[k]);if(c&&v!==null&&v>0)s+=v*c.puV;});return s;}
export const hasPP=C=>!!(C&&C.pp&&Object.keys(C.pp).length);
/* Z4 : la quantité suit la grille (ici ou sur l'autre écran) tant qu'on n'a pas tapé dans « Qté » */
export function syncQ(a,M,T,C){css();if(!C||C.qt||!T)return;const lk=X.linkAt(a,T.sh,T.a);const qc=T.qa?X.qOfCell(M,T.sh,T.qa):null;const w=lk?String(qc!==null&&qc>0?qc:lk.q):(qc!==null?String(qc):'');if(C.q!==w)C.q=w;}
export const qHint=q=>q>0?'':'<span class="dz-qh">tape la quantité de la ligne (ici ou dans la grille)</span>';
export const whyHTML=(q,n)=>!(q>0)?'<span class="dz-why">« Mettre » est grisé : tape la quantité de la ligne (ici ou dans la grille).</span>':!n?'<span class="dz-why">« Mettre » est grisé : coche au moins une case.</span>':'';
/* vu de la ligne qu'on calcule (ses propres prises, hors répartitions, n'y sont pas ; unités globales) : zr = reste de la part de la zone, gr = reste de l'installation
   (toutes zones) ; on ne prend jamais plus que gr : une installation toute pointée ne se reprend qu'en « ⇶ sa part » ou en reventilant */
function zRaw(a,M,CP,v,lk){const d=zd(a,M,CP);const o=d&&d.P.get(v.bk);let att=o?o.z[v.z]:0,tot=o?o.z.reduce((s,x)=>s+x,0):0;
  if(lk&&o){const l=d.LI.get(lk.id)||null;(lk.comps||[]).forEach(x=>{if(x.rep)return;const c=CP.by.get(x.k);const q=+x.q||0;if(!c||c.k!==v.bk||!(q>0))return;att-=q*wPiece(CP.zv,CP,lk,x,l,d.W)[v.z];tot-=q;});}
  return {zr:v.sh*v.b.qty-att,gr:v.b.qty-tot};}
export function zRest(a,M,CP,v,lk){if(!(v.f>0))return 0;const r=zRaw(a,M,CP,v,lk);return Math.min(r.zr,Math.max(0,r.gr))/v.f;}
/* ce que la ligne peut encore prendre dans la zone (unités de la zone), ses autres cases de cette installation déduites (une prise d'avant sans zone, les autres zones) ;
   zs = le reste de la seule part de la zone (le manque d'une zone quand d'autres zones en portent trop) */
function freeIn(a,M,CP,C,T,v,lk){if(!(v.f>0))return {f:0,zs:0,pt:0};const r=zRaw(a,M,CP,v,lk);let gz=0,gg=0;const q=C.chk[v.bk];
  if(q!==undefined){const g=X.parseQ(q,v.b);const w=zwOf(CP,lk,T.line?T.line.des:'')||CP.zv.sh;gz=g*w[v.z];gg=g;}
  CP.zv.vcs.get(v.bk).forEach(o=>{if(o!==v&&C.chk[o.k]!==undefined)gg+=X.parseQ(C.chk[o.k],o)*o.f;});
  return {f:Math.min(r.zr-gz,Math.max(0,r.gr-gg))/v.f,zs:(r.zr-gz)/v.f,pt:(v.sh*v.b.qty-r.zr)/v.f,gf:Math.max(0,r.gr-gg)};}
const freeOf=(a,M,CP,C,T,v,lk)=>freeIn(a,M,CP,C,T,v,lk).f;
/* la zone de la ligne qu'on calcule : ce qui y est coché (postes par DN d'abord), sinon les cases qu'on va cocher, sinon son lien, sinon le DN de sa désignation */
function curZone(a,M,CP,T,C,keys){const n=CP.zones.length;if(n===1)return 0;
  const best=list=>{const e1=new Map(),e2=new Map();list.forEach(([c,e])=>{if(!c||c.v||c.z<0)return;const m=cdn(c)?e1:e2;m.set(c.z,(m.get(c.z)||0)+Math.abs(e||0));});const m=e1.size?e1:e2;let b=-1,bv=-1;m.forEach((v,i)=>{if(v>bv){bv=v;b=i;}});return b;};
  let z=best(Object.keys(C.chk||{}).map(k=>{const c=CP.by.get(k);return [c,c?X.parseQ(C.chk[k],c)*c.puV:0];}).concat(Object.keys(C.sub||{}).map(k=>[CP.by.get(k),1])));if(z>=0)return z;
  if(keys){z=best(keys.map(k=>{const c=CP.by.get(String(k).split('#')[0]);return [c,c?c.amtV:0];}));if(z>=0)return z;}
  const w=zwOf(CP,X.linkAt(a,T.sh,T.a),T.line?T.line.des:'');if(w){let b=-1,bv=0;w.forEach((x,i)=>{if(x>bv){bv=x;b=i;}});return b;}return -1;}
/* « Comme la ligne », sélections gardées, case de la ventilation : une installation globale → la part de LA zone de la ligne */
export function mapKeys(a,M,CP,T,C,keys,R){if(!on(CP))return keys;let zi=null;const out=[];
  (keys||[]).forEach(key=>{const s=String(key);const i=s.indexOf('#');const c=CP.by.get(i<0?s:s.slice(0,i));if(!c||c.v||c.z>=0){out.push(key);return;}
    if(zi===null)zi=curZone(a,M,CP,T,C,keys);const v=zi>=0?(CP.zv.vcs.get(c.k)||[])[zi]:null;if(v)out.push(v.k);else if(R)R.nz=(R.nz||0)+1;});return [...new Set(out)];}
export const pickNz=R=>R&&R.nz?' · installations : la zone de la ligne n\'est pas connue (coche d\'abord ses soudures, ou coche-les dans le groupe de la zone)':'';
/* sélection gardée : les installations sous leur clé globale (elles recochent la part de la zone de chaque ligne), les parts cochées comprises */
export function selKeys(C,L){const s=new Set();(L||[]).forEach(k=>s.add(bkOf(k)));Object.keys((C&&C.pp)||{}).forEach(k=>s.add(bkOf(k)));return [...s];}
/* « ⇶ sa part » : les donneuses (lignes au ml qui portent la composante dans la zone), ce qu'elles tiennent, la part proposée — le calcul du lot DK (D1) */
function partPlan(a,M,CP,C,T,k){const c=CP.by.get(k);if(!c||!T)return null;const D=a.dpgf||{};const lk=X.linkAt(a,T.sh,T.a);const LI=lineIdx(a,M);const H=new Map();const byId=new Map((D.liens||[]).map(L=>[L.id,L]));
  if(c.v){holders(a,M,CP,c,null).forEach(h=>{if(c.f>0)H.set(h.L.id,{t:h.q/c.f,ml:(()=>{const tot=h.arr.reduce((s,x)=>s+x,0);return h.l&&tot>0?h.l.q*h.arr[c.z]/tot:0;})()});});}
  else (D.liens||[]).forEach(L=>{const t=X.SV.tOf(CP,L,c.k);const l=LI.get(L.id);if(t>1e-9)H.set(L.id,{t,ml:l?l.q:0});});
  const own=lk&&H.has(lk.id)?H.get(lk.id).t:0;if(lk)H.delete(lk.id);const n0=H.size;const ds=[];H.forEach((o,id)=>{const l=LI.get(id);if(!l||!l.isMl||!(l.q>0)||!(o.t>1e-9))return;ds.push({id,t:o.t,ml:o.ml,L:byId.get(id)});});
  const Qd=ds.reduce((s,d)=>s+d.t,0),mlD=ds.reduce((s,d)=>s+d.ml,0);const q=X.parseQ(C.q,{qty:0});const isMl=!!(T.line&&X.REP.isMlU(T.u));let def=0,key='ml';
  if(isMl&&mlD>0){def=q>0?Qd*q/(mlD+q):0;}else{key='amt';const AL=X.calcSum(a,CP,C)-ppAmt(a,CP,C);const AD=ds.reduce((s,d)=>s+Math.max(0,X.linkNow(d.L,CP,M).amt-d.t*c.puV),0);def=AL>0?Qd*AL/(AD+AL):0;}
  return {c,holders:n0,ds,n:ds.length,Qd,mlD,def:Math.min(Qd,Math.max(0,def)),key,q,own};}
const uOf=c=>c.v?(c.u==='ml'?'ml de la zone':'% de la part'):c.u;
const canPart=P=>!!P&&P.holders>=2&&P.Qd>1e-9&&!(P.own>1e-9); /* portée par au moins 2 autres lignes, pas déjà sur celle-ci (répartition comprise) */
function partCtlK(a,M,CP,C,T,k,ro){if(!T||!T.line)return '';const c0=CP.by.get(k);if(c0&&c0.z>=0&&CP.zones.length>1&&!(C.pp&&C.pp[k]!==undefined)){const zi=curZone(a,M,CP,T,C,null);if(zi>=0&&zi!==c0.z)return '';} /* une autre zone que celle de la ligne : pas proposé (« ⇶ Donner sa part » reste là pour un cas à part) */
  const P=partPlan(a,M,CP,C,T,k);if(!canPart(P))return '';const c=P.c;const on_=!!(C.pp&&C.pp[k]!==undefined);const u=uOf(c);
  const dE=P.def*c.puV;const why=P.key==='ml'?'au prorata de leurs ml':'au prorata des montants';
  const sub='reprise sur '+P.n+' ligne'+(P.n>1?'s':'')+' de la zone, '+why+(P.def>1e-9?'':' · '+(P.key==='ml'&&!(P.q>0)?'tape d\'abord la quantité de la ligne':'mets d\'abord le prix de la ligne, ou tape la part'));
  const v=on_?numIn(C.pp[k]):null;const bad=on_&&(v===null||v<0||v>P.Qd+1e-6);
  return `<div class="dz-pp${on_?' on':''}${bad?' bad':''}" data-k="${esc(k)}"><label class="dz-ppl"><input type="checkbox" data-dz="pp" data-k="${esc(k)}"${on_?' checked':''}${ro?' disabled':''} aria-label="${esc('Sa part : '+X.compName(c))}"><span>⇶ sa part${P.def>1e-9?' ≈ <b>'+eur(dE,dE<10?2:0)+'</b>':''} <small>${esc(sub)}</small></span></label>${on_?`<span class="dz-ppq">part <input inputmode="decimal" data-dz="pq" data-k="${esc(k)}" value="${esc(C.pp[k])}"${ro?' disabled':''} aria-label="${esc('Part de la ligne : '+X.compName(c))}"> ${esc(u)} = <b data-dzpa="${esc(k)}">${eur((v||0)*c.puV,2)}</b> <small class="dz-ppm">${bad?'au plus '+esc(fq(P.Qd)+' '+u):''}</small></span>`:''}</div>`;}
/* une ligne tout pointée du calculateur (dpgfclair.js rowOf) : « ⇶ sa part » si elle est portée par au moins 2 lignes (postes communs, ou du DN de la ligne) */
export function partCtl(a,M,CP,C,c,ro){if(!c||!M)return '';const T=X.calcTarget(a,M);if(!T||!T.line)return '';if(c.z<0&&on(CP))return ''; /* les installations globales : par zone */
  const dn=cdn(c);if(dn){const s=new Set();Object.keys(C.chk||{}).forEach(k=>{const x=CP.by.get(k);if(x&&cdn(x))s.add(cdn(x));});const d=dnOfTxt(T.line.des);if(d)s.add(d);if(!s.has(dn))return '';}
  return partCtlK(a,M,CP,C,T,c.k,ro);}
/* la case de la part d'une zone */
function vcRow(a,M,CP,C,T,v,ro,lk){const k=v.k;const on_=C.chk[k]!==undefined;const FI=freeIn(a,M,CP,C,T,v,lk);const free=FI.f;const tl=Math.max(0.0006,v.qty*1e-7,v.puV>0?0.005/v.puV:0); /* une quantité tapée au millième, un demi-centime */const q=on_?X.parseQ(C.chk[k],v):0;const left=free-q;
  const done=!on_&&free<=tl;const ml=v.u==='ml';const pt=FI.pt*v.puV;const short=FI.zs-Math.max(0,free); /* ce qui manque à la zone, l'installation toute pointée ailleurs */
  const sp_=stOf(a,M,CP).find(p=>p.c.k===v.bk);const zOver=!!sp_&&sp_.z[v.z].gapN>=GAP; /* la zone portée au-delà de sa part (pas un linéaire du projet qui baisse) */const rv=ro?'':' : « ↻ Reventiler » en haut du calculateur';
  const det=`part de la zone ${pc(v.sh)}${ml?' · '+nb(v.puV,2)+' € / ml de la zone ('+fq(v.qty)+' ml)':''} · pointé ${eur(pt)}${!done&&!on_?' · <b class="c2-rs">reste '+eur(free*v.puV)+'</b>'+(short*v.puV>=GAP?' · <b class="c3-bad">il manque '+eur(FI.zs*v.puV)+' à la zone</b> : d\'autres zones en portent trop':''):''}${free<-tl&&!(done&&zOver)?' · <b class="c3-bad">⚠ pointé au-delà de '+eur(-free*v.puV)+'</b>':''}`;
  const by=done?holders(a,M,CP,v,lk?lk.id:null).map(h=>labOfL(lineIdx(a,M),h.L)):[];
  if(X.CO&&X.CO.prOn(a,M,CP,C,T,v))return X.CO.prRow(a,M,CP,C,T,v,ro,{FI,done,short,det,by:by.map(esc),lk,ZI:_zi,head:short*v.puV>=GAP?`<b class="c3-bad">il manque ${eur(short*v.puV)} à la zone</b>, portés par d'autres zones${rv}`:zOver&&free<-tl?`<b class="c3-bad">⚠ la zone porte ${eur(-free*v.puV)} de plus que sa part</b>${rv}`:'✓ tout pointé dans la zone'}); /* 19/10 (lot DY) : ligne au ml → « prendre au prorata de mes ml » (reste, puis reprise ; jamais grisée) */
  let h=`<div class="dx-cr c2-r dz-r${on_?' on':''}${on_&&left<-tl?' over':''}${on_&&Math.abs(left)<=tl?' full':''}${done?' c2-done':''}" data-k="${esc(k)}"><input type="checkbox" data-dz="ck" data-k="${esc(k)}"${on_?' checked':''}${ro||done?' disabled':''} aria-label="${esc('Installations de '+v.zn+' : '+v.b.pl)}"><span class="c2-nm">🏗 ${esc(v.b.pl)}<small>${det}</small></span><span class="m">${eur(v.amtV)}</span>`
    +(on_?`<div class="dx-cq">prendre <input inputmode="decimal" data-dx="cq" data-k="${esc(k)}" value="${esc(C.chk[k])}"${ro?' disabled':''} aria-label="${esc('Part prise : '+v.b.pl)}"> ${ml?'ml de la zone':'% de la part'} = <b data-amt="${esc(k)}">${eur(q*v.puV,2)}</b> <span class="dx-rst">${left<-tl?'⚠ dépasse de '+eur(-left*v.puV):Math.abs(left)<=tl?'✓ tout pointé dans la zone':'reste '+eur(left*v.puV)}</span></div>`:'')
    +(done?`<div class="c2-dn">${short*v.puV>=GAP?`<b class="c3-bad">il manque ${eur(short*v.puV)} à la zone</b>, portés par d'autres zones${rv}`:zOver&&free<-tl?`<b class="c3-bad">⚠ la zone porte ${eur(-free*v.puV)} de plus que sa part</b>${rv}`:'✓ tout pointé dans la zone'}${by.length?' · ligne'+(by.length>1?'s':'')+' '+esc(lst(by)):''}</div>`:'')+'</div>';
  if(done)h+=partCtlK(a,M,CP,C,T,k,ro);return {h,on:on_,done};}
/* le sous-bloc d'une zone (en tête de son groupe) : la part de chaque installation, puis les postes d'installation propres à la zone */
function zoneBlock(a,M,CP,C,T,i,g,hit,ro,rowOf){const Z=CP.zv;const lk=X.linkAt(a,T.sh,T.a);const base=g.nom+' installations 🏗 ';const rows=[];
  Z.G.forEach(c=>{const v=Z.vcs.get(c.k)[i];if(!v||(!(v.amtV>0.004)&&C.chk[v.k]===undefined))return;if(!hit(base+c.pl))return;rows.push(vcRow(a,M,CP,C,T,v,ro,lk));});
  CP.list.filter(c=>c.z===i&&X.SV.isInst(c)).forEach(c=>{if(!hit(base+X.compName(c)))return;const r=rowOf(c,null,[]);rows.push(r);});
  if(!rows.length)return null;const S=Z.G.reduce((s,c)=>s+Z.vcs.get(c.k)[i].amtV,0);
  return {h:`<div class="dz-zb" data-zi="${i}"><div class="dz-zh">🏗 Installations de la zone <span class="hint">· ventilées ${esc(MODE_S[Z.mode]||Z.mode)} · ${eur(S)} (${pc(Z.sh[i])})</span></div>${rows.filter(r=>!r.done).map(r=>r.h).join('')}${rows.filter(r=>r.done).map(r=>r.h).join('')}</div>`,on:rows.some(r=>r.on),done:false};}
/* une prise d'avant sans zone de la ligne (lien d'avant ce lot) : décochable, quantité modifiable, comptée dans la zone de la ligne */
function oldRow(a,CP,C,T,c,ro){const q=X.parseQ(C.chk[c.k],c);const w=zwOf(CP,X.linkAt(a,T.sh,T.a),T.line?T.line.des:'');const zs=w?CP.zones.filter((z,i)=>w[i]>0.001).map(z=>z.nom):[];
  return `<div class="dx-cr c2-r on dz-old" data-k="${esc(c.k)}"><input type="checkbox" data-dx="ck" data-k="${esc(c.k)}" checked${ro?' disabled':''} aria-label="${esc(X.compName(c)+' (pointé avant, sans zone)')}"><span class="c2-nm">🏗 ${esc(c.pl)}<small>pointé avant ce lot, sans zone : compté ${zs.length?'dans '+esc(zs.join(', ')):'au prorata de la ventilation'} · décoche puis coche la part de la zone pour le ranger</small></span><span class="m">${eur(q*c.puV)}</span><div class="dx-cq">prendre <input inputmode="decimal" data-dx="cq" data-k="${esc(c.k)}" value="${esc(C.chk[c.k])}"${ro?' disabled':''}> ${esc(c.u)} (du projet) = <b data-amt="${esc(c.k)}">${eur(q*c.puV,2)}</b></div></div>`;}
/* le récapitulatif en tête (l'ancien groupe « 🏗 Installations ») */
function headHTML(a,M,CP,C,T,ro){const Z=CP.zv;const st=stOf(a,M,CP);const zt=zTot(CP,st);const n=CP.zones.length;const tot=Z.G.reduce((s,c)=>s+c.amtV,0);const lk=X.linkAt(a,T.sh,T.a);
  const tk=i=>st.reduce((s,p)=>s+Math.min(Math.max(0,p.z[i].S-p.z[i].P),Math.max(0,p.c.amtV-p.z.reduce((t,y)=>t+y.P,0))),0); /* ce que la zone peut encore prendre (au plus le reste de chaque installation) */
  const chip=x=>{const s=x.gap>=GAP?'⚠ +'+eur(x.gap):x.gap<=-GAP?(-x.gap-tk(x.i)>=GAP?'il manque ':'reste ')+eur(-x.gap):'✓ placé';return `<button type="button" class="dz-chip${x.gap>=GAP?' over':Math.abs(x.gap)<GAP?' ok':''}" data-act="af" data-v="dxc3go|${enc(tokOf(CP,x.i))}" title="${esc('Aller aux installations de '+x.z.nom+' : '+eur(x.S)+' ventilés, '+eur(x.P)+' portés')}"><b>${esc(x.z.nom)}</b> ${eur(x.S)} <small>${pc(x.sh)} · ${s}</small></button>`;};
  const over=isOver(st);const gap=over?`<div class="dz-gap" role="status"><span>⚠ <b>Le DPGF ne les porte pas comme ventilé au chiffrage</b> : ${zt.filter(x=>Math.abs(x.gap)>=GAP).map(x=>esc(x.z.nom)+' : '+eur(x.P)+' portés pour '+eur(x.S)+' ventilés').join(' · ')}.</span>${ro?'':`<button type="button" class="btn sm primary" data-act="af" data-v="dxdzrev|" title="Ouvre la liste des changements : chaque zone reçoit sa part, sur ses lignes, avec l'aperçu des PU avant → après">↻ Reventiler les installations par zone</button>`}</div>`:'';
  let all='';if(!ro&&T.line&&!X.REP.isMlU(T.u)){let R=0;Z.G.forEach(c=>{let s_=0,g=null;Z.vcs.get(c.k).forEach(v=>{if(C.chk[v.k]!==undefined)return;const F=freeIn(a,M,CP,C,T,v,lk);if(F.f*v.puV>=TOL)s_+=F.f*v.puV;if(F.gf!==undefined)g=F.gf;});R+=g===null?s_:Math.min(s_,g*c.puV);}); /* au plus le reste de chaque installation */if(R>=TOL)all=`<button type="button" class="btn sm dz-all" data-act="af" data-v="dxdzall|" title="Une ligne au forfait (ex. installation de chantier) : coche le reste de chaque installation, dans chaque zone, en une fois">Prendre les installations de toutes les zones (reste) · ${eur(R)}</button>`;}
  const old=Z.G.filter(c=>C.chk[c.k]!==undefined).map(c=>oldRow(a,CP,C,T,c,ro)).join('');
  const note=Math.abs(Z.sum-1)>0.0005?`<div class="hint dz-note">Les % du chiffrage font ${pc(Z.sum)} : chaque zone est ramenée au prorata, pour placer 100 % des installations.</div>`:'';
  return `<div class="dz-head"><div class="dz-ht"><b>${eur(tot)}</b> ventilés <b>${esc(MODE[Z.mode]||Z.mode)}</b> sur ${n} zone${n>1?'s':''} : la part de chaque zone se coche dans son groupe, ci-dessous.</div><div class="dz-chips" role="group" aria-label="Aller aux installations d'une zone">${zt.map(chip).join('')}</div>${note}${gap}${all}${old}</div>`;}
/* dpgfclair.js listHTML : le groupe « 🏗 Installations » = le récapitulatif ; chaque zone : son sous-bloc en tête */
export function rows(a,M,CP,C,AV,g,R,hit,ro,rowOf){if(!on(CP)||!M)return;const T=X.calcTarget(a,M);if(!T)return;
  if(g.k==='inst'){R.length=0;if(!hit('installations 🏗'))return;let h=headHTML(a,M,CP,C,T,ro);
    /* une zone sans aucun autre poste n'a pas de groupe : son sous-bloc reste ici */CP.zones.forEach((z,i)=>{if(X.SV.calcGroups(CP).some(x=>x.k===tokOf(CP,i)))return;const b=zoneBlock(a,M,CP,C,T,i,{nom:z.nom},hit,ro,rowOf);if(b)h+=`<div class="dz-orz"><b>${esc(z.nom)}</b>${b.h}</div>`;});
    R.push({h,done:false,on:false});return;}
  const i=CP.zones.findIndex((z,j)=>tokOf(CP,j)===g.k);if(i<0)return;const b=zoneBlock(a,M,CP,C,T,i,g,hit,ro,rowOf);if(b)R.unshift(b);}
/* la case « Installations » de la ventilation (dpgfxl.js dxvpick) : la part de la zone de la ligne */
export function vpick(a,M,CP,T,C,pk){if(!on(CP))return false;const c=CP.zv.G.find(x=>x.p===pk);if(!c)return false;const zi=curZone(a,M,CP,T,C,null);
  if(zi<0){X.say('Installations : la zone de la ligne n\'est pas connue — coche d\'abord ses soudures, ou coche la part dans le groupe de la zone');return true;}
  const v=CP.zv.vcs.get(c.k)[zi];if(C.chk[v.k]!==undefined)delete C.chk[v.k];else{const f=freeOf(a,M,CP,C,T,v,X.linkAt(a,T.sh,T.a));C.chk[v.k]=X.fmtIn(X.CO&&X.CO.prOn(a,M,CP,C,T,v)?X.CO.prDef(T,C):X.REP.defTake(v,T,X.parseQ(C.q,{qty:0}),Math.max(0,f)));}return true;}
/* la chip d'une sélection gardée : ses composantes tout pointées qui ont une part à prendre (« ⇶ leurs parts ») */
export function selPx(a,M,CP,T,C,st){if(!T||!T.line||!st||!(st.exK||[]).length)return 0;return st.exK.filter(k=>{const kk=String(k).split('#')[0];if(C.pp&&C.pp[kk]!==undefined)return false;if(X.CO&&X.CO.prOn(a,M,CP,C,T,CP.by.get(kk)))return true; /* (lot DY) au prorata des ml */return canPart(partPlan(a,M,CP,C,T,kk));}).length;}
export const selPxBtn=(S,px)=>px?`<button type="button" class="btn sm dz-selp" data-act="af" data-v="dxdzselp|${esc(S.id)}" title="Ces postes sont déjà tout pointés sur d'autres lignes : coche « ⇶ sa part » de chacun (reprise sur les lignes qui les portent, au « Mettre »)">⇶ leurs parts · ${px}</button>`:'';
/* « ↦ Mettre » avec des parts cochées : la ligne (ses cases), puis ses parts reprises sur les donneuses — un seul dxWrite, un seul ↶ */
export function putParts(a,M,CP,T,C,L,old,vals){const Y=X.CO&&on(CP)&&T.line?X.CO.prSplit(a,M,CP,T,C,L,_zi):null; /* 19/10 (lot DY) : « prendre au prorata de mes ml » : le reste sur la ligne, la reprise en parts données */
  if(Y&&Y.chg&&!Y.rows.length&&!hasPP(C)){ZS.msg=X.CO.prPut(a,CP,T,L,old,vals,Y);return 1;} /* plus rien à reprendre : la part ramenée à ce qui reste */
  if(!hasPP(C)&&!(Y&&Y.rows.length))return 0;if(!T.line){X.say('« ⇶ sa part » : seulement sur une ligne du DPGF');return -1;}const rows=[];const bad=[];if(Y)Y.rows.forEach(r=>rows.push(r));
  Object.keys(C.pp||{}).forEach(k=>{const P=partPlan(a,M,CP,C,T,k);const v=numIn(C.pp[k]);if(!P||!(P.Qd>1e-9))return;if(v===null||v<0||v>P.Qd+1e-6){bad.push(X.compName(P.c));return;}if(v>1e-9)rows.push({k,q:r3(v),ids:P.ds.map(d=>d.id)});});
  if(bad.length){X.say('Une part dépasse ce que portent les autres lignes : '+bad.slice(0,3).join(', '));return -1;}if(!rows.length)return 0;
  const D=a.dpgf||{};const L2=Object.assign({},L,{qfix:true});const liens=old?(D.liens||[]).map(x=>x.id===old.id?L2:x):(D.liens||[]).concat([L2]);const a2=Object.assign({},a,{dpgf:Object.assign({},D,{liens})});
  const R=X.SV.run(a2,CP,M,[{it:{k:'part:R'+T.r,kind:'part',row:T.r,lines:[]},act:'give',arg:{cfg:{row:T.r,rows,id:L.id}}}]);if(R.msg.length){X.say('Rien d\'écrit : '+R.msg.join(' ; '));return -1;} /* (lot DY) id : le lien de la ligne, même hors de la colonne PU */
  const W=R.W.map(x=>x.id===L.id?Object.assign({},x,{qfix:L.qfix}):x);const V=vals.slice(1).concat(R.vals); /* le PU de la ligne : celui de run() (parts comprises) ; la quantité écrite dans la grille si demandé */
  X.dxWrite(a,V,{liens:()=>W});const m=X.SV.moved(R.chg);X.SV.flash(m.filter(x=>x.neu!==null).map(x=>x.id));const Ln=W.find(x=>x.id===L.id);const giv=new Set();rows.forEach(r=>r.ids.forEach(id=>giv.add(id)));
  const amt=rows.reduce((s,r)=>s+r.q*CP.by.get(r.k).puV,0);
  if(Y&&Y.rows.length&&Y.e.rest>=0.5){ZS.msg=X.CO.prMsg(old,Ln,T,Y,m.length,giv.size);return 1;} /* (lot DY) une part payée en partie par le reste */
  ZS.msg=(old?'Prix mis à jour':'Prix lié')+' : '+nb(Ln?Ln.pu:0,2)+' € dans '+T.a+' — avec sa part de '+rows.length+' poste'+(rows.length>1?'s':'')+' tout pointé'+(rows.length>1?'s':'')+' ('+eur(amt)+'), reprise au prorata sur '+giv.size+' ligne'+(giv.size>1?'s':'')+' · '+m.length+' PU réécrit'+(m.length>1?'s':'')+', surligné'+(m.length>1?'s':'')+' dans la grille · ↶ pour revenir';return 1;}
export const lastMsg=()=>ZS.msg;
/* 19/10 (lot DY) : ce que dpgfcols.js emprunte aux zones (la case « prendre au prorata de mes ml ») */
const _zi={freeIn,holders,stOf,lineIdx};
/* ═════════ 4 · LE LOT DK (dpgfrecap.js) : « Donner sa part » sensible aux zones ═════════ */
/* G0 : la part de zone de chaque installation, ligne par ligne (unités de la zone), sous la clé virtuelle ; l'installation globale n'y est plus */
export function holdV(a,M,CP,hold){if(!on(CP))return;const d=zd(a,M,CP);if(!d)return;CP.zv.G.forEach(c=>{hold.delete(c.k);const o=d.P.get(c.k);if(!o)return;const vs=CP.zv.vcs.get(c.k);
  o.by.forEach((arr,id)=>{for(let i=0;i<arr.length;i++){const v=vs[i];if(!v||!(v.f>0)||!(arr[i]>1e-9))continue;let m=hold.get(v.k);if(!m)hold.set(v.k,m=new Map());m.set(id,arr[i]/v.f);}});});}
/* runAct give : pour une part de zone, ce que tient une ligne (unités de la zone), sa mise à l'échelle (seulement ses morceaux de cette zone), le morceau reçu (zs) */
export function gv(CP,k,a,M){const v=on(CP)?CP.by.get(k):null;if(!v||!v.v)return null;const Z=CP.zv;const LI=a&&M?lineIdx(a,M):new Map();
  const ws=(L,x)=>wPiece(Z,CP,L,x,LI.get(L.id)||null,null);
  const tOf=(c_,L)=>(L.comps||[]).reduce((s,x)=>{if(x.sub||X.SV.kOf(CP,x)!==v.bk)return s;return s+(+x.q||0)*ws(L,x)[v.z];},0)/(v.f||1);
  const scaleLine=(c_,L,k_,T,T2)=>{const W=ws(L,{});L.comps=L.comps.flatMap(x=>{if(x.sub||X.SV.kOf(CP,x)!==v.bk)return [x];if(x.zs&&Z.ti.has(x.zs))return [x];const w=x.zs?W:ws(L,x);return w.map((wi,j)=>wi>0?Object.assign({},x,{q:r6((+x.q||0)*wi),zs:Z.tok[j]}):null).filter(Boolean);}); /* ses prises sans zone passent en zs (mêmes montants) */
    const P=L.comps.filter(x=>!x.sub&&X.SV.kOf(CP,x)===v.bk&&x.zs===v.zt);const Tg=P.reduce((s,x)=>s+(+x.q||0),0);const T2g=Math.max(0,T2)*v.f;
    if(Tg>1e-12)P.forEach(x=>{x.q=r6((+x.q||0)*T2g/Tg);});else if(T2g>1e-9)L.comps.push({k:v.bk,q:r6(T2g),zs:v.zt});L.comps=L.comps.filter(x=>x.sub||X.SV.kOf(CP,x)!==v.bk||(+x.q||0)>1e-9);};
  return {tOf,scaleLine,comp:(q,pid,at)=>({k:v.bk,q:r6(q*v.f),via:'part',pid,at,zs:v.zt})};}
/* ═════════ 5 · LA LISTE DES CHANGEMENTS (dpgfsuivi.js) ═════════ */
const vzNow=CP=>{const o={};CP.zv.G.forEach(c=>{const m={};CP.zv.vcs.get(c.k).forEach(v=>{m[v.zt]=r2(v.amtV);});o[c.p]=m;});return o;};
/* la ventilation d'aujourd'hui face à la référence : seules les proportions comptent (le montant total qui bouge, c'est la balance du lot C3) */
function vzDiff(CP,ref){if(!ref)return null;const Z=CP.zv;const per=new Map();let any=false;
  Z.G.forEach(c=>{const r=ref[c.p];if(!r)return;const R0=Object.values(r).reduce((s,x)=>s+(+x||0),0);const cur=Z.vcs.get(c.k);const N0=cur.reduce((s,v)=>s+v.amtV,0);if(!(R0>0)||!(N0>0))return;
    const toks=new Set(Object.keys(r).concat(cur.map(v=>v.zt)));toks.forEach(t=>{const v=cur.find(x=>x.zt===t);const fr=(+r[t]||0)/R0,fn=v?v.amtV/N0:0;if(Math.abs(fr-fn)>0.0005)any=true;const o=per.get(t)||{t,nom:v?v.zn:'zone retirée',i:v?v.z:9e9,from:0,to:0};o.from+=fr*N0;o.to+=v?v.amtV:0;per.set(t,o);});});
  return any?[...per.values()].sort((x,y)=>x.i-y.i):null;}
/* les éléments : « ventilation par zone changée » (prioritaire) ou « ventilation par zone à refaire » */
export function items(a,CP,M,ok){if(!on(CP)||!M)return [];const d=zd(a,M,CP);if(!d||!d.P.size)return [];const S=(a.dpgf||{}).suivi||null;const force=!!ZS.force[a.num];ok=ok||{};
  const st=stOf(a,M,CP);const zt=zTot(CP,st);const byId=new Map(((a.dpgf||{}).liens||[]).map(L=>[L.id,L]));const ids=new Set();d.P.forEach(o=>o.by.forEach((x,id)=>ids.add(id)));const lines=[...ids].map(id=>byId.get(id)).filter(Boolean);
  const rv=revPlan(a,M,CP);const base={c:null,zn:'toutes les zones',lines,zt,rv,solo:true,rk:-1};
  const ch=S&&S.vz?vzDiff(CP,S.vz):null;
  if(ch)return [Object.assign({},base,{k:'vz:inst',kind:'vz',nm:'Installations : la ventilation par zone a changé',ch,short:'Installations : la ventilation par zone a changé'})];
  if(!isOver(st))return [];const sig=gapSig(st);if(!force&&ok['vzgap:inst']===sig)return [];
  return [Object.assign({},base,{k:'vzgap:inst',kind:'vzgap',nm:'Installations : ventilation par zone à refaire',sig,short:'Installations : ventilation par zone à refaire'})];}
const unplTxt=rv=>rv.unpl.length?' <b class="c3-bad">'+rv.unpl.map(u=>esc(u.nom)+' : aucune ligne au ml n\'en porte — '+eur(u.e)+' resteront à placer').join(' · ')+'</b>.':'';
export function phrase(it){const Z=it.rv;const how=' ↻ Reventiler : chaque zone reçoit sa part, sur ses lignes au ml (leurs proportions gardées) ; les lignes au forfait ne bougent pas.';
  if(it.kind==='vz')return `La ventilation des installations a changé au chiffrage : ${it.ch.map(x=>'<b>'+esc(x.nom)+'</b> : '+eur(x.from)+' → '+eur(x.to)).join(' · ')} — le DPGF porte encore l'ancienne répartition.${how}${mvTxt(Z)}${unplTxt(Z)}`; /* (lot DY) qui rend quoi */
  return `Le DPGF porte les installations autrement que la ventilation du chiffrage : ${it.zt.filter(x=>Math.abs(x.gap)>=GAP).map(x=>'<b>'+esc(x.z.nom)+'</b> : '+eur(x.P)+' portés pour '+eur(x.S)+' ventilés').join(' · ')}.${how}${mvTxt(Z)}${unplTxt(Z)}`;}
export const actsHTML=(B,okB)=>B('revent','↻ Reventiler les installations par zone','primary','Chaque zone reçoit sa part ventilée, sur ses lignes au ml (proportions gardées) ; total inchangé ; un seul ↶')+okB;
/* « ↻ Reventiler » : le calcul (par poste et par zone) */
function revPlan(a,M,CP){const Z=CP.zv;const d=zd(a,M,CP);const n=CP.zones.length;const out={posts:[],unpl:[],chg:false,mv:new Float64Array(n),zn:CP.zones.map(z=>z.nom),NL:X.CO?zLines(a,CP,d):null};const un=new Map(); /* (lot DY) mv : ce que chaque zone rend (−) ou reçoit (+), en € ; NL : les lignes au ml de chaque zone */
  Z.G.forEach(c=>{const o=d.P.get(c.k);if(!o)return;const S=Z.sh.map(s=>s*c.qty);const T=S.map((s,i)=>Math.max(0,s-o.fix[i]));const Zm=[];for(let i=0;i<n;i++)if(o.mov[i]>1e-9)Zm.push(i);
    const Zn=out.NL?out.NL.map((ls,i)=>i).filter(i=>!(o.mov[i]>1e-9)&&T[i]*c.puV>=TOL&&out.NL[i].length):[]; /* (lot DY) une zone dont aucune ligne ne porte encore l'installation : sa part sur ses lignes au ml */
    const Za=Zm.concat(Zn);const TS=Za.reduce((s,i)=>s+T[i],0);const P=Zm.reduce((s,i)=>s+o.mov[i],0);const rho=TS>1e-12?Math.min(1,P/TS):0;const tg=X.CO?X.CO.revTg(Za,T,o.mov,P,TS,n):null; /* (lot DY) ce qui reste à placer reste dans les zones qui en manquent */
    const fac=new Float64Array(n);Zm.forEach(i=>{const g=tg?tg[i]:T[i]*rho;fac[i]=g/o.mov[i];if(Math.abs(g-o.mov[i])*c.puV>=0.005)out.chg=true;});Zn.forEach(i=>{if(tg[i]*c.puV>=0.005)out.chg=true;});Za.forEach(i=>{out.mv[i]+=((tg?tg[i]:T[i]*rho)-o.mov[i])*c.puV;});
    for(let i=0;i<n;i++)if(!(o.mov[i]>1e-9)&&!Zn.includes(i)&&T[i]*c.puV>=TOL){const u=un.get(i)||{i,nom:CP.zones[i].nom,e:0};u.e+=T[i]*c.puV;un.set(i,u);}
    out.posts.push({c,o,fac,Zm,Zn,tg});});
  out.unpl=[...un.values()];return out;}
/* run() du lot C3 : act 'revent' — les liens réécrits dans R.W (un seul dxWrite derrière) */
export function runAct(a,CP,M,it,act,arg,R){if(act!=='revent')return false;if(!on(CP)){R.msg.push('pas d\'installations ventilées par zone');return true;}const Z=CP.zv;const d=zd(a,M,CP);const rv=revPlan(a,M,CP);let n=0;
  rv.posts.forEach(p=>{p.o.by.forEach((arr,id)=>{const l=d.LI.get(id);if(!l||!l.isMl||!(l.q>0))return; /* au forfait : ne bouge pas */const L=R.ed(id);if(!L)return;
    L.comps=L.comps.flatMap(x=>{if(x.sub||X.SV.kOf(CP,x)!==p.c.k||!((+x.q||0)>0))return [x];const w=wPiece(Z,CP,L,x,l,null);const out=[];w.forEach((wi,i)=>{if(!(wi>0))return;const q=r6((+x.q||0)*wi*p.fac[i]);if(q>1e-9)out.push(Object.assign({},x,{q,zs:Z.tok[i]}));});n++;return out;});});});
  rv.posts.forEach(p=>(p.Zn||[]).forEach(i=>{const ls=(rv.NL||[])[i]||[];const W=ls.reduce((s,x)=>s+x.w,0);const g=p.tg?p.tg[i]:0;if(!(W>0)||!(g>1e-9))return;ls.forEach(x=>{const q=r6(g*x.w/W);const L=q>1e-9?R.ed(x.id):null;if(!L)return;L.comps.push({k:p.c.k,q,zs:Z.tok[i]});n++;});})); /* (lot DY) une zone sans ligne qui porte : sa part sur ses lignes au ml, au prorata de leurs ml */
  if(!n)R.msg.push('aucune ligne au ml ne porte les installations');return true;}
/* (lot DY) les lignes au ml de chaque zone (leurs ml × la part de la zone dans la ligne) */
function zLines(a,CP,d){const NL=CP.zones.map(()=>[]);((a.dpgf||{}).liens||[]).forEach(L=>{const l=d.LI.get(L.id);if(!l||!l.isMl||!(l.q>0))return;const w=zwOf(CP,L,l.des);if(!w)return;w.forEach((x,i)=>{if(x>0.001)NL[i].push({id:L.id,w:l.q*x,lab:l.n||L.a});});});return NL;}
/* (lot DY) le texte de « ↻ Reventiler » : qui rend quoi à qui ; le total ne change pas */
const zArt=nom=>/^zone\b/i.test(nom)?'la '+esc(nom):'« '+esc(nom)+' »';const zArtA=nom=>/^zone\b/i.test(nom)?'à la '+esc(nom):'à « '+esc(nom)+' »';
function mvTxt(rv){if(!rv||!rv.mv)return '';const g=[],r=[];rv.mv.forEach((e,i)=>{if(e<=-0.5)g.push({i,e:-e});else if(e>=0.5)r.push({i,e});});if(!g.length&&!r.length)return '';const nm=i=>rv.zn[i]||'zone';
  const net=rv.mv.reduce((s,x)=>s+x,0);const head=Math.abs(net)<1?' <b>Le total du DPGF ne change pas</b> : ':' <b>Le total des installations '+(net<0?'baisse':'monte')+' de '+eur(Math.abs(net))+'</b> : ';
  const t=g.length===1&&r.length===1?`${zArt(nm(g[0].i))} rend ${eur(g[0].e)} ${zArtA(nm(r[0].i))}`:g.map(x=>`${zArt(nm(x.i))} rend ${eur(x.e)}`).concat(r.map(x=>`${zArt(nm(x.i))} reçoit ${eur(x.e)}`)).join(', ');
  const zn=[...new Set(rv.posts.flatMap(p=>p.Zn||[]))];const nw=zn.length?' ; '+zn.map(i=>`${zArt(nm(i))} reçoit sa part sur ses lignes au ml (${esc(((rv.NL||[])[i]||[]).map(x=>x.lab).slice(0,5).join(', '))})`).join(' ; '):'';return head+t+nw+'.';}
/* onWrite (à chaque écriture du DPGF) : la référence de la ventilation (suivi.vz) et « ✓ Rien à faire » (suivi.ok['vzgap:inst']) */
export function onWrite(a,a2,CP,M2,S,S0,ok,sv){if(!on(CP)||!M2)return;try{sv=sv||{};let M1=null;try{M1=X.modelOf(a);}catch(e){M1=null;}
    const pend=S.vz&&M1&&hasInst(a,M1,CP)&&vzDiff(CP,S.vz); /* référence en attente seulement si des installations étaient déjà pointées AVANT cette écriture */if(!S.vz||!pend||sv['vz:inst'])S.vz=vzNow(CP);
    const st=stOf(a2,M2,CP);const sig=isOver(st)?gapSig(st):null;const o0=((S0&&S0.ok)||{})['vzgap:inst'];
    if(sig&&(sv['vzgap:inst']==='ok'||sv['vz:inst']==='ok'))ok['vzgap:inst']=sig;else if(sig&&o0===sig&&!sv['vzgap:inst'])ok['vzgap:inst']=o0;else delete ok['vzgap:inst'];
    if(sv['vzgap:inst']||sv['vz:inst'])ZS.force[a2.num]=false;}catch(e){console.warn(e);}}
/* 1re ouverture d'un DPGF existant (modifiable, pas en consultation) : la référence = la ventilation du jour (pas de fausse alerte) */
export function ensure(a,M,canEdit){if(!canEdit||a._vview||ZS.busy[a.num]||!M)return;const D=a.dpgf||{};if(!D.suivi||D.suivi.vz)return;if(((a.chiffrage||{}).etudes||[]).some(z=>z&&!z.id))return;const CP=X.compsOf(a);if(!on(CP)||!hasInst(a,M,CP))return;
  ZS.busy[a.num]=1;setTimeout(()=>{ZS.busy[a.num]=0;const a2=X.affOf(a.num);if(!a2||a2._vview||!X.XS.canEdit)return;const D2=a2.dpgf||{};if(!D2.suivi||D2.suivi.vz)return;const CP2=X.compsOf(a2);if(!on(CP2))return;
    X.H().affSet(a.num,{dpgf:Object.assign({},D2,{suivi:Object.assign({},D2.suivi,{vz:vzNow(CP2)})})});X.rerender();},0);}
export function closed(num){ZS.force[num]=false;}
/* ═════════ 6 · « ⇶ METTRE LE RESTE AU ML » (dpgfrep.js planOf) : le reste de chaque zone sur les lignes au ml de CETTE zone ═════════ */
export function repSpread(a,M,CP,cfg,T,tgt,put,un,hasPart){const c=T.c;if(!on(CP)||!c||c.v||c.z>=0)return false;const Z=CP.zv;const n=CP.zones.length;const d=zd(a,M,CP,cfg.id||'');const o=d&&d.P.get(c.k);
  const rem=Z.sh.map((s,i)=>Math.max(0,s*c.qty-(o?o.z[i]:0)));const RS=rem.reduce((s,x)=>s+x,0);const qs=RS>1e-9?rem.map(x=>T.q*x/RS):Z.sh.map(s=>T.q*s);
  const ls=tgt.filter(l=>!hasPart(l,c.k));const wl=ls.map(l=>zwOf(CP,l.L,l.des));T.dest='zone';T.zr=[];
  qs.forEach((q,i)=>{if(!(q>1e-9))return;const tok=Z.tok[i];const w=ls.map((l,j)=>wl[j]?l.q*wl[j][i]:0);const W=w.reduce((s,x)=>s+x,0);
    if(W>0){const sp=X.SV.splitQ(q,w.map(x=>x/W));ls.forEach((l,j)=>{if(sp[j]>0)put(l,c.k,sp[j],'com',tok);});T.zr.push({i,q,n:w.filter(x=>x>0).length});return;}
    if(cfg.orphan||cfg.mode==='grp'){const W2=ls.reduce((s,l)=>s+l.q,0);if(W2>0){const sp=X.SV.splitQ(q,ls.map(l=>l.q/W2));ls.forEach((l,j)=>{if(sp[j]>0)put(l,c.k,sp[j],'com',tok);});T.zr.push({i,q,n:ls.length,orph:1});return;}}
    un.push({c,q,why:'zone',zi:i});T.zr.push({i,q,un:1});});return true;}
export const repTxt=CP=>`le reste (épreuves, base vie…) <b>au prorata des ml de toutes les lignes</b> ; <b>installations : chaque zone sur ses lignes, comme ventilé au chiffrage</b> (${esc(MODE_S[CP.zv.mode]||CP.zv.mode)})`;
function unZOf(plan,CP){const m=new Map();(plan.takes||[]).forEach(T=>(T.zr||[]).forEach(x=>{if(!x.un)return;const o=m.get(x.i)||{i:x.i,nom:(CP.zones[x.i]||{}).nom||'zone',e:0};o.e+=x.q*T.c.puV;m.set(x.i,o);}));return [...m.values()];}
export const unZAmt=(plan,CP)=>CP&&on(CP)?unZOf(plan,CP).reduce((s,x)=>s+x.e,0):0;
export const unZHTML=(plan,CP)=>CP&&on(CP)?unZOf(plan,CP).map(u=>`<span>installations de ${esc(u.nom)} : aucune ligne au ml de cette zone — ${eur(u.e)}</span>`).join(''):'';
export const destTxt=T=>'→ chaque zone sur ses lignes, comme ventilé au chiffrage'+((T.zr||[]).some(x=>x.un)?' <span class="rp-w">⚠ une zone sans ligne au ml</span>':'');
/* ═════════ 7 · LE RÉCAP (dpgfrecap.js) ═════════ */
/* par poste : la ventilation par zone (part, porté, lignes) */
export function rcPoste(a,M,CP,c){if(!on(CP)||!c||c.z>=0||c.v)return '';const st=stOf(a,M,CP).find(p=>p.c.k===c.k);if(!st)return '';const d=zd(a,M,CP);const byId=new Map(((a.dpgf||{}).liens||[]).map(L=>[L.id,L]));
  const row=x=>{const ls=st.o?[...st.o.by].filter(([id,arr])=>arr[x.i]>1e-9).map(([id])=>byId.get(id)).filter(Boolean).map(L=>labOfL(d.LI,L)):[];
    return `<div class="dk-cr dz-rcr"><span class="dk-cn"><span class="dk-zt">${esc(x.v.zn)}</span> part ${eur(x.S)} (${pc(x.v.sh)})</span> <span class="dk-cq">porté ${eur(x.P)}</span> <span class="dk-ce${Math.abs(x.gap)>=GAP?' c3-bad':''}">${Math.abs(x.gap)<GAP?'✓':(x.gap>0?'+':'−')+eur(Math.abs(x.gap))}</span> <span class="dk-or">${ls.length?'lignes '+esc(lst(ls)):'aucune ligne'}</span></div>`;};
  return `<div class="dz-rc"><div class="dk-sub">Ventilation par zone · ${esc(MODE[CP.zv.mode]||'')}</div>${st.z.map(row).join('')}</div>`;}
/* par ligne : la zone de la part d'installations */
export function rcZTag(CP,L,c,des){if(!on(CP)||!L)return '';const Z=CP.zv;const zs=new Set();let free=false;(L.comps||[]).forEach(x=>{const cc=CP.by.get(x.k);if(!cc||cc.k!==c.k||!((+x.q||0)>0))return;const i=x.zs?Z.ti.get(x.zs):undefined;if(i!==undefined)zs.add(i);else free=true;});
  if(free){const w=zwOf(CP,L,des||'');if(w)w.forEach((x,i)=>{if(x>0.001)zs.add(i);});}const names=[...zs].sort((x,y)=>x-y).map(i=>CP.zones[i].nom);
  return `<span class="dk-zt" title="${esc(free?'part pointée avant ce lot, sans zone : comptée dans la zone de la ligne':'part de la zone')}">🏗 ${esc(names.join(' · ')||'Installations')}${free?' (sans zone)':''}</span>`;}
/* à vérifier : les zones sur- ou sous-pointées en installations */
export function nChk(a,M,CP){return on(CP)&&M&&hasInst(a,M,CP)&&isOver(stOf(a,M,CP))?1:0;}
export function rcChk(a,M,CP,pr,ro,sec){if(!nChk(a,M,CP))return '';const st=stOf(a,M,CP);const ok=(((a.dpgf||{}).suivi||{}).ok||{})['vzgap:inst']===gapSig(st);
  const R=st.flatMap(p=>p.z.filter(x=>Math.abs(x.gap)>=GAP).map(x=>({p,x})));const rows=R.map(({p,x})=>`<div class="dk-cr"><span class="dk-cn"><span class="dk-zt">${esc(x.v.zn)}</span> ${esc(p.c.pl)}</span> <span class="dk-cq">porté ${eur(x.P)} pour ${eur(x.S)} ventilés</span> <span class="dk-ce c3-bad">${x.gap>0?'pointé au-delà de '+eur(x.gap):'il manque '+eur(-x.gap)}</span></div>`).join('');
  return sec('Installations : zones sur- ou sous-pointées',rows+`<div class="hint dk-hint">Ventilées ${esc(MODE[CP.zv.mode]||'')} au chiffrage, mais pas portées comme ça par le DPGF${ok?' (marqué « rien à faire »)':''}.</div>`+(ro||pr?'':`<button class="btn sm primary" data-act="af" data-v="dxdzrev|">↻ Reventiler les installations par zone</button>`),R.length);}
/* ═════════ 8 · ACTIONS (data-v="dxdz…|…", depuis dpgfXlAct) ═════════ */
function cur(){const num=X&&X.XS.num;const a=num&&X.affOf(num);const M=a&&X.modelOf(a);const CP=a&&X.compsOf(a);const T=M&&X.calcTarget(a,M);return a&&M&&CP&&T?{a,M,CP,T,C:X.calcState(a,T,M)}:null;}
export function act(k,arg,arg2,a,canEdit,M){const num=a.num;
  switch(k){
    case 'dxdzrev':{if(!canEdit||a._vview||!M)return true;ZS.force[num]=true;return X.SV.act('dxc3list','','',a,canEdit,M);}
    case 'dxdzall':{if(!canEdit||a._vview||!M)return true;const o=cur();if(!o||!on(o.CP))return true;const {CP,T,C}=o;const lk=X.linkAt(a,T.sh,T.a);let n=0,e=0;
      CP.zv.G.forEach(c=>CP.zv.vcs.get(c.k).forEach(v=>{if(C.chk[v.k]!==undefined)return;const f=freeOf(a,M,CP,C,T,v,lk);if(f*v.puV<TOL)return;C.chk[v.k]=X.fmtIn(r3(f));n++;e+=f*v.puV;}));
      X.say(n?'🏗 '+n+' part'+(n>1?'s':'')+' d\'installations cochée'+(n>1?'s':'')+' (le reste de chaque zone) : '+eur(e)+' — « ↦ Mettre » pour l\'écrire':'Plus rien à prendre : chaque zone est tout pointée');X.refreshSide(a);return true;}
    case 'dxdzselp':{if(!canEdit||a._vview||!M)return true;const o=cur();if(!o)return true;const {CP,T,C}=o;const S=((a.dpgf||{}).sels||[]).find(x=>x.id===arg);if(!S)return true;
      const ks=mapKeys(a,M,CP,T,C,X.SV.ckeys(CP,S.ks||[]),null).map(k=>String(k).split('#')[0]);let n=0;C.pp=C.pp||{};
      ks.forEach(k=>{if(C.chk[k]!==undefined||C.pp[k]!==undefined)return;if(X.CO&&X.CO.prOn(a,M,CP,C,T,CP.by.get(k))){C.chk[k]=X.fmtIn(X.CO.prDef(T,C));n++;return;} /* (lot DY) part d'une zone, ligne au ml : au prorata de ses ml */const P=partPlan(a,M,CP,C,T,k);if(!canPart(P))return;C.pp[k]=fin(P.def);n++;});
      X.say('« '+S.nom+' » : '+(n?n+' part'+(n>1?'s':'')+' cochée'+(n>1?'s':'')+' (⇶ sa part, reprise au « Mettre » sur les lignes qui les portent)':'aucune part à prendre'));X.refreshSide(a);return true;}}
  return false;}
/* ═════════ 9 · SAISIES (cases de zone, parts), Qté tapée ═════════ */
let WIRED=false;
function liveRes(o){const {a,CP,T,C}=o;const q=X.parseQ(C.q,{qty:0});const amt=X.calcSum(a,CP,C);const res=document.getElementById('dx-cres');if(res)res.innerHTML=X.calcResHTML(a,T,C,amt,q,q>0?amt/q:0,X.linkAt(a,T.sh,T.a),!X.XS.canEdit);}
function wire(){if(WIRED||!docOK())return;WIRED=true;
  document.addEventListener('change',e=>{const t=e.target;if(!t||!t.dataset||!t.dataset.dz||!t.closest||!t.closest('#dx-calc'))return;const o=cur();if(!o)return;const {a,M,CP,T,C}=o;const k=t.dataset.k;const d=t.dataset.dz;
    if(d==='ck'){const v=CP.by.get(k);if(!v||!v.v)return;if(t.checked){if(C.chk[k]===undefined){const f=freeOf(a,M,CP,C,T,v,X.linkAt(a,T.sh,T.a));C.chk[k]=X.fmtIn(X.CO&&X.CO.prOn(a,M,CP,C,T,v)?X.CO.prDef(T,C):X.REP.defTake(v,T,X.parseQ(C.q,{qty:0}),Math.max(0,f)));}} /* (lot DY) ligne au ml : ses ml (le manque est repris) */else{delete C.chk[k];if(C.zx)delete C.zx[k];}X.refreshSide(a);return;}
    if(d==='pp'){C.pp=C.pp||{};if(t.checked){const P=partPlan(a,M,CP,C,T,k);C.pp[k]=fin(P?P.def:0);}else delete C.pp[k];X.refreshSide(a);return;}
    if(d==='pq'){X.refreshSide(a);return;}});
  document.addEventListener('input',e=>{const t=e.target;if(!t||!t.dataset||!t.closest||!t.closest('#dx-calc'))return;
    if(t.dataset.dx==='q'){const o=cur();if(!o)return;o.C.qt=1;const h=document.querySelector('#dx-calc .dz-qh');if(h)h.hidden=(X.parseQ(t.value,{qty:0})>0);return;} /* Z4 : la quantité tapée ici ne suit plus la grille */
    if(t.dataset.dz!=='pq')return;const o=cur();if(!o)return;const {CP,C}=o;const k=t.dataset.k;C.pp=C.pp||{};C.pp[k]=t.value;const c=CP.by.get(k);const b=t.parentElement&&t.parentElement.querySelector('b[data-dzpa]');const v=numIn(t.value);if(b&&c)b.textContent=eur((v||0)*c.puV,2);liveRes(o);});}
export function css(doc){doc=doc||(docOK()?document:null);if(!doc)return;wire();if(doc.getElementById('css-lot-dz'))return;const s=doc.createElement('style');s.id='css-lot-dz';s.textContent=CSS_DZ;doc.head.appendChild(s);}
/* ═════════ 10 · CSS (injectée : <style id="css-lot-dz">) ═════════ */
const CSS_DZ=`
#dx-card .dz-head{display:flex;flex-direction:column;gap:5px;padding:6px 8px 8px;background:#f8fbff;border-bottom:1px solid #e5edf6}
#dx-card .dz-ht{font-size:12.5px;line-height:1.4;color:#1f2937}
#dx-card .dz-chips{display:flex;flex-wrap:wrap;gap:4px}
#dx-card .dz-chip{border:1px solid #c7d7ea;background:#fff;border-radius:999px;padding:0 10px;min-height:34px;font-size:12.5px;cursor:pointer;color:#1f3864;display:inline-flex;align-items:center;gap:5px;max-width:100%;text-align:left}
#dx-card .dz-chip small{color:#4b5563;font-size:11.5px}#dx-card .dz-chip.ok{border-color:#86b89a;background:#f1f8f4}#dx-card .dz-chip.over{border-color:#f3c27a;background:#fff7e6}#dx-card .dz-chip:hover{background:#eef4fb}
#dx-card .dz-gap{display:flex;flex-wrap:wrap;gap:6px 10px;align-items:center;background:#fff7e6;border:1px solid #f3c27a;border-left:5px solid #d97706;border-radius:8px;padding:6px 8px;font-size:12.5px;line-height:1.4;color:#5c3d00}#dx-card .dz-gap>span{flex:1 1 260px;min-width:0}
.eq-app #dx-card .dz-gap .btn.primary{min-height:40px;font-weight:700}.eq-app #dx-card .dz-all{min-height:40px;font-weight:700;align-self:flex-start;white-space:normal;text-align:left}.eq-app #dx-card .dz-selp{min-height:34px}
#dx-card .dz-note{margin:0}
#dx-card .dz-zb{border:1px solid #d6e3f1;border-left:4px solid #1f6fd0;border-radius:8px;margin:4px 0 6px;background:#fbfdff;overflow:hidden}#dx-card .c3-ci:has(>.dz-zb),#dx-card .c3-ci:has(>.dz-head){grid-column:1/-1;border-top:0}
#dx-card .dz-zh{font-weight:700;font-size:12.5px;padding:5px 8px;background:#eef4fb;color:#1f3864}#dx-card .dz-zh .hint{margin:0;font-weight:400}
#dx-card .dz-zb .dx-cr:first-of-type{border-top:0}#dx-card .dz-orz{margin-top:4px;font-size:12.5px}
#dx-card .dz-pp{display:flex;flex-wrap:wrap;gap:2px 10px;align-items:center;margin:0 8px 4px 38px;padding:3px 8px;border:1px dashed #0f766e;border-radius:8px;background:#f0fbf8;font-size:12.5px}
#dx-card .dz-pp.on{border-style:solid;background:#e3f6f0}#dx-card .dz-pp.bad{border-color:#dc2626;background:#fef2f2}
#dx-card .dz-ppl{display:flex;align-items:center;gap:8px;flex:1 1 240px;min-width:0;min-height:36px;cursor:pointer;color:#134e4a}#dx-card .dz-ppl small{color:#4b5563;font-size:11.5px}
.eq-app #dx-card .dz-ppl input[type=checkbox]{width:20px;height:20px;min-height:0;margin:0;flex:none}
#dx-card .dz-ppq{display:inline-flex;flex-wrap:wrap;gap:4px;align-items:center}.eq-app #dx-card .dz-ppq input{width:84px;min-height:34px;padding:2px 6px}#dx-card .dz-ppm{color:#b91c1c;font-weight:700}
#dx-card .dz-old{background:#fffdf3}#dx-card .dz-qh{font-size:11.5px;color:#b45309;font-weight:700;flex:1 1 100%;text-align:right}
#dx-card .dz-why{flex:1 1 100%;font-size:11.5px;color:#9a3412;text-align:right}
#dx-card .dz-rc{margin:4px 0 2px}#dx-card .dz-rcr .dk-or{color:#374151}
@media (max-width:700px){#dx-card .dz-pp{margin-left:8px}#dx-card .dz-chip{min-height:36px}#dx-card .dz-qh,#dx-card .dz-why{text-align:left}}
`;
