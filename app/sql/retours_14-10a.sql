-- RETOURS DU 14/10/2026 (a) — MAGASIN, RÉCEPTION DE VÉHICULE, CONFIDENTIALITÉ DE LA BIBLIOTHÈQUE DU MÉMOIRE ET DES REMISES.
-- Nuit du 13 au 14/10 : nouveaux registres de l'appli.
--  · magasin : « magcat » (catalogue du dépôt + listes par métier, écrit par le référent magasin), « magdem » (demandes de matériel : la personne
--    crée et annule SA demande ; le magasin et l'encadrement la traitent), « magmvt » (mouvements de stock : magasin seulement) ;
--  · véhicules : « vcfg » (listes d'état des lieux, inventaires, chartes — importées du pack SCR) et « vrec » (remises / restitutions signées) :
--    encadrement / bureau (le responsable flotte a le rôle « bureau ») ;
--  · droit « mag.manage » (Magasin : préparer, remettre, stock, catalogue) : ajustement personnel > droit du poste réglé dans Administrateur >
--    défaut = poste « referent_magasin » ; l'administrateur a tout (comme can_prix / can_rh).
-- Lecture (tout compte actif, comme avant) SAUF :
--  · la bibliothèque du mémoire technique (registre « doc », ligne « memlib » : CA, accidents du travail, parc) → encadrement / bureau / administrateur ;
--  · les remises de véhicule « vrec » (signatures, permis) → encadrement / bureau / administrateur et le conducteur concerné ;
--  · les demandes magasin « magdem » → encadrement / bureau / magasin / administrateur et le demandeur.
-- Contient tout retours_13-10f.sql ET retours_13-10g.sql (inutile de les passer avant). À coller dans Supabase → SQL Editor → Run. Ré-exécutable.

-- ── repris de retours_13-10f.sql (droits Base de prix et RH) et retours_13-10g.sql (annuaire des invités) : ce fichier suffit, même s'ils n'ont pas été passés ──
create or replace function public.can_prix() returns boolean language sql stable security definer set search_path = public as $$
  select public.is_admin() or exists (
    select 1 from public.profiles p
    left join public.app_settings s on s.key = 'poste_rights'
    where p.id = auth.uid() and p.active
      and case
        when coalesce(p.rights, '{}'::jsonb) ? 'prix.edit' then coalesce((p.rights->>'prix.edit')::boolean, false)
        when s.value is not null and jsonb_typeof(s.value -> p.poste) = 'object' and (s.value -> p.poste) ? 'prix.edit' then coalesce((s.value -> p.poste ->> 'prix.edit')::boolean, false)
        else coalesce(p.poste, '') = 'gerant'
      end
  );
$$;
grant execute on function public.can_prix() to authenticated;

-- droit RH d'une personne connectée : ajustement personnel > droit du poste réglé dans Administrateur > défaut du poste (comme can_prix)
create or replace function public.can_rh(p_perm text) returns boolean language sql stable security definer set search_path = public as $$
  select public.is_admin() or exists (
    select 1 from public.profiles p
    left join public.app_settings s on s.key = 'poste_rights'
    where p.id = auth.uid() and p.active
      and case
        when coalesce(p.rights, '{}'::jsonb) ? p_perm then coalesce((p.rights->>p_perm)::boolean, false)
        when s.value is not null and jsonb_typeof(s.value -> p.poste) = 'object' and (s.value -> p.poste) ? p_perm then coalesce((s.value -> p.poste ->> p_perm)::boolean, false)
        else coalesce(p.poste, '') = any (case p_perm
          when 'rh.voir' then array['gerant','dir_adjointe','dir_technique','resp_rh','assist_rh','charge_dev_rh']
          when 'rh.edit' then array['resp_rh','assist_rh','charge_dev_rh']
          else array[]::text[] end)
      end
  );
$$;
grant execute on function public.can_rh(text) to authenticated;

create or replace function public.annuaire_invites()
returns table (email text, nom text, prenom text, poste text, type text)
language sql stable security definer set search_path = public as $$
  select i.email, coalesce(i.nom, ''), coalesce(i.prenom, ''), i.poste, i.type
  from public.invites i
  where i.used_at is null and (public.is_active() or public.is_admin())
  order by i.nom, i.prenom;
$$;
revoke all on function public.annuaire_invites() from public;
revoke all on function public.annuaire_invites() from anon;
grant execute on function public.annuaire_invites() to authenticated;

-- ── 14/10 ──
create or replace function public.can_mag() returns boolean language sql stable security definer set search_path = public as $$
  select public.is_admin() or exists (
    select 1 from public.profiles p
    left join public.app_settings s on s.key = 'poste_rights'
    where p.id = auth.uid() and p.active
      and case
        when coalesce(p.rights, '{}'::jsonb) ? 'mag.manage' then coalesce((p.rights->>'mag.manage')::boolean, false)
        when s.value is not null and jsonb_typeof(s.value -> p.poste) = 'object' and (s.value -> p.poste) ? 'mag.manage' then coalesce((s.value -> p.poste ->> 'mag.manage')::boolean, false)
        else coalesce(p.poste, '') = 'referent_magasin'
      end
  );
$$;
grant execute on function public.can_mag() to authenticated;

create or replace function public.registre_set(p_kind text, p_id text, p_patch jsonb, p_mode text default 'merge') returns jsonb
language plpgsql security definer set search_path = public as $$
declare v_old jsonb; v_new jsonb; v_row jsonb; mgr boolean; k text; v_st text;
begin
  if not public.is_active() then raise exception 'compte inactif'; end if;
  if p_id is null or length(p_id) = 0 or length(p_id) > 200 then raise exception 'identifiant invalide'; end if;
  mgr := public.is_admin() or coalesce(public.my_role(),'') in ('chef','bureau');
  if p_kind in ('prix','panier') then -- 13/10 (e) : la base de prix et les paniers SCR (et la ligne « v1 » : paramètres de l'ancien tableau V2B) = droit « Base de prix SCR : modifier »
    if not public.can_prix() then raise exception 'base de prix : droit « Base de prix SCR : modifier » nécessaire'; end if;
  elsif p_kind = 'cpth' or (p_kind = 'gdx' and p_id like 'force|%') then -- 13/10 (f) : contrat, compteurs d'heures, cas de déplacement forcé = droit RH « modifier »
    if not public.can_rh('rh.edit') then raise exception 'contrats et compteurs : droit RH « modifier » nécessaire (RH, administrateur)'; end if;
  elsif p_kind in ('doc','affaire','vehicule','mission','controle','commande','qhs','qhstopic','prov','gdx','vcfg','vrec') then -- 14/10 : + vcfg / vrec (réception de véhicule)
    if not mgr then raise exception 'réservé à l''encadrement / bureau'; end if;
  elsif p_kind in ('magcat','magmvt') then -- 14/10 : catalogue et mouvements de stock = droit « Magasin »
    if not public.can_mag() then raise exception 'magasin : droit « Magasin » nécessaire (référent magasin, administrateur)'; end if;
  elsif p_kind = 'magdem' then -- 14/10 : demande de matériel — la personne crée et annule SA demande (tant qu'elle n'est pas en préparation) ; le magasin / l'encadrement la traite
    if not (mgr or public.can_mag()) then
      if lower(split_part(p_id, '|', 1)) <> coalesce(public.my_key(), '') then raise exception 'demande magasin d''une autre personne : réservé au magasin / à l''encadrement'; end if;
      if p_mode = 'replace' then raise exception 'demande magasin : réservé au magasin'; end if;
      v_st := p_patch->>'statut';
      if v_st is null or v_st not in ('envoyee','annulee') then raise exception 'demande magasin : ce changement est réservé au magasin'; end if;
      select data into v_old from public.registre where kind = p_kind and id = p_id;
      if v_old is not null and coalesce(v_old->>'statut','envoyee') <> 'envoyee' then raise exception 'demande déjà prise en charge par le magasin : vois avec le référent'; end if;
      v_old := null;
    end if;
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

-- lecture : tout compte actif, SAUF base de prix / paniers / paramètres V2B (encadrement, bureau, administrateur), compteurs d'heures (RH, la personne),
-- bibliothèque du mémoire (encadrement, bureau), remises de véhicule (encadrement, bureau, le conducteur), demandes magasin (encadrement, bureau, magasin, le demandeur)
drop policy if exists registre_read on public.registre;
create policy registre_read on public.registre for select using (
  (public.is_active() or public.is_admin())
  and (kind not in ('prix','panier') or public.is_admin() or coalesce(public.my_role(),'') in ('chef','bureau'))
  and (kind <> 'cpth' or public.is_admin() or public.can_rh('rh.voir') or public.can_rh('rh.edit') or lower(id) = coalesce(public.my_key(), ''))
  and (not (kind = 'doc' and id = 'memlib') or public.is_admin() or coalesce(public.my_role(),'') in ('chef','bureau'))
  and (kind <> 'vrec' or public.is_admin() or coalesce(public.my_role(),'') in ('chef','bureau') or lower(coalesce(data->>'conducteurKey','')) = coalesce(public.my_key(), ''))
  and (kind <> 'magdem' or public.is_admin() or coalesce(public.my_role(),'') in ('chef','bureau') or public.can_mag() or lower(split_part(id, '|', 1)) = coalesce(public.my_key(), ''))
);

-- contrôle (chaque ligne doit dire « true »)
select 'can_prix / can_rh (13-10f)' as objet, (to_regprocedure('public.can_rh(text)') is not null and to_regprocedure('public.can_prix()') is not null) as ok
union all select 'annuaire des invités (13-10g)', (to_regprocedure('public.annuaire_invites()') is not null)
union all select 'can_mag', (to_regprocedure('public.can_mag()') is not null)
union all select 'registre_set : magasin (magcat, magdem, magmvt)', (position('magdem' in pg_get_functiondef('public.registre_set(text,text,jsonb,text)'::regprocedure)) > 0)
union all select 'registre_set : véhicules (vcfg, vrec)', (position('vrec' in pg_get_functiondef('public.registre_set(text,text,jsonb,text)'::regprocedure)) > 0)
union all select 'registre_read : mémoire, remises, demandes restreintes', (select position('memlib' in coalesce(qual,'')) > 0 and position('magdem' in coalesce(qual,'')) > 0 from pg_policies where schemaname = 'public' and tablename = 'registre' and policyname = 'registre_read');
