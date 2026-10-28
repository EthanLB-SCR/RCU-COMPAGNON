-- retours_28-10.sql — 28/10 (lot 2810f) : LIEN COURT ET PERMANENT DU PLAN INTERACTIF.
-- Un code de 10 caractères par chantier (ou étude) → le DERNIER plan publié (chemin dans le stockage + adresse signée valable 1 an).
-- Le lien …/plan.html#k=<code> ne change plus de tout le chantier : « 🔗 » publie le nouveau plan et le code pointe dessus ; « ✂ Couper le lien » le désactive.
-- Lecture publique UNIQUEMENT par la fonction partage_url(code) : l'adresse du plan d'un code actif, rien d'autre (ni liste, ni chantier, ni compte).
-- Écriture : comptes actifs (comme les plans et les photos). Sans ce script, l'appli garde les liens longs (rien ne casse). Rejouable sans risque.

create table if not exists public.partages (
  code        text primary key check (code ~ '^[A-Za-z0-9]{10}$'),
  site_id     text not null,
  path        text not null,
  url         text not null,
  nom         text,
  created_at  timestamptz not null default now(),
  created_by  uuid default auth.uid(),
  updated_at  timestamptz not null default now(),
  expires_at  timestamptz not null default (now() + interval '1 year'),
  revoked_at  timestamptz
);
create unique index if not exists partages_site_actif on public.partages (site_id) where revoked_at is null;

alter table public.partages enable row level security;
drop policy if exists partages_rw on public.partages;
create policy partages_rw on public.partages for all to authenticated
  using (public.is_active()) with check (public.is_active());
revoke all on public.partages from anon;
grant select, insert, update on public.partages to authenticated;

create or replace function public.partage_url(p_code text) returns text
language sql stable security definer set search_path = public as $$
  select url from public.partages
   where code = p_code and revoked_at is null and expires_at > now()
   limit 1
$$;
revoke all on function public.partage_url(text) from public;
grant execute on function public.partage_url(text) to anon, authenticated;

notify pgrst, 'reload schema';
