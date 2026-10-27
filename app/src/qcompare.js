// qcompare.js — LE TRACÉ EN FACE D'UN QUANTITATIF FOURNISSEUR, PIÈCE PAR PIÈCE (27/10/2026 soir, lot 2710i). Ethan : « pouvoir comparer les quantités tracées dans un
// chiffrage et celles importées d'un fournisseur — pas juste soudures et ml : vraiment avoir toutes les pièces en face l'une de l'autre ».
// Entrée : T = quantités d'un tracé (traceQtyOf, ou la somme des tracés : rows par DN + pcs = les pièces variante par variante) ; S = lignes d'une étude fournisseur
//   (trame type SCR : kind, dn, dn2, angle, len, qty, unit, ml, joint).
// Sortie : {all:{rows}, groups:[{dn, rows}], n:{rows, off}, extra:[{lab, n}]} — une ligne par nature de pièce et par DN : tracé | fournisseur | écart (fournisseur − tracé),
//   sous-lignes par variante (angle des coudes et courbes acier, DN de la branche des tés, DN 2 des réductions, kit / manchon fin de ligne / fin provisoire) ;
//   off = écart au-delà de 5 % et d'une unité (barres, ml, soudures) ou d'une pièce (le reste) ; ce que l'un des deux ne sait pas compter reste à null (« — ») :
//   purges / vidanges côté fournisseur (il les livre en tés et vannes), DHEC et passages de mur côté tracé ; mousse, accessoires, manchons seuls : « extra » (pour mémoire).
// Pur (Node / navigateur) — testé dans test/unit_qcompare.mjs.
import {qsynth} from './qcalc.js';
const num=v=>v===''||v===null||v===undefined?0:(isFinite(+v)?+v:0);const r1=x=>Math.round(x*10)/10;
export const QC_ROWS=[['barres','Barres',''],['mlTube','ml de tube','ml'],['mlTr','ml de tranchée','ml'],['soud','Soudures · manchons',''],['coudes','Coudes',''],['tes','Tés',''],['piq','Piquages',''],['red','Réductions',''],['vannes','Vannes',''],['kits','Kits fin de ligne',''],['bypass','By-pass',''],['purges','Purges',''],['vidanges','Vidanges',''],['dhec','DHEC',''],['murs','Passages de mur','']];
const TOL5=new Set(['barres','mlTube','mlTr','soud']); /* 5 % de tolérance (et 1 unité) ; les pièces : une de différence suffit */
const VAR={coudes:['bend','steelbend'],tes:['tee'],red:['reducer'],kits:['kit']}; /* les natures qui se détaillent par variante */
/* les pièces du fournisseur, variante par variante (mêmes clés que les pcs du tracé) */
export function supplierPieces(S){const by={};const add=(o,q)=>{const key=[o.kind,o.dn,o.dn2||'',o.angle||'',o.sub||''].join(':');(by[key]=by[key]||Object.assign({n:0},o)).n+=q;};
  (S||[]).forEach(x0=>{if(!x0)return;const x=x0.kind==='reducerJ'?Object.assign({},x0,{kind:'reducer',joint:true}):x0;const q=num(x.qty);if(q<=0)return;const dn=+x.dn||0;const k=x.kind;if(!dn)return;
    if(k==='bend'||k==='steelbend')add({kind:k,dn,angle:Math.abs(+x.angle||90)},q);else if(k==='tee')add({kind:'tee',dn,dn2:+x.dn2||undefined,sub:x.joint?'place':undefined},q);
    else if(k==='reducer')add({kind:'reducer',dn,dn2:+x.dn2||undefined,sub:x.joint?'manchon':undefined},q);else if(k==='valve')add({kind:'valve',dn},q);else if(k==='bypass')add({kind:'bypass',dn},q);
    else if(k==='kit'||k==='sleeveEnd')add({kind:'kit',dn,sub:k==='sleeveEnd'?'manchon':undefined},q);});
  return Object.values(by);}
/* clé et libellé d'une variante (ce qui doit coïncider des deux côtés pour se comparer) */
function varKey(k,p){if(k==='coudes')return (p.kind==='steelbend'?'acier':'coude')+':'+(p.angle||90);if(k==='tes'||k==='red')return String(p.dn2||'?');if(k==='kits')return p.sub||'kit';return '';}
function varLabel(k,p){if(k==='coudes')return (p.kind==='steelbend'?'Courbe acier ':'Coude ')+(p.angle||90)+'°';if(k==='tes')return 'Té → DN '+(p.dn2||'?');if(k==='red')return 'Réduction → DN '+(p.dn2||'?');
  if(k==='kits')return p.sub==='provisoire'?'Fin provisoire à reprendre':p.sub==='manchon'?'Manchon fin de ligne':'Kit fin de ligne';return '';}
const detT=p=>p.pv?(p.pv==='vidange'?'vidange':'purge'):'';const detF=p=>p.sub==='place'?'fait sur place':p.sub==='manchon'&&p.kind==='reducer'?'dans un manchon':'';
function tol(k,t,f){return TOL5.has(k)?Math.max(1,0.05*Math.max(num(t),num(f))):0.5;}
function mkRow(k,lab,unit,t,f,o){const d=t!==null&&f!==null?r1(num(f)-num(t)):null;const pct=d!==null&&num(t)>0?Math.round(d*100/num(t)):null;const off=d!==null&&Math.abs(d)>tol(k,t,f);
  return Object.assign({k,lab,unit,t:t===null?null:(unit==='ml'?r1(t):num(t)),f:f===null?null:(unit==='ml'?r1(f):num(f)),d,pct,off,sub:[]},o||{});}
