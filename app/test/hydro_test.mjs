// Tests node du module hydro.js (aucun navigateur) : node test/hydro_test.mjs
import {DN_INT,areaDN,needsFlow,buildHydro} from '../src/hydro.js';
let n=0,ko=0;const ok=(c,msg)=>{n++;if(!c){ko++;console.log('  ✗ '+msg);}else console.log('  ✓ '+msg);};
const near=(a,b,tol)=>Math.abs(a-b)<=tol;

// réseau jouet : principale P (300 m, DN100 puis vanne V1 à 150 m, endcap au bout, joints du bouchon soudés)
// antenne A1 (80 m, DN65) greffée à 100 m, finit en by-pass ; antenne A2 (60 m, DN50) greffée à 220 m, endcap non soudé
const pipe=(m0,m1,dn,kind='pipe',id='P')=>({id,kind,dn,m0,m1,len:m1-m0});
const P={id:'P',name:'Principale',length:300,nCond:2,parent:null,parentM:0,startKind:'endpoint',endKind:'endcap',
  endWelds:[{weldId:'S-0154',status:'controlee',cond:'A'},{weldId:'S-0155',status:'soudee',cond:'R'}],
  els:[pipe(0,148,100),pipe(148,152,100,'valve','V1'),pipe(152,299.5,100),pipe(299.5,300,100,'endcap','B1')]};
const A1={id:'A1',name:'A1',length:80,nCond:2,parent:'P',parentM:100,startKind:'teeout',endKind:'bypass',endWelds:[],
  els:[pipe(0,80,65)]};
const A2={id:'A2',name:'A2',length:60,nCond:2,parent:'P',parentM:220,startKind:'teeout',endKind:'endcap',
  endWelds:[{weldId:'S-0200',status:'a_souder',cond:'A'}],els:[pipe(0,60,50)]};
const LINES=[P,A1,A2];

console.log('— tables —');
ok(near(areaDN(100),Math.PI*.1071*.1071/4,1e-9),'aire DN100');
ok(near(areaDN(100)*3600,32.4,.3),'1 m/s en DN100 ≈ 32 m³/h (maquette)');
ok(near(areaDN(80)*3600,19.2,.3),'1 m/s en DN80 ≈ 19 m³/h (maquette)');
ok(Object.keys(DN_INT).length>=14,'table Ø int complète');
ok(needsFlow({rincage:true})&&!needsFlow({epreuve:true}),'rinçage ⇒ circulation, épreuve seule non');

console.log('— sans coupe, épreuve seule —');
let H=buildHydro(LINES,{prest:{epreuve:true}});
ok(H.troncons.length===1,'1 tronçon');
const T=H.troncons[0];
ok(near(T.lenA,440,.1),'linéaire aller 440 m (300+80+60)');
const volAtt=2*(areaDN(100)*300+areaDN(65)*80+areaDN(50)*60);
ok(near(T.vol,volAtt,.01),'volume A+R = '+volAtt.toFixed(2)+' m³');
ok(T.dnMax===100,'DN max 100');
// extrémités : départ P raccordé (sst), bout P (endcap soudé), bout A1 (bypass), bout A2 (endcap non soudé)
ok(T.ends.length===4,'4 extrémités');
const endOf=(H2,ln,ty)=>H2.troncons.flatMap(t=>t.ends).find(e=>e.line===ln&&e.type===ty);
ok(endOf(H,'P','start').need==='none'&&endOf(H,'P','start').already==='racc','départ = raccordement (réseau existant) : rien à poser');
ok(/raccordement/.test(endOf(H,'P','start').label),'label « raccordement » au départ');
ok(endOf(H,'A1','tip').need==='none'&&endOf(H,'A1','tip').already==='bp','bout A1 déjà bouclé (by-pass)');
ok(endOf(H,'P','tip').need==='KFL'&&endOf(H,'A2','tip').need==='KFL','épreuve seule : bouts en KFL');
ok(H.alerts.length===0,'pas d\'alerte en épreuve seule');

