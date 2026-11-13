/* Tracé Flotte — cadre, menu par sous-parties, fenêtres, actions. ui_base.js de la maquette validée (10/11/2026), adapté à l'appli comme celui d'Affaire :
   - plus d'en-tête propre ni de pastille « maquette » : le bandeau « Tracé Flotte » et le menu des modules sont ceux de l'appli ; FL.html() rend le cadre (menu + écran)
     que l'onglet Parc insère (flotte_donnees.js → parcSeg) ;
   - route en mémoire (FL.etat.route), pas de #hash ; fenêtre et message de l'appli (FLD.app) ; clics délégués limités à .fl-root ;
   - sélecteur d'agence = droits du compte (responsable flotte / direction : toutes ; responsable d'exploitation : son secteur) ;
   - date du jour réelle (FLD.aujourdhui) ; les boutons « existant » ouvrent les écrans existants de l'appli (FLD.app.existant).
   JavaScript sans bibliothèque, comme l'appli. */
(function () {
  var D = window.FLD, C = window.FLC;
  var FL = window.FL = { pages: {}, actions: {}, etat: {
    route: 'accueil', agence: '', calAn: 2026, calMois: 10, calVue: 'mois', calFiltre: {}, vehQ: '', vehType: '', vehEtat: '', ficheOnglet: 'resume', mvOnglet: 'attente', pkAujourdhui: false, pkEtiq: 'immat', pkSel: null
  } };
  /* le mois affiché par le calendrier : celui d'aujourd'hui (posé par flotte_donnees.js au premier remplissage) */
  FL.moisCourant = function () { var d = String(D.aujourdhui || '').slice(0, 10); if (!/^\d{4}-\d{2}-\d{2}$/.test(d)) { return; } FL.etat.calAn = +d.slice(0, 4); FL.etat.calMois = +d.slice(5, 7) - 1; };

  FL.esc = function (s) { return String(s == null ? '' : s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;'); };
  FL.ico = function (n, t) { return window.Trace && Trace.icone ? Trace.icone(n, t || 20) : ''; };
  FL.pastille = function (etat, texte) { var ic = { ok: 'ok', 'en-cours': 'en-cours', 'a-valider': 'a-valider', bloque: 'bloque', info: 'info' }; return '<span class="tr-pastille af-pt tr-pastille--' + etat + '">' + FL.ico(ic[etat] || 'info', 16) + FL.esc(texte) + '</span>'; };
  FL.etatPastille = function (v) { var e = C.etat(v), a = C.alertes(v); return e === 'bad' ? FL.pastille('bloque', a.filter(function (x) { return x.sev === 'bad'; }).length > 1 ? 'Bloquant ×' + a.filter(function (x) { return x.sev === 'bad'; }).length : 'Bloquant') : e === 'warn' ? FL.pastille('a-valider', 'À surveiller') : FL.pastille('ok', 'RAS'); };
  FL.btn = function (texte, act, o) { o = o || {}; var cl = 'tr-btn af-btn tr-btn--' + (o.v || 'secondaire') + (o.s ? ' af-btn-s' : ''); var data = Object.keys(o.d || {}).map(function (k) { return ' data-' + k + '="' + FL.esc(o.d[k]) + '"'; }).join('');
    return '<button type="button" class="' + cl + '" data-act="' + act + '"' + data + (o.off ? ' disabled title="' + FL.esc(o.off) + '"' : '') + '>' + (o.i ? FL.ico(o.i, 18) : '') + '<span>' + FL.esc(texte) + '</span></button>'; };
  FL.onglets = function (cle, liste) { return '<div class="af-onglets" role="tablist">' + liste.map(function (o) { return '<button type="button" role="tab" data-act="onglet" data-k="' + cle + '" data-v="' + o[0] + '" aria-selected="' + (FL.etat[cle] === o[0]) + '">' + FL.esc(o[1]) + (o[2] ? ' <span class="af-badge' + (o[3] ? ' af-badge--att' : '') + '">' + o[2] + '</span>' : '') + '</button>'; }).join('') + '</div>'; };
  FL.vehs = function () { return D.vehicules.filter(function (v) { return C.dansAgence(v, FL.etat.agence); }); };
  /* photo de l'état des lieux initial si elle existe (comme vehPic), sinon la vignette 3D (lot F4), sinon le dessin du type (vehSVG de l'appli) ; o.troisD : toujours la 3D */
  FL.vignette = function (v, cl, o) {
    if (v.photo && !(o && o.troisD)) { return '<img class="fl-vign fl-vign--photo ' + (cl || '') + '" src="' + FL.esc(v.photo) + '" alt="Photo ' + FL.esc(v.immat) + '">'; }
    var u = null; try { u = window.FL3D ? FL3D.thumb(v, { regles: FL.regles() }) : null; } catch (e) { u = null; }
    if (u) { return '<img class="fl-vign ' + (cl || '') + '" src="' + u + '" alt="' + FL.esc(v.marque + ' ' + v.modele) + '">'; }
    var svg = null; try { svg = D.app && D.app.dessin ? D.app.dessin(v) : null; } catch (e) { svg = null; }
    return svg ? '<span class="fl-vign fl-vign--dessin ' + (cl || '') + '">' + svg + '</span>' : '<span class="fl-vign fl-vign--vide ' + (cl || '') + '">' + FL.ico('flotte', 28) + '</span>';
  };
  FL.regles = function () { return FL.etat.regles || (window.FL3D ? FL3D.REGLES_GABARIT : null); };
  FL.ouvrirVeh = function (immat, onglet) { FL.etat.ficheOnglet = onglet || 'resume'; FL.etat.ficheVue = null; FL.aller('veh-' + immat); };

  /* ---------- Cadre : menu à gauche par sous-parties ---------- */
  var NAV = [
    { titre: 'Suivi' },
    { id: 'accueil', nom: 'Accueil', i: 'aujourdhui' },
    { id: 'calendrier', nom: 'Calendrier des échéances', i: 'pilotage' },
    { id: 'parking', nom: 'Parking 3D', i: 'flotte', lot: 'F4' },
    { titre: 'Parc' },
    { id: 'vehicules', nom: 'Véhicules', i: 'flotte' },
    { id: 'qui', nom: 'Qui a quoi', i: 'equipe' },
    { titre: 'Mouvements' },
    { id: 'mouvements', nom: 'À traiter', i: 'a-valider' },
    { id: 'journal', nom: 'Journal et historique', i: 'plan' },
    { titre: 'Paramètres' },
    { id: 'reglages', nom: 'Silhouettes 3D', i: 'concepteur', lot: 'F4' },
    { x: 'cfg', nom: 'Pack véhicules', i: 'plan', t: 'Pack véhicules : états des lieux, inventaires, chartes (écran existant de l\'appli)' }
  ];
  FL.route = function () { var h = String(FL.etat.route || 'accueil'); if (h.indexOf('veh-') === 0) { return { page: 'fiche', immat: h.slice(4) }; } return { page: h || 'accueil' }; };
  FL.aller = function (h) { FL.etat.route = h || 'accueil'; if (D.app && D.app.vers) { try { D.app.vers(FL.route()); } catch (e) { console.warn(e); } } FL.render(); try { window.scrollTo(0, 0); } catch (e) { } };
  function badges() { var ag = FL.etat.agence, b = {}; try { b.calendrier = C.toutesEcheances(ag).filter(function (e) { return e.j < 0; }).length; var m = C.mouvements(ag); b.mouvements = m.total; } catch (e) { console.warn(e); } return b; }
  /* le HTML du module (menu + écran) : l'appli l'insère dans l'onglet Parc (rubrique Flotte) */
  FL.html = function () {
    if (FL.avantRendu) { try { FL.avantRendu(); } catch (e) { } FL.avantRendu = null; }
    var r = FL.route(), b = badges(), html = '';
    html += '<div class="af-root fl-root"><div class="af-cadre"><nav class="af-nav" aria-label="Module Flotte">';
    NAV.forEach(function (n) {
      if (n.titre) { html += '<div class="af-nav__titre">' + n.titre + '</div>'; return; }
      /* 10/11 nuit : entrée vers un écran existant de l'appli (Pack véhicules) — seulement dans l'appli, pour qui a le droit */
      if (n.x) { if (D.app && D.app.peut && D.app.peut(n.x)) { html += '<button type="button" data-act="existant" data-x="' + n.x + '" title="' + FL.esc(n.t || '') + '">' + FL.ico(n.i, 20) + '<span>' + n.nom + '</span></button>'; } return; }
      var cur = r.page === n.id || (r.page === 'fiche' && n.id === 'vehicules');
      html += '<button type="button" data-act="aller" data-h="' + n.id + '"' + (cur ? ' aria-current="page"' : '') + (n.lot && !FL.pages[n.id] && !(n.id === 'parking' && D.app && D.app.parking3d) ? ' title="Lot ' + n.lot + ' : à venir"' : '') + '>' + FL.ico(n.i, 20) + '<span>' + n.nom + '</span>' + (b[n.id] ? '<span class="af-badge' + (n.id === 'calendrier' ? ' fl-badge--bad' : '') + '">' + b[n.id] + '</span>' : '') + '</button>';
    });
    var ag = D.agences.find(function (a) { return a.id === FL.etat.agence; });
    html += '<div class="af-nav__pied">' + (D.agences.length > 1 ? '<label class="af-qui" style="margin:0 0 8px;display:flex">Agence <select data-chg="agence" aria-label="Agence">' + D.agences.map(function (a) { return '<option value="' + FL.esc(a.id) + '"' + (a.id === FL.etat.agence ? ' selected' : '') + '>' + FL.esc(a.nom) + '</option>'; }).join('') + '</select></label>' : (ag ? 'Agence ' + FL.esc(ag.nom) + '<br>' : '')) +
      'Aujourd\'hui : ' + C.date(D.aujourdhui) + (D.responsable ? '<br>Responsable flotte : ' + FL.esc(D.responsable) : '') + '</div></nav><main class="af-main" id="fl-main">';
    var p = FL.pages[r.page];
    if (!p && r.page === 'parking' && D.app && D.app.parking3d) { p = parkingPage; } /* 12/11 : le parking 3D du dépôt (Monde 3D de l'appli) */
    try { html += p ? p(r) : '<div class="af-carte af-vide">Écran à venir (lot suivant du module Flotte).' + (r.page === 'parking' ? ' Le parking 3D du dépôt reste dans le Monde 3D en attendant.' : '') + '</div>'; } catch (e) { html += '<div class="tr-alerte tr-alerte--bloque"><div class="tr-alerte__corps"><b class="tr-alerte__titre">Erreur d\'affichage</b><span class="tr-alerte__texte">' + FL.esc(e.message) + '</span></div></div>'; console.error(e); }
    html += '</main></div></div>';
    if (FL.apresRendu) { var f = FL.apresRendu; FL.apresRendu = null; setTimeout(function () { try { f(); } catch (e) { console.error(e); } }, 0); }
    return html;
  };
  /* 12/11 (Ethan : « modélise la vue 3D visible quand on appuie sur Parking 3D ») : la 3D du parking, celle du Monde 3D de l'appli (chaque véhicule à sa place,
     son conducteur), montée dans l'écran du module ; « voir sur le parking » depuis un véhicule le montre de près (FL.etat.pkSel) */
  function parkingPage() {
    var h = ''; try { h = D.app.parking3d() || ''; } catch (e) { h = ''; }
    return '<div class="af-page fl-parking"><div class="af-titre"><h1>Parking 3D</h1><span class="af-sous">le parking du dépôt : chaque véhicule à sa place, son conducteur ; touche un véhicule pour le voir de près</span></div>' +
      (h || '<div class="af-carte af-vide">Le parking 3D fait partie du Monde 3D (Labo) : l\'administrateur l\'allume dans Équipe → 🌍 Monde 3D · Labo, pour les testeurs.</div>') + '</div>';
  }
  /* la maquette redessinait #app ; dans l'appli, c'est l'onglet Parc qui se redessine (il relit les données) */
  FL.render = function () { if (D.app && D.app.render) { D.app.render(); } };

  /* ---------- Fenêtres et message : ceux de l'appli ---------- */
  FL.ouvrir = function (titre, corps, pied, cls) {
    FL.fermerTT();
    var html = '<div class="af-root fl-root af-in-modal"><div class="af-fenetre ' + (cls || '') + '" role="dialog" aria-label="' + FL.esc(titre) + '"><h2>' + FL.esc(titre) + '</h2>' + corps + '<div class="af-pied">' + (pied || '') + FL.btn('Fermer', 'fermer', { v: 'discret' }) + '</div></div></div>';
    if (!(D.app && D.app.openModal)) { return; }
    D.app.openModal(html);
    var f = document.querySelector('.fl-root .af-fenetre input, .fl-root .af-fenetre select'); if (f) { try { f.focus(); } catch (e) { } }
  };
  FL.fermerTT = function () { if (FL._modalTT) { try { FL._modalTT.dispose(); } catch (e) { } FL._modalTT = null; } };
  FL.fermer = function () { FL.fermerTT(); if (D.app && D.app.closeModal) { D.app.closeModal(); } };
  FL.message = function (texte) { if (D.app && D.app.toast) { D.app.toast(texte); } };
  FL.val = function (id) { var el = document.getElementById(id); return el ? el.value : ''; };

  /* ---------- Actions communes ---------- */
  FL.actions.aller = function (el) { FL.aller(el.dataset.h); };
  FL.actions.fermer = FL.fermer;
  FL.actions.fermerVoile = function (el, ev) { if (ev.target === el) { FL.fermer(); } };
  FL.actions.veh = function (el) { FL.fermer(); FL.ouvrirVeh(el.dataset.immat, el.dataset.onglet); };
  FL.actions.onglet = function (el) { FL.etat[el.dataset.k] = el.dataset.v; FL.render(); };
  /* boutons qui ouvrent les écrans existants de l'appli (assistants d'état des lieux, validation…) ; sans écran correspondant : le message de la maquette */
  FL.actions.existant = function (el) { if (D.app && D.app.existant && D.app.existant(el.dataset.x || '', el)) { return; } FL.message(el.dataset.t || 'Écran existant de l\'appli'); };

  /* appli : en capture et seulement dans le module (.fl-root : la rubrique Flotte et ses fenêtres), pour que les délégations de l'appli ne voient pas ces clics ;
     une action que le module ne connaît pas (data-act="x", "fl"…) continue vers l'appli */
  document.addEventListener('click', function (ev) {
    var el = ev.target.closest && ev.target.closest('[data-act]');
    if (!el || el.disabled || !el.closest('.fl-root')) { return; }
    var f = FL.actions[el.dataset.act];
    if (!f) { return; }
    ev.stopPropagation(); if (el.tagName === 'BUTTON' || el.tagName === 'TR' || el.tagName === 'A') { ev.preventDefault(); }
    if (D.app && D.app.lectureSeule && D.app.lectureSeule(el.dataset.act)) { return; }
    f(el, ev);
  }, true);
  document.addEventListener('change', function (ev) {
    var el = ev.target.closest && ev.target.closest('[data-chg]');
    if (!el || !el.closest('.fl-root')) { return; }
    ev.stopPropagation();
    var k = el.dataset.chg;
    if (FL.actions['chg_' + k]) { FL.actions['chg_' + k](el); return; }
    FL.etat[k] = el.type === 'checkbox' ? el.checked : el.value;
    if (k === 'agence' && D.app && D.app.agence) { D.app.agence(el.value); }
    FL.render();
  }, true);
  document.addEventListener('input', function (ev) {
    var el = ev.target.closest && ev.target.closest('[data-in]');
    if (!el || !el.closest('.fl-root')) { return; }
    ev.stopPropagation();
    FL.etat[el.dataset.in] = el.value; clearTimeout(FL._t);
    FL._t = setTimeout(function () { var pos = el.selectionStart; FL.render(); setTimeout(function () { var n = document.querySelector('.fl-root [data-in="' + el.dataset.in + '"]'); if (n) { n.focus(); try { n.setSelectionRange(pos, pos); } catch (e) { } } }, 0); }, 180);
  }, true);
  FL.demarrer = function () { };
})();
