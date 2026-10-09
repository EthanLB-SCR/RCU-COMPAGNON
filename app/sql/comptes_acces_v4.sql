-- COMPTES ET ACCÈS v4 (09/10/2026) — à coller dans Supabase → SQL Editor → Run. Ré-exécutable. Remplace la fonction site_set_part de v3.
-- Plusieurs appareils / plusieurs personnes écrivent le même chantier en même temps : la fonction FUSIONNE au lieu de remplacer, et renvoie la partie
-- fusionnée {at, value} que l'appli reprend aussitôt (plus besoin d'attendre un rechargement pour voir le message de l'autre).
--   · conv    : messages réunis par id, la version la plus récente (upd, sinon at) gagne ; une suppression est douce (deleted=true) donc rien ne ressuscite
--   · qse     : documents réunis par id (le plus récent gagne), signatures réunies (nom + date)
--   · undoLog : entrées réunies par id, 500 dernières
--   · elPos   : orientations des tubes réunies (ancien || nouveau)
--   · le reste (stock, pointage, dhData, extraWelds, hydro, phasage, ts, marche, admin, dossier) : remplacé, comme avant
drop function if exists public.site_set_part(text, text, jsonb);

create function public.site_set_part(p_site text, p_key text, p_value jsonb) returns jsonb
language plpgsql security definer set search_path = public as $$
declare t_at timestamptz := now(); v_old jsonb; v_new jsonb; v_arr jsonb;
begin
  if not public.is_active() then raise exception 'compte inactif'; end if;
  if p_key in ('conv','stock','extraWelds','qse','pointage','undoLog','dhData') then
    null; -- tout compte actif
  elsif p_key in ('elPos','hydro','phasage','ts','marche','admin','dossier') then
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

-- vérification : la fonction renvoie maintenant du jsonb
select proname, pg_get_function_result(oid) as resultat from pg_proc where proname = 'site_set_part';
