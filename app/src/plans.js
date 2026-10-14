/* plans.js — 14/10 (multi-plans), Ethan : « certains chantiers ne sont pas une continuité mais 15 antennes réparties dans la ville ; il faut pouvoir
   importer plusieurs plans, les décalquer, et avoir la vue d'ensemble quand ils sont tous calés géographiquement ».
   PLUSIEURS plans de fond (DXF ou image) dans un même tracé, chacun CALÉ (translation, rotation, échelle) dans le repère commun du tracé
   (mètres, y vers le bas). Module pur (sans DOM), partagé par le traceur (maquette/main.js, bridge.js) et l'appli (src/app.js), testé en Node.

   Un plan : {id, kind:'dxf'|'image', name, show, opacity, transform:{tx,ty,rot,k}, geo:'coords'|'manual',
              dxf   → drawing (traits en repère LOCAL du plan, mètres), bbox (local), origin {x0,y1} (Lambert), netLayers, images, report
              image → image:{src (data URL), pw, ph} (repère local = pixels de l'image)}
   transform : local → monde : [x,y] ↦ [tx + k·(cos r·x − sin r·y), ty + k·(sin r·x + cos r·y)] = SVG « translate(tx ty) rotate(rot) scale(k) »
   (rot en degrés, sens SVG : positif = horaire à l'écran ; k = mètres par unité locale — pour une image : mètres par pixel).

   Format enregistré dans le chantier (site.plans, bridge.js) — décision 14/10 :
   • site.plans[i] = métadonnées + transform de chaque plan ; les images y portent leur src, les DXF NON (pas de double stockage) ;
   • site.drawing = FUSION de tous les DXF transformés dans le repère commun (même plafond qu'avant : 200 000 points, réduit autour du réseau),
     chaque trait marqué p:<index du plan> dès qu'il y a plus d'un DXF (un seul DXF non calé → sortie identique à l'ancien format) ;
     → les anciens clients, le DOE, le recentrage (rebase.js) et l'aperçu Hydro voient tous les DXF sans rien changer ;
   • site.image = la première image avec sa transform appliquée (x, y, w, h, + rot si tournée) : ancien format, inchangé sans rotation. */
import {reduceDrawing} from './dxfimport.js';
const D2R=Math.PI/180;
export const TF0=()=>({tx:0,ty:0,rot:0,k:1});
export function tfNorm(t){t=t||{};const k=+t.k;return {tx:+t.tx||0,ty:+t.ty||0,rot:+t.rot||0,k:k>0&&isFinite(k)?k:1};}
export const tfIsIdentity=t=>{t=tfNorm(t);return !t.tx&&!t.ty&&!t.rot&&t.k===1;};
export function tfApply(t,p){t=tfNorm(t);const c=Math.cos(t.rot*D2R),s=Math.sin(t.rot*D2R);return [t.tx+t.k*(c*p[0]-s*p[1]),t.ty+t.k*(s*p[0]+c*p[1])];}
/* inverse : monde → local */
export function tfInverse(t){t=tfNorm(t);const k=1/t.k,r=-t.rot;const c=Math.cos(r*D2R),s=Math.sin(r*D2R);return {k,rot:r,tx:-k*(c*t.tx-s*t.ty),ty:-k*(s*t.tx+c*t.ty)};}
/* composition S∘T (T d'abord, puis S) */
export function tfCompose(S,T){S=tfNorm(S);T=tfNorm(T);const o=tfApply(S,[T.tx,T.ty]);return {tx:o[0],ty:o[1],rot:S.rot+T.rot,k:S.k*T.k};}
export const tfSVG=t=>{t=tfNorm(t);return `translate(${r4(t.tx)} ${r4(t.ty)}) rotate(${r4(t.rot)}) scale(${r6(t.k)})`;};
const r4=v=>+(+v).toFixed(4),r6=v=>+(+v).toFixed(6);
/* boîte [x0,y0,x1,y1] transformée (enveloppe des 4 coins) */
export function tfBBox(t,b){if(!b||!isFinite(b[0]))return null;const cs=[[b[0],b[1]],[b[2],b[1]],[b[2],b[3]],[b[0],b[3]]].map(p=>tfApply(t,p));return [Math.min(...cs.map(p=>p[0])),Math.min(...cs.map(p=>p[1])),Math.max(...cs.map(p=>p[0])),Math.max(...cs.map(p=>p[1]))];}
/* similitude plane d'après 1 ou 2 paires {from:[x,y], to:[x,y]} (repère y vers le bas, pas de retournement) :
   1 paire → translation seule ; 2 paires → échelle + rotation + translation. → {tx,ty,rot,k} tel que S(from) = to, ou null (points confondus) */
