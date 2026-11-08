// monde3d/core.js — MONDE 3D de Tracé, socle WebGL (three.js) — nuit du 07 au 08/11/2026 (Labo).
// Caméra orthographique « maquette » (isométrique), lumière douce + ombres, matières mates pastel (charte Tracé), étiquettes HTML (CSS2D),
// survol / clic sur les objets, vol de caméra d'un point à un autre. Aucune donnée ici : les scènes (bureau, dépôt, pilotage, chantier) sont à côté.
import * as THREE from 'three';
import { MapControls } from 'three/examples/jsm/controls/MapControls.js';
import { RoundedBoxGeometry } from 'three/examples/jsm/geometries/RoundedBoxGeometry.js';
import { CSS2DRenderer, CSS2DObject } from 'three/examples/jsm/renderers/CSS2DRenderer.js';
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
/* ── briques ── */
const GEOS = new Map();
function rboxGeo(w, h, d, r) { const key = ['rb', w, h, d, r].map(v => Math.round(v * 1000)).join('|'); let g = GEOS.get(key); if (!g) { g = new RoundedBoxGeometry(w, h, d, 2, Math.min(r, w / 2, h / 2, d / 2)); GEOS.set(key, g); } return g; }
/** boîte à coins arrondis posée sur y=0 (centre en x,z) */
export function rbox(w, h, d, color, o) { o = o || {}; const m = new THREE.Mesh(rboxGeo(w, h, d, o.r == null ? Math.min(0.04, w / 4, h / 4, d / 4) : o.r), o.mat || mat(color, o)); m.position.set(o.x || 0, (o.y || 0) + h / 2, o.z || 0); if (o.ry) m.rotation.y = o.ry; m.castShadow = o.shadow !== false; m.receiveShadow = true; return m; }
export function box(w, h, d, color, o) { o = o || {}; const m = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), o.mat || mat(color, o)); m.position.set(o.x || 0, (o.y || 0) + h / 2, o.z || 0); if (o.ry) m.rotation.y = o.ry; m.castShadow = o.shadow !== false; m.receiveShadow = true; return m; }
export function cyl(rt, rb, h, color, o) { o = o || {}; const m = new THREE.Mesh(new THREE.CylinderGeometry(rt, rb, h, o.seg || 18), o.mat || mat(color, o)); m.position.set(o.x || 0, (o.y || 0) + h / 2, o.z || 0); m.castShadow = o.shadow !== false; m.receiveShadow = true; return m; }
export function sph(r, color, o) { o = o || {}; const m = new THREE.Mesh(new THREE.SphereGeometry(r, o.seg || 14, o.seg ? Math.max(6, o.seg - 4) : 10), o.mat || mat(color, o)); m.position.set(o.x || 0, (o.y || 0) + r, o.z || 0); m.castShadow = o.shadow !== false; m.receiveShadow = true; return m; }
export function plane(w, d, color, o) { o = o || {}; const m = new THREE.Mesh(new THREE.PlaneGeometry(w, d), o.mat || mat(color, o)); m.rotation.x = -Math.PI / 2; m.position.set(o.x || 0, o.y || 0, o.z || 0); if (o.ry) m.rotation.z = o.ry; m.receiveShadow = true; return m; }
export function grp(x, y, z, ry) { const g = new THREE.Group(); g.position.set(x || 0, y || 0, z || 0); if (ry) g.rotation.y = ry; return g; }
export const add = (parent, ...objs) => { objs.forEach(o => { if (o) parent.add(o); }); return parent; };
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
  AVT.set(svg, t); return t;
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
  const l = new CSS2DObject(el); l.position.set(o.x || 0, o.y || 0, o.z || 0); l.center.set(o.cx == null ? 0.5 : o.cx, o.cy == null ? 1 : o.cy); if (o.min != null) l.userData.minPpm = o.min; if (o.max != null) l.userData.maxPpm = o.max; return l;
}
export const escapeHtml = s => String(s == null ? '' : s).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
/* ── la visionneuse ── */
export function createViewer(host, o) {
  o = o || {};
  host.classList.add('m3d-host'); host.innerHTML = '';
  const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: false, powerPreference: 'high-performance' });
  renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2)); renderer.shadowMap.enabled = true; renderer.shadowMap.type = THREE.PCFShadowMap; renderer.toneMapping = THREE.ACESFilmicToneMapping; renderer.toneMappingExposure = o.exposure || 1.05; renderer.outputColorSpace = THREE.SRGBColorSpace;
  host.appendChild(renderer.domElement);
  const labels = new CSS2DRenderer(); labels.domElement.className = 'm3d-labels'; host.appendChild(labels.domElement);
  const scene = new THREE.Scene(); scene.background = new THREE.Color(o.bg == null ? 0xEEF0F7 : o.bg);
  const cam = new THREE.OrthographicCamera(-10, 10, 10, -10, -500, 1000); cam.zoom = 1; cam.up.set(0, 1, 0);
  const hemi = new THREE.HemisphereLight(0xFFFFFF, 0xCFC9E0, 1.15); scene.add(hemi);
  const sun = new THREE.DirectionalLight(0xFFF4E6, 2.35); sun.position.set(14, 24, 10); sun.castShadow = true; sun.shadow.mapSize.set(o.shadowMap || 2048, o.shadowMap || 2048); sun.shadow.bias = -0.0006; sun.shadow.normalBias = 0.02; sun.shadow.radius = 4; scene.add(sun); scene.add(sun.target);
  const fill = new THREE.DirectionalLight(0xDCE6FF, 0.55); fill.position.set(-12, 10, -8); scene.add(fill);
  const controls = new MapControls(cam, renderer.domElement); controls.enableDamping = true; controls.dampingFactor = 0.12; controls.screenSpacePanning = false; controls.minPolarAngle = 0.3; controls.maxPolarAngle = 1.3; controls.zoomSpeed = 1.1; controls.minZoom = o.minZoom || 0.35; controls.maxZoom = o.maxZoom || 9; controls.enableRotate = o.rotate !== false; controls.rotateSpeed = 0.6;
  controls.mouseButtons = { LEFT: THREE.MOUSE.PAN, MIDDLE: THREE.MOUSE.DOLLY, RIGHT: THREE.MOUSE.ROTATE }; controls.touches = { ONE: THREE.TOUCH.PAN, TWO: THREE.TOUCH.DOLLY_ROTATE };
  const root = new THREE.Group(); scene.add(root);
  const V = { scene, cam, renderer, labels, controls, root, sun, host, pickables: [], onPick: null, onHover: null, hovered: null, tween: null, alive: true, size: [1, 1], t0: performance.now(), anim: [] };
  const ray = new THREE.Raycaster(); const ptr = new THREE.Vector2(); let down = null;
  const pickAt = (cx, cy) => { const r = renderer.domElement.getBoundingClientRect(); ptr.set(((cx - r.left) / r.width) * 2 - 1, -((cy - r.top) / r.height) * 2 + 1); ray.setFromCamera(ptr, cam); const hits = ray.intersectObjects(V.pickables, true); for (const h of hits) { let ob = h.object; while (ob && !ob.userData.pick) ob = ob.parent; if (ob) { V.lastHit = h; return ob; } } V.lastHit = null; return null; };
  renderer.domElement.addEventListener('pointerdown', e => { down = { x: e.clientX, y: e.clientY, t: performance.now() }; });
  renderer.domElement.addEventListener('pointerup', e => { if (!down) return; const d = Math.hypot(e.clientX - down.x, e.clientY - down.y); const dt = performance.now() - down.t; down = null; if (d > 6 || dt > 600) return; const ob = pickAt(e.clientX, e.clientY); if (ob && V.onPick) V.onPick(ob.userData.pick, ob, V.lastHit); else if (!ob && V.onPick) V.onPick(null, null, null); });
  renderer.domElement.addEventListener('pointermove', e => { if (down) return; const ob = pickAt(e.clientX, e.clientY); if (ob !== V.hovered) { setHover(V, ob); } });
  renderer.domElement.addEventListener('pointerleave', () => setHover(V, null));
  V.resize = () => { const w = host.clientWidth || 800, h = host.clientHeight || 500; V.size = [w, h]; renderer.setSize(w, h, false); labels.setSize(w, h); const a = w / h; const half = V.half || 12; cam.left = -half * a; cam.right = half * a; cam.top = half; cam.bottom = -half; cam.updateProjectionMatrix(); };
  V.ro = new ResizeObserver(() => V.resize()); V.ro.observe(host);
  /** cadrer : centre (x,y,z), demi-hauteur visible (m), angle (azimut rad, élévation rad) */
  V.frame = (c, half, az, el, immediate) => { V.half = half; V.resize(); const dist = 120; const target = new THREE.Vector3(c[0], c[1] || 0, c[2]); const pos = new THREE.Vector3(target.x + dist * Math.cos(el) * Math.sin(az), target.y + dist * Math.sin(el), target.z + dist * Math.cos(el) * Math.cos(az)); if (immediate || !V.started) { V.tween = null; cam.position.copy(pos); controls.target.copy(target); cam.zoom = 1; cam.updateProjectionMatrix(); controls.update(); } else V.tween = { t0: performance.now(), ms: 900, p0: cam.position.clone(), p1: pos, c0: controls.target.clone(), c1: target, z0: cam.zoom, z1: 1, h0: V.half0 || half, h1: half }; V.half0 = half; };
  /** voler vers un point en gardant l'angle ; zoomFactor relatif à la demi-hauteur courante */
  V.flyTo = (c, half, ms) => { const off = cam.position.clone().sub(controls.target); const target = new THREE.Vector3(c[0], c[1] || 0, c[2]); V.tween = { t0: performance.now(), ms: ms || 900, p0: cam.position.clone(), p1: target.clone().add(off), c0: controls.target.clone(), c1: target, z0: cam.zoom, z1: 1, h0: V.half, h1: half || V.half }; };
  /** les ombres couvrent la boîte donnée */
  V.shadowBounds = (cx, cz, r) => { sun.target.position.set(cx, 0, cz); sun.position.set(cx + 14, 24, cz + 10); const s = sun.shadow.camera; s.left = -r; s.right = r; s.top = r; s.bottom = -r; s.near = 1; s.far = 80; s.updateProjectionMatrix(); };
  V.add = (...objs) => { objs.forEach(ob => { root.add(ob); ob.traverse(c => { if (c.userData.pick && c.isMesh && !V.pickables.includes(c)) V.pickables.push(c); }); }); };
  V.zoomBy = f => { cam.zoom = Math.max(controls.minZoom, Math.min(controls.maxZoom, cam.zoom * f)); cam.updateProjectionMatrix(); };
  V.clear = () => { V.tween = null; setHover(V, null); V.pickables.length = 0; BILL.length = 0; V.anim.length = 0; while (root.children.length) { const c = root.children.pop(); disposeDeep(c); } };
  V.setPick = f => { V.onPick = f; };
  const ease = t => t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2;
  const camDir = new THREE.Vector3();
  function loop() {
    if (!V.alive) return; requestAnimationFrame(loop); if (!document.contains(host) || !host.clientWidth) { V.idle = (V.idle || 0) + 1; if (V.idle > 1800) { V.dispose(); } return; } /* hors écran (autre onglet, vue masquée) : on ne dessine pas ; après ~30 s on libère la carte graphique */ V.idle = 0;
    const now = performance.now();
    if (V.tween) { const tw = V.tween; const k = Math.min(1, (now - tw.t0) / tw.ms); const e = ease(k); cam.position.lerpVectors(tw.p0, tw.p1, e); controls.target.lerpVectors(tw.c0, tw.c1, e); cam.zoom = tw.z0 + (tw.z1 - tw.z0) * e; if (tw.h0 !== tw.h1) { V.half = tw.h0 + (tw.h1 - tw.h0) * e; V.resize(); } cam.updateProjectionMatrix(); if (k >= 1) V.tween = null; }
    controls.update();
    cam.getWorldDirection(camDir); const yaw = Math.atan2(camDir.x, camDir.z);
    for (const b of BILL) { b.rotation.y = yaw + Math.PI; }
    for (const a of V.anim) { try { a(now, (now - V.t0) / 1000); } catch (e) { } }
    const ppm = V.size[1] / (2 * (V.half || 12)) * cam.zoom; V.ppm = ppm; for (const l of labelsOf(root)) { const vis = (l.userData.minPpm == null || ppm >= l.userData.minPpm) && (l.userData.maxPpm == null || ppm <= l.userData.maxPpm); if (l.visible !== vis) l.visible = vis; }
    renderer.render(scene, cam); labels.render(scene, cam);
  }
  V.start = () => { if (V.started) return; V.started = true; V.resize(); loop(); };
  V.dispose = () => { V.alive = false; try { V.ro.disconnect(); } catch (e) { } controls.dispose(); V.clear(); renderer.dispose(); try { host.innerHTML = ''; } catch (e) { } };
  V.snapshot = () => renderer.domElement.toDataURL('image/png');
  return V;
}
const LABS = new WeakMap();
function labelsOf(root) { let L = LABS.get(root); if (!L || L.n !== root.children.length) { L = []; root.traverse(c => { if (c.isCSS2DObject) L.push(c); }); L.n = root.children.length; LABS.set(root, L); } return L; }
function setHover(V, ob) {
  if (V.hovered) { V.hovered.traverse(c => { if (c.isMesh && c.userData.em0 !== undefined) { c.material = c.userData.m0; delete c.userData.em0; delete c.userData.m0; } }); }
  V.hovered = ob; V.renderer.domElement.style.cursor = ob ? 'pointer' : '';
  if (ob) { ob.traverse(c => { if (c.isMesh && !c.isInstancedMesh && c.material && c.material.isMeshStandardMaterial && !c.material.map) { c.userData.m0 = c.material; c.userData.em0 = 1; const m = c.material.clone(); m.emissive = new THREE.Color(PAL.violet); m.emissiveIntensity = 0.22; c.material = m; } }); }
  if (V.onHover) V.onHover(ob ? ob.userData.aria : null, ob);
}
export function disposeDeep(o) { o.traverse(c => { if (c.isMesh) { if (c.geometry && !GEOS.has(c.geometry)) { } if (c.material && !isCached(c.material)) { if (c.material.map && !AVT.has(c.material.map)) c.material.map.dispose(); c.material.dispose(); } } if (c.isCSS2DObject && c.element && c.element.parentNode) c.element.parentNode.removeChild(c.element); }); }
function isCached(m) { for (const v of MATS.values()) if (v === m) return true; return false; }
/* ── styles des étiquettes et du conteneur ── */
export function injectCSS() {
  if (typeof document === 'undefined' || document.getElementById('m3d-core-css')) return; const s = document.createElement('style'); s.id = 'm3d-core-css'; s.textContent = `
.m3d-host{position:relative;overflow:hidden;border-radius:14px;background:#EEF0F7;touch-action:none;user-select:none;-webkit-user-select:none}
.m3d-host canvas{display:block;width:100%!important;height:100%!important}
.m3d-labels{position:absolute;inset:0;pointer-events:none;overflow:hidden}
.m3d-lab{font-family:${FONT};font-size:12.5px;line-height:16px;font-weight:700;color:#1B1530;background:rgba(255,255,255,.94);border:1px solid #D6CEF2;border-radius:999px;padding:3px 9px;white-space:nowrap;box-shadow:0 2px 6px rgba(43,27,90,.10);pointer-events:none;transform-origin:50% 100%}
.m3d-lab.big{font-size:14px;line-height:18px;padding:5px 12px;border-width:1.5px;border-color:#5E46B8}
.m3d-lab.soft{background:rgba(255,255,255,.72);border-color:transparent;color:#4A4560;font-weight:600;box-shadow:none}
.m3d-lab.ok{background:#DDF1EC;color:#0E6B5C;border-color:#9FD2C5}.m3d-lab.warn{background:#FFF0D2;color:#7A4A00;border-color:#E8C98E}.m3d-lab.bad{background:#FBE6E4;color:#A3221F;border-color:#E9A9A4}.m3d-lab.nuit{background:#2B1B5A;color:#fff;border-color:#2B1B5A}
.m3d-lab small{display:block;font-weight:600;color:#57526B;font-size:11.5px;line-height:14px}.m3d-lab.nuit small{color:#D6CEF2}
.m3d-lab .ic{display:inline-block;width:8px;height:8px;border-radius:50%;margin-right:5px;vertical-align:1px}
`; document.head.appendChild(s);
}
