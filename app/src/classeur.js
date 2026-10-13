// classeur.js — CONTRÔLE CROISÉ CLASSEUR ↔ APPLI (lot 5, 13/10/2026). Ethan : « période de double chiffrage » — on chiffre encore au classeur
// (« Tableau chiffrage vierge » V42) ; l'appli doit retrouver LE MÊME prix, poste par poste. Ici, sans DOM (testable en Node) :
// · readClasseur(fichier) : ouvre un classeur REMPLI, lit sa base de prix (parsePrixWorkbook), chaque onglet d'étude (copie de l'onglet « Soudure »)
//   → une étude de l'appli (mêmes champs que la saisie : chantier, table des DN, purges, SST, CND, hydraulique…), et le « Récap Prix » (valeurs calculées
//   par Excel, en cache dans le fichier) poste par poste ;
// · compareClasseur(lu, base) : recalcule chaque étude avec le moteur de l'appli (prix.js) et la base DU CLASSEUR → écart par poste, avec les écarts
//   ATTENDUS expliqués (jours ouvrés, soudures sans case antenne / feeder…).
// Les cellules lues sont celles de la notice V42 (onglet « Soudure ») ; un onglet qui n'a pas cette forme est ignoré (signalé).
import {openXlsx} from './xlsx.js';
import {parsePrixWorkbook,calcEtude,emptyEtude,POSTES,POSTE_KEYS,sstTypes,raccTypes,joursChantier} from './prix.js';
const num=v=>typeof v==='number'?v:(v===null||v===undefined||v===''?0:(isFinite(+String(v).replace(',','.'))?+String(v).replace(',','.'):0));
const oui=v=>v===true||v===1||/^(oui|vrai|true)$/i.test(String(v??'').trim());
const up=s=>String(s??'').replace(/\s+/g,' ').trim();
const key=s=>up(s).toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g,'');
const dateISO=v=>{if(v===null||v===undefined||v==='')return '';if(typeof v==='number'){const d=new Date(Math.round((v-25569)*864e5));return isNaN(d)?'':d.toISOString().slice(0,10);}
  const s=String(v).trim();let m=s.match(/^(\d{1,2})\/(\d{1,2})\/(\d{2,4})$/);if(m){const y=m[3].length===2?'20'+m[3]:m[3];return y+'-'+m[2].padStart(2,'0')+'-'+m[1].padStart(2,'0');}m=s.match(/^(\d{4})-(\d{2})-(\d{2})/);return m?m[0]:'';};
