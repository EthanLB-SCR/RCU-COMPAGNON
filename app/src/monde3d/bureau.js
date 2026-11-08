// monde3d/bureau.js — MON BUREAU : une vraie pièce fermée (4 murs, porte, fenêtre), le personnage 3D assis à son poste.
// Accueil (« home ») : murs du fond et de gauche entiers, murs de devant coupés bas façon maquette d'architecte. Dépôt (« depot ») : même pièce, tous les murs coupés
// à hauteur d'appui, la porte donne sur le couloir. Visite (« visit ») : le bureau d'un collègue, on est assis sur la chaise visiteur. Personnalisation : Compagnon → Mon bureau.
import { THREE, PAL, mat, rbox, box, cyl, grp, pickable, label, canvasTex, FONT, aoStrip, aoWall, blob, bake } from './core.js';
import { DESKS, CHAIRS, LAMPS, POSTERS, FRAMES, WALLS, WALL_LABELS, FLOORS, RUGS, WINDOWS, ACCENTS, desk, chair, monitor, keyboard, mouse, laptop, lamp, plant, poster, frame, floorTile, rug, viewTex, objet, corkBoard, screenTexture, door, curtain, cabinet, roundTable, nameplate } from './props.js';
import { figurine } from './perso.js';
import { ecran, zoneAt } from './ecrans.js';
const C = PAL;
/* ── le catalogue de personnalisation (Compagnon → Mon bureau) ── */
export const SLOTS = {
  W1: { lab: 'Mur du fond · à gauche (sans fenêtre)', kind: 'wall', big: true }, W3: { lab: 'Mur du fond · à droite', kind: 'small' }, W4: { lab: 'Au-dessus du tableau', kind: 'top' },
  L1: { lab: 'Mur de gauche · au fond', kind: 'wall' }, L3: { lab: 'Au-dessus de la porte', kind: 'mini' },
  D1: { lab: 'Bureau · à gauche', kind: 'desk' }, D2: { lab: 'Bureau · à droite', kind: 'desk' }, D3: { lab: 'Bureau · devant à gauche', kind: 'desk' }, D4: { lab: 'Bureau · devant à droite', kind: 'desk' },
  F1: { lab: 'Sol · près de la porte', kind: 'floor' }, F2: { lab: 'Sol · coin devant à droite', kind: 'floor' }, F3: { lab: 'Sol · coin du fond', kind: 'floor' }, F4: { lab: 'Sol · au bout du bureau', kind: 'floor' }, F5: { lab: 'Sol · devant', kind: 'floor' }
};
const POSTER_ITEMS = Object.fromEntries(Object.entries(POSTERS).map(([k, v]) => ['poster_' + k, 'Affiche · ' + v]));
const WALL_ITEMS = Object.assign({ none: 'Rien' }, POSTER_ITEMS, { horloge: 'Horloge', tableau: 'Tableau blanc', medaille: 'Médaille encadrée', basket: 'Mini panier', etagere: 'Étagère déco' });
const SMALL_ITEMS = Object.assign({ none: 'Rien' }, POSTER_ITEMS, { horloge: 'Horloge', medaille: 'Médaille encadrée', basket: 'Mini panier' });
const MINI_ITEMS = { none: 'Rien', horloge: 'Horloge', medaille: 'Médaille encadrée', basket: 'Mini panier' };
const TOP_ITEMS = { none: 'Rien', guirlande: 'Guirlande lumineuse', neon: 'Néon' };
const DESK_ITEMS = Object.assign({ none: 'Rien', lampe: 'La lampe' }, Object.fromEntries(Object.entries(FRAMES).map(([k, v]) => ['cadre_' + k, 'Cadre · ' + v])), { mug: 'Mug', thermos: 'Thermos', radio: 'Radio', casque_audio: 'Casque audio', casque: 'Casque de chantier', trophee: 'Trophée', coupe: 'Coupe', livres: 'Pile de livres', globe: 'Globe', bougie: 'Bougie', dossiers: 'Bac à dossiers', console: 'Console de jeu', ventilo: 'Ventilateur', plante_succulente: 'Succulente', plante_cactus: 'Cactus', plante_fleurs: 'Bouquet', plante_bonsai: 'Bonsaï' });
const FLOOR_ITEMS = { none: 'Rien', plante_monstera: 'Monstera', plante_ficus: 'Ficus', plante_palmier: 'Palmier', chien: 'Chien couché', chat: 'Chat', poubelle: 'Corbeille', portemanteau: 'Portemanteau', velo: 'Vélo', skate: 'Skate', ballon: 'Ballon de foot', haltere: 'Haltères', guitare: 'Guitare', imprimante: 'Imprimante' };
export const ITEMS_FOR = { wall: WALL_ITEMS, small: SMALL_ITEMS, mini: MINI_ITEMS, top: TOP_ITEMS, desk: DESK_ITEMS, floor: FLOOR_ITEMS };
export const CATALOG = [
  { k: 'bureau', lab: 'Bureau', opts: DESKS }, { k: 'chaise', lab: 'Siège', opts: CHAIRS }, { k: 'ecrans', lab: 'Écrans', opts: { 1: '1 écran', 2: '2 écrans', portable: 'Portable' } }, { k: 'lampe', lab: 'Lampe', opts: LAMPS },
  { k: 'mur', lab: 'Murs', opts: WALL_LABELS, swatch: WALLS }, { k: 'sol', lab: 'Sol', opts: FLOORS }, { k: 'tapis', lab: 'Tapis', opts: RUGS }, { k: 'fenetre', lab: 'Fenêtre', opts: WINDOWS }, { k: 'accent', lab: 'Couleur', opts: Object.fromEntries(Object.keys(ACCENTS).map(k => [k, k[0].toUpperCase() + k.slice(1)])), swatch: ACCENTS }
];
export const PREFS0 = { bureau: 'bois', chaise: 'bureau', ecrans: 2, lampe: 'articulee', mur: 'sable', sol: 'parquet', tapis: 'berbere', fenetre: 'ville', accent: 'violet', slots: { W1: 'none', W3: 'horloge', W4: 'none', L1: 'poster_montagne', L3: 'none', D1: 'lampe', D2: 'cadre_famille', D3: 'mug', D4: 'none', F1: 'portemanteau', F2: 'plante_monstera', F3: 'plante_ficus', F4: 'poubelle', F5: 'none' }, raccourcis: ['chantier', 'pilotage', 'equipe'] };
export function normPrefs(p) {
  const o = p && typeof p === 'object' ? p : {}; const r = Object.assign({}, PREFS0, o); r.slots = Object.assign({}, PREFS0.slots, o.slots || {});
  if (!DESKS[r.bureau]) r.bureau = PREFS0.bureau; if (!CHAIRS[r.chaise]) r.chaise = PREFS0.chaise; if (!LAMPS[r.lampe]) r.lampe = PREFS0.lampe; if (!WALLS[r.mur]) r.mur = PREFS0.mur; if (!FLOORS[r.sol]) r.sol = PREFS0.sol; if (!RUGS[r.tapis]) r.tapis = PREFS0.tapis; if (!WINDOWS[r.fenetre]) r.fenetre = PREFS0.fenetre; if (!ACCENTS[r.accent]) r.accent = PREFS0.accent; if (![1, 2, '1', '2', 'portable'].includes(r.ecrans)) r.ecrans = 2;
  Object.keys(SLOTS).forEach(s => { const allowed = ITEMS_FOR[SLOTS[s].kind]; if (!allowed[r.slots[s]]) r.slots[s] = 'none'; }); r.raccourcis = Array.isArray(r.raccourcis) ? r.raccourcis.filter(x => typeof x === 'string').slice(0, 6) : PREFS0.raccourcis.slice(); return r;
}
/* un objet par clé de catalogue */
function item(key, accent, o) {
  if (!key || key === 'none') return null; if (key.startsWith('poster_')) return poster(key.slice(7), o && o.big ? { w: 0.9, h: 1.2 } : o && o.small ? { w: 0.5, h: 0.68 } : { w: 0.62, h: 0.84 });
  if (key.startsWith('cadre_')) return frame(key.slice(6)); if (key.startsWith('plante_')) return plant(key.slice(7), o && o.pot); if (key === 'lampe') return lamp(o && o.lampe || 'articulee', accent, !!(o && o.light)); if (key === 'neon') return lamp('neon', accent, !!(o && o.light));
  return objet(key, accent);
}
/* ── la pièce ── */
const W = 4.4, D = 3.8, H = 2.7, T = 0.14, W2 = W / 2, D2 = D / 2; export const ROOM = { W, D, H, T };
const SECTION = 0x2B2640; const SEAT_DY = { bureau: 0.04, gaming: 0.04, fauteuil: -0.03, bois: 0.05, tabouret: 0.16, ballon: 0.08 }; /* couleur de coupe : le dessus des murs coupés */
const DESK = { x: 0.75, z: -D2 + 0.42, w: 1.6, d: 0.78 }; const TOP = 0.74;
const WIN = { x0: -1.72, x1: -0.42, y0: 0.92, y1: 2.22 }; const DOOR_HOME = { z0: 0.55, z1: 1.45 }; const DOOR_DEPOT = { x0: -1.6, x1: -0.7 };
const WALL_ANCHORS = { W1: [-1.07, 1.65, -D2 + 0.012, 0], W3: [1.86, 1.78, -D2 + 0.012, 0], W4: [0.75, 2.6, -D2 + 0.012, 0], L1: [-W2 + 0.012, 1.72, -1.25, Math.PI / 2], L3: [-W2 + 0.012, 2.43, 1.0, Math.PI / 2] };
const DESK_ANCHORS = { D1: [0.05, -1.6], D2: [1.42, -1.62], D3: [0.08, -1.27], D4: [1.42, -1.25] };
const FLOOR_ANCHORS = { F1: [-1.8, 1.62, 0.6], F2: [1.92, 1.58, -0.5], F3: [-1.92, -1.55, 0.8], F4: [1.96, -1.55, -0.7], F5: [-0.75, 1.05, 0] };
let GLOW = null; const glowTex = () => GLOW || (GLOW = canvasTex(64, 128, (g, w, h) => { const G = g.createLinearGradient(0, 0, 0, h); G.addColorStop(0, 'rgba(255,244,214,1)'); G.addColorStop(1, 'rgba(255,244,214,0)'); g.fillStyle = G; g.fillRect(0, 0, w, h); }));
/** murs : segments autour des ouvertures (fenêtre, porte) ; le dessus des segments à pleine hauteur porte la couleur de coupe */
function walls(g, col, spec) {
  const seg = (cx, cz, lx, lz, y0, y1, cap) => { if (lx <= 0.002 || lz <= 0.002 || y1 - y0 <= 0.002) return; g.add(box(lx, y1 - y0, lz, col, { x: cx, y: y0, z: cz })); if (cap) g.add(box(lx + 0.002, 0.014, lz + 0.002, SECTION, { x: cx, y: y1 - 0.004, z: cz, shadow: false })); };
  const run = (along, c, a, b, h, holes) => { let p = a; const S = (m, len, y0, y1, cap) => along === 'x' ? seg(m, c, len, T, y0, y1, cap) : seg(c, m, T, len, y0, y1, cap); (holes || []).slice().sort((u, v) => u[0] - v[0]).forEach(([a0, a1, y0, y1]) => { S((p + a0) / 2, a0 - p, 0, h, true); S((a0 + a1) / 2, a1 - a0, 0, Math.min(y0, h), y0 >= h); if (y1 < h) S((a0 + a1) / 2, a1 - a0, y1, h, true); p = a1; }); S((p + b) / 2, b - p, 0, h, true); };
  run('x', -D2 - T / 2, -W2 - T, W2 + T, spec.back.h, spec.back.holes); run('x', D2 + T / 2, -W2 - T, W2 + T, spec.front.h, spec.front.holes);
  run('z', -W2 - T / 2, -D2, D2, spec.left.h, spec.left.holes); run('z', W2 + T / 2, -D2, D2, spec.right.h, spec.right.holes);
  // plinthes (intérieur)
  const pl = 0xFFFFFF; g.add(box(W, 0.07, 0.016, pl, { z: -D2 + 0.008, shadow: false }), box(0.016, 0.07, D, pl, { x: -W2 + 0.008, shadow: false }));
  if (spec.front.h > 0.1) g.add(box(W, 0.07, 0.016, pl, { z: D2 - 0.008, shadow: false })); if (spec.right.h > 0.1) g.add(box(0.016, 0.07, D, pl, { x: W2 - 0.008, shadow: false }));
}
/** le tableau des raccourcis vers les modules : plaques cliquables (3 par rangée), origine = haut centre, face +z */
function raccourcis(items, icons, accent) {
  const g = grp(); const n = items.length; if (!n) return g; const cols = Math.min(3, n), rows = Math.ceil(n / 3); const P = 0.32, gap = 0.05; const w = cols * (P + gap) + 0.09, h = rows * (P + gap) + 0.16;
  g.add(rbox(w, h, 0.03, 0xFFFFFF, { r: 0.02, y: -h }), rbox(w + 0.03, h + 0.03, 0.012, 0xD9D3E6, { r: 0.02, y: -h - 0.015, z: -0.012 }));
  const tt = canvasTex(256, 32, (c, W0, H0) => { c.fillStyle = '#57526B'; c.font = `800 20px ${FONT}`; c.textAlign = 'center'; c.textBaseline = 'middle'; c.fillText('MES RACCOURCIS', W0 / 2, H0 / 2 + 1); });
  const title = new THREE.Mesh(new THREE.PlaneGeometry(Math.min(w - 0.06, 0.8), 0.1), new THREE.MeshBasicMaterial({ map: tt, transparent: true })); title.position.set(0, -0.07, 0.017); g.add(title);
  const acc = '#' + new THREE.Color(accent == null ? C.violet : accent).getHexString();
  items.forEach((it, i) => { const c = i % 3, r = Math.floor(i / 3); const rowN = Math.min(3, n - r * 3); const x = (c - (rowN - 1) / 2) * (P + gap), y = -0.14 - P / 2 - r * (P + gap);
    const t = canvasTex(160, 160, (gg, W0, H0) => { gg.fillStyle = it.n ? acc : '#2B1B5A'; gg.beginPath(); gg.roundRect(0, 0, W0, H0, 26); gg.fill(); gg.fillStyle = 'rgba(255,255,255,.12)'; gg.beginPath(); gg.roundRect(8, 8, W0 - 16, H0 * 0.5, 20); gg.fill(); gg.fillStyle = '#fff'; gg.textAlign = 'center'; gg.font = `800 ${Math.round(H0 * 0.38)}px ${FONT}`; gg.fillText((icons && icons[it.k]) || it.t.slice(0, 1), W0 / 2, H0 * 0.52); gg.font = `700 ${Math.round(H0 * 0.135)}px ${FONT}`; gg.fillText(it.t.slice(0, 12), W0 / 2, H0 * 0.86); if (it.n) { gg.fillStyle = '#F08A3C'; gg.beginPath(); gg.arc(W0 - 24, 24, 19, 0, 7); gg.fill(); gg.fillStyle = '#fff'; gg.font = `800 ${Math.round(H0 * 0.16)}px ${FONT}`; gg.fillText(String(it.n), W0 - 24, 31); } });
    const p = new THREE.Mesh(new THREE.BoxGeometry(P, P, 0.03), [mat(0x2B1B5A), mat(0x2B1B5A), mat(0x2B1B5A), mat(0x2B1B5A), new THREE.MeshStandardMaterial({ map: t, roughness: 0.55 }), mat(0x2B1B5A)]); p.position.set(x, y, 0.03); p.castShadow = true; pickable(p, { type: 'tabgo', k: it.k }, it.t + (it.n ? ' · ' + it.n : '')); g.add(p); });
  return g;
}
/** « À savoir » : des classeurs debout sur le meuble bas, un par info (cliquables) ; origine = dessus du meuble, alignés le long de x */
function classeurs(know, accent, visit) {
  const g = grp(); const K = visit ? [] : (know || []).slice(0, 7); const n = visit ? 5 : Math.max(K.length, 3); const cols = [accent, C.ok2, C.att2, C.lav2, C.bq2, C.gris2, C.bleu];
  for (let i = 0; i < n; i++) { const it = K[i]; const b = rbox(0.075, 0.3, 0.24, it ? cols[i % 7] : [C.lav2, C.gris3, C.blanc][i % 3], { r: 0.008, x: -n * 0.045 + i * 0.09 + 0.045 }); b.add(box(0.077, 0.05, 0.004, C.blanc, { y: 0.03, z: 0.121, shadow: false })); b.add(box(0.03, 0.03, 0.004, 0x3A3550, { y: -0.07, z: 0.121, shadow: false })); if (it) pickable(b, { type: 'notif', i: it.i }, (it.kl || it.t || '') + (it.kv ? ' — ' + it.kv : '')); g.add(b); }
  g.add(box(0.02, 0.2, 0.18, C.metal2, { x: -n * 0.045 - 0.02 }), box(0.02, 0.2, 0.18, C.metal2, { x: n * 0.045 + 0.02 }));
  return g;
}
/** l'écran de droite : un plan de réseau (déco) */
let PLAN_TEX = null; const planTex = () => PLAN_TEX || (PLAN_TEX = canvasTex(448, 264, (g, w, h) => { g.fillStyle = '#16213A'; g.fillRect(0, 0, w, h); g.strokeStyle = 'rgba(255,255,255,.08)'; g.lineWidth = 1; for (let x = 0; x < w; x += 22) { g.beginPath(); g.moveTo(x, 0); g.lineTo(x, h); g.stroke(); } for (let y = 0; y < h; y += 22) { g.beginPath(); g.moveTo(0, y); g.lineTo(w, y); g.stroke(); } g.lineWidth = 5; g.strokeStyle = '#E2584E'; g.beginPath(); g.moveTo(30, 200); g.lineTo(160, 200); g.lineTo(160, 90); g.lineTo(300, 90); g.lineTo(300, 160); g.lineTo(420, 160); g.stroke(); g.strokeStyle = '#5B8FE0'; g.beginPath(); g.moveTo(30, 214); g.lineTo(174, 214); g.lineTo(174, 104); g.lineTo(286, 104); g.lineTo(286, 174); g.lineTo(420, 174); g.stroke(); g.fillStyle = '#F2C14E'; [[160, 200], [300, 90], [300, 160]].forEach(([x, y]) => { g.beginPath(); g.arc(x, y, 7, 0, 7); g.fill(); }); g.fillStyle = '#fff'; g.font = `700 16px ${FONT}`; g.fillText('Plan du réseau', 18, 30); }));
/**
 * La pièce d'une personne.
 * P = { prefs, person:{prenom, posteLabel, svg, av, id}, visitor:{av} (visite), mode:'home'|'visit'|'depot', todo:[{i,t,s,sev}], know:[{i,kl,kv,sev}], shortcuts:[{k,t,n}], icons:{k:'…'},
 *       screen:{date,tiles,foot} (ancien écran), poste:{prenom,date,tiles,todo,chantiers,more} (écrans cliquables, cf. ecrans.js), present:bool, lights:bool }
 * Le groupe est centré sur le sol de la pièce (intérieur 4,4 × 3,8 m) ; le devant (côté caméra / couloir) regarde +z.
 */
