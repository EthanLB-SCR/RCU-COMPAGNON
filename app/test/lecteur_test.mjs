// LECTEUR AUTOMATIQUE DE QUANTITATIF / DEVIS / COMMANDE / BL (src/lecteur.js) + synthèse (src/qcalc.js) — 13/10/2026 soir. node test/lecteur_test.mjs
// Ethan : « je pose n'importe quel quantitatif sans l'étape manuelle (Excel + Claude) et ça importe toutes les pièces ». Réglé sur ses vrais documents (INPAL / isoplus,
// LOGSTOR, AXIOM, Renalia, BRUGG — gardés hors du dépôt) ; ICI : des copies FICTIVES qui reprennent la forme de chaque fournisseur (codes, prix, chantiers inventés).
import {lireRows,lireClasseur,lirePdf,pdfRows,lireTexte,dims,codeDims,numFr,lectureResume,fournisseurOf} from '../src/lecteur.js';
import {qsynth} from '../src/qcalc.js';
import {parseTrame,TRAME_COLS,trameConsigne,kindOfType,typeOfKind} from '../src/trame.js';
const C={};const eq=(a,b)=>JSON.stringify(a)===JSON.stringify(b);const log=(k,v)=>console.log(k,JSON.stringify(v));
const find=(R,f)=>R.lines.filter(f);const one=(R,f)=>{const x=find(R,f);return x.length===1?x[0]:null;};
const row=(Y,dn)=>Y.rows.find(r=>r.dn===dn)||{};
// pages pdf.js simulées : une ligne = [[x, texte], …], 12 pt d'interligne, police 8 pt (≈ 4,2 pt par caractère)
const page=lines=>({items:lines.flatMap((L,i)=>L.map(([x,s])=>({x,y:780-i*12,w:String(s).length*4.2,h:8,s:String(s)})))});

// ── 1) devis « INPAL » (PDF) : sections DN, kits de jonction + manchettes, kit réduit, kit fin de ligne, té à saut, XX>45°, options, totaux, CGV ──
const P1=[page([
  [[38,'Code Art.'],[199,'DESIGNATION'],[400,'QUANTITE'],[442,'UNITAIRE'],[521,'TOTAL']],
  [[176,'POLYURETUB 130'],[402,'1']],
  [[90,'DN80 - Ø88,9x180 Isolation+'],[397,'120'],[416,'m'],[533,'9 999,00 €']],
  [[30,'91000001'],[90,'TUBE ACIER 88,9x180 - 12m - DF Nord.'],[397,'96'],[416,'m'],[462,'10,00 €'],[541,'960,00 €']],
  [[30,'91000002'],[90,'COUDE ACIER 5D 88,9x180 - 90° DH Nord.'],[397,'6'],[416,'P.'],[462,'10,00 €'],[541,'60,00 €']],
  [[30,'91000003'],[90,'COUDE ACIER 3D 88,9x180 - XX>45° - DF Nord.'],[397,'2'],[416,'P.']],
  [[30,'91000004'],[90,'TE A SAUT 88,9/180 x 42,4/125 x 88,9/180 - DF Nord.'],[397,'2'],[416,'P.']],
  [[30,'91000005'],[90,'VANNE PASSAGE INTEGRAL 88,9x180 - DF Nord.'],[397,'2'],[416,'P.']],
  [[30,'91000006'],[90,'I3 : KIT DE JONCTION (Produits) 88,9 x 180'],[397,'14'],[416,'P.']],
  [[30,'91000007'],[90,'I2/ I3: MANCHETTE PEHD THERMO ø 180'],[397,'14'],[416,'P.']],
  [[30,'91000008'],[90,'I6 : KIT REDUIT (Produits) 88,9x180 / 60,3x140'],[397,'2'],[416,'P.']],
  [[30,'91000009'],[90,'I6 : MANCHETTE REDUIT THERMO ø 180x140'],[397,'2'],[416,'P.']],
  [[30,'91000010'],[90,'I5 : KIT FIN DE LIGNE (Produits) 88,9 x 180'],[397,'2'],[416,'P.']],
  [[30,'91000011'],[90,'I5 : MANCHETTE PEHD ø 180'],[397,'2'],[416,'P.']],
  [[30,'91000012'],[90,'DHEC ø 88,9 x 180'],[397,'2'],[416,'P.']],
  [[30,'91000013'],[90,'PASSAGE DE CLOISON'],[230,'ø 180'],[397,'2'],[416,'P.']],
  [[30,'91000014'],[90,'COUSSIN DILATATION ø180->ø280mm'],[397,'40'],[416,'P.']],
  [[90,'Purge piq DN32'],[397,'0'],[416,'m'],[533,'1 000,00 €']],
  [[30,'91000015'],[90,'TUBE ACIER 42,4x125 - 6m -DF Nord.'],[397,'12'],[416,'m']],
  [[30,'91000016'],[90,'I3 : KIT DE JONCTION (Produits) 42,4 x 125'],[397,'4'],[416,'P.']],
  [[30,'91000017'],[90,'I2/ I3: MANCHETTE PEHD THERMO ø 125'],[397,'4'],[416,'P.']],
  [[90,'SOUS-TOTAL Conduite Polyuretub'],[397,'120'],[416,'m'],[533,'9 999,00 €']],
  [[90,'LIVRAISON SUR CHANTIER HORS TAXES (HT) - NON DECHARGE :'],[397,'1'],[416,'Cam.'],[533,'500,00 €']],
  [[90,'TVA :'],[397,'20'],[416,'%'],[533,'1 999,80 €']],
  [[90,'OPTION - CALES et Grillage'],[442,'UNITAIRE'],[521,'TOTAL']],
  [[30,'91000018'],[90,'CÂLE DE MOUSSE PU 100X100X1000 JAUNE'],[397,'9'],[416,'P.']],
  [[30,'91000019'],[90,'GRILLAGE AVERTISSEUR 100m'],[397,'1'],[416,'P.']]]),
  page([[[90,'CONDITIONS GENERALES DE VENTE']],[[30,'1.1'],[90,'Le vendeur livre les tubes'],[330,'1.1']],[[30,'2'],[90,'Tube acier livré en barres'],[330,'3']]])];
