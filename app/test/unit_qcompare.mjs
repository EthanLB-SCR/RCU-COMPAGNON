// unit_qcompare.mjs — 27/10 soir (lot 2710i, Ethan : « comparer les quantités tracées et celles importées d'un fournisseur — toutes les pièces en face ») : qCompare pur, dans Node.
// Tracé FICTIF (format remis par le traceur, comme e2e_q_1410) : feeder DN 150 → réduction DN 100, 2 purges DN 25, té vers une antenne DN 80 (coude 45°), vanne DN 100, by-pass, kit ;
// étude fournisseur FICTIVE (trame SCR) : mêmes pièces sauf 1 coude 45° DN 80 en moins, 2 vannes DN 100 (au lieu de 2 → même), 1 réduction → DN 100 de plus, 2 manchons DN 150 en plus, pas de purge.
// c1 pcs du tracé (variantes) · c2 lignes « toutes DN » : tracé | fournisseur | écart (piquages : la branche d'une purge compte comme chez le fournisseur) · c3 sous-lignes (angle, DN 2, branche) ·
// c4 ce que l'un ne compte pas (purges → —, DHEC → —) · c5 extra (mousse, accessoires), DN 25 du fournisseur (branches de purge : soudures estimées ≈, jamais un écart) · c6 Σ des tracés (pcs additionnées)
import {traceQtyOf} from '../src/qtrace.js';
import {qCompare,supplierPieces} from '../src/qcompare.js';
const J=x=>JSON.stringify(x);const C={};
const T=(kind,dn,len,x)=>Object.assign({kind,dn,len},x||{});
const weldsOf=els=>els.slice(0,-1).map((e,i)=>({idx:i,dn:e.dn,m:i,weldId:'S-'+i}));
let Y0=0;const TL=(id,els,o)=>{const y=(Y0+=12);let m=0;els.forEach(e=>{e.m0=m;m+=e.len;e.m1=m;e.axis=[[[e.m0,y],[e.m1,y]]];e.from=[e.m0,y];e.to=[e.m1,y];e.casing=250;});
  return Object.assign({id,name:id,dn:els[0].dn,bar:12,traceur:true,axis:[[0,y],[m,y]],cond:{A:{els,welds:weldsOf(els),length:m,notes:[]},R:{els:els.map(e=>JSON.parse(JSON.stringify(e))),welds:weldsOf(els),length:m,notes:[]}}},o||{});};
const PU=(dn,dnb)=>T('tee',dn,0.9,{vert:'up',pvKind:'purge',pvDir:'up',dnb});
const LINES=[
  TL('L1',[T('endpoint',150,0),T('pipe',150,12),PU(150,25),T('pipe',150,12),T('tee',150,1.1,{dnb:80}),T('pipe',150,10),PU(150,25),T('pipe',150,6),T('reducer',150,0.5,{dn2:100}),T('pipe',100,12),T('valve',100,0.4),T('pipe',100,5),T('endcap',100,0.3)],{name:'Feeder',ends:{start:{type:'chaufferie',dn:150},end:{type:'kit',dn:100}}}),
  TL('L2',[T('pipe',80,12),T('bend',80,0.4,{angle:45}),T('pipe',80,8),T('bend',80,0.5,{angle:90}),T('pipe',80,3),T('bypass',80,0.6)],{name:'Antenne',parent:'L1',parentM:24,ends:{start:null,end:{type:'bypass_regard',dn:80}}})];
const Q=traceQtyOf({lines:LINES,sess:false,meta:LINES,zones:null});
console.log('tracé :',J(Q.tot),'\npcs :',J(Q.pcs));
const pk=p=>[p.kind,p.dn,p.dn2||'',p.angle||'',p.pv||'',p.sub||'',p.n].join(':');
C.c1=J(Q.pcs.map(pk))===J(['tee:150:25::purge::4','tee:150:80::::2','reducer:150:100::::2','valve:100:::::2','kit:100:::::2','bend:80::45:::2','bend:80::90:::2','bypass:80:::::2']);
// étude fournisseur (trame) — unités = pièces (le fournisseur compte les deux conduites)
const S=[{kind:'pipe',dn:150,len:12,qty:8},{kind:'pipe',dn:100,len:12,qty:4},{kind:'pipe',dn:80,len:12,qty:4},
  {kind:'sleeve',dn:150,qty:14},{kind:'sleeve',dn:100,qty:4},{kind:'sleeve',dn:80,qty:8},
  {kind:'tee',dn:150,dn2:25,qty:4},{kind:'tee',dn:150,dn2:80,qty:2},{kind:'reducer',dn:150,dn2:100,qty:3},{kind:'valve',dn:100,qty:2},{kind:'kit',dn:100,qty:1},{kind:'sleeveEnd',dn:100,qty:1},
  {kind:'bend',dn:80,angle:90,qty:2},{kind:'bend',dn:80,angle:45,qty:1},{kind:'bypass',dn:80,qty:2},{kind:'dhec',dn:150,qty:1},{kind:'pu',dn:150,qty:14},{kind:'acc',label:'Matelas',qty:10}];
