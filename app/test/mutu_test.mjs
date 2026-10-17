// LOT MU (16/10 soir) — fonctions PURES du chantier mutualisé (src/mutufus.js), dans Node : fusion d'une étude dans un chantier en cours (lignes, soudures, plans de fond
// DXF et image, zones, TS, marché à part, prolongement), annulation EXACTE (y compris dans le désordre avec trois affaires), activité, géoréférencement, libellés.
// Données 100 % fictives. Lancer : node test/mutu_test.mjs → dernière ligne « RESULTAT: TOUT VERT ».
import {mergeSites,unmergeSite,activityOn,tfFromGeo,commonName,affLabels,marcheView,lineIdsOf,affInherit,rigid,isMutu} from '../src/mutufus.js';
import {marcheSnapshot,diffMarche} from '../src/marche.js';
import {splitFusedDrawing} from '../src/plans.js';
const C={};const ok=(k,v,info)=>{C[k]=!!v;console.log((v?'ok ':'KO ')+k+(info!==undefined?' : '+JSON.stringify(info):''));};
const canon=o=>Array.isArray(o)?o.map(canon):(o&&typeof o==='object')?Object.keys(o).sort().reduce((r,k)=>{if(o[k]!==undefined)r[k]=canon(o[k]);return r;},{}):o;
const same=(a,b)=>JSON.stringify(canon(a))===JSON.stringify(canon(b));
const strip=s=>{const x=JSON.parse(JSON.stringify(s));delete x.mutu;if(x.traceur)delete x.traceur.savedAt;return x;};
let wn=0;const mkLine=(id,name,pts,o={})=>{const el=(i,a,b)=>({id:'P'+i,kind:'pipe',dn:80,casing:200,len:Math.hypot(b[0]-a[0],b[1]-a[1]),m0:0,m1:0,axis:[[a,b]],from:a,to:b});const els=[];for(let i=1;i<pts.length;i++)els.push(el(i,pts[i-1],pts[i]));
  const W=c=>els.slice(1).map((e,k)=>({idx:k,weldId:'S-'+String(++wn).padStart(4,'0'),m:k*10,x:e.from[0],y:e.from[1],dn:80}));
  return Object.assign({id,name,dn:80,bar:12,traceur:true,axis:pts,e:0.3,startType:'sousstation',endType:'kit',ends:{start:{type:'sousstation',dn:80},end:{type:'kit',dn:80}},cond:{A:{els,welds:W('A'),length:10},R:{els:els.map(e=>Object.assign({},e)),welds:W('R'),length:10}}},o);};
/* chantier 2025 : ancien format de fond (un DXF non marqué), zone de chiffrage, TS, soudures ajoutées sur place */
wn=0;const Cs={id:'C25',name:'Villefictive 2025',source:'traceur',supplier:'AXIOM',serie:1,sheetType:'vector',lines:[mkLine('L1','Feeder fictif',[[0,0],[50,0],[100,0]]),mkLine('L2','Antenne Nord fictive',[[50,0],[50,-40]],{parent:'L1'})],
  traceur:{lines:[{id:'L1',pts:[[0,0],[50,0],[100,0]]},{id:'L2',pts:[[50,0],[50,-40]],parent:{line:'L1',m:50}}],zones:[{id:'z1',nom:'Zone 1',lines:['L1','L2']}],savedAt:'2026-10-01T00:00:00Z',bgName:'fond fictif.dxf'},
  drawing:[{pts:[[-10,-10],[110,-10]]},{pts:[[-10,10],[110,10]],c:'#888'}],w:130,h:30,bbox:[-10,-40,110,10],nbox:[0,-40,100,0],report:{lines:2,welds:4},ts:{items:[{id:'ts001',kind:'line',line:'L1',etat:'note',label:'fictif'}],seq:2},extraWelds:[{line:'L1',cond:'A',m:20,weldId:'S-0009'}]};
