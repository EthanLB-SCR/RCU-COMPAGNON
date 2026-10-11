# Fonction serveur « outlook-sync » — Ma semaine ⇄ Outlook

Lit le calendrier Outlook **publié** d'un encadrant (lien ICS) et remplit ses lignes « agenda » (Moi → Ma semaine).
Pas de secret à configurer : la fonction travaille avec le jeton de la personne connectée, donc avec **ses droits** et rien de plus.

## 1. Pré-requis (une fois) — SQL
Coller `app/sql/retours_12-10b.sql` dans Supabase → SQL Editor → Run (partie « outlook » de la fiche personne écrivable par la personne elle-même + registre « accident »).

## 2. Déployer la fonction (une fois, 3 minutes, sans ligne de commande)
1. Supabase → projet TRACÉ → menu **Edge Functions** → **Deploy a new function** → **Via Editor**.
2. Nom de la fonction : `outlook-sync` (exactement).
3. Effacer le code d'exemple, coller tout le contenu de `index.ts`, **Deploy function**.
4. Dans la fonction → **Details** : laisser **Verify JWT** activé (la passerelle refuse les appels sans compte ; la fonction revérifie elle-même avec `my_key()`).
5. Test : dans l'appli, Moi → Ma semaine → carte « 🔗 Relié à Outlook » → **Synchroniser maintenant**. Le message doit dire « ✓ Outlook synchronisé : n nouveaux… ». Si « La fonction serveur n'est pas déployée » → le nom n'est pas `outlook-sync` ou le déploiement a échoué (onglet Logs).

Mise à jour : rouvrir la fonction dans l'éditeur, remplacer le code, Deploy. Les logs (erreurs Outlook, droits) sont dans Edge Functions → outlook-sync → Logs.

## 3. Côté personne (chaque encadrant, une fois)
Outlook web → ⚙ Paramètres → Calendrier → **Calendriers partagés** → *Publier un calendrier* → choisir le calendrier, « Peut afficher tous les détails » → Publier → copier le lien **ICS**.
Dans l'appli : Moi → Ma semaine → 🔗 Relier mon Outlook → coller le lien. La synchro se lance tout de suite, puis automatiquement à l'ouverture de Ma semaine si la dernière date de plus de 2 h ; bouton « Synchroniser maintenant » sinon.

## Ce que fait la synchro
- Fenêtre : du lundi de la semaine passée à aujourd'hui + 70 jours.
- Un rendez-vous Outlook = une ligne Ma semaine (type devine : visite si « visite / chantier » ou nom de chantier reconnu dans le titre ou le lieu ; réunion ; rendez-vous client / fournisseur ; sinon réunion). Le chantier est rattaché quand son nom ou sa ville apparaît.
- Récurrences hebdomadaires et quotidiennes dépliées (exceptions et instances modifiées respectées) ; mensuelles / annuelles : première occurrence seulement (v1).
- Mise à jour si le rendez-vous change dans Outlook ; **retiré** de Ma semaine s'il est supprimé ou annulé dans Outlook (dans la fenêtre seulement).
- Les lignes créées à la main dans Ma semaine ne sont jamais touchées. Les exports TRACÉ auxquels la personne se serait abonnée dans Outlook sont ignorés (pas de boucle).
- Heures UTC converties en heure de Paris ; journée entière = sans heure.

## Limites v1
- Lecture seule Outlook → TRACÉ (le sens inverse reste l'export .ics de la semaine, déjà dans l'appli).
- Le lien ICS publié donne accès en lecture à l'agenda : il est stocké dans la fiche personne (lisible par les comptes actifs). Si une personne veut le retirer : « Délier » dans l'appli, et « Annuler la publication » dans Outlook.
