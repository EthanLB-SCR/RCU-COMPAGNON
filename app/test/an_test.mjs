import fs from 'node:fs';
import {parseDXFFile, analyze} from '../src/dxfimport.js';
const dxf=await parseDXFFile(await fs.openAsBlob(process.argv[2]));
const an=analyze(dxf);
console.log(process.argv[2],'| profil',an.profile,'| sig',JSON.stringify(an.sig),'| fournisseur',an.supplierGuess,'| DN',an.dnSet.join(','),'('+an.dnTexts.length+' étiquettes)','| xref tronqués',an.truncated.length);
console.log(' candidats axes:');an.axisCandidates.slice(0,14).forEach(c=>console.log('   ',c.checked?'[x]':'[ ]',c.role,c.n,c.layer,'(score',c.score+')'));
console.log(' rôles: valves',an.roles.valves,'| tees',an.roles.tees,'| bends',an.roles.bends.slice(0,4),'| reducers',an.roles.reducers);
const ex={};an.dnTexts.forEach(d=>{ex[d.t]=(ex[d.t]||0)+1;});console.log(' étiquettes DN (ex):',Object.entries(ex).slice(0,8));
