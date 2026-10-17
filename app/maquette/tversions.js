// tversions.js — 16/10 soir (lot TB) : VERSIONS DANS LE TRACEUR (étude d'une affaire, contexte « aff: »). Branché sur maquette/t1.js (T1 → TB.xxx) et, par deux
// appels courts, sur main.js (couleur d'une pièce, clic sur ce qui a été supprimé). Ethan (16/10 soir) :
//  « des découpages disparaissent complètement entre versions, ça pourrait être juste grisé avec « supprimé en vX » ; une ligne raccourcie, même si elle fait 2 km et
//    que tu enlèves 21 m sur la ligne, elle passe en entier en changement de couleur nouvelle version alors que le reste de la ligne ne change pas » ;
//  « si on passe de v2 à v3 et qu'on touche au traceur, on peut voir l'historique des versions aussi ? Je vois que sur les quantités oui ; sur le traceur ? »
// DONNÉES (contrat K3) :
//  · l.sv = [version de chaque tronçon] (tronçon i = sommets i → i+1 ; longueur = sommets − 1 ; optionnel) : version où le tronçon a été tracé ou modifié EN DERNIER
//    (ajouté, déplacé, raccourci, pièce posée / retirée / déplacée dessus, extrémité, DN, barre, tranche…). Un tronçon seulement coupé en deux (sommet inséré sans le
//    bouger) garde sa version ; un renommage ne change aucune couleur. Ligne SANS l.sv (d'avant le 16/10) : tous ses tronçons = l.vm (couleur d'avant, inchangée
//    jusqu'à sa prochaine retouche).
//  · l.del = [{pts, v, at, dn}] : morceaux d'une ligne supprimés (raccourcie, sommet supprimé, sommet déplacé : l'ancien passage) — v = version de la suppression.
//  · site.traceur.ghosts = [{ghost:true, id, name, dn, pts, sv, v0, vm, v, at, del}] : lignes ENTIÈRES supprimées (v = version de la suppression).
//    Tronçons et lignes supprimés : dessinés en gris pointillé « supprimé en vX », JAMAIS dans state.lines → jamais construits, jamais comptés (pièces, soudures,
//    quantités, chantier, extrémités, zones, dilatation), jamais sélectionnables (un clic dessus dit seulement « supprimé en vX · 21 m »).
//  · site.traceur.vref = {cv, at, lines} : le tracé tel qu'il était au DÉBUT de la version en cours. Ce qui change PENDANT la version en cours (l.sv, l.del de cette
//    version, lignes supprimées) est CALCULÉ par différence avec lui à chaque étape : annuler / rétablir, remettre un sommet à sa place → tout suit, sans rien
//    ajouter à l'historique (contrat K1 : l.sv et l.del sont dans l'état des lignes). Version suivante (cv de l'adresse > vref.cv) : les lignes supprimées pendant la
//    version finie sont figées (ghosts) et la référence repart du tracé tel qu'il est. Rien n'est jamais supprimé en v1 (première version : pas d'avant).
//  · 🕑 Versions (légende des versions, barre du haut) : par version, ce qui a été ajouté / modifié / supprimé (lignes, ml par DN) ; un clic = ses changements en
//    évidence (le reste estompé) ; « Tout afficher » pour revenir. « Afficher ce qui a été supprimé » : state.show.suppr (d'office : oui, mémorisé sur l'appareil).
// En contexte chantier (marché) : rien de tout cela (ni calcul, ni dessin, ni données).
import {polyLen,ptAt,projOnPoly,fmt} from './traceur.js';
const EPS=0.05;   // m : un sommet retouché de moins de 5 cm, un tronçon à moins de 5 cm d'un autre = le même tracé (pas de changement de version)
const MINLEN=0.1; // m : un bout supprimé plus court n'est pas gardé
const KW=24;const wScale=k=>Math.max(1,KW/k); // même épaisseur de trait que main.js
const COLD={A:'#c8382f',R:'#2a5fb4'};const GREY='#a19e97',GREY2='#57544e'; // COLD : aller / retour de la v1 (main.js)
const R1=v=>Math.round(v*10)/10,R3=v=>Math.round(v*1000)/1000;const P3=pts=>(pts||[]).map(p=>[R3(+p[0]),R3(+p[1])]);
const nV=v=>Math.max(1,parseInt(v,10)||1);const fill=(n,v)=>Array.from({length:Math.max(0,n)},()=>v);
const v0Of=l=>Math.max(1,parseInt(l&&l.v0,10)||1),vmOf=l=>Math.max(1,parseInt(l&&l.vm,10)||v0Of(l)); // comme t1.js
const trOf=l=>l&&l.tranche==='option'?'option':'ferme',optOf=l=>Math.max(1,parseInt(l&&l.option,10)||1);
const cumOf=pts=>{const c=[0];for(let i=1;i<pts.length;i++)c.push(c[i-1]+Math.hypot(pts[i][0]-pts[i-1][0],pts[i][1]-pts[i-1][1]));return c;};
const lerp=(a,b,t)=>[a[0]+(b[0]-a[0])*t,a[1]+(b[1]-a[1])*t];const c01=t=>Math.max(0,Math.min(1,t));
const tOn=(a,b,x)=>{const vx=b[0]-a[0],vy=b[1]-a[1];const L2=vx*vx+vy*vy;return L2<1e-12?0:((x[0]-a[0])*vx+(x[1]-a[1])*vy)/L2;};
const fm=x=>fmt(x>=10?Math.round(x):R1(x));
export const validSv=l=>!!(l&&Array.isArray(l.sv)&&Array.isArray(l.pts)&&l.pts.length>=2&&l.sv.length===l.pts.length-1);
export const segVs=l=>validSv(l)?l.sv.map(nV):fill((l&&Array.isArray(l.pts)?l.pts.length:1)-1,vmOf(l)); // version de chaque tronçon (ligne d'avant : vm partout)
const dnAt=(l,m)=>{let d=+l.dn||0;(l.specials||[]).filter(s=>s&&s.type==='reducer'&&s.dn2).sort((a,b)=>a.m-b.m).forEach(s=>{if(m>s.m+1e-6)d=+s.dn2;});return d;};
/* ---------- géométrie : ce qui reste, ce qui est parti, entre deux états d'une ligne ---------- */
// partie [t0, t1] du tronçon [a, b] le long de laquelle passe le tronçon [p, q] (à EPS près : p et q à moins de EPS de la droite ab), sinon null
export function overlapT(a,b,p,q){const vx=b[0]-a[0],vy=b[1]-a[1];const L=Math.hypot(vx,vy);if(L<1e-9)return null;const ux=vx/L,uy=vy/L;
  if(Math.abs((p[0]-a[0])*uy-(p[1]-a[1])*ux)>EPS||Math.abs((q[0]-a[0])*uy-(q[1]-a[1])*ux)>EPS)return null;
  const tp=((p[0]-a[0])*ux+(p[1]-a[1])*uy)/L,tq=((q[0]-a[0])*ux+(q[1]-a[1])*uy)/L;const t0=Math.max(0,Math.min(tp,tq)),t1=Math.min(1,Math.max(tp,tq));return t1>t0+1e-9?[t0,t1]:null;}
