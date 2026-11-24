// prefab.js — 11/11 nuit (lot 5) — Ethan : « préfabrication : un espace d'attente — les soudures et manchons pointés AVANT que le plan soit à jour, transférés ensuite
// sur la vraie soudure quand le plan est mis à jour, en gardant la trace de l'endroit prévu et que le plan n'a pas été modifié. Faire ça bien. »
// · POINTER EN ATTENTE (soudeur / chef, droit d'étape 1 ; « soudure + manchon » : droits des étapes 1 à 4) : quoi (soudure, ou soudure + manchon), DN, procédé ou manchon,
//   OÙ ELLE IRA (obligatoire, + ligne prévue et « près de la soudure… » facultatifs), au moins une photo, une note. Numéro provisoire unique « ATT-… » (jamais deux pareils,
//   même hors connexion sur deux téléphones). LE PLAN N'EST PAS TOUCHÉ : l'enregistrement est une ligne à part (table des soudures, ligne « attente »), avec le repère
//   de la version du plan au moment du pointage. Gardé sur le téléphone tant que le serveur ne l'a pas (hors connexion), renvoyé tout seul.
// · TRANSFÉRER (chef / conducteur : droit « transférer l'avancement », ou administrateur) une fois le plan mis à jour par le bureau : « 📍 Transférer » → on touche la vraie
//   soudure → tout passe dessus SANS RECUL (même fusion que les soudures hors du plan : étapes, soudeur et date d'origine, photos, historique) + un événement
//   « ⏳ Préfabriquée » sur la fiche : pointée en attente le…, par…, lieu prévu, plan au pointage → plan au transfert. La ligne d'attente reste (statut « transférée vers… »).
// · ANNULER : jamais effacée — statut « annulée » (motif, qui, quand), visible dans l'historique de l'espace d'attente.
// · Production : une soudure en attente n'est comptée qu'une fois transférée (avec sa date et son soudeur d'origine).
let A = null;
const ST = { site: null, rows: new Map(), loading: null, loaded: false };
export function initPrefab(api) { A = api; }
const esc = s => String(s == null ? '' : s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
const KEY = s => 'trace:att:' + s;
const nowIso = () => new Date().toISOString();
const dh = x => { const d = new Date(x); return isNaN(d) ? '' : d.toLocaleString('fr-FR', { day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit' }); };
const dj = x => { const d = new Date(x); return isNaN(d) ? '' : d.toLocaleDateString('fr-FR'); };
export const attIs = r => !!(r && r.data && r.data.attente);
const att = r => (r && r.data && r.data.attente) || {};
const KIND = { soudure: '🔥 Soudure', complet: '🧪 Soudure + manchon' };
/* repère de la version du plan (date d'enregistrement du tracé, nombre de soudures) : prouve, sur la fiche, que la soudure n'était pas au plan au pointage */
export function planStamp() { const N = A.net() || {}; let n = 0; try { Object.values(A.state.lines || {}).forEach(l => ['A', 'R'].forEach(c => { const cd = l && l.cond && l.cond[c]; n += ((cd && cd.joints) || []).length; })); } catch (e) { }
  return { at: (N.traceur && N.traceur.savedAt) || N.updated_at || N._srvAt || null, n }; }
const planTxt = p => p ? ((p.at ? 'plan du ' + dj(p.at) : 'plan sans date') + (p.n != null ? ' · ' + p.n + ' soudure' + (p.n > 1 ? 's' : '') : '')) : '—';
/* ── stockage : serveur (table des soudures) + copie du téléphone (hors connexion) ── */
async function saveLocal() { if (!ST.site) return; try { await A.kv.set(KEY(ST.site), { v: 1, rows: [...ST.rows.values()] }); } catch (e) { console.warn('attente', e); } }
function ensureSite() { const s = A.state.siteId; if (!s) return false; if (ST.site !== s) { ST.site = s; ST.rows = new Map(); ST.loaded = false; ST.loading = null; } if (!ST.loaded && !ST.loading) ST.loading = loadLocal(s); return true; }
async function loadLocal(s) { let o = null; try { o = await A.kv.get(KEY(s)); } catch (e) { o = null; } if (ST.site !== s) return; (o && Array.isArray(o.rows) ? o.rows : []).forEach(r => { if (!r || !r.weld_id) return; const cur = ST.rows.get(r.weld_id); if (!cur || String(r.updated_at || '') > String(cur.updated_at || '') || r._pending) ST.rows.set(r.weld_id, r); });
  ST.loaded = true; ST.loading = null; try { renderAttWarn(); } catch (e) { } retry(); }
/** une ligne reçue du serveur (soudure absente du plan, marquée « attente ») */
export function attSeen(r) { if (!attIs(r) || !ensureSite()) return; const cur = ST.rows.get(r.weld_id); if (cur && cur._pending && String(cur.updated_at || '') >= String(r.updated_at || '')) return; ST.rows.set(r.weld_id, Object.assign({}, r, { _pending: false })); saveLocal(); }
const toJoint = r => { const d = r.data || {}; return { weldId: r.weld_id, line: 'attente', cond: 'A', status: r.status, events: (d.events || []).map(e => Object.assign({}, e)), photos: (d.photos || []).slice(), steps: d.steps || null, note: d.note || undefined, attente: d.attente }; };
async function push(r) { if (!r || A.isSandbox(ST.site)) { if (r) { r._pending = false; await saveLocal(); } return true; }
  try { /* photos prises hors connexion : envoyées au stockage avant la ligne */ const up = async arr => { const out = []; for (const p of (arr || [])) { if (typeof p === 'string' && p.startsWith('data:')) { let u = null; try { u = await A.sync.uploadPhoto(ST.site, r.weld_id, p); } catch (e) { } out.push(u || p); } else out.push(p); } return out; };
    const d = r.data || {}; d.photos = await up(d.photos); for (const e of (d.events || [])) e.photos = await up(e.photos); if (d.steps) for (const k of Object.keys(d.steps)) if (d.steps[k] && d.steps[k].photos) d.steps[k].photos = await up(d.steps[k].photos);
    const ok = await A.sync.saveWelds(ST.site, [toJoint(r)]); if (ok) { r._pending = false; await saveLocal(); return true; } } catch (e) { console.warn('attente', e); }
  return false; }
let retryT = null; function retry() { clearTimeout(retryT); retryT = setTimeout(async () => { const P = [...ST.rows.values()].filter(r => r._pending); for (const r of P) await push(r); }, 400); }
export const attWaiting = () => { if (!ensureSite()) return []; return [...ST.rows.values()].filter(r => (att(r).statut || 'attente') === 'attente').sort((a, b) => String(att(a).le || '').localeCompare(String(att(b).le || ''))); };
const attHistory = () => [...ST.rows.values()].filter(r => (att(r).statut || 'attente') !== 'attente').sort((a, b) => String((att(b).transfere || att(b).annule || {}).at || '').localeCompare(String((att(a).transfere || att(a).annule || {}).at || '')));
const canTransfer = () => A.can('weld.transfer') || A.can('weld.admin');
const canPoint = () => A.canStep(1) || !!(A.can && A.can('weld.step1.for')); /* 24/11 : aussi qui déclare pour le compte du soudeur (chef, tuyauteur…) */
/* ── bandeau sur le chantier : « ⏳ 3 soudures préfabriquées en attente du plan » ── */
export function renderAttWarn() { const onSite = A.state.screen === 'site'; if (onSite) ensureSite(); const L = onSite ? attWaiting() : []; let b = document.getElementById('attWarn');
  if (!b) { if (!L.length) return; const s = document.getElementById('orphWarn') || document.getElementById('syncWarn'); if (!s) return; b = document.createElement('button'); b.id = 'attWarn'; b.className = 'syncWarn'; b.style.cssText = 'background:#f1ecfb;color:#3b2a86;border-bottom-color:#cfc3ef'; s.insertAdjacentElement('afterend', b); b.onclick = () => openAttente(); }
  b.classList.toggle('show', L.length > 0); if (L.length) b.textContent = `⏳ ${L.length} soudure${L.length > 1 ? 's' : ''} préfabriquée${L.length > 1 ? 's' : ''} en attente du plan — ${canTransfer() ? 'touche pour les transférer' : 'touche pour voir'}`; }
/* ── l'espace d'attente ── */
function rowHTML(r, hist) { const a = att(r); const d = r.data || {}; const nph = (d.photos || []).length + (d.events || []).reduce((n, e) => n + ((e && e.photos) || []).length, 0); const ln = a.ligne && A.state.lines[a.ligne];
  const st = a.statut === 'transferee' ? `<b style="color:#0e6b5c">✓ transférée sur ${esc(a.vers || '?')}</b>${a.transfere ? ' · ' + esc(a.transfere.by || '') + ' · ' + dh(a.transfere.at) : ''}` : a.statut === 'annulee' ? `<b style="color:#8a1c12">✕ annulée</b>${a.annule ? ' · ' + esc(a.annule.by || '') + ' · ' + dh(a.annule.at) + (a.annule.motif ? ' · « ' + esc(a.annule.motif) + ' »' : '') : ''}` : '';
  const ph = [...(d.photos || []), ...(d.events || []).flatMap(e => (e && e.photos) || [])].slice(0, 3).map(p => { const u = typeof p === 'string' ? p : p && p.url; return u ? `<a href="${esc(u)}" target="_blank" rel="noopener"><img src="${esc(u)}" alt="" class="att-th"></a>` : ''; }).join('');
  const sou = a.soudeur || ((d.steps || {})[1] || {}).by || '', man = a.manchonneur || (a.kind === 'complet' ? ((d.steps || {})[3] || {}).by || '' : '');
  return `<div class="row att-row" data-att="${esc(r.weld_id)}"><span style="font-size:20px">⏳</span><div style="flex:1;min-width:0"><b>${esc(r.weld_id)}</b> · ${esc(KIND[a.kind] || 'Soudure')}${a.dn ? ' · DN ' + esc(a.dn) : ''}${a.proc ? ' · ' + esc(a.proc) : ''}${r._pending ? ' · <span style="color:#9a5b00">pas encore au serveur</span>' : ''}${sou ? `<div class="att-qui">🔥 Soudée par <b>${esc(sou)}</b>${man ? ` · 🧪 manchonnée par <b>${esc(man)}</b>` : ''}</div>` : ''}
    <div class="att-lieu">📍 Prévue : « ${esc(a.lieu || '—')} »${ln ? ' · ligne ' + esc(ln.name || ln.id) : ''}${a.pres ? ' · près de ' + esc(a.pres) : ''}</div>
    <span class="dim">${esc(a.par || '')} · ${dh(a.le)}${nph ? ' · 📷 ' + nph : ''} · ${esc(planTxt(a.plan))}${a.note ? ' · ' + esc(a.note) : ''}</span>${ph ? `<div class="att-phs">${ph}</div>` : ''}${st ? `<div style="margin-top:4px">${st}</div>` : ''}
    ${!hist && (canTransfer() || (a.kind !== 'complet' && A.canStep(3)) || (a.kind !== 'complet' && A.can && A.can('weld.step1.for'))) ? `<div style="margin-top:6px;display:flex;gap:6px;flex-wrap:wrap">${a.kind !== 'complet' && (A.canStep(3) || (A.can && A.can('weld.step1.for'))) ? `<button class="btn sm" data-att-man="${esc(r.weld_id)}">🧪 Manchonner</button>` : ''}${canTransfer() ? `<button class="btn sm primary" data-att-put="${esc(r.weld_id)}">📍 Transférer sur la soudure du plan</button><button class="btn sm" data-att-del="${esc(r.weld_id)}">✕ Annuler</button>` : ''}</div>` : ''}</div></div>`; }
const css = () => { if (document.getElementById('att-css')) return; const s = document.createElement('style'); s.id = 'att-css'; s.textContent = `
.att-row{align-items:flex-start}.att-lieu{margin:3px 0;font-size:14px;color:#2B1B5A}.att-phs{display:flex;gap:6px;margin-top:6px}.att-th{width:54px;height:54px;object-fit:cover;border-radius:8px;border:1px solid #DDD8EA}
.att-seg{display:flex;flex-wrap:wrap;gap:6px;margin:4px 0 10px}.att-seg button{min-height:48px;padding:6px 14px;border-radius:12px;border:1.5px solid #CFC9E0;background:#fff;font:inherit;font-size:15px;font-weight:800;color:#2B1B5A;cursor:pointer}.att-seg button.on{background:#2B1B5A;border-color:#2B1B5A;color:#fff}
.att-f{display:block;margin:0 0 10px;font-weight:700;font-size:14px}.att-f input,.att-f select,.att-f textarea{display:block;width:100%;box-sizing:border-box;margin-top:4px;font:inherit;font-weight:500;font-size:17px;min-height:48px;padding:8px 10px;border:1.5px solid #CFC9E0;border-radius:10px;background:#fff}
.att-f textarea{min-height:76px}.att-f small{font-weight:600;color:#6B6585}.att-2{display:grid;grid-template-columns:1fr 1fr;gap:10px}
.att-photos{display:flex;gap:8px;flex-wrap:wrap;margin:6px 0 10px}.att-photos img{width:72px;height:72px;object-fit:cover;border-radius:10px;border:1px solid #DDD8EA}
.att-err{background:#fdeae7;color:#8a1c12;border-radius:10px;padding:8px 10px;font-weight:700;margin:0 0 8px}
.att-qui{margin:2px 0;font-size:13.5px;color:#3b2a86}
@media (max-width:420px){.att-2{grid-template-columns:1fr}}`; document.head.appendChild(s); };
export function openAttente() { if (!ensureSite()) return; css(); const L = attWaiting(), H = attHistory();
  A.openModal(`<h3 style="margin-top:0">⏳ Préfabrication — espace d'attente</h3>
   <div class="hint" style="margin-top:0">Une soudure faite <b>avant</b> que le plan soit à jour (atelier, préfabrication) : on la pointe <b>ici</b>, sans toucher au plan. Quand le bureau a mis le plan à jour, ${canTransfer() ? 'tu la transfères' : 'le chef la transfère'} sur la vraie soudure : soudeur, date, photos et étapes suivent, et la fiche garde la trace (pointée en attente, endroit prévu, plan non modifié).</div>
   ${canPoint() ? '<button class="btn primary block" id="att-new" style="margin:8px 0">＋ Pointer une soudure en attente</button>' : ''}
   <div class="syncList">${L.map(r => rowHTML(r, false)).join('') || '<div class="dim">Rien en attente.</div>'}</div>
   ${H.length ? `<details style="margin-top:8px"><summary style="cursor:pointer">Historique · ${H.length} transférée${H.length > 1 ? 's' : ''} ou annulée${H.length > 1 ? 's' : ''}</summary><div class="syncList">${H.map(r => rowHTML(r, true)).join('')}</div></details>` : ''}
   <div class="actions" style="margin-top:8px"><button class="btn block" data-close>Fermer</button></div>`);
  const m = document.getElementById('modal'); const nb = document.getElementById('att-new'); if (nb) nb.onclick = () => attForm();
  m.querySelectorAll('[data-att-put]').forEach(x => x.onclick = () => { const r = ST.rows.get(x.dataset.attPut); if (!r) return; A.closeModal(); A.endOtherPoses(); A.closeSheet(); A.state.attPose = r; A.state.tab = 'plan'; A.renderAll(); A.toast('Touche la soudure du plan où va ' + r.weld_id + ' (prévue : ' + (att(r).lieu || '—') + ')', 7000); });
  m.querySelectorAll('[data-att-del]').forEach(x => x.onclick = () => attCancel(x.dataset.attDel));
  m.querySelectorAll('[data-att-man]').forEach(x => x.onclick = () => attManchForm(x.dataset.attMan)); }
function attCancel(id) { const r = ST.rows.get(id); if (!r) return; const motif = prompt('Annuler ' + id + ' ?\n\nRien n\'est effacé : elle reste dans l\'historique de l\'espace d\'attente.\nMotif (obligatoire) :', ''); if (motif == null) return; if (!String(motif).trim()) { A.toast('Motif obligatoire pour annuler'); return; }
  const a = att(r); a.statut = 'annulee'; a.annule = { by: A.userName(), at: nowIso(), motif: String(motif).trim().slice(0, 200) }; r.updated_at = nowIso(); r._pending = true; saveLocal().then(() => push(r)); A.toast(id + ' annulée (gardée dans l\'historique)'); renderAttWarn(); openAttente(); }
/* ── pointer en attente ── */
/* 24/11 (Ethan, recette L22 : « il faut aussi les photos des fils, les différentes photos de manchons ; pouvoir manchonner une soudure faite en attente ; je ne vois pas
   le soudeur, ou déclarer un soudeur ; ça doit se rapprocher très fortement du format habituel, compté en production… juste c'est en attente, quelques questions en plus ») :
   · « Soudé par » (et « Manchonné par ») comme sur une fiche du plan — l'équipe du chantier d'abord, puis les soudeurs (manchonneurs), ou un nom écrit ; c'est lui qui est
     compté en production (à la date du pointage), la personne qui pointe est gardée (« déclarée par ») ;
   · une photo par étape, comme le pointage habituel : ① la soudure (cordon), ② les fils raccordés (sertissage + testeur), ③ le manchon rétracté + manomètre, ④ le moussage ;
   · « 🧪 Manchonner » une soudure en attente : on y ajoute le manchon (étapes ② à ④), elle reste en attente du plan. */
const F = { kind: 'soudure', ph: { 1: [], 2: [], 3: [], 4: [] }, busy: 0, manch: null };
const PH_LAB = { 1: 'Photo de la soudure (cordon)', 2: 'Photo des fils raccordés (sertissage + testeur)', 3: 'Photo du manchon rétracté + manomètre (test de pression)', 4: 'Photo du moussage + bouchons' };
const PH_REQ = { 1: true, 2: true, 3: true, 4: false };
function dnList() { const s = new Set(); try { Object.values(A.state.lines || {}).forEach(l => { if (l && l.dn) s.add(+l.dn); ['A', 'R'].forEach(c => { const cd = l && l.cond && l.cond[c]; ((cd && cd.joints) || []).forEach(j => { if (j && j.dn) s.add(+j.dn); }); }); }); } catch (e) { } [20, 25, 32, 40, 50, 65, 80, 100, 125, 150, 200, 250, 300, 350, 400, 450, 500, 600].forEach(x => s.add(x)); return [...s].filter(x => x > 0).sort((a, b) => a - b); }
/* « Soudé par » / « Manchonné par » : moi (si j'ai le droit de l'étape), l'équipe du chantier, les autres du métier, ou un nom écrit */
function quiHTML(k, n, v) { let W = { team: [], others: [] }; try { W = (A.gens && A.gens(k === 'man' ? 'manch' : 'soud')) || W; } catch (e) { } const mine = A.meName ? A.meName() : A.userName(); const same = (a, b) => A.sameNm ? A.sameNm(a, b) : String(a || '').trim().toLowerCase() === String(b || '').trim().toLowerCase();
  const self = A.canStep(n); const ok = x => x && x.name && !same(x.name, mine); const cur = v || '';
  const opt = x => `<option value="${esc(x.name)}"${cur === x.name ? ' selected' : ''}>${esc(x.name)}</option>`;
  return `<label class="att-f">${k === 'man' ? 'Manchonné par' : 'Soudé par'}<select id="att-${k}by">${self ? `<option value=""${!cur ? ' selected' : ''}>Moi — ${esc(mine)}</option>` : `<option value=""${!cur ? ' selected' : ''}>— choisis ${k === 'man' ? 'le manchonneur' : 'le soudeur'} —</option>`}${(W.team || []).filter(ok).length ? `<optgroup label="Équipe sur ce chantier">${W.team.filter(ok).map(opt).join('')}</optgroup>` : ''}${(W.others || []).filter(ok).length ? `<optgroup label="${k === 'man' ? 'Autres manchonneurs' : 'Autres soudeurs'}">${W.others.filter(ok).map(opt).join('')}</optgroup>` : ''}<option value="__x"${cur === '__x' ? ' selected' : ''}>Autre (écrire son nom)…</option></select>
    <input id="att-${k}byx" maxlength="60" placeholder="Prénom et nom" autocomplete="off" value="${esc((F.v && F.v[k + 'byx']) || '')}" style="${cur === '__x' ? '' : 'display:none;'}margin-top:4px"></label>`; }
function quiLu(k, n) { const sel = document.getElementById('att-' + k + 'by'); const mine = A.meName ? A.meName() : A.userName(); if (!sel) return A.canStep(n) ? { name: mine } : { err: 'Déclaration réservée à ' + (k === 'man' ? 'un manchonneur' : 'un soudeur') };
  let v = sel.value; if (v === '__x') { v = String((document.getElementById('att-' + k + 'byx') || {}).value || '').trim().replace(/\s+/g, ' '); if (v.length < 2) return { err: 'Écris le prénom et le nom ' + (k === 'man' ? 'du manchonneur' : 'du soudeur') }; }
  if (!v) return A.canStep(n) ? { name: mine } : { err: 'Choisis ' + (k === 'man' ? 'qui a manchonné' : 'qui a soudé') + ' (« ' + (k === 'man' ? 'Manchonné par' : 'Soudé par') + ' »)' };
  return { name: v, pour: !(A.sameNm ? A.sameNm(v, mine) : v === mine) }; }
function photosHTML(n) { const L = F.ph[n] || []; const sfx = n === 1 ? '' : String(n); return `<label class="att-f">${PH_LAB[n]} <small>${PH_REQ[n] ? '(obligatoire)' : '(facultatif)'}</small><input type="file" accept="image/*" capture="environment" multiple id="att-ph${sfx}" data-attph="${n}"></label><div class="att-photos" id="att-phs${sfx}" data-attphs="${n}">${L.map(p => `<img src="${esc(typeof p === 'string' ? p : p.url)}" alt="">`).join('')}${F.busy ? '<span class="dim">Envoi de la photo…</span>' : ''}</div>`; }
function branchePhotos(grab, redraw) { document.querySelectorAll('#modal [data-attph]').forEach(inp => { inp.onchange = async e => { const n = +inp.dataset.attph; const fs = [...(e.target.files || [])]; e.target.value = ''; if (!fs.length) return; grab(); F.busy++; redraw(); for (const f of fs) { const d = await A.compressPhoto(f); if (d) F.ph[n].push(d); } F.busy--; if (document.getElementById('modal') && document.querySelector('#modal [data-attph]')) redraw(); }; });
  ['sou', 'man'].forEach(k => { const sel = document.getElementById('att-' + k + 'by'), x = document.getElementById('att-' + k + 'byx'); if (sel && x) sel.onchange = () => { x.style.display = sel.value === '__x' ? '' : 'none'; if (sel.value === '__x') try { x.focus(); } catch (e) { } }; }); }
function attForm(keep) { css(); if (!keep) { F.kind = 'soudure'; F.ph = { 1: [], 2: [], 3: [], 4: [] }; F.busy = 0; F.v = {}; F.manch = null; } const v = F.v || {}; const lines = Object.values(A.state.lines || {}).filter(l => l && l.id);
  const can4 = [1, 2, 3, 4].every(n => A.canStep(n)) || (A.can && A.can('weld.step1.for')); const complet = F.kind === 'complet';
  A.openModal(`<h3 style="margin-top:0">⏳ Pointer en attente</h3><div class="hint" style="margin-top:0">Comme une soudure du plan (soudeur, procédé, photos), mais sur une fiche à part : le plan n'est pas modifié ; elle sera transférée sur la vraie soudure quand le plan sera à jour. Elle compte en production dès maintenant.</div>
   <div id="att-err"></div>
   <div class="att-f" style="margin-bottom:2px">Ce qui a été fait</div><div class="att-seg"><button type="button" data-attk="soudure" class="${!complet ? 'on' : ''}">🔥 Soudure faite</button>${can4 ? `<button type="button" data-attk="complet" class="${complet ? 'on' : ''}">🧪 Soudure + manchon faits</button>` : ''}</div>
   <div class="att-2"><label class="att-f">DN<select id="att-dn"><option value="">—</option>${dnList().map(x => `<option value="${x}"${String(v.dn) === String(x) ? ' selected' : ''}>DN ${x}</option>`).join('')}</select></label>
   <label class="att-f">Procédé<select id="att-proc">${A.PROCEDES.map(([k, l]) => `<option value="${k}"${v.proc === k ? ' selected' : ''}>${esc(l)}</option>`).join('')}</select></label></div>
   ${quiHTML('sou', 1, v.souby)}
   ${complet ? `<div class="att-2"><label class="att-f">Manchon<select id="att-man">${A.MANCHONS.map(([k, l]) => `<option value="${k}"${v.man === k ? ' selected' : ''}>${esc(l)}</option>`).join('')}</select></label>${quiHTML('man', 3, v.manby)}</div>` : ''}
   <label class="att-f">Où elle ira <small>(obligatoire : ligne, repère, « 2e soudure après la vanne V12 »…)</small><textarea id="att-lieu" maxlength="300">${esc(v.lieu || '')}</textarea></label>
   <div class="att-2"><label class="att-f">Ligne prévue <small>(facultatif)</small><select id="att-ligne"><option value="">—</option>${lines.map(l => `<option value="${esc(l.id)}"${v.ligne === l.id ? ' selected' : ''}>${esc(l.name || l.id)}</option>`).join('')}</select></label>
   <label class="att-f">Près de la soudure <small>(facultatif)</small><input id="att-pres" maxlength="20" placeholder="S-0042" value="${esc(v.pres || '')}" autocomplete="off"></label></div>
   ${photosHTML(1)}${complet ? photosHTML(2) + photosHTML(3) + photosHTML(4) : ''}
   <label class="att-f">Note <small>(facultatif)</small><input id="att-note" maxlength="200" value="${esc(v.note || '')}" autocomplete="off"></label>
   <div class="actions"><button class="btn primary block" id="att-ok">Enregistrer en attente</button><button class="btn block" id="att-back">‹ Espace d'attente</button></div>`);
  const g = id => document.getElementById(id); const val = id => (g(id) || {}).value;
  const grab = () => { F.v = { dn: val('att-dn'), proc: val('att-proc'), man: g('att-man') ? val('att-man') : (F.v && F.v.man), souby: val('att-souby'), soubyx: val('att-soubyx'), manby: g('att-manby') ? val('att-manby') : (F.v && F.v.manby), manbyx: g('att-manbyx') ? val('att-manbyx') : (F.v && F.v.manbyx), lieu: val('att-lieu'), ligne: val('att-ligne'), pres: val('att-pres'), note: val('att-note') }; };
  document.querySelectorAll('#modal [data-attk]').forEach(b => b.onclick = () => { grab(); F.kind = b.dataset.attk; attForm(true); });
  g('att-back').onclick = () => openAttente(); branchePhotos(grab, () => attForm(true));
  g('att-ok').onclick = () => { grab(); const v2 = F.v; const err = []; const S = quiLu('sou', 1); const M = complet ? quiLu('man', 3) : null; if (S.err) err.push(S.err); if (M && M.err) err.push(M.err);
    if (!String(v2.lieu || '').trim()) err.push('Où elle ira : obligatoire'); [1, 2, 3].filter(n => complet || n === 1).forEach(n => { if (PH_REQ[n] && !F.ph[n].length) err.push(PH_LAB[n] + ' : obligatoire'); }); if (F.busy) err.push('Photo en cours d\'envoi : attends une seconde');
    if (err.length) { g('att-err').innerHTML = `<div class="att-err">${err.map(esc).join(' · ')}</div>`; try { g('att-err').scrollIntoView({ block: 'nearest' }); } catch (e) { } return; } attSave(v2, S, M); }; }
async function attSave(v, S, M) { const by = A.userName(), uid = A.state.userId || '', at = new Date(), iso = at.toISOString(); const id = 'ATT-' + Date.now().toString(36).toUpperCase().slice(-6) + Math.random().toString(36).slice(2, 4).toUpperCase();
  const procL = (A.PROCEDES.find(p => p[0] === v.proc) || [])[1] || ''; const complet = F.kind === 'complet'; const ph = n => F.ph[n].slice();
  const sou = (S && S.name) || by; const decl = S && S.pour ? { by, at: iso } : undefined;
  const steps = { 1: { done: true, by: sou, at: iso, photos: ph(1), visuel: true, proc: v.proc || undefined, prefab: id, decl } };
  const events = [{ type: 'soudee', by: uid, byName: sou, at: iso, photos: ph(1), data: { procede: v.proc || undefined, prefab: id, declPar: decl ? by : undefined } }];
  if (complet) { const man = (M && M.name) || by; const declM = M && M.pour ? { by, at: iso } : undefined; steps[2] = { done: true, by: man, at: iso, photos: ph(2), cont: false, prefab: id, decl: declM }; steps[3] = { done: true, by: man, at: iso, photos: ph(3), type: v.man || 'retracte', press: true, prefab: id, decl: declM }; steps[4] = { done: true, by: man, at: iso, photos: ph(4), prefab: id, decl: declM };
    events.push({ type: 'manchonnee', by: uid, byName: man, at: iso, photos: ph(2).concat(ph(3), ph(4)), data: { manchon: v.man || 'retracte', prefab: id, declPar: declM ? by : undefined } }); }
  const r = { weld_id: id, line_id: 'attente', cond: 'A', status: complet ? 'manchonnee' : 'soudee', updated_at: iso, _pending: true,
    data: { events, photos: [], steps, note: v.note ? String(v.note).slice(0, 200) : undefined, attente: { v: 2, statut: 'attente', kind: F.kind, dn: v.dn || '', proc: procL, man: complet ? v.man : undefined, soudeur: sou, manchonneur: complet ? ((M && M.name) || by) : undefined, lieu: String(v.lieu || '').trim().slice(0, 300), ligne: v.ligne || '', pres: String(v.pres || '').trim().slice(0, 20), note: v.note ? String(v.note).slice(0, 200) : '', par: by, parId: uid, le: iso, plan: planStamp() } } };
  ST.rows.set(id, r); await saveLocal(); F.ph = { 1: [], 2: [], 3: [], 4: [] }; A.toast('⏳ ' + id + ' pointée en attente — soudée par ' + sou + ' — le plan n\'est pas modifié'); renderAttWarn(); openAttente(); push(r).then(() => { try { const m = document.getElementById('modal'); if (m && m.querySelector('[data-att="' + id + '"]')) openAttente(); } catch (e) { } }); }
/* 🧪 manchonner une soudure en attente : étapes ② à ④ ajoutées sur la fiche d'attente (elle reste en attente du plan) */
function attManchForm(id, keep) { css(); const r = ST.rows.get(id); if (!r) return; if (!keep) { F.ph = { 1: [], 2: [], 3: [], 4: [] }; F.busy = 0; F.v = {}; } const v = F.v || {}; const a = att(r);
  A.openModal(`<h3 style="margin-top:0">🧪 Manchonner ${esc(r.weld_id)}</h3><div class="hint" style="margin-top:0">Soudure en attente${a.dn ? ' DN ' + esc(a.dn) : ''} — prévue : « ${esc(a.lieu || '—')} ». Le manchon s'ajoute sur sa fiche d'attente ; tout passera sur la vraie soudure au transfert.</div><div id="att-err"></div>
   <div class="att-2"><label class="att-f">Manchon<select id="att-man">${A.MANCHONS.map(([k, l]) => `<option value="${k}"${v.man === k ? ' selected' : ''}>${esc(l)}</option>`).join('')}</select></label>${quiHTML('man', 3, v.manby)}</div>
   ${photosHTML(2)}${photosHTML(3)}${photosHTML(4)}
   <div class="actions"><button class="btn primary block" id="att-mok">Enregistrer le manchon</button><button class="btn block" id="att-back">‹ Espace d'attente</button></div>`);
  const g = x => document.getElementById(x); const grab = () => { F.v = { man: (g('att-man') || {}).value, manby: (g('att-manby') || {}).value, manbyx: (g('att-manbyx') || {}).value }; };
  g('att-back').onclick = () => openAttente(); branchePhotos(grab, () => attManchForm(id, true));
  g('att-mok').onclick = async () => { grab(); const err = []; const M = quiLu('man', 3); if (M.err) err.push(M.err); [2, 3].forEach(n => { if (!F.ph[n].length) err.push(PH_LAB[n] + ' : obligatoire'); }); if (F.busy) err.push('Photo en cours d\'envoi : attends une seconde');
    if (err.length) { g('att-err').innerHTML = `<div class="att-err">${err.map(esc).join(' · ')}</div>`; return; }
    const by = A.userName(), uid = A.state.userId || '', iso = new Date().toISOString(); const man = M.name; const declM = M.pour ? { by, at: iso } : undefined; const d = r.data || (r.data = {}); const st = d.steps || (d.steps = {});
    st[2] = { done: true, by: man, at: iso, photos: F.ph[2].slice(), cont: false, prefab: r.weld_id, decl: declM }; st[3] = { done: true, by: man, at: iso, photos: F.ph[3].slice(), type: F.v.man || 'retracte', press: true, prefab: r.weld_id, decl: declM }; st[4] = { done: true, by: man, at: iso, photos: F.ph[4].slice(), prefab: r.weld_id, decl: declM };
    (d.events || (d.events = [])).push({ type: 'manchonnee', by: uid, byName: man, at: iso, photos: F.ph[2].concat(F.ph[3], F.ph[4]), data: { manchon: F.v.man || 'retracte', prefab: r.weld_id, declPar: declM ? by : undefined } });
    a.kind = 'complet'; a.man = F.v.man || 'retracte'; a.manchonneur = man; a.manchonne = { by, at: iso }; r.status = 'manchonnee'; r.updated_at = iso; r._pending = true; F.ph = { 1: [], 2: [], 3: [], 4: [] };
    await saveLocal(); push(r); A.toast('🧪 ' + r.weld_id + ' manchonnée par ' + man + ' (toujours en attente du plan)'); renderAttWarn(); openAttente(); }; }
/** les fiches d'attente d'un chantier (copie de l'appareil comprise) — production, cadence (espace.js) ; null si ce chantier n'est pas celui en mémoire */
export function attRowsFor(siteId) { return siteId && ST.site === siteId ? [...ST.rows.values()] : null; }
/* ── transfert : toucher la vraie soudure ── */
export function attPill() { const r = A.state.attPose; return r ? `<span class="pill hot" data-pill="att">⏳ ${esc(r.weld_id)} : touche la soudure du plan où elle va <span class="x">✕</span></span>` : ''; }
export function attTap(t) { const r = A.state.attPose; if (!r) return false;
  if (t && t.dataset && t.dataset.j !== undefined) { const l = A.state.lines[t.dataset.line]; const c = t.dataset.cond; const T = l && l.cond && l.cond[c] && l.cond[c].joints[+t.dataset.j]; if (!T) return true; const a = att(r);
    const deja = T.status && T.status !== 'a_souder';
    if (!confirm(`Transférer ${r.weld_id} (${(KIND[a.kind] || 'Soudure').replace(/^\S+\s/, '')}${a.dn ? ', DN ' + a.dn : ''}) sur ${T.weldId} ?\n\nPrévue : « ${a.lieu || '—'} »\n${deja ? T.weldId + ' a déjà de l\'avancement : tout s\'ajoute, rien ne recule.\n' : ''}Soudeur, date, photos et étapes passent sur ${T.weldId} ; la fiche garde la trace de la préfabrication.`)) return true;
    const by = A.userName(), at = new Date(); A.mergeInto(T, r, by, at); T.events = (T.events || []).filter(e => !(e && e.type === 'reprise' && e.data && e.data.de === r.weld_id));
    const stamp = planStamp(); T.events.push({ type: 'prefab', by: A.state.userId || '', byName: by, at, photos: [], data: { de: r.weld_id, kind: a.kind, dn: a.dn, lieu: a.lieu, ligne: a.ligne, pres: a.pres, par: a.par, le: a.le, planPointage: a.plan || null, planTransfert: stamp } });
    try { A.fixManch(T); } catch (e) { } A.pushWeld(T);
    a.statut = 'transferee'; a.vers = T.weldId; a.transfere = { by, at: at.toISOString(), plan: stamp, ligne: l.id, cond: c }; r.updated_at = at.toISOString(); r._pending = true; saveLocal().then(() => push(r));
    try { A.sync.logEvent(A.state.siteId, T.weldId, 'prefab', by, { de: r.weld_id }); } catch (e) { }
    A.state.attPose = null; A.renderAll(); renderAttWarn(); A.toast('⏳ ' + r.weld_id + ' → ' + T.weldId + ' : transférée (trace gardée sur la fiche)'); return true; }
  A.toast('Touche une SOUDURE du plan (si elle n\'y est pas encore, le plan doit d\'abord être mis à jour par le bureau) — ✕ en haut pour annuler'); return true; }
/** texte de l'événement « ⏳ Préfabriquée » dans l'historique d'une fiche */
export function prefabEvText(d) { d = d || {}; const p0 = d.planPointage, p1 = d.planTransfert; const maj = p0 && p1 && (p0.at !== p1.at || p0.n !== p1.n);
  return `⏳ Préfabriquée : pointée en attente (<b>${esc(d.de || '?')}</b>)${d.le ? ' le ' + esc(dh(d.le)) : ''}${d.par ? ' par ' + esc(d.par) : ''} — prévue : « ${esc(d.lieu || '—')} »${d.pres ? ' (près de ' + esc(d.pres) + ')' : ''} · plan non modifié au pointage (${esc(planTxt(p0))})${maj ? ', plan mis à jour ensuite (' + esc(planTxt(p1)) + ')' : ''} — transférée ici`; }
export const attTest = { manch: id => attManchForm(id), rows: () => [...ST.rows.values()], list: () => attWaiting().map(r => r.weld_id), all: () => [...ST.rows.values()].map(r => ({ id: r.weld_id, st: att(r).statut, vers: att(r).vers || null, pending: !!r._pending })), open: () => openAttente(), pose: () => A && A.state.attPose ? A.state.attPose.weld_id : null };
