-- ════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════
-- REMISE À ZÉRO DES COMPTES avant le test terrain du 02/11/2026 (demande d'Ethan, 01/11 soir)
--   « repars de zéro avec tous les comptes, hors le mien et celui de Sofiane » · « son compte est vierge : rien de pointé, pas d'heures, rien »
--   · « le planning, tu n'y touches pas, j'ai préparé demain »
--
-- GARDE (rien n'est effacé pour eux) : elebihan@scr-soudure.fr + le compte de Sofiane (repéré par « sofian » dans le nom ou l'e-mail).
--
-- EFFACE pour TOUS LES AUTRES (comptes, invités, personnes provisoires) :
--   · pointages (donc les heures, validations, corrections)          · signatures de documents (ils les reliront et signeront)
--   · notes de frais                                                  · demandes de matériel (magasin)
--   · agenda personnel                                                · accords de grand déplacement
--   · compteurs d'heures (soldes)                                     · émargements des quarts d'heure sécurité
--   · déclarations d'accident faites depuis leur compte               · états des lieux de véhicule faits à leur nom
--   · dans leur fiche : avatar, passeport (habilitations), documents perso, contact d'urgence, lien Outlook
--
-- NE TOUCHE PAS : comptes, mots de passe, invitations, droits, PLANNING, chantiers (soudures, photos, plans, fiches), secteur et adresse
-- (saisis par le bureau), véhicules (qui conduit quoi), magasin (stock), documents de l'entreprise, réglages.
--
-- FICHIER 2 / 2 : EFFACEMENT. Passe d'abord le fichier 1 (remise_a_zero_1_apercu.sql) et vérifie l'aperçu.
-- MODE D'EMPLOI (Supabase → SQL Editor) :
--   1. Colle et lance le fichier 1 (aperçu) : rien n'est modifié. Vérifie les lignes « GARDÉ » (toi + Sofiane, 2 lignes) et les nombres.
--   2. Colle et lance le fichier 2 (effacement). Elle refuse de tourner si elle ne trouve pas exactement 2 comptes à garder.
--   3. Sur TES appareils (PC, téléphone) : ferme et rouvre Tracé. L'appli voit la remise à zéro, vide ses copies locales et se recharge une fois
--      (sinon tes appareils afficheraient encore les anciennes données). Le planning et ce qui attend d'être envoyé ne sont pas touchés.
--   4. Si tu t'es connecté avec le compte de quelqu'un (ex. Gary) : Administrateur → sa carte → 🔐 Nouveau code, et envoie-lui son lien :
--      il choisira son propre mot de passe.
-- ════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════

-- ─────────────── ÉTAPE 2 — EFFACEMENT (tout ou rien) ───────────────
begin;

create temp table rz_keep on commit drop as
  select lower(email) as k from public.profiles
   where lower(email) = 'elebihan@scr-soudure.fr'
      or (coalesce(name,'')||' '||coalesce(prenom,'')||' '||coalesce(nom,'')||' '||coalesce(email,'')) ilike '%sofian%'
  union
  select lower(email) from public.invites
   where (coalesce(prenom,'')||' '||coalesce(nom,'')||' '||coalesce(email,'')) ilike '%sofian%';

do $$ begin
  if (select count(*) from rz_keep) <> 2 or not exists (select 1 from rz_keep where k = 'elebihan@scr-soudure.fr') then
    raise exception 'Comptes à garder trouvés : % — attendu : elebihan@scr-soudure.fr + Sofiane. RIEN n''a été effacé.', (select string_agg(k, ', ') from rz_keep);
  end if;
end $$;

delete from public.pointages where lower(p) not in (select k from rz_keep);
delete from public.registre where kind in ('docsig','debours') and coalesce(data->>'key','') <> '' and lower(data->>'key') not in (select k from rz_keep);
delete from public.registre where kind in ('magdem','accident') and coalesce(data->>'byKey','') <> '' and lower(data->>'byKey') not in (select k from rz_keep);
delete from public.registre where kind in ('agenda','gdx') and coalesce(data->>'p','') <> '' and lower(data->>'p') not in (select k from rz_keep);
delete from public.registre where kind = 'cpth' and lower(id) not in (select k from rz_keep);
delete from public.registre where kind = 'qhsig' and lower(coalesce(data->>'key',split_part(id,'|',2))) not in (select k from rz_keep);
delete from public.registre where kind = 'vrec' and coalesce(data->>'conducteurKey','') <> '' and lower(data->>'conducteurKey') not in (select k from rz_keep);
update public.people
   set data = data - 'avatar' - 'habs' - 'docs' - 'compteurs' - 'urgence' - 'outlook', updated_at = now()
 where lower(key) not in (select k from rz_keep)
   and data ?| array['avatar','habs','docs','compteurs','urgence','outlook'];

-- les appareils qui avaient ces données en copie locale les vident à la prochaine ouverture de Tracé (une fois)
insert into public.app_settings(key, value, updated_at)
values ('cache_reset', jsonb_build_object('at', to_char(now() at time zone 'UTC', 'YYYY-MM-DD"T"HH24:MI:SS.US"Z"'), 'note', 'remise à zéro des comptes avant le test terrain du 02/11'), now())
on conflict (key) do update set value = excluded.value, updated_at = now();

commit;
