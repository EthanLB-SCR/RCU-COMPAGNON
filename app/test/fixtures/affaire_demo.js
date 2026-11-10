/* Tracé Affaire — maquette. Données FICTIVES (noms, montants, taux) : aucune donnée réelle SCR. */
(function () {
  var D = {
    aujourdhui: '2026-11-10',
    moisFacturation: '2026-10',
    mois: ['2026-09', '2026-10', '2026-11'],
    agences: [{ id: 'ouest', nom: 'Ouest' }, { id: 'est', nom: 'Est' }],

    /* Qui regarde la maquette (les droits changent ce qu'on voit). */
    personas: [
      { id: 'dir', nom: 'Direction · resp. d\'agence', role: 'direction' },
      { id: 'paul', nom: 'Paul R. · chargé d\'affaires', role: 'ca' },
      { id: 'sophie', nom: 'Sophie M. · conductrice', role: 'cond' },
      { id: 'nadia', nom: 'Nadia T. · facturation', role: 'fact' },
      { id: 'antoine', nom: 'Antoine P. · chef de chantier', role: 'chef' }
    ],

    postes: [
      { id: 'soudeur', nom: 'Soudeur' },
      { id: 'tuyauteur', nom: 'Tuyauteur' },
      { id: 'manchonneur', nom: 'Manchonneur' },
      { id: 'chauffeur', nom: 'Chauffeur d\'engin' },
      { id: 'opespe', nom: 'Opération spécifique' },
      { id: 'chef', nom: 'Chef de chantier' },
      { id: 'conducteur', nom: 'Conducteur de travaux', nonValorise: true }
    ],

    /* Grilles de taux datées (valeurs de démonstration). Coût complet = part poste + FG chantier + FG structure + sinistre. */
    grilles: [
      { effet: '2025-01-01', fgch: 5, fgst: 24, sin: 2, part: { soudeur: 58, tuyauteur: 46, manchonneur: 40, chauffeur: 42, opespe: 50, chef: 50 } },
      { effet: '2026-01-01', fgch: 5, fgst: 25, sin: 2, part: { soudeur: 60, tuyauteur: 48, manchonneur: 42, chauffeur: 44, opespe: 52, chef: 52 } }
    ],

    personnes: [
      { id: 'karim', nom: 'Karim B.', poste: 'soudeur', agence: 'ouest' },
      { id: 'thomas', nom: 'Thomas G.', poste: 'soudeur', agence: 'ouest' },
      { id: 'nico', nom: 'Nicolas V.', poste: 'soudeur', agence: 'ouest' },
      { id: 'lucas', nom: 'Lucas M.', poste: 'tuyauteur', agence: 'ouest', appr: { poste: 'soudeur', debut: '2026-09-01', fin: '2026-12-31' } },
      { id: 'yanis', nom: 'Yanis L.', poste: 'tuyauteur', agence: 'ouest' },
      { id: 'samir', nom: 'Samir K.', poste: 'tuyauteur', agence: 'ouest' },
      { id: 'kevin', nom: 'Kévin S.', poste: 'tuyauteur', agence: 'ouest', interim: true },
      { id: 'julien', nom: 'Julien T.', poste: 'manchonneur', agence: 'ouest' },
      { id: 'hugo', nom: 'Hugo R.', poste: 'manchonneur', agence: 'ouest' },
      { id: 'dylan', nom: 'Dylan C.', poste: 'manchonneur', agence: 'ouest' },
      { id: 'marc', nom: 'Marc D.', poste: 'chauffeur', agence: 'ouest' },
      { id: 'remi', nom: 'Rémi F.', poste: 'opespe', agence: 'ouest' },
      { id: 'antoine', nom: 'Antoine P.', poste: 'chef', agence: 'ouest' },
      { id: 'sophie', nom: 'Sophie M.', poste: 'conducteur', agence: 'ouest' },
      { id: 'bruno', nom: 'Bruno E.', poste: 'soudeur', agence: 'est' }
    ],

    /* type : marche | regie | sav | depot | sinistre. Avancement = ce que Tracé Chantier compte (soudures faites / prévues). */
    affaires: [
      { code: 'O2603-12', nom: 'Réseau Démo Nord · lot 2', client: 'Syndicat Démo', type: 'marche', agence: 'ouest', ca: 'paul', cond: 'sophie', statut: 'en_cours',
        pctAcompte: 10, pctRG: 5, caution: false, avenants: 12000, lots: [{ id: 'L', nom: 'Lot unique', marche: 480000 }],
        avancement: { fait: 1380, total: 1650 }, envoi: { mode: 'Plateforme client', dest: 'factures@syndicat-demo.example', cedee: false } },
      { code: 'O2511-13', nom: 'Ville-Démo 2026', client: 'CLIENT DÉMO', type: 'marche', agence: 'ouest', ca: 'paul', cond: 'sophie', statut: 'en_cours',
        pctAcompte: 0, pctRG: 5, caution: true, avenants: 0,
        lots: [{ id: 'L1', nom: 'Lot 1', marche: 120000 }, { id: 'L2', nom: 'Lot 2', marche: 95000 }, { id: 'L3', nom: 'Lot 3', marche: 90000 }, { id: 'L4', nom: 'Lot 4', marche: 160000 }],
        avancement: { fait: 1120, total: 1900 }, envoi: { mode: 'Mail', dest: 'compta@client-demo.example', cedee: true } },
      { code: 'O2606-04', nom: 'Quartier Démo Sud', client: 'Énergie Démo', type: 'marche', agence: 'ouest', ca: 'paul', cond: 'sophie', statut: 'en_cours',
        pctAcompte: 20, pctRG: 20, caution: false, avenants: 0, lots: [{ id: 'L', nom: 'Lot unique', marche: 260000 }],
        avancement: { fait: 410, total: 640 }, envoi: { mode: 'Chorus', dest: 'Chorus Pro', cedee: false } },
      { code: 'O2608-03', nom: 'Fuite Démo-sur-Loire', client: 'Chaleur Démo', type: 'regie', agence: 'ouest', ca: 'paul', cond: 'sophie', statut: 'en_cours',
        pctAcompte: 0, pctRG: 0, caution: false, avenants: 0, lots: [{ id: 'L', nom: 'Régie', marche: 6500 }],
        avancement: null, envoi: { mode: 'Mail', dest: 'exploitation@chaleur-demo.example', cedee: false } },
      { code: 'O2412-05', nom: 'Château-Démo', client: 'Syndicat Démo', type: 'marche', agence: 'ouest', ca: 'paul', cond: 'sophie', statut: 'en_cours', travauxFinis: '2026-03-15',
        pctAcompte: 0, pctRG: 5, caution: false, avenants: 0, lots: [{ id: 'L', nom: 'Lot unique', marche: 300000 }],
        avancement: { fait: 960, total: 960 }, envoi: { mode: 'Mail', dest: 'factures@syndicat-demo.example', cedee: false } },
      { code: 'O2405-02', nom: 'Port-Démo 2024', client: 'Énergie Démo', type: 'marche', agence: 'ouest', ca: 'paul', cond: 'sophie', statut: 'termine', travauxFinis: '2025-05-20', termineLe: '2026-06-02',
        pctAcompte: 0, pctRG: 5, caution: false, avenants: 0, lots: [{ id: 'L', nom: 'Lot unique', marche: 150000 }],
        avancement: { fait: 520, total: 520 }, envoi: { mode: 'Chorus', dest: 'Chorus Pro', cedee: false } },
      { code: 'E2609-07', nom: 'Ville-Démo Est', client: 'Réseau Démo Est', type: 'marche', agence: 'est', ca: 'paul', cond: 'sophie', statut: 'en_cours',
        pctAcompte: 0, pctRG: 5, caution: false, avenants: 0, lots: [{ id: 'L', nom: 'Lot unique', marche: 200000 }],
        avancement: { fait: 150, total: 900 }, envoi: { mode: 'Mail', dest: 'factures@reseau-demo-est.example', cedee: false } },
      { code: 'SAV-OUEST', nom: 'SAV / garantie Ouest', client: '—', type: 'sav', agence: 'ouest', ca: 'paul', cond: 'sophie', statut: 'en_cours', lots: [{ id: 'L', nom: '—', marche: 0 }] },
      { code: 'DEP-OUEST', nom: 'Dépôt / atelier Ouest', client: '—', type: 'depot', agence: 'ouest', ca: 'paul', cond: 'sophie', statut: 'en_cours', lots: [{ id: 'L', nom: '—', marche: 0 }] },
      { code: 'SIN-2610-01', nom: 'Sinistre · conduite écrasée au dépôt', client: '—', type: 'sinistre', agence: 'ouest', ca: 'paul', cond: 'sophie', statut: 'en_cours', lots: [{ id: 'L', nom: '—', marche: 0 }] }
    ],

    /* Ce qui existait avant l'appli : repris au 31/08/2026 (heures et débours cumulés). Les factures, elles, sont reprises une par une. */
    soldesOuverture: {
      'O2603-12': { date: '2026-08-31', debours: 128000, heures: 1760 },
      'O2511-13': { date: '2026-08-31', debours: 160000, heures: 2100 },
      'O2606-04': { date: '2026-08-31', debours: 30000, heures: 380 },
      'O2412-05': { date: '2026-08-31', debours: 262000, heures: 3350 },
      'O2405-02': { date: '2026-08-31', debours: 128000, heures: 1640 }
    },

    natures: [
      { id: 'st', nom: 'Sous-traitance et contrôles', compte: '604', fg: false },
      { id: 'tubes', nom: 'Tubes et accessoires', compte: '602260', fg: false },
      { id: 'pm', nom: 'Petit matériel chantier', compte: '606310', fg: false, aide: 'vannes nues, pièces…' },
      { id: 'loc', nom: 'Location matériel / engins', compte: '6135', fg: false },
      { id: 'cont', nom: 'Conteneurs, bennes, bungalows loués', compte: '613509', fg: false },
      { id: 'frais', nom: 'Frais (péage, hôtel, repas…)', compte: '625', fg: false },
      { id: 'divers', nom: 'Divers', compte: '—', fg: false },
      { id: 'conso', nom: 'Consommables (baguettes, disques…)', compte: '606310', fg: true },
      { id: 'carbu', nom: 'Carburants (fioul, GNR, gazole)', compte: '602210', fg: true },
      { id: 'gaz', nom: 'Gaz (Linde / Air Liquide)', compte: '602220', fg: true },
      { id: 'dechets', nom: 'Déchets', compte: '611100', fg: true }
    ],

    equipements: [
      { id: 'PEC-1', nom: 'Machine de prise en charge n° 1', type: 'Prise en charge', tauxJour: 120 },
      { id: 'PEC-2', nom: 'Machine de prise en charge n° 2', type: 'Prise en charge', tauxJour: 120 },
      { id: 'EXT-1', nom: 'Extrudeuse', type: 'Extrudeuse', tauxJour: 90 },
      { id: 'CB-1', nom: 'Camion benne', type: 'Camion benne', tauxJour: 180 },
      { id: 'PH-1', nom: 'Pelle hydraulique 8 t', type: 'Pelle hydraulique', tauxJour: 150 },
      { id: 'CT-1', nom: 'Conteneur 20 pieds n° 1', type: 'Conteneur', tauxJour: 15 },
      { id: 'CT-2', nom: 'Conteneur 20 pieds n° 2', type: 'Conteneur', tauxJour: 15 },
      { id: 'CF-1', nom: 'Cuve à fioul 1 000 L', type: 'Cuve à fioul', tauxJour: 10 }
    ],

    etapes: [
      { id: 'env', court: 'Env.', nom: 'Envoi situation' },
      { id: 'valS', court: 'Val. S', nom: 'Validation situation' },
      { id: 'prep', court: 'Prép.', nom: 'Préparation facture' },
      { id: 'valF', court: 'Val. F', nom: 'Validation facture' },
      { id: 'drive', court: 'Drive', nom: 'Enregistrement Drive' },
      { id: 'depot', court: 'Dépôt', nom: 'Dépôt de facture' },
      { id: 'copie', court: 'Copie', nom: 'Envoi copie direction' },
      { id: 'rg', court: 'RG', nom: 'Enregistrement RG' }
    ],
    etapesAvoir: [
      { id: 'av', court: 'Avoir', nom: 'Avoir' },
      { id: 'avPrep', court: 'Prép.', nom: 'Préparation avoir + facture' },
      { id: 'avVal', court: 'Val.', nom: 'Validation avoir + facture' },
      { id: 'avDep', court: 'Dépôt', nom: 'Dépôt avoir + facture' }
    ],
    motifsRien: ['Pas d\'avancement facturable', 'En attente du BDC client', 'Situation refusée, à refaire', 'Facturé le mois prochain', 'Autre'],

    /* Grand-livre : le réel de l'agence, importé chaque mois (montants fictifs). Jamais utilisé pour le débours d'un chantier. */
    grandLivre: {
      '2026-09': { agence: 'ouest', importeLe: '2026-10-08', mo: 104000, encadrement: 16000, fgch: 8300, lignes: 214 }
    },
    grandLivreOctobre: { agence: 'ouest', importeLe: null, mo: 112000, encadrement: 16000, fgch: 9600, lignes: 228 }
  };

  /* Heures pointées, regroupées par personne, chantier et mois (nv = dont non validées). */
  var H = [];
  function h(p, a, m, heures, nv) { H.push({ p: p, a: a, m: m, h: heures, nv: nv || 0 }); }
  ['2026-09', '2026-10'].forEach(function (m, i) {
    var k = i ? 1 : 0.94;
    h('karim', 'O2603-12', m, Math.round((i ? 104 : 140) * 1)); h('yanis', 'O2603-12', m, Math.round(146 * k)); h('julien', 'O2603-12', m, Math.round(142 * k));
    h('marc', 'O2603-12', m, Math.round(120 * k)); h('antoine', 'O2603-12', m, Math.round(140 * k)); h('lucas', 'O2603-12', m, Math.round(138 * k));
    h('thomas', 'O2511-13', m, Math.round(150 * k)); h('kevin', 'O2511-13', m, Math.round(148 * k)); h('hugo', 'O2511-13', m, Math.round(136 * k)); h('remi', 'O2511-13', m, i ? 30 : 42);
    h('nico', 'O2606-04', m, Math.round(150 * k)); h('samir', 'O2606-04', m, Math.round(150 * k)); h('dylan', 'O2606-04', m, Math.round(146 * k));
  });
  h('karim', 'E2609-07', '2026-10', 39); h('bruno', 'E2609-07', '2026-10', 152); h('bruno', 'E2609-07', '2026-09', 120);
  h('remi', 'O2608-03', '2026-10', 24); h('karim', 'O2608-03', '2026-10', 8);
  h('antoine', 'O2412-05', '2026-10', 6); h('hugo', 'SAV-OUEST', '2026-10', 8);
  h('marc', 'DEP-OUEST', '2026-10', 20); h('lucas', 'DEP-OUEST', '2026-10', 12); h('sophie', 'O2603-12', '2026-10', 18);
  h('julien', 'SIN-2610-01', '2026-10', 16);
  [['karim', 'O2603-12', 46, 15], ['yanis', 'O2603-12', 46, 15], ['julien', 'O2603-12', 46, 15], ['lucas', 'O2603-12', 46, 15], ['antoine', 'O2603-12', 40, 8],
   ['thomas', 'O2511-13', 46, 22], ['kevin', 'O2511-13', 46, 22], ['hugo', 'O2511-13', 38, 22], ['nico', 'O2606-04', 46, 8], ['samir', 'O2606-04', 46, 8], ['dylan', 'O2606-04', 46, 8]]
    .forEach(function (x) { h(x[0], x[1], '2026-11', x[2], x[3]); });
  D.heures = H;

  /* Dépenses : bons de commande, notes de frais validées, saisies. imput = chantier | fg (FG de l'agence). */
  var Dp = [], n = 0;
  function dep(a, date, nature, tiers, lib, ht, src, ref, extra) {
    var o = { id: 'D' + (++n), a: a, date: date, nature: nature, tiers: tiers, lib: lib, ht: ht, src: src, ref: ref || '' };
    if (extra) { for (var k in extra) { o[k] = extra[k]; } }
    Dp.push(o);
  }
  ['2026-09', '2026-10'].forEach(function (m) {
    dep('O2603-12', m + '-05', 'loc', 'Loc\'Démo', 'Mini-pelle 2,7 t · mois', 2900, 'bc', 'BC-' + m.slice(5) + '01');
    dep('O2603-12', m + '-05', 'cont', 'Bennes Démo', 'Bungalow de chantier · mois', 380, 'bc', 'BC-' + m.slice(5) + '02');
    dep('O2606-04', m + '-06', 'loc', 'Loc\'Démo', 'Plaque vibrante · mois', 640, 'bc', 'BC-' + m.slice(5) + '03');
    dep('O2511-13', m + '-07', 'loc', 'Loc\'Démo', 'Pelle 12 t sur pneus · mois', 3500, 'bc', 'BC-' + m.slice(5) + '04');
  });
  dep('O2603-12', '2026-09-12', 'tubes', 'Fournisseur Démo A', 'Coudes et tés DN 150 complémentaires', 4300, 'bc', 'BC-0905');
  dep('O2603-12', '2026-09-22', 'st', 'Contrôles Démo', 'Radiographies · 60 soudures', 6800, 'bc', 'BC-0906');
  dep('O2603-12', '2026-10-21', 'st', 'Contrôles Démo', 'Radiographies · 40 soudures', 4200, 'bc', 'BC-1007');
  dep('O2603-12', '2026-10-09', 'pm', 'Fournisseur Démo B', 'Vannes nues DN 80 × 4', 1240, 'bc', 'BC-1008');
  dep('O2603-12', '2026-10-14', 'carbu', 'Pétroles Démo', 'Fioul GNR 1 500 L', 1650, 'bc', 'BC-1009');
  dep('O2603-12', '2026-10-16', 'dechets', 'Bennes Démo', 'Rotation benne déblais', 320, 'bc', 'BC-1010');
  dep('O2603-12', '2026-10-30', 'frais', 'Autoroute', 'Péage', 4.6, 'note', 'NDF Karim B.', { par: 'karim' });
  dep('O2603-12', '2026-10-15', 'frais', 'Hôtel Démo', 'Nuit d\'hôtel', 89, 'note', 'NDF Yanis L.', { par: 'yanis', gd: true });
  dep('O2603-12', '2026-10-17', 'conso', 'Quincaillerie Démo', 'Baguettes et disques', 46, 'note', 'NDF Antoine P.', { par: 'antoine' });
  dep('O2511-13', '2026-09-18', 'tubes', 'Fournisseur Démo A', 'Réductions 100/65', 2000, 'bc', 'BC-0911');
  dep('O2511-13', '2026-10-23', 'st', 'Calorifuge Démo', 'Calorifuge en chaufferie · lot 3', 4100, 'bc', 'BC-1012');
  dep('O2606-04', '2026-09-25', 'st', 'Contrôles Démo', 'Ressuage · 30 soudures', 2400, 'bc', 'BC-0913');
  dep('O2606-04', '2026-10-28', 'divers', 'Signalisation Démo', 'Panneaux de chantier', 260, 'saisie', '', { par: 'sophie' });
  dep('O2608-03', '2026-10-08', 'pm', 'Quincaillerie Démo', 'Manchon de réparation', 63.8, 'note', 'NDF Rémi F.', { par: 'remi' });
  dep('SIN-2610-01', '2026-10-27', 'st', 'Réseau Démo Services', 'Réparation conduite gaz écrasée', 1800, 'saisie', '', { par: 'sophie' });
  dep('O2412-05', '2026-10-20', 'pm', 'Fournisseur Démo B', 'Joint de vanne (réserve)', 85, 'bc', 'BC-1014');
  dep('E2609-07', '2026-10-10', 'loc', 'Loc\'Démo Est', 'Mini-pelle · mois', 2700, 'bc', 'BC-E1001');
  D.depenses = Dp;

  /* Factures (reprises du suivi de facturation + saisies). Facturé et produit SAISIS. rg = retenue de garantie de la facture. */
  var F = [], f = 100;
  function fac(a, lot, date, type, fact, prod, rg) { F.push({ id: 'F' + (++f), a: a, lot: lot, date: date, num: 'FAC-D' + String(f).padStart(4, '0'), type: type, fact: fact, prod: prod, rg: rg || 0 }); }
  fac('O2603-12', 'L', '2026-04-10', 'acompte', 48000, 0);
  [['2026-06-30', 80000], ['2026-07-31', 85000], ['2026-08-31', 60000], ['2026-09-30', 90000]].forEach(function (x) { fac('O2603-12', 'L', x[0], 'situation', x[1] * 0.85, x[1], x[1] * 0.05); });
  [['L1', [60000, 25000]], ['L2', [40000, 20000]], ['L3', [45000, 18000]], ['L4', [70000, 30000]]].forEach(function (x) {
    fac('O2511-13', x[0], '2026-08-31', 'situation', x[1][0], x[1][0]); fac('O2511-13', x[0], '2026-09-30', 'situation', x[1][1], x[1][1]);
  });
  fac('O2511-13', 'L1', '2026-10-31', 'situation', 27700, 27700); fac('O2511-13', 'L2', '2026-10-31', 'situation', 23000, 23000);
  fac('O2606-04', 'L', '2026-07-15', 'acompte', 52000, 0);
  fac('O2606-04', 'L', '2026-09-30', 'situation', 60000, 100000, 20000);
  fac('O2606-04', 'L', '2026-10-31', 'situation', 39000, 65000, 13000);
  fac('O2608-03', 'L', '2026-10-31', 'regie', 3400, 3400);
  [['2025-10-31', 90000], ['2025-12-31', 110000], ['2026-02-28', 100000]].forEach(function (x) { fac('O2412-05', 'L', x[0], 'situation', x[1] * 0.95, x[1], x[1] * 0.05); });
  [['2024-12-20', 70000], ['2025-03-31', 80000]].forEach(function (x) { fac('O2405-02', 'L', x[0], 'situation', x[1] * 0.95, x[1], x[1] * 0.05); });
  fac('O2405-02', 'L', '2026-06-02', 'liberationRG', 7500, 0);
  fac('E2609-07', 'L', '2026-09-30', 'situation', 28500, 30000, 1500);
  D.factures = F;

  /* Suivi du mois dans le tableau d'aide : étapes cochées (par, le), état « rien ce mois ». */
  D.suivi = {
    '2026-10': {
      'O2511-13/L1': { etapes: { env: ['nadia', '2026-10-31'], valS: ['nadia', '2026-11-03'], prep: ['nadia', '2026-11-04'], valF: ['dir', '2026-11-04'], drive: ['nadia', '2026-11-05'], depot: ['nadia', '2026-11-05'], copie: ['nadia', '2026-11-05'] } },
      'O2511-13/L2': { etapes: { env: ['nadia', '2026-10-31'], valS: ['nadia', '2026-11-04'], prep: ['nadia', '2026-11-06'] } },
      'O2511-13/L4': { rien: 'En attente du BDC client' },
      'O2606-04/L': { etapes: { env: ['nadia', '2026-10-30'], valS: ['nadia', '2026-11-02'], prep: ['nadia', '2026-11-03'], valF: ['dir', '2026-11-03'] } },
      'O2608-03/L': { etapes: { env: ['nadia', '2026-10-31'], prep: ['nadia', '2026-11-02'], valF: ['dir', '2026-11-02'], drive: ['nadia', '2026-11-02'], depot: ['nadia', '2026-11-03'], copie: ['nadia', '2026-11-03'] } }
    }
  };

  /* Planning des équipements : un chantier par équipement et par jour ouvré. */
  var P = {};
  function jours(debut, fin) {
    var out = [], d = new Date(debut + 'T12:00:00'), e = new Date(fin + 'T12:00:00');
    while (d <= e) { var w = d.getDay(); if (w > 0 && w < 6) { out.push(d.toISOString().slice(0, 10)); } d.setDate(d.getDate() + 1); }
    return out;
  }
  function poser(eq, a, debut, fin) { P[eq] = P[eq] || {}; jours(debut, fin).forEach(function (j) { P[eq][j] = a; }); }
  poser('PEC-1', 'O2603-12', '2026-09-01', '2026-11-27');
  poser('PEC-2', 'O2511-13', '2026-09-01', '2026-10-16'); poser('PEC-2', 'O2606-04', '2026-10-19', '2026-11-20');
  poser('EXT-1', 'O2511-13', '2026-09-14', '2026-09-16'); poser('EXT-1', 'O2606-04', '2026-10-06', '2026-10-08'); poser('EXT-1', 'O2603-12', '2026-11-16', '2026-11-18');
  poser('CB-1', 'O2603-12', '2026-10-05', '2026-10-09'); poser('CB-1', 'O2606-04', '2026-10-26', '2026-10-28'); poser('CB-1', 'O2412-05', '2026-10-20', '2026-10-20');
  poser('PH-1', 'O2606-04', '2026-09-01', '2026-11-27');
  poser('CT-1', 'O2603-12', '2026-09-01', '2026-11-27'); poser('CT-2', 'O2606-04', '2026-09-01', '2026-11-27');
  poser('CF-1', 'O2603-12', '2026-09-01', '2026-11-27');
  D.planning = P;
  D.joursOuvres = jours;

  window.AFD = D;
})();
