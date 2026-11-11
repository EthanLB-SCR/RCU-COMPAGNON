/* test/fixtures/flotte_demo.js — 10/11 nuit : le jeu de données de la maquette Tracé Flotte (data.js), 100 % FICTIF (noms, immatriculations, chantiers, garages,
   montants). Chargé par test/e2e_flotte_1011.mjs dans la page (window.__FLDEMO) puis TRACE.flotteM.demo(…) : preuve « exactement pareil » contre la maquette. */
/* Tracé Flotte — maquette : données 100 % FICTIVES (noms, immatriculations, chantiers, garages, montants). Même forme que le registre « vehicule » de l'appli
   (flotte.js) + les enregistrements de mouvements (reception2.js / mouvements.js) et les contraventions (tracerh.js, registre rhpv). */
(function () {
  var P = [
    ['karim', 'Karim B.', 'soudeur'], ['julien', 'Julien M.', 'soudeur'], ['thomas', 'Thomas L.', 'soudeur'], ['kevin', 'Kévin R.', 'manchonneur'], ['yannick', 'Yannick D.', 'manchonneur'],
    ['mathieu', 'Mathieu P.', 'manchonneur'], ['sebastien', 'Sébastien G.', 'tuyauteur'], ['anthony', 'Anthony C.', 'tuyauteur'], ['romain', 'Romain F.', 'chauffeur_engin'], ['nicolas', 'Nicolas T.', 'chauffeur_engin'],
    ['damien', 'Damien H.', 'chef'], ['florian', 'Florian V.', 'chef'], ['sophie', 'Sophie M.', 'conducteur'], ['maxime', 'Maxime A.', 'charge_affaires'], ['jeremy', 'Jérémy S.', 'magasinier'],
    ['ludovic', 'Ludovic K.', 'tuyauteur'], ['alexandre', 'Alexandre N.', 'operation_specifique'], ['hugo', 'Hugo E.', 'tuyauteur'], ['bastien', 'Bastien O.', 'soudeur'], ['cedric', 'Cédric J.', 'soudeur'],
    ['steven', 'Steven W.', 'tuyauteur'], ['claire', 'Claire D.', 'resp_flotte'], ['mehdi', 'Mehdi A.', 'soudeur'], ['olivier', 'Olivier P.', 'manchonneur'], ['patrick', 'Patrick L.', 'chef'],
    ['lucas', 'Lucas V.', 'tuyauteur'], ['nadia', 'Nadia K.', 'conducteur']
  ].map(function (x) { return { id: x[0], nom: x[1], poste: x[2] }; });
  var POSTES = { soudeur: 'Soudeur', manchonneur: 'Manchonneur', tuyauteur: 'Tuyauteur', chauffeur_engin: "Chauffeur d'engin", chef: 'Chef de chantier', conducteur: 'Conducteur de travaux',
    charge_affaires: "Chargé d'affaires", magasinier: 'Magasinier', operation_specifique: 'Opération spécifique', resp_flotte: 'Responsable flotte' };
  var CH = [
    { id: 'ch1', nom: 'Rennes Démo Nord', agence: 'OUEST' }, { id: 'ch2', nom: 'Laval Démo', agence: 'OUEST' }, { id: 'ch3', nom: 'Le Mans Démo Gare', agence: 'OUEST' },
    { id: 'ch4', nom: 'Angers Démo', agence: 'OUEST' }, { id: 'ch5', nom: 'Vannes Démo', agence: 'OUEST' }, { id: 'ch6', nom: 'Massy Démo', agence: 'IDF' }, { id: 'ch7', nom: 'Cergy Démo', agence: 'IDF' }
  ];
  /* v(immat, n, agence, type, marque, modele, conducteur, situation, chantier, champs) — situation : chantier (avec son conducteur), depot, atelier, laisse */
  function v(immat, n, ag, type, marque, modele, cond, sit, ch, o) {
    return Object.assign({ immat: immat, n: n, agence: ag, type: type, marque: marque, modele: modele, conducteur: cond, situation: sit, chantier: ch || null, energie: 'Diesel',
      rdv: [], interventions: [], signalements: [], controles: [], edl1: true }, o || {});
  }
  var V = [
    v('FL-101-AA', '01', 'OUEST', 'Soudeur', 'Renault', 'Master L2H2', 'karim', 'chantier', 'ch1', { immat1: '2022-03-14', acquisition: '2022-03-14', entretien: 'Garage Démo Vern', ctDernier: '2025-03-10', ctProchain: '2027-03-10', km: 84200, kmFinAnnee: 61000, cadenceVidange: 30000, kmVidange: 58000, cadenceCourroie: 150000, kmCourroie: 0, pneus: 'Bon', taillePneu: '225/65 R16', depuis: '2024-09-02',
      interventions: [{ d: '2026-02-11', t: 'Vidange + filtres', garage: 'Garage Démo Vern', km: 58000, cout: 318 }, { d: '2025-11-20', t: 'Plaquettes AV', garage: 'Garage Démo Vern', km: 51200, cout: 214 }],
      controles: [{ d: '2026-09-29', par: 'Claire D.', km: 80100, ok: 9, revoir: ['Essuie-glaces'] }] }),
    v('FL-102-AA', '02', 'OUEST', 'Soudeur', 'Renault', 'Master L2H2', 'julien', 'chantier', 'ch1', { immat1: '2020-10-30', acquisition: '2020-10-30', entretien: 'Garage Démo Vern', ctDernier: '2024-11-04', ctProchain: '2026-11-04', km: 132400, kmFinAnnee: 108900, cadenceVidange: 30000, kmVidange: 104000, cadenceCourroie: 150000, kmCourroie: 0, pneus: 'Moyen', depuis: '2023-01-09',
      interventions: [{ d: '2026-01-15', t: 'Vidange', garage: 'Garage Démo Vern', km: 104000, cout: 289 }] }),
    v('FL-103-AB', '03', 'OUEST', 'Soudeur', 'Peugeot', 'Boxer L3H2', 'thomas', 'chantier', 'ch2', { immat1: '2022-11-18', ctDernier: '2024-11-26', ctProchain: '2026-11-26', km: 97300, kmFinAnnee: 77000, cadenceVidange: 25000, kmVidange: 76500, depuis: '2023-02-01',
      rdv: [{ id: 'r1', date: '2026-11-24', type: 'ct', garage: 'Centre CT Démo', note: 'contre-visite possible : essuie-glaces', par: 'Claire D.' }] }),
    v('FL-104-AB', '04', 'OUEST', 'Manchonneur', 'Ford', 'Transit L3H2', 'kevin', 'chantier', 'ch2', { immat1: '2022-12-15', acquisition: '2022-12-15', dureeLoc: 48, restitution: '2026-12-15', entretien: 'Loueur Démo (LLD)', contratKm: 160000, ctProchain: '2026-12-15', km: 148900, kmFinAnnee: 121000, cadenceVidange: 30000, kmVidange: 121500, loyerHT: 689, depuis: '2022-12-15' }),
    v('FL-105-AC', '05', 'OUEST', 'Manchonneur', 'Citroën', 'Jumper L2H2', 'yannick', 'chantier', 'ch3', { immat1: '2023-05-04', ctProchain: '2027-05-04', km: 71800, kmFinAnnee: 52300, cadenceVidange: 30000, kmVidange: 60100, depuis: '2023-05-04',
      signalements: [{ id: 's1', texte: 'Voyant moteur orange allumé depuis lundi', par: 'Yannick D.', le: '2026-11-09' }],
      rdv: [{ id: 'r2', date: '2026-11-13', type: 'entretien', garage: 'Garage Démo Vern', note: 'diagnostic voyant moteur', par: 'Claire D.' }] }),
    v('FL-106-AC', '06', 'OUEST', 'Manchonneur', 'Fiat', 'Ducato L2H2', 'mathieu', 'chantier', 'ch3', { immat1: '2024-02-20', ctProchain: '2028-02-20', km: 46200, kmFinAnnee: 31000, cadenceVidange: 30000, kmVidange: 30200, depuis: '2024-02-20' }),
    v('FL-107-AD', '07', 'OUEST', 'Tuyauteur', 'Renault', 'Trafic L2H1', 'sebastien', 'chantier', 'ch1', { immat1: '2019-06-12', ctDernier: '2025-06-03', ctProchain: '2027-06-03', km: 121500, kmFinAnnee: 104800, cadenceVidange: 30000, kmVidange: 101000, cadenceCourroie: 120000, kmCourroie: 0, depuis: '2021-03-01' }),
    v('FL-108-AD', '08', 'OUEST', 'Tuyauteur', 'Opel', 'Vivaro L2', 'anthony', 'chantier', 'ch4', { immat1: '2023-12-02', entretien: 'Contrat Démo Services', contratMois: 36, contratFin: '2026-12-02', ctProchain: '2027-12-02', km: 58700, kmFinAnnee: 39500, cadenceVidange: 30000, kmVidange: 31000, depuis: '2023-12-02' }),
    v('FL-109-AE', '09', 'OUEST', "Pelleur (conducteur d'engins)", 'Renault', 'Master plateau porte-engin', 'romain', 'chantier', 'ch1', { immat1: '2021-09-01', ctProchain: '2027-09-01', km: 88900, kmFinAnnee: 74100, cadenceVidange: 30000, kmVidange: 70000, depuis: '2021-09-01' }),
    v('FL-110-AE', '10', 'OUEST', "Pelleur (conducteur d'engins)", 'Iveco', 'Daily plateau double cabine', 'nicolas', 'chantier', 'ch3', { immat1: '2022-04-07', ctProchain: '2027-04-07', km: 102300, kmFinAnnee: 83800, cadenceVidange: 40000, kmVidange: 80000, pneus: 'Usés AR', depuis: '2025-10-06', edl1: false,
      rdv: [{ id: 'r3', date: '2026-11-19', type: 'pneus', garage: 'Pneus Démo Rennes', note: '2 pneus AR', par: 'Claire D.' }] }),
    v('FL-111-AF', '11', 'OUEST', 'Chef de chantier', 'Toyota', 'Hilux double cabine', 'damien', 'chantier', 'ch1', { couleur: 'gris', energie: 'Diesel', immat1: '2023-07-21', ctProchain: '2027-07-21', km: 63400, kmFinAnnee: 45800, cadenceVidange: 20000, kmVidange: 60100, depuis: '2023-07-21' }),
    v('FL-112-AF', '12', 'OUEST', 'Chef de chantier', 'Dacia', 'Duster', 'florian', 'chantier', 'ch2', { couleur: 'bleu nuit', immat1: '2022-12-08', ctProchain: '2026-12-08', km: 70100, kmFinAnnee: 55400, cadenceVidange: 20000, kmVidange: 60000, depuis: '2025-09-01', edl1: false }),
    v('FL-113-AG', '13', 'OUEST', 'Fonction', 'Peugeot', '308 SW', 'sophie', 'depot', null, { couleur: 'gris foncé', energie: 'Hybride', immat1: '2024-05-16', ctProchain: '2028-05-16', km: 38900, kmFinAnnee: 26000, cadenceVidange: 25000, kmVidange: 25100, depuis: '2026-10-27' }),
    v('FL-114-AG', '14', 'OUEST', 'Fonction', 'Renault', 'Mégane Estate', 'maxime', 'depot', null, { couleur: 'noir', energie: 'Essence', immat1: '2023-03-30', ctProchain: '2027-03-30', km: 41000, kmFinAnnee: 30200, cadenceVidange: 30000, kmVidange: 15000, depuis: '2023-03-30' }),
    v('FL-115-AH', '15', 'OUEST', 'Benne', 'Iveco', 'Daily benne', null, 'depot', null, { immat1: '2020-01-22', ctDernier: '2025-01-20', ctProchain: '2027-01-20', km: 76200, kmFinAnnee: 70300, cadenceVidange: 30000, kmVidange: 45000 }),
    v('FL-116-AH', '16', 'OUEST', 'Polyvalent', 'Renault', 'Kangoo', 'jeremy', 'depot', null, { immat1: '2021-11-03', ctProchain: '2027-11-03', km: 54600, kmFinAnnee: 47100, cadenceVidange: 30000, kmVidange: 30500, depuis: '2026-11-09' }),
    v('FL-117-AJ', '17', 'OUEST', 'Polyvalent', 'Citroën', 'Berlingo', null, 'laisse', null, { immat1: '2021-06-25', ctProchain: '2027-06-25', km: 89100, kmFinAnnee: 80200, cadenceVidange: 30000, kmVidange: 61000, laisse: { par: 'Ludovic K.', le: '2026-10-29', a: null, ou: 'au dépôt de Vern' } }),
    v('FL-118-AJ', '18', 'OUEST', 'Essais', 'Ford', 'Transit Custom L2 vitré', 'alexandre', 'atelier', null, { immat1: '2023-09-12', ctProchain: '2027-09-12', km: 51200, kmFinAnnee: 36000, cadenceVidange: 30000, kmVidange: 30000, depuis: '2023-09-12',
      rdv: [{ id: 'r4', date: '2026-11-10', type: 'carrosserie', garage: 'Carrosserie Démo', note: 'porte latérale droite (accrochage du 28/10)', par: 'Claire D.' }] }),
    v('FL-119-AK', '19', 'OUEST', 'Aménagement', 'Renault', 'Trafic L1H1', 'hugo', 'chantier', 'ch5', { immat1: '2022-08-19', ctProchain: '2026-12-19', km: 66500, kmFinAnnee: 50000, cadenceVidange: 30000, kmVidange: 60300, depuis: '2026-11-06' }),
    v('FL-120-AK', '20', 'OUEST', 'Soudeur', 'Mercedes', 'Sprinter L2H2', 'cedric', 'chantier', 'ch4', { immat1: '2025-10-28', acquisition: '2025-10-28', dureeLoc: 48, restitution: '2029-10-28', entretien: 'Loueur Démo (LLD)', ctProchain: '2029-10-28', km: 23900, kmFinAnnee: 2100, cadenceVidange: 40000, kmVidange: 0, loyerHT: 742, depuis: '2026-11-03', edl1: false }),
    v('FL-121-AL', '21', 'OUEST', 'Tuyauteur', 'Peugeot', 'Expert L2', 'steven', 'chantier', 'ch5', { immat1: '2023-01-12', ctProchain: '2027-01-12', km: 67200, kmFinAnnee: 49800, cadenceVidange: 30000, kmVidange: 60000, depuis: '2023-01-12',
      switch: { ancien: 'Steven W.', nouveau: 'Ludovic K.', depuis: '2026-11-05', par: 'Claire D.' } }),
    v('FL-122-AL', '22', 'OUEST', 'Fonction', 'Renault', 'Clio', null, 'depot', null, { couleur: 'blanc', energie: 'Essence', immat1: '2023-11-20', acquisition: '2023-11-20', dureeLoc: 36, restitution: '2026-11-20', entretien: 'Loueur Démo (LLD)', contratKm: 60000, ctProchain: '2027-11-20', km: 49800, kmFinAnnee: 41200, loyerHT: 312 }),
    v('FL-201-BA', '31', 'IDF', 'Soudeur', 'Renault', 'Master L3H2 roues jumelées', 'mehdi', 'chantier', 'ch6', { immat1: '2020-10-22', ctDernier: '2024-10-22', ctProchain: '2026-10-22', km: 141800, kmFinAnnee: 120400, cadenceVidange: 30000, kmVidange: 119000, depuis: '2022-05-02' }),
    v('FL-202-BA', '32', 'IDF', 'Manchonneur', 'Peugeot', 'Boxer L2H2', 'olivier', 'chantier', 'ch6', { immat1: '2024-06-11', ctProchain: '2028-06-11', km: 39800, kmFinAnnee: 22000, cadenceVidange: 30000, kmVidange: 30000, depuis: '2024-06-11' }),
    v('FL-203-BB', '33', 'IDF', 'Chef de chantier', 'Ford', 'Ranger', 'patrick', 'chantier', 'ch7', { couleur: 'gris foncé', immat1: '2023-04-18', ctProchain: '2027-04-18', km: 58300, kmFinAnnee: 41000, cadenceVidange: 20000, kmVidange: 40100, depuis: '2026-10-12', edl1: false,
      rdv: [{ id: 'r5', date: '2026-11-18', type: 'vidange', garage: 'Garage Démo Massy', note: '', par: 'Claire D.' }] }),
    v('FL-204-BB', '34', 'IDF', 'Tuyauteur', 'Fiat', 'Scudo L2', 'lucas', 'chantier', 'ch7', { immat1: '2024-09-03', ctProchain: '2028-09-03', km: 33100, kmFinAnnee: 19500, cadenceVidange: 30000, kmVidange: 0, depuis: '2026-11-07' }),
    v('FL-205-BC', '35', 'IDF', 'Fonction', 'Skoda', 'Octavia Combi', 'nadia', 'depot', null, { couleur: 'bleu', energie: 'Hybride', immat1: '2025-02-14', ctProchain: '2029-02-14', km: 21700, kmFinAnnee: 9000, cadenceVidange: 30000, kmVidange: 0, depuis: '2026-10-20', edl1: false })
  ];
  /* MOUVEMENTS EN ATTENTE (mêmes familles que reception2.js / mouvements.js : mvCounters) */
  var attente = [
    { id: 'm1', k: 'contest', immat: 'FL-119-AK', titre: 'Laissé par Bastien O., pris par Hugo E.', motif: 'Rayure porte latérale non déclarée, carte carburant absente', depuis: '2026-11-06', qui: 'Hugo E.' },
    { id: 'm2', k: 'sig', immat: 'FL-204-BB', titre: 'Laissé par Patrick L. à Lucas V.', motif: 'Lucas V. doit signer l\'état des lieux de sortie (ou le contester)', depuis: '2026-11-07', qui: 'Lucas V.' },
    { id: 'm3', k: 'sig', immat: 'FL-113-AG', titre: 'Changement déclaré : Maxime A. → Sophie M.', motif: 'Sophie M. a le véhicule depuis le 27/10 mais n\'a pas encore signé', depuis: '2026-10-27', qui: 'Sophie M.' },
    { id: 'm4', k: 'edl', immat: 'FL-121-AL', titre: 'Changement déclaré : Steven W. → Ludovic K.', motif: 'État des lieux de sortie de Steven W. attendu', depuis: '2026-11-05', qui: 'Steven W.' },
    { id: 'm5', k: 'laisse', immat: 'FL-117-AJ', titre: 'Laissé par Ludovic K. « à qui le prendra », au dépôt de Vern', motif: 'Personne ne l\'a pris depuis plus de 7 jours', depuis: '2026-10-29', qui: '' },
    { id: 'm6', k: 'valider', immat: 'FL-116-AH', titre: 'Remise faite seul par Jérémy S.', motif: 'À valider par un responsable', depuis: '2026-11-09', qui: 'Jérémy S.' },
    { id: 'm7', k: 'classer', immat: 'FL-202-BA', titre: 'Changement terminé : Lucas V. → Olivier P.', motif: 'Le nouveau conducteur a signé · un clic pour classer', depuis: '2026-11-04', qui: '' }
  ];
  var journal = [
    { at: '2026-11-09T16:40', immat: 'FL-116-AH', st: 'info', t: 'Remise faite seul par Jérémy S. (à valider)' },
    { at: '2026-11-09T07:12', immat: 'FL-105-AC', st: 'warn', t: 'Signalement de Yannick D. : voyant moteur orange' },
    { at: '2026-11-07T17:05', immat: 'FL-204-BB', st: 'info', t: 'Laissé par Patrick L. à Lucas V., au dépôt de Massy' },
    { at: '2026-11-06T08:20', immat: 'FL-119-AK', st: 'bad', t: 'Contesté par Hugo E. : rayure porte latérale, carte carburant absente' },
    { at: '2026-11-05T18:10', immat: 'FL-119-AK', st: 'info', t: 'Laissé par Bastien O. à Hugo E., au dépôt de Vern' },
    { at: '2026-11-05T10:02', immat: 'FL-121-AL', st: 'info', t: 'Changement déclaré par Claire D. : Steven W. → Ludovic K.' },
    { at: '2026-11-04T09:30', immat: 'FL-202-BA', st: 'ok', t: 'Olivier P. a signé : véhicule à lui' },
    { at: '2026-11-03T07:45', immat: 'FL-120-AK', st: 'ok', t: 'Remise par Claire D. à Cédric J. (véhicule neuf en LLD)' },
    { at: '2026-10-29T16:55', immat: 'FL-117-AJ', st: 'info', t: 'Laissé par Ludovic K. « à qui le prendra », au dépôt de Vern' },
    { at: '2026-10-28T15:20', immat: 'FL-118-AJ', st: 'warn', t: 'Signalement d\'Alexandre N. : accrochage porte latérale droite' },
    { at: '2026-10-27T08:00', immat: 'FL-113-AG', st: 'info', t: 'Changement déclaré par Claire D. : Maxime A. → Sophie M.' }
  ];
  /* conducteurs successifs (historique d'un véhicule) */
  var conducteurs = {
    'FL-119-AK': [{ nom: 'Hugo E.', du: '2026-11-06', au: null, how: 'pris (contesté)' }, { nom: 'Bastien O.', du: '2024-03-04', au: '2026-11-05', how: 'laissé' }, { nom: 'Romain F.', du: '2022-08-19', au: '2024-03-01', how: 'restitution' }],
    'FL-102-AA': [{ nom: 'Julien M.', du: '2023-01-09', au: null, how: 'remise' }, { nom: 'Kévin R.', du: '2020-10-30', au: '2023-01-06', how: 'restitution' }],
    'FL-113-AG': [{ nom: 'Sophie M.', du: '2026-10-27', au: null, how: 'changement déclaré (signature attendue)' }, { nom: 'Maxime A.', du: '2024-05-16', au: '2026-10-27', how: 'changement' }]
  };
  /* contraventions (module RH, registre rhpv) : échéance de désignation = avis + 45 j */
  var pv = [
    { id: 'pv1', immat: 'FL-102-AA', avis: '2026-10-09', infraction: '2026-10-02', lieu: 'N157, Vitré (35)', quoi: 'Excès de vitesse < 20 km/h', montant: 68, statut: 'reçue', conducteur: 'Julien M.' },
    { id: 'pv2', immat: 'FL-201-BA', avis: '2026-10-20', infraction: '2026-10-15', lieu: 'Massy (91)', quoi: 'Stationnement gênant', montant: 35, statut: 'reçue', conducteur: 'Mehdi A.' },
    { id: 'pv3', immat: 'FL-108-AD', avis: '2026-09-02', infraction: '2026-08-27', lieu: 'A11, Angers (49)', quoi: 'Excès de vitesse < 20 km/h', montant: 68, statut: 'désignée', conducteur: 'Anthony C.' }
  ];
  window.__FLDEMO = {
    aujourdhui: '2026-11-10', edl1Ref: '2026-10-20',
    agences: [{ id: '', nom: 'Toutes' }, { id: 'OUEST', nom: 'Ouest' }, { id: 'IDF', nom: 'Île-de-France' }],
    personnes: P, postes: POSTES, chantiers: CH, vehicules: V, attente: attente, journal: journal, conducteurs: conducteurs, pv: pv,
    rdvTypes: [['entretien', 'Entretien / révision'], ['vidange', 'Vidange'], ['ct', 'Contrôle technique'], ['pneus', 'Pneus'], ['carrosserie', 'Carrosserie'], ['restitution', 'Restitution'], ['autre', 'Autre']],
    types: ['Soudeur', 'Manchonneur', 'Tuyauteur', "Pelleur (conducteur d'engins)", 'Chef de chantier', 'Fonction', 'Benne', 'Polyvalent', 'Aménagement', 'Essais', 'Autre'],
    ctrlItems: ['Propreté', 'Essuie-glaces', 'Plaquettes de frein', 'Pneus', 'Feux', 'Trousse de secours BTP', 'Extincteur', 'Kit anti-pollution', 'Documents de bord', 'Autres']
  };
})();
