-- TRACÉ — 05/11 — SQL DES 04-05/11, À PASSER EN UNE FOIS. Supabase → SQL Editor → coller TOUT le fichier → Run. Ré-exécutable sans risque.
-- Doit afficher UNE ligne : fusion_ok = true, retrait_ok = true.
-- 1) Fusion serveur des soudures (= welds_fusion_0511.sql, inclus ici : déjà passé ou pas, aucun souci).
-- 2) site_set_part accepte « removedWelds » : sans ça, ✂ Retirer une soudure depuis le téléphone est refusé par le serveur (« partie inconnue ») et ne part pas
--    au bureau ni sur les autres téléphones. Reprend la version du 30/10 (retours_30-10.sql) à l'identique, + cette partie (réunie par numéro de soudure).
-- Pas dans ce fichier (à part, seulement si besoin) : production_0411_1_apercu.sql (lecture seule) puis production_0411_2_reparation.sql.

-- ── 1) FUSION SERVEUR DES SOUDURES ───────────────────────────────────────────────────────────────────────────────────────
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

-- ── 2) site_set_part + « removedWelds » ──────────────────────────────────────────────────────────────────────────────────
create or replace function public.site_set_part(p_site text, p_key text, p_value jsonb) returns jsonb
language plpgsql security definer set search_path = public as $$
declare t_at timestamptz := now(); v_old jsonb; v_new jsonb; v_arr jsonb; v_k text;
begin
  if not public.is_active() then raise exception 'compte inactif'; end if;
  if p_key in ('conv','stock','extraWelds','removedWelds','weldSlides','qse','pointage','undoLog','dhData') then -- 21/10 : + weldSlides ; 05/11 : + removedWelds (soudures retirées sur place, ✂ Retirer)
    null; -- tout compte actif
  elsif p_key in ('elPos','hydro','phasage','ts','marche','modifs','admin','dossier','fiche','missions','fourniture') then -- 30/10 : + modifs (éléments attribués, lot 2910b) — refusée jusqu'ici (« partie inconnue ») -- missions (v6) : objectifs de la journée ; fourniture (v7, 13/10) : commande, pièces en plus, zones à livrer
    if not (public.is_admin() or coalesce(public.my_role(),'') in ('chef','bureau')) then raise exception 'réservé au chef / bureau'; end if;
  else
    raise exception 'partie inconnue : %', p_key;
  end if;

  select data->p_key into v_old from public.sites where id = p_site for update;
  if not found then return null; end if; -- chantier pas encore sur le serveur : l'appli fait un enregistrement complet

  if p_key = 'elPos' then
    v_new := (case when jsonb_typeof(v_old) = 'object' then v_old else '{}'::jsonb end)
          || (case when jsonb_typeof(p_value) = 'object' then p_value else '{}'::jsonb end);

  elsif p_key = 'missions' then -- fusion par jour : un jour écrit remplace ce jour, les autres jours restent (deux encadrants sur deux jours ne s'écrasent pas)
    v_new := (case when jsonb_typeof(v_old) = 'object' then v_old else '{}'::jsonb end)
          || (case when jsonb_typeof(p_value) = 'object' then p_value else '{}'::jsonb end);

  elsif p_key = 'fourniture' then -- v7 (13/10) / v8 (13/10 soir) : commandes, pièces en plus, zones et qualifications des écarts RÉUNIES par id (la version la plus récente par `upd` gagne) — deux tablettes ne s'écrasent pas ; le reste (tracé initial, hypothèses) = dernière écriture
    v_new := coalesce(case when jsonb_typeof(p_value) = 'object' then p_value end, case when jsonb_typeof(v_old) = 'object' then v_old end, '{}'::jsonb);
    foreach v_k in array array['cmds','extra','zones','dec'] loop -- v8 (13/10 soir) : + dec = qualifications des écarts
      select coalesce(jsonb_agg(e order by coalesce(e->>'at',''), e->>'id'), '[]'::jsonb) into v_arr
      from (
        select distinct on (e->>'id') e from (
          select e from jsonb_array_elements(case when jsonb_typeof(v_old->v_k) = 'array' then v_old->v_k else '[]'::jsonb end) e
          union all
          select e from jsonb_array_elements(case when jsonb_typeof(p_value->v_k) = 'array' then p_value->v_k else '[]'::jsonb end) e
        ) t where e->>'id' is not null order by e->>'id', coalesce(e->>'upd', e->>'at', '') desc
      ) u;
      v_new := jsonb_set(v_new, array[v_k], v_arr, true);
    end loop;

  elsif p_key = 'conv' then
    select coalesce(jsonb_agg(e order by e->>'at', e->>'id'), '[]'::jsonb) into v_arr
    from (
      select distinct on (e->>'id') e from (
        select e from jsonb_array_elements(case when jsonb_typeof(v_old->'msgs') = 'array' then v_old->'msgs' else '[]'::jsonb end) e
        union all
        select e from jsonb_array_elements(case when jsonb_typeof(p_value->'msgs') = 'array' then p_value->'msgs' else '[]'::jsonb end) e
      ) t
      where e->>'id' is not null
      order by e->>'id', coalesce(e->>'upd', e->>'at', '') desc
    ) u;
    v_new := jsonb_build_object('msgs', v_arr,
      'seq', greatest(coalesce(nullif(v_old->>'seq','')::numeric, 1), coalesce(nullif(p_value->>'seq','')::numeric, 1)));

  elsif p_key = 'qse' then
    select coalesce(jsonb_agg(d order by d->>'at', d->>'id'), '[]'::jsonb) into v_arr
    from (
      select jsonb_set(
        (case when coalesce(n.d->>'upd', n.d->>'at', '') >= coalesce(o.d->>'upd', o.d->>'at', '') then coalesce(n.d, o.d) else coalesce(o.d, n.d) end),
        '{sigs}',
        (select coalesce(jsonb_agg(s order by s->>'at'), '[]'::jsonb) from (
           select distinct on (s->>'name', s->>'at') s from (
             select s from jsonb_array_elements(case when jsonb_typeof(o.d->'sigs') = 'array' then o.d->'sigs' else '[]'::jsonb end) s
             union all
             select s from jsonb_array_elements(case when jsonb_typeof(n.d->'sigs') = 'array' then n.d->'sigs' else '[]'::jsonb end) s
           ) ss order by s->>'name', s->>'at'
        ) u2), true) d
      from (select d from jsonb_array_elements(case when jsonb_typeof(v_old->'docs') = 'array' then v_old->'docs' else '[]'::jsonb end) d) o
      full join (select d from jsonb_array_elements(case when jsonb_typeof(p_value->'docs') = 'array' then p_value->'docs' else '[]'::jsonb end) d) n
        on o.d->>'id' = n.d->>'id'
    ) m;
    -- contrôles chantier (nuit 09→10/10) : réunis par id (un contrôle = une ligne, jamais perdue entre deux tablettes)
    v_new := jsonb_set(coalesce(case when jsonb_typeof(p_value) = 'object' then p_value end, case when jsonb_typeof(v_old) = 'object' then v_old end, '{}'::jsonb), '{docs}', v_arr, true);
    select coalesce(jsonb_agg(c order by c->>'at'), '[]'::jsonb) into v_arr
    from (
      select distinct on (c->>'id') c from (
        select c from jsonb_array_elements(case when jsonb_typeof(v_old->'controles') = 'array' then v_old->'controles' else '[]'::jsonb end) c
        union all
        select c from jsonb_array_elements(case when jsonb_typeof(p_value->'controles') = 'array' then p_value->'controles' else '[]'::jsonb end) c
      ) t where c->>'id' is not null order by c->>'id', coalesce(c->>'upd', c->>'at', '') desc
    ) u3;
    if jsonb_array_length(v_arr) > 0 then v_new := jsonb_set(v_new, '{controles}', v_arr, true); end if;

  elsif p_key = 'weldSlides' then -- 21/10 : soudures coulissées sur place (＋ → ↔) — réunies par id, la plus récente (upd, sinon at) gagne ; une annulation = del:true (jamais retirée : deux téléphones ne se ressuscitent pas)
    select coalesce(jsonb_agg(e order by coalesce(e->>'at',''), e->>'id'), '[]'::jsonb) into v_new
    from (
      select distinct on (e->>'id') e from (
        select e from jsonb_array_elements(case when jsonb_typeof(v_old) = 'array' then v_old else '[]'::jsonb end) e
        union all
        select e from jsonb_array_elements(case when jsonb_typeof(p_value) = 'array' then p_value else '[]'::jsonb end) e
      ) t where e->>'id' is not null order by e->>'id', coalesce(e->>'upd', e->>'at', '') desc
    ) u;

  elsif p_key = 'removedWelds' then -- 05/11 : soudures retirées sur place — réunies par numéro de soudure (deux téléphones ne s'écrasent pas ; doublon : la plus récente)
    select coalesce(jsonb_agg(e order by coalesce(e->>'at',''), e->>'weldId'), '[]'::jsonb) into v_new
    from (
      select distinct on (e->>'weldId') e from (
        select e from jsonb_array_elements(case when jsonb_typeof(v_old) = 'array' then v_old else '[]'::jsonb end) e
        union all
        select e from jsonb_array_elements(case when jsonb_typeof(p_value) = 'array' then p_value else '[]'::jsonb end) e
      ) t where coalesce(e->>'weldId','') <> '' order by e->>'weldId', coalesce(e->>'at', '') desc
    ) u;

  elsif p_key = 'undoLog' then
    select coalesce(jsonb_agg(e order by e->>'at'), '[]'::jsonb) into v_new
    from (
      select e from (
        select distinct on (e->>'id') e from (
          select e from jsonb_array_elements(case when jsonb_typeof(v_old) = 'array' then v_old else '[]'::jsonb end) e
          union all
          select e from jsonb_array_elements(case when jsonb_typeof(p_value) = 'array' then p_value else '[]'::jsonb end) e
        ) t where e->>'id' is not null order by e->>'id'
      ) u order by e->>'at' desc limit 500
    ) w;

  else
    v_new := coalesce(p_value, 'null'::jsonb);
  end if;

  update public.sites set data = jsonb_set(coalesce(data, '{}'::jsonb), array[p_key], v_new, true), updated_at = t_at where id = p_site;
  return jsonb_build_object('at', t_at, 'value', v_new);
end $$;
grant execute on function public.site_set_part(text, text, jsonb) to authenticated;

-- ── CONTRÔLE (les deux doivent répondre true) ─────────────────────────────────────────────────────────────────────────────
select
  exists (select 1 from pg_trigger where tgrelid = 'public.welds'::regclass and tgname = 'welds_fusion' and not tgisinternal) as fusion_ok,
  (select position('''removedWelds''' in p.prosrc) > 0 from pg_proc p join pg_namespace n on n.oid = p.pronamespace where n.nspname = 'public' and p.proname = 'site_set_part') as retrait_ok;
