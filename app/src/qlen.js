// qlen.js — LONGUEUR DES PIÈCES D'UN QUANTITATIF (29/10/2026, lot 2910a). Ethan : « les ml c'est juste les tubes × 12 : soit les ml du quantitatif, soit les ml de toutes les pièces ».
// Le ml de tranchée d'une étude importée (qcalc.js) compte aussi les pièces : leurs longueurs viennent du CATALOGUE du fournisseur reconnu (le même que celui du traceur) —
// coude = ses deux branches (90° ou 45°), té = sa longueur droite, vanne, réduction ; fournisseur inconnu → valeurs standard de qcalc (PIECE_LEN). La longueur de tranchée
// annoncée par le fournisseur (lue dans son quantitatif, meta.tranchee) passe AVANT tout calcul. Navigateur (le catalogue est un JSON importé par le bundle).
import {catalogFor} from './catalog.js';
export function supplierKey(s){const t=String(s||'').toUpperCase();return /LOGSTOR/.test(t)?'LOGSTOR':/INPAL/.test(t)?'INPAL':/RENALIA|ZPU/.test(t)?'RENALIA':/AXIOM/.test(t)?'AXIOM':null;}
const CACHE={};
/* options de qsynth pour une étude : meta = ce que la lecture a trouvé (fournisseur, tranchee {dn: m}) ; nom = le nom de l'étude (souvent « LOGSTOR — … ») */
export function qOptsOf(meta,nom){const m=meta||{};const sup=supplierKey(m.fournisseur)||supplierKey(nom);let cat=null;if(sup){try{cat=CACHE[sup]||(CACHE[sup]=catalogFor(sup));}catch(e){cat=null;}}
  const pieceLen=cat?(k,dn,dn2,angle)=>{if(!dn)return null;if(k==='bend'){const b=cat.bend(dn);const L=(+angle&&+angle<=45&&b.legs45?b.legs45:b.legs)||[1,1];return (+L[0]||0)+(+L[1]||0);}
    if(k==='tee')return cat.tee(dn,dn2||dn).L;if(k==='valve')return cat.valve(dn).L;if(k==='reducer')return cat.reducer(dn,dn2||dn).L;return null;}:null;
  const tr=m.tranchee&&typeof m.tranchee==='object'&&Object.keys(m.tranchee).some(k=>+m.tranchee[k]>0)?m.tranchee:null;
  return {pieceLen,tranchee:tr,fournisseur:sup};}
