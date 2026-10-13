// trame.js — TRAME TYPE D'IMPORT : commande fournisseur (onglet Fourniture) ET bon de livraison (onglet Stock). 13/10/2026 soir, Ethan : « sors-moi une
// trame type de comment ça doit être pour être bien lu à l'import, que tout soit bien rangé, et mets-la dans le logiciel : le gars copie la trame, la colle
// sur le tableau du fournisseur, un coup de Claude dans Excel pour remplir la trame propre avec les données du tableau de base, puis il copie-colle la trame
// remplie et l'import est réussi ».
// Lecture DÉTERMINISTE : une colonne = une information (type, DN, DN 2, angle, longueur, quantité, unité, gaine) — pas de devinette sur le texte. Une ligne
// mal remplie est montrée avec sa raison (n° de ligne Excel), jamais importée en douce. Module pur (sans DOM) sauf copyText / dlBytes.
import {dnOfOd} from './stock.js';
import {makeXlsx,openXlsx,colName} from './xlsx.js';

export const TRAME_COLS=['Type de pièce','DN','DN 2','Angle (°)','Longueur (m)','Quantité','Unité','Gaine Ø (mm)','Réf. fournisseur','Désignation fournisseur'];
export const TRAME_TYPES=[['Barre','pipe'],['Coude','bend'],['Té','tee'],['Réduction','reducer'],['Réduction dans manchon','reducerJ'],['Vanne','valve'],['Kit fin de ligne','kit'],['Manchon','sleeve'],['Manchon fin de ligne','sleeveEnd'],['Mousse PU','pu'],['Courbe acier','steelbend'],['By-pass','bypass'],['DHEC','dhec'],['Passage de mur','wall'],['Accessoire','acc']];
export const TRAME_DNS=[20,25,32,40,50,65,80,100,125,150,200,250,300,350,400,450,500];
const DNSET=new Set(TRAME_DNS);
const slug=s=>String(s??'').normalize('NFD').replace(/[̀-ͯ]/g,'').toLowerCase().replace(/[^a-z0-9]+/g,' ').trim();
/* synonymes tolérés dans la colonne « Type de pièce » (Claude ou le gars peuvent écrire « Tube », « T », « Jonction »…) */
const SYN={'kit joint':'sleeve','kit de joint':'sleeve',tube:'pipe',tubes:'pipe',barres:'pipe','longueur droite':'pipe',conduite:'pipe',coudes:'bend',courbe:'bend',te:'tee',tes:'tee',t:'tee',tee:'tee',piquage:'tee',derivation:'tee',reduc:'reducer',reductions:'reducer',cone:'reducer','kit reduit':'reducerJ','reduction acier':'reducerJ','reducteur acier':'reducerJ','reduction dans un manchon':'reducerJ','reduction dans le manchon':'reducerJ',vannes:'valve',robinet:'valve','kit fdl':'kit','fin de ligne':'kit',embout:'kit','kit de fin de ligne':'kit',manchons:'sleeve',jonction:'sleeve','manchon de jonction':'sleeve','manchon fdl':'sleeveEnd','manchon d extremite':'sleeveEnd',mousse:'pu',pu:'pu','mousse pu a b':'pu','mousse pur':'pu','courbe acier':'steelbend','coude acier':'steelbend',bypass:'bypass','by pass':'bypass',dhec:'dhec','joint d extremite':'dhec','passe mur':'wall','traversee de mur':'wall',accessoires:'acc',autre:'acc',divers:'acc'};
export const kindOfType=v=>{const s=slug(v);if(!s)return null;const ex=TRAME_TYPES.find(t=>slug(t[0])===s);return ex?ex[1]:(SYN[s]||null);};
export const typeOfKind=(k,joint)=>{const kk=k==='puA'||k==='puB'||k==='puKit'?'pu':(k==='reducer'&&joint?'reducerJ':k);const t=TRAME_TYPES.find(x=>x[1]===kk);return t?t[0]:'Accessoire';};
const num=v=>{if(v===null||v===undefined||v==='')return null;if(typeof v==='number')return isFinite(v)?v:null;const s=String(v).replace(/[\s ]/g,'').replace(/^dn/i,'').replace(',','.');if(!/^-?\d+(\.\d+)?$/.test(s))return null;const x=parseFloat(s);return isFinite(x)?x:null;};
const HEAD={type:/^type de piece$|^type$/,dn:/^dn$/,dn2:/^dn ?2$/,angle:/^angle/,len:/^longueur/,qty:/^quantite$|^qte$/,unit:/^unite$/,gaine:/^gaine/,ref:/^ref/,des:/^designation/};
/* en-tête de la trame dans les 15 premières lignes : « Type de pièce » ET « Quantité » */
export function trameHeader(rows){for(let i=0;i<Math.min((rows||[]).length,15);i++){const H=(rows[i]||[]).map(slug);if(!H.some(c=>HEAD.type.test(c)&&c!=='type')||!H.some(c=>HEAD.qty.test(c)))continue;
    const col={};Object.keys(HEAD).forEach(k=>{col[k]=H.findIndex(c=>HEAD[k].test(c));});if(col.dn2>=0&&col.dn2===col.dn)col.dn=H.findIndex(c=>c==='dn');return {row:i,col};}return null;}