Cs.marche=marcheSnapshot(Cs.lines,{source:'traceur'});const C0=JSON.parse(JSON.stringify(Cs));
/* étude 2026 : son repère (tourné de 90°), deux plans de fond (DXF marqués p:0 / image), une zone reliée au chiffrage, un TS déjà qualifié */
wn=0;const Es={id:'E26',name:'Étude Villefictive 2026',source:'traceur',supplier:'AXIOM',serie:1,lines:[mkLine('L1','Prolongement 2026',[[0,0],[30,0],[30,20]]),mkLine('L2','Antenne 2026',[[30,0],[45,0]],{parent:'L1'})],
  traceur:{ctx:'etude',lines:[{id:'L1',pts:[[0,0],[30,0],[30,20]],plans:['pd','pi'],sv:[1,2]},{id:'L2',pts:[[30,0],[45,0]],parent:{line:'L1',m:30},del:[{pts:[[45,0],[50,0]],v:2}]}],zones:[{id:'z1',nom:'Zone étude',lines:['L1','L2'],ch:'zc7'}],ghosts:[{ghost:true,id:'L9',pts:[[0,0],[1,1]]}]},
  plans:[{id:'pd',kind:'dxf',name:'plan BE fictif.dxf',show:true,opacity:.5,transform:{tx:0,ty:0,rot:0,k:1},geo:'coords',bbox:[0,0,40,30]},{id:'pi',kind:'image',name:'scan fictif.png',show:true,opacity:.5,transform:{tx:5,ty:5,rot:0,k:.1},image:{src:'data:image/png;base64,AA',pw:100,ph:80}}],
  drawing:[{pts:[[0,5],[40,5]],p:0},{pts:[[0,25],[40,25]],p:0}],ts:{items:[{id:'ts001',kind:'line',line:'L2',etat:'propose',ts:'DEV-FICTIF',label:'fictif 2026'}],seq:2}};
