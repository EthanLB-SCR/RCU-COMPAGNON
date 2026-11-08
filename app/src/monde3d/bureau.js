// monde3d/bureau.js — MON BUREAU : la pièce d'une personne (accueil), le poste dans l'open space du dépôt, la visite chez un collègue. Personnalisation (Compagnon → Mon bureau).
import { THREE, PAL, mat, rbox, box, cyl, sph, plane, grp, add, figure, pickable, label } from './core.js';
import { DESKS, CHAIRS, LAMPS, PLANTS, POSTERS, FRAMES, WALLS, WALL_LABELS, FLOORS, RUGS, WINDOWS, OBJETS, ACCENTS, desk, chair, monitor, keyboard, mouse, laptop, phone, lamp, plant, poster, frame, floorTile, rug, window_, objet, corkBoard, shortcutPanel, screenTexture } from './props.js';
const C = PAL;
/* ── le catalogue de personnalisation (Compagnon → Mon bureau) ── */
export const SLOTS = {
  W1: { lab: 'Mur du fond · gauche', kind: 'wall', big: true }, W3: { lab: 'Mur du fond · droite', kind: 'wall' }, W4: { lab: 'Au-dessus du tableau', kind: 'top' },
  L1: { lab: 'Mur de gauche · fond', kind: 'wall' }, L3: { lab: 'Mur de gauche · devant', kind: 'wall' },
  D1: { lab: 'Bureau · gauche', kind: 'desk' }, D2: { lab: 'Bureau · droite', kind: 'desk' }, D3: { lab: 'Bureau · devant gauche', kind: 'desk' }, D4: { lab: 'Bureau · devant droite', kind: 'desk' },
  F1: { lab: 'Sol · devant gauche', kind: 'floor' }, F2: { lab: 'Sol · devant droite', kind: 'floor' }, F3: { lab: 'Sol · coin gauche', kind: 'floor' }, F4: { lab: 'Sol · coin droit', kind: 'floor' }, F5: { lab: 'Sol · devant', kind: 'floor' }
};
const WALL_ITEMS = Object.assign({ none: 'Rien' }, Object.fromEntries(Object.entries(POSTERS).map(([k, v]) => ['poster_' + k, 'Affiche · ' + v])), { horloge: 'Horloge', tableau: 'Tableau blanc', medaille: 'Médaille encadrée', basket: 'Mini panier', etagere: 'Étagère déco' });
const TOP_ITEMS = { none: 'Rien', guirlande: 'Guirlande lumineuse', neon: 'Néon' };
const DESK_ITEMS = Object.assign({ none: 'Rien', lampe: 'La lampe' }, Object.fromEntries(Object.entries(FRAMES).map(([k, v]) => ['cadre_' + k, 'Cadre · ' + v])), { mug: 'Mug', thermos: 'Thermos', radio: 'Radio', casque_audio: 'Casque audio', casque: 'Casque de chantier', trophee: 'Trophée', coupe: 'Coupe', livres: 'Pile de livres', globe: 'Globe', bougie: 'Bougie', dossiers: 'Bac à dossiers', console: 'Console de jeu', ventilo: 'Ventilateur', plante_succulente: 'Succulente', plante_cactus: 'Cactus', plante_fleurs: 'Bouquet', plante_bonsai: 'Bonsaï' });
const FLOOR_ITEMS = { none: 'Rien', plante_monstera: 'Monstera', plante_ficus: 'Ficus', plante_palmier: 'Palmier', chien: 'Chien couché', chat: 'Chat', poubelle: 'Corbeille', portemanteau: 'Portemanteau', velo: 'Vélo', skate: 'Skate', ballon: 'Ballon de foot', haltere: 'Haltères', guitare: 'Guitare', imprimante: 'Imprimante' };
export const ITEMS_FOR = { wall: WALL_ITEMS, top: TOP_ITEMS, desk: DESK_ITEMS, floor: FLOOR_ITEMS };
export const CATALOG = [
  { k: 'bureau', lab: 'Bureau', opts: DESKS }, { k: 'chaise', lab: 'Siège', opts: CHAIRS }, { k: 'ecrans', lab: 'Écrans', opts: { 1: '1 écran', 2: '2 écrans', portable: 'Portable' } }, { k: 'lampe', lab: 'Lampe', opts: LAMPS },
  { k: 'mur', lab: 'Murs', opts: WALL_LABELS, swatch: WALLS }, { k: 'sol', lab: 'Sol', opts: FLOORS }, { k: 'tapis', lab: 'Tapis', opts: RUGS }, { k: 'fenetre', lab: 'Fenêtre', opts: WINDOWS }, { k: 'accent', lab: 'Couleur', opts: Object.fromEntries(Object.keys(ACCENTS).map(k => [k, k[0].toUpperCase() + k.slice(1)])), swatch: ACCENTS }
];
export const PREFS0 = { bureau: 'bois', chaise: 'bureau', ecrans: 2, lampe: 'articulee', mur: 'lavande', sol: 'parquet', tapis: 'violet', fenetre: 'ville', accent: 'violet', slots: { W1: 'none', W3: 'horloge', W4: 'none', L1: 'poster_montagne', L3: 'tableau', D1: 'lampe', D2: 'cadre_famille', D3: 'mug', D4: 'none', F1: 'plante_monstera', F2: 'none', F3: 'portemanteau', F4: 'poubelle', F5: 'none' }, raccourcis: ['chantier', 'pilotage', 'equipe'] };
export function normPrefs(p) {
  const o = p && typeof p === 'object' ? p : {}; const r = Object.assign({}, PREFS0, o); r.slots = Object.assign({}, PREFS0.slots, o.slots || {});
  if (!DESKS[r.bureau]) r.bureau = PREFS0.bureau; if (!CHAIRS[r.chaise]) r.chaise = PREFS0.chaise; if (!LAMPS[r.lampe]) r.lampe = PREFS0.lampe; if (!WALLS[r.mur]) r.mur = PREFS0.mur; if (!FLOORS[r.sol]) r.sol = PREFS0.sol; if (!RUGS[r.tapis]) r.tapis = PREFS0.tapis; if (!WINDOWS[r.fenetre]) r.fenetre = PREFS0.fenetre; if (!ACCENTS[r.accent]) r.accent = PREFS0.accent; if (![1, 2, '1', '2', 'portable'].includes(r.ecrans)) r.ecrans = 2;
  Object.keys(SLOTS).forEach(s => { const allowed = ITEMS_FOR[SLOTS[s].kind]; if (!allowed[r.slots[s]]) r.slots[s] = 'none'; }); r.raccourcis = Array.isArray(r.raccourcis) ? r.raccourcis.filter(x => typeof x === 'string').slice(0, 6) : PREFS0.raccourcis.slice(); return r;
}
/* un objet par clé de catalogue */
function item(key, accent, o) {
  if (!key || key === 'none') return null; if (key.startsWith('poster_')) return poster(key.slice(7), { w: o && o.big ? 0.9 : 0.62, h: o && o.big ? 1.2 : 0.84 });
  if (key.startsWith('cadre_')) return frame(key.slice(6)); if (key.startsWith('plante_')) return plant(key.slice(7), o && o.pot); if (key === 'lampe') return lamp(o && o.lampe || 'articulee', accent, !!(o && o.light)); if (key === 'neon') return lamp('neon', accent, !!(o && o.light));
  return objet(key, accent);
}
const WALL_ANCHORS = { W1: [-1.28, 1.7, -1.97, 0], W3: [1.72, 1.75, -1.97, 0], W4: [0.52, 2.35, -1.97, 0], L1: [-2.06, 1.75, -1.1, Math.PI / 2], L3: [-2.06, 1.75, 1.0, Math.PI / 2] };
const DESK_ANCHORS = { D1: [-0.62, -0.5], D2: [0.78, -0.56], D3: [-0.56, -0.1], D4: [0.78, -0.1] };
const FLOOR_ANCHORS = { F1: [-1.45, 1.25, 0.6], F2: [1.65, 1.15, -0.5], F3: [-1.55, -1.5, 0.8], F4: [1.7, -1.45, -0.7], F5: [0.9, 1.55, 0] };
/**
 * La pièce ou le poste d'une personne.
 * P = { prefs, person:{prenom, posteLabel, svg, id}, mode:'home'|'visit'|'depot', todo:[{i,t,s,sev}], know:[{i,kl,kv,sev}], shortcuts:[{k,t,n}], icons:{k:'…'}, screen:{date,tiles,foot}, present:bool, lights:bool }
 * Le groupe est centré sur le sol de la cellule (4.2 × 4.0 m) ; la façade ouverte regarde +z.
 */