export function planSimilarity(pairs){if(!pairs||!pairs.length)return null;const P=pairs.map(p=>p.from),Q=pairs.map(p=>p.to);let k=1,th=0;
  if(pairs.length>=2){const dp=[P[1][0]-P[0][0],P[1][1]-P[0][1]],dq=[Q[1][0]-Q[0][0],Q[1][1]-Q[0][1]];const np=Math.hypot(dp[0],dp[1]),nq=Math.hypot(dq[0],dq[1]);if(np<1e-9||nq<1e-9)return null;k=nq/np;th=Math.atan2(dq[1],dq[0])-Math.atan2(dp[1],dp[0]);}
  const c=Math.cos(th),s=Math.sin(th);const tx=Q[0][0]-k*(c*P[0][0]-s*P[0][1]),ty=Q[0][1]-k*(s*P[0][0]+c*P[0][1]);let rot=th/D2R;rot=((rot+540)%360)-180;return {tx,ty,rot,k};}
/* boîte locale d'un plan : image = ses pixels ; DXF = bbox gardée à l'import (sinon calculée sur les traits) */
export function planLocalBBox(plan){if(!plan)return null;if(plan.kind==='image'){const im=plan.image||{};const w=+im.pw||0,h=+im.ph||0;return w>0&&h>0?[0,0,w,h]:null;}
  if(plan.bbox&&isFinite(plan.bbox[0])&&plan.bbox[2]>=plan.bbox[0])return plan.bbox;return drawingBox(plan.drawing);}
export function drawingBox(drawing){if(!drawing||!drawing.length)return null;let x0=1e18,y0=1e18,x1=-1e18,y1=-1e18;const add=p=>{if(p[0]<x0)x0=p[0];if(p[0]>x1)x1=p[0];if(p[1]<y0)y0=p[1];if(p[1]>y1)y1=p[1];};
  drawing.forEach(d=>{if(d.text){add([d.x,d.y]);return;}(d.loops||[d.pts]).forEach(pl=>pl&&pl.forEach(add));});return x0>x1?null:[x0,y0,x1,y1];}
export const planWorldBBox=plan=>tfBBox(plan.transform,planLocalBBox(plan));
/* union des boîtes monde des plans (filtre optionnel) */
export function plansBBox(plans,filter){let out=null;(plans||[]).forEach(p=>{if(filter&&!filter(p))return;const b=planWorldBBox(p);if(!b)return;out=out?[Math.min(out[0],b[0]),Math.min(out[1],b[1]),Math.max(out[2],b[2]),Math.max(out[3],b[3])]:b.slice();});return out;}
/* ---------- ancien format (un DXF + une image) ↔ plans ---------- */
export function imagePlanFromLegacy(im,name,opacity){if(!im||!im.src)return null;const pw=+im.pw>0?+im.pw:+im.w||1,ph=+im.ph>0?+im.ph:+im.h||1;const k=+im.w>0?+im.w/pw:1;
  return {id:'img0',kind:'image',name:name||im.name||'image',show:true,opacity:opacity===undefined?(im.opacity===undefined?.5:+im.opacity):opacity,geo:'manual',transform:{tx:+im.x||0,ty:+im.y||0,rot:+im.rot||0,k},image:{src:im.src,pw,ph}};}
export function dxfPlanFromLegacy(o){if(!o||!o.drawing||!o.drawing.length)return null;
  return {id:'dxf0',kind:'dxf',name:o.name||'plan.dxf',show:true,opacity:o.opacity===undefined?.5:+o.opacity,geo:'coords',transform:TF0(),drawing:o.drawing,bbox:o.bbox||drawingBox(o.drawing),origin:o.origin||null,netLayers:o.netLayers||[],images:o.images||[],report:o.report||null};}
/* site.image d'un plan image (ancien format, lu par l'appli et les anciens clients) */
export function legacyImageOfPlan(plan){if(!plan||plan.kind!=='image'||!plan.image||!plan.image.src)return null;const t=tfNorm(plan.transform);const im=plan.image;const r3=v=>+(+v).toFixed(3);
  const o={src:im.src,x:r3(t.tx),y:r3(t.ty),w:r3(im.pw*t.k),h:r3(im.ph*t.k),pw:im.pw,ph:im.ph,opacity:plan.opacity===undefined?.5:plan.opacity,name:plan.name||''};if(t.rot)o.rot=r4(t.rot);return o;}
/* ---------- dessin DXF transformé (local → monde) ; identité → le même tableau (rien n'est recopié) ---------- */
export function transformDrawing(drawing,t,tag){t=tfNorm(t);if(!drawing)return [];const id=tfIsIdentity(t);if(id&&tag===undefined)return drawing;const r2=v=>+(+v).toFixed(2);
  const P=p=>{if(id)return p;const q=tfApply(t,p);return [r2(q[0]),r2(q[1])];};
  return drawing.map(d=>{let o;if(d.text){o={...d};if(!id){const q=P([d.x,d.y]);o.x=q[0];o.y=q[1];o.h=+(d.h*t.k).toFixed(3);if(t.rot)o.rot=+((d.rot||0)-t.rot).toFixed(1);if(d.tl)o.tl=+(d.tl*t.k).toFixed(3);}}
    else if(d.loops){o={...d,loops:d.loops.map(lp=>lp.map(P))};o.pts=o.loops[0];}else o={...d,pts:(d.pts||[]).map(P)};
    if(tag!==undefined)o.p=tag;else if('p' in o)delete o.p;return o;});}
