-- TRACÉ — 04-05/11 — PRODUCTION DISPARUE (Nantes) — 1/2 : APERÇU. LECTURE SEULE, rien n'est modifié. Période : depuis le 04/11 (2 jours).
-- Supabase → SQL Editor → coller → Run. Si le nom du chantier ne contient pas « nantes », remplace NANTES par un morceau de son nom (1 endroit).
-- Une ligne par étape validée depuis le 04/11 d'après le journal du serveur (table events : chaque « Étape n/4 validée » y est notée, avec qui et l'heure),
-- et si la soudure l'a encore. « NON — perdue » en premier : c'est la production qui a disparu. Aucune ligne pour quelqu'un = rien de lui n'est arrivé au serveur.
with s as (select id from sites where name ilike '%NANTES%'),
j as (select distinct on (e.site_id, e.weld_id, e.type) e.site_id, e.weld_id, e.type, e.by_user, e.created_at
      from events e join s on s.id = e.site_id
      where e.created_at >= '2026-11-04 00:00:00+01'::timestamptz
        and e.type in ('etape1','etape2','etape3','etape4')
      order by e.site_id, e.weld_id, e.type, e.created_at desc)
select j.by_user as qui, j.weld_id as soudure, j.type as etape,
       to_char(j.created_at at time zone 'Europe/Paris', 'DD/MM HH24:MI') as heure,
       coalesce(w.status, '(pas de ligne)') as etat_actuel,
       case when coalesce((w.data->'steps'->substr(j.type,6)->>'done')::boolean, false) then 'oui'
            when exists (select 1 from events u where u.site_id = j.site_id and u.weld_id = j.weld_id and u.type = 'annule_etape'||substr(j.type,6) and u.created_at > j.created_at) then 'annulée ensuite (normal)'
            else 'NON — perdue' end as encore_dans_la_soudure
from j left join welds w on w.site_id = j.site_id and w.weld_id = j.weld_id
order by (case when coalesce((w.data->'steps'->substr(j.type,6)->>'done')::boolean, false) then 1 else 0 end), j.created_at;
