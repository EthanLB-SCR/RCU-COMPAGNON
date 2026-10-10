-- RETOURS D'ETHAN DU 10/10 (matin, points 1 à 3 de la feuille de route) — registre : quart d'heure sécurité.
-- À coller dans Supabase → SQL Editor → Run, APRÈS sql/nuit_v1.sql. Ré-exécutable.
-- · qhs      : déclenchement d'un quart d'heure sécurité {topic, title, date, sites:['*'] ou [ids], by, note} — encadrement (admin / chef / bureau).
-- · qhstopic : sujet de quart d'heure {title, html, qs:[…]} (base SCR, quand Ethan la remet) — encadrement.
-- · qhsig    : participation signée, id = <déclenchement>|<e-mail> {run, site, name, at, img, answers} — la personne elle-même, ou l'encadrement
--              (tablette du chef : personne sans compte, id = <déclenchement>|ext:<nom>).
-- · doc (notes de service / flash info) : inchangé — un PDF se dépose au stockage (bucket photos, dossier entreprise/docs) et la fiche garde son url.
create or replace function public.registre_set(p_kind text, p_id text, p_patch jsonb, p_mode text default 'merge') returns jsonb
language plpgsql security definer set search_path = public as $$
declare v_old jsonb; v_new jsonb; v_row jsonb; mgr boolean; k text;
begin
  if not public.is_active() then raise exception 'compte inactif'; end if;
  if p_id is null or length(p_id) = 0 or length(p_id) > 200 then raise exception 'identifiant invalide'; end if;
  mgr := public.is_admin() or coalesce(public.my_role(),'') in ('chef','bureau');
  if p_kind in ('doc','affaire','vehicule','mission','controle','commande','qhs','qhstopic') then
    if not mgr then raise exception 'réservé à l''encadrement / bureau'; end if;
  elsif p_kind in ('docsig','qhsig') then
    if not (mgr or lower(split_part(p_id, '|', 2)) = coalesce(public.my_key(), '')) then raise exception 'signature réservée à la personne elle-même'; end if;
  elsif p_kind = 'debours' then -- note de frais : la personne elle-même (id = <e-mail>|<horodatage>) ou l'encadrement (validation, remboursement)
    if not (mgr or lower(split_part(p_id, '|', 1)) = coalesce(public.my_key(), '')) then raise exception 'débours réservé à la personne elle-même'; end if;
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

-- vérification : la fonction accepte les nouveaux registres (le corps contient 'qhsig')
select 'registre_set' as objet, (position('qhsig' in pg_get_functiondef('public.registre_set(text,text,jsonb,text)'::regprocedure)) > 0) as quarts_d_heure_ok;
