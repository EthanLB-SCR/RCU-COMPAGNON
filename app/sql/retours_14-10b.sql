-- RETOURS DU 14/10/2026 (b) — DOCUMENTS ADMINISTRATIFS DE L'ENTREPRISE (registre « entdoc »).
-- 14/10 après-midi (lot D) : les documents de l'entreprise déposés UNE fois dans l'appli (SCR → « Documents administratifs (offres) ») et joints aux offres
-- (7 · Offre → Documents obligatoires, dossier de remise .zip) : attestations d'assurance RC et décennale, Kbis, URSSAF, attestation fiscale, RIB,
-- qualifications, autres. Ligne : id = type (assurance_rc, assurance_decennale, kbis, urssaf, fiscale, rib, qualification, autre_<…>),
-- data = {type, title, file, url, data, validUntil, assureur, police, garanties, at, by…} — lue aussi par le mémoire technique (garanties d'assurance).
--  · écriture : administrateur et comptes « bureau / encadrement » (rôle serveur chef ou bureau — même règle que les affaires et les documents) ;
--  · lecture : tout compte actif (la politique registre_read ne change pas : aucune restriction pour « entdoc »).
-- À passer APRÈS retours_14-10a.sql (vérifié ci-dessous). Seule la fonction registre_set est redéfinie, EN ENTIER : celle de retours_14-10a.sql + « entdoc ».
-- À coller dans Supabase → SQL Editor → Run. Ré-exécutable.
-- Testé sur un Postgres local (base copiée de celle qui a reçu 14-10a) : voir le bloc de test à la fin de ce fichier (commentaires).
do $$ begin
  if to_regprocedure('public.can_mag()') is null then raise exception 'Passe d''abord sql/retours_14-10a.sql, puis ce fichier (retours_14-10b.sql).'; end if;
end $$;

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
  elsif p_kind = 'entdoc' then -- 14/10 (b) : documents administratifs de l'entreprise (assurances RC / décennale, Kbis, URSSAF, attestation fiscale, RIB, qualifications…) = administrateur / bureau
    if not mgr then raise exception 'documents de l''entreprise : réservé à l''administrateur / au bureau'; end if;
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

-- contrôle (chaque ligne doit dire « true »)
select 'registre_set : documents de l''entreprise (entdoc)' as objet, (position('entdoc' in pg_get_functiondef('public.registre_set(text,text,jsonb,text)'::regprocedure)) > 0) as ok
union all select 'registre_set : magasin et véhicules (14-10a) toujours là', (position('magdem' in pg_get_functiondef('public.registre_set(text,text,jsonb,text)'::regprocedure)) > 0 and position('vrec' in pg_get_functiondef('public.registre_set(text,text,jsonb,text)'::regprocedure)) > 0)
union all select 'registre_read : lecture de « entdoc » non restreinte (tout compte actif)', (select position('entdoc' in coalesce(qual,'')) = 0 from pg_policies where schemaname = 'public' and tablename = 'registre' and policyname = 'registre_read');

-- ── TEST (14/10 après-midi, Postgres 16 local, base copiée de celle qui a reçu retours_14-10a.sql ; auth.uid() simulé par une table « whoami ») ──
-- Passé deux fois de suite (ré-exécutable) : les 3 lignes de contrôle à true. Écritures registre_set('entdoc', …) :
--   administrateur → ÉCRIT · bureau (chargé d'affaires) → ÉCRIT · rôle chef → ÉCRIT · soudeur → refusé (réservé à l'administrateur / au bureau) ·
--   référent magasin (rôle soudeur) → refusé · compte inactif → refusé (compte inactif) · suppression douce puis remise en place (null retire la clé) → ÉCRIT.
-- 14-10a inchangé : demande magasin du soudeur → ÉCRIT, affaire par un soudeur → refusé, catalogue par le référent magasin → ÉCRIT, registre inconnu → refusé.
-- Lecture (RLS, rôle authenticated) : administrateur, bureau, soudeur, référent magasin lisent les 3 documents ; compte inactif : 0.
-- Base sans 14-10a : arrêt dès le début (« Passe d'abord sql/retours_14-10a.sql… »), registre_set non touchée.
