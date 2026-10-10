// espace.js — « MON ESPACE » et « ENTREPRISE » (hors chantier) : import de la maquette maquette_equipe.html validée par Ethan (09/10/2026), branchée sur les vraies données.
// Sections reprises telles quelles de la maquette (gabarits de chaînes, classes eq-, logique métier) ; ce qui change :
//   · DATA est RECONSTRUIT à chaque rendu depuis l'appli (comptes et droits d'acces.js, chantiers connus, fiche « people » du serveur, pointages) — plus de fausses données ;
//   · les droits sont ceux de l'appli (acces.js), l'administrateur ne pointe pas pour autant ;
//   · tout ce qui se modifie est ENREGISTRÉ (sql/espace_v1.sql) : avatar et contact d'urgence → table people (par partie), pointages → table pointages ;
//     hors connexion, tout est gardé dans l'appareil (kv) et renvoyé à la reconnexion ;
//   · les sources pas encore branchées (tâches, binômes, stock et engins du chantier, planning, météo, productions, demandes) sont à null → la carte ne s'affiche pas,
//     au lieu d'inventer des données (lots suivants : planning + météo, productions, validation en deux temps, habilitations RH).
// Kit avatar : src/avatar.js (repris tel quel). Enveloppe avModele() : pas de médaille d'ancienneté hors travail (règle SCR, à reporter dans le kit).
import {avatarModele,avatarSVG,avatarMedaillon,EditorLogic} from './avatar.js';
import {POSTES_DEF,FAM_COLOR,POSTE_FAM} from './acces.js';
import {docsFor,docsTodo,docsListHTML,docOpen,docsAdminHTML,docAdminOpen,docNewOpen,docsLateHTML,KINDS as DOC_KINDS} from './docs.js'; // documents d'entreprise à lire et signer (nuit 09→10/10)
import {qhsTodo,qhsMyKey,qhsRecapHTML,qhsTriggerOpen,qhsRuns} from './qhs.js'; // quart d'heure sécurité (10/10)
import {controlesOf,controleNC,controleReportHTML} from './accueil.js'; // contrôles chantier : suivi direction (10/10)
import {affView,affAct,affInput,affAll,affState} from './affaires.js'; // volet commerce (nuit 09→10/10)
import {flotteView,flotteAct,flotteInput,vehAll,vehAlertes,vehDe,monVehiculeHTML} from './flotte.js'; // parc véhicules (nuit 09→10/10)
import {cmdView,cmdAct,cmdInput,dbListHTML,dbTodo,dbDe,cmdAll,cmdState} from './commandes.js'; // bons de commande & débours (nuit 09→10/10)
import {GD_CAS,GD_RAPPELS,gdCase,gdSemaine,kmRoute,minutesRoute,anciennete} from './rh.js'; // grands déplacements, ancienneté
import {distLL} from './geo.js';
let A=null;               // API fournie par app.js : state, accounts(), sites(), rights(acc), current(), sync, kv, toast, openSite, userName
let ROOT=null;            // conteneur du rendu (#homeBody)
let DATA=null;            // données du rendu courant (voir buildData)
let PEOPLE={};            // clé personne (e-mail) → fiche people {avatar, urgence, tel, entree, contrat, habs, docs, compteurs}
let POINTAGES=[];         // lignes {p, d, site, events, status, val, corr}
let PENDING=[];           // écritures en attente de réseau [{kind:'people',key,part,value}|{kind:'pt',row}]
let LOADED=false;
let ACC_CACHE=null;      // dernière liste de comptes connue (kv), pour l'annuaire hors connexion
const FAM_LABEL={direction:'Direction',encadrement:'Encadrement',terrain:'Terrain',support:'Support',exterieur:'Extérieur'};
const PICTO={gerant:'🔑',dir_adjointe:'🔑',dir_technique:'📐',resp_exploitation:'⭐',resp_operations:'⭐',conducteur:'📋',chef:'🦺',soudeur:'⚡',tuyauteur:'🔧',manchonneur:'🧪',activites_specifiques:'🧰',chauffeur_engin:'🚜',autre:'🧰',resp_rh:'🗂️',assist_rh:'🗂️',charge_dev_rh:'🗂️',resp_admin_fin:'🧾',resp_commercial:'🤝',charge_affaires:'🤝',resp_flotte:'🚚',referent_magasin:'📦',visiteur:'👤'};
const POSTES_ESP=Object.fromEntries(POSTES_DEF.map(([k,label,fam])=>[k,{label,fam,picto:PICTO[k]||'👤'}])); // déjà rangé par famille : direction, encadrement, terrain, support, extérieur
const FAMILLES_ESP=Object.fromEntries(Object.keys(FAM_LABEL).map(k=>[k,{label:FAM_LABEL[k],couleur:FAM_COLOR[k]}]));
// poste de l'appli (22) → poste du kit (8). « Activités spécifiques RCU » et « Aide de chantier » : tenue terrain sans récompense (chef) — hypothèse à confirmer. Visiteur : pas d'avatar.
const AVATAR_POSTES={soudeur:'soudeur',tuyauteur:'tuyauteur',manchonneur:'manchonneur',chauffeur_engin:'chauffeur',chef:'chef',activites_specifiques:'chef',autre:'chef',conducteur:'conducteur',
  resp_exploitation:'responsable',resp_operations:'responsable',gerant:'responsable',dir_adjointe:'responsable',dir_technique:'responsable',
  resp_rh:'bureau',assist_rh:'bureau',charge_dev_rh:'bureau',resp_admin_fin:'bureau',resp_commercial:'bureau',charge_affaires:'bureau',resp_flotte:'bureau',referent_magasin:'bureau'};
const HAB_TYPES={qs141:{label:'QS 141 TIG'},qs111:{label:'QS 111 électrode'},r482:{label:'CACES R482 engins'},r489:{label:'CACES R489 chariot'},r486:{label:'CACES R486 nacelle'},aipr:{label:'AIPR'},helec:{label:'Habilitation électrique'},sst:{label:'SST'},hauteur:{label:'Travail en hauteur'},permis:{label:'Permis B'},vm:{label:'Visite médicale'},btp:{label:'Carte BTP'}};
const HAB_REQ={soudeur:['qs141','aipr','sst','hauteur','vm','btp'],tuyauteur:['aipr','hauteur','vm','btp'],manchonneur:['aipr','vm','btp'],chauffeur_engin:['r482','aipr','vm','btp'],chef:['aipr','sst','helec','vm','btp'],conducteur:['aipr','vm'],_defaut:['vm']};
const CONFIG={recompenses:true,seuilEcheance:60,seuilChef:30};
// clé « personne » : e-mail en minuscules (stable entre invitation et compte), sinon l'identifiant du compte (personnages de démo hors connexion)
export const personKey=acc=>acc?((acc.email||'').toLowerCase()||String(acc.id||'')):'';
const splitName=a=>{if(a.prenom||a.nom)return [a.prenom||'',a.nom||''];const t=String(a.name||a.email||'?').trim().split(/\s+/);return [t[0]||'?',t.slice(1).join(' ')];};
const S={tab:'moi',sub:'moi',fiche:null,avVue:null,planSem:0,planJour:null,plWeek:0,plSel:null,plSect:undefined,plEnc:false,plEdit:null,plAutres:false,per:{mode:'sem',k:0,m:''},semOpen:{},entVue:'travail',valMode:'jour',valJour:null,valPers:null,corr:null,edit:false,q:'',fFam:'',fSite:'',habF:'traiter',open:{}};
export function initEspace(api){A=api;}
/* ── DATA : l'état de l'appli, dans la forme attendue par les gabarits de la maquette ── */
function buildData(){
  const now=new Date();const today=TODAY();const nowHM=pad(now.getHours())+':'+pad(now.getMinutes()); /* TODAY() : date du jour, ou date figée par un test */
  const live=A.accounts();if(live&&live.length&&live!==ACC_CACHE){ACC_CACHE=live;kvSet('trace:accountsCache',live.map(a=>Object.assign({},a)));} /* liste des comptes gardée pour le hors-connexion (annuaire) */
  const accs=(live||ACC_CACHE||(A.state.cloudUser?[]:A.personas())).filter(a=>a&&a.poste!=='visiteur'&&(a.active!==false||a.invite));
  const cur=A.current();if(cur&&cur.poste!=='visiteur'&&!accs.some(a=>personKey(a)===personKey(cur)))accs.push(cur); /* la personne connectée est toujours là, même avant la liste des comptes */
  const personnes=accs.map(a=>{const key=personKey(a);const x=PEOPLE[key]||{};const [prenom,nom]=splitName(a);
    return {id:key,acc:a.id,prenom,nom,email:a.email||'',tel:x.tel||'',poste:POSTES_ESP[a.poste]?a.poste:'autre',type:a.type||'salarie',admin:!!a.admin,active:a.active!==false,invite:!!a.invite,sites:a.sites||null,rights:a.rights||{},
      entree:x.entree||null,contrat:x.contrat||null,urgence:x.urgence||null,secteur:x.secteur||null,adresse:x.adresse||null,emploi:x.emploi||null,_acc:a};});
  const seen=new Set();const uniques=personnes.filter(p=>{if(seen.has(p.id))return false;seen.add(p.id);return true;});
  const chantiers=(A.sites()||[]).map(c=>({id:c.id,nom:c.name||c.id,ville:c.ville||'',soudures:+c.nw||0,faites:c.faites!=null?+c.faites:undefined,chef:c.chef||null,conducteur:c.conducteur||null,secteur:c.secteur||null,ll:c.ll||null})).concat([{id:'siege',nom:'Siège',ville:'Bureau',bureau:true}]);
  const affectations={};uniques.forEach(p=>{if(p.type==='interim'&&Array.isArray(p.sites)&&p.sites.length&&chantiers.some(c=>c.id===p.sites[0]))affectations[p.id]=p.sites[0];});
  const habilitations=[];const avatars={},avatarCompteurs={},documents={};
  uniques.forEach(p=>{const x=PEOPLE[p.id]||{};(x.habs||[]).forEach(h=>habilitations.push(Object.assign({p:p.id},h)));avatars[p.id]=x.avatar||{};avatarCompteurs[p.id]=x.compteurs||{};documents[p.id]=x.docs||[];});
  return {today,now:nowHM,config:CONFIG,familles:FAMILLES_ESP,postes:POSTES_ESP,chantiers,personnes:uniques,inconnus:{},affectations,planning:planningAff(),meteo:meteoData(),
    habTypes:HAB_TYPES,habRequises:HAB_REQ,habilitations,pointages:POINTAGES,demandes:null,taches:null,stock:null,engins:null,agenda:null,equipes:null,productions:prodFromNets(uniques),
    avatarPostes:AVATAR_POSTES,avatars,avatarCompteurs,documents};
}
/* ── Enregistrement : fiche personne par partie, pointages ; hors connexion → en attente ── */
async function kvSet(k,v){try{await A.kv.set(k,v);}catch(e){}}
async function flushPending(){if(!PENDING.length||!A.state.cloudUser)return;const rest=[];const list=PENDING.slice();
  for(let i=0;i<list.length;i++){const w=list[i];let ok=false,stop=false;try{if(w.kind==='people'){if(!w.key.includes('@')){ok=true;}else{const r=await A.sync.setPeoplePart(w.key,w.part,w.value);ok=!!r.ok;if(!ok&&r.missing){A.toast('Serveur : passe le SQL sql/espace_v1.sql (fiche personne)');stop=true;}}}
      else if(w.kind==='pt'){const r=await A.sync.setPointage(w.row);ok=!!r.ok;}
      else if(w.kind==='plan'){const r=await A.sync.setPlanning(w.week,{aff:w.patch});ok=!!r.ok;if(!ok&&r.missing){A.toast('Serveur : passe le SQL sql/espace_v2.sql (planning)');stop=true;}if(ok&&r.row&&r.row.data&&!list.some(x=>x!==w&&x.kind==='plan'&&x.week===w.week)){PLANNING[w.week]={aff:r.row.data.aff||{}};kvSet('trace:planning',PLANNING);}}}catch(e){console.warn(e);}
    if(stop){rest.push(...list.slice(i));break;} /* fonction serveur absente : tout le reste attend, rien n'est perdu */
    if(!ok)rest.push(w);}
  PENDING=rest.concat(PENDING.filter(w=>!list.includes(w))); /* + ce qui a été ajouté pendant l'envoi */kvSet('trace:espacePending',PENDING);}
function savePeoplePart(key,part,value){const x=PEOPLE[key]||(PEOPLE[key]={});x[part]=value;kvSet('trace:people',PEOPLE);
  if(!String(key).includes('@'))return; /* personnage de démo : appareil seulement */
  PENDING=PENDING.filter(w=>!(w.kind==='people'&&w.key===key&&w.part===part));PENDING.push({kind:'people',key,part,value});kvSet('trace:espacePending',PENDING);
  clearTimeout(flushT);flushT=setTimeout(()=>flushPending().catch(e=>console.warn(e)),700);}
let flushT=null;
function savePointage(row){const i=POINTAGES.findIndex(x=>x.p===row.p&&x.d===row.d);if(i>=0)POINTAGES[i]=row;else POINTAGES.push(row);kvSet('trace:pointages',POINTAGES);
  if(!String(row.p).includes('@'))return;const clean={p:row.p,d:row.d,site:row.site||null,events:row.events||[],status:row.status||'declare',val:row.val||[],corr:row.corr||null};
  PENDING=PENDING.filter(w=>!(w.kind==='pt'&&w.row.p===row.p&&w.row.d===row.d));PENDING.push({kind:'pt',row:clean});kvSet('trace:espacePending',PENDING);
  clearTimeout(flushT);flushT=setTimeout(()=>flushPending().catch(e=>console.warn(e)),700);}
// chargement : cache de l'appareil, puis serveur (si connecté) ; appelé à la connexion et à l'ouverture de l'onglet
// un seul chargement à la fois ; un appel pendant un chargement en relance un à la fin (connexion arrivée entre-temps)
let loadP=null,loadAgain=false;
export function espaceLoad(){if(loadP){loadAgain=true;return loadP;}loadP=espaceLoad_().catch(e=>console.warn(e)).finally(()=>{loadP=null;if(loadAgain){loadAgain=false;espaceLoad();}});return loadP;}
async function espaceLoad_(){
  try{const c=await A.kv.get('trace:people');if(c&&typeof c==='object')PEOPLE=c;}catch(e){}
  try{const c=await A.kv.get('trace:accountsCache');if(Array.isArray(c)&&c.length&&!ACC_CACHE)ACC_CACHE=c;}catch(e){}
  try{const c=await A.kv.get('trace:pointages');if(Array.isArray(c))POINTAGES=c;}catch(e){}
  try{const c=await A.kv.get('trace:planning');if(c&&typeof c==='object')PLANNING=c;}catch(e){}
  try{const c=await A.kv.get('trace:espacePending');if(Array.isArray(c))PENDING=c;}catch(e){}
  try{const c=await A.kv.get('trace:meteo');if(c&&typeof c==='object')METEO_STORE=c;}catch(e){}
  try{const c=await A.kv.get('trace:geocode');if(c&&typeof c==='object')GEOCODE=c;}catch(e){}
  if(A.state.cloudUser){
    const rows=await A.sync.listPeople();
    if(rows){rows.forEach(r=>{const loc=PEOPLE[r.key]||{};const srv=r.data||{};const pend=PENDING.filter(w=>w.kind==='people'&&w.key===r.key).map(w=>w.part);const merged=Object.assign({},loc,srv);pend.forEach(k=>{merged[k]=loc[k];}); /* une écriture en attente ici garde la main */PEOPLE[r.key]=merged;});kvSet('trace:people',PEOPLE);}
    const d0=new Date();d0.setDate(d0.getDate()-7*14);const pts=await A.sync.listPointages(iso(d0));
    if(pts){pts.forEach(r=>{const row={p:r.p,d:String(r.d).slice(0,10),site:r.site,events:r.events||[],status:r.status||'declare',val:r.val||[],corr:r.corr||null};if(PENDING.some(w=>w.kind==='pt'&&w.row.p===row.p&&w.row.d===row.d))return;const i=POINTAGES.findIndex(x=>x.p===row.p&&x.d===row.d);if(i>=0)POINTAGES[i]=row;else POINTAGES.push(row);});kvSet('trace:pointages',POINTAGES);}
    await loadWeeks([-2,-1,0,1,2].map(k=>weekKey(semaineDe(k)[0])));
    await loadPlanningRules();
    await flushPending();}
  LOADED=true;if(ROOT&&document.contains(ROOT))render();if(A.onLoaded)try{A.onLoaded();}catch(e){console.warn(e);}
  if(!DATA)DATA=buildData();meteoEnsure();}
export const espaceState=()=>({people:PEOPLE,pointages:POINTAGES,pending:PENDING,loaded:LOADED,S});
/* ── PRODUCTION RÉELLE (refonte ②, 09/10 nuit) : lue dans les fiches de soudure des chantiers chargés sur l'appareil — étape 1 faite par X = 1 soudure (DN du joint),
   étape 2 = DH / fils, étape 3 = 1 manchon (DN tube / enveloppe) ; par personne (nom signé = nom du compte) et par jour. Rien à saisir. ── */
const jointsOf=net=>{const out=[];const L=net&&net._lines?Object.values(net._lines):[];L.forEach(l=>{if(!l||!l.cond)return;['A','R'].forEach(c=>{const C=l.cond[c];if(!C||!Array.isArray(C.joints))return;C.joints.forEach(j=>{const e=Array.isArray(C.els)?C.els[j.idx]:null;out.push({j,l,dn:String(j.dn||(e&&e.dn)||l.dn||'?')});});});});return out;};
/* qui a fait quoi sur un joint : étapes (soudure / DH / manchon) puis, sans étape, les événements (soudee / controle / manchonnee) — même règle que jointOps de l'appli */
const jointOpsOf=(j,dn)=>{const out=[];const st=j.steps||{};[1,2,3].forEach(n=>{const s2=st[n];if(s2&&s2.done&&s2.at)out.push({k:n,at:String(s2.at),by:s2.by,dn});});(j.events||[]).forEach(ev=>{if(!ev||!ev.at)return;const at=ev.at instanceof Date?ev.at.toISOString():String(ev.at);if(ev.type==='soudee'&&!(st[1]&&st[1].done))out.push({k:1,at,by:ev.by,dn});else if(ev.type==='controle')out.push({k:2,at,by:ev.by,dn});else if(ev.type==='manchonnee'&&!(st[3]&&st[3].done))out.push({k:3,at,by:ev.by,dn});});return out;};
function prodFromNets(personnes){const out={};let nets=[];try{nets=(A.nets&&A.nets())||[];}catch(e){}if(!nets.length)return out;
  const byName={};personnes.forEach(p=>{[p._acc&&p._acc.name,p.prenom+' '+p.nom,p.prenom+' '+(p.nom||'').slice(0,1)+'.',p._acc&&p._acc.local&&String(p._acc.id||'').replace(/^l:/,'')].filter(Boolean).forEach(n=>{byName[String(n).trim().toLowerCase()]=p.id;});});
  const gaine=dn=>{try{const g=A.gaine?A.gaine(dn):null;return g?'/'+g:'';}catch(e){return '';}};
  nets.forEach(net=>jointsOf(net).forEach(({j,dn})=>jointOpsOf(j,dn).forEach(op=>{if(!op.by)return;const key=byName[String(op.by).trim().toLowerCase()];if(!key)return;const d=op.at.slice(0,10);const t=((out[key]=out[key]||{})[d]=out[key][d]||{});
    if(op.k===1){t.soudures=(t.soudures||0)+1;t.dn=t.dn||{};t.dn[dn]=(t.dn[dn]||0)+1;}else if(op.k===2){t.fils=(t.fils||0)+1;}else{t.retractions=(t.retractions||0)+1;t.mdn=t.mdn||{};const k=dn+gaine(dn);t.mdn[k]=(t.mdn[k]||0)+1;}})));
  return out;}
/* ── PLANNING DES ÉQUIPES (09/10 soir) : une ligne serveur par semaine ISO, fusion par personne ; les gars n'ouvrent que les chantiers de leur semaine et de la précédente ── */
export const SECTEURS={ouest:'Ouest',idf:'Île-de-France',sudouest:'Sud-Ouest',sudest:'Sud-Est'};
let PLANNING={};             // 'YYYY-Www' → {aff:{clé personne:{'yyyy-mm-dd':[idChantier,…]}}}
// règle d'accès des gars non planifiés : souple (tout voir, défaut : rien ne bloque tant que le planning n'est pas en place) ou strict (rien voir) — réglage d'entreprise, administrateur
let PL_RULES={strict:false};try{const r=JSON.parse(localStorage.getItem('trace:planningRules')||'null');if(r&&typeof r==='object')PL_RULES=Object.assign({strict:false},r);}catch(e){}
export const planningRules=()=>PL_RULES;
async function loadPlanningRules(){if(!A.state.cloudUser||!A.sync.getSetting)return;try{const v=await A.sync.getSetting('planning_rules');if(v&&typeof v==='object'){PL_RULES=Object.assign({strict:false},v);try{localStorage.setItem('trace:planningRules',JSON.stringify(PL_RULES));}catch(e){}}}catch(e){console.warn(e);}}
async function savePlanningRules(patch){const next=Object.assign({},PL_RULES,patch);if(A.state.cloudUser&&A.sync.setSetting){const err=await A.sync.setSetting('planning_rules',next);if(err){msg('Réglage non enregistré : '+(err.message||err));return false;}}PL_RULES=next;try{localStorage.setItem('trace:planningRules',JSON.stringify(PL_RULES));}catch(e){}return true;}
const WEEKS_LOADED=new Set();
export const weekKey=d=>{const x=D(d);x.setDate(x.getDate()+3-((x.getDay()+6)%7));return x.getFullYear()+'-W'+pad(numSemaine(d));}; // année ISO (celle du jeudi) + n° de semaine
function planningAff(){const out={};Object.keys(PLANNING).forEach(w=>{const aff=(PLANNING[w]||{}).aff||{};Object.keys(aff).forEach(k=>{out[k]=Object.assign(out[k]||{},aff[k]);});});return out;}
async function loadWeeks(ws){const need=ws.filter(w=>!WEEKS_LOADED.has(w));if(!need.length||!A.state.cloudUser)return;const rows=await A.sync.listPlanning(need);if(!rows)return;
  need.forEach(w=>WEEKS_LOADED.add(w));rows.forEach(r=>{if(PENDING.some(x=>x.kind==='plan'&&x.week===r.week))return;PLANNING[r.week]={aff:(r.data&&r.data.aff)||{}};});kvSet('trace:planning',PLANNING);}
let ensureT=null;function ensureWeeks(ws){const need=ws.filter(w=>!WEEKS_LOADED.has(w));if(!need.length||!A.state.cloudUser)return;clearTimeout(ensureT);ensureT=setTimeout(()=>loadWeeks(need).then(()=>{if(ROOT&&document.contains(ROOT))render();}).catch(e=>console.warn(e)),50);}
// patch = {clé personne : {date:[sites]} | null} : fusion locale par personne + envoi (fusion identique côté serveur)
function savePlanning(week,patch){const P=PLANNING[week]||(PLANNING[week]={aff:{}});Object.keys(patch).forEach(k=>{if(patch[k]===null)delete P.aff[k];else P.aff[k]=patch[k];});kvSet('trace:planning',PLANNING);
  const w=PENDING.find(x=>x.kind==='plan'&&x.week===week);if(w)Object.assign(w.patch,patch);else PENDING.push({kind:'plan',week,patch:Object.assign({},patch)});kvSet('trace:espacePending',PENDING);
  clearTimeout(flushT);flushT=setTimeout(()=>flushPending().catch(e=>console.warn(e)),700);}
// chantiers ouverts à un compte : null = tous (encadrement, bureau, direction, administrateur, ou personne pas encore planifiée) ; sinon l'ensemble des chantiers de sa semaine et de la précédente
export function espacePlannedSites(acc){if(!acc||acc.admin||acc.active===false||acc.type==='visiteur')return null;const fam=POSTE_FAM[acc.poste];if(!(fam==='terrain'||acc.poste==='chef'))return null;
  const aff=planningAff()[personKey(acc)]||{};const set=new Set();semaineDe(0).concat(semaineDe(-1)).forEach(d=>(aff[d]||[]).forEach(id=>set.add(id)));if(set.size)return set;
  return PL_RULES.strict?set:null; /* pas planifié ces deux semaines : règle souple = tout voir, stricte = rien */}
export const espacePlanning=()=>PLANNING;
/* ── MÉTÉO PAR CHANTIER (09/10 soir) : Open-Meteo (gratuit, sans clé), prévisions à 7 jours au point du chantier (centre du réseau géoréférencé, sinon la ville de la fiche
   géocodée), cache 3 h sur l'appareil (kv trace:meteo). La météo du jour fixe la TENUE de travail des avatars (kit : chaud / frais / froid / pluie) et la scène « Aujourd'hui ». ── */
const METEO_SEUILS={chaud:25,froid:8,pluieMm:3,pluiePct:70}; // HYPOTHÈSES (°C max du jour, mm de pluie, % de probabilité) — à faire trancher par Ethan
const METEO_TTL=3*3600e3,METEO_RETRY=15*60e3;
let METEO_STORE={};   // id chantier → {at, ll:[lon,lat], ville, days:{'yyyy-mm-dd':[k, t°max, mm, code]}, failAt}
let GEOCODE={};       // ville → [lon,lat] | null (pas trouvée)
export const espaceMeteo=()=>METEO_STORE;
function meteoKind(tmax,mm,pct,code){ // codes WMO : 51-67 bruine / pluie, 80-82 averses, 95-99 orage, 71-77 neige
  const pluie=(mm>=METEO_SEUILS.pluieMm)||(pct>=METEO_SEUILS.pluiePct&&mm>=1)||(code>=61&&code<=67)||(code>=80&&code<=82)||code>=95;
  if(pluie&&!(tmax<METEO_SEUILS.froid&&code>=71&&code<=77))return 'pluie';
  if(tmax<METEO_SEUILS.froid)return 'froid';if(tmax>=METEO_SEUILS.chaud)return 'chaud';return 'frais';}
function meteoData(){const out={};Object.keys(METEO_STORE).forEach(id=>{if(METEO_STORE[id]&&METEO_STORE[id].days)out[id]=METEO_STORE[id].days;});return out;}
async function geocode(ville){const k=String(ville||'').trim().toLowerCase();if(!k)return null;if(k in GEOCODE)return GEOCODE[k];
  try{const r=await fetch('https://geocoding-api.open-meteo.com/v1/search?name='+encodeURIComponent(k)+'&count=1&language=fr&format=json&countryCode=FR');if(!r.ok)throw new Error(r.status);const j=await r.json();const x=j&&j.results&&j.results[0];GEOCODE[k]=x?[+x.longitude,+x.latitude]:null;}
  catch(e){console.warn('geocode',ville,e);return null;} /* échec réseau : on ne mémorise rien, on réessaiera */
  kvSet('trace:geocode',GEOCODE);return GEOCODE[k];}
async function meteoFetch(c){let ll=c.ll;if(!ll&&c.ville)ll=await geocode(c.ville);if(!ll)return null;
  const u='https://api.open-meteo.com/v1/forecast?latitude='+(+ll[1]).toFixed(4)+'&longitude='+(+ll[0]).toFixed(4)+'&daily=weathercode,temperature_2m_max,temperature_2m_min,precipitation_sum,precipitation_probability_max&timezone=Europe%2FParis&forecast_days=7';
  const r=await fetch(u);if(!r.ok)throw new Error('open-meteo '+r.status);const j=await r.json();const d=j.daily||{};const days={};
  (d.time||[]).forEach((t,i)=>{const tmax=+(d.temperature_2m_max||[])[i],mm=+((d.precipitation_sum||[])[i]||0),pct=+((d.precipitation_probability_max||[])[i]||0),code=+((d.weathercode||[])[i]||0);if(!isFinite(tmax))return;days[t]=[meteoKind(tmax,mm,pct,code),Math.round(tmax),Math.round(mm*10)/10,code];});
  return {at:Date.now(),ll,ville:c.ville||'',days};}
let meteoBusy=false,meteoT=null;
function meteoEnsure(){clearTimeout(meteoT);meteoT=setTimeout(()=>meteoRefresh().catch(e=>console.warn(e)),300);}
async function meteoRefresh(){if(meteoBusy||typeof fetch!=='function'||(typeof navigator!=='undefined'&&navigator.onLine===false))return;
  const now=Date.now();const list=(DATA?DATA.chantiers:[]).filter(c=>!c.bureau&&(c.ll||c.ville)).filter(c=>{const m=METEO_STORE[c.id];if(m&&m.failAt&&now-m.failAt<METEO_RETRY)return false;return !(m&&m.at&&now-m.at<METEO_TTL&&m.days);}).slice(0,40);
  if(!list.length)return;meteoBusy=true;let changed=false;
  try{for(const c of list){try{const m=await meteoFetch(c);if(m){METEO_STORE[c.id]=m;changed=true;}else{METEO_STORE[c.id]=Object.assign({},METEO_STORE[c.id]||{},{failAt:now});}}catch(e){console.warn('météo',c.id,e);METEO_STORE[c.id]=Object.assign({},METEO_STORE[c.id]||{},{failAt:now});}}}
  finally{meteoBusy=false;}
  if(changed){kvSet('trace:meteo',METEO_STORE);if(ROOT&&document.contains(ROOT))render();}}
/* ════════════════════════════════════════════════════════════════════
   3. OUTILS : texte, dates, heures
   ════════════════════════════════════════════════════════════════════ */
