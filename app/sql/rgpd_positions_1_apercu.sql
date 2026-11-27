-- RGPD · POSITIONS DES POINTAGES — 1/2 APERÇU (26/11/2026). LECTURE SEULE : ne modifie rien. À coller dans Supabase → SQL Editor → Run.
-- Depuis l'appli du 26/11, la position prise au pointage (début / fin de journée, départ / arrivée d'un trajet) est arrondie à ≈ 100 m (3 décimales).
-- Les pointages d'avant gardent ≈ 1 m (5 décimales). Durée de conservation retenue : 2 mois (CNIL, géolocalisation des salariés).
-- Cet aperçu compte ce que ferait 2/2 (rgpd_positions_2_purge.sql) : effacer la position des pointages de plus de 62 jours (les heures restent),
-- arrondir à 3 décimales celles des 62 derniers jours.
with ev as (
  select p.id, p.d, e
  from public.pointages p, jsonb_array_elements(case when jsonb_typeof(p.events) = 'array' then p.events else '[]'::jsonb end) e
  where e ? 'pos')
select 'pointages (jours) avec au moins une position' as quoi, count(distinct id)::text as nombre from ev
union all select 'positions de plus de 62 jours (seraient effacées, heures gardées)', count(*)::text from ev where d < current_date - 62
union all select 'positions des 62 derniers jours (seraient arrondies à ≈ 100 m)', count(*)::text from ev where d >= current_date - 62
union all select 'dont déjà à 3 décimales ou moins', count(*)::text from ev where d >= current_date - 62
  and length(split_part(e->'pos'->>0, '.', 2)) <= 3 and length(split_part(e->'pos'->>1, '.', 2)) <= 3
union all select 'plus ancien jour avec une position', coalesce(min(d)::text, '—') from ev;
