// monde3d/pose.js — la « physique » de la pose des objets (personnalisation de son bureau) — 19/11/2026.
// Ethan : « un meuble que je ne peux pas coller au mur alors qu'il y a la place » ; « des fois c'est rouge et ça ne veut pas ».
// Principe : chaque objet a une EMPREINTE (un rectangle tourné comme lui) et une HAUTEUR ; les obstacles sont les parties pleines des autres
// objets et des éléments fixes (plateau, pieds, planches d'une étagère…), chacune avec son empreinte et ses hauteurs basse / haute.
//  · contre un bord (mur, bord du bureau, bord d'une planche) l'objet s'arrête et glisse : il ne dépasse jamais, il n'est donc plus refusé pour ça ;
//  · deux objets ne se gênent que s'ils se chevauchent vu de dessus ET en hauteur : une corbeille passe sous le plateau, un objet trop haut bute sous la planche du dessus ;
//  · un objet qui chevauche un obstacle est poussé juste à côté (le plus court chemin qui reste dans la pièce) ; s'il n'y a vraiment pas la place : rouge.
// Aucune dépendance : on ne lit des objets 3D que leurs matrices et la boîte de leur géométrie (le module se teste dans Node avec de faux objets).

export const TOL = 0.004;  /* deux empreintes qui se touchent (à 4 mm près) ne se chevauchent pas */
export const YTOL = 0.004; /* idem en hauteur : posé SUR une planche n'est pas DANS la planche */

/** boîte d'un polygone [[x, z]…] */
export function aabb(poly) { let x0 = Infinity, x1 = -Infinity, z0 = Infinity, z1 = -Infinity; for (const p of poly) { if (p[0] < x0) x0 = p[0]; if (p[0] > x1) x1 = p[0]; if (p[1] < z0) z0 = p[1]; if (p[1] > z1) z1 = p[1]; } return { x0, x1, z0, z1 }; }

/** enveloppe convexe (chaîne monotone) d'un nuage de points [x, z] ; un nuage plat (une plaque vue par la tranche) devient un fin rectangle */
export function hull(pts) {
  const P = pts.slice().sort((a, b) => a[0] - b[0] || a[1] - b[1]).filter((p, i, L) => !i || Math.abs(p[0] - L[i - 1][0]) > 1e-7 || Math.abs(p[1] - L[i - 1][1]) > 1e-7);
  const cr = (o, a, b) => (a[0] - o[0]) * (b[1] - o[1]) - (a[1] - o[1]) * (b[0] - o[0]); const lo = [], up = [];
  for (const p of P) { while (lo.length >= 2 && cr(lo[lo.length - 2], lo[lo.length - 1], p) <= 1e-12) lo.pop(); lo.push(p); }
  for (let i = P.length - 1; i >= 0; i--) { const p = P[i]; while (up.length >= 2 && cr(up[up.length - 2], up[up.length - 1], p) <= 1e-12) up.pop(); up.push(p); }
  const H = lo.slice(0, -1).concat(up.slice(0, -1));
  if (H.length >= 3) return H;
  const b = aabb(P.length ? P : [[0, 0]]), e = 0.002; return [[b.x0 - e, b.z0 - e], [b.x1 + e, b.z0 - e], [b.x1 + e, b.z1 + e], [b.x0 - e, b.z1 + e]];
}

/** le rectangle local b = { x0, x1, z0, z1 }, à l'échelle s, tourné de ang autour de la verticale (convention three.js : rotation.y), posé en (cx, cz) */
export function rectPoly(cx, cz, b, ang, s) { const c = Math.cos(ang || 0), n = Math.sin(ang || 0), k = s == null ? 1 : s; return [[b.x0, b.z0], [b.x1, b.z0], [b.x1, b.z1], [b.x0, b.z1]].map(([x, z]) => [cx + k * (x * c + z * n), cz + k * (-x * n + z * c)]); }

/** de combien déplacer le polygone pour qu'il tienne dans le rectangle B (bords de la surface) ; fit = false s'il est plus grand qu'elle */
export function clampInto(poly, B) {
  const a = aabb(poly); let dx = 0, dz = 0, fit = true;
  if (a.x1 - a.x0 > B.x1 - B.x0 + 1e-6) { fit = false; dx = (B.x0 + B.x1) / 2 - (a.x0 + a.x1) / 2; } else if (a.x0 < B.x0) dx = B.x0 - a.x0; else if (a.x1 > B.x1) dx = B.x1 - a.x1;
  if (a.z1 - a.z0 > B.z1 - B.z0 + 1e-6) { fit = false; dz = (B.z0 + B.z1) / 2 - (a.z0 + a.z1) / 2; } else if (a.z0 < B.z0) dz = B.z0 - a.z0; else if (a.z1 > B.z1) dz = B.z1 - a.z1;
  return { dx, dz, fit };
}

