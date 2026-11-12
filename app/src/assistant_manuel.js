// assistant_manuel.js — 11/11/2026 (Ethan : « le niveau des réponses est très bas : je demande comment pointer une soudure, il ne connaît pas les écrans ;
// je dis que j'ai fait une soudure qui n'est pas sur le plan, il ne dit pas d'aller dans la préfabrication »).
// Ce que l'assistant 💬 sait de Tracé, envoyé avec chaque question (la fonction serveur le met en cache) :
//  1. STRUCTURE : les onglets et à quoi ils servent ;
//  2. les TUTORIELS de l'appli (tuto.js → tutoManuel(), étapes filtrées par les droits de la personne) : la même source que les « ? » de l'appli ;
//  3. NOUVEAUTES : ce qui n'a pas encore de tutoriel (préfabrication, outils, RH, navettes, trajet inter-chantier, Flotte, Affaire…) ;
//  4. SITUATIONS : les questions de terrain → la bonne fonction ;
//  5. PLAN (rubriques de chaque onglet, copiées de l'appli), GLOSSAIRE (mots du métier et de l'appli) ;
//  6. calculés dans l'appli : CETTE PERSONNE (son poste, ses onglets, ses droits) et QUI PEUT QUOI (réglages actuels de l'entreprise) — app.js → assistantDroits().
// À TENIR À JOUR à chaque lot qui ajoute ou renomme un bouton (les libellés ici sont ceux de l'appli, copiés du code).

export const STRUCTURE = `Tracé est l'application de SCR (soudure et manchonnage de réseaux de chaleur en acier pré-isolé) : les chantiers et leurs soudures, le pointage des heures, le planning, la flotte, le magasin, les affaires, les ressources humaines.
Onglets de l'accueil (chacun ne voit que ceux de son poste) :
- Aujourd'hui : l'accueil (bureau en 3D ou vue classique) — ton pointage du jour, tes chantiers, À faire, documents à signer.
- Chantier : la carte et la liste des chantiers. Un chantier ouvert = son plan des soudures et ses onglets (Plan d'ensemble, Bureau, Conversation, Dossier, QSE, Stockage, Fournitures, Phasage, Modifications, Liste des soudures, Récapitulatif, DOE et exports…). Le bouton ☰ (Menu, en haut à droite) donne les outils du chantier (section « Terrain & chantier »).
- Pilotage (encadrement) : planning de la semaine, objectifs des équipes, ✓ Pointages à valider, production par équipe, variables de paie, grands déplacements, ⏱ Compteurs d'heures, demandes d'annulation, demandes de matériel, quart d'heure sécurité, contrôles chantier, ⚠️ Déclarer un accident, habilitations de l'équipe.
- Compagnon : Accueil, Documents, Planning, Productions, Notes de frais, Heures, Passeport (habilitations), Mes demandes (matériel), 🧰 Outils, Avatar.
- Commerce : affaires, chiffrage, DPGF, offres.
- Affaire : suivi financier des affaires (reporting, débours, facturation, réglages des taux).
- Flotte : véhicules, échéances, qui a quoi, mouvements.
- Magasin : stock, demandes, réceptions.
- Équipe : annuaire, documents d'entreprise, communication interne, 🏢 Visite des dépôts, ⚙ Administration (comptes, droits, 🧪 bac à sable).
- RH : ressources humaines ; pour un compagnon, « mon dossier » en lecture.
- La bulle 💬 au bord droit : Discuter, 🐞 Un bug, 💡 Une idée.
Règles générales :
- Sans réseau, tout ce qu'on saisit est gardé sur le téléphone et envoyé quand le réseau revient. Rien n'est perdu : ne pas désinstaller l'appli, ne pas vider les données du navigateur.
- Un onglet ou un bouton absent = pas ouvert à ce poste : voir le chef de chantier, le conducteur de travaux ou l'administrateur.
- Le « ? » en haut d'un écran lance le tutoriel de cet écran.
- Rien n'est jamais effacé : une saisie annulée reste dans l'historique avec qui, quand et pourquoi.`;

