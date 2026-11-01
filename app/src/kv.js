// Petit stockage clé → valeur dans IndexedDB (partagé par l'appli et le traceur, même origine) : fond de plan DXF, chantiers remis par le traceur… — localStorage est trop petit (≈ 5 Mo).
const NAME='trace-kv',STORE='kv';let dbp=null;
function open(){if(dbp)return dbp;dbp=new Promise((res,rej)=>{try{const r=indexedDB.open(NAME,1);r.onupgradeneeded=()=>{r.result.createObjectStore(STORE);};r.onsuccess=()=>res(r.result);r.onerror=()=>rej(r.error);}catch(e){rej(e);}});return dbp;}
function tx(mode,fn){return open().then(db=>new Promise((res,rej)=>{const t=db.transaction(STORE,mode);const st=t.objectStore(STORE);const rq=fn(st);t.oncomplete=()=>res(rq&&rq.result);t.onerror=()=>rej(t.error);t.onabort=()=>rej(t.error);}));}
/* 01/11 soir — REMISE À ZÉRO DES COMPTES (sql/remise_a_zero_*.sql + app_settings « cache_reset ») : l'appli pose « trace:purgeOnBoot » puis se recharge ;
   au démarrage suivant, AVANT toute lecture ou écriture de ce stockage, les copies locales des données remises à zéro sont effacées (pointages, fiches,
   signatures, notes de frais, demandes, agenda, grands déplacements, compteurs, émargements QHS, accidents, états des lieux véhicule).
   Jamais le planning, les chantiers, ni les envois en attente. Fait AU DÉMARRAGE et non pendant que l'appli tourne : sinon une copie encore en mémoire
   était réécrite avant le rechargement (constaté en test). */
const PURGE_RE=/^trace:(pointages|people|reg:(docsig|debours|magdem|agenda|gdx|cpth|qhsig|accident|vrec))$/;
let purgeP=null;
function purgeOnce(){if(purgeP)return purgeP;purgeP=(async()=>{let want=false;try{want=localStorage.getItem('trace:purgeOnBoot')==='1';}catch(e){}if(!want)return;
  try{const all=await tx('readonly',st=>st.getAllKeys());const victims=(all||[]).filter(k=>typeof k==='string'&&PURGE_RE.test(k));
    if(victims.length)await tx('readwrite',st=>{victims.forEach(k=>st.delete(k));return null;});
    console.info('[remise à zéro] caches vidés : '+(victims.join(', ')||'aucun'));}catch(e){console.warn('kv.purge',e);}
  try{localStorage.removeItem('trace:purgeOnBoot');}catch(e){}})();return purgeP;}
export const kv={
  async get(k){try{await purgeOnce();return await tx('readonly',st=>st.get(k));}catch(e){console.warn('kv.get',e);return undefined;}},
  async set(k,v){try{await purgeOnce();await tx('readwrite',st=>st.put(v,k));return true;}catch(e){console.warn('kv.set',e);return false;}},
  async del(k){try{await purgeOnce();await tx('readwrite',st=>st.delete(k));return true;}catch(e){console.warn('kv.del',e);return false;}},
  async keys(prefix){try{await purgeOnce();const all=await tx('readonly',st=>st.getAllKeys());return (all||[]).filter(k=>typeof k==='string'&&(!prefix||k.startsWith(prefix)));}catch(e){console.warn('kv.keys',e);return [];}},
  available(){return typeof indexedDB!=='undefined';}
};