/* lignes de la trame → pièces neutres {kind,dn,dn2,angle,len,gaine,qty,unit,ml,ref,des,label,raw,row,note} ; null si l'en-tête n'y est pas */
export function parseTrame(rows){const h=trameHeader(rows);if(!h)return null;const lines=[],bad=[];
  (rows||[]).slice(h.row+1).forEach((r,j)=>{const n=(r&&r._r)||h.row+j+2;const g=k=>h.col[k]>=0&&r?r[h.col[k]]:'';
    if(!(r||[]).some(c=>String(c??'').trim()!==''))return;
    const tRaw=String(g('type')??'').trim();let kind=kindOfType(tRaw);const why=[];const notes=[];let joint=false;if(kind==='reducerJ'){kind='reducer';joint=true;} /* 13/10 soir : réduction acier soudée DANS un manchon réduit = 2 soudures pour 1 manchon */
    if(!kind)why.push(tRaw?'type « '+tRaw+' » inconnu (voir la liste)':'type de pièce vide');
    const dnTxt=String(g('dn')??'').trim();let dn=num(dnTxt);const gaine=num(g('gaine'));
    if(kind&&kind!=='acc'){if(dn===null){if(dnTxt)why.push('DN « '+dnTxt+' » illisible');else if(!((kind==='sleeve'||kind==='sleeveEnd'||kind==='dhec'||kind==='wall')&&gaine))why.push('DN vide');}
      else if(!DNSET.has(dn)){const d=dnOfOd(dn);if(d&&Math.abs(d-dn)>2){notes.push(dnTxt+' lu comme DN'+d+' (diamètre extérieur acier)');dn=d;}else why.push('DN « '+dnTxt+' » inconnu');}}
    let dn2=null;const d2Txt=String(g('dn2')??'').trim();if(d2Txt&&(kind==='tee'||kind==='reducer')){dn2=num(d2Txt);if(dn2===null)why.push('DN 2 « '+d2Txt+' » illisible');else if(!DNSET.has(dn2)){const d=dnOfOd(dn2);if(d){notes.push(d2Txt+' lu comme DN'+d);dn2=d;}else why.push('DN 2 « '+d2Txt+' » inconnu');}}
    let angle=null;if(kind==='bend'||kind==='steelbend'){const a=num(g('angle'));if(String(g('angle')??'').trim()&&(a===null||a<=0||a>90))why.push('angle « '+g('angle')+' » (de 1 à 90°)');angle=a&&a>0&&a<=90?a:90;}
    let len=null;if(kind==='pipe'){const L=num(g('len'));if(String(g('len')??'').trim()&&(L===null||L<=0||L>24))why.push('longueur « '+g('len')+' » (6, 12 ou 16 m)');len=L&&L>0&&L<=24?L:12;}
    const qTxt=String(g('qty')??'').trim();let qty=num(qTxt);if(qty===null)why.push(qTxt?'quantité « '+qTxt+' » illisible (un nombre, sans unité)':'quantité vide');else if(qty<=0)why.push('quantité nulle');
    const uS=slug(g('unit'));let unit='u';if(['ml','m','metre','metres','m l','metre lineaire','metres lineaires'].includes(uS))unit='ml';else if(uS&&!['u','un','unite','unites','pc','pcs','piece','pieces','ens','ensemble','lot','lots'].includes(uS))why.push('unité « '+g('unit')+' » (u ou ml)');
    if(unit==='ml'&&kind&&kind!=='pipe'&&kind!=='acc')why.push('« ml » seulement pour les barres (ou un accessoire)');
    const ref=String(g('ref')??'').trim(),des=String(g('des')??'').trim();
    if(why.length){bad.push('ligne '+n+' : '+why.join(', ')+' — '+[tRaw,dnTxt,qTxt,unit==='ml'?'ml':'',des||ref].filter(Boolean).join(' · '));return;}
    const o={kind,qty,unit,ref,des,row:n,raw:[ref,des].filter(Boolean).join(' — ')||tRaw};
    if(kind!=='acc'&&dn)o.dn=dn;if(dn2)o.dn2=dn2;if(angle)o.angle=angle;if(len)o.len=len;if(gaine)o.gaine=gaine;if(joint)o.joint=true;
    if(kind==='pipe'&&unit==='ml'){o.ml=qty;o.qty=Math.ceil(qty/(len||12)-1e-9);notes.push(qty+' ml → '+o.qty+' barre'+(o.qty>1?'s':'')+' de '+(len||12)+' m');}
    if(kind==='acc')o.label=(des||ref||'Accessoire')+(unit==='ml'?' (ml)':'');
    if(notes.length)o.note=notes.join(' · ');lines.push(o);});
  return {lines,bad,mode:'trame SCR'};}
