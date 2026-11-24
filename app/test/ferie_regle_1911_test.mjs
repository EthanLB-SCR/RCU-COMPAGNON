// ferie_regle_1911_test.mjs — 19/11/2026 nuit (Ethan, module RH) — moteur pur src/navette.js. node test/ferie_regle_1911_test.mjs
//  « Il faut pouvoir sur certaines semaines mettre des règles communes à tout le monde : ce mercredi 11 novembre, on lisse les heures sur tout sauf le mercredi férié qui a été
//    travaillé — les heures étant majorées, il faut les heures au réel sur ce jour. » ; « sur les navettes, veille à ce que les heures sup soient bien calculées dans le tableau
//    et les récaps en bas de tableau. »
//  f1  férié travaillé : ses heures restent au réel ce jour-là, le reste de la semaine est lissé sans lui ; l'explication le dit ; la navette écrit « FÉRIÉ TRAVAILLÉ »
//  f2  férié non travaillé : comme avant (pas lissé, « FÉRIÉ ») ; f3 semaine sans férié : rien ne change
//  f4  règle commune de la semaine : un jour « au réel pour tout le monde » ; f5 samedi au réel (sinon ses heures sont lissées du lundi au vendredi, comme avant)
//  f6  règle commune « toute la semaine aux heures réelles » ; f7 la main sur la semaine d'une personne passe avant (lissé quand même · lissée malgré la règle · heures
//      réelles · heures saisies) ; un ancien réglage « auto » sans « malgré la règle » n'annule pas la règle « semaine au réel »
//  f10 la règle peut rendre un férié travaillé au lissage pour tout le monde ; f11 férié travaillé un samedi : au réel aussi
//  f12 férié travaillé plafonné à 12 h (le reste est lissé, ou en surplus au-delà de 48 h) ; f13 règle « jour non travaillé pour tout le monde » (pont, fermeture) ;
//  f14 les semaines pas lissées (à compléter, en cours) sont en quarts d'heure aussi
//  f8  plafond : 48 h moins les heures au réel ; le surplus va au compteur à reporter, majoré selon son rang ; f9 arrondi au ¼ h : le jour au réel aussi (24/11)
//  h1  heures sup : 600 semaines tirées au hasard (fériés travaillés ou non, absences, samedis, règles, contrats 35 et 39 h) — le total, les 125 % et les 150 % de chaque
//      semaine recalculés à part (formule du contrat) = ceux du tableau ; le mois = la somme des semaines
//  h2  la feuille Excel : les lignes « HEURES SUP - 125 % / 150 % » et les récaps du bas (« HS du mois » : 125 %, 150 %, total ; « au-delà du plafond ») évalués avec le
//      moteur de formules = le tableau ; chaque « TOTAL SEMAINE » = la somme de ses jours
import {lisserSemaine,buildNavette,navetteSheet,navWeeks,addDay,HEBDO_MAX} from '../src/navette.js';
import * as X from '../src/xlcalc.js';
const C={};const eq=(a,b)=>JSON.stringify(a)===JSON.stringify(b);const r2=v=>Math.round(v*100)/100;
const MON='2026-11-09',FER=[0,0,1,0,0,0]; /* semaine 46 : mercredi 11 novembre férié */
const S=(mon,hs,opt)=>{opt=opt||{};return lisserSemaine(Object.assign({mon,contrat:opt.contrat||35,jours:[0,1,2,3,4,5].map(i=>({d:addDay(mon,i),h:hs[i]===undefined?null:hs[i],it:0,plan:i<5,ferie:!!(opt.fer&&opt.fer[i]),abs:opt.abs&&opt.abs[i]||null,sites:[{id:'sA',nom:'CHANTIER FICTIF'}],futur:false}))},opt.o||{}));};
const H=L=>L.jours.map(j=>j.h);
// f1
let L=S(MON,[10,9,6.5,9,7],{fer:FER});console.log('f1)',L.etat,H(L),L.total,L.hs125,L.hs150,L.flags.join(),'|',L.expl.join(' | '));
C.f1=L.etat==='lisse'&&eq(H(L),[8.75,8.75,6.5,8.75,8.75,null])&&L.total===41.5&&L.hs125===6.5&&L.hs150===0&&L.jours[2].fixe&&L.jours[2].ferT&&!L.jours[2].liss&&L.jours[2].tag==='FÉRIÉ TRAVAILLÉ'&&L.n===4&&L.fixeH===6.5
  &&L.flags.includes('ferieT')&&!L.flags.includes('regle')&&!L.flags.includes('main')&&L.expl.some(t=>/^Mercredi 11\/11 : férié travaillé — 6,5 h au réel \(heures majorées\), pas lissé\.$/.test(t))&&L.expl.some(t=>/^Lissé sur 4 jours \(lun mar jeu ven\) au pas de ¼ h : 8,75 h par jour/.test(t));
