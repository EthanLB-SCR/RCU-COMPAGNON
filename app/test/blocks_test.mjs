import fs from 'node:fs';
import {parseDXFFile} from '../src/dxfimport.js';
const blob=await fs.openAsBlob(process.argv[2]);
const dxf=await parseDXFFile(blob);
const sizes=Object.entries(dxf.blocks).map(([k,v])=>[k,v.length]).sort((a,b)=>b[1]-a[1]);
console.log('top blocs par taille:',sizes.slice(0,15));
const used=new Set();dxf.ents.forEach(e=>{if(e.type==='INSERT')used.add(e.name);});
// fermeture transitive (blocs imbriqués)
let grow=true;while(grow){grow=false;for(const n of [...used]){(dxf.blocks[n]||[]).forEach(e=>{if(e.type==='INSERT'&&!used.has(e.name)){used.add(e.name);grow=true;}});}}
const total=sizes.reduce((s,x)=>s+x[1],0), usedTotal=sizes.filter(x=>used.has(x[0])).reduce((s,x)=>s+x[1],0);
console.log(`blocs définis ${sizes.length} (${total} ent.) | utilisés ${used.size} (${usedTotal} ent.)`);
const big=sizes.filter(x=>x[1]>5000).map(x=>[x[0],x[1],used.has(x[0])?'utilisé':'inutilisé', dxf.ents.filter(e=>e.type==='INSERT'&&e.name===x[0]).map(e=>e.layer).slice(0,2)]);
console.log('gros blocs (>5000):',big);