export function buildPod(P) {
  const pf = normPrefs(P.prefs); const accent = ACCENTS[pf.accent]; const full = P.mode !== 'depot'; const g = grp(); g.name = 'pod';
  const W = 4.2, D = 4.0, H = 2.6;
  g.add(floorTile(pf.sol, W, D));
  if (full) {
    const wallCol = WALLS[pf.mur]; const back = rbox(W + 0.16, H, 0.16, wallCol, { r: 0.02, z: -D / 2 - 0.08 }); const left = rbox(0.16, H, D + 0.16, wallCol, { r: 0.02, x: -W / 2 - 0.08 }); g.add(back, left);
    g.add(box(W + 0.16, 0.1, 0.03, C.blanc, { z: -D / 2 + 0.01, y: 0 }), box(0.03, 0.1, D + 0.16, C.blanc, { x: -W / 2 + 0.01, y: 0 })); /* plinthes */
    const win = pf.fenetre !== 'none' ? window_(pf.fenetre, { w: 1.3, h: 1.1, curtain: accent }) : null; if (win) { win.position.set(-1.28, 1.75, -D / 2 + 0.02); g.add(win); }
    // tableau « À faire » (fixe) + raccourcis (fixe) + étagère « À savoir » (fixe)
    if (P.mode !== 'visit') { const cb = corkBoard(P.todo || [], { w: 1.5, h: 1.0 }); cb.position.set(0.55, 2.1, -D / 2 + 0.02); g.add(cb); }
    else { const cb = corkBoard([], { w: 1.5, h: 1.0 }); cb.position.set(0.55, 2.1, -D / 2 + 0.02); g.add(cb); }
    if (P.mode !== 'visit' && P.shortcuts && P.shortcuts.length) { const sp = shortcutPanel(P.shortcuts.slice(0, 6), P.icons); sp.position.set(-W / 2 + 0.03, 1.06, 0.1); sp.rotation.y = Math.PI / 2; g.add(sp); }
    { const sh = grp(-W / 2 + 0.03, 1.5, -0.1, Math.PI / 2); sh.add(rbox(1.2, 0.03, 0.26, C.bois, { r: 0.006, y: -0.03, z: -0.13 })); [-0.5, 0.5].forEach(x => sh.add(box(0.02, 0.14, 0.14, C.metal2, { x, y: -0.17, z: -0.08 })));
      const K = P.mode === 'visit' ? [] : (P.know || []).slice(0, 7); K.forEach((it, i) => { const b = rbox(0.075, 0.3, 0.22, [accent, C.ok2, C.att2, C.lav2, C.bq2, C.gris2, C.bleu][i % 7], { r: 0.006, x: -0.52 + i * 0.15, z: -0.12 }); b.add(box(0.08, 0.05, 0.004, C.blanc, { y: 0.17, z: 0.0, shadow: false }).translateZ(0.112)); pickable(b, { type: 'notif', i: it.i }, (it.kl || it.t || '') + (it.kv ? ' — ' + it.kv : '')); sh.add(b); });
      if (P.mode === 'visit') for (let i = 0; i < 5; i++) sh.add(rbox(0.075, 0.28, 0.22, [C.lav2, C.gris2, C.blanc, C.lav2, C.gris2][i], { r: 0.006, x: -0.5 + i * 0.16, z: -0.12 })); g.add(sh); }
    // objets muraux
    Object.entries(WALL_ANCHORS).forEach(([slot, [x, y, z, ry]]) => { if (slot === 'W1' && win) return; const it = item(pf.slots[slot], accent, { big: slot === 'W1', light: P.lights }); if (!it) return; it.position.set(x, y, z); it.rotation.y = ry; g.add(it); });
  } else {
    // dans l'open space : cloison basse à la couleur de la personne + plaque
    const part = rbox(W - 0.4, 1.15, 0.1, WALLS[pf.mur], { r: 0.03, z: -D / 2 + 0.3 }); g.add(part, box(W - 0.4, 0.06, 0.14, accent, { z: -D / 2 + 0.3, y: 1.15 }));
    if (P.todo && P.todo.length) { const n = Math.min(P.todo.length, 6); for (let i = 0; i < n; i++) g.add(box(0.16, 0.16, 0.012, [0xFFE3A6, 0xF6C6C1, 0xD9E6F8][i % 3], { x: -1.2 + i * 0.4, y: 0.75, z: -D / 2 + 0.36, shadow: false })); }
  }
  // tapis, bureau, siège, personne
  const r = rug(pf.tapis, accent); r.position.set(0.15, 0.001, 0.1); g.add(r);
  const dk = desk(pf.bureau); dk.position.set(0.1, 0, -0.4); g.add(dk); const top = 0.74;
  const ch = chair(pf.chaise, accent); ch.position.set(0.1, 0, -1.08); ch.rotation.y = Math.PI; g.add(ch);
  if (P.person && P.present !== false) { const f = figure(P.person.svg, 1.75, { crop: 0.64 }); f.position.set(0.1, 0, -0.95); g.add(f); }
  // écrans
  if (pf.ecrans === 'portable') { const lp = laptop(); lp.position.set(0.15, top, -0.5); lp.rotation.y = 0.25; g.add(lp); }
  else { const n = +pf.ecrans === 1 ? 1 : 2; const tex = P.screen ? screenTexture(P.screen, accent) : null; if (n === 1) { const m = monitor({ tex, ry: 0.35 }); m.position.set(0.15, top, -0.58); g.add(m); } else { const m1 = monitor({ tex, ry: 0.5 }); m1.position.set(-0.12, top, -0.6); const m2 = monitor({ ry: 0.15 }); m2.position.set(0.48, top, -0.62); g.add(m1, m2); } const kb = full ? keyboard() : rbox(0.42, 0.018, 0.14, 0xF1EEFA, { r: 0.006 }); kb.position.set(0.12, top, -0.2); kb.rotation.y = 0.2; g.add(kb); const ms = mouse(); ms.position.set(0.5, top, -0.18); g.add(ms); }
  // objets du bureau
  Object.entries(DESK_ANCHORS).forEach(([slot, [x, z]]) => { const it = item(pf.slots[slot], accent, { lampe: pf.lampe, light: P.lights && full }); if (!it) return; it.position.set(0.1 + x, top, -0.4 + z); it.rotation.y = -0.3 + (slot === 'D1' ? 0.9 : 0); g.add(it); });
  // objets au sol
  Object.entries(FLOOR_ANCHORS).forEach(([slot, [x, z, ry]]) => { const it = item(pf.slots[slot], accent, { pot: accent }); if (!it) return; it.position.set(x, 0, z); it.rotation.y = ry; g.add(it); });
  // plaque nominative sur le devant du bureau
  if (P.person) { const t = label(P.person.prenom + (P.person.posteLabel ? ' · ' + P.person.posteLabel : ''), { cls: P.mode === 'depot' ? 'soft' : 'big', y: P.mode === 'depot' ? 1.35 : 0.2, z: P.mode === 'depot' ? -0.3 : 0.5, x: 0.1, cy: 1, min: P.mode === 'depot' ? 34 : null }); g.add(t); }
  g.userData.prefs = pf; g.userData.size = [W, D]; return g;
}
export const podSize = () => [4.2, 4.0];
