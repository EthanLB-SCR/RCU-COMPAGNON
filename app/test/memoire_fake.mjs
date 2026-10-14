// 14/10 nuit — bibliothèque de mémoire FICTIVE pour les tests (aucune donnée SCR réelle) : 3 sections, 5 blocs, 12 paragraphes (9 cochés par défaut),
// variables {{nom}} {{client}} {{ville}} {{delai}}, 3 trous [[À COMPLÉTER : …]] ; gabarit fictif (couleurs inventées, pour vérifier que l'export suit le pack).
export const FAKE_BLOCS=[
  {id:'t-objet',section:'Présentation de l’offre',titre:'Objet de la consultation',ordre:10,paragraphes:[
    {id:'t-objet-1',titre:'',html:'<p><b>Objet :</b> {{nom}} – {{ville}}</p>',defaut:true},
    {id:'t-objet-2',titre:'',html:'<p>Offre remise à {{client}} pour le lot de pose.</p>',defaut:false}]},
  {id:'t-acteurs',section:'Présentation de l’offre',titre:'Acteurs du projet',ordre:20,paragraphes:[
    {id:'t-acteurs-1',titre:'',html:'<table><tr><th>Rôle</th><th>Organisme</th></tr><tr><td>Maître d’ouvrage</td><td>{{client}}</td></tr><tr><td>Maître d’œuvre</td><td>[[À COMPLÉTER : nom du maître d’œuvre]]</td></tr></table>',defaut:true},
    {id:'t-acteurs-2',titre:'',html:'<ul><li>Équipe de pose dédiée</li></ul>',defaut:true},
    {id:'t-acteurs-3',titre:'',html:'<ul><li>Encadrement présent sur le chantier</li></ul>',defaut:true}]},
  {id:'t-soudage',section:'Méthodologie',titre:'Soudage des tubes',ordre:30,paragraphes:[
    {id:'t-soudage-1',titre:'Qualification des soudeurs',html:'<p>Les soudeurs sont qualifiés selon la norme en vigueur.</p>',defaut:true},
    {id:'t-soudage-2',titre:'',html:'<p>Épreuve à [[À COMPLÉTER : pression d’épreuve en bar]] bar pendant deux heures.</p>',defaut:false},
    {id:'t-soudage-3',titre:'',html:'<ol><li>Préparation des chanfreins</li><li>Pointage et soudage</li></ol>',defaut:true}]},
  {id:'t-controles',section:'Méthodologie',titre:'Contrôles',ordre:40,paragraphes:[
    {id:'t-controles-1',titre:'',html:'<p>Le conducteur de travaux, [[À COMPLÉTER : nom du conducteur de travaux]], valide chaque contrôle.</p>',defaut:true},
    {id:'t-controles-2',titre:'',html:'<p>Délai d’exécution proposé : {{delai}}.</p>',defaut:false}]},
  {id:'t-annexes',section:'Annexes',titre:'Liste des annexes',ordre:50,paragraphes:[
    {id:'t-annexes-1',titre:'',html:'<h4>Étape 1 – Réception</h4><p>Contrôle visuel des éléments livrés.</p>',defaut:true},
    {id:'t-annexes-2',titre:'',html:'<p>Fin du mémoire de {{nom}}.</p>',defaut:true}]}];
export const FAKE_STYLE={fonts:{body:'Calibri',fallbacks:{Calibri:'Calibri, Carlito, Arial, sans-serif'}},colors:{titre2:'#123456',titre3:'#654321',aCompleter:'#EE0000',orangeSCR:'#F15921',puce:'#AA0011'},
  body:{font:'Calibri',sizePt:12,color:'#000000',lineHeight:1.15},h1:{sizePt:16,bold:true,caps:true,underline:'single',color:'#000000',pageBreakBefore:true},h2:{sizePt:16,smallCaps:true,color:'#123456'},h3:{sizePt:13,color:'#654321'},
  table:{default:{header:{fill:'#FF6601',color:'#000000'},bandedRows:{odd:'#FABF8E',even:'#FFFFFF'},border:{color:'#D99594',widthPt:0.5}}},bullets:{level1:{char:'▪',color:'#AA0011'}},cover:{blocs:[{ordre:5,lignes:['MÉMOIRE','TECHNIQUE TEST']}]}};