const $id=id=>document.getElementById(id);
const esc=s=>String(s==null?'':s).replace(/[&<>"]/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;'}[c]));
const pad=n=>String(n).padStart(2,'0');
const nb=n=>Number(n).toLocaleString('fr-FR');
const TODAY=()=>{try{const t=localStorage.getItem('trace:testToday');if(t&&/^\d{4}-\d{2}-\d{2}$/.test(t))return t;}catch(e){} /* tests seulement : figer la date (le planning ignore le week-end) */const n=new Date();return n.getFullYear()+'-'+pad(n.getMonth()+1)+'-'+pad(n.getDate());};
export const espaceToday=()=>DATA?DATA.today:TODAY();
const D=s=>{const [y,m,d]=String(s||(DATA?DATA.today:TODAY())).slice(0,10).split('-').map(Number);return new Date(y,m-1,d,12)};
const iso=dt=>dt.getFullYear()+'-'+pad(dt.getMonth()+1)+'-'+pad(dt.getDate());
const fDate=s=>{if(!s)return '—';const [y,m,d]=String(s).slice(0,10).split('-');return d+'/'+m+'/'+y};               // jj/mm/aaaa
const fJour=s=>['dim.','lun.','mar.','mer.','jeu.','ven.','sam.'][D(s).getDay()]+' '+s.slice(8,10)+'/'+s.slice(5,7);
const jours=s=>s?Math.round((D(s)-D(DATA.today))/864e5):null;                                      // jours restants (négatif = passé)
const hm=at=>{const t=at.slice(-5);return +t.slice(0,2)*60+ +t.slice(3)};                   // minutes depuis minuit
const fHeure=at=>{const t=at.slice(-5);return (+t.slice(0,2))+' h '+t.slice(3)};            // 7 h 32
const fDuree=m=>Math.floor(m/60)+' h '+pad(m%60);                                           // 8 h 06
const MOIS=['Janvier','Février','Mars','Avril','Mai','Juin','Juillet','Août','Septembre','Octobre','Novembre','Décembre'];
const fMois=s=>MOIS[+s.slice(5,7)-1]+' '+s.slice(0,4);
function semaineDe(k){const t=D(DATA?DATA.today:TODAY()),l=new Date(t);l.setDate(t.getDate()-((t.getDay()+6)%7)+7*k); // k = 0 semaine en cours, -1 la précédente, 1 la suivante
  return [0,1,2,3,4].map(i=>{const d=new Date(l);d.setDate(l.getDate()+i);return iso(d)})}
function semaine(){return semaineDe(0)}
function numSemaine(s){const d=D(s);d.setDate(d.getDate()+3-((d.getDay()+6)%7));const j=new Date(d.getFullYear(),0,4,12);
  return 1+Math.round(((d-j)/864e5-3+((j.getDay()+6)%7))/7)}

/* ════════════════════════════════════════════════════════════════════
   4. LOGIQUE MÉTIER (à reprendre dans l'appli)
   ════════════════════════════════════════════════════════════════════ */
const pers=id=>DATA.personnes.find(p=>p.id===id)||DATA.inconnus[id]||(DATA.inconnus[id]={id,prenom:String(id||'?').split('@')[0],nom:'',email:'',tel:'',poste:'autre',type:'salarie',admin:false,active:false,rights:{},contrat:null,urgence:null,inconnu:true}); /* un id inconnu (compte supprimé) ne casse rien */
const site=id=>(id&&DATA.chantiers.find(c=>c.id===id))||{id:id||null,nom:id?String(id):'—',ville:'',bureau:id==='siege',stub:true};
const site_=site; /* id inconnu ou absent : stub, jamais null (les gabarits lisent .nom) */
const poste=p=>DATA.postes[p.poste];
const famille=p=>DATA.familles[poste(p).fam];
const nomC=p=>p.prenom+' '+p.nom;
/* Planning : chantiers d'une personne un jour donné (rien avant l'entrée, après la fin de contrat, ni le week-end) */
function planDe(id,d){
  const p=pers(id),wd=D(d).getDay();
  if(!p||wd===0||wd===6||d<p.entree||(p.contrat&&p.contrat.fin&&d>p.contrat.fin))return [];
  return (DATA.planning[id]&&DATA.planning[id][d])||(DATA.affectations[id]?[DATA.affectations[id]]:[]);
}
const siteJour=p=>{const id=planDe(p.id,DATA.today)[0];return id?site(id):null;};
/* Plusieurs chantiers dans la journée : celui où la personne en est = un de plus à chaque départ inter-chantier pointé */
function siteActuel(p){const ids=planDe(p.id,DATA.today),x=ptDe(p.id,DATA.today),n=x?x.events.filter(e=>e.t==='leave').length:0;
  const id=ids[Math.min(n,ids.length-1)];return id?site(id):null}
/* Qui est avec moi sur ce chantier ce jour-là (hors responsables du chantier, listés à part) */
function avecMoi(me,siteId,d){const c=site(siteId);
  return DATA.personnes.filter(p=>p.id!==me.id&&p.id!==c.chef&&p.id!==c.conducteur&&(p.active||p.invite)&&planDe(p.id,d).includes(siteId))}
/* Productions */
const PROD={soudures:['soudure','soudures'],retractions:['manchon','manchons'],fils:['DH','DH'],bouchons:['bouchon','bouchons'],heures:["h d'engin","h d'engin"]}; /* plus de pouces à l'écran (Ethan 09/10) : soudures par DN, manchons par DN tube / enveloppe */
const OPERATEURS=['soudeur','tuyauteur','manchonneur','chauffeur_engin'];
const ENCADRE=['chef','conducteur']; // ils voient la production de leur équipe, pas la leur
function prodIds(me){ // de qui je vois la production : la mienne (opérateur) ou celle de mon équipe (chef de chantier)
  if(OPERATEURS.includes(me.poste))return [me.id];
  if(ENCADRE.includes(me.poste))return equipeDe(me).filter(p=>p.active&&OPERATEURS.includes(p.poste)).map(p=>p.id);
  return null;
}
function addProd(t,o){ // additionne deux productions, détail par DN compris
  for(const k in o){if(k==='dn'||k==='mdn'){t[k]=t[k]||{};for(const n in o[k])t[k][n]=(t[k][n]||0)+o[k][n]}else t[k]=(t[k]||0)+o[k]}
  return t}
function prodJour(ids,d){const t={};
  ids.forEach(id=>{addProd(t,(DATA.productions[id]||{})[d]||{});
    if(ids.length===1&&pers(id).poste==='tuyauteur'){const n=poucesRecus(id,d);if(n)t.pouces=(t.pouces||0)+n}}); // en total d'équipe, on ne recompte pas les pouces du soudeur
  return t}
const dnListe=dn=>Object.keys(dn||{}).filter(k=>dn[k]).sort((a,b)=>parseFloat(a)-parseFloat(b)); /* clés « 100 » (soudure) ou « 100/200 » (manchon : DN tube / enveloppe) */
const dnTxt=dn=>dnListe(dn).map(k=>'DN '+k+' × '+dn[k]).join(' · ');
const dnChips=dn=>dnListe(dn).length?`<div class="eq-dn">${dnListe(dn).map(k=>`<span>DN ${k} · <b>${dn[k]}</b></span>`).join('')}</div>`:'';
const prodTxt=o=>Object.keys(PROD).filter(k=>o&&o[k]).map(k=>nb(o[k])+' '+PROD[k][o[k]>1?1:0]+(k==='soudures'&&o.dn?' ('+dnTxt(o.dn)+')':'')+(k==='retractions'&&o.mdn?' ('+dnTxt(o.mdn)+')':'')).join(' · ');
/* Météo : pictogramme, libellé, aplat de fond de la scène */
const METEO={chaud:['☀️','Chaud','#FBEBCB'],frais:['⛅','Frais','#E4EEF6'],froid:['❄️','Froid','#E9ECF3'],pluie:['🌧️','Pluie','#DCE5EA']};
function meteoDe(siteId,d){const c=site(siteId);if(!c)return null;const m=(DATA.meteo[c.id]&&DATA.meteo[c.id][d])||(DATA.meteo[c.ville]&&DATA.meteo[c.ville][d]);return m?{k:m[0],t:m[1],mm:m[2]}:null}
const chefDe=p=>{const c=siteJour(p);return c&&c.chef&&c.chef!==p.id?pers(c.chef):null};
const RH=['resp_rh','assist_rh','charge_dev_rh'];

/* Droits : ceux de l'appli (acces.js : défauts du poste → plafond du type → ajustements → administrateur). L'administrateur a tout, mais ne pointe pas pour autant :
   pointage.self est pris SANS le joker administrateur ; 'admin' = le drapeau du compte. */
function droits(p){const acc=p._acc||{poste:p.poste,type:p.type,admin:p.admin,rights:p.rights,active:p.active};const e=A.rights(acc);const self=!!A.rights(Object.assign({},acc,{admin:false}))['pointage.self'];
  return Object.assign({},e,{'pointage.self':self,admin:!!acc.admin&&acc.active!==false});}
const can=(p,r)=>!!droits(p)[r];

/* Qui je vois dans l'annuaire : un intérimaire ne voit que son chantier, les invités ne sont visibles que du bureau */
function visibles(me){
  if(!can(me,'team.view'))return [];
  let l=DATA.personnes.filter(p=>p.active||can(me,'dossier.edit'));
  if(me.type==='interim'){const mine=new Set(planDe(me.id,DATA.today));l=l.filter(p=>p.id===me.id||planDe(p.id,DATA.today).some(x=>mine.has(x)));} /* intérimaire : l'équipe de son chantier du jour (planning) */
  return l;
}
/* Qui j'encadre : chef = ses chantiers, conducteur = ses chantiers, sinon tout le monde si j'ai un droit d'équipe */
function equipeDe(me){
  const autres=DATA.personnes.filter(p=>p.id!==me.id);
  if(me.poste==='chef')return autres.filter(p=>{const c=siteJour(p);return c&&c.chef===me.id});
  if(me.poste==='conducteur')return autres.filter(p=>{const c=siteJour(p);return c&&c.conducteur===me.id});
  if(can(me,'pointage.validate')||can(me,'qse.manage')||can(me,'dossier.edit'))return autres;
  return [];
}
const equipeIds=me=>new Set(equipeDe(me).map(p=>p.id));
function accueilType(p){
  if(p.poste==='chef'||p.poste==='conducteur')return 'chef';
  if(RH.includes(p.poste))return 'rh';
  if(poste(p).fam==='direction'||p.poste==='resp_exploitation'||p.poste==='resp_operations')return 'direction';
  return 'terrain';
}

/* Habilitations : état calculé à partir de la date de fin */
function etatHab(h){
  if(!h)return 'absente';
  if(!h.fin)return 'valide';
  const j=jours(h.fin);
  return j<0?'expiree':j<DATA.config.seuilEcheance?'echeance':'valide';
}
function habsDe(p){
  const req=DATA.habRequises[p.poste]||DATA.habRequises._defaut;
  const mes=DATA.habilitations.filter(h=>h.p===p.id);
  const types=[...new Set([...req,...mes.map(h=>h.type)])];
  return types.map(type=>{
    const h=mes.find(x=>x.type===type)||null,etat=etatHab(h),j=h&&h.fin?jours(h.fin):null;
    const rang=etat==='expiree'?j:etat==='echeance'?j:etat==='absente'?1e4:2e4+(j==null?9e3:j);
    return {type,h,etat,j,rang};
  }).sort((a,b)=>a.rang-b.rang);
}
const HK={expiree:'bad',echeance:'warn',absente:'off',valide:'ok'};
function reste(x){
  if(x.etat==='expiree')return 'Expirée depuis '+(-x.j)+' j';
  if(x.etat==='echeance')return 'Expire dans '+x.j+' j';
  if(x.etat==='absente')return 'Absente';
  return x.j==null?'Valide':'Valide · '+nb(x.j)+' j';
}
function alertesHab(liste,maxJ){ // habilitations à traiter d'un groupe de personnes
  const r=[];
  liste.forEach(p=>habsDe(p).forEach(x=>{
    if(x.etat==='expiree'||(x.etat==='echeance'&&x.j<maxJ)||(x.etat==='absente'&&maxJ>=DATA.config.seuilEcheance))r.push({p,...x});
  }));
  return r.sort((a,b)=>a.rang-b.rang);
}

/* Pointage : durées calculées à partir des événements */
const ptsDe=id=>DATA.pointages.filter(x=>x.p===id);
const ptDe=(id,d)=>DATA.pointages.find(x=>x.p===id&&x.d===d);
const ptId=x=>x.p+'|'+x.d;
const ptParId=id=>{const [p,d]=id.split('|');return ptDe(p,d)};
function calc(x){
  let w=0,pa=0,it=0,st=null,t0=0,fin=null,debut=null;const seg=[];
  const add=t=>{if(st){const d=t-t0;if(st==='w')w+=d;else if(st==='p')pa+=d;else it+=d;if(d>0)seg.push({k:st,a:t0,b:t})}};
  for(const e of x.events){
    const t=hm(e.at);add(t);t0=t;
    if(e.t==='start'){st='w';debut=e.at}
    else if(e.t==='resume'||e.t==='arrive')st='w';
    else if(e.t==='pause')st='p';
    else if(e.t==='leave')st='i';
    else if(e.t==='end'){st=null;fin=e.at}
  }
  const enCours=!fin&&x.d===DATA.today,manque=!fin&&x.d<DATA.today;
  if(enCours)add(hm(DATA.now));
  return {w,pa,it,total:w+it,fin,debut,enCours,manque,etat:st,seg};
}
function statutPt(x){
  const c=calc(x);
  if(c.manque&&x.status==='declare')return {k:'bad',mot:'Fin manquante'};
  if(c.enCours)return {k:'off',mot:c.etat==='p'?'En pause':c.etat==='i'?'Inter-chantier':'En cours'};
  if(valFinal(x)){const v=pers(x.val.filter(v=>!estChef(v.by)).pop().by);return {k:'ok',mot:'Validé par '+(v.poste==='conducteur'?'le conducteur':v.prenom)}}
  if(x.status==='corrige')return {k:'ink',mot:'Corrigé par le chef'};
  if(x.val.length)return {k:'ok',mot:'Validé par le chef'};
  return {k:'warn',mot:'Déclaré, à valider'};
}
/* Validation en deux temps : 1) le chef de chantier, 2) le conducteur de travaux (ou tout autre valideur), toujours APRÈS le chef.
   Le pointage d'un chef de chantier n'a pas de 1re étape : il va directement au conducteur. */
const estChef=id=>pers(id).poste==='chef';
const valChef=x=>estChef(x.p)||x.val.some(v=>estChef(v.by));
const valFinal=x=>x.val.some(v=>!estChef(v.by));
const niveau=me=>me.poste==='chef'?1:2;
function aValider(x,me){
  if(calc(x).enCours)return false;
  return niveau(me)===1?!valChef(x):valChef(x)&&!valFinal(x);
}
const attendChef=x=>!calc(x).enCours&&!valChef(x);
function totSemaine(id,k,js){ // js : liste de jours précise (mois), sinon la semaine k
  const t={w:0,pa:0,it:0,total:0,n:0,val:0,att:0,corr:0};
  (js||semaineDe(k||0)).forEach(d=>{const x=ptDe(id,d);if(x){const c=calc(x);t.w+=c.w;t.pa+=c.pa;t.it+=c.it;t.total+=c.total;t.n++;
    if(x.status==='valide')t.val++;else if(x.status==='corrige')t.corr++;else if(!c.enCours)t.att++}});
  return t;
}
const EVT={start:'début',pause:'pause',resume:'reprise',leave:'départ inter-chantier',arrive:'arrivée',end:'fin'};

/* ════════════════════════════════════════════════════════════════════
   4 bis. AVATARS SCR : branchement du kit (profil stocké, contexte calculé)
   ════════════════════════════════════════════════════════════════════ */
const KIT=typeof avatarModele==='function'&&typeof avatarSVG==='function'; // faux si avatar-scr.js n'est pas chargé : retour aux initiales
const AV=KIT?new EditorLogic():null;
const avPoste=p=>KIT?(DATA.avatarPostes[p.poste]||null):null;
function annees(s){if(!s)return 0;const a=D(s),t=D(DATA.today);let n=t.getFullYear()-a.getFullYear();
  if(t.getMonth()<a.getMonth()||(t.getMonth()===a.getMonth()&&t.getDate()<a.getDate()))n--;return Math.max(0,n)}
/* Profil = ce qui est stocké. Le poste vient du compte, pas du salarié. */
function avProfil(p){return Object.assign(AV.profilInitial(),DATA.avatars[p.id]||{},{poste:avPoste(p)})}
/* Contexte = calculé à l'affichage, jamais saisi par le salarié */
function avContexte(p){
  const c=DATA.avatarCompteurs[p.id]||{},x=ptDe(p.id,DATA.today),ch=siteActuel(p);
  return Object.assign({
    /* tenue de travail pendant les heures pointées ; pour ceux qui ne pointent pas (bureau, encadrement) : jours ouvrés, 8 h – 18 h (HYPOTHÈSE) */
    vue:(can(p,'pointage.self')?x&&calc(x).enCours:[1,2,3,4,5].includes(D(DATA.today).getDay())&&DATA.now>='08:00'&&DATA.now<'18:00')?'travail':'perso',
    meteo:((ch&&meteoDe(ch.id,DATA.today))||{k:'frais'}).k, // météo du jour du chantier : elle fixe la tenue de travail
    realisations:c.realisations||0,jours:c.jours||0,qualite:c.qualite||0,radio:c.radio||0,cadence:c.cadence||0,
    anciennete:annees(p.entree)                         // années pleines depuis la date d'entrée
  });
}
/* Enveloppe du kit. RÈGLE SCR : la médaille d'ancienneté ne se porte qu'en tenue de travail, jamais hors travail.
   Le kit ne la retire pas en tenue perso : on le fait ici, sans toucher au kit. À reporter dans le kit (cfgPerso). */
function avModele(profil,ctx){
  const m=avatarModele(profil,ctx);
  if(m.perso){const z={medailleAns:0,medailleNiveau:0};Object.assign(m.cfg,z);
    for(const k in m.groupes)if(k!=='medailleNiveaux')m.groupes[k].forEach(o=>{if(o.cfg)Object.assign(o.cfg,z)})}
  return m;
}
let AVM={};                                             // cache d'un rendu, vidé à chaque render()
/* vue = 'travail' | 'perso' pour forcer une tenue ; sinon celle du moment (pointage) */
function avM(p,vue){const k=p.id+'/'+(vue||'');if(AVM[k])return AVM[k];const c=avContexte(p);if(vue)c.vue=vue;return AVM[k]=avModele(avProfil(p),c)}
/* Modèle de l'écran « Mon avatar » : la tenue qu'on modifie (au travail / hors travail) est un choix d'écran */
function avMe(me){return avM(me,S.avVue||null)}
/* Personnage en pied sur son disque (fiche du salarié) */
function figure(m,t,nu){ // nu = sans le disque de fond (dans une scène)
  return `<span class="eq-fig" style="width:${t}px;height:${Math.round(t*1.8)}px">${nu?'':`<i style="background:${m.fond};width:${t}px;height:${t}px;left:0;top:${Math.round(t*.036)}px"></i>`}<b style="left:${Math.round(t*.18)}px;top:${Math.round(t*1.69)}px;width:${Math.round(t*.64)}px;height:${Math.round(t*.057)}px"></b>${avatarSVG(m.cfg,t)}</span>`;
}
/* Tenue de travail d'une personne un jour donné sur un chantier donné : elle suit la météo prévue, automatiquement */
function avJour(p,d,siteId){const k=p.id+'/'+d+'/'+siteId;if(AVM[k])return AVM[k];
  const c=avContexte(p),m=meteoDe(siteId,d);c.vue='travail';c.meteo=m?m.k:'frais';return AVM[k]=avModele(avProfil(p),c)}
/* Binômes : pouces crédités au tuyauteur = cumul des pouces de son ou ses soudeurs ce jour-là */
function binome(tuy,d){return (DATA.equipes||[]).find(e=>e.tuyauteur===tuy&&e.d===d)||null}
function poucesRecus(tuy,d){const b=binome(tuy,d);return b?b.soudeurs.reduce((s,id)=>s+(((DATA.productions[id]||{})[d]||{}).pouces||0),0):0}
/* ════════════════════════════════════════════════════════════════════
   5. BRIQUES D'AFFICHAGE
   ════════════════════════════════════════════════════════════════════ */
const etat=(k,mot)=>`<span class="eq-etat"><i class="eq-dot eq-${k}"></i>${esc(mot)}</span>`;
function avatar(p,cls){
  if(KIT&&avPoste(p)){const m=avM(p);return `<span class="eq-av">${avatarMedaillon(m.cfg,cls?60:34,m.fond)}</span>`}
  const txt=((p.prenom||'')[0]||'')+((p.nom||'')[0]||'')||'?';
  return `<span class="ini ${cls||''}" style="background:${famille(p).couleur}">${txt}</span>`;
}
const tagType=p=>p.type==='interim'?` <span class="eq-tag">Intérim${p.contrat&&p.contrat.fin?' · fin '+fDate(p.contrat.fin).slice(0,5):''}</span>`:'';
function contratTxt(p){
  const c=p.contrat;if(!c)return '—';
  if(c.type==='CDI')return 'CDI';
  if(c.type==='CDD')return 'CDD'+(c.fin?' jusqu\'au '+fDate(c.fin)+' (dans '+jours(c.fin)+' j)':'');
  return 'Intérim'+(c.agence?' · '+c.agence:'')+(c.fin?' · fin de mission '+fDate(c.fin)+' (dans '+jours(c.fin)+' j)':'');
}
function barre(c){ // 6 h → 19 h
  return `<span class="eq-bar">${c.seg.filter(s=>s.k!=='p').map(s=>`<i class="eq-${s.k}" style="left:${Math.max(0,(s.a-360)/7.8).toFixed(1)}%;width:${((s.b-s.a)/7.8).toFixed(1)}%"></i>`).join('')}</span>`;
}
function resumePt(c){
  return ['travail '+fDuree(c.w),'pause '+fDuree(c.pa),c.it?'inter-chantier '+fDuree(c.it):''].filter(Boolean).join(' · ');
}
function htmlHab(x){ // une habilitation ; la pièce jointe se consulte en touchant la ligne
  const T=DATA.habTypes[x.type],h=x.h;
  const piece=h?(h.piece==='pdf'?'📎 Voir le PDF':h.piece==='photo'?'📷 Voir la photo':'Aucune pièce'):'';
  const sous=h?[h.num&&'n° '+h.num,h.fin?'Échéance '+fDate(h.fin):'Sans échéance',piece].filter(Boolean).join(' · '):'À fournir aux RH';
  const in_=`<span class="eq-grow"><span class="eq-t">${esc(T.label)}</span><span class="eq-s">${esc(sous)}</span></span>${etat(HK[x.etat],reste(x))}`;
  return h&&h.piece&&h.url?`<a class="eq-row" href="${esc(h.url)}" target="_blank" rel="noopener" style="text-decoration:none;color:inherit">${in_}</a>`:`<div class="eq-row">${in_}</div>`;
}
function htmlAlerte(a){ // une ligne d'échéance avec le nom de la personne
  return `<button class="eq-row" data-act="fiche" data-v="${a.p.id}">${avatar(a.p)}<span class="eq-grow"><span class="eq-t">${esc(nomC(a.p))}</span><span class="eq-s">${esc(DATA.habTypes[a.type].label)}${a.h&&a.h.fin?' · '+fDate(a.h.fin):''}</span></span>${etat(HK[a.etat],reste(a))}</button>`;
}
function detailPt(x,c){
  const ev=x.events.map(e=>fHeure(e.at)+' '+EVT[e.t]+(e.pos?' 📍':'')).join(' · ');
  const v=x.val.map(v=>nomC(pers(v.by))).join(', ');
  return `<div class="eq-detail"><div>${esc(ev)}</div><div>${esc(resumePt(c))}</div>
    ${x.corr?`<div>✏️ ${esc(EVT[x.corr.t]||'heure')} corrigée : ${fHeure(x.corr.heure)}${x.corr.avant?' au lieu de '+fHeure(x.corr.avant):''} — ${esc(x.corr.motif)}</div>`:''}
    ${v?`<div>✅ Validé par ${esc(v)}</div>`:''}
    <div class="hint">📍 Position relevée au début et à la fin, c'est tout.</div></div>`;
}
function htmlJour(p,d){
  const x=ptDe(p.id,d);
  if(!x)return `<div class="eq-row"><span class="eq-grow"><span class="eq-t">${fJour(d)}</span><span class="eq-s">${d>DATA.today?'À venir':'Pas de pointage'}</span></span></div>`;
  const c=calc(x),st=statutPt(x),id=ptId(x);
  return `<button class="eq-row" data-act="jour" data-v="${id}"><span class="eq-grow"><span class="eq-t">${fJour(d)} <span class="eq-s">· ${esc(site(x.site).nom)}</span></span>${barre(c)}<span class="eq-s">${esc(resumePt(c))}</span></span><span class="eq-right"><b>${fDuree(c.total)}</b>${etat(st.k,st.mot)}</span></button>${S.open[id]?detailPt(x,c):''}`;
}

/* ── Cartes : identité et fiche ── */
function cIdent(p,autre){
  const c=siteJour(p);
  const scr=KIT&&avPoste(p);
  return `<div class="card"><div class="eq-id">${scr?figure(avM(p),84):avatar(p,'eq-lg')}<div class="eq-grow">
    <div class="eq-name">${esc(nomC(p))}${p.admin?' ★':''}</div>
    <div class="eq-etat"><i class="eq-dot" style="background:${famille(p).couleur}"></i>${esc(poste(p).label)} · ${famille(p).label}</div>
    <div class="eq-s">${p.type==='interim'?'Intérimaire':p.type==='visiteur'?'Visiteur':'Salarié'}${c?' · 📍 '+esc(c.nom):''}</div></div></div>
    ${p.type==='interim'&&p.contrat&&p.contrat.fin?`<div class="eq-kv" style="margin-top:10px"><span>Mission</span><span>${esc(p.contrat.agence||'')} · jusqu'au ${fDate(p.contrat.fin)} ${etat(jours(p.contrat.fin)<=30?'warn':'ok','dans '+jours(p.contrat.fin)+' j')}</span></div>`:''}
    ${p.invite?`<div class="hint" style="margin-top:8px">Invité, pas encore connecté.</div>`:''}
    ${scr&&!autre?`<div class="hint" style="margin-top:8px">${esc(avM(p).vueTexte)}</div><button class="btn eq-full" data-act="go" data-v="avatar">🎨 Modifier mon avatar</button>`:''}
    ${autre?`<div class="eq-acts" style="margin:10px 0 0"><a class="btn primary" data-act="tel" href="tel:${(p.tel||'').replace(/ /g,'')}">📞 Appeler</a><a class="btn" data-act="tel" href="mailto:${esc(p.email)}">✉️ E-mail</a></div>`:''}
  </div>`;
}
function cFiche(p,me){ // « Ta fiche » : seul le contact d'urgence est défini par la personne, tout le reste par les RH
  const c=siteJour(p),chef=chefDe(p),u=p.urgence;
  return `<div class="card"><h3>Ta fiche</h3><div>
    <div class="eq-kv" style="border-top:0"><span>Téléphone</span><span>${esc(p.tel)}</span></div>
    <div class="eq-kv"><span>E-mail</span><span>${esc(p.email)}</span></div>
    <div class="eq-kv"><span>Chantier du jour</span><span>${c?esc(c.nom):'—'}</span></div>
    <div class="eq-kv"><span>Chef de chantier</span><span>${chef?esc(nomC(chef)):'—'}</span></div>
    <div class="eq-kv"><span>Date d'entrée</span><span>${fDate(p.entree)}</span></div>
    <div class="eq-kv"><span>Contrat</span><span>${esc(contratTxt(p))}</span></div>
    ${S.edit?'':`<div class="eq-kv"><span>Contact d'urgence ✏️</span><span>${u?esc(u.nom)+' ('+esc(u.lien)+') · '+esc(u.tel):etat('warn','À définir')}</span></div>`}</div>
    ${S.edit?`<div class="eq-form" style="margin-top:8px"><div><label class="f">Contact d'urgence — nom</label><input class="f" id="eq-urg-nom" value="${esc(u?u.nom:'')}"></div>
      <div><label class="f">Lien (épouse, père, ami…)</label><input class="f" id="eq-urg-lien" value="${esc(u?u.lien:'')}"></div>
      <div><label class="f">Téléphone du contact</label><input class="f" id="eq-urg-tel" type="tel" value="${esc(u?u.tel:'')}"></div>
      <div class="eq-acts"><button class="btn primary" data-act="editok">Enregistrer</button><button class="btn" data-act="edit">Annuler</button></div></div>`
      :`<button class="btn eq-full" data-act="edit">✏️ ${u?'Modifier':'Définir'} ton contact d'urgence</button>`}
    <div class="hint" style="margin-top:6px">🔑 Tout le reste, téléphone compris, est modifié par les RH.</div></div>`;
}
/* ── Cartes : accueil terrain ── */
function cChantiersSemaine(me,k,lien){ // chantier(s) de la semaine : où je suis, quels jours, avec quel chef
  const js=semaineDe(k||0),ids=[...new Set(js.flatMap(d=>planDe(me.id,d)))];
  const t=`T${ids.length>1?'es chantiers':'on chantier'} de la semaine`;
  if(!ids.length)return `<div class="card"><h3>${t}</h3><div class="eq-s">Pas de chantier prévu cette semaine.</div></div>`;
  return `<div class="card"><h3>${t} <span class="hint">· semaine ${numSemaine(js[0])}</span></h3><div class="eq-list">${ids.map(i=>{
    const c=site(i),jc=js.filter(d=>planDe(me.id,d).includes(i)),chef=c.chef&&c.chef!==me.id?pers(c.chef):null;
    return `<div class="eq-row"><span class="eq-grow"><span class="eq-big">📍 ${esc(c.nom)}</span>
      <span class="eq-s">${jc.length===5?'Toute la semaine':jc.map(d=>fJour(d).slice(0,4)).join(' ')}${jc.includes(DATA.today)?' · tu y es aujourd\'hui':''}</span>
      <span class="eq-s">${c.soudures?nb(c.faites||0)+' / '+nb(c.soudures)+' soudures':esc(c.ville)}${chef?' · chef de chantier : '+esc(nomC(chef)):''}</span></span></div>`}).join('')}</div>
    ${lien?`<button class="btn eq-full" data-act="go" data-v="planning">Voir ta semaine</button>`:''}</div>`;
}
function cTaches(me){ // tâches qu'on m'a assignées
  if(!DATA.taches)return ''; /* source pas encore branchée (lot suivant) */
  const l=DATA.taches.filter(t=>t.p===me.id);if(!l.length)return '';
  const n=l.filter(t=>!t.fait).length;
  return `<div class="card"><h3>Tes tâches <span class="hint">· ${n} à faire</span></h3><div class="eq-list">${l.map((t,i)=>`<div class="eq-vrow"><div class="eq-row"><span class="eq-grow"><span class="eq-t">${t.fait?'✅ ':''}${esc(t.titre)}</span><span class="eq-s">${esc(t.detail)}</span>
      <span class="eq-s">📍 ${esc(site(t.site).nom)} · donnée par ${esc(nomC(pers(t.par)))} le ${fDate(t.le).slice(0,5)}</span></span>${t.fait?etat('ok','Faite'):etat('warn','À faire')}</div>
      <div class="eq-acts"><button class="btn" data-act="tache" data-v="${DATA.taches.indexOf(t)}">${t.fait?'Remettre à faire':'✅ Marquer faite'}</button><button class="btn" data-act="sim" data-v="Ouvre la tâche sur le plan du chantier (conversation, écran existant)">📍 Voir sur le plan</button></div></div>`).join('')}</div></div>`;
}
function cProdSemaine(me){ // récap de production de la semaine en cours
  const ids=prodIds(me);if(!ids)return '';
  const tot={},eq=ENCADRE.includes(me.poste);semaine().forEach(d=>addProd(tot,prodJour(ids,d)));
  return `<div class="card"><h3>${eq?'Productions de ton équipe':'Tes productions'} <span class="hint">· semaine ${numSemaine(DATA.today)}</span></h3>
    <div class="eq-big">${esc(Object.keys(PROD).filter(k=>tot[k]).map(k=>nb(tot[k])+' '+PROD[k][tot[k]>1?1:0]).join(' · ')||'Rien de compté cette semaine')}</div>${dnChips(tot.dn)}
    <div class="eq-s" style="margin-top:6px">Aujourd'hui : ${esc(prodTxt(prodJour(ids,DATA.today))||'rien pour l\'instant')}</div>
    <button class="btn eq-full" data-act="go" data-v="prod">Voir ${eq?'par personne':'tes productions'}</button></div>`;
}
function cPointer(me,lien){ // carte POINTAGE (refonte ②, maquette validée) : un état = une couleur = un geste ; compteur qui tourne ; pause du midi ; inter-chantier
  if(!can(me,'pointage.self'))return '';
  const x=ptDe(me.id,DATA.today),t=totSemaine(me.id),c=x?calc(x):null,ch=siteActuel(me),der=x&&x.events[x.events.length-1];const ids=planDe(me.id,DATA.today);
  const B=(k,txt,prim)=>`<button class="btn${prim?' primary':''}" data-act="pointer" data-v="${k}">${txt}</button>`;
  const live=(base,run)=>`<span id="ptElapsed" data-base="${base}" data-since="${der?esc(der.at):''}" data-run="${run?1:0}">${fDuree(base+(run&&der?Math.max(0,hm(DATA.now)-hm(der.at)):0))}</span>`;
  let cls,big,sub,b;
  if(!x){cls='pt-off';big='Journée pas commencée';sub=(ch?esc(ch.nom)+' · ':'')+'un geste pour démarrer — position relevée au début et à la fin, c\'est tout.';b=B('start','▶ Commencer la journée',1)}
  else if(c.fin){const st=statutPt(x);cls='pt-done';big='Journée finie · '+fDuree(c.total);sub=fHeure(c.debut)+' → '+fHeure(c.fin)+(c.pa?' · pause '+fDuree(c.pa):' · ⚠ pas de pause pointée')+' · '+(st.k==='ok'?'validée':'envoyée pour validation');b=`<button class="btn" data-act="sim" data-v="Demande d'annulation envoyée à ton chef de chantier">Demander une annulation</button>`}
  else if(c.etat==='p'){cls='pt-pause';const base=hm(DATA.now)-hm(der.at);big='En pause · '+live(0,1);sub='pause du midi depuis '+fHeure(der.at)+' · travaillé '+fDuree(c.total)+' depuis '+fHeure(c.debut)+' — la pause ne compte pas dans les heures';b=B('resume','▶ Reprise après la pause',1)+B('end','■ Fin de journée')}
  else if(c.etat==='i'){cls='pt-inter';big='En route · '+live(c.total-(hm(DATA.now)-hm(der.at)),1);sub='parti vers un autre chantier à '+fHeure(der.at)+' · le trajet compte dans les heures';b=B('arrive','📍 Arrivée sur le chantier',1)}
  else{cls='pt-on';big='Au travail · '+live(c.total-(hm(DATA.now)-hm(der.at)),1);sub='depuis '+fHeure(c.debut)+(c.pa?' · '+fDuree(c.pa)+' de pause':'')+(ch?' · '+esc(ch.nom):'');b=B('pause','<svg viewBox="0 0 24 24" width="13" height="13" fill="currentColor" style="vertical-align:-1px"><rect x="6" y="4" width="4" height="16" rx="1"/><rect x="14" y="4" width="4" height="16" rx="1"/></svg> Pause midi')+B('end','■ Fin de journée',1)+(ids.length>1?B('leave','🚐 Départ inter-chantier'):'')}
  return `<section class="card ptc ${cls}"><div class="ptl"><span class="ptdot"></span><span class="ac-kick">Pointage${ch&&x&&!c.fin?' · '+esc(ch.ville||ch.nom):''}</span></div><div class="ptbig">${big}</div><div class="eq-s">${sub}</div>
    <div class="eq-acts" style="margin:10px 0 6px">${b}</div>
    <div class="hint">Semaine en cours : ${fDuree(t.total)} sur ${t.n} jour${t.n>1?'s':''}${ids.length>1&&x&&!c.fin?' · 2 chantiers aujourd\'hui : « Départ inter-chantier » puis « Arrivée »':''}</div>
    ${lien?`<button class="btn eq-full" data-act="go" data-v="mesheures">Voir tes heures</button>`:''}</section>`;
}
/* compteur du pointage : la minute en cours sans re-rendre la page */
setInterval(()=>{const el=document.getElementById('ptElapsed');if(!el||!el.dataset.since||el.dataset.run!=='1')return;const m=Math.max(0,Math.round((Date.now()-Date.parse(el.dataset.since))/60000));el.textContent=fDuree((+el.dataset.base||0)+m);},15000);
function cEchPerso(me){
  const l=habsDe(me).filter(x=>x.etat!=='valide');
  return `<div class="card"><h3>Tes échéances</h3>${l.length?`<div class="eq-list">${l.map(htmlHab).join('')}</div><div class="hint" style="margin-top:6px">⚠️ Ton chef et les RH voient aussi ces alertes.</div>`:`<div>${etat('ok','Tout est à jour')}</div>`}
    <button class="btn eq-full" data-act="go" data-v="meshabs">Toutes tes habilitations</button></div>`;
}

/* ── Cartes : accueil chef ── */
function cEquipeJour(me){ // l'équipe du jour, rangée par chantier (le conducteur en a plusieurs)
  const eq=equipeDe(me).filter(p=>p.active),sites=[...new Set(eq.map(p=>siteJour(p).id))];
  const ligne=p=>{
    const x=ptDe(p.id,DATA.today);let st=can(p,'pointage.self')?etat('off','Pas pointé'):etat('off','Ne pointe pas');
    if(x){const k=calc(x);st=k.fin?etat('off','Journée finie'):k.etat==='p'?etat('off','En pause'):k.etat==='i'?etat('warn','Inter-chantier depuis '+fHeure(x.events[x.events.length-1].at)):etat('ok','Présent depuis '+fHeure(k.debut))}
    const exp=habsDe(p).filter(h=>h.etat==='expiree').map(h=>DATA.habTypes[h.type].label);
    return `<button class="eq-row" data-act="fiche" data-v="${p.id}">${avatar(p)}<span class="eq-grow"><span class="eq-t">${esc(nomC(p))}${tagType(p)}</span><span class="eq-s">${esc(poste(p).label)}${exp.length?' · ⚠️ '+esc(exp.join(', '))+' expirée':''}</span></span>${st}</button>`};
  return `<div class="card"><h3>${sites.length>1?'Tes équipes':'Ton équipe'} aujourd'hui <span class="hint">· ${eq.length} personne${eq.length>1?'s':''}${sites.length>1?' · '+sites.length+' chantiers':''}</span></h3><div class="eq-list">${sites.map(i=>{
    const g=eq.filter(p=>siteJour(p).id===i);
    return `<div class="eq-grp-h">📍 ${esc(site(i).nom)} <span class="hint">· ${g.length}</span></div>`+g.map(ligne).join('')}).join('')}</div></div>`;
}
/* ── Chantiers du chef ou du conducteur : avancement, stock, engins (section à creuser) ── */
const mesSites=me=>DATA.chantiers.filter(c=>!c.bureau&&(c.chef===me.id||c.conducteur===me.id));
const stockBas=i=>((DATA.stock||{})[i]||[]).filter(a=>a.qte<=a.seuil);
const locFin=i=>(DATA.engins||[]).filter(e=>e.site===i&&e.type==='loue'&&jours(e.fin)<=7);
function cMesChantiers(me){ // accueil : mes chantiers d'un coup d'œil
  const l=mesSites(me);if(!l.length)return '';
  return `<div class="card"><h3>Tes chantiers <span class="hint">· ${l.length}</span></h3><div class="eq-list">${l.map(c=>{
    const sb=stockBas(c.id).length,lf=locFin(c.id).length,n=DATA.personnes.filter(p=>p.active&&planDe(p.id,DATA.today).includes(c.id)).length;
    return `<button class="eq-row" data-act="go" data-v="chantiers"><span class="eq-grow"><span class="eq-t">📍 ${esc(c.nom)}</span><span class="eq-s">${c.soudures?Math.round((c.faites||0)/c.soudures*100)+' % des soudures · ':''}${n} personne${n>1?'s':''} aujourd'hui</span></span>
      <span class="eq-right">${sb?etat('warn',sb+' article'+(sb>1?'s':'')+' à commander'):etat('ok','Stock bon')}${lf?etat('warn',lf+' location'+(lf>1?'s':'')+' qui finit'):''}</span></button>`}).join('')}</div>
    <button class="btn eq-full" data-act="go" data-v="chantiers">Stock et engins de tes chantiers</button></div>`;
}
function vChantiers(me){
  const l=mesSites(me),cond=me.poste==='conducteur';
  return `<h2 class="vt">Tes chantiers <span class="hint">· ${l.length}</span></h2>
    <div class="eq-sems">${l.map(c=>{
      const st=(DATA.stock||{})[c.id]||[],en=(DATA.engins||[]).filter(e=>e.site===c.id),mt=meteoDe(c.id,DATA.today),pc=c.soudures?Math.round((c.faites||0)/c.soudures*100):0;
      const gens=DATA.personnes.filter(p=>p.active&&planDe(p.id,DATA.today).includes(c.id));
      return `<div class="card"><div class="eq-big">📍 ${esc(c.nom)}</div>
        <div class="eq-s">${esc(c.ville)}${mt?' · '+METEO[mt.k][0]+' '+METEO[mt.k][1].toLowerCase()+' '+mt.t+' °C':''} · ${gens.length} personne${gens.length>1?'s':''} aujourd'hui${c.chef?' · chef de chantier : '+esc(nomC(pers(c.chef))):''}</div>
        <div class="eq-s" style="margin-top:6px">${nb(c.faites||0)} / ${nb(c.soudures||0)} soudures · <b style="color:var(--ink)">${pc} %</b></div><span class="eq-prog" style="display:block"><i style="width:${pc}%"></i></span>
        <div class="eq-lab">Stock <span class="hint">· ${st.length} article${st.length>1?'s':''} suivis</span></div>
        <div class="eq-list">${st.map(a=>`<div class="eq-row" style="min-height:44px"><span class="eq-grow"><span class="eq-t" style="font-weight:400">${esc(a.art)}</span></span><span class="eq-right"><b>${a.qte}</b>${a.qte<=a.seuil?etat('warn','À commander (seuil '+a.seuil+')'):etat('ok','Bon')}</span></div>`).join('')}</div>
        <div class="eq-lab">Engins sur le chantier <span class="hint">· ${en.length}</span></div>
        <div class="eq-list">${en.map(e=>{const j=e.type==='loue'?jours(e.fin):null;
          return `<div class="eq-row" style="min-height:44px"><span class="eq-grow"><span class="eq-t">🚜 ${esc(e.nom)}</span><span class="eq-s">${e.type==='loue'?'Loué · '+esc(e.loueur)+' · jusqu\'au '+fDate(e.fin):'En propre · SCR'}${e.chauffeur?' · chauffeur : '+esc(nomC(pers(e.chauffeur))):''}</span></span>
            ${e.type==='loue'?etat(j<=7?'warn':'ok','Fin dans '+j+' j'):etat('off','En propre')}</div>`}).join('')||'<div class="eq-s">Aucun engin.</div>'}</div>
        <div class="eq-acts" style="margin:10px 0 0"><button class="btn" data-act="opensite" data-v="${esc(c.id)}|stock">Ouvrir le stock</button>${cond?`<button class="btn" data-act="sim" data-v="Ajout d'un engin : loué (loueur, dates) ou en propre — section à creuser">＋ Ajouter un engin</button>`:''}</div></div>`}).join('')}</div>
    <div class="hint">Les engins, loués ou en propre, sont gérés par le conducteur de travaux.</div>`;
}
function cBinomes(me){ // composition des équipes : quel tuyauteur travaille avec quel(s) soudeur(s) aujourd'hui
  if(!DATA.equipes)return ''; /* source pas encore branchée (lot suivant) */
  if(!KIT||!DATA.config.recompenses)return '';
  const eq=equipeDe(me).filter(p=>p.active),tuy=eq.filter(p=>p.poste==='tuyauteur'),sou=eq.filter(p=>p.poste==='soudeur');
  if(!tuy.length||!sou.length)return '';
  return `<div class="card"><h3>Binômes du jour <span class="hint">· tuyauteur avec soudeur</span></h3><div class="eq-list">${tuy.map(t=>{
    const b=binome(t.id,DATA.today),ids=b?b.soudeurs:[],n=poucesRecus(t.id,DATA.today);
    return `<div class="eq-vrow"><div class="eq-row">${avatar(t)}<span class="eq-grow"><span class="eq-t">${esc(nomC(t))}</span><span class="eq-s">${ids.length?'Reçoit '+n+' pouce'+(n>1?'s':'')+' aujourd\'hui ('+ids.map(id=>esc(pers(id).prenom)).join(' + ')+')':'Aucun soudeur : pas de pouces crédités'}</span></span></div>
      <div class="eq-acts">${sou.map(s=>`<button class="chip${ids.includes(s.id)?' active':''}" data-act="binome" data-v="${t.id}|${s.id}" aria-pressed="${ids.includes(s.id)}">⚡ ${esc(s.prenom)}</button>`).join('')}</div></div>`}).join('')}</div>
    <div class="hint" style="margin-top:6px">Le tuyauteur est crédité des pouces de son ou ses soudeurs, jour par jour. Deux soudeurs : on cumule.</div></div>`;
}
function cAValider(me){
  const ids=equipeIds(me),l=DATA.pointages.filter(x=>ids.has(x.p)&&aValider(x,me)),m=l.filter(x=>calc(x).manque).length,att=niveau(me)===2?DATA.pointages.filter(x=>ids.has(x.p)&&attendChef(x)).length:0;
  const js=[...new Set(l.map(x=>x.d))].sort().map(fJour).join(', ');
  return `<div class="card"><h3>Pointages à valider</h3>${l.length?`<div>${etat('warn',l.length+' à valider')} <span class="eq-s" style="display:inline">· ${js}${m?' · dont '+m+' fin manquante':''}</span></div>
    <button class="btn primary eq-full" data-act="go" data-v="valid">Valider les pointages</button>`:`<div>${etat('ok','Rien à valider')}</div>`}
    ${att?`<div class="eq-s" style="margin-top:6px">${etat('off',att+' en attente du chef de chantier')}</div>`:''}
    ${niveau(me)===2?'<div class="hint" style="margin-top:6px">Tu valides après le chef de chantier.</div>':''}</div>`;
}
function cDemandes(me){
  if(!DATA.demandes)return ''; /* source pas encore branchée (lot suivant) */
  const ids=equipeIds(me),l=DATA.demandes.filter(d=>ids.has(d.p));
  if(!l.length)return '';
  return `<div class="card"><h3>Demandes d'annulation</h3><div class="eq-list">${l.map(d=>{const p=pers(d.p);
    return `<div class="eq-vrow"><div class="eq-row">${avatar(p)}<span class="eq-grow"><span class="eq-t">${esc(nomC(p))} <span class="eq-s">· ${fJour(d.d)}</span></span><span class="eq-s">${esc(d.quoi)}</span></span>${d.etat==='attente'?'':etat(d.etat==='acceptee'?'ok':'bad',d.etat==='acceptee'?'Acceptée':'Refusée')}</div>
    ${d.etat==='attente'?`<div class="eq-acts"><button class="btn primary" data-act="demande" data-v="${d.id}|acceptee">✅ Accepter</button><button class="btn" data-act="demande" data-v="${d.id}|refusee">Refuser</button></div>`:''}</div>`}).join('')}</div></div>`;
}
function cEchEquipe(me){
  const l=alertesHab(equipeDe(me),DATA.config.seuilChef);
  return `<div class="card"><h3>Échéances de ton équipe</h3>${l.length?`<div class="eq-list">${l.map(htmlAlerte).join('')}</div>`:`<div>${etat('ok','Rien à moins de '+DATA.config.seuilChef+' jours')}</div>`}
    <div class="hint" style="margin-top:6px">Tu vois les expirées et celles à moins de ${DATA.config.seuilChef} jours. Les RH voient tout.</div></div>`;
}

/* ── Cartes : accueil RH ── */
function cEchRH(me){
  const l=alertesHab(equipeDe(me),DATA.config.seuilEcheance),n={expiree:0,echeance:0,absente:0};l.forEach(a=>n[a.etat]++);
  return `<div class="card"><h3>Échéances d'habilitations</h3>
    <div style="display:flex;gap:12px;flex-wrap:wrap;margin-bottom:4px">${etat('bad',n.expiree+' expirée'+(n.expiree>1?'s':''))}${etat('warn',n.echeance+' à moins de '+DATA.config.seuilEcheance+' j')}${etat('off',n.absente+' absente'+(n.absente>1?'s':''))}</div>
    <div class="eq-list">${l.filter(a=>a.etat!=='absente').slice(0,6).map(htmlAlerte).join('')}</div>
    <button class="btn primary eq-full" data-act="go" data-v="ech">Tout voir, trié par urgence</button></div>`;
}
function cArrivants(me){
  const l=DATA.personnes.filter(p=>jours(p.entree)>=-30).sort((a,b)=>a.entree<b.entree?1:-1);
  if(!l.length)return '';
  return `<div class="card"><h3>Nouveaux arrivants</h3><div class="eq-list">${l.map(p=>{const j=jours(p.entree),m=habsDe(p).filter(h=>h.etat==='absente').length;
    return `<button class="eq-row" data-act="fiche" data-v="${p.id}">${avatar(p)}<span class="eq-grow"><span class="eq-t">${esc(nomC(p))}${tagType(p)}</span><span class="eq-s">${esc(poste(p).label)} · ${j>0?'arrive le ':'arrivé le '}${fDate(p.entree)}${p.invite?' · invité, pas encore connecté':''}</span></span>${m?etat('off',m+' pièce'+(m>1?'s':'')+' à fournir'):etat('ok','Dossier complet')}</button>`}).join('')}</div></div>`;
}
function cFins(me){
  const l=DATA.personnes.filter(p=>p.contrat&&p.contrat.fin).sort((a,b)=>a.contrat.fin<b.contrat.fin?-1:1);
  if(!l.length)return '';
  return `<div class="card"><h3>Intérims et CDD qui finissent</h3><div class="eq-list">${l.map(p=>{const j=jours(p.contrat.fin);
    return `<button class="eq-row" data-act="fiche" data-v="${p.id}">${avatar(p)}<span class="eq-grow"><span class="eq-t">${esc(nomC(p))}</span><span class="eq-s">${p.contrat.type==='interim'?esc(p.contrat.agence):'CDD'} · fin le ${fDate(p.contrat.fin)}</span></span>${etat(j<=30?'warn':'ok','Dans '+j+' j')}</button>`}).join('')}</div></div>`;
}

/* ── Cartes : accueil direction ── */
function cChiffres(me){
  const ch=DATA.chantiers.filter(c=>!c.bureau);
  const terrain=DATA.personnes.filter(p=>p.active&&planDe(p.id,DATA.today).some(i=>!site(i).bureau)).length; // d'après le planning : tout le monde ne pointe pas
  const soud=ch.reduce((s,c)=>s+c.semaine,0);
  return `<div class="card"><h3>Chiffres du jour</h3><div class="eq-tiles">
    <div class="eq-tile"><b>${ch.length}</b><span class="eq-s">chantiers actifs</span></div>
    <div class="eq-tile"><b>${terrain}</b><span class="eq-s">personnes sur le terrain</span></div>
    <div class="eq-tile"><b>${soud}</b><span class="eq-s">soudures cette semaine</span></div></div></div>`;
}
function cChantiers(me){
  return `<div class="card"><h3>Chantiers</h3><div class="eq-list">${DATA.chantiers.filter(c=>!c.bureau).map(c=>{
    const n=Object.keys(DATA.affectations).filter(id=>DATA.affectations[id]===c.id&&pers(id).active).length,pc=c.soudures?Math.round((c.faites||0)/c.soudures*100):0;
    return `<div class="eq-row"><span class="eq-grow"><span class="eq-t">${esc(c.nom)}</span><span class="eq-s">${nb(c.faites||0)} / ${nb(c.soudures||0)} soudures${c.semaine!=null?' · '+c.semaine+' cette semaine':''} · ${n} personne${n>1?'s':''}</span><span class="eq-prog"><i style="width:${pc}%"></i></span></span><b>${pc} %</b></div>`}).join('')}</div></div>`;
}
function cAlertes(me){
  const hab=alertesHab(DATA.personnes,0).length;
  const pts=DATA.pointages.filter(x=>x.p!==me.id&&aValider(x,me)).length;
  const fins=DATA.personnes.filter(p=>p.contrat&&p.contrat.fin&&jours(p.contrat.fin)<=30).length;
  return `<div class="card"><h3>À surveiller</h3><div class="eq-list">
    <button class="eq-row" data-act="go" data-v="ech"><span class="eq-grow"><span class="eq-t">Habilitations expirées</span></span>${etat(hab?'bad':'ok',hab+' expirée'+(hab>1?'s':''))}</button>
    <button class="eq-row" data-act="go" data-v="valid"><span class="eq-grow"><span class="eq-t">Pointages à valider</span></span>${etat(pts?'warn':'ok',pts+' à valider')}</button>
    <button class="eq-row" data-act="go" data-v="annu"><span class="eq-grow"><span class="eq-t">Fins de mission sous 30 jours</span></span>${etat(fins?'warn':'ok',fins+' personne'+(fins>1?'s':''))}</button></div></div>`;
}

/* ── RÉCOMPENSES (SCR interne, détachable) : uniquement celles qui se voient sur l'avatar ── */
function cRecompenses(p){
  if(!DATA.config.recompenses||!avPoste(p))return '';
  const m=avM(p,'travail'),l=[];
  if(m.aRecompenses){l.push(['Production',m.progression+'. '+m.prochain],['Sécurité',m.etoilesTexte]);
    if(m.aGants)l.push(['Qualité',m.qualiteTexte]);
    if(m.aRadio)l.push(['Qualité',m.radioTexte]);
    if(m.aCadence)l.push(['Cadence',m.cadenceTexte])}
  l.push(['Ancienneté',m.medailleTexte]);
  return `<div class="card"><h3>Tes récompenses <span class="hint">· elles se voient sur ton avatar</span></h3><div>
    ${l.map(([a,b],i)=>`<div class="eq-kv"${i?'':' style="border-top:0"'}><span>${a}</span><span>${esc(b)}</span></div>`).join('')}</div>
    ${KIT?`<button class="btn eq-full" data-act="go" data-v="avatar">Voir sur ton avatar</button>`:''}</div>`;
}

/* ── Heures : ma semaine, historique, validation ── */
function cSemaine(p,titre){
  const js=semaine(),t=totSemaine(p.id);
  if(!ptsDe(p.id).length)return `<div class="card"><h3>${titre}</h3><div class="eq-s">Aucun pointage cette semaine.</div></div>`;
  return `<div class="card"><h3>${titre} <span class="hint">· du ${fDate(js[0]).slice(0,5)} au ${fDate(js[4]).slice(0,5)}</span></h3>
    <div class="eq-big">${fDuree(t.total)}</div>
    <div class="eq-s">travail ${fDuree(t.w)} · pause ${fDuree(t.pa)}${t.it?' · inter-chantier '+fDuree(t.it):''}</div>
    <div class="eq-list" style="margin-top:6px">${js.map(d=>htmlJour(p,d)).join('')}</div>
    <div class="eq-leg hint"><span><i></i>travail</span><span><i style="background:var(--muted)"></i>inter-chantier</span><span><i style="background:var(--plane)"></i>pause</span><span>Touche un jour pour le détail.</span></div></div>`;
}
/* Blocs de semaine : même présentation pour les productions et les heures */
const KMIN=-12; // profondeur d'historique de la maquette, en semaines
function moisDispo(){const m=new Set();for(let k=KMIN;k<=0;k++)semaineDe(k).forEach(d=>{if(d<=DATA.today)m.add(d.slice(0,7))});return [...m].sort()}
function semainesAff(){ // semaines à afficher, la plus récente d'abord, avec les jours retenus dans chacune
  const p=S.per,l=[];
  if(p.mode==='sem')return [{k:p.k,js:semaineDe(p.k)}];
  for(let k=0;k>=(p.mode==='12'?-11:KMIN);k--){const js=semaineDe(k).filter(d=>p.mode!=='mois'||d.slice(0,7)===p.m);if(js.length)l.push({k,js})}
  return l;
}
const periodeTxt=()=>{const p=S.per;return p.mode==='sem'?(p.k===0?'semaine en cours':'semaine '+numSemaine(semaineDe(p.k)[0])):p.mode==='mois'?fMois(p.m).toLowerCase():'12 dernières semaines'};
function chipsPeriode(){ // on se balade : semaine précise ou mois précis, avec ◀ ▶ et une liste pour sauter directement
  const p=S.per,ms=moisDispo();let nav='';
  if(p.mode==='sem'){const o=[];for(let k=0;k>=KMIN;k--){const js=semaineDe(k);o.push(`<option value="${k}"${k===p.k?' selected':''}>Semaine ${numSemaine(js[0])} · du ${fDate(js[0]).slice(0,5)} au ${fDate(js[4]).slice(0,5)}${k===0?' · en cours':''}</option>`)}
    nav=`<button class="btn" data-act="pernav" data-v="-1" aria-label="Semaine précédente"${p.k<=KMIN?' disabled':''}>◀</button><select class="f" data-chg="perk" aria-label="Choisir une semaine">${o.join('')}</select><button class="btn" data-act="pernav" data-v="1" aria-label="Semaine suivante"${p.k>=0?' disabled':''}>▶</button>`}
  if(p.mode==='mois'){const i=ms.indexOf(p.m);
    nav=`<button class="btn" data-act="pernav" data-v="-1" aria-label="Mois précédent"${i<=0?' disabled':''}>◀</button><select class="f" data-chg="perm" aria-label="Choisir un mois">${ms.slice().reverse().map(m=>`<option value="${m}"${m===p.m?' selected':''}>${fMois(m)}</option>`).join('')}</select><button class="btn" data-act="pernav" data-v="1" aria-label="Mois suivant"${i>=ms.length-1?' disabled':''}>▶</button>`}
  return `<div class="eq-filtres" style="padding-top:0">${[['sem','Semaine'],['mois','Mois'],['12','12 semaines']].map(([m,t])=>`<button class="chip${p.mode===m?' active':''}" data-act="periode" data-v="${m}">${t}</button>`).join('')}</div>${nav?`<div class="eq-nav">${nav}</div>`:''}`;
}
function blocSemaine(k,js,resume,droite,corps,ouvert){
  const cle=S.sub+'|'+S.per.mode+'|'+k,open=S.semOpen[cle]!=null?S.semOpen[cle]:ouvert;
  return `<div class="card eq-sem"><button class="eq-row eq-sem-h" data-act="sem" data-v="${cle}" aria-expanded="${open}"><span class="eq-grow"><span class="eq-t">Semaine ${numSemaine(js[0])}${k===0?' <span class="eq-tag">en cours</span>':''} <span class="eq-s">· du ${fDate(js[0]).slice(0,5)} au ${fDate(js[js.length-1]).slice(0,5)}</span></span><span class="eq-s">${esc(resume)}</span></span><span class="eq-right"><b>${droite}</b><span class="hint">${open?'▲ replier':'▼ jour par jour'}</span></span></button>${open?`<div class="eq-list">${corps}</div>`:''}</div>`;
}
function cHeuresPeriode(me){ // mes heures : total de la période puis un bloc par semaine, jour par jour dedans
  const T={total:0,pa:0,n:0},seul=S.per.mode==='sem';let blocs='';
  semainesAff().forEach(({k,js},i)=>{const t=totSemaine(me.id,k,js);if(!seul&&!t.n)return;
    T.total+=t.total;T.pa+=t.pa;T.n+=t.n;
    const st=[t.val&&t.val+' validé'+(t.val>1?'s':''),t.corr&&t.corr+' corrigé'+(t.corr>1?'s':''),t.att&&t.att+' à valider'].filter(Boolean).join(' · ');
    blocs+=blocSemaine(k,js,[t.n+' jour'+(t.n>1?'s':''),'pause '+fDuree(t.pa),st].filter(Boolean).join(' · '),fDuree(t.total),js.map(d=>htmlJour(me,d)).join(''),seul||!blocs)});
  return `<div class="card"><h3>Tes heures <span class="hint">· ${periodeTxt()}</span></h3><div class="eq-tiles">
    <div class="eq-tile"><b>${fDuree(T.total)}</b><span class="eq-s">travaillées</span></div><div class="eq-tile"><b>${T.n}</b><span class="eq-s">jour${T.n>1?'s':''} pointé${T.n>1?'s':''}</span></div><div class="eq-tile"><b>${fDuree(T.pa)}</b><span class="eq-s">de pause</span></div></div>
    <div class="eq-leg hint"><span><i></i>travail</span><span><i style="background:var(--muted)"></i>inter-chantier</span><span><i style="background:var(--plane)"></i>pause</span><span>Touche un jour pour le détail.</span></div></div>
    <div class="eq-sems">${blocs||'<div class="card"><div class="eq-s">Aucun pointage sur cette période.</div></div>'}</div>`;
}
function formCorr(x){
  const c=calc(x),def='end',h=c.fin?c.fin.slice(-5):'16:40';
  return `<div class="eq-form">
    <div><label class="f">Quoi corriger</label><select class="f" id="eq-corr-t">${['start','pause','resume','end'].map(t=>`<option value="${t}"${t===def?' selected':''}>Heure de ${EVT[t]}</option>`).join('')}</select></div>
    <div><label class="f">Heure corrigée</label><input class="f" type="time" id="eq-corr-h" value="${h}"></div>
    <div><label class="f">Motif</label><select class="f" id="eq-corr-m">${['Fin oubliée','Pause non pointée','Début pointé en retard','Mauvais chantier','Autre'].map(m=>`<option>${m}</option>`).join('')}</select></div>
    <div class="eq-acts"><button class="btn primary" data-act="corrok" data-v="${ptId(x)}">Enregistrer la correction</button><button class="btn" data-act="corrno">Annuler</button></div></div>`;
}
function htmlVRow(x,titre,sous,ouvre){
  const c=calc(x),st=statutPt(x),id=ptId(x),p=pers(x.p),moi=pers(S.me),peut=aValider(x,moi),att=niveau(moi)===2&&attendChef(x),prod=prodTxt(prodJour([x.p],x.d));
  const sansPause=c.fin&&c.total>=360&&!c.pa;const plage=c.debut?fHeure(c.debut)+' → '+(c.fin?fHeure(c.fin):'—')+' · '+fDuree(c.total)+(c.pa?' · pause '+fDuree(c.pa):sansPause?' · <span class="eq-tag" style="color:#7a5200;background:#fff4d6;border-color:#f0c76a">⚠ pas de pause pointée</span>':'')+(c.it?' · inter '+fDuree(c.it):''):'';
  return `<div class="eq-vrow"><div class="eq-row"${ouvre?` data-act="fiche" data-v="${p.id}"`:''}>${ouvre?avatar(p):''}<span class="eq-grow"><span class="eq-t">${titre}</span><span class="eq-s">${esc(sous?sous+' · ':'')}${plage}</span>
    ${x.corr?`<span class="eq-s">✏️ ${esc(EVT[x.corr.t]||'heure')} ${fHeure(x.corr.heure)}${x.corr.avant?' au lieu de '+fHeure(x.corr.avant):''} — ${esc(x.corr.motif)}</span>`:''}
    ${(()=>{const ms=missionsOf(netOf(x.site),x.d).filter(m=>!Array.isArray(m.who)||!m.who.length||m.who.includes(x.p));return ms.length?`<span class="eq-s">Objectif du jour : <b style="font-weight:600;color:var(--ink)">${esc(missionsTxt(ms))}</b> — ${esc(ms.map(m=>m.label).join(' · ')).slice(0,90)}${ms.every(m=>m.done)?' ✓':''}</span>`:'';})()}
    ${prod?`<span class="eq-s">Production du jour : <b style="font-weight:600;color:var(--ink)">${esc(prod)}</b></span>`:['soudeur','manchonneur'].includes(p.poste)&&c.fin?`<span class="eq-s" style="color:#9b2c22">⚠ aucune fiche de soudure ce jour-là — vérifie avant de valider</span>`:''}<span class="eq-s" style="margin-top:3px">${att&&!c.manque?etat('off','Attend le chef de chantier'):etat(st.k,st.mot)}</span></span></div>
    ${peut&&S.corr!==id?`<div class="eq-acts">${c.manque?'':`<button class="btn primary" data-act="valider" data-v="${id}">✅ Valider</button>`}<button class="btn${c.manque?' primary':''}" data-act="corr" data-v="${id}">✏️ Corriger</button></div>`:''}
    ${S.corr===id?formCorr(x):''}</div>`;
}
function cValidation(me){
  const ids=equipeIds(me),pts=DATA.pointages.filter(x=>ids.has(x.p)),pend=pts.filter(x=>aValider(x,me));
  const modes=`<div class="eq-filtres"><button class="chip${S.valMode==='jour'?' active':''}" data-act="valmode" data-v="jour">Par jour</button><button class="chip${S.valMode==='pers'?' active':''}" data-act="valmode" data-v="pers">Par personne</button></div>`;
  let corps='';
  if(S.valMode==='jour'){
    const js=semaine().filter(d=>d<=DATA.today);
    const d=S.valJour&&js.includes(S.valJour)?S.valJour:(pend.map(x=>x.d).sort().pop()||DATA.today);
    const duJour=pts.filter(x=>x.d===d).sort((a,b)=>a.site!==b.site?(a.site<b.site?1:-1):pers(a.p).nom<pers(b.p).nom?-1:1);
    const ok=duJour.filter(x=>aValider(x,me)&&!calc(x).manque);
    const absents=me.poste==='chef'?equipeDe(me).filter(p=>can(p,'pointage.self')).filter(p=>p.active&&!ptDe(p.id,d)):[];
    corps=`<div class="eq-filtres">${js.map(j=>{const n=pend.filter(x=>x.d===j).length;return `<button class="chip${j===d?' active':''}" data-act="valjour" data-v="${j}">${fJour(j)}${n?` <span class="eq-badge">${n}</span>`:''}</button>`}).join('')}</div>
      ${ok.length>1?`<button class="btn primary eq-full" style="margin:0 0 6px" data-act="toutvalider" data-v="${ok.map(ptId).join(',')}">✅ Tout valider (${ok.length})</button>`:''}
      <div class="eq-list">${[...new Set(duJour.map(x=>x.site))].map(i=>{const c=site(i),g=duJour.filter(x=>x.site===i); // une équipe par chantier
        return `<div class="eq-grp-h">📍 ${esc(c.nom)} <span class="hint">· ${g.length} pointage${g.length>1?'s':''}${c.chef?' · chef de chantier : '+esc(nomC(pers(c.chef))):''}</span></div>`+g.map(x=>htmlVRow(x,esc(nomC(pers(x.p)))+tagType(pers(x.p)),'',true)).join('')}).join('')}
      ${absents.map(p=>`<div class="eq-vrow"><div class="eq-row">${avatar(p)}<span class="eq-grow"><span class="eq-t">${esc(nomC(p))}</span></span>${etat('off','Pas de pointage')}</div></div>`).join('')}</div>
      ${duJour.length?'':`<div class="eq-s">Aucun pointage ce jour-là.</div>`}`;
  }else{
    const gens=[...ids].map(pers).filter(p=>pts.some(x=>x.p===p.id)).sort((a,b)=>(DATA.affectations[a.id]||'')<(DATA.affectations[b.id]||'')?1:-1); // rangés par chantier
    const cur=gens.find(p=>p.id===S.valPers)||gens.find(p=>pend.some(x=>x.p===p.id))||gens[0];
    if(cur){
      const sem=semaine().map(d=>ptDe(cur.id,d)).filter(Boolean),ok=sem.filter(x=>aValider(x,me)&&!calc(x).manque),t=totSemaine(cur.id);
      corps=`<div class="eq-filtres">${gens.map(p=>{const n=pend.filter(x=>x.p===p.id).length;return `<button class="chip${p.id===cur.id?' active':''}" data-act="valpers" data-v="${p.id}">${esc(p.prenom)}${n?` <span class="eq-badge">${n}</span>`:''}</button>`}).join('')}</div>
        <button class="eq-row" style="border-top:0" data-act="fiche" data-v="${cur.id}">${avatar(cur)}<span class="eq-grow"><span class="eq-t">${esc(nomC(cur))}${tagType(cur)}</span><span class="eq-s">${esc(poste(cur).label)} · semaine : ${fDuree(t.total)}</span></span></button>
        ${ok.length>1?`<button class="btn primary eq-full" style="margin:0 0 6px" data-act="toutvalider" data-v="${ok.map(ptId).join(',')}">✅ Valider la semaine (${ok.length})</button>`:''}
        <div class="eq-list">${sem.map(x=>htmlVRow(x,fJour(x.d),site(x.site).nom,false)).join('')}</div>`;
    }else corps=`<div class="eq-s">Aucun pointage dans ton équipe cette semaine.</div>`;
  }
  return `<div class="card"><h3>Pointages de l'équipe <span class="hint">· ${pend.length} à valider${niveau(me)===2?' · après le chef de chantier':''}</span></h3>${modes}${corps}</div>`;
}

