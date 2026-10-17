// 16/10 soir (lot AM) — bibliothèque de mémoire FICTIVE pour e2e_am_1610 (aucune donnée SCR réelle) : paragraphes à trous rouges, un bloc dont tous les paragraphes
// ont des trous (il doit disparaître du document et du sommaire), une section entière à trous, un trou facultatif (jamais compté, absent de l'export), un organigramme
// dont un rôle n'est pas choisi, des garanties d'assurance RC et décennale (variables des documents de l'entreprise) et la liste des documents de l'entreprise.
export const AM_BLOCS=[
  {id:'am-ident',section:'Présentation fictive',titre:'Identité fictive',ordre:10,paragraphes:[
    {id:'am-ident-1',html:'<p>Texte fictif de présentation, sans aucun trou.</p>',defaut:true},
    {id:'am-ident-2',html:'<p>Numéro fictif à préciser : [[À COMPLÉTER : numéro fictif ZQX]].</p>',defaut:true},
    {id:'am-ident-3',html:'<p>Plans fictifs du réseau ([[À COMPLÉTER : référence et indice du document]]).</p>',defaut:true}]},
  {id:'am-trous',section:'Méthodologie fictive',titre:'Bloc tout à trous',ordre:20,paragraphes:[
    {id:'am-trous-1',html:'<p>Premier paragraphe à trous : [[À COMPLÉTER : valeur fictive KWY]] puis [[À COMPLÉTER : autre valeur fictive]].</p>',defaut:true},
    {id:'am-trous-2',html:'<p>Second paragraphe à trou : {{varFictiveInconnue}}.</p>',defaut:true}]},
  {id:'am-ok',section:'Méthodologie fictive',titre:'Bloc sans trou',ordre:30,paragraphes:[
    {id:'am-ok-1',html:'<p>Méthode fictive complète, rien à compléter ici.</p>',defaut:true}]},
  {id:'am-equipe',section:'Méthodologie fictive',titre:'Moyens humains fictifs',ordre:40,paragraphes:[
    {id:'am-eq-1',type:'equipe',defaut:true,equipe:{poles:[{titre:'Pôle fictif',roles:[{k:'charge',label:'Chargé d’affaires',missions:['Contact fictif']},{k:'chef',label:'Chef de chantier',missions:['Encadrement fictif']}]}]}}]},
  {id:'am-sec',section:'Section toute à trous',titre:'Bloc unique à trou',ordre:50,paragraphes:[
    {id:'am-sec-1',html:'<p>Seul paragraphe de la section : [[À COMPLÉTER : donnée fictive PQR]].</p>',defaut:true}]},
  {id:'am-gar',section:'Garanties fictives',titre:'Assurances fictives',ordre:60,paragraphes:[
    {id:'am-gar-1',html:'<p>Responsabilité civile : {{assureurRc}}, police {{policeRc}}, valable jusqu’au {{validiteRc}}.</p>',defaut:true},
    {id:'am-gar-2',html:'<p>Décennale : {{assureurDec}}, police {{policeDec}}, valable jusqu’au {{validiteDec}}.</p>',defaut:true},
    {id:'am-gar-3',cond:'decennale',html:'<p>Attestation décennale fictive jointe au dossier.</p>',defaut:true},
    {id:'am-gar-4',html:'<p>Documents fictifs joints :</p>{{docsEntreprise}}',defaut:true}]},
  {id:'am-fin',section:'Conclusion fictive',titre:'Fin fictive',ordre:70,paragraphes:[
    {id:'am-fin-1',html:'<p>Conclusion fictive sans trou.</p>',defaut:true}]}];
/* valeurs qui bouchent tous les trous rouges (contrôle « sans trou : pas de fenêtre ») — clés des trous : <paragraphe>|<libellé>|<rang> ; variables : {{nom}} */
export const AM_FILL={'am-ident-2|numéro fictif ZQX|0':'NUM-FICTIF-7','am-trous-1|valeur fictive KWY|0':'VAL-FICTIVE-1','am-trous-1|autre valeur fictive|0':'VAL-FICTIVE-2','{{varFictiveInconnue}}':'VAR-FICTIVE-3','am-sec-1|donnée fictive PQR|0':'DONNEE-FICTIVE-4'};
