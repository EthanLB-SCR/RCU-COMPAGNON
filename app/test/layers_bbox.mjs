import fs from 'node:fs';
import {parseDXFFile, analyze} from '../src/dxfimport.js';
const dxf=await parseDXFFile(await fs.openAsBlob(process.argv[2]));
const an=analyze(dxf);
for(const c of an.axisCandidates.filter(c=>c.checked)){
  let x0=1e12,y0=1e12,x1=-1e12,y1=-1e12,n=0,len=0;
  dxf.ents.forEach(e=>{if(e.layer!==c.layer||!e.pts)return;n++;for(let i=0;i<e.pts.length;i++){const p=e.pts[i];x0=Math.min(x0,p[0]);y0=Math.min(y0,p[1]);x1=Math.max(x1,p[0]);y1=Math.max(y1,p[1]);if(i)len+=Math.hypot(p[0]-e.pts[i-1][0],p[1]-e.pts[i-1][1]);}});
  console.log(c.role,c.layer.padEnd(62),'polys',String(n).padStart(4),'| long',Math.round(len).toString().padStart(7),'m | bbox x',Math.round(x0),'..',Math.round(x1),' y',Math.round(y0),'..',Math.round(y1),'| étendue',Math.round(x1-x0),'×',Math.round(y1-y0));
}
