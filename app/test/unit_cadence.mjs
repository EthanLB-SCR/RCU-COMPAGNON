// unit_cadence.mjs — 16/11/2026 (lot CA) : heures débloquées par la production (cadences de la base de prix) face aux heures pointées — src/cadence.js, dans Node.
// Base FICTIVE test/fixture_prix.xlsx (V99, 10 h / jour). Valeurs attendues calculées À LA MAIN :
//   DN 100 : soudure S 5 / jour → 2 h ; S+T 10 / jour → 1 h ; 4 pouces · DN 50 : 10 et 20 / jour → 1 h et 0,5 h · DN 200 : 2 et 5 / jour → 5 h et 2 h
//   manchon thermo DN 100 : M 5 / jour → 2 h ; M+M 10 / jour → 2 h-personne (1 h chacun) · électro : M 4 / jour → 2,5 h · fils DH : 3 min = 0,05 h
//   panier « SST — VANNES BS PN25 » DN 100 : 2 soudures à la cadence S = 4 h la paire → 2 h le point · « VANNES PAP PN25 » : 3 soudures = 6 h → 3 h le point
//   raccordement insertion de tés DN 100 : S+T+P 8 h + M 8 h → 4 h soudeur et 4 h manchonneur le point · attente : 6 + 6 → 3 et 3 · piquage en charge : S+T 10 h → 5 h
//   by-pass 4 h la paire → 2 h le point · fonds bombés 2 h → 1 h · manchon extrudé gaine 110 : 2 h × M+M = 4 h-personne
//  u1 référence publiée : aucun prix, aucun taux ; u2 barème ; u3 soudeur + tuyauteur ; u4 soudeur seul, semaine trop courte ; u5 deux soudeurs, un tuyauteur ;
//  u6 deux manchonneurs (un seul pointe) puis un seul ; u7 pointage en retard (samedi) ; u8 tuyauteur sans soudeur ; u9 chef qui signe ; u10 panier : part manchonneur ;
//  u11 DN inconnu, point sans référence, fin de ligne ; u12 état, série, record, semaines figées, compteurs de l'avatar ; u13 soudeur sur un chantier où il n'est pas planifié ;
//  u14 autre panier SST de référence, réglages (heures minimum, série en cours, essai « encadrement seulement » par défaut) ; u15 base vide / référence abîmée : rien, pas d'erreur ;
//  u16 équipes par lettre sur un même chantier : tuyauteur absent, deux tuyauteurs pour un soudeur, manchonneurs aux heures différentes, soudeur qui pose un manchon ;
//  u17 chauffeur d'engin dans l'équipe (ou sur le chantier, sans lettre) → cadence S+T+P ; il n'est pas compté lui-même
import fs from 'fs';import path from 'path';import {fileURLToPath} from 'url';
import {parsePrixWorkbook} from '../src/prix.js';
import {cadRef,cadRefOk,cadSoud,cadPan,cadManch,cadDH,cadPanKey,cadBareme,cadSemaine,cadEtat,cadSerie,cadCompteurs,cadAvatar,cadCle,CAD_KEY,CAD_MINH} from '../src/cadence.js';
const HERE=path.dirname(fileURLToPath(import.meta.url));const C={};const J=x=>JSON.stringify(x);const eq=(a,b)=>Math.abs(a-b)<1e-6;
const buf=fs.readFileSync(path.join(HERE,'fixture_prix.xlsx'));const base=await parsePrixWorkbook(buf.buffer.slice(buf.byteOffset,buf.byteOffset+buf.byteLength),{name:'fixture_prix.xlsx'});
const ref=cadRef(base,{par:'Ana TESTADMIN',rev:'r1',at:'2026-11-16T08:00:00.000Z'});
// ── u1
const txt=J(ref);const d100=ref.dn.find(r=>r.dn===100);
const u1={cles:Object.keys(ref).sort().join(),n:ref.dn.length,H:ref.H,minH:ref.minH,etinc:ref.etinc,d100:J(d100),pan:Object.keys(ref.pan).sort().join(),sst:ref.pan.sst.id,sst100:J(ref.pan.sst.dn[100]),ins:J(ref.pan.insertion.dn[100]),att:J(ref.pan.attente.dn[100]),pec:J(ref.pan.pec.dn[100]),fonds:J(ref.pan.fonds.dn[100]),bp:J(ref.pan.bypass.dn[100]),ext:ref.ext[110],
  sansPrix:!/taux|"fo"|postes|rate|amount|pu"|prix|total|fgC|sin"/i.test(txt),taille:txt.length,ok:cadRefOk(ref),cle:CAD_KEY};