export const NOUVEAUTES = `## Préfabrication — soudures faites mais pas encore sur le plan (espace d'attente)
- Pour quoi : une soudure (ou soudure + manchon) faite en avance, en préfabrication ou sur un tronçon que le plan ne montre pas encore. On la pointe SANS toucher au plan, puis on la transfère quand le plan est mis à jour.
- Où : ouvrir le chantier → ☰ Menu (en haut à droite) → « ⏳ Préfabrication (en attente) » → « ＋ Pointer une soudure en attente ».
- Remplir : « Soudure faite » ou « Soudure + manchon faits », DN, procédé (ou manchon), « Où elle ira » (obligatoire), ligne prévue et « Près de la soudure » (facultatifs), au moins une photo (obligatoire), note → « Enregistrer en attente ».
- Elle reçoit un numéro provisoire ATT-… ; le plan n'est pas modifié ; un bandeau « ⏳ n soudures préfabriquées en attente du plan » le rappelle. Sans réseau, elle est gardée sur le téléphone.
- Quand le plan a la soudure : Préfabrication → « 📍 Transférer sur la soudure du plan » → toucher la vraie soudure : tout passe dessus (soudeur et date d'origine, photos, étapes), sa fiche porte « ⏳ Préfabriquée ». Transfert : droit « transférer l'avancement » (soudeurs, manchonneurs, chefs…).
- Annuler une fiche d'attente : motif obligatoire, elle reste dans l'historique.
- Elle ne compte dans la production et l'avancement qu'une fois transférée (une seule fois).

## Soudure supplémentaire (droit « Ajouter une soudure supplémentaire sur le plan »)
- Pour une soudure EN PLUS sur un tronçon qui existe déjà sur le plan (barre recoupée, réparation) : ☰ Menu → « ➕ Soudure supplémentaire » → toucher la barre (aller ou retour) à l'endroit exact (zoomer d'abord). La soudure est ajoutée au plan, puis on la pointe normalement. Sans ce droit (voir CETTE PERSONNE), demander au chef de chantier. Une soudure ajoutée par erreur s'annule comme une étape (crédits d'annulation).

## Soudures « hors du plan »
- Après une mise à jour du plan, une soudure déjà pointée qui n'existe plus au même endroit n'est pas perdue : bandeau « ⚠️ n soudures pointées hors du plan — avancement gardé, touche pour les remettre » → la remettre sur la bonne soudure du plan.

## Annuler une étape validée par erreur
- Dans la fiche de la soudure : « Annuler cette étape (erreur de saisie) » — pour ses propres saisies, dans la limite de ses crédits de la semaine (le nombre restant est affiché).
- Plus de crédit, ou saisie de quelqu'un d'autre : « 🛡 Demander l'annulation au chef » ; le chef tranche dans Pilotage → Demandes d'annulation.

## Pointage de la journée et trajet inter-chantier
- Sur la carte de pointage du jour (Aujourd'hui) : « ▶ Commencer la journée », « Pause midi », « ▶ Reprise après la pause », « ■ Fin de journée ».
- Si tu viens d'un autre chantier (le matin) ou si demain tu es sur un autre chantier (le soir), la carte demande « 🚐 trajet inter-chantier ? » : touche la durée, ou « Pas de trajet (je rentre chez moi) ». Ce trajet est payé à part (à 100 %, jamais majoré) et figure sur la navette.
- Oubli de pointage ou heure fausse : prévenir son chef ; il corrige dans Pilotage → ✓ Pointages à valider (avec un motif). Le chef voit aussi « rien de pointé » pour ceux qui étaient au planning et saisit leurs heures.

## Mes heures et ma navette (Compagnon → Heures)
- Chaque semaine : les heures réellement pointées et la navette (feuille d'heures de paie) lissée, avec l'explication en clair.
- Règles du lissage : heures réparties du lundi au vendredi au pas de ½ h ; 12 h par jour et 48 h par semaine au plus ; au-delà → compteur d'heures à reporter (majorées) ; semaine courte → complétée par les compteurs, sinon alerte « sans solde à poser » ; jours d'absence, fériés et ponts ne sont pas lissés.
- En fin de mois, la RH ou le responsable d'exploitation choisit pour les heures à reporter : « ↪ Reporter » (replacées sur les semaines suivantes pas pleines) ou « 💶 Prime » (payées sur la navette du mois). Cela remplace l'ancienne règle « le surplus est payé sur la navette » du tutoriel des compteurs.
- Les débours des affaires comptent toujours les heures RÉELLES (dimanche et trajets compris), jamais la navette lissée.

## Pointages à valider (Pilotage → ✓ Pointages à valider)
- Par jour, rangés par chantier : à valider en couleur, validés grisés. Corriger = un seul formulaire Début / Pause / Fin pré-rempli avec le pointé, l'écart s'affiche, motif obligatoire, la trace reste. « ↺ Revoir » sur un pointage validé. ◀ ▶ pour revenir sur un jour passé (21 jours).
- Une anomalie « trajet inter-chantier non déclaré » (changement de chantier de plus de 20 km sans trajet déclaré) se règle en un toucher.

## Ressources humaines (onglet RH)
- RH, direction, responsables d'exploitation : 🏠 Tableau de bord, 🧾 Navettes, 🏖 Absences · congés, 🎖 Habilitations, 🎓 Formation, 🚔 Contraventions, 🩺 Mutuelle, ⚠ Accidents.
- 🧾 Navettes : mois ‹ ›, semaines à traiter, détail d'une semaine avec l'explication, « ✋ Avoir la main sur cette semaine » (motif obligatoire) puis « ✓ Retour au calcul automatique », fin de mois « ↪ Reporter » ou « 💶 Prime », « ⬇ Toutes les navettes » (Excel au format SCR). Réservé au droit « RH : contrôler les navettes » (RH, responsables d'exploitation, assistante RH).
- Absences : jours ouvrés calculés du lundi au vendredi (corrigeables). Habilitations : justificatif PDF ou photo, date de fin calculée. Formation « faite » avec une habilitation visée → l'appli propose de l'inscrire. Contraventions : conducteur proposé d'après le véhicule, désignation à faire sous 45 jours.
- Les autres salariés voient « Ressources humaines · mon dossier » : leurs propres lignes, en lecture.

## Outils de tuyauterie (Compagnon → 🧰 Outils)
- Baïonnette (décalage entre deux axes : longueur de tube à couper, rayon des coudes 3D proposé selon le DN, écartement de soudure), Coupe de coude (longueurs à tracer sur l'extrados, l'axe, l'intrados), Développé de cintrage (arc, tangente, gain, tube à couper), Pente (‰, mm par mètre, %, degrés, dans les deux sens), Équerrage 3-4-5 (ou diagonale de deux côtés).
- Gros champs, résultat en direct, schéma coté ; les valeurs restent sur le téléphone ; rien n'est envoyé.

## Flotte (onglet Flotte)
- Nouvel écran (depuis le 11/11) : Accueil (à faire en retard et 7 jours, calendrier, alertes, signalements des conducteurs), Calendrier des échéances, Parking 3D, Véhicules, Qui a quoi, À traiter, Journal et historique ; Paramètres : Silhouettes 3D, Pack véhicules.
- Le tutoriel « Tracé Flotte » décrit l'ANCIEN écran, toujours là par le bouton « Ancien écran Flotte » (retour : « ← Nouvel écran Flotte »). Correspondances : Échéances & interventions → Calendrier des échéances ; Mouvements → À traiter ; Historique → Journal et historique.

## Affaire (onglet Affaire)
- Suivi : Reporting des chantiers (→ fiche de l'affaire : marché, facturé, produit, avancement, débours, marge ; Débours par nature ; Factures ; Paramètres), Facturation du mois, RG à facturer. Achats : Bons de commande, Notes de frais à valider, Compte d'un chantier (ancien calcul). Agence : Compte d'agence. Paramètres : Reprise des chantiers, Réglages (grilles de taux horaires, natures de dépense). Sans grille de taux, la main-d'œuvre est comptée à 0 € (bandeau « Aucune grille de taux horaires »).

## Chantier : dossier et fourniture
- Dossier du chantier : 5 pièces obligatoires (DT / DICT, PPSPS, autorisations de voirie, habilitations / procédures, plans d'exécution) ; PGC, qualifications et planning d'exé en « Pièces utiles », hors compteur. Le compteur « 🗂 x/5 pièces » en haut du chantier ouvre le Dossier.
- Stockage → « 🔍 Ai-je la fourniture ? » : entourer une ou plusieurs zones du tracé → reste à poser, disponible sur le chantier, manquant (les manques d'abord). Rien n'est enregistré.

## Bureau 3D (Aujourd'hui)
- Post-it : « 🔔 Me le rappeler » (date et heure) → à l'heure, le post-it s'agite, cadre rouge, ligne « Rappel » dans À faire ; « ✓ Vu », « +1 h », « Demain 8 h ».
- Grand tableau blanc : « À savoir » en haut, « Ma journée » en bas (« ＋ tâche · rendez-vous »). Personnaliser : couleurs, objets de bureau (lampes), tapis de souris en photo (« ↻ Tourner l'image »).
- Équipe → 🏢 Visite des dépôts : le monde 3D de tous les dépôts.

## La bulle 💬
- 💬 Discuter : poser une question sur l'appli. Sous la conversation : « 🐞 En faire un bug » / « 💡 En faire une idée » (résumé à relire avant d'envoyer).
- 🐞 Un bug / 💡 Une idée : écrire ce qui se passe ou ce qui est proposé ; l'écran, l'onglet, le chantier et la version sont notés tout seuls. « Mes envois » : nouveau → vu → fait, avec la réponse. « ⇥ » range la bulle en languette.

## Bac à sable (administrateur)
- Équipe → ⚙ Administration → 🧪 Bac à sable : un chantier de démonstration et des personnages de démo (Karim B., Julien R., Ethan L., Sophie M.) pour s'entraîner ; rien ne part au serveur ; « 🗑 Retirer le bac à sable » efface tout.`;

