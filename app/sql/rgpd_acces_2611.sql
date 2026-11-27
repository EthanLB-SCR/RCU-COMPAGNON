-- RGPD · ACCÈS AUX DONNÉES PERSONNELLES (26/11/2026) — à coller dans Supabase → SQL Editor → Run. Ré-exécutable. Ne supprime AUCUNE donnée.
-- ⚠️ À passer APRÈS avoir poussé l'appli du 26/11 (elle sait lire la partie « annuaire » des fiches par people_pub) et après retours_2411.sql.
--    Une appli plus ancienne continue de marcher : l'encadrement voit tout comme avant ; un compagnon ne verrait plus l'avatar / le téléphone de ses collègues
--    tant que son téléphone n'a pas rechargé la nouvelle version.
--
-- AVANT (constat du 25/11, lecture des règles du serveur) : tout compte actif — intérimaires et VISITEURS (client, MOE) compris — pouvait lire par l'API, même si
-- l'écran le cachait : les fiches de tout le monde (contact d'urgence, téléphone, contrat, compteurs, adresse, lien Outlook…), les pointages de tout le monde
-- (heures ET positions), les documents de l'entreprise (RIB compris), les signatures, les déclarations d'accident, les agendas ; et TOUS les chantiers.
-- Un visiteur pouvait aussi écrire (soudures, parties partagées des chantiers, registre) par l'API.
--
-- APRÈS :
--  · pointages : la personne (les siens) ; l'encadrement / bureau (rôle serveur chef ou bureau) ; la RH (droits rh.*) ; l'administrateur.
--  · fiches (people) : même règle (la personne, l'encadrement / bureau, la RH, l'administrateur) ; les AUTRES comptes de l'entreprise lisent seulement la partie
--    « annuaire » de leurs collègues par people_pub() : avatar, avatar du poste, secteur, téléphone. Les visiteurs : rien.
--  · registre : documents de l'entreprise (entdoc, RIB compris) = encadrement / bureau ; signatures (docsig, qhsig) = la personne + encadrement / bureau / RH ;
--    accidents = la personne qui déclare, les personnes concernées + encadrement / bureau / RH ; agendas et débours = la personne + encadrement / bureau ;
--    cas de déplacement forcé (gdx force|…) = la personne + encadrement / bureau / RH ; visiteurs : seulement les constats photo et contrôles des chantiers.
--  · chantiers (sites, versions, soudures) : un VISITEUR ne lit que ses « chantiers autorisés » (rien de changé pour les comptes de l'entreprise).
--  · visiteurs en LECTURE SEULE côté serveur : toute écriture d'un compte visiteur est refusée (chantiers, soudures, événements, registre, fiches, pointages).
-- Rien ne change pour l'administrateur, l'encadrement, le bureau et la RH.

-- ═════════ 1 · Fonctions d'aide ═════════
-- compte de l'entreprise (actif, pas visiteur)
create or replace function public.is_staff() returns boolean language sql stable security definer set search_path = public as $$
  select exists (select 1 from public.profiles p where p.id = auth.uid() and p.active and coalesce(p.type, 'salarie') <> 'visiteur');
$$;
-- compte visiteur (client, maître d'œuvre) — jamais l'administrateur
create or replace function public.is_visitor() returns boolean language sql stable security definer set search_path = public as $$
  select exists (select 1 from public.profiles p where p.id = auth.uid() and coalesce(p.type, '') = 'visiteur') and not public.is_admin();
$$;
-- encadrement / bureau (même règle que les fonctions d'écriture : administrateur ou rôle serveur chef / bureau)
create or replace function public.is_mgr() returns boolean language sql stable security definer set search_path = public as $$
  select public.is_admin() or (public.is_active() and coalesce(public.my_role(), '') in ('chef', 'bureau'));
$$;
-- un droit RH quelconque (voir, modifier, navettes, absences)
create or replace function public.can_rh_any() returns boolean language sql stable security definer set search_path = public as $$
  select public.can_rh('rh.voir') or public.can_rh('rh.edit') or public.can_rh('rh.nav') or public.can_rh('rh.abs');
$$;
-- chantier lisible : tout compte de l'entreprise ; un visiteur → ses chantiers autorisés (liste vide ou absente = tous, comme l'écran)
create or replace function public.site_lisible(p_site text) returns boolean language sql stable security definer set search_path = public as $$
  select public.is_admin() or exists (select 1 from public.profiles p where p.id = auth.uid() and p.active
    and (coalesce(p.type, 'salarie') <> 'visiteur' or p.sites is null or cardinality(p.sites) = 0 or p_site = any(p.sites)));
$$;
-- chantiers autorisés d'un VISITEUR (null = tous, comme l'écran) ; null aussi pour tout compte de l'entreprise (il n'est pas filtré)
create or replace function public.my_sites() returns text[] language sql stable security definer set search_path = public as $$
  select case when coalesce(p.type, 'salarie') = 'visiteur' and p.sites is not null and cardinality(p.sites) > 0 then p.sites else null end
  from public.profiles p where p.id = auth.uid();
