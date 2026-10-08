-- ADMINISTRATEUR = elebihan@scr-soudure.fr (08/10/2026) — à coller dans Supabase → SQL Editor → Run. Ré-exécutable.
-- 1) la base reconnaît cette adresse comme administrateur (remplace la version précédente de la fonction, quelle que soit l'adresse qui y était)
create or replace function public.is_admin() returns boolean language sql stable security definer set search_path = public as $$
  select exists (select 1 from public.profiles p where p.id = auth.uid() and (p.poste = 'admin' or lower(p.email) = 'elebihan@scr-soudure.fr'));
$$;
-- 2) invitation : à sa première connexion (« créer mon mot de passe »), le compte arrive complet, ACTIF et administrateur
insert into public.invites (email, nom, prenom, poste, type, rights, sites)
values ('elebihan@scr-soudure.fr', 'LE BIHAN', 'Ethan', 'admin', 'salarie', '{}'::jsonb, null)
on conflict (email) do update set nom = 'LE BIHAN', prenom = 'Ethan', poste = 'admin', type = 'salarie', rights = '{}'::jsonb, sites = null, used_at = null;
-- 3) si le compte existe déjà (adresse déjà inscrite un jour), il devient administrateur tout de suite
update public.profiles set poste = 'admin', role = 'chef', active = true, nom = 'LE BIHAN', prenom = 'Ethan', name = 'Ethan LE BIHAN' where lower(email) = 'elebihan@scr-soudure.fr';
-- 4) l'ancienne adresse gmail n'est plus administratrice (elle reste un compte chef actif ; à désactiver depuis l'onglet ⚙ quand le nouveau compte marche)
update public.profiles set poste = case when poste = 'admin' then 'chef' else poste end where lower(email) = 'lebihanethan@gmail.com';
