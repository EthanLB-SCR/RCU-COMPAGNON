// TRACÉ · SCR — Edge Function « outlook-sync » (validée par Ethan le 12/10)
// Synchronise le calendrier Outlook PUBLIÉ d'un encadrant (lien ICS enregistré dans people.<e-mail>.data.outlook.ics, partie « outlook »
// écrite par la personne elle-même — sql/retours_12-10b.sql) vers ses lignes « agenda » du registre (Ma semaine).
//
// Pourquoi côté serveur : le navigateur ne peut pas lire outlook.office365.com (CORS) ; ici on lit le flux, on parse les VEVENT
// et on écrit avec LE JETON DE L'APPELANT (registre_set vérifie que l'identifiant commence par son e-mail) : la fonction
// n'a aucun droit de plus que la personne connectée. Aucun secret à configurer : SUPABASE_URL / SUPABASE_ANON_KEY sont fournis
// automatiquement par Supabase à l'exécution.
//
// Appel : supabase.functions.invoke('outlook-sync', {body:{}})  → {n, upd, del, total, at}
//   n = rendez-vous créés · upd = mis à jour · del = retirés (disparus du flux / annulés) · total = rendez-vous lus dans la fenêtre
// Fenêtre : du lundi de la semaine passée à aujourd'hui + 70 jours (même règle que l'import fichier côté appli).
// Identifiant d'une ligne : <e-mail>|ol:<sha1 court de l'UID Outlook[+date de l'occurrence]> → déterministe = pas de doublon d'une synchro à l'autre.
// Déploiement : voir README.md à côté (Dashboard → Edge Functions → Deploy a new function → via Editor, nom « outlook-sync », Verify JWT coché).
import { createClient } from 'npm:@supabase/supabase-js@2';

const CORS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
};
const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), { status, headers: { ...CORS, 'Content-Type': 'application/json' } });

const TZ = 'Europe/Paris';
const pad = (n: number) => String(n).padStart(2, '0');
type Dh = { d: string; h: string | null }; // d = AAAA-MM-JJ (jour civil en France), h = HH:MM ou null (journée entière)

