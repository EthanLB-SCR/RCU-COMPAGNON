-- RETOURS D'ETHAN DU 12/10 — registre : personnes provisoires (raccourci rapide du planning) et agenda de l'encadrant (« Ma semaine »).
-- À coller dans Supabase → SQL Editor → Run, APRÈS sql/retours_10-10.sql. Ré-exécutable.
-- · prov   : personne créée depuis le planning sans compte encore {prenom, nom, poste, type, agence, email?, secteur, by, at, status:'a_finaliser'|'done'}
--            — écriture encadrement (admin / chef / bureau = conducteur et au-dessus). L'administrateur finalise (invitation) ; le planning de la personne suit.
-- · gdx    : exception grands déplacements d'une personne-semaine, id = <personne>|<semaine ISO> {detente:true|false, by, at} — encadrement.
-- · agenda : ligne de la semaine d'un encadrant, id = <e-mail>|<id> {p, d, h0, h1, type, site, title, note} — la personne elle-même, ou l'encadrement.
-- Le planning accepte déjà n'importe quelle clé personne (prov:<id> compris) : rien à changer côté planning_set.
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

-- vérification : la fonction accepte les nouveaux registres
select 'registre_set' as objet,
  (position('''prov''' in pg_get_functiondef('public.registre_set(text,text,jsonb,text)'::regprocedure)) > 0) as personnes_provisoires_ok,
  (position('''agenda''' in pg_get_functiondef('public.registre_set(text,text,jsonb,text)'::regprocedure)) > 0) as agenda_ok,
  (position('''gdx''' in pg_get_functiondef('public.registre_set(text,text,jsonb,text)'::regprocedure)) > 0) as detentes_ok;
