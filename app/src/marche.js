// Tracé MARCHÉ figé vs RÉEL / projeté (Ethan 07/10) : « quand le chantier est importé et dessiné la première fois, figer en mode “c'est le tracé marché”,
// un calque qu'on affiche ou masque ; après deux-trois modifs on voit l'avant / après et on a le récap marché (soudures, linéaire, vannes, purges…) et le réel à jour ».
// Ce module compte les quantités d'un réseau dans les DEUX formats (lignes de l'appli : cond.A.els + joints ; lignes d'un chantier enregistré : cond.A.els + welds),
// fige une photographie (snapshot) et calcule l'écart. Partagé par l'appli (src/app.js) et le traceur (maquette/bridge.js).
export const M_KEYS=[['ml','Linéaire d\'axe','ml'],['soud','Soudures (aller + retour)',''],['coudes','Coudes',''],['vannes','Vannes',''],['purges','Purges',''],['vidanges','Vidanges',''],['tes','Tés',''],['reduc','Réductions',''],['bouchons','Fins de ligne',''],['lyres','Lyres',''],['baio','Baïonnettes',''],['manchons','Manchons posés (hors extrusions)',''],['extru','Manchons extrudés',''],['fc','Fausses coupes','']];
const Z=()=>Object.fromEntries(M_KEYS.map(([k])=>[k,0]));
export const PIECE_KEY={valve:'vannes',tee:'tes',purge:'purges',vidange:'vidanges',reducer:'reduc',bend:'coudes',endcap:'bouchons'}; // nature de pièce → quantité
export const axisOf=l=>l.pts&&l.pts.length?l.pts.map(p=>Array.isArray(p)?[+p[0],+p[1]]:[+p.x,+p.y]):(l.axis||[]).map(p=>[+p[0],+p[1]]);
export const polyLen=pts=>pts.reduce((s,p,i)=>i?s+Math.hypot(p[0]-pts[i-1][0],p[1]-pts[i-1][1]):0,0);
const turn=(a,b,c)=>{let d=(Math.atan2(c[1]-b[1],c[0]-b[0])-Math.atan2(b[1]-a[1],b[0]-a[0]))*180/Math.PI;while(d>180)d-=360;while(d<-180)d+=360;return d;};
// lyres et baïonnettes lues sur l'axe : lyre = 4 virages ≈ 90° en s, −s, −s, s rapprochés (bras < 25 m) ; baïonnette = 2 virages égaux et opposés rapprochés
// 23/10 : UN SEUL détecteur (detectShapes → indices des sommets de chaque forme) ; countShapes (comptage) et shapesAt (PK, 22/10) en dérivent — mêmes sorties qu'avant ;
// shapesIdx sert au traceur (« 🗑 Supprimer la lyre », ◀ ▶ décaler, ⇅ inverser).
function detectShapes(pts){const out={lyres:[],baio:[]};if(!pts||pts.length<4)return out;const T=[];for(let i=1;i<pts.length-1;i++){const d=turn(pts[i-1],pts[i],pts[i+1]);if(Math.abs(d)>=20)T.push({i,d});}
  const near=(a,b)=>Math.hypot(pts[b.i][0]-pts[a.i][0],pts[b.i][1]-pts[a.i][1])<25;const used=new Set();
  for(let k=0;k+3<T.length;k++){const [a,b,c,d]=T.slice(k,k+4);if([a,b,c,d].some(x=>used.has(x.i)))continue;const s=Math.sign(a.d);if(Math.abs(a.d)>70&&Math.sign(b.d)===-s&&Math.abs(b.d)>70&&Math.sign(c.d)===-s&&Math.abs(c.d)>70&&Math.sign(d.d)===s&&Math.abs(d.d)>70&&near(a,b)&&near(b,c)&&near(c,d)){out.lyres.push({v:[a.i,b.i,c.i,d.i],side:s});[a,b,c,d].forEach(x=>used.add(x.i));k+=3;}}
  for(let k=0;k+1<T.length;k++){const [a,b]=T.slice(k,k+2);if(used.has(a.i)||used.has(b.i))continue;if(Math.sign(a.d)===-Math.sign(b.d)&&Math.abs(Math.abs(a.d)-Math.abs(b.d))<12&&near(a,b)){out.baio.push({v:[a.i,b.i],side:Math.sign(a.d)});used.add(a.i);used.add(b.i);k++;}}
  return out;}
