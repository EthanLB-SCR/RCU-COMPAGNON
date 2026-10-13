// classeur.js + correctifs du moteur trouvés par le contrôle croisé (lot 5, 13/10/2026), dans Node :
// · lecture d'un classeur REMPLI (test/fixture_classeur.xlsx, maquette synthétique) : chaque champ de l'onglet « ZONE A » → l'étude de l'appli ;
//   Récap Prix (avec marge → achat) ; comparaison : 33 postes identiques, 2 écarts expliqués (jours ouvrés, soudures sans case), 1 à regarder (purges) ;
// · setCellsXml : une formule « $D$3 » dans la ligne réécrite ne doit pas être prise pour « $3 » (corruption de la ligne — export DPGF) ;
// · « 2*FO_Purgeur_Auto » : le ×2 compte ; « FALSE() » (classeur ré-enregistré par LibreOffice) lu comme FALSE ;
// · tables à clé texte (type de support) : la bonne ligne, pas toujours la première ;
// · twin : la réduction de cadence vaut pour tous les DN (prix du pouce d'un DN hors tableau, nuit).
import fs from 'fs';import path from 'path';import {fileURLToPath} from 'url';
import {readClasseur,compareClasseur} from '../src/classeur.js';
import {parsePrixWorkbook,calcEtude,emptyEtude,panierRow,foLookup,foParam,teamCost,cadOf,parseRefs} from '../src/prix.js';
import {setCellsXml} from '../src/xlsx.js';
const HERE=path.dirname(fileURLToPath(import.meta.url));
const load=f=>{const b=fs.readFileSync(path.join(HERE,f));return b.buffer.slice(b.byteOffset,b.byteOffset+b.byteLength);};
const C={};const out={};
// ── 1) lecture du classeur rempli
const L=await readClasseur(load('fixture_classeur.xlsx'),{name:'fixture_classeur.xlsx'});const z=L.etudes[0].z;
out.read={n:L.etudes.length,nom:z.nom,d:z.chantier.d0+'→'+z.chantier.d1,ch:[z.chantier.wc,z.chantier.contener,z.chantier.benne,z.chantier.doe,z.chantier.arMO,z.chantier.nbDecharg].join(),
  eq:[z.eq.soud,z.eq.manch,z.eq.typeManchon,z.eq.ctrl.depression,z.eq.twin,z.eq.joursComplets].join(),dn:z.dn.map(r=>r.dn+':'+r.soud+'/'+r.ml+(r.antenne?'A':'')+(r.feeder?'F':'')).join(),
  pu:[z.purges.dn,z.purges.purgeurAuto,z.purges.paires,z.vidanges.type,z.vidanges.paires].join(),vpi:z.vpi.map(v=>v.dn+':'+v.soud+':'+v.prixVanne).join(),sst:z.sst.map(s=>s.type+':'+s.dn+':'+s.paires).join(),
  racc:z.racc.map(s=>s.type+':'+s.dn).join(),ext:z.extrusion.map(s=>s.type+':'+s.dn+':'+s.paires).join(),cnd:[z.cnd.km,z.cnd.radio.on,z.cnd.radio.antPct,z.cnd.radio.fdVac,z.cnd.us.on].join(),
  hy:z.hydro.zones[0].rows.map(r=>r.dn+':'+r.ml).join()+'|'+[z.hydro.epreuve,z.hydro.rincage,z.hydro.panier].join(),aer:z.aerien.rows.map(r=>[r.type,r.dn,r.ml,r.c90,r.soud,r.calo,r.support].join(':')).join(),
  dep:z.depose.rows.map(r=>r.dn+':'+r.ml).join(),pan:z.panier.fo.map(x=>x.label+':'+x.qty+':'+x.pu).join()+'|'+z.panier.mo.map(x=>x.eq+':'+x.h).join(),fp:z.fopre.prixFO,frais:z.autres.frais,
  recap:{marge:L.recap.marge,client:L.recap.client,cols:L.recap.cols.map(c=>c.sheet).join(),ml:L.recap.cols[0].ml},notes:L.etudes[0].notes};
console.log('1) lecture :',JSON.stringify(out.read));
C.lecture=out.read.n===1&&out.read.nom==='ZONE A'&&out.read.d==='2026-11-02→2026-11-27'&&out.read.ch==='true,true,false,true,true,1'&&out.read.eq==='S+T+P,M,Thermo,true,false,false'
  &&out.read.dn==='32:6/10,50:12/60A,100:40/200F'&&out.read.pu==='32,true,2,gravite,1'&&out.read.vpi==='100:2:400'&&out.read.sst==='sst_vannes_bs_pn25:80:2'&&out.read.racc==='racc_insertion_de_tes:100'&&out.read.ext==='Manchons:110:2'
  &&out.read.cnd==='120,true,10,20,false'&&out.read.hy==='100:400|true,false,OS'&&out.read.aer==='Tradi:80:12:2:4:PVC:Mural'&&out.read.dep==='100:30'&&out.read.pan==='Coudes à souder DN 50:3:7|S+T:4'&&out.read.fp===15000&&out.read.frais===175
  &&out.read.recap.marge===0.125&&out.read.recap.client==='Aucun'&&out.read.recap.cols==='ZONE A'&&out.read.recap.ml===270&&out.read.notes.some(n=>/6 soudures sans case/.test(n));
