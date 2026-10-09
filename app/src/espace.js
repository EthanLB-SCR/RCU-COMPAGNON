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
  const now=new Date();const today=iso(now);const nowHM=pad(now.getHours())+':'+pad(now.getMinutes());
  const live=A.accounts();if(live&&live.length&&live!==ACC_CACHE){ACC_CACHE=live;kvSet('trace:accountsCache',live.map(a=>Object.assign({},a)));} /* liste des comptes gardée pour le hors-connexion (annuaire) */
  const accs=(live||ACC_CACHE||(A.state.cloudUser?[]:A.personas())).filter(a=>a&&a.poste!=='visiteur'&&(a.active!==false||a.invite));
  const cur=A.current();if(cur&&cur.poste!=='visiteur'&&!accs.some(a=>personKey(a)===personKey(cur)))accs.push(cur); /* la personne connectée est toujours là, même avant la liste des comptes */
  const personnes=accs.map(a=>{const key=personKey(a);const x=PEOPLE[key]||{};const [prenom,nom]=splitName(a);
    return {id:key,acc:a.id,prenom,nom,email:a.email||'',tel:x.tel||'',poste:POSTES_ESP[a.poste]?a.poste:'autre',type:a.type||'salarie',admin:!!a.admin,active:a.active!==false,invite:!!a.invite,sites:a.sites||null,rights:a.rights||{},
      entree:x.entree||null,contrat:x.contrat||null,urgence:x.urgence||null,secteur:x.secteur||null,_acc:a};});
  const seen=new Set();const uniques=personnes.filter(p=>{if(seen.has(p.id))return false;seen.add(p.id);return true;});
  const chantiers=(A.sites()||[]).map(c=>({id:c.id,nom:c.name||c.id,ville:c.ville||'',soudures:+c.nw||0,faites:c.faites!=null?+c.faites:undefined,chef:c.chef||null,conducteur:c.conducteur||null,secteur:c.secteur||null,ll:c.ll||null})).concat([{id:'siege',nom:'Siège',ville:'Bureau',bureau:true}]);
  const affectations={};uniques.forEach(p=>{if(p.type==='interim'&&Array.isArray(p.sites)&&p.sites.length&&chantiers.some(c=>c.id===p.sites[0]))affectations[p.id]=p.sites[0];});
  const habilitations=[];const avatars={},avatarCompteurs={},documents={};
  uniques.forEach(p=>{const x=PEOPLE[p.id]||{};(x.habs||[]).forEach(h=>habilitations.push(Object.assign({p:p.id},h)));avatars[p.id]=x.avatar||{};avatarCompteurs[p.id]=x.compteurs||{};documents[p.id]=x.docs||[];});
  return {today,now:nowHM,config:CONFIG,familles:FAMILLES_ESP,postes:POSTES_ESP,chantiers,personnes:uniques,inconnus:{},affectations,planning:planningAff(),meteo:meteoData(),
    habTypes:HAB_TYPES,habRequises:HAB_REQ,habilitations,pointages:POINTAGES,demandes:null,taches:null,stock:null,engins:null,agenda:null,equipes:null,productions:{},
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
const TODAY=()=>{const n=new Date();return n.getFullYear()+'-'+pad(n.getMonth()+1)+'-'+pad(n.getDate());};
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
const PROD={soudures:['soudure','soudures'],fils:['fil','fils'],retractions:['rétraction','rétractions'],bouchons:['bouchon','bouchons'],pouces:['pouce','pouces'],heures:["h d'engin","h d'engin"]};
const OPERATEURS=['soudeur','tuyauteur','manchonneur','chauffeur_engin'];
const ENCADRE=['chef','conducteur']; // ils voient la production de leur équipe, pas la leur
function prodIds(me){ // de qui je vois la production : la mienne (opérateur) ou celle de mon équipe (chef de chantier)
  if(OPERATEURS.includes(me.poste))return [me.id];
  if(ENCADRE.includes(me.poste))return equipeDe(me).filter(p=>p.active&&OPERATEURS.includes(p.poste)).map(p=>p.id);
  return null;
}
function addProd(t,o){ // additionne deux productions, détail par DN compris
  for(const k in o){if(k==='dn'){t.dn=t.dn||{};for(const n in o.dn)t.dn[n]=(t.dn[n]||0)+o.dn[n]}else t[k]=(t[k]||0)+o[k]}
  return t}
function prodJour(ids,d){const t={};
  ids.forEach(id=>{addProd(t,(DATA.productions[id]||{})[d]||{});
    if(ids.length===1&&pers(id).poste==='tuyauteur'){const n=poucesRecus(id,d);if(n)t.pouces=(t.pouces||0)+n}}); // en total d'équipe, on ne recompte pas les pouces du soudeur
  return t}
const dnListe=dn=>Object.keys(dn||{}).map(Number).sort((a,b)=>a-b).filter(k=>dn[k]);
const dnTxt=dn=>dnListe(dn).map(k=>'DN '+k+' × '+dn[k]).join(' · ');
const dnChips=dn=>dnListe(dn).length?`<div class="eq-dn">${dnListe(dn).map(k=>`<span>DN ${k} · <b>${dn[k]}</b></span>`).join('')}</div>`:'';
const prodTxt=o=>Object.keys(PROD).filter(k=>o&&o[k]).map(k=>nb(o[k])+' '+PROD[k][o[k]>1?1:0]+(k==='soudures'&&o.dn?' ('+dnTxt(o.dn)+')':'')).join(' · ');
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
function binome(tuy,d){return DATA.equipes.find(e=>e.tuyauteur===tuy&&e.d===d)||null}
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
function cPointer(me,lien){ // les boutons de pointage (le code existe déjà dans l'appli) : c'est dans Mon espace que ça se passe
  if(!can(me,'pointage.self'))return '';
  const x=ptDe(me.id,DATA.today),t=totSemaine(me.id),c=x?calc(x):null,ch=siteActuel(me),der=x&&x.events[x.events.length-1];
  const B=(k,txt,prim)=>`<button class="btn${prim?' primary':''}" data-act="pointer" data-v="${k}">${txt}</button>`;
  let l,b;
  if(!x){l='Pas encore pointé aujourd\'hui.';b=B('start','▶ Début de journée',1)}
  else if(c.fin){const st=statutPt(x);l=`Journée finie à ${fHeure(c.fin)} · <b>${fDuree(c.total)}</b> ${etat(st.k,st.mot)}`;b=`<button class="btn" data-act="sim" data-v="Demande d'annulation envoyée à ton chef de chantier">Demander une annulation</button>`}
  else if(c.etat==='p'){l=`En pause depuis ${fHeure(der.at)} · <b>${fDuree(c.total)}</b> travaillées`;b=B('resume','▶ Reprise',1)}
  else if(c.etat==='i'){l=`Parti vers un autre chantier à ${fHeure(der.at)} · <b>${fDuree(c.total)}</b>`;b=B('arrive','📍 Arrivée sur le chantier',1)}
  else{l=`Commencé à ${fHeure(c.debut)} · <b>${fDuree(c.total)}</b> ${etat('ok','En cours')}`;b=B('pause','⏸ Pause')+B('end','⏹ Fin de journée')+B('leave','Départ vers un autre chantier')}
  return `<div class="card"><h3>Tes heures <span class="hint">· ${ch?esc(ch.nom):'pas de chantier prévu'}</span></h3><div>${l}</div>
    <div class="eq-acts" style="margin:10px 0 6px">${b}</div>
    <div class="hint">Semaine en cours : ${fDuree(t.total)} sur ${t.n} jour${t.n>1?'s':''} · 📍 position relevée au début et à la fin, c'est tout.</div>
    ${lien?`<button class="btn eq-full" data-act="go" data-v="mesheures">Voir tes heures</button>`:''}</div>`;
}
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
  const plage=c.debut?fHeure(c.debut)+' → '+(c.fin?fHeure(c.fin):'—')+' · '+fDuree(c.total)+' · pause '+fDuree(c.pa)+(c.it?' · inter '+fDuree(c.it):''):'';
  return `<div class="eq-vrow"><div class="eq-row"${ouvre?` data-act="fiche" data-v="${p.id}"`:''}>${ouvre?avatar(p):''}<span class="eq-grow"><span class="eq-t">${titre}</span><span class="eq-s">${esc(sous?sous+' · ':'')}${plage}</span>
    ${x.corr?`<span class="eq-s">✏️ ${esc(EVT[x.corr.t]||'heure')} ${fHeure(x.corr.heure)}${x.corr.avant?' au lieu de '+fHeure(x.corr.avant):''} — ${esc(x.corr.motif)}</span>`:''}
    ${prod?`<span class="eq-s">Production du jour : <b style="font-weight:600;color:var(--ink)">${esc(prod)}</b></span>`:''}<span class="eq-s" style="margin-top:3px">${att&&!c.manque?etat('off','Attend le chef de chantier'):etat(st.k,st.mot)}</span></span></div>
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
    <div id="eq-annu-liste">${listeEnt(me)}</div>`;
}

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
      ${cles.length?`<div class="eq-tiles">${cles.map(x=>`<div class="eq-tile"><b>${nb(tot[x])}</b><span class="eq-s">${PROD[x][tot[x]>1?1:0]}${x==='pouces'&&me.poste==='tuyauteur'?' de ton soudeur':''}</span></div>`).join('')}</div>${dnChips(tot.dn)}`:'<div class="eq-s">Rien de compté sur la période.</div>'}
      <div class="hint" style="margin-top:8px">Compté sur le plan, à ton nom. Une erreur ? Vois avec ton chef de chantier.</div></div>
    <div class="eq-sems">${blocs}</div>`;
}
/* Chef de chantier et conducteur : la production de l'équipe, par chantier puis par personne.
   Soudeur = soudures par DN ; manchonneur = fils, rétractions, bouchons ; jamais seulement des pouces. */
function vProdEquipe(me){
  const ids=prodIds(me)||[],jours=semainesAff().flatMap(x=>x.js).filter(d=>d<=DATA.today).sort(),tot={};
  const par={};ids.forEach(id=>{par[id]={};jours.forEach(d=>addProd(par[id],prodJour([id],d)));addProd(tot,pers(id).poste==='tuyauteur'?{}:par[id])});
  const siteOf=id=>planDe(id,DATA.today)[0]||null;const sites=[...new Set(ids.map(siteOf))];
  const cles=Object.keys(PROD).filter(x=>tot[x]);
  const ligne=o=>Object.keys(PROD).filter(x=>o[x]).map(x=>nb(o[x])+' '+PROD[x][o[x]>1?1:0]).join(' · ');
  return `<h2 class="vt">Productions de ton équipe</h2>${chipsPeriode()}
    <div class="card"><h3>Total <span class="hint">· ${periodeTxt()} · ${ids.length} opérateur${ids.length>1?'s':''}${sites.length>1?' · '+sites.length+' chantiers':''}</span></h3>
      ${cles.length?`<div class="eq-tiles">${cles.map(x=>`<div class="eq-tile"><b>${nb(tot[x])}</b><span class="eq-s">${PROD[x][tot[x]>1?1:0]}</span></div>`).join('')}</div>
      ${tot.dn?`<div class="eq-lab">Soudures par DN</div>${dnChips(tot.dn)}`:''}`:'<div class="eq-s">Rien de compté sur la période.</div>'}</div>
    <div class="eq-sems">${sites.map(i=>{const g=ids.filter(id=>siteOf(id)===i).map(pers);
      return `<div class="card"><h3>📍 ${esc(site(i).nom)} <span class="hint">· ${g.length} opérateur${g.length>1?'s':''}</span></h3><div class="eq-list">${g.map(p=>{
        const o=par[p.id],cle='prod|'+p.id,open=S.open[cle];
        return `<div class="eq-vrow"><button class="eq-row" data-act="jour" data-v="${cle}" aria-expanded="${!!open}">${avatar(p)}<span class="eq-grow"><span class="eq-t">${esc(nomC(p))}${tagType(p)} <span class="eq-s">· ${esc(poste(p).label)}</span></span>
          <span class="eq-prodl">${esc(ligne(o))||'<span class="hint">Rien de compté</span>'}${p.poste==='tuyauteur'&&o.pouces?' <span class="hint">de son soudeur</span>':''}</span>${dnChips(o.dn)}</span><span class="hint">${open?'▲':'▼'}</span></button>
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
  if(t==='terrain'){a=[cPointer(me,true),cTaches(me),cChantiersSemaine(me,0,true),cProdSemaine(me)];b=[cEchPerso(me),cRecompenses(me)];c=[cFiche(me,me)]}
  if(t==='chef'){a=[cEquipeJour(me),cBinomes(me)];b=[cAValider(me),cDemandes(me),cProdSemaine(me),cEchEquipe(me)];c=[cMesChantiers(me),cPointer(me,true),cTaches(me),cChantiersSemaine(me,0,true),cEchPerso(me),cRecompenses(me),cFiche(me,me)]}
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
  const dots=site?`<span class="eq-pldots">${js.map(d=>`<i class="${jours.includes(d)?'on':''}" title="${fJour(d)}">${['L','M','M','J','V'][D(d).getDay()-1]||''}</i>`).join('')}</span>`:'';
  return `<div class="eq-plchip${sel?' sel':''}${site?'':' libre'}" draggable="true" data-drag="${esc(p.id)}" data-site="${esc(site||'')}">
    <button class="eq-plmain" data-act="${site?'pledit':'plsel'}" data-v="${esc(site?p.id+'|'+site:p.id)}" title="${site?'Régler les jours':'Choisir, puis toucher un chantier'}">${avatar(p)}<span class="eq-grow"><b>${esc(p.prenom)} ${esc(p.nom)}</b><small>${esc(poste(p).label)}${p.type==='interim'?' · intérim':''}${!site&&secteurDe(p)?' · '+esc(SECTEURS[secteurDe(p)]||secteurDe(p)):''}</small></span>${dots}</button>
    ${edit?`<div class="eq-pledit"><div class="eq-s" style="margin-bottom:6px">Jours sur ce chantier</div><div class="eq-opts">${js.map(d=>`<button class="chip${jours.includes(d)?' active':''}" data-act="plday" data-v="${esc(p.id)}|${esc(site)}|${d}">${fJour(d).slice(0,4)} ${d.slice(8,10)}</button>`).join('')}</div>
      <div class="eq-acts" style="margin:8px 0 0"><button class="btn" data-act="plrm" data-v="${esc(p.id)}|${esc(site)}">Retirer de ce chantier</button><button class="btn" data-act="pledit" data-v="${esc(p.id)}|${esc(site)}">Fermer</button></div>
      <label class="f">Secteur de rattachement</label><select class="f" data-chg="plpers" data-k="secteur" data-p="${esc(p.id)}"><option value="">—</option>${Object.keys(SECTEURS).map(k=>`<option value="${k}"${secteurDe(p)===k?' selected':''}>${SECTEURS[k]}</option>`).join('')}</select></div>`:''}</div>`;}
function vOrga(me){
  const k=S.plWeek||0,js=semaineDe(k),wk=weekKey(js[0]);ensureWeeks([wk,weekKey(semaineDe(k-1)[0])]);
  const sect=S.plSect===undefined?mySecteur(me):S.plSect;const aff=(PLANNING[wk]||{}).aff||{};
  const chantiers=DATA.chantiers.filter(c=>!c.bureau);const duSect=chantiers.filter(c=>!sect||c.secteur===sect||!c.secteur),hors=chantiers.filter(c=>sect&&c.secteur&&c.secteur!==sect); /* un chantier sans secteur reste visible : on lui règle son secteur (⚙) */
  const gens=plGens();const mine=gens.filter(p=>!sect||secteurDe(p)===sect||!secteurDe(p)),autres=gens.filter(p=>sect&&secteurDe(p)&&secteurDe(p)!==sect); /* sans secteur : à placer ici (le premier placement le rattache) */
  const estPlace=p=>Object.keys(plSitesDe(aff,p,js)).length>0;const aPlacer=mine.filter(p=>!estPlace(p)),places=mine.filter(estPlace).length,aPlacerAutres=autres.filter(p=>!estPlace(p));
  const selP=S.plSel?pers(S.plSel):null;const pct=mine.length?Math.round(places/mine.length*100):0;
  const chefs=DATA.personnes.filter(p=>p.active&&p.poste==='chef'),conds=DATA.personnes.filter(p=>p.active&&(p.poste==='conducteur'||poste(p).fam==='encadrement'));
  const fiche=c=>{const dk='plF_'+c.id;const resume=[c.secteur?SECTEURS[c.secteur]||c.secteur:'secteur ?',c.chef?nomC(pers(c.chef)):'chef ?',c.conducteur?nomC(pers(c.conducteur)):'conducteur ?'].join(' · ');
    return `<details class="eq-plfd"${S[dk]?' open':''} data-det="${dk}"><summary class="eq-s">⚙ ${esc(resume)}</summary><div class="eq-plfiche"><select class="f" data-chg="plfiche" data-site="${esc(c.id)}" data-k="secteur" title="Secteur"><option value="">Secteur…</option>${Object.keys(SECTEURS).map(x=>`<option value="${x}"${c.secteur===x?' selected':''}>${SECTEURS[x]}</option>`).join('')}</select>
    <select class="f" data-chg="plfiche" data-site="${esc(c.id)}" data-k="chef" title="Chef de chantier"><option value="">Chef de chantier…</option>${chefs.map(p=>`<option value="${esc(p.id)}"${c.chef===p.id?' selected':''}>${esc(nomC(p))}</option>`).join('')}</select>
    <select class="f" data-chg="plfiche" data-site="${esc(c.id)}" data-k="conducteur" title="Conducteur de travaux"><option value="">Conducteur…</option>${conds.map(p=>`<option value="${esc(p.id)}"${c.conducteur===p.id?' selected':''}>${esc(nomC(p))}</option>`).join('')}</select></div></details>`;};
  const carte=c=>{const ici=gens.filter(p=>plSitesDe(aff,p,js)[c.id]);const n=ici.length;
    return `<div class="card eq-plsite${selP?' drop':''}" data-drop="${esc(c.id)}"><div class="eq-plhead"><span class="eq-grow"><span class="eq-big">📍 ${esc(c.nom)}</span><span class="eq-s">${esc(c.ville||'')}${c.secteur?(c.ville?' · ':'')+esc(SECTEURS[c.secteur]||c.secteur):''}${c.soudures?' · '+nb(c.soudures)+' soudures':''}</span></span><span class="eq-plcount${n?'':' vide'}">${n}</span></div>
      ${js.some(d=>meteoDe(c.id,d))?`<div class="eq-plmeteo">${js.map(d=>{const mt=meteoDe(c.id,d);return `<span title="${fJour(d)}${mt?' · '+METEO[mt.k][1]+' '+mt.t+' °C'+(mt.mm?' · '+mt.mm+' mm':''):''}">${mt?METEO[mt.k][0]+'<b>'+mt.t+'°</b>':'·'}</span>`;}).join('')}</div>`:''}
      ${fiche(c)}
      <div class="eq-plpeople">${ici.map(p=>plChip(p,c.id,js,aff,me)).join('')||'<div class="eq-s eq-plvide">Personne pour l\'instant</div>'}</div>
      ${selP?`<button class="btn primary eq-full" data-act="plput" data-v="${esc(c.id)}">Placer ${esc(selP.prenom)} ici · toute la semaine</button>`:''}</div>`;};
  return `<h2 class="vt">Planning équipe <span class="hint">· semaine ${numSemaine(js[0])} · du ${fDate(js[0]).slice(0,5)} au ${fDate(js[4])}</span></h2>
    <div class="eq-nav"><button class="btn" data-act="plweek" data-v="${k-1}">◀</button><div class="eq-filtres" style="padding:0;flex:1">${[[-1,'Semaine passée'],[0,'Cette semaine'],[1,'Semaine prochaine'],[2,'Dans 2 semaines']].map(([n,t])=>`<button class="chip${k===n?' active':''}" data-act="plweek" data-v="${n}">${t}</button>`).join('')}</div><button class="btn" data-act="plweek" data-v="${k+1}">▶</button></div>
    <div class="card"><div class="eq-2sel"><div><label class="f" style="margin-top:0">Secteur</label><select class="f" data-chg="plSect"><option value=""${sect===''?' selected':''}>Tous les secteurs</option>${Object.keys(SECTEURS).map(x=>`<option value="${x}"${sect===x?' selected':''}>${SECTEURS[x]}</option>`).join('')}</select></div>
      <div><label class="f" style="margin-top:0">Semaine</label><div class="eq-plprog${pct>=100?' ok':''}"><b>${places} / ${mine.length}</b> placé${places>1?'s':''}${pct>=100&&mine.length?' · 🎉 tout le monde est placé':''}<span class="eq-prog"><i style="width:${pct}%"></i></span></div></div></div>
      <div class="eq-acts" style="margin:10px 0 0"><button class="btn" data-act="plcopy" data-v="${wk}">↩ Reprendre la semaine passée</button><button class="btn${S.plEnc?' primary':''}" data-act="plenc">${S.plEnc?'✓ ':''}Avec l'encadrement</button>${me.admin?`<button class="btn" data-act="plstrict" title="Règle d'accès des gars qui ne sont pas placés">${PL_RULES.strict?'🔒 Non placé = rien':'🔓 Non placé = tout voir'}</button>`:''}</div>
      <div class="hint" style="margin-top:6px">Touche une personne puis un chantier (ou glisse-la). Toucher une personne placée règle ses jours. Les gars n'ouvrent dans l'appli que les chantiers de leur semaine et de la précédente.</div></div>
    <div class="eq-cols eq-2b"><div>
      <div class="card eq-pltray${selP?' sel':''}" data-drop="tray"><h3>À placer <span class="hint">· ${aPlacer.length}</span></h3>${aPlacer.length?`<div class="eq-plpeople">${aPlacer.map(p=>plChip(p,null,js,aff,me)).join('')}</div>`:`<div class="eq-s">${mine.length?'🎉 Tout le monde est placé cette semaine.':'Personne dans ce secteur : rattache les gars à un secteur (toucher une personne placée → secteur) ou choisis « Tous les secteurs ».'}</div>`}
        ${autres.length?`<details${S.plAutres?' open':''} data-det="plAutres" style="margin-top:8px"><summary class="eq-s" style="cursor:pointer;min-height:44px;display:flex;align-items:center">Autres secteurs · ${aPlacerAutres.length} à placer${autres.length-aPlacerAutres.length?' · '+(autres.length-aPlacerAutres.length)+' déjà placé'+(autres.length-aPlacerAutres.length>1?'s':''):''}</summary><div class="eq-plpeople">${aPlacerAutres.map(p=>plChip(p,null,js,aff,me)).join('')||'<div class="eq-s">Tous placés.</div>'}</div></details>`:''}</div>
      </div><div>
      <div class="eq-plsites">${duSect.map(carte).join('')||'<div class="card"><div class="eq-s">Aucun chantier dans ce secteur : règle le secteur des chantiers (⚙ sur chaque chantier, avec « Tous les secteurs »).</div></div>'}</div>
      ${hors.length?`<details${S.plAutres?' open':''} data-det="plAutres"><summary class="eq-s" style="cursor:pointer;min-height:44px;display:flex;align-items:center;padding:0 4px">Chantiers des autres secteurs · ${hors.length}</summary><div class="eq-plsites">${hors.map(carte).join('')}</div></details>`:''}
    </div></div>`;
}

/* ── Sous-onglets selon les droits ── */
function subsFor(me){
  if(S.tab!=='moi')return [];
  return [['moi','Accueil'],['planning','Planning'],can(me,'planning.edit')&&['orga','Planning équipe'],mesSites(me).length&&['chantiers','Chantiers'],prodIds(me)&&['prod','Productions'],(can(me,'pointage.self')||can(me,'pointage.validate'))&&['heures',can(me,'pointage.self')?'Heures':'Pointages'],['habs','Habilitations'],KIT&&avPoste(me)&&['avatar','Avatar']].filter(Boolean);
}
function badge(me,k){
  const val=can(me,'pointage.validate'),qse=can(me,'qse.manage');
  const nV=()=>{const ids=equipeIds(me);return DATA.pointages.filter(x=>ids.has(x.p)&&aValider(x,me)).length};
  const nP=()=>habsDe(me).filter(x=>x.etat==='expiree'||x.etat==='echeance').length;
  const nE=()=>alertesHab(equipeDe(me),0).length;
  let n=0,r=false;
  if((k==='heures'||k==='valid')&&val)n=nV();
  else if(k==='meshabs'||(k==='habs'&&!qse))n=nP();
  else if(k==='ech'||(k==='habs'&&qse)){n=nE();r=true}
  return n?` <span class="eq-badge${r?' eq-rouge':''}">${n}</span>`:'';
}
function fix(me){const s=subsFor(me).map(x=>x[0]);if(s.length&&!s.includes(S.sub))S.sub=s[0];}
function vue(me){
  if(S.tab==='entreprise')return vEntreprise(me);
  switch(S.sub){
    case 'moi':return vMoi(me);
    case 'planning':return vPlanning(me);
    case 'orga':return vOrga(me);
    case 'prod':return vProd(me);
    case 'chantiers':return vChantiers(me);
    case 'heures':return vHeures(me);
    case 'habs':return vHabs(me,true,true);
    case 'avatar':return vAvatar(me);
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
export function espaceRender(el,tab){ROOT=el;S.tab=tab==='entreprise'?'entreprise':'moi';S.fiche=null;S.corr=null;S.edit=false;render();if(!LOADED&&!loading){loading=true;espaceLoad().catch(e=>console.warn(e)).finally(()=>{loading=false;});}}
let loading=false;
export function espaceOpenFiche(key){S.fiche=key;render();}
export function espaceSub(k){S.tab='moi';S.sub=k;render();}
/* ── Actions (clics délégués) : tout ce qui modifie est enregistré ── */
const GO={mesheures:['moi','heures'],valid:['moi','heures'],meshabs:['moi','habs'],ech:['moi','habs'],annu:['entreprise','moi'],planning:['moi','planning'],prod:['moi','prod'],chantiers:['moi','chantiers'],avatar:['moi','avatar']};
function validerPt(x){x.status='valide';x.val.push({by:S.me,at:DATA.today+'T'+DATA.now});savePointage(x);}
function msg(t){A.toast(t);}
const ACT={
  tab(v){S.tab=v;S.fiche=null;S.sub='moi';if(A.homeTab)A.homeTab(v==='entreprise'?'entreprise':'espace');else render()},
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
  opensite(v){const [id,tab]=String(v).split('|');if(A.openSite)A.openSite(id,tab);},
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
  plput(site){const key=S.plSel;if(!key)return;const js=semaineDe(S.plWeek||0),wk=weekKey(js[0]);const o=Object.assign({},((PLANNING[wk]||{}).aff||{})[key]||{});js.forEach(d=>{o[d]=[site];});savePlanning(wk,{[key]:o});S.plSel=null;const p=pers(key),c=site_(site);if(!secteurDe(p)&&c.secteur&&String(key).includes('@'))savePeoplePart(key,'secteur',c.secteur); /* premier placement : la personne est rattachée au secteur du chantier */render();msg(p.prenom+' placé'+(p.genre==='femme'?'e':'')+' sur '+c.nom+' toute la semaine')},
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
  document.addEventListener('change',e=>{if(!e.target.closest||!e.target.closest('#eq-app'))return;const k=e.target.dataset&&e.target.dataset.chg;if(!k)return;
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