// date/heure UTC → jour + heure en France (Outlook publie souvent en UTC avec le suffixe Z)
function paris(dt: Date): Dh {
  const p = new Intl.DateTimeFormat('fr-FR', { timeZone: TZ, year: 'numeric', month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit', hour12: false }).formatToParts(dt);
  const g = (t: string) => (p.find((x) => x.type === t) || { value: '' }).value;
  const hh = g('hour') === '24' ? '00' : g('hour');
  return { d: `${g('year')}-${g('month')}-${g('day')}`, h: `${hh}:${g('minute')}` };
}
// valeur ICS → {d,h}. Avec TZID (heure locale « Romance Standard Time » = France) ou sans suffixe : heure murale telle quelle.
function parseDt(v: string): Dh | null {
  const m = /^(\d{4})(\d{2})(\d{2})(?:T(\d{2})(\d{2})(\d{2})?(Z)?)?$/.exec(String(v || '').trim());
  if (!m) return null;
  if (m[7]) return paris(new Date(Date.UTC(+m[1], +m[2] - 1, +m[3], +m[4], +m[5], +(m[6] || 0))));
  return { d: `${m[1]}-${m[2]}-${m[3]}`, h: m[4] !== undefined ? `${m[4]}:${m[5]}` : null };
}
const unesc = (v: string) => String(v || '').replace(/\\n/gi, ' ').replace(/\\,/g, ',').replace(/\\;/g, ';').replace(/\\\\/g, '\\').trim();
const addDays = (d: string, n: number) => { const x = new Date(d + 'T00:00:00Z'); x.setUTCDate(x.getUTCDate() + n); return x.toISOString().slice(0, 10); };
const dow = (d: string) => new Date(d + 'T00:00:00Z').getUTCDay(); // 0 = dimanche
const BYDAY: Record<string, number> = { SU: 0, MO: 1, TU: 2, WE: 3, TH: 4, FR: 5, SA: 6 };
const norm = (x: string) => String(x || '').normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase();

type Ev = { uid: string; title: string; loc: string; note: string; start: Dh | null; end: Dh | null; status: string; rrule: string; exdates: string[]; recId: string | null; transp: string };

// ── lecture du flux : VEVENT → objets (lignes dépliées, paramètres ignorés sauf pour les dates)
function parseIcs(txt: string): Ev[] {
  const L = String(txt || '').replace(/\r\n?/g, '\n').replace(/\n[ \t]/g, '').split('\n');
  const out: Ev[] = []; let cur: Ev | null = null;
  for (const line of L) {
    if (line === 'BEGIN:VEVENT') { cur = { uid: '', title: '', loc: '', note: '', start: null, end: null, status: '', rrule: '', exdates: [], recId: null, transp: '' }; continue; }
    if (line === 'END:VEVENT') { if (cur && cur.start) out.push(cur); cur = null; continue; }
    if (!cur) continue;
    const i = line.indexOf(':'); if (i < 0) continue;
    const key = line.slice(0, i).split(';')[0].toUpperCase(); const val = line.slice(i + 1);
    if (key === 'UID') cur.uid = val.trim();
    else if (key === 'SUMMARY') cur.title = unesc(val).slice(0, 120);
    else if (key === 'LOCATION') cur.loc = unesc(val).slice(0, 120);
    else if (key === 'DESCRIPTION') cur.note = unesc(val).slice(0, 200);
    else if (key === 'DTSTART') cur.start = parseDt(val);
    else if (key === 'DTEND') cur.end = parseDt(val);
    else if (key === 'STATUS') cur.status = val.trim().toUpperCase();
    else if (key === 'RRULE') cur.rrule = val.trim().toUpperCase();
    else if (key === 'EXDATE') val.split(',').forEach((x) => { const p = parseDt(x); if (p) cur!.exdates.push(p.d); });
    else if (key === 'RECURRENCE-ID') { const p = parseDt(val); cur.recId = p ? p.d : null; }
    else if (key === 'TRANSP') cur.transp = val.trim().toUpperCase();
  }
  return out;
}

// ── occurrences d'un rendez-vous dans la fenêtre [from, to] : simple (1 jour) ou récurrent (RRULE DAILY / WEEKLY ; MONTHLY / YEARLY → occurrence d'origine seulement)
function occurrences(e: Ev, from: string, to: string): string[] {
  const d0 = e.start!.d;
  if (!e.rrule) return d0 >= from && d0 <= to ? [d0] : [];
  const R: Record<string, string> = {}; e.rrule.split(';').forEach((kv) => { const [k, v] = kv.split('='); if (k) R[k] = v || ''; });
  const freq = R.FREQ || ''; const interval = Math.max(1, +(R.INTERVAL || 1) || 1);
  const until = R.UNTIL ? (parseDt(R.UNTIL) || { d: '9999-12-31' }).d : '9999-12-31';
  const count = R.COUNT ? +R.COUNT : Infinity;
  const out: string[] = []; const ex = new Set(e.exdates);
  const push = (d: string) => { if (d >= from && d <= to && !ex.has(d)) out.push(d); };
  if (freq === 'DAILY') {
    let d = d0, k = 0; while (d <= to && d <= until && k < count) { push(d); d = addDays(d, interval); k++; if (k > 400) break; }
  } else if (freq === 'WEEKLY') {
    const days = (R.BYDAY ? R.BYDAY.split(',').map((x) => BYDAY[x.replace(/^[-+]?\d+/, '')]).filter((x) => x !== undefined) : [dow(d0)]);
    let wk = addDays(d0, -((dow(d0) + 6) % 7)); let k = 0; const start = d0; // lundi de la semaine de départ
    while (wk <= to && wk <= until && k < count) {
      for (const wd of [1, 2, 3, 4, 5, 6, 0]) { const d = addDays(wk, (wd + 6) % 7); if (!days.includes(wd) || d < start || d > until) continue; if (k >= count) break; k++; push(d); }
      wk = addDays(wk, 7 * interval); if (out.length > 400) break;
    }
  } else push(d0); // MONTHLY / YEARLY : v1 = l'occurrence d'origine seulement
  return out;
}

async function sha1Short(s: string) {
  const b = await crypto.subtle.digest('SHA-1', new TextEncoder().encode(s));
  return Array.from(new Uint8Array(b)).map((x) => x.toString(16).padStart(2, '0')).join('').slice(0, 16);
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: CORS });
  if (req.method !== 'POST') return json({ error: 'POST attendu' }, 405);
  const auth = req.headers.get('Authorization') || '';
  if (!/^Bearer\s+\S+/i.test(auth)) return json({ error: 'non connecté' }, 401);
  const sb = createClient(Deno.env.get('SUPABASE_URL')!, Deno.env.get('SUPABASE_ANON_KEY')!, { global: { headers: { Authorization: auth } }, auth: { persistSession: false } });

  // 1) qui appelle ? (my_key = e-mail du profil en minuscules ; null = compte inconnu / inactif)
  const { data: key, error: eKey } = await sb.rpc('my_key');
  if (eKey || !key) return json({ error: 'compte inconnu' }, 401);
  const me = String(key).toLowerCase();

  // 2) son lien Outlook (fiche personne, partie « outlook » que lui seul — ou l'encadrement — peut écrire)
  const { data: pe, error: ePe } = await sb.from('people').select('data').eq('key', me).maybeSingle();
  if (ePe) return json({ error: 'fiche personne illisible : ' + ePe.message }, 500);
  const ol = (pe?.data?.outlook || {}) as { ics?: string };
  const url = String(ol.ics || '').replace(/^webcal:/i, 'https:').trim();
  if (!url) return json({ error: 'aucun lien Outlook enregistré' }, 400);
  let u: URL; try { u = new URL(url); } catch { return json({ error: 'lien invalide' }, 400); }
  if (u.protocol !== 'https:' || /^(localhost|127\.|10\.|192\.168\.|172\.(1[6-9]|2\d|3[01])\.|\[?::1)/i.test(u.hostname)) return json({ error: 'lien refusé (https public attendu)' }, 400);

  // 3) lecture du flux (15 s max, 5 Mo max)
  let txt = '';
  try {
    const ctl = new AbortController(); const t = setTimeout(() => ctl.abort(), 15000);
    const r = await fetch(u.toString(), { signal: ctl.signal, headers: { 'User-Agent': 'TRACE-SCR outlook-sync/1.0', Accept: 'text/calendar, */*' }, redirect: 'follow' });
    clearTimeout(t);
    if (!r.ok) return json({ error: `Outlook répond ${r.status} — le lien publié a peut-être été retiré (republier le calendrier et refaire « Relier »)` }, 502);
    txt = await r.text();
    if (txt.length > 5e6) return json({ error: 'calendrier trop volumineux (> 5 Mo)' }, 413);
  } catch (e) { return json({ error: 'lecture Outlook impossible : ' + String((e as Error)?.message || e) }, 502); }
  if (!/BEGIN:VCALENDAR/.test(txt)) return json({ error: 'le lien ne renvoie pas un calendrier (.ics attendu)' }, 400);

  // 4) fenêtre, chantiers (pour rattacher un rendez-vous à un chantier par son nom / sa ville), lignes déjà présentes
  const today = paris(new Date()).d;
  const from = addDays(today, -((dow(today) + 6) % 7) - 7); // lundi de la semaine passée
  const to = addDays(today, 70);
  const { data: sitesRows } = await sb.from('sites').select('id,name,ville:data->>ville');
  const sites = ((sitesRows || []) as { id: string; name: string; ville: string | null }[]).filter((s) => s && s.id && !/^demo_/.test(s.id)).map((s) => ({ id: s.id, nom: norm(s.name || s.id), ville: norm(s.ville || '') }));
  const { data: oldRows } = await sb.from('registre').select('id,data').eq('kind', 'agenda').like('id', me + '|%');
  const old = new Map<string, Record<string, unknown>>(); ((oldRows || []) as { id: string; data: Record<string, unknown> }[]).filter((r) => r.id.startsWith(me + '|')).forEach((r) => old.set(r.id, r.data || {}));

  // 5) rendez-vous → lignes agenda
  const all = parseIcs(txt).filter((e) => e.uid && !/@trace\.scr$/i.test(e.uid)); // (jamais nos propres exports TRACÉ, si la personne s'y est abonnée dans Outlook)
  const overrides = new Map<string, Ev>(); all.forEach((e) => { if (e.recId) overrides.set(e.uid + '@' + e.recId, e); });
  const want = new Map<string, Record<string, unknown>>(); let total = 0;
  for (const master of all) {
    if (master.recId) continue; // instance modifiée : traitée via overrides
    for (const day of occurrences(master, from, to)) {
      const e = overrides.get(master.uid + '@' + day) || master;
      if (e.status === 'CANCELLED') continue;
      const d0 = e.recId ? e.start!.d : day; if (d0 < from || d0 > to) continue;
      total++;
      const title = e.title || ''; const hay = norm(title + ' ' + e.loc);
      const site = sites.find((s) => (s.nom && hay.includes(s.nom)) || (s.ville && s.ville.length > 3 && hay.includes(s.ville))) || null;
      const type = /visite|chantier/i.test(title) || site ? 'visite' : /r[ée]union|point|comit|revue|réu/i.test(title) ? 'reunion' : /rdv|rendez|client|fournisseur|logstor|renalia|isoplus/i.test(title) ? 'rdv' : 'reunion';
      const id = 'ol:' + await sha1Short(master.uid + (master.rrule ? '@' + day : ''));
      const h0 = e.start!.h || ''; const sameDay = e.end && e.end.d === d0; const h1 = sameDay ? (e.end!.h || '') : '';
      want.set(me + '|' + id, { id, p: me, d: d0, h0, h1, type, site: site ? site.id : null, title, note: ((e.loc && !site ? e.loc + (e.note ? ' · ' : '') : '') + (e.note || '')).slice(0, 220), src: 'outlook', uid: master.uid + (master.rrule ? '@' + day : ''), free: e.transp === 'TRANSPARENT' || undefined });
    }
  }

  // 6) écriture via registre_set (droits de la personne) : créé / mis à jour si différent / retiré si disparu du flux dans la fenêtre
  let n = 0, upd = 0, del = 0; const errors: string[] = [];
  const same = (a: Record<string, unknown>, b: Record<string, unknown>) => ['d', 'h0', 'h1', 'type', 'site', 'title', 'note', 'free'].every((k) => (a[k] ?? null) === (b[k] ?? null)) && !a.deleted;
  for (const [rid, row] of want) {
    const prev = old.get(rid);
    if (prev && same(prev, row)) continue;
    const { error } = await sb.rpc('registre_set', { p_kind: 'agenda', p_id: rid, p_patch: { ...row, deleted: null, by: 'Outlook', at: new Date().toISOString() }, p_mode: 'merge' });
    if (error) { errors.push(error.message); if (errors.length > 3) break; continue; }
    if (prev) upd++; else n++;
  }
  if (total > 0 && errors.length === 0) { // un rendez-vous retiré d'Outlook disparaît de Ma semaine (fenêtre seulement, et seulement si le flux a bien été lu)
    for (const [rid, prev] of old) {
      const d = String(prev.d || '');
      if (prev.src !== 'outlook' || prev.deleted || want.has(rid) || d < from || d > to) continue;
      const { error } = await sb.rpc('registre_set', { p_kind: 'agenda', p_id: rid, p_patch: { deleted: true, at: new Date().toISOString() }, p_mode: 'merge' });
      if (!error) del++;
    }
  }
  if (errors.length && n + upd === 0) return json({ error: 'écriture refusée : ' + errors[0] }, 403);
  return json({ n, upd, del, total, at: new Date().toISOString(), warn: errors.length ? errors[0] : undefined });
});
