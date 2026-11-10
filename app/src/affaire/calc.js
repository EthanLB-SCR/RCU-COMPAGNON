/* Tracé Affaire — règles de calcul. Fonctions pures sur les données (window.AFD), sans affichage.
   C'est la partie à reprendre telle quelle dans l'appli (vues SQL ou module JS). Règles : claude/cadrage-module-affaire.md. */
(function () {
  var D = function () { return window.AFD; };
  var C = {};

  /* ---------- Outils ---------- */
  C.aff = function (code) { return D().affaires.find(function (a) { return a.code === code; }); };
  C.pers = function (id) { return D().personnes.find(function (p) { return p.id === id; }); };
  C.nature = function (id) { return D().natures.find(function (n) { return n.id === id; }); };
  C.posteNom = function (id) { var p = D().postes.find(function (x) { return x.id === id; }); return p ? p.nom : id; };
  C.mois = function (date) { return String(date).slice(0, 7); };
  /* Période = { de: 'AAAA-MM' | null, a: 'AAAA-MM', ouverture: bool }. ouverture = inclure les soldes repris avant l'appli. */
  C.periode = function (de, a, ouverture) { return { de: de, a: a, ouverture: !!ouverture }; };
  C.dansPeriode = function (per, mois) { return (!per.de || mois >= per.de) && mois <= per.a; };
  C.marche = function (a) { return (a.lots || []).reduce(function (s, l) { return s + (l.marche || 0); }, 0) + (a.avenants || 0); };
  C.facturable = function (a) { return a.type === 'marche' || a.type === 'regie'; };
  C.pctRG = function (a) { return a.caution ? 0 : (a.pctRG || 0); };

  /* ---------- Taux horaires datés ---------- */
  C.grilleAu = function (date) {
    var g = null;
    D().grilles.slice().sort(function (x, y) { return x.effet < y.effet ? -1 : 1; })
      .forEach(function (x) { if (x.effet <= date) { g = x; } });
    return g;
  };
  /* null = poste non valorisé (conducteur, bureau). */
  C.taux = function (poste, date) {
    var g = C.grilleAu(date), p = D().postes.find(function (x) { return x.id === poste; });
    if (!g || !p || p.nonValorise || g.part[poste] == null) { return null; }
    var t = { part: g.part[poste], fgch: g.fgch, fgst: g.fgst, sin: g.sin };
    t.complet = t.part + t.fgch + t.fgst + t.sin;
    return t;
  };
  /* Poste valorisé ce mois-là : le poste appris si la personne est « en apprentissage ». */
  C.posteDuMois = function (pers, mois) {
    var ap = pers.appr;
    if (ap && ap.debut.slice(0, 7) <= mois && ap.fin.slice(0, 7) >= mois) { return { poste: ap.poste, appr: true }; }
    return { poste: pers.poste, appr: false };
  };

  /* ---------- Main-d'œuvre d'un chantier ---------- */
  C.mo = function (code, per) {
    var a = C.aff(code), out = { lignes: [], h: 0, nv: 0, montant: 0, prov: { part: 0, fgch: 0, fgst: 0, sin: 0 }, nonValo: [], horsChantier: a && a.type === 'depot' };
    var idx = {};
    D().heures.forEach(function (e) {
      if (e.a !== code || !C.dansPeriode(per, e.m)) { return; }
      var pers = C.pers(e.p), pm = C.posteDuMois(pers, e.m), t = C.taux(pm.poste, e.m + '-01');
      out.h += e.h; out.nv += e.nv;
      if (!t || out.horsChantier) { out.nonValo.push({ p: e.p, h: e.h, poste: pers.poste, raison: out.horsChantier ? 'Dépôt / atelier : hors chantier' : 'Poste non valorisé (frais généraux)' }); return; }
      var k = pm.poste + (pm.appr ? '/appr' : '');
      var l = idx[k] || (idx[k] = { poste: pm.poste, appr: pm.appr, h: 0, nv: 0, montant: 0, taux: t.complet, gens: {} });
      l.h += e.h; l.nv += e.nv; l.montant += e.h * t.complet; l.gens[e.p] = (l.gens[e.p] || 0) + e.h;
      out.montant += e.h * t.complet;
      out.prov.part += e.h * t.part; out.prov.fgch += e.h * t.fgch; out.prov.fgst += e.h * t.fgst; out.prov.sin += e.h * t.sin;
    });
    var ordre = D().postes.map(function (p) { return p.id; });
    out.lignes = Object.keys(idx).map(function (k) { return idx[k]; })
      .sort(function (x, y) { return ordre.indexOf(x.poste) - ordre.indexOf(y.poste) || (x.appr ? 1 : -1); });
    return out;
  };

  /* ---------- Équipements partagés (planning de Pilotage) ---------- */
  C.equip = function (code, per, avecPrevu) {
    var out = { lignes: [], jours: 0, montant: 0 }, auj = D().aujourdhui;
    D().equipements.forEach(function (eq) {
      var pl = D().planning[eq.id] || {}, j = 0;
      Object.keys(pl).forEach(function (date) {
        if (pl[date] === code && C.dansPeriode(per, C.mois(date)) && (avecPrevu || date <= auj)) { j++; }
      });
      if (j) { out.lignes.push({ eq: eq, jours: j, taux: eq.tauxJour, montant: j * eq.tauxJour }); out.jours += j; out.montant += j * eq.tauxJour; }
    });
    return out;
  };

  /* ---------- Dépenses : règle « toujours FG » ---------- */
  C.versFG = function (d) { var n = C.nature(d.nature); return d.imput === 'fg' || (n && n.fg); };
  C.depenses = function (code, per) {
    var out = { chantier: [], fg: [], alertes: [] };
    D().depenses.forEach(function (d) {
      if (d.a !== code || !C.dansPeriode(per, C.mois(d.date))) { return; }
      (C.versFG(d) ? out.fg : out.chantier).push(d);
      if (d.gd) { out.alertes.push({ d: d, texte: 'Nuit d\'hôtel en note de frais un jour de grand déplacement : l\'hébergement est déjà payé par le taux horaire.' }); }
    });
    return out;
  };

  /* ---------- Débours d'un chantier = MO + équipements + dépenses imputées au chantier (+ soldes repris) ---------- */
  C.debours = function (code, per) {
    var mo = C.mo(code, per), eq = C.equip(code, per), dp = C.depenses(code, per);
    var parNature = {};
    dp.chantier.forEach(function (d) {
      var x = parNature[d.nature] || (parNature[d.nature] = { nature: C.nature(d.nature), lignes: [], total: 0 });
      x.lignes.push(d); x.total += d.ht;
    });
    var ouv = per.ouverture ? (D().soldesOuverture[code] || null) : null;
    var achats = dp.chantier.reduce(function (s, d) { return s + d.ht; }, 0);
    return { mo: mo, equip: eq, dep: dp, parNature: parNature, ouverture: ouv, achats: achats,
      total: mo.montant + eq.montant + achats + (ouv ? ouv.debours : 0), heures: mo.h + (ouv ? ouv.heures : 0) };
  };

  /* ---------- Facturation ---------- */
  C.factures = function (code, per, lot) {
    return D().factures.filter(function (f) { return f.a === code && (!lot || f.lot === lot) && (!per || C.dansPeriode(per, C.mois(f.date))); })
      .sort(function (x, y) { return x.date < y.date ? -1 : 1; });
  };
  C.cumul = function (code, per, lot) {
    var c = { fact: 0, prod: 0, rg: 0, rgLib: 0, acompte: 0, n: 0, derniere: null };
    C.factures(code, per, lot).forEach(function (f) {
      c.fact += f.fact; c.prod += f.prod; c.rg += f.rg || 0; c.n++; c.derniere = f;
      if (f.type === 'liberationRG') { c.rgLib += f.fact; }
      if (f.type === 'acompte') { c.acompte += f.fact; }
    });
    return c;
  };
  /* Aide au calcul du produit : une proposition, jamais écrite toute seule. */
  C.aideProduit = function (type, fact, a) {
    fact = Number(fact) || 0;
    if (type === 'situation') {
      var k = 1 - (a.pctAcompte || 0) / 100 - C.pctRG(a) / 100;
      return k > 0 ? Math.round(fact / k * 100) / 100 : null;
    }
    if (type === 'acompte' || type === 'liberationRG') { return 0; }
    if (type === 'avoir') { return -Math.abs(fact); }
    return fact;
  };
  C.aideRG = function (type, prod, a) { return type === 'situation' ? Math.round(prod * C.pctRG(a)) / 100 : 0; };
  C.typesFacture = [
    { id: 'situation', nom: 'Situation' }, { id: 'acompte', nom: 'Acompte (avance)' }, { id: 'liberationRG', nom: 'Libération de RG' },
    { id: 'regie', nom: 'Régie' }, { id: 'revision', nom: 'Révision de prix' }, { id: 'ts', nom: 'Fourniture complémentaire / TS' }, { id: 'avoir', nom: 'Avoir' }
  ];
  C.typeNom = function (id) { var t = C.typesFacture.find(function (x) { return x.id === id; }); return t ? t.nom : id; };

  /* Avancement donné par Tracé Chantier. */
  C.avancement = function (a) { return a.avancement && a.avancement.total ? a.avancement.fait / a.avancement.total : null; };

  /* ---------- Résultat d'un chantier ---------- */
  C.compte = function (code, per) {
    var a = C.aff(code), c = C.cumul(code, per.ouverture ? C.periode(null, per.a) : per), d = C.debours(code, per);
    return { a: a, cumul: c, debours: d, resultat: c.prod - d.total, marge: c.prod ? (c.prod - d.total) / c.prod : null };
  };

  /* ---------- Cycle de vie ---------- */
  C.statut = function (a) {
    if (a.statut === 'termine') { return 'termine'; }
    if (a.travauxFinis) { return 'travaux_finis'; }
    return 'en_cours';
  };
  /* Terminé = facturé à 100 % du marché + avenants, RG comprise (ou dernière situation si caution). */
  C.proposerTermine = function (a) {
    if (!C.facturable(a) || a.statut === 'termine') { return false; }
    var m = C.marche(a); return m > 0 && C.cumul(a.code, null).fact >= m - 0.5;
  };
  C.rgAFacturer = function () {
    return D().affaires.filter(function (a) { return C.facturable(a) && a.statut !== 'termine' && !a.caution; }).map(function (a) {
      var c = C.cumul(a.code, null), reste = c.rg - c.rgLib, ech = null;
      if (a.travauxFinis) { var d = new Date(a.travauxFinis + 'T12:00:00'); d.setFullYear(d.getFullYear() + 1); ech = d.toISOString().slice(0, 10); }
      return { a: a, retenue: c.rg, liberee: c.rgLib, reste: reste, reception: a.travauxFinis || null, echeance: ech, echue: ech && ech <= D().aujourdhui };
    }).filter(function (x) { return x.reste > 0.5; });
  };

  /* ---------- Tableau d'aide à la facturation ---------- */
  C.cleLot = function (code, lot) { return code + '/' + lot; };
  C.suiviLot = function (mois, cle) { var s = D().suivi[mois] = D().suivi[mois] || {}; return s[cle] = s[cle] || { etapes: {} }; };
  C.etatLigne = function (mois, a, lot) {
    var s = C.suiviLot(mois, C.cleLot(a.code, lot.id)), fs = C.factures(a.code, C.periode(mois, mois), lot.id);
    if (s.rien) { return 'rien'; }
    var n = D().etapes.filter(function (e) { return s.etapes && s.etapes[e.id]; }).length;
    if (fs.length && n >= D().etapes.length - (C.pctRG(a) ? 0 : 1)) { return 'facture'; }
    if (fs.length || n) { return 'en_cours'; }
    return 'a_traiter';
  };
  C.lignesFacturation = function (mois, tous) {
    var per = C.periode(mois, mois), lignes = [];
    D().affaires.forEach(function (a) {
      if (!C.facturable(a) || a.statut === 'termine') { return; }
      var mo = C.mo(a.code, per), fm = C.factures(a.code, per), s = D().suivi[mois] || {};
      var actif = mo.h > 0 || fm.length || a.lots.some(function (l) { return s[C.cleLot(a.code, l.id)]; });
      if (!actif && !tous) { return; }
      var deb = C.debours(a.code, per), cumPrec = C.cumul(a.code, C.periode(null, mois)), av = C.avancement(a);
      a.lots.forEach(function (l, i) {
        var fl = C.factures(a.code, per, l.id), cl = C.cumul(a.code, C.periode(null, mois), l.id);
        lignes.push({ a: a, lot: l, premier: i === 0, nLots: a.lots.length, heures: mo.h, debours: deb.total, factures: fl,
          factMois: fl.reduce(function (s2, f) { return s2 + f.fact; }, 0), prodCumul: cl.prod, marcheLot: l.marche,
          prodAffaire: cumPrec.prod, avancement: av, prodAvancement: av != null ? (C.marche(a)) * av : null,
          etat: C.etatLigne(mois, a, l), suivi: C.suiviLot(mois, C.cleLot(a.code, l.id)) });
      });
    });
    return lignes;
  };

  /* ---------- Compte d'agence ---------- */
  C.typesDansSomme = ['marche', 'regie', 'sav'];
  C.agence = function (ag, per) {
    var lignes = [], tot = { fact: 0, prod: 0, deb: 0, res: 0 }, hors = [];
    D().affaires.forEach(function (a) {
      if (a.agence !== ag) { return; }
      var c = C.cumul(a.code, per.ouverture ? C.periode(null, per.a) : per), d = C.debours(a.code, per);
      if (!c.n && !d.total) { return; }
      var l = { a: a, fact: c.fact, prod: c.prod, deb: d.total, res: c.prod - d.total };
      if (C.typesDansSomme.indexOf(a.type) < 0) { hors.push(l); return; }
      lignes.push(l); tot.fact += l.fact; tot.prod += l.prod; tot.deb += l.deb; tot.res += l.res;
    });
    return { lignes: lignes, total: tot, hors: hors, banques: C.banques(ag, per) };
  };
  /* Banques : chaque heure valorisée provisionne 4 banques à l'agence du CHANTIER. Réel = grand-livre (MO, FG chantier), appli (sinistre). */
  C.banques = function (ag, per) {
    var prov = { part: 0, fgch: 0, fgst: 0, sin: 0 }, horsCh = 0, moisGL = [], manque = [];
    D().affaires.forEach(function (a) {
      if (a.agence !== ag) { return; }
      var mo = C.mo(a.code, C.periode(per.de || D().mois[0], per.a));
      if (mo.horsChantier) { horsCh += mo.h; return; }
      ['part', 'fgch', 'fgst', 'sin'].forEach(function (k) { prov[k] += mo.prov[k]; });
    });
    var reel = { part: 0, fgch: 0, fgst: null, sin: 0 }, encadrement = 0;
    D().mois.forEach(function (m) {
      if (!C.dansPeriode(C.periode(per.de || D().mois[0], per.a), m)) { return; }
      var gl = D().grandLivre[m];
      if (gl && gl.agence === ag) { reel.part += gl.mo - gl.encadrement; reel.fgch += gl.fgch; encadrement += gl.encadrement; moisGL.push(m); } else { manque.push(m); }
    });
    D().affaires.forEach(function (a) { if (a.agence === ag && a.type === 'sinistre') { reel.sin += C.debours(a.code, C.periode(per.de || D().mois[0], per.a)).total; } });
    return { prov: prov, reel: reel, horsChantier: horsCh, moisGL: moisGL, manque: manque, encadrement: encadrement };
  };

  /* ---------- Formats ---------- */
  var f0 = new Intl.NumberFormat('fr-FR', { maximumFractionDigits: 0 }), f2 = new Intl.NumberFormat('fr-FR', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
  C.eur = function (n, dec) { if (n == null || isNaN(n)) { return '—'; } return (dec || (Math.abs(n) < 100 && n % 1) ? f2.format(n) : f0.format(Math.round(n))) + ' €'; };
  C.nb = function (n) { return n == null ? '—' : f0.format(Math.round(n)); };
  C.pct = function (x) { return x == null || !isFinite(x) ? '—' : f0.format(Math.round(x * 100)) + ' %'; };
  C.date = function (d) { if (!d) { return '—'; } var p = d.split('-'); return p[2] + '/' + p[1] + '/' + p[0]; };
  var MOIS = ['janvier', 'février', 'mars', 'avril', 'mai', 'juin', 'juillet', 'août', 'septembre', 'octobre', 'novembre', 'décembre'];
  C.moisNom = function (m) { var p = m.split('-'); return MOIS[+p[1] - 1] + ' ' + p[0]; };

  window.AFC = C;
})();
