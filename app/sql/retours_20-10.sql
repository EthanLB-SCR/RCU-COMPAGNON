-- RETOURS DU 20/10/2026 — FICHIER UNIQUE À PASSER (fusion des deux lots du jour : PA = points photo du plan, VM = mouvements de véhicules).
-- Les deux lots redéfinissaient chacun registre_set EN ENTIER : passés l'un après l'autre, le second aurait effacé la règle du premier. Ce fichier = registre_set de
-- retours_19-10vh.sql + les règles VM (ci-dessous) + la règle PA « pteq » (plus bas), et registre_read = 14-10a + la règle VM. Passe CE fichier, une fois.
--
-- RETOURS DU 20/10/2026 (partie VM) — MOUVEMENTS DE VÉHICULES : « PRENDRE = SIGNER QUE L'ÉTAT DES LIEUX DE CELUI QUI LAISSE EST EXACT », CONTESTER.
-- Modèle (src/reception2.js) : X laisse son véhicule (sa « vrec » type restitution, clé lache ; à qui : a {key, nom} ou personne = « à qui le prendra ») ; Y le prend en
-- SIGNANT sur la vrec de X (clé pris {par, nom, at, sig}) — ou la CONTESTE (clé contest {par, nom, at, motif, recId, resp} ; son contre-état des lieux est SA vrec). Pas de
-- validation par un responsable : les deux signatures suffisent. Jusqu'ici (retours_19-10vh.sql) un conducteur n'écrivait que SA vrec et ne lisait que la sienne.
-- Ce fichier ajoute, le reste ne change pas :
--  · registre_set, « vrec », compte sans rôle chef / bureau, sur une vrec qui N'EST PAS la sienne : SEULEMENT les clés pris ou contest, en fusion, à SON nom (par = lui),
--    si cette vrec porte lache ET (a absent, ou a.key = lui) ET n'est pas déjà prise / contestée ; tout le reste (autre clé, remplacement, vrec d'un véhicule laissé à
--    quelqu'un d'autre) est refusé comme avant ;
--  · registre_set, « vehicule », compte sans rôle chef / bureau : + la clé depuis (date de prise du véhicule) parmi les clés qu'il peut écrire sur SON véhicule ou un
--    véhicule LIBRE (sans conducteurKey : laissé, nom libre de l'import). Un véhicule laissé à Y reste SANS conducteur pendant l'attente : la règle « véhicule libre »
--    d'hier suffit pour que Y s'y pose (conducteur, conducteurKey, depuis, laisse, remise, km, vignette…) ; la clé switch (changement déclaré) reste à l'encadrement ;
--  · registre_set, « vrec », compte sans rôle chef / bureau, sur SA vrec : une clé valide / refus / sigResponsable / arbitre à NULL (effacement, ex. l'état des lieux fait seul
--    porte sigResponsable null) n'est plus prise pour une validation (hier, l'état des lieux seul d'un conducteur était refusé par le serveur pour ça) ;
--  · politique registre_read, « vrec » : lisible aussi quand data porte lache et (a absent, ou a.key = my_key()) — le preneur lit l'état des lieux de celui qui laisse.
-- Encadrement / bureau / administrateur : comme avant — tout (y compris trancher un mouvement contesté : clé arbitre).
-- À passer APRÈS retours_14-10a.sql, retours_14-10b.sql ET retours_19-10vh.sql (vérifié ci-dessous). registre_set est redéfinie EN ENTIER (= 19-10vh + ces règles) ;
-- registre_read est redéfinie EN ENTIER (= 14-10a l.131-138 + la règle). À coller dans Supabase → SQL Editor → Run. Ré-exécutable. Testé sur un Postgres 16 local (bloc de
-- test à la fin, en commentaires). Tant que ce fichier n'est pas passé : l'appli garde l'écriture refusée sur l'appareil (message clair), rien ne casse.
--
-- RETOURS DU 20/10/2026 (partie PA) — POINTS PHOTO DU PLAN D'ENSEMBLE : vannes, purges, vidanges, sous-stations, raccordements (registre « pteq »).
-- Ethan : « purge, vidange, vanne, sous-station, ça doit être des points sur lesquels on peut prendre des photos, plusieurs fois … les vannes pré-isolées : pouvoir
-- spécifier ouverte ou fermée, avec date de dernière mise à jour et photo ». L'appli écrit UNE LIGNE PAR CONSTAT dans le registre générique :
--   kind = 'pteq', id = <idChantier>|<cléPoint>|<uid>, data = {site, pt, nature, ligne, ligneNom, pk, dn, label, ctx, etat ('ouverte' | 'fermee' | null),
--   photos:[{u, w, h}] (adresses du stockage), note, by, byKey (e-mail de l'auteur), byName, at, deleted}.
-- Ce fichier ajoute UNE règle à registre_set, le reste ne change pas :
--  · « pteq » : tout compte actif écrit ; l'encadrement / bureau (chef, conducteur, bureau, administrateur) : tout, y compris retirer le constat d'un autre (deleted) ;
--    un compte sans rôle chef / bureau : seulement SES constats — byKey = son e-mail, sur une ligne nouvelle ou déjà à lui —, en fusion (jamais de remplacement),
--    donc il ne pose « deleted » que sur les siens.
-- Lecture (politique registre_read) : INCHANGÉE — « pteq » se lit comme tout registre non restreint : tout compte actif.
-- (Partie PA : registre_read n'a pas besoin de changer pour pteq.)
do $$ declare ok boolean := false; begin
  if to_regprocedure('public.can_mag()') is not null and to_regprocedure('public.registre_set(text,text,jsonb,text)') is not null then
    ok := position('remise de véhicule d' in pg_get_functiondef(to_regprocedure('public.registre_set(text,text,jsonb,text)'))) > 0; end if;
  if not ok then raise exception 'Passe d''abord sql/retours_14-10a.sql, sql/retours_14-10b.sql puis sql/retours_19-10vh.sql, puis ce fichier (retours_20-10.sql).'; end if;
end $$;

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
-- bibliothèque du mémoire (encadrement, bureau), états des lieux de véhicule (encadrement, bureau, le conducteur ; 20/10 VM : + celui à qui le véhicule est laissé,
-- ou tout le monde quand il est laissé « à qui le prendra »), demandes magasin (encadrement, bureau, magasin, le demandeur)
drop policy if exists registre_read on public.registre;
create policy registre_read on public.registre for select using (
  (public.is_active() or public.is_admin())
  and (kind not in ('prix','panier') or public.is_admin() or coalesce(public.my_role(),'') in ('chef','bureau'))
  and (kind <> 'cpth' or public.is_admin() or public.can_rh('rh.voir') or public.can_rh('rh.edit') or lower(id) = coalesce(public.my_key(), ''))
  and (not (kind = 'doc' and id = 'memlib') or public.is_admin() or coalesce(public.my_role(),'') in ('chef','bureau'))
  and (kind <> 'vrec' or public.is_admin() or coalesce(public.my_role(),'') in ('chef','bureau') or lower(coalesce(data->>'conducteurKey','')) = coalesce(public.my_key(), '')
       or (data ? 'lache' and lower(coalesce(data->'a'->>'key','')) in ('', coalesce(public.my_key(), ''))))
  and (kind <> 'magdem' or public.is_admin() or coalesce(public.my_role(),'') in ('chef','bureau') or public.can_mag() or lower(split_part(id, '|', 1)) = coalesce(public.my_key(), ''))
);

-- contrôle (chaque ligne doit dire « true »)
select 'registre_set : « pris » / « contest » sur la vrec d''un collègue qui laisse le véhicule (20-10vm)' as objet, (position('seule la signature « pris »' in pg_get_functiondef('public.registre_set(text,text,jsonb,text)'::regprocedure)) > 0) as ok
union all select 'registre_set : constats des points « pteq » (20-10, partie PA)', (position('point de contrôle' in pg_get_functiondef('public.registre_set(text,text,jsonb,text)'::regprocedure)) > 0)
union all select 'registre_set : clé « depuis » de la fiche véhicule (20-10vm)', (position('''depuis''' in pg_get_functiondef('public.registre_set(text,text,jsonb,text)'::regprocedure)) > 0)
union all select 'registre_set : 19-10vh (vrec du conducteur, fiche), 14-10a (magasin), 14-10b (entdoc) toujours là', (position('remise de véhicule d' in pg_get_functiondef('public.registre_set(text,text,jsonb,text)'::regprocedure)) > 0 and position('on ne pose pas un véhicule sur quelqu' in pg_get_functiondef('public.registre_set(text,text,jsonb,text)'::regprocedure)) > 0 and position('magdem' in pg_get_functiondef('public.registre_set(text,text,jsonb,text)'::regprocedure)) > 0 and position('entdoc' in pg_get_functiondef('public.registre_set(text,text,jsonb,text)'::regprocedure)) > 0)
union all select 'registre_read : « vrec » lisible par celui à qui le véhicule est laissé (20-10vm), le reste inchangé', (select position('lache' in coalesce(qual,'')) > 0 and position('memlib' in coalesce(qual,'')) > 0 and position('magdem' in coalesce(qual,'')) > 0 from pg_policies where schemaname = 'public' and tablename = 'registre' and policyname = 'registre_read');

-- ── TEST (20/10, Postgres 16 local ; base reconstruite comme pour 19-10vh : registre, profiles, aides is_active / is_admin / my_role / my_key, auth.uid() simulé par une table
-- « whoami », puis retours_14-10a.sql, retours_14-10b.sql, retours_19-10vh.sql et ce fichier ; comptes FICTIFS : administrateur, chef, bureau (responsable flotte), deux
-- soudeurs K et P, un compte inactif). Ce fichier passé deux fois de suite (ré-exécutable) : les 4 lignes de contrôle à true. Résultats :
--   vrec · K laisse AA à P (sa vrec : lache, a = P) → ÉCRIT · K laisse BB à quelqu'un d'autre → ÉCRIT · K laisse CC « à qui le prendra » (sans a) → ÉCRIT ·
--          P écrit edl sur la vrec de K → refusé · P : pris + une autre clé → refusé · P « pris » au nom de K → refusé · P « pris » en remplacement → refusé ·
--          P signe « pris » (par = P) sur AA → ÉCRIT · P signe encore → refusé (déjà signé) · P signe sur BB → refusé (laissé à quelqu'un d'autre) ·
--          P conteste CC (contest, par = P) → ÉCRIT · P signe une vrec de K sans lache → refusé · P « arbitre » → refusé · P écrit SON contre-état des lieux → ÉCRIT ·
--          chef tranche (arbitre) → ÉCRIT · K : état des lieux seul avec sigResponsable / valide à null → ÉCRIT · K : valide non null → refusé ;
--   vehicule · P se pose sur AA libre (conducteur, conducteurKey, depuis, laisse null, remise, km) → ÉCRIT · P : switch → refusé · K (plus conducteur) : km → refusé ·
--          bureau : switch → ÉCRIT ;
--   lecture (RLS, rôle authenticated) : P voit AA|S1 (laissé à lui), CC|S1 (à qui le prendra) et sa propre vrec, PAS BB|S1 (laissé à quelqu'un d'autre) ni AA|S0
--          (restitution sans lache) ; K voit ses 5 vrec ; le chef voit les 6 ;
--   19-10vh inchangé : K écrit sa remise → ÉCRIT · K avec valide → refusé · K remise au nom de P → refusé ; 14-10a / 14-10b inchangés : demande magasin par K → ÉCRIT ·
--          affaire par K → refusé · entdoc par le bureau → ÉCRIT · registre inconnu → refusé.
-- Base sans 19-10vh : arrêt dès le début (« Passe d'abord… »), registre_set et registre_read non touchées.

-- ══ TEST de la partie PA (même règle pteq, passée seule le 20/10 sur 19-10vh) ══
-- ── TEST (20/10, Postgres 16 local ; base fictive : registre, profiles, aides is_active / is_admin / my_role / my_key, auth.uid() simulé par une table « whoami »,
-- puis retours_14-10a.sql, retours_14-10b.sql, retours_19-10vh.sql et ce fichier ; comptes FICTIFS : administrateur, chef, bureau, deux soudeurs K et P, un inactif).
-- Passé deux fois de suite (ré-exécutable) : les 4 lignes de contrôle à true. Résultats :
--   pteq · K écrit son constat (byKey = lui) → ÉCRIT · K complète son constat (photos, fusion) → ÉCRIT · K retire son constat (deleted) → ÉCRIT ·
--          K écrit un constat au nom de P → refusé · nouvelle ligne sans byKey → refusé · K en mode remplacement → refusé · P retouche le constat de K → refusé ·
--          P pose deleted sur le constat de K → refusé · P écrit son propre constat → ÉCRIT · chef retire le constat de P (deleted) → ÉCRIT · bureau écrit un constat → ÉCRIT ·
--          compte inactif → refusé ;
--   lecture (RLS, rôle authenticated) : K, P et le chef voient les 4 lignes pteq (un constat retiré reste une ligne « deleted », filtrée par l'appli) ;
--   19-10vh / 14-10a / 14-10b inchangés : remise vrec par K → ÉCRIT · affaire par K → refusé · entdoc par le bureau → ÉCRIT · registre inconnu → refusé.
-- Base sans 19-10vh : arrêt dès le début (« Passe d'abord… »), registre_set non touchée.
