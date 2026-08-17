# TRACÉ — MVP (sprint 1)

Application de suivi de réseaux pré-isolés (calepinage, soudures, manchons) — moteur de pièces au cœur.

- `src/engine.js` : moteur (reconnaissance des éléments DWG → pièces catalogue, solveur rigide/libre, outil Modifier · déplacer bleu/orange, soudures, statuts, historique).
- `src/main.js` : chantiers, lignes, stockage local (localStorage, une entrée par chantier/ligne).
- `src/data_*.json` : lignes extraites des DWG (Bain-de-Bretagne LOGSTOR, Saint-Lô tranche jaune Renalia).
- `npm run build` → `dist/index.html` (fichier unique, fonctionne hors-ligne, ouvert directement dans le navigateur).

Prochaines étapes : base de données + comptes (Supabase, région UE), photos, synchro hors-ligne, import DWG dans l'appli, fiches soudure complètes, fils de détection, heures/production.
