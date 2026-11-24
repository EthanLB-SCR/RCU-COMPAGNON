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

  /* 24/11 (Ethan, recette L36 : « il ne se passe rien quand je clique sur ＋ Nouvelle grille ; crée la grille toi, je dois juste mettre les valeurs et pouvoir les
     modifier par la suite ») — sans grille, le formulaire plantait (il partait de la dernière grille, qui n'existait pas). Désormais : la grille SCR est posée d'office
     (tous les postes, valeurs à saisir) ; chaque grille se modifie (« ✎ Modifier », même date d'effet) ; « ＋ Nouvelle grille » part de la dernière, ou d'une grille vide. */
  function grilleVide() { return { effet: (D.aujourdhui || '2026').slice(0, 4) + '-01-01', fgch: null, fgst: null, sin: null, part: {}, vide: true }; }
  function grilleAJour() { return D.grilles.slice().sort(function (a, b) { return a.effet < b.effet ? 1 : -1; })[0] || null; }
  var eurOuVide = function (v) { return v === null || v === undefined || v === '' || !isFinite(v) ? '<span class="af-sec">à saisir</span>' : C.eur(v); };
  function taux() {
    var gs = D.grilles.slice().sort(function (a, b) { return a.effet < b.effet ? 1 : -1; });
    var vide = !gs.length;
    var h = '<div class="af-filtres"><span class="af-note">Une heure est valorisée avec la grille en vigueur à sa date : une nouvelle grille ne réécrit pas le passé.</span><span style="margin-left:auto">' + (vide ? '' : AF.btn('Nouvelle grille', 'grille', { v: 'principal', i: 'plus' })) + '</span></div>';
    if (vide) { gs = [grilleVide()]; }
    gs.forEach(function (g, i) {
      var tot = function (pt) { return [pt, g.fgch, g.fgst, g.sin].every(function (v) { return v !== null && v !== undefined && isFinite(v); }) ? '<b>' + C.eur(pt + g.fgch + g.fgst + g.sin) + '/h</b>' : '<span class="af-sec">—</span>'; };
      h += '<div class="af-carte" data-grille="' + AF.esc(g.effet) + '"><h2>' + (g.vide ? 'Grille SCR · à compléter' : 'Grille du ' + C.date(g.effet) + (i === 0 ? ' · en vigueur' : '')) + '</h2>' +
        (g.vide ? '<p class="af-note" style="margin-top:0">Les postes sont posés : il reste à saisir les valeurs (€ par heure). Elles comptent pour les heures à partir du ' + C.date(g.effet) + ' (date modifiable).</p>' : '') +
        '<div class="af-tabwrap"><table class="af-table"><thead><tr><th>Poste</th><th class="n">Part poste</th><th class="n">FG chantier</th><th class="n">FG structure</th><th class="n">Sinistre</th><th class="n">Coût complet</th></tr></thead><tbody>' +
        D.postes.map(function (p) {
          if (p.nonValorise) { return '<tr><td>' + p.nom + '</td><td colspan="5" class="af-sec">Non valorisé au chantier : frais généraux</td></tr>'; }
          var pt = g.part[p.id]; var ok = pt !== null && pt !== undefined && isFinite(pt);
          return '<tr><td><b>' + p.nom + '</b></td><td class="n">' + (ok ? C.eur(pt) : eurOuVide(null)) + '</td><td class="n">' + eurOuVide(g.fgch) + '</td><td class="n">' + eurOuVide(g.fgst) + '</td><td class="n">' + eurOuVide(g.sin) + '</td><td class="n">' + (ok ? tot(pt) : '<span class="af-sec">—</span>') + '</td></tr>';
        }).join('') + '</tbody></table></div>' +
        '<div style="display:flex;gap:8px;flex-wrap:wrap;margin-top:10px">' + (g.vide ? AF.btn('Saisir les taux', 'grille', { v: 'principal', i: 'plus' }) : AF.btn('Modifier cette grille', 'grilleEdit', { d: { effet: g.effet } })) + '</div>' +
        '<p class="af-note">En apprentissage : même taux que le poste appris, ligne à part dans le débours. Inclus dans le taux : paniers, grands déplacements, fourgon ou camion de service.</p></div>';
    });
    return h;
  }
  function grilleForm(g, edit) {
    var v = function (x) { return x === null || x === undefined || !isFinite(x) ? '' : String(x).replace('.', ','); };
    return '<div class="af-grille"><div class="af-champ plein"><label for="g-effet">Date d\'effet</label><input id="g-effet" type="date" value="' + AF.esc(g.effet) + '"' + (edit ? ' readonly aria-readonly="true"' : '') + '>' + (edit ? '<span class="af-sec">Pour une autre date : « Nouvelle grille ».</span>' : '') + '</div>' +
      D.postes.filter(function (p) { return !p.nonValorise; }).map(function (p) { return '<div class="af-champ"><label for="g-' + p.id + '">' + p.nom + ' · part poste (€/h)</label><input id="g-' + p.id + '" inputmode="decimal" autocomplete="off" value="' + v(g.part[p.id]) + '"></div>'; }).join('') +
      '<div class="af-champ"><label for="g-fgch">FG chantier (€/h)</label><input id="g-fgch" inputmode="decimal" autocomplete="off" value="' + v(g.fgch) + '"></div><div class="af-champ"><label for="g-fgst">FG structure (€/h)</label><input id="g-fgst" inputmode="decimal" autocomplete="off" value="' + v(g.fgst) + '"></div>' +
      '<div class="af-champ"><label for="g-sin">Sinistre (€/h)</label><input id="g-sin" inputmode="decimal" autocomplete="off" value="' + v(g.sin) + '"></div><p class="af-note plein" id="g-err" role="alert" style="color:#9b2c22;margin:0"></p></div>';
  }
  AF.actions.grille = function () {
    var g = grilleAJour() || grilleVide();
    var base = { effet: g.vide ? g.effet : (D.aujourdhui || '').slice(0, 4) + '-01-01', fgch: g.fgch, fgst: g.fgst, sin: g.sin, part: Object.assign({}, g.part) };
    if (!g.vide && base.effet <= g.effet) { base.effet = D.aujourdhui || base.effet; } /* une nouvelle grille vient après la dernière : aujourd'hui par défaut */
    AF.etat.grilleEdit = null;
    AF.ouvrir(g.vide ? 'Grille de taux SCR' : 'Nouvelle grille de taux', grilleForm(base, false), AF.btn('Enregistrer la grille', 'grilleOk', { v: 'principal' }));
  };
  AF.actions.grilleEdit = function (el) {
    var eff = el && el.dataset ? el.dataset.effet : ''; var g = D.grilles.find(function (x) { return x.effet === eff; });
    if (!g) { AF.message('Grille introuvable'); return; }
    AF.etat.grilleEdit = g.effet;
    AF.ouvrir('Modifier la grille du ' + C.date(g.effet), grilleForm(g, true), AF.btn('Enregistrer les modifications', 'grilleOk', { v: 'principal' }));
  };
  AF.actions.grilleOk = function () {
    var err = function (t) { var e = document.getElementById('g-err'); if (e) { e.textContent = t; } AF.message(t); };
    var effet = AF.val('g-effet'); if (!/^\d{4}-\d{2}-\d{2}$/.test(effet)) { err('Indique la date d\'effet de la grille.'); return; }
    var lire = function (id, nom) { var raw = AF.val(id).trim(); if (raw === '') { return { vide: true }; } var n = AF.num(id); if (!isFinite(n) || n < 0 || n > 500) { return { faux: nom + ' : « ' + raw + ' » n\'est pas un montant valable (0 à 500 € par heure).' }; } return { n: Math.round(n * 100) / 100 }; };
    var g = { effet: effet, part: {} }; var faux = null, manque = [];
    [['fgch', 'FG chantier'], ['fgst', 'FG structure'], ['sin', 'Sinistre']].forEach(function (x) { var r = lire('g-' + x[0], x[1]); if (r.faux) { faux = faux || r.faux; } else if (r.vide) { manque.push(x[1]); g[x[0]] = 0; } else { g[x[0]] = r.n; } });
    D.postes.forEach(function (p) { if (p.nonValorise) { return; } var r = lire('g-' + p.id, p.nom); if (r.faux) { faux = faux || r.faux; } else if (r.vide) { manque.push(p.nom); } else { g.part[p.id] = r.n; } });
    if (faux) { err(faux); return; }
    if (!Object.keys(g.part).length) { err('Saisis au moins la part poste d\'un poste.'); return; }
    D.grilles = D.grilles.filter(function (x) { return x.effet !== g.effet; }); D.grilles.push(g); D.ecrire.grille(g); /* appli : enregistrée en base */
    var edit = AF.etat.grilleEdit === g.effet; AF.etat.grilleEdit = null;
    AF.fermer(); AF.render(); AF.message((edit ? 'Grille du ' + C.date(g.effet) + ' modifiée' : 'Grille du ' + C.date(g.effet) + ' enregistrée : elle vaut pour les heures à partir de cette date') + (manque.length ? ' — à compléter : ' + manque.join(', ') : '') + '.');
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
