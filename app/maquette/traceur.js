// Traceur : sommets → pièces catalogue posées selon les règles. Fonctions pures, sans DOM.
// Une « conduite » = polyligne (m) + DN + spéciaux (tés, vannes, réductions, bouchons) → chaîne de pièces avec positions, soudures, notes.
const rad=a=>a*Math.PI/180,deg=r=>r*180/Math.PI;const norm=a=>{while(a>Math.PI)a-=2*Math.PI;while(a<-Math.PI)a+=2*Math.PI;return a;};
export const fmt=n=>Number(n).toLocaleString('fr-FR',{maximumFractionDigits:2});
export function polyLen(pts){let L=0;for(let i=1;i<pts.length;i++)L+=Math.hypot(pts[i][0]-pts[i-1][0],pts[i][1]-pts[i-1][1]);return L;}
export function ptAt(pts,m){let d=0;for(let i=1;i<pts.length;i++){const a=pts[i-1],b=pts[i];const s=Math.hypot(b[0]-a[0],b[1]-a[1]);if(d+s>=m-1e-9){const t=s?(m-d)/s:0;return {x:a[0]+(b[0]-a[0])*t,y:a[1]+(b[1]-a[1])*t,th:Math.atan2(b[1]-a[1],b[0]-a[0]),i};}d+=s;}const a=pts[pts.length-2]||pts[0],b=pts[pts.length-1];return {x:b[0],y:b[1],th:Math.atan2(b[1]-a[1],b[0]-a[0]),i:pts.length-1};}
export function projOnPoly(pts,q){let best={d:1e9,m:0,i:1};let acc=0;for(let i=1;i<pts.length;i++){const a=pts[i-1],b=pts[i];const vx=b[0]-a[0],vy=b[1]-a[1];const L=Math.hypot(vx,vy)||1e-9;let t=((q[0]-a[0])*vx+(q[1]-a[1])*vy)/(L*L);t=Math.max(0,Math.min(1,t));const px=a[0]+vx*t,py=a[1]+vy*t;const d=Math.hypot(q[0]-px,q[1]-py);if(d<best.d)best={d,m:acc+L*t,i,px,py,side:Math.sign((q[0]-px)*(-vy)+(q[1]-py)*vx)||1};acc+=L;}return best;}
// décale une polyligne latéralement (entraxe) : vraie parallèle — chaque tronçon est décalé, les sommets sont à l'intersection des tronçons décalés (angles conservés), les extrémités perpendiculairement
export function offsetPoly(pts,off){if(!off)return pts.map(p=>p.slice());const n=pts.length;if(n<2)return pts.map(p=>p.slice());
  const segs=[];for(let i=1;i<n;i++){const a=pts[i-1],b=pts[i];const L=Math.hypot(b[0]-a[0],b[1]-a[1])||1e-9;const ux=(b[0]-a[0])/L,uy=(b[1]-a[1])/L;const nx=uy,ny=-ux;segs.push({a:[a[0]+nx*off,a[1]+ny*off],b:[b[0]+nx*off,b[1]+ny*off],ux,uy});}
  const out=[segs[0].a.slice()];
  for(let i=1;i<segs.length;i++){const s1=segs[i-1],s2=segs[i];const den=s1.ux*s2.uy-s1.uy*s2.ux;
    if(Math.abs(den)<1e-9){out.push(s1.b.slice());continue;} // colinéaires
    const t=((s2.a[0]-s1.a[0])*s2.uy-(s2.a[1]-s1.a[1])*s2.ux)/den;const P=[s1.a[0]+s1.ux*t,s1.a[1]+s1.uy*t];
    // angle très fermé : le sommet décalé part loin → on le borne à 4 × off le long de la bissectrice (l'écart est signalé par les règles ensuite)
    const dx=P[0]-pts[i][0],dy=P[1]-pts[i][1];const d=Math.hypot(dx,dy);const lim=Math.abs(off)*4;if(d>lim){out.push([pts[i][0]+dx/d*lim,pts[i][1]+dy/d*lim]);}else out.push(P);}
  out.push(segs[segs.length-1].b.slice());return out;}