export function countShapes(pts){const d=detectShapes(pts);return {lyres:d.lyres.length,baio:d.baio.length};}
export function shapesIdx(pts){return detectShapes(pts);}
export function shapesAt(pts){const d=detectShapes(pts);const cum=[0];for(let i=1;i<(pts||[]).length;i++)cum.push(cum[i-1]+Math.hypot(pts[i][0]-pts[i-1][0],pts[i][1]-pts[i-1][1]));const pk=v=>+((cum[v[0]]+cum[v[v.length-1]])/2).toFixed(1);
  return {lyres:d.lyres.map(x=>pk(x.v)),baio:d.baio.map(x=>pk(x.v))};}
// quantités d'une ligne ; base=true → tracé seul (sans les soudures ajoutées sur place ni les extrusions : ce qu'on fige comme marché)
export function lineCounts(l,base){const c=Z();const pts=axisOf(l);c.ml=+polyLen(pts).toFixed(1);const sh=countShapes(pts);c.lyres=sh.lyres;c.baio=sh.baio;let nu=0;
  ['A','R'].forEach(k=>{const cd=l.cond&&l.cond[k];if(!cd)return;
    (cd.els||[]).forEach(e=>{if(e.link||e.kind==='teeout'||e.kind==='endpoint')return;if(e.kind==='bend'||e.kind==='steelbend')c.coudes++;else if(e.kind==='valve')c.vannes++;else if(e.kind==='tee'){if(e.vert==='up')c.purges++;else if(e.vert==='down')c.vidanges++;else c.tes++;}else if(e.kind==='reducer')c.reduc++;else if(e.kind==='endcap'||e.kind==='bypass')c.bouchons++;});
    (cd.joints||cd.welds||[]).forEach(j=>{if(base&&j.extra)return;c.soud++;if(j.fc)c.fc++;if(!base&&j.extru)c.extru++;if(j.nu)nu++;});});
  c.manchons=c.soud-c.extru-nu;return c;} /* 27/10 soir : soudures nues (remontée SST : coude nu, vanne nue) = pas de manchon */
