// acces.js — COMPTES ET ACCÈS v2 (Ethan 08/10 : les VRAIS postes de SCR, droits d'un POSTE ajustables dans l'onglet Administrateur, toujours
// corrigeables PERSONNE par personne ; recherche, filtres par poste / type / état ; « qui peut quoi ? » ; création de plusieurs accès d'un coup).
// Le droit effectif = droits du POSTE (défauts SCR + ajustements du poste, partagés par tous les appareils), plafonnés par le TYPE de compte
// (salarié / intérimaire / visiteur), puis corrigés compte par compte (ajustements personnels). L'administrateur (★, drapeau par personne) a tout.
// Sans serveur (ou sans sql/comptes_acces_v2.sql) : comptes et ajustements gardés sur l'appareil (démo) — l'appli ne casse jamais.
let A=null;
export function initAcces(api){A=api;loadLocalPR();}
const esc=s=>String(s??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const norm=s=>String(s||'').normalize('NFD').replace(/[̀-ͯ]/g,'').toLowerCase().replace(/[^a-z0-9@.\-]+/g,' ').replace(/\s+/g,' ').trim();
/* ---------- POSTES (liste d'Ethan, 08/10) ---------- */
export const FAMILLES={direction:'Direction',encadrement:'Encadrement travaux',terrain:'Terrain',support:'Bureau & support',exterieur:'Extérieur'};
export const FAM_COLOR={direction:'#6b4bd6',encadrement:'#1f6fd0',terrain:'#eb6834',support:'#2a9d5c',exterieur:'#8a877f'};
// [clé, libellé, famille, abrégé (colonnes du tableau), alias reconnus au collage d'une liste]
export const POSTES_DEF=[
 ['gerant','Gérant','direction','Gérant',['gerant','gerante','dirigeant','pdg']],
 ['dir_adjointe','Directrice adjointe','direction','Dir. adj.',['directrice adjointe','directeur adjoint','dir adjointe','dir adjoint','dga']],
 ['dir_technique','Directeur technique','direction','Dir. tech.',['directeur technique','directrice technique','dir technique']],
 ['resp_exploitation','Responsable d\'exploitation','encadrement','Resp. exploit.',['responsable d exploitation','responsable exploitation','resp exploitation','resp exploit','exploitation']],
 ['resp_operations','Responsable des opérations','encadrement','Resp. opé.',['responsable des operations','responsable operations','resp operations','resp ope','operations']],
 ['conducteur','Conducteur de travaux','encadrement','Cond. trav.',['conducteur de travaux','conductrice de travaux','conducteur','cdt']],
 ['chef','Chef de chantier','encadrement','Chef chant.',['chef de chantier','cheffe de chantier','chef chantier','chef']],
 ['soudeur','Soudeur','terrain','Soudeur',['soudeur','soudeuse','soudeur tig']],
 ['tuyauteur','Tuyauteur','terrain','Tuyauteur',['tuyauteur','tuyauteuse']],
 ['manchonneur','Manchonneur','terrain','Manchon.',['manchonneur','manchonneuse','manchonnage']],
 ['activites_specifiques','Activités spécifiques RCU','terrain','Act. spéc.',['activites specifiques rcu','activites specifiques','activite specifique','referent activites specifiques','chef d equipe activites specifiques','technicien activites specifiques','asr']],
 ['chauffeur_engin','Chauffeur d\'engin','terrain','Chauffeur',['chauffeur d engin','chauffeur d engins','chauffeur','conducteur d engin','conducteur d engins','pelleteur']],
 ['autre','Aide de chantier / autre','terrain','Aide',['aide de chantier','aide','manoeuvre','terrassier','autre']],
 ['resp_rh','Responsable RH','support','Resp. RH',['responsable rh','responsable ressources humaines','rrh','drh']],
 ['assist_rh','Assistante RH','support','Assist. RH',['assistante rh','assistant rh','assistante ressources humaines']],
 ['charge_dev_rh','Chargée de développement RH','support','Dév. RH',['chargee de developpement rh','charge de developpement rh','developpement rh','chargee developpement rh']],
 ['resp_admin_fin','Responsable administrative et financière','support','Admin / fin.',['responsable administrative et financiere','responsable administratif et financier','raf','administrative et financiere','responsable administrative']],
 ['resp_commercial','Responsable commercial','support','Commercial',['responsable commercial','responsable commerciale','commercial','commerciale']],
 ['charge_affaires','Chargé d\'affaires','support','Ch. affaires',['charge d affaires','chargee d affaires','charge d affaire','chargee d affaire','charge affaires','bureau d etudes','bureau']],
 ['resp_flotte','Responsable flotte','support','Flotte',['responsable flotte','resp flotte','flotte','parc materiel','responsable parc']],
 ['referent_magasin','Référent magasin','support','Magasin',['referent magasin','referente magasin','magasinier','magasiniere','magasin']],
 ['visiteur','Visiteur (client, maître d\'œuvre)','exterieur','Visiteur',['visiteur','visiteuse','client','maitre d oeuvre','moe','invite']],
];
export const POSTES=Object.fromEntries(POSTES_DEF.map(p=>[p[0],p[1]]));
export const POSTE_FAM=Object.fromEntries(POSTES_DEF.map(p=>[p[0],p[2]]));
export const POSTE_SHORT=Object.fromEntries(POSTES_DEF.map(p=>[p[0],p[3]]));
const LEGACY={bureau:'charge_affaires',terrassier:'autre'}; // anciens postes v1 (08/10 matin) ; « admin » = drapeau administrateur, voir normAccount
export const TYPES={salarie:'Salarié SCR',interim:'Intérimaire / invité',visiteur:'Visiteur'};
export const posteLabel=p=>POSTES[p]||(p==='admin'?'Administrateur':p||'');
export const famColor=p=>FAM_COLOR[POSTE_FAM[p]]||FAM_COLOR.exterieur;
/* ---------- DROITS ---------- */
// [clé, libellé, groupe]
export const PERMS=[
 ['weld.step1','Étape ① soudure','Terrain'],
 ['weld.step2','Étape ② fils raccordés + DH','Terrain'],
 ['weld.step3','Étape ③ manchon posé','Terrain'],
 ['weld.step4','Étape ④ moussage + finition','Terrain'],
 ['weld.extra','Ajouter une soudure supplémentaire sur le plan','Terrain'],
 ['weld.transfer','Transférer / échanger l\'avancement d\'une soudure','Terrain'],
 ['dh.measure','DH : mesures, localisation de défaut, bouclage','Terrain'],
 ['conv.post','Conversation : écrire, notes sur le plan, photos','Terrain'],
 ['undo.own','Annuler ses propres saisies (étape, soudure ajoutée) dans la limite de ses crédits — au-delà : demande au chef','Annulations'],
 ['undo.validate','Valider les demandes d\'annulation des autres, redonner des crédits','Annulations'],
 ['plan.view','Voir le plan, les fiches de soudure, le récap','Chantier'],
 ['weld.admin','Corriger une fiche : contrôle, annuler une étape, remettre « à souder », transférer une fiche vide','Chantier'],
 ['conv.task','Conversation : créer et assigner des tâches','Chantier'],
 ['hydro','Hydro : essais, hydrants, calendrier','Chantier'],
 ['stock.edit','Stock : livraisons, zones, prélèvements','Chantier'],
 ['phasage.edit','Phasage : phases, planning, marché','Chantier'],
 ['ts.qualify','Modifications : qualifier (TS / compris / mémoire), re-figer le marché','Chantier'],
 ['dossier.edit','Dossier administratif : déposer / retirer des documents','Chantier'],
 ['export.doe','Export DOE (carnet, plan, photos, zip)','Chantier'],
 ['qse.sign','QSE : émarger les documents','QSE'],
 ['qse.manage','QSE : créer accueils et quarts d\'heure, déposer des documents','QSE'],
 ['pointage.self','Pointer sa journée','Pointage'],
 ['pointage.validate','Valider les pointages de l\'équipe','Pointage'],
 ['site.tracer','Traceur : créer / modifier un réseau, calepinage, import DXF / PDF','Bureau'],
 ['site.versions','Versions du plan (historique, restauration)','Bureau'],
 ['site.delete','Supprimer un chantier','Bureau'],
 ['team.view','Voir l\'équipe (noms, postes)','Équipe'],
 ['planning.edit','Planning : placer les équipes sur les chantiers de la semaine, fiche chantier (secteur, chef, conducteur)','Équipe'], // 09/10 soir : conducteurs, responsables d'exploitation, direction — pas le chef de chantier (planning imposé)
];
export const STEP_PERMS=['weld.step1','weld.step2','weld.step3','weld.step4'];
export const PENDING=new Set([]); // 09/10 : tous les droits déclarés sont appliqués (plan.view à l'ouverture, dh.measure sur les états DH, pointage.*, qse.sign / manage, team.view sur la liste des personnes)
const GROUPS=[...new Set(PERMS.map(p=>p[2]))];
const ALL=Object.fromEntries(PERMS.map(([k])=>[k,true]));
const pick=(...ks)=>Object.fromEntries(PERMS.map(([k])=>[k,ks.includes(k)]));
const SOCLE=['plan.view','conv.post','pointage.self','qse.sign','team.view']; // ce que tout salarié a
const OPS=['undo.own']; // un opérateur annule ses propres erreurs (dans ses crédits)
// crédits d'annulation par semaine glissante (7 jours) : au-delà, la demande part au chef. Les postes qui ont « corriger une fiche » (weld.admin) sont illimités.
export const DEFAULT_CREDITS={soudeur:3,tuyauteur:3,manchonneur:3,activites_specifiques:3,chauffeur_engin:1,autre:1,chef:10,conducteur:10};
const ENC={...ALL,'site.delete':false};
const CHEF={...ENC,'planning.edit':false}; // le chef de chantier a tout l'encadrement sauf le planning (il lui est imposé)
// défauts SCR de chaque poste (salarié) — modifiables dans l'onglet Administrateur (écarts gardés sur le serveur, clé app_settings.poste_rights)
export const DEFAULT_RIGHTS={
 gerant:ALL,dir_adjointe:ALL,dir_technique:ALL,
 resp_exploitation:ALL,resp_operations:ALL,
 conducteur:ENC,chef:CHEF,
 soudeur:pick(...SOCLE,...OPS,'weld.step1','weld.extra','weld.transfer','dh.measure'),
 tuyauteur:pick(...SOCLE,...OPS,'weld.step1','weld.transfer'),
 manchonneur:pick(...SOCLE,...OPS,'weld.step2','weld.step3','weld.step4','weld.transfer','dh.measure'),
 activites_specifiques:pick(...SOCLE,...OPS,...STEP_PERMS,'weld.extra','weld.transfer','dh.measure'), // équipe Activités spécifiques RCU (Ethan 08/10) : tous les droits opérationnels du terrain
 chauffeur_engin:pick(...SOCLE,...OPS),autre:pick(...SOCLE,...OPS),
 resp_rh:pick(...SOCLE,'pointage.validate','qse.manage','dossier.edit'),assist_rh:pick(...SOCLE,'pointage.validate','qse.manage','dossier.edit'),charge_dev_rh:pick(...SOCLE,'pointage.validate','qse.manage'),
 resp_admin_fin:pick(...SOCLE,'pointage.validate','export.doe','dossier.edit','site.versions'),
 resp_commercial:pick(...SOCLE,'ts.qualify','export.doe','dossier.edit','phasage.edit'),
 charge_affaires:{...ALL,'pointage.self':false,'weld.step1':false,'weld.step2':false,'weld.step3':false,'weld.step4':false,'undo.own':false},
 resp_flotte:pick(...SOCLE,'stock.edit'),referent_magasin:pick(...SOCLE,'stock.edit'),
 visiteur:pick('plan.view'),
};
// plafond par type de compte : un intérimaire garde le pur opérationnel, un visiteur regarde
export const TYPE_CAP={
 salarie:null,
 interim:pick('plan.view',...STEP_PERMS,'weld.extra','weld.transfer','dh.measure','conv.post','pointage.self','qse.sign','undo.own'), // undo.own avec 0 crédit = toujours une demande au chef
 visiteur:pick('plan.view','export.doe'), // un visiteur regarde (plan, export) : il ne touche à rien, pas même la conversation (Ethan 08/10)
};
export const ADMIN_SEED=['elebihan@scr-soudure.fr']; // Ethan : administrateur d'office, quoi qu'il arrive côté serveur
/* ---------- droits des postes : défauts SCR + écarts (serveur app_settings.poste_rights, miroir sur l'appareil) ---------- */
const PRKEY='trace:posteRights';let PR={};let prVer=0;
function loadLocalPR(){try{PR=JSON.parse(localStorage.getItem(PRKEY)||'{}')||{};}catch(e){PR={};}if(typeof PR!=='object'||Array.isArray(PR))PR={};prVer++;}
export async function loadPosteRights(){if(!A||!A.sync||!A.sync.getSetting||!A.state.cloudUser)return false;try{const v=await A.sync.getSetting('poste_rights');if(v&&typeof v==='object'&&!Array.isArray(v)){PR=v;try{localStorage.setItem(PRKEY,JSON.stringify(PR));}catch(e){}prVer++;cache.key='';return true;}}catch(e){console.warn(e);}return false;}
export function posteRights(poste){const b=DEFAULT_RIGHTS[poste]||DEFAULT_RIGHTS.autre;const o=PR[poste]||{};const out={};PERMS.forEach(([k])=>out[k]=o[k]!==undefined?!!o[k]:!!b[k]);return out;}
export const posteDiff=poste=>Object.keys(PR[poste]||{}).filter(k=>k==='undo.credits'||PERMS.some(p=>p[0]===k)); // droits du poste qui s'écartent des défauts SCR
export const defaultCredits=poste=>DEFAULT_CREDITS[poste]!==undefined?DEFAULT_CREDITS[poste]:0;
export function posteCredits(poste){const o=PR[poste]||{};const v=o['undo.credits'];return typeof v==='number'&&isFinite(v)?Math.max(0,Math.round(v)):defaultCredits(poste);}
export async function setPosteCredits(poste,n){const o={...(PR[poste]||{})};n=n===null||n===''||!isFinite(+n)?null:Math.max(0,Math.round(+n));if(n===null||n===defaultCredits(poste))delete o['undo.credits'];else o['undo.credits']=n;const next={...PR};if(Object.keys(o).length)next[poste]=o;else delete next[poste];return savePR(next);}
// crédits effectifs d'une personne : illimités pour l'administrateur et pour qui « corrige une fiche » ; ajustement personnel sinon ; intérimaire plafonné à 0 (toujours une demande)
export function effectiveCredits(acc){if(!acc||acc.active===false)return 0;if(acc.admin)return Infinity;const e=effectiveRights(acc);if(e['weld.admin'])return Infinity;if(!e['undo.own'])return 0;
  const pv=acc.rights&&acc.rights['undo.credits'];if(typeof pv==='number'&&isFinite(pv))return Math.max(0,Math.round(pv));if(acc.type==='interim')return 0;return posteCredits(acc.poste);}
export function creditsOrigin(acc){if(!acc)return '';if(acc.admin)return 'illimités (administrateur)';const e=effectiveRights(acc);if(e['weld.admin'])return 'illimités (corrige les fiches)';if(!e['undo.own'])return 'aucune annulation';const pv=acc.rights&&acc.rights['undo.credits'];if(typeof pv==='number')return 'ajustement personnel';if(acc.type==='interim')return 'plafond intérimaire : toujours une demande au chef';return 'par le poste';}
async function savePR(next){let where='appareil';if(A.state.cloudUser&&A.sync.setSetting){const err=await A.sync.setSetting('poste_rights',next);if(err)return {error:err};where='serveur';}
  PR=next;try{localStorage.setItem(PRKEY,JSON.stringify(PR));}catch(e){}prVer++;cache.key='';return {ok:true,where};}
export async function setPosteRight(poste,key,val){const o={...(PR[poste]||{})};const b=!!(DEFAULT_RIGHTS[poste]||{})[key];if(val===null||!!val===b)delete o[key];else o[key]=!!val;const next={...PR};if(Object.keys(o).length)next[poste]=o;else delete next[poste];return savePR(next);}
export async function resetPoste(poste){const next={...PR};delete next[poste];return savePR(next);}
/* ---------- comptes ---------- */
function migrateRights(r){if(!r||typeof r!=='object'||Array.isArray(r))return {};const o={...r};if(o['weld.steps']!==undefined){STEP_PERMS.forEach(k=>{if(o[k]===undefined)o[k]=!!o['weld.steps'];});delete o['weld.steps'];}delete o['accounts.manage'];if(o['undo.credits']!==undefined&&!(typeof o['undo.credits']==='number'&&isFinite(o['undo.credits'])))delete o['undo.credits'];return o;}
// compte normalisé : {id,email,nom,prenom,name,poste,admin,role,type,rights,sites,active,local}
export function normAccount(p){if(!p)return null;const email=(p.email||'').toLowerCase();const isSeed=ADMIN_SEED.includes(email);let poste=p.poste||p.role||'soudeur';let admin=!!p.admin||isSeed;
  if(poste==='admin'){admin=true;poste=isSeed?'resp_exploitation':'chef';}if(LEGACY[poste])poste=LEGACY[poste];if(!POSTES[poste])poste='autre';
  return {id:p.id||(p.invite?'inv:'+email:undefined),email,nom:p.nom||'',prenom:p.prenom||'',name:p.name||[p.prenom,p.nom].filter(Boolean).join(' ')||email,poste,admin:p.invite?false:admin,invite:!!p.invite,role:p.role||'soudeur',type:TYPES[p.type]?p.type:(poste==='visiteur'?'visiteur':'salarie'),rights:migrateRights(p.rights),sites:Array.isArray(p.sites)&&p.sites.length?p.sites:null,active:p.active!==false,local:!!p.local,created_at:p.created_at||null};}
export function effectiveRights(acc){const out={};if(!acc||acc.active===false){PERMS.forEach(([k])=>out[k]=false);return out;}
  if(acc.admin){PERMS.forEach(([k])=>out[k]=true);return out;}
  const base=posteRights(acc.poste);const cap=TYPE_CAP[acc.type]||null;
  PERMS.forEach(([k])=>{let v=!!base[k];if(cap&&cap[k]===false)v=false;if(acc.rights&&acc.rights[k]!==undefined)v=!!acc.rights[k];out[k]=v;}); // un ajustement personnel passe au-dessus du plafond : c'est l'administrateur qui décide
  return out;}
// d'où vient un droit : admin · perso+ · perso- · plafond · poste · poste-
export function rightOrigin(acc,k){if(!acc||acc.active===false)return 'inactif';if(acc.admin)return 'admin';if(acc.rights&&acc.rights[k]!==undefined)return acc.rights[k]?'perso+':'perso-';if(!posteRights(acc.poste)[k])return 'poste-';const cap=TYPE_CAP[acc.type];if(cap&&cap[k]===false)return 'plafond';return 'poste';}
const ORIGIN_LABEL={admin:'★ administrateur','perso+':'ajout personnel','perso-':'retiré pour lui',plafond:'plafond du type',poste:'par le poste','poste-':'pas dans le poste',inactif:'compte inactif'};
// rôle « serveur » (ancienne colonne role, règles RLS du 18/08 : chef = tout, bureau = plans sans suppression, soudeur/manchonneur = fiches) déduit des droits effectifs
export function roleFor(acc){const e=effectiveRights(acc);if(acc.admin||e['site.delete'])return 'chef';
  if(['site.tracer','site.versions','stock.edit','phasage.edit','ts.qualify','weld.admin','hydro','conv.task','qse.manage','dossier.edit','export.doe','pointage.validate'].some(k=>e[k]))return 'bureau';
  return acc.poste==='manchonneur'?'manchonneur':'soudeur';}
// compte RÉEL (profil serveur), sans tenir compte d'un personnage de test
export function realAccount(){if(!A||!A.state.profile)return null;return normAccount(A.state.profile);}
const persona=u=>normAccount({id:'l:'+u.id,name:u.name,role:u.role,poste:u.role,admin:u.id==='ethan',type:'salarie',active:true,local:true});
// compte courant : profil serveur si connecté — sauf 🧪 MODE TEST : un ADMINISTRATEUR connecté qui choisit un personnage (sélecteur du chantier) voit l'appli avec
// les droits de ce personnage (Ethan 08/10 : « avec un profil soudeur j'ai pu en supprimer 4 sans parler de crédit » — le personnage changeait la signature, pas les droits).
// Un compte non administrateur ne peut pas jouer un personnage (il resterait lui-même). Hors connexion : le personnage de démo (Ethan L. = administrateur).
export function currentAccount(){if(!A)return null;const S=A.state;
  if(S.profile){const real=normAccount(S.profile);if(S.userId==='__me'||!real.admin)return real;
    if(String(S.userId).startsWith('acc:')){const id=String(S.userId).slice(4);const acc=(S.accounts||[]).find(a=>String(a.id)===id);if(!acc)return real;return {...acc,test:true};} // 🧪 tester comme une VRAIE personne (profil ou invitation)
    const u=(A.users()||[]).find(x=>x.id===S.userId);if(!u)return real;const p=persona(u);p.test=true;return p;}
  const u=(A.users()||[]).find(x=>x.id===S.userId)||(A.users()||[])[0];if(!u)return null;return persona(u);}
export const isTesting=()=>{const a=currentAccount();return !!(a&&a.test);};
let cache={key:'',rights:null};
export function can(key){if(!A)return true;const acc=currentAccount();const ck=acc?acc.id+'|'+acc.poste+'|'+acc.type+'|'+acc.admin+'|'+JSON.stringify(acc.rights||{})+'|'+acc.active+'|'+prVer:'none';if(cache.key!==ck){cache={key:ck,rights:effectiveRights(acc)};}return !!cache.rights[key];}
export const isAdmin=()=>{const a=currentAccount();return !!(a&&a.admin&&a.active!==false);};
export const canStep=n=>can('weld.admin')||can('weld.step'+n);
// chantiers autorisés (intérimaire / visiteur avec liste) : null = tous
export function allowedSites(){const acc=currentAccount();if(!acc||acc.admin||!acc.sites)return null;return acc.sites;}
/* ---------- magasin des comptes : serveur (profiles + invites via sql/comptes_acces_v2.sql) sinon appareil ---------- */
const LKEY='trace:accounts';
function localList(){try{return JSON.parse(localStorage.getItem(LKEY)||'[]')||[];}catch(e){return [];}}
function localSave(list){try{localStorage.setItem(LKEY,JSON.stringify(list));}catch(e){}}
export async function listAccounts(){let rows=[];let server=false;try{if(A.state.cloudUser){const r=await A.sync.listProfiles();if(r&&r.length){rows=r.map(normAccount);server=true;}
    if(server&&A.sync.listInvites){const inv=await A.sync.listInvites();(inv||[]).forEach(i=>{const em=(i.email||'').toLowerCase();if(!em||rows.some(r=>r.email===em))return;rows.push(normAccount({...i,invite:true,active:true}));});}}}catch(e){console.warn(e);} // invitation = accès créé, personne pas encore connectée (table invites) : elle doit se voir et se régler comme les autres
  const loc=localList().map(x=>normAccount({...x,local:true}));const all=[...rows,...loc.filter(l=>!rows.some(r=>r.email&&r.email===l.email))];A.state.accounts=all;if(A.onAccounts)try{A.onAccounts(all);}catch(e){}return {rows:all,server};}
export async function createAccess(o){const email=String(o.email||'').trim().toLowerCase();if(!email.includes('@')||/\s/.test(email))return {error:'adresse e-mail invalide'};if(!o.nom&&!o.prenom)return {error:'nom ou prénom manquant'};if(!POSTES[o.poste])return {error:'poste inconnu'};
  const acc={email,nom:o.nom||'',prenom:o.prenom||'',poste:o.poste,type:TYPES[o.type]?o.type:(o.poste==='visiteur'?'visiteur':'salarie'),rights:o.rights||{},sites:o.sites&&o.sites.length?o.sites:null,active:true,admin:false,created_at:new Date().toISOString(),created_by:A.userName()};
  acc.role=roleFor(normAccount(acc));
  let where='appareil';if(A.state.cloudUser&&A.sync.inviteAccess){try{const err=await A.sync.inviteAccess(acc);if(!err)where='serveur';else console.warn('invite',err);}catch(e){console.warn(e);}}
  if(where==='appareil'){const list=localList().filter(x=>x.email!==email);list.push({...acc,id:'loc:'+Date.now().toString(36)+Math.random().toString(36).slice(2,5)});localSave(list);}
  cache.key='';return {ok:true,where};}
export async function updateAccount(acc,patch){patch={...patch};
  if(acc.invite){if('admin' in patch)return {error:'★ possible quand la personne se sera connectée une première fois'};if('active' in patch)return {error:'une invitation se retire (✕), elle ne se désactive pas'};const p={};['nom','prenom','poste','type','rights','sites'].forEach(k=>{if(k in patch)p[k]=patch[k];});if(!A.sync.updateInvite)return {error:'hors ligne'};const err=await A.sync.updateInvite(acc.email,p);if(err)return {error:err};cache.key='';return {ok:true,where:'serveur'};}
  const merged=normAccount({...acc,...patch});const role=roleFor(merged);if(role!==acc.role&&!acc.local)patch.role=role; // la colonne role suit les droits (règles serveur)
  let where='appareil';if(A.state.cloudUser&&!acc.local&&A.sync.adminSetProfile){try{const err=await A.sync.adminSetProfile(acc.id,patch);if(!err)where='serveur';else return {error:err};}catch(e){return {error:String(e)};}}
  if(where==='appareil'){const list=localList();const i=list.findIndex(x=>x.email===acc.email||x.id===acc.id);if(i>=0)list[i]={...list[i],...patch};else list.push({...acc,...patch,id:acc.id||('loc:'+Date.now().toString(36))});localSave(list);}
  if(A.state.profile&&acc.id===A.state.profile.id)Object.assign(A.state.profile,patch);cache.key='';return {ok:true,where};}
// après un changement de droits de poste : la colonne role des comptes du serveur suit (silencieux, au plus quelques appels)
export async function removeInvite(acc){if(!acc.invite||!A.sync.deleteInvite)return {error:'pas une invitation'};const err=await A.sync.deleteInvite(acc.email);return err?{error:err}:{ok:true};}
async function syncRoles(rows){if(!A.state.cloudUser||!A.sync.adminSetProfile)return 0;let n=0;for(const r of rows){if(r.local||r.invite)continue;const want=roleFor(r);if(want!==r.role){try{const err=await A.sync.adminSetProfile(r.id,{role:want});if(!err){r.role=want;n++;}}catch(e){console.warn(e);}}}return n;}
/* ---------- onglet ADMINISTRATEUR (écran d'accueil) ---------- */
const AD={view:'people',q:'',fam:'',poste:'',type:'',etat:'',sort:'name',pv:'list',pp:'soudeur',who:'site.delete'};
let admRows=[],admServer=false,admEl=null,admMetas=[];
const ini=n=>String(n||'?').trim().split(/[\s.@_\-]+/).filter(Boolean).slice(0,2).map(x=>x[0]).join('').toUpperCase()||'?';
const chip=(t,bg,fg)=>`<span class="admChip" style="background:${bg};color:${fg}">${t}</span>`;
const typeChip=t=>t==='interim'?chip('intérim','#fff0e3','#b8560f'):t==='visiteur'?chip('visiteur','#eef0f3','#555'):'';
const countBy=poste=>admRows.filter(r=>r.poste===poste).length;
const posteOptions=sel=>Object.entries(FAMILLES).map(([f,fl])=>`<optgroup label="${esc(fl)}">${POSTES_DEF.filter(p=>p[2]===f).map(p=>`<option value="${p[0]}" ${sel===p[0]?'selected':''}>${esc(p[1])}</option>`).join('')}</optgroup>`).join('');
function filtered(){const q=norm(AD.q);let rows=admRows.filter(r=>{if(AD.fam&&POSTE_FAM[r.poste]!==AD.fam)return false;if(AD.poste&&r.poste!==AD.poste)return false;if(AD.type&&r.type!==AD.type)return false;
    if(AD.etat==='actif'&&!r.active)return false;if(AD.etat==='inactif'&&r.active)return false;if(AD.etat==='ajuste'&&!Object.keys(r.rights||{}).length&&!r.sites)return false;if(AD.etat==='admin'&&!r.admin)return false;if(AD.etat==='invite'&&!r.invite)return false;if(AD.etat==='connecte'&&r.invite)return false;
    if(q&&!norm(r.name+' '+r.prenom+' '+r.nom+' '+r.email+' '+posteLabel(r.poste)+' '+TYPES[r.type]).includes(q))return false;return true;});
  const pi=p=>POSTES_DEF.findIndex(x=>x[0]===p);
  const nk=a=>((a.nom||a.name)+' '+(a.prenom||'')).trim(); /* tri par NOM de famille puis prénom (liste RH) */
  rows.sort(AD.sort==='poste'?(a,b)=>(pi(a.poste)-pi(b.poste))||nk(a).localeCompare(nk(b),'fr'):AD.sort==='recent'?(a,b)=>String(b.created_at||'').localeCompare(String(a.created_at||''))||nk(a).localeCompare(nk(b),'fr'):(a,b)=>nk(a).localeCompare(nk(b),'fr'));return rows;}
export async function renderAdminHome(el){if(!el)return;if(!isAdmin()){el.innerHTML='<div class="card muted">Réservé à l\'administrateur.</div>';return;}
  admEl=el;el.innerHTML='<div class="card muted">Chargement des comptes…</div>';const {rows,server}=await listAccounts();admRows=rows;admServer=server;admMetas=(A.metas&&A.metas())||[];
  if(server){const n=await syncRoles(rows);if(n)console.info('rôles serveur réalignés :',n);}
  paint();}
function paint(){const el=admEl;if(!el)return;const me=currentAccount();
  el.innerHTML=`<div class="admHead"><div><h3 style="margin:0">⚙ Administrateur</h3><div class="hint">${admServer?'Comptes du serveur — ce que tu règles ici vaut sur tous les appareils.':'<b>Hors serveur</b> : comptes et réglages gardés sur cet appareil tant que tu n\'es pas connecté (et que <code>sql/comptes_acces_v2.sql</code> n\'est pas passé dans Supabase).'}</div></div>
    <div class="admNav"><button data-av="people" class="${AD.view==='people'?'on':''}">👥 Personnes <b>${admRows.length}</b></button><button data-av="postes" class="${AD.view==='postes'?'on':''}">🧩 Postes</button><button data-av="who" class="${AD.view==='who'?'on':''}">🔎 Qui peut quoi ?</button></div></div>
    ${AD.view==='people'?peopleHTML(me):AD.view==='postes'?postesHTML():whoHTML()}`;
  bind(el,me);}
/* ----- vue PERSONNES ----- */
function peopleHTML(me){const rows=filtered();const nI=admRows.filter(r=>r.type==='interim').length,nV=admRows.filter(r=>r.type==='visiteur').length,nOff=admRows.filter(r=>!r.active).length,nAdm=admRows.filter(r=>r.admin).length,nInv=admRows.filter(r=>r.invite).length;
  return `<div class="card"><div class="admActions"><button class="btn primary" id="admNew">➕ Créer un accès</button><button class="btn" id="admBulk">📋 Plusieurs d'un coup</button></div>
   <div class="admTools"><input class="f" id="admQ" placeholder="🔍 Nom, e-mail, poste…" value="${esc(AD.q)}" autocomplete="off">
    <select class="f" id="admFam"><option value="">Toutes les familles</option>${Object.entries(FAMILLES).map(([k,v])=>`<option value="${k}" ${AD.fam===k?'selected':''}>${esc(v)}</option>`).join('')}</select>
    <select class="f" id="admPoste"><option value="">Tous les postes</option>${POSTES_DEF.filter(p=>!AD.fam||p[2]===AD.fam).map(p=>`<option value="${p[0]}" ${AD.poste===p[0]?'selected':''}>${esc(p[1])} (${countBy(p[0])})</option>`).join('')}</select>
    <select class="f" id="admType"><option value="">Tous les types</option>${Object.entries(TYPES).map(([k,v])=>`<option value="${k}" ${AD.type===k?'selected':''}>${esc(v)}</option>`).join('')}</select>
    <select class="f" id="admEtat"><option value="">Tous les états</option><option value="actif" ${AD.etat==='actif'?'selected':''}>Actifs</option><option value="inactif" ${AD.etat==='inactif'?'selected':''}>Inactifs</option><option value="ajuste" ${AD.etat==='ajuste'?'selected':''}>Droits ou chantiers ajustés</option><option value="admin" ${AD.etat==='admin'?'selected':''}>Administrateurs</option><option value="invite" ${AD.etat==='invite'?'selected':''}>Invités (jamais connectés)</option><option value="connecte" ${AD.etat==='connecte'?'selected':''}>Déjà connectés</option></select>
    <select class="f" id="admSort"><option value="name" ${AD.sort==='name'?'selected':''}>Tri : nom de famille A → Z</option><option value="poste" ${AD.sort==='poste'?'selected':''}>Tri : poste</option><option value="recent" ${AD.sort==='recent'?'selected':''}>Tri : plus récents</option></select></div>
   <div class="admCount" id="admCount"><span id="admCountN">${countTxt(rows.length)}</span> · ${admRows.length} au total${nAdm?' · '+nAdm+' admin':''}${nI?' · '+nI+' intérim.':''}${nV?' · '+nV+' visiteur'+(nV>1?'s':''):''}${nOff?' · '+nOff+' inactif'+(nOff>1?'s':''):''}${nInv?' · <b>'+nInv+' invité'+(nInv>1?'s':'')+'</b> jamais connecté'+(nInv>1?'s':''):''}</div>
   <div class="admList" id="admList">${listHTML(rows,me)}</div>
   <div class="hint" style="margin-top:8px">Un salarié se connecte avec son e-mail entreprise, un intérimaire ou un visiteur avec son e-mail personnel ; à la première connexion il choisit son mot de passe. ★ = administrateur (tout, et cet onglet). Un compte inactif ne voit plus rien.</div></div>`;}
const countTxt=n=>n===0?'Personne ne correspond':n===1?'1 personne':n+' personnes';
function listHTML(rows,me){if(!rows.length)return `<div class="hint" style="padding:10px 2px">${admRows.length?'Aucun compte avec ces filtres.':'Aucun compte pour l\'instant — « Créer un accès », ou colle ta liste avec « Plusieurs d\'un coup ».'}</div>`;
  return rows.map(r=>{const eff=effectiveRights(r);const n=Object.values(eff).filter(Boolean).length;const ov=Object.keys(r.rights||{}).length;const isMe=me&&r.id===me.id;
   return `<div class="admAcc ${r.active?'':'off'}" data-acc="${esc(r.id)}"><div class="admTop"><span class="ini" style="background:${famColor(r.poste)}">${esc(ini(r.name))}</span><div class="admWho"><b>${esc(r.name)}</b>${isMe?chip('moi','#fff5cc','#6b5300'):''}${r.admin?chip('★ admin','#f3eefc','#6b4bd6'):''}${typeChip(r.type)}${r.invite?chip('invité · jamais connecté','#e8f0fb','#1c3d6b'):''}${r.active?'':chip('inactif','#fdecec','#a01212')}<br><span class="dim">${esc(r.email)}${r.local?' · sur cet appareil':''}</span></div><button class="admStar ${r.admin?'on':''}" data-admflag="${esc(r.id)}" title="${r.invite?'★ possible après sa première connexion':r.admin?'Retirer les pouvoirs d\'administrateur':'Donner les pouvoirs d\'administrateur (tout, et cet onglet)'}" ${r.invite?'disabled style="opacity:.35"':''}>★</button></div>
     <div class="admRow"><label>Poste <select class="f" data-adm="poste" data-id="${esc(r.id)}">${posteOptions(r.poste)}</select></label><label>Type <select class="f" data-adm="type" data-id="${esc(r.id)}">${Object.entries(TYPES).map(([k,v])=>`<option value="${k}" ${r.type===k?'selected':''}>${esc(v)}</option>`).join('')}</select></label></div>
     <div class="admRow"><button class="btn sm" data-admsites="${esc(r.id)}">🏗 ${r.sites?r.sites.length+' chantier'+(r.sites.length>1?'s':''):'tous les chantiers'}</button><button class="btn sm" data-admrights="${esc(r.id)}">🔑 ${r.admin?'tout':n+' / '+PERMS.length}${ov?' · '+ov+' ajusté'+(ov>1?'s':''):''}</button>${r.invite?`<button class="btn sm" style="margin-left:auto;color:#d03b3b" data-admuninvite="${esc(r.id)}" title="Retirer l'invitation (la personne ne pourra pas se connecter)">✕ Retirer</button>`:`<label class="btn sm" style="margin-left:auto"><input type="checkbox" data-adm="active" data-id="${esc(r.id)}" ${r.active?'checked':''}> actif</label>`}</div></div>`;}).join('');}
/* ----- vue POSTES ----- */
function postesHTML(){const diffAll=POSTES_DEF.filter(p=>posteDiff(p[0]).length).length;
  return `<div class="card"><div class="hint" style="margin-top:0">Les droits d'un poste valent pour toutes les personnes de ce poste (sauf ajustement personnel, bouton 🔑 de la personne). Un intérimaire est en plus plafonné au terrain, un visiteur au regard. Coche / décoche : c'est enregistré tout de suite.${diffAll?' <b>'+diffAll+' poste'+(diffAll>1?'s':'')+' modifié'+(diffAll>1?'s':'')+'</b> par rapport aux défauts SCR.':''}</div>
   <div class="admSeg"><button data-pv="list" class="${AD.pv==='list'?'on':''}">Par poste</button><button data-pv="table" class="${AD.pv==='table'?'on':''}">Tableau complet</button></div>
   ${AD.pv==='list'?posteListHTML():posteTableHTML()}
   <div class="hint" style="margin-top:8px">◌ = droit prévu, pas encore vérifié par l'appli (réglable dès maintenant, appliqué quand la fonction arrivera).</div></div>`;}
function posteListHTML(){const p=AD.pp;const rights=posteRights(p);const diff=posteDiff(p);const base=DEFAULT_RIGHTS[p]||{};const n=countBy(p);
  return `<div class="admFams">${Object.entries(FAMILLES).map(([f,fl])=>`<div class="admFam"><div class="admFamT"><span class="famDot" style="background:${FAM_COLOR[f]}"></span>${esc(fl)}</div><div class="admChips">${POSTES_DEF.filter(x=>x[2]===f).map(x=>`<button class="pchip ${AD.pp===x[0]?'on':''}" data-pp="${x[0]}" style="--c:${FAM_COLOR[f]}">${esc(x[1])}${countBy(x[0])?' <b>'+countBy(x[0])+'</b>':''}${posteDiff(x[0]).length?' <i title="modifié par rapport aux défauts SCR">●</i>':''}</button>`).join('')}</div></div>`).join('')}</div>
   <div class="admPoste"><div class="admPosteH"><span class="ini" style="background:${famColor(p)}">${esc(POSTE_SHORT[p].slice(0,2))}</span><div style="flex:1;min-width:0"><h3 style="margin:0">${esc(POSTES[p])}</h3><div class="dim">${n?n+' personne'+(n>1?'s':''):'personne pour l\'instant'} · ${Object.values(rights).filter(Boolean).length} / ${PERMS.length} droits${diff.length?' · <b>'+diff.length+' écart'+(diff.length>1?'s':'')+' avec les défauts SCR</b>':' · défauts SCR'}</div></div>${diff.length?`<button class="btn sm" id="admPReset">↺ Défauts SCR</button>`:''}</div>
    ${GROUPS.map(g=>`<div class="admGrp">${esc(g)}</div>`+PERMS.filter(x=>x[2]===g).map(([k,lab])=>`<label class="admPerm"><input type="checkbox" data-pr="${k}" ${rights[k]?'checked':''}><span>${esc(lab)}${PENDING.has(k)?' <span class="dim" title="prévu">◌</span>':''}${diff.includes(k)?' '+chip('≠ SCR : '+(base[k]?'oui':'non'),'#fff0e3','#b8560f'):''}</span></label>`).join('')+(g==='Annulations'?`<div class="admPerm" style="align-items:center"><input type="number" min="0" max="99" class="f" data-pcred value="${posteCredits(p)}" style="width:64px;padding:4px 6px;text-align:center" ${rights['weld.admin']?'disabled':''}><span><b>Crédits d'annulation par semaine</b> (7 jours glissants) — au-delà, demande au chef${rights['weld.admin']?' · <span class="dim">sans objet : ce poste corrige les fiches, illimité</span>':''}${diff.includes('undo.credits')?' '+chip('≠ SCR : '+defaultCredits(p),'#fff0e3','#b8560f'):' <span class="dim">· défaut SCR : '+defaultCredits(p)+'</span>'}<br><span class="dim" style="font-size:10.5px">Intérimaire : toujours 0 (chaque annulation passe par le chef). Réglable aussi personne par personne (🔑).</span></span></div>`:'')).join('')}
   </div>`;}
function posteTableHTML(){const caps=[['interim','Intérim.','plafond intérimaire (fixe)'],['visiteur','Visit.','plafond visiteur (fixe)']];
  return `<div class="admMxWrap"><table class="admMx"><thead><tr><th class="mxl">Droit</th>${POSTES_DEF.map(p=>`<th style="border-top:3px solid ${FAM_COLOR[p[2]]}" title="${esc(p[1])}${posteDiff(p[0]).length?' — modifié':''}"><span>${esc(p[3])}</span><small>${countBy(p[0])||'·'}</small></th>`).join('')}${caps.map(c=>`<th class="mxcap" title="${c[2]}"><span>${c[1]}</span><small>plaf.</small></th>`).join('')}</tr></thead><tbody>
   ${GROUPS.map(g=>`<tr class="mxg"><td colspan="${POSTES_DEF.length+3}">${esc(g)}</td></tr>`+PERMS.filter(x=>x[2]===g).map(([k,lab])=>`<tr><td class="mxl" title="${esc(lab)}">${esc(lab.length>38?lab.slice(0,37)+'…':lab)}${PENDING.has(k)?' <span class="dim">◌</span>':''}</td>${POSTES_DEF.map(p=>{const on=posteRights(p[0])[k];const mod=(PR[p[0]]||{})[k]!==undefined;return `<td class="mxc ${on?'on':''} ${mod?'mod':''}" data-mx="${p[0]}|${k}" title="${esc(p[1])} — ${esc(lab)}${mod?' (modifié, défaut SCR : '+((DEFAULT_RIGHTS[p[0]]||{})[k]?'oui':'non')+')':''}">${on?'✓':'·'}</td>`;}).join('')}${caps.map(c=>`<td class="mxcap">${TYPE_CAP[c[0]][k]?'<span class="ok">✓</span>':'<span class="ko">✕</span>'}</td>`).join('')}</tr>`).join('')).join('')}<tr class="mxg"><td colspan="${POSTES_DEF.length+3}">Crédits d'annulation / semaine</td></tr><tr><td class="mxl" title="au-delà, demande au chef ; illimité pour qui corrige les fiches">Crédits / semaine</td>${POSTES_DEF.map(p=>{const r=posteRights(p[0]);const mod=(PR[p[0]]||{})['undo.credits']!==undefined;return r['weld.admin']?`<td class="mxcap" title="illimité (corrige les fiches)">∞</td>`:`<td class="mxc mxn ${mod?'mod':''}" data-mxc="${p[0]}" title="${esc(p[1])} — crédits par semaine (défaut SCR : ${defaultCredits(p[0])})">${posteCredits(p[0])}</td>`;}).join('')}<td class="mxcap" title="intérimaire : toujours une demande">0</td><td class="mxcap">—</td></tr></tbody></table></div>
   <div class="hint">Touche une case pour changer le droit du poste. Point orange = modifié par rapport aux défauts SCR. Les deux dernières colonnes sont les plafonds des intérimaires et des visiteurs (fixes).</div>`;}
/* ----- vue QUI PEUT QUOI ----- */
function whoHTML(){const k=AD.who;const lab=(PERMS.find(p=>p[0]===k)||[])[1]||k;const have=admRows.filter(r=>effectiveRights(r)[k]);const not=admRows.filter(r=>!effectiveRights(r)[k]);const postes=POSTES_DEF.filter(p=>posteRights(p[0])[k]);
  const line=r=>{const o=rightOrigin(r,k);return `<div class="admWhoL"><span class="ini sm" style="background:${famColor(r.poste)}">${esc(ini(r.name))}</span><span style="flex:1;min-width:0"><b>${esc(r.name)}</b> <span class="dim">· ${esc(posteLabel(r.poste))}${r.type!=='salarie'?' · '+esc(TYPES[r.type]):''}</span></span>${chip(ORIGIN_LABEL[o]||o,o==='admin'?'#f3eefc':o==='perso+'?'#e6f6ea':o==='perso-'?'#fdecec':o==='plafond'?'#fff0e3':'#f1f0eb',o==='admin'?'#6b4bd6':o==='perso+'?'#1d7a3a':o==='perso-'?'#a01212':o==='plafond'?'#b8560f':'#555')}</div>`;};
  return `<div class="card"><label class="f">Un droit</label><select class="f" id="admWho">${GROUPS.map(g=>`<optgroup label="${esc(g)}">${PERMS.filter(x=>x[2]===g).map(([kk,l])=>`<option value="${kk}" ${kk===k?'selected':''}>${esc(l)}</option>`).join('')}</optgroup>`).join('')}</select>
   <div class="hint">${esc(lab)}${PENDING.has(k)?' — ◌ prévu, pas encore vérifié par l\'appli':''}</div>
   <div class="admGrp">Postes qui l'ont par défaut (${postes.length})</div><div class="admChips">${postes.length?postes.map(p=>`<button class="pchip on" data-ppgo="${p[0]}" style="--c:${FAM_COLOR[p[2]]}" title="régler ce poste">${esc(p[1])}</button>`).join(''):'<span class="dim">aucun poste</span>'}</div>
   <div class="admGrp">Personnes qui l'ont (${have.length})</div>${have.length?have.map(line).join(''):'<div class="dim" style="padding:4px 2px">personne</div>'}
   <div class="admGrp">Ne l'ont pas (${not.length})</div>${not.length?not.map(line).join(''):'<div class="dim" style="padding:4px 2px">personne</div>'}</div>`;}
/* ----- liaisons ----- */
function rowOf(id){return admRows.find(r=>String(r.id)===String(id));}
function bind(el,me){const rerender=async()=>{const {rows,server}=await listAccounts();admRows=rows;admServer=server;paint();};
  el.querySelectorAll('[data-av]').forEach(b=>b.onclick=()=>{AD.view=b.dataset.av;paint();});
  const q=el.querySelector('#admQ');if(q){q.oninput=()=>{AD.q=q.value;const rows=filtered();el.querySelector('#admList').innerHTML=listHTML(rows,me);el.querySelector('#admCountN').textContent=countTxt(rows.length);bindList(el,me,rerender);};}
  [['admFam','fam'],['admPoste','poste'],['admType','type'],['admEtat','etat'],['admSort','sort']].forEach(([id,k])=>{const s=el.querySelector('#'+id);if(s)s.onchange=()=>{AD[k]=s.value;if(k==='fam'&&AD.poste&&POSTE_FAM[AD.poste]!==AD.fam)AD.poste='';paint();};});
  const bn=el.querySelector('#admNew');if(bn)bn.onclick=()=>admNewModal(rerender);const bb=el.querySelector('#admBulk');if(bb)bb.onclick=()=>admBulkModal(rerender);
  bindList(el,me,rerender);
  el.querySelectorAll('[data-pv]').forEach(b=>b.onclick=()=>{AD.pv=b.dataset.pv;paint();});
  el.querySelectorAll('[data-pp]').forEach(b=>b.onclick=()=>{AD.pp=b.dataset.pp;paint();});
  el.querySelectorAll('[data-ppgo]').forEach(b=>b.onclick=()=>{AD.pp=b.dataset.ppgo;AD.view='postes';AD.pv='list';paint();});
  el.querySelectorAll('[data-pr]').forEach(cb=>cb.onchange=async()=>{const k=cb.dataset.pr;const r=await setPosteRight(AD.pp,k,cb.checked);if(r.error){A.toast('Refusé : '+r.error);cb.checked=!cb.checked;return;}const lab=(PERMS.find(p=>p[0]===k)||[])[1];A.toast(`${POSTES[AD.pp]} : « ${lab} » → ${cb.checked?'autorisé':'retiré'} (${r.where})`);await syncRoles(admRows);paint();});
  const pc=el.querySelector('[data-pcred]');if(pc)pc.onchange=async()=>{const r=await setPosteCredits(AD.pp,pc.value);if(r.error){A.toast('Refusé : '+r.error);return;}A.toast(POSTES[AD.pp]+' : '+posteCredits(AD.pp)+' crédit'+(posteCredits(AD.pp)>1?'s':'')+' d\'annulation par semaine ('+r.where+')');paint();};
  el.querySelectorAll('[data-mxc]').forEach(td=>td.onclick=()=>{const p=td.dataset.mxc;A.openModal(`<h3 style="margin-top:0">Crédits d'annulation — ${esc(POSTES[p])}</h3><div class="hint" style="margin-top:0">Nombre d'annulations (étape, soudure ajoutée) qu'une personne de ce poste peut faire seule par semaine glissante. Au-delà : demande au chef. Défaut SCR : <b>${defaultCredits(p)}</b>.</div><input type="number" min="0" max="99" class="f" id="mc-n" value="${posteCredits(p)}" style="margin:8px 0;text-align:center;font-size:18px"><div class="actions"><button class="btn primary block" id="mc-ok">Enregistrer</button><button class="btn block" id="mc-def">Défaut SCR (${defaultCredits(p)})</button><button class="btn block" data-close>Annuler</button></div>`);
    const md=document.getElementById('modal');md.querySelector('#mc-ok').onclick=async()=>{const r=await setPosteCredits(p,md.querySelector('#mc-n').value);A.closeModal();A.toast(r.error?('Refusé : '+r.error):(POSTES[p]+' : '+posteCredits(p)+' crédits / semaine'));paint();};md.querySelector('#mc-def').onclick=async()=>{const r=await setPosteCredits(p,null);A.closeModal();A.toast(r.error?('Refusé : '+r.error):(POSTES[p]+' : défaut SCR'));paint();};});
  const pr=el.querySelector('#admPReset');if(pr)pr.onclick=async()=>{const r=await resetPoste(AD.pp);A.toast(r.error?('Refusé : '+r.error):POSTES[AD.pp]+' : défauts SCR rétablis');await syncRoles(admRows);paint();};
  el.querySelectorAll('[data-mx]').forEach(td=>td.onclick=async()=>{const [p,k]=td.dataset.mx.split('|');const on=!posteRights(p)[k];const r=await setPosteRight(p,k,on);if(r.error){A.toast('Refusé : '+r.error);return;}A.toast(`${POSTES[p]} : « ${(PERMS.find(x=>x[0]===k)||[])[1]} » → ${on?'autorisé':'retiré'}`);await syncRoles(admRows);const wrap=el.querySelector('.admMxWrap');const sl=wrap?wrap.scrollLeft:0,st=wrap?wrap.scrollTop:0;paint();const w2=el.querySelector('.admMxWrap');if(w2){w2.scrollLeft=sl;w2.scrollTop=st;}});
  const who=el.querySelector('#admWho');if(who)who.onchange=()=>{AD.who=who.value;paint();};}
function bindList(el,me,rerender){
  el.querySelectorAll('[data-adm]').forEach(x=>x.onchange=async()=>{const r=rowOf(x.dataset.id);if(!r)return;const k=x.dataset.adm;const v=x.type==='checkbox'?x.checked:x.value;
    if(k==='active'&&!v&&me&&r.id===me.id){x.checked=true;A.toast('Tu ne peux pas désactiver ton propre compte.');return;}
    const patch={[k]:v};if(k==='poste'&&v==='visiteur'&&r.type==='salarie')patch.type='visiteur';
    const res=await updateAccount(r,patch);A.toast(res.error?('Refusé : '+res.error):(r.name+' : '+(k==='poste'?posteLabel(v):k==='type'?TYPES[v]:v?'actif':'inactif')+' ('+res.where+')'));rerender();});
  el.querySelectorAll('[data-admrights]').forEach(b=>b.onclick=()=>{const r=rowOf(b.dataset.admrights);if(r)admRightsModal(r,rerender);});
  el.querySelectorAll('[data-admsites]').forEach(b=>b.onclick=()=>{const r=rowOf(b.dataset.admsites);if(r)admSitesModal(r,admMetas,rerender);});
  el.querySelectorAll('[data-admuninvite]').forEach(b=>b.onclick=()=>{const r=rowOf(b.dataset.admuninvite);if(!r)return;
    A.openModal(`<h3 style="margin-top:0">Retirer l'invitation</h3><p>${esc(r.name)} — ${esc(r.email)} ne pourra plus créer son accès (rien d'autre n'est touché ; tu peux la recréer plus tard).</p><div class="actions"><button class="btn primary block" id="ai-ok" style="background:#d03b3b;border-color:#d03b3b">Retirer l'invitation</button><button class="btn block" data-close>Annuler</button></div>`);
    document.getElementById('ai-ok').onclick=async()=>{const res=await removeInvite(r);A.closeModal();A.toast(res.error?('Refusé : '+res.error):('Invitation retirée — '+r.email));rerender();};});
  el.querySelectorAll('[data-admflag]').forEach(b=>b.onclick=()=>{const r=rowOf(b.dataset.admflag);if(!r)return;if(r.invite){A.toast('★ possible quand '+r.name+' se sera connecté une première fois.');return;}
    if(r.admin&&((me&&r.id===me.id)||ADMIN_SEED.includes(r.email))){A.toast(me&&r.id===me.id?'Tu ne peux pas te retirer tes propres pouvoirs.':'Cette adresse est administratrice d\'office.');return;}
    A.openModal(`<h3 style="margin-top:0">${r.admin?'Retirer':'Donner'} les pouvoirs d'administrateur</h3><p>${esc(r.name)} — ${esc(posteLabel(r.poste))}.</p><p>${r.admin?'Ses droits redeviendront ceux de son poste (et ses ajustements personnels).':'Un administrateur a <b>tous les droits</b>, voit cet onglet, crée les accès et règle les droits des postes et des personnes.'}</p><div class="actions"><button class="btn primary block" id="af-ok">${r.admin?'Retirer':'Donner'} les pouvoirs</button><button class="btn block" data-close>Annuler</button></div>`);
    document.getElementById('af-ok').onclick=async()=>{const res=await updateAccount(r,{admin:!r.admin});A.closeModal();A.toast(res.error?('Refusé : '+res.error):(r.name+(r.admin?' n\'est plus administrateur':' est administrateur')+' ('+res.where+')'));rerender();};});}
/* ----- modales ----- */
function admNewModal(done){A.openModal(`<h3 style="margin-top:0">Créer un accès</h3><div class="hint" style="margin-top:0">La personne se connecte ensuite avec cet e-mail et choisit son mot de passe. Ses droits suivent son poste et son type de compte.</div>
   <div style="display:grid;grid-template-columns:1fr 1fr;gap:6px;margin:8px 0"><div><label class="f">Prénom</label><input class="f" id="an-prenom"></div><div><label class="f">Nom</label><input class="f" id="an-nom"></div>
   <div style="grid-column:1/3"><label class="f">E-mail</label><input class="f" id="an-email" type="email" placeholder="prenom.nom@scr-soudure.fr (ou perso pour un intérimaire / visiteur)"></div>
   <div><label class="f">Poste</label><select class="f" id="an-poste">${posteOptions('soudeur')}</select></div>
   <div><label class="f">Type de compte</label><select class="f" id="an-type">${Object.entries(TYPES).map(([k,v])=>`<option value="${k}">${v}</option>`).join('')}</select></div></div>
   <div id="an-sites" style="display:none"><label class="f">Chantiers autorisés (intérimaire / visiteur)</label><div style="max-height:160px;overflow:auto;border:1px solid var(--line);border-radius:8px;padding:6px">${admMetas.length?admMetas.map(m=>`<label style="display:block;font-size:12.5px"><input type="checkbox" data-ansite="${esc(m.id)}"> ${esc(m.name)}</label>`).join(''):'<span class="hint">aucun chantier connu sur cet appareil</span>'}</div><div class="hint">Rien de coché = tous les chantiers.</div></div>
   <div id="an-err" style="color:#d03b3b;font-size:12.5px;margin-top:4px"></div>
   <div class="actions"><button class="btn primary block" id="an-ok">Créer l'accès</button><button class="btn block" data-close>Annuler</button></div>`);
  const m=document.getElementById('modal');const typeSel=m.querySelector('#an-type'),posteSel=m.querySelector('#an-poste');const sync2=()=>{m.querySelector('#an-sites').style.display=typeSel.value==='salarie'?'none':'';if(posteSel.value==='visiteur')typeSel.value='visiteur';};typeSel.onchange=sync2;posteSel.onchange=sync2;
  m.querySelector('#an-ok').onclick=async()=>{const o={prenom:m.querySelector('#an-prenom').value.trim(),nom:m.querySelector('#an-nom').value.trim(),email:m.querySelector('#an-email').value.trim(),poste:posteSel.value,type:typeSel.value,sites:[...m.querySelectorAll('[data-ansite]:checked')].map(x=>x.dataset.ansite)};
    const r=await createAccess(o);if(r.error){m.querySelector('#an-err').textContent=r.error;return;}A.closeModal();A.toast('Accès créé ('+r.where+') — '+o.prenom+' '+o.nom+' se connecte avec '+o.email);done&&done();};}
// collage d'une liste (Excel, mail…) : une personne par ligne — nom, prénom, e-mail, poste dans n'importe quel ordre, séparés par tabulation / ; / ,
export function matchPoste(n){n=norm(n);if(!n)return null;let best=null,bl=0;POSTES_DEF.forEach(p=>{p[4].forEach(a=>{if((n===a||(' '+n+' ').includes(' '+a+' '))&&a.length>bl){best=p[0];bl=a.length;}});});return best;}
const isEmail=w=>/^[^\s@;,]+@[^\s@;,]+\.[^\s@;,]+$/.test(w);
export function parsePeople(text){const out=[];String(text||'').split(/\r?\n/).forEach(raw=>{const line=raw.trim();if(!line)return;
    const sep=line.includes('\t')?'\t':line.includes(';')?';':line.includes(',')?',':null;
    let words=(sep?line.split(sep):[line]).flatMap(c=>c.split(/\s+/)).map(w=>w.trim()).filter(Boolean);
    let email='',poste='',type='salarie';words=words.filter(w=>{if(!email&&isEmail(w)){email=w.toLowerCase();return false;}return true;});
    // jetons normalisés (un mot d'origine peut en donner plusieurs : « d'exploitation » → « d », « exploitation ») ; on consomme par mot d'origine
    const toks=[];words.forEach((w,wi)=>norm(w).split(' ').filter(Boolean).forEach(n=>toks.push({n,wi})));const used=new Set();
    toks.forEach(t=>{if(/^(interimaire|interim)$/.test(t.n)){type='interim';used.add(t.wi);}});
    let best=null;POSTES_DEF.forEach(p=>p[4].forEach(a=>{const aw=a.split(' ');for(let i=0;i+aw.length<=toks.length;i++){if(aw.every((x,j)=>toks[i+j].n===x&&!used.has(toks[i+j].wi))){if(!best||a.length>best.len)best={p:p[0],i,n:aw.length,len:a.length};}}}));
    if(best){poste=best.p;for(let j=0;j<best.n;j++)used.add(toks[best.i+j].wi);}
    const rest=words.filter((_,i)=>!used.has(i));let prenom='',nom='';
    if(rest.length){const caps=rest.filter(w=>w.length>1&&w===w.toUpperCase()&&/[A-ZÀ-Ý]/.test(w));if(caps.length&&caps.length<rest.length){nom=caps.join(' ');prenom=rest.filter(w=>!caps.includes(w)).join(' ');}else{prenom=rest[0];nom=rest.slice(1).join(' ');}}
    if(poste==='visiteur')type='visiteur';
    out.push({prenom,nom,email,poste,type,raw:line,ok:!!email&&!!(prenom||nom)&&!!poste});});return out;}
function admBulkModal(done){A.openModal(`<h3 style="margin-top:0">Plusieurs accès d'un coup</h3><div class="hint" style="margin-top:0">Colle ta liste (depuis Excel, un mail…) : <b>une personne par ligne</b> — prénom, nom, e-mail, poste, dans n'importe quel ordre, séparés par tabulation, « ; » ou « , ». Écris « intérimaire » ou « visiteur » sur la ligne pour ces types de compte. Le poste est reconnu d'après son intitulé ; tu corriges ce qui manque dans l'aperçu.</div>
   <textarea class="f" id="ab-txt" rows="7" placeholder="Karim BENALI ; karim.benali@scr-soudure.fr ; soudeur&#10;Julie MARTIN ; julie.martin@scr-soudure.fr ; assistante RH&#10;Marc DUPONT ; marc.dupont@gmail.com ; manchonneur ; intérimaire"></textarea>
   <div class="actions" style="margin-top:6px"><button class="btn primary block" id="ab-parse">Analyser la liste</button><button class="btn block" data-close>Annuler</button></div><div id="ab-prev"></div>`);
  const m=document.getElementById('modal');let people=[];
  const prev=()=>{const box=m.querySelector('#ab-prev');if(!people.length){box.innerHTML='<div class="hint">Rien de lisible.</div>';return;}
    const known=admRows.map(r=>r.email);box.innerHTML=`<div class="admGrp">Aperçu — ${people.length} ligne${people.length>1?'s':''}</div><div class="abList">${people.map((p,i)=>{const dup=known.includes(p.email);return `<div class="abRow ${p.email&&(p.prenom||p.nom)?'':'ko'}"><div class="abCells"><input class="f" data-ab="prenom" data-i="${i}" value="${esc(p.prenom)}" placeholder="Prénom"><input class="f" data-ab="nom" data-i="${i}" value="${esc(p.nom)}" placeholder="NOM"><input class="f" data-ab="email" data-i="${i}" value="${esc(p.email)}" placeholder="e-mail"><select class="f" data-ab="poste" data-i="${i}"><option value="">poste ?</option>${posteOptions(p.poste)}</select><select class="f" data-ab="type" data-i="${i}">${Object.entries(TYPES).map(([k,v])=>`<option value="${k}" ${p.type===k?'selected':''}>${v}</option>`).join('')}</select></div>${dup?'<div class="dim" style="font-size:11px">déjà un compte avec cet e-mail : il sera mis à jour</div>':!p.email?'<div style="color:#d03b3b;font-size:11px">e-mail manquant</div>':!p.poste?'<div style="color:#b8560f;font-size:11px">poste non reconnu — choisis-le</div>':''}</div>`;}).join('')}</div>
     <div id="ab-err" style="color:#d03b3b;font-size:12.5px;margin-top:4px"></div><div class="actions" style="margin-top:6px"><button class="btn primary block" id="ab-ok">Créer ${people.length} accès</button><button class="btn block" data-close>Annuler</button></div>`;
    box.querySelectorAll('[data-ab]').forEach(x=>x.onchange=()=>{people[+x.dataset.i][x.dataset.ab]=x.value.trim();});
    box.querySelector('#ab-ok').onclick=async()=>{const btn=box.querySelector('#ab-ok');if(btn.disabled)return;btn.disabled=true;const errs=[];let n=0,i=0;for(const p of people){i++;btn.textContent=`Création… ${i} / ${people.length}`;if(!p.email||!(p.prenom||p.nom)||!p.poste){errs.push((p.email||p.raw.slice(0,30))+' : '+(!p.email?'e-mail manquant':!p.poste?'poste manquant':'nom manquant'));continue;}const r=await createAccess(p);if(r.error)errs.push(p.email+' : '+r.error);else n++;}btn.disabled=false;btn.textContent='Créer '+people.length+' accès'; /* 120 personnes = 120 appels serveur : on voit avancer, pas de double clic */
      if(errs.length){box.querySelector('#ab-err').innerHTML=`<b>${n} créé${n>1?'s':''}</b>, ${errs.length} refusé${errs.length>1?'s':''} :<br>${errs.map(esc).join('<br>')}`;done&&done();return;}A.closeModal();A.toast(n+' accès créé'+(n>1?'s':''));done&&done();};};
  m.querySelector('#ab-parse').onclick=()=>{people=parsePeople(m.querySelector('#ab-txt').value);prev();};}
function admRightsModal(acc,done){const eff=effectiveRights(acc);const base=posteRights(acc.poste);const cap=TYPE_CAP[acc.type]||null;const ov=Object.keys(acc.rights||{}).length;
  A.openModal(`<h3 style="margin-top:0">🔑 Droits — ${esc(acc.name)}</h3><div class="hint" style="margin-top:0">${esc(posteLabel(acc.poste))} · ${esc(TYPES[acc.type]||acc.type)}${acc.admin?' · <b>★ administrateur : tout, sans ajustement.</b>':'. Coché = autorisé. Une case différente de ce que donne son poste est un <b>ajustement personnel</b> (il reste même si le poste change).'}${ov?' <b>'+ov+' ajustement'+(ov>1?'s':'')+'</b> en place.':''}</div>
   <div style="max-height:60vh;overflow:auto">${GROUPS.map(g=>`<div class="admGrp">${esc(g)}</div>`+PERMS.filter(x=>x[2]===g).map(([k,lab])=>{const o=rightOrigin(acc,k);return `<label class="admPerm"><input type="checkbox" data-rk="${k}" ${eff[k]?'checked':''} ${acc.admin?'disabled':''}><span>${esc(lab)}${PENDING.has(k)?' <span class="dim" title="prévu">◌</span>':''}${o==='perso+'?' '+chip('ajout perso','#e6f6ea','#1d7a3a'):o==='perso-'?' '+chip('retiré perso','#fdecec','#a01212'):''}<br><span class="dim" style="font-size:10.5px">${acc.admin?'administrateur':'son poste : '+(base[k]?'oui':'non')+(cap&&cap[k]===false?' · hors plafond '+esc(TYPES[acc.type]):'')}</span></span></label>`;}).join('')).join('')}</div>
   ${acc.admin?'':`<div class="admGrp">Crédits d'annulation par semaine</div><div class="admPerm" style="align-items:center"><input type="number" min="0" max="99" class="f" id="ar-cred" value="${typeof (acc.rights||{})['undo.credits']==='number'?acc.rights['undo.credits']:''}" placeholder="${effectiveCredits(acc)===Infinity?'∞':effectiveCredits(acc)}" style="width:64px;padding:4px 6px;text-align:center"><span>Vide = ${esc(creditsOrigin({...acc,rights:{...(acc.rights||{}),'undo.credits':undefined}}))}${acc.type==='interim'?' (0)':effectiveRights(acc)['weld.admin']?'':' ('+posteCredits(acc.poste)+')'}. Un nombre = ajustement personnel, même pour un intérimaire.</span></div>`}
   <div class="actions"><button class="btn primary block" id="ar-ok" ${acc.admin?'disabled':''}>Enregistrer</button><button class="btn block" id="ar-reset" ${acc.admin?'disabled':''}>Revenir aux droits du poste</button><button class="btn block" data-close>Annuler</button></div>`);
  const m=document.getElementById('modal');
  m.querySelector('#ar-ok').onclick=async()=>{const rights={};m.querySelectorAll('[data-rk]').forEach(cb=>{const k=cb.dataset.rk;const def=!!base[k]&&!(cap&&cap[k]===false);if(cb.checked!==def)rights[k]=cb.checked;});const ci=m.querySelector('#ar-cred');if(ci&&ci.value.trim()!==''&&isFinite(+ci.value))rights['undo.credits']=Math.max(0,Math.round(+ci.value));const r=await updateAccount(acc,{rights});A.closeModal();A.toast(r.error?('Refusé : '+r.error):'Droits enregistrés ('+r.where+')');done&&done();};
  m.querySelector('#ar-reset').onclick=async()=>{const r=await updateAccount(acc,{rights:{}});A.closeModal();A.toast(r.error?('Refusé : '+r.error):'Droits du poste rétablis');done&&done();};}
function admSitesModal(acc,metas,done){A.openModal(`<h3 style="margin-top:0">🏗 Chantiers — ${esc(acc.name)}</h3><div class="hint" style="margin-top:0">Rien de coché = tous les chantiers (normal pour un salarié). Pour un intérimaire ou un visiteur, coche seulement ses chantiers.</div>
   <div style="max-height:50vh;overflow:auto;border:1px solid var(--line);border-radius:8px;padding:6px;margin:8px 0">${metas.length?metas.map(m=>`<label style="display:block;font-size:12.5px"><input type="checkbox" data-as="${esc(m.id)}" ${acc.sites&&acc.sites.includes(m.id)?'checked':''}> ${esc(m.name)}</label>`).join(''):'<span class="hint">aucun chantier connu sur cet appareil</span>'}</div>
   <div class="actions"><button class="btn primary block" id="as-ok">Enregistrer</button><button class="btn block" data-close>Annuler</button></div>`);
  const m=document.getElementById('modal');m.querySelector('#as-ok').onclick=async()=>{const sites=[...m.querySelectorAll('[data-as]:checked')].map(x=>x.dataset.as);const r=await updateAccount(acc,{sites:sites.length?sites:null});A.closeModal();A.toast(r.error?('Refusé : '+r.error):'Chantiers enregistrés');done&&done();};}
