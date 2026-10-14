// reg.js — REGISTRE générique (nuit du 09 au 10/10/2026) : lignes {kind, id, data} partagées par toute l'entreprise, hors chantier.
// Sert aux documents d'entreprise (règlement intérieur, notes de service, accueil entreprise) et leurs signatures, aux affaires (commerce),
// au parc véhicules… Une seule table serveur (sql/nuit_v1.sql : public.registre + RPC registre_set), un miroir sur l'appareil (kv),
// une file d'attente hors connexion rejouée à la reconnexion — même logique que Mon espace (people / pointages / planning).
// Règles d'écriture côté serveur (RPC) : doc / affaire / vehicule / mission → administrateur, chef, bureau ; docsig → la personne elle-même
// (clé = son e-mail) ou l'encadrement (tablette du chef). Lecture : tout compte actif.
let A=null;
const ROWS={};            // kind → { id → {id, data, updated_at} }
let PEND=[];              // [{kind, id, patch, mode}] en attente de réseau
const LISTENERS=new Set();
const LOADED=new Set();
let flushT=null;const WARNED={};
const REFUSED={}; // 13/10 soir : écritures refusées par le serveur pour une question de DROITS — gardées (le droit peut arriver), listées avec « Abandonner » (pastille ⚠️ de l'appli)
export function initReg(api){A=api;}
export function onReg(cb){LISTENERS.add(cb);return ()=>LISTENERS.delete(cb);}
function emit(kind,src){LISTENERS.forEach(cb=>{try{cb(kind,src||'local');}catch(e){console.warn(e);}});} /* 14/10 nuit (sync) : 2e argument = origine — 'local' (écriture faite ici) ou 'server' (données reçues : l'appli redessine sans casser une saisie) */
/* 14/10 nuit (sync) : repère serveur (ms) = plus récent updated_at reçu du serveur → rafraîchissement léger (seulement les lignes modifiées depuis) ; signature d'un registre (ne redessine que si quelque chose a changé) */
let SRV_MAX=0;const noteAt=at=>{const t=at?Date.parse(at):0;if(t&&t>SRV_MAX&&t<Date.now()+86400000)SRV_MAX=t;};
const sigOf=kind=>Object.values(ROWS[kind]||{}).map(r=>r.id+'@'+r.updated_at).sort().join('|');
const kvSet=async(k,v)=>{try{await A.kv.set(k,v);}catch(e){}};
const kvGet=async k=>{try{return await A.kv.get(k);}catch(e){return null;}};
export const regAll=kind=>Object.values(ROWS[kind]||{}).filter(r=>r&&r.data&&!r.data.deleted).map(r=>Object.assign({id:r.id},r.data));
export const regGet=(kind,id)=>{const r=ROWS[kind]&&ROWS[kind][id];return r&&r.data?Object.assign({id:r.id},r.data):null;};
export const regLoaded=kind=>LOADED.has(kind);
function put(kind,id,data,at){(ROWS[kind]=ROWS[kind]||{})[id]={id,data,updated_at:at||new Date().toISOString()};}
// fusion locale : patch objet → fusion de premier niveau (null supprime la clé) ; mode 'replace' → remplacement complet
function merge(old,patch,mode){if(mode==='replace')return patch;const out=Object.assign({},old||{});Object.keys(patch||{}).forEach(k=>{if(patch[k]===null)delete out[k];else out[k]=patch[k];});return out;}
export function regSet(kind,id,patch,opts){opts=opts||{};const mode=opts.replace?'replace':'merge';const old=ROWS[kind]&&ROWS[kind][id]?ROWS[kind][id].data:null;const data=merge(old,patch,mode);put(kind,id,data);kvSet('trace:reg:'+kind,ROWS[kind]);
  if(!opts.local){ /* une écriture en attente sur la même ligne est remplacée par la fusion des deux (le serveur ne verra que le résultat) */
    const i=PEND.findIndex(w=>w.kind===kind&&w.id===id);if(i>=0){const w=PEND[i];PEND[i]={kind,id,patch:mode==='replace'?patch:(w.mode==='replace'?merge(w.patch,patch,'merge'):Object.assign({},w.patch,patch)),mode:w.mode==='replace'?'replace':mode};}else PEND.push({kind,id,patch,mode}); /* 14/10 nuit (audit) : deux écritures « fusion » en attente se cumulent EN GARDANT les null (suppression d'une clé) — avant, la suppression se perdait */
    kvSet('trace:regPending',PEND);clearTimeout(flushT);flushT=setTimeout(()=>regFlush().catch(e=>console.warn(e)),600);}
  if(!opts.quiet)emit(kind,'local'); /* 13/10 : quiet = enregistré (appareil + serveur) sans redessiner — texte du mémoire tapé dans la page */return data;}
