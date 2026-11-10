// monde3d/ecrans.js — LES ÉCRANS DU POSTE (accueil 3D) — 08/11/2026 : « rends cet écran fonctionnel autant qu'il est design ».
// Écran 1 = tableau de bord (tuiles chiffrées + « À faire »), écran 2 = mes chantiers (avancement). Données réelles passées par la scène.
// Chaque tuile / ligne est une ZONE cliquable : le clic sur l'écran est traduit (coordonnées de texture) en action de l'appli ; survol = surbrillance + bulle.
import { THREE, FONT } from './core.js';
import { icone } from '../icones.js';
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
  const SC = 2; const c = document.createElement('canvas'); c.width = W * SC; c.height = H * SC; const g = c.getContext('2d'); const tex = new THREE.CanvasTexture(c); tex.colorSpace = THREE.SRGBColorSpace; tex.anisotropy = 16; /* 09/11 : dessin en double définition (2048 × 1200) — net quand on zoome ; les zones restent en 1024 × 600 */
  const zones = []; const zone = (x, y, w, h, pick, label) => { zones.push({ x0: x, y0: y, x1: x + w, y1: y + h, pick, label }); return zones.length - 1; };
  const st = { scroll: 0, max: 0 }; /* défilement (liste « À faire ») : pixels d'écran */
  const draw = hv => {
    zones.length = 0; g.setTransform(SC, 0, 0, SC, 0, 0); g.clearRect(0, 0, W, H); g.textBaseline = 'alphabetic'; g.textAlign = 'left'; D = D || {}; D._st = st;
    if (kind === 'chantiers') drawChantiers(g, D || {}, zone, hv); else if (kind === 'afaire') drawAfaire(g, D || {}, zone, hv); else if (kind === 'asavoir') drawAsavoir(g, D || {}, zone, hv); else if (kind === 'veleda') drawVeleda(g, D || {}, zone, hv); else if (kind === 'jour') drawJour(g, D || {}, zone, hv); else if (kind === 'verrou') drawVerrou(g, D || {}); else if (kind === 'modules') drawModules(g, D || {}, zone, hv); else drawTableau(g, D || {}, zone, hv);
    tex.needsUpdate = true;
  };
  draw(-1); const scrollBy = dy => { if (!st.max) return false; const before = st.scroll; st.scroll = Math.max(0, Math.min(st.max, st.scroll + dy * 1.6)); if (st.scroll !== before) draw(-1); return true; }; return { tex, zones, size: [W, H], redraw: draw, scrollBy, state: st };
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
/** les tuiles « Espaces » de l'appli, telles quelles : tuile blanche à coins ronds, carré Nuit avec l'icône de la charte en trait blanc, nom du module, pastille orange */
const ICO_CACHE = new Map();
function iconPaths(k) { let p = ICO_CACHE.get(k); if (p) return p; p = []; try { const svg = icone(k, 24); for (const m of svg.matchAll(/<path d="([^"]+)"([^>]*)>/g)) p.push({ d: new Path2D(m[1]), fill: /fill="currentColor"/.test(m[2]) }); } catch (e) { } ICO_CACHE.set(k, p); return p; }
function drawIcon(g, k, cx, cy, size, color) { const P = iconPaths(k); g.save(); g.translate(cx - size / 2, cy - size / 2); g.scale(size / 24, size / 24); g.strokeStyle = color; g.fillStyle = color; g.lineWidth = 1.75; g.lineCap = 'round'; g.lineJoin = 'round'; P.forEach(p => { if (p.fill) g.fill(p.d); else g.stroke(p.d); }); g.restore(); return P.length > 0; }
function drawModules(g, D, zone, hv) {
  g.fillStyle = '#F5F4FA'; g.fillRect(0, 0, W, H); /* le fond de l'appli */
  g.fillStyle = '#FFFFFF'; g.fillRect(0, 0, W, 64); g.fillStyle = '#2B1B5A'; g.fillRect(0, 62, W, 3); g.fillStyle = '#2B1B5A'; g.font = `800 28px ${FONT}`; g.fillText('Tracé', 30, 43); g.fillStyle = '#5E46B8'; g.font = `600 22px ${FONT}`; g.fillText('Espaces', 128, 43); g.textAlign = 'right'; g.fillStyle = '#57526B'; g.font = `600 20px ${FONT}`; g.fillText(D.date || '', W - 30, 43); g.textAlign = 'left';
  const L = (D.modules || []).slice(0, 12); const cols = 4, /* 09/11 : tous les espaces de la personne (jusqu'à 12, sur 3 rangées) — la grille « Espaces » sous la pièce n'existe plus */ rows = Math.max(1, Math.ceil(L.length / cols)); const gx = 22, gy = 20, tw = (W - 2 * 30 - (cols - 1) * gx) / cols, th = Math.min(220, (H - 64 - 44 - (rows - 1) * gy) / rows);
  L.forEach((m, i) => { const c = i % cols, r = Math.floor(i / cols); const x = 30 + c * (tw + gx), y = 84 + r * (th + gy); const zi = zone(x, y, tw, th, m.pick, 'Ouvrir ' + m.t); const on = zi === hv;
    g.save(); g.shadowColor = 'rgba(20,20,10,.10)'; g.shadowBlur = 24; g.shadowOffsetY = 8; rr(g, x, y, tw, th, 28); g.fillStyle = on ? '#EFEBFA' : '#FFFFFF'; g.fill(); g.restore(); if (on) { g.lineWidth = 4; g.strokeStyle = '#5E46B8'; rr(g, x, y, tw, th, 28); g.stroke(); }
    const sq = Math.round(th * 0.44); const sx = x + tw / 2 - sq / 2, sy = y + 24; rr(g, sx, sy, sq, sq, Math.round(sq * 0.25)); g.fillStyle = '#2B1B5A'; g.fill();
    if (!drawIcon(g, m.k || '', sx + sq / 2, sy + sq / 2, Math.round(sq * 0.58), '#FFFFFF')) { g.fillStyle = '#FFFFFF'; g.font = `${Math.round(sq * 0.5)}px ${FONT}`; g.textAlign = 'center'; g.fillText(m.ic || '›', sx + sq / 2, sy + sq * 0.68); g.textAlign = 'left'; }
    g.fillStyle = '#1B1530'; g.font = `700 ${Math.round(th * 0.115)}px ${FONT}`; g.textAlign = 'center'; g.fillText(fit(g, m.t, tw - 20), x + tw / 2, y + th - 26); g.textAlign = 'left';
    if (m.n) { const bw = Math.max(34, 16 + String(m.n).length * 14), bx = x + tw - 14 - bw, by = y + 14; rr(g, bx, by, bw, 30, 15); g.fillStyle = '#EB6834'; g.fill(); g.fillStyle = '#FFFFFF'; g.font = `800 18px ${FONT}`; g.textAlign = 'center'; g.fillText(String(m.n), bx + bw / 2, by + 21); g.textAlign = 'left'; } });
  g.fillStyle = '#8E87A6'; g.font = `600 17px ${FONT}`; g.textAlign = 'center'; g.fillText('Touche un module pour l\'ouvrir', W / 2, H - 14); g.textAlign = 'left';
}
/** l'écran « À faire » : la liste de l'accueil de l'appli, telle quelle (cartes blanches, liseré de gravité, icône sur fond pâle, titre, détail, échéance, chevron) */
const SEV_BORDER = { bad: '#c0392b', warn: '#c08a2e', or: '#eb6834', info: '#2a78d6', ok: '#15673a' }, SEV_ICBG = { bad: '#fdeae7', warn: '#fff4d6', or: '#fdebe3', info: '#e8f0fb', ok: '#e6f5ec' };
function drawAfaire(g, D, zone, hv) {
  g.fillStyle = '#F5F4FA'; g.fillRect(0, 0, W, H); const L = (D.todoAll || D.todo || []); const n = L.length; const st = D._st || { scroll: 0, max: 0 };
  const rowH = 112, gap = 12, top = 84; const listH = H - top - 14; const total = n * (rowH + gap) - gap; st.max = Math.max(0, total - listH); st.scroll = Math.max(0, Math.min(st.max, st.scroll || 0));
  if (!n) { g.fillStyle = '#1B1530'; g.font = `800 30px ${FONT}`; g.fillText('À faire', 30, 50); rr(g, 30, 84, W - 60, 70, 18); g.fillStyle = '#e6f5ec'; g.fill(); g.fillStyle = '#15673a'; g.font = `700 22px ${FONT}`; g.fillText('✓ Tu es à jour — rien n\'attend de toi.', 52, 127); return; }
  // la liste (découpée sous l'en-tête, qui reste fixe)
  g.save(); g.beginPath(); g.rect(0, top, W, listH); g.clip();
  L.forEach((t, i) => { const x = 30, y = top + i * (rowH + gap) - st.scroll, w = W - 60 - (st.max ? 18 : 0); if (y + rowH < top || y > H) return; const zi = t.pick ? zone(x, Math.max(top, y), w, Math.min(rowH, y + rowH - Math.max(top, y)), t.pick, t.t) : -1; const on = zi >= 0 && zi === hv;
    g.save(); g.shadowColor = 'rgba(20,20,10,.09)'; g.shadowBlur = 22; g.shadowOffsetY = 8; rr(g, x, y, w, rowH, 20); g.fillStyle = on ? '#EFEBFA' : '#FFFFFF'; g.fill(); g.restore();
    g.save(); rr(g, x, y, w, rowH, 20); g.clip(); g.fillStyle = SEV_BORDER[t.sev] || 'transparent'; g.fillRect(x, y, 7, rowH); g.restore(); if (on) { g.lineWidth = 3; g.strokeStyle = '#5E46B8'; rr(g, x, y, w, rowH, 20); g.stroke(); }
    const ix = x + 24, iy = y + rowH / 2 - 32; rr(g, ix, iy, 64, 64, 18); g.fillStyle = SEV_ICBG[t.sev] || SEV_ICBG.info; g.fill(); g.font = `34px ${FONT}`; g.textAlign = 'center'; g.fillStyle = '#1B1530'; g.fillText(t.ic || '•', ix + 32, iy + 44); g.textAlign = 'left';
    if (t.sev === 'bad' || t.sev === 'or' || t.sev === 'warn') { g.fillStyle = '#eb6834'; g.beginPath(); g.arc(ix + 62, iy + 3, 8, 0, 7); g.fill(); g.lineWidth = 3; g.strokeStyle = '#fff'; g.stroke(); }
    const tx = x + 108, tw = w - 108 - 170; g.fillStyle = '#1B1530'; g.font = `700 27px ${FONT}`; g.fillText(fit(g, t.t, tw), tx, y + (t.s ? 46 : 66)); if (t.s) { g.fillStyle = '#57526B'; g.font = `500 21px ${FONT}`; g.fillText(fit(g, t.s, tw), tx, y + 80); }
    if (t.when) { g.fillStyle = '#8E87A6'; g.font = `600 18px ${FONT}`; g.textAlign = 'right'; g.fillText(fit(g, t.when, 140), x + w - 56, y + 38); g.textAlign = 'left'; }
    chevron(g, x + w - 26, y + rowH / 2, on ? '#5E46B8' : '#B9B3CC'); });
  g.restore();
  // en-tête fixe
  g.fillStyle = '#F5F4FA'; g.fillRect(0, 0, W, top - 6); g.fillStyle = '#1B1530'; g.font = `800 30px ${FONT}`; g.fillText('À faire', 30, 50);
  const pill = n + ' action' + (n > 1 ? 's' : '') + ' attendue' + (n > 1 ? 's' : '') + ' de toi'; g.font = `700 17px ${FONT}`; const pw = g.measureText(pill).width + 28; rr(g, W - 30 - pw, 24, pw, 34, 17); g.fillStyle = '#fdebe3'; g.fill(); g.fillStyle = '#9a3410'; g.textAlign = 'center'; g.fillText(pill, W - 30 - pw / 2, 47); g.textAlign = 'left';
  // ascenseur (la molette sur l'écran fait défiler ; les flèches aussi)
  if (st.max) { const bx = W - 30 - 10, by = top, bh = listH; rr(g, bx, by, 10, bh, 5); g.fillStyle = 'rgba(43,27,90,.08)'; g.fill(); const th = Math.max(40, bh * listH / total), ty = by + (bh - th) * (st.scroll / st.max); rr(g, bx, ty, 10, th, 5); g.fillStyle = '#8E7AD6'; g.fill();
    const up = zone(W - 30 - 56, H - 50, 46, 40, { type: 'scroll', dir: -1 }, 'Remonter'), dn = zone(W - 30 - 2 - 46 + 2, H - 50, 46, 40, { type: 'scroll', dir: 1 }, 'Descendre'); [[up, W - 30 - 56, '▲'], [dn, W - 30 - 46, '▼']].forEach(([zi, x, ch]) => { rr(g, x, H - 50, 46, 40, 12); g.fillStyle = zi === hv ? '#2B1B5A' : '#EFEBFA'; g.fill(); g.fillStyle = zi === hv ? '#fff' : '#2B1B5A'; g.font = `800 18px ${FONT}`; g.textAlign = 'center'; g.fillText(ch, x + 23, H - 23); g.textAlign = 'left'; }); }
}
/** la télé murale « À savoir » : les tuiles de l'accueil de l'appli (icône sur fond pâle, titre, valeur), deux colonnes, défilement si besoin */
function drawAsavoir(g, D, zone, hv) {
  g.fillStyle = '#F5F4FA'; g.fillRect(0, 0, W, H); const L = D.know || []; const n = L.length; const st = D._st || { scroll: 0, max: 0 };
  const top = 84, cols = 2, gx = 14, gy = 14, tw = (W - 60 - gx) / cols, th = 120; const rows = Math.ceil(n / cols); const total = rows * (th + gy) - gy; const listH = H - top - 14; st.max = Math.max(0, total - listH); st.scroll = Math.max(0, Math.min(st.max, st.scroll || 0));
  if (!n) { g.fillStyle = '#1B1530'; g.font = `800 30px ${FONT}`; g.fillText('À savoir', 30, 50); g.fillStyle = '#57526B'; g.font = `600 22px ${FONT}`; g.fillText('Rien de nouveau de ton côté.', 30, 130); return; }
  g.save(); g.beginPath(); g.rect(0, top, W, listH); g.clip();
  L.forEach((t, i) => { const c = i % cols, r = Math.floor(i / cols); const x = 30 + c * (tw + gx), y = top + r * (th + gy) - st.scroll, w = tw - (st.max && c === cols - 1 ? 18 : 0); if (y + th < top || y > H) return; const zi = t.pick ? zone(x, Math.max(top, y), w, Math.min(th, y + th - Math.max(top, y)), t.pick, t.kl || t.t) : -1; const on = zi >= 0 && zi === hv;
    rr(g, x, y, w, th, 18); g.fillStyle = on ? '#EFEBFA' : '#FFFFFF'; g.fill(); g.lineWidth = on ? 3 : 1.5; g.strokeStyle = on ? '#5E46B8' : '#DDD8EA'; g.stroke();
    const ix = x + 16, iy = y + 18; rr(g, ix, iy, 52, 52, 14); g.fillStyle = SEV_ICBG[t.sev] || SEV_ICBG.info; g.fill(); g.font = `28px ${FONT}`; g.textAlign = 'center'; g.fillStyle = '#1B1530'; g.fillText(t.ic || '•', ix + 26, iy + 36); g.textAlign = 'left';
    const tx = x + 84, mw = w - 84 - 18; g.fillStyle = '#1B1530'; g.font = `700 22px ${FONT}`; g.fillText(fit(g, t.kl || t.t || '', mw), tx, y + 42); g.fillStyle = '#57526B'; g.font = `500 18px ${FONT}`; g.fillText(fit(g, t.kv || t.s || '', mw), tx, y + 70); if (t.wait) { g.fillStyle = '#9a3410'; g.font = `600 16px ${FONT}`; g.fillText(fit(g, '⏳ on attend ' + t.wait, mw), tx, y + 98); } });
  g.restore();
  g.fillStyle = '#F5F4FA'; g.fillRect(0, 0, W, top - 6); g.fillStyle = '#1B1530'; g.font = `800 30px ${FONT}`; g.fillText('À savoir', 30, 50); g.fillStyle = '#8E87A6'; g.font = `600 18px ${FONT}`; g.textAlign = 'right'; g.fillText('raccourcis · ' + n, W - 30, 48); g.textAlign = 'left';
  if (st.max) { const bx = W - 30 - 10, by = top, bh = listH; rr(g, bx, by, 10, bh, 5); g.fillStyle = 'rgba(43,27,90,.08)'; g.fill(); const thb = Math.max(40, bh * listH / total), ty = by + (bh - thb) * (st.scroll / st.max); rr(g, bx, ty, 10, thb, 5); g.fillStyle = '#8E7AD6'; g.fill(); }
}
/* ── écriture à la main (feutre, post-it) ── */
export const HAND = '"Segoe Print","Bradley Hand","Comic Neue","Comic Sans MS","Chalkboard SE",cursive';
/** découpe un texte en lignes qui tiennent dans maxW (respecte les retours à la ligne) */
export function wrapLines(g, text, maxW) { const out = []; String(text == null ? '' : text).split(/\r?\n/).forEach(par => { const words = par.split(/\s+/).filter(Boolean); if (!words.length) { out.push(''); return; } let line = ''; words.forEach(wd => { const t = line ? line + ' ' + wd : wd; if (g.measureText(t).width > maxW && line) { out.push(line); line = wd; } else line = t; }); out.push(line); }); return out; }
/** le tableau blanc « À savoir » : chaque info écrite au feutre (couleur selon la gravité), titre souligné, infos en trop annoncées en bas */
const PEN = { bad: '#C9241C', warn: '#D97A12', or: '#D97A12', info: '#2456C8', ok: '#1F7A4A' };
function drawVeleda(g, D, zone, hv) {
  const G = g.createLinearGradient(0, 0, W, H); G.addColorStop(0, '#FFFFFF'); G.addColorStop(0.5, '#F7F8FB'); G.addColorStop(1, '#EDEFF4'); g.fillStyle = G; g.fillRect(0, 0, W, H); g.fillStyle = 'rgba(255,255,255,.5)'; g.beginPath(); g.moveTo(W * 0.55, 0); g.lineTo(W, 0); g.lineTo(W, H * 0.35); g.closePath(); g.fill(); /* un reflet */
  const L = (D.know || []); const n = L.length; const pen = (c, lw) => { g.strokeStyle = c; g.fillStyle = c; g.lineWidth = lw; g.lineCap = 'round'; g.lineJoin = 'round'; };
  g.font = `700 50px ${HAND}`; pen('#1B1530', 5); g.fillText('À savoir', 44, 76); const tw = g.measureText('À savoir').width; g.beginPath(); g.moveTo(42, 90); g.quadraticCurveTo(42 + tw / 2, 98, 48 + tw, 88); g.stroke();
  if (D.date) { g.textAlign = 'right'; g.font = `600 26px ${HAND}`; g.fillStyle = '#5B6270'; g.fillText(D.date, W - 44, 70); g.textAlign = 'left'; }
  if (!n) { g.font = `600 34px ${HAND}`; g.fillStyle = '#2456C8'; g.fillText('Rien de nouveau de ton côté ✓', 60, 190); return; }
  const maxRows = 7; const rowH = 66; let y = 150; const shown = L.slice(0, maxRows);
  shown.forEach((t, i) => { const col = PEN[t.sev] || PEN.info; const zi = t.pick ? zone(36, y - 44, W - 72, rowH - 4, t.pick, t.kl || t.t) : -1; const on = zi >= 0 && zi === hv;
    if (on) { rr(g, 36, y - 44, W - 72, rowH - 4, 14); g.fillStyle = 'rgba(94,70,184,.10)'; g.fill(); }
    pen(col, 4); g.beginPath(); g.arc(62, y - 12, 9, 0.3, 6.1); g.stroke(); /* puce dessinée à la main */
    g.font = `700 31px ${HAND}`; g.fillStyle = col; const head = fit(g, (t.kl || t.t || ''), 380); g.fillText(head, 88, y); const hw = g.measureText(head).width;
    g.font = `600 28px ${HAND}`; g.fillStyle = '#1B1530'; const val = (t.kv || t.s || '') + (t.wait ? '  — on attend ' + t.wait : ''); g.fillText(fit(g, (val ? ': ' : '') + val, W - 88 - hw - 70), 88 + hw + 8, y);
    if (t.pick) chevron(g, W - 54, y - 12, on ? '#5E46B8' : 'rgba(27,21,48,.25)'); y += rowH; });
  if (n > maxRows) { g.font = `600 26px ${HAND}`; g.fillStyle = '#5B6270'; const more = '+ ' + (n - maxRows) + ' autre' + (n - maxRows > 1 ? 's' : '') + ' chose' + (n - maxRows > 1 ? 's' : '') + ' à savoir ›'; const zi = D.morePick ? zone(36, y - 36, 500, 46, D.morePick, 'Tout voir') : -1; if (zi === hv) g.fillStyle = '#5E46B8'; g.fillText(more, 60, y - 4); }
  g.font = `500 20px ${HAND}`; g.fillStyle = '#9AA1AE'; g.textAlign = 'right'; g.fillText('clique une ligne pour l\'ouvrir', W - 44, H - 22); g.textAlign = 'left';
}
/* 10/11 (Ethan : « un grand tableau blanc en deux parties : À savoir en haut, Ma journée en bas — l'agenda du jour et des tâches comme les notes, avec rappel »)
   Partie basse du tableau : dessinée dans les JOUR_H premiers pixels (proportions de la partie basse), au feutre comme « À savoir ».
   D = { date, now:'HH:MM', rdv:[{id, h, t, src, pick}], taches:[{id, t, c, done, due, r, h, pick}], addPick } */
export const JOUR_H = 430;
function drawJour(g, D, zone, hv) {
  const HH = JOUR_H; const G = g.createLinearGradient(0, 0, W, HH); G.addColorStop(0, '#FFFFFF'); G.addColorStop(0.5, '#F7F8FB'); G.addColorStop(1, '#EDEFF4'); g.fillStyle = G; g.fillRect(0, 0, W, HH);
  const pen = (c, lw) => { g.strokeStyle = c; g.fillStyle = c; g.lineWidth = lw; g.lineCap = 'round'; g.lineJoin = 'round'; };
  g.font = `700 46px ${HAND}`; pen('#1B1530', 5); g.fillText('Ma journée', 44, 66); const tw = g.measureText('Ma journée').width; g.beginPath(); g.moveTo(42, 80); g.quadraticCurveTo(42 + tw / 2, 88, 48 + tw, 78); g.stroke();
  if (D.date) { g.textAlign = 'right'; g.font = `600 24px ${HAND}`; g.fillStyle = '#5B6270'; g.fillText(D.date, W - 44, 60); g.textAlign = 'left'; }
  // agenda (gauche, au feutre vert) : heure en gros, titre ; passé barré ; le prochain souligné
  const R = (D.rdv || []).slice(0, 5), T = (D.taches || []).slice(0, 6); const now = D.now || ''; let y = 128; let nextDone = false;
  g.font = `700 22px ${HAND}`; g.fillStyle = '#2E7D55'; g.fillText('AGENDA', 48, 108);
  if (!R.length) { g.font = `600 26px ${HAND}`; g.fillStyle = '#9AA1AE'; g.fillText('Rien de prévu — ＋ pour ajouter', 48, y + 10); }
  R.forEach(r => { const past = now && r.h && r.h < now; const isNext = !past && !nextDone; if (isNext) nextDone = true;
    const zi = r.pick ? zone(36, y - 30, 470, 54, r.pick, (r.h || '') + ' ' + (r.t || '')) : -1; const on = zi >= 0 && zi === hv; if (on) { rr(g, 36, y - 30, 470, 54, 12); g.fillStyle = 'rgba(94,70,184,.12)'; g.fill(); }
    pen(r.src === 'outlook' ? '#2456C8' : '#2E7D55', 4); g.beginPath(); g.arc(58, y - 4, 8, 0.3, 6.1); g.stroke();
    g.font = `800 28px ${HAND}`; g.fillStyle = past ? '#9AA1AE' : '#1B1530'; g.fillText(r.h || '—', 80, y + 6); g.font = `600 26px ${HAND}`; const tx = fit(g, r.t || '', 330); g.fillText(tx, 164, y + 6);
    if (past) { pen('rgba(27,21,48,.45)', 3); g.beginPath(); g.moveTo(162, y - 4); g.lineTo(164 + g.measureText(tx).width, y - 6); g.stroke(); } else if (isNext) { pen('#2E7D55', 3); g.beginPath(); g.moveTo(164, y + 14); g.quadraticCurveTo(164 + g.measureText(tx).width / 2, y + 20, 164 + g.measureText(tx).width, y + 12); g.stroke(); }
    y += 56; });
  // tâches (droite) : post-its collés sur le tableau, de travers ; faites = cochées et pâles ; rappel arrivé = cadre rouge et cloche
  const NC = ['#FFDC4A', '#FFA9C0', '#8FC5FF', '#9FE39B', '#FFBE6E']; const cols = 3, cw = 140, chh = 128, x0 = 548, y0 = 96;
  T.forEach((t, i) => { const cx = x0 + (i % cols) * (cw + 16), cy = y0 + Math.floor(i / cols) * (chh + 16); const rot = ((i * 37) % 11 - 5) * 0.014; const col = NC[t.c] || NC[0];
    const zi = t.pick ? zone(cx, cy, cw, chh, t.pick, t.t) : -1; const on = zi >= 0 && zi === hv;
    g.save(); g.translate(cx + cw / 2, cy + chh / 2); g.rotate(rot); g.fillStyle = 'rgba(0,0,0,.18)'; g.fillRect(-cw / 2 + 3, -chh / 2 + 5, cw, chh); g.fillStyle = t.done ? '#EDE9DF' : col; g.fillRect(-cw / 2, -chh / 2, cw, chh); g.fillStyle = 'rgba(0,0,0,.06)'; g.fillRect(-cw / 2, -chh / 2, cw, chh * 0.14);
    if (on) { g.strokeStyle = '#5E46B8'; g.lineWidth = 4; g.strokeRect(-cw / 2, -chh / 2, cw, chh); } if (t.due) { g.strokeStyle = '#C8382F'; g.lineWidth = 5; g.strokeRect(-cw / 2 + 3, -chh / 2 + 3, cw - 6, chh - 6); }
    g.font = `700 20px ${HAND}`; g.fillStyle = t.done ? '#9AA1AE' : '#1B1530'; const words = String(t.t || '').split(/\s+/); const lines = []; let cur = '';
    words.forEach(w => { const tt = cur ? cur + ' ' + w : w; if (g.measureText(tt).width > cw - 22 && cur) { lines.push(cur); cur = w; } else cur = tt; }); if (cur) lines.push(cur); lines.slice(0, 3).forEach((l, k) => g.fillText(k === 2 && lines.length > 3 ? fit(g, l + '…', cw - 22) : l, -cw / 2 + 11, -chh / 2 + 44 + k * 25));
    if (t.done) { g.strokeStyle = '#2E7D55'; g.lineWidth = 4; g.lineCap = 'round'; g.beginPath(); g.moveTo(-cw / 2 + 12, chh / 2 - 24); g.lineTo(-cw / 2 + 22, chh / 2 - 14); g.lineTo(-cw / 2 + 40, chh / 2 - 36); g.stroke(); }
    else if (t.h || t.r) { g.font = `700 17px ${HAND}`; g.fillStyle = t.due ? '#C8382F' : '#4A4560'; g.fillText((t.r ? '🔔 ' : '⏱ ') + (t.h || t.r || ''), -cw / 2 + 11, chh / 2 - 14); } g.restore(); });
  if (!T.length) { g.font = `600 24px ${HAND}`; g.fillStyle = '#9AA1AE'; g.fillText('Aucune tâche épinglée', x0 + 10, y0 + 60); }
  const zi = D.addPick ? zone(W - 250, HH - 64, 214, 48, D.addPick, 'Ajouter') : -1; rr(g, W - 250, HH - 64, 214, 48, 24); g.fillStyle = zi >= 0 && zi === hv ? '#4A3A9C' : '#5E46B8'; g.fill(); g.font = `700 24px ${HAND}`; g.fillStyle = '#FFFFFF'; g.textAlign = 'center'; g.fillText('＋ tâche · rendez-vous', W - 143, HH - 32); g.textAlign = 'left';
}
/** texture d'un post-it : texte manuscrit qui tient en entier (la taille de police baisse jusqu'à tenir ; au-delà, « … ») */
export function postitTex(text, colHex, res, rap) {
  const S = res || 320; const c = document.createElement('canvas'); c.width = S; c.height = S; const g = c.getContext('2d');
  g.fillStyle = colHex || '#FFE978'; g.fillRect(0, 0, S, S); g.fillStyle = 'rgba(0,0,0,.055)'; g.fillRect(0, 0, S, S * 0.13); /* la bande de colle */
  const pad = S * 0.08, maxW = S - 2 * pad, top = S * 0.13 + pad * 0.9, maxH = S - top - pad * 0.7; const txt = String(text == null ? '' : text).trim();
  let fs = Math.round(S * 0.14), lines = []; for (; fs >= Math.round(S * 0.055); fs -= 2) { g.font = `700 ${fs}px ${HAND}`; lines = wrapLines(g, txt, maxW); if (lines.length * fs * 1.22 <= maxH) break; }
  const lh = fs * 1.22; const maxN = Math.max(1, Math.floor(maxH / lh)); if (lines.length > maxN) { lines = lines.slice(0, maxN); let last = lines[maxN - 1]; while (last.length && g.measureText(last + '…').width > maxW) last = last.slice(0, -1); lines[maxN - 1] = last + '…'; }
  g.fillStyle = '#1B1530'; g.textBaseline = 'top'; lines.forEach((l, i) => g.fillText(l, pad, top + i * lh));
  if (rap && rap.label) { /* 10/11 : rappel — cloche et heure dans la bande de colle ; rouge quand l'heure est arrivée */ g.font = `700 ${Math.round(S * 0.07)}px ${FONT}`; g.textAlign = 'right'; g.textBaseline = 'middle'; g.fillStyle = rap.due ? '#C8382F' : 'rgba(27,21,48,.72)'; g.fillText('🔔 ' + rap.label, S - pad * 0.8, S * 0.065); g.textAlign = 'left'; if (rap.due) { g.strokeStyle = '#C8382F'; g.lineWidth = Math.max(3, S * 0.018); g.strokeRect(g.lineWidth / 2, g.lineWidth / 2, S - g.lineWidth, S - g.lineWidth); } }
  const tex = new THREE.CanvasTexture(c); tex.colorSpace = THREE.SRGBColorSpace; tex.anisotropy = 8; return tex;
}
function drawVerrou(g, D) {
  fond(g, '#1B1530', '#2B1B5A'); g.textAlign = 'center'; g.fillStyle = '#FFFFFF'; g.font = `800 86px ${FONT}`; const t = new Date(); g.fillText(String(t.getHours()).padStart(2, '0') + ':' + String(t.getMinutes()).padStart(2, '0'), W / 2, 270);
  g.fillStyle = '#D6CEF2'; g.font = `600 28px ${FONT}`; g.fillText('🔒 Session de ' + (D.prenom || ''), W / 2, 340); g.textAlign = 'left';
}
