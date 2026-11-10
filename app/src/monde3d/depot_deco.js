// monde3d/depot_deco.js — habillage « siège + plateforme logistique » du dépôt : façades, sols, mobilier d'ambiance, abords.
// DÉCOR SEULEMENT : rien ici n'est cliquable (aucun userData.pick), donc rien ne peut bloquer un clic sur un bureau, un rayon ou un véhicule.
import { THREE, PAL, mat, rbox, box, cyl, plane, grp, cachedMat, canvasTex, FONT, aoStrip, blob } from './core.js';
import { plant, chair } from './props.js';
import { sofa, coffeeTable, tree, flagPole } from './props2.js';
const C = PAL;
/* palette sobre : blanc, gris chauds, anthracite, bois ; le violet reste un accent */
export const DK = 0x2B2640, ANTH = 0x3A3550, GREIGE = 0xEDEBE6, STONE = 0xE4E1DA, CONC = 0xDAD9DE, ASPH = 0x5B5868, PAVE = 0xD6D3CC, LINE = 0xF2C14E;
const FY = 0.25; /* dessus de la dalle du bâtiment */
/** verre des façades et cloisons : n'écrit pas dans la profondeur, donc ne masque jamais un personnage derrière */
const glass = () => cachedMat('dep|verre', () => new THREE.MeshStandardMaterial({ color: 0xA9C4D8, roughness: 0.12, metalness: 0, transparent: true, opacity: 0.34, depthWrite: false }));
const gbox = (w, h, d, o) => { const m = box(w, h, d, 0, Object.assign({ mat: glass(), shadow: false }, o)); m.receiveShadow = false; m.renderOrder = 3; return m; };
/** texte peint au sol (floor) ou dressé sur un mur : texture canvas, sans ombre */
export function txt(text, w, h, o) {
  o = o || {}; const k = Math.min(96, 2048 / w);
  const tex = canvasTex(Math.round(w * k), Math.round(h * k), (c, W, H) => { c.clearRect(0, 0, W, H); c.fillStyle = o.color || '#FFFFFF'; c.font = (o.weight || 800) + ' ' + Math.round(H * 0.74) + 'px ' + FONT; c.textAlign = 'center'; c.textBaseline = 'middle'; try { c.letterSpacing = Math.round(H * 0.06) + 'px'; } catch (e) { } c.fillText(String(text), W / 2, H * 0.54, W * 0.96); });
  const m = new THREE.Mesh(new THREE.PlaneGeometry(w, h), new THREE.MeshBasicMaterial({ map: tex, transparent: true, opacity: o.op || 1, depthWrite: false, polygonOffset: true, polygonOffsetFactor: -3, polygonOffsetUnits: -3 }));
  if (o.floor) { m.rotation.x = -Math.PI / 2; m.rotation.z = o.ry || 0; } else m.rotation.y = o.ry || 0;
  m.position.set(o.x || 0, o.y || 0, o.z || 0); m.renderOrder = 2; m.userData.noPick = true; return m;
}
/** mur bas en coupe (même langage que les bureaux : blanc, dessus sombre) — axe 'x' ou 'z', de a à b */
function lowWall(g, axis, a, b, at, h, col) {
  const len = b - a, mid = (a + b) / 2, T = 0.3; if (len <= 0.05) return;
  const w = axis === 'x' ? len : T, d = axis === 'x' ? T : len, x = axis === 'x' ? mid : at, z = axis === 'x' ? at : mid;
  g.add(box(w, h, d, col == null ? C.blanc : col, { x, y: FY, z }), box(w + 0.01, 0.03, d + 0.01, DK, { x, y: FY + h, z, shadow: false }));
}
/** bande peinte au sol */
const band = (g, w, d, col, x, z, y) => g.add(box(w, 0.006, d, col, { x, y: y == null ? FY + 0.022 : y, z, shadow: false }));
/** façade rideau vitrée (allège blanche, vitrage à montants fins, bandeau sombre) le long d'un axe */
function curtainWall(g, axis, a, b, at, H) {
  const len = b - a, mid = (a + b) / 2, sill = 0.9, fas = 1.3, gh = H - sill - fas;
  const P = (w, h, t, col, along, y, o) => axis === 'x' ? box(w, h, t, col, Object.assign({ x: along, y, z: at }, o)) : box(t, h, w, col, Object.assign({ x: at, y, z: along }, o));
  g.add(P(len, sill, 0.3, C.blanc, mid, FY), P(len, fas, 0.36, DK, mid, FY + sill + gh));
  g.add(axis === 'x' ? gbox(len, gh, 0.06, { x: mid, y: FY + sill, z: at }) : gbox(0.06, gh, len, { x: at, y: FY + sill, z: mid }));
  const n = Math.max(2, Math.round(len / 2.4)); for (let i = 0; i <= n; i++) g.add(P(0.09, gh, 0.16, ANTH, a + i * len / n, FY + sill, { shadow: false }));
  g.add(P(len, 0.07, 0.14, ANTH, mid, FY + sill + gh * 0.5, { shadow: false }));
}
/** ENVELOPPE : deux façades hautes au fond (bureaux vitrés, magasin bardé), murs bas en coupe devant, entrée vitrée */
export function decoEnvelope(g, L) {
  const { d, bld, sx0, doorX, bx, bz } = L; const x0 = bld.x, x1 = bld.x + bld.w, z0 = bld.z, z1 = bld.z + bld.d;
  const H1 = 5.9, H2 = 7.2, xs = sx0 - 0.5, nom = String(d.nom || '').toUpperCase(), ville = String(d.ville || '').toUpperCase();
  g.add(box(bld.w + 5, 0.06, bld.d + 5, PAVE, { x: bx, y: -0.03, z: bz, shadow: false }), box(bld.w + 0.5, 0.2, bld.d + 0.5, DK, { x: bx, y: -0.02, z: bz, shadow: false })); /* trottoir pavé + socle sombre */
  // fond côté bureaux et pignon ouest : façade rideau
  curtainWall(g, 'x', x0, xs, z0, H1); curtainWall(g, 'z', z0, z1, x0, H1);
  // fond côté magasin : bardage plus haut, soubassement anthracite, bandeau translucide, acrotère sombre
  const wl = x1 - xs, wm = (xs + x1) / 2, ch = H2 - 2.6;
  g.add(box(wl, 1.0, 0.34, ANTH, { x: wm, y: FY, z: z0 }), box(wl, ch, 0.3, 0xECEBF0, { x: wm, y: FY + 1.0, z: z0 }), gbox(wl, 0.8, 0.08, { x: wm, y: FY + 1.0 + ch, z: z0 }), box(wl, 0.8, 0.36, DK, { x: wm, y: FY + H2 - 0.8, z: z0 }));
  for (let i = 1; i < wl / 1.2; i++) g.add(box(0.03, ch, 0.32, 0xDDDCE4, { x: xs + i * 1.2, y: FY + 1.0, z: z0, shadow: false }));
  [[x0, z0, H1], [xs, z0, H2], [x1, z0, H2], [x0, z1, H1]].forEach(([x, z, h]) => g.add(box(0.5, h + 0.06, 0.5, DK, { x, y: FY, z })));
  // enseignes : nom sur le bandeau (lisible dedans et dehors), MAGASIN sur le bardage
  const nw = Math.min((xs - x0) * 0.7, Math.max(6, nom.length * 0.85));
  g.add(txt(nom, nw, 0.85, { x: (x0 + xs) / 2, y: FY + H1 - 0.65, z: z0 + 0.19 }), txt(nom, nw, 0.85, { x: (x0 + xs) / 2, y: FY + H1 - 0.65, z: z0 - 0.19, ry: Math.PI }));
  g.add(txt(nom, nw, 0.85, { x: x0 - 0.19, y: FY + H1 - 0.65, z: bz, ry: -Math.PI / 2 }), txt(nom, Math.min(wl * 0.8, nw), 0.5, { x: wm, y: FY + H2 - 0.4, z: z0 - 0.19, ry: Math.PI }));
  if (ville) g.add(txt(ville, Math.min(bld.d * 0.5, Math.max(4, ville.length * 0.55)), 0.5, { x: x0 + 0.19, y: FY + H1 - 0.65, z: bz, ry: Math.PI / 2, op: 0.85 }));
  g.add(txt('MAGASIN', Math.min(wl * 0.6, 9), 1.5, { color: '#3A3550', op: 0.85, x: wm, y: FY + 4.3, z: z0 + 0.17 }));
  // devant et côté quai : murs bas en coupe, ouverts à l'entrée et au quai
  lowWall(g, 'x', x0, doorX - 2.1, z1, 1.1); lowWall(g, 'x', doorX + 2.1, x1, z1, 1.1); lowWall(g, 'z', z0, bz - 3 - 1.95, x1, 1.1); lowWall(g, 'z', bz - 3 + 1.95, z1, x1, 1.1);
  // entrée : portique acier fin, vantaux vitrés, auvent en verre
  const ey = FY, ez = z1;
  [-2.05, 2.05].forEach(dx => g.add(box(0.1, 3.0, 0.14, ANTH, { x: doorX + dx, y: ey, z: ez })));
  g.add(box(4.2, 0.12, 0.14, ANTH, { x: doorX, y: ey + 3.0, z: ez }), gbox(1.85, 2.9, 0.05, { x: doorX - 1.05, y: ey, z: ez }), gbox(1.85, 2.9, 0.05, { x: doorX + 1.05, y: ey, z: ez }));
  g.add(gbox(5.2, 0.06, 2.6, { x: doorX, y: ey + 3.12, z: ez + 1.2 }), box(5.3, 0.1, 0.1, ANTH, { x: doorX, y: ey + 3.06, z: ez + 2.5, shadow: false }));
  [-2.55, 2.55].forEach(dx => g.add(box(0.1, 0.1, 2.6, ANTH, { x: doorX + dx, y: ey + 3.06, z: ez + 1.2, shadow: false }), cyl(0.05, 0.05, 3.3, ANTH, { x: doorX + dx, y: 0.03, z: ez + 2.45, seg: 8 })));
}
/** aplat peint au sol, dessiné en canvas (hachures, passage piéton, numéros) : x du canvas = x du monde, y du canvas = z du monde */
function paint(w, d, x, z, y, draw) {
  const k = Math.min(64, 2048 / Math.max(w, d)); const tex = canvasTex(Math.round(w * k), Math.round(d * k), (c, W, H) => { c.clearRect(0, 0, W, H); draw(c, W, H, k); });
  const m = new THREE.Mesh(new THREE.PlaneGeometry(w, d), new THREE.MeshBasicMaterial({ map: tex, transparent: true, depthWrite: false, polygonOffset: true, polygonOffsetFactor: -2, polygonOffsetUnits: -2 }));
  m.rotation.x = -Math.PI / 2; m.position.set(x, y, z); m.renderOrder = 2; m.userData.noPick = true; return m;
}
const hatch = (c, W, H, k, col) => { c.strokeStyle = col; c.lineWidth = 0.14 * k; c.strokeRect(0.07 * k, 0.07 * k, W - 0.14 * k, H - 0.14 * k); c.save(); c.beginPath(); c.rect(0.14 * k, 0.14 * k, W - 0.28 * k, H - 0.28 * k); c.clip(); c.lineWidth = 0.12 * k; for (let i = -H; i < W; i += 0.7 * k) { c.beginPath(); c.moveTo(i, H); c.lineTo(i + H, 0); c.stroke(); } c.restore(); };
/** SOLS ET CLOISONS : ombres au pied des façades, balisage du magasin, murs bas entre zones */
export function decoFloors(g, L) {
  const { bld, bx, bz, sx0, sz0, sw, sd, cafZ, nR, rw } = L; const x0 = bld.x, x1 = bld.x + bld.w, z0 = bld.z, z1 = bld.z + bld.d, Y = FY + 0.024;
  g.add(aoStrip(bld.w - 0.6, 1.6, { x: bx, y: FY + 0.03, z: z0 + 0.16, op: 0.2 }), aoStrip(bld.d - 0.6, 1.6, { x: x0 + 0.16, y: FY + 0.03, z: bz, ry: Math.PI / 2, op: 0.2 }));
  // magasin : périmètre balisé en jaune, zone de quai hachurée, lettres de rangée au bout des rayons
  const i = 0.45; band(g, sw - 2 * i, 0.1, LINE, sx0 + sw / 2, sz0 + i); band(g, sw - 2 * i, 0.1, LINE, sx0 + sw / 2, sz0 + sd - i); band(g, 0.1, sd - 2 * i, LINE, sx0 + i, sz0 + sd / 2); band(g, 0.1, sd - 2 * i, LINE, sx0 + sw - i, sz0 + sd / 2);
  g.add(paint(4.4, 5, x1 - 2.7, bz - 3, Y, (c, W, H, k) => hatch(c, W, H, k, '#F2C14E')), txt('QUAI', 2.6, 0.7, { floor: true, color: '#3A3550', op: 0.6, x: x1 - 2.7, y: Y, z: bz + 0.3 }));
  for (let r = 0; r < (nR || 0); r++) g.add(txt('ABCD'[r] || '', 0.9, 0.9, { floor: true, color: '#3A3550', op: 0.55, x: sx0 + 1 + rw + 0.75, y: Y, z: sz0 + 1.6 + r * 2.8 }));
  // murs bas en coupe : magasin / bureaux (porte côté café) et magasin / vestiaire (passage chariot à l'est)
  const px = sx0 - 0.5; lowWall(g, 'z', z0 + 0.2, cafZ + 1.2, px, 1.1); lowWall(g, 'z', cafZ + 3.6, z1 - 0.2, px, 1.1); lowWall(g, 'x', px + 0.15, x1 - 3.4, sz0 + sd + 0.5, 1.1);
}
/** PIÈCES : salle de réunion vitrée toute hauteur + mur d'image, mur logo derrière l'accueil */
export function decoRooms(g, L) {
  const { d, bld, mx, mz, mw, md, az } = L; const z0 = bld.z, gh = 2.5, fw = mw - 2.2;
  g.add(gbox(0.06, gh, md, { x: mx, y: FY, z: mz + md / 2 }), box(0.1, 0.07, md, ANTH, { x: mx, y: FY + gh, z: mz + md / 2, shadow: false }), gbox(fw, gh, 0.06, { x: mx + fw / 2, y: FY, z: mz + md }), box(mw, 0.07, 0.1, ANTH, { x: mx + mw / 2, y: FY + gh, z: mz + md, shadow: false }));
  for (let k = 0; k <= 4; k++) g.add(box(0.07, gh, 0.07, ANTH, { x: mx, y: FY, z: mz + k * md / 4, shadow: false }), box(0.07, gh, 0.07, ANTH, { x: mx + k * fw / 4, y: FY, z: mz + md, shadow: false }));
  g.add(box(0.07, gh, 0.07, ANTH, { x: mx + mw, y: FY, z: mz + md, shadow: false }), box(5.2, 2.6, 0.1, ANTH, { x: mx + mw / 2, y: FY + 0.6, z: z0 + 0.24 }));
  // mur logo face à l'entrée : pictogramme « tube pré-isolé en coupe » (cercles concentriques) + nom du dépôt
  const lw = 4.6, lh = 2.5, lx = mx + mw - 2.6, lz = az + 0.2; g.add(box(lw, lh, 0.16, DK, { x: lx, y: FY, z: lz }), box(lw + 0.02, 0.04, 0.2, C.violet, { x: lx, y: FY + lh, z: lz, shadow: false }));
  const k = 110, tex = canvasTex(Math.round(lw * k), Math.round(1.5 * k), (c, W, H) => { c.clearRect(0, 0, W, H); const r = H * 0.36, cx = H * 0.55, cy = H / 2; c.lineWidth = r * 0.16; c.strokeStyle = '#FFFFFF'; c.beginPath(); c.arc(cx, cy, r, 0, 7); c.stroke(); c.fillStyle = '#F2C14E'; c.beginPath(); c.arc(cx, cy, r * 0.74, 0, 7); c.fill(); c.fillStyle = '#2B2640'; c.beginPath(); c.arc(cx, cy, r * 0.42, 0, 7); c.fill(); c.strokeStyle = '#B9B3CC'; c.lineWidth = r * 0.1; c.beginPath(); c.arc(cx, cy, r * 0.42, 0, 7); c.stroke(); c.fillStyle = '#FFFFFF'; c.textBaseline = 'middle'; c.font = '800 ' + Math.round(H * 0.3) + 'px ' + FONT; c.fillText(String(d.nom || ''), H * 1.15, H * 0.4, W - H * 1.3); c.fillStyle = '#D6CEF2'; c.font = '600 ' + Math.round(H * 0.16) + 'px ' + FONT; c.fillText((d.ville ? d.ville + ' · ' : '') + 'Réseaux de chaleur', H * 1.15, H * 0.7, W - H * 1.3); });
  const lg = new THREE.Mesh(new THREE.PlaneGeometry(lw, 1.5), new THREE.MeshBasicMaterial({ map: tex, transparent: true, depthWrite: false, polygonOffset: true, polygonOffsetFactor: -3, polygonOffsetUnits: -3 })); lg.position.set(lx, FY + lh / 2 + 0.1, lz + 0.085); lg.renderOrder = 2; lg.userData.noPick = true; g.add(lg);
}
/** chaise coque légère (6 boîtes) : les tables projet en alignent beaucoup, on économise les triangles */
const seat = col => { const s = grp(); s.add(box(0.46, 0.05, 0.44, col, { y: 0.44 }), box(0.46, 0.42, 0.05, col, { y: 0.52, z: -0.2 })); [[-0.19, -0.17], [0.19, -0.17], [-0.19, 0.17], [0.19, 0.17]].forEach(([x, z]) => s.add(box(0.04, 0.44, 0.04, ANTH, { x, z, shadow: false }))); return s; };
/** PLATEAU : l'aile bureaux devant les pièces fermées — tables projet sur parquet, salon, coin debout, plantes */
export function decoLounge(g, L) {
  const { bld, offX, offZ, M } = L; const wx = offX, ww = M.offW, wz0 = offZ + M.offD + 1.7, wz1 = bld.z + bld.d - 1.3, fd = wz1 - wz0, Y = FY + 0.02; if (fd < 5 || ww < 8) return;
  g.add(rbox(ww - 1, 0.014, 5.4, C.bois, { r: 0.04, x: wx + ww / 2, y: FY + 0.008, z: wz0 + 2.9, shadow: false }));
  const nT = Math.max(1, Math.floor((ww - 3) / 7.5));
  for (let i = 0; i < nT; i++) { const tx = wx + ww / 2 + (i - (nT - 1) / 2) * 7.5, tz = wz0 + 2.9;
    g.add(rbox(4.2, 0.06, 1.4, C.blanc, { r: 0.02, x: tx, y: FY + 0.72, z: tz }), box(0.08, 0.72, 1.2, ANTH, { x: tx - 1.8, y: FY, z: tz }), box(0.08, 0.72, 1.2, ANTH, { x: tx + 1.8, y: FY, z: tz }), blob(4.8, 2.4, { x: tx, y: FY + 0.03, z: tz, op: 0.2 }));
    for (let k = 0; k < 6; k++) { const ch = seat(k % 3 === 1 ? C.violet : C.gris2), s = k < 3 ? -1 : 1; ch.position.set(tx - 1.3 + (k % 3) * 1.3, Y, tz + s * 1.15); ch.rotation.y = s > 0 ? Math.PI : 0; g.add(ch); } }
  if (fd >= 11) { const zc = wz1 - 2.8, lx = wx + ww * 0.25, sx = wx + ww * 0.72;
    // salon : deux canapés face à face, fauteuils, tapis sombre
    g.add(rbox(6.6, 0.014, 4.8, 0x3B3653, { r: 0.08, x: lx, y: FY + 0.008, z: zc, shadow: false }));
    const s1 = sofa(2.6, C.gris2); s1.position.set(lx, Y, zc - 1.5); const s2 = sofa(2.6, C.gris2); s2.position.set(lx, Y, zc + 1.5); s2.rotation.y = Math.PI; const ct = coffeeTable(); ct.position.set(lx, Y, zc); g.add(s1, s2, ct);
    [-1, 1].forEach(s => { const f = chair('fauteuil', C.violet); f.position.set(lx + s * 2.5, Y, zc); f.rotation.y = -s * Math.PI / 2; g.add(f); });
    // coin debout : deux tables hautes et leurs tabourets (pas de tube au dépôt : le stock pré-isolé est sur les plateformes)
    g.add(rbox(8.6, 0.014, 3.4, 0xF7F6F2, { r: 0.06, x: sx, y: FY + 0.008, z: zc, shadow: false }));
    for (let j = 0; j < 2; j++) { const x = sx + (j - 0.5) * 3.8; g.add(cyl(0.55, 0.55, 0.05, C.bois, { x, y: FY + 1.05, z: zc, seg: 20 }), cyl(0.05, 0.07, 1.05, ANTH, { x, y: FY, z: zc, seg: 8 }), blob(1.9, 1.9, { x, y: FY + 0.03, z: zc, op: 0.2 }));
      for (let k = 0; k < 3; k++) { const st = chair('tabouret', C.violet); st.position.set(x + Math.cos(k * 2.1 + j) * 0.95, Y, zc + Math.sin(k * 2.1 + j) * 0.95); g.add(st); } }
  }
  for (let x = wx + 1.2, i = 0; x < wx + ww - 0.5; x += 4.8, i++) { const pl = plant(i % 2 ? 'ficus' : 'palmier', ANTH); pl.scale.setScalar(0.9); pl.position.set(x, Y, wz1 + 0.75); g.add(pl); }
}
const arrow = (c, W, H) => { c.fillStyle = 'rgba(255,255,255,.8)'; c.beginPath(); c.moveTo(0, H * 0.38); c.lineTo(W * 0.62, H * 0.38); c.lineTo(W * 0.62, H * 0.1); c.lineTo(W, H * 0.5); c.lineTo(W * 0.62, H * 0.9); c.lineTo(W * 0.62, H * 0.62); c.lineTo(0, H * 0.62); c.fill(); };
/** ABORDS : parvis, parking numéroté bordé d'une haie, accès depuis la route, cour logistique balisée, mâts */
export function decoSite(g, L) {
  const { bld, bx, bz, doorX, pkz, pkw, perRow, bays, X0, M } = L; const x1 = bld.x + bld.w, z0 = bld.z, z1 = bld.z + bld.d;
  // parvis d'entrée : dalle claire, deux jardinières
  g.add(box(8.4, 0.02, 2.3, 0xEFECE5, { x: doorX, y: 0.03, z: z1 + 1.35, shadow: false }));
  [-3.5, 3.5].forEach(dx => g.add(box(1.7, 0.5, 0.6, ANTH, { x: doorX + dx, y: 0.03, z: z1 + 1.4 }), rbox(1.5, 0.4, 0.45, C.feuille2, { r: 0.15, x: doorX + dx, y: 0.5, z: z1 + 1.4 })));
  // parking : bordures, numéros de place, flèches de circulation
  const kb = (w, d, x, z) => g.add(box(w, 0.1, d, PAVE, { x, y: 0, z, shadow: false })); kb(pkw + 2.4, 0.2, bx, pkz - 0.1); kb(pkw + 2.4, 0.2, bx, pkz + 17.1); kb(0.2, 17.4, bx - pkw / 2 - 1.1, pkz + 8.5);
  [0, 1].forEach(r => g.add(paint(pkw, 0.9, bx, pkz + (r ? 9.9 : 6.1), 0.05, (c, W, H, k) => { c.fillStyle = 'rgba(255,255,255,.85)'; c.font = '700 ' + Math.round(H * 0.8) + 'px ' + FONT; c.textAlign = 'center'; c.textBaseline = 'middle'; for (let i = 0; i < perRow; i++) { const n = r * perRow + i; if (n >= bays) break; c.fillText(String(n + 1).padStart(2, '0'), (L.bayAt(n)[0] - (bx - pkw / 2)) * k, H / 2); } })));
  [-0.25, 0.25].forEach(f => g.add(paint(3.2, 1.2, bx + pkw * f, pkz + 8, 0.05, arrow)));
  // haie taillée entre le parking et la route, accès voiture à l'est
  const hx0 = bx - pkw / 2 - 1, hx1 = bx + pkw / 2 - 7.5; g.add(rbox(hx1 - hx0, 0.9, 0.8, 0x5E8A54, { r: 0.25, x: (hx0 + hx1) / 2, y: 0, z: pkz + 18.4 }), box(7, 0.06, 5, ASPH, { x: bx + pkw / 2 - 3, y: -0.025, z: pkz + 19.2, shadow: false }));
  // cour logistique : dalle béton, couloir camion balisé, sans stockage de tubes (ils sont sur les plateformes)
  g.add(box(10.5, 0.06, bld.d - 2, 0xCFCED6, { x: x1 + 7.75, y: -0.025, z: bz, shadow: false }));
  [-1.9, 1.9].forEach(dz => g.add(box(9.5, 0.006, 0.12, LINE, { x: x1 + 5.4, y: 0.036, z: bz - 3 + dz, shadow: false })));
  // rangée de mâts à l'entrée du site
  [[C.nuit, 13.8], [C.blanc, 15.6]].forEach(([col, dz]) => { const fp = flagPole(col); fp.position.set(X0 + 3, 0, M.siteD / 2 - dz); g.add(fp); });
}
/** QUARTIERS DE BUREAUX : nom peint au sol devant chaque quartier, coin pause entre deux îlots, rue plantée entre quartiers, coin réunion si l'aile a de la place */
export function decoQuartiers(g, L) {
  const { offX, offZ, M } = L, PL = M.plan; if (!PL) return; const ox = offX + 0.5, oz = offZ + 0.5, Y = FY + 0.02;
  PL.quartiers.forEach(Q => { if (!Q.ilots.length) return; const w = Q.x1 - Q.x0;
    if (PL.quartiers.length > 1) g.add(txt(Q.nom.toUpperCase(), Math.min(w, Math.max(5, Q.nom.length * 0.62)), 0.62, { floor: true, color: '#3A3550', op: 0.55, x: ox + (Q.x0 + Q.x1) / 2, y: FY + 0.03, z: oz + PL.D + 0.8 }));
    Q.ilots.forEach((I, i) => { const N = Q.ilots[i + 1]; if (!N || Math.abs(N.x0 - I.x0) > 0.1 || N.z0 <= I.z1) return; const x1 = Math.min(I.x1, N.x1), cx = ox + (I.x0 + x1) / 2, cz = oz + (I.z1 + N.z0) / 2;
      g.add(rbox(x1 - I.x0 - 0.6, 0.016, PL.GZ - 0.9, 0xDCD7CC, { r: 0.08, x: cx, y: FY + 0.008, z: cz, shadow: false }));
      const s1 = sofa(2.2, C.gris2); s1.position.set(cx - 2.2, Y, cz); s1.rotation.y = Math.PI / 2; const s2 = sofa(2.2, C.gris2); s2.position.set(cx + 2.2, Y, cz); s2.rotation.y = -Math.PI / 2; const t = coffeeTable(); t.position.set(cx, Y, cz); g.add(s1, s2, t); }); });
  for (let i = 0; i < PL.quartiers.length - 1; i++) { const A = PL.quartiers[i], x = ox + A.x1 + PL.GX / 2; if (!A.ilots.length) continue;
    g.add(rbox(PL.GX - 1.8, 0.016, PL.D + 0.4, 0xDCD7CC, { r: 0.08, x, y: FY + 0.008, z: oz + PL.D / 2, shadow: false }));
    for (let z = 1.6, k = 0; z < PL.D - 1; z += 4.6, k++) { g.add(rbox(1.0, 0.45, 1.0, ANTH, { r: 0.04, x, y: FY + 0.01, z: oz + z })); const pl = plant(k % 2 ? 'palmier' : 'ficus', ANTH); pl.position.set(x, FY + 0.3, oz + z); g.add(pl); } }
  const fx0 = ox + PL.W + 0.8, fx1 = offX + M.offW - 0.5;
  if (fx1 - fx0 >= 6 && PL.D >= 4) { const cx = (fx0 + fx1) / 2, cz = oz + Math.min(PL.D, 10.56) / 2;
    g.add(rbox(Math.min(fx1 - fx0, 7), 0.016, 5.4, 0xD5D1DF, { r: 0.08, x: cx, y: FY + 0.008, z: cz, shadow: false }), cyl(1.0, 1.0, 0.05, C.blanc, { x: cx, y: FY + 0.72, z: cz, seg: 24 }), cyl(0.07, 0.3, 0.72, ANTH, { x: cx, y: FY, z: cz, seg: 10 }), blob(2.8, 2.8, { x: cx, y: FY + 0.03, z: cz, op: 0.2 }));
    for (let k = 0; k < 4; k++) { const a = k * Math.PI / 2 + Math.PI / 4, st = seat(k % 2 ? C.violet : C.gris2); st.position.set(cx + Math.sin(a) * 1.45, Y, cz + Math.cos(a) * 1.45); st.rotation.y = a + Math.PI; g.add(st); }
    const pl = plant('monstera', ANTH); pl.position.set(cx + 2.6, Y, cz - 2); g.add(pl); }
}
