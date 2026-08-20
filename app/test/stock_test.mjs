// Lecteur de BL : validé sur les 4 BL RÉELS d'Ethan (AXIOM, Renalia ×2, LOGSTOR) + le scan ZPU (vide → refus propre)
import {parseBL,stockLabel,stockKey,dnOfOd,zoneAgg,globalAgg} from '../src/stock.js';
import {readFileSync} from 'fs';
let n=0,ko=0;const ok=(c,l)=>{n++;if(!c){ko++;console.log('ECHEC:',l);}};
const T=f=>readFileSync(new URL('./bl/'+f,import.meta.url),'utf8');

// dnOfOd
ok(dnOfOd(219.1)===200,'219.1→200');ok(dnOfOd(76.1)===65,'76.1→65');ok(dnOfOd(89)===80,'89→80');ok(dnOfOd(60)===50,'60→50');ok(dnOfOd(139)===125,'139→125');ok(dnOfOd(114)===100,'114→100');ok(dnOfOd(49)===40,'49→40');ok(dnOfOd(500)===500,'500→500');ok(dnOfOd(999)===null,'999→null');

// AXIOM
const A=parseBL(T('axiom.txt'));
ok(A.fmt==='axiom','fmt axiom');ok(A.lines.length===11,'axiom 11 lignes ('+A.lines.length+')');
const a=(k,dn)=>A.lines.find(l=>l.kind===k&&l.dn===dn);
ok(a('pipe',200)&&a('pipe',200).qty===16&&a('pipe',200).len===12,'R-200/315-12 ×16');
ok(a('pipe',65)&&a('pipe',65).qty===28,'R-65 ×28');
ok(a('bend',200)&&a('bend',200).qty===4&&a('bend',200).angle===90,'K-200/90 ×4');
ok(a('tee',200)&&a('tee',200).dn2===65&&a('tee',200).qty===2,'TW-200/65 ×2');
ok(a('sleeve',200)&&a('sleeve',200).qty===22,'NT-200 ×22');
ok(a('sleeveEnd',65)&&a('sleeveEnd',65).qty===2,'NK-65 ×2');
ok(A.lines.find(l=>l.kind==='wall'&&l.gaine===315),'P-315 passage de mur');
ok(A.lines.find(l=>l.kind==='dhec'&&l.gaine===315),'E-315 dhec');
ok(stockLabel(a('pipe',200))==='Barre 12 m DN200','label barre');

// Renalia BL018571
const R=parseBL(T('renalia1.txt'));
ok(R.fmt==='renalia','fmt renalia');ok(R.lines.length===4,'renalia1 4 lignes ('+R.lines.length+')');
ok(R.lines.find(l=>l.kind==='bend'&&l.angle===90&&l.dn===50&&l.qty===4),'C90 60/140 → coude 90 DN50 ×4');
ok(R.lines.find(l=>l.kind==='dhec'&&l.gaine===140&&l.qty===4),'DHEC-140 ×4');
ok(R.lines.find(l=>l.kind==='tee'&&l.dn===80&&l.dn2===50&&l.qty===6),'TS 89/180-60/140 → té 80/50 ×6');
ok(R.lines.find(l=>l.kind==='bend'&&l.angle===65&&l.dn===65&&l.qty===2),'C65 76/160 → coude 65° DN65 ×2');

// Renalia BL018572 (tés à saut 139/250)
const R2=parseBL(T('renalia2.txt'));
ok(R2.fmt==='renalia'&&R2.lines.length===2,'renalia2 2 lignes');
ok(R2.lines.every(l=>l.kind==='tee'&&l.dn===125),'tés DN125');
ok(R2.lines[0].dn2===40&&R2.lines[1].dn2===100,'branches 40 puis 100');

// LOGSTOR
const L=parseBL(T('logstor.txt'));
ok(L.fmt==='logstor','fmt logstor');
ok(L.lines.find(l=>l.kind==='pipe'&&l.dn===150&&l.gaine===250&&l.len===12&&l.qty===6),'tube 168/250 12 m ×6');
ok(L.lines.find(l=>l.kind==='bend'&&l.dn===300&&l.angle===90&&l.qty===6),'coude 323/450 90° ×6');
ok(L.lines.find(l=>l.kind==='bend'&&l.dn===150&&l.qty===2),'coude 168/250 ×2');
ok(L.lines.find(l=>l.kind==='sleeve'&&l.gaine===450&&l.qty===12),'WPJoint 450 ×12');
ok(L.lines.find(l=>l.kind==='sleeve'&&l.gaine===250&&l.qty===10),'WPJoint 250 ×10');
ok(!L.lines.find(l=>/Pallet|Wooden/i.test(l.label||'')),'palettes ignorées');

// ZPU : scan sans texte → refus propre
const Z=parseBL(T('zpu.txt'));
ok(Z.fmt===null&&Z.empty===true,'zpu scan → vide signalé');

// agrégats
const st={zones:[{id:'Z1'},{id:'Z2'}],lots:[
  {id:1,zone:'Z1',key:stockKey({kind:'pipe',dn:100,len:12}),label:'Barre 12 m DN100',kind:'pipe',dn:100,len:12,qty:24},
  {id:2,zone:'Z2',key:stockKey({kind:'pipe',dn:100,len:12}),label:'Barre 12 m DN100',kind:'pipe',dn:100,len:12,qty:12}],
 takes:[{zone:'Z1',key:stockKey({kind:'pipe',dn:100,len:12}),qty:9}]};
const z1=zoneAgg(st,'Z1');ok(z1[0].reste===15,'zone Z1 reste 15');
const g=globalAgg(st);ok(g[0].qty===36&&g[0].taken===9&&g[0].reste===27,'global 36/9/27');

console.log(ko?`${ko}/${n} ECHECS`:`${n} tests OK`);process.exit(ko?1:0);
