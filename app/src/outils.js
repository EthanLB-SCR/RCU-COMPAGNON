// outils.js — 11/11 nuit (lot 7) — Ethan : « outils tuyauterie, premier kit (baïonnette / décalage, coupe de coude, développé de cintrage, pente, 3-4-5) ».
// Compagnon → 🧰 Outils. Cinq calculettes de terrain : gros champs (gants), clavier numérique, résultat EN DIRECT (le champ n'est jamais redessiné pendant
// qu'on tape), un schéma coté, la formule en une ligne. Tout se calcule sur l'appareil, rien n'est envoyé ; les dernières valeurs restent sur ce téléphone.
// Coudes : rayon « 3D » (grand rayon, R = 1,5 × diamètre nominal en pouces — ASME B16.9 / EN 10253 type 3D) proposé d'après le DN, modifiable.
const ID = 'outils';
const esc = s => String(s == null ? '' : s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
/* DN · diamètre extérieur du tube acier (mm, EN 10220 / EN 253) · rayon du coude 3D (mm) */
export const DN = [[20, 26.9, 28.6], [25, 33.7, 38.1], [32, 42.4, 47.6], [40, 48.3, 57.2], [50, 60.3, 76.2], [65, 76.1, 95.3], [80, 88.9, 114.3], [100, 114.3, 152.4], [125, 139.7, 190.5], [150, 168.3, 228.6], [200, 219.1, 304.8], [250, 273.0, 381.0], [300, 323.9, 457.2], [350, 355.6, 533.4], [400, 406.4, 609.6], [450, 457.0, 685.8], [500, 508.0, 762.0], [600, 610.0, 914.4]];
const dnRow = dn => DN.find(r => r[0] === +dn) || null;
const TOOLS = [
  ['baio', 'Baïonnette', 'Décalage avec deux coudes : entre-axes, avance, tube à couper'],
  ['coude', 'Coupe de coude', 'Couper un coude 90° à l\'angle voulu : longueurs à tracer'],
  ['cint', 'Développé de cintrage', 'Longueur développée, tangentes, longueur à couper'],
  ['pente', 'Pente', 'Dénivelée ↔ pente en %, ‰, mm/m et degrés'],
  ['equ', 'Équerrage 3-4-5', 'Contrôler un angle droit au mètre']
];
const DEF = { baio: { H: '', a: 45, dn: 100, R: '152,4', g: '0' }, coude: { dn: 100, D: '114,3', R: '152,4', b: 45 }, cint: { R: '', t: 90, a: '', b: '' }, pente: { L: '', p: '', u: 'pm', dh: '', mode: 'dh' }, equ: { a: '', b: '' } };
const KEY = 'trace:outils';
let S = null;
function st() { if (S) return S; let o = null; try { o = JSON.parse(localStorage.getItem(KEY) || 'null'); } catch (e) { o = null; } S = { tool: null, v: {} }; Object.keys(DEF).forEach(k => { S.v[k] = Object.assign({}, DEF[k], o && o.v && typeof o.v[k] === 'object' ? o.v[k] : {}); }); return S; }
let saveT = null; function save() { clearTimeout(saveT); saveT = setTimeout(() => { try { localStorage.setItem(KEY, JSON.stringify({ v: S.v })); } catch (e) { } }, 400); }
/** nombre saisi (virgule ou point, espaces) ; vide ou faux → NaN */
export function num(x) { if (typeof x === 'number') return x; const s = String(x == null ? '' : x).replace(/\s/g, '').replace(',', '.'); if (!s || !/^-?\d*\.?\d*$/.test(s)) return NaN; return parseFloat(s); }
const rad = d => d * Math.PI / 180, deg = r => r * 180 / Math.PI;
const ok = x => typeof x === 'number' && isFinite(x);
const f = (x, d) => ok(x) ? x.toLocaleString('fr-FR', { minimumFractionDigits: 0, maximumFractionDigits: d == null ? 1 : d }) : '—';
/* ── les calculs (exportés : tests) ── */
export const calc = {
  /** baïonnette : décalage H (mm), angle des coudes a (°), rayon R (mm), écartement de soudure g (mm, par soudure) */
  baio(v) { const H = num(v.H), a = num(v.a), R = num(v.R), g = num(v.g) || 0; if (!(H > 0) || !(a > 0 && a < 90)) return null;
    const L = H / Math.sin(rad(a)), A = H / Math.tan(rad(a)), T = R > 0 ? R * Math.tan(rad(a / 2)) : NaN; const tube = ok(T) ? L - 2 * T - 2 * g : NaN;
    return { L, A, T, tube, court: ok(tube) && tube < 0 }; },
  /** coupe d'un coude 90° à l'angle b (°) : longueurs à tracer depuis le bout du coude, sur l'extrados, l'axe et l'intrados */
  coude(v) { const D = num(v.D), R = num(v.R), b = num(v.b); if (!(R > 0) || !(b > 0 && b < 90)) return null; const k = rad(b); const r2 = ok(D) && D > 0 ? D / 2 : NaN;
    return { ext: ok(r2) ? (R + r2) * k : NaN, axe: R * k, int: ok(r2) ? (R - r2) * k : NaN, reste: 90 - b, T: R * Math.tan(k / 2), plat: ok(r2) && R <= r2 }; },
  /** cintrage : rayon R (mm, sur l'axe), angle t (°), longueurs droites a et b mesurées jusqu'au sommet (facultatives) */
  cint(v) { const R = num(v.R), t = num(v.t); if (!(R > 0) || !(t > 0 && t < 180)) return null; const arc = R * rad(t), T = R * Math.tan(rad(t / 2)); const a = num(v.a), b = num(v.b);
    const tot = ok(a) && ok(b) ? a + b - 2 * T + arc : NaN; return { arc, T, gain: 2 * T - arc, tot, court: ok(tot) && (a < T || b < T) }; },
  /** pente : longueur L (m) ; mode « dh » : pente p (unité u : pc %, pm ‰ = mm/m) → dénivelée ; mode « p » : dénivelée dh (mm) → pente */
  pente(v) { const L = num(v.L); if (!(L > 0)) return null; let r; if (v.mode === 'p') { const dh = num(v.dh); if (!ok(dh)) return null; r = dh / 1000 / L; } else { const p = num(v.p); if (!ok(p)) return null; r = v.u === 'pc' ? p / 100 : p / 1000; }
    return { r, dh: r * L * 1000, pc: r * 100, pm: r * 1000, deg: deg(Math.atan(r)) }; },
  /** équerrage : un côté a (m) → 3-4-5 ; deux côtés a et b → la diagonale à mesurer */
  equ(v) { const a = num(v.a), b = num(v.b); if (!(a > 0)) return null; if (b > 0) return { a, b, c: Math.hypot(a, b), deux: true }; const k = a / 3; return { a, b: 4 * k, c: 5 * k, k, deux: false }; }
};
/* ── écran ── */
const css = () => { if (document.getElementById('ot-css')) return; const s = document.createElement('style'); s.id = 'ot-css'; s.textContent = `
.ot-grid{display:grid;grid-template-columns:repeat(auto-fill,minmax(230px,1fr));gap:10px}
.ot-tile{display:flex;flex-direction:column;align-items:flex-start;gap:4px;text-align:left;min-height:96px;padding:14px 16px;border-radius:16px;border:1px solid #DDD8EA;background:#fff;font:inherit;color:#1B1530;cursor:pointer;box-shadow:0 1px 3px rgba(43,27,90,.06)}
.ot-tile b{font-size:17px}.ot-tile span{font-size:13.5px;color:#57526B;line-height:1.35}.ot-tile:hover,.ot-tile:focus-visible{border-color:#5E46B8;outline:0;box-shadow:0 0 0 3px rgba(94,70,184,.18)}
.ot-tile svg{width:44px;height:30px;color:#5E46B8}
.ot-head{display:flex;align-items:center;gap:10px;margin:0 0 10px}.ot-head h3{margin:0;font-size:19px}
.ot-f{display:flex;flex-direction:column;gap:4px;font-size:13.5px;font-weight:700;color:#3A3550}
.ot-f input,.ot-f select{font:inherit;font-size:22px;font-weight:700;min-height:52px;padding:6px 12px;border:1.5px solid #CFC9E0;border-radius:12px;background:#fff;color:#1B1530;width:100%;box-sizing:border-box}
.ot-f input:focus,.ot-f select:focus{border-color:#5E46B8;outline:0;box-shadow:0 0 0 3px rgba(94,70,184,.2)}
.ot-f small{font-weight:600;color:#6B6585}
.ot-fields{display:grid;grid-template-columns:repeat(auto-fill,minmax(150px,1fr));gap:10px;margin:0 0 10px}
.ot-seg{display:flex;flex-wrap:wrap;gap:6px;margin:2px 0 10px}.ot-seg button{min-height:48px;min-width:58px;padding:6px 12px;border-radius:12px;border:1.5px solid #CFC9E0;background:#fff;font:inherit;font-size:16px;font-weight:800;color:#2B1B5A;cursor:pointer}
.ot-seg button.on{background:#2B1B5A;border-color:#2B1B5A;color:#fff}
.ot-autre{display:inline-flex;align-items:center;gap:6px;font-size:14px;font-weight:700;color:#3A3550}.ot-autre input{font:inherit;font-size:18px;font-weight:800;width:84px;min-height:48px;padding:4px 10px;border:1.5px solid #CFC9E0;border-radius:12px;box-sizing:border-box;color:#1B1530}.ot-autre input:focus{border-color:#5E46B8;outline:0;box-shadow:0 0 0 3px rgba(94,70,184,.2)}
.ot-res{display:grid;grid-template-columns:repeat(auto-fill,minmax(150px,1fr));gap:8px;margin:4px 0 10px}
.ot-r{border-radius:14px;background:#F5F2FD;padding:10px 12px}.ot-r small{display:block;font-size:12.5px;font-weight:700;color:#57526B}.ot-r b{display:block;font-size:24px;line-height:1.15;color:#1B1530;font-variant-numeric:tabular-nums}
.ot-r.main{background:#2B1B5A}.ot-r.main small{color:#D6CEF2}.ot-r.main b{color:#fff;font-size:28px}
.ot-warn{border-radius:12px;background:#FDECEA;color:#9B2C22;font-weight:700;padding:8px 12px;margin:0 0 10px}
.ot-vide{color:#6B6585;font-size:14px;padding:8px 2px}
.ot-svg{width:100%;max-width:420px;height:auto;display:block;margin:4px auto 6px}
.ot-formule{font-size:12.5px;color:#57526B;margin-top:4px;line-height:1.4}
@media (max-width:520px){.ot-fields{grid-template-columns:1fr 1fr}.ot-res{grid-template-columns:1fr 1fr}.ot-r b{font-size:21px}.ot-r.main b{font-size:24px}}
`; document.head.appendChild(s); };
const ICO = {
  baio: '<svg viewBox="0 0 44 30" fill="none" stroke="currentColor" stroke-width="3" stroke-linecap="round"><path d="M3 24h12l14-18h12"/></svg>',
  coude: '<svg viewBox="0 0 44 30" fill="none" stroke="currentColor" stroke-width="3" stroke-linecap="round"><path d="M6 27V18a12 12 0 0 1 12-12h20"/><path d="M14 8l6 7" stroke-dasharray="3 3"/></svg>',
  cint: '<svg viewBox="0 0 44 30" fill="none" stroke="currentColor" stroke-width="3" stroke-linecap="round"><path d="M3 26h10a14 14 0 0 0 14-14V3"/></svg>',
  pente: '<svg viewBox="0 0 44 30" fill="none" stroke="currentColor" stroke-width="3" stroke-linecap="round"><path d="M3 25L41 9"/><path d="M41 9v16H3" stroke-width="2" stroke-dasharray="3 3"/></svg>',
  equ: '<svg viewBox="0 0 44 30" fill="none" stroke="currentColor" stroke-width="3" stroke-linecap="round" stroke-linejoin="round"><path d="M6 26V4l32 22z"/><path d="M6 20h6v6" stroke-width="2"/></svg>'
};
const field = (tool, k, lab, unit, hint) => { const v = st().v[tool][k]; return `<label class="ot-f">${esc(lab)}${unit ? ' <small>(' + esc(unit) + ')</small>' : ''}<input type="text" inputmode="decimal" enterkeyhint="done" autocomplete="off" spellcheck="false" data-xin="${ID}|${tool}|${k}" id="ot-${tool}-${k}" value="${esc(v)}">${hint ? `<small>${hint}</small>` : ''}</label>`; };
const seg = (tool, k, vals, lab) => { const v0 = st().v[tool][k], cur = num(v0); return `<div class="ot-f" style="margin-bottom:2px">${esc(lab)}</div><div class="ot-seg" role="group" aria-label="${esc(lab)}">${vals.map(x => `<button type="button" class="${num(x) === cur ? 'on' : ''}" data-act="x" data-v="${ID}|set|${tool}|${k}|${x}">${String(x).replace('.', ',')}°</button>`).join('')}<label class="ot-autre">autre <input type="text" inputmode="decimal" enterkeyhint="done" autocomplete="off" data-xin="${ID}|${tool}|${k}" id="ot-${tool}-${k}" value="${esc(String(v0).replace('.', ','))}" aria-label="${esc(lab)} (autre valeur, en degrés)">°</label></div>`; };
const dnSel = (tool) => { const cur = st().v[tool].dn; return `<label class="ot-f">DN <small>(propose D et R)</small><select data-xin="${ID}|${tool}|dn" id="ot-${tool}-dn"><option value="">— autre —</option>${DN.map(r => `<option value="${r[0]}"${+cur === r[0] ? ' selected' : ''}>DN ${r[0]}</option>`).join('')}</select></label>`; };
const r = (lab, val, main) => `<div class="ot-r${main ? ' main' : ''}"><small>${lab}</small><b>${val}</b></div>`;
function resultats(tool) {
  const v = st().v[tool]; const R = calc[tool](v);
  if (tool === 'baio') { if (!R) return '<div class="ot-vide">Saisis le décalage et choisis l\'angle des coudes.</div>';
    return (R.court ? '<div class="ot-warn">Décalage trop court pour ces coudes : les deux coudes se touchent (tube négatif). Prends un angle plus petit ou des coudes plus serrés.</div>' : '') + `<div class="ot-res">${r('Tube à couper entre les coudes', ok(R.tube) ? f(R.tube) + ' mm' : '— (rayon ?)', true)}${r('Entre-axes des coudes', f(R.L) + ' mm')}${r('Avance (au sol)', f(R.A) + ' mm')}${r('Chaque coude (axe → bout)', ok(R.T) ? f(R.T) + ' mm' : '—')}</div>`; }
  if (tool === 'coude') { if (!R) return '<div class="ot-vide">Choisis le DN (ou le rayon) et l\'angle voulu.</div>';
    return (R.plat ? '<div class="ot-warn">Rayon plus petit que le demi-diamètre : vérifie R et D.</div>' : '') + `<div class="ot-res">${r('Sur l\'extrados (dos)', f(R.ext) + ' mm', true)}${r('Sur l\'axe', f(R.axe) + ' mm')}${r('Sur l\'intrados (ventre)', f(R.int) + ' mm')}${r('Il reste un coude de', f(R.reste, 2) + '°')}</div>`; }
  if (tool === 'cint') { if (!R) return '<div class="ot-vide">Saisis le rayon de cintrage (sur l\'axe) et l\'angle.</div>';
    return (R.court ? '<div class="ot-warn">Une longueur droite est plus courte que la tangente : le cintrage n\'y tient pas.</div>' : '') + `<div class="ot-res">${r('Longueur développée (arc)', f(R.arc) + ' mm', true)}${r('Tangente (sommet → début de l\'arc)', f(R.T) + ' mm')}${r('Gain (2 T − arc)', f(R.gain) + ' mm')}${r('Tube à couper (a + b − 2 T + arc)', ok(R.tot) ? f(R.tot) + ' mm' : '— (a et b ?)')}</div>`; }
  if (tool === 'pente') { if (!R) return '<div class="ot-vide">Saisis la longueur et ' + (v.mode === 'p' ? 'la dénivelée' : 'la pente') + '.</div>';
    return `<div class="ot-res">${v.mode === 'p' ? r('Pente', f(R.pm, 2) + ' ‰ · ' + f(R.pc, 3) + ' %', true) : r('Dénivelée sur la longueur', f(R.dh) + ' mm', true)}${r('En mm par mètre', f(R.pm, 2) + ' mm/m')}${r('En %', f(R.pc, 3) + ' %')}${r('En degrés', f(R.deg, 3) + '°')}</div>`; }
  if (tool === 'equ') { if (!R) return '<div class="ot-vide">Saisis un côté (et le second si tu ne veux pas du 3-4-5).</div>';
    return `<div class="ot-res">${R.deux ? r('Diagonale à mesurer', f(R.c, 3) + ' m', true) + r('Côté a', f(R.a, 3) + ' m') + r('Côté b', f(R.b, 3) + ' m') : r('Diagonale (5)', f(R.c, 3) + ' m', true) + r('Côté a (3)', f(R.a, 3) + ' m') + r('Côté b (4)', f(R.b, 3) + ' m')}</div>`; }
  return '';
}
/* schémas cotés (proportions indicatives) */
function schema(tool) {
  const v = st().v[tool]; const R = calc[tool](v); const t = (x, y, s, a) => `<text x="${x}" y="${y}" font-size="13" font-weight="700" fill="#2B1B5A" text-anchor="${a || 'middle'}">${esc(s)}</text>`;
  const W = 360; let H0 = 150; let g = '';
  if (tool === 'baio') { const a = rad(num(v.a) || 45); const h = 70, run = Math.min(170, h / Math.tan(a)); const x0 = 70, y0 = 112; const x1 = x0 + run, y1 = y0 - h;
    g = `<path d="M10 ${y0}H${x0}L${x1} ${y1}H${W - 10}" fill="none" stroke="#5E46B8" stroke-width="6" stroke-linecap="round" stroke-linejoin="round"/><path d="M${x1 + 18} ${y0}V${y1}" stroke="#C08A2E" stroke-width="1.5" marker-start="url(#otA)" marker-end="url(#otA)"/><path d="M${x0} ${y0 + 18}H${x1}" stroke="#C08A2E" stroke-width="1.5" marker-start="url(#otA)" marker-end="url(#otA)"/>`
      + t(x1 + 26, (y0 + y1) / 2 + 4, 'H ' + (ok(num(v.H)) ? f(num(v.H)) : ''), 'start') + t((x0 + x1) / 2, y0 + 34, 'avance ' + (R ? f(R.A) : '')) + t((x0 + x1) / 2 - 14, (y0 + y1) / 2 - 8, 'L ' + (R ? f(R.L) : ''), 'end') + t(x0 + 26, y0 - 8, f(num(v.a), 2) + '°', 'start'); }
  if (tool === 'coude') { const b = Math.min(Math.max(rad(num(v.b) || 45), 0.05), Math.PI / 2 - 0.05); H0 = 166; const cx = 70, cy = 166, Rr = 100, w = 28, ro = Rr + w, ri = Rr - w; const p = (rr, an) => [cx + rr * Math.sin(an), cy - rr * Math.cos(an)];
    const arc = (rr, a0, a1) => { const [xa, ya] = p(rr, a0), [xb, yb] = p(rr, a1); return `M${xa.toFixed(1)} ${ya.toFixed(1)}A${rr} ${rr} 0 0 1 ${xb.toFixed(1)} ${yb.toFixed(1)}`; };
    const [x1, y1] = p(ri, b), [x2, y2] = p(ro, b), [xl, yl] = p(ro + 12, b / 2), [xc, yc] = p(ro + 10, b);
    g = `<path d="${arc(ro, 0, Math.PI / 2)}M${cx} ${cy - ri}V${cy - ro}M${cx + ri} ${cy}H${cx + ro}${arc(ri, 0, Math.PI / 2)}" fill="none" stroke="#5E46B8" stroke-width="3"/><path d="${arc(Rr, 0, Math.PI / 2)}" fill="none" stroke="#8E87A6" stroke-width="1.5" stroke-dasharray="5 4"/><path d="${arc(ro, 0, b)}" fill="none" stroke="#F26A1B" stroke-width="6" stroke-linecap="round"/><path d="M${x1.toFixed(1)} ${y1.toFixed(1)}L${x2.toFixed(1)} ${y2.toFixed(1)}" stroke="#C9241C" stroke-width="3"/><path d="M${cx} ${cy}L${x1.toFixed(1)} ${y1.toFixed(1)}" stroke="#C9241C" stroke-width="1" stroke-dasharray="3 3"/>`
      + t(xl + 4, yl, 'extrados ' + (R ? f(R.ext) : ''), 'start') + t(xc + 6, yc + 14, 'coupe ' + f(num(v.b), 2) + '°', 'start') + t(cx - 6, cy - ro + 10, 'bout →', 'end') + t(cx + ri - 8, cy - 6, 'intrados', 'end'); }
  if (tool === 'cint') { const th = rad(num(v.t) || 90); const Rr = 70, cx = 70, cy = 40 + Rr; const x0 = cx, y0 = cy - Rr; const xe = cx + Rr * Math.sin(th), ye = cy - Rr * Math.cos(th);
    g = `<path d="M10 ${y0}H${x0}A${Rr} ${Rr} 0 ${th > Math.PI ? 1 : 0} 1 ${xe} ${ye}" fill="none" stroke="#5E46B8" stroke-width="6" stroke-linecap="round"/><path d="M${xe} ${ye}l${Math.cos(th) * 40} ${Math.sin(th) * 40}" stroke="#5E46B8" stroke-width="6" stroke-linecap="round"/><path d="M${cx} ${cy}L${x0} ${y0}M${cx} ${cy}L${xe} ${ye}" stroke="#8E87A6" stroke-width="1.2" stroke-dasharray="4 3"/>`
      + t(cx - 6, cy + 4, 'R', 'end') + t((x0 + xe) / 2 + 30, (y0 + ye) / 2, 'arc ' + (R ? f(R.arc) : ''), 'start') + t(cx + 8, cy - 8, f(num(v.t), 2) + '°', 'start'); }
  if (tool === 'pente') { const y0 = 120, y1 = 60; g = `<path d="M20 ${y0}L${W - 20} ${y1}" stroke="#5E46B8" stroke-width="6" stroke-linecap="round"/><path d="M${W - 20} ${y1}V${y0}H20" fill="none" stroke="#C08A2E" stroke-width="1.5" stroke-dasharray="4 3"/>` + t(W / 2, y0 + 20, 'L ' + (ok(num(v.L)) ? f(num(v.L), 3) + ' m' : '')) + t(W - 26, (y0 + y1) / 2 + 4, 'Δh ' + (R ? f(R.dh) + ' mm' : ''), 'end'); }
  if (tool === 'equ') { const x0 = 40, y0 = 130, a = 90, b = 120; g = `<path d="M${x0} ${y0}V${y0 - a}L${x0 + b} ${y0}Z" fill="#F5F2FD" stroke="#5E46B8" stroke-width="4" stroke-linejoin="round"/><path d="M${x0} ${y0 - 14}h14v14" fill="none" stroke="#2B1B5A" stroke-width="1.5"/>` + t(x0 - 8, y0 - a / 2, 'a ' + (R ? f(R.a, 3) : ''), 'end') + t(x0 + b / 2, y0 + 18, 'b ' + (R ? f(R.b, 3) : '')) + t(x0 + b / 2 + 14, y0 - a / 2 - 6, 'diagonale ' + (R ? f(R.c, 3) + ' m' : ''), 'start'); }
  return `<svg class="ot-svg" viewBox="0 0 ${W} ${H0 + 10}" role="img" aria-label="Schéma"><defs><marker id="otA" viewBox="0 0 10 10" refX="5" refY="5" markerWidth="7" markerHeight="7" orient="auto-start-reverse"><path d="M0 0L10 5L0 10z" fill="#C08A2E"/></marker></defs>${g}</svg>`;
}
const FORMULE = {
  baio: 'L = H ÷ sin α · avance = H ÷ tan α · coude = R × tan(α/2) · tube = L − 2 × coude − 2 × écartement',
  coude: 'longueur à tracer = rayon × angle (en radians) : extrados R + D/2, axe R, intrados R − D/2 — mesurée depuis le bout du coude ; la coupe passe par le centre du coude',
  cint: 'arc = R × angle (radians) · tangente T = R × tan(angle/2) · tube = a + b − 2 T + arc (a et b mesurés jusqu\'au sommet)',
  pente: '1 % = 10 ‰ = 10 mm par mètre · dénivelée = longueur × pente',
  equ: '3-4-5 : a = 3k, b = 4k, diagonale = 5k · deux côtés quelconques : diagonale = √(a² + b²)'
};
function outilHTML(tool) {
  const T = TOOLS.find(x => x[0] === tool); const v = st().v[tool]; let champs = '';
  if (tool === 'baio') champs = `<div class="ot-fields">${field('baio', 'H', 'Décalage H', 'mm, d\'axe en axe')}${dnSel('baio')}${field('baio', 'R', 'Rayon des coudes R', 'mm')}${field('baio', 'g', 'Écartement de soudure', 'mm, par soudure')}</div>${seg('baio', 'a', [11.25, 15, 22.5, 30, 45, 60], 'Angle des coudes')}`;
  if (tool === 'coude') champs = `<div class="ot-fields">${dnSel('coude')}${field('coude', 'D', 'Diamètre extérieur D', 'mm')}${field('coude', 'R', 'Rayon du coude R', 'mm')}</div>${seg('coude', 'b', [15, 22.5, 30, 45, 60, 67.5, 75], 'Angle voulu')}`;
  if (tool === 'cint') champs = `<div class="ot-fields">${field('cint', 'R', 'Rayon de cintrage R', 'mm, sur l\'axe')}${field('cint', 'a', 'Droite a', 'mm, jusqu\'au sommet', 'facultatif')}${field('cint', 'b', 'Droite b', 'mm, jusqu\'au sommet', 'facultatif')}</div>${seg('cint', 't', [15, 22.5, 30, 45, 60, 90], 'Angle')}`;
  if (tool === 'pente') champs = `<div class="ot-seg" role="group" aria-label="Je cherche"><button type="button" class="${v.mode !== 'p' ? 'on' : ''}" data-act="x" data-v="${ID}|set|pente|mode|dh">Je cherche la dénivelée</button><button type="button" class="${v.mode === 'p' ? 'on' : ''}" data-act="x" data-v="${ID}|set|pente|mode|p">Je cherche la pente</button></div><div class="ot-fields">${field('pente', 'L', 'Longueur', 'm')}${v.mode === 'p' ? field('pente', 'dh', 'Dénivelée', 'mm') : field('pente', 'p', 'Pente', v.u === 'pc' ? '%' : '‰ = mm/m')}</div>${v.mode === 'p' ? '' : `<div class="ot-seg" role="group" aria-label="Unité"><button type="button" class="${v.u !== 'pc' ? 'on' : ''}" data-act="x" data-v="${ID}|set|pente|u|pm">‰ (mm/m)</button><button type="button" class="${v.u === 'pc' ? 'on' : ''}" data-act="x" data-v="${ID}|set|pente|u|pc">%</button></div>`}`;
  if (tool === 'equ') champs = `<div class="ot-fields">${field('equ', 'a', 'Côté a', 'm')}${field('equ', 'b', 'Côté b', 'm', 'vide = 3-4-5')}</div>`;
  return `<div class="card ot-card" data-ot="${tool}"><div class="ot-head"><button type="button" class="btn" data-act="x" data-v="${ID}|open|">‹ Outils</button><h3>${esc(T[1])}</h3></div>${champs}<div id="ot-res" aria-live="polite">${resultats(tool)}</div><div id="ot-svg">${schema(tool)}</div><div class="ot-formule">${esc(FORMULE[tool])}</div><div class="eq-acts" style="margin-top:10px"><button type="button" class="btn" data-act="x" data-v="${ID}|reset|${tool}">Effacer</button></div></div>`;
}
function vueHTML() { css(); const s = st();
  if (s.tool && TOOLS.some(x => x[0] === s.tool)) return outilHTML(s.tool);
  return `<div class="card"><h3 style="margin-top:0">🧰 Outils de tuyauterie</h3><div class="hint" style="margin:0 0 10px">Calcul sur le téléphone, rien n'est envoyé. Valeurs gardées sur cet appareil.</div><div class="ot-grid">${TOOLS.map(([k, n, d]) => `<button type="button" class="ot-tile" data-act="x" data-v="${ID}|open|${k}">${ICO[k]}<b>${esc(n)}</b><span>${esc(d)}</span></button>`).join('')}</div></div>`; }
/* mise à jour en direct : seuls les résultats et le schéma sont redessinés (le champ en cours garde le focus et le curseur) */
function rafraichir(tool) { const a = document.getElementById('ot-res'), b = document.getElementById('ot-svg'); if (a) a.innerHTML = resultats(tool); if (b) b.innerHTML = schema(tool); }
export default {
  id: ID,
  moiSubs(me) { if (!me || me.poste === 'visiteur') return []; return [['outils', 'Outils']]; },
  view(sub, me) { if (sub !== 'outils') return null; return vueHTML(me); },
  input(v, el) { const [tool, k] = String(v).split('|'); const s = st(); if (!s.v[tool] || !(k in DEF[tool])) return; s.v[tool][k] = String(el.value == null ? '' : el.value).slice(0, 12);
    if (k === 'dn') { const row = dnRow(el.value); if (row) { if ('D' in DEF[tool]) { s.v[tool].D = String(row[1]).replace('.', ','); const i = document.getElementById('ot-' + tool + '-D'); if (i) i.value = s.v[tool].D; } if ('R' in DEF[tool]) { s.v[tool].R = String(row[2]).replace('.', ','); const i = document.getElementById('ot-' + tool + '-R'); if (i) i.value = s.v[tool].R; } } }
    if (tool === 'coude' && k === 'b' || tool === 'cint' && k === 't' || tool === 'baio' && k === 'a') { const seg = el.closest('.ot-card'); if (seg) seg.querySelectorAll(`[data-v^="${ID}|set|${tool}|${k}|"]`).forEach(b => b.classList.toggle('on', num(b.dataset.v.split('|').pop()) === num(el.value))); }
    save(); rafraichir(tool); },
  act(v, el, me, ctx) { const q = String(v).split('|'); const s = st();
    if (q[0] === 'open') { s.tool = q[1] || null; ctx.render(); try { window.scrollTo(0, 0); } catch (e) { } return; }
    if (q[0] === 'set') { const [, tool, k, val] = q; if (!s.v[tool] || !(k in DEF[tool])) return; s.v[tool][k] = val; save(); ctx.render(); return; }
    if (q[0] === 'reset') { const tool = q[1]; if (!DEF[tool]) return; s.v[tool] = Object.assign({}, DEF[tool]); save(); ctx.render(); return; } }
};
