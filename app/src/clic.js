// clic.js — 11/11 nuit (fiabilité) — Ethan : « site premium, chaque clic respecté, rien ne saute ».
// LE DÉFAUT : l'appli redessine des blocs entiers (innerHTML). Quand un redessin tombe PENDANT un appui — la saisie qu'on vient de quitter
// (« change » au moment où le doigt se pose sur « Valider »), une donnée reçue de la synchro, un minuteur — le bouton appuyé est remplacé par
// son double : le navigateur n'envoie alors AUCUN clic (appui et relâché sur deux éléments différents). D'où « il faut cliquer deux fois ».
// LE CORRECTIF (générique, sans toucher aux écrans) : on note l'élément appuyé et sa signature (balise, id, data-*, texte) ; si au relâché il a
// disparu sans clic, et que son double est là où le doigt s'est posé (ou à moins de 40 px), on rejoue le clic sur le double — une seule fois.
// On ne rejoue jamais : si l'appli a elle-même agi à l'appui (élément retiré par ses propres gestionnaires pointerdown / mousedown / pointerup),
// si le doigt a glissé (> 12 px), si l'appui a été long (> 1,2 s), si l'appui a été annulé (défilement) ou empêché (preventDefault), ni sur [data-noreplay].
const SEL = 'button,a[href],[data-act],[data-m3d],[data-chip],[role=button],summary,label,input[type=checkbox],input[type=radio],.chip';
const TXT = 'input:not([type]),input[type=text],input[type=number],input[type=email],input[type=search],input[type=tel],input[type=date],input[type=time],input[type=password],textarea,select';
let P = null; const LOG = []; let relache = [];
const actionable = t => { try { const el = t && t.closest ? t.closest(SEL + ',' + TXT) : null; return el && !el.closest('[data-noreplay]') ? el : null; } catch (e) { return null; } };
function sigOf(el) {
  if (!el) return ''; const a = [el.tagName, el.id || '', el.getAttribute('name') || '', el.getAttribute('type') || ''];
  for (const at of el.attributes) if (/^data-|^aria-label$|^href$|^for$/.test(at.name)) a.push(at.name + '=' + at.value);
  if (!/^(INPUT|TEXTAREA|SELECT)$/.test(el.tagName)) a.push(String(el.textContent || '').replace(/\s+/g, ' ').trim().slice(0, 80));
  return a.join('|');
}
const visible = el => { const r = el.getBoundingClientRect(); return r.width > 0 && r.height > 0; };
function double(p) {
  const L = [...document.querySelectorAll(p.el.tagName)].filter(x => x !== p.el && x.isConnected && !x.disabled && sigOf(x) === p.sig && visible(x)); if (!L.length) return null;
  let u = null; try { u = actionable(document.elementFromPoint(p.ux, p.uy)); } catch (e) { } if (u && L.includes(u)) return u;
  let best = null, bd = 1e9; L.forEach(x => { const r = x.getBoundingClientRect(); const dx = Math.max(r.left - p.ux, 0, p.ux - r.right), dy = Math.max(r.top - p.uy, 0, p.uy - r.bottom); const d = Math.hypot(dx, dy); if (d < bd) { bd = d; best = x; } });
  return bd <= 40 ? best : null;
}
function verifier(p, quand) {
  if (p.vu) return; p.vu = true; if (P === p) P = null; try { relache.forEach(f => f()); } catch (e) { }
  if (p.clicked || p.noReplay || p.el.isConnected) return; if (Date.now() - p.t > 1200) return;
  const d = double(p); if (!d) { LOG.push({ at: Date.now(), quand, ok: false, sig: p.sig.slice(0, 120) }); return; }
  LOG.push({ at: Date.now(), quand, ok: true, sig: p.sig.slice(0, 120) }); if (LOG.length > 40) LOG.shift();
  if (d.matches(TXT)) { try { d.focus(); } catch (e) { } return; }
  try { d.click(); } catch (e) { console.warn('clic rejoué', e); }
}
export function installClics() {
  if (window.__clicFiable) return; window.__clicFiable = true;
  const doc = document;
  doc.addEventListener('pointerdown', e => {
    if (P && !P.vu) verifier(P, 'nouvel appui');
    if (e.pointerType === 'mouse' && e.button !== 0) { P = null; return; }
    const el = actionable(e.target); if (!el || el.disabled) { P = null; return; }
    P = { el, sig: sigOf(el), x: e.clientX, y: e.clientY, ux: e.clientX, uy: e.clientY, t: Date.now(), type: e.pointerType || 'mouse', clicked: false, noReplay: false, vu: false };
  }, true);
  /* l'appli agit elle-même à l'appui (son gestionnaire a retiré l'élément) : on ne rejoue rien */
  window.addEventListener('pointerdown', () => { if (P && !P.el.isConnected) P.noReplay = true; });
  window.addEventListener('mousedown', () => { if (P && !P.el.isConnected && !P.upDone) P.noReplay = true; });
  doc.addEventListener('pointermove', e => { if (P && Math.hypot(e.clientX - P.x, e.clientY - P.y) > 12) P.noReplay = true; }, true);
  doc.addEventListener('pointercancel', () => { if (P) { P.noReplay = true; verifier(P, 'annulé'); } }, true);
  doc.addEventListener('pointerup', e => { const p = P; if (!p) return; p.ux = e.clientX; p.uy = e.clientY; if (Math.hypot(e.clientX - p.x, e.clientY - p.y) > 12) p.noReplay = true;
    p.connUp = p.el.isConnected; }, true);
  window.addEventListener('pointerup', e => { const p = P; if (!p) return; if (p.connUp && !p.el.isConnected) p.noReplay = true; /* retiré par un gestionnaire « pointerup » de l'appli */
    if (e.defaultPrevented) p.noReplay = true; p.upDone = true;
    if (p.type === 'mouse') setTimeout(() => verifier(p, 'souris'), 0); else setTimeout(() => { if (!p.vu) verifier(p, 'délai'); }, 650); });
  doc.addEventListener('mouseup', e => { const p = P; if (!p || p.type === 'mouse') return; p.ux = e.clientX; p.uy = e.clientY; setTimeout(() => verifier(p, 'tactile'), 0); }, true);
  doc.addEventListener('touchend', e => { if (P && e.defaultPrevented) P.noReplay = true; }, false);
  doc.addEventListener('click', e => { const p = P; if (!p) return; if (!e.isTrusted) return; if (p.el.isConnected || actionable(e.target)) p.clicked = true; }, true);
}
/** un appui est en cours (doigt posé, clic pas encore parti) : les redessins de la synchro attendent */
export const appuiEnCours = () => !!(P && !P.vu && Date.now() - P.t < 1500);
/** rappelé quand l'appui se termine (pour lancer un redessin mis en attente) */
export const auRelache = f => { relache.push(f); };
export const clicsRejoues = () => LOG.slice();
