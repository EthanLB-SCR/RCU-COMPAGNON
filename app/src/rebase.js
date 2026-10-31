// rebase.js — RECENTRER LE REPÈRE D'UN CHANTIER (13/10/2026, Ethan, « Nantes Géraudière » : « au-dessus de 16 px/m tout disparaît »).
// Cause : le traceur avait gardé l'ORIGINE du plan précédent (un autre chantier, une autre zone Lambert CC) pour le nouveau plan → réseau à ~2 000 km
// de l'origine du repère. Deux effets dans Chrome : (1) plus rien n'est dessiné quand une valeur de transformation dépasse ~2^25 px (réparé dans la vue :
// « scale(k) translate(…) ») ; (2) les coordonnées SVG sont lues en flottants 32 bits : à 2·10^6 m le pas est de 12,5 cm → bouts d'acier, fils et manchons
// faux de près. Recentrer = décaler TOUTES les coordonnées du chantier (réseau, fond DXF, tracé marché, stock, notes, zones de fourniture, hydraulique,
// modifications, annotations, repères du calage) du même vecteur, et corriger d'autant le géoréférencement (affine, origine du DXF) : la carte reste au même endroit, les
// soudures gardent leurs numéros (tout ce qui est rangé au PK ne bouge pas). Module pur (sans DOM), testé en Node.
const R3=v=>+(+v).toFixed(3);
export const FAR_LIM=5e4; // réseau à plus de 50 km de l'origine du repère : anormal (un plan normal tient dans quelques km), à recentrer
const ptXY=p=>Array.isArray(p)?[p[0],p[1]]:p&&typeof p==='object'?[p.x,p.y]:[NaN,NaN];
/* emprise du réseau (lignes, pièces, axes) dans le repère du chantier, ou null */
export function siteNetBox(net){let x0=Infinity,y0=Infinity,x1=-Infinity,y1=-Infinity;
  const add=p=>{const [x,y]=ptXY(p);if(!isFinite(x)||!isFinite(y))return;if(x<x0)x0=x;if(x>x1)x1=x;if(y<y0)y0=y;if(y>y1)y1=y;};
  const el=e=>{if(e&&Array.isArray(e.axis))e.axis.forEach(pl=>Array.isArray(pl)&&pl.forEach(add));};
  ((net&&net.lines)||[]).forEach(L=>{if(!L)return;(L.axis||[]).forEach(add);(L.pts||[]).forEach(add);(L.els||[]).forEach(el);
    if(L.cond&&typeof L.cond==='object')['A','R'].forEach(c=>{const cd=L.cond[c];if(cd&&Array.isArray(cd.els))cd.els.forEach(el);});});
  return x0<=x1?[x0,y0,x1,y1]:null;}
/* décalage à appliquer si le réseau est loin de l'origine : {dx,dy,dist} (le coin bas-gauche du réseau revient vers (100, 100) m), sinon null */
export function farOffset(net,lim){lim=lim||FAR_LIM;const b=siteNetBox(net);if(!b)return null;const cx=(b[0]+b[2])/2,cy=(b[1]+b[3])/2;
  if(Math.abs(cx)<lim&&Math.abs(cy)<lim)return null;return {dx:Math.floor(b[0]/100)*100-100,dy:Math.floor(b[1]/100)*100-100,dist:Math.round(Math.hypot(cx,cy))};}
