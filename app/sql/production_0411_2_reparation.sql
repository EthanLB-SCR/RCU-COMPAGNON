-- TRACÉ — 04-05/11 — PRODUCTION DISPARUE (Nantes) — 2/2 : RÉPARATION (période : depuis le 04/11). À passer APRÈS avoir relu l'aperçu (1/2).
-- Remet dans chaque soudure les étapes que le journal du serveur a notées depuis le 04/11 et qu'elle n'a plus (jamais une étape annulée ensuite) (qui, heure ; marquées « restored »).
-- Ne touche à rien d'autre : une étape encore présente n'est jamais modifiée, les photos déjà sur l'étape restent, l'état ne recule jamais
-- (étape 1 → au moins « soudée », étape 3 → « manchonnée »). Ré-exécutable sans doublon. Remplace NANTES comme dans l'aperçu.
with s as (select id from sites where name ilike '%NANTES%'),
j as (select distinct on (e.site_id, e.weld_id, e.type) e.site_id, e.weld_id, substr(e.type,6) as n, e.by_user, e.created_at
      from events e join s on s.id = e.site_id
      where e.created_at >= '2026-11-04 00:00:00+01'::timestamptz
        and e.type in ('etape1','etape2','etape3','etape4')
      order by e.site_id, e.weld_id, e.type, e.created_at desc),
manque as (select j.* from j join welds w on w.site_id = j.site_id and w.weld_id = j.weld_id
           where not coalesce((w.data->'steps'->j.n->>'done')::boolean, false)
             and not exists (select 1 from events u where u.site_id = j.site_id and u.weld_id = j.weld_id and u.type = 'annule_etape'||j.n and u.created_at > j.created_at)),
agg as (select site_id, weld_id,
               jsonb_object_agg(n, jsonb_build_object('done', true, 'by', by_user,
                 'at', to_char(created_at at time zone 'UTC', 'YYYY-MM-DD"T"HH24:MI:SS.MS"Z"'), 'restored', 'journal 04/11')) as add,
               max(case n when '3' then 3 when '1' then 1 else 0 end) as rang
        from manque group by site_id, weld_id)
update welds w set
  data = jsonb_set(coalesce(w.data, '{}'::jsonb), '{steps}',
           coalesce(w.data->'steps', '{}'::jsonb)
           || (select jsonb_object_agg(t.k, coalesce(w.data->'steps'->t.k, '{"photos":[]}'::jsonb) || t.v) from jsonb_each(a.add) as t(k, v))),
  status = case when a.rang = 3 and w.status in ('a_souder','soudee','controlee') then 'manchonnee'
                when a.rang >= 1 and w.status = 'a_souder' then 'soudee'
                else w.status end,
  updated_at = now()
from agg a
where w.site_id = a.site_id and w.weld_id = a.weld_id
returning w.weld_id as soudure, w.status as etat, (select string_agg(k, ',') from jsonb_object_keys(a.add) k) as etapes_remises;
