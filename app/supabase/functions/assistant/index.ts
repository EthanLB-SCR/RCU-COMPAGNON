// TRACÉ · SCR — Edge Function « assistant » (11/11/2026) : la bulle 💬 de l'appli (Discuter, « En faire un bug / une idée »).
//
// Ce qu'elle fait : reçoit la conversation de la personne connectée (20 derniers messages au plus) et l'écran où elle est, appelle le modèle Claude
// avec la clé ANTHROPIC_API_KEY rangée dans les secrets Supabase, et renvoie la réponse. Mode « resume » : résume la conversation en un bug ou une idée
// (titre + texte) que la personne relit avant d'envoyer.
//
// Sécurité :
//  - appel avec le jeton de la personne connectée (Verify JWT coché) ; jeton revérifié auprès du serveur d'authentification, puis is_active() avec CE jeton :
//    seul un compte actif passe ;
//  - la clé API n'est jamais dans l'appli ni dans le dépôt : secret ANTHROPIC_API_KEY (Supabase → Edge Functions → Secrets) ;
//  - rien n'est stocké ici ; taille bornée (20 messages, 4 000 caractères chacun, réponse ≤ 700 jetons).
// Réglages facultatifs (secrets) : ANTHROPIC_MODEL (défaut « claude-haiku-5-5 », rapide et économique), ANTHROPIC_VERSION (défaut « 2026-10-21 »).
//
// Appel : supabase.functions.invoke('assistant', {body:{mode:'chat'|'resume', type:'bug'|'idee', messages:[{role,content}], contexte}})
//   → {ok:true, texte} (chat) · {ok:true, titre, texte} (resume) · {error} sinon.
// Déploiement : voir README.md à côté (Dashboard → Edge Functions → Deploy a new function → Via Editor, nom « assistant », Verify JWT coché, secret ANTHROPIC_API_KEY).
import { createClient } from 'npm:@supabase/supabase-js@2';

const CORS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
};
const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), { status, headers: { ...CORS, 'Content-Type': 'application/json' } });
// message relayé à l'appli : sans « not found » / « 404 » (l'appli les lit comme « fonction pas déployée »)
const clean = (m: string) => String(m || '?').replace(/not\s*found/gi, 'introuvable').replace(/\b404\b/g, '').slice(0, 300);
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

const SYSTEME = `Tu es l'assistant de Tracé, l'application de SCR (Soudure Construction Réseaux) : soudure et manchonnage de réseaux de chaleur en acier pré-isolé.
L'appli sert aux équipes de chantier (soudeurs, manchonneurs, chefs, conducteurs) et au bureau : plan des réseaux et soudures (étapes 1 à 4 : soudure, fils, manchon, moussage),
pointage des heures, planning, flotte de véhicules, magasin, dossier du chantier, outils de tuyauterie (Compagnon → 🧰 Outils), ressources humaines.
Règles :
- Réponds en français, en tutoyant, court et concret (quelques phrases ou une petite liste d'étapes). Les gens lisent sur un téléphone, parfois avec des gants.
- Tu n'as PAS accès aux données de la personne (ses chantiers, ses heures…) : ne les invente jamais. Si tu ne sais pas où se trouve une fonction, dis-le simplement.
- Si la personne décrit un problème de l'appli, propose-lui de le signaler avec le bouton « 🐞 En faire un bug » (sous la conversation) ; une suggestion : « 💡 En faire une idée ».
- Pas de conseil juridique, médical ou financier engageant ; pour la sécurité sur chantier, rappelle les consignes du chef et du PPSPS.`;
const RESUME = (type: string) => `Tu résumes une conversation avec l'assistant de l'appli Tracé en ${type === 'idee' ? 'UNE IDÉE d\'amélioration' : 'UN SIGNALEMENT DE BUG'} pour le développeur.
Réponds UNIQUEMENT par un objet JSON, sans texte autour : {"titre": "...", "texte": "..."}
- titre : 80 caractères au plus, concret.
- texte : 800 caractères au plus — ${type === 'idee' ? 'ce qui est proposé, pour qui, ce que ça changerait sur le terrain' : 'ce que la personne faisait, ce qui s\'est passé, ce qu\'elle attendait, sur quel écran'}. Garde les mots de la personne quand ils sont précis.`;