export function regDelete(kind,id,opts){return regSet(kind,id,{deleted:true,deletedAt:new Date().toISOString(),deletedBy:A.userName?A.userName():''},opts);}
/* 14/10 nuit (audit) : UN SEUL envoi à la fois — plusieurs envois simultanés (chargement d'un registre, minuterie, rafraîchissement) renvoyaient la même écriture jusqu'à 11 fois ; un appel pendant un envoi en relance un à la fin */
let FLUSHING=null,FLUSH_AGAIN=false;
export function regFlush(){if(FLUSHING){FLUSH_AGAIN=true;return FLUSHING;}FLUSHING=regFlush_().catch(e=>{console.warn(e);}).finally(()=>{FLUSHING=null;if(FLUSH_AGAIN){FLUSH_AGAIN=false;regFlush();}});return FLUSHING;}
async function regFlush_(){if(!PEND.length||!A.state.cloudUser||!A.sync.setRegistre)return;const list=PEND.slice();const rest=[];
  for(let i=0;i<list.length;i++){const w=list[i];let ok=false,stop=false;try{const r=await A.sync.setRegistre(w.kind,w.id,w.patch,w.mode);ok=!!r.ok;if(!ok&&r.missing){if(/registre inconnu/i.test(r.error||'')){if(A.toast&&!WARNED[w.kind]){WARNED[w.kind]=1;A.toast('Serveur : passe le SQL sql/'+({prix:'retours_13-10b.sql',panier:'retours_13-10b.sql',cpth:'retours_13-10d.sql',magcat:'retours_14-10a.sql',magdem:'retours_14-10a.sql',magmvt:'retours_14-10a.sql',vcfg:'retours_14-10a.sql',vrec:'retours_14-10a.sql'}[w.kind]||'retours_12-10.sql')+' (registre « '+w.kind+' »)');}} /* 12/10 : un registre que le serveur ne connaît pas encore attend, sans bloquer les autres */else{if(A.toast)A.toast('Serveur : passe le SQL sql/nuit_v1.sql (registre)');stop=true;}}
      else if(!ok&&/droit|réservé|inactif|permission|policy/i.test(r.error||'')){REFUSED[w.kind+'|'+w.id]={kind:w.kind,id:w.id,error:String(r.error||'').slice(0,160),at:Date.now()};if(A.toast&&!WARNED['x'+w.kind]){WARNED['x'+w.kind]=1;A.toast('Serveur : écriture refusée — '+String(r.error).replace(/^.*?:\s*/,'').slice(0,140)+' (gardée sur cet appareil : ⚠️ en haut pour l\'abandonner)');}} /* 13/10 (e) : base de prix sans le droit côté serveur ; 13/10 soir : abandon possible */
      if(ok)delete REFUSED[w.kind+'|'+w.id];
      if(ok&&r.row&&r.row.data&&!list.some(x=>x!==w&&x.kind===w.kind&&x.id===w.id)&&!PEND.some(x=>x!==w&&x.kind===w.kind&&x.id===w.id)){ /* 14/10 nuit (audit) : une écriture plus récente attend → on garde la ligne locale */put(w.kind,w.id,r.row.data,r.row.updated_at);noteAt(r.row.updated_at);kvSet('trace:reg:'+w.kind,ROWS[w.kind]);}}catch(e){console.warn(e);}
    if(stop){rest.push(...list.slice(i));break;}if(!ok)rest.push(w);}
  PEND=rest.concat(PEND.filter(w=>!list.includes(w)));kvSet('trace:regPending',PEND);if(A.onRefused)try{A.onRefused();}catch(e){}}
/* 13/10 soir : refus pour droits — la liste, et « Abandonner » (l'écriture quitte la file d'attente, la ligne reprend la valeur du serveur) */
export const regRefused=()=>Object.values(REFUSED).filter(x=>PEND.some(w=>w.kind===x.kind&&w.id===x.id));
export async function regDrop(kind,id){PEND=PEND.filter(w=>!(w.kind===kind&&w.id===id));delete REFUSED[kind+'|'+id];kvSet('trace:regPending',PEND);if(ROWS[kind])delete ROWS[kind][id];try{await regReload(kind);}catch(e){}emit(kind);if(A.onRefused)try{A.onRefused();}catch(e){}}
// chargement : miroir de l'appareil puis serveur (si connecté) ; une écriture en attente garde la main sur sa ligne
const loading={};
export function regLoad(kinds){kinds=Array.isArray(kinds)?kinds:[kinds];return Promise.all(kinds.map(k=>loading[k]||(loading[k]=regLoad_(k).catch(e=>console.warn(e)).finally(()=>{delete loading[k];}))));}
/* 14/10 nuit (audit) : la file d'attente de l'appareil n'est relue qu'UNE fois (au démarrage) et FUSIONNÉE — avant, chaque chargement de registre la relisait
   quand elle était vide et l'écrasait par la copie de l'appareil après une attente : une écriture faite pendant cette attente (ex. signature d'un livret) était PERDUE,
   et une écriture déjà envoyée revenait (envoyée plusieurs fois) */
