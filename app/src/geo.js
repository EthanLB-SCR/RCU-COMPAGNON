/* geo.js — géoréférencement : projections françaises (Lambert 93, Lambert CC 42→50) sur GRS80,
   Web Mercator (tuiles IGN), détection automatique du système d'un plan, tuiles à afficher, distances.
   Aucune dépendance. Précision vérifiée : Paris L93 652469/6862035 (±0,3 m). RGF93 ≡ WGS84 au cm près → aucun changement de datum. */
const A=6378137,F=1/298.257222101,E2=2*F-F*F,E=Math.sqrt(E2),D2R=Math.PI/180,R2D=180/Math.PI,RM=6378137;
function lcc(code,name,phi0,phi1,phi2,lam0,FE,FN){const m=p=>Math.cos(p)/Math.sqrt(1-E2*Math.sin(p)**2);const t=p=>Math.tan(Math.PI/4-p/2)/Math.pow((1-E*Math.sin(p))/(1+E*Math.sin(p)),E/2);
  const p0=phi0*D2R,p1=phi1*D2R,p2=phi2*D2R;const n=(Math.log(m(p1))-Math.log(m(p2)))/(Math.log(t(p1))-Math.log(t(p2)));const Fc=m(p1)/(n*Math.pow(t(p1),n));const rho0=A*Fc*Math.pow(t(p0),n);
  return {code,name,
    fwd:(lon,lat)=>{const p=lat*D2R;const rho=A*Fc*Math.pow(t(p),n);const th=n*(lon*D2R-lam0*D2R);return [FE+rho*Math.sin(th),FN+rho0-rho*Math.cos(th)];},
    inv:(x,y)=>{const dx=x-FE,dy=rho0-(y-FN);const rho=(n<0?-1:1)*Math.hypot(dx,dy);const th=Math.atan2(dx,dy);const tt=Math.pow(rho/(A*Fc),1/n);const lon=th/n+lam0*D2R;let p=Math.PI/2-2*Math.atan(tt);for(let i=0;i<8;i++)p=Math.PI/2-2*Math.atan(tt*Math.pow((1-E*Math.sin(p))/(1+E*Math.sin(p)),E/2));return [lon*R2D,p*R2D];}};}
export const CRS={'EPSG:2154':lcc('EPSG:2154','Lambert 93',46.5,44,49,3,700000,6600000)};
for(let z=42;z<=50;z++)CRS['EPSG:39'+z]=lcc('EPSG:39'+z,'Lambert CC'+z+' (RGF93 / CC'+z+')',z,z-0.75,z+0.75,3,1700000,(z-41)*1e6+200000);
const inFrance=(lon,lat)=>lon>-5.6&&lon<9.9&&lat>41.2&&lat<51.3;
/* detectCRS(X,Y) : à partir d'un point du plan (coordonnées du DXF, mètres) → code EPSG ou null.
   Les plans de BE/géomètres français sont en Lambert 93 ou, le plus souvent, en Lambert CC de la zone (Bain = CC48, Saint-Lô = CC49, Indre = CC47). */
export function detectCRS(X,Y){const cands=[];
  if(X>=0&&X<=1.3e6&&Y>=6.0e6&&Y<=7.25e6)cands.push('EPSG:2154');
  if(X>=1.0e6&&X<=2.4e6){const n=Math.round((Y-200000)/1e6)+41;if(n>=42&&n<=50&&Math.abs(Y-((n-41)*1e6+200000))<170000)cands.push('EPSG:39'+n);}
  const ok=cands.filter(c=>{const [lon,lat]=CRS[c].inv(X,Y);return inFrance(lon,lat);});
  if(!ok.length)return null;return ok.find(c=>c!=='EPSG:2154')||ok[0];}
/* geoOfSite(net) : le géoréférencement d'un chantier → {crs, aff, auto, label} ou null.
   aff : affine plan (unités de la feuille, y vers le bas) → CRS : X = a·x + b·y + e ; Y = c·x + d·y + f.
   Sources, par priorité : net.geo (calage enregistré) ; l'origine DXF conservée à l'import (net.traceur.bgOrigin ou net.origin) + détection du système. */
export function geoOfSite(net){if(!net)return null;
  if(net.geo&&net.geo.crs&&CRS[net.geo.crs]&&net.geo.aff)return {crs:net.geo.crs,aff:net.geo.aff,auto:false,label:CRS[net.geo.crs].name+' (calage enregistré)'};
  const o=(net.traceur&&net.traceur.bgOrigin)||net.origin||null;if(!o||!isFinite(o.x0)||!isFinite(o.y1))return null;
  const w=net.w||0,h=net.h||0;const crs=detectCRS(o.x0+w/2,o.y1-h/2);if(!crs)return null;
  return {crs,aff:{a:1,b:0,e:o.x0,c:0,d:-1,f:o.y1},auto:true,label:CRS[crs].name+' (détecté sur le DXF)'};}
