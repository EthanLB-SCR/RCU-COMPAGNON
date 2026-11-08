// monde3d/chantiers.js — PILOTAGE : un diorama par chantier du secteur (tranchée, tubes posés à hauteur de l'avancement, pelle au front, base vie, équipe du jour, alertes).
//                         CHANTIER : le vrai réseau en 3D (éléments du plan), soudures par état, sous-stations raccordées, chaufferie, pelle au front, base vie + les sujets de la checklist.
import { THREE, PAL, mat, rbox, box, cyl, sph, plane, grp, add, figure, pickable, label } from './core.js';
import { figurine } from './perso.js';
import { building, boilerHouse, container, excavator, pipeStack, cone, barrier, fence, skip, tree, bush, worker, van, trenchSegment } from './props2.js';
const C = PAL;
const SEVC = { bad: 'bad', warn: 'warn', or: 'warn', info: 'soft', ok: 'ok' };
/* ═══ PILOTAGE : dioramas ═══ */
export function buildDioramas(chantiers, o) {
  o = o || {}; const g = grp(); const n = chantiers.length; const cols = Math.min(4, Math.max(1, Math.ceil(Math.sqrt(n || 1)))); const TW = 24, TD = 18, GAP = 6; const W = cols * (TW + GAP), rows = Math.ceil(Math.max(1, n) / cols), Dd = rows * (TD + GAP);
  g.add(plane(W + 300, Dd + 300, 0xDDE6D2, { y: -0.45 }));
  const centers = {};
  chantiers.forEach((c, i) => { const cx = -W / 2 + (TW + GAP) * (i % cols) + TW / 2, cz = -Dd / 2 + (TD + GAP) * Math.floor(i / cols) + TD / 2; centers[c.id] = [cx, cz];
    const t = grp(cx, 0, cz); const pct = Math.max(0, Math.min(1, (c.pct || 0) / 100));
    t.add(rbox(TW, 0.4, TD, C.herbe, { r: 0.5, y: -0.4 }), rbox(TW + 0.6, 0.12, TD + 0.6, 0xC9CDBE, { r: 0.3, y: -0.52, shadow: false }));
    // la tranchée traverse le plateau en S léger : 3 segments
    const path = [[-TW / 2 + 2, 3.5], [-4, 3.5], [-2, -1.5], [TW / 2 - 6, -1.5], [TW / 2 - 6, -TD / 2 + 2]]; let total = 0; const segs = []; for (let k = 0; k < path.length - 1; k++) { const a = path[k], b = path[k + 1]; const L = Math.hypot(b[0] - a[0], b[1] - a[1]); segs.push({ a, b, L, s0: total }); total += L; }
    const doneL = total * pct; let frontier = null;
    segs.forEach(s => { const ang = Math.atan2(s.b[1] - s.a[1], s.b[0] - s.a[0]); const mx = (s.a[0] + s.b[0]) / 2, mz = (s.a[1] + s.b[1]) / 2; const dl = Math.max(0, Math.min(s.L, doneL - s.s0)); // longueur posée dans ce segment
      // tranchée ouverte sur la partie non posée, remblai sur la partie posée
      if (dl < s.L) { const ux = Math.cos(ang), uz = Math.sin(ang); const l2 = s.L - dl; const cx2 = s.a[0] + ux * (dl + l2 / 2), cz2 = s.a[1] + uz * (dl + l2 / 2); const tr = trenchSegment(l2, 1.6); tr.position.set(cx2, 0, cz2); tr.rotation.y = -ang; t.add(tr); [[-0.3, C.aller], [0.3, C.retour]].forEach(([off, col]) => { const p = cyl(0.17, 0.17, l2, 0xB9B3CC, { seg: 10, op: 0.5 }); p.rotation.z = Math.PI / 2; const gp = grp(cx2, -0.25, cz2, -ang); p.position.z = off; gp.add(p); t.add(gp); }); }
      if (dl > 0) { const ux = Math.cos(ang), uz = Math.sin(ang); const cx1 = s.a[0] + ux * dl / 2, cz1 = s.a[1] + uz * dl / 2; const fill = box(dl, 0.12, 1.7, 0xA89A86, { y: -0.1, shadow: false }); const gf = grp(cx1, 0, cz1, -ang); gf.add(fill); [[-0.3, C.aller], [0.3, C.retour]].forEach(([off, col]) => { const p = cyl(0.17, 0.17, dl, col, { seg: 10 }); p.rotation.z = Math.PI / 2; p.position.set(0, 0.12, off); gf.add(p); }); t.add(gf); if (dl < s.L || s === segs[segs.length - 1]) frontier = { x: s.a[0] + ux * dl, z: s.a[1] + uz * dl, ang }; }
      if (dl <= 0 && !frontier) frontier = { x: s.a[0], z: s.a[1], ang }; });
    // pelle au front + équipe du jour + cônes
    if (pct < 1 && frontier) { const ex = excavator(C.jaune, { rot: -0.6 }); ex.scale.setScalar(0.75); ex.position.set(frontier.x + Math.cos(frontier.ang) * 2.2 + 1.5, 0, frontier.z + Math.sin(frontier.ang) * 2.2 - 2.2); ex.rotation.y = -frontier.ang + 0.4; t.add(ex); [[1.2, 1.6], [2.6, 1.9], [-0.8, 1.7]].forEach(([dx, dz]) => { const cn = cone(); cn.position.set(frontier.x + dx, 0, frontier.z + dz); t.add(cn); }); }
    (c.team || []).slice(0, 6).forEach((p, k) => { const f = figurine(p.av, { pose: 'debout' }); f.rotation.y = 0.55 + (k % 3 - 1) * 0.3; const fx = (frontier ? frontier.x : 0) - 1.5 - k * 1.1, fz = (frontier ? frontier.z : 0) + 2.1 + (k % 2) * 0.6; f.position.set(fx, 0, fz); pickable(f, { type: 'person', id: p.id }, p.prenom + ' · ' + (p.posteLabel || '') + ' · sur ' + c.nom); t.add(f); });
    // la sous-station au bout de la tranchée : allumée quand tout est posé, tamisée en cours, éteinte au départ
    { const end = path[path.length - 1]; const sb = building('maison', { lit: pct >= 1 ? true : pct > 0 ? 'dim' : false, sst: true }); sb.scale.setScalar(0.62); sb.position.set(end[0], 0, end[1] - 2.4); sb.rotation.y = Math.PI; t.add(sb); }
    // base vie, stock de tubes, benne, clôture
    const bv = container('basevie', { w: 6, d: 2.4, lit: true }); bv.position.set(-TW / 2 + 5, 0, -TD / 2 + 3.2); t.add(bv); const ps = pipeStack(6, 7, C.encre); ps.position.set(TW / 2 - 5, 0, TD / 2 - 3.5); t.add(ps); const sk = skip(C.feuille2); sk.position.set(-TW / 2 + 11, 0, -TD / 2 + 2.6); t.add(sk);
    const fz = fence(TW - 2); fz.position.set(0, 0, -TD / 2 + 0.6); t.add(fz); const vn = van(C.blanc, { stripe: C.violet }); vn.position.set(TW / 2 - 4, 0, TD / 2 - 7.5); vn.rotation.y = Math.PI / 2; vn.scale.setScalar(0.85); t.add(vn);
    [[-TW / 2 + 1.5, TD / 2 - 1.5], [TW / 2 - 1.5, -TD / 2 + 1.5]].forEach(([x, z], k) => { const tr = tree(k ? 'boule' : 'rond', 0.8); tr.position.set(x, 0, z); t.add(tr); });
    // zone cliquable = le plateau
    const hit = rbox(TW, 0.42, TD, C.herbe, { r: 0.5, y: -0.41, op: 0.01 }); hit.material = new THREE.MeshBasicMaterial({ transparent: true, opacity: 0.0, depthWrite: false }); pickable(hit, { type: 'chantier', id: c.id }, c.nom + ' · ' + (c.pct != null ? c.pct + ' % soudé' : '') + ' · ' + (c.team || []).length + ' sur place'); t.add(hit);
    // étiquettes
    const al = c.alerts || []; const bad = al.some(a => a.sev === 'bad');
    t.add(label('', { cls: 'big', x: 0, y: 5.2, z: 0, html: `${escapeTxt(c.nom)}<small>${escapeTxt(c.ville || '')}${c.pct != null ? ' · ' + c.pct + ' % soudé' : ''} · ${(c.team || []).length} sur place</small>` }));
    if (al.length) t.add(label((bad ? '⚠ ' : '') + (al.length === 1 ? al[0].t : al.length + ' alertes'), { cls: bad ? 'bad' : 'warn', x: -TW / 2 + 5, y: 4.2, z: -TD / 2 + 3.2, min: 7 }));
    // jauge au sol
    t.add(box(TW - 4, 0.06, 0.5, C.gris3, { y: 0.02, z: TD / 2 - 1.2, shadow: false }), box((TW - 4) * pct, 0.08, 0.5, pct >= 1 ? C.ok : C.violet, { x: -(TW - 4) / 2 + (TW - 4) * pct / 2, y: 0.03, z: TD / 2 - 1.2, shadow: false }));
    g.add(t); });
  g.userData.centers = centers; g.userData.half = Math.max(W, Dd) * 0.38; return g;
}
/* ═══ CHANTIER : le vrai réseau ═══ */
const ST_COL = { manchonnee: C.ok, controlee: C.bleu, soudee: C.att, none: 0xB9B3CC };
const ST_RANK = { none: 0, soudee: 1, controlee: 2, manchonnee: 3 };
const BSTYLES = ['maison', 'immeuble', 'ecole', 'pavillon', 'gymnase', 'immeuble', 'maison', 'tour', 'piscine'];
/**
 * net = { lines:[{id, name, parent, els:[{from:[x,y], to:[x,y], dn, kind}], joints:[{idx, weldId, status}]}], root:[x,y]|null }
 * team = [{id,prenom,posteLabel,svg}] ; checklist = [{key, lab, k, v, tab}] ; pc = % soudé
 */