console.log('— rinçage : BP requis + alerte bouchon soudé —');
H=buildHydro(LINES,{prest:{epreuve:true,rincage:true}});
ok(H.flow===true,'flow');
ok(endOf(H,'P','tip').need==='BP'&&endOf(H,'A2','tip').need==='BP','bouts en BP');
ok(H.alerts.length===1&&H.alerts[0].welds.includes('S-0154'),'alerte : bouchon P déjà soudé (S-0154)');
ok(endOf(H,'A2','tip').welded===null,'A2 non soudé : pas d\'alerte');
ok(near(H.troncons[0].debit,areaDN(100)*3600,.2),'débit rinçage sur DN100');

console.log('— coupe sur la vanne V1 (150 m) —');
H=buildHydro(LINES,{prest:{epreuve:true,rincage:true},cuts:[{line:'P',m:150}]});
ok(H.cuts.length===1&&H.cuts[0].valve==='V1','coupe reconnue sur la vanne V1');
ok(H.troncons.length===2,'2 tronçons');
const T1=H.troncons.find(t=>t.segs.some(s=>s.line==='P'&&s.m0===0)),T2=H.troncons.find(t=>t.segs.some(s=>s.line==='P'&&s.m1===300));
ok(T1.lines.includes('A1')&&!T1.lines.includes('A2'),'A1 (greffée à 100 m) avec le tronçon amont');
ok(T2.lines.includes('A2'),'A2 (greffée à 220 m) avec le tronçon aval');
ok(near(T1.lenA,150+80,.1)&&near(T2.lenA,150+60,.1),'linéaires 230/210');
ok(T1.ends.filter(e=>e.type==='cut').every(e=>e.need==='none'),'coupe sur vanne : vanne fermée, rien à poser');
ok(near(T1.vol+T2.vol,volAtt,.01),'les volumes des tronçons se somment au total');

console.log('— coupe hors vanne (80 m) + remplissage au départ —');
H=buildHydro(LINES,{prest:{rincage:true},cuts:[{line:'P',m:80}],fillAt:{line:'P',m:2}});
ok(H.cuts[0].valve===null,'coupe libre (pas de vanne)');
const Ta=H.troncons.find(t=>t.hasFill);
ok(Ta&&Ta.segs.some(s=>s.line==='P'&&s.m0===0),'le remplissage est rattaché au tronçon du départ');
ok(H.troncons.flatMap(t=>t.ends).filter(e=>e.type==='cut').every(e=>e.need==='BP'),'coupe libre + rinçage : BP des deux côtés');
ok(endOf(H,'P','start').fill===true&&endOf(H,'P','start').need==='none','l\'extrémité du remplissage est bouclée par le skid');

console.log('— mono-conduite : évacuation au lieu de by-pass —');
const S={id:'S',name:'Mono',length:100,nCond:1,parent:null,parentM:0,startKind:'pipe',endKind:'pipe',endWelds:[],els:[pipe(0,100,80)]};
H=buildHydro([S],{prest:{rincage:true}});
ok(near(H.troncons[0].vol,areaDN(80)*100,.01),'volume ×1 en mono-conduite');
ok(H.troncons[0].ends.every(e=>e.need==='EVAC'),'rinçage mono-tube : évacuation libre');

console.log('— bout en sous-station (SST ≠ raccordement) —');
const B={id:'B',name:'Antenne B',length:50,nCond:2,parent:null,parentM:0,startKind:'pipe',endKind:'endpoint',endWelds:[],els:[pipe(0,50,50)]};
H=buildHydro([B],{prest:{rincage:true}});
const eB=H.troncons[0].ends.find(e=>e.type==='tip');
ok(eB.already==='sst'&&eB.need==='none'&&/SST/.test(eB.label),'bout en SST : libellé « SST », rien à poser');

console.log('— coupes invalides ignorées —');
H=buildHydro(LINES,{prest:{epreuve:true},cuts:[{line:'ZZ',m:10},{line:'P',m:0.2},{line:'P',m:299.9}]});
ok(H.cuts.length===0&&H.troncons.length===1,'ligne inconnue / coupes au ras des bouts ignorées');

console.log('— paramètres variables —');
H=buildHydro(LINES,{prest:{rincage:true},params:{vitesse:1.5,debit:60}});
ok(near(H.troncons[0].debit,areaDN(100)*1.5*3600,.2),'vitesse 1,5 m/s prise en compte');
ok(near(H.troncons[0].minutes,H.troncons[0].vol/60*60,.01),'durée au débit 60 m³/h');

console.log(ko?`\n${ko}/${n} ÉCHECS`:`\n${n} tests OK`);process.exit(ko?1:0);
