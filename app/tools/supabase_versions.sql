-- TRACÉ — historique de versions des chantiers (filet de sécurité).
-- À coller dans Supabase → SQL Editor → Run (après supabase_setup.sql). Ré-exécutable.
-- Effet : à chaque ré-enregistrement d'un chantier, la version PRÉCÉDENTE est gardée (15 dernières).
-- Dans l'appli : bouton ⏱ Versions (chef) → liste datée → Restaurer.

create table if not exists public.site_versions (
  id bigint generated always as identity primary key,
  site_id text not null,
  name text,
  data jsonb not null,
  saved_by uuid,
  created_at timestamptz default now()
);
create index if not exists site_versions_site on public.site_versions(site_id, created_at desc);
alter table public.site_versions enable row level security;

do $$ declare p record; begin
  for p in select policyname from pg_policies where schemaname='public' and tablename='site_versions'
  loop execute format('drop policy if exists %I on public.site_versions', p.policyname); end loop;
end $$;
create policy sv_read on public.site_versions for select to authenticated using (public.is_active());
create policy sv_del  on public.site_versions for delete to authenticated using (public.my_role()='chef');

-- capture automatique : AVANT chaque mise à jour d'un chantier, l'ancienne version part dans l'historique (15 gardées par chantier)
create or replace function public.sites_version_snapshot() returns trigger
language plpgsql security definer set search_path=public as $$
begin
  if tg_op='UPDATE' and old.data is not null and (old.data->>'deleted') is null then
    insert into public.site_versions(site_id,name,data,saved_by) values (old.id, old.name, old.data, auth.uid());
    delete from public.site_versions where site_id=old.id and id not in
      (select id from public.site_versions where site_id=old.id order by created_at desc limit 15);
  end if;
  return new;
end $$;
drop trigger if exists sites_version_snapshot on public.sites;
create trigger sites_version_snapshot before update on public.sites
for each row execute function public.sites_version_snapshot();
