-- sql/retours_2411.sql — 24/11/2026 : DEMANDES DE CONGÉ SIGNÉES (module Ressources humaines, recette L28), lecture des lignes RH par la personne désignée,
--   PUBLICATION DU PLANNING par secteur (registre « planpub »).
--   Registre « rhdem » dans public.registre :
--     · une demande de congé : id = <clé de la personne>|d|<identifiant>, données { t:'dem', type, du, au, jours, jCpt, note, sig, statut, … } — la personne la crée,
--       la signe et peut l'annuler tant qu'elle attend ; le responsable d'exploitation, la RH ou l'assistante RH (droit « rh.abs ») l'accorde (en signant) ou la refuse ;
--     · une signature d'absence déclarée par le bureau : id = <clé de la personne>|s|<identifiant de l'absence>, données { t:'sig', abs, sig } — la personne seulement.
--   Lecture : RH, responsables d'exploitation (rh.abs, rh.nav), administrateur — et chacun les siennes.
--   + contraventions, formations, mutuelle, absences : la personne lit aussi les lignes qui la désignent (pKey), même quand l'identifiant ne porte pas sa clé.
--   Registre « planpub » : id = <semaine ISO>|<secteur> (« * » = tous) — publier une semaine du planning : l'encadrement (comme le planning) ; lecture : tout le monde.
-- CONTIENT TOUT retours_ia_1111.sql (registre_set) et navettes_regle_1911.sql (lecture) + « rhdem », « planpub », pKey : à passer APRÈS retours_ia_1111.sql
--   (navettes_regle_1911.sql n'est plus nécessaire : sa ligne de lecture est dedans). Ré-exécutable.
-- Ne repasse pas retours_ia_1111.sql, navettes_regle_1911.sql, navettes_1011.sql ni affaire_a_1011.sql APRÈS celui-ci : ils refusent désormais (« Fichier dépassé »).
-- Sans ce fichier : les demandes et les publications restent sur l'appareil qui les a faites, et l'appli le dit.
do $do$ begin
  if not exists (select 1 from pg_proc p where p.proname = 'registre_set' and pg_get_functiondef(p.oid) like '%''retour''%') then raise exception 'Passe d''abord sql/retours_ia_1111.sql (registre « retour » absent de registre_set).'; end if;
end $do$;
-- registre_set : celle de retours_ia_1111.sql + les registres « rhdem » et « planpub »
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
  elsif p_kind in ('navliss','navchoix') then -- 10/11 nuit (navettes) : semaine réglée à la main (id = personne|lundi), choix de fin de mois « reporter » / « prime » (id = personne|AAAA-MM)
    if not (public.can_rh('rh.edit') or public.can_rh('rh.nav')) then raise exception 'navettes : réservé à la RH et au responsable d''exploitation (droit « contrôler les navettes »)'; end if;
    if p_kind = 'navliss' and not (p_id ~ '^[^|]+\|\d{4}-\d{2}-\d{2}$') then raise exception 'navettes : identifiant de semaine invalide'; end if;
    if p_kind = 'navchoix' and not (p_id ~ '^[^|]+\|\d{4}-\d{2}$') then raise exception 'navettes : identifiant de mois invalide'; end if;
  elsif p_kind in ('afgrille','afnature','afdep','afaff','affac','afequip') then -- 10/11 (Affaire, lot A) : taux, natures, dépenses saisies, paramètres d'affaire, factures, équipements = encadrement / bureau / administrateur
    if not mgr then raise exception 'module Affaire : réservé à l''encadrement, au bureau et à la direction'; end if;
    if p_kind = 'afgrille' and not (p_id ~ '^\d{4}-\d{2}-\d{2}$') then raise exception 'grille de taux : l''identifiant est la date d''effet (AAAA-MM-JJ)'; end if;
  elsif p_kind = 'retour' then -- 11/11 nuit (assistant) : bugs et idées — toute personne active envoie les siens (id = <sa clé>|<uid>) ; le traitement (statut, réponse) = administrateur
    select data into v_old from public.registre where kind = p_kind and id = p_id;
    if length(coalesce(p_patch::text, '')) > 30000 then raise exception 'retour trop long'; end if;
    if not public.is_admin() then
      if lower(split_part(p_id, '|', 1)) <> v_me then raise exception 'retour : l''identifiant commence par ta clé'; end if;
      if v_old is not null and lower(coalesce(v_old->>'parKey', '')) not in ('', v_me) then raise exception 'retour d''une autre personne'; end if;
      if p_mode = 'replace' then raise exception 'retour : remplacement réservé à l''administrateur'; end if;
      if (p_patch ? 'statut' and coalesce(p_patch->>'statut', 'nouveau') <> 'nouveau') or p_patch ? 'reponse' or p_patch ? 'traite' then raise exception 'le traitement d''un retour est réservé à l''administrateur'; end if;
    end if;
  elsif p_kind = 'rhdem' then -- 24/11 (RH) : demandes de congé (id = <clé>|d|<uid>) et signatures d'absence (id = <clé>|s|<absence>) — la personne : les siennes ; accorder / refuser = rh.abs ou RH « modifier »
    if length(coalesce(p_patch::text, '')) > 150000 then raise exception 'demande trop lourde (signature)'; end if;
    if not (public.can_rh('rh.edit') or public.can_rh('rh.abs')) then
      if lower(split_part(p_id, '|', 1)) <> v_me then raise exception 'demande de congé : l''identifiant commence par ta clé'; end if;
      if split_part(p_id, '|', 2) not in ('d', 's') then raise exception 'demande de congé : identifiant invalide'; end if;
      if p_mode = 'replace' then raise exception 'demande de congé : remplacement réservé à la RH'; end if;
      if p_patch is null or jsonb_typeof(p_patch) <> 'object' then raise exception 'demande de congé : données invalides'; end if;
      if p_patch ? 'val' or p_patch ? 'refus' or p_patch ? 'absId' then raise exception 'accorder ou refuser une demande : réservé au responsable d''exploitation, à la RH et à l''assistante RH'; end if;
      if p_patch ? 'pKey' and lower(coalesce(p_patch->>'pKey', '')) <> v_me then raise exception 'demande de congé : à ton nom seulement'; end if;
      if p_patch ? 'statut' and coalesce(p_patch->>'statut', '') not in ('demande', 'annulee') then raise exception 'demande de congé : ce statut est réservé au responsable'; end if;
      select data into v_old from public.registre where kind = p_kind and id = p_id;
      if v_old is not null and coalesce(v_old->>'statut', 'demande') not in ('demande') then raise exception 'demande déjà traitée : vois avec ton responsable'; end if;
      if v_old is not null and split_part(p_id, '|', 2) = 's' then raise exception 'absence déjà signée'; end if;
      v_old := null;
    end if;
  elsif p_kind = 'planpub' then -- 24/11 (planning) : publication d'une semaine par secteur (id = <semaine ISO>|<secteur ou *>) — l'encadrement (chef / bureau) et l'administrateur, comme planning_set
    if not mgr then raise exception 'publier le planning : réservé à l''encadrement'; end if;
    if p_id !~ '^\d{4}-W\d{2}\|(\*|ouest|idf|sudouest|sudest)$' then raise exception 'publication du planning : identifiant invalide (semaine|secteur)'; end if;
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
-- lecture : politique complète de navettes_regle_1911.sql (= retours_ia_1111.sql + la règle commune de la semaine lisible par tous) + « rhdem » + pKey
drop policy if exists registre_read on public.registre;
create policy registre_read on public.registre for select using (
  (public.is_active() or public.is_admin())
  and (kind not in ('prix','panier') or public.is_admin() or coalesce(public.my_role(),'') in ('chef','bureau'))
  and (kind <> 'cpth' or public.is_admin() or public.can_rh('rh.voir') or public.can_rh('rh.edit') or public.can_rh('rh.nav') or lower(id) = coalesce(public.my_key(), '')) -- 10/11 nuit : + qui contrôle les navettes (le choix « reporter ou prime » demande de voir le compteur)
  and (not (kind = 'doc' and id = 'memlib') or public.is_admin() or coalesce(public.my_role(),'') in ('chef','bureau'))
  and (kind <> 'vrec' or public.is_admin() or coalesce(public.my_role(),'') in ('chef','bureau') or lower(coalesce(data->>'conducteurKey','')) = coalesce(public.my_key(), '')
       or (data ? 'lache' and lower(coalesce(data->'a'->>'key','')) in ('', coalesce(public.my_key(), ''))))
  and (kind <> 'magdem' or public.is_admin() or coalesce(public.my_role(),'') in ('chef','bureau') or public.can_mag() or lower(split_part(id, '|', 1)) = coalesce(public.my_key(), ''))
  and (kind not in ('rhpv','rhform','rhmut') or public.is_admin() or public.can_rh('rh.voir') or public.can_rh('rh.edit') or lower(split_part(id, '|', 1)) = coalesce(public.my_key(), '') or lower(coalesce(data->>'pKey', '')) = coalesce(public.my_key(), '')) -- 24/11 : + la personne désignée après coup (pKey : contravention reçue avant la désignation du conducteur)
  and (kind <> 'rhabs' or public.is_admin() or public.can_rh('rh.voir') or public.can_rh('rh.edit') or public.can_rh('rh.abs') or public.can_rh('rh.nav') or lower(split_part(id, '|', 1)) = coalesce(public.my_key(), '') or lower(coalesce(data->>'pKey', '')) = coalesce(public.my_key(), '')) -- 10/11 nuit : + rh.nav (les absences entrent dans le lissage) ; 24/11 : + pKey
  and (kind not in ('afgrille','afnature','afdep','afaff','affac','afequip') or public.is_admin() or coalesce(public.my_role(),'') in ('chef','bureau')) -- 10/11 (Affaire) : encadrement / bureau / administrateur
  and (kind not in ('navliss','navchoix') or public.is_admin() or public.can_rh('rh.voir') or public.can_rh('rh.edit') or public.can_rh('rh.nav') or lower(split_part(id, '|', 1)) = coalesce(public.my_key(), '')
       or (kind = 'navliss' and split_part(id, '|', 1) = 'tous')) -- 10/11 nuit (navettes) : RH, responsable d'exploitation, la personne elle-même ; 19/11 nuit : + la règle commune de la semaine (tous|<lundi>), lisible par tous
  and (kind <> 'retour' or public.is_admin() or lower(split_part(id, '|', 1)) = coalesce(public.my_key(), '')) -- 11/11 nuit : bugs et idées — l'administrateur, et chacun les siens
  and (kind <> 'rhdem' or public.is_admin() or public.can_rh('rh.voir') or public.can_rh('rh.edit') or public.can_rh('rh.abs') or public.can_rh('rh.nav') or lower(split_part(id, '|', 1)) = coalesce(public.my_key(), '')) -- 24/11 : demandes de congé et signatures — RH, responsables d'exploitation, et chacun les siennes
);
-- contrôle : select data->>'t' as t, data->>'statut' as statut, count(*) from public.registre where kind = 'rhdem' group by 1, 2;
--            select id, data->>'at' as le, data->>'by' as par from public.registre where kind = 'planpub' order by id desc limit 10;
