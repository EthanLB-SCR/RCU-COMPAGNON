// historique.js — 14/10 soir (lot T1) : ANNULER / RÉTABLIR du traceur.
// Ethan : « j'ai fait retour en arrière, ça a été trop violent sur le tracé test, ça m'a sauté 3 lignes d'un coup — il faudrait un bouton retour en avant aussi ».
// Avant : un instantané n'était pris qu'avant CERTAINES retouches (tracer une ligne n'en prenait pas) → un Ctrl+Z remontait plusieurs actions d'un coup.
// Maintenant l'historique ne dépend plus de chaque bouton : après CHAQUE reconstruction complète du réseau (fin d'une action), l'état (lignes + zones de chiffrage)
// est comparé au dernier état retenu ; s'il a changé, l'état d'avant devient UNE étape, nommée d'après ce qui a changé (« création de « Ligne L3 » »…).
// Un glisser = des reconstructions « légères » pendant le geste puis UNE complète au lâcher = une étape. Plusieurs reconstructions dans la même action
// (supprimer une ligne et ses antennes) = une étape (validation regroupée en fin de tâche). 60 étapes ; toute nouvelle action vide la pile « rétablir ».
// Les plans de fond n'en font pas partie (lot T2). Fonctions pures : take / restore / describe / stamp sont fournis par l'appelant.
// 16/10 (lot TA, contrat K1) — Ethan : « les retours en arrière dans le traceur doivent aussi être par rapport à un changement d'échelle du plan… ça doit concerner n'importe
// quelle modif du traceur ». D'autres modules ajoutent leur « partie » à CHAQUE instantané (histPart) : plans de fond (position, échelle, rotation, opacité, ordre, ajout /
// retrait, groupes, couleurs, vue aérienne — maquette/planches.js), paramètres du tracé (fournisseur, série, profondeur, règles). Une partie = {name, take() → texte
// (comparé : il fait partie de la clé), extra?() → données gardées sans comparaison, restore(texte, extra), describe?(texte avant, texte après) → nom de l'étape,
// describeLines?(lignes avant, lignes après) → nom quand seules des données de ligne non décrites ont changé (liens lignes ↔ plans)}.
const PARTS=[];export function histPart(p){if(p&&p.name&&!PARTS.some(x=>x.name===p.name))PARTS.push(p);}
export function makeHistory({take:take0,restore:restore0,describe:describe0,stamp,flash,max=60}){
  const U=[],R=[];let cur=null,queued=false,resetNext=false,label=null;
  const take=()=>{const s=take0();PARTS.forEach(p=>{let v='';try{v=String(p.take()||'');}catch(e){console.warn(e);}s['§'+p.name]=v;s.key+='\u0001'+v;if(p.extra)try{s['§x'+p.name]=p.extra();}catch(e){}});return s;};
  const restore=s=>{restore0(s);PARTS.forEach(p=>{const v=s['§'+p.name];if(v!==undefined)try{p.restore(v,s['§x'+p.name]);}catch(e){console.warn(e);}});};
  const describe=(a,b)=>{const same=a.lines===b.lines&&a.zones===b.zones;let d=same?null:describe0(a,b);
    if(!same&&d==='retouche')for(const p of PARTS){if(!p.describeLines)continue;let t=null;try{t=p.describeLines(a.lines,b.lines);}catch(e){}if(t){d=t;break;}}
    if(same||d==='retouche'){for(const p of PARTS){const x=a['§'+p.name],y=b['§'+p.name];if(x===y||!p.describe)continue;let t=null;try{t=p.describe(x,y);}catch(e){}if(t){d=same||d==='retouche'?t:d;break;}}}
    return d||'retouche';};
  const key=s=>s.key;const lite=s=>{const o={lines:s.lines,zones:s.zones};PARTS.forEach(p=>{o['§'+p.name]=s['§'+p.name];o['§x'+p.name]=s['§x'+p.name];});return o;}; // dans les piles : l'état seul (la clé de comparaison ne sert qu'à l'état courant)
  function commit(){queued=false;const now=take();if(!cur||resetNext){cur=now;resetNext=false;label=null;return null;}
    if(key(now)===key(cur)){cur=now;label=null;return null;} // rien de changé dans le réseau (sélection, affichage…) : l'état retenu suit (photo, ordre des clés)
    const lab=label||describe(cur,now)||'retouche';label=null;
    let after=now;if(stamp&&stamp(cur,now))after=take(); // versions (étude) : vm = version courante sur les lignes créées / modifiées — fait partie de l'étape
    U.push({snap:lite(cur),label:lab});if(U.length>max)U.shift();R.length=0;cur=after;return lab;}
  const schedule=()=>{if(queued)return;queued=true;Promise.resolve().then(()=>{if(queued)commit();});};
  const flush=()=>{if(queued)commit();};
  function undo(){flush();if(!U.length){flash('Rien à annuler');return false;}const e=U.pop();R.push({snap:lite(cur),label:e.label});restore(e.snap);cur=take();queued=false;flash('Annulé : '+e.label);return true;}
  function redo(){flush();if(!R.length){flash('Rien à rétablir');return false;}const e=R.pop();U.push({snap:lite(cur),label:e.label});restore(e.snap);cur=take();queued=false;flash('Rétabli : '+e.label);return true;}
  return {commit,schedule,flush,undo,redo,
    reset(){U.length=0;R.length=0;cur=null;resetNext=false;queued=false;}, // repart de l'état courant (chargement d'un chantier)
    resetOnNext(){resetNext=true;},   // la prochaine validation repart de l'état courant, sans étape (chargement asynchrone)
    label(t){label=t;},               // nom de l'étape en cours (sinon déduit de ce qui a changé)
    get undoCount(){return U.length;},get redoCount(){return R.length;},labels:()=>({undo:U.map(e=>e.label),redo:R.map(e=>e.label)})};}