const R1=lirePdf(P1);const Y1=qsynth(R1.lines);
log('1) INPAL (PDF)',{resume:lectureResume(R1),four:R1.meta.fournisseur,syn:Y1.rows.map(r=>[r.dn,r.barres,r.soud,r.src,r.coudes,r.tes,r.piq,r.red,r.vannes,r.kits,r.dhec,r.murs]),options:R1.options.map(o=>o.des),ignored:R1.ignored.map(o=>o.why)});
const tube80=one(R1,l=>l.kind==='pipe'&&l.dn===80),b60=one(R1,l=>l.kind==='bend'&&l.angle===60),tee=one(R1,l=>l.kind==='tee'),red=one(R1,l=>l.kind==='reducer'),sRed=one(R1,l=>l.kind==='sleeve'&&/REDUIT/.test(l.des)),wall=one(R1,l=>l.kind==='wall'),kit=one(R1,l=>l.kind==='kit'),t32=one(R1,l=>l.kind==='pipe'&&l.dn===32);
C.c1=R1.meta.fournisseur==='INPAL'&&R1.lines.length===17&&R1.unknown.length===0&&R1.options.length===2&&R1.options.every(o=>o.kind==='acc')
  &&tube80&&tube80.ml===96&&tube80.qty===8&&tube80.len===12&&b60&&b60.qty===2&&/variable/.test(b60.note)&&find(R1,l=>l.kind==='bend'&&l.angle===90&&l.qty===6).length===1
  &&tee&&tee.dn===80&&tee.dn2===32&&red&&red.joint&&red.dn===80&&red.dn2===50&&sRed&&sRed.dn===80&&sRed.dn2===50&&wall&&wall.dn===80&&kit&&kit.dn===80
  &&one(R1,l=>l.kind==='acc'&&/I5 : MANCHETTE/.test(l.des))&&one(R1,l=>l.kind==='pu'&&l.dn===80&&l.qty===14)&&t32&&t32.len===6&&t32.qty===2
  &&R1.ignored.some(x=>x.why==='total')&&R1.ignored.some(x=>x.why==='transport')&&!R1.lines.some(l=>/vendeur|livré en barres/i.test(l.des))
  &&row(Y1,80).soud===16&&row(Y1,80).src==='manchons'&&row(Y1,80).red===2&&row(Y1,80).kits===2&&row(Y1,80).dhec===2&&row(Y1,80).murs===2&&row(Y1,50).soud===2&&row(Y1,32).soud===4&&row(Y1,32).piq===2;

