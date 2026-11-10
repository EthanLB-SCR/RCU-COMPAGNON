// monde3d/core.js — MONDE 3D de Tracé, socle WebGL (three.js) — nuit du 07 au 08/11/2026 (Labo).
// Caméra orthographique « maquette » (isométrique), lumière douce + ombres, matières mates pastel (charte Tracé), étiquettes HTML (CSS2D),
// survol / clic sur les objets, vol de caméra d'un point à un autre. Aucune donnée ici : les scènes (bureau, dépôt, pilotage, chantier) sont à côté.
import * as THREE from 'three';
import { MapControls } from 'three/examples/jsm/controls/MapControls.js';
import { RoundedBoxGeometry } from 'three/examples/jsm/geometries/RoundedBoxGeometry.js';
import { CSS2DRenderer, CSS2DObject } from 'three/examples/jsm/renderers/CSS2DRenderer.js';
import { RoomEnvironment } from 'three/examples/jsm/environments/RoomEnvironment.js';
import { mergeGeometries } from 'three/examples/jsm/utils/BufferGeometryUtils.js';
export { THREE };
/* ── palette (charte Tracé + tons de décor) ── */
export const PAL = {
  nuit: 0x2B1B5A, violet: 0x5E46B8, violet2: 0x8E7AD6, lav: 0xE6E1F6, lav2: 0xD6CEF2, lav3: 0xF1EEFA, encre: 0x1B1530, gris: 0x8E87A6, gris2: 0xB9B3CC, gris3: 0xDDD8EA, blanc: 0xFFFFFF, creme: 0xF6F3EC,
  ok: 0x0E6B5C, ok2: 0x7FBFAF, okF: 0xDDF1EC, att: 0xC08A2E, att2: 0xE8C98E, attF: 0xFFF0D2, bq: 0xA3221F, bq2: 0xE9A9A4, bqF: 0xFBE6E4, aller: 0xC8382F, retour: 0x2A5FB4, lum: 0xFFD978,
  bois: 0xD9B98A, bois2: 0xB08A55, bois3: 0x8A6A40, noyer: 0x6B4A2E, metal: 0x57526B, metal2: 0x3A3550, verre: 0xCFE0EE, herbe: 0xCFE3C6, herbe2: 0xB8D4AA, bitume: 0xCBCAD4, beton: 0xE4E1EC, sable: 0xF6EEDF, menthe: 0xE3F2EC, ciel: 0xEAF1F9,
  kraft: 0xE8D2A6, kraft2: 0xC9A774, orange: 0xF08A3C, peau: 0xF1C39F, feuille: 0x8DB27A, feuille2: 0x6E9B5C, feuille3: 0xA9CA96, terre: 0x7C6A55, rouge: 0xD24A3F, jaune: 0xF2C14E, bleu: 0x4A7BD0, rose: 0xF2A7C3
};
/* ── matières (mates, « argile ») mises en cache ── */
const MATS = new Map();
export function mat(color, o) {
  o = o || {}; const key = [color, o.rough, o.metal, o.emis, o.ei, o.op, o.flat, o.side].join('|');
  let m = MATS.get(key); if (m) return m;
  m = new THREE.MeshStandardMaterial({ color, roughness: o.rough == null ? 0.88 : o.rough, metalness: o.metal || 0, flatShading: !!o.flat });
  if (o.emis != null) { m.emissive = new THREE.Color(o.emis); m.emissiveIntensity = o.ei == null ? 1 : o.ei; }
  if (o.op != null && o.op < 1) { m.transparent = true; m.opacity = o.op; }
  if (o.side) m.side = o.side;
  MATS.set(key, m); return m;
}
/** une matière partagée (gardée au cache, jamais libérée au changement de scène) */
export function cachedMat(key, make) { let m = MATS.get(key); if (!m) { m = make(); MATS.set(key, m); } return m; }
/* ── occlusion douce (fausse) : dégradés au pied des murs et sous les meubles — donne la profondeur d'une maquette sans post-traitement ── */
let AO_TEX = null, BLOB_TEX = null;
function aoTex() { if (AO_TEX) return AO_TEX; const c = document.createElement('canvas'); c.width = 4; c.height = 128; const g = c.getContext('2d'); const G = g.createLinearGradient(0, 0, 0, 128); G.addColorStop(0, 'rgba(0,0,0,1)'); G.addColorStop(0.35, 'rgba(0,0,0,.45)'); G.addColorStop(1, 'rgba(0,0,0,0)'); g.fillStyle = G; g.fillRect(0, 0, 4, 128); AO_TEX = new THREE.CanvasTexture(c); return AO_TEX; }
function blobTex() { if (BLOB_TEX) return BLOB_TEX; const c = document.createElement('canvas'); c.width = c.height = 128; const g = c.getContext('2d'); const G = g.createRadialGradient(64, 64, 4, 64, 64, 62); G.addColorStop(0, 'rgba(0,0,0,1)'); G.addColorStop(0.55, 'rgba(0,0,0,.55)'); G.addColorStop(1, 'rgba(0,0,0,0)'); g.fillStyle = G; g.fillRect(0, 0, 128, 128); BLOB_TEX = new THREE.CanvasTexture(c); return BLOB_TEX; }
const aoMat = (op, tex) => cachedMat('ao|' + op + '|' + tex, () => new THREE.MeshBasicMaterial({ color: 0x1B1530, map: tex === 'b' ? blobTex() : aoTex(), transparent: true, opacity: op, depthWrite: false, polygonOffset: true, polygonOffsetFactor: -2, polygonOffsetUnits: -2 }));
/** bande d'ombre au pied d'un mur : longueur len (le long de x), largeur w ; le côté sombre est en z = 0 (contre le mur), le dégradé part vers +z */
export function aoStrip(len, w, o) { o = o || {}; const m = new THREE.Mesh(new THREE.PlaneGeometry(len, w), aoMat(o.op || 0.2, 'a')); m.rotation.x = -Math.PI / 2; m.geometry.translate(0, -w / 2, 0); m.position.set(o.x || 0, o.y == null ? 0.004 : o.y, o.z || 0); if (o.ry) m.rotation.z = o.ry; m.renderOrder = 1; m.userData.noPick = true; return m; }
/** bande d'ombre verticale sur un mur (pied du mur ou angle) : len de large, h de haut, sombre en bas */
export function aoWall(len, h, o) { o = o || {}; const m = new THREE.Mesh(new THREE.PlaneGeometry(len, h), aoMat(o.op || 0.14, 'a')); m.geometry.rotateZ(Math.PI); m.geometry.translate(0, h / 2, 0); m.position.set(o.x || 0, o.y || 0, o.z || 0); if (o.ry) m.rotation.y = o.ry; m.renderOrder = 1; return m; }
/** ombre douce posée au sol (sous un meuble) */
export function blob(w, d, o) { o = o || {}; const m = new THREE.Mesh(new THREE.PlaneGeometry(w, d), aoMat(o.op || 0.22, 'b')); m.rotation.x = -Math.PI / 2; m.position.set(o.x || 0, o.y == null ? 0.005 : o.y, o.z || 0); if (o.ry) m.rotation.z = o.ry; m.renderOrder = 1; return m; }
/* ── briques ── */
const GEOS = new Map();
const CACHED_GEO = new WeakSet();
function rboxGeo(w, h, d, r) { const key = ['rb', w, h, d, r].map(v => Math.round(v * 1000)).join('|'); let g = GEOS.get(key); if (!g) { g = new RoundedBoxGeometry(w, h, d, 2, Math.min(r, w / 2, h / 2, d / 2)); GEOS.set(key, g); CACHED_GEO.add(g); } return g; }
/** boîte à coins arrondis posée sur y=0 (centre en x,z) */
export function rbox(w, h, d, color, o) { o = o || {}; const m = new THREE.Mesh(rboxGeo(w, h, d, o.r == null ? Math.min(0.04, w / 4, h / 4, d / 4) : o.r), o.mat || mat(color, o)); m.position.set(o.x || 0, (o.y || 0) + h / 2, o.z || 0); if (o.ry) m.rotation.y = o.ry; m.castShadow = o.shadow !== false; m.receiveShadow = true; return m; }
export function box(w, h, d, color, o) { o = o || {}; const m = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), o.mat || mat(color, o)); m.position.set(o.x || 0, (o.y || 0) + h / 2, o.z || 0); if (o.ry) m.rotation.y = o.ry; m.castShadow = o.shadow !== false; m.receiveShadow = true; return m; }
export function cyl(rt, rb, h, color, o) { o = o || {}; const m = new THREE.Mesh(new THREE.CylinderGeometry(rt, rb, h, o.seg || 18), o.mat || mat(color, o)); m.position.set(o.x || 0, (o.y || 0) + h / 2, o.z || 0); m.castShadow = o.shadow !== false; m.receiveShadow = true; return m; }
export function sph(r, color, o) { o = o || {}; const m = new THREE.Mesh(new THREE.SphereGeometry(r, o.seg || 14, o.seg ? Math.max(6, o.seg - 4) : 10), o.mat || mat(color, o)); m.position.set(o.x || 0, (o.y || 0) + r, o.z || 0); m.castShadow = o.shadow !== false; m.receiveShadow = true; return m; }
export function plane(w, d, color, o) { o = o || {}; const m = new THREE.Mesh(new THREE.PlaneGeometry(w, d), o.mat || mat(color, o)); m.rotation.x = -Math.PI / 2; m.position.set(o.x || 0, o.y || 0, o.z || 0); if (o.ry) m.rotation.z = o.ry; m.receiveShadow = true; return m; }
export function grp(x, y, z, ry) { const g = new THREE.Group(); g.position.set(x || 0, y || 0, z || 0); if (ry) g.rotation.y = ry; return g; }
export const add = (parent, ...objs) => { objs.forEach(o => { if (o) parent.add(o); }); return parent; };
/**
 * « cuire » un ensemble statique : fusionne les maillages qui partagent la même matière (même ombre, même ordre de rendu) en un seul.
 * Les objets cliquables (userData.pick), les figurines et ceux marqués noBake restent à part. Divise le nombre d'appels de dessin par 5 à 10.
 */
