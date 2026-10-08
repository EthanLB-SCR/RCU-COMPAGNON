-- COMPTES ET ACCÈS v3 (08/10/2026, soir) — à coller dans Supabase → SQL Editor → Run. Ré-exécutable. Après comptes_acces_v2.sql.
-- Enregistrement PAR PARTIE d'un chantier : jusqu'ici l'appli ré-écrivait le plan entier (table sites) à chaque message de conversation, prélèvement de stock,
-- émargement QSE… or la RLS du 18/08 réserve l'écriture de sites au chef / bureau → ce qu'un soudeur ou un manchonneur saisissait dans ces parties
-- restait sur son appareil. Cette fonction n'écrit QUE la partie demandée (jsonb_set) :
--   · parties partagées, tout compte actif : conv (conversation + demandes d'annulation + crédits), stock, extraWelds (soudures ajoutées), qse (émargements),
--     pointage, undoLog (journal des annulations), dhData (mesures DH) ;
--   · parties « plan », chef / bureau / administrateur : elPos (rotations des tubes), hydro, phasage, ts, marche, admin (dossier administratif), dossier.
create or replace function public.my_role() returns text language sql stable security definer set search_path = public as $$
  select p.role from public.profiles p where p.id = auth.uid();
$$;

create or replace function public.site_set_part(p_site text, p_key text, p_value jsonb) returns timestamptz
language plpgsql security definer set search_path = public as $$
declare t_at timestamptz := now();
begin
  if not public.is_active() then raise exception 'compte inactif'; end if;
  if p_key in ('conv','stock','extraWelds','qse','pointage','undoLog','dhData') then
    null; -- tout actif
  elsif p_key in ('elPos','hydro','phasage','ts','marche','admin','dossier') then
    if not (public.is_admin() or coalesce(public.my_role(),'') in ('chef','bureau')) then raise exception 'réservé au chef / bureau'; end if;
  else
    raise exception 'partie inconnue : %', p_key;
  end if;
  update public.sites set data = jsonb_set(coalesce(data, '{}'::jsonb), array[p_key], coalesce(p_value, 'null'::jsonb), true), updated_at = t_at where id = p_site;
  if not found then return null; end if; -- chantier pas encore sur le serveur : l'appli fait un enregistrement complet
  return t_at;
end $$;
grant execute on function public.site_set_part(text, text, jsonb) to authenticated;

-- vérification : la fonction existe
select proname, pg_get_function_arguments(oid) from pg_proc where proname in ('site_set_part','my_role','is_admin','admin_set_setting');
