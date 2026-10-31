// tutos_chantier.js — 31/10/2026 : TUTORIELS DÉTAILLÉS (Ethan : « un tuto par module qui décrit toutes les options, puis des tutos par option, vastes, pour que tout le monde
// sache se servir de toutes les options »). Déclaratif, lu par tuto.js : clé « module » = vue d'ensemble du module (une étape par option), « module:option » = le
// tutoriel détaillé de l'option. Une étape = {sel:'cible CSS (la 1re visible est surlignée ; sans cible → carte au centre)', titre:'…', texte:'…', si:(api)=>bool}
// (api.can(droit), api.feat(option)). Le nom affiché de chaque option est dans NOMS.
//
// Lot « ch » (31/10) — module Chantier, hors onglets techniques (lot « te ») :
//  · chantiers        accueil du module (Carte / Liste, ouvrir un chantier, Mes chantiers, ＋ Nouveau chantier, Reprendre) — remplace la clé de base (elle parlait encore de « Sécurité »)
//  · chantier         VUE D'ENSEMBLE d'un chantier ouvert : bandeau, 2e ligne, les 3 familles, puis UNE étape par onglet (ceux du lot « te » compris), chacune sur son entrée
//  · chantier:plan / :bureau / :conv / :admin (Dossier) / :qse / :export / :liste / :recap   tutoriels détaillés, dans l'ordre du travail réel
// Choix (notés pour Ethan) :
//  · Vue d'ensemble : sur le plan, la barre d'onglets est cachée → chaque onglet pointe sur son onglet s'il est affiché, SINON sur sa famille (🏕 Vie du chantier / 🔧 Technique) :
//    la cible reste juste quelle que soit la facette ouverte. Récapitulatif, Liste des soudures, Catalogue des pièces : sur « ⋯ Plus » (c'est leur entrée).
//  · Les conditions `si` reprennent EXACTEMENT celles des onglets (app.js : TAB_FEAT + TAB_RIGHT) : un soudeur ne voit que les étapes de ses onglets.
//  · Ce qui n'a pas de cible à l'écran au moment du tuto (la fiche d'une soudure, une tâche reçue…) = étape sans `sel` (carte au centre).
//  · Aucune modification de l'appli : toutes les cibles existent déjà (id, data-*, classes stables) ; aucun attribut data-tu ajouté.
const F=(a,k)=>!a||!a.feat||a.feat(k);                 // option du palier allumée (sans api : on montre)
const C=(a,...ks)=>!a||!a.can||ks.some(k=>a.can(k));    // au moins un de ces droits
const ENC=a=>C(a,'pointage.validate','planning.edit');  // encadrement (Bureau : « Ce qui coince », checklist — espace.js → espaceBureau)
// onglet → [option du palier, droits] : copie de TAB_FEAT / TAB_RIGHT (app.js) — l'étape d'un onglet n'apparaît que si l'onglet existe pour la personne
const TAB={conv:['conv',['conv.post']],admin:['dossier',['qse.sign','dossier.edit']],qse:['qse',['qse.sign','qse.manage']],export:['export',['export.doe']],
  bouclage:['bouclage',['dh.measure']],hydro:['hydro',['hydro']],stock:['stock',['stock.edit']],fourniture:['fourniture',['stock.edit','phasage.edit']],phasage:['phasage',['phasage.edit']],
  ts:['modifs',['ts.qualify']],points:['points',null],catalogue:['stock',['stock.edit']]};
const tabOk=t=>a=>{const d=TAB[t];return !d||(F(a,d[0])&&(!d[1]||C(a,...d[1])));};
const VIE='#facets [data-facet="vie"]',TECH='#facets [data-facet="tech"]';
const onTab=(t,fam)=>`#tabbar [data-tab="${t}"], ${fam}`;            // l'onglet s'il est dans la barre du bas, sinon sa famille
const PLUS=`#tabbar [data-tab="__more"], ${TECH}`;                     // « ⋯ Plus » : Récapitulatif, Liste des soudures, Catalogue des pièces

export const NOMS={
  'chantier:plan':'Plan d\'ensemble',
  'chantier:bureau':'Bureau',
  'chantier:conv':'Conversation',
  'chantier:admin':'Dossier',
  'chantier:qse':'QSE',
  'chantier:export':'DOE et exports',
  'chantier:liste':'Liste des soudures',
  'chantier:recap':'Récapitulatif'
};