/* ── Habilitations : les miennes, tableau d'équipe ── */
function cMesHabs(p,titre){
  const l=habsDe(p);
  return `<div class="card"><h3>${titre}</h3><div class="eq-list">${l.map(htmlHab).join('')}</div>
    <div class="hint" style="margin-top:6px">Une date fausse ou une pièce à ajouter ? Préviens les RH.</div></div>`;
}
function cTableHabs(me){
  let rows=[];equipeDe(me).forEach(p=>habsDe(p).forEach(x=>rows.push({p,...x})));
  const n={expiree:0,echeance:0,absente:0,valide:0};rows.forEach(r=>n[r.etat]++);
  const f=S.habF;
  rows=rows.filter(r=>f==='toutes'||(f==='traiter'?r.etat!=='valide':r.etat===f)).sort((a,b)=>a.rang-b.rang);
  const F=[['traiter','À traiter',n.expiree+n.echeance+n.absente],['expiree','Expirées',n.expiree],['echeance','Moins de '+DATA.config.seuilEcheance+' j',n.echeance],['absente','Absentes',n.absente],['toutes','Toutes',n.expiree+n.echeance+n.absente+n.valide]];
  return `<div class="card"><h3>Échéances de l'équipe <span class="hint">· triées par urgence</span></h3>
    <div class="eq-filtres">${F.map(([k,t,c])=>`<button class="chip${f===k?' active':''}" data-act="habf" data-v="${k}">${t} · ${c}</button>`).join('')}</div>
    <div class="eq-list"><div class="eq-trow eq-thead"><span></span><span>Personne</span><span>Habilitation</span><span>Échéance</span><span>État</span></div>
    ${rows.map(r=>{const h=r.h,piece=h?(h.piece==='pdf'?' · 📎':h.piece==='photo'?' · 📷':' · sans pièce'):'';
      return `<button class="eq-trow" data-act="fiche" data-v="${r.p.id}"><span class="eq-c-av">${avatar(r.p)}</span>
      <span class="eq-c-p"><span class="eq-t">${esc(nomC(r.p))}</span></span>
      <span class="eq-c-h">${esc(DATA.habTypes[r.type].label)}<span class="eq-s" style="display:inline">${h&&h.num?' · n° '+esc(h.num):''}${piece}</span></span>
      <span class="eq-c-d">${h&&h.fin?fDate(h.fin):'—'}</span><span class="eq-c-e">${etat(HK[r.etat],reste(r))}</span></button>`}).join('')}</div>
    ${rows.length?'':`<div class="eq-s">Rien dans ce filtre.</div>`}</div>`;
}