// pièces repérables d'une ligne : {k: valve | tee | purge | vidange | reducer | bend | endcap, c: A | R, m: PK milieu} — ce qui permet de LOCALISER un ajout (vanne en plus à PK 100…)
export function linePieces(l){const out=[];['A','R'].forEach(c=>{const cd=l.cond&&l.cond[c];if(!cd)return;(cd.els||[]).forEach(e=>{if(e.link||e.kind==='teeout'||e.kind==='endpoint'||e.kind==='pipe')return;let k=e.kind==='steelbend'?'bend':e.kind==='bypass'?'endcap':e.kind;if(k==='tee'&&e.vert)k=e.vert==='up'?'purge':'vidange';if(!['valve','tee','purge','vidange','reducer','bend','endcap'].includes(k))return;out.push({k,c,m:+(((+e.m0||0)+(+e.m1||0))/2).toFixed(1),id:e.id});});});return out;}
// pièces ajoutées / enlevées entre deux listes — 27/10 (Ethan : « j'ai retapé un gros plan et la liste des modifs est très dure à interpréter ») : avant, appariement par PK
// absolu à ± 1,5 m → dès qu'un bout est retracé, tout l'aval se décale et plus rien ne se reconnaît (« +48 coudes » sur une ligne qui en a 14 de moins). Maintenant :
// appariement par SÉQUENCE (l'ordre des pièces le long de la conduite, même nature), avec un DÉCALAGE (dérive = PK réel − PK marché) qui peut changer en route —
// un retracé plus long de 20 m décale tout l'aval de 20 m, ce n'est pas 40 pièces changées. Chaque changement de dérive (> tol) coûte de 1 à 4 points selon sa taille :
// une lyre retirée ici et remise 150 m plus loin n'est PAS « déplacée » (dérive +150 puis −150 : deux gros sauts pour 4 pièces → retiré + ajouté, comme Ethan le veut),
// un vrai retracé l'est (un saut, puis toutes les pièces de l'aval suivent) ; une pièce seule déplacée de 25 m = retirée + ajoutée (une réduction : absorbée par le changement de DN). Retour : added (réel), removed (marché, avec mr = PK estimé sur le réel), pairs (ancres {c,m,r,d}).
export function alignPieces(marPcs,reelPcs,opt){opt=opt||{};const TOL=opt.tol||3,DMAX=opt.dmax||300,NEAR=opt.near||1.5;const COST=dd=>dd<=TOL?0:0.9+Math.min(3,dd/25); /* un saut de dérive coûte 0,9 (petit : lyre retirée, −8 m) à 3,9 (gros retracé) : il faut assez de pièces qui suivent pour qu'il vaille ; base < 1 pour qu'une pièce de plus l'emporte à égalité */const added=[],removed=[],pairs=[];
  /* 27/10 soir (PLOEMEUR, Ethan : « la pastille m me met +6 coudes, je n'ai pas touché cette partie ») : deux pièces de même nature AU MÊME ENDROIT du plan (≤ 1,5 m) sont la même pièce,
     même si leur PK diffère de 20 m parce que la ligne a été raccourcie en amont — elles valent 2,5 au lieu de 1 dans la chaîne, de quoi payer le saut de dérive. posM / posR : PK → [x,y] */
  const near=(q,p)=>{if(!opt.posM||!opt.posR)return false;const a=opt.posM(q.m),b=opt.posR(p.m);return !!(a&&b&&Math.hypot(a[0]-b[0],a[1]-b[1])<=NEAR);};const gain=x=>x.near?2.5:1;
  ['A','R'].forEach(c=>{const M=(marPcs||[]).filter(p=>(p.c||'A')===c).slice().sort((a,b)=>a.m-b.m);const R=(reelPcs||[]).filter(p=>(p.c||'A')===c).slice().sort((a,b)=>a.m-b.m);
    /* les fins de ligne (bouchon, sous-station…) sont la MÊME pièce même si la ligne s'est allongée : appariées d'office (première avec première, dernière avec dernière), hors DP */
    const fixed=[];const endsM=M.map((q,i)=>q.k==='endcap'?i:-1).filter(i=>i>=0),endsR=R.map((p,j)=>p.k==='endcap'?j:-1).filter(j=>j>=0);
    if(endsM.length&&endsR.length){const lastM=endsM[endsM.length-1],lastR=endsR[endsR.length-1];if(lastM>=M.length/2&&lastR>=R.length/2)fixed.push([lastM,lastR]);if(endsM[0]!==lastM&&endsR[0]!==lastR&&endsM[0]<M.length/2&&endsR[0]<R.length/2)fixed.push([endsM[0],endsR[0]]);}
    const fM=new Set(fixed.map(f=>f[0])),fR=new Set(fixed.map(f=>f[1]));
    const P=[];M.forEach((q,i)=>R.forEach((p,j)=>{if(fM.has(i)||fR.has(j))return;if(q.k===p.k&&Math.abs(p.m-q.m)<=DMAX)P.push({i,j,d:p.m-q.m,near:near(q,p)});}));P.sort((a,b)=>a.i-b.i||a.j-b.j);
    const best=new Array(P.length).fill(0),prev=new Array(P.length).fill(-1);let bi=-1,bs=0;
    for(let k=0;k<P.length;k++){const g=gain(P[k]);let b=g-COST(Math.abs(P[k].d));for(let l=0;l<k;l++){if(P[l].i<P[k].i&&P[l].j<P[k].j){const sc=best[l]+g-COST(Math.abs(P[k].d-P[l].d));if(sc>b){b=sc;prev[k]=l;}}}best[k]=b;if(b>bs){bs=b;bi=k;}}
    const mi=new Set(),ri=new Set();for(let k=bi;k>=0;k=prev[k]){mi.add(P[k].i);ri.add(P[k].j);pairs.push({c,m:M[P[k].i].m,r:R[P[k].j].m,d:P[k].d,k:M[P[k].i].k,near:P[k].near||undefined});}
    fixed.forEach(([i,j])=>{mi.add(i);ri.add(j);pairs.push({c,m:M[i].m,r:R[j].m,d:R[j].m-M[i].m,k:'endcap',end:true});});
    const anc=pairs.filter(x=>x.c===c).sort((a,b)=>a.m-b.m);const driftAt=m=>{let d=0;for(const a of anc){if(a.m<=m)d=a.d;else break;}return d;};
    M.forEach((q,i)=>{if(!mi.has(i))removed.push(Object.assign({},q,{mr:+(q.m+driftAt(q.m)).toFixed(1)}));});R.forEach((p,j)=>{if(!ri.has(j))added.push(p);});});
  pairs.sort((a,b)=>a.c.localeCompare(b.c)||a.m-b.m);return {added,removed,pairs};}