console.log('u1) référence :',J(u1));
C.u1=u1.cles==='H,at,base,dn,etinc,ext,minH,pan,par,pour,v'&&ref.pour==='enc'&&u1.n===18&&u1.H===10&&u1.minH===20&&CAD_MINH===20&&u1.etinc==='record'&&u1.d100===J({dn:100,po:4,s:[5,10,10],mt:[[10,5],[10,5],[10,5]],me:[[8,4],[8,4],[8,4]],dh:3})
  &&u1.pan==='attente,bypass,fonds,insertion,pec,sst'&&u1.sst==='sst_vannes_bs_pn25'&&u1.sst100==='[4,0]'&&u1.ins==='[8,8]'&&u1.att==='[6,6]'&&u1.pec==='[10,0]'&&u1.fonds==='[2,0]'&&u1.bp==='[4,0]'&&u1.ext===4&&u1.sansPrix&&u1.taille<12000&&u1.ok&&u1.cle==='cadences_prod';
// ── u2
const u2={s0:cadSoud(ref,100,0).h,s1:cadSoud(ref,100,1).h,s5:cadSoud(ref,'100',0.5).h,s50:cadSoud(ref,50,1).h,s200:cadSoud(ref,200,0).h,po:cadSoud(ref,100,1).po,approx:J([cadSoud(ref,110,1).dn,cadSoud(ref,110,1).approx]),nul:cadSoud(ref,'?',1),
  sst:cadPan(ref,'sst',100).hS,sst150:J([cadPan(ref,'sst',150).dn,cadPan(ref,'sst',150).approx,cadPan(ref,'sst',150).hS]),ins:J([cadPan(ref,'insertion',100).hS,cadPan(ref,'insertion',100).phM]),pec:cadPan(ref,'pec',80).hS,fonds:cadPan(ref,'fonds',100).hS,bp:cadPan(ref,'bypass',100).hS,
  m0:cadManch(ref,100,'retracte',2,0).ph,m1:cadManch(ref,100,'thermo',1,1).ph,e0:cadManch(ref,100,'electro',3,0).ph,ext:J([cadManch(ref,100,'extrude',2,0,110).ph,cadManch(ref,100,'extrude',2,0,112).pehd]),dh:cadDH(ref,100).h,
  keys:[cadPanKey('sousstation','sst'),cadPanKey('chaufferie','sst'),cadPanKey('','sst'),cadPanKey('pec','bout'),cadPanKey('insertion','bout'),cadPanKey('attente','bout'),cadPanKey('kit','bout'),cadPanKey('fondbombe_regard','bout'),cadPanKey('bypass_regard','bout'),cadPanKey('zzz','bout')].join(),
  bar:J((b=>({soudS:b.soudS,soudST:b.soudST,soudSTP:b.soudSTP,manchM:b.manchM,manchMM:b.manchMM,electroM:b.electroM,dh:b.dh,sst:b.pan.sst,pec:b.pan.pec}))(cadBareme(ref).find(b=>b.dn===100))),bar150:J(cadBareme(ref).find(b=>b.dn===150).pan)};
