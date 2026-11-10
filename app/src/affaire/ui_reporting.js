/* Tracé Affaire — copie de la maquette validée (10/11) : reporting des chantiers, RG à facturer. */
(function () {
  var AF = window.AF, C = window.AFC, D = window.AFD;
  var A_DATE = function () { return C.periode(null, C.mois(D.aujourdhui), true); };

  function ligneAffaire(a, per) {
    var c = C.compte(a.code, per), d = c.debours, ap = d.mo.lignes.filter(function (l) { return l.appr; }).reduce(function (s, l) { return s + l.h; }, 0);
    var m = C.marche(a), der = c.cumul.derniere;
    return '<tr class="af-clic" data-act="affaire" data-code="' + a.code + '">' +
      '<td><span class="af-code">' + a.code + '</span><br><b>' + AF.esc(a.nom) + '</b><br><span class="af-sec">' + AF.esc(a.client) + ' · ' + AF.esc(AF.nomPers(a.ca)) + '</span></td>' +
      '<td class="n">' + C.eur(m) + '</td><td>' + AF.jauge(C.avancement(a)) + '</td>' +
      '<td class="n">' + C.eur(c.cumul.fact) + '</td><td class="n">' + C.eur(c.cumul.prod) + '<br><span class="af-sec">' + C.pct(m ? c.cumul.prod / m : null) + ' du marché</span></td>' +
      '<td class="n">' + C.eur(d.total) + '</td><td class="n ' + AF.montantCl(c.resultat) + '"><b>' + C.eur(c.resultat) + '</b><br><span class="af-sec">' + C.pct(c.marge) + '</span></td>' +
      '<td class="n">' + C.nb(d.heures) + ' h' + (ap ? '<br><span class="af-sec">dont ' + ap + ' h apprentissage</span>' : '') + '</td>' +
      '<td>' + (der ? '<span class="af-sec">' + der.num + '</span><br>' + C.date(der.date) : '—') + '</td></tr>';
  }

  AF.pages.reporting = function () {
    var e = AF.etat, per = A_DATE();
    var vis = D.affaires.filter(function (a) { return a.agence === e.agence && AF.visible(a) && (!e.repCA || a.ca === e.repCA); });
    var fact = vis.filter(C.facturable), enCours = fact.filter(function (a) { return C.statut(a) === 'en_cours'; }),
      finis = fact.filter(function (a) { return C.statut(a) === 'travaux_finis'; }), termines = fact.filter(function (a) { return C.statut(a) === 'termine'; }),
      internes = vis.filter(function (a) { return !C.facturable(a); });
    var k = { m: 0, prod: 0, deb: 0, h: 0, ap: 0 };
    enCours.concat(finis).forEach(function (a) {
      var c = C.compte(a.code, per); k.m += C.marche(a); k.prod += c.cumul.prod; k.deb += c.debours.total; k.h += c.debours.heures;
      k.ap += c.debours.mo.lignes.filter(function (l) { return l.appr; }).reduce(function (s, l) { return s + l.h; }, 0);
    });
    var h = '<div class="af-page"><div class="af-titre"><h1>Reporting des chantiers</h1><span class="af-sous">Agence ' + AF.esc(D.agences.find(function (x) { return x.id === e.agence; }).nom) + ' · à date du ' + C.date(D.aujourdhui) + '</span></div>';
    if (AF.persona().role === 'chef') { return h + '<div class="af-carte af-vide">Le chef de chantier n\'a pas accès aux comptes. Il voit le planning des équipements de ses chantiers.</div></div>'; }
    h += '<div class="af-kpis"><div class="af-kpi"><span>Marchés en cours</span><b>' + C.eur(k.m) + '</b><small>' + (enCours.length + finis.length) + ' affaires</small></div>' +
      '<div class="af-kpi"><span>Produit cumulé</span><b>' + C.eur(k.prod) + '</b><small>' + C.pct(k.m ? k.prod / k.m : null) + ' des marchés</small></div>' +
      '<div class="af-kpi"><span>Débours cumulés</span><b>' + C.eur(k.deb) + '</b><small>' + C.nb(k.h) + ' h dont ' + k.ap + ' h d\'apprentissage</small></div>' +
      '<div class="af-kpi ' + (k.prod - k.deb >= 0 ? 'af-kpi--ok' : 'af-kpi--bloque') + '"><span>Marge à date</span><b>' + C.eur(k.prod - k.deb) + '</b><small>' + C.pct(k.prod ? (k.prod - k.deb) / k.prod : null) + '</small></div>' +
      '<div class="af-kpi"><span>Reste à produire</span><b>' + C.eur(k.m - k.prod) + '</b><small>marchés − produit</small></div></div>';
    var sa = (D.sansAffaire || []).filter(function (x) { return !x.agence || x.agence === e.agence; }); /* appli : calculé par l'adaptateur (chantiers avec des heures, sans affaire) */
    if (AF.peut('parametres') && sa.length) {
      h += '<div class="tr-alerte tr-alerte--attention">' + AF.ico('attention', 24) + '<div class="tr-alerte__corps"><span class="tr-alerte__titre">' + sa.length + ' chantier' + (sa.length > 1 ? 's' : '') + ' de Tracé sans affaire</span>' +
        '<span class="tr-alerte__texte">' + (sa.length === 1 ? '« ' + AF.esc(sa[0].nom) + ' » a des heures pointées mais aucune affaire : elles ne vont dans aucun débours.' : sa.map(function (x) { return '« ' + AF.esc(x.nom) + ' » (' + C.nb(x.h) + ' h)'; }).join(', ') + ' : des heures pointées mais aucune affaire, elles ne vont dans aucun débours.') + '</span>' +
        '<div class="tr-alerte__actions">' + AF.btn('Rattacher à une affaire', 'rattacher', { v: 'principal', s: true }) + '</div></div></div>';
    }
    h += '<div class="af-filtres"><div class="af-onglets" role="tablist">' +
      ['en_cours', 'termine'].map(function (o) {
        var n = o === 'en_cours' ? enCours.length + finis.length : termines.length;
        return '<button type="button" role="tab" data-act="onglet" data-k="repOnglet" data-v="' + o + '" aria-selected="' + (e.repOnglet === o) + '">' + (o === 'en_cours' ? 'En cours' : 'Terminés') + ' (' + n + ')</button>';
      }).join('') + '</div>';
    if (AF.persona().role === 'direction' || AF.persona().role === 'fact') {
      var cas = []; vis.forEach(function (a) { if (a.ca && cas.indexOf(a.ca) < 0) { cas.push(a.ca); } }); /* appli : les chargés d'affaires des affaires visibles */
      h += '<label>Chargé d\'affaires <select data-chg="repCA"><option value="">Tous</option>' + cas.map(function (id) { return '<option value="' + AF.esc(id) + '"' + (e.repCA === id ? ' selected' : '') + '>' + AF.esc(AF.nomPers(id)) + '</option>'; }).join('') + '</select></label>';
    }
    h += '</div>';
    var tete = '<thead><tr><th>Affaire</th><th class="n">Marché + avenants</th><th>Avancement Tracé</th><th class="n">Facturé</th><th class="n">Produit</th><th class="n">Débours</th><th class="n">Marge</th><th class="n">Heures</th><th>Dernière facture</th></tr></thead>';
    if (e.repOnglet === 'termine') {
      h += '<div class="af-tabwrap"><table class="af-table">' + tete + '<tbody>' + (termines.length ? termines.map(function (a) { return ligneAffaire(a, per); }).join('') : '<tr><td colspan="9" class="af-vide">Aucune affaire terminée.</td></tr>') + '</tbody></table></div>' +
        '<p class="af-note">Une affaire terminée n\'apparaît plus dans Tracé Chantier, au planning ni au pointage. Tout reste consultable ici en lecture seule.</p>';
    } else {
      h += '<div class="af-tabwrap"><table class="af-table">' + tete + '<tbody>' + enCours.map(function (a) { return ligneAffaire(a, per); }).join('') +
        (finis.length ? '<tr class="af-groupe"><td colspan="9">Travaux finis · attente RG (' + finis.length + ') — repliés en bas des listes de Tracé Chantier, sortis du planning, encore pointables pour les réserves</td></tr>' + finis.map(function (a) { return ligneAffaire(a, per); }).join('') : '') +
        '</tbody></table></div>';
      if (internes.length) {
        h += '<h3 style="margin:8px 0 0">Affaires internes de l\'agence</h3><div class="af-tabwrap"><table class="af-table"><thead><tr><th>Affaire</th><th>Type</th><th class="n">Heures</th><th class="n">Débours</th><th>Où ça va</th></tr></thead><tbody>' +
          internes.map(function (a) {
            var d = C.debours(a.code, per), ou = { sav: 'Somme des chantiers (coût sans produit)', depot: 'Hors chantier : heures non provisionnées, 0 € au débours', sinistre: 'Réel de la banque sinistre (hors somme des chantiers)' }[a.type];
            return '<tr class="af-clic" data-act="affaire" data-code="' + a.code + '"><td><span class="af-code">' + a.code + '</span><br><b>' + AF.esc(a.nom) + '</b></td><td>' + { sav: 'SAV / garantie', depot: 'Dépôt / atelier', sinistre: 'Sinistre' }[a.type] + '</td><td class="n">' + C.nb(d.heures) + ' h</td><td class="n">' + C.eur(d.total) + '</td><td class="af-sec">' + ou + '</td></tr>';
          }).join('') + '</tbody></table></div>';
      }
    }
    return h + '</div>';
  };
  /* appli (lot A) : le rattachement se fait dans Commerce → affaire → Chantiers liés ; l'écran dédié arrive avec le lot C */
  AF.actions.rattacher = function () { if (D.app && D.app.tabgo) { D.app.tabgo('commerce'); } AF.message('Rattache le chantier dans Commerce → l\'affaire → Chantiers liés.'); };

  /* ---------- RG à facturer ---------- */
  AF.pages.rg = function () {
    var l = C.rgAFacturer().filter(function (x) { return AF.visible(x.a) && x.a.agence === AF.etat.agence; });
    var h = '<div class="af-page"><div class="af-titre"><h1>RG à facturer</h1><span class="af-sous">Retenues de garantie gardées par les clients</span></div>';
    var tot = l.reduce(function (s, x) { return s + x.reste; }, 0), echu = l.filter(function (x) { return x.echue; });
    h += '<div class="af-kpis"><div class="af-kpi"><span>RG retenues</span><b>' + C.eur(tot) + '</b><small>' + l.length + ' affaires</small></div><div class="af-kpi af-kpi--bloque"><span>Échues, à facturer</span><b>' + C.eur(echu.reduce(function (s, x) { return s + x.reste; }, 0)) + '</b><small>' + echu.length + ' affaire(s)</small></div></div>';
    h += '<div class="af-tabwrap"><table class="af-table"><thead><tr><th>Affaire</th><th class="n">RG retenue</th><th class="n">Déjà libérée</th><th class="n">Reste</th><th>Réception</th><th>Échéance</th><th>État</th><th></th></tr></thead><tbody>' +
      (l.length ? l.map(function (x) {
        var etat = x.echue ? AF.pastille('bloque', 'Échue · à facturer') : (x.echeance ? AF.pastille('en-cours', 'Échéance le ' + C.date(x.echeance)) : AF.pastille('info', 'Chantier en cours'));
        return '<tr><td><span class="af-code">' + x.a.code + '</span><br><b>' + AF.esc(x.a.nom) + '</b></td><td class="n">' + C.eur(x.retenue) + '</td><td class="n">' + C.eur(x.liberee) + '</td><td class="n"><b>' + C.eur(x.reste) + '</b></td><td>' + C.date(x.reception) + '</td><td>' + C.date(x.echeance) + '</td><td>' + etat + '</td><td>' +
          (AF.peut('facture') && x.reception ? AF.btn('Saisir la facture de RG', 'factureRG', { s: true, d: { code: x.a.code, m: x.reste } }) : '') + '</td></tr>';
      }).join('') : '<tr><td colspan="8" class="af-vide">Aucune RG retenue.</td></tr>') + '</tbody></table></div>' +
      '<p class="af-note">Échéance = réception + 1 an. Quand la facture de libération est saisie et que le facturé atteint 100 % du marché, l\'appli propose de passer l\'affaire en Terminé. Les affaires sous caution bancaire n\'ont pas de RG.</p></div>';
    return h;
  };
  AF.actions.factureRG = function (el) { AF.ouvrirFacture(el.dataset.code, { type: 'liberationRG', fact: Number(el.dataset.m) }); };
})();