// ── 2) quantitatif « LOGSTOR » (Excel converti d'un PDF) : familles, n° de ligne, colonne « NOR », séries, manchon EW complet, jonction réduite, coiffe en plage ──
const H2=['Ligne','','Description','','','','','','','N° d\'article / N° de plan','','','','','','','Alarme','','Qté','Pièce','','Prix unitaire','','Prix total EUR'];
const L2=(pos,des,code,alarm,qty,unit,qCol)=>{const r=Array(24).fill('');r[0]=pos;r[2]=des;r[9]=code;r[16]=alarm;r[qCol||18]=qty;r[19]=unit;r[21]='9.99';r[23]='99.9';return r;};
const cat=t=>{const r=Array(24).fill('');r[2]=t;return r;};
const rows2=[['Offre'],['20991234','','','','','Montant Matériel','','','','','','','','999999.99'],H2,cat('Montage'),L2(10,'SERIE 2 TRADI','90799999999941','',1,'PCS'),cat('Tube'),
  L2(20,'114 / 225 mm 12 m','90000114112651','NOR',20,'TUB'),cat('Matériaux tube porteur: P235GH EN10217, soudé'),L2(30,'88 / 180 mm 12 m','90000088112651','NOR',10,'TUB'),
  cat('Coude'),L2(70,'114 / 225 mm 50 DEG 1.000 x 1.000 mm Horizontal','2500E','NOR',2,'PCS'),L2(80,'114 / 225 mm 90 DEG 1.000 x 1.000 mm Horizontal','95000114010651','NOR',8,'PCS'),
  cat('Té droit'),L2(360,'114/225x60/140x114/225mm 1.200x600mm -','94170114003651','NOR',2,'PCS'),cat('Pièce-T 45°'),L2(420,'114/225 x76/160x114/225 mm 1.200 x 753 mm','95210114003651','NOR',2,'PCS'),
  cat('Vannes d\'isolement full flow'),L2(470,'114 / 225 mm 25 Bar 545 mm 1.500 mm','92000114004651','NOR',2,'PCS'),cat('Réduction'),L2(520,'114 / 225 x 88 / 180 mm 1.000 mm','99010114002651','NOR',2,'PCS'),
  cat('Manchon EW - Complèt: Prix total par EUR 65,11 (Po'),L2(570,'EWJoint D225 L=700','90270225070000','',40,'PCS'),L2(580,'Bande à souder p. Manchon EW 225','95560225000000','',40,'PCS'),L2(590,'Pochette de mousse n° 9','9000000108109','',40,'PCS'),
  cat('Manchon EW - Complèt: Prix total par EUR 228,42 (P'),L2(1420,'EWJoint, réd. à souder D225/140 L=800','90280225140000','',2,'PCS'),L2(1430,'Bande à souder p. Manchon EW 140','95560140000000','',1,'PCS'),
  L2(1450,'114,3×60,3 Reduktion St. 35.8I','90060114010060','',2,'PCS'),L2(1460,'Pochette de mousse n° 8','9000000108108','',2,'PCS'),
  cat('Coiffe thermorétractable'),L2(760,'60-98 / 160-186 mm / DHEC 2500','96002500000000','',4,'PCS',16),cat('Joint Labyrinthe'),L2(800,'225 mm Manchette de pénétration','98000225000000','',3,'PCS',16),
  L2(830,'Accessoires Rouleau de papier crepe thermo résista','90000000026000','',6,'ROL',16),(()=>{const r=L2(850,'Cosse à sertir NORDIC (100 pc)','90000000002044','',24,'5',16);return r;})(),
  ['1520','','Pochette de mousse n° 7 97000000108107','','','','','','','','','','','','','','','','6','PCS','','12.12','','72.71'],
  cat('Montage'),L2(1720,'Chef de projet','90799999999941','',1,'PCS'),L2(1760,'Transport aller retour','90799999999941','',1,'PCS'),
  ['CLIENT FICTIF','','Page 7 De 9'],['Ligne 70','','Description 2500E 114 / 225 mm 50 DEG 1.000 x 1.00']];
