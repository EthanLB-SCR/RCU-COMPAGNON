// prix.js — LE MOTEUR DE PRIX DU CHIFFRAGE (13/10/2026) : port du classeur « Tableau chiffrage vierge 26.08.2026 » d'Ethan (notice V42).
// · lecture du classeur (.xlsm) : Base MO (taux, équipes, cadences, autocontrôle), Base FO (tables FO_* et paramètres FO_*), Base Opération (les PANIERS par DN :
//   équipe × heures + fournitures) → une base de prix JSON, éditable dans l'appli (registre « prix ») et ré-importable depuis le classeur ;
// · calcul d'une étude (= un onglet « Soudure » du classeur) : chantier, table des DN, purges / vidanges, vannes préisolées, SST, extrusion, raccordement, CND,
//   prestations hydrauliques, boulet mousse, aérien, dépose, fonçage, panier sur mesure, fourniture préisolée, nuit, étiquettes, DOE, paniers libres ;
// · récapitulatif : les 39 postes du Récap Prix, prix d'achat → prix de vente = achat / (1 − (RCFA + marge)), €/ml. Aucun DOM ici (testable en Node).
import {openXlsx} from './xlsx.js';
import {frFeries} from './rh.js';
const num=v=>typeof v==='number'?v:(v===null||v===undefined||v===''?0:(isFinite(+v)?+v:0));
const oui=v=>v===true||/^oui$/i.test(String(v||''));
const up=s=>String(s||'').replace(/\s+/g,' ').trim();
const key=s=>up(s).toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g,'');
export const DNS=[20,25,32,40,50,65,80,100,125,150,200,250,300,350,400,450,500,600];
export const ISOS=['Iso 1','Iso 2','Iso 3'];
/* ═════════ 1 · LECTURE DU CLASSEUR ═════════ */
/* référence de fourniture dans une formule de Base Opération : k × VLOOKUP(<DN>, FO_Table[], col, FALSE) · FO_Param · peinture SST · constante */
function parseRefs(f){if(!f)return null;const refs=[];let rest=f;
  const re=/(?:(\d+(?:\.\d+)?)\*)?VLOOKUP\(([^,]+),(FO_\w+)\[\],(\d+),FALSE\)/g;let m;while((m=re.exec(f))){refs.push({k:m[1]?+m[1]:1,dn:/^\$?[A-Z]+\$?\d+$/.test(m[2])?'row':(/^\d+$/.test(m[2])?+m[2]:m[2]),t:m[3],c:+m[4]});rest=rest.replace(m[0],'');}
  if(/FO_Peinture_SST_Seuil_DN/.test(f))return {peintureSST:true};
  const pm=rest.match(/\bFO_[A-Za-z0-9_]+/g)||[];pm.forEach(p=>refs.push({param:p}));
  if(!refs.length){const c=f.replace(/[=\s]/g,'');return /^\d+(\.\d+)?$/.test(c)?{const:+c}:null;}
  return {refs};}
async function readBlocks(sh){/* blocs de Base Opération : titre (col A, ligne quasi vide) → en-tête (col A ∈ DN / Désignation / Paramètre / Type de support / Code / Poste) → lignes jusqu'à la première ligne vide */
  const blocks=[];const loose={};const HEAD=['dn','designation','parametre','type de support','code','poste','piece'];let r=1;
  while(r<=sh.maxR){const a=sh.at(1,r);if(typeof a==='string'&&a.trim()){const nonEmpty=[];for(let c=1;c<=30;c++){const v=sh.at(c,r);if(v!==null&&v!=='')nonEmpty.push(c);}
      if(nonEmpty.length<=2&&!HEAD.includes(key(a))){if(nonEmpty.length===2&&typeof sh.at(2,r)==='number'){loose[up(a)]=sh.at(2,r);r++;continue;} /* paramètre isolé (ex. Boîtiers Plexo + pose) */
        let hr=-1;for(let k=1;k<=4;k++){const h=sh.at(1,r+k);if(typeof h==='string'&&HEAD.includes(key(h))){hr=r+k;break;}}
        if(hr>0){const header=[];let last=1;for(let c=1;c<=30;c++){const v=sh.at(c,hr);if(v!==null&&v!=='')last=c;header[c-1]=v===null?'':String(v);}
          const groups=[];for(let c=1;c<=last;c++){const v=sh.at(c,hr-1);groups[c-1]=hr-1>r&&v!==null&&v!==''?String(v):'';}
          const rows=[];let rr=hr+1;while(rr<=sh.maxR){const a2=sh.at(1,rr);if(a2===null||a2===''){break;}const row=[];const f=[];for(let c=1;c<=last;c++){row[c-1]=sh.at(c,rr);f[c-1]=sh.f(colName_(c)+rr);}rows.push({v:row,f});rr++;}
          blocks.push({title:up(a),hr,header:header.slice(0,last).map(up),groups:groups.map(up),rows});r=rr;continue;}}}
    r++;}
  return {blocks,loose};}
const colName_=i=>{let s='';while(i>0){const r=(i-1)%26;s=String.fromCharCode(65+r)+s;i=Math.floor((i-1)/26);}return s;};
/* panier (par DN) à partir d'un bloc : colonnes Équipe / Nb heures / Montant MO / fournitures… / Total Fourn. / TOTAL */
function panierFromBlock(b,opts){opts=opts||{};const H=b.header.map(key);const iDN=H.indexOf('dn');const iEq=H.findIndex(h=>h==='equipe'||h==='equipe 1');const iH=H.findIndex(h=>h==='nb heures'||h==='nb heures 1');const iEq2=H.indexOf('equipe 2'),iH2=H.indexOf('nb heures 2');const iMO=H.indexOf('montant mo');const iTF=H.indexOf('total fourn.');const iTot=H.lastIndexOf('total');
  if(iDN<0||iEq<0||iH<0)return null;const foCols=[];if(iMO>=0&&iTF>iMO)for(let c=iMO+1;c<iTF;c++)foCols.push(c);const extraCols=[];const iTotFirst=H.indexOf('total');if(iTotFirst>=0)for(let c=iTotFirst+1;c<b.header.length;c++)if(b.header[c]&&!/^total/i.test(b.header[c]))extraCols.push(c);
  const rows=b.rows.map(r=>{const v=r.v;const dn=num(v[iDN]);if(!dn)return null;const mo=[{eq:up(v[iEq]),h:num(v[iH]),hf:hoursRef(r.f[iH])}];if(iEq2>=0&&v[iEq2])mo.push({eq:up(v[iEq2]),h:num(v[iH2]),hf:hoursRef(r.f[iH2])});
    const fo=foCols.map(c=>{const lab=b.header[c];const km=lab.match(/×\s*(\d+)/);const qty=km?+km[1]:1;const amt=num(v[c]);return {label:lab.replace(/\s*×\s*\d+/,'').trim(),qty,pu:qty?amt/qty:amt,amount:amt,ref:parseRefs(r.f[c])};});
    const extra=extraCols.map(c=>{const lab=b.header[c];const km=lab.match(/×\s*(\d+)/);const qty=km?+km[1]:1;const amt=num(v[c]);return {label:lab.replace(/\s*×\s*\d+/,'').trim(),qty,pu:qty?amt/qty:amt,amount:amt,ref:parseRefs(r.f[c])};});
    return {dn,mo,fo,extra,moAmount:iMO>=0?num(v[iMO]):0,foAmount:iTF>=0?num(v[iTF]):0,total:iTotFirst>=0?num(v[iTotFirst]):0};}).filter(Boolean);
  return {id:opts.id||key(b.title).replace(/[^a-z0-9]+/g,'_'),title:b.title,unit:opts.unit||'paire',rows};}
