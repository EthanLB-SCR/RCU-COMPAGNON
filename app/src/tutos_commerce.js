// tutos_commerce.js — 31/10/2026 : TUTORIELS DÉTAILLÉS (Ethan : « un tuto par module qui décrit toutes les options, puis des tutos par option, vastes, pour que tout le monde
// sache se servir de toutes les options »). Déclaratif, lu par tuto.js : clé « module » = vue d'ensemble du module (une étape par option), « module:option » = le
// tutoriel détaillé de l'option. Une étape = {sel:'cible CSS (la 1re visible est surlignée ; sans cible → carte au centre)', titre:'…', texte:'…', si:(api)=>bool}
// (api.can(droit), api.feat(option)). Le nom affiché de chaque option est dans NOMS.
//
// 31/10 (lot cm) : Commerce, Flotte, Magasin. Les clés sont celles que donne TRACE.tuto.where() sur chaque écran (relevées dans l'appli) :
//   commerce          Commerce (liste des affaires, ses 5 rubriques) — vaut aussi pour une affaire ouverte depuis la liste (where() reste « commerce »)
//   commerce:aff      une affaire ouverte depuis Aujourd'hui (« Offre … à remettre ») ou tout lien qui ouvre la sous-vue « aff »
//   flotte            Parc véhicules (Véhicules, Échéances, Mouvements, Qui a quoi, Historique, fiche d'un véhicule) ; « flotte:flotte » (le parc ouvert en sous-vue,
//                     ex. alertes d'Aujourd'hui, « 🕓 Historique complet ») retombe sur cette vue d'ensemble
//   flotte:x:veh      états des lieux : assistant de remise / restitution / véhicule laissé, validation, changement de conducteur, ⚙ Pack véhicules
//   magasin           Magasin (Demandes, Fiches type, Stock, À commander, Mouvements, Catalogue ; une demande ouverte) — where() ne distingue pas les rubriques
//   magasin:materiel  la rubrique 🔧 Matériel
// Barres de puces qui défilent à l'horizontale au téléphone (rubriques Commerce, onglets d'une affaire, rubriques Magasin) : une puce hors écran n'est pas surlignée
// par le moteur → on vise la puce quand elle est toujours dans l'écran (les 2-3 premières), sinon la barre entière (« glisse la barre » dans le texte).
const C=(a,k)=>!a||!a.can||a.can(k);      /* a le droit (vrai sans API : catalogue, tests) */
const F=(a,k)=>!a||!a.feat||a.feat(k);    /* option ouverte */
const NC=(a,k)=>!!a&&!!a.can&&!a.can(k);  /* n'a PAS le droit */
const SEGS='#homeBody .af-segs';                                                                      /* Commerce : 📊 Reporting · 📝 Devis… · ⚙ Base de prix SCR */
const ONGLETS='#homeBody .eq-filtres:has([data-v="tab|fiche"]), #homeBody .af-head + .eq-filtres';  /* une affaire : Fiche · 1 · Dossier … Tracé & chantiers */
const RUBR='#homeBody .eq-filtres:has([data-v="mag|mseg|dem"])';                                      /* Magasin : 📋 Demandes … ⚙ Catalogue */
const af=v=>`#homeBody [data-act="af"][data-v="${v}"]`,fl=v=>`#homeBody [data-act="fl"][data-v="${v}"]`,mag=v=>`#homeBody [data-act="x"][data-v="mag|mseg|${v}"]`;

export const NOMS={'commerce:aff':'Une affaire ouverte','flotte:x:veh':'États des lieux','magasin:materiel':'Matériel'};