export default {
 /* ── accueil du module : Carte / Liste ── */
 chantiers:[
  {titre:"Tracé Chantier : tes chantiers",texte:"Tous les chantiers auxquels tu as accès, sur la carte ou en liste. Touche un chantier pour l'ouvrir sur son plan."},
  {sel:'#htMap',titre:"🗺 Carte",texte:"Les chantiers à leur place : orange en cours, vert terminé. Touche une pastille puis « Ouvrir » ; une pastille noire en regroupe plusieurs, touche-la pour zoomer."},
  {sel:'#htList',titre:"☰ Liste",texte:"Tous les chantiers en cartes. Cherche par nom (🔍 Rechercher un chantier…) et trie par Récents, A → Z ou Avancement."},
  {sel:'#homeBody .siteCard, #homeMap .hmPin, #homeBody .siteRecap',titre:"Ouvrir un chantier",texte:"Chaque carte montre l'avancement (% soudé) et la dernière mise à jour : touche-la pour ouvrir le chantier. 🔒 : pas dans ton planning, vois avec ton conducteur."},
  {sel:'#homeBody .siteRecaps',titre:"Mes chantiers",texte:"Sous la carte, tes chantiers avec leur récap : présents du jour, ✓ en règle, ✗ ce qui bloque. Touche-en un pour arriver directement dans son Bureau.",si:a=>C(a,'planning.edit','pointage.validate','qse.manage')},
  {sel:'#homeBody [data-nc-new]',titre:"＋ Nouveau chantier",texte:"Crée la fiche d'un chantier (nom, ville, client, chef, conducteur…) sans passer par Commerce. Le tracé viendra ensuite : plan DXF ou traceur.",si:a=>C(a,'site.tracer')},
  {sel:'#homeResume',titre:"↩ Reprendre",texte:"En bas de l'écran : le dernier chantier ouvert, à rouvrir d'un seul toucher."}
 ],
 /* ── VUE D'ENSEMBLE d'un chantier ouvert : bandeau, 2e ligne, familles, puis une étape par onglet ── */
 chantier:[
  {sel:'#shName',titre:"Bienvenue dans Tracé Chantier",texte:"Le chantier ouvert et, juste dessous, son avancement. Ici, toute l'équipe, du terrain au bureau, trouve le plan, la vie du chantier (sécurité, conversation, dossier) et la technique."},
  {sel:'#tbSiteMod',titre:"Le bandeau : Tracé Chantier ▾",texte:"Le module où tu es. Touche-le pour passer à un autre module, revoir le tutoriel de l'écran ou ouvrir 📚 Tous les tutoriels."},
  {sel:'#siteSel',titre:"2e ligne : le chantier ouvert",texte:"Touche son nom pour changer de chantier, ⌂ pour revenir à tes chantiers. À droite : ? relance le tutoriel de l'onglet, 🔍 cherche une soudure, ☰ ouvre le menu."},
  {sel:'#facets',titre:"Plan · Vie du chantier · Technique",texte:"Les onglets sont rangés en trois familles. Touche une famille : ses onglets s'affichent dans la barre du bas (glisse-la s'il y en a d'autres)."},
  {sel:'#facets [data-facet="plan"]',titre:"📐 Plan d'ensemble",texte:"Le réseau et toutes ses soudures, en plein écran. Touche une soudure pour ouvrir sa fiche, ＋ pour poser une note, une photo ou une soudure faite sur place."},
  {sel:onTab('bureau',VIE),titre:"🏢 Bureau",texte:"Le tableau de bord du chantier : ce qui t'attend aujourd'hui, ce qui coince, et un raccourci vers chaque onglet."},
  {sel:onTab('conv',VIE),titre:"💬 Conversation",texte:"Messages, notes posées sur le plan avec photo, tâches à faire : tout ce qui se dit sur le chantier, daté et signé.",si:tabOk('conv')},
  {sel:onTab('admin',VIE),titre:"🗂 Dossier",texte:"Les pièces obligatoires (DT / DICT, PPSPS, PGC, plans d'exé…) et le Drive du chantier. Le chef et le bureau déposent, toute l'équipe consulte.",si:tabOk('admin')},
  {sel:onTab('qse',VIE),titre:"⛑️ QSE",texte:"Ton accueil chantier, le quart d'heure sécurité, les documents à émarger et la déclaration d'un accident.",si:tabOk('qse')},
  {sel:onTab('export',VIE),titre:"📷 DOE et exports",texte:"Carnet de soudage, plan des soudures numérotées, photos par soudure, plan interactif : le dossier DOE se fabrique ici.",si:tabOk('export')},
  {sel:onTab('bouclage',TECH),titre:"💧 Détection d'humidité",texte:"Les mesures des fils d'alarme, boucle par boucle : contrôler le réseau, localiser un défaut, poser un bouclage temporaire.",si:tabOk('bouclage')},
  {sel:onTab('hydro',TECH),titre:"🌊 Hydraulique",texte:"Les essais du réseau (épreuve, rinçage) : tronçons d'essai, point d'eau, remplissage, calendrier et procès-verbaux.",si:tabOk('hydro')},
  {sel:onTab('stock',TECH),titre:"🚚 Stockage",texte:"Les livraisons (camions) et les zones de stock du chantier : ce qui est arrivé, où c'est rangé, ce qui en a été pris.",si:tabOk('stock')},
  {sel:onTab('fourniture',TECH),titre:"🧾 Fournitures",texte:"Le besoin en pièces calculé sur le tracé, les commandes fournisseur, ce qui est livré et ce qui reste à livrer.",si:tabOk('fourniture')},
  {sel:onTab('phasage',TECH),titre:"📅 Phasage",texte:"Le chantier découpé en phases, prises sur le plan et datées : le planning d'exécution, pour suivre l'avance ou le retard.",si:tabOk('phasage')},
  {sel:onTab('ts',TECH),titre:"✍️ Modifications",texte:"Le marché comparé au réel : par défaut, tout est compris. « ＋ Déclarer une modif » ressort un changement (TS, pour mémoire), pointé sur le plan.",si:tabOk('ts')},
  {sel:onTab('points',TECH),titre:"📍 Points de contrôle",texte:"Vannes, purges, vidanges, sous-stations, raccordements : leur état (ouvert, fermé) et leurs photos, datés.",si:tabOk('points')},
  {sel:PLUS,titre:"📊 Récapitulatif",texte:"Dans « ⋯ Plus » : les totaux par DN et par ligne, la liste des pièces, les manchons à poser et l'export pour Excel."},
  {sel:PLUS,titre:"🎖 Liste des soudures",texte:"Dans « ⋯ Plus » : toutes les soudures, ligne par ligne, avec leur statut. Touche-en une pour la retrouver sur le plan."},
  {sel:PLUS,titre:"📦 Catalogue des pièces",texte:"Dans « ⋯ Plus » : les dimensions des pièces de chaque fournisseur, celles qui servent à dessiner le plan.",si:tabOk('catalogue')}
 ],
 /* ── 📐 le plan d'ensemble ── */
 'chantier:plan':[
  {sel:'#svg',titre:"Le plan d'ensemble",texte:"Glisse un doigt pour te déplacer, pince à deux doigts pour zoomer. Touche une soudure (un rond) : sa fiche s'ouvre."},
  {sel:'#legend',titre:"Les couleurs des soudures",texte:"Gris : à souder · orange : soudée · bleu : contrôlée · vert : manchonnée · rouge : à reprendre. Trait rouge = aller, trait bleu = retour."},
  {titre:"La fiche d'une soudure",texte:"En haut : n°, statut, DN, aller ou retour, PK. « Faire l'étape … » ouvre la tienne : 1 Soudure (soudeur), puis 2 Fils raccordés, 3 Manchon posé, 4 Moussage (manchonneur)."},
  {titre:"Photo, puis « Valider l'étape »",texte:"📷 Photo du cordon (obligatoire pour la soudure), puis « Valider l'étape » : ton nom et la date restent sur la fiche. Sans réseau, c'est gardé et envoyé au retour du réseau."},
  {sel:'#planFab',titre:"＋ Poser sur le plan",texte:"Une note avec photo, une soudure faite sur place, une modif… : choisis, puis touche l'endroit sur le plan. Une barre en haut t'explique chaque étape.",si:a=>C(a,'phasage.edit','stock.edit','conv.post','site.tracer')},
  {sel:'.zoomctl [data-z="eye"]',titre:"👁 Ce qui s'affiche",texte:"Les calques : DN, longueurs, n° de soudure, fils, notes, points… « Épuré » allège le plan, « Par défaut » remet tout. 📅 juste dessous : qui a fait quoi, et quand."},
  {sel:'#btnSearch',titre:"🔍 Retrouver une soudure",texte:"Tape son n° (ex. 24) puis Entrée : le plan se centre dessus et sa fiche s'ouvre. Le même menu ☰ filtre le plan : « Pour moi », « À souder »…"},
  {sel:'#pxPlanBtn',titre:"📄 Mes plans",texte:"Les plans d'exé du chantier, ceux de ta zone en premier. Depuis la fiche d'une soudure, « 📄 Plan d'exé » ouvre directement la bonne planche.",si:a=>F(a,'plansexe')}
 ],
 /* ── 🏢 le Bureau du chantier ── */
 'chantier:bureau':[
  {sel:'#bureau .ac-bhero',titre:"Aujourd'hui sur ce chantier",texte:"Le % soudé, le chef et le conducteur, la météo et qui est placé aujourd'hui (planning). La première chose à regarder en arrivant."},
  {sel:'#bureau .okbox, #bureau .ac-notif',titre:"Ce qui t'attend ici",texte:"Ton accueil chantier, un quart d'heure sécurité, des documents à émarger, tes tâches : touche une ligne pour t'en occuper. Bandeau vert : rien ne t'attend."},
  {sel:'#bureau .ac-notif.warn, #bureau .ac-kt.bad, #bureau .ac-kt.warn',titre:"Ce qui coince",texte:"Pour l'encadrement : les points bloquants (✗) et à surveiller (!) du chantier. Touche une ligne pour ouvrir l'onglet concerné.",si:ENC},
  {sel:'#bureau .ac-kt.ok, #bureau .ac-kt.warn, #bureau .ac-kt.bad, #bureau .ac-kt.off',titre:"La checklist du chantier",texte:"Une case par sujet : ✓ complet, ! manque, ✗ bloquant, ○ pas commencé. 👥 Équipe et ⏱ Pointages ouvrent Pilotage.",si:ENC},
  {sel:'#bureau .dx-stat',titre:"🗂 Pièces du dossier",texte:"Les pièces obligatoires en règle (ex. 5/8). Touche le compteur pour compléter le Dossier du chantier.",si:a=>F(a,'dossier')&&C(a,'dossier.edit')},
  {sel:'#bureau .ac-kt:not(.ok):not(.warn):not(.bad):not(.off)',titre:"Le chantier : raccourcis",texte:"Une case par onglet auquel tu as accès : touche-la pour y aller directement, sans passer par la barre du bas."},
  {sel:'#bureau [data-bur="__compte"]',titre:"💶 Compte chantier",texte:"Bons de commande, dépenses et heures par poste de ce chantier, en lecture seule et imprimable. Pas de compta.",si:a=>F(a,'comptechantier')&&(C(a,'planning.edit')||(C(a,'affaires.edit')&&C(a,'pointage.validate','qse.manage')))},
  {sel:'#bureau [data-nc-fiche]',titre:"✎ Fiche du chantier",texte:"Ville, client, date de début, fournisseur, note : touche « ✎ Fiche » pour compléter la fiche du chantier.",si:a=>C(a,'site.tracer','planning.edit')}
 ],
 /* ── 💬 la Conversation ── */
 'chantier:conv':[
  {sel:'#cvList',titre:"Le fil du chantier",texte:"Messages, notes posées sur le plan, tâches : tout reste ici, daté et signé. Le 📍 d'une note la montre sur le plan."},
  {sel:'#convview .cvFilters',titre:"Retrouver un message",texte:"Filtre : 💬 Messages, 📍 Sur le plan, ☐ À faire, 👤 Mes tâches, ✓ Faites. 📅 Période et Type valent aussi pour les pastilles du plan."},
  {sel:'#convview .cvCats',titre:"Le type du message",texte:"Choisis d'abord le type (🚧 Balisage, ⛏️ Tranchée, 🦺 Sécurité…) : son icône apparaît sur le plan et sert de filtre.",si:a=>C(a,'conv.post')},
  {sel:'#cvPose',titre:"📍 Sur le plan, 📷 en photo",texte:"« 📍 Placer sur le plan », puis touche l'endroit : la note y apparaît en pastille. « 📷 Photo » ajoute une ou plusieurs photos.",si:a=>C(a,'conv.post')},
  {sel:'#convview label.pill',titre:"☐ Tâche à faire",texte:"Coche « Tâche à faire » et choisis pour qui. La personne la voit dans « 👤 Mes tâches » et la déclare faite, photo à l'appui.",si:a=>C(a,'conv.task')},
  {sel:'#cvText, #cvSend',titre:"Écrire et envoyer",texte:"Écris ton message, puis « Envoyer ». Sans réseau, il est gardé sur le téléphone et part au retour du réseau.",si:a=>C(a,'conv.post')},
  {titre:"Une tâche pour toi",texte:"Elle est dans « 👤 Mes tâches » et au Bureau. « 👋 Je la prends » si elle n'est à personne, puis « ✓ Déclarer fait (photo) » une fois le travail fait."}
 ],
 /* ── 🗂 le Dossier du chantier ── */
 'chantier:admin':[
  {sel:'#admin .dx-sum, #admin .dx-top',titre:"Pièces obligatoires en règle",texte:"Le compteur du chantier (ex. 5/8) et la liste de ce qui manque. Le chef et le conducteur le retrouvent aussi en tête du chantier."},
  {sel:'#admin .dx-p',titre:"Une ligne par pièce",texte:"DT / DICT, PPSPS, PGC, plans d'exé… : ✓ présente, ✗ manquante, ⚠ à mettre à jour (échéance). Touche une pièce présente pour l'ouvrir."},
  {sel:'#admin .dx-dep, #admin .dx-man',titre:"📎 Déposer une pièce",texte:"« 📎 Déposer », puis choisis le fichier (PDF, photo…). DICT, arrêté, qualification : indique la date de fin, l'appli prévient 15 jours avant.",si:a=>C(a,'dossier.edit')},
  {sel:'#admin .dx-man',titre:"⋯ Versions, échéance, sans objet",texte:"Le ⋯ d'une pièce : ses versions, sa date de fin, « à mettre à jour », ou « sans objet » sur ce chantier (elle sort alors du compteur).",si:a=>C(a,'dossier.edit')},
  {sel:'#dx-drive-in, #dx-drive-open, #admin .dx-drvNo',titre:"📁 Le Drive du chantier",texte:"Tout ce qui n'est pas obligatoire vit dans le dossier partagé (Drive, SharePoint…). Son lien https:// s'enregistre une fois, puis « 📁 Ouvrir le Drive du chantier »."},
  {sel:'#px-sec',titre:"📄 Plans d'exé",texte:"Une planche par page (n°, indice, date), rattachée à sa zone du plan. Le chef ou le bureau les importe, les équipes les ouvrent depuis « 📄 Mes plans ».",si:a=>F(a,'plansexe')},
  {sel:'#dx-fold',titre:"Autres documents",texte:"BL, épreuves, plans, accueil, émargements QSE… : touche pour déplier, tout est rangé par catégorie."}
 ],
 /* ── ⛑️ QSE du chantier ── */
 'chantier:qse':[
  {sel:'#qse-parcours, #qse .okbox',titre:"🦺 Ton accueil chantier",texte:"Une fois par chantier, avant de commencer : PPSPS, 10 points (DICT, prévention), signature au doigt. 10 à 15 minutes, ta fiche d'accueil est produite à la fin.",si:a=>C(a,'qse.sign')},
  {sel:'#qse-acc',titre:"Le registre des accueils",texte:"L'émargement de chaque arrivant sur ce chantier, avec la date. « 🖨 Feuille d'émargement » en sort une version papier."},
  {sel:'#qse-accext',titre:"👤 Accueillir sans compte",texte:"Un intérimaire, un sous-traitant ou un visiteur sans compte : déroule son accueil sur ton téléphone, il signe au doigt.",si:a=>C(a,'qse.manage')},
  {sel:'#qse [data-qhnew], #qse [data-qhdo]',titre:"⛑️ Quart d'heure sécurité",texte:"L'encadrement le déclenche (un sujet, 3 questions) ; chacun le fait sur son téléphone et signe. Il s'affiche aussi au Bureau, dans « Ce qui t'attend ici »."},
  {sel:'#qse-accident',titre:"⚠ Accident ou presque-accident",texte:"Blessure, soin, presque-accident : déclare-le tout de suite, depuis le chantier. La RH, la direction et le QSE sont prévenus."},
  {sel:'#qse-controle',titre:"📋 Contrôle chantier",texte:"La trame SCR, point par point, sur le terrain. Les non-conformités restent listées ici jusqu'à leur levée (✓ Lever).",si:a=>C(a,'qse.manage')},
  {sel:'#qse [data-qsignme], #qse [data-qopen], #qse label.btn',titre:"✍️ Documents à émarger",texte:"Lis le document puis signe au doigt : l'émargement vaut « j'ai pris connaissance ». Un chiffre rouge sur l'onglet QSE = ce qu'il te reste à signer."}
 ],
 /* ── 📷 DOE et exports ── */
 'chantier:export':[
  {sel:'#exportview .doeParts',titre:"📁 Le dossier DOE complet",texte:"Coche ce qu'il contient : carnet de soudage, plan numéroté, photos par n° de soudure, plan interactif, modifications, dossier administratif, données."},
  {sel:'#exportview .doeOpts',titre:"Les réglages du plan",texte:"Soudures documentées ou toutes, photos, format (A4 à A0), échelle et orientation des planches."},
  {sel:'#doeZip',titre:"📁 Fabriquer le dossier DOE",texte:"Un .zip complet, prêt à remettre. Reste connecté pendant la fabrication : les photos viennent du serveur."},
  {sel:'#doeCarnet, #doePlan',titre:"À la carte : carnet et plan",texte:"📕 Carnet de soudage, 🗺 Plan des soudures numérotées : ils s'ouvrent dans un nouvel onglet, avec « Imprimer / enregistrer en PDF »."},
  {sel:'#doeLink',titre:"🔗 Le lien pour le client",texte:"« Plan interactif : lien à envoyer » : à coller dans un mail, il s'ouvre sur PC comme sur téléphone. Les messageries bloquent les fichiers .html."},
  {sel:'#doeViewer, #doeMail',titre:"🧭 Le plan interactif en fichier",texte:"Le même plan en .html ou en .zip, pour WeTransfer, OneDrive ou une clé USB. Dans le dossier DOE, il marche même hors ligne."},
  {titre:"Avant d'envoyer",texte:"En bas, « Ce que contient ce chantier » : soudures documentées, photos, intervenants. Tout vient des fiches saisies sur le terrain : vérifie qu'il ne manque rien."}
 ],
 /* ── 🎖 Liste des soudures (⋯ Plus) ── */
 'chantier:liste':[
  {sel:'#liste h3',titre:"Ligne par ligne",texte:"Les soudures de chaque ligne : l'aller (titre rouge), puis le retour (titre bleu), avec leur nombre."},
  {sel:'#liste .wrow',titre:"Une ligne = une soudure",texte:"Son n°, son PK (en mètres) et son DN. « FC » = fausse coupe ; « inversion fils » en rouge = manchon à reprendre."},
  {sel:'#liste .wrow .badge',titre:"Son statut, à droite",texte:"À souder, S Soudée, ✓ Contrôlée, M Manchonnée, ! À reprendre : les mêmes couleurs que sur le plan."},
  {sel:'#liste .wrow',titre:"Touche une soudure",texte:"Le plan s'ouvre, centré sur elle, avec sa fiche : tu y fais ton étape comme d'habitude."},
  {sel:'#btnMenu',titre:"Seulement tes soudures",texte:"Sur le plan, ☰ → Filtrer le plan (« Pour moi », « À souder », « À reprendre »…) : la liste reprend ce filtre."},
  {sel:'#btnSearch',titre:"🔍 Aller droit au but",texte:"Tape le n° d'une soudure puis Entrée : le plan s'ouvre dessus. Les totaux sont dans « ⋯ Plus » → Récapitulatif."}
 ],
 /* ── 📊 Récapitulatif (⋯ Plus) ── */
 'chantier:recap':[
  {sel:'#recap .kpis',titre:"Le chantier en chiffres",texte:"Lignes, mètres de tracé (aller), soudures, % soudées ou plus, % manchonnées."},
  {sel:'#recap .prog',titre:"La barre d'avancement",texte:"Vert : manchonnées, bleu : contrôlées, orange : soudées, rouge : à reprendre. Le nombre de chaque statut est juste dessous."},
  {sel:'#recap table.rc',titre:"Par DN et par ligne",texte:"À soud., Soud., Contr., Manch., À repr., FC (fausses coupes) et % d'avancement : pour chaque DN, puis pour chaque ligne."},
  {titre:"Pièces et manchons",texte:"Plus bas : la nomenclature des pièces du calepinage (quantités aller et retour, ml) et les manchons à poser, posés, restants."},
  {sel:'#csvWelds, #csvPieces',titre:"⤓ Pour Excel",texte:"« CSV soudures » et « CSV pièces » : les mêmes chiffres en fichier, à ouvrir dans Excel."},
  {sel:'#recap [data-gots], #doe-go',titre:"Modifications et DOE",texte:"Tout en bas, deux raccourcis : l'onglet Modifications (écarts à qualifier) et l'onglet DOE et exports.",si:a=>(F(a,'modifs')&&C(a,'ts.qualify'))||(F(a,'export')&&C(a,'export.doe'))}
 ]
};