export function bake(root) {
  root.updateMatrixWorld(true); const inv = new THREE.Matrix4().copy(root.matrixWorld).invert(); const groups = new Map();
  root.traverse(m => {
    if (!m.isMesh || m.isInstancedMesh || Array.isArray(m.material) || m.userData.pick || m.userData.noBake || !m.geometry || !m.geometry.attributes.position) return;
    for (let p = m.parent; p && p !== root; p = p.parent) if (p.userData.pick || p.userData.noBake || p.userData.figurine || p.userData.bill) return;
    const k = m.material.uuid + '|' + (m.castShadow ? 1 : 0) + (m.receiveShadow ? 1 : 0) + '|' + m.renderOrder + '|' + (m.visible ? 1 : 0); let L = groups.get(k); if (!L) groups.set(k, L = []); L.push(m);
  });
  const tmp = new THREE.Matrix4();
  groups.forEach(L => {
    if (L.length < 2) return;
    const geos = L.map(m => { const g = m.geometry.index ? m.geometry.toNonIndexed() : m.geometry.clone(); g.applyMatrix4(tmp.multiplyMatrices(inv, m.matrixWorld)); Object.keys(g.attributes).forEach(a => { if (a !== 'position' && a !== 'normal' && a !== 'uv') g.deleteAttribute(a); }); if (!g.attributes.uv) g.setAttribute('uv', new THREE.BufferAttribute(new Float32Array(g.attributes.position.count * 2), 2)); if (!g.attributes.normal) g.computeVertexNormals(); g.morphAttributes = {}; return g; });
    let merged = null; try { merged = mergeGeometries(geos, false); } catch (e) { merged = null; } geos.forEach(g => g.dispose()); if (!merged) return;
    const mesh = new THREE.Mesh(merged, L[0].material); mesh.castShadow = L[0].castShadow; mesh.receiveShadow = L[0].receiveShadow; mesh.renderOrder = L[0].renderOrder; mesh.userData.baked = true; root.add(mesh);
    L.forEach(m => { if (m.parent) m.parent.remove(m); if (!CACHED_GEO.has(m.geometry)) m.geometry.dispose(); });
  });
  return root;
}
/** un objet cliquable : ce que fait le clic, l'étiquette au survol */
export function pickable(obj, action, aria) { obj.traverse(c => { if (c.isMesh) { c.userData.pick = action; c.userData.aria = aria; } }); obj.userData.pick = action; obj.userData.aria = aria; return obj; }
/* ── textures peintes (post-it, écrans, affiches) ── */
export function canvasTex(w, h, draw) { const c = document.createElement('canvas'); c.width = w; c.height = h; const g = c.getContext('2d'); draw(g, w, h); const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace; t.anisotropy = 4; return t; }
export const FONT = "Barlow, 'Segoe UI', system-ui, sans-serif";
export function wrapText(g, text, x, y, maxW, lh, maxLines) { const words = String(text || '').split(/\s+/); let line = '', n = 0; for (let i = 0; i < words.length; i++) { const t = line ? line + ' ' + words[i] : words[i]; if (g.measureText(t).width > maxW && line) { if (n === maxLines - 1) { while (g.measureText(line + '…').width > maxW && line.length > 1) line = line.slice(0, -1); g.fillText(line + '…', x, y); return n + 1; } g.fillText(line, x, y); y += lh; n++; line = words[i]; } else line = t; } if (line && n < maxLines) { g.fillText(line, x, y); n++; } return n; }
/* ── avatars du kit (SVG) → texture → panneau toujours face à la caméra ── */
const AVT = new Map();
export function avatarTexture(svg) {
  if (!svg) return null; let e = AVT.get(svg); if (e) return e;
  const c = document.createElement('canvas'); c.width = 256; c.height = 448; const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace;
  const img = new Image(); img.onload = () => { const g = c.getContext('2d'); g.clearRect(0, 0, 256, 448); g.drawImage(img, 0, 0, 256, 448); t.needsUpdate = true; };
  img.src = 'data:image/svg+xml;charset=utf-8,' + encodeURIComponent(svg.replace(/<svg([^>]*)>/, (m, a) => '<svg' + a.replace(/\s(width|height)="[^"]*"/g, '') + ' width="256" height="448">'));
  AVT.set(svg, t); KEEP_TEX.add(t); return t;
}
export const BILL = [];
/** personnage debout (h en m), pieds en (0,0,0) du groupe rendu ; crop = part du haut gardée (assis derrière un bureau) */
export function figure(svg, h, o) {
  o = o || {}; const g = new THREE.Group(); const w = h / 1.75; const tex = avatarTexture(svg);
  let m;
  if (tex) { const mm = new THREE.MeshBasicMaterial({ map: tex, transparent: true, alphaTest: 0.35, side: THREE.DoubleSide, depthWrite: true }); const crop = o.crop || 1; const geo = new THREE.PlaneGeometry(w, h * crop); if (crop < 1) { const uv = geo.attributes.uv; for (let i = 0; i < uv.count; i++) uv.setY(i, 1 - (1 - uv.getY(i)) * crop); } m = new THREE.Mesh(geo, mm); m.position.y = h - h * crop / 2; }
  else { m = new THREE.Group(); const b = rbox(w * 0.55, h * 0.55, w * 0.3, o.color || PAL.nuit, { r: w * 0.14, y: h * 0.08 }); const hd = sph(h * 0.13, PAL.peau, { y: h * 0.66 }); const cap = cyl(h * 0.135, h * 0.135, h * 0.06, o.color || PAL.violet, { y: h * 0.86 }); add(m, b, hd, cap); }
  m.castShadow = false; g.add(m); g.userData.bill = true; BILL.push(g);
  if (o.shadow !== false) { const s = new THREE.Mesh(new THREE.CircleGeometry(w * 0.45, 16), new THREE.MeshBasicMaterial({ color: 0x1B1530, transparent: true, opacity: 0.18 })); s.rotation.x = -Math.PI / 2; s.position.y = 0.012; g.add(s); }
  return g;
}
/* ── étiquettes HTML ── */
export function label(text, o) {
  o = o || {}; const el = document.createElement('div'); el.className = 'm3d-lab' + (o.cls ? ' ' + o.cls : ''); el.innerHTML = o.html || escapeHtml(text);
  if (o.onClick) { el.style.pointerEvents = 'auto'; el.style.cursor = 'pointer'; el.addEventListener('pointerdown', e => e.stopPropagation()); el.addEventListener('click', e => { e.stopPropagation(); o.onClick(); }); }
  const l = new CSS2DObject(el); l.position.set(o.x || 0, o.y || 0, o.z || 0); l.center.set(o.cx == null ? 0.5 : o.cx, o.cy == null ? 1 : o.cy); if (o.min != null) l.userData.minPpm = o.min; if (o.max != null) l.userData.maxPpm = o.max; if (o.zone) l.userData.zone = o.zone; return l;
}
/** un PANNEAU dans la scène : du HTML lisible et cliquable, accroché à un point 3D, qui grandit / rétrécit avec le zoom (ppm0 = pixels par mètre « à l'échelle 1 ») */
export function panel(html, o) {
  o = o || {}; const el = document.createElement('div'); el.className = 'm3d-panelwrap'; const inner = document.createElement('div'); inner.className = 'm3d-panel' + (o.cls ? ' ' + o.cls : ''); inner.innerHTML = html; el.appendChild(inner);
  el.addEventListener('pointerdown', e => e.stopPropagation()); el.addEventListener('wheel', e => { if (!inner.matches(':hover') || !o.scroll) return; e.stopPropagation(); }, { passive: true });
  if (o.onAct) el.addEventListener('click', e => { const b = e.target.closest('[data-pk]'); if (!b) return; e.stopPropagation(); o.onAct(b.dataset.pk, b.dataset.pa, b); });
  const l = new CSS2DObject(el); l.position.set(o.x || 0, o.y || 0, o.z || 0); l.center.set(o.cx == null ? 0.5 : o.cx, o.cy == null ? 0.5 : o.cy); l.userData.ppm0 = o.ppm0 || 118; if (o.min != null) l.userData.minPpm = o.min; if (o.max != null) l.userData.maxPpm = o.max; return l;
}
export const escapeHtml = s => String(s == null ? '' : s).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
/* ── la visionneuse ── */
/** zone d'étiquettes {g, x0, x1, z0, z1, half} (repère du groupe g) : ses étiquettes ne s'affichent que si on est « entré » dans l'espace —
 * centre de la vue dans le rectangle ET vue assez serrée (demi-hauteur ≤ half). Une évaluation par image et par zone. */
const _zv = new THREE.Vector3();
function zoneOn(V, z, ppm) { if (V.fp) return true; if (z.f === V.tick) return z.on; z.f = V.tick; _zv.copy(V.controls.target); if (z.g) z.g.worldToLocal(_zv); z.on = _zv.x >= z.x0 && _zv.x <= z.x1 && _zv.z >= z.z0 && _zv.z <= z.z1 && V.size[1] / (2 * ppm) <= z.half; return z.on; }
export function createViewer(host, o) {
  o = o || {};
  host.classList.add('m3d-host'); host.innerHTML = '';
  const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true, powerPreference: 'high-performance' }); renderer.setClearColor(0x000000, 0);
  renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2)); renderer.shadowMap.enabled = true; renderer.shadowMap.type = THREE.PCFShadowMap; renderer.toneMapping = THREE.ACESFilmicToneMapping; renderer.toneMappingExposure = o.exposure || 1.05; renderer.outputColorSpace = THREE.SRGBColorSpace;
  host.appendChild(renderer.domElement);
  const labels = new CSS2DRenderer(); labels.domElement.className = 'm3d-labels'; host.appendChild(labels.domElement);
  const scene = new THREE.Scene(); scene.background = new THREE.Color(o.bg == null ? 0xEEF0F7 : o.bg);
  const V0 = {};
  const cam = new THREE.OrthographicCamera(-10, 10, 10, -10, -500, 1000); cam.zoom = 1; cam.up.set(0, 1, 0);
  const pcam = new THREE.PerspectiveCamera(70, 1.5, 0.05, 200); /* vue « dans la peau » (bureau) : caméra en perspective, posée à hauteur des yeux */
  /* lumière d'ambiance « studio » (reflets doux sur toutes les matières) : calculée une fois par visionneuse */
  try { const pm = new THREE.PMREMGenerator(renderer); V0.env = pm.fromScene(new RoomEnvironment(), 0.04).texture; scene.environment = V0.env; scene.environmentIntensity = o.env == null ? 0.3 : o.env; pm.dispose(); } catch (e) { }
  const hemi = new THREE.HemisphereLight(0xFFFFFF, 0xCFC9E0, o.env === 0 ? 1.15 : 0.72); scene.add(hemi);
  const sun = new THREE.DirectionalLight(0xFFF1E0, 2.6); sun.position.set(14, 24, 10); sun.castShadow = true; sun.shadow.mapSize.set(o.shadowMap || 2048, o.shadowMap || 2048); sun.shadow.bias = -0.0006; sun.shadow.normalBias = 0.02; sun.shadow.radius = 4; scene.add(sun); scene.add(sun.target);
  const fill = new THREE.DirectionalLight(0xDCE6FF, 0.55); fill.position.set(-12, 10, -8); scene.add(fill);
  const controls = new MapControls(cam, renderer.domElement); controls.enableDamping = true; controls.dampingFactor = 0.12; controls.screenSpacePanning = false; controls.minPolarAngle = 0.3; controls.maxPolarAngle = 1.3; controls.zoomSpeed = 1.1; controls.minZoom = o.minZoom || 0.35; controls.maxZoom = o.maxZoom || 9; controls.enableRotate = o.rotate !== false; controls.rotateSpeed = 0.6;
  controls.mouseButtons = { LEFT: THREE.MOUSE.PAN, MIDDLE: THREE.MOUSE.DOLLY, RIGHT: THREE.MOUSE.ROTATE }; controls.touches = { ONE: THREE.TOUCH.PAN, TWO: THREE.TOUCH.DOLLY_ROTATE };
  const root = new THREE.Group(); scene.add(root);
  const V = { scene, cam, pcam, fp: null, renderer, labels, controls, root, sun, host, pickables: [], onPick: null, onHover: null, hovered: null, tween: null, alive: true, size: [1, 1], t0: performance.now(), anim: [], env: V0.env, hemi };
  const ray = new THREE.Raycaster(); const ptr = new THREE.Vector2(); let down = null;
  const pickAt = (cx, cy) => { const r = renderer.domElement.getBoundingClientRect(); ptr.set(((cx - r.left) / r.width) * 2 - 1, -((cy - r.top) / r.height) * 2 + 1); ray.setFromCamera(ptr, V.cam); const hits = ray.intersectObjects(V.pickables, true); for (const h of hits) { let ob = h.object; while (ob && !ob.userData.pick) ob = ob.parent; if (ob) { V.lastHit = h; return ob; } } V.lastHit = null; return null; };
  /* glisser-déposer (personnalisation) : V.dragStart(pick, ob) → { planes:[meshes], onMove(hit), onEnd() } ou null */
  V.drag = null; V.dragStart = null;
  renderer.domElement.addEventListener('pointerdown', e => { down = { x: e.clientX, y: e.clientY, t: performance.now() };
    if (V.dragStart && e.button === 0) { const ob = pickAt(e.clientX, e.clientY); if (ob) { const h = V.dragStart(ob.userData.pick, ob, V.lastHit); if (h) { V.drag = h; V.dragMoved = false; controls.enabled = false; try { renderer.domElement.setPointerCapture(e.pointerId); } catch (err) { } } } } });
  const castPlanes = (cx, cy, planes) => { const r = renderer.domElement.getBoundingClientRect(); ptr.set(((cx - r.left) / r.width) * 2 - 1, -((cy - r.top) / r.height) * 2 + 1); ray.setFromCamera(ptr, V.cam); const hits = ray.intersectObjects(planes, false); return hits[0] || null; };
  renderer.domElement.addEventListener('pointermove', e => { if (V.drag) { if (down && Math.hypot(e.clientX - down.x, e.clientY - down.y) > 4) V.dragMoved = true; if (!V.dragMoved) return; const h = castPlanes(e.clientX, e.clientY, V.drag.planes); if (h) V.drag.onMove(h, true); else if (V.drag.anyPlanes) { const h2 = castPlanes(e.clientX, e.clientY, V.drag.anyPlanes); if (h2) V.drag.onMove(h2, false); } } /* hors de ses surfaces : l'objet suit quand même la souris, en rouge (dépose refusée) */
    else if (V.fp && down && V.onFpDrag && (e.buttons & 1)) { /* dans la peau : glisser à gauche / à droite = tourner la tête */ if (!V.fpDrag && Math.abs(e.clientX - down.x) > 6) { V.fpDrag = true; V.fpX = e.clientX; } if (V.fpDrag) { V.onFpDrag(e.clientX - V.fpX); V.fpX = e.clientX; } } });
  renderer.domElement.addEventListener('pointerup', () => { V.fpDrag = false; }); renderer.domElement.addEventListener('pointercancel', () => { V.fpDrag = false; });
  renderer.domElement.addEventListener('pointerup', e => { if (V.drag) { const d = V.drag; V.drag = null; if (!V.fp) controls.enabled = true; try { renderer.domElement.releasePointerCapture(e.pointerId); } catch (err) { } if (V.dragMoved) { d.onEnd(true); down = null; return; } d.onEnd(false); } });
  /* molette sur un écran à zones (liste « À faire ») : fait défiler l'écran au lieu de zoomer la caméra */
  renderer.domElement.addEventListener('wheel', e => { const ob = pickAt(e.clientX, e.clientY); if (ob && ob.userData.onScroll && ob.userData.onScroll(e.deltaY)) { e.preventDefault(); e.stopImmediatePropagation(); } }, { passive: false, capture: true });
  /* écrans à zones (poste de travail) : ob.userData.zoneAt(uv) → n° de zone ; la zone porte sa propre action et sa bulle */
  const zoneOf = (ob, hit) => { if (!ob || !ob.userData.zoneAt) return -1; try { return ob.userData.zoneAt(hit && hit.uv); } catch (e) { return -1; } };
  renderer.domElement.addEventListener('pointerup', e => { if (!down) return; const d = Math.hypot(e.clientX - down.x, e.clientY - down.y); const dt = performance.now() - down.t; down = null; if (d > 6 || dt > 600) return; const ob = pickAt(e.clientX, e.clientY); if (ob && V.onPick) { const zi = zoneOf(ob, V.lastHit); const z = zi >= 0 ? ob.userData.zones[zi] : null; V.onPick(z && z.pick ? Object.assign({ fromScreen: true }, z.pick) : ob.userData.pick, ob, V.lastHit); } else if (!ob && V.onPick) V.onPick(null, null, null); });
  renderer.domElement.addEventListener('pointermove', e => { if (down) return; const ob = pickAt(e.clientX, e.clientY); if (ob !== V.hovered) { setHover(V, ob); }
    const zi = zoneOf(ob, V.lastHit); if (V.zoneOb && V.zoneOb !== ob && V.zoneOb.userData.onZone) V.zoneOb.userData.onZone(-1);
    if (ob && ob.userData.zoneAt) { if (V.zoneOb !== ob || V.zoneI !== zi) { V.zoneOb = ob; V.zoneI = zi; if (ob.userData.onZone) ob.userData.onZone(zi); if (V.onHover) V.onHover(zi >= 0 ? ob.userData.zones[zi].label : ob.userData.aria, ob); } } else { V.zoneOb = null; V.zoneI = -1; } });
  renderer.domElement.addEventListener('pointerleave', () => setHover(V, null));
  V.resize = () => { const w = host.clientWidth || 800, h = host.clientHeight || 500; V.size = [w, h]; renderer.setSize(w, h, false); labels.setSize(w, h); const a = w / h; const half = V.half || 12; cam.left = -half * a; cam.right = half * a; cam.top = half; cam.bottom = -half; cam.updateProjectionMatrix(); pcam.aspect = a; pcam.updateProjectionMatrix(); };
  V.ro = new ResizeObserver(() => V.resize()); V.ro.observe(host);
  /** cadrer : centre (x,y,z), demi-hauteur visible (m), angle (azimut rad, élévation rad) */
  V.frame = (c, half, az, el, immediate) => { V.fp = null; V.cam = cam; controls.enabled = true; V.half = half; V.resize(); const dist = 120; const target = new THREE.Vector3(c[0], c[1] || 0, c[2]); const pos = new THREE.Vector3(target.x + dist * Math.cos(el) * Math.sin(az), target.y + dist * Math.sin(el), target.z + dist * Math.cos(el) * Math.cos(az)); if (immediate || !V.started) { V.tween = null; cam.position.copy(pos); controls.target.copy(target); cam.zoom = 1; cam.updateProjectionMatrix(); controls.update(); } else V.tween = { t0: performance.now(), ms: 900, p0: cam.position.clone(), p1: pos, c0: controls.target.clone(), c1: target, z0: cam.zoom, z1: 1, h0: V.half0 || half, h1: half }; V.half0 = half; };
  /** voler vers un point en gardant l'angle ; zoomFactor relatif à la demi-hauteur courante */
  V.flyTo = (c, half, ms) => { const off = cam.position.clone().sub(controls.target); const target = new THREE.Vector3(c[0], c[1] || 0, c[2]); V.tween = { t0: performance.now(), ms: ms || 900, p0: cam.position.clone(), p1: target.clone().add(off), c0: controls.target.clone(), c1: target, z0: cam.zoom, z1: 1, h0: V.half, h1: half || V.half }; };
  /** les ombres couvrent la boîte donnée */
  V.shadowBounds = (cx, cz, r) => { sun.target.position.set(cx, 0, cz); sun.position.set(cx + 14, 24, cz + 10); const s = sun.shadow.camera; s.left = -r; s.right = r; s.top = r; s.bottom = -r; s.near = 1; s.far = 80; s.updateProjectionMatrix(); };
  V.add = (...objs) => { LABS.delete(root); objs.forEach(ob => { root.add(ob); ob.traverse(c => { if (c.userData.pick && c.isMesh && !V.pickables.includes(c)) V.pickables.push(c); }); }); };
  V.zoomBy = f => { if (V.fp) { pcam.fov = Math.max(28, Math.min(95, pcam.fov / f)); pcam.updateProjectionMatrix(); return; } cam.zoom = Math.max(controls.minZoom, Math.min(controls.maxZoom, cam.zoom * f)); cam.updateProjectionMatrix(); };
  /** vue à la première personne : œil, point regardé, angle de champ ; immediate = sans glissement. Un nouvel appel glisse d'une vue à l'autre. */
  V.look = (eye, target, fov, immediate, ms) => { const E = new THREE.Vector3(...eye), T = new THREE.Vector3(...target); const f = fov || 70; if (!V.fp || immediate || !V.started) { V.fp = { target: T.clone(), tw: null }; pcam.position.copy(E); pcam.fov = f; pcam.updateProjectionMatrix(); pcam.lookAt(T); } else { V.fp.tw = { t0: performance.now(), ms: ms || 900, p0: pcam.position.clone(), p1: E, c0: V.fp.target.clone(), c1: T, f0: pcam.fov, f1: f }; } V.cam = pcam; controls.enabled = false; V.resize(); };
  V.clear = () => { LABS.delete(root); V.tween = null; if (V.fp) V.fp.tw = null; V.zoneOb = null; V.zoneI = -1; setHover(V, null); V.pickables.length = 0; BILL.length = 0; V.anim.length = 0; while (root.children.length) { const c = root.children.pop(); disposeDeep(c); } };
  V.setPick = f => { V.onPick = f; };
  const ease = t => t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2;
  const camDir = new THREE.Vector3();
  function loop() {
    if (!V.alive) return; requestAnimationFrame(loop); if (!document.contains(host) || !host.clientWidth) { V.idle = (V.idle || 0) + 1; if (V.idle > 1800) { V.dispose(); } return; } /* hors écran (autre onglet, vue masquée) : on ne dessine pas ; après ~30 s on libère la carte graphique */ V.idle = 0;
    const now = performance.now();
    if (V.tween) { const tw = V.tween; const k = Math.min(1, (now - tw.t0) / tw.ms); const e = ease(k); cam.position.lerpVectors(tw.p0, tw.p1, e); controls.target.lerpVectors(tw.c0, tw.c1, e); cam.zoom = tw.z0 + (tw.z1 - tw.z0) * e; if (tw.h0 !== tw.h1) { V.half = tw.h0 + (tw.h1 - tw.h0) * e; V.resize(); } cam.updateProjectionMatrix(); if (k >= 1) V.tween = null; }
    controls.update();
    if (V.fp && V.fp.tw) { const tw = V.fp.tw; const k = Math.min(1, (now - tw.t0) / tw.ms); const e = ease(k); pcam.position.lerpVectors(tw.p0, tw.p1, e); V.fp.target.lerpVectors(tw.c0, tw.c1, e); pcam.fov = tw.f0 + (tw.f1 - tw.f0) * e; pcam.updateProjectionMatrix(); pcam.lookAt(V.fp.target); if (k >= 1) V.fp.tw = null; }
    V.cam.getWorldDirection(camDir); const yaw = Math.atan2(camDir.x, camDir.z);
    for (const b of BILL) { b.rotation.y = yaw + Math.PI; }
    for (const a of V.anim) { try { a(now, (now - V.t0) / 1000); } catch (e) { } }
    const ppm = V.fp ? 120 : V.size[1] / (2 * (V.half || 12)) * cam.zoom; V.ppm = ppm; V.tick = (V.tick || 0) + 1; for (const l of labelsOf(root)) { const vis = (l.userData.minPpm == null || ppm >= l.userData.minPpm) && (l.userData.maxPpm == null || ppm <= l.userData.maxPpm) && (!l.userData.zone || zoneOn(V, l.userData.zone, ppm)); if (l.visible !== vis) l.visible = vis; if (vis && l.userData.ppm0) { const k = Math.round(Math.max(0.5, Math.min(1.6, ppm / l.userData.ppm0)) * 200) / 200; if (l.userData.k !== k) { l.userData.k = k; const inner = l.element.firstElementChild; if (inner) inner.style.transform = 'scale(' + k + ')'; } } }
    renderer.render(scene, V.cam); labels.render(scene, V.cam);
  }
  V.start = () => { if (V.started) return; V.started = true; V.resize(); loop(); };
  V.dispose = () => { V.alive = false; try { V.ro.disconnect(); } catch (e) { } controls.dispose(); V.clear(); try { if (V.env) V.env.dispose(); } catch (e) { } renderer.dispose(); try { host.innerHTML = ''; } catch (e) { } };
  V.snapshot = () => renderer.domElement.toDataURL('image/png');
  return V;
}
const LABS = new WeakMap();
/* 10/11 : la liste des étiquettes était gardée tant que le NOMBRE d'enfants de la racine ne changeait pas — or chaque scène n'en a qu'un. Après une reconstruction sur le même viewer
 * (changement d'onglet, retour d'une visite de bureau, attente enregistrée), les nouvelles étiquettes n'étaient donc jamais filtrées : elles restaient TOUTES affichées, quel que soit le zoom.
 * Désormais : liste vidée à chaque V.add / V.clear, et relue de toute façon toutes les 40 images (étiquettes ajoutées après coup dans un groupe déjà affiché). */
