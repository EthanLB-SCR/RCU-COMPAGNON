/* Tracé Affaire — copie de la maquette validée (10/11), écritures via l'adaptateur (D.ecrire) : fiche d'une affaire (compte du chantier, débours, factures, paramètres). */
(function () {
  var AF = window.AF, C = window.AFC, D = window.AFD;

  function perFiche() {
    var p = AF.etat.fichePer;
    return p === 'cumul' ? C.periode(null, C.mois(D.aujourdhui), true) : C.periode(p, p);
  }
  function statutPastille(a) {
    var s = C.statut(a);
    if (s === 'termine') { return AF.pastille('horsligne', 'Terminé le ' + C.date(a.termineLe)); }
    if (s === 'travaux_finis') { return AF.pastille('a-valider', 'Travaux finis · attente RG'); }
    return AF.pastille('ok', 'En cours');
  }
  function nat(titre, montant, total, corps, ouvert, sous) {
    var part = total > 0 ? Math.max(0, Math.min(100, montant / total * 100)) : 0;
    return '<details class="af-nat"' + (ouvert ? ' open' : '') + '><summary><span class="af-chev">' + AF.ico('chevron', 18) + '</span><span>' + titre + (sous ? ' <span class="af-sec">· ' + sous + '</span>' : '') + '</span>' +
      '<span class="af-montant">' + C.eur(montant) + '</span><span class="af-part" title="Part du débours"><span style="width:' + part + '%"></span></span></summary>' + corps + '</details>';
  }
  function tableDep(lignes) {
    return '<table class="af-table"><thead><tr><th>Date</th><th>Libellé</th><th>Tiers</th><th>Source</th><th class="n">Montant HT</th></tr></thead><tbody>' +
      lignes.map(function (d) {
        var src = { bc: 'Bon de commande ' + d.ref, note: 'Note de frais · ' + d.ref.replace('NDF ', ''), saisie: 'Saisie · ' + AF.nomPers(d.par) }[d.src];
        return '<tr><td>' + C.date(d.date) + '</td><td>' + AF.esc(d.lib) + '</td><td>' + AF.esc(d.tiers) + '</td><td class="af-sec">' + AF.esc(src) + '</td><td class="n">' + C.eur(d.ht) + '</td></tr>';
      }).join('') + '</tbody></table>';
  }

  AF.pages.fiche = function (r) {
    var a = C.aff(r.code);
    if (!a || !AF.visible(a)) { return '<div class="af-carte af-vide">Affaire introuvable ou hors de tes droits.</div>'; }
    var e = AF.etat, per = perFiche(), c = C.compte(a.code, per), d = c.debours, m = C.marche(a), cTot = C.cumul(a.code, null);
    var h = '<div class="af-page"><div class="af-fil"><button type="button" data-act="aller" data-h="reporting">Reporting</button> › ' + a.code + '</div>';
    h += '<div class="af-titre"><h1>' + AF.esc(a.nom) + '</h1>' + statutPastille(a) + '<span class="af-sous"><span class="af-code">' + a.code + '</span> · ' + AF.esc(a.client) + ' · ' + AF.esc(AF.nomPers(a.ca)) + ' · ' + ((C.pers(a.cond) || {}).genre === 'femme' ? 'conductrice ' : 'conducteur ') + AF.esc(AF.nomPers(a.cond)) + '</span><div class="af-actions">';
    var ouverte = a.statut !== 'termine';
    if (ouverte && AF.peut('depense')) { h += AF.btn('Ajouter une dépense', 'depense', { i: 'plus', d: { code: a.code } }); }
    if (ouverte && C.facturable(a) && AF.peut('facture')) { h += AF.btn('Saisir une facture', 'facture', { v: 'principal', i: 'plus', d: { code: a.code } }); }
    if (ouverte && C.facturable(a) && !a.travauxFinis && AF.peut('travauxFinis')) { h += AF.btn('Travaux finis', 'travauxFinis', { d: { code: a.code } }); }
    if (!ouverte && AF.peut('termine')) { h += AF.btn('Rouvrir l\'affaire', 'rouvrir', { d: { code: a.code } }); }
    h += '</div></div>';
    if (C.proposerTermine(a)) {
      h += '<div class="tr-alerte tr-alerte--ok">' + AF.ico('ok', 24) + '<div class="tr-alerte__corps"><span class="tr-alerte__titre">Facturé à 100 % du marché, RG comprise</span><span class="tr-alerte__texte">L\'affaire peut passer en Terminé : le chantier sort de Tracé Chantier, tout reste ici en lecture seule.</span>' +
        (AF.peut('termine') ? '<div class="tr-alerte__actions">' + AF.btn('Passer en Terminé', 'terminer', { v: 'principal', s: true, d: { code: a.code } }) + '</div>' : '') + '</div></div>';
    } else if (a.travauxFinis && a.statut !== 'termine') {
      var rg = C.rgAFacturer().find(function (x) { return x.a.code === a.code; });
      h += '<div class="tr-alerte tr-alerte--info">' + AF.ico('info', 24) + '<div class="tr-alerte__corps"><span class="tr-alerte__titre">Travaux finis le ' + C.date(a.travauxFinis) + '</span><span class="tr-alerte__texte">' +
        (rg ? 'RG de ' + C.eur(rg.reste) + ' à facturer à partir du ' + C.date(rg.echeance) + '. ' : '') + 'Chantier replié en bas des listes de Tracé Chantier, sorti du planning, encore pointable pour les réserves.</span></div></div>';
    }
    if (!C.facturable(a)) {
      var txt = { sav: 'Affaire SAV / garantie : coût sans produit, compté dans la somme des chantiers de l\'agence.', depot: 'Dépôt / atelier : les heures pointées ici sont hors chantier. Elles ne sont pas valorisées et ne provisionnent rien.', sinistre: 'Sinistre : traité comme un chantier sans produit. Son débours est le réel de la banque sinistre de l\'agence ; il n\'entre pas dans la somme des chantiers.' }[a.type];
      h += '<div class="tr-alerte tr-alerte--info">' + AF.ico('info', 24) + '<div class="tr-alerte__corps"><span class="tr-alerte__texte">' + txt + '</span></div></div>';
    }
    h += '<div class="af-kpis">' + (C.facturable(a) ? '<div class="af-kpi"><span>Marché + avenants</span><b>' + C.eur(m) + '</b><small>' + a.lots.length + ' lot(s) · avenants ' + C.eur(a.avenants || 0) + '</small></div>' +
      '<div class="af-kpi"><span>Facturé cumulé</span><b>' + C.eur(cTot.fact) + '</b><small>' + C.pct(m ? cTot.fact / m : null) + ' du marché</small></div>' +
      '<div class="af-kpi"><span>Produit ' + (per.ouverture ? 'cumulé' : 'du mois') + '</span><b>' + C.eur(c.cumul.prod) + '</b><small>' + (per.ouverture ? C.pct(m ? c.cumul.prod / m : null) + ' du marché' : C.moisNom(per.a)) + '</small></div>' +
      '<div class="af-kpi"><span>Avancement Tracé</span><b>' + C.pct(C.avancement(a)) + '</b><small>' + (a.avancement ? C.nb(a.avancement.fait) + ' / ' + C.nb(a.avancement.total) + ' soudures' : 'régie') + '</small></div>' : '') +
      '<div class="af-kpi"><span>Débours</span><b>' + C.eur(d.total) + '</b><small>' + C.nb(d.heures) + ' h</small></div>' +
      (C.facturable(a) ? '<div class="af-kpi ' + (c.resultat >= 0 ? 'af-kpi--ok' : 'af-kpi--bloque') + '"><span>Marge</span><b>' + C.eur(c.resultat) + '</b><small>' + C.pct(c.marge) + ' du produit</small></div>' : '') + '</div>';
    var nf = C.factures(a.code, null).length;
    h += '<div class="af-filtres"><div class="af-onglets" role="tablist">' + [['debours', 'Débours'], ['factures', 'Factures (' + nf + ')'], ['parametres', 'Paramètres']].filter(function (o) { return C.facturable(a) || o[0] === 'debours'; }).map(function (o) {
      return '<button type="button" role="tab" data-act="onglet" data-k="ficheOnglet" data-v="' + o[0] + '" aria-selected="' + (e.ficheOnglet === o[0]) + '">' + o[1] + '</button>';
    }).join('') + '</div>';
    if (e.ficheOnglet === 'debours') {
      h += '<label>Période <select data-chg="fichePer"><option value="cumul"' + (e.fichePer === 'cumul' ? ' selected' : '') + '>Depuis le début (à date)</option>' +
        D.mois.map(function (mm) { return '<option value="' + mm + '"' + (e.fichePer === mm ? ' selected' : '') + '>' + C.moisNom(mm) + '</option>'; }).join('') + '</select></label>';
    }
    h += '</div>';
    if (e.ficheOnglet === 'factures' && C.facturable(a)) { h += ongletFactures(a); }
    else if (e.ficheOnglet === 'parametres' && C.facturable(a)) { h += ongletParametres(a); }
    else { h += ongletDebours(a, d); }
    return h + '</div>';
  };

  function ongletDebours(a, d) {
    var h = '', tot = d.total;
    d.dep.alertes.forEach(function (x) {
      h += '<div class="tr-alerte tr-alerte--attention">' + AF.ico('attention', 24) + '<div class="tr-alerte__corps"><span class="tr-alerte__titre">À vérifier · ' + AF.esc(x.d.ref) + ' du ' + C.date(x.d.date) + ' (' + C.eur(x.d.ht) + ')</span><span class="tr-alerte__texte">' + AF.esc(x.texte) + '</span></div></div>';
    });
    if (d.ouverture) {
      h += nat('Repris avant l\'appli', d.ouverture.debours, tot, '<p class="af-note" style="padding:0 14px 12px">Solde du ' + C.date(d.ouverture.date) + ' (débours et ' + C.nb(d.ouverture.heures) + ' h), saisi à la reprise. Le détail est dans l\'ancien suivi.</p>', false, C.nb(d.ouverture.heures) + ' h');
    }
    var mo = d.mo;
    var moCorps = '<table class="af-table"><thead><tr><th>Poste</th><th>Qui</th><th class="n">Heures</th><th class="n">Dont non validées</th><th class="n">Coût complet</th><th class="n">Montant</th></tr></thead><tbody>' +
      mo.lignes.map(function (l) {
        return '<tr><td><b>' + C.posteNom(l.poste) + '</b>' + (l.appr ? ' · <span class="tr-pastille af-pt tr-pastille--info">en apprentissage</span>' : '') + '</td><td class="af-sec">' +
          Object.keys(l.gens).map(function (p) { return AF.esc(AF.nomPers(p)) + (C.pers(p).interim ? ' (intérim)' : '') + ' ' + l.gens[p] + ' h'; }).join(', ') + '</td><td class="n">' + C.nb(l.h) + '</td><td class="n">' + (l.nv ? l.nv + ' h' : '—') + '</td><td class="n">' + C.eur(l.taux) + '/h</td><td class="n">' + C.eur(l.montant) + '</td></tr>';
      }).join('') +
      mo.nonValo.map(function (x) { return '<tr><td class="af-sec">' + C.posteNom(x.poste) + '</td><td class="af-sec">' + AF.esc(AF.nomPers(x.p)) + ' ' + x.h + ' h</td><td class="n af-sec">' + x.h + '</td><td></td><td class="n af-sec">0 €</td><td class="af-sec">' + AF.esc(x.raison) + '</td></tr>'; }).join('') +
      '</tbody><tfoot><tr><td colspan="6" class="af-sec" style="font-weight:600">Dont provisions : part poste ' + C.eur(mo.prov.part) + ' · FG chantier ' + C.eur(mo.prov.fgch) + ' · FG structure ' + C.eur(mo.prov.fgst) + ' · sinistre ' + C.eur(mo.prov.sin) + '</td></tr></tfoot></table>';
    h += nat('Main-d\'œuvre', mo.montant, tot, moCorps, true, C.nb(mo.h) + ' h' + (mo.nv ? ', dont ' + mo.nv + ' h non validées' : ''));
    if (d.equip.lignes.length) {
      h += nat('Équipements partagés', d.equip.montant, tot, '<table class="af-table"><thead><tr><th>Équipement</th><th class="n">Jours au planning</th><th class="n">Taux interne</th><th class="n">Montant</th></tr></thead><tbody>' +
        d.equip.lignes.map(function (l) { return '<tr><td><b>' + l.eq.id + '</b> · ' + AF.esc(l.eq.nom) + '</td><td class="n">' + l.jours + '</td><td class="n">' + C.eur(l.taux) + '/j</td><td class="n">' + C.eur(l.montant) + '</td></tr>'; }).join('') +
        '</tbody></table><p class="af-note" style="padding:0 14px 10px">Jours de présence au planning des équipements partagés (module Pilotage, lié au Magasin), jusqu\'à aujourd\'hui. <button type="button" class="af-lien" data-act="aller" data-h="equipements">Voir le planning dans Pilotage</button></p>', false, d.equip.jours + ' j');
    }
    D.natures.filter(function (n) { return !n.fg; }).forEach(function (n) {
      var x = d.parNature[n.id]; if (!x) { return; }
      h += nat(n.nom, x.total, tot, tableDep(x.lignes), false, x.lignes.length + ' ligne(s)');
    });
    if (d.dep.fg.length) {
      h += '<details class="af-nat"><summary><span class="af-chev">' + AF.ico('chevron', 18) + '</span><span>Renvoyé aux FG de l\'agence <span class="af-sec">· pas dans ce débours</span></span><span class="af-montant af-sec">' +
        C.eur(d.dep.fg.reduce(function (s, x) { return s + x.ht; }, 0)) + '</span></summary><table class="af-table"><thead><tr><th>Date</th><th>Libellé</th><th>Nature</th><th>Pourquoi</th><th class="n">Montant HT</th></tr></thead><tbody>' +
        d.dep.fg.map(function (x) { var n = C.nature(x.nature); return '<tr><td>' + C.date(x.date) + '</td><td>' + AF.esc(x.lib) + '</td><td>' + AF.esc(n.nom) + '</td><td class="af-sec">' + (n.fg ? 'Nature toujours en FG chantier (couverte par le taux horaire)' : 'Imputée aux FG de l\'agence à la saisie') + '</td><td class="n">' + C.eur(x.ht) + '</td></tr>'; }).join('') +
        '</tbody></table></details>';
    }
    if (!tot) { h += '<div class="af-carte af-vide">Aucun débours sur cette période.</div>'; }
    return h;
  }

  function ongletFactures(a) {
    var fs = C.factures(a.code, null), c = C.cumul(a.code, null);
    var h = '<div class="af-tabwrap"><table class="af-table"><thead><tr><th>Date</th><th>N°</th>' + (a.lots.length > 1 ? '<th>Lot</th>' : '') + '<th>Type</th><th class="n">Facturé HT</th><th class="n">RG retenue</th><th class="n">Produit HT</th></tr></thead><tbody>' +
      (fs.length ? fs.map(function (f) {
        return '<tr><td>' + C.date(f.date) + '</td><td>' + f.num + '</td>' + (a.lots.length > 1 ? '<td>' + AF.esc(a.lots.find(function (l) { return l.id === f.lot; }).nom) + '</td>' : '') + '<td>' + C.typeNom(f.type) + '</td><td class="n">' + C.eur(f.fact) + '</td><td class="n">' + (f.rg ? C.eur(f.rg) : '—') + '</td><td class="n"><b>' + C.eur(f.prod) + '</b></td></tr>';
      }).join('') : '<tr><td colspan="7" class="af-vide">Aucune facture.</td></tr>') +
      '</tbody><tfoot><tr><td colspan="' + (a.lots.length > 1 ? 4 : 3) + '">Cumul</td><td class="n">' + C.eur(c.fact) + '</td><td class="n">' + C.eur(c.rg - c.rgLib) + ' restant</td><td class="n">' + C.eur(c.prod) + '</td></tr></tfoot></table></div>';
    h += '<p class="af-note">Facturé et produit sont saisis par l\'équipe depuis la situation Excel. Acompte de ' + (a.pctAcompte || 0) + ' %, RG de ' + C.pctRG(a) + ' %' + (a.caution ? ' (caution bancaire à la place de la RG)' : '') + '.</p>';
    return h;
  }

  function ongletParametres(a) {
    var ro = !AF.peut('parametres') || a.statut === 'termine', dis = ro ? ' disabled' : '';
    var h = '<div class="af-carte"><div class="af-grille">' +
      a.lots.map(function (l, i) { return '<div class="af-champ"><label for="p-lot' + i + '">' + AF.esc(l.nom) + ' · marché HT</label><input id="p-lot' + i + '" inputmode="decimal" value="' + l.marche + '"' + dis + '></div>'; }).join('') +
      '<div class="af-champ"><label for="p-av">Avenants HT</label><input id="p-av" inputmode="decimal" value="' + (a.avenants || 0) + '"' + dis + '></div>' +
      '<div class="af-champ"><label for="p-ac">Acompte (%)</label><input id="p-ac" inputmode="decimal" value="' + (a.pctAcompte || 0) + '"' + dis + '></div>' +
      '<div class="af-champ"><label for="p-rg">Retenue de garantie (%)</label><input id="p-rg" inputmode="decimal" value="' + (a.pctRG || 0) + '"' + dis + '></div>' +
      '<div class="af-champ"><label for="p-cau">Caution bancaire à la place de la RG</label><select id="p-cau"' + dis + '><option value="0">Non</option><option value="1"' + (a.caution ? ' selected' : '') + '>Oui</option></select></div>' +
      '<div class="af-champ"><label for="p-env">Envoi de la facture</label><select id="p-env"' + dis + '>' + ['Mail', 'Chorus', 'Plateforme client'].map(function (x) { return '<option' + (a.envoi.mode === x ? ' selected' : '') + '>' + x + '</option>'; }).join('') + '</select></div>' +
      '<div class="af-champ"><label for="p-ced">Facture cédée (factor / BPI)</label><select id="p-ced"' + dis + '><option value="0">Non</option><option value="1"' + (a.envoi.cedee ? ' selected' : '') + '>Oui</option></select></div>' +
      '<div class="af-champ plein"><label for="p-dest">Destinataires</label><input id="p-dest" value="' + AF.esc(a.envoi.dest) + '"' + dis + '><small>Repris tout seul dans le tableau d\'aide à la facturation : plus besoin de les retaper chaque mois.</small></div>' +
      '<div class="af-champ"><label for="p-rec">Date de réception (travaux finis)</label><input id="p-rec" type="date" value="' + (a.travauxFinis || '') + '"' + dis + '></div>' +
      '</div>' + (ro ? '' : '<div class="af-pied" style="margin-top:14px">' + AF.btn('Enregistrer les paramètres', 'paramOk', { v: 'principal', d: { code: a.code } }) + '</div>') + '</div>';
    return h;
  }
  AF.actions.paramOk = function (el) {
    var a = C.aff(el.dataset.code);
    a.lots.forEach(function (l, i) { var v = AF.num('p-lot' + i); if (!isNaN(v)) { l.marche = v; } });
    a.avenants = AF.num('p-av') || 0; a.pctAcompte = AF.num('p-ac') || 0; a.pctRG = AF.num('p-rg') || 0; a.caution = AF.val('p-cau') === '1';
    a.envoi = { mode: AF.val('p-env'), dest: AF.val('p-dest'), cedee: AF.val('p-ced') === '1' }; a.travauxFinis = AF.val('p-rec') || null;
    D.ecrire.affaire(a.code, { lots: a.lots, avenants: a.avenants, pctAcompte: a.pctAcompte, pctRG: a.pctRG, caution: a.caution, envoi: a.envoi, travauxFinis: a.travauxFinis }); /* appli : enregistré en base */
    AF.render(); AF.message('Paramètres de ' + a.code + ' enregistrés.');
  };

  /* ---------- Saisir une facture (aussi depuis le tableau d'aide et les RG) ---------- */
  AF.ouvrirFacture = function (code, pre) {
    pre = pre || {};
    var a = C.aff(code), opt = function (arr, v) { return arr.map(function (x) { return '<option value="' + x.id + '"' + (x.id === v ? ' selected' : '') + '>' + AF.esc(x.nom) + '</option>'; }).join(''); };
    var corps = '<div class="af-aide">' + AF.esc(a.code + ' · ' + a.nom) + ' — acompte ' + (a.pctAcompte || 0) + ' %, RG ' + C.pctRG(a) + ' %' + (a.caution ? ' (caution)' : '') + '. Tu saisis le facturé tel quel, depuis ta situation Excel.</div><div class="af-grille">' +
      (a.lots.length > 1 ? '<div class="af-champ"><label for="f-lot">Lot</label><select id="f-lot">' + opt(a.lots, pre.lot) + '</select></div>' : '<input type="hidden" id="f-lot" value="' + a.lots[0].id + '">') +
      '<div class="af-champ"><label for="f-type">Type</label><select id="f-type">' + opt(C.typesFacture, pre.type || (a.type === 'regie' ? 'regie' : 'situation')) + '</select></div>' +
      '<div class="af-champ"><label for="f-num">N° de facture</label><input id="f-num" value="FAC-D' + String(200 + D.factures.length).padStart(4, '0') + '"></div>' +
      '<div class="af-champ"><label for="f-date">Date</label><input id="f-date" type="date" value="' + (pre.date || D.moisFacturation + '-31') + '"></div>' +
      '<div class="af-champ"><label for="f-fact">Facturé HT (€)</label><input id="f-fact" inputmode="decimal" value="' + (pre.fact != null ? pre.fact : '') + '" placeholder="60 000"></div>' +
      '<div class="af-champ"><label for="f-rg">RG retenue sur cette facture (€)</label><input id="f-rg" inputmode="decimal" value=""></div>' +
      '<div class="af-champ plein"><label for="f-prod">Équivalent produit HT (€)</label><div class="tr-rang" style="gap:8px;flex-wrap:nowrap"><input id="f-prod" inputmode="decimal" value="" style="flex:1">' + AF.btn('Calculer le produit', 'aideProduit', { s: true, d: { code: code } }) + '</div><small id="f-aide">Le produit est une saisie. Le bouton propose un calcul avec l\'acompte et la RG de l\'affaire ; tu gardes ou tu corriges.</small></div>' +
      '</div><div id="f-err" class="tr-champ__erreur" style="display:none"></div>';
    AF.ouvrir('Saisir une facture', corps, AF.btn('Enregistrer la facture', 'factureOk', { v: 'principal', d: { code: code } }));
  };
  AF.actions.facture = function (el) { AF.ouvrirFacture(el.dataset.code, { lot: el.dataset.lot }); };
  AF.actions.aideProduit = function (el) {
    var a = C.aff(el.dataset.code), t = AF.val('f-type'), f = AF.num('f-fact');
    if (isNaN(f)) { document.getElementById('f-aide').textContent = 'Saisis d\'abord le montant facturé.'; return; }
    var p = C.aideProduit(t, f, a), rg = C.aideRG(t, p, a);
    document.getElementById('f-prod').value = String(p).replace('.', ',');
    if (!AF.val('f-rg')) { document.getElementById('f-rg').value = String(rg).replace('.', ','); }
    var why = { situation: C.eur(f) + ' ÷ (1 − ' + (a.pctAcompte || 0) + ' % − ' + C.pctRG(a) + ' %) = ' + C.eur(p), acompte: 'Un acompte est une avance : 0 € de produit.', liberationRG: 'La libération de RG ne produit rien : 0 €.', avoir: 'Un avoir retire du produit.' }[t] || 'Régie, révision, TS : produit = facturé.';
    document.getElementById('f-aide').textContent = 'Proposition : ' + why + ' Garde ou corrige.';
  };
  AF.actions.factureOk = function (el) {
    var a = C.aff(el.dataset.code), f = AF.num('f-fact'), p = AF.num('f-prod'), err = document.getElementById('f-err');
    if (isNaN(f) || isNaN(p)) { err.style.display = 'flex'; err.innerHTML = AF.ico('attention', 18) + 'Saisis le facturé et l\'équivalent produit (0 si c\'est un acompte).'; return; }
    var num = AF.val('f-num');
    var fx = { id: 'F' + (D.factures.length + 500), a: a.code, lot: AF.val('f-lot'), date: AF.val('f-date'), num: num, type: AF.val('f-type'), fact: f, prod: p, rg: AF.num('f-rg') || 0 };
    D.factures.push(fx); D.ecrire.facture(fx); /* appli : enregistrée en base */
    AF.fermer(); AF.render();
    AF.message('Facture ' + num + ' enregistrée : ' + C.eur(f) + ' facturé, ' + C.eur(p) + ' de produit.' + (C.proposerTermine(a) ? ' Facturé à 100 % : l\'affaire peut passer en Terminé.' : ''));
  };

  /* ---------- Ajouter une dépense ---------- */
  AF.actions.depense = function (el) {
    var code = el.dataset.code;
    var corps = '<div class="af-grille"><div class="af-champ"><label for="d-date">Date</label><input id="d-date" type="date" value="' + D.aujourdhui + '"></div>' +
      '<div class="af-champ"><label for="d-nat">Nature</label><select id="d-nat" data-chg="natureDep">' + D.natures.map(function (n) { return '<option value="' + n.id + '">' + AF.esc(n.nom) + (n.fg ? ' → FG agence' : '') + '</option>'; }).join('') + '</select></div>' +
      '<div class="af-champ"><label for="d-tiers">Fournisseur / sous-traitant</label><input id="d-tiers" placeholder="Fournisseur Démo A"></div>' +
      '<div class="af-champ"><label for="d-ht">Montant HT (€)</label><input id="d-ht" inputmode="decimal" placeholder="1 240"></div>' +
      '<div class="af-champ plein"><label for="d-lib">Ce que c\'est</label><input id="d-lib" placeholder="Vannes nues DN 80 × 4"></div>' +
      '<div class="af-champ plein"><label for="d-imp">Imputation</label><select id="d-imp"><option value="chantier">Ce chantier (' + code + ')</option><option value="fg">Frais généraux de l\'agence</option></select></div></div>' +
      '<div id="d-fg" class="af-aide" style="display:none">Cette nature est toujours en FG chantier (couverte par le taux horaire) : elle ne comptera pas dans le débours du chantier.</div><div id="d-err" class="tr-champ__erreur" style="display:none"></div>';
    AF.ouvrir('Ajouter une dépense', corps, AF.btn('Ajouter la dépense', 'depenseOk', { v: 'principal', d: { code: code } }));
  };
  AF.actions.chg_natureDep = function (el) { var n = C.nature(el.value); document.getElementById('d-fg').style.display = n.fg ? 'block' : 'none'; };
  AF.actions.depenseOk = function (el) {
    var ht = AF.num('d-ht'), err = document.getElementById('d-err');
    if (isNaN(ht) || !AF.val('d-lib')) { err.style.display = 'flex'; err.innerHTML = AF.ico('attention', 18) + 'Dis ce que c\'est et saisis le montant HT.'; return; }
    var dx = { id: 'D' + (D.depenses.length + 500), a: el.dataset.code, date: AF.val('d-date'), nature: AF.val('d-nat'), tiers: AF.val('d-tiers') || '—', lib: AF.val('d-lib'), ht: ht, src: 'saisie', ref: '', par: D.moi.id, imput: AF.val('d-imp') };
    D.depenses.push(dx); D.ecrire.depense(dx); /* appli : enregistrée en base */
    var fg = C.versFG(D.depenses[D.depenses.length - 1]);
    AF.fermer(); AF.render(); AF.message(fg ? 'Dépense enregistrée en FG de l\'agence (hors débours du chantier).' : 'Dépense ajoutée au débours de ' + el.dataset.code + '.');
  };

  /* ---------- Cycle de vie ---------- */
  AF.actions.travauxFinis = function (el) {
    AF.ouvrir('Travaux finis', '<p>Le chantier sera replié en bas des listes de Tracé Chantier et sorti du planning. Il reste pointable pour les réserves. L\'affaire passera en Terminé quand la RG sera facturée.</p><div class="af-champ"><label for="t-rec">Date de réception</label><input id="t-rec" type="date" value="' + D.aujourdhui + '"></div>',
      AF.btn('Poser « travaux finis »', 'travauxFinisOk', { v: 'principal', d: { code: el.dataset.code } }));
  };
  AF.actions.travauxFinisOk = function (el) { var a = C.aff(el.dataset.code); a.travauxFinis = AF.val('t-rec'); D.ecrire.affaire(a.code, { travauxFinis: a.travauxFinis }); AF.fermer(); AF.render(); AF.message(a.code + ' : travaux finis le ' + C.date(a.travauxFinis) + '.'); };
  AF.actions.terminer = function (el) {
    var a = C.aff(el.dataset.code), c = C.cumul(a.code, null);
    AF.ouvrir('Passer ' + a.code + ' en Terminé ?', '<div class="tr-confirm__detail"><span>Marché + avenants : <b>' + C.eur(C.marche(a)) + '</b></span><span>Facturé, RG comprise : <b>' + C.eur(c.fact) + '</b></span><span>Produit : <b>' + C.eur(c.prod) + '</b></span></div>' +
      '<p>Le chantier sort de Tracé Chantier, du planning et du pointage. Plan, soudures, DOE, débours et factures restent ici en lecture seule. Tu peux rouvrir l\'affaire pour une réserve ou du SAV.</p>',
      AF.btn('Passer en Terminé', 'terminerOk', { v: 'principal', d: { code: a.code } }));
  };
  AF.actions.terminerOk = function (el) { var a = C.aff(el.dataset.code); a.statut = 'termine'; a.termineLe = D.aujourdhui; D.ecrire.affaire(a.code, { statut: 'termine', termineLe: a.termineLe }); AF.fermer(); AF.render(); AF.message(a.code + ' est terminée et archivée.'); };
  AF.actions.rouvrir = function (el) { var a = C.aff(el.dataset.code); a.statut = 'en_cours'; a.termineLe = null; D.ecrire.affaire(a.code, { statut: 'en_cours', termineLe: null }); AF.render(); AF.message(a.code + ' rouverte : le chantier revient dans Tracé Chantier.'); };
})();
