# Fonction serveur « assistant » — la bulle 💬 de Tracé (Discuter, « En faire un bug / une idée »)

**Ce qu'elle fait** : la bulle 💬 (au bord droit de l'écran, partout dans l'appli) envoie la conversation de la personne connectée à cette fonction, qui interroge le modèle Claude et renvoie la réponse. La clé API reste dans Supabase : elle n'est **jamais** dans l'appli ni dans le dépôt.

Les onglets **🐞 Un bug** et **💡 Une idée** n'ont pas besoin de cette fonction : il suffit d'avoir passé `sql/retours_ia_1111.sql` (après `navettes_1011.sql`). Tu les reçois dans la bulle → **📥 Reçus** (administrateur) ; « 📋 Copier pour Claude » met la liste dans le presse-papier pour la coller dans notre conversation.

## 1. Déployer (une fois, 5 minutes, sans ligne de commande)
1. Supabase → projet TRACÉ → **Edge Functions** → **Deploy a new function** → **Via Editor**.
2. Nom : `assistant` (exactement).
3. Effacer le code d'exemple, coller **tout** `index.ts`, puis **Deploy function**.
4. Dans la fonction → **Details** : laisser **Verify JWT** activé.
5. **Edge Functions → Secrets** (ou Project Settings → Edge Functions) → **Add new secret** :
   - `ANTHROPIC_API_KEY` = ta clé API Anthropic (console Claude → API keys). Elle commence par `sk-ant-`.
   - facultatif : `ANTHROPIC_MODEL` (défaut `claude-haiku-5-5` : rapide et économique ; `claude-sonnet-5-5` pour des réponses plus fouillées).
6. Test : dans l'appli connectée, 💬 → « Discuter » → « Comment je pointe une soudure ? ».
   - « L'assistant n'est pas encore branché » : le nom n'est pas exactement `assistant`, ou le déploiement a échoué (onglet Logs).
   - « clé ANTHROPIC_API_KEY absente » : le secret n'est pas posé (étape 5).
   - « le modèle a refusé : … » : clé invalide, crédit épuisé, ou nom de modèle à corriger (secret `ANTHROPIC_MODEL`).

Mise à jour : rouvrir la fonction dans l'éditeur, remplacer tout le code, Deploy.

## 2. Coût et limites
- Chaque question envoie au plus les 20 derniers messages (4 000 caractères chacun) ; réponse limitée à 700 jetons. Avec Haiku, une question coûte une fraction de centime.
- Seuls les comptes **actifs** connectés peuvent l'appeler (jeton vérifié). Rien n'est stocké côté serveur ; la conversation reste sur le téléphone (30 derniers messages, bouton « Effacer »).
- L'assistant n'a pas accès aux données de l'appli (chantiers, heures…) : il aide à s'en servir, il ne lit pas la base.
