/* fld.js — 10/11 nuit (module Tracé Flotte, lot F1) : le SEUL objet de données du module, créé AVANT calc.js et les écrans de la maquette
   (qui le capturent au chargement : `var D = window.FLD`). flotte_donnees.js le REMPLIT en place (Object.assign), jamais ne le remplace.
   Mêmes clés et mêmes formes que data.js de la maquette (jeu de test : test/fixtures/flotte_demo.js). */
const FLD = {
  aujourdhui: '', edl1Ref: null, agences: [{ id: '', nom: 'Toutes' }], personnes: [], postes: {}, chantiers: [], vehicules: [], attente: [], journal: [], conducteurs: {}, pv: [],
  rdvTypes: [], types: [], ctrlItems: [], responsable: '',
  /* écritures (posées par flotte_donnees.js) et pont vers l'appli (rendu, modale, toast, écrans existants) */
  ecrire: {}, app: null
};
if (typeof window !== 'undefined') { window.FLD = FLD; }
export default FLD;
