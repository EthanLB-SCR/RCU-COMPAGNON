# Fonction serveur « acces-code » — code de connexion donné par l'administrateur (sans e-mail)

**Pourquoi** : sans serveur d'envoi (SMTP) personnalisé, Supabase n'envoie ses e-mails de connexion qu'aux **membres de ton organisation Supabase** (2 par heure). Les salariés ne reçoivent donc ni code ni lien.
Avec cette fonction, l'administrateur crée dans TRACÉ un **code provisoire** pour une personne. Elle le tape sur l'écran d'accueil (« Première connexion »), puis choisit tout de suite son propre mot de passe, que l'administrateur ne connaît pas.

Aucun SQL à passer, aucun secret à configurer : la clé de service est fournie par Supabase à la fonction pendant son exécution. Elle n'est jamais dans l'appli ni dans le dépôt.

## 1. Déployer la fonction (une fois, 5 minutes, sans ligne de commande)
1. Supabase → projet TRACÉ → menu **Edge Functions** → **Deploy a new function** → **Via Editor**.
2. Nom de la fonction : `acces-code` (exactement).
3. Effacer le code d'exemple, coller **tout** le contenu de `index.ts`, puis **Deploy function**.
4. Dans la fonction → **Details** : laisser **Verify JWT** activé (comme pour `outlook-sync`).
5. Test : dans l'appli, Administrateur → une personne invitée → **🔐 Code de 1re connexion** → **Activer ce code** → « ✓ Code actif ».
   - Message « La fonction serveur « acces-code » n'est pas encore installée » : le nom n'est pas exactement `acces-code`, ou le déploiement a échoué (onglet Logs).

Mise à jour : rouvrir la fonction dans l'éditeur, remplacer tout le code, Deploy.

## 2. Au quotidien
- **Nouvel arrivant** : Administrateur → « ➕ Créer un accès » (e-mail, poste), puis **🔐 Code de 1re connexion** sur sa carte → **Activer ce code**. Tu donnes le code de vive voix ou par SMS (bouton « 💬 Envoyer par SMS » : message prêt avec le lien de l'appli, son e-mail et le code).
- **La personne**, sur l'écran d'accueil : « Première connexion ou oubli : créer mon mot de passe » → son e-mail → le code (espaces et majuscules acceptés) → son mot de passe deux fois → elle est connectée.
  Si elle tape le code directement dans la case « mot de passe », l'appli la connecte puis lui demande de choisir son mot de passe avant d'entrer.
- **Mot de passe oublié** : sur sa carte, **🔐 Nouveau code**. Le code remplace son ancien mot de passe ; elle en rechoisit un en se connectant.

## Sécurité
- Seul un **administrateur actif** peut créer un code. La fonction revérifie la session auprès du serveur d'authentification, puis `is_admin()` avec le jeton de l'appelant (même règle que la base).
- La personne doit avoir un accès créé (invitation) ou un compte **actif**. La fonction refuse son propre compte et tout compte **administrateur** : un administrateur change son mot de passe lui-même dans 🔑 de son compte. Pour un autre administrateur qui a oublié son mot de passe : retire-lui ★, fais le code, remets ★.
- Le code fait 8 caractères, en minuscules et chiffres, sans i, l, o, 0 ni 1 (rien à confondre, même avec des gants). Il n'est ni stocké ni journalisé. Un nouveau code annule le précédent.
- Le code reste valable tant que la personne ne s'en est pas servie. À sa première connexion, l'appli l'oblige à choisir son propre mot de passe (repère `must_change` sur le compte, effacé dès que le mot de passe est posé).
- Le compte est créé avec l'adresse « confirmée » d'office : c'est l'administrateur qui se porte garant de l'adresse.

## Plus tard (facultatif) : e-mails à tout le monde (SMTP)
Pour que chacun puisse recevoir un code ou un lien par e-mail (« mot de passe oublié » en autonomie) :
1. Supabase → **Authentication → Emails → SMTP Settings** → activer *Custom SMTP*. Il faut un fournisseur : Brevo (gratuit jusqu'à 300 mails/jour), la messagerie Microsoft 365 de SCR si l'informatique ouvre le SMTP, ou une adresse Gmail dédiée avec un mot de passe d'application.
2. Une fois le SMTP en place, les modèles deviennent modifiables : **Authentication → Emails → Templates → Magic link or OTP**. Remplacer le contenu par :
   ```html
   <h2>TRACÉ — ton code de connexion</h2>
   <p>Ton code : <b style="font-size:22px;letter-spacing:3px">{{ .Token }}</b></p>
   <p>Tape-le dans l'appli (« Première connexion » ou « Code par e-mail »). Valable 1 heure.</p>
   <p>Ou touche ce lien sur le téléphone où l'appli est ouverte : <a href="{{ .ConfirmationURL }}">me connecter</a></p>
   ```
3. Dans **Authentication → Rate Limits**, le plafond d'e-mails par heure peut ensuite être relevé (30 par heure, par exemple).
Les deux méthodes cohabitent : le code de l'administrateur marche toujours, même sans SMTP.