function union(iv,gap){const s=iv.slice().sort((x,y)=>x[0]-y[0]);const out=[];s.forEach(r=>{const o=out[out.length-1];if(o&&r[0]<=o[1]+gap)o[1]=Math.max(o[1],r[1]);else out.push(r.slice());});return out;}
const full=(u,gap)=>u.length===1&&u[0][0]<=gap&&u[0][1]>=1-gap;
// A = tracé d'avant, B = tracé d'après : pour chaque tronçon de B, les tronçons de A sur lesquels il passe (host) et s'il est entièrement dessus (fullB) ;
// pour chaque tronçon de A, ses parties encore couvertes par B (uA) et s'il l'est entièrement (fullA). Des tronçons alignés se couvrent bout à bout (sommet retiré sur une droite).
export function cover(A,B){const nA=A.length-1,nB=B.length-1;const LA=[],LB=[];for(let j=0;j<nA;j++)LA.push(Math.hypot(A[j+1][0]-A[j][0],A[j+1][1]-A[j][1]));for(let i=0;i<nB;i++)LB.push(Math.hypot(B[i+1][0]-B[i][0],B[i+1][1]-B[i][1]));
  const ivA=LA.map(()=>[]),ivB=LB.map(()=>[]),host=LB.map(()=>[]);
  for(let i=0;i<nB;i++){if(!(LB[i]>1e-9))continue;for(let j=0;j<nA;j++){const o=overlapT(A[j],A[j+1],B[i],B[i+1]);if(!o)continue;ivA[j].push(o);
    const s0=c01(tOn(B[i],B[i+1],lerp(A[j],A[j+1],o[0]))),s1=c01(tOn(B[i],B[i+1],lerp(A[j],A[j+1],o[1])));ivB[i].push([Math.min(s0,s1),Math.max(s0,s1)]);host[i].push(j);}}
  const g=L=>L>1e-9?2*EPS/L:1;const uA=ivA.map((iv,j)=>union(iv,g(LA[j]))),uB=ivB.map((iv,i)=>union(iv,g(LB[i])));
  return {LA,LB,uA,uB,host,fullA:uA.map((u,j)=>!(LA[j]>1e-9)||full(u,g(LA[j]))),fullB:uB.map((u,i)=>!(LB[i]>1e-9)||full(u,g(LB[i])))};}
// parties de A qui ne sont plus couvertes par B, en polylignes continues : [{pts, len, m (PK du milieu sur A)}] (≥ MINLEN)
export function removedParts(A,C){const cum=cumOf(A);const out=[];let cur=null;
  for(let j=0;j<A.length-1;j++){const L=C.LA[j];if(!(L>1e-9)){if(cur&&cur.endJ===j-1&&cur.endT>1-1e-9)cur.endJ=j;continue;}
    const gaps=[];let t=0;C.uA[j].forEach(r=>{if(r[0]>t)gaps.push([t,r[0]]);t=Math.max(t,r[1]);});if(t<1)gaps.push([t,1]);
    gaps.forEach(([a,b])=>{if((b-a)*L<1e-6)return;const p0=lerp(A[j],A[j+1],a),p1=lerp(A[j],A[j+1],b);
      if(cur&&a<1e-9&&cur.endJ===j-1&&cur.endT>1-1e-9){cur.pts.push(p1);cur.len+=(b-a)*L;cur.endJ=j;cur.endT=b;cur.m1=cum[j]+b*L;}
      else{if(cur)out.push(cur);cur={pts:[p0,p1],len:(b-a)*L,endJ:j,endT:b,m0:cum[j]+a*L,m1:cum[j]+b*L};}});}
  if(cur)out.push(cur);return out.filter(p=>p.len>=MINLEN).map(p=>({pts:p.pts,len:p.len,m:(p.m0+p.m1)/2}));}
