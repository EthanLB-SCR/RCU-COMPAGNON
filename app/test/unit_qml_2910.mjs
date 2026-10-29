// unit_qml_2910.mjs — 29/10 (lot 2910a). Ethan : « quand on importe des quantités, comment sont calés les ml ? ça fait juste les tubes × 12 : soit les ml du quantitatif,
// soit les ml de toutes les pièces ». qsynth (src/qcalc.js), pur, dans Node : node test/unit_qml_2910.mjs
//  c1 tubes + pièces : coude 2 m (1 + 1), té 1 m (longueur droite, la branche part dans l'antenne), vanne 1,5 m, réduction 1 m (moitié à chaque DN) ; tranchée = (tubes + pièces) ÷ 2
//  c2 pièce DANS un manchon (réduction acier, courbe acier, té fait sur place) : 0 m
//  c3 tubes donnés en ml (le quantitatif) : ces ml, pas barres × 12
//  c4 longueur de tranchée annoncée par le fournisseur (par DN) : PRISE, avant tout calcul ; mlTrCalc garde le calcul (contrôle)
//  c5 longueurs du catalogue (opts.pieceLen) ; longueur propre d'une ligne (len) prioritaire ; valeur aberrante (> 6 m) ignorée
//  c6 rien d'autre ne bouge : barres, soudures (manchons / estimées), coudes, tés, piquages, réductions, vannes
import {qsynth,PIECE_LEN} from '../src/qcalc.js';
const C={};const J=x=>JSON.stringify(x);const row=(Y,dn)=>Y.rows.find(r=>r.dn===dn)||{};
const L1=[{kind:'pipe',dn:100,len:12,qty:10},{kind:'bend',dn:100,angle:90,qty:4},{kind:'tee',dn:100,dn2:50,qty:2},{kind:'valve',dn:100,qty:2},{kind:'reducer',dn:100,dn2:80,qty:2},{kind:'pipe',dn:80,len:12,qty:2},{kind:'sleeve',dn:100,qty:20},{kind:'sleeve',dn:80,qty:6}];
const Y1=qsynth(L1);const a=row(Y1,100),b=row(Y1,80),c=row(Y1,50);
console.log('c1',J({a:[a.mlTube,a.mlPc,a.mlTr,a.mlSrc],b:[b.mlTube,b.mlPc,b.mlTr,b.mlSrc],c:[c.mlTube,c.mlPc,c.mlTr,c.piq],tot:Y1.tot}));
C.c1=J(PIECE_LEN)===J({bend:2,tee:1,valve:1.5,reducer:1})&&a.mlTube===120&&a.mlPc===14&&a.mlTr===67&&a.mlSrc==='tubes + pièces'&&b.mlTube===24&&b.mlPc===1&&b.mlTr===12.5&&c.mlPc===0&&!c.mlTr&&c.piq===2&&Y1.tot.mlPc===15&&Y1.tot.mlTr===79.5;
const Y2=qsynth([{kind:'pipe',dn:150,len:12,qty:4},{kind:'reducer',dn:150,dn2:100,qty:2,joint:true},{kind:'reducerJ',dn:150,dn2:100,qty:2},{kind:'steelbend',dn:150,angle:30,qty:2},{kind:'tee',dn:150,dn2:80,qty:2,joint:true},{kind:'bend',dn:150,qty:2,joint:true}]);
console.log('c2',J(Y2.rows.map(r=>[r.dn,r.mlTube,r.mlPc,r.mlTr])));C.c2=row(Y2,150).mlPc===0&&row(Y2,150).mlTr===24&&(row(Y2,100).mlPc||0)===0&&(row(Y2,80).mlPc||0)===0;
const Y3=qsynth([{kind:'pipe',dn:200,len:12,qty:26,unit:'ml',ml:305.5},{kind:'bend',dn:200,qty:6}]);
console.log('c3',J([row(Y3,200).barres,row(Y3,200).mlTube,row(Y3,200).mlPc,row(Y3,200).mlTr]));C.c3=row(Y3,200).barres===26&&row(Y3,200).mlTube===305.5&&row(Y3,200).mlPc===12&&row(Y3,200).mlTr===158.8;
const Y4=qsynth(L1,{tranchee:{100:72.4}});const a4=row(Y4,100),b4=row(Y4,80);
console.log('c4',J({a:[a4.mlTr,a4.mlTrCalc,a4.mlSrc],b:[b4.mlTr,b4.mlSrc],tot:[Y4.tot.mlTr,Y4.tot.mlTrCalc]}));
C.c4=a4.mlTr===72.4&&a4.mlTrCalc===67&&a4.mlSrc==='fournisseur'&&b4.mlTr===12.5&&b4.mlSrc==='tubes + pièces'&&Y4.tot.mlTr===84.9&&Y4.tot.mlTrCalc===79.5;
const PL=(k,dn,dn2,angle)=>k==='bend'?(+angle===45?1.6:2.5):k==='tee'?0.7:k==='valve'?1.2:k==='reducer'?0.8:null;
const Y5=qsynth([{kind:'pipe',dn:100,len:12,qty:2},{kind:'bend',dn:100,angle:90,qty:2},{kind:'bend',dn:100,angle:45,qty:2},{kind:'tee',dn:100,dn2:50,qty:1},{kind:'valve',dn:100,qty:1,len:2.2},{kind:'reducer',dn:100,qty:1,len:40}],{pieceLen:PL});
console.log('c5',J([row(Y5,100).mlPc,row(Y5,100).mlTr]));C.c5=row(Y5,100).mlPc===+(2*2.5+2*1.6+0.7+2.2+0.8).toFixed(1)&&Math.abs(row(Y5,100).mlTr-(24+row(Y5,100).mlPc)/2)<=0.06; /* arrondi au dm */
const Y0=qsynth(L1);C.c6=a.barres===10&&b.barres===2&&a.soud===20&&a.src==='manchons'&&b.soud===6&&a.coudes===4&&a.tes===2&&a.red===2&&a.vannes===2&&row(Y0,50).piq===2&&Y0.tot.soud===Y1.tot.soud;
console.log(J(C));console.log('RESULTAT:',Object.values(C).every(Boolean)?'TOUT VERT':'KO '+Object.keys(C).filter(k=>!C[k]).join(' '));process.exit(Object.values(C).every(Boolean)?0:1);