/** aimant : à moins de d d'un bord, l'objet vient s'y coller */
export function snapInto(poly, B, d) { const a = aabb(poly); let dx = 0, dz = 0; if (a.x0 - B.x0 > 0 && a.x0 - B.x0 < d) dx = B.x0 - a.x0; else if (B.x1 - a.x1 > 0 && B.x1 - a.x1 < d) dx = B.x1 - a.x1; if (a.z0 - B.z0 > 0 && a.z0 - B.z0 < d) dz = B.z0 - a.z0; else if (B.z1 - a.z1 > 0 && B.z1 - a.z1 < d) dz = B.z1 - a.z1; return { dx, dz }; }

/** deux polygones convexes : null s'ils sont séparés (ou au contact), sinon les déplacements de A qui les séparent, du plus court au plus long */
export function sep(A, B, tol) {
  const t = tol == null ? TOL : tol; const out = [];
  for (const P of [A, B]) for (let i = 0; i < P.length; i++) {
    const p = P[i], q = P[(i + 1) % P.length]; let nx = q[1] - p[1], nz = p[0] - q[0]; const L = Math.hypot(nx, nz); if (L < 1e-9) continue; nx /= L; nz /= L;
    let a0 = Infinity, a1 = -Infinity, b0 = Infinity, b1 = -Infinity;
    for (const v of A) { const d = v[0] * nx + v[1] * nz; if (d < a0) a0 = d; if (d > a1) a1 = d; }
    for (const v of B) { const d = v[0] * nx + v[1] * nz; if (d < b0) b0 = d; if (d > b1) b1 = d; }
    const o1 = a1 - b0, o2 = b1 - a0; if (o1 <= t || o2 <= t) return null; /* un axe les sépare */
    out.push({ x: -nx * o1, z: -nz * o1, depth: o1 }, { x: nx * o2, z: nz * o2, depth: o2 });
  }
  out.sort((u, v) => u.depth - v.depth); return out.length ? out : null;
}
export const overlap = (A, B, tol) => !!sep(A, B, tol);

const yHit = (y0, y1, ob) => y1 > ob.y0 + YTOL && y0 < ob.y1 - YTOL;
const bbHit = (a, b) => !(a.x1 <= b.x0 + TOL || a.x0 >= b.x1 - TOL || a.z1 <= b.z0 + TOL || a.z0 >= b.z1 - TOL);

/** le premier obstacle que l'objet (empreinte + hauteurs y0…y1) chevauche, ou null */
export function hits(poly, y0, y1, obs) { const bb = aabb(poly); for (const ob of obs) { if (yHit(y0, y1, ob) && bbHit(bb, ob.bb) && sep(poly, ob.poly)) return ob; } return null; }

/**
 * pousse l'objet hors des obstacles qu'il chevauche : { dx, dz, free }. o.max = déplacement total accepté (au-delà : pas la place ici) ;
 * o.bounds = { x0, x1, z0, z1 } : parmi les sorties possibles, on préfère celle qui reste dans la surface (on ne pousse pas un meuble dans le mur).
 * o.keep = ce que vaut, en mètres de détour, le fait de rester collé au bord que l'on touche (0,45 par défaut).
 */
export function resolve(poly, y0, y1, obs, o) {
  o = o || {}; const max = o.max == null ? 0.6 : o.max, B = o.bounds || null; let dx = 0, dz = 0;
  const inB = P => { if (!B) return true; const a = aabb(P); return a.x0 >= B.x0 - 1e-4 && a.x1 <= B.x1 + 1e-4 && a.z0 >= B.z0 - 1e-4 && a.z1 <= B.z1 + 1e-4; };
  const touch = a => B ? [Math.abs(a.x0 - B.x0) < 0.003, Math.abs(a.x1 - B.x1) < 0.003, Math.abs(a.z0 - B.z0) < 0.003, Math.abs(a.z1 - B.z1) < 0.003] : [];
  for (let k = 0; k < (o.iter || 12); k++) {
    const P = poly.map(p => [p[0] + dx, p[1] + dz]); const bb = aabb(P); let worst = null;
    for (const ob of obs) { if (!yHit(y0, y1, ob) || !bbHit(bb, ob.bb)) continue; const c = sep(P, ob.poly); if (c && (!worst || c[0].depth > worst[0].depth)) worst = c; }
    if (!worst) return { dx, dz, free: true };
    /* la sortie retenue : dans la surface, la plus courte — mais rester collé au bord où l'on est (longer le mur) vaut un détour de o.keep (45 cm) : un meuble lâché à cheval sur son voisin glisse À CÔTÉ de lui le long du mur, il ne passe pas devant */
    const t0 = touch(bb); let pick = null, best = Infinity; for (const c of worst) { const Q = P.map(p => [p[0] + c.x, p[1] + c.z]); if (!inB(Q)) continue; const t1 = touch(aabb(Q)); const cost = c.depth - (t0.some((v, i) => v && t1[i]) ? (o.keep == null ? 0.45 : o.keep) : 0); if (cost < best) { best = cost; pick = c; } } if (!pick) pick = worst[0];
    dx += pick.x; dz += pick.z; if (Math.hypot(dx, dz) > max) return { dx: 0, dz: 0, free: false };
  }
  return { dx: 0, dz: 0, free: false };
}

