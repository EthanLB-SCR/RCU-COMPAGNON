// tutos_pilotage.js — 31/10/2026 : TUTORIELS DÉTAILLÉS (Ethan : « un tuto par module qui décrit toutes les options, puis des tutos par option, vastes, pour que tout le monde
// sache se servir de toutes les options »). Déclaratif, lu par tuto.js : clé « module » = vue d'ensemble du module (une étape par option), « module:option » = le
// tutoriel détaillé de l'option. Une étape = {sel:'cible CSS (la 1re visible est surlignée ; sans cible → carte au centre)', titre:'…', texte:'…', si:(api)=>bool}
// (api.can(droit), api.feat(option)). Le nom affiché de chaque option est dans NOMS.
//
// Lot PL (31/10) : modules PILOTAGE et AFFAIRE. Clés lues dans l'appli (TRACE.tuto.where(), espace.js → espaceViewKey) :
//   pilotage          hub (Planning & objectifs · Heures & paie · Matériel & véhicules · Sécurité)
//   pilotage:plan     Planning de la semaine (simplifié)          pilotage:orga   Planning des équipes (détaillé) — chef de chantier : « Mon planning et mon équipe »
//   pilotage:obj      Objectifs des équipes                       pilotage:agenda Ma semaine
//   pilotage:valid    Pointages à valider                         pilotage:prodEq Production par équipe
//   pilotage:rapport  Variables de paie · rapport RH              pilotage:gd     Grands déplacements
//   pilotage:cpt      Compteurs d'heures                          pilotage:annul  Demandes d'annulation
//   pilotage:x:mag    Commandes au dépôt de l'équipe              pilotage:x:dem  Demandes de matériel
//   pilotage:secu     écran Sécurité (tuile « Sécurité » d'Aujourd'hui)
//   pilotage:qhs · :controles · :accident · :habsEq              (section Sécurité du hub, ou écran Sécurité)
//   affaire           hub (Achats · Comptes)                      affaire:cmd · :frais · :comptes · :x:cc
// Pas de tutoriel détaillé ici pour « Véhicules : mouvements » (la ligne mène à Flotte ou à Compagnon : lots cm / co), ni pour pilotage:chantiers / pilotage:dash
// (écrans « Mes chantiers » / tableau de bord : plus aucun bouton n'y mène — le récap des chantiers est dans le module Chantier).
//
// Vue d'ensemble : sur le hub affiché, chaque étape « ligne » suit EXACTEMENT ce que la personne voit (la ligne est dans la page → l'étape existe) ; lancée d'ailleurs
// (📚 Tous les tutoriels), elle suit les droits et les options. Les cibles sont des data-act / data-v / classes stables (jamais :nth-child ni texte).
const doc=()=>typeof document!=='undefined'?document:null;
const vu=sel=>{try{const d=doc();return !!(d&&d.querySelector(sel));}catch(e){return true;}}; /* l'élément est dans la page */
const ici=(a,k)=>{try{return !!(a&&a.where&&a.where()===k);}catch(e){return false;}}; /* l'écran affiché est celui-là */
const peut=(a,k)=>!a||!a.can||!!a.can(k);
const sans=(a,k)=>!!(a&&a.can&&!a.can(k)); /* le droit manque vraiment */
const opt=(a,k)=>!a||!a.feat||!!a.feat(k);
const ligne=(ecran,sel,cond)=>a=>ici(a,ecran)?vu(sel):(!cond||!!cond(a)); /* étape d'une entrée de hub */
const L=v=>`#eq-app [data-act="xgo"][data-v="${v}"]`; /* une ligne de hub */
const enc=a=>peut(a,'planning.edit')||peut(a,'affaires.edit')||peut(a,'mag.manage'); /* conducteur, bureau, direction, référent magasin */

export const NOMS={
 'pilotage:plan':'Planning de la semaine','pilotage:orga':'Planning des équipes','pilotage:obj':'Objectifs des équipes','pilotage:agenda':'Ma semaine',
 'pilotage:valid':'Pointages à valider','pilotage:prodEq':'Production par équipe','pilotage:rapport':'Variables de paie','pilotage:gd':'Grands déplacements',
 'pilotage:cpt':'Compteurs d\'heures','pilotage:annul':'Demandes d\'annulation','pilotage:x:mag':'Commandes au dépôt','pilotage:x:dem':'Demandes de matériel',
 'pilotage:secu':'Sécurité','pilotage:qhs':'Quart d\'heure sécurité','pilotage:controles':'Contrôles chantier','pilotage:accident':'Déclarer un accident',
 'pilotage:habsEq':'Habilitations de l\'équipe',
 'affaire:cmd':'Bons de commande','affaire:frais':'Notes de frais à valider','affaire:comptes':'Comptes chantier','affaire:x:cc':'Compte d\'un chantier'
};

