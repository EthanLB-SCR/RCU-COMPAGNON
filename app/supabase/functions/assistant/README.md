# Fonction serveur « assistant » — la bulle 💬 de Tracé (Discuter, « En faire un bug / une idée »)

**Ce qu'elle fait** : la bulle 💬 (au bord droit de l'écran, partout dans l'appli) envoie la conversation de la personne connectée à cette fonction, qui interroge le modèle Claude et renvoie la réponse. La clé API reste dans Supabase : elle n'est **jamais** dans l'appli ni dans le dépôt.

**Ce que l'assistant sait (depuis le 11/11 après-midi)** : avec chaque question, l'appli envoie le **manuel de Tracé** — les onglets, la personne (poste, onglets ouverts, droits), le plan de chaque onglet, les tutoriels de l'appli (ceux que la personne voit), les nouveautés pas encore en tutoriel, les situations de terrain → la bonne fonction, un glossaire et « qui peut quoi » dans l'entreprise. Source : `src/assistant_manuel.js` + `src/tuto.js` (tutoriels) + les réglages des droits. **À mettre à jour à chaque lot qui ajoute ou renomme un bouton** (`assistant_manuel.js`) ; les tutoriels suivent tout seuls. La fonction met le manuel en cache 1 h chez le modèle : les questions suivantes le relisent pour presque rien.

Les onglets **🐞 Un bug** et **💡 Une idée** n'ont pas besoin de cette fonction : il suffit d'avoir passé `sql/retours_ia_1111.sql` (après `navettes_1011.sql`). Tu les reçois dans la bulle → **📥 Reçus** (administrateur) ; « 📋 Copier pour Claude » met la liste dans le presse-papier pour la coller dans notre conversation.

## 1. Déployer (une fois, 5 minutes, sans ligne de commande)
1. Supabase → projet TRACÉ → **Edge Functions** → **Deploy a new function** → **Via Editor**.
2. Nom : `assistant` (exactement).
3. Effacer le code d'exemple, coller **tout** `index.ts`, puis **Deploy function**.
4. Dans la fonction → **Details** : laisser **Verify JWT** activé.
5. **Edge Functions → Secrets** (ou Project Settings → Edge Functions) → **Add new secret** :
   - `ANTHROPIC_API_KEY` = ta clé API Anthropic (console Claude → API keys). Elle commence par `sk-ant-`.
   - facultatif : `ANTHROPIC_MODEL` (défaut `claude-haiku-5-5` : rapide et économique ; `claude-sonnet-5-5` pour un meilleur français et de meilleurs raisonnements, environ 20 fois plus cher).
   - facultatif : `ANTHROPIC_EFFORT` = `low` (plus rapide), `medium` ou `high` ; sans lui, le réglage par défaut du modèle.
   - facultatif : `ANTHROPIC_CACHE` = `5m` pour un cache de 5 minutes au lieu d'1 heure.
   - Un secret ajouté ou changé sert dès la question suivante : pas besoin de redéployer.
6. Test : dans l'appli connectée, 💬 → « Discuter » → « Comment je pointe une soudure ? ».
   - « L'assistant n'est pas encore branché » : le nom n'est pas exactement `assistant`, ou le déploiement a échoué (onglet Logs).
   - « clé ANTHROPIC_API_KEY absente » : le secret n'est pas posé (étape 5).
   - « le modèle a refusé : … » : clé invalide, crédit épuisé, ou nom de modèle à corriger (secret `ANTHROPIC_MODEL`).

**Mise à jour du code** (quand `index.ts` change, par exemple le 11/11 après-midi) : Supabase → Edge Functions → `assistant` → onglet **Code** → Ctrl+A → Suppr → coller tout le nouveau `index.ts` → **Deploy**. Les secrets restent.

## 2. Coût et limites
- Chaque question envoie au plus les 20 derniers messages (4 000 caractères chacun) et le manuel (≈ 70 000 à 100 000 caractères selon le poste, soit ≈ 20 000 à 30 000 jetons) ; réponse limitée à 3 000 jetons (la réflexion du modèle compte dedans).
- Prix (Claude Haiku 5.5, novembre 2026) : entrée 0,10 $ / million de jetons, sortie 0,50 $, écriture du cache 1 h 0,20 $, relecture du cache 0,01 $. Une question coûte donc ≈ 0,6 centime de dollar quand le manuel entre en cache, moins d’un dixième de centime ensuite : quelques dollars par mois. Avec Sonnet 5.5 : environ 20 fois plus.
- Seuls les comptes **actifs** connectés peuvent l'appeler (jeton vérifié). Rien n'est stocké côté serveur ; la conversation reste sur le téléphone (30 derniers messages, bouton « Effacer »).
- L'assistant n'a pas accès aux données de l'appli (chantiers, heures…) : il aide à s'en servir, il ne lit pas la base.