/* ---------- enregistrement : fusion des DXF dans le repère commun (site.drawing), réduite autour du réseau ---------- */
/* plans : tous les plans (l'index dans ce tableau sert de marque p) ; linesBox : emprise des lignes (monde) ou null ; opts : {margin:150, cap:200000}
   → {drawing, n} ; drawing identique à l'ancien format quand il n'y a qu'un DXF non calé (pas de marque p) */
export function fuseDxfPlans(plans,linesBox,opts={}){const margin=opts.margin===undefined?150:opts.margin,cap=opts.cap||200000;const dx=(plans||[]).map((p,i)=>[p,i]).filter(([p])=>p&&p.kind==='dxf'&&p.drawing&&p.drawing.length);
  if(!dx.length)return {drawing:null,n:0};const per=Math.max(8000,Math.floor(cap/dx.length));const tagged=dx.length>1;let out=[]; // plafond partagé : 15 plans → ~13 000 points chacun, jamais plus lourd qu'un seul plan d'avant
  dx.forEach(([p,i])=>{const t=tfNorm(p.transform);let d;
    if(linesBox){const lb=tfBBox(tfInverse(t),linesBox);d=reduceDrawing(p.drawing,lb,margin/t.k,per);if(!d.length)d=reduceDrawing(p.drawing,planLocalBBox(p)||[-1e9,-1e9,1e9,1e9],0,Math.min(per,20000));} /* plan sans ligne dessus (antenne pas encore tracée) : un aperçu quand même */
    else d=reduceDrawing(p.drawing,planLocalBBox(p)||[-1e9,-1e9,1e9,1e9],0,Math.min(per,20000));
    out=out.concat(transformDrawing(d,t,tagged?i:undefined));});
  return {drawing:out,n:dx.length};}
/* rechargement dans le traceur : le dessin fusionné du chantier → dessin LOCAL de chaque plan DXF (inverse de sa transform) ; [index du plan] → drawing */
export function splitFusedDrawing(drawing,plans){const out={};if(!drawing||!drawing.length)return out;const idx=(plans||[]).map((p,i)=>p&&p.kind==='dxf'?i:-1).filter(i=>i>=0);if(!idx.length)return out;
  const first=idx[0];const by={};drawing.forEach(d=>{const i=d.p===undefined?first:d.p;(by[i]=by[i]||[]).push(d);});
  Object.keys(by).forEach(i=>{const p=plans[+i];if(!p)return;const t=tfNorm(p.transform);const inv=tfInverse(t);const local=transformDrawing(by[i],inv);out[+i]=tfIsIdentity(t)?by[i].map(d=>{if('p' in d){const o={...d};delete o.p;return o;}return d;}):local.map(d=>{if('p' in d)delete d.p;return d;});});
  return out;}
/* ---------- rendu SVG d'une image (traceur et appli) ---------- */
const ESC=s=>String(s??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
export function planImageSVG(plan,op){if(!plan||plan.kind!=='image'||!plan.image||!plan.image.src)return '';const im=plan.image;const o=op===undefined?(plan.opacity===undefined?.5:plan.opacity):op;
  return `<g transform="${tfSVG(plan.transform)}" opacity="${o}"><image href="${ESC(im.src)}" x="0" y="0" width="${im.pw}" height="${im.ph}" preserveAspectRatio="none"/></g>`;}
/* ancien format site.image {src,x,y,w,h,opacity,rot?} */
export function legacyImageSVG(im){if(!im||!im.src)return '';const tag=`<image href="${ESC(im.src)}" x="${im.x||0}" y="${im.y||0}" width="${im.w}" height="${im.h}" opacity="${im.opacity===undefined?.5:im.opacity}" preserveAspectRatio="none"/>`;return im.rot?`<g transform="rotate(${+im.rot} ${im.x||0} ${im.y||0})">${tag}</g>`:tag;}
/* toutes les images d'une feuille de l'appli : sh.plans (nouveau format, chaque image avec sa transform, œil respecté) sinon sh.image (ancien format) */
export function sheetImagesSVG(sh){if(!sh)return '';if(Array.isArray(sh.plans)&&sh.plans.length)return sh.plans.filter(p=>p&&p.kind==='image'&&p.show!==false).map(p=>planImageSVG(p)).join('');return legacyImageSVG(sh.image);}
