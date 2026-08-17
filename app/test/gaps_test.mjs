import fs from 'node:fs';
import {parseDXFFile} from '../src/dxfimport.js';
const dxf=await parseDXFFile(await fs.openAsBlob(process.argv[2]));
const lay=process.argv[3];
const P=dxf.ents.filter(e=>e.layer===lay&&e.pts&&e.pts.length>=2).map(e=>e.pts);
console.log('polylignes',P.length,'| points par polyligne (moy)',(P.reduce((s,p)=>s+p.length,0)/P.length).toFixed(1));
const ends=[];P.forEach((p,i)=>{ends.push({p:p[0],i,end:0});ends.push({p:p[p.length-1],i,end:1});});
const hist={};let far=[];
ends.forEach(a=>{let best=1e9,bj=-1;ends.forEach(b=>{if(b.i===a.i)return;const d=Math.hypot(a.p[0]-b.p[0],a.p[1]-b.p[1]);if(d<best){best=d;bj=b.i;}});
  // aussi : distance à l'intérieur d'une autre polyligne (projection)
  let bestProj=1e9;P.forEach((q,j)=>{if(j===a.i)return;for(let k=1;k<q.length;k++){const A=q[k-1],B=q[k];const vx=B[0]-A[0],vy=B[1]-A[1];const L2=vx*vx+vy*vy||1e-9;let t=((a.p[0]-A[0])*vx+(a.p[1]-A[1])*vy)/L2;t=Math.max(0,Math.min(1,t));const d=Math.hypot(a.p[0]-(A[0]+vx*t),a.p[1]-(A[1]+vy*t));if(d<bestProj)bestProj=d;}});
  const k=best<0.01?'<1cm':best<0.06?'<6cm':best<0.3?'<30cm':best<1?'<1m':best<3?'<3m':'>3m';hist[k]=(hist[k]||0)+1;
  if(best>=0.06&&bestProj<0.3)hist['(sur une autre ligne <30cm)']=(hist['(sur une autre ligne <30cm)']||0)+1;
  if(best>=0.3&&bestProj>=0.3)far.push([a.p.map(v=>Math.round(v)),best.toFixed(2),bestProj.toFixed(2)]);});
console.log('distance de chaque extrémité à l\'extrémité la plus proche d\'une autre polyligne :',hist);
console.log('extrémités isolées (>30 cm de tout) :',far.length,far.slice(0,8));