// Web Mercator en mètres (EPSG:3857) : repère de travail du mode « carte » (calage à la main) — jamais un repère de stockage
CRS['EPSG:3857']={code:'EPSG:3857',name:'Web Mercator',fwd:(lon,lat)=>{const la=Math.max(-85.05,Math.min(85.05,lat))*D2R;return [RM*lon*D2R,RM*Math.log(Math.tan(Math.PI/4+la/2))];},inv:(x,y)=>[x/RM*R2D,(2*Math.atan(Math.exp(y/RM))-Math.PI/2)*R2D]};
export const crsName=code=>CRS[code]?CRS[code].name:code;
/* similarityFromPairs(pairs, s0) : calage à la main. pairs = [{plan:[x,y], ll:[lon,lat]}] (1 ou 2 paires), s0 = mètres par unité de plan attendus
   (1 pour un plan vectoriel en mètres, 1/ppm pour une feuille image). 1 paire : translation seule (nord en haut, échelle s0) ;
   2 paires : similitude (échelle + rotation + translation, avec le retournement y bas → Y haut). Cible : Lambert 93.
   → {crs:'EPSG:2154', aff, s (m / unité), ratio (s/s0), rot (° du nord du plan par rapport au nord Lambert), d (m entre repères)} */
export function similarityFromPairs(pairs,s0){const L=CRS['EPSG:2154'];const Q=pairs.map(p=>L.fwd(p.ll[0],p.ll[1]));const P=pairs.map(p=>p.plan);
  let s=s0||1,th=0,d=0;
  if(pairs.length>=2){const dp=[P[1][0]-P[0][0],-(P[1][1]-P[0][1])],dq=[Q[1][0]-Q[0][0],Q[1][1]-Q[0][1]];const np=Math.hypot(dp[0],dp[1]),nq=Math.hypot(dq[0],dq[1]);if(np<1e-6||nq<1e-6)return null;s=nq/np;th=Math.atan2(dq[1],dq[0])-Math.atan2(dp[1],dp[0]);d=nq;}
  const a=s*Math.cos(th),b=s*Math.sin(th),c=s*Math.sin(th),dd=-s*Math.cos(th);const e=Q[0][0]-(a*P[0][0]+b*P[0][1]),f=Q[0][1]-(c*P[0][0]+dd*P[0][1]);
  let rot=th*R2D;rot=((rot+540)%360)-180;
  return {crs:'EPSG:2154',aff:{a,b,c,d:dd,e,f},s,ratio:s/(s0||1),rot,d};}
/* geocode(q) : adresse / commune → {lat,lon,label} (IGN Géoplateforme, puis BAN), ou coordonnées tapées « 47.84, -1.68 » ; null si rien */
export async function geocode(q){q=(q||'').trim();if(!q)return null;
  const m=q.match(/^(-?\d+(?:[.,]\d+)?)\s*[,; ]\s*(-?\d+(?:[.,]\d+)?)$/);if(m){const a=+m[1].replace(',','.'),b=+m[2].replace(',','.');if(Math.abs(a)<=90&&Math.abs(b)<=180)return {lat:a,lon:b,label:'coordonnées '+a+', '+b};}
  const tryUrl=async u=>{const ctl=new AbortController();const t=setTimeout(()=>ctl.abort(),6000);try{const r=await fetch(u,{signal:ctl.signal});if(!r.ok)return null;const j=await r.json();const f=j.features&&j.features[0];if(!f||!f.geometry)return null;return {lon:+f.geometry.coordinates[0],lat:+f.geometry.coordinates[1],label:(f.properties&&(f.properties.label||f.properties.name))||q};}catch(e){return null;}finally{clearTimeout(t);}};
  return (await tryUrl('https://data.geopf.fr/geocodage/search?q='+encodeURIComponent(q)+'&limit=1'))||(await tryUrl('https://api-adresse.data.gouv.fr/search/?q='+encodeURIComponent(q)+'&limit=1'));}
