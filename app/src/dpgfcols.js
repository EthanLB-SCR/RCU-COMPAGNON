// dpgfcols.js — LOT DY (19/10) : lire n'importe quel DPGF client (colonnes, unité, quantité, n°) ; des ml en plus au chiffrage = à placer ; les installations
// toujours prenables au prorata des ml ; « ↻ Reventiler » qui marche. Ethan (19/10, sur SON DPGF) : « Reventiler par zone ne fonctionne pas […] si je valide, j'aurai
// 48 ml de chaque poste de pas pointés […] si je pointe mes nouvelles soudures, ça me met que toute l'installation est pointée et que je ne peux plus en pointer, ce
// qui doit être possible : aller pointer de l'installation au prorata des ml que je veux avoir ».
// · LA CAUSE : l'en-tête du DPGF était deviné à l'import (commerce.js dpgfFromRows) — une ligne de titre « Détail des prix » prise pour l'en-tête, « U.M. », un en-tête
//   sur 2 lignes, un PU loin à droite : aucune ligne reconnue (libellés « O16 », « Qté » vide, pas d'unité) → Reventiler, « ⇶ sa part », les ml proposés, « Mettre le
//   reste au ml » ne trouvaient aucune ligne au ml.
// · Y1 UNE SEULE SOURCE pour la ligne d'un lien ou d'une cellule : lineOf(a, M, {sh, a}) → {row, n, des, u, q, qte, isMl, pu, known:{u, q, n, des}} : D.lignes par
//   rangée ; sinon (ou unité / quantité manquantes) la rangée de la grille lue avec les colonnes déduites ; puis le lien (L.u, L.q, cellule L.qa) ; enfin l'unité choisie
//   (D.uOf). lines(a, M) : les lignes de prix de la feuille du DPGF ; puCol / qtyCol ; target() pour le calculateur (dpgfxl.js calcTarget) ; labFn (étiquettes).
// · Y2 COLONNES DÉDUITES : l'en-tête est cherché sans les lignes de titre (une seule cellule), au moins 3 mots d'en-tête, sur 1 ou 2 lignes (« Prix » sur « unitaire
//   HT », « Quantité » sur « Marché »), « U.M. », « Unité de mesure », « P.U. HT », « Montant »… ; les données le contrôlent : PU = la colonne de la majorité des liens,
//   unité = la colonne la plus riche en unités, quantité = celle qui fait quantité × PU = total (sinon la colonne de nombres à gauche du PU), désignation = les textes
//   longs, n° = la 1re colonne de numéros (« 2.1 », « 3.2.1 », « A », « I.2 »). Un DPGF lu juste (D.cols) reste lu pareil ; un D.cols NETTEMENT moins bon que la
//   lecture déduite est remplacé à la lecture seulement (rien ne s'écrit tant qu'on ne clique rien). Écran « 📐 Colonnes du DPGF » (menu ⋯, bandeau) : ce qui est
//   compris, 3 lignes d'exemple, un menu par champ, « Appliquer » (D.cols, D.hdrRow, D.lignes : un seul ↶ ; ni les liens ni les PU). À l'import (commerce.js), la
//   lecture déduite remplace celle de dpgfFromRows quand elle est nettement meilleure (un DPGF lu juste aujourd'hui est lu pareil).
// · Y3 L'UNITÉ EN UN CLIC (calculateur, ligne sans unité lue) : D.uOf = {adresse: 'ml'} (optionnel), relu par deriveLines et suivi par les lignes insérées.
// · Y4 DES ML EN PLUS AU CHIFFRAGE : élément « au ml / forfait » (lot C3) d'un poste au ml dont la quantité AUGMENTE, quantités des lignes du DPGF qui le portent
//   inchangées → « Laisser à placer pour les nouvelles lignes » d'office (action keep) ; un seul bouton pour plusieurs installations ; « Tout traiter » le fait et le
//   dit ; quand les ml baissent, la balance reste le choix.
// · Y5 LA PART D'INSTALLATION AU PRORATA DES ML (calculateur, part d'une zone, ligne au ml) : la case « prendre au prorata de mes ml » = € / ml de la zone × ml ;
//   payée par le reste de la zone, puis le reste global, puis reprise sur les lignes au ml de la zone au prorata de ce qu'elles portent (à défaut sur celles des
//   zones qui en portent trop) — écrite au « Mettre » avec la ligne (give du lot DK, dpgfzone.js putParts) : un seul ↶. Plus d'impasse « tout pointé ».
// · Y6 « ↻ REVENTILER » (dpgfzone.js revPlan) : il trouve les lignes (Y1) ; ses textes viennent de dpgfzone.js.
// Tout ce que dpgfxl.js prête passe par init() (aucun import circulaire). CSS injectée : <style id="css-lot-dy">.
import {addrOf,parseAddr,colName,isErr} from './xlcalc.js';
let X=null;export function init(api){X=api;}
const esc=s=>String(s??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const nb=(x,d)=>{x=+x||0;return x.toLocaleString('fr-FR',{maximumFractionDigits:d===undefined?0:d,minimumFractionDigits:d===undefined?0:d});};
const eur=(x,d)=>nb(x,d)+' €';const r3=x=>Math.round((+x||0)*1000)/1000;const r6=x=>Math.round((+x||0)*1e6)/1e6;const up=s=>String(s||'').toUpperCase();
const fq=x=>nb(x,Math.abs(x-Math.round(x))>1e-9?(Math.abs(x*100-Math.round(x*100))>1e-6?3:2):0);const fin=x=>String(+(+x).toFixed(3)).replace('.',',');
const docOK=()=>typeof document!=='undefined';
const nrm=s=>String(s??'').replace(/²/g,'2').replace(/³/g,'3').normalize('NFD').replace(/[̀-ͯ]/g,'').toLowerCase().replace(/[\s  ]+/g,' ').trim();
/* une valeur de cellule → nombre, comme deriveLines (dpgfxl.js) ; numS : seulement un nombre écrit seul (statistiques des colonnes) */
const numL=v=>{if(typeof v==='number')return isFinite(v)?v:null;if(v===null||v===undefined||isErr(v)||typeof v==='boolean')return null;const x=parseFloat(String(v).replace(/[\s  ]/g,'').replace(',','.'));return isFinite(x)?x:null;};
const numS=v=>{if(typeof v==='number')return isFinite(v)?v:null;if(typeof v!=='string')return null;const s=v.replace(/[\s  ]/g,'').replace(',','.');return /^[-+]?(\d+\.?\d*|\.\d+)(e[-+]?\d+)?$/i.test(s)?parseFloat(s):null;};
const strOf=v=>v===null||v===undefined||isErr(v)?'':String(v);
/* ═════════ 1 · LES UNITÉS ═════════ */
const UK=[['ml',/^(ml|m|mlin|mli|mlineaires?|metres?|metres?lineaires?|lineaires?)$/],['m2',/^(m2|metres?carres?)$/],['m3',/^(m3|metres?cubes?)$/],['u',/^(u|un|unite|unites|unit|nb|nbre|nombre)$/],
  ['pce',/^(pc|pce|pces|piece|pieces)$/],['ens',/^(ens|ensemble|ensembles)$/],['ft',/^(f|ft|fft|ff|forf|forfait|forfaits|forfaitaire)$/],['kg',/^(kg|kgs|kilos?|kilogrammes?)$/],['t',/^(t|to|tonnes?)$/],
  ['h',/^(h|hr|hrs|heures?)$/],['j',/^(j|jr|jrs|jours?)$/],['%',/^%$/],['paire',/^(paires?|pr|prs)$/]];
/* l'unité d'une cellule : 'ml', 'u', 'ens', 'ft', 'm2', 'm3', 'kg', 't', 'h', 'j', '%', 'paire', 'pce' — '' si ce n'est pas une unité */
export function unitKey(s){if(typeof s!=='string')return '';const z=nrm(s).replace(/[\s.()_/-]/g,'');if(!z||z.length>18)return '';for(const [k,re] of UK)if(re.test(z))return k;return '';}
const isMlTxt=u=>unitKey(u)==='ml'||(X&&X.REP&&X.REP.isMlU(u));
/* ═════════ 2 · LIRE UNE FEUILLE : l'en-tête, les colonnes, les lignes ═════════ */
/* le champ d'une cellule d'en-tête (texte normalisé ; « prix » seul ne dit rien : les données décident) */
function fieldOf(t){if(!t)return null;const s=t.replace(/[.:()]/g,' ').replace(/\s+/g,' ').trim();const z=t.replace(/[\s.:()]/g,'');
  if(/\b(montants?|total|totaux)\b/.test(s)||/^mt(ht)?$/.test(z))return 'tot';
  if(/\bprix unit|\bunitaires?\b|^p ?u\b/.test(s)||/^pu/.test(z))return 'pu';
  if(/\b(quantites?|qtes?|quant|qt)\b/.test(s)||/^q$/.test(z))return 'qte';
  if(/^(u|um|unites?|unit|unitedemesure|unitesdemesure|un)$/.test(z))return 'u';
  if(/\b(designations?|libelles?|description|intitules?|ouvrages?|prestations?)\b/.test(s)||/^nature des\b/.test(s))return 'des';
  if(/^(n°|no|n|num|numero|nr|art|article|poste|postes|ref|reference|code|item|repere|ordre|indice)$/.test(z)||/^(n ?°|no|num|numero) ?(de |d')?(prix|article|poste|ligne)?$/.test(s))return 'n';
  return null;}
const rowCells=(G,r)=>{const o=[];if(r<1||r>G.mr)return o;for(let c=1;c<=G.mc;c++){const v=G.get(r,c);if(v===null||v===undefined||v===''||isErr(v))continue;if(typeof v==='string'){const t=v.trim();if(t)o.push({c,t});}else if(typeof v==='number')o.push({c,t:String(v),num:true});}return o;};
const isTitle=cs=>cs.length===1&&!cs[0].num&&cs[0].t.length>=18; /* une seule cellule, un texte long : une ligne de titre */
const looksData=cs=>cs.some(x=>x.num||x.t.length>30||!!unitKey(x.t));
function hdrOf(G,r,two){const T=new Map(),raw=new Map();rowCells(G,r).forEach(x=>{if(!x.num){T.set(x.c,nrm(x.t));raw.set(x.c,x.t);}});
  if(two)rowCells(G,r+1).forEach(x=>{if(x.num)return;const t=nrm(x.t);T.set(x.c,T.has(x.c)?T.get(x.c)+' '+t:t);raw.set(x.c,raw.has(x.c)?raw.get(x.c)+' '+x.t:x.t);});
  const f={};const txt={};const free=[];[...T.keys()].sort((p,q)=>p-q).forEach(c=>{const k=fieldOf(T.get(c));if(k&&f[k]===undefined){f[k]=c;txt[k]=raw.get(c);}else if(!k)free.push(c);});
  /* « Prix » seul (une colonne non reconnue qui commence par « prix ») : le PU ; une 2e : le total s'il n'y en a pas */
  if(f.pu===undefined){const ps=free.filter(c=>/^prix\b/.test(T.get(c))&&c!==f.tot);if(ps.length){f.pu=ps[0];txt.pu=raw.get(ps[0]);if(f.tot===undefined&&ps.length>1){f.tot=ps[1];txt.tot=raw.get(ps[1]);}}} /* « Prix » « Prix » : le PU puis le total */
  return {f,txt,n:Object.keys(f).length,raw};}
/* la ligne d'en-tête : le plus de champs reconnus (au moins 3, dont la désignation, ou l'unité et la quantité), sur 1 ou 2 lignes (2 si la 2e complète l'en-tête) ;
   à égalité la plus haute */
function findHdr(G){let best=null;const R=Math.min(G.mr,120);
  for(let r=1;r<=R;r++){const cs=rowCells(G,r);if(!cs.length||isTitle(cs))continue;const h1=hdrOf(G,r,false);const nx=rowCells(G,r+1);const h2=r<G.mr&&nx.length&&!looksData(nx)&&!isTitle(nx)?hdrOf(G,r,true):null;
    [[h1,false],[h2,true]].forEach(([h,two])=>{if(!h||h.n<3||!(h.f.des!==undefined||(h.f.u!==undefined&&h.f.qte!==undefined)))return;
      const ext=two?Object.values(h.f).filter(c=>{const v=G.get(r+1,c);return typeof v==='string'&&!!v.trim();}).length:0; /* la 2e ligne complète au moins 2 colonnes d'en-tête (« Marché », « unitaire HT », « total HT ») */
      const sc=h.n*10+(two?(ext>=2?1:-1):0);if(!best||sc>best.sc)best={sc,top:r,row:two?r+1:r,two,f:h.f,txt:h.txt};});}
  return best;}
/* les colonnes, d'après les données (sous la ligne d'en-tête) */
const NUM_RE=/^([0-9]{1,3}(\.[0-9]{1,3}){0,4}\.?|[A-Z](\.[0-9]{1,3}){0,4}\.?|[IVX]{1,5}(\.[0-9]{1,3}){0,4}\.?)$/;
function statsOf(G,h0){const R0=h0+1,R1=Math.min(G.mr,h0+4000);const S=[];for(let c=0;c<=G.mc;c++)S.push({u:0,num:0,txt:0,long:0,nt:0,nn:0});
  for(let r=R0;r<=R1;r++)for(let c=1;c<=G.mc;c++){const v=G.get(r,c);if(v===null||v===undefined||v===''||isErr(v))continue;const o=S[c];
    if(typeof v==='number'){o.num++;if((Number.isInteger(v)&&v>0&&v<100)||/^\d{1,2}\.\d{1,2}$/.test(String(v)))o.nn++;continue;}if(typeof v!=='string')continue;const t=v.trim();if(!t)continue;
    if(unitKey(t)){o.u++;continue;}if(NUM_RE.test(t)){o.nt++;continue;}if(numS(t)!==null){o.num++;continue;}o.txt++;if(t.length>=15)o.long++;}
  return S;}
/* la lecture déduite d'une feuille : {hdrRow, hdrTop, cols (index 0 comme D.cols, −1 = absent), txt} ; null si rien ne ressemble à un bordereau */
export function detect(G,links){const H=findHdr(G);const f=H?H.f:{};const hr=H?H.row:0;const S=statsOf(G,hr);const C=G.mc;const ok=c=>c>0&&c<=C;
  /* PU : la colonne de la majorité des liens (là où l'on écrit déjà les prix), sinon l'en-tête */
  let pu=-1;if(links&&links.length){const m=new Map();links.forEach(p=>m.set(p.c,(m.get(p.c)||0)+1));let b=-1,bv=0;m.forEach((v,c)=>{if(v>bv||(v===bv&&c<b)){bv=v;b=c;}});if(bv>=links.length*0.5)pu=b;}
  if(pu<0&&ok(f.pu))pu=f.pu;
  /* unité : la colonne qui a le plus d'unités ; l'en-tête si elle en a au moins la moitié */
  let ub=-1,uv=0;for(let c=1;c<=C;c++){if(c===pu)continue;if(S[c].u>uv){uv=S[c].u;ub=c;}}
  const u=ok(f.u)&&f.u!==pu&&S[f.u].u>=Math.max(1,uv*0.5)?f.u:(uv>=2?ub:(ok(f.u)?f.u:-1));
  /* désignation : les textes longs */
  let db=-1,dv=0;for(let c=1;c<=C;c++){if(c===pu||c===u)continue;const sc=S[c].long*3+S[c].txt;if(sc>dv){dv=sc;db=c;}}
  const des=ok(f.des)&&f.des!==pu&&f.des!==u&&(S[f.des].long*3+S[f.des].txt)>=Math.max(1,dv*0.4)?f.des:db;if(des<0)return null;
  /* total : l'en-tête */
  let tot=ok(f.tot)&&f.tot!==pu&&f.tot!==des&&f.tot!==u?f.tot:-1;
  /* quantité : l'en-tête si la colonne a des nombres ; sinon celle qui fait quantité × PU = total ; sinon la colonne de nombres la plus proche à gauche du PU */
  const bad=c=>c===pu||c===tot||c===u||c===des;let qte=ok(f.qte)&&!bad(f.qte)&&S[f.qte].num>=1?f.qte:-1;
  if(qte<0&&pu>0&&tot>0){let b=-1,bv=0;for(let c=1;c<=C;c++){if(bad(c)||!S[c].num)continue;let n=0;for(let r=hr+1;r<=Math.min(G.mr,hr+4000);r++){const q=numS(G.get(r,c)),p=numS(G.get(r,pu)),t=numS(G.get(r,tot));if(q!==null&&p>0&&t>0&&Math.abs(q*p-t)<=Math.max(0.011,Math.abs(t)*0.001))n++;}if(n>bv){bv=n;b=c;}}if(bv>=2)qte=b;}
  if(qte<0&&pu>0){for(let c=pu-1;c>=1;c--){if(bad(c))continue;if(S[c].num>=2){qte=c;break;}}}
  if(qte<0&&u>0){for(let c=u+1;c<=C;c++){if(bad(c))continue;if(S[c].num>=2){qte=c;break;}}}
  /* n° : l'en-tête, sinon la 1re colonne de numéros à gauche de la désignation */
  let n=ok(f.n)&&f.n<des&&!bad(f.n)&&S[f.n].nt+S[f.n].nn>=1?f.n:-1;if(n<0)for(let c=1;c<des;c++){if(bad(c)||c===qte)continue;if(S[c].nt+S[c].nn>=2&&S[c].nt+S[c].nn>=S[c].txt){n=c;break;}}
  const z=c=>c>0?c-1:-1;return {hdrRow:hr||0,hdrTop:H?H.top:0,two:!!(H&&H.two),cols:{n:z(n),des:z(des),u:z(u),qte:z(qte),pu:z(pu),tot:z(tot)},txt:H?H.txt:{}};}
/* une rangée sans ligne de prix déduite : le lien touché, ou la cellule « Calculer cette cellule » (jamais une ligne de D.lignes mal lue) */
function noLine(a,S,s){const ck=X.linkAt(a,S.name,addrOf(s.r,s.c));if(ck)return {sh:S.name,r:s.r,a:ck.a,qa:ck.qa||null,line:null,u:ck.u||''};const F=X.XS.free;
  if(F&&F.num===a.num&&up(F.sh)===up(S.name)&&F.a===addrOf(s.r,s.c))return {sh:S.name,r:s.r,a:F.a,qa:null,line:null,u:''};return null;}
/* les lignes d'une lecture : comme deriveLines (dpgfxl.js), plus l'unité choisie (uo : rangée → unité) */
const puColOfC=C=>C.pu>=0?C.pu+1:Math.max(C.qte??-1,C.des??-1,C.u??-1)+2;
function linesFrom(G,C,hr,uo){const L=[];if(!C)return L;const pc=puColOfC(C);const g=(r,c)=>c>0&&c<=Math.max(G.mc,c)?G.get(r,c):null;
  for(let r=(hr||0)+1;r<=G.mr;r++){const des=strOf(g(r,(C.des??-1)+1)).trim();if(!des)continue;const n=C.n>=0?strOf(g(r,C.n+1)).trim():'';let u=C.u>=0?strOf(g(r,C.u+1)).trim():'';if(!u&&uo)u=uo.get(r)||'';
    const q=C.qte>=0?numL(g(r,C.qte+1)):null;const pu=numL(g(r,pc));if(/^total/i.test(des))continue;if(!u&&q===null){L.push({n,des,section:true,row:r});continue;}L.push({n,des,u,qte:q||0,pu:pu||0,row:r,_q:q!==null});}
  return L;}
/* qualité d'une lecture : lignes de prix complètes (une unité reconnue et une quantité), et parmi les rangées liées */
function quality(L,links){let n=0,full=0,lf=0;const rows=new Set((links||[]).map(p=>p.r));L.forEach(l=>{if(l.section)return;n++;const ok=!!unitKey(l.u)&&(l._q===undefined?l.qte>0:l._q);if(ok){full++;if(rows.has(l.row))lf++;}});return {n,full,lf,nl:rows.size};}
/* la lecture enregistrée (D.cols) est-elle NETTEMENT moins bonne que la lecture déduite ? */
function worse(QD,QT,pcD,det,links){if(QT.full<1)return false;if(QD.full===0)return true;if(QT.full>=QD.full+Math.max(2,Math.ceil(QT.full*0.2)))return true;
  if(QD.nl&&QD.lf<QD.nl*0.5&&QT.lf>=QD.lf+Math.max(1,Math.ceil(QD.nl*0.25)))return true;
  if(links.length>=2&&det.cols.pu>=0&&det.cols.pu+1!==pcD){const inD=links.filter(p=>p.c===pcD).length,inT=links.filter(p=>p.c===det.cols.pu+1).length;if(inD<links.length*0.5&&inT>=links.length*0.6)return true;}
  return false;}
/* ═════════ 3 · LA LECTURE EFFECTIVE (par feuille, mise en cache par modèle) ═════════ */
const gridM=(M,S)=>({get:(r,c)=>X.val(M,S,r,c),mr:Math.max(1,S.maxR||1),mc:Math.max(1,Math.min(60,S.maxC||1))});
const linksOn=(D,S)=>(D.liens||[]).filter(L=>up(L.sh)===up(S.name)).map(L=>{const p=parseAddr(L.a||'');return p?{r:p.r,c:p.c,L}:null;}).filter(Boolean);
function uMap(D,S,isDp){const o=D&&D.uOf;if(!o)return null;const m=new Map();Object.keys(o).forEach(k=>{const i=k.lastIndexOf('!');const sh=i<0?null:k.slice(0,i);const p=parseAddr(i<0?k:k.slice(i+1));if(!p)return;if(sh?up(sh)===up(S.name):isDp)m.set(p.r,String(o[k]||''));});return m.size?m:null;}
/* deriveLines (dpgfxl.js) : l'unité choisie d'une rangée de la feuille du DPGF ('' sans choix) */
export function uSet(D,S,r){if(!D||!D.uOf||!S)return '';const m=uMap(D,S,true);return (m&&m.get(r))||'';}
/* les lignes insérées / supprimées décalent les unités choisies (dpgfxl.js shiftDpgf) */
export function shiftU(o,T,mv,isDp){const out={};Object.keys(o||{}).forEach(k=>{const i=k.lastIndexOf('!');const sh=i<0?null:k.slice(0,i);const ad=i<0?k:k.slice(i+1);const mine=sh?up(sh)===T:isDp;const na=mine?mv(ad):ad;if(na===null)return;out[(sh?sh+'!':'')+na]=o[k];});return Object.keys(out).length?out:undefined;}
const EC=new WeakMap();
function effOf(a,M,S){if(!M||!S||!X)return null;const D=a.dpgf||{};let m=EC.get(M);if(!m){m=new Map();EC.set(M,m);}const o=m.get(S.name);
  if(o&&o.c===D.cols&&o.h===D.hdrRow&&o.lg===D.lignes&&o.lk===D.liens&&o.u===D.uOf&&o.sn===D.sheetName&&o.sp===D.sheet)return o.E;
  const E=compute(a,M,S);m.set(S.name,{c:D.cols,h:D.hdrRow,lg:D.lignes,lk:D.liens,u:D.uOf,sn:D.sheetName,sp:D.sheet,E});return E;}
function compute(a,M,S){const D=a.dpgf||{};const isDp=S===X.dpSheet(M,D);const G=gridM(M,S);const links=linksOn(D,S);const uo=uMap(D,S,isDp);let det=null;try{det=detect(G,links);}catch(e){console.warn(e);}
  const LT=det?linesFrom(G,det.cols,det.hdrRow,uo):[];const QT=quality(LT,links);let E;
  if(isDp&&D.cols&&D.hdrRow){const LD=linesFrom(G,D.cols,D.hdrRow,uo);const QD=quality(LD,links);
    if(!det||!worse(QD,QT,X.puColOf(D),det,links))E={src:'D',cols:D.cols,hdrRow:D.hdrRow,hdrTop:det&&det.hdrRow===D.hdrRow?det.hdrTop:D.hdrRow,grid:LD,stored:true,det,QD,QT};
    else E={src:'auto',cols:det.cols,hdrRow:det.hdrRow,hdrTop:det.hdrTop,grid:LT,det,QD,QT,old:{cols:D.cols,hdrRow:D.hdrRow}};}
  else E=det?{src:isDp?'auto':'sheet',cols:det.cols,hdrRow:det.hdrRow,hdrTop:det.hdrTop,grid:LT,det,QT}:{src:'none',cols:null,grid:[]};
  E.S=S;E.isDp=isDp;E.G=G;E.links=links;E.pc=E.cols?puColOfC(E.cols):0;E.qc=E.cols&&E.cols.qte>=0?E.cols.qte+1:0;E.tc=E.cols&&E.cols.tot>=0?E.cols.tot+1:0;
  const gby=new Map(E.grid.filter(l=>!l.section).map(l=>[l.row,l]));E.gby=gby;
  /* les lignes effectives (non titres), rangée → ligne ; lu juste : D.lignes telles quelles, une unité / quantité manquante prise dans la grille */
  const by=new Map();if(E.stored){(D.lignes||[]).forEach(l=>{if(l.section||!l.row)return;const g=gby.get(l.row);let o=l;
      if(g&&((!String(l.u||'').trim()&&g.u)||(!(l.qte>0)&&g.qte>0)))o=Object.assign({},l,{u:String(l.u||'').trim()?l.u:g.u,qte:l.qte>0?l.qte:g.qte});by.set(l.row,o);});}
  else E.grid.forEach(l=>{if(!l.section)by.set(l.row,l);});
  E.by=by;E.rowLk=new Map();links.forEach(p=>{if(!E.rowLk.has(p.r))E.rowLk.set(p.r,[]);E.rowLk.get(p.r).push(p.L);});return E;}
const effDp=(a,M)=>M?effOf(a,M,X.dpSheet(M,a.dpgf||{})):null;
/* la ligne d'une rangée (lien ou cellule) : {row, n, des, u, q, qte, pu, isMl, uk, known} ; la donnée du lien (L) complète ce qui manque */
function mk(E,row,l,L,M,a){const D=a.dpgf||{};let u=String((l&&l.u)||'').trim(),q=l?(+l.qte||0):0;const known={u:!!u,q:q>0,n:!!(l&&l.n),des:!!(l&&l.des)};let qSrc=q>0?'grid':'';
  if(L){if(!u&&String(L.u||'').trim()){u=String(L.u).trim();known.u=true;}if(!(q>0)){const qc=L.qa?X.qOfCell(M,L.sh,L.qa):null;const v=qc!==null&&qc>0?qc:(+L.q||0);if(v>0){q=v;known.q=true;qSrc='link';}}}
  if(!u){const uo=uMap(D,E.S,E.isDp);const v=uo&&uo.get(row);if(v){u=v;known.u=true;}}
  const uk=unitKey(u);if(uk==='ml'&&X.REP&&!X.REP.isMlU(u))u='ml';
  return {row,n:l?l.n||'':'',des:l?l.des||'':'',u,q,qte:q,pu:l?(+l.pu||0):0,isMl:isMlTxt(u),uk,known,qSrc,src:E.src};}
export function lineOf(a,M,ref){if(!ref||!M||!X)return null;const S=M.S(ref.sh);const p=parseAddr(ref.a||'');if(!S||!p)return null;const E=effOf(a,M,S);if(!E)return null;
  const l=E.by.get(p.r)||null;const L=ref.comps||ref.qa!==undefined?ref:X.linkAt(a,S.name,ref.a);
  if(!l){if(!L)return null;const o=mk(E,p.r,null,L,M,a);return o.known.u||o.known.q?o:null;}return mk(E,p.r,l,L,M,a);}
/* la ligne de prix d'une rangée de la feuille S (sans lien) */
export function lineAt(a,M,S,row){const E=effOf(a,M,S);if(!E)return null;const l=E.by.get(row);if(!l)return null;const pa=E.pc?addrOf(row,E.pc):null;const L=(pa&&X.linkAt(a,S.name,pa))||(E.rowLk.get(row)||[])[0]||null;return Object.assign(mk(E,row,l,L,M,a),{a:pa,qa:E.qc?addrOf(row,E.qc):null});}
export const puCol=(a,M)=>{const E=effDp(a,M);return E&&E.src==='auto'?E.pc:X.puColOf(a.dpgf||{});};
export const qtyCol=(a,M)=>{const E=effDp(a,M);return E&&E.src==='auto'?E.qc:X.qtyColOf(a.dpgf||{});};
export const totCol=(a,M)=>{const E=effDp(a,M);return E&&E.src==='auto'?E.tc:X.totColOf(a.dpgf||{});};
export const isAuto=(a,M)=>{const E=effDp(a,M);return !!E&&E.src==='auto';};
/* les lignes de prix de la feuille du DPGF (dpgfrep.js linesOf, dpgfrecap.js G0, ◀ ▶) : lu juste → D.lignes telles quelles ; sinon les lignes déduites, avec
   leur lien de la rangée (l.L) et l'adresse de ce lien quand il n'est pas dans la colonne du PU */
export function lines(a,M){const D=a.dpgf||{};const E=effDp(a,M);if(!E||E.stored)return (D.lignes||[]).filter(l=>!l.section&&l.row);
  return [...E.by.values()].sort((x,y)=>x.row-y.row).map(l=>{const pa=E.pc?addrOf(l.row,E.pc):null;const L=(pa&&X.linkAt(a,E.S.name,pa))||(E.rowLk.get(l.row)||[])[0]||null;const o=mk(E,l.row,l,L,M,a);
    return Object.assign({},l,{u:o.u,qte:o.q,a:L?L.a:pa,qa:E.qc?addrOf(l.row,E.qc):null,L});});}
/* les étiquettes des liens : le n° de la ligne, sinon l'adresse */
export const labFn=(a,M)=>L=>{const l=M?lineOf(a,M,L):null;return (l&&l.n)||L.a;};
/* calcTarget (dpgfxl.js) : une ligne déduite (DPGF mal lu à l'import) → la cellule PU de sa rangée, ou le lien touché ; undefined = le chemin d'avant */
export function target(a,M,S,s){const E=effOf(a,M,S);if(!E||!E.isDp||E.src!=='auto')return undefined;const l=E.by.get(s.r);if(!l)return noLine(a,S,s);
  const pa=E.pc?addrOf(s.r,E.pc):null;const ck=X.linkAt(a,S.name,addrOf(s.r,s.c));const at=ck&&ck.a!==pa?ck.a:(pa||(ck&&ck.a));if(!at)return undefined;const L=X.linkAt(a,S.name,at);
  const o=mk(E,s.r,l,L,M,a);return {sh:S.name,r:s.r,a:at,qa:(L&&L.qa)||(E.qc?addrOf(s.r,E.qc):null),line:Object.assign({},l,{u:o.u,qte:o.q}),u:o.u||''};}
/* ═════════ 4 · À L'IMPORT (commerce.js dpgfFile) : la lecture déduite quand celle de dpgfFromRows est nettement moins bonne ═════════ */
const clean=L=>L.map(l=>l.section?{n:l.n,des:l.des,section:true,row:l.row}:{n:l.n,des:l.des,u:l.u,qte:l.qte,pu:l.pu,row:l.row});
export function importFix(book,L,meta,sheetName){try{if(!X||!X.bookModel||!book)return null;const M=X.bookModel(book);const okOld=(L||[]).some(l=>!l.section);
    const S0=okOld?(M.sheets.find(s=>sheetName&&s.name===sheetName)||M.sheets.find(s=>meta&&s.path===meta.sheet)||null):null;
    if(S0&&meta&&meta.cols&&meta.hdrRow){const G=gridM(M,S0);const det=detect(G,[]);if(!det)return null;const LT=linesFrom(G,det.cols,det.hdrRow,null);
      const QD=quality(linesFrom(G,meta.cols,meta.hdrRow,null),[]),QT=quality(LT,[]);if(!worse(QD,QT,puColOfC(meta.cols),det,[]))return null;
      return {L:clean(LT),meta:{hdrRow:det.hdrRow,cols:det.cols,sheet:S0.path},sheetName:S0.name};}
    if(okOld)return null; /* l'ancienne lecture a trouvé des lignes ailleurs : on la garde */
    for(const S of M.sheets.filter(s=>!s.hidden).concat(M.sheets.filter(s=>s.hidden))){const G=gridM(M,S);const det=detect(G,[]);if(!det)continue;const LT=linesFrom(G,det.cols,det.hdrRow,null);if(quality(LT,[]).full>=2)return {L:clean(LT),meta:{hdrRow:det.hdrRow,cols:det.cols,sheet:S.path},sheetName:S.name};}
    return null;}catch(e){console.warn(e);return null;}}
/* ═════════ 5 · L'ÉCRAN « 📐 COLONNES DU DPGF » ═════════ */
const ST={dlg:{},uo:{}};export function reset(num){delete ST.dlg[num];delete ST.uo[num];}
const FIELDS=[['n','N°'],['des','Désignation'],['u','Unité'],['qte','Quantité'],['pu','PU'],['tot','Total']];
const cl=c=>c>0?colName(c):'—';
function hdrTxt(G,top,row,c){const t=[];for(let r=Math.max(1,top||row);r<=row;r++){const v=G.get(r,c);if(typeof v==='string'&&v.trim())t.push(v.trim());}return t.join(' ');}
function sample(G,row,c){const o=[];for(let r=row+1;r<=Math.min(G.mr,row+200)&&o.length<3;r++){const v=G.get(r,c);if(v===null||v===undefined||v===''||isErr(v))continue;const t=String(typeof v==='number'?nb(v,Math.abs(v-Math.round(v))>1e-9?2:0):v).trim();if(t&&!o.includes(t))o.push(t.length>18?t.slice(0,17)+'…':t);}return o;}
/* l'état de l'écran : les colonnes (numéros 1…, 0 = aucune) et la ligne d'en-tête ; d'office la lecture effective */
function dlgSt(a,M){const num=a.num;let s=ST.dlg[num];const E=effDp(a,M);if(!E)return null;if(!s||!s.open){const C=E.cols||{};s=ST.dlg[num]=Object.assign(s||{},{open:!!(s&&s.open),hdr:E.hdrRow||1,top:E.hdrTop||E.hdrRow||1,c:Object.fromEntries(FIELDS.map(([k])=>[k,(C[k]??-1)+1]))});}return s;}
const colsOf=s=>Object.fromEntries(FIELDS.map(([k])=>[k,(+s.c[k]||0)-1]));
const sameCols=(A,B)=>!!A&&!!B&&FIELDS.every(([k])=>(A[k]??-1)===(B[k]??-1));
function dlgHTML(a,M,canEdit){const num=a.num;const s=ST.dlg[num];if(!s||!s.open)return '';const E=effDp(a,M);if(!E)return '';const D=a.dpgf||{};const G=E.G;const ro=!canEdit||!!a._vview;css(document);
  const C=colsOf(s);const L=linesFrom(G,C,s.hdr,uMap(D,E.S,true));const pr=L.filter(l=>!l.section);const Q=quality(L,E.links);const top=s.hdr===E.hdrRow?E.hdrTop:s.hdr;
  const opts=k=>{const cur=+s.c[k]||0;let h=`<option value="0"${cur?'':' selected'}>— aucune</option>`;for(let c=1;c<=G.mc;c++){const ht=hdrTxt(G,top,s.hdr,c);const sm=sample(G,s.hdr,c);if(!ht&&!sm.length&&c!==cur)continue;
      h+=`<option value="${c}"${c===cur?' selected':''}>${esc(colName(c)+' · '+(ht?'« '+ht.slice(0,28)+' »':'(ex. '+sm.join(', ')+')'))}</option>`;}return h;};
  const rows=FIELDS.map(([k,lab])=>`<label class="dy-cf"><span class="dy-cfl">${lab}</span><select class="f" data-co="f" data-k="${k}"${ro?' disabled':''} aria-label="${esc('Colonne : '+lab)}">${opts(k)}</select></label>`).join('');
  let ho='';for(let r=1;r<=Math.min(G.mr,Math.max(40,s.hdr+5));r++){const two=r===s.hdr&&top<r;const t=(two?rowCells(G,top):[]).concat(rowCells(G,r)).filter(x=>!x.num).map(x=>x.t).slice(0,4).join(' · ');if(!t&&r!==s.hdr)continue;ho+=`<option value="${r}"${r===s.hdr?' selected':''}>${esc((two?'Lignes '+top+'-'+r:'Ligne '+r)+(t?' · '+t.slice(0,46):''))}</option>`;} /* un en-tête sur 2 lignes : « Lignes 6-7 » */
  const lkRows=new Set(E.links.map(p=>p.r));const ex=pr.filter(l=>lkRows.has(l.row)).concat(pr.filter(l=>!lkRows.has(l.row))).slice(0,3);
  const exH=ex.length?ex.map(l=>`<div class="dy-ex"><b>${esc(l.n||'(sans n°)')}</b> ${esc(String(l.des).slice(0,70))} <span class="dim">· ${l._q?esc(fq(l.qte)):'<b class="c3-bad">quantité ?</b>'} ${l.u?esc(l.u):'<b class="c3-bad">unité ?</b>'}${l.pu?' · PU '+esc(nb(l.pu,2))+' €':''}</span></div>`).join(''):'<div class="dy-ex c3-bad">Aucune ligne de prix avec ces colonnes.</div>';
  const nLk=E.links.length;const lkOk=E.links.filter(p=>pr.some(l=>l.row===p.r&&unitKey(l.u)&&l._q)).length;
  const was=E.src==='auto'&&E.old?`<div class="dy-was">À l'import, l'appli avait lu l'en-tête en ligne ${esc(String(E.old.hdrRow))}${(()=>{const t=rowCells(G,E.old.hdrRow).map(x=>x.t).join(' · ');return t?' (« '+esc(t.slice(0,60))+' »)':'';})()} : ${E.QD&&E.QD.full?esc(E.QD.full+' ligne'+(E.QD.full>1?'s':'')+' de prix complète'+(E.QD.full>1?'s':'')):'aucune ligne de prix'}. Elle relit maintenant le DPGF d'après tes lignes (rien n'est encore enregistré) : « Appliquer » garde cette lecture.</div>`:'';
  const same=sameCols(C,D.cols)&&s.hdr===D.hdrRow;
  const body=`<p class="dy-int">Ce que l'appli lit dans le fichier du client, feuille « ${esc(E.S.name)} » : l'en-tête est ${top<s.hdr?`sur les lignes ${top} et ${s.hdr}`:`la ligne ${s.hdr}`}, les lignes de prix commencent dessous.</p>${was}
    <div class="dy-cnt"><b>${Q.full} ligne${Q.full>1?'s':''} reconnue${Q.full>1?'s':''} sur ${pr.length}</b> <span class="dim">(unité et quantité lues ; ${L.length-pr.length} titre${L.length-pr.length>1?'s':''} de chapitre à part)</span>${nLk?` · <span class="${lkOk<nLk?'c3-bad':''}">lignes liées lues : ${lkOk} / ${nLk}</span>`:''}</div>
    <div class="dy-cfs">${rows}<label class="dy-cf"><span class="dy-cfl">En-tête</span><select class="f" data-co="h"${ro?' disabled':''} aria-label="Ligne d'en-tête">${ho}</select></label></div>
    <div class="dy-exh">3 lignes telles qu'elle les lit</div>${exH}
    <p class="hint dy-note">« Appliquer » ne touche ni aux liens ni aux PU déjà écrits (ils restent dans leurs cellules) : seulement à la lecture des lignes (n°, désignation, unité, quantité). Un seul ↶ pour revenir.</p>`;
  const ft=ro?'<span class="hint">Lecture seule</span>':`<button class="btn sm" data-act="af" data-v="dxcoclose|">Fermer</button><button class="btn sm primary" data-act="af" data-v="dxcoapply|"${same||!Q.full?' disabled':''} title="${same?'C\'est déjà la lecture enregistrée':'Enregistrer ces colonnes : les lignes sont relues'}">${same?'✓ Déjà enregistré':'✓ Appliquer'}</button>`;
  return `<div class="rp-ov dy-ov" id="dy-ov"><div class="rp-dlg dy-dlg" id="dy-dlg" role="dialog" aria-modal="true" aria-label="Colonnes du DPGF"><div class="rp-hd"><h3>📐 Colonnes du DPGF</h3><button class="btn sm" data-act="af" data-v="dxcoclose|" aria-label="Fermer">✕</button></div><div class="rp-body" id="dy-body">${body}</div><div class="rp-ft">${ro?'':'<span></span>'}<span class="rp-btns">${ft}</span></div></div></div>`;}
function refreshDlg(num){if(!docOK())return;const el=document.getElementById('dy-ov');const a=X.affOf(num);const M=a&&X.modelOf(a);if(!el||!M)return;const b=document.getElementById('dy-body');const st=b?b.scrollTop:0;const t=document.createElement('div');t.innerHTML=dlgHTML(a,M,!!X.XS.canEdit);const n=t.firstElementChild;if(n)el.replaceWith(n);const b2=document.getElementById('dy-body');if(b2)b2.scrollTop=st;}
export function endHTML(a,M,canEdit){if(!M)return '';hook();return dlgHTML(a,M,canEdit);}
/* « Appliquer » : D.cols, D.hdrRow, D.lignes (les anciennes cartes de l'atelier suivent leurs rangées) — un seul ↶ ; ni les liens ni les PU */
function apply(a,M){const s=ST.dlg[a.num];if(!s)return;const C=colsOf(s);if(C.des<0){X.say('Choisis au moins la colonne de la désignation');return;}const hdr=+s.hdr||1;
  X.dxWrite(a,[],{dp:D=>{const oldL=D.lignes||[];D.cols=C;D.hdrRow=hdr;const L=X.deriveLines(M,D);if(D.map&&Object.keys(D.map).length){const idx=new Map();L.forEach((l,j)=>idx.set(l.row,j));const map={};
      Object.keys(D.map).forEach(i=>{const o=oldL[+i];const j=o?idx.get(o.row):undefined;if(j!==undefined)map[j]=D.map[i];});D.map=map;}D.lignes=L;}});
  s.open=false;const n=(X.affOf(a.num).dpgf.lignes||[]).filter(l=>!l.section).length;X.say('📐 Colonnes du DPGF enregistrées : '+n+' ligne'+(n>1?'s':'')+' de prix relue'+(n>1?'s':'')+' (liens et PU inchangés) · ↶ pour revenir');X.rerender();}
/* ═════════ 6 · LE BANDEAU (onglet DPGF) ═════════ */
export function bandHTML(a,M,canEdit){if(!M||!X)return '';hook();css(document);const E=effDp(a,M);if(!E)return '';const D=a.dpgf||{};let miss=0;
  E.links.forEach(p=>{const l=lineOf(a,M,p.L);if(!l||(!l.known.u&&!l.known.q))miss++;});
  if(!miss&&E.src!=='auto')return '';const C=E.cols||{};const where=[['u','unité'],['qte','quantité'],['pu','PU']].filter(([k])=>C[k]>=0).map(([k,t])=>t+' en '+colName(C[k]+1)).join(', ');
  const t=miss?`<b>${miss} ligne${miss>1?'s':''} liée${miss>1?'s':''} sans unité ni quantité lues</b> : l'appli ne sait pas les lire`:`<b>Colonnes du DPGF relues d'après tes lignes</b> (${esc(where)}) : l'import les avait mal lues ; rien n'est enregistré tant que tu n'appliques pas`;
  return `<div class="dy-band" id="dy-band" role="status"><span aria-hidden="true">📐</span><span class="dy-bt">${t}.</span><button class="btn sm" data-act="af" data-v="dxcoopen|">→ Colonnes du DPGF</button></div>`;}
/* le bouton du menu « ⋯ » (dpgfclair.js) */
export const menuBtn=a=>`<button class="btn sm" data-act="af" data-v="dxcoopen|" title="Voir et corriger les colonnes lues dans le fichier du client (n°, désignation, unité, quantité, PU, total)">📐 Colonnes du DPGF</button>`;
/* ═════════ 7 · L'UNITÉ EN UN CLIC (en-tête du calculateur) ═════════ */
const UQ=[['ml','ml'],['u','u'],['ens','ens'],['ft','ft']];
export function unitPick(a,M,T,C,ro){if(!T||!T.line||!M||!X)return '';if(String(T.u||'').trim())return '';const num=a.num;css(document);
  const q=X.parseQ(C&&C.q,{qty:0});const qc=T.qa?X.qOfCell(M,T.sh,T.qa):null;const qt=q>0?(qc!==null&&Math.abs(qc-q)<1e-9?`quantité ${fq(q)} (lue en ${T.qa})`:`quantité ${fq(q)} (tapée)`):'pas encore de quantité';
  const other=!!ST.uo[num];const dis=ro?' disabled':'';
  return `<div class="dy-up" role="group" aria-label="Unité de la ligne"><span class="dy-upl">Unité pas lue :</span>${UQ.map(([k,t])=>`<button type="button" class="btn sm dy-ub" data-act="af" data-v="dxcounit|${k}"${dis} title="${esc('Cette ligne est en '+t+' (gardé pour la ligne)')}">${t}</button>`).join('')}${other?`<input class="f dy-uo" data-co="uo" maxlength="12" placeholder="m², kg, h…" aria-label="Autre unité"${dis}><button type="button" class="btn sm dy-ub" data-act="af" data-v="dxcounit|="${dis}>OK</button>`:`<button type="button" class="btn sm dy-ub" data-act="af" data-v="dxcouo|"${dis}>autre…</button>`}<span class="dy-uq">· ${esc(qt)}</span><button type="button" class="lnk dy-ucl" data-act="af" data-v="dxcoopen|">📐 Colonnes du DPGF</button></div>`;}
function setUnit(a,M,u){const T=X.calcTarget(a,M);if(!T||!u)return;const S=X.dpSheet(M,a.dpgf||{});const key=(up(T.sh)===up(S.name)?'':T.sh+'!')+T.a;const p=parseAddr(T.a);
  X.dxWrite(a,[],{dp:D=>{D.uOf=Object.assign({},D.uOf||{},{[key]:u});D.lignes=X.deriveLines(M,D);}});X.XS.calc[a.num]=null;delete ST.uo[a.num];
  X.say('Unité de la ligne '+((T.line&&T.line.n)||'ligne '+(p?p.r:''))+' : '+u+' (gardée pour la ligne) · ↶ pour revenir');X.rerender();}
/* ═════════ 8 · DES ML EN PLUS AU CHIFFRAGE (liste des changements du lot C3) ═════════ */
const TQ=Q=>Math.max(0.001,Math.abs(+Q||0)*1e-7);
/* itemsOf (dpgfsuivi.js) : un poste au ml dont la quantité augmente, les lignes du DPGF qui le portent n'ont pas bougé → « laisser à placer » d'office (it.def) */
export function items(a,CP,M,its){if(!M||!CP)return;its.forEach(it=>{if(it.kind!=='bal'||!it.c||it.c.u!=='ml'||!it.ref||!(it.dq>TQ(it.Q))||it.over>TQ(it.Q))return;
  const same=(it.lines||[]).every(L=>{const q0=+L.q||0;const q1=X.linkNow(L,CP,M).q;return q0>0&&Math.abs(q1-q0)<=Math.max(1e-6,q0*1e-6);});if(!same)return;
  it.def='keep';it.mlUp={dq:it.dq,e:it.dq*(it.Q>0?it.A/it.Q:0)};});}
export function balPhrase(it,L){const u=it.mlUp;const n=it.lines.length;const amt=Math.abs(it.dA)>0.01?`montant ${eur(it.ref.m)} → ${eur(it.A)}`:'montant inchangé';
  return `<b>${fq(it.ref.q)} → ${fq(it.Q)} ml au chiffrage</b>, ${amt} : ${X.SV.isInst(it.c)?'l\'installation':'le poste'} se répartit sur plus de ml ; ${n>1?'tes '+n+' lignes':'ta ligne'} (${L}) ${n>1?'gardent leurs':'garde ses'} ml, ${n>1?'leur':'son'} PU baisse un peu ; <b>${fq(u.dq)} ml (≈ ${eur(u.e)}) sont libérés pour les nouvelles lignes</b>.`;}
export function balActs(B,it,okB,multi){const u=it.mlUp;const n=it.lines.length;
  return B('keep','Laisser à placer pour les nouvelles lignes ('+fq(u.dq)+' ml · '+eur(u.e)+')','primary','Les lignes déjà pointées gardent leurs ml (leur PU baisse un peu) ; les ml en plus restent à placer : calculateur (« prendre au prorata de mes ml ») ou « Mettre le reste au ml »')
    +B('bal','Refaire la balance sur '+(n>1?'les '+n+' lignes':'la ligne')+' ('+(n>1?'elles gardent leur':'elle garde son')+' PU, rien à placer)','','Mêmes proportions qu\'avant, à la nouvelle quantité : tout reste sur ces lignes')+multi+okB;}
export const allTxt=itc=>itc.some(it=>it.def==='keep')?' <b>Des ml en plus au chiffrage</b> (lignes du DPGF inchangées) → laissés à placer pour les nouvelles lignes.':'';
export function keepAllHTML(a,its,ro){const K=its.filter(it=>it.def==='keep');if(ro||K.length<2)return '';const e=K.reduce((s,it)=>s+it.mlUp.e,0);const dq=Math.max(...K.map(it=>it.mlUp.dq));const ins=K.every(it=>X.SV.isInst(it.c));const w=ins?'installation':'poste';
  return `<div class="c3-all dy-keep"><button class="btn primary" data-act="af" data-v="dxcokeep|">Laisser à placer les ${K.length} ${w}s</button><span class="c3-allt">${esc(K.map(it=>it.c.pl).join(', '))} : ${fq(dq)} ml en plus au chiffrage et les lignes du DPGF n'ont pas bougé → ces ${fq(dq)} ml de chaque ${w} restent à placer pour les nouvelles lignes (≈ ${eur(e)} en tout) ; les PU des lignes déjà pointées baissent un peu. Un seul ↶.</span></div>`;}
function keepAll(a,M){const CP=X.compsOf(a);if(!CP)return;const K=X.SV.itemsOf(a,CP,M).filter(it=>it.def==='keep');if(!K.length){X.say('Plus rien à laisser à placer');X.rerender();return;}
  const R=X.SV.run(a,CP,M,K.map(it=>({it,act:'keep'})));if(R.msg.length){X.say('Rien d\'écrit : '+R.msg.join(' ; '));return;}X.SV.keepScroll();X.dxWrite(a,R.vals,{liens:()=>R.W,sv:R.sv});X.XS.calc[a.num]=null;
  const m=X.SV.moved(R.chg);X.SV.flash(m.filter(x=>x.neu!==null).map(x=>x.id));const e=K.reduce((s,it)=>s+it.mlUp.e,0);
  const w=K.every(it=>X.SV.isInst(it.c))?'installation':'poste';X.say('✓ '+K.length+' '+w+(K.length>1?'s':'')+' laissé'+(w==='installation'?'e':'')+(K.length>1?'s':'')+' à placer pour les nouvelles lignes (≈ '+eur(e)+')'+(m.length?' — '+m.length+' PU baisse'+(m.length>1?'nt':'')+' un peu':'')+' · ↶ pour revenir');X.rerender();}
/* ═════════ 9 · LA PART D'INSTALLATION AU PRORATA DES ML (calculateur, sous-bloc d'une zone) ═════════ */
/* la case « prendre au prorata de mes ml » : la part d'une zone (au ml de la zone) sur une ligne au ml du DPGF dont on connaît les ml */
export function prOn(a,M,CP,C,T,v){return !!(X&&v&&v.v&&v.u==='ml'&&v.f>0&&T&&T.line&&isMlTxt(T.u)&&prDef(T,C)>0);}
export function prDef(T,C){return X.REP.mlDef(T,X.parseQ(C&&C.q,{qty:0}));}
/* d'où vient l'argent : le reste de la zone, puis le reste global, puis la reprise sur les lignes au ml de la zone (au prorata de ce qu'elles portent), à défaut sur
   celles des zones qui en portent trop. Unités de la zone (ml de la zone) ; ZI = les fonctions de dpgfzone.js */
export function prPlan(a,M,CP,C,T,v,lk,t,ZI){const FI=ZI.freeIn(a,M,CP,C,T,v,lk);const gz=FI.gf!==undefined?Math.max(0,FI.gf)/v.f:Math.max(0,FI.f);const zr=Math.max(0,FI.zs);
  const fZ=Math.min(t,Math.max(0,Math.min(zr,gz)));const fG=Math.min(t-fZ,Math.max(0,gz-fZ));let need=Math.max(0,t-fZ-fG);const LI=ZI.lineIdx(a,M);const lab=L=>{const l=LI.get(L.id);return (l&&l.n)||L.a;};
  const hs=ZI.holders(a,M,CP,v,lk?lk.id:null).filter(h=>h.l&&h.l.isMl&&h.l.q>0).map(h=>({id:h.L.id,L:h.L,T:h.q/v.f,lab:lab(h.L)}));const Qd=hs.reduce((s,h)=>s+h.T,0);const rep=Math.min(need,Qd);need-=rep;
  const ds=hs.map(h=>Object.assign(h,{loss:Qd>0?rep*h.T/Qd:0})).filter(h=>h.loss>1e-9);const cross=[];
  if(need>1e-6){const st=ZI.stOf(a,M,CP).find(p=>p.c.k===v.bk);const vs=CP.zv.vcs.get(v.bk)||[];let nE=need*v.puV;
    if(st)st.z.filter(x=>x.i!==v.z&&x.gapN>0.005).sort((x,y)=>y.gapN-x.gapN).forEach(x=>{if(nE<=1e-6)return;const vj=vs[x.i];if(!vj||!(vj.f>0))return;
      const hj=ZI.holders(a,M,CP,vj,lk?lk.id:null).filter(h=>h.l&&h.l.isMl&&h.l.q>0).map(h=>({id:h.L.id,L:h.L,T:h.q/vj.f,lab:lab(h.L)}));const Qj=hj.reduce((s,h)=>s+h.T,0);if(!(Qj>1e-9))return;
      const tE=Math.min(nE,x.gapN,Qj*vj.puV);const qj=tE/vj.puV;nE-=tE;cross.push({j:x.i,v:vj,q:qj,e:tE,ds:hj.map(h=>Object.assign(h,{loss:qj*h.T/Qj})).filter(h=>h.loss>1e-9)});});
    need=Math.max(0,nE/v.puV);}
  return {t,fZ,fG,rep,ds,cross,short:need,FI};}
const lossTxt=(ds,pu)=>ds.slice(0,4).map(d=>esc(d.lab)+' −'+eur(d.loss*pu)).join(', ')+(ds.length>4?' +'+(ds.length-4):'');
export function prFund(P,v,CP){const p=[];if(P.fZ*v.puV>=0.5)p.push(eur(P.fZ*v.puV)+' du reste de la zone');if(P.fG*v.puV>=0.5)p.push(eur(P.fG*v.puV)+' du reste des autres zones');
  if(P.rep*v.puV>=0.5)p.push(eur(P.rep*v.puV)+' repris sur '+P.ds.length+' ligne'+(P.ds.length>1?'s':'')+' de la zone ('+lossTxt(P.ds,v.puV)+')');
  P.cross.forEach(x=>{p.push(eur(x.e)+' repris sur '+x.ds.length+' ligne'+(x.ds.length>1?'s':'')+' de '+esc(CP.zones[x.j].nom)+', qui en porte trop ('+lossTxt(x.ds,x.v.puV)+')');});
  const tot=(P.t-P.short)*v.puV;return `${eur(tot)} = ${p.length?p.join(' + '):'0 €'}${P.short*v.puV>=0.5?` · <b class="c3-bad">il manque ${eur(P.short*v.puV)} : plus rien à reprendre, la part est ramenée à ${eur(tot)}</b>`:''}`;}
/* la case d'une zone (dpgfzone.js vcRow) sur une ligne au ml : o = {FI, done, short, det, by, lk, ZI} ; une seule phrase quand tout est pointé ; jamais grisée */
export function prRow(a,M,CP,C,T,v,ro,o){const k=v.k;const on=C.chk[k]!==undefined;const t=on?X.parseQ(C.chk[k],v):prDef(T,C);const P=prPlan(a,M,CP,C,T,v,o.lk,t,o.ZI);const amt=t*v.puV;const free=Math.max(0,P.FI.f);
  const left=free-t;const rst=left>=-1e-6?(Math.abs(left)*v.puV<0.5?'✓ tout pointé dans la zone':'reste '+eur(left*v.puV)):'';
  const lab=o.by.length?' · ligne'+(o.by.length>1?'s':'')+' '+o.by.slice(0,5).join(', ')+(o.by.length>5?' +'+(o.by.length-5):''):''; /* o.by : déjà échappés */
  const dn=o.done?`<div class="c2-dn dy-dn">${o.head}${lab}${ro?'':` — coche : ta part au prorata de tes ml, reprise sur ${!P.ds.length&&P.cross.length?'les lignes des zones qui en portent trop':'les lignes de la zone'}, au prorata de ce qu'elles portent`}</div>`:''; /* une seule phrase : celle d'avant (o.head), puis la case */
  return {h:`<div class="dx-cr c2-r dz-r dy-zr${on?' on':''}${o.done?' c2-done':''}" data-k="${esc(k)}"><input type="checkbox" data-dz="ck" data-k="${esc(k)}"${on?' checked':''}${ro?' disabled':''} aria-label="${esc('Prendre au prorata de mes ml : '+v.b.pl+' ('+v.zn+')')}"><span class="c2-nm">🏗 ${esc(v.b.pl)}<small>${o.det}</small></span><span class="m">${eur(v.amtV)}</span>`
    +(on?`<div class="dx-cq dy-cq">prendre au prorata de mes ml : <input inputmode="decimal" data-dx="cq" data-k="${esc(k)}" value="${esc(C.chk[k])}"${ro?' disabled':''} aria-label="${esc('Ml pris pour : '+v.b.pl)}"> ml = <b data-amt="${esc(k)}">${eur(amt,2)}</b> <span class="dx-rst">${rst}</span></div><div class="dy-prd">${prFund(P,v,CP)}</div>`
      :`<div class="dy-pr"><span>prendre au prorata de mes ml : ${esc(fq(t))} ml ≈ <b>${eur(amt)}</b></span>${P.rep+P.cross.length>1e-9&&!o.done?` <small>(dont ${eur((P.rep+P.cross.reduce((s,x)=>s+x.q*x.v.puV/v.puV,0))*v.puV)} repris sur d'autres lignes)</small>`:''}</div>`)
    +dn+'</div>',on,done:o.done&&!on};}
/* « ↦ Mettre » (dpgfzone.js putParts) : ce qui vient des restes reste sur la ligne ; la reprise devient des parts données (give du lot DK) — un seul ↶ */
export function prSplit(a,M,CP,T,C,L,ZI){const out={rows:[],e:{rest:0,rep:0},n:0,short:0,ids:new Set(),chg:false};if(!CP||!CP.zv||!T||!T.line)return out;const lk=X.linkAt(a,T.sh,T.a);
  Object.keys(C.chk||{}).forEach(k=>{const v=CP.by.get(k);if(!v||!v.v||!prOn(a,M,CP,C,T,v))return;const t=X.parseQ(C.chk[k],v);if(!(t>1e-9))return;const P=prPlan(a,M,CP,C,T,v,lk,t,ZI);
    const rq=P.rep+P.cross.reduce((s,x)=>s+x.q*x.v.f/v.f,0);out.n++;out.e.rest+=(P.fZ+P.fG)*v.puV;out.short+=P.short*v.puV;if(!(rq>1e-6)&&!(P.short>1e-6))return;
    const keep=r6((P.fZ+P.fG)*v.f);const i=L.comps.findIndex(x=>x.k===v.bk&&x.zs===v.zt&&!x.via&&!x.rep);if(i>=0){out.chg=true;if(keep>1e-9)L.comps[i]=Object.assign({},L.comps[i],{q:keep});else L.comps.splice(i,1);}
    if(P.rep>1e-6){out.rows.push({k:v.k,q:r3(P.rep),ids:P.ds.map(d=>d.id)});out.e.rep+=P.rep*v.puV;P.ds.forEach(d=>out.ids.add(d.id));}
    P.cross.forEach(x=>{if(!(x.q>1e-6))return;out.rows.push({k:x.v.k,q:r3(x.q),ids:x.ds.map(d=>d.id),zs:v.zt});out.e.rep+=x.e;x.ds.forEach(d=>out.ids.add(d.id));});});
  return out;}
/* le message du « Mettre » quand une part vient en partie du reste */
export function prMsg(old,Ln,T,Y,nPU,nGiv){const tot=Y.e.rest+Y.e.rep;return (old?'Prix mis à jour':'Prix lié')+' : '+nb(Ln?Ln.pu:0,2)+' € dans '+T.a+' — avec sa part d\'installations au prorata de ses ml ('+eur(tot)+' : '+eur(Y.e.rest)+' du reste'+(Y.e.rep>=0.5?' + '+eur(Y.e.rep)+' repris sur '+nGiv+' ligne'+(nGiv>1?'s':''):'')+')'
  +(Y.short>=0.5?' · il manquait '+eur(Y.short)+' : plus rien à reprendre':'')+' · '+nPU+' PU réécrit'+(nPU>1?'s':'')+', surligné'+(nPU>1?'s':'')+' dans la grille · ↶ pour revenir';}
/* plus rien à reprendre (le manque ne trouve aucune ligne) : la ligne prend ce qui reste, son PU suit — un seul ↶ */
export function prPut(a,CP,T,L,old,vals,Y){const amt=L.comps.reduce((s,x)=>{const c=CP.by.get(x.k);return s+(c?(+x.q||0)*c.puV:0);},0);const pu=L.q>0?Math.round(amt/L.q*100)/100:0;Object.assign(L,{amt:Math.round(amt*100)/100,pu});vals[0]=Object.assign({},vals[0],{e:{v:pu}});
  X.dxWrite(a,vals,{liens:LL=>old?LL.map(x=>x.id===old.id?L:x):LL.concat([L])});return prMsg(old,L,T,Y,1,0);}
/* « ↻ Reventiler » (dpgfzone.js revPlan) : la part visée de chaque zone (unités de l'installation). Tout est pointé (P ≥ TS) : comme avant, chaque zone sa part (au
   prorata). Une partie reste à placer (ml en plus laissés à placer) : les zones au-delà de leur part rendent ce qu'elles ont en trop aux zones qui en manquent, au
   prorata de ce qui leur manque — le reste à placer reste dans les zones qui n'ont pas encore leur part ; le total ne change pas */
export function revTg(Za,T,mov,P,TS,n){const tg=new Float64Array(n);if(!(TS>1e-12))return tg;if(P>=TS-1e-9){const rho=Math.min(1,P/TS);Za.forEach(i=>{tg[i]=T[i]*rho;});return tg;}
  let rest=P;const room=new Float64Array(n);Za.forEach(i=>{tg[i]=Math.min(T[i],mov[i]||0);rest-=tg[i];room[i]=T[i]-tg[i];});const RM=Za.reduce((s,i)=>s+room[i],0);
  if(rest>1e-12&&RM>1e-12)Za.forEach(i=>{tg[i]+=Math.min(room[i],rest*room[i]/RM);});return tg;}
/* ═════════ 10 · ACTIONS (data-v="dxco…|…", depuis dpgfXlAct) ═════════ */
export function act(k,arg,arg2,a,canEdit,M){const num=a.num;const rw=canEdit&&!a._vview;
  switch(k){
    case 'dxcoopen':{if(!M)return true;const s=dlgSt(a,M);if(s){s.open=true;}X.rerender();setTimeout(()=>{const b=document.querySelector('#dy-dlg select');if(b)try{b.focus({preventScroll:true});}catch(e){}},40);return true;}
    case 'dxcoclose':{const s=ST.dlg[num];if(s)s.open=false;const o=docOK()&&document.getElementById('dy-ov');if(o)o.remove();delete ST.dlg[num];return true;}
    case 'dxcoapply':{if(!rw||!M)return true;apply(a,M);return true;}
    case 'dxcounit':{if(!rw||!M)return true;let u=String(arg||'');if(u==='='){const i=docOK()&&document.querySelector('#dx-calc [data-co="uo"]');u=String((i&&i.value)||'').trim().slice(0,12);if(!u){X.say('Tape l\'unité (ex. m², kg, h)');return true;}}setUnit(a,M,u);return true;}
    case 'dxcouo':{if(!rw)return true;ST.uo[num]=true;X.refreshSide(a);setTimeout(()=>{const i=document.querySelector('#dx-calc [data-co="uo"]');if(i)try{i.focus();}catch(e){}},30);return true;}
    case 'dxcokeep':{if(!rw||!M)return true;keepAll(a,M);return true;}}
  return false;}
let WIRED=false;
function wire(){if(WIRED||!docOK())return;WIRED=true;
  document.addEventListener('change',e=>{const t=e.target;if(!t||!t.dataset||t.dataset.co===undefined||!t.closest('#dy-dlg'))return;const num=X.XS.num;const s=num&&ST.dlg[num];if(!s)return;
    if(t.dataset.co==='f'){s.c[t.dataset.k]=+t.value||0;}else if(t.dataset.co==='h'){s.hdr=+t.value||1;}refreshDlg(num);});
  document.addEventListener('keydown',e=>{const t=e.target;if(e.key==='Enter'&&t&&t.dataset&&t.dataset.co==='uo'){e.preventDefault();const b=document.querySelector('#dx-calc [data-v="dxcounit|="]');if(b)b.click();}
    if(e.key==='Escape'&&document.getElementById('dy-ov')){e.preventDefault();e.stopPropagation();const num=X&&X.XS.num;if(num&&ST.dlg[num])ST.dlg[num].open=false;document.getElementById('dy-ov').remove();}},true);}
/* tests : la lecture effective, et l'état d'un DPGF importé par le build d'avant (colonnes mal lues) */
function hook(){try{if(typeof window!=='undefined'&&window.TRACE&&!window.TRACE.dpgfCols)window.TRACE.dpgfCols={unitKey,
  eff:num=>{const a=X.affOf(num);const M=a&&X.modelOf(a);const E=a&&M?effDp(a,M):null;return E?{src:E.src,cols:E.cols,hdrRow:E.hdrRow,hdrTop:E.hdrTop,lines:[...E.by.values()].map(l=>({row:l.row,n:l.n,des:l.des,u:l.u,q:l.qte}))}:null;},
  lineOf:(num,sh,ad)=>{const a=X.affOf(num);const M=a&&X.modelOf(a);const l=M?lineOf(a,M,{sh,a:ad}):null;return l?{row:l.row,n:l.n,des:l.des,u:l.u,q:l.q,isMl:l.isMl,known:l.known}:null;},
  setRead:(num,o)=>{const a=X.affOf(num);const M=a&&X.modelOf(a);if(!M)return -1;const D=Object.assign({},a.dpgf,{cols:o.cols,hdrRow:o.hdrRow});if('sheet' in o)D.sheet=o.sheet;if('sheetName' in o){if(o.sheetName)D.sheetName=o.sheetName;else delete D.sheetName;}
    D.lignes=X.deriveLines(M,D);X.H().affSet(num,{dpgf:D});return D.lignes.filter(l=>!l.section).length;}};}catch(e){}}
/* ═════════ 11 · CSS (injectée : <style id="css-lot-dy">) ═════════ */
const CSS_DY=`
.dy-band{display:flex;flex-wrap:wrap;align-items:center;gap:4px 10px;margin:0 0 8px;padding:5px 8px 5px 10px;border:1px solid #c7d7ea;border-left:5px solid #1f6fd0;border-radius:8px;background:#f5f9ff;font-size:12.5px;line-height:1.4;color:#1f3864}
.dy-band .dy-bt{flex:1 1 240px;min-width:0}.eq-app .dy-band .btn.sm{min-height:34px}
.dy-dlg .rp-body{font-size:13px;line-height:1.45}.dy-int{margin:0 0 8px}.dy-was{margin:0 0 8px;padding:6px 8px;border-radius:8px;background:#fff7e6;border:1px solid #f3c27a;color:#5c3d00;font-size:12.5px}
.dy-cnt{margin:0 0 8px}.dy-cfs{display:grid;grid-template-columns:repeat(auto-fill,minmax(210px,1fr));gap:6px 10px;margin:0 0 10px}
.dy-cf{display:flex;flex-direction:column;gap:2px;min-width:0;margin:0}.dy-cfl{font-size:11.5px;font-weight:700;color:#374151;text-transform:uppercase;letter-spacing:.03em}.dy-cf select{width:100%;min-width:0;min-height:36px;font-size:13px}
.dy-exh{font-weight:700;font-size:12px;color:#374151;margin:4px 0 2px}.dy-ex{padding:4px 8px;border-top:1px solid #eef0f2;font-size:12.5px;overflow-wrap:anywhere}.dy-note{margin:10px 0 0}
@media (min-width:701px){.rp-dlg.dy-dlg{height:auto;width:min(820px,100%)}}
#dx-calc .dy-up{display:flex;flex-wrap:wrap;align-items:center;gap:4px 6px;margin:5px 0 0;padding:4px 6px;border:1px dashed #d97706;border-radius:8px;background:#fffbeb;font-size:12.5px}
#dx-calc .dy-upl{font-weight:700;color:#92400e}.eq-app #dx-calc .dy-ub{min-height:40px;min-width:44px;font-weight:700}.eq-app #dx-calc .dy-uo{width:96px;min-height:40px;margin:0}#dx-calc .dy-uq{color:#4b5563}
#dx-calc .dy-ucl{font-size:12px;min-height:34px}
#dx-calc .dy-zr .dy-pr{grid-column:2/-1;font-size:12px;color:#134e4a;display:flex;flex-wrap:wrap;gap:2px 6px;align-items:baseline}#dx-calc .dy-zr .dy-pr small{color:#4b5563}
#dx-calc .dy-zr .dy-prd{grid-column:2/-1;font-size:11.5px;color:#134e4a;line-height:1.35;overflow-wrap:anywhere}#dx-calc .dy-zr.c2-done .dy-pr,#dx-calc .dy-zr.c2-done .dy-cq,#dx-calc .dy-zr.c2-done .dy-prd{text-decoration:none;color:#134e4a}
#dx-calc .dy-zr .dy-dn{color:#3f7a54}
.c3-all.dy-keep{border-color:#a7c4e8;background:#f5f9ff}
`;
export function css(doc){doc=doc||(docOK()?document:null);if(!doc)return;wire();if(doc.getElementById('css-lot-dy'))return;const s=doc.createElement('style');s.id='css-lot-dy';s.textContent=CSS_DY;doc.head.appendChild(s);}
