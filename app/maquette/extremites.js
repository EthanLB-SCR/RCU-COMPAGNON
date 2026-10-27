// extremites.js — 14/10 soir (lot T1) : EXTRÉMITÉS DE LIGNE (contrat C1) — catalogue unique : libellés, groupes, abréviations du plan, pièce posée.
// Ethan (14/10 soir) : « rajouter des extrémités : raccordement sur existant (PEC / insertions de tés / attente), fin de ligne (kit fin de ligne / by-pass extrusion /
// by-pass nu regard / fond bombé nu regard), raccordement en chaufferie ou attente en chaufferie, sous-station — comme ça ça compte aussi le nombre de SST, de raccordements ».
// Valeurs = l.startType / l.endType du traceur → site.lines[].startType / .endType / .ends (pont). L'ancien 'bypass' vaut 'bypass_regard' (alias : les anciens tracés restent valides).
// Pièce posée au bout : 'endcap' (kit, provisoire, fond bombé — sub = type) · 'bypassEnd' (by-pass : aller et retour reliés) · 'endpoint' (raccordement, sans longueur) · rien (libre).
// Toutes les valeurs sont possibles aux deux bouts (une ligne peut être tracée depuis son bout) ; la liste propose d'abord les raccordements au départ, les fins de ligne à la fin.
export const END_GROUPS=[
  {k:'racc',label:'Raccordement sur existant',col:'#0b7a75',items:[['pec','PEC (piquage en charge)','PEC','raccordement sur existant : PEC (piquage en charge)'],['insertion','Insertion de tés','Té ins.','raccordement sur existant : insertion de tés'],['attente','Sur attente existante','Att.','raccordement sur existant : sur attente existante']]},
  {k:'fin',label:'Fin de ligne',col:'#3d3d3a',items:[['kit','Kit fin de ligne','Kit','kit fin de ligne'],['bypass_extrusion','By-pass extrusion','BP extr.','by-pass extrusion'],['bypass_regard','By-pass nu en regard','BP regard','by-pass nu en regard'],['fondbombe_regard','Fond bombé nu en regard','FB regard','fond bombé nu en regard'],['provisoire','Fin provisoire à reprendre','Prov.','fin provisoire à reprendre']]},
  {k:'chauff',label:'Chaufferie',col:'#a23b72',items:[['chaufferie','Raccordement en chaufferie','Chauff.','raccordement en chaufferie'],['attente_chaufferie','Attente en chaufferie','Att. chauff.','attente en chaufferie']]},
  {k:'sst',label:'Sous-station',col:'#1c3d6b',items:[['sousstation','Sous-station','SST','raccordement sous-station']]},
  {k:'rien',label:'Rien',col:'#898781',items:[['libre','Libre (rien)','','bout libre']]}];
const BY={};END_GROUPS.forEach((g,gi)=>g.items.forEach(([v,label,abbr,txt],i)=>{BY[v]={v,label,abbr,txt,group:g.k,glabel:g.label,col:g.col,ord:gi*10+i};}));
// valeur normalisée (alias de l'ancien by-pass) ; une valeur inconnue est rendue telle quelle (aucune pièce posée)
export const normEnd=t=>t==='bypass'?'bypass_regard':String(t||'');
export const endInfo=t=>BY[normEnd(t)]||null;
export function endKindOf(t){const v=normEnd(t);if(v==='kit'||v==='provisoire'||v==='fondbombe_regard')return 'endcap';if(v==='bypass_extrusion'||v==='bypass_regard')return 'bypass';if(v==='pec'||v==='insertion'||v==='attente'||v==='chaufferie'||v==='attente_chaufferie'||v==='sousstation')return 'endpoint';return null;}
export const isBypassEnd=t=>endKindOf(t)==='bypass';
export const endLabel=t=>{const i=endInfo(t);return i?i.label:String(t||'');};
export const endTxt=t=>{const i=endInfo(t);return i?i.txt:String(t||'');};
export const endAbbr=t=>{const i=endInfo(t);return i?i.abbr:'';};
export const endColor=t=>{const i=endInfo(t);return i?(normEnd(t)==='provisoire'?'#b8560f':i.col):'#898781';};
export const endOrder=t=>{const i=endInfo(t);return i?i.ord:999;};
// <select> groupé : au départ les raccordements sur existant en tête, à la fin les fins de ligne
export function endOptionsHTML(atStart,cur,esc){const c=normEnd(cur);const order=atStart?['racc','fin','chauff','sst','rien']:['fin','racc','chauff','sst','rien'];
  return order.map(k=>{const g=END_GROUPS.find(x=>x.k===k);return `<optgroup label="${esc(g.label)}">${g.items.map(([v,l])=>`<option value="${v}" ${c===v?'selected':''}>${esc(l)}</option>`).join('')}</optgroup>`;}).join('');}
// texte d'aide de la fiche
export const END_HELP='Raccordement sur existant (PEC, insertion de tés, attente), chaufferie, sous-station : raccordement, 1 soudure par conduite. Kit fin de ligne : bouchon pré-isolé, 1 soudure par conduite. Fond bombé nu en regard, fin provisoire : fond bombé soudé (la fin provisoire sera prolongée). By-pass (extrusion ou nu en regard) : aller et retour reliés par 2 coudes 90° (3 soudures). Libre : rien. Remontée (sous-station, chaufferie) : la conduite monte dans le local — 2 coudes 90° par conduite + tube vertical, 2 à 3 soudures de plus, hauteur réglable.';