const R2=lireClasseur([{name:'Table 1',rows:rows2}]);const Y2=qsynth(R2.lines);
log('2) LOGSTOR (Excel)',{resume:lectureResume(R2),four:R2.meta.fournisseur,syn:Y2.rows.map(r=>[r.dn,r.barres,r.soud,r.src,r.coudes,r.tes,r.piq,r.red,r.vannes,r.dhec,r.murs]),unknown:R2.unknown.map(u=>u.des)});
const ewR=one(R2,l=>l.kind==='sleeve'&&/réd/.test(l.des)),rst=one(R2,l=>l.kind==='reducer'&&l.joint),coiffe=one(R2,l=>l.kind==='dhec'),lab=one(R2,l=>l.kind==='wall'),cosse=one(R2,l=>/Cosse/.test(l.des)),poch7=one(R2,l=>/n° 7/.test(l.des));
C.c2=R2.meta.fournisseur==='LOGSTOR'&&R2.unknown.length===0&&one(R2,l=>l.kind==='pipe'&&l.dn===100&&l.qty===20&&l.gaine===225)&&one(R2,l=>l.kind==='pipe'&&l.dn===80&&l.qty===10)
  &&one(R2,l=>l.kind==='bend'&&l.angle===50&&l.dn===100)&&one(R2,l=>l.kind==='tee'&&l.dn===100&&l.dn2===50)&&one(R2,l=>l.kind==='tee'&&l.dn===100&&l.dn2===65)&&one(R2,l=>l.kind==='valve'&&l.dn===100)
  &&one(R2,l=>l.kind==='reducer'&&!l.joint&&l.dn===100&&l.dn2===80)&&one(R2,l=>l.kind==='sleeve'&&l.dn===100&&l.qty===40)&&find(R2,l=>l.kind==='acc'&&/Bande/.test(l.des)).length===2
  &&ewR&&ewR.dn===100&&ewR.dn2===50&&rst&&rst.dn===100&&rst.dn2===50&&coiffe&&!coiffe.dn&&lab&&lab.dn===100&&cosse&&cosse.qty===24&&poch7&&poch7.kind==='pu'&&poch7.qty===6&&poch7.ref==='97000000108107'
  &&!R2.lines.some(l=>/Chef de projet|Transport|SERIE/.test(l.des))&&row(Y2,100).soud===42&&row(Y2,50).soud===2&&row(Y2,100).dhec===0&&row(Y2,100).murs===3;

// ── 3) quantitatif « AXIOM » : une feuille par DN, une colonne par tronçon, colonne TOTAL ; la feuille « trame » remplie par Claude et son compte rendu sont laissés de côté ──
const ax=(name,lines)=>({name,rows:[[],['','PIECE/TRONCON','Tronçon A','Tronçon B','TOTAL']].concat(lines.map(([c,a,b])=>['',c,a,b,(+a||0)+(+b||0)]))});
const S3=[ax('DN200',[['LONGUEUR TRANCHEE',100,50],['R-200/355-12',9,4],['K-200-355/90',4,2],['K-200-355/75',2,''],['TW-200-355/80-180',1,1],['Z-200-355/150-280',2,''],['NT-200/355',20,10],['NK-200/355',2,''],['E-125',2,2],['TP-200-355/40-125',2,2],['STYRODUR',10,5],['MAT',20,10],['157200/EL-2-DP',1,1],['PRIX TOTAL',0,0]]),
  ax('DN80',[['LONGUEUR TRANCHEE',30,''],['R-80/180-12',5,''],['K-80-180/30',2,''],['NT-80/180',12,''],['P-180',2,''],['E-180',2,''],['ZKODPI-80/180',2,''],['ETAIS',6,'']]),
  {name:'Feuil1',rows:[TRAME_COLS,['Barre',200,'','',12,13,'u']]},{name:'Feuil2',rows:[['Retour Claude : j\'ai rempli la trame']]}];