// répartition d'une longueur droite en barres entières + une chute (jamais > barre ; chute ≥ chuteMin sinon l'avant-dernière est recoupée)
export function splitBars(G,bar,chuteMin){if(G<=1e-6)return [];const n=Math.max(1,Math.ceil(G/bar-1e-6));if(n===1)return [G];let rem=G-bar*(n-1);if(rem<chuteMin){return [...Array(n-2).fill(bar),bar-(chuteMin-rem),chuteMin];}return [...Array(n-1).fill(bar),rem];}
/* buildConduit({pts, dn, cat, rules, specials, bar, head, endStart, endEnd, e, bypassTurn})
   specials : [{m, type:'tee'|'valve'|'reducer'|'endcap'|'bend3d', dnb, dn2, side, teeType, id}]
   head : {id, ref} — la conduite part d'une sortie de té (branche du té de la parente) : la soudure au bout de la branche compte
   endStart / endEnd : 'libre' | 'kit' (kit fin de ligne) | 'provisoire' (fond bombé soudé, à reprendre) | 'sousstation' (raccordement) | 'bypass' (fin seulement : les deux conduites se rejoignent)
   → {pieces:[{kind, id, L, m0, m1, mc, angle, turn, legIn, legOut, long, R, x, y, th, path:[[x,y]...], ref, dn, dn2, note, err, key}], welds:[{i, m, x, y, dev, between}], notes:[{kind,txt,m}], length} */