console.log('u2) barème :',J(u2));
C.u2=eq(u2.s0,2)&&eq(u2.s1,1)&&eq(u2.s5,1.5)&&eq(u2.s50,0.5)&&eq(u2.s200,5)&&u2.po===4&&u2.approx==='[100,true]'&&u2.nul===null&&eq(u2.sst,2)&&u2.sst150==='[100,true,2]'&&u2.ins==='[4,4]'&&eq(u2.pec,5)&&eq(u2.fonds,1)&&eq(u2.bp,2)
  &&eq(u2.m0,2)&&eq(u2.m1,2)&&eq(u2.e0,2.5)&&u2.ext==='[4,110]'&&eq(u2.dh,0.05)&&u2.keys==='sst,sst,sst,pec,insertion,attente,fonds,fonds,bypass,'
  &&u2.bar===J({soudS:2,soudST:1,soudSTP:1,manchM:2,manchMM:1,electroM:2.5,dh:0.05,sst:2,pec:5})&&u2.bar150===J({insertion:6,attente:3}); /* DN 150 : pas de ligne by-pass / fonds bombés ni de panier SST dans la base fictive → colonnes absentes à ce DN */
// ── la semaine du 09/11 (lundi) au 15/11/2026 (dimanche)
const JS=['2026-11-09','2026-11-10','2026-11-11','2026-11-12','2026-11-13','2026-11-14','2026-11-15'];const [LU,MA,ME,JE,VE,SA,DI]=JS;
const rep=(by,d,k,n,o)=>Array.from({length:n},()=>Object.assign({by,d,k,dn:'100',site:'X'},o||{}));
const jours=(ds,h)=>Object.fromEntries(ds.map(d=>[d,h]));const sur=(ds,s)=>Object.fromEntries(ds.map(d=>[d,[s]]));
// ── u3 : Karim (soudeur) + Paul (tuyauteur), équipe A, chantier X, lundi → jeudi 10 h
const W3={jours:JS,gens:{karim:{m:'S'},paul:{m:'T'},chef:{m:''}},h:{karim:jours([LU,MA,ME,JE],10),paul:jours([LU,MA,ME,JE],10)},ici:{karim:sur([LU,MA,ME,JE],'X'),paul:sur([LU,MA,ME,JE],'X')},eq:{karim:{X:'A'},paul:{X:'A'}},
  ops:[].concat(rep('karim',LU,1,10),rep('karim',MA,1,12),rep('karim',ME,'sst',1,{end:'sousstation'}),rep('karim',ME,1,6),rep('karim',JE,1,11))};