const hoursRef=f=>{if(!f)return null;const m=f.match(/^(\d+(?:\.\d+)?)\*'Base MO'!\$G\$5\/VLOOKUP\([^,]+,'Base MO'!\$A\$24:\$F\$41,(\d+),FALSE\)$/);return m?{k:+m[1],col:+m[2]}:null;}; /* k × heures/jour ÷ cadence (col 3 = 1 soudeur, 4 = S+T, 5 = S+T+P) */
export async function parsePrixWorkbook(src,meta){const wb=await openXlsx(src);const base={version:'',at:'',src:(meta&&meta.name)||'',mo:{},fo:{tables:{},params:{}},op:{blocks:[],loose:{},paniers:[]}};
  /* ── Base MO ── */
  const mo=await wb.sheet('Base MO');if(!mo)throw new Error('feuille « Base MO » absente');
  let r=mo.find('TAUX HORAIRES');if(r<0)throw new Error('Base MO : « TAUX HORAIRES PAR POSTE » introuvable');r+=2;base.mo.postes=[];while(mo.at(1,r)){base.mo.postes.push({code:up(mo.at(1,r)),taux:num(mo.at(2,r)),fgC:num(mo.at(3,r)),fgS:num(mo.at(4,r)),sin:num(mo.at(5,r)),hJour:num(mo.at(7,r))||10});r++;}
  base.mo.hJour=(base.mo.postes[0]||{}).hJour||10;
  r=mo.find('COMPOSITION');r+=2;base.mo.equipes=[];const compH=['Soudeur','Tuyauteur','Manchonneur','Chauffeur'];while(mo.at(1,r)){const nom=up(mo.at(1,r));const comp={};compH.forEach((p,i)=>{comp[p]=num(mo.at(2+i,r));});const n=num(mo.at(6,r))||Object.values(comp).reduce((s,x)=>s+x,0)||1;const code=((nom.match(/\(([^)]+)\)$/)||[])[1]||(/OS x (\d)/i.test(nom)?'OS'+'+OS'.repeat(+nom.match(/x (\d)/i)[1]-1):nom)).replace(/\s+/g,'');base.mo.equipes.push({code,nom,comp,n,os:/opérations spécifiques|^OS/i.test(nom)?n:0});r++;}
  r=mo.find('CADENCES');let hr=-1;for(let k=1;k<=3;k++)if(key(mo.at(1,r+k))==='dn'){hr=r+k;break;}base.mo.cad=[];r=hr+1;
  while(typeof mo.at(1,r)==='number'){const g=c=>num(mo.at(c,r));base.mo.cad.push({dn:g(1),pouce:g(2),soud:{S:g(3),'S+T':g(4),'S+T+P':g(5)},manch:{thermo:[[g(9),g(10)],[g(11),g(12)],[g(13),g(14)]],electro:[[g(15),g(16)],[g(17),g(18)],[g(19),g(20)]]},ctrl:{depression:g(21),filsDH:g(22),ressuage:g(23),itopo:g(24),pression:g(25)},coussin:g(26)||num(mo.at(26,hr+1))});r++;}
  r=mo.find('MO DOE');base.mo.docs={};if(r>0){r+=3;while(mo.at(1,r)){const lab=key(mo.at(1,r));base.mo.docs[/doe/.test(lab)?'doe':/carnet/.test(lab)?'carnet':/iso/.test(lab)?'planIso':lab]=num(mo.at(2,r));r++;}}
  /* ── Base FO : tables et paramètres nommés ── */
  for(const t of wb.tables){if(!/^FO_/.test(t.name))continue;const T=await wb.table(t.name);if(T)base.fo.tables[t.name]={cols:T.cols.map(up),rows:T.rows.map(row=>{const o={};T.cols.forEach(c=>{o[up(c)]=row[c];});return o;})};}
  for(const n of Object.keys(wb.names)){if(!/^FO_/.test(n)||/:\$/.test(wb.names[n]))continue;const v=await wb.named(n);if(v!==undefined)base.fo.params[n]=typeof v==='string'?up(v):v;}
  const fo=await wb.sheet('Base FO');if(fo){const m=String(fo.get('A2')||'').match(/V(\d+)/);base.version=m?'V'+m[1]:'';base.foTitle=up(fo.get('A2'));
    /* liste des pièces du panier sur mesure (section 21) */const pr=fo.find('21. LISTE');if(pr>0){base.fo.pieces=[];let rr=pr+3;while(fo.at(1,rr)){base.fo.pieces.push({piece:up(fo.at(1,rr)),col:num(fo.at(2,rr)),moCol:fo.at(3,rr)?num(fo.at(3,rr)):null});rr++;}}}
  /* ── Base Opération ── */
  const op=await wb.sheet('Base Opération');if(op){const {blocks,loose}=await readBlocks(op);base.op.loose=loose;base.op.blocks=blocks.map(b=>({title:b.title,header:b.header,groups:b.groups,rows:b.rows.map(x=>({v:x.v,f:x.f.map(f=>f?String(f).slice(0,400):null)}))}));
    const P=[];const find=re=>blocks.find(b=>re.test(b.title));
    const add=(b,opts)=>{if(!b)return;const p=panierFromBlock(b,opts);if(p)P.push(p);};
    add(find(/^PURGE$/),{id:'purge',unit:'paire'});add(find(/^VIDANGE ASPIRATION/),{id:'vid_asp',unit:'paire'});add(find(/^VIDANGE GRAVIT/),{id:'vid_grav',unit:'paire'});
    blocks.filter(b=>/^SST — /.test(b.title)).forEach(b=>add(b,{id:'sst_'+key(b.title.replace(/^SST — /,'')).replace(/[^a-z0-9]+/g,'_'),unit:'paire'}));
    blocks.filter(b=>/^RACCORDEMENT/.test(b.title)).forEach(b=>add(b,{id:'racc_'+key(b.title.replace(/^RACCORDEMENT( — | SUR )?/,'')).replace(/[^a-z0-9]+/g,'_'),unit:'u'}));
    base.op.paniers=P;
    const bp=find(/^BY-PASS - FONDS/);if(bp){const H=bp.header.map(key);const iDN=H.indexOf('dn');const iEq=H.indexOf('equipe');const iHb=H.indexOf('by-pass'),iHf=H.indexOf('fonds bombes');const iTx=H.indexOf('taux horaire');const iTb=H.lastIndexOf('by-pass'),iTf=H.lastIndexOf('fonds bombes');
      base.op.bypass=bp.rows.map(r=>{const v=r.v;return {dn:num(v[iDN]),eq:up(v[iEq]),hBypass:num(v[iHb]),hFonds:num(v[iHf]),hfB:hoursRef(r.f[iHb]),hfF:hoursRef(r.f[iHf]),totBypass:num(v[iTb]),totFonds:num(v[iTf]),rateStored:num(v[iTx])};}).filter(x=>x.dn);}
    const ex=find(/^EXTRUSION/);if(ex){const H=ex.header.map(key);const iTot=ex.groups.findIndex(g=>/^TOTAL/i.test(g));const types=[];for(let c=iTot;c<ex.header.length;c++)if(ex.header[c])types.push({c,name:up(ex.header[c])});const iEq=H.indexOf('equipe');const hCols={};['manchons','coude','pec','purges','by-pass'].forEach(k=>{hCols[k]=H.indexOf(k);});const iAm=H.findIndex(h=>/amort/.test(h)),iCons=H.findIndex(h=>/consomm/.test(h));
      base.op.extrusion={types:types.map(t=>t.name),rows:ex.rows.map(r=>{const v=r.v;const o={dnPehd:num(v[0]),eq:up(v[iEq]),h:{},tot:{},amort:num(v[iAm]),conso:num(v[iCons])};Object.keys(hCols).forEach(k=>{o.h[k]=num(v[hCols[k]]);});types.forEach(t=>{o.tot[t.name]=num(v[t.c]);});return o;}).filter(x=>x.dnPehd)};}
    const dc=find(/^DÉCHARGEMENT/);if(dc){const H=dc.header.map(key);const v=dc.rows[0]?dc.rows[0].v:[];base.op.dechargement={eq1:up(v[H.indexOf('equipe 1')]),h1:num(v[H.indexOf('nb heures 1')]),eq2:up(v[H.indexOf('equipe 2')]),h2:num(v[H.indexOf('nb heures 2')]),montant:num(v[H.indexOf('montant mo')])};}
    const ca=find(/^CALORIFUGEAGE$/);if(ca){const H=ca.header.map(key);base.op.calo={coefCoude:num(op.get('U371'))||0.8,rows:ca.rows.map(r=>{const v=r.v;return {dn:num(v[0]),eq:up(v[H.indexOf('equipe')]),mlhPVC:num(v[H.indexOf('ml/h pvc')]),mlhIso:num(v[H.indexOf('ml/h isoxal')])};}).filter(x=>x.dn)};}
    const co=find(/^COLLIERS/);if(co){const H=co.header.map(key);const v=co.rows[0]?co.rows[0].v:[];base.op.colliers={eq:up(v[H.indexOf('equipe')]),cadence:num(v[H.findIndex(h=>/cadence/.test(h))])};}
    const dp=find(/^DÉCOUPE/);if(dp){const H=dp.header.map(key);base.op.decoupe=dp.rows.map(r=>({dn:num(r.v[0]),eq:up(r.v[H.indexOf('equipe')]),coupesJour:num(r.v[H.findIndex(h=>/coupes/.test(h))])})).filter(x=>x.dn);}
    const bpp=find(/^BY-PASS SUR PURGE/);if(bpp){const H=bpp.header.map(key);const iDN=H.indexOf('dn'),iQ=H.indexOf('qte'),iPU=H.indexOf('prix unitaire');base.op.bypassPurge={items:bpp.rows.map(r=>({label:up(r.v[0]),dn:num(r.v[iDN]),qty:num(r.v[iQ]),pu:num(r.v[iPU]),ref:parseRefs(r.f[iPU])})).filter(x=>x.label&&!/total|sous-total|nombre/i.test(x.label)),nb:num(op.get('C460'))||2};}}
  const suivi=await wb.sheet('Suivi actualisation');if(suivi){let dc=-1;for(let c=1;c<=8;c++){for(let rr=1;rr<=4;rr++){if(/^date/i.test(String(suivi.at(c,rr)||'')))dc=c;}}if(dc>0){for(let rr=suivi.maxR;rr>=2;rr--){const d=suivi.at(dc,rr);if(d){base.at=typeof d==='number'?new Date(Math.round((d-25569)*864e5)).toISOString().slice(0,10):String(d).slice(0,10);break;}}}}
  return base;}
