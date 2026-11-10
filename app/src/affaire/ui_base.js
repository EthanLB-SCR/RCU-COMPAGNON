/* Tracé Affaire — ui_base.js : cadre, navigation, droits, fenêtres, actions. Copie de la maquette validée (10/11) ADAPTÉE à l'appli, et seulement là
   où la passation le prévoit (claude/passation-module-affaire.md § 1 bis.3) : plus de « Vu par » (droits du compte connecté, via AFD.moi), le sélecteur
   d'agence = secteur de l'appli, plus d'en-tête ni de pastille « Maquette » (bandeau « Tracé Affaire » de l'appli), plus de #hash (route en mémoire,
   rendu demandé à l'appli), fenêtres = la modale de l'appli, message = le toast de l'appli, clics délégués en capture et limités à .af-root. */
(function () {
  var AF = window.AF = { pages: {}, actions: {}, etat: {
    agence: '', moisFact: '', tous: false, route: { page: 'reporting' },
    repOnglet: 'en_cours', repCA: '', ficheOnglet: 'debours', fichePer: 'cumul', agPer: 'cumul', planDebut: '', planSel: null, regOnglet: 'taux'
  } };
  var C = window.AFC, D = window.AFD;

  /* ---------- Outils d'affichage (inchangés) ---------- */
  AF.esc = function (s) { return String(s == null ? '' : s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;'); };
  AF.ico = function (n, t) { return window.Trace && Trace.icone ? Trace.icone(n, t || 20) : ''; };
  AF.pastille = function (etat, texte) {
    var icones = { ok: 'ok', 'en-cours': 'en-cours', 'a-valider': 'a-valider', bloque: 'bloque', horsligne: 'horsligne', info: 'info' };
    return '<span class="tr-pastille af-pt tr-pastille--' + etat + '">' + AF.ico(icones[etat] || 'info', 16) + AF.esc(texte) + '</span>';
  };
  AF.btn = function (texte, act, opts) {
    opts = opts || {};
    var cl = 'tr-btn af-btn tr-btn--' + (opts.v || 'secondaire') + (opts.s ? ' af-btn-s' : '');
    var data = Object.keys(opts.d || {}).map(function (k) { return ' data-' + k + '="' + AF.esc(opts.d[k]) + '"'; }).join('');
    return '<button type="button" class="' + cl + '" data-act="' + act + '"' + data + (opts.off ? ' disabled title="' + AF.esc(opts.off) + '"' : '') + '>' + (opts.i ? AF.ico(opts.i, 18) : '') + '<span>' + AF.esc(texte) + '</span></button>';
  };
  AF.jauge = function (x) {
    if (x == null) { return '<span class="af-sec">—</span>'; }
    return '<span class="af-jauge"><span class="tr-jauge"><span style="width:' + Math.min(100, Math.round(x * 100)) + '%"></span></span><b>' + C.pct(x) + '</b></span>';
  };
  AF.montantCl = function (n) { return n < -0.5 ? 'af-neg' : (n > 0.5 ? 'af-pos' : ''); };
  /* appli : la personne connectée, avec son rôle dans le module (direction | ca | cond | fact | chef | null), calculé par affaire_donnees.js */
  AF.persona = function () { return D.moi; };
  AF.nomPers = function (id) { if (!id) { return '—'; } var p = C.pers(id); return p ? p.nom.split(' · ')[0] : String(id); };

  /* ---------- Droits (mêmes droits par rôle que la maquette ; le rôle vient du compte connecté) ---------- */
  var DROITS = {
    direction: ['agence', 'banques', 'reglages', 'etapes', 'facture', 'depense', 'planning', 'reprise', 'parametres', 'travauxFinis', 'termine'],
    ca: ['facture', 'depense', 'reprise', 'parametres', 'travauxFinis'],
    cond: ['depense', 'planning', 'travauxFinis'],
    fact: ['etapes', 'facture'],
    chef: []
  };
  AF.peut = function (droit) { var r = D.moi && D.moi.role; return !!r && (DROITS[r] || []).indexOf(droit) >= 0; };
  /* Affaires visibles : le chargé d'affaires voit les siennes, le conducteur ses chantiers, le chef aucune. */
  AF.visible = function (a) {
    var r = D.moi && D.moi.role, me = D.moi && D.moi.id;
    if (!r) { return false; }
    if (r === 'ca') { return a.ca === me; }
    if (r === 'cond') { return a.cond === me || (a.conds || []).indexOf(me) >= 0; }
    if (r === 'chef') { return false; }
    return true;
  };

  /* ---------- Cadre ---------- */
  var NAV = [
    { titre: 'Suivi' },
    { id: 'reporting', nom: 'Reporting des chantiers', i: 'affaire' },
    { id: 'facturation', nom: 'Facturation du mois', i: 'a-valider', lot: 'B' },
    { id: 'rg', nom: 'RG à facturer', i: 'attention' },
    { titre: 'Achats' }, /* appli : les écrans existants de l'onglet Affaire restent accessibles d'ici (mêmes data-act / data-v que les lignes du hub d'avant : tutoriels et tests) */
    { id: 'app:cmd', nom: 'Bons de commande', i: 'commerce' },
    { id: 'app:frais', nom: 'Notes de frais à valider', i: 'compagnon', feat: 'frais' },
    { id: 'app:x:cc:', nom: 'Compte d\'un chantier (ancien calcul)', i: 'chantier', feat: 'comptechantier' },
    { titre: 'Agence', droit: 'agence' },
    { id: 'agence', nom: 'Compte d\'agence', i: 'chantier', droit: 'agence', lot: 'D' },
    { titre: 'Paramètres' },
    { id: 'reprise', nom: 'Reprise des chantiers', i: 'plan', droit: 'reprise' },
    { id: 'reglages', nom: 'Réglages', i: 'info', droit: 'reglages' }
  ];
  AF.route = function () { return AF.etat.route || { page: 'reporting' }; };
  AF.aller = function (h) {
    if (h.indexOf('app:') === 0) { if (D.app && D.app.go) { D.app.go(h.slice(4)); } return; }
    AF.etat.route = h.indexOf('affaire-') === 0 ? { page: 'fiche', code: h.slice(8) } : { page: h || 'reporting' };
    AF.render(); try { window.scrollTo(0, 0); } catch (e) { }
  };
  function badges() {
    var b = {};
    try {
      var lf = C.lignesFacturation(D.moisFacturation || AF.etat.moisFact).filter(function (l) { return AF.visible(l.a) && l.a.agence === AF.etat.agence; });
      b.facturation = lf.filter(function (l) { return l.etat === 'a_traiter'; }).length;
      b.rg = C.rgAFacturer().filter(function (x) { return x.echue && AF.visible(x.a); }).length;
      b['app:frais'] = D.app && D.app.nFrais ? D.app.nFrais() : 0;
    } catch (e) { console.warn(e); }
    return b;
  }
  var featOk = function (n) { return !(n.feat && D.app && D.app.featOn && !D.app.featOn(n.feat)); };
  /* le HTML du module (nav + écran) : l'appli l'insère dans l'onglet Affaire */
  AF.html = function () {
    var r = AF.route(), b = badges(), html = '';
    if (!D.moi || !D.moi.role) { return '<div class="af-root"><div class="af-carte af-vide">Le module Affaire est réservé à l\'encadrement, au bureau et à la direction.</div></div>'; }
    html += '<div class="af-root"><div class="af-cadre"><nav class="af-nav" aria-label="Module Affaire">';
    NAV.forEach(function (n, i) {
      if (n.droit && !AF.peut(n.droit)) { return; }
      if (!featOk(n)) { return; }
      if (n.titre) {
        var suite = NAV.slice(i + 1), fin = suite.findIndex(function (x) { return x.titre; });
        if (!(fin < 0 ? suite : suite.slice(0, fin)).some(function (x) { return (!x.droit || AF.peut(x.droit)) && featOk(x); })) { return; }
        html += '<div class="af-nav__titre">' + n.titre + '</div>'; return;
      }
      var cur = r.page === n.id || ((r.page === 'fiche' || r.page === 'equipements') && n.id === 'reporting');
      var app = n.id.indexOf('app:') === 0; /* écran de l'appli : action de hub de l'appli (xgo), pas une page du module */
      html += '<button type="button" ' + (app ? 'data-act="xgo" data-v="' + AF.esc(n.id.slice(4)) + '"' : 'data-act="aller" data-h="' + n.id + '"') + (cur ? ' aria-current="page"' : '') + (n.lot && !AF.pages[n.id] ? ' title="Lot ' + n.lot + ' : à venir"' : '') + '>' + AF.ico(n.i, 20) + '<span>' + n.nom + '</span>' +
        (b[n.id] ? '<span class="af-badge">' + b[n.id] + '</span>' : '') + '</button>';
    });
    var ag = D.agences.find(function (x) { return x.id === AF.etat.agence; });
    html += '<div class="af-nav__pied">' + (D.agences.length > 1 ? '<label class="af-qui" style="margin:0 0 8px;display:flex">Agence <select data-chg="agence" aria-label="Agence">' +
      D.agences.map(function (a) { return '<option value="' + a.id + '"' + (a.id === AF.etat.agence ? ' selected' : '') + '>' + AF.esc(a.nom) + '</option>'; }).join('') + '</select></label>' : (ag ? 'Agence ' + AF.esc(ag.nom) + '<br>' : '')) +
      'Aujourd\'hui : ' + C.date(D.aujourdhui) + '</div></nav><main class="af-main" id="af-main">';
    if (!D.grilles.length && r.page !== 'reglages') {
      html += '<div class="tr-alerte tr-alerte--attention">' + AF.ico('attention', 24) + '<div class="tr-alerte__corps"><span class="tr-alerte__titre">Aucune grille de taux horaires</span><span class="tr-alerte__texte">La main-d\'œuvre est comptée à 0 € tant que les taux (part poste, FG chantier, FG structure, sinistre) ne sont pas saisis.</span>' +
        (AF.peut('reglages') ? '<div class="tr-alerte__actions">' + AF.btn('Saisir les taux', 'aller', { v: 'principal', s: true, d: { h: 'reglages' } }) + '</div>' : '') + '</div></div>';
    }
    var p = AF.pages[r.page];
    try { html += p ? p(r) : '<div class="af-carte af-vide">Écran à venir (lot suivant du module Affaire).</div>'; } catch (e) { html += '<div class="tr-alerte tr-alerte--bloque"><div class="tr-alerte__corps"><b class="tr-alerte__titre">Erreur d\'affichage</b><span class="tr-alerte__texte">' + AF.esc(e.message) + '</span></div></div>'; console.error(e); }
    html += '</main></div></div>';
    return html;
  };
  /* la maquette redessinait #app ; dans l'appli, c'est l'onglet Affaire qui se redessine (il relit les données) */
  AF.render = function () { if (D.app && D.app.render) { D.app.render(); } };

  /* ---------- Fenêtres et message : ceux de l'appli ---------- */
  AF.ouvrir = function (titre, corps, pied) {
    var html = '<div class="af-root af-in-modal"><div class="af-fenetre" role="dialog" aria-label="' + AF.esc(titre) + '">' +
      '<h2>' + AF.esc(titre) + '</h2>' + corps + '<div class="af-pied">' + (pied || '') + AF.btn('Fermer', 'fermer', { v: 'discret' }) + '</div></div></div>';
    if (!(D.app && D.app.openModal)) { return; }
    D.app.openModal(html);
    var f = document.querySelector('.af-fenetre input, .af-fenetre select'); if (f) { try { f.focus(); } catch (e) { } }
  };
  AF.fermer = function () { if (D.app && D.app.closeModal) { D.app.closeModal(); } };
  AF.message = function (texte) { if (D.app && D.app.toast) { D.app.toast(texte); } };
  AF.val = function (id) { var el = document.getElementById(id); return el ? el.value : ''; };
  AF.num = function (id) { var v = AF.val(id).replace(/\s/g, '').replace(',', '.'); return v === '' ? NaN : Number(v); };

  /* ---------- Actions communes (inchangées) ---------- */
  AF.actions.aller = function (el) { AF.aller(el.dataset.h); };
  AF.actions.fermer = AF.fermer;
  AF.actions.fermerVoile = function (el, ev) { if (ev.target === el) { AF.fermer(); } };
  AF.actions.affaire = function (el) { AF.etat.ficheOnglet = 'debours'; AF.aller('affaire-' + el.dataset.code); };
  AF.actions.onglet = function (el) { AF.etat[el.dataset.k] = el.dataset.v; AF.render(); };

  /* appli : en capture et seulement dans le module (.af-root : l'onglet Affaire et la modale), pour que les délégations de l'appli ne voient pas ces clics */
  document.addEventListener('click', function (ev) {
    var el = ev.target.closest && ev.target.closest('[data-act]');
    if (!el || el.disabled || !el.closest('.af-root')) { return; }
    var f = AF.actions[el.dataset.act];
    if (!f) { return; }
    ev.stopPropagation(); if (el.tagName === 'BUTTON' || el.tagName === 'TR') { ev.preventDefault(); }
    if (D.app && D.app.lectureSeule && D.app.lectureSeule(el.dataset.act)) { return; }
    f(el, ev);
  }, true);
  document.addEventListener('change', function (ev) {
    var el = ev.target.closest && ev.target.closest('[data-chg]');
    if (!el || !el.closest('.af-root')) { return; }
    ev.stopPropagation();
    var k = el.dataset.chg;
    if (AF.actions['chg_' + k]) { AF.actions['chg_' + k](el); return; }
    AF.etat[k] = el.type === 'checkbox' ? el.checked : el.value;
    if (k === 'agence' && D.app && D.app.agence) { D.app.agence(el.value); }
    AF.render();
  }, true);

  AF.demarrer = function () { };
})();