const R3=cadSemaine(ref,W3);const k3=R3.par.karim,p3=R3.par.paul;
const u3={k:[k3.hd,k3.hp,k3.po,k3.n],p:[p3.hd,p3.hp,p3.po],jours:JS.slice(0,4).map(d=>k3.jours[d].hd),me:k3.jours[ME].L.map(l=>[l.t,l.n,l.hu,l.h,l.f===undefined?null:l.f].join('/')).join(' | '),eqLu:J(k3.jours[LU].eq.map(e=>[e.site,e.e,e.S,e.T])),recu:J(p3.jours[LU].L.map(l=>[l.t,l.h,l.de,l.nS])),etat:[cadEtat(ref,k3.hd,k3.hp).k,cadEtat(ref,k3.hd,k3.hp).ecart].join(),chef:R3.par.chef===undefined};
console.log('u3) soudeur + tuyauteur :',J(u3));
C.u3=J(u3.k)==='[41,40,156,40]'&&J(u3.p)==='[41,40,156]'&&J(u3.jours)==='[10,12,8,11]'&&u3.me==='soud/6/1/6/1 | sst/1/2/2/'&&u3.eqLu===J([['X','A',['karim'],['paul']]])&&u3.recu===J([['recu',10,['karim'],1]])&&u3.etat==='dessus,1'&&u3.chef;
// ── u4 : soudeuse seule (cadence S), une seule journée → semaine neutre (moins de 20 h)
const R4=cadSemaine(ref,{jours:JS,gens:{lina:{m:'S'}},h:{lina:jours([LU],10)},ici:{lina:sur([LU],'Y')},eq:{},ops:rep('lina',LU,1,5,{site:'Y'})});const l4=R4.par.lina;
const u4={l:[l4.hd,l4.hp,l4.po],f:l4.jours[LU].L[0].f,hu:l4.jours[LU].L[0].hu,etat:J(cadEtat(ref,l4.hd,l4.hp)),sansProd:J(cadEtat(ref,0,40)),dessous:J(cadEtat(ref,39.99,40)),pile:cadEtat(ref,40,40).k};
console.log('u4) seule, semaine courte :',J(u4));
C.u4=J(u4.l)==='[10,10,20]'&&u4.f===0&&u4.hu===2&&u4.etat===J({k:'neutre',why:'heures',min:20})&&u4.sansProd===J({k:'neutre',why:'prod',min:20})&&u4.dessous===J({k:'dessous',why:'',min:20,ecart:-0.01})&&u4.pile==='dessus';
// ── u5 : deux soudeurs, un tuyauteur (f = 0,5 → 1,5 h la soudure DN 100) ; le tuyauteur reçoit la moyenne (9 + 12) ÷ 2 = 10,5 h, et le cumul des pouces
const R5=cadSemaine(ref,{jours:JS,gens:{s1:{m:'S'},s2:{m:'S'},t:{m:'T'}},h:{s1:jours([LU],10),s2:jours([LU],10),t:jours([LU],10)},ici:{s1:sur([LU],'X'),s2:sur([LU],'X'),t:sur([LU],'X')},eq:{},ops:[].concat(rep('s1',LU,1,6),rep('s2',LU,1,8))});
const u5={s1:R5.par.s1.hd,s2:R5.par.s2.hd,t:[R5.par.t.hd,R5.par.t.po],f:R5.par.s1.jours[LU].L[0].f};console.log('u5) 2 soudeurs + 1 tuyauteur :',J(u5));
C.u5=u5.s1===9&&u5.s2===12&&J(u5.t)==='[10.5,56]'&&u5.f===0.5;
// ── u6 : deux manchonneurs équipe B lundi (un seul pointe : 9 manchons thermo à deux = 18 h-personne + 9 fils DH = 0,45 h → 9,225 h chacun) ; mardi m1 seul : 4 manchons × 2 h = 8 h
const R6=cadSemaine(ref,{jours:JS,gens:{m1:{m:'M'},m2:{m:'M'}},h:{m1:jours([LU,MA],10),m2:jours([LU],10)},ici:{m1:sur([LU,MA],'X'),m2:sur([LU],'X')},eq:{m1:{X:'B'},m2:{X:'B'}},
  ops:[].concat(rep('m1',LU,3,9,{mt:'retracte',iso:2}),rep('m1',LU,2,9),rep('m1',MA,3,4,{mt:'thermo',iso:2}))});const a6=R6.par.m1,b6=R6.par.m2;