/* copie du chantier, toutes coordonnées décalées de (−dx, −dy) ; géoréférencement et origine DXF corrigés d'autant */
export function rebaseSite(net0,dx,dy){const net=JSON.parse(JSON.stringify(net0||{}));dx=+dx||0;dy=+dy||0;
  const P=p=>{if(Array.isArray(p)&&p.length>=2&&typeof p[0]==='number'&&typeof p[1]==='number'){const q=p.slice();q[0]=R3(p[0]-dx);q[1]=R3(p[1]-dy);return q;}
    if(p&&typeof p==='object'&&!Array.isArray(p)&&typeof p.x==='number'&&typeof p.y==='number')return Object.assign({},p,{x:R3(p.x-dx),y:R3(p.y-dy)});return p;};
  const PL=a=>Array.isArray(a)?a.map(P):a;const PLL=a=>Array.isArray(a)?a.map(PL):a;
  const XY=o=>{if(o&&typeof o==='object'&&typeof o.x==='number'&&typeof o.y==='number'){o.x=R3(o.x-dx);o.y=R3(o.y-dy);}};
  const BOX=b=>Array.isArray(b)&&b.length===4&&b.every(v=>typeof v==='number')?[R3(b[0]-dx),R3(b[1]-dy),R3(b[2]-dx),R3(b[3]-dy)]:b;
  const EL=e=>{if(!e||typeof e!=='object')return;if(e.axis)e.axis=PLL(e.axis);if(e.from)e.from=P(e.from);if(e.to)e.to=P(e.to);if(e.branch)e.branch=PL(e.branch);if(e.apex)e.apex=P(e.apex);if(e.bbox)e.bbox=BOX(e.bbox);};
  // réseau : axes des lignes, sommets, pièces (axes, bouts, branche de té), soudures
  (net.lines||[]).forEach(L=>{if(!L||typeof L!=='object')return;if(L.axis)L.axis=PL(L.axis);if(L.pts)L.pts=PL(L.pts);(L.els||[]).forEach(EL);
    if(L.cond&&typeof L.cond==='object')['A','R'].forEach(c=>{const cd=L.cond[c];if(!cd||typeof cd!=='object')return;(cd.els||[]).forEach(EL);(cd.welds||[]).forEach(XY);});});
  // traceur : sommets des lignes ; origine du DXF (local = (X − x0, y1 − Y)) → x0 + dx, y1 − dy
  const ORI=o=>{if(o&&typeof o.x0==='number'&&typeof o.y1==='number'){o.x0=R3(o.x0+dx);o.y1=R3(o.y1-dy);}};
  if(net.traceur&&typeof net.traceur==='object'){(net.traceur.lines||[]).forEach(l=>{if(l&&l.pts)l.pts=PL(l.pts);});ORI(net.traceur.bgOrigin);}
  if(net.traceur&&typeof net.traceur==='object'){const DL=l=>{if(l&&Array.isArray(l.del))l.del.forEach(d=>{if(d&&d.pts)d.pts=PL(d.pts);});}; /* 16/10 soir (lot TB) : versions — morceaux supprimés (l.del), lignes supprimées (ghosts) et tracé de référence (vref) suivent */
    (net.traceur.lines||[]).forEach(DL);(net.traceur.ghosts||[]).forEach(g=>{if(g&&g.pts)g.pts=PL(g.pts);DL(g);});if(net.traceur.vref&&Array.isArray(net.traceur.vref.lines))net.traceur.vref.lines.forEach(l=>{if(l&&l.pts)l.pts=PL(l.pts);DL(l);});}
  ORI(net.origin);
  // fond : traits, hachures, textes ; image de fond ; emprises
  (net.drawing||[]).forEach(d=>{if(!d||typeof d!=='object')return;if(d.pts)d.pts=PL(d.pts);if(d.loops)d.loops=PLL(d.loops);if(d.text!==undefined)XY(d);});
  if(net.image)XY(net.image);
  (net.plans||[]).forEach(p=>{if(!p||typeof p!=='object'||!p.transform||typeof p.transform!=='object')return;const t=p.transform;const ident=!t.tx&&!t.ty&&!t.rot&&(t.k===1||t.k===undefined);if(typeof t.tx==='number'&&typeof t.ty==='number'){t.tx=R3(t.tx-dx);t.ty=R3(t.ty-dy);}if(ident&&p.kind==='dxf')ORI(p.origin);}); // 14/10 (multi-plans) : chaque plan de fond suit (sa translation ; rotation / échelle / repère local inchangés) ; un DXF « calé par ses coordonnées » (transform identité : son repère local EST le repère du chantier) voit aussi son origine Lambert corrigée, comme bgOrigin
  if(net.bbox)net.bbox=BOX(net.bbox);if(net.nbox)net.nbox=BOX(net.nbox);
  // géoréférencement enregistré (calage) : X = a·x + b·y + e → e + a·dx + b·dy (idem f)
  if(net.geo&&net.geo.aff&&typeof net.geo.aff==='object'){const A=net.geo.aff;if([A.a,A.b,A.c,A.d,A.e,A.f].every(v=>typeof v==='number')){A.e=A.e+A.a*dx+A.b*dy;A.f=A.f+A.c*dx+A.d*dy;}}
  // repères du calage (posés sur le réseau, servent à l'épingle de la carte des chantiers) : la position plan suit, le point carte (ll) ne bouge pas — oubli corrigé le 13/10
  if(net.geo&&Array.isArray(net.geo.pts))net.geo.pts.forEach(q=>{if(q&&Array.isArray(q.plan))q.plan=P(q.plan);});
  // parties du chantier posées sur le plan
  if(net.marche&&Array.isArray(net.marche.lines))net.marche.lines.forEach(x=>{if(x&&x.axis)x.axis=PL(x.axis);});
  if(net.stock&&typeof net.stock==='object'){(net.stock.zones||[]).forEach(XY);(net.stock.moves||[]).forEach(m=>{if(!m)return;if(m.from)m.from=P(m.from);if(m.to)m.to=P(m.to);});}
  if(net.conv&&Array.isArray(net.conv.msgs))net.conv.msgs.forEach(m=>{if(m&&m.pos)m.pos=P(m.pos);});
  if(net.fourniture&&Array.isArray(net.fourniture.zones))net.fourniture.zones.forEach(z=>{if(z&&z.poly)z.poly=PL(z.poly);});
  if(net.hydro&&typeof net.hydro==='object')['water','fills','skids'].forEach(k=>(net.hydro[k]||[]).forEach(XY));
  if(net.ts&&Array.isArray(net.ts.items))net.ts.items.forEach(it=>{if(it&&Array.isArray(it.geo))it.geo=it.geo.map(PL);});
  (net.ann||[]).forEach(a=>{if(a&&a.p)a.p=P(a.p);});
  if(net.fiche&&typeof net.fiche==='object'&&net.fiche.chauf)XY(net.fiche.chauf); /* 01/11 soir : repère 🏭 chaufferie (sens aller / retour) */
  // feuille : de 0 à l'emprise (+ 20 m), comme à l'enregistrement du traceur
  const b=siteNetBox(net);const bb=Array.isArray(net.bbox)?net.bbox:null;const X1=Math.max(b?b[2]:0,bb?bb[2]:-Infinity),Y1=Math.max(b?b[3]:0,bb?bb[3]:-Infinity);
  if(isFinite(X1)&&isFinite(Y1)){net.w=Math.max(100,Math.ceil(X1+20));net.h=Math.max(100,Math.ceil(Y1+20));}
  net.rebased=(Array.isArray(net.rebased)?net.rebased:[]).concat([{dx,dy,at:new Date().toISOString()}]).slice(-5);
  return net;}
