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
export const GROUPES={chantier:'Chantier',equipes:'Équipes & heures',secu:'Sécurité',scr:'SCR, Commerce, Parc',moi:'Moi'};
// [clé, libellé, groupe, palier par défaut, ce que ça cache]
export const FEATURES=[
 ['bouclage','Bouclage / DH','chantier','socle','onglet Bouclage : mesures DH, localisation de défaut, bouclages temporaires'],
 ['hydro','Hydraulique','chantier','labo','onglet Hydro : essais, hydrants, PV, calendrier'],
 ['stock','Stock chantier','chantier','labo','onglet Stock (zones, livraisons, prélèvements) et le catalogue'],
 ['fourniture','Fourniture','chantier','labo','onglet Fourniture : besoins, commandes fournisseur, comparatif des quantitatifs'],
 ['phasage','Phasage','chantier','labo','onglet Phasage : phases, planning du chantier, marché'],
 ['modifs','Modifications / TS','chantier','labo','onglet Modifs, éléments − / + sur le plan, bloc « Modifications » des fiches, partie Modifs du DOE'],
 ['points','Points / constats','chantier','labo','onglet Points : points d\'attention, constats, photos'],
 ['conv','Conversation','chantier','socle','onglet Conversation : messages, notes sur le plan, tâches'],
 ['qse','QSE du chantier','chantier','socle','onglet QSE : quarts d\'heure, accueils, émargements'],
 ['dossier','Dossier administratif','chantier','socle','onglet Dossier : documents obligatoires consultables (DICT…)'],
 ['export','Export / DOE','chantier','socle','onglet Export : carnet, plan, maquette, lien du plan interactif, zip DOE'],
 ['mutu','Chantier partagé par affaire','chantier','labo','rattacher une seconde affaire à un chantier, dossiers séparés par affaire'],
 ['planning','Planning des équipes','equipes','socle','Équipes & heures → Planning de la semaine, Ma semaine'],
 ['objectifs','Objectifs des équipes','equipes','labo','Équipes & heures → Objectifs du jour par équipe'],
 ['production','Production par équipe','equipes','socle','Équipes & heures → heures et production, rapport de semaine'],
 ['accident','Déclaration d\'accident','secu','labo','Sécurité → déclarer un accident / presque-accident'],
 ['commerce','Commerce','scr','labo','onglet Commerce : affaires, DCE, chiffrage, mémoire technique, DPGF, offre, situations'],
 ['parc','Parc / véhicules','scr','labo','onglet Parc : flotte, réception et restitution de véhicule, Moi → Mon véhicule'],
 ['magasin','Magasin et matériel','scr','labo','demandes de matériel, préparation, stock du dépôt'],
 ['frais','Notes de frais','moi','labo','Moi → Mes notes de frais, validation des notes'],
];
export const FEAT_KEYS=FEATURES.map(f=>f[0]);
export const featDef=k=>FEATURES.find(f=>f[0]===k)||null;
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
  if(A&&A.state.cloudUser&&A.sync&&A.sync.setSetting){const err=await A.sync.setSetting('paliers',next);if(err)return {error:err};where='serveur';}
  CFG=next;try{localStorage.setItem(KEY,JSON.stringify(CFG));}catch(e){}return {ok:true,where};}
/* ── lecture ── */
export const palierOf=k=>{const c=paliersCfg();if(c.feat[k])return c.feat[k];const d=featDef(k);return d?d[3]:'socle';};
export const idsOf=acc=>acc?[acc.id,acc.email].filter(Boolean).map(String):[];
export const personPalier=acc=>{const c=paliersCfg();const ids=idsOf(acc);return ids.some(id=>c.people[id]==='labo')?'labo':'socle';};
export const personExtra=(acc,k)=>{const c=paliersCfg();for(const id of idsOf(acc)){const x=c.extra[id];if(x&&typeof x[k]==='boolean')return x[k];}return null;};
/* la personne voit-elle l'option ? — interrupteur général éteint : oui, toujours ; clé inconnue : oui (on ne casse pas l'existant) ; sinon : réglage personnel, puis palier */
export function featFor(acc,k){const c=paliersCfg();if(!c.on)return true;if(!featDef(k))return true;const x=personExtra(acc,k);if(x!==null)return x;if(personPalier(acc)==='labo')return true;return palierOf(k)==='socle';}
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
