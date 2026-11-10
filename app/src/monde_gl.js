// monde_gl.js — le MONDE 3D (WebGL, three.js) branché sur l'appli (nuit du 07 au 08/11/2026, Labo, option « Monde 3D » éteinte par défaut — réglages dans monde.js).
// Ici : construire les DONNÉES du monde à partir de l'espace (personnes, planning, véhicules, stock, affaires, chantiers, réseau du chantier), poser la scène dans la page,
// et traduire chaque clic 3D en action classique de l'appli (fiche, chantier, module, notification…). Sans WebGL : monde.js garde ses scènes SVG.
import { mountMonde3D, normPrefs, normNotes, setImagePrefix } from './monde3d/index.js';
export { noteDue, fmtRappel, nowLocal16 } from './monde3d/bureau.js';
import { SUPABASE_URL } from './sync.js';
setImagePrefix(SUPABASE_URL + '/storage/v1/object/sign/photos/bureau3d/'); /* 08/11 nuit : images du bureau (tapis de souris, cadres, affiches) = fichiers du stockage ; la fiche ne garde que l'adresse */
import { magStock } from './magasin.js';
import { vehAll, vehAlertes, vehType } from './flotte.js';
let GL = null; export function glAvailable() { if (GL != null) return GL; try { const c = document.createElement('canvas'); GL = !!(window.WebGLRenderingContext && (c.getContext('webgl2') || c.getContext('webgl'))); } catch (e) { GL = false; } return GL; }
const SECT0 = { ouest: 'Ouest', idf: 'Île-de-France', sudouest: 'Sud-Ouest', sudest: 'Sud-Est' };
const POSTE_FAM = p => (p && p.fam) || 'terrain';
let HOST = null, H = null, KIND = null, SIG = '', LAST = 0, PENDING = null, OVERK = null; /* OVERK : « Ma journée » ouvert — reste ouvert si la pièce est reconstruite (pointage → nouvelles données) */
/** la cellule à poser dans le HTML rendu ; la scène est montée juste après le rendu (requestAnimationFrame) */
export function glSlot(kind, me, ctx, extra) {
  PENDING = { kind, me, ctx, extra: extra || {} }; requestAnimationFrame(mountPending); return `<div class="m3d-slot" data-m3d-kind="${kind}" style="min-height:640px"></div>`;
}
function mountPending() {
  const P = PENDING; if (!P) return; const slot = document.querySelector('.m3d-slot[data-m3d-kind="' + P.kind + '"]'); if (!slot) return; PENDING = null;
  if (!HOST) { HOST = document.createElement('div'); HOST.className = 'm3d-mount'; }
  if (HOST.parentNode !== slot) { slot.innerHTML = ''; slot.appendChild(HOST); }
  let data; try { data = buildData(P.kind, P.me, P.ctx, P.extra); } catch (e) { console.warn('monde3d data', e); slot.innerHTML = '<div class="card"><div class="eq-s">Monde 3D : données indisponibles (' + String(e && e.message || e) + ')</div></div>'; return; }
  const sig = JSON.stringify([P.kind, data.me && data.me.id, data.people.length, data.vehicles.length, (data.notifs.todo || []).length, (data.notifs.know || []).length, data.affaires.length, data.chantiers.length, data.checklist.length, (data.network.lines || []).length, data.stock && data.stock.n, data.depots.map(d => d.k + d.nom + d.people.length).join(), JSON.stringify(data.me && data.me.prefs)]);
  const scene = P.kind;
  if (H && HOST.querySelector('canvas') && KIND === scene && sig === SIG && Date.now() - LAST < 120000) { try { if (H.setOpts) H.setOpts({ homeChips: P.extra.homeChips || null }); } catch (e) { } return; } /* même scène, mêmes données : on garde la 3D telle quelle (pas de reconstruction à chaque re-rendu) ; seul ce qui vient par-dessus (pointage) est rafraîchi */
  if (H) { try { H.dispose(); } catch (e) { } H = null; }
  KIND = scene; SIG = sig; LAST = Date.now();
  const ctx = P.ctx, me = P.me, extra = P.extra;
  try{if(window.TRACE)window.TRACE.monde3d=()=>H;}catch(e){} /* tests */
  const cloud = () => !!(ctx.api && ctx.api.state && ctx.api.state.cloudUser);
  H = mountMonde3D(HOST, data, { scene, perso: !!extra.perso, sideHTML: extra.sideHTML || null, homeChips: extra.homeChips || null, topRight: extra.topRight || null, initOver: OVERK, onOver: k => { OVERK = k; },
    onPrefs: prefs => { try { const d = ctx.peopleData(me.id) || {}; ctx.savePart(me.id, 'avatar', Object.assign({}, d.avatar || {}, { bureau3d: cloud() ? noInlineImages(prefs) : prefs })); } catch (e) { console.warn(e); } },
    onNotes: notes => { if (ctx.viewing && ctx.viewing()) { if (ctx.toast) ctx.toast('Lecture seule : tu vois l\'appli comme quelqu\'un d\'autre'); return; } saveNotes(me.id, notes, ctx); },
    uploadImage: dataUrl => uploadImage(dataUrl, me, ctx), onAction: (type, arg, x) => act(type, arg, x, me, ctx, extra) });
}
/* ── mes post-its : privés, gardés sur CE poste (localStorage), jamais dans la fiche que voient les collègues ── */
const NKEY = id => 'trace:notes3d:' + id;
function loadNotes(id) { try { return normNotes(JSON.parse(localStorage.getItem(NKEY(id)) || '[]')); } catch (e) { return []; } }
function saveNotes(id, notes, ctx) { try { localStorage.setItem(NKEY(id), JSON.stringify(normNotes(notes))); } catch (e) { if (ctx && ctx.toast) ctx.toast('Notes non enregistrées sur ce poste (stockage du navigateur plein ?)'); } }
/* ── images du bureau : déposées au stockage (bucket photos, dossier bureau3d/<personne>), la fiche garde l'adresse signée ; hors connexion (démo) : l'image reste dans la fiche locale ── */
async function uploadImage(dataUrl, me, ctx) { const A = ctx.api; if (ctx.viewing && ctx.viewing()) return null; if (!A || !A.sync || !A.sync.uploadDoc || !(A.state && A.state.cloudUser)) return dataUrl; try { const blob = await (await fetch(dataUrl)).blob(); return await A.sync.uploadDoc('bureau3d', String(me.id).replace(/[^\w-]+/g, '_'), 'image.jpg', blob); } catch (e) { console.warn('bureau3d image', e); return null; } }
/** connecté : jamais d'image en clair dans la fiche (elle est lue par toute l'équipe à chaque synchro) */
function noInlineImages(p) { const r = JSON.parse(JSON.stringify(p || {})); const inl = v => typeof v === 'string' && v.startsWith('data:'); if (inl(r.tapis_souris_img)) { r.tapis_souris_img = null; if (r.tapis_souris === 'image') r.tapis_souris = 'noir'; } (r.objets || []).forEach(o => { if (inl(o.img)) delete o.img; }); return r; }
/* 10/11 : rappels des post-its, côté appli (ligne « À faire », toast quand la 3D n'est pas affichée) */
export const notesOf = id => loadNotes(id);
export function glGo(type, arg) { if (!H) return false; try { H.go(type, arg); return true; } catch (e) { return false; } }
export const glKind = () => (H ? KIND : null);
export function glDispose() { if (H) { try { H.dispose(); } catch (e) { } H = null; KIND = null; } }
/* ── actions 3D → actions classiques ── */
function classic(act, v) { const root = document.getElementById('eq-app') || document.body; const b = document.createElement('button'); b.type = 'button'; b.dataset.act = act; b.dataset.v = v == null ? '' : String(v); b.style.display = 'none'; root.appendChild(b); try { b.click(); } finally { setTimeout(() => { try { b.remove(); } catch (e) { } }, 0); } }
function act(type, arg, x, me, ctx, extra) {
  const A = ctx.api;
  switch (type) {
    case 'person': classic('fiche', arg); return;
    case 'site': if (A && A.openSite) A.openSite(arg); return;
    case 'notif': classic('notif', arg); return;
    case 'tabgo': { const k = String(arg || ''); if (['commerce', 'parc', 'magasin', 'expl', 'entreprise', 'sites', 'espace', 'affaire', 'secu', 'admin'].includes(k)) classic('tabgo', k); else if (k === 'chantier') classic('tabgo', 'sites'); else if (k === 'pilotage') classic('tabgo', 'expl'); else if (k === 'flotte') classic('tabgo', 'parc'); else if (k === 'equipe') classic('tabgo', 'entreprise'); else if (k === 'compagnon') classic('tabgo', 'espace'); else if (k === 'planning') ctx.go('plan'); else if (k === 'prod') ctx.go('prod'); else if (k === 'valid') ctx.go('valid'); else if (k === 'reception') classic('tabgo', 'parc'); else ctx.go(k); return; }
    case 'vehicle': classic('tabgo', 'parc'); setTimeout(() => classic('fl', 'open|' + arg), 80); return;
    case 'vehicle_remise': classic('tabgo', 'parc'); setTimeout(() => classic('fl', 'open|' + arg), 80); return;
    case 'affaire': classic('tabgo', 'commerce'); setTimeout(() => classic('af', 'open|' + arg), 80); return;
    case 'attente': { if (ctx.viewing()) { ctx.toast('Lecture seule : tu vois l\'appli comme quelqu\'un d\'autre'); return; } const a = (ctx.affaires() || []).find(q => String(q.num || q.id) === String(arg)); if (!a) return; const de = x && x.de; if (!de) ctx.affSet(arg, { attente: null }); else { const d = new Date(); d.setDate(d.getDate() + 7); ctx.affSet(arg, { attente: { de, rel: (a.attente && a.attente.rel) || d.toISOString().slice(0, 10), note: (a.attente && a.attente.note) || '', at: new Date().toISOString(), by: ctx.nomC(me) } }); } return; }
    case 'attente_field': { if (ctx.viewing()) return; const a = (ctx.affaires() || []).find(q => String(q.num || q.id) === String(arg)); if (!a || !a.attente || !x) return; const at = Object.assign({}, a.attente); if (x.k === 'rel') at.rel = String(x.v || '').slice(0, 10); else at.note = String(x.v || '').slice(0, 140); ctx.affSet(arg, { attente: at }); return; }
    case 'magasin': { const seg = { stock: 'stock', cmd: 'cmd', dem: 'dem', rec: 'mvt', inv: 'mvt', cat: 'cat', equiper: 'fiches' }[arg] || 'stock'; classic('tabgo', 'magasin'); setTimeout(() => classic('x', 'mag|mseg|' + seg), 80); return; }
    case 'demande': classic('tabgo', 'magasin'); setTimeout(() => classic('x', 'mag|mseg|dem'), 80); return;
    case 'liste': classic('tabgo', 'magasin'); setTimeout(() => classic('x', 'mag|mseg|fiches'), 80); return;
    case 'bur': if (extra.onBur) extra.onBur(arg); return;
    case 'weld': if (extra.onWeld) extra.onWeld(arg); return;
    case 'line': return;
    case 'classic': if (extra.onClassic) extra.onClassic(); return;
    case 'appact': if (['accnew'].includes(String(arg))) classic(String(arg)); return; /* 09/11 : une action de l'appli posée en puce dans la scène (⚠ Accident = le même bouton que l'accueil classique) */
    default: return;
  }
}
/* ── les données ── */
function whereOf(p, ctx, today) { const ids = (ctx.planDe(p.id, today) || []).filter(id => id && id !== 'siege'); const ch = ids.map(id => ctx.chantiers.find(c => c.id === id && !c.bureau)).find(Boolean); if (ch) return { where: 'chantier', chantierId: ch.id, chantierNom: ch.nom }; return { where: 'depot' }; }
const personOut = (p, ctx, today, prefsOf) => { const d = ctx.peopleData(p.id) || {}; return { id: p.id, prenom: p.prenom || (ctx.nomC(p).split(' ')[0]), nom: p.nom || '', poste: p.poste, posteLabel: ctx.posteLabel(p), fam: ctx.famOf(p), secteur: ctx.secteurDe(p) || (ctx.mySecteur ? ctx.mySecteur(p) : '') || '', svg: ctx.avSVG(p, 240), av: ctx.avCfg ? ctx.avCfg(p) : null, prefs: prefsOf(d), today: whereOf(p, ctx, today), admin: !!p.admin }; };
export function buildData(kind, me, ctx, extra) {
  const today = ctx.today(); const S = Object.assign({}, SECT0, ctx.SECTEURS || {}); const cfg = extra.cfg || { depots: {}, magasin: '' };
  const prefsOf = d => { const b = d && d.avatar && d.avatar.bureau3d; return b ? normPrefs(b) : null; };
  const people = ctx.people.filter(p => p.active !== false && p.poste !== 'visiteur').map(p => personOut(p, ctx, today, prefsOf));
  const byKey = Object.fromEntries(people.map(p => [p.id, p]));
  // véhicules : conducteur = clé de personne ; sorti = son conducteur est sur chantier aujourd'hui
  let vehicles = []; try { vehicles = vehAll().map(v => { const drv = v.conducteurKey && byKey[String(v.conducteurKey).toLowerCase()] ? byKey[String(v.conducteurKey).toLowerCase()] : people.find(p => v.conducteur && ctx.nomC(p) === v.conducteur) || null; const secteur = (Object.keys(S).find(k => String(v.agence || '').toLowerCase() === S[k].toLowerCase()) || (drv && drv.secteur) || ''); return { id: v.id || v.immat, immat: v.immat, label: v.immat, type: v.type, typeLabel: vehType(v) || v.type || '', marque: v.marque, modele: v.modele, km: v.km, secteur, conducteurId: drv ? drv.id : null, conducteurNom: drv ? drv.prenom : (v.conducteur || ''), out: !!(drv && drv.today.where === 'chantier'), chantierNom: drv && drv.today.where === 'chantier' ? drv.today.chantierNom : '', alerts: (vehAlertes(v) || []).map(a => ({ sev: a.sev === 'bad' ? 'bad' : 'warn', t: a.t })) }; }); } catch (e) { console.warn('vehicules 3D', e); }
  people.forEach(p => { const v = vehicles.find(x => x.conducteurId === p.id); if (v) p.vehId = v.id; });
  let stock = null; try { stock = magStock(); } catch (e) { stock = null; }
  const affaires = (ctx.affaires() || []).filter(a => a && ['preconsult', 'devis'].includes(a.etat)).map(a => ({ num: String(a.num || a.id), nom: a.nom || a.num, client: a.client || '', ville: a.ville || '', etat: a.etat, etatLabel: a.etat === 'devis' ? 'Devis' : 'Préconsultation', secteur: a.secteur || '', montant: a.montant, attente: a.attente && a.attente.de ? a.attente : null }));
  const chantiers = ctx.chantiers.filter(c => !c.bureau).map(c => { const st = ctx.stat ? ctx.stat(c.id) : null; const team = people.filter(p => p.today.chantierId === c.id); const chef = c.chef && byKey[c.chef]; const cond = c.conducteur && byKey[c.conducteur]; return { id: c.id, nom: c.nom, ville: c.ville || '', secteur: c.secteur || '', pct: st && isFinite(+st.pct) ? Math.round(+st.pct) : null, total: st ? +st.total || 0 : 0, chefNom: chef ? chef.prenom : (c.chef || ''), conducteurNom: cond ? cond.prenom : (c.conducteur || ''), chefId: c.chef || null, conducteurId: c.conducteur || null, team, alerts: [] }; });
  const mySect = ctx.mySecteur(me) || '';
  /* 08/11 : sans secteur, on n'est plus effacé du monde — rangé au siège (dépôt coché « siège », sinon Ouest), signalé dans les réglages */
  const siegeK = Object.keys(S).find(k => k !== 'autres' && cfg.depots[k] && cfg.depots[k].siege) || (S.ouest ? 'ouest' : Object.keys(S).find(k => k !== 'autres')) || '';
  people.forEach(p => { if (!p.secteur || !S[p.secteur] || p.secteur === 'autres') { p.sansSecteur = true; p.secteur = siegeK; } });
  vehicles.forEach(v => { if (!v.secteur || !S[v.secteur] || v.secteur === 'autres') v.secteur = siegeK; });
  const depots = Object.keys(S).filter(k => k !== 'autres').map(k => { const d = cfg.depots[k] || {}; const pp = people.filter(p => p.secteur === k); return { k, nom: d.nom || ('Dépôt ' + S[k]), ville: d.ville || '', siege: !!d.siege, people: pp, vehicles: vehicles.filter(v => v.secteur === k), stock: cfg.magasin === k && stock ? stock : { n: 0, bas: 0, rup: 0, familles: [], demandes: [], listes: [] }, affaires: affaires.filter(a => !a.secteur || a.secteur === k), kpi: { presents: pp.filter(p => p.today.where === 'depot').length, chantiers: chantiers.filter(c => c.secteur === k).length, alertes: vehicles.filter(v => v.secteur === k && v.alerts.some(a => a.sev === 'bad')).length } }; }).filter(d => d.people.length || cfg.depots[d.k]);
  if (!depots.length) depots.push({ k: mySect || 'ouest', nom: 'Dépôt', ville: '', siege: true, people, vehicles, stock: stock || { n: 0, bas: 0, rup: 0, familles: [], demandes: [], listes: [] }, affaires, kpi: { presents: people.filter(p => p.today.where === 'depot').length, chantiers: chantiers.length, alertes: 0 } });
  const meP = people.find(p => p.id === me.id) || personOut(me, ctx, today, prefsOf); meP.prefs = meP.prefs || normPrefs(null); meP.secteur = meP.secteur || mySect;
  const notifs = { todo: (extra.todo || []).map(([x, i]) => ({ i, t: x.t, s: x.s, sev: x.sev, ic: typeof x.ic === 'string' && !/^</.test(x.ic) ? x.ic : '', when: x.when || '' })), know: (extra.know || []).map(([x, i]) => ({ i, kl: x.kl || x.t, kv: x.kv || x.s, sev: x.sev, ic: typeof x.ic === 'string' && !/^</.test(x.ic) ? x.ic : '', wait: x.wait || '' })) };
  /* 08/11 : clé du module d'après sa destination (go) — les clés courtes (moi, com, aff, mag, ent, adm) n'ouvraient rien */
  const KGO = { sites: 'chantier', expl: 'pilotage', espace: 'compagnon', parc: 'flotte', entreprise: 'equipe' };
  const spaces = (extra.spaces || []).map(s => { const g = s.go || s.k; return { k: KGO[g] || g, t: s.t, n: s.n || 0 }; });
  const mine = chantiers.filter(c => !mySect || !c.secteur || c.secteur === mySect);
  const screen = { date: today.split('-').reverse().join('/'), tiles: [{ v: mine.length, l: 'chantiers' }, { v: notifs.todo.length, l: 'à faire', col: '#FFD978' }, { v: people.filter(p => (!mySect || p.secteur === mySect) && p.today.where === 'chantier').length, l: 'sur le terrain' }], foot: notifs.todo.slice(0, 3).map(t => t.t) };
  return { me: meP, notes: kind === 'bureau' ? loadNotes(me.id) : [], jour: extra.jour || { rdv: [] }, /* 10/11 : rendez-vous du jour fournis par l'appli (Outlook plus tard) */ today, secteurs: S, depots, people, vehicles, stock, affaires, chantiers: mine, notifs, spaces, screen, network: extra.network || { lines: [] }, checklist: extra.checklist || [], chantier: extra.chantier || null };
}
/** le réseau du chantier ouvert, dans la forme attendue par la scène 3D (éléments du plan, soudures par état) */
export function networkOf(lines) {
  const L = Object.values(lines || {}); const out = []; L.forEach(l => { if (!l || !Array.isArray(l.els)) return; const pt = q => !q ? null : Array.isArray(q) ? [+q[0], +q[1]] : (q.x != null && q.y != null ? [+q.x, +q.y] : null); const els = l.els.map(e => ({ from: pt(e.from) || (e.axis && e.axis[0] ? pt(e.axis[0][0]) : null), to: pt(e.to) || (e.axis && e.axis[0] ? pt(e.axis[0][e.axis[0].length - 1]) : null), dn: e.dn, kind: e.kind })); const JA = (l.cond && l.cond.A && l.cond.A.joints) || [], JR = (l.cond && l.cond.R && l.cond.R.joints) || []; const RANK = { manchonnee: 3, controlee: 2, soudee: 1 }; const joints = els.map((e, i) => { const a = JA.find(x => x && x.idx === i) || JA[i], r = JR.find(x => x && x.idx === i) || JR[i]; const st = x => x && x.status && RANK[x.status] ? x.status : 'none'; const sa = st(a), sr = st(r); const both = RANK[sa] && RANK[sr] ? (RANK[sa] < RANK[sr] ? sa : sr) : (RANK[sa] || RANK[sr] ? 'soudee' : 'none'); return { idx: i, weldId: (a && a.weldId) || (r && r.weldId) || '', status: both, by: (a && a.by) || '' }; }); out.push({ id: l.id, name: l.name || l.id, parent: l.parent || null, els, joints }); }); return { lines: out };
}