export function diffPieces(marPcs,reelPcs,tol,opt){return alignPieces(marPcs,reelPcs,Object.assign({},opt||{},tol?{tol:Math.max(3,tol)}:{}));}
/* point du plan au PK m d'un axe [[x,y]…] (27/10 soir : appariement par la position) */
export function atOnAxis(axis,m){if(!axis||axis.length<2)return null;let acc=0;for(let i=1;i<axis.length;i++){const a=axis[i-1],b=axis[i];const s=Math.hypot(b[0]-a[0],b[1]-a[1]);if(acc+s>=m||i===axis.length-1){const t=s?Math.max(0,Math.min(1,(m-acc)/s)):0;return [a[0]+(b[0]-a[0])*t,a[1]+(b[1]-a[1])*t];}acc+=s;}return axis[axis.length-1];}
// PK d'un point sur un axe (projection sur le segment le plus proche) — pour situer un tronçon dévié sur la ligne
export function pkOnAxis(axis,q){if(!axis||axis.length<2)return 0;let best=1e18,pk=0,acc=0;for(let i=1;i<axis.length;i++){const a=axis[i-1],b=axis[i];const dx=b[0]-a[0],dy=b[1]-a[1];const L2=dx*dx+dy*dy||1;let t=((q[0]-a[0])*dx+(q[1]-a[1])*dy)/L2;t=Math.max(0,Math.min(1,t));const d=Math.hypot(q[0]-a[0]-dx*t,q[1]-a[1]-dy*t);const seg=Math.sqrt(L2);if(d<best){best=d;pk=acc+seg*t;}acc+=seg;}return +pk.toFixed(1);}
// PK des soudures d'une conduite (chantier enregistré : welds.m ; appli : joints.idx → fin de la pièce) ; base=true : sans les soudures ajoutées sur place
export function weldPks(cd,base){const out=[];if(!cd)return out;(cd.joints||cd.welds||[]).forEach(j=>{if(base&&j.extra)return;const m=j.m!=null?+j.m:(cd.els&&cd.els[j.idx]?+cd.els[j.idx].m1:null);if(m!=null&&isFinite(m))out.push([+m.toFixed(1),j.fc?1:0,j.extru?1:0]);});return out.sort((a,b)=>a[0]-b[0]);}
/* ZONES (27/10) : les changements d'une ligne regroupés par endroit — pièces ajoutées (PK réel), retirées (PK ramené sur le réel), tronçons déviés — quand ils sont à
   moins de GAP m les uns des autres ; chaque zone est bornée par les ANCRES (pièces appariées) qui l'entourent, ce qui donne exactement le linéaire en plus ou en moins
   (dérive de l'ancre aval − dérive de l'ancre amont) et, si le marché a mémorisé ses soudures (wk), les soudures en plus ou en moins. */