const u6={m1:[a6.hd,a6.hp,a6.po,a6.n],m2:[b6.hd,b6.hp,b6.po,b6.n],lu:a6.jours[LU].L.map(l=>[l.t,Math.round(l.pot*1000)/1000,l.part,l.avec,l.lignes.map(x=>[x.t,x.n,x.hu,Math.round(x.h*100)/100].join('/')).join(';')].join('|')).join(),ma:a6.jours[MA].L.map(l=>[l.t,l.pot,l.part,l.lignes.map(x=>[x.t,x.n,x.hu,x.g].join('/')).join(';')].join('|')).join()};
console.log('u6) manchonneurs :',J(u6));
C.u6=J(u6.m1)==='[17.23,20,34,22]'&&J(u6.m2)==='[9.23,10,18,0]'&&u6.lu==='pot|18.45|0.5|m2|manch/9/2/18;dh/9/0.05/0.45'&&u6.ma==='pot|8|1|manch/4/2/0';
// ── u7 : 3 soudures pointées le SAMEDI (aucune heure) → comptées jeudi, avec l'équipe de jeudi (1 h la soudure), le tuyauteur les reçoit aussi
const W7=JSON.parse(J(W3));W7.ops=W7.ops.concat(rep('karim',SA,1,3));const R7=cadSemaine(ref,W7);
const u7={k:[R7.par.karim.hd,R7.par.karim.hp],je:R7.par.karim.jours[JE].hd,sa:R7.par.karim.jours[SA]===undefined,p:R7.par.paul.hd,late:R7.par.karim.jours[JE].L.map(l=>l.n).join()};console.log('u7) pointage du samedi :',J(u7));
C.u7=J(u7.k)==='[44,40]'&&u7.je===14&&u7.sa&&u7.p===44&&u7.late==='14';
// ── u8 : vendredi, Paul (tuyauteur) pointe 8 h sans soudeur → ces heures ne comptent pas (48 h pointées, 40 h comparées)
const W8=JSON.parse(J(W3));W8.h.paul[VE]=8;W8.ici.paul[VE]=['X'];const R8=cadSemaine(ref,W8);
const u8={p:[R8.par.paul.hd,R8.par.paul.hp,R8.par.paul.hpTot],ve:J([R8.par.paul.jours[VE].hp,R8.par.paul.jours[VE].hors])};console.log('u8) tuyauteur sans soudeur :',J(u8));
C.u8=J(u8.p)==='[41,40,48]'&&u8.ve==='[0,8]';
// ── u9 : le chef (pas opérateur) signe 5 soudures → personne n'est crédité, c'est noté à part
const W9=JSON.parse(J(W3));W9.ops=W9.ops.concat(rep('chef',LU,1,5));const R9=cadSemaine(ref,W9);
const u9={k:R9.par.karim.hd,autres:R9.autres.length,chef:R9.par.chef===undefined};console.log('u9) chef qui signe :',J(u9));C.u9=u9.k===41&&u9.autres===5&&u9.chef;
// ── u10 : raccordement par insertion de tés DN 100 pointé par Karim → 4 h pour lui (et son tuyauteur), 4 h pour le manchonneur de la même équipe ce jour-là
const W10=JSON.parse(J(W3));W10.gens.m3={m:'M'};W10.h.m3=jours([LU],10);W10.ici.m3=sur([LU],'X');W10.eq.m3={X:'A'};W10.ops=W10.ops.concat(rep('karim',LU,'bout',1,{end:'insertion'}));const R10=cadSemaine(ref,W10);
const u10={k:R10.par.karim.jours[LU].hd,p:R10.par.paul.jours[LU].hd,m:[R10.par.m3.hd,R10.par.m3.jours[LU].L[0].lignes.map(x=>[x.t,x.key,x.hu].join('/')).join()],l:R10.par.karim.jours[LU].L.map(l=>[l.t,l.key||'',l.n,l.hu,l.pan||''].join('/')).join(' | ')};
console.log('u10) panier avec part manchonneur :',J(u10));C.u10=u10.k===14&&u10.p===14&&J(u10.m)===J([4,'bout/insertion/4'])&&u10.l==='soud//10/1/ | bout/insertion/1/4/8';
// ── u11 : DN inconnu, point sans panier de référence (0 h, signalé « sans »), fin de ligne (kit → fond bombé 1 h), by-pass 2 h, point SST DN 150 → DN 100 le plus proche
const R11=cadSemaine(ref,{jours:JS,gens:{k:{m:'S'}},h:{k:jours([LU],10)},ici:{k:sur([LU],'X')},eq:{},ops:[{by:'k',d:LU,k:1,dn:'?',site:'X'},{by:'k',d:LU,k:'bout',dn:'100',site:'X',end:'zzz'},{by:'k',d:LU,k:'bout',dn:'100',site:'X',end:'kit'},{by:'k',d:LU,k:'bout',dn:'100',site:'X',end:'bypass'},{by:'k',d:LU,k:'sst',dn:'150',site:'X',end:'chaufferie'}]});
const u11={hd:R11.par.k.hd,n:R11.par.k.n,L:R11.par.k.jours[LU].L.map(l=>[l.t,l.dn,l.sans?'sans':l.hu,l.approx?'~':''].join('/')).join(' | ')};console.log('u11) cas limites :',J(u11));
C.u11=u11.hd===5&&u11.n===3&&u11.L==='soud/?/sans/ | sst/100/2/~ | bout/100/sans/ | bout/100/1/ | bout/100/2/';
// ── u12 : série, record, semaines figées, compteurs de l'avatar
const comp={'c2026-W40':[41,40,150],'c2026-W41':[42,40,160],'c2026-W42':[10,10,30],'c2026-W43':[39,40,140],'c2026-W44':[44,40,170],'c2026-W45':[0,40,0],'c2026-W46':[45.5,40,180.4],avatar:'x',cadence:0,realisations:1000,'c2026-46':[1,1,1]};
const L12=cadCompteurs(comp);const S12=cadSerie(L12.map(x=>({w:x.w,k:cadEtat(ref,x.hd,x.hp).k})));const A12=cadAvatar(ref,comp),B12=cadAvatar(ref,comp,'2026-W46'),D12=cadAvatar(ref,{cadence:7}),E12=cadAvatar(ref,null);
const u12={n:L12.length,w:L12.map(x=>x.w.slice(-2)).join(),etats:L12.map(x=>cadEtat(ref,x.hd,x.hp).k.slice(0,4)+(cadEtat(ref,x.hd,x.hp).why?':'+cadEtat(ref,x.hd,x.hp).why:'')).join(),S:J(S12),A:J(A12),B:J(B12),D:J(D12),E:J(E12),cle:cadCle('2026-W46'),vide:J(cadSerie([])),casse:J(cadSerie([{k:'dessus'},{k:'dessus'},{k:'dessus'},{k:'dessous'},{k:'dessus'}]))};
console.log('u12) série, record :',J(u12));
C.u12=u12.n===7&&u12.w==='40,41,42,43,44,45,46'&&u12.etats==='dess,dess,neut:heures,dess,dess,neut:prod,dess'&&L12[3].hd<L12[3].hp&&u12.S===J({serie:2,record:2})&&u12.A===J({serie:2,record:2,pouces:1830,n:7})&&u12.B===J({serie:1,record:2,pouces:1650,n:6})&&u12.D===J({serie:0,record:7,pouces:0,n:0})&&u12.E===J({serie:0,record:0,pouces:0,n:0})&&u12.cle==='c2026-W46'&&u12.vide===J({serie:0,record:0})&&u12.casse===J({serie:1,record:3});
// ── u13 : Karim soude 2 DN 100 sur le chantier Z où il n'est pas planifié ce jour-là → seul sur ce chantier (cadence S : 2 h), Paul ne reçoit rien de ces deux-là
const W13=JSON.parse(J(W3));W13.ops=W13.ops.concat(rep('karim',LU,1,2,{site:'Z'}));const R13=cadSemaine(ref,W13);
const u13={k:R13.par.karim.jours[LU].hd,p:R13.par.paul.jours[LU].hd,eq:R13.par.karim.jours[LU].eq.map(e=>e.site+':'+e.S.length+'/'+e.T.length).join()};console.log('u13) chantier non planifié :',J(u13));C.u13=u13.k===14&&u13.p===10&&u13.eq==='X:1/1,Z:1/0';
// ── u14 : autre panier SST de référence (3 h le point), heures minimum et mode « série » réglés à la publication
const ref2=cadRef(base,{sst:'sst_vannes_pap_pn25',minH:16,etinc:'serie',pour:'tous'});const ref3=cadRef(base,{sst:'inconnu',pour:'nimporte'});
const u14={id:ref2.pan.sst.id,h:cadPan(ref2,'sst',100).hS,minH:ref2.minH,etinc:ref2.etinc,et:cadEtat(ref2,17,16).k,repli:ref3.pan.sst.id};console.log('u14) réglages :',J(u14));
C.u14=ref2.pour==='tous'&&ref3.pour==='enc'&&u14.id==='sst_vannes_pap_pn25'&&u14.h===3&&u14.minH===16&&u14.etinc==='serie'&&u14.et==='dessus'&&u14.repli==='sst_vannes_bs_pn25';
// ── u15 : rien à calculer → rien, sans erreur
const u15={nul:cadRef(null),vide:cadRef({mo:{cad:[]}}),ko:cadRefOk({v:1,dn:[{dn:100}]}),ko2:cadRefOk(null),sem:J(cadSemaine(null,W3)),sem2:J(cadSemaine(ref,null)),bar:cadBareme(null).length,
  mini:J((r=>[r.dn.length,Object.keys(r.pan).length,cadSoud(r,100,1).h])(cadRef({mo:{hJour:8,cad:[{dn:100,pouce:4,soud:{S:4,'S+T':8},manch:{thermo:[[8,4]]},ctrl:{}}]},op:{}})))};
