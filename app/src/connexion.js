// connexion.js — 01/11 soir (Ethan : « demain je le mets en test sur deux chantiers : il faut que chacun puisse accéder à son compte, créer son mot de passe… le plus
// simple ») : LIEN DE PREMIÈRE CONNEXION. L'e-mail et le code de 1re connexion (le mot de passe provisoire posé par la fonction serveur « acces-code ») voyagent
// APRÈS LE # du lien : cette partie n'est jamais envoyée au serveur web ; l'appli la lit au démarrage et l'efface aussitôt de la barre d'adresse.
// Sur le téléphone du gars, Tracé s'ouvre sur « Créer mon mot de passe », e-mail et code remplis : il ne tape que son mot de passe. Le code ne sert qu'une fois
// (dès qu'il a choisi son mot de passe, l'ancien code ne marche plus) ; un nouveau code annule le précédent.
const b64u = s => btoa(unescape(encodeURIComponent(s))).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
const unb64u = s => { let b = String(s).replace(/-/g, '+').replace(/_/g, '/'); while (b.length % 4) b += '='; return decodeURIComponent(escape(atob(b))); };
export function lienAcces(base, { email, code, prenom }) {
  return String(base || '').split('#')[0] + '#acces=' + b64u(JSON.stringify({ e: String(email || '').trim(), c: String(code || '').replace(/\s/g, ''), n: String(prenom || '').slice(0, 40) }));
}
export function lireLienAcces(hash) {
  const m = /^#acces=([A-Za-z0-9_-]{8,800})$/.exec(String(hash || '')); if (!m) return null;
  try {
    const o = JSON.parse(unb64u(m[1]));
    if (!o || typeof o.e !== 'string' || !/^[^\s@,;]+@[^\s@,;]+\.[^\s@,;]+$/.test(o.e.trim()) || typeof o.c !== 'string') return null;
    const code = o.c.replace(/\s/g, '').toLowerCase(); if (!/^[a-z0-9]{6,32}$/.test(code)) return null;
    return { email: o.e.trim().toLowerCase(), code, prenom: String(o.n || '').slice(0, 40) };
  } catch (e) { return null; }
}