export default {
 /* ── COMMERCE : vue d'ensemble (une étape par rubrique, + créer, + ouvrir une affaire) ── */
 commerce:[
  {titre:'Commerce',texte:'L\'écran Affaires : de la consultation à l\'offre, puis le suivi des affaires gagnées. Pour les chargés d\'affaires, la direction et le bureau.'},
  {sel:af('seg|rep')+', '+SEGS,titre:'📊 Reporting',texte:'Toutes les affaires d\'un coup d\'œil : CA mensuel par secteur, gagné, facturé, restant à facturer, débours, et « ⬇ Export CSV » pour Excel.'},
  {sel:af('seg|devis')+', '+SEGS,titre:'📝 Devis & chiffrage',texte:'Les affaires à l\'étude, en préconsultation ou en devis : DCE, chiffrage en versions, mémoire, offre remise.'},
  {sel:SEGS,titre:'🏗 Dossiers en cours',texte:'Les affaires gagnées, à débuter ou en cours : facturation, situations, débours ; au téléphone, glisse la barre des rubriques pour la voir.'},
  {sel:SEGS,titre:'✓ Terminés · perdus',texte:'Les dossiers clos : le chiffrage, le facturé et les documents restent consultables.'},
  {sel:SEGS,titre:'⚙ Base de prix SCR',texte:'Taux, équipes, cadences, fournitures, contrôles CND, paniers : la base commune qui alimente chaque nouveau chiffrage.'},
  {sel:af('new|'),titre:'➕ Affaire',texte:'Crée une affaire : numéro proposé (lettre du secteur, année-mois, rang), nom, client, état, puis « Créer l\'affaire » pour l\'ouvrir.',si:a=>C(a,'affaires.edit')},
  {sel:'#homeBody .af-row, #homeBody [data-afin="q"]',titre:'Ouvrir une affaire',texte:'Cherche par numéro, client ou ville et touche l\'affaire pour l\'ouvrir ; son guide pas à pas est dans 📚 Tous les tutoriels.'}
 ],
 /* ── COMMERCE : une affaire ouverte, dans l'ordre du dossier (DCE → offre → facturation, débours) ── */
 'commerce:aff':[
  {sel:'#homeBody .af-head',titre:'L\'affaire en un coup d\'œil',texte:'Numéro, état en couleur, client ; montant du devis, facturé et restant à facturer. Dessous, les onglets suivent le dossier : au téléphone, fais-les glisser.'},
  {sel:'#homeBody [data-afin="etat"], '+af('tab|fiche'),titre:'Fiche : l\'état de l\'affaire',texte:'Préconsultation → devis → à débuter → en cours → terminé, ou perdu. Chaque champ s\'enregistre quand tu le quittes, même hors connexion (envoyé ensuite).'},
  {sel:af('tab|dossier')+', '+ONGLETS,titre:'1 · Dossier et 2 · Lecture',texte:'Dossier : dates de la consultation, tâches, pièces du DCE. Lecture : surligne un passage, il devient une note pour le chiffrage, le mémoire ou une question.'},
  {sel:ONGLETS,titre:'3 · Quantités et 4 · Chiffrage',texte:'Le tracé ou une étude fournisseur, puis « → Préremplir le chiffrage ». « ＋ Nouvelle version » fige la précédente, consultable en lecture seule.'},
  {sel:ONGLETS,titre:'5 · Mémoire et 6 · DPGF',texte:'Mémoire : « Créer le plan type SCR », puis les blocs SCR déjà validés. DPGF : importe celle du maître d\'œuvre et traduis-y ton chiffrage, ligne à ligne.'},
  {sel:ONGLETS,titre:'7 · Offre',texte:'Coche les pièces à remettre, « 📦 Dossier de remise (.zip) », puis « 📤 Marquer l\'offre remise ». Aujourd\'hui te rappelle la remise à J-3, J-1 et le jour J.'},
  {sel:ONGLETS,titre:'Facturation et 💶 Débours',texte:'Ils apparaissent quand l\'affaire est gagnée : « ➕ Situation / facture » mois par mois, puis heures, achats et frais. Facturé − débours = marge.'},
  {sel:ONGLETS,titre:'Tracé & chantiers',texte:'« ✎ Dessiner le projet (traceur) », puis « Lier » l\'affaire à ses chantiers : leurs heures et leurs achats remontent dans les débours.'}
 ],
 /* ── FLOTTE : vue d'ensemble (une étape par vue du parc, + ajouter, + états des lieux) ── */
 flotte:[
  {titre:'Flotte',texte:'Le parc véhicules de SCR : qui conduit quoi, contrôles techniques, vidanges, états des lieux. Pour le responsable flotte, la direction et le bureau.'},
  {sel:fl('vue|list'),titre:'🚐 Véhicules',texte:'Le parc, alertes en couleur (rouge bloquant, orange à surveiller) ; touche un véhicule pour sa fiche : CT, vidange, contrôles, signalements.'},
  {sel:fl('alert|'),titre:'⚠ alertes',texte:'Ne garde que les véhicules à traiter ; filtre aussi par agence ou par type, ou cherche une immatriculation.'},
  {sel:fl('vue|agenda'),titre:'📅 Échéances & interventions',texte:'CT, vidanges, contrats et restitutions à venir, les retards d\'abord, avec les interventions programmées depuis les fiches.'},
  {sel:fl('vue|mouv'),titre:'↔ Mouvements',texte:'Remises, véhicules laissés, changements de conducteur : ce qui attend une signature ou une décision, et les mouvements contestés.'},
  {sel:fl('vue|qui'),titre:'🧑 Qui a quoi',texte:'Chaque véhicule et son conducteur aujourd\'hui, à imprimer en A4.'},
  {sel:fl('vue|hist'),titre:'🕓 Historique',texte:'Qui avait quel véhicule à une date donnée, par véhicule ou par personne.'},
  {sel:fl('new|'),titre:'➕ Véhicule',texte:'Ajoute un véhicule par son immatriculation, puis remplis sa fiche : type, contrôle technique, kilométrage, conducteur.',si:a=>C(a,'flotte.manage')},
  {sel:'#homeBody .fl-row, #homeBody [data-v^="veh|recep|"]',titre:'États des lieux',texte:'Remettre un véhicule, le reprendre ou le laisser à un collègue : depuis sa fiche, un état des lieux guidé, signé sur le téléphone.'},
  {sel:'#homeBody [data-act="parcseg"][data-v="magasin"]',titre:'📦 Magasin',texte:'Les fiches type du matériel par poste, en lecture ; tes demandes au dépôt se font dans Compagnon → Magasin.',si:a=>NC(a,'mag.manage')&&F(a,'magasin')} /* sans le droit Magasin, le dépôt est une puce de la Flotte */
 ],
 /* ── FLOTTE : états des lieux (assistant de remise / restitution / véhicule laissé ; même clé pour ⚙ Pack véhicules et la validation) ── */
 'flotte:x:veh':[
  {titre:'États des lieux du véhicule',texte:'Remise, restitution, véhicule laissé à un collègue : un état des lieux guidé, signé sur le téléphone, rangé dans la fiche. Ses points viennent du pack véhicules de SCR.'},
  {sel:'#homeBody .veh-wiz .veh-h',titre:'Une étape à la fois',texte:'En haut, l\'étape (1/10…) et la barre qui avance. Remise : conducteur, permis, kilométrage, points d\'état, photos, inventaire, cartes, charte, signatures.'},
  {sel:'#homeBody [data-v="veh|qui|avec"]',titre:'Le responsable et moi',texte:'Le responsable est à côté du conducteur : il vérifie avec lui et signe à la fin, sur ce téléphone.'},
  {sel:'#homeBody [data-v="veh|qui|seul"]',titre:'Je suis seul',texte:'Personne sur place : le conducteur fait tout l\'état des lieux et signe, puis un responsable relit les photos et les écarts, et valide.'},
  {titre:'Relevés, photos, inventaire',texte:'Ok ou Non ok en gros boutons, photos imposées une à une, un impact avec sa zone. À l\'inventaire du métier, un manque devient un écart.'},
  {titre:'Charte et signatures',texte:'Le conducteur lit la charte jusqu\'en bas et la signe au doigt dans le cadre. Au récapitulatif, chacun signe dans son cadre.'},
  {sel:'#veh-next',titre:'Continuer ›',texte:'S\'il manque quelque chose, l\'appli te dit quoi. Sans réseau, tout reste sur le téléphone ; « ▶ Reprendre » sur la fiche repart de la même étape.'},
  {titre:'Après l\'enregistrement',texte:'Remis : le véhicule passe au nom du conducteur, qui le retrouve dans Compagnon. Rendu : l\'appli compare, et les différences vont au responsable flotte.'}
 ],
 /* ── MAGASIN : vue d'ensemble (la file, préparer, remettre, puis une étape par rubrique, + Matériel) ── */
 magasin:[
  {titre:'Magasin',texte:'Le dépôt de SCR : les demandes des équipes arrivent ici, tu prépares, tu remets, le stock se tient tout seul. Pour le référent magasin.'},
  {sel:mag('dem')+', '+RUBR,titre:'📋 Demandes',texte:'La file : à préparer (⚡ urgentes en tête), en préparation, prêtes à remettre, reliquats ; elles arrivent des téléphones, par Compagnon → Magasin.'},
  {sel:'#homeBody [data-v^="mag|mopen|"], #homeBody .mag-kp',titre:'Préparer',texte:'Touche une demande, « ▶ Commencer la préparation », mets les quantités, puis « ✓ Prête » (ou « ✓ Déclarer prête cette partie » s\'il manque un article).'},
  {sel:'#homeBody [data-v^="mag|mopen|"], #homeBody .mag-kp',titre:'Remettre',texte:'« Qui retire ? », puis « 📤 Remis — enregistrer les sorties » : le stock se met à jour tout seul, et le demandeur suit chaque état sur son téléphone.'},
  {sel:mag('fiches')+', '+RUBR,titre:'🧰 Fiches type',texte:'Le matériel nécessaire par poste : à retoucher, à imprimer, ou pour équiper un véhicule avec une demande pré-remplie.'},
  {sel:mag('stock')+', '+RUBR,titre:'📦 Stock',texte:'Le stock du dépôt, article par article ; touche un article pour une réception fournisseur, un inventaire, le tampon, l\'emplacement ou le prix.'},
  {sel:RUBR,titre:'🛒 À commander',texte:'Ce qui passe sous le tampon (tampon − stock), trié par fournisseur, avec les reliquats ; au téléphone, glisse les rubriques pour la voir.'},
  {sel:RUBR,titre:'↕ Mouvements',texte:'Le journal des entrées et sorties ; « ＋ Entrée de stock » ou « − Sortie de stock » pour plusieurs articles d\'un coup, sur un bon imprimable.'},
  {sel:RUBR,titre:'⚙ Catalogue',texte:'Le pack magasin (catalogue, listes par métier, dotations camion) ; « ⬆ Importer le pack (.json) » le met à jour sans toucher au stock.'},
  {sel:'#homeBody [data-act="parcseg"][data-v="materiel"]',titre:'🔧 Matériel',texte:'Postes à souder, groupes, outillage, engins : la rubrique se prépare, son guide dit où trouver le reste en attendant.'}
 ],
 /* ── MAGASIN : la rubrique Matériel (écran « Pas encore là » aujourd'hui) ── */
 'magasin:materiel':[
  {sel:'#homeBody h2.vt',titre:'🔧 Matériel',texte:'Ici viendra le matériel du dépôt : postes à souder, groupes, outillage, engins, avec leur affectation, leurs contrôles, leur entretien et leurs pannes.'},
  {titre:'En attendant',texte:'Le stock d\'un chantier (livraisons, prélèvements) est dans le chantier, Technique → Stock. Le consommable du dépôt est dans 📦 Magasin.'},
  {sel:'#homeBody [data-act="parcseg"][data-v="magasin"]',titre:'Retour au dépôt',texte:'Touche 📦 Magasin pour retrouver les demandes, le stock et les commandes.'}
 ]
};
