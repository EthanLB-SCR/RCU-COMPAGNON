// paliers.js — PALIERS D'ACCÈS AUX OPTIONS (30/10/2026, lot 2910h). Ethan : « un seul logiciel, pas deux versions : ceux qui n'ont accès qu'à la première livraison (V1,
// janvier) ne voient pas le reste ; le Sud-Ouest et moi testons toutes les options pendant un an ; fin 2027 on ouvre à tout le monde ; que ce soit facile de gérer qui voit quoi ».
// · Une OPTION = une clé (ci-dessous), rangée dans un groupe, avec son palier par défaut : « socle » (tout SCR) ou « labo » (testeurs).
// · Le PALIER d'une option et celui d'une PERSONNE se règlent dans l'appli (Administrateur → Options), pas dans le code : réglage partagé (app_settings « paliers »),
//   copie sur l'appareil. Une personne « labo » voit tout ; une personne « socle » ne voit que le socle, plus / moins ses options personnelles.
// · Interrupteur général `on` : tant qu'il est éteint, RIEN ne change (tout le monde voit tout, comme aujourd'hui) — on l'allume pour la livraison de janvier.
// · Ce qui est caché est caché à l'écran (onglets, tuiles, boutons) ; les droits d'écriture restent ceux des postes (acces.js). Caché n'est pas secret.
// · Règle de rigueur : toute nouveauté naît en « labo » ; un onglet ou une tuile sans clé connue n'est jamais caché (on ne casse pas l'existant), mais le test
//   unit_paliers le signale.
export const PALIERS={socle:'Socle — tout SCR',labo:'Labo — testeurs (Sud-Ouest)'};
export const GROUPES={chantier:'Chantier',pilotage:'Pilotage',commerce:'Commerce',affaire:'Affaire',affaires:'Commerce',flotte:'Flotte',magasin:'Magasin',compagnon:'Compagnon',equipe:'Équipe',transverse:'Sans module',
  /* anciens groupes (jusqu'au 30/10) : toujours acceptés, rangés dans leur module à l'écran */ equipes:'Pilotage',secu:'Sans module',scr:'Équipe',moi:'Compagnon'};
/* 31/10 (Ethan : « la réorganisation éventuelle des options par module ») : l'écran 🧪 Options range les options par MODULE (charte « Tracé ») — Chantier, Pilotage,
   Affaires, Flotte, Magasin, Compagnon, Équipe, puis ce qui n'a pas de module (Conversation… : transverse) ; un groupe inconnu tombe dans « Autres ». */
