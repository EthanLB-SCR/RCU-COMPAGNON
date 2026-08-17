import fs from 'node:fs';
import {parseDXFFile, analyze, buildSite} from '../src/dxfimport.js';
const f=process.argv[2];const dxf=await parseDXFFile(await fs.openAsBlob(f));const an=analyze(dxf);
for(const ruler of [0,0.35]){const site=buildSite(dxf,an,an.roles,{id:'t',name:'t',supplier:'LOGSTOR',serie:2,fileName:f,defaultDn:50,ruler});
 const V=[];site.lines.forEach(l=>l.specials.filter(s=>s.type==='valve').forEach(s=>V.push(l.id+'@'+s.m.toFixed(0)+' '+s.block)));
 console.log('ruler',ruler,'→ vannes',V.length,'| lignes',site.lines.length,'| warnings',site.warnings.filter(w=>/vanne/i.test(w)));}
