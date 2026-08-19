import {CRS,detectCRS,geoOfSite,planToLonLat,lonLatToPlan,lonLatToMercPx,tilesFor,distLL} from '../src/geo.js';
const near=(a,b,t)=>Math.abs(a-b)<=t;
let ok=0,ko=0;const chk=(name,c)=>{if(c)ok++;else{ko++;console.log('KO',name);}};
// Lambert 93 : Paris
const [px,py]=CRS['EPSG:2154'].fwd(2.3522,48.8566);chk('L93 fwd Paris',near(px,652469,1)&&near(py,6862035,1));
const [plon,plat]=CRS['EPSG:2154'].inv(652469.02,6862035.26);chk('L93 inv Paris',near(plon,2.3522,1e-5)&&near(plat,48.8566,1e-5));
// CC48 : Bain-de-Bretagne (plan réel : X≈1349492, Y≈7193186)
chk('detect Bain CC48',detectCRS(1349492,7193186)==='EPSG:3948');
chk('detect StLo CC49',detectCRS(1403000,8220500)==='EPSG:3949');
chk('detect Indre CC47',detectCRS(1512067,6232909)==='EPSG:3947');
chk('detect Paris L93',detectCRS(652469,6862035)==='EPSG:2154');
chk('detect local → null',detectCRS(120,80)===null);
const [bl,bla]=CRS['EPSG:3948'].inv(1349492,7193186);chk('Bain lon/lat',near(bl,-1.686,0.01)&&near(bla,47.843,0.01));
// aller-retour fwd/inv sur toutes les zones CC
for(let z=42;z<=50;z++){const c=CRS['EPSG:39'+z];const [X,Y]=c.fwd(1.5,z+0.3);const [lo,la]=c.inv(X,Y);chk('CC'+z+' roundtrip',near(lo,1.5,1e-7)&&near(la,z+0.3,1e-7));}
// site traceur avec bgOrigin CC48 → geo auto, plan ↔ lon/lat cohérent
const net={w:800,h:600,traceur:{bgOrigin:{x0:1349000,y1:7193500}}};const g=geoOfSite(net);chk('geoOfSite auto',g&&g.crs==='EPSG:3948'&&g.auto);
const ll=planToLonLat(g,[400,300]);const back=lonLatToPlan(g,ll[0],ll[1]);chk('plan↔lonlat roundtrip',near(back[0],400,1e-3)&&near(back[1],300,1e-3));
// y vers le bas : un point plus bas sur le plan (y+) est plus au sud
const llS=planToLonLat(g,[400,400]);chk('y bas = sud',llS[1]<ll[1]);
// tuiles : fenêtre 400×300 m à 2 px/m → z ≈ log2(156543·cos48·2)+.25 ≈ 17.7 → 18 ; matrice replace le centre
const T=tilesFor(g,[200,150,600,450],2,19);chk('tiles z',T&&T.z===18);chk('tiles count',T&&T.tiles.length>=4&&T.tiles.length<=40);
const [lonc,latc]=planToLonLat(g,[400,300]);const tp=lonLatToMercPx(lonc,latc,T.z);const m=T.matrix;const px2=m[0]*tp[0]+m[2]*tp[1]+m[4],py2=m[1]*tp[0]+m[3]*tp[1]+m[5];chk('matrix centre',near(px2,400,0.05)&&near(py2,300,0.05));
// et un coin : erreur de la similitude à 250 m du centre < 10 cm
const [lonk,latk]=planToLonLat(g,[200,150]);const tk=lonLatToMercPx(lonk,latk,T.z);const kx=m[0]*tk[0]+m[2]*tk[1]+m[4],ky=m[1]*tk[0]+m[3]*tk[1]+m[5];chk('matrix coin <10cm',near(kx,200,0.1)&&near(ky,150,0.1));
// distance haversine Paris–Rennes ≈ 309 km
chk('dist Paris-Rennes',near(distLL(2.3522,48.8566,-1.6778,48.1173)/1000,309,3));
// plafond de tuiles : grande fenêtre → descend d'un niveau
const T2=tilesFor(g,[-5000,-5000,5000,5000],2,19,60);chk('cap tuiles',T2&&T2.tiles.length<=60);
console.log(`geo: ${ok} ok, ${ko} ko`);process.exit(ko?1:0);
