/* @ds-bundle: {"format": 4, "namespace": "Trace", "components": [{"name": "Bouton"}, {"name": "Champ"}, {"name": "Compteur"}, {"name": "Pastille"}, {"name": "Alerte"}, {"name": "CarteChantier"}, {"name": "Ligne"}, {"name": "BandeauHaut"}, {"name": "Onglets"}, {"name": "Feuille"}, {"name": "Confirmation"}, {"name": "Message"}, {"name": "Photo"}, {"name": "IconeModule"}]} */
(function () {
  var ICONES = {"aujourdhui": {"d": "M3 17h18M7.5 17a4.5 4.5 0 0 1 9 0M12 7.5v2.2M6.6 11.4 5.1 9.9M17.4 11.4l1.5-1.5M7 20.5h10", "f": ""}, "chantier": {"d": "M4.5 15.5a7.5 7.5 0 0 1 15 0M10.2 8.3V12.5M13.8 8.3V12.5M2.5 15.5h19v1.4a1.1 1.1 0 0 1-1.1 1.1H3.6a1.1 1.1 0 0 1-1.1-1.1z", "f": ""}, "concepteur": {"d": "M3.5 19.5 9 14h6l3.7-3.7M18.2 8.7a2.1 2.1 0 1 0 4.2 0a2.1 2.1 0 1 0 -4.2 0", "f": "M7.3 14a1.7 1.7 0 1 0 3.4 0a1.7 1.7 0 1 0 -3.4 0M13.3 14a1.7 1.7 0 1 0 3.4 0a1.7 1.7 0 1 0 -3.4 0"}, "commerce": {"d": "M3.5 12.3V4.8a1.3 1.3 0 0 1 1.3-1.3h7.5l8.2 8.2a1.3 1.3 0 0 1 0 1.8l-7.3 7.3a1.3 1.3 0 0 1-1.8 0zM6.5 8.2a1.7 1.7 0 1 0 3.4 0a1.7 1.7 0 1 0 -3.4 0", "f": ""}, "affaire": {"d": "M4.5 7.5h15a1.5 1.5 0 0 1 1.5 1.5v9.5a1.5 1.5 0 0 1-1.5 1.5h-15A1.5 1.5 0 0 1 3 18.5V9a1.5 1.5 0 0 1 1.5-1.5zM9 7.5V6a1.5 1.5 0 0 1 1.5-1.5h3A1.5 1.5 0 0 1 15 6v1.5M3 12.5h7.5M13.5 12.5H21M10.5 11h3v3h-3z", "f": ""}, "pilotage": {"d": "M5.5 5h13a2 2 0 0 1 2 2v12a2 2 0 0 1-2 2h-13a2 2 0 0 1-2-2V7a2 2 0 0 1 2-2zM8 3v4M16 3v4M3.5 10h17M9 15.2l2.1 2.1 4.2-4.3", "f": ""}, "flotte": {"d": "M2.5 16.5V7.5a1 1 0 0 1 1-1H14v10M14 9.5h4.1l2.9 3.6v3.4h-1.4M8 16.5h7.4M2.5 16.5h1.3M14 13h7M4.1 16.9a1.9 1.9 0 1 0 3.8 0a1.9 1.9 0 1 0 -3.8 0M15.7 16.9a1.9 1.9 0 1 0 3.8 0a1.9 1.9 0 1 0 -3.8 0", "f": ""}, "magasin": {"d": "M12 2.8l8.5 4.7v9L12 21.2l-8.5-4.7v-9zM3.5 7.5 12 12.2l8.5-4.7M12 12.2v9M7.8 5.2l8.4 4.7", "f": ""}, "compagnon": {"d": "M8.4 8a3.6 3.6 0 1 0 7.2 0a3.6 3.6 0 1 0 -7.2 0M4.5 20.5a7.5 7.5 0 0 1 15 0", "f": ""}, "equipe": {"d": "M9 8.2a3 3 0 1 0 6 0a3 3 0 1 0 -6 0M6.6 19.5a5.4 5.4 0 0 1 10.8 0M3.2 10.2a2.2 2.2 0 1 0 4.4 0a2.2 2.2 0 1 0 -4.4 0M16.4 10.2a2.2 2.2 0 1 0 4.4 0a2.2 2.2 0 1 0 -4.4 0M1.8 18.6a3.9 3.9 0 0 1 4-3.6M22.2 18.6a3.9 3.9 0 0 0-4-3.6", "f": ""}, "ok": {"d": "M5 12.5l4.5 4.5L19 7.5", "f": ""}, "en-cours": {"d": "M3.5 12a8.5 8.5 0 1 0 17 0a8.5 8.5 0 1 0 -17 0M12 7.5V12l3 2", "f": ""}, "a-valider": {"d": "M7 3.5h10M7 20.5h10M8 3.5v2.5a4 4 0 0 0 8 0V3.5M8 20.5V18a4 4 0 0 1 8 0v2.5", "f": ""}, "bloque": {"d": "M3.5 12a8.5 8.5 0 1 0 17 0a8.5 8.5 0 1 0 -17 0M8.8 8.8l6.4 6.4M15.2 8.8l-6.4 6.4", "f": ""}, "horsligne": {"d": "M5 19.5v-2M9.5 19.5v-5M14 19.5v-3M18.5 19.5V9M14 11.5V9M3.5 4l17 16", "f": ""}, "info": {"d": "M3.5 12a8.5 8.5 0 1 0 17 0a8.5 8.5 0 1 0 -17 0M12 11v5.5M12 7.8h.01", "f": ""}, "attention": {"d": "M12 3.5 21.5 20h-19zM12 10v4.5M12 17.3h.01", "f": ""}, "photo": {"d": "M4 8h3l1.6-2.5h6.8L17 8h3a1.5 1.5 0 0 1 1.5 1.5v8.5A1.5 1.5 0 0 1 20 19.5H4A1.5 1.5 0 0 1 2.5 18V9.5A1.5 1.5 0 0 1 4 8zM8.4 13.5a3.6 3.6 0 1 0 7.2 0a3.6 3.6 0 1 0 -7.2 0", "f": ""}, "chevron": {"d": "M9 5.5l6.5 6.5L9 18.5", "f": ""}, "plus": {"d": "M12 5v14M5 12h14", "f": ""}, "moins": {"d": "M5 12h14", "f": ""}, "demarrer": {"d": "M8 5.5v13l10.5-6.5z", "f": ""}, "pause": {"d": "M8.5 5.5v13M15.5 5.5v13", "f": ""}, "plan": {"d": "M9 4.5 3.5 6.5v13l5.5-2 6 2 5.5-2v-13l-5.5 2-6-2zM9 4.5v13M15 6.5v13", "f": ""}, "soudure": {"d": "M3 12h6.5M14.5 12H21M9.5 12a2.5 2.5 0 1 0 5 0a2.5 2.5 0 1 0 -5 0M12 5v2M12 17v2M7 7l1.4 1.4M15.6 15.6 17 17M17 7l-1.4 1.4M8.4 15.6 7 17", "f": ""}, "fermer": {"d": "M6 6l12 12M18 6 6 18", "f": ""}, "oeil": {"d": "M2.5 12S6 5.5 12 5.5 21.5 12 21.5 12 18 18.5 12 18.5 2.5 12 2.5 12zM9 12a3 3 0 1 0 6 0a3 3 0 1 0 -6 0", "f": ""}};
  var MODULES = [{"k": "aujourdhui", "l": "Aujourd'hui"}, {"k": "chantier", "l": "Chantier"}, {"k": "concepteur", "l": "Concepteur"}, {"k": "commerce", "l": "Commerce"}, {"k": "affaire", "l": "Affaire"}, {"k": "pilotage", "l": "Pilotage"}, {"k": "flotte", "l": "Flotte"}, {"k": "magasin", "l": "Magasin"}, {"k": "compagnon", "l": "Compagnon"}, {"k": "equipe", "l": "Équipe"}];
  var ETATS = { ok: ['ok', 'Validé'], 'en-cours': ['en-cours', 'En cours'], 'a-valider': ['a-valider', 'À valider'], bloque: ['bloque', 'Bloqué'], horsligne: ['horsligne', 'Hors réseau'], info: ['info', 'Info'] };
  function esc(s) { return String(s == null ? '' : s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;'); }
  // Icône au trait (grille 24, trait 1,75, couleur courante).
  function icone(nom, taille, epaisseur) {
    var i = ICONES[nom];
    if (!i) { return ''; }
    var t = taille || 24, e = epaisseur || 1.75;
    return '<svg class="tr-ico" viewBox="0 0 24 24" width="' + t + '" height="' + t + '" aria-hidden="true" style="width:' + t + 'px;height:' + t + 'px">' +
      '<path d="' + i.d + '" fill="none" stroke="currentColor" stroke-width="' + e + '" stroke-linecap="round" stroke-linejoin="round"></path>' +
      (i.f ? '<path d="' + i.f + '" fill="currentColor"></path>' : '') + '</svg>';
  }
  function Bouton(o) {
    o = o || {};
    var cls = 'tr-btn tr-btn--' + (o.variante || 'principal') + (o.critique ? ' tr-btn--critique' : '');
    var dedans = o.charge ? '<span class="tr-btn__rond" aria-hidden="true"></span><span>' + esc(o.texte || 'Envoi…') + '</span>'
      : (o.icone ? icone(o.icone) : '') + (o.texte ? '<span>' + esc(o.texte) + '</span>' : '');
    return '<button type="button" class="' + cls + '"' + (o.desactive ? ' disabled' : '') + (o.charge ? ' aria-busy="true"' : '') + (o.aria ? ' aria-label="' + esc(o.aria) + '"' : '') + '>' + dedans + '</button>';
  }
  function Champ(o) {
    o = o || {};
    var id = o.id || ('ch' + Math.random().toString(36).slice(2, 8));
    return '<div class="tr-champ' + (o.erreur ? ' tr-champ--erreur' : '') + '"><label class="tr-champ__libelle" for="' + id + '">' + esc(o.libelle) + '</label>' +
      '<input class="tr-champ__saisie" id="' + id + '" type="' + (o.type || 'text') + '"' + (o.numerique ? ' inputmode="decimal"' : '') + ' value="' + esc(o.valeur || '') + '" placeholder="' + esc(o.exemple || '') + '"' + (o.erreur ? ' aria-invalid="true"' : '') + '>' +
      (o.erreur ? '<span class="tr-champ__erreur">' + icone('attention') + esc(o.erreur) + '</span>' : (o.aide ? '<span class="tr-champ__aide">' + esc(o.aide) + '</span>' : '')) + '</div>';
  }
  function Compteur(o) {
    o = o || {};
    return '<div class="tr-compteur" role="group" aria-label="' + esc(o.libelle || 'Quantité') + '"><button type="button" aria-label="Moins">' + icone('moins', 28, 2.2) + '</button>' +
      '<output>' + esc(o.valeur == null ? 0 : o.valeur) + (o.unite ? '<small>' + esc(o.unite) + '</small>' : '') + '</output><button type="button" aria-label="Plus">' + icone('plus', 28, 2.2) + '</button></div>';
  }
  function Pastille(o) {
    o = o || {};
    var e = ETATS[o.etat || 'info'] || ETATS.info;
    return '<span class="tr-pastille tr-pastille--' + (o.etat || 'info') + '">' + icone(e[0], 17, 2.2) + esc(o.texte || e[1]) + '</span>';
  }
  function Alerte(o) {
    o = o || {};
    var ic = { ok: 'ok', attention: 'attention', bloque: 'bloque', horsligne: 'horsligne', info: 'info' }[o.etat || 'info'];
    var act = (o.actions || []).map(function (a, n) { return Bouton({ variante: n ? 'secondaire' : 'principal', texte: a }); }).join('');
    return '<div class="tr-alerte tr-alerte--' + (o.etat || 'info') + '" role="' + (o.etat === 'bloque' ? 'alert' : 'status') + '">' + icone(ic, 26, 2) +
      '<div class="tr-alerte__corps"><span class="tr-alerte__titre">' + esc(o.titre) + '</span>' + (o.texte ? '<span class="tr-alerte__texte">' + esc(o.texte) + '</span>' : '') +
      (act ? '<div class="tr-alerte__actions">' + act + '</div>' : '') + '</div></div>';
  }
  function CarteChantier(o) {
    o = o || {};
    var pc = o.total ? Math.round(100 * o.fait / o.total) : 0;
    return '<article class="tr-carte"><div class="tr-carte__tete"><div><div class="tr-carte__titre">' + esc(o.nom) + '</div><div class="tr-carte__lieu">' + esc(o.lieu) + '</div></div>' + Pastille({ etat: o.etat || 'en-cours', texte: o.etatTexte }) + '</div>' +
      '<div class="tr-carte__chiffres"><b>' + esc(o.fait) + ' / ' + esc(o.total) + '</b><span>' + esc(o.unite || 'soudures') + ' · ' + pc + ' %</span></div>' +
      '<div class="tr-jauge" role="progressbar" aria-valuenow="' + pc + '" aria-valuemin="0" aria-valuemax="100"><span style="width:' + pc + '%"></span></div>' +
      (o.action ? Bouton({ variante: 'principal', texte: o.action, icone: o.actionIcone || 'plan' }) : '') + '</article>';
  }
  function Ligne(o) {
    o = o || {};
    return '<a class="tr-ligne' + (o.choisie ? ' tr-ligne--choisie' : '') + '" href="#">' + (o.icone ? '<span class="tr-ligne__tuile">' + icone(o.icone, 26) + '</span>' : '') +
      '<span class="tr-ligne__texte"><span class="tr-ligne__titre">' + esc(o.titre) + '</span>' + (o.sous ? '<span class="tr-ligne__sous">' + esc(o.sous) + '</span>' : '') + '</span>' +
      '<span class="tr-ligne__fin">' + (o.etat ? Pastille({ etat: o.etat, texte: o.etatTexte }) : '') + icone('chevron', 22, 2) + '</span></a>';
  }
  function logo(t) {
    return '<svg viewBox="0 0 100 100" width="' + t + '" height="' + t + '" aria-hidden="true"><rect width="100" height="100" rx="22" fill="var(--nuit, #2B1B5A)"></rect><g transform="translate(14 14) scale(0.72)"><circle cx="50" cy="50" r="48" fill="#FFFFFF"></circle><circle cx="50" cy="50" r="40" fill="var(--nuit, #2B1B5A)"></circle><circle cx="50" cy="50" r="24" fill="#FFFFFF"></circle><circle cx="50" cy="50" r="17" fill="var(--nuit, #2B1B5A)"></circle><circle cx="22.3" cy="34" r="4" fill="#FFFFFF"></circle><circle cx="77.7" cy="34" r="4" fill="#FFFFFF"></circle></g></svg>';
  }
  function BandeauHaut(o) {
    o = o || {};
    return '<header class="tr-haut">' + logo(34) + '<span class="tr-haut__nom">Tracé' + (o.module ? ' <span>' + esc(o.module) + '</span>' : '') + '</span>' +
      '<span class="tr-haut__entreprise">' + (o.logoEntreprise ? '<img src="' + esc(o.logoEntreprise) + '" alt="' + esc(o.entreprise || '') + '">' : esc(o.entreprise || '')) + '</span></header>';
  }
  function Onglets(o) {
    o = o || {};
    return '<nav class="tr-onglets" aria-label="Modules">' + (o.onglets || []).map(function (k) {
      var m = MODULES.filter(function (x) { return x.k === k; })[0] || { k: k, l: k };
      var actif = k === o.actif;
      return '<a class="tr-onglet' + (actif ? ' tr-onglet--actif' : '') + '" href="#"' + (actif ? ' aria-current="page"' : '') + '><span class="tr-onglet__pilule">' + icone(k, 24, actif ? 2 : 1.75) + '</span>' + esc(m.l) + '</a>';
    }).join('') + '</nav>';
  }
  function Feuille(o) {
    o = o || {};
    return '<div class="tr-feuille" role="dialog" aria-label="' + esc(o.titre) + '"><span class="tr-feuille__poignee"></span><div class="tr-feuille__titre">' + esc(o.titre) + '</div>' +
      (o.choix || []).map(function (c, n) { var ch = n === o.choisi; return '<div class="tr-choix' + (ch ? ' tr-choix--choisi' : '') + '" role="radio" aria-checked="' + ch + '"><span class="tr-choix__rond">' + (ch ? icone('ok', 16, 3) : '') + '</span>' + esc(c) + '</div>'; }).join('') +
      (o.action ? Bouton({ variante: 'principal', texte: o.action, critique: true }) : '') + '</div>';
  }
  function Confirmation(o) {
    o = o || {};
    return '<div class="tr-confirm" role="alertdialog" aria-label="' + esc(o.titre) + '"><div class="tr-confirm__titre">' + esc(o.titre) + '</div><div class="tr-confirm__detail">' +
      (o.lignes || []).map(function (l) { return '<span>' + esc(l[0]) + ' <b>' + esc(l[1]) + '</b></span>'; }).join('') + '</div>' +
      Bouton({ variante: o.danger ? 'danger' : 'principal', texte: o.oui, critique: true, icone: o.danger ? 'bloque' : 'ok' }) + Bouton({ variante: 'secondaire', texte: o.non || 'Annuler' }) + '</div>';
  }
  function Message(o) {
    o = o || {};
    return '<div class="tr-message" role="status">' + icone(o.icone || 'ok', 22, 2.2) + '<span>' + esc(o.texte) + '</span>' + (o.action ? '<button type="button">' + esc(o.action) + '</button>' : '') + '</div>';
  }
  function Photo(o) {
    o = o || {};
    var prises = (o.prises || []).map(function (p) { return '<div class="tr-photo tr-photo--prise">' + esc(p) + '</div>'; }).join('');
    return '<div class="tr-photos">' + prises + '<button type="button" class="tr-photo">' + icone('photo', 30) + esc(o.texte || 'Prendre une photo') + '</button></div>';
  }
  function IconeModule(o) {
    o = o || {};
    return '<div class="tr-modules">' + MODULES.filter(function (m) { return !o.sans || o.sans.indexOf(m.k) < 0; }).map(function (m) { return '<div class="tr-module"><span class="tr-module__tuile">' + icone(m.k, 30) + '</span>' + esc(m.l) + '</div>'; }).join('') + '</div>';
  }
  window.Trace = { icone: icone, logo: logo, icones: ICONES, modules: MODULES, Bouton: Bouton, Champ: Champ, Compteur: Compteur, Pastille: Pastille, Alerte: Alerte, CarteChantier: CarteChantier, Ligne: Ligne, BandeauHaut: BandeauHaut, Onglets: Onglets, Feuille: Feuille, Confirmation: Confirmation, Message: Message, Photo: Photo, IconeModule: IconeModule };
})();