function labelsOf(root) { let L = LABS.get(root); if (!L || L.n !== root.children.length || --L.ttl <= 0) { L = []; root.traverse(c => { if (c.isCSS2DObject) L.push(c); }); L.n = root.children.length; L.ttl = 40; LABS.set(root, L); } return L; }
function setHover(V, ob) {
  if (V.hovered) { V.hovered.traverse(c => { if (c.isMesh && c.userData.em0 !== undefined) { c.material = c.userData.m0; delete c.userData.em0; delete c.userData.m0; } }); }
  V.hovered = ob; V.renderer.domElement.style.cursor = ob ? 'pointer' : '';
  if (ob) { ob.traverse(c => { if (c.isMesh && !c.isInstancedMesh && c.material && c.material.isMeshStandardMaterial && !c.material.map) { c.userData.m0 = c.material; c.userData.em0 = 1; const m = c.material.clone(); m.emissive = new THREE.Color(PAL.violet); m.emissiveIntensity = 0.22; c.material = m; } }); }
  if (V.onHover) V.onHover(ob ? ob.userData.aria : null, ob);
}
export function disposeDeep(o) { o.traverse(c => { if (c.isMesh) { (Array.isArray(c.material) ? c.material : [c.material]).forEach(m => { if (!m || isCached(m)) return; if (m.map && m.map.isTexture && !KEEP_TEX.has(m.map)) m.map.dispose(); m.dispose(); }); } if (c.isCSS2DObject && c.element && c.element.parentNode) c.element.parentNode.removeChild(c.element); }); }
/** textures à garder d'une scène à l'autre (avatars, textures partagées) */
export const KEEP_TEX = new WeakSet();
function isCached(m) { for (const v of MATS.values()) if (v === m) return true; return false; }
/* ── styles des étiquettes et du conteneur ── */
export function injectCSS() {
  if (typeof document === 'undefined' || document.getElementById('m3d-core-css')) return; const s = document.createElement('style'); s.id = 'm3d-core-css'; s.textContent = `
.m3d-host{position:relative;overflow:hidden;border-radius:14px;background:#EEF0F7;touch-action:none;user-select:none;-webkit-user-select:none}
.m3d-host canvas{display:block;width:100%!important;height:100%!important}
.m3d-host.m3d-studio{background:radial-gradient(ellipse 75% 70% at 50% 42%,#FFFFFF 0%,#F2F0F7 48%,#E2DFEC 100%)}
.m3d-labels{position:absolute;inset:0;pointer-events:none;overflow:hidden}
.m3d-lab{font-family:${FONT};font-size:12.5px;line-height:16px;font-weight:700;color:#1B1530;background:rgba(255,255,255,.94);border:1px solid #D6CEF2;border-radius:999px;padding:3px 9px;white-space:nowrap;box-shadow:0 2px 6px rgba(43,27,90,.10);pointer-events:none;transform-origin:50% 100%}
.m3d-lab.big{font-size:14px;line-height:18px;padding:5px 12px;border-width:1.5px;border-color:#5E46B8}
.m3d-lab.soft{background:rgba(255,255,255,.72);border-color:transparent;color:#4A4560;font-weight:600;box-shadow:none}
.m3d-lab.ok{background:#DDF1EC;color:#0E6B5C;border-color:#9FD2C5}.m3d-lab.warn{background:#FFF0D2;color:#7A4A00;border-color:#E8C98E}.m3d-lab.bad{background:#FBE6E4;color:#A3221F;border-color:#E9A9A4}.m3d-lab.nuit{background:#2B1B5A;color:#fff;border-color:#2B1B5A}
.m3d-lab small{display:block;font-weight:600;color:#57526B;font-size:11.5px;line-height:14px}.m3d-lab.nuit small{color:#D6CEF2}
.m3d-lab .ic{display:inline-block;width:8px;height:8px;border-radius:50%;margin-right:5px;vertical-align:1px}
.m3d-panelwrap{pointer-events:none}.m3d-panel{pointer-events:auto;transform-origin:50% 50%;font-family:${FONT};color:#1B1530;user-select:none}
.m3d-panel [data-pk]{cursor:pointer}
.m3d-board{width:290px;background:linear-gradient(135deg,#E0BF8E,#D2AE7B);border:9px solid #A77A4A;border-radius:8px;box-shadow:0 14px 30px rgba(43,27,90,.25),inset 0 0 0 2px rgba(255,255,255,.25);padding:9px 9px 8px}
.m3d-board h3{margin:0 0 8px;font-size:16px;font-weight:800;color:#2B1B5A;display:flex;align-items:center;gap:8px}.m3d-board h3 .n{margin-left:auto;background:#2B1B5A;color:#fff;border-radius:999px;padding:2px 10px;font-size:12.5px}.m3d-board h3 .n.ok{background:#0E6B5C}
.m3d-notes{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:8px}
.m3d-note{position:relative;min-height:78px;padding:10px 9px 8px;border-radius:3px;background:#FFE88A;box-shadow:0 5px 10px rgba(60,40,10,.22);text-align:left;border:0;font:inherit;color:#1B1530;display:flex;flex-direction:column;gap:3px;transition:transform .12s}
.m3d-note:nth-child(2n+1){transform:rotate(-1.1deg)}.m3d-note:nth-child(2n){transform:rotate(1.2deg)}.m3d-note:hover,.m3d-note:focus-visible{transform:scale(1.06) rotate(0);z-index:2;box-shadow:0 10px 18px rgba(60,40,10,.3);outline:0}
.m3d-note.bad{background:#FFC2BC}.m3d-note.info{background:#CFE2FF}.m3d-note.ok{background:#CDEBDD}
.m3d-note::before{content:"";position:absolute;top:-6px;left:50%;width:12px;height:12px;margin-left:-6px;border-radius:50%;background:#5E46B8;box-shadow:0 2px 3px rgba(0,0,0,.3)}.m3d-note.bad::before{background:#A3221F}.m3d-note.warn::before,.m3d-note.or::before{background:#C08A2E}
.m3d-note b{font-size:12.5px;line-height:1.2;display:-webkit-box;-webkit-line-clamp:2;-webkit-box-orient:vertical;overflow:hidden}.m3d-note small{font-size:11px;line-height:1.2;color:#4A4560;display:-webkit-box;-webkit-line-clamp:2;-webkit-box-orient:vertical;overflow:hidden}
.m3d-note .go{margin-top:auto;font-size:11px;font-weight:800;color:#2B1B5A;opacity:.75}.m3d-note:hover .go{opacity:1}
.m3d-note.more{background:#fff;align-items:center;justify-content:center;text-align:center;font-weight:800;font-size:13.5px;color:#2B1B5A;border:2px dashed #8E7AD6}.m3d-note.more::before{display:none}
.m3d-board .empty{background:#CDEBDD;color:#0E6B5C;font-weight:800;font-size:17px;padding:22px;border-radius:6px;text-align:center}
.m3d-sign{width:172px;background:#2B1B5A;border-radius:12px;padding:9px 8px 8px;box-shadow:0 14px 30px rgba(43,27,90,.35)}
.m3d-sign h3{margin:0 0 7px;color:#D6CEF2;font-size:11px;font-weight:800;letter-spacing:.08em;text-transform:uppercase;text-align:center}
.m3d-sign .tiles{display:flex;flex-direction:column;gap:5px}
.m3d-tile{display:flex;align-items:center;gap:7px;min-height:38px;padding:4px 7px 4px 5px;border-radius:9px;border:0;background:#fff;color:#1B1530;font:inherit;text-align:left;transition:transform .12s,background .12s}
.m3d-tile .ic{width:27px;height:27px;border-radius:7px;display:grid;place-items:center;font-size:15px;background:#EFEBFA;flex:none}.m3d-tile b{flex:1;font-size:13.5px}.m3d-tile .n{background:#F08A3C;color:#fff;border-radius:999px;padding:1px 7px;font-size:11.5px;font-weight:800}.m3d-tile .ar{font-size:17px;font-weight:800;color:#5E46B8;transition:transform .12s}
.m3d-tile:hover,.m3d-tile:focus-visible{background:#F5F2FD;transform:translateX(4px);outline:0}.m3d-tile:hover .ar{transform:translateX(3px)}
.m3d-sign .foot{margin-top:7px;color:#B9AEE6;font-size:10.5px;text-align:center}
.m3d-screen{width:300px;background:linear-gradient(135deg,#20154A,#3B2A86);border:8px solid #1B1530;border-radius:12px;padding:10px;box-shadow:0 14px 30px rgba(27,21,48,.4);color:#fff}
.m3d-screen h3{margin:0 0 8px;font-size:12.5px;font-weight:800;color:#D6CEF2;display:flex;justify-content:space-between}.m3d-screen h3 span{font-weight:600;color:#B9AEE6}
.m3d-kp{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:7px}
.m3d-kpi{border:0;border-radius:10px;background:rgba(255,255,255,.1);color:#fff;text-align:left;padding:8px 10px;font:inherit;display:flex;flex-direction:column;gap:2px;transition:background .12s}.m3d-kpi:hover,.m3d-kpi:focus-visible{background:rgba(255,255,255,.24);outline:0}
.m3d-kpi b{font-size:26px;line-height:1;font-weight:800}.m3d-kpi span{font-size:12px;color:#E6E1F6}.m3d-kpi .ar{position:absolute}
.m3d-plate{padding:8px 13px;border-radius:11px;background:#fff;border:2px solid #5E46B8;color:#2B1B5A;font-size:13.5px;font-weight:800;box-shadow:0 8px 20px rgba(43,27,90,.25);white-space:nowrap;transition:transform .12s}.m3d-plate:hover{background:#2B1B5A;color:#fff;transform:translateY(-2px)}
.m3d-panel.lock{width:220px;background:#1B1530;color:#fff;border-radius:12px;padding:12px;text-align:center;font-weight:800;font-size:15px}.m3d-panel.lock small{display:block;color:#B9AEE6;font-weight:600;font-size:12.5px;margin-top:3px}
`; document.head.appendChild(s);
}
