// monde3d/perso.js — LES PERSONNAGES EN 3D (figurines) — 08/11/2026.
// Construits depuis l'avatar du kit SCR (même profil que le dessin : peau, coiffure, couleur, barbe, lunettes, casque, coiffe, haut, bas, chaussures, gants).
// Une figurine = UN seul maillage (couleurs par sommet) : léger même avec 40 personnes à l'écran. Les géométries sont gardées en cache par avatar + pose.
// Aucune donnée ici : on reçoit le cfg de l'avatar (avatarConfig) ; sans cfg, une silhouette neutre.
import { THREE, cachedMat } from './core.js';
import { mergeGeometries, mergeVertices } from 'three/examples/jsm/utils/BufferGeometryUtils.js';
import { RoundedBoxGeometry } from 'three/examples/jsm/geometries/RoundedBoxGeometry.js';
/* ── couleurs (reprises des tables du kit avatar, pour ne rien modifier dans avatar.js) ── */
const SKIN = { p1: '#FBD9BF', p2: '#F1C39F', p3: '#DDA57A', p4: '#B9794E', p5: '#8D5637', p6: '#5E3A26' };
const HAIR = { noir: '#1E1B1A', brun: '#4A3020', chatain: '#7A4E2B', blond: '#D8B25A', roux: '#B5532A', gris: '#9A9A9A', blanc: '#E5E3DE' };
const TEINTES = { blanc: '#FFFFFF', creme: '#F1E6D0', beige: '#CDB391', camel: '#B07A45', marron: '#6B3A22', noir: '#23262D', anthracite: '#3A404B', gris: '#8E96A3', marine: '#1E2A44', roi: '#2456C8', jean: '#4F77A8', ciel: '#C3D7F0', turquoise: '#1F9FA8', vert: '#2E7D55', kaki: '#6B7347', jaune: '#F2C230', orange: '#F26A1B', rouge: '#C9241C', bordeaux: '#7A1F2B', rose: '#F2C6C0', fuchsia: '#D43D6B', violet: '#6B4BB8' };
/* haut : [teinte, coupe (l = manches longues, s = courtes), habillage, teinte au choix] */
const TOPS = {
  hv: ['#F26A1B', 'l', 'hv'], hvbi: ['#F26A1B', 'l', 'hvbi'], soudeur: ['#CDAA7D', 'l', 'soudeur'], gilet: ['#23262D', 'l', 'gilet'], softshell: ['#1E2A44', 'l', '', 1],
  chemise_blanche: ['#FFFFFF', 'l', 'col'], chemise_bleue: ['#C3D7F0', 'l', 'col'], chemisier_blanc: ['#FFFFFF', 'l', 'col'], chemisier_rose: ['#F2C6C0', 'l', 'col'], blazer_marine: ['#1E2A44', 'l', 'blazer'],
  tshirt_hv: ['#F26A1B', 'l', ''], sweat_hv: ['#F26A1B', 'l', 'bandes'], pluie: ['#2E7D55', 'l', 'chasuble'], tshirt: ['#23262D', 's', '', 1], polo: ['#1E2A44', 's', 'col', 1], chemise: ['#FFFFFF', 'l', 'col', 1],
  chemisier: ['#FFFFFF', 'l', 'col', 1], sweat: ['#8E96A3', 'l', '', 1], hoodie: ['#8E96A3', 'l', 'capuche', 1], blazer: ['#1E2A44', 'l', 'blazer', 1], hoodie_gris: ['#8E96A3', 'l', 'capuche'], hoodie_noir: ['#23262D', 'l', 'capuche'],
  polo_marine: ['#1E2A44', 's', 'col'], polo_blanc: ['#FFFFFF', 's', 'col'], tshirt_noir: ['#23262D', 's', ''], tshirt_blanc: ['#FFFFFF', 's', '']
};
const BAS = { pantalon: ['#1E2A44', 'pant', 1], short: ['#CDB391', 'short', 1], pantalon_78: ['#1E2A44', 'pant', 1], jupe: ['#1E2A44', 'jupe', 1], pluie_bas: ['#2E7D55', 'pant'], travail: ['#1E2A44', 'pant'], travail_noir: ['#34363C', 'pant'], marine: ['#1E2A44', 'pant'], chino: ['#CDB391', 'pant'], jean: ['#4F77A8', 'pant', 1] };
const SHOES = { ville: ['#6B3A22', '#2A1710', 1], escarpins: ['#23262D', '#000000', 1], ballerines: ['#C4816F', '#3A2A1C', 1], secu: ['#B07A45', '#3A2A1C', 1], cuir: ['#6B3A22', '#2A1710'], baskets: ['#FFFFFF', '#AEB7C4', 1], noires: ['#23262D', '#000000'] };
const BANDE = '#E4E8ED', ORANGE = '#F26A1B', ORANGE2 = '#C9520E', MARINE = '#1E2A44', ENCRE = '#1B1530';
const hex = (v, def) => typeof v === 'string' && /^#[0-9a-f]{6}$/i.test(v) ? v : (TEINTES[v] || def);
const mix = (a, b, k) => { const A = new THREE.Color(a), B = new THREE.Color(b); return '#' + A.lerp(B, k).getHexString(); };
/** les couleurs et options d'une figurine, depuis le cfg de l'avatar */
export function couleurs(cfg) {
  const c = cfg || {}; const T = TOPS[c.haut] || TOPS.hv, B = BAS[c.bas] || BAS.travail, S = SHOES[c.chaussures] || SHOES.secu;
  const casque = c.casque === true || c.casque === 'true'; const coiffe = !casque && (c.coiffe === 'casquette' || c.coiffe === 'bonnet') ? c.coiffe : null;
  return {
    neutre: !cfg, skin: SKIN[c.peau] || SKIN.p2, hair: HAIR[c.couleur] || HAIR.brun, top: T[3] && c.hautCouleur ? hex(c.hautCouleur, T[0]) : T[0], court: T[1] === 's', habit: T[2], pant: B[2] && c.basCouleur ? hex(c.basCouleur, B[0]) : B[0], bas: B[1],
    shoe: S[2] && c.chaussuresCouleur ? hex(c.chaussuresCouleur, S[0]) : S[0], sole: S[1], casque, coiffe, cheveux: c.cheveux || 'court', barbe: c.barbe || 'aucune', lunettes: c.lunettes || 'aucune', femme: c.genre === 'femme',
    gants: c.gants === 'travail' ? '#C9A46A' : c.gants === 'soudeur' ? '#B9B2A4' : null
  };
}
/* ── fabrique : chaque pièce = géométrie + couleur + placement, puis tout est fusionné ── */
const V3 = (x, y, z) => new THREE.Vector3(x, y, z);
/* géométries de base gardées en cache (indexées, sans uv) : une figurine ne fait que les copier et les placer */
const GC = new Map(); const R3 = v => Math.round(v * 1000);
function cg(key, make) { let g = GC.get(key); if (g) return g; g = make(); g.deleteAttribute('uv'); if (!g.index) { const gi = mergeVertices(g); g.dispose(); g = gi; } GC.set(key, g); return g; }
function maker() {
  const P = [];
  const put = (geo, col, pos, rot, scl) => { const m = new THREE.Matrix4().compose(V3(...pos), new THREE.Quaternion().setFromEuler(new THREE.Euler(...(rot || [0, 0, 0]))), V3(...(scl || [1, 1, 1]))); P.push({ geo, col, m }); };
  return {
    P,
    ball: (c, r, col, scl, seg) => put(cg('s|' + R3(r) + '|' + (seg || 18), () => new THREE.SphereGeometry(r, seg || 18, Math.max(8, Math.round((seg || 18) * 0.66)))), col, c, null, scl),
    rb: (c, w, h, d, r, col, rot) => put(cg('b|' + [w, h, d, r].map(R3).join('|'), () => new RoundedBoxGeometry(w, h, d, 2, Math.min(r, w / 2 - 0.001, h / 2 - 0.001, d / 2 - 0.001))), col, c, rot),
    cyl: (c, rt, rbt, h, col, rot, seg) => put(cg('c|' + [rt, rbt, h].map(R3).join('|') + '|' + (seg || 16), () => new THREE.CylinderGeometry(rt, rbt, h, seg || 16)), col, c, rot),
    shell: (c, r, phiS, phiL, thS, thL, col, rot, scl) => put(cg('h|' + [r, phiS, phiL, thS, thL].map(R3).join('|'), () => new THREE.SphereGeometry(r, 22, 14, phiS, phiL, thS, thL)), col, c, rot, scl),
    torus: (c, r, tube, arc, col, rot, rs, ts) => put(cg('t|' + [r, tube, arc].map(R3).join('|') + '|' + (rs || 6) + '|' + (ts || 18), () => new THREE.TorusGeometry(r, tube, rs || 6, ts || 18, arc)), col, c, rot),
    limb: (a, b, r, col) => { const A = V3(...a), B = V3(...b); const d = B.clone().sub(A); const len = d.length(); const q = new THREE.Quaternion().setFromUnitVectors(V3(0, 1, 0), d.normalize()); const m = new THREE.Matrix4().compose(A.clone().add(B).multiplyScalar(0.5), q, V3(1, 1, 1)); P.push({ geo: cg('k|' + R3(r) + '|' + R3(Math.max(0.001, len)), () => new THREE.CapsuleGeometry(r, Math.max(0.001, len), 4, 12)), col, m }); }
  };
}
function fuse(P) {
  const list = P.map(({ geo, col, m }) => { const g = geo.clone(); g.applyMatrix4(m); const n = g.attributes.position.count; const cc = new THREE.Color(col); const arr = new Float32Array(n * 3); for (let i = 0; i < n; i++) { arr[i * 3] = cc.r; arr[i * 3 + 1] = cc.g; arr[i * 3 + 2] = cc.b; } g.setAttribute('color', new THREE.BufferAttribute(arr, 3)); return g; });
  const out = mergeGeometries(list, false); list.forEach(g => g.dispose()); out.computeBoundingSphere(); out.computeBoundingBox(); return out;
}
/* ── la tête (centre H) ── */
function tete(M, K, H) {
  const [hx, hy, hz] = H; const r = 0.155; const at = (x, y, z) => [hx + x, hy + y, hz + z];
  const skin = K.skin, dark = mix(skin, '#5E3A26', 0.22);
  M.ball(at(0, 0, 0), r, skin, [1, 1.04, 0.97], 22);
  [-1, 1].forEach(s => M.ball(at(s * 0.148, -0.005, -0.005), 0.034, skin, [0.55, 1, 0.8], 10));
  // visage : yeux (avec reflet), sourcils, nez, sourire
  [-1, 1].forEach(s => { M.ball(at(s * 0.054, 0.012, 0.142), 0.02, ENCRE, [1, 1.25, 0.6], 10); M.ball(at(s * 0.054 + 0.006, 0.022, 0.151), 0.0055, '#FFFFFF', null, 6); });
  if (!K.casque) [-1, 1].forEach(s => M.rb(at(s * 0.056, 0.06, 0.141), 0.046, 0.012, 0.014, 0.006, K.cheveux === 'chauve' ? dark : K.hair, [0.12, 0, s * 0.06]));
  M.ball(at(0, -0.018, 0.152), 0.021, dark, [1, 0.9, 0.9], 10);
  const bz = K.barbe === 'courte' || K.barbe === 'longue' ? 0.164 : K.barbe === '3j' ? 0.153 : 0.147;
  M.torus(at(0, -0.058, bz - 0.006), 0.026, 0.0062, Math.PI, '#5A2620', [0.3, 0, Math.PI], 6, 14);
  // barbe
  const lowFace = (rr, col) => M.shell(at(0, 0, 0.002), rr, Math.PI / 2 - 1.25, 2.5, 1.72, 0.92, col);
  if (K.barbe === '3j') lowFace(r * 1.012, mix(skin, K.hair, 0.42));
  else if (K.barbe === 'courte') lowFace(r * 1.07, K.hair);
  else if (K.barbe === 'longue') { lowFace(r * 1.07, K.hair); M.ball(at(0, -0.135, 0.085), 0.085, K.hair, [1, 1.25, 0.75], 14); }
  else if (K.barbe === 'bouc') M.ball(at(0, -0.118, 0.118), 0.038, K.hair, [1, 1.25, 0.8], 10);
  if (K.barbe === 'moustache' || K.barbe === 'longue' || K.barbe === 'courte') M.limb(at(-0.042, -0.04, 0.153 + (K.barbe === 'moustache' ? 0 : 0.008)), at(0.042, -0.04, 0.153 + (K.barbe === 'moustache' ? 0 : 0.008)), 0.013, K.hair);
  // lunettes
  if (K.lunettes && K.lunettes !== 'aucune') {
    const fr = K.lunettes === 'soleil' ? ENCRE : '#2B2A33'; const z = 0.162;
    [-1, 1].forEach(s => {
      if (K.lunettes === 'rect') M.torus(at(s * 0.056, 0.012, z), 0.034, 0.006, Math.PI * 2, fr, [0, 0, Math.PI / 4], 4, 4);
      else M.torus(at(s * 0.056, 0.012, z), 0.034, 0.0062, Math.PI * 2, fr, null, 6, 20);
      if (K.lunettes === 'soleil') M.cyl(at(s * 0.056, 0.012, z - 0.002), 0.031, 0.031, 0.006, '#2A2E36', [Math.PI / 2, 0, 0], 16);
      M.limb(at(s * 0.09, 0.016, z - 0.004), at(s * 0.152, 0.02, 0.02), 0.005, fr);
    });
    M.limb(at(-0.022, 0.018, z + 0.002), at(0.022, 0.018, z + 0.002), 0.005, fr);
  }
  // cheveux (sous un casque ou une coiffe : seulement la nuque)
  const hr = K.hair, cap = (rr, thL, tilt) => M.shell(at(0, 0.004, 0), rr, 0, Math.PI * 2, 0, thL, hr, [tilt, 0, 0]);
  const couvert = K.casque || K.coiffe; const ch = K.cheveux;
  if (ch !== 'chauve') {
    if (couvert) M.shell(at(0, 0, 0), r * 1.05, 0, Math.PI * 2, 1.15, 0.55, hr, [-0.55, 0, 0]);
    else if (ch === 'degarni') M.shell(at(0, 0, 0), r * 1.05, 0, Math.PI * 2, 0.78, 0.82, hr, [-0.62, 0, 0]);
    else if (ch === 'brosse') cap(r * 1.045, 1.18, -0.42);
    else {
      cap(r * 1.075, ch === 'long' || ch === 'milong' || ch === 'queue' || ch === 'chignon' ? 1.42 : 1.36, -0.46);
      if (ch === 'meche') M.ball(at(0.035, 0.125, 0.075), 0.075, hr, [1.55, 0.5, 0.95], 14);
      if (ch === 'boucle') for (let i = 0; i < 14; i++) { const a = i / 14 * Math.PI * 2; const t = 0.55 + (i % 3) * 0.28; M.ball(at(Math.cos(a) * Math.sin(t) * r * 1.02, Math.cos(t) * r * 1.02 + 0.012, Math.sin(a) * Math.sin(t) * r * 1.02 - 0.03), 0.046, hr, null, 10); }
      if (ch === 'milong' || ch === 'long') M.shell(at(0, 0.004, -0.004), r * 1.1, Math.PI / 2 + 0.95, Math.PI * 2 - 1.9, 0.55, ch === 'long' ? 1.95 : 1.62, hr);
      if (ch === 'long') M.rb(at(0, -0.24, -0.1), 0.3, 0.32, 0.08, 0.035, hr, [0.18, 0, 0]);
      if (ch === 'chignon') M.ball(at(0, 0.13, -0.115), 0.072, hr, null, 14);
      if (ch === 'queue') { M.ball(at(0, 0.075, -0.15), 0.048, hr, null, 10); M.limb(at(0, 0.06, -0.17), at(0, -0.2, -0.2), 0.04, hr); }
    }
  }
  // casque de chantier (orange SCR) / casquette / bonnet
  if (K.casque) { M.shell(at(0, 0.012, 0), r * 1.17, 0, Math.PI * 2, 0, Math.PI / 2 + 0.05, ORANGE); M.rb(at(0, 0.03, 0.17), 0.24, 0.022, 0.1, 0.01, '#D9570F', [0.12, 0, 0]); M.torus(at(0, 0.012, 0), r * 1.17, 0.016, Math.PI, '#FF8D48', [0, Math.PI / 2, 0], 6, 22); M.torus(at(0, 0.02, 0), r * 1.17, 0.012, Math.PI * 2, '#D9570F', [Math.PI / 2, 0, 0], 6, 28); }
  else if (K.coiffe === 'casquette') { M.shell(at(0, 0.02, 0), r * 1.1, 0, Math.PI * 2, 0, 1.4, MARINE, [-0.12, 0, 0]); M.rb(at(0, 0.075, 0.175), 0.22, 0.02, 0.15, 0.01, '#121A2E', [0.18, 0, 0]); M.ball(at(0, 0.172, 0.01), 0.016, MARINE, null, 8); }
  else if (K.coiffe === 'bonnet') { M.shell(at(0, 0.03, 0), r * 1.12, 0, Math.PI * 2, 0, 1.5, '#3A404B', [-0.1, 0, 0]); M.torus(at(0, 0.02, -0.01), r * 1.1, 0.03, Math.PI * 2, '#2A2E36', [Math.PI / 2 - 0.1, 0, 0], 8, 26); M.ball(at(0, 0.2, -0.03), 0.04, ORANGE, null, 10); }
}
/* ── le corps : pose debout ou assise ; bras le long du corps, mains sur les genoux, ou sur le clavier ── */
function corps(M, K, pose, bras) {
  const assis = pose === 'assis'; const top = K.top, pant = K.pant, skin = K.skin; const hand = K.gants || skin;
  const sh = K.femme ? 0.195 : 0.215; const tw = K.femme ? 0.34 : 0.38;
  const yT = assis ? 0.81 : 1.15, zT = assis ? -0.03 : 0; const lean = assis ? -0.06 : 0;
  // jambes + chaussures
  const legR = 0.066; const legTop = K.bas === 'short' ? pant : pant; const shin = K.bas === 'short' || K.bas === 'jupe' ? skin : pant;
  [-1, 1].forEach(s => {
    const x = s * 0.1;
    if (assis) { M.limb([x, 0.5, 0.0], [x, 0.5, 0.42], legR + 0.004, legTop); M.limb([x, 0.5, 0.42], [x, 0.11, 0.46], legR, shin); M.rb([x, 0.045, 0.52], 0.12, 0.085, 0.25, 0.035, K.shoe); M.rb([x, 0.013, 0.52], 0.125, 0.026, 0.255, 0.01, K.sole); }
    else { M.limb([x, 0.84, 0], [x, 0.46, 0.005], legR + 0.004, legTop); M.limb([x, 0.46, 0.005], [x, 0.11, 0.01], legR, shin); M.rb([x, 0.045, 0.045], 0.12, 0.085, 0.25, 0.035, K.shoe); M.rb([x, 0.013, 0.045], 0.125, 0.026, 0.255, 0.01, K.sole); }
  });
  if (K.bas === 'jupe') { if (assis) M.rb([0, 0.53, 0.14], 0.34, 0.12, 0.42, 0.05, pant); else M.cyl([0, 0.72, 0], 0.14, 0.23, 0.34, pant); }
  // bassin + buste
  M.rb([0, assis ? 0.55 : 0.88, assis ? -0.02 : 0], 0.32, 0.18, 0.22, 0.075, pant);
  M.rb([0, yT, zT], tw, 0.5, 0.235, 0.095, top, [lean, 0, 0]);
  const band = (y, w) => M.rb([0, y, zT + (assis ? (y - yT) * -0.06 : 0)], (w || tw) + 0.012, 0.035, 0.248, 0.016, BANDE, [lean, 0, 0]);
  if (K.habit === 'hv' || K.habit === 'bandes') { band(yT - 0.14); band(yT + 0.06); }
  if (K.habit === 'hvbi') { M.rb([0, yT - 0.16, zT], tw + 0.008, 0.18, 0.243, 0.06, MARINE, [lean, 0, 0]); band(yT - 0.05); band(yT + 0.1); }
  if (K.habit === 'gilet') { [-1, 1].forEach(s => M.rb([s * 0.07, yT, zT + 0.118], 0.035, 0.46, 0.012, 0.006, ORANGE2, [lean, 0, 0])); band(yT - 0.12); band(yT + 0.08); }
  if (K.habit === 'chasuble') { M.rb([0, yT + 0.04, zT], tw + 0.02, 0.4, 0.252, 0.08, ORANGE, [lean, 0, 0]); band(yT - 0.08, tw + 0.02); band(yT + 0.1, tw + 0.02); }
  if (K.habit === 'soudeur') M.rb([0, yT + 0.2, zT + 0.02], tw * 0.62, 0.1, 0.24, 0.04, '#9C7A4E', [lean, 0, 0]);
  if (K.habit === 'blazer') [-1, 1].forEach(s => M.rb([s * 0.06, yT + 0.12, zT + 0.115], 0.07, 0.2, 0.014, 0.006, mix(top, '#000000', 0.3), [lean, 0, s * 0.35]));
  if (K.habit === 'col') [-1, 1].forEach(s => M.rb([s * 0.05, yT + 0.235, zT + 0.075], 0.075, 0.03, 0.08, 0.012, mix(top, '#FFFFFF', 0.25), [0.3, 0, s * -0.4]));
  if (K.habit === 'capuche') M.ball([0, yT + 0.23, zT - 0.09], 0.13, top, [1.25, 0.55, 0.85], 14);
  // cou
  M.cyl([0, yT + 0.285, zT + 0.005], 0.05, 0.056, 0.09, skin, null, 12);
  // bras
  const shY = yT + 0.2;
  const arm = (s, el, wr) => { const S = [s * sh, shY, zT]; const sleeve2 = K.court ? skin : top; M.ball(S, 0.064, top, null, 12); M.limb(S, el, 0.056, top); M.limb(el, wr, 0.05, sleeve2); M.ball(wr, 0.056, hand, [1, 1.05, 1.15], 12); if (K.court) M.limb(S, [S[0] + (el[0] - S[0]) * 0.55, S[1] + (el[1] - S[1]) * 0.55, S[2] + (el[2] - S[2]) * 0.55], 0.062, top); if (K.habit === 'hv' || K.habit === 'hvbi') M.limb([el[0] + (wr[0] - el[0]) * 0.35, el[1] + (wr[1] - el[1]) * 0.35, el[2] + (wr[2] - el[2]) * 0.35], [el[0] + (wr[0] - el[0]) * 0.45, el[1] + (wr[1] - el[1]) * 0.45, el[2] + (wr[2] - el[2]) * 0.45], 0.054, BANDE); };
  [-1, 1].forEach(s => {
    if (!assis) arm(s, [s * (sh + 0.035), shY - 0.25, 0.02], [s * (sh + 0.03), shY - 0.48, 0.05]);
    else if (bras === 'clavier') arm(s, [s * (sh + 0.03), shY - 0.25, zT + 0.1], [s * 0.15, shY - 0.23, zT + 0.45]);
    else arm(s, [s * (sh + 0.035), shY - 0.24, zT + 0.08], [s * 0.14, 0.62, 0.3]);
  });
  return [0, yT + 0.49, zT - 0.005];
}
/* ── API ── */
const CACHE = new Map(); const TETE = 1.15;
const MAT = () => cachedMat('perso:vc', () => new THREE.MeshStandardMaterial({ vertexColors: true, roughness: 0.66, metalness: 0, side: THREE.DoubleSide }));
const SHADOW = () => cachedMat('perso:ombre', () => new THREE.MeshBasicMaterial({ color: 0x1B1530, transparent: true, opacity: 0.16, depthWrite: false }));
let SHADOW_GEO = null;
/**
 * figurine(cfg, {pose:'debout'|'assis', bras:'genoux'|'clavier', ombre:true}) → THREE.Group (pieds en 0,0,0, regard vers +z).
 * cfg = config de l'avatar du kit (avatarConfig) ; null → silhouette neutre.
 */
