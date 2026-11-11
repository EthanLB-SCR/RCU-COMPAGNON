/* Tracé Flotte — RÈGLES (fonctions pures sur les données) — calc.js de la maquette validée (10/11/2026), repris tel quel. Deux retouches pour l'appli (10/11 nuit) :
   la date du jour est lue à chaque calcul (FLD.aujourdhui = la vraie date, remplie par flotte_donnees.js) au lieu d'être figée au chargement ; une contravention
   « à désigner » a le statut « recue » (c'est ce qu'écrit le module RH, registre rhpv). Reprend flotte.js (vehAlertes, vehEcheances) et mouvements.js (compteurs).
   Nouveau : vidange estimée à une date (rythme kilométrique de l'année), contraventions à désigner (avis + 45 j). */
(function () {
  var D = window.FLD, C = window.FLC = {};
  var J = 864e5; function T0() { return Date.parse(D.aujourdhui + 'T12:00:00'); } /* appli : lue à chaque calcul */
  C.jours = function (d) { if (!d) { return null; } var t = Date.parse(String(d).slice(0, 10) + 'T12:00:00'); return isFinite(t) ? Math.round((t - T0()) / J) : null; };
  C.plusJours = function (d, n) { var t = new Date(Date.parse(String(d).slice(0, 10) + 'T12:00:00') + n * J); return t.toISOString().slice(0, 10); };
  var MOIS = ['janv.', 'févr.', 'mars', 'avr.', 'mai', 'juin', 'juil.', 'août', 'sept.', 'oct.', 'nov.', 'déc.'];
  C.MOIS_LONG = ['janvier', 'février', 'mars', 'avril', 'mai', 'juin', 'juillet', 'août', 'septembre', 'octobre', 'novembre', 'décembre'];
  C.JOURS = ['lun.', 'mar.', 'mer.', 'jeu.', 'ven.', 'sam.', 'dim.'];
  C.date = function (d) { if (!d) { return '—'; } var p = String(d).slice(0, 10).split('-'); return p[2] + '/' + p[1] + '/' + p[0]; };
  C.dateC = function (d) { if (!d) { return '—'; } var p = String(d).slice(0, 10).split('-'); return (+p[2]) + ' ' + MOIS[+p[1] - 1]; };
  C.nb = function (n) { return (Math.round(+n || 0)).toLocaleString('fr-FR'); };
  C.eur = function (n) { return C.nb(n) + ' €'; };
  C.dans = function (j) { return j == null ? '' : j < 0 ? 'il y a ' + (-j) + ' j' : j === 0 ? "aujourd'hui" : j === 1 ? 'demain' : 'dans ' + j + ' j'; };
  C.pers = function (id) { return D.personnes.find(function (p) { return p.id === id; }) || null; };
  C.nomCond = function (v) { var p = C.pers(v.conducteur); return p ? p.nom : ''; };
  C.veh = function (immat) { return D.vehicules.find(function (v) { return v.immat === immat; }) || null; };
  C.chantier = function (id) { return D.chantiers.find(function (c) { return c.id === id; }) || null; };
  C.rdvLabel = function (t) { var x = D.rdvTypes.find(function (r) { return r[0] === t; }); return x ? x[1] : 'Autre'; };
  C.typeCourt = function (t) { return t === "Pelleur (conducteur d'engins)" ? 'Pelleur' : t; };
  C.dansAgence = function (v, ag) { return !ag || v.agence === ag; };

  /* rythme kilométrique : km parcourus depuis le 1er janvier ÷ mois écoulés */
  C.kmMois = function (v) { if (v.km == null || v.kmFinAnnee == null) { return null; } var m = (T0() - Date.parse(D.aujourdhui.slice(0, 4) + '-01-01T12:00:00')) / J / 30.44; return m > 0.5 ? Math.max(0, (v.km - v.kmFinAnnee) / m) : null; };
  /* vidange : reste en km, date estimée (au rythme de l'année) */
  C.vidange = function (v) { if (!v.cadenceVidange || v.km == null || v.kmVidange == null) { return null; } var reste = v.kmVidange + v.cadenceVidange - v.km, km = C.kmMois(v);
    var d = reste <= 0 ? D.aujourdhui : (km ? C.plusJours(D.aujourdhui, Math.round(reste / km * 30.44)) : null); return { reste: reste, date: d, kmMois: km, part: Math.min(1, Math.max(0, (v.km - v.kmVidange) / v.cadenceVidange)) }; };
  C.courroie = function (v) { if (!v.cadenceCourroie || v.km == null || v.kmCourroie == null) { return null; } var reste = v.kmCourroie + v.cadenceCourroie - v.km; return { reste: reste, part: Math.min(1, Math.max(0, (v.km - v.kmCourroie) / v.cadenceCourroie)) }; };
  C.pvEcheance = function (p) { return C.plusJours(p.avis, 45); };

  /* mouvements en attente d'un véhicule */
  C.attenteDe = function (immat) { return D.attente.filter(function (m) { return m.immat === immat; }); };
  /* ALERTES d'un véhicule (flotte.js vehAlertes + crochets de reception.js) */
  C.alertes = function (v) {
    var L = [], ct = C.jours(v.ctProchain);
    if (v.ctProchain) { if (ct < 0) { L.push({ k: 'ct', sev: 'bad', t: 'CT dépassé depuis ' + (-ct) + ' j' }); } else if (ct <= 30) { L.push({ k: 'ct', sev: 'bad', t: 'CT dans ' + ct + ' j' }); } else if (ct <= 60) { L.push({ k: 'ct', sev: 'warn', t: 'CT dans ' + ct + ' j' }); } }
    var vi = C.vidange(v); if (vi && vi.reste <= 0) { L.push({ k: 'vid', sev: 'warn', t: 'Vidange dépassée de ' + C.nb(-vi.reste) + ' km' }); }
    var co = C.courroie(v); if (co && co.reste <= 0) { L.push({ k: 'cour', sev: 'warn', t: 'Courroie à remplacer' }); }
    var cf = C.jours(v.contratFin); if (cf != null && cf <= 60) { L.push({ k: 'contrat', sev: cf < 0 ? 'bad' : 'warn', t: cf < 0 ? 'Contrat d\'entretien échu' : 'Contrat d\'entretien dans ' + cf + ' j' }); }
    var rs = C.jours(v.restitution); if (rs != null && v.dureeLoc && rs <= 60) { L.push({ k: 'loc', sev: rs < 0 ? 'bad' : 'warn', t: rs < 0 ? 'Restitution dépassée' : 'Restitution dans ' + rs + ' j' }); }
    (v.signalements || []).filter(function (s) { return !s.fait; }).forEach(function (s) { L.push({ k: 'sig', sev: 'warn', t: 'Signalement : ' + s.texte }); });
    C.attenteDe(v.immat).forEach(function (m) { if (m.k === 'contest') { L.push({ k: 'mv', sev: 'bad', t: 'Mouvement contesté' }); } else if (m.k === 'laisse') { L.push({ k: 'mv', sev: 'warn', t: 'Laissé sans preneur' }); } });
    if (v.edl1 === false && v.conducteur) { L.push({ k: 'edl1', sev: 'warn', t: 'Premier état des lieux à faire' }); }
    return L;
  };
  C.etat = function (v) { var a = C.alertes(v); return a.some(function (x) { return x.sev === 'bad'; }) ? 'bad' : a.length ? 'warn' : 'ok'; };

  /* ÉCHÉANCES d'un véhicule (flotte.js vehEcheances) + vidange estimée + PV à désigner ; k : ct | restitution | contrat | rdv | vidange | pv */
  C.echeances = function (v) {
    var L = [];
    function add(d, k, t, o) { var j = C.jours(d); if (j == null) { return; } L.push(Object.assign({ immat: v.immat, v: v, d: String(d).slice(0, 10), k: k, t: t, j: j, sev: j < 0 ? 'bad' : j <= 14 ? 'warn' : '' }, o || {})); }
    if (v.ctProchain) { add(v.ctProchain, 'ct', 'Contrôle technique'); }
    if (v.restitution && v.dureeLoc) { add(v.restitution, 'restitution', 'Restitution de location'); }
    if (v.contratFin) { add(v.contratFin, 'contrat', 'Fin du contrat d\'entretien'); }
    (v.rdv || []).filter(function (r) { return !r.fait; }).forEach(function (r) { add(r.date, 'rdv', C.rdvLabel(r.type) + (r.garage ? ' · ' + r.garage : ''), { rdv: r, rtype: r.type }); });
    var vi = C.vidange(v); if (vi && vi.date && vi.reste <= 3000) { add(vi.date, 'vidange', vi.reste <= 0 ? 'Vidange dépassée de ' + C.nb(-vi.reste) + ' km' : 'Vidange estimée (reste ' + C.nb(vi.reste) + ' km)', { est: vi.reste > 0, sev: vi.reste <= 0 ? 'bad' : '' }); }
    D.pv.filter(function (p) { return p.immat === v.immat && (p.statut === 'recue' || p.statut === 'reçue'); }).forEach(function (p) { add(C.pvEcheance(p), 'pv', 'Contravention à désigner (' + p.quoi.toLowerCase() + ')', { pv: p }); });
    /* un CT déjà programmé : l'échéance du CT reste, le rendez-vous la précède */
    return L;
  };
  C.toutesEcheances = function (ag) { return D.vehicules.filter(function (v) { return C.dansAgence(v, ag); }).reduce(function (a, v) { return a.concat(C.echeances(v)); }, []).sort(function (a, b) { return a.d < b.d ? -1 : a.d > b.d ? 1 : a.immat < b.immat ? -1 : 1; }); };
  C.ECH = { ct: { i: '📋', nom: 'Contrôle technique', cl: 'ct' }, vidange: { i: '🛢', nom: 'Vidange (estimée)', cl: 'vid' }, rdv: { i: '🔧', nom: 'Intervention programmée', cl: 'rdv' },
    restitution: { i: '↩', nom: 'Restitution de location', cl: 'loc' }, contrat: { i: '📄', nom: 'Contrat d\'entretien', cl: 'con' }, pv: { i: '🚨', nom: 'Contravention à désigner', cl: 'pv' } };

  /* MOUVEMENTS : compteurs (mvCounters) + sans premier état des lieux */
  C.MV = { contest: { nom: 'contesté', pl: 'contestés', i: '⚠', sev: 'bad' }, sig: { nom: 'signature attendue', pl: 'signatures attendues', i: '✍', sev: 'warn' }, edl: { nom: 'état des lieux attendu', pl: 'états des lieux attendus', i: '📋', sev: 'warn' },
    laisse: { nom: 'laissé sans preneur', pl: 'laissés sans preneur', i: '🚚', sev: 'warn' }, valider: { nom: 'à valider', pl: 'à valider', i: '⏳', sev: 'info' }, classer: { nom: 'à classer', pl: 'à classer', i: '✓', sev: 'ok' } };
  C.mouvements = function (ag) {
    var A = D.attente.filter(function (m) { var v = C.veh(m.immat); return v && C.dansAgence(v, ag); }), n = {};
    A.forEach(function (m) { n[m.k] = (n[m.k] || 0) + 1; });
    var sans = D.vehicules.filter(function (v) { return C.dansAgence(v, ag) && v.edl1 === false && v.conducteur; });
    return { liste: A, n: n, total: A.length, sansEdl1: sans, jEdl1: -C.jours(D.edl1Ref) };
  };

  /* grille d'un mois (semaines du lundi au dimanche) */
  C.grille = function (an, mois) {
    var d1 = new Date(Date.UTC(an, mois, 1)), dow = (d1.getUTCDay() + 6) % 7, start = new Date(d1.getTime() - dow * J), W = [];
    for (var w = 0; w < 6; w++) { var sem = []; for (var i = 0; i < 7; i++) { var d = new Date(start.getTime() + (w * 7 + i) * J); sem.push({ iso: d.toISOString().slice(0, 10), jour: d.getUTCDate(), dansMois: d.getUTCMonth() === mois, we: i >= 5 }); } if (w >= 4 && !sem.some(function (x) { return x.dansMois; })) { break; } W.push(sem); }
    return W;
  };

  /* PARKING 3D : rangée par métier, zone à part (atelier, laissés, retour loueur) */
  C.GROUPES = ['Soudeurs', 'Manchonneurs', 'Tuyauteurs', 'Pelleurs · bennes', 'Chefs · fonction', 'Polyvalents · essais'];
  C.groupe = function (v) { var t = v.type; return t === 'Soudeur' ? 'Soudeurs' : t === 'Manchonneur' ? 'Manchonneurs' : (t === 'Tuyauteur' || t === 'Aménagement') ? 'Tuyauteurs' : (/Pelleur/.test(t) || t === 'Benne') ? 'Pelleurs · bennes' : (t === 'Chef de chantier' || t === 'Fonction') ? 'Chefs · fonction' : 'Polyvalents · essais'; };
  C.zone = function (v) { if (v.situation === 'atelier') { return 'atelier'; } if (v.situation === 'laisse') { return 'laisse'; } var r = C.jours(v.restitution); if (v.dureeLoc && r != null && r <= 30 && !v.conducteur) { return 'restituer'; } return 'rang'; };
  C.pourParking = function (ag) {
    return D.vehicules.filter(function (v) { return C.dansAgence(v, ag); }).map(function (v) { var a = C.alertes(v), ch = C.chantier(v.chantier);
      return { immat: v.immat, marque: v.marque, modele: v.modele, type: v.type, couleur: v.couleur, groupe: C.groupe(v), etat: C.etat(v), zone: C.zone(v), chantier: v.situation === 'chantier' && ch ? ch.nom : null, conducteur: C.nomCond(v), alerte: a.length ? a[0].t : '', photo: v.photo || null, silhouette: v.silhouette || null }; });
  };
})();
