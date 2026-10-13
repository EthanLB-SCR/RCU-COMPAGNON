// make_fixture_classeur.mjs — étape 2 de test/make_fixture_classeur.py : écrit dans le « Récap Prix » de fixture_classeur.xlsx les montants
// « avec marge » que donnerait le CLASSEUR pour l'onglet « ZONE A » : moteur de l'appli + règles du classeur là où elles diffèrent (base vie en jours
// CALENDAIRES, soudures sans case antenne / feeder ignorées au contrôle radio) + un écart VOLONTAIRE (+120 € d'achat sur les purges, « à regarder »).
// node test/make_fixture_classeur.mjs
import fs from 'fs';import path from 'path';import {fileURLToPath} from 'url';
import {openXlsx,setCellsXml,rezip,inflate} from '../src/xlsx.js';
import {readClasseur} from '../src/classeur.js';
import {calcEtude} from '../src/prix.js';
const HERE=path.dirname(fileURLToPath(import.meta.url));const F=path.join(HERE,'fixture_classeur.xlsx');
const buf=fs.readFileSync(F);const ab=buf.buffer.slice(buf.byteOffset,buf.byteOffset+buf.byteLength);
const wb=await openXlsx(ab);const L=await readClasseur(wb,{name:'fixture_classeur.xlsx'});const e=L.etudes[0];if(!e)throw new Error('onglet ZONE A non lu');
const R=calcEtude(e.z,L.base);const coef=1-0.125;
const ach={};Object.keys(R.postes).forEach(k=>{ach[k]=R.postes[k].achat;});
/* règles du classeur */
const d=R.detail.conteneur;ach.conteneur+= (d.cal-d.nbJ)*d.fJour;                       // DATEDIF calendaire
const z2=JSON.parse(JSON.stringify(e.z));z2.dn.forEach(r=>{if(!r.antenne&&!r.feeder)r.soud=0;});ach.radio=calcEtude(z2,L.base).postes.radio.achat; // sans case = non contrôlée
ach.purges+=120;                                                                          // écart volontaire
const ROW={amene:5,conteneur:6,decharg:7,transfert:8,bardage:9,soudure:11,manchons:12,purges:13,vidanges:14,vpi:15,sst:16,racc:17,autoctrl:19,coussins:20,ressuage:21,us:22,radio:23,epreuve:24,eau:25,boulet:26,rincage:27,passivation:28,conservation:29,fo_preiso:31,fo_acier:32,fo_autres:33,calo:34,pose_aerien:35,foncage:36,depose:37,extrusion:38,etiquettes:39,nuit:40,doe:41,prest_autres:42,frais:43};
const vals={E4:R.ml};let tot=0,totA=0;const r2=v=>Math.round(v*1e6)/1e6;
Object.entries(ROW).forEach(([k,r])=>{const a=k==='frais'?200*coef:(ach[k]||0);const v=a/coef;vals['E'+r]=r2(v);vals['F'+r]=r2(a);vals['I'+r]=r2(v);tot+=v;totA+=a;});
vals.E44=r2(tot);vals.F44=r2(totA);vals.I44=r2(tot);vals.E45=Math.ceil(tot/R.ml*100)/100+' €/ml';
const sh=wb.sheets.find(s=>s.name==='Récap Prix');let xml=await inflate(wb.Z[sh.path]);xml=setCellsXml(xml,vals);
const out=await rezip(wb.Z,{[sh.path]:xml});fs.writeFileSync(F,Buffer.from(out));
console.log('Récap écrit : achat',Math.round(totA*100)/100,'· vente',Math.round(tot*100)/100,'· ml',R.ml,'· conteneur +',(d.cal-d.nbJ)*d.fJour,'· purges +120');
