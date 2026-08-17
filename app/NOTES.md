# RCU-COMPAGNON (TRACÉ) — état du projet et repères pour continuer

Lis ce fichier en premier : il résume ce qui a été décidé avec Ethan (chef de chantier réseaux de chaleur pré-isolés) et où on en est.

## Ce que fait l'appli (index.html à la racine du dépôt = build de ce dossier)
- Plan d'ensemble multi-chantiers, deux conduites (aller rouge / retour bleu), fiches soudure (statut, procédé, contrôle, fils de détection, photos), schéma de bouclage, liste, rôles (soudeur, manchonneur, chef, bureau), catalogue des pièces, import DXF, synchronisation Supabase.
- **Moteur de pièces** (`src/pieces.js`) : chaque ligne est un puzzle de pièces catalogue (barres 12 m entières = rigides, barres coupées = libres, coudes/tés/vannes/réductions = rigides). Outil « Modifier le calepinage » : bleu = bouge d'un bloc, orange = encaisse (barre recoupée / tube créé à la soudure), le reste ne bouge pas ; glisser une soudure = la coulisser ; supprimer une soudure = fusion. Soudures faites protégées : ajustée (statuts/photos gardés) ou « à refaire », infos d'une soudure supprimée rattachées à la voisine — toujours demandé, jamais silencieux.
- **Chaque conduite a son propre puzzle** (axe propre à l'entraxe réel = gaine + 15 cm) : mêmes coudes catalogue des deux côtés, les barres coupées encaissent, soudures décalées.
- **Catalogue** (`src/catalogue.json`, onglet Catalogue) : Renalia = catalogue ZPU Międzyrzecz 2024 (décision Ethan : on se fie au ZPU, coudes jambes 1000 mm), LOGSTOR (Product Catalogue 01/2025, lu par OCR/pages : coudes 2500, tés 45° 3500, bouts nus 220 mm), AXIOM (UNO Isolation 1, 2024, complet), INPAL (PU130 2016). Le DN, la gaine et la série doivent devenir modifiables dans l'appli (demande d'Ethan).
- **Import DXF** (`src/dxfimport.js`) : lecture DXF ASCII dans le navigateur (le DWG est converti en DXF avec LibreDWG côté serveur/assistant), profils de dessin : `JBTP/Mensura` (Nantes : pièces dessinées en blocs « Présentation » avec calques internes Tube/Isolation, coudes/tés en blocs, étiquettes « DN50 (60,3/125) », réductions « Réduction DN80 x 50 »), et générique (axes en polylignes → genLine). Aperçu coloré + questions avant création (écarts de dessin : convention → absorbés par les barres coupées / vrais trous → gris). Le dessin d'origine devient le fond de plan (sheet type `vector`).
- **Supabase** (`src/sync.js`) : projet `pghftlepduvfazbiavhq` (Francfort), clé publishable dans le fichier, tables sites / line_state / welds / events + bucket photos, RLS « authenticated ». Connexion par lien e-mail. Hébergement : GitHub Pages https://ethanlb-scr.github.io/RCU-COMPAGNON/

## Processus d'import validé avec Ethan (6 étapes)
1 lecture du dessin (calques, blocs, textes, cotes) → 2 reconstruction du réseau (aller/retour appairés, antennes aux tés) → 3 puzzle par ligne avec le catalogue → 4 contrôles (barre > 12 m, chute < 1 m, angle > 3° à une soudure, DN sans réduction, saut d'axe, pièce non lue, antenne sans té) → 5 questions au chef une par doute avec l'extrait du plan sous les yeux, et pose manuelle « à la grosse » de pièces du catalogue que le moteur remet d'équerre → 6 validation + rapport, ré-import d'une nouvelle version du plan en conservant les soudures faites.

## En cours / à faire (ordre convenu)
1. Profil LOGSTOR dans l'import (composants 2000/2500/3500/4200/5252, sous-blocs Joint_Single) puis **réimport de Bain-de-Bretagne par Ethan** ; puis profil Renalia (blocs « 1+1 », marques de soudure cotées 12,00, blocs 10090+/4090+/3290+) et réimport de Saint-Lô (tranche jaune ; zone bleue V18 jamais reçue).
2. Règle « les pièces catalogue ne rentrent pas dans le tracé (chicane trop courte) → doute affiché, pas de géométrie forcée ».
3. Écran des questions complet + pose manuelle des pièces (bac à sable = ancienne maquette « moteur pièces »).
4. DN / gaine / série modifiables par tronçon (propagation jusqu'à la réduction suivante), tracés dans l'historique.
5. Nantes (JBTP) : réponse attendue d'Ethan sur les écarts de 0,8 m entre pièces dessinées ; 54 pièces dans une zone à 240 km ignorées (détail/légende ?).
6. Option « appliquer aussi à l'autre conduite » dans l'outil de calepinage.
7. Serveur : conversion DWG automatique, Supabase Pro quand ça devient sérieux, dépôt privé + nom de domaine.

## Construire / publier
`cd app && npm install && npm run build` → `dist/index.html` → copier à la racine du dépôt (`index.html`) → GitHub Pages sert la nouvelle version en une minute.
Tests : Playwright (voir `../_test` dans l'ancien espace de travail — à recréer au besoin) ; l'appli expose `window.TRACE` pour le débogage.

## Poste de travail d'Ethan (mis en place le 17/08/2026)
- Dépôt cloné sur son PC (`scr-70`, Windows) dans `C:\Users\EthanLEBIHAN\Dev\RCU-COMPAGNON` — **hors OneDrive** (son dossier `SCR` et ses Documents sont synchronisés SharePoint, incompatibles avec Git).
- Il publie avec **GitHub Desktop** : saisir un résumé → `Commit to main` → `Push origin`. Il ne construit pas lui-même ; l'assistant construit et dépose `index.html` dans le dossier connecté.
- Ethan part de zéro en code : détailler chaque manipulation (nom exact des boutons, chemins complets), et ne jamais lui faire taper un chemin quand un bouton « Choose… » existe.

## Historique des correctifs
- **17/08/2026 — `ensureSite()` réintégré.** Le dépôt contenait un `index_2.html` (build plus récent uploadé sous un autre nom parce que GitHub refusait d'écraser `index.html`) porteur d'un correctif absent des sources et absent de la version en ligne : `sync.ensureSite()` crée la fiche chantier dans la table `sites` (upsert `onConflict:'id'`, `ignoreDuplicates:true`, `data:{builtin:true}`) **avant** tout `saveWeld` / `saveLineState`, sinon les soudures des chantiers pré-chargés (Bain, Saint-Lô — jamais passés par l'import) ne remontent pas au serveur. `loadSites()` filtre désormais ces fiches `builtin` (sans `lines`) pour qu'elles n'apparaissent pas comme des chantiers vides. Correctif reporté dans `src/sync.js` + `src/app.js` ; build reconstruit identique au bit près à `index_2.html` (md5 `e57dde300c8924b601df5cb44639dc9b`), ce qui valide la reconstitution. `index_2.html` supprimé.
- **17/08/2026 — rangement du dépôt.** Les sources sont passées de `RCU-COMPAGNON_source/app/` à `app/` à la racine ; le doublon `RCU-COMPAGNON_source/index.html` supprimé. Ajout d'un `.gitignore` (`node_modules/`, `app/dist/`). Règle : **un seul `index.html`, à la racine** — c'est le seul fichier servi par GitHub Pages.
