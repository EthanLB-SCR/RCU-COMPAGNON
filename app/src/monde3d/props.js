// monde3d/props.js — mobilier et décoration du bureau (bibliothèque). Chaque fonction rend un THREE.Group posé au sol (y = 0), face vers +z.
import { THREE, PAL, mat, rbox, box, cyl, sph, plane, grp, add, canvasTex, wrapText, FONT, KEEP_TEX } from './core.js';
const C = PAL;
export const ACCENTS = { violet: 0x5E46B8, nuit: 0x2B1B5A, menthe: 0x7FBFAF, ambre: 0xE8C98E, corail: 0xF08A6C, bleu: 0x4A7BD0, rose: 0xF2A7C3, vert: 0x6E9B5C, jaune: 0xF2C14E, gris: 0x8E87A6 };
/* ═══ bureaux ═══ */
export const DESKS = { bois: 'Bois clair', blanc: 'Blanc', nuit: 'Nuit', noyer: 'Noyer', bambou: 'Bambou', verre: 'Verre' };
export const DESK_BASES = { caisson: 'Caisson à tiroirs', pieds: 'Pieds fins métal', panneaux: 'Flancs pleins', cadre: 'Cadre métal noir', treteaux: 'Tréteaux bois' };
/** bureau : plateau (matière + couleur) sur un sous-plateau (type + couleur). Le côté « chaise » est −z : les tiroirs s'ouvrent vers la personne, le panneau de façade regarde la pièce (+z). */
export function desk(style, o) {
  o = o || {}; const w = o.w || 1.7, d = o.d || 0.8, h = 0.74; const g = grp();
  const S = { bois: [C.bois, C.metal2], blanc: [C.blanc, 0xEDEBF3], nuit: [C.nuit, 0xC9A774], noyer: [C.noyer, C.metal2], bambou: [0xE4CFA0, 0xD5B986], verre: [C.verre, C.metal] }[style] || [C.bois, C.metal2];
  const topCol = o.col == null ? S[0] : o.col; const base = DESK_BASES[o.base] ? o.base : 'caisson'; const BASE_COL = { caisson: style === 'nuit' ? 0x3A2C78 : style === 'blanc' ? 0xEDEBF3 : style === 'noyer' ? 0x8A6A40 : 0xECEAF2, pieds: C.metal2, panneaux: style === 'noyer' ? 0x8A6A40 : style === 'nuit' ? 0x3A2C78 : 0xEDEBF3, cadre: 0x23262D, treteaux: C.bois2 }; const bc = o.baseCol == null ? BASE_COL[base] : o.baseCol;
  const plateau = (pw, pd, px, pz) => g.add(rbox(pw, 0.05, pd, topCol, { r: 0.02, x: px, z: pz, y: h - 0.05, op: style === 'verre' ? 0.72 : 1, rough: style === 'verre' ? 0.25 : 0.85 }));
  const pied = (px, pz) => g.add(cyl(0.022, 0.022, h - 0.05, bc, { x: px, z: pz, seg: 10 }));
  const flanc = (px, pz, pd) => g.add(rbox(0.05, h - 0.05, pd - 0.1, bc, { r: 0.01, x: px, z: pz }));
  const treteau = (px, pz, pd) => { [[-1], [1]].forEach(([sz]) => { const a = cyl(0.025, 0.025, h - 0.08, bc, { seg: 8 }); a.position.set(px, (h - 0.08) / 2, pz + sz * (pd / 2 - 0.1)); a.rotation.x = sz * 0.28; g.add(a); }); g.add(rbox(0.06, 0.05, pd - 0.08, bc, { r: 0.01, x: px, z: pz, y: h - 0.1 })); };
  const cadre = (pw, pd, px, pz) => { [[-1, -1], [1, -1], [-1, 1], [1, 1]].forEach(([sx, sz]) => g.add(box(0.04, h - 0.05, 0.04, bc, { x: px + sx * (pw / 2 - 0.06), z: pz + sz * (pd / 2 - 0.06) }))); g.add(box(pw - 0.12, 0.04, 0.04, bc, { x: px, y: 0.1, z: pz - (pd / 2 - 0.06) }), box(pw - 0.12, 0.04, 0.04, bc, { x: px, y: 0.1, z: pz + (pd / 2 - 0.06) })); };
  const under = (pw, pd, px, pz, withCaisson, cx) => { if (base === 'pieds') [[-1, -1], [1, -1], [-1, 1], [1, 1]].forEach(([sx, sz]) => pied(px + sx * (pw / 2 - 0.08), pz + sz * (pd / 2 - 0.08)));
    else if (base === 'treteaux') [[-1], [1]].forEach(([sx]) => treteau(px + sx * (pw / 2 - 0.2), pz, pd));
    else if (base === 'cadre') cadre(pw, pd, px, pz);
    else { [[-1], [1]].forEach(([sx]) => flanc(px + sx * (pw / 2 - 0.06), pz, pd)); if (base === 'caisson' && withCaisson) { g.add(rbox(0.42, 0.56, pd - 0.16, bc, { r: 0.02, x: cx, z: pz + 0.03, y: 0.05 })); [0.38, 0.2].forEach(yy => g.add(cyl(0.012, 0.012, 0.08, C.metal, { x: cx, y: yy, z: pz - (pd / 2 - 0.06), seg: 8 }).rotateX(Math.PI / 2))); /* poignées côté chaise (−z) */ } } };
  plateau(w, d, 0, 0);
  const R = o.retour; const cx = R ? -(R.side || 1) * (w / 2 - 0.3) : w / 2 - 0.3; under(w, d, 0, 0, o.caisson !== false, cx);
  if (R) { const rw = R.w || 0.75, rd = R.d || 1.3, sx = R.side || 1, dir = R.dir || 1; const rx = sx * (w / 2 - rw / 2), rz = dir * (d / 2 + rd / 2 - 0.02); plateau(rw, rd + 0.02, rx, rz); const zEnd = rz + dir * (rd / 2 - 0.08);
    if (base === 'pieds') [[-1], [1]].forEach(([ax]) => pied(rx + ax * (rw / 2 - 0.08), zEnd)); else if (base === 'treteaux') treteau(rx, rz, rw); else if (base === 'cadre') g.add(box(0.04, h - 0.05, 0.04, bc, { x: rx - sx * (rw / 2 - 0.06), z: zEnd }), box(0.04, h - 0.05, 0.04, bc, { x: rx + sx * (rw / 2 - 0.06), z: zEnd })); else g.add(rbox(rw - 0.1, h - 0.05, 0.05, bc, { r: 0.01, x: rx, z: rz + dir * (rd / 2 - 0.06) }));
    g.userData.retour = { x: rx, z: rz, w: rw, d: rd + 0.02 }; }
  if (o.panel && base !== 'pieds' && base !== 'treteaux' && base !== 'cadre') g.add(rbox(w - 0.12, 0.52, 0.025, bc, { r: 0.01, y: 0.16, z: d / 2 - 0.07 })); /* panneau de façade côté pièce */
  g.userData.top = h; g.userData.main = { w, d }; return g;
}
/* ═══ chaises ═══ */
export const CHAIRS = { bureau: 'Fauteuil de bureau', gaming: 'Siège gaming', fauteuil: 'Fauteuil club', bois: 'Chaise en bois', tabouret: 'Tabouret', ballon: 'Ballon' };
export function chair(style, accent) {
  const g = grp(); const a = accent == null ? C.nuit : accent;
  if (style === 'ballon') { g.add(sph(0.3, a, { y: 0, seg: 20 })); return g; }
  if (style === 'tabouret') { g.add(cyl(0.18, 0.18, 0.06, a, { y: 0.6 }), cyl(0.02, 0.02, 0.6, C.metal, { seg: 10 }), cyl(0.2, 0.22, 0.03, C.metal)); return g; }
  if (style === 'bois') { g.add(rbox(0.42, 0.04, 0.42, C.bois, { r: 0.015, y: 0.44 }), rbox(0.42, 0.42, 0.04, C.bois, { r: 0.015, y: 0.48, z: -0.19 })); [[-1, -1], [1, -1], [-1, 1], [1, 1]].forEach(([sx, sz]) => g.add(cyl(0.02, 0.02, 0.44, C.bois2, { x: sx * 0.18, z: sz * 0.18, seg: 8 }))); return g; }
  if (style === 'fauteuil') { g.add(rbox(0.7, 0.3, 0.7, a, { r: 0.08 }), rbox(0.7, 0.45, 0.16, a, { r: 0.07, y: 0.3, z: -0.27 }), rbox(0.14, 0.26, 0.6, a, { r: 0.06, y: 0.3, x: -0.28 }), rbox(0.14, 0.26, 0.6, a, { r: 0.06, y: 0.3, x: 0.28 }), rbox(0.56, 0.1, 0.5, 0xF1EEFA, { r: 0.04, y: 0.3, z: 0.02 })); return g; }
  const gaming = style === 'gaming';
  // piètement étoile + roulettes
  g.add(cyl(0.03, 0.03, 0.36, C.metal, { y: 0.06, seg: 10 }));
  for (let i = 0; i < 5; i++) { const an = i / 5 * Math.PI * 2; const l = rbox(0.3, 0.03, 0.05, C.metal, { r: 0.012, y: 0.04 }); l.rotation.y = -an; l.position.set(Math.cos(an) * 0.15, 0.055, Math.sin(an) * 0.15); g.add(l, sph(0.028, C.metal2, { x: Math.cos(an) * 0.29, z: Math.sin(an) * 0.29, seg: 8 })); }
  g.add(rbox(0.5, 0.09, 0.5, a, { r: 0.04, y: 0.42 }));
  g.add(rbox(0.46, gaming ? 0.72 : 0.5, 0.09, a, { r: 0.04, y: 0.5, z: -0.22 }));
  if (gaming) { g.add(rbox(0.1, 0.5, 0.11, C.rouge, { r: 0.03, y: 0.55, z: -0.22, x: -0.17 }), rbox(0.1, 0.5, 0.11, C.rouge, { r: 0.03, y: 0.55, z: -0.22, x: 0.17 }), rbox(0.26, 0.12, 0.1, C.rouge, { r: 0.04, y: 1.22, z: -0.21 })); }
  g.add(rbox(0.06, 0.05, 0.26, C.metal2, { r: 0.015, y: 0.62, x: -0.27, z: 0.02 }), rbox(0.06, 0.05, 0.26, C.metal2, { r: 0.015, y: 0.62, x: 0.27, z: 0.02 }));
  return g;
}
/* ═══ écrans, clavier, téléphone, portable ═══ */
export function monitor(o) {
  o = o || {}; const w = o.w || 0.56, h = o.h || 0.33; const g = grp();
  g.add(rbox(0.22, 0.02, 0.16, C.metal2, { r: 0.008 }), cyl(0.022, 0.022, 0.12, C.metal2, { y: 0.02, seg: 10 }));
  g.add(rbox(w, h, 0.03, C.metal2, { r: 0.012, y: 0.12 }));
  const scr = new THREE.Mesh(new THREE.PlaneGeometry(w - 0.03, h - 0.03), o.tex ? new THREE.MeshBasicMaterial({ map: o.tex, toneMapped: false }) : mat(0x3A2C78, { emis: 0x5E46B8, ei: 0.35, rough: 0.4 })); scr.position.set(0, 0.12 + h / 2, 0.017); g.add(scr); g.userData.screen = scr;
  if (o.ry) g.rotation.y = o.ry; return g;
}
export const KEYBOARDS = { blanc: 'Blanc', noir: 'Noir', nuit: 'Nuit', gris: 'Gris', bois: 'Bois' };
const KB_COL = { blanc: [0xF1EEFA, 0xD6CEF2], noir: [0x23262D, 0x3A404B], nuit: [0x2B1B5A, 0x5E46B8], gris: [0x8E96A3, 0xB9C0CB], bois: [0xD9B98A, 0xF1E6D2] };
export function keyboard(style, col) { let [base, keys] = KB_COL[style] || KB_COL.blanc; if (col != null) { base = col; const c = new THREE.Color(col); const l = c.r * 0.299 + c.g * 0.587 + c.b * 0.114; keys = (l > 0.5 ? c.clone().multiplyScalar(0.86) : c.clone().lerp(new THREE.Color(0xffffff), 0.28)).getHex(); } const g = grp(); g.add(rbox(0.44, 0.018, 0.15, base, { r: 0.006 })); for (let r = 0; r < 4; r++) for (let c = 0; c < 13; c++) g.add(rbox(0.024, 0.008, 0.022, keys, { r: 0.002, x: -0.195 + c * 0.0325, z: -0.05 + r * 0.03, y: 0.018, shadow: false })); g.add(rbox(0.16, 0.008, 0.022, keys, { r: 0.002, x: 0, z: 0.07 - 0.0075, y: 0.018, shadow: false })); return g; }
export function mouse(style, col) { const [base] = KB_COL[style] || KB_COL.blanc; return rbox(0.06, 0.03, 0.1, col != null ? col : base, { r: 0.015 }); }
export const MOUSEPADS = { none: 'Aucun', noir: 'Noir', accent: 'Ma couleur', gris: 'Gris', bois: 'Liège', carte: 'Plan de réseau', image: 'Mon image' };
/* image importée par la personne (tapis de souris, cadre photo) : texture depuis une data-URL, cadrée « cover » dans le rapport largeur/hauteur demandé ; en cache, jamais libérée avec la pièce */
const IMG_TEX = new Map();
export function imageTex(url, ratio) {
  const key = url + '|' + (ratio || 0); let t = IMG_TEX.get(key); if (t) return t;
  t = new THREE.TextureLoader().load(url, tx => { const im = tx.image; if (!im || !ratio || !im.width || !im.height) return; const r = im.width / im.height; if (r > ratio) { tx.repeat.set(ratio / r, 1); tx.offset.set((1 - ratio / r) / 2, 0); } else { tx.repeat.set(1, r / ratio); tx.offset.set(0, (1 - r / ratio) / 2); } tx.needsUpdate = true; });
  t.colorSpace = THREE.SRGBColorSpace; t.anisotropy = 4; KEEP_TEX.add(t); IMG_TEX.set(key, t);
  if (IMG_TEX.size > 60) { const k0 = IMG_TEX.keys().next().value; const t0 = IMG_TEX.get(k0); IMG_TEX.delete(k0); try { t0.dispose(); } catch (e) { } } /* on garde les 60 dernières images */
  return t;
}
/** tapis de souris (posé sur le bureau, centré) ; kind 'image' + img (data-URL) = la photo de la personne */
export function mousepad(kind, accent, img) {
  const g = grp(); if (!kind || kind === 'none') return g; if (kind === 'image' && !img) kind = 'noir'; const col = kind === 'noir' || kind === 'image' ? 0x23262D : kind === 'accent' ? (accent == null ? C.violet : accent) : kind === 'gris' ? 0x8E96A3 : kind === 'bois' ? 0xD9B98A : 0x1E2A44;
  g.add(rbox(0.28, 0.006, 0.24, col, { r: 0.012, rough: 1 }));
  if (kind === 'image') { const pl = new THREE.Mesh(new THREE.PlaneGeometry(0.27, 0.23), new THREE.MeshStandardMaterial({ map: imageTex(img, 0.27 / 0.23), roughness: 0.95 })); pl.rotation.x = -Math.PI / 2; pl.position.y = 0.0065; g.add(pl); }
  if (kind === 'carte') { const t = canvasTex(256, 220, (gg, W, H) => { gg.fillStyle = '#1E2A44'; gg.fillRect(0, 0, W, H); gg.strokeStyle = 'rgba(255,255,255,.1)'; for (let x = 0; x < W; x += 20) { gg.beginPath(); gg.moveTo(x, 0); gg.lineTo(x, H); gg.stroke(); } for (let y = 0; y < H; y += 20) { gg.beginPath(); gg.moveTo(0, y); gg.lineTo(W, y); gg.stroke(); } gg.lineWidth = 5; gg.strokeStyle = '#E2584E'; gg.beginPath(); gg.moveTo(20, 170); gg.lineTo(90, 170); gg.lineTo(90, 70); gg.lineTo(190, 70); gg.lineTo(190, 130); gg.lineTo(240, 130); gg.stroke(); gg.strokeStyle = '#5B8FE0'; gg.beginPath(); gg.moveTo(20, 182); gg.lineTo(102, 182); gg.lineTo(102, 82); gg.lineTo(178, 82); gg.lineTo(178, 142); gg.lineTo(240, 142); gg.stroke(); }); const pl = new THREE.Mesh(new THREE.PlaneGeometry(0.27, 0.23), new THREE.MeshStandardMaterial({ map: t, roughness: 1 })); pl.rotation.x = -Math.PI / 2; pl.position.y = 0.0065; g.add(pl); }
  return g;
}
export function laptop(o) { o = o || {}; const g = grp(); g.add(rbox(0.36, 0.015, 0.25, C.metal, { r: 0.005 })); const lid = rbox(0.36, 0.23, 0.012, C.metal, { r: 0.005, y: 0, z: -0.125 }); lid.rotation.x = -0.25; lid.position.y = 0.115; g.add(lid); const scr = new THREE.Mesh(new THREE.PlaneGeometry(0.33, 0.2), o.tex ? new THREE.MeshBasicMaterial({ map: o.tex, toneMapped: false }) : mat(0x3A2C78, { emis: 0x5E46B8, ei: 0.3 })); scr.position.set(0, 0.115, -0.117); scr.rotation.x = -0.25; g.add(scr); g.userData.screen = scr; return g; }
export function phone() { const g = grp(); g.add(rbox(0.07, 0.012, 0.14, C.metal2, { r: 0.006 })); return g; }
/* ═══ lampes ═══ */
export const LAMPS = { articulee: 'Lampe articulée', boule: 'Lampe boule', champignon: 'Lampe champignon', none: 'Aucune' }; /* plus de néon mural (Ethan, 08/11 soir) */
export function lamp(style, accent, withLight) {
  const g = grp(); const a = accent == null ? C.metal2 : accent;
  if (style === 'none') return g;
  if (style === 'boule') { g.add(cyl(0.07, 0.09, 0.02, a), cyl(0.012, 0.012, 0.28, a, { y: 0.02, seg: 8 }), sph(0.1, C.lum, { y: 0.28, emis: C.lum, ei: 0.9, seg: 16 })); }
  else if (style === 'champignon') { g.add(cyl(0.08, 0.1, 0.02, a), cyl(0.025, 0.03, 0.26, a, { y: 0.02 }), cyl(0.02, 0.17, 0.12, a, { y: 0.26 }), cyl(0.16, 0.16, 0.012, C.lum, { y: 0.255, emis: C.lum, ei: 0.8, shadow: false })); }
  else if (style === 'neon') { const b = rbox(0.8, 0.035, 0.035, C.lum, { r: 0.015, emis: C.lum, ei: 1.1, shadow: false }); g.add(b); }
  else { g.add(cyl(0.07, 0.09, 0.025, a)); const a1 = cyl(0.012, 0.012, 0.36, a, { seg: 8 }); a1.rotation.z = 0.35; a1.position.set(0.06, 0.2, 0); g.add(a1); const a2 = cyl(0.012, 0.012, 0.34, a, { seg: 8 }); a2.rotation.z = -1.1; a2.position.set(0.0, 0.47, 0); g.add(a2); const head = cyl(0.03, 0.085, 0.12, a, { seg: 14 }); head.rotation.z = -0.9; head.position.set(-0.17, 0.4, 0); g.add(head); const bulb = sph(0.035, C.lum, { emis: C.lum, ei: 1.0, seg: 10, shadow: false }); bulb.position.set(-0.21, 0.35, 0); g.add(bulb); }
  if (withLight) { const l = new THREE.PointLight(0xFFE2A8, style === 'neon' ? 2.5 : 3.5, 3.2, 1.8); l.position.set(style === 'articulee' ? -0.2 : 0, style === 'neon' ? 0 : 0.35, 0.05); g.add(l); }
  return g;
}
/* ═══ plantes ═══ */
export const PLANTS = { monstera: 'Monstera', ficus: 'Ficus', cactus: 'Cactus', palmier: 'Palmier', bonsai: 'Bonsaï', fleurs: 'Bouquet', succulente: 'Succulente' };
export function plant(kind, potColor) {
  const g = grp(); const pc = potColor == null ? C.kraft2 : potColor;
  const pot = (r, h) => { g.add(cyl(r, r * 0.8, h, pc, { seg: 16 }), cyl(r * 0.92, r * 0.92, 0.02, C.terre, { y: h - 0.02, shadow: false })); return h; };
  if (kind === 'cactus') { const h = pot(0.14, 0.2); g.add(cyl(0.09, 0.1, 0.6, C.feuille2, { y: h, seg: 12 }), sph(0.09, C.feuille2, { y: h + 0.55 })); const arm = cyl(0.05, 0.05, 0.3, C.feuille2, { seg: 10 }); arm.rotation.z = Math.PI / 2; arm.position.set(0.2, h + 0.3, 0); g.add(arm, cyl(0.05, 0.05, 0.22, C.feuille2, { x: 0.33, y: h + 0.3, seg: 10 }), sph(0.05, C.feuille2, { x: 0.33, y: h + 0.5 })); return g; }
  if (kind === 'succulente') { const h = pot(0.09, 0.1); for (let i = 0; i < 7; i++) { const an = i / 7 * Math.PI * 2; const l = sph(0.045, i % 2 ? C.feuille3 : C.feuille, { seg: 8 }); l.scale.set(1, 0.6, 1.6); l.rotation.y = -an; l.position.set(Math.cos(an) * 0.05, h + 0.03, Math.sin(an) * 0.05); g.add(l); } g.add(sph(0.04, C.feuille3, { y: h + 0.02 })); return g; }
  if (kind === 'fleurs') { g.add(cyl(0.06, 0.045, 0.24, C.verre, { rough: 0.3, op: 0.8, seg: 14 })); const cols = [C.rose, C.jaune, C.orange, C.rose, C.blanc]; for (let i = 0; i < 5; i++) { const an = i / 5 * Math.PI * 2; g.add(cyl(0.005, 0.005, 0.26, C.feuille2, { x: Math.cos(an) * 0.03, z: Math.sin(an) * 0.03, y: 0.1, seg: 6 }), sph(0.04, cols[i], { x: Math.cos(an) * 0.05, z: Math.sin(an) * 0.05, y: 0.33, seg: 10 })); } return g; }
  if (kind === 'bonsai') { const h = pot(0.16, 0.08); const t = cyl(0.03, 0.045, 0.3, C.bois3, { y: h, seg: 8 }); t.rotation.z = 0.25; g.add(t); [[0.08, 0.4, 0.14], [-0.06, 0.34, 0.1], [0.02, 0.5, 0.11]].forEach(([x, y, r]) => { const s = sph(r, C.feuille2, { seg: 12 }); s.scale.set(1.4, 0.5, 1.4); s.position.set(x, y, 0); g.add(s); }); return g; }
  if (kind === 'palmier') { const h = pot(0.16, 0.26); g.add(cyl(0.04, 0.06, 0.9, C.bois2, { y: h, seg: 8 })); for (let i = 0; i < 7; i++) { const an = i / 7 * Math.PI * 2; const f = rbox(0.55, 0.02, 0.14, C.feuille, { r: 0.01 }); f.position.set(Math.cos(an) * 0.27, h + 0.92 - Math.abs(Math.sin(an * 2)) * 0.04, Math.sin(an) * 0.27); f.rotation.y = -an; f.rotation.z = 0.35; g.add(f); } return g; }
  if (kind === 'ficus') { const h = pot(0.17, 0.3); g.add(cyl(0.03, 0.04, 0.7, C.bois2, { y: h, seg: 8 })); [[0, 1.05, 0.26], [0.16, 0.9, 0.18], [-0.15, 0.95, 0.19], [0.05, 1.28, 0.17], [-0.06, 0.78, 0.15]].forEach(([x, y, r]) => g.add(sph(r, [C.feuille, C.feuille2, C.feuille3][Math.round(y * 10) % 3], { x, y: y - r, z: x * 0.5, seg: 12 }))); return g; }
  // monstera
  const h = pot(0.17, 0.32); for (let i = 0; i < 6; i++) { const an = i / 6 * Math.PI * 2 + 0.3; const st = cyl(0.01, 0.012, 0.45, C.feuille2, { seg: 6 }); st.rotation.z = Math.cos(an) * 0.5; st.rotation.x = -Math.sin(an) * 0.5; st.position.set(Math.cos(an) * 0.08, h + 0.2, Math.sin(an) * 0.08); g.add(st); const lf = sph(0.16, i % 2 ? C.feuille : C.feuille2, { seg: 12 }); lf.scale.set(1.2, 0.18, 1); lf.rotation.y = -an; lf.rotation.z = 0.3; lf.position.set(Math.cos(an) * 0.25, h + 0.42 + (i % 3) * 0.05, Math.sin(an) * 0.25); g.add(lf); }
  return g;
}
/* ═══ affiches et cadres (textures peintes) ═══ */
/* la série « réseau de chaleur » d'abord (plan de réseau, tube pré-isolé, soudure, manchonnage, chaufferie : même style, fond Nuit, trait blanc, accents orange / rouge aller / bleu retour), puis le reste */
export const POSTERS = { photo: 'Mon image (à importer)', reseau: 'Plan de réseau', coupe: 'Tube pré-isolé (coupe)', soudure: 'Soudure bout à bout', manchon: 'Manchonnage', chaufferie: 'Chaufferie', tube: 'Logo Tracé', securite: 'Sécurité d\'abord', chantier: 'Chantier au lever du jour', montagne: 'Montagne', vague: 'Vague', ville: 'Ville la nuit', carte: 'Carte', abstrait: 'Abstrait', musique: 'Vinyle', foot: 'Football', moto: 'Moto', maillot: 'Maillot encadré', espace: 'Espace', plage: 'Plage' };
const SERIE = new Set(['reseau', 'coupe', 'soudure', 'manchon', 'chaufferie']);
/** fond commun de la série : dégradé Nuit, trame fine, titre en capitales en bas sous un filet orange, mention « TRACÉ · RÉSEAU DE CHALEUR » */
function serieFond(g, w, h, title, sub) {
  const G = g.createLinearGradient(0, 0, 0, h); G.addColorStop(0, '#2B1B5A'); G.addColorStop(1, '#1B1530'); g.fillStyle = G; g.fillRect(0, 0, w, h);
  g.strokeStyle = 'rgba(255,255,255,.06)'; g.lineWidth = 1; for (let x = w / 12; x < w; x += w / 12) { g.beginPath(); g.moveTo(x, 0); g.lineTo(x, h * 0.78); g.stroke(); } for (let y = w / 12; y < h * 0.78; y += w / 12) { g.beginPath(); g.moveTo(0, y); g.lineTo(w, y); g.stroke(); }
  g.fillStyle = '#F08A3C'; g.fillRect(w * 0.1, h * 0.8, w * 0.8, Math.max(2, h * 0.006));
  g.fillStyle = '#FFFFFF'; g.textAlign = 'center'; g.font = `800 ${Math.round(h * 0.052)}px ${FONT}`; g.fillText(title, w / 2, h * 0.875); g.fillStyle = '#B9AEE6'; g.font = `600 ${Math.round(h * 0.03)}px ${FONT}`; g.fillText(sub || 'TRACÉ · RÉSEAU DE CHALEUR', w / 2, h * 0.93); g.textAlign = 'left';
}
function drawSerie(g, w, h, kind) {
  const circle = (x, y, r, c) => { g.fillStyle = c; g.beginPath(); g.arc(x, y, r, 0, Math.PI * 2); g.fill(); };
  const ring = (x, y, r, c, lw) => { g.strokeStyle = c; g.lineWidth = lw; g.beginPath(); g.arc(x, y, r, 0, Math.PI * 2); g.stroke(); };
  const poly = (pts, c, lw) => { g.strokeStyle = c; g.lineWidth = lw; g.lineJoin = 'round'; g.lineCap = 'round'; g.beginPath(); pts.forEach((p, i) => i ? g.lineTo(p[0] * w, p[1] * h) : g.moveTo(p[0] * w, p[1] * h)); g.stroke(); };
  const ALLER = '#E2584E', RETOUR = '#5B8FE0', JAUNE = '#F2C14E', ACIER = '#AEB6C2', PE = '#0F0C1E';
  if (kind === 'reseau') { serieFond(g, w, h, 'PLAN DE RÉSEAU'); /* chaufferie en haut à gauche, deux conduites (aller rouge, retour bleu) qui se ramifient vers les sous-stations */
    g.fillStyle = '#F08A3C'; g.fillRect(w * 0.1, h * 0.12, w * 0.16, h * 0.1); g.fillRect(w * 0.13, h * 0.06, w * 0.03, h * 0.06); circle(w * 0.145, h * 0.05, w * 0.025, 'rgba(255,255,255,.55)');
    const path = [[0.18, 0.22], [0.18, 0.42], [0.5, 0.42], [0.5, 0.64], [0.82, 0.64]]; poly(path.map(p => [p[0] + 0.012, p[1] + 0.012]), RETOUR, w * 0.022); poly(path, ALLER, w * 0.022);
    poly([[0.5, 0.42], [0.82, 0.42], [0.82, 0.26]], ALLER, w * 0.016); poly([[0.512, 0.432], [0.832, 0.432], [0.832, 0.272]], RETOUR, w * 0.016); poly([[0.18, 0.42], [0.18, 0.7], [0.32, 0.7]], ALLER, w * 0.016); poly([[0.192, 0.432], [0.192, 0.712], [0.32, 0.712]], RETOUR, w * 0.016);
    [[0.82, 0.26], [0.32, 0.7], [0.82, 0.64], [0.5, 0.64]].forEach(([x, y]) => { g.fillStyle = '#F5F4FA'; g.fillRect(x * w - w * 0.045, y * h - h * 0.035, w * 0.09, h * 0.07); circle(x * w, y * h, w * 0.018, JAUNE); });
    g.fillStyle = '#F5F4FA'; g.font = `700 ${Math.round(h * 0.03)}px ${FONT}`; g.fillText('aller', w * 0.56, h * 0.395); g.fillStyle = '#B9D4FF'; g.fillText('retour', w * 0.56, h * 0.49); }
  else if (kind === 'coupe') { serieFond(g, w, h, 'TUBE PRÉ-ISOLÉ', 'ACIER · MOUSSE PUR · GAINE PE'); const cx = w / 2, cy = h * 0.42, R = w * 0.36; /* gaine PE noire, mousse PUR jaune, tube acier, eau chaude */
    circle(cx, cy, R, PE); ring(cx, cy, R, '#F5F4FA', w * 0.012); circle(cx, cy, R * 0.86, JAUNE); circle(cx, cy, R * 0.5, ACIER); circle(cx, cy, R * 0.42, ALLER); circle(cx - R * 0.14, cy - R * 0.14, R * 0.1, 'rgba(255,255,255,.35)');
    g.fillStyle = '#1B1530'; g.font = `800 ${Math.round(h * 0.034)}px ${FONT}`; g.textAlign = 'center'; g.fillText('PUR', cx, cy - R * 0.64); g.fillStyle = '#F5F4FA'; g.fillText('PE', cx, cy + R * 0.96); g.fillStyle = '#1B1530'; g.font = `800 ${Math.round(h * 0.028)}px ${FONT}`; g.fillText('acier', cx, cy + R * 0.3); g.textAlign = 'left'; }
  else if (kind === 'soudure') { serieFond(g, w, h, 'SOUDURE BOUT À BOUT'); const y = h * 0.44, r = h * 0.09; /* deux tubes acier qui se rejoignent, chanfrein en V, arc éclatant et étincelles */
    g.fillStyle = ACIER; g.fillRect(0, y - r, w * 0.47, r * 2); g.fillRect(w * 0.53, y - r, w * 0.47, r * 2); g.fillStyle = 'rgba(255,255,255,.25)'; g.fillRect(0, y - r * 0.7, w * 0.47, r * 0.35); g.fillRect(w * 0.53, y - r * 0.7, w * 0.47, r * 0.35);
    g.fillStyle = '#7C8591'; g.beginPath(); g.moveTo(w * 0.47, y - r); g.lineTo(w * 0.5, y + r * 0.2); g.lineTo(w * 0.53, y - r); g.closePath(); g.fill(); g.fillStyle = '#E2584E'; g.fillRect(w * 0.47, y + r * 0.2, w * 0.06, r * 0.8);
    const G2 = g.createRadialGradient(w / 2, y - r * 0.4, 0, w / 2, y - r * 0.4, w * 0.2); G2.addColorStop(0, 'rgba(255,255,255,1)'); G2.addColorStop(0.25, 'rgba(255,236,160,.95)'); G2.addColorStop(1, 'rgba(240,138,60,0)'); g.fillStyle = G2; g.fillRect(0, 0, w, h * 0.78);
    g.strokeStyle = '#FFD978'; g.lineWidth = Math.max(2, w * 0.008); g.lineCap = 'round'; for (let i = 0; i < 9; i++) { const a = -Math.PI * 0.95 + i * 0.22; const l = w * (0.14 + (i % 3) * 0.05); g.beginPath(); g.moveTo(w / 2 + Math.cos(a) * w * 0.06, y - r * 0.4 + Math.sin(a) * w * 0.06); g.lineTo(w / 2 + Math.cos(a) * l, y - r * 0.4 + Math.sin(a) * l); g.stroke(); } }
  else if (kind === 'manchon') { serieFond(g, w, h, 'MANCHONNAGE', 'LE JOINT · ÉTANCHE · ISOLÉ'); const y = h * 0.44, r = h * 0.11; /* deux tubes pré-isolés (gaine noire, mousse jaune apparente), le manchon par-dessus la jonction, ses deux évents */
    [[0, w * 0.34], [w * 0.66, w]].forEach(([x0, x1]) => { g.fillStyle = PE; g.fillRect(x0, y - r, x1 - x0, r * 2); g.fillStyle = 'rgba(255,255,255,.12)'; g.fillRect(x0, y - r * 0.75, x1 - x0, r * 0.3); });
    g.fillStyle = JAUNE; g.fillRect(w * 0.34, y - r * 0.84, w * 0.32, r * 1.68); g.fillStyle = ACIER; g.fillRect(w * 0.34, y - r * 0.42, w * 0.32, r * 0.84); g.fillStyle = ALLER; g.fillRect(w * 0.48, y - r * 0.42, w * 0.04, r * 0.84);
    g.fillStyle = '#2A2340'; g.beginPath(); g.roundRect(w * 0.3, y - r * 1.12, w * 0.4, r * 2.24, w * 0.02); g.fill(); g.strokeStyle = '#F5F4FA'; g.lineWidth = w * 0.008; g.stroke(); g.fillStyle = 'rgba(255,255,255,.14)'; g.fillRect(w * 0.3, y - r * 0.9, w * 0.4, r * 0.3);
    circle(w * 0.4, y - r * 1.12, w * 0.02, '#F5F4FA'); circle(w * 0.6, y - r * 1.12, w * 0.02, '#F5F4FA'); g.fillStyle = '#F5F4FA'; g.font = `700 ${Math.round(h * 0.03)}px ${FONT}`; g.textAlign = 'center'; g.fillText('manchon', w / 2, y + r * 1.6); g.textAlign = 'left'; }
  else { serieFond(g, w, h, 'CHAUFFERIE', 'LÀ OÙ LE RÉSEAU COMMENCE'); /* bâtiment violet, cheminée, panache, soleil orange, les deux conduites qui partent vers la droite */
    circle(w * 0.72, h * 0.22, w * 0.13, '#F08A3C'); g.fillStyle = '#5E46B8'; g.fillRect(w * 0.14, h * 0.4, w * 0.5, h * 0.3); g.fillStyle = '#8E7AD6'; g.beginPath(); g.moveTo(w * 0.1, h * 0.4); g.lineTo(w * 0.39, h * 0.3); g.lineTo(w * 0.68, h * 0.4); g.closePath(); g.fill();
    g.fillStyle = '#3A2C78'; g.fillRect(w * 0.5, h * 0.1, w * 0.07, h * 0.3); g.fillStyle = '#F5F4FA'; [[0.535, 0.075, 0.035], [0.57, 0.04, 0.045], [0.62, 0.015, 0.05]].forEach(([x, y, r]) => circle(x * w, y * h, r * w, 'rgba(255,255,255,.85)'));
    g.fillStyle = '#FFD978'; for (let i = 0; i < 3; i++) g.fillRect(w * (0.2 + i * 0.13), h * 0.47, w * 0.07, h * 0.09); g.fillStyle = '#1B1530'; g.fillRect(w * 0.44, h * 0.56, w * 0.1, h * 0.14);
    poly([[0.64, 0.6], [0.92, 0.6]], ALLER, w * 0.03); poly([[0.64, 0.66], [0.92, 0.66]], RETOUR, w * 0.03); }
}
function drawPoster(g, w, h, kind) {
  const grad = (c1, c2) => { const G = g.createLinearGradient(0, 0, 0, h); G.addColorStop(0, c1); G.addColorStop(1, c2); return G; };
  const circle = (x, y, r, c) => { g.fillStyle = c; g.beginPath(); g.arc(x, y, r, 0, Math.PI * 2); g.fill(); };
  const tri = (pts, c) => { g.fillStyle = c; g.beginPath(); g.moveTo(pts[0][0], pts[0][1]); pts.slice(1).forEach(p => g.lineTo(p[0], p[1])); g.closePath(); g.fill(); };
  g.fillStyle = '#F5F4FA'; g.fillRect(0, 0, w, h);
  if (SERIE.has(kind)) { drawSerie(g, w, h, kind); }
  else if (kind === 'photo') { g.fillStyle = '#DDD8EA'; g.fillRect(0, 0, w, h); g.strokeStyle = '#B9B3CC'; g.lineWidth = 4; g.setLineDash([12, 10]); g.strokeRect(14, 14, w - 28, h - 28); g.setLineDash([]); g.fillStyle = '#8E87A6'; g.textAlign = 'center'; g.font = `700 ${Math.round(h * 0.07)}px ${FONT}`; g.fillText('ton image', w / 2, h * 0.48); g.font = `600 ${Math.round(h * 0.045)}px ${FONT}`; g.fillText('(à importer)', w / 2, h * 0.56); g.textAlign = 'left'; }
  else if (kind === 'montagne') { g.fillStyle = grad('#F2D6E6', '#8E7AD6'); g.fillRect(0, 0, w, h); circle(w * 0.72, h * 0.28, w * 0.12, '#FFE9B3'); tri([[0, h * 0.85], [w * 0.38, h * 0.38], [w * 0.62, h * 0.85]], '#5E46B8'); tri([[w * 0.3, h * 0.85], [w * 0.72, h * 0.3], [w, h * 0.85]], '#3A2C78'); tri([[w * 0.62, h * 0.42], [w * 0.72, h * 0.3], [w * 0.82, h * 0.42]], '#fff'); g.fillStyle = '#2B1B5A'; g.fillRect(0, h * 0.85, w, h * 0.15); }
  else if (kind === 'vague') { g.fillStyle = grad('#EAF1F9', '#CFE0EE'); g.fillRect(0, 0, w, h); ['#2A5FB4', '#4A7BD0', '#8DB8E8'].forEach((c, i) => { g.fillStyle = c; g.beginPath(); g.moveTo(0, h); for (let x = 0; x <= w; x += 8) g.lineTo(x, h * (0.55 + i * 0.12) + Math.sin(x / w * Math.PI * 2 + i) * h * 0.08); g.lineTo(w, h); g.closePath(); g.fill(); }); circle(w * 0.3, h * 0.25, w * 0.1, '#FFE9B3'); }
  else if (kind === 'ville') { g.fillStyle = grad('#2B1B5A', '#5E46B8'); g.fillRect(0, 0, w, h); circle(w * 0.78, h * 0.22, w * 0.09, '#FFF2C9'); for (let i = 0; i < 9; i++) { const bw = w / 9, bh = h * (0.25 + ((i * 37) % 10) / 20); g.fillStyle = '#1B1530'; g.fillRect(i * bw, h - bh, bw - 3, bh); for (let y = h - bh + 8; y < h - 10; y += 14) for (let x = i * bw + 5; x < (i + 1) * bw - 8; x += 10) if ((x * 7 + y * 3) % 5 < 3) { g.fillStyle = '#FFD978'; g.fillRect(x, y, 5, 7); } } }
  else if (kind === 'tube') { g.fillStyle = '#2B1B5A'; g.fillRect(0, 0, w, h); const cx = w / 2, cy = h / 2, R = Math.min(w, h) * 0.34; circle(cx, cy, R, '#fff'); circle(cx, cy, R * 0.83, '#2B1B5A'); circle(cx, cy, R * 0.5, '#fff'); circle(cx, cy, R * 0.35, '#2B1B5A'); circle(cx - R * 0.58, cy - R * 0.33, R * 0.085, '#fff'); circle(cx + R * 0.58, cy - R * 0.33, R * 0.085, '#fff'); g.fillStyle = '#E6E1F6'; g.font = `700 ${Math.round(h * 0.09)}px ${FONT}`; g.textAlign = 'center'; g.fillText('TRACÉ', cx, h * 0.92); }
  else if (kind === 'securite') { g.fillStyle = '#FFF0D2'; g.fillRect(0, 0, w, h); g.fillStyle = '#F08A3C'; g.beginPath(); g.arc(w / 2, h * 0.42, w * 0.26, Math.PI, 0); g.fill(); g.fillRect(w * 0.16, h * 0.42, w * 0.68, h * 0.07); g.fillStyle = '#7A4A00'; g.font = `800 ${Math.round(h * 0.09)}px ${FONT}`; g.textAlign = 'center'; g.fillText('SÉCURITÉ', w / 2, h * 0.7); g.fillText('D\'ABORD', w / 2, h * 0.82); }
  else if (kind === 'carte') { g.fillStyle = '#EAF1F9'; g.fillRect(0, 0, w, h); g.fillStyle = '#F3F1EA'; g.beginPath(); [[0.42, 0.08], [0.7, 0.1], [0.85, 0.3], [0.78, 0.55], [0.86, 0.72], [0.62, 0.86], [0.3, 0.84], [0.18, 0.6], [0.05, 0.35], [0.2, 0.22]].forEach((p, i) => i ? g.lineTo(p[0] * w, p[1] * h) : g.moveTo(p[0] * w, p[1] * h)); g.closePath(); g.fill(); g.strokeStyle = '#CFC9E0'; g.lineWidth = 3; g.stroke(); [[0.25, 0.3], [0.62, 0.18], [0.3, 0.66], [0.68, 0.58]].forEach(p => circle(p[0] * w, p[1] * h, w * 0.045, '#5E46B8')); }
  else if (kind === 'abstrait') { g.fillStyle = '#F6F3EC'; g.fillRect(0, 0, w, h); circle(w * 0.35, h * 0.35, w * 0.28, '#E8C98E'); g.fillStyle = '#5E46B8'; g.fillRect(w * 0.45, h * 0.45, w * 0.42, h * 0.42); tri([[w * 0.1, h * 0.9], [w * 0.45, h * 0.55], [w * 0.6, h * 0.9]], '#0E6B5C'); circle(w * 0.75, h * 0.25, w * 0.08, '#2B1B5A'); }
  else if (kind === 'musique') { g.fillStyle = '#F6EEDF'; g.fillRect(0, 0, w, h); circle(w / 2, h / 2, w * 0.4, '#1B1530'); for (let r = w * 0.12; r < w * 0.38; r += w * 0.04) { g.strokeStyle = '#3A3550'; g.lineWidth = 1.5; g.beginPath(); g.arc(w / 2, h / 2, r, 0, Math.PI * 2); g.stroke(); } circle(w / 2, h / 2, w * 0.12, '#F08A3C'); circle(w / 2, h / 2, w * 0.02, '#1B1530'); }
  else if (kind === 'foot') { g.fillStyle = '#6E9B5C'; g.fillRect(0, 0, w, h); g.strokeStyle = '#fff'; g.lineWidth = 3; g.strokeRect(w * 0.1, h * 0.1, w * 0.8, h * 0.8); g.beginPath(); g.moveTo(w / 2, h * 0.1); g.lineTo(w / 2, h * 0.9); g.stroke(); g.beginPath(); g.arc(w / 2, h / 2, w * 0.14, 0, Math.PI * 2); g.stroke(); circle(w * 0.62, h * 0.38, w * 0.07, '#fff'); g.fillStyle = '#1B1530'; for (let i = 0; i < 5; i++) { const an = i / 5 * Math.PI * 2; circle(w * 0.62 + Math.cos(an) * w * 0.04, h * 0.38 + Math.sin(an) * w * 0.04, w * 0.012, '#1B1530'); } }
  else if (kind === 'moto') { g.fillStyle = grad('#FBE6E4', '#E9A9A4'); g.fillRect(0, 0, w, h); g.strokeStyle = '#1B1530'; g.lineWidth = w * 0.06; g.beginPath(); g.arc(w * 0.3, h * 0.68, w * 0.14, 0, Math.PI * 2); g.stroke(); g.beginPath(); g.arc(w * 0.72, h * 0.68, w * 0.14, 0, Math.PI * 2); g.stroke(); g.fillStyle = '#A3221F'; g.beginPath(); g.moveTo(w * 0.3, h * 0.66); g.lineTo(w * 0.45, h * 0.42); g.lineTo(w * 0.7, h * 0.42); g.lineTo(w * 0.72, h * 0.66); g.lineTo(w * 0.55, h * 0.6); g.closePath(); g.fill(); g.fillStyle = '#1B1530'; g.fillRect(w * 0.5, h * 0.36, w * 0.2, h * 0.06); }
  else if (kind === 'maillot') { g.fillStyle = '#F1EEFA'; g.fillRect(0, 0, w, h); g.fillStyle = '#5E46B8'; g.beginPath(); g.moveTo(w * 0.3, h * 0.18); g.lineTo(w * 0.42, h * 0.12); g.lineTo(w * 0.58, h * 0.12); g.lineTo(w * 0.7, h * 0.18); g.lineTo(w * 0.86, h * 0.34); g.lineTo(w * 0.74, h * 0.44); g.lineTo(w * 0.72, h * 0.88); g.lineTo(w * 0.28, h * 0.88); g.lineTo(w * 0.26, h * 0.44); g.lineTo(w * 0.14, h * 0.34); g.closePath(); g.fill(); g.fillStyle = '#fff'; g.font = `800 ${Math.round(h * 0.28)}px ${FONT}`; g.textAlign = 'center'; g.fillText('10', w / 2, h * 0.72); g.font = `700 ${Math.round(h * 0.07)}px ${FONT}`; g.fillText('SCR', w / 2, h * 0.36); }
  else if (kind === 'espace') { g.fillStyle = grad('#1B1530', '#2B1B5A'); g.fillRect(0, 0, w, h); for (let i = 0; i < 60; i++) circle(((i * 73) % 97) / 97 * w, ((i * 41) % 89) / 89 * h, 1.2 + (i % 3) * 0.6, '#fff'); circle(w * 0.6, h * 0.55, w * 0.2, '#E8C98E'); g.strokeStyle = '#F6EEDF'; g.lineWidth = w * 0.025; g.beginPath(); g.ellipse(w * 0.6, h * 0.55, w * 0.34, w * 0.09, -0.35, 0, Math.PI * 2); g.stroke(); circle(w * 0.22, h * 0.25, w * 0.07, '#8DB8E8'); }
  else if (kind === 'plage') { g.fillStyle = grad('#CFE0EE', '#EAF1F9'); g.fillRect(0, 0, w, h * 0.6); g.fillStyle = '#4A7BD0'; g.fillRect(0, h * 0.55, w, h * 0.2); g.fillStyle = '#F6EEDF'; g.fillRect(0, h * 0.72, w, h * 0.28); circle(w * 0.75, h * 0.2, w * 0.1, '#FFE9B3'); g.fillStyle = '#B08A55'; g.fillRect(w * 0.28, h * 0.4, w * 0.03, h * 0.45); for (let i = 0; i < 5; i++) { const an = -0.3 + i * 0.3; g.fillStyle = '#6E9B5C'; g.beginPath(); g.ellipse(w * 0.3 + Math.cos(an - 1.2) * w * 0.12, h * 0.4 + Math.sin(an - 1.2) * h * 0.06, w * 0.13, w * 0.03, an - 1.2, 0, Math.PI * 2); g.fill(); } }
  else { /* chantier au lever du jour */ g.fillStyle = grad('#F2D6E6', '#FFE9B3'); g.fillRect(0, 0, w, h); circle(w * 0.5, h * 0.5, w * 0.16, '#F08A3C'); g.fillStyle = '#6E9B5C'; g.fillRect(0, h * 0.62, w, h * 0.38); g.fillStyle = '#7C6A55'; g.fillRect(w * 0.1, h * 0.7, w * 0.8, h * 0.08); g.fillStyle = '#C8382F'; g.fillRect(w * 0.12, h * 0.71, w * 0.76, h * 0.025); g.fillStyle = '#2A5FB4'; g.fillRect(w * 0.12, h * 0.745, w * 0.76, h * 0.025); g.fillStyle = '#F2C14E'; g.fillRect(w * 0.6, h * 0.5, w * 0.08, h * 0.14); g.fillRect(w * 0.6, h * 0.3, w * 0.04, h * 0.22); }
}
export function poster(kind, o) {
  o = o || {}; const w = o.w || 0.6, h = o.h || 0.8; const g = grp();
  g.add(rbox(w + 0.04, h + 0.04, 0.025, o.frame == null ? C.blanc : o.frame, { r: 0.006, y: -h / 2 - 0.02 }));
  const res = SERIE.has(kind) ? 384 : 256; const t = o.img ? imageTex(o.img, w / h) : canvasTex(res, Math.round(res * h / w), (gg, W, H) => drawPoster(gg, W, H, kind)); /* o.img : l'image importée par la personne */
  const p = new THREE.Mesh(new THREE.PlaneGeometry(w, h), new THREE.MeshStandardMaterial({ map: t, roughness: 0.9 })); p.position.set(0, 0, 0.014); g.add(p); return g; // centré sur son centre (accroché au mur)
}
export const FRAMES = { photo: 'Ma photo (à importer)', famille: 'Photo de famille', chien: 'Photo du chien', vacances: 'Photo de vacances', equipe: 'Photo d\'équipe', moto2: 'Ma moto' };
/** cadre photo posé sur le bureau ; img (data-URL) = la photo de la personne, sinon un dessin selon le genre */
export function frame(kind, img) {
  const g = grp(); const w = 0.16, h = 0.12; const f = rbox(w + 0.02, h + 0.02, 0.012, C.noyer, { r: 0.004, y: 0.01 }); f.rotation.x = -0.18; g.add(f);
  const t = img ? imageTex(img, w / h) : canvasTex(128, 96, (gg, W, H) => { gg.fillStyle = '#EAF1F9'; gg.fillRect(0, 0, W, H); const dot = (x, y, r, c) => { gg.fillStyle = c; gg.beginPath(); gg.arc(x, y, r, 0, 7); gg.fill(); };
    if (kind === 'photo') { gg.fillStyle = '#DDD8EA'; gg.fillRect(0, 0, W, H); gg.fillStyle = '#8E87A6'; gg.font = `700 13px ${FONT}`; gg.textAlign = 'center'; gg.fillText('ta photo', W / 2, H / 2 - 4); gg.font = `600 11px ${FONT}`; gg.fillText('(à importer)', W / 2, H / 2 + 12); gg.textAlign = 'left'; return; }
    if (kind === 'chien') { gg.fillStyle = '#CFE3C6'; gg.fillRect(0, H * 0.6, W, H * 0.4); dot(W * 0.5, H * 0.55, 18, '#B08A55'); dot(W * 0.38, H * 0.42, 7, '#B08A55'); dot(W * 0.62, H * 0.42, 7, '#B08A55'); dot(W * 0.5, H * 0.6, 4, '#1B1530'); }
    else if (kind === 'vacances') { gg.fillStyle = '#4A7BD0'; gg.fillRect(0, H * 0.5, W, H * 0.25); gg.fillStyle = '#F6EEDF'; gg.fillRect(0, H * 0.72, W, H * 0.3); dot(W * 0.78, H * 0.25, 10, '#FFE9B3'); }
    else if (kind === 'moto2') { gg.fillStyle = '#CBCAD4'; gg.fillRect(0, H * 0.6, W, H * 0.4); dot(W * 0.3, H * 0.66, 12, '#1B1530'); dot(W * 0.7, H * 0.66, 12, '#1B1530'); gg.fillStyle = '#A3221F'; gg.fillRect(W * 0.3, H * 0.45, W * 0.4, H * 0.14); }
    else { gg.fillStyle = '#CFE3C6'; gg.fillRect(0, H * 0.62, W, H * 0.4); const n = kind === 'equipe' ? 5 : 3; for (let i = 0; i < n; i++) { const x = W * (0.5 + (i - (n - 1) / 2) * (kind === 'equipe' ? 0.16 : 0.24)); const hh = kind === 'famille' && i === 1 ? 0.3 : 0.4; dot(x, H * (0.62 - hh) , 7, '#F1C39F'); gg.fillStyle = ['#2B1B5A', '#5E46B8', '#F08A3C', '#0E6B5C', '#C08A2E'][i]; gg.fillRect(x - 7, H * (0.62 - hh) + 7, 14, H * hh - 7); } } });
  const p = new THREE.Mesh(new THREE.PlaneGeometry(w, h), new THREE.MeshStandardMaterial({ map: t, roughness: 0.9 })); p.rotation.x = -0.18; p.position.set(0, 0.01 + h / 2 + 0.01, 0.008); g.add(p); return g;
}
/* ═══ murs, sols, tapis, fenêtre ═══ */
export const WALLS = { lavande: 0xE6E1F6, blanc: 0xF7F6FB, sable: 0xF1E6D2, menthe: 0xD7ECE4, ciel: 0xDCE7F4, rose: 0xF6DDE6, nuit: 0x3A2C78, brique: 0xD9A78F, vert: 0xC9DEB8 };
export const WALL_LABELS = { lavande: 'Lavande', blanc: 'Blanc', sable: 'Sable', menthe: 'Menthe', ciel: 'Ciel', rose: 'Rose poudré', nuit: 'Nuit', brique: 'Brique', vert: 'Vert tendre' };
export const FLOORS = { parquet: 'Parquet', beton: 'Béton ciré', moquette: 'Moquette bleue', carrelage: 'Carrelage', noir: 'Parquet foncé' };
export function floorTile(kind, w, d, colOverride) {
  const g = grp(); const col = colOverride != null ? colOverride : ({ parquet: 0xDDBE92, beton: 0xD8D5DF, moquette: 0xC7D6EE, carrelage: 0xF0EEF4, noir: 0x8F6B47 }[kind] || 0xDDBE92);
  g.add(rbox(w, 0.08, d, col, { r: 0.02, y: -0.08, rough: kind === 'beton' ? 0.5 : 0.9 }));
  if (kind === 'parquet' || kind === 'noir') { const n = Math.floor(w / 0.18); for (let i = 1; i < n; i++) { const l = box(0.006, 0.002, d - 0.02, colOverride != null ? new THREE.Color(colOverride).multiplyScalar(0.82).getHex() : kind === 'noir' ? 0x7A5838 : 0xC9A97A, { x: -w / 2 + i * (w / n), y: 0.0, shadow: false }); g.add(l); } }
  if (kind === 'carrelage') { for (let i = 1; i < w / 0.5; i++) g.add(box(0.006, 0.002, d - 0.02, 0xDDD8EA, { x: -w / 2 + i * 0.5, shadow: false })); for (let j = 1; j < d / 0.5; j++) g.add(box(w - 0.02, 0.002, 0.006, 0xDDD8EA, { z: -d / 2 + j * 0.5, shadow: false })); }
  return g;
}
export const RUGS = { none: 'Aucun', violet: 'Violet', rayures: 'Rayures', rond: 'Rond crème', menthe: 'Menthe', berbere: 'Berbère' };
const RUG_TEX = new Map();
function rugTex(kind, acc, tinted0) {
  const key = kind + '|' + acc + '|' + (arguments[2] ? 1 : 0); let t = RUG_TEX.get(key); if (t) return t; const tinted = !!arguments[2];
  const round = kind === 'rond'; const Wc = 512, Hc = round ? 512 : 372;
  t = canvasTex(Wc, Hc, (g, W, H) => {
    const fill = (c) => { g.fillStyle = c; g.fillRect(0, 0, W, H); };
    if (kind === 'berbere') { fill(tinted ? acc : '#F3ECDF'); g.strokeStyle = 'rgba(43,38,64,.78)'; g.lineWidth = 4; g.lineJoin = 'round'; const n = 7, sx = W / n, sy = H / 4; for (let r = 0; r < 4; r++) for (let c = 0; c < n; c++) { const x = c * sx + sx / 2, y = r * sy + sy / 2; g.beginPath(); g.moveTo(x, y - sy / 2 + 6); g.lineTo(x + sx / 2 - 6, y); g.lineTo(x, y + sy / 2 - 6); g.lineTo(x - sx / 2 + 6, y); g.closePath(); g.stroke(); } g.strokeStyle = 'rgba(43,38,64,.5)'; g.lineWidth = 6; g.strokeRect(14, 14, W - 28, H - 28); }
    else if (kind === 'rayures') { fill(tinted ? acc : '#F4EFE6'); for (let i = 0; i < 9; i++) { g.fillStyle = i % 2 ? acc : '#2B2640'; const y = 26 + i * (H - 52) / 9; g.fillRect(0, y, W, i % 2 ? 22 : 6); } }
    else if (kind === 'menthe') { fill(tinted ? acc : '#BFE3D9'); g.strokeStyle = '#8CC9B8'; g.lineWidth = 16; g.strokeRect(18, 18, W - 36, H - 36); g.fillStyle = '#E9F6F1'; for (let x = 60; x < W - 40; x += 34) for (let y = 60; y < H - 40; y += 34) { g.beginPath(); g.arc(x, y, 4, 0, 7); g.fill(); } }
    else if (round) { fill(tinted ? acc : '#F6F1E7'); [[230, '#E8C98E', 14], [180, acc, 10], [120, '#E8C98E', 8], [60, acc, 6]].forEach(([r, c, w]) => { g.strokeStyle = c; g.lineWidth = w; g.beginPath(); g.arc(W / 2, H / 2, r, 0, 7); g.stroke(); }); }
    else { fill(acc); g.strokeStyle = 'rgba(255,255,255,.35)'; g.lineWidth = 14; g.strokeRect(22, 22, W - 44, H - 44); g.strokeStyle = 'rgba(255,255,255,.18)'; g.lineWidth = 4; g.strokeRect(46, 46, W - 92, H - 92); g.fillStyle = 'rgba(255,255,255,.14)'; g.beginPath(); g.ellipse(W / 2, H / 2, 70, 46, 0, 0, 7); g.fill(); }
  }); RUG_TEX.set(key, t); return t;
}
export function rug(kind, accent, col) {
  const g = grp(); if (!kind || kind === 'none') return g;
  const acc = '#' + new THREE.Color(col != null ? col : accent == null ? C.lav2 : accent).getHexString(); const round = kind === 'rond'; const w = round ? 2.0 : 2.2, d = round ? 2.0 : 1.6;
  const edge = col != null ? new THREE.Color(col).multiplyScalar(0.8).getHex() : kind === 'berbere' ? 0xE7DCC8 : kind === 'menthe' ? 0x9FD3C4 : kind === 'rayures' ? 0xE9E1D2 : round ? 0xE8DDC9 : new THREE.Color(acc).multiplyScalar(0.8).getHex();
  g.add(round ? cyl(1.0, 1.0, 0.014, edge, { seg: 48 }) : rbox(w, 0.014, d, edge, { r: 0.005 }));
  const top = new THREE.Mesh(round ? new THREE.CircleGeometry(0.99, 48) : new THREE.PlaneGeometry(w - 0.01, d - 0.01), new THREE.MeshStandardMaterial({ map: rugTex(kind, acc, col != null), roughness: 1 })); top.rotation.x = -Math.PI / 2; top.position.y = 0.0155; top.receiveShadow = true; g.add(top);
  if (kind === 'berbere') [-1, 1].forEach(sx => { for (let i = 0; i < 16; i++) g.add(box(0.07, 0.004, 0.014, col != null ? col : 0xF3ECDF, { x: sx * (w / 2 + 0.03), z: -d / 2 + 0.06 + i * (d - 0.12) / 15, shadow: false })); });
  return g;
}
/** la vue derrière une fenêtre (ville, campagne, mer, montagne, ville la nuit) */
export function viewTex(view, w, h) {
  return canvasTex(256, Math.round(256 * h / w), (gg, W, H) => { const G = gg.createLinearGradient(0, 0, 0, H);
    if (view === 'nuit') { G.addColorStop(0, '#1B1530'); G.addColorStop(1, '#5E46B8'); gg.fillStyle = G; gg.fillRect(0, 0, W, H); for (let i = 0; i < 8; i++) { gg.fillStyle = '#2B1B5A'; const bh = H * (0.3 + (i * 29 % 10) / 20); gg.fillRect(i * W / 8, H - bh, W / 8 - 3, bh); gg.fillStyle = '#FFD978'; for (let y = H - bh + 8; y < H - 8; y += 12) for (let x = i * W / 8 + 5; x < (i + 1) * W / 8 - 8; x += 9) if ((x * 3 + y) % 4 < 2) gg.fillRect(x, y, 4, 6); } }
    else { G.addColorStop(0, '#BFD7F2'); G.addColorStop(1, '#EAF1F9'); gg.fillStyle = G; gg.fillRect(0, 0, W, H); gg.fillStyle = '#FFF2C9'; gg.beginPath(); gg.arc(W * 0.75, H * 0.22, W * 0.08, 0, 7); gg.fill(); gg.fillStyle = 'rgba(255,255,255,.85)'; [[0.2, 0.3], [0.5, 0.2], [0.35, 0.42]].forEach(([x, y]) => { gg.beginPath(); gg.ellipse(W * x, H * y, W * 0.12, H * 0.05, 0, 0, 7); gg.fill(); });
      if (view === 'mer') { gg.fillStyle = '#4A7BD0'; gg.fillRect(0, H * 0.55, W, H * 0.45); gg.fillStyle = '#F6EEDF'; gg.fillRect(0, H * 0.82, W, H * 0.18); }
      else if (view === 'montagne') { gg.fillStyle = '#8E7AD6'; gg.beginPath(); gg.moveTo(0, H); gg.lineTo(W * 0.3, H * 0.35); gg.lineTo(W * 0.55, H * 0.7); gg.lineTo(W * 0.78, H * 0.3); gg.lineTo(W, H); gg.fill(); gg.fillStyle = '#fff'; gg.beginPath(); gg.moveTo(W * 0.72, H * 0.42); gg.lineTo(W * 0.78, H * 0.3); gg.lineTo(W * 0.84, H * 0.42); gg.fill(); gg.fillStyle = '#6E9B5C'; gg.fillRect(0, H * 0.75, W, H * 0.25); }
      else if (view === 'campagne') { gg.fillStyle = '#8DB27A'; gg.beginPath(); gg.ellipse(W * 0.3, H * 0.85, W * 0.6, H * 0.35, 0, 0, 7); gg.fill(); gg.fillStyle = '#6E9B5C'; gg.beginPath(); gg.ellipse(W * 0.85, H * 0.95, W * 0.5, H * 0.35, 0, 0, 7); gg.fill(); gg.fillStyle = '#7C6A55'; gg.fillRect(W * 0.6, H * 0.5, W * 0.02, H * 0.2); gg.fillStyle = '#6E9B5C'; gg.beginPath(); gg.arc(W * 0.61, H * 0.47, W * 0.07, 0, 7); gg.fill(); }
      else { for (let i = 0; i < 7; i++) { gg.fillStyle = ['#D6CEF2', '#C9C3DC', '#E6E1F6'][i % 3]; const bh = H * (0.3 + (i * 31 % 10) / 22); gg.fillRect(i * W / 7, H - bh, W / 7 - 4, bh); gg.fillStyle = '#F5F4FA'; for (let y = H - bh + 10; y < H - 8; y += 14) for (let x = i * W / 7 + 6; x < (i + 1) * W / 7 - 10; x += 11) gg.fillRect(x, y, 5, 7); } } } });
}
export const WINDOWS = { ville: 'Vue sur la ville', campagne: 'Campagne', mer: 'Mer', montagne: 'Montagne', nuit: 'Ville la nuit', none: 'Pas de fenêtre' };
export function window_(view, o) {
  o = o || {}; const w = o.w || 1.5, h = o.h || 1.2; const g = grp();
  if (view === 'none') return g;
  const fr = rbox(w + 0.1, h + 0.1, 0.05, C.blanc, { r: 0.01, y: -h / 2 - 0.05 }); fr.position.z = -0.03; g.add(fr);
  const t = viewTex(view, w, h);
  const p = new THREE.Mesh(new THREE.PlaneGeometry(w, h), new THREE.MeshBasicMaterial({ map: t })); p.position.set(0, 0, 0.0); g.add(p);
  g.add(box(0.035, h, 0.02, C.blanc, { y: -h / 2, z: 0.005 }), box(w, 0.035, 0.02, C.blanc, { y: -0.018, z: 0.005 }));
  if (o.curtains !== false) { [-1, 1].forEach(sx => { for (let k = 0; k < 3; k++) g.add(rbox(0.07, h + 0.16, 0.07, o.curtain || C.lav2, { r: 0.03, x: sx * (w / 2 + 0.06 + k * 0.07), y: -h / 2 - 0.1, z: 0.05 })); }); const rod = cyl(0.012, 0.012, w + 0.6, C.metal, { seg: 8 }); rod.rotation.z = Math.PI / 2; rod.position.set(0, h / 2 + 0.1, 0.06); g.add(rod, sph(0.028, C.metal, { x: -w / 2 - 0.3, y: h / 2 + 0.072, z: 0.06, seg: 8 }), sph(0.028, C.metal, { x: w / 2 + 0.3, y: h / 2 + 0.072, z: 0.06, seg: 8 })); }
  return g;
}
/* ═══ petits objets ═══ */
export const OBJETS = {
  mug: 'Mug', thermos: 'Thermos', radio: 'Radio', casque_audio: 'Casque audio', casque: 'Casque de chantier', trophee: 'Trophée', coupe: 'Coupe', medaille: 'Médaille encadrée', horloge: 'Horloge', tableau: 'Tableau blanc', etagere: 'Étagère + classeurs', guirlande: 'Guirlande lumineuse', ballon: 'Ballon de foot', basket: 'Mini panier de basket', console: 'Console de jeu', chien: 'Chien couché', chat: 'Chat', poubelle: 'Corbeille', portemanteau: 'Portemanteau', velo: 'Vélo', skate: 'Skate', livres: 'Pile de livres', globe: 'Globe', haltere: 'Haltères', guitare: 'Guitare', bougie: 'Bougie', dossiers: 'Bac à dossiers', imprimante: 'Imprimante', ventilo: 'Ventilateur'
};
let BALL_TEX = null;
/** texture équirectangulaire du ballon : pour chaque pixel, le sommet d'icosaèdre le plus proche ; noir si le point est dans son pentagone (sommets tournés vers les 5 voisins) */
function ballTex() {
  if (BALL_TEX) return BALL_TEX; const W = 1024, H = 512; const c = document.createElement('canvas'); c.width = W; c.height = H; const g = c.getContext('2d'); const img = g.createImageData(W, H); const D = img.data;
  const ph = (1 + Math.sqrt(5)) / 2; const N = [[0, 1, ph], [0, -1, ph], [0, 1, -ph], [0, -1, -ph], [1, ph, 0], [-1, ph, 0], [1, -ph, 0], [-1, -ph, 0], [ph, 0, 1], [-ph, 0, 1], [ph, 0, -1], [-ph, 0, -1]].map(v => { const l = Math.hypot(...v); return v.map(x => x / l); });
  const dot = (a, b) => a[0] * b[0] + a[1] * b[1] + a[2] * b[2], cross = (a, b) => [a[1] * b[2] - a[2] * b[1], a[2] * b[0] - a[0] * b[2], a[0] * b[1] - a[1] * b[0]], nrm = v => { const l = Math.hypot(...v); return v.map(x => x / l); };
  const P = N.map(n => { const nb = N.filter(m => m !== n && dot(m, n) > 0.4); const t1 = nrm(cross(n, Math.abs(n[0]) < 0.9 ? [1, 0, 0] : [0, 1, 0])), t2 = cross(n, t1); nb.sort((a, b) => Math.atan2(dot(a, t2), dot(a, t1)) - Math.atan2(dot(b, t2), dot(b, t1))); const k = 0.36; const V = nb.map(m => nrm(n.map((x, i) => x * (1 - k) + m[i] * k))); return V.map((v, i) => { const pl = cross(v, V[(i + 1) % 5]); return dot(pl, n) >= 0 ? pl : pl.map(x => -x); }); });
  for (let j = 0; j < H; j++) { const th = (j + 0.5) / H * Math.PI; const st = Math.sin(th), ct = Math.cos(th); for (let i = 0; i < W; i++) { const phi = (i + 0.5) / W * Math.PI * 2; const d = [-Math.cos(phi) * st, ct, Math.sin(phi) * st]; let best = 0, bd = -2; for (let q = 0; q < 12; q++) { const v = dot(d, N[q]); if (v > bd) { bd = v; best = q; } } let m = Infinity; for (const pl of P[best]) { const e = dot(pl, d) / Math.hypot(...pl); if (e < m) m = e; } const o = (j * W + i) * 4; const col = m > 0.004 ? 30 : m > -0.004 ? 120 : 248; D[o] = col; D[o + 1] = col; D[o + 2] = m > 0.004 ? 42 : col === 248 ? 245 : 125; D[o + 3] = 255; } }
  g.putImageData(img, 0, 0); BALL_TEX = new THREE.CanvasTexture(c); BALL_TEX.colorSpace = THREE.SRGBColorSpace; BALL_TEX.anisotropy = 4; KEEP_TEX.add(BALL_TEX); return BALL_TEX;
}
export function objet(kind, accent) {
  const a = accent == null ? C.violet : accent; const g = grp();
  switch (kind) {
    case 'mug': g.add(cyl(0.045, 0.04, 0.1, a, { seg: 16 }), cyl(0.038, 0.038, 0.01, 0x6B4A2E, { y: 0.1, seg: 16, shadow: false })); { const h = new THREE.Mesh(new THREE.TorusGeometry(0.03, 0.008, 8, 16), mat(a)); h.position.set(0.055, 0.05, 0); g.add(h); } break;
    /* ── accessoires du réseau de chaleur (Ethan, 08/11 soir) ── */
    case 'tube_statue': { /* une maquette de tube pré-isolé coupée : gaine PE noire, mousse PUR jaune, tube acier, sur un socle bois */ const PE = 0x1E1B2A, PUR = 0xF2C14E; g.add(rbox(0.2, 0.02, 0.11, C.noyer, { r: 0.006 })); [-0.055, 0.055].forEach(x => g.add(rbox(0.03, 0.03, 0.07, 0x3A3550, { r: 0.006, x, y: 0.02 }))); const lay = (r, len, col, o) => { const c = cyl(r, r, len, col, Object.assign({ seg: 24 }, o || {})); c.rotation.z = Math.PI / 2; c.position.set(0, 0.095, 0); return c; }; g.add(lay(0.045, 0.16, PE, { rough: 0.6 }), lay(0.04, 0.17, PUR, { rough: 1 }), lay(0.022, 0.2, C.metal, { rough: 0.35, metal: 0.6 })); g.add(cyl(0.017, 0.017, 0.2, C.rouge, { seg: 16 }).rotateZ(Math.PI / 2).translateX(0).translateY(0)); g.children[g.children.length - 1].position.set(0, 0.095, 0); g.children[g.children.length - 1].rotation.z = Math.PI / 2; g.children[g.children.length - 1].scale.set(1, 1.004, 1); g.add(rbox(0.09, 0.016, 0.004, 0xE8C98E, { r: 0.002, y: 0.002, z: 0.055, metal: 0.6, rough: 0.35 })); } break;
    case 'torche': { /* torche de soudage (MIG) posée sur le bureau : poignée noire, col métal coudé, buse cuivre, câble */ const hd = cyl(0.016, 0.014, 0.14, C.encre, { seg: 14 }); hd.rotation.z = Math.PI / 2 + 0.15; hd.position.set(-0.04, 0.022, 0); g.add(hd); g.add(rbox(0.03, 0.012, 0.02, C.rouge, { r: 0.004, x: -0.03, y: 0.03 })); const neck = cyl(0.008, 0.008, 0.1, C.metal, { seg: 10, metal: 0.6, rough: 0.35 }); neck.rotation.z = Math.PI / 2 - 0.5; neck.position.set(0.07, 0.04, 0); g.add(neck); const noz = cyl(0.012, 0.009, 0.045, 0xC97B3A, { seg: 12, metal: 0.7, rough: 0.3 }); noz.rotation.z = Math.PI / 2 - 0.5; noz.position.set(0.13, 0.07, 0); g.add(noz); const tip = cyl(0.002, 0.002, 0.03, 0xF1F1F1, { seg: 6 }); tip.rotation.z = Math.PI / 2 - 0.5; tip.position.set(0.15, 0.08, 0); g.add(tip); const curve = new THREE.CatmullRomCurve3([new THREE.Vector3(-0.11, 0.012, 0), new THREE.Vector3(-0.18, 0.01, 0.06), new THREE.Vector3(-0.14, 0.008, 0.15), new THREE.Vector3(-0.02, 0.006, 0.18)]); g.add(new THREE.Mesh(new THREE.TubeGeometry(curve, 20, 0.007, 6), mat(C.encre))); } break;
    case 'masque': { /* masque de soudeur (cagoule à cristaux) posé debout, légèrement incliné */ const m = grp(0, 0, 0); const sh = rbox(0.2, 0.24, 0.1, 0x2A2340, { r: 0.04, y: 0 }); sh.scale.z = 0.8; m.add(sh); m.add(box(0.11, 0.045, 0.006, 0x1F4D3A, { y: 0.13, z: 0.05, shadow: false }), box(0.115, 0.05, 0.004, C.metal2, { y: 0.1275, z: 0.048, shadow: false })); m.add(rbox(0.16, 0.012, 0.006, a, { r: 0.003, y: 0.2, z: 0.052, shadow: false })); const band = new THREE.Mesh(new THREE.TorusGeometry(0.095, 0.01, 8, 20, Math.PI), mat(C.encre)); band.rotation.x = Math.PI / 2; band.rotation.z = Math.PI; band.position.set(0, 0.12, -0.03); m.add(band); m.rotation.x = -0.25; m.position.y = 0.02; g.add(m); } break;
    case 'flambart': { /* le flambart (chalumeau propane) : bouteille, flexible, lance appuyée contre la bouteille avec sa tête en cloche */ g.add(cyl(0.12, 0.12, 0.42, 0x8E96A3, { seg: 24, rough: 0.5, metal: 0.4 }), cyl(0.09, 0.12, 0.05, 0x8E96A3, { y: 0.42, seg: 24, rough: 0.5, metal: 0.4 }), cyl(0.045, 0.045, 0.07, 0x2456C8, { y: 0.47, seg: 16 }), cyl(0.015, 0.015, 0.05, C.metal2, { y: 0.54, seg: 10 }), cyl(0.02, 0.02, 0.02, 0xC9241C, { y: 0.56, seg: 10 }), cyl(0.125, 0.125, 0.02, 0x3A3550, { seg: 24 })); const lance = grp(0.17, 0, -0.02); lance.rotation.z = 0.22; lance.add(cyl(0.018, 0.018, 0.14, C.encre, { y: 0.3, seg: 12 }), cyl(0.009, 0.009, 0.62, C.metal, { y: 0.44, seg: 10, metal: 0.6, rough: 0.35 }), cyl(0.034, 0.02, 0.08, 0x3A3550, { y: 1.06, seg: 14 }), cyl(0.036, 0.034, 0.012, 0x1B1530, { y: 1.14, seg: 14 })); g.add(lance); const curve = new THREE.CatmullRomCurve3([new THREE.Vector3(0.03, 0.56, 0.0), new THREE.Vector3(0.12, 0.62, 0.1), new THREE.Vector3(0.22, 0.42, 0.08), new THREE.Vector3(0.24, 0.3, -0.02)]); g.add(new THREE.Mesh(new THREE.TubeGeometry(curve, 24, 0.009, 6), mat(0xC9241C))); } break;
    case 'thermos': g.add(cyl(0.04, 0.04, 0.26, C.metal, { seg: 16, rough: 0.4, metal: 0.4 }), cyl(0.035, 0.035, 0.05, a, { y: 0.26, seg: 16 })); break;
    case 'radio': g.add(rbox(0.26, 0.14, 0.09, a, { r: 0.02 })); for (let i = 0; i < 2; i++) g.add(cyl(0.045, 0.045, 0.01, C.encre, { x: -0.07 + i * 0.14, y: 0.065, seg: 16, shadow: false }).rotateX(Math.PI / 2).translateY(0.0)); g.children.slice(1).forEach(c => { c.rotation.set(Math.PI / 2, 0, 0); c.position.z = 0.046; c.position.y = 0.07; }); g.add(cyl(0.004, 0.004, 0.3, C.metal, { x: 0.1, y: 0.12, seg: 6 }).rotateZ(-0.4)); break;
    case 'casque_audio': { const t = new THREE.Mesh(new THREE.TorusGeometry(0.085, 0.012, 8, 20, Math.PI), mat(C.encre)); t.position.y = 0.09; g.add(t, rbox(0.05, 0.07, 0.06, a, { r: 0.02, x: -0.085, y: 0.04 }), rbox(0.05, 0.07, 0.06, a, { r: 0.02, x: 0.085, y: 0.04 })); } break;
    case 'casque': g.add(sph(0.13, C.blanc, { seg: 18 }).translateY(-0.02), cyl(0.17, 0.17, 0.015, C.blanc, { seg: 20 })); g.children[0].scale.y = 0.75; g.add(rbox(0.1, 0.04, 0.01, a, { r: 0.004, y: 0.09, z: 0.13, shadow: false })); break;
    case 'trophee': g.add(cyl(0.07, 0.08, 0.03, C.noyer, { seg: 16 }), cyl(0.02, 0.025, 0.08, 0xE8C98E, { y: 0.03, seg: 12, metal: 0.6, rough: 0.35 }), cyl(0.06, 0.025, 0.1, 0xF2C14E, { y: 0.11, seg: 16, metal: 0.6, rough: 0.35 })); break;
    case 'coupe': g.add(cyl(0.05, 0.06, 0.025, C.noyer, { seg: 16 }), cyl(0.012, 0.012, 0.06, 0xE8C98E, { y: 0.025, seg: 10, metal: 0.6, rough: 0.35 }), sph(0.05, 0xF2C14E, { y: 0.085, seg: 14, metal: 0.6, rough: 0.35 })); g.children[2].scale.y = 1.1; break;
    case 'medaille': g.add(rbox(0.2, 0.26, 0.02, C.noyer, { r: 0.006, y: -0.13 }), cyl(0.05, 0.05, 0.01, 0xF2C14E, { y: -0.17, z: 0.012, seg: 20, metal: 0.6, rough: 0.3 }).rotateX(Math.PI / 2), rbox(0.04, 0.09, 0.008, C.rouge, { r: 0.003, y: -0.12, z: 0.012 })); break;
    case 'horloge': g.add(cyl(0.16, 0.16, 0.025, C.blanc, { seg: 28 }).rotateX(Math.PI / 2), cyl(0.165, 0.165, 0.012, C.encre, { seg: 28 }).rotateX(Math.PI / 2).translateY(0.0)); g.children[1].position.z = -0.005; { /* l'heure du moment où la pièce est dessinée */ const now = new Date(); const mi = now.getMinutes(), hr = now.getHours() % 12 + mi / 60; const hand = (len, w, col, ang, z) => { const pv = grp(0, 0, z); pv.add(box(w, len, 0.006, col, { y: -0.012, shadow: false })); pv.rotation.z = -ang; return pv; }; for (let i = 0; i < 12; i++) { const t = box(0.008, i % 3 ? 0.014 : 0.026, 0.004, C.encre, { y: 0.122, shadow: false }); const pv = grp(0, 0, 0.014); pv.add(t); pv.rotation.z = -i / 12 * Math.PI * 2; g.add(pv); } g.add(hand(0.08, 0.014, C.encre, hr / 12 * Math.PI * 2, 0.018), hand(0.115, 0.01, a, mi / 60 * Math.PI * 2, 0.022), cyl(0.012, 0.012, 0.01, C.encre, { seg: 10 }).rotateX(Math.PI / 2).translateY(0.0)); g.children[g.children.length - 1].position.z = 0.026; } break;
    case 'tableau': g.add(rbox(1.2, 0.8, 0.03, C.blanc, { r: 0.006, y: -0.8 }), rbox(1.24, 0.84, 0.015, C.gris2, { r: 0.006, y: -0.82, z: -0.012 }), rbox(1.0, 0.03, 0.06, C.gris2, { r: 0.008, y: -0.82, z: 0.03 })); { const t = canvasTex(256, 170, (gg, W, H) => { gg.fillStyle = '#fff'; gg.fillRect(0, 0, W, H); gg.strokeStyle = '#5E46B8'; gg.lineWidth = 3; gg.strokeRect(20, 20, 70, 40); gg.strokeRect(150, 30, 80, 50); gg.beginPath(); gg.moveTo(90, 40); gg.lineTo(150, 50); gg.stroke(); gg.strokeStyle = '#A3221F'; gg.beginPath(); gg.arc(60, 120, 22, 0, 7); gg.stroke(); gg.strokeStyle = '#0E6B5C'; gg.beginPath(); gg.moveTo(110, 100); gg.lineTo(230, 100); gg.moveTo(110, 120); gg.lineTo(200, 120); gg.moveTo(110, 140); gg.lineTo(215, 140); gg.stroke(); }); const p = new THREE.Mesh(new THREE.PlaneGeometry(1.14, 0.74), new THREE.MeshBasicMaterial({ map: t })); p.position.set(0, -0.4, 0.016); g.add(p); } break;
    case 'etagere': g.add(rbox(1.0, 0.03, 0.24, C.bois, { r: 0.006, y: -0.03, z: -0.12 })); for (let i = 0; i < 6; i++) g.add(rbox(0.07, 0.28, 0.2, [a, C.ok2, C.att2, C.lav2, C.bq2, C.gris2][i], { r: 0.006, x: -0.42 + i * 0.14, z: -0.11 })); [-0.4, 0.4].forEach(x => { const b = box(0.02, 0.14, 0.14, C.metal2, { x, y: -0.17, z: -0.07 }); g.add(b); }); break;
    case 'guirlande': { const n = 14; for (let i = 0; i < n; i++) { const x = -1.2 + i * (2.4 / (n - 1)); const y = -Math.sin((i / (n - 1)) * Math.PI) * 0.22; g.add(sph(0.028, [C.lum, C.rose, C.ok2, C.bleu][i % 4], { x, y: y - 0.028, emis: [C.lum, C.rose, C.ok2, C.bleu][i % 4], ei: 1.2, seg: 8, shadow: false })); } const curve = new THREE.CatmullRomCurve3(Array.from({ length: n }, (_, i) => new THREE.Vector3(-1.2 + i * (2.4 / (n - 1)), -Math.sin((i / (n - 1)) * Math.PI) * 0.22 + 0.02, 0))); g.add(new THREE.Mesh(new THREE.TubeGeometry(curve, 24, 0.005, 5), mat(C.encre))); } break;
    case 'ballon': { /* vrai ballon de foot : texture calculée (12 pentagones noirs = sommets d'un icosaèdre tronqué), sans relief qui dépasse */ const r = 0.11; const inner = grp(0, r, 0); inner.rotation.set(0.55, 0.85, 0.25); const ball = new THREE.Mesh(new THREE.SphereGeometry(r, 40, 28), new THREE.MeshStandardMaterial({ map: ballTex(), roughness: 0.42 })); ball.castShadow = true; ball.receiveShadow = true; inner.add(ball); g.add(inner); } break;
    case 'basket': g.add(rbox(0.5, 0.36, 0.03, C.blanc, { r: 0.01, y: -0.36 })); { const r = new THREE.Mesh(new THREE.TorusGeometry(0.11, 0.012, 8, 20), mat(C.orange)); r.rotation.x = Math.PI / 2; r.position.set(0, -0.3, 0.12); g.add(r); } break;
    case 'console': g.add(rbox(0.3, 0.05, 0.24, C.metal2, { r: 0.015 }), rbox(0.11, 0.045, 0.08, a, { r: 0.02, x: -0.07, z: 0.2 }), rbox(0.11, 0.045, 0.08, C.encre, { r: 0.02, x: 0.08, z: 0.2 }), sph(0.012, C.lum, { x: -0.12, y: 0.05, z: 0.05, emis: C.lum, ei: 1, seg: 6, shadow: false })); break;
    case 'chien': { const col = a === C.violet ? C.kraft2 : a; const b = sph(0.17, col, { seg: 14 }); b.scale.set(1.5, 0.75, 0.8); b.position.y = 0.13; g.add(b); g.add(sph(0.12, col, { x: 0.27, y: 0.1, seg: 14 }), sph(0.05, 0xF6EEDF, { x: 0.37, y: 0.13, seg: 10 }), sph(0.02, C.encre, { x: 0.41, y: 0.17, seg: 6, shadow: false }), sph(0.014, C.encre, { x: 0.32, y: 0.22, z: 0.05, seg: 6, shadow: false }), sph(0.014, C.encre, { x: 0.32, y: 0.22, z: -0.05, seg: 6, shadow: false })); [[0.22, 0.26, 0.08], [0.22, 0.26, -0.08]].forEach(([x, y, z]) => { const e = sph(0.045, 0x8A6A40, { seg: 8 }); e.scale.set(0.7, 1.4, 0.5); e.position.set(x, y, z); g.add(e); }); const t = cyl(0.02, 0.03, 0.25, col, { seg: 8 }); t.rotation.z = 1.2; t.position.set(-0.3, 0.14, 0); g.add(t); [[0.05, 0.1], [0.05, -0.1], [-0.15, 0.1], [-0.15, -0.1]].forEach(([x, z]) => { const p = sph(0.05, col, { seg: 8 }); p.scale.set(1.6, 0.6, 0.8); p.position.set(x + 0.1, 0.03, z); g.add(p); }); } break;
    case 'chat': { const col = C.gris; const b = sph(0.12, col, { seg: 14 }); b.scale.set(1.3, 0.8, 0.8); b.position.y = 0.1; g.add(b, sph(0.08, col, { x: 0.15, y: 0.14, seg: 12 })); [[0.18, 0.27, 0.05], [0.18, 0.27, -0.05]].forEach(([x, y, z]) => { const e = new THREE.Mesh(new THREE.ConeGeometry(0.025, 0.06, 6), mat(col)); e.position.set(x, y, z); g.add(e); }); const t = new THREE.Mesh(new THREE.TorusGeometry(0.1, 0.015, 6, 16, Math.PI), mat(col)); t.position.set(-0.17, 0.06, 0); t.rotation.z = -0.3; g.add(t); g.add(sph(0.012, C.ok2, { x: 0.22, y: 0.16, z: 0.03, seg: 6, shadow: false }), sph(0.012, C.ok2, { x: 0.22, y: 0.16, z: -0.03, seg: 6, shadow: false })); } break;
    case 'poubelle': g.add(cyl(0.14, 0.11, 0.32, C.metal, { seg: 18, rough: 0.5, metal: 0.3 })); break;
    case 'portemanteau': { g.add(cyl(0.16, 0.18, 0.02, a === C.violet ? C.noyer : a, { seg: 16 }), cyl(0.018, 0.018, 1.7, a === C.violet ? C.noyer : a, { seg: 10 })); for (let i = 0; i < 4; i++) { const an = i / 4 * Math.PI * 2; const h = cyl(0.01, 0.01, 0.18, C.noyer, { seg: 6 }); h.rotation.z = Math.PI / 2 - 0.4; h.rotation.y = an; h.position.set(Math.cos(an) * 0.08, 1.6, Math.sin(an) * 0.08); g.add(h); }
    } break;
    case 'velo': { [[-0.42, 0], [0.42, 0]].forEach(([x]) => { const w = new THREE.Mesh(new THREE.TorusGeometry(0.3, 0.02, 8, 24), mat(C.encre)); w.position.set(x, 0.32, 0); g.add(w); }); const f1 = cyl(0.015, 0.015, 0.6, a, { seg: 8 }); f1.rotation.z = 0.9; f1.position.set(-0.15, 0.55, 0); const f2 = cyl(0.015, 0.015, 0.55, a, { seg: 8 }); f2.rotation.z = -1.0; f2.position.set(0.18, 0.56, 0); const f3 = cyl(0.015, 0.015, 0.62, a, { seg: 8 }); f3.rotation.z = Math.PI / 2; f3.position.set(0.0, 0.78, 0); g.add(f1, f2, f3, rbox(0.22, 0.04, 0.08, C.encre, { r: 0.015, x: -0.28, y: 0.86 }), cyl(0.012, 0.012, 0.42, C.metal, { x: 0.36, y: 0.9, seg: 8 }).rotateX(Math.PI / 2)); g.children[g.children.length - 1].position.y = 0.92; } break;
    case 'skate': g.add(rbox(0.8, 0.02, 0.2, a, { r: 0.01, y: 0.06 })); [[-0.28, 0.08], [-0.28, -0.08], [0.28, 0.08], [0.28, -0.08]].forEach(([x, z]) => g.add(cyl(0.03, 0.03, 0.03, C.lum, { x, z, seg: 10 }).rotateX(Math.PI / 2).translateZ(0))); g.children.slice(1).forEach(c => { c.rotation.set(Math.PI / 2, 0, 0); c.position.y = 0.03; }); break;
    case 'livres': [[0.2, 0.04, 0.15, C.bq], [0.18, 0.035, 0.14, a], [0.21, 0.045, 0.15, C.ok], [0.17, 0.03, 0.13, C.att2]].forEach(([w, h, d, c], i) => { const b = rbox(w, h, d, c, { r: 0.004 }); b.position.y = [0, 0.04, 0.075, 0.12][i] + h / 2; b.rotation.y = (i % 2) * 0.2; g.add(b); }); break;
    case 'globe': g.add(cyl(0.07, 0.08, 0.02, C.noyer, { seg: 16 }), cyl(0.012, 0.012, 0.08, C.metal, { y: 0.02, seg: 8 }), sph(0.11, C.bleu, { y: 0.1, seg: 18 })); { const t = new THREE.Mesh(new THREE.TorusGeometry(0.125, 0.006, 6, 28, Math.PI), mat(C.metal)); t.rotation.z = 0.4; t.position.y = 0.21; g.add(t); } break;
    case 'haltere': [[-0.1, 0], [0.1, 0]].forEach(([z]) => { g.add(cyl(0.02, 0.02, 0.4, C.metal, { z, y: 0.045, seg: 10 }).rotateZ(Math.PI / 2)); g.children[g.children.length - 1].position.y = 0.065; [-0.17, 0.17].forEach(x => g.add(cyl(0.065, 0.065, 0.04, C.encre, { x, z, seg: 16 }).rotateZ(Math.PI / 2))); g.children.slice(-2).forEach(c => { c.position.y = 0.065; }); }); break;
    case 'guitare': { const b = sph(0.2, C.bois2, { seg: 16 }); b.scale.set(1, 1.25, 0.28); b.position.set(0, 0.26, 0); g.add(b); const b2 = sph(0.15, C.bois2, { seg: 16 }); b2.scale.set(1, 1.1, 0.3); b2.position.set(0, 0.56, 0); g.add(b2, cyl(0.025, 0.025, 0.7, C.noyer, { y: 0.6, seg: 8 }), rbox(0.08, 0.16, 0.03, C.encre, { r: 0.01, y: 1.28 }), cyl(0.06, 0.06, 0.02, C.encre, { y: 0.34, z: 0.05, seg: 14 }).rotateX(Math.PI / 2)); g.children[g.children.length - 1].position.set(0, 0.36, 0.06); } break;
    case 'bougie': g.add(cyl(0.04, 0.04, 0.09, C.creme, { seg: 14 }), sph(0.015, C.lum, { y: 0.1, emis: C.lum, ei: 1.5, seg: 8, shadow: false })); break;
    case 'dossiers': g.add(rbox(0.3, 0.1, 0.26, C.metal, { r: 0.01, rough: 0.5, metal: 0.3 })); for (let i = 0; i < 4; i++) g.add(rbox(0.26, 0.004, 0.22, [C.lav2, C.att2, C.ok2, C.blanc][i], { r: 0.002, y: 0.1 + i * 0.012, z: i * 0.01 - 0.015, shadow: false })); break;
    case 'imprimante': g.add(rbox(0.5, 0.22, 0.42, 0xECEAF2, { r: 0.03 }), rbox(0.3, 0.02, 0.2, C.blanc, { r: 0.004, y: 0.22, z: -0.05 }), rbox(0.12, 0.03, 0.06, C.metal2, { r: 0.008, x: 0.15, y: 0.22, z: 0.14 }), sph(0.01, C.ok2, { x: 0.2, y: 0.25, z: 0.12, emis: C.ok2, ei: 1, seg: 6, shadow: false })); break;
    case 'ventilo': g.add(cyl(0.12, 0.14, 0.02, C.metal2, { seg: 16 }), cyl(0.015, 0.015, 0.3, C.metal2, { y: 0.02, seg: 8 })); { const r = new THREE.Mesh(new THREE.TorusGeometry(0.16, 0.012, 8, 24), mat(C.metal2)); r.position.set(0, 0.46, 0); g.add(r); for (let i = 0; i < 3; i++) { const bl = rbox(0.06, 0.13, 0.008, C.lav2, { r: 0.02 }); bl.position.set(0, 0.46, 0); bl.rotation.z = i / 3 * Math.PI * 2; bl.translateY(0.075); g.add(bl); } } break;
    default: break;
  }
  return g;
}
/** le tableau de liège avec post-it (une par « à faire ») — cliquables */
export function corkBoard(items, o) {
  o = o || {}; const w = o.w || 1.6, h = o.h || 1.0; const g = grp();
  g.add(rbox(w + 0.06, h + 0.06, 0.03, C.bois2, { r: 0.008, y: -h / 2 - 0.03 }), rbox(w, h, 0.02, 0xD9B98A, { r: 0.004, y: -h / 2, z: 0.012 }));
  const SEV = { bad: '#F6C6C1', or: '#FFE3A6', warn: '#FFE3A6', info: '#D9E6F8', ok: '#CDEBDD' };
  const cols = o.cols || Math.max(1, Math.min(3, Math.ceil(Math.sqrt(items.length || 1)))), rows = Math.ceil((items.length || 1) / cols);
  const nw = Math.min(0.42, (w - 0.1) / cols - 0.06), nh = Math.min(0.36, (h - 0.1) / rows - 0.06);
  items.forEach((it, i) => { const c = i % cols, r = Math.floor(i / cols); const x = -w / 2 + 0.05 + nw / 2 + c * ((w - 0.1) / cols) + ((w - 0.1) / cols - nw) / 2, y = h / 2 - 0.05 - nh / 2 - r * ((h - 0.1) / rows) - ((h - 0.1) / rows - nh) / 2; /* origine = centre du tableau */
    const t = canvasTex(192, Math.round(192 * nh / nw), (gg, W, H) => { gg.fillStyle = SEV[it.sev] || SEV.info; gg.fillRect(0, 0, W, H); gg.fillStyle = '#1B1530'; gg.font = `700 ${Math.round(H * 0.17)}px ${FONT}`; gg.textBaseline = 'top'; wrapText(gg, it.t, 12, 14, W - 24, H * 0.2, 3); gg.font = `500 ${Math.round(H * 0.12)}px ${FONT}`; gg.fillStyle = '#4A4560'; if (it.s) wrapText(gg, it.s, 12, H * 0.72, W - 24, H * 0.14, 1); });
    const n = new THREE.Mesh(new THREE.PlaneGeometry(nw, nh), new THREE.MeshStandardMaterial({ map: t, roughness: 0.95 })); n.position.set(x, y, 0.028); n.rotation.z = ((i * 7) % 5 - 2) * 0.02; const pin = sph(0.014, it.sev === 'bad' ? C.bq : it.sev === 'or' || it.sev === 'warn' ? C.att : C.violet, { seg: 8, shadow: false }); pin.position.set(x, y + nh / 2 - 0.02, 0.04);
    const wrap = grp(); wrap.add(n, pin); wrap.userData.pick = { type: 'notif', i: it.i }; wrap.userData.aria = it.t; n.userData.pick = wrap.userData.pick; pin.userData.pick = wrap.userData.pick; g.add(wrap); });
  if (!items.length && !o.blank) { const t = canvasTex(256, 96, (gg, W, H) => { gg.fillStyle = '#CDEBDD'; gg.fillRect(0, 0, W, H); gg.fillStyle = '#0E6B5C'; gg.font = `800 ${Math.round(H * 0.34)}px ${FONT}`; gg.textAlign = 'center'; gg.fillText('✓ À JOUR', W / 2, H * 0.62); }); const n = new THREE.Mesh(new THREE.PlaneGeometry(0.6, 0.22), new THREE.MeshStandardMaterial({ map: t })); n.position.set(0, 0, 0.03); g.add(n); }
  return g;
}
/** le panneau des raccourcis de modules (plaques cliquables) */
export function shortcutPanel(items, icons, o) {
  o = o || {}; const g = grp(); const n = items.length; if (!n) return g; const per = 0.34; const w = Math.min(1.9, n * per + 0.1);
  g.add(rbox(w, 0.42, 0.02, 0xF7F6FB, { r: 0.012, y: -0.21 }));
  items.forEach((it, i) => { const x = -w / 2 + 0.05 + per / 2 + i * per; const t = canvasTex(128, 128, (gg, W, H) => { gg.fillStyle = it.n ? '#5E46B8' : '#2B1B5A'; gg.beginPath(); gg.roundRect(0, 0, W, H, 18); gg.fill(); gg.fillStyle = '#fff'; gg.font = `800 ${Math.round(H * 0.42)}px ${FONT}`; gg.textAlign = 'center'; gg.fillText((icons && icons[it.k]) || it.t.slice(0, 1), W / 2, H * 0.55); gg.font = `700 ${Math.round(H * 0.15)}px ${FONT}`; gg.fillText(it.t.slice(0, 12), W / 2, H * 0.86); if (it.n) { gg.fillStyle = '#F08A3C'; gg.beginPath(); gg.arc(W - 20, 20, 16, 0, 7); gg.fill(); gg.fillStyle = '#fff'; gg.font = `800 ${Math.round(H * 0.17)}px ${FONT}`; gg.fillText(String(it.n), W - 20, 27); } });
    const p = new THREE.Mesh(new THREE.PlaneGeometry(0.28, 0.28), new THREE.MeshStandardMaterial({ map: t, roughness: 0.6, transparent: true })); p.position.set(x, -0.21, 0.016); p.userData.pick = { type: 'tabgo', k: it.k }; p.userData.aria = it.t; g.add(p); });
  return g;
}
/** l'écran du bureau : chiffres du jour */
export function screenTexture(lines, accent) {
  return canvasTex(448, 264, (g, W, H) => { const G = g.createLinearGradient(0, 0, W, H); G.addColorStop(0, '#2B1B5A'); G.addColorStop(1, '#4C3A9A'); g.fillStyle = G; g.fillRect(0, 0, W, H); g.fillStyle = 'rgba(255,255,255,.08)'; g.beginPath(); g.roundRect(14, 14, W - 28, 44, 10); g.fill(); g.fillStyle = '#fff'; g.font = `800 20px ${FONT}`; g.textBaseline = 'middle'; g.fillText('Tracé', 30, 36); g.font = `600 14px ${FONT}`; g.fillStyle = '#D6CEF2'; g.textAlign = 'right'; g.fillText(lines.date || '', W - 30, 36); g.textAlign = 'left';
    const tiles = lines.tiles || []; const tw = (W - 28 - (tiles.length - 1) * 10) / Math.max(1, tiles.length); tiles.forEach((t, i) => { const x = 14 + i * (tw + 10); g.fillStyle = 'rgba(255,255,255,.12)'; g.beginPath(); g.roundRect(x, 72, tw, 92, 12); g.fill(); g.fillStyle = t.col || '#fff'; g.font = `800 34px ${FONT}`; g.fillText(String(t.v), x + 14, 108); g.fillStyle = '#E6E1F6'; g.font = `600 13px ${FONT}`; g.fillText(t.l, x + 14, 142); });
    g.fillStyle = '#E6E1F6'; g.font = `600 14px ${FONT}`; (lines.foot || []).slice(0, 3).forEach((s, i) => g.fillText('• ' + s, 26, 190 + i * 22)); });
}
/* ═══ pièce fermée (08/11) : porte, rideaux, meuble bas, table ronde, chevalet nominatif ═══ */
/** porte de bureau (fermée) posée dans l'ouverture d'un mur : centre bas en (0,0,0), le battant dans le plan x=0..w, face intérieure vers +z */
export function door(o) {
  o = o || {}; const w = o.w || 0.9, h = o.h || 2.08, col = o.color == null ? 0xE9DCC4 : o.color; const g = grp();
  g.add(rbox(w - 0.02, h - 0.01, 0.045, col, { r: 0.008, y: 0.005 }));
  g.add(box(0.11, 0.9, 0.05, C.verre, { x: -w / 2 + 0.2, y: 1.0, rough: 0.15, op: 0.55, shadow: false }));
  [[-1], [1]].forEach(([s]) => { const hd = grp(w / 2 - 0.1, 1.02, s * 0.035); hd.add(cyl(0.022, 0.022, 0.012, C.metal, { seg: 12, rough: 0.35, metal: 0.6 }).rotateX(Math.PI / 2), box(0.12, 0.016, 0.02, C.metal, { x: -0.05, y: -0.008, z: s * 0.01, rough: 0.35, metal: 0.6 })); g.add(hd); });
  const fr = o.frame == null ? C.blanc : o.frame; const fz = o.side === 'both' ? [-1, 1] : [1]; const off = o.fz || 0.06;
  fz.forEach(s => { g.add(box(0.06, h + 0.05, 0.025, fr, { x: -w / 2 - 0.03, z: s * off }), box(0.06, h + 0.05, 0.025, fr, { x: w / 2 + 0.03, z: s * off }), box(w + 0.18, 0.06, 0.025, fr, { y: h, z: s * off })); });
  return g;
}
/** rideaux drapés (plis) de hauteur h, largeur w — posés au sol du haut de la tringle : (0,0,0) = haut du rideau */
export function curtain(w, h, color) {
  const g = grp(); const n = Math.max(3, Math.round(w / 0.07)); for (let i = 0; i < n; i++) { const r = 0.034 + (i % 2) * 0.008; const c = cyl(r, r * 1.25, h, color, { x: -w / 2 + (i + 0.5) * (w / n), y: -h, z: (i % 2) * 0.012, seg: 10 }); g.add(c); }
  return g;
}
/* ═══ rangements : des meubles au sol dont les étagères reçoivent les objets qu'on y glisse (cadres, plantes, trophées…) ═══ */
/** k → { lab, w, d, tops:[hauteur des surfaces de pose] } ; origine = centre au sol, façade vers +z */
export const SHELVES = {
  biblio: { lab: 'Bibliothèque haute', w: 0.9, d: 0.32, tops: [0.065, 0.445, 0.825, 1.205, 1.585, 1.905] },
  cubes: { lab: 'Étagère à cases', w: 1.1, d: 0.36, tops: [0.035, 0.395, 0.755, 1.115] },
  buffet: { lab: 'Buffet bas', w: 1.2, d: 0.44, tops: [0.81] },
  vitrine: { lab: 'Vitrine', w: 0.8, d: 0.4, tops: [0.07, 0.52, 0.97, 1.42, 1.83] },
  console_mur: { lab: 'Console murale', w: 1.0, d: 0.3, tops: [0.86] }
};
export function furniture(kind, accent) {
  const a = accent == null ? C.violet : accent; const g = grp(); const F = SHELVES[kind]; if (!F) return g; const wood = C.bois, pale = 0xF4F1EA;
  if (kind === 'biblio') { const { w, d } = F; g.add(box(w, 1.9, 0.012, pale, { z: -d / 2 + 0.006 })); [-1, 1].forEach(sg => g.add(rbox(0.022, 1.9, d, wood, { r: 0.004, x: sg * (w / 2 - 0.011) }))); [0.04, 0.42, 0.8, 1.18, 1.56, 1.88].forEach(y => g.add(rbox(w - 0.04, 0.025, d - 0.02, wood, { r: 0.004, y, z: 0.0 }))); g.add(rbox(w - 0.04, 0.09, d - 0.02, wood, { r: 0.004, y: -0.05 })); }
  else if (kind === 'cubes') { const { w, d } = F; const n = 3, c = w / n; g.add(box(w, 1.1, 0.01, pale, { z: -d / 2 + 0.005 })); for (let i = 0; i <= n; i++) g.add(rbox(0.02, 1.1, d, i % 3 === 0 ? wood : a, { r: 0.003, x: -w / 2 + i * c })); [0.01, 0.37, 0.73, 1.09].forEach(y => g.add(rbox(w, 0.025, d, wood, { r: 0.003, y }))); }
  else if (kind === 'buffet') { const { w, d } = F; g.add(rbox(w, 0.7, d - 0.04, pale, { r: 0.012, y: 0.1 }), rbox(w + 0.04, 0.03, d, wood, { r: 0.006, y: 0.78 })); [-w / 4, w / 4].forEach(x => g.add(box(0.004, 0.6, 0.004, 0xD9D4CC, { x: x + (x < 0 ? w / 4 : -w / 4) * 0 + (x < 0 ? -0.0 : 0.0), y: 0.15, z: d / 2 - 0.018, shadow: false }))); g.add(box(0.004, 0.6, 0.004, 0xD9D4CC, { y: 0.15, z: d / 2 - 0.018, shadow: false })); [-0.05, 0.05].forEach(x => g.add(rbox(0.012, 0.12, 0.02, C.metal2, { r: 0.005, x, y: 0.42, z: d / 2 - 0.01 }))); [[-1, -1], [1, -1], [-1, 1], [1, 1]].forEach(([sx, sz]) => g.add(cyl(0.015, 0.012, 0.1, C.metal2, { x: sx * (w / 2 - 0.08), z: sz * (d / 2 - 0.08), seg: 10 }))); }
  else if (kind === 'vitrine') { const { w, d } = F; g.add(box(w, 1.85, 0.012, pale, { z: -d / 2 + 0.006 })); [-1, 1].forEach(sg => g.add(rbox(0.02, 1.85, d, C.metal2, { r: 0.003, x: sg * (w / 2 - 0.01) }))); g.add(rbox(w, 0.03, d, C.metal2, { r: 0.003, y: 1.85 }), rbox(w, 0.05, d, C.metal2, { r: 0.003, y: 0.0 })); [0.05, 0.5, 0.95, 1.4].forEach(y => g.add(rbox(w - 0.04, 0.02, d - 0.03, C.verre, { r: 0.002, y, rough: 0.15, op: 0.55 }))); g.add(box(w - 0.04, 1.8, 0.006, C.verre, { y: 0.05, z: d / 2 - 0.004, rough: 0.1, op: 0.22, shadow: false })); }
  else if (kind === 'console_mur') { const { w, d } = F; g.add(rbox(w, 0.03, d, wood, { r: 0.005, y: 0.83 })); [-1, 1].forEach(sg => { g.add(cyl(0.012, 0.012, 0.83, C.metal2, { x: sg * (w / 2 - 0.06), z: d / 2 - 0.06, seg: 8 }), cyl(0.012, 0.012, 0.83, C.metal2, { x: sg * (w / 2 - 0.06), z: -d / 2 + 0.06, seg: 8 })); }); g.add(rbox(w - 0.1, 0.012, d - 0.1, C.metal2, { r: 0.003, y: 0.14 })); }
  return g;
}
/** meuble bas à portes (classeurs dessus) */
export function cabinet(w, d, h, color, o) {
  o = o || {}; const g = grp(); const col = color == null ? 0xF4F1EA : color;
  g.add(rbox(w, 0.05, d, 0x3A3550, { r: 0.01 }));
  g.add(rbox(w, h - 0.05, d, col, { r: 0.015, y: 0.05 }));
  g.add(rbox(w + 0.02, 0.03, d + 0.02, o.top == null ? C.bois : o.top, { r: 0.008, y: h }));
  const n = Math.max(1, Math.round(w / 0.5)); for (let i = 0; i < n; i++) { const x = -w / 2 + (i + 0.5) * (w / n); g.add(box(0.004, h - 0.12, 0.004, 0xD9D4CC, { x: -w / 2 + (i + 1) * (w / n), y: 0.08, z: d / 2 + 0.002, shadow: false }), rbox(0.012, 0.14, 0.02, C.metal2, { r: 0.005, x: x + (i % 2 ? -1 : 1) * (w / n / 2 - 0.06), y: h * 0.55, z: d / 2 + 0.01 })); }
  return g;
}
/** table ronde (réunion à deux) */
export function roundTable(r, o) {
  o = o || {}; const g = grp(); const top = o.top == null ? C.blanc : o.top;
  g.add(cyl(r, r, 0.035, top, { y: 0.72, seg: 32, rough: 0.6 }), cyl(0.035, 0.035, 0.72, C.metal2, { seg: 12 }), cyl(0.26, 0.28, 0.025, C.metal2, { seg: 24 }));
  return g;
}
/** chevalet nominatif posé sur un bureau (texte face à +z) */
export function nameplate(text, sub, accent) {
  const g = grp(); const w = 0.34, h = 0.1; const t = canvasTex(512, 150, (gg, W, H) => { gg.fillStyle = '#FFFFFF'; gg.fillRect(0, 0, W, H); gg.fillStyle = '#' + new THREE.Color(accent == null ? C.violet : accent).getHexString(); gg.fillRect(0, H - 14, W, 14); gg.fillStyle = '#1B1530'; gg.textAlign = 'center'; gg.textBaseline = 'middle'; let fs = 64; gg.font = `800 ${fs}px ${FONT}`; while (gg.measureText(text).width > W - 40 && fs > 30) { fs -= 2; gg.font = `800 ${fs}px ${FONT}`; } gg.fillText(text, W / 2, sub ? 52 : 68); if (sub) { let f2 = 30; gg.font = `600 ${f2}px ${FONT}`; while (gg.measureText(sub).width > W - 30 && f2 > 16) { f2 -= 1; gg.font = `600 ${f2}px ${FONT}`; } gg.fillStyle = '#57526B'; gg.fillText(sub, W / 2, 106); } });
  const geo = new THREE.BoxGeometry(w, h, 0.012); const face = new THREE.MeshStandardMaterial({ map: t, roughness: 0.7 }); const side = mat(C.blanc);
  const front = new THREE.Mesh(geo, [side, side, side, side, face, side]); front.position.set(0, h / 2 * 0.96, 0.022); front.rotation.x = -0.32; front.castShadow = true;
  const back = new THREE.Mesh(geo, mat(C.blanc)); back.position.set(0, h / 2 * 0.96, -0.022); back.rotation.x = 0.32; back.castShadow = true;
  g.add(front, back); return g;
}
/** tableau blanc Velleda accroché au mur : cadre alu, surface brillante (texture tex), réglette avec trois feutres et une brosse. Origine = centre du tableau, face vers +z ; g.userData.face = la surface. */
export function whiteboard(w, h, tex, o) {
  const g = grp(); const alu = 0xC9CDD4; o = o || {};
  g.add(rbox(w + 0.05, h + 0.05, 0.028, alu, { r: 0.006, y: -h / 2 - 0.025, rough: 0.45, metal: 0.6 }));
  const mk = (t) => t ? new THREE.MeshBasicMaterial({ map: t, toneMapped: false }) : mat(0xFFFFFF, { rough: 0.22 });
  if (o.tex2) { /* 10/11 (Ethan) : un seul grand tableau en deux parties — « À savoir » en haut, « Ma journée » en bas, un fin trait entre les deux */
    const h1 = h * (o.split || 0.55), h2 = h - h1 - 0.015; const f1 = new THREE.Mesh(new THREE.PlaneGeometry(w, h1), mk(tex)); f1.position.set(0, h / 2 - h1 / 2, 0.0155); const f2 = new THREE.Mesh(new THREE.PlaneGeometry(w, h2), mk(o.tex2)); f2.position.set(0, -h / 2 + h2 / 2, 0.0155);
    g.add(f1, f2, rbox(w, 0.012, 0.004, alu, { r: 0.002, y: h / 2 - h1 - 0.0135, z: 0.0165, rough: 0.45, metal: 0.6 })); g.userData.face = f1; g.userData.face2 = f2; g.userData.parts = { h1, h2 };
  } else { const face = new THREE.Mesh(new THREE.PlaneGeometry(w, h), mk(tex)); face.position.set(0, 0, 0.0155); g.add(face); g.userData.face = face; }
  const ty = -h / 2 - 0.03; g.add(rbox(w * 0.6, 0.02, 0.06, alu, { r: 0.004, y: ty, z: 0.035, rough: 0.45, metal: 0.6 }));
  [[-0.12, 0x2456C8], [-0.04, 0x1B1530], [0.04, 0xC9241C], [0.12, 0x2E7D55]].forEach(([x, c]) => { const pen = cyl(0.009, 0.009, 0.13, c, { seg: 10 }); pen.rotation.z = Math.PI / 2; pen.position.set(x * w, ty + 0.03, 0.04); g.add(pen); });
  g.add(rbox(0.11, 0.035, 0.05, 0x3A3550, { r: 0.006, x: w * 0.24, y: ty + 0.02, z: 0.035 }));
  return g;
}
/** un post-it posé à plat (origine = son centre, sur la surface) : papier teinté, bande de colle plus foncée, texte manuscrit (texture tex) */
export function postit(size, tex, colHex) {
  const g = grp(); const s = size || 0.11; const base = rbox(s, 0.0025, s, colHex == null ? 0xFFE978 : colHex, { r: 0.0, rough: 1, shadow: false }); g.add(base);
  if (tex) { const p = new THREE.Mesh(new THREE.PlaneGeometry(s, s), new THREE.MeshStandardMaterial({ map: tex, roughness: 1, emissive: 0xFFFFFF, emissiveMap: tex, emissiveIntensity: 0.35 })); /* le papier garde sa couleur franche, même à l'ombre */ p.rotation.x = -Math.PI / 2; p.position.y = 0.0032; p.castShadow = false; g.add(p); }
  return g;
}