/* ═════════ 2 · ACCÈS À LA BASE ═════════ */
export const equipeOf=(base,code)=>{const c=String(code||'').replace(/\s+/g,'').toUpperCase();return (base.mo.equipes||[]).find(e=>e.code.toUpperCase()===c)||null;};
export function posteRate(base,code){const p=(base.mo.postes||[]).find(x=>key(x.code).startsWith(key(code)));return p?p.taux+p.fgC+p.fgS+p.sin:0;}
export function teamCost(base,code){const e=equipeOf(base,code);if(!e)return {h:0,jour:0,nuitH:0,nuitJour:0,n:0};const H=base.mo.hJour||10;const P=base.mo.postes||[];const rate=(name,night)=>{const p=P.find(x=>key(x.code).startsWith(key(name)));if(!p)return 0;return night?p.taux*2+p.fgC+p.fgS+p.sin:p.taux+p.fgC+p.fgS+p.sin;};
  let h=0,nh=0;if(e.os){const os=P.find(x=>/op[ée]rations sp[ée]cifiques|^os\b/i.test(x.code));h=(os?rate(os.code):0)*e.os;nh=(os?rate(os.code,true):0)*e.os;}else{const M={Soudeur:'Soudeur',Tuyauteur:'Tuyauteur',Manchonneur:'Manchonneur',Chauffeur:'Chauffeur'};Object.keys(e.comp).forEach(k=>{h+=e.comp[k]*rate(M[k]);nh+=e.comp[k]*rate(M[k],true);});}
  return {h,jour:h*H,nuitH:nh,nuitJour:nh*H,n:e.n};}
export const osRate=base=>teamCost(base,'OS').h;
export const foParam=(base,n,def)=>{const v=base.fo.params[n];return v===undefined||v===null?(def===undefined?0:def):num(v);};
export function foLookup(base,table,dn,col){const T=base.fo.tables[table];if(!T)return 0;const row=T.rows.find(r=>num(r[T.cols[0]])===num(dn));if(!row)return 0;const cname=typeof col==='number'?T.cols[col-1]:T.cols.find(c=>key(c).startsWith(key(col)));return cname?num(row[cname]):0;}
export const cadOf=(base,dn)=>(base.mo.cad||[]).find(c=>c.dn===num(dn))||null;
const isoIdx=iso=>/3/.test(String(iso))?2:/2/.test(String(iso))?1:0;
/* prix d'une référence de fourniture (ref de Base Opération) au DN donné */
export function refPrice(base,ref,dn,fallback){if(!ref)return fallback;if(ref.const!==undefined)return ref.const;if(ref.peintureSST){const s=foParam(base,'FO_Peinture_SST_Seuil_DN',100);return dn>=s?foParam(base,'FO_Peinture_SST_Gros_DN'):foParam(base,'FO_Peinture_SST_Petit_DN');}
  if(ref.refs){let tot=0;for(const r of ref.refs){if(r.param){tot+=foParam(base,r.param);continue;}const d=r.dn==='row'?dn:(typeof r.dn==='number'?r.dn:foParam(base,r.dn));tot+=r.k*foLookup(base,r.t,d,r.c);}return tot;}
  return fallback;}
/* un panier par DN : MO recalculée (heures × taux équipe), fournitures recalculées (réf. FO) — avec les écrasements de l'utilisateur (base.over) */
export function panierRow(base,pid,dn){const P=(base.op.paniers||[]).find(p=>p.id===pid);if(!P)return null;const r=P.rows.find(x=>x.dn===num(dn));if(!r)return null;const ov=((base.over||{})[pid]||{})[dn]||{};
  const mo=r.mo.map((m,i)=>{const o=ov['mo'+i]||{};const eq=o.eq||m.eq;let h=o.h!==undefined?+o.h:m.h;if(o.h===undefined&&m.hf){const c=cadOf(base,dn);const col=m.hf.col;const cad=c?(col===3?c.soud.S:col===4?c.soud['S+T']:c.soud['S+T+P']):0;if(cad)h=m.hf.k*(base.mo.hJour||10)/cad;}const rate=teamCost(base,eq).h;return {eq,h,rate,amount:h*rate};});
  const unit=(f,qty)=>{if(f.ref){const tot=refPrice(base,f.ref,dn,f.pu*(f.qty||1));return (f.qty||1)?tot/(f.qty||1):tot;}return f.pu;}; /* la formule du classeur porte déjà le « ×2 » : prix unitaire = total de la formule ÷ quantité */
  const fo=r.fo.map((f,i)=>{const o=ov['fo'+i]||{};const qty=o.qty!==undefined?+o.qty:f.qty;const pu=o.pu!==undefined?+o.pu:unit(f,qty);return {label:f.label,qty,pu,amount:qty*pu};});
  const extra=(r.extra||[]).map(f=>{const pu=unit(f,f.qty);return {label:f.label,qty:f.qty,pu,amount:f.qty*pu};});
  const moT=mo.reduce((s,x)=>s+x.amount,0),foT=fo.reduce((s,x)=>s+x.amount,0);return {id:pid,title:P.title,dn,mo,fo,extra,moAmount:moT,foAmount:foT,total:moT+foT,unit:P.unit};}
