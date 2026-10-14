// Harnais de non-régression du moteur de prix (13/10/2026 soir) : une étude « tout compris » (fictive) sur la base de test fixture_prix.xlsx (fictive) ;
// imprime les postes (mo / fo / st / loc) et quelques détails — sert à vérifier qu'un refactoring du moteur ne change aucun montant.
import fs from 'fs';import path from 'path';import {fileURLToPath} from 'url';
import {parsePrixWorkbook,calcEtude,emptyEtude,calcChiffrage,DNS} from '../src/prix.js';
const HERE=path.dirname(fileURLToPath(import.meta.url));
const load=f=>{const b=fs.readFileSync(path.join(HERE,f));return b.buffer.slice(b.byteOffset,b.byteOffset+b.byteLength);};
const base=await parsePrixWorkbook(load('fixture_prix.xlsx'),{name:'fixture_prix.xlsx'});
export function kitchen(){const z=emptyEtude('Zone test');z.chantier=Object.assign(z.chantier,{d0:'2026-11-02',d1:'2026-11-27',wc:true,contener:true,benne:true,pelle:true,arPelle:2,arMO:true,arMOQty:1,nbDecharg:2,doe:true,carnet:true});
  z.dn=[{dn:50,soud:20,ml:80,nAnt:8},{dn:100,soud:40,ml:200,antenne:true},{dn:150,soud:16,ml:96,feeder:true}];
  z.purges={dn:32,purgeurAuto:true,paires:2,deporte:true};z.vidanges={dn:50,type:'gravite',paires:1,deporte:false};
  z.vpi=[{dn:100,soud:2,prixVanne:400,rallonge:true,bypass:true},{dn:50,soud:1,prixVanne:150}];
  z.extrusion=[{dn:(base.op.extrusion||{rows:[{dnPehd:110}]}).rows[0].dnPehd,type:'Manchons',paires:2},{dn:(base.op.extrusion||{rows:[{dnPehd:110}]}).rows[0].dnPehd,type:'Coude',paires:1}];
  z.cnd={km:120,radio:{on:true,antPct:10,antVac:9,fdPct:20,fdVac:12,raccFilms:2,raccVac:1},us:{on:true,antPct:5,antVac:15,fdPct:0,fdVac:0,raccFilms:0,raccVac:1},ress:{on:false}};
  z.racc=[{dn:100,type:(base.op.paniers||[]).filter(p=>/^racc_/.test(p.id))[0]?.id,paires:1}];
  z.hydro=Object.assign(z.hydro,{zones:[{nom:'Zone 1',rows:[{dn:100,ml:400},{dn:50,ml:160}]},{nom:'Zone 2',rows:[{dn:150,ml:200}],pr:{rincage:true,eau:true}},{nom:'Zone 3',rows:[{dn:80,ml:100}],pr:{epreuve:false,passivation:true,conservation:true}}],
    trajetH:1,epreuveH:4,hydrocureur:true,hHydro:[2,0,1],panier:'OS',epreuve:true,rincage:true,passivation:false,eau:false,conservation:false,adoucisseur:'15',global:{rincage:true},devis:{conservation:0}});
  z.boulet={on:true,rows:[{dn:100,ml:400,passages:1},{dn:150,ml:200,passages:2}]};
  z.aerien={planIso:true,rows:[{dn:80,ml:12,c90:2,soud:4,type:'Tradi',support:'',calo:'PVC'}],hDepl:2,devisPose:0,devisFO:0};
  z.depose={rows:[{dn:100,ml:30},{dn:150,ml:55}]};z.foncage={rows:[{dn:100,ml:24,vac:2,jours:3}]};
  z.panier={fo:[{label:'x',qty:3,pu:7}],mo:[{eq:'S+T',h:4}]};z.autres={fournitures:[{label:'f',montant:120}],prestations:[{label:'p',montant:300}],frais:175};
  z.paniers=[{id:'P1',nom:'Panier',unit:'u',qty:2,items:[{kind:'mo',eq:'S+T',h:3,unit:'h'},{kind:'fo',label:'a',qty:2,pu:10},{kind:'st',label:'b',montant:50}]}];
  z.nuit={on:true,dn:100,soud:10,rendement:0.8};return z;}
const z=kitchen();const R=calcEtude(z,base);
const P={};Object.keys(R.postes).sort().forEach(k=>{const l=R.postes[k];P[k]=[l.mo,l.fo,l.st,l.loc].map(x=>Math.round(x*1e6)/1e6);});
const z2=kitchen();z2.hydro.devis={rincage:5000};const R2=calcEtude(z2,base);P.devis_rincage=[R2.postes.rincage.st,R2.postes.rincage.achat];
console.log(JSON.stringify(P));
