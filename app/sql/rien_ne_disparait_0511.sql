-- TRACÉ — 05/11 soir — RIEN NE DISPARAÎT (soudures ajoutées, retirées, coulissées). Supabase → SQL Editor → coller TOUT → Run. Ré-exécutable.
-- Doit afficher : ajoutees_ok = true, garde_ok = true.
-- 1) site_set_part : la liste des soudures ajoutées est RÉUNIE (par numéro) au lieu d'être remplacée → un téléphone resté sur une vieille liste n'efface plus
--    les soudures ajoutées par un autre. Un retrait = del:true (la plus récente gagne), jamais un effacement.
-- 2) Garde sur la table sites : un enregistrement complet du chantier (Concepteur, ancienne appli) ne peut plus faire disparaître une soudure ajoutée,
--    retirée ou coulissée : les listes sont réunies avec celles du serveur. Remise à zéro volontaire : « set local trace.efface = 'oui'; » dans la même transaction.
do $$
declare d text;
begin
  d := pg_get_functiondef('public.site_set_part(text,text,jsonb)'::regprocedure);
  if position('elsif p_key = ''extraWelds'' then' in d) > 0 then raise notice 'site_set_part : déjà fait'; return; end if;
  if position('elsif p_key = ''undoLog'' then' in d) = 0 then raise exception 'site_set_part : version inattendue — rien n''a été modifié, préviens Claude'; end if;
  d := replace(d, 'elsif p_key = ''undoLog'' then', $b$elsif p_key = 'extraWelds' then
    select coalesce(jsonb_agg(e order by coalesce(e->>'at',''), coalesce(e->>'weldId','')), '[]'::jsonb) into v_new
    from (
      select distinct on (coalesce(nullif(e->>'weldId',''), md5(e::text))) e from (
        select e from jsonb_array_elements(case when jsonb_typeof(v_old) = 'array' then v_old else '[]'::jsonb end) e
        union all
        select e from jsonb_array_elements(case when jsonb_typeof(p_value) = 'array' then p_value else '[]'::jsonb end) e
      ) t order by coalesce(nullif(e->>'weldId',''), md5(e::text)), coalesce(e->>'upd', e->>'at', '') desc
    ) u;

  elsif p_key = 'undoLog' then$b$);
  execute d;
end $$;

create or replace function public.sites_keep_parts() returns trigger language plpgsql as $$
declare k text; idk text; v jsonb;
begin
  if current_setting('trace.efface', true) = 'oui' then return NEW; end if;
  if OLD.data is null or NEW.data is null then return NEW; end if;
  foreach k in array array['extraWelds','removedWelds','weldSlides'] loop
    if coalesce(jsonb_typeof(OLD.data->k), '') <> 'array' or jsonb_array_length(OLD.data->k) = 0 then continue; end if;
    idk := case when k = 'weldSlides' then 'id' else 'weldId' end;
    select coalesce(jsonb_agg(e order by coalesce(e->>'at',''), coalesce(e->>idk,'')), '[]'::jsonb) into v from (
      select distinct on (coalesce(nullif(e->>idk,''), md5(e::text))) e from (
        select e from jsonb_array_elements(OLD.data->k) e
        union all
        select e from jsonb_array_elements(case when jsonb_typeof(NEW.data->k) = 'array' then NEW.data->k else '[]'::jsonb end) e
      ) t order by coalesce(nullif(e->>idk,''), md5(e::text)), coalesce(e->>'upd', e->>'at', '') desc
    ) u;
    NEW.data := jsonb_set(NEW.data, array[k], v, true);
  end loop;
  return NEW;
end $$;
drop trigger if exists sites_keep_parts on public.sites;
create trigger sites_keep_parts before update of data on public.sites for each row execute function public.sites_keep_parts();

select
  position('elsif p_key = ''extraWelds'' then' in pg_get_functiondef('public.site_set_part(text,text,jsonb)'::regprocedure)) > 0 as ajoutees_ok,
  exists (select 1 from pg_trigger where tgrelid = 'public.sites'::regclass and tgname = 'sites_keep_parts' and not tgisinternal) as garde_ok;