let PEND_RESTORED=null;
function restorePend(){if(!PEND_RESTORED)PEND_RESTORED=(async()=>{const p=await kvGet('trace:regPending');if(Array.isArray(p)&&p.length){const cur=PEND;PEND=p.filter(w=>w&&w.kind&&!cur.some(c=>c.kind===w.kind&&c.id===w.id)).concat(cur);}})().catch(e=>console.warn(e));return PEND_RESTORED;}
async function regLoad_(kind){await restorePend();
  const sig0=LOADED.has(kind)?sigOf(kind):null; /* 14/10 nuit (sync) : registre déjà chargé → on ne redessine que s'il a changé (avant : chaque ouverture d'écran redessinait tout, et pouvait boucler) */
  const c=await kvGet('trace:reg:'+kind);if(c&&typeof c==='object'){ROWS[kind]=Object.assign({},c,ROWS[kind]||{});}
  if(A.state.cloudUser&&A.sync.listRegistre){const rows=await A.sync.listRegistre([kind]);
    if(rows){rows.forEach(r=>{noteAt(r.updated_at);if(PEND.some(w=>w.kind===kind&&w.id===r.id))return;put(kind,r.id,r.data||{},r.updated_at);});kvSet('trace:reg:'+kind,ROWS[kind]||{});}
    await regFlush();}
  LOADED.add(kind);if(sig0===null||sigOf(kind)!==sig0)emit(kind,'server');}
export const regPending=()=>PEND.slice();
/* 12/10 soir : recharger un registre depuis le serveur (après une écriture faite côté serveur, ex. synchro Outlook) */
export async function regReload(kind){if(!A.state.cloudUser||!A.sync.listRegistre)return false;const rows=await A.sync.listRegistre([kind]);if(!rows)return false;rows.forEach(r=>{noteAt(r.updated_at);if(PEND.some(w=>w.kind===kind&&w.id===r.id))return;put(kind,r.id,r.data||{},r.updated_at);});kvSet('trace:reg:'+kind,ROWS[kind]||{});LOADED.add(kind);emit(kind,'server');return true;}
/* 14/10 nuit (sync) — Ethan : « le truc pas synchro pour tous les utilisateurs ». Rafraîchissement LÉGER, appelé par l'appli quand elle est visible (~50 s, retour au premier plan) :
   une seule requête pour les registres DÉJÀ chargés (sauf les gros : catalogue magasin, base de prix, bibliothèque du mémoire), seulement les lignes modifiées sur le serveur
   depuis la dernière lecture (marge 2 min) ; une écriture en attente ici garde la main ; émet (origine 'server') seulement les registres qui ont changé. Renvoie le nombre de registres changés. */
export const REG_HEAVY=['prix']; /* + la ligne « memlib » du registre doc (exclue de la requête) — 14/10 nuit : le catalogue magasin y revient (requête incrémentale : rien n'est relu tant qu'il ne change pas ; sinon un téléphone ouvert avant l'import ne le recevait pas) */
let refreshing=null;
export function regRefresh(kinds){if(refreshing)return refreshing;refreshing=regRefresh_(kinds).catch(e=>{console.warn(e);return 0;}).finally(()=>{refreshing=null;});return refreshing;}
async function regRefresh_(kinds){if(!A||!A.state.cloudUser||!A.sync||!A.sync.listRegistreSince)return 0;const ks=(kinds||[...LOADED]).filter(k=>LOADED.has(k)&&!REG_HEAVY.includes(k)&&!loading[k]);if(!ks.length)return 0;
  const since=SRV_MAX?new Date(SRV_MAX-120000).toISOString():null;const rows=await A.sync.listRegistreSince(ks,since,['memlib']);if(!rows)return 0;const ch=new Set();
  rows.forEach(r=>{if(!r||!r.kind||!ks.includes(r.kind))return;noteAt(r.updated_at);if(PEND.some(w=>w.kind===r.kind&&w.id===r.id))return;const cur=ROWS[r.kind]&&ROWS[r.kind][r.id];if(cur&&cur.updated_at===r.updated_at)return;if(cur&&JSON.stringify(cur.data)===JSON.stringify(r.data||{})){cur.updated_at=r.updated_at;return;}put(r.kind,r.id,r.data||{},r.updated_at);ch.add(r.kind);});
  ch.forEach(k=>{kvSet('trace:reg:'+k,ROWS[k]||{});emit(k,'server');});if(PEND.length)regFlush().catch(()=>{});return ch.size;}
/* bac à sable (10/10) : retirer de l'appareil les lignes de test (jamais envoyées : personnages de démo, chantiers demo_…) */
export function regPurge(kind,pred){const R=ROWS[kind]||{};let n=0;Object.keys(R).forEach(id=>{try{if(pred(id,R[id].data||{})){delete R[id];n++;}}catch(e){}});PEND=PEND.filter(w=>!(w.kind===kind&&!ROWS[kind][w.id]&&pred(w.id,w.patch||{})));kvSet('trace:reg:'+kind,ROWS[kind]||{});kvSet('trace:regPending',PEND);if(n)emit(kind);return n;}
