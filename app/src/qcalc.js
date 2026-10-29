// qcalc.js — SYNTHÈSE D'UNE ÉTUDE DE QUANTITÉS PAR DN (13/10/2026, lot 3) : lignes de la trame type SCR → barres, ml de tube, ml de pièces, ml de tranchée (29/10 : voir plus bas),
// soudures = manchons de l'étude (1 manchon = 1 soudure) sinon estimées par les bouts des pièces, coudes, tés, piquages, réductions, vannes, kits. Pur (Node / navigateur).
// 13/10 soir (lecteur automatique) : pièces DANS un manchon (joint:true) — une réduction acier dans un manchon réduit (kit réduit INPAL, « Reduktion St » LOGSTOR)
// = 2 soudures pour 1 manchon (+1 au petit DN) ; une courbe acier soudée dans un manchon = +1 ; un té fait sur place (kit té INPAL) = la conduite n'est pas coupée,
// +1 soudure au piquage. Kits fin de ligne (kit + manchon fin de ligne), DHEC et passages de mur comptés à part (pas de soudure).
// 29/10 (lot 2910a) — Ethan : « quand on importe des quantités, comment sont calés les ml ? ça fait juste les tubes × 12 : soit les ml du quantitatif, soit les ml de toutes les
// pièces ». ml de TRANCHÉE d'un DN = la longueur de tranchée du FOURNISSEUR quand son quantitatif la donne (opts.tranchee {dn: m}), sinon (TUBES + PIÈCES) ÷ 2 (aller + retour) :
// une pièce pré-isolée tient sa longueur sur le réseau comme une barre — coude = ses deux branches (1 + 1 m), té = sa longueur droite (1 m ; sa branche est dans l'antenne),
// vanne 1,5 m, réduction 1 m (moitié à chaque DN) ; pièce DANS un manchon (réduction acier, courbe acier, té fait sur place) : 0. Longueurs : catalogue du fournisseur reconnu
// (opts.pieceLen, qlen.js), sinon PIECE_LEN (les valeurs des catalogues pour la plupart des DN). mlTube reste le tube seul (barres) ; mlPc = les pièces ; mlSrc = d'où vient mlTr.
const num=v=>v===''||v===null||v===undefined?0:(isFinite(+v)?+v:0);
export const PIECE_LEN={bend:2,tee:1,valve:1.5,reducer:1};
export function qsynth(lignes,opts){opts=opts||{};const PL=typeof opts.pieceLen==='function'?opts.pieceLen:null;const TRF=opts.tranchee&&typeof opts.tranchee==='object'?opts.tranchee:null;
  const plen=(k,dn,dn2,angle,own)=>{const o=num(own);if(o>0&&o<=6)return o;let v=null;if(PL){try{v=PL(k,dn,dn2,angle);}catch(e){v=null;}}return v!==null&&v!==undefined&&isFinite(+v)&&+v>=0?+v:(PIECE_LEN[k]||0);};
  const by={};const g=dn=>by[dn]||(by[dn]={dn,barres:0,mlTube:0,mlPc:0,manch:0,coudes:0,tes:0,piq:0,red:0,vannes:0,kits:0,dhec:0,murs:0,ends:0,jw:0});
  (lignes||[]).forEach(x0=>{const x=x0&&x0.kind==='reducerJ'?Object.assign({},x0,{kind:'reducer',joint:true}):x0;const q=num(x.qty);if(q<=0)return;const dn=+x.dn||0;const k=x.kind;if(!dn)return;
    if(k==='pipe'){const r=g(dn);const ml=x.ml!==undefined&&x.ml!==null&&x.ml!==''?num(x.ml):q*(num(x.len)||12);r.barres+=q;r.mlTube+=ml;r.ends+=2*q;}
    else if(k==='bend'||k==='steelbend'){const r=g(dn);r.coudes+=q;r.ends+=2*q;if(x.joint||k==='steelbend')r.jw+=q;else r.mlPc+=q*plen('bend',dn,0,x.angle,x.len);}
    else if(k==='tee'){const r=g(dn);r.tes+=q;const d2=+x.dn2||0;
      if(x.joint){const r2=g(d2||dn);if(d2)r2.piq+=q;r2.ends+=q;r2.jw+=q;} /* té fait sur place : pas de coupe de la conduite, une soudure de piquage */
      else{r.ends+=2*q;r.mlPc+=q*plen('tee',dn,d2,0,x.len);if(d2){const r2=g(d2);r2.piq+=q;r2.ends+=q;}else r.ends+=q;}}
    else if(k==='reducer'){const r=g(dn);r.red+=q;r.ends+=q;const d2=+x.dn2||0;if(d2)g(d2).ends+=q;else r.ends+=q;if(x.joint)g(d2||dn).jw+=q;else{const L=q*plen('reducer',dn,d2,0,x.len);if(d2&&d2!==dn){r.mlPc+=L/2;g(d2).mlPc+=L/2;}else r.mlPc+=L;}}
    else if(k==='valve'){const r=g(dn);r.vannes+=q;r.ends+=2*q;r.mlPc+=q*plen('valve',dn,0,0,x.len);}
    else if(k==='sleeve'){g(dn).manch+=q;}
    else if(k==='kit'||k==='sleeveEnd'){g(dn).kits+=q;}
    else if(k==='dhec'){g(dn).dhec+=q;}
    else if(k==='wall'){g(dn).murs+=q;}});
  const rows=Object.values(by).sort((x,y)=>y.dn-x.dn).map(r=>{const calc=Math.round((r.mlTube+r.mlPc)/2*10)/10;const f=TRF&&num(TRF[r.dn])>0?num(TRF[r.dn]):null;r.mlPc=Math.round(r.mlPc*10)/10;
    return Object.assign(r,{soudE:Math.ceil(r.ends/2-1e-9),soud:r.manch>0?r.manch+r.jw:Math.max(Math.ceil(r.ends/2-1e-9),r.jw),src:r.manch>0?'manchons':'estimées',mlTr:f!==null?f:calc,mlTrCalc:calc,mlSrc:f!==null?'fournisseur':(r.mlPc>0?'tubes + pièces':'tubes')});});
  const T=k=>rows.reduce((s,r)=>s+(r[k]||0),0);const R1=v=>Math.round(v*10)/10;
  return {rows,tot:{barres:T('barres'),mlTube:R1(T('mlTube')),mlPc:R1(T('mlPc')),mlTr:R1(T('mlTr')),mlTrCalc:R1(T('mlTrCalc')),soud:T('soud'),coudes:T('coudes'),tes:T('tes'),piq:T('piq'),red:T('red'),vannes:T('vannes'),kits:T('kits'),dhec:T('dhec'),murs:T('murs'),manch:T('manch'),jw:T('jw')},n:(lignes||[]).length};}
