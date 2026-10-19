// dpgfsuivi.js — LOT C3 (16/10 après-midi) : le DPGF plus léger, et la liste des changements du chiffrage à traiter. Ethan (16/10) : « mets la ventilation en
// dessous de « calculer le prix » et pas côte à côte, c'est le bouton « calculer le prix » qui doit être accessible facilement aussi sans remonter […] moins de scroll
// dans tous les sens. Il faut pouvoir rétracter des zones aussi si on veut. Les installations doivent être mises au début […] visibles sans scroller beaucoup […] si
// les quantités et prix changent dans le tableau de chiffrage les liens restent […] des soudures en moins […] une alerte, que ça nous demande ce qui doit être enlevé
// avec une checklist des changements, genre « 50 soudures en moins à traiter », les prix qui sont impactés […] si des soudures en plus […] où elles doivent être
// imputées […] tout ce qui a été divisé en plusieurs, genre installation ou pelle […] un raccourci simplifié pour refaire la balance ».
// · ÉCRAN : la ventilation toujours SOUS le calculateur (autre écran compris) ; bouton flottant « 🧮 Calculer » (bas droite) qui ouvre / ramène le calculateur sur la
//   ligne sélectionnée ; calculateur : groupes repliables « 🏗 Installations » en tête (la colonne Installations et, dans chaque zone, amené / repli, conteneur-benne-
//   pelle, déchargement, transfert, DOE, frais = INST_KEYS de prix.js), « Zone n », « ✔ Autocontrôles » en dernier ; des puces pour y aller ; lignes serrées, en
//   plusieurs colonnes quand la place le permet ; ventilation compacte (Poste | zones | Total | Reste ; coûts et pointé derrière « Détail des coûts » ; zones
//   repliables) ; plis mémorisés sur l'appareil (localStorage « trace:dpgf:plis »).
// · CLÉS STABLES : zone = « z:<id de la zone> » (un id est posé sur une zone qui n'en a pas) ; lignes SST / raccordements / vannes / extrusion = leur contenu (« d80.<type> »,
//   « .2 » au 2e identique), paniers = leur id ; les anciennes clés (« z0|… », « …|r3 ») restent lues : CP.by les donne aussi (calculées comme avant) et suivi.al les
//   fige à la 1re ouverture (une zone supprimée ou déplacée ne fait plus glisser un ancien lien sur la zone d'à côté) ; un lien réécrit (Mettre, ↻ Appliquer,
//   répartition, traitement) passe aux clés stables.
// · SUIVI : a.dpgf.suivi = {v, at, q:{clé: quantité}, m:{clé: montant de vente}, al?:{ancienne clé: clé stable}, ok?:{clé: état accepté}} (optionnel) = l'état du
//   chiffrage des composantes POINTÉES au moment du pointage. Tenu à jour à chaque écriture du DPGF (dxWrite) : une composante nouvellement pointée ou dont le
//   changement est réglé prend l'état du moment ; celle dont le changement reste à traiter garde l'ancien. Un DPGF pointé avant ce lot : l'état du jour devient la
//   référence à la 1re ouverture (seul le sur-pointage réel est signalé). Changements : en moins (sur-pointé), en plus (à imputer), poste au ml / au forfait (« refaire
//   la balance »), prix seul, supprimée, sur-pointé ; chaque action réécrit les liens ET les PU, en un seul ↶, et les cellules retouchées s'allument dans la grille.
// Tout ce que dpgfxl.js prête passe par init() (aucun import circulaire) ; dpgfrep.js et dpgfclair.js importent les petites fonctions de clés et de groupes.
// · 16/10 nuit (lot DK, dpgfrecap.js par X.RC) : élément « ligne sans part » (kind 'part', après les changements ; « ✓ Rien à faire » → suivi.ok['part:<id du lien>'],
//   « Tout traiter » ne le traite pas) ; actions give (donner sa part), multi (« en plus » sur les lignes cochées), rebal (balance sur les lignes cochées) dans run().
import {addrOf,parseAddr} from './xlcalc.js';
let X=null;export function init(api){X=api;}
const esc=s=>String(s??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const nb=(x,d)=>{x=+x||0;return x.toLocaleString('fr-FR',{maximumFractionDigits:d===undefined?0:d,minimumFractionDigits:d===undefined?0:d});};
const eur=(x,d)=>nb(x,d)+' €';const r2=x=>Math.round((+x||0)*100)/100;const r3=x=>Math.round((+x||0)*1000)/1000;const up=s=>String(s||'').toUpperCase();
const fq=x=>nb(x,Math.abs(x-Math.round(x))>1e-9?(Math.abs(x*100-Math.round(x*100))>1e-6?3:2):0);const fin=x=>String(+(+x).toFixed(3)).replace('.',',');
const numIn=s=>{s=String(s??'').trim().replace(/[\s  ]/g,'').replace(',','.');if(!s)return null;const x=parseFloat(s);return isFinite(x)?x:null;};
const enc=s=>encodeURIComponent(String(s));const dec=s=>{try{return decodeURIComponent(String(s||''));}catch(e){return String(s||'');}};
const docOK=()=>typeof document!=='undefined';
const INST=['amene','conteneur','decharg','transfert','doe','frais']; /* = INST_KEYS de prix.js (ce que l'onglet Installations chiffre) */
const SS={open:{},pick:{},busy:{},st:0,ft:0};
/* ═════════ 1 · PLIS (mémorisés sur l'appareil) ═════════ */
const LS_PLIS='trace:dpgf:plis';let PL=null;
const plis=()=>{if(PL)return PL;PL={};try{const s=localStorage.getItem(LS_PLIS);if(s)PL=JSON.parse(s)||{};}catch(e){PL={};}return PL;};
const isPli=(num,k)=>!!plis()[num+'|'+k];
function setPli(num,k,on){const P=plis();if(on)P[num+'|'+k]=1;else delete P[num+'|'+k];try{localStorage.setItem(LS_PLIS,JSON.stringify(P));}catch(e){}}
/* ═════════ 2 · CLÉS STABLES ═════════ */
const ZT=(z,i)=>z&&z.id?'z:'+String(z.id).replace(/[|#\s"'<>&]/g,'_'):'z'+i;
const slug=s=>String(s??'').normalize('NFD').replace(/[̀-ͯ]/g,'').toLowerCase().replace(/[^a-z0-9]+/g,'_').replace(/^_+|_+$/g,'').slice(0,32)||'x';
const RP=['vpi','sst','racc','extrusion','paniers'];
const sigRow=(p,x)=>p==='paniers'?(x.id?'p'+slug(x.id):'n'+slug(x.nom)):'d'+(+x.dn||0)+(p==='vpi'?'':'.'+slug(x.type)+(x.type==='autre'&&x.des?'.'+slug(x.des):''));
export const alOf=a=>{const S=((a&&a.dpgf)||{}).suivi;return S&&S.al?S.al:null;};
/* compsOf (dpgfxl.js) : c.ok = l'ancienne clé (index), c.k = la clé stable ; CP.by donne les deux (et les anciennes clés figées par suivi.al) */
export function stable(R,a){const C=R.C;const tok=C.etudes.map((e,i)=>ZT(e.z,i));const rm=new Map();
  C.etudes.forEach((e,ei)=>{const DT=(e.r&&e.r.detail)||{};RP.forEach(p=>{const all=((DT[p]||{}).rows||[]);const n={};const sg=all.map(x=>{const s=sigRow(p,x||{});n[s]=(n[s]||0)+1;return s+(n[s]>1?'.'+n[s]:'');});
    if(p==='paniers')all.forEach((x,i)=>rm.set(ei+'|'+p+'|r'+i,sg[i]));else all.map((x,j)=>[x,j]).filter(([x])=>x&&(+x.q||0)>0).forEach(([x,j],i)=>rm.set(ei+'|'+p+'|r'+(x.idx!==undefined?x.idx:i),sg[j]));});});
  const by=new Map();R.list.forEach(c=>{const ok=c.k;const part=ok.split('|').slice(2).join('|');const np=/^r\d+$/.test(part)?(rm.get(c.z+'|'+c.p+'|'+part)||part):part;c.ok=ok;c.k=(c.z<0?'inst':tok[c.z])+'|'+c.p+(np?'|'+np:'');by.set(c.k,c);});
  R.list.forEach(c=>{if(c.ok!==c.k&&!by.has(c.ok))by.set(c.ok,c);});
  const al=alOf(a);if(al)Object.keys(al).forEach(o=>{const c0=by.get(o);if(c0&&c0.k===o)return; /* jamais une clé stable */const c=by.get(al[o]);if(c&&c.k===al[o])by.set(o,c);else by.delete(o);});
  R.by=by;R.tok=tok;return R;}
export const ck=(CP,k)=>{const c=CP&&CP.by.get(k);return c?c.k:k;};
export const ckeys=(CP,L)=>(L||[]).map(s=>{s=String(s);const i=s.indexOf('#');return i<0?ck(CP,s):ck(CP,s.slice(0,i))+s.slice(i);});
export const canonComps=(comps,CP)=>(comps||[]).map(x=>{const c=CP&&CP.by.get(x.k);return c&&c.k!==x.k?Object.assign({},x,{k:c.k}):x;});
export function canonRep(R,CP){if(!R||!CP)return R;R.ks=[...new Set(ckeys(CP,R.ks||[]))];if(R.qs){const q={};Object.keys(R.qs).forEach(k=>{q[ck(CP,k)]=R.qs[k];});R.qs=q;}return R;}
export function canonCfg(cfg,CP){if(!CP||!cfg)return cfg;const m=o=>{const r={};Object.keys(o||{}).forEach(k=>{r[ck(CP,k)]=o[k];});return r;};cfg.ks=m(cfg.ks);cfg.qs=m(cfg.qs);return cfg;}
/* les anciennes clés en usage (liens, répartitions, sélections) → leur composante d'aujourd'hui, figées */
function freeze(D,CP){const al={};const see=k=>{k=String(k||'');if(!/^z\d+\|/.test(k)&&!/\|r\d+$/.test(k))return;const c=CP.by.get(k);if(c&&c.k!==k)al[k]=c.k;};
  (D.liens||[]).forEach(L=>(L.comps||[]).forEach(x=>see(x.k)));(D.reps||[]).forEach(R=>{(R.ks||[]).forEach(see);Object.keys(R.qs||{}).forEach(see);});(D.sels||[]).forEach(S=>(S.ks||[]).forEach(k=>see(String(k).split('#')[0])));
  return Object.keys(al).length?al:null;}
/* ═════════ 3 · LE SUIVI : ce qui a changé depuis le pointage ═════════ */
const TQ=Q=>Math.max(0.001,Math.abs(+Q||0)*1e-7);
const sigOf=(Q,A,P)=>r3(Q)+'|'+r2(A)+'|'+r3(P);
function refOf(S,c){if(!S||!S.q)return null;const k=S.q[c.k]!==undefined?c.k:(c.ok&&S.q[c.ok]!==undefined?c.ok:null);return k===null?null:{q:+S.q[k]||0,m:+((S.m||{})[k])||0};}
const deadOf=(a,k)=>{const al=alOf(a);return al&&al[k]?al[k]:k;};
/* pointé par composante (clé stable) ; les clés qui ne mènent plus à rien (composante supprimée) à part */
function ptOf(a,CP){const P=new Map(),O=new Map();((a.dpgf||{}).liens||[]).forEach(L=>(L.comps||[]).forEach(x=>{const q=+x.q||0;if(!(q>0))return;const c=CP.by.get(x.k);
  if(c){let o=P.get(c.k);if(!o)P.set(c.k,o={P:0,ids:new Set(),W:0,X:{}});o.P+=q;o.ids.add(L.id);if(x.sub&&!x.rep)o.X[x.sub]=(o.X[x.sub]||0)+(+x.x||0);else o.W+=q;return;} /* W : pris en entier ; X : manchons pris par type d'autocontrôle */const t=deadOf(a,x.k);let o=O.get(t);if(!o)O.set(t,o={P:0,ids:new Set(),raw:new Set()});o.P+=q;o.ids.add(L.id);o.raw.add(x.k);}));return {P,O};}
export const isInst=c=>!!c&&(c.z<0||INST.includes(c.p));
/* la liste : une ligne par composante changée (pointée), avec ce qu'il reste à faire ; vide = rien à traiter */
export function itemsOf(a,CP,M,noOk){const D=a.dpgf||{};const S=D.suivi||null;const ok=(!noOk&&S&&S.ok)||{};const PT=ptOf(a,CP);const byId=new Map((D.liens||[]).map(L=>[L.id,L]));const its=[];
  PT.P.forEach((o,k)=>{const c=CP.by.get(k);const ref=refOf(S,c);const Q=c.qty,A=c.amtV,t=TQ(Q);const dq=ref?Q-ref.q:0,dA=ref?A-ref.m:0;
    /* autocontrôle pris par type (lot C2) : chaque type couvre au plus les manchons du DN — le type le plus pris compte (les prises du DN entier couvrent tous les types) */
    const sub=Object.keys(o.X).length>0;const Tm=sub?Math.max(...Object.values(o.X))+o.W:0;const over=Math.max(o.P-Q,sub?Tm-Q:-1);
    const lines=[...o.ids].map(id=>byId.get(id)).filter(Boolean);let stl=null;const st=()=>stl||(stl=M?lines.filter(L=>X.linkNow(L,CP,M).stale):[]);
    const whole=c.u==='ml'||c.u==='%';let kind=null,imp=0;
    if(ref&&(Math.abs(dq)>t||Math.abs(dA)>0.01)){if(whole){if(Math.abs(dq)>t||over>t||st().length)kind='bal';}
      else if(dq<-t&&over>t)kind='moins';else if(dq>t&&(imp=Math.max(0,Math.min(dq,Q-(sub?Tm:o.P))))>t)kind='plus';else if(over>t)kind='over';else if(st().length)kind='prix';}
    else if(over>t)kind='over';
    if(!kind||(ok[k]&&ok[k]===sigOf(Q,A,o.P)))return;
    its.push({k,c,kind,Q,A,P:o.P,ref,dq,dA,over:Math.max(0,over),imp,lines,sub,fT:sub&&Tm-Q>t&&Tm>0?Q/Tm:0});});
  PT.O.forEach((o,k)=>{if(ok[k]&&ok[k]==='del|'+r3(o.P))return;its.push({k,c:null,kind:'del',P:o.P,raw:[...o.raw],lines:[...o.ids].map(id=>byId.get(id)).filter(Boolean)});});
  if(X.RC)X.RC.partItems(a,CP,M,ok).forEach(it=>its.push(it)); /* 16/10 nuit (lot DK) : « ligne sans part » des postes répartis (dpgfrecap.js), après les changements */
  if(X.ZN)X.ZN.items(a,CP,M,ok).forEach(it=>its.push(it)); /* 17/10 (lot DZ) : installations — ventilation par zone à refaire / changée (dpgfzone.js), en tête */
  if(X.CO)X.CO.items(a,CP,M,its); /* 19/10 (lot DY) : des ml en plus au chiffrage, lignes du DPGF inchangées → « laisser à placer » d'office (it.def) */
  const rank=it=>it.rk!==undefined?it.rk:it.c?(isInst(it.c)?0:1)*1e7+(it.c.z<0?0:it.c.z+1)*1e4+CP.list.indexOf(it.c):9e9;return its.sort((x,y)=>rank(x)-rank(y));}
/* l'état du jour des composantes pointées (1re ouverture d'un DPGF pointé avant ce lot, ou 1er pointage) */
function snapAll(a,CP){const PT=ptOf(a,CP);const S={v:CP.v,at:new Date().toISOString(),q:{},m:{}};PT.P.forEach((o,k)=>{const c=CP.by.get(k);S.q[k]=r3(c.qty);S.m[k]=r2(c.amtV);});const al=freeze(a.dpgf||{},CP);if(al)S.al=al;return S;}
/* à chaque écriture du DPGF (dxWrite, juste avant l'enregistrement) : opt.sv = {clé: 'ref' | 'ok'} (traitées par la liste) */
export function onWrite(a,D,opt){try{const S0=D.suivi||null;if(!(D.liens||[]).length&&!S0)return;const CP=X.compsOf(a);if(!CP)return;
  const a2=Object.assign({},a,{dpgf:D});let M2=null;try{M2=X.modelOf(a2);}catch(e){M2=null;}
  const S=S0?Object.assign({},S0,{q:Object.assign({},S0.q||{}),m:Object.assign({},S0.m||{})}):{v:CP.v,at:'',q:{},m:{}};if(!S0){const al=freeze(D,CP);if(al)S.al=al;}
  const sv=(opt&&opt.sv)||{};const PT=ptOf(a2,CP);const todo=new Set(itemsOf(a2,CP,M2,true).map(x=>x.k));
  PT.P.forEach((o,k)=>{const c=CP.by.get(k);const r=refOf(S,c);if(r&&c.ok&&c.ok!==k&&S.q[c.ok]!==undefined){S.q[k]=r.q;S.m[k]=r.m;delete S.q[c.ok];delete S.m[c.ok];} /* référence prise sous l'ancienne clé : passe à la clé stable */
    if(!r||!todo.has(k)||sv[k]){S.q[k]=r3(c.qty);S.m[k]=r2(c.amtV);}});
  Object.keys(S.q).forEach(k=>{const c=CP.by.get(k);if(!c||!PT.P.has(c.k)){delete S.q[k];delete S.m[k];}});
  const ok=Object.assign({},(S0&&S0.ok)||{});Object.keys(sv).forEach(k=>{if(sv[k]!=='ok')return;if(/^part:/.test(k)){const g=X.RC&&M2?X.RC.partSig(a2,CP,M2,k):null;if(g)ok[k]=g;return;} /* 16/10 nuit (lot DK) : « ligne sans part » marquée « rien à faire » */const o=PT.P.get(k);if(o){const c=CP.by.get(k);ok[k]=sigOf(c.qty,c.amtV,o.P);}else{const d=PT.O.get(k);if(d)ok[k]='del|'+r3(d.P);}});
  Object.keys(ok).forEach(k=>{if(/^part:/.test(k)){if(X.RC&&M2&&X.RC.partSig(a2,CP,M2,k)!==ok[k])delete ok[k];return;} /* (lot DK) la case revient si la ligne ou les postes répartis changent */const o=PT.P.get(k);if(o){const c=CP.by.get(k);if(ok[k]!==sigOf(c.qty,c.amtV,o.P))delete ok[k];}else{const d=PT.O.get(k);if(!d||ok[k]!=='del|'+r3(d.P))delete ok[k];}});
  if(X.ZN&&M2)X.ZN.onWrite(a,a2,CP,M2,S,S0,ok,sv); /* 17/10 (lot DZ) : la référence de la ventilation par zone (suivi.vz), « ✓ Rien à faire » */
  if(Object.keys(ok).length)S.ok=ok;else delete S.ok;S.v=CP.v;S.at=new Date().toISOString();D.suivi=S;}catch(e){console.warn(e);}}
/* 1re ouverture (modifiable, pas en consultation) : un id sur les zones qui n'en ont pas, puis l'état du jour comme référence — écritures différées, une fois */
const newId=()=>'E'+Date.now().toString(36)+Math.random().toString(36).slice(2,5);
function ensureInit(a,canEdit){if(!canEdit||a._vview||SS.busy[a.num])return;const E=((a.chiffrage||{}).etudes)||[];const D=a.dpgf||{};if(!E.some(z=>z&&!z.id)&&(D.suivi||!(D.liens||[]).length))return;SS.busy[a.num]=1;
  setTimeout(()=>{SS.busy[a.num]=0;const a2=X.affOf(a.num);if(!a2||a2._vview||!X.XS.canEdit)return;const H=X.H();const ch=a2.chiffrage||{};
    if((ch.etudes||[]).some(z=>z&&!z.id)){H.affSet(a.num,{chiffrage:Object.assign({},ch,{etudes:ch.etudes.map(z=>z&&!z.id?Object.assign({},z,{id:newId()}):z)})});X.rerender();return;}
    const D2=a2.dpgf||{};if(D2.suivi||!(D2.liens||[]).length)return;const CP=X.compsOf(a2);if(!CP)return;H.affSet(a.num,{dpgf:Object.assign({},D2,{suivi:snapAll(a2,CP)})});X.rerender();},0);}
/* ═════════ 4 · LES ACTIONS : réécrire les liens et les PU (un seul ↶) ═════════ */
export function splitQ(q,ws){const U=1000;const tot=Math.round(q*U);const raw=ws.map(w=>w*tot);const fl=raw.map(Math.floor);let rem=tot-fl.reduce((s,x)=>s+x,0);raw.map((x,i)=>[x-fl[i],i]).sort((p,q2)=>q2[0]-p[0]).forEach(([,i])=>{if(rem>0){fl[i]++;rem--;}});return fl.map(x=>x/U);}
export const kOf=(CP,x)=>{const c=CP.by.get(x.k);return c?c.k:null;};
export const tOf=(CP,L,k)=>(L.comps||[]).reduce((s,x)=>s+(kOf(CP,x)===k?(+x.q||0):0),0);
/* une ligne : sa part de la composante k passe de T à T2 (ses morceaux gardent leurs proportions : saisie, parts de répartition, types d'autocontrôle) */
export function scaleLine(CP,L,k,T,T2){const E=L.comps.filter(x=>kOf(CP,x)===k);if(!(T>0)){if(T2>1e-9)L.comps.push({k,q:r3(T2)});return;}const f=T2/T;let qs=0;
  const sub=E.filter(x=>x.sub&&!x.rep),oth=E.filter(x=>!(x.sub&&!x.rep));sub.forEach(x=>{const r=X.CL.ratioOf(CP,k,x.sub);x.x=r3((+x.x||0)*f);x.q=x.x*r;qs+=x.q;});
  if(oth.length){const W=oth.reduce((s,x)=>s+(+x.q||0),0);const sp=splitQ(Math.max(0,T2-qs),oth.map(x=>W>0?(+x.q||0)/W:1/oth.length));oth.forEach((x,i)=>{x.q=sp[i];});}
  L.comps=L.comps.filter(x=>!E.includes(x)||(x.sub&&!x.rep?(+x.x||0)>0&&(+x.q||0)>0:(+x.q||0)>0));}
/* ce que fait l'action par défaut : par ligne, la quantité gardée (« au prorata », « refaire la balance ») */
export function targets(CP,it,act,W){const ls=it.lines.map(L0=>{const L=W?W.find(x=>x.id===L0.id)||L0:L0;return {id:L0.id,t:tOf(CP,L,it.k)};}).filter(x=>x.t>0);const P=ls.reduce((s,x)=>s+x.t,0);if(!ls.length)return ls;
  const G=act==='bal'?(it.ref&&it.ref.q>0?P*it.Q/it.ref.q:P):it.sub?P*(it.ref&&it.ref.q>0&&Math.abs(it.dq)>TQ(it.Q)?it.Q/it.ref.q:(it.fT||1)) /* par type : tout à la même échelle */:it.kind==='plus'?P+it.imp:Math.min(P,it.Q);const sp=splitQ(Math.max(0,G),ls.map(x=>x.t/P));ls.forEach((x,i)=>{x.tg=sp[i];});return ls;}
export const DEF={moins:'pro',over:'pro',plus:'pro',bal:'bal',prix:'apply',del:'del',part:'give',vz:'revent',vzgap:'revent'}; /* (lot DZ) vz / vzgap : reventiler les installations par zone (dpgfzone.js) */ /* (lot DK) part : la ligne reçoit sa part (dpgfrecap.js) */
export const labOf=(a,M)=>{if(X.CO&&M)return X.CO.labFn(a,M); /* 19/10 (lot DY) : le n° de la ligne, lu même sur un DPGF mal lu à l'import */const D=a.dpgf||{};const S=M?X.dpSheet(M,D):null;const byRow=new Map((D.lignes||[]).filter(l=>!l.section&&l.row).map(l=>[l.row,l.n||'']));return L=>{const p=parseAddr(L.a||'');const n=p&&S&&up(L.sh)===up(S.name)?byRow.get(p.r):'';return n||L.a;};};
/* todo = [{it, act, arg}] → nouveaux liens, cellules PU à écrire, avant → après (aperçu), suivi des clés traitées */
export function run(a,CP,M,todo){const D=a.dpgf||{};const W=(D.liens||[]).slice();const ix=new Map(W.map((L,i)=>[L.id,i]));const sv={};const now=new Date().toISOString();const H=X.H();const by=H&&H.A&&H.A.userName?H.A.userName():'';const msg=[];
  const ed=id=>{const i=ix.get(id);if(i===undefined)return null;if(!W[i]._c)W[i]=Object.assign({},W[i],{comps:(W[i].comps||[]).map(x=>Object.assign({},x)),_c:1});return W[i];};
  todo.forEach(({it,act,arg})=>{const k=it.k;if(act==='ok'){sv[k]='ok';return;}sv[k]='ref';
    if(X.ZN&&X.ZN.runAct(a,CP,M,it,act,arg,{W,ix,ed,D,now,by,msg}))return; /* 17/10 (lot DZ) : reventiler les installations par zone (revent) */
    if(X.RC&&X.RC.runAct(a,CP,M,it,act,arg,{W,ix,ed,D,now,by,msg}))return; /* 16/10 nuit (lot DK) : donner sa part (give), mettre / refaire la balance sur les lignes cochées (multi, rebal) */
    if(act==='del'){it.lines.forEach(L0=>{const L=ed(L0.id);if(L)L.comps=L.comps.filter(x=>!it.raw.includes(x.k));});return;}
    if(act==='apply'||act==='keep'){it.lines.forEach(L0=>ed(L0.id));return;}
    if(act==='one'){const imp=it.imp>0?it.imp:Math.max(0,it.Q-it.P);const v=String(arg||'');let L=null;
      if(/^L:/.test(v))L=ed(v.slice(2));else if(/^R:/.test(v)){const row=+v.slice(2);const S=M&&X.dpSheet(M,D);const l=X.CO&&S?X.CO.lineAt(a,M,S,row):(D.lignes||[]).find(x=>!x.section&&x.row===row); /* (lot DY) */
        if(l&&S){const pa=addrOf(row,X.CO?X.CO.puCol(a,M):X.puColOf(D));const L0=W.find(x=>up(x.sh)===up(S.name)&&x.a===pa);if(L0)L=ed(L0.id);else{const qc=X.CO?X.CO.qtyCol(a,M):X.qtyColOf(D); /* (lot DY) */const qa=qc?addrOf(row,qc):null;const qv=qa?X.qOfCell(M,S.name,qa):null;const q=qv!==null&&qv>0?qv:(+l.qte||0);
          if(!(q>0)){msg.push('la ligne '+(l.n||pa)+' n\'a pas de quantité');return;}L={id:'L'+Date.now().toString(36)+Math.random().toString(36).slice(2,5),sh:S.name,a:pa,qa,q,qfix:false,u:l.u||'',comps:[],pu:0,amt:0,v:CP.v,at:now,by,col:X.nextCol({liens:W}),_c:1};W.push(L);ix.set(L.id,W.length-1);}}}
      if(!L){if(!msg.length)msg.push('choisis une ligne');return;}const d=L.comps.find(x=>!x.rep&&!x.sub&&kOf(CP,x)===k);if(d)d.q=r3((+d.q||0)+imp);else L.comps.push({k,q:r3(imp)});it.lines.forEach(L0=>ed(L0.id));return;}
    let ls;if(act==='pick'){ls=it.lines.map(L0=>({id:L0.id,t:tOf(CP,W[ix.get(L0.id)],k)})).filter(x=>x.t>0);ls.forEach(x=>{x.tg=Math.max(0,r3(x.t-(+((arg||{})[x.id])||0)));});}else ls=targets(CP,it,act,W);
    ls.forEach(x=>scaleLine(CP,ed(x.id),k,x.t,x.tg));it.lines.forEach(L0=>ed(L0.id)); /* le prix de la composante a pu changer : toutes ses lignes */});
  const vals=[],chg=[],out=[];const lab=labOf(a,M);
  W.forEach(L=>{if(!L._c){out.push(L);return;}delete L._c;L.comps=L.comps.filter(x=>(+x.q||0)>0).map(x=>{const c=CP.by.get(x.k);return c&&c.k!==x.k?Object.assign({},x,{k:c.k}):x;});const p=parseAddr(L.a);const old=M?X.qOfCell(M,L.sh,L.a):null;
    if(!L.comps.length){if(p)vals.push({sh:L.sh,r:p.r,c:p.c,e:L.rep&&L.prev&&L.prev.e?L.prev.e:null});chg.push({id:L.id,lab:lab(L),old,neu:null,r:p?p.r:0,gone:true});return;}
    const Xn=X.linkNow(L,CP,M);if(p)vals.push({sh:L.sh,r:p.r,c:p.c,e:{v:Xn.pur}});Object.assign(L,{pu:Xn.pur,amt:r2(Xn.amt),v:CP.v,at:now});out.push(L);chg.push({id:L.id,lab:lab(L),old,neu:Xn.pur,r:p?p.r:0});});
  chg.sort((x,y)=>x.r-y.r);return {W:out,vals,chg,sv,msg};}
export const moved=ch=>ch.filter(x=>x.neu===null||x.old===null||Math.abs(x.neu-x.old)>=0.005);
/* les cellules retouchées s'allument dans la grille (ici et sur l'autre écran) : une feuille de style éphémère (la grille se redessine en défilant) */
export function flash(ids){if(!docOK()||!ids.length)return;const sel=ids.map(id=>CSS.escape(id));const css=`#dx-vp td[data-lk]:is(${sel.map(s=>`[data-lk="${s}"]`).join(',')}){outline:3px solid #f59e0b!important;outline-offset:-3px;animation:c3hl .55s ease-in-out 0s 6 alternate}#dx-vp th .dx-dot:is(${sel.map(s=>`[data-lk="${s}"]`).join(',')}){box-shadow:0 0 0 3px #f59e0b}@keyframes c3hl{from{outline-color:#f59e0b}to{outline-color:rgba(245,158,11,.15)}}`;
  const docs=[document];if(X.popLive())try{docs.push(X.XS.pop.w.document);}catch(e){}docs.forEach(d=>{let s=d.getElementById('c3-flash');if(!s){s=d.createElement('style');s.id='c3-flash';d.head.appendChild(s);}s.textContent=css;});
  clearTimeout(SS.ft);SS.ft=setTimeout(()=>{docs.forEach(d=>{try{const s=d.getElementById('c3-flash');if(s)s.textContent='';}catch(e){}});},9000);}
/* ═════════ 5 · LA LISTE (fenêtre) ET LE BANDEAU ═════════ */
const UW={'soud.':['soudure','soudures',1],'manch.':['manchon','manchons',0],'paire':['paire','paires',1],'vanne':['vanne','vannes',1],'u':['u','u',0],'ml':['ml','ml',0],'%':['%','%',0]};
export const uw=(u,q)=>{const w=UW[u]||[u,u,0];return Math.abs(q)<=1+1e-9?w[0]:w[1];};export const qn=(q,u)=>fq(q)+' '+uw(u,q);const ptd=u=>(UW[u]||[])[2]?'pointées':'pointés';
const DNP={soudure:'Soudure',manchons:'Manchons',autoctrl:'Autocontrôle'};
function keyName(CP,k){const m=/^(inst|z:[^|]+|z\d+)\|([^|]+)(?:\|(.+))?$/.exec(k)||[];const zt=m[1]||'',p=m[2]||'',part=m[3]||'';let zn='';
  if(zt==='inst')zn='Installations';else if(/^z\d+$/.test(zt)){const z=CP.zones[+zt.slice(1)];zn=z?z.nom:'zone supprimée';}else{const i=(CP.tok||[]).indexOf(zt);zn=i>=0?CP.zones[i].nom:'zone supprimée';}
  const P=(CP.postes||[]).find(x=>x.k===p);let det='';if(/^dn\d+$/.test(part))det='DN '+part.slice(2);else if(/^d\d+/.test(part)){const s=part.split('.');det='DN '+s[0].slice(1)+(s[1]?' · '+s[1].replace(/^(sst|racc)_/,'').replace(/_/g,' '):'');}
  else if(/^r\d+$/.test(part))det='ligne '+(+part.slice(1)+1);else if(part)det=part.replace(/^[pn]/,'').replace(/_/g,' ');return {nm:(P?P.label:p||k)+(det?' '+det:''),zn};}
const nameOf=(CP,it)=>it.nm!==undefined?{nm:it.nm,zn:it.zn||''} /* (lot DK) « ligne sans part » */:it.c?{nm:it.c.dn&&DNP[it.c.p]?DNP[it.c.p]+' DN '+it.c.dn:it.c.pl+(it.c.lab?' '+it.c.lab:''),zn:it.c.zn}:keyName(CP,it.k);
const lnList=(it,lab)=>{const L=it.lines.map(x=>({t:lab(x),r:(parseAddr(x.a||'')||{}).r||0})).sort((x,y)=>x.r-y.r).map(x=>x.t);return esc(L.slice(0,8).join(', ')+(L.length>8?' +'+(L.length-8):''));};
function phrase(it,lab){const u=it.c?it.c.u:'';const n=it.lines.length;const L=lnList(it,lab);if(it.def==='keep'&&X.CO)return X.CO.balPhrase(it,L); /* 19/10 (lot DY) : des ml en plus, laissés à placer */
  switch(it.kind){case 'moins':return `<b class="c3-m">${esc(qn(-it.dq,u))} EN MOINS</b> (${fq(it.ref.q)} → ${fq(it.Q)}) — ${ptd(u)} sur ${L} : <b class="c3-bad">sur-pointé de ${fq(it.over)}</b>`;
    case 'plus':return `<b class="c3-p">${esc(qn(it.dq,u))} EN PLUS</b> (${fq(it.ref.q)} → ${fq(it.Q)}) — ${ptd(u)} sur ${L} : <b>${fq(it.imp)} à imputer</b>`;
    case 'bal':return `${Math.abs(it.dq)>TQ(it.Q)?`${fq(it.ref.q)} → ${fq(it.Q)} ${esc(u)}, `:''}montant ${Math.abs(it.dA)>0.01?eur(it.ref.m)+' → '+eur(it.A):eur(it.A)+' (inchangé)'} — ${n>1?'réparti sur '+n+' lignes ('+L+')':'pointé sur '+L}${it.over>TQ(it.Q)?` · <b class="c3-bad">sur-pointé de ${fq(it.over)} ${esc(u)}</b>`:''}`;
    case 'prix':return `prix : ${nb(it.ref.q?it.ref.m/it.ref.q:0,2)} → ${nb(it.Q?it.A/it.Q:0,2)} € / ${esc(uw(u,1))} — ${n} ligne${n>1?'s':''} (${L})`;
    case 'over':return `pointé ${fq(it.P)} pour ${esc(qn(it.Q,u))} — <b class="c3-bad">sur-pointé de ${fq(it.over)}</b> (${L})`;
    case 'del':return `<b class="c3-bad">supprimée du chiffrage</b> — pointée sur ${L}`;
    case 'part':return X.RC?X.RC.phrase(it):'';case 'vz':case 'vzgap':return X.ZN?X.ZN.phrase(it):'';}return '';} /* (lot DK) ; (lot DZ) vz, vzgap */
const KIND={vz:['⇄','#0e7490','Installations par zone'],vzgap:['⇄','#0e7490','Installations par zone'] /* (lot DZ) */,moins:['▼','#b91c1c','En moins'],plus:['▲','#1d4ed8','En plus'],bal:['⇶','#7c3aed','Au ml / forfait'],prix:['€','#b45309','Prix'],over:['⚠','#b91c1c','Sur-pointé'],del:['✕','#6b7280','Supprimée'],part:['⇶','#0f766e','Ligne sans part']};
const short=(CP,it)=>{if(it.kind==='part'||it.solo)return it.short; /* (lot DK) */const {nm}=nameOf(CP,it);const u=it.c?it.c.u:'';return it.kind==='moins'?nm+' : '+qn(-it.dq,u)+' en moins':it.kind==='plus'?nm+' : '+qn(it.dq,u)+' en plus':it.kind==='del'?nm+' supprimée':it.kind==='over'?nm+' : sur-pointé':it.kind==='bal'?nm+' : à rééquilibrer':nm+' : nouveau prix';};
export function puHTML(ch){const m=moved(ch);return m.length?`<div class="c3-pu"><span class="c3-pul">PU qui changent :</span> ${m.map(x=>`<span class="c3-puc"><b>${esc(x.lab)}</b> ${x.old===null?'vide':nb(x.old,2)} → ${x.neu===null?'<i>vide (lien retiré)</i>':'<b>'+nb(x.neu,2)+' €</b>'}</span>`).join('')}</div>`:'<div class="c3-pu dim">PU : aucun ne change</div>';}
function itemHTML(a,CP,M,it,ro,lab){const k=it.k;const {nm,zn}=nameOf(CP,it);const K=KIND[it.kind];const u=it.c?it.c.u:'';const n=it.lines.length;
  const R=run(a,CP,M,[{it,act:it.def||DEF[it.kind]}]);const B=(act,lbl,cls,tip)=>`<button class="btn sm${cls?' '+cls:''}" data-act="af" data-v="dxc3do|${enc(k)}|${act}"${tip?` title="${esc(tip)}"`:''}>${esc(lbl)}</button>`;
  const okB=B('ok','✓ Rien à faire','','Marquer traité sans rien changer');let acts='';
  if(!ro){if(it.kind==='moins'||it.kind==='over')acts=B('pro','Retirer au prorata des lignes','primary','Chaque ligne perd sa part (au prorata de ce qu\'elle a)')+(it.sub?'':`<button class="btn sm${SS.pick[a.num]===k?' on':''}" data-act="af" data-v="dxc3pick|${enc(k)}" title="Un champ par ligne : la somme doit faire le retrait">Choisir ligne par ligne…</button>`)+okB;
    else if(it.kind==='plus'){const D=a.dpgf||{};const S=M?X.dpSheet(M,D):null;const mine=new Set(it.lines.map(L=>L.id));const opts=it.lines.map(L=>({v:'L:'+L.id,t:lab(L)+' · déjà '+fq(tOf(CP,L,k))+' '+uw(u,2),r:(parseAddr(L.a)||{}).r||0,s:tOf(CP,L,k)})).sort((x,y)=>y.s-x.s);
      const others=S?(X.CO?X.CO.lines(a,M):(D.lignes||[]).filter(l=>!l.section&&l.row)).filter(l=>l.row&&!(D.liens||[]).some(L=>mine.has(L.id)&&up(L.sh)===up(S.name)&&(parseAddr(L.a)||{}).r===l.row)).map(l=>({v:'R:'+l.row,t:(l.n?l.n+' · ':'')+String(l.des||'').slice(0,56)})):[];
      acts=B('pro','Ajouter au prorata des lignes déjà pointées','primary')+`<span class="c3-one"><label>Sur une ligne : <select data-c3="one" data-k="${esc(k)}" aria-label="Ligne qui reçoit">${opts.map(o=>`<option value="${esc(o.v)}">${esc(o.t)}</option>`).join('')}${others.length?`<optgroup label="Autres lignes du DPGF">${others.map(o=>`<option value="${esc(o.v)}">${esc(o.t)}</option>`).join('')}</optgroup>`:''}</select></label>${B('one','Mettre')}</span>`+(X.RC?X.RC.multiBtn(a,it):'')+B('keep','Laisser dans le reste','','Plus tard : « ⇶ Mettre le reste au ml » ou le calculateur')+okB;} /* (lot DK) « Sur les lignes que je coche… » */
    else if(it.kind==='bal'&&it.def==='keep'&&X.CO)acts=X.CO.balActs(B,it,okB,X.RC?X.RC.multiBtn(a,it):''); /* 19/10 (lot DY) : « Laisser à placer pour les nouvelles lignes » d'office */
    else if(it.kind==='bal')acts=B('bal','↻ Refaire la balance sur '+(n>1?'les '+n+' lignes':'la ligne'),'primary','Mêmes proportions qu\'avant, à la nouvelle quantité / au nouveau montant')+(X.RC?X.RC.multiBtn(a,it):'')+(it.dq>TQ(it.Q)?B('keep','Laisser dans le reste'):'')+okB;
    else if(it.kind==='prix')acts=B('apply','↻ Appliquer '+(n>1?'ces '+n+' lignes':'cette ligne'),'primary')+okB;
    else if(it.kind==='del')acts=B('del','Retirer des lignes','primary','Les lignes perdent ce qui venait de cette composante')+okB;
    else if(it.kind==='part')acts=(X.RC?X.RC.partBtn(a,it):'')+okB; /* (lot DK) « ⇶ Lui donner sa part » ouvre la fenêtre */
    else if(it.solo&&X.ZN)acts=X.ZN.actsHTML(B,okB);} /* (lot DZ) « ↻ Reventiler les installations par zone » */
  let pk='';if(!ro&&SS.pick[a.num]===k&&(it.kind==='moins'||it.kind==='over')){const ls=targets(CP,it,'pro');
    pk=`<div class="c3-pk" data-k="${esc(k)}" data-need="${r3(it.over)}"><div class="c3-pkh">Retirer ${esc(qn(it.over,u))} en tout :</div>${ls.map(x=>{const L=it.lines.find(y=>y.id===x.id);return `<label class="c3-pkr"><span><b>${esc(lab(L))}</b> <small>· ${fq(x.t)} ${esc(uw(u,x.t))}</small></span><span>retirer <input inputmode="decimal" data-c3="rm" data-k="${esc(k)}" data-l="${esc(x.id)}" data-max="${r3(x.t)}" value="${esc(fin(r3(x.t-x.tg)))}" aria-label="${esc('Retirer de '+lab(L))}"> ${esc(uw(u,2))}</span></label>`;}).join('')}<div class="c3-pks" data-c3="sum"></div>${B('pick','Retirer ces quantités','primary')}</div>`;}
  return `<div class="c3-it" data-k="${esc(k)}" style="--c3c:${K[1]}"><div class="c3-ih"><span class="c3-ik" title="${esc(K[2])}">${K[0]}</span><b class="c3-in">${esc(nm)}</b><span class="c3-iz">· ${esc(zn)}</span></div><div class="c3-is">${phrase(it,lab)}</div>${puHTML(R.chg)}${acts?`<div class="c3-acts">${acts}</div>`:''}${pk}${X.RC&&!ro?X.RC.multiHTML(a,CP,M,it,lab):'' /* (lot DK) les cases des lignes */}</div>`;}
function dlgHTML(a,M,canEdit){const CP=X.compsOf(a);if(!CP||!M)return '';const ro=!canEdit||!!a._vview;const its=itemsOf(a,CP,M);const lab=labOf(a,M);
  let all='';const itc=its.filter(it=>it.kind!=='part'&&!it.solo); /* (lot DZ) les installations par zone : leur propre bouton */ /* (lot DK) « Tout traiter » : les changements du chiffrage, pas les lignes sans part */if(itc.length&&!ro){const R=run(a,CP,M,itc.map(it=>({it,act:it.def||DEF[it.kind]})));const m=moved(R.chg); /* (lot DY) it.def : laisser à placer */
    all=`<div class="c3-all"><button class="btn primary" data-act="af" data-v="dxc3all|">Tout traiter au prorata</button><span class="c3-allt">Le choix le plus courant partout : en moins → retiré au prorata des lignes ; en plus → ajouté au prorata ; postes au ml ou au forfait → balance refaite ; nouveaux prix appliqués ; composantes supprimées retirées.${X.CO?X.CO.allTxt(itc):''} <b>${m.length} PU ${m.length>1?'changent':'change'}</b> · un seul ↶ pour revenir.</span>${m.length?`<details class="c3-alld"><summary>Voir les ${m.length} PU</summary>${puHTML(R.chg)}</details>`:''}</div>`;}
  const body=its.length?`${itc.length?`<p class="c3-intro">Le chiffrage a bougé depuis le pointage. Pour chaque composante : ce qui change, les lignes du DPGF où elle est pointée, et leurs PU (avant → après l'action proposée).</p>`:X.RC&&its.some(it=>it.kind==='part')?X.RC.introPart():''}${all}${X.CO?X.CO.keepAllHTML(a,its,ro):'' /* (lot DY) plusieurs installations : un seul bouton */}${its.map(it=>itemHTML(a,CP,M,it,ro,lab)).join('')}`:'<p class="c3-intro"><b style="color:#15803d">✓ Rien à traiter</b> : les lignes pointées suivent le chiffrage.</p>';
  if(docOK())setTimeout(()=>{const b=document.getElementById('c3-body');if(b&&SS.st){b.scrollTop=SS.st;SS.st=0;}document.querySelectorAll('#c3-dlg .c3-pk').forEach(sumPick);},0);
  return `<div class="rp-ov c3-ov" id="c3-ov"><div class="rp-dlg c3-dlg" id="c3-dlg" role="dialog" aria-modal="true" aria-label="Changements du chiffrage à traiter"><div class="rp-hd"><h3>Changements du chiffrage à traiter <span class="hint">· ${its.length}</span></h3><button class="btn sm" data-act="af" data-v="dxc3close|" aria-label="Fermer la liste">✕</button></div>
    <div class="rp-body" id="c3-body">${body}</div><div class="rp-ft">${ro?'<span class="hint">Lecture seule</span>':`<button class="btn sm" data-act="af" data-v="dxundo|" title="Annuler la dernière action sur le DPGF (Ctrl+Z)">↶ Annuler la dernière action</button>`}<span class="rp-btns"><button class="btn sm" data-act="af" data-v="dxc3close|">Fermer</button></span></div></div></div>`;}
/* « Choisir ligne par ligne » : la somme des retraits doit faire le sur-pointage */
function sumPick(box){if(!box)return;const need=+box.dataset.need||0;let s=0,bad=false;box.querySelectorAll('[data-c3="rm"]').forEach(i=>{const v=numIn(i.value);if(v===null||v<0||v>(+i.dataset.max||0)+1e-9){bad=true;i.classList.add('c3-err');}else{i.classList.remove('c3-err');s+=v;}});
  const d=need-s;const ok=!bad&&Math.abs(d)<0.0015;const t=box.querySelector('[data-c3="sum"]');if(t)t.innerHTML=ok?`<b style="color:#15803d">✓ ${fq(s)} / ${fq(need)}</b>`:bad?'<b class="c3-bad">un retrait dépasse ce que la ligne a</b>':`retiré ${fq(r3(s))} / ${fq(need)} — <b class="c3-bad">${d>0?'il manque '+fq(r3(d)):fq(r3(-d))+' de trop'}</b>`;
  const b=box.querySelector('[data-v^="dxc3do|"]');if(b)b.disabled=!ok;}
/* le bandeau, en haut de l'onglet (pas en consultation d'une version) */
export function topHTML(a,M,canEdit){if(!docOK())return '';css(document);wire();ensureInit(a,canEdit);if(X.ZN)X.ZN.ensure(a,M,canEdit); /* 17/10 (lot DZ) : référence de la ventilation par zone à la 1re ouverture */if(!M||a._vview)return '';const CP=X.compsOf(a);if(!CP)return '';const its=itemsOf(a,CP,M);if(!its.length)return '';
  const n=its.length;const allOver=its.every(x=>x.kind==='over'),allPart=its.every(x=>x.kind==='part') /* (lot DK) */;const sm=its.slice(0,3).map(it=>short(CP,it)).join(' · ')+(n>3?' · …':'');
  return `<div class="c3-band" id="c3-band" role="status"><span class="c3-bi" aria-hidden="true">⚠</span><span class="c3-bt"><b>${allPart?'Postes répartis':its.every(x=>x.solo)?'Installations par zone':allOver?'Pointé au-delà du chiffrage':'Le chiffrage a changé'}</b> : ${n} ${allPart?'ligne'+(n>1?'s':'')+' sans sa part':allOver?'composante'+(n>1?'s':'')+' à reprendre':'changement'+(n>1?'s':'')+' à traiter'}<span class="c3-bs">${esc(sm)}</span></span><button class="btn sm primary" data-act="af" data-v="dxc3list|">Voir la liste</button></div>`;}
/* le bouton flottant (seulement quand le calculateur n'est pas à l'écran), le rappel des changements (quand le bandeau n'est pas à l'écran), la fenêtre de la liste */
export function endHTML(a,M,canEdit){if(!docOK()||!M)return '';const fab=`<button type="button" class="c3-fab" data-act="af" data-v="dxc3calc|" title="Calculer le prix de la ligne sélectionnée : ouvre ou ramène le calculateur, sans remonter" aria-label="Calculer le prix de la ligne sélectionnée"><span aria-hidden="true">🧮</span> Calculer</button>`;
  let pill='';if(!a._vview){const CP=X.compsOf(a);const n=CP?itemsOf(a,CP,M).length:0;if(n)pill=`<button type="button" class="c3-fab2 c3-off" data-act="af" data-v="dxc3list|" title="Le chiffrage a changé depuis le pointage : voir la liste à traiter">⚠ ${n} changement${n>1?'s':''} à traiter</button>`;}
  setTimeout(fabSync,0);return `<div class="c3-fabs">${pill}${fab}</div>`+(SS.open[a.num]&&!a._vview?dlgHTML(a,M,canEdit):'');}
/* visible = au moins 40 px dans la fenêtre (le volet collé, le panneau de droite ou la page) */
function fabSync(){if(!docOK())return;const f=document.querySelector('#dx-card .c3-fab');if(!f)return;const vh=window.innerHeight||800;const vis=el=>{if(!el||!el.isConnected)return false;const r=el.getBoundingClientRect();return r.width>0&&r.bottom>40&&r.top<vh-40&&getComputedStyle(el).visibility!=='hidden';};
  const card=document.getElementById('dx-card');const inCard=!!card&&card.getBoundingClientRect().top<vh*0.5; /* on travaille dans le DPGF (pas en haut de la page, au-dessus) */
  f.classList.toggle('c3-off',!inCard||vis(document.querySelector('#dx-calc .c2-top')||document.querySelector('#dx-calc h4')));
  const p=document.querySelector('#dx-card .c3-fab2'),b=document.getElementById('c3-band');if(p)p.classList.toggle('c3-off',!b||b.getBoundingClientRect().bottom>40||!!document.getElementById('c3-ov')); /* seulement une fois le bandeau passé (défilé plus bas) */
  const ht=document.getElementById('homeTabs'),fs=f.parentElement;if(fs){const r=ht?ht.getBoundingClientRect():null;const off=r&&r.height>0&&r.top>vh*0.6&&r.top<vh?Math.round(vh-r.top):0;fs.style.bottom=off?(off+10)+'px':'';} /* au téléphone : au-dessus de la barre d'onglets du bas */}
let FR=0;const fabLater=()=>{if(FR)return;FR=requestAnimationFrame(()=>{FR=0;fabSync();});};
/* ═════════ 6 · LE CALCULATEUR : groupes repliables, installations en tête, puces ═════════ */
export function calcGroups(CP){const isA=c=>c.p==='autoctrl'&&c.z>=0&&!isInst(c);const I=CP.list.filter(isInst);
  return [{k:'inst',nom:'🏗 Installations',list:I.filter(c=>c.z<0).concat(I.filter(c=>c.z>=0))}].concat(CP.zones.map(z=>({k:(CP.tok&&CP.tok[z.i])||'z'+z.i,nom:z.nom,list:CP.list.filter(c=>c.z===z.i&&!isInst(c)&&!isA(c))})))
    .concat([{k:'auto',nom:'✔ Autocontrôles',list:CP.list.filter(isA)}]).filter(g=>g.list.length);}
/* un groupe (dpgfclair.js, listHTML) : en-tête collé qui replie, ses lignes (une étiquette de zone quand le groupe mêle les zones) */
export function grpHTML(g,rows,nOn,nD,flt,CP){const num=X.XS.num;const fold=!flt&&isPli(num,'c|'+g.k);const mix=g.k==='inst'||g.k==='auto';
  const H=r=>{let h=r.h;if(mix){const m=/data-k="([^"]*)"/.exec(h);const c=m&&CP.by.get(m[1].replace(/&amp;/g,'&'));if(c)h=h.replace('<span class="c2-nm">','<span class="c2-nm"><span class="c3-zt">'+esc(c.z<0?'Installations':c.zn)+'</span> ');}return `<div class="c3-ci">${h}</div>`;};
  return `<div class="c3-g${fold?' fold':''}" data-g="${esc(g.k)}"><div class="c2-zh c3-gh"><button class="c3-gt" data-act="af" data-v="dxc3fold|${enc(g.k)}" aria-expanded="${fold?'false':'true'}" title="${fold?'Déplier':'Replier'} « ${esc(g.nom)} »">${fold?'▸':'▾'} ${esc(g.nom)}</button><small>· ${eur(g.list.reduce((s,c)=>s+c.amtV,0))}${nOn?' · '+nOn+' cochée'+(nOn>1?'s':''):''}${nD?' · '+nD+' tout pointée'+(nD>1?'s':''):''}${fold?' · '+g.list.length+' replié'+(g.list.length>1?'es':'e'):''}</small></div><div class="c3-gb">${rows.filter(r=>!r.done).map(H).join('')}${rows.filter(r=>r.done).map(H).join('')}</div></div>`;}
export function chipsHTML(a,CP){const G=calcGroups(CP);if(G.length<2)return '';return `<div class="c3-chips" role="group" aria-label="Aller à un groupe">${G.map(g=>`<button class="c3-chip${isPli(a.num,'c|'+g.k)?' fold':''}" data-act="af" data-v="dxc3go|${enc(g.k)}" title="Aller à « ${esc(g.nom)} »">${esc(g.nom)}</button>`).join('')}</div>`;}
function scrollPar(el){for(let p=el.parentElement;p;p=p.parentElement){const s=getComputedStyle(p);if(/(auto|scroll)/.test(s.overflowY)&&p.scrollHeight>p.clientHeight+2)return p;}return document.getElementById('homeBody')||document.scrollingElement;}
function goGroup(gk){const g=[...document.querySelectorAll('#dx-cl .c3-g')].find(x=>x.dataset.g===gk);if(!g)return;const h=g.querySelector('.c3-gh');const sc=scrollPar(h);if(!sc)return;const k=document.getElementById('dx-calc');const top=k?(parseFloat(getComputedStyle(k).getPropertyValue('--c2t'))||0):0;
  const st=sc===document.scrollingElement?0:sc.getBoundingClientRect().top;sc.scrollTop+=g.getBoundingClientRect().top-st-top-2; /* 17/10 (lot DZ) : le haut du groupe, pas son titre collant (déjà dans le groupe, la puce ramenait au mauvais endroit) */h.classList.remove('rp-flash');void h.offsetWidth;h.classList.add('rp-flash');setTimeout(()=>h.classList.remove('rp-flash'),1300);}
/* ═════════ 7 · LA VENTILATION, COMPACTE ═════════ */
export function ventHTML(a,M,canEdit){const CP=X.compsOf(a);if(!CP||!M)return null;css(document);wire();const num=a.num;const P=X.pointage(a,CP,M);const coef=CP.coef;const LK=X.LK_COLS;const REP=X.REP;
  const cols=CP.zones.map(z=>({k:'z'+z.i,f:(CP.tok&&CP.tok[z.i])||'z'+z.i,nom:z.nom,ml:z.ml})).concat(CP.inst?[{k:'inst',f:'inst',nom:'🏗 Installations',ml:0}]:[]);cols.forEach(c=>{c.fold=isPli(num,'v|'+c.f);});const cost=isPli(num,'cost');
  const agg=new Map();CP.list.forEach(c=>{const kk=(c.z<0?'inst':'z'+c.z)+'|'+c.p;const o=agg.get(kk)||{amt:0,mo:0,fo:0,st:0,loc:0};o.amt+=c.amtV;o.mo+=c.mo/coef;o.fo+=c.fo/coef;o.st+=c.st/coef;o.loc+=c.loc/coef;agg.set(kk,o);});
  const ptOfC=kk=>(P.byCell.get(kk)||[]).reduce((s,x)=>s+x.amt,0);const D=a.dpgf||{};const hasT=!!X.calcTarget(a,M);
  const lkN=new Map((D.liens||[]).map((L,i)=>[L.id,i+1]));const bar=(segs,tot)=>`<span class="dx-vb">${segs.map(x=>`<i ${x.id==='atelier'?'class="at" title="placé par l\'atelier"':`data-lk="${esc(x.id)}" title="${esc('n° '+(lkN.get(x.id)||'?')+' · '+nb(x.amt)+' €')}"`} style="width:${tot>0?Math.min(100,x.amt/tot*100).toFixed(2):0}%${x.id==='atelier'?'':';background:'+LK[x.col%LK.length]}"></i>`).join('')}</span>`;
  let rows='',lastG=null;const T={amt:0,mo:0,fo:0,st:0,loc:0,pt:0};const colT=cols.map(()=>({amt:0,pt:0}));const zc=(cl,x)=>`z${cl.fold?' c3-zf':''}${x||''}`;
  CP.postes.forEach(Pp=>{const cells=cols.map(cl=>agg.get(cl.k+'|'+Pp.k));if(!cells.some(x=>x&&Math.abs(x.amt)>0.004))return;const g=CP.grp[Pp.grp]||'';if(g!==lastG){rows+=`<tr class="g"><td colspan="${cols.length+8}">${esc(g)}</td></tr>`;lastG=g;}
    let tot={amt:0,mo:0,fo:0,st:0,loc:0,pt:0};const tds=cols.map((cl,i)=>{const x=cells[i];if(!x||Math.abs(x.amt)<0.004)return `<td class="${zc(cl)}"></td>`;const kk=cl.k+'|'+Pp.k;const segs=P.byCell.get(kk)||[];const pt=ptOfC(kk);['amt','mo','fo','st','loc'].forEach(f=>{tot[f]+=x[f];});tot.pt+=pt;colT[i].amt+=x.amt;colT[i].pt+=pt;const over=pt>x.amt+1;const rest=x.amt-pt;
      return `<td class="${zc(cl,(over?' over':'')+(canEdit&&hasT?' click':''))}" data-st="${over?'⚠':Math.abs(rest)<1?'✓':'•'}" data-act="af" data-v="dxvpick|${esc(kk)}" title="${esc(Pp.label+' · '+cl.nom+(cl.fold?' · '+nb(x.amt)+' € · '+(over?'pointé au-delà de '+nb(-rest)+' €':Math.abs(rest)<1?'tout placé':'reste '+nb(rest)+' €'):''))} — touche pour cocher ces composantes dans le calculateur"><div class="c3-vc"><span class="c3-va">${nb(x.amt)}</span>${bar(segs,x.amt)}<span class="sub c3-vs">${over?'⚠ +'+nb(-rest):Math.abs(rest)<1?'✓ placé':'reste '+nb(rest)}</span>${over||Math.abs(rest)<1?'':REP.ventMl(CP,P,kk)}</div></td>`;}).join('');
    ['amt','mo','fo','st','loc','pt'].forEach(f=>{T[f]+=tot[f];});const over=tot.pt>tot.amt+1;
    rows+=`<tr><td>${esc(Pp.label)}${X.CL.ventSub(CP,Pp.k)}</td>${tds}<td><b>${nb(tot.amt)}</b></td><td class="c3-cc">${tot.mo>0.5?nb(tot.mo):''}</td><td class="c3-cc">${tot.fo>0.5?nb(tot.fo):''}</td><td class="c3-cc">${tot.st>0.5?nb(tot.st):''}</td><td class="c3-cc">${tot.loc>0.5?nb(tot.loc):''}</td><td class="c3-cc${over?' over':''}">${tot.pt>0.5?nb(tot.pt):''}</td><td>${Math.abs(tot.amt-tot.pt)<1?'✓':nb(tot.amt-tot.pt)}</td></tr>`;});
  const allSegs=[];P.byCell.forEach(L=>L.forEach(x=>{const o=allSegs.find(y=>y.id===x.id);if(o)o.amt+=x.amt;else allSegs.push(Object.assign({},x));}));
  const pct=CP.C.vente>0?T.pt/CP.C.vente*100:0;const rest=CP.C.vente-T.pt;const liens=D.liens||[];const shN=X.dpSheet(M,D).name;
  const lkList=liens.length?`<div class="dx-lks-list">${liens.map((L,i)=>{const Xn=X.linkNow(L,CP,M);const p=parseAddr(L.a);const ln=X.CO?X.CO.lineOf(a,M,L):(D.lignes||[]).find(l=>!l.section&&up(L.sh)===up(shN)&&p&&l.row===p.r); /* (lot DY) */const col=LK[L.col%LK.length];
      return `<div class="dx-lkr" data-lk="${esc(L.id)}" style="--lk:${col}"><span class="dx-lkh" style="background:${col}">${i+1}</span><button class="lnk" data-act="af" data-v="dxgo|${esc(L.sh)}|${esc(L.a)}" title="Aller à la cellule">${esc(L.a)}</button><span style="flex:1;min-width:120px">${ln?esc((ln.n?ln.n+' ':'')+ln.des).slice(0,70):esc(L.sh)}</span><b>${nb(Xn.pur,2)} €</b><span class="dim">${eur(Xn.amt)} · ${(L.comps||[]).length} comp.</span>${REP.lkTag(a,L)}${Xn.stale?`<span class="eq-tag warn">↻ ${Xn.cell===null?'vide':nb(Xn.cell,2)} → ${nb(Xn.pur,2)}</span>${canEdit?`<button class="btn sm" data-act="af" data-v="dxrelink|${esc(L.id)}">↻</button>`:''}`:''}${canEdit?`<button class="lnk" data-act="af" data-v="dxunlink|${esc(L.id)}" title="Délier" style="color:#9b2c22">✕</button>`:''}</div>`;}).join('')}</div>`:'';
  const nStale=liens.filter(L=>X.linkNow(L,CP,M).stale).length;const lkOpen=isPli(num,'lks');
  const leg=`<div class="dx-leg">${liens.map((L,i)=>`<span data-lk="${esc(L.id)}"><i style="background:${LK[L.col%LK.length]}"></i>${i+1} · ${esc(L.a)}</span>`).join('')}${allSegs.some(x=>x.id==='atelier')?'<span><i class="at" style="background:repeating-linear-gradient(45deg,#9ca3af 0 3px,#d1d5db 3px 6px)"></i>atelier (prix composés / coûts placés)</span>':''}</div>`;
  const zh=c=>`<th class="c3-zh${c.fold?' c3-zf':''}"><span class="c3-zhw"><button class="c3-zb" data-act="af" data-v="dxc3vz|${enc(c.f)}" title="${c.fold?'Déplier':'Replier'} « ${esc(c.nom)} »" aria-label="${c.fold?'Déplier':'Replier'} ${esc(c.nom)}" aria-expanded="${c.fold?'false':'true'}">${c.fold?'▸':'▾'}</button><span class="c3-zn">${esc(c.nom)}</span></span>${c.ml&&!c.fold?`<span class="sub">${nb(c.ml)} ml</span>`:''}</th>`;
  return `<div class="dx-panel c3-vent" id="dx-vent"><h4>📊 Ventilation de notre prix <span class="hint">· prix de vente HT${CP.v?' · chiffrage v'+CP.v:''} · ce que le DPGF a déjà pointé</span></h4>
    <div class="dx-vsum"><span>Notre prix <b>${eur(CP.C.vente)}</b></span><span>pointé <b>${eur(T.pt)}</b> (${nb(pct,0)} %)</span><span>${Math.abs(rest)<1?'<b style="color:#15803d">✓ tout est placé</b>':rest>0?'reste à placer <b>'+eur(rest)+'</b>':'<b style="color:#b91c1c">⚠ pointé au-delà de '+eur(-rest)+'</b>'}</span>${bar(allSegs,CP.C.vente)}${REP.ventBtn(a,canEdit)}</div>
    ${nStale&&canEdit?`<div class="dx-stale">⚠ ${nStale} prix lié${nStale>1?'s':''} à mettre à jour (chiffrage ou quantité changés) <button class="btn sm primary" data-act="af" data-v="dxrelink|*">↻ Appliquer ${nStale>1?'les '+nStale+' prix':'le prix'}</button></div>`:''}
    <div class="c3-vbar"><label class="c3-tg"><input type="checkbox" data-c3="cost"${cost?' checked':''}> Détail des coûts</label><span class="hint">MO, fourniture, sous-traitance, location / frais, pointé · ▾ sur une zone la replie</span></div>
    <div class="c3-vtw"><table class="dx-vt c3-vt${cost?' c3-cost':''}"><thead><tr><th>Poste</th>${cols.map(zh).join('')}<th>Total vente</th><th class="c3-cc">dont MO</th><th class="c3-cc">Fourn.</th><th class="c3-cc">S.-trait.</th><th class="c3-cc">Loc. / frais</th><th class="c3-cc">Pointé</th><th>Reste</th></tr></thead>
      <tbody>${rows}<tr class="tot"><td>Total</td>${colT.map((x,i)=>`<td class="${cols[i].fold?'c3-zf':''}" data-st="${Math.abs(x.amt-x.pt)<1?'✓':'•'}">${nb(x.amt)}<span class="sub">${Math.abs(x.amt-x.pt)<1?'✓ placé':'reste '+nb(x.amt-x.pt)}</span></td>`).join('')}<td>${nb(T.amt)}</td><td class="c3-cc">${nb(T.mo)}</td><td class="c3-cc">${nb(T.fo)}</td><td class="c3-cc">${nb(T.st)}</td><td class="c3-cc">${nb(T.loc)}</td><td class="c3-cc">${nb(T.pt)}</td><td>${Math.abs(T.amt-T.pt)<1?'✓':nb(T.amt-T.pt)}</td></tr></tbody></table></div>
    ${liens.length?`<details class="c3-lks" data-c3d="lks"${lkOpen?' open':''}><summary>Lignes pointées · ${liens.length} <span class="hint">· couleurs, prix à mettre à jour (↻), délier (✕)</span></summary>${leg}${lkList}</details>`:'<div class="hint" style="margin-top:6px">Aucune ligne pointée : touche une ligne du DPGF, coche ce que son prix comprend, « ↦ Mettre dans le DPGF ».</div>'}${REP.ventReps(a,M,CP,canEdit)}</div>`;}
/* ═════════ 8 · ACTIONS (data-v="dxc3…|…", depuis dpgfXlAct) ═════════ */
export function keepScroll(){const b=docOK()&&document.getElementById('c3-body');SS.st=b?b.scrollTop:0;}
export function act(k,arg,arg2,a,canEdit,M){const num=a.num;
  switch(k){
    case 'dxc3list':SS.open[num]=true;SS.pick[num]=null;X.rerender();setTimeout(()=>{const b=document.querySelector('#c3-dlg .c3-all .btn,#c3-dlg .rp-hd .btn');if(b)try{b.focus({preventScroll:true});}catch(e){}},40);return true;
    case 'dxc3close':{SS.open[num]=false;SS.pick[num]=null;if(X.ZN)X.ZN.closed(num);const o=document.getElementById('c3-ov');if(o)o.remove();return true;}
    case 'dxc3pick':{const key=dec(arg);SS.pick[num]=SS.pick[num]===key?null:key;keepScroll();X.rerender();
      if(SS.pick[num])setTimeout(()=>{const it=[...document.querySelectorAll('#c3-dlg .c3-it')].find(x=>x.dataset.k===key);const pk=it&&it.querySelector('.c3-pk');if(pk){try{pk.scrollIntoView({block:'nearest'});}catch(e){}const i=pk.querySelector('input');if(i)try{i.focus({preventScroll:true});i.select();}catch(e){}}},40);return true;}
    case 'dxc3do':case 'dxc3all':{if(!canEdit||!M||a._vview)return true;const CP=X.compsOf(a);if(!CP)return true;const its=itemsOf(a,CP,M);let todo;const lab=labOf(a,M);
      if(k==='dxc3all')todo=its.filter(it=>it.kind!=='part'&&!it.solo).map(it=>({it,act:it.def||DEF[it.kind]})); /* (lot DK) ; (lot DZ) ; (lot DY) it.def : laisser à placer */
      else{const key=dec(arg),ac=String(arg2||'');const it=its.find(x=>x.k===key);if(!it){X.say('Ce changement est déjà traité');X.rerender();return true;}let ag=null;
        if(ac==='pick'){const box=[...document.querySelectorAll('#c3-dlg .c3-pk')].find(x=>x.dataset.k===key);ag={};let s=0;if(box)box.querySelectorAll('[data-c3="rm"]').forEach(i=>{const v=numIn(i.value)||0;ag[i.dataset.l]=v;s+=v;});if(Math.abs(s-it.over)>=0.0015){X.say('La somme des retraits doit faire '+fq(it.over));return true;}}
        if(ac==='one'){const sl=[...document.querySelectorAll('#c3-dlg select[data-c3="one"]')].find(x=>x.dataset.k===key);ag=sl?sl.value:'';}
        todo=[{it,act:ac,arg:ag}];}
      if(!todo.length){X.rerender();return true;}const R=run(a,CP,M,todo);if(R.msg.length){X.say('Rien d\'écrit : '+R.msg.join(' ; '));return true;}
      keepScroll();X.dxWrite(a,R.vals,{liens:()=>R.W,sv:R.sv});X.XS.calc[num]=null;SS.pick[num]=null;const m=moved(R.chg);flash(m.filter(x=>x.neu!==null).map(x=>x.id));
      const a2=X.affOf(num);const M2=a2&&X.modelOf(a2);const CP2=a2&&X.compsOf(a2);const left=M2&&CP2?itemsOf(a2,CP2,M2).length:0;if(!left)SS.open[num]=false;
      const what=k==='dxc3all'?'Tout traité au prorata ('+todo.length+' changement'+(todo.length>1?'s':'')+')':(todo[0].act==='ok'?'Marqué traité':'Traité')+' : '+nameOf(CP,todo[0].it).nm;
      X.say('✓ '+what+(m.length?' — '+m.length+' PU réécrit'+(m.length>1?'s':'')+' ('+m.slice(0,6).map(x=>x.lab).join(', ')+(m.length>6?'…':'')+'), surligné'+(m.length>1?'s':'')+' dans la grille':'')+' · ↶ pour revenir');X.rerender();return true;}
    case 'dxc3fold':{const g=dec(arg);setPli(num,'c|'+g,!isPli(num,'c|'+g));X.refreshSide(a);return true;}
    case 'dxc3go':{const g=dec(arg);if(isPli(num,'c|'+g)){setPli(num,'c|'+g,false);X.refreshSide(a);}setTimeout(()=>goGroup(g),30);return true;}
    case 'dxc3vz':{const z=dec(arg);setPli(num,'v|'+z,!isPli(num,'v|'+z));X.refreshSide(a);return true;}
    case 'dxc3calc':{const s=X.XS.sel[num];if(!s){X.say('Touche d\'abord une ligne du DPGF');return true;}
      if(!X.popLive()&&docOK()){const g=document.getElementById('dx-grid');const hb=document.getElementById('homeBody');if(g&&hb){const r=g.getBoundingClientRect(),h=hb.getBoundingClientRect();if(r.top<h.top-2||r.top>h.top+hb.clientHeight*0.45)hb.scrollTop+=r.top-h.top-8;}}
      return X.REP.act('dxrpopen','','',a,canEdit,M);}}
  return false;}
/* ═════════ 9 · SAISIES (retraits ligne par ligne, détail des coûts, plis), Échap, nom de case cliquable ═════════ */
let WIRED=false;
function wire(){if(WIRED||!docOK())return;WIRED=true;
  document.addEventListener('input',e=>{const t=e.target;if(!t||!t.dataset||t.dataset.c3!=='rm')return;sumPick(t.closest('.c3-pk'));});
  document.addEventListener('change',e=>{const t=e.target;if(!t||!t.dataset||t.dataset.c3!=='cost')return;const num=X.XS.num;if(!num)return;setPli(num,'cost',!!t.checked);const tb=document.querySelector('#dx-vent .c3-vt');if(tb)tb.classList.toggle('c3-cost',!!t.checked);});
  document.addEventListener('toggle',e=>{const d=e.target;if(!d||!d.dataset||d.dataset.c3d!=='lks')return;const num=X.XS.num;if(num)setPli(num,'lks',d.open);},true);
  document.addEventListener('keydown',e=>{if(e.key!=='Escape')return;const o=document.getElementById('c3-ov');if(!o)return;e.preventDefault();e.stopPropagation();const num=X.XS.num;if(num){SS.open[num]=false;SS.pick[num]=null;if(X.ZN)X.ZN.closed(num);}o.remove();},true);
  /* le bouton flottant suit ce qui est à l'écran : défilement, taille, et tout ce qui se redessine (volet ouvert / fermé, panneau) */
  document.addEventListener('scroll',fabLater,{capture:true,passive:true});window.addEventListener('resize',fabLater);try{new MutationObserver(()=>{if(document.querySelector('#dx-card .c3-fab'))fabLater();}).observe(document.body,{subtree:true,childList:true,attributes:true,attributeFilter:['class']});}catch(e){}
  /* toucher le nom d'une case du calculateur la coche (cible plus grande, au doigt comme à la souris) */
  document.addEventListener('click',e=>{const t=e.target;if(!t||!t.closest)return;const nm=t.closest('#dx-calc .c2-nm');if(!nm||t.closest('input,button,select,a,label'))return;const row=nm.parentElement;const cb=row&&row.querySelector(':scope>input[type=checkbox]');if(!cb||cb.disabled)return;cb.checked=!cb.checked;cb.dispatchEvent(new Event('change',{bubbles:true}));});}
export function reset(num){delete SS.open[num];delete SS.pick[num];}
/* ═════════ 10 · CSS (injectée : <style id="css-lot-c3">) — sélecteurs en #dx-card : passent devant ceux des lots C et C2 quel que soit l'ordre ═════════ */
const C3CSS=`
#dx-card .c3-band{display:flex;align-items:center;gap:6px 10px;flex-wrap:wrap;background:#fff7e6;border:1px solid #f3c27a;border-left:5px solid #d97706;border-radius:10px;padding:6px 8px 6px 10px;margin:0 0 8px;font-size:13.5px;color:#5c3d00}
#dx-card .c3-bi{font-size:18px;line-height:1}#dx-card .c3-bt{flex:1 1 280px;min-width:0}#dx-card .c3-bs{display:block;font-size:12px;color:#7a5200;margin-top:1px}.eq-app #dx-card .c3-band .btn.sm{min-height:36px;font-weight:700}
#dx-card .c3-fabs{position:fixed;right:18px;bottom:calc(18px + env(safe-area-inset-bottom));z-index:72;display:flex;flex-direction:column;align-items:flex-end;gap:8px;pointer-events:none}
#dx-card .c3-fabs>*{pointer-events:auto}#dx-card .c3-fabs>.c3-off{display:none}
#dx-card .c3-fab{min-height:48px;min-width:48px;padding:0 18px;border-radius:999px;border:2px solid #fff;background:#1e7145;color:#fff;font:700 15px/1 system-ui,-apple-system,"Segoe UI",Roboto,sans-serif;box-shadow:0 6px 22px rgba(0,0,0,.3);display:inline-flex;align-items:center;gap:7px;cursor:pointer}
#dx-card .c3-fab:hover{background:#155c37}#dx-card .c3-fabs>button:focus-visible{outline:3px solid #f59e0b;outline-offset:2px}
#dx-card .c3-fab2{min-height:40px;padding:0 14px;border-radius:999px;border:1px solid #f3c27a;background:#fff7e6;color:#7a3d00;font:700 13px/1.1 system-ui,-apple-system,"Segoe UI",Roboto,sans-serif;box-shadow:0 4px 16px rgba(0,0,0,.18);cursor:pointer}#dx-card .c3-fab2:hover{background:#ffedc7}
@media (max-width:700px){#dx-card:has(.dx-split.flt) .c3-fabs{display:none}#dx-card .c3-fabs{right:12px;bottom:calc(12px + env(safe-area-inset-bottom))}}
@container (min-width:900px){#dx-card .dx-split.c2-pop>.dx-side{grid-template-columns:minmax(0,1fr)}#dx-card .dx-split.c2-pop>.dx-side>.dx-calc{grid-column:1;grid-row:auto;position:relative;top:auto;max-height:calc(var(--c2h,100vh) - 40px)}#dx-card .dx-split.c2-pop>.dx-side>:not(.dx-calc){grid-column:1}}
#dx-card .c3-chips{display:flex;gap:4px;overflow-x:auto;margin:5px 0 0;padding:0 0 2px;scrollbar-width:thin}
#dx-card .c3-chip{flex:none;border:1px solid #c9d8cf;background:#f6faf7;border-radius:999px;padding:0 11px;min-height:30px;font-size:12.5px;cursor:pointer;white-space:nowrap;color:#14532d}#dx-card .c3-chip:hover{background:#e8f3ec}#dx-card .c3-chip.fold{color:#6b7280;background:#f3f4f6;border-style:dashed}
#dx-card #dx-cl{container:c3cl/inline-size}
#dx-card .c3-gh{display:flex;align-items:center;gap:4px 6px;padding:1px 6px 1px 2px;flex-wrap:wrap}#dx-card .c3-gh small{flex:1 1 auto;min-width:0}
#dx-card .c3-gt{border:0;background:transparent;font:inherit;font-weight:700;cursor:pointer;min-height:32px;padding:0 6px;display:inline-flex;align-items:center;gap:6px;color:#1f2937;border-radius:6px}#dx-card .c3-gt:hover{background:#e7ece8}
#dx-card .c3-g.fold>.c3-gb{display:none}#dx-card .c3-g.fold>.c3-gh{color:#6b7280}
#dx-card .c3-zt{display:inline-block;font-size:10.5px;font-weight:700;color:#475569;background:#eef2f7;border-radius:4px;padding:0 5px;margin-right:4px;vertical-align:1px;text-decoration:none}
#dx-card .c2-calc .c2-r{padding:2px 8px;gap:0 6px;min-height:32px}#dx-card .c2-calc .c2-r .c2-nm{cursor:pointer;line-height:1.3}#dx-card .c2-calc .c2-r .c2-nm small{font-size:11px;line-height:1.25}#dx-card .c2-calc .c2-sub{padding:1px 8px 1px 4px}#dx-card .c2-calc .c2-sub .c2-nm{cursor:pointer}
@container c3cl (min-width:760px){#dx-card .c3-gb{display:grid;grid-template-columns:repeat(auto-fill,minmax(350px,1fr));column-gap:14px;align-items:start}#dx-card .c3-ci{border-top:1px solid #f1f1f1;min-width:0}#dx-card .c3-ci>.c2-r{border-top:0}}
#dx-card .c3-vbar{display:flex;flex-wrap:wrap;gap:4px 12px;align-items:center;margin:0 0 6px;font-size:12.5px}#dx-card .c3-vbar .hint{margin:0}
#dx-card .c3-tg{display:inline-flex;align-items:center;gap:6px;min-height:34px;cursor:pointer;font-weight:600}.eq-app #dx-card .c3-tg input{width:18px;height:18px;min-height:0;margin:0}
#dx-card .c3-vtw{overflow:auto;max-height:60vh;border:1px solid #eee;border-radius:8px}
#dx-card .c3-vt .c3-cc{display:none}#dx-card .c3-vt.c3-cost .c3-cc{display:table-cell}
#dx-card .c3-vt td.z{min-width:84px}
#dx-card .c3-vc{display:flex;flex-wrap:wrap;align-items:baseline;column-gap:6px}#dx-card .c3-vc>.c3-va{order:2;margin-left:auto}#dx-card .c3-vc>.c3-vs{order:1}#dx-card .c3-vc>.dx-vb{order:3;flex:1 1 100%}#dx-card .c3-vc>.sub:not(.c3-vs){order:4;flex:1 1 100%}#dx-card .c3-vt th:first-child,#dx-card .c3-vt td:first-child{min-width:130px}
#dx-card .c3-vt th.c3-zh{white-space:nowrap}#dx-card .c3-zhw{display:inline-flex;align-items:center;gap:2px}#dx-card .c3-zb{border:0;background:transparent;cursor:pointer;font-size:12px;color:#14532d;padding:0 3px;min-height:26px;min-width:18px;border-radius:5px}#dx-card .c3-zb:hover{background:#e7ece8}
#dx-card .c3-vt th.c3-zf,#dx-card .c3-vt td.c3-zf{min-width:0;width:30px;max-width:34px;padding:4px 2px;text-align:center}#dx-card .c3-vt th.c3-zf .c3-zn{display:none}
#dx-card .c3-vt td.c3-zf{font-size:0}#dx-card .c3-vt td.c3-zf>*{display:none}#dx-card .c3-vt td.c3-zf:not(:empty)::before{content:attr(data-st);font-size:12.5px;color:#4b5563}#dx-card .c3-vt td.c3-zf.over::before{color:#b91c1c}
#dx-card .c3-lks{margin-top:8px}#dx-card .c3-lks>summary{cursor:pointer;font-weight:700;font-size:13px;min-height:36px;display:flex;align-items:center;gap:6px;flex-wrap:wrap}#dx-card .c3-lks>summary .hint{margin:0;font-weight:400}
.rp-ov.c3-ov{background:rgba(15,23,42,.22);justify-content:flex-end;align-items:stretch;padding:0}
.rp-dlg.c3-dlg{width:min(660px,100%);height:100%;max-height:none;border-radius:14px 0 0 14px}
.c3-dlg .rp-hd h3{font-size:16px}.c3-dlg .rp-body{padding:4px 14px 14px;background:#fafaf8}
.c3-intro{margin:10px 0 8px;font-size:13px;line-height:1.45;color:#374151}
.c3-all{display:flex;flex-wrap:wrap;gap:6px 10px;align-items:center;background:#f1f8f4;border:1px solid #b9d3c3;border-radius:10px;padding:8px 10px;margin:0 0 10px}.eq-app .c3-all>.btn{min-height:42px;font-weight:700}
.c3-allt{flex:1 1 300px;font-size:12.5px;line-height:1.4;color:#374151}.c3-alld{flex-basis:100%}.c3-alld>summary{cursor:pointer;font-size:12.5px;min-height:30px;display:flex;align-items:center}
.c3-it{background:#fff;border:1px solid #e5e7eb;border-left:5px solid var(--c3c,#d97706);border-radius:10px;padding:8px 10px;margin:0 0 8px}
.c3-ih{display:flex;align-items:baseline;gap:6px;flex-wrap:wrap}.c3-ik{display:inline-flex;align-items:center;justify-content:center;min-width:22px;height:22px;border-radius:6px;background:var(--c3c);color:#fff;font-size:12px;font-weight:700;align-self:center}
.c3-in{font-size:14px}.c3-iz{color:#6b7280;font-size:12.5px}
.c3-is{margin:4px 0 2px;font-size:13.5px;line-height:1.45;color:#1f2937}.c3-m{color:#b91c1c}.c3-p{color:#1d4ed8}.c3-bad{color:#b91c1c}
.c3-pu{display:flex;flex-wrap:wrap;gap:2px 12px;font-size:12.5px;color:#374151;margin:4px 0 0;padding:5px 8px;background:#f8fafc;border-radius:8px}.c3-pu.dim{color:#6b7280}.c3-pul{font-weight:700;color:#475569}.c3-puc{white-space:nowrap}
.c3-acts{display:flex;flex-wrap:wrap;gap:6px;margin-top:8px;align-items:center}.eq-app .c3-dlg .c3-acts .btn.sm{min-height:36px}.eq-app .c3-acts .btn.primary{font-weight:700}
.c3-one{display:inline-flex;flex-wrap:wrap;gap:4px;align-items:center;font-size:12.5px;border:1px dashed #cbd5e1;border-radius:8px;padding:2px 4px 2px 8px}.c3-one label{display:inline-flex;gap:4px;align-items:center;flex-wrap:wrap}.eq-app .c3-one select{min-height:36px;max-width:240px;min-width:0;font-size:12.5px}
.c3-pk{margin-top:8px;border:1px solid #e5e7eb;border-radius:8px;padding:6px 8px;background:#fcfcfb;display:flex;flex-direction:column;gap:4px}.c3-pkh{font-weight:700;font-size:12.5px}
.c3-pkr{display:flex;flex-wrap:wrap;gap:4px 10px;align-items:center;justify-content:space-between;font-size:12.5px;min-height:36px}.eq-app .c3-pkr input{width:90px;min-height:36px;padding:2px 6px}.c3-pkr input.c3-err{border-color:#dc2626;background:#fef2f2}
.c3-pks{font-size:12.5px;min-height:20px}.eq-app .c3-dlg .c3-pk .btn.sm{min-height:38px;align-self:flex-start}.c3-pk .btn[disabled]{opacity:.45}
.c3-dlg .rp-ft{justify-content:space-between}
@media (max-width:700px){.rp-dlg.c3-dlg{border-radius:0}.c3-acts .btn{flex:1 1 auto}.eq-app .c3-dlg .c3-acts .btn.primary,.eq-app .c3-dlg .c3-pk .btn.primary,.eq-app #dx-card .c3-band .btn.sm{min-height:40px} /* .c3-dlg : passe devant .rp-dlg .btn.sm (lot R, injecté après) */.c3-one{flex:1 1 100%;min-width:0;max-width:100%;box-sizing:border-box;padding:4px 6px}.c3-one label{flex:1 1 100%;min-width:0}.eq-app .c3-one select{max-width:100%;flex:1 1 0;width:100%;min-width:0}
  #dx-card .c3-chips{flex-wrap:wrap;overflow:visible}#dx-card .c3-chip{min-height:36px;max-width:100%;overflow:hidden;text-overflow:ellipsis}#dx-card .c3-gt{min-height:36px}#dx-card .c3-zb{min-height:34px;min-width:30px}}
#dx-card .c3-chip{max-width:220px;overflow:hidden;text-overflow:ellipsis}
`;
export function css(doc){doc=doc||(docOK()?document:null);if(!doc||doc.getElementById('css-lot-c3'))return;const s=doc.createElement('style');s.id='css-lot-c3';s.textContent=C3CSS;doc.head.appendChild(s);}
