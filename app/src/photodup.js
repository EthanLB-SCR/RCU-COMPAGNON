/* 04/11 (Ethan : « ajoute une alerte qui montre si deux photos identiques ont été mises = gars qui importe une photo plusieurs fois pour des soudures différentes,
   ou fils etc. ») — EMPREINTE DES PHOTOS : à la prise (ou l'import), chaque photo de soudure reçoit une empreinte (dHash 64 bits : image réduite à 9 × 8 en gris,
   différences de gauche à droite). La même photo importée deux fois donne la même empreinte, même recompressée ou redimensionnée ; deux vraies photos différentes,
   non. L'empreinte est rangée à côté des photos (étape : steps[n].ph, déclaration : events[i].ph, même ordre que photos) et part au serveur avec la soudure.
   Une photo « en double » = même empreinte sur deux soudures différentes, ou sur deux étapes différentes de la même soudure (soudure / fils / manchon).
   Les copies faites par l'appli elle-même (photos de l'étape 3 recopiées dans la déclaration « manchonnée ») ne comptent pas. Photos d'avant le 04/11 : sans empreinte. */
export function dhashOf(gray,w=9,h=8){if(!gray||gray.length<w*h)return null;let m=0;for(let i=0;i<w*h;i++)m+=gray[i];m/=w*h;let v=0;for(let i=0;i<w*h;i++)v+=(gray[i]-m)*(gray[i]-m);
  if(Math.sqrt(v/(w*h))<3)return null; /* image quasi uniforme (noire, floue…) : pas d'empreinte, sinon toutes les photos ratées se ressembleraient */
  let bits='';for(let y=0;y<h;y++)for(let x=0;x<w-1;x++)bits+=gray[y*w+x]>gray[y*w+x+1]?'1':'0';let hex='';for(let i=0;i<64;i+=4)hex+=parseInt(bits.slice(i,i+4),2).toString(16);return hex;}
export function photoHash(src){return new Promise(res=>{try{if(!src||typeof document==='undefined')return res(null);const im=new Image();if(/^https?:/.test(src))im.crossOrigin='anonymous';
  im.onload=()=>{try{const c=document.createElement('canvas');c.width=9;c.height=8;const g=c.getContext('2d');g.drawImage(im,0,0,9,8);const d=g.getImageData(0,0,9,8).data;const gray=[];for(let i=0;i<d.length;i+=4)gray.push(0.299*d[i]+0.587*d[i+1]+0.114*d[i+2]);res(dhashOf(gray));}catch(e){res(null);}};
  im.onerror=()=>res(null);im.src=src;setTimeout(()=>res(null),8000);}catch(e){res(null);}});}
// toutes les photos à empreinte d'une liste de soudures (joints de l'appli) → [{h, weldId, where, url, by, at}]
export function photoEntries(joints){const out=[];(joints||[]).forEach(j=>{if(!j||!j.weldId)return;const stepH=new Set();const st=j.steps||{};
  Object.keys(st).forEach(n=>{const s=st[n];if(!s||!Array.isArray(s.photos))return;(s.photos||[]).forEach((p,i)=>{const h=(s.ph||[])[i];if(!h)return;stepH.add(h);out.push({h,weldId:j.weldId,where:'étape '+n,url:p,by:s.by||'',at:s.at||''});});});
  (j.events||[]).forEach(e=>{if(!e||!Array.isArray(e.photos))return;e.photos.forEach((p,i)=>{const h=(e.ph||[])[i];if(!h||stepH.has(h))return;out.push({h,weldId:j.weldId,where:e.type||'déclaration',url:p,by:e.byName||e.by||'',at:e.at instanceof Date?e.at.toISOString():String(e.at||'')});});});});
  return out;}
const keyOf=x=>x.weldId+'|'+x.where;
// groupes de photos identiques (au moins deux soudures, ou deux étapes d'une même soudure)
export function photoDupes(entries){const by=new Map();(entries||[]).forEach(x=>{if(!by.has(x.h))by.set(x.h,[]);by.get(x.h).push(x);});const out=[];
  by.forEach((L,h)=>{const seen=new Map();L.forEach(x=>{if(!seen.has(keyOf(x)))seen.set(keyOf(x),x);});if(seen.size>=2)out.push({h,items:[...seen.values()]});});return out;}
// pour une photo (empreinte h) d'une soudure / étape : les AUTRES endroits où elle est déjà
export function dupesOf(h,entries,weldId,where){if(!h)return [];return (entries||[]).filter(x=>x.h===h&&!(x.weldId===weldId&&x.where===where));}
