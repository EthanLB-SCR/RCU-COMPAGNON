-- MON ESPACE & ENTREPRISE v1 (09/10/2026) — à coller dans Supabase → SQL Editor → Run. Ré-exécutable.
-- Deux tables nouvelles :
--   · people    : la fiche « personne » hors chantier, UNE ligne par personne, clé = e-mail en minuscules (stable entre l'invitation et le compte),
--                 data jsonb par PARTIES : avatar (profil du kit), urgence (contact d'urgence), tel, entree, contrat, habs (habilitations), docs, compteurs.
--                 Écriture par partie via people_set_part : la personne elle-même → avatar et urgence seulement ; chef / bureau (RH, encadrement) → tout.
--   · pointages : une ligne par personne et par jour (clé = email|date), events / status / val / corr — écrite par la personne (sa journée) et par les valideurs.
-- Lecture : tout compte actif (annuaire Entreprise, équipe du jour) ; l'appli filtre ce que chacun voit (intérimaire = son chantier).
create table if not exists public.people (
  key text primary key, data jsonb not null default '{}'::jsonb, updated_at timestamptz not null default now(), updated_by uuid);
create table if not exists public.pointages (
  id text primary key, p text not null, d date not null, site text, events jsonb not null default '[]'::jsonb, status text not null default 'declare',
  val jsonb not null default '[]'::jsonb, corr jsonb, updated_at timestamptz not null default now(), updated_by uuid);
create index if not exists pointages_p_d_idx on public.pointages(p, d desc);
create index if not exists pointages_d_idx on public.pointages(d desc);

-- clé « personne » du compte connecté : son e-mail en minuscules
create or replace function public.my_key() returns text language sql stable security definer set search_path = public as $$
  select lower(p.email) from public.profiles p where p.id = auth.uid();
$$;

-- écriture d'une PARTIE de la fiche personne (fusion objet pour avatar / compteurs, remplacement sinon)
create or replace function public.people_set_part(p_key text, p_part text, p_value jsonb) returns jsonb
language plpgsql security definer set search_path = public as $$
declare v_old jsonb; v_new jsonb; v_data jsonb; mine boolean; mgr boolean;
begin
  if not public.is_active() then raise exception 'compte inactif'; end if;
  mine := lower(p_key) = coalesce(public.my_key(), '');
  mgr := public.is_admin() or coalesce(public.my_role(),'') in ('chef','bureau');
  if p_part in ('avatar','urgence') then
    if not (mine or mgr) then raise exception 'réservé à la personne elle-même'; end if;
  elsif p_part in ('tel','entree','contrat','habs','docs','compteurs','poste_avatar') then
    if not mgr then raise exception 'réservé au chef / bureau (RH)'; end if;
  else
    raise exception 'partie inconnue : %', p_part;
  end if;
  insert into public.people(key, data, updated_by) values (lower(p_key), '{}'::jsonb, auth.uid()) on conflict (key) do nothing;
  select data into v_data from public.people where key = lower(p_key) for update;
  v_old := v_data->p_part;
  if p_part in ('avatar','compteurs') and jsonb_typeof(v_old) = 'object' and jsonb_typeof(p_value) = 'object' then v_new := v_old || p_value; else v_new := p_value; end if;
  update public.people set data = jsonb_set(coalesce(v_data,'{}'::jsonb), array[p_part], coalesce(v_new,'null'::jsonb), true), updated_at = now(), updated_by = auth.uid() where key = lower(p_key);
  return jsonb_build_object('at', now(), 'value', v_new);
end $$;

-- pointage : la personne écrit SA journée (événements) ; chef / bureau écrivent tout (validation, correction)
create or replace function public.pointage_set(p_row jsonb) returns jsonb
language plpgsql security definer set search_path = public as $$
declare k text; mine boolean; mgr boolean; v jsonb;
begin
  if not public.is_active() then raise exception 'compte inactif'; end if;
  k := lower(p_row->>'p');
  mine := k = coalesce(public.my_key(), '');
  mgr := public.is_admin() or coalesce(public.my_role(),'') in ('chef','bureau');
  if not (mine or mgr) then raise exception 'pointage d''une autre personne'; end if;
  if not mgr and (jsonb_array_length(coalesce(p_row->'val','[]'::jsonb)) > 0 or (p_row->'corr') is not null and jsonb_typeof(p_row->'corr') <> 'null') then
    raise exception 'validation et correction réservées au chef / bureau';
  end if;
  insert into public.pointages(id, p, d, site, events, status, val, corr, updated_by)
    values (k || '|' || (p_row->>'d'), k, (p_row->>'d')::date, p_row->>'site', coalesce(p_row->'events','[]'::jsonb), coalesce(p_row->>'status','declare'), coalesce(p_row->'val','[]'::jsonb), p_row->'corr', auth.uid())
  on conflict (id) do update set site = excluded.site, events = excluded.events, status = excluded.status, val = excluded.val, corr = excluded.corr, updated_at = now(), updated_by = auth.uid();
  select to_jsonb(x) into v from public.pointages x where x.id = k || '|' || (p_row->>'d');
  return v;
end $$;

alter table public.people enable row level security;
alter table public.pointages enable row level security;
drop policy if exists people_read on public.people;
create policy people_read on public.people for select using (public.is_active() or public.is_admin());
drop policy if exists pointages_read on public.pointages;
create policy pointages_read on public.pointages for select using (public.is_active() or public.is_admin());
-- écriture uniquement par les deux fonctions ci-dessus (security definer) : aucune politique insert / update directe

grant select on public.people, public.pointages to authenticated;
grant execute on function public.people_set_part(text, text, jsonb), public.pointage_set(jsonb), public.my_key() to authenticated;

-- vérification
select 'people' as objet, count(*) from public.people
union all select 'pointages', count(*) from public.pointages
union all select 'fonctions', count(*) from pg_proc where proname in ('people_set_part','pointage_set','my_key');
