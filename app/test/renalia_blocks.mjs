import fs from 'node:fs';
import {parseDXFFile} from '../src/dxfimport.js';
const dxf=await parseDXFFile(await fs.openAsBlob(process.argv[2]));
const tron=dxf.ents.filter(e=>e.type==='INSERT'&&/_DN\d+|^SST\d+_DN/i.test(e.layer));
const names={};tron.forEach(e=>{names[e.name]=(names[e.name]||0)+1;});
console.log('INSERT sur calques tronçon (_DNxx):',tron.length,'| noms:',Object.entries(names).sort((a,b)=>b[1]-a[1]).slice(0,25));
const plen=pts=>pts.reduce((s,p,i)=>i?s+Math.hypot(p[0]-pts[i-1][0],p[1]-pts[i-1][1]):0,0);
for(const [n,c] of Object.entries(names).sort((a,b)=>b[1]-a[1]).slice(0,10)){const B=dxf.blocks[n]||[];const types={};let x0=1e9,y0=1e9,x1=-1e9,y1=-1e9,L=0;const txt=[];B.forEach(b=>{types[b.type+'@'+b.layer]=(types[b.type+'@'+b.layer]||0)+1;if(b.pts)b.pts.forEach(p=>{x0=Math.min(x0,p[0]);y0=Math.min(y0,p[1]);x1=Math.max(x1,p[0]);y1=Math.max(y1,p[1]);});if(b.pts&&b.pts.length>=2)L+=plen(b.pts);if(b.text)txt.push(b.text.slice(0,30));if(b.type==='INSERT')txt.push('→'+b.name);});
  console.log(`\n bloc ${n} ×${c} : ${B.length} ent. | emprise ${(x1-x0).toFixed(2)} × ${(y1-y0).toFixed(2)} m | traits ${L.toFixed(1)} m |`,types,txt.slice(0,6));
  // échelle / rotation d'insertion : les inserts sont-ils étirés (sx) ? (une barre coupée serait un bloc étiré)
  const ins=tron.filter(e=>e.name===n);const sxs=[...new Set(ins.map(e=>(e.sx||1).toFixed(2)))].slice(0,8);console.log('   sx des insertions:',sxs.join(', '),'| attribs ex:',ins[0].attribs?ins[0].attribs.slice(0,4):'-');}
