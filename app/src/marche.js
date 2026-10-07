// Tracé MARCHÉ figé vs RÉEL / projeté (Ethan 07/10) : « quand le chantier est importé et dessiné la première fois, figer en mode “c'est le tracé marché”,
// un calque qu'on affiche ou masque ; après deux-trois modifs on voit l'avant / après et on a le récap marché (soudures, linéaire, vannes, purges…) et le réel à jour ».
// Ce module compte les quantités d'un réseau dans les DEUX formats (lignes de l'appli : cond.A.els + joints ; lignes d'un chantier enregistré : cond.A.els + welds),
// fige une photographie (snapshot) et calcule l'écart. Partagé par l'appli (src/app.js) et le traceur (maquette/bridge.js).
export const M_KEYS=[['ml','Linéaire d\'axe','ml'],['soud','Soudures (aller + retour)',''],['coudes','Coudes',''],['vannes','Vannes',''],['purges','Purges',''],['vidanges','Vidanges',''],['tes','Tés',''],['reduc','Réductions',''],['bouchons','Fins de ligne',''],['lyres','Lyres',''],['baio','Baïonnettes',''],['manchons','Manchons posés (hors extrusions)',''],['extru','Manchons extrudés',''],['fc','Fausses coupes','']];
const Z=()=>Object.fromEntries(M_KEYS.map(([k])=>[k,0]));
export const axisOf=l=>l.pts&&l.pts.length?l.pts.map(p=>Array.isArray(p)?[+p[0],+p[1]]:[+p.x,+p.y]):(l.axis||[]).map(p=>[+p[0],+p[1]]);
export const polyLen=pts=>pts.reduce((s,p,i)=>i?s+Math.hypot(p[0]-pts[i-1][0],p[1]-pts[i-1][1]):0,0);
const turn=(a,b,c)=>{let d=(Math.atan2(c[1]-b[1],c[0]-b[0])-Math.atan2(b[1]-a[1],b[0]-a[0]))*180/Math.PI;while(d>180)d-=360;while(d<-180)d+=360;return d;};
// lyres et baïonnettes lues sur l'axe : lyre = 4 virages ≈ 90° en s, −s, −s, s rapprochés (bras < 25 m) ; baïonnette = 2 virages égaux et opposés rapprochés
export function countShapes(pts){const out={lyres:0,baio:0};if(!pts||pts.length<4)return out;const T=[];for(let i=1;i<pts.length-1;i++){const d=turn(pts[i-1],pts[i],pts[i+1]);if(Math.abs(d)>=20)T.push({i,d,m:Math.hypot(pts[i][0]-pts[i-1][0],pts[i][1]-pts[i-1][1])});}
  const near=(a,b)=>Math.hypot(pts[b.i][0]-pts[a.i][0],pts[b.i][1]-pts[a.i][1])<25;const used=new Set();
  for(let k=0;k+3<T.length;k++){const [a,b,c,d]=T.slice(k,k+4);if([a,b,c,d].some(x=>used.has(x.i)))continue;const s=Math.sign(a.d);if(Math.abs(a.d)>70&&Math.sign(b.d)===-s&&Math.abs(b.d)>70&&Math.sign(c.d)===-s&&Math.abs(c.d)>70&&Math.sign(d.d)===s&&Math.abs(d.d)>70&&near(a,b)&&near(b,c)&&near(c,d)){out.lyres++;[a,b,c,d].forEach(x=>used.add(x.i));k+=3;}}
  for(let k=0;k+1<T.length;k++){const [a,b]=T.slice(k,k+2);if(used.has(a.i)||used.has(b.i))continue;if(Math.sign(a.d)===-Math.sign(b.d)&&Math.abs(Math.abs(a.d)-Math.abs(b.d))<12&&near(a,b)){out.baio++;used.add(a.i);used.add(b.i);k++;}}
  return out;}
// quantités d'une ligne ; base=true → tracé seul (sans les soudures ajoutées sur place ni les extrusions : ce qu'on fige comme marché)
export function lineCounts(l,base){const c=Z();const pts=axisOf(l);c.ml=+polyLen(pts).toFixed(1);const sh=countShapes(pts);c.lyres=sh.lyres;c.baio=sh.baio;
  ['A','R'].forEach(k=>{const cd=l.cond&&l.cond[k];if(!cd)return;
    (cd.els||[]).forEach(e=>{if(e.link||e.kind==='teeout'||e.kind==='endpoint')return;if(e.kind==='bend'||e.kind==='steelbend')c.coudes++;else if(e.kind==='valve')c.vannes++;else if(e.kind==='tee'){if(e.vert==='up')c.purges++;else if(e.vert==='down')c.vidanges++;else c.tes++;}else if(e.kind==='reducer')c.reduc++;else if(e.kind==='endcap'||e.kind==='bypass')c.bouchons++;});
    (cd.joints||cd.welds||[]).forEach(j=>{if(base&&j.extra)return;c.soud++;if(j.fc)c.fc++;if(!base&&j.extru)c.extru++;});});
  c.manchons=c.soud-c.extru;return c;}