$$;
-- ce que voit le compte connecté (l'appli s'en sert pour nettoyer ce que son appareil garde des autres)
create or replace function public.mon_acces() returns jsonb language sql stable security definer set search_path = public as $$
  select jsonb_build_object('v', 1, 'key', coalesce(public.my_key(), ''), 'admin', public.is_admin(), 'mgr', public.is_mgr(), 'rh', public.can_rh_any(),
    'staff', public.is_staff(), 'visiteur', public.is_visitor());
$$;
grant execute on function public.is_staff(), public.is_visitor(), public.is_mgr(), public.can_rh_any(), public.site_lisible(text), public.my_sites(), public.mon_acces() to authenticated;

-- ═════════ 2 · Pointages ═════════
drop policy if exists pointages_read on public.pointages;
-- (select f()) : la fonction est évaluée une fois par requête, pas une fois par ligne (performance)
create policy pointages_read on public.pointages for select using (
  (select public.is_admin()) or ((select public.is_active()) and (lower(p) = coalesce((select public.my_key()), '') or coalesce((select public.my_role()), '') in ('chef', 'bureau') or (select public.can_rh_any()))));

-- ═════════ 3 · Fiches personnes ═════════
drop policy if exists people_read on public.people;
create policy people_read on public.people for select using (
  (select public.is_admin()) or ((select public.is_active()) and (lower(key) = coalesce((select public.my_key()), '') or coalesce((select public.my_role()), '') in ('chef', 'bureau') or (select public.can_rh_any()))));