/* variantes d'une nature : tracé (pcs) et fournisseur (pièces) regroupés par clé — libellé du côté qui l'a, détails (purge / vidange, fait sur place…) */
function variants(k,dn,tp,sp){const kinds=VAR[k];if(!kinds)return [];const by={};const g=(key,lab)=>by[key]||(by[key]={key,lab,t:0,f:0,det:new Set()});
  tp.filter(p=>kinds.includes(p.kind)&&(dn===null||p.dn===dn)).forEach(p=>{const v=g(varKey(k,p),varLabel(k,p));v.t+=num(p.n);const d=detT(p);if(d)v.det.add(d);});
  sp.filter(p=>kinds.includes(p.kind)&&(dn===null||p.dn===dn)).forEach(p=>{const v=g(varKey(k,p),varLabel(k,p));v.f+=num(p.n);const d=detF(p);if(d)v.det.add(d);});
  const ord=v=>{const m=v.key.match(/(\d+)$/);return m?+m[1]:0;};
  return Object.values(by).sort((a,b)=>ord(b)-ord(a)||a.key.localeCompare(b.key,'fr')).map(v=>{const r=mkRow(k,v.lab+(v.det.size?' ('+[...v.det].join(', ')+')':''),'',v.t,v.f);r.key=v.key;return r;});}
/* les lignes d'un DN (dn) ou de tout (null) */
function rowsFor(dn,tr,sy,tp,sp){const out=[];const T=(o,k)=>o?num(o[k]):0;
  QC_ROWS.forEach(([k,lab,unit])=>{let t,f;
    if(k==='bypass'){t=tp.filter(p=>p.kind==='bypass'&&(dn===null||p.dn===dn)).reduce((s,p)=>s+num(p.n),0);f=sp.filter(p=>p.kind==='bypass'&&(dn===null||p.dn===dn)).reduce((s,p)=>s+num(p.n),0);}
    else if(k==='purges'||k==='vidanges'){t=T(tr,k);f=null;} /* le fournisseur les livre en tés et vannes : pas de ligne « purge » chez lui */
    else if(k==='dhec'||k==='murs'){t=null;f=T(sy,k);} /* rien de tel dans le tracé */
    else if(k==='piq'){t=T(tr,k)+tp.filter(p=>p.kind==='tee'&&p.pv&&(dn===null||p.dn2===dn)).reduce((s,p)=>s+num(p.n),0);f=T(sy,k);} /* le fournisseur compte la branche d'un té de purge / vidange comme un piquage à son DN : le tracé aussi, ici */
    else{t=T(tr,k);f=T(sy,k);}
    const sub=variants(k,dn,tp,sp);if(!num(t)&&!num(f)&&!sub.length)return;
    const est=k==='soud'&&!!(sy&&sy.src==='estimées'&&num(sy.soud));const r=mkRow(k,lab,unit,t,f,{est});if(est&&dn!==null)r.off=false; /* soudures estimées par les bouts des pièces (pas de manchon à ce DN) : pas un écart — le total (en partie estimé) garde son écart */r.sub=sub;out.push(r);});
  return out;}
export function qCompare(T,S){const trows=(T&&T.rows)||[];const tp=(T&&T.pcs)||[];const Y=qsynth(S||[]);const sp=supplierPieces(S||[]);
  const dns=[...new Set(trows.map(r=>r.dn).concat(Y.rows.map(r=>r.dn)).concat(tp.map(p=>p.dn)).concat(sp.map(p=>p.dn)))].filter(Boolean).sort((a,b)=>b-a);
  const sumRows=(rows,k)=>rows.reduce((o,r)=>{Object.keys(r).forEach(x=>{if(typeof r[x]==='number')o[x]=(o[x]||0)+r[x];});if(r.src==='estimées')o.src='estimées';return o;},{dn:null});
  const all=rowsFor(null,trows.length?sumRows(trows):null,Y.rows.length?sumRows(Y.rows):null,tp,sp);
  const groups=dns.map(dn=>({dn,rows:rowsFor(dn,trows.find(r=>r.dn===dn)||null,Y.rows.find(r=>r.dn===dn)||null,tp,sp)})).filter(g=>g.rows.length);
  const extra=[];const ex={};(S||[]).forEach(x=>{if(!x||num(x.qty)<=0)return;const k=x.kind;if(k==='pu'||k==='acc'){const key=k==='pu'?'Mousse PU'+(x.dn?' DN '+x.dn:''):(x.label||x.des||'Accessoire');(ex[key]=ex[key]||{lab:key,n:0}).n+=num(x.qty);}});Object.values(ex).forEach(e=>extra.push(e));
  if(Y.tot.manch&&!trows.length)extra.push({lab:'Manchons',n:Y.tot.manch});
  let nr=0,no=0;groups.forEach(g=>g.rows.forEach(r=>{nr++;if(r.off)no++;r.sub.forEach(s=>{nr++;if(s.off)no++;});}));
  return {all,groups,n:{rows:nr,off:no},extra,dns};}
