// 14/10 soir (lot M3) — bibliothèque de mémoire FICTIVE pour e2e_memoire_pdf (aucune donnée SCR réelle) : celle de e2e_memoire4 (images, organigramme,
// listes, trous) + un tableau (en-tête, bandes, cellule fusionnée), une liste numérotée, un titre h4, des mises en forme (gras, italique, souligné, exposant,
// indice, entités HTML, balises écrites en toutes lettres), une section « HSE » (texte justifié), une image WebP et une image SVG (converties en PNG),
// une image illisible (ignorée), une image à droite du texte ;
// + bigBlocs(n, k) : grosse bibliothèque générée (n paragraphes dont k images) pour mesurer le temps de génération du PDF ;
// + trapBlocs(seed) : beaucoup de petits blocs titrés de longueurs variées (titres, tableaux, images) pour piéger les titres seuls en bas de page.
import {FAKE4_BLOCS} from './memoire_fake4.mjs';
const HSE='Texte HSE fictif, écrit pour occuper plusieurs lignes et vérifier que le paragraphe est justifié dans le PDF comme dans le Word ; il ne contient aucune information réelle. ';
export const FAKE_M3_BLOCS=FAKE4_BLOCS.concat([
  {id:'m3-tab',section:'Moyens matériels test',titre:'Tableau des moyens',ordre:130,paragraphes:[
    {id:'m3-tab-1',titre:'Liste du matériel',html:'<p>Le tableau suivant liste le matériel <b>fictif</b> :</p><table><thead><tr><th>Matériel</th><th>Quantité</th><th>Usage</th></tr></thead><tbody><tr><td>Poste de soudage test</td><td>4</td><td>Soudage des tubes (exemple)</td></tr><tr><td>Groupe électrogène test</td><td>2</td><td>Alimentation du chantier</td></tr><tr><td>Tente de soudage test</td><td>3</td><td>Abri des soudeurs</td></tr><tr><td colspan="2">Total fictif</td><td>9 éléments</td></tr></tbody></table>',defaut:true},
    {id:'m3-tab-2',html:'<ol><li>Première étape fictive</li><li>Deuxième étape fictive</li><li>Troisième étape fictive</li></ol><h4>Étape annexe</h4><p>Texte en <i>italique</i>, <u>souligné</u>, 12 m<sup>3</sup>, H<sub>2</sub>O, l&rsquo;apostrophe &amp; la l&eacute;gende &laquo;&nbsp;test&nbsp;&raquo; &ndash; fin.</p><p>Balises écrites telles quelles : &lt;script&gt;alert(1)&lt;/script&gt; et &lt;b&gt;pas en gras&lt;/b&gt;.</p>',defaut:true}]},
  {id:'m3-hse',section:'Démarche HSE test',titre:'Prévention',ordre:140,paragraphes:[
    {id:'m3-hse-1',html:'<p>'+HSE.repeat(3)+'</p><ul><li>Port des équipements de protection (fictif)</li><li>Balisage du chantier (fictif)</li></ul>',defaut:true}]},
  {id:'m3-img',section:'Démarche HSE test',titre:'Images converties',ordre:150,paragraphes:[
    {id:'m3-img-1',type:'image',img:'img-webp',legende:'Image WebP convertie (fictive)',largeur:40,defaut:true},
    {id:'m3-img-2',type:'image',img:'img-bad',legende:'Image illisible (fictive)',largeur:30,defaut:true},
    {id:'m3-img-3',type:'image',img:'img-ico',cote:'droite',largeur:20,html:'<p>Texte à gauche de l’image (fictif).</p>',defaut:true},
    {id:'m3-img-4',type:'image',img:'img-svg',legende:'Schéma SVG converti (fictif)',largeur:30,defaut:true}]}]);
/* grosse bibliothèque : 10 sections × 3 blocs ; paragraphes de texte (gras, listes, un tableau par section, un trou de temps en temps) et k images */
const LOREM='Texte fictif de démonstration pour un mémoire volumineux : préparation du chantier, soudage, contrôle et réception des ouvrages ; aucune donnée réelle. ';
export function bigBlocs(n,k){const blocs=[];let p=0,im=0;const per=Math.ceil(n/30);
  for(let s=1;s<=10;s++)for(let b=1;b<=3;b++){const paras=[];for(let j=0;j<per&&p<n;j++,p++){const id='g-'+s+'-'+b+'-'+j;
      if(j===2&&im<k&&b===2){paras.push({id,type:'image',img:'big-'+(im%10),legende:'Illustration fictive n° '+(im+1),largeur:im%3===0?100:60,defaut:true});im++;continue;}
      if(j===4&&b===1){paras.push({id,html:'<table><tr><th>Poste</th><th>Valeur</th></tr>'+Array.from({length:5},(_,r)=>'<tr><td>Ligne fictive '+(r+1)+'</td><td>'+(r*7+3)+'</td></tr>').join('')+'</table>',defaut:true});continue;}
      if(j%5===3){paras.push({id,html:'<ul>'+Array.from({length:4},(_,r)=>'<li>Puce fictive '+(r+1)+' du paragraphe '+p+'</li>').join('')+'</ul>',defaut:true});continue;}
      paras.push({id,titre:j===0?'Point '+s+'.'+b:'',html:'<p><b>Paragraphe '+(p+1)+'.</b> '+LOREM.repeat(1+(p%3))+(p%37===5?'[[À COMPLÉTER : valeur fictive '+p+']]':'')+'</p>',defaut:true});}
    if(paras.length)blocs.push({id:'g-'+s+'-'+b,section:'Section générée '+s,titre:'Bloc généré '+s+'.'+b,ordre:s*100+b,paragraphes:paras});}
  return blocs;}
/* bibliothèque « piège » : 3 sections × 22 blocs (titre de bloc, titre de paragraphe, texte de 1 à 5 phrases, parfois un tableau ou une image, une liste) */
const TRAP='Texte fictif de remplissage pour tester les sauts de page et les titres gardés avec la suite. ';
export function trapBlocs(seed){const bl=[];let o=0;for(let s=1;s<=3;s++)for(let b=1;b<=22;b++){const k=(s*31+b*7+(seed||0))%9;const id='t'+s+'-'+b;
    const ps=[{id:id+'-1',titre:'Titre de paragraphe '+s+'.'+b,html:'<p>'+TRAP.repeat(1+k%5)+'</p>',defaut:true}];
    if(k%3===0)ps.push({id:id+'-2',html:'<table><tr><th>Colonne A</th><th>Colonne B</th></tr><tr><td>'+TRAP.repeat(1+k%3)+'</td><td>valeur '+k+'</td></tr><tr><td>Ligne 2</td><td>valeur</td></tr></table>',defaut:true});
    if(k%4===1)ps.push({id:id+'-3',type:'image',img:'img-carte',legende:'Image fictive '+s+'.'+b,largeur:45+k*5,defaut:true});
    ps.push({id:id+'-4',html:'<ul><li>'+TRAP+'</li><li>Deuxième puce</li></ul>',defaut:true});
    bl.push({id,section:'Section piège '+s,titre:'Bloc piège '+s+'.'+b,ordre:++o,paragraphes:ps});}
  return bl;}
