-- RGPD · POSITIONS DES POINTAGES — 2/2 EFFACEMENT (26/11/2026). ⚠️ MODIFIE LES DONNÉES : à passer seulement quand tu le décides, après l'aperçu (1/2).
-- Ce qui change : la position (pos) des pointages de plus de 62 jours est retirée ; celles des 62 derniers jours sont arrondies à 3 décimales (≈ 100 m).
-- Ce qui NE change PAS : les heures, les pauses, les trajets, les chantiers, les validations et corrections — rien d'autre n'est touché.
-- Sauvegarde : Supabase garde une sauvegarde quotidienne (7 jours, offre Pro) ; une copie des lignes touchées est aussi faite ci-dessous (table pointages_pos_copie_2611).
-- Ré-exécutable (la 2e fois, il n'y a plus rien à faire).
begin;
create table if not exists public.pointages_pos_copie_2611 as select id, events, updated_at, now() as copie_le from public.pointages where false;
alter table public.pointages_pos_copie_2611 enable row level security; -- aucune politique : lisible seulement depuis le SQL Editor
insert into public.pointages_pos_copie_2611(id, events, updated_at, copie_le)
  select id, events, updated_at, now() from public.pointages
  where jsonb_typeof(events) = 'array' and events::text like '%"pos"%'
    and id not in (select id from public.pointages_pos_copie_2611);
update public.pointages p set
  events = (select coalesce(jsonb_agg(
      case when not (e ? 'pos') then e
           when p.d < current_date - 62 then e - 'pos'
           when jsonb_typeof(e->'pos') = 'array' and jsonb_array_length(e->'pos') >= 2
             then jsonb_set(e, '{pos}', jsonb_build_array(round((e->'pos'->>0)::numeric, 3), round((e->'pos'->>1)::numeric, 3)))
           else e end order by o), '[]'::jsonb)
    from jsonb_array_elements(p.events) with ordinality as t(e, o)),
  updated_at = now()
where jsonb_typeof(p.events) = 'array' and p.events::text like '%"pos"%'
  and (p.d < current_date - 62 or exists (select 1 from jsonb_array_elements(p.events) e
       where e ? 'pos' and (length(split_part(e->'pos'->>0, '.', 2)) > 3 or length(split_part(e->'pos'->>1, '.', 2)) > 3)));
commit;
-- contrôle : 0 position de plus de 62 jours, 0 position à plus de 3 décimales
select 'positions de plus de 62 jours restantes' as quoi, count(*)::text as nombre
  from public.pointages p, jsonb_array_elements(case when jsonb_typeof(p.events) = 'array' then p.events else '[]'::jsonb end) e where e ? 'pos' and p.d < current_date - 62
union all select 'positions à plus de 3 décimales restantes', count(*)::text
  from public.pointages p, jsonb_array_elements(case when jsonb_typeof(p.events) = 'array' then p.events else '[]'::jsonb end) e
  where e ? 'pos' and (length(split_part(e->'pos'->>0, '.', 2)) > 3 or length(split_part(e->'pos'->>1, '.', 2)) > 3)
union all select 'lignes copiées avant modification (pointages_pos_copie_2611)', count(*)::text from public.pointages_pos_copie_2611;
-- Plus tard, si tu veux que ce soit automatique (une fois par nuit), après avoir activé l'extension pg_cron (Database → Extensions) :
--   select cron.schedule('trace-positions-2-mois', '17 3 * * *', $c$ update public.pointages p set events = (select coalesce(jsonb_agg(case when e ? 'pos' then e - 'pos' else e end order by o), '[]'::jsonb) from jsonb_array_elements(p.events) with ordinality as t(e, o)), updated_at = now() where p.d < current_date - 62 and jsonb_typeof(p.events) = 'array' and p.events::text like '%"pos"%' $c$);