export const MOD_ORDER=['chantier','pilotage','commerce','affaire','flotte','magasin','compagnon','equipe','transverse','autres']; /* 31/10 : Affaires → Commerce ; + Affaire (suivi financier) */
export const MOD_LABEL={chantier:'Tracé Chantier',pilotage:'Tracé Pilotage',commerce:'Tracé Commerce',affaire:'Tracé Affaire',flotte:'Tracé Flotte',magasin:'Tracé Magasin',compagnon:'Tracé Compagnon',equipe:'Tracé Équipe',transverse:'Sans module (transverse)',autres:'Autres'};
const GROUPE_MODULE={equipes:'pilotage',secu:'transverse',scr:'equipe',moi:'compagnon',affaires:'commerce'};
const FEAT_MODULE={commerce:'commerce',parc:'flotte',magasin:'magasin',frais:'affaire',comptechantier:'affaire'}; /* 31/10 : notes de frais et compte chantier = module Affaire (suivi financier) */ // anciennes options du groupe « SCR, Commerce, Parc »
// [clé, libellé, groupe, palier par défaut, ce que ça cache]
export const FEATURES=[
 ['bouclage','Détection d\'humidité','chantier','socle','onglet Détection d\'humidité : mesures, localisation de défaut, bouclages temporaires'],
 ['hydro','Hydraulique','chantier','labo','onglet Hydraulique : essais, hydrants, PV, calendrier'],
 ['stock','Stockage','chantier','labo','onglet Stockage (zones, livraisons, prélèvements) et le catalogue des pièces'],
 ['fourniture','Fournitures','chantier','labo','onglet Fournitures : besoins, commandes fournisseur, comparatif des quantitatifs'],
 ['phasage','Phasage','chantier','labo','onglet Phasage : phases, planning du chantier, marché'],
 ['modifs','Modifications / TS','chantier','labo','onglet Modifications : comparaison marché / réel, modifications déclarées (TS) pointées sur le plan, partie Modifications du DOE'],
 ['points','Points de contrôle','chantier','labo','onglet Points de contrôle : vannes, purges, vidanges, sous-stations, raccordements — état et photos datées'],
 ['conv','Conversation','chantier','socle','onglet Conversation : messages, notes sur le plan, tâches'],
 ['qse','QSE du chantier','chantier','socle','onglet QSE : quarts d\'heure, accueils, émargements'],
 ['dossier','Dossier du chantier','chantier','socle','onglet Dossier : pièces obligatoires (DICT, PPSPS, PGC…), lien vers le Drive du chantier'],
 ['export','DOE et exports','chantier','socle','onglet DOE et exports : carnet de soudage, plan, maquette, lien du plan interactif, zip DOE'],
 ['mutu','Chantier partagé par affaire','chantier','labo','rattacher une seconde affaire à un chantier, dossiers séparés par affaire'],
 ['planning','Planning des équipes','pilotage','socle','Pilotage → Planning de la semaine, Ma semaine'],
 ['objectifs','Objectifs des équipes','pilotage','labo','Pilotage → Objectifs du jour par équipe'],
 ['production','Production par équipe','pilotage','socle','Pilotage → heures et production, rapport de semaine'],
 ['tutos','Tutoriels','transverse','labo','tutoriel de chaque module et de chaque option, la 1re fois qu\'on y entre ; « ? » pour le revoir ; 📚 Tous les tutoriels'], /* 31/10 (lot MO) */
 ['accident','Déclaration d\'accident','transverse','labo','Pilotage → Sécurité : déclarer un accident / presque-accident'],
 ['commerce','Commerce','commerce','labo','module Commerce : affaires à l\'étude, DCE, chiffrage, mémoire technique, DPGF, offre, situations'],
 ['parc','Parc / véhicules','scr','labo','onglet Parc : flotte, réception et restitution de véhicule, Moi → Mon véhicule'],
 ['magasin','Magasin et matériel','scr','labo','demandes de matériel, préparation, stock du dépôt'],
 ['frais','Notes de frais','affaire','labo','Moi → Mes notes de frais, validation des notes'],
 ['plansexe','Plans d\'exécution','chantier','labo','Dossier → plans d\'exé (planches, indices, zones), « 📄 Plan d\'exé » des fiches soudure, « 📄 Mes plans » sur le plan, calque Plans d\'exé'], /* 31/10 (lot DX) */
 ['planning_simple','Planning simplifié (semaine par chantier)','pilotage','labo','Pilotage → « Planning de la semaine » (qui est où chaque jour, placer en 3 touchers, copier la semaine dernière) ; « Demain : chantier X » dans Compagnon — sans elle : le planning détaillé comme avant'], /* 31/10 (lot PI) */
 ['prod_tableau','Production : tableau jour / semaine','pilotage','labo','Pilotage → Production par équipe → tableau par équipe (jour / semaine : soudures, manchons, ml, objectif vs réalisé, barres), chantiers comptés, impression A4 — sans elle : l\'écran d\'avant seul'], /* 31/10 (lot PI) */
 ['demandes','Demandes de matériel (sans magasin)','compagnon','labo','Compagnon → Mes demandes (matériel pour un chantier), Pilotage → Demandes de matériel : commandé, livré / remis, refusé'], /* 31/10 (lot CC) */
 ['comptechantier','Compte chantier','affaire','labo','Affaire → Compte d\'un chantier, Bureau du chantier → 💶 : bons de commande, dépenses, heures par poste (lecture seule)'], /* 31/10 (lot CC) */
];
export const FEAT_KEYS=FEATURES.map(f=>f[0]);
export const featDef=k=>FEATURES.find(f=>f[0]===k)||null;
// 31/10 (lot MO) : module d'une option (écran 🧪 Options) : son groupe s'il est un module ; sinon l'ancien groupe traduit ; inconnu → « autres »
export const featModule=f=>{const d=Array.isArray(f)?f:featDef(f);if(!d)return 'autres';if(FEAT_MODULE[d[0]])return FEAT_MODULE[d[0]];const g=d[2];if(MOD_ORDER.includes(g))return g;return GROUPE_MODULE[g]||'autres';};
// 31/10 : libellés aux noms des modules pour les options dont la ligne ci-dessus reste telle quelle (fin du registre : les lots parallèles y ajoutent leurs clés)
[['parc','Flotte de véhicules','module Flotte : véhicules, réception et restitution de véhicule, Compagnon → Mon véhicule'],['frais','Notes de frais','Compagnon → Mes notes de frais, validation des notes (Affaire)']].forEach(([k,l,d])=>{const f=featDef(k);if(f){f[1]=l;f[4]=d;}});
/* ── 31/10 (Ethan : « si les modules Magasin ou Flotte ne sont pas pris, ça ne doit pas apparaître ») : MODULES DE L'ENTREPRISE ──
   Réglage partagé app_settings « modules » {off:[…]} (Administrateur → 🏢 Entreprise), copie sur l'appareil. Un module que l'entreprise n'a pas pris disparaît PARTOUT :
   son onglet, sa ligne du menu des modules et toutes ses options, y compris leurs accès depuis un autre module (ex. véhicules dans Pilotage) — interrupteur des
   paliers éteint ou allumé. Chantier, Compagnon et Équipe sont toujours là (marque.js : MODULES_OPTION). Par défaut : tout est pris (rien ne change). */