/* un onglet d'étude du classeur : B27 « DN », J27 « Nombre de soudures » */
export const isEtudeSheet=sh=>!!sh&&key(sh.get('B27'))==='dn'&&/soudures/.test(key(sh.get('J27')));
/* lignes 5 → 43 du Récap Prix → clés des postes de l'appli */
const RECAP_KEYS=[[/amene/,'amene'],[/contener|benne|pelle/,'conteneur'],[/dechargement/,'decharg'],[/^transfert/,'transfert'],[/bardage/,'bardage'],[/^soudure/,'soudure'],[/^manchons/,'manchons'],[/^purges/,'purges'],[/^vidanges/,'vidanges'],[/vannes pre ?isolees/,'vpi'],[/vannes sst/,'sst'],[/raccordement/,'racc'],[/autocontrole/,'autoctrl'],[/coussins/,'coussins'],[/ressuage/,'ressuage'],[/ultrasons/,'us'],[/^radio/,'radio'],[/epreuve/,'epreuve'],[/eau adoucie/,'eau'],[/boulet/,'boulet'],[/rincage/,'rincage'],[/passivation/,'passivation'],[/conservation/,'conservation'],[/pre ?isolees/,'fo_preiso'],[/acier nu/,'fo_acier'],[/fournitures autres/,'fo_autres'],[/calo/,'calo'],[/pose aerien/,'pose_aerien'],[/foncage/,'foncage'],[/depose/,'depose'],[/extrusion/,'extrusion'],[/etiquettes/,'etiquettes'],[/nuit/,'nuit'],[/doe|plan iso|carnet/,'doe'],[/prestations autres/,'prest_autres'],[/frais divers/,'frais']];
const recapKey=lab=>{const k=key(lab).replace(/^-\s*/,'');for(const [re,id] of RECAP_KEYS)if(re.test(k))return id;return null;};
/* nom de feuille dans une formule « =TEST!$L$46 » ou « ='Zone A'!$L$46 » */
const sheetOfF=f=>{if(!f)return null;const m=String(f).match(/^=?\s*(?:IF\([^']*?)?(?:'((?:[^']|'')+)'|([A-Za-z0-9_À-ÿ.]+))!/);return m?(m[1]?m[1].replace(/''/g,"'"):m[2]):null;};
/* ── Récap Prix : colonnes d'étude (entre « Hors €/ml » et « Prix achat »), valeurs « avec marge » en cache, RCFA / marge de chaque ligne ── */
export async function readRecap(wb){const R=await wb.sheet('Récap Prix');if(!R)return null;let cAch=-1,cHors=-1,cRc=-1,cMg=-1,cV=-1;for(let c=1;c<=60;c++){const h=key(R.at(c,1));if(h==='prix achat'&&cAch<0)cAch=c;else if(/^hors/.test(h)&&cHors<0)cHors=c;else if(h==='rcfa'&&cRc<0)cRc=c;else if(h==='marge'&&cMg<0)cMg=c;else if(h==='prix vente'&&cV<0)cV=c;}
  if(cAch<0)return null;const c0=cHors>0?cHors+1:5;const rows=[];for(let r=4;r<=R.maxR&&r<=80;r++){const lab=R.at(1,r);if(!lab)continue;if(/^total$/i.test(up(lab))){rows.total=r;break;}rows.push({r,lab:up(lab),k:r===4?'ml':recapKey(lab)});}
  const cols=[];for(let c=c0;c<cAch;c++){const head=up(R.at(c,1));let sheet=null;for(const rr of [4,6,11,13]){sheet=sheetOfF(R.f(colName(c)+rr));if(sheet)break;}if(!head&&!sheet)continue;cols.push({c,head,sheet:sheet||head});}
  const out={cols:cols.map(x=>({head:x.head,sheet:x.sheet,postes:{},ml:0,frais:0})),marge:num(R.get(colName(cMg>0?cMg:cAch+2)+'3')),client:up(R.get(colName(cRc>0?cRc:cAch+1)+'3')),achat:num(R.get(colName(cAch)+(rows.total||44))),vente:cV>0?num(R.get(colName(cV)+(rows.total||44))):0,rcfaEur:cRc>0?num(R.get(colName(cRc)+(rows.total||44))):0,labels:{}};
  rows.forEach(row=>{if(!row.k)return;out.labels[row.k]=row.lab;const rc=cRc>0?num(R.get(colName(cRc)+row.r)):0,mg=cMg>0?num(R.get(colName(cMg)+row.r)):out.marge;const coef=1-(rc+mg);
    cols.forEach((x,i)=>{const v=R.get(colName(x.c)+row.r);if(row.k==='ml'){out.cols[i].ml=num(v);return;}if(v===null||v===''||typeof v!=='number')return;out.cols[i].postes[row.k]=(out.cols[i].postes[row.k]||0)+v*coef;});
    if(row.k!=='ml'){out.coef=out.coef||coef;}});
  out.rcfa=cRc>0?num(R.get(colName(cRc)+'5')):0;return out;}
const colName=i=>{let s='';while(i>0){const r=(i-1)%26;s=String.fromCharCode(65+r)+s;i=Math.floor((i-1)/26);}return s;};
/* ── un onglet d'étude → une étude de l'appli ── */
export function etudeFromSheet(sh,base,opts){opts=opts||{};const g=a=>sh.get(a);const n=a=>num(g(a));const s=a=>up(g(a));const notes=[];
  const z=emptyEtude(up(opts.nom||g('B2')||sh.name));z.source='classeur';z.sheet=sh.name;
  const C=z.chantier;Object.assign(C,{d0:dateISO(g('C9')),d1:dateISO(g('D9')),type:/petit/i.test(s('F9'))?'Petit':'Gros',iso:/iso ?3/i.test(s('I10'))?'Iso 3':/iso ?2/i.test(s('I10'))?'Iso 2':'Iso 1',nbDecharg:n('J10'),
    wc:oui(g('B11')),contener:oui(g('C11')),benne:oui(g('D11')),doe:oui(g('B13')),pelle:oui(g('C13')),arPelle:n('D13'),carnet:oui(g('B15')),arMO:oui(g('C15')),arMOQty:n('D15'),
    transfert:oui(g('H13')),eq1:s('I13')||'S+T+P',eq2:s('J13')||'M',hTransfert:n('K13'),nbOper:n('L13'),camionPlateau:oui(g('H15')),grue:oui(g('I15')),hGrue:n('J15'),bardage:oui(g('I16')),tauxBardage:g('J16')===null||g('J16')===''?5:n('J16')});
  const E=z.eq;Object.assign(E,{soud:s('D23')||'S+T+P',manch:s('D24')||'M',typeManchon:/electro/i.test(key(g('D25')))?'Electro':'Thermo',twin:oui(g('R24')),reduction:g('S24')===null||g('S24')===''?1:n('S24'),joursComplets:oui(g('V47')),
    ctrl:{depression:oui(g('G24')),filsDH:oui(g('H24')),ressuage:oui(g('I24')),itopo:oui(g('J24')),pression:oui(g('K24'))},coussins:oui(g('L24')),qteCoussins:n('M24'),ventilerCoussins:oui(g('N24'))});
  z.mlMode=/tube/i.test(s('L27'))?'tube':'tranchee';
  z.dn=[];let sansCase=0;for(let r=28;r<=45;r++){const dn=n('B'+r),J=n('J'+r),ml=n('L'+r);if(!dn||(!J&&!ml))continue;const ant=oui(g('H'+r)),fd=oui(g('I'+r));if(J&&!ant&&!fd)sansCase+=J;z.dn.push({dn,soud:J,ml,antenne:ant,feeder:fd});}
  z.nuit={on:n('D54')>0,dn:n('C54')||100,soud:n('D54'),rendement:g('C58')===null||g('C58')===''?0.8:n('C58')};
  z.purges={dn:n('H54')||32,purgeurAuto:oui(g('I54')),paires:n('J54'),deporte:oui(g('H57'))};
  const vt=key(g('O54'));z.vidanges={dn:n('N54')||50,type:/aspiration/.test(vt)?'aspiration':/nues/.test(vt)?'gravite_nue':'gravite',paires:n('P54'),deporte:oui(g('N58'))};
  z.vpi=[];z.sst=[];z.extrusion=[];const ST=sstTypes(base),RT=raccTypes(base);
  const sstId=name=>{const k=key(name);if(!k)return null;if(/by-?pass seul/.test(k))return 'bypass_seul';if(/fonds bomb/.test(k))return 'fonds_bombes';const t=ST.find(x=>key(x.name)===k)||ST.find(x=>k.includes(key(x.name))||key(x.name).includes(k));return t?t.id:null;};
  const raccId=name=>{const k=key(name);if(!k)return null;const t=RT.find(x=>key(x.name)===k)||RT.find(x=>{const a=key(x.name).split(/[^a-z0-9]+/).filter(w=>w.length>3);return a.length&&a.every(w=>k.includes(w));})||RT.find(x=>k.includes(key(x.name).split(' ')[0]));return t?t.id:null;};
  for(let r=67;r<=76;r++){const dn=n('B'+r);if(dn)z.vpi.push({dn,soud:n('C'+r),rallonge:oui(g('D'+r)),bypass:oui(g('E'+r)),prixVanne:n('F'+r)});
    const dS=n('J'+r),tS=s('K'+r);if(dS&&tS){const id=sstId(tS);if(id)z.sst.push({dn:dS,type:id,paires:n('M'+r)});else notes.push('SST « '+tS+' » DN '+dS+' : typologie inconnue de la base');}
    const dE=n('S'+r),tE=s('T'+r);if(dE&&tE)z.extrusion.push({dn:dE,type:tE,paires:n('U'+r)});}
  z.racc=[];for(let r=85;r<=100;r++){const dn=n('L'+r),t=s('M'+r);if(!dn||!t)continue;const id=raccId(t);if(id)z.racc.push({dn,type:id,paires:n('Q'+r)});else notes.push('Raccordement « '+t+' » DN '+dn+' : type inconnu de la base');}
  /* CND : distance calculée par le classeur (I84, depuis latitude / longitude) ; pourcentages Excel (10 % = 0,1) */
  const km=g('I84');const pc=a=>{const v=g(a);return v===null||v===''?0:Math.round(num(v)*100*1e6)/1e6;};
  const cnd=(r)=>{const o={antVac:n('E'+r),antPct:pc('F'+r),fdVac:n('E'+(r+2)),fdPct:pc('F'+(r+2)),raccFilms:n('E'+(r+4)),raccVac:n('H'+(r+4))};o.on=!!(o.antPct||o.fdPct||o.raccFilms||o.raccVac);return o;};
  z.cnd={km:typeof km==='number'?km:(km===null||km===''?'':num(km)),radio:cnd(88),us:cnd(96),ress:cnd(104)};
  /* hydraulique : 3 zones de cubatures, prestations Oui / Non, devis prestataire */
  const zr=(cDn,cMl)=>{const o=[];for(let r=117;r<=126;r++){const dn=n(cDn+r),ml=n(cMl+r);if(dn&&ml)o.push({dn,ml});}return o;};
  const H=z.hydro;H.zones=[{nom:'Zone 1',rows:zr('B','C')},{nom:'Zone 2',rows:zr('E','F')},{nom:'Zone 3',rows:zr('H','I')}];
  Object.assign(H,{trajetH:g('C130')===null||g('C130')===''?1:n('C130'),epreuveH:g('E130')===null||g('E130')===''?4:n('E130'),hydrocureur:oui(g('G130')),hHydro:[n('E132'),n('E133'),n('E134')],panier:s('C132')||'OS',epreuve:true,
    rincage:oui(g('C138')),passivation:oui(g('C146')),eau:oui(g('C154')),conservation:oui(g('C162')),adoucisseur:/\b5\b/.test(s('G154'))&&!/15/.test(s('G154'))?'5':'15',
    devis:{epreuve:n('D135')||'',rincage:n('G143')||'',passivation:n('E151')||'',eau:n('D159')||'',conservation:n('H167')||''}});
  const HEQ={epreuve:[132,133,134],rincage:[140,141,142],passivation:[148,149,150],eau:[156,157,158],conservation:[164,165,166]};const hEq={};Object.keys(HEQ).forEach(k=>{const d=HEQ[k].map((r,i)=>({i,eq:s('C'+r)})).filter(x=>x.eq&&x.eq!==H.panier);if(d.length)hEq[k]=d;});
  if(Object.keys(hEq).length)notes.push('Hydraulique : équipe différente selon la prestation ou la zone (l\'appli en prend une seule, « '+H.panier+' »)');
  z.boulet={on:oui(g('M135')),rows:[]};for(let r=137;r<=141;r++){const dn=n('L'+r);if(dn&&n('M'+r))z.boulet.rows.push({dn,ml:n('M'+r),passages:n('O'+r)});} /* classeur : passages vides = 0 */
  z.aerien={planIso:oui(g('N114')),rows:[],hDepl:n('R128'),devisPose:n('U130')||0,devisFO:0};for(let r=119;r<=127;r++){const dn=n('M'+r);if(!dn)continue;z.aerien.rows.push({type:/pr[ée]isol/i.test(s('L'+r))?'Préisolé':'Tradi',dn,ml:n('N'+r),c90:n('O'+r),soud:n('P'+r),calo:s('Q'+r)||'',support:s('S'+r)||''});}
  z.depose={rows:[]};for(let r=149;r<=153;r++){const dn=n('L'+r);if(dn&&n('M'+r))z.depose.rows.push({dn,ml:n('M'+r)});}
  z.foncage={rows:[]};for(let r=164;r<=166;r++){const dn=n('L'+r);if(dn)z.foncage.rows.push({dn,ml:n('N'+r),jours:n('O'+r),vac:n('P'+r)});}
  /* panier sur mesure : PU (et MO des pièces préparées) tels que calculés par le classeur */
  z.panier={fo:[],mo:[]};for(let r=175;r<=194;r++){const d=s('D'+r),q=n('E'+r);if(!d||!q)continue;const moU=n('F'+(r+547));z.panier.fo.push({label:d+(n('C'+r)?' DN '+n('C'+r):''),qty:q,pu:Math.round(n('F'+r)*100)/100,moU:moU?Math.round(moU*100)/100:undefined});}
  for(let r=175;r<=182;r++){const eq=s('J'+r),h=n('K'+r);if(eq&&h)z.panier.mo.push({eq,h,label:'Panier '+(s('I'+r)||'')});}
  const fp={rows:[],prixFO:n('O10')||0,prixTransport:n('P10')||0};const P=[['tubes','C','D'],['c90','E','F'],['cxx','G','H'],['tes','I','J'],['tesPlats','K','L'],['red','M','N'],['manch','O','P']];
  for(let r=203;r<=217;r++){const dn=n('B'+r);if(!dn)continue;const row={dn};let any=false;P.forEach(([k,cq,cp])=>{const q=n(cq+r),pu=n(cp+r);if(q||pu){row[k]={q,pu};any=true;}});if(any)fp.rows.push(row);}z.fopre=fp;
  if(opts.frais)z.autres.frais=Math.round(opts.frais*100)/100;
  if(sansCase)notes.push(sansCase+' soudure'+(sansCase>1?'s':'')+' sans case antenne / feeder');
  return {z,notes,sansCase,hEq};}
/* ── lecture complète d'un classeur rempli ── */
export async function readClasseur(src,meta){const wb=src&&src.sheets&&src.sheet?src:await openXlsx(src);const base=await parsePrixWorkbook(wb,meta);delete base.op.blocks;
  const recap=await readRecap(wb);const etudes=[];const ignored=[];
  /* onglets d'étude : ceux du Récap (dans son ordre), sinon tous ceux qui ont la forme de « Soudure » (le modèle caché « Soudure » ignoré s'il est vide) */
  const names=recap&&recap.cols.length?recap.cols.map(c=>c.sheet):wb.sheets.map(s=>s.name);
  for(const nm of names){const sh=await wb.sheet(nm);if(!isEtudeSheet(sh)){if(recap&&recap.cols.some(c=>c.sheet===nm))ignored.push(nm);continue;}const col=recap?recap.cols.find(c=>c.sheet===nm):null;
    const any=[...Array(18)].some((_,i)=>num(sh.get('J'+(28+i)))||num(sh.get('L'+(28+i))))||(col&&Object.values(col.postes).some(v=>Math.abs(v)>0.005));if(!any)continue;
    const coef=recap&&recap.coef?recap.coef:1;const e=etudeFromSheet(sh,base,{nom:up(sh.get('B2'))||nm,frais:col&&col.postes.frais?col.postes.frais:0});etudes.push(Object.assign(e,{sheet:nm,recap:col?col.postes:null,mlRecap:col?col.ml:null,coef}));}
  return {base,recap,etudes,ignored,fichier:(meta&&meta.name)||'',version:base.version,baseAt:base.at};}
/* ── comparaison poste par poste (moteur de l'appli + base du classeur) ── */
export function compareEtude(e,base){const R=calcEtude(e.z,base);const C=e.recap||{};const rows=[];const z=e.z;const why={};
  const jc=joursChantier(z.chantier.d0,z.chantier.d1);if(jc.cal&&jc.ouvres!==jc.cal&&(z.chantier.wc||z.chantier.contener||z.chantier.benne||z.chantier.pelle))why.conteneur='l\'appli compte '+jc.ouvres+' jours ouvrés (lundi → vendredi), le classeur '+jc.cal+' jours calendaires (règle validée le 13/10)';
  if(e.sansCase&&['radio','us','ressuage'].some(k=>{const c=(z.cnd||{})[k==='ressuage'?'ress':k];return c&&c.on&&num(c.fdPct);}))['radio','us','ressuage'].forEach(k=>{why[k]=e.sansCase+' soudure'+(e.sansCase>1?'s':'')+' sans case antenne / feeder : ignorée'+(e.sansCase>1?'s':'')+' par le classeur, comptée'+(e.sansCase>1?'s':'')+' en feeder par l\'appli (règle du 13/10)';});
  Object.keys(e.hEq||{}).forEach(k=>{why[k]='équipe '+e.hEq[k].map(x=>'« '+x.eq+' » en zone '+(x.i+1)).join(', ')+' dans le classeur ; l\'appli prend une seule équipe pour l\'hydraulique (« '+((z.hydro||{}).panier||'OS')+' »)';});
  POSTE_KEYS.forEach(k=>{const app=(R.postes[k]||{}).achat||0;const cl=C[k];if(cl===undefined&&Math.abs(app)<0.005)return;const ecart=app-(cl||0);rows.push({k,label:(POSTES.find(p=>p[0]===k)||[])[1]||k,cl:cl||0,app,ecart,ok:Math.abs(ecart)<0.5,why:Math.abs(ecart)>=0.5?(why[k]||''):''});});
  const tCl=rows.reduce((s,r)=>s+r.cl,0),tApp=rows.reduce((s,r)=>s+r.app,0);
  return {rows,tCl,tApp,ecart:tApp-tCl,ml:R.ml,mlCl:e.mlRecap,nOk:rows.filter(r=>r.ok).length,nExp:rows.filter(r=>!r.ok&&r.why).length,nBad:rows.filter(r=>!r.ok&&!r.why).length};}
export function compareClasseur(L,base){base=base||L.base;const par=L.etudes.map(e=>Object.assign({nom:e.z.nom,sheet:e.sheet,notes:e.notes},compareEtude(e,base)));
  const tot={cl:par.reduce((s,p)=>s+p.tCl,0),app:par.reduce((s,p)=>s+p.tApp,0)};tot.ecart=tot.app-tot.cl;const coef=L.recap&&L.recap.coef?L.recap.coef:1-0.125;
  return {par,tot,venteCl:L.recap?L.recap.vente:tot.cl/coef,venteApp:tot.app/coef,coef,nBad:par.reduce((s,p)=>s+p.nBad,0),nExp:par.reduce((s,p)=>s+p.nExp,0)};}