/* ── Entreprise : tout le monde, par poste, avec nom et avatar ── */
function listeEnt(me){
  const q=S.q.trim().toLowerCase(),scr=KIT;
  let l=visibles(me);
  if(S.fFam)l=l.filter(p=>poste(p).fam===S.fFam);
  if(S.fSite)l=l.filter(p=>planDe(p.id,DATA.today).includes(S.fSite));
  if(q)l=l.filter(p=>(nomC(p)+' '+poste(p).label).toLowerCase().includes(q));
  if(!l.length)return `<div class="card"><div class="eq-s">Personne ne correspond.</div></div>`;
  return '<div class="eq-ents">'+Object.keys(DATA.postes).map(k=>{ // DATA.postes est déjà rangé par famille : direction, encadrement, terrain, support
    const g=l.filter(p=>p.poste===k).sort((a,b)=>a.nom<b.nom?-1:1);if(!g.length)return '';
    return `<div class="card eq-ent-g"><div class="eq-ent-t" style="max-width:${Math.min(g.length,3)*104-6}px"><i class="eq-dot" style="background:${DATA.familles[DATA.postes[k].fam].couleur}"></i> ${esc(DATA.postes[k].label)} <span class="hint">· ${g.length}</span></div><div class="eq-ent">${g.map(p=>
      `<button class="eq-pers" data-act="fiche" data-v="${p.id}">${scr&&avPoste(p)?figure(avM(p,S.entVue),72):avatar(p,'eq-lg')}<span><b>${esc(p.prenom)}</b><br>${esc(p.nom)}${p.admin?' ★':''}</span>${p.type==='interim'?'<span class="eq-tag">Intérim</span>':''}${p.invite?'<span class="eq-tag">Invité</span>':''}${p.id===me.id?'<span class="eq-tag">Toi</span>':''}</button>`).join('')}</div></div>`}).join('')+'</div>';
}
function vEntreprise(me){
  const vis=visibles(me),interim=me.type==='interim',scr=KIT;
  const sites=[...new Set(vis.flatMap(p=>planDe(p.id,DATA.today)))];
  return `<h2 class="vt">${interim?'Ton chantier':'Entreprise'} <span class="hint">· ${vis.length} personne${vis.length>1?'s':''} · par poste</span></h2>
    ${interim?`<div class="hint" style="margin-bottom:8px">Tu vois l'équipe de ton chantier.</div>`:''}
    <div class="card">${scr?`<div class="eq-filtres" style="padding-top:0">${[['travail','🦺 Tenue de travail'],['perso','👕 Hors travail']].map(([v,t])=>`<button class="chip${S.entVue===v?' active':''}" data-act="entvue" data-v="${v}" aria-pressed="${S.entVue===v}">${t}</button>`).join('')}</div>`:''}
      <input class="f" id="eq-q" type="search" placeholder="🔎 Nom ou poste" value="${esc(S.q)}">
      ${interim?'':`<div class="eq-filtres">${[['','Toutes']].concat(Object.keys(DATA.familles).filter(k=>k!=='exterieur').map(k=>[k,DATA.familles[k].label])).map(([k,t])=>`<button class="chip${S.fFam===k?' active':''}" data-act="ffam" data-v="${k}">${k?`<i class="eq-dot" style="background:${DATA.familles[k].couleur}"></i>`:''}${t}</button>`).join('')}</div>
      <select class="f" data-chg="fSite" aria-label="Chantier du jour"><option value="">Tous les chantiers</option>${sites.map(k=>`<option value="${k}"${S.fSite===k?' selected':''}>${esc(site(k).nom)}</option>`).join('')}</select>`}
      <div class="hint" style="margin-top:6px">Touche une personne pour voir sa fiche et l'appeler.</div></div>
    ${(accueilType(me)==='rh'||accueilType(me)==='direction'||me.admin)&&!interim?cAnciennete(me):''}
    <div id="eq-annu-liste">${listeEnt(me)}</div>`;
}
/* ── ancienneté & médailles (RH, direction) : date d'entrée de la fiche RH → années, prochain palier (5, 10, 15, 20…), médaille d'honneur du travail (20 / 30 / 35 / 40 ans de carrière — toutes entreprises : les RH complètent) ── */
function cAnciennete(me){const L=DATA.personnes.filter(p=>p.active&&p.entree).map(p=>({p,a:anciennete(p.entree,DATA.today)})).filter(x=>x.a).sort((x,y)=>String(x.p.entree)<String(y.p.entree)?-1:1);if(!L.length)return '';
  const soon=L.filter(x=>x.a.jours!==null&&x.a.jours>=0&&x.a.jours<=180).sort((x,y)=>x.a.jours-y.a.jours);
  return `<div class="card"><h3>Ancienneté & médailles <span class="hint">· ${L.length} fiches avec date d'entrée</span></h3>
    ${soon.length?`<div class="eq-lab">Paliers dans les 6 mois</div><div class="eq-list">${soon.map(x=>`<div class="eq-row"><span class="eq-grow"><span class="eq-t">${esc(nomC(x.p))} — <b>${x.a.next} ans</b> le ${fDate(x.a.nextAt)}</span><span class="eq-s">entré le ${fDate(x.p.entree)} · ${x.a.ans} ans aujourd'hui${x.a.next>=20?' · médaille d\'honneur du travail possible (vérifier la carrière totale)':''}</span></span></div>`).join('')}</div>`:'<div class="eq-s">Aucun palier d\'ancienneté dans les 6 mois.</div>'}
    <details style="margin-top:6px"><summary class="eq-s" style="cursor:pointer">Toutes les anciennetés (${L.length})</summary><div class="eq-list" style="margin-top:4px">${L.map(x=>`<div class="eq-row"><span class="eq-grow"><span class="eq-t">${esc(nomC(x.p))} <span class="eq-s">· ${esc(x.p.emploi||(POSTES_ESP[x.p.poste]||{}).label||'')}</span></span><span class="eq-s">entré le ${fDate(x.p.entree)} · <b>${x.a.ans} an${x.a.ans>1?'s':''}</b>${x.a.next?' · prochain palier '+x.a.next+' ans le '+fDate(x.a.nextAt):''}${x.a.medaille?' · médaille '+x.a.medaille:''}</span></span></div>`).join('')}</div></details>
    <div class="hint" style="margin-top:6px">Paliers internes 5 / 10 / 15 / 20… ans à partir de la date d'entrée SCR (fiche RH, import de la liste du personnel). La médaille d'honneur du travail (argent 20 ans, vermeil 30, or 35, grand or 40) compte toute la carrière : à confirmer par les RH.</div></div>`;}

/* ── Planning : ma semaine, jour par jour, avec qui je suis et les responsables du chantier ── */
function htmlPersRow(p,sous){
  return `<div class="eq-row" role="button" tabindex="0" data-act="fiche" data-v="${p.id}">${avatar(p)}<span class="eq-grow"><span class="eq-t">${esc(nomC(p))}${tagType(p)}</span><span class="eq-s">${esc(sous)}${p.invite?' · pas encore connecté':''}</span></span><a class="btn eq-tel" data-act="tel" href="tel:${(p.tel||'').replace(/ /g,'')}" title="Appeler ${esc(p.prenom)}">📞</a></div>`;
}
/* La scène : le chantier, la météo, moi dans ma tenue du jour et mon équipe dans la sienne */
function scene(me,d,i){
  const c=site(i),mt=meteoDe(i,d),M=mt?METEO[mt.k]:null,scr=KIT;
  const eq=DATA.personnes.filter(p=>p.id!==me.id&&(p.active||p.invite)&&planDe(p.id,d).includes(i)).sort((a,b)=>(b.id===c.chef)-(a.id===c.chef));
  const perso=(p,t,moi)=>`<button class="eq-scene-p${moi?' eq-moi':''}" data-act="${moi?'go':'fiche'}" data-v="${moi?'avatar':p.id}">${scr&&avPoste(p)?figure(avJour(p,d,i),t,true):avatar(p,'eq-lg')}<span>${moi?'Toi':esc(p.prenom)}</span></button>`;
  return `<div class="eq-scene" style="background:${M?M[2]:'var(--plane)'}">
    <div class="eq-scene-top"><span class="eq-grow"><span class="eq-big">📍 ${esc(c.nom)}</span><span class="eq-s">${esc(c.ville)}${c.soudures?' · '+Math.round((c.faites||0)/c.soudures*100)+' % des soudures faites':''}</span></span>
      ${M?`<span class="eq-meteo"><span class="eq-meteo-i">${M[0]}</span><span><b>${M[1]}</b>${mt.t} °C</span></span>`:''}</div>
    <div class="eq-scene-sol">${perso(me,96,true)}${eq.map(p=>perso(p,58)).join('')}</div></div>`;
}
/* Accueil : la carte « Aujourd'hui » */
function cAujourdhui(me){
  const ids=planDe(me.id,DATA.today),i=ids[0];
  if(!KIT||!avPoste(me)||!i)return cIdent(me);
  return `<div class="card"><h3>Aujourd'hui <span class="hint">· ${fJour(DATA.today)}</span></h3>
    <div class="eq-name">${esc(nomC(me))}${me.admin?' ★':''}</div>
    <div class="eq-etat"><i class="eq-dot" style="background:${famille(me).couleur}"></i>${esc(poste(me).label)} · ${famille(me).label}${me.type==='interim'?' · intérimaire'+(me.contrat&&me.contrat.fin?', mission jusqu\'au '+fDate(me.contrat.fin):''):''}</div>
    ${ids.map((x,n)=>(ids.length>1?`<div class="eq-lab">Chantier ${n+1} sur ${ids.length}</div>`:'')+scene(me,DATA.today,x)).join('')}
    <div class="eq-acts" style="margin:10px 0 0"><button class="btn primary" data-act="go" data-v="planning">Voir ta semaine</button><button class="btn" data-act="go" data-v="avatar">🎨 Mon avatar</button></div></div>`;
}
/* Ta semaine : une tuile par jour (météo, ma tenue ce jour-là), puis le détail du jour choisi */
function tuileJour(me,d,sel){
  const ids=planDe(me.id,d),i=ids[0],mt=i?meteoDe(i,d):null,M=mt?METEO[mt.k]:null;
  return `<button class="eq-jour" data-act="planjour" data-v="${d}" aria-pressed="${sel}"><span>${fJour(d).slice(0,4)}</span><b>${d.slice(8,10)}</b>
    <span class="eq-jour-m">${M?M[0]:'·'}</span><span class="eq-s">${mt?mt.t+' °C':i?'—':'repos'}</span>
    ${i&&KIT&&avPoste(me)?`<span class="eq-av">${avatarMedaillon(avJour(me,d,i).cfg,40,M?M[2]:'#E3E8EF')}</span>`:''}
    ${ids.map(x=>{const c=site(x),n=c.nom.split(' — ');return `<span class="eq-jour-c"><b>${esc(n[0])}</b>${n[1]?'<br>'+esc(n[1]):c.nom.includes(c.ville)||c.bureau?'':'<br>'+esc(c.ville)}</span>`}).join('')}
    ${d===DATA.today?'<span class="eq-tag">auj.</span>':''}</button>`;
}
function cJour(me,d){
  const ids=planDe(me.id,d),auj=d===DATA.today;
  const corps=ids.map((i,n)=>{
    const c=site(i),avec=avecMoi(me,i,d);
    const resp=[[c.chef,'Chef de chantier'],[c.conducteur,'Conducteur de travaux']].filter(x=>x[0]&&x[0]!==me.id);
    return `<div class="eq-plan-site">${ids.length>1?`<div class="eq-lab" style="margin-top:0">Chantier ${n+1} sur ${ids.length}</div>`:''}${scene(me,d,i)}
      ${resp.length?`<div class="eq-lab">Responsables du chantier</div><div class="eq-list">${resp.map(([id,role])=>htmlPersRow(pers(id),role)).join('')}</div>`:''}
      <div class="eq-lab">Tes compagnons · ${avec.length}</div>
      <div class="eq-list">${avec.map(p=>htmlPersRow(p,poste(p).label)).join('')||'<div class="eq-s">Personne d\'autre de prévu.</div>'}</div>
      ${c.bureau?'':`<button class="btn eq-full" data-act="opensite" data-v="${esc(c.id)}">Ouvrir le chantier</button>`}</div>`}).join('');
  const rdv=((DATA.agenda||{})[me.id]||[]).filter(a=>a.d===d).sort((a,b)=>a.h<b.h?-1:1); // agenda que la personne se définit elle-même (conducteur)
  return `<div class="card"><h3>${auj?'Aujourd\'hui':'Ce jour-là'} <span class="hint">· ${fJour(d)}${ids.length>1?' · '+ids.length+' chantiers dans la journée':''}</span></h3>
    ${rdv.length?`<div class="eq-lab" style="margin-top:0">Tes rendez-vous</div><div class="eq-list">${rdv.map(a=>`<div class="eq-row" style="min-height:44px"><b>${fHeure('T'+a.h)}</b><span class="eq-grow"><span class="eq-t" style="font-weight:400">${esc(a.titre)}</span><span class="eq-s">📍 ${esc(site(a.site).nom)}</span></span></div>`).join('')}</div>`:''}
    ${corps||'<div class="eq-s">Pas de chantier prévu.</div>'}</div>`;
}
function vPlanning(me){
  const k=S.planSem,js=semaineDe(k),sel=js.includes(S.planJour)?S.planJour:js.includes(DATA.today)?DATA.today:js[0];
  return `<h2 class="vt">Ta semaine <span class="hint">· semaine ${numSemaine(js[0])} · du ${fDate(js[0]).slice(0,5)} au ${fDate(js[4])}</span></h2>
    <div class="eq-filtres" style="padding-top:0">${[[0,'Cette semaine'],[1,'Semaine prochaine']].map(([n,t])=>`<button class="chip${k===n?' active':''}" data-act="plansem" data-v="${n}">${t}</button>`).join('')}</div>
    <div class="eq-semaine">${js.map(d=>tuileJour(me,d,d===sel)).join('')}</div>
    ${me.poste==='conducteur'?`<div class="card"><div class="eq-s">Ton planning n'est pas imposé : c'est toi qui le définis (chantiers, réunions).</div><button class="btn eq-full" data-act="sim" data-v="Conception du planning : section à venir">✏️ Organiser ma semaine</button></div>`:''}
    <div class="eq-cols eq-2"><div>${cJour(me,sel)}</div><div>${cChantiersSemaine(me,k,false)}</div></div>`;
}
/* ── Productions : récap sur la période choisie, présenté en blocs de semaine ── */
function vProd(me){
  if(ENCADRE.includes(me.poste))return vProdEquipe(me);
  const ids=prodIds(me)||[],seul=S.per.mode==='sem',tot={};let blocs='';
  semainesAff().forEach(({k,js})=>{const ts={};
    const rows=js.map(d=>{const o=d>DATA.today?null:prodJour(ids,d);
      if(o){addProd(ts,o);addProd(tot,o)}
      const st=planDe(me.id,d).map(i=>site(i).nom).join(' puis ');
      return `<div class="eq-row"><span class="eq-grow"><span class="eq-t">${fJour(d)}${d===DATA.today?' <span class="eq-tag">aujourd\'hui</span>':''} <span class="eq-s">${st?'· '+esc(st):''}</span></span><span class="eq-prodl">${d>DATA.today?'<span class="hint">À venir</span>':esc(prodTxt(o))||'<span class="hint">Rien de compté</span>'}</span></span></div>`}).join('');
    if(seul||Object.keys(ts).length)blocs+=blocSemaine(k,js,Object.keys(PROD).filter(x=>ts[x]).map(x=>nb(ts[x])+' '+PROD[x][ts[x]>1?1:0]).join(' · ')||'Rien de compté','',rows,seul||!blocs)});
  const cles=Object.keys(PROD).filter(x=>tot[x]);
  return `<h2 class="vt">Tes productions</h2>${chipsPeriode()}
    <div class="card"><h3>Total <span class="hint">· ${periodeTxt()}</span></h3>
      ${cles.length?`<div class="eq-tiles">${cles.map(x=>`<div class="eq-tile"><b>${nb(tot[x])}</b><span class="eq-s">${PROD[x][tot[x]>1?1:0]}${x==='pouces'&&me.poste==='tuyauteur'?' de ton soudeur':''}</span></div>`).join('')}</div>${tot.dn?`<div class="eq-lab">Soudures par DN</div>${dnChips(tot.dn)}`:''}${tot.mdn?`<div class="eq-lab">Manchons · DN tube / enveloppe</div>${dnChips(tot.mdn)}`:''}`:'<div class="eq-s">Rien de compté sur la période.</div>'}
      <div class="hint" style="margin-top:8px">Compté sur le plan, à ton nom. Une erreur ? Vois avec ton chef de chantier.</div></div>
    <div class="eq-sems">${blocs}</div>`;
}
/* Chef de chantier et conducteur : la production de l'équipe, par chantier puis par personne.
   Soudeur = soudures par DN ; manchonneur = fils, rétractions, bouchons ; jamais seulement des pouces. */
function vProdEquipe(me,idsOpt){
  const ids=idsOpt||prodIds(me)||[],jours=semainesAff().flatMap(x=>x.js).filter(d=>d<=DATA.today).sort(),tot={};
  const par={};ids.forEach(id=>{par[id]={};jours.forEach(d=>addProd(par[id],prodJour([id],d)));addProd(tot,pers(id).poste==='tuyauteur'?{}:par[id])});
  const siteOf=id=>planDe(id,DATA.today)[0]||null;const sites=[...new Set(ids.map(siteOf))];
  const cles=Object.keys(PROD).filter(x=>tot[x]);
  const ligne=o=>Object.keys(PROD).filter(x=>o[x]).map(x=>nb(o[x])+' '+PROD[x][o[x]>1?1:0]).join(' · ');
  return `<h2 class="vt">Productions de ton équipe</h2>${chipsPeriode()}
    <div class="card"><h3>Total <span class="hint">· ${periodeTxt()} · ${ids.length} opérateur${ids.length>1?'s':''}${sites.length>1?' · '+sites.length+' chantiers':''}</span></h3>
      ${cles.length?`<div class="eq-tiles">${cles.map(x=>`<div class="eq-tile"><b>${nb(tot[x])}</b><span class="eq-s">${PROD[x][tot[x]>1?1:0]}</span></div>`).join('')}</div>
      ${tot.dn?`<div class="eq-lab">Soudures par DN</div>${dnChips(tot.dn)}`:''}${tot.mdn?`<div class="eq-lab">Manchons · DN tube / enveloppe</div>${dnChips(tot.mdn)}`:''}`:'<div class="eq-s">Rien de compté sur la période.</div>'}</div>
    <div class="eq-sems">${sites.map(i=>{const g=ids.filter(id=>siteOf(id)===i).map(pers);
      return `<div class="card"><h3>📍 ${esc(site(i).nom)} <span class="hint">· ${g.length} opérateur${g.length>1?'s':''}</span></h3><div class="eq-list">${g.map(p=>{
        const o=par[p.id],cle='prod|'+p.id,open=S.open[cle];
        return `<div class="eq-vrow"><button class="eq-row" data-act="jour" data-v="${cle}" aria-expanded="${!!open}">${avatar(p)}<span class="eq-grow"><span class="eq-t">${esc(nomC(p))}${tagType(p)} <span class="eq-s">· ${esc(poste(p).label)}</span></span>
          <span class="eq-prodl">${esc(ligne(o))||'<span class="hint">Rien de compté</span>'}${p.poste==='tuyauteur'&&o.pouces?' <span class="hint">de son soudeur</span>':''}</span>${dnChips(o.dn)}${dnChips(o.mdn)}</span><span class="hint">${open?'▲':'▼'}</span></button>
          ${open?`<div class="eq-detail" style="flex-basis:100%">${jours.slice().reverse().map(d=>`<div><b>${fJour(d)}</b> · ${esc(prodTxt(prodJour([p.id],d)))||'rien de compté'}</div>`).join('')}</div>`:''}</div>`}).join('')}</div></div>`}).join('')}</div>
    <div class="hint">Touche une personne pour le détail jour par jour.</div>`;
}
/* ── Fiche d'une autre personne : ce qu'on voit dépend des droits ── */
function blocsFiche(p,me){
  const moi=p.id===me.id,dEdit=can(me,'dossier.edit'),qse=can(me,'qse.manage'),val=can(me,'pointage.validate')&&equipeIds(me).has(p.id);
  const c=siteJour(p),chef=chefDe(p),u=p.urgence,B=[];
  B.push(cIdent(p,!moi)+`<div class="card"><h3>Coordonnées</h3><div>
    <div class="eq-kv" style="border-top:0"><span>Téléphone</span><span>${esc(p.tel)}</span></div>
    <div class="eq-kv"><span>E-mail</span><span>${esc(p.email)}</span></div>
    <div class="eq-kv"><span>Chantier du jour</span><span>${c?esc(c.nom):'—'}</span></div>
    <div class="eq-kv"><span>Chef de chantier</span><span>${chef?esc(nomC(chef)):'—'}</span></div></div></div>`);
  if(dEdit||val||moi)B.push(`<div class="card"><h3>Contrat et urgence</h3><div>
    ${dEdit||moi?`<div class="eq-kv" style="border-top:0"><span>Date d'entrée</span><span>${fDate(p.entree)}</span></div><div class="eq-kv"><span>Contrat</span><span>${esc(contratTxt(p))}</span></div>`:''}
    <div class="eq-kv"${dEdit||moi?'':' style="border-top:0"'}><span>Contact d'urgence</span><span>${u?esc(u.nom)+' ('+esc(u.lien)+') · '+esc(u.tel):etat('warn','À renseigner')}</span></div></div>
    ${dEdit&&!moi?`<button class="btn eq-full" data-act="sim" data-v="Modification de la fiche par les RH">✏️ Modifier la fiche</button>`:''}</div>`);
  if(qse||moi)B.push(`<div class="card"><h3>Habilitations</h3><div class="eq-list">${habsDe(p).map(htmlHab).join('')}</div>
    ${qse?`<div class="eq-acts" style="margin:8px 0 0"><button class="btn" data-act="sim" data-v="Modifier une échéance : date + pièce jointe">✏️ Modifier une échéance</button><button class="btn" data-act="sim" data-v="Ajouter une pièce : photo ou PDF">📎 Ajouter une pièce</button></div>`:''}</div>`);
  if(val)B.push(cSemaine(p,'Heures de la semaine'));
  if(dEdit)B.push(`<div class="card"><h3>Documents</h3><div class="eq-list">${((DATA.documents||{})[p.id]||[]).map(d=>`<div class="eq-row"><span class="eq-grow"><span class="eq-t">${d.type==='pdf'?'📎':'📷'} ${esc(d.nom)}</span><span class="eq-s">Déposé le ${fDate(d.date)}</span></span></div>`).join('')||'<div class="eq-s">Aucun document.</div>'}</div>
    <button class="btn eq-full" data-act="sim" data-v="Dépôt d'un document : contrat, qualification, carte BTP…">📎 Déposer un document</button></div>`);
  return B;
}
function pageFiche(p,me){
  const B=blocsFiche(p,me);
  return `<button class="btn" style="margin-bottom:10px" data-act="close">← Retour</button>
    <div class="eq-cols"><div>${B.slice(0,2).join('')}</div><div>${B.slice(2,3).join('')}</div><div>${B.slice(3).join('')}</div></div>`;
}

/* ── Écran « Mon avatar » : mêmes options que avatar-scr-editeur.html, habillage TRACÉ ── */
let AVA=[];                                             // patchs des options affichées (un clic = un patch appliqué au profil)
const avA=patch=>AVA.push(patch)-1;
const avCrop=(cfg,w,h,t,l,tp,r)=>`<span class="eq-crop" style="width:${w}px;height:${h}px;border-radius:${r}"><span style="left:${l}px;top:${tp}px">${avatarSVG(cfg,t)}</span></span>`;
const avGrp=(titre,html)=>html?`<div><div class="eq-lab">${esc(titre)}</div><div class="eq-opts">${html}</div></div>`:'';
const avChips=l=>l.map(o=>`<button class="chip${o.sel?' active':''}" data-act="av" data-v="${avA(o.patch)}" aria-pressed="${!!o.sel}"${o.bloque?' disabled':''}>${esc(o.label)}</button>`).join('');
const avSw=l=>l.map(o=>`<button class="eq-sw" data-act="av" data-v="${avA(o.patch)}" aria-label="${esc(o.label)}" title="${esc(o.label)}" aria-pressed="${!!o.sel}"><i style="background:${o.hex}"></i></button>`).join('');
const CADRAGES={tete:[64,64,130,-33,-9,'50%'],barbe:[64,64,130,-33,-14,'50%'],buste:[72,80,120,-24,-48,'10px'],jambes:[60,84,100,-20,-88,'10px'],
  pieds:[72,44,150,-39,-206,'10px'],hanches:[84,100,100,-8,-24,'10px'],coiffure:[58,58,118,-30,-8,'50%'],casque:[64,64,130,-33,-4,'50%']};
const avTh=(l,cad,w)=>{const c=CADRAGES[cad];return l.map(o=>`<button class="eq-th${w?' eq-'+w:''}" data-act="av" data-v="${avA(o.patch)}" aria-pressed="${!!o.sel}">${avCrop(o.cfg,c[0],c[1],c[2],c[3],c[4],c[5])}<span>${esc(o.label)}</span></button>`).join('')};
const avPal=l=>l.map(o=>`<button class="eq-pal" data-act="av" data-v="${avA(o.patch)}" aria-pressed="${!!o.sel}"${o.bloque?' disabled':''}><i style="background:${o.hex}"></i><span>${esc(o.label)}<small>${esc(o.info)}</small></span></button>`).join('');
function avDonnees(me){const pr=avProfil(me),d={};Object.keys(AV.profilInitial()).forEach(k=>{if(k!=='vue')d[k]=pr[k]});return d}

function avPrev(me){ // aperçu, toujours visible pendant qu'on modifie (collé en haut sur téléphone, colonne fixe en large)
  const m=avMe(me),g=m.groupes;
  return `<div class="card eq-av-prev"><div class="eq-only-tel">${figure(m,88)}</div><div class="eq-only-large">${figure(m,200)}</div>
    <div class="eq-av-meta"><span class="eq-pill">${esc(m.poste.label)}</span><div class="eq-s">${esc(m.vueTexte)}</div>
      <div class="eq-opts">${avChips(g.vues)}</div>
      <div class="eq-only-large">${avRendu(m)}</div></div></div>`;
}
function avRendu(m){return `<div class="eq-meds"><span class="eq-av">${avatarMedaillon(m.cfg,96,m.fond,m.cadre)}</span><span class="eq-av">${avatarMedaillon(m.cfg,48,m.fond)}</span><span class="eq-av">${avatarMedaillon(m.cfg,32,m.fond)}</span></div>
  <div class="eq-s">Photo de profil, listes d'équipe et planning. Le cadre prend la couleur du palier atteint.</div>`}
function avSide(me){ // Poste · Visage · Tenue · Récompenses
  const m=avMe(me),g=m.groupes;
  let tenue='';
  if(m.verrou)tenue+=`<div class="eq-box"><b>Tenue de chantier et casque imposés, adaptés à la météo du jour</b><span class="eq-s">${esc(m.epi)}</span></div>`;
  if(m.tenueVisible)tenue+=avGrp('Haut',avTh(g.hauts,'buste','l'))+avGrp('Teinte du haut',avSw(g.hautTeintes))+avGrp('Bas',avTh(g.bas,'jambes','l'))+avGrp('Teinte du bas',avSw(g.basTeintes))
    +avGrp('Chaussures',avTh(g.chaussures,'pieds','l'))+avGrp('Teinte des chaussures',avSw(g.chaussuresTeintes))+avGrp('Accessoire',avTh(g.accessoires,'hanches','xl'));
  tenue+=avGrp('Casque',avTh(g.casques,'casque','l'))+avGrp('Sur la tête',avTh(g.coiffes,'tete','l'));
  tenue+=avGrp('Bandana · accessoire en option',avChips(g.bandanaBascule));
  if(m.aBandana)tenue+=`<div><div class="eq-s" style="margin:8px 0">${esc(m.bandanaTexte)}</div><div class="eq-opts">${g.bandanas.map(o=>`<button class="eq-tri" data-act="av" data-v="${avA(o.patch)}" aria-label="${esc(o.label)}" title="${esc(o.label)}" aria-pressed="${!!o.sel}"><span><i style="background:${o.c1}"></i><i style="background:${o.c2}"></i><i style="background:${o.c3}"></i></span></button>`).join('')}</div>
    <label class="f">Aux couleurs d'un pays</label><select class="f" data-chg="avpays"><option value="">Choisir un pays</option>${g.bandanaPays.map(o=>`<option value="${o.id}"${o.sel?' selected':''}>${esc(o.label)}</option>`).join('')}</select></div>`;
  const medaille=`<div><div class="eq-lab">Médaille d'ancienneté · au choix</div><div class="eq-s" style="margin-bottom:8px">${esc(m.medailleTexte)} Elle se porte en tenue de travail uniquement, jamais hors travail.</div><div class="eq-opts">${avChips(g.medailleBascule)}</div>
    <div class="eq-opts" style="margin-top:8px">${g.medailleNiveaux.map(o=>`<div class="eq-niv" aria-current="${!!o.sel}">${avCrop(o.cfg,76,76,300,-81,-164,'10px')}<span>${esc(o.label)}</span><small>${esc(o.info)}</small></div>`).join('')}</div></div>`;
  const gants=m.aGants?`<div><div class="eq-lab">${esc(m.gantsTitre)}</div><div class="eq-s" style="margin-bottom:8px">${esc(m.qualiteTexte)}</div><div class="eq-opts">${avPal(g.paliersGants)}</div></div>`:'';
  return `<div class="card"><h3>Poste</h3><div class="eq-big">${esc(m.poste.label)}</div><div class="hint">🔑 Attribué par l'administrateur, il fixe la tenue de travail.</div></div>
    <div class="card"><h3>Visage</h3><div class="eq-two">${avGrp('Silhouette',avChips(g.genres))}${avGrp('Teint',avSw(g.peaux))}${avGrp('Couleur cheveux et barbe',avSw(g.couleurs))}</div>
      ${avGrp('Coiffure',avTh(g.coiffures,'coiffure','s'))}${avGrp('Barbe',avTh(g.barbes,'barbe','l'))}${avGrp('Lunettes',avTh(g.lunettes,'tete','l'))}${avGrp('En bouche',avTh(g.bouches,'barbe','l'))}</div>
    <div class="card"><h3>Tenue <span class="hint">· ${m.perso?'hors travail':'au travail'}</span></h3><div class="eq-opts">${avChips(g.vues)}</div>${tenue}</div>
    <div class="card"><h3>Récompenses</h3>${m.aRecompenses?`<div class="eq-box"><b>${esc(m.progression)}</b><span class="eq-s">${esc(m.prochain)}</span><span class="eq-s">${esc(m.etoilesTexte)}</span></div>`
      +avGrp(m.palierTitre,avPal(g.paliers))+gants
      +(m.aRadio?`<div><div class="eq-lab">Masque de soudage · qualité, radios conformes</div><div class="eq-s" style="margin-bottom:8px">${esc(m.radioTexte)}</div><div class="eq-opts">${avPal(g.paliersRadio)}</div></div>`:'')
      +(m.aCadence?`<div><div class="eq-lab">${esc(m.cadenceTitre)}</div><div class="eq-s" style="margin-bottom:8px">${esc(m.cadenceTexte)}</div><div class="eq-opts">${avPal(g.paliersCadence)}</div></div>`:'')
      :`<div class="eq-s">Pas de récompenses de production sur ce poste.</div>`}
      ${medaille}${avGrp('Fond du médaillon',avSw(g.fonds))}</div>
    <div class="card eq-only-tel"><h3>Rendu dans l'appli</h3>${avRendu(m)}</div>`;
}
function vAvatar(me){
  AVA=[];
  return `<h2 class="vt">Mon avatar <span class="hint">· Mon compte · Profil</span></h2>
    <div class="eq-acts"><button class="btn" data-act="avhasard">🎲 Au hasard</button><button class="btn" data-act="avreinit">Réinitialiser</button></div>
    <div class="hint" style="margin-bottom:8px">Dans l'appli, la tenue affichée suit ${can(me,'pointage.self')?'ton pointage : tenue de travail pendant les heures pointées':'les horaires : tenue de travail en journée'}, tenue perso sinon.</div>
    <div class="eq-av-wrap"><div class="eq-av-col" id="eq-av-prev">${avPrev(me)}</div><div><div id="eq-av-side">${avSide(me)}</div><div class="hint" style="margin:6px 0 14px">Enregistré au fur et à mesure sur ton compte.</div></div></div>`;
}
function avApply(me,patch){AVM={};const pr=DATA.avatars[me.id]||(DATA.avatars[me.id]={});const sv={};
  for(const k in patch){if(k==='vue')S.avVue=patch[k];else{pr[k]=patch[k];sv[k]=patch[k]}}
  if(Object.keys(sv).length)savePeoplePart(me.id,'avatar',Object.assign({},pr)); /* enregistré sur le compte (fusion côté serveur) */}

/* ── Vues ── */

