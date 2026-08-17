import { mountTrace } from './engine.js'
import bain from './data_bain.json'
import saintloJaune from './data_saintlo_jaune.json'

// ---- chantiers (le troisième, Saint-Lô zone bleue, s'ajoute ici dès réception du DWG) ----
const SITES = [
  { id: 'bain', name: 'Bain-de-Bretagne', supplier: 'LOGSTOR', serie: 2, data: bain, note: 'DWG calepinage LOGSTOR · CC48' },
  { id: 'saintlo-jaune', name: 'Saint-Lô · tranche jaune', supplier: 'RENALIA', serie: 2, data: saintloJaune, note: 'DWG Renalia V4 · CC49' },
]
const $ = s => document.querySelector(s)
const KEY = (site, line) => `trace:v1:${site}:${line}`
const store = {
  load(site, line) { try { const s = localStorage.getItem(KEY(site, line)); return s ? JSON.parse(s) : null } catch (e) { return null } },
  save(site, line, state) { try { localStorage.setItem(KEY(site, line), JSON.stringify(state)) } catch (e) { console.warn('stockage local plein ou indisponible', e) } },
}
let app = null, cur = { site: null, line: null }
function lineLabel(l) { const c = l.cond ? (l.cond === 'A' ? 'aller' : 'retour') : ''; return `${l.id} · ${l.name}${c ? ' · ' + c : ''} · ${Math.round(l.length)} m · ${l.els.length} él.` }
function fillSites() { $('#site').innerHTML = SITES.map(s => `<option value="${s.id}">${s.name} — ${s.supplier}</option>`).join('') }
function fillLines(site) { $('#line').innerHTML = site.data.lines.map(l => `<option value="${l.id}">${lineLabel(l)}</option>`).join('') }
function bboxOf(els) { let x0 = 1e9, y0 = 1e9, x1 = -1e9, y1 = -1e9; els.forEach(e => e.axis.forEach(pl => pl.forEach(p => { x0 = Math.min(x0, p[0]); y0 = Math.min(y0, p[1]); x1 = Math.max(x1, p[0]); y1 = Math.max(y1, p[1]) }))); return [x0, y0, x1, y1] }
function othersOf(site, line) { // départs et fins des autres lignes de la même conduite (aller/retour) : pour reconnaître les tés aux « demi-tours »
  const out = []; site.data.lines.forEach(l => { if (l.id === line.id || !l.els.length || (line.cond && l.cond && l.cond !== line.cond)) return; const e0 = l.els[0], e1 = l.els[l.els.length - 1]
    out.push({ id: l.id, pt: e0.from, pt2: e0.to, dn: e0.dn, len: l.length, n: l.els.length }); out.push({ id: l.id, pt: e1.to, pt2: e1.from, dn: e1.dn, len: l.length, n: l.els.length }) })
  return out }
function textsOf(site, bbox) { const M = 8; return (site.data.ann || []).filter(a => a.p && a.p[0] > bbox[0] - M && a.p[0] < bbox[2] + M && a.p[1] > bbox[1] - M && a.p[1] < bbox[3] + M).map(a => ({ x: a.p[0], y: a.p[1], t: String(a.text || '').replace(/\\[A-Za-z][^;]*;/g, '').trim() })) }
function mount(siteId, lineId) {
  const site = SITES.find(s => s.id === siteId) || SITES[0]; const line = site.data.lines.find(l => l.id === lineId) || site.data.lines[0]
  if (app) { app.unmount(); app = null }
  cur = { site: site.id, line: line.id }
  const els = line.els.filter(e => e.axis && e.axis[0] && e.axis[0].length >= 2)
  const bbox = bboxOf(els)
  const SUB = { main: { id: line.id, els }, bbox, texts: textsOf(site, bbox), others: othersOf(site, line), site: site.id, supplier: site.supplier }
  const saved = store.load(site.id, line.id)
  const statuses = {}; if (saved && saved.chain) saved.chain.forEach(p => { if (p.jid && p.jst) statuses[p.jid] = p.jst })
  $('#badge').textContent = `${site.note} · ${line.els.length} éléments lus` + (saved ? ' · état enregistré' : ' · lecture du plan')
  try {
    app = mountTrace({ root: $('#app'), SUB, statuses, saved, onCommit: state => { store.save(site.id, line.id, state); $('#badge').textContent = `${site.note} · enregistré ${new Date().toLocaleTimeString('fr-FR')}` } })
  } catch (e) { console.error(e); $('#side').innerHTML = `<div class="bad">Cette ligne n'a pas pu être lue par le moteur : ${e.message}. Choisis une autre ligne — je corrige à la prochaine itération.</div>` }
  const url = new URL(location.href); url.searchParams.set('site', site.id); url.searchParams.set('line', line.id); history.replaceState(null, '', url)
}
fillSites()
const q = new URL(location.href).searchParams
const s0 = SITES.find(s => s.id === q.get('site')) || SITES[0]; $('#site').value = s0.id; fillLines(s0)
if (q.get('line')) $('#line').value = q.get('line')
$('#site').onchange = () => { const s = SITES.find(x => x.id === $('#site').value); fillLines(s); mount(s.id, s.data.lines[0].id) }
$('#line').onchange = () => mount($('#site').value, $('#line').value)
mount(s0.id, $('#line').value || s0.data.lines[0].id)
