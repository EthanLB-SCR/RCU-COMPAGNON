-- COMPTES ET ACCÈS (08/10/2026) — à coller dans Supabase → SQL Editor → Run. Ré-exécutable.
-- Étend la table profiles (créée le 18/08 par supabase_setup.sql) : poste fin, type de compte, droits ajustés, chantiers autorisés ;
-- invitations (profil pré-rempli que la personne récupère à sa première connexion, mot de passe choisi par elle) ; fonctions d'administration.
-- ⚠️ Remplace ETHAN_EMAIL_ICI par ton adresse (celle avec laquelle tu te connectes) avant d'exécuter.

alter table public.profiles add column if not exists prenom text;
alter table public.profiles add column if not exists nom text;
alter table public.profiles add column if not exists poste text;            -- admin · bureau · conducteur · chef · soudeur · manchonneur · terrassier · visiteur
alter table public.profiles add column if not exists type text default 'salarie';  -- salarie · interim · visiteur
alter table public.profiles add column if not exists rights jsonb default '{}'::jsonb;  -- ajustements compte par compte {"cle": true/false}
alter table public.profiles add column if not exists sites text[];        -- chantiers autorisés (null = tous)
alter table public.profiles add column if not exists invited_by uuid;
update public.profiles set poste = coalesce(poste, role) where poste is null;

create table if not exists public.invites (
  email text primary key,
  nom text default '', prenom text default '',
  poste text not null default 'soudeur', type text not null default 'salarie',
  rights jsonb not null default '{}'::jsonb, sites text[],
  created_by uuid, created_at timestamptz not null default now(), used_at timestamptz
);
alter table public.invites enable row level security;

-- l'administrateur : poste = admin (et l'adresse d'Ethan, d'office)
create or replace function public.is_admin() returns boolean language sql stable security definer set search_path = public as $$
  select exists (select 1 from public.profiles p where p.id = auth.uid() and (p.poste = 'admin' or lower(p.email) = lower('ETHAN_EMAIL_ICI')));
$$;

drop policy if exists invites_admin on public.invites;
create policy invites_admin on public.invites for all using (public.is_admin()) with check (public.is_admin());

-- nouvel utilisateur : s'il a été invité → profil complet et ACTIF ; sinon profil inactif (comme avant : « compte en attente d'activation »)
create or replace function public.trace_handle_new_user() returns trigger language plpgsql security definer set search_path = public as $$
declare inv public.invites%rowtype;
begin
  select * into inv from public.invites i where lower(i.email) = lower(new.email);
  if found then
    insert into public.profiles (id, email, name, nom, prenom, poste, role, type, rights, sites, active, invited_by)
    values (new.id, new.email, trim(coalesce(inv.prenom,'') || ' ' || coalesce(inv.nom,'')), inv.nom, inv.prenom, inv.poste,
            case inv.poste when 'admin' then 'chef' when 'terrassier' then 'soudeur' when 'visiteur' then 'soudeur' else inv.poste end,
            inv.type, inv.rights, inv.sites, true, inv.created_by)
    on conflict (id) do update set nom = excluded.nom, prenom = excluded.prenom, poste = excluded.poste, role = excluded.role, type = excluded.type, rights = excluded.rights, sites = excluded.sites, active = true;
    update public.invites set used_at = now() where lower(email) = lower(new.email);
  else
    insert into public.profiles (id, email, name, role, poste, active) values (new.id, new.email, split_part(new.email, '@', 1), 'soudeur', 'soudeur', false)
    on conflict (id) do nothing;
  end if;
  return new;
end $$;
drop trigger if exists on_auth_user_created on auth.users;          -- ancien déclencheur du 18/08 (si c'était son nom)
drop trigger if exists trace_on_auth_user_created on auth.users;
create trigger trace_on_auth_user_created after insert on auth.users for each row execute function public.trace_handle_new_user();

-- créer un accès (administrateur) : invitation ; si la personne a déjà un compte, son profil est mis à jour directement
create or replace function public.invite_access(p_email text, p_nom text, p_prenom text, p_poste text, p_type text, p_rights jsonb, p_sites text[])
returns void language plpgsql security definer set search_path = public as $$
begin
  if not public.is_admin() then raise exception 'réservé à l''administrateur'; end if;
  insert into public.invites (email, nom, prenom, poste, type, rights, sites, created_by)
  values (lower(p_email), coalesce(p_nom,''), coalesce(p_prenom,''), coalesce(p_poste,'soudeur'), coalesce(p_type,'salarie'), coalesce(p_rights,'{}'::jsonb), p_sites, auth.uid())
  on conflict (email) do update set nom = excluded.nom, prenom = excluded.prenom, poste = excluded.poste, type = excluded.type, rights = excluded.rights, sites = excluded.sites, created_by = excluded.created_by, created_at = now(), used_at = null;
  update public.profiles set nom = coalesce(p_nom,''), prenom = coalesce(p_prenom,''), name = trim(coalesce(p_prenom,'') || ' ' || coalesce(p_nom,'')), poste = coalesce(p_poste,'soudeur'),
    role = case coalesce(p_poste,'soudeur') when 'admin' then 'chef' when 'terrassier' then 'soudeur' when 'visiteur' then 'soudeur' else p_poste end,
    type = coalesce(p_type,'salarie'), rights = coalesce(p_rights,'{}'::jsonb), sites = p_sites, active = true
  where lower(email) = lower(p_email);
end $$;

-- mise à jour d'un compte (administrateur) : patch JSON parmi nom, prenom, name, poste, role, type, rights, sites, active
create or replace function public.admin_set_profile(target uuid, patch jsonb) returns void language plpgsql security definer set search_path = public as $$
begin
  if not public.is_admin() then raise exception 'réservé à l''administrateur'; end if;
  update public.profiles set
    nom = coalesce(patch->>'nom', nom), prenom = coalesce(patch->>'prenom', prenom),
    name = coalesce(patch->>'name', case when patch ? 'nom' or patch ? 'prenom' then trim(coalesce(patch->>'prenom', prenom, '') || ' ' || coalesce(patch->>'nom', nom, '')) else name end),
    poste = coalesce(patch->>'poste', poste), role = coalesce(patch->>'role', role), type = coalesce(patch->>'type', type),
    rights = case when patch ? 'rights' then patch->'rights' else rights end,
    sites = case when patch ? 'sites' then (select array_agg(x) from jsonb_array_elements_text(case when jsonb_typeof(patch->'sites') = 'array' then patch->'sites' else '[]'::jsonb end) x) else sites end,
    active = coalesce((patch->>'active')::boolean, active)
  where id = target;
end $$;

-- (si supabase_setup.sql n'a jamais été passé) un actif = profil actif
create or replace function public.is_active() returns boolean language sql stable security definer set search_path = public as $$
  select exists (select 1 from public.profiles p where p.id = auth.uid() and p.active);
$$;

-- lecture : chaque actif voit la liste (noms, postes) ; un compte voit toujours sa propre ligne
drop policy if exists profiles_read on public.profiles;
create policy profiles_read on public.profiles for select using (id = auth.uid() or public.is_active() or public.is_admin());

-- Ethan = administrateur
update public.profiles set poste = 'admin' where lower(email) = lower('ETHAN_EMAIL_ICI');