export function buildPod(P) {
  const pf = normPrefs(P.prefs); const accent = ACCENTS[pf.accent]; const mode = P.mode || 'home'; const full = mode !== 'depot'; const g = grp(); g.name = 'pod';
  const wallCol = WALLS[pf.mur]; const cut = full ? 0.46 : 1.05; const hasWin = full && pf.fenetre !== 'none';
  // socle de maquette + sol
  if (full) g.add(rbox(W + 2 * T + 0.5, 0.34, D + 2 * T + 0.5, 0xE2DEEA, { r: 0.08, y: -0.42, rough: 0.95 }));
  g.add(floorTile(pf.sol, W + 2 * T, D + 2 * T));
  // murs + ouvertures
  walls(g, wallCol, full
    ? { back: { h: H, holes: hasWin ? [[WIN.x0, WIN.x1, WIN.y0, WIN.y1]] : [] }, left: { h: H, holes: [[DOOR_HOME.z0, DOOR_HOME.z1, 0, 2.1]] }, front: { h: cut }, right: { h: cut } }
    : { back: { h: cut }, left: { h: cut }, right: { h: cut }, front: { h: cut, holes: [[DOOR_DEPOT.x0, DOOR_DEPOT.x1, 0, 9]] } });
  // ombres douces au pied des murs
  g.add(aoStrip(W, 0.42, { z: -D2, op: full ? 0.2 : 0.16 }), aoStrip(D, 0.42, { x: -W2, ry: Math.PI / 2, op: full ? 0.2 : 0.16 }), aoStrip(W, 0.3, { z: D2, ry: Math.PI, op: 0.12 }), aoStrip(D, 0.3, { x: W2, ry: -Math.PI / 2, op: 0.12 }));
  if (full) g.add(aoWall(W, 0.4, { z: -D2 + 0.003 }), aoWall(D, 0.4, { x: -W2 + 0.003, ry: Math.PI / 2 }));
  // porte
  if (full) { const dr = door({ w: 0.9, h: 2.08, fz: T / 2 + 0.013, color: 0xE9DCC4 }); dr.position.set(-W2 - T / 2, 0, (DOOR_HOME.z0 + DOOR_HOME.z1) / 2); dr.rotation.y = Math.PI / 2; g.add(dr); }
  else { const lw = DOOR_DEPOT.x1 - DOOR_DEPOT.x0 - 0.04; const leaf = grp(DOOR_DEPOT.x0 + 0.02, 0, D2 - 0.02, 1.75); leaf.add(box(lw, cut - 0.005, 0.045, 0xE9DCC4, { x: lw / 2 }), box(lw, 0.012, 0.045, SECTION, { x: lw / 2, y: cut - 0.012, shadow: false })); g.add(leaf); g.add(box(DOOR_DEPOT.x1 - DOOR_DEPOT.x0, 0.012, T, 0xB9B3CC, { x: (DOOR_DEPOT.x0 + DOOR_DEPOT.x1) / 2, z: D2 + T / 2, shadow: false })); }
  // fenêtre : vue, cadre, appui, rideaux, lumière au sol
  if (hasWin) {
    const ww = WIN.x1 - WIN.x0, wh = WIN.y1 - WIN.y0, cx = (WIN.x0 + WIN.x1) / 2, cy = (WIN.y0 + WIN.y1) / 2, zw = -D2 - T / 2;
    const v = new THREE.Mesh(new THREE.PlaneGeometry(ww, wh), new THREE.MeshBasicMaterial({ map: viewTex(pf.fenetre, ww, wh) })); v.position.set(cx, cy, zw - 0.02); g.add(v);
    const fr = 0xFFFFFF, fd = 0.07; g.add(box(ww, 0.05, fd, fr, { x: cx, y: WIN.y1 - 0.05, z: zw }), box(ww, 0.05, fd, fr, { x: cx, y: WIN.y0, z: zw }), box(0.05, wh, fd, fr, { x: WIN.x0 + 0.025, y: WIN.y0, z: zw }), box(0.05, wh, fd, fr, { x: WIN.x1 - 0.025, y: WIN.y0, z: zw }), box(0.04, wh, fd, fr, { x: cx, y: WIN.y0, z: zw }));
    const gl = new THREE.Mesh(new THREE.PlaneGeometry(ww - 0.06, wh - 0.06), mat(0xCFE0EE, { op: 0.18, rough: 0.05 })); gl.position.set(cx, cy, zw + 0.012); g.add(gl);
    g.add(rbox(ww + 0.14, 0.035, 0.22, 0xFFFFFF, { r: 0.008, x: cx, y: WIN.y0 - 0.035, z: -D2 + 0.06 }));
    [[WIN.x0 - 0.2], [WIN.x1 + 0.2]].forEach(([x]) => { const cu = curtain(0.36, WIN.y1 - WIN.y0 + 0.52, accent); cu.position.set(x, WIN.y1 + 0.3, -D2 + 0.09); g.add(cu); });
    const rod = cyl(0.014, 0.014, ww + 0.9, C.metal2, { seg: 8 }); rod.rotation.z = Math.PI / 2; rod.position.set(cx, WIN.y1 + 0.32, -D2 + 0.09); g.add(rod);
    const lp = new THREE.Mesh(new THREE.PlaneGeometry(ww * 1.05, 1.5), new THREE.MeshBasicMaterial({ map: glowTex(), transparent: true, opacity: 0.32, blending: THREE.AdditiveBlending, depthWrite: false })); lp.rotation.x = -Math.PI / 2; lp.position.set(cx + 0.18, 0.006, -D2 + 0.75); lp.rotation.z = -0.12; lp.renderOrder = 2; g.add(lp);
  }
  // mur de gauche : meuble bas + « À savoir » (classeurs) + raccourcis
  if (full) {
    const cb = cabinet(1.3, 0.42, 0.74, 0xF4F1EA, { top: C.bois }); cb.position.set(-W2 + 0.22, 0, -0.1); cb.rotation.y = Math.PI / 2; g.add(cb, blob(0.6, 1.5, { x: -W2 + 0.25, z: -0.1, op: 0.18 }));
    const cl = classeurs(P.know, accent, mode === 'visit'); cl.position.set(-W2 + 0.22, 0.77, -0.32); cl.rotation.y = Math.PI / 2; g.add(cl);
    if (mode !== 'visit' && P.shortcuts && P.shortcuts.length) { const sp = raccourcis(P.shortcuts.slice(0, 6), P.icons, accent); sp.position.set(-W2 + 0.012, 1.92, -0.12); sp.rotation.y = Math.PI / 2; g.add(sp); }
    else { const pl = item('plante_succulente', accent, {}); if (pl) { pl.position.set(-W2 + 0.22, 0.77, 0.3); g.add(pl); } }
    // tableau « À faire » (post-it) au-dessus du bureau
    const board = corkBoard(mode === 'visit' ? [] : (P.todo || []), { w: 1.5, h: 0.95 }); board.position.set(DESK.x, 2.38, -D2 + 0.015); g.add(board);
    // objets muraux
    Object.entries(WALL_ANCHORS).forEach(([slot, [x, y, z, ry]]) => { if (slot === 'W1' && hasWin) return; const it = item(pf.slots[slot], accent, { big: slot === 'W1', small: slot === 'W3', light: P.lights }); if (!it) return; it.position.set(x, y, z); it.rotation.y = ry; g.add(it); });
  }
  // tapis
  const r = rug(pf.tapis, accent); r.position.set(1.0, 0.001, -0.42); g.add(r);
  // bureau contre le mur du fond, écrans tournés vers la pièce
  const dk = desk(pf.bureau, { w: DESK.w, d: DESK.d }); dk.position.set(DESK.x, 0, DESK.z); g.add(dk, blob(DESK.w + 0.3, DESK.d + 0.3, { x: DESK.x, z: DESK.z, op: 0.24 }));
  // écrans : à l'accueil, un vrai tableau de bord cliquable (tuiles, « À faire », mes chantiers) ; en visite, la session verrouillée ; au dépôt, écrans éteints
  const E1 = mode === 'home' && P.poste ? ecran('tableau', P.poste) : mode === 'visit' ? ecran('verrou', { prenom: P.person && P.person.prenom }) : null;
  const E2 = mode === 'home' && P.poste && pf.ecrans !== 'portable' && +pf.ecrans !== 1 ? ecran('chantiers', P.poste) : null;
  const hook = (m, E, label) => { const sc = m && m.userData.screen; if (!sc || !E || !E.zones) return; sc.userData.zones = E.zones; sc.userData.zoneAt = uv => zoneAt(E.zones, E.size, uv); sc.userData.onZone = i => E.redraw(i); pickable(sc, { type: 'poste' }, label); };
  const legacy = !E1 && P.screen && full ? screenTexture(P.screen, accent) : null; const MW = 0.6, MH = 0.355;
  if (pf.ecrans === 'portable') { const lp = laptop({ tex: E1 ? E1.tex : legacy }); lp.position.set(DESK.x, TOP, DESK.z + 0.02); g.add(lp); if (mode === 'home') hook(lp, E1, 'Mon écran — clique sur une tuile'); }
  else if (+pf.ecrans === 1) { const m = monitor({ tex: E1 ? E1.tex : legacy, w: MW + 0.06, h: MH + 0.035 }); m.position.set(DESK.x, TOP, DESK.z - 0.2); g.add(m); if (mode === 'home') hook(m, E1, 'Mon écran — clique sur une tuile'); }
  else { const m1 = monitor({ tex: E1 ? E1.tex : legacy, ry: 0.14, w: MW, h: MH }); m1.position.set(DESK.x - 0.33, TOP, DESK.z - 0.19); const m2 = monitor({ tex: E2 ? E2.tex : full ? planTex() : null, ry: -0.14, w: MW, h: MH }); m2.position.set(DESK.x + 0.33, TOP, DESK.z - 0.19); g.add(m1, m2); if (mode === 'home') { hook(m1, E1, 'Mon tableau de bord — clique sur une tuile'); hook(m2, E2, 'Mes chantiers — clique sur un chantier'); } }
  const kb = full ? keyboard() : rbox(0.42, 0.018, 0.14, 0xF1EEFA, { r: 0.006 }); kb.position.set(DESK.x + 0.08, TOP, DESK.z + 0.17); g.add(kb); const ms = mouse(); ms.position.set(DESK.x + 0.42, TOP, DESK.z + 0.19); g.add(ms);
  Object.entries(DESK_ANCHORS).forEach(([slot, [x, z]]) => { const it = item(pf.slots[slot], accent, { lampe: pf.lampe, light: P.lights && full }); if (!it) return; it.position.set(x, TOP, z); it.rotation.y = slot === 'D1' ? 0.5 : slot === 'D2' ? -0.35 : 0.2; g.add(it); });
  if (full && P.person) { const np = nameplate(P.person.prenom || '', P.person.posteLabel || '', accent); np.position.set(DESK.x - 0.42, TOP, DESK.z + 0.31); np.rotation.y = 0.35; g.add(np); }
  // fauteuil + la personne (accueil / visite : tournée vers la pièce ; dépôt : face à son écran)
  const turned = full; const chairAt = turned ? [DESK.x - 0.05, -0.68] : [DESK.x + 0.08, -0.8]; const yaw = turned ? 1.25 : Math.PI;
  const ch = chair(pf.chaise, accent); ch.position.set(chairAt[0], 0, chairAt[1]); ch.rotation.y = yaw; g.add(ch, blob(0.8, 0.8, { x: chairAt[0], z: chairAt[1], op: 0.16 }));
  if (P.person && P.present !== false) { const f = figurine(P.person.av || null, { pose: 'assis', bras: turned ? 'genoux' : 'clavier' }); f.position.set(chairAt[0], SEAT_DY[pf.chaise] || 0, chairAt[1]); f.rotation.y = yaw; g.add(f); }
  // chaise visiteur (et le visiteur, en visite) + coin réunion
  if (full) {
    const vc = chair('bois', accent); vc.position.set(1.95, 0, -0.58); vc.rotation.y = -Math.PI / 2 - 0.2; g.add(vc);
    if (mode === 'visit' && P.visitor) { const fv = figurine(P.visitor.av || null, { pose: 'assis' }); fv.position.set(1.95, SEAT_DY.bois, -0.58); fv.rotation.y = -Math.PI / 2 - 0.2; g.add(fv); }
    const tb = roundTable(0.42); tb.position.set(0.7, 0, 1.05); g.add(tb, blob(1.1, 1.1, { x: 0.7, z: 1.05, op: 0.16 }));
    [[-1], [1]].forEach(([s]) => { const c2 = chair('bois', accent); c2.position.set(0.7 + s * 0.66, 0, 1.05); c2.rotation.y = -s * Math.PI / 2; g.add(c2); });
    const pt = item('plante_succulente', accent, {}); if (pt) { pt.position.set(0.62, 0.755, 1.0); g.add(pt); }
    const pa = rbox(0.3, 0.012, 0.22, 0xF7F4EC, { r: 0.004, x: 0.82, y: 0.755, z: 1.12, shadow: false }); pa.rotation.y = 0.3; g.add(pa);
  }
  // objets au sol
  Object.entries(FLOOR_ANCHORS).forEach(([slot, [x, z, ry]]) => { if (!full && (slot === 'F1' || slot === 'F5')) return; const it = item(pf.slots[slot], accent, { pot: accent }); if (!it) return; it.position.set(x, 0, z); it.rotation.y = ry; g.add(it); });
  // au dépôt : le prénom à la porte
  if (!full && P.person) { const t = label(P.person.prenom || '', { cls: 'soft', x: (DOOR_DEPOT.x0 + DOOR_DEPOT.x1) / 2, y: 1.3, z: D2 + 0.3, min: 26 }); g.add(t); }
  bake(g); /* une pièce = une trentaine d'appels de dessin au lieu de 300 */
  g.userData.prefs = pf; g.userData.size = [W + 2 * T, D + 2 * T]; return g;
}
export const podSize = () => [W + 2 * T, D + 2 * T];
/** cadrage « 💻 Mon écran » (repère de la pièce) */
export const POSTE_CAM = { c: [DESK.x, 1.0, DESK.z - 0.2], half: 0.46, w: 1.5, az: 0.12, el: 0.74 }; /* w : largeur à garder visible (les deux écrans), la demi-hauteur s'adapte au format de l'écran */
