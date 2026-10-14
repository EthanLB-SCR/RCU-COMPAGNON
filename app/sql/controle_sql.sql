-- CONTRÔLE DES SQL DE TRACÉ — LECTURE SEULE : ne modifie rien. Supabase → SQL Editor → New query → coller → Run.
-- Une ligne par script : ✅ passé / ❌ à passer (dans l'ordre des numéros). 24 lignes (14/10 : + retours_14-10a).
-- (13/10/2026) Marqueurs : fonctions et leur code, tables, colonnes, déclencheurs, politique, lignes importées. À TENIR À JOUR à chaque nouveau SQL : une colonne dans « k », une ligne dans « values ».
with fn as (
  select p.proname as n, string_agg(p.prosrc, ' ') as src, string_agg(pg_get_function_result(p.oid), ' ') as res
  from pg_proc p join pg_namespace s on s.oid = p.pronamespace where s.nspname = 'public' group by p.proname),
k as (select
  (to_regclass('public.profiles') is not null) and (to_regclass('public.sites') is not null) and (to_regclass('public.welds') is not null) and exists (select 1 from fn where n = 'is_active') as socle,
  (select count(*) from pg_publication_tables where pubname = 'supabase_realtime' and schemaname = 'public' and tablename in ('welds','sites')) = 2 as rt,
  exists (select 1 from information_schema.columns where table_schema = 'public' and table_name = 'profiles' and column_name = 'poste') and (to_regclass('public.invites') is not null) and exists (select 1 from pg_trigger where tgname = 'trace_on_auth_user_created' and not tgisinternal) and exists (select 1 from fn where n = 'invite_access') and exists (select 1 from fn where n = 'admin_set_profile') as acces,
  coalesce((select bool_or(position($m$elebihan@scr-soudure.fr$m$ in src) > 0) from fn where n = 'is_admin'), false) as admin,
  exists (select 1 from information_schema.columns where table_schema = 'public' and table_name = 'profiles' and column_name = 'admin') and (to_regclass('public.app_settings') is not null) and exists (select 1 from fn where n = 'admin_set_setting') as acces2,
  exists (select 1 from fn where n = 'my_role') and coalesce((select bool_or(res = 'jsonb') from fn where n = 'site_set_part'), false) as acces34,
  (to_regclass('public.site_versions') is not null) and exists (select 1 from pg_trigger where tgname = 'site_versions_keep' and not tgisinternal) and coalesce((select bool_or(position($m$savedAt$m$ in src) > 0) from fn where n = 'site_versions_keep'), false) as versions,
  (to_regclass('public.people') is not null) and (to_regclass('public.pointages') is not null) and exists (select 1 from fn where n = 'my_key') and exists (select 1 from fn where n = 'people_set_part') and exists (select 1 from fn where n = 'pointage_set') as espace1,
  (to_regclass('public.planning') is not null) and exists (select 1 from fn where n = 'planning_set') as espace2,
  (to_regclass('public.registre') is not null) and exists (select 1 from fn where n = 'registre_set') and coalesce((select bool_or(position($m$'missions'$m$ in src) > 0) from fn where n = 'site_set_part'), false) as nuit,
  (case when to_regclass('public.registre') is null then 0 else (xpath('/row/n/text()', query_to_xml($q$select count(*) as n from public.registre where kind = 'doc' and id = 'reglement_interieur'$q$, false, true, '')))[1]::text::int end) as reglement,
  (case when to_regclass('public.registre') is null then 0 else (xpath('/row/n/text()', query_to_xml($q$select count(*) as n from public.registre where kind = 'affaire'$q$, false, true, '')))[1]::text::int end) as affaires,
  (case when to_regclass('public.registre') is null then 0 else (xpath('/row/n/text()', query_to_xml($q$select count(*) as n from public.registre where kind = 'vehicule'$q$, false, true, '')))[1]::text::int end) as vehicules,
  (case when to_regclass('public.people') is null then 0 else (xpath('/row/n/text()', query_to_xml($q$select count(*) as n from public.people where data ? 'adresse'$q$, false, true, '')))[1]::text::int end) as rh,
  coalesce((select bool_or(position($m$'qhsig'$m$ in src) > 0) from fn where n = 'registre_set'), false) as r1010,
  coalesce((select bool_or(position($m$'prov'$m$ in src) > 0) from fn where n = 'registre_set'), false) and coalesce((select bool_or(position($m$'gdx'$m$ in src) > 0) from fn where n = 'registre_set'), false) and coalesce((select bool_or(position($m$'agenda'$m$ in src) > 0) from fn where n = 'registre_set'), false) as r1210,
  coalesce((select bool_or(position($m$'accident'$m$ in src) > 0) from fn where n = 'registre_set'), false) and coalesce((select bool_or(position($m$'outlook'$m$ in src) > 0) from fn where n = 'people_set_part'), false) as r1210b,
  coalesce((select bool_or(position($m$'fourniture'$m$ in src) > 0) from fn where n = 'site_set_part'), false) as four7,
  coalesce((select bool_or(position($m$'zones','dec'$m$ in src) > 0) from fn where n = 'site_set_part'), false) as four8,
  coalesce((select bool_or(position($m$'prix'$m$ in src) > 0) from fn where n = 'registre_set'), false) and coalesce((select bool_or(position($m$'prix'$m$ in coalesce(qual,'')) > 0) from pg_policies where schemaname = 'public' and tablename = 'registre' and policyname = 'registre_read'), false) as prix,
  (case when to_regclass('public.registre') is null then 0 else (xpath('/row/n/text()', query_to_xml($q$select count(*) as n from public.registre where kind = 'doc' and id like 'bloc\_mem\_%'$q$, false, true, '')))[1]::text::int end) as blocs,
  coalesce((select bool_or(position($m$'cpth'$m$ in src) > 0) from fn where n = 'registre_set'), false) and coalesce((select bool_or(position($m$'cpth'$m$ in coalesce(qual,'')) > 0) from pg_policies where schemaname = 'public' and tablename = 'registre' and policyname = 'registre_read'), false) as cpth,
  coalesce((select bool_or(position('can_prix' in src) > 0) from fn where n = 'registre_set'), false) and exists (select 1 from fn where n = 'can_prix') as prixdroit,
  coalesce((select bool_or(position('can_rh' in src) > 0) from fn where n = 'registre_set'), false) and exists (select 1 from fn where n = 'can_rh') and coalesce((select bool_or(position('can_rh' in coalesce(qual,'')) > 0) from pg_policies where schemaname = 'public' and tablename = 'registre' and policyname = 'registre_read'), false) as rhdroit,
  exists (select 1 from fn where n = 'annuaire_invites') as annuaire,
  exists (select 1 from fn where n = 'can_mag') and coalesce((select bool_or(position('magdem' in src) > 0) from fn where n = 'registre_set'), false) and coalesce((select bool_or(position('memlib' in coalesce(qual,'')) > 0) from pg_policies where schemaname = 'public' and tablename = 'registre' and policyname = 'registre_read'), false) as r1410a
)
select v.num as "n°", v.script as "SQL", case when v.ok then '✅ passé' else '❌ ' || v.quoi end as "état"
from k, lateral (values
  (1, 'socle d''août (comptes, chantiers, soudures)', k.socle, 'base de départ absente : ne rien passer, me prévenir'),
  (2, 'temps réel (soudures + chantiers)', k.rt, 'sans gravité : les autres appareils se mettent à jour toutes les 90 s au lieu de tout de suite'),
  (3, 'comptes_acces.sql', k.acces, 'à passer, puis admin_ethan.sql'),
  (4, 'admin_ethan.sql', k.admin, 'à passer'),
  (5, 'comptes_acces_v2.sql', k.acces2, 'à passer'),
  (6, 'comptes_acces_v3.sql + v4', k.acces34, 'passer v3 puis v4'),
  (7, 'versions_v2.sql', k.versions, 'à passer'),
  (8, 'espace_v1.sql', k.espace1, 'à passer'),
  (9, 'espace_v2.sql', k.espace2, 'à passer'),
  (10, 'nuit_v1.sql', k.nuit and k.reglement > 0, 'à passer'),
  (11, 'affaires_import_2026.sql', k.affaires >= 573, 'à passer (' || k.affaires || ' affaires en base, 573 attendues)'),
  (12, 'flotte_import_2026.sql', k.vehicules >= 146, 'à passer (' || k.vehicules || ' véhicules en base, 146 attendus)'),
  (13, 'rh_import_2026-10.sql', k.rh >= 99, 'à passer (' || k.rh || ' fiches avec adresse, 99 attendues)'),
  (14, 'retours_10-10.sql', k.r1010, 'à passer'),
  (15, 'retours_12-10.sql', k.r1210, 'à passer'),
  (16, 'retours_12-10b.sql', k.r1210b, 'à passer'),
  (17, 'retours_13-10c.sql (Fourniture, inclut 13-10)', k.four8, case when k.four7 then 'à passer (la version du matin, retours_13-10, est là ; il manque les écarts)' else 'à passer' end),
  (18, 'retours_13-10b.sql (prix + paniers)', k.prix, 'à passer'),
  (19, 'blocs_memoire_scr.sql (optionnel)', k.blocs >= 10, 'optionnel (' || k.blocs || ' blocs sur 10)'),
  (20, 'retours_13-10d.sql (compteurs d''heures)', k.cpth, 'à passer'),
  (21, 'retours_13-10e.sql (base de prix : droit « modifier »)', k.prixdroit, 'à passer (inclut 13-10d)'),
  (22, 'retours_13-10f.sql (contrats, compteurs, cas forcés : RH)', k.rhdroit, 'à passer (inclut 13-10e et 13-10d)'),
  (23, 'retours_13-10g.sql (annuaire : invités visibles de tous)', k.annuaire, 'à passer (seul ; indépendant de 13-10f)'),
  (24, 'retours_14-10a.sql (magasin, véhicules, lectures restreintes ; inclut 13-10f et 13-10g)', k.r1410a, 'à passer (il suffit : contient 13-10f et 13-10g)')
) v(num, script, ok, quoi)
order by v.num;
