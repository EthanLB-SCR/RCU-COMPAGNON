// COMPTEUR D'HEURES + HEURES À REPORTER — moteur pur (src/compteurs.js), 13/10/2026. node test/compteurs_test.mjs
// Règles d'Ethan : heures sup par RANG (36e → +25 % = 1 h 15 au compteur, 44e → +50 % = 1 h 30), jusqu'au plafond (surplus payé) ; repos pris / posé par l'entreprise ;
// au-delà de 48 h : heures à reporter majorées ×1,5 à l'entrée, payées en prime ou replacées sur une semaine plus légère ; import du compteur existant.
import {hsSplit,fillCompteur,compteurTimeline,moisCompteurs,navWeeksOf,navEnd,snapSolde,parseSoldes,splitPaste,parseHeures,parseDateFr,mondayOf,ymOfNavEnd} from '../src/compteurs.js';
const C={};const eq=(a,b)=>JSON.stringify(a)===JSON.stringify(b);const log=(k,v)=>console.log(k,JSON.stringify(v));
// 1) une semaine : rang des heures, contrat
const s=[hsSplit(50,35),hsSplit(50,39),hsSplit(41,39),hsSplit(40,35),hsSplit(30,35),hsSplit(45,35),hsSplit(43.5,35)];log('1) hsSplit',s);
C.c1=eq(s[0],{hs125:8,hs150:5,report:2})&&eq(s[1],{hs125:4,hs150:5,report:2})&&eq(s[2],{hs125:2,hs150:0,report:0})&&eq(s[3],{hs125:5,hs150:0,report:0})&&eq(s[4],{hs125:0,hs150:0,report:0})&&eq(s[5],{hs125:8,hs150:2,report:0})&&eq(s[6],{hs125:8,hs150:0.5,report:0});
// 2) remplir le compteur jusqu'au plafond (125 % d'abord), le reste payé
const f=[fillCompteur(8,5,Infinity),fillCompteur(8,5,12),fillCompteur(8,5,0),fillCompteur(2,0,null)];log('2) fillCompteur',f);
C.c2=eq(f[0],{in125:8,in150:5,pay125:0,pay150:0,entree:17.5})&&eq(f[1],{in125:8,in150:1.33,pay125:0,pay150:3.67,entree:12})&&eq(f[2],{in125:0,in150:0,pay125:8,pay150:5,entree:0})&&f[3].entree===2.5;
// 3) mois de navette, fin de navette, date de solde « tapée »
const n={aug:navWeeksOf('2026-08'),sep:navWeeksOf('2026-09'),endSep:navEnd('2026-09'),endOct:navEnd('2026-10'),s30:snapSolde('2026-09-30'),s31:snapSolde('2026-10-31'),s15:snapSolde('2026-10-15'),s27:snapSolde('2026-09-27'),ym:ymOfNavEnd('2026-09-27'),mon:mondayOf('2026-09-27')};log('3) navettes',n);
C.c3=eq(n.aug,['2026-08-03','2026-08-10','2026-08-17','2026-08-24'])&&eq(n.sep,['2026-08-31','2026-09-07','2026-09-14','2026-09-21'])&&n.endSep==='2026-09-27'&&n.endOct==='2026-11-01'&&n.s30==='2026-09-27'&&n.s31==='2026-11-01'&&n.s15==='2026-10-11'&&n.s27==='2026-09-27'&&n.ym==='2026-09'&&n.mon==='2026-09-21';
// 4) la frise : solde de départ 5 h fin août, plafond 20 h ; 50 h (plein, 1,67 h payées à 150 %) ; repos 7 h ; 40 h ; posé 14 h ; 30 h + 1 h replacée
const H={'2026-08-31':50,'2026-09-07':40,'2026-09-14':35,'2026-09-21':30};
const TL=compteurTimeline({contrat:35,on:true,plafond:20,depart:{h:5,at:'2026-08-30'},departRep:{h:1,at:'2026-08-30'},weekTotal:m=>H[m]||0,upto:'2026-09-30',
  mvts:[{id:'a',k:'recup',type:'repos',at:'2026-09-09',h:7},{id:'b',k:'recup',type:'pose',at:'2026-09-22',h:14,note:'pas de travail'},{id:'c',k:'report',type:'replace',at:'2026-09-23',h:1},{id:'d',k:'recup',type:'repos',at:'2026-08-20',h:99},{id:'e',k:'recup',type:'repos',at:'2026-09-10',h:3,deleted:true}],
  primes:[{id:'P1',at:'2026-09-15',h:3}]});
const w=TL.cpt.weeks.map(x=>[x.mon,x.T,x.hs125,x.hs150,x.entree,x.pay150,x.bal,x.plein]);log('4) semaines',w);log('   compteur',{solde:TL.cpt.solde,entrees:TL.cpt.entrees,pris:TL.cpt.pris,poses:TL.cpt.poses,pay150:TL.cpt.pay150,avant:TL.cpt.avant.length});log('   à reporter',{solde:TL.rep.solde,entrees:TL.rep.entrees,primes:TL.rep.primes,replaces:TL.rep.replaces,ex:TL.rep.ex});
C.c4=eq(w[0],['2026-08-31',50,8,5,15,1.67,20,true])&&eq(w[1],['2026-09-07',40,5,0,6.25,0,19.25,false])&&eq(w[2],['2026-09-14',35,0,0,0,0,19.25,false])&&eq(w[3],['2026-09-21',31,0,0,0,0,5.25,false])&&TL.cpt.solde===5.25&&TL.cpt.entrees===21.25&&TL.cpt.pris===7&&TL.cpt.poses===14&&TL.cpt.pay150===1.67&&TL.cpt.avant.length===1
  &&TL.rep.solde===0&&TL.rep.entrees===3&&TL.rep.primes===3&&TL.rep.replaces===1&&TL.rep.ex===2;
