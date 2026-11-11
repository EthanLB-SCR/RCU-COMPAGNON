/* Tracé Flotte — MOUVEMENTS À TRAITER (ui_mouvements.js de la maquette validée ; appli, 10/11 nuit : chaque ligne porte le bouton de l'écran existant — Trancher,
   Valider, Voir, Suivre, Classer → mêmes assistants qu'aujourd'hui (data-act="x", reception2.js) ; « Attribuer à… » écrit sur la fiche et l'état des lieux) — (par famille, repliables, une ligne par mouvement et son bouton) et JOURNAL / HISTORIQUE.
   Mêmes familles que reception2.js (bloc « Mouvements en attente ») : contestés, signatures, états des lieux, laissés sans preneur, à valider, à classer, sans premier état des lieux. */
(function () {
  var FL = window.FL, C = window.FLC, D = window.FLD;
  var ORDRE = [['contest', 'Contestés · à trancher', true], ['sig', 'Signatures attendues', true], ['edl', 'États des lieux attendus', true], ['laisse', 'Laissés sans preneur depuis plus de 7 jours', true], ['valider', 'À valider par un responsable', true], ['classer', 'Changements terminés · à classer', false]];
  var BTN = { contest: ['Trancher', 'mvTrancher', 'principal'], sig: ['Relancer', 'mvRelancer', 'secondaire'], edl: ['Relancer', 'mvRelancer', 'secondaire'], laisse: ['Attribuer à…', 'mvAttribuer', 'secondaire'], valider: ['Valider', 'mvValider', 'principal'], classer: ['Classer', 'mvClasser', 'discret'] };
  FL.pages.mouvements = function () {
    var m = C.mouvements(FL.etat.agence);
    var h = '<div class="af-page"><div class="af-titre"><h1>Mouvements à traiter</h1><span class="af-sous">' + m.total + ' en attente · ' + m.sansEdl1.length + ' sans premier état des lieux</span><div class="af-actions">' + FL.btn('Déclarer un changement de conducteur', 'existant', { i: 'plus', d: { x: 'switch', t: 'Ouvre « ↔ Changement de conducteur » : le responsable déclare, les gars signent' } }) + '</div></div>';
    if (!m.total && !m.sansEdl1.length) { return h + '<div class="tr-alerte tr-alerte--ok"><div class="tr-alerte__corps"><b class="tr-alerte__titre">Rien en attente</b></div></div></div>'; }
    ORDRE.forEach(function (o) { var L = m.liste.filter(function (x) { return x.k === o[0]; }); if (!L.length) { return; } var x = C.MV[o[0]], b = BTN[o[0]];
      h += '<details class="af-nat fl-mv fl-mv--' + x.sev + '"' + (o[2] ? ' open' : '') + '><summary>' + FL.ico('chevron', 18).replace('<svg', '<svg class="af-chev"') + '<span>' + x.i + ' ' + o[1] + '</span><span class="af-badge' + (x.sev === 'bad' ? ' fl-badge--bad' : x.sev === 'warn' ? ' af-badge--att' : '') + '">' + L.length + '</span></summary>' +
        '<table class="af-table"><tbody>' + L.map(function (r) { var v = C.veh(r.immat), j = -C.jours(r.depuis);
          return '<tr><td style="width:84px">' + FL.vignette(v, 'fl-vign--s') + '</td><td><button type="button" class="af-lien" data-act="veh" data-immat="' + v.immat + '">' + v.immat + '</button><br><span class="af-sec">' + FL.esc(v.marque + ' ' + v.modele) + '</span></td><td><b>' + FL.esc(r.titre) + '</b><br><span class="af-sec">' + FL.esc(r.motif) + '</span></td>' +
            '<td class="n"><span class="fl-sev--' + (j >= 7 ? 'bad' : j >= 3 ? 'warn' : 'n') + '"><b>J+' + j + '</b></span><br><span class="af-sec">depuis le ' + C.date(r.depuis) + '</span></td><td class="n">' + (r.app && r.app[1] !== 'attribuer' ? FL.btn(r.app[0], 'x', { s: true, v: r.app[2] || b[2], d: { v: r.app[1] } }) : FL.btn(b[0], b[1], { s: true, v: b[2], d: { id: r.id } })) + '</td></tr>'; }).join('') + '</tbody></table></details>'; });
    if (m.sansEdl1.length) { h += '<details class="af-nat fl-mv fl-mv--warn"' + (m.jEdl1 >= 7 ? ' open' : '') + '><summary>' + FL.ico('chevron', 18).replace('<svg', '<svg class="af-chev"') + '<span>📋 Sans premier état des lieux · J+' + m.jEdl1 + ' (rappel J+7, rouge J+14)</span><span class="af-badge af-badge--att">' + m.sansEdl1.length + '</span></summary>' +
      '<table class="af-table"><tbody>' + m.sansEdl1.map(function (v) { return '<tr><td style="width:84px">' + FL.vignette(v, 'fl-vign--s') + '</td><td><button type="button" class="af-lien" data-act="veh" data-immat="' + v.immat + '">' + v.immat + '</button><br><span class="af-sec">' + FL.esc(v.marque + ' ' + v.modele) + '</span></td><td><b>' + FL.esc(C.nomCond(v)) + '</b><br><span class="af-sec">« premier état des lieux à faire » dans son À faire</span></td><td></td></tr>'; }).join('') + '</tbody></table>' +
      '<div style="padding:10px 14px">' + (D.app && D.app.vers ? FL.btn('Relancer tout le monde', 'x', { s: true, d: { v: 'veh|relance|' } }) : FL.btn('Relancer tout le monde', 'mvRelancerTous', { s: true })) + '</div></details>'; } /* appli : la relance existante */
    return h + '</div>';
  };
  function retirer(id) { var i = D.attente.findIndex(function (x) { return x.id === id; }); if (i >= 0) { D.attente.splice(i, 1); } }
  FL.actions.mvRelancer = function (el) { var r = D.attente.find(function (x) { return x.id === el.dataset.id; }); FL.message('Relance envoyée à ' + (r.qui || 'la personne') + ' (en rouge dans son À faire, avec ton nom)'); };
  FL.actions.mvRelancerTous = function () { FL.message('Relance envoyée aux conducteurs qui ont un compte'); };
  FL.actions.mvValider = function (el) { retirer(el.dataset.id); FL.render(); FL.message('Remise validée'); };
  FL.actions.mvClasser = function (el) { retirer(el.dataset.id); FL.render(); FL.message('Changement classé'); };
  FL.actions.mvAttribuer = function (el) { var r = D.attente.find(function (x) { return x.id === el.dataset.id; });
    FL.ouvrir('Attribuer ' + r.immat, '<div class="af-champ"><label for="mv-p">À qui</label><select id="mv-p">' + D.personnes.map(function (p) { return '<option value="' + p.id + '">' + FL.esc(p.nom) + ' · ' + FL.esc(D.postes[p.poste] || '') + '</option>'; }).join('') + '</select><small>En prenant le véhicule, la personne signe l\'état des lieux de sortie (ou le conteste).</small></div>',
      FL.btn('Attribuer', 'mvAttribuerOk', { v: 'principal', d: { id: r.id } })); };
  FL.actions.mvAttribuerOk = function (el) { var r = D.attente.find(function (x) { return x.id === el.dataset.id; }), p = C.pers(FL.val('mv-p')); if (!r || !p || !D.ecrire.attribuer(r.immat, p.id)) { return; } FL.fermer(); FL.render(); FL.message(r.immat + ' attribué à ' + p.nom); }; /* appli : sur la fiche (laissé à…) et l'état des lieux de sortie */
  FL.actions.mvTrancher = function (el) { var r = D.attente.find(function (x) { return x.id === el.dataset.id; });
    FL.ouvrir('Mouvement contesté · ' + r.immat, '<div class="af-aide"><b>' + FL.esc(r.titre) + '</b><br>« ' + FL.esc(r.motif) + ' » · le ' + C.date(r.depuis) + '</div><div class="af-note">Dans l\'appli : les deux états des lieux côte à côte (photos, inventaire, cartes), puis la décision.</div><div class="af-champ"><label for="mv-n">Note</label><input id="mv-n" placeholder="ex. rayure ancienne, carte retrouvée"></div>',
      FL.btn('Refaire l\'état des lieux', 'mvTrancherOk', { d: { id: r.id, dec: 'redo' } }) + FL.btn('Clore (l\'état de ' + r.qui + ' fait foi)', 'mvTrancherOk', { v: 'principal', d: { id: r.id, dec: 'clos' } })); };
  FL.actions.mvTrancherOk = function (el) { retirer(el.dataset.id); FL.fermer(); FL.render(); FL.message(el.dataset.dec === 'clos' ? 'Mouvement clos' : 'Nouvel état des lieux demandé'); };

  /* ---------- journal et historique ---------- */
  FL.pages.journal = function () {
    var e = FL.etat; e.jrOnglet = e.jrOnglet || 'fil';
    var h = '<div class="af-page"><div class="af-titre"><h1>Journal et historique</h1></div>' + FL.onglets('jrOnglet', [['fil', 'Toutes les déclarations'], ['date', 'Qui avait quoi à une date']]);
    if (e.jrOnglet === 'date') {
      var d = e.jrDate || D.aujourdhui; var Vs = FL.vehs(); /* appli : aujourd'hui par défaut */
      h += '<div class="af-filtres"><label>Le <input type="date" data-chg="jrDate" value="' + d + '"></label></div><div class="af-tabwrap"><table class="af-table"><thead><tr><th>Véhicule</th><th>Avait le véhicule ce jour-là (le soir)</th></tr></thead><tbody>' + Vs.map(function (v) {
        var H = D.conducteurs[v.immat] || (C.nomCond(v) ? [{ nom: C.nomCond(v), du: v.depuis || v.immat1, au: null }] : []); var p = H.find(function (x) { return x.du <= d && (!x.au || x.au >= d); });
        return '<tr class="af-clic" data-act="veh" data-immat="' + v.immat + '" data-onglet="conducteurs"><td><b>' + v.immat + '</b> <span class="af-sec">' + FL.esc(v.marque + ' ' + v.modele) + '</span></td><td>' + (p ? FL.esc(p.nom) : '<span class="af-sec">personne (au dépôt ou laissé)</span>') + '</td></tr>'; }).join('') + '</tbody></table></div>';
    } else {
      var J = D.journal.filter(function (j) { var v = C.veh(j.immat); return v && C.dansAgence(v, FL.etat.agence) && (!e.jrVeh || j.immat === e.jrVeh); });
      h += '<div class="af-filtres"><label>Véhicule <select data-chg="jrVeh"><option value="">Tous</option>' + FL.vehs().map(function (v) { return '<option value="' + v.immat + '"' + (e.jrVeh === v.immat ? ' selected' : '') + '>' + v.immat + '</option>'; }).join('') + '</select></label></div>';
      h += '<section class="af-carte">' + (J.length ? J.map(function (j) { var v = C.veh(j.immat); return '<div class="fl-jr"><span class="fl-jr__pt fl-jr--' + j.st + '"></span>' + FL.vignette(v, 'fl-vign--xs') + '<span><b>' + FL.esc(j.t) + '</b><small><button type="button" class="af-lien" data-act="veh" data-immat="' + v.immat + '">' + v.immat + '</button> · ' + C.date(j.at) + ' à ' + j.at.slice(11, 16) + '</small></span></div>'; }).join('') : '<div class="af-note">Rien sur la période.</div>') + '</section>';
    }
    return h + '</div>';
  };
})();
