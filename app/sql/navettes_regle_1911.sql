-- sql/navettes_regle_1911.sql — 19/11/2026 (nuit) : NAVETTES — la RÈGLE COMMUNE d'une semaine lisible par tout le monde.
--   La règle commune (jours au réel pour tout le monde, férié travaillé lissé quand même, ou toute la semaine aux heures réelles) est une ligne du registre navliss,
--   id = tous|<lundi> (AAAA-MM-JJ). Elle est ÉCRITE par la RH ou le responsable d'exploitation (droit « contrôler les navettes ») : registre_set l'accepte déjà tel quel.
--   Ce fichier ne change que la LECTURE : chacun peut lire la ligne « tous|… » de navliss, pour que sa semaine (Moi → Heures) soit calculée avec la même règle que sa navette.
--   Sans ce fichier : la RH et le responsable d'exploitation voient et appliquent la règle (navettes, compteurs) ; un compagnon voit sa semaine SANS la règle commune.
--   Le férié travaillé au réel ne dépend pas de ce fichier : il est calculé, sans rien d'enregistré.
--   Politique de lecture = celle de retours_ia_1111.sql, mot pour mot, + cette ligne. À passer APRÈS retours_ia_1111.sql. Ré-exécutable.
--   Ne repasse pas retours_ia_1111.sql ni navettes_1011.sql APRÈS celui-ci (ils remettraient la lecture sans la règle commune).
--   24/11 : refuse de s'exécuter si retours_2411.sql est déjà passé (il le contient).
do $do$ begin
  if not exists (select 1 from pg_proc p where p.proname = 'registre_set' and pg_get_functiondef(p.oid) like '%''retour''%') then raise exception 'Passe d''abord sql/retours_ia_1111.sql (registre « retour » absent de registre_set).'; end if;
  if exists (select 1 from pg_proc p where p.proname = 'registre_set' and pg_get_functiondef(p.oid) like '%rhdem%') then raise exception 'Fichier dépassé : retours_2411.sql est déjà passé et contient déjà cette lecture. Ne le repasse pas : il retirerait la lecture des demandes de congé. Rien n''a été modifié.'; end if; -- 24/11
end $do$;
drop policy if exists registre_read on public.registre;
create policy registre_read on public.registre for select using (
  (public.is_active() or public.is_admin())
  and (kind not in ('prix','panier') or public.is_admin() or coalesce(public.my_role(),'') in ('chef','bureau'))
  and (kind <> 'cpth' or public.is_admin() or public.can_rh('rh.voir') or public.can_rh('rh.edit') or public.can_rh('rh.nav') or lower(id) = coalesce(public.my_key(), '')) -- 10/11 nuit : + qui contrôle les navettes (le choix « reporter ou prime » demande de voir le compteur)
  and (not (kind = 'doc' and id = 'memlib') or public.is_admin() or coalesce(public.my_role(),'') in ('chef','bureau'))
  and (kind <> 'vrec' or public.is_admin() or coalesce(public.my_role(),'') in ('chef','bureau') or lower(coalesce(data->>'conducteurKey','')) = coalesce(public.my_key(), '')
       or (data ? 'lache' and lower(coalesce(data->'a'->>'key','')) in ('', coalesce(public.my_key(), ''))))
  and (kind <> 'magdem' or public.is_admin() or coalesce(public.my_role(),'') in ('chef','bureau') or public.can_mag() or lower(split_part(id, '|', 1)) = coalesce(public.my_key(), ''))
  and (kind not in ('rhpv','rhform','rhmut') or public.is_admin() or public.can_rh('rh.voir') or public.can_rh('rh.edit') or lower(split_part(id, '|', 1)) = coalesce(public.my_key(), ''))
  and (kind <> 'rhabs' or public.is_admin() or public.can_rh('rh.voir') or public.can_rh('rh.edit') or public.can_rh('rh.abs') or public.can_rh('rh.nav') or lower(split_part(id, '|', 1)) = coalesce(public.my_key(), '')) -- 10/11 nuit : + rh.nav (les absences entrent dans le lissage)
  and (kind not in ('afgrille','afnature','afdep','afaff','affac','afequip') or public.is_admin() or coalesce(public.my_role(),'') in ('chef','bureau')) -- 10/11 (Affaire) : encadrement / bureau / administrateur
  and (kind not in ('navliss','navchoix') or public.is_admin() or public.can_rh('rh.voir') or public.can_rh('rh.edit') or public.can_rh('rh.nav') or lower(split_part(id, '|', 1)) = coalesce(public.my_key(), '')
       or (kind = 'navliss' and split_part(id, '|', 1) = 'tous')) -- 10/11 nuit (navettes) : RH, responsable d'exploitation, la personne elle-même ; 19/11 nuit : + la règle commune de la semaine (tous|<lundi>), lisible par tous
  and (kind <> 'retour' or public.is_admin() or lower(split_part(id, '|', 1)) = coalesce(public.my_key(), '')) -- 11/11 nuit : bugs et idées — l'administrateur, et chacun les siens
);
-- contrôle : select id, data->>'motif' as motif, data->>'by' as par from public.registre where kind = 'navliss' and id like 'tous|%' order by id;
