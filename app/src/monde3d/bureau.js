// monde3d/bureau.js — MON BUREAU : une vraie pièce fermée (4 murs, porte, fenêtre), le personnage 3D assis à son poste.
// Accueil (« home ») : murs du fond et de gauche entiers, murs de devant coupés bas façon maquette d'architecte. Dépôt (« depot ») : même pièce, tous les murs coupés
// à hauteur d'appui, la porte donne sur le couloir. Visite (« visit ») : le bureau d'un collègue, on est assis sur la chaise visiteur. Personnalisation : Compagnon → Mon bureau.
import { THREE, PAL, mat, rbox, box, cyl, grp, pickable, label, canvasTex, FONT, aoStrip, aoWall, blob, bake, figure } from './core.js';
import { DESKS, DESK_BASES, CHAIRS, LAMPS, POSTERS, FRAMES, WALLS, WALL_LABELS, FLOORS, RUGS, WINDOWS, ACCENTS, KEYBOARDS, MOUSEPADS, desk, chair, monitor, keyboard, mouse, mousepad, laptop, lamp, plant, poster, frame, floorTile, rug, objet, corkBoard, screenTexture, door, cabinet, roundTable, nameplate, whiteboard, postit, furniture, SHELVES } from './props.js';
import { ecran, zoneAt, postitTex } from './ecrans.js';
const C = PAL;
/* ── mes notes : des post-its posés sur le retour du bureau (à ma gauche) ── */
export const NOTE_COLS = ['#FFDC4A', '#FFA9C0', '#8FC5FF', '#9FE39B', '#FFBE6E']; export const NOTE_MAX = 30, NOTE_LEN = 400;
export function normNotes(a) { const L = Array.isArray(a) ? a : []; return L.filter(n => n && typeof n === 'object' && typeof n.t === 'string' && n.t.trim()).slice(0, NOTE_MAX).map(n => { const o = { id: typeof n.id === 'string' && n.id ? n.id.slice(0, 12) : Math.random().toString(36).slice(2, 8), t: n.t.trim().slice(0, NOTE_LEN), c: Math.max(0, Math.min(NOTE_COLS.length - 1, (+n.c | 0))), d: typeof n.d === 'string' ? n.d.slice(0, 10) : '' }; if (isFinite(+n.x) && isFinite(+n.z) && n.x !== null && n.z !== null && n.x !== '' && n.z !== '') { const P2 = noteClamp(+n.x, +n.z); o.x = P2[0]; o.z = P2[1]; } return o; }); } /* x, z : où le post-it est posé sur le retour (comme une icône sur un bureau d'ordinateur) ; sans position → première case libre */
/** reste sur le retour (avec une marge pour le papier) */
export function noteClamp(x, z) { const m = 0.05; return [Math.max(RET.x0 + m, Math.min(RET.x1 - m, x)), Math.max(RET.z0 + m, Math.min(RET.z1 - m, z))]; }
/** la première case libre de la grille pour un nouveau post-it (loin des autres d'au moins une demi-case) */
export function freeNoteCell(notes) { const N = notes || []; const tier = notesLayout(Math.max(N.length + 1, 1)); const s = tier.pad.s; const cells = tier.concat(notesLayout(NOTE_MAX)); /* d'abord la grille de la taille actuelle, puis la grille serrée */ for (const c of cells) { if (!N.some(n => n.x != null && Math.hypot(n.x - c.x, n.z - c.z) < s * 0.75)) return { x: c.x, z: c.z }; } const last = cells[cells.length - 1]; return { x: last.x + 0.01 * N.length, z: last.z }; }
/* ── le catalogue de personnalisation (Compagnon → Mon bureau) — 08/11 soir : objets LIBRES (on les déplace, agrandit, colore), matières + couleur libre ── */
const POSTER_ITEMS = Object.fromEntries(Object.entries(POSTERS).map(([k, v]) => ['poster_' + k, 'Affiche · ' + v]));
/** ce qu'on peut poser, par surface ; col = la couleur se choisit (les objets à identité — ballon, casque, horloge… — gardent la leur) */
export const OBJ = {
  desk: { lab: 'Sur le bureau', items: Object.assign({ lampe: 'La lampe' }, Object.fromEntries(Object.entries(FRAMES).map(([k, v]) => ['cadre_' + k, 'Cadre · ' + v])), { tube_statue: 'Tube pré-isolé (maquette)', torche: 'Torche à souder', masque: 'Masque de soudeur', mug: 'Mug', thermos: 'Thermos', radio: 'Radio', casque_audio: 'Casque audio', casque: 'Casque de chantier', trophee: 'Trophée', coupe: 'Coupe', livres: 'Pile de livres', globe: 'Globe', bougie: 'Bougie', dossiers: 'Bac à dossiers', console: 'Console de jeu', ventilo: 'Ventilateur', plante_succulente: 'Succulente', plante_cactus: 'Cactus', plante_fleurs: 'Bouquet', plante_bonsai: 'Bonsaï' }) },
  floor: { lab: 'Au sol', items: { plante_monstera: 'Monstera', plante_ficus: 'Ficus', plante_palmier: 'Palmier', meuble: 'Meuble bas (classeurs)', flambart: 'Flambart (chalumeau propane)', chien: 'Chien couché', chat: 'Chat', poubelle: 'Corbeille', portemanteau: 'Portemanteau', velo: 'Vélo', skate: 'Skate', ballon: 'Ballon de foot', haltere: 'Haltères', guitare: 'Guitare', imprimante: 'Imprimante' } },
  rangement: { lab: 'Rangements (leurs étagères reçoivent les objets du bureau)', items: Object.fromEntries(Object.entries(SHELVES).map(([k, v]) => [k, v.lab])) },
  wall: { lab: 'Aux murs', items: Object.assign({}, POSTER_ITEMS, { horloge: 'Horloge', tableau: 'Tableau blanc', medaille: 'Médaille encadrée', basket: 'Mini panier', etagere: 'Étagère déco', guirlande: 'Guirlande lumineuse' }) } /* plus de néon (08/11 soir) */
};
export const COLORABLE = new Set(['lampe', 'mug', 'thermos', 'radio', 'casque_audio', 'console', 'chien', 'chat', 'portemanteau', 'velo', 'skate', 'plante_succulente', 'plante_cactus', 'plante_fleurs', 'plante_bonsai', 'plante_monstera', 'plante_ficus', 'plante_palmier']);
export const IMAGEABLE = k => typeof k === 'string' && (k.startsWith('cadre_') || k === 'poster_photo'); /* ces objets acceptent une image importée (photo, affiche) */
/** familles du catalogue d'ajout (la liste complète était trop longue) */
export const FAMILLES = [['affiches', 'Affiches', k => k.startsWith('poster_')], ['cadres', 'Cadres & photos', k => k.startsWith('cadre_')], ['rcu', 'Réseau de chaleur', k => ['tube_statue', 'torche', 'masque', 'flambart'].includes(k)], ['bureau', 'Objets de bureau', k => ['lampe', 'mug', 'thermos', 'radio', 'casque_audio', 'casque', 'trophee', 'coupe', 'livres', 'globe', 'bougie', 'dossiers', 'console', 'ventilo'].includes(k)], ['plantes', 'Plantes', k => k.startsWith('plante_')], ['rangements', 'Rangements (bibliothèque, vitrine…)', k => !!SHELVES[k] || k === 'meuble'], ['deco', 'Déco murale', k => ['horloge', 'tableau', 'medaille', 'basket', 'etagere', 'guirlande'].includes(k)], ['sol', 'Au sol', k => ['chien', 'chat', 'poubelle', 'portemanteau', 'velo', 'skate', 'ballon', 'haltere', 'guitare', 'imprimante'].includes(k)]];
export const FAMILLE_OF = k => { const f = FAMILLES.find(([, , t]) => t(k)); return f ? f[0] : 'bureau'; };
export const SURF_OF = k => OBJ.desk.items[k] ? 'desk' : OBJ.floor.items[k] || OBJ.rangement.items[k] ? 'floor' : OBJ.wall.items[k] ? 'wall' : null; /* un rangement se pose au sol */
export const IS_FURN = k => !!SHELVES[k];
export const ITEMS_FOR = { desk: OBJ.desk.items, floor: Object.assign({}, OBJ.floor.items, OBJ.rangement.items), wall: OBJ.wall.items }; export const SLOTS = {}; /* (anciens emplacements fixes : plus utilisés) */
/** matières (le style) et couleur libre (hex ou null = celle de la matière) */
export const DESK_MATS = { bois: 'Bois clair', blanc: 'Laqué blanc', nuit: 'Laqué nuit', noyer: 'Noyer', bambou: 'Bambou', verre: 'Verre' };
export const CATALOG = [
  { k: 'bureau', lab: 'Plateau du bureau', opts: DESK_MATS, color: true }, { k: 'bureau_pied', lab: 'Sous le plateau', opts: DESK_BASES, color: true }, { k: 'chaise', lab: 'Fauteuil de bureau', opts: {}, color: true }, { k: 'clavier', lab: 'Clavier et souris', opts: KEYBOARDS, color: true }, { k: 'tapis_souris', lab: 'Tapis de souris', opts: MOUSEPADS }, { k: 'lampe', lab: 'Lampe', opts: LAMPS },
  { k: 'mur', lab: 'Murs', opts: WALL_LABELS, swatch: WALLS, color: true }, { k: 'sol', lab: 'Sol', opts: FLOORS, color: true }, { k: 'tapis', lab: 'Tapis', opts: RUGS, color: true }, { k: 'accent', lab: 'Ma couleur (détails)', opts: Object.fromEntries(Object.keys(ACCENTS).map(k => [k, k[0].toUpperCase() + k.slice(1)])), swatch: ACCENTS }
];
/* la pièce : 4,4 × 3,8 m ; vu de ma chaise (regard vers +z) : x positif = à ma GAUCHE */
const W = 4.4, D = 3.8, H = 2.7, T = 0.14, W2 = W / 2, D2 = D / 2; export const ROOM = { W, D, H, T };
const TOP = 0.74;
const LAY = { face: { desk: { x: 0.3, z: -0.8, w: 2.1, d: 0.85, retour: { w: 0.75, d: 0.66, side: 1, dir: -1 } }, seat: [0.3, -1.5], board: { z: -0.15, y: 1.6, w: 1.4, h: 0.86 }, mon: { c: [0.2, -0.68], ry: Math.PI } } }; /* écrans un peu à droite du centre du plateau, dans l'axe de la chaise ; board = le tableau blanc « À savoir » (centre) */
/** le retour du bureau (à ma gauche) : son rectangle au sol → là où se posent les post-its */
const RET = (() => { const D0 = LAY.face.desk, r = D0.retour; const x1 = D0.x + D0.w / 2, x0 = x1 - r.w; const zc = D0.z + (r.dir || 1) * (D0.d / 2 + r.d / 2); return { x0, x1, xc: (x0 + x1) / 2, z0: zc - r.d / 2, z1: zc + r.d / 2, zc }; })();
/** positions des post-its sur le retour : lus en se tournant vers la gauche (le « haut » du papier vers +x) ; jusqu'à 20 en grand, au-delà plus petits et plus serrés */
export function notesLayout(n) { const [s, p] = n <= 11 ? [0.14, 0.155] : n <= 19 ? [0.11, 0.125] : [0.085, 0.1]; const cols = Math.floor((RET.z1 - RET.z0 - 0.04) / p), rows = Math.floor((RET.x1 - RET.x0 - 0.04) / p); const used = Math.min(rows, Math.ceil((n + 1) / cols)); const z0 = RET.zc + (cols - 1) / 2 * p, x0 = RET.xc - (used - 1) / 2 * p; const out = []; /* les rangées occupées sont centrées sur le retour */ for (let i = 1; i <= n && i < cols * rows; i++) { const r = Math.floor(i / cols), c = i % cols; out.push({ x: x0 + r * p, z: z0 - c * p, s }); } out.pad = { x: x0, z: z0, s }; return out; } /* la case 0 (coin le plus proche de moi) = le bloc de post-its vierges */
/** objets posés par défaut (un bureau accueillant) : k, surface, position, taille, couleur */
const uid = () => Math.random().toString(36).slice(2, 8);
export const DEFAULT_OBJETS = [
  { id: 'o1', k: 'lampe', surf: 'desk', x: 1.2, y: TOP, z: -0.56, s: 1 }, { id: 'o2', k: 'mug', surf: 'desk', x: -0.5, y: TOP, z: -1.02, s: 1 }, { id: 'o3', k: 'cadre_famille', surf: 'desk', x: -0.62, y: TOP, z: -0.56, s: 1 }, { id: 'o4', k: 'casque', surf: 'desk', x: 1.22, y: TOP, z: -1.02, s: 1 }, /* le retour (à gauche) reste libre : c'est là que vont mes post-its */
  { id: 'o5', k: 'portemanteau', surf: 'floor', x: -1.85, y: 0, z: 1.35, s: 1 }, { id: 'o6', k: 'plante_monstera', surf: 'floor', x: 1.9, y: 0, z: 1.1, s: 1 }, { id: 'o7', k: 'plante_ficus', surf: 'floor', x: -1.9, y: 0, z: -1.5, s: 1 }, { id: 'o8', k: 'poubelle', surf: 'floor', x: 1.95, y: 0, z: -1.5, s: 1 },
  { id: 'o9', k: 'poster_reseau', surf: 'wall:front', x: 1.45, y: 1.95, z: D2 - 0.012, s: 1.3 }, { id: 'o10', k: 'horloge', surf: 'wall:front', x: 0.15, y: 1.85, z: D2 - 0.012, s: 1 }, { id: 'o11', k: 'medaille', surf: 'wall:back', x: 1.75, y: 1.85, z: -D2 + 0.012, s: 1 }, { id: 'o12', k: 'poster_tube', surf: 'wall:left', x: -W2 + 0.012, y: 1.72, z: -1.1, s: 1 }
];
export const PREFS0 = { bureau: 'bois', bureau_pied: 'caisson', chaise: 'bureau', ecrans: 2, lampe: 'articulee', mur: 'sable', sol: 'parquet', tapis: 'berbere', fenetre: 'none', clavier: 'blanc', tapis_souris: 'noir', tapis_souris_img: null, accent: 'violet', couleurs: {}, objets: DEFAULT_OBJETS, raccourcis: ['chantier', 'pilotage', 'equipe'] };
const HEX = v => typeof v === 'string' && /^#[0-9a-fA-F]{6}$/.test(v) ? v.toLowerCase() : null;
/** une image importée : data-URL jpeg/png/webp, 240 Ko au plus (l'import la réduit à 512 px) */
export const IMG_MAX = 240000;
/* dans l'appli, les images sont déposées au stockage (bucket photos, dossier bureau3d) : on n'accepte que ces adresses-là (jamais une adresse extérieure qui pisterait les collègues) */
let IMG_PREFIX = null; export function setImagePrefix(p) { IMG_PREFIX = typeof p === 'string' && /^https:\/\/[^/?#\s]+\/[^?#\s]*$/.test(p) ? p : null; }
const IMG = v => { if (typeof v !== 'string') return null; if (IMG_PREFIX && v.length <= 2000 && v.startsWith(IMG_PREFIX) && /^[A-Za-z0-9_.\-/:?=&%~]+$/.test(v)) return v; return v.length <= IMG_MAX && /^data:image\/(png|jpeg|webp);base64,[A-Za-z0-9+/=]+$/.test(v) ? v : null; };
export const SURFS = ['desk', 'floor', 'wall:back', 'wall:front', 'wall:left', 'wall:right'];
export function normPrefs(p) {
  const o = p && typeof p === 'object' ? p : {}; const r = Object.assign({}, PREFS0, o); r.ecrans = 2; /* deux écrans, toujours (Ethan, 08/11) */
  if (!DESK_MATS[r.bureau]) r.bureau = PREFS0.bureau; if (!DESK_BASES[r.bureau_pied]) r.bureau_pied = PREFS0.bureau_pied; r.chaise = 'bureau'; /* un seul fauteuil, sa couleur se choisit */ if (!LAMPS[r.lampe]) r.lampe = PREFS0.lampe; if (!WALLS[r.mur]) r.mur = PREFS0.mur; if (!FLOORS[r.sol]) r.sol = PREFS0.sol; if (!RUGS[r.tapis]) r.tapis = PREFS0.tapis; if (!ACCENTS[r.accent]) r.accent = PREFS0.accent; r.fenetre = 'none'; if (!KEYBOARDS[r.clavier]) r.clavier = PREFS0.clavier; if (!MOUSEPADS[r.tapis_souris]) r.tapis_souris = PREFS0.tapis_souris;
  r.tapis_souris_img = IMG(o.tapis_souris_img); if (r.tapis_souris === 'image' && !r.tapis_souris_img) r.tapis_souris = 'noir'; /* « Mon image » sans image : tapis noir */
  const cc = o.couleurs && typeof o.couleurs === 'object' ? o.couleurs : {}; r.couleurs = {}; ['bureau', 'bureau_pied', 'chaise', 'clavier', 'mur', 'sol', 'tapis'].forEach(k => { const h = HEX(cc[k]); if (h) r.couleurs[k] = h; });
  const L = Array.isArray(o.objets) ? o.objets : (o.slots && !o.objets ? [] : DEFAULT_OBJETS); /* anciens réglages (emplacements fixes) : on repart des objets par défaut */
  let imgBytes = 0; /* photos dans les cadres : 1,5 Mo au plus en tout */
  r.objets = (L.length || !o.slots ? L : DEFAULT_OBJETS).filter(x => x && typeof x === 'object' && SURF_OF(x.k) && SURFS.includes(x.surf)).slice(0, 40).map(x => { const ob = { id: typeof x.id === 'string' && x.id ? x.id.slice(0, 12) : uid(), k: x.k, surf: x.surf, x: clamp(+x.x || 0, -W2, W2), y: clamp(+x.y || 0, 0, H), z: clamp(+x.z || 0, -D2, D2), s: clamp(+x.s || 1, 0.4, 2.5), c: HEX(x.c) }; if (isFinite(+x.ry) && x.ry !== null && x.ry !== undefined && x.ry !== '') ob.ry = +x.ry; if (isFinite(+x.rz) && x.rz !== null && x.rz !== undefined && x.rz !== '') ob.rz = +x.rz; if (typeof x.on === 'string' && x.on && isFinite(+x.lx) && isFinite(+x.ly) && isFinite(+x.lz)) { ob.on = x.on.slice(0, 12); ob.lx = clamp(+x.lx, -1, 1); ob.ly = clamp(+x.ly, 0, 2.2); ob.lz = clamp(+x.lz, -0.6, 0.6); } /* posé sur l'étagère d'un rangement : on = son id, l* = position dans le meuble */ if (x.rm) ob.rm = 1; /* ry = tourné sur lui-même (bureau, sol) ; rz = incliné (mur) ; rm = réglé à la main (plus d'orientation automatique près des murs) */ const im = IMAGEABLE(x.k) ? IMG(x.img) : null; if (im && imgBytes + im.length <= 1500000) { ob.img = im; imgBytes += im.length; } return ob; });
  { const ids = new Set(r.objets.filter(o => IS_FURN(o.k)).map(o => o.id)); r.objets.forEach(o => { if (o.on && (!ids.has(o.on) || SURF_OF(o.k) !== 'desk')) { delete o.on; delete o.lx; delete o.ly; delete o.lz; } }); } /* le meuble a disparu : l'objet reprend sa place absolue (x, y, z) */
  r.raccourcis = Array.isArray(r.raccourcis) ? r.raccourcis.filter(x => typeof x === 'string').slice(0, 6) : PREFS0.raccourcis.slice(); return r;
}
const clamp = (v, a, b) => Math.max(a, Math.min(b, isFinite(v) ? v : a));
export const newObjId = uid;
/* un objet par clé de catalogue */
function item(key, accent, o) {
  if (!key || key === 'none') return null; if (key.startsWith('poster_')) return poster(key.slice(7), { w: 0.62, h: 0.84, img: o && o.img });
  if (key.startsWith('cadre_')) return frame(key.slice(6), o && o.img); if (key.startsWith('plante_')) return plant(key.slice(7), o && o.pot); if (key === 'lampe') return lamp(o && o.lampe || 'articulee', accent, !!(o && o.light));
  if (SHELVES[key]) return furniture(key, accent);
  if (key === 'meuble') { const g = grp(); g.add(cabinet(1.0, 0.42, 0.74, 0xF4F1EA, { top: C.bois })); const cl = classeurs([], accent, true); cl.position.set(-0.12, 0.77, 0); g.add(cl); const pl = plant('succulente', accent); pl.position.set(0.36, 0.77, 0); g.add(pl); return g; } /* l'ancien meuble bas, devenu un objet libre */
  return objet(key, accent);
}
/* ── la pièce ── */
const SECTION = 0x2B2640; const SEAT_DY = { bureau: 0.04, gaming: 0.04, fauteuil: -0.03, bois: 0.05, tabouret: 0.16, ballon: 0.08 }; /* couleur de coupe : le dessus des murs coupés */
/** vues « dans la peau » (repère de la pièce) : œil, point regardé, angle */
export const VUES = {
  chaise: { eye: [LAY.face.seat[0] - 0.1, 1.86, LAY.face.seat[1] - 0.34], at: [LAY.face.seat[0] - 0.15, 0.8, 1.1], fov: 76 }, /* dans l'axe du bureau : les écrans au centre, la pièce derrière */
  ecran: { eye: [LAY.face.mon.c[0], 1.32, LAY.face.mon.c[1] - 1.0], at: [LAY.face.mon.c[0], 1.07, LAY.face.mon.c[1] + 0.05], fov: 56, fit: [1.46, 0.52] }, /* fit : largeur × hauteur (m) à faire tenir dans la vue — l'angle se calcule d'après la forme de l'écran (09/11 : les deux écrans prennent la majorité de la vue) */
  /* un écran à la fois : œil dans l'axe de l'écran (gauche = x+, droite = x−), face à sa dalle, l'écran remplit la vue */
  ecran1: { eye: [LAY.face.mon.c[0] + 0.32 + 0.11, 1.12, LAY.face.mon.c[1] + 0.05 - 0.6], at: [LAY.face.mon.c[0] + 0.32, 1.07, LAY.face.mon.c[1] + 0.05], fov: 46, fit: [0.7, 0.46] },
  ecran2: { eye: [LAY.face.mon.c[0] - 0.32 - 0.11, 1.12, LAY.face.mon.c[1] + 0.05 - 0.6], at: [LAY.face.mon.c[0] - 0.32, 1.07, LAY.face.mon.c[1] + 0.05], fov: 46, fit: [0.7, 0.46] },
  savoir: { eye: [W2 - 1.6, 1.68, LAY.face.board.z], at: [W2, LAY.face.board.y, LAY.face.board.z], fov: 48, fit: [1.62, 1.04] }, /* le tableau blanc « À savoir » — 09/11 : sur le mur à ma gauche (Ethan), on tourne la tête vers lui */
  notes: { eye: [RET.xc - 0.38, 1.72, RET.zc + 0.06], at: [RET.xc + 0.04, TOP, RET.zc - 0.02], fov: 50 }, /* mes post-its sur le retour : je tourne la tête à gauche et je baisse les yeux */
  visite: { eye: [LAY.face.desk.x - 1.0, 1.62, LAY.face.desk.z + 1.7], at: [LAY.face.seat[0] - 0.1, 1.1, LAY.face.seat[1] - 0.1], fov: 58 } /* depuis la droite du bureau (côté sans retour), un peu en hauteur : on voit la personne au-dessus de ses écrans */
};
/** la vue rapprochée d'un post-it (lisible en entier) : œil un peu vers moi (x−) et au-dessus, regard sur le papier */
export const noteVue = pos => ({ eye: [pos[0] - 0.17, TOP + 0.3, pos[2]], at: [pos[0] + 0.01, TOP, pos[2]], fov: 40 });

const DOOR_HOME = { z0: 0.55, z1: 1.45 }; const DOOR_DEPOT = { x0: -1.6, x1: -0.7 };
/** murs : segments autour des ouvertures (fenêtre, porte) ; le dessus des segments à pleine hauteur porte la couleur de coupe */
function walls(g, col, spec, into) {
  let tgt = g; const seg = (cx, cz, lx, lz, y0, y1, cap) => { if (lx <= 0.002 || lz <= 0.002 || y1 - y0 <= 0.002) return; tgt.add(box(lx, y1 - y0, lz, col, { x: cx, y: y0, z: cz })); if (cap) tgt.add(box(lx + 0.002, 0.014, lz + 0.002, SECTION, { x: cx, y: y1 - 0.004, z: cz, shadow: false })); };
  const run = (along, c, a, b, h, holes) => { let p = a; const S = (m, len, y0, y1, cap) => along === 'x' ? seg(m, c, len, T, y0, y1, cap) : seg(c, m, T, len, y0, y1, cap); (holes || []).slice().sort((u, v) => u[0] - v[0]).forEach(([a0, a1, y0, y1]) => { S((p + a0) / 2, a0 - p, 0, h, true); S((a0 + a1) / 2, a1 - a0, 0, Math.min(y0, h), y0 >= h); if (y1 < h) S((a0 + a1) / 2, a1 - a0, y1, h, true); p = a1; }); S((p + b) / 2, b - p, 0, h, true); };
  const pl = 0xFFFFFF; const T0 = into || {}; /* into : un groupe par côté (murs commutables pleine hauteur / coupés) */
  tgt = T0.back || g; run('x', -D2 - T / 2, -W2 - T, W2 + T, spec.back.h, spec.back.holes); tgt.add(box(W, 0.07, 0.016, pl, { z: -D2 + 0.008, shadow: false }));
  tgt = T0.front || g; run('x', D2 + T / 2, -W2 - T, W2 + T, spec.front.h, spec.front.holes); if (spec.front.h > 0.1) tgt.add(box(W, 0.07, 0.016, pl, { z: D2 - 0.008, shadow: false }));
  tgt = T0.left || g; run('z', -W2 - T / 2, -D2, D2, spec.left.h, spec.left.holes); tgt.add(box(0.016, 0.07, D, pl, { x: -W2 + 0.008, shadow: false }));
  tgt = T0.right || g; run('z', W2 + T / 2, -D2, D2, spec.right.h, spec.right.holes); if (spec.right.h > 0.1) tgt.add(box(0.016, 0.07, D, pl, { x: W2 - 0.008, shadow: false }));
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
 * P = { prefs, person:{prenom, posteLabel, svg, av, id}, visitor:{av} (visite), mode:'home'|'visit'|'depot', perso:bool (objets cliquables + surfaces de pose), todo:[{i,t,s,sev}], know:[{i,kl,kv,sev}], shortcuts:[{k,t,n}], icons:{k:'…'},
 *       screen:{date,tiles,foot} (ancien écran), poste:{…} (textures des écrans), html:bool (les panneaux lisibles sont posés par index.js : tableau et raccourcis 3D vides), present:bool, lights:bool }
 * Le groupe est centré sur le sol de la pièce (intérieur 4,4 × 3,8 m) ; le devant (côté caméra / couloir) regarde +z.
 */
export function buildPod(P) {
  const pf = normPrefs(P.prefs); const accent = ACCENTS[pf.accent]; const mode = P.mode || 'home'; const full = mode !== 'depot'; const g = grp(); g.name = 'pod';
  const lay = 'face'; const L = LAY.face; const DESK = L.desk, SEAT = L.seat, MON = L.mon, BD = L.board;
  const hex = h => h ? parseInt(h.slice(1), 16) : null; const CC = pf.couleurs || {}; const wallCol = hex(CC.mur) != null ? hex(CC.mur) : WALLS[pf.mur]; const cut = full ? 0.46 : 1.05; const hasWin = false; /* plus de fenêtre (08/11 soir) */
  // socle de maquette + sol
  if (full) g.add(rbox(W + 2 * T + 0.5, 0.34, D + 2 * T + 0.5, 0xE2DEEA, { r: 0.08, y: -0.42, rough: 0.95 }));
  g.add(floorTile(pf.sol, W + 2 * T, D + 2 * T, hex(CC.sol)));
  // murs + ouvertures
  /* mon bureau : chaque côté existe en pleine hauteur ET coupé bas ; la vue d'ensemble (personnalisation) coupe les deux murs qui nous font face et se tourne (index.js : setWalls) */
  const SIDES = ['back', 'left', 'front', 'right']; const full4 = {}, low4 = {}; SIDES.forEach(k => { full4[k] = grp(); full4[k].userData.noBake = true; low4[k] = grp(); low4[k].userData.noBake = true; low4[k].visible = false; g.add(full4[k], low4[k]); });
  if (mode === 'home') {
    walls(g, wallCol, { back: { h: H }, left: { h: H, holes: [[DOOR_HOME.z0, DOOR_HOME.z1, 0, 2.1]] }, front: { h: H }, right: { h: H } }, full4);
    walls(g, wallCol, { back: { h: cut }, left: { h: cut, holes: [[DOOR_HOME.z0, DOOR_HOME.z1, 0, 2.1]] }, front: { h: cut }, right: { h: cut } }, low4);
    g.userData.walls = { full: full4, low: low4 };
  } else walls(g, wallCol, full
    ? { back: { h: H }, left: { h: H, holes: [[DOOR_HOME.z0, DOOR_HOME.z1, 0, 2.1]] }, front: { h: cut }, right: { h: cut } }
    : { back: { h: cut }, left: { h: cut }, right: { h: cut }, front: { h: cut, holes: [[DOOR_DEPOT.x0, DOOR_DEPOT.x1, 0, 9]] } });
  const onBack = mode === 'home' ? full4.back : g, onLeft = mode === 'home' ? full4.left : g, onFront = mode === 'home' ? full4.front : g; /* ce qui est accroché au mur suit le mur */
  // ombres douces au pied des murs
  g.add(aoStrip(W, 0.42, { z: -D2, op: full ? 0.2 : 0.16 }), aoStrip(D, 0.42, { x: -W2, ry: Math.PI / 2, op: full ? 0.2 : 0.16 }), aoStrip(W, 0.3, { z: D2, ry: Math.PI, op: 0.12 }), aoStrip(D, 0.3, { x: W2, ry: -Math.PI / 2, op: 0.12 }));
  if (full) { onBack.add(aoWall(W, 0.4, { z: -D2 + 0.003 })); onLeft.add(aoWall(D, 0.4, { x: -W2 + 0.003, ry: Math.PI / 2 })); }
  // porte
  if (full) { const dr = door({ w: 0.9, h: 2.08, fz: T / 2 + 0.013, color: 0xE9DCC4 }); dr.position.set(-W2 - T / 2, 0, (DOOR_HOME.z0 + DOOR_HOME.z1) / 2); dr.rotation.y = Math.PI / 2; onLeft.add(dr); (g.userData.fixed = g.userData.fixed || []).push({ surf: 'wall:left', ob: dr }); }
  else { const lw = DOOR_DEPOT.x1 - DOOR_DEPOT.x0 - 0.04; const leaf = grp(DOOR_DEPOT.x0 + 0.02, 0, D2 - 0.02, 1.75); leaf.add(box(lw, cut - 0.005, 0.045, 0xE9DCC4, { x: lw / 2 }), box(lw, 0.012, 0.045, SECTION, { x: lw / 2, y: cut - 0.012, shadow: false })); g.add(leaf); g.add(box(DOOR_DEPOT.x1 - DOOR_DEPOT.x0, 0.012, T, 0xB9B3CC, { x: (DOOR_DEPOT.x0 + DOOR_DEPOT.x1) / 2, z: D2 + T / 2, shadow: false })); }
  // mur d'en face, à ma droite : le tableau blanc « À savoir » (chaque info écrite au feutre) ; en visite : un tableau vierge (le meuble bas est devenu un objet libre « Meuble bas »)
  if (full) {
    const E3 = mode === 'home' && P.poste ? ecran('veleda', P.poste) : null; const wb = whiteboard(BD.w, BD.h, E3 ? E3.tex : null); wb.position.set(W2 - 0.03, BD.y, BD.z); wb.rotation.y = -Math.PI / 2; const face = wb.userData.face; /* 09/11 : mur à ma gauche (x+), face à la pièce */
    (g.userData.fixed = g.userData.fixed || []).push({ surf: 'wall:right', ob: wb }); if (E3 && face) { face.userData.zones = E3.zones; face.userData.zoneAt = uv => zoneAt(E3.zones, E3.size, uv); face.userData.onZone = i => E3.redraw(i); face.userData.ecran = E3; pickable(face, { type: 'focus', k: 'savoir' }, 'À savoir — se rapprocher'); } if (mode === 'home') full4.right.add(wb); /* en visite, ce mur est coupé bas (on regarde par-dessus) : pas de tableau qui flotterait */
  }
  // tapis
  const r = rug(pf.tapis, accent, hex(CC.tapis)); r.position.set(0.1, 0.001, 0.55); g.add(r);
  // bureau : contre le mur du fond (ma chaise) ou face à la pièce avec panneau de façade (visite, dépôt)
  const dk = desk(pf.bureau, { w: DESK.w, d: DESK.d, panel: true, retour: DESK.retour, col: hex(CC.bureau), base: pf.bureau_pied, baseCol: hex(CC.bureau_pied) }); dk.position.set(DESK.x, 0, DESK.z); (g.userData.fixed = g.userData.fixed || []).push({ surf: 'floor', ob: dk }); g.add(dk, blob(DESK.w + 0.3, DESK.d + 0.3, { x: DESK.x, z: DESK.z, op: 0.24 })); const RZ = DESK.retour ? DESK.z + (DESK.retour.dir || 1) * (DESK.d / 2 + DESK.retour.d / 2) : 0; if (DESK.retour) g.add(blob(DESK.retour.w + 0.3, DESK.retour.d + 0.3, { x: DESK.x + (DESK.w / 2 - DESK.retour.w / 2), z: RZ, op: 0.22 }));
  // écrans : écran de gauche = mes modules (icônes), écran de droite = mes chantiers ; chaque tuile est une zone cliquable ; en visite : session verrouillée
  const E1 = mode === 'home' && P.poste ? ecran('modules', P.poste) : mode === 'visit' ? ecran('verrou', { prenom: P.person && P.person.prenom }) : null;
  const E2 = mode === 'home' && P.poste ? ecran('afaire', P.poste) : null; /* écran de droite : « À faire », comme l'accueil de l'appli */
  const hook = (m, E, label) => { const sc = m && m.userData.screen; if (!sc || !E || mode !== 'home') return; sc.userData.zones = E.zones; sc.userData.zoneAt = uv => zoneAt(E.zones, E.size, uv); sc.userData.onZone = i => E.redraw(i); sc.userData.onScroll = dy => E.scrollBy ? E.scrollBy(dy) : false; sc.userData.ecran = E; pickable(sc, { type: 'focus', k: 'ecran' }, label); };
  const legacy = !E1 && P.screen && full ? screenTexture(P.screen, accent) : null; const MW = 0.62, MH = 0.37; const fx = Math.sin(MON.ry), fz = Math.cos(MON.ry), px = fz, pz = -fx;
  { /* deux écrans côte à côte, centrés, légèrement tournés l'un vers l'autre ; vu de ma chaise (vers +z), l'écran des modules est à ma gauche (x positif) */ /* l'écran regarde vers -z quand ry = π (vers moi, assis en z < MON.c[1]). Écran de gauche (x+) : ry = π + a → sa face tourne vers x négatif, donc vers le centre ; écran de droite (x−) : ry = π − a. Les deux se referment sur moi, en léger « V ». */ const a0 = 0.2; const m1 = monitor({ tex: E1 ? E1.tex : legacy, w: MW, h: MH }); m1.position.set(MON.c[0] + 0.32, TOP, MON.c[1] + 0.05); m1.rotation.y = MON.ry + a0; const m2 = monitor({ tex: E2 ? E2.tex : full ? planTex() : null, w: MW, h: MH }); m2.position.set(MON.c[0] - 0.32, TOP, MON.c[1] + 0.05); m2.rotation.y = MON.ry - a0; /* vu du dessus : la pointe du V vers le fond de la pièce (l'horloge), les bords extérieurs vers moi — les deux écrans me regardent */ g.add(m1, m2); (g.userData.fixed = g.userData.fixed || []).push({ surf: 'desk', ob: m1 }, { surf: 'desk', ob: m2 }); hook(m1, E1, 'Mes modules — se rapprocher'); hook(m2, E2, 'À faire — se rapprocher'); if (m1.userData.screen) m1.userData.screen.userData.pick = { type: 'focus', k: 'ecran1' }; if (m2.userData.screen) m2.userData.screen.userData.pick = { type: 'focus', k: 'ecran2' }; }
  { /* clavier droit devant les écrans, tapis + souris à ma droite (x négatif) */ const kb = full ? keyboard(pf.clavier, hex(CC.clavier)) : rbox(0.44, 0.018, 0.15, 0xF1EEFA, { r: 0.006 }); kb.position.set(DESK.x, TOP, DESK.z - 0.2); kb.rotation.y = Math.PI; g.add(kb); (g.userData.fixed = g.userData.fixed || []).push({ surf: 'desk', ob: kb }); const mp = mousepad(pf.tapis_souris, accent, pf.tapis_souris_img); mp.position.set(DESK.x - 0.52, TOP, DESK.z - 0.2); g.add(mp); if (pf.tapis_souris !== 'none') (g.userData.fixed = g.userData.fixed || []).push({ surf: 'desk', ob: mp }); const ms = mouse(pf.clavier, hex(CC.clavier)); ms.position.set(DESK.x - 0.52, TOP + (pf.tapis_souris === 'none' ? 0 : 0.007), DESK.z - 0.18); g.add(ms); }
  if (full && P.person && mode !== 'home') { const np = nameplate(P.person.prenom || '', P.person.posteLabel || '', accent); np.position.set(DESK.x + 0.12, TOP, DESK.z + DESK.d / 2 - 0.1); np.rotation.y = 0.25; g.add(np); }
  // mes notes : des post-its posés sur le retour (à ma gauche), lisibles en se tournant ; le bloc vierge au coin = « + nouvelle note » ; en visite : les post-its du collègue, sans leur texte
  if (full && DESK.retour) {
    const N = normNotes(P.notes); const lay = notesLayout(N.length); const jit = id => { let h = 0; for (const ch of String(id)) h = (h * 31 + ch.charCodeAt(0)) >>> 0; return (h % 13 - 6) * 0.022; }; const notes = {}; const hexN = c => parseInt((NOTE_COLS[c] || NOTE_COLS[0]).slice(1), 16);
    N.forEach((n, i) => { if (n.x == null) { const f = freeNoteCell(N.filter(m => m.x != null)); n.x = f.x; n.z = f.z; } const L0 = { x: n.x, z: n.z, s: lay.pad.s }; const wrap = grp(L0.x, TOP + 0.001, L0.z); wrap.rotation.y = -Math.PI / 2 + jit(n.id); const p = postit(L0.s, mode === 'home' ? postitTex(n.t, NOTE_COLS[n.c]) : null, hexN(n.c)); wrap.add(p); wrap.userData.noBake = true; if (mode === 'home') pickable(wrap, { type: 'note', id: n.id }, n.t.split(/\r?\n/)[0].slice(0, 60)); g.add(wrap); notes[n.id] = [L0.x, TOP, L0.z]; });
    if (mode === 'home') { const pad = grp(lay.pad.x, TOP, lay.pad.z); pad.rotation.y = -Math.PI / 2; for (let i = 0; i < 6; i++) { const sh = postit(lay.pad.s, null, i === 5 ? 0xFFE67A : 0xFFDC4A); sh.position.y = i * 0.0028; sh.rotation.y = (i % 2 ? 1 : -1) * 0.02 * i; pad.add(sh); } const plus = new THREE.Mesh(new THREE.PlaneGeometry(lay.pad.s * 0.9, lay.pad.s * 0.9), new THREE.MeshBasicMaterial({ map: canvasTex(160, 160, (gg, W0, H0) => { gg.strokeStyle = '#8E87A6'; gg.lineWidth = 10; gg.lineCap = 'round'; gg.beginPath(); gg.moveTo(W0 / 2, H0 * 0.28); gg.lineTo(W0 / 2, H0 * 0.72); gg.moveTo(W0 * 0.28, H0 / 2); gg.lineTo(W0 * 0.72, H0 / 2); gg.stroke(); gg.fillStyle = '#8E87A6'; gg.font = `700 22px ${FONT}`; gg.textAlign = 'center'; gg.fillText('nouvelle note', W0 / 2, H0 * 0.9); }), transparent: true })); plus.rotation.x = -Math.PI / 2; plus.position.y = 6 * 0.0028 + 0.004; pad.add(plus); pad.userData.noBake = true; pickable(pad, { type: 'note_add' }, '+ Nouvelle note'); g.add(pad); }
    if (mode === 'home') { const np = new THREE.Mesh(new THREE.PlaneGeometry(RET.x1 - RET.x0 + 0.1, RET.z1 - RET.z0 + 0.1), new THREE.MeshBasicMaterial({ visible: false })); np.position.set(RET.xc, TOP + 0.003, RET.zc); np.rotation.x = -Math.PI / 2; np.userData.noBake = true; g.add(np); g.userData.notesPlane = np; } /* le plan (invisible) où l'on fait glisser les post-its pour les trier */
    g.userData.notes = notes; g.userData.notesPad = [lay.pad.x, TOP, lay.pad.z]; g.userData.notesLay = lay; g.userData.noteWraps = {}; g.traverse(c => { if (c.userData.pick && c.userData.pick.type === 'note') g.userData.noteWraps[c.userData.pick.id] = c; });
  }
  // fauteuil (+ la personne en 2D si on la voit : visite, dépôt)
  const ch = chair(pf.chaise, hex(CC.chaise) != null ? hex(CC.chaise) : accent); ch.position.set(SEAT[0], 0, SEAT[1]); if (mode === 'home') { ch.userData.noBake = true; g.userData.chair = ch; (g.userData.fixed = g.userData.fixed || []).push({ surf: 'floor', ob: ch }); } g.add(ch, blob(0.8, 0.8, { x: SEAT[0], z: SEAT[1], op: 0.16 }));
  if (P.person && P.present !== false && mode !== 'home') { const hh = 2.05; const f = figure(P.person.svg, hh, { crop: 0.52, shadow: false }); f.position.set(SEAT[0], 1.56 - hh, SEAT[1] + 0.06); f.userData.noBake = true; g.add(f); }
  // chaises visiteurs
  if (mode !== 'home') [[DESK.x - 0.38], [DESK.x + 0.38]].forEach(([x]) => { const vc = chair('bois', accent); vc.position.set(x, 0, DESK.z + DESK.d / 2 + 0.42); vc.rotation.y = Math.PI; g.add(vc); }); /* chez moi : pas de chaises visiteur devant le bureau (Ethan, 08/11) */
  // ── objets libres : posés où la personne les a mis (bureau, sol, murs), à leur taille et leur couleur ; en personnalisation ils se cliquent et se déplacent
  const WALL_RY = { 'wall:back': 0, 'wall:front': Math.PI, 'wall:left': Math.PI / 2, 'wall:right': -Math.PI / 2 }; const WALL_PARENT = { 'wall:back': onBack, 'wall:front': onFront, 'wall:left': onLeft, 'wall:right': mode === 'home' ? full4.right : g };
  const objs = {}; const SHELF_PLANES = []; const LIST = (pf.objets || []).slice().sort((p1, p2) => (IS_FURN(p2.k) ? 1 : 0) - (IS_FURN(p1.k) ? 1 : 0)); /* les rangements d'abord : les objets posés dessus s'y accrochent */
  LIST.forEach(ob => { if (!full && ob.surf !== 'desk' && ob.surf !== 'floor') return; const col = ob.c ? hex(ob.c) : (COLORABLE.has(ob.k) ? accent : null); const it = item(ob.k, col == null ? accent : col, { lampe: ob.k === 'lampe' ? pf.lampe : undefined, light: P.lights && full && ob.k === 'lampe', pot: col == null ? accent : col, img: ob.img }); if (!it) return;
    const host = ob.on ? objs[ob.on] : null; const wrap = host ? grp(ob.lx, ob.ly, ob.lz) : grp(ob.x, ob.y, ob.z); wrap.scale.setScalar(ob.s || 1); if (host) wrap.scale.divideScalar(host.scale.x || 1); if (ob.surf.startsWith('wall:')) { wrap.rotation.y = WALL_RY[ob.surf] || 0; wrap.rotation.z = ob.rz || 0; } else if (ob.surf === 'desk') wrap.rotation.y = ob.ry != null ? ob.ry : (ob.k === 'lampe' ? 0.6 : -0.3); else wrap.rotation.y = ob.ry || 0; wrap.add(it);
    if (P.perso && IS_FURN(ob.k)) { const F = SHELVES[ob.k]; F.tops.forEach(y => { const m = new THREE.Mesh(new THREE.PlaneGeometry(F.w - 0.06, F.d - 0.04), new THREE.MeshBasicMaterial({ visible: false })); m.position.set(0, y + 0.002, 0); m.rotation.x = -Math.PI / 2; m.userData.surf = 'shelf'; m.userData.onId = ob.id; m.userData.shelfY = y; m.userData.noBake = true; wrap.add(m); SHELF_PLANES.push(m); }); } /* ses étagères : des surfaces de pose */
    if (P.perso) { pickable(wrap, { type: 'obj', id: ob.id }, (OBJ.desk.items[ob.k] || OBJ.floor.items[ob.k] || OBJ.rangement.items[ob.k] || OBJ.wall.items[ob.k] || ob.k) + ' — glisser pour déplacer'); wrap.userData.noBake = true; wrap.userData.objId = ob.id; objs[ob.id] = wrap; }
    (host ? host : ob.surf.startsWith('wall:') ? (WALL_PARENT[ob.surf] || g) : g).add(wrap); });
  g.userData.objs = objs;
  // surfaces de pose (invisibles) : le glisser-déposer s'y accroche
  if (P.perso) { const S = []; const sf = (geo, name, pos, rot) => { const m = new THREE.Mesh(geo, new THREE.MeshBasicMaterial({ visible: false })); m.position.set(...pos); if (rot) m.rotation.set(...rot); m.userData.surf = name; m.userData.noBake = true; g.add(m); S.push(m); };
    sf(new THREE.PlaneGeometry(DESK.w, DESK.d), 'desk', [DESK.x, TOP + 0.002, DESK.z], [-Math.PI / 2, 0, 0]); if (DESK.retour) sf(new THREE.PlaneGeometry(DESK.retour.w, DESK.retour.d), 'desk', [DESK.x + (DESK.w / 2 - DESK.retour.w / 2), TOP + 0.002, RZ], [-Math.PI / 2, 0, 0]);
    sf(new THREE.PlaneGeometry(W - 0.3, D - 0.3), 'floor', [0, 0.002, 0], [-Math.PI / 2, 0, 0]);
    const WY = 0.12 + (H - 0.24) / 2, WH = H - 0.24; /* tout le mur, du bas au plafond : on pose où l'on veut, l'encombrement dit si c'est possible */
    sf(new THREE.PlaneGeometry(W - 0.1, WH), 'wall:back', [0, WY, -D2 + 0.01], [0, 0, 0]); sf(new THREE.PlaneGeometry(W - 0.1, WH), 'wall:front', [0, WY, D2 - 0.01], [0, Math.PI, 0]);
    sf(new THREE.PlaneGeometry(D - 0.1, WH), 'wall:left', [-W2 + 0.01, WY, 0], [0, Math.PI / 2, 0]); sf(new THREE.PlaneGeometry(D - 0.1, WH), 'wall:right', [W2 - 0.01, WY, 0], [0, -Math.PI / 2, 0]);
    SHELF_PLANES.forEach(m => S.push(m)); g.userData.surfaces = S;
    g.updateMatrixWorld(true); g.userData.obstacles = (g.userData.fixed || []).map(f => ({ surf: f.surf, box: new THREE.Box3().setFromObject(f.ob) })); } /* ce qui est fixe (tableau, porte, écrans, clavier, bureau, fauteuil…) : on ne pose rien dessus */
  // au dépôt : le prénom à la porte
  if (!full && P.person) { const t = label(P.person.prenom || '', { cls: 'soft', x: (DOOR_DEPOT.x0 + DOOR_DEPOT.x1) / 2, y: 1.3, z: D2 + 0.3, min: 26 }); g.add(t); }
  bake(g); /* une pièce = une trentaine d'appels de dessin au lieu de 300 */
  g.userData.prefs = pf; g.userData.size = [W + 2 * T, D + 2 * T]; return g;
}
export const podSize = () => [W + 2 * T, D + 2 * T];
export const LAYOUT = LAY;
