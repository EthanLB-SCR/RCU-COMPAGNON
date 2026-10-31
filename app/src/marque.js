// marque.js — 30/10/2026 : CHARTE « Tracé » (fiche projet claude/charte-trace.md, maquette « Logo retenu » : planches Main et Bandeau).
// Un logo (la coupe du pré-isolé : gaine, tube acier, deux fils de détection), un nom par module affiché « Tracé + module » dans le bandeau du haut.
// Utilisé par l'appli (accueil, chantier, écran de connexion) et par le traceur (Tracé Concepteur).
export const NUIT = '#2B1B5A', VIOLET = '#5E46B8', LAVANDE = '#BFB2EE';
// Les deux fils restent visibles dès 40 px (bandeau PC) ; en dessous (bandeau téléphone 34 px, favicon) on les retire : illisibles.
// variante : 'carre' (carré arrondi Nuit, traits blancs — l'icône), 'nu' (traits blancs seuls, pour un fond Nuit), 'mono' (anneaux Nuit sur blanc, impression)
export function logoTrace(size, o = {}) {
  const v = o.variant || 'carre'; const wires = o.wires !== undefined ? !!o.wires : size >= 40; const fg = v === 'mono' ? NUIT : '#FFFFFF', bg = v === 'mono' ? '#FFFFFF' : NUIT;
  const g = `<circle cx="50" cy="50" r="48" fill="${fg}"/><circle cx="50" cy="50" r="40" fill="${bg}"/><circle cx="50" cy="50" r="24" fill="${fg}"/><circle cx="50" cy="50" r="17" fill="${bg}"/>${wires ? `<circle cx="22.3" cy="34" r="4" fill="${fg}"/><circle cx="77.7" cy="34" r="4" fill="${fg}"/>` : ''}`;
  const t = o.title ? `<title>${o.title}</title>` : '';
  if (v === 'carre') return `<svg class="tLogo" width="${size}" height="${size}" viewBox="0 0 100 100" role="img" aria-label="Tracé">${t}<rect width="100" height="100" rx="22" fill="${NUIT}"/><g transform="translate(14 14) scale(0.72)">${g}</g></svg>`;
  return `<svg class="tLogo" width="${size}" height="${size}" viewBox="0 0 100 100" role="img" aria-label="Tracé">${t}${g}</svg>`;
}
// Les modules (nom affiché après « Tracé ») — la correspondance écrans → module est faite par l'appli (app.js : bandModule)
export const MODULES = {
  chantier: { label: 'Chantier', desc: 'Plan, soudures, détection d\'humidité, hydraulique, phasage, modifications, QSE, dossier, DOE' },
  concepteur: { label: 'Concepteur', desc: 'Le traceur : études, plans, calage, versions' },
  commerce: { label: 'Commerce', desc: 'Affaires à l\'étude : DCE, chiffrage, DPGF, mémoire technique, documents administratifs, offres' }, /* 31/10 (Ethan) : « Affaires » redevient « Commerce » */
  affaire: { label: 'Affaire', desc: 'Suivi financier des chantiers : bons de commande, notes de frais, comptes chantier' }, /* 31/10 (Ethan) : module à part — le financier n\'est pas dans le suivi opérationnel (Pilotage) */
  pilotage: { label: 'Pilotage', desc: 'Planning, pointages à valider, heures, production, sécurité, matériel et véhicules des équipes' },
  flotte: { label: 'Flotte', desc: 'Véhicules : remise, états des lieux, cartes, mouvements' },
  magasin: { label: 'Magasin', desc: 'Demandes de matériel, stock du dépôt, réception, inventaire, matériel' },
  compagnon: { label: 'Compagnon', desc: 'Mon pointage, mes documents à signer, mes demandes, mon véhicule, mon avatar' },
  equipe: { label: 'Équipe', desc: 'Personnes, accueil RH, fiches de poste, droits' }
};
/* 31/10 : modules qu'une entreprise peut ne pas prendre (réglage « modules », Administrateur → 🏢 Entreprise) — Chantier, Compagnon et Équipe sont toujours là */
export const MODULES_OPTION = ['concepteur', 'pilotage', 'commerce', 'affaire', 'flotte', 'magasin'];
// Réglage « entreprise » (logo + nom affichés à droite du bandeau) : réglage partagé app_settings « entreprise » (admin), copie sur l'appareil
export const ENT_KEY = 'trace:entreprise';
export function entLocal() { try { const v = JSON.parse(localStorage.getItem(ENT_KEY) || 'null'); return v && typeof v === 'object' ? v : null } catch (e) { return null } }
export function entName(e) { return (e && String(e.name || '').trim()) || 'SCR' }
// logo de l'entreprise : TOUJOURS en <img> (un SVG envoyé ne peut rien exécuter dans une image), jamais rogné (object-fit: contain) ; sans logo : le nom en texte
export function entHTML(e) {
  const esc = s => String(s == null ? '' : s).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c]);
  const ok = e && typeof e.logo === 'string' && /^data:image\/(png|jpeg|webp|svg\+xml);base64,[A-Za-z0-9+/=]+$/.test(e.logo);
  return ok ? `<img class="tbCoImg" src="${e.logo}" alt="${esc(entName(e))}">` : `<span class="tbCoTxt">${esc(entName(e))}</span>`;
}