// retouches LOCALES d'une ligne par rapport à sa référence r (même géométrie ou pas) : intervalles de PK sur l → les tronçons qu'ils touchent changent de version
function marks(r,l,cum){const out=[];const Ll=cum[cum.length-1];const pt=(pts,m)=>{const q=ptAt(pts,Math.max(0,Math.min(polyLen(pts),+m||0)));return [q.x,q.y];};
  const at=m=>out.push([m-0.01,m+0.01]);const onL=xy=>{const pr=projOnPoly(l.pts,xy);return pr.d<=1?pr.m:null;};const same=(x,y)=>Math.hypot(x[0]-y[0],x[1]-y[1])<=EPS;
  const st=x=>x.parent?'':String(x.startType||'sousstation'),et=x=>x.pause?'libre':String(x.endType||'kit');if(st(r)!==st(l))at(0);if(et(r)!==et(l))at(Ll); // extrémités
  // pièces posées (par id) : ajoutée, retirée, déplacée ou changée → le tronçon où elle est (et celui où elle était) ; une réduction change le DN jusqu'au bout
  const strip=(x,ks)=>JSON.stringify(x,(k,v)=>ks.includes(k)?undefined:v);const SK=['m','mR','photo'];
  const spAt=(s,m)=>{if(m==null)return;if(s.type==='reducer')out.push([m-0.01,Ll+1]);else at(m);};
  const spL=s=>{if(s.atEnd){at(Ll);return;}spAt(s,+s.m);if(s.mR!=null)at(+s.mR);};
  const spR=s=>{if(s.atEnd){at(Ll);return;}spAt(s,onL(pt(r.pts,s.m)));if(s.mR!=null){const m=onL(pt(r.pts,s.mR));if(m!=null)at(m);}};
  const moved=(o,s)=>{if(s.atEnd)return false;if(!same(pt(r.pts,o.m),pt(l.pts,s.m)))return true;const a=o.mR!=null,b=s.mR!=null;return a!==b||(a&&!same(pt(r.pts,o.mR),pt(l.pts,s.mR)));};
  const byId=a=>new Map((Array.isArray(a)?a:[]).filter(x=>x&&x.id!=null).map(x=>[x.id,x]));
  const rS=byId(r.specials),lS=byId(l.specials);lS.forEach((s,id)=>{const o=rS.get(id);if(!o){spL(s);return;}if(moved(o,s)||strip(o,SK)!==strip(s,SK)){spL(s);spR(o);}});rS.forEach((o,id)=>{if(!lS.has(id))spR(o);});
  const rC=byId(r.cuts),lC=byId(l.cuts); // soudures coulissées
  lC.forEach((c,id)=>{const o=rC.get(id);if(o&&(o.cond||'')===(c.cond||'')&&same(pt(r.pts,o.m),pt(l.pts,c.m)))return;at(+c.m);if(o){const m=onL(pt(r.pts,o.m));if(m!=null)at(m);}});rC.forEach((o,id)=>{if(lC.has(id))return;const m=onL(pt(r.pts,o.m));if(m!=null)at(m);});
  const rD=byId(r.drapeaux),lD=byId(l.drapeaux);const DK=['m0','m1']; // drapeaux : le tronçon [m0, m1]
  const rng=o=>{const a=onL(pt(r.pts,o.m0)),b=onL(pt(r.pts,o.m1));if(a!=null&&b!=null)out.push([Math.min(a,b),Math.max(a,b)]);else if(a!=null)at(a);else if(b!=null)at(b);};
  lD.forEach((d,id)=>{const o=rD.get(id);if(o&&strip(o,DK)===strip(d,DK)&&same(pt(r.pts,o.m0),pt(l.pts,d.m0))&&same(pt(r.pts,o.m1),pt(l.pts,d.m1)))return;out.push([+d.m0,+d.m1]);if(o)rng(o);});rD.forEach((o,id)=>{if(!lD.has(id))rng(o);});
  return out;}
// version de chaque tronçon de l, calculée par rapport à r (la même ligne au début de la version cv ; null = ligne créée en cv)
export function deriveSv(l,r,cv){const n=(l.pts||[]).length-1;if(n<1)return [];if(!r||!Array.isArray(r.pts)||r.pts.length<2)return fill(n,cv);
  const pl=x=>x&&x.parent?x.parent.line:'';
  if(+r.dn!==+l.dn||(+r.bar||0)!==(+l.bar||0)||!!r.inv!==!!l.inv||trOf(r)!==trOf(l)||(trOf(l)==='option'&&optOf(r)!==optOf(l))||pl(r)!==pl(l))return fill(n,cv); // DN, barre, aller / retour, tranche, parente : toute la ligne
  const rs=segVs(r);const C=cover(r.pts,l.pts);
  const sv=C.host.map((hs,i)=>C.fullB[i]&&hs.length&&hs.every(j=>C.fullA[j])?Math.min(cv,Math.max(...hs.map(j=>rs[j]||1))):cv); // sur l'ancien tracé, et l'ancien tronçon entier encore là → sa version ; sinon (ajouté, déplacé, raccourci) → cv
  const cum=cumOf(l.pts);marks(r,l,cum).forEach(([a,b])=>{for(let i=0;i<n;i++)if(cum[i]<b&&cum[i+1]>a)sv[i]=cv;});return sv;}
// morceaux de r (début de la version cv) qui ne sont plus dans l → supprimés en cv (jamais en v1)
export function deriveDel(l,r,cv,at){if(!(cv>1)||!r||!Array.isArray(r.pts)||r.pts.length<2)return [];const C=cover(r.pts,l.pts);
  return removedParts(r.pts,C).map(p=>({pts:P3(p.pts),v:cv,at:at||null,dn:dnAt(r,p.m)}));}
// la ligne telle qu'elle est (référence de version, fantôme) : sans photo ni ce que le traceur recalcule
export const refLine=l=>JSON.parse(JSON.stringify({id:l.id,name:l.name,dn:l.dn,bar:l.bar,inv:!!l.inv,tranche:l.tranche,option:l.option,parent:l.parent||null,pts:P3(l.pts),sv:validSv(l)?l.sv.map(nV):undefined,v0:l.v0,vm:l.vm,startType:l.startType,endType:l.endType,pause:l.pause||undefined,
  specials:(l.specials||[]).filter(Boolean).map(s=>{const o=Object.assign({},s);delete o.photo;return o;}),cuts:l.cuts,drapeaux:l.drapeaux,del:Array.isArray(l.del)&&l.del.length?l.del:undefined}));
