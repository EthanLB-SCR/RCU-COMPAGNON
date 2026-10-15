// 14/10 soir (lot M1) — bibliothèque de mémoire FICTIVE pour e2e_memoire_m1 (aucune donnée SCR réelle) : elle reproduit les cas du cochage simplifié —
// bloc avec paragraphes cochés d'office + ajouts à relire (m-ident), bloc SANS aucun paragraphe par défaut avec un groupe de variantes « avec image » /
// « texte seul » (m-visu), bloc-liste de 10 puces dont une à condition « dce » et 3 ajouts (m-presta), variantes « documents fournis / documents du dossier »
// dans un bloc par défaut (m-docs, avec un trou), bloc dont le seul paragraphe par défaut est décoché d'office par une condition (m-dech : « dce »),
// section ENTIÈRE en réserve (m-ctrl, m-essai), petite section d'annexes (m-ann). 26 paragraphes, 12 cochés par défaut (10 sans pièce du DCE), 1 trou.
const V_TXT='Nos équipes fictives interviennent sur tout le territoire de test avec des moyens dédiés';
export const FAKE_M1_BLOCS=[
  {id:'m-ident',section:'Présentation test',titre:'Identité test',ordre:10,paragraphes:[
    {id:'m-ident-1',html:'<p>Entreprise fictive de pose de réseaux, créée pour les essais.</p>',defaut:true},
    {id:'m-ident-2',html:'<p>Ajout à relire : historique fictif de l’entreprise test.</p>',defaut:false}]},
  {id:'m-visu',section:'Présentation test',titre:'Visuels test',ordre:20,paragraphes:[
    {id:'m-visu-1',type:'image',img:'img-m1',cote:'gauche',largeur:30,html:`<p>${V_TXT} (version avec image).</p>`,defaut:false},
    {id:'m-visu-2',html:`<p>${V_TXT} (version texte seul).</p>`,defaut:false},
    {id:'m-visu-3',html:'<p>Engagement fictif numéro un : chantier propre et sécurisé.</p>',defaut:false},
    {id:'m-visu-4',html:'<p>Engagement fictif numéro deux : délais tenus.</p>',defaut:false}]},
  {id:'m-presta',section:'Méthodologie test',titre:'Prestations test',ordre:30,paragraphes:Array.from({length:10},(_,i)=>Object.assign({id:'m-presta-'+(i+1),html:`<ul><li>Prestation fictive n° ${i+1}${i===6?' (si pièces du DCE)':''}</li></ul>`,defaut:i<7},i===6?{cond:'dce'}:{}))},
  {id:'m-docs',section:'Méthodologie test',titre:'Documents test',ordre:40,paragraphes:[
    {id:'m-docs-1',html:'<p>Notre offre fictive est établie sur la base des documents fournis par le client test.</p>',defaut:true},
    {id:'m-docs-2',html:'<p>Notre offre fictive est établie sur la base des documents du dossier de consultation test.</p>',defaut:false},
    {id:'m-docs-3',html:'<p>Référence du dossier : [[À COMPLÉTER : référence fictive du dossier]].</p>',defaut:true}]},
  {id:'m-dech',section:'Méthodologie test',titre:'Déchargement test',ordre:45,paragraphes:[
    {id:'m-dech-1',cond:'dce',html:'<p>Déchargement fictif des tubes au pied de la tranchée.</p>',defaut:true}]},
  {id:'m-ctrl',section:'Réserve test',titre:'Contrôles test',ordre:50,paragraphes:[
    {id:'m-ctrl-1',html:'<p>Contrôle visuel fictif de chaque soudure.</p>',defaut:false},
    {id:'m-ctrl-2',html:'<p>Contrôle radiographique fictif selon le marché.</p>',defaut:false},
    {id:'m-ctrl-3',html:'<p>Procès-verbal fictif remis en fin de chantier.</p>',defaut:false}]},
  {id:'m-essai',section:'Réserve test',titre:'Essais test',ordre:60,paragraphes:[
    {id:'m-essai-1',html:'<p>Épreuve hydraulique fictive.</p>',defaut:false},
    {id:'m-essai-2',html:'<p>Rinçage fictif du réseau.</p>',defaut:false}]},
  {id:'m-ann',section:'Annexes test',titre:'Annexes test',ordre:70,paragraphes:[{id:'m-ann-1',html:'<p>Liste fictive des annexes.</p>',defaut:true}]}];
/* une image fictive (dessinée : 4 × 3 pixels gris) */
export const FAKE_M1_IMAGES={'img-m1':{data:'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAQAAAADCAIAAAA7ljmRAAAADklEQVR4nGNYgAQYcHIAtvYWgfQ6ACoAAAAASUVORK5CYII=',w:400,h:300,titre:'Carte fictive'}};