const R3=lireClasseur(S3);const Y3=qsynth(R3.lines);
log('3) AXIOM (tronçons, TOTAL)',{resume:lectureResume(R3),mode:R3.mode,four:R3.meta.fournisseur,tranchee:R3.meta.tranchee,feuilles:R3.meta.feuilles,syn:Y3.rows.map(r=>[r.dn,r.barres,r.soud,r.coudes,r.tes,r.piq,r.red,r.vannes,r.kits,r.dhec,r.murs])});
C.c3=R3.meta.fournisseur==='AXIOM'&&/TOTAL/.test(R3.mode)&&eq(R3.meta.feuilles,['DN200','DN80'])&&R3.meta.tranchee[200]===150&&R3.meta.tranchee[80]===30
  &&one(R3,l=>l.kind==='pipe'&&l.dn===200&&l.qty===13&&l.len===12&&l.gaine===355)&&one(R3,l=>l.kind==='bend'&&l.dn===200&&l.angle===75&&l.qty===2)&&one(R3,l=>l.kind==='tee'&&l.dn===200&&l.dn2===80&&l.qty===2)
  &&one(R3,l=>l.kind==='reducer'&&l.dn===200&&l.dn2===150)&&one(R3,l=>l.kind==='sleeveEnd'&&l.dn===200)&&one(R3,l=>l.kind==='dhec'&&l.dn===40&&l.qty===4)&&one(R3,l=>l.kind==='tee'&&l.dn2===40&&l.qty===4)
  &&one(R3,l=>l.kind==='valve'&&l.dn===80)&&one(R3,l=>l.kind==='wall'&&l.dn===80)&&one(R3,l=>l.kind==='bend'&&l.dn===80&&l.angle===30)&&find(R3,l=>l.kind==='acc').length===4
  &&!R3.lines.some(l=>/PRIX|LONGUEUR/.test(l.des))&&row(Y3,200).soud===30&&row(Y3,200).kits===2&&row(Y3,80).soud===12&&row(Y3,40).piq===4;

// ── 4) « Renalia / ZPU » : en-têtes « Point 0 au Point 1 DN 200/355 », codes Z2…, angles réels, té égal, insert GKD ──
const R4=lireClasseur([{name:'Détail matériel',rows:[['Code','Désignation','Qté','','Qté','','Long.','ml'],['','Point 0 au Point 1 DN 200/355'],
  ['Z2T20012','Tube acier préisolé DN 200/355 ISOL.2 12 m',10,1,10,'',12,120],['Z2C20055','Coude 55° en acier préisolé DN 200/355 ISOL.2',2,1,2],['Z2TS6565','Té à saut en acier préisolé DN 65-160/65-160 ISOL.2',2,1,2],
  ['Z2V65','Vanne à souder préisolée DN 65/160',2,1,2],['Z2J200','Kit joint DN 200/355',30,1,30],['Z2ET65','Embout terminal DN 65/160',2,1,2],['1410030013','Insért d\'étanchéité modulaire GKD 300 EPDM tube Ø160mm 13 modules',2,1,2],['','Total',0]]}]);
const Y4=qsynth(R4.lines);log('4) Renalia',{resume:lectureResume(R4),four:R4.meta.fournisseur,lines:R4.lines.map(l=>[l.kind,l.dn,l.dn2||'',l.angle||'',l.len||'',l.qty])});
C.c4=R4.meta.fournisseur==='Renalia / ZPU'&&R4.lines.length===7&&one(R4,l=>l.kind==='pipe'&&l.dn===200&&l.len===12&&l.qty===10)&&one(R4,l=>l.kind==='bend'&&l.angle===55)
  &&one(R4,l=>l.kind==='tee'&&l.dn===65&&l.dn2===65)&&one(R4,l=>l.kind==='kit'&&l.dn===65)&&one(R4,l=>l.kind==='wall'&&l.dn===65)&&row(Y4,200).soud===30;

// ── 5) « BRUGG » (PDF) : une pièce, transport, pied de page, total — et 6) tableau collé depuis Excel (désignation + quantité, sans code) ──
const R5=lirePdf([page([[[40,'Pos.'],[80,'Référence'],[160,'Désignation'],[400,'Qté'],[430,'unité'],[470,'P.U H.T']],[[40,'5'],[80,'1079151'],[160,'Raccord a compression Ø110x10 / a souder Ø114x3.6'],[400,'4,00'],[430,'Pièce'],[470,'202,14']],
  [[40,'8'],[80,'ZPORT'],[160,'Frais de transport(déchargement à la charge du client)'],[400,'1,00'],[430,'Unité'],[470,'81,00']],[[400,'Page'],[440,'1']],[[40,'TOTAL OFFRE N°'],[160,'DC000001'],[300,'H.T.'],[400,'889,56']]])]);