export const panierDNs=(base,pid)=>{const P=(base.op.paniers||[]).find(p=>p.id===pid);return P?P.rows.map(r=>r.dn):[];};
export const sstTypes=base=>(base.op.paniers||[]).filter(p=>/^sst_/.test(p.id)).map(p=>({id:p.id,name:p.title.replace(/^SST — /,'')}));
export const raccTypes=base=>(base.op.paniers||[]).filter(p=>/^racc_/.test(p.id)).map(p=>({id:p.id,name:p.title.replace(/^RACCORDEMENT( — | SUR )?/,'')}));
export const sstBoitiers=base=>foParam(base,'FO_Boitier_Plexo')*foParam(base,'FO_Nb_Boitiers_Par_Vanne')+foParam(base,'FO_MO_Pose_Boitiers')*teamCost(base,'M').h; /* pose des boîtiers par le manchonneur (classeur : $C$9) */
export function bypassPurge(base){const B=base.op.bypassPurge;if(!B)return 0;let s=0;B.items.forEach(it=>{if(/^MO/i.test(it.label)){s+=it.qty*teamCost(base,'S+T').h;}else s+=it.qty*refPrice(base,it.ref,it.dn||50,it.pu);});return s*(B.nb||2);}
export function bypassFonds(base,dn,fonds){const r=(base.op.bypass||[]).find(x=>x.dn===num(dn));if(!r)return {total:0,mo:0};const hf=fonds?r.hfF:r.hfB;let h=fonds?r.hFonds:r.hBypass;if(hf){const c=cadOf(base,dn);const cad=c?(hf.col===3?c.soud.S:hf.col===4?c.soud['S+T']:c.soud['S+T+P']):0;if(cad)h=hf.k*(base.mo.hJour||10)/cad;}const moA=h*teamCost(base,r.eq).h;const stored=fonds?r.totFonds:r.totBypass;const storedH=fonds?r.hFonds:r.hBypass;const storedMo=storedH*r.rateStored;return {total:moA+Math.max(0,stored-storedMo),mo:moA};} /* fournitures = total figé − MO figée du classeur (les prix de ces pièces suivent Base FO au prochain import) */
export function sstPrice(base,typeId,dn){if(typeId==='bypass_seul')return bypassFonds(base,dn,false).total;if(typeId==='fonds_bombes')return bypassFonds(base,dn,true).total;const p=panierRow(base,typeId,dn);return p?p.total:0;}
export function raccPrice(base,typeId,dn){const p=panierRow(base,typeId,dn);return p?p.total:0;}
export function extrusionPrice(base,dnPehd,type){const E=base.op.extrusion;if(!E)return 0;const r=E.rows.find(x=>x.dnPehd===num(dnPehd));if(!r)return 0;const k=key(type);const hk=/manchon/.test(k)?'manchons':/coude/.test(k)?'coude':/pec/.test(k)?'pec':/purge/.test(k)?'purges':'by-pass';const h=r.h[hk]||0;return h*teamCost(base,r.eq).h+(r.amort+r.conso);}
export function cndForfait(base,poste,km){if(km===null||km===undefined||km==='')return 0;const T=base.fo.tables.FO_Forfaits_Distance;if(!T)return 0;const row=T.rows.find(r=>key(r[T.cols[0]]).startsWith(key(poste)));if(!row)return 0;const cols=T.cols.slice(1);const bornes=[0,100,150,200,300];const d=num(km);if(d>500)return num(row[cols[4]])+num(row[cols[5]])*(d-500);let i=0;for(let k=0;k<bornes.length;k++)if(d>=bornes[k])i=k;return num(row[cols[i]]);}
export function filmPrice(base,kind,dn){const T=base.fo.tables.FO_Prix_Films;if(!T)return 0;const cn=T.cols.find(c=>key(c).startsWith(key(kind)));const row=T.rows.find(r=>num(dn)>=num(r['DN min'])&&num(dn)<=num(r['DN max']));return row&&cn?num(row[cn]):0;}
export const filmTranches=base=>{const T=base.fo.tables.FO_Prix_Films;return T?T.rows.map(r=>[num(r['DN min']),num(r['DN max'])]):[];};
export const rcfaOfBase=(base,client)=>{const T=base.fo.tables.FO_Taux_RCFA;if(!T)return null;const c=key(client);const row=T.rows.find(r=>c&&c.includes(key(r[T.cols[0]])));return row?num(row[T.cols[1]]):null;};
export const isoDiam=(base,dn,iso)=>foLookup(base,'FO_Isolation',dn,2+isoIdx(iso));
export const isoVolMl=(base,dn,iso)=>foLookup(base,'FO_Isolation',dn,6+isoIdx(iso));
export const dnVolume=(base,dn,ml)=>{const di=foLookup(base,'FO_Isolation',dn,9);return di?Math.PI*Math.pow(di/2000,2)*num(ml):0;};
/* ═════════ 3 · UNE ÉTUDE VIDE ═════════ */
export function emptyEtude(nom){return {id:'E'+Date.now().toString(36)+Math.random().toString(36).slice(2,4),nom:nom||'Zone 1',
  chantier:{d0:'',d1:'',type:'Gros',iso:'Iso 1',wc:false,contener:false,benne:false,doe:false,pelle:false,arPelle:0,carnet:false,arMO:false,arMOQty:1,transfert:false,eq1:'S+T+P',eq2:'M',hTransfert:0,nbOper:0,camionPlateau:false,grue:false,hGrue:0,nbDecharg:0,bardage:false,tauxBardage:5},
  eq:{soud:'S+T+P',manch:'M',typeManchon:'Thermo',twin:false,reduction:1,joursComplets:false,ctrl:{depression:false,filsDH:false,ressuage:false,itopo:false,pression:false},coussins:false,qteCoussins:0,ventilerCoussins:false},
  mlMode:'tranchee',dn:[],nuit:{on:false,dn:100,soud:0,rendement:0.8},
  purges:{dn:32,purgeurAuto:false,paires:0,deporte:false},vidanges:{dn:50,type:'gravite',paires:0,deporte:false},vpi:[],sst:[],extrusion:[],racc:[],
  cnd:{km:'',radio:{on:false,antPct:0,antVac:0,fdPct:0,fdVac:0,raccFilms:0,raccVac:0},us:{on:false,antPct:0,antVac:0,fdPct:0,fdVac:0,raccFilms:0,raccVac:0},ress:{on:false,antPct:0,antVac:0,fdPct:0,fdVac:0,raccFilms:0,raccVac:0}},
  hydro:{zones:[{nom:'Zone 1',rows:[]},{nom:'Zone 2',rows:[]},{nom:'Zone 3',rows:[]}],trajetH:1,epreuveH:4,hydrocureur:false,hHydro:[0,0,0],panier:'OS',epreuve:true,rincage:false,passivation:false,eau:false,conservation:false,adoucisseur:'15',devis:{}},
  boulet:{on:false,rows:[]},aerien:{planIso:false,rows:[],hDepl:0,devisPose:0,devisFO:0},depose:{rows:[]},foncage:{rows:[]},panier:{fo:[],mo:[]},fopre:{rows:[],prixFO:0,prixTransport:0},autres:{fournitures:[],prestations:[],frais:0},paniers:[]};}
/* ═════════ 4 · CALCUL D'UNE ÉTUDE ═════════ */
export const POSTES=[
 ['chantier','Chantier et linéaire',null,'tete'],['amene','Amené - Repli - Nettoyage chantier','chantier'],['conteneur','Contener - Benne - Pelle','chantier'],['decharg','Déchargement','chantier'],['transfert','Transfert','chantier'],['bardage','Déduction bardage','chantier'],
 ['prestation','Prestation',null,'tete'],['soudure','Soudure (compris manutention)','prestation'],['manchons','Manchons','prestation'],['purges','Purges','prestation'],['vidanges','Vidanges','prestation'],['vpi','Vannes préisolées','prestation'],['sst','Vannes SST','prestation'],['racc','Raccordement existant','prestation'],
 ['controles','Contrôles - Essais',null,'tete'],['autoctrl','Autocontrôle interne','controles'],['coussins','Coussins','controles'],['ressuage','Ressuage externe','controles'],['us','Contrôles ultrasons','controles'],['radio','Radio','controles'],['epreuve','Épreuve hydraulique','controles'],['eau','Eau adoucie','controles'],['boulet','Boulet mousse','controles'],['rincage','Rinçage','controles'],['passivation','Passivation','controles'],['conservation','Mise en conservation','controles'],
 ['autres','Autres',null,'tete'],['fo_preiso','Fournitures pré-isolées','autres'],['fo_acier','Fournitures acier nu aérien','autres'],['fo_autres','Fournitures autres','autres'],['calo','Calo + peinture + supp. aérien','autres'],['pose_aerien','Pose aérien','autres'],['foncage','Fonçage','autres'],['depose','Dépose réseau','autres'],['extrusion','Extrusion','autres'],['etiquettes','Étiquettes','autres'],['nuit','Plus-value nuit','autres'],['doe','DOE / Plan iso si aérien / Carnet soudure si prévu','autres'],['prest_autres','Prestations autres','autres'],['paniers','Paniers libres','autres'],['frais','Autres frais divers','autres']];
export const POSTE_KEYS=POSTES.filter(p=>!p[3]).map(p=>p[0]);
const L=(mo,fo,st,loc)=>({mo:mo||0,fo:fo||0,st:st||0,loc:loc||0,achat:(mo||0)+(fo||0)+(st||0)+(loc||0)});
const addL=(a,b)=>({mo:a.mo+b.mo,fo:a.fo+b.fo,st:a.st+b.st,loc:a.loc+b.loc,achat:a.achat+b.achat});
const ceil=Math.ceil;const r0=x=>Math.round(x);
/* jours du chantier (13/10, Ethan : « que ça calcule le nombre de jours, du lundi au vendredi, et que ça sorte le nombre de jours de location des éléments
   base vie cochés — une indication, on pourra valider ou mettre un autre nombre en gardant le calculé ») : ouvrés = lundi → vendredi, bornes comprises ;
   cal = calendaires comme l'ancien classeur (DATEDIF) ; feries = fériés tombant un jour ouvré (signalés, pas déduits) */
export function joursChantier(d0,d1){const z={ouvres:0,cal:0,feries:[]};if(!d0||!d1)return z;const a=new Date(String(d0).slice(0,10)+'T12:00:00'),b=new Date(String(d1).slice(0,10)+'T12:00:00');if(isNaN(a)||isNaN(b)||b<a)return z;
  z.cal=Math.round((b-a)/864e5);for(let d=new Date(a),k=0;d<=b&&k<2000;d.setDate(d.getDate()+1),k++){const w=d.getDay();if(w>=1&&w<=5){z.ouvres++;const iso=d.getFullYear()+'-'+String(d.getMonth()+1).padStart(2,'0')+'-'+String(d.getDate()).padStart(2,'0');if(frFeries(d.getFullYear()).has(iso))z.feries.push(iso);}}return z;}
