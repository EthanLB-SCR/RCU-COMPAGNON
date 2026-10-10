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
let flushT=null;
export function initReg(api){A=api;}
export function onReg(cb){LISTENERS.add(cb);return ()=>LISTENERS.delete(cb);}
function emit(kind){LISTENERS.forEach(cb=>{try{cb(kind);}catch(e){console.warn(e);}});}
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
    const i=PEND.findIndex(w=>w.kind===kind&&w.id===id);if(i>=0){const w=PEND[i];PEND[i]={kind,id,patch:mode==='replace'?patch:merge(w.mode==='replace'?w.patch:w.patch,patch,'merge'),mode:w.mode==='replace'?'replace':mode};}else PEND.push({kind,id,patch,mode});
    kvSet('trace:regPending',PEND);clearTimeout(flushT);flushT=setTimeout(()=>regFlush().catch(e=>console.warn(e)),600);}
  emit(kind);return data;}
export function regDelete(kind,id,opts){return regSet(kind,id,{deleted:true,deletedAt:new Date().toISOString(),deletedBy:A.userName?A.userName():''},opts);}
export async function regFlush(){if(!PEND.length||!A.state.cloudUser||!A.sync.setRegistre)return;const list=PEND.slice();const rest=[];
  for(let i=0;i<list.length;i++){const w=list[i];let ok=false,stop=false;try{const r=await A.sync.setRegistre(w.kind,w.id,w.patch,w.mode);ok=!!r.ok;if(!ok&&r.missing){if(A.toast)A.toast('Serveur : passe le SQL sql/nuit_v1.sql (registre)');stop=true;}
      if(ok&&r.row&&r.row.data&&!list.some(x=>x!==w&&x.kind===w.kind&&x.id===w.id)){put(w.kind,w.id,r.row.data,r.row.updated_at);kvSet('trace:reg:'+w.kind,ROWS[w.kind]);}}catch(e){console.warn(e);}
    if(stop){rest.push(...list.slice(i));break;}if(!ok)rest.push(w);}
  PEND=rest.concat(PEND.filter(w=>!list.includes(w)));kvSet('trace:regPending',PEND);}
// chargement : miroir de l'appareil puis serveur (si connecté) ; une écriture en attente garde la main sur sa ligne
const loading={};
export function regLoad(kinds){kinds=Array.isArray(kinds)?kinds:[kinds];return Promise.all(kinds.map(k=>loading[k]||(loading[k]=regLoad_(k).catch(e=>console.warn(e)).finally(()=>{delete loading[k];}))));}
async function regLoad_(kind){if(!PEND.length){const p=await kvGet('trace:regPending');if(Array.isArray(p))PEND=p;}
  const c=await kvGet('trace:reg:'+kind);if(c&&typeof c==='object'){ROWS[kind]=Object.assign({},c,ROWS[kind]||{});}
  if(A.state.cloudUser&&A.sync.listRegistre){const rows=await A.sync.listRegistre([kind]);
    if(rows){rows.forEach(r=>{if(PEND.some(w=>w.kind===kind&&w.id===r.id))return;put(kind,r.id,r.data||{},r.updated_at);});kvSet('trace:reg:'+kind,ROWS[kind]||{});}
    await regFlush();}
  LOADED.add(kind);emit(kind);}
export const regPending=()=>PEND.slice();