const MKEY='trace:modules';let MODOFF=new Set();try{const v=JSON.parse(localStorage.getItem(MKEY)||'null');if(v&&Array.isArray(v.off))MODOFF=new Set(v.off.filter(x=>typeof x==='string'));}catch(e){}
export const moduleOn=m=>!m||!MODOFF.has(m);
export const modulesOff=()=>[...MODOFF];
export function setModulesLocal(v){MODOFF=new Set(v&&Array.isArray(v.off)?v.off.filter(x=>typeof x==='string'):[]);try{localStorage.setItem(MKEY,JSON.stringify({off:[...MODOFF],at:(v&&v.at)||null,by:(v&&v.by)||''}));}catch(e){}}
export async function loadModules(){if(!A||!A.sync||!A.sync.getSetting||!A.state.cloudUser)return false;try{const v=await A.sync.getSetting('modules');if(v&&typeof v==='object'){setModulesLocal(v);return true;}}catch(e){console.warn(e);}return false;}
export async function saveModules(off){const v={off:[...new Set((off||[]).filter(x=>typeof x==='string'))],at:new Date().toISOString(),by:(A&&A.userName&&A.userName())||''};let where='appareil';
  if(A&&A.state.cloudUser&&A.sync&&A.sync.setSetting){const err=await A.sync.setSetting('modules',v);if(err)return {error:err==='hors ligne'?'connexion au serveur perdue — rien n\'a changé (🩺 Diagnostic)':err};where='serveur';}
  setModulesLocal(v);return {ok:true,where};}
/* ── réglage partagé ── */
const KEY='trace:paliers';let CFG=null;let A=null;
export function initPaliers(api){A=api;CFG=loadLocal();}
function loadLocal(){try{const v=JSON.parse(localStorage.getItem(KEY)||'null');return norm(v);}catch(e){return norm(null);}}
function norm(v){const o=v&&typeof v==='object'&&!Array.isArray(v)?v:{};const feat={};Object.entries(o.feat||{}).forEach(([k,p])=>{if(featDef(k)&&PALIERS[p])feat[k]=p;});
  const people={};Object.entries(o.people||{}).forEach(([id,p])=>{if(PALIERS[p]&&p!=='socle')people[String(id)]=p;});const extra={};Object.entries(o.extra||{}).forEach(([id,m])=>{if(!m||typeof m!=='object')return;const x={};Object.entries(m).forEach(([k,b])=>{if(featDef(k)&&typeof b==='boolean')x[k]=b;});if(Object.keys(x).length)extra[String(id)]=x;});
  return {v:1,on:!!o.on,feat,people,extra,at:o.at||null,by:o.by||''};}
