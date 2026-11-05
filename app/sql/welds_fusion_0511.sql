-- TRACÉ — 05/11 — SOUDURES : UNE COPIE ANCIENNE N'EFFACE PLUS UNE DÉCLARATION (fusion côté serveur). À coller dans Supabase → SQL Editor → Run. Une fois. Ré-exécutable.
-- Pourquoi : chaque appareil renvoie la soudure ENTIÈRE. Un téléphone resté sur une vieille copie (réseau coupé, appli restée ouverte) qui touchait ensuite la soudure
-- effaçait ce qu'un autre avait déclaré entre-temps (étapes, déclarations, photos) → production perdue.
-- Maintenant : l'appli envoie la date de la version qu'elle avait (_base). Si personne n'a écrit depuis : enregistré tel quel (annulations comprises).
-- Si quelqu'un a écrit depuis : FUSION — déclarations et photos additionnées, une étape faite reste faite (deux faites : la plus récente), l'avancement ne recule pas
-- (soudée < contrôlée < manchonnée ; « à reprendre » : la déclaration la plus récente), les autres champs (fils, isolement, note…) : ceux de l'appareil qui enregistre
-- s'il les a, sinon ceux du serveur. Les écritures sans _base (ancienne version de l'appli, SQL à la main) : comme avant. La date de mise à jour est celle du serveur.
create or replace function public.welds_fusion() returns trigger language plpgsql as $$
declare n jsonb; o jsonb; base timestamptz; ev jsonb; ph jsonb; st jsonb; k text; sn jsonb; so jsonb; ro int; rn int; olast text; nlast text; reste jsonb;
begin
  n := coalesce(NEW.data, '{}'::jsonb);
  NEW.updated_at := now();
  if TG_OP = 'INSERT' then
    if exists (select 1 from public.welds w where w.site_id = NEW.site_id and w.weld_id = NEW.weld_id) then return NEW; end if; -- envoi « upsert » sur une soudure existante : _base gardée pour la mise à jour qui suit
    NEW.data := n - '_base'; return NEW;
  end if;
  if not (n ? '_base') then return NEW; end if;
  NEW.data := n - '_base';
  base := nullif(n->>'_base', '')::timestamptz;
  if base is not null and OLD.updated_at is not null and OLD.updated_at <= base then return NEW; end if;
  o := coalesce(OLD.data, '{}'::jsonb); n := NEW.data;
  select coalesce(jsonb_agg(x.e order by x.e->>'at'), '[]'::jsonb) into ev from (
    select distinct on (coalesce(e->>'type','')||'|'||coalesce(e->>'at','')||'|'||coalesce(e->>'by','')) e
    from jsonb_array_elements(case when jsonb_typeof(o->'events')='array' then o->'events' else '[]'::jsonb end || case when jsonb_typeof(n->'events')='array' then n->'events' else '[]'::jsonb end) e
    order by coalesce(e->>'type','')||'|'||coalesce(e->>'at','')||'|'||coalesce(e->>'by',''), jsonb_array_length(case when jsonb_typeof(e->'photos')='array' then e->'photos' else '[]'::jsonb end) desc) x;
  select coalesce(jsonb_agg(y.p), '[]'::jsonb) into ph from (select distinct p from jsonb_array_elements(case when jsonb_typeof(o->'photos')='array' then o->'photos' else '[]'::jsonb end || case when jsonb_typeof(n->'photos')='array' then n->'photos' else '[]'::jsonb end) p) y;
  st := case when jsonb_typeof(o->'steps')='object' then o->'steps' else '{}'::jsonb end;
  if jsonb_typeof(n->'steps')='object' then
    for k, sn in select key, value from jsonb_each(n->'steps') loop
      so := st->k;
      if so is null or jsonb_typeof(so)<>'object' or not coalesce((so->>'done')::boolean, false) then st := jsonb_set(st, array[k], sn);
      elsif jsonb_typeof(sn)='object' and coalesce((sn->>'done')::boolean, false) and coalesce(sn->>'at','') > coalesce(so->>'at','') then st := jsonb_set(st, array[k], sn);
      end if;
    end loop;
  end if;
  select max(e->>'at') into olast from jsonb_array_elements(case when jsonb_typeof(o->'events')='array' then o->'events' else '[]'::jsonb end) e;
  select max(e->>'at') into nlast from jsonb_array_elements(case when jsonb_typeof(n->'events')='array' then n->'events' else '[]'::jsonb end) e;
  if coalesce(OLD.status,'') = 'a_reprendre' or coalesce(NEW.status,'') = 'a_reprendre' then
    if coalesce(olast,'') > coalesce(nlast,'') then NEW.status := OLD.status; end if;
  else
    ro := case OLD.status when 'soudee' then 1 when 'controlee' then 2 when 'manchonnee' then 3 else 0 end;
    rn := case NEW.status when 'soudee' then 1 when 'controlee' then 2 when 'manchonnee' then 3 else 0 end;
    if ro > rn then NEW.status := OLD.status; end if;
  end if;
  select coalesce(jsonb_object_agg(key, value), '{}'::jsonb) into reste from jsonb_each(o) where key not in ('events','photos','steps','_base','_fusion') and (not (n ? key) or n->key = 'null'::jsonb or n->key = '""'::jsonb);
  NEW.data := n || reste || jsonb_build_object('events', ev, 'photos', ph, '_fusion', to_char(now() at time zone 'UTC', 'YYYY-MM-DD"T"HH24:MI:SS"Z"'))
              || case when (o->'steps') is null and (n->'steps') is null then '{}'::jsonb else jsonb_build_object('steps', st) end;
  return NEW;
end $$;
drop trigger if exists welds_fusion on public.welds;
create trigger welds_fusion before insert or update on public.welds for each row execute function public.welds_fusion();
-- contrôle : doit afficher « welds_fusion »
select tgname from pg_trigger where tgrelid = 'public.welds'::regclass and tgname = 'welds_fusion';