const m4 = (e, x, y, z) => [e[0] * x + e[4] * y + e[8] * z + e[12], e[1] * x + e[5] * y + e[9] * z + e[13], e[2] * x + e[6] * y + e[10] * z + e[14]];
const mul = (a, b) => { const o = new Array(16); for (let c = 0; c < 4; c++) for (let r = 0; r < 4; r++) o[c * 4 + r] = a[r] * b[c * 4] + a[4 + r] * b[c * 4 + 1] + a[8 + r] * b[c * 4 + 2] + a[12 + r] * b[c * 4 + 3]; return o; };
export const PART_MAX = 4000; /* au-delà de ce nombre de sommets, un maillage est pris par les 8 coins de sa boîte */
/**
 * les parties pleines d'un objet 3D : une par maillage visible, [{ poly, bb, y0, y1 }], dans le repère dont `inv` est la matrice inverse (16 nombres, ou null = monde).
 * stop(nœud) = ne pas descendre dedans (un objet posé sur l'étagère d'un rangement est un autre objet). Les matrices « monde » doivent être à jour.
 * L'empreinte et les hauteurs viennent des SOMMETS du maillage (un ballon tourné reste un rond de 22 cm — par les coins de sa boîte il en ferait 37) ;
 * sans sommets lisibles (ou trop nombreux) : les 8 coins de la boîte de la géométrie.
 */
export function partsOf(root, inv, stop) {
  const out = []; const walk = n => {
    if (n !== root && stop && stop(n)) return; if (n.visible === false) return;
    if (n.isMesh && n.geometry && !(n.material && n.material.visible === false) && !(n.userData && n.userData.noSolid)) {
      const g = n.geometry; const e = inv ? mul(inv, n.matrixWorld.elements) : n.matrixWorld.elements; const pts = []; let y0 = Infinity, y1 = -Infinity;
      const put = (x, y, z) => { const p = m4(e, x, y, z); pts.push([p[0], p[2]]); if (p[1] < y0) y0 = p[1]; if (p[1] > y1) y1 = p[1]; };
      const pos = g.attributes && g.attributes.position;
      if (pos && pos.count > 0 && pos.count <= PART_MAX && typeof pos.getX === 'function') { for (let i = 0; i < pos.count; i++) put(pos.getX(i), pos.getY(i), pos.getZ(i)); }
      else { if (!g.boundingBox && g.computeBoundingBox) g.computeBoundingBox(); const b = g.boundingBox; if (b && isFinite(b.min.x) && isFinite(b.max.x)) for (const x of [b.min.x, b.max.x]) for (const y of [b.min.y, b.max.y]) for (const z of [b.min.z, b.max.z]) put(x, y, z); }
      if (pts.length && isFinite(y0)) { const poly = hull(pts); out.push({ poly, bb: aabb(poly), y0, y1 }); }
    }
    (n.children || []).forEach(walk);
  }; walk(root); return out;
}
/** la boîte qui englobe des parties : { x0, x1, z0, z1, y0, y1 } (null si aucune) */
export function boxOf(parts) { if (!parts || !parts.length) return null; const b = { x0: Infinity, x1: -Infinity, z0: Infinity, z1: -Infinity, y0: Infinity, y1: -Infinity }; parts.forEach(p => { b.x0 = Math.min(b.x0, p.bb.x0); b.x1 = Math.max(b.x1, p.bb.x1); b.z0 = Math.min(b.z0, p.bb.z0); b.z1 = Math.max(b.z1, p.bb.z1); b.y0 = Math.min(b.y0, p.y0); b.y1 = Math.max(b.y1, p.y1); }); return b; }