// f2 · f3
L=S(MON,[9,9,null,9,9],{fer:FER});const L3=S('2026-11-16',[10,9,6.5,9,7]);console.log('f2)',H(L),L.jours[2].lab,L.flags.join(),'f3)',H(L3),L3.flags.join());
C.f2=L.etat==='lisse'&&eq(H(L),[9,9,null,9,9,null])&&L.jours[2].lab==='FÉRIÉ'&&!L.jours[2].fixe&&L.n===4&&L.flags.includes('ferie')&&!L.flags.includes('ferieT')&&L.total===36&&L.hs125===1;
C.f3=L3.etat==='lisse'&&eq(H(L3),[8.25,8.25,8.25,8.25,8.5,null])&&L3.total===41.5&&!L3.flags.includes('ferieT')&&!L3.flags.includes('regle')&&L3.fixeH===0&&L3.jours.every(j=>!j.fixe&&!j.tag);
// f4 · f5
const RG={reel:['2026-11-17'],motif:'intempéries le mardi (fictif)',by:'Claude FICTIF',at:'2026-11-23T08:00:00.000Z'};
L=S('2026-11-16',[10,6,8,8,8],{o:{regle:RG}});console.log('f4)',H(L),L.flags.join(),'|',L.expl.join(' | '));
C.f4=L.etat==='lisse'&&eq(H(L),[8.5,6,8.5,8.5,8.5,null])&&L.total===40&&L.jours[1].fixe&&!L.jours[1].ferT&&!L.jours[1].tag&&L.flags.includes('regle')&&!L.flags.includes('ferieT')&&!L.flags.includes('main')
  &&L.expl.some(t=>/^Mardi 17\/11 : au réel pour tout le monde \(règle de la semaine\) — 6 h, pas lissé\.$/.test(t))&&L.expl.some(t=>/^Règle de la semaine pour tout le monde posée par Claude FICTIF le 23\/11\/2026 — intempéries le mardi \(fictif\)\.$/.test(t));
