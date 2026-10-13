// lecteur.js — LECTEUR AUTOMATIQUE DE QUANTITATIF, DEVIS, COMMANDE OU BL FOURNISSEUR (13/10/2026). Module pur (sans DOM), testé en Node (test/lecteur_test.mjs).
// Ethan : « tu n'es pas capable d'ouvrir Excel, coller la trame, lancer le prompt… et comme ça je pose n'importe quel quantitatif sans faire cette étape manuelle et ça
// importe toutes les pièces ? » → l'appli lit elle-même le fichier du fournisseur (Excel, ou PDF avec texte), sans passer par Claude dans Excel.
// Réglé sur ses vrais documents (gardés hors du dépôt) : INPAL / isoplus (POLYURETUB, kits I2 · I3 · I5 · I6 · I8 · I13, sections « DN50 - Ø60,3x140 », options),
// LOGSTOR (catégories Tube / Coude / Té / Réduction / « Manchon EW - Complet », séries, réduction dans le manchon), Renalia · ZPU (codes Z2T / Z2C / Z2TS…,
// « DN 200/355 »), AXIOM (une feuille par DN, colonnes par tronçon, colonne TOTAL, codes R- K- TW- TP- Z- NT- NK- E- P- ZK…), BRUGG (CALPEX), et tout tableau
// « désignation + quantité ». Règles métier :
//  · une jonction = UN manchon (kit de jonction + manchette INPAL, EWJoint + bande + pochette LOGSTOR : la mousse et les bandes ne comptent pas en plus) ;
//  · réduction ou courbe acier DANS un manchon (kit réduit INPAL, « Reduktion St » LOGSTOR) : 2 soudures pour 1 manchon (joint:true) ;
//  · les OPTIONS (variante, cales et grillage) sont lues à part — jamais ajoutées d'office ; totaux, transport, études, formation, révision : ignorés ;
//  · DN = DN de l'ACIER : « DN 200/355 », diamètre extérieur « 219,1x355 » / « 114 / 225 mm », code « R-400/630-12 » ; gaine seule (« ø 225 », « EWJoint D225 »)
//    → DN appris dans le même document (la gaine 225 = DN100 si une barre 114,3x225 a été lue avant) ;
//  · angle réel du coude (55°, 75°, « 90D », « /90 ») ; barres : longueur de la barre (12 m, 6 m) et quantité en pièces ou en mètres.
import {dnOfOd} from './stock.js';

