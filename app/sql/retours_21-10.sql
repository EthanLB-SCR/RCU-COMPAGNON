-- retours_21-10.sql — 21/10 : « ↔ Coulisser une soudure » (＋ ajout rapide du plan). Nouvelle partie du chantier « weldSlides » (soudures coulissées sur place)
-- écrite par tout compte actif (comme les soudures ajoutées), RÉUNIE par id au serveur (deux téléphones ne s'écrasent pas, une annulation = del:true).
-- Reprend À L'IDENTIQUE la fonction site_set_part de retours_13-10c.sql (dernière version) + la clé weldSlides et sa fusion. Rejouable sans risque.
-- À passer AVANT de pousser l'appli du 21/10 (sinon l'appli garde les coulissements sur l'appareil et affiche « pas tout enregistré sur le serveur »).

create or replace function public.site_set_part(p_site text, p_key text, p_value jsonb) returns jsonb
language plpgsql security definer set search_path = public as $$
declare t_at timestamptz := now(); v_old jsonb; v_new jsonb; v_arr jsonb; v_k text;
begin
  if not public.is_active() then raise exception 'compte inactif'; end if;
  if p_key in ('conv','stock','extraWelds','weldSlides','qse','pointage','undoLog','dhData') then -- 21/10 : + weldSlides (soudures coulissées sur place, comme les soudures ajoutées)
    null; -- tout compte actif
  elsif p_key in ('elPos','hydro','phasage','ts','marche','admin','dossier','fiche','missions','fourniture') then -- missions (v6) : objectifs de la journée ; fourniture (v7, 13/10) : commande, pièces en plus, zones à livrer
    if not (public.is_admin() or coalesce(public.my_role(),'') in ('chef','bureau')) then raise exception 'réservé au chef / bureau'; end if;
  else
    raise exception 'partie inconnue : %', p_key;
  end if;

  select data->p_key into v_old from public.sites where id = p_site for update;
  if not found then return null; end if; -- chantier pas encore sur le serveur : l'appli fait un enregistrement complet

  if p_key = 'elPos' then
    v_new := (case when jsonb_typeof(v_old) = 'object' then v_old else '{}'::jsonb end)
          || (case when jsonb_typeof(p_value) = 'object' then p_value else '{}'::jsonb end);

  elsif p_key = 'missions' then -- fusion par jour : un jour écrit remplace ce jour, les autres jours restent (deux encadrants sur deux jours ne s'écrasent pas)
    v_new := (case when jsonb_typeof(v_old) = 'object' then v_old else '{}'::jsonb end)
          || (case when jsonb_typeof(p_value) = 'object' then p_value else '{}'::jsonb end);

  elsif p_key = 'fourniture' then -- v7 (13/10) / v8 (13/10 soir) : commandes, pièces en plus, zones et qualifications des écarts RÉUNIES par id (la version la plus récente par `upd` gagne) — deux tablettes ne s'écrasent pas ; le reste (tracé initial, hypothèses) = dernière écriture
    v_new := coalesce(case when jsonb_typeof(p_value) = 'object' then p_value end, case when jsonb_typeof(v_old) = 'object' then v_old end, '{}'::jsonb);
    foreach v_k in array array['cmds','extra','zones','dec'] loop -- v8 (13/10 soir) : + dec = qualifications des écarts
      select coalesce(jsonb_agg(e order by coalesce(e->>'at',''), e->>'id'), '[]'::jsonb) into v_arr
      from (
        select distinct on (e->>'id') e from (
          select e from jsonb_array_elements(case when jsonb_typeof(v_old->v_k) = 'array' then v_old->v_k else '[]'::jsonb end) e
          union all
          select e from jsonb_array_elements(case when jsonb_typeof(p_value->v_k) = 'array' then p_value->v_k else '[]'::jsonb end) e
        ) t where e->>'id' is not null order by e->>'id', coalesce(e->>'upd', e->>'at', '') desc
      ) u;
      v_new := jsonb_set(v_new, array[v_k], v_arr, true);
    end loop;

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
    -- contrôles chantier (nuit 09→10/10) : réunis par id (un contrôle = une ligne, jamais perdue entre deux tablettes)
    v_new := jsonb_set(coalesce(case when jsonb_typeof(p_value) = 'object' then p_value end, case when jsonb_typeof(v_old) = 'object' then v_old end, '{}'::jsonb), '{docs}', v_arr, true);
    select coalesce(jsonb_agg(c order by c->>'at'), '[]'::jsonb) into v_arr
    from (
      select distinct on (c->>'id') c from (
        select c from jsonb_array_elements(case when jsonb_typeof(v_old->'controles') = 'array' then v_old->'controles' else '[]'::jsonb end) c
        union all
        select c from jsonb_array_elements(case when jsonb_typeof(p_value->'controles') = 'array' then p_value->'controles' else '[]'::jsonb end) c
      ) t where c->>'id' is not null order by c->>'id', coalesce(c->>'upd', c->>'at', '') desc
    ) u3;
    if jsonb_array_length(v_arr) > 0 then v_new := jsonb_set(v_new, '{controles}', v_arr, true); end if;

  elsif p_key = 'weldSlides' then -- 21/10 : soudures coulissées sur place (＋ → ↔) — réunies par id, la plus récente (upd, sinon at) gagne ; une annulation = del:true (jamais retirée : deux téléphones ne se ressuscitent pas)
    select coalesce(jsonb_agg(e order by coalesce(e->>'at',''), e->>'id'), '[]'::jsonb) into v_new
    from (
      select distinct on (e->>'id') e from (
        select e from jsonb_array_elements(case when jsonb_typeof(v_old) = 'array' then v_old else '[]'::jsonb end) e
        union all
        select e from jsonb_array_elements(case when jsonb_typeof(p_value) = 'array' then p_value else '[]'::jsonb end) e
      ) t where e->>'id' is not null order by e->>'id', coalesce(e->>'upd', e->>'at', '') desc
    ) u;

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

-- CONTRÔLE (doit répondre true) :
select position('weldSlides' in p.prosrc) > 0 as weld_slides_ok from pg_proc p join pg_namespace n on n.oid = p.pronamespace where n.nspname = 'public' and p.proname = 'site_set_part';