export const paliersCfg=()=>CFG||(CFG=norm(null));
export async function loadPaliers(){if(!A||!A.sync||!A.sync.getSetting||!A.state.cloudUser)return false;try{const v=await A.sync.getSetting('paliers');if(v&&typeof v==='object'){CFG=norm(v);try{localStorage.setItem(KEY,JSON.stringify(CFG));}catch(e){}return true;}}catch(e){console.warn(e);}return false;}
export async function savePaliers(patch){const next=norm(Object.assign({},paliersCfg(),patch,{at:new Date().toISOString(),by:(A&&A.userName&&A.userName())||''}));let where='appareil';
  if(A&&A.state.cloudUser&&A.sync&&A.sync.setSetting){const err=await A.sync.setSetting('paliers',next);if(err)return {error:err==='hors ligne'?'connexion au serveur perdue — rien n\'a changé (🩺 Diagnostic)':err};where='serveur';}
  CFG=next;try{localStorage.setItem(KEY,JSON.stringify(CFG));}catch(e){}return {ok:true,where};}
/* ── lecture ── */
export const palierOf=k=>{const c=paliersCfg();if(c.feat[k])return c.feat[k];const d=featDef(k);return d?d[3]:'socle';};
export const idsOf=acc=>acc?[acc.id,acc.email].filter(Boolean).map(String):[];
export const personPalier=acc=>{const c=paliersCfg();const ids=idsOf(acc);return ids.some(id=>c.people[id]==='labo')?'labo':'socle';};
export const personExtra=(acc,k)=>{const c=paliersCfg();for(const id of idsOf(acc)){const x=c.extra[id];if(x&&typeof x[k]==='boolean')return x[k];}return null;};
/* la personne voit-elle l'option ? — interrupteur général éteint : oui, toujours ; clé inconnue : oui (on ne casse pas l'existant) ; sinon : réglage personnel, puis palier */
export function featFor(acc,k){const c=paliersCfg();if(featDef(k)&&!moduleOn(featModule(k)))return false; /* 31/10 : module non pris → l'option disparaît, paliers éteints ou non */if(!c.on)return true;if(!featDef(k))return true;const x=personExtra(acc,k);if(x!==null)return x;if(personPalier(acc)==='labo')return true;return palierOf(k)==='socle';}
export function featsOf(acc){const out={};FEAT_KEYS.forEach(k=>{out[k]=featFor(acc,k);});return out;}
export const paliersOn=()=>paliersCfg().on;
export const laboPeople=()=>Object.entries(paliersCfg().people).filter(([,p])=>p==='labo').map(([id])=>id);
/* ── réglages (administrateur) ── */
export function setFeatPalier(k,p){if(!featDef(k)||!PALIERS[p])return Promise.resolve({error:'option inconnue'});const feat=Object.assign({},paliersCfg().feat);if(p===featDef(k)[3])delete feat[k];else feat[k]=p;return savePaliers({feat});}
export function setPersonPalier(acc,p){const people=Object.assign({},paliersCfg().people);idsOf(acc).forEach(id=>{delete people[id];});if(p==='labo'&&acc&&acc.id!=null)people[String(acc.id)]='labo';return savePaliers({people});}
export function setPersonExtra(acc,k,val){const extra=Object.assign({},paliersCfg().extra);const id=acc&&acc.id!=null?String(acc.id):null;if(!id)return Promise.resolve({error:'compte sans identifiant'});const x=Object.assign({},extra[id]||{});if(val===null||val===undefined)delete x[k];else x[k]=!!val;if(Object.keys(x).length)extra[id]=x;else delete extra[id];idsOf(acc).filter(o=>o!==id).forEach(o=>{delete extra[o];});return savePaliers({extra});}
export const setPaliersOn=on=>savePaliers({on:!!on});
/* résumé pour l'écran : combien d'options en labo, qui teste */
export function paliersSummary(accounts){const labo=FEAT_KEYS.filter(k=>palierOf(k)==='labo');const people=(accounts||[]).filter(a=>personPalier(a)==='labo');return {on:paliersOn(),labo,socle:FEAT_KEYS.filter(k=>palierOf(k)==='socle'),people};}