// pièces repérables d'une ligne : {k: valve | tee | purge | vidange | reducer | bend | endcap, c: A | R, m: PK milieu} — ce qui permet de LOCALISER un ajout (vanne en plus à PK 100…)
export function linePieces(l){const out=[];['A','R'].forEach(c=>{const cd=l.cond&&l.cond[c];if(!cd)return;(cd.els||[]).forEach(e=>{if(e.link||e.kind==='teeout'||e.kind==='endpoint'||e.kind==='pipe')return;let k=e.kind==='steelbend'?'bend':e.kind==='bypass'?'endcap':e.kind;if(k==='tee'&&e.vert)k=e.vert==='up'?'purge':'vidange';if(!['valve','tee','purge','vidange','reducer','bend','endcap'].includes(k))return;out.push({k,c,m:+(((+e.m0||0)+(+e.m1||0))/2).toFixed(1),id:e.id});});});return out;}
// pièces ajoutées / enlevées entre deux listes (même nature, même conduite, PK à ± tol) — appariement au plus proche
export function diffPieces(marPcs,reelPcs,tol){tol=tol||1.5;const used=new Set();const added=[];(reelPcs||[]).forEach(p=>{let best=-1,bd=1e9;(marPcs||[]).forEach((q,i)=>{if(used.has(i)||q.k!==p.k||q.c!==p.c)return;const d=Math.abs(q.m-p.m);if(d<bd){bd=d;best=i;}});if(best>=0&&bd<=tol)used.add(best);else added.push(p);});const removed=(marPcs||[]).filter((q,i)=>!used.has(i));return {added,removed};}
export function sumCounts(list){const t=Z();list.forEach(c=>{if(c)M_KEYS.forEach(([k])=>t[k]+=c[k]||0);});t.ml=+t.ml.toFixed(1);return t;}
// photographie du réseau : par ligne (axe, quantités) + totaux — c'est le « tracé marché »
export function marcheSnapshot(lines,meta){const L=(lines||[]).filter(l=>l&&l.cond&&(l.cond.A||l.cond.R)).map(l=>({id:l.id,name:l.name||l.id,dn:+l.dn||0,axis:axisOf(l).map(p=>[+p[0].toFixed(2),+p[1].toFixed(2)]),c:lineCounts(l,true),pcs:linePieces(l).map(p=>({k:p.k,c:p.c,m:p.m}))}));
  return {v:1,at:new Date().toISOString(),...(meta||{}),lines:L,tot:sumCounts(L.map(x=>x.c))};}
// écart : par ligne (marché | réel | delta), lignes nouvelles / disparues, totaux
export function diffMarche(M,lines){const reel=(lines||[]).filter(l=>l&&l.cond&&(l.cond.A||l.cond.R));const byId={};(M&&M.lines||[]).forEach(x=>byId[x.id]=x);const seen=new Set();const rows=[];
  reel.forEach(l=>{const m=byId[l.id]||null;seen.add(l.id);const r=lineCounts(l,false);const d=Z();M_KEYS.forEach(([k])=>d[k]=+((r[k]||0)-(m?m.c[k]||0:0)).toFixed(1));const pc=m&&m.pcs?diffPieces(m.pcs,linePieces(l)):{added:m?[]:linePieces(l),removed:[],unknown:!!m};rows.push({id:l.id,name:l.name||l.id,dn:+l.dn||0,mar:m?m.c:null,reel:r,d,isNew:!m,geo:m?geoDiff(m.axis,axisOf(l)):[],added:pc.added,removed:pc.removed,pcsUnknown:!!(m&&!m.pcs)});});
  (M&&M.lines||[]).forEach(x=>{if(seen.has(x.id))return;const d=Z();M_KEYS.forEach(([k])=>d[k]=-(x.c[k]||0));rows.push({id:x.id,name:x.name,dn:x.dn,mar:x.c,reel:null,d,gone:true,geo:[],added:[],removed:x.pcs||[]});});
  const tM=M?M.tot:Z();const tR=sumCounts(rows.map(r=>r.reel));const tD=Z();M_KEYS.forEach(([k])=>tD[k]=+((tR[k]||0)-(tM[k]||0)).toFixed(1));
  return {rows,tot:{mar:tM,reel:tR,d:tD},changed:rows.filter(r=>M_KEYS.some(([k])=>Math.abs(r.d[k])>(k==='ml'?0.5:0))||r.geo.length||(r.added&&r.added.length)||(r.removed&&r.removed.length))};}
export const PIECE_LABEL={valve:'vanne',tee:'té',purge:'purge',vidange:'vidange',reducer:'réduction',bend:'coude',endcap:'fin de ligne'};
// écart géométrique : tronçons de l'axe réel dont un bout est à plus de tol m de l'axe marché → [[a,b],…] (surlignés sur le plan)
export function geoDiff(marAxis,axis,tol){tol=tol||0.6;if(!marAxis||marAxis.length<2||!axis||axis.length<2)return [];const dist=q=>{let best=1e9;for(let i=1;i<marAxis.length;i++){const a=marAxis[i-1],b=marAxis[i];const dx=b[0]-a[0],dy=b[1]-a[1];const L2=dx*dx+dy*dy||1;let t=((q[0]-a[0])*dx+(q[1]-a[1])*dy)/L2;t=Math.max(0,Math.min(1,t));best=Math.min(best,Math.hypot(q[0]-a[0]-dx*t,q[1]-a[1]-dy*t));}return best;};
  const out=[];for(let i=1;i<axis.length;i++){const a=axis[i-1],b=axis[i];const mid=[(a[0]+b[0])/2,(a[1]+b[1])/2];if(dist(a)>tol||dist(b)>tol||dist(mid)>tol)out.push([a,b]);}return out;}
export const hasDelta=d=>M_KEYS.some(([k])=>k!=='manchons'&&Math.abs(d[k]||0)>(k==='ml'?0.5:0));