export function zoneDiff(x,l,pc,opt){opt=opt||{};const GAP=opt.gap||20;const axis=axisOf(l);const L=polyLen(axis);const LM=x&&x.axis?polyLen(x.axis):L;const ev=[];
  (pc.added||[]).forEach(p=>ev.push({t:'add',m:p.m,p}));(pc.removed||[]).forEach(p=>ev.push({t:'rm',m:p.mr!=null?p.mr:p.m,p}));
  (opt.geo||[]).forEach(g=>{const m=pkOnAxis(axis,[(g[0][0]+g[1][0])/2,(g[0][1]+g[1][1])/2]);ev.push({t:'geo',m,g,m0:pkOnAxis(axis,g[0]),m1:pkOnAxis(axis,g[1])});});
  ev.sort((a,b)=>a.m-b.m);const anc=(pc.pairs||[]).filter(a=>!a.end).slice().sort((a,b)=>a.r-b.r); /* les fins de ligne ne séparent pas des zones (elles bougent avec la ligne) */
  const ancBetween=(a,b)=>anc.some(x=>x.r>a+0.5&&x.r<b-0.5);
  const zones=[];let cur=null;ev.forEach(e=>{const lo=e.m0!=null?Math.min(e.m0,e.m1):e.m,hi=e.m1!=null?Math.max(e.m0,e.m1):e.m;if(cur&&(lo-cur.m1<=GAP||!ancBetween(cur.m1,lo))){cur.m1=Math.max(cur.m1,hi);cur.ev.push(e);}else{cur={m0:lo,m1:hi,ev:[]};cur.ev.push(e);zones.push(cur);}}); /* même zone : à moins de GAP, ou aucune pièce appariée entre les deux (le linéaire ne se partage pas) */const wkR={A:weldPks(l.cond&&l.cond.A,false),R:weldPks(l.cond&&l.cond.R,false)};const wkM=x&&x.wk?x.wk:null;
  const cnt=(W,a,b)=>{let n=0,fc=0,ex=0;(W||[]).forEach(w=>{if(w[0]>=a-0.05&&w[0]<=b+0.05){n++;fc+=w[1]||0;ex+=w[2]||0;}});return {n,fc,ex};};
  const ancAll=(pc.pairs||[]).slice().sort((a,b)=>a.r-b.r);
  return zones.map(z=>{let a0=null,a1=null;ancAll.forEach(a=>{if(a.r<z.m0-0.5&&(!a0||a.r>a0.r))a0=a;if(a.r>z.m1+0.5&&(!a1||a.r<a1.r))a1=a;});
    const r0=a0?a0.r:0,r1=a1?a1.r:L,q0=a0?a0.m:0,q1=a1?a1.m:LM;const dml=+((r1-r0)-(q1-q0)).toFixed(1);
    const sR=cnt(wkR.A,r0,r1),sR2=cnt(wkR.R,r0,r1);const soudR=sR.n+sR2.n,fcR=sR.fc+sR2.fc,exR=sR.ex+sR2.ex;let soudM=null,fcM=null;if(wkM){const a=cnt(wkM.A,q0,q1),b=cnt(wkM.R,q0,q1);soudM=a.n+b.n;fcM=a.fc+b.fc;}
    return {m0:+z.m0.toFixed(1),m1:+z.m1.toFixed(1),added:z.ev.filter(e=>e.t==='add').map(e=>e.p),removed:z.ev.filter(e=>e.t==='rm').map(e=>e.p),geo:z.ev.filter(e=>e.t==='geo').map(e=>e.g),anc:{r0,r1,q0,q1,a0:!!a0,a1:!!a1},dml,soudR,soudM,fcR,fcM,exR};});}
