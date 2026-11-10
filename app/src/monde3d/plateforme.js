// monde3d/plateforme.js — PLATEFORME : stock tampon de tubes et d'accessoires pré-isolés, hors dépôt (il n'y a pas de tube au dépôt).
// Barres de 12 m rangées par DN, accessoires sur palettes, bungalow, voie de chargement, clôture. Tout clic ouvre la fiche de la plateforme.
import { THREE, PAL, mat, rbox, box, cyl, grp, cachedMat, pickable, label, bake, escapeHtml } from './core.js';
import { pallet, forklift, container, truck, sign, lampPost } from './props2.js';
import { txt, ASPH, CONC, LINE } from './depot_deco.js';
const C = PAL; export const PF = { W: 46, D: 32 };
const GRAVE = 0xD9D4C8, MOUSSE = 0xF0D27A;
/** rayon de gaine (m, un peu grossi pour rester lisible de loin) selon le DN */
const rGaine = dn => 0.075 + Math.min(300, Math.max(25, dn || 0)) * 0.00085;
/** une pile de barres pré-isolées : gaine noire, mousse visible en bout, acier nu qui dépasse (extrémités à souder) */
function pile(n, len, r) {
  const g = grp(); let b = 1; while (b * (b + 1) / 2 < n) b++; let placed = 0;
  for (let k = 0; k < b && placed < n; k++) for (let j = 0; j < b - k && placed < n; j++, placed++) { const y = 0.12 + r + k * r * 1.75, z = -(b - 1) * r + (j + k * 0.5) * 2 * r;
    [[r, len, C.encre, 0], [r * 0.9, len + 0.03, MOUSSE, 0], [r * 0.48, len + 0.5, C.gris2, 0.6]].forEach(([rr, l, col, metal]) => { const m = cyl(rr, rr, l, col, { seg: 10, rough: metal ? 0.35 : 0.85, metal }); m.rotation.z = Math.PI / 2; m.position.set(0, y, z); g.add(m); }); }
  [-0.3, 0, 0.3].forEach(f => g.add(box(0.14, 0.12, b * r * 2 + 0.3, C.bois2, { x: f * len, y: 0 })));
  return g;
}
/** une palette d'accessoires, reconnaissable à sa famille : coudes, manchons, vannes, tés, sinon colis */
function accessoire(fam) {
  const g = pallet({ load: false }), s = String(fam || '').toLowerCase(), Y = 0.14;
  if (/coude/.test(s)) [-0.25, 0.25].forEach(z => { const e = new THREE.Mesh(new THREE.TorusGeometry(0.34, 0.11, 8, 8, Math.PI / 2), mat(C.encre)); e.rotation.x = -Math.PI / 2; e.position.set(-0.2, Y + 0.11, z + 0.15); e.castShadow = true; g.add(e); });
  else if (/manchon/.test(s)) for (let i = 0; i < 6; i++) g.add(cyl(0.15, 0.15, 0.5, C.encre, { x: -0.36 + (i % 3) * 0.36, y: Y, z: -0.2 + Math.floor(i / 3) * 0.4, seg: 10 }));
  else if (/vanne/.test(s)) [-0.3, 0.3].forEach(x => g.add(cyl(0.12, 0.12, 0.45, C.encre, { x, y: Y, seg: 10 }), cyl(0.16, 0.16, 0.04, C.rouge, { x, y: Y + 0.5, seg: 12 })));
  else if (/^t[ée]/.test(s)) [-0.2, 0.25].forEach(z => { const a = cyl(0.11, 0.11, 0.8, C.encre, { seg: 10 }); a.rotation.z = Math.PI / 2; a.position.set(0, Y + 0.11, z); g.add(a, cyl(0.1, 0.1, 0.3, C.encre, { x: 0, y: Y + 0.11, z, seg: 10 })); });
  else g.add(rbox(1.0, 0.5, 0.8, C.kraft, { r: 0.02, y: Y }));
  return g;
}
/** p = {k, nom, ville, secteur, tubes:[{dn, b}] (b = nombre de barres de 12 m), acc:[{f, n}]} */
export function buildPlateforme(p) {
  const g = grp(); g.name = 'plateforme:' + p.k; const W = PF.W, D = PF.D, x0 = -W / 2, z0 = -D / 2, act = { type: 'plateforme', k: p.k };
  const zone = { g, x0: x0 - 3, x1: -x0 + 3, z0: z0 - 3, z1: -z0 + 5, half: 31 }; /* le détail (DN, accessoires) ne s'affiche qu'une fois sur la plateforme */
  g.add(rbox(W + 8, 0.3, D + 10, C.herbe, { r: 0.4, y: -0.3, z: 1, rough: 1 }), box(W, 0.06, D, GRAVE, { y: -0.03, shadow: false }), box(W - 6, 0.02, 6, CONC, { x: -1, y: 0.02, z: 11.5, shadow: false }), box(8, 0.06, 5, ASPH, { x: 15, y: -0.03, z: D / 2 + 2.4, shadow: false }));
  // clôture légère (poteaux, lisse, grillage translucide) ; portail entre x = 11 et x = 19
  const grille = cachedMat('pf|grille', () => new THREE.MeshStandardMaterial({ color: 0x8E87A6, transparent: true, opacity: 0.16, depthWrite: false, side: THREE.DoubleSide }));
  const cloture = (axis, a, b, at) => { const len = b - a, mid = (a + b) / 2, P = (w, h, t, col, o2) => axis === 'x' ? box(w, h, t, col, Object.assign({ x: mid, z: at }, o2)) : box(t, h, w, col, Object.assign({ x: at, z: mid }, o2));
    const m = P(len, 1.9, 0.02, 0, { y: 0.05, mat: grille, shadow: false }); m.receiveShadow = false; g.add(m, P(len, 0.05, 0.05, C.gris, { y: 1.95, shadow: false }));
    for (let i = 0, n = Math.max(1, Math.round(len / 3)); i <= n; i++) g.add(axis === 'x' ? box(0.07, 2, 0.07, C.gris, { x: a + i * len / n, z: at, shadow: false }) : box(0.07, 2, 0.07, C.gris, { x: at, z: a + i * len / n, shadow: false })); };
  cloture('x', x0, -x0, z0); cloture('z', z0, -z0, x0); cloture('z', z0, -z0, -x0); cloture('x', x0, 11, -z0); cloture('x', 19, -x0, -z0);
  // tubes : une pile par DN, sur deux colonnes
  let barres = 0, nAcc = 0;
  (p.tubes || []).slice(0, 8).forEach((t, i) => { const x = -14.5 + (i % 2) * 14, z = z0 + 4 + Math.floor(i / 2) * 4.4, nb = t.b || 0; barres += nb;
    const st = pile(Math.max(1, Math.min(10, nb)), 12, rGaine(t.dn)); st.position.set(x, 0.03, z); bake(st); pickable(st, act, 'DN ' + t.dn + ' · ' + nb + ' barres · ' + nb * 12 + ' ml — ' + p.nom); g.add(st);
    g.add(txt('DN ' + t.dn, 2.6, 0.7, { floor: true, color: '#3A3550', op: 0.6, x, y: 0.045, z: z + 1.8 }), label('DN ' + t.dn + ' · ' + nb * 12 + ' ml', { cls: nb <= 2 ? 'warn' : 'soft', x, y: 1.7, z, min: 14, zone })); });
  // accessoires : une palette par famille
  (p.acc || []).slice(0, 9).forEach((a, i) => { const x = 10.5 + (i % 3) * 3.6, z = z0 + 4 + Math.floor(i / 3) * 3.6; nAcc += a.n || 0;
    const pl = accessoire(a.f); pl.position.set(x, 0.03, z); bake(pl); pickable(pl, act, a.f + ' · ' + (a.n || 0) + ' — ' + p.nom); g.add(pl, label(a.f + ' · ' + (a.n || 0), { cls: 'soft', x, y: 1.3, z, min: 26, zone })); });
  if (nAcc) g.add(label('Accessoires · ' + nAcc, { cls: 'soft', x: 14.1, y: 1.9, z: z0 + 7.6, min: 14, max: 25.9, zone })); /* de loin une seule étiquette, le détail par famille en s'approchant */
  // bungalow, camion en chargement sur la voie béton, chariot, panneau, éclairage
  const bg = container('bureau', { w: 6 }); bg.position.set(15.5, 0.03, 4.5); bake(bg); pickable(bg, act, p.nom + ' — bungalow'); g.add(bg);
  const tk = truck(C.blanc, { load: true }); tk.position.set(-6, 0.04, 11.5); g.add(tk); const fk = forklift(); fk.position.set(5.5, 0.03, 6); fk.rotation.y = -0.6; g.add(fk);
  [-1.7, 1.7].forEach(dz => g.add(box(W - 8, 0.006, 0.12, LINE, { x: -1, y: 0.045, z: 11.5 + dz, shadow: false })));
  const sg = sign(p.nom, 'Stock tampon pré-isolé', { w: Math.max(5.2, String(p.nom || '').length * 0.34 + 1) }); sg.position.set(6.5, 0, D / 2 + 1.6); g.add(sg);
  [[x0 + 1, z0 + 1], [-x0 - 1, -z0 - 1]].forEach(([x, z]) => { const lp = lampPost(5); lp.position.set(x, 0, z); g.add(lp); });
  g.add(label('', { cls: 'nuit big', x: 0, y: 4.5, z: 2, max: 13, html: `${escapeHtml(p.nom)}<small>Stock tampon pré-isolé · ${barres} barres · ${barres * 12} ml · ${nAcc} accessoires</small>` }));
  bake(g); g.userData.cams = { all: [-1, 0, 2.5, 27] }; g.userData.tot = { barres, ml: barres * 12, acc: nAcc };
  return g;
}