const R6=lireTexte('Désignation\tQuantité\tUnité\nTube acier pré-isolé DN 100/200 - 12 m\t24\tu\nCoude 90° DN100\t6\tu\nManchon thermorétractable DN 100\t30\tu\nTé DN 100/50\t2\tu\nKit fin de ligne DN 100\t2\tu\nTransport\t1\tu',{text:false});
log('5-6) BRUGG + collé',{r5:R5.lines.map(l=>[l.kind,l.qty,l.des]),ign5:R5.ignored.map(x=>x.why),r6:R6.lines.map(l=>[l.kind,l.dn,l.dn2||'',l.angle||'',l.qty])});
C.c5=R5.meta.fournisseur===''||R5.meta.fournisseur==='BRUGG';C.c5=C.c5&&R5.lines.length===1&&R5.lines[0].kind==='acc'&&R5.lines[0].qty===4&&R5.ignored.some(x=>x.why==='transport')
  &&R6.lines.length===5&&one(R6,l=>l.kind==='pipe'&&l.dn===100&&l.qty===24)&&one(R6,l=>l.kind==='tee'&&l.dn2===50)&&one(R6,l=>l.kind==='kit'&&l.dn===100)&&row(qsynth(R6.lines),100).soud===30;

// ── 7) synthèse : pièces dans un manchon (réduction, courbe acier, té fait sur place), soudures estimées sans manchon ──
const Y7=qsynth([{kind:'sleeve',dn:100,qty:10},{kind:'reducer',dn:100,dn2:65,qty:2,joint:true},{kind:'steelbend',dn:100,angle:30,qty:1},{kind:'tee',dn:300,dn2:100,qty:2,joint:true},{kind:'reducerJ',dn:65,dn2:40,qty:1},{kind:'pipe',dn:40,qty:1},{kind:'dhec',dn:65,qty:2},{kind:'wall',dn:65,qty:1}]);
log('7) qsynth',Y7.rows.map(r=>[r.dn,r.soud,r.src,r.jw,r.piq,r.red,r.dhec,r.murs]));
C.c7=row(Y7,100).soud===10+1+2&&row(Y7,100).src==='manchons'&&row(Y7,300).soud===0&&row(Y7,300).tes===2&&row(Y7,65).soud===2&&row(Y7,65).dhec===2&&row(Y7,65).murs===1&&row(Y7,40).soud===2&&Y7.tot.red===3;

// ── 8) petits lecteurs : nombres, dimensions, codes ; trame : « Réduction dans manchon » ; consigne Claude ──
const d8=[dims('TUBE ACIER 60,3x140 - 12m'),dims('114 / 225 mm 50 DEG'),dims('EWJoint, réd. à souder D250/180'),dims('60-98 / 160-186 mm / DHEC'),dims('I8 : KIT TE A SAUT 500 x 140 x 500'),dims('COUDE PREISOLE ACIER 90D')];
const T8=parseTrame([TRAME_COLS,['Réduction dans manchon',100,65,'','',2,'u'],['Coude',80,'',75,'',2,'u']]);
log('8) lecteurs',{num:[numFr('1 234,50'),numFr('4.321,09'),numFr('12345.67'),numFr('4,00')],d:d8.map(d=>[d.pairs.map(p=>p.dn+'/'+(p.casing||p.dn2||'')),d.casing,d.angle,d.len,d.range]),code:[codeDims('R-400/630-12'),codeDims('K-80-180/75'),codeDims('TW-400-630/200-355'),codeDims('E-125')],trame:T8.lines});
C.c8=eq([numFr('1 234,50'),numFr('4.321,09'),numFr('12345.67'),numFr('4,00')],[1234.5,4321.09,12345.67,4])&&d8[0].pairs[0].dn===50&&d8[0].pairs[0].casing===140&&d8[0].len===12&&d8[1].angle===50&&d8[1].pairs[0].dn===100
  &&eq(d8[2].casing,[250,180])&&d8[3].range&&eq(d8[4].casing,[500,140])&&d8[5].angle===90&&codeDims('R-400/630-12').len===12&&codeDims('K-80-180/75').angle===75&&codeDims('TW-400-630/200-355').dn2===200&&codeDims('E-125').casing===125
  &&T8.lines[0].kind==='reducer'&&T8.lines[0].joint===true&&T8.lines[0].dn2===65&&typeOfKind('reducer',true)==='Réduction dans manchon'&&kindOfType('kit réduit')==='reducerJ'
  &&/TOTAL/.test(trameConsigne())&&/Réduction dans manchon/.test(trameConsigne())&&/XX>45/.test(trameConsigne())&&fournisseurOf('Offre LOGSTOR EWJoint')==='LOGSTOR';
const bad=Object.entries(C).filter(([k,v])=>!v).map(([k])=>k);console.log(bad.length?'RESULTAT: ECHEC '+bad.join(','):'RESULTAT: TOUT VERT');
