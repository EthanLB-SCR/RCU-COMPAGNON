// monde3d/aquarium.js — l'aquarium (objet de déco du bureau) — 19/11/2026 (Ethan : « rajoute un aquarium en déco, avec le choix de ce qu'on met dedans, type de poisson, crevettes… »).
// Un bac de 50 × 26 × 30 cm posé sur le bureau, une étagère ou au sol. Ce qu'il contient se choisit dans la fiche de l'objet (plusieurs choix à la fois) ;
// dans son bureau les poissons nagent (aquaAnim, appelé à chaque image), ailleurs (vue du dépôt) ils sont figés pour ne pas coûter d'affichage.
import { THREE, PAL, mat, rbox, box, cyl, grp } from './core.js';
const C = PAL;
export const AQUA = { rouge: 'Poissons rouges', neon: 'Néons bleus', guppy: 'Guppys', combattant: 'Combattant', clown: 'Poissons-clowns', scalaire: 'Scalaires', crevette: 'Crevettes rouges', escargot: 'Escargots', plantes: 'Plantes', roche: 'Rochers', coffre: 'Coffre au trésor', bulles: 'Bulleur' };
export const AQUA_DEF = ['rouge', 'plantes', 'roche'];
/** ce que contient l'aquarium : une liste de clés connues, dans l'ordre du catalogue (rien d'enregistré → le contenu par défaut ; liste vide → de l'eau seulement) */
export const normAqua = a => Array.isArray(a) ? Object.keys(AQUA).filter(k => a.includes(k)) : AQUA_DEF.slice();
export const AQUA_DIM = { w: 0.5, d: 0.26, h: 0.3 };

const ball = (r, color, o) => { o = o || {}; const m = new THREE.Mesh(new THREE.SphereGeometry(r, o.seg || 10, o.seg ? Math.max(6, o.seg - 2) : 8), mat(color, { rough: o.rough == null ? 0.55 : o.rough, emis: o.emis, ei: o.ei, op: o.op })); m.castShadow = false; m.receiveShadow = false; return m; };
const cone = (r, h, color, o) => { o = o || {}; const m = new THREE.Mesh(new THREE.ConeGeometry(r, h, o.seg || 4), mat(color, { rough: 0.6 })); m.castShadow = false; m.receiveShadow = false; return m; };
/** un poisson qui regarde vers +x : corps (sphère aplatie), queue qui bat (cône plat sur un pivot), nageoires et bandes au besoin */
function fish(r, body, tail, o) {
  o = o || {}; const g = grp(); const hy = o.hy || 0.62, wz = o.wz || 0.42;
  const b = ball(r, body, { seg: 12, emis: o.emis, ei: o.ei }); b.scale.set(1, hy, wz); g.add(b);
  const piv = grp(-r * 0.78, 0, 0); const tl = r * (o.tl || 0.95), tr = r * (o.tr || 0.62); const t = cone(tr, tl, tail); t.rotation.z = -Math.PI / 2; t.scale.set(1, 1, 0.22); t.position.x = -tl / 2; piv.add(t); g.add(piv); g.userData.tail = piv;
  if (o.eyes !== false && r >= 0.016) [-1, 1].forEach(s => { const e = ball(r * 0.13, 0x1B1530, { seg: 6 }); e.position.set(r * 0.58, r * 0.16, s * r * wz * 0.72); g.add(e); });
  (o.bands || []).forEach(([x, col]) => { const k = Math.sqrt(Math.max(0.05, 1 - x * x)); const d = ball(r, col, { seg: 10 }); d.scale.set(0.1, hy * k * 1.07, wz * k * 1.09); d.position.x = x * r; g.add(d); }); /* bande = un disque à peine plus large que le corps à cet endroit */
  if (o.fins) { const f1 = cone(r * 0.34, r * o.fins, tail); f1.scale.set(1, 1, 0.2); f1.position.set(-r * 0.15, r * (hy + o.fins / 2 - 0.12), 0); f1.rotation.z = 0.35; g.add(f1); const f2 = cone(r * 0.3, r * o.fins * 0.85, tail); f2.scale.set(1, 1, 0.2); f2.rotation.z = Math.PI - 0.35; f2.position.set(-r * 0.15, -r * (hy + o.fins * 0.85 / 2 - 0.12), 0); g.add(f2); }
  return g;
}
/** une crevette (corps allongé, queue en éventail, antennes) */
function shrimp(col) { const g = grp(); const b = ball(0.008, col, { seg: 8 }); b.scale.set(1.9, 0.7, 0.6); g.add(b); const t = cone(0.006, 0.01, col); t.rotation.z = Math.PI / 2 + 0.5; t.scale.set(1, 1, 0.3); t.position.set(-0.017, -0.002, 0); g.add(t); const a = cone(0.0016, 0.022, 0xF3B8A8, { seg: 3 }); a.rotation.z = -1.0; a.position.set(0.022, 0.006, 0); g.add(a); return g; }

