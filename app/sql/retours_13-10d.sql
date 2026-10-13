-- RETOURS DU 13/10/2026 (d) — COMPTEURS D'HEURES PAR PERSONNE : registre « cpth » (id = clé de la personne : son e-mail en minuscules).
-- Ethan : « rajouter les compteurs d'heures que l'on ne traite pas jusque-là ; tout le monde n'a pas le même compteur → dans les paramètres du profil ;
-- les heures au-delà de 48 h par semaine vont dans un compteur « à reporter », qu'on peut vider en prime ».
-- Contenu : contrat (h / semaine), compteurs suivis (récupération, CET, heures à reporter, autres), soldes datés, mouvements (prime, corrections, import).
-- Écriture : administrateur, chef, bureau (comme les autres registres d'encadrement). LECTURE : encadrement / bureau, ou la personne elle-même (son compteur).
-- À coller dans Supabase → SQL Editor → Run, APRÈS retours_13-10b.sql. Ré-exécutable. (Contient tout retours_13-10b.sql + le registre « cpth ».)

create or replace function public.registre_set(p_kind text, p_id text, p_patch jsonb, p_mode text default 'merge') returns jsonb
language plpgsql security definer set search_path = public as $$
declare v_old jsonb; v_new jsonb; v_row jsonb; mgr boolean; k text;
begin
  if not public.is_active() then raise exception 'compte inactif'; end if;
  if p_id is null or length(p_id) = 0 or length(p_id) > 200 then raise exception 'identifiant invalide'; end if;
  mgr := public.is_admin() or coalesce(public.my_role(),'') in ('chef','bureau');
  if p_kind in ('doc','affaire','vehicule','mission','controle','commande','qhs','qhstopic','prov','gdx','prix','panier','cpth') then
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

-- lecture : tout compte actif, SAUF la base de prix et les paniers (encadrement / bureau / administrateur) ET les compteurs d'heures « cpth » (encadrement / bureau / administrateur, ou la personne elle-même : id = sa clé)
drop policy if exists registre_read on public.registre;
create policy registre_read on public.registre for select using (
  (public.is_active() or public.is_admin())
  and (kind not in ('prix','panier') or public.is_admin() or coalesce(public.my_role(),'') in ('chef','bureau'))
  and (kind <> 'cpth' or public.is_admin() or coalesce(public.my_role(),'') in ('chef','bureau') or lower(id) = coalesce(public.my_key(), ''))
);

-- contrôle
select 'registre_set' as objet, (position('''cpth''' in pg_get_functiondef('public.registre_set(text,text,jsonb,text)'::regprocedure)) > 0) as compteurs_ok
union all select 'registre_read', (select position('cpth' in coalesce(qual,'')) > 0 from pg_policies where schemaname = 'public' and tablename = 'registre' and policyname = 'registre_read');
