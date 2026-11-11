// LISSAGE DES HEURES DE LA NAVETTE (10/11 nuit, règles d'Ethan) — moteur pur src/navette.js : lisserSemaine, repartir, majRang. node test/lissage_test.mjs
import {lisserSemaine,repartir,majRang} from '../src/navette.js';
const C={};const eq=(a,b)=>JSON.stringify(a)===JSON.stringify(b);
const S=(mon,hs,opt)=>{opt=opt||{};const d=i=>{const x=new Date(mon+'T12:00:00');x.setDate(x.getDate()+i);return x.toISOString().slice(0,10);};
  return lisserSemaine(Object.assign({mon,contrat:35,jours:[0,1,2,3,4,5].map(i=>Object.assign({d:d(i),h:hs[i]===undefined?null:hs[i],it:0,plan:i<5&&(opt.plan?opt.plan[i]:true),ferie:!!(opt.fer&&opt.fer[i]),abs:opt.abs&&opt.abs[i]||null,sites:hs[i]?[{id:'s'+(opt.site?opt.site[i]:'A'),nom:opt.site?opt.site[i]:'CAEN'}]:(opt.plan&&!opt.plan[i]?[]:[{id:'sA',nom:'CAEN'}]),futur:false},opt.j&&opt.j[i]||{}))},opt.o||{}));};
