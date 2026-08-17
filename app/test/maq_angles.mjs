import {offsetPoly,buildConduit} from '../maquette/traceur.js';


const pts=[[10,50],[60,50],[60,52],[110,52],[140,80]];
for(const off of [0.175,-0.175]){const q=offsetPoly(pts,off);console.log('off',off,q.map(p=>p.map(v=>+v.toFixed(3))));
  for(let i=1;i<q.length-1;i++){const h0=Math.atan2(q[i][1]-q[i-1][1],q[i][0]-q[i-1][0]),h1=Math.atan2(q[i+1][1]-q[i][1],q[i+1][0]-q[i][0]);let d=(h1-h0)*180/Math.PI;while(d>180)d-=360;while(d<-180)d+=360;console.log('  sommet',i,'angle',d.toFixed(2));}}
