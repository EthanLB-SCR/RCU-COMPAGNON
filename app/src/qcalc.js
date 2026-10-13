// qcalc.js — SYNTHÈSE D'UNE ÉTUDE DE QUANTITÉS PAR DN (13/10/2026, lot 3) : lignes de la trame type SCR → barres, ml de tube, ml de tranchée (÷ 2 : aller + retour),
// soudures = manchons de l'étude (1 manchon = 1 soudure) sinon estimées par les bouts des pièces, coudes, tés, piquages, réductions, vannes, kits. Pur (Node / navigateur).
// 13/10 soir (lecteur automatique) : pièces DANS un manchon (joint:true) — une réduction acier dans un manchon réduit (kit réduit INPAL, « Reduktion St » LOGSTOR)
// = 2 soudures pour 1 manchon (+1 au petit DN) ; une courbe acier soudée dans un manchon = +1 ; un té fait sur place (kit té INPAL) = la conduite n'est pas coupée,
// +1 soudure au piquage. Kits fin de ligne (kit + manchon fin de ligne), DHEC et passages de mur comptés à part (pas de soudure).
const num=v=>v===''||v===null||v===undefined?0:(isFinite(+v)?+v:0);
export function qsynth(lignes){const by={};const g=dn=>by[dn]||(by[dn]={dn,barres:0,mlTube:0,manch:0,coudes:0,tes:0,piq:0,red:0,vannes:0,kits:0,dhec:0,murs:0,ends:0,jw:0});
  (lignes||[]).forEach(x0=>{const x=x0&&x0.kind==='reducerJ'?Object.assign({},x0,{kind:'reducer',joint:true}):x0;const q=num(x.qty);if(q<=0)return;const dn=+x.dn||0;const k=x.kind;if(!dn)return;
    if(k==='pipe'){const r=g(dn);const ml=x.ml!==undefined&&x.ml!==null&&x.ml!==''?num(x.ml):q*(num(x.len)||12);r.barres+=q;r.mlTube+=ml;r.ends+=2*q;}
    else if(k==='bend'||k==='steelbend'){const r=g(dn);r.coudes+=q;r.ends+=2*q;if(x.joint||k==='steelbend')r.jw+=q;}
    else if(k==='tee'){const r=g(dn);r.tes+=q;const d2=+x.dn2||0;
      if(x.joint){const r2=g(d2||dn);if(d2)r2.piq+=q;r2.ends+=q;r2.jw+=q;} /* té fait sur place : pas de coupe de la conduite, une soudure de piquage */
      else{r.ends+=2*q;if(d2){const r2=g(d2);r2.piq+=q;r2.ends+=q;}else r.ends+=q;}}
    else if(k==='reducer'){const r=g(dn);r.red+=q;r.ends+=q;const d2=+x.dn2||0;if(d2)g(d2).ends+=q;else r.ends+=q;if(x.joint)g(d2||dn).jw+=q;}
    else if(k==='valve'){const r=g(dn);r.vannes+=q;r.ends+=2*q;}
    else if(k==='sleeve'){g(dn).manch+=q;}
    else if(k==='kit'||k==='sleeveEnd'){g(dn).kits+=q;}
    else if(k==='dhec'){g(dn).dhec+=q;}
    else if(k==='wall'){g(dn).murs+=q;}});
  const rows=Object.values(by).sort((x,y)=>y.dn-x.dn).map(r=>Object.assign(r,{soudE:Math.ceil(r.ends/2-1e-9),soud:r.manch>0?r.manch+r.jw:Math.max(Math.ceil(r.ends/2-1e-9),r.jw),src:r.manch>0?'manchons':'estimées',mlTr:Math.round(r.mlTube/2*10)/10}));
  const T=k=>rows.reduce((s,r)=>s+(r[k]||0),0);
  return {rows,tot:{barres:T('barres'),mlTube:T('mlTube'),mlTr:T('mlTr'),soud:T('soud'),coudes:T('coudes'),tes:T('tes'),piq:T('piq'),red:T('red'),vannes:T('vannes'),kits:T('kits'),dhec:T('dhec'),murs:T('murs'),manch:T('manch'),jw:T('jw')},n:(lignes||[]).length};}
