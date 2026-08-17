# Tests (Node + Playwright, sans navigateur à installer si Chromium est déjà là)

Prérequis : `cd app && npm install` (déjà fait pour build), puis `npm install --no-save playwright` (le navigateur : `npx playwright install chromium`, ou variable `CHROMIUM_PATH` vers un Chromium existant).

- `node test/parse_test.mjs <fichier.dxf>` — lecture en flux : temps, entités gardées, blocs, mémoire.
- `node test/an_test.mjs <fichier.dxf>` — `analyze()` : profil reconnu, calques candidats, étiquettes DN.
- `node test/build_test.mjs <fichier.dxf>` — `buildSite` / `buildSiteJBTP` : lignes, DN par tronçon, spéciaux, avertissements.
- `node test/e2e_import.mjs <fichier.dxf> ["calque1|calque2"]` — import de bout en bout dans l'appli construite (`dist/index.html`) : lecture, aperçu, création du chantier, rapport, erreurs console, capture `shot_<nom>.png`.
- `node test/e2e_view.mjs <fichier.dxf>` — idem + captures du plan à trois zooms + notes du moteur.

Outils Python (`tools/`) : `dxf_filter.py src.dxf dst.dxf 'regex de calques'` (DXF allégé aux calques du réseau + blocs référencés, pour tests dans l'appli), `scan.py` (inventaire brut), `inv.py` (inventaire ezdxf).

Conversion DWG → DXF : LibreDWG **version de développement** (0.14.x, `git clone https://github.com/LibreDWG/libredwg`, `./autogen.sh && ./configure --disable-bindings --disable-python --disable-shared --disable-json && make -C src && make -C programs dwg2dxf`) — la 0.13.3 publiée échoue sur 3 des 4 plans d'Ethan (« Invalid sections », R2010/R2018) et écrit des noms de blocs anonymes tronqués (`*U`).