export function buildConduit(o){
  const {pts,dn,cat,rules}=o;const specials=(o.specials||[]).slice().sort((a,b)=>a.m-b.m);const notes=[];const bar=o.bar||rules.barreParDefaut||12;const chuteMin=rules.chuteMin,legMin=rules.jambeMin,devMax=rules.devMax;
  const Ltot=polyLen(pts);const casing=cat.casing(dn);const B=cat.bend(dn);
  // DN par tronçon : une réduction change le DN de tout ce qui suit (gaine, jambes de coude, manchons, références) — dnAt(m) = DN en vigueur au chaînage m (la réduction elle-même : DN amont, dn2 aval)
  const reds=specials.filter(sp=>sp.type==='reducer'&&sp.dn2).sort((a,b)=>a.m-b.m);const dnAt=m=>{let d=dn;for(const r of reds){if(m>r.m+1e-6)d=r.dn2;}return d;};
  // 1) nœuds rigides le long du chaînage : coudes aux sommets (angle ≥ devMax), spéciaux ; départ/fin
  const nodes=[{kind:'start',m:0}];let acc=0;const fcMax=rules.fausseCoupeMax===undefined?15:rules.fausseCoupeMax;const pas=rules.coudeAnglePas||15;
  // extrémités : la pièce de bout est un nœud rigide collé au départ / à la fin (kit = bouchon catalogue, provisoire = fond bombé soudé, sous-station = raccordement sans pièce, by-pass = coude 90° recoupé vers l'autre conduite)
  const endNode=(type,atStart)=>{if(!type||type==='libre'||type==='tee')return null;const sid='end:'+(atStart?'start':'end');const dl=dnAt(atStart?0:Ltot);
    if(type==='kit'||type==='provisoire'){const ec=cat.endcap(dl);const L=ec.L||0.3;return {kind:'endcap',sub:type,m:atStart?L/2:Ltot-L/2,L,legIn:L/2,legOut:L/2,sid,dn:dl,ref:type==='kit'?`kit fin de ligne DN${dl} (${ec.ref})`:`fin de ligne provisoire DN${dl} — fond bombé soudé, à reprendre`};}
    if(type==='sousstation')return {kind:'endpoint',sub:type,m:atStart?0:Ltot,L:0,legIn:0,legOut:0,sid,dn:dl,ref:atStart?'raccordement (chaufferie / sous-station)':'raccordement sous-station'};
    if(type==='bypass'&&!atStart){const L=legMin;const Bl=cat.bend(dl);return {kind:'bypassEnd',sub:type,m:Ltot-L/2,L,legIn:L/2,legOut:L/2,sid,dn:dl,turn:o.bypassTurn||1,r:(o.e||casing+0.15)/2,ref:`by-pass : coude 90° ${Bl.ref} recoupé (jambe ${fmt(legMin)} m) vers l'autre conduite`};}
    return null;};
  const nStart=endNode(o.endStart,true),nEnd=endNode(o.endEnd,false);if(nStart)nodes.push(nStart);
  // coupes forcées (soudure coulissée à la main entre deux tubes) : nœud rigide sans longueur — les barres se réorganisent de part et d'autre (barres entières + chute)
  (o.cuts||[]).forEach((m,i)=>{if(m>0.05&&m<Ltot-0.05)nodes.push({kind:'cut',m,L:0,legIn:0,legOut:0,sid:'cut:'+i});});
  const covered=m=>specials.some(sp=>sp.type==='bend3d'&&Math.abs(sp.m-m)<=(sp.cover||1.3)); // sommets « mangés » par un coude de jeu en altimétrie (la cassure en plan fait partie du coude 3D)
  for(let i=1;i<pts.length-1;i++){acc+=Math.hypot(pts[i][0]-pts[i-1][0],pts[i][1]-pts[i-1][1]);if(covered(acc))continue;const h0=Math.atan2(pts[i][1]-pts[i-1][1],pts[i][0]-pts[i-1][0]),h1=Math.atan2(pts[i+1][1]-pts[i][1],pts[i+1][0]-pts[i][0]);const t=deg(norm(h1-h0));
    if(Math.abs(t)<fcMax){nodes.push({kind:'dev',m:acc,ang:t,fc:Math.abs(t)>=devMax});} // en dessous de fausseCoupeMax : pas de coude — la barre est coupée là ; ≤ devMax : simple déviation au manchon, au-delà : fausse coupe (tubes coupés en biais)
    else{let A=Math.round(Math.abs(t)/pas)*pas;if(A<pas)A=pas;const r=+(Math.abs(t)-A).toFixed(2);const dl=dnAt(acc),Bl=cat.bend(dl); // coude au pas de 15° le plus proche, le reste en fausse coupe à la soudure voisine
      nodes.push({kind:'bend',m:acc,angle:A,angleReal:+Math.abs(t).toFixed(2),resid:r,turn:t>=0?1:-1,legIn:Bl.legs[0],legOut:Bl.legs[1],vertex:i,dn:dl,B:Bl});}}
  specials.forEach(sp=>{let L=1,extra={};const dl=dnAt(sp.m);
    if(sp.type==='tee'&&sp.vert){ // té de purge (branche vers le haut) / de vidange (vers le bas) : pas de branche en plan, un symbole ; type catalogue dédié s'il existe, sinon le té droit avec le DN de la branche
      const kindTxt=sp.vert==='up'?'purge':'vidange';const types=cat.teeTypes();const tt=types.find(k=>new RegExp(kindTxt,'i').test(k))||sp.teeType||rules.teeTypeParDefaut;const dnb=sp.dnb||(sp.vert==='up'?(rules.purgeDN||25):(rules.vidangeDN||40));const t=cat.tee(dl,dnb,tt);L=t.L;
      extra={B:0,H:t.H,ref:`té de ${kindTxt} DN${dl}/${dnb} — ${t.ref}${new RegExp(kindTxt,'i').test(t.type||'')?'':' (té droit, branche verticale)'}`,teeType:t.type,dnb,side:0,vert:sp.vert,photo:sp.photo||null,atEnd:!!sp.atEnd};}
    else if(sp.type==='tee'){const t=cat.tee(dl,sp.dnb||dl,sp.teeType||rules.teeTypeParDefaut);L=t.L;extra={B:t.B,H:t.H,ref:t.ref,teeType:t.type,dnb:sp.dnb||dl,side:sp.side||1};}
    else if(sp.type==='valve'){const v=cat.valve(dl);L=v.L;extra={ref:v.ref,H:v.H};}else if(sp.type==='reducer'){const r=cat.reducer(dl,sp.dn2||dl);L=r.L;extra={ref:r.ref,dn2:sp.dn2||dl};}else if(sp.type==='endcap'){const e=cat.endcap(dl);L=e.L;extra={ref:e.ref};}
    else if(sp.type==='bend3d'){const A=sp.angle||15;const m=Math.max(0,Math.min(Ltot,sp.m));const Bl=cat.bend(dnAt(m));nodes.push({kind:'bend',plane:'3D',m,angle:A,angleReal:A,resid:0,turn:sp.turn||1,legIn:Bl.legs[0],legOut:Bl.legs[1],sid:sp.id,vertex:null,dz:sp.dz||0,jeu:sp.jeu,dn:dnAt(m),B:Bl});return;}
    const m=Math.max(L/2,Math.min(Ltot-L/2,sp.m));nodes.push({kind:sp.type,m,L,legIn:L/2,legOut:L/2,sid:sp.id,dn:dl,...extra});});
  if(nEnd)nodes.push(nEnd);nodes.push({kind:'end',m:Ltot});nodes.sort((a,b)=>a.m-b.m);
  const rigid=nodes.filter(n=>n.kind!=='dev');const devs=nodes.filter(n=>n.kind==='dev');
  // 2) écarts entre nœuds rigides consécutifs → barres, coude contre coude, jambes recoupées, ou erreur
  const fills=[];
  for(let k=0;k<rigid.length-1;k++){const a=rigid[k],b=rigid[k+1];const D=b.m-a.m;const la=a.kind==='start'?0:a.legOut,lb=b.kind==='end'?0:b.legIn;let G=D-la-lb;const bendA=a.kind==='bend',bendB=b.kind==='bend';let bars=[];let note=null,err=null,manch=false,nue=false;
    const manchetteMin=rules.manchetteMin===undefined?0.2:rules.manchetteMin;const nom=x=>x.kind==='start'?(o.head?'la sortie du té':'le départ'):x.kind==='end'?'la fin':x.kind==='bend'?(x.plane==='3D'?'le coude en altimétrie':'le coude du sommet '+x.vertex):x.kind==='tee'?'le té':x.kind==='valve'?'la vanne':x.kind==='reducer'?'la réduction':x.kind==='endcap'?(x.sub==='kit'?'le kit fin de ligne':'la fin de ligne provisoire'):x.kind==='endpoint'?'le raccordement':x.kind==='bypassEnd'?'le coude du by-pass':x.kind==='cut'?'la soudure coulissée':x.kind;
    if(G>=chuteMin-1e-6){bars=splitBars(G,bar,chuteMin);}
    else if(G>=manchetteMin-1e-6){ // pas la place d'une chute : une manchette (bout de tube court, deux soudures) — c'est ce qui se fait entre deux pièces (lyre extérieure, chicane…)
      bars=[G];manch=true;note={kind:'interp',txt:`manchette de ${fmt(G)} m entre ${nom(a)} et ${nom(b)} (pas la place d'une chute ≥ ${fmt(chuteMin)} m)`};}
    else if(G>=0.03){ // moins que la manchette mini : manchette nue (bout d'acier sans isolant), deux soudures dans le même manchon — jamais un trou ; les fausses coupes des coudes voisins se prennent à ces soudures
      bars=[G];manch=true;nue=true;note={kind:'interp',txt:`manchette nue de ${fmt(G)} m entre ${nom(a)} et ${nom(b)} (moins que la manchette mini ${fmt(manchetteMin)} m) : deux soudures dans le même manchon${(bendA&&a.resid)||(bendB&&b.resid)?', tubes coupés en biais (fausse coupe)':''}`};}
    else if(G>1e-3){ // quelques centimètres : les jambes de coude voisines se recoupent de l'écart ; sinon l'écart est absorbé à la soudure (note, pas d'erreur)
      let need=G;const cutA=bendA?Math.min(need/(bendB?2:1),a.legOut-legMin):0;const cutB=bendB?Math.min(need-cutA,b.legIn-legMin):0;
      if(cutA+cutB>=need-1e-3){a.legOut=+(a.legOut-cutA).toFixed(3);b.legIn=+(b.legIn-cutB).toFixed(3);if(cutA>0)a.cut=true;if(cutB>0)b.cut=true;note={kind:'interp',txt:`${fmt(G)} m entre ${nom(a)} et ${nom(b)} → jambes recoupées (${fmt(a.legOut)} + ${fmt(b.legIn)} m), soudées l'une sur l'autre`};}
      else{note={kind:'interp',txt:`écart de ${fmt(G*100)} cm entre ${nom(a)} et ${nom(b)} absorbé à la soudure`};}}
    else if(G>=-1e-3&&bendA&&bendB){note={kind:'interp',txt:`${a.plane==='3D'||b.plane==='3D'?'jeu de coudes en altimétrie':'sommets '+a.vertex+' et '+b.vertex} : coude contre coude (jambes ${fmt(la)} + ${fmt(lb)} m, ${fmt(D)} m entre sommets)`};}
    else if(G>=-1e-3){}
    else { // chevauchement : on recoupe les jambes de coude (jamais sous jambeMin) ; les autres pièces ne se recoupent pas
      let need=-G;const cutA=bendA?Math.min(need/(bendB?2:1),a.legOut-legMin):0;const cutB=bendB?Math.min(need-cutA,b.legIn-legMin):0;a.legOut=+(a.legOut-cutA).toFixed(3);b.legIn=+(b.legIn-cutB).toFixed(3);need-=cutA+cutB;
      if(bendA&&cutA>0)a.cut=true;if(bendB&&cutB>0)b.cut=true;
      if(need>1e-3){err=`${fmt(D)} m entre ${a.kind==='start'?'le départ':a.kind+(a.vertex!==undefined?' (sommet '+a.vertex+')':'')} et ${b.kind==='end'?'la fin':b.kind+(b.vertex!==undefined?' (sommet '+b.vertex+')':'')} : les pièces catalogue ne rentrent pas (il manque ${fmt(need)} m même jambes recoupées à ${fmt(legMin)} m)`;}
      else note={kind:'interp',txt:`${a.plane==='3D'||b.plane==='3D'?'jeu de coudes en altimétrie':'sommets '+(a.vertex!==undefined&&a.vertex!==null?a.vertex:'?')+' et '+(b.vertex!==undefined&&b.vertex!==null?b.vertex:'?')} : coude contre coude, jambes recoupées (${fmt(a.legOut)} + ${fmt(b.legIn)} m, ${fmt(D)} m entre sommets)`};}
    fills.push({bars,note,err,a,b,manch,nue});}
  // 3) pièces dans l'ordre, avec positions (marche le long de la polyligne, sommet par sommet)
  const pieces=[];let n={P:0,M:0,C:0,T:0,V:0,R:0,B:0,F:0,X:0,U:0};const idOf=k=>k+(++n[k]);let carry=null;
  const pushPiece=p=>{pieces.push(p);return p;};
  const place=(m0,m1)=>{const a=ptAt(pts,m0),b=ptAt(pts,m1);return {x:a.x,y:a.y,th:a.th,x1:b.x,y1:b.y};};
  for(let k=0;k<rigid.length;k++){const nd=rigid[k];
    if(nd.kind==='bend'&&nd.plane==='3D'){const m0=nd.m-nd.legIn,m1=nd.m+nd.legOut;const path=[];const a=ptAt(pts,Math.max(0,m0));const bq=ptAt(pts,Math.min(Ltot,m1));path.push([a.x,a.y]);for(let i=a.i;i<bq.i;i++)path.push(pts[i].slice());path.push([bq.x,bq.y]);
      const Bl=nd.B||B,dl=nd.dn||dn;pushPiece({kind:'bend',plane:'3D',jeu:nd.jeu,id:idOf('C'),m0,m1,mc:nd.m,angle:nd.angle,angleReal:nd.angle,resid:0,turn:nd.turn,legIn:nd.legIn,legOut:nd.legOut,cut:!!nd.cut,R:Bl.R,path,x:a.x,y:a.y,th:a.th,dn:dl,casing:cat.casing(dl),ref:Bl.ref.replace(/90/,String(nd.angle))+' · en altimétrie (jeu de coudes'+(nd.dz?(nd.dz>0?', monte':', descend'):'')+')'+(nd.cut?' · jambes recoupées':''),std:Bl.std.includes(nd.angle),vertex:null,L:nd.legIn+nd.legOut,sid:nd.sid});carry=null;}
    else if(nd.kind==='bend'){const m0=nd.m-nd.legIn,m1=nd.m+nd.legOut;const a=ptAt(pts,Math.max(0,m0)),c=ptAt(pts,nd.m);const B=nd.B||cat.bend(dn),dl=nd.dn||dn;
      const A=nd.angle,r=nd.resid||0;const R=Math.min(B.R,Math.max(.05,Math.min(nd.legIn,nd.legOut)/Math.tan(rad(A)/2)-1e-3));const T=R*Math.tan(rad(A)/2);
      const hIn0=Math.atan2(pts[nd.vertex][1]-pts[nd.vertex-1][1],pts[nd.vertex][0]-pts[nd.vertex-1][0]);
      // où passe le reste d'angle (fausse coupe) : à la soudure aval si un tube suit, sinon à la soudure amont ; sans tube voisin on le note
      const tubeAfter=k<rigid.length-1&&fills[k].bars.length>0,tubeBefore=k>0&&fills[k-1].bars.length>0;const fcWhere=Math.abs(r)<0.01?null:tubeAfter?'aval':tubeBefore?'amont':'none';
      const hIn=fcWhere==='amont'?hIn0+nd.turn*rad(r):hIn0; // fausse coupe amont : le coude part déjà tourné du reste
      const lIn=nd.legIn-T,lOut=nd.legOut-T;const p0=[a.x,a.y];const p1=[p0[0]+Math.cos(hIn)*lIn,p0[1]+Math.sin(hIn)*lIn];const path=[p0,p1];const steps=Math.max(3,Math.round(A/8));const cx=p1[0]-Math.sin(hIn)*R*nd.turn,cy=p1[1]+Math.cos(hIn)*R*nd.turn;const a0=Math.atan2(p1[1]-cy,p1[0]-cx);for(let s=1;s<=steps;s++){const ang=a0+nd.turn*rad(A)*s/steps;path.push([cx+R*Math.cos(ang),cy+R*Math.sin(ang)]);}
      const hOut=hIn+nd.turn*rad(A);const pe=path[path.length-1];const E=[pe[0]+Math.cos(hOut)*lOut,pe[1]+Math.sin(hOut)*lOut];path.push(E);
      const std=B.std.includes(A);const p=pushPiece({kind:'bend',id:idOf('C'),m0,m1,mc:nd.m,angle:A,angleReal:nd.angleReal,resid:r,fcWhere,turn:nd.turn,legIn:nd.legIn,legOut:nd.legOut,long:!!nd.long,cut:!!nd.cut,R,path,x:p0[0],y:p0[1],th:hIn,dn:dl,casing:cat.casing(dl),ref:B.ref.replace(/90/,String(A))+(std?'':' (angle sur mesure)')+(nd.long?' · jambe longue':'')+(nd.cut?' · jambes recoupées':''),std,vertex:nd.vertex,L:nd.legIn+nd.legOut,E});
      if(fcWhere==='aval')carry=E;else carry=null; // le tube suivant démarre au bout de la jambe (fausse coupe à cette soudure)
      if(fcWhere)notes.push({kind:fcWhere==='none'?'warn':'info',m:nd.m,txt:`sommet ${nd.vertex} : angle tracé ${fmt(nd.angleReal)}° → coude ${A}° + fausse coupe de ${fmt(Math.abs(r))}° à la soudure ${fcWhere==='none'?'voisine (aucun tube adjacent : écart de quelques cm à absorber)':fcWhere}`});
      if(!std&&!B.anyAngle)notes.push({kind:'doubt',m:nd.m,txt:`sommet ${nd.vertex} : coude de ${A}° — pas au catalogue de ce fournisseur (angles ${B.std.join('/')}) → coude spécial ? déviations aux manchons ?`});
      else if(!std)notes.push({kind:'info',m:nd.m,txt:`sommet ${nd.vertex} : coude ${A}° sur mesure à commander (${B.ref.replace(/90/,String(A))})`});}
    else if(nd.kind==='cut'){carry=null;}
    else if(nd.kind==='tee'||nd.kind==='valve'||nd.kind==='reducer'||nd.kind==='endcap'||nd.kind==='endpoint'||nd.kind==='bypassEnd'){const m0=nd.m-nd.legIn,m1=nd.m+nd.legOut;const g=place(m0,m1);const c=ptAt(pts,nd.m);const path=[[g.x,g.y],[g.x1,g.y1]];const dl=nd.dn||dn;const p={kind:nd.kind,id:idOf(nd.kind==='tee'?'T':nd.kind==='valve'?'V':nd.kind==='reducer'?'R':nd.kind==='endpoint'?'X':nd.kind==='bypassEnd'?'U':nd.sub?'F':'B'),m0,m1,mc:nd.m,L:nd.L,path,x:g.x,y:g.y,th:g.th,dn:dl,casing:cat.casing(dl),ref:nd.ref,sid:nd.sid,dn2:nd.dn2,dnb:nd.dnb,side:nd.side,teeType:nd.teeType,Bb:nd.B,H:nd.H,sub:nd.sub,vert:nd.vert,photo:nd.photo,atEnd:nd.atEnd};
      if(nd.kind==='tee'&&nd.vert){p.center=[c.x,c.y];p.cth=c.th;} // purge / vidange : branche verticale, symbole au centre
      else if(nd.kind==='tee'){const s=nd.side||1;const nx=-Math.sin(c.th)*s,ny=Math.cos(c.th)*s;p.branch=[[c.x,c.y],[c.x+nx*(nd.B||1),c.y+ny*(nd.B||1)]];p.branchPort={x:c.x+nx*(nd.B||1),y:c.y+ny*(nd.B||1),th:Math.atan2(ny,nx)};p.saut=/saut/i.test(nd.teeType||'');}
      if(nd.kind==='bypassEnd'){const t=nd.turn||1,r=nd.r||0.2;const th=g.th;p.turn=t;p.r=r;p.apex=[g.x1+Math.cos(th)*r-Math.sin(th)*r*t,g.y1+Math.sin(th)*r+Math.cos(th)*r*t]; // bout de l'arc de 90° : point de jonction des deux conduites (soudure du by-pass)
        const steps=6;const cx=g.x1-Math.sin(th)*r*t,cy=g.y1+Math.cos(th)*r*t;const a0=Math.atan2(g.y1-cy,g.x1-cx);for(let s=1;s<=steps;s++){const ang=a0+t*(Math.PI/2)*s/steps;path.push([cx+r*Math.cos(ang),cy+r*Math.sin(ang)]);}}
      pushPiece(p);}
    if(k<rigid.length-1){const f=fills[k];let m=nd.kind==='start'?0:nd.m+nd.legOut;f.bars.forEach((L,j)=>{const g=place(m,m+L);const start=(j===0&&carry)?carry:[g.x,g.y];const std=Math.abs(L-bar)<1e-6;const dl=dnAt(m+1e-3),cl=cat.casing(dl);const nueP=!!f.manch&&(f.nue||L<=2*cat.bareEnds(dl)+0.05);const p=pushPiece({kind:'tube',id:idOf(f.manch?'M':'P'),m0:m,m1:m+L,L,path:[start,[g.x1,g.y1]],x:start[0],y:start[1],th:Math.atan2(g.y1-start[1],g.x1-start[0]),dn:dl,casing:cl,std,cut:!std,manchette:!!f.manch,nue:nueP,fcBefore:(j===0&&carry)?true:false,ref:`R-${dl}/${Math.round(cl*1000)}`+(std?` · barre ${bar} m`:f.manch?(nueP?` · manchette nue ${fmt(L)} m (acier nu, un seul manchon)`:` · manchette ${fmt(L)} m`):` · barre coupée ${fmt(L)} m`)});if(f.err&&j===f.bars.length-1){p.err=f.err;}m+=L;});carry=null;
      if(f.err){notes.push({kind:'err',m:f.a.m,txt:f.err});if(!f.bars.length&&pieces.length)pieces[pieces.length-1].err=f.err;}if(f.note)notes.push({...f.note,m:f.a.m});}}
  // les tubes qui traversent un point de déviation (angle < devMax) sont coupés là : la déviation se prend au manchon
  devs.forEach(d=>{const lbl=d.fc?`fausse coupe de ${fmt(Math.abs(d.ang))}°`:`déviation de ${fmt(Math.abs(d.ang))}°`;const i=pieces.findIndex(p=>p.kind==='tube'&&p.m0<d.m-0.05&&p.m1>d.m+0.05);if(i<0){notes.push({kind:'warn',m:d.m,txt:`${lbl} au chaînage ${fmt(d.m)} m : tombe dans une pièce rigide, pas dans une barre — à vérifier`});return;}
    const p=pieces[i];const L1=d.m-p.m0,L2=p.m1-d.m;if(L1<chuteMin||L2<chuteMin){notes.push({kind:'warn',m:d.m,txt:`${lbl} au chaînage ${fmt(d.m)} m : la soudure tomberait à ${fmt(Math.min(L1,L2))} m d'une autre (< chute mini) — déplace le sommet ou fais un coude`});return;}
    const g1=place(p.m0,d.m),g2=place(d.m,p.m1);const q={...p,id:p.id+'b',m0:d.m,m1:p.m1,L:L2,path:[[g2.x,g2.y],[g2.x1,g2.y1]],x:g2.x,y:g2.y,th:g2.th,std:false,cut:true,fcBefore:!!d.fc,ref:`R-${p.dn}/${Math.round(p.casing*1000)} · barre coupée ${fmt(L2)} m`};Object.assign(p,{m1:d.m,L:L1,path:[p.path[0],[g1.x1,g1.y1]],std:false,cut:true,ref:`R-${p.dn}/${Math.round(p.casing*1000)} · barre coupée ${fmt(L1)} m`,devAfter:d.ang,fcAfter:!!d.fc});pieces.splice(i+1,0,q);
    notes.push({kind:'info',m:d.m,txt:`${lbl} au chaînage ${fmt(d.m)} m (soudure entre ${p.id} et ${q.id})${d.fc?' — tubes coupés en biais, pas de coude':' — reprise au manchon'}`});});
  pieces.sort((a,b)=>a.m0-b.m0);
  // sortie de té : la branche du té de la parente est la pièce d'avant la première — la soudure au bout de la branche (distance catalogue B) compte, ce n'est pas une fin de ligne
  if(o.head){const P0=pts[0];pieces.unshift({kind:'teeBranch',id:o.head.id,fixedId:true,noNomen:true,L:0,m0:0,m1:0,mc:0,path:[[P0[0],P0[1]],[P0[0],P0[1]]],x:P0[0],y:P0[1],th:0,dn,casing,ref:o.head.ref,sid:o.head.sid});}
  // 4) soudures : entre deux pièces consécutives
  const welds=[];for(let i=0;i<pieces.length-1;i++){const p=pieces[i],q=pieces[i+1];const c=ptAt(pts,p.m1);const E=(p.kind==='bend'&&p.fcWhere==='aval')?p.E:null;let dev=p.devAfter||0,fc=!!p.fcAfter;if(p.kind==='bend'&&p.fcWhere==='aval'){dev=p.resid;fc=true;}if(q.kind==='bend'&&q.fcWhere==='amont'){dev=q.resid;fc=true;}welds.push({i,m:p.m1,x:E?E[0]:c.x,y:E?E[1]:c.y,between:[p.id,q.id],dev,fc,dn:p.kind==='reducer'?(p.dn2||p.dn):(p.dn||dn),teeOut:p.kind==='teeBranch'});}
  // renumérotation lisible : chaque type dans l'ordre du chaînage
  const cnt={};pieces.forEach(p=>{if(p.fixedId)return;const k=p.id.replace(/\d+b?$/,'');cnt[k]=(cnt[k]||0)+1;p.id=k+cnt[k];});welds.forEach((w,i)=>{w.between=[pieces[i].id,pieces[i+1].id];});
  // manchette nue : ses deux soudures passent dans le même manchon
  pieces.forEach((p,i)=>{if(!p.nue)return;welds.forEach(w=>{if(w.i===i-1||w.i===i)w.sleeve=p.id;});});
  return {pieces,welds,notes,length:Ltot,casing,dn};
}
// nomenclature : comptage par référence (les raccordements et sorties de té ne sont pas des pièces à commander)
export function nomenclature(conduits){const by={};conduits.forEach(c=>c.pieces.forEach(p=>{if(p.noNomen||p.kind==='teeBranch'||p.kind==='endpoint')return;const k=p.kind==='tube'?(p.std?p.ref:p.manchette?(p.nue?`R-${p.dn}/${Math.round(p.casing*1000)} · manchettes nues (un seul manchon)`:`R-${p.dn}/${Math.round(p.casing*1000)} · manchettes`):`R-${p.dn}/${Math.round(p.casing*1000)} · barre coupée`):p.ref;const e=by[k]||(by[k]={ref:k,kind:p.kind,n:0,L:0,cuts:[]});e.n++;e.L+=p.L||0;if(p.kind==='tube'&&!p.std)e.cuts.push(+p.L.toFixed(2));}));return Object.values(by).sort((a,b)=>a.kind.localeCompare(b.kind)||b.n-a.n);}
