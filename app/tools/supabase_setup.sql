-- TRACÉ — sécurisation du serveur (Supabase) : comptes, rôles, droits, temps réel.
-- À coller tel quel dans Supabase → SQL Editor → Run. Ré-exécutable sans danger.
-- Effet : seuls les comptes ACTIVÉS (par le chef) voient les données ; les rôles limitent qui écrit quoi ;
-- les modifications (plans, statuts) sont poussées en direct vers les autres appareils connectés (temps réel).

-- 1) Profils utilisateurs (rattachés aux comptes de connexion) --------------------------------
create table if not exists public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  email text,
  name text,
  role text not null default 'soudeur' check (role in ('soudeur','manchonneur','chef','bureau')),
  active boolean not null default false,
  created_at timestamptz default now()
);
alter table public.profiles enable row level security;

-- à chaque nouvelle inscription : profil créé automatiquement, INACTIF (le chef l'active)
create or replace function public.handle_new_user() returns trigger
language plpgsql security definer set search_path=public as $$
begin
  insert into public.profiles(id,email,name,active,role)
  values (new.id, new.email, split_part(coalesce(new.email,''),'@',1), false, 'soudeur')
  on conflict (id) do nothing;
  return new;
end $$;
drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created after insert on auth.users
for each row execute function public.handle_new_user();

-- profils pour les comptes déjà existants
insert into public.profiles(id,email,name)
select u.id, u.email, split_part(coalesce(u.email,''),'@',1) from auth.users u
on conflict (id) do nothing;

-- premier chef : Ethan (actif)
update public.profiles set active=true, role='chef', name=coalesce(nullif(name,''),'Ethan L.')
where email='lebihanethan@gmail.com';

-- 2) Fonctions d'aide -------------------------------------------------------------------------
create or replace function public.is_active() returns boolean
language sql stable security definer set search_path=public as
$$ select coalesce((select active from public.profiles where id=auth.uid()), false) $$;

create or replace function public.my_role() returns text
language sql stable security definer set search_path=public as
$$ select coalesce((select role from public.profiles where id=auth.uid()), '') $$;

-- le chef gère les comptes (rôle + activation) ; chacun peut changer son propre nom
create or replace function public.admin_set_user(target uuid, new_role text, new_active boolean) returns void
language plpgsql security definer set search_path=public as $$
begin
  if public.my_role() <> 'chef' then raise exception 'réservé au chef de chantier'; end if;
  update public.profiles set role=new_role, active=new_active where id=target;
end $$;

create or replace function public.set_my_name(new_name text) returns void
language plpgsql security definer set search_path=public as $$
begin
  update public.profiles set name=new_name where id=auth.uid();
end $$;

-- 3) Droits (RLS) : on repart de zéro sur les 4 tables ---------------------------------------
do $$ declare p record; begin
  for p in select schemaname, tablename, policyname from pg_policies
           where schemaname='public' and tablename in ('sites','welds','line_state','events','profiles')
  loop execute format('drop policy if exists %I on %I.%I', p.policyname, p.schemaname, p.tablename); end loop;
end $$;

alter table public.sites enable row level security;
alter table public.welds enable row level security;
alter table public.line_state enable row level security;
alter table public.events enable row level security;

-- profils : tout compte connecté voit la liste (pour afficher les noms) ; écritures via les fonctions ci-dessus uniquement
create policy profiles_read on public.profiles for select to authenticated using (true);

-- lecture des données : comptes ACTIVÉS uniquement
create policy sites_read  on public.sites      for select to authenticated using (public.is_active());
create policy welds_read  on public.welds      for select to authenticated using (public.is_active());
create policy ls_read     on public.line_state for select to authenticated using (public.is_active());
create policy ev_read     on public.events     for select to authenticated using (public.is_active());

-- plans (sites) : création / modification / suppression réservées au chef et au bureau
create policy sites_write on public.sites for insert to authenticated with check (public.my_role() in ('chef','bureau'));
create policy sites_upd   on public.sites for update to authenticated using (public.my_role() in ('chef','bureau')) with check (public.my_role() in ('chef','bureau'));
create policy sites_del   on public.sites for delete to authenticated using (public.my_role() = 'chef');

-- soudures (statuts, fiches) : tout compte actif écrit ; suppression réservée au chef
create policy welds_ins on public.welds for insert to authenticated with check (public.is_active());
create policy welds_upd on public.welds for update to authenticated using (public.is_active()) with check (public.is_active());
create policy welds_del on public.welds for delete to authenticated using (public.my_role() = 'chef');

-- états de lignes (outil calepinage) : chef / bureau ; suppression chef
create policy ls_ins on public.line_state for insert to authenticated with check (public.my_role() in ('chef','bureau'));
create policy ls_upd on public.line_state for update to authenticated using (public.my_role() in ('chef','bureau')) with check (public.my_role() in ('chef','bureau'));
create policy ls_del on public.line_state for delete to authenticated using (public.my_role() = 'chef');

-- journal d'événements : tout compte actif ajoute ; personne ne modifie ; suppression chef (purge chantier)
create policy ev_ins on public.events for insert to authenticated with check (public.is_active());
create policy ev_del on public.events for delete to authenticated using (public.my_role() = 'chef');

-- 4) Photos (bucket « photos ») : comptes actifs --------------------------------------------
do $$ declare p record; begin
  for p in select policyname from pg_policies where schemaname='storage' and tablename='objects' and policyname like 'trace_photos_%'
  loop execute format('drop policy if exists %I on storage.objects', p.policyname); end loop;
end $$;
create policy trace_photos_read  on storage.objects for select to authenticated using (bucket_id='photos' and public.is_active());
create policy trace_photos_write on storage.objects for insert to authenticated with check (bucket_id='photos' and public.is_active());
create policy trace_photos_del   on storage.objects for delete to authenticated using (bucket_id='photos' and public.my_role()='chef');

-- 5) Temps réel : les changements de plans et de soudures sont poussés aux appareils connectés
do $$ begin
  begin alter publication supabase_realtime add table public.welds; exception when duplicate_object then null; end;
  begin alter publication supabase_realtime add table public.sites; exception when duplicate_object then null; end;
end $$;

-- Fin. Dans l'appli : bouton 👥 (visible pour le chef) pour activer les comptes et donner les rôles.
-- Les inscriptions restent ouvertes (lien e-mail) mais un compte non activé ne voit RIEN.
