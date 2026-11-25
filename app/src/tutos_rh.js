// tutos_rh.js — 24/11/2026 (nuit) : TUTORIELS DU MODULE « Tracé Ressources humaines ». Ethan (24/11 au soir) : « revois tous les tutos avec les nouveautés ».
// Le module RH (10/11, enrichi le 19/11 et le 24/11) n'avait que trois tutoriels (rh:gd, rh:cpt, rh:paie, dans tutos_pilotage.js). Ici : la vue d'ensemble « rh »
// (tableau de bord) et un tutoriel par onglet : Contrôle, Navettes, Absences · congés (demandes signées), Habilitations, Formation, Contraventions, Mutuelle, Accidents.
// Même format que les autres familles (lu par tuto.js) : {sel:'cible CSS (la 1re visible est surlignée ; sans cible → carte au centre)', titre, texte, si:(api)=>bool}.
// Cibles : boutons du module (data-act / data-v) et cartes repérées par leur titre (data-tu, posé par tracerh.js → card()). Deux publics, comme l'écran :
// la gestion (« toute l'entreprise » : RH, direction, administrateur) et chacun (« mon dossier ») — les conditions `si` reprennent celles de tracerh.js.
const peut=(a,...ks)=>!a||!a.can||ks.some(k=>!!a.can(k));
const RHV=a=>peut(a,'rh.voir','rh.edit');                       /* tracerh.js → rhVoir : toute l'entreprise */
const MOI=a=>!!(a&&a.can)&&!a.can('rh.voir')&&!a.can('rh.edit'); /* « mon dossier » (le droit manque vraiment) */
const NAV=a=>RHV(a)||peut(a,'rh.nav');                            /* navVoir : Navettes et Contrôle */
const ABSE=a=>peut(a,'rh.edit','rh.abs');                         /* absEdit : déclarer une absence, traiter les demandes de congé */
const T=v=>`#eq-app [data-act="x"][data-v="rh|tab|${v}"]`;        /* un onglet du module */
const K=v=>`#eq-app [data-tu="${v}"]`;                            /* une carte, par son titre */
export const NOMS={'rh:ctl':'Contrôle','rh:nav':'Navettes','rh:abs':'Absences et congés','rh:hab':'Habilitations','rh:form':'Formation','rh:pv':'Contraventions','rh:mut':'Mutuelle','rh:acc':'Accidents'};
/* l'assistant 💬 ne reçoit que les tutoriels des écrans de la personne (tuto.js → tutoManuel) */
export const POUR={'rh:ctl':NAV,'rh:nav':NAV,'rh:acc':RHV};
export default {
 rh:[
  {si:RHV,titre:"Ressources humaines",texte:"Toute l'entreprise : heures et navettes, déplacements, absences, habilitations, formations, contraventions, mutuelle."},
  {si:MOI,titre:"Ton dossier RH",texte:"Tes absences et tes demandes de congé, tes habilitations, tes formations, tes contraventions, ta mutuelle. Tu lis ; la RH tient à jour."},
  {si:RHV,sel:'#eq-app .rh-pop',titre:"Tous · Salariés · Intérimaires",texte:"Choisis qui est affiché, partout dans le module. Les tableaux rangent les salariés puis les intérimaires, avec un total par groupe."},
  {sel:'#eq-app .rh-tabs',titre:"Une rubrique par onglet",texte:"Les onglets tiennent sur une ligne : glisse-la pour voir les autres. « ? » ouvre le guide de la rubrique affichée."},
  {si:RHV,sel:K('a-faire'),titre:"À faire",texte:"Ce qui attend : jours sans heures ni absence, navettes, déplacements à accorder, demandes de congé, contraventions… Touche une ligne pour ouvrir l'écran."},
  {si:MOI,sel:K('mon-dossier'),titre:"Mon dossier",texte:"Tes absences et ce qui t'attend. « 🏖 Demander un congé » part d'ici."},
  {sel:T('abs'),titre:"🏖 Absences · congés",texte:"Demander un congé signé au doigt, suivre la réponse, signer une absence posée par le bureau."},
  {si:NAV,sel:T('nav'),titre:"🧾 Navettes",texte:"La feuille d'heures de paie : semaines lissées au quart d'heure, règles communes, Excel du mois au format SCR."},
  {si:NAV,sel:T('ctl'),titre:"✅ Contrôle",texte:"Chaque jour de semaine passé doit avoir des heures ou une absence : ce qui manque est listé, jour par jour."},
  {sel:T('pv'),titre:"🚔 Contraventions",texte:"L'avis reçu, le conducteur désigné, le paiement : tout est tracé. Chacun voit les siennes."}
 ],
 'rh:ctl':[
  {sel:'#eq-app [data-v="rh|ctlv|reel"]',titre:"Réel pointé ou navette",texte:"« ⏱ Réel pointé » : les heures telles qu'elles ont été pointées. « 🧾 Navette (lissé) » : celles qui partent en paie."},
  {sel:K('a-regulariser')+', '+K('la-semaine-de-tout-le-monde'),titre:"⚠ À régulariser",texte:"Ceux qui ont un jour de semaine passé sans heures ni absence. « 🏖 Absence » pré-remplit la déclaration."},
  {sel:K('la-semaine-de-tout-le-monde'),titre:"La semaine de tout le monde",texte:"Une case par jour : vert = heures et chantier, bleu = absence, hachuré = férié ou pont, « ? » rouge = ni heures ni absence."},
  {sel:'#eq-app [data-v^="rh|ctlw|"]',titre:"Changer de semaine",texte:"Les pastilles S… changent de semaine ; le chiffre rouge compte les jours à régulariser."},
  {sel:K('le-mois-de-tout-le-monde'),titre:"Le mois de tout le monde",texte:"Le calendrier du mois : heures, absences et chantiers. ‹ › en haut de l'écran pour changer de mois."},
  {titre:"Les heures manquantes",texte:"Elles se saisissent dans Pilotage → ✓ Pointages à valider, avec un motif. Une absence se déclare dans 🏖 Absences."}
 ],
 'rh:nav':[
  {sel:'#eq-app [data-act="gdnavall"]',titre:"⬇ Toutes les navettes",texte:"L'Excel du mois au format SCR, logo de l'entreprise compris. ‹ › à côté du mois pour changer de mois."},
  {sel:'#eq-app [data-regles]',titre:"📌 Règles communes",texte:"Pour tout le monde, une semaine ou tout le mois : jours au réel, pont, fermeture, intempéries, ou semaine aux heures réelles. Motif obligatoire."},
  {sel:K('a-traiter')+', '+K('toutes-les-navettes'),titre:"À traiter",texte:"Les semaines qui ne partent pas lissées : sans solde, heures à reporter, jour manquant… « Voir » ouvre le détail et l'explication."},
  {sel:K('toutes-les-navettes'),titre:"Toutes les navettes",texte:"Une ligne par personne, une case par semaine : heures de la navette, ✓ lissée, rouge = à regarder. Touche une case pour sa semaine."},
  {sel:'#eq-app .rh-wkb',titre:"La règle d'une semaine",texte:"Touche l'en-tête S… : férié travaillé lissé ou non, jours au réel pour tout le monde. La main prise sur une personne passe avant."},
  {titre:"✋ Avoir la main",texte:"Dans le détail d'une semaine : « ✋ Avoir la main » (motif), chaque choix montre tout de suite le résultat. Rien n'est enregistré avant « Enregistrer »."},
  {titre:"Fin de mois : reporter ou prime",texte:"Les heures au-delà de 48 h : « ↪ Reporter » sur les semaines suivantes pas pleines, ou « 💶 Prime » payée sur la navette du mois."}
 ],
 'rh:abs':[
  {si:ABSE,sel:K('demandes-de-conge-a-traiter'),titre:"📨 Demandes à traiter",texte:"Les demandes signées par les salariés. « Traiter » : accorde et signe (l'absence est posée), ou refuse avec un motif qu'il verra."},
  {sel:'#eq-app [data-v="rh|demnew"]',titre:"＋ Demander un congé",texte:"Type, dates (les jours ouvrés se calculent), la part sur ton compteur d'heures si tu veux, puis ta signature au doigt."},
  {sel:K('mes-demandes-de-conge'),titre:"Suivre sa demande",texte:"⏳ En attente, ✓ Accordée ou ✗ Refusée avec le motif. Tant qu'elle attend, rien au planning ni sur la navette ; « Annuler » reste possible."},
  {sel:K('a-signer')+', '+K('mes-demandes-de-conge'),titre:"✍ À signer",texte:"Une absence posée par le bureau avec « À faire signer par le salarié » : la personne la signe ici, au doigt. Le bureau voit « signée par le salarié »."},
  {si:ABSE,sel:'#eq-app [data-v="rh|new|rhabs"]',titre:"＋ Absence",texte:"Maladie, accident, formation… déclarée par le bureau. Coche « À faire signer par le salarié » si sa signature est attendue."},
  {sel:'#eq-app [data-abscal], '+K('absences-enregistrees'),titre:"📅 Le calendrier",texte:"Les absences du mois en couleur ; ‹ › pour changer de mois. Les jours ouvrés se comptent du lundi au vendredi."},
  {titre:"Sur la navette",texte:"Une absence accordée part sur la navette (CONGÉS PAYÉS, RTT…) et n'est pas lissée. Une demande en attente n'y est pas."}
 ],
 'rh:hab':[
  {si:RHV,sel:'#eq-app [data-v="rh|hab|"]',titre:"＋ Habilitation",texte:"La personne, l'habilitation, la date d'obtention : la date de fin se calcule. Joins le justificatif (PDF ou photo)."},
  {sel:K('a-traiter')+', '+K('toutes-les-habilitations'),titre:"À traiter",texte:"Ce qui manque ou arrive à échéance, personne par personne. « ＋ » sur une ligne pour la compléter."},
  {sel:K('toutes-les-habilitations')+', '+K('a-traiter'),titre:"Toutes les habilitations",texte:"Le passeport de chacun : à jour, à renouveler, expirée. Chacun voit le sien dans Compagnon → Passeport."},
  {titre:"Formation et habilitation",texte:"Une formation « faite » qui vise une habilitation : l'appli propose de l'inscrire ici. Rien à ressaisir."}
 ],
 'rh:form':[
  {si:RHV,sel:'#eq-app [data-v="rh|new|rhform"]',titre:"＋ Formation",texte:"La personne, la formation, l'organisme, les dates, les heures, le coût, et l'habilitation visée s'il y en a une."},
  {sel:K('plan-de-formation'),titre:"Le plan de formation",texte:"Prévue, inscrite, faite, annulée : le plan de l'année. Une formation faite avec une habilitation visée propose de l'inscrire."},
  {titre:"Prochaines formations",texte:"Les plus proches remontent aussi au tableau de bord du module, pour ne pas les oublier."}
 ],
 'rh:pv':[
  {si:MOI,titre:"Tes contraventions",texte:"Les avis sur les véhicules de l'entreprise quand tu étais le conducteur désigné : le montant, le statut, le suivi. Tu lis ; la RH tient à jour."},
  {si:RHV,sel:'#eq-app [data-v="rh|new|rhpv"]',titre:"＋ Contravention",texte:"Avis reçu le, infraction le, le véhicule : le conducteur est proposé d'après le véhicule. Lieu, infraction, montant."},
  {sel:K('en-cours'),titre:"En cours",texte:"Reçue, conducteur désigné… La désignation se fait sous 45 jours ; le paiement est à vérifier 45 jours après la désignation."},
  {si:RHV,sel:'#eq-app [data-v^="rh|edit|rhpv|"], '+K('en-cours'),titre:"✏️ Le statut",texte:"Payée par le salarié, payée par l'entreprise, contestée, classée : chaque changement s'écrit dans le suivi, avec la date."},
  {sel:K('reglees'),titre:"Réglées",texte:"Les dossiers clos, avec leur suivi. En haut, les chiffres de l'année : payé par l'entreprise, payé par les salariés."}
 ],
 'rh:mut':[
  {si:MOI,titre:"Ta mutuelle",texte:"Ta ligne : affilié ou dispensé, la date d'effet, les pièces reçues. Une question : vois avec la RH."},
  {si:RHV,sel:'#eq-app [data-v="rh|new|rhmut"]',titre:"＋ Ligne mutuelle",texte:"Affilié, dispensé (avec le motif), en attente de pièces ou sorti ; date d'effet, bulletin et justificatif reçus."},
  {si:RHV,sel:K('sans-ligne-mutuelle')+', '+K('tout-le-monde'),titre:"Sans ligne mutuelle",texte:"Chaque salarié doit être affilié ou dispensé. « ＋ » sur sa ligne pour le régler."},
  {si:RHV,sel:K('tout-le-monde'),titre:"Tout le monde",texte:"Les salariés d'abord, ceux sans ligne en premier, puis les intérimaires à part : leur mutuelle relève de l'agence."},
  {sel:K('affiliations-et-dispenses'),titre:"Affiliations et dispenses",texte:"Le détail ligne par ligne, avec les pièces reçues. ✏️ pour corriger."}
 ],
 'rh:acc':[
  {sel:K('declarations'),titre:"Les déclarations d'accident",texte:"Accidents, presque-accidents et soins bénins déclarés sur le terrain. « Ouvrir les déclarations » : qualification, suivi, traité."},
  {titre:"Déclarer tout de suite",texte:"Sur le terrain : « ⚠ Déclarer un accident » sur l'accueil, même incomplet. La RH est prévenue et complète."},
  {titre:"Les habilitations de l'équipe",texte:"À côté, dans Pilotage → Sécurité : quart d'heure sécurité, contrôles chantier, habilitations de l'équipe."}
 ]
};