export const BASE_VIE=[['wc','WC','FO_Cout_Journee_WC'],['contener','Conteneur','FO_Cout_Journee_Contener'],['benne','Benne','FO_Cout_Journee_Benne'],['pelle','Pelle (location d\'engin)','FO_Cout_Journee_Pelle']];
/* jours de location retenus pour un élément : saisi (ou validé) sinon le calcul lundi → vendredi */
export const joursLoc=(C,k,jc)=>{const v=((C||{}).loc||{})[k];return v===undefined||v===null||v===''?(jc||joursChantier((C||{}).d0,(C||{}).d1)).ouvres:num(v);};
export function calcEtude(z,base){const R={postes:{},detail:{},warn:[]};const set=(k,l,d)=>{R.postes[k]=l;if(d)R.detail[k]=d;};if(!base||!base.mo||!base.mo.cad||!base.mo.cad.length){POSTE_KEYS.forEach(k=>R.postes[k]=L());R.empty=true;return R;}
  const H=base.mo.hJour||10;const E=z.eq||{};const C=z.chantier||{};const iso=C.iso||'Iso 1';const cS=teamCost(base,E.soud||'S+T+P'),cM=teamCost(base,E.manch||'M');const isMM=(E.manch||'M')==='M+M';
  /* ── table des DN ── */
  const ctrlMin=c=>!c?0:(['depression','filsDH','ressuage','itopo','pression'].reduce((s,k)=>s+(E.ctrl&&E.ctrl[k]?num(c.ctrl[k]):0),0));
  const rows=(z.dn||[]).filter(r=>r&&num(r.dn)).map(r=>{const dn=num(r.dn);const c=cadOf(base,dn);if(!c)return null;const J=num(r.soud),ml=num(r.ml);const pouce=c.pouce;
    const cadS0=E.soud==='S'?c.soud.S:E.soud==='S+T'?c.soud['S+T']:c.soud['S+T+P'];const cadS=cadS0*(E.twin?num(E.reduction)||1:1);
    const tbl=(/electro/i.test(E.typeManchon||'')?c.manch.electro:c.manch.thermo)[isoIdx(iso)];const cadM0=tbl?tbl[isMM?0:1]:0;
    const minCtrl=ctrlMin(c);const K=J/(E.twin?2:1);
    /* soudures contrôlées (CND) : « dont antennes » saisi (nAnt) → le reste en feeder ; sinon les cases ant. / feed. ; une ligne sans case = feeder (13/10, Ethan : « j'en colle tant en antenne et tant en feeder ») */
    const hasN=r.nAnt!==undefined&&r.nAnt!==null&&r.nAnt!=='';const nAnt=hasN?Math.min(J,num(r.nAnt)):(r.antenne?J:0);const nFd=hasN?Math.max(0,J-nAnt):(r.feeder||!r.antenne?J:0);
    return {dn,c,J,ml,pouce,cadS,cadM0,minCtrl,K,ant:!!r.antenne,fd:!!r.feeder,nAnt,nFd};}).filter(Boolean);
  const K46=rows.reduce((s,r)=>s+r.K,0);const coussinMin=rows.length?num(rows[0].c.coussin)||num((base.mo.cad[0]||{}).coussin):0;
  const P24=(E.coussins&&K46>0)?num(E.qteCoussins)*coussinMin/K46:0; /* minutes de coussin par manchon */
  rows.forEach(r=>{const cadM=r.cadM0?Math.round((H*60)/((H*60)/r.cadM0+r.minCtrl+P24)):0;const pPouce=r.cadS?cS.jour/(r.cadS*r.pouce):0;const pManch=cadM?cM.jour/cadM:0;const pouces=r.J*r.pouce;const soud=pouces*pPouce;const auto=r.K*cM.jour*r.minCtrl/(H*60);const manch=r.K*pManch-auto;
    const qS=r.J?(r.J>r.cadS?r.J/r.cadS:1):0,qM=r.K?(r.K>cadM?r.K/cadM:1):0;const mlT=z.mlMode==='tube'?r.ml:2*r.ml;const kg=foLookup(base,'FO_Isolation',r.dn,5);const vol=isoVolMl(base,r.dn,iso);const rd=foParam(base,'FO_Ratio_Dechets',0.05);
    Object.assign(r,{cadM,pPouce,pManch,pouces,soud,manch,auto,qS,qM,tonnes:r.ml?kg/1000*mlT*rd:0,m3:r.ml?vol*mlT*rd:0});});
  const T={J:rows.reduce((s,r)=>s+r.J,0),K:K46,ml:rows.reduce((s,r)=>s+r.ml,0),pouces:rows.reduce((s,r)=>s+r.pouces,0),soud:rows.reduce((s,r)=>s+r.soud,0),manch:rows.reduce((s,r)=>s+r.manch,0),auto:rows.reduce((s,r)=>s+r.auto,0),qS:ceil(rows.reduce((s,r)=>s+r.qS,0)),qM:ceil(rows.reduce((s,r)=>s+r.qM,0)),tonnes:rows.reduce((s,r)=>s+r.tonnes,0),m3:rows.reduce((s,r)=>s+r.m3,0)};
  const N25=E.coussins?(K46===0?num(E.qteCoussins)*coussinMin*cM.jour/(H*60):(E.ventilerCoussins?K46*cM.jour*P24/(H*60):0)):0;
  R.detail.dn={rows,T,cS,cM,N25};
  if(E.joursComplets){set('soudure',L(T.qS*cS.jour));const OP=T.manch+T.auto;set('manchons',L(OP?T.qM*cM.jour*(T.manch/OP)-(K46>0?N25:0):0));set('autoctrl',L(OP?T.qM*cM.jour*(T.auto/OP):0));}
  else{set('soudure',L(T.soud));set('manchons',L(T.manch-(K46>0?N25:0)));set('autoctrl',L(T.auto));}
  set('coussins',L(N25));
  /* ── chantier ── */
  const JC=joursChantier(C.d0,C.d1);const nbJ=JC.ouvres;
  const pJour={wc:C.wc?foParam(base,'FO_Cout_Journee_WC'):0,contener:C.contener?foParam(base,'FO_Cout_Journee_Contener'):0,benne:C.benne?foParam(base,'FO_Cout_Journee_Benne'):0,pelle:C.pelle?foParam(base,'FO_Cout_Journee_Pelle')*(C.type==='Petit'?1:1-foParam(base,'FO_Abattement_Pelle_Gros_Chantier')):0};
  const jours={};let locJ=0;Object.keys(pJour).forEach(k=>{jours[k]=joursLoc(C,k,JC);locJ+=pJour[k]*jours[k];});const fJour=Object.values(pJour).reduce((x,y)=>x+y,0);
  const rot=T.ml?Math.max(0,ceil(T.m3/8)-1):0;const dechets=C.benne?T.tonnes*foParam(base,'FO_Dechets_DIB_Tonne'):0;const ar=foParam(base,'FO_AR_Benne_Contener_WC');
  const E15=locJ+(C.wc?ar:0)+(C.contener?ar:0)+(C.benne?ar*(1+rot):0)+(C.pelle?foParam(base,'FO_AR_Pelle')*num(C.arPelle):0)+dechets;
  set('conteneur',L(0,dechets,0,E15-dechets),{fJour,nbJ,cal:JC.cal,feries:JC.feries,jours,pJour,rot,dechets});
  set('amene',L(0,0,0,C.arMO?foParam(base,'FO_Amene_Repli_Equipe')*num(C.arMOQty):0));
  const dch=base.op.dechargement;const kDech=dch?dch.h1*teamCost(base,dch.eq1).h+dch.h2*teamCost(base,dch.eq2).h:0;set('decharg',L(kDech*num(C.nbDecharg)),{pu:kDech});
  const K15=teamCost(base,C.eq1||'S+T+P').h+teamCost(base,C.eq2||'M').h+(C.camionPlateau?foParam(base,'FO_Camion_Plateau'):0);const L15=C.transfert?K15*num(C.hTransfert)*num(C.nbOper)+(C.grue?num(C.hGrue)*foParam(base,'FO_Petite_Grue')*num(C.nbOper):0):0;
  const moT=C.transfert?(teamCost(base,C.eq1||'S+T+P').h+teamCost(base,C.eq2||'M').h)*num(C.hTransfert)*num(C.nbOper):0;set('transfert',L(moT,0,0,L15-moT),{K15});
  set('bardage',L(0,0,0,C.bardage?-num(C.tauxBardage)*T.ml:0));
  /* ── nuit ── */
  const N=z.nuit||{};if(N.on&&num(N.soud)){const c=cadOf(base,N.dn);const cadS=c?(E.soud==='S'?c.soud.S:E.soud==='S+T'?c.soud['S+T']:c.soud['S+T+P']):0;const F54=cadS?ceil(num(N.soud)/cadS):0;const E54=F54*(cS.jour+cM.jour);const D58=cadS?ceil(num(N.soud)/(cadS*(num(N.rendement)||0.8))):0;const E58=D58*(cS.nuitJour+cM.nuitJour);set('nuit',L(E58-E54),{jours:F54,nuits:D58});}else set('nuit',L());
  /* ── purges / vidanges ── */
  const pouceDn=dn=>{const c=cadOf(base,dn);return c?c.pouce:0;};const rowDn=dn=>rows.find(r=>r.dn===num(dn));
  const prixPouceDn=dn=>{const r=rowDn(dn);if(r)return r.pPouce;const c=cadOf(base,dn);if(!c)return 0;const cadS=E.soud==='S'?c.soud.S:E.soud==='S+T'?c.soud['S+T']:c.soud['S+T+P'];return cadS?cS.jour/(cadS*c.pouce):0;};
  const prixManchDn=dn=>{const r=rowDn(dn);if(r)return r.pManch;const c=cadOf(base,dn);if(!c)return 0;const tbl=(/electro/i.test(E.typeManchon||'')?c.manch.electro:c.manch.thermo)[isoIdx(iso)];const cad0=tbl?tbl[isMM?0:1]:0;const cadM=cad0?Math.round((H*60)/((H*60)/cad0+ctrlMin(c)+P24)):0;return cadM?cM.jour/cadM:0;};
  const PU=z.purges||{};{const p=panierRow(base,'purge',PU.dn);let pu=0,mo=0,fo=0;if(p){const purg=p.fo.filter(f=>/purgeur|t[ée]s acier/i.test(f.label)).reduce((s,f)=>s+f.amount,0);pu=PU.purgeurAuto?p.total:p.total-purg;mo=p.moAmount;fo=pu-mo;}
    const paires=num(PU.paires);const dep=PU.deporte?paires*4:0;const puDep=pouceDn(PU.dn)*prixPouceDn(PU.dn)+prixManchDn(PU.dn);set('purges',L(mo*paires+dep*puDep,fo*paires),{pu,puDep,dep,total:pu*paires+dep*puDep});}
  const VI=z.vidanges||{};{const typ=VI.type||'gravite';const p=panierRow(base,typ==='aspiration'?'vid_asp':'vid_grav',VI.dn);let pu=0,mo=0;if(p){pu=p.total;if(typ==='gravite_nue')pu+=(p.extra||[]).filter(f=>/vanne/i.test(f.label)).reduce((s,f)=>s+f.amount,0); /* vidange par gravité avec vannes nues = le panier + les 2 vannes à souder */mo=p.moAmount;}
    const paires=num(VI.paires);const dep=VI.deporte?paires*4:0;const puDep=pouceDn(VI.dn)*prixPouceDn(VI.dn)+prixManchDn(VI.dn);set('vidanges',L(mo*paires+dep*puDep,(pu-mo)*paires),{pu,puDep,dep,total:pu*paires+dep*puDep});}
  /* ── vannes préisolées ── */
  {let mo=0,fo=0;const det=[];(z.vpi||[]).forEach(v=>{const dn=num(v.dn);if(!dn)return;const q=num(v.soud);const m=pouceDn(dn)*prixPouceDn(dn)+prixManchDn(dn);const f=num(v.prixVanne)+(v.rallonge?foParam(base,'FO_Rallonge_Vanne_Preisolee'):0)+(v.bypass?bypassPurge(base):0);mo+=m*q;fo+=f*q;det.push({dn,q,pu:m+f});});set('vpi',L(mo,fo),{rows:det});}
  /* ── SST ── */
  {let mo=0,fo=0;const det=[];const boit=sstBoitiers(base);(z.sst||[]).forEach(s=>{const dn=num(s.dn);if(!dn||!s.type)return;const q=num(s.paires);
    if(s.type==='autre'){const pu=num(s.pu);fo+=pu*q;det.push({dn,type:'autre',des:s.des||'',q,pu});return;} /* typologie hors classeur : prix saisi (fourniture + pose) */const bf=(s.type==='bypass_seul'||s.type==='fonds_bombes')?bypassFonds(base,dn,s.type==='fonds_bombes'):null;const p=bf?null:panierRow(base,s.type,dn);const pu=(bf?bf.total:(p?p.total:0))+boit;const m=(bf?bf.mo:(p?p.moAmount:0))+foParam(base,'FO_MO_Pose_Boitiers')*teamCost(base,'M').h;mo+=m*q;fo+=(pu-m)*q;det.push({dn,type:s.type,q,pu});});set('sst',L(mo,fo),{rows:det,boitiers:boit});}
  /* ── extrusion ── */
  {let mo=0,fo=0;const det=[];(z.extrusion||[]).forEach(x=>{const dn=num(x.dn);if(!dn||!x.type)return;const q=num(x.paires);const pu=extrusionPrice(base,dn,x.type);const Er=(base.op.extrusion||{rows:[]}).rows.find(r=>r.dnPehd===dn);const f=Er?Er.amort+Er.conso:0;mo+=(pu-f)*q;fo+=f*q;det.push({dn,type:x.type,q,pu});});set('extrusion',L(mo,fo),{rows:det});}
  /* ── raccordement ── */
  {let mo=0,fo=0;const det=[];(z.racc||[]).forEach(x=>{const dn=num(x.dn);if(!dn||!x.type)return;const q=num(x.paires);const p=panierRow(base,x.type,dn);const pu=p?p.total:0;mo+=(p?p.moAmount:0)*q;fo+=(p?p.foAmount:0)*q;det.push({dn,type:x.type,q,pu});});set('racc',L(mo,fo),{rows:det});}
  /* ── CND ── */
  const CND=z.cnd||{};const km=CND.km===''||CND.km===null||CND.km===undefined?null:num(CND.km);const tr=filmTranches(base);
  const cndCalc=(kind,cfg,poste)=>{if(!cfg||!cfg.on)return L();const forf=km===null?0:cndForfait(base,poste,km);
    const part=(flag,pct,vac)=>{const cnt=r=>flag==='ant'?r.nAnt:r.nFd;const sel=rows.filter(r=>cnt(r)>0);let films=0;tr.forEach(([a,b])=>{const n=sel.filter(r=>r.dn>=a&&r.dn<=b).reduce((s,r)=>s+cnt(r),0)*num(pct)/100;films+=ceil(n-1e-9)*filmPrice(base,kind,a);});const nSel=sel.reduce((s,r)=>s+cnt(r),0)*num(pct)/100;const nVac=num(vac)?ceil(nSel/num(vac)-1e-9):0;return {films,vac:nVac,cost:nVac*forf+films,n:nSel};};
    const A=part('ant',cfg.antPct,cfg.antVac),F=part('fd',cfg.fdPct,cfg.fdVac);const raccQ=(z.racc||[]).reduce((s,x)=>s+num(x.paires),0);let rf=0;tr.forEach(([a,b])=>{rf+=(z.racc||[]).filter(x=>num(x.dn)>=a&&num(x.dn)<=b).reduce((s,x)=>s+num(x.paires),0)*num(cfg.raccFilms)*filmPrice(base,kind,a);});const Rc={films:rf,vac:num(cfg.raccVac),cost:num(cfg.raccVac)*forf+rf,n:raccQ*num(cfg.raccFilms)};
    R.detail[kind]={forfait:forf,ant:A,fd:F,racc:Rc};return L(0,0,A.cost+F.cost+Rc.cost);};
  set('radio',cndCalc('Radio',CND.radio,'Mob/Démob Radio'));set('us',cndCalc('Ultrasons',CND.us,'Mob/Démob Ultrasons'));set('ressuage',cndCalc('Ressuage',CND.ress,'Mob/Démob Ressuage'));
  /* ── prestations hydrauliques (volumes des zones) ── */
  const HY=z.hydro||{zones:[]};const vols=(HY.zones||[]).map(zz=>(zz.rows||[]).reduce((s,r)=>s+dnVolume(base,r.dn,r.ml),0));
  /* prestation par zone (13/10, Ethan : « pouvoir relier une épreuve à un rinçage, une passivation… ») : choix de la zone (zz.pr[k]) sinon le réglage général */
  const zOn=(i,k)=>{const zz=(HY.zones||[])[i]||{};return zz.pr&&zz.pr[k]!==undefined&&zz.pr[k]!==null?!!zz.pr[k]:!!HY[k];};const tx=teamCost(base,HY.panier||'OS').h;const HPJ=foParam(base,'FO_Heures_Par_Jour',10);const Vref=foParam(base,'FO_Volume_Reference_Ratios',30);
  const devis=(k)=>num((HY.devis||{})[k]);
  {let tot=0,mo=0;vols.forEach((V,i)=>{if(!V||!zOn(i,'epreuve'))return;const hMO=V/foParam(base,'FO_Epreuve_Debit_Poteau',30)+foParam(base,'FO_Epreuve_MO_Montee_Pression')+foParam(base,'FO_Epreuve_MO_Decompression')+Math.min(num(HY.epreuveH),foParam(base,'FO_Epreuve_Plafond_Duree',10))+num(HY.trajetH)+foParam(base,'FO_Epreuve_Mise_En_Place');const m=hMO*tx;mo+=m;tot+=V*foParam(base,'FO_Epreuve_Eau_m3')+foParam(base,'FO_Epreuve_Pompe')+foParam(base,'FO_Epreuve_Rapport')+m+(HY.hydrocureur?num((HY.hHydro||[])[i])*foParam(base,'FO_Epreuve_Hydrocureur_h'):0);});
    if(devis('epreuve')){set('epreuve',L(0,0,devis('epreuve')));}else set('epreuve',L(mo,tot-mo));}
  {let tot=0,mo=0;vols.forEach((V,i)=>{if(!V||!zOn(i,'rincage'))return;const hC=V/Vref*foParam(base,'FO_Rincage_Circulation')*HPJ,hCh=V/Vref*foParam(base,'FO_Rincage_Chasse')*HPJ,hF=V/Vref*foParam(base,'FO_Rincage_Filtration')*HPJ;const hT=foParam(base,'FO_Rincage_MO_Installation')+hC+hCh+hF+foParam(base,'FO_Rincage_Repli');const m=(hT+num(HY.trajetH))*tx;mo+=m;tot+=foParam(base,'FO_Rincage_Transport_SKID')+foParam(base,'FO_Rincage_Amortissement_SKID')+foParam(base,'FO_Rincage_Rapport')+foParam(base,'FO_Rincage_Dechets')+V*foParam(base,'FO_Rincage_Eau_m3')*foParam(base,'FO_Rincage_Coefficient_Chasse')+ceil(hT/HPJ)*foParam(base,'FO_Groupe_Transfo_Jour')+m;});
    if(devis('rincage'))set('rincage',L(0,0,devis('rincage')));else set('rincage',L(mo,tot-mo));}
  {let tot=0,mo=0;vols.forEach((V,i)=>{if(!V||!zOn(i,'passivation'))return;const hC=V/Vref*foParam(base,'FO_Passivation_Circulation')*HPJ;const prod=V*foParam(base,'FO_Passivation_Dosage');const m=hC*tx;mo+=m;tot+=prod*foParam(base,'FO_Passivation_Produit')+foParam(base,'FO_Passivation_Dechets')+ceil(hC/HPJ)*foParam(base,'FO_Groupe_Transfo_Jour')+m;});
    if(devis('passivation'))set('passivation',L(0,0,devis('passivation')));else set('passivation',L(mo,tot-mo));}
  {let tot=0,mo=0;{const ad=String(HY.adoucisseur||'15')==='5'?{prix:foParam(base,'FO_Adoucisseur_5'),debit:5}:{prix:foParam(base,'FO_Adoucisseur_15'),debit:15};vols.forEach((V,i)=>{if(!V||!zOn(i,'eau'))return;const nR=foParam(base,'FO_Nb_Remplissages',2);const m=(foParam(base,'FO_EauAdoucie_Mise_En_Service')+V/ad.debit*nR+num(HY.trajetH))*tx;mo+=m;tot+=foParam(base,'FO_EauAdoucie_Flexible')+ad.prix+V*foParam(base,'FO_EauAdoucie_Sel')+V*foParam(base,'FO_EauAdoucie_Eau_m3')*nR+V*foParam(base,'FO_EauAdoucie_Soude')+m;});}
    if(devis('eau'))set('eau',L(0,0,devis('eau')));else set('eau',L(mo,tot-mo));}
  {let tot=0,mo=0;vols.forEach((V,i)=>{if(!V||!zOn(i,'conservation'))return;const hV=V/Vref*foParam(base,'FO_Conservation_Vidange')*HPJ,hR=V/Vref*foParam(base,'FO_Conservation_Remplissage')*HPJ,hC=V/Vref*foParam(base,'FO_Conservation_Circulation')*HPJ;const hT=hV+hR+hC;const prod=V*foParam(base,'FO_Conservation_Dosage');const m=hT*tx;mo+=m;tot+=prod*foParam(base,'FO_Conservation_Produit')+foParam(base,'FO_Conservation_Dechets')+ceil(hT/HPJ)*foParam(base,'FO_Groupe_Transfo_Jour')+m;});
    if(devis('conservation'))set('conservation',L(0,0,devis('conservation')));else set('conservation',L(mo,tot-mo));}
  R.detail.hydro={vols,tx,on:(HY.zones||[]).map((zz,i)=>({epreuve:zOn(i,'epreuve'),rincage:zOn(i,'rincage'),passivation:zOn(i,'passivation'),eau:zOn(i,'eau'),conservation:zOn(i,'conservation')}))};
  /* ── boulet mousse ── */
  {const B=z.boulet||{};let mo=0,fo=0;const det=[];if(B.on)(B.rows||[]).forEach(r=>{const dn=num(r.dn);if(!dn)return;const V=dnVolume(base,dn,r.ml);const os=osRate(base);const m=(foParam(base,'FO_Boulet_MO_Piston_h')*foParam(base,'FO_Boulet_MO_Piston_Pers')+foParam(base,'FO_Boulet_MO_Extremites_h')*foParam(base,'FO_Boulet_MO_Extremites_Pers')+foParam(base,'FO_Boulet_MO_Poussee_h')*foParam(base,'FO_Boulet_MO_Poussee_Pers')+foParam(base,'FO_Boulet_MO_Retrait_h')*foParam(base,'FO_Boulet_MO_Retrait_Pers')+foParam(base,'FO_Boulet_MO_AR_Compresseur_h')*foParam(base,'FO_Boulet_MO_AR_Compresseur_Pers'))*os;
    const dnI=foParam(base,'FO_DN_Accessoires_Injection',20);const comp=V<foParam(base,'FO_Seuil_Volume_Compresseur_1',50)?foParam(base,'FO_Boulet_Compresseur_Type_1'):V<foParam(base,'FO_Seuil_Volume_Compresseur_2',150)?foParam(base,'FO_Boulet_Compresseur_Type_2'):foParam(base,'FO_Boulet_Compresseur_Type_3');
    const f=foParam(base,'FO_Boulet_Nb_Fonds_Bombes')*foLookup(base,'FO_Accessoires_Acier',dn,10)+foParam(base,'FO_Boulet_Nb_Bobines')*foLookup(base,'FO_Accessoires_Acier',dnI,2)+foParam(base,'FO_Boulet_Nb_Vannes_BS_PR')*foLookup(base,'FO_Vannes_Souder',dnI,4)+foParam(base,'FO_Boulet_Nb_Tetes_Chat')*foParam(base,'FO_Boulet_Prix_Tete_Chat')+foParam(base,'FO_Boulet_Nb_Boulets')*foLookup(base,'FO_Accessoires_Acier',dn,11)+foParam(base,'FO_Boulet_Location_Pelle_h')*foParam(base,'FO_Boulet_Duree_Location_Pelle')+foParam(base,'FO_Boulet_Duree_Location_Compresseur')*comp;
    const n=r.passages===undefined||r.passages===null||r.passages===''?1:num(r.passages);mo+=m*n;fo+=f*n;det.push({dn,V,m,f,n});});set('boulet',L(mo,fo),{rows:det});}
  /* ── aérien ── */
  {const A=z.aerien||{};let calo=0,caloMo=0,pose=0,foAcier=0;const det=[];const os=osRate(base);(A.rows||[]).forEach(r=>{const dn=num(r.dn);if(!dn)return;const ml=num(r.ml),c90=num(r.c90),soud=num(r.soud);const tradi=(r.type||'Tradi')!=='Préisolé';
    const nSup=r.support?ceil(ml/(dn<foParam(base,'FO_Support_Seuil_DN',125)?foParam(base,'FO_Support_Espacement_Petit_DN',3):foParam(base,'FO_Support_Espacement_Gros_DN',2))):0;const supPu=r.support?foLookup(base,'FO_Supportage',r.support,2)+foLookup(base,'FO_Supportage',r.support,3)*os:0;
    const isPVC=/pvc/i.test(r.calo||'');const cal=r.calo?ml*(foLookup(base,'FO_Calorifugeage',dn,3)+(isPVC?foLookup(base,'FO_Calorifugeage',dn,4):foLookup(base,'FO_Calorifugeage',dn,5)))+c90*(foLookup(base,'FO_Calorifugeage',dn,6)+(isPVC?foLookup(base,'FO_Calorifugeage',dn,7):foLookup(base,'FO_Calorifugeage',dn,8))):0;
    const calMo=r.calo?(ml*(isPVC?foLookup(base,'FO_Calorifugeage',dn,9):foLookup(base,'FO_Calorifugeage',dn,10))+c90*(isPVC?foLookup(base,'FO_Calorifugeage',dn,11):foLookup(base,'FO_Calorifugeage',dn,12)))*os:0;
    const supMo=nSup*foLookup(base,'FO_Supportage',r.support||'',3)*os;const U=supPu*nSup+(tradi?ml*foParam(base,'FO_Peinture_Aerien_ml'):0)+cal+calMo;calo+=U;caloMo+=calMo+supMo;
    if(tradi){pose+=soud*pouceDn(dn)*prixPouceDn(dn);foAcier+=foLookup(base,'FO_Accessoires_Acier',dn,8)*ceil(ml/6)+foLookup(base,'FO_Accessoires_Acier',dn,9)*c90+2*foParam(base,'FO_Prix_Certificat');}det.push({dn,ml,nSup,U,tradi});});
    const anyCalo=(A.rows||[]).some(r=>r.calo),anySup=(A.rows||[]).some(r=>r.support);const depl=num(A.hDepl)*foParam(base,'FO_Calo_Nb_Pers_Deplacement',2)*os*((anyCalo?1:0)+(anySup?1:0));calo+=depl;caloMo+=depl;
    const foA=foAcier?foAcier+foParam(base,'FO_Transport_Fournitures'):0;
    set('calo',num(A.devisPose)?L(0,0,num(A.devisPose)):L(caloMo,calo-caloMo),{rows:det,depl});set('pose_aerien',L(pose));set('fo_acier',num(A.devisFO)?L(0,num(A.devisFO)):L(0,foA));}
  /* ── dépose ── */
  {let mo=0,fo=0;const det=[];((z.depose||{}).rows||[]).forEach(r=>{const dn=num(r.dn);if(!dn)return;const ml=num(r.ml);const coupes=ml/foParam(base,'FO_Depose_Espacement_Coupes',5);const t=foLookup(base,'FO_Isolation',dn,5)*ml/1000;const vol=isoVolMl(base,dn,iso)*ml;const rot=vol?ceil(vol/foParam(base,'FO_Depose_Volume_Rotation',8)):0;const cj=foLookup(base,'FO_Isolation',dn,10);const arr=foParam(base,'FO_Depose_Arrondi_Prix_MO',500);const m=cj?Math.ceil((foParam(base,'FO_Journee_Pelle_Complete')/cj*coupes)/arr)*arr:0;const d=t*foParam(base,'FO_Dechets_DIB_Tonne')+rot*foParam(base,'FO_AR_Benne_Contener_WC');mo+=m;fo+=d;det.push({dn,ml,coupes,t,rot,m,d});});set('depose',L(mo,fo),{rows:det});}
  /* ── fonçage ── */
  {let mo=0,fo=0,st=0;const det=[];((z.foncage||{}).rows||[]).forEach(r=>{const dn=num(r.dn);if(!dn)return;const ml=num(r.ml);const dIso=isoDiam(base,dn,iso);const nColl=(ceil(ml/foParam(base,'FO_Foncage_Espacement_Colliers',1.5))+foParam(base,'FO_Foncage_Colliers_Sup'))*foParam(base,'FO_Foncage_Nb_Tubes',2);const seg=foLookup(base,'FO_Colliers_Centreurs',dIso,2)*nColl;const os=osRate(base);
    const coll=seg?seg*foLookup(base,'FO_Colliers_Centreurs',dIso,3)+ceil(seg/foParam(base,'FO_Foncage_Ratio_Segments_h',10))*os+foParam(base,'FO_Foncage_Nb_Obturateurs')*foParam(base,'FO_Foncage_Prix_Obturateur')+foParam(base,'FO_Foncage_Transport_Colliers'):0;const collMo=seg?ceil(seg/foParam(base,'FO_Foncage_Ratio_Segments_h',10))*os:0;
    const vac=num(r.vac);const radio=vac*(km===null?0:cndForfait(base,'Mob/Démob Radio',km))+vac*foParam(base,'FO_Foncage_Nb_Films_Vacation',4)*filmPrice(base,'Radio',dn);const te=raccPrice(base,'racc_insertion_de_tes',dn);const pose=num(r.jours)*(cS.jour+cM.jour)+2*te;
    mo+=collMo+pose;fo+=coll-collMo;st+=radio;det.push({dn,ml,nColl,seg,coll,radio,pose});});set('foncage',L(mo,fo,st),{rows:det});}
  /* ── panier sur mesure (acier nu) → fournitures autres + prestations autres ── */
  {const P=z.panier||{};let fo=0,mo=0;(P.fo||[]).forEach(x=>{fo+=num(x.qty)*num(x.pu);});(P.mo||[]).forEach(x=>{mo+=num(x.h)*teamCost(base,x.eq||'S+T').h;});
    const AU=z.autres||{};const foA=(AU.fournitures||[]).reduce((s,x)=>s+num(x.montant),0);const prA=(AU.prestations||[]).reduce((s,x)=>s+num(x.montant),0);set('fo_autres',L(0,fo+foA));set('prest_autres',L(mo,0,prA));set('frais',L(0,0,0,num(AU.frais)));}
  /* ── paniers libres (équipes × temps + fournitures + sous-traitance) ── */
  {let tot=L();const det=[];(z.paniers||[]).forEach(p=>{const q=num(p.qty)||1;let mo=0,fo=0,st=0;(p.items||[]).forEach(it=>{if(it.kind==='mo'){const c=teamCost(base,it.eq||'S+T');mo+=(it.unit==='j'?num(it.h)*c.jour:num(it.h)*c.h);}else if(it.kind==='fo')fo+=num(it.qty)*num(it.pu);else if(it.kind==='st')st+=num(it.montant);});const l=L(mo*q,fo*q,st*q);tot=addL(tot,l);det.push({id:p.id,nom:p.nom,q,mo,fo,st,unit:mo+fo+st,total:l.achat});});set('paniers',tot,{rows:det});}
  /* ── fourniture préisolée ── */
  {const F=z.fopre||{};const rowsF=(F.rows||[]);let tot=0;const by={};['tubes','c90','cxx','tes','tesPlats','red','manch'].forEach(k=>{by[k]=rowsF.reduce((s,r)=>s+num((r[k]||{}).q)*num((r[k]||{}).pu),0);tot+=by[k];});const fo=num(F.prixFO)+num(F.prixTransport)||tot;set('fo_preiso',L(0,fo),{by,detail:tot});}
  /* ── étiquettes, DOE ── */
  set('etiquettes',L(0,((num(PU.paires)*2)+(num(VI.paires)*2)+(z.vpi||[]).reduce((s,v)=>s+num(v.soud),0))*foParam(base,'FO_Etiquette_Marquage')));
  const docs=base.mo.docs||{};set('doe',L(((z.aerien||{}).planIso?num(docs.planIso):0)+(C.doe?num(docs.doe):0)+(C.carnet?num(docs.carnet):0)));
  R.ml=T.ml;R.T=T;return R;}