export const SITUATIONS = `- « J'ai fait une soudure mais elle n'est pas sur le plan » → deux cas. (1) Soudure faite en avance, préfabriquée, ou tronçon que le plan ne montre pas encore : ☰ Menu → « ⏳ Préfabrication (en attente) » → « ＋ Pointer une soudure en attente » (où elle ira + photo), puis transfert quand le plan est à jour. (2) Soudure EN PLUS sur un tronçon déjà dessiné (barre recoupée, réparation) : ☰ Menu → « ➕ Soudure supplémentaire » si la personne a ce droit (sinon le chef de chantier), puis la pointer normalement. Dans le doute : la préfabrication (rien n'est perdu, on la transfère ensuite).
- « Comment je pointe / valide une soudure » → ouvrir le chantier, toucher la soudure (un rond) sur le plan → sa fiche → « Faire l'étape … » (1 Soudure, 2 Fils raccordés, 3 Manchon posé, 4 Moussage) → photo (obligatoire pour la soudure) → « Valider l'étape ».
- « Je me suis trompé de soudure / j'ai validé par erreur » → fiche de la soudure → « Annuler cette étape (erreur de saisie) » (selon tes crédits de la semaine), sinon « 🛡 Demander l'annulation au chef ».
- « Le plan n'est pas à jour » → prévenir le chef / le bureau (mise à jour du plan, onglet Modifications) ; en attendant, pointer les soudures déjà faites dans la Préfabrication.
- « Je n'ai pas de réseau » → continuer normalement : tout est gardé sur le téléphone et part au retour du réseau.
- « J'ai oublié de pointer la fin / mon heure est fausse » → fin oubliée : Compagnon → Heures → « 🕓 Indiquer l'heure de fin » (ton chef la voit) ; fin touchée par erreur : « ↩ Annuler la fin » tant que personne n'a validé ; sinon, ou journée pas pointée du tout : ton chef corrige dans Pilotage → ✓ Pointages à valider, avec un motif.
- « Je change de chantier » → répondre à la question « 🚐 trajet inter-chantier » sur la carte de pointage (le soir ou le lendemain matin).
- « Où voir mes heures / ma navette » → Compagnon → Heures.
- « Une note de frais » → Compagnon → Notes de frais. « Du matériel » → Compagnon → Mes demandes. « Mes habilitations » → Compagnon → Passeport.
- « Un calcul de baïonnette, de coude, de pente » → Compagnon → 🧰 Outils.
- « Un accident, un presque-accident ou un soin bénin » → mettre en sécurité, prévenir le chef ; puis « Déclarer un accident » sur l'accueil (Aujourd'hui), tout de suite, même incomplet : la RH est prévenue et complète (l'encadrement a aussi Pilotage → ⚠️ Déclarer un accident).
- « L'appli ne marche pas comme prévu » → 🐞 Un bug dans la bulle (l'écran est noté tout seul). « J'ai une idée » → 💡 Une idée.
- « Je ne vois pas tel onglet / tel bouton » → il n'est pas ouvert à ton poste : demande à ton chef ou à l'administrateur.`;