// 1) navette modèle de septembre : 43,5 h → 8,5 × 4 + 9,5 ; 41 h → 8 × 4 + 9 ; 47,5 → 9,5 × 5 ; 40 → 8 × 5
C.r1=eq(repartir(43.5,5),[8.5,8.5,8.5,8.5,9.5])&&eq(repartir(41,5),[8,8,8,8,9])&&eq(repartir(47.5,5),[9.5,9.5,9.5,9.5,9.5])&&eq(repartir(40,5),[8,8,8,8,8])&&eq(repartir(47.5,4),[11.5,12,12,12]);
// 2) rythme 4 jours : 4 × 11 h, vendredi pas planifié → 44 h lissées sur 5 jours, vendredi = chantier du jeudi
let L=S('2026-11-02',[11,11,11,11,null,null],{plan:[1,1,1,1,0],site:['A','A','A','B','B']});
C.r2=L.etat==='lisse'&&eq(L.jours.slice(0,5).map(j=>j.h),[8.5,8.5,8.5,8.5,10])&&L.jours[4].site&&L.jours[4].site.nom==='B'&&L.jours[4].emprunt&&L.total===44&&L.hs125===8&&L.hs150===1&&L.versReport===0;
console.log('2)',L.etat,L.jours.map(j=>j.h),L.expl.join(' | '));
// 3) 50 h (5 × 10) → plafond 48 : 2 h au-delà → 3 h au compteur à reporter ; HS 8 + 5
L=S('2026-09-07',[10,10,10,10,10]);C.r3=L.etat==='lisse'&&L.declare===48&&L.versReport===2&&L.versReportMaj===3&&L.hs125===8&&L.hs150===5&&eq(L.jours.slice(0,5).map(j=>j.h),[9.5,9.5,9.5,9.5,10]);
console.log('3)',L.jours.map(j=>j.h),L.versReport,L.versReportMaj);
// 4) férié le mardi, pont le lundi : 3 × 13 h → plafond 36 h, 3 h au-delà (37e → 39e) × 1,25 = 3,75 h
L=S('2026-11-09',[null,null,13,13,13],{fer:[0,1,0,0,0]});C.r4=L.etat==='lisse'&&L.n===3&&L.cap===36&&L.declare===36&&L.versReport===3&&L.versReportMaj===3.75&&L.jours[0].st==='pont'&&L.jours[1].st==='ferie'&&eq(L.jours.slice(2,5).map(j=>j.h),[12,12,12]);
console.log('4)',L.n,L.cap,L.versReport,L.versReportMaj,L.expl.join(' | '));
// 5) semaine courte 32 h : 3 h prises au compteur à reporter (5 h)
L=S('2026-10-05',[8,8,8,8,null],{plan:[1,1,1,1,0],o:{soldes:{report:5,recup:10}}});C.r5=L.etat==='lisse'&&L.deReport===3&&L.deRecup===0&&L.total===35&&L.manque===0;
console.log('5)',L.deReport,L.deRecup,L.total,L.expl.join(' | '));
// 6) 30 h, compteurs 2 + 1 : il manque 2 h → alerte sans solde
L=S('2026-10-05',[7.5,7.5,7.5,7.5,null],{plan:[1,1,1,1,0],o:{soldes:{report:2,recup:1}}});C.r6=L.deReport===2&&L.deRecup===1&&L.manque===2&&L.flags.includes('sansSolde');
// 7) CP le mercredi : 4 × 9 h lissées sur 4 jours, objectif 28 h
L=S('2026-10-12',[9,9,null,9,9],{abs:[null,null,'Congés payés',null,null]});C.r7=L.etat==='lisse'&&L.n===4&&L.cible===28&&eq(L.jours.map(j=>j.h),[9,9,null,9,9,null])&&L.jours[2].lab==='CONGÉS PAYÉS'&&!L.deReport;
// 8) mardi attendu, rien pointé, pas d'absence → à compléter (pas de lissage, rien pris aux compteurs)
L=S('2026-10-19',[10,null,10,10,10],{o:{soldes:{report:9,recup:9}}});C.r8=L.etat==='incomplet'&&L.trous[0]==='2026-10-20'&&!L.deReport&&eq(L.jours.slice(0,5).map(j=>j.h),[10,null,10,10,10]);
// 9) vendredi planifié non pointé, semaine à 32 h → à compléter ; même semaine « validée telle quelle » → lissée + 3 h au compteur
L=S('2026-10-26',[8,8,8,8,null],{o:{soldes:{report:9}}});const L9=S('2026-10-26',[8,8,8,8,null],{o:{soldes:{report:9},main:{force:true,by:'RH'}}});
C.r9=L.etat==='incomplet'&&L9.etat==='lisse'&&L9.deReport===3&&L9.flags.includes('main');
// 10) à la main : 40 h déclarées pour 44 pointées → 4 h × rang (41e → 43e × 1,25 ; 44e × 1,5) = 5,25 h au compteur
L=S('2026-11-02',[11,11,11,11,null],{plan:[1,1,1,1,0],o:{main:{mode:'main',h:[8,8,8,8,8,null],by:'RH',motif:'test'}}});C.r10=L.etat==='main'&&L.declare===40&&L.versReport===4&&L.versReportMaj===5.25;
// 11) inter-chantier à part : ne compte pas dans le lissage ni les heures sup
L=S('2026-11-02',[9,9,9,9,null],{plan:[1,1,1,1,0],j:[{it:1.5}]});C.r11=L.it===1.5&&L.reel===36&&L.total===36&&L.flags.includes('inter');
// 12) semaine vide (rien pointé) : jamais de prise aux compteurs ; semaine en cours : pas lissée
L=S('2026-11-02',[null,null,null,null,null],{o:{soldes:{report:40,recup:40}}});const L12=S('2026-11-09',[9,9,null,null,null],{j:[{},{},{futur:true},{futur:true},{futur:true},{futur:true}]});
C.r12=L.etat==='vide'&&!L.deReport&&!L.deRecup&&L.flags.includes('rien')&&L12.etat==='encours';
// 13) choix « reporter » : 40 h pointées + compteur 10 h → 8 h replacées (plein à 48)
L=S('2026-11-16',[8,8,8,8,8],{o:{soldes:{report:10},placer:true}});C.r13=L.place===8&&L.total===48;
// 14) majorations par rang
C.r14=majRang(48,50,35)===3&&majRang(36,40,35)===5&&majRang(30,36,35)===6.25&&majRang(40,44,39)===5.25;
// 15) frise des compteurs avec semaines lissées : S1 50 h (+3 h à reporter), S2 32 h (3 h reprises), S3 « reporter » choisi fin S2 → S3 40 h + 0 h (compteur vide)
import('../src/compteurs.js').then(({compteurTimeline})=>{
  const H={'2026-09-07':[10,10,10,10,10],'2026-09-14':[8,8,8,8,null],'2026-09-21':[10,10,10,10,10],'2026-09-28':[8,8,8,8,8]};
  const sem=mon=>{const h=H[mon]||[null,null,null,null,null];const d=i=>{const x=new Date(mon+'T12:00:00');x.setDate(x.getDate()+i);return x.toISOString().slice(0,10);};return {jours:[0,1,2,3,4,5].map(i=>({d:d(i),h:h[i]===undefined?null:h[i],it:0,plan:i<5&&!!H[mon]&&(h[4]!==null||i<4),sites:[{id:'a',nom:'A'}]}))};};
  const T=compteurTimeline({contrat:35,on:true,plafond:null,depart:{h:0,at:'2026-09-06'},departRep:{h:0,at:'2026-09-06'},mvts:[],primes:[],semaine:sem,lisser:lisserSemaine,upto:'2026-10-04',choix:[{at:'2026-09-27',choix:'reporter'}]});
  const R=T.rep;const K=T.cpt;const L=T.liss;
  console.log('15)',JSON.stringify({rep:R.ev.map(e=>[e.d,e.t,e.delta,e.bal]),cpt:K.ev.map(e=>[e.d,e.t,e.delta,e.bal]),etats:Object.keys(L).map(k=>[k,L[k].etat,L[k].total,L[k].place])}));
  /* S1 : +3 au compteur à reporter ; S2 : 32 h → 3 h reprises (report 3 → 0) ; S3 : 50 h → +3 ; « reporter » choisi au 27/09 → S4 (40 h) : 3 h replacées (43 h) */
  C.r15=R.solde===0&&L['2026-09-07'].versReportMaj===3&&L['2026-09-14'].deReport===3&&L['2026-09-28'].place===3&&L['2026-09-28'].total===43&&R.comble===3&&R.place===3;
  const bad=Object.keys(C).filter(k=>!C[k]);console.log(JSON.stringify(C));console.log(bad.length?'RESULTAT: ECHEC '+bad.join(','):'RESULTAT: TOUT VERT');});
/*console.log(JSON.stringify(C));console.log(bad.length?'RESULTAT: ECHEC '+bad.join(','):'RESULTAT: TOUT VERT');*/
