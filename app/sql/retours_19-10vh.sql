-- RETOURS DU 19/10/2026 (lot VH) — REMISE DE VÉHICULE SANS RESPONSABLE SUR PLACE, « VÉHICULE LAISSÉ », PREMIER ÉTAT DES LIEUX.
-- Jusqu'ici « vrec » (remises / restitutions) et « vehicule » (fiche du parc) s'écrivaient seulement par l'encadrement / bureau : le conducteur seul sur chantier ne pouvait
-- pas enregistrer SA remise. Ce fichier ajoute deux règles à registre_set, le reste ne change pas :
--  · « vrec » : un compte actif sans rôle chef / bureau écrit une remise, une restitution ou un « véhicule laissé » À SON NOM (data.conducteurKey = son e-mail), en fusion
--    seulement, jamais la décision du responsable (clés valide, refus, sigResponsable) ni la ligne d'une autre personne ;
--  · « vehicule » : il ne touche que ces clés de la fiche — conducteur, conducteurKey, km, remise, laisse, vignette, vignetteAt, cartes, signalements — sur un véhicule
--    qui est À LUI (conducteurKey = son e-mail) ou LIBRE (sans conducteurKey : laissé, ou conducteur « nom libre » de l'import Excel) ; il ne pose jamais un véhicule
--    sur quelqu'un d'autre, ne crée ni ne supprime une fiche. (Au passage, « Signaler un problème » depuis Mon véhicule passe enfin au serveur pour un conducteur.)
--  · l'encadrement / bureau (responsable flotte, chef de chantier, conducteur de travaux, direction) : comme avant — tout, y compris valider, refuser, déclarer un
--    changement de conducteur (clé switch de la fiche).
-- Lecture (politique registre_read) : INCHANGÉE — « vrec » : encadrement, bureau, administrateur et le conducteur concerné ; « vehicule » : tout compte actif.
-- À passer APRÈS retours_14-10a.sql et retours_14-10b.sql (vérifié ci-dessous). Seule registre_set est redéfinie, EN ENTIER : celle de 14-10b + les deux règles.
-- À coller dans Supabase → SQL Editor → Run. Ré-exécutable. Testé sur un Postgres 16 local : bloc de test à la fin de ce fichier (commentaires).
do $$ declare ok boolean := false; begin
  if to_regprocedure('public.can_mag()') is not null and to_regprocedure('public.registre_set(text,text,jsonb,text)') is not null then
    ok := position('entdoc' in pg_get_functiondef(to_regprocedure('public.registre_set(text,text,jsonb,text)'))) > 0; end if;
  if not ok then raise exception 'Passe d''abord sql/retours_14-10a.sql puis sql/retours_14-10b.sql, puis ce fichier (retours_19-10vh.sql).'; end if;
end $$;

create or replace function public.registre_set(p_kind text, p_id text, p_patch jsonb, p_mode text default 'merge') returns jsonb
language plpgsql security definer set search_path = public as $$
declare v_old jsonb; v_new jsonb; v_row jsonb; mgr boolean; k text; v_st text; v_me text; v_cond text;
begin
  if not public.is_active() then raise exception 'compte inactif'; end if;
  if p_id is null or length(p_id) = 0 or length(p_id) > 200 then raise exception 'identifiant invalide'; end if;
  mgr := public.is_admin() or coalesce(public.my_role(),'') in ('chef','bureau');
  v_me := coalesce(public.my_key(), '');
  if p_kind in ('prix','panier') then -- 13/10 (e) : la base de prix et les paniers SCR (et la ligne « v1 » : paramètres de l'ancien tableau V2B) = droit « Base de prix SCR : modifier »
    if not public.can_prix() then raise exception 'base de prix : droit « Base de prix SCR : modifier » nécessaire'; end if;
  elsif p_kind = 'cpth' or (p_kind = 'gdx' and p_id like 'force|%') then -- 13/10 (f) : contrat, compteurs d'heures, cas de déplacement forcé = droit RH « modifier »
    if not public.can_rh('rh.edit') then raise exception 'contrats et compteurs : droit RH « modifier » nécessaire (RH, administrateur)'; end if;
  elsif p_kind = 'vrec' then -- 19/10 (VH) : remise / restitution / véhicule laissé — l'encadrement / bureau : tout ; le conducteur : SA remise (conducteurKey = lui), en fusion, sans la décision du responsable
    if not mgr then
      if p_mode = 'replace' then raise exception 'remise de véhicule : remplacement réservé à l''encadrement / bureau'; end if;
      if p_patch is null or jsonb_typeof(p_patch) <> 'object' then raise exception 'remise de véhicule : données invalides'; end if;
      if p_patch ? 'valide' or p_patch ? 'refus' or p_patch ? 'sigResponsable' then raise exception 'remise de véhicule : la validation est réservée à l''encadrement / bureau'; end if;
      if p_patch ? 'conducteurKey' and lower(coalesce(p_patch->>'conducteurKey','')) <> v_me then raise exception 'remise de véhicule d''une autre personne : réservé à l''encadrement / bureau'; end if;
      select data into v_old from public.registre where kind = p_kind and id = p_id;
      if v_old is null then
        if not (p_patch ? 'conducteurKey') then raise exception 'remise de véhicule : conducteur absent'; end if;
      elsif lower(coalesce(v_old->>'conducteurKey','')) <> v_me then raise exception 'remise de véhicule d''une autre personne : réservé à l''encadrement / bureau'; end if;
      v_old := null;
    end if;
  elsif p_kind = 'vehicule' then -- 19/10 (VH) : fiche du parc — l'encadrement / bureau : tout ; le conducteur : quelques clés de SON véhicule (ou d'un véhicule libre : laissé, nom libre)
    if not mgr then
      if p_mode = 'replace' then raise exception 'fiche véhicule : réservé à l''encadrement / bureau'; end if;
      if p_patch is null or jsonb_typeof(p_patch) <> 'object' then raise exception 'fiche véhicule : données invalides'; end if;
      for k in select jsonb_object_keys(p_patch) loop
        if k not in ('conducteur','conducteurKey','km','remise','laisse','vignette','vignetteAt','cartes','signalements') then raise exception 'fiche véhicule : « % » réservé à l''encadrement / bureau', k; end if;
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

-- contrôle (chaque ligne doit dire « true »)
select 'registre_set : remise « vrec » écrite par le conducteur lui-même (19-10vh)' as objet, (position('remise de véhicule d' in pg_get_functiondef('public.registre_set(text,text,jsonb,text)'::regprocedure)) > 0) as ok
union all select 'registre_set : fiche « vehicule », quelques clés par le conducteur (19-10vh)', (position('on ne pose pas un véhicule sur quelqu' in pg_get_functiondef('public.registre_set(text,text,jsonb,text)'::regprocedure)) > 0)
union all select 'registre_set : 14-10a (magasin) et 14-10b (entdoc) toujours là', (position('magdem' in pg_get_functiondef('public.registre_set(text,text,jsonb,text)'::regprocedure)) > 0 and position('entdoc' in pg_get_functiondef('public.registre_set(text,text,jsonb,text)'::regprocedure)) > 0)
union all select 'registre_read : lecture de « vrec » inchangée (encadrement, bureau, le conducteur)', (select position('vrec' in coalesce(qual,'')) > 0 from pg_policies where schemaname = 'public' and tablename = 'registre' and policyname = 'registre_read');

-- ── TEST (19/10 après-midi, Postgres 16 local ; base reconstruite : registre, profiles, app_settings, invites, les aides is_active / is_admin / my_role / my_key telles
-- quelles, auth.uid() simulé par une table « whoami », puis retours_14-10a.sql, retours_14-10b.sql et ce fichier ; comptes FICTIFS : administrateur, chef, bureau
-- (responsable flotte), deux soudeurs, un compte inactif). Passé deux fois de suite (ré-exécutable) : les 4 lignes de contrôle à true. Résultats :
--   vrec · soudeur K écrit sa remise (conducteurKey = lui) → ÉCRIT · la complète (fusion : aValider) → ÉCRIT · sa restitution « véhicule laissé » → ÉCRIT ·
--          une remise au nom de P → refusé · sa remise avec « valide » → refusé · en mode remplacement → refusé · P retouche la remise de K → refusé ·
--          sans conducteurKey sur une nouvelle ligne → refusé · chef valide la remise de K (valide, sigResponsable) → ÉCRIT · bureau (responsable flotte) refuse → ÉCRIT ·
--          K retouche sa remise validée (ex. remarque) → ÉCRIT (sa ligne, sans toucher valide) ;
--   vehicule · administrateur crée la fiche, conducteurKey = K → ÉCRIT · K : km, remise, vignette, cartes, signalements → ÉCRIT · K : type → refusé (clé réservée) ·
--          K : deleted → refusé · K laisse le véhicule (conducteur null, laisse) → ÉCRIT · P prend le véhicule libre (conducteur = P) → ÉCRIT · K (plus conducteur) : km → refusé ·
--          P pose le véhicule sur K (conducteurKey = K) → refusé · P : conducteur « nom » sans sa clé → refusé · fiche inconnue → refusé · remplacement → refusé ·
--          compte inactif → refusé · bureau : switch (changement de conducteur) → ÉCRIT · K sur un véhicule « nom libre » de l'import (sans conducteurKey) : vignette → ÉCRIT ;
--   lecture (RLS, rôle authenticated) : K voit ses 2 lignes vrec, P sa ligne, le chef les 3 ; tout le monde voit les fiches véhicule ;
--   14-10a / 14-10b inchangés : demande magasin par K → ÉCRIT · affaire par K → refusé · entdoc par le bureau → ÉCRIT · registre inconnu → refusé.
-- Base sans 14-10b : arrêt dès le début (« Passe d'abord… »), registre_set non touchée.