export const PLAN = `## Chantier (un chantier ouvert)
- En haut : ⌂ accueil, le nom du chantier (toucher pour changer), 🔍 rechercher une soudure, ☰ Menu (outils du chantier), « 🗂 x/5 pièces » (dossier).
- Onglets (selon le poste, regroupés en 🏕 Vie du chantier et 🔧 Technique, les autres sous « ⋯ Plus ») : 📐 Plan d'ensemble, Bureau, 💬 Conversation, Dossier, QSE, 💧 Détection d'humidité, 🌊 Hydraulique, 🚚 Stockage, 🧾 Fournitures, 📅 Phasage, ✍️ Modifications, Points de contrôle, 🎖 Liste des soudures, 📊 Récapitulatif, 📦 Catalogue des pièces, 📷 DOE et exports.
- ☰ Menu → « Terrain & chantier » (selon les droits) : ＋ Poser sur le plan…, ⏳ Préfabrication (en attente), ➕ Soudure supplémentaire, 📍 Note sur le plan, 📍 Points, ✥ Modifier, ✎ Traceur : modifier ce réseau, ⏱ Versions…
## Pilotage (encadrement)
- Planning de la semaine — qui est où chaque jour, chercher quelqu'un, placer en 3 touchers, nouvelle personne, équipes, copier la semaine dernière.
- Objectifs des équipes — par chantier → équipe → jour : missions en heures estimées, soudures ou tronçon sur le plan, DN.
- Ma semaine — composer sa semaine : visites, réunions, rendez-vous ; import / export Outlook.
- ✓ Pointages à valider — heures de l'équipe, correction avec motif, pointages manquants.
- Production par équipe — chantier → équipe → personne : heures et production face aux objectifs.
- Variables de paie · rapport RH — la vue définitive pour la paie (heures, pauses, grands déplacements), export CSV.
- Grands déplacements — cas 1 à 4 selon la distance domicile → chantier, nuitées, repas, indemnités.
- ⏱ Compteurs d'heures — contrat, compteur (plafond, solde), heures à reporter, cas forcés, import du compteur existant.
- ↩ Demandes d'annulation — soudures à annuler au-delà des crédits : le chef tranche.
- Demandes de matériel — les demandes des équipes : commander, livrer, refuser.
- Quart d'heure sécurité — déclencher un sujet du jour sur un ou tous les chantiers, émargement de tous.
- Contrôles chantier — qui contrôle, à quelle fréquence, non-conformités ouvertes / levées.
- ⚠️ Déclarer un accident — accident, presque-accident ou soin bénin : qui, où, quand, circonstances, photos ; la RH est prévenue.
- 🎖 Habilitations de l'équipe — échéances, recyclages à programmer.
## Compagnon
- Accueil, Documents (à lire / signer), Planning (où je suis cette semaine), Productions, Notes de frais, Heures (mes semaines, ma navette), Passeport (mes habilitations), Mes demandes (matériel au dépôt), 🧰 Outils, Avatar.
## Commerce
- 📊 Reporting, 📝 Devis & chiffrage, 🏗 Dossiers en cours, ✓ Terminés · perdus, ⚙ Base de prix SCR ; « ➕ Affaire ». Numéro d'affaire : lettre du secteur (O Ouest, I Île-de-France, S Sud, W Sud-Ouest) + année-mois + rang (ex. O2512-04) ; une sous-affaire (TS, BDC, avenant, OS) = numéro parent + suffixe. Cycle : préconsultation → devis → perdu / à débuter → en cours → terminé.
## Magasin
- Magasin (demandes à préparer, en préparation, prêtes à remettre, reliquats), 🔧 Matériel, 📋 Demandes, 🧰 Fiches type, 📦 Stock, 🛒 À commander, ↕ Mouvements, ⚙ Catalogue. Les demandes arrivent des téléphones (Compagnon → Mes demandes) ; la remise enregistre la sortie de stock.
## Équipe
- Annuaire (toute l'entreprise par poste), Documents d'entreprise (règlement intérieur, notes de service, flash info : qui a signé, qui relancer), Communication interne (actualités), Pack SCR (import des données privées), Documents administratifs (pièces jointes aux offres), 🏢 Visite des dépôts, 🌍 Monde 3D · Labo, ⚙ Administration (comptes et accès, postes, 🔎 Qui peut quoi ?, options, 🧪 Bac à sable, ⏻ Paliers).`;

