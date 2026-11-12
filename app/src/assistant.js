// assistant.js — 11/11 nuit (lot 6) — Ethan : « un chat IA : une bulle repliable partout ; des rubriques « signaler un bug » et « idée » (des registres que je reçois),
// qu'on peut tirer de la conversation ; le modèle appelé par une fonction serveur, avec la clé API que je colle dans Supabase ».
// · LA BULLE : un onglet 💬 au bord droit de l'écran, sur toutes les pages (sauf la connexion) ; « ⇥ Ranger » la réduit à une fine languette (gardé sur l'appareil).
//   Ouverte : un panneau (à droite sur ordinateur, en bas sur téléphone) avec « 💬 Discuter », « 🐞 Un bug », « 💡 Une idée » et, pour l'administrateur, « 📥 Reçus ».
// · DISCUTER : la fonction serveur « assistant » (supabase/functions/assistant) appelle le modèle avec la clé ANTHROPIC_API_KEY rangée dans Supabase (jamais dans l'appli).
//   Pas encore déployée → l'appli le dit simplement ; bugs et idées marchent quand même. La conversation reste sur ce téléphone (30 derniers messages).
//   « 🐞 En faire un bug » / « 💡 En faire une idée » : le modèle résume la conversation en titre + texte (sans lui : les messages de la personne), à relire avant d'envoyer.
// · BUG / IDÉE : titre (facultatif), ce qui se passe ou ce qui est proposé (obligatoire), l'écran est noté tout seul (écran, onglet, chantier, version, appareil).
//   Registre « retour » (sql/retours_ia_1111.sql) : chacun envoie et relit les siens (« Mes envois » : nouveau → vu → fait) ; l'administrateur reçoit tout.
// · REÇUS (administrateur) : filtres, « vu » / « fait », réponse courte, et « 📋 Copier pour Claude » (la liste à coller dans la conversation de développement).
import { regSet, regAll, regLoad, regMissing, onReg } from './reg.js';
import { tutoManuel } from './tuto.js';
import { manuelTexte } from './assistant_manuel.js'; // 11/11 après-midi : le manuel de Tracé envoyé avec chaque question (la fonction serveur le met en cache)
let A = null, ROOT = null, OPEN = false, TAB = 'chat', CONV = null, BUSY = false, FORM = { bug: null, idee: null }, RF = 'ouverts';
const esc = s => String(s == null ? '' : s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
const LS = { get(k, d) { try { const v = localStorage.getItem('trace:ia:' + k); return v == null ? d : JSON.parse(v); } catch (e) { return d; } }, set(k, v) { try { localStorage.setItem('trace:ia:' + k, JSON.stringify(v)); } catch (e) { } } };
const dh = x => { const d = new Date(x); return isNaN(d) ? '' : d.toLocaleString('fr-FR', { day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit' }); };
const ST_LAB = { nouveau: 'nouveau', vu: 'vu', fait: '✓ fait' };
export function initAssistant(api) { A = api; try { onReg((kind) => { if (kind === 'retour') { badge(); if (OPEN && (TAB === 'recus' || TAB === 'bug' || TAB === 'idee')) draw(); } }); } catch (e) { } }
const isAdm = () => { try { return !!A.isAdmin(); } catch (e) { return false; } };
const myKey = () => { try { return String(A.userKey() || '').toLowerCase(); } catch (e) { return ''; } };
const conv = () => { if (!CONV) { const c = LS.get('conv', []); CONV = Array.isArray(c) ? c.filter(m => m && (m.role === 'user' || m.role === 'assistant') && typeof m.content === 'string').slice(-30) : []; } return CONV; };
const saveConv = () => LS.set('conv', conv().slice(-30));
function css() { if (document.getElementById('ia-css')) return; const s = document.createElement('style'); s.id = 'ia-css'; s.textContent = `
#ia-root{position:fixed;right:0;top:58%;z-index:880;font-family:inherit}
#ia-root[hidden]{display:none}
body:has(#modal.show) #ia-root,body:has(#sheet.show) #ia-root,body:has(#menu.show) #ia-root,body:has(#tuto) #ia-root{display:none} /* une fenêtre, la fiche d'une soudure ou le menu ouverts : la bulle s'efface (elle ne couvre jamais un bouton) */
.ia-btn{display:flex;align-items:center;justify-content:center;gap:2px;width:40px;height:52px;border:0;border-radius:14px 0 0 14px;background:#2B1B5A;color:#fff;font-size:19px;box-shadow:0 6px 18px rgba(43,27,90,.28);cursor:pointer;padding:0 0 0 4px;position:relative;transition:width .15s}
.ia-btn:focus-visible{outline:3px solid #A898E8;outline-offset:2px}
#ia-root.range .ia-btn{width:14px;padding:0;font-size:0;border-radius:10px 0 0 10px;opacity:.75}
#ia-root.range .ia-btn::before{content:'';width:3px;height:22px;border-radius:2px;background:#D6CEF2}
.ia-badge{position:absolute;top:-6px;left:-6px;min-width:20px;height:20px;border-radius:10px;background:#E2584E;color:#fff;font-size:12px;font-weight:800;display:flex;align-items:center;justify-content:center;padding:0 5px;box-sizing:border-box}
.ia-badge[hidden]{display:none}
.ia-panel{position:fixed;right:12px;bottom:12px;top:auto;width:min(410px,calc(100vw - 24px));height:min(640px,calc(100vh - 90px));background:#fff;border-radius:18px;box-shadow:0 18px 50px rgba(27,21,48,.35);z-index:890;display:flex;flex-direction:column;overflow:hidden;color:#1B1530}
.ia-panel[hidden]{display:none}
.ia-head{display:flex;align-items:center;gap:6px;padding:10px 10px 8px 14px;background:#2B1B5A;color:#fff}.ia-head b{flex:1;font-size:16px}
.ia-head button{min-width:40px;min-height:40px;border:0;border-radius:10px;background:rgba(255,255,255,.14);color:#fff;font:inherit;font-size:15px;font-weight:700;cursor:pointer}
.ia-tabs{display:flex;gap:4px;padding:8px 8px 0;flex-wrap:wrap;border-bottom:1px solid #ECE8F5}
.ia-tabs button{flex:1;min-height:42px;border:0;border-radius:10px 10px 0 0;background:#F5F2FD;color:#2B1B5A;font:inherit;font-size:13.5px;font-weight:800;cursor:pointer;white-space:nowrap;padding:0 6px}
.ia-tabs button.on{background:#2B1B5A;color:#fff}
.ia-body{flex:1;overflow:auto;padding:12px;display:flex;flex-direction:column;gap:8px}
.ia-msg{max-width:88%;padding:9px 12px;border-radius:14px;font-size:14.5px;line-height:1.4;white-space:pre-wrap;word-wrap:break-word}
.ia-msg.user{align-self:flex-end;background:#2B1B5A;color:#fff;border-bottom-right-radius:4px}.ia-msg.assistant{align-self:flex-start;background:#F5F2FD;border-bottom-left-radius:4px}
.ia-msg.sys{align-self:stretch;max-width:none;background:#FFF6E5;color:#7A4A00;font-size:13.5px}
.ia-foot{display:flex;gap:6px;padding:8px;border-top:1px solid #ECE8F5;align-items:flex-end}
.ia-foot textarea{flex:1;min-height:46px;max-height:120px;resize:none;font:inherit;font-size:16px;padding:10px;border:1.5px solid #CFC9E0;border-radius:12px;box-sizing:border-box}
.ia-foot button,.ia-act{min-height:46px;padding:0 14px;border-radius:12px;border:0;background:#2B1B5A;color:#fff;font:inherit;font-size:15px;font-weight:800;cursor:pointer}
.ia-foot button[disabled]{opacity:.5}
.ia-acts{display:flex;gap:6px;flex-wrap:wrap}.ia-act.sec{background:#fff;color:#2B1B5A;border:1.5px solid #CFC9E0}
.ia-f{display:flex;flex-direction:column;gap:4px;font-size:13.5px;font-weight:800;color:#3A3550}.ia-f small{font-weight:600;color:#6B6585}
.ia-f input,.ia-f textarea{font:inherit;font-weight:500;font-size:16px;padding:10px;border:1.5px solid #CFC9E0;border-radius:12px;box-sizing:border-box;width:100%}.ia-f textarea{min-height:120px;resize:vertical}
.ia-ou{font-size:12.5px;color:#6B6585;background:#F7F6FB;border-radius:10px;padding:6px 10px}
.ia-err{background:#FDECEA;color:#9B2C22;border-radius:10px;padding:8px 10px;font-weight:700;font-size:13.5px}
.ia-ok{background:#E6F5EC;color:#0E6B5C;border-radius:10px;padding:8px 10px;font-weight:700;font-size:13.5px}
.ia-r{border:1px solid #ECE8F5;border-radius:12px;padding:8px 10px;font-size:13.5px}.ia-r b{font-size:14.5px}.ia-r .ia-meta{color:#6B6585;font-size:12.5px;margin-top:2px}
.ia-r.fait{opacity:.6}.ia-st{display:inline-block;border-radius:8px;padding:1px 7px;font-size:12px;font-weight:800;background:#F5F2FD;color:#2B1B5A}.ia-st.nouveau{background:#FFE9C7;color:#7A4A00}.ia-st.fait{background:#E6F5EC;color:#0E6B5C}
.ia-chips{display:flex;gap:6px;flex-wrap:wrap}.ia-chips button{min-height:38px;padding:0 12px;border-radius:999px;border:1.5px solid #CFC9E0;background:#fff;font:inherit;font-size:13px;font-weight:800;color:#2B1B5A;cursor:pointer}.ia-chips button.on{background:#2B1B5A;color:#fff;border-color:#2B1B5A}
@media (max-width:640px){#ia-root{top:40%}.ia-btn{width:36px;height:48px;font-size:17px}.ia-panel{right:0;left:0;bottom:0;width:100vw;height:min(86vh,calc(100vh - 40px));border-radius:18px 18px 0 0}}
@media print{#ia-root,.ia-panel{display:none!important}}`; document.head.appendChild(s); }
function mount() { if (ROOT || typeof document === 'undefined' || !document.body) return; css();
  ROOT = document.createElement('div'); ROOT.id = 'ia-root'; ROOT.hidden = true; if (LS.get('range', false)) ROOT.classList.add('range');
  ROOT.innerHTML = '<button type="button" class="ia-btn" id="ia-btn" aria-label="Assistant Tracé : discuter, signaler un bug, proposer une idée" title="Assistant : discuter, un bug, une idée">💬<span class="ia-badge" hidden></span></button>';
  document.body.appendChild(ROOT); const P = document.createElement('div'); P.id = 'ia-panel'; P.className = 'ia-panel'; P.hidden = true; P.setAttribute('role', 'dialog'); P.setAttribute('aria-label', 'Assistant Tracé'); document.body.appendChild(P);
  ROOT.querySelector('#ia-btn').addEventListener('click', () => { if (ROOT.classList.contains('range')) { ROOT.classList.remove('range'); LS.set('range', false); } ouvrir(!OPEN); });
  P.addEventListener('click', onClick); P.addEventListener('keydown', e => { if (e.key === 'Escape') ouvrir(false); if (e.key === 'Enter' && (e.ctrlKey || e.metaKey) && e.target.id === 'ia-in') envoyer(); });
  P.addEventListener('input', e => { const t = e.target; if (t.dataset && t.dataset.iaf) { const [k, f] = t.dataset.iaf.split('|'); FORM[k] = FORM[k] || {}; FORM[k][f] = t.value; } }); }
/** à chaque rendu de l'appli : visible partout sauf à la connexion ; pastille « reçus » pour l'administrateur */
export function iaRefresh() { if (!A) return; mount(); if (!ROOT) return; const scr = A.state && A.state.screen; const vis = !!scr && scr !== 'login'; ROOT.hidden = !vis; if (!vis && OPEN) ouvrir(false); badge(); }
function badge() { if (!ROOT) return; const b = ROOT.querySelector('.ia-badge'); if (!b) return; const n = isAdm() ? regAll('retour').filter(r => (r.statut || 'nouveau') === 'nouveau').length : 0; b.hidden = !n; b.textContent = n > 99 ? '99+' : String(n || ''); }
function ouvrir(on) { OPEN = !!on; const P = document.getElementById('ia-panel'); if (!P) return; P.hidden = !OPEN; ROOT.querySelector('#ia-btn').setAttribute('aria-expanded', OPEN ? 'true' : 'false');
  if (OPEN) { if (isAdm() || TAB === 'bug' || TAB === 'idee') regLoad(['retour']).then(() => { badge(); if (OPEN && TAB !== 'chat') draw(); }).catch(() => { }); draw(); setTimeout(() => { const i = document.getElementById(TAB === 'chat' ? 'ia-in' : 'ia-texte'); if (i && window.innerWidth > 640) i.focus(); }, 30); } }
function contexte() { let c = ''; try { c = A.screenInfo() || ''; } catch (e) { } return c; }
/* le manuel : tutoriels que CETTE personne voit (droits du compte affiché) + nouveautés + situations de terrain ; reconstruit à chaque question (quelques ms) */
const TUTO_MOD = { chantiers: 'chantier', chantier: 'chantier', pilotage: 'pilotage', compagnon: 'compagnon', commerce: 'commerce', affaire: 'affaire', flotte: 'flotte', magasin: 'magasin', concepteur: 'concepteur', equipe: 'equipe' };
const MOD_NOM = { chantier: 'Chantier', pilotage: 'Pilotage', compagnon: 'Compagnon', commerce: 'Commerce', affaire: 'Affaire', flotte: 'Flotte', magasin: 'Magasin', equipe: 'Équipe', rh: 'RH', concepteur: 'Concepteur (traceur)' };
function manuel() {
  let mods = null; try { mods = A.modules ? A.modules() : null; } catch (e) { } if (!Array.isArray(mods) || !mods.length) mods = null;
  const keep = k => { if (!mods) return true; const m = TUTO_MOD[String(k).split(':')[0]]; return !m || mods.includes(m); }; /* tutoriels des onglets ouverts à la personne (accueil, réglages : toujours) */
  let t = ''; try { t = tutoManuel(keep); } catch (e) { }
  const f = (k) => { try { return String((A[k] && A[k]()) || ''); } catch (e) { return ''; } };
  try { return manuelTexte({ tutos: t, profil: profil(), ouverts: mods ? mods.map(k => MOD_NOM[k] || k) : [], fermes: mods ? Object.keys(MOD_NOM).filter(k => !mods.includes(k)).map(k => MOD_NOM[k]) : [], droits: f('droits'), quiPeut: f('quiPeut') }).slice(0, 150000); } catch (e) { return ''; }
}
function profil() { try { return String((A.profil && A.profil()) || '').slice(0, 200); } catch (e) { return ''; } }
function draw() { const P = document.getElementById('ia-panel'); if (!P) return; const adm = isAdm();
  const tabs = [['chat', '💬 Discuter'], ['bug', '🐞 Un bug'], ['idee', '💡 Une idée']].concat(adm ? [['recus', '📥 Reçus' + (() => { const n = regAll('retour').filter(r => (r.statut || 'nouveau') === 'nouveau').length; return n ? ' (' + n + ')' : ''; })()]] : []);
  const sc = (P.querySelector('.ia-body') || {}).scrollTop || 0; const keepScroll = P.dataset.tab === TAB;
  P.innerHTML = `<div class="ia-head"><b>Assistant Tracé</b><button type="button" data-ia="ranger" title="Ranger la bulle au bord de l'écran" aria-label="Ranger la bulle">⇥</button><button type="button" data-ia="fermer" aria-label="Fermer">✕</button></div>
    <div class="ia-tabs" role="tablist">${tabs.map(([k, l]) => `<button type="button" role="tab" aria-selected="${TAB === k}" class="${TAB === k ? 'on' : ''}" data-iatab="${k}">${l}</button>`).join('')}</div>${TAB === 'chat' ? chatHTML() : TAB === 'recus' ? recusHTML() : formHTML(TAB)}`;
  P.dataset.tab = TAB; const b = P.querySelector('.ia-body'); if (b) { if (TAB === 'chat') b.scrollTop = b.scrollHeight; else if (keepScroll) b.scrollTop = sc; } }
/* ── discuter ── */
function chatHTML() { const C = conv(); const hasUser = C.some(m => m.role === 'user');
  const msgs = C.map(m => `<div class="ia-msg ${m.role}">${esc(m.content)}</div>`).join('') || `<div class="ia-msg assistant">Bonjour ! Pose ta question sur l'appli (pointage, plan, soudures, flotte, heures…). Un souci ou une idée ? Les onglets 🐞 et 💡 les envoient à l'administrateur.</div>`;
  const etat = LS.get('etat', null); const sys = etat === 'absent' ? `<div class="ia-msg sys">L'assistant n'est pas encore branché (fonction serveur « assistant » à installer dans Supabase). Les bugs et les idées, eux, marchent déjà.</div>` : etat === 'horsligne' ? `<div class="ia-msg sys">Hors connexion : l'assistant répondra quand le réseau reviendra.</div>` : etat === 'demo' ? `<div class="ia-msg sys">L'assistant répond une fois connecté avec ton compte Tracé. Les bugs et les idées, eux, marchent déjà.</div>` : '';
  return `<div class="ia-body" id="ia-msgs">${msgs}${BUSY ? '<div class="ia-msg assistant">…</div>' : ''}${sys}${hasUser ? `<div class="ia-acts"><button type="button" class="ia-act sec" data-ia="tirer|bug">🐞 En faire un bug</button><button type="button" class="ia-act sec" data-ia="tirer|idee">💡 En faire une idée</button>${C.length ? '<button type="button" class="ia-act sec" data-ia="effacer">Effacer</button>' : ''}</div>` : ''}</div>
    <div class="ia-foot"><textarea id="ia-in" rows="1" placeholder="Ta question…" aria-label="Ta question" maxlength="2000"></textarea><button type="button" data-ia="envoyer"${BUSY ? ' disabled' : ''}>Envoyer</button></div>`; }
async function envoyer() { if (BUSY) return; const i = document.getElementById('ia-in'); const t = String(i && i.value || '').trim(); if (!t) return; conv().push({ role: 'user', content: t.slice(0, 2000) }); saveConv(); BUSY = true; draw();
  let r = null; try { r = await appel({ mode: 'chat', messages: conv().slice(-20), contexte: contexte(), manuel: manuel(), profil: profil() }); } catch (e) { r = { ok: false, error: String(e && e.message || e) }; }
  BUSY = false; if (r && r.ok && r.texte) { LS.set('etat', 'ok'); conv().push({ role: 'assistant', content: String(r.texte).slice(0, 6000) }); saveConv(); }
  else { LS.set('etat', r && r.missing ? 'absent' : r && r.offline ? 'horsligne' : r && r.nocloud ? 'demo' : 'erreur'); if (r && !r.missing && !r.offline && !r.nocloud) conv().push({ role: 'assistant', content: 'Je n\'ai pas pu répondre (' + String(r && r.error || 'erreur').slice(0, 160) + '). Réessaie dans un moment.' }); saveConv(); }
  if (OPEN && TAB === 'chat') draw(); }
async function appel(body) { if (!A.cloud()) return { ok: false, nocloud: true }; if (typeof navigator !== 'undefined' && navigator.onLine === false) return { ok: false, offline: true };
  if (!A.sync || !A.sync.invokeFn) return { ok: false, missing: true }; const r = await A.sync.invokeFn('assistant', body); return r || { ok: false }; }
/* « en faire un bug / une idée » : le modèle résume ; sans lui, les messages de la personne */
async function tirer(type) { const C = conv(); const mine = C.filter(m => m.role === 'user').map(m => m.content); FORM[type] = FORM[type] || {};
  FORM[type].texte = mine.join('\n— ').slice(0, 1500); FORM[type].titre = (mine[0] || '').split(/[.\n?!]/)[0].slice(0, 80); FORM[type].conv = C.slice(-10); TAB = type; draw();
  const r = await appel({ mode: 'resume', type, messages: C.slice(-20) }).catch(() => null); if (r && r.ok && (r.texte || r.titre)) { FORM[type].titre = String(r.titre || FORM[type].titre).slice(0, 120); FORM[type].texte = String(r.texte || FORM[type].texte).slice(0, 3000); if (OPEN && TAB === type) draw(); } }
/* ── un bug / une idée ── */
function formHTML(type) { const F = FORM[type] || {}; const bug = type === 'bug'; const mes = regAll('retour').filter(r => (r.parKey || '') === myKey() || String(r.id).split('|')[0] === myKey()).sort((a, b) => String(b.le || '').localeCompare(String(a.le || ''))).slice(0, 8);
  const miss = regMissing('retour');
  return `<div class="ia-body">${F._ok ? `<div class="ia-ok">${esc(F._ok)}</div>` : ''}${F._err ? `<div class="ia-err">${esc(F._err)}</div>` : ''}
    <label class="ia-f">Titre <small>(facultatif)</small><input id="ia-titre" maxlength="120" data-iaf="${type}|titre" value="${esc(F.titre || '')}" placeholder="${bug ? 'ex. le bouton Valider ne répond pas' : 'ex. voir la météo du chantier'}" autocomplete="off"></label>
    <label class="ia-f">${bug ? 'Ce qui se passe' : 'Ton idée'} <small>(obligatoire${bug ? ' : ce que tu faisais, ce qui s\'est passé, ce que tu attendais' : ' : ce que ça changerait pour toi'})</small><textarea id="ia-texte" maxlength="3000" data-iaf="${type}|texte">${esc(F.texte || '')}</textarea></label>
    <div class="ia-ou">Noté tout seul : ${esc(contexte() || 'écran actuel')}</div>
    <div class="ia-acts"><button type="button" class="ia-act" data-ia="envoyerRetour|${type}">${bug ? '🐞 Envoyer le bug' : '💡 Envoyer l\'idée'}</button></div>
    ${miss && isAdm() ? '<div class="ia-err">Serveur : passe sql/retours_ia_1111.sql (registre « retour » inconnu) — en attendant, gardé sur cet appareil.</div>' : ''}
    ${mes.length ? `<div style="margin-top:6px;font-weight:800;font-size:13.5px">Mes envois</div>${mes.map(r => `<div class="ia-r ${r.statut === 'fait' ? 'fait' : ''}"><b>${r.type === 'bug' ? '🐞' : '💡'} ${esc(r.titre || String(r.texte || '').slice(0, 60))}</b> <span class="ia-st ${esc(r.statut || 'nouveau')}">${esc(ST_LAB[r.statut || 'nouveau'] || r.statut)}</span><div class="ia-meta">${dh(r.le)}${r.reponse ? ' · réponse : ' + esc(r.reponse) : ''}</div></div>`).join('')}` : ''}</div>`; }
function envoyerRetour(type) { const F = FORM[type] = FORM[type] || {}; const texte = String(F.texte || '').trim(); F._ok = ''; F._err = '';
  if (texte.length < 5) { F._err = type === 'bug' ? 'Décris ce qui se passe (quelques mots suffisent).' : 'Décris ton idée (quelques mots suffisent).'; draw(); return; }
  const key = myKey(); if (!key) { F._err = 'Connecte-toi d\'abord.'; draw(); return; }
  const id = key + '|' + Date.now().toString(36) + Math.random().toString(36).slice(2, 5); let ua = ''; try { ua = (navigator.userAgent || '').replace(/\s+/g, ' ').slice(0, 160); } catch (e) { }
  const rec = { type, titre: String(F.titre || '').trim().slice(0, 120), texte: texte.slice(0, 3000), ou: contexte().slice(0, 300), app: (A.version && A.version()) || '', appareil: ua, ecranL: window.innerWidth || 0, par: A.userName(), parKey: key, le: new Date().toISOString(), statut: 'nouveau' };
  if (F.conv && F.conv.length) rec.conv = F.conv.map(m => ({ r: m.role === 'user' ? 'u' : 'a', t: String(m.content).slice(0, 600) })).slice(-10);
  regSet('retour', id, rec, { local: !A.cloud() }); FORM[type] = { _ok: (type === 'bug' ? 'Bug envoyé ✓' : 'Idée envoyée ✓') + ' — l\'administrateur le reçoit. Merci !' }; badge(); draw(); A.toast(type === 'bug' ? '🐞 Bug envoyé — merci' : '💡 Idée envoyée — merci'); }
/* ── reçus (administrateur) ── */
function recusList() { const L = regAll('retour').sort((a, b) => String(b.le || '').localeCompare(String(a.le || ''))); return L.filter(r => RF === 'tous' ? true : RF === 'bug' ? r.type === 'bug' && r.statut !== 'fait' : RF === 'idee' ? r.type === 'idee' && r.statut !== 'fait' : r.statut !== 'fait'); }
function recusHTML() { const L = recusList(); const all = regAll('retour'); const n = k => all.filter(r => k === 'tous' ? true : k === 'bug' ? r.type === 'bug' && r.statut !== 'fait' : k === 'idee' ? r.type === 'idee' && r.statut !== 'fait' : r.statut !== 'fait').length;
  return `<div class="ia-body"><div class="ia-chips">${[['ouverts', 'À traiter'], ['bug', '🐞 Bugs'], ['idee', '💡 Idées'], ['tous', 'Tous']].map(([k, l]) => `<button type="button" class="${RF === k ? 'on' : ''}" data-ia="rf|${k}">${l} · ${n(k)}</button>`).join('')}</div>
    <div class="ia-acts"><button type="button" class="ia-act" data-ia="copier">📋 Copier pour Claude (${L.length})</button></div><div id="ia-copie" class="ia-ok" hidden></div>
    ${L.map(r => `<div class="ia-r ${r.statut === 'fait' ? 'fait' : ''}" data-iar="${esc(r.id)}"><b>${r.type === 'bug' ? '🐞' : '💡'} ${esc(r.titre || String(r.texte || '').slice(0, 60))}</b> <span class="ia-st ${esc(r.statut || 'nouveau')}">${esc(ST_LAB[r.statut || 'nouveau'] || r.statut)}</span>
      <div style="white-space:pre-wrap;margin-top:4px">${esc(String(r.texte || '').slice(0, 1200))}</div><div class="ia-meta">${esc(r.par || '')} · ${dh(r.le)}${r.ou ? ' · ' + esc(r.ou) : ''}${r.app ? ' · version ' + esc(r.app) : ''}</div>${r.reponse ? `<div class="ia-meta">Ta réponse : ${esc(r.reponse)}</div>` : ''}
      <div class="ia-acts" style="margin-top:6px">${r.statut !== 'vu' && r.statut !== 'fait' ? `<button type="button" class="ia-act sec" data-ia="st" data-iid="${esc(r.id)}" data-iv="vu">Vu</button>` : ''}${r.statut !== 'fait' ? `<button type="button" class="ia-act sec" data-ia="st" data-iid="${esc(r.id)}" data-iv="fait">✓ Fait</button>` : `<button type="button" class="ia-act sec" data-ia="st" data-iid="${esc(r.id)}" data-iv="vu">Rouvrir</button>`}<button type="button" class="ia-act sec" data-ia="rep" data-iid="${esc(r.id)}">Répondre</button></div></div>`).join('') || '<div class="ia-meta">Rien à traiter.</div>'}</div>`; }
function copier() { const L = recusList(); const txt = 'Retours Tracé (' + L.length + ') — à traiter :\n' + L.map(r => `- [${r.type === 'bug' ? 'BUG' : 'IDÉE'}] ${r.titre ? r.titre + ' — ' : ''}${String(r.texte || '').replace(/\s+/g, ' ').slice(0, 600)} (par ${r.par || '?'}, le ${dh(r.le)}${r.ou ? ', écran : ' + r.ou : ''}${r.app ? ', version ' + r.app : ''})`).join('\n');
  const done = ok => { const c = document.getElementById('ia-copie'); if (c) { c.hidden = false; c.textContent = ok ? '✓ Copié : colle-le dans la conversation avec Claude' : 'Copie impossible ici : sélectionne le texte ci-dessous'; if (!ok) { c.className = 'ia-r'; c.style.whiteSpace = 'pre-wrap'; c.textContent = txt; } } };
  try { if (navigator.clipboard && navigator.clipboard.writeText) navigator.clipboard.writeText(txt).then(() => done(true), () => done(false)); else done(false); } catch (e) { done(false); } return txt; }
function statut(id, st) { if (!isAdm()) return; regSet('retour', id, { statut: st, traite: { by: A.userName(), at: new Date().toISOString() } }, { local: !A.cloud() }); badge(); draw(); }
function repondre(id) { if (!isAdm()) return; const r = regAll('retour').find(x => x.id === id); const v = prompt('Réponse courte (la personne la voit dans « Mes envois ») :', (r && r.reponse) || ''); if (v == null) return; regSet('retour', id, { reponse: String(v).trim().slice(0, 300) || null, statut: r && r.statut === 'nouveau' ? 'vu' : (r && r.statut) || 'vu' }, { local: !A.cloud() }); draw(); }
function onClick(e) { const t = e.target.closest('[data-ia],[data-iatab]'); if (!t) return; if (t.dataset.iatab) { TAB = t.dataset.iatab; if (TAB !== 'chat') regLoad(['retour']).then(() => { if (OPEN) draw(); }).catch(() => { }); draw(); return; }
  const [k, a, b] = t.dataset.ia.split('|');
  if (k === 'fermer') { ouvrir(false); return; } if (k === 'ranger') { ouvrir(false); ROOT.classList.add('range'); LS.set('range', true); A.toast('Bulle rangée au bord droit — touche-la pour la rouvrir'); return; }
  if (k === 'envoyer') { envoyer(); return; } if (k === 'effacer') { CONV = []; saveConv(); draw(); return; } if (k === 'tirer') { tirer(a); return; }
  if (k === 'envoyerRetour') { envoyerRetour(a); return; } if (k === 'rf') { RF = a; draw(); return; } if (k === 'copier') { copier(); return; } if (k === 'st') { statut(t.dataset.iid, t.dataset.iv); return; } if (k === 'rep') { repondre(t.dataset.iid); return; } } /* l'identifiant contient « | » (clé|uid) : il voyage à part (data-iid) */
export const iaTest = { open: (tab) => { mount(); if (tab) TAB = tab; ouvrir(true); }, close: () => ouvrir(false), tab: () => TAB, conv: () => conv().slice(), copier: () => copier(), manuel: () => manuel(), profil: () => profil() };
