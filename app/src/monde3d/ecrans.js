// monde3d/ecrans.js — LES ÉCRANS DU POSTE (accueil 3D) — 08/11/2026 : « rends cet écran fonctionnel autant qu'il est design ».
// Écran 1 = tableau de bord (tuiles chiffrées + « À faire »), écran 2 = mes chantiers (avancement). Données réelles passées par la scène.
// Chaque tuile / ligne est une ZONE cliquable : le clic sur l'écran est traduit (coordonnées de texture) en action de l'appli ; survol = surbrillance + bulle.
import { THREE, FONT } from './core.js';
const SEV = { bad: '#FF6B6B', warn: '#F5BE4F', or: '#F5BE4F', info: '#86B6FF', ok: '#62D3B2' };
const rr = (g, x, y, w, h, r) => { g.beginPath(); g.roundRect(x, y, w, h, r); };
const fit = (g, t, maxW) => { let s = String(t == null ? '' : t); if (g.measureText(s).width <= maxW) return s; while (s.length > 1 && g.measureText(s + '…').width > maxW) s = s.slice(0, -1); return s + '…'; };
const W = 1024, H = 600;
/**
 * ecran(kind, D) → { tex, zones, size, redraw(survol) }
 * kind 'tableau' : D = { prenom, date, tiles:[{v,l,col,pick,label}], todo:[{t,s,sev,pick}], accent }
 * kind 'chantiers' : D = { chantiers:[{nom, ville, pct, team, alerts, pick}], more:{pick,label} }
 * kind 'verrou' : D = { prenom }
 * Une zone = { x0, y0, x1, y1 (pixels de l'écran), pick:{type,…}, label }.
 */
