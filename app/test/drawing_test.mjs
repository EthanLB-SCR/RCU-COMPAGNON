import fs from 'node:fs';
import {parseDXFFile, analyze, buildSite, buildDrawing} from '../src/dxfimport.js';
const f=process.argv[2];const dxf=await parseDXFFile(await fs.openAsBlob(f));const an=analyze(dxf);
const site=buildSite(dxf,an,an.roles,{id:'t',name:'t',supplier:'RENALIA',serie:2,fileName:f,defaultDn:50});
console.log('site w×h',site.w,site.h,'bbox',site.bbox,'netLayers',site.netLayers,'T?',typeof site.T);
const t0=Date.now();const D=buildDrawing(dxf,site.T,site.bbox,site.netLayers,{cap:45000});
console.log('drawing:',D.drawing.length,'traits | points',D.drawing.reduce((s,d)=>s+d.pts.length,0),'| tronqué',D.truncated,'|',Date.now()-t0,'ms');
const byLayer={};D.drawing.forEach(d=>{const k=(d.net?'NET ':'ctx ')+d.layer.split('/')[0];byLayer[k]=(byLayer[k]||0)+1;});
console.log(Object.entries(byLayer).sort((a,b)=>b[1]-a[1]).slice(0,25));