export function sumCounts(list){const t=Z();list.forEach(c=>{if(c)M_KEYS.forEach(([k])=>t[k]+=c[k]||0);});t.ml=+t.ml.toFixed(1);return t;}
// 23/10 (Ethan : « déplacer une réduction par rapport au tracé initial, qui change des DN, est aussi une modif ; une antenne qui change de DN aussi ») : PROFIL DE DN
// d'une ligne = tronçons [m0, m1, dn] en PK de la conduite (aller, sinon retour), tronçons voisins de même DN fusionnés ; figé avec le marché (dnp) et comparé au réel.
export function dnProfile(l){const cd=l&&l.cond&&(l.cond.A||l.cond.R);const out=[];const dn0=+l.dn||0;if(!cd||!cd.els||!cd.els.length)return out;
  cd.els.forEach(e=>{if(e.kind==='endpoint'||e.link)return;const a=+e.m0||0,b=+e.m1||0;if(b-a<1e-6)return;const dn=+e.dn||dn0;const last=out[out.length-1];if(last&&last.dn===dn&&Math.abs(last.m1-a)<0.05)last.m1=+b.toFixed(2);else out.push({m0:+a.toFixed(2),m1:+b.toFixed(2),dn});});
  return out;}
const dnAtP=(prof,m)=>{for(const s of prof){if(m>=s.m0-1e-6&&m<=s.m1+1e-6)return s.dn;}return prof.length?(m<prof[0].m0?prof[0].dn:prof[prof.length-1].dn):0;};
// écarts de DN entre deux profils : [{m0, m1, from, to}] (tronçons où le DN du réel diffère de celui du marché), sur la longueur commune
export function dnDiff(marP,reelP){if(!marP||!marP.length||!reelP||!reelP.length)return [];const L=Math.min(marP[marP.length-1].m1,reelP[reelP.length-1].m1);const cuts=new Set([0,L]);[...marP,...reelP].forEach(s=>{if(s.m0<L)cuts.add(s.m0);if(s.m1<L)cuts.add(s.m1);});
  const xs=[...cuts].sort((a,b)=>a-b);const out=[];for(let i=1;i<xs.length;i++){const a=xs[i-1],b=xs[i];if(b-a<0.3)continue;const mid=(a+b)/2;const dm=dnAtP(marP,mid),dr=dnAtP(reelP,mid);if(!dm||!dr||dm===dr)continue;const last=out[out.length-1];if(last&&last.from===dm&&last.to===dr&&Math.abs(last.m1-a)<0.05)last.m1=+b.toFixed(2);else out.push({m0:+a.toFixed(2),m1:+b.toFixed(2),from:dm,to:dr});}
  return out.filter(x=>x.m1-x.m0>=1);} /* moins d'1 m = bruit (emprise d'une réduction), pas un changement de DN */
// photographie du réseau : par ligne (axe, quantités, profil de DN) + totaux — c'est le « tracé marché »
export function marcheSnapshot(lines,meta){const L=(lines||[]).filter(l=>l&&l.cond&&(l.cond.A||l.cond.R)).map(l=>({id:l.id,name:l.name||l.id,dn:+l.dn||0,axis:axisOf(l).map(p=>[+p[0].toFixed(2),+p[1].toFixed(2)]),c:lineCounts(l,true),pcs:linePieces(l).map(p=>({k:p.k,c:p.c,m:p.m})),dnp:dnProfile(l),wk:{A:weldPks(l.cond.A,true),R:weldPks(l.cond.R,true)}})); /* 27/10 : wk = PK des soudures du marché (soudures d'une zone exactes) */
  return {v:1,at:new Date().toISOString(),...(meta||{}),lines:L,tot:sumCounts(L.map(x=>x.c))};}
