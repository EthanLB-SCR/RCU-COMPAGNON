-- TRACÉ — 05/11 soir — NUMÉROS EN DOUBLE (Nantes). Une soudure du PLAN porte le numéro d'une soudure AJOUTÉE sur place (S-0517 / S-0518, données le 02/11,
-- redonnés par la modif du plan du 03/11 avant le correctif) → l'avancement de l'une s'affichait sur l'autre. Ici : la soudure du PLAN reçoit un numéro neuf,
-- le numéro et tout son avancement reviennent à la soudure ajoutée. Rien n'est effacé : aucune ligne de soudure touchée, le plan d'avant est gardé dans ⏱ Versions.
-- Ne touche pas une soudure ajoutée déjà intégrée au plan (même ligne, même côté, à 0,50 m près). Ré-exécutable. Remplace NANTES si besoin (1 endroit).
with s as (select id, data from sites where name ilike '%NANTES%'),
ex as (select s.id as site_id, x->>'weldId' as weld_id, x->>'line' as line, x->>'cond' as cond, (x->>'m')::numeric as m
       from s, jsonb_array_elements(case when jsonb_typeof(s.data->'extraWelds') = 'array' then s.data->'extraWelds' else '[]'::jsonb end) x
       where not coalesce((x->>'del')::boolean, false) and coalesce(x->>'weldId', '') <> ''),
pl as (select s.id as site_id, l->>'id' as line, cc.key as cond, w->>'weldId' as weld_id, (w->>'m')::numeric as m
       from s, jsonb_array_elements(s.data->'lines') l, jsonb_each(case when jsonb_typeof(l->'cond') = 'object' then l->'cond' else '{}'::jsonb end) cc,
            jsonb_array_elements(case when jsonb_typeof(cc.value->'welds') = 'array' then cc.value->'welds' else '[]'::jsonb end) w),
clash as (select distinct pl.site_id, pl.line, pl.cond, pl.weld_id from pl join ex on ex.site_id = pl.site_id and ex.weld_id = pl.weld_id
          where not (ex.line = pl.line and ex.cond = pl.cond and abs(coalesce(ex.m, -1e9) - coalesce(pl.m, 1e9)) <= 0.5)),
mx as (select greatest(
         coalesce((select max(nullif(regexp_replace(weld_id, '\D', '', 'g'), '')::int) from pl), 0),
         coalesce((select max(nullif(regexp_replace(x->>'weldId', '\D', '', 'g'), '')::int) from s, jsonb_array_elements(case when jsonb_typeof(s.data->'extraWelds') = 'array' then s.data->'extraWelds' else '[]'::jsonb end) x), 0),
         coalesce((select max(nullif(regexp_replace(w.weld_id, '\D', '', 'g'), '')::int) from welds w join s on s.id = w.site_id), 0)) as m),
nv as (select c.*, 'S-' || lpad((mx.m + row_number() over (order by c.weld_id, c.line, c.cond))::text, 4, '0') as nouveau from clash c, mx)
update sites t set data = jsonb_set(t.data, '{lines}', (
  select jsonb_agg(case when jsonb_typeof(l->'cond') = 'object' then l || jsonb_build_object('cond', (
      select jsonb_object_agg(cc.key, case when jsonb_typeof(cc.value->'welds') = 'array' then jsonb_set(cc.value, '{welds}', (
          select jsonb_agg(case when n.nouveau is not null then jsonb_set(w, '{weldId}', to_jsonb(n.nouveau)) else w end order by o)
          from jsonb_array_elements(cc.value->'welds') with ordinality q(w, o)
          left join nv n on n.site_id = t.id and n.line = l->>'id' and n.cond = cc.key and n.weld_id = w->>'weldId'))
        else cc.value end) from jsonb_each(l->'cond') cc))
    else l end order by lo) from jsonb_array_elements(t.data->'lines') with ordinality z(l, lo)))
from s where t.id = s.id and exists (select 1 from nv where nv.site_id = t.id)
returning (select string_agg(n.weld_id || ' (plan ' || n.line || ' ' || n.cond || ') → ' || n.nouveau, ' · ') from nv n where n.site_id = t.id) as renumerotees;
