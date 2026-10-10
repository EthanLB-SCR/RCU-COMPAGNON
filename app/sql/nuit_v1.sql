-- NUIT DU 09 AU 10/10/2026 — v1 : REGISTRE D'ENTREPRISE (documents à signer, affaires, véhicules), missions du jour, fiche personne (adresse, emploi).
-- À coller dans Supabase → SQL Editor → Run. Ré-exécutable. Après espace_v2.sql.
-- Ethan : « je te joins le règlement intérieur, importe-le dans la base de données, à signer obligatoirement par tout le monde ; pareil pour les notes de service ».
--   · registre : lignes {kind, id, data} — kind = doc (documents d'entreprise : règlement intérieur, notes de service, accueil nouvel arrivant),
--                docsig (signature : id = <document>|<e-mail>), affaire (commerce), vehicule (flotte), commande (bons de commande), debours (notes de frais : id = <e-mail>|<horodatage>).
--   · registre_set : écriture FUSIONNANTE (clé par clé ; une valeur null retire la clé ; mode 'replace' remplace tout). doc / affaire / vehicule : administrateur,
--                chef, bureau ; docsig : la personne elle-même (clé = son e-mail) ou l'encadrement (tablette du chef). Lecture : tout compte actif.
--   · sites.data.missions (site_set_part v6) : objectifs de la journée posés par le chef de chantier / conducteur — chef / bureau.
--   · people.data.adresse / emploi (people_set_part v3) : adresse du domicile (calcul des grands déplacements), intitulé d'emploi RH — encadrement / RH.
create table if not exists public.registre (
  kind text not null, id text not null, data jsonb not null default '{}'::jsonb, updated_at timestamptz not null default now(), updated_by uuid,
  primary key (kind, id));
create index if not exists registre_kind_idx on public.registre(kind);

create or replace function public.registre_set(p_kind text, p_id text, p_patch jsonb, p_mode text default 'merge') returns jsonb
language plpgsql security definer set search_path = public as $$
declare v_old jsonb; v_new jsonb; v_row jsonb; mgr boolean; k text;
begin
  if not public.is_active() then raise exception 'compte inactif'; end if;
  if p_id is null or length(p_id) = 0 or length(p_id) > 200 then raise exception 'identifiant invalide'; end if;
  mgr := public.is_admin() or coalesce(public.my_role(),'') in ('chef','bureau');
  if p_kind in ('doc','affaire','vehicule','mission','controle','commande') then
    if not mgr then raise exception 'réservé à l''encadrement / bureau'; end if;
  elsif p_kind = 'docsig' then
    if not (mgr or lower(split_part(p_id, '|', 2)) = coalesce(public.my_key(), '')) then raise exception 'signature réservée à la personne elle-même'; end if;
  elsif p_kind = 'debours' then -- note de frais : la personne elle-même (id = <e-mail>|<horodatage>) ou l'encadrement (validation, remboursement)
    if not (mgr or lower(split_part(p_id, '|', 1)) = coalesce(public.my_key(), '')) then raise exception 'débours réservé à la personne elle-même'; end if;
  else
    raise exception 'registre inconnu : %', p_kind;
  end if;
  insert into public.registre(kind, id, data, updated_by) values (p_kind, p_id, '{}'::jsonb, auth.uid()) on conflict (kind, id) do nothing;
  select data into v_old from public.registre where kind = p_kind and id = p_id for update;
  if p_mode = 'replace' then
    v_new := coalesce(p_patch, '{}'::jsonb);
  else
    v_new := coalesce(v_old, '{}'::jsonb) || coalesce(case when jsonb_typeof(p_patch) = 'object' then p_patch end, '{}'::jsonb);
    for k in select key from jsonb_each(coalesce(case when jsonb_typeof(p_patch) = 'object' then p_patch end, '{}'::jsonb)) where jsonb_typeof(value) = 'null' loop
      v_new := v_new - k;
    end loop;
  end if;
  update public.registre set data = v_new, updated_at = now(), updated_by = auth.uid() where kind = p_kind and id = p_id;
  select to_jsonb(x) into v_row from public.registre x where x.kind = p_kind and x.id = p_id;
  return v_row;
end $$;

alter table public.registre enable row level security;
drop policy if exists registre_read on public.registre;
create policy registre_read on public.registre for select using (public.is_active() or public.is_admin());
grant select on public.registre to authenticated;
grant execute on function public.registre_set(text, text, jsonb, text) to authenticated;

-- documents d'entreprise intégrés : règlement intérieur (Mars 2026, texte intégral) + questionnaire d'accueil nouvel arrivant (provisoire)
insert into public.registre(kind, id, data) values ('doc', 'reglement_interieur', jsonb_build_object(
  'kind', 'reglement', 'title', 'Règlement intérieur', 'version', 'Mars 2026', 'at', '2026-03-01', 'by', 'Direction', 'active', true, 'req', jsonb_build_object('all', true),
  'html', $doc$<p>Le présent règlement a pour objet de préciser l’application à la présente entreprise SOUDURE CONSTRUCTION RÉSEAUX-SCR - 20 RUE DE LA MOTTE - 35770 VERN-SUR-SEICHE</p>
<ul><li>D’hygiène, de santé et de sécurité ;</li><li>Des conditions dans lesquelles les salariés peuvent être appelés à participer, à la demande de l’employeur, au rétablissement de conditions de travail protectrices de la santé et de la sécurité des salariés, dès lors qu’elles apparaissent compromises ;</li><li>Des règles générales et permanentes relatives à la discipline, notamment la nature et l’échelle des sanctions que peut prendre l’employeur.</li></ul>
<p>Il rappelle également les dispositions relatives aux droits de la défense des salariés, ainsi qu’à l’interdiction de toute pratique de harcèlement moral ou sexuel ou d’agissement sexiste.</p>
<h2 id="ri-1">Article 1er – Champ d’application</h2>
<p>Le présent règlement intérieur s’applique à tous les salariés présents dans l’entreprise, sans restrictions ni réserves.</p>
<p>Toutes les personnes présentes dans l’entreprise, à quelque titre que ce soit (salarié d’une entreprise de travail temporaire, salarié d’une entreprise extérieure mis à disposition dans le cadre d’une convention de prêt de main d’œuvre à but non lucratif ou d’un contrat de prestation de service, stagiaire, visiteur...), sont tenues de respecter les règles relatives à l’hygiène et à la sécurité.</p>
<p>Les dispositions du règlement intérieur s’appliquent dans l’entreprise proprement dit (ateliers, bureaux...) mais également dans ses dépendances, définies comme tout local ou espace accessoire à l’entreprise, tel que magasin, réfectoire, cour ou parking. Elles s’appliquent également aux lieux d’intervention des équipes en chantier ainsi qu’aux espaces d’hébergement en déplacement professionnel.</p>
<h2 id="ri-2">Article 2 – Hygiène et sécurité</h2>
<h3>2.1. Sécurité et prévention des risques professionnels</h3>
<p>La prévention des risques d’accidents et de maladies professionnelles est impérative dans l’entreprise.</p>
<p>Elle exige de chacun, le respect total de toutes les dispositions applicables en matière d’hygiène et de sécurité, sous peine de sanctions disciplinaires. A cet effet, celles-ci doivent être strictement respectées.</p>
<p>En outre, il incombe à chaque salarié, conformément aux consignes qui lui sont données par sa hiérarchie en application du présent règlement intérieur, de prendre soin, en fonction de sa formation et selon ses possibilités, de sa sécurité, de sa santé ainsi que de celles des autres personnes concernées du fait de ses actes ou de ses omissions au travail.</p>
<ul><li>Obligation de signaler tout accident ou situation dangereuse</li></ul>
<p>En cas d’accident du travail ou d’accident de trajet, le salarié ou les témoins par défaut doivent signaler l’accident aussitôt que possible (et maximum sous 24h00) au chef d’entreprise ou son représentant.</p>
<p>Tout salarié a l’obligation d’aviser son hiérarchique direct de tout accident du travail même bénin, de toute situation dangereuse, survenu à lui-même ou à un autre salarié (intérimaire ou sous-traitant) de l’entreprise.</p>
<ul><li>Suivi médical</li></ul>
<p>Le salarié est tenu de se présenter aux visites médicales et examens complémentaires prévus par la règlementation applicable en matière de médecine du travail. Il doit également se soumettre aux examens prévus en cas de surveillance particulière.</p>
<ul><li>Traitements médicamenteux, allergies, maladies chroniques</li></ul>
<p>Le salarié est tenu de faire part au médecin du travail de ses traitements, maladies chroniques, allergies de façon à anticiper les incompatibilités potentielles avec certaines tâches ou situations (ex : conduite, kit d’intervention pour certains cas particuliers, …).</p>
<h4>2.1.1. Droit d’alerte et de retrait</h4>
<p>Le salarié est tenu de signaler immédiatement à sa hiérarchie ou à la personne désignée à cet effet, toute situation de travail dont il a un motif raisonnable de penser qu’elle présente un danger grave et imminent pour sa vie ou sa santé ainsi que toute défectuosité qu’il constate dans les systèmes de protection.</p>
<p>Tout salarié confronté à un tel danger grave et imminent pour sa vie ou sa santé se retire immédiatement de la situation dangereuse en arrêtant le travail. Sa hiérarchie doit en être informée. L’exercice de ce droit de retrait ne doit pas générer une nouvelle situation de danger grave et imminent.</p>
<h4>2.1.2. Utilisation des moyens de protection</h4>
<p>Les dispositions visant à l’observation des prescriptions légales et réglementaires relatives à la sécurité du personnel et à la prévention des accidents et des maladies professionnelles sont réglées par voie de consignes, notamment en ce qui concerne les dispositifs de protection installés sur les machines.</p>
<p>Tout salarié est tenu d’utiliser, conformément à leur destination et contre les risques professionnels pour lesquels ils sont prévus, tous les moyens de protection collectifs mis à sa disposition et de respecter strictement les consignes particulières données à cet effet.</p>
<p>Les cheveux longs doivent être protégés par tout moyen approprié contre le risque d’entraînement par les machines en mouvement. Le port de vêtements flottants est interdit à proximité de certaines machines.</p>
<p>Tout salarié doit également porter les équipements de protection individuelle mis à sa disposition lorsqu’il exécute des travaux ou des opérations pour lesquels leur port a été rendu obligatoire par la règlementation ou par l’entreprise.</p>
<p>Tout vêtement flottant, accessoire gênant ou empêchant le port des équipements de protection requis est interdit.</p>
<p>Le non-respect de ces dispositions constitue une faute donnant lieu à l’application de l’une des sanctions disciplinaires prévues par le présent règlement intérieur, sanction pouvant aller jusqu’au licenciement.</p>
<h4>2.1.3. Utilisation des équipements de travail</h4>
<p>La prévention des risques d’accidents impose à chaque salarié l’obligation de conserver en bon état les équipements de travail. Chaque salarié est tenu d’utiliser les équipements de travail conformément à leur objet : il lui est interdit de les utiliser à d’autres fins, notamment personnelles.</p>
<p>Aucun équipement de travail ne peut être mis en fonctionnement sans que les consignes ne soient respectées. Lors de l’utilisation des équipements de travail, chaque salarié est également tenu d’utiliser tous les moyens de protection collective ou individuelle mis à sa disposition et de respecter strictement les consignes données à cet effet.</p>
<p>Le salarié ne doit pas, en particulier, mettre hors service, changer ou déplacer arbitrairement les protecteurs ou les dispositifs de sécurité propres notamment aux machines, aux appareils, aux outils, aux engins, aux installations et aux bâtiments. Il doit les utiliser correctement.</p>
<h4>2.1.4. Intervention sur les équipements de travail</h4>
<p>Sont considérés comme équipements de travail, les machines, les appareils, les outils, les engins, les installations et, en général, tout matériel confié au salarié en vue de l’exécution de son travail.</p>
<p>Il est formellement interdit au personnel d’exécution d’intervenir de sa propre initiative sur tout équipement de travail dont l’entretien, le nettoyage ou la maintenance est confié à un personnel spécialisé.</p>
<p>Dans le cas où le travail d’exécution comporte également l’entretien ou le nettoyage des équipements de travail, le salarié est tenu d’y consacrer le temps nécessaire selon les modalités définies par voie de consignes.</p>
<p>Il est rappelé que :</p>
<ul><li>Toute intervention sur un équipement de travail, soit par un membre du personnel d’exécution, soit par une personne spécialisée, est soumise aux consignes</li></ul>
<p>particulières données à cet effet : les prescriptions de travail devront être strictement respectées ;</p>
<ul><li>Tout arrêt de fonctionnement des équipements de travail ou tout incident doit être immédiatement signalé au responsable de l’atelier ou à la hiérarchie.</li></ul>
<h4>2.1.5. Autorisations et habilitations</h4>
<p>Chaque salarié se doit, en lien avec la médecine du travail de s’assurer que son état de santé est compatible aux tâches qui lui sont confiées. Il est formellement interdit de réaliser une tâche ou d’utiliser un véhicule, un engin, un équipement, un véhicule sans préalablement :</p>
<ul><li>Être formé ou qualifié</li><li>Être apte médicalement à son utilisation</li><li>Être autorisé par le chef de l’entreprise à l’utiliser.</li></ul>
<h4>2.1.6. Permis de conduire</h4>
<p>Chaque salarié à qui est confié un véhicule est tenu d’être détenteur d’un permis de conduire, valide en France, et correspondant au véhicule utilisé et de respecter strictement le code de la route.</p>
<h4>2.1.7. Utilisation ou manipulation de substances et mélanges dangereux</h4>
<p>Tout salarié affecté à un poste de travail l’exposant à des substances ou mélanges dangereux est tenu d’utiliser ou de manipuler ces substances ou mélanges conformément aux instructions qui lui sont données par la hiérarchie.</p>
<p>Lors de l’utilisation ou de la manipulation de substances ou de mélanges dangereux, chaque salarié est tenu d’utiliser tous les moyens de protection collective ou individuelle mis à sa disposition et de respecter strictement les consignes données à cet effet.</p>
<p>Une consigne informe ces salariés des risques professionnels auxquels ils peuvent être exposés et les dispositions prises pour les éviter ou pour s’en protéger.</p>
<h4>2.1.8. Circulation</h4>
<p>Toute personne est tenue de circuler avec prudence sur les voies autorisées dans l’enceinte de l’entreprise. Toute personne est tenue de respecter les panneaux de circulation ou le plan de circulation éventuellement existants ou, à défaut, les prescriptions du Code de la route.</p>
<p>Tout salarié amené à utiliser certains équipements de travail mobiles servant au levage doit détenir une autorisation de conduite délivrée par l’employeur.</p>
<h4>2.1.9. Incendie et évacuation</h4>
<p>En cas d’incendie, l’évacuation de toute personne présente dans l’entreprise s’effectue conformément aux consignes affichées à cet effet.</p>
<p>Dès que le signal d’évacuation est déclenché, il convient de quitter immédiatement les lieux en suivant les instructions prévues à cet effet.</p>
<p>Toute personne apercevant un début d’incendie doit donner l’alerte.</p>
<p>Il est interdit :</p>
<ul><li>De neutraliser un dispositif de sécurité contre l’incendie ;</li><li>D’utiliser le matériel de protection contre l’incendie et le matériel de secours à un usage autre que celui auquel il est destiné ;</li><li>De déplacer le matériel de protection contre l’incendie et le matériel de secours sans nécessité ou d’en rendre l’accès difficile ;</li><li>D’encombrer les emplacements donnant accès à ce matériel et l’accès aux issues de secours.</li></ul>
<h4>2.1.10. Participation des salariés en cas de situation d’urgence</h4>
<p>En cas de situation d’urgence ou test de situation, la Direction prendra les mesures et donnera les instructions nécessaires pour permettre au personnel d’arrêter son activité et de se mettre en sécurité en quittant immédiatement les lieux de travail.</p>
<p>En cas de participation du salarié, celui-ci est tenu de se conformer à ces instructions.</p>
<p>Dans le cas où les conditions de travail protectrices de la santé ou de la sécurité des salariés sont compromises, la Direction peut être amenée à faire appel au personnel de l’entreprise pour participer au rétablissement de ces conditions de travail.</p>
<p>Les modalités de ces interventions sont déterminées de la façon suivante :</p>
<p>Contacts à privilégier en interne : Responsable d’exploitation, Responsable QHSE, Direction.</p>
<p>Matériel d’urgence disponible :</p>
<ul><li>Extincteurs</li><li>Trousses de secours</li><li>Défibrillateur au Siège SCR à Vern Sur Seiche.</li></ul>
<h4>2.1.11. Vérifications</h4>
<p>En cas de nécessité liée notamment à des raisons de santé et de sécurité ou à la disparition de matériel ou de biens appartenant à l’entreprise, il peut être procédé à la vérification des sacs, effets et véhicules de toute personne accédant à l’entreprise.</p>
<p>Sauf circonstances exceptionnelles, la personne concernée sera informée de son droit de refuser ce contrôle et d’exiger la présence d’un témoin. Son consentement à la vérification doit, dans la mesure du possible, être recueilli en présence d’un témoin. En cas de refus, l’employeur devra alerter les services de Police Judiciaire compétents. Le contrôle doit être effectué dans des conditions respectant la dignité et l’intimité de la personne concernée.</p>
<h4>2.1.12. Interdiction de fumer ou de vapoter</h4>
<p>Il est interdit de fumer ou de vapoter dans tous les lieux fermés et couverts qui constituent des lieux de travail.</p>
<p>Il est interdit de fumer ou de vapoter dans l’ensemble des locaux. Les locaux clos et couverts, affectés à l&#x27;ensemble des salariés, tels que les locaux d&#x27;accueil et de réception, les locaux affectés à la restauration collective, les salles de réunion et de formation, les salles et espaces de repos, les locaux réservés aux loisirs, à la culture et au sport</p>
<p>ou encore les locaux sanitaires et médico-sanitaires, les bureaux, qu&#x27;ils soient collectifs ou individuels. S&#x27;agissant des bureaux individuels, l&#x27;interdiction s&#x27;explique par le fait qu&#x27;il convient de protéger des risques liés au tabagisme passif toutes les personnes qui pourraient être amenées à passer dans ces bureaux, ou à les occuper, même un bref moment, qu&#x27;il s&#x27;agisse d&#x27;un collègue de travail, d&#x27;un client, d&#x27;un fournisseur, des agents chargés de la maintenance, de l&#x27;entretien, de la propreté... Compte tenu de l’obligation de sécurité dont l’employeur est tenu à l’égard de ses salariés, il est également interdit de fumer ou de vapoter dans l’ensemble des locaux non couverts et non fermés (cour, préau, parking...) de l’entreprise.</p>
<p>A ce titre, il est interdit de fumer ou vapoter dans les véhicules de service.</p>
<p>Sur chantier, il est interdit de fumer ou vapoter :</p>
<ul><li>À proximité des produits inflammables tels que produits chimiques, emballages, carburants, etc… ;</li><li>Pendant les opérations de découpe, soudage, manchonnage, manutention, …</li></ul>
<h3>2.2. Hygiène</h3>
<h4>2.2.1. Cantine et réfectoire</h4>
<p>Il est interdit aux salariés de prendre leur repas dans les locaux affectés au travail.</p>
<p>L’accès à l’emplacement réservé au repas, au réfectoire n’est autorisé que pendant les heures fixées pour les repas.</p>
<h4>2.2.2. Consommation de boissons alcoolisées et contrôle d’alcoolémie</h4>
<ul><li>Constat d’état d’ivresse</li></ul>
<p>Il est interdit aux salariés en état d’ivresse d’entrer ou de séjourner dans les lieux de travail. Il est également interdit de laisser entrer ou séjourner dans les lieux de travail toute personne en état d’ivresse.</p>
<p>Un état d’ivresse est suspecté lorsque plusieurs signes sont constatés tels que des troubles de l’élocution, de l’équilibre, du comportement, le non-respect des règles de sécurité, une odeur spécifique de l’haleine alcoolisée, la détention ou la consommation d’alcool.</p>
<p>Le constat d’un état d’ivresse constitue une faute donnant lieu à l’application de l’une des sanctions disciplinaires prévues par le présent règlement intérieur, sanction pouvant aller jusqu’au licenciement.</p>
<p>En cas de constatation d’un état d’ivresse, la Direction peut appeler les services de secours, afin de faire cesser le risque provoqué par cet état et demander une visite médicale auprès du médecin du travail.</p>
<ul><li>Introduction, distribution et consommation de boissons alcoolisées</li></ul>
<p>Aucune introduction ou distribution de boissons alcoolisées par le salarié n’est tolérée dans l’entreprise.</p>
<p>Seule la consommation du vin, de la bière, du cidre et du poiré est tolérée sur le lieu de travail. La consommation de ces quatre boissons alcoolisées n’est autorisée qu’à l’occasion d’évènements ponctuels expressément autorisés par la Direction de l’entreprise.</p>
<p>En ce qui concerne le taux d’alcool présent dans le sang ou l’air expiré, les taux autorisés sont fixés à l’article Article L234-1 du Code de la route, ou Articles L223-1, 211-3.</p>
<ul><li>Contrôle d’alcoolémie</li></ul>
<p>L’état d’imprégnation alcoolique peut être vérifié au moyen d’un éthylotest ou d’un éthylomètre pour tous les salariés.</p>
<p>Ce contrôle d’alcoolémie est réalisé selon les modalités suivantes : La direction pourra solliciter la réalisation de tests d’alcoolémie à l’aide d’éthylotest ou d’un éthylomètre étalonné, à titre préventif ou en raison d’un comportement permettant de penser que le salarié se trouve sous l’emprise d’alcool.</p>
<p>Les contrôles seront réalisés par le chef d’entreprise ou un de ses représentants et un tiers témoin (représentant du personnel, salarié tiré au sort, …). En cas de contrôles préventifs, l’ensemble du personnel présent sera contrôlé sans exception de fonction.</p>
<p>Le contrôle de l’état d’imprégnation alcoolique peut, à la demande du salarié concerné, avoir lieu en présence d’un témoin. Le salarié concerné doit être informé, lors du contrôle, de cette faculté ainsi que de la possibilité de solliciter une contre-expertise.</p>
<p>Un contrôle d’alcoolémie positif réalisé selon les modalités prévues ci-dessus ou un refus de se soumettre à ce contrôle, lorsqu’il est assorti des garanties pour le salarié (présence d’un témoin et contre-expertise), constitue une faute donnant lieu à l’application de l’une des sanctions disciplinaires prévues par le présent règlement intérieur, sanction pouvant aller jusqu’au licenciement.</p>
<h4>2.2.3. Stupéfiants</h4>
<ul><li>État apparent de consommation de stupéfiants</li></ul>
<p>Il est interdit à toute personne sous l’emprise de stupéfiants d’entrer ou de séjourner dans les lieux de travail.</p>
<p>Un état apparent de consommation de stupéfiants est suspecté lorsque plusieurs signes sont constatés tels que des troubles de l’élocution, de l’équilibre, du comportement, le non- respect des règles de sécurité, une odeur spécifique, la détention ou la consommation de stupéfiants.</p>
<p>Le constat d’un état apparent de consommation de stupéfiants constitue une faute donnant lieu à l’application de l’une des sanctions disciplinaires prévues par le présent règlement intérieur, sanction pouvant aller jusqu’au licenciement.</p>
<p>En cas de constatation d’un état apparent de consommation de stupéfiants, la Direction peut appeler les services de secours, afin de faire cesser le risque provoqué par cet état et demander une visite médicale auprès du médecin du travail.</p>
<ul><li>Introduction, distribution et consommation de stupéfiants</li></ul>
<p>Aucune introduction, distribution ou consommation de stupéfiants n’est tolérée dans l’entreprise.</p>
<ul><li>Contrôle des stupéfiants</li></ul>
<p>La consommation de stupéfiants peut être vérifiée au moyen d’un test de dépistage de détection immédiate de produits stupéfiants pour les salariés affectés aux postes de sécurité suivants : Conduite de véhicules, conduite d’engins [levage, manutention...], manipulation de machines dangereuses, d’outils, de matériels dangereux, de produits chimiques dangereux, travaux en hauteur, salariés exerçant une fonction de sûreté ou de sécurité.</p>
<p>Ce contrôle est réalisé selon les modalités suivantes : La direction pourra solliciter la réalisation de tests salivaires de dépistage, à titre préventif ou en raison d’un comportement permettant de penser que le salarié se trouve sous l’emprise de drogue.</p>
<p>Les contrôles seront réalisés par le chef d’entreprise ou un de ses représentants et un tiers témoin (représentant du personnel, salarié tiré au sort, …). En cas de contrôles préventifs, l’ensemble du personnel présent sera contrôlé sans exception de fonction. Avant d’être soumis au test de dépistage, le salarié est préalablement informé que ce test ne pourra être effectué qu’avec son accord. La personne chargée du contrôle devra préciser qu’en cas de refus, le salarié s’expose à l’une des sanctions disciplinaires prévues par le présent règlement intérieur.</p>
<p>Le contrôle peut, à la demande du salarié concerné, avoir lieu en présence d’un témoin. Le salarié concerné doit être informé, lors du contrôle, de cette faculté ainsi que de la possibilité de solliciter une contre-expertise. Pour l’ensemble des postes de travail, le contrôle de la consommation de stupéfiants pourra être réalisé selon les modalités prévues ci-dessus, dès lors qu’un état apparent de consommation de stupéfiants est constaté.</p>
<p>Un contrôle positif réalisé selon les modalités prévues ci-dessus ou un refus de se soumettre à ce contrôle, lorsqu’il est assorti des garanties pour le salarié (présence d’un témoin et</p>
<p>contre-expertise), constitue une faute donnant lieu à l’application de l’une des sanctions disciplinaires prévues par le présent règlement intérieur, sanction pouvant aller jusqu’au licenciement.</p>
<p>En cas de contrôle positif, une mise à pied à titre conservatoire sera immédiatement prononcée :</p>
<ul><li>Le salarié sera retiré de son poste de travail et des mesures pourront être prises pour assurer son retour à domicile en toute sécurité,</li><li>Le salarié retiré de son poste est considéré comme absent ; les heures de travail non effectuées seront déduites de la rémunération, Des sanctions disciplinaires seront prises en fonction des circonstances (récidive, risque causé à autrui, etc.). Le salarié pourra contester la mise à pied et les éventuelles sanctions en fournissant, sous 8 jours, un certificat médical attestant de son état de non-imprégnation de boissons alcoolisées ou de drogue au moment incriminé.</li></ul>
<h4>2.2.4. Mesures de prévention et de protection en situation sanitaire exceptionnelle</h4>
<p>En cas de situation sanitaire exceptionnelle liée notamment à une épidémie ou à une pandémie, l’entreprise peut être amenée à prendre des mesures exceptionnelles afin de garantir la santé et la sécurité de ses salariés, tout en permettant d’assurer la poursuite de l’activité.</p>
<p>Ces mesures peuvent s’appuyer sur la réglementation en vigueur et, ou, sur les recommandations données par les autorités sanitaires.</p>
<p>Ces mesures peuvent notamment :</p>
<ul><li>Restreindre la circulation des personnes dans l’entreprise (par exemple : réorganisation des flux ou des règles de circulation afin de limiter la présence physique en entreprise, etc.) ;</li><li>Instaurer des consignes d’hygiène adéquates (par exemple : imposer le respect d’une distanciation physique, rendre le port de masques obligatoires ou prescrire des procédures particulières de désinfection).</li></ul>
<p>Ces mesures tiennent compte de l’intensité de la crise sanitaire, de la situation géographique de l’entreprise et des conditions de travail propres à chaque entreprise ou service de l’entreprise. Les salariés sont tenus informés par l’intermédiaire de consignes ou d’une note de service.</p>
<p>Tout salarié entrant dans le champ d’application de ces mesures rendues obligatoires par la réglementation ou par l’entreprise doit s’y conformer. En cas de non-respect de ces dispositions, l’employeur pourra prononcer l’une des sanctions prévues par le présent règlement intérieur.</p>
<h2 id="ri-3">Article 3 – Discipline</h2>
<p>D’une manière générale, les salariés doivent respecter l’ensemble des directives et instructions données par l’employeur dans le cadre de son pouvoir de direction. À défaut, le salarié s’expose à des sanctions disciplinaires.</p>
<h3>3.1. Nature et échelle des sanctions</h3>
<p>Constitue une sanction toute mesure, autre que les observations verbales, prise par l’employeur à la suite d’un agissement du salarié considéré par l’employeur comme fautif, que cette mesure soit de nature à affecter immédiatement ou non la présence du salarié dans l’entreprise, sa fonction, sa carrière ou sa rémunération.</p>
<p>En cas de faute, et selon la gravité du manquement en cause, le salarié pourra se voir appliquer par l’employeur l’une des sanctions ci-après énumérées :</p>
<ul><li>Blâme ;</li><li>Avertissement ;</li><li>Mise à pied disciplinaire : la durée maximale de cette mise à pied ne pourra pas excéder 15 jours ;</li><li>Mutation disciplinaire ;</li><li>Rétrogradation disciplinaire ;</li><li>Licenciement pour faute : rupture du contrat de travail ouvrant droit, le cas échéant, à l’indemnité de préavis et à l’indemnité légale ou conventionnelle de licenciement ;</li><li>Licenciement pour faute grave : rupture du contrat de travail sans préavis ni indemnité de licenciement ;</li><li>Licenciement pour faute lourde : rupture du contrat de travail sans préavis ni indemnité de licenciement ;</li><li>Rupture immédiate de préavis : sanction applicable en cas de faute grave commise par le salarié en cours de préavis.</li></ul>
<p>L’employeur n’est pas lié par l’ordre de cette énumération.</p>
<h3>3.2. Procédure disciplinaire</h3>
<p>Aucune sanction ne peut être appliquée à un salarié sans que celui-ci soit informé dans le même temps et par écrit des griefs retenus contre lui.</p>
<p>Aucun fait fautif ne peut donner lieu à lui seul à l’engagement de poursuites disciplinaires au- delà d’un délai de deux mois à compter du jour où l’employeur en a eu connaissance, à moins que ce fait ait donné lieu, dans le même délai, à l’exercice de poursuites pénales. Aucune sanction antérieure de plus de trois ans à l’engagement des poursuites disciplinaires ne peut être invoquée à l’appui d’une nouvelle sanction.</p>
<p>Lorsque l’employeur envisage de prendre une sanction, il convoque le salarié en lui précisant l’objet de la convocation, sauf si la sanction envisagée est un avertissement ou une sanction</p>
<p>de même nature n’ayant pas d’incidence, immédiate ou non, sur la présence dans l’entreprise, la fonction, la carrière ou la rémunération du salarié. Lors de son audition, le salarié peut se faire assister par une personne de son choix appartenant au personnel de l’entreprise. Au cours de l’entretien, l’employeur indique le motif de la sanction envisagée et recueille les explications du salarié. La sanction ne peut intervenir moins de deux jours ouvrables, ni plus d’un mois après le jour fixé pour l’entretien. Elle est motivée et notifiée à l’intéressé. Lorsque les faits reprochés au salarié ont rendu indispensable une mesure conservatoire de mise à pied à effet immédiat, aucune sanction définitive relative à ces faits ne peut être prise sans que la procédure prévue à l’article L. 1332-2 du Code du travail ait été respectée.</p>
<p>Les licenciements disciplinaires sont soumis à la procédure prévue aux articles L. 1232-2 à L. 1232-6 du Code du Travail.</p>
<h3>3.3. Accès à l’entreprise</h3>
<p>L’entreprise est accessible aux jours et aux horaires suivants :</p>
<ul><li>Siège social : du lundi au vendredi de 07h30 à 18h30</li><li>Chantier : du lundi au vendredi – Horaires transmis par les responsables d’exploitation en fonction des contraintes de chantiers et peuvent varier selon les saisons (hivernale et estivale).</li></ul>
<p>L&#x27;accès à l’entreprise est réservé, sauf autorisation expresse, aux salariés de l’entreprise. Il est donc interdit au personnel d&#x27;introduire ou de faire introduire dans l’entreprise des personnes étrangères à celle-ci, sans raison de service sauf dispositions légales particulières ou sauf autorisation de la Direction.</p>
<p>Les salariés ne peuvent accéder aux locaux de l’entreprise que pour exécuter leur prestation de travail. Par exception, une autorisation d’accéder aux locaux en dehors des heures de travail peut être délivrée par la Direction.</p>
<p>Ces conditions d’accès aux locaux de l’entreprise s’exercent sous réserve des droits reconnus aux instances de représentation du personnel ou aux organisations syndicales.</p>
<h3>3.4. Usage des locaux de l’entreprise</h3>
<p>Les locaux de l’entreprise sont réservés exclusivement à usage professionnel. Il est donc interdit :</p>
<ul><li>D’y effectuer un travail personnel ;</li><li>D’introduire dans les lieux de travail des objets et des marchandises destinés à y être vendus ;</li><li>De faire circuler sans autorisation de la Direction des listes de souscription ou de collecte ; seules la collecte des cotisations syndicales et la diffusion des publications</li></ul>
<p>et tracts syndicaux peuvent être faites sans autorisation, dans les conditions prévues par la loi.</p>
<p>L&#x27;affichage sur les murs est interdit en dehors des panneaux muraux réservés à cet effet ; les affiches ou notes de service régulièrement apposées sur ces panneaux ne doivent pas être lacérées ou détruites. En vue d&#x27;éviter toute dégradation, l&#x27;affichage d&#x27;objets décoratifs (posters, cartes postales...) est soumis à autorisation préalable du supérieur hiérarchique.</p>
<h3>3.5. Horaire de travail</h3>
<p>Le respect de l’horaire collectif de travail, fixé conformément à la règlementation en vigueur par l’entreprise et affiché dans les lieux auxquels il s’applique, est obligatoire pour tout le personnel, à l’exception des salariés qui ne sont pas soumis à cet horaire collectif.</p>
<p>Les salariés doivent se trouver à leur poste de travail pendant l’horaire de travail.</p>
<p>Les salariés devront également respecter les changements de l&#x27;horaire éventuellement décidés par la Direction dans les limites et le respect des procédures imposées par la loi et les stipulations conventionnelles.</p>
<p>Chaque salarié doit se conformer aux modalités mises en place dans l’entreprise pour le contrôle des horaires de travail.</p>
<p>Le non-respect de ces horaires peut entraîner l’une des sanctions visées par le présent règlement intérieur.</p>
<h3>3.6. Usage du matériel professionnel et du téléphone</h3>
<p>Les salariés sont tenus de conserver en bon état, d&#x27;une façon générale, tout le matériel qui leur est confié par l’entreprise en vue de l&#x27;exécution de leur travail. Ils ne doivent pas utiliser ce matériel à d&#x27;autres fins, et notamment à des fins personnelles, sans autorisation.</p>
<p>Les outils et ressources numériques de l’entreprise (téléphone, ordinateur, portable, etc.) sont mis à la disposition des salariés à des fins professionnelles. Une utilisation personnelle de ces outils est admise à condition qu’elle soit limitée à un usage raisonnable et non préjudiciable au travail des salariés. Tout salarié doit s’engager à :</p>
<ul><li>Ranger et nettoyer ses espaces de travail au fil de l’eau,</li><li>Respecter les consignes de tri des déchets,</li><li>Prendre soin, ranger et nettoyer le véhicule qui lui est affecté ainsi que les outils, équipements et tenues de travail,</li><li>Signaler toute dégradation, perte, casse, panne et s’assurer d’avoir son équipement au complet,</li></ul>
<p>Chaque salarié doit contribuer aux opérations d’inventaires.</p>
<p>De même, les communications téléphoniques à caractère personnel reçues ou données durant le temps de travail, devront être limitées à un usage raisonnable et non préjudiciable au travail des salariés.</p>
<p>En cas de lieu de travail partagé (notamment : bureau collectif, open-space), il est demandé aux salariés de :</p>
<ul><li>Programmer leur téléphone personnel en mode silencieux,</li><li>De cantonner l’usage du téléphone personnel aux pauses, sauf en cas d’urgence impérieuse,</li><li>De s’isoler pour téléphoner en cas de communication à caractère personnel.</li></ul>
<p>Pour les salariés occupant des postes de : Conduite de véhicules, conduite d’engins [levage, manutention...], manipulation de machines dangereuses, d’outils, de matériels dangereux, de produits chimiques dangereux, travaux en hauteur, salariés exerçant une fonction de sûreté ou de sécurité, l’utilisation du téléphone personnel durant le temps de travail est strictement limitée aux cas d’urgence, en raison du risque qu’une telle utilisation présente pour la sécurité des personnes et des équipements.</p>
<p>Il est également interdit d&#x27;envoyer toute correspondance personnelle aux frais de l’entreprise.</p>
<p>Tout salarié doit, avant de quitter l’entreprise, restituer les matières premières, l&#x27;outillage, les machines, les dessins et, de manière générale, tous matériels et documents en sa possession et appartenant à l’entreprise.</p>
<p>Il est interdit d&#x27;emporter des objets appartenant à l’entreprise sans autorisation.</p>
<ul><li>Défaillances</li></ul>
<p>Tout salarié de l‘entreprise, doit auprès de son responsable hiérarchique :</p>
<ul><li>Signaler toute panne, casse, détérioration, perte, vol des équipements, matériels, véhicules qui lui sont confiés,</li></ul>
<p>Rappel : Seul le personnel désigné à cet effet, à titre permanent ou temporaire, est autorisé à intervenir sur les dispositifs de sécurité des installations et des matériels, dans la limite stricte de ses attributions.</p>
<ul><li>Faire compléter sa dotation si nécessaire en faisant une demande</li><li>Assurer les contrôles de sécurité après intervention d’entretien / maintenance.</li><li>Sinistres</li></ul>
<p>Tout salarié de l‘entreprise, est tenu de :</p>
<ul><li>Déclarer à son responsable hiérarchique tout sinistre ou dégradation, casse d’équipement, véhicule, bâtiment qu’il soit de l’entreprise ou à un tiers,</li><li>Remplir un constat papier ou dématérialisé en cas de sinistre, le signer et le faire signer par le tiers quand tiers impliqué, le transmettre à son responsable qui fait suivre à la Responsable administrative et au Responsable Parc.</li><li>Suivre les consignes qui lui sont données pour les suites du sinistre.</li><li>Sécurité informatique</li></ul>
<p>Il est formellement interdit, sans autorisation préalable de :</p>
<ul><li>Télécharger des applications informatiques sur les téléphones et équipements informatiques de l’entreprise,</li><li>Utiliser des clefs USB, disques externes non sécurisés,</li><li>Stocker les données de travail sur les disques durs PC sans sauvegarde sur le réseau,</li><li>Diffuser quelque information confidentielle que ce soit (commerciale, technique, personnelle) Prévention et gestion des risques liés au phishing (hameçonnage) par courriel :</li></ul>
<p>Dans le cadre de l’utilisation des outils informatiques et de communication mis à disposition par l’entreprise, chaque salarié est tenu de respecter les consignes suivantes afin de prévenir les tentatives d’hameçonnage :</p>
<p>1) Vigilance face aux courriels suspects :</p>
<ul><li>Ne jamais ouvrir une pièce jointe ou cliquer sur un lien provenant d’un expéditeur inconnu ou non vérifié.</li><li>Vérifier attentivement l’adresse de l’expéditeur et la cohérence du contenu du message avant toute action.</li><li>Être particulièrement attentif aux demandes urgentes, de transfert d’argent, de transmission de données personnelles ou d’informations sensibles.</li></ul>
<p>2) Signalement :</p>
<ul><li>Tout courriel suspect doit être immédiatement signalé au responsable hiérarchique.</li><li>Le salarié ne doit en aucun cas répondre au message, transmettre les informations demandées ou transférer le courriel sans validation préalable.</li></ul>
<p>3) Interdictions :</p>
<ul><li>Il est interdit d’utiliser les adresses professionnelles pour s’inscrire à des services en ligne non liés à l’activité de l’entreprise.</li><li>Il est interdit de communiquer des identifiants, mots de passe ou informations confidentielles de l’entreprise par courriel, même en réponse à un message semblant provenir d’un responsable hiérarchique, d’un partenaire ou d’une autorité.</li></ul>
<p>4) Responsabilités et sanctions :</p>
<ul><li>Le non-respect de ces règles expose l’entreprise à des risques graves (perte de données, atteinte à la réputation, fraudes).</li><li>Tout manquement pourra faire l’objet de sanctions disciplinaires prévues par le présent règlement intérieur. Il est obligatoire de verrouiller les écrans et PC avant chaque départ en pause.</li></ul>
<p>En cas de travail dans des zones accessibles à des personnes extérieures à l’entreprise (bases vie, transports en commun, …) il est obligatoire d’équiper son écran de PC d’un film ou écran de confidentialité. Tous les téléphones à usage professionnel doivent être équipés d’un système d’identification personnel sécurisé.</p>
<h3>3.7. Retards et absences</h3>
<h4>3.7.1. Retards</h4>
<p>Tout retard doit être signalé et justifié auprès de la Direction ou du responsable hiérarchique. Tout retard réitéré et injustifié peut entraîner l’une des sanctions prévues par le présent règlement intérieur.</p>
<h4>3.7.2. Absences pendant les heures de travail</h4>
<p>Les sorties pendant les heures de travail doivent être exceptionnelles. Elles sont subordonnées à une autorisation délivrée par la Direction ou le responsable hiérarchique.</p>
<p>Sous réserve des droits des représentants du personnel, les absences non autorisées constituent une faute et peuvent entraîner, le cas échéant, l&#x27;application de sanctions disciplinaires.</p>
<h4>3.7.3. Absences pour maladie ou accident</h4>
<p>L’absence pour maladie ou accident devra faire l’objet d’une information par le salarié de son responsable hiérarchique ou de la Direction, dans les plus brefs délais à compter de l’absence, afin de pallier le cas échéant, cette absence et devra être justifiée sous 48 heures auprès de la Direction, par l’envoi d’un certificat médical indiquant la durée probable de l’absence.</p>
<p>Le défaut d’information et/ou de justification d’une absence est susceptible de faire l’objet d’une sanction.</p>
<h4>3.7.4. Absences autres que pour maladie ou accident</h4>
<p>Toute absence, qu’elle soit imprévisible ou prévisible, pour une raison autre que la maladie ou l’accident, devra faire l’objet d’une information par le salarié de son responsable hiérarchique ou de la Direction et être justifiée dans un délai de 2 heures, sauf cas de force majeure.</p>
<p>Toute absence non justifiée dans ces conditions peut faire l&#x27;objet d&#x27;une sanction.</p>
<h4>3.7.5. Absences pour congés payés</h4>
<p>Les salariés sont tenus de respecter les dates de congés payés fixées par ou en accord avec la Direction, sous peine de sanctions disciplinaires.</p>
<p>3.8 Confidentialité Il est formellement interdit à tout salarié de l’entreprise de divulguer des informations confidentielles qu’elles soient, commerciales, techniques, personnelles. De même, par respect d’autrui et de l’image de l’entreprise, il est formellement interdit à tout salarié, sauf autorisation préalable du chef d’entreprise ou de son représentant de :</p>
<ul><li>Communiquer au sein de l’entreprise et à l’extérieur des images de collaborateurs sans autorisation préalable des personnes concernées,</li><li>Communiquer à titre personnel des informations et visuels de chantiers au nom de l’entreprise.</li></ul>
<h2 id="ri-4">Article 4 – Dispositions relatives aux agissements sexistes, au harcèlement moral, au harcèlement sexuel et à la violence au travail</h2>
<h3>4.1. Dispositions relatives aux agissements sexistes</h3>
<p>Article L. 1142-2-1 du Code du travail</p>
<p>Nul ne doit subir d’agissement sexiste, défini comme tout agissement lié au sexe d’une personne, ayant pour objet ou pour effet de porter atteinte à sa dignité ou de créer un environnement intimidant, hostile, dégradant, humiliant ou offensant.</p>
<h3>4.2. Dispositions relatives au harcèlement moral</h3>
<p>Article L. 1152-1 du Code du travail</p>
<p>Aucun salarié ne doit subir les agissements répétés de harcèlement moral qui ont pour objet ou pour effet une dégradation de ses conditions de travail susceptible de porter atteinte à ses droits et à sa dignité, d’altérer sa santé physique ou mentale ou de compromettre son avenir professionnel.</p>
<p>Article L. 1152-2 du Code du travail</p>
<p>Aucune personne ayant subi ou refusé de subir des agissements répétés de harcèlement moral ou ayant, de bonne foi, relaté ou témoigné de tels agissements ne peut faire l&#x27;objet des mesures mentionnées à l&#x27;article L. 1121-2. Les personnes mentionnées au premier alinéa du présent article bénéficient des protections prévues aux I et III de l&#x27;article 10-1 et aux articles 12 à 13-1 de la loi n° 2016-1691 du 9 décembre 2016 relative à la transparence, à la lutte contre la corruption et à la modernisation de la vie économique. Article L. 1152-3 du Code du travail</p>
<p>Toute rupture du contrat de travail intervenue en méconnaissance des dispositions des articles L. 1152-1 et L. 1152-2, toute disposition ou tout acte contraire est nul.</p>
<p>Article L. 1152-4 du Code du travail</p>
<p>L’employeur prend toutes dispositions nécessaires en vue de prévenir les agissements de harcèlement moral. Les personnes mentionnées à l’article L. 1152-2 sont informées par tout moyen du texte de l’article 222-33-2 du Code pénal.</p>
<p>Article L. 1152-5 du Code du travail</p>
<p>Tout salarié ayant procédé à des agissements de harcèlement moral est passible d’une sanction disciplinaire.</p>
<p>Article L. 1152-6 du Code du travail</p>
<p>Une procédure de médiation peut être mise en œuvre par toute personne de l’entreprise s’estimant victime de harcèlement moral ou par la personne mise en cause. Le choix du médiateur fait l’objet d’un accord entre les parties. Le médiateur s’informe de l’état des relations entre les parties. Il tente de les concilier et leur soumet des propositions qu’il consigne par écrit en vue de mettre fin au harcèlement. Lorsque la conciliation échoue, le médiateur informe les parties des éventuelles sanctions encourues et des garanties procédurales prévues en faveur de la victime.</p>
<h3>4.3. Dispositions relatives au harcèlement sexuel</h3>
<p>Article L. 1153-1 du Code du travail</p>
<p>Aucun salarié ne doit subir des faits :</p>
<p>1° Soit de harcèlement sexuel, constitué par des propos ou comportements à connotation sexuelle ou sexiste répétés qui soit portent atteinte à sa dignité en raison de leur caractère</p>
<p>dégradant ou humiliant, soit créent à son encontre une situation intimidante, hostile ou offensante ;</p>
<p>Le harcèlement sexuel est également constitué :</p>
<p>a) Lorsqu&#x27;un même salarié subit de tels propos ou comportements venant de plusieurs personnes, de manière concertée ou à l&#x27;instigation de l&#x27;une d&#x27;elles, alors même que chacune de ces personnes n&#x27;a pas agi de façon répétée ;</p>
<p>b) Lorsqu&#x27;un même salarié subit de tels propos ou comportements, successivement, venant de plusieurs personnes qui, même en l&#x27;absence de concertation, savent que ces propos ou comportements caractérisent une répétition ; 2° Soit assimilés au harcèlement sexuel, consistant en toute forme de pression grave, même non répétée, exercée dans le but réel ou apparent d&#x27;obtenir un acte de nature sexuelle, que celui-ci soit recherché au profit de l&#x27;auteur des faits ou au profit d&#x27;un tiers.</p>
<p>Article L. 1153-2 du Code du travail</p>
<p>Aucune personne ayant subi ou refusé de subir des faits de harcèlement sexuel définis à l&#x27;article L. 1153-1, y compris, dans le cas mentionné au 1° du même article L. 1153-1, si les propos ou comportements n&#x27;ont pas été répétés, ou ayant, de bonne foi, témoigné de faits de harcèlement sexuel ou relaté de tels faits ne peut faire l&#x27;objet des mesures mentionnées à l&#x27;article L. 1121-2. Les personnes mentionnées au premier alinéa du présent article bénéficient des protections prévues aux I et III de l&#x27;article 10-1 et aux articles 12 à 13-1 de la loi n° 2016-1691 du 9 décembre 2016 relative à la transparence, à la lutte contre la corruption et à la modernisation de la vie économique.</p>
<p>Article L. 1153-4 du Code du travail</p>
<p>Toute disposition ou tout acte contraire aux dispositions des articles L. 1153-1 et L. 1153-2 est nul.</p>
<p>Article L. 1153-5 du Code du travail</p>
<p>L’employeur prend toutes dispositions nécessaires en vue de prévenir les faits de harcèlement sexuel, d’y mettre un terme et de les sanctionner. Dans les lieux de travail ainsi que dans les locaux ou à la porte des locaux où se fait l’embauche, les personnes mentionnées à l’article L. 1153-2 sont informées par tout moyen du texte de l’article 222-33 du Code pénal ainsi que des actions contentieuses civiles et pénales ouvertes en matière de harcèlement sexuel et des coordonnées des autorités et services compétents. La liste de ces services est définie par décret.</p>
<p>Article L. 1153-5-1 du Code du travail</p>
<p>Dans toute entreprise employant au moins deux cent cinquante salariés est désigné un référent chargé d’orienter, d’informer et d’accompagner les salariés en matière de lutte contre le harcèlement sexuel et les agissements sexistes.</p>
<p>Article L. 2314-1, dernier alinéa, du Code du travail</p>
<p>Un référent en matière de lutte contre le harcèlement sexuel et les agissements sexistes est désigné par le comité social et économique parmi ses membres, sous la forme d’une résolution adoptée selon les modalités définies à l’article L. 2315-32, pour une durée qui prend fin avec celle du mandat des membres élus du comité.</p>
<p>Article L. 1153-6 du Code du travail</p>
<p>Tout salarié ayant procédé à des faits de harcèlement sexuel est passible d’une sanction disciplinaire.</p>
<p>Article D. 1151-1 du Code du travail</p>
<p>L’information prévue au second alinéa de l’article L. 1153-5 précise l’adresse et le numéro d’appel : 1° Du médecin du travail ou du service de santé au travail compétent pour l’établissement ; 2° De l’inspection du travail compétente ainsi que le nom de l’inspecteur compétent ; 3° Du Défenseur des droits ; 4° Du référent prévu à l’article L. 1153-5-1 dans toute entreprise employant au moins deux cent cinquante salariés ; 5° Du référent prévu à l’article L. 2314-1 lorsqu’un comité social et économique existe.</p>
<h3>4.4. Actions en justice</h3>
<p>Article L. 1154-1 du Code du travail</p>
<p>Lorsque survient un litige relatif à l’application des articles L. 1152-1 à L. 1152-3 et L. 1153-1 à L. 1153-4, le candidat à un emploi, à un stage ou à une période de formation en entreprise ou le salarié présente des éléments de faits laissant supposer l’existence d’un harcèlement. Au vu de ces éléments, il incombe à la partie défenderesse de prouver que ces agissements ne sont pas constitutifs d’un tel harcèlement et que sa décision est justifiée par des éléments objectifs étrangers à tout harcèlement. Le juge forme sa conviction après avoir ordonné, en cas de besoin, toutes les mesures d’instruction qu’il estime utiles.</p>
<p>Article L. 1154-2 du Code du travail</p>
<p>Les organisations syndicales représentatives dans l’entreprise peuvent exercer en justice toutes les actions résultant des articles L. 1152-1 à L. 1152-3 et L. 1153-1 à L. 1153-4. Elles peuvent exercer ces actions en faveur d’un salarié de l’entreprise dans les conditions prévues par l’article L. 1154-1, sous réserve de justifier d’un accord écrit de l’intéressé. L’intéressé peut toujours intervenir à l’instance engagée par le syndicat et y mettre fin à tout moment.</p>
<h3>4.5. Dispositions pénales</h3>
<p>Article L. 1155-1 du Code du travail</p>
<p>Le fait de porter ou de tenter de porter atteinte à l’exercice régulier des fonctions de médiateur, prévu à l’article L. 1152-6, est puni d’un emprisonnement d’un an et d’une amende de 3 750 euros.</p>
<p>Article L. 1155-2 du Code du travail</p>
<p>Sont punis d’un an d’emprisonnement et d’une amende de 3 750 euros les faits de discriminations commis à la suite d’un harcèlement moral ou sexuel définis aux articles L. 1152-2, L. 1153-2 et L. 1153-3 du présent Code. La juridiction peut également ordonner, à titre de peine complémentaire, l’affichage du jugement aux frais de la personne condamnée dans les conditions prévues à l’article 131-35 du Code pénal et son insertion, intégrale ou par extraits, dans les journaux qu’elle désigne. Ces frais ne peuvent excéder le montant maximum de l’amende encourue.</p>
<h2 id="ri-5">Article 5 – Dispositions communes au harcèlement moral, au harcèlement sexuel et à la violence au travail, en application des articles 3 et 5 de l’accord interprofessionnel du 26 mars 2010</h2>
<h3>5.1. Principe</h3>
<p>Les actes constitutifs de harcèlement sexuel, de harcèlement moral et de violence au travail ne sont pas admis dans l’entreprise.</p>
<h3>5.2. Procédure</h3>
<p>Le salarié victime d’actes constitutifs de harcèlement moral, de harcèlement sexuel ou de violence au travail informe par écrit l’employeur des éléments suivants : 1° La description précise des faits dont le salarié estime être la victime ; 2° Leurs date ; 3° L’identité de la ou des personnes qui seraient impliquées dans ces faits ; 4° L’éventuel dépôt d’une plainte.</p>
<p>Dès réception de ce courrier, l’employeur engage une enquête contradictoire afin de vérifier les faits et de prendre, le cas échéant, les mesures qui s’imposent.</p>
<p>Pendant cette enquête, l’employeur veille à ce que le salarié victime soit soustrait à tout risque de faits nouveaux.</p>
<h3>5.3. Sanctions</h3>
<p>Les sanctions applicables aux auteurs d’agissements sexistes, de harcèlement moral, de harcèlement sexuel ou de violence au travail sont celles prévues à l’article 3.1 du présent règlement intérieur.</p>
<p>Les fausses accusations délibérées ne doivent pas être tolérées, et peuvent entraîner les mesures disciplinaires prévues à l’article 3.1 du présent règlement intérieur.</p>
<h2 id="ri-6">Article 6 – Dispositif de protection applicable aux lanceurs d’alerte</h2>
<p>Le salarié ayant signalé ou divulgué des informations dans les conditions de la loi n° 2016-1691 du 9 décembre 2016 dite Sapin II, modifiée par la loi n° 2022-401 du 21 mars 2022, bénéficie de la protection prévue au chapitre Il de la loi Sapin II. Sera reconnue comme lanceur d&#x27;alerte la personne physique qui signale ou divulgue, sans contrepartie financière directe et de bonne foi, des informations portant sur un crime, un délit, une menace ou un préjudice pour l’intérêt général, une violation ou une tentative de dissimulation d’une violation du droit international ou de l’Union européenne, de la loi ou du règlement. Les informations doivent porter sur des faits qui se sont produits ou pour lesquels il existe une forte probabilité qu&#x27;ils se produisent. Il pourra s&#x27;agir notamment de faits de harcèlement moral ou sexuel.</p>
<h2 id="ri-7">Article 7 – Neutralité</h2>
<p>Tout acte de prosélytisme dans l’entreprise, défini comme le zèle ardent pour recruter des adeptes et pour tenter d’imposer ses convictions, notamment religieuses, politiques ou philosophiques, est interdit.</p>
<p>En cas de non-respect de ces dispositions, l’employeur pourra prononcer l’une des sanctions prévues par le présent règlement intérieur.</p>
<h2 id="ri-8">Article 8 – Entrée en vigueur</h2>
<p>Le présent règlement intérieur entrera en vigueur le 1er mars 2026.</p>
<p>Il annule et remplace le règlement intérieur précédent établi en date du 03 janvier 2022.</p>
<p>Il a préalablement été soumis pour avis aux membres du comité social et économique en date du 12 décembre 2025.</p>
<h2 id="ri-9">Article 9 – Publicité et dépôt</h2>
<p>Le présent règlement intérieur fera l’objet d’un dépôt au secrétariat-greffe du Conseil de prud’hommes de Rennes, conformément aux dispositions de l’article R. 1321-2 du Code du travail.</p>
<p>Il sera transmis en double exemplaire à l’inspecteur du travail de Rennes, accompagné de l’avis du comité social et économique conformément aux dispositions des articles L. 1321-4 et R. 1321-4 du Code du travail.</p>
<p>Il est porté, par tout moyen, à la connaissance des personnes ayant accès aux lieux de travail ou aux locaux où se fait l’embauche, conformément aux dispositions de l’article R. 1321-1 du Code du travail.</p>
<h2 id="ri-10">Article 10 – Modifications</h2>
<p>Les modifications, adjonctions ou retraits ultérieurs apportés au présent règlement, seront soumis aux mêmes formalités de consultation, de publicité et dépôt, conformément aux dispositions de l’article L. 1321-4 du Code du travail.</p>
<p>Je reconnais avoir pris connaissance du règlement intérieur de l’entreprise SCR et m’engage, sans réserve à le respecter.</p>$doc$))
on conflict (kind, id) do update set data = public.registre.data || excluded.data, updated_at = now();
insert into public.registre(kind, id, data) values ('doc', 'accueil_entreprise', jsonb_build_object(
  'kind', 'accueil_entreprise', 'title', 'Accueil sécurité nouvel arrivant', 'version', 'v1 (provisoire)', 'at', '2026-10-09', 'by', 'QHSE', 'active', true, 'req', jsonb_build_object('all', true),
  'intro', 'À remplir une fois, à l’arrivée dans l’entreprise (embauche ou début de mission d’intérim) : tu confirmes point par point que l’accueil, notamment sécurité, t’a bien été fait. Si un point n’a pas été fait, ne le coche pas et dis-le à ton chef de chantier ou aux RH.',
  'qs', '["L’entreprise SCR (réseaux de chaleur en acier pré-isolé), son organisation (direction, exploitation, conducteurs de travaux, chefs de chantier) et mon secteur m’ont été présentés.", "J’ai reçu, lu et signé le règlement intérieur ; la politique santé-sécurité de l’entreprise m’a été expliquée.", "Mon contrat ou ma mission, mes horaires, le fonctionnement des grands déplacements (4 cas) et de l’hébergement m’ont été expliqués.", "Mes EPI m’ont été remis (casque, lunettes, gants, chaussures S3, vêtements haute visibilité, protections auditives, masque et cuir de soudeur si soudeur) et je sais les entretenir et les faire remplacer.", "Mon aptitude médicale est à jour et j’ai transmis mes habilitations et formations (AIPR, CACES, qualifications soudeur, SST, habilitation électrique, carte BTP). Intérimaire : mon agence les a transmises à SCR.", "Les consignes générales de sécurité m’ont été expliquées : droit d’alerte et de retrait, interdiction alcool / stupéfiants, téléphone au poste, interdiction de fumer près des produits inflammables.", "Je sais quoi faire en cas d’accident ou d’incident (SST, 18 / 112, prévenir le conducteur de travaux, déclaration sous 24 h).", "Les règles d’utilisation du véhicule de service m’ont été présentées (permis, documents de bord, contrôle visuel, trousse de secours, extincteur, kit anti-pollution, usage strictement professionnel).", "L’application TRACÉ m’a été présentée : pointage, fiches de soudure, accueil chantier, documents à signer, mon espace.", "Je sais à qui m’adresser : chef de chantier, conducteur de travaux, responsable d’exploitation, service RH."]'::jsonb))
