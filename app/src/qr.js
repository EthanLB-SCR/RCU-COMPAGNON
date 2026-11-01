// qr.js — 01/11 soir : QR codes (lien de première connexion à scanner sur le chantier). Encodeur : qrcode-generator (MIT, Kazuhiko Arase), sans réseau.
// Rendu SVG net (un chemin par ligne de modules), fond blanc et marge de 4 modules (lisible par l'appareil photo d'un téléphone, même de loin).
import qrcode from 'qrcode-generator';
qrcode.stringToBytes = qrcode.stringToBytesFuncs['UTF-8'];
export function qrSVG(text, px, o) {
  o = o || {}; const q = qrcode(0, o.ecc || 'M'); q.addData(String(text), 'Byte'); q.make();
  const n = q.getModuleCount(), m = o.margin == null ? 4 : o.margin, N = n + 2 * m; let d = '';
  for (let r = 0; r < n; r++) { let c = 0; while (c < n) { if (q.isDark(r, c)) { let c2 = c; while (c2 < n && q.isDark(r, c2)) c2++; d += `M${c + m} ${r + m}h${c2 - c}v1h${c - c2}z`; c = c2; } else c++; } }
  const esc = s => String(s).replace(/[&<>"]/g, ch => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' })[ch]);
  return `<svg class="qrSvg" viewBox="0 0 ${N} ${N}" width="${px || 220}" height="${px || 220}" shape-rendering="crispEdges" role="img" aria-label="${esc(o.label || 'QR code')}"><rect width="${N}" height="${N}" fill="#fff"/><path d="${d}" fill="#000"/></svg>`;
}