export function ecran(kind, D) {
  const c = document.createElement('canvas'); c.width = W; c.height = H; const g = c.getContext('2d'); const tex = new THREE.CanvasTexture(c); tex.colorSpace = THREE.SRGBColorSpace; tex.anisotropy = 8;
  const zones = []; const zone = (x, y, w, h, pick, label) => { zones.push({ x0: x, y0: y, x1: x + w, y1: y + h, pick, label }); return zones.length - 1; };
  const draw = hv => {
    zones.length = 0; g.clearRect(0, 0, W, H); g.textBaseline = 'alphabetic'; g.textAlign = 'left';
    if (kind === 'chantiers') drawChantiers(g, D || {}, zone, hv); else if (kind === 'verrou') drawVerrou(g, D || {}); else drawTableau(g, D || {}, zone, hv);
    tex.needsUpdate = true;
  };
  draw(-1); return { tex, zones, size: [W, H], redraw: draw };
}
/** zone sous un point de texture (uv three.js : origine en bas à gauche) */
export function zoneAt(zones, size, uv) { if (!uv || !zones) return -1; const x = uv.x * size[0], y = (1 - uv.y) * size[1]; for (let i = 0; i < zones.length; i++) { const z = zones[i]; if (x >= z.x0 && x <= z.x1 && y >= z.y0 && y <= z.y1) return i; } return -1; }
function fond(g, a, b) { const G = g.createLinearGradient(0, 0, W, H); G.addColorStop(0, a); G.addColorStop(1, b); g.fillStyle = G; g.fillRect(0, 0, W, H); g.fillStyle = 'rgba(255,255,255,.035)'; for (let x = 16; x < W; x += 32) for (let y = 16; y < H; y += 32) g.fillRect(x, y, 2, 2); }
function chevron(g, x, y, col) { g.strokeStyle = col || 'rgba(255,255,255,.55)'; g.lineWidth = 4; g.lineCap = 'round'; g.beginPath(); g.moveTo(x - 6, y - 10); g.lineTo(x + 3, y); g.lineTo(x - 6, y + 10); g.stroke(); }
function drawTableau(g, D, zone, hv) {
  fond(g, '#20154A', '#3B2A86'); const acc = D.accent || '#8E7AD6';
  // en-tête
  g.fillStyle = 'rgba(255,255,255,.07)'; g.fillRect(0, 0, W, 70); g.fillStyle = '#FFFFFF'; g.font = `800 32px ${FONT}`; g.fillText('Tracé', 30, 47); g.fillStyle = '#D6CEF2'; g.font = `600 26px ${FONT}`; g.fillText(fit(g, 'Bonjour ' + (D.prenom || ''), 520), 140, 47);
  g.textAlign = 'right'; g.fillStyle = '#B9AEE6'; g.font = `600 22px ${FONT}`; g.fillText(D.date || '', W - 30, 46); g.textAlign = 'left';
  // tuiles chiffrées
  const T = (D.tiles || []).slice(0, 4); const n = Math.max(1, T.length), gap = 16, x0 = 26, tw = (W - 2 * x0 - (n - 1) * gap) / n, ty = 86, th = 150;
  T.forEach((t, i) => { const x = x0 + i * (tw + gap); const zi = t.pick ? zone(x, ty, tw, th, t.pick, t.label || t.l) : -1; const on = zi >= 0 && zi === hv;
    rr(g, x, ty, tw, th, 18); g.fillStyle = on ? 'rgba(255,255,255,.22)' : 'rgba(255,255,255,.10)'; g.fill(); if (on) { g.lineWidth = 4; g.strokeStyle = acc; g.stroke(); }
    g.fillStyle = t.col || '#FFFFFF'; g.font = `800 66px ${FONT}`; g.fillText(String(t.v == null ? '—' : t.v), x + 22, ty + 82); g.fillStyle = '#E6E1F6'; g.font = `600 22px ${FONT}`; g.fillText(fit(g, t.l, tw - 44), x + 22, ty + 124);
    if (t.pick) chevron(g, x + tw - 24, ty + 30, on ? '#FFFFFF' : 'rgba(255,255,255,.45)'); });
  // À faire
  const L = (D.todo || []).slice(0, 4); g.fillStyle = '#FFFFFF'; g.font = `700 24px ${FONT}`; g.fillText('À faire' + (D.todoN != null ? ' · ' + D.todoN : ''), 30, 284);
  if (!L.length) { g.fillStyle = '#9FE3CC'; g.font = `700 30px ${FONT}`; g.textAlign = 'center'; g.fillText('✓ Tu es à jour', W / 2, 420); g.textAlign = 'left'; return; }
  L.forEach((t, i) => { const y = 300 + i * 72, x = 26, w = W - 52, h = 62; const zi = t.pick ? zone(x, y, w, h, t.pick, t.t) : -1; const on = zi >= 0 && zi === hv;
    rr(g, x, y, w, h, 14); g.fillStyle = on ? 'rgba(255,255,255,.20)' : 'rgba(255,255,255,.06)'; g.fill(); if (on) { g.lineWidth = 3; g.strokeStyle = acc; g.stroke(); }
    g.fillStyle = SEV[t.sev] || SEV.info; g.beginPath(); g.arc(x + 26, y + h / 2, 8, 0, 7); g.fill();
    g.fillStyle = '#FFFFFF'; g.font = `700 23px ${FONT}`; g.fillText(fit(g, t.t, w - 130), x + 48, y + 28); if (t.s) { g.fillStyle = '#CFC6F0'; g.font = `500 18px ${FONT}`; g.fillText(fit(g, t.s, w - 130), x + 48, y + 51); }
    if (t.pick) chevron(g, x + w - 26, y + h / 2, on ? '#FFFFFF' : 'rgba(255,255,255,.45)'); });
}
function drawChantiers(g, D, zone, hv) {
  fond(g, '#0F223E', '#1D3D6B'); const L = (D.chantiers || []).slice(0, 5);
  g.fillStyle = 'rgba(255,255,255,.07)'; g.fillRect(0, 0, W, 70); g.fillStyle = '#FFFFFF'; g.font = `800 30px ${FONT}`; g.fillText('Mes chantiers' + (D.n != null ? ' · ' + D.n : ''), 30, 46);
  if (D.more) { const bw = 190, bx = W - bw - 22, by = 14; const zi = zone(bx, by, bw, 44, D.more.pick, D.more.label || 'Tous les chantiers'); const on = zi === hv; rr(g, bx, by, bw, 44, 22); g.fillStyle = on ? '#FFFFFF' : 'rgba(255,255,255,.14)'; g.fill(); g.fillStyle = on ? '#1D3D6B' : '#FFFFFF'; g.font = `700 20px ${FONT}`; g.textAlign = 'center'; g.fillText('Tout voir  ›', bx + bw / 2, by + 29); g.textAlign = 'left'; }
  if (!L.length) { g.fillStyle = '#A9C4EA'; g.font = `600 28px ${FONT}`; g.textAlign = 'center'; g.fillText('Aucun chantier en cours', W / 2, 320); g.textAlign = 'left'; return; }
  L.forEach((c, i) => { const x = 22, y = 86 + i * 102, w = W - 44, h = 92; const zi = c.pick ? zone(x, y, w, h, c.pick, c.nom) : -1; const on = zi >= 0 && zi === hv;
    rr(g, x, y, w, h, 16); g.fillStyle = on ? 'rgba(255,255,255,.20)' : 'rgba(255,255,255,.08)'; g.fill(); if (on) { g.lineWidth = 3; g.strokeStyle = '#86B6FF'; g.stroke(); }
    g.fillStyle = '#FFFFFF'; g.font = `700 26px ${FONT}`; g.fillText(fit(g, c.nom, 560), x + 24, y + 36); g.fillStyle = '#A9C4EA'; g.font = `500 19px ${FONT}`; g.fillText(fit(g, [c.ville, c.team ? c.team + ' sur place' : ''].filter(Boolean).join(' · '), 560), x + 24, y + 62);
    const bx = x + 600, bw = 250, by = y + 40; rr(g, bx, by, bw, 14, 7); g.fillStyle = 'rgba(255,255,255,.16)'; g.fill(); const p = Math.max(0, Math.min(100, +c.pct || 0)); if (p > 0) { rr(g, bx, by, Math.max(14, bw * p / 100), 14, 7); g.fillStyle = p >= 70 ? '#62D3B2' : '#86B6FF'; g.fill(); }
    g.fillStyle = '#FFFFFF'; g.font = `800 26px ${FONT}`; g.textAlign = 'right'; g.fillText(c.pct == null ? '—' : p + ' %', x + w - 46, y + 54); g.textAlign = 'left';
    if (c.alerts) { g.fillStyle = '#FF6B6B'; g.beginPath(); g.arc(bx - 26, by + 7, 14, 0, 7); g.fill(); g.fillStyle = '#FFFFFF'; g.font = `800 18px ${FONT}`; g.textAlign = 'center'; g.fillText(String(c.alerts), bx - 26, by + 13); g.textAlign = 'left'; }
    if (c.pick) chevron(g, x + w - 20, y + h / 2, on ? '#FFFFFF' : 'rgba(255,255,255,.4)'); });
}
function drawVerrou(g, D) {
  fond(g, '#1B1530', '#2B1B5A'); g.textAlign = 'center'; g.fillStyle = '#FFFFFF'; g.font = `800 86px ${FONT}`; const t = new Date(); g.fillText(String(t.getHours()).padStart(2, '0') + ':' + String(t.getMinutes()).padStart(2, '0'), W / 2, 270);
  g.fillStyle = '#D6CEF2'; g.font = `600 28px ${FONT}`; g.fillText('🔒 Session de ' + (D.prenom || ''), W / 2, 340); g.textAlign = 'left';
}