console.log('u15) vide :',J(u15));C.u15=u15.nul===null&&u15.vide===null&&u15.ko===false&&u15.ko2===false&&u15.sem===J({par:{},autres:[]})&&u15.sem2===J({par:{},autres:[]})&&u15.bar===0&&u15.mini==='[1,0,1]';
// ── u16 : équipes par lettre, le même lundi sur le chantier X
//   A : s1 + t1 (10 h chacun) : 10 soudures DN 100 à 1 h = 10 h ; s1 pose aussi 1 manchon thermo (autre métier : seul, 2 h, pour lui seul) → s1 12 h, t1 10 h
//   B : s2 (10 h) + t2 planifié mais absent (pas d'heures) : 4 soudures à la cadence « seul » 2 h = 8 h ; t2 : rien, pas de journée
//   C : s3 + t3 + t4 (10 h chacun) : 8 soudures à 1 h = 8 h ; chaque tuyauteur reçoit 8 h ; pouces 32 pour s3, 16 par tuyauteur
//   D : m1 (10 h) + m2 (5 h) : m1 pointe 6 manchons électro à deux (2 × 10 ÷ 8 = 2,5 h-personne) = 15 h → m1 10 h, m2 5 h ; pouces 16 et 8
const g16={s1:{m:'S'},t1:{m:'T'},s2:{m:'S'},t2:{m:'T'},s3:{m:'S'},t3:{m:'T'},t4:{m:'T'},m1:{m:'M'},m2:{m:'M'}};const h16={},i16={},e16={};
Object.keys(g16).forEach(id=>{h16[id]=id==='t2'?{}:{[LU]:id==='m2'?5:10};i16[id]={[LU]:['X']};e16[id]={X:{s1:'A',t1:'A',s2:'B',t2:'B',s3:'C',t3:'C',t4:'C',m1:'D',m2:'D'}[id]};});
const R16=cadSemaine(ref,{jours:JS,gens:g16,h:h16,ici:i16,eq:e16,ops:[].concat(rep('s1',LU,1,10),rep('s1',LU,3,1,{mt:'thermo',iso:2}),rep('s2',LU,1,4),rep('s3',LU,1,8),rep('m1',LU,3,6,{mt:'electro',iso:2}))}).par;
const u16={hd:Object.keys(g16).map(id=>id+':'+R16[id].hd).join(),po:['s3','t3','t4','m1','m2','t1'].map(id=>id+':'+R16[id].po).join(),f:[R16.s1.jours[LU].L[0].f,R16.s2.jours[LU].L[0].f,R16.s3.jours[LU].L[0].f].join(),t2:J([R16.t2.hp,Object.keys(R16.t2.jours).length]),s1:R16.s1.jours[LU].L.map(l=>l.t+'/'+l.n+'/'+l.h).join(),m2:R16.m2.jours[LU].L.map(l=>[l.t,l.pot,Math.round(l.part*1000)/1000,l.lignes[0].electro,l.lignes[0].g,l.lignes[0].hu].join('/')).join(),eqA:R16.t1.jours[LU].eq.map(q=>q.e+':'+q.S.join('+')+'/'+q.T.join('+')).join()};
console.log('u16) équipes par lettre :',J(u16));
C.u16=u16.hd==='s1:12,t1:10,s2:8,t2:0,s3:8,t3:8,t4:8,m1:10,m2:5'&&u16.po==='s3:32,t3:16,t4:16,m1:16,m2:8,t1:40'&&u16.f==='1,0,1'&&u16.t2==='[0,0]'&&u16.s1==='soud/10/10,manch/1/2'&&u16.m2==='pot/15/0.333/true/1/2.5'&&u16.eqA==='A:s1/t1';
// ── u17 : chauffeur d'engin dans l'équipe → cadence S+T+P (base à trois cadences : DN 100 seul 5, avec tuyauteur 8, avec tuyauteur + chauffeur 10 par jour)
//   équipe A : sa + ta + chauffeur pa (lettre A) → 1 h la soudure ; équipe B : sb + tb, pas de chauffeur → 1,25 h ; équipe C : sc seul, un chauffeur sans lettre sur le
//   chantier Y → seul reste seul (2 h) ; chantier Y : sd + td (lettre D) + ce même chauffeur sans lettre → 1 h. Le chauffeur n'a ni ligne ni compteur ; ce qu'il signe est noté à part.
const ref3c=cadRef({mo:{hJour:10,cad:[{dn:100,pouce:4,soud:{S:5,'S+T':8,'S+T+P':10},manch:{thermo:[[10,5]]},ctrl:{}}]},op:{}});
const g17={sa:{m:'S'},ta:{m:'T'},pa:{m:'P'},sb:{m:'S'},tb:{m:'T'},sc:{m:'S'},sd:{m:'S'},td:{m:'T'},py:{m:'P'}};const h17={},i17={},e17={};
Object.keys(g17).forEach(id=>{h17[id]={[LU]:10};const y=['sc','sd','td','py'].includes(id);i17[id]={[LU]:[y?'Y':'X']};const L={sa:'A',ta:'A',pa:'A',sb:'B',tb:'B',sc:'C',sd:'D',td:'D'}[id];e17[id]=L?{[y?'Y':'X']:L}:{};});
const R17=cadSemaine(ref3c,{jours:JS,gens:g17,h:h17,ici:i17,eq:e17,ops:[].concat(rep('sa',LU,1,8),rep('sb',LU,1,8),rep('sc',LU,1,4,{site:'Y'}),rep('sd',LU,1,8,{site:'Y'}),rep('pa',LU,1,2))});
const u17={hd:['sa','ta','sb','tb','sc','sd','td'].map(id=>id+':'+R17.par[id].hd).join(),stp:['sa','sb','sc','sd'].map(id=>!!R17.par[id].jours[LU].L[0].stp).join(),cad:['sa','sb','sd'].map(id=>R17.par[id].jours[LU].L[0].cST).join(),pa:[R17.par.pa===undefined,R17.par.py===undefined,R17.autres.length].join(),eqP:[R17.par.sa.jours[LU].eq[0].P,R17.par.sb.jours[LU].eq[0].P,R17.par.sd.jours[LU].eq[0].P].join(),
  bar:J((b=>[b.soudS,b.soudST,b.soudSTP])(cadBareme(ref3c)[0])),un:[cadSoud(ref3c,100,1,true).h,cadSoud(ref3c,100,1,false).h,cadSoud(ref3c,100,0,true).h,cadSoud(ref3c,100,0.5,true).h].join()};
console.log('u17) chauffeur dans l\'équipe :',J(u17));
C.u17=u17.hd==='sa:8,ta:8,sb:10,tb:10,sc:8,sd:8,td:8'&&u17.stp==='true,false,false,true'&&u17.cad==='10,8,10'&&u17.pa==='true,true,2'&&u17.eqP==='1,0,1'&&u17.bar==='[2,1.25,1]'&&u17.un==='1,1.25,2,1.5';
const bad=Object.entries(C).filter(([k,v])=>!v).map(([k])=>k);console.log(bad.length?'RESULTAT: ECHEC '+bad.join(','):'RESULTAT: TOUT VERT');process.exit(bad.length?1:0);
