/* Tracé Affaire — copie de la maquette validée (10/11), écritures via l'adaptateur (D.ecrire) : réglages (taux datés, natures, équipements, étapes) et reprise des chantiers en cours. */
(function () {
  var AF = window.AF, C = window.AFC, D = window.AFD;
  D.reprise = D.reprise || {}; /* appli : la reprise vient de l'adaptateur (registre afaff) */

  AF.pages.reglages = function () {
    if (!AF.peut('reglages')) { return '<div class="af-carte af-vide">Réservé à l\'administrateur.</div>'; }
    var o = AF.etat.regOnglet;
    var h = '<div class="af-page"><div class="af-titre"><h1>Réglages du module</h1></div><div class="af-onglets" role="tablist">' +
      [['taux', 'Taux horaires'], ['natures', 'Natures de dépense'], ['equip', 'Équipements partagés'], ['etapes', 'Étapes de facturation']].map(function (x) {
        return '<button type="button" role="tab" data-act="onglet" data-k="regOnglet" data-v="' + x[0] + '" aria-selected="' + (o === x[0]) + '">' + x[1] + '</button>';
      }).join('') + '</div>';
    if (o === 'taux') { h += taux(); } else if (o === 'natures') { h += natures(); } else if (o === 'equip') { h += equip(); } else { h += etapes(); }
    return h + '</div>';
  };

  function taux() {
    var gs = D.grilles.slice().sort(function (a, b) { return a.effet < b.effet ? 1 : -1; });
    var h = '<div class="af-filtres"><span class="af-note">Une heure est valorisée avec la grille en vigueur à sa date : une nouvelle grille ne réécrit pas le passé.</span><span style="margin-left:auto">' + AF.btn('Nouvelle grille', 'grille', { v: 'principal', i: 'plus' }) + '</span></div>';
    gs.forEach(function (g, i) {
      h += '<div class="af-carte"><h2>Grille du ' + C.date(g.effet) + (i === 0 ? ' · en vigueur' : '') + '</h2><div class="af-tabwrap"><table class="af-table"><thead><tr><th>Poste</th><th class="n">Part poste</th><th class="n">FG chantier</th><th class="n">FG structure</th><th class="n">Sinistre</th><th class="n">Coût complet</th></tr></thead><tbody>' +
        D.postes.map(function (p) {
          if (p.nonValorise) { return '<tr><td>' + p.nom + '</td><td colspan="5" class="af-sec">Non valorisé au chantier : frais généraux</td></tr>'; }
          var pt = g.part[p.id]; return '<tr><td><b>' + p.nom + '</b></td><td class="n">' + C.eur(pt) + '</td><td class="n">' + C.eur(g.fgch) + '</td><td class="n">' + C.eur(g.fgst) + '</td><td class="n">' + C.eur(g.sin) + '</td><td class="n"><b>' + C.eur(pt + g.fgch + g.fgst + g.sin) + '/h</b></td></tr>';
        }).join('') + '</tbody></table></div><p class="af-note">En apprentissage : même taux que le poste appris, ligne à part dans le débours. Inclus dans le taux : paniers, grands déplacements, fourgon ou camion de service.</p></div>';
    });
    return h;
  }
  AF.actions.grille = function () {
    var g = D.grilles.slice().sort(function (a, b) { return a.effet < b.effet ? 1 : -1; })[0];
    var corps = '<div class="af-grille"><div class="af-champ plein"><label for="g-effet">Date d\'effet</label><input id="g-effet" type="date" value="' + (D.aujourdhui || '').slice(0, 4) + '-01-01"></div>' +
      D.postes.filter(function (p) { return !p.nonValorise; }).map(function (p) { return '<div class="af-champ"><label for="g-' + p.id + '">' + p.nom + ' · part poste (€/h)</label><input id="g-' + p.id + '" inputmode="decimal" value="' + g.part[p.id] + '"></div>'; }).join('') +
      '<div class="af-champ"><label for="g-fgch">FG chantier (€/h)</label><input id="g-fgch" inputmode="decimal" value="' + g.fgch + '"></div><div class="af-champ"><label for="g-fgst">FG structure (€/h)</label><input id="g-fgst" inputmode="decimal" value="' + g.fgst + '"></div>' +
      '<div class="af-champ"><label for="g-sin">Sinistre (€/h)</label><input id="g-sin" inputmode="decimal" value="' + g.sin + '"></div></div>';
    AF.ouvrir('Nouvelle grille de taux', corps, AF.btn('Enregistrer la grille', 'grilleOk', { v: 'principal' }));
  };
  AF.actions.grilleOk = function () {
    var g = { effet: AF.val('g-effet'), fgch: AF.num('g-fgch'), fgst: AF.num('g-fgst'), sin: AF.num('g-sin'), part: {} };
    D.postes.forEach(function (p) { if (!p.nonValorise) { g.part[p.id] = AF.num('g-' + p.id); } });
    D.grilles = D.grilles.filter(function (x) { return x.effet !== g.effet; }); D.grilles.push(g); D.ecrire.grille(g); /* appli : enregistrée en base */
    AF.fermer(); AF.render(); AF.message('Grille du ' + C.date(g.effet) + ' enregistrée : elle vaut pour les heures à partir de cette date.');
  };

  function natures() {
    return '<div class="af-tabwrap"><table class="af-table"><thead><tr><th>Nature</th><th>Compte compta</th><th>Toujours en FG de l\'agence</th></tr></thead><tbody>' +
      D.natures.map(function (n) { return '<tr><td><b>' + AF.esc(n.nom) + '</b>' + (n.aide ? '<br><span class="af-sec">' + AF.esc(n.aide) + '</span>' : '') + '</td><td>' + n.compte + '</td><td><label style="display:flex;gap:8px;align-items:center"><input type="checkbox" data-chg="natFG" data-id="' + n.id + '"' + (n.fg ? ' checked' : '') + '> ' + (n.fg ? 'Oui : jamais au débours d\'un chantier' : 'Non : au chantier si imputée au chantier') + '</label></td></tr>'; }).join('') +
      '</tbody></table></div><p class="af-note">Une nature « toujours FG » va aux frais généraux de l\'agence même quand le bon de commande ou la note de frais vise un chantier (carburants, gaz, déchets, consommables : couverts par les FG chantier du taux horaire).</p>';
  }
  AF.actions.chg_natFG = function (el) { C.nature(el.dataset.id).fg = el.checked; D.ecrire.nature(el.dataset.id, { fg: el.checked }); AF.render(); };

  function equip() {
    return '<div class="af-tabwrap"><table class="af-table"><thead><tr><th>Code</th><th>Équipement</th><th>Type</th><th class="n">Taux interne / jour</th></tr></thead><tbody>' +
      D.equipements.map(function (e) { return '<tr><td><b>' + e.id + '</b></td><td>' + AF.esc(e.nom) + '</td><td>' + AF.esc(e.type) + '</td><td class="n"><input data-chg="eqTaux" data-id="' + e.id + '" inputmode="decimal" value="' + e.tauxJour + '" style="width:90px;min-height:38px;border:2px solid var(--trait-fort);border-radius:8px;text-align:right;padding:0 8px"> €</td></tr>'; }).join('') +
      '</tbody></table></div><p class="af-note">Taux journalier interne. La liste des équipements et leur planning arrivent avec Tracé Pilotage (lot F) ; l\'appli datera les taux comme les taux horaires. Hors liste : fourgons et camions de service.</p>';
  }
  AF.actions.chg_eqTaux = function (el) { var v = Number(el.value.replace(',', '.')); if (!isNaN(v)) { D.equipements.find(function (e) { return e.id === el.dataset.id; }).tauxJour = v; D.ecrire.equip(el.dataset.id, { tauxJour: v }); AF.message('Taux de ' + el.dataset.id + ' : ' + C.eur(v) + ' par jour.'); } };

  function etapes() {
    return '<div class="af-carte"><h2>Circuit d\'une facture</h2><ol style="margin:0;padding-left:22px;line-height:1.9">' + D.etapes.map(function (e) { return '<li><b>' + e.nom + '</b> <span class="af-sec">(' + e.court + ')</span></li>'; }).join('') + '</ol>' +
      '<h3>Circuit avoir (déplié seulement si besoin)</h3><ol style="margin:0;padding-left:22px;line-height:1.9">' + D.etapesAvoir.map(function (e) { return '<li>' + e.nom + '</li>'; }).join('') + '</ol>' +
      '<p class="af-note">Repris du suivi de facturation Excel. Cochées par les personnes qui ont le droit « étapes de facturation » ; chaque case garde qui l\'a cochée et quand.</p></div>';
  }

  /* ---------- Reprise des chantiers en cours ---------- */
  AF.pages.reprise = function () {
    if (!AF.peut('reprise')) { return '<div class="af-carte af-vide">Réservé aux chargés d\'affaires et à la direction.</div>'; }
    var aff = D.affaires.filter(function (a) { return C.facturable(a) && a.statut !== 'termine' && a.agence === AF.etat.agence && AF.visible(a); });
    var nOk = aff.filter(function (a) { return D.reprise[a.code]; }).length;
    var h = '<div class="af-page"><div class="af-titre"><h1>Reprise des chantiers en cours</h1><span class="af-sous">' + nOk + ' / ' + aff.length + ' validés</span></div>' +
      '<p class="af-note" style="margin:0">Démarrage du module : le facturé vient du suivi de facturation Excel (importé). Le produit n\'y est pas : chaque chargé d\'affaires vérifie la proposition et valide le produit cumulé de ses chantiers.</p>';
    h += '<div class="af-tabwrap"><table class="af-table"><thead><tr><th>Affaire</th><th class="n">Facturé repris</th><th>Acompte · RG</th><th class="n">Produit proposé</th><th class="n">Produit retenu</th><th class="n">Débours repris</th><th>État</th></tr></thead><tbody>' +
      aff.map(function (a) {
        var fs = C.factures(a.code, null), fact = fs.reduce(function (s, f) { return s + f.fact; }, 0);
        var prop = fs.reduce(function (s, f) { return s + C.aideProduit(f.type, f.fact, a); }, 0), r = D.reprise[a.code], so = D.soldesOuverture[a.code];
        return '<tr><td><span class="af-code">' + a.code + '</span><br><b>' + AF.esc(a.nom) + '</b></td><td class="n">' + C.eur(fact) + '<br><span class="af-sec">' + fs.length + ' factures</span></td><td>' + (a.pctAcompte || 0) + ' % · ' + C.pctRG(a) + ' %' + (a.caution ? ' (caution)' : '') + '</td>' +
          '<td class="n">' + C.eur(prop) + '</td><td class="n"><input id="rp-' + a.code + '" inputmode="decimal" value="' + Math.round(r ? r.prod : prop) + '" style="width:120px;min-height:40px;border:2px solid var(--trait-fort);border-radius:8px;text-align:right;padding:0 8px"></td>' +
          '<td class="n">' + (so ? C.eur(so.debours) + '<br><span class="af-sec">au ' + C.date(so.date) + '</span>' : '—') + '</td>' +
          '<td>' + (r ? AF.pastille('ok', 'Validé par ' + AF.nomPers(r.par)) + '<br><span class="af-sec">le ' + C.date(r.le) + '</span>' : AF.btn('Valider', 'repriseOk', { s: true, v: 'principal', d: { code: a.code } })) + '</td></tr>';
      }).join('') + '</tbody></table></div><p class="af-note">Proposition = somme, facture par facture, de l\'aide au calcul (situation ÷ (1 − acompte − RG), acompte et libération de RG à 0). Les débours repris sont le solde à la date de démarrage.</p></div>';
    return h;
  };
  AF.actions.repriseOk = function (el) {
    var v = AF.num('rp-' + el.dataset.code); if (isNaN(v)) { return; }
    D.reprise[el.dataset.code] = { prod: v, par: D.moi.id, le: D.aujourdhui }; D.ecrire.reprise(el.dataset.code, D.reprise[el.dataset.code]); /* appli : enregistrée en base */
    AF.render(); AF.message('Produit repris de ' + el.dataset.code + ' validé : ' + C.eur(v) + '.');
  };
})();