/* ── Vues : accueil, heures, habilitations ── */
function vMoi(me){
  const t=accueilType(me);let a=[],b=[],c=[];
  if(t==='terrain'){a=[cPointer(me,true),cTaches(me),cChantiersSemaine(me,0,true),cProdSemaine(me)];b=[cDeplacement(me),monVehiculeHTML(me._acc),cMesDebours(me),cEchPerso(me),cRecompenses(me)];c=[cFiche(me,me)]}
  if(t==='chef'){a=[cEquipeJour(me),cBinomes(me)];b=[cAValider(me),cDemandes(me),cProdSemaine(me),cEchEquipe(me)];c=[cMesChantiers(me),cPointer(me,true),cTaches(me),cChantiersSemaine(me,0,true),cDeplacement(me),monVehiculeHTML(me._acc),cMesDebours(me),cEchPerso(me),cRecompenses(me),cFiche(me,me)]}
  if(t==='rh'){a=[cEchRH(me)];b=[cArrivants(me),cFins(me),cChantiersSemaine(me,0,true)];c=[cPointer(me,true),cEchPerso(me),cRecompenses(me),cFiche(me,me)]}
  if(t==='direction'){a=[cChiffres(me),cChantiers(me)];b=[cAlertes(me),cEchPerso(me),cChantiersSemaine(me,0,true)];c=[cPointer(me,true),cRecompenses(me),cFiche(me,me)]}
  return `<h2 class="vt">Bonjour ${esc(me.prenom)} <span class="hint">· ${fJour(DATA.today)}/${DATA.today.slice(0,4)}</span></h2>
    <div class="eq-cols"><div>${cAujourdhui(me)}${a.join('')}</div><div>${b.join('')}</div><div>${c.join('')}</div></div>`;
}
function vHeures(me){
  const Bv=can(me,'pointage.validate')?cValidation(me):'';
  const moi=can(me,'pointage.self'); // pointer ses propres heures : opérateurs et certains chefs de chantier
  return `<h2 class="vt">${moi?'Heures':'Pointages de l\'équipe'}</h2>${Bv?`<div class="eq-cols eq-1"><div>${Bv}</div></div>`:''}${moi?cPointer(me,false)+chipsPeriode()+cHeuresPeriode(me):''}`;
}
function vHabs(me,perso,equipe){
  const qse=equipe&&can(me,'qse.manage');
  const A=perso?cMesHabs(me,'Tes habilitations'):'';
  const Bq=qse?cTableHabs(me):'';
  /* RH : les échéances de l'équipe passent en premier (sur téléphone, c'est ce qui est en haut) */
  if(A&&Bq)return `<h2 class="vt">Habilitations</h2>${RH.includes(me.poste)?`<div class="eq-cols eq-2"><div>${Bq}</div><div>${A}</div></div>`:`<div class="eq-cols eq-2b"><div>${A}</div><div>${Bq}</div></div>`}`;
  return `<h2 class="vt">${perso?'Tes habilitations':'Échéances'}</h2><div class="eq-cols eq-1"><div>${Bq||A}</div></div>`;
}

/* ── PLANNING ÉQUIPE (planning.edit) : la semaine, les chantiers du secteur, les gars à placer — toucher une personne puis un chantier (ou glisser-déposer) ── */
const secteurDe=p=>(PEOPLE[p.id]&&PEOPLE[p.id].secteur)||p.secteur||'';
function mySecteur(me){const s=secteurDe(me);if(s)return s;const c=DATA.chantiers.find(c=>c.conducteur===me.id&&c.secteur);return c?c.secteur:'';}
const plGens=()=>DATA.personnes.filter(p=>p.active&&(poste(p).fam==='terrain'||p.poste==='chef'||(S.plEnc&&(p.poste==='conducteur'||poste(p).fam==='encadrement'))));
function plSitesDe(aff,p,js){const o=aff[p.id]||{};const sites={};js.forEach(d=>(o[d]||[]).forEach(id=>{(sites[id]=sites[id]||[]).push(d);}));return sites;}
function plChip(p,site,js,aff,me){const sites=plSitesDe(aff,p,js);const jours=site?(sites[site]||[]):[];const sel=S.plSel===p.id;const edit=S.plEdit===p.id+'|'+(site||'');
  const dots=site?`<span class="eq-pldots">${js.map(d=>`<i class="${jours.includes(d)?'on':((aff[p.id]||{})[d]||[]).length?'other':''}" title="${fJour(d)}${((aff[p.id]||{})[d]||[]).length?' : '+((aff[p.id]||{})[d]||[]).map(x=>site_(x).ville||site_(x).nom).join(' + '):''}">${jours.includes(d)&&((aff[p.id]||{})[d]||[]).length>1?((aff[p.id]||{})[d]||[]).length:['L','M','M','J','V'][D(d).getDay()-1]||''}</i>`).join('')}</span>`:(Object.keys(sites).length?`<span class="eq-pldots">${js.map(d=>`<i class="${((aff[p.id]||{})[d]||[]).length?'other':'free'}" title="${fJour(d)}${((aff[p.id]||{})[d]||[]).length?' : '+((aff[p.id]||{})[d]||[]).map(x=>site_(x).ville||site_(x).nom).join(' + '):' : libre'}">${['L','M','M','J','V'][D(d).getDay()-1]||''}</i>`).join('')}</span>`:'');
  const fdays=site?[]:js.filter(d=>!((aff[p.id]||{})[d]||[]).length);
  return `<div class="eq-plchip${sel?' sel':''}${site?'':' libre'}" draggable="true" data-drag="${esc(p.id)}" data-site="${esc(site||'')}">
    <button class="eq-plmain" data-act="${site?'pledit':'plsel'}" data-v="${esc(site?p.id+'|'+site:p.id)}" title="${site?'Régler les jours':'Choisir, puis toucher un chantier'}">${avatar(p)}<span class="eq-grow"><b>${esc(p.prenom)} ${esc(p.nom)}</b><small>${esc(poste(p).label)}${p.type==='interim'?' · intérim':''}${!site&&secteurDe(p)?' · '+esc(SECTEURS[secteurDe(p)]||secteurDe(p)):''}${!site&&fdays.length&&fdays.length<js.length?' · <b style="color:#9a3410">libre '+fdays.map(d=>fJour(d).slice(0,4)).join(', ')+'</b>':''}</small></span>${dots}</button>
    ${edit?`<div class="eq-pledit"><div class="eq-s" style="margin-bottom:6px">Jours sur ce chantier</div><div class="eq-opts">${js.map(d=>`<button class="chip${jours.includes(d)?' active':''}" data-act="plday" data-v="${esc(p.id)}|${esc(site)}|${d}">${fJour(d).slice(0,4)} ${d.slice(8,10)}</button>`).join('')}</div>
      <div class="eq-acts" style="margin:8px 0 0"><button class="btn" data-act="plrm" data-v="${esc(p.id)}|${esc(site)}">Retirer de ce chantier</button><button class="btn" data-act="pledit" data-v="${esc(p.id)}|${esc(site)}">Fermer</button></div>
      <label class="f">Secteur de rattachement</label><select class="f" data-chg="plpers" data-k="secteur" data-p="${esc(p.id)}"><option value="">—</option>${Object.keys(SECTEURS).map(k=>`<option value="${k}"${secteurDe(p)===k?' selected':''}>${SECTEURS[k]}</option>`).join('')}</select></div>`:''}</div>`;}
function vOrga(me){
  const k=S.plWeek||0,js=semaineDe(k),wk=weekKey(js[0]);ensureWeeks([wk,weekKey(semaineDe(k-1)[0])]);
  const sect=S.plSect===undefined?mySecteur(me):S.plSect;const aff=(PLANNING[wk]||{}).aff||{};
  const chantiers=DATA.chantiers.filter(c=>!c.bureau);const duSect=chantiers.filter(c=>!sect||c.secteur===sect||!c.secteur),hors=chantiers.filter(c=>sect&&c.secteur&&c.secteur!==sect); /* un chantier sans secteur reste visible : on lui règle son secteur (⚙) */
  const gens=plGens();const mine=gens.filter(p=>!sect||secteurDe(p)===sect||!secteurDe(p)),autres=gens.filter(p=>sect&&secteurDe(p)&&secteurDe(p)!==sect); /* sans secteur : à placer ici (le premier placement le rattache) */
  const libres=p=>js.filter(d=>!((aff[p.id]||{})[d]||[]).length);const estPlace=p=>Object.keys(plSitesDe(aff,p,js)).length>0;const complet=p=>!libres(p).length; /* ③ : un gars placé 3 jours sur 5 reste « à placer » pour les 2 autres */
  const aPlacer=mine.filter(p=>!complet(p)).sort((a,b)=>libres(b).length-libres(a).length),places=mine.filter(complet).length,aPlacerAutres=autres.filter(p=>!complet(p));const joursLibres=aPlacer.reduce((a,p)=>a+libres(p).length,0);
  const selP=S.plSel?pers(S.plSel):null;const pct=mine.length?Math.round(places/mine.length*100):0;
  const chefs=DATA.personnes.filter(p=>p.active&&p.poste==='chef'),conds=DATA.personnes.filter(p=>p.active&&(p.poste==='conducteur'||poste(p).fam==='encadrement'));
  const fiche=c=>{const dk='plF_'+c.id;const resume=[c.secteur?SECTEURS[c.secteur]||c.secteur:'secteur ?',c.chef?nomC(pers(c.chef)):'chef ?',c.conducteur?nomC(pers(c.conducteur)):'conducteur ?'].join(' · ');
    return `<details class="eq-plfd"${S[dk]?' open':''} data-det="${dk}"><summary class="eq-s">⚙ ${esc(resume)}</summary><div class="eq-plfiche"><select class="f" data-chg="plfiche" data-site="${esc(c.id)}" data-k="secteur" title="Secteur"><option value="">Secteur…</option>${Object.keys(SECTEURS).map(x=>`<option value="${x}"${c.secteur===x?' selected':''}>${SECTEURS[x]}</option>`).join('')}</select>
    <select class="f" data-chg="plfiche" data-site="${esc(c.id)}" data-k="chef" title="Chef de chantier"><option value="">Chef de chantier…</option>${chefs.map(p=>`<option value="${esc(p.id)}"${c.chef===p.id?' selected':''}>${esc(nomC(p))}</option>`).join('')}</select>
    <select class="f" data-chg="plfiche" data-site="${esc(c.id)}" data-k="conducteur" title="Conducteur de travaux"><option value="">Conducteur…</option>${conds.map(p=>`<option value="${esc(p.id)}"${c.conducteur===p.id?' selected':''}>${esc(nomC(p))}</option>`).join('')}</select>
    <input class="f" data-chg="plfiche" data-site="${esc(c.id)}" data-k="horaires" value="${esc(ficheDe(c.id).horaires||'')}" placeholder="Horaires (ex. 7 h 30 – 16 h 30, pause 12 h – 13 h)" title="Horaires du chantier — accueil chantier, point 5"><input class="f" data-chg="plfiche" data-site="${esc(c.id)}" data-k="rassemblement" value="${esc(ficheDe(c.id).rassemblement||'')}" placeholder="Point de rassemblement / PR secours (ex. base vie, rue X)" title="Point de rassemblement — accueil chantier, point 5"></div></details>`;};
  const carte=c=>{const ici=gens.filter(p=>plSitesDe(aff,p,js)[c.id]);const n=ici.length;
    return `<div class="card eq-plsite${selP?' drop':''}" data-drop="${esc(c.id)}"><div class="eq-plhead"><span class="eq-grow"><span class="eq-big">📍 ${esc(c.nom)}</span><span class="eq-s">${esc(c.ville||'')}${c.secteur?(c.ville?' · ':'')+esc(SECTEURS[c.secteur]||c.secteur):''}${c.soudures?' · '+nb(c.soudures)+' soudures':''}</span></span><span class="eq-plcount${n?'':' vide'}">${n}</span></div>
      ${js.some(d=>meteoDe(c.id,d))?`<div class="eq-plmeteo">${js.map(d=>{const mt=meteoDe(c.id,d);return `<span title="${fJour(d)}${mt?' · '+METEO[mt.k][1]+' '+mt.t+' °C'+(mt.mm?' · '+mt.mm+' mm':''):''}">${mt?METEO[mt.k][0]+'<b>'+mt.t+'°</b>':'·'}</span>`;}).join('')}</div>`:''}
      ${fiche(c)}
      <div class="eq-plpeople">${ici.map(p=>plChip(p,c.id,js,aff,me)).join('')||'<div class="eq-s eq-plvide">Personne pour l\'instant</div>'}</div>
      ${selP?`<button class="btn primary eq-full" data-act="plput" data-v="${esc(c.id)}">Placer ${esc(selP.prenom)} ici · ${(()=>{const fd=libres(selP);return fd.length===js.length||!fd.length?'toute la semaine':fd.map(d=>fJour(d).slice(0,4)).join(', ');})()}</button>`:''}</div>`;};
  return `<h2 class="vt">Planning équipe <span class="hint">· semaine ${numSemaine(js[0])} · du ${fDate(js[0]).slice(0,5)} au ${fDate(js[4])}</span></h2>
    <div class="eq-nav"><button class="btn" data-act="plweek" data-v="${k-1}">◀</button><div class="eq-filtres" style="padding:0;flex:1">${[[-1,'Semaine passée'],[0,'Cette semaine'],[1,'Semaine prochaine'],[2,'Dans 2 semaines']].map(([n,t])=>`<button class="chip${k===n?' active':''}" data-act="plweek" data-v="${n}">${t}</button>`).join('')}</div><button class="btn" data-act="plweek" data-v="${k+1}">▶</button></div>
    <div class="card"><div class="eq-2sel"><div><label class="f" style="margin-top:0">Secteur</label><select class="f" data-chg="plSect"><option value=""${sect===''?' selected':''}>Tous les secteurs</option>${Object.keys(SECTEURS).map(x=>`<option value="${x}"${sect===x?' selected':''}>${SECTEURS[x]}</option>`).join('')}</select></div>
      <div><label class="f" style="margin-top:0">Semaine</label><div class="eq-plprog${pct>=100?' ok':''}"><b>${places} / ${mine.length}</b> placé${places>1?'s':''} toute la semaine${joursLibres?' · <b style="color:#9a3410">'+joursLibres+' jour'+(joursLibres>1?'s':'')+' à pourvoir</b>':''}${pct>=100&&mine.length?' · 🎉 tout le monde est placé':''}<span class="eq-prog"><i style="width:${pct}%"></i></span></div></div></div>
      <div class="eq-acts" style="margin:10px 0 0"><button class="btn" data-act="plcopy" data-v="${wk}">↩ Reprendre la semaine passée</button><button class="btn${S.plEnc?' primary':''}" data-act="plenc">${S.plEnc?'✓ ':''}Avec l'encadrement</button>${me.admin?`<button class="btn" data-act="plstrict" title="Règle d'accès des gars qui ne sont pas placés">${PL_RULES.strict?'🔒 Non placé = rien':'🔓 Non placé = tout voir'}</button>`:''}</div>
      <div class="hint" style="margin-top:6px">Touche une personne puis un chantier (ou glisse-la). Toucher une personne placée règle ses jours. Les gars n'ouvrent dans l'appli que les chantiers de leur semaine et de la précédente.</div></div>
    <div class="eq-cols eq-2b"><div>
      <div class="card eq-pltray${selP?' sel':''}" data-drop="tray"><h3>À placer <span class="hint">· ${aPlacer.length}${aPlacer.some(estPlace)?' · dont '+aPlacer.filter(estPlace).length+' en partie':''}</span></h3>${aPlacer.length?`<div class="eq-plpeople">${aPlacer.map(p=>plChip(p,null,js,aff,me)).join('')}</div>`:`<div class="eq-s">${mine.length?'🎉 Tout le monde est placé cette semaine.':'Personne dans ce secteur : rattache les gars à un secteur (toucher une personne placée → secteur) ou choisis « Tous les secteurs ».'}</div>`}
        ${autres.length?`<details${S.plAutres?' open':''} data-det="plAutres" style="margin-top:8px"><summary class="eq-s" style="cursor:pointer;min-height:44px;display:flex;align-items:center">Autres secteurs · ${aPlacerAutres.length} à placer${autres.length-aPlacerAutres.length?' · '+(autres.length-aPlacerAutres.length)+' déjà placé'+(autres.length-aPlacerAutres.length>1?'s':''):''}</summary><div class="eq-plpeople">${aPlacerAutres.map(p=>plChip(p,null,js,aff,me)).join('')||'<div class="eq-s">Tous placés.</div>'}</div></details>`:''}</div>
      </div><div>
      <div class="eq-plsites">${duSect.map(carte).join('')||'<div class="card"><div class="eq-s">Aucun chantier dans ce secteur : règle le secteur des chantiers (⚙ sur chaque chantier, avec « Tous les secteurs »).</div></div>'}</div>
      ${hors.length?`<details${S.plAutres?' open':''} data-det="plAutres"><summary class="eq-s" style="cursor:pointer;min-height:44px;display:flex;align-items:center;padding:0 4px">Chantiers des autres secteurs · ${hors.length}</summary><div class="eq-plsites">${hors.map(carte).join('')}</div></details>`:''}
    </div></div>`;
}

/* ════════════════════════════════════════════════════════════════════
   ACCUEIL GÉNÉRAL (refonte 09/10 soir, maquette validée par Ethan) : avatar + « Aujourd'hui » + pointage + À FAIRE (notifications : tout ce qui attend
   une action de la personne, poussé par chaque module) + À SAVOIR (raccourcis de consultation) + ESPACES (tuiles selon les droits)
   ════════════════════════════════════════════════════════════════════ */
const ICO={home:'🏠',pin:'📍',cal:'📅',user:'👤',bld:'🏢',sld:'⚙️',pen:'✍️',hat:'⛑️',check:'✓',clock:'⏱',alert:'⚠️',badge:'🎖',doc:'📄',cart:'🚚',cloud:'🌦',msg:'💬',undo:'↩',users:'👥',flag:'🚩',ruler:'📐',key:'🔑'};
const SVG={pin:'<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.9" stroke-linecap="round" stroke-linejoin="round"><path d="M20 10c0 6-8 12-8 12s-8-6-8-12a8 8 0 0 1 16 0z"/><circle cx="12" cy="10" r="3"/></svg>',
  cal:'<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.9" stroke-linecap="round" stroke-linejoin="round"><rect x="3" y="4" width="18" height="18" rx="3"/><path d="M16 2v4M8 2v4M3 10h18"/><path d="M8 14h3M13 14h3M8 18h3"/></svg>',
  user:'<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.9" stroke-linecap="round" stroke-linejoin="round"><path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/><circle cx="12" cy="7" r="4"/></svg>',
  bld:'<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.9" stroke-linecap="round" stroke-linejoin="round"><rect x="4" y="2" width="16" height="20" rx="2"/><path d="M9 22v-4h6v4"/><path d="M8 6h.01M12 6h.01M16 6h.01M8 10h.01M12 10h.01M16 10h.01M8 14h.01M12 14h.01M16 14h.01"/></svg>',
  sld:'<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.9" stroke-linecap="round" stroke-linejoin="round"><path d="M4 21v-7M4 10V3M12 21v-9M12 8V3M20 21v-5M20 12V3M1 14h6M9 8h6M17 16h6"/></svg>',
  pen:'<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.9" stroke-linecap="round" stroke-linejoin="round"><path d="M12 19l7-7 3 3-7 7-3-3z"/><path d="M18 13l-1.5-7.5L2 2l3.5 14.5L13 18l5-5z"/><path d="M2 2l7.586 7.586"/><circle cx="11" cy="11" r="2"/></svg>',
  users:'<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.9" stroke-linecap="round" stroke-linejoin="round"><path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M23 21v-2a4 4 0 0 0-3-3.9M16 3.1a4 4 0 0 1 0 7.8"/></svg>'};
const CHEV='<svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M9 18l6-6-6-6"/></svg>';
let NOTIFS=[]; /* notifications du rendu courant : [{act,sev,ic,t,s,when,wait,go()}] — data-act="notif" data-v=index */
const todayIso=()=>DATA?DATA.today:TODAY();
const yesterdayIso=()=>{const d=D(todayIso());d.setDate(d.getDate()-(d.getDay()===1?3:1));return iso(d);};
/* ce que l'appli sait sur l'appareil : conversations, QSE, stock, annulations des chantiers chargés ici (copies complètes) */
function netsLocal(){try{return (A.nets&&A.nets())||[];}catch(e){return [];}}
const liveMsgs=net=>(net&&net.conv&&Array.isArray(net.conv.msgs)?net.conv.msgs:[]).filter(m=>m&&!m.deleted);
const qseReq=d0=>d0.required!==undefined?!!d0.required:(d0.type==='pdf'||d0.type==='accueil');
const qseSigned=(d0,name,key)=>{const nn=String(name||'').trim().toLowerCase();return (d0.sigs||[]).some(s2=>(key&&s2.uid&&s2.uid===key)||String(s2.name||'').trim().toLowerCase()===nn);};
const whenOf=at=>{if(!at)return '';const t=Date.parse(at);if(!isFinite(t))return '';const d=Date.now()-t;if(d<3600e3)return 'il y a '+Math.max(1,Math.round(d/60e3))+' min';if(d<86400e3)return String(new Date(t).getHours())+' h '+String(new Date(t).getMinutes()).padStart(2,'0');if(d<172800e3)return 'hier';return fDate(at.slice(0,10)).slice(0,5);};
/* la liste n'est PAS fermée : chaque module pousse ce qui attend la personne (règle Ethan). Ordre opérationnels : documents → tâches → livraisons → messages → habilitations ; chef : + pointages à valider, manquants, annulations, production, planning */
function notifsFor(me){const L=[];const nets=netsLocal();const name=A.userName?A.userName():nomC(me);const key=A.userKey?A.userKey():null;const today=todayIso();const idsToday=planDe(me.id,today);const mySiteIds=new Set([...idsToday,...mesSites(me).map(c=>c.id)]);
  const open=(id,tab)=>()=>{if(A.openSite)A.openSite(id,tab);};
  const push=o=>L.push(o);
  /* 0. documentation obligatoire D'ENTREPRISE (règlement intérieur, notes de service, accueil nouvel arrivant) — règle Ethan : avant tout le reste */
  if(me._acc)docsTodo(me._acc).forEach(d=>push({act:true,sev:'bad',ic:d.kind==='accueil_entreprise'?ICO.hat:ICO.doc,t:(d.kind==='accueil_entreprise'?'Accueil nouvel arrivant à compléter : ':'À lire et signer : ')+d.title,s:(DOC_KINDS[d.kind]||d.kind)+(d.version?' · '+d.version:'')+' · obligatoire, une seule fois',when:whenOf(d.at),go:()=>docOpen(d.id,me._acc)}));
  /* 0bis. accueil chantier : sur chaque chantier où je suis placé (cette semaine) sans accueil signé par moi → parcours (PPSPS, 10 points, DICT, prévention) */
  const accSigned=net=>((net.qse&&net.qse.docs)||[]).some(d0=>d0&&!d0.deleted&&d0.type==='accueil'&&qseSigned(d0,name,key));
  if(can(me,'qse.sign')&&['terrain','interim','chef'].includes(kindOf(me))){const wk=new Set(semaineDe(0).flatMap(d=>planDe(me.id,d)));[...wk].forEach(id=>{const net=nets.find(n=>n.id===id);if(net&&accSigned(net))return;const c=site(id);push({act:true,sev:'bad',ic:ICO.hat,t:'Accueil chantier à faire : '+(c.nom||id),s:'PPSPS à dérouler, 10 points, DICT, prévention, signature — avant de commencer sur ce chantier',when:idsToday.includes(id)?'aujourd\'hui':'cette semaine',go:()=>{A.state.autoParcours=true;if(A.openSite)A.openSite(id,'qse');}});});}
  /* 0ter. documents QSE à émarger (PDF requis, accueils de séance) sur les chantiers de l'appareil — l'accueil chantier passe par le parcours ci-dessus */
  if(can(me,'qse.sign'))nets.forEach(net=>{const docs=(net.qse&&net.qse.docs)||[];const planned=semaineDe(0).some(d=>planDe(me.id,d).includes(net.id));docs.filter(d0=>qseReq(d0)&&!qseSigned(d0,name,key)).forEach(d0=>{if(d0.type==='accueil'){if(L.some(n=>n.t==='Accueil chantier à faire : '+(net.name||net.id)))return;if(!planned||accSigned(net))return; /* 10/10 (Ethan) : l'accueil d'un chantier ne réclame QUE les gens placés dessus au planning, et jamais deux fois (anciennes séances comprises) */push({act:true,sev:'bad',ic:ICO.hat,t:'Accueil chantier à faire : '+(net.name||net.id),s:(d0.title||'')+' · PPSPS, 10 points, signature',when:whenOf(d0.at),go:()=>{A.state.autoParcours=true;if(A.openSite)A.openSite(net.id,'qse');}});return;}
    push({act:true,sev:'bad',ic:ICO.pen,t:'À lire et signer : '+(d0.title||'document'),s:(net.name||net.id)+' · obligatoire',when:whenOf(d0.at),go:open(net.id,'qse')});});});
  /* 0quater. quart d'heure sécurité du jour (10/10) : déclenché par l'encadrement sur un chantier où je suis placé aujourd'hui → sujet, questions, signature */
  if(can(me,'qse.sign')){const qk=qhsMyKey();qhsTodo(qk,name,idsToday,today).forEach(x=>{const c=site(x.site);push({act:true,sev:'bad',ic:ICO.hat,t:'Quart d\'heure sécurité à faire : '+(x.run.title||x.run.topic),s:(c.nom||x.site)+(x.run.by?' · déclenché par '+x.run.by:'')+(x.run.note?' · '+x.run.note:''),when:'aujourd\'hui',go:()=>{A.state.autoQhs=x.run.id;if(A.openSite)A.openSite(x.site,'qse');}});});}
  /* chef / conducteur : pointages à valider, pas pointé hier, demandes d'annulation (avant les tâches, règle Ethan) */
  if(can(me,'pointage.validate')){const ids=equipeIds(me);const V=DATA.pointages.filter(x=>ids.has(x.p)&&aValider(x,me));
    if(V.length){const dj=[...new Set(V.map(x=>x.d))].sort();push({act:true,sev:dj.length>=3?'bad':'warn',ic:ICO.check,t:V.length+' pointage'+(V.length>1?'s':'')+' à valider'+(dj.length>1?' · '+dj.length+' jours':''),s:[...new Set(V.map(x=>pers(x.p).prenom))].join(', ')+(dj.length?' — depuis le '+fJour(dj[0]):''),when:dj.length?fJour(dj[dj.length-1]):'',go:()=>goSub('heures')});}
    const y=yesterdayIso();const miss=[...ids].filter(k=>planDe(k,y).length&&!ptDe(k,y));
    if(miss.length)push({act:true,sev:'bad',ic:ICO.clock,t:miss.length+' pointage'+(miss.length>1?'s':'')+' manquant'+(miss.length>1?'s':'')+' '+fJour(y),s:miss.map(k=>nomC(pers(k))).join(', ')+' — planifié'+(miss.length>1?'s':'')+' mais rien de pointé : à saisir à la main avec le motif',when:fJour(y),go:()=>goSub('heures')});
    nets.forEach(net=>{const pend=liveMsgs(net).filter(m=>m.kind==='undo'&&m.undo&&m.undo.status==='pending');if(pend.length)push({act:true,sev:'or',ic:ICO.undo,t:pend.length+' demande'+(pend.length>1?'s':'')+' d\'annulation de soudure',s:(net.name||net.id)+' · '+pend.map(m=>(m.by||'')+(m.undo.weldId?' · '+m.undo.weldId:'')).join(' · '),when:whenOf(pend[0].at),go:open(net.id,'conv')});});}
  /* 1. tâches qui me sont nommées (conversation des chantiers de l'appareil) */
  nets.forEach(net=>{const T=liveMsgs(net).filter(m=>m.kind==='task'&&m.task&&!m.task.done&&(m.task.to==='tous'||m.task.to===name));if(T.length)push({act:true,sev:'or',ic:ICO.flag,t:T.length+' tâche'+(T.length>1?'s':'')+' pour toi sur '+(net.name||net.id),s:T.map(m=>'« '+String(m.text||m.task.text||'').slice(0,60)+' »'+(m.by?' ('+m.by+')':'')).join(' · '),when:whenOf(T[0].at),go:open(net.id,'conv')});});
  /* 2. déchargements prévus aujourd'hui sur mon chantier (livraisons prévues du Stock, BL importé) — à savoir */
  nets.forEach(net=>{if(!mySiteIds.has(net.id)&&!idsToday.includes(net.id))return;const livs=(net.stock&&Array.isArray(net.stock.livs)?net.stock.livs:[]).filter(l=>l&&l.status!=='ok'&&String(l.date||l.at||'').slice(0,10)===today);
    livs.forEach(l=>push({act:false,sev:'or',ic:ICO.cart,kl:'Livraison aujourd\'hui'+(l.heure?' · '+l.heure:''),kv:(l.bl?l.bl+' · ':'')+(l.label||'camion')+' · '+(net.name||net.id),t:'Livraison prévue aujourd\'hui sur '+(net.name||net.id)+' — camion à pointer',s:(l.bl?l.bl+' · ':'')+(l.label||'')+(l.prevu?' · '+l.prevu.length+' lignes':''),go:open(net.id,'stock')}));});
  /* 3. messages non lus sur les chantiers de l'appareil */
  nets.forEach(net=>{const seen=A.seen?A.seen(net.id):'';const U=liveMsgs(net).filter(m=>m.by!==name&&(m.at||'')>seen);if(U.length)push({act:true,sev:'info',ic:ICO.msg,t:U.length+' message'+(U.length>1?'s':'')+' non lu'+(U.length>1?'s':'')+' sur '+(net.name||net.id),s:'dernier : '+(U[U.length-1].by||'')+' — « '+String(U[U.length-1].text||'').slice(0,50)+' »',when:whenOf(U[U.length-1].at),go:open(net.id,'conv')});});
  /* 4. mes habilitations — à savoir (c'est le bureau qui programme le recyclage) */
  const hl=x=>(DATA.habTypes[x.type]&&DATA.habTypes[x.type].label)||x.type,hf=x=>x.h&&x.h.fin?x.h.fin:null;
  habsDe(me).filter(h=>h.etat==='expiree').forEach(h=>push({act:false,sev:'bad',ic:ICO.badge,wait:'le bureau',kl:hl(h)+' expirée',kv:hf(h)?'depuis le '+fDate(hf(h)):'',t:hl(h)+' expirée',s:hf(h)?'depuis le '+fDate(hf(h))+' — recyclage à programmer par le bureau':'',go:()=>goSub('habs')}));
  habsDe(me).filter(h=>h.etat==='echeance').forEach(h=>push({act:false,sev:'warn',ic:ICO.badge,kl:hl(h),kv:'expire dans '+h.j+' j',t:hl(h)+' expire dans '+h.j+' jours',s:hf(h)?'le '+fDate(hf(h))+' — recyclage à prévoir':'',go:()=>goSub('habs')}));
  /* encadrement : planning de la semaine prochaine, échéances de l'équipe */
  if(can(me,'planning.edit')){const js=semaineDe(1),wk=weekKey(js[0]);const aff=(PLANNING[wk]||{}).aff||{};const sect=mySecteur(me);const gens=plGens().filter(p=>!sect||secteurDe(p)===sect||!secteurDe(p));
    const libres=gens.filter(p=>js.some(d=>!((aff[p.id]||{})[d]||[]).length));const zero=libres.filter(p=>!js.some(d=>((aff[p.id]||{})[d]||[]).length));
    if(libres.length)push({act:true,sev:'bad',ic:ICO.cal,t:'Semaine prochaine : '+libres.length+' gars à placer'+(libres.length-zero.length?' ('+zero.length+' pas du tout, '+(libres.length-zero.length)+' en partie)':''),s:libres.slice(0,8).map(p=>p.prenom).join(', ')+(libres.length>8?'…':'')+(sect?' — secteur '+(SECTEURS[sect]||sect):''),when:'pour lundi',go:()=>goX('orga')});
    else if(gens.length)push({act:false,sev:'ok',ic:ICO.cal,kl:'Planning S'+numSemaine(js[0]),kv:'tout le monde est placé 🎉',t:'Semaine prochaine : tout le monde est placé 🎉',s:'',go:()=>goX('orga')});}
  if(can(me,'qse.manage')||can(me,'pointage.validate')){const al=alertesHab(equipeDe(me),0);if(al.length)push({act:false,sev:'warn',ic:ICO.badge,wait:can(me,'qse.manage')?null:'le bureau',kl:'Habilitations équipe',kv:al.length+' à traiter',t:al.length+' habilitation'+(al.length>1?'s':'')+' à traiter dans l\'équipe',s:al.slice(0,3).map(x=>nomC(x.p&&x.p.id?x.p:pers(x.p))+' ('+((DATA.habTypes[x.type]&&DATA.habTypes[x.type].label)||x.type)+')').join(' · '),go:()=>goX('habsEq')});}
  /* débours à valider (conducteur / bureau) ; mes débours refusés (chacun) */
  if(can(me,'planning.edit')||can(me,'affaires.edit')||me.admin){const T=dbTodo();if(T.length)push({act:true,sev:'warn',ic:ICO.cart,t:T.length+' débours à valider',s:T.slice(0,3).map(d=>(d.name||'')+' · '+(+d.montant||0).toLocaleString('fr-FR')+' €').join(' · ')+' — '+T.reduce((a,d)=>a+(+d.montant||0),0).toLocaleString('fr-FR')+' € en attente',when:whenOf(T[0].at),go:()=>{cmdState().tab='db';cmdState().etat='';goX('cmd');}});}
  /* flotte : alertes du parc (responsable flotte) ; mon véhicule (chacun) — à savoir */
  if(can(me,'flotte.manage')){const al=vehAll().map(v=>({v,a:vehAlertes(v)})).filter(x=>x.a.length);const bad=al.filter(x=>x.a.some(y=>y.sev==='bad'));if(al.length)push({act:false,sev:bad.length?'bad':'warn',ic:ICO.cart,kl:'Parc véhicules',kv:(bad.length?bad.length+' bloquante'+(bad.length>1?'s':'')+' · ':'')+al.length+' alerte'+(al.length>1?'s':''),t:'Parc véhicules : '+al.length+' alerte'+(al.length>1?'s':''),s:bad.slice(0,3).map(x=>x.v.immat+' : '+x.a[0].t).join(' · '),go:()=>goX('flotte')});}
  if(me._acc){vehDe(me._acc).forEach(v=>{const al=vehAlertes(v).filter(a=>a.k!=='sig');if(al.length)push({act:false,sev:al.some(a=>a.sev==='bad')?'bad':'warn',ic:ICO.cart,kl:'Mon véhicule '+v.immat,kv:al[0].t,t:'Mon véhicule '+v.immat+' : '+al[0].t,s:al.slice(1).map(a=>a.t).join(' · '),go:()=>goSub('moi')});});}
  /* contrôle chantier : non-conformités du dernier contrôle → actions à mener (chef / conducteur du chantier) */
  if(can(me,'pointage.validate'))nets.forEach(net=>{const c=site(net.id);if(c.chef!==me.id&&c.conducteur!==me.id&&!me.admin)return;const L2=(net.qse&&Array.isArray(net.qse.controles)?net.qse.controles:[]).filter(x=>x&&!x.deleted);if(!L2.length)return;const last=L2[L2.length-1];const nc=Object.values(last.items||{}).filter(x=>x.e==='NC');if(!nc.length||last.cloture)return;
    push({act:true,sev:'warn',ic:ICO.alert,t:nc.length+' non-conformité'+(nc.length>1?'s':'')+' au contrôle chantier du '+fDate(String(last.at).slice(0,10)),s:(net.name||net.id)+' · '+nc.slice(0,3).map(x=>x.lab+(x.action?' → '+x.action:'')).join(' · '),when:whenOf(last.at),go:open(net.id,'qse')});});
  /* chef / conducteur : objectifs du jour posés (ou pas) sur ses chantiers — à savoir */
  if(can(me,'pointage.validate')&&mesSites(me).length){const n=mesSites(me).reduce((a,c)=>a+missionsOf(netOf(c.id),today).length,0);const sans=mesSites(me).filter(c=>netOf(c.id)&&!missionsOf(netOf(c.id),today).length&&DATA.personnes.some(p=>planDe(p.id,today).includes(c.id)));
    if(sans.length)push({act:false,sev:'warn',ic:ICO.flag,kl:'Objectifs du jour',kv:sans.length+' chantier'+(sans.length>1?'s':'')+' sans objectif',t:'Objectifs du jour : '+sans.map(c=>c.nom).join(', ')+' sans objectif posé',s:'',go:()=>goX('obj')});
    else if(n)push({act:false,sev:'ok',ic:ICO.flag,kl:'Objectifs du jour',kv:n+' mission'+(n>1?'s':'')+' posée'+(n>1?'s':''),t:'Objectifs du jour posés',s:'',go:()=>goX('obj')});}
  /* terrain : pas de chantier planifié cette semaine */
  if(['terrain','interim','chef'].includes(kindOf(me))&&!semaineDe(0).some(d=>planDe(me.id,d).length))push({act:false,sev:'info',ic:ICO.cal,kl:'Planning',kv:'rien cette semaine',t:'Pas de chantier planifié cette semaine',s:'vois avec ton conducteur — tu peux consulter tes anciens chantiers',go:()=>goSub('planning')});
  return L;}
