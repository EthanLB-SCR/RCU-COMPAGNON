# RCU-COMPAGNON (TRACÉ)

Application de suivi de réseaux pré-isolés : plan d'ensemble, puzzle de pièces catalogue, soudures, manchons, fils de détection, import de plans DXF, synchronisation Supabase (UE).

## Organisation du dépôt

- `app/` — le code source (voir `app/NOTES.md` : mémoire complète du projet, à lire en premier).
- `index.html` — l'application construite, fichier unique. **C'est ce fichier que GitHub Pages sert en ligne.** Il est généré à partir de `app/`, ne pas l'éditer à la main.

⚠️ Un seul `index.html` à la racine. Ne jamais créer de `index_2.html` ou autre variante : GitHub Pages ne sert que `index.html`, le reste est du code mort qui finit par diverger des sources.

## En ligne

https://ethanlb-scr.github.io/RCU-COMPAGNON/ (GitHub Pages : Settings → Pages → Deploy from a branch → main / root)

## Construire

```
cd app && npm install && npm run build
```
→ produit `app/dist/index.html`, à copier à la racine du dépôt sous le nom `index.html`.