export const GLOSSAIRE = `- Étapes d'une soudure : ① Soudure (soudeur, photo du cordon obligatoire), ② Fils raccordés + DH, ③ Manchon posé, ④ Moussage + finition (manchonneur). Une étape se valide quand la précédente l'est.
- Couleurs du plan : gris = à souder, orange = soudée, bleu = contrôlée, vert = manchonnée, rouge = à reprendre. Trait rouge = aller, trait bleu = retour.
- DN : diamètre nominal du tube. Aller / retour : les deux tubes du réseau de chaleur. Tronçon : partie de réseau entre deux points.
- DH : détection d'humidité (fils de surveillance dans l'isolant ; mesures, bouclage, localisation de défaut).
- Manchon / manchonnage : la jonction isolée posée sur la soudure ; moussage : remplissage d'isolant.
- Préfabrication / soudure en attente : soudure faite que le plan ne montre pas encore (numéro ATT-…), transférée ensuite sur la vraie soudure.
- Crédits d'annulation : nombre d'erreurs de saisie qu'on peut annuler soi-même par semaine ; au-delà, demande au chef.
- Navette : la feuille mensuelle des heures (variables de paie) ; lissage : répartition des heures de la semaine sur 5 jours selon les règles de SCR.
- Compteur d'heures : heures à reporter ou à récupérer. Grands déplacements (GD) : cas 1 à 4 selon la distance domicile → chantier.
- Trajet inter-chantier : temps de route entre deux chantiers, payé à part.
- DOE : dossier des ouvrages exécutés (carnet de soudures, plan, photos). PPSPS : plan particulier de sécurité. PGC : plan général de coordination. DT / DICT : déclarations avant travaux.
- QSE : qualité, sécurité, environnement (accueil sécurité, quart d'heure sécurité, émargements).
- TS : travaux supplémentaires (onglet Modifications : qualifier en TS, compris ou mémoire). RG : retenue de garantie. Débours : coûts engagés sur une affaire. FG : frais généraux.
- Paliers : Socle = fonctions de base, 🧪 Labo = fonctions en essai ; l'administrateur choisit qui a quoi.
- Bac à sable : données de démonstration pour s'entraîner, jamais envoyées au serveur.`;

