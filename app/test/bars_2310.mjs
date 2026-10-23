// 23/10 — RÈGLE DES BARRES (Ethan : « deux fois 5 m = une barre coupée deux fois ; 8 + 8 + 8 = trois barres ; réutilisation évidente d'une chute oui, racolage non »).
// packBars : par ligne, dans l'ordre, chute de la même ligne seulement, chute < 1 m = déchet, jamais deux chutes pour un morceau. packBarsV2 = l'ancien rangement (pour mémoire).
import {packBars,packBarsV2,CHUTE_MIN} from '../src/stock.js';
const C={};const L=(line,...lens)=>lens.map(len=>({len,line}));
const cas=[
 ['5 + 5 = 1 barre',[...L('a',5,5)],1],
 ['8 + 8 + 8 = 3 barres (pas de 2 × 4)',[...L('a',8,8,8)],3],
 ['9 + 3 = 1 barre (3 dans la chute de 3)',[...L('a',9,3)],1],
 ['7 + 7 + 5 = 2 barres (5 dans une chute de 5)',[...L('a',7,7,5)],2],
 ['8 + 8 + 8 puis 3 + 3 + 3 = 3 barres (les chutes de 4 servent plus loin sur la ligne)',[...L('a',8,8,8,3,3,3)],3],
 ['deux lignes : 5 + 5 et 2 = 2 barres (la chute de la rue A ne sert pas la rue B)',[...L('a',5,5),...L('b',2)],2],
 ['12 m = 1 barre, 24 m = 2, 25 m = 3 (la barre du bout d\'1 m)',[...L('a',12,24,25)],6],
 ['25 m puis 10 m sur la même ligne = 3 barres (le bout d\'1 m dans la chute de 2 m… non : 25 → 2 barres + 1 m dans une barre neuve (chute 11), puis 10 dans la chute de 11)',[...L('a',25,10)],3],
 ['chute < 1 m = déchet : 11,5 puis 0,4 → 2 barres',[...L('a',11.5,0.4)],2],
 ['11 puis 0,9 : la chute d\'1 m sert (≥ 1 m)',[...L('a',11,0.9)],1],
 ['nombres seuls = une seule ligne : 6, 6, 6 → 2 barres',[6,6,6],2],
 ['ordre du calepinage : 3, 10, 9 → 2 barres',[...L('a',3,10,9)],2],
 ['aller puis retour : 7 (A), 5 (A), 7 (R), 5 (R) → 2 barres',[...L('a',7,5,7,5)],2],
 ['rien',[],0],
];
cas.forEach(([t,lens,n],i)=>{const got=packBars(lens,12);C['c'+(i+1)]=got===n;console.log((got===n?'OK ':'KO ')+t+' → '+got+(got===n?'':' (attendu '+n+')'));});
console.log('ancien rangement (v2) sur deux lignes 5 + 5 et 2 → '+packBarsV2([...L('a',5,5),...L('b',2)],12)+' barre (mise en commun, ce que l\'on ne veut plus)');C.v2=packBarsV2([...L('a',5,5),...L('b',2)],12)===1;
C.min=CHUTE_MIN===1;
const ko=Object.entries(C).filter(([k,v])=>!v).map(([k])=>k);console.log(JSON.stringify(C));console.log(ko.length?'RESULTAT: KO '+ko.join(','):'RESULTAT: TOUT VERT');
