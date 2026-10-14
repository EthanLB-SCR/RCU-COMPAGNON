// historique.js — 14/10 soir (lot T1) : ANNULER / RÉTABLIR du traceur.
// Ethan : « j'ai fait retour en arrière, ça a été trop violent sur le tracé test, ça m'a sauté 3 lignes d'un coup — il faudrait un bouton retour en avant aussi ».
// Avant : un instantané n'était pris qu'avant CERTAINES retouches (tracer une ligne n'en prenait pas) → un Ctrl+Z remontait plusieurs actions d'un coup.
// Maintenant l'historique ne dépend plus de chaque bouton : après CHAQUE reconstruction complète du réseau (fin d'une action), l'état (lignes + zones de chiffrage)
// est comparé au dernier état retenu ; s'il a changé, l'état d'avant devient UNE étape, nommée d'après ce qui a changé (« création de « Ligne L3 » »…).
// Un glisser = des reconstructions « légères » pendant le geste puis UNE complète au lâcher = une étape. Plusieurs reconstructions dans la même action
// (supprimer une ligne et ses antennes) = une étape (validation regroupée en fin de tâche). 60 étapes ; toute nouvelle action vide la pile « rétablir ».
// Les plans de fond n'en font pas partie (lot T2). Fonctions pures : take / restore / describe / stamp sont fournis par l'appelant.
export function makeHistory({take,restore,describe,stamp,flash,max=60}){
  const U=[],R=[];let cur=null,queued=false,resetNext=false,label=null;
  const key=s=>s.key;const lite=s=>({lines:s.lines,zones:s.zones}); // dans les piles : l'état seul (la clé de comparaison ne sert qu'à l'état courant)
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