/* classeur : la trame peut être sur n'importe quelle feuille (le gars la colle à côté du tableau du fournisseur) */
export async function trameFromXlsx(src){const wb=await openXlsx(src);for(const s of wb.sheets){const sh=await wb.sheet(s.name);if(!sh)continue;let maxC=0;Object.keys(sh.cells).forEach(a=>{const m=a.match(/^([A-Z]+)/);if(m){let n=0;for(const ch of m[1])n=n*26+(ch.charCodeAt(0)-64);if(n>maxC)maxC=n;}});maxC=Math.min(maxC,60);
    const rows=[];for(let r=1;r<=sh.maxR;r++){const row=[];for(let c=1;c<=maxC;c++){const v=sh.at(c,r);row.push(v===null||v===undefined?'':v);}row._r=r;rows.push(row);}
    const R=parseTrame(rows);if(R){R.sheet=s.name;return R;}}return null;}
/* pièces → lignes de trame (BL d'une zone, commande complémentaire) */
export function trameRows(items){return [TRAME_COLS.slice()].concat((items||[]).filter(x=>x&&+x.qty>0).map(x=>{const k=x.kind;return [typeOfKind(k,x.joint),k==='acc'?'':(x.dn||''),(k==='tee'||k==='reducer')&&x.dn2?x.dn2:'',(k==='bend'||k==='steelbend')?(x.angle||90):'',k==='pipe'?(x.len||12):'',+x.qty,'u',x.gaine||'',x.ref||'',x.des||x.label||''];}));}
export const trameTSV=rows=>rows.map(r=>r.map(v=>String(v??'').replace(/[\t\r\n]+/g,' ')).join('\t')).join('\r\n');
export const trameHeaderTSV=()=>TRAME_COLS.join('\t');
/* consigne à coller dans Claude pour Excel (le tableau du fournisseur est ouvert à côté) */
export function trameConsigne(){const L=TRAME_TYPES.map(t=>t[0]).join(', ');return [
  'Tu remplis la feuille « Trame » (en-tête en ligne 1, à ne pas modifier) à partir du document du fournisseur ouvert dans ce classeur : quantitatif, devis, commande, accusé de réception ou bon de livraison (parfois un PDF converti en Excel). But : UNE ligne de Trame par ligne de PIÈCE du fournisseur — rien d\'inventé, rien d\'oublié.',
  '',
  'A. OÙ LIRE',
  '- Lis toutes les feuilles du fournisseur (pas la Trame). Une feuille par DN (« DN400 »…) : c\'est le DN de toutes ses lignes.',
  '- Tableau avec une colonne par tronçon et une colonne TOTAL : prends UNIQUEMENT la colonne TOTAL.',
  '- Une désignation coupée sur plusieurs lignes (PDF converti) = une seule pièce : la quantité est sur la ligne qui porte le code article ou l\'unité.',
  '- Les titres de section (« DN50 - Ø60,3x140 Isolation+ 19 m », « Point 0 au Point 1 DN 200/355 », « Tube », « Coude », « Manchon EW - Complet ») ne sont PAS des pièces : ils donnent le DN ou la famille des lignes qui suivent.',
  '',
  'B. NE REPORTE PAS (liste-les à la fin)',
  '- Sous-totaux, totaux, montants, prix, remises, révision de prix, TVA, « métré total », « linéaire de tubes », « pouces de soudure ».',
  '- Transport, livraison, frais de port, études, plans, note de calcul, formation, chef de projet, location, licence, assistance, mise en service, conditions (de service, commerciales, générales).',
  '- Les OPTIONS et VARIANTES (section « OPTION(S) », « OPTION - CALES et Grillage », variante d\'un autre DN) : pas dans la Trame, liste-les à part.',
  '- Les lignes à quantité 0.',
  '',
  'C. TYPE DE PIÈCE — UNIQUEMENT une valeur de cette liste : '+L+'.',
  '- Barre : tube, conduite, longueur droite ; codes R-… ou RS-… (AXIOM, ZPU), Z2T… (Renalia) ; famille « Tube » (LOGSTOR : « 114 / 225 mm 12 m »).',
  '- Coude : coude ou courbe PRÉ-ISOLÉ(E) (« COUDE ACIER 5D 60,3x140 - 90° DH Nord. » est un Coude) ; codes K-…, KW-…, Z2C… ; famille « Coude ».',
  '- Courbe acier : courbe ou coude acier NU (sans gaine), soudé dans une jonction.',
  '- Té : té droit, té à saut, pièce-T, piquage, dérivation ; codes TW-, TP-, TR-, TO-, TD-, Z2TS… ; « KIT TE A SAUT » (té fait sur place) = Té.',
  '- Réduction : réduction ou cône PRÉ-ISOLÉ(E) (codes Z-…, « REDUCTION 273/400 x 114,3/180 », famille « Réduction »).',
  '- Réduction dans manchon : réduction ACIER soudée dans une jonction réduite (« I6 : KIT REDUIT », « Reduktion St », « réduction acier » dans un groupe « Manchon EW »). Le manchon réduit qui va avec (« MANCHETTE REDUIT », « EWJoint, réd. D200/160 ») = Manchon, au GRAND DN.',
  '- Vanne : vanne, robinet (« VANNE PASSAGE INTEGRAL », codes ZK…, ZKODPI…, Z2V…).',
  '- Manchon : UNE ligne par jonction (manchette ou manchon thermorétractable, électrosoudable, EWJoint ; codes NT-, NTE-, NH-, N-, Z2J…). Le « KIT DE JONCTION (Produits) », la « pochette de mousse », le « KIT FLEXIBLE COUDE (Produits) » = Mousse PU (pas un 2e manchon). « Bande à souder » = Accessoire.',
  '- Manchon fin de ligne : codes NK-…, « manchon fin de ligne / d\'extrémité ».',
  '- Kit fin de ligne : « KIT FIN DE LIGNE », embout terminal (Z2ET…). La « I5 : MANCHETTE PEHD » qui l\'accompagne = Accessoire (déjà dans le kit).',
  '- DHEC : DHEC, coiffe thermorétractable, embout d\'extrémité, code E-… (AXIOM).',
  '- Passage de mur : passage de cloison, manchette de pénétration, joint labyrinthe, insert ou anneau d\'étanchéité (GKD), code P-… (AXIOM).',
  '- Mousse PU : kits de jonction (produits), pochettes de mousse, mousse PU A+B.',
  '- Accessoire : tout le reste (coussins de dilatation, film, cales, grillage avertisseur, cosses, écarteurs, scotch, gaine pour câbles, Styrodur, matelas « MAT », étais, boîtiers de détection EL-…, raccords).',
  '- Ne laisse JAMAIS « Type de pièce » vide : en cas de doute, mets Accessoire et signale la ligne.',
  '',
  'D. DN = le DN de l\'ACIER, parmi '+TRAME_DNS.join(', ')+'.',
  '- « DN 200/355 » ou « DN 200-355/80-180 » → 200 (et 80 en DN 2). Codes : « R-400/630-12 » → 400 ; « K-80-180/90 » → 80 ; « Z2T20012 » → 200.',
  '- Diamètre extérieur acier → DN : 26,9→20 · 33,7→25 · 42,4→32 · 48,3→40 · 60,3→50 · 76,1→65 · 88,9→80 · 114,3→100 · 139,7→125 · 168,3→150 · 219,1→200 · 273→250 · 323,9→300 · 355,6→350 · 406,4→400 · 457→450 · 508→500 (LOGSTOR arrondit : 114 = 114,3, 88 = 88,9, 60 = 60,3).',
  '- Couple acier / gaine (« 60,3x140 », « 114 / 225 mm », « 219,1/355 ») : le 1er nombre est l\'acier, le 2e la gaine. JAMAIS la gaine comme DN.',
  '- Gaine seule (« ø 140 », « EWJoint D225 », « 180 mm Manchette de pénétration ») : le DN des tubes du MÊME document qui ont cette gaine (tubes 60,3x140 → ø 140 = DN 50) ; sinon le DN de la section.',
  '- Rien sur la ligne : le DN de la section ou de la feuille. Coiffe donnée en plage (« 60-98 / 160-186 mm ») : DN vide.',
  '',
  'E. DN 2 : pour un Té, le DN du piquage (« 88/180x60/140x88/180 » → 80 et 50 ; « TW-400-630/200-355 » → 400 et 200 ; té égal « DN 65-160/65-160 » → 65 et 65). Pour une Réduction ou une Réduction dans manchon, le PETIT DN (« 114,3x76,1 » → 100 et 65). Sinon vide.',
  'F. Angle (°) : Coude ou Courbe acier, l\'angle RÉEL de 1 à 90 (50, 59, 75, 79… sont valables) : « 90° », « 90D », « 50 DEG », « K-…/75 », « Z2C…75 ». « XX>45° » → 60 et « XX<45° » → 30 (angle variable : signale-le). Rien d\'écrit → 90.',
  'G. Longueur (m) : Barre seulement, la longueur d\'UNE barre (« - 12m - », « 12 m », « R-…-12 », « Z2T…12 ») ; sinon 12.',
  'H. Quantité : un nombre seul. Unité : ml pour une Barre comptée en mètres (m, ml) ; u pour tout le reste (pièces, barres, TUB, PCS).',
  'I. Gaine Ø (mm) : la gaine si elle est écrite (2e nombre du couple, « ø 140 », « D225 »). Sinon vide.',
  'J. Réf. fournisseur et Désignation fournisseur : recopie-les telles quelles (code article, désignation complète).',
  '',
  'K. À la fin, écris-moi : 1) les options et variantes non reportées, avec leurs quantités ; 2) les lignes ignorées, par catégorie (totaux, transport, études…) ; 3) les lignes douteuses (type, DN ou angle incertain) avec leur n° de ligne dans la Trame.'].join('\n');}