const kindOf=p=>p.type==='interim'?'interim':p.poste==='chef'?'chef':accueilType(p)==='terrain'?'terrain':accueilType(p);
function goSub(k){S.tab='moi';S.sub=k;S.fiche=null;if(A.homeTab){A.homeTab('espace');return;}render();}
function goX(k){S.tab='expl';S.xsub=k;S.fiche=null;if(A.homeTab){A.homeTab('expl');return;}render();}
function heroAccueil(me){const today=todayIso();const ids=planDe(me.id,today);const t=accueilType(me);const kit=KIT&&avPoste(me);
  if(t==='terrain'||t==='chef'){const i=ids[0];
    if(!i)return `<section class="ac-hero" style="background:var(--plane)"><div class="fig"><span class="figin">${kit?avatarSVG(avM(me,'travail').cfg,104):''}<i class="sol"></i></span></div><div class="r"><span class="ac-kick">Aujourd'hui · ${fJour(today)}</span><div class="ac-site">Pas de chantier planifié</div><div class="eq-s">Vois avec ton conducteur. Tu peux consulter tes anciens chantiers.</div><div class="eq-acts" style="margin:6px 0 0"><button class="btn" data-act="tabgo" data-v="sites">Mes chantiers</button></div></div></section>`;
    const c=site(i),mt=meteoDe(i,today),M=mt?METEO[mt.k]:null;const eq=DATA.personnes.filter(p=>p.id!==me.id&&(p.active||p.invite)&&planDe(p.id,today).includes(i));
    return `<section class="ac-hero" style="background:${M?M[2]:'var(--plane)'}"><div class="fig"><span class="figin">${kit?avatarSVG(avJour(me,today,i).cfg,104):avatar(me,'eq-lg')}<i class="sol"></i></span></div>
      <div class="r"><span class="ac-kick">Aujourd'hui · ${fJour(today)}${ids.length>1?' · '+ids.length+' chantiers':''}</span><div class="ac-site">📍 ${esc(c.nom)}${ids.length>1?`<span class="eq-s">puis ${ids.slice(1).map(x=>esc(site(x).nom)).join(', ')}</span>`:''}</div>
        ${M?`<span class="ac-mt"><span class="e">${M[0]}</span><span><b>${M[1]} · ${mt.t} °C</b><span class="eq-s">${TENUE_TXT[mt.k]||''}</span></span></span>`:''}
        ${eq.length?`<div class="ac-team"><span class="avs">${eq.slice(0,4).map(p=>avatar(p)).join('')}</span><span>avec ${eq.map(p=>esc(p.prenom)).join(', ')}${c.chef&&c.chef!==me.id?' · chef : '+esc(pers(c.chef).prenom):''}</span></div>`:''}
        ${(()=>{const ms=missionsFor(me,today);return ms.length?`<div class="ac-obj">🎯 <b>Objectif du jour</b> · ${esc(missionsTxt(ms))}<div class="eq-s">${ms.map(m=>esc(m.label)+' <span class="hint">('+hTxt(m.h)+(ids.length>1?' · '+esc(m.siteNom):'')+')</span>').join(' · ')}</div><div class="hint">temps estimé par ton chef — un repère, pas un plafond</div></div>`:'';})()}
        <div class="eq-acts" style="margin:6px 0 0"><button class="btn primary" data-act="opensite" data-v="${esc(i)}">Ouvrir ${ids.length>1?esc(c.ville||c.nom):'le chantier'}</button>${ids.slice(1).map(x=>`<button class="btn" data-act="opensite" data-v="${esc(x)}">Ouvrir ${esc(site(x).ville||site(x).nom)}</button>`).join('')}</div></div></section>`;}
  const stats=[];let kick='',titre='',primary='';
  if(t==='rh'){const al=alertesHab(DATA.personnes,0);stats.push(['bad',al.filter(x=>x.etat==='expiree').length,'expirée'+(al.filter(x=>x.etat==='expiree').length>1?'s':'')],['',al.length,'échéances'],['',DATA.personnes.filter(p=>p.active).length,'personnes']);kick='RH · semaine '+numSemaine(today);titre=al.length+' échéance'+(al.length>1?'s':'')+' d\'habilitation';primary=`<button class="btn primary" data-act="tabgo" data-v="entreprise">Annuaire</button><button class="btn" data-act="go" data-v="habs">Habilitations</button>`;}
  else{const mine=mesSites(me).length?mesSites(me):DATA.chantiers.filter(c=>!c.bureau);const gens=plGens();const js=semaineDe(0);const placed=gens.filter(p=>js.some(d=>planDe(p.id,d).length)).length;const ids2=equipeIds(me);const nV=DATA.pointages.filter(x=>ids2.has(x.p)&&aValider(x,me)).length;
    stats.push([placed<gens.length?'bad':'ok',placed+'/'+gens.length,'placés cette semaine'],[nV?'warn':'',nV,'pointages à valider'],['',mine.length,'chantier'+(mine.length>1?'s':'')]);kick=(t==='direction'?'SCR':'Ta semaine')+' · S'+numSemaine(today)+(secteurDe(me)?' · '+(SECTEURS[secteurDe(me)]||secteurDe(me)):'');titre=mine.length+' chantier'+(mine.length>1?'s':'')+', '+placed+' gars sur le terrain';
    primary=`<button class="btn primary" data-act="tabgo" data-v="expl">Exploitation</button><button class="btn" data-act="tabgo" data-v="sites">Mes chantiers</button>`;}
  return `<section class="ac-hero" style="background:${t==='rh'?'#fff4d6':'#fdebe3'}"><div class="fig"><span class="figin">${kit?avatarSVG(avM(me,'travail').cfg,104):avatar(me,'eq-lg')}<i class="sol"></i></span></div>
    <div class="r"><span class="ac-kick">${esc(kick)}</span><div class="ac-site">${esc(titre)}</div><div class="ac-stats">${stats.map(x=>`<div class="ac-stat ${x[0]}"><b>${x[1]}</b><small>${x[2]}</small></div>`).join('')}</div><div class="eq-acts" style="margin:6px 0 0">${primary}</div></div></section>`;}
const TENUE_TXT={pluie:'tenue de pluie',chaud:'tenue légère',froid:'tenue chaude',frais:'tenue de travail'};
function spacesFor(me){const L=[{k:'sites',t:'Mes chantiers',ic:SVG.pin,go:'sites',n:DATA.chantiers.filter(c=>!c.bureau).length||null}];
  if(can(me,'planning.edit')||can(me,'pointage.validate')||can(me,'affaires.view')||can(me,'flotte.manage'))L.push({k:'expl',t:'Exploitation',ic:SVG.cal,go:'expl',n:NOTIFS.filter(x=>x.act&&(x.ic===ICO.check||x.ic===ICO.cal||x.ic===ICO.clock||x.ic===ICO.undo)).length||null});
  if(can(me,'pointage.self')||can(me,'team.view'))L.push({k:'moi',t:'Mon espace',ic:SVG.user,go:'espace',n:habsDe(me).filter(h=>h.etat!=='ok'&&h.etat!=='absente').length||null});
  if(can(me,'team.view')&&me.poste!=='visiteur')L.push({k:'ent',t:'Entreprise',ic:SVG.bld,go:'entreprise'});
  if(can(me,'site.tracer'))L.push({k:'trac',t:'Traceur',ic:SVG.pen,go:'traceur'});
  if(me.admin)L.push({k:'adm',t:'Administrateur',ic:SVG.sld,go:'admin'});
  return L;}
const notifHTML=(x,i)=>`<button class="ac-notif ${x.sev}" data-act="notif" data-v="${i}"><span class="ic">${x.ic}<i class="nd"></i></span><span class="tx"><b>${esc(x.t)}</b>${x.s?`<small>${esc(x.s)}</small>`:''}</span><span class="when">${esc(x.when||'')}</span><span class="chev">${CHEV}</span></button>`;
const ktHTML=(x,i)=>`<button class="ac-kt ${x.sev}" data-act="notif" data-v="${i}"><span class="ic">${x.ic}</span><span class="tx"><b>${esc(x.kl||x.t)}</b><small>${esc(x.kv||x.s||'')}</small>${x.wait?`<span class="ac-wait">⏳ on attend ${esc(x.wait)}</span>`:''}</span></button>`;
function vAccueil(me){NOTIFS=notifsFor(me);const A2=NOTIFS.map((x,i)=>[x,i]).filter(([x])=>x.act),K=NOTIFS.map((x,i)=>[x,i]).filter(([x])=>!x.act);const today=todayIso();
  return `<h1 class="ac-hi">Bonjour ${esc(me.prenom)} 👋</h1><div class="ac-date">${esc(fJourLong(today))} · semaine ${numSemaine(today)}${secteurDe(me)?' · secteur '+esc(SECTEURS[secteurDe(me)]||secteurDe(me)):''}</div>
    <div class="ac-two"><div>${heroAccueil(me)}${cPointer(me,false)}</div><div>
    <div class="ac-h"><b>À faire</b><span class="st ${A2.length?'or':'ok'}">${A2.length?A2.length+' action'+(A2.length>1?'s':'')+' attendue'+(A2.length>1?'s':'')+' de toi':'✓ à jour'}</span></div>
    ${A2.length?A2.map(([x,i])=>notifHTML(x,i)).join(''):'<div class="ac-empty">✓ Tu es à jour — rien n\'attend de toi.</div>'}
    <div class="ac-h"><b>À savoir</b><span>${K.length?'raccourcis · '+K.length:'rien de nouveau'}</span></div>
    ${K.length?`<div class="ac-kgrid">${K.map(([x,i])=>ktHTML(x,i)).join('')}</div>`:'<div class="eq-s" style="padding:2px">Rien de nouveau de ton côté.</div>'}</div>
    <div class="span"><div class="ac-h"><b>Espaces</b><span>selon ton poste</span></div><div class="ac-spaces">${spacesFor(me).map(x=>`<button class="ac-tile t-${x.k}" data-act="tabgo" data-v="${x.go}">${x.n?`<span class="n">${x.n}</span>`:''}<span class="ic">${x.ic}</span><b>${esc(x.t)}</b></button>`).join('')}</div></div></div>
    <p class="ac-foot">L'accueil s'adapte à ton poste et à tes droits. « À faire » = tout ce qui attend une action de toi ; « À savoir » = l'info sans geste à faire.</p>`;}
const fJourLong=s=>{const d=D(s);return ['dimanche','lundi','mardi','mercredi','jeudi','vendredi','samedi'][d.getDay()]+' '+d.getDate()+' '+['janvier','février','mars','avril','mai','juin','juillet','août','septembre','octobre','novembre','décembre'][d.getMonth()]+' '+d.getFullYear();};
/* ── TABLEAU DE BORD DU CHANTIER (refonte ⑤) : l'état de CHAQUE module, lu dans la copie de l'appareil — ✓ complet · ! il manque un truc · ✗ bloquant · ○ pas commencé ── */
const DASH_DEF=[['plan','Plan d\'ensemble','📐','plan','Plan'],['soud','Soudures & contrôles','🎖','liste','Soudures'],['act','Activité de la semaine','🚩','plan','Activité'],['hydro','Hydraulique · épreuves','🌊','hydro','Hydraulique'],['phas','Phasage','📅','phasage','Phasage'],['stock','Stock & livraisons','🚚','stock','Stock & livr.'],['ts','Travaux supplémentaires','📄','ts','TS'],['doe','DOE · photos','📷','export','DOE · photos'],['conv','Conversation & tâches','💬','conv','Conversation'],['qse','QSE · accueils','⛑️','qse','QSE'],['admin','Dossier administratif','🗂','admin','Dossier admin'],['eq','Équipe & planning','👥',null,'Équipe'],['pt','Pointages','⏱',null,'Pointages'],['undo','Annulations','↩','conv','Annulations'],['meteo','Météo','🌦',null,'Météo'],['vers','Versions & synchro','🔄','plan','Synchro']]; /* [clé, libellé, icône, onglet du chantier, libellé court (tuile)] */
function dashOf(net,me){const R={};const today=todayIso();const js=semaineDe(0);const name=A.userName?A.userName():nomC(me);const key=A.userKey?A.userKey():null;
  const JJ=jointsOf(net);const J=JJ.map(x=>x.j);const charge=!!net._lines;const c0=site(net.id);
  const st={};J.forEach(j=>{st[j.status||'a_souder']=(st[j.status||'a_souder']||0)+1;});const n=charge?J.length:(c0.soudures||0),soud=charge?(st.soudee||0)+(st.controlee||0)+(st.manchonnee||0):(c0.faites||0),ctrl=(st.controlee||0)+(st.manchonnee||0),manch=st.manchonnee||0,rep=st.a_reprendre||0;
  const ops=[];JJ.forEach(x=>jointOpsOf(x.j,x.dn).forEach(o=>ops.push(o)));const sem=ops.filter(o=>o.k===1&&js.includes(o.at.slice(0,10))).length,semM=ops.filter(o=>o.k===3&&js.includes(o.at.slice(0,10))).length;
  const upd=net.updated_at||(net.traceur&&net.traceur.savedAt)||null;
  R.plan={k:net.geo?'ok':'warn',v:[upd?'mis à jour '+whenOf(upd):'',net.geo?'calé sur la carte':'pas calé sur la carte'].filter(Boolean).join(' · '),s:net.geo?'':'géoréférencement à faire (👁 → Caler sur la carte) — météo par la ville en attendant',n:net.geo?0:1};
  R.soud=charge?{k:rep?'bad':(st.soudee||0)>0?'warn':'ok',v:n?soud+' / '+n+' soudées · '+ctrl+' contrôlées · '+manch+' manchonnées':'aucune soudure',s:(st.soudee?(st.soudee)+' à contrôler':'')+(rep?' · '+rep+' à reprendre':''),n:(st.soudee||0)+rep}:{k:n?'ok':'off',v:n?soud+' / '+n+' soudées':'aucune soudure',s:'ouvre le chantier une fois pour charger les fiches (contrôles, reprises)'};
  R.act=charge?{k:sem?'ok':'off',v:sem+' soudure'+(sem>1?'s':'')+' cette semaine · '+semM+' manchon'+(semM>1?'s':''),s:n?Math.round(100*soud/n)+' % soudé':''}:{k:'off',v:'fiches pas chargées',s:'ouvre le chantier une fois'};
  const ex=(net.hydro&&net.hydro.exec)||{};const exK=Object.keys(ex);let okE=0,totE=0;exK.forEach(t=>Object.keys(ex[t]||{}).forEach(k=>{const r=ex[t][k];if(!r||typeof r!=='object')return;totE++;if(r.result==='ok')okE++;}));
  R.hydro={k:!totE?(manch>0?'warn':'off'):okE===totE?'ok':'warn',v:totE?okE+' / '+totE+' épreuve'+(totE>1?'s':'')+' conforme'+(okE>1?'s':''):'rien pour l\'instant',s:!totE&&manch>0?'des tronçons sont manchonnés : épreuves à programmer':'',n:!totE&&manch>0?1:0};
  const ph=(net.phasage&&Array.isArray(net.phasage.phases)?net.phasage.phases:[]);R.phas={k:ph.length?'ok':(soud>0?'bad':'off'),v:ph.length?ph.length+' phase'+(ph.length>1?'s':'')+' · '+ph.filter(p=>p.level==='marche').length+' marché':'phasage non renseigné',s:ph.length?'':'pas de dates : impossible de mesurer le retard',n:ph.length?0:1};
  const sk=net.stock||{};const livs=Array.isArray(sk.livs)?sk.livs:[];const prev=livs.filter(l=>l&&l.status!=='ok');const sansBL=prev.filter(l=>!l.bl&&!(l.prevu&&l.prevu.length));
  R.stock={k:sansBL.length?'bad':prev.length?'warn':'ok',v:(Array.isArray(sk.zones)?sk.zones.length:0)+' zone'+((sk.zones||[]).length>1?'s':'')+' · '+livs.length+' livraison'+(livs.length>1?'s':'')+(prev.length?' · '+prev.length+' attendue'+(prev.length>1?'s':''):''),s:sansBL.length?'livraison prévue sans BL importé : réception impossible à pointer':prev.length?'à pointer à l\'arrivée du camion':'',n:prev.length};
  const ts=(net.ts&&Array.isArray(net.ts.items)?net.ts.items:[]);const tsP=ts.filter(x=>x.etat==='propose').length;R.ts={k:tsP?'warn':'ok',v:ts.length?ts.length+' TS · '+ts.filter(x=>x.etat==='valide').length+' validé'+(ts.filter(x=>x.etat==='valide').length>1?'s':''):'aucun TS',s:tsP?tsP+' à qualifier':'',n:tsP};
  const sansPhoto=J.filter(j=>j.steps&&j.steps[1]&&j.steps[1].done&&!(j.steps[1].photos&&j.steps[1].photos.length)).length;R.doe=charge?{k:sansPhoto?'warn':soud?'ok':'off',v:soud?Math.round(100*(soud-sansPhoto)/soud)+' % des soudures avec photo':'rien à exporter',s:sansPhoto?sansPhoto+' soudure'+(sansPhoto>1?'s':'')+' sans photo':'',n:sansPhoto}:{k:'off',v:'fiches pas chargées',s:'ouvre le chantier une fois'};
  const seen=A.seen?A.seen(net.id):'';const M=liveMsgs(net);const U=M.filter(m=>m.by!==name&&(m.at||'')>seen).length,T=M.filter(m=>m.kind==='task'&&m.task&&!m.task.done).length;R.conv={k:U?'warn':'ok',v:U+' non lu'+(U>1?'s':'')+' · '+T+' tâche'+(T>1?'s':'')+' ouverte'+(T>1?'s':''),s:M.length?'dernier : '+(M[M.length-1].by||'')+' · '+whenOf(M[M.length-1].at):'',n:U};
  const docs=(net.qse&&Array.isArray(net.qse.docs)?net.qse.docs:[]).filter(d0=>d0&&!d0.deleted);const req=docs.filter(qseReq);const moi=req.filter(d0=>!qseSigned(d0,name,key)).length;const ctl=(net.qse&&Array.isArray(net.qse.controles)?net.qse.controles:[]).filter(x=>x&&!x.deleted);const lastC=ctl[ctl.length-1];const ncN=lastC?Object.values(lastC.items||{}).filter(x=>x.e==='NC').length:0;
  R.qse={k:moi&&can(me,'qse.sign')?'bad':ncN?'warn':req.length?'ok':'off',v:(docs.length?docs.length+' document'+(docs.length>1?'s':'')+' · '+req.length+' à émarger':'aucun document')+(lastC?' · contrôle '+fDate(String(lastC.at).slice(0,10))+' : '+ncN+' NC':''),s:moi&&can(me,'qse.sign')?moi+' pas signé par toi':ncN?ncN+' non-conformité'+(ncN>1?'s':'')+' à traiter':'',n:moi||ncN};
  const ad=(net.admin&&Array.isArray(net.admin.docs)?net.admin.docs:[]);R.admin={k:ad.length?'ok':'warn',v:ad.length?ad.length+' pièce'+(ad.length>1?'s':''):'aucune pièce',s:ad.length?'':'DT / DICT, PPSPS, plans d\'exécution… à classer',n:ad.length?0:1};
  const c=site(net.id);const eqJ=DATA.personnes.filter(p=>planDe(p.id,today).includes(net.id));R.eq={k:c.chef?'ok':'warn',v:eqJ.length+' aujourd\'hui'+(c.chef?' · chef '+esc(pers(c.chef).prenom):' · pas de chef désigné'),s:c.conducteur?'conducteur '+nomC(pers(c.conducteur)):'',n:c.chef?0:1};
  const ids=equipeIds(me);const V=DATA.pointages.filter(x=>x.site===net.id&&ids.has(x.p)&&aValider(x,me)).length;R.pt={k:V?'warn':'ok',v:V?V+' à valider':'à jour',s:'',n:V};
  const pend=M.filter(m=>m.kind==='undo'&&m.undo&&m.undo.status==='pending').length;R.undo={k:pend?'warn':'ok',v:pend?pend+' demande'+(pend>1?'s':''):'aucune demande',s:'',n:pend};
  const mt=meteoDe(net.id,today),mt2=meteoDe(net.id,iso(new Date(D(today).getTime()+864e5)));R.meteo={k:mt?'ok':'off',v:mt?METEO[mt.k][1]+' '+mt.t+' °C'+(mt2?' · demain '+METEO[mt2.k][1].toLowerCase():''):'pas de prévision',s:mt?'':'ville ou calage carte à renseigner'};
  R.vers={k:'ok',v:upd?'dernière écriture '+whenOf(upd):'jamais enregistré',s:net.sent===false?'copie pas encore envoyée':''};
  R.$={charge,n,soud}; /* avancement lu dans les fiches quand elles sont chargées (sinon la méta du serveur) */
  return R;}
function vDash(id,me){const nets=netsLocal();const net=nets.find(n=>n.id===id);const c=site(id);
  if(!net)return `<button class="ac-back" data-act="xsub" data-v="chantiers">‹ Mes chantiers</button><h2 class="vt">${esc(c.nom)}</h2><div class="card"><div class="eq-s">Ce chantier n'est pas chargé sur cet appareil : ouvre-le une fois (il se télécharge), le tableau de bord se remplira.</div><div class="eq-acts"><button class="btn primary" data-act="opensite" data-v="${esc(id)}">Ouvrir le chantier</button></div></div>`;
  const D=dashOf(net,me);const bad=DASH_DEF.filter(x=>D[x[0]].k==='bad'),warn=DASH_DEF.filter(x=>D[x[0]].k==='warn'),ok=DASH_DEF.filter(x=>D[x[0]].k==='ok').length;const nb=D.$.charge?D.$.n:(c.soudures||0),fa=D.$.charge?D.$.soud:(c.faites||0);const pc=nb?Math.round(100*fa/nb):0;
  const chk=k=>k==='ok'?'<span class="ac-chk ok" title="complet">✓</span>':k==='warn'?'<span class="ac-chk warn" title="il manque quelque chose">!</span>':k==='bad'?'<span class="ac-chk bad" title="bloquant">✗</span>':'<span class="ac-chk off" title="pas commencé">○</span>';
  const goTab=x=>x[3]?`data-act="opensite" data-v="${esc(id)}|${x[3]}"`:x[0]==='eq'?`data-act="xsub" data-v="orga"`:x[0]==='pt'?`data-act="xsub" data-v="valid"`:`data-act="opensite" data-v="${esc(id)}"`;
  const al=x=>`<button class="ac-notif ${D[x[0]].k}" ${goTab(x)}><span class="ic">${x[2]}</span><span class="tx"><b>${esc(x[1])} — ${esc(D[x[0]].v)}</b>${D[x[0]].s?`<small>${esc(D[x[0]].s)}</small>`:''}</span>${chk(D[x[0]].k)}</button>`;
  const tile=x=>{const d=D[x[0]];return `<button class="ac-kt ac-dk ${d.k==='off'?'':d.k}" ${goTab(x)}><span class="ic">${x[2]}</span><span class="tx"><b>${esc(x[4]||x[1])}${d.n?` <span class="ac-n ${d.k==='bad'?'bad':''}" style="min-width:18px;height:18px;font-size:10.5px">${d.n}</span>`:''}</b><small>${esc(d.v)}</small></span>${chk(d.k)}</button>`;};
  return `<button class="ac-back" data-act="xsub" data-v="chantiers">‹ Mes chantiers</button><h2 class="vt">${esc(c.nom)} <span class="hint">· ${esc(c.ville||'')}${c.secteur?' · '+esc(SECTEURS[c.secteur]||c.secteur):''}</span></h2>
    <div class="card"><div class="ac-stats"><div class="ac-stat ${pc>=100?'ok':''}" style="background:var(--page)"><b>${pc} %</b><small>soudé · ${fa} / ${nb}</small></div><div class="ac-stat ${bad.length?'bad':''}" style="background:var(--page)"><b>${bad.length}</b><small>bloquant${bad.length>1?'s':''}</small></div><div class="ac-stat ok" style="background:var(--page)"><b>${ok} / ${DASH_DEF.length}</b><small>✓ complets</small></div></div>
      <div class="eq-prog" style="margin-top:10px"><i style="width:${pc}%"></i></div>
      <div class="eq-acts" style="margin:10px 0 0"><button class="btn primary" data-act="opensite" data-v="${esc(id)}|bureau">Ouvrir le bureau du chantier</button><button class="btn" data-act="opensite" data-v="${esc(id)}">Plan d'ensemble</button><button class="btn" data-act="opensite" data-v="${esc(id)}|conv">Conversation${D.conv.n?' · '+D.conv.n:''}</button></div></div>
    ${bad.length||warn.length?`<div class="ac-h"><b>Ce qui coince</b><span>${bad.length} bloquant${bad.length>1?'s':''} · ${warn.length} à surveiller</span></div>${bad.map(al).join('')}${warn.map(al).join('')}`:'<div class="ac-empty">✓ Rien ne coince sur ce chantier.</div>'}
    <div class="ac-h"><b>Checklist</b><span>✓ complet · ! manque · ✗ bloquant · ○ pas commencé</span></div><div class="ac-kgrid">${DASH_DEF.map(tile).join('')}</div>
    <div class="hint" style="margin-top:10px">Chaque case lit l'état réel du module dans la copie du chantier sur cet appareil. Rien à saisir.</div>`;}
/* ── OBJECTIFS DE LA JOURNÉE (refonte ④, nuit 09→10/10) : missions en heures estimées posées par le chef de chantier / conducteur, par chantier et par jour.
   Règle d'Ethan : « ce n'est pas un plafond, je veux ça en temps d'heures » — l'objectif se lit sur l'accueil des gars, se retrouve EN FACE du pointage à la validation,
   et reste tracé jusqu'au rapport du responsable d'exploitation. Un déchargement est une mission comme une autre. Enregistré dans sites.data.missions (fusion par jour). ── */
const MTYPES=[['soud','Soudures','🎖'],['manch','Manchonnage','🧪'],['dh','Fils DH · contrôles','🔌'],['dech','Déchargement','🚚'],['pose','Terrassement · pose','🚜'],['hydro','Essai hydraulique','🌊'],['prep','Préparation · base vie','🏕'],['autre','Autre','📝']];
const mtype=k=>MTYPES.find(x=>x[0]===k)||MTYPES[MTYPES.length-1];
const missionsOf=(net,day)=>(net&&net.missions&&Array.isArray(net.missions[day])?net.missions[day]:[]).filter(m=>m&&!m.deleted);
const netOf=id=>netsLocal().find(n=>n.id===id)||null;
const ficheDe=id=>{const n=netOf(id);return (n&&n.fiche)||{};};
const missionsFor=(me,day)=>{const out=[];planDe(me.id,day).forEach(id=>{const net=netOf(id);missionsOf(net,day).forEach(m=>{if(!Array.isArray(m.who)||!m.who.length||m.who.includes(me.id))out.push(Object.assign({site:id,siteNom:site(id).nom},m));});});return out;};
const hTxt=h=>{h=+h||0;const H=Math.floor(h),m=Math.round((h-H)*60);return m?H+' h '+String(m).padStart(2,'0'):H+' h';};
function missionsTxt(ms){if(!ms.length)return '';const h=ms.reduce((a,m)=>a+(+m.h||0),0);return ms.length+' mission'+(ms.length>1?'s':'')+' · '+hTxt(h)+' estimées';}
/* ── GRANDS DÉPLACEMENTS (livret SCR § 2.7) : distance domicile (ville de l'adresse RH) → chantier (coordonnées ou ville), 4 cas, semaine type ── */
function gdOf(p,siteId){const c=site(siteId);if(!p||!p.adresse||!p.adresse.ville)return {ok:false,why:'adresse du domicile inconnue (fiche RH)'};const k=String(p.adresse.ville).trim().toLowerCase();const home=GEOCODE[k];const sll=c.ll||(c.ville?GEOCODE[String(c.ville).trim().toLowerCase()]:null);
  if(home===undefined||(!c.ll&&c.ville&&sll===undefined)){gdEnsure([p.adresse.ville,c.ll?null:c.ville].filter(Boolean));return {ok:false,why:navigator.onLine===false?'localisation impossible hors connexion':'localisation en cours…'};}
  if(!home||!sll)return {ok:false,why:!home?'ville du domicile introuvable ('+p.adresse.ville+')':'chantier sans ville ni calage'};
  const kmVol=distLL(home[0],home[1],sll[0],sll[1])/1000;const cas=gdCase(kmVol);return {ok:true,km:kmRoute(kmVol),min:minutesRoute(kmVol),cas};}
let gdT=null;const GD_TRIED={}; /* villes déjà tentées (échec réseau) : on réessaie au plus toutes les 10 min, jamais de boucle de rendu hors connexion */
function gdEnsure(villes){const now=Date.now();const need=[...new Set(villes.map(v=>String(v||'').trim().toLowerCase()).filter(v=>v&&!(v in GEOCODE)&&!(GD_TRIED[v]&&now-GD_TRIED[v]<600e3)))];if(!need.length)return;need.forEach(v=>{GD_TRIED[v]=now;});clearTimeout(gdT);gdT=setTimeout(async()=>{let got=0;for(const v of need.slice(0,12)){try{const r=await geocode(v);if(r!==null&&r!==undefined)got++;else if(v in GEOCODE)got++;}catch(e){}}if(got&&ROOT&&document.contains(ROOT))render();},200);}
function gdWeekOf(p,week){const js=semaineDe(week||0);const jours=js.map(d=>planDe(p.id,d));const ids=[...new Set(jours.flat())];if(!ids.length)return null;const main=ids.map(id=>({id,n:jours.filter(x=>x.includes(id)).length})).sort((a,b)=>b.n-a.n)[0].id;const g=gdOf(p,main);const semaine=g.ok?gdSemaine(g.cas,numSemaine(js[0]),jours.map(x=>x.length>0)):null;return {ids,main,g,semaine,jours:jours.map(x=>x.length>0),js};}
function cDeplacement(me){const w=gdWeekOf(me,0);if(!w)return '';const c=site(w.main);
  if(!w.g.ok)return `<div class="card"><h3>🚗 Mon déplacement <span class="hint">· semaine ${numSemaine(w.js[0])}</span></h3><div class="eq-s">${esc(c.nom)} — ${esc(w.g.why)}</div></div>`;
  const cas=w.g.cas,s2=w.semaine;return `<div class="card"><h3>🚗 Mon déplacement <span class="hint">· semaine ${numSemaine(w.js[0])}</span></h3><div class="eq-big">${esc(c.nom)} · ~${w.g.km} km de chez toi <span class="hint">(~${w.g.min} min)</span></div>
    <div class="eq-s" style="margin-top:4px"><b>Cas ${cas.n} · ${esc(cas.label)}</b> — ${esc(cas.crit)}</div><div class="eq-s">${esc(cas.prise)}</div>
    ${s2&&cas.n>1?`<div class="eq-tiles" style="margin-top:6px"><div class="eq-tile"><b>${s2.nuits}</b><span class="eq-s">nuitée${s2.nuits>1?'s':''}</span></div><div class="eq-tile"><b>${s2.repas}</b><span class="eq-s">repas</span></div><div class="eq-tile"><b>${s2.eur} €</b><span class="eq-s">indemnité trajet (${s2.ar} A/R)</span></div></div><div class="hint">sur ${s2.jours} jour${s2.jours>1?'s':''} planifié${s2.jours>1?'s':''} cette semaine — montant indicatif, les RH font foi (fériés, absences)</div>`:''}
    <div class="hint" style="margin-top:4px">${GD_RAPPELS[0]} ${GD_RAPPELS[1]}</div></div>`;}