export const DNS=[20,25,32,40,50,65,80,100,125,150,200,250,300,350,400,450,500,600];
const DNSET=new Set(DNS);
const N=s=>String(s??'').normalize('NFD').replace(/[\u0300-\u036f]/g,'').toLowerCase().replace(/[’`]/g,"'").replace(/×/g,'x').replace(/(\d),(\d)/g,'$1.$2').replace(/\s+/g,' ').trim();
const r2=v=>Math.round(v*100)/100;
/* nombre « à la française » : 1 234,50 · 4.321,09 · 12345.67 · 4,00 */
export function numFr(v){if(v===null||v===undefined||v==='')return null;if(typeof v==='number')return isFinite(v)?v:null;let s=String(v).replace(/[€\s\u00a0\u202f]/g,'').replace(/[^\d.,\-]/g,'');if(!s||!/\d/.test(s))return null;
  if(s.includes(',')&&s.includes('.')){if(s.lastIndexOf(',')>s.lastIndexOf('.'))s=s.replace(/\./g,'').replace(',','.');else s=s.replace(/,/g,'');}else if(s.includes(','))s=s.replace(',','.');else if(/^\d{1,3}(\.\d{3})+$/.test(s))s=s.replace(/\./g,'');
  const x=parseFloat(s);return isFinite(x)?x:null;}
const isNumCell=c=>/^-?\d[\d\s\u00a0\u202f]*(?:[.,]\d+)?$/.test(String(c).trim());
const isQtyCell=c=>isNumCell(c)&&String(c).replace(/\D/g,'').length<=7;
/* unités de quantité */
const UNIT_RE=/^(m|ml|m\.l\.?|mtr|metres?|p|p\.|pc|pcs|pce|pces|pi[eè]ces?|u|u\.|un|unit[eé]s?|tub|tubes?|ens|ensemble|rol|rlx|lots?|kits?|cam\.?|bte|boites?|sacs?|paires?)$/i;
const unitKind=u=>{const s=N(u).replace(/\.$/,'');if(/^(m|ml|m\.l|mtr|metres?)$/.test(s))return 'ml';if(/^cam$/.test(s))return 'cam';return 'u';};
/* mots qui sortent une ligne de l'import (avec la raison) */
const EXCLUDE=[[/eau chaude|eau surchauffee|produit propose|conditions de service|temperature|\bpression\b|profondeur|t.aller|t.retour/,'conditions'],[/\b(transport|livraison|frais de port|zport|expedition|camion|non decharge|dap chantier)\b/,'transport'],[/\b(etudes?|note de calculs?|(fourniture des |fourniture d.une )?(plans?|schemas?) de (montage|branchements?|calepinage)|fourniture d.une note|reflectometre|design service|calcul statique|siskmr|prestations?|formation|chef de projet|location de materiel|licen[cs]e|assistance|hotline|mise en service|rapport)\b/,'prestation'],
  [/\b(revision|fluctuation|remise|surcout|tva|ttc|escompte)\b/,'prix'],[/\b(total|sous-total|sous total|montant|recapitulatif|metre total|lineaire de tubes|pouces de soudure)\b/,'total'],[/\b(remarques?|informations? complementaires?|quantitatif etabli|conditions? de service|offre valable|delai de livraison|bon pour|signature)\b|^page\b|\bpage \d|\b(notre|nos|vos|votre) references?\b|numero de client|\brepresentant\b|\boperateur\b|code affaire|\bdevis n|\boffre de prix\b|notre projet|projet n°|personne a contacter/,'texte']];
/* catégories (en-têtes de groupe, LOGSTOR et autres) */
const CATS=[['pipe',/^(tubes?|conduites?|barres?|tube porteur)$/],['bend',/^(coudes?|courbes?)$/],['tee',/^(te droit|te|tes|piece-t 45|piece-t|pieces?-t.*|te a saut|derivations?)$/],['valve',/^vannes?\b.*/],['reducer',/^(reductions?|cones?)$/],['sleeve',/^manchon\b.*|^jonctions?$|^kits? de jonction$/],['dhec',/^coiffe.*|^embouts?\b.*/],['wall',/^joint labyrinthe$|^passages? de (mur|cloison)$/],['acc',/^accessoires?\b.*/],['skip',/^(montage|design service|prestations?\b.*)$/]];
/* type de pièce d'après la désignation (et le code) — le premier qui répond gagne */
const KIND_RULES=[
  ['sleeveEnd',/\bmanchon.*(fin de ligne|fdl|extremit)|\bnk-\d/],
  ['acc',/\bi5\s*:\s*manchette\b|\bcales? de mousse|\bcale\b|\bgaine isolante|grillage|\bfilm\b|coussin|matelas|\bbandes? (a souder|de soudure|chauffante|thermo)/],                                  // la manchette du kit fin de ligne INPAL : déjà comptée dans le kit
  ['kit',/kit (de )?fin de ligne|\bkit fdl\b|embout terminal|\bbouchon\b|fond bombe|end ?cap/],
  ['dhec',/\bdhec\b|\bcoiffe\b|capuchon|embout (thermo|d.extremite)|\be-\d{2,4}\b/],
  ['wall',/passage de (mur|cloison)|traversee de (mur|paroi)|manchette de penetration|joint labyrinthe|insert d.etancheite|\bgkd\b|bague d.etancheite|anneau d.etancheite|\bp-\d{2,4}\b/],
  ['sleeve',/\b(kit|ensemble)\s+(de\s+)?manchons?\b|\bmanchons?\b.*\b(avec|\+|et)\s+(sa\s+|la\s+)?mousse\b/],                                                   // 13/10 (Ethan) : AXIOM « kit manchon avec mousse » = UN manchon, pas de la mousse
  ['pu',/pochette de mousse|\bmousse\b(?!.*cale)|kit (de )?jonction \(produits\)|kit flexible coude|\bkit mousse\b|\bpur\b|\bpu a\b|\bpu b\b/],
  ['reducerJ',/kit reduit|reduktion\s*st|reduction acier|reducteur acier|cone acier/],
  ['sleeve',/\bmanchettes?\b|\bmanchons?\b|ewjoint|\bkit joint\b|\bjoint double etancheite|\bsx-?wp\b|electrosoud|\bthermoretractable\b|\bnte?-\d|\bnh-\d|\bn-\d{2,3}\//],
  ['reducer',/reduction|reduktion|reducteur|\bcone\b|\bz-\d{2,3}/],
  ['valve',/\bvannes?\b|robinet|zawor|\bventil|ball valve|\bzk\w*-\d/],
  ['tee',/\bte\b|\btes\b|\bt a saut|piece-t|piquage|derivation|\btee\b|\b(tw|tp|tr|to|td)-\d|\bkit te\b/],
  ['steelbend',/courbe (acier|a souder)|coude acier nu|\b5252\b/],
  ['bend',/\bcoudes?\b|\bcourbes?\b|\bbend\b|kolano|\bk-\d|\bkw-\d|\d\s*(deg|°)\b/],
  ['pipe',/\btubes?\b|\bbarres?\b|\bconduites?\b|tuyau|longueur droite|\brohr\b|\bpipe\b|\brura\b|\b(r|rs)-\d/],
  ['acc',/coussin|matelas|\bmat\b|styrodur|polystyrene|\bblocs?\b|\bcales?\b|grillage|cosses?|ecarteur|scotch|ruban|\bbandes?\b|\bfilm\b|papier|gaine isolante|etais|\bcables?\b|\bfils?\b|boitier|detection|\bel-\d|alarme|outillage|crepe|graisse|colliers?|raccord|sable|signal/]];
const KIND_LABEL={pipe:'Barre',bend:'Coude',tee:'Té',reducer:'Réduction',reducerJ:'Réduction dans manchon',valve:'Vanne',kit:'Kit fin de ligne',sleeve:'Manchon',sleeveEnd:'Manchon fin de ligne',pu:'Mousse PU',steelbend:'Courbe acier',bypass:'By-pass',dhec:'DHEC',wall:'Passage de mur',acc:'Accessoire'};
export const kindLabel=k=>KIND_LABEL[k]||k;
/* DN d'une désignation (ligne reclassée à la main) : couple acier / gaine, « DN 200 », sinon la gaine connue du document (gaines = {gaine: DN}) */
export function dnGuess(des,gaines){const D=dims(des);const p=D.pairs.find(x=>x.casing||x.dn2);if(p)return {dn:p.dn,dn2:p.dn2};if(D.dn.length)return {dn:D.dn[0],dn2:D.dn[1]};const nums=(N(des).match(/\b\d{2,4}\b/g)||[]).map(Number);const g=(D.casing.concat(D.mm,nums)).map(c=>gaines&&gaines[c]).find(Boolean);return g?{dn:+g}:{};} /* « Bande … Manchon EW 225 » : 225 = une gaine connue */
/* ── dimensions lues dans un texte ── */
const CODE_RE=/\b(rs|r|kw|k|tw|tp|tr|to|td|t|zk\w*|z|nte|nt|nh|nk|n|e|p)-(\d{2,4})(?:[-\/](\d{2,4}))?(?:\/(\d{2,4}))?(?:-(\d{2,4}))?\b/i;
export function codeDims(code){const m=String(code||'').match(CODE_RE);if(!m)return null;const P=m[1].toLowerCase();const a=+m[2],b=m[3]?+m[3]:null,c=m[4]?+m[4]:null,d=m[5]?+m[5]:null;
  if(P==='e'||P==='p')return {prefix:P,casing:a};                        // E-125, P-180 : la gaine seule
  const o={prefix:P,dn:DNSET.has(a)?a:null,casing:b&&b>a?b:null};
  if(P==='k'||P==='kw'){if(c&&c<=90)o.angle=c;else if(!o.casing&&b&&b<=90)o.angle=b;}
  else if(/^(tw|tp|tr|to|td|t|z)$/.test(P)){if(c&&DNSET.has(c))o.dn2=c;if(d)o.casing2=d;}
  else if(P==='r'||P==='rs'){if(d)o.len=d;else if(c&&c<=24)o.len=c;}
  return o;}
/* diamètre extérieur acier (60,3 · 114 · 219,1) → DN, si c'en est un */
const odDn=x=>{if(!(x>=20&&x<=660))return null;const d=dnOfOd(x);if(!d)return null;const OD={20:26.9,25:33.7,32:42.4,40:48.3,50:60.3,65:76.1,80:88.9,100:114.3,125:139.7,150:168.3,200:219.1,250:273,300:323.9,350:355.6,400:406.4,450:457,500:508,600:610}[d];return OD&&Math.abs(OD-x)<=Math.max(1.6,OD*0.012)?d:null;};
export function dims(text){const t=N(text);const out={dn:[],casing:[],pairs:[],mm:[],angle:null,len:null,range:false};
  const c=codeDims(t);if(c){out.code=c;}
  if(/\d+\s*-\s*\d+\s*\/\s*\d+\s*-\s*\d+\s*mm/.test(t))out.range=true;     // « 60-98 / 160-186 mm » (coiffe : une plage)
  // « DN 200-355/80-180 », « DN 200/355 », « DN200 », « DN 65 »
  const reDN=/\bdn\s*(\d{2,3})(?:\s*[-\/]\s*(\d{2,4}))?(?:\s*\/\s*(\d{2,3})(?:\s*-\s*(\d{2,4}))?)?/g;let m;
  while((m=reDN.exec(t))){const a=+m[1];if(!DNSET.has(a))continue;out.dn.push(a);if(m[2]){const b=+m[2];if(b>a*1.25&&!DNSET.has(b))out.casing.push(b);else if(DNSET.has(b)&&b<a)out.dn.push(b);else if(b>a)out.casing.push(b);}if(m[3]&&DNSET.has(+m[3]))out.dn.push(+m[3]);if(m[4])out.casing.push(+m[4]);}
  // couples acier / gaine : « 60.3x140 », « 114.3/225 », « 114 / 225 mm », « 273x450 » ; acier seul : « 114.3x76.1 reduktion », « ø114x3.6 »
  const reP=/(\d{2,3}(?:\.\d{1,2})?)\s*(?:x|\/)\s*(\d{2,4}(?:\.\d{1,2})?)/g;
  while((m=reP.exec(t))){const a=+m[1],b=+m[2];const dA=odDn(a);if(!dA)continue;if(b>=a*1.25&&b>=a+25&&b<=1300){out.pairs.push({od:a,dn:dA,casing:Math.round(b)});}else{const dB=odDn(b);if(dB&&b<a)out.pairs.push({od:a,dn:dA,od2:b,dn2:dB});else if(b<15)out.pairs.push({od:a,dn:dA,wall:b});}}
  // gaine seule : « ø 225 », « Ø225 », « D225 », « 315 mm manchette »
  const reG=/(?:ø|o\/|\bd)\s*(\d{2,4}(?:\.\d{1,2})?)(?:\s*(?:x|->|\/)\s*(?:ø\s*)?(\d{2,4}(?:\.\d{1,2})?))?(?:\s*mm)?/g;
  while((m=reG.exec(t))){const g=+m[1],g2=m[2]?+m[2]:null;if(g2&&g2>g)continue; /* « ø 219,1 x 355 » : acier x gaine, déjà lu */if(g>=75&&g<=1300&&Number.isInteger(g))out.casing.push(g);if(g2&&g2>=75&&g2<g)out.casing.push(g2);}
  // trois gaines « 500 x 140 x 500 » (kit té INPAL) : gaine principale, gaine du piquage
  const reT=/(?:^|\s)(\d{3,4})\s*x\s*(\d{2,4})\s*x\s*(\d{3,4})(?=\s|$|mm)/g;while((m=reT.exec(t))){const a=+m[1],b=+m[2],c3=+m[3];if(a===c3&&!odDn(a)&&a>=75&&b>=75)out.casing.push(a,b);}
  // « 180 mm » seul (manchette de pénétration, coiffe, manchon) : une gaine possible, confirmée par la table gaine → DN du document
  const reM=/(?:^|\s)(\d{2,4})\s*mm\b/g;while((m=reM.exec(t)))out.mm.push(+m[1]);
  const reA=/(\d{1,2}(?:\.\d)?)\s*(?:°|deg\b|degres?\b)|\b(\d{2})d\b(?=\s*\d|\s*$|\s)/;const ma=t.match(reA);if(ma){const a=+(ma[1]||ma[2]);if(a>0&&a<=90)out.angle=a;}
  const ml=t.match(/(?:^|[\s-])(6|12|16|18)\s*m\b(?!m)/);if(ml)out.len=+ml[1];
  return out;}
/* ── une ligne du document → pièce ── */
function classify(des,code,ctx){const t=N(des),cN=N(code);const both=t+' '+cN;
  for(const [re,k] of EXCLUDE)if(re.test(t))return {skip:k};
  let kind=null;
  // codes Renalia / ZPU (« Z2T20012 », « Z2C5075 », « Z2TS20080 », « Z2V50 », « Z2J200 », « Z2ET50 »)
  const rz=cN.match(/^z\d?(t|c|cr|ts|v|j|et|r)(\d{2,6})$/);
  if(rz){kind={t:'pipe',c:'bend',cr:'bend',ts:'tee',v:'valve',j:'sleeve',et:'kit',r:'reducer'}[rz[1]];}
  if(!kind){const cat=ctx.cat;for(const [k,re] of KIND_RULES){if(re.test(both)){kind=k;break;}}
    if(cat&&cat!=='acc'&&cat!=='skip'&&(!kind||kind==='bend'||kind==='pipe')){if(cat==='pipe'&&/\b\d+\s*m\b/.test(t))kind='pipe';else if(cat==='bend'&&/deg|°/.test(t))kind='bend';else if(!kind)kind=cat;}
    if(cat==='tee'&&/x.*x/.test(t))kind='tee';if(cat==='reducer'&&kind!=='reducerJ'&&/\bx\b|x/.test(t))kind=kind==='sleeve'?'sleeve':'reducer';if(cat==='valve'&&!kind)kind='valve';
    if(cat==='acc'&&!kind)kind='acc';}
  if(!kind)return {unknown:true};
  // coude « acier » INPAL / isoplus = coude PRÉ-ISOLÉ (gaine indiquée, « DH / DF Nord. ») ; courbe acier nue seulement sans gaine
  const D=dims(t+' '+cN);
  if(kind==='steelbend'&&(D.pairs.some(p=>p.casing)||/nord|preisol/.test(t)))kind='bend';
  if(kind==='pipe'&&/gaine isolante|film|grillage/.test(t))kind='acc';
  return {kind,D};}
/* DN d'une pièce d'après ses dimensions, le code, la gaine apprise dans le document, la section */
function dnOf(kind,D,ctx){const o={};const cd=D.code;const rng=D.range; /* une plage « 60-98 / 160-186 mm » (coiffe) ne donne pas de DN */
  const pairs=rng?[]:D.pairs.filter(p=>p.casing);const steel=rng?[]:D.pairs.filter(p=>p.dn2);
  if(cd&&cd.dn)o.dn=cd.dn;if(cd&&cd.dn2)o.dn2=cd.dn2;if(cd&&cd.angle)o.angle=cd.angle;if(cd&&cd.len)o.len=cd.len;if(cd&&cd.casing)o.gaine=cd.casing;
  if(!o.dn&&pairs.length){o.dn=pairs[0].dn;o.gaine=pairs[0].casing;if(pairs[1]&&pairs[1].dn!==pairs[0].dn&&(kind==='tee'||kind==='reducer'||kind==='reducerJ'||kind==='sleeve'))o.dn2=pairs[1].dn;else if(pairs[1]&&kind==='tee')o.dn2=pairs[1].dn;}
  if(!o.dn&&steel.length){o.dn=steel[0].dn;o.dn2=steel[0].dn2;}
  if(!o.dn&&!rng&&D.dn.length){o.dn=D.dn[0];if(D.dn[1]&&(D.dn[1]!==D.dn[0]||kind==='tee'))o.dn2=D.dn[1];} /* té égal « DN 65-160/65-160 » : DN 2 = DN */
  if(!o.gaine&&D.casing.length)o.gaine=D.casing[0];
  if(!o.dn&&o.gaine&&!rng){const g=ctx.gaines.get(o.gaine);if(g)o.dn=g;}
  if(!o.dn2&&(kind==='sleeve'||kind==='reducerJ'||kind==='tee')&&D.casing.length>1){const g2=ctx.gaines.get(D.casing[1]);if(g2&&g2!==o.dn)o.dn2=g2;}
  if(!o.dn&&cd&&cd.casing&&!cd.dn){const g=ctx.gaines.get(cd.casing);if(g)o.dn=g;o.gaine=cd.casing;}
  if(!o.dn&&!rng&&(kind==='wall'||kind==='dhec'||kind==='sleeve')){for(const v of D.mm){const g=ctx.gaines.get(v);if(g){o.dn=g;o.gaine=v;break;}}}
  if(!o.dn&&ctx.dn&&kind!=='acc'&&kind!=='pu'&&!rng)o.dn=ctx.dn,o.dnCtx=true;
  if(o.dn&&o.dn2&&o.dn2>o.dn&&(kind==='reducer'||kind==='reducerJ')){const x=o.dn;o.dn=o.dn2;o.dn2=x;}
  if(o.dn2===o.dn&&(kind==='reducer'||kind==='reducerJ'))delete o.dn2;
  if(D.angle&&!o.angle)o.angle=D.angle;if(D.len&&!o.len)o.len=D.len;
  return o;}
/* apprentissage gaine → DN : chaque couple acier/gaine lu (barres, coudes, tés, sections) */
function learn(ctx,D){if(D.range)return; /* « 60-76 / 125-140 mm » : une plage, pas un couple acier / gaine */(D.pairs||[]).forEach(p=>{if(p.casing&&p.dn)ctx.gaines.set(p.casing,p.dn);});const cd=D.code;if(cd&&cd.dn&&cd.casing)ctx.gaines.set(cd.casing,cd.dn);if(cd&&cd.dn2&&cd.casing2)ctx.gaines.set(cd.casing2,cd.dn2);
  if(D.dn.length&&D.casing.length&&DNSET.has(D.dn[0]))ctx.gaines.set(D.casing[0],D.dn[0]);}
/* ── lecture d'un tableau (lignes de cellules) ── */
const looksCode=c=>{const s=String(c||'').trim();if(!s||s.length<3||s.length>24||/\s{1,}\S+\s/.test(s))return false;if(UNIT_RE.test(s)||/^(nor|nordic|alarme?)$/i.test(s)||/^\d+[.,]\d+$/.test(s))return false;if(/^[A-Z](\.\d+)*$/i.test(s))return false;if(/^\d{1,4}$/.test(s))return false;if(/^\d{1,2}[\/.]\d{1,2}[\/.]\d{2,4}$/.test(s))return false;
  return /\d/.test(s)&&/^[A-Za-z0-9][A-Za-z0-9\-\/._]*$/.test(s)||/^[A-Z]{3,}\d*$/.test(s);};
const hasLetters=c=>/[a-zA-ZÀ-ÿ]{3,}/.test(String(c||''));
const junk=c=>{const s=String(c||'').trim();return UNIT_RE.test(s)||/^(nor|nordic|alarme?|ok|oui|non|x|-)$/i.test(s);}; /* unité, colonne « alarme » LOGSTOR… : ni désignation ni code */
const HEAD_DES=/designation|description|libelle|article$|produit|piece\/troncon|^piece/,HEAD_QTY=/^(qte|qty|quantite|quantites|qt|nb|nombre|total)$/;
export function preGaines(rows,gaines){(rows||[]).forEach(r=>(Array.isArray(r)?r:[r]).forEach(c=>{if(typeof c==='string'&&/\d/.test(c)&&c.length<160){const D=dims(c);learn({gaines},D);}}));return gaines;} /* gaine → DN de tout le document, avant la lecture (la lecture ligne à ligne corrige ensuite au fil des séries) */
export function lireRows(rows,opts){opts=opts||{};const ctx={dn:opts.dn||null,cat:null,option:false,gaines:opts.gaines||new Map(),coded:null,head:null,serie:null};if(!opts.noPre)preGaines(rows,ctx.gaines);
  const res={lines:[],options:[],unknown:[],ignored:[],meta:{tranchee:{},pouces:null,lineaire:null},sheet:opts.sheet||''};
  const R=(rows||[]).map(r=>(Array.isArray(r)?r:[r]).map(c=>c===null||c===undefined?'':(typeof c==='number'?c:String(c).replace(/\s+/g,' ').trim())));
  // documents « codés » : la plupart des lignes avec quantité ont un code article → une ligne sans code est un en-tête de section
  const qtyRows=R.filter(r=>r.some(isNumCell)&&r.some(hasLetters));ctx.coded=qtyRows.length>=4&&qtyRows.filter(r=>r.slice(0,3).some(looksCode)||r.some(c=>/^\d{8,}$/.test(String(c))||/^2500E$/i.test(String(c)))).length>=qtyRows.length*0.55;
  R.forEach((row,ri)=>{if(ctx.stop)return;const cells=row.filter(c=>c!=='');if(!cells.length)return;const txt=cells.join(' ');const t=N(txt);
    // conditions générales de vente / d'utilisation (fin du document) : on arrête de lire (les articles numérotés « 1.1 … » ne sont pas des pièces)
    if(res.lines.length&&/^(\d+(\.\d+)*\s+)?(general (sales and supply )?conditions|conditions generales|terms and conditions|c o n d i t i o n s)/.test(t)){ctx.stop=true;return;}
    // en-tête de tableau : mémorise la colonne quantité / TOTAL
    if(cells.some(c=>HEAD_DES.test(N(c)))&&cells.some(c=>HEAD_QTY.test(N(c)))){const fi=re=>row.findIndex(c=>re.test(N(c)));ctx.head={qty:fi(HEAD_QTY),total:fi(/^total$/),des:fi(HEAD_DES),dn:fi(/^(dn|dn acier|diam\w*|ø|diametre nominal)$/),unit:fi(/^(u|u\.|un|unite|unites|unit)$/)};return;} /* colonnes : quantité, TOTAL, désignation, DN, unité */
    {const t0=N(cells.filter(c=>!/^[a-z](\.\d+)*$/i.test(String(c))).join(' '));if(/^options?\s*(\(s\))?$|^option\s*-\s|^options?\s+(cales|grillage|variante|chiffree|n°)/.test(t0)&&!/avec option|total option|montant/.test(t0)){ctx.option=true;res.meta.option=true;if(!/cales|grillage/.test(t0))return;}}
    if(/serie\s*([123])/.test(t)&&/montage|tradi|serie \d tradi/.test(t)){ctx.serie=+t.match(/serie\s*([123])/)[1];return;}
    if(/longueur tranchee/.test(t)){const nums=row.map(numFr).filter(v=>v!==null);if(nums.length&&ctx.dn)res.meta.tranchee[ctx.dn]=(ctx.head&&ctx.head.total>=0&&numFr(row[ctx.head.total])!==null)?numFr(row[ctx.head.total]):nums[nums.length-1];return;}
    const pc=t.match(/pouces de soudure.*?(\d+(?:\.\d+)?)\s*pouces/);if(pc){if(res.meta.pouces===null)res.meta.pouces=+pc[1];return;}
    const li=t.match(/lineaire de tubes proposes en base.*?(\d+(?:\.\d+)?)\s*m\b/);if(li){res.meta.lineaire=+li[1];return;}
    // quantité : un nombre suivi d'une unité (« 60 m », « 12 P. », « 67 TUB », « 4,00 Pièce ») ; sinon la colonne quantité / TOTAL ; sinon le 1er nombre après la désignation
    let qi=-1,unit='';for(let i=0;i<row.length;i++){const c=row[i];if(c==='')continue;if(isQtyCell(c)){let j=i+1;while(j<row.length&&row[j]==='')j++;if(j<row.length&&UNIT_RE.test(String(row[j]).trim())){qi=i;unit=String(row[j]).trim();}}
      else{const mm=String(c).match(/^(\d[\d\s]*(?:[.,]\d+)?)\s+(m|ml|p\.?|pcs|pce|pi[eè]ces?|u|tub|ens|rol)$/i);if(mm){qi=i;unit=mm[2];row[i]=mm[1];}}}
    if(qi<0&&ctx.head){const k=ctx.head.total>=0?ctx.head.total:ctx.head.qty;if(k>=0&&isQtyCell(row[k])){qi=k;if(ctx.head.unit>=0&&UNIT_RE.test(String(row[ctx.head.unit]).trim()))unit=String(row[ctx.head.unit]).trim();}}
    // désignation : la 1re cellule avec des lettres (hors code, unité, « NOR ») ; sinon une cellule de dimensions seules (« 114 / 225 mm 12 m », « 88/180x60/140x88/180mm »)
    let desI=row.findIndex((c,i)=>(qi<0||i<qi)&&hasLetters(c)&&!junk(c)&&!(looksCode(c)&&!/\s/.test(String(c))&&String(c).length<16));
    if(desI<0)desI=row.findIndex((c,i)=>(qi<0||i<qi)&&c!==''&&!isNumCell(c)&&!(looksCode(c)&&!/\s/.test(String(c)))&&/\d\s*(x|\/|×)\s*\d|\d\s*mm\b|\d\s*(°|deg)/i.test(String(c)));
    if(qi<0&&desI>=0&&!opts.text){for(let i=desI+1;i<row.length;i++){if(isQtyCell(row[i])&&numFr(row[i])<10000){qi=i;break;}}}
    const codeI=row.findIndex((c,i)=>i!==desI&&looksCode(c)&&(qi<0||i!==qi));let codeCell=codeI>=0?row[codeI]:'';
    const money=c=>/€/.test(String(c))||isNumCell(c);
    let des=desI>=0?row.slice(desI,qi<0?row.length:qi).filter((c,j)=>{const i=desI+j;return c!==''&&i!==codeI&&!money(c)&&!junk(c)&&!(j>0&&looksCode(c)&&!/\s/.test(String(c)));}).map(String).join(' '):'';
    if(!codeCell&&des){const mc=des.match(/^(.*\S)\s+(0?\d{8,14})$/);if(mc){codeCell=mc[2];des=mc[1];}} /* « Pochette de mousse n° 7 07000000108107 » : le code collé en fin de désignation */
    if(!des&&codeCell){des=String(codeCell);}
    if(ctx.head&&ctx.head.dn>=0&&des){const dv=String(row[ctx.head.dn]??'').trim().match(/^(?:dn\s*)?(\d{2,3})$/i);if(dv&&DNSET.has(+dv[1])&&!/\bdn\s*\d/i.test(des))des+=' DN'+dv[1];} /* colonne « DN » à part */
    // contexte : section DN, catégorie
    const qv=qi>=0?numFr(row[qi]):null;
    const realCode=!!(codeCell&&String(codeCell).trim());const hasCode=realCode||!!unit; /* une quantité suivie de son unité (« 2 PCS ») vaut une ligne d'article, même sans code lisible */
    const catM=CATS.find(([,re])=>re.test(t.replace(/:.*$/,'').trim()));
    if((qv===null||(!hasCode&&ctx.coded))&&catM&&cells.length<=3){ctx.cat=catM[0];ctx.redS=ctx.redJ=ctx.lastS=null;if(catM[0]!=='skip')ctx.option=ctx.option&&!/^tubes?$/.test(t)?ctx.option:ctx.option;return;}
    const D0=dims(txt);
    const dnHead=t.match(/^(?:[a-z](?:\.\d+)*\s+)?dn\s*(\d{2,3})\b|(?:^|\s)dn\s*(\d{2,3})\s*[\/-]\s*\d{2,4}\s*$|\bpoint .* dn\s*(\d{2,3})|piq(?:uage)? dn\s?(\d{2,3})|\bdn\s?(\d{2,3})\b.*\bisol/);
    const secRow=!realCode&&/^[A-Z](\.\d+)*$/.test(String(cells[0]).trim());
    // « DN50 - Ø60,3x140 Isolation+ 19 m », « Point 0 au Point 1 DN 200/355 », « Purge piq DN32 » : en-têtes de section sûrs ; « Té DN 100/50 2 u » : une pièce
    const strongHead=!!dnHead&&/^(?:[a-z](?:\.\d+)*\s+)?dn\s*\d{2,3}\s*(-|\(|isol)|\bpoint .* dn\s*\d|piq(?:uage)? dn\s?\d|^(purge|vidange)\b/.test(t);
    const headRow=!!dnHead&&!realCode&&(strongHead||!(qv>0)||!(classify(des||txt,codeCell,ctx).kind));
    if(qv===null||qv===0||(ctx.coded&&!hasCode)||headRow||secRow){ /* en-tête de section (le linéaire de la section, pas une pièce) */
      if(dnHead){const d=+(dnHead[1]||dnHead[2]||dnHead[3]||dnHead[4]||dnHead[5]);if(DNSET.has(d)){ctx.dn=d;learn(ctx,D0);ctx.cat=null;}}
      else if(/purge|vidange|accessoires/.test(t)&&cells.length<=5){ctx.cat=/accessoires/.test(t)?'acc':null;}
      if(qv&&qv>0&&!dnHead&&hasLetters(des)&&!ctx.coded){/* ligne sans code dans un document non codé : traitée plus bas */}else{if(qv&&qv>0&&!dnHead)res.ignored.push({des:txt.slice(0,120),why:'en-tête ou ligne sans code article'});return;}}
    if(!des||!(/[a-zA-ZÀ-ÿ]{2,}/.test(des)||looksCode(codeCell||des))){return;} /* « Té DN 100/50 » : deux lettres suffisent */
    const C=classify(des,codeCell,ctx);
    if(C.skip){res.ignored.push({des:txt.slice(0,120),why:C.skip,qty:qv});return;}
    if(qv===null||!(qv>0))return;
    const src={sheet:opts.sheet||'',row:ri+1};
    if(C.unknown){const D=dims(des+' '+codeCell);const o={des:String(des).slice(0,140),ref:String(codeCell||''),qty:qv,unit:unitKind(unit),src,option:ctx.option};const dd=dnOf('acc',D,ctx);if(dd.dn)o.dn=dd.dn;(ctx.option?res.options:res.unknown).push(o);return;}
    learn(ctx,C.D);
    let kind=C.kind;const d=dnOf(kind,C.D,ctx);
    // Renalia : « Z2T20012 » = barre DN200 de 12 m ; « Z2C5075 » = coude DN50 75° ; « Z2TS20080 » = té 200 / 80
    const rz=N(codeCell).match(/^z\d?(t|c|cr|ts|v|j|et)(\d{2,6})$/);if(rz){const s=rz[2];if(rz[1]==='t'){const L=+s.slice(-2);const dn=+s.slice(0,-2);if(DNSET.has(dn)){d.dn=d.dn||dn;d.len=L;}}else if(rz[1]==='c'||rz[1]==='cr'){const a=+s.slice(-2);if(a>0&&a<=90)d.angle=a;}}
    const o={kind,qty:qv,unit:unitKind(unit),des:String(des).slice(0,160),ref:String(codeCell||'').slice(0,40),src};
    if(kind==='reducerJ'){o.kind='reducer';o.joint=true;}
    if(kind==='steelbend')o.joint=true;
    if(/\bkit te\b/.test(N(des)))o.joint=true;
    ['dn','dn2','angle','len','gaine'].forEach(k=>{if(d[k]!==undefined&&d[k]!==null)o[k]=d[k];});
    if(d.dnCtx)o.note='DN de la section';
    if(o.kind==='bend'){const xx=N(des).match(/xx\s*([<>])\s*(\d{2})/);if(xx){o.angle=xx[1]==='>'?60:30;o.note='angle '+(xx[1]==='>'?'> ':'< ')+xx[2]+'° (variable) : '+o.angle+'° retenu';}else if(!o.angle){o.angle=90;o.note='angle non indiqué : 90° par défaut';}} /* « COUDE 3D … XX<45° » : angle variable, pas 45° */
    if(o.kind==='pipe'){if(!o.len)o.len=12;if(o.unit==='ml'){o.ml=qv;o.qty=Math.ceil(qv/o.len-1e-9);}else{const tu=N(unit);if(tu==='m'||tu==='ml'){o.ml=qv;o.qty=Math.ceil(qv/o.len-1e-9);o.unit='ml';}}}
    else if(o.unit==='ml'&&o.kind!=='acc'){o.unit='u';}
    if(o.kind==='acc')o.label=String(des).replace(/\s+/g,' ').trim().slice(0,80);
    if(o.kind!=='acc'&&o.kind!=='pu'&&o.kind!=='dhec'&&!o.dn)o.note=(o.note?o.note+' · ':'')+'DN introuvable';
    // réduction DANS un manchon : le manchon réduit (« EWJoint, réd. D200/160 », « MANCHETTE REDUIT ») prend le DN de la réduction acier du même groupe
    const align=(sl,rd)=>{if(!rd.dn)return;sl.dn=rd.dn;if(rd.dn2)sl.dn2=rd.dn2;else delete sl.dn2;sl.note=((sl.note||'').replace(/(^| · )DN introuvable/,'')+' · DN de la réduction acier').replace(/^ · /,'');};
    if(o.kind==='sleeve'&&/\bred\b|reduc|reduit/.test(N(des))){ctx.redS={o,ri};if(ctx.redJ&&ri-ctx.redJ.ri<=6)align(o,ctx.redJ.o);}
    // la mousse d'une jonction sans dimension (« Pochette de mousse n° 9 ») prend le DN du manchon du même groupe
    if(o.kind==='sleeve'&&o.dn)ctx.lastS={dn:o.dn,ri};if(o.kind==='pu'&&!o.dn&&ctx.lastS&&ri-ctx.lastS.ri<=4){o.dn=ctx.lastS.dn;o.note=((o.note||'')+' · DN du manchon').replace(/^ · /,'');}
    if(kind==='reducerJ'){ctx.redJ={o,ri};if(ctx.redS&&ri-ctx.redS.ri<=6)align(ctx.redS.o,o);}
    if(ctx.option){o.option=true;res.options.push(o);}else res.lines.push(o);});
  res.meta.gaines=Object.fromEntries(ctx.gaines);return res;}
/* ── feuille « matrice » AXIOM : une feuille par DN, une colonne par tronçon, colonne TOTAL ── */
function isMatrix(rows){const h=(rows||[]).slice(0,6).find(r=>(r||[]).some(c=>N(c)==='total')&&(r||[]).some(c=>/piece|troncon|code|ref/.test(N(c))));return !!h;}
/* ── classeur : chaque feuille ; une feuille « trame SCR » éventuelle est laissée à trame.js ── */
export function lireClasseur(sheets,opts){opts=opts||{};const gaines=new Map();(sheets||[]).forEach(s=>preGaines(s.rows,gaines));const out={lines:[],options:[],unknown:[],ignored:[],meta:{tranchee:{},pouces:null,lineaire:null,feuilles:[]},mode:'tableau fournisseur'};
  (sheets||[]).forEach(s=>{const rows=s.rows||[];if(!rows.length)return;const H=rows.slice(0,15).map(r=>(r||[]).map(N));if(H.some(r=>r.includes('type de piece')&&r.some(c=>/^quantite$/.test(c))))return; /* la trame SCR : lue par trame.js */
    if(H.some(r=>r.some(c=>/^retour claude|^j.ai rempli la trame/.test(c))))return;
    const dnSheet=(N(s.name).match(/^dn\s*(\d{2,3})$/)||[])[1];
    const R=lireRows(rows,{sheet:s.name,dn:dnSheet?+dnSheet:null,gaines,noPre:true});
    if(isMatrix(rows))out.mode='tableau par tronçons (colonne TOTAL)';
    ['lines','options','unknown','ignored'].forEach(k=>out[k].push(...R[k]));Object.assign(out.meta.tranchee,R.meta.tranchee);if(R.meta.pouces!==null&&out.meta.pouces===null)out.meta.pouces=R.meta.pouces;if(R.meta.lineaire!==null&&out.meta.lineaire===null)out.meta.lineaire=R.meta.lineaire;if(R.meta.option)out.meta.option=true;
    if(R.lines.length||R.unknown.length)out.meta.feuilles.push(s.name);});
  out.meta.fournisseur=fournisseurOf((sheets||[]).map(s=>(s.rows||[]).slice(0,60).map(r=>(r||[]).join(' ')).join(' ')).join(' '),out);out.meta.gaines=Object.fromEntries(gaines);
  return out;}
/* ── texte collé ou extrait (lignes ; les colonnes séparées par des tabulations ou au moins 2 espaces) ── */
export function lireTexte(text,opts){const rows=String(text||'').split(/\r?\n/).map(l=>l.replace(/[\u00a0\u202f]/g,' ').split(/\t|\s{2,}/).map(c=>c.trim()).filter(c=>c!==''));
  const R=lireRows(rows,Object.assign({sheet:'texte',text:true},opts||{}));R.mode='texte';R.meta.fournisseur=fournisseurOf(text,R);return R;}
/* ── PDF avec texte : éléments lus par pdf.js (x, y, largeur, hauteur, texte) → lignes de cellules. Même ligne = même hauteur (à ±35 % de la police) ;
   nouvelle cellule dès qu'un écart horizontal dépasse ~½ hauteur de police (un espace entre deux mots est bien plus petit qu'un écart entre deux colonnes). ── */
export function pdfRows(pages){const rows=[];
  (pages||[]).forEach(pg=>{const its=((pg&&pg.items)||pg||[]).map(it=>({x:+it.x||0,y:+it.y||0,w:Math.max(0,+it.w||0),h:Math.abs(+it.h)||8,s:String(it.s??it.str??'').replace(/\s+/g,' ')})).filter(it=>it.s.trim()!=='');
    its.sort((a,b)=>b.y-a.y||a.x-b.x);const lines=[];
    its.forEach(it=>{const L=lines[lines.length-1];if(L&&Math.abs(L.y-it.y)<=Math.max(2,Math.min(L.h,it.h)*0.35)){L.items.push(it);L.h=Math.max(L.h,it.h);}else lines.push({y:it.y,h:it.h,items:[it]});});
    lines.forEach(L=>{const cells=[];let cur=null;
      L.items.sort((a,b)=>a.x-b.x).forEach(it=>{if(cur){const gap=it.x-cur.x1,hh=Math.min(cur.h,it.h);if(gap<=Math.max(3,hh*0.55)){cur.s+=(gap>hh*0.12&&!/\s$/.test(cur.s)&&!/^\s/.test(it.s)?' ':'')+it.s;cur.x1=Math.max(cur.x1,it.x+it.w);cur.h=Math.max(cur.h,it.h);return;}cells.push(cur.s.trim());}
        cur={s:it.s,x1:it.x+it.w,h:it.h};});
      if(cur)cells.push(cur.s.trim());const c2=cells.filter(Boolean);if(c2.length)rows.push(c2);});
    rows.push([]);});
  return rows;}
export function lirePdf(pages,opts){const rows=pdfRows(pages);const R=lireRows(rows,Object.assign({sheet:'PDF'},opts||{}));R.mode='PDF';R.meta.fournisseur=fournisseurOf(rows.map(r=>r.join(' ')).join('\n'),R);R.meta.pdfLignes=rows.filter(r=>r.length).length;return R;}
/* fournisseur reconnu (pour l'affichage seulement) */
export function fournisseurOf(text,R){const t=N(text);if(/isoplus/.test(t))return 'isoplus (INPAL)';if(/inpal|polyuretub/.test(t))return 'INPAL';if(/logstor|kingspan|ewjoint/.test(t))return 'LOGSTOR';if(/renalia|zpu|z2t\d|preisole dn/.test(t))return 'Renalia / ZPU';if(/axiom|\br-\d{2,3}\/\d{2,3}-1[26]\b|nt-\d{2,3}\/\d/.test(t))return 'AXIOM';if(/brugg|calpex/.test(t))return 'BRUGG';if(/isoplus|isopex/.test(t))return 'isoplus';return '';}
/* synthèse courte pour l'affichage */
export function lectureResume(R){const n=R.lines.length,u=R.unknown.length,o=R.options.length;return `${n} ligne${n>1?'s':''} reconnue${n>1?'s':''}${u?` · ${u} à classer`:''}${o?` · ${o} en option (non comptée${o>1?'s':''})`:''}${R.ignored.length?` · ${R.ignored.length} ignorée${R.ignored.length>1?'s':''} (totaux, transport…)`:''}`;}