const EXEMPLE=[['Barre',200,'','',12,18,'u','','R-200/315-12','Tube acier pré-isolé DN200 série 2 - 12 m'],['Barre',100,'','',12,84,'ml','','R-100/200-12','Tube DN100 au mètre (84 ml → 7 barres)'],['Coude',200,'',90,'',4,'u','','K-200/315-90','Coude 90° DN200'],['Té',200,100,'','',2,'u','','TW-200/100','Té DN200 piquage DN100'],['Réduction',200,150,'','',1,'u','','Z-200/150','Réduction 200/150'],['Coude',80,'',75,'',2,'u','','K-80-180/75','Coude 75° DN80'],['Réduction dans manchon',100,65,'','',2,'u','','10060114010076','114,3x76,1 Reduktion St (dans le manchon réduit)'],['Manchon',100,'','','',2,'u',250,'50280250180000','EWJoint, réd. à souder D250/180 (manchon réduit, au grand DN)'],['Manchon',200,'','','',22,'u',315,'NT-315','Manchon thermorétractable Ø315'],['Mousse PU',200,'','','',22,'u',315,'PU-315','Kit mousse PU A+B pour manchon Ø315'],['Kit fin de ligne',100,'','','',2,'u','','KFL-100','Kit fin de ligne DN100'],['Vanne',100,'','','',1,'u','','V-100','Vanne à souder pré-isolée DN100'],['Accessoire','','','','',100,'ml','','GR-100','Grillage avertisseur']];
/* le classeur de la trame (vierge ou rempli) : Trame · Consigne · Exemple · Listes ; meta = lignes d'en-tête au-dessus (BL d'une zone) */
export async function trameXlsx(opt){opt=opt||{};const rows=opt.rows&&opt.rows.length?opt.rows:[TRAME_COLS.slice()];const meta=opt.meta||[];const head=meta.length?meta.length+2:1;
  const body=meta.length?meta.map(m=>[m]).concat([[]],rows):rows;const N=Math.max(500,body.length+200);
  const lists=[{ref:'A'+(head+1)+':A'+N,values:TRAME_TYPES.map(t=>t[0]),title:'Type de pièce',prompt:'Choisis dans la liste'},{ref:'G'+(head+1)+':G'+N,values:['u','ml']}];
  const W=[18,7,7,9,12,10,7,12,18,44];
  const steps=[['Trame type SCR — import d\'une commande fournisseur, d\'un bon de livraison (BL) ou d\'une étude / quantitatif fournisseur (Commerce)'],[''],['Comment faire'],['1. Ouvre le tableau du fournisseur (commande, accusé de réception, BL, quantitatif / détail matériel) dans Excel.'],['2. Copie la feuille « Trame » de ce classeur dans le classeur du fournisseur (ou colle l\'en-tête copié depuis le logiciel dans une feuille vide nommée « Trame »).'],['3. Ouvre Claude dans Excel et colle la consigne ci-dessous : il remplit la Trame à partir du tableau du fournisseur.'],['   (Depuis le 13/10 le logiciel lit aussi directement la plupart des fichiers fournisseurs, Excel ou PDF : la trame sert quand la lecture automatique rate des lignes.)'],['4. Vérifie d\'un coup d\'œil (types, DN, quantités), copie la Trame remplie EN-TÊTE COMPRIS et colle-la dans le logiciel : Fourniture → Importer une commande → Coller, ou Stock → Nouvelle livraison → Trame, ou Commerce → une affaire → 2 · Lecture → Quantités → Importer une étude fournisseur. Tu peux aussi importer directement le fichier .xlsx : la Trame est trouvée sur n\'importe quelle feuille.'],['5. Le logiciel lit chaque colonne telle quelle ; une ligne mal remplie est affichée avec son numéro et la raison — rien n\'entre sans ta validation.'],[''],['Consigne à coller dans Claude pour Excel'],[trameConsigne()]];
  const listes=[['Type de pièce','Ce que ça couvre']].concat([['Barre','tube, longueur droite (barre de 6, 12 ou 16 m)'],['Coude','coude pré-isolé (angle en °)'],['Té','té, piquage, dérivation (DN 2 = DN du piquage)'],['Réduction','réduction, cône pré-isolé (DN 2 = petit DN)'],['Réduction dans manchon','réduction ACIER soudée dans un manchon réduit (kit réduit, Reduktion St) : 2 soudures pour 1 manchon'],['Vanne','vanne, robinet à souder'],['Kit fin de ligne','kit FDL, embout'],['Manchon','manchon de jonction (thermorétractable, électrosoudable)'],['Manchon fin de ligne','manchon d\'extrémité'],['Mousse PU','mousse PU A+B, PUR (une dose par manchon)'],['Courbe acier','courbe acier nue'],['By-pass','by-pass'],['DHEC','joint d\'extrémité (DHEC)'],['Passage de mur','passage de mur, traversée'],['Accessoire','tout le reste : bande, grillage, outillage…']]).concat([[],['DN (acier)',TRAME_DNS.join(' · ')],['Unité','u = pièces · ml = mètres linéaires (barres au mètre)']]);
  const sheets=[{name:'Trame',rows:body,widths:W,head,lists},{name:'Consigne',rows:steps,widths:[120],wrap:true},{name:'Exemple',rows:[TRAME_COLS.slice()].concat(EXEMPLE),widths:W,head:1},{name:'Listes',rows:listes,widths:[22,70],head:1}];
  return makeXlsx(sheets);}
