/* Tracé Flotte — ACCUEIL (ui_accueil.js de la maquette validée ; appli, 10/11 nuit : date du jour réelle, mois courant, « ➕ Véhicule » et « Traité » sur les fiches). Les mouvements en attente ne prennent plus l'écran : une alerte d'une ligne (compteurs + « Traiter »).
   Le reste en sous-parties : à faire cette semaine, alertes du parc, signalements, mini-calendrier du mois, où sont les véhicules, locations et contrats. */
(function () {
  var FL = window.FL, C = window.FLC, D = window.FLD;

  /* alerte compacte des mouvements (remplace le gros bloc « 📋 Mouvements en attente » au-dessus de la liste) */
  var COURT = { contest: ['contesté', 'contestés'], sig: ['signature', 'signatures'], edl: ['état des lieux', 'états des lieux'], laisse: ['laissé sans preneur', 'laissés sans preneur'], valider: ['à valider', 'à valider'], classer: ['à classer', 'à classer'] };
  FL.alerteMouvements = function (compact) {
    var m = C.mouvements(FL.etat.agence); if (!m.total && !m.sansEdl1.length) { return ''; }
    var ordre = ['contest', 'sig', 'edl', 'laisse', 'valider', 'classer'];
    var parts = ordre.filter(function (k) { return m.n[k]; }).map(function (k) { var x = C.MV[k], c = COURT[k]; return '<span class="fl-mvc fl-mvc--' + x.sev + '">' + x.i + ' ' + m.n[k] + ' ' + (m.n[k] > 1 ? c[1] : c[0]) + '</span>'; });
    if (m.sansEdl1.length) { parts.push('<span class="fl-mvc fl-mvc--' + (m.jEdl1 >= 14 ? 'bad' : 'warn') + '">📋 ' + m.sansEdl1.length + ' sans 1er état des lieux (J+' + m.jEdl1 + ')</span>'); }
    var grave = 'attention';
    return '<div class="tr-alerte tr-alerte--' + grave + ' fl-mvalerte' + (compact ? ' fl-mvalerte--c' : '') + '"><div class="tr-alerte__corps"><b class="tr-alerte__titre">' + (m.total) + ' mouvement' + (m.total > 1 ? 's' : '') + ' en attente :</b><span class="tr-alerte__texte fl-mvcs">' + parts.join('') + '</span></div>' +
      '<div class="tr-alerte__actions">' + FL.btn('Traiter', 'aller', { v: m.n.contest ? 'principal' : 'secondaire', s: true, d: { h: 'mouvements' } }) + '</div></div>';
  };

  function ligneEch(e) {
    var x = C.ECH[e.k] || C.ECH.rdv, v = e.v;
    return '<button type="button" class="fl-li" data-act="veh" data-immat="' + e.immat + '" data-onglet="entretien">' +
      '<span class="fl-li__date fl-sev--' + (e.sev || 'n') + '"><b>' + (e.j === 0 ? 'Auj.' : C.dateC(e.d)) + '</b><small>' + C.dans(e.j) + '</small></span>' + FL.vignette(v, 'fl-vign--s') +
      '<span class="fl-li__txt"><b>' + x.i + ' ' + FL.esc(e.t) + (e.est ? ' <span class="fl-est">estimée</span>' : '') + '</b><small>' + e.immat + ' · ' + FL.esc(v.marque + ' ' + v.modele) + (C.nomCond(v) ? ' · ' + FL.esc(C.nomCond(v)) : '') + '</small></span>' + FL.ico('chevron', 18) + '</button>';
  }
  function miniCal() {
    var an = +String(D.aujourdhui).slice(0, 4), mo = +String(D.aujourdhui).slice(5, 7) - 1, W = C.grille(an, mo), E = C.toutesEcheances(FL.etat.agence), parJour = {}; /* appli : le mois d'aujourd'hui */
    E.forEach(function (e) { (parJour[e.d] = parJour[e.d] || []).push(e); });
    var h = '<div class="fl-mini"><div class="fl-mini__tete">' + C.JOURS.map(function (j) { return '<span>' + j.slice(0, 1).toUpperCase() + '</span>'; }).join('') + '</div>';
    W.forEach(function (sem) { h += '<div class="fl-mini__sem">' + sem.map(function (d) { var L = parJour[d.iso] || [], j = C.jours(d.iso);
      return '<button type="button" class="fl-mini__j' + (d.dansMois ? '' : ' hors') + (j === 0 ? ' auj' : '') + (d.we ? ' we' : '') + (L.length ? ' a' : '') + '" data-act="calJour" data-d="' + d.iso + '" title="' + FL.esc(L.map(function (e) { return e.immat + ' · ' + e.t; }).join('\n')) + '"><b>' + d.jour + '</b><span class="fl-dots">' +
        L.slice(0, 3).map(function (e) { return '<i class="fl-dot fl-dot--' + (C.ECH[e.k] || C.ECH.rdv).cl + (e.j < 0 ? ' late' : '') + '"></i>'; }).join('') + '</span></button>'; }).join('') + '</div>'; });
    return h + '</div>';
  }
  FL.actions.calJour = function (el) { var d = el.dataset.d; FL.etat.calAn = +d.slice(0, 4); FL.etat.calMois = +d.slice(5, 7) - 1; FL.etat.calSel = d; FL.etat.calVue = 'mois'; FL.aller('calendrier'); };

  FL.pages.accueil = function () {
    var ag = FL.etat.agence, V = FL.vehs(), E = C.toutesEcheances(ag);
    var retard = E.filter(function (e) { return e.j < 0; }), semaine = E.filter(function (e) { return e.j >= 0 && e.j <= 7; }), mois = E.filter(function (e) { return e.j > 7 && e.j <= 30; });
    var al = V.map(function (v) { return { v: v, a: C.alertes(v) }; }), bad = al.filter(function (x) { return x.a.some(function (y) { return y.sev === 'bad'; }); }), warn = al.filter(function (x) { return x.a.length && !x.a.some(function (y) { return y.sev === 'bad'; }); });
    var sig = []; V.forEach(function (v) { (v.signalements || []).filter(function (s) { return !s.fait; }).forEach(function (s) { sig.push({ v: v, s: s }); }); });
    var sit = { chantier: 0, depot: 0, atelier: 0, laisse: 0 }; V.forEach(function (v) { sit[v.situation] = (sit[v.situation] || 0) + 1; });
    var loc = V.filter(function (v) { var r = C.jours(v.restitution), c = C.jours(v.contratFin); return (v.dureeLoc && r != null && r <= 90) || (c != null && c <= 90); });
    var agNom = (D.agences.find(function (a) { return a.id === ag; }) || {}).nom;

    var h = '<div class="af-page"><div class="af-titre"><h1>Flotte</h1><span class="af-sous">' + (ag ? 'Agence ' + FL.esc(agNom) : 'Toutes agences') + ' · ' + V.length + ' véhicules · ' + new Date(D.aujourdhui + 'T12:00:00').toLocaleDateString('fr-FR', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' }) + '</span>' +
      '<div class="af-actions">' + FL.btn('Programmer une intervention', 'rdvNouveau', { i: 'plus' }) + FL.btn('Véhicule', 'existant', { i: 'plus', d: { x: 'new', t: 'Dans l\'appli : « ➕ Véhicule » (immatriculation → fiche)' } }) + '</div></div>';
    h += FL.alerteMouvements();
    h += '<div class="fl-acc"><div class="fl-col">';
    /* sous-partie : à faire */
    h += '<section class="af-carte fl-sp"><div class="fl-sp__tete"><h2>À faire</h2><span class="af-sous">en retard et 7 prochains jours</span><button type="button" class="af-lien" data-act="aller" data-h="calendrier">Calendrier ›</button></div>';
    if (retard.length) { h += '<h3 class="fl-h3 fl-h3--bad">En retard · ' + retard.length + '</h3>' + retard.map(ligneEch).join(''); }
    h += '<h3 class="fl-h3">Cette semaine · ' + semaine.length + '</h3>' + (semaine.length ? semaine.map(ligneEch).join('') : '<div class="af-note">Rien cette semaine.</div>');
    h += '<details class="fl-plus"><summary>Dans le mois · ' + mois.length + '</summary>' + mois.map(ligneEch).join('') + '</details></section>';
    /* sous-partie : alertes du parc */
    h += '<section class="af-carte fl-sp"><div class="fl-sp__tete"><h2>Alertes du parc</h2><span class="af-sous">' + bad.length + ' bloquantes · ' + warn.length + ' à surveiller</span><button type="button" class="af-lien" data-act="vehFiltre" data-e="alerte">Voir la liste ›</button></div>' +
      '<div class="af-tabwrap fl-tabsans"><table class="af-table"><tbody>' + bad.concat(warn).slice(0, 8).map(function (x) { var v = x.v;
        return '<tr class="af-clic" data-act="veh" data-immat="' + v.immat + '"><td style="width:74px">' + FL.vignette(v, 'fl-vign--s') + '</td><td><b>' + v.immat + '</b><br><span class="af-sec">' + FL.esc(v.marque + ' ' + v.modele) + (C.nomCond(v) ? ' · ' + FL.esc(C.nomCond(v)) : '') + '</span></td><td>' +
          x.a.map(function (a) { return '<span class="fl-tag fl-tag--' + a.sev + '">' + FL.esc(a.t) + '</span>'; }).join(' ') + '</td></tr>'; }).join('') + '</tbody></table></div>' +
      (bad.length + warn.length > 8 ? '<div class="af-note" style="margin-top:6px">… et ' + (bad.length + warn.length - 8) + ' autres dans la liste des véhicules.</div>' : '') + '</section>';
    /* sous-partie : signalements */
    h += '<section class="af-carte fl-sp"><div class="fl-sp__tete"><h2>Signalements des conducteurs</h2><span class="af-sous">' + sig.length + ' à traiter</span></div>' +
      (sig.length ? sig.map(function (x) { return '<div class="fl-sig"><span class="fl-sig__txt"><b>' + FL.esc(x.s.texte) + '</b><small>' + x.v.immat + ' · ' + FL.esc(x.s.par) + ' · le ' + C.date(x.s.le) + '</small></span>' + FL.btn('Programmer', 'rdvNouveau', { s: true, d: { immat: x.v.immat } }) + FL.btn('Traité', 'sigOk', { s: true, v: 'discret', i: 'ok', d: { immat: x.v.immat, id: x.s.id } }) + '</div>'; }).join('') : '<div class="af-note">Aucun signalement en cours.</div>') + '</section>';
    h += '</div><div class="fl-col">';
    /* sous-partie : mini-calendrier */
    var moisT = C.MOIS_LONG[+String(D.aujourdhui).slice(5, 7) - 1]; moisT = moisT.charAt(0).toUpperCase() + moisT.slice(1) + ' ' + String(D.aujourdhui).slice(0, 4);
    h += '<section class="af-carte fl-sp"><div class="fl-sp__tete"><h2>' + moisT + '</h2><button type="button" class="af-lien" data-act="aller" data-h="calendrier">Ouvrir ›</button></div>' + miniCal() +
      '<div class="fl-leg">' + ['ct', 'vidange', 'rdv', 'restitution', 'contrat', 'pv'].map(function (k) { return '<span><i class="fl-dot fl-dot--' + C.ECH[k].cl + '"></i>' + C.ECH[k].nom + '</span>'; }).join('') + '</div></section>';
    /* sous-partie : où sont les véhicules */
    h += '<section class="af-carte fl-sp"><div class="fl-sp__tete"><h2>Où sont les véhicules</h2><button type="button" class="af-lien" data-act="aller" data-h="parking">Parking 3D ›</button></div><div class="fl-sit">' +
      [['chantier', 'Sur chantier', 'chantier'], ['depot', 'Au dépôt', 'flotte'], ['atelier', 'À l\'atelier', 'concepteur'], ['laisse', 'Laissés · à prendre', 'attention']].map(function (s) { return '<button type="button" class="fl-sit__c" data-act="aller" data-h="parking">' + FL.ico(s[2], 22) + '<b>' + (sit[s[0]] || 0) + '</b><span>' + s[1] + '</span></button>'; }).join('') + '</div>' +
      '<div class="fl-types">' + D.types.filter(function (t) { return V.some(function (v) { return v.type === t; }); }).map(function (t) { var n = V.filter(function (v) { return v.type === t; }).length; return '<span class="fl-type"><b>' + n + '</b> ' + FL.esc(C.typeCourt(t)) + '</span>'; }).join('') + '</div></section>';
    /* sous-partie : locations et contrats */
    h += '<section class="af-carte fl-sp"><div class="fl-sp__tete"><h2>Locations et contrats</h2><span class="af-sous">sous 90 jours</span></div>' + (loc.length ? loc.map(function (v) { var r = C.jours(v.restitution), c = C.jours(v.contratFin);
      return '<button type="button" class="fl-li" data-act="veh" data-immat="' + v.immat + '" data-onglet="fiche">' + FL.vignette(v, 'fl-vign--s') + '<span class="fl-li__txt"><b>' + v.immat + ' · ' + FL.esc(v.marque + ' ' + v.modele) + '</b><small>' + (v.dureeLoc && r != null && r <= 90 ? '↩ restitution le ' + C.date(v.restitution) + ' (' + C.dans(r) + ')' + (v.contratKm ? ' · ' + C.nb(v.km) + ' / ' + C.nb(v.contratKm) + ' km' : '') : '') + (c != null && c <= 90 ? '📄 fin du contrat d\'entretien le ' + C.date(v.contratFin) : '') + '</small></span>' + FL.ico('chevron', 18) + '</button>'; }).join('') : '<div class="af-note">Rien sous 90 jours.</div>') + '</section>';
    h += '</div></div></div>';
    return h;
  };
  FL.actions.vehFiltre = function (el) { FL.etat.vehEtat = el.dataset.e || ''; FL.aller('vehicules'); };
  FL.actions.sigOk = function (el) { if (D.ecrire.sigFait && !D.ecrire.sigFait(el.dataset.immat, el.dataset.id)) { return; } FL.render(); FL.message('Signalement classé traité'); }; /* appli : enregistré sur la fiche (sigok de flotte.js) */
})();
