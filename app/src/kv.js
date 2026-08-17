// Petit stockage clé → valeur dans IndexedDB (partagé par l'appli et le traceur, même origine) : fond de plan DXF, chantiers remis par le traceur… — localStorage est trop petit (≈ 5 Mo).
const NAME='trace-kv',STORE='kv';let dbp=null;
function open(){if(dbp)return dbp;dbp=new Promise((res,rej)=>{try{const r=indexedDB.open(NAME,1);r.onupgradeneeded=()=>{r.result.createObjectStore(STORE);};r.onsuccess=()=>res(r.result);r.onerror=()=>rej(r.error);}catch(e){rej(e);}});return dbp;}
function tx(mode,fn){return open().then(db=>new Promise((res,rej)=>{const t=db.transaction(STORE,mode);const st=t.objectStore(STORE);const rq=fn(st);t.oncomplete=()=>res(rq&&rq.result);t.onerror=()=>rej(t.error);t.onabort=()=>rej(t.error);}));}
export const kv={
  async get(k){try{return await tx('readonly',st=>st.get(k));}catch(e){console.warn('kv.get',e);return undefined;}},
  async set(k,v){try{await tx('readwrite',st=>st.put(v,k));return true;}catch(e){console.warn('kv.set',e);return false;}},
  async del(k){try{await tx('readwrite',st=>st.delete(k));return true;}catch(e){console.warn('kv.del',e);return false;}},
  async keys(prefix){try{const all=await tx('readonly',st=>st.getAllKeys());return (all||[]).filter(k=>typeof k==='string'&&(!prefix||k.startsWith(prefix)));}catch(e){console.warn('kv.keys',e);return [];}},
  available(){return typeof indexedDB!=='undefined';}
};
