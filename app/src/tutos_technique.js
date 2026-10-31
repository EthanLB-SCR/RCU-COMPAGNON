// tutos_technique.js — 31/10/2026 : TUTORIELS DÉTAILLÉS (Ethan : « un tuto par module qui décrit toutes les options, puis des tutos par option, vastes, pour que tout le monde
// sache se servir de toutes les options »). Déclaratif, lu par tuto.js : clé « module » = vue d'ensemble du module (une étape par option), « module:option » = le
// tutoriel détaillé de l'option. Une étape = {sel:'cible CSS (la 1re visible est surlignée ; sans cible → carte au centre)', titre:'…', texte:'…', si:(api)=>bool}
// (api.can(droit), api.feat(option)). Le nom affiché de chaque option est dans NOMS.
// 31/10 (lot TE) : onglets « 🔧 Technique » d'un chantier (clé = 'chantier:' + onglet, lue par TRACE.tuto.where()) + le traceur (clé « concepteur », bouton ? du traceur).
//  · 1re étape de chaque onglet = l'onglet lui-même dans la barre du bas (où le retrouver) ; puis l'ordre du travail réel (préparer → poser → pointer → retrouver / exporter).
//  · Cibles : ids et data-* posés par le code de l'écran ; ce qui vit dans un pli <details> est visé par « details[open] … » d'abord, sinon par le titre du pli
//    (« > summary ») — un élément d'un pli fermé n'est jamais surligné. Ce qui n'est pas à l'écran (fiche d'une soudure, fenêtre, barre de pose) = carte au centre.
//  · Aucun attribut ajouté dans le code (data-tu) : tout a une cible stable.
//  · Le traceur n'a pas de droits ni de paliers (initTuto sans can / feat) : aucune étape « si » dans « concepteur ».
//  · Le moteur ne fait défiler que si la cible sort de la FENÊTRE : une cible coincée sous la barre d'onglets (ou le bandeau) serait « surlignée » invisible.
//    Cibles choisies pour rester visibles au 1er passage (390 et 360 px, chantier vide ou rempli) : blocs plutôt que petits boutons en bas d'écran, plis du bas de page
//    en carte au centre, bilan du Stockage surligné seulement s'il y a des zones (sélecteur « ~ »). Vérifié par test/e2e_tuto_te_3110.mjs (toucher réel de la cible).
const enc=a=>!a||!a.can||a.can('weld.admin'); /* encadrement (chef, bureau, administrateur) : même règle que ptseq.js (isMgr) */
export const NOMS={
 'chantier:bouclage':'Détection d\'humidité',
 'chantier:hydro':'Hydraulique',
 'chantier:stock':'Stockage',
 'chantier:fourniture':'Fournitures',
 'chantier:phasage':'Phasage',
 'chantier:ts':'Modifications',
 'chantier:points':'Points de contrôle',
 'chantier:catalogue':'Catalogue des pièces'
};
export default {
 /* ── 💧 Détection d'humidité (droit « DH : mesures » : soudeurs, manchonneurs, encadrement) ── */
 'chantier:bouclage':[ /* 01/11 (Ethan) : plan de bouclage en tête (le prévu), puis le réel ; schéma filaire retiré, liste des manchons repliée */
  {sel:'#tabbar [data-tab="bouclage"]',titre:'Détection d\'humidité',texte:'En haut, le plan de bouclage : ce qui est prévu. En dessous, le bouclage fait sur le chantier : la boucle réelle, ta mesure, l\'endroit d\'un défaut.'},
  {sel:'#bpCard',titre:'Le plan de bouclage',texte:'Antennes isolées (I) ou en série (S), coupures du feeder (✂), boîtier de détection (▣) : chaque boucle a sa couleur et sa longueur de fil.'},
  {sel:'#bpCard .bpModes',titre:'Préparer le plan',texte:'Chef ou bureau : « Tés I / S », « ✂ Couper » à un manchon (on boucle de part et d\'autre), « ▣ Boîtier », puis « ✓ Valider le plan ». Les équipes voient la consigne aux tés.'},
  {sel:'#bpCard [data-bpmode="at"]',titre:'Je me place',texte:'Touche un manchon ou le boîtier sur le petit plan : l\'appli dit dans quelle boucle tu es et ce que tu dois lire en théorie.'},
  {sel:'#bl-line',titre:'Le bouclage réel',texte:'Choisis la ligne, puis Aller ou Retour : chaque conduite a sa boucle, calculée depuis le départ. Les paramètres (Ω/km, isolement mini) sont juste en dessous.'},
  {sel:'#bouclage .card:has(#dh-rows)',titre:'La boucle réelle',texte:'Fermée ou non, raccordés, à faire, inversions. Le détail manchon par manchon est replié : ouvre-le si besoin, un manchon touché sert de point de mesure.'},
  {sel:'#dh-mesure',titre:'Mesure en un point',texte:'Saisis la boucle (Ω) et l\'isolement (MΩ), puis « Comparer » : vert = conforme, jaune = à vérifier. « 💾 Enregistrer » garde la mesure et le bouclage du moment.'},
  {sel:'#loc-from',titre:'Localiser un défaut',texte:'Dis où l\'appareil est branché, sur quel fil et la distance annoncée, puis « Localiser ». « Voir sur le plan » montre l\'endroit.'}
 ],
 /* ── 🌊 Hydraulique (droit « Hydro » : chef, bureau) ── */
 'chantier:hydro':[
  {sel:'#tabbar [data-tab="hydro"]',titre:'Hydraulique',texte:'Prépare et trace les essais du réseau (épreuve, rinçage, passivation, remplissage), du découpage en tronçons jusqu\'au PV. Pour le chef de chantier et le bureau.'},
  {sel:'#hydro .hyCard',titre:'1 · Prestations à préparer',texte:'Touche la carte de chaque essai prévu (✓). Son étiquette dit ce qu\'il faut aux extrémités : kits fin de ligne, ou by-pass dès que l\'eau circule.'},
  {sel:'#hydroMap',titre:'2 · Sectorisation & points d\'eau',texte:'Avec les boutons juste au-dessus de la carte : « ✂ Sectoriser » coupe le réseau en tronçons d\'essai ; « 💧 Point d\'eau », « 🚰 Remplissage » (un par tronçon) et « ⬛ Skid » se posent sur le plan.'}, /* la carte : sous les boutons de pose, qui tombent souvent sous la barre d'onglets au 1er passage */
  {sel:'#hydroMap',titre:'Les tronçons sur la carte',texte:'Chaque tronçon a sa couleur ; ⇄ BP = by-pass à poser, KFL = kit fin de ligne, ⚠ = fond bombé déjà soudé. « 🔎 Bornes de la ville » affiche les bornes d\'eau proches.'},
  {sel:'#hydro [data-monew], #hydro .pt-row',titre:'Vannes et mode opératoire',texte:'L\'état de chaque vanne de sectionnement se suit ici. « ＋ Créer un mode opératoire » : vannes de départ sur le plan, puis remplir, purger, mettre en pression… et le terrain coche « ✓ Fait ».'},
  {sel:'#hydro .hyPal, #hydro .hyOp',titre:'3 · Calendrier prévisionnel',texte:'Glisse une pastille (Eau brute, Épreuve, Rinçage, Vidange…) sur le jour, dans la ligne du tronçon ; sur « 🗑 » pour l\'enlever. Sans glisser : « ＋ Ajouter par formulaire ».'},
  {sel:'#hyReport',titre:'4 · Récap par tronçon',texte:'Linéaire, volume, débit de rinçage, temps de remplissage et pièces à poser, tronçon par tronçon. « 📄 Dossier de prépa » sort une page globale et une page par tronçon.'},
  {sel:'#hydro [data-hxedit]',titre:'5 · Exécution et PV',texte:'« ＋ Renseigner » pour chaque tronçon et chaque essai : relevés de début et de fin, photo du manomètre, Conforme ou Non conforme. Puis « 📄 Rapport de réalisation + PV ».'}
 ],
 /* ── 🚚 Stockage (droit « Stock » : chef, conducteur, magasin) ── */
 'chantier:stock':[
  {sel:'#tabbar [data-tab="stock"]',titre:'Stockage',texte:'Les pièces pré-isolées livrées sur le chantier : camions, zones de stockage posées sur le plan, ce qui est pris et ce qui reste. Pour le chef, le conducteur et le magasin.'},
  {sel:'#stk-new',titre:'＋ Nouvelle livraison (camion)',texte:'Nom, n° de BL, date, puis le contenu : le PDF du bon de livraison se lit tout seul ; sinon « 📋 Coller », « ✍ Catalogue » ou « Depuis le calepinage ».'},
  {titre:'Prévu, puis la zone',texte:'Laisse « Déchargement prévu » coché tant que le camion n\'est pas là. Pour une nouvelle zone, touche le plan à l\'endroit du déchargement, ajuste (glisser, poignées, ↻ 15°), puis « Terminer ».'},
  {sel:'#stock [data-stkunload]',titre:'📦 Le camion est arrivé',texte:'Quand il arrive, touche « 📦 … est arrivé — pointer » : photo, puis quantités réelles face au BL. Les écarts sont signalés ⚠ et la marchandise entre en stock.'},
  {sel:'#stock details[open] #stkMap, #stock [data-stkui="map"] > summary',titre:'Plan d\'ensemble des stockages',texte:'Toutes les zones sur un plan : touche une zone pour sa fiche. Livré, pris, reste, et la provenance pièce par pièce (camion d\'origine, déplacements).'},
  {sel:'#stock [data-stkui^="z:"] > summary',titre:'Une carte par zone',texte:'Bord vert = en stock, jaune = prévue ; livré, pris et reste par référence. « ⇄ Scinder / transférer » déplace des pièces vers une autre zone, leur camion d\'origine les suit.'},
  {titre:'Les prises du terrain',texte:'Au manchonnage, l\'opérateur touche dans la fiche de la soudure la zone d\'où vient la pièce (la plus proche est pré-choisie). « Pris » et « reste » se mettent à jour tout seuls.'},
  {sel:'#stock [data-stkui^="z:"] ~ [data-stkui="bal"] > summary',titre:'Besoin / livré / reste à poser',texte:'En bas, le stock et l\'attendu face à ce qu\'il reste à poser, pour tout le réseau ou une ligne : rouge = il manque, beige = surplus. « ⬇ CSV besoin / livré / reste » pour le transmettre.'} /* surligné seulement s'il y a des zones (sinon, page courte : il tombe sous la barre d'onglets) */
 ],
 /* ── 🧾 Fournitures (droits « Stock » ou « Phasage ») ── */
 'chantier:fourniture':[
  {sel:'#tabbar [data-tab="fourniture"]',titre:'Fournitures',texte:'Ce que le tracé demande (besoin), ce qui est commandé et livré, ce qui reste à livrer et à commander. Pour le chef, le conducteur et le bureau.'},
  {sel:'#fourniture .ac-stats',titre:'Les chiffres clés',texte:'Besoin, commandé, livré, reste à livrer, à commander, surplus. Livré et attendu viennent tout seuls de l\'onglet Stockage (réceptions pointées) : rien à ressaisir.'},
  {sel:'#fourniture [data-fzui="cmd"]',titre:'Commande fournisseur',texte:'« 📥 Importer une commande » : l\'accusé de réception du fournisseur (Excel, CSV ou PDF) est lu ligne par ligne et vérifié avant d\'entrer.'},
  {sel:'#fourniture details[open] .fz-cmp tr:has(th), #fourniture [data-fzui="cmp"] > summary',titre:'Comparatif tracé ↔ commande ↔ livré',texte:'Une ligne par référence, de l\'initial au reste à livrer ; au-dessus, les filtres Écarts, À commander, Reste à livrer. En rouge : à commander, ou au-delà de la commande, à qualifier.'}, /* la ligne d'en-têtes : le tableau entier est plus haut que l'écran */
  {sel:'#fourniture details[open] [data-fa="lasso"], #fourniture [data-fzui="zones"] > summary',titre:'Zones à livrer · planning',texte:'« ⭕ Entourer une zone sur le plan » (ou « 📅 Reprendre les phases du phasage ») : pour la zone, ce qui est sur place, annoncé, à faire livrer et à commander.'},
  {sel:'#fourniture [data-fzui="trucks"]',titre:'Camions · planning des livraisons',texte:'Les camions se calculent depuis les zones datées (livraison = début de zone − délai). « → Stock » annonce le camion dans l\'onglet Stockage, où se fait le pointage.'},
  {titre:'Pièces en plus',texte:'Plus bas, le pli « Pièces en plus » : casse, chutes, réserve, modif terrain → « ＋ Ajouter des pièces en plus ». Elles s\'ajoutent au besoin, avec qui et pourquoi.'}, /* plis du bas de page : carte au centre (le moteur ne les fait pas remonter au-dessus de la barre d'onglets) */
  {titre:'Hypothèses · délai et camions',texte:'Tout en bas : délai avant le début de zone, plateau, hauteur, charge utile. Ce sont des ordres de grandeur pour planifier les camions ; le fournisseur confirme.'}
 ],
 /* ── 📅 Phasage (droit « Phasage » : chef, conducteur, bureau) ── */
 'chantier:phasage':[
  {sel:'#tabbar [data-tab="phasage"]',titre:'Phasage',texte:'Découpe le chantier en phases réelles, prises sur le plan, avec leurs dates : Tracé en déduit les soudures par jour et les fournitures. Pour le chef, le conducteur et le bureau.'},
  {sel:'#phasage [data-phnew]',titre:'➕ Nouvelle phase',texte:'Touche la conduite au début du tronçon, puis à la fin (même au milieu d\'une barre) ; pour une antenne, touche-la jusqu\'où tu veux aller. Puis « Créer ».'},
  {sel:'#phasage .phMini',titre:'Les phases sur le plan',texte:'Chaque phase EXE y prend sa couleur et son numéro, les phases marché sont en gris. Touche un tronçon pour ouvrir sa phase.'},
  {titre:'Les dates d\'une phase',texte:'« Ouvrir » une phase : son nom et 4 périodes, ouverture de tranchée (marron), soudure (orange), remblaiement (vert), enrobé (gris). Sous « On vient souder », coche les jours réels.'},
  {sel:'#phasage [data-phwk]',titre:'Semaine de soudure',texte:'« 4 j (lun → jeu) » ou « 5 j (lun → ven) », jours fériés déduits. Tracé en tire les soudures par jour et par DN, les mètres ouverts et remblayés par jour (ou sur les jours cochés).'},
  {sel:'#phImport',titre:'＋ Phase marché',texte:'Le planning du marché : pose-la sur le plan comme une phase, avec sa période, puis « 🔒 Figer (référence des écarts) ». Les phases EXE s\'y rattachent seules, par leur position.'},
  {sel:'#phasage [data-phlv]',titre:'EXE, Marché, Tout',texte:'Filtre la liste des phases ; coche des phases EXE puis « Σ Grouper les cochées » pour suivre un secteur. Le planning, en bas, compare chaque marché à ses phases.'},
  {sel:'#phExport',titre:'📄 Exporter le phasage',texte:'Une page imprimable (PDF) : le plan, le planning, puis une section par phase avec ses soudures et ses fournitures, à partager avec les équipes.'}
 ],
 /* ── ✍️ Modifications (droit « Modifications » : chef, conducteur, bureau) ── */
 'chantier:ts':[
  {sel:'#tabbar [data-tab="ts"]',titre:'Modifications',texte:'Compare le tracé du marché (figé) au réel. Par défaut tout est compris : tu déclares seulement ce que tu veux ressortir (TS, pour mémoire…), pointé sur le plan.'},
  {sel:'#tsview .tsMain, #tsview .mdEc',titre:'Marché vs réel / projeté',texte:'Linéaire, soudures, coudes, vannes, tés… : la quantité du marché, celle du réel et l\'écart, avec ce qui est ajouté ou retiré. La ligne au-dessus résume les écarts.'},
  {sel:'#tsview [data-mod="decl"]',titre:'＋ Déclarer une modif',texte:'Un nom, un état, le n° de devis, puis « Ce que je veux ressortir » : changement de DN, linéaire, soudures, pièces ou autre. Un écart constaté s\'ajoute d\'un toucher.'},
  {titre:'📍 Pointer sur le plan',texte:'Dans la fenêtre, « 📍 Pointer sur le plan » : touche l\'endroit (plusieurs points possibles, re-touche pour enlever), puis « ✓ Terminé ». Depuis le plan : ＋ Poser → ✍ Déclarer une modif.'},
  {titre:'Les états',texte:'TS proposé (jaune), TS commandé (orange, n° de devis obligatoire), Pour mémoire (vert), Compris (violet), Oubli du dessin (gris, le marché est corrigé). Le repère sur le plan prend sa couleur.'},
  {sel:'#tsview .dclCard, #tsview .mdCard',titre:'Les modifs déclarées',texte:'Une carte par modif : ce qui est ressorti, où, la note, les photos, le journal ; « ✎ Modifier », « 🗺 Voir sur le plan ». Sur le plan, touche un repère n° pour sa fiche.'},
  {sel:'#tsview [data-mod="export"]',titre:'📄 Export des modifications',texte:'Une page imprimable : comparaison marché → réel, récap par état, puis chaque modif avec son plan et son repère. À joindre au devis ou au DOE.'},
  {sel:'#tsview [data-tsrefreeze]',titre:'🔒 Re-figer le marché…',texte:'Si le tracé de base n\'était pas fini quand le marché a été figé, ou pour un avenant : le tracé actuel devient la référence. L\'ancien marché est gardé.'}
 ],
 /* ── 📍 Points de contrôle (toute l'équipe ; écrire = droit « Conversation ») ── */
 'chantier:points':[
  {sel:'#tabbar [data-tab="points"]',titre:'Points de contrôle',texte:'Les vannes, purges, vidanges, sous-stations et raccordements du tracé : leur état et leurs photos datées, pour le suivi et le DOE. Pour toute l\'équipe du chantier.'},
  {sel:'#points .pt-kpi',titre:'Ce qui reste à faire',texte:'Les vannes sans état et les points sans photo, en rouge tant qu\'il en manque. Juste en dessous, les filtres (Sans photo, Vannes, Purges / vidanges…) ne montrent qu\'eux.'},
  {sel:'#points .pt-row',titre:'Ouvrir un point',texte:'Touche une ligne : la fiche du point s\'ouvre. « 📐 Plan » montre la pièce sur le plan, avec sa pastille.'},
  {titre:'Ouverte ou fermée',texte:'Dans la fiche d\'une vanne, d\'une purge ou d\'une vidange : « 🔓 Ouverte » ou « 🔒 Fermée ». C\'est daté, à ton nom, et l\'appli te demande aussitôt la photo.'},
  {titre:'Les constats photo',texte:'« 📷 Ajouter des photos », puis le contexte : pénétration, pièce posée, épreuve, fuite… Sans réseau, les photos attendent sur le téléphone et partent toutes seules.'},
  {titre:'Les pastilles sur le plan',texte:'À côté de chaque pièce : vert = ouverte, rouge = fermée, bleu = photos, gris = rien encore, orange = à voir (vanne de coupe ouverte pendant un essai).'},
  {sel:'#points [data-moterrain]',titre:'Mode opératoire hydraulique',texte:'Quand le bureau a préparé un essai, il s\'affiche en haut : « Suivre sur le plan » montre chaque étape (vannes, remplissage, purges). Coche « ✓ Fait » au fur et à mesure.',si:a=>!a||!a.feat||a.feat('hydro')},
  {titre:'Suivre une autre pièce',texte:'Encadrement : dans la fiche d\'une pièce, « 📍 Suivre ce point (photos, état) » l\'ajoute à cette liste, filtre « Autres suivis ».',si:enc}
 ],
 /* ── 📦 Catalogue des pièces (⋯ Plus ; droit « Stock ») ── */
 'chantier:catalogue':[
  {sel:'#tabbar [data-tab="__more"], #catalogue h2.vt',titre:'Catalogue des pièces',texte:'Les cotes des pièces de chaque fournisseur : Tracé s\'en sert pour reconnaître les pièces du plan et les dessiner. Cet écran s\'ouvre par « ⋯ Plus », au bout de la barre du bas.'}, /* ⋯ est souvent hors écran (barre défilante) : le titre de l'écran en repli */
  {sel:'#catalogue [data-cat]',titre:'Un fournisseur à la fois',texte:'Touche une puce pour changer de fournisseur ; « · ce chantier » marque celui du chantier ouvert.'},
  {sel:'#catalogue table.cat',titre:'Les tableaux',texte:'Tubes droits (DN, Ø acier, gaines, longueurs de barre), puis coudes, tés, réductions, vannes et manchons. Glisse un tableau large sur le côté pour tout voir.'},
  {titre:'Une cote fausse ?',texte:'La source du catalogue est indiquée en haut. Une cote fausse donne un plan faux : signale-la au bureau, avec la référence du fournisseur.'}
 ],
 /* ── Tracé Concepteur (le traceur, traceur.html — bouton ?) : vue d'ensemble, une étape par option ── */
 concepteur:[
  {titre:'Tracé Concepteur',texte:'On dessine ici le réseau (lignes, pièces) sur un plan de fond, puis on l\'envoie dans le chantier. Pour le bureau et l\'encadrement, plutôt sur ordinateur.'},
  {sel:'#mTrace',titre:'✎ Tracer une ligne',texte:'Clique les sommets de l\'axe un à un, puis Entrée (ou « Terminer ») ; ou saisis longueur et angle, puis « Ajouter ». Les soudures se placent toutes seules.'},
  {sel:'#supplier',titre:'Fournisseur, série, DN, barre',texte:'À régler avant ou pendant le tracé : la ligne prend ces valeurs quand tu la valides. « prof. » = profondeur de pose par défaut, modifiable ligne par ligne.'}, /* « Tracer une ligne » reste la 2e étape (e2e_mo_3110 c6) */
  {sel:'#mSelect',titre:'☝ Sélection',texte:'Touche une ligne, une soudure ou une pièce pour sa fiche ; glisse un sommet pour retoucher. « ◐ Un seul côté » ne bouge qu\'une conduite.'},
  {sel:'#mAdd',titre:'Les pièces',texte:'« ＋ Té / vanne / réduction / lyre / drapeau » : choisis la pièce et son DN, puis touche la ligne à l\'endroit voulu.'},
  {sel:'#bUndo',titre:'Annuler, rétablir',texte:'↶ annule la dernière retouche (Ctrl+Z), ↷ la rétablit (Ctrl+Y), plans de fond compris.'},
  {sel:'label:has(> #bgAdd)',titre:'＋ Plan (DXF, PDF, image)',texte:'Ajoute un ou plusieurs plans de fond : DXF du bureau d\'études, PDF (une page = un plan), image ou scan. Chaque plan se cale ensuite.'},
  {sel:'#bgTools #bgCal2, #bgTools #bgScale, aside .tabs [data-tab="fond"]',titre:'Caler un plan',texte:'« 📏 Échelle » : deux points de distance connue ; « 1/N » pour un PDF ; « ✥ Déplacer » ; « ⟲ 2 points » le cale d\'un coup sur le tracé. Sur ordinateur : onglet Fond.'},
  {sel:'#bAer',titre:'📍 Vue aérienne',texte:'Tape une adresse : la photo IGN se met en fond, derrière les plans. Puis « ⌖ Caler sur la vue aérienne » : 1 point pour placer, 2 pour tourner aussi.'},
  {sel:'#t1Zones',titre:'▦ Zones de chiffrage',texte:'« ▭ Sélection » : entoure des lignes d\'un rectangle, puis « Mettre dans la zone… ». « ▦ Zones » liste chaque zone avec son nom, ses lignes et ses ml.'},
  {sel:'#tbVers',titre:'🕑 Versions',texte:'Dans une étude (Commerce), « 🕑 Versions » montre ce qui a été ajouté, modifié ou supprimé à chaque version ; touche une version pour voir ses changements.'},
  {sel:'#bSave',titre:'💾 Enregistrer dans Tracé',texte:'Donne le nom du chantier, ou mets à jour l\'existant (soudures déjà faites gardées). Le réseau part dans le chantier, soudures numérotées, et au serveur si tu es connecté.'}
 ]
};
