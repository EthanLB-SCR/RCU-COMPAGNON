// qcalc.js — SYNTHÈSE D'UNE ÉTUDE DE QUANTITÉS PAR DN (13/10/2026, lot 3) : lignes de la trame type SCR → barres, ml de tube, ml de tranchée (÷ 2 : aller + retour),
// soudures = manchons de l'étude (1 manchon = 1 soudure) sinon estimées par les bouts des pièces, coudes, tés, piquages, réductions, vannes, kits. Pur (Node / navigateur).
const num=v=>v===''||v===null||v===undefined?0:(isFinite(+v)?+v:0);
export function qsynth(lignes){const by={};const g=dn=>by[dn]||(by[dn]={dn,barres:0,mlTube:0,manch:0,coudes:0,tes:0,piq:0,red:0,vannes:0,kits:0,ends:0});
  (lignes||[]).forEach(x=>{const q=num(x.qty);if(q<=0)return;const dn=+x.dn||0;const k=x.kind;if(!dn)return;
    if(k==='pipe'){const r=g(dn);const ml=x.ml!==undefined&&x.ml!==null&&x.ml!==''?num(x.ml):q*(num(x.len)||12);r.barres+=q;r.mlTube+=ml;r.ends+=2*q;}
    else if(k==='bend'||k==='steelbend'){const r=g(dn);r.coudes+=q;r.ends+=2*q;}
    else if(k==='tee'){const r=g(dn);r.tes+=q;r.ends+=2*q;const d2=+x.dn2||0;if(d2){const r2=g(d2);r2.piq+=q;r2.ends+=q;}else r.ends+=q;}
    else if(k==='reducer'){const r=g(dn);r.red+=q;r.ends+=q;const d2=+x.dn2||0;if(d2)g(d2).ends+=q;else r.ends+=q;}
    else if(k==='valve'){const r=g(dn);r.vannes+=q;r.ends+=2*q;}
    else if(k==='sleeve'){g(dn).manch+=q;}
    else if(k==='kit'||k==='sleeveEnd'){g(dn).kits+=q;}});
  const rows=Object.values(by).sort((x,y)=>y.dn-x.dn).map(r=>Object.assign(r,{soudE:Math.ceil(r.ends/2-1e-9),soud:r.manch>0?r.manch:Math.ceil(r.ends/2-1e-9),src:r.manch>0?'manchons':'estimées',mlTr:Math.round(r.mlTube/2*10)/10}));
  const T=k=>rows.reduce((s,r)=>s+(r[k]||0),0);
  return {rows,tot:{barres:T('barres'),mlTube:T('mlTube'),mlTr:T('mlTr'),soud:T('soud'),coudes:T('coudes'),tes:T('tes'),red:T('red'),vannes:T('vannes'),kits:T('kits'),manch:T('manch')},n:(lignes||[]).length};}
