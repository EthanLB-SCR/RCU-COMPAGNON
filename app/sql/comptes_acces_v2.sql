-- COMPTES ET ACCÈS v2 (08/10/2026, après-midi) — à coller dans Supabase → SQL Editor → Run. Ré-exécutable.
-- Après sql/comptes_acces.sql (et admin_ethan.sql). Apporte :
--   1. le drapeau ADMINISTRATEUR par personne (profiles.admin) — le poste redevient le vrai métier (Ethan = Responsable d'exploitation, administrateur) ;
--   2. les vrais postes SCR (clés de l'appli) : gerant, dir_adjointe, dir_technique, resp_exploitation, resp_operations, conducteur, chef, soudeur, tuyauteur,
--      manchonneur, chauffeur_engin, autre, resp_rh, assist_rh, charge_dev_rh, resp_admin_fin, resp_commercial, charge_affaires, resp_flotte, referent_magasin, visiteur ;
--   3. la table app_settings (réglages partagés) : clé poste_rights = écarts de droits par poste réglés dans l'onglet Administrateur, valables sur tous les appareils.
-- La colonne role (règles RLS du 18/08 : chef / bureau / soudeur / manchonneur) est désormais DÉDUITE des droits par l'appli et réalignée automatiquement.

-- 1) drapeau administrateur
alter table public.profiles add column if not exists admin boolean not null default false;
update public.profiles set admin = true where poste = 'admin' or lower(email) = 'elebihan@scr-soudure.fr';
update public.profiles set poste = case when lower(email) = 'elebihan@scr-soudure.fr' then 'resp_exploitation' else 'chef' end where poste = 'admin';
update public.profiles set role = 'chef' where admin;

-- 2) anciens postes v1 → nouveaux
update public.profiles set poste = 'charge_affaires' where poste = 'bureau';
update public.profiles set poste = 'autre' where poste = 'terrassier';
update public.invites set poste = 'charge_affaires' where poste = 'bureau';
update public.invites set poste = 'autre' where poste = 'terrassier';

create or replace function public.is_admin() returns boolean language sql stable security definer set search_path = public as $$
  select exists (select 1 from public.profiles p where p.id = auth.uid() and p.active and (p.admin or p.poste = 'admin' or lower(p.email) = 'elebihan@scr-soudure.fr'));
$$;

-- rôle serveur approché d'après le poste (utilisé seulement à la création du profil ; l'appli le réaligne ensuite d'après les droits effectifs)
create or replace function public.trace_role_for_poste(p text) returns text language sql immutable as $$
  select case
    when p in ('gerant','dir_adjointe','dir_technique','resp_exploitation','resp_operations','conducteur','chef','admin') then 'chef'
    when p in ('resp_rh','assist_rh','charge_dev_rh','resp_admin_fin','resp_commercial','charge_affaires','bureau') then 'bureau'
    when p = 'manchonneur' then 'manchonneur'
    else 'soudeur' end;
$$;

-- nouvel utilisateur : invité → profil complet et ACTIF ; sinon profil inactif (« compte en attente d'activation »)
create or replace function public.trace_handle_new_user() returns trigger language plpgsql security definer set search_path = public as $$
declare inv public.invites%rowtype;
begin
  select * into inv from public.invites i where lower(i.email) = lower(new.email);
  if found then
    insert into public.profiles (id, email, name, nom, prenom, poste, role, type, rights, sites, active, invited_by)
    values (new.id, new.email, trim(coalesce(inv.prenom,'') || ' ' || coalesce(inv.nom,'')), inv.nom, inv.prenom, inv.poste, public.trace_role_for_poste(inv.poste),
            inv.type, inv.rights, inv.sites, true, inv.created_by)
    on conflict (id) do update set nom = excluded.nom, prenom = excluded.prenom, poste = excluded.poste, role = excluded.role, type = excluded.type, rights = excluded.rights, sites = excluded.sites, active = true;
    update public.invites set used_at = now() where lower(email) = lower(new.email);
  else
    insert into public.profiles (id, email, name, role, poste, active) values (new.id, new.email, split_part(new.email, '@', 1), 'soudeur', 'soudeur', false)
    on conflict (id) do nothing;
  end if;
  return new;
end $$;
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
    role = public.trace_role_for_poste(coalesce(p_poste,'soudeur')),
    type = coalesce(p_type,'salarie'), rights = coalesce(p_rights,'{}'::jsonb), sites = p_sites, active = true
  where lower(email) = lower(p_email);
end $$;

-- mise à jour d'un compte (administrateur) : patch JSON parmi nom, prenom, name, poste, role, type, rights, sites, active, admin
-- garde-fous : on ne se retire pas soi-même les pouvoirs ni l'activation ; l'adresse d'Ethan reste administratrice
create or replace function public.admin_set_profile(target uuid, patch jsonb) returns void language plpgsql security definer set search_path = public as $$
begin
  if not public.is_admin() then raise exception 'réservé à l''administrateur'; end if;
  if target = auth.uid() and ((patch ? 'admin' and not (patch->>'admin')::boolean) or (patch ? 'active' and not (patch->>'active')::boolean)) then
    raise exception 'tu ne peux pas te retirer tes propres pouvoirs';
  end if;
  update public.profiles set
    nom = coalesce(patch->>'nom', nom), prenom = coalesce(patch->>'prenom', prenom),
    name = coalesce(patch->>'name', case when patch ? 'nom' or patch ? 'prenom' then trim(coalesce(patch->>'prenom', prenom, '') || ' ' || coalesce(patch->>'nom', nom, '')) else name end),
    poste = coalesce(patch->>'poste', poste), role = coalesce(patch->>'role', role), type = coalesce(patch->>'type', type),
    rights = case when patch ? 'rights' then patch->'rights' else rights end,
    sites = case when patch ? 'sites' then (select array_agg(x) from jsonb_array_elements_text(case when jsonb_typeof(patch->'sites') = 'array' then patch->'sites' else '[]'::jsonb end) x) else sites end,
    active = coalesce((patch->>'active')::boolean, active),
    admin = case when lower(email) = 'elebihan@scr-soudure.fr' then true else coalesce((patch->>'admin')::boolean, admin) end
  where id = target;
end $$;

-- 3) réglages partagés (droits par poste…)
create table if not exists public.app_settings (
  key text primary key,
  value jsonb not null default '{}'::jsonb,
  updated_at timestamptz not null default now(),
  updated_by uuid
);
alter table public.app_settings enable row level security;
drop policy if exists app_settings_read on public.app_settings;
create policy app_settings_read on public.app_settings for select using (public.is_active() or public.is_admin());
create or replace function public.admin_set_setting(p_key text, p_value jsonb) returns void language plpgsql security definer set search_path = public as $$
begin
  if not public.is_admin() then raise exception 'réservé à l''administrateur'; end if;
  insert into public.app_settings (key, value, updated_at, updated_by) values (p_key, coalesce(p_value, '{}'::jsonb), now(), auth.uid())
  on conflict (key) do update set value = excluded.value, updated_at = now(), updated_by = auth.uid();
end $$;

-- vérification
select email, poste, admin, role, type, active from public.profiles order by admin desc, email;
