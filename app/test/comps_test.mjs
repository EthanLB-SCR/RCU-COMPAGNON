import fs from 'node:fs';
import {parseDXFFile} from '../src/dxfimport.js';
const dxf=await parseDXFFile(await fs.openAsBlob(process.argv[2]));
const lays=process.argv.slice(3);
for(const lay of lays){const P=dxf.ents.filter(e=>e.layer===lay&&e.pts&&e.pts.length>=2);
  const CELL=500;const cells={};P.forEach(e=>{const k=Math.round(e.pts[0][0]/CELL)+':'+Math.round(e.pts[0][1]/CELL);let L=0;for(let i=1;i<e.pts.length;i++)L+=Math.hypot(e.pts[i][0]-e.pts[i-1][0],e.pts[i][1]-e.pts[i-1][1]);cells[k]=(cells[k]||{n:0,L:0});cells[k].n++;cells[k].L+=L;});
  console.log(lay,':',P.length,'polys');Object.entries(cells).sort((a,b)=>b[1].L-a[1].L).slice(0,12).forEach(([k,v])=>console.log('   cell',k,'n',v.n,'L',Math.round(v.L)));}