type Msg = { role: 'user' | 'assistant'; content: string };
function normalise(raw: unknown): Msg[] {
  const L = (Array.isArray(raw) ? raw : []).filter((m) => m && (m.role === 'user' || m.role === 'assistant') && typeof m.content === 'string')
    .map((m) => ({ role: m.role, content: String(m.content).trim().slice(0, 4000) })).filter((m) => m.content).slice(-20) as Msg[];
  const out: Msg[] = [];
  for (const m of L) { const last = out[out.length - 1]; if (last && last.role === m.role) last.content += '\n' + m.content; else out.push({ ...m }); }
  while (out.length && out[0].role !== 'user') out.shift();
  return out;
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
  const srv = createClient(url, service, base);
  const asCaller = createClient(url, anon, { ...base, global: { headers: { Authorization: 'Bearer ' + jwt } } });
  const { data: who, error: eWho } = await srv.auth.getUser(jwt);
  if (eWho || !who?.user) return json({ error: 'session expirée : reconnecte-toi' }, 401);
  const { data: actif, error: eAct } = await asCaller.rpc('is_active');
  if (eAct || actif !== true) return json({ error: 'compte inactif' }, 403);

  const key = Deno.env.get('ANTHROPIC_API_KEY') || '';
  if (!key) return json({ error: 'clé ANTHROPIC_API_KEY absente : Supabase → Edge Functions → Secrets' }, 500);
  // deno-lint-ignore no-explicit-any
  const body: any = await req.json().catch(() => ({}));
  const mode = body?.mode === 'resume' ? 'resume' : 'chat';
  const type = body?.type === 'idee' ? 'idee' : 'bug';
  const messages = normalise(body?.messages);
  if (!messages.length) return json({ error: 'message vide' }, 400);
  const ctx = String(body?.contexte || '').replace(/\s+/g, ' ').slice(0, 400);
  let system = mode === 'resume' ? RESUME(type) : SYSTEME + (ctx ? `\n\nÉcran où se trouve la personne : ${ctx}.` : '');
  let msgs = messages;
  if (mode === 'resume') {
    const texte = messages.map((m) => (m.role === 'user' ? 'Personne : ' : 'Assistant : ') + m.content).join('\n').slice(-12000);
    msgs = [{ role: 'user', content: 'Conversation à résumer :\n' + texte }];
    system = RESUME(type);
  }
  const r = await fetch('https://api.anthropic.com/v1/messages', {
    method: 'POST',
    headers: { 'x-api-key': key, 'anthropic-version': Deno.env.get('ANTHROPIC_VERSION') || '2026-10-21', 'content-type': 'application/json' },
    body: JSON.stringify({ model: Deno.env.get('ANTHROPIC_MODEL') || 'claude-haiku-5-5', max_tokens: mode === 'resume' ? 500 : 700, system, messages: msgs }),
  });
  // deno-lint-ignore no-explicit-any
  const j: any = await r.json().catch(() => null);
  if (!r.ok) return json({ error: 'le modèle a refusé : ' + clean(j?.error?.message || String(r.status)) }, 502);
  const texte = (Array.isArray(j?.content) ? j.content : []).filter((b: { type: string }) => b?.type === 'text').map((b: { text: string }) => b.text).join('\n').trim();
  if (!texte) return json({ error: 'réponse vide du modèle' }, 502);
  if (mode === 'resume') {
    try {
      const m = /\{[\s\S]*\}/.exec(texte);
      const o = JSON.parse(m ? m[0] : texte);
      return json({ ok: true, titre: String(o.titre || '').slice(0, 120), texte: String(o.texte || '').slice(0, 3000) });
    } catch {
      return json({ ok: true, titre: '', texte: texte.slice(0, 3000) });
    }
  }
  return json({ ok: true, texte: texte.slice(0, 6000) });
}