const T={tx:50,ty:-40,rot:-90,k:1}; /* l'étude part du bout de l'antenne 2025 (50,−40), tournée de −90° */
const {site:S,info}=mergeSites(Cs,Es,T,{aff:'O2610-82',orig:'O2501-81',by:'test',at:'2026-10-16T20:00:00Z',nom:commonName(Cs.name),weldMax:20});
const L26=S.lines.filter(l=>l.aff==='O2610-82');const W=S.lines.flatMap(L=>['A','R'].flatMap(c=>L.cond[c].welds.map(w=>w.weldId)));
ok('c1 fusion : affaires, nom commun, lignes renommées, soudures neuves après le serveur',same(S.affaires,['O2501-81','O2610-82'])&&S.name==='Villefictive'&&isMutu(S)&&L26.map(l=>l.id).join()==='L3,L4'&&L26[1].parent==='L3'&&W.length===new Set(W).size&&L26.every(L=>L.cond.A.welds.every(w=>+w.weldId.slice(2)>20)),{ids:L26.map(l=>l.id),w:L26[0].cond.A.welds.map(w=>w.weldId)});
const a0=L26[0].axis[0],a1=L26[0].axis[1];
ok('c2 déplacement rigide (rotation −90°) + prolongement : départ « sur attente existante »',Math.hypot(a0[0]-50,a0[1]+40)<1e-6&&Math.hypot(a1[0]-50,a1[1]+70)<1e-6&&L26[0].startType==='attente'&&L26[0].ends.start.type==='attente'&&info.prolong.length===1&&info.prolong[0].with==='L2'&&S.traceur.lines.find(l=>l.id==='L3').startType==='attente',{a0,a1,p:info.prolong});
const R3=S.traceur.lines.find(l=>l.id==='L3'),R4=S.traceur.lines.find(l=>l.id==='L4');
ok('c3 lignes du traceur : sommets déplacés, affaire, parent, liens plans, tronçons supprimés (del) suivis, versions gardées, fantômes NON repris',R3.aff==='O2610-82'&&R4.parent.line==='L3'&&Math.hypot(R4.del[0].pts[0][0]-50,R4.del[0].pts[0][1]+85)<1e-6&&same(R3.sv,[1,2])&&R3.plans.every(p=>/^muO261082_/.test(p))&&!(S.traceur.ghosts),{R3,del:R4.del});
const parts=splitFusedDrawing(S.drawing,S.plans);const pI=S.plans.findIndex(p=>p.id==='muO261082_pd');
ok('c4 plans : ancien format converti, DXF de l\'étude ajouté (marqué) et relu en local, image calée',S.plans.length===3&&S.plans[0].id==='dxf0'&&(parts[0]||[]).length===2&&(parts[pI]||[]).length===2&&Math.abs(parts[pI][0].pts[0][1]-5)<0.02&&S.plans.find(p=>p.id==='muO261082_pi').mutuAff==='O2610-82'&&S.sheetType==='vector',{plans:S.plans.map(p=>p.id),n:[parts[0]&&parts[0].length,parts[pI]&&parts[pI].length]});
const zE=S.traceur.zones.find(z=>z.aff==='O2610-82');
ok('c5 zones : celle de l\'étude reprise (lignes renommées, lien au chiffrage), celle du chantier intacte',S.traceur.zones.length===2&&same(S.traceur.zones[0],C0.traceur.zones[0])&&same(zE.lines,['L3','L4'])&&zE.ch==='zc7',zE);
const d25=diffMarche(S.marche,S.lines.filter(l=>!l.aff)),d26=diffMarche(S.marchesAff['O2610-82'],L26),dMix=diffMarche(S.marche,S.lines);
ok('c6 marchés séparés : aucun écart parasite (sans séparation : '+dMix.changed.length+' lignes « en écart »)',same(S.marche,C0.marche)&&d25.changed.length===0&&d26.changed.length===0&&dMix.changed.length===2&&S.marchesAff['O2610-82'].lines.length===2);
ok('c7 TS : celui de l\'étude repris sur la nouvelle ligne (n° neuf), ceux du chantier intacts',S.ts.items.length===2&&S.ts.items[0].id==='ts001'&&S.ts.items[1].id==='ts002'&&S.ts.items[1].line==='L4'&&S.ts.items[1].aff==='O2610-82');
const MV=marcheView(S.marche,S.marchesAff);ok('c8 vue du marché dans le traceur : chaque ligne avec SON marché',MV.lines.length===4&&MV.tot.soud===S.marche.tot.soud+S.marchesAff['O2610-82'].tot.soud&&marcheView(C0.marche,null)===C0.marche);
const w26=L26[0].cond.A.welds[0].weldId;
const ac0=activityOn(S,'O2610-82',{rows:[{weld_id:'S-0001',status:'soudee'}]}),ac1=activityOn(S,'O2610-82',{rows:[{weld_id:w26,status:'soudee'}]}),ac2=activityOn(Object.assign({},S,{phasage:{phases:[{tr:[{line:'L3',m0:0,m1:5}]}]}}),'O2610-82',{}),ac3=activityOn(S,'O2610-82',{joints:[{weldId:w26,status:'a_souder',photos:['x']}]});
ok('c9 activité sur les lignes 2026 (soudure du serveur, photo de la session, phase) — pas celle d\'une ligne 2025',ac0.n===0&&ac1.n===1&&ac1.welds===1&&ac2.n===1&&ac3.n===1,{ac0,ac1,ac2:ac2.items});
ok('c10 lignes par affaire',same([...lineIdsOf(S,'O2610-82')],['L3','L4'])&&same([...lineIdsOf(S,'O2501-81')],['L1','L2'])&&same([...lineIdsOf(S,'')],['L1','L2']));
const {site:U}=unmergeSite(S,'O2610-82',{by:'test'});
ok('c11 annulation EXACTE : le chantier d\'avant (lignes, traceur, zones, plans / dessin, marché, TS, cadrage, nom)',same(strip(U),strip(C0)),Object.keys(C0).filter(k=>!same(strip(U)[k],strip(C0)[k])));
/* trois affaires, annulées dans le désordre */
wn=100;const E27={id:'E27',name:'Étude Villefictive 2027',lines:[mkLine('L1','Ouest 2027',[[0,0],[40,0]])],traceur:{ctx:'etude',lines:[{id:'L1',pts:[[0,0],[40,0]]}]}};
const {site:S2}=mergeSites(S,E27,{tx:100,ty:0,rot:0,k:1},{aff:'O2610-83',by:'t'});
const {site:U1}=unmergeSite(S2,'O2610-82',{by:'t'});const {site:U2}=unmergeSite(U1,'O2610-83',{by:'t'});
ok('c12 trois affaires : retrait de 2026 puis 2027 → chantier d\'avant, à l\'identique',same(S2.affaires,['O2501-81','O2610-82','O2610-83'])&&same(U1.affaires,['O2501-81','O2610-83'])&&U1.name==='Villefictive'&&U1.lines.length===3&&same(strip(U2),strip(C0))&&U2.name==='Villefictive 2025');
const {site:V1}=unmergeSite(S2,'O2610-83',{by:'t'});const {site:V2}=unmergeSite(V1,'O2610-82',{by:'t'});ok('c13 … et dans l\'autre ordre',same(strip(V2),strip(C0)));
/* géoréférencement : étude et chantier en Lambert 93 (fictifs), l'étude tournée de 30° */
const th=30*Math.PI/180;const geoC={geo:{crs:'EPSG:2154',aff:{a:1,b:0,c:0,d:-1,e:480000,f:6670000}}};const geoE={geo:{crs:'EPSG:2154',aff:{a:Math.cos(th),b:-Math.sin(th),e:60+480000,c:-Math.sin(th),d:-Math.cos(th),f:6670000+50}}};
const G=tfFromGeo(Object.assign({},Es,geoE),Object.assign({},Cs,geoC));const Gn=tfFromGeo(Es,Object.assign({},Cs,geoC));
ok('c14 conversion directe par le géoréférencement des deux tracés (sinon : calage)',G&&G.ok&&Math.abs(G.T.rot-30)<1e-6&&Math.abs(G.T.tx-60)<0.01&&Math.abs(G.T.ty+50)<0.01&&G.k===1&&Gn===null,G);
const Rg=rigid({tx:10,ty:0,rot:0,k:1.01},[100,0]);ok('c15 calage → déplacement rigide (l\'étude garde ses longueurs)',Rg.k===1&&Math.abs(Rg.tx-11)<1e-9);
ok('c16 libellés et nom commun',commonName('Ville Fictive 2025')==='Ville Fictive'&&commonName('Réseau (2025)')==='Réseau'&&commonName('Villefictive')==='Villefictive'&&same(affLabels(['A','B'],[{nom:'Réseau 2025'},{nom:'Extension 2026'}]),['2025','2026'])&&same(affLabels(['O1','O2'],[{nom:'x 2026'},{nom:'y 2026'}]),['O1','O2']));
const out=affInherit([{id:'L1',aff:'X'},{id:'L2',parent:'L1'},{id:'L3',parent:'L2'},{id:'L4'}]);ok('c17 antenne tracée après coup : hérite de l\'affaire de sa parente',out[1].aff==='X'&&out[2].aff==='X'&&!out[3].aff);
let thrown=0;try{mergeSites(Cs,{id:'E0',lines:[]},T,{aff:'O1'});}catch(e){thrown++;}try{mergeSites(Cs,Es,T,{});}catch(e){thrown++;}ok('c18 garde-fous (étude vide, affaire manquante)',thrown===2);
ok('c19 un chantier à une seule affaire : rien de nouveau',!isMutu(C0)&&!('affaires' in C0)&&!('marchesAff' in C0));
console.log(Object.values(C).every(Boolean)?'RESULTAT: TOUT VERT':'RESULTAT: ÉCHEC '+Object.entries(C).filter(([k,v])=>!v).map(([k])=>k).join(','));