export default {
 /* ═══ PILOTAGE — vue d'ensemble : une étape par ligne du hub ═══ */
 pilotage:[
  {titre:"Pilotage",texte:"Le suivi des équipes : planning, objectifs, heures, production, matériel et sécurité. Chaque ligne ouvre une option, avec son tutoriel (« ? » à droite du titre)."},
  {sel:L('plan'),titre:"Planning de la semaine",texte:"Qui est où chaque jour : place une personne en 3 touchers, copie la semaine dernière. Chacun voit « Demain : chantier » dans Compagnon.",si:ligne('pilotage',L('plan'),a=>opt(a,'planning')&&opt(a,'planning_simple')&&peut(a,'planning.edit'))},
  {sel:L('orga'),titre:"Mon planning et mon équipe",texte:"Qui est avec toi, quels jours, sur quels chantiers : le planning que ton conducteur a fait.",si:a=>sans(a,'planning.edit')&&(ici(a,'pilotage')?vu(L('orga')):opt(a,'planning'))},
  {sel:L('orga'),titre:"Planning des équipes",texte:"Place les équipes semaine par semaine, par secteur, en équipes A, B… ; crée le profil d'une nouvelle personne en deux minutes.",si:a=>peut(a,'planning.edit')&&!opt(a,'planning_simple')&&(ici(a,'pilotage')?vu(L('orga')):opt(a,'planning'))},
  {sel:L('obj'),titre:"Objectifs des équipes",texte:"Par chantier, équipe et jour : une mission et ses heures estimées, posée sur le plan si tu veux. Un repère, pas un plafond.",si:ligne('pilotage',L('obj'),a=>opt(a,'objectifs'))},
  {sel:L('agenda'),titre:"Ma semaine",texte:"Compose ta semaine (visites, réunions, rendez-vous), reliée à Outlook, et regarde celle de ceux qui dépendent de toi.",si:ligne('pilotage',L('agenda'))},
  {sel:'#eq-app [data-det="hubPlMore"] > summary',titre:"⚙ Plus d'options : planning détaillé",texte:"Le planning d'avant, pour les cas fins : secteurs, équipes A à J, glisser-déposer, fiche du chantier.",si:ligne('pilotage','#eq-app [data-det="hubPlMore"]',a=>opt(a,'planning')&&opt(a,'planning_simple')&&peut(a,'planning.edit'))},
  {sel:L('valid'),titre:"Pointages à valider",texte:"Les heures de l'équipe : le chef de chantier valide, puis le conducteur. Une erreur se corrige avec un motif ; les pointages manquants sont signalés.",si:ligne('pilotage',L('valid'))},
  {sel:L('prodEq'),titre:"Production par équipe",texte:"Les heures et la production de chacun (soudures, manchons), additionnées par équipe et comparées aux objectifs.",si:ligne('pilotage',L('prodEq'),a=>opt(a,'production'))},
  {sel:L('rapport'),titre:"Variables de paie · rapport RH",texte:"Les heures telles qu'elles partent en paie : définitives, validées chef, à valider, grands déplacements. Export CSV pour la RH.",si:ligne('pilotage',L('rapport'),a=>peut(a,'pointage.validate')&&(peut(a,'planning.edit')||peut(a,'rh.voir')))},
  {sel:L('gd'),titre:"Grands déplacements",texte:"Le cas 1 à 4 de chacun selon la distance domicile → chantier : nuitées, repas, indemnités. Tu accordes la semaine.",si:ligne('pilotage',L('gd'),a=>peut(a,'planning.edit')||peut(a,'rh.voir'))},
  {sel:L('cpt'),titre:"Compteurs d'heures",texte:"Contrat, compteur d'heures sup (plafond, solde) et heures à reporter de chacun ; import du compteur existant.",si:ligne('pilotage',L('cpt'),a=>peut(a,'rh.voir')||peut(a,'rh.edit'))},
  {sel:L('annul'),titre:"Demandes d'annulation",texte:"Une soudure à annuler au-delà des crédits de la personne arrive ici : tu tranches dans la conversation du chantier.",si:ligne('pilotage',L('annul'))},
  {sel:L('x:mag:equipe'),titre:"Commandes au dépôt de l'équipe",texte:"Ce que ton équipe a demandé au magasin, et ce qui est prêt à retirer au dépôt.",si:ligne('pilotage',L('x:mag:equipe'),a=>opt(a,'magasin'))},
  {sel:'#eq-app [data-act="x"][data-v="veh|gomouv|"]',titre:"Véhicules : mouvements",texte:"Qui a quel véhicule, états des lieux et signatures attendus, contestations : le fil des déclarations.",si:ligne('pilotage','#eq-app [data-v="veh|gomouv|"]',a=>opt(a,'parc')&&peut(a,'flotte.manage'))},
  {sel:L('x:dem:file'),titre:"Demandes de matériel",texte:"Les demandes des équipes pour leurs chantiers : « Commandé », puis « Livré / remis ». Elles suivent l'état sur leur téléphone.",si:ligne('pilotage',L('x:dem:file'),a=>opt(a,'demandes')&&enc(a))},
  {sel:L('qhs'),titre:"Quart d'heure sécurité",texte:"Déclenche un sujet du jour sur un chantier ou sur tous : chacun le fait et le signe sur son téléphone.",si:ligne('pilotage',L('qhs'),a=>peut(a,'qse.manage'))},
  {sel:L('controles'),titre:"Contrôles chantier",texte:"Qui contrôle, à quelle fréquence, où ça traîne, les NC ouvertes. Objectif : un contrôle par chantier actif toutes les 2 semaines.",si:ligne('pilotage',L('controles'),a=>peut(a,'qse.manage'))},
  {sel:L('accident'),titre:"Déclarer un accident",texte:"Accident, presque-accident ou soin bénin : qui, où, quand, circonstances, photos. La RH est prévenue.",si:ligne('pilotage',L('accident'),a=>opt(a,'accident'))},
  {sel:L('habsEq'),titre:"Habilitations de l'équipe",texte:"Les échéances de l'équipe triées par urgence : expirées, à renouveler bientôt, manquantes.",si:ligne('pilotage',L('habsEq'))}
 ],

 /* ═══ Planning de la semaine (simplifié, lot PI) — encadrement qui fait le planning ═══ */
 'pilotage:plan':[
  {sel:'#eq-app .pi-sum',titre:"Où en est la semaine",texte:"Combien de personnes sont placées toute la semaine, et les jours encore à pourvoir (en rouge). Les jours fériés sont signalés."},
  {sel:'#eq-app .eq-wknav',titre:"Change de semaine",texte:"Touche ‹ ou ›, ou glisse le bandeau des jours ; les points sous un jour comptent les personnes placées. Le menu des secteurs filtre l'écran."},
  {sel:'#eq-app [data-act="pi"][data-v="open|"]',titre:"＋ Placer, en 3 touchers",texte:"1 qui, 2 sur quel chantier, 3 quels jours (ses jours libres sont cochés), l'équipe si tu veux, puis « Placer ». La personne voit « Demain : chantier » dans Compagnon."},
  {sel:'#eq-app [data-act="pi"][data-v="copy|"]',titre:"Copier la semaine dernière",texte:"Reprend la semaine passée des personnes pas encore placées : mêmes chantiers, mêmes équipes, fériés sautés."},
  {sel:'#eq-app .pi-bar [data-act="xgo"][data-v="orga"]',titre:"⚙ Plus d'options",texte:"Le planning détaillé : secteurs, équipes A à J, glisser-déposer, nouvelle personne, fiche du chantier, météo."},
  {sel:'#eq-app .pi-tray',titre:"À placer",texte:"Les personnes qui ont encore des jours libres, les plus libres d'abord. Touche une personne (ou 👥 une équipe de la semaine passée), puis le chantier."},
  {sel:'#eq-app .pi-site:not(details *) [data-act="pi"][data-v^="edit|"], #eq-app .pi-site:not(details *) [data-act="pi"][data-v^="here|"]',titre:"Modifier une personne",texte:"Touche sa ligne sur la carte du chantier : change ses jours ou son équipe, ou « Retirer de ce chantier ». « ＋ Placer quelqu'un ici » part du chantier."},
  {sel:'#eq-app .pi-leg',titre:"Les repères",texte:"● sur ce chantier · « Abc » sur un autre chantier · ⚠ deux chantiers le même jour · F férié · — hors contrat."}
 ],

 /* ═══ Planning des équipes (détaillé) — ou, pour un chef de chantier, « Mon planning et mon équipe » (écran « Ta semaine ») ═══ */
 'pilotage:orga':[
  {sel:'#eq-app .pi-bar [data-act="xgo"][data-v="plan"]',titre:"Le planning détaillé",texte:"Pour les placements fins : secteurs, équipes A à J, glisser-déposer, fiche du chantier. « ↩ Planning simplifié » revient à l'écran en 3 touchers.",si:a=>peut(a,'planning.edit')&&opt(a,'planning_simple')},
  {titre:"Planning des équipes",texte:"Place les équipes semaine par semaine : secteurs, équipes A à J, glisser-déposer, fiche du chantier.",si:a=>peut(a,'planning.edit')&&!opt(a,'planning_simple')},
  {sel:'#eq-app .eq-wknav',titre:"Semaine et secteur",texte:"‹ › ou glisse le bandeau pour changer de semaine. Choisis le secteur : la jauge dit combien sont placés toute la semaine.",si:a=>peut(a,'planning.edit')},
  {sel:'#eq-app [data-act="plcopy"]',titre:"Reprendre la semaine passée",texte:"Recopie la semaine d'avant en un toucher, puis ajuste. « Avec l'encadrement » ajoute les chefs et les conducteurs à placer.",si:a=>peut(a,'planning.edit')},
  {sel:'#eq-app [data-act="meteo"]',titre:"☀ Météo",texte:"Recharge la météo des chantiers : elle s'affiche jour par jour sur chaque carte et habille les avatars de l'équipe.",si:a=>peut(a,'planning.edit')},
  {sel:'#eq-app #pl-tray, #eq-app .eq-pltray',titre:"À placer",texte:"Cherche par nom, filtre par métier (Soudeurs, Manchonneurs…). « ＋ Nouvelle personne (intérimaire, embauche) » : elle se place tout de suite.",si:a=>peut(a,'planning.edit')},
  {sel:'#eq-app .eq-plsite:not(details *)',titre:"Placer sur un chantier",texte:"Touche une personne puis le chantier (ou glisse-la dessus), choisis l'équipe, « Placer … ici ». Touche une personne placée pour régler ses jours.",si:a=>peut(a,'planning.edit')},
  {sel:'#eq-app .eq-plsite:not(details *) .eq-plfd > summary',titre:"⚙ La fiche du chantier",texte:"Sous le nom : secteur, chef, conducteur, horaires et point de rassemblement. Ils servent à l'accueil chantier et aux pointages.",si:a=>peut(a,'planning.edit')},
  {titre:"Ce que voient les équipes",texte:"Chacun n'ouvre dans l'appli que les chantiers de sa semaine et de la précédente. Le chef de chantier voit son planning dans Pilotage.",si:a=>peut(a,'planning.edit')},
  /* chef de chantier (sans le droit « planning ») : son planning, fait par le conducteur */
  {sel:'#eq-app [data-act="plansem"]',titre:"Ta semaine",texte:"« Cette semaine » ou « Semaine prochaine » : ton planning, tel que ton conducteur l'a fait.",si:a=>sans(a,'planning.edit')},
  {sel:'#eq-app .eq-semaine',titre:"Jour par jour",texte:"Chaque jour : la météo et ta tenue. Touche un jour pour voir son détail dessous.",si:a=>sans(a,'planning.edit')},
  {sel:'#eq-app .eq-cols.eq-2',titre:"Ton chantier, ton équipe",texte:"Le chantier du jour, qui est avec toi, le chef et le conducteur ; à côté, tes chantiers de la semaine.",si:a=>sans(a,'planning.edit')},
  {titre:"Un changement ?",texte:"Le planning se fait par le conducteur : signale-lui un oubli ou un changement. Ton équipe retrouve le sien dans Compagnon → Planning.",si:a=>sans(a,'planning.edit')}
 ],

 /* ═══ Objectifs des équipes ═══ */
 'pilotage:obj':[
  {sel:'#eq-app .eq-nav',titre:"Choisis la semaine",texte:"Semaine passée, cette semaine, semaine prochaine, ou ◀ ▶. Un objectif se prépare à l'avance : la semaine prochaine est souvent la bonne."},
  {sel:'#eq-app [data-act="objday"].active, #eq-app [data-act="objday"]',titre:"Puis le jour",texte:"Touche un jour : le chiffre à côté compte ses objectifs. Chaque chantier montre l'équipe placée ce jour-là."},
  {sel:'#eq-app .eq-objsite',titre:"Un chantier, ses équipes",texte:"Les équipes du planning (A, B…) avec leurs personnes, les objectifs déjà posés et les heures estimées face aux heures d'équipe."},
  {sel:'#eq-app [data-act="objadd"]',titre:"➕ Objectif",texte:"Type, heures estimées, mission, jours (plusieurs jours cochés = la semaine planifiée) et pour qui. Puis « Poser l'objectif »."},
  {sel:'#eq-app [data-act="objplan"], #eq-app [data-act="objadd"]',titre:"📐 Poser sur le plan",texte:"Touche des soudures une à une, ou la conduite au début puis à la fin du tronçon : l'équipe le voit en surbrillance 🎯 sur son plan."},
  {sel:'#eq-app [data-act="objdone"], #eq-app .eq-objrow, #eq-app .eq-objnone',titre:"Faite ou pas",texte:"Sur la mission : ✓ faite, ↩ pas faite, ✕ retirer ; 🗺 la montre sur le plan."},
  {titre:"Ce que voit l'équipe",texte:"L'équipe voit l'objectif sur son accueil et en surbrillance 🎯 sur le plan du chantier. Ce n'est pas un plafond : c'est un repère partagé."}
 ],

 /* ═══ Ma semaine (agenda de l'encadrement) ═══ */
 'pilotage:agenda':[
  {sel:'#eq-app [data-chg="agWho"]',titre:"La semaine de ton équipe",texte:"Choisis quelqu'un qui dépend de toi pour voir sa semaine, en lecture seule.",si:()=>vu('#eq-app [data-chg="agWho"]')},
  {sel:'#eq-app .eq-wknav',titre:"Ta semaine",texte:"‹ › ou glisse pour changer de semaine ; touche un jour pour y aller. Les points comptent tes rendez-vous et tes chantiers."},
  {sel:'#eq-app [data-act="aglink"], #eq-app [data-act="agsync"]',titre:"Relié à Outlook",texte:"Colle le lien ICS de ton calendrier Outlook publié : ta semaine se remplit toute seule. « ⟳ Synchroniser maintenant » pour forcer."},
  {sel:'#eq-app [data-act="agics"]',titre:"Vers Outlook",texte:"« ⬇ Exporter la semaine » crée un fichier .ics pour Outlook, Google Agenda ou l'iPhone ; « → Outlook » sur une ligne pour un seul rendez-vous."},
  {sel:'#eq-app .eq-agday [data-act="agnew"]',titre:"＋ Ajouter",texte:"＋ sur un jour : visite de chantier, réunion, rendez-vous… avec le chantier, les heures et une note. « Ajouter » et c'est dans ta semaine."},
  {sel:'#eq-app .eq-agday',titre:"Tes chantiers du jour",texte:"Chaque jour rappelle tes chantiers du planning (📍). Sur un rendez-vous lié à un chantier, › ouvre son bureau."}
 ],

 /* ═══ Pointages à valider ═══ */
 'pilotage:valid':[
  {sel:'#eq-app [data-act="valmode"]',titre:"Par jour ou par personne",texte:"« Par jour » : toute l'équipe d'un jour. « Par personne » : la semaine d'une personne, à valider d'un coup."},
  {sel:'#eq-app [data-act="valjour"].active, #eq-app [data-act="valpers"].active, #eq-app [data-act="valjour"]',titre:"Choisis le jour",texte:"Le chiffre sur un jour : pointages à valider ; en rouge : quelqu'un de placé n'a rien pointé. Le lundi, le vendredi d'avant est proposé."},
  {sel:'#eq-app [data-act="toutvalider"]',titre:"✅ Tout valider",texte:"Valide d'un coup les journées complètes et cohérentes. Fin manquante, pas de pause, plus de 12 h : ces lignes se traitent à part."},
  {sel:'#eq-app .eq-vrow',titre:"Une journée",texte:"Début → fin, pause, objectif et production du jour, et l'état. « ⚠ aucune fiche de soudure ce jour-là » : vérifie avant de valider."},
  {sel:'#eq-app [data-act="corr"]',titre:"✏️ Corriger",texte:"Quoi corriger (début, pause, reprise, fin), l'heure et le motif : la plus probable est proposée. La personne voit « Pointage corrigé » et par qui."},
  {sel:'#eq-app [data-act="pi"][data-v^="saisie|"]',titre:"Pas de pointage",texte:"Quelqu'un de placé n'a rien pointé : « ✏️ Saisir ses heures » avec un motif. La journée est enregistrée et validée à ton niveau.",si:()=>vu('#eq-app [data-act="pi"][data-v^="saisie|"]')},
  {titre:"Qui valide quoi",texte:"Le chef de chantier valide d'abord, puis le conducteur : les heures deviennent définitives pour la paie. La personne suit chaque étape dans Compagnon → Heures."}
 ],

 /* ═══ Production par équipe ═══ */
 'pilotage:prodEq':[
  {sel:'#eq-app .eq-wknav',titre:"Choisis la semaine",texte:"‹ › ou glisse le bandeau des jours. Les points sous un jour : les personnes placées sur tes chantiers."},
  {sel:'#eq-app .pi-pm',titre:"Semaine ou jour",texte:"« Semaine » additionne les jours passés ; « Jour » en montre un seul, à choisir dans la rangée.",si:a=>opt(a,'prod_tableau')},
  {sel:'#eq-app [data-act="pi"][data-v="print|"]',titre:"🖨 Imprimer (A4)",texte:"Une feuille A4 par chantier et par équipe, avec le détail par personne, à afficher ou à envoyer.",si:a=>opt(a,'prod_tableau')},
  {sel:'#eq-app .pi-scope',titre:"Chantiers comptés",texte:"✓ compté, ✗ pas chargé sur cet appareil : ouvre-le une fois (« Ouvrir … »), puis reviens ici pour qu'il compte.",si:a=>opt(a,'prod_tableau')},
  {sel:'#eq-app .pi-tab',titre:"Le tableau par équipe",texte:"Par chantier et par équipe : soudures, manchons, ml, heures pointées. La barre compare à l'objectif posé 🎯, sinon à la meilleure équipe.",si:a=>opt(a,'prod_tableau')},
  {sel:'#eq-app .eq-peteam',titre:"Détail par personne",texte:"Heures, production et soudures par heure de chacun. Le tuyauteur ne s'additionne pas : c'est la production de son soudeur."},
  {titre:"D'où viennent les chiffres",texte:"Production : les fiches de soudure signées au nom de chacun, le jour où la personne est placée sur le chantier. Heures : les pointages."}
 ],

 /* ═══ Variables de paie · rapport RH ═══ */
 'pilotage:rapport':[
  {sel:'#eq-app [data-act="rpweek"]',titre:"Choisis la semaine",texte:"S-2, Semaine dernière ou Cette semaine : les heures telles qu'elles partent en paie, rien d'autre."},
  {sel:'#eq-app .ac-stats',titre:"Où en sont les heures",texte:"Pointées, définitives (conducteur), validées chef en attente, à valider ; en rouge, les jours planifiés sans pointage."},
  {sel:'#eq-app table.af-tab',titre:"Une ligne par personne",texte:"Jours, heures pointées, définitives, chef, à valider, pauses et cas de grand déplacement (GD) de la semaine."},
  {sel:'#eq-app [data-act="rpcsv"][data-v="paie"]',titre:"⬇ Variables de paie",texte:"Le fichier CSV jour par jour pour la RH : heures, statut, qui a validé, objectifs, production, grand déplacement."},
  {sel:'#eq-app [data-act="rpcsv"][data-v="semaine"]',titre:"⬇ Rapport de la semaine",texte:"Le récapitulatif par personne, en CSV, à ouvrir dans Excel."},
  {titre:"Avant d'envoyer",texte:"Tout doit être « définitif » : sinon, relance la validation dans Pointages à valider. Une pause non pointée n'est jamais déduite."}
 ],

 /* ═══ Grands déplacements ═══ */
 'pilotage:gd':[
  {sel:'#eq-app [data-act="gdmode"]',titre:"Par semaine ou par personne",texte:"« 🗓 Par semaine » : toute l'équipe. « 👤 Par personne · mois » : le calendrier d'une personne, nuitées et repas jour par jour."},
  {sel:'#eq-app [data-gdaddr] > summary, #eq-app .okbox',titre:"Les adresses",texte:"Le cas se calcule depuis l'adresse de chacun. « 📍 Adresses à vérifier » : sans adresse localisée, pas de calcul."},
  {sel:'#eq-app .eq-wknav',titre:"Choisis la semaine",texte:"‹ › ou glisse le bandeau. Le cycle se lit sur les semaines d'avant du planning."},
  {sel:'#eq-app .ac-stats',titre:"La semaine en chiffres",texte:"Planifiés, en grand déplacement, nuitées, repas, indemnités de trajet et semaines déjà accordées."},
  {sel:'#eq-app [data-act="gdaccall"], #eq-app [data-act="gdacc"], #eq-app [data-act="gdpers"]',titre:"✓ Accorder",texte:"Accorder fige la semaine (chantiers, cas, nuitées, repas, indemnités) : c'est l'historique de paie, même si le planning change ensuite."},
  {sel:'#eq-app [data-act="gdx"], #eq-app [data-act="gdpers"]',titre:"Détente et exception",texte:"La détente tombe seule selon le cycle (cas 3 : une semaine sur 2, cas 4 : une sur 4). 🏠 ou ✗ seulement si la réalité diffère."},
  {sel:'#eq-app [data-act="gdpers"]',titre:"Le mois d'une personne",texte:"Touche un nom : son mois jour par jour, accordé (vert) ou calculé à accorder (orange). Un jour se corrige à la main."},
  {titre:"Les règles",texte:"Les cas 1 à 4 du livret d'accueil et les tableaux jour par jour sont en bas de l'écran. Le livret déposé ici est aussi dans Compagnon → Heures."}
 ],

 /* ═══ Compteurs d'heures (gérant, direction, RH) ═══ */
 'pilotage:cpt':[
  {sel:'#eq-app .eq-kpis',titre:"Les compteurs en bref",texte:"Qui a un compteur, le total d'heures dedans, les compteurs pleins, les heures à reporter et les cas forcés."},
  {sel:'#eq-app .cpt-imp > summary',titre:"⬆ Importer le compteur existant",texte:"Colle le tableau de ton classeur (ou dépose le fichier), vérifie l'aperçu, importe : les soldes deviennent le point de départ.",si:a=>peut(a,'rh.edit')},
  {sel:'#eq-app .cpt-tab',titre:"Une ligne par personne",texte:"Contrat, compteur (solde, plafond et jauge), heures à reporter, déplacement : cas forcé ou selon la distance."},
  {sel:'#eq-app .cpt-tab [data-act="fiche"], #eq-app .cpt-tab tr[data-pid]',titre:"Fiche",texte:"Au bout de la ligne : contrat, plafond, repos, posé par l'entreprise, prime, replacer, cas forcé. Les RH modifient ; gérant et direction lisent."},
  {sel:'#eq-app [data-act="cptxls"]',titre:"⬇ Tableau Excel",texte:"Les soldes arrêtés à la fin de la navette du mois, prêts pour la paie."},
  {titre:"Comment ça compte",texte:"Chaque semaine finie, les heures sup entrent majorées jusqu'au plafond ; le surplus est payé sur la navette."}
 ],

 /* ═══ Demandes d'annulation ═══ */
 'pilotage:annul':[
  {titre:"Pourquoi ces demandes",texte:"Chacun annule ses propres erreurs, dans la limite de ses crédits de la semaine. Au-delà, sa demande arrive ici."},
  {sel:'#eq-app [data-act="opensite"][data-v$="|conv"], #eq-app .ac-empty',titre:"Une demande",texte:"Qui demande, quelle soudure, sur quel chantier et pourquoi. Touche-la : la conversation du chantier s'ouvre."},
  {titre:"Tu tranches",texte:"Dans la conversation : « ✓ Valider » (étape annulée ou soudure retirée), « ＋ Redonner 1 crédit », ou refuser avec un motif. Tout est journalisé."},
  {titre:"Sur cet appareil",texte:"La liste lit les chantiers ouverts sur cet appareil : un chantier jamais ouvert ici n'y apparaît pas."}
 ],

 /* ═══ Commandes au dépôt de l'équipe (magasin) ═══ */
 'pilotage:x:mag':[
  {sel:'#eq-app .mag-kp',titre:"Les commandes de l'équipe",texte:"Prêtes au dépôt, en attente, en préparation, reliquats à venir : ce que ton équipe a demandé au magasin."},
  {sel:'#eq-app .mag-row, #eq-app .ac-empty',titre:"Par personne",texte:"Les demandes en cours de chacun, les plus anciennes d'abord. Touche une demande pour voir ses articles."},
  {titre:"Qui fait quoi",texte:"Lecture seule : le magasin prépare et remet, la personne suit l'état dans Compagnon → Magasin. Toi, tu sais qui doit passer au dépôt."}
 ],

 /* ═══ Demandes de matériel (sans magasin) ═══ */
 'pilotage:x:dem':[
  {sel:'#eq-app .dm-kp',titre:"Ce qui attend",texte:"À traiter, urgentes, commandées (et en retard), livrées en partie. Les demandes arrivent des téléphones : Compagnon → Mes demandes."},
  {sel:'#eq-app [data-xin="dem|fsite"]',titre:"Un chantier",texte:"Filtre la liste sur un seul chantier.",si:()=>vu('#eq-app [data-xin="dem|fsite"]')},
  {sel:'#eq-app .dm-row',titre:"Ouvrir une demande",texte:"Qui, quel chantier, les articles et les quantités, la note et les photos. ⚡ urgent : à traiter en premier."},
  {sel:'#eq-app [data-act="x"][data-v^="dem|cmd|"], #eq-app .dm-row',titre:"🛒 Commandé",texte:"Indique le fournisseur et la livraison prévue ; tu peux préparer un bon de commande pré-rempli (Affaire → Bons de commande)."},
  {sel:'#eq-app [data-act="x"][data-v^="dem|liv|"], #eq-app .dm-row',titre:"📦 Livré / remis",texte:"La date, à qui, et ce qui est remis : en partie si tout n'est pas là, le reste suit. « Refuser » demande un motif."},
  {sel:'#eq-app .dm-fold',titre:"Les demandes finies",texte:"Livrées, refusées, annulées : rangées en bas, touche pour les revoir.",si:()=>vu('#eq-app .dm-fold')},
  {titre:"Ce que voit l'équipe",texte:"Chaque état (commandé, livré, refusé) arrive sur le téléphone de la personne. Aucun stock ici : tu commandes, tu fais livrer."}
 ],

 /* ═══ Sécurité (écran ouvert par la tuile « Sécurité » d'Aujourd'hui) ═══ */
 'pilotage:secu':[
  {sel:'#eq-app .eq-kpis',titre:"Sécurité",texte:"Quarts d'heure du jour, contrôles en retard, NC ouvertes, accidents à traiter : ce qui demande ton attention."},
  {sel:L('qhs'),titre:"Quart d'heure sécurité",texte:"Déclenche un sujet du jour : chacun le fait et le signe sur son téléphone.",si:ligne('pilotage:secu',L('qhs'),a=>peut(a,'qse.manage'))},
  {sel:L('controles'),titre:"Contrôles chantier",texte:"Qui contrôle, à quelle fréquence, où ça traîne : un contrôle par chantier actif toutes les 2 semaines.",si:ligne('pilotage:secu',L('controles'),a=>peut(a,'qse.manage'))},
  {sel:L('accident'),titre:"Déclarer un accident",texte:"Accident, presque-accident ou soin bénin, avec photos : la RH est prévenue.",si:ligne('pilotage:secu',L('accident'),a=>opt(a,'accident'))},
  {sel:L('habsEq'),titre:"Habilitations de l'équipe",texte:"Les échéances triées par urgence, pour programmer les recyclages à temps.",si:ligne('pilotage:secu',L('habsEq'))},
  {titre:"Aussi dans le chantier",texte:"Contrôles, quarts d'heure et accidents se font aussi sur place, dans l'onglet QSE du chantier. La même section est dans Pilotage."}
 ],

 /* ═══ Quart d'heure sécurité ═══ */
 'pilotage:qhs':[
  {titre:"Un quart d'heure sécurité",texte:"Un sujet à dérouler en entier, un quiz vrai / faux, « je m'engage » signé au doigt, puis le retour et la signature de l'animateur."},
  {sel:'#eq-app [data-act="qhsnew"]',titre:"⛑️ Déclencher",texte:"Choisis le sujet (les 12 quarts d'heure SCR), le jour et où : tes chantiers ou tous. Un mot pour l'équipe si tu veux."},
  {titre:"Ce que voit l'équipe",texte:"Toutes les personnes placées sur le chantier ce jour-là, chefs compris, le trouvent sur leur accueil et dans l'onglet QSE, et le font sur leur téléphone."},
  {titre:"Clore la séance",texte:"Dans l'onglet QSE du chantier : « ✍️ Retour & signature animateur ». Une personne sans compte (intérim) : « 👤 Faire participer quelqu'un sans compte »."},
  {sel:'#eq-app table.rc, #eq-app .ac-empty',titre:"Le suivi",texte:"Les 40 derniers : date, sujet, où, qui l'a déclenché et le nombre de participations."}
 ],

 /* ═══ Contrôles chantier ═══ */
 'pilotage:controles':[
  {titre:"Contrôles chantier",texte:"Objectif : un contrôle par chantier actif toutes les 2 semaines. Le contrôle se fait sur place, dans l'onglet QSE du chantier."},
  {sel:'#eq-app table.rc, #eq-app .ac-empty',titre:"Par encadrant, par chantier",texte:"Par encadrant : contrôles sur 4 et 12 semaines, NC relevées. Par chantier actif : les jours depuis le dernier contrôle, en rouge au-delà de 14."},
  {sel:'#eq-app [data-act="ctopen"]',titre:"Derniers contrôles",texte:"✗ NC encore ouvertes, ✓ toutes levées. Touche un contrôle pour ouvrir son rapport.",si:()=>vu('#eq-app [data-act="ctopen"]')},
  {titre:"Chantier actif",texte:"Un chantier est actif quand du monde y est placé cette semaine (ou qu'il a déjà été contrôlé). Les présents sont repris du planning."}
 ],

 /* ═══ Déclarer un accident ═══ */
 'pilotage:accident':[
  {sel:'#eq-app [data-act="accnew"]',titre:"⚠ Déclarer",texte:"Tout de suite, même incomplet : la RH complète. Un presque-accident se déclare aussi, c'est ce qui évite le suivant."},
  {titre:"Le formulaire",texte:"Quoi (accident, presque-accident, soin, trajet), date et heure, chantier et lieu, qui, ce qui s'est passé, lésion, soins, témoins, arrêt."},
  {titre:"📷 Les photos",texte:"Le lieu et le matériel, jamais la personne. Puis « Déclarer — la RH est prévenue »."},
  {sel:'#eq-app .card .ac-h, #eq-app .ac-empty',titre:"Le suivi",texte:"Chaque déclaration : « à traiter » (bord rouge) ou ✓ traitée, avec qui l'a déclarée et quand."},
  {sel:'#eq-app [data-act="acctraite"]',titre:"✓ Traité",texte:"La RH ou la QSE marque « Traité » quand la déclaration CPAM et le dossier sont faits.",si:a=>peut(a,'qse.manage')&&vu('#eq-app [data-act="acctraite"]')},
  {titre:"Depuis le chantier",texte:"Sur le terrain, chacun peut déclarer depuis l'onglet QSE du chantier : le formulaire s'ouvre directement."}
 ],

 /* ═══ Habilitations de l'équipe ═══ */
 'pilotage:habsEq':[
  {sel:'#eq-app [data-act="habf"]',titre:"Filtre par urgence",texte:"À traiter, Expirées, Moins de 90 j, Absentes, Toutes : le chiffre dit combien."},
  {sel:'#eq-app button.eq-trow',titre:"Une habilitation",texte:"Personne, habilitation (n°, 📎 pièce, 📷 photo), échéance et état : expirée en rouge, bientôt en orange. Touche la ligne : sa fiche s'ouvre."},
  {titre:"Ce que voit chacun",texte:"Chacun retrouve ses propres habilitations et leurs échéances dans Compagnon → Passeport."}
 ],

 /* ═══ AFFAIRE — vue d'ensemble ═══ */
 affaire:[
  {titre:"Affaire",texte:"Le suivi financier des chantiers : bons de commande, notes de frais, comptes. Pour le conducteur, le bureau et la direction."},
  {sel:L('cmd'),titre:"Bons de commande",texte:"Les commandes fournisseurs : fournisseur, objet, affaire, type de dépense, lignes, et un bon imprimable.",si:ligne('affaire',L('cmd'))},
  {sel:L('frais'),titre:"Notes de frais à valider",texte:"Les dépenses avancées par les équipes : valider, refuser, puis « remboursé ». Chacun saisit les siennes dans Compagnon.",si:ligne('affaire',L('frais'),a=>opt(a,'frais'))},
  {sel:L('comptes'),titre:"Comptes chantier",texte:"Tous les chantiers d'un coup d'œil : chiffré, facturé, heures, dépenses et résultat indicatif.",si:ligne('affaire',L('comptes'))},
  {sel:L('x:cc:'),titre:"Compte d'un chantier",texte:"Un chantier en détail : heures par poste, bons, dépenses, totaux. Imprimable, sans compta.",si:ligne('affaire',L('x:cc:'),a=>opt(a,'comptechantier'))}
 ],

 /* ═══ Bons de commande ═══ */
 'affaire:cmd':[
  {sel:'#eq-app [data-act="cmd"][data-v="tab|cmd"]',titre:"Trois volets",texte:"Bons de commande, Notes de frais, Comptes chantier : touche une puce pour passer de l'un à l'autre."},
  {sel:'#eq-app [data-act="cmd"][data-v="new|"]',titre:"➕ Bon de commande",texte:"Crée un bon en brouillon, numéroté tout seul, et l'ouvre pour le remplir."},
  {sel:'#eq-app [data-cmdf="fournisseur"], #eq-app [data-act="cmd"][data-v^="open|"]',titre:"Remplir le bon",texte:"Dans le bon (touche-le pour l'ouvrir) : fournisseur, objet, n° d'affaire ou chantier au minimum. Le type de dépense le raccroche au chiffrage ; une location a un début et une fin."},
  {sel:'#eq-app [data-cmdf="etat"], #eq-app [data-act="cmd"][data-v^="etat|"]',titre:"L'état du bon",texte:"Brouillon → Envoyée → Reçue → Facturée, ou Annulée : le menu « État » du bon. Dans la liste, les puces d'état filtrent les bons."},
  {sel:'#eq-app [data-act="cmd"][data-v="ladd|"], #eq-app [data-act="cmd"][data-v^="open|"]',titre:"Les lignes",texte:"Dans le bon : désignation, quantité, unité, prix unitaire HT ; le total se calcule. « ➕ Ligne » pour en ajouter une."},
  {sel:'#eq-app [data-act="cmd"][data-v="print|"], #eq-app [data-act="cmd"][data-v^="open|"]',titre:"🖨 Bon de commande",texte:"Dans le bon : le bon en A4 pour le fournisseur. Livraison à l'adresse du chantier, avec bon de livraison."},
  {titre:"Où ça compte",texte:"Les bons envoyés, reçus et facturés entrent dans le compte du chantier ; un brouillon ne compte pas."}
 ],

 /* ═══ Notes de frais à valider ═══ */
 'affaire:frais':[
  {sel:'#eq-app [data-act="cmd"][data-v="tab|db"]',titre:"Trois volets",texte:"Bons de commande, Notes de frais, Comptes chantier : touche une puce pour passer de l'un à l'autre."},
  {sel:'#eq-app [data-act="cmd"][data-v^="etat|"]',titre:"Filtre par état",texte:"Saisi (à valider), Validé, Refusé, Remboursé : le chiffre dit combien."},
  {sel:'#eq-app .ac-stats',titre:"En bref",texte:"Le total affiché et le nombre de notes à valider."},
  {sel:'#eq-app [data-act="cmd"][data-v="dbnew|"]',titre:"➕ Note de frais",texte:"Pour saisir une dépense toi-même : date, montant TTC, nature, chantier, moyen de paiement, ticket en photo."},
  {sel:'#eq-app [data-act="cmd"][data-v^="dbok|"], #eq-app .eq-list .eq-row',titre:"Valider ou refuser",texte:"Regarde le ticket en vignette (photo ou PDF), puis ✓ valider ou ✕ refuser. « sans ticket » en orange : demande-le."},
  {sel:'#eq-app [data-act="cmd"][data-v^="dbremb|"], #eq-app .eq-list .eq-row',titre:"Remboursé",texte:"Une fois la note payée, touche « remboursé » : la personne le voit dans Compagnon → Notes de frais."},
  {titre:"D'où elles viennent",texte:"Chacun saisit ses notes dans Compagnon, ticket pris en photo. Validées, elles entrent dans le compte du chantier, en HT."}
 ],

 /* ═══ Comptes chantier ═══ */
 'affaire:comptes':[
  {sel:'#eq-app [data-act="cmd"][data-v="tab|comptes"]',titre:"Trois volets",texte:"Bons de commande, Notes de frais, Comptes chantier : touche une puce pour passer de l'un à l'autre."},
  {sel:'#eq-app .ac-stats',titre:"Le total",texte:"Chiffré, facturé, heures pointées (et leur coût), dépenses, résultat indicatif : tous les chantiers ensemble."},
  {sel:'#eq-app table.af-tab',titre:"Une ligne par chantier",texte:"Affaire liée, chiffré, facturé (et %), soudures, heures, main-d'œuvre, dépenses, résultat : en rouge s'il est négatif."},
  {titre:"D'où viennent les chiffres",texte:"Chiffré : le marché de l'affaire liée ; facturé : les situations ; heures × taux chargé ; dépenses : notes validées et bons hors brouillon."},
  {titre:"Un résultat indicatif",texte:"Un repère, pas la compta : le compte réel se fait sur la paie et les factures. Le détail d'un chantier : Compte d'un chantier."}
 ],

 /* ═══ Compte d'un chantier ═══ */
 'affaire:x:cc':[
  {sel:'#eq-app .cc-q, #eq-app [data-act="x"][data-v="cc|choix|"]',titre:"Choisis le chantier",texte:"Cherche par nom ou par ville. Tes chantiers et ceux qui ont des chiffres d'abord ; les autres sont repliés dessous."},
  {sel:'#cc-list .ac-row, #eq-app [data-act="x"][data-v="cc|autres|"], #eq-app .cc-card',titre:"Ouvrir un compte",texte:"Touche un chantier : sa ligne résume les jours pointés, les bons et les notes de frais."},
  {sel:'#eq-app .cc-per, #cc-list .ac-row',titre:"La période",texte:"Dans le compte : « Tout » ou « Un mois » avec ‹ ›. Les heures sont rangées au mois du jour pointé."},
  {sel:'#eq-app .cc-tiles, #cc-list .ac-row',titre:"Les totaux",texte:"Dans le compte : total HT, main-d'œuvre (heures × coût horaire du poste), bons de commande engagés, dépenses."},
  {titre:"Le détail",texte:"Puis les heures par poste (⚠ si un coût horaire manque), les bons de commande, les notes de frais validées, la sous-traitance et la location, les totaux par nature."},
  {sel:'#eq-app [data-act="x"][data-v^="cc|print|"], #cc-list .ac-row',titre:"🖨 Imprimer (A4)",texte:"En haut du compte : le compte en A4. Rien ne se modifie ici : bons, notes de frais et dépenses se corrigent à leur place."},
  {titre:"Aussi dans le chantier",texte:"Le même compte s'ouvre depuis le chantier : onglet Bureau → 💶 Compte chantier."}
 ]
};