/* ── navigateur ── */
export async function copyText(t){try{if(typeof navigator!=='undefined'&&navigator.clipboard&&(typeof window==='undefined'||window.isSecureContext)){await navigator.clipboard.writeText(t);return true;}}catch(e){}
  try{const ta=document.createElement('textarea');ta.value=t;ta.setAttribute('readonly','');ta.style.cssText='position:fixed;left:-9999px;top:0';document.body.appendChild(ta);ta.select();const ok=document.execCommand('copy');ta.remove();return !!ok;}catch(e){return false;}}
export function dlBytes(name,u8,mime){const b=new Blob([u8],{type:mime||'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'});const u=URL.createObjectURL(b);const a=document.createElement('a');a.href=u;a.download=name;document.body.appendChild(a);a.click();a.remove();setTimeout(()=>URL.revokeObjectURL(u),3000);}
/* bloc « Trame type » des fenêtres d'import (Fourniture et Stock) + câblage */
export function trameBoxHTML(where){return `<details class="trame-box" ${where==='open'?'open':''} style="margin:6px 0;border:1.5px dashed #c9a227;border-radius:10px;padding:6px 8px;background:#fffbea"><summary style="cursor:pointer;font-size:12.5px;font-weight:800">📋 Trame type SCR — l'import sans erreur</summary>
  <div style="font-size:12px;line-height:1.45;margin-top:4px">1 · <b>Copie la trame</b> (ou télécharge-la en Excel) et colle-la à côté du tableau du fournisseur · 2 · <b>Claude dans Excel</b> la remplit avec la consigne · 3 · copie la trame remplie <b>en-tête compris</b> et colle-la ici (ou importe le fichier).</div>
  <div class="eq-acts" style="margin-top:6px;flex-wrap:wrap"><button class="btn sm" type="button" data-trame="copy">📋 Copier la trame</button><button class="btn sm" type="button" data-trame="xlsx">⬇ Trame Excel</button><button class="btn sm" type="button" data-trame="claude">✨ Copier la consigne Claude Excel</button></div>
  <div class="dim" style="font-size:11px;margin-top:4px">Colonnes : ${TRAME_COLS.join(' · ')}</div></details>`;}
export function wireTrameBox(root,toast){if(!root)return;root.querySelectorAll('[data-trame]').forEach(b=>b.onclick=async e=>{e.preventDefault();const k=b.dataset.trame;
  if(k==='copy'){const ok=await copyText(trameHeaderTSV());toast&&toast(ok?'📋 Trame copiée : colle-la dans Excel (une ligne d\'en-tête)':'Copie impossible ici : télécharge la trame Excel');}
  else if(k==='claude'){const ok=await copyText(trameConsigne());toast&&toast(ok?'✨ Consigne copiée : colle-la dans Claude pour Excel':'Copie impossible ici : la consigne est dans la trame Excel (feuille Consigne)');}
  else if(k==='xlsx'){try{dlBytes('Trame import SCR - commande et BL.xlsx',await trameXlsx());toast&&toast('⬇ Trame Excel prête');}catch(err){toast&&toast('Trame Excel impossible ici : '+(err.message||err));}}});}
