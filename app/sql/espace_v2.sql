-- MON ESPACE & ENTREPRISE v2 (09/10/2026 soir) — PLANNING DES ÉQUIPES — à coller dans Supabase → SQL Editor → Run. Ré-exécutable. Après espace_v1.sql.
-- Ethan : « un grand espace de création de planning : à la semaine on met les gars sur les chantiers ; ils n'ont accès qu'aux chantiers de leur semaine et de la semaine
-- d'avant, les autres sont grisés ; 4 secteurs (Ouest, IDF, Sud-Ouest, Sud-Est), un responsable d'exploitation et des conducteurs par secteur ; les gars sont rattachés
-- à un secteur mais peuvent en changer ».
--   · planning   : une ligne par SEMAINE ISO (clé « 2026-W42 »), data = {aff: {<clé personne>: {<yyyy-mm-dd>: [idChantier, …]}}} ; planning_set fusionne PAR PERSONNE
--                  (deux conducteurs de secteurs différents placent leurs équipes en même temps sans s'écraser) ; écriture chef / bureau.
--   · sites.data.fiche : {secteur, chef, conducteur, ville} du chantier — nouvelle partie « fiche » de site_set_part (v5, chef / bureau).
--   · people.data.secteur : secteur de rattachement de la personne (partie « secteur », encadrement / RH).
create table if not exists public.planning (
  week text primary key, data jsonb not null default '{}'::jsonb, updated_at timestamptz not null default now(), updated_by uuid);

create or replace function public.planning_set(p_week text, p_patch jsonb) returns jsonb
language plpgsql security definer set search_path = public as $$
declare v_aff jsonb; v_patch jsonb; k text; v_row jsonb;
begin
  if not public.is_active() then raise exception 'compte inactif'; end if;
  if not (public.is_admin() or coalesce(public.my_role(),'') in ('chef','bureau')) then raise exception 'planning réservé à l''encadrement'; end if;
  if p_week !~ '^\d{4}-W\d{2}$' then raise exception 'semaine invalide : %', p_week; end if;
  insert into public.planning(week, data, updated_by) values (p_week, '{}'::jsonb, auth.uid()) on conflict (week) do nothing;
  select coalesce(data->'aff', '{}'::jsonb) into v_aff from public.planning where week = p_week for update;
  v_patch := coalesce(p_patch->'aff', '{}'::jsonb);
  for k in select jsonb_object_keys(v_patch) loop
    if jsonb_typeof(v_patch->k) = 'null' then v_aff := v_aff - k; else v_aff := jsonb_set(v_aff, array[k], v_patch->k, true); end if;
  end loop;
  update public.planning set data = jsonb_set(coalesce(data,'{}'::jsonb), '{aff}', v_aff, true), updated_at = now(), updated_by = auth.uid() where week = p_week;
  select to_jsonb(x) into v_row from public.planning x where x.week = p_week;
  return v_row;
end $$;

alter table public.planning enable row level security;
drop policy if exists planning_read on public.planning;
create policy planning_read on public.planning for select using (public.is_active() or public.is_admin());
grant select on public.planning to authenticated;
grant execute on function public.planning_set(text, jsonb) to authenticated;

-- fiche personne : + partie « secteur »
create or replace function public.people_set_part(p_key text, p_part text, p_value jsonb) returns jsonb
language plpgsql security definer set search_path = public as $$
declare v_old jsonb; v_new jsonb; v_data jsonb; mine boolean; mgr boolean;
begin
  if not public.is_active() then raise exception 'compte inactif'; end if;
  mine := lower(p_key) = coalesce(public.my_key(), '');
  mgr := public.is_admin() or coalesce(public.my_role(),'') in ('chef','bureau');
  if p_part in ('avatar','urgence') then
    if not (mine or mgr) then raise exception 'réservé à la personne elle-même'; end if;
  elsif p_part in ('tel','entree','contrat','habs','docs','compteurs','poste_avatar','secteur') then -- secteur (v2) : Ouest, IDF, Sud-Ouest, Sud-Est — rattachement de la personne, réglé par l'encadrement / RH
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

-- fiche chantier : + partie « fiche » (secteur, chef, conducteur, ville) — même fonction qu'en v4, une partie de plus
create or replace function public.site_set_part(p_site text, p_key text, p_value jsonb) returns jsonb
language plpgsql security definer set search_path = public as $$
declare t_at timestamptz := now(); v_old jsonb; v_new jsonb; v_arr jsonb;
begin
  if not public.is_active() then raise exception 'compte inactif'; end if;
  if p_key in ('conv','stock','extraWelds','qse','pointage','undoLog','dhData') then
    null; -- tout compte actif
  elsif p_key in ('elPos','hydro','phasage','ts','marche','admin','dossier','fiche') then -- fiche (v5) : secteur, chef de chantier, conducteur, ville du chantier
    if not (public.is_admin() or coalesce(public.my_role(),'') in ('chef','bureau')) then raise exception 'réservé au chef / bureau'; end if;
  else
    raise exception 'partie inconnue : %', p_key;
  end if;

  select data->p_key into v_old from public.sites where id = p_site for update;
  if not found then return null; end if; -- chantier pas encore sur le serveur : l'appli fait un enregistrement complet

  if p_key = 'elPos' then
    v_new := (case when jsonb_typeof(v_old) = 'object' then v_old else '{}'::jsonb end)
          || (case when jsonb_typeof(p_value) = 'object' then p_value else '{}'::jsonb end);

  elsif p_key = 'conv' then
    select coalesce(jsonb_agg(e order by e->>'at', e->>'id'), '[]'::jsonb) into v_arr
    from (
      select distinct on (e->>'id') e from (
        select e from jsonb_array_elements(case when jsonb_typeof(v_old->'msgs') = 'array' then v_old->'msgs' else '[]'::jsonb end) e
        union all
        select e from jsonb_array_elements(case when jsonb_typeof(p_value->'msgs') = 'array' then p_value->'msgs' else '[]'::jsonb end) e
      ) t
      where e->>'id' is not null
      order by e->>'id', coalesce(e->>'upd', e->>'at', '') desc
    ) u;
    v_new := jsonb_build_object('msgs', v_arr,
      'seq', greatest(coalesce(nullif(v_old->>'seq','')::numeric, 1), coalesce(nullif(p_value->>'seq','')::numeric, 1)));

  elsif p_key = 'qse' then
    select coalesce(jsonb_agg(d order by d->>'at', d->>'id'), '[]'::jsonb) into v_arr
    from (
      select jsonb_set(
        (case when coalesce(n.d->>'upd', n.d->>'at', '') >= coalesce(o.d->>'upd', o.d->>'at', '') then coalesce(n.d, o.d) else coalesce(o.d, n.d) end),
        '{sigs}',
        (select coalesce(jsonb_agg(s order by s->>'at'), '[]'::jsonb) from (
           select distinct on (s->>'name', s->>'at') s from (
             select s from jsonb_array_elements(case when jsonb_typeof(o.d->'sigs') = 'array' then o.d->'sigs' else '[]'::jsonb end) s
             union all
             select s from jsonb_array_elements(case when jsonb_typeof(n.d->'sigs') = 'array' then n.d->'sigs' else '[]'::jsonb end) s
           ) ss order by s->>'name', s->>'at'
        ) u2), true) d
      from (select d from jsonb_array_elements(case when jsonb_typeof(v_old->'docs') = 'array' then v_old->'docs' else '[]'::jsonb end) d) o
      full join (select d from jsonb_array_elements(case when jsonb_typeof(p_value->'docs') = 'array' then p_value->'docs' else '[]'::jsonb end) d) n
        on o.d->>'id' = n.d->>'id'
    ) m;
    v_new := jsonb_set(coalesce(case when jsonb_typeof(p_value) = 'object' then p_value end, case when jsonb_typeof(v_old) = 'object' then v_old end, '{}'::jsonb), '{docs}', v_arr, true);

  elsif p_key = 'undoLog' then
    select coalesce(jsonb_agg(e order by e->>'at'), '[]'::jsonb) into v_new
    from (
      select e from (
        select distinct on (e->>'id') e from (
          select e from jsonb_array_elements(case when jsonb_typeof(v_old) = 'array' then v_old else '[]'::jsonb end) e
          union all
          select e from jsonb_array_elements(case when jsonb_typeof(p_value) = 'array' then p_value else '[]'::jsonb end) e
        ) t where e->>'id' is not null order by e->>'id'
      ) u order by e->>'at' desc limit 500
    ) w;

  else
    v_new := coalesce(p_value, 'null'::jsonb);
  end if;

  update public.sites set data = jsonb_set(coalesce(data, '{}'::jsonb), array[p_key], v_new, true), updated_at = t_at where id = p_site;
  return jsonb_build_object('at', t_at, 'value', v_new);
end $$;
grant execute on function public.site_set_part(text, text, jsonb) to authenticated;

-- vérification
select 'planning' as objet, count(*) from public.planning
union all select 'fonctions', count(*) from pg_proc where proname in ('planning_set','people_set_part','site_set_part','pointage_set','my_key');