export function planToLonLat(geo,p){const {a,b,c,d,e,f}=geo.aff;const X=a*p[0]+b*p[1]+e,Y=c*p[0]+d*p[1]+f;return CRS[geo.crs].inv(X,Y);}
export function lonLatToPlan(geo,lon,lat){const [X,Y]=CRS[geo.crs].fwd(lon,lat);const {a,b,c,d,e,f}=geo.aff;const det=a*d-b*c;const x=X-e,y=Y-f;return [(d*x-b*y)/det,(-c*x+a*y)/det];}
/* Web Mercator (tuiles 256 px, grille standard) */
export function lonLatToMercPx(lon,lat,z){const s=256*Math.pow(2,z);const x=(lon+180)/360*s;const la=Math.max(-85.05,Math.min(85.05,lat))*D2R;const y=(1-Math.log(Math.tan(la)+1/Math.cos(la))/Math.PI)/2*s;return [x,y];}
export const mercRes=(lat,z)=>2*Math.PI*RM*Math.cos(lat*D2R)/(256*Math.pow(2,z)); // m / pixel de tuile
/* Fond IGN Géoplateforme (WMTS, grille PM = Web Mercator) — libre, sans clé, Licence Ouverte (mention « © IGN ») */
export const IGN_LAYERS={ortho:{layer:'ORTHOIMAGERY.ORTHOPHOTOS',fmt:'image/jpeg',zmax:19,label:'Photo aérienne (IGN)'},plan:{layer:'GEOGRAPHICALGRIDSYSTEMS.PLANIGNV2',fmt:'image/png',zmax:19,label:'Plan IGN'},cadastre:{layer:'CADASTRALPARCELS.PARCELLAIRE_EXPRESS',fmt:'image/png',zmax:19,label:'Cadastre (parcelles)'}};
export const ignTileURL=(kind,z,x,y)=>{const L=IGN_LAYERS[kind];return `https://data.geopf.fr/wmts?SERVICE=WMTS&REQUEST=GetTile&VERSION=1.0.0&LAYER=${L.layer}&STYLE=normal&FORMAT=${encodeURIComponent(L.fmt)}&TILEMATRIXSET=PM&TILEMATRIX=${z}&TILEROW=${y}&TILECOL=${x}`;};
/* tilesFor(geo, box, pxPerM, zmax) : box = fenêtre visible en coordonnées plan [x0,y0,x1,y1] (y vers le bas), pxPerM = pixels écran par mètre.
   → {z, tiles:[{x,y}], matrix:[a,b,c,d,e,f]} : matrice SVG qui place le repère « pixels de tuiles au zoom z » dans le repère plan (similitude
   ajustée au centre de la fenêtre : l'écart de projection est négligeable à l'échelle d'un écran, < 5 cm). null si pas de géoréf. */
export function tilesFor(geo,box,pxPerM,zmax,cap){if(!geo)return null;const cx=(box[0]+box[2])/2,cy=(box[1]+box[3])/2;const [lon0,lat0]=planToLonLat(geo,[cx,cy]);
  let z=Math.round(Math.log2(Math.max(1e-9,156543.03392*Math.cos(lat0*D2R)*Math.max(1e-6,pxPerM)))+0.25);z=Math.max(3,Math.min(zmax||19,z));
  const mpp=1; // unités plan = mètres (feuilles vectorielles) ; pour une feuille image, l'affine porte déjà l'échelle
  const P=(x,y)=>{const [lon,lat]=planToLonLat(geo,[x,y]);return lonLatToMercPx(lon,lat,z);};
  const D=50;const T0=P(cx,cy),Tx=P(cx+D,cy),Ty=P(cx,cy+D); // dérivées plan→tuile
  const M=[(Tx[0]-T0[0])/D,(Tx[1]-T0[1])/D,(Ty[0]-T0[0])/D,(Ty[1]-T0[1])/D]; // [a b c d] : tile = M·plan (colonnes : d/dx, d/dy)
  const det=M[0]*M[3]-M[1]*M[2];if(!det)return null;const inv=[M[3]/det,-M[1]/det,-M[2]/det,M[0]/det]; // plan = inv·tile
  const e=cx-(inv[0]*T0[0]+inv[2]*T0[1]),f=cy-(inv[1]*T0[0]+inv[3]*T0[1]);
  const corners=[[box[0],box[1]],[box[2],box[1]],[box[0],box[3]],[box[2],box[3]]].map(q=>P(q[0],q[1]));
  const n=Math.pow(2,z);let x0=Math.floor(Math.min(...corners.map(q=>q[0]))/256),x1=Math.floor(Math.max(...corners.map(q=>q[0]))/256),y0=Math.floor(Math.min(...corners.map(q=>q[1]))/256),y1=Math.floor(Math.max(...corners.map(q=>q[1]))/256);
  x0=Math.max(0,x0);y0=Math.max(0,y0);x1=Math.min(n-1,x1);y1=Math.min(n-1,y1);
  const tiles=[];const maxT=cap||90;if((x1-x0+1)*(y1-y0+1)>maxT){if(z>3)return tilesFor(geo,box,pxPerM/2,Math.min(z-1,zmax||19),cap);x1=Math.min(x1,x0+9);y1=Math.min(y1,y0+8);} // trop de tuiles → un niveau au-dessus (et plafond dur au niveau 3)
  for(let y=y0;y<=y1;y++)for(let x=x0;x<=x1;x++)tiles.push({x,y});
  return {z,tiles,matrix:[inv[0],inv[1],inv[2],inv[3],e,f],res:mercRes(lat0,z)};}
/* distance (m) entre deux points lon/lat (haversine) */
export function distLL(lon1,lat1,lon2,lat2){const dLa=(lat2-lat1)*D2R,dLo=(lon2-lon1)*D2R;const a=Math.sin(dLa/2)**2+Math.cos(lat1*D2R)*Math.cos(lat2*D2R)*Math.sin(dLo/2)**2;return 2*RM*Math.asin(Math.sqrt(a));}
export const fmtDist=m=>m<1000?Math.round(m)+' m':(m/1000).toFixed(m<10000?1:0).replace('.',',')+' km';