-- annuaire : la partie publique des fiches des collègues (comptes de l'entreprise seulement)
create or replace function public.people_pub(p_since timestamptz default null) returns table(key text, data jsonb, updated_at timestamptz)
language sql stable security definer set search_path = public as $$
  select x.key, jsonb_strip_nulls(jsonb_build_object('avatar', x.data->'avatar', 'poste_avatar', x.data->'poste_avatar', 'secteur', x.data->'secteur', 'tel', x.data->'tel')), x.updated_at
  from public.people x
  where public.is_staff() and (p_since is null or x.updated_at > p_since);
$$;
grant execute on function public.people_pub(timestamptz) to authenticated;

-- ═════════ 4 · Registre (même règle que retours_2411.sql + les restrictions du 26/11, marquées « 26/11 ») ═════════
drop policy if exists registre_read on public.registre;
create policy registre_read on public.registre for select using (
  (public.is_active() or public.is_admin())
  and (kind not in ('prix','panier') or public.is_admin() or coalesce(public.my_role(),'') in ('chef','bureau'))
  and (kind <> 'cpth' or public.is_admin() or public.can_rh('rh.voir') or public.can_rh('rh.edit') or public.can_rh('rh.nav') or lower(id) = coalesce(public.my_key(), ''))
  and (not (kind = 'doc' and id = 'memlib') or public.is_admin() or coalesce(public.my_role(),'') in ('chef','bureau'))
  and (kind <> 'vrec' or public.is_admin() or coalesce(public.my_role(),'') in ('chef','bureau') or lower(coalesce(data->>'conducteurKey','')) = coalesce(public.my_key(), '')
       or (data ? 'lache' and lower(coalesce(data->'a'->>'key','')) in ('', coalesce(public.my_key(), ''))))
  and (kind <> 'magdem' or public.is_admin() or coalesce(public.my_role(),'') in ('chef','bureau') or public.can_mag() or lower(split_part(id, '|', 1)) = coalesce(public.my_key(), ''))
  and (kind not in ('rhpv','rhform','rhmut') or public.is_admin() or public.can_rh('rh.voir') or public.can_rh('rh.edit') or lower(split_part(id, '|', 1)) = coalesce(public.my_key(), '') or lower(coalesce(data->>'pKey', '')) = coalesce(public.my_key(), ''))
  and (kind <> 'rhabs' or public.is_admin() or public.can_rh('rh.voir') or public.can_rh('rh.edit') or public.can_rh('rh.abs') or public.can_rh('rh.nav') or lower(split_part(id, '|', 1)) = coalesce(public.my_key(), '') or lower(coalesce(data->>'pKey', '')) = coalesce(public.my_key(), ''))
  and (kind not in ('afgrille','afnature','afdep','afaff','affac','afequip') or public.is_admin() or coalesce(public.my_role(),'') in ('chef','bureau'))
  and (kind not in ('navliss','navchoix') or public.is_admin() or public.can_rh('rh.voir') or public.can_rh('rh.edit') or public.can_rh('rh.nav') or lower(split_part(id, '|', 1)) = coalesce(public.my_key(), '')
       or (kind = 'navliss' and split_part(id, '|', 1) = 'tous'))
  and (kind <> 'retour' or public.is_admin() or lower(split_part(id, '|', 1)) = coalesce(public.my_key(), ''))
  and (kind <> 'rhdem' or public.is_admin() or public.can_rh('rh.voir') or public.can_rh('rh.edit') or public.can_rh('rh.abs') or public.can_rh('rh.nav') or lower(split_part(id, '|', 1)) = coalesce(public.my_key(), ''))
  -- 26/11 : documents de l'entreprise (assurances, Kbis, URSSAF, attestation fiscale, RIB…) = encadrement / bureau
  and (kind <> 'entdoc' or public.is_admin() or coalesce(public.my_role(),'') in ('chef','bureau'))
  -- 26/11 : signatures (documents à signer, quart d'heure sécurité ; id = <document ou séance>|<personne>) = la personne + encadrement / bureau / RH
  and (kind not in ('docsig','qhsig') or public.is_admin() or coalesce(public.my_role(),'') in ('chef','bureau') or (select public.can_rh_any()) or lower(split_part(id, '|', 2)) = coalesce(public.my_key(), ''))
  -- 26/11 : accidents = qui déclare, les personnes concernées (who), encadrement / bureau / RH
  and (kind <> 'accident' or public.is_admin() or coalesce(public.my_role(),'') in ('chef','bureau') or (select public.can_rh_any()) or lower(coalesce(data->>'byKey','')) = coalesce(public.my_key(), '')
       or (jsonb_typeof(data->'who') = 'array' and (data->'who') ? coalesce(public.my_key(), '')))
  -- 26/11 : agendas (Outlook) et débours (id = <personne>|…) = la personne + encadrement / bureau
  and (kind not in ('agenda','debours') or public.is_admin() or coalesce(public.my_role(),'') in ('chef','bureau') or lower(split_part(id, '|', 1)) = coalesce(public.my_key(), ''))
  -- 26/11 : cas de déplacement forcé d'une personne (gdx force|<personne>) = la personne + encadrement / bureau / RH ; le barème reste lisible
  and (not (kind = 'gdx' and id like 'force|%') or public.is_admin() or coalesce(public.my_role(),'') in ('chef','bureau') or (select public.can_rh_any()) or lower(split_part(id, '|', 2)) = coalesce(public.my_key(), ''))
  -- 26/11 : visiteurs (client, MOE) = seulement les constats photo et les contrôles
  and (not (select public.is_visitor()) or kind in ('pteq','controle'))
);

-- ═════════ 5 · Chantiers : un visiteur ne lit que ses chantiers autorisés ═════════
drop policy if exists sites_read on public.sites;
create policy sites_read on public.sites for select to authenticated using ((select public.is_active()) and ((select public.is_staff()) or (select public.is_admin()) or (select public.my_sites()) is null or id = any(coalesce((select public.my_sites()), array[]::text[]))));
do $$ begin
  if to_regclass('public.site_versions') is not null then
    execute 'drop policy if exists site_versions_read on public.site_versions';
    execute 'create policy site_versions_read on public.site_versions for select using (((select public.is_active()) or (select public.is_admin())) and ((select public.is_staff()) or (select public.is_admin()) or (select public.my_sites()) is null or site_id = any(coalesce((select public.my_sites()), array[]::text[]))))';
  end if;
  if to_regclass('public.welds') is not null and exists (select 1 from information_schema.columns where table_schema = 'public' and table_name = 'welds' and column_name = 'site_id') then
    execute 'drop policy if exists welds_read on public.welds';
    execute 'create policy welds_read on public.welds for select to authenticated using ((select public.is_active()) and ((select public.is_staff()) or (select public.is_admin()) or (select public.my_sites()) is null or site_id = any(coalesce((select public.my_sites()), array[]::text[]))))';
  end if;
end $$;

-- ═════════ 6 · Visiteurs en lecture seule côté serveur ═════════
-- (a) tables écrites directement par l'appli : soudures et événements = comptes de l'entreprise
do $$ begin
  if to_regclass('public.welds') is not null then
    execute 'drop policy if exists welds_ins on public.welds';
    execute 'create policy welds_ins on public.welds for insert to authenticated with check (public.is_active() and not public.is_visitor())';
    execute 'drop policy if exists welds_upd on public.welds';
    execute 'create policy welds_upd on public.welds for update to authenticated using (public.is_active() and not public.is_visitor()) with check (public.is_active() and not public.is_visitor())';
  end if;
  if to_regclass('public.events') is not null then
    execute 'drop policy if exists ev_ins on public.events';
    execute 'create policy ev_ins on public.events for insert to authenticated with check (public.is_active() and not public.is_visitor())';
  end if;
end $$;
-- (b) tout ce qui passe par les fonctions du serveur (parties de chantier, registre, fiches, pointages) : un déclencheur refuse l'écriture d'un visiteur
create or replace function public.trace_lecture_seule_visiteur() returns trigger language plpgsql security definer set search_path = public as $$
begin
  if public.is_visitor() then raise exception 'compte visiteur : lecture seule'; end if;
  if tg_op = 'DELETE' then return old; end if;
  return new;
end $$;
do $$ declare t text; begin
  foreach t in array array['sites','registre','people','pointages','welds','events'] loop
    if to_regclass('public.' || t) is not null then
      execute format('drop trigger if exists trace_lecture_seule_visiteur on public.%I', t);
      execute format('create trigger trace_lecture_seule_visiteur before insert or update or delete on public.%I for each row execute function public.trace_lecture_seule_visiteur()', t);
    end if;
  end loop;
end $$;

-- ═════════ 7 · Vérification (lecture seule) ═════════
select 'fonctions' as objet, count(*)::text as valeur from pg_proc where proname in ('is_staff','is_visitor','is_mgr','can_rh_any','site_lisible','my_sites','mon_acces','people_pub','trace_lecture_seule_visiteur')
union all select 'politique pointages_read (26/11)', (position('can_rh_any' in pg_get_expr(polqual, polrelid)) > 0)::text from pg_policy where polname = 'pointages_read'
union all select 'politique people_read (26/11)', (position('can_rh_any' in pg_get_expr(polqual, polrelid)) > 0)::text from pg_policy where polname = 'people_read'
union all select 'politique registre_read (26/11)', (position('entdoc' in pg_get_expr(polqual, polrelid)) > 0)::text from pg_policy where polname = 'registre_read'
union all select 'politique sites_read (26/11)', (position('my_sites' in pg_get_expr(polqual, polrelid)) > 0)::text from pg_policy where polname = 'sites_read'
union all select 'déclencheurs visiteur', count(*)::text from pg_trigger where tgname = 'trace_lecture_seule_visiteur'
union all select 'comptes visiteurs actifs sans chantier coché (voient tous les chantiers)', count(*)::text from public.profiles where coalesce(type,'') = 'visiteur' and active and (sites is null or cardinality(sites) = 0);