/* ═════════ 5 · RÉCAP DE L'AFFAIRE (toutes les études) ═════════ */
export function calcChiffrage(ch,base,client){ch=ch||{};const etudes=(ch.etudes||[]).map(z=>Object.assign({z,r:calcEtude(z,base)}));const marge=ch.marge===undefined||ch.marge===null||ch.marge===''?0.125:num(ch.marge);const rc=ch.rcfa===undefined||ch.rcfa===null||ch.rcfa===''?(base&&base.fo&&base.fo.tables?(rcfaOfBase(base,client)??0):0):num(ch.rcfa);
  const coef=1-(rc+marge);const vente=a=>coef>0?a/coef:a;const hors=ch.horsMl||{};
  const postes=POSTES.map(([k,label,grp,tete])=>{if(tete)return {k,label,tete:true};const achat=etudes.reduce((s,e)=>s+(e.r.postes[k]||L()).achat,0);const cat=etudes.reduce((s,e)=>addL(s,e.r.postes[k]||L()),L());return {k,label,grp,achat,vente:vente(achat),mo:cat.mo,fo:cat.fo,st:cat.st,loc:cat.loc,par:etudes.map(e=>(e.r.postes[k]||L()).achat),horsMl:!!hors[k]};});
  const achat=postes.filter(p=>!p.tete).reduce((s,p)=>s+p.achat,0);const V=vente(achat);const ml=etudes.reduce((s,e)=>s+(e.r.ml||0),0);const venteMl=postes.filter(p=>!p.tete&&!p.horsMl).reduce((s,p)=>s+p.vente,0);
  const cat={mo:postes.reduce((s,p)=>s+(p.mo||0),0),fo:postes.reduce((s,p)=>s+(p.fo||0),0),st:postes.reduce((s,p)=>s+(p.st||0),0),loc:postes.reduce((s,p)=>s+(p.loc||0),0)};
  return {etudes,postes,achat,vente:V,rcfa:V*rc,rcfaPct:rc,marge,margeEur:V-achat-V*rc,coef,ml,parMl:ml?V/ml:0,parMlHors:ml?venteMl/ml:0,cat,empty:!base||!base.mo||!base.mo.cad||!base.mo.cad.length,nb:etudes.reduce((s,e)=>s+((e.r.T||{}).J||0),0)};}
