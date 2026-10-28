// moteur.js — VERSION DU MOTEUR DE COMPTAGE DU TRACEUR (28/10/2026, lot 2810e). Ethan : « mais du coup ça compte toujours 37 soudures ? on peut pas corriger ça ? ».
// Les soudures d'un tracé sont comptées par le traceur AU MOMENT DE L'ENREGISTREMENT (maquette/bridge.js) : quand le moteur évolue, un tracé enregistré avant garde l'ancien comptage.
// La version part avec chaque enregistrement (site.traceur.moteur) ; l'appli signale un tracé compté avec un moteur plus ancien (Commerce : « ⟳ Recompter » ; Quantités : avertissement)
// et le traceur, ouvert avec &recount=1, propose tout de suite l'enregistrement qui recompte.
// À CHANGER à chaque évolution qui change le comptage (maquette/traceur.js, maquette/main.js : soudures, manchettes, pièces, bouts de ligne).
export const MOTEUR_V='2810c';
export const MOTEUR_LAB='28/10';
export const moteurStale=site=>!!(site&&site.source==='traceur'&&site.traceur&&typeof site.traceur==='object'&&site.traceur.moteur!==MOTEUR_V);
