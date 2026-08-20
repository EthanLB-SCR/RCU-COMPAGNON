// Synchronisation avec Supabase (base en Europe) : connexion par e-mail, chantiers importés, statuts/fiches de soudure, état des lignes, photos.
import { createClient } from '@supabase/supabase-js'
export const SUPABASE_URL = 'https://pghftlepduvfazbiavhq.supabase.co'
export const SUPABASE_KEY = 'sb_publishable_uK_JK38eKQ9s-s8LbXRzCA_hwg2PdxT'
let sb = null; try { sb = createClient(SUPABASE_URL, SUPABASE_KEY, { auth: { persistSession: true, autoRefreshToken: true, detectSessionInUrl: true } }) } catch (e) { console.warn('supabase indisponible', e) }
// getSession() peut rester bloqué (verrou d'authentification tenu par un autre onglet — traceur + appli ouverts — ou par le callback onAuthStateChange en cours, réseau coupé, projet en pause) : on n'attend jamais plus de 4 s.
// Blocage ≠ déconnecté : dans ce cas on retombe sur la DERNIÈRE session connue (poussée par les événements d'auth) au lieu de répondre « pas de session »
// — c'est ce faux « déconnecté » transitoire qui faisait croire à l'appli que la liste serveur était vide (bug « je n'ai plus mes chantiers », 20/08).
const withTimeout = (p, ms, fallback) => Promise.race([p, new Promise(r => setTimeout(() => r(fallback), ms))])
let lastSession = null; try { if (sb) sb.auth.onAuthStateChange((_e, s) => { lastSession = s || null }) } catch (e) { }
const LOCKED = { locked: true }
const freshLast = () => (lastSession && (!lastSession.expires_at || lastSession.expires_at * 1000 > Date.now() - 60000)) ? lastSession : null
const session = async () => { if (!sb) return null; try { const r = await withTimeout(sb.auth.getSession(), 4000, LOCKED); if (r === LOCKED) return freshLast(); return r && r.data ? r.data.session : null } catch (e) { console.warn('session', e); return freshLast() } }
const ok = async () => !!(await session())
export const sync = {
  available: () => !!sb,
  async user() { const s = await session(); return s ? s.user : null },
  // le callback est sorti du dispatch (setTimeout 0) : appeler Supabase DANS onAuthStateChange bloque tout derrière le verrou d'auth (deadlock connu de supabase-js) — c'est ce qui rendait la liste des chantiers aléatoire
  onAuth(cb) { if (sb) sb.auth.onAuthStateChange((_e, s) => { setTimeout(() => cb(s ? s.user : null), 0) }) },
  async login(email) { if (!sb) throw new Error('hors ligne'); const { error } = await sb.auth.signInWithOtp({ email, options: { emailRedirectTo: location.href.split('#')[0] } }); if (error) throw error; return true },
  async logout() { if (sb) await sb.auth.signOut() },
  async saveSite(net) { if (!(await ok())) return false; const { drawing, ...rest } = net; const { error } = await sb.from('sites').upsert({ id: net.id, name: net.name, supplier: net.supplier || null, serie: net.serie || null, data: { ...rest, drawing: drawing || null }, updated_at: new Date().toISOString() }); if (error) { console.warn(error); return false } return true },
  async ensureSite(net) { if (!(await ok())) return false; const { error } = await sb.from('sites').upsert({ id: net.id, name: net.name, supplier: net.supplier || null, serie: net.serie || null, data: { builtin: true, name: net.name } }, { onConflict: 'id', ignoreDuplicates: true }); if (error) { console.warn(error); return false } return true },
  async loadSite(id) { if (!(await ok())) return null; const { data, error } = await sb.from('sites').select('id,name,supplier,serie,data,updated_at').eq('id', id).maybeSingle(); if (error || !data) { if (error) console.warn(error); return null } return { ...data.data, id: data.id, name: data.name, updated_at: data.updated_at } },
  // suppression d'un chantier : soudures, états de lignes, événements puis la fiche (les photos du stockage restent, sans effet) — refusé par la base si les droits (RLS) ne le permettent pas
  // suppression = pierre tombale sur le serveur (la ligne « sites » reste, avec data.deleted) : tous les appareils la voient et masquent le chantier ; on ne renvoie plus jamais une copie locale d'un chantier supprimé. Les soudures / états / événements sont effacés.
  async deleteSite(id, name) { if (!(await ok())) return { ok: false, why: 'hors ligne' }; for (const t of ['welds', 'line_state', 'events']) { const { error } = await sb.from(t).delete().eq('site_id', id); if (error) { console.warn(t, error); return { ok: false, why: t + ' : ' + error.message } } } const { error } = await sb.from('sites').upsert({ id, name: name || id, data: { deleted: true, deletedAt: new Date().toISOString(), name: name || id }, updated_at: new Date().toISOString() }); if (error) { console.warn(error); return { ok: false, why: 'sites : ' + error.message } } return { ok: true } },
  // null = liste inconnue (hors ligne, erreur, délai) — jamais [] dans ce cas : l'appli ne doit pas croire que tout a été supprimé
  async loadSites() { if (!(await ok())) return null; try { const { data, error } = await withTimeout(sb.from('sites').select('id,name,supplier,serie,data,updated_at'), 20000, { error: new Error('délai dépassé') }); if (error) { console.warn(error); return null } return (data || []).map(r => ({ ...r.data, id: r.id, name: r.name, updated_at: r.updated_at })) } catch (e) { console.warn(e); return null } },
  async saveWeld(siteId, j) { if (!(await ok())) return false; const { photos, ...d } = j; const { error } = await sb.from('welds').upsert({ site_id: siteId, weld_id: j.weldId, line_id: j.line, cond: j.cond, status: j.status, data: { events: (j.events || []).map(e => ({ ...e, photos: (e.photos || []).map(p => typeof p === 'string' ? p : (p.url || null)).filter(Boolean) })), conn: j.conn, wire: j.wire, tee: j.tee || null, cont: j.cont, iso: j.iso, isoVal: j.isoVal, note: j.note, steps: j.steps || null, photos: (photos || []).map(p => typeof p === 'string' ? p : (p.url || null)).filter(Boolean) }, updated_at: new Date().toISOString() }); if (error) { console.warn(error); return false } return true },
  // liste légère (id, nom, date) pour détecter les plans plus récents sans tout télécharger
  // méta LÉGÈRE de tous les chantiers (page d'accueil + réconciliation) : jamais le plan complet — quelques champs JSON ciblés
  // sélection complète (avec emprise réseau + nb de soudures pour la carte d'accueil), et REPLI automatique sur la sélection simple si le serveur la refuse : la liste des chantiers ne doit jamais mourir pour un champ bonus
  async listSiteMeta() {
    if (!(await ok())) return null
    const SELS = ['id,name,supplier,updated_at,geo:data->geo,origin:data->origin,bgo:data->traceur->bgOrigin,sat:data->traceur->>savedAt,w:data->w,h:data->h,bbox:data->bbox,nbox:data->nbox,nw:data->report->welds,deleted:data->deleted,deletedAt:data->>deletedAt,builtin:data->builtin',
      'id,name,supplier,updated_at,geo:data->geo,origin:data->origin,bgo:data->traceur->bgOrigin,sat:data->traceur->>savedAt,w:data->w,h:data->h,deleted:data->deleted,deletedAt:data->>deletedAt,builtin:data->builtin']
    for (const sel of SELS) { try { const { data, error } = await withTimeout(sb.from('sites').select(sel), 15000, { error: new Error('délai') }); if (error) { console.warn('listSiteMeta' + (sel === SELS[0] ? '' : ' (repli)'), error); continue } return data || [] } catch (e) { console.warn(e) } }
    return null
  },
  // temps réel : pousse les changements de soudures / de plan du chantier ouvert (nécessite la publication supabase_realtime — tools/supabase_setup.sql) ; renvoie une fonction d'arrêt, ou null
  subscribeSite(siteId, { onWeld, onSite } = {}) { if (!sb || !siteId) return null; try {
      const ch = sb.channel('rt:' + siteId)
        .on('postgres_changes', { event: '*', schema: 'public', table: 'welds', filter: 'site_id=eq.' + siteId }, p => { try { onWeld && onWeld(p.new && p.new.weld_id ? p.new : p.old, p.eventType) } catch (e) { console.warn(e) } })
        .on('postgres_changes', { event: '*', schema: 'public', table: 'sites', filter: 'id=eq.' + siteId }, p => { try { onSite && onSite(p.new, p.eventType) } catch (e) { console.warn(e) } })
        .subscribe();
      return () => { try { sb.removeChannel(ch) } catch (e) { } };
    } catch (e) { console.warn('realtime', e); return null } },
  // profils (comptes réels) : absents tant que tools/supabase_setup.sql n'a pas été exécuté → l'appli reste en mode démo
  async profile() { const s = await session(); if (!s) return null; try { const { data, error } = await sb.from('profiles').select('*').eq('id', s.user.id).maybeSingle(); if (error) { return null } return data || null } catch (e) { return null } },
  async listProfiles() { if (!(await ok())) return []; try { const { data, error } = await sb.from('profiles').select('*').order('created_at'); if (error) { console.warn(error); return [] } return data || [] } catch (e) { return [] } },
  async adminSetUser(id, role, active) { try { const { error } = await sb.rpc('admin_set_user', { target: id, new_role: role, new_active: active }); if (error) { console.warn(error); return error.message } return null } catch (e) { return String(e) } },
  async setMyName(n) { try { await sb.rpc('set_my_name', { new_name: n }) } catch (e) { console.warn(e) } },
  // historique de versions (tools/supabase_versions.sql) : liste datée, contenu d'une version
  async listVersions(siteId) { if (!(await ok())) return null; try { const { data, error } = await sb.from('site_versions').select('id,name,created_at,saved_by').eq('site_id', siteId).order('created_at', { ascending: false }); if (error) { console.warn(error); return null } return data || [] } catch (e) { return null } },
  async loadVersion(id) { if (!(await ok())) return null; try { const { data, error } = await sb.from('site_versions').select('data,name,site_id').eq('id', id).maybeSingle(); if (error || !data) { return null } return data } catch (e) { return null } },
  // avancement par chantier (RPC tools/supabase_home.sql) : null si la fonction n'est pas installée
  async siteStats() { if (!(await ok())) return null; try { const { data, error } = await sb.rpc('site_stats'); if (error) { return null } const m = {}; (data || []).forEach(r => { m[r.site_id] = { total: r.total, soud: r.soud !== undefined ? r.soud : r.manch, manch: r.manch, last: r.last } }); return m } catch (e) { return null } }, // soud absent = vieux RPC (v1) : on retombe sur manch en attendant que supabase_home.sql v2 soit exécuté
  async loadWelds(siteId) { if (!(await ok())) return []; const { data, error } = await sb.from('welds').select('weld_id,line_id,cond,status,data').eq('site_id', siteId); if (error) { console.warn(error); return [] } return data || [] },
  async saveLineState(siteId, lineId, cond, st) { if (!(await ok())) return false; const { error } = await sb.from('line_state').upsert({ site_id: siteId, line_id: lineId, cond, state: st, updated_at: new Date().toISOString() }); if (error) { console.warn(error); return false } return true },
  async loadLineStates(siteId) { if (!(await ok())) return {}; const { data, error } = await sb.from('line_state').select('line_id,cond,state').eq('site_id', siteId); if (error) { console.warn(error); return {} } const out = {}; (data || []).forEach(r => { out[r.line_id + ':' + r.cond] = r.state }); return out },
  async logEvent(siteId, weldId, type, by, data) { if (!(await ok())) return; await sb.from('events').insert({ site_id: siteId, weld_id: weldId, type, by_user: by, data: data || {} }) },
  async uploadPhoto(siteId, weldId, dataUrl) { if (!(await ok())) return null; try { const blob = await (await fetch(dataUrl)).blob(); const path = `${siteId}/${weldId}/${Date.now()}.jpg`; const { error } = await sb.storage.from('photos').upload(path, blob, { contentType: blob.type || 'image/jpeg' }); if (error) { console.warn(error); return null } const { data } = await sb.storage.from('photos').createSignedUrl(path, 60 * 60 * 24 * 365); return data ? data.signedUrl : path } catch (e) { console.warn(e); return null } },
}
