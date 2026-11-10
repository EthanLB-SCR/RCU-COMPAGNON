/* afd.js — 10/11 (module Tracé Affaire, lot A) : le SEUL objet de données du module, créé AVANT calc.js et les écrans de la maquette
   (qui le capturent au chargement : `var D = window.AFD`). affaire_donnees.js le REMPLIT en place (Object.assign), jamais ne le remplace.
   Mêmes clés et mêmes formes que data.js de la maquette (jeu de test : test/fixtures/affaire_demo.js). */
const AFD = {
  aujourdhui: '', moisFacturation: '', mois: [], agences: [], personas: [], postes: [], grilles: [], personnes: [], affaires: [],
  soldesOuverture: {}, natures: [], equipements: [], etapes: [], etapesAvoir: [], motifsRien: [], grandLivre: {}, grandLivreOctobre: null,
  heures: [], depenses: [], factures: [], suivi: {}, planning: {}, reprise: {}, sansAffaire: [], pret: false,
  moi: { id: null, nom: '', role: null },
  joursOuvres: function (debut, fin) {
    var out = [], d = new Date(debut + 'T12:00:00'), e = new Date(fin + 'T12:00:00');
    while (d <= e) { var w = d.getDay(); if (w > 0 && w < 6) { out.push(d.toISOString().slice(0, 10)); } d.setDate(d.getDate() + 1); }
    return out;
  },
  /* écritures (posées par affaire_donnees.js) et pont vers l'appli (rendu, modale, toast, navigation) */
  ecrire: {}, app: null
};
if (typeof window !== 'undefined') { window.AFD = AFD; }
export default AFD;
