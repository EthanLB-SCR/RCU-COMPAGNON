// 14/10 après-midi (lot B) — bibliothèque de mémoire FICTIVE pour e2e_memoire4 (aucune donnée SCR réelle) : paragraphes image (les images sont dessinées
// dans le test), organigramme « Moyens humains » (type equipe), conditions d'après le chiffrage (cond), variables calculées (listes générées, équipes,
// interlocuteurs, assurance), trous remplis d'office (e-mail de contact, maître d'œuvre), une section sans rien de coché, une longue section pour défiler.
const LONG=i=>`<p>Paragraphe d’exemple n° ${i} : texte fictif écrit pour remplir la page et vérifier le défilement du mémoire, la navigation des trous et l’estimation du nombre de pages. Il ne contient aucune information réelle et peut être lu sans conséquence.</p>`;
export const FAKE4_BLOCS=[
  {id:'f-ident',section:'Présentation de l’entreprise test',titre:'Identité',ordre:10,paragraphes:[
    {id:'f-ident-1',html:'<p><b>Entreprise Test</b></p><p>E-mail : [[À COMPLÉTER : e-mail de contact]]</p><p>Téléphone : {{chargeTel}}</p>',defaut:true}]},
  {id:'f-visuels',section:'Présentation de l’entreprise test',titre:'Visuels',ordre:20,paragraphes:[
    {id:'f-vis-1',type:'image',img:'img-carte',legende:'Carte des agences (fictive)',largeur:60,defaut:true},
    {id:'f-vis-2',type:'image',img:'img-ico',cote:'gauche',largeur:16,html:'<p><b>20 équipes</b> à disposition (chiffre fictif).</p>',defaut:true},
    {id:'f-vis-3',type:'image',img:'img-photo',legende:'Photo facultative',defaut:false}]},
  {id:'f-acteurs',section:'Présentation de l’appel d’offres test',titre:'Acteurs du projet',ordre:30,paragraphes:[
    {id:'f-act-1',html:'<p><b>Maître d’œuvre :</b> [[À COMPLÉTER : nom du maître d’œuvre]]</p>',defaut:true}]},
  {id:'f-docs',section:'Présentation de l’appel d’offres test',titre:'Documents de référence',ordre:40,paragraphes:[
    {id:'f-docs-1',html:'<p>Notre proposition est basée sur les pièces du DCE, dont principalement :</p>',defaut:true},
    {id:'f-docs-2',cond:'dce',html:'{{docsDce}}',defaut:true},
    {id:'f-docs-3',cond:'!dce',html:'<ul><li>Pièces du dossier de consultation – [[À COMPLÉTER : référence du dossier]]</li></ul>',defaut:true}]},
  {id:'f-desc',section:'Méthodologie test',titre:'Description de la prestation',ordre:50,paragraphes:[
    {id:'f-desc-1',html:'<p>Les prestations confiées à l’entreprise seront les suivantes :</p>',defaut:true},
    {id:'f-desc-2',cond:'multizones',html:'{{prestationsZones}}',defaut:true},
    {id:'f-desc-3',cond:'soudure',html:'{{listeDn}}',defaut:true},
    {id:'f-desc-4',cond:'decharg',html:'<ul><li>Déchargement des éléments préisolés</li></ul>',defaut:true},
    {id:'f-desc-5',cond:'sst',html:'<ul><li>Pose de {{nbSst}} paires de vannes en sous-station</li></ul>',defaut:true},
    {id:'f-desc-6',cond:'vidanges',html:'<ul><li>Pose de vidanges DN {{vidangesDn}} ({{vidangesPaires}} paires)</li></ul>',defaut:true},
    {id:'f-desc-7',cond:'radio',html:'<ul><li>Contrôle radiographique de {{radioPct}} des soudures</li></ul>',defaut:true},
    {id:'f-desc-8',cond:'boulet',html:'<ul><li>Passage du boulet mousse</li></ul>',defaut:true}]},
  {id:'f-hors',section:'Méthodologie test',titre:'Hors prestations',ordre:60,paragraphes:[
    {id:'f-hors-1',html:'<ul><li>Travaux de génie civil (fictif)</li></ul>',defaut:true},
    {id:'f-hors-2',cond:'!decharg',html:'<ul><li>Déchargement des éléments préisolés</li></ul>',defaut:true},
    {id:'f-hors-3',cond:'!boulet',html:'<ul><li>Passage du boulet mousse</li></ul>',defaut:true},
    {id:'f-hors-4',cond:'!radio',html:'<ul><li>Contrôles radiographiques</li></ul>',defaut:true}]},
  {id:'f-equipe',section:'Méthodologie test',titre:'Moyens humains',ordre:70,paragraphes:[
    {id:'f-eq-1',type:'equipe',defaut:true,equipe:{poles:[{titre:'Pôle administratif test',roles:[{k:'re',label:'Responsable exploitation',ico:'img-ico',missions:['Supervision générale (fictif)']},{k:'qhse',label:'QHSE',missions:['Qualité et sécurité (fictif)']},{k:'charge',label:'Chargé d’affaires',missions:['Contact commercial']}]},
      {titre:'Pôle exécution test',roles:[{k:'cdtx',label:'Conducteur de travaux'},{k:'chef',label:'Chef d’équipe'},{k:'ops',label:'Opérateurs',missions:['Équipe complète (texte fictif)']}]}]}}]},
  {id:'f-plan',section:'Méthodologie test',titre:'Planning prévisionnel',ordre:80,paragraphes:[
    {id:'f-plan-1',html:'<p>Nous prévoyons <b>{{nbEquipes}} équipe(s)</b> : {{jS}} jours de soudage sur {{joursOuvres}} jours ouvrés.</p>',defaut:true},
    {id:'f-plan-2',cond:'chiffrage',html:'{{datesZones}}',defaut:true}]},
  {id:'f-gar',section:'Garanties test',titre:'Assurances',ordre:90,paragraphes:[
    {id:'f-gar-1',html:'<p>Assurance responsabilité civile : {{assureurRc}}, police n° {{policeRc}}, valable jusqu’au {{validiteRc}}.</p>',defaut:true}]},
  {id:'f-vide',section:'Section sans choix',titre:'Rien par défaut',ordre:100,paragraphes:[{id:'f-vide-1',html:'<p>Paragraphe facultatif.</p>',defaut:false}]},
  {id:'f-long',section:'Annexes longues',titre:'Texte long',ordre:110,paragraphes:Array.from({length:16},(_,i)=>({id:'f-long-'+(i+1),html:LONG(i+1)+(i===2?'<p>Point à préciser : [[À COMPLÉTER : point fictif A]].</p>':i===13?'<p>Autre point : [[À COMPLÉTER : point fictif B]].</p>':''),defaut:true}))},
  {id:'f-fin',section:'Annexes longues',titre:'Bloc final',ordre:120,paragraphes:[{id:'f-fin-1',html:'<p>Bloc final ajouté à la main.</p>',defaut:false},{id:'f-fin-2',html:'<p>Second paragraphe du bloc final.</p>',defaut:false}]}];