const okPts=pts=>Array.isArray(pts)&&pts.length>=2&&pts.every(p=>Array.isArray(p)&&isFinite(+p[0])&&isFinite(+p[1])); // un tracé lisible (sinon on ne le dessine pas)
const okGhost=g=>!!(g&&g.id!=null&&okPts(g.pts)&&+g.v>=2);
const ghostOf=(r,v,at)=>({ghost:true,id:r.id,name:r.name,dn:r.dn,pts:P3(r.pts),sv:r.sv,v0:r.v0,vm:r.vm,v,at:at||null,parent:r.parent?r.parent.line:undefined,del:Array.isArray(r.del)&&r.del.length?r.del:undefined});
function bestSeg(a){let best=-1,bi=1;for(let i=1;i<a.length;i++){const d=Math.hypot(a[i][0]-a[i-1][0],a[i][1]-a[i-1][1]);if(d>best){best=d;bi=i;}}const p=a[bi-1],q=a[bi];let ang=Math.atan2(q[1]-p[1],q[0]-p[0])*180/Math.PI;if(ang>90)ang-=180;if(ang<=-90)ang+=180;return {mx:(p[0]+q[0])/2,my:(p[1]+q[1])/2,ang};}
const TBCSS=`#net.tb-focus>*:not(.tb-hl){opacity:.13} /* 🕑 une version en évidence : le reste estompé */
#tbLeg{display:inline-flex;gap:8px;align-items:center;flex-wrap:wrap}.tb-sw{display:inline-flex;align-items:center;gap:6px;min-height:34px;cursor:pointer}.tb-sw input{width:16px;height:16px;margin:0;flex:none}
.tb-gi{display:inline-block;width:20px;height:0;border-top:3px dashed ${GREY};vertical-align:middle;flex:none}#tbLeg .btn,#tbVers{min-height:34px}#tbVers.on{background:var(--ink);color:#fff;border-color:var(--ink)}
.tb-card .tb-v{display:block;width:100%;text-align:left;border:1px solid var(--line);background:var(--page);border-radius:8px;padding:6px 8px;margin-top:6px;min-height:40px;font-size:12px;line-height:1.4;color:var(--ink);cursor:pointer}
.tb-card .tb-v.on{border-color:var(--ink);box-shadow:inset 0 0 0 1px var(--ink);background:#fff}.tb-v .tb-vh{display:flex;align-items:center;gap:6px;font-weight:700;font-size:12.5px}.tb-v .tb-vl{display:block;color:var(--ink2);font-size:11.5px;overflow-wrap:anywhere}
.tb-v .tb-vh i{display:inline-block;width:16px;height:6px;border-radius:2px;flex:none}.tb-card .t1-row .btn{min-height:34px}
@media (max-width:800px){#tbLeg .tb-open,.tb-help{display:none}.tb-card.tb-f .tb-v:not(.on),.tb-card.tb-f .tb-vl,.tb-card.tb-f .tb-sw{display:none}.tb-card.tb-f .tb-v{min-height:34px}} /* téléphone : 🕑 dans la barre du haut ; une version en évidence → le panneau se réduit à son nom et « Tout afficher » (le plan reste visible) */`;
/* ---------- le module, branché par t1.js ---------- */
export function tbInit(o){const {state,esc,api,ETUDE,L,verColor,stampKey,fl,syncFloat}=o;
  const KEY=api.SLOT('trace:maquette:tb');let S={vref:null,ghosts:[],delAt:{}};let dirty=false,refMapC=null,refMapOf=null,panel=false,focusV=null;
  if(ETUDE){try{const s=JSON.parse(localStorage.getItem(KEY)||'null');if(s){S.vref=s.vref&&Array.isArray(s.vref.lines)&&+s.vref.cv>=1?s.vref:null;S.ghosts=(Array.isArray(s.ghosts)?s.ghosts:[]).filter(okGhost);S.delAt=s.delAt&&typeof s.delAt==='object'?s.delAt:{};}}catch(e){}}
  try{const R=JSON.parse(localStorage.getItem('trace:maquette:slots')||'{}')||{};for(let i=localStorage.length-1;i>=0;i--){const k=localStorage.key(i);if(k&&k.startsWith('trace:maquette:tb:')&&!(k.slice(18) in R)&&k!==KEY)localStorage.removeItem(k);}}catch(e){} // contextes purgés par le traceur
  const persist=()=>{if(!ETUDE)return;dirty=false;try{localStorage.setItem(KEY,JSON.stringify(S));}catch(e){}};
  const refMap=()=>{if(!S.vref)return new Map();if(refMapOf!==S.vref){refMapOf=S.vref;refMapC=new Map(S.vref.lines.filter(r=>r&&r.id!=null).map(r=>[r.id,r]));}return refMapC;};
  const mkRef=cv=>({cv,at:new Date().toISOString(),lines:state.lines.filter(l=>l&&Array.isArray(l.pts)&&l.pts.length>=2).map(refLine)});
  // lignes de la référence qui n'existent plus = supprimées dans la version en cours (calculé : annuler / rétablir suivent)
  function liveGhosts(){if(!ETUDE||!S.vref||!(state.cv>1))return [];const ids=new Set(state.lines.map(l=>l.id));return S.vref.lines.filter(r=>r&&r.id!=null&&!ids.has(r.id)&&Array.isArray(r.pts)&&r.pts.length>=2).map(r=>ghostOf(r,state.cv,S.delAt[r.id]));}
  const allGhosts=()=>S.ghosts.concat(liveGhosts());
  const maxV=()=>{let m=state.cv||1;state.lines.forEach(l=>{m=Math.max(m,vmOf(l));if(validSv(l))l.sv.forEach(v=>{m=Math.max(m,nV(v));});(Array.isArray(l.del)?l.del:[]).forEach(d=>{if(d)m=Math.max(m,nV(d.v));});});S.ghosts.forEach(g=>{m=Math.max(m,nV(g.v));});return m;};
  const visV=()=>ETUDE&&state.show.versions!==false;const visible=()=>visV()&&state.show.suppr!==false&&maxV()>1;
  // la version change (adresse) : ce qui a été supprimé pendant la version finie est figé, la référence repart du tracé tel qu'il est
  function checkVersion(){if(!ETUDE)return;const cv=state.cv||1;
    if(!S.vref){S.vref=mkRef(cv);dirty=true;}
    else if(cv>S.vref.cv){if(S.vref.cv>1){const at=new Date().toISOString();const ids=new Set(state.lines.map(l=>l.id));S.vref.lines.forEach(r=>{if(!r||r.id==null||ids.has(r.id)||!Array.isArray(r.pts)||r.pts.length<2)return;if(!S.ghosts.some(g=>g.id===r.id&&+g.v===S.vref.cv))S.ghosts.push(ghostOf(r,S.vref.cv,S.delAt[r.id]||at));});}
      S.vref=mkRef(cv);S.delAt={};dirty=true;}
    const mx=Math.max(0,...S.vref.lines.concat(S.ghosts).map(x=>+String(x&&x.id||'').replace(/\D/g,'')||0));if(state.seq<=mx)state.seq=mx+1; // un n° de ligne supprimée n'est jamais redonné
    const live=new Set(liveGhosts().map(g=>g.id));Object.keys(S.delAt).forEach(id=>{if(!live.has(id)){delete S.delAt[id];dirty=true;}});live.forEach(id=>{if(!S.delAt[id]){S.delAt[id]=new Date().toISOString();dirty=true;}}); // date de suppression des lignes de la version en cours
    if(dirty)persist();}
  // étape d'historique (t1.stamp) : version de chaque tronçon et morceaux supprimés, recalculés pour les lignes créées ou retouchées dans cette étape
  function stamp(P,cv){if(!ETUDE)return false;checkVersion();const pk=new Map(P.map(l=>[l.id,l]));const ref=refMap();let ch=false;const now=new Date().toISOString();
    state.lines.forEach(l=>{if(!l||!Array.isArray(l.pts)||l.pts.length<2)return;const o=pk.get(l.id);if(o&&stampKey(o)===stampKey(l))return;const r=ref.get(l.id)||null;
      const sv=deriveSv(l,r,cv);const D=Array.isArray(l.del)?l.del:[];const old=D.filter(d=>d&&+d.v===cv);const nd=deriveDel(l,r,cv,now).map(d=>{const k=JSON.stringify(d.pts);const x=old.find(y=>JSON.stringify(y.pts)===k);if(x&&x.at)d.at=x.at;return d;});
      const del=D.filter(d=>d&&+d.v!==cv).concat(nd);
      if(JSON.stringify(sv)!==JSON.stringify(l.sv)){l.sv=sv;ch=true;}if(JSON.stringify(del)!==JSON.stringify(D)){if(del.length)l.del=del;else delete l.del;ch=true;}});
    return ch;}
  /* ---------- ce qui est grisé : morceaux de lignes (l.del) et lignes supprimées (figées + version en cours) ---------- */
  function items(){const out=[];const len=pts=>polyLen(pts);
    state.lines.forEach(l=>(Array.isArray(l.del)?l.del:[]).forEach(d=>{if(!d||!okPts(d.pts))return;out.push({kind:'del',pts:d.pts,v:nV(d.v),dn:+d.dn||+l.dn,lab:`supprimé en v${nV(d.v)}`,txt:`supprimé en v${nV(d.v)} · ${fm(len(d.pts))} m`,line:l.id});}));
    allGhosts().forEach(g=>{if(!okPts(g.pts))return;out.push({kind:'ghost',pts:g.pts,v:nV(g.v),dn:+g.dn,lab:`« ${g.name||g.id} » supprimée en v${nV(g.v)}`,txt:`« ${g.name||g.id} » supprimée en v${nV(g.v)} · ${fm(len(g.pts))} m`,line:g.id});
      (Array.isArray(g.del)?g.del:[]).forEach(d=>{if(d&&okPts(d.pts))out.push({kind:'del',pts:d.pts,v:nV(d.v),dn:+d.dn||+g.dn,lab:`supprimé en v${nV(d.v)}`,txt:`supprimé en v${nV(d.v)} · ${fm(len(d.pts))} m`,line:g.id});});});
    return out;}
  const casingOf=dn=>{try{const c=api.cat();return c?+c.casing(+dn||100)||0.2:0.2;}catch(e){return 0.2;}};
  function ghostSVG(it,k,strong){const d='M'+it.pts.map(p=>(+p[0])+' '+(+p[1])).join('L');const w=Math.max(2.4/k,casingOf(it.dn)*wScale(k)*(it.kind==='ghost'?1.6:1.3));const cls='tb-ghost'+(strong?' tb-hl':'');
    let h=`<path class="${cls}" data-v="${it.v}" d="${d}" fill="none" stroke="#fff" stroke-width="${w+3/k}" opacity="${strong?.9:.5}" stroke-linecap="round" stroke-linejoin="round" pointer-events="none"/><path class="${cls}" data-v="${it.v}" data-kind="${it.kind}" d="${d}" fill="none" stroke="${strong?GREY2:GREY}" stroke-width="${w}" stroke-dasharray="${10/k} ${7/k}" stroke-linejoin="round" pointer-events="none"/>`;
    if(strong||polyLen(it.pts)*k>=50){const p=bestSeg(it.pts);h+=`<text class="tb-glab${strong?' tb-hl':''}" transform="translate(${p.mx} ${p.my}) rotate(${p.ang})" y="${-(w/2+5/k)}" font-size="${11/k}" text-anchor="middle" fill="${strong?GREY2:'#7a776f'}" font-weight="700" font-style="italic" stroke="#fff" stroke-width="${3/k}" paint-order="stroke" font-family="system-ui,sans-serif" pointer-events="none">${esc(it.lab)}</text>`;}
    return h;}
  function under(k){if(!visible())return '';return items().map(it=>ghostSVG(it,k,false)).join('');}
  // un clic dans le vide sur un morceau grisé : « supprimé en v3 · 21 m », rien d'autre (jamais sélectionnable)
  function tap(p){if(!visible()||!Array.isArray(p))return false;const tol=Math.max(1.5,8/state.view.k);let best=null;items().forEach(it=>{const pr=projOnPoly(it.pts,p);if(pr.d<tol&&(!best||pr.d<best.d))best={d:pr.d,it};});if(!best)return false;api.flash(best.it.txt);return true;}
  /* ---------- couleur d'une pièce : version du (des) tronçon(s) sous elle ---------- */
  const PV=new WeakMap();
  function pieceV(l,p){if(!validSv(l))return vmOf(l);let v;const c=PV.get(p);if(c&&c.sv===l.sv&&c.pts===l.pts)v=c.v;
    else{const sv=l.sv;v=0;const path=Array.isArray(p.path)?p.path:[];
      if(path.length){const Lp=polyLen(path);const q1=ptAt(path,Lp*0.2),q2=ptAt(path,Lp*0.8);const i1=projOnPoly(l.pts,[q1.x,q1.y]).i,i2=projOnPoly(l.pts,[q2.x,q2.y]).i;for(let i=Math.min(i1,i2);i<=Math.max(i1,i2);i++)v=Math.max(v,nV(sv[i-1]));}
      else v=Math.max(...sv.map(nV));PV.set(p,{sv,pts:l.pts,v});}
    if(p.sid&&String(p.sid).startsWith('auto:')){const a=L(String(p.sid).slice(5));if(a)v=Math.max(v,segVs(a)[0]||vmOf(a));} // tés posés par une antenne : la version de l'antenne (pas en cache : l'antenne change sans la parente)
    return v;}
  function pcol(p,c,col,base){if(!visV())return col;const l=L(p.line);if(!l||!validSv(l))return col;const vc=verColor(pieceV(l,p));return vc?(c==='R'?vc[1]:vc[0]):(base||COLD[c]||col);}
  /* ---------- historique des versions (🕑) ---------- */
  // par version : lignes créées (cre, dont supprimées depuis : gone), tronçons encore tels que tracés (ini en v1, add ensuite) ou retouchés (mod) — ml par DN —, supprimé (del)
  // (chaque tronçon porte la version de sa DERNIÈRE retouche : un tronçon retouché en v2 puis en v3 ne compte qu'en v3)
  function stats(){const out=new Map();const V=n=>{if(!out.has(n))out.set(n,{cre:0,gone:0,ini:{dn:{}},add:{dn:{}},mod:{n:0,dn:{}},del:{n:0,lines:0,names:[],dn:{}}});return out.get(n);};const addDn=(o,dn,ml)=>{o.dn[dn]=(o.dn[dn]||0)+ml;};
    const mv=maxV();for(let v=1;v<=mv;v++)V(v);
    state.lines.forEach(l=>{if(!Array.isArray(l.pts)||l.pts.length<2)return;const vs=segVs(l);const v0=v0Of(l);const cum=cumOf(l.pts);const mod=new Set();V(v0).cre++;
      vs.forEach((v,i)=>{const dn=dnAt(l,(cum[i]+cum[i+1])/2),ml=cum[i+1]-cum[i];if(v<=v0)addDn(V(v0)[v0===1?'ini':'add'],dn,ml);else{addDn(V(v).mod,dn,ml);mod.add(v);}});
      const vm=vmOf(l);if(vm>v0)mod.add(vm); // retouchée sans changer de tronçon (nom…)
      mod.forEach(v=>{V(v).mod.n++;});
      (Array.isArray(l.del)?l.del:[]).forEach(d=>{if(!d||!okPts(d.pts))return;const o=V(nV(d.v)).del;o.n++;addDn(o,+d.dn||+l.dn,polyLen(d.pts));});});
    allGhosts().forEach(g=>{if(!okPts(g.pts))return;const c=V(v0Of(g));c.cre++;c.gone++;const v0=v0Of(g),gv=nV(g.v);const gc=cumOf(g.pts);const mod=new Set();segVs(g).forEach((v,i)=>{if(v>v0&&v<gv){addDn(V(v).mod,+g.dn,gc[i+1]-gc[i]);mod.add(v);}});if(vmOf(g)>v0&&vmOf(g)<gv)mod.add(vmOf(g));mod.forEach(v=>{V(v).mod.n++;}); // retouchée avant d'être supprimée
      const o=V(nV(g.v)).del;o.lines++;o.names.push(g.name||g.id);addDn(o,+g.dn,polyLen(g.pts));(Array.isArray(g.del)?g.del:[]).forEach(d=>{if(!d||!okPts(d.pts))return;const o2=V(nV(d.v)).del;o2.n++;addDn(o2,+d.dn||+g.dn,polyLen(d.pts));});});
    return out;}
  const tot=o=>Object.values(o.dn).reduce((s,x)=>s+x,0);const dnTxt=o=>Object.keys(o.dn).map(Number).sort((a,b)=>b-a).filter(dn=>o.dn[dn]>=0.05).map(dn=>`DN${dn} ${fm(o.dn[dn])} m`).join(' · ');
  const pl=(n,s,p)=>n+' '+(n>1?p||s+'s':s);
  function verRow(v,o){const c=verColor(v);const sw=c?c[0]:'linear-gradient(90deg,#c8382f 50%,#2a5fb4 50%)';const ls=[];
    const gone=o.gone?` (dont ${o.gone} supprimée${o.gone>1?'s':''} depuis)`:'';
    if(v===1){if(o.cre)ls.push(`tracé de départ : <b>${pl(o.cre,'ligne')}</b>${gone}${tot(o.ini)>=0.05?` — encore tel quel : ${fm(tot(o.ini))} m <span>(${dnTxt(o.ini)})</span>`:''}`);}
    else if(o.cre)ls.push(`＋ ajouté : <b>${pl(o.cre,'ligne')}</b>${gone}${tot(o.add)>=0.05?` · ${fm(tot(o.add))} m <span>(${dnTxt(o.add)})</span>`:''}`);
    if(o.mod.n)ls.push(`✎ modifié : <b>${pl(o.mod.n,'ligne')}</b>${tot(o.mod)>=0.05?` · ${fm(tot(o.mod))} m de tronçons <span>(${dnTxt(o.mod)})</span>`:' (nom…)'}`);
    if(o.del.lines||o.del.n)ls.push(`− supprimé : <b>${[o.del.lines?pl(o.del.lines,'ligne'):'',o.del.n?pl(o.del.n,'tronçon'):''].filter(Boolean).join(' + ')}</b> · ${fm(tot(o.del))} m <span>(${dnTxt(o.del)})</span>${o.del.names.length?` — ${o.del.names.map(n=>'« '+esc(n)+' »').join(', ')}`:''}`);
    if(!ls.length)ls.push(v===1?'rien de tracé':'aucun changement sur le tracé');
    return `<button type="button" class="tb-v${focusV===v?' on':''}" data-act="tb-focus" data-v="${v}" title="${focusV===v?'revenir à tout le tracé':'mettre en évidence les changements de la v'+v+' (le reste estompé)'}"><span class="tb-vh"><i style="background:${sw}"></i>v${v}${v===state.cv?' (en cours)':''}${focusV===v?' — en évidence':''}</span>${ls.map(x=>`<span class="tb-vl">${x}</span>`).join('')}</button>`;}
  function cardHTML(){if(!ETUDE||!panel)return '';const st=stats();const vs=[...st.keys()].sort((a,b)=>a-b);
    return `<div class="t1-card tb-card${focusV!=null?' tb-f':''}"><h4>🕑 Versions du tracé<span class="t1-sp"></span><button class="btn sm" data-act="tb-close" title="fermer">✕</button></h4>
      <div class="muted tb-help" style="font-size:11.5px">Version en cours : <b>v${state.cv}</b> (celle de l'affaire). Chaque tronçon a la couleur de la version où il a été tracé ou retouché en dernier ; ce qui a été supprimé reste grisé, jamais compté. Touche une version : ses changements en évidence.</div>
      ${vs.map(v=>verRow(v,st.get(v))).join('')}
      <div class="t1-row"><button class="btn${focusV==null?' on':''}" data-act="tb-all" title="tout le tracé, sans rien estomper">Tout afficher</button><label class="tb-sw"><input type="checkbox" data-tb="suppr" ${state.show.suppr!==false?'checked':''}><span class="tb-gi"></span>Afficher ce qui a été supprimé</label></div></div>`;}
  // emprise des changements d'une version (pour les cadrer)
  function boxOf(v){let x0=1e18,y0=1e18,x1=-1e18,y1=-1e18;const add=p=>{x0=Math.min(x0,p[0]);y0=Math.min(y0,p[1]);x1=Math.max(x1,p[0]);y1=Math.max(y1,p[1]);};
    state.lines.forEach(l=>{if(!Array.isArray(l.pts))return;segVs(l).forEach((x,i)=>{if(x===v){add(l.pts[i]);add(l.pts[i+1]);}});});if(state.show.suppr!==false)items().forEach(it=>{if(it.v===v)it.pts.forEach(add);});return x0<=x1?[x0,y0,x1,y1]:null;}
  // cadrage dans la partie VISIBLE du plan : ni sous le panneau (à gauche au bureau, en bas au téléphone), ni sous la légende, ni sous les boutons de zoom
  function frame(b){const [x0,y0,x1,y1]=b;try{const R=document.getElementById('svg').getBoundingClientRect();const W=R.width,H=R.height;if(W>0&&H>0){let uL=12,uR=W-12,uT=48,uB=H-12;
      const F=fl.getBoundingClientRect();if(fl.querySelector('.tb-card')&&F.width>0&&F.height>0){if(F.left-R.left<W*0.3&&F.width<W*0.6)uL=Math.max(uL,F.right-R.left+12);else uB=Math.min(uB,F.top-R.top-12);}
      const lg=document.querySelector('.legend');if(lg&&lg.offsetParent){const g=lg.getBoundingClientRect();if(g.top-R.top>H*0.4)uB=Math.min(uB,g.top-R.top-8);}
      const zc=document.querySelector('.zoomctl');if(zc&&zc.offsetParent){const z=zc.getBoundingClientRect();if(z.left-R.left>W*0.5)uR=Math.min(uR,z.left-R.left-8);}
      if(uR-uL<W*0.3){uL=12;uR=W-12;}if(uB-uT<H*0.2){uT=12;uB=H-12;}
      const w=Math.max(x1-x0,2),h=Math.max(y1-y0,2);const k=Math.min((uR-uL)/w,(uB-uT)/h);const sx=((uR-uL)-w*k)/2,sy=((uB-uT)-h*k)/2;
      api.fitBox(x0-(uL+sx)/k,y0-(uT+sy)/k,x1+(W-uR+sx)/k,y1+(H-uB+sy)/k);return;}}catch(e){}
    api.fitBox(x0,y0,x1,y1);}
  function setFocus(v,fr){const nv=v==null?null:+v;focusV=nv===focusV?null:nv;syncFloat(true);if(focusV!=null&&fr!==false){const b=boxOf(focusV);if(b)frame(b);else api.flash(`v${focusV} : rien de changé sur le tracé`);}api.render();syncFloat(true);return focusV;}
  function openPanel(on){panel=on===undefined?!panel:!!on;if(!panel&&focusV!=null){focusV=null;api.render();}syncFloat(true);syncUI();return panel;}
  function setSuppr(on){state.show.suppr=!!on;api.saveShow();api.render();syncFloat(true);}
  /* ---------- dessus du réseau : la version mise en évidence ; légende et bouton ---------- */
  function over(k){let h='';const net=document.getElementById('net');const on=focusV!=null&&visV();if(net)net.classList.toggle('tb-focus',on);
    if(on){const ws=wScale(k);Object.values(state.built).forEach(B=>{['A','R'].forEach(c=>{const cd=B&&B[c];if(!cd)return;const l=L(cd.lineId);if(!l)return;cd.pieces.forEach(p=>{if(p.kind==='teeBranch'||!Array.isArray(p.path)||p.path.length<2||pieceV(l,p)!==focusV)return;const vc=verColor(focusV);
      h+=`<path class="tb-hl" d="M${p.path.map(q=>(+q[0]).toFixed(3)+' '+(+q[1]).toFixed(3)).join('L')}" fill="none" stroke="${vc?(c==='R'?vc[1]:vc[0]):COLD[c]}" stroke-width="${(p.casing||0.2)*ws}" stroke-linejoin="round" opacity=".95" pointer-events="none"/>`;});});});
      if(state.show.suppr!==false)items().forEach(it=>{if(it.v===focusV)h+=ghostSVG(it,k,true);});}
    syncUI();return h;}
  const leg=document.querySelector('.legend');const sp=document.createElement('span');sp.id='tbLeg';sp.style.display='none';
  if(leg){const v=document.getElementById('t1VerLeg');if(v&&v.parentNode===leg)leg.insertBefore(sp,v.nextSibling);else leg.appendChild(sp);}
  const bar=document.getElementById('t1Bar');const bb=document.createElement('button');bb.className='btn';bb.id='tbVers';bb.type='button';bb.textContent='🕑 Versions';bb.title='historique des versions du tracé : ajouté, modifié, supprimé — une version touchée : ses changements en évidence';bb.style.display='none';if(bar&&ETUDE)bar.appendChild(bb);
  const stEl=document.createElement('style');stEl.id='css-lot-tb';stEl.textContent=TBCSS;document.head.appendChild(stEl);
  function syncUI(){const on=visV()&&maxV()>1;const h=on?`<label class="tb-sw" title="tronçons et lignes supprimés depuis la v1 : en gris pointillé, jamais comptés (ni pièces, ni soudures, ni quantités)"><input type="checkbox" data-tb="suppr" ${state.show.suppr!==false?'checked':''}><span class="tb-gi"></span>Afficher ce qui a été supprimé</label><button type="button" class="btn sm tb-open${panel?' on':''}" data-act="tb-open" title="historique des versions du tracé">🕑 Versions</button>`:'';
    if(sp.dataset.h!==h){sp.dataset.h=h;sp.innerHTML=h;}sp.style.display=h?'':'none';bb.style.display=on?'':'none';bb.classList.toggle('on',panel);if(!on&&panel){panel=false;focusV=null;syncFloat(true);}}
  bb.onclick=()=>openPanel();
  sp.addEventListener('click',e=>{const b=e.target.closest('[data-act="tb-open"]');if(b)openPanel();});
  const onChange=e=>{const t=e.target;if(t&&t.dataset&&t.dataset.tb==='suppr')setSuppr(t.checked);};sp.addEventListener('change',onChange);
  if(fl){fl.addEventListener('change',onChange);fl.addEventListener('click',e=>{const el=e.target.closest('[data-act]');if(!el||!fl.contains(el))return;const a=el.dataset.act;
    if(a==='tb-close')openPanel(false);else if(a==='tb-all'){focusV=null;api.render();syncFloat(true);}else if(a==='tb-focus')setFocus(+el.dataset.v);});}
  document.addEventListener('keydown',e=>{if(e.key==='Escape'&&focusV!=null&&!/INPUT|TEXTAREA|SELECT/.test(e.target.tagName)){focusV=null;api.render();syncFloat(true);}});
  // fiche d'une ligne (étude) : longueur par version de ses tronçons, ce qui en a été supprimé
  function lineInfo(l){if(!ETUDE||!l||!Array.isArray(l.pts))return '';const vs=segVs(l);const cum=cumOf(l.pts);const by={};vs.forEach((v,i)=>{by[v]=(by[v]||0)+cum[i+1]-cum[i];});const ks=Object.keys(by).map(Number).sort((a,b)=>a-b);const dl=(Array.isArray(l.del)?l.del:[]).filter(d=>d&&okPts(d.pts));
    if(ks.length<2&&!dl.length)return '';return `<div class="kv" style="margin-top:4px"><span>tronçons : ${ks.map(v=>`v${v} ${fm(by[v])} m`).join(' · ')}</span>${dl.length?`<span style="color:#6f6c66">supprimé (grisé, non compté) : ${dl.map(d=>`v${nV(d.v)} ${fm(polyLen(d.pts))} m`).join(' · ')}</span>`:''}</div>`;}
  return {stamp,checkVersion,under,over,pcol,tap,cardHTML,lineInfo,
    afterRebuild(){checkVersion();},
    siteLoaded(site){if(!ETUDE)return;const T=site&&site.traceur||{};const vr=T.vref&&Array.isArray(T.vref.lines)&&+T.vref.cv>=1?T.vref:null;S={vref:vr?{cv:+vr.cv,at:vr.at||null,lines:vr.lines}:null,ghosts:(Array.isArray(T.ghosts)?T.ghosts:[]).filter(g=>okGhost(g)&&(!vr||+g.v<+vr.cv)),delAt:{}};refMapOf=null;dirty=true;}, // la version en cours est recalculée
    bridgeOpts(){if(!ETUDE)return {};checkVersion();return {ghosts:allGhosts().map(g=>Object.assign({},g,{pts:P3(g.pts)})),vref:S.vref};},
    // pour les tests et l'automatisation
    stats,ghosts:allGhosts,items,vref:()=>S.vref,focus:setFocus,focused:()=>focusV,open:openPanel,isOpen:()=>panel,visible,setSuppr,segVs,pieceV};}
