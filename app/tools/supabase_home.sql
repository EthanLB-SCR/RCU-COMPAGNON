-- TRACÉ — avancement des chantiers pour la page d'accueil (léger : une ligne par chantier).
-- V2 (20/08) : ajoute le % SOUDÉ (soudée + contrôlée + manchonnée) — l'accueil raisonne en % soudé (demande Ethan).
-- À coller dans Supabase → SQL Editor → Run (après supabase_setup.sql). Ré-exécutable.
drop function if exists public.site_stats();
create or replace function public.site_stats()
returns table(site_id text, total int, soud int, manch int, last timestamptz)
language sql stable security definer set search_path=public as $$
  select w.site_id, count(*)::int,
         count(*) filter (where w.status in ('soudee','controlee','manchonnee'))::int,
         count(*) filter (where w.status = 'manchonnee')::int,
         max(w.updated_at)
  from public.welds w
  where public.is_active()
  group by w.site_id
$$;