function vGD(me){const js=semaineDe(S.gdWeek||0);const gens=DATA.personnes.filter(p=>p.active&&['terrain','chef'].includes(kindOf(p)==='interim'?'terrain':kindOf(p))).map(p=>({p,w:gdWeekOf(p,S.gdWeek||0)})).filter(x=>x.w);
  const tot={n:0,nuits:0,repas:0,eur:0,cas:{1:0,2:0,3:0,4:0},sans:0};gens.forEach(x=>{if(!x.w.g.ok){tot.sans++;return;}tot.n++;tot.cas[x.w.g.cas.n]++;if(x.w.semaine){tot.nuits+=x.w.semaine.nuits;tot.repas+=x.w.semaine.repas;tot.eur+=x.w.semaine.eur;}});
  const row=x=>{const c=site(x.w.main);const g=x.w.g;const s2=x.w.semaine;return `<div class="eq-row"><span class="eq-grow"><span class="eq-t">${esc(nomC(x.p))} <span class="eq-s">· ${esc(POSTES_ESP[x.p.poste]?POSTES_ESP[x.p.poste].label:x.p.poste)}${x.p.adresse&&x.p.adresse.ville?' · '+esc(x.p.adresse.ville):''}</span></span><span class="eq-s">${esc(c.nom)}${x.w.ids.length>1?' (+'+(x.w.ids.length-1)+')':''} · ${x.w.jours.filter(Boolean).length} j${g.ok?' · ~'+g.km+' km · <b>cas '+g.cas.n+'</b>'+(s2&&g.cas.n>1?' · '+s2.nuits+' nuitées · '+s2.repas+' repas · '+s2.eur+' €':g.cas.n===1?' · trajets quotidiens + repas midi':''):' · <span style="color:#7a5200">'+esc(g.why)+'</span>'}</span></span></div>`;};
  return `<div class="eq-filtres">${[[0,'Cette semaine'],[1,'Semaine prochaine'],[-1,'Semaine dernière']].map(([n,t])=>`<button class="chip${(S.gdWeek||0)===n?' active':''}" data-act="gdweek" data-v="${n}">${t}</button>`).join('')}</div>
    <div class="ac-stats" style="margin-bottom:8px"><div class="ac-stat"><b>${tot.n}</b><small>planifiés localisés</small></div><div class="ac-stat"><b>${tot.cas[2]+tot.cas[3]+tot.cas[4]}</b><small>en grand déplacement</small></div><div class="ac-stat"><b>${tot.nuits}</b><small>nuitées</small></div><div class="ac-stat"><b>${tot.repas}</b><small>repas</small></div><div class="ac-stat"><b>${nb(tot.eur)} €</b><small>indemnités trajet</small></div>${tot.sans?`<div class="ac-stat warn"><b>${tot.sans}</b><small>sans adresse / localisation</small></div>`:''}</div>
    <div class="card"><h3>Semaine ${numSemaine(js[0])} <span class="hint">· du ${fDate(js[0]).slice(0,5)} au ${fDate(js[4])}</span></h3>${gens.length?`<div class="eq-list">${gens.map(row).join('')}</div>`:'<div class="eq-s">Personne n\'est planifié cette semaine.</div>'}</div>
    <div class="card"><h3>Règles (livret d'accueil SCR § 2.7)</h3>${GD_CAS.map(c=>`<div class="eq-s" style="margin:4px 0"><b>Cas ${c.n} · ${esc(c.label)}</b> — ${esc(c.crit)} : ${esc(c.prise)}</div>`).join('')}<div class="hint" style="margin-top:6px">Hypothèses : distance = vol d'oiseau ville du domicile → chantier × 1,25 ; « 30 min » ≈ 35 km ; cycle S1…S4 des cas 3 et 4 calé sur le n° de semaine ; prorata sur les jours planifiés. ${GD_RAPPELS.join(' ')}</div></div>`;}
/* ── ⑦ HEURES & PRODUCTION (rapport du responsable d'exploitation) + VARIABLES DE PAIE (export RH) — nuit 09→10/10.
   Heures DÉFINITIVES = pointages validés en second (conducteur) ; validées chef = en attente du conducteur ; déclarées = à traiter. Objectifs (④) et production (②) en face. ── */
function rapportSemaine(k){const js=semaineDe(k);const gens=DATA.personnes.filter(p=>p.active&&(can(p,'pointage.self')||DATA.pointages.some(x=>x.p===p.id&&js.includes(x.d))));
  const rows=gens.map(p=>{const pts=js.map(d=>ptDe(p.id,d)).filter(Boolean);const tot=pts.reduce((a,x)=>a+calc(x).total,0),pa=pts.reduce((a,x)=>a+(calc(x).pa||0),0),it=pts.reduce((a,x)=>a+(calc(x).it||0),0);const fin=pts.filter(x=>valFinal(x)).reduce((a,x)=>a+calc(x).total,0),chef=pts.filter(x=>!valFinal(x)&&x.val&&x.val.length).reduce((a,x)=>a+calc(x).total,0),att=pts.filter(x=>!x.val||!x.val.length).reduce((a,x)=>a+calc(x).total,0);
    const sites=[...new Set(pts.map(x=>x.site).filter(Boolean))];const obj=js.reduce((a,d)=>a+missionsFor(p,d).reduce((b,m)=>b+(+m.h||0),0),0);const prod={};js.forEach(d=>addProd(prod,prodJour([p.id],d)));const gd=gdWeekOf(p,k);
    return {p,n:pts.length,tot,pa,it,fin,chef,att,sites,obj,prod,manq:js.filter(d=>planDe(p.id,d).length&&!ptDe(p.id,d)).length,gd:gd&&gd.g.ok?gd:null};}).filter(r=>r.n||r.obj||r.manq);
  return {js,rows};}
function vHeuresProd(me){const k=S.rpWeek||0;const R=rapportSemaine(k);const js=R.js;const T=R.rows.reduce((a,r)=>{a.tot+=r.tot;a.fin+=r.fin;a.chef+=r.chef;a.att+=r.att;a.obj+=r.obj;a.soud+=(r.prod.soudures||0);a.manch+=(r.prod.retractions||0);a.manq+=r.manq;return a;},{tot:0,fin:0,chef:0,att:0,obj:0,soud:0,manch:0,manq:0});
  const row=r=>`<tr><td><b>${esc(nomC(r.p))}</b><div class="dim" style="font-size:11px">${esc((POSTES_ESP[r.p.poste]||{}).label||'')}${r.sites.length?' · '+r.sites.map(i=>esc(site(i).nom)).join(', '):''}</div></td><td class="num">${r.n}${r.manq?` <span class="eq-tag" style="color:#9b2c22">${r.manq} manquant${r.manq>1?'s':''}</span>`:''}</td><td class="num"><b>${fDuree(r.tot)}</b></td><td class="num">${r.fin?'<span style="color:#15673a">'+fDuree(r.fin)+'</span>':'—'}</td><td class="num">${r.chef?'<span style="color:#7a5200">'+fDuree(r.chef)+'</span>':'—'}</td><td class="num">${r.att?'<span style="color:#9b2c22">'+fDuree(r.att)+'</span>':'—'}</td><td class="num">${r.pa?fDuree(r.pa):'—'}</td><td class="num">${r.obj?hTxt(r.obj):'—'}</td><td>${esc(prodTxt(r.prod))||'—'}</td><td class="num">${r.gd?'cas '+r.gd.g.cas.n+(r.gd.semaine&&r.gd.g.cas.n>1?' · '+r.gd.semaine.nuits+' n · '+r.gd.semaine.repas+' r':''):'—'}</td></tr>`;
  return `<div class="eq-filtres">${[[-2,'S-2'],[-1,'Semaine dernière'],[0,'Cette semaine']].map(([n,t])=>`<button class="chip${k===n?' active':''}" data-act="rpweek" data-v="${n}">${t}</button>`).join('')}</div>
    <div class="ac-stats" style="margin-bottom:8px"><div class="ac-stat"><b>${fDuree(T.tot)}</b><small>heures pointées</small></div><div class="ac-stat ok"><b>${fDuree(T.fin)}</b><small>définitives (conducteur)</small></div><div class="ac-stat ${T.chef?'warn':''}"><b>${fDuree(T.chef)}</b><small>validées chef, attendent le conducteur</small></div><div class="ac-stat ${T.att?'bad':''}"><b>${fDuree(T.att)}</b><small>à valider</small></div><div class="ac-stat"><b>${hTxt(T.obj)}</b><small>objectifs estimés</small></div><div class="ac-stat"><b>${T.soud}</b><small>soudures</small></div><div class="ac-stat"><b>${T.manch}</b><small>manchons</small></div>${T.manq?`<div class="ac-stat bad"><b>${T.manq}</b><small>jours planifiés sans pointage</small></div>`:''}</div>
    <div class="card"><h3>Semaine ${numSemaine(js[0])} <span class="hint">· du ${fDate(js[0]).slice(0,5)} au ${fDate(js[4])} · ${R.rows.length} personne${R.rows.length>1?'s':''}</span></h3>
      ${R.rows.length?`<div style="overflow:auto"><table class="rc af-tab"><tr><th>Personne</th><th>Jours</th><th>Pointé</th><th>Définitif</th><th>Chef</th><th>À valider</th><th>Pauses</th><th>Objectif</th><th>Production (fiches)</th><th>GD</th></tr>${R.rows.map(row).join('')}</table></div>`:'<div class="eq-s">Aucun pointage ni objectif cette semaine.</div>'}
      <div class="eq-acts" style="margin-top:8px"><button class="btn primary" data-act="rpcsv" data-v="paie">⬇ Variables de paie (CSV, par jour)</button><button class="btn" data-act="rpcsv" data-v="semaine">⬇ Rapport de la semaine (CSV)</button></div>
      <div class="hint" style="margin-top:6px">Heures définitives = validées en second par le conducteur de travaux ; « chef » = validées par le chef de chantier, en attente ; « à valider » = déclarées. Objectifs = missions en heures estimées (④), production = fiches de soudure des chantiers ouverts sur cet appareil (②), GD = cas de grand déplacement de la semaine (hypothèses du livret). Une pause non pointée n'est jamais déduite.</div></div>`;}
