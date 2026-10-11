-- RETOURS D'ETHAN DU 12/10 (soir) — (b) déclaration d'accident + lien Outlook de la personne.
-- À coller dans Supabase → SQL Editor → Run, APRÈS sql/retours_12-10.sql. Ré-exécutable.
-- · registre « accident » : {type, d, h, site, lieu, names, who[], circonstances, lesion, arret, soins, temoins, photos[], by, byKey, via, at, status:'declare'|'traite', traitePar, traiteAt}
--     — TOUTE personne active peut déclarer (et corriger SA déclaration) ; marquer « traité » (status) = encadrement / bureau (RH, direction, QSE).
-- · fiche personne, partie « outlook » {ics, at} : écrite par la personne elle-même (comme avatar / urgence) ou l'encadrement — lue par la fonction serveur outlook-sync.
create or replace function public.registre_set(p_kind text, p_id text, p_patch jsonb, p_mode text default 'merge') returns jsonb
language plpgsql security definer set search_path = public as $$
declare v_old jsonb; v_new jsonb; v_row jsonb; mgr boolean; k text;
begin
  if not public.is_active() then raise exception 'compte inactif'; end if;
  if p_id is null or length(p_id) = 0 or length(p_id) > 200 then raise exception 'identifiant invalide'; end if;
  mgr := public.is_admin() or coalesce(public.my_role(),'') in ('chef','bureau');
  if p_kind in ('doc','affaire','vehicule','mission','controle','commande','qhs','qhstopic','prov','gdx') then
    if not mgr then raise exception 'réservé à l''encadrement / bureau'; end if;
  elsif p_kind in ('docsig','qhsig') then
    if not (mgr or lower(split_part(p_id, '|', 2)) = coalesce(public.my_key(), '')) then raise exception 'signature réservée à la personne elle-même'; end if;
  elsif p_kind in ('debours','agenda') then -- la personne elle-même (id = <e-mail>|<…>) ou l'encadrement
    if not (mgr or lower(split_part(p_id, '|', 1)) = coalesce(public.my_key(), '')) then raise exception 'réservé à la personne elle-même'; end if;
  elsif p_kind = 'accident' then -- toute personne active déclare ; elle ne retouche que SA déclaration ; le traitement (status) est réservé à l'encadrement / bureau
    select data into v_old from public.registre where kind = p_kind and id = p_id;
    if not mgr then
      if v_old is not null and lower(coalesce(v_old->>'byKey','')) <> coalesce(public.my_key(), '') then raise exception 'déclaration d''une autre personne : réservé à l''encadrement'; end if;
      if coalesce(p_patch->>'status','declare') <> 'declare' or p_mode = 'replace' then raise exception 'le traitement d''une déclaration est réservé à la RH / direction / QSE'; end if;
    end if;
  else
    raise exception 'registre inconnu : %', p_kind;
  end if;
  insert into public.registre(kind, id, data, updated_by) values (p_kind, p_id, '{}'::jsonb, auth.uid()) on conflict (kind, id) do nothing;
  select data into v_old from public.registre where kind = p_kind and id = p_id for update;
  if p_mode = 'replace' then
    v_new := coalesce(p_patch, '{}'::jsonb);
  else
    v_new := coalesce(v_old, '{}'::jsonb) || coalesce(case when jsonb_typeof(p_patch) = 'object' then p_patch end, '{}'::jsonb);
    for k in select key from jsonb_each(coalesce(case when jsonb_typeof(p_patch) = 'object' then p_patch end, '{}'::jsonb)) where jsonb_typeof(value) = 'null' loop
      v_new := v_new - k;
    end loop;
  end if;
  update public.registre set data = v_new, updated_at = now(), updated_by = auth.uid() where kind = p_kind and id = p_id;
  select to_jsonb(x) into v_row from public.registre x where x.kind = p_kind and x.id = p_id;
  return v_row;
end $$;
grant execute on function public.registre_set(text, text, jsonb, text) to authenticated;

-- fiche personne : la partie « outlook » rejoint avatar / urgence (la personne elle-même ou l'encadrement) ; le reste inchangé (sql/nuit_v1.sql)
create or replace function public.people_set_part(p_key text, p_part text, p_value jsonb) returns jsonb
language plpgsql security definer set search_path = public as $$
declare v_old jsonb; v_new jsonb; v_data jsonb; mine boolean; mgr boolean;
begin
  if not public.is_active() then raise exception 'compte inactif'; end if;
  mine := lower(p_key) = coalesce(public.my_key(), '');
  mgr := public.is_admin() or coalesce(public.my_role(),'') in ('chef','bureau');
  if p_part in ('avatar','urgence','outlook') then
    if not (mine or mgr) then raise exception 'réservé à la personne elle-même'; end if;
  elsif p_part in ('tel','entree','contrat','habs','docs','compteurs','poste_avatar','secteur','adresse','emploi') then
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
grant execute on function public.people_set_part(text, text, jsonb) to authenticated;

-- vérification : les deux fonctions connaissent les nouveautés
select 'registre_set' as objet,
  (position('''accident''' in pg_get_functiondef('public.registre_set(text,text,jsonb,text)'::regprocedure)) > 0) as accident_ok,
  (position('''agenda''' in pg_get_functiondef('public.registre_set(text,text,jsonb,text)'::regprocedure)) > 0) as agenda_ok
union all
select 'people_set_part',
  (position('''outlook''' in pg_get_functiondef('public.people_set_part(text,text,jsonb)'::regprocedure)) > 0),
  (position('''urgence''' in pg_get_functiondef('public.people_set_part(text,text,jsonb)'::regprocedure)) > 0);