const sans=S('2026-11-16',[8,8,8,8,8,4]);L=S('2026-11-16',[8,8,8,8,8,4],{o:{regle:{reel:['2026-11-21'],motif:'samedi payé à part (fictif)'}}});console.log('f5)',H(sans),H(L));
C.f5=eq(H(sans),[8.75,8.75,8.75,8.75,9,null])&&eq(H(L),[8,8,8,8,8,4])&&L.total===44&&sans.total===44&&L.jours[5].fixe&&L.flags.includes('regle');
// f6 · f7
L=S('2026-11-16',[10,6,8,9,8.5],{o:{regle:{mode:'reel',motif:'semaine de reprise (fictif)',by:'Claude FICTIF'}}});console.log('f6)',L.etat,H(L),'|',L.expl.join(' | '));
C.f6=L.etat==='reel'&&eq(H(L),[10,6,8,9,8.5,null])&&L.total===41.5&&L.flags.includes('regle')&&!L.flags.includes('main')&&L.expl.some(t=>/^Semaine aux heures réelles pour tout le monde \(règle de la semaine\) : les heures réelles jour par jour\./.test(t));
const a=S(MON,[10,9,6.5,9,7],{fer:FER,o:{main:{on:['2026-11-11'],motif:'accord (fictif)',by:'Claude FICTIF'}}});
const b=S('2026-11-16',[10,6,8,9,8.5],{o:{regle:{mode:'reel'},main:{mode:'auto',off:['2026-11-20'],motif:'x',by:'Claude FICTIF'}}});
const b2=S('2026-11-16',[10,6,8,9,8.5],{o:{regle:{mode:'reel'},main:{mode:'auto',malgre:true,motif:'x',by:'Claude FICTIF'}}});
const c=S('2026-11-16',[10,6,8,8,8],{o:{regle:RG,main:{mode:'main',h:[8,8,8,8,8,null],motif:'x',by:'Claude FICTIF'}}});
const c2=S('2026-11-16',[10,6,8,8,8],{o:{regle:{mode:'reel'},main:{mode:'main',h:[8,8,8,8,8,null],motif:'x',by:'Claude FICTIF'}}});
const d=S(MON,[10,9,6.5,9,7],{fer:FER,o:{main:{mode:'reel',motif:'x',by:'Claude FICTIF'}}});console.log('f7)',H(a),a.flags.join(),'|',b.etat,H(b),'|',c.etat,H(c),'|',d.etat,H(d));
C.f7=eq(H(a),[8.25,8.25,8.25,8.25,8.5,null])&&a.flags.includes('main')&&!a.flags.includes('ferieT')&&!a.jours[2].fixe&&a.jours[2].fixe0&&a.expl.some(t=>/mercredi 11\/11 : lissé quand même \(à la main\), malgré le férié travaillé\./.test(t))
  &&b.etat==='reel'&&eq(H(b),[10,6,8,9,8.5,null])&&b.flags.includes('regle') /* un ancien réglage « auto » (jour retiré) n'annule pas la règle « semaine au réel » */
  &&b2.etat==='lisse'&&eq(H(b2),[8.25,8.25,8.25,8.25,8.5,null])&&b2.flags.includes('main')&&!b2.flags.includes('regle')&&b2.expl.some(t=>/^La règle de la semaine \(heures réelles pour tout le monde\) ne s'applique pas ici/.test(t))
  &&c.etat==='main'&&eq(H(c),[8,8,8,8,8,null])&&c2.etat==='main'&&eq(H(c2),[8,8,8,8,8,null])&&d.etat==='reel'&&eq(H(d),[10,9,6.5,9,7,null])&&d.flags.includes('main');
// f8 · f9
L=S(MON,[12,12,10,12,12],{fer:FER});console.log('f8)',H(L),L.cap,L.versReport,L.versReportMaj,L.total,L.hs125,L.hs150,'|',L.expl.filter(t=>/Plafond/.test(t)).join(''));
C.f8=eq(H(L),[9.5,9.5,10,9.5,9.5,null])&&L.cap===38&&L.versReport===10&&L.versReportMaj===15&&L.total===HEBDO_MAX&&L.hs125===8&&L.hs150===5&&L.expl.some(t=>/^Plafond 38 h \(48 h par semaine moins 10 h au réel\) : 10 h au-delà/.test(t));
L=S(MON,[8.4,8.3,7.87,8.4,8.3],{fer:FER});console.log('f9)',H(L),L.reel,L.reelA,L.total);
/* 24/11 (Ethan : « il faut que les totaux affichés aient le même arrondi ») : le jour au réel est lui aussi en quarts d'heure, le total = le total réel arrondi */
C.f9=eq(H(L),[8.25,8.25,7.75,8.25,8.75,null])&&L.reel===41.27&&L.reelA===41.25&&L.total===41.25&&L.fixeH===7.75&&L.expl.some(t=>/^Total arrondi au quart d'heure le plus proche : 41,27 h → 41,25 h\.$/.test(t))&&L.expl.some(t=>/férié travaillé — 7,75 h au réel/.test(t));
// f10 : la règle rend le férié travaillé au lissage pour tout le monde · f11 : férié travaillé un samedi (15 août 2026) → au réel, pas reporté sur la semaine
L=S(MON,[10,9,6.5,9,7],{fer:FER,o:{regle:{liss:['2026-11-11'],motif:'accord d\'entreprise (fictif)',by:'Claude FICTIF'}}});console.log('f10)',H(L),L.flags.join(),'|',L.expl.filter(t=>/règle/i.test(t)).join(' | '));
C.f10=L.etat==='lisse'&&eq(H(L),[8.25,8.25,8.25,8.25,8.5,null])&&L.n===5&&L.fixeH===0&&!L.jours[2].fixe&&!L.jours[2].fixe0&&L.jours[2].ferT&&L.flags.includes('regle')&&!L.flags.includes('ferieT')&&!L.flags.includes('main')
  &&L.expl.some(t=>/^Mercredi 11\/11 : férié travaillé, lissé comme un autre jour pour tout le monde \(règle de la semaine\)\.$/.test(t));
L=S('2026-08-10',[8,8,8,8,8,5],{fer:[0,0,0,0,0,1]});console.log('f11)',H(L),L.total,L.flags.join());
C.f11=L.etat==='lisse'&&eq(H(L),[8,8,8,8,8,5])&&L.total===45&&L.jours[5].fixe&&L.jours[5].ferT&&L.jours[5].tag==='FÉRIÉ TRAVAILLÉ'&&L.flags.includes('ferieT')&&L.hs125===8&&L.hs150===2;
// f12 : férié travaillé PLAFONNÉ à 12 h — le reste rejoint les heures lissées ; au-delà de 48 h : en surplus (compteur à reporter)
L=S(MON,[10,10,13.5,10,4],{fer:FER});const L12=S(MON,[12,12,13,12,12],{fer:FER});console.log('f12)',H(L),L.total,L.fixeH,'|',H(L12),L12.total,L12.versReport,L12.versReportMaj,'|',L.expl.filter(t=>/plafonn/.test(t)).join(''));
C.f12=eq(H(L),[8.75,8.75,12,8.75,9.25,null])&&L.total===47.5&&L.fixeH===12&&L.versReport===0&&L.expl.some(t=>/^Mercredi 11\/11 : férié travaillé — 12 h au réel \(heures majorées\), pas lissé \(13,5 h pointées, plafonné à 12 h : le reste est lissé sur les autres jours\)\.$/.test(t))
  &&eq(H(L12),[9,9,12,9,9,null])&&L12.total===48&&L12.versReport===13&&L12.reel===61;
// f13 : règle commune « jour non travaillé pour tout le monde » (pont, fermeture) : pas attendu, pas lissé, son libellé sur la navette
{const sansR=S('2026-11-16',[8,8,8,8,null]);const avecR=S('2026-11-16',[8,8,8,8,null],{o:{regle:{ferme:['2026-11-20'],fermeLab:'fermeture',motif:'dépôt fermé (fictif)',by:'Claude FICTIF'}}});const pt=S('2026-11-16',[8,8,8,8,6],{o:{regle:{ferme:['2026-11-20']}}});
 console.log('f13)',sansR.etat,H(sansR),'|',avecR.etat,H(avecR),avecR.jours[4].lab,avecR.cible,avecR.flags.join(),'|',H(pt),pt.jours[4].lab,'|',avecR.expl.filter(t=>/fermeture/i.test(t)).join(' | '));
 /* 24/11 : sans la règle, le vendredi non pointé n'est plus « attendu » (la semaine se lisse sur 5 jours, objectif 35 h) ; avec la règle, 4 jours et un objectif de 28 h */
 C.f13=sansR.etat==='lisse'&&eq(H(sansR),[6.25,6.25,6.25,6.25,7,null])&&sansR.cible===35&&avecR.etat==='lisse'&&eq(H(avecR),[8,8,8,8,null,null])&&avecR.jours[4].lab==='FERMETURE'&&avecR.jours[4].ferme&&avecR.n===4&&avecR.cible===28&&avecR.flags.includes('regle')&&avecR.trous.length===0
  &&avecR.expl.some(t=>/vendredi 20\/11 : fermeture pour tout le monde \(règle de la semaine\), pas lissé/.test(t))&&eq(H(pt),[7.5,7.5,7.5,7.5,8,null])&&pt.jours[4].lab===''&&!pt.jours[4].ferme;}
// f14 : semaines pas lissées (à compléter, en cours, heures réelles) : en quarts d'heure aussi, la somme = le total réel arrondi
{const inc=S('2026-11-16',[8.48,null,7.9,8.1,8.02]);const J2=[0,1,2,3,4,5].map(i=>({d:addDay('2026-11-23',i),h:i===0?8.48:null,it:0,plan:i<5,ferie:false,abs:null,sites:[],futur:i>0}));const enc=lisserSemaine({mon:'2026-11-23',contrat:35,jours:J2});
 console.log('f14)',inc.etat,H(inc),inc.total,inc.reel,'|',enc.etat,H(enc),enc.total,enc.reel);
 C.f14=inc.etat==='incomplet'&&eq(H(inc),[8.5,null,8,8,8,null])&&inc.total===32.5&&inc.reel===32.5&&enc.etat==='encours'&&eq(H(enc),[8.5,null,null,null,null,null])&&enc.total===8.5&&enc.reel===8.48&&enc.expl.some(t=>/^Total arrondi au quart d'heure le plus proche : 8,48 h → 8,5 h\.$/.test(t));}
// ── heures sup : recalcul à part ──
let seed=20261119;const rnd=()=>{seed=(seed*1103515245+12345)%2147483648;return seed/2147483648;};const pick=a=>a[Math.floor(rnd()*a.length)];
const hsRef=(T,Ct)=>{const t=Math.min(T,48);return {h125:r2(Math.max(0,Math.min(t,43)-Math.max(Ct,35))),h150:r2(Math.max(0,t-Math.max(Ct,43)))};};
const ctxOf=sh=>{const memo={};const ctx={hasSheet:()=>true,bounds:()=>({maxR:400,maxC:12}),name:()=>null,rowHidden:()=>false,val:(s,r,c)=>{const a=X.colName(c)+r;if(a in memo)return memo[a];const cell=sh.cells[a];let v=null;if(cell){if(cell.f){memo[a]=0;v=X.evalFormula(X.parseFormula(cell.f),ctx,{sh:'N',r,c});}else v=cell.v===undefined?null:cell.v;}memo[a]=v;return v;}};return ctx;};
const cellOf=(sh,lab)=>{const a=Object.keys(sh.cells).find(k=>sh.cells[k]&&sh.cells[k].v===lab);return a?X.parseAddr(a):null;};
let nW=0,bad=[];const YM='2026-11';const W=navWeeks(YM);
for(let t=0;t<150;t++){const Ct=pick([35,35,35,39]);const fer=d=>d==='2026-11-11'||d==='2026-11-01';const hours={},abs={},LS={};const regles={};
  W.forEach(mon=>{if(rnd()<0.15)regles[mon]=rnd()<0.5?{mode:'reel'}:{reel:[addDay(mon,Math.floor(rnd()*6))]};
    for(let i=0;i<6;i++){const dd=addDay(mon,i);const p=rnd();if(i===5){hours[dd]=p<0.2?pick([3,4,5.5,6]):null;continue;}
      if(fer(dd)){hours[dd]=p<0.5?pick([4,6.5,7.87,8,10]):null;continue;}if(p<0.08){abs[dd]='Congés payés';hours[dd]=null;continue;}hours[dd]=pick([6,7,7.5,8,8.4,9,9.5,10,11,12,12.5]);}});
  W.forEach(mon=>{LS[mon]=lisserSemaine({mon,contrat:Ct,regle:regles[mon]||null,jours:[0,1,2,3,4,5].map(i=>{const dd=addDay(mon,i);return {d:dd,h:hours[dd],it:0,plan:i<5&&!abs[dd],ferie:i<5&&fer(dd),abs:abs[dd]||null,sites:[{id:'sA',nom:'CHANTIER FICTIF'}],futur:false};})});});
  const N=buildNavette({ym:YM,nom:'FICTIF',prenom:'Claude',contrat:Ct,liss:mon=>LS[mon]||null,day:dd=>({sites:[{id:'sA',nom:'CHANTIER FICTIF',km:10,idf:false}],worked:hours[dd]!=null,ferie:fer(dd),hours:hours[dd]==null?null:hours[dd],N:0,L:0,D:0,ar:0,cas:1})});
  const sh=navetteSheet(N,'FICTIF Claude');const ctx=ctxOf(sh);const V=a=>{const q=X.parseAddr(a);return ctx.val('N',q.r,q.c);};
  let s125=0,s150=0,sRep=0;
  N.weeks.forEach((w,wi)=>{nW++;const Lw=LS[w.mon];const jours=r2(Lw.jours.reduce((s,j)=>s+(j.h||0),0));const tot=r2(jours+r2(Lw.deReport+Lw.deRecup+Lw.place+Lw.repl));const ref=hsRef(tot,Ct);s125=r2(s125+ref.h125);s150=r2(s150+ref.h150);sRep=r2(sRep+(Lw.versReport||0));
    if(Math.abs(w.total-tot)>0.006||Math.abs(w.hs125-ref.h125)>0.006||Math.abs(w.hs150-ref.h150)>0.006)bad.push('tableau S'+w.n+' c'+Ct+' : '+JSON.stringify({tot,w:w.total,ref,hs:[w.hs125,w.hs150]}));
    /* la feuille : TOTAL SEMAINE (samedi) = somme des jours ; lignes HEURES SUP */
    const sat=Object.keys(sh.cells).find(k=>/^H\d+$/.test(k)&&String(sh.cells[k].v||'').startsWith('TOTAL SEMAINE - '+w.n));const rS=+sat.slice(1);const tX=r2(+V('I'+rS)||0);
    const rows125=Object.keys(sh.cells).filter(k=>/^H\d+$/.test(k)&&sh.cells[k].v==='HEURES SUP - 125%').map(k=>+k.slice(1)).sort((p,q)=>p-q),rows150=Object.keys(sh.cells).filter(k=>/^H\d+$/.test(k)&&sh.cells[k].v==='HEURES SUP - 150%').map(k=>+k.slice(1)).sort((p,q)=>p-q);
    const x125=r2(+V('I'+rows125[wi])||0),x150=r2(+V('I'+rows150[wi])||0);
    if(Math.abs(tX-tot)>0.006||Math.abs(x125-ref.h125)>0.006||Math.abs(x150-ref.h150)>0.006)bad.push('feuille S'+w.n+' c'+Ct+' : '+JSON.stringify({tot,tX,ref,x:[x125,x150]}));});
  if(Math.abs(N.hs.h125-s125)>0.006||Math.abs(N.hs.h150-s150)>0.006)bad.push('mois : '+JSON.stringify({N:N.hs,s125,s150}));
  /* récaps du bas : « HS du mois » */
  const q125=Object.keys(sh.cells).filter(k=>sh.cells[k].v==='NB HEURES 125%').map(k=>X.parseAddr(k)).sort((p,q)=>p.r-q.r)[0],q150=Object.keys(sh.cells).filter(k=>sh.cells[k].v==='NB HEURES 150%').map(k=>X.parseAddr(k)).sort((p,q)=>p.r-q.r)[0];
  const b125=r2(+ctx.val('N',q125.r,q125.c+1)||0),b150=r2(+ctx.val('N',q150.r,q150.c+1)||0),bTot=r2(+ctx.val('N',q150.r+1,q150.c+1)||0);
  const qRep=cellOf(sh,'Heures du mois au-delà du plafond ('+HEBDO_MAX+' h, 12 h par jour)');const bRep=qRep?r2(+ctx.val('N',qRep.r,qRep.c+1)||0):null;
  if(Math.abs(b125-s125)>0.006||Math.abs(b150-s150)>0.006||Math.abs(bTot-r2(s125+s150))>0.006||(bRep!==null&&Math.abs(bRep-sRep)>0.006))bad.push('récap du bas c'+Ct+' : '+JSON.stringify({b125,b150,bTot,bRep,s125,s150,sRep}));}
console.log('h1-h2)',nW,'semaines ·',bad.length,'écart(s)',bad.slice(0,6).join('\n   '));
C.h1=nW===150*W.length&&!bad.some(x=>/^tableau|^mois/.test(x));C.h2=!bad.some(x=>/^feuille|^récap/.test(x));
const KO=Object.keys(C).filter(k=>!C[k]);console.log(JSON.stringify(C));console.log(KO.length?'RESULTAT: ECHEC '+KO.join(','):'RESULTAT: TOUT VERT');process.exit(KO.length?1:0);