// 5) le mois de septembre pour la navette
const M=moisCompteurs(TL,'2026-09');log('5) mois',M);
C.c5=M.cpt.prev===5&&M.cpt.pris===21&&M.cpt.repos===7&&M.cpt.poses===14&&M.cpt.hs125===13&&M.cpt.hs150===5&&M.cpt.pay125===0&&M.cpt.pay150===1.67&&M.cpt.entrees===21.25&&M.cpt.fin===5.25&&M.cpt.known&&!M.cpt.reconstitue&&M.cpt.plein
  &&M.rep.prev===1&&M.rep.ex===2&&M.rep.entrees===3&&M.rep.primes===3&&M.rep.replaces===1&&M.rep.fin===0&&eq(M.repl,{'2026-09-21':1});
// 6) contrat 39 h (45 h → 4 h à 125 %, 2 h à 150 %) ; sans compteur : tout payé, pas de solde ; sans solde de départ : reconstitué sur 26 semaines
const T39=compteurTimeline({contrat:39,on:true,plafond:null,weekTotal:m=>m==='2026-09-07'?45:0,upto:'2026-09-20',depart:{h:0,at:'2026-08-30'}});
const OFF=compteurTimeline({contrat:35,on:false,weekTotal:m=>m==='2026-09-07'?45:0,upto:'2026-09-20'});const M2=moisCompteurs(OFF,'2026-09');
const x39=T39.cpt.weeks.find(x=>x.mon==='2026-09-07');log('6) 39 h / sans compteur',{x39:[x39.hs125,x39.hs150,x39.entree],solde:T39.cpt.solde,off:[OFF.cpt.solde,OFF.cpt.pay125,OFF.cpt.pay150,OFF.cpt.from],m2:[M2.cpt.prev,M2.cpt.pay125,M2.cpt.reconstitue]});
C.c6=x39.hs125===4&&x39.hs150===2&&x39.entree===8&&T39.cpt.solde===8&&OFF.cpt.solde===null&&OFF.cpt.pay125===8&&OFF.cpt.pay150===2&&OFF.cpt.from==='2026-03-23'&&M2.cpt.prev===null&&M2.cpt.pay125===8&&M2.cpt.reconstitue;
// 7) import : en-tête reconnu, heures « 35h30 », date tapée → fin de navette, personnes introuvables / homonymes / doubles / illisibles
const P=[{id:'a@x',nom:'DUPONT',prenom:'Jean',email:'a@x'},{id:'b@x',nom:'MARTIN',prenom:'Paul'},{id:'c@x',nom:'LEROY',prenom:'Anne'},{id:'d@x',nom:'LEROY',prenom:'Marc'},{id:'e@x',nom:'Le Bihan',prenom:'Éric'}];
const txt=['Récap compteurs SCR','Nom\tPrénom\tCompteur (h)\tPlafond\tHeures à reporter\tCas\tDate','DUPONT\tJean\t35h30\t70\t3\t\t30/09/2026','martin\tpaul\t12,5\t\t\tcas 3\t','LEROY\t\t4\t\t\t\t','Inconnu\tToto\t5\t\t\t\t','DUPONT\tJean\t1\t\t\t\t','LE BIHAN\tEric\tbeaucoup\t\t\t\t','Le Bihan\tÉric\t-2\t35\t0\tdistance\t'].join('\n');
const I=parseSoldes(splitPaste(txt),P,{at:'2026-09-27'});log('7) import',{cols:I.cols,head:I.head,ok:I.ok,bad:I.bad.map(b=>b.line+': '+b.why)});
const ok=Object.fromEntries(I.ok.map(o=>[o.pid,o]));
C.c7=I.head===2&&ok['a@x']&&ok['a@x'].solde===35.5&&ok['a@x'].plafond===70&&ok['a@x'].report===3&&ok['a@x'].at==='2026-09-27'&&ok['b@x']&&ok['b@x'].solde===12.5&&ok['b@x'].cas===3&&ok['b@x'].at==='2026-09-27'&&ok['e@x']&&ok['e@x'].solde===-2&&ok['e@x'].cas===0
  &&I.bad.length===4&&I.bad.some(b=>b.line===5&&/plusieurs personnes/.test(b.why))&&I.bad.some(b=>b.line===6&&/introuvable/.test(b.why))&&I.bad.some(b=>b.line===7&&/en double/.test(b.why))&&I.bad.some(b=>b.line===8&&/compteur illisible/.test(b.why));
// 8) petits lecteurs
const r8=[parseHeures('35h30'),parseHeures('7:45'),parseHeures('-3,5'),parseHeures('12 h'),parseHeures(''),parseHeures('x'),parseDateFr('30/09/26'),parseDateFr(46295),parseDateFr('2026-09-30T00:00'),splitPaste('Nom;Compteur\nA;3,5')];log('8) lecteurs',r8);
C.c8=r8[0]===35.5&&r8[1]===7.75&&r8[2]===-3.5&&r8[3]===12&&r8[4]===null&&r8[5]===null&&r8[6]==='2026-09-30'&&r8[7]==='2026-09-30'&&r8[8]==='2026-09-30'&&eq(r8[9],[['Nom','Compteur'],['A','3,5']]);
const bad=Object.entries(C).filter(([k,v])=>!v).map(([k])=>k);console.log(bad.length?'RESULTAT: ECHEC '+bad.join(','):'RESULTAT: TOUT VERT');