function rapportCSV(mode){const k=S.rpWeek||0;const R=rapportSemaine(k);const q=v=>'"'+String(v===undefined||v===null?'':v).replace(/"/g,'""')+'"';const h=m=>String(Math.round(m/6)/10).replace('.',',');const L=[];
  if(mode==='paie'){L.push(['Date','Nom','Prénom','Poste','E-mail','Chantier','Début','Fin','Pause (h)','Inter-chantier (h)','Total (h)','Statut','Validé par','Objectif (h)','Soudures','Manchons','Fils DH','GD cas','Nuitées sem.','Repas sem.','Indemnité trajet sem. (€)'].map(q).join(';'));
    R.rows.forEach(r=>R.js.forEach(d=>{const x=ptDe(r.p.id,d);if(!x)return;const c=calc(x);const st=statutPt(x);const ms=missionsFor(r.p,d);const pr=prodJour([r.p.id],d);const g=r.gd;
      L.push([fDate(d),r.p.nom,r.p.prenom,(POSTES_ESP[r.p.poste]||{}).label||r.p.poste,r.p.email||'',site(x.site).nom,c.debut?fHeure(c.debut):'',c.fin?fHeure(c.fin):'',h(c.pa||0),h(c.it||0),h(c.total),valFinal(x)?'définitif':(x.val&&x.val.length)?'validé chef':x.status==='corrige'?'corrigé':'déclaré',(x.val||[]).map(v=>nomC(pers(v.by))).join(' / '),ms.reduce((a,m)=>a+(+m.h||0),0)||'',pr.soudures||'',pr.retractions||'',pr.fils||'',g?g.g.cas.n:'',g&&g.semaine?g.semaine.nuits:'',g&&g.semaine?g.semaine.repas:'',g&&g.semaine?g.semaine.eur:''].map(v=>typeof v==='number'?String(v).replace('.',','):q(v)).join(';'));}));}
  else{L.push(['Semaine','Nom','Prénom','Poste','Jours pointés','Jours planifiés sans pointage','Heures pointées','Heures définitives','Heures validées chef','Heures à valider','Pauses (h)','Objectifs (h)','Soudures','Manchons','Fils DH','Chantiers','GD cas'].map(q).join(';'));
    R.rows.forEach(r=>L.push([numSemaine(R.js[0]),r.p.nom,r.p.prenom,(POSTES_ESP[r.p.poste]||{}).label||r.p.poste,r.n,r.manq,h(r.tot),h(r.fin),h(r.chef),h(r.att),h(r.pa),r.obj||'',r.prod.soudures||'',r.prod.retractions||'',r.prod.fils||'',r.sites.map(i=>site(i).nom).join(' / '),r.gd?r.gd.g.cas.n:''].map(v=>typeof v==='number'?String(v).replace('.',','):q(v)).join(';')));}
  return '﻿'+L.join('\n');}
function cMesDebours(me){const L=dbDe(me.id);return `<div class="card"><h3>🧾 Mes débours <span class="hint">· ${L.length?L.length+' · '+L.filter(d=>d.etat==='saisi').length+' à valider':'aucun'}</span></h3>${L.length?dbListHTML(cmdCtx(me),true).replace(/<div class="ac-stats"[\s\S]*?<\/div><\/div>/,''):'<div class="eq-s">Une dépense avancée pour le chantier (carburant, péage, hébergement, repas…) : saisis-la ici, ton conducteur valide, le bureau rembourse.</div><div class="eq-acts" style="margin-top:8px"><button class="btn primary" data-act="cmd" data-v="dbnew|">➕ Débours</button></div>'}</div>`;}
function vObjectifs(me){const js=semaineDe(0);const day=S.objDay&&js.includes(S.objDay)?S.objDay:todayIso();S.objDay=day;const mine=mesSites(me).length?mesSites(me):DATA.chantiers.filter(c=>!c.bureau);const nets=netsLocal();
  const card=c=>{const net=nets.find(n=>n.id===c.id);const ms=net?missionsOf(net,day):[];const eq=DATA.personnes.filter(p=>planDe(p.id,day).includes(c.id));const h=ms.reduce((a,m)=>a+(+m.h||0),0);const cap=eq.length*8;const adding=S.objSite===c.id;
    const who=m=>(Array.isArray(m.who)&&m.who.length?m.who.map(k=>pers(k).prenom).join(', '):'toute l\'équipe');
    return `<div class="card"><h3>📍 ${esc(c.nom)} <span class="hint">· ${eq.length} personne${eq.length>1?'s':''} ce jour-là${net?'':' · pas chargé sur cet appareil'}</span></h3>
      ${ms.length?`<div class="eq-list">${ms.map(m=>`<div class="eq-row"><span class="ic" style="font-size:18px;width:28px;text-align:center">${mtype(m.type)[2]}</span><span class="eq-grow"><span class="eq-t">${esc(m.label||mtype(m.type)[1])}${m.done?' <span class="eq-tag" style="color:#15673a">✓ faite</span>':''}</span><span class="eq-s">${esc(mtype(m.type)[1])} · <b>${hTxt(m.h)}</b> estimées · ${esc(who(m))}${m.by?' · posé par '+esc(m.by):''}</span></span><span class="eq-acts" style="margin:0"><button class="btn sm" data-act="objdone" data-v="${esc(c.id)}|${esc(m.id)}" title="faite / pas faite">${m.done?'↩':'✓'}</button><button class="btn sm" data-act="objrm" data-v="${esc(c.id)}|${esc(m.id)}" style="color:#9b2c22">✕</button></span></div>`).join('')}</div>
        <div class="eq-s" style="margin-top:6px"><b>${hTxt(h)}</b> estimées pour ${eq.length?hTxt(cap)+' d\'équipe (8 h × '+eq.length+')':'une équipe pas encore placée'}${eq.length&&h>cap*1.3?' — <span style="color:#7a5200">ambitieux, mais ce n\'est pas un plafond</span>':''}</div>`:'<div class="eq-s">Aucun objectif ce jour-là.</div>'}
      ${adding?`<div class="eq-form" style="margin-top:8px"><div class="row" style="display:flex;gap:6px;flex-wrap:wrap"><div style="flex:1;min-width:130px"><label class="f">Type</label><select class="f" id="obj-type">${MTYPES.map(t=>`<option value="${t[0]}">${t[2]} ${t[1]}</option>`).join('')}</select></div><div style="flex:0 0 90px"><label class="f">Heures</label><input class="f" id="obj-h" type="number" min="0.5" step="0.5" value="8"></div></div>
        <label class="f" style="margin-top:6px">Mission</label><input class="f" id="obj-label" placeholder="ex. souder le tronçon 3 (DN 250, 18 soudures)">
        <label class="f" style="margin-top:6px">Pour qui <span class="dim">(personne cochée = toute l'équipe du jour)</span></label><div style="display:flex;gap:6px;flex-wrap:wrap">${eq.map(p=>`<label class="chip" style="cursor:pointer"><input type="checkbox" data-objwho="${esc(p.id)}" style="margin-right:4px">${esc(p.prenom)}</label>`).join('')||'<span class="hint">personne n\'est placé ici ce jour-là (planning)</span>'}</div>
        <div class="eq-acts" style="margin-top:8px"><button class="btn primary" data-act="objok" data-v="${esc(c.id)}">Poser l'objectif</button><button class="btn" data-act="objadd" data-v="">Annuler</button></div></div>`
        :`<div class="eq-acts" style="margin-top:8px"><button class="btn ${ms.length?'':'primary'}" data-act="objadd" data-v="${esc(c.id)}" ${net?'':'disabled'}>➕ Objectif</button>${net?'':'<span class="hint">ouvre le chantier une fois pour pouvoir poser des objectifs</span>'}</div>`}</div>`;};
  return `<div class="eq-filtres">${js.map(j=>`<button class="chip${j===day?' active':''}" data-act="objday" data-v="${j}">${fJour(j)}${j===todayIso()?' · auj.':''}</button>`).join('')}</div>
    <div class="hint" style="margin:0 0 8px">Un objectif = une mission avec un temps estimé pour l'équipe du jour (un déchargement aussi). Ce n'est <b>pas un plafond</b> : il se lit sur l'accueil des gars, il est en face du pointage à la validation, et il reste tracé jusqu'au rapport du responsable d'exploitation.</div>
    ${mine.map(card).join('')||'<div class="card"><div class="eq-s">Aucun chantier.</div></div>'}`;}
function saveMissions(siteId,day,list){const net=netOf(siteId);if(net){net.missions=net.missions||{};net.missions[day]=list;}if(A.saveMissions)A.saveMissions(siteId,day,list);}
function vMesChantiersX(me){const nets=netsLocal();const mine=mesSites(me).length?mesSites(me):DATA.chantiers.filter(c=>!c.bureau);
  return `<button class="ac-back" data-act="xsub" data-v="">‹ Exploitation</button><h2 class="vt">Mes chantiers <span class="hint">· ${mine.length} · tableau de bord</span></h2>${mine.map(c=>{const net=nets.find(n=>n.id===c.id);const D=net?dashOf(net,me):null;const b=D?DASH_DEF.filter(x=>D[x[0]].k==='bad').length:0,w=D?DASH_DEF.filter(x=>D[x[0]].k==='warn').length:0,ok=D?DASH_DEF.filter(x=>D[x[0]].k==='ok').length:0;const nb=D&&D.$.charge?D.$.n:(c.soudures||0),fa=D&&D.$.charge?D.$.soud:(c.faites||0);const pc=nb?Math.round(100*fa/nb):0;
    return `<button class="ac-row" data-act="xsub" data-v="dash:${esc(c.id)}"><span class="ic" style="background:#e8f0fb">📍</span><span class="tx"><b>${esc(c.nom)}</b><small>${esc(c.ville||'')}${c.secteur?' · '+esc(SECTEURS[c.secteur]||c.secteur):''} · ${pc} % soudé${D?' · <span class="eq-tag" style="color:#15673a">✓ '+ok+' / '+DASH_DEF.length+'</span>'+(b?' <span class="eq-tag" style="color:#9b2c22">✗ '+b+'</span>':'')+(w?' <span class="eq-tag" style="color:#7a5200">! '+w+'</span>':''):' · pas chargé sur cet appareil'}</small></span><span class="chev">${CHEV}</span></button>`;}).join('')||'<div class="card"><div class="eq-s">Aucun chantier.</div></div>'}`;}
export function espaceDash(id){S.tab='expl';S.xsub='dash:'+id;S.fiche=null;if(A.homeTab){A.homeTab('expl');return;}render();}
export function espaceGo(xsub){S.tab='expl';S.xsub=xsub||null;S.fiche=null;if(A.homeTab){A.homeTab('expl');return;}render();}
/* ── BUREAU DU CHANTIER (onglet « Bureau » dans le chantier, next.js) : l'idée d'Ethan du 09/10 soir — « ce bureau bien plus ergonomique peut refaçonner la manière dont est ventilé le chantier
   quand tu rentres dedans » : la même checklist que le tableau de bord, les raccourcis vers les onglets, l'objectif du jour, l'accueil chantier, les messages — SANS rien retirer des onglets existants. ── */
export function espaceBureau(id){if(!DATA)DATA=buildData();const acc=A.current();const me=DATA.personnes.find(p=>p.id===personKey(acc))||null;const net=netOf(id);const c=site(id);const today=todayIso();const name=A.userName?A.userName():(me?nomC(me):'');const key=A.userKey?A.userKey():null;
  const enc=me?(can(me,'pointage.validate')||can(me,'planning.edit')):false;const D=net&&me&&enc?dashOf(net,me):null;const mt=meteoDe(id,today);const fiche=(net&&net.fiche)||{};
  const msgs=net?liveMsgs(net):[];const seen=A.seen?A.seen(id):'';const unread=msgs.filter(m=>m.by!==name&&(m.at||'')>seen).length;const tasks=msgs.filter(m=>m.kind==='task'&&m.task&&!m.task.done&&(m.task.to==='tous'||m.task.to===name)).length;
  const docs=net?((net.qse&&net.qse.docs)||[]).filter(d0=>d0&&!d0.deleted):[];const qseTodo=me&&can(me,'qse.sign')?docs.filter(d0=>qseReq(d0)&&!qseSigned(d0,name,key)).length:0;const accueilDone=docs.some(d0=>d0.type==='accueil'&&qseSigned(d0,name,key));
  const mine=me?missionsFor(me,today).filter(m=>m.site===id):[];const all=net?missionsOf(net,today):[];const eq=DATA.personnes.filter(p=>p.active&&planDe(p.id,today).includes(id));
  const qhs=me&&can(me,'qse.sign')?qhsTodo(qhsMyKey(),name,[id],today):[];
  return {me,acc,c,fiche,enc,today,meteo:mt?{k:mt.k,t:mt.t,label:METEO[mt.k][1],tenue:TENUE_TXT[mt.k]||''}:null,chef:c.chef?nomC(pers(c.chef)):'',conducteur:c.conducteur?nomC(pers(c.conducteur)):'',eq:eq.map(p=>p.prenom),unread,tasks,qseTodo,accueilDone,qhs:qhs.map(x=>({id:x.run.id,title:x.run.title||x.run.topic,by:x.run.by||''})),accueilExpected:espaceAccueilExpected(id),canSign:me?can(me,'qse.sign'):false,isTerrain:me?['terrain','interim','chef'].includes(kindOf(me)):false,
    objectifs:{mine:mine.map(m=>({label:m.label,h:m.h,done:!!m.done})),all:all.map(m=>({label:m.label,h:m.h,who:(m.who||[]).map(k=>pers(k).prenom),done:!!m.done})),txt:missionsTxt(mine.length?mine:all)},
    dash:D?DASH_DEF.map(x=>Object.assign({key:x[0],lab:x[1],ic:x[2],tab:x[3],short:x[4]},D[x[0]])):null,bad:D?DASH_DEF.filter(x=>D[x[0]].k==='bad').map(x=>({lab:x[1],v:D[x[0]].v,s:D[x[0]].s,tab:x[3]})):[],warn:D?DASH_DEF.filter(x=>D[x[0]].k==='warn').map(x=>({lab:x[1],v:D[x[0]].v,s:D[x[0]].s,tab:x[3]})):[],pc:D?(D.$.charge&&D.$.n?Math.round(100*D.$.soud/D.$.n):(c.soudures?Math.round(100*(c.faites||0)/c.soudures):0)):null};}
/* 10/10 (retours Ethan) — qui est là aujourd'hui sur ce chantier (planning), chef / conducteur de la fiche : pré-remplit le contrôle chantier */
export function espacePresents(id){if(!DATA)DATA=buildData();const today=todayIso();const c=site(id);const eq=DATA.personnes.filter(p=>p.active&&planDe(p.id,today).includes(id));
  return {names:eq.map(p=>nomC(p)),chef:c&&c.chef?nomC(pers(c.chef)):'',conducteur:c&&c.conducteur?nomC(pers(c.conducteur)):''};}
/* l'accueil chantier est ATTENDU de la personne connectée sur ce chantier si elle est terrain / intérim / chef de chantier (les autres peuvent le faire, sans pastille) */
export function espaceAccueilExpected(id){if(!DATA)DATA=buildData();const acc=A.current();const me=DATA.personnes.find(p=>p.id===personKey(acc))||null;if(!me)return false;return ['terrain','interim','chef'].includes(kindOf(me))&&semaineDe(0).some(d=>planDe(me.id,d).includes(id));} /* Ethan 10/10 : « juste les personnes pointées au planning sur un chantier » */
/* chantiers « à moi » (chef / conducteur) ou de mon secteur — pour déclencher un quart d'heure sécurité sur « mes chantiers » */
export function espaceMesSites(){if(!DATA)DATA=buildData();const acc=A.current();const me=DATA.personnes.find(p=>p.id===personKey(acc))||null;if(!me)return [];const mine=mesSites(me);if(mine.length)return mine.map(c=>c.id);const sect=mySecteur(me);return DATA.chantiers.filter(c=>!c.bureau&&(!sect||c.secteur===sect)).map(c=>c.id);}
/* ── ESPACE EXPLOITATION (encadrement : conducteurs, responsables, direction ; chef de chantier : version réduite) ── */
function vExpl(me){const x=S.xsub;const back=t=>`<button class="ac-back" data-act="xsub" data-v="">‹ Exploitation</button>${t?`<h2 class="vt">${t}</h2>`:''}`;
  if(x==='orga')return back('')+(can(me,'planning.edit')?vOrga(me):vPlanning(me)); /* les vues ont leur propre titre */
  if(x==='chantiers')return vMesChantiersX(me);
  if(x&&x.startsWith('dash:'))return vDash(x.slice(5),me);
  if(x==='valid')return back('Pointages à valider')+(can(me,'pointage.validate')?`<div class="eq-cols eq-1"><div>${cValidation(me)}</div></div>`:'<div class="card"><div class="eq-s">Pas de validation pour toi.</div></div>');
  if(x==='flotte')return (can(me,'flotte.manage')?back('')+flotteView(flCtx(me)):back('Flotte')+'<div class="card"><div class="eq-s">Pas d\'accès à la flotte.</div></div>');
  if(x==='gd')return back('Grands déplacements')+vGD(me);
  if(x==='aff')return (can(me,'affaires.view')?back('')+affView(me,affCtx(me)):back('Affaires')+'<div class="card"><div class="eq-s">Pas d\'accès aux affaires.</div></div>');
  if(x==='cmd')return back('Bons de commande & débours')+cmdView(cmdCtx(me));
  if(x==='rapport')return back('Heures & production')+vHeuresProd(me);
  if(x==='prodEq')return back('')+vProdEquipe(me,prodIds(me)||DATA.personnes.filter(p=>p.active&&OPERATEURS.includes(p.poste)).map(p=>p.id));
  if(x==='obj')return back('Objectifs de la journée')+vObjectifs(me);
  if(x==='docs')return back('Documents d\'entreprise')+docsAdminHTML(DATA.personnes.map(p=>p._acc).filter(Boolean));
  if(x==='controles')return back('Contrôles chantier')+vControles(me);
  if(x==='qhs')return back('Quart d\'heure sécurité')+vQhs(me);
  if(x==='habsEq')return back('Habilitations de l\'équipe')+`<div class="eq-cols eq-1"><div>${can(me,'qse.manage')?cTableHabs(me):cEchEquipe(me)||'<div class="card"><div class="eq-s">Rien à signaler.</div></div>'}</div></div>`;
  if(x==='annul'){const nets=netsLocal();const rows=[];nets.forEach(net=>liveMsgs(net).filter(m=>m.kind==='undo'&&m.undo&&m.undo.status==='pending').forEach(m=>rows.push({net,m})));
    return back('Demandes d\'annulation')+(rows.length?rows.map(r=>`<button class="ac-row" data-act="opensite" data-v="${esc(r.net.id)}|conv"><span class="ic" style="background:#fdebe3">${ICO.undo}</span><span class="tx"><b>${esc(r.m.by||'')} · ${esc(r.m.undo.weldId||'soudure')}</b><small>${esc(r.net.name||r.net.id)} · ${esc(String(r.m.text||r.m.undo.reason||'').slice(0,80))}</small></span><span class="chev">${CHEV}</span></button>`).join('')+'<div class="hint">Tu tranches dans la conversation du chantier (accepter / refuser) — tout est journalisé.</div>':'<div class="ac-empty">✓ Aucune demande en attente sur les chantiers de cet appareil.</div>');}
  NOTIFS=notifsFor(me);const nV=NOTIFS.filter(n=>n.act&&n.ic===ICO.check).reduce((a,n)=>a+(parseInt(n.t)||0),0),nM=NOTIFS.filter(n=>n.act&&n.ic===ICO.clock).reduce((a,n)=>a+(parseInt(n.t)||0),0),nA=NOTIFS.filter(n=>n.act&&n.ic===ICO.undo).reduce((a,n)=>a+(parseInt(n.t)||0),0),nP=NOTIFS.filter(n=>n.act&&n.ic===ICO.cal).reduce((a,n)=>a+(parseInt(n.t.replace(/^[^:]*:\s*/,''))||0),0);
  const row=(t,s,ic,bg,go,n,nc,soon)=>`<button class="ac-row${soon?' soon':''}" data-act="${soon?'sim':'xgo'}" data-v="${esc(soon?t:go)}"><span class="ic" style="background:${bg}">${ic}</span><span class="tx"><b>${esc(t)}</b><small>${esc(s)}</small></span>${n?`<span class="ac-n ${nc||''}">${n}</span>`:''}${soon?'<span class="eq-tag">bientôt</span>':''}<span class="chev">${CHEV}</span></button>`;
  const chef=!can(me,'planning.edit');const sect=mySecteur(me);
  return `<h2 class="vt">Exploitation <span class="hint">· ${chef?'chef de chantier':sect?'secteur '+esc(SECTEURS[sect]||sect):'tous les secteurs'} · semaine ${numSemaine(todayIso())}</span></h2>
    ${chef?row('Mon planning et mon équipe','Qui est avec toi, quels jours, sur quels chantiers — fait par ton conducteur',ICO.cal,'#fdebe3','orga'):row('Planning des équipes','Placer les gars semaine par semaine, par secteur',ICO.cal,'#fdebe3','orga',nP?nP+' à placer':null,'bad')}
    ${row('Pointages à valider','Heures de l\'équipe, correction avec motif · pointages manquants',ICO.check,'#e6f5ec','valid',(nV+nM)||null,nM?'bad':'')}
    ${row('Demandes d\'annulation','Soudures à annuler au-delà des crédits — tu tranches',ICO.undo,'#fdebe3','annul',nA||null)}
    ${row('Mes chantiers','Tableau de bord par chantier : ce qui coince, checklist des modules',ICO.pin,'#e8f0fb','chantiers',(mesSites(me).length||DATA.chantiers.filter(c=>!c.bureau).length))}
    ${row('Habilitations de l\'équipe','Échéances, recyclages à programmer',ICO.badge,'#fff4d6','habsEq',alertesHab(equipeDe(me),0).length||null,'bad')}
    ${can(me,'flotte.manage')?row('Flotte · parc véhicules','Contrôles techniques, vidanges, contrats, conducteurs, contrôles visuels, signalements',ICO.cart,'#ececea','flotte',(()=>{const n=vehAll().filter(v=>vehAlertes(v).some(a=>a.sev==='bad')).length;return n||null;})(),'bad'):''}
    ${(can(me,'planning.edit')||accueilType(me)==='rh'||me.admin)?row('Grands déplacements','Cas 1 à 4 selon la distance domicile → chantier, nuitées, repas, indemnités de la semaine',ICO.home,'#fff4d6','gd',null):''}
    ${can(me,'affaires.view')?row('Affaires · commerce','Préconsultations, devis, chantiers en cours : fiche, DCE, chiffrage par DN, situations et facturation',ICO.cart,'#e3f3f3','aff',(()=>{const n=affAll().filter(a=>a.etat==='devis'||a.etat==='preconsult').length;return n||null;})()):''}
    ${(can(me,'qse.manage')||me.admin)?row('Documents d\'entreprise','Règlement intérieur, notes de service, flash info, accueil nouvel arrivant — qui a signé, qui est à relancer',ICO.doc,'#e8f0fb','docs',(()=>{const all=DATA.personnes.map(p=>p._acc).filter(Boolean);const n=all.filter(a=>docsTodo(a).length).length;return n||null;})(),'bad'):''}
    ${(can(me,'qse.manage')||me.admin)?row('Contrôles chantier','Qui contrôle, à quelle fréquence, où ça traîne — objectif : un contrôle par chantier actif toutes les 2 semaines',ICO.check,'#fff4d6','controles',(()=>{const r=ctrlRecap();return r.late.length||null;})(),'bad'):''}
    ${(can(me,'qse.manage')||me.admin)?row('Quart d\'heure sécurité','Déclencher un sujet du jour sur un chantier ou tous — sujet, questions, émargement de tous',ICO.hat,'#fdebe3','qhs',(()=>{const n=qhsRuns().filter(r=>r.date===todayIso()).length;return n||null;})()):''}
    ${(can(me,'pointage.validate')&&(can(me,'planning.edit')||accueilType(me)==='rh'||accueilType(me)==='direction'||me.admin))?row('Heures & production · rapport','Heures définitives, validées, à valider · objectifs · production · variables de paie (CSV)',ICO.clock,'#e6f5ec','rapport',(()=>{const R=rapportSemaine(-1);const a=R.rows.reduce((x,r)=>x+(r.att>0?1:0),0);return a||null;})(),'bad'):''}
    ${row('Production des équipes','Par chantier, par personne, par DN — depuis les fiches de soudure des chantiers ouverts sur cet appareil',ICO.flag,'#efeafb','prodEq',null)}
    ${row('Objectifs de la journée','Missions de l\'équipe en heures estimées — pas un plafond',ICO.flag,'#fdebe3','obj',(()=>{const t=todayIso();return mesSites(me).reduce((a,c)=>a+missionsOf(netOf(c.id),t).length,0)||null;})())}
    ${(can(me,'planning.edit')||can(me,'affaires.edit')||me.admin)?row('Bons de commande & débours','Commandes fournisseurs (bon imprimable) · débours à valider et rembourser',ICO.cart,'#ececea','cmd',dbTodo().length||null,'bad'):''}
    ${can(me,'site.tracer')?row('Traceur','Tracer un réseau à partir du DWG, l\'envoyer dans l\'appli',ICO.ruler,'#e3f3f3','traceur'):''}`;}
/* ── 10/10 (retour Ethan) : SUIVI DES CONTRÔLES CHANTIER — « la direction et le responsable d'exploitation ont un visuel de qui a fait des contrôles, à quelle fréquence ; on va mettre des objectifs là-dessus » ── */
const CTRL_OBJ_DAYS=14; /* objectif : un contrôle par chantier actif toutes les 2 semaines */
function ctrlRecap(){const nets=netsLocal();const today=todayIso();const all=[];nets.forEach(net=>controlesOf(net).forEach(c=>all.push({c,net})));all.sort((a,b)=>String(b.c.at||'').localeCompare(String(a.c.at||'')));
  const since=k=>{const d=D(today);d.setDate(d.getDate()-k);return iso(d);};const d28=since(28),d84=since(84);
  const byWho={};all.forEach(x=>{const w=x.c.by||'?';const o=byWho[w]=byWho[w]||{who:w,n28:0,n84:0,n:0,nc:0,last:null};o.n++;if((x.c.at||'')>=d28)o.n28++;if((x.c.at||'')>=d84)o.n84++;o.nc+=controleNC(x.c);if(!o.last||x.c.at>o.last)o.last=x.c.at;});
  const planned=new Set(semaineDe(0).flatMap(d=>DATA.personnes.filter(p=>p.active).flatMap(p=>planDe(p.id,d))));const active=DATA.chantiers.filter(c=>!c.bureau&&(planned.has(c.id)||(netOf(c.id)&&controlesOf(netOf(c.id)).length)));
  const sites=active.map(c=>{const net=netOf(c.id);const L=net?controlesOf(net).slice().sort((a,b)=>String(b.at||'').localeCompare(String(a.at||''))):[];const last=L[0]||null;const days=last?Math.round((Date.parse(today)-Date.parse(String(last.at).slice(0,10)))/86400e3):null;return {c,last,days,ncOpen:L.length?controleNC(L[0]):0,n:L.length};}).sort((a,b)=>(b.days===null?1e9:b.days)-(a.days===null?1e9:a.days));
  return {all,who:Object.values(byWho).sort((a,b)=>b.n84-a.n84),sites,late:sites.filter(x=>x.days===null||x.days>CTRL_OBJ_DAYS)};}
function vControles(me){const R=ctrlRecap();const today=todayIso();
  const who=R.who.length?`<div class="card" style="padding:4px 10px"><table class="rc" style="font-size:12px"><tr><th>Encadrant</th><th>4 sem.</th><th>12 sem.</th><th>Total</th><th>NC relevées</th><th>Dernier</th></tr>${R.who.map(w=>`<tr><td><b>${esc(w.who)}</b></td><td>${w.n28}</td><td>${w.n84}</td><td>${w.n}</td><td style="color:${w.nc?'#a01212':'inherit'}">${w.nc}</td><td class="dim">${w.last?fDate(String(w.last).slice(0,10)):'—'}</td></tr>`).join('')}</table></div>`:'<div class="ac-empty">Aucun contrôle enregistré sur les chantiers de cet appareil.</div>';
  const sites=R.sites.length?`<div class="card" style="padding:4px 10px"><table class="rc" style="font-size:12px"><tr><th>Chantier</th><th>Dernier contrôle</th><th>Il y a</th><th>NC</th></tr>${R.sites.map(x=>`<tr><td><b>${esc(x.c.nom)}</b><div class="dim" style="font-size:11px">${esc(x.c.ville||'')}${x.c.chef?' · chef '+esc(pers(x.c.chef).prenom):''}</div></td><td>${x.last?fDate(String(x.last.at).slice(0,10))+' <span class="dim">· '+esc(x.last.by||'')+'</span>':'<span style="color:#a01212;font-weight:700">jamais</span>'}</td><td style="font-weight:700;color:${x.days===null||x.days>CTRL_OBJ_DAYS?'#a01212':x.days>CTRL_OBJ_DAYS-4?'#7a5a00':'#15673a'}">${x.days===null?'—':x.days+' j'}</td><td style="color:${x.ncOpen?'#a01212':'inherit'}">${x.ncOpen||'—'}</td></tr>`).join('')}</table></div>`:'<div class="ac-empty">Aucun chantier actif cette semaine.</div>';
  const list=R.all.slice(0,40).map(x=>{const nc=controleNC(x.c);return `<button class="ac-row" data-act="ctopen" data-v="${esc(x.net.id)}|${esc(x.c.id)}"><span class="ic" style="background:${nc?'#fdeae7':'#e6f5ec'}">${nc?'✗':'✓'}</span><span class="tx"><b>${fDate(String(x.c.at).slice(0,10))} · ${esc(x.net.name||x.net.id)}</b><small>${esc(x.c.by||'')} · ${Object.keys(x.c.items||{}).length} points · <b>${nc}</b> NC${x.c.risque?' · situation à risque notée':''}${x.c.presents?' · présents : '+esc(String(x.c.presents).slice(0,60)):''}</small></span><span class="chev">${CHEV}</span></button>`;}).join('');
  return `<div class="hint" style="margin:0 0 8px">Objectif : <b>un contrôle par chantier actif toutes les ${CTRL_OBJ_DAYS/7} semaines</b> (à ajuster avec la direction). Les contrôles se font depuis l'onglet QSE du chantier (encadrement). Chantiers actifs = du monde placé cette semaine (ou déjà contrôlés).</div>
    <div class="ac-h"><b>Par encadrant</b><span>12 dernières semaines</span></div>${who}
    <div class="ac-h"><b>Par chantier actif</b><span>${R.late.length?R.late.length+' en retard':'✓ tous dans l\'objectif'}</span></div>${sites}
    <div class="ac-h"><b>Derniers contrôles</b><span>${R.all.length}</span></div>${list||'<div class="ac-empty">Rien pour l\'instant.</div>'}`;}
/* ── 10/10 : QUART D'HEURE SÉCURITÉ (Exploitation) — déclencher, suivre ── */
function vQhs(me){return `<div class="hint" style="margin:0 0 8px">Un quart d'heure sécurité = un sujet à dérouler en entier, un quiz vrai / faux, « je m'engage » signé au doigt (+ retour de l'échange), puis retour et signature de l'animateur — pour tout le monde placé sur le(s) chantier(s) ce jour-là (chefs de chantier compris). Sujets : les 12 quarts d'heure SCR (annexe 5 du guide sécurité) : contexte, objectifs, chiffres clés, vrai / faux, notions clés, « je m'engage ».</div>
    <div class="eq-acts" style="margin:0 0 8px"><button class="btn primary" data-act="qhsnew">⛑️ Déclencher un quart d'heure sécurité</button></div>
    <div class="ac-h"><b>Déclenchés</b><span>40 derniers</span></div>${qhsRecapHTML(DATA.chantiers)}`;}
/* ── Sous-onglets selon les droits ── */
function subsFor(me){
  if(S.tab!=='moi')return [];
  return [['moi','Accueil'],['docs','Documents'],['planning','Planning'],mesSites(me).length&&['chantiers','Chantiers'],prodIds(me)&&['prod','Productions'],(can(me,'pointage.self')||can(me,'pointage.validate'))&&['heures',can(me,'pointage.self')?'Heures':'Pointages'],['habs','Habilitations'],KIT&&avPoste(me)&&['avatar','Avatar']].filter(Boolean);
}
function badge(me,k){
  const val=can(me,'pointage.validate'),qse=can(me,'qse.manage');
  const nV=()=>{const ids=equipeIds(me);return DATA.pointages.filter(x=>ids.has(x.p)&&aValider(x,me)).length};
  const nP=()=>habsDe(me).filter(x=>x.etat==='expiree'||x.etat==='echeance').length;
  const nE=()=>alertesHab(equipeDe(me),0).length;
  let n=0,r=false;
  if(k==='docs'){n=me._acc?docsTodo(me._acc).length:0;r=true;}
  else if((k==='heures'||k==='valid')&&val)n=nV();
  else if(k==='meshabs'||(k==='habs'&&!qse))n=nP();
  else if(k==='ech'||(k==='habs'&&qse)){n=nE();r=true}
  return n?` <span class="eq-badge${r?' eq-rouge':''}">${n}</span>`:'';
}
function fix(me){const s=subsFor(me).map(x=>x[0]);if(s.length&&!s.includes(S.sub))S.sub=s[0];}
function vue(me){
  if(S.tab==='entreprise')return vEntreprise(me);
  if(S.tab==='accueil')return vAccueil(me);
  if(S.tab==='expl')return vExpl(me);
  switch(S.sub){
    case 'moi':return vMoi(me);
    case 'planning':return vPlanning(me);
    case 'orga':return vOrga(me);
    case 'prod':return vProd(me);
    case 'chantiers':return vChantiers(me);
    case 'heures':return vHeures(me);
    case 'habs':return vHabs(me,true,true);
    case 'avatar':return vAvatar(me);
    case 'docs':return me._acc?docsListHTML(me._acc):'';
  }
  return '';
}
/* ── Rendu dans l'accueil (#homeBody) : sous-onglets, vue, panneau de fiche ── */
function render(){
  if(!ROOT)return;AVM={};AVA=[];
  DATA=buildData();if(!S.per.m)S.per.m=DATA.today.slice(0,7);const acc=A.current();S.me=personKey(acc);const me=DATA.personnes.find(p=>p.id===S.me);
  if(!me){ROOT.innerHTML=`<div class="eq-app" id="eq-app"><div class="card"><h3>Mon espace</h3><div class="eq-s">Connecte-toi avec ton compte pour voir ton espace.</div></div></div>`;return;}
  fix(me);meteoEnsure();
  const subs=subsFor(me),panneau=!!S.fiche;
  const sy=ROOT.scrollTop;
  ROOT.innerHTML=`<div class="eq-app" id="eq-app">
    ${subs.length?`<div class="eq-subs">${subs.map(([k,t])=>`<button class="chip${S.sub===k?' active':''}" data-act="sub" data-v="${k}">${t}${badge(me,k)}</button>`).join('')}</div>`:''}
    ${LOADED?'':'<div class="hint" style="padding:4px 0">Chargement des fiches…</div>'}
    <div class="eq-scroll">${vue(me)}</div>
    ${panneau?`<button class="eq-sheet-bg" data-act="close" aria-label="Fermer"></button><div class="eq-sheet"><div class="eq-poignee"></div>
      <div class="eq-sheet-top"><h3 style="margin:0">Fiche</h3><button class="btn" data-act="close">✕ Fermer</button></div>${blocsFiche(pers(S.fiche),me).join('')}</div>`:''}</div>`;
  ROOT.scrollTop=sy;
}
// point d'entrée : app.js appelle espaceRender(#homeBody, 'moi' | 'entreprise') ; relance le chargement serveur si pas encore fait
export function espaceRender(el,tab){ROOT=el;S.tab=['entreprise','accueil','expl'].includes(tab)?tab:'moi';if(S.tab!=='expl')S.xsub=null;S.fiche=null;S.corr=null;S.edit=false;render();if(!LOADED&&!loading){loading=true;espaceLoad().catch(e=>console.warn(e)).finally(()=>{loading=false;});}}
let loading=false;
export function espaceOpenFiche(key){S.fiche=key;render();}
export function espaceSub(k){if(k==='orga'){S.tab='expl';S.xsub='orga';if(A.homeTab){A.homeTab('expl');return;}render();return;}S.tab='moi';S.sub=k;render();}
/* ── Actions (clics délégués) : tout ce qui modifie est enregistré ── */
const GO={mesheures:['moi','heures'],valid:['moi','heures'],meshabs:['moi','habs'],ech:['moi','habs'],annu:['entreprise','moi'],planning:['moi','planning'],prod:['moi','prod'],chantiers:['moi','chantiers'],avatar:['moi','avatar']};
function validerPt(x){x.status='valide';x.val.push({by:S.me,at:DATA.today+'T'+DATA.now});savePointage(x);}
function msg(t){A.toast(t);}
const affCtx=me=>({canEdit:can(me,'affaires.edit')&&!viewing(),render,sites:(A.sites&&A.sites())||[],traceAgg:A.traceAgg});
const flCtx=me=>({canEdit:can(me,'flotte.manage')&&!viewing(),render,people:DATA.personnes.map(p=>p._acc).filter(Boolean)});
const cmdCtx=me=>({canEdit:(can(me,'planning.edit')||can(me,'affaires.edit')||me.admin)&&!viewing(),canValidate:(can(me,'planning.edit')||can(me,'affaires.edit')||me.admin)&&!viewing(),render,sites:DATA.chantiers.filter(c=>!c.bureau).map(c=>({id:c.id,name:c.nom})),affaires:affAll(),me,key:me.id,name:nomC(me),siteDefault:planDe(me.id,todayIso())[0]||null});
const ACT={
  tab(v){S.tab=v;S.fiche=null;S.sub='moi';if(A.homeTab)A.homeTab(v==='entreprise'?'entreprise':'espace');else render()},
  tabgo(v){if(v==='traceur'){if(A.traceur)A.traceur();return;}if(v==='admin'||v==='sites'||v==='expl'||v==='espace'||v==='entreprise'){if(v==='expl')S.xsub=null;if(A.homeTab)A.homeTab(v);return;}},
  notif(v){const n=NOTIFS[+v];if(n&&n.go)n.go();},
  af(v,el){const me=pers(S.me);if(!can(me,'affaires.view'))return;affAct(v,el,affCtx(me));},
  cmd(v,el){const me=pers(S.me);if(viewing()&&!/^(open|back|tab|etat)\|/.test(String(v))){viewOnly();return;}cmdAct(v,el,cmdCtx(me));},
  fl(v,el){const me=pers(S.me);if(viewing()&&!String(v).startsWith('open|')&&!String(v).startsWith('back|')){viewOnly();return;}flotteAct(v,el,flCtx(me));},
  gdweek(v){S.gdWeek=+v;render()},
  rpweek(v){S.rpWeek=+v;render()},
  rpcsv(v){const csv=rapportCSV(v);const blob=new Blob([csv],{type:'text/csv;charset=utf-8'});const u=URL.createObjectURL(blob);const el=document.createElement('a');el.href=u;el.download=(v==='paie'?'variables_paie_S':'rapport_S')+numSemaine(semaineDe(S.rpWeek||0)[0])+'.csv';document.body.appendChild(el);el.click();el.remove();setTimeout(()=>URL.revokeObjectURL(u),2000);msg('Export CSV prêt (Excel, séparateur ;)')},
  objday(v){S.objDay=v;S.objSite=null;render()},
  objadd(v){if(viewing()){viewOnly();return;}S.objSite=v||null;render()},
  objok(v){if(viewing()){viewOnly();return;}const day=S.objDay||todayIso();const net=netOf(v);if(!net)return;const type=$id('obj-type').value,h=parseFloat(String($id('obj-h').value).replace(',','.')),label=$id('obj-label').value.trim();if(!(h>0)){msg('Un temps estimé en heures');return;}
    const who=[...document.querySelectorAll('#eq-app [data-objwho]:checked')].map(i=>i.dataset.objwho);const list=missionsOf(net,day).concat([{id:'M'+Date.now().toString(36)+Math.random().toString(36).slice(2,5),type,label:label||mtype(type)[1],h,who,by:nomC(pers(S.me)),at:new Date().toISOString()}]);
    saveMissions(v,day,list);S.objSite=null;render();msg('Objectif posé — visible sur l\'accueil de l\'équipe')},
  objrm(v){if(viewing()){viewOnly();return;}const [id,mid]=v.split('|');const day=S.objDay||todayIso();const net=netOf(id);if(!net)return;saveMissions(id,day,missionsOf(net,day).filter(m=>m.id!==mid));render()},
  objdone(v){if(viewing()){viewOnly();return;}const [id,mid]=v.split('|');const day=S.objDay||todayIso();const net=netOf(id);if(!net)return;saveMissions(id,day,missionsOf(net,day).map(m=>m.id===mid?Object.assign({},m,{done:m.done?null:{at:new Date().toISOString(),by:nomC(pers(S.me))}}):m));render()},
  docopen(v){const me=pers(S.me);if(viewing()){viewOnly();return;}docOpen(v,me&&me._acc);},
  docadm(v){docAdminOpen(v,DATA.personnes.map(p=>p._acc).filter(Boolean));},
  docnew(v){if(viewing()){viewOnly();return;}docNewOpen(v||'note');},
  doclate(){const w=window.open('','_blank');if(!w){msg('Autorise la fenêtre pop-up pour imprimer');return;}w.document.write(docsLateHTML(DATA.personnes.map(p=>p._acc).filter(Boolean)));w.document.close();},
  qhsnew(){if(viewing()){viewOnly();return;}qhsTriggerOpen({sites:espaceMesSites(),after:()=>render()});},
  ctopen(v){const [id,cid]=String(v).split('|');const net=netOf(id);const c=net?controlesOf(net).find(x=>x.id===cid):null;if(!c){msg('Contrôle introuvable sur cet appareil');return;}const w=window.open('','_blank');if(!w){msg('Autorise la fenêtre pop-up pour afficher le rapport');return;}w.document.write(controleReportHTML(c,net));w.document.close();},
  xsub(v){S.xsub=v||null;S.fiche=null;render();window.scrollTo(0,0)},
  xgo(v){if(v==='sites'||v==='traceur'){ACT.tabgo(v);return;}S.xsub=v;S.fiche=null;render()},
  sub(v){S.sub=v;S.fiche=null;S.corr=null;render()},
  go(v){const g=GO[v];if(!g)return;S.sub=g[1];S.fiche=null;if(g[0]!==S.tab){S.tab=g[0];if(A.homeTab){A.homeTab(g[0]==='entreprise'?'entreprise':'espace');return}}render()},
  pointer(k){const me=pers(S.me),st=siteActuel(me),at=DATA.today+'T'+DATA.now;let x=ptDe(me.id,DATA.today);
    if(!x){x={p:me.id,d:DATA.today,site:st?st.id:null,status:'declare',corr:null,events:[],val:[]};}
    const e={t:k,at};x.events.push(e);savePointage(x);render();msg('Pointage « '+EVT[k]+' » à '+fHeure(at));
    if((k==='start'||k==='end')&&navigator.geolocation)try{navigator.geolocation.getCurrentPosition(pos=>{e.pos=[+pos.coords.latitude.toFixed(5),+pos.coords.longitude.toFixed(5)];savePointage(x);},()=>{},{timeout:8000,maximumAge:60000});}catch(err){} /* position ponctuelle au début et à la fin, c'est tout */},
  tache(v){if(!DATA.taches)return;const t=DATA.taches[+v];if(t){t.fait=!t.fait;render()}},
  periode(v){S.per.mode=v;render()},
  pernav(v){const p=S.per;if(p.mode==='sem')p.k=Math.max(KMIN,Math.min(0,p.k+ +v));else{const ms=moisDispo(),i=Math.max(0,Math.min(ms.length-1,ms.indexOf(p.m)+ +v));p.m=ms[i]}render()},
  sem(v,el){S.semOpen[v]=el.getAttribute('aria-expanded')!=='true';render()},
  plansem(v){S.planSem=+v;S.planJour=null;render()},
  planjour(v){S.planJour=v;render()},
  entvue(v){S.entVue=v;render()},
  fiche(v){S.fiche=v;render()},
  close(){S.fiche=null;render()},
  opensite(v){const [id,tab]=String(v).split('|');if(A.openSite)A.openSite(id,tab||undefined);},
  jour(v){S.open[v]=!S.open[v];render()},
  valmode(v){S.valMode=v;S.corr=null;render()},
  valjour(v){S.valJour=v;S.corr=null;render()},
  valpers(v){S.valPers=v;S.corr=null;render()},
  valider(v){const x=ptParId(v);if(!x)return;validerPt(x);render();msg('Pointage validé')},
  toutvalider(v){const l=v.split(',');let n=0;l.forEach(id=>{const x=ptParId(id);if(x){validerPt(x);n++}});render();msg(n+' pointage'+(n>1?'s':'')+' validé'+(n>1?'s':''))},
  corr(v){S.corr=v;render()},
  corrno(){S.corr=null;render()},
  corrok(v){
    const x=ptParId(v);if(!x)return;const t=$id('eq-corr-t').value,h=$id('eq-corr-h').value,m=$id('eq-corr-m').value;
    if(!h){msg('Indique une heure');return}
    const e=x.events.filter(e=>e.t===t).pop(),avant=e?e.at.slice(-5):null;
    if(e)e.at=x.d+'T'+h;else x.events.push({t,at:x.d+'T'+h});
    x.events.sort((a,b)=>a.at<b.at?-1:a.at>b.at?1:0);
    x.status='corrige';x.corr={t,heure:h,avant,motif:m};x.val.push({by:S.me,at:DATA.today+'T'+DATA.now});savePointage(x);
    S.corr=null;render();msg('Pointage corrigé et validé');
  },
  demande(v){if(!DATA.demandes)return;const [id,e]=v.split('|');const d=DATA.demandes.find(d=>d.id===id);if(d){d.etat=e;render()}},
  edit(){S.edit=!S.edit;render()},
  editok(){const me=pers(S.me);const g=k=>{const i=$id('eq-urg-'+k);return i?i.value.trim():''};const u={nom:g('nom'),lien:g('lien'),tel:g('tel')};
    if(!u.nom&&!u.tel){msg('Indique au moins un nom et un téléphone');return}
    savePeoplePart(me.id,'urgence',u);S.edit=false;render();msg('Contact d\'urgence enregistré')},
  habf(v){S.habF=v;render()},
  ffam(v){S.fFam=v;render()},
  binome(v){if(!DATA.equipes)return;const [t,s]=v.split('|');let b=binome(t,DATA.today);
    if(!b){b={d:DATA.today,tuyauteur:t,soudeurs:[]};DATA.equipes.push(b)}
    b.soudeurs=b.soudeurs.includes(s)?b.soudeurs.filter(x=>x!==s):b.soudeurs.concat(s);render()},
  av(v){const patch=AVA[+v];if(!patch)return;avApply(pers(S.me),patch);render()},
  avhasard(){const me=pers(S.me);let g=avMe(me).groupes;const pioche=l=>l[Math.floor(Math.random()*l.length)];
    ['peaux','couleurs','coiffures','barbes','lunettes','fonds','hauts','bas','chaussures','coiffes'].forEach(k=>{if(g[k]&&g[k].length)avApply(me,pioche(g[k]).patch)});
    g=avMe(me).groupes;['hautTeintes','basTeintes','chaussuresTeintes'].forEach(k=>{if(g[k]&&g[k].length)avApply(me,pioche(g[k]).patch)});render()},
  avreinit(){const me=pers(S.me);DATA.avatars[me.id]={};AVM={};savePeoplePart(me.id,'avatar',null);render();msg('Avatar réinitialisé (le poste est conservé)')},
  /* planning équipe */
  plweek(v){S.plWeek=Math.max(-8,Math.min(8,+v));S.plSel=null;S.plEdit=null;render()},
  plsel(v){S.plSel=S.plSel===v?null:v;S.plEdit=null;render()},
  plenc(){S.plEnc=!S.plEnc;render()},
  plstrict(){const me=pers(S.me);if(!me.admin)return;const strict=!PL_RULES.strict;savePlanningRules({strict}).then(ok=>{render();if(ok)msg(strict?'Règle stricte : un gars qui n\'est pas placé ne peut ouvrir aucun chantier':'Règle souple : un gars qui n\'est pas placé voit tous les chantiers')})},
  pledit(v){S.plEdit=S.plEdit===v?null:v;S.plSel=null;render()},
  plput(site){const key=S.plSel;if(!key)return;const js=semaineDe(S.plWeek||0),wk=weekKey(js[0]);const o=Object.assign({},((PLANNING[wk]||{}).aff||{})[key]||{});const fd=js.filter(d=>!(o[d]||[]).length);(fd.length?fd:js).forEach(d=>{o[d]=[site];}); /* ③ : ne remplit que les jours libres */savePlanning(wk,{[key]:o});S.plSel=null;const p=pers(key),c=site_(site);if(!secteurDe(p)&&c.secteur&&String(key).includes('@'))savePeoplePart(key,'secteur',c.secteur); /* premier placement : la personne est rattachée au secteur du chantier */render();msg(p.prenom+' placé'+(p.genre==='femme'?'e':'')+' sur '+c.nom+(js.every(d=>(o[d]||[]).includes(site))?' toute la semaine':' : '+js.filter(d=>(o[d]||[]).includes(site)).map(d=>fJour(d).slice(0,4)).join(', ')))},
  plday(v){const [key,site,d]=v.split('|');const wk=weekKey(d);const o=Object.assign({},((PLANNING[wk]||{}).aff||{})[key]||{});const cur=o[d]||[];o[d]=cur.includes(site)?cur.filter(x=>x!==site):[site];if(!o[d].length)delete o[d];savePlanning(wk,{[key]:Object.keys(o).length?o:null});render()},
  plrm(v){const [key,site]=v.split('|');const js=semaineDe(S.plWeek||0),wk=weekKey(js[0]);const o=Object.assign({},((PLANNING[wk]||{}).aff||{})[key]||{});js.forEach(d=>{if(o[d]){o[d]=o[d].filter(x=>x!==site);if(!o[d].length)delete o[d];}});savePlanning(wk,{[key]:Object.keys(o).length?o:null});S.plEdit=null;render()},
  plcopy(wk){const js=semaineDe(S.plWeek||0),jp=semaineDe((S.plWeek||0)-1),wp=weekKey(jp[0]);const prev=(PLANNING[wp]||{}).aff||{},cur=(PLANNING[wk]||{}).aff||{};const patch={};let n=0;
    plGens().forEach(p=>{if(cur[p.id]&&Object.keys(cur[p.id]).some(d=>js.includes(d)))return;const o=prev[p.id];if(!o)return;const nv={};jp.forEach((d,i)=>{if(o[d]&&o[d].length)nv[js[i]]=o[d].slice();});if(Object.keys(nv).length){patch[p.id]=Object.assign({},cur[p.id]||{},nv);n++;}});
    if(!n){msg('Rien à reprendre : la semaine passée est vide ou tout le monde est déjà placé');return}savePlanning(wk,patch);render();msg(n+' personne'+(n>1?'s':'')+' reprise'+(n>1?'s':'')+' de la semaine passée')},
  sim(v){msg('Pas encore branché : '+v)},
  tel(){}
};
let bound=false;
// 👁 vue d'une autre personne (administrateur, « voir l'appli comme ») : on regarde, on ne modifie rien à sa place (pointage, avatar, contact, validation, planning)
const viewing=()=>{const a=A.current();return !!(a&&a.test);};
const RW=new Set(['pointer','editok','av','avhasard','avreinit','valider','toutvalider','corrok','plput','plday','plrm','plcopy','plstrict','tache','demande','binome']);
function viewOnly(){const me=pers(S.me);msg('👁 Tu regardes la vue de '+(me.prenom||me.nom||'cette personne')+' : rien n\'est modifié à sa place. Reviens sur ton compte pour agir.');}
function bind(){if(bound)return;bound=true;
  document.addEventListener('click',e=>{const app=e.target.closest&&e.target.closest('#eq-app');if(!app)return;const el=e.target.closest('[data-act]');if(!el)return;if(el.tagName==='A'&&el.dataset.act==='tel')return;if(RW.has(el.dataset.act)&&viewing()){e.preventDefault();viewOnly();return;}const f=ACT[el.dataset.act];if(f){e.preventDefault();f(el.dataset.v,el);}});
  document.addEventListener('keydown',e=>{if(!ROOT||!document.contains(ROOT))return;if(e.key==='Enter'&&e.target.matches&&e.target.matches('#eq-app [role=button][data-act]'))e.target.click();if(e.key==='Escape'&&S.fiche)ACT.close();});
  document.addEventListener('change',e=>{if(!e.target.closest||!e.target.closest('#eq-app'))return;const ds=e.target.dataset||{};if(ds.afin!==undefined||ds.afz!==undefined||ds.afc!==undefined||ds.afb!==undefined||ds.aff!==undefined||ds.afs!==undefined||ds.afzn!==undefined){const me=pers(S.me);if(me)affInput(e.target,affCtx(me));return;}if(ds.flin!==undefined||ds.flf!==undefined){const me=pers(S.me);if(me)flotteInput(e.target,flCtx(me));return;}if(ds.cmdf!==undefined||ds.cmdl!==undefined){const me=pers(S.me);if(me)cmdInput(e.target,cmdCtx(me));return;}const k=e.target.dataset&&e.target.dataset.chg;if(!k)return;
    if((k==='plfiche'||k==='plpers'||k==='avpays')&&viewing()){viewOnly();render();return;}
    if(k==='perk'){S.per.k=+e.target.value;render();return}
    if(k==='perm'){S.per.m=e.target.value;render();return}
    if(k==='avpays'){if(e.target.value){const me=pers(S.me);avApply(me,{[avMe(me).bandanaCle]:e.target.value});render()}return}
    if(k==='plfiche'){const id=e.target.dataset.site,kk=e.target.dataset.k;if(A.saveSiteFiche)A.saveSiteFiche(id,{[kk]:e.target.value||null}).then(()=>render());return}
    if(k==='plpers'){const key=e.target.dataset.p,kk=e.target.dataset.k;savePeoplePart(key,kk,e.target.value||null);render();return}
    S[k]=e.target.value;render();});
  document.addEventListener('input',e=>{if(e.target.id!=='eq-q')return;S.q=e.target.value;const l=$id('eq-annu-liste');if(l)l.innerHTML=listeEnt(pers(S.me));});
  document.addEventListener('dragstart',e=>{const el=e.target.closest&&e.target.closest('#eq-app [data-drag]');if(!el)return;S.plSel=el.dataset.drag;try{e.dataTransfer.setData('text/plain',el.dataset.drag);e.dataTransfer.effectAllowed='move';}catch(x){}el.classList.add('dragging');});
  document.addEventListener('dragend',e=>{const el=e.target.closest&&e.target.closest('#eq-app [data-drag]');if(el)el.classList.remove('dragging');});
  document.addEventListener('dragover',e=>{const z=e.target.closest&&e.target.closest('#eq-app [data-drop]');if(!z)return;e.preventDefault();z.classList.add('over');});
  document.addEventListener('dragleave',e=>{const z=e.target.closest&&e.target.closest('#eq-app [data-drop]');if(z)z.classList.remove('over');});
  document.addEventListener('drop',e=>{const z=e.target.closest&&e.target.closest('#eq-app [data-drop]');if(!z)return;e.preventDefault();if(viewing()){viewOnly();return;}const key=S.plSel||(e.dataTransfer&&e.dataTransfer.getData('text/plain'));if(!key)return;S.plSel=key;
    if(z.dataset.drop==='tray'){const js=semaineDe(S.plWeek||0),wk=weekKey(js[0]);const o=Object.assign({},((PLANNING[wk]||{}).aff||{})[key]||{});js.forEach(d=>{delete o[d];});savePlanning(wk,{[key]:Object.keys(o).length?o:null});S.plSel=null;render();}
    else ACT.plput(z.dataset.drop);});
  document.addEventListener('toggle',e=>{const d=e.target&&e.target.dataset&&e.target.dataset.det;if(d)S[d]=e.target.open;},true);
}
bind();