export function figurine(cfg, o) {
  o = o || {}; const pose = o.pose === 'assis' ? 'assis' : 'debout'; const bras = o.bras || (pose === 'assis' ? 'genoux' : 'bas');
  const key = JSON.stringify([cfg || null, pose, bras]); let geo = CACHE.get(key);
  if (!geo) {
    const K = couleurs(cfg); if (K.neutre) { K.top = '#8E87A6'; K.pant = '#57526B'; K.cheveux = 'court'; K.barbe = 'aucune'; }
    const M = maker(); const H = corps(M, K, pose, bras);
    const MT = maker(); tete(MT, K, [0, 0, 0]); const S = new THREE.Matrix4().compose(V3(...H), new THREE.Quaternion(), V3(TETE, TETE, TETE)); MT.P.forEach(p => { p.m = S.clone().multiply(p.m); M.P.push(p); }); /* tête un peu plus grosse : allure « figurine » */
    geo = fuse(M.P); CACHE.set(key, geo); if (CACHE.size > 400) CACHE.delete(CACHE.keys().next().value);
  }
  const g = new THREE.Group(); const m = new THREE.Mesh(geo, MAT()); m.castShadow = true; m.receiveShadow = true; g.add(m);
  if (o.ombre !== false && pose === 'debout') { if (!SHADOW_GEO) SHADOW_GEO = new THREE.CircleGeometry(0.3, 20); const s = new THREE.Mesh(SHADOW_GEO, SHADOW()); s.rotation.x = -Math.PI / 2; s.position.y = 0.012; g.add(s); }
  g.userData.figurine = true; return g;
}