/** le manuel complet : tutoriels de la personne (tuto.js → tutoManuel(), filtrés par ses onglets et ses droits) + ce fichier + ses droits et « qui peut quoi » (calculés par l'appli) */
export function manuelTexte(o) {
  o = typeof o === 'string' ? { tutos: o } : (o || {});
  const perso = [o.profil ? 'Poste : ' + o.profil + '.' : '',
    o.ouverts && o.ouverts.length ? 'Onglets ouverts à cette personne : ' + o.ouverts.join(', ') + '.' : '',
    o.fermes && o.fermes.length ? 'Pas à son poste (ne l\'y envoie pas ; dis qui peut le faire) : ' + o.fermes.join(', ') + '.' : '',
    String(o.droits || '').trim()].filter(Boolean).join('\n');
  return ['# TRACÉ — CE QUE TU DOIS SAVOIR', STRUCTURE,
    perso ? '# CETTE PERSONNE\n' + perso : '',
    '# PLAN DE L\'APPLI (rubriques de chaque onglet)', PLAN,
    '# TUTORIELS DE L\'APPLI (les étapes que cette personne voit, selon son poste)', String(o.tutos || '').trim() || '(aucun)',
    '# NOUVEAUTÉS (plus récentes que les tutoriels : en cas de différence, c\'est cette partie qui a raison)', NOUVEAUTES,
    '# SITUATIONS DE TERRAIN → LA BONNE FONCTION', SITUATIONS,
    '# GLOSSAIRE', GLOSSAIRE,
    o.quiPeut ? '# QUI PEUT QUOI DANS L\'ENTREPRISE (réglages actuels, par défaut des postes)\n' + String(o.quiPeut).trim() : ''].filter(Boolean).join('\n\n');
}
