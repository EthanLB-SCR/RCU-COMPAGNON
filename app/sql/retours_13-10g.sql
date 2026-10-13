-- RETOURS DU 13/10/2026 (g) — ANNUAIRE : LES PERSONNES INVITÉES VISIBLES DE TOUS LES COMPTES ACTIFS (nom, prénom, poste, type — rien d'autre).
-- Ethan, sur le poste de Sofiane : « dans un chantier, vie du chantier, il ne voit pas d'équipe au planning alors qu'il y en a ; il voit une adresse e-mail en chef de
-- chantier, moi je vois le prénom du chef… ». Cause : une personne dont l'accès est créé mais qui ne s'est encore jamais connectée n'existe que dans la table « invites »,
-- que la base ne laisse lire qu'à l'administrateur. Pour tout autre compte, ces personnes n'avaient ni nom ni place au planning.
-- Ce SQL ajoute une fonction de lecture (security definer) qui ne rend que l'annuaire : e-mail, nom, prénom, poste, type de compte — PAS les droits, PAS les chantiers.
-- La table « invites » elle-même reste réservée à l'administrateur (création, modification, retrait). À coller dans Supabase → SQL Editor → Run. Ré-exécutable.

create or replace function public.annuaire_invites()
returns table (email text, nom text, prenom text, poste text, type text)
language sql stable security definer set search_path = public as $$
  select i.email, coalesce(i.nom, ''), coalesce(i.prenom, ''), i.poste, i.type
  from public.invites i
  where i.used_at is null and (public.is_active() or public.is_admin())
  order by i.nom, i.prenom;
$$;
revoke all on function public.annuaire_invites() from public;
revoke all on function public.annuaire_invites() from anon;
grant execute on function public.annuaire_invites() to authenticated;

-- vérification : le nombre de personnes invitées que verront les comptes actifs
select count(*) as invites_visibles_dans_l_annuaire from public.invites where used_at is null;
