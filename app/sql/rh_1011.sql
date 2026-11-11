-- sql/rh_1011.sql — 10/11/2026 : module Tracé Ressources humaines.
-- Quatre registres de plus dans public.registre : rhabs (absences et congés), rhpv (contraventions), rhform (plan de formation), rhmut (mutuelle).
-- Écriture : droit RH « modifier » (RH, direction, administrateur) ; absences et congés aussi avec le droit « rh.abs » (responsables d'exploitation, RH, assistante RH).
-- Lecture : RH / direction / administrateur (absences : + rh.abs), et la personne elle-même pour SES lignes
-- (identifiant = <sa clé>|<n°>). Tout le reste de registre_set et de la politique de lecture est repris tel quel de retours_20-10.sql.
-- À passer dans Supabase (SQL Editor) APRÈS retours_20-10.sql. Sans ce fichier, l'appli garde les lignes RH sur l'appareil et le dit.
-- 11/11 : refuse de s'exécuter si un fichier plus récent (affaire_a_1011, navettes_1011, retours_ia_1111) est déjà passé — il retirerait des registres.
do $do$ begin
  if not exists (select 1 from pg_proc where proname = 'can_rh') then raise exception 'Passe d''abord sql/retours_20-10.sql (fonction can_rh absente).'; end if;
  if exists (select 1 from pg_proc p where p.proname = 'registre_set' and (pg_get_functiondef(p.oid) like '%afaff%' or pg_get_functiondef(p.oid) like '%navliss%')) then raise exception 'Fichier dépassé : un fichier plus récent (affaire_a_1011, navettes_1011 ou retours_ia_1111) est déjà passé et contient déjà tout rh_1011.sql. Ne le repasse pas (il retirerait des registres) : rien n''a été modifié.'; end if; -- 11/11
end $do$;
-- can_rh : reprise de retours_14-10a.sql + le droit « rh.abs » (absences et congés) d'office pour les responsables d'exploitation, la RH et l'assistante RH
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
          when 'rh.abs' then array['resp_exploitation','resp_rh','assist_rh','charge_dev_rh'] -- 10/11 : absences et congés
          else array[]::text[] end)
      end
  );