// ── 2) comparaison
const K=compareClasseur(L);const p=K.par[0];out.cmp={ok:p.nOk,exp:p.nExp,bad:p.nBad,rows:p.rows.filter(r=>!r.ok).map(r=>r.k+':'+Math.round(r.ecart)+(r.why?':exp':'')).join(),tot:Math.round(K.tot.ecart)};
console.log('2) comparaison :',JSON.stringify(out.cmp));
C.compare=out.cmp.ok===33&&out.cmp.exp===2&&out.cmp.bad===1&&out.cmp.rows==='conteneur:-75:exp,purges:-120,radio:50:exp'&&out.cmp.tot===-145;
// ── 3) setCellsXml : « $D$3 » dans la ligne
const xml='<worksheet><sheetData><row r="3" spans="1:5"><c r="A3"><v>1</v></c><c r="B3"><f>ROUND(A3*$D$3,2)</f><v>2</v></c><c r="C3"/></row></sheetData></worksheet>';
const x2=setCellsXml(xml,{C3:12.5});out.xml=x2;C.setcells=x2.includes('<f>ROUND(A3*$D$3,2)</f>')&&x2.includes('<c r="C3"><v>12.5</v></c>')&&(x2.match(/<row /g)||[]).length===1&&!x2.includes('$D<c');
// ── 4) formules de la base : coefficient d'un paramètre, FALSE()
const base=await parsePrixWorkbook(load('fixture_prix.xlsx'),{name:'fixture_prix.xlsx'});
const pg=panierRow(base,'purge',32);const purg=pg.fo.find(f=>/purgeur/i.test(f.label));
out.refs={purgeur:purg&&purg.amount,param:foParam(base,'FO_Purgeur_Auto'),r1:JSON.stringify(parseRefs('2*VLOOKUP(A20,FO_Vannes_Souder[],4,FALSE())')),r2:JSON.stringify(parseRefs('2*FO_Purgeur_Auto'))};
console.log('4) formules :',JSON.stringify(out.refs));
C.refs=purg&&Math.abs(purg.amount-2*out.refs.param)<1e-9&&out.refs.r1==='{"refs":[{"k":2,"dn":"row","t":"FO_Vannes_Souder","c":4}]}'&&out.refs.r2==='{"refs":[{"param":"FO_Purgeur_Auto","k":2}]}';
// ── 5) table à clé texte
out.sup={mural:foLookup(base,'FO_Supportage','Mural',2),h:foLookup(base,'FO_Supportage','H avec pied',2),num:foLookup(base,'FO_Isolation',100,2)};
C.texte=out.sup.mural===60&&out.sup.h===150&&out.sup.num===200;
// ── 6) twin : prix du pouce d'un DN hors tableau (soudures déportées des purges) et nuit
const zt=emptyEtude('Twin');zt.eq.twin=true;zt.eq.reduction=0.8;zt.dn=[{dn:100,soud:20,ml:100}];zt.purges={dn:32,purgeurAuto:false,paires:1,deporte:true};zt.nuit={on:true,dn:100,soud:10,rendement:0.8};
const Rt=calcEtude(zt,base);const c32=cadOf(base,32),c100=cadOf(base,100);const cS=teamCost(base,'S+T+P'),cM=teamCost(base,'M');
const pP32=cS.jour/(c32.soud['S+T+P']*0.8*c32.pouce);const puDep=c32.pouce*pP32+Rt.detail.purges.puDep-c32.pouce*pP32; /* manchon inchangé */
const cad100=c100.soud['S+T+P']*0.8;const nuitAttendu=Math.ceil(10/(cad100*0.8))*(cS.nuitJour+cM.nuitJour)-Math.ceil(10/cad100)*(cS.jour+cM.jour);
out.twin={puDepPouce:Rt.detail.purges.puDep-(Rt.detail.purges.puDep-c32.pouce*pP32),attendu:c32.pouce*pP32,nuit:Rt.postes.nuit.achat,nuitAttendu};
console.log('6) twin :',JSON.stringify(out.twin));
const zt2=JSON.parse(JSON.stringify(zt));zt2.eq.twin=false;const Rt2=calcEtude(zt2,base);
C.twin=Math.abs(Rt.detail.purges.puDep-Rt2.detail.purges.puDep-(c32.pouce*pP32-c32.pouce*cS.jour/(c32.soud['S+T+P']*c32.pouce)))<1e-6&&Math.abs(out.twin.nuit-nuitAttendu)<1e-6;
const bad=Object.entries(C).filter(([k,v])=>!v).map(([k])=>k);console.log(bad.length?'RESULTAT: ECHEC '+bad.join(','):'RESULTAT: TOUT VERT');
