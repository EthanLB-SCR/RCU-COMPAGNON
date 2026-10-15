// 14/10 soir (lot M2) — bibliothèque de mémoire FICTIVE pour e2e_memoire_m2 (aucune donnée SCR réelle, textes écrits pour le test) : liste d'annexes à puces
// (section « Annexes », une puce en réserve) + 3 renvois « n° d'annexe » (texte entre « … », phrase), tableau de personnes avec « téléphone et e-mail » par ligne,
// renvoi « [conducteur] au [téléphone] », pièces avec « référence et indice du document » (après « – », entre parenthèses), trous facultatifs (« le cas échéant »,
// « si exigé », adresse du maître d'ouvrage / d'œuvre), un libellé facultatif à une place où la phrase serait fausse sans lui (reste rouge), valeurs d'entreprise
// (chiffre d'affaires, effectif, garantie, validité, prestataire), « agence et adresse », libellés avec « ex. … », tableau à deux lignes avec des libellés répétés
// (pas d'office), fronts, purges, vidanges, radio feeder / antennes, zones, raccordements, lot, visite, SAV.
const T=(lab)=>`[[À COMPLÉTER : ${lab}]]`;
export const FAKE_M2_BLOCS=[
  {id:'n-ident',section:'Présentation test M2',titre:'Identité test',ordre:10,paragraphes:[
    {id:'n-ident-1',html:`<p>Société fictive de test. Bureau responsable du dossier : ${T('agence et adresse')}</p>`,defaut:true},
    {id:'n-ident-2',html:`<p>La brochure est fournie à part : annexe ${T('n° d’annexe')} « Livret de présentation fictif ».</p>`,defaut:true}]},
  {id:'n-chiffres',section:'Présentation test M2',titre:'Chiffres test',ordre:20,paragraphes:[
    {id:'n-chif-1',html:`<p>Données clés (fictives) — chiffre d’affaires : ${T('chiffre d’affaires annuel en M€')} M€, effectif : ${T('effectif total')} salariés.</p>`,defaut:true},
    {id:'n-chif-2',html:`<p>Voir l’organigramme nominatif fictif en annexe ${T('n° d’annexe')}.</p>`,defaut:true}]},
  {id:'n-acteurs',section:'Appel d’offres test M2',titre:'Acteurs test',ordre:30,paragraphes:[
    {id:'n-act-1',html:`<p><b>Maître d’ouvrage</b> : {{client}} ${T('adresse et téléphone du maître d’ouvrage')}</p>`,defaut:true},
    {id:'n-act-2',html:`<p><b>Maître d’œuvre</b> : ${T('nom du maître d’œuvre')} ${T('adresse et téléphone du maître d’œuvre')}</p>`,defaut:true},
    {id:'n-act-3',html:`<p>Coordination sécurité : ${T('nom du coordinateur sécurité')}</p><p><b>Contrôleur technique :</b> ${T('nom du contrôleur technique, le cas échéant')}</p>`,defaut:true}]},
  {id:'n-docs',section:'Appel d’offres test M2',titre:'Pièces test',ordre:40,paragraphes:[
    {id:'n-docs-1',html:`<ul><li>Pièce fictive A – ${T('référence et indice du document')}</li></ul>`,defaut:true},
    {id:'n-docs-2',html:`<ul><li>Pièce fictive B – ${T('référence et indice du document')}</li></ul>`,defaut:true},
    {id:'n-docs-3',html:`<ul><li>Plans fictifs (${T('référence et indice du document')})</li></ul>`,defaut:true}]},
  {id:'n-carac',section:'Appel d’offres test M2',titre:'Découpage test',ordre:50,paragraphes:[
    {id:'n-tr-1',html:`<table><tr><th>Partie</th><th>Longueur</th><th>Postes</th></tr><tr><td>Partie ferme fictive</td><td>${T('linéaire en ml')} ml</td><td>${T('nombre de sous-stations')}</td></tr><tr><td>Partie optionnelle fictive</td><td>${T('linéaire en ml')} ml</td><td>${T('nombre de sous-stations')}</td></tr><tr><td>Ensemble</td><td>{{ml}} ml</td><td>${T('nombre total de sous-stations')}</td></tr></table>`,defaut:true},
    {id:'n-tr-2',html:`<p>Le chantier fictif compte ${T('nombre de zones')} secteurs de travail : ${T('désignation et linéaire de chaque zone')}.</p>`,defaut:true}]},
  {id:'n-metho',section:'Méthodologie test M2',titre:'Organisation test',ordre:60,paragraphes:[
    {id:'n-fr-1',html:`<p>Jusqu’à ${T('nombre de fronts')} fronts ouverts en même temps (exemple fictif).</p>`,defaut:true},
    {id:'n-org-1',html:`<p>Accessoires fictifs : ${T('nombre de purges')} purges, ${T('nombre de vidanges')} vidanges en DN ${T('DN des vidanges')} ${T('par aspiration ou par gravité déportées')}.</p>`,defaut:true},
    {id:'n-rad-1',html:`<p>Taux de radio fictifs : feeder ${T('% feeder, ex. 20 %')}, antennes ${T('% des soudures d’antennes et de branchements, ex. 10 %')}, global (${T('taux de contrôle radiographique')}).</p>`,defaut:true},
    {id:'n-rad-2',html:`<p>Piquages fictifs sur l’existant : ${T('nombre et DN des raccordements')} ; radiographies par ${T('nom du prestataire de radiographie')}.</p>`,defaut:true},
    {id:'n-mat-1',html:`<p>Matériel : fiches techniques fictives en annexe ${T('n° d’annexe')}.</p>`,defaut:true}]},
  {id:'n-essais',section:'Méthodologie test M2',titre:'Essais test',ordre:70,paragraphes:[
    {id:'n-ess-1',html:`<ul><li>Traitement fictif des parois (${T('produit de passivation')})</li></ul>`,defaut:true},
    {id:'n-ess-2',html:`<p>Essai fictif : ${T('pression d’épreuve en bar')} bars tenus ${T('durée de l’essai, ex. 24 h')}.</p>`,defaut:true},
    {id:'n-ess-3',html:`<p>Rappel de la pression d’essai : ${T('pression d’épreuve en bar')} bars.</p>`,defaut:true},
    {id:'n-ess-4',html:`<p>Jonctions de type ${T('type de jonction, ex. thermorétractable ou électrosoudable')} sur ce chantier fictif.</p>`,defaut:true},
    {id:'n-ess-5',html:`<p>Nous utilisons ${T('produit de passivation')} sur ce chantier fictif.</p>`,defaut:true}]},
  {id:'n-humains',section:'Méthodologie test M2',titre:'Équipe test',ordre:80,paragraphes:[
    {id:'n-hum-1',html:`<table><tr><th>Rôle</th><th>Personne</th><th>Coordonnées</th></tr><tr><td>Exploitation</td><td>${T('nom du responsable d’exploitation')}</td><td>${T('téléphone et e-mail')}</td></tr><tr><td>Affaire</td><td>${T('nom du chargé d’affaires')}</td><td>${T('téléphone et e-mail')}</td></tr><tr><td>Chantier</td><td>${T('nom du chef de chantier')}</td><td>${T('téléphone et e-mail')}</td></tr><tr><td>Gestion</td><td>${T('nom de l’interlocuteur administratif')}</td><td>${T('téléphone et e-mail')}</td></tr></table>`,defaut:true},
    {id:'n-hum-2',html:`<p>Pendant les travaux, appelez ${T('nom du conducteur de travaux')} au ${T('téléphone')}.</p>`,defaut:true}]},
  {id:'n-fin',section:'Méthodologie test M2',titre:'Engagements test',ordre:90,paragraphes:[
    {id:'n-sav-1',html:`<p>Engagement fictif : ${T('durée de la garantie fictive')}. Après réception : ${T('nom et téléphone de l’interlocuteur SAV')}.</p>`,defaut:true},
    {id:'n-val-1',html:`<p>Prix fictifs fermes pendant ${T('durée de validité, ex. 4 mois')}.</p>`,defaut:true},
    {id:'n-ctr-1',html:`<p>Repérage fictif fait par ${T('visite du site du …, ou analyse sur plans')}. Client fictif {{client}}, en charge du lot ${T('lot du donneur d’ordre, ex. génie civil / VRD')}.</p>`,defaut:true},
    {id:'n-env-1',html:`<p>Bilan carbone fictif : ${T('bilan chiffré, si exigé par le client')}, calcul indicatif.</p>`,defaut:true},
    {id:'n-env-2',html:`<p>Point fictif propre à l’affaire : ${T('point fictif sans règle')}.</p>`,defaut:true}]},
  {id:'n-ann',section:'Annexes',titre:'Annexes',ordre:100,paragraphes:[
    {id:'n-ann-1',html:'<ul><li>Pièces administratives fictives</li></ul>',defaut:true},
    {id:'n-ann-2',html:'<ul><li>Livret de présentation fictif</li></ul>',defaut:true},
    {id:'n-ann-3',html:'<ul><li>Organigramme nominatif fictif</li></ul>',defaut:false},
    {id:'n-ann-4',html:'<ul><li>Fiches techniques fictives</li></ul>',defaut:true},
    {id:'n-ann-5',html:`<ul><li>Plans de détail fictifs : ${T('précision, le cas échéant')}</li></ul>`,defaut:true}]}];
export const FAKE_M2_ACCOUNTS=[['alain.charge','Alain','Chargé','charge_affaires'],['remi.ouest','Rémi','Ouest','resp_exploitation'],['iris.idf','Iris','Francilienne','resp_exploitation'],['cedric.c','Cédric','Conduite','conducteur'],
  ['charles.c','Charles','Chantier','chef'],['sam.s','Sam','Soudeur','soudeur'],['ada.a','Ada','Administrative','resp_admin_fin'],['quentin.q','Quentin','Qualité','autre']]
  .map(([e,p,n,po])=>({email:e+'@exemple.test',prenom:p,nom:n,poste:po,type:'salarie',active:true,id:'loc:'+e}));
