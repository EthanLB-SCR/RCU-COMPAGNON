// TRACÉ · SCR — Edge Function « acces-code » (13/10/2026) : CODE DE CONNEXION donné par l'administrateur, sans e-mail.
//
// Pourquoi : sans serveur d'envoi (SMTP) personnalisé, Supabase n'envoie ses e-mails de connexion qu'aux membres de l'organisation
// Supabase (2 par heure) : les salariés ne reçoivent ni code ni lien. Ici l'administrateur crée (ou refait) un CODE PROVISOIRE pour une
// personne dont l'accès est créé ; la personne le tape sur l'écran d'accueil (« Première connexion ») et choisit aussitôt son propre
// mot de passe (repère user_metadata.must_change = true, remis à false par l'appli quand le mot de passe est posé).
//
// Sécurité :
//  - appel avec le jeton de la personne connectée (Verify JWT coché) ; jeton revérifié auprès du serveur d'authentification, puis
//    is_admin() avec CE jeton (même règle que la base) : seul un administrateur actif passe ;
//  - la personne visée doit avoir un accès (invitation) ou un compte actif ; jamais son propre compte, jamais un compte administrateur
//    (un administrateur change son mot de passe lui-même) ;
//  - le code n'est ni stocké ni journalisé ici ; un nouveau code remplace l'ancien (et le mot de passe d'avant) ;
//  - la clé de service (SUPABASE_SERVICE_ROLE_KEY, ou la clé secrète « default » des nouvelles clés) est fournie par Supabase à
//    l'exécution : elle n'est jamais dans l'appli ni dans le dépôt. Aucun secret à configurer.
//
// Appel : supabase.functions.invoke('acces-code', {body:{email, code}}) → {ok:true, created:true|false}
//   created = compte créé à l'instant (invitation pas encore utilisée) ; false = compte existant, son mot de passe remplacé par le code.
// Déploiement : voir README.md à côté (Dashboard → Edge Functions → Deploy a new function → Via Editor, nom « acces-code », Verify JWT coché).
import { createClient } from 'npm:@supabase/supabase-js@2';

const CORS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
};
const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), { status, headers: { ...CORS, 'Content-Type': 'application/json' } });

const ADMIN_SEED = ['elebihan@scr-soudure.fr']; // administrateur d'office (même liste que la base et l'appli)
const CODE_RE = /^[a-z0-9]{8,32}$/; // codes générés par l'appli : 8 caractères, minuscules et chiffres (sans i, l, o, 0, 1)
const EMAIL_RE = /^[^\s@,;]+@[^\s@,;]+\.[^\s@,;]+$/;
// message du serveur relayé à l'appli : sans « not found » / « 404 » (l'appli les lit comme « fonction pas déployée »)
const clean = (m: string) => String(m || '?').replace(/not\s*found/gi, 'introuvable').replace(/\b404\b/g, '').slice(0, 300);

// clé « ancienne » (JWT) si présente, sinon la clé « default » du dictionnaire JSON des nouvelles clés
function keyFrom(legacy: string, dict: string): string {
  const v = Deno.env.get(legacy);
  if (v) return v;
  try {
    const o = JSON.parse(Deno.env.get(dict) || '{}') as Record<string, string>;
    return o.default || Object.values(o)[0] || '';
  } catch {
    return '';
  }
}

// compte d'authentification par e-mail (compte ancien sans fiche « profiles ») : parcours de la liste, 200 par page
// deno-lint-ignore no-explicit-any
async function findUid(srv: any, email: string): Promise<string> {
  for (let page = 1; page <= 50; page++) {
    const { data, error } = await srv.auth.admin.listUsers({ page, perPage: 200 });
    if (error) return '';
    const users = (data?.users || []) as { id: string; email?: string }[];
    const u = users.find((x) => String(x.email || '').toLowerCase() === email);
    if (u) return u.id;
    if (users.length < 200) return '';
  }
  return '';
}

Deno.serve(async (req) => {
  try {
    return await handle(req);
  } catch (e) {
    return json({ error: 'erreur de la fonction : ' + clean(String((e as Error)?.message || e)) }, 500);
  }
});