// écart : par ligne (marché | réel | delta), lignes nouvelles / disparues, totaux
export function diffMarche(M,lines){const reel=(lines||[]).filter(l=>l&&l.cond&&(l.cond.A||l.cond.R));const byId={};(M&&M.lines||[]).forEach(x=>byId[x.id]=x);const seen=new Set();const rows=[];
  reel.forEach(l=>{const m=byId[l.id]||null;seen.add(l.id);const r=lineCounts(l,false);const d=Z();M_KEYS.forEach(([k])=>d[k]=+((r[k]||0)-(m?m.c[k]||0:0)).toFixed(1));const pc=m&&m.pcs?diffPieces(m.pcs,linePieces(l),0,{posM:mm=>atOnAxis(m.axis,mm),posR:(ax=>mm=>atOnAxis(ax,mm))(axisOf(l))}):{added:m?linePieces(l).filter(p=>!(m.c[PIECE_KEY[p.k]]>0)):linePieces(l),removed:[],unknown:!!m}; /* marché sans PK mémorisés : une nature de pièce absente du marché (0 vanne) → toutes celles du réel sont ajoutées, donc localisables */ rows.push({id:l.id,name:l.name||l.id,dn:+l.dn||0,mar:m?m.c:null,reel:r,d,isNew:!m,geo:m?geoDiff(m.axis,axisOf(l)):[],added:pc.added,removed:pc.removed,pairs:pc.pairs||[],pcsUnknown:!!(m&&!m.pcs),dnd:m&&m.dnp?dnDiff(m.dnp,dnProfile(l)):[],dnpUnknown:!!(m&&!m.dnp)});});
  (M&&M.lines||[]).forEach(x=>{if(seen.has(x.id))return;const d=Z();M_KEYS.forEach(([k])=>d[k]=-(x.c[k]||0));rows.push({id:x.id,name:x.name,dn:x.dn,mar:x.c,reel:null,d,gone:true,geo:[],added:[],removed:x.pcs||[]});});
  const tM=M?M.tot:Z();const tR=sumCounts(rows.map(r=>r.reel));const tD=Z();M_KEYS.forEach(([k])=>tD[k]=+((tR[k]||0)-(tM[k]||0)).toFixed(1));
  return {rows,tot:{mar:tM,reel:tR,d:tD},changed:rows.filter(r=>M_KEYS.some(([k])=>Math.abs(r.d[k])>(k==='ml'?0.5:0))||r.geo.length||(r.added&&r.added.length)||(r.removed&&r.removed.length)||(r.dnd&&r.dnd.length))};}
export const PIECE_LABEL={valve:'vanne',tee:'té',purge:'purge',vidange:'vidange',reducer:'réduction',bend:'coude',endcap:'fin de ligne'};
// écart géométrique : tronçons de l'axe réel dont un bout est à plus de tol m de l'axe marché → [[a,b],…] (surlignés sur le plan)
export function geoDiff(marAxis,axis,tol){tol=tol||0.6;if(!marAxis||marAxis.length<2||!axis||axis.length<2)return [];const dist=q=>{let best=1e9;for(let i=1;i<marAxis.length;i++){const a=marAxis[i-1],b=marAxis[i];const dx=b[0]-a[0],dy=b[1]-a[1];const L2=dx*dx+dy*dy||1;let t=((q[0]-a[0])*dx+(q[1]-a[1])*dy)/L2;t=Math.max(0,Math.min(1,t));best=Math.min(best,Math.hypot(q[0]-a[0]-dx*t,q[1]-a[1]-dy*t));}return best;};
  const out=[];for(let i=1;i<axis.length;i++){const a=axis[i-1],b=axis[i];const mid=[(a[0]+b[0])/2,(a[1]+b[1])/2];if(dist(a)>tol||dist(b)>tol||dist(mid)>tol)out.push([a,b]);}return out;}
export const hasDelta=d=>M_KEYS.some(([k])=>k!=='manchons'&&Math.abs(d[k]||0)>(k==='ml'?0.5:0));
