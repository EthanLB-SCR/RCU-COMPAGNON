// unit_welds_0311.mjs — 03/11 (Nantes) : numéros de soudure gardés quand une pièce insérée décale les soudures en aval (maquette/bridge.js matchWeldIds). node test/unit_welds_0311.mjs
import {matchWeldIds,sigOf} from '../maquette/bridge.js';
const C={};const J=x=>JSON.stringify(x);
const P=(arr)=>arr.map(([m,sig,st],i)=>({m,sig,status:st||'a_souder',weldId:'S-'+String(i+1).padStart(4,'0')}));
const ids=(prev,res)=>res.map(i=>i>=0?prev[i].weldId:null);
// w1 : antenne tube → coude → barres ; manchette de 0,8 m insérée après le coude : les joints de barres en aval décalés de 0,8 m jusqu'au té suivant (fixe)
{const prev=P([[0.5,'C|P','soudee'],[12.5,'P|P','manchonnee'],[24.5,'P|P','manchonnee'],[36.5,'P|P','soudee'],[40,'P|T','soudee'],[52,'P|T'],[64,'P|P']]);
 const N=[[0.5,'C|M'],[1.3,'M|P'],[13.3,'P|P'],[25.3,'P|P'],[37.3,'P|P'],[40,'P|T'],[52,'P|T'],[64,'P|P']].map(([m,sig])=>({m,sig}));
 const r=ids(prev,matchWeldIds(prev,N,{dmax:12.5}));console.log('w1',J(r));
 C.w1=J(r)===J(['S-0001',null,'S-0002','S-0003','S-0004','S-0005','S-0006','S-0007']);}
// w2 : ancien comportement intact (rien ne bouge → mêmes numéros ; une soudure à 0,2 m → gardée)
{const prev=P([[5,'P|P'],[17,'P|P'],[29,'C|P']]);const N=[{m:5.2,sig:'P|P'},{m:17,sig:'P|P'},{m:29,sig:'C|P'}];const r=ids(prev,matchWeldIds(prev,N,{}));console.log('w2',J(r));C.w2=J(r)===J(['S-0001','S-0002','S-0003']);}
// w3 : la soudure d'une manchette neuve ne reprend JAMAIS le numéro (ni l'état) d'un joint de barres disparu
{const prev=P([[0,'P|T','soudee'],[12,'P|P','soudee'],[30,'P|T']]);const N=[{m:0,sig:'P|T'},{m:11.6,sig:'M|P'},{m:12.4,sig:'M|P'},{m:30,sig:'P|T'}];const r=ids(prev,matchWeldIds(prev,N,{}));console.log('w3',J(r));C.w3=J(r)===J(['S-0001',null,null,'S-0003']);}
// w4 : seul joint de la travée, décalé de 5 m (même sorte, un pour un) → gardé ; deux pour un → numéro neuf
{const prev=P([[0,'P|T'],[12,'P|P','soudee'],[20,'P|T']]);const N=[{m:0,sig:'P|T'},{m:17,sig:'P|P'},{m:20,sig:'P|T'}];const r=ids(prev,matchWeldIds(prev,N,{}));console.log('w4',J(r));C.w4=J(r)===J(['S-0001','S-0002','S-0003']);}
// w5 : tracé allongé en amont (sommet déplacé) : TOUT l'aval décalé de 3,4 m, coudes compris → tout gardé
{const prev=P([[0,'P|T','soudee'],[12,'P|P','soudee'],[24,'P|P','soudee'],[30,'C|P','soudee'],[31,'C|P'],[43,'P|P']]);const N=[0,12,24,33.4,34.4,46.4].map((m,i)=>({m,sig:['P|T','P|P','P|P','C|P','C|P','P|P'][i]}));
 const r=ids(prev,matchWeldIds(prev,N,{}));console.log('w5',J(r));C.w5=J(r)===J(['S-0001','S-0002','S-0003','S-0004','S-0005','S-0006']);}
// w6 : sigOf
C.w6=sigOf(['P12','C3'])==='C|P'&&sigOf(['M1','P2b'])==='M|P'&&sigOf(undefined)==='';
// w7 : réseau de 300 soudures : rapide
{const prev=P(Array.from({length:300},(_,i)=>[i*12+0.5,'P|P','soudee']));const N=Array.from({length:301},(_,i)=>({m:i===0?0.2:i*12+1.3,sig:'P|P'}));const t=Date.now();const r=matchWeldIds(prev,N,{});const dt=Date.now()-t;console.log('w7',dt+' ms',r.filter(x=>x>=0).length);C.w7=dt<1500&&r.filter(x=>x>=0).length>=299;}
console.log('RESULTAT:',Object.values(C).every(Boolean)?'TOUT VERT':'ÉCHEC '+Object.keys(C).filter(k=>!C[k]).join(' '));process.exit(Object.values(C).every(Boolean)?0:1);