export const FAKE4_ACCOUNTS=[['alain.charge','Alain','Chargé','charge_affaires'],['remi.ouest','Rémi','Ouest','resp_exploitation'],['iris.idf','Iris','Francilienne','resp_exploitation'],['quentin.q','Quentin','Qualité','autre'],
  ['cedric.c','Cédric','Conduite','conducteur'],['charles.c','Charles','Chantier','chef'],['sam.s','Sam','Soudeur','soudeur'],['mia.m','Mia','Manchon','manchonneur'],['paul.p','Paul','Pelle','chauffeur_engin'],['ada.a','Ada','Administrative','resp_admin_fin']]
  .map(([e,p,n,po])=>({email:e+'@exemple.test',prenom:p,nom:n,poste:po,type:'salarie',active:true,id:'loc:'+e}));
export const FAKE4_DCE=[{id:'d1',name:'01-RC Reglement de consultation.pdf',catKey:'rc'},{id:'d2',name:'02-CCTP Reseau test.pdf',catKey:'cctp',notes:[{texte:'Série 2 imposée',dests:['memoire','chiffrage']},{texte:'Radio 10 % demandée',dests:['memoire']}]},
  {id:'d3',name:'03-DPGF test.xlsx',catKey:'dpgf'},{id:'d4',name:'04-CCAP test.pdf',catKey:'ccap'},{id:'d5',name:'05-Notice des travaux.pdf',catKey:'autre',notes:[{texte:'Accès chantier étroit',dests:['risque']}]},
  ...Array.from({length:6},(_,i)=>({id:'p'+(i+1),name:'PLAN-0'+(i+1)+' Trace test.pdf',catKey:'plans'})),{id:'d12',name:'Planning previsionnel test.pdf',catKey:'planning'},{id:'d13',name:'Annexe divers.pdf',catKey:'autre'},{id:'d14',name:'Courrier client.pdf',catKey:'courrier'},{id:'d15',name:'Photo du site.jpg',catKey:'autre'}];