export function buildNetwork(net, o) {
  o = o || {}; const g = grp(); const L = net.lines || []; if (!L.length) return g;
  // repère : centrer, y du plan → -z (le nord en haut de l'écran = loin)
  let minX = 1e9, maxX = -1e9, minY = 1e9, maxY = -1e9; L.forEach(l => l.els.forEach(e => { [e.from, e.to].forEach(p => { if (!p) return; minX = Math.min(minX, p[0]); maxX = Math.max(maxX, p[0]); minY = Math.min(minY, p[1]); maxY = Math.max(maxY, p[1]); }); }));
  const cx = (minX + maxX) / 2, cy = (minY + maxY) / 2; const span0 = Math.max(maxX - minX, maxY - minY) || 100; const k = Math.min(1, 320 / span0); /* maquette : un grand réseau est ramené à ~240 m pour rester lisible ; les objets gardent leur taille */ const T = p => [(p[0] - cx) * k, -(p[1] - cy) * k]; const span = span0 * k;
  g.add(plane(span + 200, span + 200, 0xCFE3C6, { y: -0.3 }));
  // routes stylisées sous le réseau (ruban clair)
  const roadMat = mat(0xE4E1EC, { rough: 1 });
  const segGeo = new THREE.BoxGeometry(1, 0.02, 1), pipeGeo = new THREE.CylinderGeometry(1, 1, 1, 10), trGeo = new THREE.BoxGeometry(1, 0.1, 1.5), weldGeo = new THREE.SphereGeometry(0.42, 10, 8);
  const segments = []; L.forEach(l => { const J = l.joints || []; l.els.forEach((e, i) => { if (!e.from || !e.to) return; const a = T(e.from), b = T(e.to); const len = Math.hypot(b[0] - a[0], b[1] - a[1]); if (len < 0.05) return; const j = J.find(x => x.idx === i) || J[i]; const st = j && ST_RANK[j.status] != null ? j.status : 'none'; segments.push({ a, b, len, st, line: l, idx: i, j }); }); });
  const n = segments.length; const road = new THREE.InstancedMesh(segGeo, roadMat, n); road.receiveShadow = true; const trench = new THREE.InstancedMesh(trGeo, mat(0x6B5A48, { rough: 1 }), n); const pipes = [new THREE.InstancedMesh(pipeGeo, mat(C.aller), n), new THREE.InstancedMesh(pipeGeo, mat(C.retour), n)]; const ghost = [new THREE.InstancedMesh(pipeGeo, mat(0xB9B3CC, { op: 0.5 }), n), new THREE.InstancedMesh(pipeGeo, mat(0xB9B3CC, { op: 0.5 }), n)]; pipes.forEach(p => { p.castShadow = true; p.receiveShadow = true; });
  const M4 = new THREE.Matrix4(), Q = new THREE.Quaternion(), S = new THREE.Vector3(), P = new THREE.Vector3(), AX = new THREE.Vector3(0, 0, 1); const hide = new THREE.Matrix4().makeScale(0, 0, 0);
  let nDone = 0, frontier = null, frontierRank = -1; let lastDoneAlong = null;
  segments.forEach((s, i) => { const mx = (s.a[0] + s.b[0]) / 2, mz = (s.a[1] + s.b[1]) / 2; const ang = Math.atan2(s.b[1] - s.a[1], s.b[0] - s.a[0]); Q.setFromAxisAngle(new THREE.Vector3(0, 1, 0), -ang);
    P.set(mx, -0.02, mz); S.set(s.len + 0.6, 1, 5.2); M4.compose(P, Q, S); road.setMatrixAt(i, M4);
    const laid = ST_RANK[s.st] >= 1; if (laid) nDone++;
    P.set(mx, laid ? 0 : -0.5, mz); S.set(s.len, 1, 1); M4.compose(P, Q, S); trench.setMatrixAt(i, laid ? hide : M4);
    const q2 = new THREE.Quaternion().setFromAxisAngle(AX, Math.PI / 2); const qq = Q.clone().multiply(q2); // cylindre couché le long de x puis tourné
    [[-0.42, 0], [0.42, 1]].forEach(([off, k]) => { const ox = -Math.sin(ang) * off, oz = Math.cos(ang) * off; P.set(mx + ox, laid ? 0.2 : -0.35, mz + oz); S.set(0.3, s.len, 0.3); M4.compose(P, qq, S); (laid ? pipes : ghost)[k].setMatrixAt(i, M4); (laid ? ghost : pipes)[k].setMatrixAt(i, hide); });
    if (laid && ST_RANK[s.st] >= frontierRank && s.line === L[0]) { frontierRank = ST_RANK[s.st]; frontier = { x: s.b[0], z: s.b[1], ang }; } });
  [road, trench, ...pipes, ...ghost].forEach(m => { m.instanceMatrix.needsUpdate = true; g.add(m); });
  // soudures : une sphère par joint, couleur par état ; cliquable (InstancedMesh → instanceId)
  const J = []; segments.forEach(s => { if (s.j) J.push({ j: s.j, x: s.b[0], z: s.b[1], st: s.st }); });
  const welds = new THREE.InstancedMesh(weldGeo, new THREE.MeshStandardMaterial({ roughness: 0.6, vertexColors: false }), Math.max(1, J.length)); const col = new THREE.Color(); welds.castShadow = true;
  J.forEach((w, i) => { P.set(w.x, 0.2, w.z); Q.identity(); S.set(1, 1, 1); M4.compose(P, Q, S); welds.setMatrixAt(i, M4); col.setHex(ST_COL[w.st] || ST_COL.none); welds.setColorAt(i, col); }); welds.instanceMatrix.needsUpdate = true; if (welds.instanceColor) welds.instanceColor.needsUpdate = true;
  welds.userData.pick = { type: 'weld', instanced: true }; welds.userData.aria = 'soudure'; welds.userData.welds = J; g.add(welds);
  // chaufferie à l'origine du réseau (début de la première ligne), sous-stations au bout des lignes sans enfant
  const root = L[0].els[0] && L[0].els[0].from ? T(L[0].els[0].from) : [0, 0]; const bh = boilerHouse({ text: o.chaufferie || 'CHAUFFERIE' }); const rAng = L[0].els[0] && L[0].els[0].to ? Math.atan2(T(L[0].els[0].to)[1] - root[1], T(L[0].els[0].to)[0] - root[0]) : 0; bh.position.set(root[0] - Math.cos(rAng) * 7, 0, root[1] - Math.sin(rAng) * 7); bh.rotation.y = -rAng + Math.PI / 2; g.add(bh); g.userData.smoke = bh.userData.smoke;
  const hasChild = new Set(L.map(l => l.parent).filter(Boolean)); let bi = 0; const leaves = L.filter(l => !hasChild.has(l.id) && l.els.length);
  leaves.forEach(l => { const e = l.els[l.els.length - 1]; if (!e || !e.to) return; const end = T(e.to), prev = T(e.from); const ang = Math.atan2(end[1] - prev[1], end[0] - prev[0]); const Js = l.joints || []; const tot = Js.length || 1; const done = Js.filter(j => j.status === 'manchonnee').length; const any = Js.some(j => ST_RANK[j.status] >= 1); const lit = done === tot && tot > 0 ? true : any ? 'dim' : false; const style = BSTYLES[bi++ % BSTYLES.length];
    const b = building(style, { lit, sst: true }); const dist = style === 'tour' || style === 'immeuble' ? 7 : 6; b.position.set(end[0] + Math.cos(ang) * dist, 0, end[1] + Math.sin(ang) * dist); b.rotation.y = -ang + Math.PI; pickable(b, { type: 'line', id: l.id }, (l.name || l.id) + ' · ' + done + ' / ' + tot + ' manchonnées' + (lit === true ? ' · raccordée' : any ? ' · en cours' : ' · pas commencée')); g.add(b);
    g.add(label((l.name || l.id) + ' · ' + done + '/' + tot, { cls: lit === true ? 'ok' : any ? 'warn' : 'soft', x: b.position.x, y: style === 'tour' ? 15 : style === 'immeuble' ? 10 : 5.5, z: b.position.z, min: 5 })); });
  // le front : pelle + équipe
  if (frontier && (o.pc == null || o.pc < 100)) { const ex = excavator(C.jaune, { rot: -0.5 }); ex.position.set(frontier.x + Math.cos(frontier.ang + Math.PI / 2) * 3.2, 0, frontier.z + Math.sin(frontier.ang + Math.PI / 2) * 3.2); ex.rotation.y = -frontier.ang; g.add(ex); (o.team || []).slice(0, 6).forEach((p, k) => { const f = figurine(p.av, { pose: 'debout' }); f.rotation.y = 0.55 + (k % 3 - 1) * 0.3; f.position.set(frontier.x - Math.cos(frontier.ang) * (2 + k * 1.2) + Math.cos(frontier.ang + Math.PI / 2) * 2.0, 0, frontier.z - Math.sin(frontier.ang) * (2 + k * 1.2) + Math.sin(frontier.ang + Math.PI / 2) * 2.0); pickable(f, { type: 'person', id: p.id }, p.prenom + ' · ' + (p.posteLabel || '')); g.add(f); }); g.add(label('Front d\'avancement' + (o.pc != null ? ' · ' + o.pc + ' % soudé' : ''), { cls: 'nuit', x: frontier.x, y: 4.5, z: frontier.z })); [[2, 2], [-2, 2.5], [0, -2.5]].forEach(([dx, dz]) => { const cn = cone(); cn.position.set(frontier.x + dx, 0, frontier.z + dz); g.add(cn); }); g.userData.frontier = frontier; }
  // base vie + les sujets de la checklist, posés près de la chaufferie
  const CK = o.checklist || []; const bvx = bh.position.x + Math.cos(rAng + Math.PI / 2) * 12, bvz = bh.position.z + Math.sin(rAng + Math.PI / 2) * 12; const KCOL = { ok: C.ok, warn: C.att, bad: C.bq, off: C.gris2 };
  const OBJ = { qse: 'basevie', admin: 'bureau', stock: 'stock', eq: 'basevie', pt: 'bureau' }; let ci = 0;
  CK.slice(0, 10).forEach((it, i) => { const kind = OBJ[it.key] || (i % 2 ? 'bureau' : 'stock'); let ob; if (kind === 'stock') { ob = grp(); const ps = pipeStack(6, 6, C.encre); ob.add(ps); } else { ob = container(kind, { w: 5, d: 2.4, lit: it.k === 'ok' }); } const px = bvx + (ci % 5) * 7, pz = bvz + Math.floor(ci / 5) * 6; ci++; ob.position.set(px, 0, pz); pickable(ob, { type: 'bur', tab: it.tab || 'plan' }, it.lab + ' · ' + (it.k === 'ok' ? 'à jour' : it.k === 'off' ? 'pas commencé' : it.v || '')); g.add(ob);
    const flag = cyl(0.04, 0.04, 3.6, C.metal, { x: px - 2.2, z: pz + 1.6, seg: 6 }); g.add(flag, box(0.9, 0.6, 0.03, KCOL[it.k] || C.gris2, { x: px - 1.75, y: 2.9, z: pz + 1.6 }));
    g.add(label((it.k === 'ok' ? '✓ ' : it.k === 'bad' ? '✗ ' : it.k === 'warn' ? '! ' : '○ ') + it.lab + (it.k !== 'ok' && it.v ? ' · ' + it.v : ''), { cls: it.k === 'ok' ? 'ok' : it.k === 'bad' ? 'bad' : it.k === 'warn' ? 'warn' : 'soft', x: px, y: 3.4, z: pz, min: 6 })); });
  if (CK.length) { const fz = fence(Math.min(5, CK.length) * 7 + 2); fz.position.set(bvx + (Math.min(5, CK.length) - 1) * 3.5, 0, bvz - 3.5); g.add(fz); g.add(label('Base vie · ' + CK.filter(x => x.k === 'ok').length + ' / ' + CK.length + ' sujets à jour', { cls: 'nuit big', x: bvx + (Math.min(5, CK.length) - 1) * 3.5, y: 4.6, z: bvz - 3.5, max: 5.9 })); }
  // la ville : des îlots (quartiers) de part et d'autre du réseau, pour lire la carte
  const used = []; const farEnough = (x, z, r) => used.every(u => Math.hypot(u[0] - x, u[1] - z) > u[2] + r + 3);
  segments.forEach((s, i) => { if (i % 4) return; const ang = Math.atan2(s.b[1] - s.a[1], s.b[0] - s.a[0]); [1, -1].forEach(side => { if ((i + side) % 3 === 0) return; const w = 4 + ((i * 7) % 5) * 1.2, d = 4 + ((i * 11) % 5) * 1.2; const x = s.a[0] + Math.cos(ang + Math.PI / 2) * side * (7 + ((i * 3) % 4) * 1.5), z = s.a[1] + Math.sin(ang + Math.PI / 2) * side * (7 + ((i * 3) % 4) * 1.5); if (!farEnough(x, z, Math.max(w, d) / 2)) return; used.push([x, z, Math.max(w, d) / 2]); const h = 1.6 + ((i * 5) % 4) * 0.8; const blk = rbox(w, h, d, [0xF1EEFA, 0xF6F3EC, 0xECEAF2, 0xF6EEDF][i % 4], { r: 0.3, x, z, ry: -ang }); g.add(blk); g.add(box(w + 0.3, 0.2, d + 0.3, [0xD6CEF2, 0xE8C98E, 0xC9C3DC, 0xB9B3CC][i % 4], { x, y: h, z, ry: -ang, shadow: false })); }); });
  // quelques arbres le long du réseau
  for (let i = 0; i < Math.min(40, segments.length); i += Math.max(1, Math.floor(segments.length / 40))) { const s = segments[i]; const ang = Math.atan2(s.b[1] - s.a[1], s.b[0] - s.a[0]); const side = i % 2 ? 1 : -1; const t = tree(i % 3 ? 'rond' : 'boule', 0.9 + (i % 3) * 0.2); t.position.set(s.a[0] + Math.cos(ang + Math.PI / 2) * 5 * side, 0, s.a[1] + Math.sin(ang + Math.PI / 2) * 5 * side); g.add(t); }
  g.userData.center = [0, 0, 0]; g.userData.half = span * 0.42; g.userData.nDone = nDone; g.userData.nSeg = n; g.userData.root = root; return g;
}
const escapeTxt = s => String(s == null ? '' : s).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