$$;
create or replace function public.registre_set(p_kind text, p_id text, p_patch jsonb, p_mode text default 'merge') returns jsonb
language plpgsql security definer set search_path = public as $$
declare v_old jsonb; v_new jsonb; v_row jsonb; mgr boolean; k text; v_st text; v_me text; v_cond text; v_a text;
begin
  if not public.is_active() then raise exception 'compte inactif'; end if;
  if p_id is null or length(p_id) = 0 or length(p_id) > 200 then raise exception 'identifiant invalide'; end if;
  mgr := public.is_admin() or coalesce(public.my_role(),'') in ('chef','bureau');
  v_me := coalesce(public.my_key(), '');
  if p_kind in ('prix','panier') then -- 13/10 (e) : la base de prix et les paniers SCR (et la ligne « v1 » : paramètres de l'ancien tableau V2B) = droit « Base de prix SCR : modifier »
    if not public.can_prix() then raise exception 'base de prix : droit « Base de prix SCR : modifier » nécessaire'; end if;
  elsif p_kind = 'cpth' or (p_kind = 'gdx' and p_id like 'force|%') then -- 13/10 (f) : contrat, compteurs d'heures, cas de déplacement forcé = droit RH « modifier »
    if not public.can_rh('rh.edit') then raise exception 'contrats et compteurs : droit RH « modifier » nécessaire (RH, administrateur)'; end if;
  elsif p_kind = 'vrec' then -- 19/10 (VH) : état des lieux / véhicule laissé — l'encadrement / bureau : tout ; le conducteur : SA vrec (conducteurKey = lui), en fusion, sans la décision du responsable ; 20/10 (VM) : + pris / contest sur la vrec d'un collègue qui lui a laissé le véhicule
    if not mgr then
      if p_mode = 'replace' then raise exception 'remise de véhicule : remplacement réservé à l''encadrement / bureau'; end if;
      if p_patch is null or jsonb_typeof(p_patch) <> 'object' then raise exception 'remise de véhicule : données invalides'; end if;
      if (p_patch ? 'valide' and jsonb_typeof(p_patch->'valide') <> 'null') or (p_patch ? 'refus' and jsonb_typeof(p_patch->'refus') <> 'null') or (p_patch ? 'sigResponsable' and jsonb_typeof(p_patch->'sigResponsable') <> 'null') or (p_patch ? 'arbitre' and jsonb_typeof(p_patch->'arbitre') <> 'null') then raise exception 'remise de véhicule : la validation est réservée à l''encadrement / bureau'; end if; -- 20/10 (VM) : une clé à null (= effacée, ex. sigResponsable null d'un état des lieux fait seul) n'est pas une validation
      if p_patch ? 'conducteurKey' and lower(coalesce(p_patch->>'conducteurKey','')) <> v_me then raise exception 'remise de véhicule d''une autre personne : réservé à l''encadrement / bureau'; end if;
      select data into v_old from public.registre where kind = p_kind and id = p_id;
      if v_old is null then
        if not (p_patch ? 'conducteurKey') then raise exception 'remise de véhicule : conducteur absent'; end if;
      elsif lower(coalesce(v_old->>'conducteurKey','')) <> v_me then
        -- 20/10 (VM) : prendre le véhicule laissé par un collègue = signer (pris) ou contester (contest) SON état des lieux, rien d'autre
        if not (v_old ? 'lache') then raise exception 'remise de véhicule d''une autre personne : réservé à l''encadrement / bureau'; end if;
        v_a := lower(coalesce(v_old->'a'->>'key',''));
        if v_a <> '' and v_a <> v_me then raise exception 'véhicule laissé à quelqu''un d''autre : c''est à lui de signer (ou à l''encadrement / bureau)'; end if;
        if v_old ? 'pris' or v_old ? 'contest' then raise exception 'état des lieux déjà signé ou contesté'; end if;
        for k in select jsonb_object_keys(p_patch) loop
          if k not in ('pris','contest') then raise exception 'remise de véhicule d''une autre personne : seule la signature « pris » ou la contestation « contest » (réservé sinon à l''encadrement / bureau)'; end if;
          if jsonb_typeof(p_patch->k) <> 'object' or lower(coalesce(p_patch->k->>'par','')) <> v_me then raise exception 'signature de véhicule : à son propre nom seulement'; end if;
        end loop;
      end if;
      v_old := null;
    end if;
  elsif p_kind = 'vehicule' then -- 19/10 (VH) : fiche du parc — l'encadrement / bureau : tout ; le conducteur : quelques clés de SON véhicule (ou d'un véhicule libre : laissé, nom libre) ; 20/10 (VM) : + depuis
    if not mgr then
      if p_mode = 'replace' then raise exception 'fiche véhicule : réservé à l''encadrement / bureau'; end if;
      if p_patch is null or jsonb_typeof(p_patch) <> 'object' then raise exception 'fiche véhicule : données invalides'; end if;
      for k in select jsonb_object_keys(p_patch) loop
        if k not in ('conducteur','conducteurKey','depuis','km','remise','laisse','vignette','vignetteAt','cartes','signalements') then raise exception 'fiche véhicule : « % » réservé à l''encadrement / bureau', k; end if;
      end loop;
      if (p_patch ? 'conducteurKey' and jsonb_typeof(p_patch->'conducteurKey') <> 'null' and lower(coalesce(p_patch->>'conducteurKey','')) <> v_me)
         or (p_patch ? 'conducteur' and jsonb_typeof(p_patch->'conducteur') <> 'null' and lower(coalesce(p_patch->>'conducteurKey','')) <> v_me) then
        raise exception 'fiche véhicule : on ne pose pas un véhicule sur quelqu''un d''autre (réservé à l''encadrement / bureau)'; end if;
      select data into v_old from public.registre where kind = p_kind and id = p_id;
      if v_old is null then raise exception 'fiche véhicule : véhicule inconnu (création réservée à l''encadrement / bureau)'; end if;
      v_cond := lower(coalesce(v_old->>'conducteurKey',''));
      if v_cond <> '' and v_cond <> v_me then raise exception 'fiche véhicule : véhicule d''une autre personne (réservé à l''encadrement / bureau)'; end if;
      v_old := null;
    end if;
  elsif p_kind = 'pteq' then -- 20/10 (PA) : constats des points photo du plan d'ensemble (vannes, purges, vidanges, sous-stations, raccordements) — une ligne par constat, id <site>|<point>|<uid>
    -- tout compte actif écrit ; l'encadrement / bureau : tout (y compris retirer le constat d'un autre : deleted) ; un compte sans rôle chef / bureau : seulement SES constats (byKey = lui), en fusion
    if not mgr then
      if p_mode = 'replace' then raise exception 'point de contrôle : remplacement réservé à l''encadrement / bureau'; end if;
      if p_patch is null or jsonb_typeof(p_patch) <> 'object' then raise exception 'point de contrôle : données invalides'; end if;
      if p_patch ? 'byKey' and lower(coalesce(p_patch->>'byKey','')) <> v_me then raise exception 'constat d''une autre personne : réservé à l''encadrement / bureau'; end if;
      select data into v_old from public.registre where kind = p_kind and id = p_id;
      if v_old is null then
        if not (p_patch ? 'byKey') then raise exception 'point de contrôle : auteur absent (byKey)'; end if;
      elsif lower(coalesce(v_old->>'byKey','')) <> v_me then raise exception 'constat d''une autre personne : réservé à l''encadrement / bureau'; end if;
      v_old := null;
    end if;
  elsif p_kind in ('doc','affaire','mission','controle','commande','qhs','qhstopic','prov','gdx','vcfg') then -- 14/10 : + vcfg (configuration de la réception de véhicule) ; 19/10 : vehicule et vrec traités au-dessus
    if not mgr then raise exception 'réservé à l''encadrement / bureau'; end if;
  elsif p_kind = 'entdoc' then -- 14/10 (b) : documents administratifs de l'entreprise (assurances RC / décennale, Kbis, URSSAF, attestation fiscale, RIB, qualifications…) = administrateur / bureau
    if not mgr then raise exception 'documents de l''entreprise : réservé à l''administrateur / au bureau'; end if;
  elsif p_kind in ('magcat','magmvt') then -- 14/10 : catalogue et mouvements de stock = droit « Magasin »
    if not public.can_mag() then raise exception 'magasin : droit « Magasin » nécessaire (référent magasin, administrateur)'; end if;
  elsif p_kind = 'magdem' then -- 14/10 : demande de matériel — la personne crée et annule SA demande (tant qu'elle n'est pas en préparation) ; le magasin / l'encadrement la traite
    if not (mgr or public.can_mag()) then
      if lower(split_part(p_id, '|', 1)) <> v_me then raise exception 'demande magasin d''une autre personne : réservé au magasin / à l''encadrement'; end if;
      if p_mode = 'replace' then raise exception 'demande magasin : réservé au magasin'; end if;
      v_st := p_patch->>'statut';
      if v_st is null or v_st not in ('envoyee','annulee') then raise exception 'demande magasin : ce changement est réservé au magasin'; end if;
      select data into v_old from public.registre where kind = p_kind and id = p_id;
      if v_old is not null and coalesce(v_old->>'statut','envoyee') <> 'envoyee' then raise exception 'demande déjà prise en charge par le magasin : vois avec le référent'; end if;
      v_old := null;
    end if;
  elsif p_kind in ('docsig','qhsig') then
    if not (mgr or lower(split_part(p_id, '|', 2)) = v_me) then raise exception 'signature réservée à la personne elle-même'; end if;
  elsif p_kind in ('debours','agenda') then -- la personne elle-même (id = <e-mail>|<…>) ou l'encadrement
    if not (mgr or lower(split_part(p_id, '|', 1)) = v_me) then raise exception 'réservé à la personne elle-même'; end if;
  elsif p_kind = 'accident' then -- toute personne active déclare ; elle ne retouche que SA déclaration ; le traitement (status) est réservé à l'encadrement / bureau
    select data into v_old from public.registre where kind = p_kind and id = p_id;
    if not mgr then
      if v_old is not null and lower(coalesce(v_old->>'byKey','')) <> v_me then raise exception 'déclaration d''une autre personne : réservé à l''encadrement'; end if;
      if coalesce(p_patch->>'status','declare') <> 'declare' or p_mode = 'replace' then raise exception 'le traitement d''une déclaration est réservé à la RH / direction / QSE'; end if;
    end if;
  elsif p_kind = 'rhabs' then -- 10/11 (RH) : absences et congés = responsable d'exploitation, RH, assistante RH (droit « rh.abs ») ou droit RH « modifier »
    if not (public.can_rh('rh.edit') or public.can_rh('rh.abs')) then raise exception 'absences et congés : réservé au responsable d''exploitation, à la RH et à l''assistante RH'; end if;
  elsif p_kind in ('rhpv','rhform','rhmut') then -- 10/11 (RH) : contraventions, plan de formation, mutuelle = droit RH « modifier » (RH, direction, administrateur)
    if not public.can_rh('rh.edit') then raise exception 'ressources humaines : droit RH « modifier » nécessaire (RH, direction, administrateur)'; end if;
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
-- lecture (politique complète reprise de retours_20-10.sql + les registres RH)
drop policy if exists registre_read on public.registre;
create policy registre_read on public.registre for select using (
  (public.is_active() or public.is_admin())
  and (kind not in ('prix','panier') or public.is_admin() or coalesce(public.my_role(),'') in ('chef','bureau'))
  and (kind <> 'cpth' or public.is_admin() or public.can_rh('rh.voir') or public.can_rh('rh.edit') or lower(id) = coalesce(public.my_key(), ''))
  and (not (kind = 'doc' and id = 'memlib') or public.is_admin() or coalesce(public.my_role(),'') in ('chef','bureau'))
  and (kind <> 'vrec' or public.is_admin() or coalesce(public.my_role(),'') in ('chef','bureau') or lower(coalesce(data->>'conducteurKey','')) = coalesce(public.my_key(), '')
       or (data ? 'lache' and lower(coalesce(data->'a'->>'key','')) in ('', coalesce(public.my_key(), ''))))
  and (kind <> 'magdem' or public.is_admin() or coalesce(public.my_role(),'') in ('chef','bureau') or public.can_mag() or lower(split_part(id, '|', 1)) = coalesce(public.my_key(), ''))
  and (kind not in ('rhpv','rhform','rhmut') or public.is_admin() or public.can_rh('rh.voir') or public.can_rh('rh.edit') or lower(split_part(id, '|', 1)) = coalesce(public.my_key(), ''))
  and (kind <> 'rhabs' or public.is_admin() or public.can_rh('rh.voir') or public.can_rh('rh.edit') or public.can_rh('rh.abs') or lower(split_part(id, '|', 1)) = coalesce(public.my_key(), ''))
);
-- contrôle : select kind, count(*) from public.registre where kind like 'rh%' group by 1;
