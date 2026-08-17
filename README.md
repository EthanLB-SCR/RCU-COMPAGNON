# RCU-COMPAGNON (TRACÉ)

Application de suivi de réseaux pré-isolés : plan d'ensemble, puzzle de pièces catalogue, soudures, manchons, fils de détection, import de plans DXF, synchronisation Supabase (UE).

## Organisation du dépôt

- `app/` — le code source (voir `app/NOTES.md` : mémoire complète du projet, à lire en premier).
- `index.html` — l'application construite, fichier unique. **C'est ce fichier que GitHub Pages sert en ligne.** Il est généré à partir de `app/`, ne pas l'éditer à la main.
- `traceur.html` — le **traceur** (création de réseau au bureau : fond de plan DXF en calque, tracé à la règle, pièces catalogue, soudures numérotées ; « Enregistrer dans TRACÉ » remet le chantier à l'appli), construit à partir de `app/maquette/` (`npm run build:maquette`, `dist-maquette/index.html` → `traceur.html`). En ligne : https://ethanlb-scr.github.io/RCU-COMPAGNON/traceur.html — `maquette.html` n'est plus qu'une redirection.
- Flux de travail : **traceur** (bureau, souris) → chantier dans **TRACÉ** (`index.html`, terrain, téléphone : soudures, statuts, photos, sync Supabase) ; retouche = « ✎ Traceur : modifier ce réseau » depuis l'appli, les soudures déjà faites gardent leur numéro.

⚠️ Un seul `index.html` à la racine. Ne jamais créer de `index_2.html` ou autre variante : GitHub Pages ne sert que `index.html`, le reste est du code mort qui finit par diverger des sources.

## En ligne

https://ethanlb-scr.github.io/RCU-COMPAGNON/ (GitHub Pages : Settings → Pages → Deploy from a branch → main / root)

## Construire

```
cd app && npm install && npm run build:all
```
→ produit `app/dist/index.html` (→ `index.html` à la racine) et `app/dist-maquette/index.html` (→ `traceur.html` à la racine).
