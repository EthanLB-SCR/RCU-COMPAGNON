-- VERSIONS DU PLAN v2 (09/10/2026) — à coller dans Supabase → SQL Editor → Run. Ré-exécutable.
-- Avant : le déclencheur gardait une version à CHAQUE écriture du chantier (message de conversation, prélèvement de stock, tube tourné…) → l'historique
-- (15 versions) se remplissait de copies identiques en quelques minutes et les vraies versions du tracé disparaissaient (Ethan : « versions trop fréquentes »).
-- Maintenant : une version seulement quand le PLAN change — tracé ré-enregistré depuis le traceur (traceur.savedAt), lignes modifiées, restauration.
create table if not exists public.site_versions (
  id bigserial primary key, site_id text not null, name text, data jsonb, saved_by uuid, created_at timestamptz not null default now());
create index if not exists site_versions_site_idx on public.site_versions(site_id, created_at desc);

-- les anciens déclencheurs de la table sites (celui des versions du 18/08, quel que soit son nom) sont retirés : un seul reste, le nouveau
create temp table _trg_avant as select tgname from pg_trigger where tgrelid = 'public.sites'::regclass and not tgisinternal;
do $$ declare r record; begin
  for r in select tgname from pg_trigger where tgrelid = 'public.sites'::regclass and not tgisinternal loop
    execute format('drop trigger if exists %I on public.sites', r.tgname);
  end loop;
end $$;

create or replace function public.site_versions_keep() returns trigger language plpgsql security definer set search_path = public as $$
begin
  if (old.data->'lines') is distinct from (new.data->'lines')
     or (old.data->'traceur'->>'savedAt') is distinct from (new.data->'traceur'->>'savedAt')
     or (old.data->'sheets') is distinct from (new.data->'sheets') then
    insert into public.site_versions(site_id, name, data, saved_by) values (old.id, old.name, old.data, auth.uid());
    delete from public.site_versions v where v.site_id = old.id
      and v.id not in (select id from public.site_versions where site_id = old.id order by created_at desc, id desc limit 15);
  end if;
  return new;
end $$;

create trigger site_versions_keep before update on public.sites for each row execute function public.site_versions_keep();

-- lecture par les comptes actifs (comme avant), écriture uniquement par le déclencheur
alter table public.site_versions enable row level security;
drop policy if exists site_versions_read on public.site_versions;
create policy site_versions_read on public.site_versions for select using (public.is_active() or public.is_admin());

-- vérification : déclencheurs avant / après
select 'avant' as etat, tgname from _trg_avant
union all
select 'après', tgname from pg_trigger where tgrelid = 'public.sites'::regclass and not tgisinternal
order by 1, 2;