async function handle(req: Request): Promise<Response> {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: CORS });
  if (req.method !== 'POST') return json({ error: 'POST attendu' }, 405);
  const auth = req.headers.get('Authorization') || '';
  const jwt = /^Bearer\s+(\S+)$/i.exec(auth.trim())?.[1] || '';
  if (!jwt) return json({ error: 'non connecté' }, 401);
  const url = Deno.env.get('SUPABASE_URL') || '';
  const anon = keyFrom('SUPABASE_ANON_KEY', 'SUPABASE_PUBLISHABLE_KEYS');
  const service = keyFrom('SUPABASE_SERVICE_ROLE_KEY', 'SUPABASE_SECRET_KEYS');
  if (!url || !anon || !service) return json({ error: 'configuration serveur incomplète (clés Supabase absentes)' }, 500);
  const base = { auth: { persistSession: false, autoRefreshToken: false, detectSessionInUrl: false } };
  const asCaller = createClient(url, anon, { ...base, global: { headers: { Authorization: 'Bearer ' + jwt } } });
  const srv = createClient(url, service, base);

  // 1) qui appelle : session valable (serveur d'authentification) ET administrateur actif (is_admin() avec son jeton)
  const { data: who, error: eWho } = await srv.auth.getUser(jwt);
  if (eWho || !who?.user) return json({ error: 'session expirée : reconnecte-toi' }, 401);
  const me = String(who.user.email || '').toLowerCase();
  const { data: isAdm, error: eAdm } = await asCaller.rpc('is_admin');
  if (eAdm) return json({ error: 'contrôle administrateur impossible : ' + clean(eAdm.message) }, 500);
  if (isAdm !== true) return json({ error: "réservé à l'administrateur" }, 403);

  // 2) la demande
  let body: Record<string, unknown> = {};
  try { body = await req.json(); } catch { body = {}; }
  const email = String(body.email || '').trim().toLowerCase();
  const code = String(body.code || '');
  if (!EMAIL_RE.test(email) || email.length > 254) return json({ error: 'adresse e-mail invalide' }, 400);
  if (!CODE_RE.test(code)) return json({ error: 'code invalide (8 à 32 lettres minuscules ou chiffres)' }, 400);
  if (email === me) return json({ error: "c'est ton propre compte : change ton mot de passe avec 🔑 dans ton compte" }, 400);
  if (ADMIN_SEED.includes(email)) return json({ error: 'compte administrateur : son mot de passe se change par la personne elle-même' }, 403);

  // 3) la personne : accès créé (invitation) ou compte existant, actif, non administrateur
  const { data: inv, error: eInv } = await srv.from('invites').select('email').eq('email', email).maybeSingle();
  if (eInv) return json({ error: 'lecture des invitations impossible : ' + clean(eInv.message) }, 500);
  const { data: profs, error: ePr } = await srv.from('profiles').select('id,email,admin,poste,active').eq('email', email).limit(1);
  if (ePr) return json({ error: 'lecture des comptes impossible : ' + clean(ePr.message) }, 500);
  const prof = ((profs || []) as { id: string; admin?: boolean; poste?: string; active?: boolean }[])[0];
  if (!inv && !prof) return json({ error: "aucun accès créé pour cette adresse : « Créer un accès » d'abord" }, 400);
  if (prof && (prof.admin || prof.poste === 'admin')) return json({ error: "compte administrateur : son mot de passe se change par la personne elle-même (retire-lui ★ d'abord si besoin)" }, 403);
  if (prof && prof.active === false) return json({ error: "compte inactif : coche « actif » d'abord" }, 400);

  const meta = { must_change: true, code_by: me, code_at: new Date().toISOString() };
  const setCode = async (uid: string) => {
    try {
      const { error } = await srv.auth.admin.updateUserById(uid, { password: code, email_confirm: true, user_metadata: meta });
      return error ? String(error.message || '?') : '';
    } catch (e) { return String((e as Error)?.message || e); } // ex. identifiant qui n'est pas un UUID : supabase-js lève une exception
  };
  // 4) compte existant → le code remplace son mot de passe
  if (prof?.id) {
    const e = await setCode(prof.id);
    if (!e) return json({ ok: true, created: false });
    if (!/not.?found|no user/i.test(e)) return json({ error: 'code refusé par le serveur : ' + clean(e) }, 400);
    // fiche sans compte d'authentification (compte supprimé dans Supabase) : on le recrée ci-dessous
  }
  // 5) pas encore de compte → créé avec le code pour mot de passe, adresse confirmée d'office (l'administrateur se porte garant ;
  //    le déclencheur de la base crée la fiche d'après l'invitation)
  const { data: cr, error: eCr } = await srv.auth.admin.createUser({ email, password: code, email_confirm: true, user_metadata: meta });
  if (!eCr && cr?.user) return json({ ok: true, created: true });
  const m = String(eCr?.message || '?');
  if (!/already|exists|registered/i.test(m)) return json({ error: 'création du compte refusée : ' + clean(m) }, 400);
  const uid = await findUid(srv, email); // compte d'authentification sans fiche (ancien compte)
  if (!uid) return json({ error: "compte existant, mais absent de la liste de l'authentification" }, 500);
  const e2 = await setCode(uid);
  if (e2) return json({ error: 'code refusé par le serveur : ' + clean(e2) }, 400);
  return json({ ok: true, created: false });
}
