import fs from 'node:fs';
import {parseDXFFile} from '../src/dxfimport.js';
const dxf=await parseDXFFile(await fs.openAsBlob(process.argv[2]));
const ins=dxf.ents.filter(e=>e.type==='INSERT'&&/Présentation/i.test(e.layer));
const names={};ins.forEach(e=>{names[e.name]=(names[e.name]||0)+1;});
console.log('INSERT Présentation:',ins.length,'| noms distincts',Object.keys(names).length, Object.entries(names).slice(0,5));
const sample=Object.keys(names).slice(0,4);
for(const n of sample){const B=dxf.blocks[n]||[];const lays={};B.forEach(b=>{const k=b.type+'@'+b.layer;lays[k]=(lays[k]||0)+1;});console.log(' bloc',n,':',B.length,'ent.',lays);
  const sub=B.filter(b=>b.type==='INSERT');if(sub.length){const s2=dxf.blocks[sub[0].name]||[];const l2={};s2.forEach(b=>{const k=b.type+'@'+b.layer;l2[k]=(l2[k]||0)+1;});console.log('   sous-bloc',sub[0].name,':',s2.length,'ent.',l2);}}
