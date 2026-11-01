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
-- FICHIER 1 / 2 : APERÇU (ne modifie rien). Le fichier 2 (remise_a_zero_2_effacement.sql) efface.
-- MODE D'EMPLOI (Supabase → SQL Editor) :
--   1. Colle et lance le fichier 1 (aperçu) : rien n'est modifié. Vérifie les lignes « GARDÉ » (toi + Sofiane, 2 lignes) et les nombres.
--   2. Colle et lance le fichier 2 (effacement). Elle refuse de tourner si elle ne trouve pas exactement 2 comptes à garder.
--   3. Sur TES appareils (PC, téléphone) : ferme et rouvre Tracé. L'appli voit la remise à zéro, vide ses copies locales et se recharge une fois
--      (sinon tes appareils afficheraient encore les anciennes données). Le planning et ce qui attend d'être envoyé ne sont pas touchés.
--   4. Si tu t'es connecté avec le compte de quelqu'un (ex. Gary) : Administrateur → sa carte → 🔐 Nouveau code, et envoie-lui son lien :
--      il choisira son propre mot de passe.
-- ════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════

-- ─────────────── ÉTAPE 1 — APERÇU (ne modifie rien) ───────────────
with keep as (
  select lower(email) as k from public.profiles
   where lower(email) = 'elebihan@scr-soudure.fr'
      or (coalesce(name,'')||' '||coalesce(prenom,'')||' '||coalesce(nom,'')||' '||coalesce(email,'')) ilike '%sofian%'
  union
  select lower(email) from public.invites
   where (coalesce(prenom,'')||' '||coalesce(nom,'')||' '||coalesce(email,'')) ilike '%sofian%'
)
select '00 · GARDÉ' as quoi, k as compte, null::bigint as nombre from keep
union all select '01 · pointages (heures)', lower(p), count(*) from public.pointages where lower(p) not in (select k from keep) group by lower(p)
union all select '02 · signatures de documents', lower(data->>'key'), count(*) from public.registre where kind='docsig' and coalesce(data->>'key','')<>'' and lower(data->>'key') not in (select k from keep) group by 2
union all select '03 · notes de frais', lower(data->>'key'), count(*) from public.registre where kind='debours' and coalesce(data->>'key','')<>'' and lower(data->>'key') not in (select k from keep) group by 2
union all select '04 · demandes de matériel', lower(data->>'byKey'), count(*) from public.registre where kind='magdem' and coalesce(data->>'byKey','')<>'' and lower(data->>'byKey') not in (select k from keep) group by 2
union all select '05 · agenda', lower(data->>'p'), count(*) from public.registre where kind='agenda' and coalesce(data->>'p','')<>'' and lower(data->>'p') not in (select k from keep) group by 2
union all select '06 · accords grand déplacement', lower(data->>'p'), count(*) from public.registre where kind='gdx' and coalesce(data->>'p','')<>'' and lower(data->>'p') not in (select k from keep) group by 2
union all select '07 · compteurs d''heures', lower(id), count(*) from public.registre where kind='cpth' and lower(id) not in (select k from keep) group by 2
union all select '08 · émargements QHS', lower(coalesce(data->>'key',split_part(id,'|',2))), count(*) from public.registre where kind='qhsig' and lower(coalesce(data->>'key',split_part(id,'|',2))) not in (select k from keep) group by 2
union all select '09 · accidents déclarés', lower(data->>'byKey'), count(*) from public.registre where kind='accident' and coalesce(data->>'byKey','')<>'' and lower(data->>'byKey') not in (select k from keep) group by 2
union all select '10 · états des lieux véhicule', lower(data->>'conducteurKey'), count(*) from public.registre where kind='vrec' and coalesce(data->>'conducteurKey','')<>'' and lower(data->>'conducteurKey') not in (select k from keep) group by 2
union all select '11 · fiche : avatar, passeport, docs, urgence, Outlook', lower(key), 1 from public.people where lower(key) not in (select k from keep) and data ?| array['avatar','habs','docs','compteurs','urgence','outlook']
order by 1, 2;