on conflict (kind, id) do update set data = public.registre.data || excluded.data, updated_at = now();

-- fiche chantier : + partie « missions » (objectifs de la journée) — même fonction qu'en espace_v2, une partie de plus
create or replace function public.site_set_part(p_site text, p_key text, p_value jsonb) returns jsonb
language plpgsql security definer set search_path = public as $$
declare t_at timestamptz := now(); v_old jsonb; v_new jsonb; v_arr jsonb;
begin
  if not public.is_active() then raise exception 'compte inactif'; end if;
  if p_key in ('conv','stock','extraWelds','qse','pointage','undoLog','dhData') then
    null; -- tout compte actif
  elsif p_key in ('elPos','hydro','phasage','ts','marche','admin','dossier','fiche','missions') then -- missions (v6) : objectifs de la journée par chantier (chef de chantier / conducteur)
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

-- fiche personne : + parties « adresse » (domicile : voie, cp, ville — grands déplacements) et « emploi » (intitulé RH)
create or replace function public.people_set_part(p_key text, p_part text, p_value jsonb) returns jsonb
language plpgsql security definer set search_path = public as $$
declare v_old jsonb; v_new jsonb; v_data jsonb; mine boolean; mgr boolean;
begin
  if not public.is_active() then raise exception 'compte inactif'; end if;
  mine := lower(p_key) = coalesce(public.my_key(), '');
  mgr := public.is_admin() or coalesce(public.my_role(),'') in ('chef','bureau');
  if p_part in ('avatar','urgence') then
    if not (mine or mgr) then raise exception 'réservé à la personne elle-même'; end if;
  elsif p_part in ('tel','entree','contrat','habs','docs','compteurs','poste_avatar','secteur','adresse','emploi') then
    if not mgr then raise exception 'réservé au chef / bureau (RH)'; end if;
  else
    raise exception 'partie inconnue : %', p_part;
  end if;
  insert into public.people(key, data, updated_by) values (lower(p_key), '{}'::jsonb, auth.uid()) on conflict (key) do nothing;
  select data into v_data from public.people where key = lower(p_key) for update;
  v_old := v_data->p_part;
  if p_part in ('avatar','compteurs') and jsonb_typeof(v_old) = 'object' and jsonb_typeof(p_value) = 'object' then v_new := v_old || p_value; else v_new := p_value; end if;
  update public.people set data = jsonb_set(coalesce(v_data,'{}'::jsonb), array[p_part], coalesce(v_new,'null'::jsonb), true), updated_at = now(), updated_by = auth.uid() where key = lower(p_key);
  return jsonb_build_object('at', now(), 'value', v_new);
end $$;

-- vérification
select 'registre' as objet, count(*) from public.registre
union all select 'documents', count(*) from public.registre where kind = 'doc'
union all select 'fonctions', count(*) from pg_proc where proname in ('registre_set','site_set_part','people_set_part','my_key');
