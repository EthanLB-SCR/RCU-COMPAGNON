// regles.js — 14/10 soir (lot T1) : RÈGLES DE TRACÉ — longueurs maximales entre coudes 90° (dilatation), contrat C7.
// Ethan (14/10 soir, avec le tableau « Série 1 - Lmax ») : « le maximum de ligne droite entre deux coudes 90° selon les profondeurs ; ce maximum passé il faut mettre une lyre.
// Indicatif : ça met “attention ligne trop longue, insérer une lyre”, pas plus ; de même interdit à plus de 10 m de ligne droite après un té sans coude 90° ».
// Le tableau RÉEL est une donnée de l'entreprise : il n'est PAS dans le code (dépôt public) — il arrive par le pack SCR (partie « regles »), est rangé dans le registre
// « prix » (id « regles »), et l'appli le recopie dans localStorage['trace:regles'] (même origine que traceur.html) : le traceur le lit là, même hors connexion.
// Format : {lmax:{titre, serie, unite, source, profondeurs:[0.8,…], contraintes:[190,168,150], temperatures:[120,110], tables:{"120":[{dn, gaine, v:[[…par contrainte]…par profondeur]}…], "110":[…]}}, teMaxDroit:10}
import {regSet,regGet,onReg} from './reg.js';
export const REGLES_LS='trace:regles';
const num=v=>typeof v==='number'?isFinite(v):(v!==''&&v!==null&&v!==undefined&&isFinite(+v));
// contrôle du format : '' si bon, sinon le message (en français) de ce qui ne va pas
export function reglesCheck(R){if(!R||typeof R!=='object'||Array.isArray(R))return 'partie « regles » absente ou illisible';const T=R.lmax;if(!T||typeof T!=='object')return 'tableau « lmax » absent';
  const P=T.profondeurs,S=T.contraintes;if(!Array.isArray(P)||!P.length||!P.every(num))return 'lmax.profondeurs : liste de nombres attendue';if(P.some((p,i)=>i&&+p<=+P[i-1]))return 'lmax.profondeurs : valeurs croissantes attendues';
  if(!Array.isArray(S)||!S.length||!S.every(num))return 'lmax.contraintes : liste de nombres attendue';
  const tabs=T.tables;if(!tabs||typeof tabs!=='object'||!Object.keys(tabs).length)return 'lmax.tables : aucun tableau';
  for(const [k,rows] of Object.entries(tabs)){if(!num(k))return `lmax.tables : « ${k} » n'est pas une température`;if(!Array.isArray(rows)||!rows.length)return `lmax.tables.${k} : aucune ligne`;
    for(const r of rows){if(!r||!num(r.dn)||+r.dn<=0)return `lmax.tables.${k} : DN manquant`;if(!Array.isArray(r.v)||r.v.length!==P.length)return `lmax.tables.${k}, DN ${r.dn} : ${P.length} profondeurs attendues`;
      if(!r.v.every(x=>Array.isArray(x)&&x.length===S.length&&x.every(y=>num(y)&&+y>=0)))return `lmax.tables.${k}, DN ${r.dn} : ${S.length} longueurs (une par contrainte) attendues par profondeur`;}}
  if(R.teMaxDroit!==undefined&&!(num(R.teMaxDroit)&&+R.teMaxDroit>0))return 'teMaxDroit : nombre de mètres attendu';
  return '';}
// résumé lisible : « 2 tableaux · 22 DN · 5 profondeurs »
export function reglesSummary(R){const T=R&&R.lmax;if(!T||!T.tables)return 'aucun tableau';const keys=Object.keys(T.tables);const dns=new Set();keys.forEach(k=>(T.tables[k]||[]).forEach(r=>dns.add(+r.dn)));const nP=(T.profondeurs||[]).length;
  return `${keys.length} tableau${keys.length>1?'x':''} · ${dns.size} DN · ${nP} profondeur${nP>1?'s':''}`;}
/* Lmax (m) pour un DN, une profondeur, une température de calcul et une contrainte admissible :
   ligne du tableau au DN (DN absent → DN INFÉRIEUR le plus proche : côté sécurité ; plus petit que tout le tableau → la première ligne, signalé below),
   interpolation linéaire entre les profondeurs, profondeur bornée à [0,80 ; 1,60] (et à l'étendue du tableau). null si la température ou la contrainte n'y sont pas. */
export function lmaxOf(R,dn,prof,temp,sigma){const T=R&&R.lmax;if(!T||!T.tables)return null;const tab=T.tables[String(temp)]||T.tables[String(+temp)];if(!Array.isArray(tab)||!tab.length)return null;
  const j=(T.contraintes||[]).findIndex(c=>+c===+sigma);if(j<0)return null;
  const rows=tab.filter(r=>r&&num(r.dn)).slice().sort((a,b)=>a.dn-b.dn);if(!rows.length)return null;let row=null;rows.forEach(r=>{if(+r.dn<=+dn)row=r;});const below=!row;if(!row)row=rows[0];
  const P=T.profondeurs.map(Number);const lo=Math.max(0.8,P[0]),hi=Math.min(1.6,P[P.length-1]);const p0=num(prof)?+prof:1;const p=lo<=hi?Math.max(lo,Math.min(hi,p0)):P[0];
  let L;if(P.length<2)L=+row.v[0][j];else{let i=0;while(i<P.length-2&&p>P[i+1])i++;const a=+row.v[i][j],b=+row.v[i+1][j];const t=P[i+1]>P[i]?(p-P[i])/(P[i+1]-P[i]):0;L=a+(b-a)*Math.max(0,Math.min(1,t));}
  return {L,dn:+row.dn,below,prof:p,clamped:Math.abs(p-p0)>1e-9};}
// le tableau importé (registre prix / regles) → localStorage['trace:regles'] pour le traceur ; rien n'est effacé si le registre ne le connaît pas (appareil pas encore chargé)
export function reglesSync(){try{const r=regGet('prix','regles');if(!r)return false;const o=Object.assign({},r);delete o.id;if(o.deleted){localStorage.removeItem(REGLES_LS);return false;}if(reglesCheck(o))return false;
  const s=JSON.stringify(o);if(localStorage.getItem(REGLES_LS)!==s)localStorage.setItem(REGLES_LS,s);return true;}catch(e){return false;}}
// partie « regles » du pack SCR (src/packscr.js)
export const reglesPack={key:'regles',label:'Règles de tracé : longueurs maximales entre coudes (dilatation)',import:async part=>{let p=part;if(typeof p==='string')p=JSON.parse(p);const err=reglesCheck(p);if(err)throw new Error(err);
  const o=JSON.parse(JSON.stringify(p));o.at=new Date().toISOString();regSet('prix','regles',o,{replace:true});reglesSync();return reglesSummary(o);}};
// accroche : registre « prix » chargé (appareil puis serveur) ou reçu → copie pour le traceur
onReg(kind=>{if(kind==='prix')reglesSync();});