/**
 * l'aquarium. contenu = liste de clés de AQUA ; o.anim = vrai → les poissons restent des objets à part (ils nageront), sinon tout est figé.
 * g.userData.aqua = { fish:[{ ob, cx, cy, cz, rx, rz, sp, ph, bob, wag }], bulles:[{ ob, x, z, y0, h, sp, ph }] } pour aquaAnim.
 */
export function aquarium(contenu, o) {
  o = o || {}; const g = grp(); const { w: W, d: D, h: H } = AQUA_DIM; const L = normAqua(contenu); const has = k => L.includes(k); const Y0 = 0.012, SAND = Y0 + 0.018, SURF = Y0 + 0.255;
  let seed = 7; const rnd = () => { seed = (seed * 16807) % 2147483647; return seed / 2147483647; }; const rr = (a, b) => a + (b - a) * rnd();
  /* le bac : socle, sable, eau, 4 vitres ; il est OUVERT (la vue d'ensemble regarde la pièce de haut : on doit voir les poissons), avec une rampe d'éclairage étroite posée sur deux pattes */
  g.add(rbox(W + 0.008, Y0, D + 0.008, 0x23262D, { r: 0.004 }), rbox(W - 0.014, 0.018, D - 0.014, 0xDCC58E, { r: 0.004, y: Y0 }));
  g.add(box(W - 0.012, SURF - Y0, D - 0.012, 0x5DBBEA, { y: Y0, op: 0.36, rough: 0.08, shadow: false }));
  [-1, 1].forEach(s => g.add(box(W, H, 0.004, C.verre, { y: Y0, z: s * (D / 2 - 0.002), op: 0.2, rough: 0.1, shadow: false }), box(0.004, H, D - 0.008, C.verre, { y: Y0, x: s * (W / 2 - 0.002), op: 0.2, rough: 0.1, shadow: false })));
  [-1, 1].forEach(s => g.add(box(0.012, 0.03, 0.05, 0x23262D, { x: s * (W / 2 - 0.006), y: Y0 + H - 0.004 }))); g.add(rbox(W + 0.004, 0.012, 0.06, 0x23262D, { r: 0.004, y: Y0 + H + 0.022 }), box(W - 0.06, 0.003, 0.04, 0xEAF6FF, { y: Y0 + H + 0.019, emis: 0xCFEFFF, ei: 0.9, shadow: false }));
  /* le décor (fixe) */
  if (has('roche')) [[-0.15, 0.03, 0.03], [-0.1, -0.04, 0.02], [0.14, 0.05, 0.024]].forEach(([x, z, r], i) => { const m = new THREE.Mesh(new THREE.IcosahedronGeometry(r, 0), mat(i % 2 ? 0x6F7783 : 0x8E96A3, { flat: true, rough: 0.95 })); m.scale.set(1.2, 0.75, 1); m.position.set(x, SAND + r * 0.55, z); m.rotation.y = i * 1.3; m.castShadow = false; g.add(m); });
  if (has('plantes')) { [[-0.19, -0.07, 0.15], [0.02, -0.085, 0.19], [0.18, -0.06, 0.12], [0.1, 0.07, 0.08]].forEach(([x, z, h], i) => { for (let k = 0; k < 4; k++) { const bl = cone(0.007, h * rr(0.7, 1.05), [C.feuille2, 0x4CAF50, C.feuille][(i + k) % 3], { seg: 5 }); bl.scale.set(1, 1, 0.35); bl.position.set(x + rr(-0.014, 0.014), SAND + h * 0.45, z + rr(-0.01, 0.01)); bl.rotation.set(rr(-0.18, 0.18), rr(0, 3), rr(-0.22, 0.22)); g.add(bl); } }); [[-0.04, 0.06], [0.2, 0.03]].forEach(([x, z]) => { for (let k = 0; k < 3; k++) { const lf = ball(0.016, 0x2E7D55, { seg: 8, rough: 0.8 }); lf.scale.set(1, 0.25, 0.6); lf.position.set(x + rr(-0.01, 0.01), SAND + 0.012 + k * 0.012, z + rr(-0.01, 0.01)); lf.rotation.y = k * 2.1; g.add(lf); } }); }
  if (has('coffre')) { g.add(rbox(0.05, 0.026, 0.034, 0x8A5A2B, { r: 0.004, x: 0.03, y: SAND - 0.003, z: 0.03 })); const lid = rbox(0.05, 0.008, 0.034, 0x6B3F1D, { r: 0.003 }); lid.position.set(0.03, SAND + 0.036, 0.016); lid.rotation.x = -0.9; g.add(lid); const or = ball(0.008, 0xF2C230, { seg: 8, rough: 0.3 }); or.position.set(0.03, SAND + 0.024, 0.03); g.add(or); }
  /* ce qui vit : à part quand ça nage */
  const vivant = grp(); if (o.anim) vivant.userData.noBake = true; g.add(vivant); const A = { fish: [], bulles: [] };
  const X = W / 2 - 0.035, Z = D / 2 - 0.032;
  const put = (ob, p) => { vivant.add(ob); A.fish.push(Object.assign({ ob, bob: 0.006, wag: 7 }, p)); };
  if (has('rouge')) [[0.026, -0.03, 0.15], [0.023, 0.05, 0.11], [0.02, 0.0, 0.2]].forEach(([r, cx, cy], i) => put(fish(r, 0xF28A2E, 0xF7B25A, { tl: 1.05, tr: 0.75 }), { cx, cy: Y0 + cy, cz: 0, rx: X - Math.abs(cx) - r, rz: Z - r * 0.6, sp: (i % 2 ? -1 : 1) * rr(0.32, 0.46), ph: i * 2.2 }));
  if (has('neon')) for (let i = 0; i < 6; i++) put(fish(0.0095, 0x29B6F6, 0xE53935, { emis: 0x1E88E5, ei: 0.55, eyes: false, tl: 0.9 }), { cx: 0.02, cy: Y0 + 0.17 + (i % 3) * 0.014, cz: (i % 2 ? 1 : -1) * 0.012, rx: X - 0.04, rz: Z - 0.03, sp: 0.62, ph: 0.6 + i * 0.2, bob: 0.004, wag: 11 });
  if (has('guppy')) [0xF26A1B, 0x6B4BB8, 0x1F9FA8, 0xD43D6B].forEach((col, i) => put(fish(0.012, 0xCFD8DC, col, { tl: 1.5, tr: 1.15, eyes: false }), { cx: rr(-0.05, 0.05), cy: Y0 + rr(0.09, 0.21), cz: 0, rx: rr(0.09, X - 0.07), rz: rr(0.04, Z - 0.02), sp: (i % 2 ? 1 : -1) * rr(0.5, 0.8), ph: i * 1.7, wag: 10 }));
  if (has('combattant')) put(fish(0.02, 0x283593, 0xC62828, { tl: 1.7, tr: 1.5, fins: 1.1 }), { cx: -0.05, cy: Y0 + 0.13, cz: 0, rx: 0.1, rz: 0.05, sp: -0.22, ph: 1.1, bob: 0.008, wag: 4 });
  if (has('clown')) [0, 1].forEach(i => put(fish(0.018, 0xF26A1B, 0xF26A1B, { bands: [[0.42, 0xFFFFFF], [-0.2, 0xFFFFFF]], tl: 0.8 }), { cx: 0.1, cy: Y0 + 0.075 + i * 0.03, cz: 0.02, rx: 0.07, rz: 0.045, sp: (i ? -0.5 : 0.42), ph: i * 3, wag: 8 }));
  if (has('scalaire')) [0, 1].forEach(i => put(fish(0.02, 0xE8E8E8, 0xBDBDBD, { hy: 1.2, wz: 0.2, fins: 1.5, bands: [[0.25, 0x2B2B2B], [-0.3, 0x2B2B2B]], tl: 0.8 }), { cx: -0.02, cy: Y0 + 0.14 + i * 0.03, cz: 0, rx: X - 0.08, rz: Z - 0.04, sp: (i ? 0.2 : -0.26), ph: i * 2.6 + 0.4, bob: 0.004, wag: 5 }));
  if (has('crevette')) [[-0.16, 0.06], [-0.05, -0.02], [0.07, 0.07], [0.16, -0.05], [0.0, 0.08]].forEach(([cx, cz], i) => put(shrimp(0xD2362B), { cx, cy: SAND + 0.006, cz, rx: 0.025, rz: 0, sp: (i % 2 ? 1 : -1) * rr(0.25, 0.5), ph: i * 1.3, bob: 0, wag: 0 }));
  if (has('escargot')) { [[0.19, 0.08, 0xC9A35A, 0], [-0.21, -0.01, 0x8D6E63, 1]].forEach(([x, z, col, mur]) => { const s = grp(); const sh = ball(0.011, col, { seg: 8, rough: 0.5 }); sh.position.y = 0.01; const ft = ball(0.009, 0xE8D2A6, { seg: 6 }); ft.scale.set(1.7, 0.4, 0.8); ft.position.set(0.004, 0.003, 0); s.add(sh, ft); if (mur) { s.rotation.z = -Math.PI / 2; s.position.set(-X - 0.022, Y0 + 0.12, z); } else s.position.set(x, SAND, z); g.add(s); }); }
  if (has('bulles')) { g.add(cyl(0.012, 0.012, 0.012, 0x9AA0A6, { x: X - 0.02, y: SAND, z: -Z + 0.01, seg: 10, shadow: false })); for (let i = 0; i < 6; i++) { const b = ball(0.0035 + (i % 3) * 0.0012, 0xFFFFFF, { seg: 6, op: 0.7, rough: 0.2 }); vivant.add(b); A.bulles.push({ ob: b, x: X - 0.02, z: -Z + 0.01, y0: SAND + 0.02, h: SURF - SAND - 0.03, sp: 0.07 + (i % 3) * 0.012, ph: i / 6 }); } }
  g.userData.aqua = A; aquaAnim([g], 0); return g;
}

/** fait vivre les aquariums : t en secondes. Chaque poisson tourne sur une ellipse, la tête dans le sens de la nage ; la queue bat ; les bulles montent. */
export function aquaAnim(list, t) {
  (list || []).forEach(g => { const A = g && g.userData && g.userData.aqua; if (!A) return;
    A.fish.forEach(f => { const a = f.ph + t * f.sp; const s = Math.sin(a), c = Math.cos(a); f.ob.position.set(f.cx + f.rx * c, f.cy + f.bob * Math.sin(t * 0.9 + f.ph * 3), f.cz + f.rz * s); const vx = -f.rx * s * f.sp, vz = f.rz * c * f.sp; if (vx || vz) f.ob.rotation.y = Math.atan2(-vz, vx); if (f.wag && f.ob.userData.tail) f.ob.userData.tail.rotation.y = 0.45 * Math.sin(t * f.wag + f.ph); });
    A.bulles.forEach(b => { const u = (t * b.sp / Math.max(0.05, b.h) + b.ph) % 1; b.ob.position.set(b.x + 0.004 * Math.sin(t * 3 + b.ph * 9), b.y0 + u * b.h, b.z); });
  });
}