console.log('fournisseur :',J(supplierPieces(S).map(pk)));
const R=qCompare(Q,S);
const row=(rows,k)=>rows.find(r=>r.k===k);const fmt=r=>r?`${r.lab}: ${r.t} | ${r.f} | ${r.d}${r.off?' !':''}`:'(absent)';
console.log('toutes DN :');R.all.forEach(r=>{console.log('  '+fmt(r));r.sub.forEach(s=>console.log('     ↳ '+fmt(s)));});
R.groups.forEach(g=>{console.log('DN '+g.dn+' :');g.rows.forEach(r=>{console.log('  '+fmt(r));r.sub.forEach(s=>console.log('     ↳ '+fmt(s)));});});
console.log('n',J(R.n),'extra',J(R.extra));
const A=R.all;const a=k=>row(A,k);
C.c2=a('barres').t===Q.tot.barres&&a('barres').f===16&&a('soud').t===Q.tot.soud&&a('soud').f===28&&a('soud').d===28-Q.tot.soud&&a('coudes').t===4&&a('coudes').f===3&&a('coudes').d===-1&&a('coudes').off
  &&a('tes').t===6&&a('tes').f===6&&a('tes').d===0&&!a('tes').off&&a('red').t===2&&a('red').f===3&&a('red').d===1&&a('red').off&&a('vannes').d===0&&a('kits').t===2&&a('kits').f===2&&a('kits').d===0&&a('bypass').t===2&&a('bypass').f===2
  &&a('piq').t===6&&a('piq').f===6&&a('piq').d===0&&a('mlTube').t===Q.tot.mlTube&&a('mlTube').f===210&&a('mlTr').f===105.1; /* 29/10 (lot 2910a) : le fournisseur compte ses tubes (16 × 12 = 192) + ses pièces (6 tés × 1 + 3 réductions × 1 + 2 vannes × 1,5 + 3 coudes × 2 = 18) ; tranchée = par DN, (tubes + pièces) ÷ 2 */
const sub=(k,key)=>(a(k).sub.find(s=>s.key===key)||{});
C.c3=J(a('coudes').sub.map(s=>s.key))===J(['coude:90','coude:45'])&&sub('coudes','coude:45').t===2&&sub('coudes','coude:45').f===1&&sub('coudes','coude:45').d===-1&&sub('coudes','coude:45').off&&sub('coudes','coude:90').d===0
  &&J(a('tes').sub.map(s=>s.lab))===J(['Té → DN 80','Té → DN 25 (purge)'])&&sub('tes','25').t===4&&sub('tes','25').f===4&&sub('red','100').lab==='Réduction → DN 100'&&sub('red','100').d===1
  &&J(a('kits').sub.map(s=>[s.lab,s.t,s.f]))===J([['Kit fin de ligne',2,1],['Manchon fin de ligne',0,1]]);
C.c4=a('purges').t===2&&a('purges').f===null&&a('purges').d===null&&!a('purges').off&&a('dhec').t===null&&a('dhec').f===1&&a('dhec').d===null&&!row(A,'vidanges')&&!row(A,'murs');
C.c5=J(R.extra)===J([{lab:'Mousse PU DN 150',n:14},{lab:'Matelas',n:10}])&&R.n.rows>10&&R.n.off>=3&&J(R.dns)===J([150,100,80,25]);
const g25=R.groups.find(g=>g.dn===25).rows;const g80=R.groups.find(g=>g.dn===80).rows;C.c5b=row(g25,'piq').t===4&&row(g25,'piq').f===4&&row(g25,'soud').t===0&&row(g25,'soud').f===2&&row(g25,'soud').est&&!row(g25,'soud').off&&row(g80,'coudes').t===4&&row(g80,'coudes').f===3&&!row(g80,'tes')&&row(g80,'piq').t===2&&row(g80,'bypass').t===2&&!R.groups.find(g=>g.dn===150).rows.some(r=>r.k==='bypass');
// c6 : somme de deux tracés (pcs additionnées) = le même tracé deux fois → tout × 2 côté tracé
const Q2={rows:Q.rows.map(r=>Object.assign({},r,Object.fromEntries(Object.keys(r).filter(k=>typeof r[k]==='number'&&k!=='dn').map(k=>[k,r[k]*2])))),pcs:Q.pcs.map(p=>Object.assign({},p,{n:p.n*2}))};
const R2=qCompare(Q2,S);C.c6=row(R2.all,'coudes').t===8&&row(R2.all,'coudes').d===-5&&row(R2.all,'tes').t===12&&row(R2.all,'soud').t===Q.tot.soud*2;
console.log(J(C));const ko=Object.entries(C).filter(([,v])=>!v).map(([k])=>k);console.log(ko.length?'RESULTAT: KO '+ko.join(','):'RESULTAT: TOUT VERT');
