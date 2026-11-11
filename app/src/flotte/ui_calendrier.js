/* Tracé Flotte — CALENDRIER DES ÉCHÉANCES (ui_calendrier.js de la maquette validée ; appli, 10/11 nuit : « Aujourd'hui » = le vrai mois, écritures sur la fiche (FLD.ecrire),
   contravention → module RH). (mois ou liste). Lit les fiches : CT, restitution de location, fin de contrat d'entretien, interventions
   programmées, vidange estimée au rythme kilométrique de l'année (en pointillé), contraventions à désigner (avis + 45 j). Clic sur une échéance : que faire. */
(function () {
  var FL = window.FL, C = window.FLC, D = window.FLD;
  var TYPES = ['ct', 'vidange', 'rdv', 'restitution', 'contrat', 'pv'];
  function actif(k) { return FL.etat.calFiltre[k] !== false; }
  function echeances() { return C.toutesEcheances(FL.etat.agence).filter(function (e) { return actif(e.k); }); }
  function chip(e) { var x = C.ECH[e.k] || C.ECH.rdv; return '<button type="button" class="fl-ev fl-ev--' + x.cl + (e.est ? ' est' : '') + (e.j < 0 ? ' late' : '') + '" data-act="calEv" data-immat="' + e.immat + '" data-k="' + e.k + '" data-d="' + e.d + '" title="' + FL.esc(e.immat + ' · ' + e.t) + '"><span>' + x.i + '</span>' + e.immat + '</button>'; }

  function vueMois(E) {
    var an = FL.etat.calAn, mo = FL.etat.calMois, W = C.grille(an, mo), parJour = {};
    E.forEach(function (e) { (parJour[e.d] = parJour[e.d] || []).push(e); });
    var h = '<div class="fl-cal"><div class="fl-cal__tete">' + C.JOURS.map(function (j) { return '<span>' + j + '</span>'; }).join('') + '</div>';
    W.forEach(function (sem) { h += '<div class="fl-cal__sem">' + sem.map(function (d) { var L = parJour[d.iso] || [], j = C.jours(d.iso), sel = FL.etat.calSel === d.iso;
      return '<div class="fl-cal__j' + (d.dansMois ? '' : ' hors') + (d.we ? ' we' : '') + (j === 0 ? ' auj' : '') + (sel ? ' sel' : '') + (j < 0 ? ' passe' : '') + '" data-act="calSel" data-d="' + d.iso + '"><div class="fl-cal__n">' + d.jour + (j === 0 ? '<em>aujourd\'hui</em>' : '') + '</div>' +
        L.slice(0, 4).map(chip).join('') + (L.length > 4 ? '<button type="button" class="fl-ev fl-ev--plus" data-act="calSel" data-d="' + d.iso + '">+ ' + (L.length - 4) + '</button>' : '') + '</div>'; }).join('') + '</div>'; });
    return h + '</div>';
  }
  function vueListe(E) {
    var late = E.filter(function (e) { return e.j < 0; }), next = E.filter(function (e) { return e.j >= 0 && e.j <= 120; }), par = {};
    next.forEach(function (e) { var dt = new Date(Date.parse(e.d + 'T12:00:00')), dow = (dt.getUTCDay() + 6) % 7, lun = C.plusJours(e.d, -dow); (par[lun] = par[lun] || []).push(e); });
    var row = function (e) { var x = C.ECH[e.k] || C.ECH.rdv, v = e.v; return '<tr class="af-clic" data-act="calEv" data-immat="' + e.immat + '" data-k="' + e.k + '" data-d="' + e.d + '"><td class="fl-sev--' + (e.sev || 'n') + '"><b>' + C.date(e.d) + '</b><br><span class="af-sec">' + C.dans(e.j) + '</span></td><td>' + FL.vignette(v, 'fl-vign--s') + '</td><td><b>' + x.i + ' ' + FL.esc(e.t) + '</b>' + (e.est ? ' <span class="fl-est">estimée</span>' : '') + '<br><span class="af-sec">' + e.immat + ' · ' + FL.esc(v.marque + ' ' + v.modele) + (C.nomCond(v) ? ' · ' + FL.esc(C.nomCond(v)) : '') + ' · ' + v.agence + '</span></td></tr>'; };
    var h = '<div class="af-tabwrap"><table class="af-table fl-liste"><tbody>';
    if (late.length) { h += '<tr class="af-groupe fl-g--bad"><td colspan="3">En retard · ' + late.length + '</td></tr>' + late.map(row).join(''); }
    Object.keys(par).sort().forEach(function (lun) { h += '<tr class="af-groupe"><td colspan="3">Semaine du ' + C.dateC(lun) + ' · ' + par[lun].length + '</td></tr>' + par[lun].map(row).join(''); });
    return h + '</tbody></table></div>';
  }
  function cote(E) {
    var late = E.filter(function (e) { return e.j < 0; }), sel = FL.etat.calSel, dj = sel ? E.filter(function (e) { return e.d === sel; }) : [];
    var h = '<aside class="fl-cote">';
    h += '<section class="af-carte fl-sp"><h2>Afficher</h2><div class="fl-filtres">' + TYPES.map(function (k) { var n = E.filter(function (e) { return e.k === k; }).length;
      return '<label class="fl-chk"><input type="checkbox" data-chg="calType" value="' + k + '"' + (actif(k) ? ' checked' : '') + '><i class="fl-dot fl-dot--' + C.ECH[k].cl + '"></i>' + C.ECH[k].nom + '</label>'; }).join('') + '</div>' +
      '<div class="af-note">Pointillé : date estimée (vidange au rythme kilométrique de l\'année).</div></section>';
    if (sel) { h += '<section class="af-carte fl-sp"><div class="fl-sp__tete"><h2>' + C.date(sel) + '</h2><span class="af-sous">' + C.dans(C.jours(sel)) + '</span></div>' + (dj.length ? dj.map(function (e) { var x = C.ECH[e.k] || C.ECH.rdv; return '<button type="button" class="fl-li" data-act="calEv" data-immat="' + e.immat + '" data-k="' + e.k + '" data-d="' + e.d + '">' + FL.vignette(e.v, 'fl-vign--s') + '<span class="fl-li__txt"><b>' + x.i + ' ' + FL.esc(e.t) + '</b><small>' + e.immat + (C.nomCond(e.v) ? ' · ' + FL.esc(C.nomCond(e.v)) : '') + '</small></span></button>'; }).join('') : '<div class="af-note">Rien ce jour-là.</div>') +
      '<div style="margin-top:8px">' + FL.btn('Programmer ce jour', 'rdvNouveau', { s: true, i: 'plus', d: { date: sel } }) + '</div></section>'; }
    h += '<section class="af-carte fl-sp"><div class="fl-sp__tete"><h2>En retard</h2><span class="af-badge' + (late.length ? ' fl-badge--bad' : '') + '">' + late.length + '</span></div>' + (late.length ? late.map(function (e) { var x = C.ECH[e.k] || C.ECH.rdv; return '<button type="button" class="fl-li" data-act="calEv" data-immat="' + e.immat + '" data-k="' + e.k + '" data-d="' + e.d + '"><span class="fl-li__date fl-sev--bad"><b>' + C.dateC(e.d) + '</b><small>' + C.dans(e.j) + '</small></span><span class="fl-li__txt"><b>' + x.i + ' ' + FL.esc(e.t) + '</b><small>' + e.immat + '</small></span></button>'; }).join('') : '<div class="af-note">Rien en retard.</div>') + '</section>';
    return h + '</aside>';
  }
  FL.pages.calendrier = function () {
    var E = echeances(), an = FL.etat.calAn, mo = FL.etat.calMois;
    var h = '<div class="af-page"><div class="af-titre"><h1>Calendrier des échéances</h1><span class="af-sous">' + E.filter(function (e) { return e.j < 0; }).length + ' en retard · ' + E.filter(function (e) { return e.j >= 0 && e.j <= 14; }).length + ' sous 14 jours</span>' +
      '<div class="af-actions">' + FL.btn('Programmer une intervention', 'rdvNouveau', { i: 'plus' }) + '</div></div>';
    h += '<div class="fl-calbar">' + (FL.etat.calVue === 'mois' ? '<button type="button" class="tr-btn tr-btn--secondaire af-btn af-btn-s" data-act="calNav" data-n="-1" aria-label="Mois précédent">‹</button><b class="fl-calbar__mois">' + C.MOIS_LONG[mo] + ' ' + an + '</b><button type="button" class="tr-btn tr-btn--secondaire af-btn af-btn-s" data-act="calNav" data-n="1" aria-label="Mois suivant">›</button>' + FL.btn('Aujourd\'hui', 'calNav', { s: true, v: 'discret', d: { n: '0' } }) : '<b class="fl-calbar__mois">Les 4 prochains mois</b>') +
      '<span class="fl-seg">' + [['mois', 'Mois'], ['liste', 'Liste']].map(function (o) { return '<button type="button" data-act="onglet" data-k="calVue" data-v="' + o[0] + '" aria-pressed="' + (FL.etat.calVue === o[0]) + '">' + o[1] + '</button>'; }).join('') + '</span></div>';
    h += '<div class="fl-calwrap">' + (FL.etat.calVue === 'mois' ? vueMois(E) : vueListe(E)) + cote(E) + '</div></div>';
    return h;
  };
  FL.actions.calNav = function (el) { var n = +el.dataset.n; if (!n) { FL.moisCourant(); FL.etat.calSel = D.aujourdhui; } else { var m = FL.etat.calMois + n; FL.etat.calAn += Math.floor(m / 12); FL.etat.calMois = ((m % 12) + 12) % 12; } FL.render(); };
  FL.actions.calSel = function (el, ev) { if (ev && ev.target.closest('.fl-ev:not(.fl-ev--plus)')) { return; } FL.etat.calSel = el.dataset.d; FL.render(); };
  FL.actions.chg_calType = function (el) { FL.etat.calFiltre[el.value] = el.checked; FL.render(); };

  /* une échéance : ce qu'on peut faire */
  FL.actions.calEv = function (el, ev) {
    if (ev) { ev.stopPropagation(); }
    var v = C.veh(el.dataset.immat), e = C.echeances(v).find(function (x) { return x.k === el.dataset.k && x.d === el.dataset.d; }); if (!e) { return; }
    var x = C.ECH[e.k], pied = '', corps = '<div class="fl-evtete">' + FL.vignette(v, 'fl-vign--m') + '<div><b>' + v.immat + '</b> · ' + FL.esc(v.marque + ' ' + v.modele) + '<br><span class="af-sec">' + FL.esc(C.typeCourt(v.type)) + (C.nomCond(v) ? ' · ' + FL.esc(C.nomCond(v)) : ' · sans conducteur') + ' · ' + C.nb(v.km) + ' km</span></div></div>' +
      '<div class="af-aide"><b>' + x.i + ' ' + FL.esc(e.t) + '</b><br>' + C.date(e.d) + ' · ' + C.dans(e.j) + (e.est ? '<br>Date estimée : ' + C.nb(C.kmMois(v)) + ' km par mois depuis janvier, ' + C.nb(C.vidange(v).reste) + ' km avant la vidange.' : '') + (e.rdv && e.rdv.note ? '<br>' + FL.esc(e.rdv.note) : '') + (e.pv ? '<br>' + FL.esc(e.pv.quoi) + ' · ' + FL.esc(e.pv.lieu) + ' · le ' + C.date(e.pv.infraction) + ' · conducteur proposé : ' + FL.esc(e.pv.conducteur) : '') + '</div>';
    if (e.k === 'rdv') { corps += '<div class="af-champ"><label for="ev-date">Déplacer au</label><input id="ev-date" type="date" value="' + e.d + '"></div>'; pied = FL.btn('Déplacer', 'rdvDeplacer', { d: { immat: v.immat, id: e.rdv.id } }) + FL.btn('Fait', 'rdvFait', { v: 'principal', i: 'ok', d: { immat: v.immat, id: e.rdv.id } }); }
    else if (e.k === 'pv') { pied = FL.btn('Désigner dans Ressources humaines', 'existant', { v: 'principal', d: { x: 'rh', t: 'Ouvre RH › Contraventions (désignation ANTAI faite par la RH)' } }); }
    else { var t = e.k === 'ct' ? 'ct' : e.k === 'vidange' ? 'vidange' : e.k === 'restitution' ? 'restitution' : 'entretien'; pied = FL.btn('Programmer le rendez-vous', 'rdvNouveau', { v: 'principal', i: 'plus', d: { immat: v.immat, type: t, date: e.j < 0 ? D.aujourdhui : C.plusJours(e.d, -2) } }); }
    pied = FL.btn('Fiche du véhicule', 'veh', { d: { immat: v.immat, onglet: 'entretien' } }) + pied;
    FL.ouvrir(x.nom, corps, pied);
  };
  FL.actions.rdvFait = function (el) { var v = C.veh(el.dataset.immat); if (!v || !D.ecrire.rdvFait(v.immat, el.dataset.id)) { return; } FL.fermer(); FL.render(); FL.message('Fait : passé dans les interventions de ' + v.immat); }; /* appli : rdvok de flotte.js (+ CT à +2 ans, vidange remise à zéro) */
  FL.actions.rdvDeplacer = function (el) { var d = FL.val('ev-date'); if (!d) { return; } if (!D.ecrire.rdvDate(el.dataset.immat, el.dataset.id, d)) { return; } FL.fermer(); FL.render(); FL.message('Intervention déplacée au ' + C.date(d)); };
  /* programmer une intervention (depuis partout) */
  FL.actions.rdvNouveau = function (el) {
    var im = el.dataset.immat || '', ty = el.dataset.type || 'entretien', dt = el.dataset.date || '';
    var corps = '<div class="af-grille"><div class="af-champ plein"><label for="rv-veh">Véhicule</label><select id="rv-veh">' + FL.vehs().map(function (v) { return '<option value="' + v.immat + '"' + (v.immat === im ? ' selected' : '') + '>' + v.immat + ' · ' + FL.esc(v.marque + ' ' + v.modele) + (C.nomCond(v) ? ' · ' + FL.esc(C.nomCond(v)) : '') + '</option>'; }).join('') + '</select></div>' +
      '<div class="af-champ"><label for="rv-date">Date</label><input id="rv-date" type="date" value="' + dt + '"></div><div class="af-champ"><label for="rv-type">Quoi</label><select id="rv-type">' + D.rdvTypes.map(function (t) { return '<option value="' + t[0] + '"' + (t[0] === ty ? ' selected' : '') + '>' + t[1] + '</option>'; }).join('') + '</select></div>' +
      '<div class="af-champ plein"><label for="rv-garage">Garage / prestataire</label><input id="rv-garage" placeholder="ex. Garage Démo Vern"></div><div class="af-champ plein"><label for="rv-note">Note</label><input id="rv-note" placeholder="ex. plaquettes AV + vidange, véhicule de remplacement demandé"></div></div>' +
      '<div class="af-note">Le conducteur le voit dans « Mon véhicule ».</div>';
    FL.ouvrir('Programmer une intervention', corps, FL.btn('Programmer', 'rdvOk', { v: 'principal' }));
  };
  FL.actions.rdvOk = function () { var v = C.veh(FL.val('rv-veh')), d = FL.val('rv-date'); if (!d) { var i = document.getElementById('rv-date'); if (i) { i.focus(); i.style.borderColor = '#A3221F'; } return; }
    if (!v || !D.ecrire.rdvAjout(v.immat, { date: d, type: FL.val('rv-type'), garage: FL.val('rv-garage').trim(), note: FL.val('rv-note').trim() })) { return; } FL.fermer(); FL.render(); FL.message('Intervention programmée le ' + C.date(d) + ' · ' + v.immat); };
})();
