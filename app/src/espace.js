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
import {docsFor,docsTodo,docsListHTML,docOpen,docsAdminHTML,docAdminOpen,docNewOpen,docsLateHTML,docsAll,docById,KINDS as DOC_KINDS} from './docs.js'; // documents d'entreprise à lire et signer (nuit 09→10/10)
import {qhsTodo,qhsMyKey,qhsRecapHTML,qhsTriggerOpen,qhsRuns} from './qhs.js'; // quart d'heure sécurité (10/10)
import {controlesOf,controleNC,controleReportHTML} from './accueil.js'; // contrôles chantier : suivi direction (10/10)
import {affView,affAct,affInput,affAll,affState,calcAffaire,factTotaux,affFiles} from './affaires.js';
import {dpgfFile} from './commerce.js'; // 13/10 : le dossier de A à Z // volet commerce (nuit 09→10/10)
import {flotteView,flotteAct,flotteInput,vehAll,vehAlertes,vehDe,monVehiculeHTML,flottePhoto} from './flotte.js'; // parc véhicules (nuit 09→10/10)
import {cmdView,cmdAct,cmdInput,dbListHTML,dbTodo,dbDe,cmdAll,dbAll,cmdState} from './commandes.js'; // bons de commande & débours (nuit 09→10/10)
import {GD_CAS,GD_RAPPELS,GD_CYCLE,gdCase,gdSemaine,gdDetenteIdx,kmRoute,minutesRoute,anciennete,isFerie,GD_RETDAY,gdJours as gdJoursRH} from './rh.js'; // grands déplacements, ancienneté
import {distLL} from './geo.js';
import {buildNavette,navetteSheet,NAV_STYLES,navWeeks,inIDF,addDay as navAddDay,CPT_H,reportBalance,HEBDO_MAX} from './navette.js'; // 13/10 : navette de paie au format SCR (feuille d'heures récapitulative mensuelle)
import {makeStyledXlsx} from './xlsx.js';
import {regAll,regSet,regLoad,regGet,regReload} from './reg.js'; // 12/10 : personnes provisoires créées depuis le planning (registre « prov »), agenda de l'encadrant (« agenda »)
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
const S={tab:'moi',sub:'moi',fiche:null,avVue:null,planSem:undefined,planJour:null,plWeek:undefined,plSel:null,plSect:undefined,plEnc:false,plEdit:null,plAutres:false,per:{mode:'sem',k:0,m:''},semOpen:{},entVue:'travail',valMode:'jour',valJour:null,valPers:null,corr:null,edit:false,q:'',fFam:'',fSite:'',habF:'traiter',open:{}};
export function initEspace(api){A=api;}
/* ── DATA : l'état de l'appli, dans la forme attendue par les gabarits de la maquette ── */
function buildData(){
  const now=new Date();const today=TODAY();const nowHM=pad(now.getHours())+':'+pad(now.getMinutes()); /* TODAY() : date du jour, ou date figée par un test */
  const live=A.accounts();if(live&&live.length&&live!==ACC_CACHE){ACC_CACHE=live;kvSet('trace:accountsCache',live.map(a=>Object.assign({},a)));} /* liste des comptes gardée pour le hors-connexion (annuaire) */
  const accs=(live||ACC_CACHE||(A.state.cloudUser?[]:A.personas())).concat(A.state.sandbox&&A.state.cloudUser?A.personas():[]).filter(a=>a&&a.poste!=='visiteur'&&(a.active!==false||a.invite)); /* bac à sable (10/10) : les personnages de démo s'ajoutent aux vrais comptes */
  const cur=A.current();if(cur&&cur.poste!=='visiteur'&&!accs.some(a=>personKey(a)===personKey(cur)))accs.push(cur); /* la personne connectée est toujours là, même avant la liste des comptes */
  provAll().forEach(p=>{if(!accs.some(a=>personKey(a)===personKey(p)))accs.push(p);}); /* 12/10 : « raccourci rapide » — une personne créée depuis le planning (sans compte encore) se place comme les autres ; un administrateur finalise l'accès */
  const personnes=accs.map(a=>{const key=personKey(a);const x=PEOPLE[key]||{};const [prenom,nom]=splitName(a);
    return {id:key,acc:a.id,prenom,nom,email:a.email||'',tel:x.tel||a.tel||'',poste:POSTES_ESP[a.poste]?a.poste:'autre',type:a.type||'salarie',admin:!!a.admin,active:a.active!==false,invite:!!a.invite,prov:!!a.prov,agence:a.agence||'',sites:a.sites||null,rights:a.rights||{},
      entree:x.entree||null,contrat:x.contrat||null,urgence:x.urgence||null,secteur:x.secteur||a.secteur||null,adresse:x.adresse||null,emploi:x.emploi||null,_acc:a};});
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
      else if(w.kind==='plan'){const r=await A.sync.setPlanning(w.week,{aff:w.patch});ok=!!r.ok;if(!ok&&r.missing){A.toast('Serveur : passe le SQL sql/espace_v2.sql (planning)');stop=true;}if(ok&&r.row&&r.row.data&&!list.some(x=>x!==w&&x.kind==='plan'&&x.week===w.week)){PLANNING[w.week]={aff:Object.assign({},r.row.data.aff||{},localAff(w.week))};kvSet('trace:planning',PLANNING);}}}catch(e){console.warn(e);}
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
  regLoad(['prov','agenda','gdx','accident','cpth']).catch(()=>{}); /* 12/10 : personnes provisoires, agenda de l'encadrant — en parallèle, l'accueil se redessine à l'arrivée (onReg) */
  try{const c=await A.kv.get('trace:people');if(c&&typeof c==='object')PEOPLE=c;}catch(e){}
  try{const c=await A.kv.get('trace:accountsCache');if(Array.isArray(c)&&c.length&&!ACC_CACHE)ACC_CACHE=c;}catch(e){}
  try{const c=await A.kv.get('trace:pointages');if(Array.isArray(c))POINTAGES=c;}catch(e){}
  try{const c=await A.kv.get('trace:planning');if(c&&typeof c==='object')PLANNING=c;}catch(e){}
  try{const c=await A.kv.get('trace:espacePending');if(Array.isArray(c))PENDING=c;}catch(e){}
  try{const c=await A.kv.get('trace:meteo');if(c&&typeof c==='object')METEO_STORE=c;}catch(e){}
  try{const c=await A.kv.get('trace:geocode');if(c&&typeof c==='object')GEOCODE=c;}catch(e){}
  try{const q=await A.kv.get('trace:geocodeQ');if(q&&typeof q==='object')GEOQ=q;}catch(e){}
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
  need.forEach(w=>WEEKS_LOADED.add(w));rows.forEach(r=>{if(PENDING.some(x=>x.kind==='plan'&&x.week===r.week))return;PLANNING[r.week]={aff:Object.assign({},(r.data&&r.data.aff)||{},localAff(r.week))};});kvSet('trace:planning',PLANNING);}
/* bac à sable (10/10) : les personnages de démo (clés sans @) ne vont jamais au serveur et survivent à un rechargement de la semaine */
const srvKey=k=>{k=String(k||'');return k.includes('@')||k.startsWith('prov:');}; /* 12/10 : une personne provisoire (créée depuis le planning, sans e-mail) se planifie aussi au serveur — le chef la voit sur son téléphone */
const localAff=week=>Object.fromEntries(Object.entries(((PLANNING[week]||{}).aff)||{}).filter(([k])=>!srvKey(k)));
let ensureT=null;function ensureWeeks(ws){const need=ws.filter(w=>!WEEKS_LOADED.has(w));if(!need.length||!A.state.cloudUser)return;clearTimeout(ensureT);ensureT=setTimeout(()=>loadWeeks(need).then(()=>{if(ROOT&&document.contains(ROOT))render();}).catch(e=>console.warn(e)),50);}
// patch = {clé personne : {date:[sites]} | null} : fusion locale par personne + envoi (fusion identique côté serveur)
function savePlanning(week,patch){const P=PLANNING[week]||(PLANNING[week]={aff:{}});Object.keys(patch).forEach(k=>{if(patch[k]===null)delete P.aff[k];else P.aff[k]=patch[k];});kvSet('trace:planning',PLANNING);
  const srv=Object.fromEntries(Object.entries(patch).filter(([k])=>srvKey(k)));if(!Object.keys(srv).length)return; /* personnages de démo : appareil seulement */
  const w=PENDING.find(x=>x.kind==='plan'&&x.week===week);if(w)Object.assign(w.patch,srv);else PENDING.push({kind:'plan',week,patch:Object.assign({},srv)});kvSet('trace:espacePending',PENDING);
  clearTimeout(flushT);flushT=setTimeout(()=>flushPending().catch(e=>console.warn(e)),700);}
// chantiers ouverts à un compte : null = tous (encadrement, bureau, direction, administrateur, ou personne pas encore planifiée) ; sinon l'ensemble des chantiers de sa semaine et de la précédente
// 13/10 (Ethan : « Sofiane ne peut pas entrer dans le chantier de Nantes alors que je l'ai mis responsable dessus ») : le chef / conducteur désigné dans la FICHE du
// chantier l'ouvre toujours, planifié ou pas ; et un chef de chantier ouvre aussi les chantiers de sa semaine PROCHAINE (préparer son chantier avant d'y être).
export function espacePlannedSites(acc){if(!acc||acc.admin||acc.active===false||acc.type==='visiteur')return null;const fam=POSTE_FAM[acc.poste];const chef=acc.poste==='chef';if(!(fam==='terrain'||chef))return null;
  const key=personKey(acc);const aff=planningAff()[key]||{};const set=new Set();semaineDe(0).concat(semaineDe(-1),chef?semaineDe(1):[]).forEach(d=>(aff[d]||[]).forEach(id=>set.add(id)));
  if(!set.size&&!PL_RULES.strict)return null; /* pas planifié : règle souple = tout voir (inchangé) */
  try{(A.sites()||[]).forEach(c=>{if(c&&key&&(c.chef===key||c.conducteur===key))set.add(c.id);});}catch(e){} /* à son nom dans la fiche du chantier */
  return set; /* règle stricte sans planning : seulement les chantiers à son nom */}
export function espaceRespSites(acc){const key=personKey(acc);const out=new Set();if(!key)return out;try{(A.sites()||[]).forEach(c=>{if(c&&(c.chef===key||c.conducteur===key))out.add(c.id);});}catch(e){}return out;}
export const espacePlanning=()=>PLANNING;
export const espaceSavePlanning=(wk,patch)=>savePlanning(wk,patch); /* tests / outillage */
/* ── BAC À SABLE (10/10, Ethan : « des scénarios de test sur le vrai logiciel, enlevables, jamais mélangés aux vraies données ») : tout ce qui concerne les personnages de démo (clés « l:… ») reste sur l'appareil ── */
export function espaceSandboxSeed(siteId){const js=semaineDe(0),wk=weekKey(js[0]);const o=t=>Object.assign(Object.fromEntries(js.map(d=>[d,[siteId]])),t?{['eq:'+siteId]:t}:{});
  savePlanning(wk,{'l:karim':o('A'),'l:julien':o('B'),'l:ethan':o('')});
  const today=todayIso();if(js.includes(today)&&!POINTAGES.some(x=>x.p==='l:karim'&&x.d===today)){savePointage({p:'l:karim',d:today,site:siteId,status:'declare',corr:null,events:[{t:'start',at:today+'T07:30'}],val:[]});}
  savePeoplePart('l:karim','adresse',{voie:'12 rue de la Mer',cp:'14000',ville:'Caen'});savePeoplePart('l:julien','adresse',{voie:'3 impasse des Lilas',cp:'35000',ville:'Rennes'});return true;}
export function espaceSandboxClear(){let n=0;Object.keys(PLANNING).forEach(w=>{const aff=(PLANNING[w]||{}).aff||{};Object.keys(aff).forEach(k=>{if(!String(k).includes('@')){delete aff[k];n++;}});});kvSet('trace:planning',PLANNING);
  const before=POINTAGES.length;POINTAGES=POINTAGES.filter(x=>String(x.p).includes('@'));n+=before-POINTAGES.length;kvSet('trace:pointages',POINTAGES);
  Object.keys(PEOPLE).forEach(k=>{if(!String(k).includes('@')){delete PEOPLE[k];n++;}});kvSet('trace:people',PEOPLE);DATA=null;return n;}
/* ── MÉTÉO PAR CHANTIER (09/10 soir) : Open-Meteo (gratuit, sans clé), prévisions à 7 jours au point du chantier (centre du réseau géoréférencé, sinon la ville de la fiche
   géocodée), cache 3 h sur l'appareil (kv trace:meteo). La météo du jour fixe la TENUE de travail des avatars (kit : chaud / frais / froid / pluie) et la scène « Aujourd'hui ». ── */
const METEO_SEUILS={chaud:25,froid:8,pluieMm:3,pluiePct:70}; // HYPOTHÈSES (°C max du jour, mm de pluie, % de probabilité) — à faire trancher par Ethan
const METEO_TTL=3*3600e3,METEO_RETRY=15*60e3;
let METEO_STORE={};   // id chantier → {at, ll:[lon,lat], ville, days:{'yyyy-mm-dd':[k, t°max, mm, code]}, failAt}
let GEOCODE={};       // ville → [lon,lat] | null (pas trouvée)
let GEOQ={};          // 13/10 soir : adresse → {src:'ign'|'cp'|'nom', at} — comment elle a été localisée (« par le nom seul » = homonyme possible)
export const espaceMeteo=()=>METEO_STORE;
function meteoKind(tmax,mm,pct,code){ // codes WMO : 51-67 bruine / pluie, 80-82 averses, 95-99 orage, 71-77 neige
  const pluie=(mm>=METEO_SEUILS.pluieMm)||(pct>=METEO_SEUILS.pluiePct&&mm>=1)||(code>=61&&code<=67)||(code>=80&&code<=82)||code>=95;
  if(pluie&&!(tmax<METEO_SEUILS.froid&&code>=71&&code<=77))return 'pluie';
  if(tmax<METEO_SEUILS.froid)return 'froid';if(tmax>=METEO_SEUILS.chaud)return 'chaud';return 'frais';}
function meteoData(){const out={};Object.keys(METEO_STORE).forEach(id=>{if(METEO_STORE[id]&&METEO_STORE[id].days)out[id]=METEO_STORE[id].days;});return out;}
/* 13/10 (Ethan : « les adresses, plusieurs ne fonctionnent pas ») — les villes de l'export RH sont en MAJUSCULES, sans tirets (« SAINT JACQUES DE LA LANDE »),
   parfois abrégées (ST, STE) ou avec CEDEX : la recherche par nom seule (Open-Meteo) en ratait ou se trompait d'homonyme (pas de code postal).
   Chaîne de géocodage : 1) Géoplateforme IGN (ex-API Adresse, commune + code postal) · 2) découpage administratif (communes du code postal, meilleur nom)
   · 3) Open-Meteo (nom nettoyé). Échec réseau = on ne mémorise rien (réessai plus tard) ; « introuvable » partout = mémorisé null. */
const cleanVille=v=>String(v||'').replace(/\bcedex\b\s*\d*/ig,' ').replace(/\bSTE\b/ig,'Sainte').replace(/\bST\b/ig,'Saint').replace(/\s*-\s*/g,'-').replace(/\s+/g,' ').trim();
const normV=v=>norm(cleanVille(v)).replace(/[-'’]/g,' ').replace(/\s+/g,' ').trim();
const withTimeout=(u,ms)=>{const c=typeof AbortController!=='undefined'?new AbortController():null;const t=c?setTimeout(()=>c.abort(),ms||5000):null;return fetch(u,c?{signal:c.signal}:undefined).finally(()=>{if(t)clearTimeout(t);});};
async function geoGeopf(ville,cp){const q=encodeURIComponent(cleanVille(ville)||cp);const r=await withTimeout('https://data.geopf.fr/geocodage/search/?q='+q+(cp?'&postcode='+encodeURIComponent(cp):'')+'&type=municipality&limit=1');if(!r.ok)throw new Error('geopf '+r.status);const j=await r.json();const f=j&&j.features&&j.features[0];if(!f||!f.geometry)return null;if(cp&&f.properties&&f.properties.postcode&&String(f.properties.postcode).slice(0,2)!==String(cp).slice(0,2))return null;const c=f.geometry.coordinates;return [+c[0],+c[1]];}
async function geoCommunes(ville,cp){if(!/^\d{5}$/.test(String(cp||'')))return null;const r=await withTimeout('https://geo.api.gouv.fr/communes?codePostal='+cp+'&fields=nom,centre&format=json');if(!r.ok)throw new Error('geo.api '+r.status);const L=await r.json();if(!Array.isArray(L)||!L.length)return null;
  const want=normV(ville);const score=x=>{const n=normV(x.nom);if(n===want)return 3;if(want&&(n.startsWith(want)||want.startsWith(n)))return 2;const a=new Set(n.split(' ')),b=want.split(' ').filter(Boolean);return b.length?b.filter(w=>a.has(w)).length/b.length:0;};
  const best=L.map(x=>({x,s:score(x)})).sort((p,q)=>q.s-p.s)[0];const pick=L.length===1?L[0]:(best&&best.s>=0.5?best.x:null);if(!pick||!pick.centre)return null;const c=pick.centre.coordinates;return [+c[0],+c[1]];}
async function geoMeteo(ville){const n=cleanVille(ville);if(!n)return null;const r=await withTimeout('https://geocoding-api.open-meteo.com/v1/search?name='+encodeURIComponent(n.toLowerCase())+'&count=1&language=fr&format=json&countryCode=FR');if(!r.ok)throw new Error(r.status);const j=await r.json();const x=j&&j.results&&j.results[0];return x?[+x.longitude,+x.latitude]:null;}
let GEO_SRC='';async function geoChain(ville,cp){let netErr=0,answered=0;GEO_SRC='';const L=[['ign',()=>geoGeopf(ville,cp)]];if(/^\d{5}$/.test(String(cp||'')))L.push(['cp',()=>geoCommunes(ville,cp)]);L.push(['nom',()=>geoMeteo(ville)]);for(const [src,f] of L){try{const r=await f();answered++;if(r&&isFinite(r[0])&&isFinite(r[1])){GEO_SRC=src;return r;}}catch(e){netErr++;}}return netErr===0||answered>=2?null:undefined;} /* undefined = un service n'a pas répondu et pas assez d'avis « introuvable » : ne pas mémoriser, réessai plus tard (13/10 : avant, une panne d'un seul service pouvait figer « introuvable ») */
export const addrKey=a=>a&&a.ville?'adr:'+String(a.cp||'').trim()+'|'+normV(a.ville):null;
async function geocodeAddr(a){const k=addrKey(a);if(!k)return null;if(k in GEOCODE)return GEOCODE[k];const r=await geoChain(a.ville,String(a.cp||'').trim());if(r===undefined){console.warn('geocode (réseau)',a.ville);return null;}GEOCODE[k]=r;kvSet('trace:geocode',GEOCODE);if(r){GEOQ[k]={src:GEO_SRC,at:Date.now()};kvSet('trace:geocodeQ',GEOQ);}return r;}
async function geocode(ville){const k=String(ville||'').trim().toLowerCase();if(!k)return null;if(k in GEOCODE)return GEOCODE[k];
  const r=await geoChain(ville,'');if(r===undefined){console.warn('geocode (réseau)',ville);return null;} /* échec réseau : on ne mémorise rien, on réessaiera */
  GEOCODE[k]=r;kvSet('trace:geocode',GEOCODE);return GEOCODE[k];}
async function meteoFetch(c){let ll=c.ll;if(!ll&&c.ville)ll=await geocode(c.ville);if(!ll)return null;
  const u='https://api.open-meteo.com/v1/forecast?latitude='+(+ll[1]).toFixed(4)+'&longitude='+(+ll[0]).toFixed(4)+'&daily=weathercode,temperature_2m_max,temperature_2m_min,precipitation_sum,precipitation_probability_max&timezone=Europe%2FParis&forecast_days=7';
  const r=await fetch(u);if(!r.ok)throw new Error('open-meteo '+r.status);const j=await r.json();const d=j.daily||{};const days={};
  (d.time||[]).forEach((t,i)=>{const tmax=+(d.temperature_2m_max||[])[i],mm=+((d.precipitation_sum||[])[i]||0),pct=+((d.precipitation_probability_max||[])[i]||0),code=+((d.weathercode||[])[i]||0);if(!isFinite(tmax))return;days[t]=[meteoKind(tmax,mm,pct,code),Math.round(tmax),Math.round(mm*10)/10,code];});
  return {at:Date.now(),ll,ville:c.ville||'',days};}
let meteoBusy=false,meteoT=null,METEO_ERR='';
function meteoEnsure(){clearTimeout(meteoT);meteoT=setTimeout(()=>meteoRefresh().catch(e=>console.warn(e)),300);}
async function meteoRefresh(){if(meteoBusy||typeof fetch!=='function'||(typeof navigator!=='undefined'&&navigator.onLine===false))return;
  const now=Date.now();const list=(DATA?DATA.chantiers:[]).filter(c=>!c.bureau&&(c.ll||c.ville)).filter(c=>{const m=METEO_STORE[c.id];if(m&&m.failAt&&now-m.failAt<METEO_RETRY)return false;return !(m&&m.at&&now-m.at<METEO_TTL&&m.days);}).slice(0,40);
  if(!list.length)return;meteoBusy=true;let changed=false;
  try{for(const c of list){try{const m=await meteoFetch(c);if(m){METEO_STORE[c.id]=m;changed=true;}else{METEO_STORE[c.id]=Object.assign({},METEO_STORE[c.id]||{},{failAt:now});}}catch(e){console.warn('météo',c.id,e);METEO_ERR=String(e&&e.message||e);METEO_STORE[c.id]=Object.assign({},METEO_STORE[c.id]||{},{failAt:now});}}}
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
  /* 12/10 (Ethan : « chaque encadrant ne voit que ses équipes ») : sur la SEMAINE du planning — chef : les gens de ses chantiers (fiche) et de SON équipe (lettre) là où un autre est chef ; conducteur : les gens placés sur ses chantiers */
  const js=semaineDe(0);const wk=weekKey(js[0]);const aff=(PLANNING[wk]||{}).aff||{};
  if(me.poste==='chef')return autres.filter(p=>{const c=siteJour(p);if(c&&c.chef===me.id)return true;return js.some(d=>planDe(p.id,d).some(id=>{const c2=site(id);if(c2.chef===me.id)return true;const t=teamOf(aff,me.id,id);return !!t&&teamOf(aff,p.id,id)===t&&planDe(me.id,d).includes(id);}));});
  if(me.poste==='conducteur')return autres.filter(p=>{const c=siteJour(p);if(c&&c.conducteur===me.id)return true;return js.some(d=>planDe(p.id,d).some(id=>site(id).conducteur===me.id));});
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
const adresseTxt=p=>{const a=p&&p.adresse;if(!a)return '';if(typeof a==='string')return a;return [a.voie,[a.cp,a.ville].filter(Boolean).join(' ')].filter(Boolean).join(', ');}; /* 12/10 (Ethan : « je ne vois pas où sont les adresses des gars ») */
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
    <div class="eq-kv"><span>Domicile</span><span>${adresseTxt(p)?esc(adresseTxt(p)):etat('warn','À renseigner par le bureau')}</span></div>
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
    ${(()=>{const ms=missionsOf(netOf(x.site),x.d).filter(m=>espaceMissionFor(m,x.p,x.site,x.d));return ms.length?`<span class="eq-s">Objectif du jour : <b style="font-weight:600;color:var(--ink)">${esc(missionsTxt(ms))}</b> — ${esc(ms.map(m=>m.label).join(' · ')).slice(0,90)}${ms.every(m=>m.done)?' ✓':''}</span>`:'';})()}
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
function vEntreprise(me){const sub=vSub(me);if(sub!==null)return sub;if(me.type==='interim')return vAnnuaire(me); /* intérimaire : l'équipe de son chantier */
  return hubEntreprise(me);}
function vAnnuaire(me){
  const vis=visibles(me),interim=me.type==='interim',scr=KIT;
  const sites=[...new Set(vis.flatMap(p=>planDe(p.id,DATA.today)))];
  return `<h2 class="vt">${interim?'Ton chantier':'Annuaire'} <span class="hint">· ${vis.length} personne${vis.length>1?'s':''} · par poste</span></h2>
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
    ${(()=>{const n=ids.reduce((a,x)=>a+missionsOf(netOf(x),d).filter(m=>espaceMissionFor(m,me.id,x,d)).length,0);return n?`<span class="eq-tag eq-jour-obj" title="${n} objectif${n>1?'s':''}">🎯 ${n}</span>`:'';})()}
    ${d===DATA.today?'<span class="eq-tag">auj.</span>':''}</button>`;
}
function cJour(me,d){
  const ids=planDe(me.id,d),auj=d===DATA.today;
  const corps=ids.map((i,n)=>{
    const c=site(i),avec=avecMoi(me,i,d);
    const resp=[[c.chef,'Chef de chantier'],[c.conducteur,'Conducteur de travaux']].filter(x=>x[0]&&x[0]!==me.id);
    const ms=missionsOf(netOf(i),d).filter(m=>espaceMissionFor(m,me.id,i,d)); /* 11/10 (Ethan) : « le gars doit voir ses objectifs à la journée, avec un raccourci pour voir sur le plan ce que ça représente » */
    const fi=ficheDe(i); /* 12/10 (Ethan) : horaires et point de rassemblement de la fiche chantier, visibles dans le planning des gars */
    return `<div class="eq-plan-site">${ids.length>1?`<div class="eq-lab" style="margin-top:0">Chantier ${n+1} sur ${ids.length}</div>`:''}${scene(me,d,i)}
      ${!c.bureau&&(fi.horaires||fi.rassemblement)?`<div class="eq-s eq-plinfo">${fi.horaires?'🕗 '+esc(fi.horaires):''}${fi.horaires&&fi.rassemblement?' · ':''}${fi.rassemblement?'📍 rassemblement : '+esc(fi.rassemblement):''}</div>`:''}
      ${ms.length?`<div class="eq-lab">🎯 ${auj?'Tes objectifs du jour':'Tes objectifs '+fJour(d).slice(0,4)} · ${esc(missionsTxt(ms))}</div><div class="eq-list">${ms.map(m=>`<div class="eq-row eq-objrow${m.done?' done':''}"><span class="ic" style="font-size:18px;width:28px;text-align:center">${mtype(m.type)[2]}</span><span class="eq-grow"><span class="eq-t">${esc(m.label||mtype(m.type)[1])}${m.done?' <span class="eq-tag" style="color:#15673a">✓ faite</span>':''}</span><span class="eq-s">${hTxt(m.h)} estimées${m.team?' · équipe '+esc(m.team):''}${objOnPlan(m)?' · '+esc(objPlanTxt(Object.assign({_site:i},m))):''}${m.by?' · posé par '+esc(m.by):''}</span></span>${objOnPlan(m)?`<button class="btn sm" data-act="objgo" data-v="${esc(i)}|${esc(m.id)}" title="Voir sur le plan (en surbrillance 🎯)">🗺</button>`:''}</div>`).join('')}</div>`:''}
      ${resp.length?`<div class="eq-lab">Responsables du chantier</div><div class="eq-list">${resp.map(([id,role])=>htmlPersRow(pers(id),role)).join('')}</div>`:''}
      <div class="eq-lab">Tes compagnons · ${avec.length}</div>
      <div class="eq-list">${avec.map(p=>htmlPersRow(p,poste(p).label)).join('')||'<div class="eq-s">Personne d\'autre de prévu.</div>'}</div>
      ${c.bureau?'':`<button class="btn eq-full" data-act="opensite" data-v="${esc(c.id)}">Ouvrir le chantier</button>`}</div>`}).join('');
  const rdv=agAll(me).filter(a=>a.d===d).sort((a,b)=>(a.h0||'')<(b.h0||'')?-1:1); // 12/10 : « Ma semaine » de l'encadrant (visites, réunions, rendez-vous)
  return `<div class="card"><h3>${auj?'Aujourd\'hui':'Ce jour-là'} <span class="hint">· ${fJour(d)}${ids.length>1?' · '+ids.length+' chantiers dans la journée':''}</span></h3>
    ${rdv.length?`<div class="eq-lab" style="margin-top:0">Tes rendez-vous</div><div class="eq-list">${rdv.map(a=>{const T=AG_TYPES.find(x=>x[0]===a.type)||AG_TYPES[4];return `<div class="eq-row" style="min-height:44px"><b>${a.h0?esc(a.h0.replace(/^0/,'').replace(':',' h ')):'—'}</b><span class="eq-grow"><span class="eq-t" style="font-weight:400">${esc(a.title||T[1].replace(/^\S+\s/,''))}</span><span class="eq-s">${a.site?'📍 '+esc(site(a.site).nom):esc(T[1])}${a.h1?' · jusqu\'à '+esc(a.h1.replace(/^0/,'').replace(':',' h ')):''}</span></span></div>`;}).join('')}</div>`:''}
    ${corps||'<div class="eq-s">Pas de chantier prévu.</div>'}</div>`;
}
function vPlanning(me){
  const k=S.planSem,js=semaineDe(k),sel=js.includes(S.planJour)?S.planJour:js.includes(DATA.today)?DATA.today:js[0];
  return `<h2 class="vt">Ta semaine <span class="hint">· semaine ${numSemaine(js[0])} · du ${fDate(js[0]).slice(0,5)} au ${fDate(js[4])}</span></h2>
    <div class="eq-filtres" style="padding-top:0">${[[0,'Cette semaine'],[1,'Semaine prochaine']].map(([n,t])=>`<button class="chip${k===n?' active':''}" data-act="plansem" data-v="${n}">${t}</button>`).join('')}</div>
    <div class="eq-semaine">${js.map(d=>tuileJour(me,d,d===sel)).join('')}</div>
    ${can(me,'planning.edit')||me.poste==='conducteur'?`<div class="card"><div class="eq-s">Ton planning n'est pas imposé : c'est toi qui le composes (visites de chantier, réunions, rendez-vous) — export Outlook.</div><button class="btn eq-full" data-act="xgo" data-v="agenda">✏️ Composer ma semaine</button></div>`:''}
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
/* ── 12/10 soir (Ethan) : PRODUCTION PAR ÉQUIPE — « le personnel classé comme au planning ; les heures de chacun et la production de chacun qui fait la production de l'équipe ;
   c'est ici qu'on verra production vs heures, face aux objectifs ». Semaine choisie ; chantier → équipe (lettre du planning) → personne ; le chef de chantier en tête. ── */
function vProdEquipes(me){const k=S.peWeek||0,js=semaineDe(k),wk=weekKey(js[0]);ensureWeeks([wk]);const aff=(PLANNING[wk]||{}).aff||{};const sc=objScope(me,js);const dmax=js.filter(d=>d<=todayIso());
  const hOf=(pid)=>js.reduce((a,d)=>{const x=ptDe(pid,d);return a+(x?calc(x).total:0);},0);const prodOf=pid=>{const t={};dmax.forEach(d=>addProd(t,prodJour([pid],d)));return t;};
  const blocks=sc.sites.map(c=>{const people=DATA.personnes.filter(p=>p.active&&js.some(d=>planDe(p.id,d).includes(c.id)));if(!people.length)return '';const net=netOf(c.id);
    const teams=[...new Set(people.map(p=>teamOf(aff,p.id,c.id)))].sort((a,b)=>a===''?1:b===''?-1:a.localeCompare(b));
    const ms=js.flatMap(d=>missionsOf(net,d).map(m=>Object.assign({_d:d},m)));
    const teamBlock=t=>{if(sc.teams[c.id]&&t!==sc.teams[c.id])return '';const L=people.filter(p=>teamOf(aff,p.id,c.id)===t).sort((a,b)=>(a.poste==='chef'?0:1)-(b.poste==='chef'?0:1)||nomC(a).localeCompare(nomC(b),'fr'));const tot={};let hmin=0;
      const rows=L.map(p=>{const o=prodOf(p.id);const h=hOf(p.id);hmin+=h;if(p.poste!=='tuyauteur')addProd(tot,o);const days=js.filter(d=>planDe(p.id,d).includes(c.id)).length;
        return `<tr><td>${avatar(p)} <b>${esc(nomC(p))}</b><div class="dim" style="font-size:11px">${esc(poste(p).label)}${p.type==='interim'?' · intérim':''} · ${days} j</div></td><td class="num">${h?fDuree(h):'—'}</td><td>${esc(prodTxt(o))||'<span class="dim">—</span>'}</td><td class="num">${h&&o.soudures?(Math.round(o.soudures/(h/60)*10)/10)+' /h':'—'}</td></tr>`;}).join('');
      const mt=ms.filter(m=>(m.team||'')===t||(!t&&!m.team));const hObj=mt.reduce((a,m)=>a+(+m.h||0),0);const done=mt.filter(m=>m.done).length;const soudObj=mt.reduce((a,m)=>{const pr=objOnPlan(m)&&A.objProgress?A.objProgress(c.id,m):null;return a+(pr?pr.n:0);},0);
      return `<div class="card eq-peteam"><div class="ac-h"><b>${t?'Équipe '+t:(teams.length>1?'Sans équipe':'Tout le chantier')}</b><span>${L.length} personne${L.length>1?'s':''} · ${fDuree(hmin)} · ${esc(prodTxt(tot))||'rien de compté'}</span></div>
        <div style="overflow:auto"><table class="rc af-tab"><tr><th>Personne</th><th>Heures</th><th>Production</th><th>Soud./h</th></tr>${rows}<tr class="tot"><td>Équipe${t?' '+t:''}</td><td class="num">${fDuree(hmin)}</td><td>${esc(prodTxt(tot))||'—'}</td><td class="num">${hmin&&tot.soudures?(Math.round(tot.soudures/(hmin/60)*10)/10)+' /h':'—'}</td></tr></table></div>
        ${mt.length?`<div class="eq-s" style="margin-top:6px">🎯 Objectifs de la semaine : ${mt.length} mission${mt.length>1?'s':''} · ${hTxt(hObj)} estimées${soudObj?' · '+soudObj+' soudures visées':''} · ${done} faite${done>1?'s':''}${hmin?' — réalisé : '+fDuree(hmin)+' pointées'+(tot.soudures?', '+tot.soudures+' soudures':''):''}</div>`:'<div class="eq-s" style="margin-top:6px">🎯 Pas d\'objectif posé cette semaine pour cette équipe.</div>'}
        ${tot.dn?`<div class="eq-lab">Soudures par DN</div>${dnChips(tot.dn)}`:''}${tot.mdn?`<div class="eq-lab">Manchons · DN tube / enveloppe</div>${dnChips(tot.mdn)}`:''}</div>`;};
    return `<div class="eq-pesite"><h3 class="vt" style="font-size:16px;margin:10px 0 4px">📍 ${esc(c.nom)} <span class="hint">· ${esc(c.ville||'')} · ${people.length} placé${people.length>1?'s':''}</span></h3>${teams.map(teamBlock).join('')}</div>`;}).filter(Boolean);
  return `<h2 class="vt">Production par équipe <span class="hint">· semaine ${numSemaine(js[0])} · du ${fDate(js[0]).slice(0,5)} au ${fDate(js[4])}</span></h2>
    ${weekNav({k,js,act:'peweek',marks:d=>d<=todayIso()?DATA.personnes.filter(p=>p.active&&sc.sites.some(c=>planDe(p.id,d).includes(c.id))).length:0})}
    <div class="eq-wkzone">${blocks.join('')||'<div class="card"><div class="eq-s">Personne de placé cette semaine sur tes chantiers.</div></div>'}
    </div><div class="hint" style="margin-top:8px">Heures = pointages de la semaine (déclarés, validés, définitifs) ; production = fiches de soudure des chantiers ouverts sur cet appareil (soudures, manchons, fils) par personne, additionnée par équipe (le tuyauteur n'additionne pas : c'est la production de son soudeur) ; objectifs = missions posées pour l'équipe. Le rapport de paie est à part (Variables de paie).</div>`;}
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
/* ── 13/10 : heures et compteurs d'une personne (RH : réglables ; la personne : lecture) ── */
function cCompteurs(p,me,edit){const c=cptRow(p.id);const today=todayIso();const L=cptList(c).filter(x=>edit||c.on[x.k]);
  const row=x=>{const on=!!c.on[x.k];const s=on?cptSolde(p,x.k,today):null;const val=s&&s.h!==null&&s.h!==undefined?nb(s.h)+' h':'—';
    const det=x.k==='report'&&s?(s.at?'solde '+nb(s.sol||0)+' h au '+fDate(s.at):'calculé sur 26 semaines')+(s.ex?' + '+nb(s.ex)+' h au-delà de '+HEBDO_MAX+' h':'')+(s.pr?' − '+nb(s.pr)+' h payées en prime':''):(s&&s.at?'au '+fDate(s.at):(on?'solde à saisir':x.desc));
    return `<div class="eq-row cpt-row${on?'':' off'}" data-cpt="${esc(x.k)}">${edit?`<label class="eq-chk" title="Compteur suivi pour cette personne"><input type="checkbox" data-act="cpton" data-v="${esc(p.id)}|${esc(x.k)}" ${on?'checked':''}></label>`:''}<span class="eq-grow"><span class="eq-t">${esc(x.label)} ${on?`<b>${val}</b>`:'<span class="dim">non suivi</span>'}</span><span class="eq-s">${esc(det)}</span></span>
      ${edit&&on?`<span class="eq-acts" style="margin:0"><button class="btn sm" data-act="cptsolde" data-v="${esc(p.id)}|${esc(x.k)}" title="Saisir le solde à une date">✏️ solde</button>${x.k==='report'&&s&&s.h>0?`<button class="btn sm" data-act="cptprime" data-v="${esc(p.id)}" title="Vider le compteur en prime">💶 en prime</button>`:''}</span>`:''}</div>`;};
  const pr=c.primes.slice().sort((a,b)=>String(b.at).localeCompare(String(a.at))).slice(0,5);
  return `<div class="card cpt-card"><h3>Heures et compteurs</h3><div class="eq-kv" style="border-top:0"><span>Contrat</span><span>${nb(c.contrat)} h / semaine${edit?` <button class="btn sm" data-act="cptcontrat" data-v="${esc(p.id)}" title="Heures du contrat par semaine">✏️</button>`:''}</span></div>
    <div class="eq-list" style="margin-top:6px">${L.map(row).join('')||'<div class="eq-s">Aucun compteur suivi.</div>'}</div>
    ${edit?`<div class="eq-acts" style="margin-top:6px"><button class="btn sm" data-act="cptnew" data-v="${esc(p.id)}">＋ Autre compteur</button></div>`:''}
    ${pr.length?`<div class="eq-lab" style="margin-top:6px">Primes versées (heures à reporter)</div>${pr.map(x=>`<div class="eq-s">${fDate(x.at)} · ${nb(x.h)} h${x.note?' · '+esc(x.note):''} · ${esc(x.by||'')}</div>`).join('')}`:''}
    <div class="hint" style="margin-top:6px">Au-delà de ${HEBDO_MAX} h dans une semaine, les heures vont dans « heures à reporter » (calculé depuis le pointage) ; les RH le vident en prime. Les autres compteurs se tiennent ici (soldes datés) ; ils pré-remplissent la navette. Import des soldes existants : à venir (classeur).</div></div>`;}
/* ── Fiche d'une autre personne : ce qu'on voit dépend des droits ── */
function blocsFiche(p,me){
  const moi=p.id===me.id,dEdit=can(me,'dossier.edit'),qse=can(me,'qse.manage'),val=can(me,'pointage.validate')&&equipeIds(me).has(p.id);
  const c=siteJour(p),chef=chefDe(p),u=p.urgence,B=[];
  B.push(cIdent(p,!moi)+`<div class="card"><h3>Coordonnées</h3><div>
    <div class="eq-kv" style="border-top:0"><span>Téléphone</span><span>${esc(p.tel)}</span></div>
    <div class="eq-kv"><span>E-mail</span><span>${esc(p.email)}</span></div>
    <div class="eq-kv"><span>Chantier du jour</span><span>${c?esc(c.nom):'—'}</span></div>
    <div class="eq-kv"><span>Chef de chantier</span><span>${chef?esc(nomC(chef)):'—'}</span></div>
    ${(dEdit||val||moi||can(me,'planning.edit'))?`<div class="eq-kv"><span>Domicile</span><span>${adresseTxt(p)?esc(adresseTxt(p)):etat('warn','À renseigner')}${dEdit&&!moi?` <button class="btn sm" data-act="adr" data-v="${esc(p.id)}" title="Modifier l'adresse (RH)">✏️</button>`:''}</span></div>`:''}
    ${S.adrEdit===p.id?(()=>{const a=(p.adresse&&typeof p.adresse==='object')?p.adresse:{};return `<div class="eq-form" style="margin-top:8px"><div><label class="f">Voie</label><input class="f" id="adr-voie" value="${esc(a.voie||'')}" placeholder="12 rue de la Mer"></div><div class="eq-2sel"><div><label class="f">Code postal</label><input class="f" id="adr-cp" value="${esc(a.cp||'')}" inputmode="numeric"></div><div><label class="f">Ville</label><input class="f" id="adr-ville" value="${esc(a.ville||'')}" placeholder="pour les grands déplacements"></div></div><div class="eq-acts"><button class="btn primary" data-act="adrok" data-v="${esc(p.id)}">Enregistrer</button><button class="btn" data-act="adr" data-v="">Annuler</button></div></div>`;})():''}</div></div>`);
  if(dEdit||moi)B.push(cCompteurs(p,me,dEdit&&!moi)); /* 13/10 : heures et compteurs (paramètres du profil) */
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
  /* 12/10 (Ethan) : Moi = MES affaires. Ce qui concerne l'équipe (équipe du jour, binômes, pointages à valider, demandes, production des équipes, échéances de l'équipe, mes chantiers) vit dans Équipes ;
     les chiffres et alertes de l'entreprise dans Entreprise — pas de doublon. */
  if(t==='chef'){a=[cPointer(me,true),cTaches(me),cChantiersSemaine(me,0,true)];b=[cDeplacement(me),monVehiculeHTML(me._acc),cMesDebours(me),cEchPerso(me)];c=[cRecompenses(me),cFiche(me,me)]}
  if(t==='rh'){a=[cEchRH(me)];b=[cArrivants(me),cFins(me),cChantiersSemaine(me,0,true)];c=[cPointer(me,true),cEchPerso(me),cRecompenses(me),cFiche(me,me)]}
  if(t==='direction'){a=[cTaches(me),cChantiersSemaine(me,0,true)];b=[cDeplacement(me),monVehiculeHTML(me._acc),cMesDebours(me),cEchPerso(me)];c=[cPointer(me,true),cRecompenses(me),cFiche(me,me)]}
  return `<h2 class="vt">Bonjour ${esc(me.prenom)} <span class="hint">· ${fJour(DATA.today)}/${DATA.today.slice(0,4)}</span></h2>
    <div class="eq-cols"><div>${cAujourdhui(me)}${a.join('')}</div><div>${b.join('')}</div><div>${c.join('')}</div></div>`;
}
function vHeures(me){
  const Bv=can(me,'pointage.validate')?cValidation(me):'';
  const moi=can(me,'pointage.self'); // pointer ses propres heures : opérateurs et certains chefs de chantier
  return `<h2 class="vt">${moi?'Heures':'Pointages de l\'équipe'}</h2>${Bv?`<div class="eq-cols eq-1"><div>${Bv}</div></div>`:''}${moi?cPointer(me,false)+chipsPeriode()+cHeuresPeriode(me)+cMaNavette(me):''}`;
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
/* 11/10 (Ethan) : cocher un jour sur un chantier n'enlève JAMAIS l'autre chantier de ce jour-là (ça peut être voulu : chef en autonomie, gars qui jongle) — on garde les deux et on le signale ⚠. Pour qu'il quitte l'autre chantier : décocher le jour sur l'autre carte. */
function plDayToggle(v){const [key,site,d]=v.split('|');const wk=weekKey(d);const o=Object.assign({},((PLANNING[wk]||{}).aff||{})[key]||{});const cur=o[d]||[];const add=!cur.includes(site);o[d]=add?cur.concat([site]):cur.filter(x=>x!==site);if(!o[d].length)delete o[d];const tt=(S.plTeamOf||{})[site];if(add&&tt&&!o['eq:'+site])o['eq:'+site]=tt;savePlanning(wk,{[key]:Object.keys(o).length?o:null});render();
  if(add&&o[d].length>1)msg('⚠ '+fJour(d).slice(0,4)+' : '+pers(key).prenom+' est sur '+o[d].map(x=>site_(x).ville||site_(x).nom).join(' ET ')+' le même jour — si ce n\'est pas voulu, décoche ce jour sur l\'autre chantier');}
const plDblDays=(aff,key,site,js)=>js.filter(d=>((aff[key]||{})[d]||[]).includes(site)&&((aff[key]||{})[d]||[]).length>1); /* jours où la personne est sur ce chantier ET un autre */
/* 10/10 (Ethan) : deux équipes sur le même chantier — étiquette d'équipe par personne et par chantier, rangée dans l'objet planning de la personne sous la clé « eq:<chantier> »
   (le serveur fusionne par personne : rien à changer côté SQL ; planDe ne lit que les dates). Chef sur deux chantiers le même jour = « en autonomie » ; encadrement placé = « conduite de travaux ». */
const TEAMS=['A','B','C','D','E','F','G','H','I','J']; /* jusqu'à 10 équipes par chantier (Ethan : « jusqu'à 7, prévoit 10, discret ») */
const teamChoices=used=>{const u=TEAMS.filter(t=>used.includes(t));const next=TEAMS.find(t=>!used.includes(t));return next?u.concat([next]):u;}; /* on ne montre que les équipes déjà en place + la suivante : discret */
const teamOf=(aff,key,site)=>((aff[key]||{})['eq:'+site])||'';
const plTeamsUsed=(aff,site,js)=>[...new Set(Object.keys(aff).filter(k=>js.some(d=>((aff[k]||{})[d]||[]).includes(site))).map(k=>teamOf(aff,k,site)).filter(Boolean))].sort();
const plMulti=(aff,p,site,js)=>{const o=aff[p.id]||{};const others=new Set();js.forEach(d=>{if((o[d]||[]).includes(site))(o[d]||[]).forEach(x=>{if(x!==site)others.add(x);});});return [...others];};
const plEnc=p=>p.poste==='conducteur'||poste(p).fam==='encadrement'&&p.poste!=='chef';
const norm=x=>String(x||'').normalize('NFD').replace(/[\u0300-\u036f]/g,'').toLowerCase();
const plPosteOk=p=>!S.plPoste||(S.plPoste==='interim'?p.type==='interim':S.plPoste==='chef'?p.poste==='chef':S.plPoste==='enc'?plEnc(p):p.poste===S.plPoste);
/* ── 12/10 « RACCOURCI RAPIDE » (Ethan) : créer une personne depuis le planning — « vendredi, nouvel intérimaire : nom, prénom, poste, agence, e-mail en option,
   juste pour le placer dans le planning ; puis ça envoie à un administrateur de créer ou finaliser cet accès ». Conducteur et au-dessus (planning.edit).
   · avec e-mail et créateur administrateur → l'accès (invitation) est créé tout de suite ; · sinon → ligne « prov » du registre (serveur, partagée) : la personne
   se place, apparaît chez le chef, et l'administrateur a une notification « accès à finaliser » (Entreprise → Administration → À finaliser). */
const provAll=()=>regAll('prov').filter(p=>p&&p.status!=='done').map(p=>({id:'prov:'+p.id,provId:p.id,email:String(p.email||'').toLowerCase(),name:((p.prenom||'')+' '+(p.nom||'')).trim(),prenom:p.prenom||'',nom:p.nom||'',poste:p.poste||'soudeur',type:p.type||'salarie',agence:p.agence||'',tel:p.tel||'',secteur:p.secteur||null,active:true,prov:true,sites:null,rights:{},by:p.by||'',at:p.at||''}));
export const espaceProvTodo=()=>provAll(); /* administrateur : accès à finaliser */
const PROV_POSTES=[['soudeur','Soudeur'],['tuyauteur','Tuyauteur'],['manchonneur','Manchonneur'],['activites_specifiques','Activités spécifiques'],['chauffeur_engin','Chauffeur d\'engin'],['autre','Aide / autre'],['chef','Chef de chantier'],['conducteur','Conducteur de travaux']];
function plNewHTML(me){const d=S.plNew||{};const sect=S.plSect===undefined?mySecteur(me):S.plSect;
  return `<div class="card eq-plnew" id="pl-new"><h3>＋ Nouvelle personne <span class="hint">· juste pour la placer</span></h3>
    <div class="eq-2sel"><div><label class="f" style="margin-top:0">Prénom</label><input class="f" id="pn-prenom" value="${esc(d.prenom||'')}" autocomplete="off"></div><div><label class="f" style="margin-top:0">Nom</label><input class="f" id="pn-nom" value="${esc(d.nom||'')}" autocomplete="off"></div></div>
    <div class="eq-2sel"><div><label class="f">Poste</label><select class="f" id="pn-poste">${PROV_POSTES.map(([k,t])=>`<option value="${k}"${(d.poste||'soudeur')===k?' selected':''}>${t}</option>`).join('')}</select></div><div><label class="f">Type</label><select class="f" id="pn-type"><option value="salarie"${d.type!=='interim'?' selected':''}>Salarié SCR</option><option value="interim"${d.type==='interim'?' selected':''}>Intérimaire</option></select></div></div>
    <div id="pn-agw" style="${d.type==='interim'?'':'display:none'}"><label class="f">Agence d'intérim</label><input class="f" id="pn-agence" value="${esc(d.agence||'')}" placeholder="Manpower, Adecco, Randstad…" autocomplete="off"></div>
    <label class="f">E-mail <span class="dim">(en option — mais demande-le lui)</span></label><input class="f" id="pn-email" type="email" value="${esc(d.email||'')}" placeholder="prenom.nom@… ou son adresse perso" autocomplete="off">
    <div class="hint" style="margin:4px 0 0">Avec son e-mail, il reçoit son accès : il pointe, signe ses documents et voit son objectif <b>depuis son téléphone</b>. Sans e-mail, il reste « à finaliser » par un administrateur et personne ne peut le faire pointer à sa place.</div>
    <label class="f">Secteur</label><select class="f" id="pn-sect"><option value="">—</option>${Object.keys(SECTEURS).map(k=>`<option value="${k}"${(d.secteur||sect||'')===k?' selected':''}>${SECTEURS[k]}</option>`).join('')}</select>
    <div id="pn-err" style="color:#9b2c22;font-size:12.5px;margin-top:4px">${esc(d.err||'')}</div>
    <div class="eq-acts" style="margin:8px 0 0"><button class="btn primary" data-act="plnewok">Créer et placer</button><button class="btn" data-act="plnewx">Annuler</button></div></div>`;}
function plNewRead(){const g=k=>{const i=$id('pn-'+k);return i?i.value.trim():'';};return {prenom:g('prenom'),nom:g('nom'),poste:g('poste')||'soudeur',type:g('type')==='interim'?'interim':'salarie',agence:g('agence'),email:g('email').toLowerCase(),secteur:g('sect')};}
async function provCreate(d,me){const email=d.email||'';if(email&&!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email))return {error:'e-mail invalide (ou laisse vide)'};if(!d.prenom&&!d.nom)return {error:'prénom ou nom manquant'};
  const dup=DATA.personnes.find(p=>(email&&p.email===email)||(norm(p.prenom)===norm(d.prenom)&&norm(p.nom)===norm(d.nom)&&d.nom));if(dup)return {error:nomC(dup)+' existe déjà'+(dup.prov?' (à finaliser)':'')+' : cherche-le dans « À placer »'};
  if(email&&me.admin&&A.createAccess){const r=await A.createAccess({prenom:d.prenom,nom:d.nom,email,poste:d.poste,type:d.type,sites:null});if(r&&r.error)return r;if(d.secteur)savePeoplePart(email,'secteur',d.secteur);if(A.reloadAccounts)try{await A.reloadAccounts();}catch(e){}return {ok:true,key:email,where:'acces'};}
  const id=Date.now().toString(36)+Math.random().toString(36).slice(2,6);const demo=!!(me._acc&&me._acc.local)||!A.state.cloudUser&&!String(me.id).includes('@'); /* personnage de démo / bac à sable : la ligne reste sur l'appareil, rien ne part au serveur */
  regSet('prov',id,{prenom:d.prenom,nom:d.nom,poste:d.poste,type:d.type,agence:d.type==='interim'?d.agence:'',email:email||'',secteur:d.secteur||null,by:nomC(me),at:new Date().toISOString(),status:'a_finaliser',demo:demo||undefined},demo?{local:true}:undefined);
  return {ok:true,key:email||('prov:'+id),where:'prov'};}
/* finalisation par l'administrateur : l'accès est créé (invitation) ; si la personne n'avait pas d'e-mail, ses semaines de planning passent de prov:<id> à son e-mail */
export function espaceProvDone(provId,email){const row=regGet('prov',provId);if(!row)return;const oldKey=row.email?row.email.toLowerCase():'prov:'+provId;const nk=String(email||'').toLowerCase();
  if(nk&&oldKey!==nk){Object.keys(PLANNING).forEach(w=>{const aff=(PLANNING[w]||{}).aff||{};if(!aff[oldKey])return;const patch={[oldKey]:null,[nk]:Object.assign({},aff[nk]||{},aff[oldKey])};savePlanning(w,patch);});if(PEOPLE[oldKey]&&PEOPLE[oldKey].secteur&&nk)savePeoplePart(nk,'secteur',PEOPLE[oldKey].secteur);}
  regSet('prov',provId,{status:'done',email:nk||row.email||'',doneAt:new Date().toISOString(),doneBy:A.userName?A.userName():''});}
function plChip(p,site,js,aff,me){const sites=plSitesDe(aff,p,js);const jours=site?(sites[site]||[]):[];const sel=S.plSel===p.id;const edit=S.plEdit===p.id+'|'+(site||'');
  const dots=site?`<span class="eq-pldots">${js.map(d=>`<i class="${jours.includes(d)?'on':((aff[p.id]||{})[d]||[]).length?'other':''}${jours.includes(d)&&((aff[p.id]||{})[d]||[]).length>1?' warn':''}" title="${fJour(d)}${((aff[p.id]||{})[d]||[]).length?' : '+((aff[p.id]||{})[d]||[]).map(x=>site_(x).ville||site_(x).nom).join(' + '):''}">${jours.includes(d)&&((aff[p.id]||{})[d]||[]).length>1?((aff[p.id]||{})[d]||[]).length:['L','M','M','J','V'][D(d).getDay()-1]||''}</i>`).join('')}</span>`:(Object.keys(sites).length?`<span class="eq-pldots">${js.map(d=>`<i class="${((aff[p.id]||{})[d]||[]).length?'other':'free'}" title="${fJour(d)}${((aff[p.id]||{})[d]||[]).length?' : '+((aff[p.id]||{})[d]||[]).map(x=>site_(x).ville||site_(x).nom).join(' + '):' : libre'}">${['L','M','M','J','V'][D(d).getDay()-1]||''}</i>`).join('')}</span>`:'');
  const fdays=site?[]:js.filter(d=>!((aff[p.id]||{})[d]||[]).length);
  const multi=site?plMulti(aff,p,site,js):[];const enc=plEnc(p);const chefIci=site&&p.poste==='chef';const fc=site?site_(site):null;const condIci=site&&fc&&fc.conducteur===p.id;const team=site?teamOf(aff,p.id,site):'';
  const role=site?(enc?(condIci?'📋 conducteur de ce chantier · conduite de travaux':'📋 conduite de travaux'):chefIci?(multi.length?'🦺 chef de chantier · <b>en autonomie</b> ('+plDblDays(aff,p.id,site,js).map(d=>fJour(d).slice(0,4)).join(', ')+') : aussi sur '+multi.map(x=>esc(site_(x).ville||site_(x).nom)).join(', '):(fc&&fc.chef===p.id?'🦺 chef de ce chantier':'🦺 chef de chantier')):(multi.length?'<span class="eq-warn">⚠ 2 chantiers le même jour</span> ('+plDblDays(aff,p.id,site,js).map(d=>fJour(d).slice(0,4)).join(', ')+') : aussi sur '+multi.map(x=>esc(site_(x).ville||site_(x).nom)).join(', '):'')):'';
  return `<div class="eq-plchip${sel?' sel':''}${site?'':' libre'}${enc&&site?' enc':''}${chefIci?' chef':''}${multi.length?' multi':''}${team?' team-'+team:''}" draggable="true" data-drag="${esc(p.id)}" data-site="${esc(site||'')}" data-q="${esc(norm(p.prenom+' '+p.nom+' '+poste(p).label))}">
    <button class="eq-plmain" data-act="${site?'pledit':'plsel'}" data-v="${esc(site?p.id+'|'+site:p.id)}" title="${site?'Régler les jours, l\'équipe':'Choisir, puis toucher un chantier'}">${avatar(p)}<span class="eq-grow"><b>${esc(p.prenom)} ${esc(p.nom)}</b>${team?`<i class="eq-team t-${team}">${team}</i>`:''}<small>${role&&(chefIci||enc)?role:esc(poste(p).label)+(role?'<br>'+role:'')}${p.type==='interim'?' · intérim'+(p.agence?' '+esc(p.agence):''):''}${p.prov?' · <span style="color:#9a3410">⏳ accès à finaliser</span>':''}${!site&&secteurDe(p)?' · '+esc(SECTEURS[secteurDe(p)]||secteurDe(p)):''}${!site&&fdays.length&&fdays.length<js.length?' · <b style="color:#9a3410">libre '+fdays.map(d=>fJour(d).slice(0,4)).join(', ')+'</b>':''}</small></span>${dots}</button>
    ${edit?`<div class="eq-pledit"><div class="eq-s" style="margin-bottom:6px">Jours sur ce chantier <span class="dim">· un jour coché ailleurs aussi reste sur les deux (⚠)</span></div><div class="eq-opts">${js.map(d=>{const other=((aff[p.id]||{})[d]||[]).filter(x=>x!==site).map(x=>site_(x).ville||site_(x).nom).join(' + ');const here=jours.includes(d);return `<button class="chip${here?' active':''}${here&&other?' warn':''}" data-act="plday" data-v="${esc(p.id)}|${esc(site)}|${d}" title="${other?'aussi : '+esc(other):''}">${here&&other?'⚠ ':''}${fJour(d).slice(0,4)} ${d.slice(8,10)}${other?' <span class="dim">·'+esc(other.slice(0,10))+'</span>':''}</button>`;}).join('')}</div>
      <div class="eq-s" style="margin:8px 0 6px">Équipe sur ce chantier</div><div class="eq-teams"><button class="eq-tb${!team?' on':''}" data-act="plsetteam" data-v="${esc(p.id)}|${esc(site)}|" title="Sans équipe">—</button>${teamChoices(plTeamsUsed(aff,site,js).concat(team?[team]:[])).map(t=>`<button class="eq-tb t-${t}${team===t?' on':''}" data-act="plsetteam" data-v="${esc(p.id)}|${esc(site)}|${t}" title="Équipe ${t}">${t}</button>`).join('')}</div>
      <div class="eq-acts" style="margin:8px 0 0"><button class="btn" data-act="plsel" data-v="${esc(p.id)}" title="Puis touche l'autre chantier : tu choisis les jours">↔ Aussi sur un autre chantier</button><button class="btn" data-act="plrm" data-v="${esc(p.id)}|${esc(site)}">Retirer de ce chantier</button><button class="btn" data-act="pledit" data-v="${esc(p.id)}|${esc(site)}">Fermer</button></div>
      <label class="f">Secteur de rattachement</label><select class="f" data-chg="plpers" data-k="secteur" data-p="${esc(p.id)}"><option value="">—</option>${Object.keys(SECTEURS).map(k=>`<option value="${k}"${secteurDe(p)===k?' selected':''}>${SECTEURS[k]}</option>`).join('')}</select></div>`:''}</div>`;}
function vOrga(me){
  const k=S.plWeek||0,js=semaineDe(k),wk=weekKey(js[0]);ensureWeeks([wk,weekKey(semaineDe(k-1)[0])]);
  const sect=S.plSect===undefined?mySecteur(me):S.plSect;const aff=(PLANNING[wk]||{}).aff||{};
  const chantiers=DATA.chantiers.filter(c=>!c.bureau);const duSect=chantiers.filter(c=>!sect||c.secteur===sect||!c.secteur),hors=chantiers.filter(c=>sect&&c.secteur&&c.secteur!==sect); /* un chantier sans secteur reste visible : on lui règle son secteur (⚙) */
  const gens=plGens();const mine=gens.filter(p=>!sect||secteurDe(p)===sect||!secteurDe(p)),autres=gens.filter(p=>sect&&secteurDe(p)&&secteurDe(p)!==sect); /* sans secteur : à placer ici (le premier placement le rattache) */
  const libres=p=>js.filter(d=>!((aff[p.id]||{})[d]||[]).length);const estPlace=p=>Object.keys(plSitesDe(aff,p,js)).length>0;const complet=p=>!libres(p).length; /* ③ : un gars placé 3 jours sur 5 reste « à placer » pour les 2 autres */
  const aPlacer=mine.filter(p=>!complet(p)&&plPosteOk(p)).sort((a,b)=>libres(b).length-libres(a).length),places=mine.filter(complet).length,aPlacerAutres=autres.filter(p=>!complet(p)&&plPosteOk(p));const joursLibres=mine.filter(p=>!complet(p)).reduce((a,p)=>a+libres(p).length,0);
  const selP=S.plSel?pers(S.plSel):null;const pct=mine.length?Math.round(places/mine.length*100):0;
  const chefs=DATA.personnes.filter(p=>p.active&&p.poste==='chef'),conds=DATA.personnes.filter(p=>p.active&&(p.poste==='conducteur'||poste(p).fam==='encadrement'));
  const fiche=c=>{const dk='plF_'+c.id;const resume=[c.secteur?SECTEURS[c.secteur]||c.secteur:'secteur ?',c.chef?nomC(pers(c.chef)):'chef ?',c.conducteur?nomC(pers(c.conducteur)):'conducteur ?'].join(' · ');
    return `<details class="eq-plfd"${S[dk]?' open':''} data-det="${dk}"><summary class="eq-s">⚙ ${esc(resume)}</summary><div class="eq-plfiche"><select class="f" data-chg="plfiche" data-site="${esc(c.id)}" data-k="secteur" title="Secteur"><option value="">Secteur…</option>${Object.keys(SECTEURS).map(x=>`<option value="${x}"${c.secteur===x?' selected':''}>${SECTEURS[x]}</option>`).join('')}</select>
    <select class="f" data-chg="plfiche" data-site="${esc(c.id)}" data-k="chef" title="Chef de chantier"><option value="">Chef de chantier…</option>${chefs.map(p=>`<option value="${esc(p.id)}"${c.chef===p.id?' selected':''}>${esc(nomC(p))}</option>`).join('')}</select>
    <select class="f" data-chg="plfiche" data-site="${esc(c.id)}" data-k="conducteur" title="Conducteur de travaux"><option value="">Conducteur…</option>${conds.map(p=>`<option value="${esc(p.id)}"${c.conducteur===p.id?' selected':''}>${esc(nomC(p))}</option>`).join('')}</select>
    <input class="f" data-chg="plfiche" data-site="${esc(c.id)}" data-k="horaires" value="${esc(ficheDe(c.id).horaires||'')}" placeholder="Horaires (ex. 7 h 30 – 16 h 30, pause 12 h – 13 h)" title="Horaires du chantier — accueil chantier, point 5"><input class="f" data-chg="plfiche" data-site="${esc(c.id)}" data-k="rassemblement" value="${esc(ficheDe(c.id).rassemblement||'')}" placeholder="Point de rassemblement / PR secours (ex. base vie, rue X)" title="Point de rassemblement — accueil chantier, point 5"></div></details>`;};
  const carte=c=>{const ici=gens.filter(p=>plSitesDe(aff,p,js)[c.id]);const n=ici.length;const chefs=ici.filter(p=>p.poste==='chef'),reste=ici.filter(p=>p.poste!=='chef');const teams=[...new Set(reste.map(p=>teamOf(aff,p.id,c.id)))].filter(Boolean).sort();const tgt=(S.plTeamOf||{})[c.id]||'';
    /* 10/10 (Ethan) : le chef de chantier toujours en tête, même sans équipe attitrée ; puis les équipes (A → J), puis les sans équipe */
    const groupe=t=>{const L=reste.filter(p=>teamOf(aff,p.id,c.id)===t);if(!L.length)return '';const chef=chefs.find(p=>teamOf(aff,p.id,c.id)===t);return `<div class="eq-plteam t-${t||'0'}"><b>${t?'Équipe '+t:(teams.length?'Sans équipe':'')}</b>${chef?' · chef : '+esc(chef.prenom):''}${t||teams.length?' · '+L.length:''}</div><div class="eq-plpeople">${L.map(p=>plChip(p,c.id,js,aff,me)).join('')}</div>`;};
    const people=`${chefs.length?`<div class="eq-plpeople eq-plchefs">${chefs.map(p=>plChip(p,c.id,js,aff,me)).join('')}</div>`:''}${teams.length?teams.map(groupe).join('')+groupe(''):`<div class="eq-plpeople">${reste.map(p=>plChip(p,c.id,js,aff,me)).join('')||(chefs.length?'':'<div class="eq-s eq-plvide">Personne pour l\'instant</div>')}</div>`}`;
    return `<div class="card eq-plsite${selP?' drop':''}" data-drop="${esc(c.id)}"><div class="eq-plhead"><span class="eq-grow"><span class="eq-big">📍 ${esc(c.nom)}</span><span class="eq-s">${esc(c.ville||'')}${c.secteur?(c.ville?' · ':'')+esc(SECTEURS[c.secteur]||c.secteur):''}${c.soudures?' · '+nb(c.soudures)+' soudures':''}</span></span><span class="eq-plcount${n?'':' vide'}">${n}</span></div>
      ${js.some(d=>meteoDe(c.id,d))?`<div class="eq-plmeteo">${js.map(d=>{const mt=meteoDe(c.id,d);return `<span title="${fJour(d)}${mt?' · '+METEO[mt.k][1]+' '+mt.t+' °C'+(mt.mm?' · '+mt.mm+' mm':''):''}">${mt?METEO[mt.k][0]+'<b>'+mt.t+'°</b>':'·'}</span>`;}).join('')}</div>`:''}
      ${fiche(c)}
      ${people}
      ${S.plSplit&&S.plSplit.site===c.id?(()=>{const sp=S.plSplit;const p=pers(sp.key);const o=aff[sp.key]||{};return `<div class="eq-pledit" style="margin-top:6px"><div class="eq-s" style="margin-bottom:6px"><b>${esc(nomC(p))}</b> sur ce chantier : quels jours ?</div><div class="eq-opts">${js.map(d=>{const here=(o[d]||[]).includes(c.id);const other=(o[d]||[]).filter(x=>x!==c.id).map(x=>site_(x).ville||site_(x).nom).join(' + ');return `<button class="chip${here?' active':''}${here&&other?' warn':''}" data-act="pladd" data-v="${esc(sp.key)}|${esc(c.id)}|${d}" title="${other?'aussi : '+esc(other):''}">${here&&other?'⚠ ':''}${fJour(d).slice(0,4)} ${d.slice(8,10)}${other?' <span class="dim">·'+esc(other.slice(0,10))+'</span>':''}</button>`;}).join('')}</div>
        <div class="hint" style="margin-top:6px">Un jour coché ici s'ajoute à son autre chantier (⚠ deux chantiers le même jour : ${p.poste==='chef'?'chef en autonomie':'il jongle entre les deux'}). Pour qu'il quitte l'autre chantier ce jour-là : décoche le jour sur l'autre carte.</div>
        <div class="eq-acts" style="margin:8px 0 0"><button class="btn primary" data-act="plsplit" data-v="${esc(sp.key)}|${esc(c.id)}|ok">Terminé</button></div></div>`;})():''}
      ${selP?`<div class="eq-teams" style="margin-top:6px"><span class="eq-s">Équipe :</span><button class="eq-tb${!tgt?' on':''}" data-act="plteam" data-v="${esc(c.id)}|" title="Sans équipe">—</button>${teamChoices(plTeamsUsed(aff,c.id,js).concat(tgt?[tgt]:[])).map(t=>`<button class="eq-tb t-${t}${tgt===t?' on':''}" data-act="plteam" data-v="${esc(c.id)}|${t}" title="Équipe ${t}">${t}</button>`).join('')}</div><button class="btn primary eq-full" data-act="plput" data-v="${esc(c.id)}">Placer ${esc(selP.prenom)} ici${tgt?' · équipe '+tgt:''} · ${(()=>{const fd=libres(selP);return fd.length===js.length||!fd.length?'toute la semaine':fd.map(d=>fJour(d).slice(0,4)).join(', ');})()}</button>`:''}</div>`;};
  return `<h2 class="vt">Planning équipe <span class="hint">· semaine ${numSemaine(js[0])} · du ${fDate(js[0]).slice(0,5)} au ${fDate(js[4])}</span></h2>
    ${weekNav({k,js,act:'plweek',marks:d=>DATA.personnes.filter(p=>p.active&&planDe(p.id,d).length).length})}
    <div class="card"><div class="eq-2sel"><div><label class="f" style="margin-top:0">Secteur</label><select class="f" data-chg="plSect"><option value=""${sect===''?' selected':''}>Tous les secteurs</option>${Object.keys(SECTEURS).map(x=>`<option value="${x}"${sect===x?' selected':''}>${SECTEURS[x]}</option>`).join('')}</select></div>
      <div><label class="f" style="margin-top:0">Semaine</label><div class="eq-plprog${pct>=100?' ok':''}"><b>${places} / ${mine.length}</b> placé${places>1?'s':''} toute la semaine${joursLibres?' · <b style="color:#9a3410">'+joursLibres+' jour'+(joursLibres>1?'s':'')+' à pourvoir</b>':''}${pct>=100&&mine.length?' · 🎉 tout le monde est placé':''}<span class="eq-prog"><i style="width:${pct}%"></i></span></div></div></div>
      <div class="eq-acts" style="margin:10px 0 0"><button class="btn" data-act="plcopy" data-v="${wk}">↩ Reprendre la semaine passée</button><button class="btn${S.plEnc?' primary':''}" data-act="plenc">${S.plEnc?'✓ ':''}Avec l'encadrement</button>${me.admin?`<button class="btn" data-act="plstrict" title="Règle d'accès des gars qui ne sont pas placés">${PL_RULES.strict?'🔒 Non placé = rien':'🔓 Non placé = tout voir'}</button>`:''}<button class="btn" data-act="meteo" title="Recharger la météo des chantiers (Open-Meteo)">☀ Météo</button></div>
      <div class="hint" style="margin-top:6px">Touche une personne puis un chantier (ou glisse-la). Toucher une personne placée règle ses jours. Les gars n'ouvrent dans l'appli que les chantiers de leur semaine et de la précédente.</div></div>
    <div class="eq-cols eq-2b"><div>
      <div class="card eq-pltray${selP?' sel':''}" data-drop="tray"><h3>À placer <span class="hint">· ${aPlacer.length}${aPlacer.some(estPlace)?' · dont '+aPlacer.filter(estPlace).length+' en partie':''}${S.plPoste?' · filtre':''}</span></h3>
        <input class="f" id="pl-q" type="search" placeholder="🔍 Chercher quelqu'un (nom, poste)…" value="${esc(S.plQ||'')}" autocomplete="off" style="margin:0 0 6px">
        ${can(me,'planning.edit')?(S.plNew?plNewHTML(me):`<button class="btn eq-full" data-act="plnew" style="margin:0 0 6px" title="Nouvel intérimaire, nouvel embauché : nom, prénom, poste — il se place tout de suite, l'accès se finalise après">＋ Nouvelle personne (intérimaire, embauche)</button>`):''}
        <div class="eq-opts" style="margin:0 0 6px">${[['','Tous'],['soudeur','Soudeurs'],['tuyauteur','Tuyauteurs'],['manchonneur','Manchonneurs'],['activites_specifiques','Act. spéc.'],['chauffeur_engin','Chauffeurs'],['autre','Aides'],['chef','Chefs'],['interim','Intérim']].concat(S.plEnc?[['enc','Encadrement']]:[]).map(([v,t])=>`<button class="chip${(S.plPoste||'')===v?' active':''}" data-act="plposte" data-v="${v}">${t}</button>`).join('')}</div>
        ${aPlacer.length?`<div class="eq-plpeople" id="pl-tray">${aPlacer.map(p=>plChip(p,null,js,aff,me)).join('')}</div><div class="eq-s" id="pl-none" style="display:none">Personne ne correspond à la recherche.</div>`:`<div class="eq-s">${mine.length?(S.plPoste?'Personne à placer avec ce filtre.':'🎉 Tout le monde est placé cette semaine.'):'Personne dans ce secteur : rattache les gars à un secteur (toucher une personne placée → secteur) ou choisis « Tous les secteurs ».'}</div>`}
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
const SVG={hat:'<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.9" stroke-linecap="round" stroke-linejoin="round"><path d="M3 15a9 9 0 0 1 18 0"/><path d="M2 15h20v2a1 1 0 0 1-1 1H3a1 1 0 0 1-1-1z"/><path d="M12 6V3"/><path d="M9 15V9"/><path d="M15 15V9"/></svg>',truck:'<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.9" stroke-linecap="round" stroke-linejoin="round"><path d="M3 7h11v9H3z"/><path d="M14 10h4l3 3v3h-7z"/><circle cx="7" cy="18" r="2"/><circle cx="17" cy="18" r="2"/></svg>',pin:'<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.9" stroke-linecap="round" stroke-linejoin="round"><path d="M20 10c0 6-8 12-8 12s-8-6-8-12a8 8 0 0 1 16 0z"/><circle cx="12" cy="10" r="3"/></svg>',
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
  /* 0quinquies. 🎯 mon objectif du jour (11/10, Ethan : « il faut que ce soit une notification aussi à son accueil ») : posé par le chef pour mon équipe ou pour moi ; ouvre le plan en surbrillance quand il est posé dessus ; et le prochain jour déjà planifié si le chef a anticipé */
  if(['terrain','interim','chef'].includes(kindOf(me))){const ms=missionsFor(me,today).filter(m=>!m.done);const bySite={};ms.forEach(m=>(bySite[m.site]=bySite[m.site]||[]).push(m));
    Object.entries(bySite).forEach(([id,L2])=>{const onPlan=L2.filter(objOnPlan);push({act:true,sev:'or',ic:ICO.flag,t:'🎯 Objectif du jour : '+L2.map(m=>m.label).join(' · '),s:missionsTxt(L2)+(L2[0].team?' · équipe '+L2[0].team:'')+' · '+site(id).nom+(onPlan.length?' — '+onPlan.map(m=>objPlanTxt(Object.assign({_site:id},m))).join(' · ')+' · en surbrillance 🎯 sur le plan':'')+(L2[0].by?' · posé par '+L2[0].by:''),when:'aujourd\'hui',go:()=>{if(onPlan.length&&A.objFocus)A.objFocus(id,onPlan[0].id);else if(A.openSite)A.openSite(id,'bureau');}});});
    const next=semaineDe(0).concat(semaineDe(1)).filter(d=>d>today).find(d=>missionsFor(me,d).length);if(next){const L2=missionsFor(me,next);push({act:false,sev:'info',ic:ICO.flag,kl:'🎯 Objectif de '+fJour(next).slice(0,4),kv:L2.map(m=>m.label).join(' · ')+' · '+missionsTxt(L2),t:'Objectif de '+fJour(next)+' : '+L2.map(m=>m.label).join(' · '),s:missionsTxt(L2)+' · '+site(L2[0].site).nom,go:()=>{if(A.openSite)A.openSite(L2[0].site,'bureau');}});}}
  /* 12/10 soir : déclaration d'accident à traiter (RH, direction, QSE) */
  if(can(me,'qse.manage')||accueilType(me)==='rh'||accueilType(me)==='direction'||me.admin){const Acc=accidentsAll().filter(x=>x.status!=='traite');if(Acc.length)push({act:true,sev:'bad',ic:ICO.alert,t:Acc.length+' déclaration'+(Acc.length>1?'s':'')+' d\'accident à traiter',s:Acc.slice(0,3).map(x=>(ACC_TYPES.find(t=>t[0]===x.type)||ACC_TYPES[0])[1].replace(/^\S+\s/,'')+' · '+(x.names||'')+' · '+fJour(x.d)).join(' · '),when:whenOf(Acc[0].at),go:()=>goX('accident')});}
  /* 12/10 administrateur : personnes créées depuis le planning dont l'accès est à finaliser */
  if(me.admin){const P=provAll();if(P.length)push({act:true,sev:'warn',ic:ICO.user,t:P.length+' accès à finaliser',s:P.map(p=>p.name+' ('+((DATA.postes[p.poste]||{}).label||p.poste)+(p.type==='interim'?', intérim'+(p.agence?' '+p.agence:''):'')+')'+(p.email?' · '+p.email:' · sans e-mail')+(p.by?' — créé par '+p.by:'')).join(' · '),when:P[0].at?whenOf(P[0].at):'',go:()=>{if(A.homeTab)A.homeTab('admin');}});}
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
  /* 13/10 : offres à remettre (dossier de A à Z) — J-3, J-1, jour J et dépassée, pour qui voit les affaires ; priorité à ses propres affaires */
  if(can(me,'affaires.view')){const lim=(()=>{const d=D(today);d.setDate(d.getDate()+3);return d.getFullYear()+'-'+pad(d.getMonth()+1)+'-'+pad(d.getDate());})();const mine=nomC(me);
    affAll().filter(a=>['preconsult','devis'].includes(a.etat)&&a.dateReponse&&!(a.offre&&a.offre.remiseAt)&&a.dateReponse<=lim).sort((a,b)=>String(a.dateReponse).localeCompare(String(b.dateReponse))).slice(0,3).forEach(a=>{const j=Math.round((new Date(a.dateReponse+'T00:00:00')-new Date(today+'T00:00:00'))/86400000);
      push({act:true,sev:j<0?'bad':j<=1?'bad':'warn',ic:ICO.pen,t:'Offre '+a.num+' · '+(a.nom||'')+(j<0?' : remise dépassée ('+fDate(a.dateReponse)+')':j===0?' : à remettre aujourd\'hui':' : à remettre '+fJour(a.dateReponse)+' (J-'+j+')'),s:(a.client||'')+(a.charge?' · '+a.charge:'')+(a.charge&&a.charge!==mine?'':' · Commerce → Offre'),when:'J'+(j<0?'+'+(-j):j?'-'+j:''),go:()=>{const AS=affState();AS.cur=a.num;AS.view='fiche';AS.tab='offre';AS.seg='devis';goX('aff');}});});}
  if(can(me,'planning.edit')||can(me,'affaires.edit')||me.admin){const T=dbTodo();if(T.length)push({act:true,sev:'warn',ic:ICO.cart,t:T.length+' note'+(T.length>1?'s':'')+' de frais à valider',s:T.slice(0,3).map(d=>(d.name||'')+' · '+(+d.montant||0).toLocaleString('fr-FR')+' €').join(' · ')+' — '+T.reduce((a,d)=>a+(+d.montant||0),0).toLocaleString('fr-FR')+' € en attente',when:whenOf(T[0].at),go:()=>{cmdState().etat='';goX('frais');}});}
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
function goSub(k){if(k==='heures'){const me=pers(S.me);if(me&&!can(me,'pointage.self')){goX('valid');return;}} /* encadrant : les pointages de l'équipe sont dans Équipes */S.tab='moi';S.sub=k;S.fiche=null;if(A.homeTab){A.homeTab('espace');return;}render();}
function goX(k){if(k==='cmd')cmdState().tab='cmd';else if(k==='comptes')cmdState().tab='comptes';else if(k==='frais')cmdState().tab='db';S.tab=HUB_OF[k]||'expl';if(S.tab==='secu'){S.tab='expl';S.hubSeg='secu';}else if(S.tab==='expl')S.hubSeg='eq';S.xsub=k;S.fiche=null;if(A.homeTab){A.homeTab(HUB_OF[k]==='secu'?'secu':S.tab);return;}render();}
function heroAccueil(me){const today=todayIso();const ids=planDe(me.id,today);const t=accueilType(me);const kit=KIT&&avPoste(me);
  if(t==='terrain'||t==='chef'){const i=ids[0];
    if(!i)return `<section class="ac-hero" style="background:var(--plane)"><div class="fig"><span class="figin">${kit?avatarSVG(avM(me,'travail').cfg,104):''}<i class="sol"></i></span></div><div class="r"><span class="ac-kick">Aujourd'hui · ${fJour(today)}</span><div class="ac-site">Pas de chantier planifié</div><div class="eq-s">Vois avec ton conducteur. Tu peux consulter tes anciens chantiers.</div><div class="eq-acts" style="margin:6px 0 0"><button class="btn" data-act="tabgo" data-v="sites">Mes chantiers</button></div></div></section>`;
    const c=site(i),mt=meteoDe(i,today),M=mt?METEO[mt.k]:null;const eq=DATA.personnes.filter(p=>p.id!==me.id&&(p.active||p.invite)&&planDe(p.id,today).includes(i));
    return `<section class="ac-hero" style="background:${M?M[2]:'var(--plane)'}"><div class="fig"><span class="figin">${kit?avatarSVG(avJour(me,today,i).cfg,104):avatar(me,'eq-lg')}<i class="sol"></i></span></div>
      <div class="r"><span class="ac-kick">Aujourd'hui · ${fJour(today)}${ids.length>1?' · '+ids.length+' chantiers':''}</span><div class="ac-site">📍 ${esc(c.nom)}${ids.length>1?`<span class="eq-s">puis ${ids.slice(1).map(x=>esc(site(x).nom)).join(', ')}</span>`:''}</div>
        ${M?`<span class="ac-mt"><span class="e">${M[0]}</span><span><b>${M[1]} · ${mt.t} °C</b><span class="eq-s">${TENUE_TXT[mt.k]||''}</span></span></span>`:''}
        ${eq.length?`<div class="ac-team"><span class="avs">${eq.slice(0,4).map(p=>avatar(p)).join('')}</span><span>avec ${eq.map(p=>esc(p.prenom)).join(', ')}${c.chef&&c.chef!==me.id?' · chef : '+esc(pers(c.chef).prenom):''}</span></div>`:''}
        ${(()=>{const ms=missionsFor(me,today);return ms.length?`<div class="ac-obj">🎯 <b>Objectif du jour</b> · ${esc(missionsTxt(ms))}<div class="eq-s">${ms.map(m=>esc(m.label)+' <span class="hint">('+hTxt(m.h)+(ids.length>1?' · '+esc(m.siteNom):'')+(m.team?' · équipe '+esc(m.team):'')+')</span>'+(objOnPlan(m)?' <b>'+esc(objPlanTxt(Object.assign({_site:m.site},m)))+'</b>':'')).join(' · ')}${ms.some(objOnPlan)?' <span class="hint">— en surbrillance 🎯 sur le plan du chantier</span>':''}</div><div class="hint">temps estimé par ton chef — un repère, pas un plafond</div></div>`:'';})()}
        <div class="eq-acts" style="margin:6px 0 0"><button class="btn primary" data-act="opensite" data-v="${esc(i)}">Ouvrir ${ids.length>1?esc(c.ville||c.nom):'le chantier'}</button>${ids.slice(1).map(x=>`<button class="btn" data-act="opensite" data-v="${esc(x)}">Ouvrir ${esc(site(x).ville||site(x).nom)}</button>`).join('')}</div></div></section>`;}
  const stats=[];let kick='',titre='',primary='';
  if(t==='rh'){const al=alertesHab(DATA.personnes,0);stats.push(['bad',al.filter(x=>x.etat==='expiree').length,'expirée'+(al.filter(x=>x.etat==='expiree').length>1?'s':'')],['',al.length,'échéances'],['',DATA.personnes.filter(p=>p.active).length,'personnes']);kick='RH · semaine '+numSemaine(today);titre=al.length+' échéance'+(al.length>1?'s':'')+' d\'habilitation';primary=`<button class="btn primary" data-act="tabgo" data-v="entreprise">Annuaire</button><button class="btn" data-act="go" data-v="habs">Habilitations</button>`;}
  else{const mine=mesSites(me).length?mesSites(me):DATA.chantiers.filter(c=>!c.bureau);const gens=plGens();const js=semaineDe(0);const placed=gens.filter(p=>js.some(d=>planDe(p.id,d).length)).length;const ids2=equipeIds(me);const nV=DATA.pointages.filter(x=>ids2.has(x.p)&&aValider(x,me)).length;
    stats.push([placed<gens.length?'bad':'ok',placed+'/'+gens.length,'placés cette semaine'],[nV?'warn':'',nV,'pointages à valider'],['',mine.length,'chantier'+(mine.length>1?'s':'')]);kick=(t==='direction'?'SCR':'Ta semaine')+' · S'+numSemaine(today)+(secteurDe(me)?' · '+(SECTEURS[secteurDe(me)]||secteurDe(me)):'');titre=mine.length+' chantier'+(mine.length>1?'s':'')+', '+placed+' gars sur le terrain';
    primary=`<button class="btn primary" data-act="tabgo" data-v="expl">Exploitation</button><button class="btn" data-act="tabgo" data-v="sites">Mes chantiers</button>`;}
  return `<section class="ac-hero" style="background:${t==='rh'?'#fff4d6':'#fdebe3'}"><div class="fig"><span class="figin">${kit?avatarSVG(avM(me,'travail').cfg,104):avatar(me,'eq-lg')}<i class="sol"></i></span></div>
    <div class="r"><span class="ac-kick">${esc(kick)}</span><div class="ac-site">${esc(titre)}</div><div class="ac-stats">${stats.map(x=>`<div class="ac-stat ${x[0]}"><b>${x[1]}</b><small>${x[2]}</small></div>`).join('')}</div><div class="eq-acts" style="margin:6px 0 0">${primary}</div></div></section>`;}
const TENUE_TXT={pluie:'tenue de pluie',chaud:'tenue légère',froid:'tenue chaude',frais:'tenue de travail'};
function spacesFor(me){const L=[{k:'sites',t:'Chantiers',ic:SVG.pin,go:'sites',n:DATA.chantiers.filter(c=>!c.bureau).length||null}]; /* 12/10 soir : mêmes noms que les six onglets (Chantiers · Équipes & heures · Sécurité · Moi · Commerce · Parc · Entreprise) */
  const okX=can(me,'planning.edit')||can(me,'pointage.validate')||can(me,'qse.manage');
  if(okX)L.push({k:'expl',t:'Équipes & heures',ic:SVG.cal,go:'expl',n:NOTIFS.filter(x=>x.act&&(x.ic===ICO.check||x.ic===ICO.cal||x.ic===ICO.clock||x.ic===ICO.undo)).length||null});
  if(okX)L.push({k:'secu',t:'Sécurité',ic:SVG.hat,go:'secu',n:espaceAccidentsTodo().length||null});
  if(can(me,'pointage.self')||can(me,'team.view'))L.push({k:'moi',t:'Moi',ic:SVG.user,go:'espace',n:habsDe(me).filter(h=>h.etat!=='ok'&&h.etat!=='absente').length||null});
  if(can(me,'affaires.view')&&me.poste!=='visiteur')L.push({k:'com',t:'Commerce',ic:SVG.pen,go:'commerce'});
  if((can(me,'flotte.manage')||me.admin)&&me.poste!=='visiteur')L.push({k:'parc',t:'Parc',ic:SVG.truck,go:'parc'});
  if(can(me,'team.view')&&me.poste!=='visiteur')L.push({k:'ent',t:'SCR',ic:SVG.bld,go:'entreprise'}); /* 13/10 (Ethan) : « Entreprise » → « SCR » — l'onglet de la boîte : notre équipe, nos documents, nos actus */
  /* 12/10 (Ethan) : plus de tuile Traceur à l'accueil — il s'ouvre depuis l'affaire (dessiner le projet) et depuis le chantier (modifier son réseau) */
  if(me.admin)L.push({k:'adm',t:'Administration',ic:SVG.sld,go:'admin'});
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
  R.hydro={k:!totE?'off':okE===totE?'ok':'warn',v:totE?okE+' / '+totE+' épreuve'+(totE>1?'s':'')+' conforme'+(okE>1?'s':''):'pas encore prévue',s:!totE&&manch>0?'des tronçons sont manchonnés : à programmer quand le planning le dira':'',n:0}; /* 12/10 (Ethan) : une épreuve pas encore prévue n'est pas une alerte */
  const ph=(net.phasage&&Array.isArray(net.phasage.phases)?net.phasage.phases:[]);
  { /* 12/10 (Ethan) : « phasage ok mais on ne sait pas si c'est à jour » → on compare les soudures faites aux fenêtres de soudure de chaque phase (dates so) */
    const exe=ph.filter(p=>p.level==='exe'&&Array.isArray(p.tr)&&p.tr.length);const prog=exe.map(p=>{const W=JJ.filter(x=>p.tr.some(t=>t.line===x.l.id&&x.m!=null&&x.m>=Math.min(t.m0,t.m1)-0.2&&x.m<=Math.max(t.m0,t.m1)+0.2));const d=W.filter(x=>['soudee','controlee','manchonnee'].includes(x.j.status)).length;const so=(p.dates&&p.dates.so)||['',''];return {p,n:W.length,d,pct:W.length?Math.round(100*d/W.length):null,so0:so[0]||'',so1:so[1]||''};});
    const late=prog.filter(x=>x.so1&&x.so1<today&&x.pct!==null&&x.pct<100);const cur=prog.filter(x=>x.so0&&x.so0<=today&&(!x.so1||x.so1>=today));const dated=prog.filter(x=>x.so0||x.so1).length;
    R.phas={k:!ph.length?(soud>0?'bad':'off'):late.length?'bad':(exe.length&&!dated?'warn':'ok'),v:ph.length?ph.length+' phase'+(ph.length>1?'s':'')+(cur.length?' · en cours : '+cur.map(x=>(x.p.name||'phase')+(x.pct!==null?' '+x.pct+' % soudé':'')).join(', '):''):'phasage non renseigné',
      s:!ph.length?'pas de dates : impossible de mesurer le retard':late.length?late.length+' phase'+(late.length>1?'s':'')+' en retard sur la soudure : '+late.map(x=>(x.p.name||'phase')+' '+x.pct+' %').join(', '):(exe.length&&!dated?'phases sans dates de soudure : impossible de dire si c\'est à jour':''),n:!ph.length?1:late.length};}
  const sk=net.stock||{};const livs=Array.isArray(sk.livs)?sk.livs:[];const prev=livs.filter(l=>l&&l.status!=='ok');const sansBL=prev.filter(l=>!l.bl&&!(l.prevu&&l.prevu.length));
  const takes=Array.isArray(sk.takes)?sk.takes:[];const tkSem=takes.filter(t=>js.includes(String(t.at||'').slice(0,10))).length;const noTake=charge&&sem>0&&(sk.lots||[]).length>0&&tkSem<sem; /* 12/10 (Ethan) : les gars disent-ils dans quel stock ils ont pris ? */
  R.stock={k:sansBL.length?'bad':(noTake||prev.length)?'warn':'ok',v:(Array.isArray(sk.zones)?sk.zones.length:0)+' zone'+((sk.zones||[]).length>1?'s':'')+' · '+livs.length+' livraison'+(livs.length>1?'s':'')+(prev.length?' · '+prev.length+' attendue'+(prev.length>1?'s':''):'')+(charge&&(sk.lots||[]).length?' · prélèvements : '+tkSem+' pour '+sem+' soudure'+(sem>1?'s':'')+' cette semaine':''),s:sansBL.length?'livraison prévue sans BL importé : réception impossible à pointer':noTake?'des soudures pointées sans prélèvement déclaré au stock':prev.length?'à pointer à l\'arrivée du camion':'',n:prev.length+(noTake?1:0)};
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
const missionsFor=(me,day)=>{const out=[];planDe(me.id,day).forEach(id=>{const net=netOf(id);missionsOf(net,day).forEach(m=>{if(espaceMissionFor(m,me.id,id,day))out.push(Object.assign({site:id,siteNom:site(id).nom},m));});});return out;};
const hTxt=h=>{h=+h||0;const H=Math.floor(h),m=Math.round((h-H)*60);return m?H+' h '+String(m).padStart(2,'0'):H+' h';};
function missionsTxt(ms){if(!ms.length)return '';const h=ms.reduce((a,m)=>a+(+m.h||0),0);return ms.length+' mission'+(ms.length>1?'s':'')+' · '+hTxt(h)+' estimées';}
/* ── GRANDS DÉPLACEMENTS (livret SCR § 2.7) : distance domicile (ville de l'adresse RH) → chantier (coordonnées ou ville), 4 cas, semaine type ── */
function gdOf(p,siteId){const c=site(siteId);if(!p||!p.adresse||!p.adresse.ville)return {ok:false,why:'adresse du domicile inconnue (fiche RH)'};const k=addrKey(p.adresse);const home=GEOCODE[k];const sll=c.ll||(c.ville?GEOCODE[String(c.ville).trim().toLowerCase()]:null);
  if(home===undefined||(!c.ll&&c.ville&&sll===undefined)){gdEnsure([home===undefined?{adr:p.adresse}:null,(!c.ll&&c.ville&&sll===undefined)?c.ville:null].filter(Boolean));const tk=home===undefined?addrKey(p.adresse):String(c.ville||'').trim().toLowerCase();return {ok:false,why:navigator.onLine===false?'localisation impossible hors connexion':GD_TRIED[tk]&&Date.now()-GD_TRIED[tk]>8000?'localisation impossible pour l\'instant (service de géocodage injoignable) — réessai automatique dans 10 min':'localisation en cours…'};}
  if(!home||!sll)return {ok:false,why:!home?'ville du domicile introuvable ('+(p.adresse.cp?p.adresse.cp+' ':'')+p.adresse.ville+') — vérifie le code postal et la ville dans la fiche':'chantier sans ville ni calage'};
  const kmVol=distLL(home[0],home[1],sll[0],sll[1])/1000;const cas=gdCase(kmVol);return {ok:true,km:kmRoute(kmVol),min:minutesRoute(kmVol),cas};}
let gdT=null;const GD_TRIED={};const GD_Q=[]; /* villes déjà tentées (échec réseau) : on réessaie au plus toutes les 10 min, jamais de boucle de rendu hors connexion */
/* 13/10 (corrigé — une des causes de « plusieurs adresses ne fonctionnent pas ») : chaque appel annulait le lot précédent (clearTimeout) alors que ses adresses étaient déjà
   marquées « tentées » → seules celles du DERNIER appel étaient cherchées, les autres restaient « localisation en cours… » 10 min. Désormais une file : tout est cherché, une fois. */
const gdKeyOf=v=>v&&v.adr?addrKey(v.adr):String(v||'').trim().toLowerCase();
function gdEnsure(items){const now=Date.now();items.forEach(v=>{const k=gdKeyOf(v);if(!k||(k in GEOCODE)||(GD_TRIED[k]&&now-GD_TRIED[k]<600e3)||GD_Q.some(q=>gdKeyOf(q)===k))return;GD_Q.push(v);});if(!GD_Q.length||gdT)return;
  gdT=setTimeout(async()=>{let got=0;try{while(GD_Q.length){const v=GD_Q.shift();const k=gdKeyOf(v);GD_TRIED[k]=Date.now();try{const r=v&&v.adr?await geocodeAddr(v.adr):await geocode(v);if((r!==null&&r!==undefined)||(k in GEOCODE))got++;}catch(e){}}}finally{gdT=null;}if(got&&ROOT&&document.contains(ROOT))render();},200);} /* 13/10 : adresse = code postal + ville (homonymes, villes en majuscules sans tirets) */
const gdMainOf=(p,js)=>{const jours=js.map(d=>planDe(p.id,d));const ids=[...new Set(jours.flat())];if(!ids.length)return null;return {jours,ids,main:ids.map(id=>({id,n:jours.filter(x=>x.includes(id)).length})).sort((a,b)=>b.n-a.n)[0].id};};
const gdxOf=(pid,wk)=>{const x=regGet('gdx',pid+'|'+wk);return x&&!x.deleted&&typeof x.detente==='boolean'?x:null;}; /* exception posée par l'encadrement : {detente:true|false, note} */
/* 12/10 : position dans le cycle de la personne = semaines consécutives AVANT celle-ci en déplacement du même cas (jusqu'à 8 en arrière) ; une détente prise remet à zéro */
/* 13/10 (corrigé) : rang = nombre L de semaines d'affilée AVANT celle-ci en déplacement du même cas, modulo le cycle (1re semaine = 0, la dernière du cycle = détente).
   Une exception « détente » à la semaine W-i relance le cycle après elle ((i-1) mod N) ; « pas de détente » la remet à 0 (i mod N).
   L'ancienne version s'arrêtait dès N semaines comptées : après le premier cycle, plus aucune détente. Départ au-delà de 26 semaines : rythme calé sur le calendrier. */
const GD_SCAN=26;const absWeek=md=>Math.round((D(md)-D('2024-01-01'))/(7*864e5));
function gdCycleIdx(p,week,casN){const N=GD_CYCLE[casN];if(!N)return 0;for(let i=1;i<=GD_SCAN;i++){const js=semaineDe((week||0)-i);const m=gdMainOf(p,js);if(!m)return (i-1)%N;const g=gdOf(p,m.main);if(!g.ok||g.cas.n!==casN)return (i-1)%N;const x=gdxOf(p.id,weekKey(js[0]));if(x&&x.detente===true)return (i-1)%N;if(x&&x.detente===false)return i%N;}return ((absWeek(semaineDe(week||0)[0])%N)+N)%N;}
/* 13/10 soir : jours TRAVAILLÉS (un férié ne l'est que s'il est planifié exprès ce jour-là) ; fin de semaine au domicile ; semaine suivante sans lui (congé) */
const gdPlanExpr=(p,d)=>!!(DATA.planning[p.id]&&Array.isArray(DATA.planning[p.id][d])&&DATA.planning[p.id][d].length);
const gdWorked=(p,js,jours)=>jours.map((x2,i)=>x2.length>0&&!(isFerie(js[i])&&!gdPlanExpr(p,js[i])));
function gdNextAway(p,week){const js=semaineDe((week||0)+1);if(gdMainOf(p,js))return false;const P=PLANNING[weekKey(js[0])];return !!(P&&P.aff&&Object.keys(P.aff).some(k=>k!==p.id&&Object.values(P.aff[k]||{}).some(v=>Array.isArray(v)&&v.length)));} /* la semaine suivante est planifiée pour les autres, pas pour lui : il rentre */
function gdEndsHome(p,week){const js=semaineDe(week||0);const m=gdMainOf(p,js);if(!m)return true;const g=gdOf(p,m.main);if(!g.ok||g.cas.n<3)return true;const N=GD_CYCLE[g.cas.n]||1;const x=gdxOf(p.id,weekKey(js[0]));
  const idx=x&&x.detente===true?N-1:x&&x.detente===false?0:gdCycleIdx(p,week,g.cas.n);if(x?x.detente===true:idx===N-1)return true;const w=gdWorked(p,js,m.jours);const wd=[1,2,3,4,5].filter((d,i)=>w[i]);return !wd.length||wd[wd.length-1]<4||gdNextAway(p,week);}
function gdWeekOf(p,week){const js=semaineDe(week||0);const m=gdMainOf(p,js);if(!m)return null;const {jours,ids,main}=m;const g=gdOf(p,main);const wk=weekKey(js[0]);const x=g.ok?gdxOf(p.id,wk):null;
  const N=g.ok?(GD_CYCLE[g.cas.n]||1):1;const idx=g.ok?(x&&x.detente===true?gdDetenteIdx(g.cas):x&&x.detente===false?0:gdCycleIdx(p,week,g.cas.n)):0;const worked=gdWorked(p,js,jours);let semaine=null;
  if(g.ok){const arrival=g.cas.n<3?true:gdEndsHome(p,(week||0)-1);let ret=g.cas.n<3?true:(x?x.detente===true:idx===N-1);let why=g.cas.n<3?'':(x&&x.detente===true?'exception':ret?'cycle':'');if(g.cas.n>=3&&!ret&&gdNextAway(p,week||0)){ret=true;why='absence';}
    semaine=gdSemaine(g.cas,idx,worked,{arrival,ret,retWhy:why});}
  return {ids,main,g,semaine,jours:worked,js,wk,x};}
const gdAddD=(d,n)=>{const x=D(d);x.setDate(x.getDate()+n);return x.getFullYear()+'-'+pad(x.getMonth()+1)+'-'+pad(x.getDate());};
const gdMonOf=d=>{const x=D(d);const wd=x.getDay();x.setDate(x.getDate()+(wd===0?1:1-wd));return x.getFullYear()+'-'+pad(x.getMonth()+1)+'-'+pad(x.getDate());}; /* lundi de la semaine GD d'un jour (le dimanche appartient à la semaine qui suit) */
const GD_JL=['dim.','lun.','mar.','mer.','jeu.','ven.','sam.'];
const gdRep=x=>(+x.L||0)+(+x.D||0)?'🍽'+((+x.L||0)+(+x.D||0)>1?'×2':x.L?' midi':' soir'):'';
function gdStrip(days){return `<div class="gd-strip">${days.map((x,i)=>`<span class="gd-sd${x.N||x.L||x.D?' on':''}"><b>${GD_JL[i]}</b><i>${x.N?'🌙':''}${gdRep(x)?'<br>'+gdRep(x):''}${x.ar?'<br>🚗½':''}</i></span>`).join('')}</div>`;}
function cDeplacement(me){const w=gdWeekOf(me,0);if(!w)return '';const c=site(w.main);
  if(!w.g.ok)return `<div class="card"><h3>🚗 Mon déplacement <span class="hint">· semaine ${numSemaine(w.js[0])}</span></h3><div class="eq-s">${esc(c.nom)} — ${esc(w.g.why)}</div></div>`;
  const cas=w.g.cas,s2=w.semaine;return `<div class="card"><h3>🚗 Mon déplacement <span class="hint">· semaine ${numSemaine(w.js[0])}</span></h3><div class="eq-big">${esc(c.nom)} · ~${w.g.km} km de chez toi <span class="hint">(~${w.g.min} min)</span></div>
    <div class="eq-s" style="margin-top:4px"><b>Cas ${cas.n} · ${esc(cas.label)}</b> — ${esc(cas.crit)}</div><div class="eq-s">${esc(cas.prise)}</div>
    ${s2&&s2.cycle>1?`<div class="eq-s" style="margin-top:4px">${s2.detente?(s2.retWhy==='absence'?'<b style="color:#15673a">🏠 Retour à la maison</b> (pas planifié la semaine suivante)':'<b style="color:#15673a">🏠 Semaine de détente</b> : retour '+(cas.n===4?'jeudi':'vendredi')+' après le repas du midi'):'Semaine <b>'+(s2.idx+1)+' / '+s2.cycle+'</b> du cycle — détente dans '+(s2.cycle-1-s2.idx)+' semaine'+(s2.cycle-1-s2.idx>1?'s':'')+' (semaine '+numSemaine(semaineDe(s2.cycle-1-s2.idx)[0])+')'}${w.x?' · <span class="eq-tag">réglé par l\'encadrement</span>':' · <span class="eq-tag ok">automatique</span>'}${(()=>{const a=gdAccOf(me.id,w.wk);return a?' · <span class="eq-tag ok">✓ accordé</span>':'';})()}</div>`:''}
    ${s2&&cas.n>1?`<div class="eq-tiles" style="margin-top:6px"><div class="eq-tile"><b>${s2.nuits}</b><span class="eq-s">nuitée${s2.nuits>1?'s':''}</span></div><div class="eq-tile"><b>${s2.repas}</b><span class="eq-s">repas</span></div><div class="eq-tile"><b>${s2.eur} €</b><span class="eq-s">indemnité trajet (${s2.ar} A/R)</span></div></div>${s2.days?gdStrip(s2.days):''}<div class="hint">sur ${s2.jours} jour${s2.jours>1?'s':''} planifié${s2.jours>1?'s':''} cette semaine — 4 ou 5 jours : même forfait (dimanche soir → vendredi midi) ; trajet payé quand tu rentres (détente) — indicatif, les RH font foi</div>`:''}
    <div class="hint" style="margin-top:4px">${GD_RAPPELS[0]} ${GD_RAPPELS[1]}</div></div>`;}
/* ── 12/10 « COMPOSER MA SEMAINE » (Ethan : « composer ma semaine pour un encadrant relié avec Outlook ? ») : agenda de l'encadrant — visites de chantier, réunions,
   rendez-vous — à côté de ses chantiers planifiés ; export .ics (Outlook / Google / iPhone l'ouvrent directement). Registre « agenda », id = <personne>|<id>.
   Une synchronisation Outlook dans les deux sens demande Microsoft Graph (compte Azure de SCR, IT) : pas dans l'appli pour l'instant — l'import .ics d'abord. */
const AG_TYPES=[['visite','🏗 Visite de chantier','#fdebe3'],['reunion','👥 Réunion','#e8f0fb'],['rdv','🤝 Rendez-vous (client, fournisseur)','#e6f5ec'],['bureau','🗂 Bureau / dossier','#efeafb'],['autre','📌 Autre','#ececea']];
const agAll=me=>regAll('agenda').filter(e=>e&&e.p===me.id&&!e.deleted);
const agWeek=(me,js)=>agAll(me).filter(e=>js.includes(e.d)).sort((a,b)=>(a.d+(a.h0||'')).localeCompare(b.d+(b.h0||'')));
function agSave(me,e){const id=e.id||Date.now().toString(36)+Math.random().toString(36).slice(2,5);const demo=!String(me.id).includes('@');regSet('agenda',me.id+'|'+id,Object.assign({p:me.id,by:nomC(me),at:new Date().toISOString()},e,{id}),demo?{local:true}:undefined);return id;}
function agIcs(me,js,opts){opts=opts||{};const esc2=t=>String(t||'').replace(/\\/g,'\\\\').replace(/;/g,'\;').replace(/,/g,'\\,').replace(/\n/g,'\\n');const dt=(d,h)=>d.replace(/-/g,'')+'T'+String(h||'08:00').replace(':','')+'00';const stamp=new Date().toISOString().replace(/[-:]/g,'').slice(0,15)+'Z';
  const L=['BEGIN:VCALENDAR','VERSION:2.0','PRODID:-//SCR//TRACE agenda//FR','CALSCALE:GREGORIAN','METHOD:PUBLISH','X-WR-CALNAME:TRACE · semaine '+numSemaine(js[0])];
  agWeek(me,js).filter(e=>!opts.only||e.id===opts.only).forEach(e=>{const c=e.site?site(e.site):null;const t=(AG_TYPES.find(x=>x[0]===e.type)||AG_TYPES[4])[1].replace(/^\S+\s/,'');L.push('BEGIN:VEVENT','UID:'+e.id+'@trace.scr','DTSTAMP:'+stamp,'DTSTART:'+dt(e.d,e.h0),'DTEND:'+dt(e.d,e.h1||e.h0),'SUMMARY:'+esc2((e.title||t)+(c?' — '+c.nom:'')),c?'LOCATION:'+esc2(c.nom+(c.ville?', '+c.ville:'')):'','DESCRIPTION:'+esc2(t+(e.note?'\n'+e.note:'')+'\nTRACE · SCR'),'END:VEVENT');});
  if(!opts.only)js.forEach(d=>planDe(me.id,d).forEach(id=>{const c=site(id);if(c.bureau)return;L.push('BEGIN:VEVENT','UID:plan-'+d+'-'+id+'-'+me.id+'@trace.scr','DTSTAMP:'+stamp,'DTSTART;VALUE=DATE:'+d.replace(/-/g,''),'DTEND;VALUE=DATE:'+(()=>{const x=D(d);x.setDate(x.getDate()+1);return x.toISOString().slice(0,10).replace(/-/g,'');})(),'SUMMARY:'+esc2('Chantier '+c.nom),c.ville?'LOCATION:'+esc2(c.ville):'','TRANSP:TRANSPARENT','END:VEVENT');}));
  L.push('END:VCALENDAR');return L.filter(Boolean).join('\r\n')+'\r\n';}
/* 12/10 soir (Ethan) : « la hiérarchie a une vue dessus : le n+1 voit les plannings perso de tous ceux en dessous de lui ; la gérance tous ses encadrants, la direction pareil sauf entre eux ».
   Rang par poste ; on voit la semaine de toute personne de rang strictement inférieur (admin : tout le monde). */
const AG_RANK={gerant:6,dir_adjointe:5,dir_technique:5,resp_operations:4,resp_exploitation:4,conducteur:3,chef:2,resp_rh:3,resp_admin_fin:3,resp_commercial:3,charge_affaires:2,resp_flotte:2};
const agRank=p=>AG_RANK[p.poste]||1;
function agPeopleBelow(me){const r=me.admin?99:agRank(me);if(r<=1)return [];return DATA.personnes.filter(p=>p.active&&p.id!==me.id&&p.poste!=='visiteur'&&agRank(p)<r).sort((a,b)=>agRank(b)-agRank(a)||nomC(a).localeCompare(nomC(b),'fr'));}
/* Import d'un calendrier Outlook (.ics exporté : Calendrier → Fichier → Enregistrer le calendrier) : les invitations et réunions remplissent la semaine ; dédoublonné par UID */
function agParseIcs(txt){const L=String(txt||'').replace(/\r\n?/g,'\n').replace(/\n[ \t]/g,'').split('\n');const ev=[];let cur=null;const un=v=>String(v||'').replace(/\\n/g,' ').replace(/\\,/g,',').replace(/\;/g,';').replace(/\\\\/g,'\\').trim();
  const dt=v=>{const m=/^(\d{4})(\d{2})(\d{2})(?:T(\d{2})(\d{2})(\d{2})?(Z)?)?$/.exec(String(v||'').trim());if(!m)return null;if(m[7]){const d=new Date(Date.UTC(+m[1],+m[2]-1,+m[3],+m[4],+m[5],+(m[6]||0)));return {d:d.getFullYear()+'-'+pad(d.getMonth()+1)+'-'+pad(d.getDate()),h:m[4]!==undefined?pad(d.getHours())+':'+pad(d.getMinutes()):null};}return {d:m[1]+'-'+m[2]+'-'+m[3],h:m[4]!==undefined?m[4]+':'+m[5]:null};};
  L.forEach(line=>{if(line==='BEGIN:VEVENT'){cur={};return;}if(line==='END:VEVENT'){if(cur&&cur.start)ev.push(cur);cur=null;return;}if(!cur)return;const i=line.indexOf(':');if(i<0)return;const key=line.slice(0,i).split(';')[0].toUpperCase(),val=line.slice(i+1);
    if(key==='UID')cur.uid=val.trim();else if(key==='SUMMARY')cur.title=un(val);else if(key==='LOCATION')cur.loc=un(val);else if(key==='DESCRIPTION')cur.note=un(val).slice(0,200);else if(key==='DTSTART')cur.start=dt(val);else if(key==='DTEND')cur.end=dt(val);else if(key==='STATUS')cur.status=val.trim();});
  return ev.filter(e=>e.status!=='CANCELLED');}
function agImportIcs(me,txt){const ev=agParseIcs(txt);if(!ev.length)return {n:0,err:'aucun rendez-vous lisible dans ce fichier (.ics attendu)'};const mine=agAll(me);let n=0,upd=0;const today=todayIso();const lim=(()=>{const d=D(today);d.setDate(d.getDate()+70);return d.toISOString().slice(0,10);})();
  ev.forEach(e=>{const d0=e.start.d;if(d0<semaineDe(-1)[0]||d0>lim)return; /* de la semaine passée à +10 semaines */
    const site=(e.loc||e.title)?(DATA.chantiers.find(c=>!c.bureau&&[e.loc,e.title].some(t=>t&&(norm(t).includes(norm(c.nom))||(c.ville&&norm(t).includes(norm(c.ville))))))||null):null;
    const type=/visite|chantier/i.test(e.title||'')||site?'visite':/r[ée]union|point|comit|revue|réu/i.test(e.title||'')?'reunion':/rdv|rendez|client|fournisseur|logstor|renalia|isoplus/i.test(e.title||'')?'rdv':'reunion';
    const base={d:d0,h0:e.start.h||'',h1:e.end&&e.end.d===d0?(e.end.h||''):'',type,site:site?site.id:null,title:e.title||'',note:(e.loc&&!site?e.loc+(e.note?' · ':''):'')+(e.note||''),src:'outlook',uid:e.uid||''};
    const old=e.uid?mine.find(x=>x.uid===e.uid):null;if(old){agSave(me,Object.assign({},base,{id:old.id}));upd++;}else{agSave(me,base);n++;}});
  return {n,upd};}
const dhFR2=at=>{const d=new Date(at);return isNaN(d)?'':d.toLocaleDateString('fr-FR')+' '+String(d.getHours())+' h '+String(d.getMinutes()).padStart(2,'0');};
/* 12/10 soir (validé par Ethan) : synchro Outlook côté serveur — Edge Function « outlook-sync » (supabase/functions/outlook-sync) : lit le lien ICS publié (people.outlook.ics), écrit les lignes « agenda » de la personne */
let agSyncBusy=false;
async function agSync(me,silent){if(agSyncBusy)return;const ol=(PEOPLE[me.id]||{}).outlook||{};if(!ol.ics||!A.state.cloudUser||!A.sync.invokeFn)return;agSyncBusy=true;if(!silent)msg('⟳ Lecture de ton calendrier Outlook…');
  try{const r=await A.sync.invokeFn('outlook-sync',{});if(r.ok){await regReload('agenda');const x=PEOPLE[me.id]||(PEOPLE[me.id]={});x.outlook=Object.assign({},x.outlook,{lastAt:new Date().toISOString(),last:{n:r.n||0,upd:r.upd||0,total:r.total||0}});kvSet('trace:people',PEOPLE);render();if(!silent)msg('✓ Outlook synchronisé : '+(r.n||0)+' nouveau'+((r.n||0)>1?'x':'')+' · '+(r.upd||0)+' mis à jour'+(r.total!==undefined?' · '+r.total+' rendez-vous lus':''));}
    else{if(!silent)msg(r.missing?'La fonction serveur « outlook-sync » n\'est pas déployée (voir app/supabase/functions/outlook-sync)':'Synchro impossible : '+(r.error||''));}}catch(e){console.warn(e);if(!silent)msg('Synchro impossible');}
  agSyncBusy=false;}
function agAutoSync(me){const ol=(PEOPLE[me.id]||{}).outlook||{};if(!ol.ics)return;const last=Date.parse(ol.lastAt||'')||0;if(Date.now()-last<2*3600e3)return;agSync(me,true);}
/* ── 13/10 (Ethan : « un meilleur menu pour se déplacer de semaine en semaine, plus moderne ») : NAVIGATEUR DE SEMAINE partagé (Ma semaine, Production par équipe, Planning) —
   ‹ Semaine 41 · 5 – 9 oct. 2026 · cette semaine › ; pastilles des 5 jours (aujourd'hui en orange, points = ce qu'il y a ce jour-là, touche = aller au jour) ; « ↺ Cette semaine » dès qu'on s'éloigne ;
   glisser vers la gauche / la droite sur le navigateur ou sur les cartes des jours = semaine suivante / précédente (touchstart / touchend dans initEspace). Mêmes actions data-act=<act> data-v=<k> qu'avant. ── */
const MOIS_C=['janv.','févr.','mars','avr.','mai','juin','juil.','août','sept.','oct.','nov.','déc.'];
function weekNav(o){const k=o.k||0,js=o.js,act=o.act,today=todayIso();const d0=D(js[0]),d4=D(js[js.length-1]);
  const range=d0.getMonth()===d4.getMonth()?`${d0.getDate()} – ${d4.getDate()} ${MOIS_C[d4.getMonth()]} ${d4.getFullYear()}`:`${d0.getDate()} ${MOIS_C[d0.getMonth()]} – ${d4.getDate()} ${MOIS_C[d4.getMonth()]} ${d4.getFullYear()}`;
  const rel=k===0?'cette semaine':k===-1?'semaine passée':k===1?'semaine prochaine':k<0?`il y a ${-k} semaines`:`dans ${k} semaines`;const marks=o.marks||(()=>0);const JN=['lun.','mar.','mer.','jeu.','ven.','sam.','dim.'];
  return `<div class="eq-wknav eq-wkswipe" data-wknav="${act}" data-k="${k}"><div class="eq-wkhead"><button class="eq-wkbtn" data-act="${act}" data-v="${k-1}" aria-label="Semaine précédente" title="Semaine précédente">‹</button><div class="eq-wktitle"><b>Semaine ${numSemaine(js[0])}</b><span>${range} · ${rel}</span></div><button class="eq-wkbtn" data-act="${act}" data-v="${k+1}" aria-label="Semaine suivante" title="Semaine suivante">›</button></div>
    <div class="eq-wkdays">${js.map((d,i)=>{const n=+marks(d)||0;const isT=d===today;return `<button class="eq-wkday${isT?' today':''}${d<today?' past':''}${o.day===d?' sel':''}"${o.dayAct?` data-act="${o.dayAct}" data-v="${d}"`:' disabled'} title="${esc(fJourLong(d))}${n?' · '+n:''}"><i>${JN[i]||''}</i><b>${+d.slice(8,10)}</b><em>${n>3?`<u>${n}</u>`:Array.from({length:n}).map(()=>'<s></s>').join('')}</em></button>`;}).join('')}</div>
    ${k!==0?`<div class="eq-wkfoot"><button class="chip" data-act="${act}" data-v="0">↺ Cette semaine</button></div>`:''}</div>`;}
function vAgenda(me){const k=S.agWeek||0,js=semaineDe(k),wk=weekKey(js[0]);ensureWeeks([wk]);const below=agPeopleBelow(me);const who=S.agWho&&below.find(p=>p.id===S.agWho)?pers(S.agWho):null;const own=!who;const me0=me;me=who||me; /* 12/10 : la hiérarchie regarde la semaine de ceux en dessous (lecture seule) */const E=agWeek(me,js);const nw=own?S.agNew:null;const mine=mesSites(me);const sect=mySecteur(me);
  const visited=new Set(E.filter(e=>e.type==='visite'&&e.site).map(e=>e.site));const aVisiter=mine.filter(c=>!visited.has(c.id)); /* mes chantiers sans visite cette semaine */
  const ligne=e=>{const T=AG_TYPES.find(x=>x[0]===e.type)||AG_TYPES[4];const c=e.site?site(e.site):null;return `<div class="eq-ag" style="border-left-color:${T[2]}"><span class="eq-agh">${e.h0?esc(e.h0.replace(/^0/,'').replace(':',' h '))+(e.h1?' – '+esc(e.h1.replace(/^0/,'').replace(':',' h ')):''):'journée'}</span><span class="eq-grow"><b>${esc(e.title||T[1].replace(/^\S+\s/,''))}</b>${e.src==='outlook'?' <span class="eq-tag" title="Importé d\'Outlook">Outlook</span>':''}${c?` <span class="eq-s">· ${esc(c.nom)}${c.ville?' · '+esc(c.ville):''}</span>`:''}${e.note?`<div class="eq-s">${esc(e.note)}</div>`:''}</span><span class="eq-agx">${c?`<button class="btn sm" data-act="opensite" data-v="${esc(c.id)}|bureau" title="Ouvrir le chantier">›</button>`:''}${own&&e.src!=='outlook'?`<button class="btn sm" data-act="agics1" data-v="${esc(e.id)}" title="Ajouter ce rendez-vous à Outlook (fichier .ics)">→ Outlook</button>`:''}${own?`<button class="btn sm" data-act="agrm" data-v="${esc(e.id)}" title="Retirer" style="color:#9b2c22">✕</button>`:''}</span></div>`;};
  const form=d=>`<div class="card eq-agform" id="ag-form"><div class="eq-2sel"><div><label class="f" style="margin-top:0">Quoi</label><select class="f" id="ag-type">${AG_TYPES.map(([v,t])=>`<option value="${v}"${(nw.type||'visite')===v?' selected':''}>${t}</option>`).join('')}</select></div><div><label class="f" style="margin-top:0">Chantier <span class="dim">(option)</span></label><select class="f" id="ag-site"><option value="">—</option>${DATA.chantiers.filter(c=>!c.bureau&&(!sect||!c.secteur||c.secteur===sect||mine.includes(c))).map(c=>`<option value="${esc(c.id)}"${nw.site===c.id?' selected':''}>${esc(c.nom)}${c.ville?' · '+esc(c.ville):''}</option>`).join('')}</select></div></div>
    <label class="f">Titre <span class="dim">(option)</span></label><input class="f" id="ag-title" value="${esc(nw.title||'')}" placeholder="ex. Réunion de chantier, point hebdo, RDV Logstor…" autocomplete="off">
    <div class="eq-2sel"><div><label class="f">Début</label><input class="f" id="ag-h0" type="time" value="${esc(nw.h0||'09:00')}"></div><div><label class="f">Fin</label><input class="f" id="ag-h1" type="time" value="${esc(nw.h1||'10:00')}"></div></div>
    <label class="f">Note <span class="dim">(option)</span></label><input class="f" id="ag-note" value="${esc(nw.note||'')}" placeholder="qui, quoi, à préparer…" autocomplete="off">
    <div class="eq-acts" style="margin:8px 0 0"><button class="btn primary" data-act="agok" data-v="${d}">Ajouter ${fJour(d)}</button><button class="btn" data-act="agx">Annuler</button></div></div>`;
  return `<h2 class="vt">${own?'Ma semaine':'Semaine de '+esc(nomC(me))} <span class="hint">· semaine ${numSemaine(js[0])} · du ${fDate(js[0]).slice(0,5)} au ${fDate(js[4])}${own?'':' · '+esc(poste(me).label)+' · lecture seule'}</span></h2>
    ${below.length?`<div class="card" style="padding:8px 12px"><label class="f" style="margin-top:0">👥 La semaine de <span class="dim">(ceux qui dépendent de toi)</span></label><select class="f" data-chg="agWho"><option value=""${own?' selected':''}>Moi — ${esc(nomC(me0))}</option>${below.map(p=>`<option value="${esc(p.id)}"${S.agWho===p.id?' selected':''}>${esc(nomC(p))} — ${esc(poste(p).label)}${agWeek(p,js).length?' · '+agWeek(p,js).length:''}</option>`).join('')}</select></div>`:''}
    ${weekNav({k,js,act:'agweek',dayAct:'agday',marks:d=>E.filter(e=>e.d===d).length+planDe(me.id,d).filter(id=>!site(id).bureau).length})}
    ${own?(()=>{const ol=(PEOPLE[me.id]||{}).outlook||{};const linked=!!ol.ics;return `<div class="card"><h3>🔗 Relié à Outlook <span class="hint">· ${linked?'calendrier publié · dernière synchro : '+(ol.lastAt?dhFR2(ol.lastAt):'jamais'):'pas encore'}</span></h3>
      ${linked?`<div class="eq-acts"><button class="btn primary" data-act="agsync">⟳ Synchroniser maintenant</button><button class="btn" data-act="aglink">Changer le lien</button><button class="btn" data-act="agunlink" style="color:#9b2c22">Délier</button></div><div class="hint" style="margin-top:6px">Le serveur lit ton calendrier publié (sans fichier) et remplit ta semaine : réunions, invitations, rendez-vous. Synchro automatique à l'ouverture de cette page (au plus toutes les 2 h) et sur le bouton.</div>`:`<div class="hint">Dans Outlook sur le web : ⚙ Paramètres → Calendrier → <b>Calendriers partagés</b> → <b>Publier un calendrier</b> → ton calendrier, « Peut afficher tous les détails » → Publier → copie le lien <b>ICS</b>. Colle-le ici : le serveur le lit et remplit ta semaine, sans fichier.</div><div class="eq-acts" style="margin-top:6px"><button class="btn primary" data-act="aglink">🔗 Coller mon lien de calendrier</button></div>`}</div>`;})():''}
    ${own?(()=>{const linked=!!((PEOPLE[me.id]||{}).outlook||{}).ics;return `<div class="card"><div class="eq-acts">${linked?'':`<label class="btn">⬆ Importer un fichier Outlook (.ics)<input type="file" accept=".ics,text/calendar" data-agimport style="display:none"></label>`}<button class="btn" data-act="agics" data-v="${k}" ${E.length||js.some(d=>planDe(me.id,d).length)?'':'disabled'}>⬇ Exporter la semaine vers Outlook (.ics)</button>${aVisiter.length?`<span class="eq-s">${aVisiter.length} de tes chantiers sans visite cette semaine : ${aVisiter.map(c=>esc(c.nom)).join(', ')}</span>`:mine.length?'<span class="eq-s">✓ Une visite prévue sur chacun de tes chantiers.</span>':''}</div>
      <div class="hint" style="margin-top:6px">${linked?`<b>Outlook → TRACÉ</b> : automatique (lien ci-dessus). <b>TRACÉ → Outlook</b> : ce que tu ajoutes ici avec ＋ reste dans ta semaine à côté des rendez-vous Outlook ; pour l'avoir aussi dans Outlook, « → Outlook » sur la ligne (un fichier .ics par rendez-vous : double-clic → Enregistrer et fermer) ou « Exporter la semaine ».`:`<b>Importer un fichier</b> (sans lien publié) : dans Outlook, Calendrier → Fichier → Enregistrer le calendrier → le .ics ici — dédoublonné, réimport possible. <b>Exporter</b> : le .ics s'ouvre dans Outlook, Google Agenda ou l'iPhone.`}</div></div>`;})():''}
    <div class="eq-agdays eq-wkzone">${js.map(d=>{const Ej=E.filter(e=>e.d===d);const sites=planDe(me.id,d).filter(id=>!site(id).bureau);const today=d===todayIso();return `<div class="card eq-agday${today?' today':''}" id="ag-d-${d}"><div class="eq-plhead"><span class="eq-grow"><span class="eq-big">${esc(fJourLong(d))}</span>${sites.length?`<span class="eq-s">📍 ${sites.map(id=>esc(site(id).nom)).join(' · ')}</span>`:''}</span>${!own||(nw&&nw.d===d)?'':`<button class="btn sm" data-act="agnew" data-v="${d}">＋</button>`}</div>
      ${Ej.map(ligne).join('')||(nw&&nw.d===d?'':'<div class="eq-s eq-plvide">'+(own?'Rien de prévu — ＋ pour ajouter':'Rien de prévu')+'</div>')}${nw&&nw.d===d?form(d):''}</div>`;}).join('')}</div>`;}
/* ── 12/10 soir : COMMERCE (onglet) ── */
function vCommerce(me){const sub=vSub(me);if(sub!==null)return sub;if(!can(me,'affaires.view'))return `<h2 class="vt">Commerce</h2><div class="card"><div class="eq-s">Pas d'accès aux affaires (droit « Affaires » du poste).</div></div>`;return affView(me,affCtx(me));}
/* ── 12/10 soir : PARC (onglet) — flotte, magasin, matériel ── */
function vParc(me){const sub=vSub(me);if(sub!==null)return sub;const seg=S.parcSeg||'flotte';const bar=`<div class="eq-filtres">${[['flotte','🚐 Flotte'],['magasin','📦 Magasin'],['materiel','🔧 Matériel']].map(([k,t])=>`<button class="chip${seg===k?' active':''}" data-act="parcseg" data-v="${k}">${t}</button>`).join('')}</div>`;
  if(seg==='flotte')return (can(me,'flotte.manage')?bar+flotteView(flCtx(me)):`<h2 class="vt">Parc</h2>`+bar+`<div class="card"><div class="eq-s">Pas d'accès à la flotte (droit « Flotte » du poste). Ton véhicule est dans Moi.</div></div>`);
  if(seg==='magasin')return `<h2 class="vt">Magasin <span class="hint">· à cadrer</span></h2>`+bar+`<div class="card"><h3>Pas encore là</h3><div class="eq-s">Le magasin (références, quantités, sorties vers les chantiers, retours, inventaire) se cadre avec le référent magasin avant de coder : ce qu'il tient aujourd'hui (Excel ?), ce qui sort le plus, qui sert. Le stock d'un chantier (livraisons, prélèvements) est déjà dans le chantier → Technique → Stock.</div></div>`;
  return `<h2 class="vt">Matériel <span class="hint">· à cadrer</span></h2>`+bar+`<div class="card"><h3>Pas encore là</h3><div class="eq-s">Matériel (postes à souder, groupes, outillage, engins) : affectation à une équipe / un chantier, contrôles périodiques, entretien, pannes — même logique que la flotte. À cadrer avec toi : la liste du matériel et ce qu'on veut suivre.</div></div>`;}
/* ── 12/10 soir : DÉCLARER UN ACCIDENT (v1 — champs à confirmer avec la RH) — registre « accident » ── */
const ACC_TYPES=[['accident','🚑 Accident du travail'],['presque','⚠ Presque-accident'],['soin','🩹 Soin bénin / premiers secours'],['trajet','🚗 Accident de trajet']];
const accidentsAll=()=>regAll('accident').filter(x=>x&&x.d).sort((a,b)=>String(b.d+(b.h||'')).localeCompare(String(a.d+(a.h||''))));
export const espaceAccidentsTodo=()=>accidentsAll().filter(x=>x.status!=='traite');
function vAccidents(me){const L=accidentsAll();const q=can(me,'qse.manage')||accueilType(me)==='rh'||accueilType(me)==='direction'||me.admin;const mine=L.filter(x=>q||x.byKey===me.id||(x.who||[]).includes(me.id));
  const row=x=>{const T=ACC_TYPES.find(t=>t[0]===x.type)||ACC_TYPES[0];const c=x.site?site(x.site):null;return `<div class="card" style="${x.status==='traite'?'':'border-color:#e9a1a1'}"><div class="ac-h"><b>${T[1]} · ${esc(fJour(x.d))}${x.h?' · '+esc(x.h):''}</b><span>${x.status==='traite'?'✓ traité par '+esc(x.traitePar||'')+' le '+fDate(String(x.traiteAt||'').slice(0,10)):'<b style="color:#9b2c22">à traiter</b>'}</span></div>
      <div class="eq-s"><b>${esc(x.names||'')}</b>${c?' · 📍 '+esc(c.nom):''}${x.lieu?' · '+esc(x.lieu):''}${x.arret?' · arrêt : '+esc(x.arret):''}</div><div class="eq-s" style="margin-top:4px">${esc(x.circonstances||'')}</div>${x.lesion?`<div class="eq-s">Lésion : ${esc(x.lesion)}</div>`:''}${x.soins?`<div class="eq-s">Soins / secours : ${esc(x.soins)}</div>`:''}${x.temoins?`<div class="eq-s">Témoins : ${esc(x.temoins)}</div>`:''}
      ${(x.photos||[]).length?`<div class="fl-phs">${x.photos.map(u=>`<a href="${esc(u)}" target="_blank" rel="noopener"><img src="${esc(u)}"></a>`).join('')}</div>`:''}<div class="eq-s" style="margin-top:4px">Déclaré par ${esc(x.by||'')} le ${fDate(String(x.at||'').slice(0,10))}${x.via?' (via '+esc(x.via)+')':''}</div>
      ${q&&x.status!=='traite'?`<div class="eq-acts" style="margin-top:6px"><button class="btn primary" data-act="acctraite" data-v="${esc(x.id)}">✓ Traité (déclaration faite, dossier suivi)</button></div>`:''}</div>`;};
  return `<h2 class="vt">Accidents <span class="hint">· déclarations · ${mine.filter(x=>x.status!=='traite').length} à traiter</span></h2>
    <div class="card"><div class="eq-acts"><button class="btn primary" data-act="accnew">⚠ Déclarer un accident / presque-accident</button></div><div class="hint" style="margin-top:6px">Version 1 : qui, quoi, où, quand, circonstances, lésion, soins, témoins, arrêt, photos — la RH est prévenue (notification) et marque « traité » quand la déclaration CPAM / le dossier est fait. Les champs exacts se calent avec la RH (ce qu'il lui faut pour la déclaration en 48 h).</div></div>
    ${mine.map(row).join('')||'<div class="ac-empty">Aucune déclaration.</div>'}`;}
function accidentForm(me){const sites=DATA.chantiers.filter(c=>!c.bureau);const today=todayIso();const now=DATA.now;
  A.openModal(`<h3 style="margin-top:0">Déclarer un accident</h3><div class="hint" style="margin:0 0 6px">Fais-le tout de suite, même incomplet : la RH complète. Un presque-accident se déclare aussi — c'est ce qui évite le suivant.</div>
    <label class="f">Quoi</label><select class="f" id="ac-type">${ACC_TYPES.map(([k,l])=>`<option value="${k}">${l}</option>`).join('')}</select>
    <div class="eq-2sel"><div><label class="f">Date</label><input class="f" id="ac-d" type="date" value="${today}"></div><div><label class="f">Heure</label><input class="f" id="ac-h" type="time" value="${now}"></div></div>
    <div class="eq-2sel"><div><label class="f">Chantier</label><select class="f" id="ac-site"><option value="">— hors chantier —</option>${sites.map(c=>`<option value="${esc(c.id)}"${planDe(me.id,today).includes(c.id)?' selected':''}>${esc(c.nom)}</option>`).join('')}</select></div><div><label class="f">Lieu précis</label><input class="f" id="ac-lieu" placeholder="fouille, base vie, route…"></div></div>
    <label class="f">Personne(s) concernée(s)</label><input class="f" id="ac-names" value="${esc(nomC(me))}" placeholder="prénom nom, …"><div class="eq-opts" style="margin:4px 0 0">${DATA.personnes.filter(p=>p.active&&p.id!==me.id&&planDe(p.id,today).length).slice(0,12).map(p=>`<button type="button" class="chip" data-acname="${esc(nomC(p))}">${esc(p.prenom)}</button>`).join('')}</div>
    <label class="f">Circonstances <span class="dim">(ce qui s'est passé, avec quoi)</span></label><textarea class="f" id="ac-circ" style="min-height:64px" placeholder="ex. en descendant de la pelle, glissade sur le marchepied mouillé…"></textarea>
    <div class="eq-2sel"><div><label class="f">Lésion / partie du corps</label><input class="f" id="ac-lesion" placeholder="cheville droite, coupure main…"></div><div><label class="f">Arrêt de travail</label><select class="f" id="ac-arret"><option value="">on ne sait pas</option><option>non</option><option>oui</option></select></div></div>
    <label class="f">Soins / secours <span class="dim">(premiers soins, pompiers, médecin…)</span></label><input class="f" id="ac-soins"><label class="f">Témoins</label><input class="f" id="ac-temoins" placeholder="prénom nom, …">
    <label class="btn" style="margin-top:6px">📷 Photos <span class="dim">(lieu, matériel — pas de la personne)</span><input type="file" id="ac-ph" accept="image/*" capture="environment" multiple style="display:none"></label><div id="ac-phs" class="fl-phs"></div>
    <div class="actions" style="margin-top:8px"><button class="btn primary block" id="ac-ok">Déclarer — la RH est prévenue</button><button class="btn block" data-close>Annuler</button></div>`);
  const PH=[];document.querySelectorAll('#modal [data-acname]').forEach(b=>b.onclick=()=>{const i=document.getElementById('ac-names');const n=b.dataset.acname;if(!i.value.includes(n))i.value=(i.value?i.value+', ':'')+n;});
  const ph=document.getElementById('ac-ph');if(ph)ph.onchange=async()=>{for(const f of [...ph.files].slice(0,4)){let d=null;try{d=A.compressPhoto?await A.compressPhoto(f,1200,.72):null;}catch(e){d=null;}if(!d)continue;let u=null;try{u=A.uploadPhoto?await A.uploadPhoto('accident',d):null;}catch(e){u=null;}PH.push(u||d);}ph.value='';document.getElementById('ac-phs').innerHTML=PH.map(u=>`<img src="${u}" style="height:48px;border-radius:6px">`).join('');};
  document.getElementById('ac-ok').onclick=()=>{const g=k=>{const i=document.getElementById('ac-'+k);return i?String(i.value||'').trim():'';};if(!g('circ')){A.toast('Dis ce qui s\'est passé (une ligne suffit)');return;}
    const id=Date.now().toString(36)+Math.random().toString(36).slice(2,5);const demo=!String(me.id).includes('@');const who=DATA.personnes.filter(p=>g('names').split(/\s*,\s*/).some(n=>n&&norm(n)===norm(nomC(p)))).map(p=>p.id);
    regSet('accident',id,{type:g('type'),d:g('d')||today,h:g('h'),site:g('site')||null,lieu:g('lieu'),names:g('names'),who,circonstances:g('circ'),lesion:g('lesion'),arret:g('arret'),soins:g('soins'),temoins:g('temoins'),photos:PH.slice(),by:nomC(me),byKey:me.id,via:A.via&&A.via()?A.via():undefined,at:new Date().toISOString(),status:'declare'},demo?{local:true}:undefined);
    A.closeModal();render();msg('⚠ Déclaration enregistrée — la RH et la direction sont prévenues');};}
/* ── 12/10 soir : COMMUNICATION INTERNE (infos publiées, sans signature) et PRÉSENTATION DE L'ENTREPRISE ── */
function vInfos(me){const L=docsAll().filter(d=>d.kind==='info');const pub=can(me,'qse.manage')||accueilType(me)==='rh'||accueilType(me)==='direction'||me.admin;
  return `${pub?`<div class="card"><div class="eq-acts"><button class="btn primary" data-act="infonew">📣 Publier une info</button></div><div class="hint" style="margin-top:6px">Une info se lit, elle ne se signe pas : actualités, résultats, événements, arrivées. Pour ce qui doit être signé (note de service, flash info), passe par Documents d'entreprise.</div></div>`:''}
    ${L.map(d=>`<button class="ac-row" data-act="docopen" data-v="${esc(d.id)}"><span class="ic" style="background:#e3f3f3">📣</span><span class="tx"><b>${esc(d.title)}</b><small>${esc(d.by||'')} · ${fDate(String(d.at||'').slice(0,10))}${d.file?' · PDF':''}</small></span><span class="chev">${CHEV}</span></button>`).join('')||'<div class="ac-empty">Rien de publié pour l\'instant.</div>'}`;}
function vPresentation(me){const d=docById('presentation');const edit=accueilType(me)==='rh'||accueilType(me)==='direction'||me.admin;
  return `<h2 class="vt">Présentation de l'entreprise <span class="hint">· SCR</span></h2>${d?`<div class="card"><div class="dr-doc">${d.html||''}</div>${d.file?`<a class="btn block" href="${esc(d.url||d.data||'#')}" target="_blank" rel="noopener" style="margin-top:8px">📄 ${esc(d.file)}</a>`:''}<div class="hint" style="margin-top:6px">${esc(d.by||'')} · ${fDate(String(d.at||'').slice(0,10))}</div></div>`:'<div class="card"><div class="eq-s">Pas encore de présentation : qui est SCR, le métier (soudure et manchonnage de réseaux de chaleur), les chiffres clés, l\'organisation, les valeurs — la page qu\'on montre à un nouvel arrivant.</div></div>'}
    ${edit?`<div class="card"><div class="eq-acts"><button class="btn" data-act="presedit">✏️ ${d?'Modifier':'Écrire'} la présentation</button></div></div>`:''}`;}
function presentationEdit(me){const d=docById('presentation')||{};A.openModal(`<h3 style="margin-top:0">Présentation de l'entreprise</h3><label class="f">Texte <span class="dim">(un paragraphe par ligne ; « # » en début de ligne = titre)</span></label><textarea class="f" id="pr-text" style="min-height:220px">${esc((d.html||'').replace(/<h3>/g,'# ').replace(/<\/h3>/g,'\n').replace(/<p>/g,'').replace(/<\/p>/g,'\n').replace(/&amp;/g,'&').replace(/&lt;/g,'<').replace(/&gt;/g,'>').replace(/&quot;/g,'"').replace(/&#39;/g,"'").trim())}</textarea>
    <label class="btn" style="margin-top:6px">📎 Plaquette PDF <span class="dim">(option)</span><input type="file" id="pr-pdf" accept="application/pdf" style="display:none"></label><div class="hint" id="pr-pdfname">${d.file?esc(d.file):'aucun fichier'}</div>
    <div class="actions" style="margin-top:8px"><button class="btn primary block" id="pr-ok">Publier</button><button class="btn block" data-close>Annuler</button></div>`);
  let file=null;const pf=document.getElementById('pr-pdf');if(pf)pf.onchange=()=>{file=pf.files[0]||null;document.getElementById('pr-pdfname').textContent=file?file.name:'aucun fichier';};
  document.getElementById('pr-ok').onclick=async()=>{const txt=(document.getElementById('pr-text').value||'').trim();if(!txt&&!file){A.toast('Un texte ou un PDF');return;}const html=txt.split(/\n+/).map(l=>l.trim()).filter(Boolean).map(l=>l.startsWith('#')?'<h3>'+esc(l.replace(/^#+\s*/,''))+'</h3>':'<p>'+esc(l)+'</p>').join('');
    let url=null,data=null;if(file){try{url=A.sync&&A.sync.uploadDoc?await A.sync.uploadDoc('entreprise','docs',file.name,file):null;}catch(e){url=null;}if(!url){if(file.size>1.5*1024*1024){A.toast('Hors connexion et PDF trop gros — reconnecte-toi');return;}data=await new Promise(res=>{const r=new FileReader();r.onload=()=>res(r.result);r.onerror=()=>res(null);r.readAsDataURL(file);});}}
    regSet('doc','presentation',Object.assign({kind:'presentation',title:'Présentation de l\'entreprise',html,req:{none:true},active:true,at:new Date().toISOString(),by:nomC(me)},file?{file:file.name,size:file.size,url:url||undefined,data:data||undefined}:{}));A.closeModal();render();msg('Présentation publiée');};}
function infoNew(me){A.openModal(`<h3 style="margin-top:0">Publier une info</h3><div class="hint" style="margin:0 0 6px">Visible par tout le monde dans SCR → Communication interne. Pas de signature.</div>
    <label class="f">Titre</label><input class="f" id="in-title" placeholder="ex. Résultats du semestre · Arrivée de … · Repas de fin d'année"><label class="f">Texte <span class="dim">(un paragraphe par ligne)</span></label><textarea class="f" id="in-text" style="min-height:120px"></textarea>
    <label class="btn" style="margin-top:6px">📎 PDF <span class="dim">(option)</span><input type="file" id="in-pdf" accept="application/pdf" style="display:none"></label><div class="hint" id="in-pdfname">aucun fichier</div>
    <div class="actions" style="margin-top:8px"><button class="btn primary block" id="in-ok">Publier</button><button class="btn block" data-close>Annuler</button></div>`);
  let file=null;const pf=document.getElementById('in-pdf');if(pf)pf.onchange=()=>{file=pf.files[0]||null;document.getElementById('in-pdfname').textContent=file?file.name:'aucun fichier';};
  document.getElementById('in-ok').onclick=async()=>{const title=(document.getElementById('in-title').value||'').trim();const txt=(document.getElementById('in-text').value||'').trim();if(!title||(!txt&&!file)){A.toast('Un titre, et un texte ou un PDF');return;}const html=txt.split(/\n+/).map(l=>'<p>'+esc(l.trim())+'</p>').join('');
    let url=null,data=null;if(file){try{url=A.sync&&A.sync.uploadDoc?await A.sync.uploadDoc('entreprise','docs',file.name,file):null;}catch(e){url=null;}if(!url){if(file.size>1.5*1024*1024){A.toast('Hors connexion et PDF trop gros — reconnecte-toi');return;}data=await new Promise(res=>{const r=new FileReader();r.onload=()=>res(r.result);r.onerror=()=>res(null);r.readAsDataURL(file);});}}
    regSet('doc','info_'+Date.now().toString(36),Object.assign({kind:'info',title,html,req:{none:true},active:true,at:new Date().toISOString(),by:nomC(me)},file?{file:file.name,size:file.size,url:url||undefined,data:data||undefined}:{}));A.closeModal();render();msg('📣 Info publiée');};}
/* ── 13/10 (Ethan) : « la détente doit se déclencher seule, tu as la règle ; l'onglet grand déplacement doit être la compil et le lieu de contrôle :
   on peut cibler un gars, voir ses chantiers sur le mois, les déplacements qui lui ont été accordés, ça garde l'historique ».
   · détente AUTOMATIQUE : position dans le cycle par personne (cas 3 : toutes les 2 semaines, cas 4 : toutes les 4) — l'exception reste possible mais n'est jamais nécessaire ;
   · ACCORD : l'encadrement / RH accorde la semaine → photographie gardée (registre gdx, id acc|<personne>|<semaine>) : chantiers, cas, km, cycle, nuitées, repas, A/R, € ;
     si le planning bouge après l'accord, l'écart est signalé (accordé ≠ recalculé) ;
   · vue PAR PERSONNE : un mois (‹ ›), ses chantiers semaine par semaine, ses GD calculés et accordés, totaux, export CSV — l'historique = les mois précédents. ── */
const gdAccOf=(pid,wk)=>{const x=regGet('gdx','acc|'+pid+'|'+wk);return x&&!x.deleted&&x.accord?x:null;};
const gdSnap=w=>({cas:w.g.cas.n,km:w.g.km,jours:w.semaine?w.semaine.jours:w.jours.filter(Boolean).length,nuits:w.semaine?w.semaine.nuits:0,repas:w.semaine?w.semaine.repas:0,ar:w.semaine?w.semaine.ar:0,eur:w.semaine?w.semaine.eur:0,idx:w.semaine?w.semaine.idx:0,cycle:w.semaine?w.semaine.cycle:1,detente:!!(w.semaine&&w.semaine.detente),arrival:w.semaine?!!w.semaine.arrival:false,ret:w.semaine?!!w.semaine.ret:false,retWhy:w.semaine?w.semaine.retWhy||'':'',site:w.main,sites:w.ids.slice(),
  days:w.semaine&&w.semaine.days?w.semaine.days.map((x,i)=>Object.assign({d:gdAddD(w.js[0],i-1)},x)):null}); /* 13/10 soir : le détail jour par jour (dim → sam) est figé avec l'accord */
const gdTot=(days,cas)=>{const n=days.reduce((a,x)=>a+(+x.N||0),0),r=days.reduce((a,x)=>a+(+x.L||0)+(+x.D||0),0),ar=days.reduce((a,x)=>a+(+x.ar||0),0);const c=GD_CAS.find(x=>x.n===+cas);return {nuits:n,repas:r,ar,eur:Math.round(ar*(c?c.ar:0)*100)/100};};
const gdDiff=(a,b)=>{if(['cas','jours'].some(k=>(+a[k]||0)!==(+b[k]||0)))return true;if(Array.isArray(a.days)&&Array.isArray(b.days))return a.days.some((x,i)=>{const y=b.days[i];return !x.adj&&y&&(x.L!==y.L||x.D!==y.D||x.N!==y.N||x.ar!==y.ar);});return ['nuits','repas','eur'].some(k=>(+a[k]||0)!==(+b[k]||0));}; /* un jour ajusté à la main par la RH n'est pas un écart */
const kOfMonday=md=>Math.round((D(md)-D(semaineDe(0)[0]))/(7*864e5));
function gdMonthWeeks(ym){const [y,m]=ym.split('-').map(Number);const first=new Date(y,m-1,1),last=new Date(y,m,0);const md=new Date(first);md.setDate(md.getDate()-((md.getDay()+6)%7));const out=[];
  for(let d=new Date(md);d<=last;d.setDate(d.getDate()+7)){const mon=d.getFullYear()+'-'+pad(d.getMonth()+1)+'-'+pad(d.getDate());const fri=new Date(d);fri.setDate(fri.getDate()+4);if(fri<first)continue;out.push({mon,k:kOfMonday(mon)});}return out;}
const MOIS_L=['janvier','février','mars','avril','mai','juin','juillet','août','septembre','octobre','novembre','décembre'];
const ymOf=d=>String(d).slice(0,7);const ymAdd=(ym,n)=>{const [y,m]=ym.split('-').map(Number);const d=new Date(y,m-1+n,1);return d.getFullYear()+'-'+pad(d.getMonth()+1);};
const gdPeople=()=>DATA.personnes.filter(p=>p.active&&['terrain','chef'].includes(kindOf(p)==='interim'?'terrain':kindOf(p)));
function gdCycleTag(w){const s2=w.semaine;if(!s2||s2.cycle<=1)return '';const auto=!w.x;return ` · <span class="eq-tag${s2.detente?' ok':''}" title="Cycle du cas ${w.g.cas.n} : ${s2.cycle} semaines, détente la dernière — ${auto?'automatique (règle du livret)':'exception posée par l\'encadrement'}">${s2.detente?'🏠 détente':'S'+(s2.idx+1)+'/'+s2.cycle}${auto?'':' · réglé'}</span>`;}
function gdAccTag(w,pid){const a=gdAccOf(pid,w.wk);if(!a)return w.g.ok&&w.g.cas.n>1?'<span class="eq-tag" style="color:#7a5200">à accorder</span>':'';const ch=w.g.ok&&gdDiff(a.accord,gdSnap(w));return `<span class="eq-tag ${ch?'warn':'ok'}" title="${esc('Accordé par '+(a.by||'')+' le '+fDate(String(a.at||'').slice(0,10)))}">${ch?'⚠ accordé ≠ planning':'✓ accordé'}</span>`;}
/* 13/10 soir (Ethan : « fais-moi ressortir les adresses où ça ne le localise pas ou où il y a erreur ») : toutes les personnes de terrain (et les chantiers) dont
   l'adresse manque, n'a pas de code postal valable, est introuvable, n'a été trouvée que par le nom de la ville (homonyme possible), tombe hors de France ou donne
   une distance aberrante — avec la fiche à corriger et « ↻ réessayer ». */
const gdInFrance=ll=>Array.isArray(ll)&&ll[0]>-5.5&&ll[0]<10&&ll[1]>41&&ll[1]<51.5;
function gdAddrIssues(gens){const out=[];const now=Date.now();const todo=[];
  gdPeople().forEach(p=>{const a=p.adresse||{};const why=[];let sev='warn';const k=addrKey(a);
    if(!a.ville){why.push('pas d\'adresse (ville) dans la fiche');sev='bad';}
    else{if(!/^\d{5}$/.test(String(a.cp||'').trim()))why.push('code postal '+(a.cp?'« '+a.cp+' » invalide':'manquant')+' : localisation par le nom seul');
      const loc=GEOCODE[k];const q=GEOQ[k];
      if(loc===null){why.push('introuvable ('+[a.cp,a.ville].filter(Boolean).join(' ')+')');sev='bad';}
      else if(loc===undefined){todo.push({adr:a});if(GD_TRIED[k]&&now-GD_TRIED[k]>8000)why.push('pas encore localisée (service de géocodage injoignable) — nouvel essai automatique');}
      else{if(!gdInFrance(loc)){why.push('localisée hors de France métropolitaine — erreur probable');sev='bad';}if(q&&q.src==='nom')why.push('trouvée par le nom de la ville seul (le code postal ne correspond pas) — homonyme possible');}}
    const w=(gens||[]).find(x=>x.p.id===p.id);if(w&&w.w&&w.w.g.ok&&w.w.g.km>1200){why.push('~'+w.w.g.km+' km du chantier : distance aberrante, adresse à vérifier');sev='bad';}
    if(why.length)out.push({p,why,sev,k,pl:!!w});});
  DATA.chantiers.filter(c=>!c.bureau).forEach(c=>{if(c.ll)return;if(!c.ville){out.push({c,why:['chantier sans position (calage GPS) ni ville dans sa fiche'],sev:'warn'});return;}const v=GEOCODE[String(c.ville).trim().toLowerCase()];if(v===null)out.push({c,why:['ville du chantier introuvable (« '+c.ville+' »)'],sev:'bad',k:String(c.ville).trim().toLowerCase()});});
  if(todo.length)gdEnsure(todo); /* même les personnes pas planifiées cette semaine : l'adresse est vérifiée avant qu'elles partent en déplacement */
  return out.sort((x,y)=>(y.sev==='bad')-(x.sev==='bad')||(y.pl?1:0)-(x.pl?1:0));}
function gdAddrCard(enc,gens){const L=gdAddrIssues(gens);if(!L.length)return `<div class="okbox" style="margin:0 0 8px">📍 Toutes les adresses du terrain sont localisées.</div>`;const nb2=L.filter(x=>x.sev==='bad').length;
  return `<details class="card" ${S.gdAddrOpen===false?'':'open'} data-gdaddr="1"><summary style="cursor:pointer;font-size:13.5px"><b>📍 Adresses à vérifier · ${L.length}</b> <span class="dim" style="font-size:12px">${nb2?nb2+' en erreur · ':''}les grands déplacements de ces personnes ne peuvent pas être calculés (ou sont douteux)</span></summary>
    <div class="eq-list" style="margin-top:6px">${L.map(x=>x.p?`<div class="eq-row"><span class="eq-grow"><span class="eq-t">${x.sev==='bad'?'⛔':'⚠'} <b>${esc(nomC(x.p))}</b> <span class="dim">· ${esc(POSTES_ESP[x.p.poste]?POSTES_ESP[x.p.poste].label:x.p.poste)}</span>${x.pl?' <span class="eq-tag warn">planifié cette semaine</span>':''}</span><span class="eq-s">${x.p.adresse&&x.p.adresse.ville?esc([x.p.adresse.voie,x.p.adresse.cp,x.p.adresse.ville].filter(Boolean).join(' ')):'—'} · ${x.why.map(esc).join(' · ')}</span></span><span class="eq-acts" style="margin:0">${enc?`<button class="btn sm" data-act="fiche" data-v="${esc(x.p.id)}">Fiche</button>`:''}${x.k?`<button class="btn sm" data-act="gdretry" data-v="${esc(x.k)}" title="Relancer la localisation">↻</button>`:''}</span></div>`
      :`<div class="eq-row"><span class="eq-grow"><span class="eq-t">${x.sev==='bad'?'⛔':'⚠'} <b>Chantier ${esc(x.c.nom)}</b></span><span class="eq-s">${x.why.map(esc).join(' · ')} — à renseigner dans la fiche du chantier (ville) ou par le calage GPS</span></span>${x.k?`<span class="eq-acts" style="margin:0"><button class="btn sm" data-act="gdretry" data-v="${esc(x.k)}">↻</button></span>`:''}</div>`).join('')}</div>
    <div class="hint" style="margin-top:6px">Localisation : code postal + ville (Géoplateforme IGN), sinon les communes du code postal, en dernier le nom seul. Corrige le code postal et la ville dans la fiche (pas de « CEDEX », ville en toutes lettres) puis ↻.</div></details>`;}
function vGD(me){const enc=can(me,'planning.edit')||accueilType(me)==='rh'||me.admin;const mode=S.gdMode||'semaine';
  const modes=`<div class="eq-filtres af-segs">${[['semaine','🗓 Par semaine'],['personne','👤 Par personne · mois']].map(([k,t])=>`<button class="chip${mode===k?' active':''}" data-act="gdmode" data-v="${k}">${t}</button>`).join('')}</div>`;
  if(mode==='personne')return modes+vGDPersonne(me,enc);
  const js=semaineDe(S.gdWeek||0);const gens=gdPeople().map(p=>({p,w:gdWeekOf(p,S.gdWeek||0)})).filter(x=>x.w);
  const tot={n:0,nuits:0,repas:0,eur:0,cas:{1:0,2:0,3:0,4:0},sans:0,acc:0,aacc:0};gens.forEach(x=>{if(!x.w.g.ok){tot.sans++;return;}tot.n++;tot.cas[x.w.g.cas.n]++;if(x.w.semaine){tot.nuits+=x.w.semaine.nuits;tot.repas+=x.w.semaine.repas;tot.eur+=x.w.semaine.eur;}if(x.w.g.cas.n>1){if(gdAccOf(x.p.id,x.w.wk))tot.acc++;else tot.aacc++;}});
  ensureWeeks([1,2,3,4,5,6,7,8,9,10,11,12].map(i=>weekKey(semaineDe((S.gdWeek||0)-i)[0]))); /* 12/10 : le cycle se lit sur les semaines précédentes (13/10 : 12 semaines) */
  const row=x=>{const c=site(x.w.main);const g=x.w.g;const s2=x.w.semaine;
    const btn=enc&&s2&&s2.cycle>1?`<button class="btn sm" data-act="gdx" data-v="${esc(x.p.id)}|${x.w.wk}|${s2.detente?(x.w.x&&x.w.x.detente===true?'reset':'0'):(x.w.x?'reset':'1')}" title="${s2.detente?(x.w.x&&x.w.x.detente===true?'Retirer l\'exception':'Exception : pas de détente cette semaine (reste sur place)'):(x.w.x?'Retirer l\'exception : revenir au cycle automatique':'Exception : détente cette semaine (retour anticipé)')}">${s2.detente?(x.w.x&&x.w.x.detente===true?'↺ auto':'✗ pas de détente'):(x.w.x?'↺ auto':'🏠 exception')}</button>`:'';
    const acc=enc&&g.ok&&g.cas.n>1?(gdAccOf(x.p.id,x.w.wk)?`<button class="btn sm" data-act="gdacc" data-v="${esc(x.p.id)}|${S.gdWeek||0}" title="Ré-accorder avec le planning actuel">↻</button>`:`<button class="btn sm primary" data-act="gdacc" data-v="${esc(x.p.id)}|${S.gdWeek||0}">✓ Accorder</button>`):'';
    return `<div class="eq-row"><span class="eq-grow"><span class="eq-t"><button class="lnk" data-act="gdpers" data-v="${esc(x.p.id)}" title="Voir son mois">${esc(nomC(x.p))}</button> <span class="eq-s">· ${esc(POSTES_ESP[x.p.poste]?POSTES_ESP[x.p.poste].label:x.p.poste)}${x.p.adresse&&x.p.adresse.ville?' · '+esc(x.p.adresse.ville):''}</span></span><span class="eq-s">${esc(c.nom)}${x.w.ids.length>1?' (+'+(x.w.ids.length-1)+')':''} · ${x.w.jours.filter(Boolean).length} j${g.ok?' · ~'+g.km+' km · <b>cas '+g.cas.n+'</b>'+gdCycleTag(x.w)+(s2&&g.cas.n>1?' · '+s2.nuits+' nuitées · '+s2.repas+' repas · '+s2.eur+' €':g.cas.n===1?' · trajets quotidiens + repas midi':''):' · <span style="color:#7a5200">'+esc(g.why)+'</span>'} ${gdAccTag(x.w,x.p.id)}</span></span>${btn||acc?`<span class="eq-acts" style="margin:0">${btn}${acc}</span>`:''}</div>`;};
  return modes+gdAddrCard(enc,gens)+`${weekNav({k:S.gdWeek||0,js,act:'gdweek'})}
    <div class="ac-stats" style="margin-bottom:8px"><div class="ac-stat"><b>${tot.n}</b><small>planifiés localisés</small></div><div class="ac-stat"><b>${tot.cas[2]+tot.cas[3]+tot.cas[4]}</b><small>en grand déplacement</small></div><div class="ac-stat"><b>${tot.nuits}</b><small>nuitées</small></div><div class="ac-stat"><b>${tot.repas}</b><small>repas</small></div><div class="ac-stat"><b>${nb(tot.eur)} €</b><small>indemnités trajet</small></div><div class="ac-stat ${tot.aacc?'warn':tot.acc?'ok':''}"><b>${tot.acc} / ${tot.acc+tot.aacc}</b><small>accordés</small></div>${tot.sans?`<div class="ac-stat warn"><b>${tot.sans}</b><small>sans adresse / localisation</small></div>`:''}</div>
    <div class="card"><h3>Semaine ${numSemaine(js[0])} <span class="hint">· du ${fDate(js[0]).slice(0,5)} au ${fDate(js[4])} · touche un nom pour son mois</span></h3>${enc&&tot.aacc?`<div class="eq-acts" style="margin:0 0 6px"><button class="btn primary" data-act="gdaccall" data-v="${S.gdWeek||0}">✓ Accorder les ${tot.aacc} grand${tot.aacc>1?'s':''} déplacement${tot.aacc>1?'s':''} de la semaine</button></div>`:''}${gens.length?`<div class="eq-list">${gens.map(row).join('')}</div>`:'<div class="eq-s">Personne n\'est planifié cette semaine.</div>'}</div>
    <div class="card"><h3>Règles (livret d'accueil SCR § 2.7)</h3>${GD_CAS.map(c=>`<div class="eq-s" style="margin:4px 0"><b>Cas ${c.n} · ${esc(c.label)}</b> — ${esc(c.crit)} : ${esc(c.prise)}</div>`).join('')}<div class="hint" style="margin-top:6px"><b>Détente automatique</b> : le cycle se compte par personne sur le planning (semaines d'affilée en déplacement du même cas) ; la détente tombe toute seule la dernière semaine du cycle (cas 3 : 1 semaine sur 2, retour vendredi ; cas 4 : 1 sur 4, retour jeudi). L'exception (🏠 / ✗) ne sert que si la réalité diffère. <b>Accorder</b> fige la semaine (chantiers, cas, nuitées, repas, indemnités) : c'est l'historique, même si le planning change ensuite. <b>Jour par jour</b> : 4 ou 5 jours travaillés (lun → jeu ou lun → ven) = même forfait, du dimanche soir au vendredi midi ; semaine incomplète : arrivée la veille du 1er jour travaillé (lundi pas travaillé = pas de nuit du dimanche), départ après le dernier s'il tombe avant le jeudi ; un férié n'est travaillé que s'il est planifié exprès. <b>Indemnité de trajet</b> : seulement quand le gars rentre chez lui (détente) — ½ A/R à l'aller, ½ au retour ; une semaine où il reste sur place n'en a pas. Hypothèses : distance = vol d'oiseau domicile (code postal + ville) → chantier × 1,25 ; « 30 min » ≈ 35 km. ${GD_RAPPELS.join(' ')}</div>
      <details style="margin-top:6px"><summary class="dim" style="cursor:pointer;font-size:12.5px;min-height:36px;display:flex;align-items:center">Tableaux jour par jour (cas 2, 3, 4) — contrôlés sur le livret § 2.7</summary>${gdTablesHTML(0)}</details>
      <div class="eq-acts" style="margin-top:6px">${gdLivretHTML(enc)}</div><div class="hint">Le PDF déposé ici est aussi dans « Moi → Heures » de chacun, sous « Comment c'est calculé ».</div></div>`;}
/* 13/10 soir (Ethan) : « par gars par mois il faut une vue du mois avec les nuits accordées et repas accordés ; s'il est en congé la semaine d'après il n'a pas sa nuit
   du dimanche, ça apparaît comme ça ». Calendrier dim → sam (la semaine GD commence le dimanche soir) ; chaque jour : nuitée, repas, ½ A/R — accordé (vert) ou calculé
   à accorder (orange) ; un jour se corrige à la main (RH / encadrement) : la semaine est alors accordée avec ce jour ajusté. Totaux du mois = jours DU MOIS (une semaine à
   cheval compte dans chaque mois pour ses jours). Navette du mois (jours en colonnes) + CSV : la base des variables de paie. */
function gdCalWeeks(ym){const [y,m]=ym.split('-').map(Number);const first=new Date(y,m-1,1,12),last=new Date(y,m,0,12);const sun=new Date(first);sun.setDate(sun.getDate()-sun.getDay());const out=[];
  for(let d=new Date(sun);d<=last;d.setDate(d.getDate()+7)){const mon=new Date(d);mon.setDate(mon.getDate()+1);const md=mon.getFullYear()+'-'+pad(mon.getMonth()+1)+'-'+pad(mon.getDate());out.push({mon:md,k:kOfMonday(md)});}return out;}
function gdLegacyDays(a,mon){const c=GD_CAS.find(x=>x.n===+a.cas);if(!c||c.n<2)return null;const N=+a.cycle||1,i=+a.idx||0;const J=gdJoursRH(c,{arrival:N===1||i===0,ret:N===1||!!a.detente||i===N-1});return J.days.map((x,j)=>Object.assign({d:gdAddD(mon,j-1),legacy:true},x));} /* accord d'avant le détail par jour : reconstitué depuis le cycle */
/* une semaine GD (dim → sam) d'une personne : jours accordés (figés) sinon calculés */
function gdWeekDays(p,mon,k){const w=gdWeekOf(p,k);const wk=weekKey(mon);const acc=gdAccOf(p.id,wk);const cur=w&&w.g.ok&&w.g.cas.n>1?gdSnap(w):null;let src=null,st='none';
  if(acc&&acc.accord&&+acc.accord.cas>1){src=acc.accord.days?acc.accord.days:gdLegacyDays(acc.accord,mon);st='acc';}else if(cur){src=cur.days;st='calc';}
  const ch=acc&&cur&&gdDiff(acc.accord,cur);
  const days=[0,1,2,3,4,5,6].map(i=>{const d=gdAddD(mon,i-1);const x=src&&src[i]?src[i]:{L:0,D:0,N:0,ar:0};const wd=i>=1&&i<=5;const sites=wd?planDe(p.id,d):[];const fer=isFerie(d);const worked=wd&&sites.length>0&&!(fer&&!gdPlanExpr(p,d));
    return {d,i,L:+x.L||0,D:+x.D||0,N:+x.N||0,ar:+x.ar||0,adj:!!x.adj,note:x.note||'',st:(x.N||x.L||x.D||x.ar)?st:'none',sites,worked,fer,wd};});
  return {mon,k,wk,w,acc,cur,days,ch,cas:acc&&acc.accord?+acc.accord.cas:(cur?cur.cas:(w&&w.g.ok?w.g.cas.n:0))};}
function gdMonthDays(p,ym){const rows=gdCalWeeks(ym).map(({mon,k})=>gdWeekDays(p,mon,k));const inM=d=>String(d).slice(0,7)===ym;
  const T={acc:{N:0,R:0,ar:0,eur:0},calc:{N:0,R:0,ar:0,eur:0},adj:0,jours:0};rows.forEach(r=>{const c=GD_CAS.find(x=>x.n===r.cas);r.days.forEach(x=>{if(!inM(x.d))return;if(x.worked)T.jours++;if(x.adj)T.adj++;const t=x.st==='acc'?T.acc:x.st==='calc'?T.calc:null;if(!t)return;t.N+=x.N;t.R+=x.L+x.D;t.ar+=x.ar;t.eur+=x.ar*(c?c.ar:0);});});
  ['acc','calc'].forEach(k=>{T[k].eur=Math.round(T[k].eur*100)/100;});return {rows,T};}
function gdCalHTML(p,ym,M,enc){const inM=d=>String(d).slice(0,7)===ym;const short=id=>{const n=site(id).nom||'';return n.split(/[\s—–-]+/).filter(Boolean)[0]||n;};
  const cell=x=>{const cls=['gd-cell',inM(x.d)?'':'out',x.st,x.wd?'':'we',x.fer?'fer':'',x.adj?'adj':''].filter(Boolean).join(' ');const r=x.L+x.D;
    return `<${enc?'button':'div'} class="${cls}"${enc?` data-act="gdday" data-v="${esc(p.id)}|${x.d}" title="${esc(fDate(x.d)+(x.note?' — '+x.note:''))}"`:''}><span class="gd-d">${+x.d.slice(8)}${x.fer?' <small>férié</small>':''}</span><span class="gd-st">${x.sites.length?esc(short(x.sites[0]))+(x.sites.length>1?'+':''):x.wd&&!x.worked&&!x.fer&&inM(x.d)?'<span class="dim">—</span>':''}</span><span class="gd-b">${x.N?'🌙':''}${r?'🍽'+(r>1?'×2':x.L?'m':'s'):''}${x.ar?'🚗½':''}</span>${x.adj?'<span class="gd-adj">✎</span>':''}</${enc?'button':'div'}>`;};
  return `<div class="gd-cal"><div class="gd-head">${GD_JL.map(j=>`<span>${j}</span>`).join('')}</div>${M.rows.map(r=>{const c=r.cas;const s2=r.w&&r.w.semaine;const tot=r.days.reduce((a,x)=>({N:a.N+x.N,R:a.R+x.L+x.D,ar:a.ar+x.ar}),{N:0,R:0,ar:0});
    return `<div class="gd-wk"><div class="gd-wkh"><b>S${numSemaine(r.mon)}</b>${r.w?` · ${esc(r.w.ids.map(id=>site(id).nom).filter(Boolean).join(' + '))}`:' · <span class="dim">pas planifié</span>'}${c>1?` · cas ${c}${s2&&s2.cycle>1?' · '+(s2.detente?'🏠 '+(s2.retWhy==='absence'?'retour (absent ensuite)':'détente'):'S'+(s2.idx+1)+'/'+s2.cycle):''} · ${tot.N} n · ${tot.R} r${tot.ar?' · '+tot.ar+' A/R':''}`:c===1?' · cas 1 (trajets quotidiens)':r.w&&!r.w.g.ok?' · <span style="color:#7a5200">'+esc(r.w.g.why)+'</span>':''}
      ${r.acc?`<span class="eq-tag ${r.ch?'warn':'ok'}">${r.ch?'⚠ planning changé':'✓ accordé'}</span>`:c>1?'<span class="eq-tag" style="color:#7a5200">à accorder</span>':''}${enc&&r.w&&r.w.g.ok&&c>1?(r.acc?`<button class="btn sm" data-act="gdacc" data-v="${esc(p.id)}|${r.k}" title="Ré-accorder avec le planning actuel (les jours ajustés à la main sont perdus)">↻</button>`:`<button class="btn sm primary" data-act="gdacc" data-v="${esc(p.id)}|${r.k}">✓ Accorder</button>`):''}</div>
      <div class="gd-row">${r.days.map(cell).join('')}</div></div>`;}).join('')}</div>`;}
function gdNavRows(p,ym,M){const [y,m]=ym.split('-').map(Number);const nD=new Date(y,m,0).getDate();const ds=[...Array(nD)].map((_,i)=>ym+'-'+pad(i+1));const by={};M.rows.forEach(r=>r.days.forEach(x=>{by[x.d]=x;}));
  const g=d=>by[d]||{L:0,D:0,N:0,ar:0,st:'none',sites:[],worked:false,wd:[1,2,3,4,5].includes(D(d).getDay()),fer:isFerie(d)};
  const code=x=>x.worked?'T':x.fer?'F':!x.wd?'':'—';const cs=x=>x.sites&&x.sites.length?site(x.sites[0]).nom:'';
  const rows=[['Jour',...ds.map(d=>GD_JL[D(d).getDay()].slice(0,2)),''],['Chantier',...ds.map(d=>cs(g(d))),''],['Présence (T travaillé · F férié · — non planifié)',...ds.map(d=>code(g(d))),ds.filter(d=>g(d).worked).length],
    ['Nuitée GD',...ds.map(d=>g(d).N||''),ds.reduce((a,d)=>a+g(d).N,0)],['Repas midi GD',...ds.map(d=>g(d).L||''),ds.reduce((a,d)=>a+g(d).L,0)],['Repas soir GD',...ds.map(d=>g(d).D||''),ds.reduce((a,d)=>a+g(d).D,0)],
    ['Trajet (A/R)',...ds.map(d=>g(d).ar?String(g(d).ar).replace('.',','):''),String(ds.reduce((a,d)=>a+g(d).ar,0)).replace('.',',')],['Accord (✓ accordé · c calculé)',...ds.map(d=>{const x=g(d);return x.st==='acc'?'✓':x.st==='calc'?'c':'';}),'']];
  return {ds,rows};}
/* ajuster un jour (RH / encadrement) : la semaine est accordée avec ce jour corrigé (motif gardé) ; « revenir au calcul » remet le jour calculé */
function gdDayModal(me,pid,d){const p=pers(pid);const mon=gdMonOf(d);const k=kOfMonday(mon);const wk=weekKey(mon);const w=gdWeekOf(p,k);const acc=gdAccOf(pid,wk);const cur=w&&w.g.ok&&w.g.cas.n>1?gdSnap(w):null;
  const snap=acc&&acc.accord&&+acc.accord.cas>1?JSON.parse(JSON.stringify(acc.accord)):cur?JSON.parse(JSON.stringify(cur)):null;
  if(!snap){msg('Pas de grand déplacement cette semaine-là (pas planifié, cas 1 ou adresse non localisée)');return;}if(!Array.isArray(snap.days))snap.days=gdLegacyDays(snap,mon)||[];
  const i=snap.days.findIndex(x=>x.d===d);if(i<0)return;const x=Object.assign({L:0,D:0,N:0,ar:0},snap.days[i]);const st={L:+x.L||0,D:+x.D||0,N:+x.N||0,ar:+x.ar||0};const sites=[1,2,3,4,5].includes(D(d).getDay())?planDe(pid,d).map(id=>site(id).nom):[];
  const tog=(k2,lab,vals)=>`<div class="gd-tg"><span>${lab}</span>${vals.map(([v2,t])=>`<button class="chip${st[k2]===v2?' active':''}" data-gdt="${k2}|${v2}">${t}</button>`).join('')}</div>`;
  const rd=()=>{A.openModal(`<h3 style="margin-top:0">${GD_JL[D(d).getDay()]} ${fDate(d)} — ${esc(nomC(p))}</h3><div class="hint" style="margin:0 0 6px">S${numSemaine(mon)} · cas ${snap.cas} · ${sites.length?esc(sites.join(' + ')):'pas de chantier ce jour'}${isFerie(d)?' · férié':''} · ${acc?'semaine accordée par '+esc(acc.by||''):'semaine calculée, pas encore accordée'}</div>
      ${tog('N','Nuitée',[[0,'non'],[1,'🌙 oui']])}${tog('L','Repas midi',[[0,'non'],[1,'🍽 oui']])}${tog('D','Repas soir',[[0,'non'],[1,'🍽 oui']])}${tog('ar','Trajet (détente)',[[0,'aucun'],[0.5,'🚗 ½ A/R']])}
      <label class="f">Motif <span class="dim">(gardé avec l'accord)</span></label><input class="f" id="gdd-note" value="${esc(x.note||'')}" placeholder="ex. rentré mercredi soir (raison familiale)">
      <div class="actions" style="margin-top:8px"><button class="btn primary block" id="gdd-ok">${acc?'Enregistrer':'Enregistrer et accorder la semaine'}</button>${x.adj&&cur?'<button class="btn block" id="gdd-reset">Revenir au calcul pour ce jour</button>':''}<button class="btn block" data-close>Annuler</button></div>`);
    document.querySelectorAll('#modal [data-gdt]').forEach(b=>b.onclick=()=>{const [k2,v2]=b.dataset.gdt.split('|');st[k2]=+v2;const n=document.getElementById('gdd-note');x.note=n?n.value:x.note;rd();});
    const save=days=>{const t=gdTot(days,snap.cas);const accord=Object.assign({},snap,{days},t,{adj:days.filter(y=>y.adj).length});regSet('gdx','acc|'+pid+'|'+wk,{p:pid,week:wk,accord,by:acc?acc.by:nomC(me),at:acc?acc.at:new Date().toISOString(),adjBy:nomC(me),adjAt:new Date().toISOString(),deleted:null},String(pid).includes('@')?undefined:{local:true});A.closeModal();render();};
    document.getElementById('gdd-ok').onclick=()=>{const note=(document.getElementById('gdd-note').value||'').trim();const same=['L','D','N','ar'].every(k2=>st[k2]===(+x[k2]||0));const days=snap.days.slice();
      days[i]=Object.assign({},days[i],st,same&&!note?{}:{adj:true,note,by:nomC(me),at:new Date().toISOString()});save(days);msg(same&&!note?'✓ Semaine '+numSemaine(mon)+' accordée':'✓ '+GD_JL[D(d).getDay()]+' '+fDate(d)+' ajusté — semaine accordée');};
    const rs=document.getElementById('gdd-reset');if(rs)rs.onclick=()=>{const c=cur.days.find(y=>y.d===d);const days=snap.days.slice();days[i]=Object.assign({},c);save(days);msg('Jour remis au calcul');};};
  rd();}
/* 13/10 nuit (Ethan : « c'est ça une navette type » — NAVETTE_09-26, faite sous Excel par les RH) : la navette de paie au FORMAT SCR, pré-remplie — semaines du mois
   (jeudi dans le mois), chantier du jour (planning), cas, ½ trajets, hôtel / hôtel IDF, repas (GD accordé, sinon calculé, comme la vue du mois), heures du pointage,
   km domicile → chantier ; formules Excel gardées (totaux, heures sup 125 / 150 %, compteurs). Module pur : src/navette.js. */
/* ── compteurs d'heures par personne (registre « cpth », 13/10) : contrat, compteurs suivis, soldes datés, primes ; « report » calculé depuis le pointage ── */
const cptRow=pid=>{const r=regGet('cpth',pid)||{};return {contrat:+r.contrat||35,on:Object.assign({report:true},r.on||{}),labels:r.labels||{},soldes:r.soldes||{},primes:(r.primes||[]).filter(x=>x&&!x.deleted)};};
const cptList=c=>CPT_H.map(x=>Object.assign({},x)).concat(Object.keys(c.labels).map(k=>({k,label:c.labels[k],desc:'compteur ajouté',custom:true})));
const weekHours=(pid,mon)=>{let t=0;for(let i=0;i<6;i++){const x=ptDe(pid,navAddDay(mon,i));if(x){const c=calc(x);t+=c.total/60;}}return Math.round(t*100)/100;}; /* lundi → samedi, comme la navette */
function cptSolde(p,k,upto){const c=cptRow(p.id);if(k==='report')return reportBalance(c.soldes.report,c.primes,upto||todayIso(),m=>weekHours(p.id,m));const s=c.soldes[k];return {h:s&&isFinite(+s.h)?+s.h:null,at:s?s.at:null};}
function cptSave(pid,patch){const demo=!String(pid).includes('@');regSet('cpth',pid,patch,demo?{local:true}:undefined);} /* personnages de démo : sur l'appareil seulement */
/* ── 13/10 (Ethan : « que les gars, dans leur section Moi, aient leurs heures avec leur navette et leurs variables, et dans le coin de quoi expliquer ») ── */
const GD_JR=['Dim','Lun','Mar','Mer','Jeu','Ven','Sam'];
const gdTab=(c,w,i)=>{const v=x=>x?String(x).replace('.',','):'—';return `<table class="rc gd-rt"><tr><th>${c.weeks.length>1?'S'+(i+1):'Semaine'}</th>${GD_JR.map(j=>`<th>${j}</th>`).join('')}</tr><tr><td>Repas</td>${w.repas.map(x=>`<td>${v(x)}</td>`).join('')}</tr><tr><td>Nuitée</td>${w.nuit.map(x=>`<td>${v(x)}</td>`).join('')}</tr><tr><td>½ trajet</td>${w.ar.map(x=>`<td>${v(x)}</td>`).join('')}</tr></table>`;};
function gdTablesHTML(casN){return (casN>=2?GD_CAS.filter(c=>c.n===casN):GD_CAS.filter(c=>c.n>=2)).map(c=>`<div class="eq-lab" style="margin-top:6px">Cas ${c.n} — jour par jour${c.weeks.length>1?' (cycle de '+c.weeks.length+' semaines)':''} · ${c.ar} € brut par aller-retour</div><div class="gd-rts">${c.weeks.map((w,i)=>gdTab(c,w,i)).join('')}</div>`).join('');}
function gdLivretHTML(enc){const pdf=regGet('doc','livret_gd');return `${pdf&&(pdf.url||pdf.data)?`<a class="btn sm" href="${esc(pdf.url||pdf.data)}" target="_blank" rel="noopener" data-livret="1">📄 ${esc(pdf.file||'Livret d\'accueil § 2.7 (PDF)')}</a> `:''}${enc?`<label class="btn sm" title="Le PDF des indemnités (livret d'accueil § 2.7) : visible par chacun dans Moi → Heures">📎 ${pdf?'Remplacer':'Déposer'} le PDF du livret (§ 2.7)<input type="file" accept="application/pdf" data-gdpdf="1" style="display:none"></label>`:''}`;}
function reglesHTML(casN,contrat){const C=+contrat||35;return `<div class="gd-regles"><div class="eq-lab">Tes heures</div><div class="eq-s">Contrat ${nb(C)} h par semaine. De la ${C+1}e à la ${Math.min(C+8,HEBDO_MAX)}e heure : heures sup à 125 %${C+9<HEBDO_MAX?` ; de la ${C+9}e à la ${HEBDO_MAX}e : 150 %`:C+9===HEBDO_MAX?` ; la ${HEBDO_MAX}e : 150 %`:''}. Au-delà de ${HEBDO_MAX} h dans la semaine, les heures vont dans ton compteur « heures à reporter », que l'entreprise peut te payer en prime. Une semaine compte dans le mois de son jeudi.</div>
  <div class="eq-lab" style="margin-top:6px">Grands déplacements (livret d'accueil SCR § 2.7)</div>${GD_CAS.map(c=>`<div class="eq-s" style="margin:3px 0"><b>Cas ${c.n} · ${esc(c.label)}</b> — ${esc(c.crit)} : ${esc(c.prise)}</div>`).join('')}${gdTablesHTML(casN)}
  <div class="eq-s" style="margin-top:6px">L'indemnité de trajet (15 € en cas 2, 30 € en cas 3, 50 € en cas 4, brut par aller-retour) n'est due que quand tu rentres chez toi : ½ à l'aller, ½ au retour. Les indemnités peuvent varier avec les jours fériés et les absences.</div><div class="eq-s">${GD_RAPPELS.map(esc).join(' ')}</div>
  <div class="eq-acts" style="margin-top:6px">${gdLivretHTML(false)}</div></div>`;}
async function gdPdfUpload(me,file){if(!/pdf$/i.test(file.type||'')&&!/\.pdf$/i.test(file.name||'')){msg('Un fichier PDF');return;}let url=null,data=null;try{url=A.sync&&A.sync.uploadDoc?await A.sync.uploadDoc('entreprise','docs',file.name,file):null;}catch(e){url=null;}
  if(!url){if(file.size>1.5*1024*1024){msg('Hors connexion et PDF trop gros — reconnecte-toi');return;}data=await new Promise(res=>{const r=new FileReader();r.onload=()=>res(r.result);r.onerror=()=>res(null);r.readAsDataURL(file);});}
  regSet('doc','livret_gd',{kind:'livret',title:'Indemnités grands déplacements (livret d\'accueil § 2.7)',html:'<p>Règles des grands déplacements : les 4 cas, tableaux jour par jour, indemnités de trajet.</p>',req:{none:true},active:true,at:new Date().toISOString(),by:nomC(me),file:file.name,size:file.size,url:url||undefined,data:data||undefined});render();msg('📄 PDF du livret déposé — chacun le retrouve dans Moi → Heures');}
function cMaNavette(me){const ym=S.navM||ymOf(todayIso());let N=null;try{N=navetteOf(me,ym);}catch(e){console.warn(e);}if(!N)return '';const W=N.weeks;const H=Math.round(W.reduce((t,w)=>t+w.total,0)*100)/100;const c=cptRow(me.id);
  const casN=Math.max(0,...W.map(w=>w.cas||0));const eur=(N.ar[2]||0)*15+(N.ar[3]||0)*30+(N.ar[4]||0)*50;const f=d=>d.slice(8)+'/'+d.slice(5,7);const nbH=N.tot.hotel+N.tot.idf;
  const tiles=[[nb(H)+' h','pointées'],[nb(N.hs.h125)+' h','heures sup 125 %'],[nb(N.hs.h150)+' h','heures sup 150 %']].concat(N.hs.report?[[nb(N.hs.report)+' h','au-delà de '+HEBDO_MAX+' h → à reporter']]:[]).concat(nbH?[[nbH,'hôtel'+(nbH>1?'s':'')],[N.tot.repas,'repas'],[nb(eur)+' €','indemnités de trajet']]:[]);
  const rows=W.map(w=>`<tr><td><b>S${w.n}</b><div class="dim" style="font-size:11px">${f(w.mon)} → ${f(navAddDay(w.mon,4))}</div></td><td>${w.main?esc(w.main):'<span class="dim">—</span>'}${w.cas?`<div class="dim" style="font-size:11px">cas ${w.cas}</div>`:''}</td><td class="num">${w.total?nb(w.total)+' h':'—'}${w.miss?`<div class="dim" style="font-size:10.5px">${w.miss} j sans pointage</div>`:''}</td><td class="num">${w.hs125||w.hs150?nb(w.hs125)+' + '+nb(w.hs150):'—'}${w.report?`<div style="font-size:10.5px;color:#9a3412">+ ${nb(w.report)} h à reporter</div>`:''}</td></tr>`).join('');
  const cpts=cptList(c).filter(x=>c.on[x.k]).map(x=>{const s=cptSolde(me,x.k);return `<div class="eq-kv"><span>${esc(x.label)}</span><span><b>${s&&s.h!==null&&s.h!==undefined?nb(s.h)+' h':'—'}</b>${x.k==='report'?' <span class="dim">(à ce jour)</span>':s&&s.at?' <span class="dim">(au '+fDate(s.at)+')</span>':''}</span></div>`;}).join('');
  return `<div class="card mynav"><h3>🧾 Ma navette <span class="hint">· mes variables du mois</span></h3>
    <div class="eq-wkhead"><button class="eq-wkbtn" data-act="mynavm" data-v="${ymAdd(ym,-1)}" aria-label="Mois précédent">‹</button><div class="eq-wktitle"><b>${MOIS_L[+ym.slice(5)-1]} ${ym.slice(0,4)}</b><span>${W.length?'semaines du '+f(navAddDay(W[0].mon,-1))+' au '+f(navAddDay(W[W.length-1].mon,6)):''}</span></div><button class="eq-wkbtn" data-act="mynavm" data-v="${ymAdd(ym,1)}" aria-label="Mois suivant">›</button></div>
    <div class="ac-stats" style="margin:8px 0">${tiles.map(([b,t])=>`<div class="ac-stat"><b>${b}</b><small>${t}</small></div>`).join('')}</div>
    <div style="overflow:auto"><table class="rc af-tab"><tr><th>Semaine</th><th>Chantier</th><th>Heures</th><th>H. sup 125 + 150 %</th></tr>${rows}</table></div>
    ${cpts?`<div class="eq-lab" style="margin-top:8px">Mes compteurs</div>${cpts}`:''}
    <div class="eq-acts" style="margin-top:8px"><button class="btn sm" data-act="mynav" data-v="${ym}">⬇ Ma navette (Excel)</button></div>
    <details class="gd-explain" style="margin-top:6px"${S.navExplain?' open':''}><summary class="dim" style="cursor:pointer;font-size:12.5px;min-height:38px;display:flex;align-items:center">❓ Comment c'est calculé (heures, grands déplacements)</summary>${reglesHTML(casN,c.contrat)}</details></div>`;}
function navetteOf(p,ym){const M=gdMonthDays(p,ym);const by={};M.rows.forEach(r=>r.days.forEach(x=>{by[x.d]={x,cas:r.cas};}));
  const sitesOf=d=>planDe(p.id,d).map(id=>site(id)).filter(c=>c&&!c.bureau&&!c.stub).map(c=>{const g=gdOf(p,c.id);const ll=c.ll||(c.ville?GEOCODE[String(c.ville).trim().toLowerCase()]:null);return {id:c.id,nom:c.nom,km:g&&g.ok?g.km:null,idf:!!(ll&&inIDF(+ll[0],+ll[1]))};});
  const hoursOf=d=>{const x=ptDe(p.id,d);if(!x)return null;const c=calc(x);return c.total>0?Math.round(c.total/60*100)/100:null;};
  const day=d=>{const e=by[d];const x=e&&e.x;const sites=sitesOf(d);const wd=D(d).getDay();const fer=isFerie(d);const worked=x?!!x.worked:(wd>=1&&wd<=5&&sites.length>0&&!(fer&&!gdPlanExpr(p,d)));
    return {sites,worked,ferie:fer&&wd>=1&&wd<=5,hours:hoursOf(d),N:x?x.N:0,L:x?x.L:0,D:x?x.D:0,ar:x?x.ar:0,cas:e?e.cas:0};};
  const c=cptRow(p.id);const W=navWeeks(ym);const up=W.length?navAddDay(W[0],-1):ym+'-01',last=W.length?navAddDay(W[W.length-1],6):ym+'-28';
  const rb=reportBalance(c.soldes.report,c.primes,up,m=>weekHours(p.id,m));const prime=c.primes.reduce((t,x)=>{const d=String(x.at||'').slice(0,10);return d>up&&d<=last?t+(+x.h||0):t;},0);
  const cpt={recup:c.on.recup&&c.soldes.recup&&isFinite(+c.soldes.recup.h)?+c.soldes.recup.h:null,report:c.on.report?rb.h:null,prime:Math.round(prime*100)/100}; /* soldes connus → cases vertes pré-remplies */
  const a=p.adresse||{};return buildNavette({ym,nom:p.nom||'',prenom:p.prenom||'',adresse:[a.voie,[a.cp,a.ville].filter(Boolean).join(' ')].filter(Boolean).join(' - '),day,today:fDate(todayIso()),contrat:c.contrat,cpt});}
const navFile=t=>String(t||'').normalize('NFD').replace(/[\u0300-\u036f]/g,'').replace(/[^A-Za-z0-9]+/g,'_').replace(/^_+|_+$/g,'');
async function navDownload(sheets,name){const bytes=await makeStyledXlsx(sheets,NAV_STYLES);const u=URL.createObjectURL(new Blob([bytes],{type:'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'}));const el=document.createElement('a');el.href=u;el.download=name;document.body.appendChild(el);el.click();el.remove();setTimeout(()=>URL.revokeObjectURL(u),2000);}
/* qui a une navette ce mois-ci : planifié, pointé ou en grand déplacement sur une des semaines du mois (ou un jour de régul.) */
function navPeople(ym){const W=navWeeks(ym);if(!W.length)return [];const first=navAddDay(W[0],-1),last=navAddDay(W[W.length-1],6);const [y,m]=ym.split('-').map(Number);const fin=ym+'-'+pad(new Date(y,m,0).getDate());const end=fin>last?fin:last;
  return gdPeople().filter(p=>{for(let d=first;d<=end;d=navAddDay(d,1)){if(planDe(p.id,d).length||ptDe(p.id,d))return true;}return false;}).sort((a,b)=>nomC(a).localeCompare(nomC(b),'fr'));}
function navSummary(N){const W=N.weeks;if(!W.length)return '';const miss=W.reduce((s,w)=>s+w.miss,0);const f=d=>d.slice(8)+'/'+d.slice(5,7);
  return `Semaines comptées : ${f(navAddDay(W[0].mon,-1))} → ${f(navAddDay(W[W.length-1].mon,6))} (jeudi dans le mois)${N.regulTo?' · fin du mois en régul. sur '+N.regulTo:''} · ${N.tot.hotel+N.tot.idf} hôtel${N.tot.hotel+N.tot.idf>1?'s':''}${N.tot.idf?' (dont '+N.tot.idf+' IDF)':''} · ${N.tot.repas} repas · ${['2','3','4'].filter(k=>N.ar[k]).map(k=>N.ar[k]+' trajet'+(N.ar[k]>1?'s':'')+' à '+({2:15,3:30,4:50})[k]+' €').join(' · ')||'pas de trajet indemnisé'} · HS : ${nb(N.hs.h125)} h à 125 %, ${nb(N.hs.h150)} h à 150 %${N.hs.report?` · <b style="color:#9a3412">${nb(N.hs.report)} h au-delà de 48 h → compteur à reporter</b>`:''}${miss?` · <b style="color:#9a3412">${miss} jour${miss>1?'s':''} travaillé${miss>1?'s':''} sans pointage</b> (heures à saisir dans l'Excel)`:''}`;}
export function espaceNavette(pid,ym){if(!DATA)DATA=buildData();const p=pers(pid);const N=navetteOf(p,ym);return {N,sheet:navetteSheet(N,nomC(p)),people:navPeople(ym).map(x=>x.id)};} /* tests / outillage */
function vGDPersonne(me,enc){const P=gdPeople().sort((a,b)=>nomC(a).localeCompare(nomC(b),'fr'));const pid=S.gdPid&&P.some(p=>p.id===S.gdPid)?S.gdPid:(P[0]&&P[0].id);const p=pid?pers(pid):null;const ym=S.gdMonth||ymOf(todayIso());
  const sel=`<div class="card" style="padding:8px 12px"><div class="eq-2sel"><div><label class="f" style="margin-top:0">Personne</label><select class="f" data-chg="gdPid">${P.map(x=>`<option value="${esc(x.id)}"${x.id===pid?' selected':''}>${esc(nomC(x))} — ${esc(POSTES_ESP[x.poste]?POSTES_ESP[x.poste].label:x.poste)}</option>`).join('')}</select></div><div><label class="f" style="margin-top:0">Mois</label><div class="eq-wkhead"><button class="eq-wkbtn" data-act="gdmonth" data-v="${ymAdd(ym,-1)}" aria-label="Mois précédent">‹</button><div class="eq-wktitle"><b>${MOIS_L[+ym.slice(5)-1]} ${ym.slice(0,4)}</b><span>${ym===ymOf(todayIso())?'ce mois-ci':ym<ymOf(todayIso())?'historique':'à venir'}</span></div><button class="eq-wkbtn" data-act="gdmonth" data-v="${ymAdd(ym,1)}" aria-label="Mois suivant">›</button></div></div></div></div>`;
  if(!p)return sel+'<div class="card"><div class="eq-s">Personne de terrain dans l\'annuaire.</div></div>';
  const W=gdMonthWeeks(ym);const CW=gdCalWeeks(ym);ensureWeeks([...new Set(W.concat(CW).flatMap(w=>[-1,0,1,2,3,4,5,6,7,8,9,10,11,12].map(i=>weekKey(semaineDe(w.k-i)[0]))))]);
  const a=p.adresse||{};const hk=addrKey(a);const loc=hk?GEOCODE[hk]:undefined;const q=hk?GEOQ[hk]:null;
  const rows=W.map(({mon,k})=>{const w=gdWeekOf(p,k);const wk=weekKey(mon);const acc=gdAccOf(p.id,wk);return {mon,k,wk,w,acc};});
  const M=gdMonthDays(p,ym);const TA=M.T.acc,TC=M.T.calc;
  const T={jours:0,acc:0,aacc:0,gd:0};rows.forEach(r=>{const src=r.acc?r.acc.accord:(r.w&&r.w.g.ok?gdSnap(r.w):null);if(!src)return;T.jours+=+src.jours||0;if(src.cas>1){T.gd++;if(r.acc)T.acc++;else T.aacc++;}});
  const line=r=>{const w=r.w;const js=semaineDe(r.k);const sites=w?w.ids.map(id=>site(id)).filter(c=>!c.bureau):[];const g=w&&w.g;const s2=w&&w.semaine;const src=r.acc?r.acc.accord:null;const cur=w&&g&&g.ok?gdSnap(w):null;const ch=src&&cur&&gdDiff(src,cur);
    return `<tr${r.mon>todayIso()?' class="dim"':''}><td><b>S${numSemaine(r.mon)}</b><div class="dim" style="font-size:11px">${fDate(js[0]).slice(0,5)} → ${fDate(js[4]).slice(0,5)}</div></td><td>${sites.length?sites.map(c=>esc(c.nom)).join('<br>'):'<span class="dim">pas planifié</span>'}${w?`<div class="dim" style="font-size:11px">${w.jours.filter(Boolean).length} j</div>`:''}</td><td>${g?(g.ok?`<b>cas ${g.cas.n}</b> · ~${g.km} km${s2&&s2.cycle>1?`<div style="font-size:11px">${s2.detente?'🏠 '+(s2.retWhy==='absence'?'retour (absent ensuite)':'détente '+(w.x?'(exception)':'(auto)')):'S'+(s2.idx+1)+'/'+s2.cycle+(w.x?' · réglé':'')}</div>`:''}`:`<span style="color:#7a5200;font-size:11.5px">${esc(g.why)}</span>`):'—'}</td><td class="num">${src?src.nuits:cur&&cur.cas>1?cur.nuits:'—'}</td><td class="num">${src?src.repas:cur&&cur.cas>1?cur.repas:'—'}</td><td class="num">${src?nb(src.eur)+' €':cur&&cur.cas>1?nb(cur.eur)+' €':'—'}</td><td>${r.acc?`<span class="eq-tag ${ch?'warn':'ok'}">${ch?'⚠ planning changé':'✓ accordé'}</span><div class="dim" style="font-size:10.5px">${esc(r.acc.by||'')} · ${fDate(String(r.acc.at||'').slice(0,10))}</div>${ch?`<div class="dim" style="font-size:10.5px">recalcul : ${cur.nuits} n · ${cur.repas} r · ${nb(cur.eur)} €</div>`:''}`:cur&&cur.cas>1?'<span class="eq-tag" style="color:#7a5200">à accorder</span>':''}${enc&&w&&g&&g.ok&&g.cas.n>1?`<div class="eq-acts" style="margin:4px 0 0">${r.acc?`<button class="btn sm" data-act="gdacc" data-v="${esc(p.id)}|${r.k}" title="Ré-accorder avec le planning actuel">↻</button><button class="btn sm" data-act="gdaccx" data-v="${esc(p.id)}|${r.wk}" title="Retirer l'accord" style="color:#9b2c22">✕</button>`:`<button class="btn sm primary" data-act="gdacc" data-v="${esc(p.id)}|${r.k}">✓ Accorder</button>`}</div>`:''}</td></tr>`;};
  const NAV=gdNavRows(p,ym,M);
  return sel+`<div class="card"><h3>${esc(nomC(p))} <span class="hint">· ${esc(POSTES_ESP[p.poste]?POSTES_ESP[p.poste].label:p.poste)}${p.type==='interim'?' · intérim':''}</span></h3>
      <div class="eq-s">🏠 ${a.ville?esc([a.voie,a.cp,a.ville].filter(Boolean).join(' ')):'<b style="color:#9b2c22">adresse inconnue</b>'} ${a.ville?(loc?(q&&q.src==='nom'?'<span class="eq-tag warn" title="Le code postal n\'a pas permis de la trouver : localisée par le nom de la ville seul — homonyme possible">📍 localisée par le nom seul</span>':'<span class="eq-tag ok">📍 localisée</span>'):loc===null?'<span class="eq-tag warn">⚠ introuvable — vérifie le code postal et la ville</span>':'<span class="eq-tag">localisation…</span>'):''} ${enc?`<button class="btn sm" data-act="fiche" data-v="${esc(p.id)}">Fiche</button>`:''}</div>
      <div class="ac-stats" style="margin:8px 0"><div class="ac-stat ${TA.N?'ok':''}"><b>${TA.N}</b><small>nuitées accordées${TC.N?' · +'+TC.N+' à accorder':''}</small></div><div class="ac-stat ${TA.R?'ok':''}"><b>${TA.R}</b><small>repas accordés${TC.R?' · +'+TC.R+' à accorder':''}</small></div><div class="ac-stat"><b>${String(TA.ar+TC.ar).replace('.',',')}</b><small>trajets A/R (détentes)</small></div><div class="ac-stat"><b>${nb(TA.eur+TC.eur)} €</b><small>indemnités trajet</small></div><div class="ac-stat ${T.aacc?'warn':T.acc?'ok':''}"><b>${T.acc} / ${T.acc+T.aacc}</b><small>semaines accordées</small></div>${M.T.adj?`<div class="ac-stat"><b>${M.T.adj}</b><small>jour${M.T.adj>1?'s':''} ajusté${M.T.adj>1?'s':''} à la main</small></div>`:''}</div>
      <div class="eq-lab">Le mois jour par jour <span class="dim">· 🌙 nuitée · 🍽 repas (m midi, s soir, ×2) · 🚗½ trajet · <span class="gd-key acc">accordé</span> <span class="gd-key calc">calculé, à accorder</span>${enc?' · touche un jour pour l\'ajuster':''}</span></div>
      ${gdCalHTML(p,ym,M,enc)}
      <div class="hint" style="margin-top:6px">La semaine GD commence le dimanche soir : le dimanche appartient à la semaine qui suit. Pas planifié le lundi (congé, férié) = pas de nuit du dimanche. 4 ou 5 jours travaillés = même forfait (dimanche soir → vendredi midi). Totaux = jours du mois (une semaine à cheval compte dans chaque mois pour ses jours).</div></div>
    <details class="card gd-navcard" ${S.gdNav?'open':''} data-gdnav="1"><summary style="cursor:pointer;font-size:13.5px"><b>Navette du mois</b> <span class="dim" style="font-size:12px">· feuille d'heures au format SCR (Excel) · base des variables de paie</span></summary>
      <div style="overflow:auto;margin-top:6px"><table class="rc gd-nav"><tr><th></th>${NAV.ds.map(d=>`<th class="${[0,6].includes(D(d).getDay())?'we':''}">${+d.slice(8)}</th>`).join('')}<th>Total</th></tr>${NAV.rows.map(r=>`<tr><td><b>${esc(r[0])}</b></td>${r.slice(1,-1).map((v,i)=>`<td class="num${[0,6].includes(D(NAV.ds[i]).getDay())?' we':''}">${esc(v)}</td>`).join('')}<td class="num"><b>${esc(r[r.length-1])}</b></td></tr>`).join('')}</table></div>
      <div class="eq-acts" style="margin-top:6px"><button class="btn sm primary" data-act="gdnavx" data-v="${esc(p.id)}|${ym}">⬇ Navette du mois (Excel, format SCR)</button>${enc?`<button class="btn sm" data-act="gdnavall" data-v="${ym}">⬇ Toutes les navettes du mois</button>`:''}<button class="btn sm" data-act="gdnavcsv" data-v="${esc(p.id)}|${ym}">⬇ Jours en colonnes (CSV)</button></div>
      <div class="hint gd-navsum" style="margin-top:6px">${(()=>{try{return navSummary(navetteOf(p,ym));}catch(e){console.warn(e);return '';}})()}</div></details>
    <div class="card"><h3>Semaine par semaine <span class="hint">· chantiers, cas, accords</span></h3>
      <div style="overflow:auto"><table class="rc af-tab"><tr><th>Semaine</th><th>Chantier(s)</th><th>Cas · cycle</th><th>Nuitées</th><th>Repas</th><th>Indemn.</th><th>Accord</th></tr>${rows.map(line).join('')}<tr class="tot"><td>Mois</td><td>${M.T.jours} j</td><td class="dim" style="font-size:11px">jours du mois</td><td class="num">${TA.N+TC.N}</td><td class="num">${TA.R+TC.R}</td><td class="num">${nb(TA.eur+TC.eur)} €</td><td>${T.acc} / ${T.acc+T.aacc}</td></tr></table></div>
      <div class="eq-acts" style="margin-top:8px"><button class="btn sm" data-act="gdcsv" data-v="${esc(p.id)}|${ym}">⬇ CSV des semaines</button>${enc&&T.aacc?`<button class="btn sm primary" data-act="gdaccmois" data-v="${esc(p.id)}|${ym}">✓ Accorder le mois (${T.aacc})</button>`:''}</div>
      <div class="hint" style="margin-top:6px">Une semaine accordée garde ses chiffres jour par jour (l'historique ne bouge plus) ; si le planning change ensuite, l'écart s'affiche et « ↻ » ré-accorde. Mois précédents = historique ; mois à venir = prévision d'après le planning.</div></div>`;}
/* ── ⑦ HEURES & PRODUCTION (rapport du responsable d'exploitation) + VARIABLES DE PAIE (export RH) — nuit 09→10/10.
   Heures DÉFINITIVES = pointages validés en second (conducteur) ; validées chef = en attente du conducteur ; déclarées = à traiter. Objectifs (④) et production (②) en face. ── */
function rapportSemaine(k){const js=semaineDe(k);const gens=DATA.personnes.filter(p=>p.active&&(can(p,'pointage.self')||DATA.pointages.some(x=>x.p===p.id&&js.includes(x.d))));
  const rows=gens.map(p=>{const pts=js.map(d=>ptDe(p.id,d)).filter(Boolean);const tot=pts.reduce((a,x)=>a+calc(x).total,0),pa=pts.reduce((a,x)=>a+(calc(x).pa||0),0),it=pts.reduce((a,x)=>a+(calc(x).it||0),0);const fin=pts.filter(x=>valFinal(x)).reduce((a,x)=>a+calc(x).total,0),chef=pts.filter(x=>!valFinal(x)&&x.val&&x.val.length).reduce((a,x)=>a+calc(x).total,0),att=pts.filter(x=>!x.val||!x.val.length).reduce((a,x)=>a+calc(x).total,0);
    const sites=[...new Set(pts.map(x=>x.site).filter(Boolean))];const obj=js.reduce((a,d)=>a+missionsFor(p,d).reduce((b,m)=>b+(+m.h||0),0),0);const prod={};js.forEach(d=>addProd(prod,prodJour([p.id],d)));const gd=gdWeekOf(p,k);
    return {p,n:pts.length,tot,pa,it,fin,chef,att,sites,obj,prod,manq:js.filter(d=>planDe(p.id,d).length&&!ptDe(p.id,d)).length,gd:gd&&gd.g.ok?gd:null};}).filter(r=>r.n||r.obj||r.manq);
  return {js,rows};}
function vHeuresProd(me){const k=S.rpWeek||0;const R=rapportSemaine(k);const js=R.js;const T=R.rows.reduce((a,r)=>{a.tot+=r.tot;a.fin+=r.fin;a.chef+=r.chef;a.att+=r.att;a.obj+=r.obj;a.soud+=(r.prod.soudures||0);a.manch+=(r.prod.retractions||0);a.manq+=r.manq;return a;},{tot:0,fin:0,chef:0,att:0,obj:0,soud:0,manch:0,manq:0});
  const row=r=>`<tr><td><b>${esc(nomC(r.p))}</b><div class="dim" style="font-size:11px">${esc((POSTES_ESP[r.p.poste]||{}).label||'')}${r.sites.length?' · '+r.sites.map(i=>esc(site(i).nom)).join(', '):''}</div></td><td class="num">${r.n}${r.manq?` <span class="eq-tag" style="color:#9b2c22">${r.manq} manquant${r.manq>1?'s':''}</span>`:''}</td><td class="num"><b>${fDuree(r.tot)}</b></td><td class="num">${r.fin?'<span style="color:#15673a">'+fDuree(r.fin)+'</span>':'—'}</td><td class="num">${r.chef?'<span style="color:#7a5200">'+fDuree(r.chef)+'</span>':'—'}</td><td class="num">${r.att?'<span style="color:#9b2c22">'+fDuree(r.att)+'</span>':'—'}</td><td class="num">${r.pa?fDuree(r.pa):'—'}</td><td class="num">${r.gd?'cas '+r.gd.g.cas.n+(r.gd.semaine&&r.gd.g.cas.n>1?' · '+r.gd.semaine.nuits+' n · '+r.gd.semaine.repas+' r':''):'—'}</td></tr>`;
  return `<div class="hint" style="margin:0 0 6px">Heures de la semaine par personne, telles qu'elles partent en paie — rien d'autre ici.</div><div class="eq-filtres">${[[-2,'S-2'],[-1,'Semaine dernière'],[0,'Cette semaine']].map(([n,t])=>`<button class="chip${k===n?' active':''}" data-act="rpweek" data-v="${n}">${t}</button>`).join('')}</div>
    <div class="ac-stats" style="margin-bottom:8px"><div class="ac-stat"><b>${fDuree(T.tot)}</b><small>heures pointées</small></div><div class="ac-stat ok"><b>${fDuree(T.fin)}</b><small>définitives (conducteur)</small></div><div class="ac-stat ${T.chef?'warn':''}"><b>${fDuree(T.chef)}</b><small>validées chef, attendent le conducteur</small></div><div class="ac-stat ${T.att?'bad':''}"><b>${fDuree(T.att)}</b><small>à valider</small></div>${T.manq?`<div class="ac-stat bad"><b>${T.manq}</b><small>jours planifiés sans pointage</small></div>`:''}</div>
    <div class="card"><h3>Semaine ${numSemaine(js[0])} <span class="hint">· du ${fDate(js[0]).slice(0,5)} au ${fDate(js[4])} · ${R.rows.length} personne${R.rows.length>1?'s':''}</span></h3>
      ${R.rows.length?`<div style="overflow:auto"><table class="rc af-tab"><tr><th>Personne</th><th>Jours</th><th>Pointé</th><th>Définitif</th><th>Chef</th><th>À valider</th><th>Pauses</th><th>GD</th></tr>${R.rows.map(row).join('')}</table></div>`:'<div class="eq-s">Aucun pointage ni objectif cette semaine.</div>'}
      <div class="eq-acts" style="margin-top:8px"><button class="btn primary" data-act="rpcsv" data-v="paie">⬇ Variables de paie (CSV, par jour)</button><button class="btn" data-act="rpcsv" data-v="semaine">⬇ Rapport de la semaine (CSV)</button></div>
      <div class="hint" style="margin-top:6px">La vue définitive pour la paie (12/10 : la forme exacte se cale avec la RH). Heures définitives = validées en second par le conducteur de travaux ; « chef » = validées par le chef de chantier, en attente ; « à valider » = déclarées ; GD = cas de grand déplacement de la semaine (cycle par personne, détentes). Une pause non pointée n'est jamais déduite. La production et les objectifs sont dans « Production par équipe ».</div></div>`;}
/* 12/10 (Ethan, rapport) : « objectifs par équipe et par chantier dans le bon ordre » — chantier → équipe → jour (lun → ven), heures estimées, fait / pas fait, avancement sur le plan */
/* ── 12/10 COMPTES CHANTIER v1 (Ethan : « créer des comptes chantier : chiffré vs réalisé par quantités posées ; facturé − heures − dépenses ») ──
   Par chantier : affaire(s) liée(s) → chiffré (marché, soudures chiffrées), facturé (situations) ; réalisé → soudures faites (fiches), heures pointées (toutes), notes de frais validées,
   bons de commande (lignes qte × pu, hors brouillon). Résultat indicatif = facturé − heures × taux chargé (hypothèse réglable, 45 €/h) − dépenses. */
const TAUX_H_DEFAUT=45;
function compteChantier(c){const affs=affAll().filter(a=>(a.sites||[]).includes(c.id));const net=netOf(c.id);
  const chiffre=affs.reduce((s,a)=>s+(+a.montant||calcAffaire(a).total||0),0),nbCh=affs.reduce((s,a)=>s+(calcAffaire(a).nb||0),0),facture=affs.reduce((s,a)=>s+factTotaux(a).cumul,0);
  const pts=POINTAGES.filter(x=>x.site===c.id);const min=pts.reduce((s,x)=>s+calc(x).total,0);const jours=new Set(pts.map(x=>x.d)).size;
  const nf=dbAll().filter(d=>d.site===c.id&&(d.etat==='valide'||d.etat==='rembourse')).reduce((s,d)=>s+(+d.montant||0),0);
  const bc=cmdAll().filter(x=>x.site===c.id&&x.etat!=='brouillon'&&!x.deleted).reduce((s,x)=>s+(x.lignes||[]).reduce((t,l)=>t+((+l.qte||0)*(+l.pu||0)),0),0);
  const faites=c.faites!=null?+c.faites:(net&&net.report&&net.report.done)||0;const total=c.soudures||0;
  const taux=+(PL_RULES.tauxH||TAUX_H_DEFAUT);const mo=Math.round(min/60*taux);const result=facture-mo-nf-bc;
  return {c,affs,chiffre,nbCh,facture,min,jours,nf,bc,faites,total,taux,mo,result};}
function cComptesChantier(me){const js=semaineDe(0);const sc=objScope(me,js);const score=r=>(r.affs.length?8:0)+(r.facture?4:0)+(r.min?2:0)+((r.nf||r.bc)?1:0);const rows=sc.sites.map(compteChantier).sort((a,b)=>score(b)-score(a)); /* tous les chantiers du périmètre, ceux qui ont des chiffres d'abord */
  const T=rows.reduce((a,r)=>{a.chiffre+=r.chiffre;a.facture+=r.facture;a.min+=r.min;a.nf+=r.nf;a.bc+=r.bc;a.mo+=r.mo;a.result+=r.result;return a;},{chiffre:0,facture:0,min:0,nf:0,bc:0,mo:0,result:0});
  const eur=x=>nb(Math.round(x))+' €';const pct=(a,b)=>b?Math.round(a/b*100)+' %':'—';
  return `<div class="ac-stats" style="margin-bottom:8px"><div class="ac-stat"><b>${eur(T.chiffre)}</b><small>chiffré (marchés liés)</small></div><div class="ac-stat"><b>${eur(T.facture)}</b><small>facturé (situations)</small></div><div class="ac-stat"><b>${fDuree(T.min)}</b><small>heures pointées · ${eur(T.mo)}</small></div><div class="ac-stat"><b>${eur(T.nf+T.bc)}</b><small>dépenses (notes de frais + bons)</small></div><div class="ac-stat ${T.result<0?'bad':'ok'}"><b>${eur(T.result)}</b><small>résultat indicatif</small></div></div>
    <div class="card"><h3>Comptes chantier <span class="hint">· ${rows.length} chantier${rows.length>1?'s':''} · taux chargé ${T.min?nb(rows[0].taux):TAUX_H_DEFAUT} €/h (hypothèse)</span></h3>
    ${rows.length?`<div style="overflow:auto"><table class="rc af-tab"><tr><th>Chantier</th><th>Affaire</th><th>Chiffré</th><th>Facturé</th><th>Soudures</th><th>Heures</th><th>Main-d'œuvre</th><th>Dépenses</th><th>Résultat</th></tr>${rows.map(r=>`<tr><td><b>${esc(r.c.nom)}</b><div class="dim" style="font-size:11px">${esc(r.c.ville||'')}</div></td><td>${r.affs.map(a=>esc(a.num)).join('<br>')||'<span class="dim">non liée</span>'}</td><td class="num">${r.chiffre?eur(r.chiffre):'—'}</td><td class="num">${r.facture?eur(r.facture)+'<div class="dim" style="font-size:11px">'+pct(r.facture,r.chiffre)+'</div>':'—'}</td><td class="num">${r.total?r.faites+' / '+r.total+(r.nbCh?'<div class="dim" style="font-size:11px">chiffrées : '+r.nbCh+'</div>':''):'—'}</td><td class="num">${r.min?fDuree(r.min)+'<div class="dim" style="font-size:11px">'+r.jours+' j</div>':'—'}</td><td class="num">${r.mo?eur(r.mo):'—'}</td><td class="num">${(r.nf+r.bc)?eur(r.nf+r.bc)+'<div class="dim" style="font-size:11px">'+(r.nf?'frais '+eur(r.nf):'')+(r.nf&&r.bc?' · ':'')+(r.bc?'bons '+eur(r.bc):'')+'</div>':'—'}</td><td class="num" style="font-weight:700;color:${r.result<0?'#9b2c22':'#15673a'}">${r.facture||r.mo||r.nf||r.bc?eur(r.result):'—'}</td></tr>`).join('')}</table></div>`:'<div class="eq-s">Aucun chantier dans ton périmètre.</div>'}
    <div class="hint" style="margin-top:6px">Chiffré = montant du marché de l'affaire liée (Commerce → affaire → Chantiers liés), sinon le chiffrage ; facturé = situations enregistrées ; soudures = fiches de soudure du chantier ; heures = tous les pointages sur le chantier (déclarées comprises) ; dépenses = notes de frais validées + bons de commande hors brouillon. Résultat = facturé − heures × taux chargé − dépenses : <b>indicatif</b>, le compte réel se fait sur la paie et les factures fournisseurs.</div></div>`;}
function cObjSemaine(me,js){const sc=objScope(me,js);const wk=weekKey(js[0]);const aff=(PLANNING[wk]||{}).aff||{};const blocks=[];
  sc.sites.forEach(c=>{const net=netOf(c.id);if(!net)return;const byTeam={};js.forEach(d=>missionsOf(net,d).forEach(m=>{if(sc.teams[c.id]&&m.team&&m.team!==sc.teams[c.id])return;const t=m.team||'';(byTeam[t]=byTeam[t]||[]).push(Object.assign({_d:d,_site:c.id},m));}));
    const teams=Object.keys(byTeam).sort((a,b)=>a===''?1:b===''?-1:a.localeCompare(b));if(!teams.length)return;
    const all=teams.flatMap(t=>byTeam[t]);const tot={n:all.length,h:all.reduce((a,m)=>a+(+m.h||0),0),done:all.filter(m=>m.done).length};
    blocks.push(`<div class="eq-objsite"><div class="ac-h"><b>📍 ${esc(c.nom)}</b><span>${tot.n} mission${tot.n>1?'s':''} · ${hTxt(tot.h)} estimées · ${tot.done} faite${tot.done>1?'s':''}</span></div>
      ${teams.map(t=>{const L=byTeam[t].slice().sort((a,b)=>a._d.localeCompare(b._d)||String(a.at||'').localeCompare(String(b.at||'')));const th=L.reduce((a,m)=>a+(+m.h||0),0);const who=t?DATA.personnes.filter(p=>teamOf(aff,p.id,c.id)===t&&js.some(d=>planDe(p.id,d).includes(c.id))).map(p=>p.prenom):[];
        return `<div class="eq-objteamblk"><div class="eq-lab" style="margin-top:6px">${t?'Équipe '+t:'Tout le chantier'}${who.length?' <span class="dim">· '+who.map(esc).join(', ')+'</span>':''} · ${L.length} · ${hTxt(th)}</div><table class="rc af-tab"><tr><th>Jour</th><th>Mission</th><th>Estimé</th><th>Sur le plan</th><th>État</th></tr>${L.map(m=>{const pr=objOnPlan(m)&&A.objProgress?A.objProgress(c.id,m):null;return `<tr><td>${esc(fJour(m._d))}</td><td>${esc(mtype(m.type)[2])} ${esc(m.label||mtype(m.type)[1])}${m.who&&m.who.length?' <span class="dim">· '+m.who.map(k=>esc(pers(k).prenom)).join(', ')+'</span>':''}</td><td class="num">${hTxt(m.h)}</td><td>${objOnPlan(m)?esc(objPlanTxt(m))+(pr&&pr.n?' · '+pr.done+' / '+pr.n+' ✓':''):'—'}</td><td>${m.done?'<span style="color:#15673a">✓ faite'+(m.done.by?' · '+esc(m.done.by):'')+'</span>':m._d<todayIso()?'<span style="color:#9b2c22">pas faite</span>':'<span class="dim">à venir</span>'}</td></tr>`;}).join('')}</table></div>`;}).join('')}</div>`);});
  return `<div class="card"><h3>Objectifs de la semaine <span class="hint">· par chantier → équipe → jour</span></h3>${blocks.join('')||'<div class="eq-s">Aucun objectif posé cette semaine'+(sc.large?'':' sur tes chantiers')+'.</div>'}</div>`;}
function rapportCSV(mode){const k=S.rpWeek||0;const R=rapportSemaine(k);const q=v=>'"'+String(v===undefined||v===null?'':v).replace(/"/g,'""')+'"';const h=m=>String(Math.round(m/6)/10).replace('.',',');const L=[];
  if(mode==='paie'){L.push(['Date','Nom','Prénom','Poste','E-mail','Chantier','Début','Fin','Pause (h)','Inter-chantier (h)','Total (h)','Statut','Validé par','Objectif (h)','Soudures','Manchons','Fils DH','GD cas','Nuitées sem.','Repas sem.','Indemnité trajet sem. (€)'].map(q).join(';'));
    R.rows.forEach(r=>R.js.forEach(d=>{const x=ptDe(r.p.id,d);if(!x)return;const c=calc(x);const st=statutPt(x);const ms=missionsFor(r.p,d);const pr=prodJour([r.p.id],d);const g=r.gd;
      L.push([fDate(d),r.p.nom,r.p.prenom,(POSTES_ESP[r.p.poste]||{}).label||r.p.poste,r.p.email||'',site(x.site).nom,c.debut?fHeure(c.debut):'',c.fin?fHeure(c.fin):'',h(c.pa||0),h(c.it||0),h(c.total),valFinal(x)?'définitif':(x.val&&x.val.length)?'validé chef':x.status==='corrige'?'corrigé':'déclaré',(x.val||[]).map(v=>nomC(pers(v.by))).join(' / '),ms.reduce((a,m)=>a+(+m.h||0),0)||'',pr.soudures||'',pr.retractions||'',pr.fils||'',g?g.g.cas.n:'',g&&g.semaine?g.semaine.nuits:'',g&&g.semaine?g.semaine.repas:'',g&&g.semaine?g.semaine.eur:''].map(v=>typeof v==='number'?String(v).replace('.',','):q(v)).join(';'));}));}
  else{L.push(['Semaine','Nom','Prénom','Poste','Jours pointés','Jours planifiés sans pointage','Heures pointées','Heures définitives','Heures validées chef','Heures à valider','Pauses (h)','Objectifs (h)','Soudures','Manchons','Fils DH','Chantiers','GD cas'].map(q).join(';'));
    R.rows.forEach(r=>L.push([numSemaine(R.js[0]),r.p.nom,r.p.prenom,(POSTES_ESP[r.p.poste]||{}).label||r.p.poste,r.n,r.manq,h(r.tot),h(r.fin),h(r.chef),h(r.att),h(r.pa),r.obj||'',r.prod.soudures||'',r.prod.retractions||'',r.prod.fils||'',r.sites.map(i=>site(i).nom).join(' / '),r.gd?r.gd.g.cas.n:''].map(v=>typeof v==='number'?String(v).replace('.',','):q(v)).join(';')));}
  return '﻿'+L.join('\n');}
function cMesDebours(me){const L=dbDe(me.id);return `<div class="card"><h3>🧾 Mes notes de frais <span class="hint">· ${L.length?L.length+' · '+L.filter(d=>d.etat==='saisi').length+' à valider':'aucun'}</span></h3>${L.length?dbListHTML(cmdCtx(me),true).replace(/<div class="ac-stats"[\s\S]*?<\/div><\/div>/,''):'<div class="eq-s">Une dépense avancée pour le chantier (carburant, péage, hébergement, repas…) : saisis-la ici, ton conducteur valide, le bureau rembourse.</div><div class="eq-acts" style="margin-top:8px"><button class="btn primary" data-act="cmd" data-v="dbnew|">➕ Débours</button></div>'}</div>`;}
/* 11/10 (Ethan) : « le menu objectifs doit reprendre visuellement le planning : les équipes, le chantier, et tu mets l'objectif que tu veux à l'équipe » ;
   « des notions de jours : un chef qui a anticipé peut planifier la semaine de son équipe » ; « poser sur plan : soit des soudures (2 d'affilée = un tronçon, 4 d'affilée = le tronçon des 4), soit début / fin » */
const objOnPlan=m=>!!(m&&((Array.isArray(m.tr)&&m.tr.length)||(Array.isArray(m.welds)&&m.welds.length)));
const objPlanTxt=m=>{if(!objOnPlan(m))return '';const pr=A.objProgress?A.objProgress(m._site||S.objSite,m):null;const n=pr&&pr.n?pr.n:(Array.isArray(m.welds)?m.welds.length:0);const lab=m.type==='manch'?'manchon':'soudure';const dn=pr&&pr.byDn&&pr.byDn.length?' · '+pr.byDn.map(x=>'DN '+(x.dn||'?')+' × '+x.n+(x.done?' ('+x.done+' ✓)':'')).join(' · '):'';return (m.tr&&m.tr.length?'📐 '+(m.trName||'tronçon sur le plan'):'')+(n?(m.tr&&m.tr.length?' · ':'')+'🔧 '+n+' '+lab+(n>1?'s':'')+(pr&&pr.n?' ('+pr.done+'/'+pr.n+' ✓)':'')+dn:'');}; /* 11/10 : le nombre de soudures que le tronçon induit, et l'avancement (manchonnage : manchons posés) */
/* à qui s'adresse une mission : personnes ciblées, sinon l'équipe (lettre du planning ce jour-là), sinon tout le chantier */
/* équipes placées sur un chantier un jour donné (pour « ＋ Poser » → objectif, depuis le plan) : [{t:'A', members:[{id,prenom}]}] + les sans équipe */
export function espaceTeamsOn(siteId,day){if(!DATA)DATA=buildData();day=day||todayIso();const wk=weekKey(day);const aff=(PLANNING[wk]||{}).aff||{};const eq=DATA.personnes.filter(p=>planDe(p.id,day).includes(siteId));const out={};eq.forEach(p=>{const t=teamOf(aff,p.id,siteId)||'';(out[t]=out[t]||[]).push({id:p.id,prenom:p.prenom,nom:p.nom,poste:p.poste});});return Object.keys(out).sort().map(t=>({t,members:out[t]}));}
export function espaceMissionFor(m,key,siteId,day){if(!m)return false;if(Array.isArray(m.who)&&m.who.length)return m.who.includes(key);if(m.team){const aff=(PLANNING[weekKey(day)]||{}).aff||{};return teamOf(aff,key,siteId)===m.team;}return true;}
/* 11/10 (Ethan) : « les conducteurs de travaux et chefs de chantier ne doivent voir que leur propre équipe ou chantier » — périmètre de la vue :
   direction / responsables d'exploitation / admin : tous les chantiers (du secteur s'il en a un) ; conducteur : ses chantiers (fiche ou placement de la semaine) ;
   chef de chantier : ses chantiers, et seulement SON équipe sur un chantier dont il n'est pas le chef en fiche */
function objScope(me,js){const all=DATA.chantiers.filter(c=>!c.bureau);const wk=weekKey(js[0]);const aff=(PLANNING[wk]||{}).aff||{};
  const mineFirst=L=>{const own=new Set(mesSites(me).map(c=>c.id).concat(js.flatMap(d=>planDe(me.id,d))));const rank=c=>(own.has(c.id)?0:2)+(netOf(c.id)?0:1);return L.slice().sort((a,b)=>rank(a)-rank(b));}; /* mes chantiers d'abord, puis les chargés, puis les autres */
  if(me.admin||accueilType(me)==='direction'||accueilType(me)==='rh'){const sect=mySecteur(me);return {sites:mineFirst(sect?all.filter(c=>!c.secteur||c.secteur===sect):all),teams:{},large:true};}
  const fiche=mesSites(me).map(c=>c.id);const placed=new Set(js.flatMap(d=>planDe(me.id,d)));const ids=new Set([...fiche,...placed]);const sites=all.filter(c=>ids.has(c.id));
  const teams={};if(me.poste==='chef')sites.forEach(c=>{const t=teamOf(aff,me.id,c.id);if(t&&!fiche.includes(c.id)&&c.chef&&c.chef!==me.id)teams[c.id]=t;});
  return {sites,teams,large:false};}
function vObjectifs(me){const k=S.objWeek||0;const js=semaineDe(k);const today=todayIso();const day=S.objDay&&js.includes(S.objDay)?S.objDay:(js.includes(today)?today:js[0]);S.objDay=day;const wk=weekKey(day);const affD=(PLANNING[wk]||{}).aff||{};
  const scope=objScope(me,js);const mine=scope.sites;const nets=netsLocal();
  const whoTxt=(m,members)=>Array.isArray(m.who)&&m.who.length?'→ '+m.who.map(x=>pers(x).prenom).join(', '):m.team?'toute l\'équipe '+m.team+(members&&members.length?' ('+members.map(p=>p.prenom).join(', ')+')':''):'tout le chantier';
  const row=(c,m,members)=>`<div class="eq-row eq-objrow${m.done?' done':''}"><span class="ic" style="font-size:18px;width:28px;text-align:center">${mtype(m.type)[2]}</span><span class="eq-grow"><span class="eq-t">${esc(m.label||mtype(m.type)[1])}${m.done?' <span class="eq-tag" style="color:#15673a">✓ faite</span>':''}</span><span class="eq-s">${esc(mtype(m.type)[1])} · <b>${hTxt(m.h)}</b> estimées · ${esc(whoTxt(m,members))}${m.by?' · posé par '+esc(m.by):''}${objOnPlan(m)?'<br>'+objPlanTxt(Object.assign({_site:c.id},m)):''}</span></span><span class="eq-acts" style="margin:0">${netOf(c.id)?`<button class="btn sm" data-act="objmap" data-v="${esc(c.id)}|${esc(m.id)}" title="${objOnPlan(m)?'Voir sur le plan':'Poser sur le plan (soudures ou tronçon)'}">${objOnPlan(m)?'🗺':'📐'}</button>`:''}<button class="btn sm" data-act="objdone" data-v="${esc(c.id)}|${esc(m.id)}" title="faite / pas faite">${m.done?'↩':'✓'}</button><button class="btn sm" data-act="objrm" data-v="${esc(c.id)}|${esc(m.id)}" style="color:#9b2c22">✕</button></span></div>`;
  const chip=p=>`<span class="eq-objp">${avatar(p)}<b>${esc(p.prenom)}</b>${p.poste==='chef'?' <small>🦺</small>':''}</span>`;
  const form=(c,team,members)=>{const all=DATA.personnes.filter(p=>planDe(p.id,day).includes(c.id));const pool=team?members:all;
    return `<div class="eq-form eq-objform" style="margin-top:8px"><div class="eq-s" style="margin-bottom:6px"><b>Nouvel objectif</b> · ${team?'équipe '+team:'tout le chantier'} · ${fJour(day)}</div>
      <div class="row" style="display:flex;gap:6px;flex-wrap:wrap"><div style="flex:1;min-width:130px"><label class="f">Type</label><select class="f" id="obj-type">${MTYPES.map(t=>`<option value="${t[0]}">${t[2]} ${t[1]}</option>`).join('')}</select></div><div style="flex:0 0 90px"><label class="f">Heures</label><input class="f" id="obj-h" type="number" min="0.5" step="0.5" value="8"></div></div>
      <label class="f" style="margin-top:6px">Mission</label><input class="f" id="obj-label" placeholder="ex. souder le tronçon 3 (DN 250, 18 soudures)">
      <label class="f" style="margin-top:6px">Jours <span class="dim">(le même objectif chaque jour coché — pour planifier la semaine)</span></label><div class="eq-opts" id="obj-days">${js.map(d=>`<button class="chip${d===day?' active':''}" data-objday="${d}" type="button">${fJour(d).slice(0,4)} ${d.slice(8,10)}</button>`).join('')}</div>
      <label class="f" style="margin-top:6px">Pour qui <span class="dim">(rien de coché = ${team?'toute l\'équipe '+team:'tout le chantier'} ; coche pour cibler quelqu\'un)</span></label>${!team&&plTeamsUsed(affD,c.id,js).length?`<div class="eq-teams" style="margin:0 0 6px"><span class="eq-s">Équipe :</span>${plTeamsUsed(affD,c.id,js).map(t=>`<button class="eq-tb t-${t}${S.objTeamSel===t?' on':''}" data-act="objteam" data-v="${esc(c.id)}|${t}" title="Équipe ${t}">${t}</button>`).join('')}<span class="hint">coche toute l'équipe d'un coup</span></div>`:''}<div style="display:flex;gap:6px;flex-wrap:wrap">${pool.map(p=>{const t=teamOf(affD,p.id,c.id);return `<label class="chip" style="cursor:pointer"><input type="checkbox" data-objwho="${esc(p.id)}" data-objteamof="${esc(t)}" style="margin-right:4px">${esc(p.prenom)}${t&&!team?` <i class="eq-team t-${t}" style="margin-left:3px">${t}</i>`:''}</label>`;}).join('')||'<span class="hint">personne n\'est placé ici ce jour-là (planning)</span>'}</div>
      <div class="eq-acts" style="margin-top:8px"><button class="btn primary" data-act="objok" data-v="${esc(c.id)}">Poser l'objectif</button><button class="btn" data-act="objplan" data-v="${esc(c.id)}" title="Sur le plan : touche des soudures une à une, ou la conduite au début puis à la fin du tronçon">📐 Poser sur le plan</button><button class="btn" data-act="objadd" data-v="">Annuler</button></div></div>`;};
  const card=c=>{const net=nets.find(n=>n.id===c.id);const only=scope.teams[c.id]||'';const ms=net?missionsOf(net,day).filter(m=>!only||m.team===only):[];const eq=DATA.personnes.filter(p=>planDe(p.id,day).includes(c.id)&&(!only||teamOf(affD,p.id,c.id)===only));const h=ms.reduce((a,m)=>a+(+m.h||0),0);const cap=eq.length*8;
    const chefs=eq.filter(p=>p.poste==='chef'),reste=eq.filter(p=>p.poste!=='chef');const teams=[...new Set(reste.map(p=>teamOf(affD,p.id,c.id)))].filter(Boolean).sort();const members=t=>eq.filter(p=>teamOf(affD,p.id,c.id)===t);
    const adding=S.objSite===c.id;const addBtn=t=>net?`<button class="btn sm${ms.length||t?'':' primary'}" data-act="objadd" data-v="${esc(c.id)}|${t||''}">➕ Objectif${t?' équipe '+t:teams.length?' · tout le chantier / quelqu\'un':''}</button>`:'';
    const bloc=t=>{const L=t?members(t):reste.filter(p=>!teamOf(affD,p.id,c.id));const M=ms.filter(m=>t?m.team===t:!m.team);if(t&&!L.length&&!M.length)return '';const chef=chefs.find(p=>teamOf(affD,p.id,c.id)===t);const hh=M.reduce((a,m)=>a+(+m.h||0),0);
      return `<div class="eq-objteam"><div class="eq-plteam t-${t||'0'}"><b>${t?'Équipe '+t:(teams.length?'Sans équipe · tout le chantier':'L\'équipe du jour')}</b>${chef?' · chef : '+esc(chef.prenom):''}${L.length?' · '+L.length:''}${M.length?' · <span class="eq-objh">'+hTxt(hh)+' estimées'+(L.length?' / '+hTxt(L.length*8):'')+'</span>':''}</div>
        <div class="eq-objpeople">${L.map(chip).join('')||(t?'':'<span class="eq-s">personne ce jour-là (planning)</span>')}</div>
        ${M.length?`<div class="eq-list">${M.map(m=>row(c,m,t?L:null)).join('')}</div>`:`<div class="eq-s eq-objnone">Aucun objectif ${t?'pour l\'équipe '+t:''} ${fJour(day).slice(0,4)}</div>`}
        ${adding&&(S.objTeam||'')===(t||'')?form(c,t,L):`<div class="eq-acts" style="margin:6px 0 0">${addBtn(t)}</div>`}</div>`;};
    const mt=meteoDe(c.id,day),M=mt?METEO[mt.k]:null;
    return `<div class="card eq-plsite eq-objsite"><div class="eq-plhead"><span class="eq-grow"><span class="eq-big">📍 ${esc(c.nom)}</span><span class="eq-s">${esc(c.ville||'')}${c.secteur?(c.ville?' · ':'')+esc(SECTEURS[c.secteur]||c.secteur):''} · ${eq.length} personne${eq.length>1?'s':''} ${fJour(day).slice(0,4)}${M?' · '+M[0]+' '+M[1]+' '+mt.t+' °C'+(mt.mm?' · '+mt.mm+' mm':''):''}${net?'':' · <b>pas chargé sur cet appareil</b> (ouvre-le une fois)'}</span></span><span class="eq-plcount${ms.length?'':' vide'}" title="objectifs ce jour-là">${ms.length}</span></div>
      ${only?`<div class="eq-s" style="margin:4px 0 0">Ton équipe ${only} sur ce chantier${c.chef?' · chef du chantier : '+esc(pers(c.chef).prenom):''}</div>`:''}
      ${chefs.length&&!only?`<div class="eq-objpeople eq-plchefs">${chefs.map(chip).join('')}</div>`:''}
      ${only?bloc(only):teams.map(bloc).join('')+bloc('')}
      ${ms.length?`<div class="eq-s" style="margin-top:6px"><b>${hTxt(h)}</b> estimées pour ${eq.length?hTxt(cap)+' d\'équipe (8 h × '+eq.length+')':'une équipe pas encore placée'}${eq.length&&h>cap*1.3?' — <span style="color:#7a5200">ambitieux, mais ce n\'est pas un plafond</span>':''}</div>`:''}</div>`;};
  const nWeek=d=>mine.reduce((a,c)=>a+missionsOf(netOf(c.id),d).filter(m=>!scope.teams[c.id]||m.team===scope.teams[c.id]).length,0);
  return `<div class="eq-nav"><button class="btn" data-act="objweek" data-v="${k-1}">◀</button><div class="eq-filtres" style="padding:0;flex:1">${[[-1,'Semaine passée'],[0,'Cette semaine'],[1,'Semaine prochaine']].map(([n,t])=>`<button class="chip${k===n?' active':''}" data-act="objweek" data-v="${n}">${t}</button>`).join('')}</div><button class="btn" data-act="objweek" data-v="${k+1}">▶</button></div>
    <div class="eq-filtres">${js.map(j=>{const n=nWeek(j);return `<button class="chip${j===day?' active':''}" data-act="objday" data-v="${j}">${fJour(j)}${j===today?' · auj.':''}${n?` <i class="eq-objn">${n}</i>`:''}</button>`;}).join('')}</div>
    <div class="hint" style="margin:0 0 8px">Semaine ${numSemaine(js[0])} · un objectif = une mission avec un temps estimé pour une <b>équipe</b> (ou quelqu'un de ciblé), posé par jour — coche plusieurs jours pour planifier la semaine. Sur le plan : des soudures ou un tronçon ; l'équipe le voit en surbrillance 🎯 et sur son accueil. Ce n'est <b>pas un plafond</b>.</div>
    ${mine.map(card).join('')||`<div class="card"><div class="eq-s">${scope.large?'Aucun chantier.':'Aucun chantier à toi cette semaine-là : tu vois ici les chantiers dont tu es chef ou conducteur (fiche) et ceux où tu es placé au planning.'}</div></div>`}`;}
function saveMissions(siteId,day,list){const net=netOf(siteId);if(net){net.missions=net.missions||{};net.missions[day]=list;}if(A.saveMissions)A.saveMissions(siteId,day,list);}
/* équipe visée : les cochés = exactement les membres d'une équipe du planning ce jour-là → on garde la lettre (affichage « équipe A ») */
function objTeamOf(who){if(!who||!who.length)return null;const day=S.objDay||todayIso();const site=S.objSite;if(!site)return null;const wk=weekKey(day);const affD=(PLANNING[wk]||{}).aff||{};const t=teamOf(affD,who[0],site);if(!t)return null;const members=DATA.personnes.filter(p=>planDe(p.id,day).includes(site)&&teamOf(affD,p.id,site)===t).map(p=>p.id);return members.length&&members.every(k=>who.includes(k))&&who.every(k=>members.includes(k))?t:null;}
/* lecture du formulaire : type, heures, libellé, jours cochés, personnes ciblées, équipe (celle du bouton ➕, sinon déduite des cochés) */
function objDraft(site){const type=$id('obj-type').value,h=parseFloat(String($id('obj-h').value).replace(',','.')),label=$id('obj-label').value.trim();if(!(h>0)){msg('Un temps estimé en heures');return null;}
  const days=[...document.querySelectorAll('#obj-days .chip.active')].map(b=>b.dataset.objday);const day=S.objDay||todayIso();
  let who=[...document.querySelectorAll('#eq-app [data-objwho]:checked')].map(i=>i.dataset.objwho);let team=S.objTeam||objTeamOf(who)||undefined;
  if(team&&who.length){const wk=weekKey(day);const affD=(PLANNING[wk]||{}).aff||{};const members=DATA.personnes.filter(p=>planDe(p.id,day).includes(site)&&teamOf(affD,p.id,site)===team).map(p=>p.id);if(members.length&&members.every(k=>who.includes(k))&&who.every(k=>members.includes(k)))who=[];} /* toute l'équipe cochée = l'équipe, pas des cibles */
  return {type,h,label:label||mtype(type)[1],who,team,days:days.length?days:[day]};}
const newMission=(d,extra)=>Object.assign({id:'M'+Date.now().toString(36)+Math.random().toString(36).slice(2,5),type:d.type||'autre',label:d.label||mtype(d.type||'autre')[1],h:+d.h||0,who:d.who||[],team:d.team||undefined,by:A.current?nomC(pers(personKey(A.current()))):nomC(pers(S.me)),at:new Date().toISOString()},A.via&&A.via()?{via:A.via()}:{},extra||{});
/* objectif posé sur le plan (app.js, au « Poser l'objectif » de la barre) : nouvelle mission (sur chaque jour coché) avec son tronçon et/ou ses soudures, ou tronçon ajouté à une mission existante (draft.mid) */
export function espaceObjPosed(siteId,day,draft,tr,trName,welds){const net=netOf(siteId);if(!net)return null;draft=draft||{};let first=null;
  if(draft.mid){const list=missionsOf(net,day).slice();const m=list.find(x=>x.id===draft.mid);if(m){m.tr=tr;m.trName=trName;m.welds=welds&&welds.length?welds:undefined;saveMissions(siteId,day,list);return m;}}
  const days=Array.isArray(draft.days)&&draft.days.length?draft.days:[day];days.forEach(d=>{const list=missionsOf(net,d).slice();const m=newMission(draft,{tr,trName,welds:welds&&welds.length?welds:undefined});list.push(m);saveMissions(siteId,d,list);if(d===day||!first)first=m;});return first;}
function vMesChantiersX(me){const nets=netsLocal();const mine=mesSites(me).length?mesSites(me):DATA.chantiers.filter(c=>!c.bureau);
  return `<button class="ac-back" data-act="xsub" data-v="">‹ Exploitation</button><h2 class="vt">Mes chantiers <span class="hint">· ${mine.length} · tableau de bord</span></h2>${mine.map(c=>{const net=nets.find(n=>n.id===c.id);const D=net?dashOf(net,me):null;const b=D?DASH_DEF.filter(x=>D[x[0]].k==='bad').length:0,w=D?DASH_DEF.filter(x=>D[x[0]].k==='warn').length:0,ok=D?DASH_DEF.filter(x=>D[x[0]].k==='ok').length:0;const nb=D&&D.$.charge?D.$.n:(c.soudures||0),fa=D&&D.$.charge?D.$.soud:(c.faites||0);const pc=nb?Math.round(100*fa/nb):0;
    return `<button class="ac-row" data-act="xsub" data-v="dash:${esc(c.id)}"><span class="ic" style="background:#e8f0fb">📍</span><span class="tx"><b>${esc(c.nom)}</b><small>${esc(c.ville||'')}${c.secteur?' · '+esc(SECTEURS[c.secteur]||c.secteur):''} · ${pc} % soudé${D?' · <span class="eq-tag" style="color:#15673a">✓ '+ok+' / '+DASH_DEF.length+'</span>'+(b?' <span class="eq-tag" style="color:#9b2c22">✗ '+b+'</span>':'')+(w?' <span class="eq-tag" style="color:#7a5200">! '+w+'</span>':''):' · pas chargé sur cet appareil'}</small></span><span class="chev">${CHEV}</span></button>`;}).join('')||'<div class="card"><div class="eq-s">Aucun chantier.</div></div>'}`;}
/* 12/10 soir : récap d'un chantier pour la carte « Mes chantiers » (sous la carte) — le tableau de bord complet, c'est le Bureau du chantier */
export function espaceDashSummary(id){if(!DATA)DATA=buildData();const acc=A.current();const me=DATA.personnes.find(p=>p.id===personKey(acc))||null;const net=netOf(id);const c=site(id);if(!me||!c||c.stub)return null;
  const today0=todayIso();const mine0=mesSites(me).some(x=>x.id===id)||semaineDe(0).some(d=>planDe(me.id,d).includes(id));
  if(!net){const nb=c.soudures||0,fa=c.faites||0;return {light:true,pc:nb?Math.round(100*fa/nb):0,nb,fa,ok:0,total:0,bad:[],warn:[],badS:[],pres:DATA.personnes.filter(p=>p.active&&planDe(p.id,today0).includes(id)).length,ms:0,chef:c.chef?nomC(pers(c.chef)):'',mine:mine0};} /* chantier pas encore ouvert sur cet appareil : récap léger (serveur), le détail vient à la première ouverture */
  try{const D=dashOf(net,me);const bad=DASH_DEF.filter(x=>D[x[0]]&&D[x[0]].k==='bad'),warn=DASH_DEF.filter(x=>D[x[0]]&&D[x[0]].k==='warn'),ok=DASH_DEF.filter(x=>D[x[0]]&&D[x[0]].k==='ok').length;const nb=D.$.charge?D.$.n:(c.soudures||0),fa=D.$.charge?D.$.soud:(c.faites||0);
    const today=todayIso();const pres=DATA.personnes.filter(p=>p.active&&planDe(p.id,today).includes(id)).length;const ms=missionsOf(net,today).length;
    return {pc:nb?Math.round(100*fa/nb):0,nb,fa,ok,total:DASH_DEF.length,bad:bad.map(x=>x[4]||x[1]),warn:warn.map(x=>x[4]||x[1]),badS:bad.map(x=>D[x[0]].v),pres,ms,chef:c.chef?nomC(pers(c.chef)):'',mine:mesSites(me).some(x=>x.id===id)||semaineDe(0).some(d=>planDe(me.id,d).includes(id))};}catch(e){console.warn(e);return null;}}
export function espaceDash(id){S.tab='expl';S.xsub='dash:'+id;S.fiche=null;if(A.homeTab){A.homeTab('expl');return;}render();}
export function espaceRoot(tab){S.xsub=null;S.fiche=null;if(tab==='secu')S.hubSeg='secu';else if(tab==='expl')S.hubSeg='eq';} /* 12/10 soir : toucher un onglet revient à son hub */
export function espaceGo(xsub,opts){if(xsub==='cmd')cmdState().tab='cmd';else if(xsub==='comptes')cmdState().tab='comptes';else if(xsub==='frais')cmdState().tab='db';const h=xsubHome(xsub)||'expl';S.tab=h==='secu'?'expl':h;S.hubSeg=h==='secu'?'secu':'eq';S.xsub=xsub||null;S.fiche=null;if(opts&&opts.form&&xsub==='accident')setTimeout(()=>{if(ACT.accnew)ACT.accnew();},120); /* depuis l'onglet QSE du chantier : ouvre directement le formulaire */
  if(A.homeTab){A.homeTab(h);return;}render();}
/* ── BUREAU DU CHANTIER (onglet « Bureau » dans le chantier, next.js) : l'idée d'Ethan du 09/10 soir — « ce bureau bien plus ergonomique peut refaçonner la manière dont est ventilé le chantier
   quand tu rentres dedans » : la même checklist que le tableau de bord, les raccourcis vers les onglets, l'objectif du jour, l'accueil chantier, les messages — SANS rien retirer des onglets existants. ── */
export function espaceBureau(id){if(!DATA)DATA=buildData();const acc=A.current();const me=DATA.personnes.find(p=>p.id===personKey(acc))||null;const net=netOf(id);const c=site(id);const today=todayIso();const name=A.userName?A.userName():(me?nomC(me):'');const key=A.userKey?A.userKey():null;
  const enc=me?(can(me,'pointage.validate')||can(me,'planning.edit')):false;const D=net&&me&&enc?dashOf(net,me):null;const mt=meteoDe(id,today);const fiche=(net&&net.fiche)||{};
  const msgs=net?liveMsgs(net):[];const seen=A.seen?A.seen(id):'';const unread=msgs.filter(m=>m.by!==name&&(m.at||'')>seen).length;const tasks=msgs.filter(m=>m.kind==='task'&&m.task&&!m.task.done&&(m.task.to==='tous'||m.task.to===name)).length;
  const docs=net?((net.qse&&net.qse.docs)||[]).filter(d0=>d0&&!d0.deleted):[];const qseTodo=me&&can(me,'qse.sign')?docs.filter(d0=>qseReq(d0)&&!qseSigned(d0,name,key)).length:0;const accueilDone=docs.some(d0=>d0.type==='accueil'&&qseSigned(d0,name,key));
  const mine=me?missionsFor(me,today).filter(m=>m.site===id):[];const all=net?missionsOf(net,today):[];const eq=DATA.personnes.filter(p=>p.active&&planDe(p.id,today).includes(id));
  const qhs=me&&can(me,'qse.sign')?qhsTodo(qhsMyKey(),name,[id],today):[];
  /* 12/10 (Ethan) : l'encadrant voit qui, sur son chantier, n'a pas signé les documents obligatoires (accueil chantier, documents QSE requis) */
  let missing=[];if(net&&enc){const docsReq=((net.qse&&net.qse.docs)||[]).filter(d0=>d0&&!d0.deleted&&qseReq(d0));eq.forEach(p=>{const nm=nomC(p);const k=p.id;const miss=docsReq.filter(d0=>!qseSigned(d0,nm,k)&&!qseSigned(d0,p.prenom+' '+p.nom,k)).map(d0=>d0.type==='accueil'?'accueil chantier':(d0.title||'document'));if(miss.length)missing.push({prenom:p.prenom,nom:p.nom,docs:[...new Set(miss)]});});}
  return {me,acc,c,fiche,enc,today,meteo:mt?{k:mt.k,t:mt.t,label:METEO[mt.k][1],tenue:TENUE_TXT[mt.k]||''}:null,chef:c.chef?nomC(pers(c.chef)):'',conducteur:c.conducteur?nomC(pers(c.conducteur)):'',eq:eq.map(p=>p.prenom),eqAv:eq.map(p=>avatar(p)),missing,unread,tasks,qseTodo,accueilDone,qhs:qhs.map(x=>({id:x.run.id,title:x.run.title||x.run.topic,by:x.run.by||''})),accueilExpected:espaceAccueilExpected(id),canSign:me?can(me,'qse.sign'):false,isTerrain:me?['terrain','interim','chef'].includes(kindOf(me)):false,
    objectifs:{mine:mine.map(m=>({label:m.label,h:m.h,done:!!m.done,tr:objOnPlan(m),trName:objPlanTxt(Object.assign({_site:id},m)),team:m.team||''})),all:all.map(m=>({label:m.label,h:m.h,who:(m.who||[]).map(k=>pers(k).prenom),done:!!m.done,tr:objOnPlan(m),trName:objPlanTxt(Object.assign({_site:id},m)),team:m.team||''})),txt:missionsTxt(mine.length?mine:all),plan:(mine.length?mine:all).some(objOnPlan)},
    dash:D?DASH_DEF.map(x=>Object.assign({key:x[0],lab:x[1],ic:x[2],tab:x[3],short:x[4]},D[x[0]])):null,bad:D?DASH_DEF.filter(x=>D[x[0]].k==='bad').map(x=>({lab:x[1],v:D[x[0]].v,s:D[x[0]].s,tab:x[3]})):[],warn:D?DASH_DEF.filter(x=>D[x[0]].k==='warn').map(x=>({lab:x[1],v:D[x[0]].v,s:D[x[0]].s,tab:x[3]})):[],pc:D?(D.$.charge&&D.$.n?Math.round(100*D.$.soud/D.$.n):(c.soudures?Math.round(100*(c.faites||0)/c.soudures):0)):null};}
/* 10/10 (retours Ethan) — qui est là aujourd'hui sur ce chantier (planning), chef / conducteur de la fiche : pré-remplit le contrôle chantier */
export function espacePresents(id){if(!DATA)DATA=buildData();const today=todayIso();const c=site(id);const eq=DATA.personnes.filter(p=>p.active&&planDe(p.id,today).includes(id));
  return {names:eq.map(p=>nomC(p)),chef:c&&c.chef?nomC(pers(c.chef)):'',conducteur:c&&c.conducteur?nomC(pers(c.conducteur)):''};}
/* l'accueil chantier est ATTENDU de la personne connectée sur ce chantier si elle est terrain / intérim / chef de chantier (les autres peuvent le faire, sans pastille) */
export function espaceAccueilExpected(id){if(!DATA)DATA=buildData();const acc=A.current();const me=DATA.personnes.find(p=>p.id===personKey(acc))||null;if(!me)return false;return ['terrain','interim','chef'].includes(kindOf(me))&&semaineDe(0).some(d=>planDe(me.id,d).includes(id));} /* Ethan 10/10 : « juste les personnes pointées au planning sur un chantier » */
/* chantiers « à moi » (chef / conducteur) ou de mon secteur — pour déclencher un quart d'heure sécurité sur « mes chantiers » */
export function espaceMesSites(){if(!DATA)DATA=buildData();const acc=A.current();const me=DATA.personnes.find(p=>p.id===personKey(acc))||null;if(!me)return [];const mine=mesSites(me);if(mine.length)return mine.map(c=>c.id);const sect=mySecteur(me);return DATA.chantiers.filter(c=>!c.bureau&&(!sect||c.secteur===sect)).map(c=>c.id);}
/* ── ESPACE EXPLOITATION (encadrement : conducteurs, responsables, direction ; chef de chantier : version réduite) ── */
/* ═══ 12/10 — NOUVELLE VENTILATION (maquette_ventilation.html validée par Ethan : « pars là-dessus ») ═══
   Plus d'onglet « Exploitation » fourre-tout : deux territoires. 👥 ÉQUIPES = les gens et le temps (Planning & objectifs · Heures · Sécurité · Gens) ;
   🏢 ENTREPRISE = pilotage, commerce & achats, flotte, documents & RH, outils (traceur, administration). Les sous-vues (xsub) sont les mêmes qu'avant, rangées autrement :
   rien n'est supprimé. Le bouton « ‹ » ramène au territoire d'où l'on vient (S.tab). */
/* 12/10 soir (Ethan) : « Entreprise est un fourre-tout » → six onglets : Aujourd'hui · Chantiers (cartes + Équipes & heures + Sécurité) · Moi · Commerce · Parc · Entreprise (annuaire, documents, communication, présentation).
   HUB_OF : l'onglet d'accueil de chaque sous-vue (retour « ‹ … » et re-rendu). */
const HUB_OF={aff:'commerce',flotte:'parc',annu:'entreprise',docs:'entreprise',info:'entreprise',presentation:'entreprise',qhs:'secu',controles:'secu',accident:'secu',habsEq:'secu'};
const HUB_LABEL={expl:'Chantiers',secu:'Sécurité',commerce:'Commerce',parc:'Parc',entreprise:'SCR'};
const xsubHome=x=>!x?null:String(x).startsWith('dash:')?'expl':(HUB_OF[x]||'expl');
function vSub(me){const x=S.xsub;if(!x)return null;const back=t=>`<button class="ac-back" data-act="xsub" data-v="">‹ ${HUB_LABEL[S.tab]||'Chantiers'}</button>${t?`<h2 class="vt">${t}</h2>`:''}`;
  if(x==='annu')return back('')+vAnnuaire(me);
  if(x==='orga')return back('')+(can(me,'planning.edit')?vOrga(me):vPlanning(me)); /* les vues ont leur propre titre */
  if(x==='chantiers')return vMesChantiersX(me);
  if(x&&x.startsWith('dash:'))return vDash(x.slice(5),me);
  if(x==='valid')return back('Pointages à valider')+(can(me,'pointage.validate')?`<div class="eq-cols eq-1"><div>${cValidation(me)}</div></div>`:'<div class="card"><div class="eq-s">Pas de validation pour toi.</div></div>');
  if(x==='flotte')return (can(me,'flotte.manage')?back('')+flotteView(flCtx(me)):back('Flotte')+'<div class="card"><div class="eq-s">Pas d\'accès à la flotte.</div></div>');
  if(x==='gd')return back('Grands déplacements')+vGD(me);
  if(x==='agenda'){if(!S.agWho)agAutoSync(me);return back('')+vAgenda(me);} /* 12/10 : composer ma semaine ; synchro Outlook en arrière-plan si reliée */
  if(x==='aff')return (can(me,'affaires.view')?back('')+affView(me,affCtx(me)):back('Affaires')+'<div class="card"><div class="eq-s">Pas d\'accès aux affaires.</div></div>');
  if(x==='cmd'||x==='comptes'||x==='frais'){const cs=cmdState();const lab=cs.tab==='db'?'Notes de frais à valider':cs.tab==='comptes'?'Comptes chantier':'Bons de commande';return back(lab)+cmdView(cmdCtx(me));} /* 12/10 soir : achats & comptes dans Chantiers — une seule vue à trois volets (bons · notes de frais · comptes) ; la ligne du hub choisit le volet (goX), les volets se changent dedans */
  if(x==='accident')return back('')+vAccidents(me); /* 12/10 soir : déclarer un accident (v1, champs à confirmer avec la RH) */
  if(x==='info')return back('Communication interne')+vInfos(me);
  if(x==='presentation')return back('')+vPresentation(me);
  if(x==='rapport')return back('Variables de paie · rapport RH')+vHeuresProd(me);
  if(x==='prodEq')return back('')+vProdEquipes(me); /* 12/10 soir : production par équipe, classée comme le planning, heures + production + objectifs */
  if(x==='obj')return back('Objectifs des équipes')+vObjectifs(me);
  if(x==='docs')return back('Documents d\'entreprise')+docsAdminHTML(DATA.personnes.map(p=>p._acc).filter(Boolean));
  if(x==='controles')return back('Contrôles chantier')+vControles(me);
  if(x==='qhs')return back('Quart d\'heure sécurité')+vQhs(me);
  if(x==='habsEq')return back('Habilitations de l\'équipe')+`<div class="eq-cols eq-1"><div>${can(me,'qse.manage')?cTableHabs(me):cEchEquipe(me)||'<div class="card"><div class="eq-s">Rien à signaler.</div></div>'}</div></div>`;
  if(x==='annul'){const nets=netsLocal();const rows=[];nets.forEach(net=>liveMsgs(net).filter(m=>m.kind==='undo'&&m.undo&&m.undo.status==='pending').forEach(m=>rows.push({net,m})));
    return back('Demandes d\'annulation')+(rows.length?rows.map(r=>`<button class="ac-row" data-act="opensite" data-v="${esc(r.net.id)}|conv"><span class="ic" style="background:#fdebe3">${ICO.undo}</span><span class="tx"><b>${esc(r.m.by||'')} · ${esc(r.m.undo.weldId||'soudure')}</b><small>${esc(r.net.name||r.net.id)} · ${esc(String(r.m.text||r.m.undo.reason||'').slice(0,80))}</small></span><span class="chev">${CHEV}</span></button>`).join('')+'<div class="hint">Tu tranches dans la conversation du chantier (accepter / refuser) — tout est journalisé.</div>':'<div class="ac-empty">✓ Aucune demande en attente sur les chantiers de cet appareil.</div>');}
  return null;}
const hubRow=(t,s,ic,bg,go,n,nc,soon)=>`<button class="ac-row${soon?' soon':''}" data-act="${soon?'sim':'xgo'}" data-v="${esc(soon?t:go)}"><span class="ic" style="background:${bg}">${ic}</span><span class="tx"><b>${esc(t)}</b><small>${esc(s)}</small></span>${n?`<span class="ac-n ${nc||''}">${n}</span>`:''}${soon?'<span class="eq-tag">bientôt</span>':''}<span class="chev">${CHEV}</span></button>`;
const hubSec=(ic,t,s,rows)=>{const R=rows.filter(Boolean);return R.length?`<section class="eq-hubsec"><div class="ac-h"><b>${ic} ${esc(t)}</b>${s?`<span>${esc(s)}</span>`:''}</div><div class="eq-hubrows">${R.join('')}</div></section>`:'';};
const kpi=(v,l,k)=>`<div class="eq-kpi ${k||''}"><b>${v}</b><small>${esc(l)}</small></div>`;
function vExpl(me){const sub=vSub(me);if(sub!==null)return sub;if(S.hubSeg==='secu')return vSecu(me);
  NOTIFS=notifsFor(me);const nV=NOTIFS.filter(n=>n.act&&n.ic===ICO.check).reduce((a,n)=>a+(parseInt(n.t)||0),0),nM=NOTIFS.filter(n=>n.act&&n.ic===ICO.clock).reduce((a,n)=>a+(parseInt(n.t)||0),0),nA=NOTIFS.filter(n=>n.act&&n.ic===ICO.undo).reduce((a,n)=>a+(parseInt(n.t)||0),0),nP=NOTIFS.filter(n=>n.act&&n.ic===ICO.cal).reduce((a,n)=>a+(parseInt(n.t.replace(/^[^:]*:\s*/,''))||0),0);
  const row=hubRow;const chef=!can(me,'planning.edit');const sect=mySecteur(me);const js=semaineDe(S.plWeek||0),wk=weekKey(js[0]);const aff=(PLANNING[wk]||{}).aff||{};const gens=plGens().filter(p=>!sect||secteurDe(p)===sect||!secteurDe(p));const places=gens.filter(p=>js.every(d=>((aff[p.id]||{})[d]||[]).length)).length;
  const nObj=(()=>{const t=todayIso();return DATA.chantiers.filter(c=>!c.bureau).reduce((a,c)=>a+missionsOf(netOf(c.id),t).length,0);})();const nF=(can(me,'planning.edit')||can(me,'affaires.edit')||me.admin)?dbTodo().length:0;
  const achats=can(me,'planning.edit')||can(me,'affaires.edit')||me.admin;const rh=accueilType(me)==='rh'||accueilType(me)==='direction'||me.admin;
  return `<h2 class="vt">Équipes & heures <span class="hint">· ${chef?'chef de chantier':sect?'secteur '+esc(SECTEURS[sect]||sect):'tous les secteurs'} · semaine ${numSemaine(js[0])}</span></h2>
    <div class="eq-kpis">${chef?kpi(equipeIds(me).size,'dans ton équipe'):kpi(places+'/'+gens.length,'placés toute la semaine',places<gens.length?'bad':'ok')}${kpi((nV+nM)||0,'pointages à valider',nM?'bad':(nV?'warn':''))}${kpi(nObj,'objectifs du jour posés',nObj?'':'warn')}${achats?kpi(nF,'notes de frais à valider',nF?'warn':'ok'):kpi(nA,'demandes d\'annulation',nA?'warn':'ok')}</div>
    ${hubSec('📅','Planning & objectifs','placer, viser, composer',[
      chef?row('Mon planning et mon équipe','Qui est avec toi, quels jours, sur quels chantiers — fait par ton conducteur',ICO.cal,'#fdebe3','orga'):row('Planning des équipes','Placer les gars semaine par semaine, par secteur · équipes A / B · créer un profil en deux minutes',ICO.cal,'#fdebe3','orga',nP?nP+' à placer':null,'bad'),
      row('Objectifs des équipes','Par chantier → équipe → jour : missions en heures estimées, soudures ou tronçon sur le plan, DN — pas un plafond',ICO.flag,'#fdebe3','obj',nObj||null),
      row('Ma semaine','Composer ta semaine : visites, réunions, rendez-vous · import / export Outlook · la semaine de ceux qui dépendent de toi',ICO.cal,'#e8f0fb','agenda',(()=>{const n=agWeek(me,semaineDe(0)).length;return n||null;})())])}
    ${hubSec('⏱','Heures & paie','pointages, variables de paie, production, déplacements',[
      row('Pointages à valider','Heures de l\'équipe, correction avec motif · pointages manquants',ICO.check,'#e6f5ec','valid',(nV+nM)||null,nM?'bad':''),
      row('Production par équipe','Comme le planning : chantier → équipe → personne · heures de chacun, production de chacun → production de l\'équipe, face aux objectifs',ICO.flag,'#efeafb','prodEq',null),
      (can(me,'pointage.validate')&&(can(me,'planning.edit')||rh))?row('Variables de paie · rapport RH','La vue définitive pour la paie : heures définitives, validées, à valider, pauses, grands déplacements — par jour (CSV)',ICO.clock,'#e6f5ec','rapport',(()=>{const R=rapportSemaine(-1);const a=R.rows.reduce((x,r)=>x+(r.att>0?1:0),0);return a||null;})(),'bad'):'',
      (can(me,'planning.edit')||rh)?row('Grands déplacements','Cas 1 à 4 selon la distance domicile → chantier, cycle par personne, détentes, nuitées, repas, indemnités',ICO.home,'#fff4d6','gd',null):'',
      row('Demandes d\'annulation','Soudures à annuler au-delà des crédits — tu tranches',ICO.undo,'#fdebe3','annul',nA||null),
      achats?row('Notes de frais à valider','Les notes de frais de l\'équipe : valider, refuser, rembourser (chacun saisit les siennes dans Moi)',ICO.cart,'#ececea','frais',nF||null,'bad'):''])}
    ${hubSec('🧾','Achats & comptes','commandes, comptes chantier',[
      achats?row('Bons de commande','Commandes fournisseurs : fournisseur, objet, affaire, type de dépense (chiffrage), location début / fin, bon imprimable',ICO.cart,'#ececea','cmd',null):'',
      achats?row('Comptes chantier','Par chantier : chiffré, facturé, soudures, heures, main-d\'œuvre, dépenses, résultat indicatif',ICO.ruler,'#e3f3f3','comptes',null):''])}`;}
/* Chantiers › Sécurité (12/10 soir) : quarts d'heure, contrôles, accidents, habilitations */
function vSecu(me){const sub=vSub(me);if(sub!==null)return sub;const row=hubRow;const q=can(me,'qse.manage')||me.admin;const late=q?ctrlRecap().late.length:null;const today=todayIso();
  const nQ=qhsRuns().filter(r=>r.date===today).length;const ncOpen=netsLocal().reduce((a,net)=>a+controlesOf(net).reduce((b,c)=>b+Object.values(c.items||{}).filter(i=>i.e==='NC'&&!i.fix).length,0),0);const hab=alertesHab(equipeDe(me),0).length;const acc=accidentsAll().filter(x=>x.status!=='traite').length;
  return `<h2 class="vt">Sécurité <span class="hint">· quarts d'heure, contrôles, accidents, habilitations</span></h2>
    <div class="eq-kpis">${kpi(nQ,'quart'+(nQ>1?'s':'')+' d\'heure aujourd\'hui',nQ?'ok':'')}${late!==null?kpi(late,'contrôles en retard',late?'bad':'ok'):kpi(hab,'habilitations à traiter',hab?'bad':'ok')}${kpi(ncOpen,'NC ouvertes',ncOpen?'bad':'ok')}${kpi(acc,'accident'+(acc>1?'s':'')+' à traiter',acc?'bad':'ok')}</div>
    ${hubSec('⛑️','Sur le terrain','',[
      q?row('Quart d\'heure sécurité','Déclencher un sujet du jour sur un chantier ou tous — sujet, questions, émargement de tous',ICO.hat,'#fdebe3','qhs',nQ||null):'',
      q?row('Contrôles chantier','Qui contrôle, à quelle fréquence, où ça traîne · NC ouvertes / levées — objectif : un contrôle par chantier actif toutes les 2 semaines',ICO.check,'#fff4d6','controles',late||null,'bad'):'',
      row('Déclarer un accident','Accident, presque-accident ou soin bénin : qui, où, quand, circonstances, photos — la RH est prévenue',ICO.alert,'#fdeae7','accident',acc||null,'bad')])}
    ${hubSec('🎖','Les gens','',[
      row('Habilitations de l\'équipe','Échéances, recyclages à programmer',ICO.badge,'#fff4d6','habsEq',hab||null,'bad')])}`;}
function hubEntreprise(me){const row=hubRow;const t=accueilType(me);const dir=t==='direction'||t==='rh'||me.admin;const q=can(me,'qse.manage')||me.admin;
  const nInfo=docsAll().filter(d=>d.kind==='info').length;const nDocsTodo=q?(()=>{const all=DATA.personnes.map(p=>p._acc).filter(Boolean);return all.filter(a=>docsTodo(a).length).length;})():0;
  return `<h2 class="vt">SCR <span class="hint">· notre équipe, nos documents, nos actus</span></h2>
    ${hubSec('👥','Les gens','',[
      row('Annuaire','Toute l\'entreprise par poste : fiche, téléphone, adresse, ancienneté',ICO.home,'#ececea','annu',DATA.personnes.filter(p=>p.active).length)])}
    ${hubSec('📄','Documents & communication','',[
      q?row('Documents d\'entreprise','Règlement intérieur, notes de service, flash info, accueil nouvel arrivant — qui a signé, qui est à relancer',ICO.doc,'#e8f0fb','docs',nDocsTodo||null,'bad'):row('Documents d\'entreprise','Règlement intérieur, notes de service, flash info — ce que tu dois lire et signer',ICO.doc,'#e8f0fb','docs'),
      row('Communication interne','Infos publiées à tout le monde : actualités, résultats, événements — à lire, sans signature',ICO.msg,'#e3f3f3','info',nInfo||null),
      row('Présentation de l\'entreprise','Qui est SCR : métier, chiffres clés, organisation, valeurs — la page qu\'on montre à un nouvel arrivant',ICO.bld,'#fff4d6','presentation')])}
    ${hubSec('🛠','Outils','',[
      me.admin?`<button class="ac-row" data-act="tabgo" data-v="admin"><span class="ic" style="background:#15140f;color:#fff">⚙</span><span class="tx"><b>Administration</b><small>Comptes et accès · postes · qui peut quoi · 🧪 bac à sable</small></span><span class="chev">${CHEV}</span></button>`:''])}`;}
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
  const list=R.all.slice(0,40).map(x=>{const nc=controleNC(x.c);const open=Object.values(x.c.items||{}).filter(i=>i.e==='NC'&&!i.fix).length;return `<button class="ac-row" data-act="ctopen" data-v="${esc(x.net.id)}|${esc(x.c.id)}"><span class="ic" style="background:${open?'#fdeae7':'#e6f5ec'}">${open?'✗':'✓'}</span><span class="tx"><b>${fDate(String(x.c.at).slice(0,10))} · ${esc(x.net.name||x.net.id)}</b><small>${esc(x.c.by||'')} · ${Object.keys(x.c.items||{}).length} points · <b>${nc}</b> NC${nc?(open?' · <b style="color:#9b2c22">'+open+' ouverte'+(open>1?'s':'')+'</b>':' · toutes levées ✓'):''}${x.c.risque?' · situation à risque notée':''}${x.c.presents?' · présents : '+esc(String(x.c.presents).slice(0,60)):''}</small></span><span class="chev">${CHEV}</span></button>`;}).join('');
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
  const equipes=can(me,'planning.edit')||can(me,'pointage.validate')||can(me,'qse.manage'); /* 12/10 (Ethan) : Moi = mes affaires ; ce qui concerne l'équipe vit dans Équipes — pas de doublon */
  return [['moi','Accueil'],['docs','Documents'],['planning','Planning'],mesSites(me).length&&!equipes&&['chantiers','Chantiers'],OPERATEURS.includes(me.poste)&&prodIds(me)&&['prod','Productions'],['frais','Notes de frais'],can(me,'pointage.self')&&['heures','Heures'], /* 12/10 (Ethan) : un encadrant au forfait ne pointe pas → pas de « Pointages » dans Moi ; la validation de l'équipe vit dans Équipes → Pointages à valider */['habs','Habilitations'],KIT&&avPoste(me)&&['avatar','Avatar']].filter(Boolean);
}
function badge(me,k){
  const val=can(me,'pointage.validate'),qse=can(me,'qse.manage');
  const nV=()=>{const ids=equipeIds(me);return DATA.pointages.filter(x=>ids.has(x.p)&&aValider(x,me)).length};
  const nP=()=>habsDe(me).filter(x=>x.etat==='expiree'||x.etat==='echeance').length;
  const nE=()=>alertesHab(equipeDe(me),0).length;
  let n=0,r=false;
  if(k==='docs'){n=me._acc?docsTodo(me._acc).length:0;r=true;}
  else if((k==='heures'||k==='valid')&&val)n=nV();
  else if(k==='meshabs'||k==='habs')n=nP(); /* 12/10 : Moi → Habilitations = les miennes */
  else if(k==='ech'){n=nE();r=true}
  return n?` <span class="eq-badge${r?' eq-rouge':''}">${n}</span>`:'';
}
function fix(me){const s=subsFor(me).map(x=>x[0]);if(s.length&&!s.includes(S.sub))S.sub=s[0];const we=[0,6].includes(D(todayIso()).getDay())?1:0;if(S.plWeek===undefined)S.plWeek=we;if(S.objWeek===undefined)S.objWeek=we;if(S.planSem===undefined)S.planSem=we;} /* 11/10 : le week-end, « cette semaine » n'a plus de jours devant elle → planning, objectifs et Ta semaine s'ouvrent sur la semaine qui arrive (c'est aussi pour ça que la météo — prévisions à 7 jours — n'y apparaissait pas le dimanche) */
function vue(me){
  if(S.tab==='entreprise')return vEntreprise(me);
  if(S.tab==='accueil')return vAccueil(me);
  if(S.tab==='expl')return vExpl(me);
  if(S.tab==='commerce')return vCommerce(me);
  if(S.tab==='parc')return vParc(me);
  switch(S.sub){
    case 'moi':return vMoi(me);
    case 'planning':return vPlanning(me);
    case 'orga':return vOrga(me);
    case 'prod':return vProd(me);
    case 'chantiers':return vChantiers(me);
    case 'heures':return vHeures(me);
    case 'habs':return vHabs(me,true,false); /* 12/10 (Ethan) : dans Moi, seulement les miennes — celles de l'équipe sont dans Équipes → Habilitations de l'équipe (pas de doublon) */
    case 'avatar':return vAvatar(me);
    case 'docs':return me._acc?docsListHTML(me._acc):'';
    case 'frais':{cmdState().tab='db';return `<h2 class="vt">Mes notes de frais</h2>`+dbListHTML(cmdCtx(me),true);} /* 12/10 soir : les notes de frais se traitent dans Moi */
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
  ROOT.scrollTop=sy;if(S.plQ&&$id('pl-tray'))plFilterTray(S.plQ); /* la recherche du planning survit au re-rendu */
}
// point d'entrée : app.js appelle espaceRender(#homeBody, 'moi' | 'entreprise') ; relance le chargement serveur si pas encore fait
export function espaceRender(el,tab){ROOT=el;const tab0=S.tab,seg0=S.hubSeg;const seg=tab==='secu'?'secu':tab==='expl'?'eq':null;if(seg)S.hubSeg=seg;S.tab=tab==='secu'?'expl':['entreprise','accueil','expl','commerce','parc'].includes(tab)?tab:'moi';const home=xsubHome(S.xsub);if(S.xsub&&!(home===S.tab||(home==='secu'&&S.tab==='expl'&&S.hubSeg==='secu')))S.xsub=null; /* une sous-vue ne survit que dans son onglet ; un re-rendu (modale fermée, données reçues) ne renvoie pas au hub */if(S.tab!==tab0||S.hubSeg!==seg0)S.fiche=null; /* 13/10 : une fiche ouverte reste ouverte quand des données arrivent (registre enregistré, ex. compteurs d'heures) — elle se ferme en changeant d'onglet */S.corr=null;S.edit=false;render();if(!LOADED&&!loading){loading=true;espaceLoad().catch(e=>console.warn(e)).finally(()=>{loading=false;});}}
let loading=false;
export function espaceOpenFiche(key){S.fiche=key;render();}
export function espaceSub(k){if(k==='orga'){S.tab='expl';S.xsub='orga';if(A.homeTab){A.homeTab('expl');return;}render();return;}S.tab='moi';S.sub=k;render();}
/* ── Actions (clics délégués) : tout ce qui modifie est enregistré ── */
const GO={mesheures:['moi','heures'],valid:['moi','heures'],meshabs:['moi','habs'],ech:['moi','habs'],annu:['entreprise','moi'],planning:['moi','planning'],prod:['moi','prod'],chantiers:['moi','chantiers'],avatar:['moi','avatar']};
function validerPt(x){x.status='valide';const v={by:S.me,at:DATA.today+'T'+DATA.now};if(A.via&&A.via())v.via=A.via();x.val.push(v);savePointage(x);}
function msg(t){A.toast(t);}
const affCtx=me=>({canEdit:can(me,'affaires.edit')&&!viewing(),render,sites:(A.sites&&A.sites())||[],traceAgg:A.traceAgg,tracePhases:A.tracePhases,people:DATA.personnes.filter(p=>p.active).map(p=>({name:nomC(p),poste:p.poste,prenom:p.prenom,nom:p.nom}))});
const AGENCE_OF={ouest:'OUEST',idf:'IDF',sudouest:'SUD OUEST',sudest:'SUD'};
const flCtx=me=>({canEdit:can(me,'flotte.manage')&&!viewing(),render,people:DATA.personnes.map(p=>p._acc).filter(Boolean),agence:(me.poste==='resp_exploitation'||me.poste==='conducteur')?(AGENCE_OF[mySecteur(me)]||''):''}); /* 12/10 : le responsable d'exploitation voit les échéances de son secteur */
const cmdCtx=me=>({comptesHTML:()=>cComptesChantier(me),canEdit:(can(me,'planning.edit')||can(me,'affaires.edit')||me.admin)&&!viewing(),canValidate:(can(me,'planning.edit')||can(me,'affaires.edit')||me.admin)&&!viewing(),render,sites:DATA.chantiers.filter(c=>!c.bureau).map(c=>({id:c.id,name:c.nom})),affaires:affAll(),me,key:me.id,name:nomC(me),siteDefault:planDe(me.id,todayIso())[0]||null});
const ACT={
  tab(v){S.tab=v;S.fiche=null;S.sub='moi';if(A.homeTab)A.homeTab(v==='entreprise'?'entreprise':'espace');else render()},
  tabgo(v,el){if(v==='traceur'){if(A.traceur)A.traceur(el&&el.dataset?el.dataset.aff:'');return;} /* 12/10 : depuis l'affaire → le chantier tracé se lie à l'affaire */if(v==='admin'||v==='sites'||v==='expl'||v==='secu'||v==='espace'||v==='entreprise'||v==='commerce'||v==='parc'){if(v==='expl'||v==='secu')S.xsub=null;if(A.homeTab)A.homeTab(v);return;}},
  notif(v){const n=NOTIFS[+v];if(n&&n.go)n.go();},
  af(v,el){const me=pers(S.me);if(!can(me,'affaires.view'))return;affAct(v,el,affCtx(me));},
  cmd(v,el){const me=pers(S.me);if(viewing()&&!/^(open|back|tab|etat)\|/.test(String(v))){viewOnly();return;}cmdAct(v,el,cmdCtx(me));},
  fl(v,el){const me=pers(S.me);if(viewing()&&!String(v).startsWith('open|')&&!String(v).startsWith('back|')){viewOnly();return;}flotteAct(v,el,flCtx(me));},
  gdweek(v){S.gdWeek=+v;render()},
  gdmode(v){S.gdMode=v==='personne'?'personne':'semaine';render()},
  gdpers(v){S.gdMode='personne';S.gdPid=v;S.gdMonth=ymOf(semaineDe(S.gdWeek||0)[0]);render()},
  gdmonth(v){S.gdMonth=String(v).slice(0,7);render()},
  gdacc(v){if(viewing()){viewOnly();return;}const me=pers(S.me);if(!(can(me,'planning.edit')||accueilType(me)==='rh'||me.admin)){msg('Réservé à l\'encadrement / RH');return;}const [pid,k]=String(v).split('|');const p=pers(pid);const w=gdWeekOf(p,+k||0);if(!w||!w.g.ok){msg('Rien à accorder (pas planifié ou adresse non localisée)');return;}
    regSet('gdx','acc|'+pid+'|'+w.wk,{p:pid,week:w.wk,accord:gdSnap(w),by:nomC(me),at:new Date().toISOString(),deleted:null},String(pid).includes('@')?undefined:{local:true});render();msg('✓ Semaine '+numSemaine(w.js[0])+' accordée — '+nomC(p))},
  gdaccx(v){if(viewing()){viewOnly();return;}const me=pers(S.me);if(!(can(me,'planning.edit')||accueilType(me)==='rh'||me.admin))return;const [pid,wk]=String(v).split('|');if(!confirm('Retirer l\'accord de cette semaine ?'))return;regSet('gdx','acc|'+pid+'|'+wk,{deleted:true},String(pid).includes('@')?undefined:{local:true});render()},
  gdaccall(v){if(viewing()){viewOnly();return;}const me=pers(S.me);if(!(can(me,'planning.edit')||accueilType(me)==='rh'||me.admin))return;let n=0;gdPeople().forEach(p=>{const w=gdWeekOf(p,+v||0);if(!w||!w.g.ok||w.g.cas.n<2||gdAccOf(p.id,w.wk))return;regSet('gdx','acc|'+p.id+'|'+w.wk,{p:p.id,week:w.wk,accord:gdSnap(w),by:nomC(me),at:new Date().toISOString(),deleted:null},String(p.id).includes('@')?undefined:{local:true});n++;});render();msg('✓ '+n+' grand'+(n>1?'s':'')+' déplacement'+(n>1?'s':'')+' accordé'+(n>1?'s':''))},
  gdaccmois(v){if(viewing()){viewOnly();return;}const me=pers(S.me);if(!(can(me,'planning.edit')||accueilType(me)==='rh'||me.admin))return;const [pid,ym]=String(v).split('|');const p=pers(pid);let n=0;gdMonthWeeks(ym).forEach(({k})=>{const w=gdWeekOf(p,k);if(!w||!w.g.ok||w.g.cas.n<2||gdAccOf(pid,w.wk))return;regSet('gdx','acc|'+pid+'|'+w.wk,{p:pid,week:w.wk,accord:gdSnap(w),by:nomC(me),at:new Date().toISOString(),deleted:null},String(pid).includes('@')?undefined:{local:true});n++;});render();msg('✓ '+n+' semaine'+(n>1?'s':'')+' accordée'+(n>1?'s':''))},
  gdcsv(v){const [pid,ym]=String(v).split('|');const p=pers(pid);const L=[['Semaine','Du','Au','Chantier(s)','Jours','Km','Cas','Cycle','Détente','Nuitées','Repas','A/R','Indemnités €','Accordé par','Le','Écart planning']];
    gdMonthWeeks(ym).forEach(({mon,k})=>{const w=gdWeekOf(p,k);const js=semaineDe(k);const a=gdAccOf(pid,weekKey(mon));const cur=w&&w.g.ok?gdSnap(w):null;const src=a?a.accord:cur;L.push(['S'+numSemaine(mon),fDate(js[0]),fDate(js[4]),w?w.ids.map(id=>site(id).nom).join(' + '):'',src?src.jours:0,src?src.km:'',src?src.cas:'',src&&src.cycle>1?(src.idx+1)+'/'+src.cycle:'',src&&src.detente?'oui':'',src?src.nuits:0,src?src.repas:0,src?src.ar:0,src?String(src.eur).replace('.',','):0,a?a.by:'',a?fDate(String(a.at).slice(0,10)):'',a&&cur&&gdDiff(a.accord,cur)?'planning changé':'']);});
    const csv='\ufeff'+L.map(r=>r.map(x=>{const t=String(x??'');return /[;"\n]/.test(t)?'"'+t.replace(/"/g,'""')+'"':t;}).join(';')).join('\r\n');const u=URL.createObjectURL(new Blob([csv],{type:'text/csv;charset=utf-8'}));const el=document.createElement('a');el.href=u;el.download='GD_'+(p.nom||'').replace(/[^A-Za-z0-9]/g,'')+'_'+ym+'.csv';document.body.appendChild(el);el.click();el.remove();setTimeout(()=>URL.revokeObjectURL(u),2000);msg('⬇ CSV du mois prêt')},
  gdday(v){if(viewing()){viewOnly();return;}const me=pers(S.me);if(!(can(me,'planning.edit')||accueilType(me)==='rh'||me.admin)){msg('Réservé à l\'encadrement / RH');return;}const [pid,d]=String(v).split('|');gdDayModal(me,pid,d);},
  gdretry(v){const k=String(v||'');if(k in GEOCODE){delete GEOCODE[k];kvSet('trace:geocode',GEOCODE);}if(GEOQ[k]){delete GEOQ[k];kvSet('trace:geocodeQ',GEOQ);}delete GD_TRIED[k];render();msg('Localisation relancée…');},
  cpton(v){if(viewing()){viewOnly();return;}const me=pers(S.me);if(!can(me,'dossier.edit')){msg('Réservé aux RH / bureau');render();return;}const [pid,k]=String(v).split('|');const c=cptRow(pid);cptSave(pid,{on:Object.assign({},c.on,{[k]:!c.on[k]})});render();msg((c.on[k]?'Compteur retiré : ':'Compteur suivi : ')+((cptList(c).find(x=>x.k===k)||{}).label||k));},
  cptsolde(v){if(viewing()){viewOnly();return;}const me=pers(S.me);if(!can(me,'dossier.edit')){msg('Réservé aux RH / bureau');return;}const [pid,k]=String(v).split('|');const p=pers(pid);const c=cptRow(pid);const lab=(cptList(c).find(x=>x.k===k)||{}).label||k;const cur=c.soldes[k]||{};
    A.openModal(`<h3 style="margin-top:0">${esc(lab)} — ${esc(nomC(p))}</h3><div class="hint" style="margin:0 0 6px">${k==='report'?'Solde de départ à une date : les semaines au-delà de '+HEBDO_MAX+' h pointées ensuite s\'y ajoutent toutes seules, les primes s\'en retirent.':'Solde du compteur à une date (repris tel quel dans la navette : « compteur fin de mois précédent »).'}</div>
      <div class="eq-2sel"><div><label class="f">Solde (heures)</label><input class="f" id="cs-h" type="number" step="0.25" value="${cur.h!==undefined&&cur.h!==null?esc(cur.h):''}"></div><div><label class="f">Au</label><input class="f" id="cs-d" type="date" value="${esc(cur.at||todayIso())}"></div></div>
      <div class="actions" style="margin-top:8px"><button class="btn primary block" id="cs-ok">Enregistrer le solde</button><button class="btn block" data-close>Annuler</button></div>`);
    $id('cs-ok').onclick=()=>{const h=$id('cs-h').value,d=$id('cs-d').value;if(h===''||!isFinite(+h)){msg('Le solde en heures');return;}if(!d){msg('La date du solde');return;}cptSave(pid,{soldes:Object.assign({},c.soldes,{[k]:{h:Math.round(+h*100)/100,at:d,by:nomC(me)}}),on:Object.assign({},c.on,{[k]:true})});A.closeModal();render();msg('✓ '+lab+' : '+nb(+h)+' h au '+fDate(d));};},
  cptprime(v){if(viewing()){viewOnly();return;}const me=pers(S.me);if(!can(me,'dossier.edit')){msg('Réservé aux RH / bureau');return;}const pid=String(v);const p=pers(pid);const c=cptRow(pid);const s=cptSolde(p,'report');
    A.openModal(`<h3 style="margin-top:0">💶 Vider en prime — ${esc(nomC(p))}</h3><div class="hint" style="margin:0 0 6px">Heures à reporter (au-delà de ${HEBDO_MAX} h / semaine) : <b>${nb(s.h)} h</b> aujourd'hui. Les heures payées en prime sortent du compteur ; la navette du mois les montre (« payées en prime ce mois »).</div>
      <div class="eq-2sel"><div><label class="f">Heures payées en prime</label><input class="f" id="cp-h" type="number" step="0.25" min="0" value="${esc(s.h)}"></div><div><label class="f">Date (paie)</label><input class="f" id="cp-d" type="date" value="${esc(todayIso())}"></div></div><label class="f">Note</label><input class="f" id="cp-n" placeholder="ex. prime de fin de chantier">
      <div class="actions" style="margin-top:8px"><button class="btn primary block" id="cp-ok">Enregistrer la prime</button><button class="btn block" data-close>Annuler</button></div>`);
    $id('cp-ok').onclick=()=>{const h=+$id('cp-h').value,d=$id('cp-d').value;if(!(h>0)){msg('Le nombre d\'heures payées');return;}if(!d){msg('La date');return;}cptSave(pid,{primes:c.primes.concat([{id:'P'+Date.now().toString(36),at:d,h:Math.round(h*100)/100,by:nomC(me),note:($id('cp-n').value||'').trim()}])});A.closeModal();render();msg('💶 '+nb(h)+' h payées en prime — compteur à reporter : '+nb(Math.round((s.h-h)*100)/100)+' h');};},
  cptnew(v){if(viewing()){viewOnly();return;}const me=pers(S.me);if(!can(me,'dossier.edit')){msg('Réservé aux RH / bureau');return;}const pid=String(v);const c=cptRow(pid);
    A.openModal(`<h3 style="margin-top:0">Autre compteur d'heures</h3><div class="hint" style="margin:0 0 6px">Un compteur que la personne a et que l'appli ne connaît pas encore (ex. modulation, repos compensateur). Son solde se saisit ensuite (✏️ solde) ou viendra de l'import de ton classeur.</div><label class="f">Nom du compteur</label><input class="f" id="cn-l" placeholder="ex. Modulation">
      <div class="actions" style="margin-top:8px"><button class="btn primary block" id="cn-ok">Ajouter</button><button class="btn block" data-close>Annuler</button></div>`);
    $id('cn-ok').onclick=()=>{const l=($id('cn-l').value||'').trim();if(!l){msg('Le nom du compteur');return;}const k='x_'+(l.normalize('NFD').replace(/[\u0300-\u036f]/g,'').toLowerCase().replace(/[^a-z0-9]+/g,'_').replace(/^_+|_+$/g,'').slice(0,24)||Date.now().toString(36));cptSave(pid,{labels:Object.assign({},c.labels,{[k]:l}),on:Object.assign({},c.on,{[k]:true})});A.closeModal();render();msg('Compteur ajouté : '+l);};},
  cptcontrat(v){if(viewing()){viewOnly();return;}const me=pers(S.me);if(!can(me,'dossier.edit')){msg('Réservé aux RH / bureau');return;}const pid=String(v);const p=pers(pid);const c=cptRow(pid);
    A.openModal(`<h3 style="margin-top:0">Contrat — ${esc(nomC(p))}</h3><label class="f">Heures par semaine</label><input class="f" id="cc-h" type="number" step="0.5" min="1" max="48" value="${esc(c.contrat)}"><div class="hint">Les heures sup commencent au-delà ; la navette l'affiche (« CONTRAT xxH »).</div>
      <div class="actions" style="margin-top:8px"><button class="btn primary block" id="cc-ok">Enregistrer</button><button class="btn block" data-close>Annuler</button></div>`);
    $id('cc-ok').onclick=()=>{const h=+$id('cc-h').value;if(!(h>0&&h<=48)){msg('Entre 1 et 48 h');return;}cptSave(pid,{contrat:h});A.closeModal();render();msg('Contrat : '+nb(h)+' h / semaine');};},
  mynavm(v){S.navM=String(v);render();},
  async mynav(v){const me=pers(S.me);if(!me)return;const ym=String(v);try{const N=navetteOf(me,ym);await navDownload([navetteSheet(N,nomC(me))],'Navette_'+navFile(me.nom+'_'+me.prenom)+'_'+ym+'.xlsx');msg('⬇ Ta navette de '+MOIS_L[+ym.slice(5)-1]+' (Excel)');}catch(e){console.warn(e);msg('Navette impossible : '+(e&&e.message||e));}},
  async gdnavx(v){const [pid,ym]=String(v).split('|');const p=pers(pid);try{const N=navetteOf(p,ym);await navDownload([navetteSheet(N,nomC(p))],'Navette_'+navFile(p.nom+'_'+p.prenom)+'_'+ym+'.xlsx');msg('⬇ Navette de '+nomC(p)+' prête (Excel, format SCR)');}catch(e){console.warn(e);msg('Navette impossible : '+(e&&e.message||e));}},
  async gdnavall(v){const ym=String(v);const L=navPeople(ym);if(!L.length){msg('Personne n\'est planifié ni pointé sur les semaines de ce mois');return;}try{const sheets=L.map(p=>navetteSheet(navetteOf(p,ym),nomC(p)));await navDownload(sheets,'Navettes_'+ym+'.xlsx');msg('⬇ '+L.length+' navette'+(L.length>1?'s':'')+' du mois (un onglet par personne)');}catch(e){console.warn(e);msg('Navettes impossibles : '+(e&&e.message||e));}},
  gdnavcsv(v){const [pid,ym]=String(v).split('|');const p=pers(pid);const M=gdMonthDays(p,ym);const NAV=gdNavRows(p,ym,M);const a=p.adresse||{};
    const head=[['Navette grands déplacements',nomC(p),(POSTES_ESP[p.poste]||{}).label||p.poste,MOIS_L[+ym.slice(5)-1]+' '+ym.slice(0,4)],['Domicile',[a.voie,a.cp,a.ville].filter(Boolean).join(' ')],['Nuitées accordées',M.T.acc.N,'Repas accordés',M.T.acc.R,'Trajets A/R',String(M.T.acc.ar).replace('.',','),'Indemnités trajet €',String(M.T.acc.eur).replace('.',',')],['À accorder (calculé)','nuitées',M.T.calc.N,'repas',M.T.calc.R,'A/R',String(M.T.calc.ar).replace('.',',')],[]];
    const L=head.concat([['',...NAV.ds.map(d=>+d.slice(8)),'Total']]).concat(NAV.rows);
    const csv='\ufeff'+L.map(r=>r.map(x=>{const t=String(x??'');return /[;"\n]/.test(t)?'"'+t.replace(/"/g,'""')+'"':t;}).join(';')).join('\r\n');const u=URL.createObjectURL(new Blob([csv],{type:'text/csv;charset=utf-8'}));const el=document.createElement('a');el.href=u;el.download='Navette_GD_'+nomC(p).normalize('NFD').replace(/[\u0300-\u036f]/g,'').replace(/[^A-Za-z0-9]+/g,'_').replace(/^_+|_+$/g,'')+'_'+ym+'.csv';document.body.appendChild(el);el.click();el.remove();setTimeout(()=>URL.revokeObjectURL(u),2000);msg('⬇ Navette du mois prête (Excel)');},
  rpweek(v){S.rpWeek=+v;render()},
  rpcsv(v){const csv=rapportCSV(v);const blob=new Blob([csv],{type:'text/csv;charset=utf-8'});const u=URL.createObjectURL(blob);const el=document.createElement('a');el.href=u;el.download=(v==='paie'?'variables_paie_S':'rapport_S')+numSemaine(semaineDe(S.rpWeek||0)[0])+'.csv';document.body.appendChild(el);el.click();el.remove();setTimeout(()=>URL.revokeObjectURL(u),2000);msg('Export CSV prêt (Excel, séparateur ;)')},
  objgo(v){const [id,mid]=v.split('|');if(A.objFocus)A.objFocus(id,mid);},
  meteo(){Object.values(METEO_STORE).forEach(m=>{if(m){delete m.failAt;delete m.at;}});METEO_ERR='';msg('Météo : mise à jour…');meteoRefresh().then(()=>{const L=(DATA?DATA.chantiers:[]).filter(c=>!c.bureau);const ok=L.filter(c=>METEO_STORE[c.id]&&METEO_STORE[c.id].days);const miss=L.filter(c=>!(METEO_STORE[c.id]&&METEO_STORE[c.id].days));render();msg(miss.length?'Météo : '+ok.length+' chantier'+(ok.length>1?'s':'')+' à jour · sans météo : '+miss.slice(0,4).map(c=>c.nom+(c.ll||c.ville?'':' (ni position ni ville dans la fiche)')).join(', ')+(METEO_ERR?' · erreur : '+METEO_ERR:''):'Météo à jour pour '+ok.length+' chantier'+(ok.length>1?'s':''));}).catch(e=>msg('Météo : '+(e&&e.message||e)));}, /* 11/10 (Ethan : « je ne vois plus la météo ») : rechargement à la main + diagnostic */ /* raccourci « voir sur le plan » depuis Ta semaine / l'accueil */
  objweek(v){S.objWeek=Math.max(-8,Math.min(8,+v));S.objDay=null;S.objSite=null;render()},
  objday(v){S.objDay=v;S.objSite=null;render()},
  objadd(v){if(viewing()){viewOnly();return;}const [site,team]=String(v||'').split('|');S.objSite=site||null;S.objTeam=team||'';S.objTeamSel=null;render();if(site)setTimeout(()=>{const f=document.querySelector('#eq-app .eq-objform');if(f)f.scrollIntoView({block:'nearest',behavior:'smooth'});},50)},
  objok(v){if(viewing()){viewOnly();return;}const net=netOf(v);if(!net)return;const d=objDraft(v);if(!d)return;
    d.days.forEach(day=>saveMissions(v,day,missionsOf(net,day).concat([newMission(d)])));S.objSite=null;S.objTeam='';S.objTeamSel=null;render();msg('Objectif posé'+(d.days.length>1?' sur '+d.days.length+' jours':'')+' — visible sur l\'accueil de '+(d.team?'l\'équipe '+d.team:d.who.length?d.who.map(x=>pers(x).prenom).join(', '):'l\'équipe'))},
  objteam(v){const [site,t]=v.split('|');const boxes=[...document.querySelectorAll('#eq-app [data-objwho]')];const on=S.objTeamSel!==t;boxes.forEach(b=>{if(b.dataset.objteamof===t)b.checked=on;});S.objTeamSel=on?t:null;document.querySelectorAll('#eq-app .eq-tb[data-act=objteam]').forEach(b=>b.classList.toggle('on',b.dataset.v===site+'|'+t&&on));},
  objplan(v){if(viewing()){viewOnly();return;}const net=netOf(v);if(!net)return;const d=objDraft(v);if(!d)return;const day=S.objDay||todayIso();S.objSite=null;S.objTeam='';S.objTeamSel=null;if(A.objPose)A.objPose(v,day,d);},
  objmap(v){const [id,mid]=v.split('|');const day=S.objDay||todayIso();const net=netOf(id);if(!net)return;const m=missionsOf(net,day).find(x=>x.id===mid);if(!m)return;
    if(objOnPlan(m)){if(A.objFocus)A.objFocus(id,mid);return;}if(viewing()){viewOnly();return;}if(A.objPose)A.objPose(id,day,Object.assign({},m,{mid}));},
  objrm(v){if(viewing()){viewOnly();return;}const [id,mid]=v.split('|');const day=S.objDay||todayIso();const net=netOf(id);if(!net)return;saveMissions(id,day,missionsOf(net,day).filter(m=>m.id!==mid));render()},
  objdone(v){if(viewing()){viewOnly();return;}const [id,mid]=v.split('|');const day=S.objDay||todayIso();const net=netOf(id);if(!net)return;saveMissions(id,day,missionsOf(net,day).map(m=>m.id===mid?Object.assign({},m,{done:m.done?null:{at:new Date().toISOString(),by:nomC(pers(S.me))}}):m));render()},
  docopen(v){const me=pers(S.me);if(viewing()){viewOnly();return;}docOpen(v,me&&me._acc);},
  docadm(v){docAdminOpen(v,DATA.personnes.map(p=>p._acc).filter(Boolean));},
  docnew(v){if(viewing()){viewOnly();return;}docNewOpen(v||'note');},
  doclate(){const w=window.open('','_blank');if(!w){msg('Autorise la fenêtre pop-up pour imprimer');return;}w.document.write(docsLateHTML(DATA.personnes.map(p=>p._acc).filter(Boolean)));w.document.close();},
  qhsnew(){if(viewing()){viewOnly();return;}qhsTriggerOpen({sites:espaceMesSites(),after:()=>render()});},
  ctopen(v){const [id,cid]=String(v).split('|');const net=netOf(id);const c=net?controlesOf(net).find(x=>x.id===cid):null;if(!c){msg('Contrôle introuvable sur cet appareil');return;}const w=window.open('','_blank');if(!w){msg('Autorise la fenêtre pop-up pour afficher le rapport');return;}w.document.write(controleReportHTML(c,net));w.document.close();},
  xsub(v){S.xsub=v||null;S.fiche=null;render();window.scrollTo(0,0)},
  xgo(v){if(v==='sites'||v==='traceur'){ACT.tabgo(v);return;}const h=xsubHome(v);if(!(h===S.tab||(h==='secu'&&S.tab==='expl'&&S.hubSeg==='secu'))){goX(v);return;} /* la sous-vue vit dans un autre onglet → on y va */S.xsub=v;S.fiche=null;render()},
  sub(v){S.sub=v;S.fiche=null;S.corr=null;render()},
  go(v){const g=GO[v];if(!g)return;const me=pers(S.me);const equipes=me&&(can(me,'planning.edit')||can(me,'pointage.validate')||can(me,'qse.manage'));if(g[1]==='heures'&&me&&!can(me,'pointage.self')){goX('valid');return;} /* 12/10 : encadrant au forfait → validation dans Équipes */if(v==='ech'){goX('habsEq');return;}if(g[1]==='prod'&&me&&!OPERATEURS.includes(me.poste)){goX('prodEq');return;}if(g[1]==='chantiers'&&equipes){goX('chantiers');return;} /* 12/10 : équipe, production des équipes, mes chantiers → Équipes */S.sub=g[1];S.fiche=null;if(g[0]!==S.tab){S.tab=g[0];if(A.homeTab){A.homeTab(g[0]==='entreprise'?'entreprise':'espace');return}}render()},
  pointer(k){const me=pers(S.me),st=siteActuel(me),at=DATA.today+'T'+DATA.now;let x=ptDe(me.id,DATA.today);
    if(!x){x={p:me.id,d:DATA.today,site:st?st.id:null,status:'declare',corr:null,events:[],val:[]};}
    const e={t:k,at};if(A.via&&A.via())e.via=A.via(); /* 12/10 : admin qui agit comme la personne → qui a réellement pointé */x.events.push(e);savePointage(x);render();msg('Pointage « '+EVT[k]+' » à '+fHeure(at));
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
  plenc(){S.plEnc=!S.plEnc;if(!S.plEnc&&S.plPoste==='enc')S.plPoste='';render()},
  gdx(v){if(viewing()){viewOnly();return;}const me=pers(S.me);if(!(can(me,'planning.edit')||accueilType(me)==='rh'||me.admin)){msg('Réservé à l\'encadrement');return;}const [pid,wk,mode]=String(v).split('|');const id=pid+'|'+wk;const demo=!String(pid).includes('@');
    if(mode==='reset')regSet('gdx',id,{deleted:true,detente:null},demo?{local:true}:undefined);else regSet('gdx',id,{p:pid,week:wk,detente:mode==='1',by:nomC(me),at:new Date().toISOString(),deleted:null},demo?{local:true}:undefined);render();msg(mode==='reset'?'Exception retirée — cycle normal':mode==='1'?'🏠 Détente cette semaine pour '+nomC(pers(pid)):'✗ Pas de détente cette semaine pour '+nomC(pers(pid)))},
  adr(v){if(viewing()){viewOnly();return;}S.adrEdit=v||null;render()},
  adrok(v){if(viewing()){viewOnly();return;}const me=pers(S.me);if(!can(me,'dossier.edit')){msg('Réservé aux RH / bureau');return;}const g=k=>{const i=$id('adr-'+k);return i?i.value.trim():'';};const a={voie:g('voie'),cp:g('cp'),ville:g('ville')};if(!a.ville){msg('La ville au moins (grands déplacements)');return;}savePeoplePart(v,'adresse',a);S.adrEdit=null;render();msg('✓ Adresse enregistrée')},
  peweek(v){S.peWeek=+v;render()},
  parcseg(v){S.parcSeg=v;render()},
  accnew(){if(viewing()){viewOnly();return;}accidentForm(pers(S.me))},
  acctraite(v){if(viewing()){viewOnly();return;}const me=pers(S.me);if(!(can(me,'qse.manage')||accueilType(me)==='rh'||accueilType(me)==='direction'||me.admin)){msg('Réservé à la RH / direction / QSE');return;}const x=regGet('accident',v);if(!x)return;regSet('accident',v,{status:'traite',traitePar:nomC(me),traiteAt:new Date().toISOString()},String(me.id).includes('@')?undefined:{local:true});render();msg('✓ Déclaration marquée traitée')},
  infonew(){if(viewing()){viewOnly();return;}infoNew(pers(S.me))},
  presedit(){if(viewing()){viewOnly();return;}presentationEdit(pers(S.me))},
  agweek(v){S.agWeek=+v;S.agNew=null;render()},
  agday(v){const el=$id('ag-d-'+v);if(!el)return;el.scrollIntoView({block:'start',behavior:'smooth'});el.classList.add('flash');setTimeout(()=>el.classList.remove('flash'),900)},
  agics1(v){const me=pers(S.me);const e=agAll(me).find(x=>x.id===v);if(!e)return;const txt=agIcs(me,[e.d],{only:v});try{const a=document.createElement('a');a.href=URL.createObjectURL(new Blob([txt],{type:'text/calendar;charset=utf-8'}));a.download='TRACE_rdv_'+e.d+'.ics';document.body.appendChild(a);a.click();setTimeout(()=>{URL.revokeObjectURL(a.href);a.remove();},2000);}catch(x){console.warn(x);}S.agLastIcs=txt;msg('⬇ Rendez-vous exporté (.ics) — ouvre le fichier : il s\'ajoute dans ton Outlook')}, /* 13/10 : TRACÉ → Outlook, un rendez-vous à la fois */
  aglink(){if(viewing()){viewOnly();return;}const me=pers(S.me);const cur=((PEOPLE[me.id]||{}).outlook||{}).ics||'';const u=prompt('Lien ICS de ton calendrier Outlook publié (commence par https://outlook.office365.com/owa/calendar/… et finit par .ics) :',cur);if(u===null)return;const url=String(u).trim();if(!/^https:\/\/.+\.ics(\?.*)?$/i.test(url)&&!/^webcal:/i.test(url)){msg('Ce n\'est pas un lien de calendrier (.ics)');return;}savePeoplePart(me.id,'outlook',Object.assign({},(PEOPLE[me.id]||{}).outlook,{ics:url.replace(/^webcal:/i,'https:'),at:new Date().toISOString()}));render();msg('🔗 Lien enregistré — synchro…');setTimeout(()=>agSync(me,false),900)},
  agunlink(){if(viewing()){viewOnly();return;}const me=pers(S.me);if(!confirm('Délier Outlook ? Les rendez-vous déjà importés restent.'))return;savePeoplePart(me.id,'outlook',null);render()},
  agsync(){if(viewing()){viewOnly();return;}agSync(pers(S.me),false)},
  agnew(v){if(viewing()){viewOnly();return;}S.agNew={d:v};render();setTimeout(()=>{const f=$id('ag-form');if(f)f.scrollIntoView({block:'nearest',behavior:'smooth'});},50)},
  agx(){S.agNew=null;render()},
  agok(v){if(viewing()){viewOnly();return;}const me=pers(S.me);const g=k=>{const i=$id('ag-'+k);return i?i.value.trim():'';};const e={d:v,type:g('type')||'autre',site:g('site')||null,title:g('title'),h0:g('h0'),h1:g('h1'),note:g('note')};if(e.h1&&e.h0&&e.h1<e.h0){const x=e.h0;e.h0=e.h1;e.h1=x;}agSave(me,e);S.agNew=null;render();msg('✓ Ajouté à ta semaine'+(e.site?' · '+site(e.site).nom:''))},
  agrm(v){if(viewing()){viewOnly();return;}const me=pers(S.me);regSet('agenda',me.id+'|'+v,{deleted:true,deletedAt:new Date().toISOString()},String(me.id).includes('@')?undefined:{local:true});render()},
  agics(v){const me=pers(S.me);const js=semaineDe(+v||0);const txt=agIcs(me,js);try{const a=document.createElement('a');a.href=URL.createObjectURL(new Blob([txt],{type:'text/calendar;charset=utf-8'}));a.download='TRACE_semaine_'+numSemaine(js[0])+'_'+(me.prenom||'')+'.ics';document.body.appendChild(a);a.click();setTimeout(()=>{URL.revokeObjectURL(a.href);a.remove();},2000);}catch(e){console.warn(e);}S.agLastIcs=txt;msg('⬇ Semaine '+numSemaine(js[0])+' exportée (.ics) — ouvre le fichier dans Outlook')},
  plnew(){if(viewing()){viewOnly();return;}S.plNew=S.plNew?null:{};render();setTimeout(()=>{const i=$id('pn-prenom');if(i)i.focus();},50)},
  plnewx(){S.plNew=null;render()},
  async plnewok(){if(viewing()){viewOnly();return;}const me=pers(S.me);const d=plNewRead();S.plNew=Object.assign({},d);const r=await provCreate(d,me);if(r.error){S.plNew.err=r.error;render();return;}
    S.plNew=null;DATA=buildData();S.plSel=r.key;S.plPoste='';S.plQ='';render();msg(r.where==='acces'?'✓ Accès créé : '+d.prenom+' '+d.nom+' se connecte avec '+d.email+' — touche un chantier pour le placer':'✓ '+d.prenom+' '+d.nom+' est dans « À placer » — touche un chantier. '+(d.email?'Un administrateur finalise son accès ('+d.email+').':'Sans e-mail : un administrateur devra finaliser son accès.'));},
  plposte(v){S.plPoste=v||'';render();const q=$id('pl-q');if(q&&S.plQ)plFilterTray(S.plQ)},
  plteam(v){const [site,t]=v.split('|');S.plTeamOf=S.plTeamOf||{};S.plTeamOf[site]=t||'';render()},
  plsetteam(v){const [key,site,t]=v.split('|');const js=semaineDe(S.plWeek||0),wk=weekKey(js[0]);const o=Object.assign({},((PLANNING[wk]||{}).aff||{})[key]||{});if(t)o['eq:'+site]=t;else delete o['eq:'+site];savePlanning(wk,{[key]:Object.keys(o).length?o:null});render();msg(t?pers(key).prenom+' → équipe '+t:pers(key).prenom+' : sans équipe')},
  plstrict(){const me=pers(S.me);if(!me.admin)return;const strict=!PL_RULES.strict;savePlanningRules({strict}).then(ok=>{render();if(ok)msg(strict?'Règle stricte : un gars qui n\'est pas placé ne peut ouvrir aucun chantier':'Règle souple : un gars qui n\'est pas placé voit tous les chantiers')})},
  pledit(v){S.plEdit=S.plEdit===v?null:v;S.plSel=null;render()},
  plput(site){const key=S.plSel;if(!key)return;const js=semaineDe(S.plWeek||0),wk=weekKey(js[0]);const o=Object.assign({},((PLANNING[wk]||{}).aff||{})[key]||{});const fd=js.filter(d=>!(o[d]||[]).length);
    if(!fd.length&&!js.some(d=>(o[d]||[]).includes(site))){S.plSplit={key,site};S.plSel=null;render();msg(pers(key).prenom+' est déjà placé'+(pers(key).genre==='femme'?'e':'')+' toute la semaine : coche les jours pour ce chantier (ils s\'ajoutent à l\'autre chantier)');return;} /* 10/10 (Ethan) : un gars sur deux chantiers dans sa semaine → on choisit les jours (déplacés, ou en plus pour un chef en autonomie) */
    if(!fd.length){S.plEdit=key+'|'+site;S.plSel=null;render();msg('Déjà sur ce chantier : règle ses jours');return;} /* jamais écraser le reste de sa semaine */
    fd.forEach(d=>{o[d]=[site];}); /* ③ : ne remplit que les jours libres */const tt=(S.plTeamOf||{})[site];if(tt)o['eq:'+site]=tt;savePlanning(wk,{[key]:o});S.plSel=null;const p=pers(key),c=site_(site);if(!secteurDe(p)&&c.secteur&&String(key).includes('@'))savePeoplePart(key,'secteur',c.secteur); /* premier placement : la personne est rattachée au secteur du chantier */render();msg(p.prenom+' placé'+(p.genre==='femme'?'e':'')+' sur '+c.nom+(js.every(d=>(o[d]||[]).includes(site))?' toute la semaine':' : '+js.filter(d=>(o[d]||[]).includes(site)).map(d=>fJour(d).slice(0,4)).join(', ')))},
  plsplit(v){S.plSplit=null;S.plEdit=null;render()},
  pladd(v){plDayToggle(v)},
  plday(v){plDayToggle(v)},
  plrm(v){const [key,site]=v.split('|');const js=semaineDe(S.plWeek||0),wk=weekKey(js[0]);const o=Object.assign({},((PLANNING[wk]||{}).aff||{})[key]||{});js.forEach(d=>{if(o[d]){o[d]=o[d].filter(x=>x!==site);if(!o[d].length)delete o[d];}});delete o['eq:'+site];savePlanning(wk,{[key]:Object.keys(o).length?o:null});S.plEdit=null;render()},
  plcopy(wk){const js=semaineDe(S.plWeek||0),jp=semaineDe((S.plWeek||0)-1),wp=weekKey(jp[0]);const prev=(PLANNING[wp]||{}).aff||{},cur=(PLANNING[wk]||{}).aff||{};const patch={};let n=0;
    plGens().forEach(p=>{if(cur[p.id]&&Object.keys(cur[p.id]).some(d=>js.includes(d)))return;const o=prev[p.id];if(!o)return;const nv={};jp.forEach((d,i)=>{if(o[d]&&o[d].length)nv[js[i]]=o[d].slice();});if(Object.keys(nv).length){Object.keys(o).filter(k=>k.startsWith('eq:')).forEach(k=>{nv[k]=o[k];}); /* l'équipe suit */patch[p.id]=Object.assign({},cur[p.id]||{},nv);n++;}});
    if(!n){msg('Rien à reprendre : la semaine passée est vide ou tout le monde est déjà placé');return}savePlanning(wk,patch);render();msg(n+' personne'+(n>1?'s':'')+' reprise'+(n>1?'s':'')+' de la semaine passée')},
  sim(v){msg('Pas encore branché : '+v)},
  tel(){}
};
let bound=false;
// 👁 vue d'une autre personne (administrateur, « voir l'appli comme ») : on regarde, on ne modifie rien à sa place (pointage, avatar, contact, validation, planning)
const viewing=()=>{const a=A.current();return !!(a&&a.test);};
/* 10/10 : recherche dans « À placer » — filtre les cartes en place (nom, prénom, poste ; accents ignorés) */
function plFilterTray(q){const nq=norm(q).trim();const hit=c=>!nq||nq.split(/\s+/).every(w=>(c.dataset.q||'').includes(w));const tray=$id('pl-tray');let n=0;if(tray){[...tray.querySelectorAll('.eq-plchip')].forEach(c=>{const ok=hit(c);c.style.display=ok?'':'none';if(ok)n++;});const none=$id('pl-none');if(none)none.style.display=n?'none':'';}
  [...document.querySelectorAll('#eq-app .eq-plsite .eq-plchip')].forEach(c=>c.classList.toggle('dim',!!nq&&!hit(c))); /* sur les chantiers : les autres s'estompent, la personne cherchée ressort */}
const RW=new Set(['pointer','editok','av','avhasard','avreinit','valider','toutvalider','corrok','plput','plday','plrm','plcopy','plstrict','pladd','plsetteam','tache','demande','binome']);
function viewOnly(){const me=pers(S.me);msg('👁 Tu regardes la vue de '+(me.prenom||me.nom||'cette personne')+' : rien n\'est modifié à sa place. Reviens sur ton compte, ou passe en « ✍ Agir comme » depuis l\'accueil.');}
function bind(){if(bound)return;bound=true;
  document.addEventListener('click',e=>{const app=e.target.closest&&e.target.closest('#eq-app');if(!app)return;const dc=e.target.closest('[data-objday]');if(dc){e.preventDefault();dc.classList.toggle('active');if(!dc.parentElement.querySelector('.chip.active'))dc.classList.add('active');return;} /* jours du formulaire d'objectif : au moins un */const el=e.target.closest('[data-act]');if(!el)return;if(el.tagName==='A'&&el.dataset.act==='tel')return;if(RW.has(el.dataset.act)&&viewing()){e.preventDefault();viewOnly();return;}const f=ACT[el.dataset.act];if(f){e.preventDefault();f(el.dataset.v,el);}});
  /* 13/10 : glisser à gauche / à droite sur le navigateur de semaine ou sur la zone qu'il pilote (.eq-wkzone) = semaine suivante / précédente */
  let swX=0,swY=0,swOn=false;document.addEventListener('touchstart',e=>{const z=e.target.closest&&e.target.closest('#eq-app .eq-wkswipe, #eq-app .eq-wkzone');swOn=!!z;if(!z)return;swX=e.touches[0].clientX;swY=e.touches[0].clientY;},{passive:true});
  document.addEventListener('touchend',e=>{if(!swOn)return;swOn=false;const t=e.changedTouches&&e.changedTouches[0];if(!t)return;const dx=t.clientX-swX,dy=t.clientY-swY;if(Math.abs(dx)<70||Math.abs(dy)>60||Math.abs(dx)<Math.abs(dy)*1.5)return;const nav=document.querySelector('#eq-app .eq-wknav');if(!nav)return;const f=ACT[nav.dataset.wknav];if(f)f(String((+nav.dataset.k||0)+(dx<0?1:-1)));},{passive:true});
  document.addEventListener('keydown',e=>{if(!ROOT||!document.contains(ROOT))return;if(e.key==='Enter'&&e.target.matches&&e.target.matches('#eq-app [role=button][data-act]'))e.target.click();if(e.key==='Escape'&&S.fiche)ACT.close();});
  document.addEventListener('change',e=>{if(!e.target.closest||!e.target.closest('#eq-app'))return;if(e.target.dataset&&e.target.dataset.gdpdf!==undefined&&e.target.files){const f=e.target.files[0];e.target.value='';if(!f)return;if(viewing()){viewOnly();return;}const me=pers(S.me);if(!(can(me,'dossier.edit')||can(me,'planning.edit')||me.admin)){msg('Réservé aux RH / encadrement');return;}gdPdfUpload(me,f);return;}if(e.target.dataset&&e.target.dataset.agimport!==undefined&&e.target.files){const f=e.target.files[0];e.target.value='';if(!f)return;const me=pers(S.me);if(viewing()){viewOnly();return;}const rd=new FileReader();rd.onload=()=>{const r=agImportIcs(me,rd.result);render();msg(r.err?'Import impossible : '+r.err:'✓ Outlook importé : '+r.n+' nouveau'+(r.n>1?'x':'')+(r.upd?' · '+r.upd+' mis à jour':'')+(r.n||r.upd?'':' — rien dans la période (semaine passée → 10 semaines)'));};rd.readAsText(f);return;} /* 12/10 : import Outlook (.ics) */if(e.target.dataset&&e.target.dataset.chg==='agWho'){S.agWho=e.target.value||null;S.agNew=null;render();return;}if(e.target.dataset&&e.target.dataset.chg==='gdPid'){S.gdPid=e.target.value||null;render();return;}if(e.target.dataset&&e.target.dataset.flphoto!==undefined&&e.target.files){const f=e.target.files[0];e.target.value='';const me=pers(S.me);if(viewing()){viewOnly();return;}flottePhoto(e.target.dataset.flphoto,f,can(me,'flotte.manage')||me.admin);return;} /* 13/10 : photo du vrai véhicule */if(e.target.dataset&&e.target.dataset.affile!==undefined&&e.target.files){const me=pers(S.me);affFiles(e.target.dataset.affile,e.target.files,affCtx(me));e.target.value='';return;} /* 12/10 : dépôt de fichiers du DCE (zip, PDF) */if(e.target.id==='pn-type'){const w=$id('pn-agw');if(w)w.style.display=e.target.value==='interim'?'':'none';return;}const ds=e.target.dataset||{};if(ds.afdpgf!==undefined&&e.target.files){const f=e.target.files[0];e.target.value='';const me=pers(S.me);if(f&&me)dpgfFile(ds.afdpgf,f,affCtx(me));return;} /* 13/10 : DPGF du client (.xlsx / .csv) */if(ds.afin!==undefined||ds.afz!==undefined||ds.afc!==undefined||ds.afb!==undefined||ds.aff!==undefined||ds.afs!==undefined||ds.afzn!==undefined||ds.afcs!==undefined||ds.afq!==undefined||ds.afqr!==undefined||ds.afm!==undefined||ds.afdp!==undefined||ds.afx!==undefined||ds.afprix!==undefined||ds.afpt!==undefined||ds.afdoc!==undefined||ds.afdm!==undefined){const me=pers(S.me);if(me)affInput(e.target,affCtx(me));return;}if(ds.flin!==undefined||ds.flf!==undefined){const me=pers(S.me);if(me)flotteInput(e.target,flCtx(me));return;}if(ds.cmdf!==undefined||ds.cmdl!==undefined){const me=pers(S.me);if(me)cmdInput(e.target,cmdCtx(me));return;}const k=e.target.dataset&&e.target.dataset.chg;if(!k)return;
    if((k==='plfiche'||k==='plpers'||k==='avpays')&&viewing()){viewOnly();render();return;}
    if(k==='perk'){S.per.k=+e.target.value;render();return}
    if(k==='perm'){S.per.m=e.target.value;render();return}
    if(k==='avpays'){if(e.target.value){const me=pers(S.me);avApply(me,{[avMe(me).bandanaCle]:e.target.value});render()}return}
    if(k==='plfiche'){const id=e.target.dataset.site,kk=e.target.dataset.k;if(A.saveSiteFiche)A.saveSiteFiche(id,{[kk]:e.target.value||null}).then(()=>render());return}
    if(k==='plpers'){const key=e.target.dataset.p,kk=e.target.dataset.k;savePeoplePart(key,kk,e.target.value||null);render();return}
    S[k]=e.target.value;render();});
  document.addEventListener('toggle',e=>{const t=e.target;if(!t||!t.dataset)return;if(t.dataset.gdnav)S.gdNav=t.open;if(t.dataset.gdaddr)S.gdAddrOpen=t.open;},true); /* 13/10 soir : navette / adresses à vérifier : ouvert ou fermé, gardé au re-rendu */
  document.addEventListener('input',e=>{if(e.target.id==='pl-q'){S.plQ=e.target.value;plFilterTray(S.plQ);return;}if(e.target.id!=='eq-q')return;S.q=e.target.value;const l=$id('eq-annu-liste');if(l)l.innerHTML=listeEnt(pers(S.me));});
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
