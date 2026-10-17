// mutufus.js — LOT MU (16/10 soir, option A validée par Ethan) : CHANTIER MUTUALISÉ — fonctions PURES (sans DOM, testées dans Node), partagées par l'appli
// (src/mutu.js) et le traceur (maquette/bridge.js, maquette/mutucal.js). Ethan : « en phase chantier un chantier gagné soit mutualisé avec un ancien et qu'il partage
// le même accueil, le même plan etc. » — au gain du 2026 : « Ajouter au chantier <ville> 2025 » : les lignes de l'étude 2026 rejoignent le chantier 2025, chaque ligne
// garde son affaire.
// DONNÉES (toutes optionnelles : un chantier à une seule affaire n'en a aucune et se comporte exactement comme avant) :
//  · ligne (site.lines[] ET site.traceur.lines[]) : l.aff = n° de l'affaire rattachée ; SANS aff = affaire d'origine du chantier ;
//  · site.affaires = [n° d'origine, n° rattaché…] (la 1re = l'origine, '' si le chantier n'était lié à aucune affaire) ;
//  · site.marchesAff = {n°: tracé marché de l'affaire rattachée} — site.marche / site.ts (origine) intacts ;
//  · site.mutu = {nom (nom affiché aux gars), hist:[{aff, at, by, etude, T, prev, added, prolong, undoneAt?}]} — prev = instantané de ce que le rattachement change
//    (nom, cadrage, rapport, format des plans), added = ce qu'il ajoute (lignes, plans, zones, soudures, TS) → « ↩ Annuler le rattachement » ;
//  · plan de fond ajouté : p.mutuAff = n° ; zone ajoutée : z.aff = n°.
import {tfNorm,tfApply,tfInverse,tfCompose,tfBBox,transformDrawing,splitFusedDrawing,drawingBox,imagePlanFromLegacy,planSimilarity,TF0} from './plans.js';
import {reduceDrawing} from './dxfimport.js';
import {marcheSnapshot,axisOf,sumCounts} from './marche.js';
import {geoOfSite,planToLonLat,lonLatToPlan} from './geo.js';
const cl=x=>x==null?x:JSON.parse(JSON.stringify(x));
const r3=v=>+(+v||0).toFixed(3);
const wnum=id=>{const m=parseInt(String(id||'').replace(/\D/g,''),10);return isFinite(m)?m:0;};
export const MU_COLORS=['#9a958a','#7d4fc4','#c2185b','#00897b','#b26a00']; /* couleur discrète par affaire (la 1re = l'origine) : légende, puces, liseré sous les lignes */
const EP=new Set(['pec','insertion','attente','chaufferie','attente_chaufferie','sousstation']); /* extrémités « raccordement » (pas de pièce posée) : passables en « sur attente existante » sans recalcul */
export const isMutu=s=>!!(s&&Array.isArray(s.affaires)&&s.affaires.length>1);
export const origOf=s=>isMutu(s)?String(s.affaires[0]||''):'';
/* affaire d'une ligne (n°) ; '' = origine */
export const affOfLine=l=>l&&l.aff?String(l.aff):'';
/* nom affiché aux gars : le nom du chantier d'origine sans l'année (« Villefictive 2025 » → « Villefictive ») */
export function commonName(name){const s=String(name||'');const t=s.replace(/\s*[-–—·,(/]?\s*\b(19|20)\d{2}\b\s*\)?/g,' ').replace(/\s+/g,' ').replace(/[\s\-–—·,/]+$/,'').trim();return t||s;}
/* libellé court d'une affaire pour les puces : l'année (nom de l'affaire, sinon du chantier d'origine, sinon date d'ouverture) — le n° si deux affaires ont la même année */
export function affLabels(nums,infos){const yr=x=>{const m=/\b((?:19|20)\d{2})\b/.exec(String(x||''));return m?m[1]:'';};
  const L=nums.map((n,i)=>{const a=(infos&&infos[i])||{};return yr(a.nom)||yr(a.siteName)||yr(a.dateOuverture)||'';});
  return nums.map((n,i)=>{const y=L[i];if(y&&L.filter(x=>x===y).length===1)return y;return String(n||'')||'origine';});}
/* boîte [x0,y0,x1,y1] des axes de lignes (format enregistré : axis, ou pts) */
export function linesBox(lines){let x0=1e18,y0=1e18,x1=-1e18,y1=-1e18;(lines||[]).forEach(l=>{axisOf(l||{}).forEach(p=>{if(!isFinite(p[0])||!isFinite(p[1]))return;x0=Math.min(x0,p[0]);y0=Math.min(y0,p[1]);x1=Math.max(x1,p[0]);y1=Math.max(y1,p[1]);});});return x0<=x1?[x0,y0,x1,y1]:null;}
const ptsCount=d=>(d||[]).reduce((s,e)=>s+(e&&e.pts?e.pts.length:(e&&e.loops?e.loops.reduce((x,q)=>x+q.length,0):e&&e.text?4:0)),0);
/* similitude → déplacement RIGIDE (rotation + translation, échelle 1) : les deux tracés sont en mètres, l'étude garde ses longueurs (et donc ses quantités).
   c = point de l'étude qui garde exactement sa position calée (centre de ses lignes) */
export function rigid(S,c){S=tfNorm(S);c=c||[0,0];const q=tfApply(S,c);const rc=tfApply({tx:0,ty:0,rot:S.rot,k:1},c);return {tx:+(q[0]-rc[0]).toFixed(4),ty:+(q[1]-rc[1]).toFixed(4),rot:+(+S.rot).toFixed(6),k:1};}
/* conversion directe étude → chantier quand les DEUX tracés sont géoréférencés (site.geo, ou origine Lambert du DXF) : {T, k, how} ou null.
   k = échelle trouvée entre les deux géoréférencements (≈ 1) : au-delà de 3 % d'écart ils sont incohérents → calage à la main */
export function tfFromGeo(E,C){let gE=null,gC=null;try{gE=geoOfSite(E);gC=geoOfSite(C);}catch(e){return null;}if(!gE||!gC)return null;
  const b=linesBox(E&&E.lines)||linesBox(E&&E.traceur&&E.traceur.lines);if(!b)return null;let P1=[b[0],b[1]],P2=[b[2],b[3]];if(Math.hypot(P2[0]-P1[0],P2[1]-P1[1])<10)P2=[P1[0]+100,P1[1]];
  const Q=p=>{const ll=planToLonLat(gE,p);return lonLatToPlan(gC,ll[0],ll[1]);};let S=null;try{S=planSimilarity([{from:P1,to:Q(P1)},{from:P2,to:Q(P2)}]);}catch(e){S=null;}
  if(!S||!isFinite(S.tx)||!isFinite(S.ty))return null;const c=[(b[0]+b[2])/2,(b[1]+b[3])/2];
  return {T:rigid(S,c),k:+S.k.toFixed(5),how:(gE.auto&&gC.auto)?'l\'origine Lambert des plans DXF':'le géoréférencement des deux tracés',ok:Math.abs(S.k-1)<=0.03};}
/* lignes d'un chantier enregistré qui appartiennent à une affaire (n° ; '' ou l'origine = lignes sans aff) */
export function lineIdsOf(site,aff){const o=origOf(site);const want=String(aff||'');return new Set((site&&site.lines||[]).filter(l=>l&&(affOfLine(l)===want||(!affOfLine(l)&&(want===''||want===o)))).map(l=>String(l.id)));}
/* plans d'un tracé enregistré, avec le dessin LOCAL de chaque DXF (format multi-plans, ou ancien format DXF + image) */
function plansWithDrawing(S){const out=[];if(Array.isArray(S.plans)&&S.plans.length){const parts=splitFusedDrawing(S.drawing,S.plans);S.plans.forEach((p,i)=>{if(!p||!p.kind)return;const o=cl(p);if(p.kind==='dxf'){o.drawing=parts[i]||[];if(!o.drawing.length)return;}else if(!(p.image&&p.image.src))return;out.push(o);});return out;}
  if(Array.isArray(S.drawing)&&S.drawing.length){const tr=S.traceur||{};out.push({id:'dxf0',kind:'dxf',name:tr.bgName||S.name||'plan.dxf',show:true,opacity:tr.bgOpacity===undefined?.5:tr.bgOpacity,geo:'coords',transform:TF0(),drawing:S.drawing,bbox:drawingBox(S.drawing),origin:tr.bgOrigin||null,netLayers:tr.bgLayers||[]});}
  if(S.image&&S.image.src){const p=imagePlanFromLegacy(S.image,S.image.name||S.name);if(p)out.push(p);}return out;}
/* ancien format (un DXF + une image) → métadonnées de plans (sans dessin : il reste dans site.drawing, non marqué = 1er DXF) */
function legacyPlans(S){const out=[];const tr=S.traceur||{};if(Array.isArray(S.drawing)&&S.drawing.length)out.push({id:'dxf0',kind:'dxf',name:tr.bgName||S.name||'plan.dxf',show:true,opacity:tr.bgOpacity===undefined?.5:tr.bgOpacity,transform:TF0(),geo:'coords',bbox:drawingBox(S.drawing),origin:tr.bgOrigin||null,netLayers:tr.bgLayers||[],n:S.drawing.length});
  if(S.image&&S.image.src){const p=imagePlanFromLegacy(S.image,S.image.name||S.name);if(p)out.push(p);}return out;}
/* cadrage et rapport, comme le pont du traceur (emprise des lignes ∪ dessin) */
function frame(S){const lb=linesBox(S.lines);if(lb){S.nbox=lb.map(r3);let [x0,y0,x1,y1]=lb;const db=Array.isArray(S.drawing)&&S.drawing.length?drawingBox(S.drawing):null;if(db){x0=Math.min(x0,db[0]);y0=Math.min(y0,db[1]);x1=Math.max(x1,db[2]);y1=Math.max(y1,db[3]);}S.bbox=[x0,y0,x1,y1];S.w=Math.ceil(x1+20);S.h=Math.ceil(y1+20);}
  const nW=(S.lines||[]).reduce((s,L)=>s+['A','R'].reduce((x,c)=>{const cd=L&&L.cond&&L.cond[c];return x+((cd&&(cd.welds||cd.joints))||[]).length;},0),0);
  S.report=Object.assign({},S.report||{},{lines:(S.lines||[]).length,welds:nW,length:r3((S.lines||[]).reduce((s,L)=>s+(+((L&&L.cond&&L.cond.A&&L.cond.A.length)||(L&&L.length)||0)),0))});}
const near=(a,b,tol)=>!!(a&&b&&Math.hypot(a[0]-b[0],a[1]-b[1])<=tol);
const END_TXT={attente:'raccordement sur existant : sur attente existante'};
/* ═════════ FUSION : l'étude E (affaire o.aff) rejoint le chantier C, déplacée par T (rigide) ═════════
   o = {aff, orig, by, at, nom, weldMax (plus grand n° de soudure connu du serveur), tol (m, raccord des prolongements)} → {site, info} — C et E ne sont pas modifiés */
export function mergeSites(C,E,T,o){o=o||{};const aff=String(o.aff||'');if(!aff)throw new Error('affaire manquante');if(!C||!Array.isArray(C.lines))throw new Error('chantier sans lignes');if(!E||!Array.isArray(E.lines)||!E.lines.length)throw new Error('étude sans lignes');
  T=tfNorm(T||TF0());const at=o.at||new Date().toISOString();const tol=o.tol||3;const P=p=>{const q=tfApply(T,[+p[0],+p[1]]);return [r3(q[0]),r3(q[1])];};
  const {drawing:D0,...rest}=C;const S=cl(rest);S.drawing=Array.isArray(D0)?D0.slice():(D0===undefined?undefined:D0);
  const prev={name:S.name,sheetType:S.sheetType,w:S.w,h:S.h,bbox:S.bbox?S.bbox.slice():S.bbox,nbox:S.nbox?S.nbox.slice():S.nbox,report:cl(S.report),hadPlans:Array.isArray(C.plans)&&C.plans.length>0,hadZones:!!(S.traceur&&Array.isArray(S.traceur.zones)),dkey:D0===undefined?'u':D0===null?'n':'a',nDrawing:Array.isArray(D0)?D0.length:0,lineIds:(S.lines||[]).map(l=>String(l&&l.id)),savedAt:S.traceur&&S.traceur.savedAt||null,hadTs:!!(S.ts&&typeof S.ts==='object'),tsSeq:S.ts&&S.ts.seq,tsIds:((S.ts&&Array.isArray(S.ts.items))?S.ts.items:[]).map(it=>it&&it.id)};
  /* 1 · nouveaux identifiants de ligne (L<n> après les lignes du chantier) */
  const used=new Set([...(S.lines||[]).map(l=>String(l.id)),...((S.traceur&&S.traceur.lines)||[]).map(l=>String(l.id))]);let n=0;used.forEach(id=>{n=Math.max(n,wnum(id));});
  const idMap={};[...new Set([...E.lines.filter(l=>l&&!l.ghost).map(l=>String(l.id)),...((E.traceur&&E.traceur.lines)||[]).filter(l=>l&&!l.ghost).map(l=>String(l.id))])].forEach(id=>{let k;do{k='L'+(++n);}while(used.has(k));used.add(k);idMap[id]=k;});
  /* 2 · nouveaux n° de soudure (après tout n° connu : plan, soudures ajoutées sur place, soudures perdues, serveur) */
  let wmax=+o.weldMax||0;(S.lines||[]).forEach(L=>['A','R'].forEach(c=>{const cd=L&&L.cond&&L.cond[c];((cd&&(cd.welds||cd.joints))||[]).forEach(w=>{wmax=Math.max(wmax,wnum(w.weldId));});}));
  (Array.isArray(S.extraWelds)?S.extraWelds:[]).forEach(x=>{wmax=Math.max(wmax,wnum(x&&x.weldId));});((S.report&&S.report.lost)||[]).forEach(id=>{wmax=Math.max(wmax,wnum(id));});
  const wmap={};E.lines.forEach(L=>['A','R'].forEach(c=>{const cd=L&&L.cond&&L.cond[c];((cd&&cd.welds)||[]).forEach(w=>{if(w.weldId&&!wmap[w.weldId])wmap[w.weldId]='S-'+String(++wmax).padStart(4,'0');});}));
  /* 3 · plans de fond de l'étude : calés par T (composée avec leur propre calage), ajoutés au chantier ; les DXF rejoignent le dessin fusionné (marqués p:<index>) */
  const planMap={};const addedPlans=[];const eP=plansWithDrawing(E);
  if(eP.length){if(!(Array.isArray(S.plans)&&S.plans.length))S.plans=legacyPlans(S);const pid=new Set(S.plans.map(p=>p.id));const tag=aff.replace(/[^\w]/g,'');
    const newLB=linesBox(E.lines.map(l=>({axis:axisOf(l).map(P)})));let room=Math.max(8000,200000-ptsCount(S.drawing));const nDx=eP.filter(p=>p.kind==='dxf').length||1;
    eP.forEach(p=>{let id='mu'+tag+'_'+p.id;while(pid.has(id))id+='b';pid.add(id);planMap[p.id]=id;const t=tfCompose(T,p.transform);
      const meta={...p,id,transform:t,mutuAff:aff,geo:'manual',name:(p.name||p.id)+' · '+aff};delete meta.drawing;delete meta.images;delete meta.report;delete meta._bb;delete meta._tb;delete meta._far;delete meta._lastKey;
      if(p.kind==='dxf'){const lb=newLB?tfBBox(tfInverse(t),newLB):null;let d=lb?reduceDrawing(p.drawing,lb,150/t.k,Math.floor(room/nDx)):p.drawing.slice(0,Math.floor(room/nDx));if(!d.length)d=p.drawing.slice(0,Math.min(20000,p.drawing.length));
        S.plans.push(meta);const idx=S.plans.length-1;meta.n=d.length;const td=transformDrawing(d,t,idx);S.drawing=(Array.isArray(S.drawing)?S.drawing:[]).concat(td);}
      else S.plans.push(meta);addedPlans.push(id);});
    if(Array.isArray(S.drawing)&&S.drawing.length)S.sheetType='vector';}
  /* 4 · lignes construites (pièces, soudures) : déplacées par T, renommées, affaire posée */
  const newLines=E.lines.filter(L=>L&&!L.ghost).map(L0=>{const L=cl(L0);L.id=idMap[String(L0.id)]||L.id;if(L.parent!=null&&idMap[String(L.parent)])L.parent=idMap[String(L.parent)];L.aff=aff;if(Array.isArray(L.axis))L.axis=L.axis.map(P);if(Array.isArray(L.pts))L.pts=L.pts.map(P);
    ['A','R'].forEach(c=>{const cd=L.cond&&L.cond[c];if(!cd)return;(cd.els||[]).forEach(e=>{if(Array.isArray(e.axis))e.axis=e.axis.map(pl=>Array.isArray(pl)?pl.map(P):pl);['from','to','apex','center'].forEach(k=>{if(Array.isArray(e[k])&&e[k].length===2&&isFinite(e[k][0]))e[k]=P(e[k]);});if(Array.isArray(e.branch))e.branch=e.branch.map(P);});
      (cd.welds||[]).forEach(w=>{if(isFinite(+w.x)&&isFinite(+w.y)&&w.x!==null){const q=P([w.x,w.y]);w.x=q[0];w.y=q[1];}if(w.weldId)w.weldId=wmap[w.weldId]||w.weldId;if(w.sleeveWith)w.sleeveWith=wmap[w.sleeveWith]||w.sleeveWith;});});return L;});
  /* 5 · lignes du traceur (sommets) : mêmes déplacement, noms, affaire ; tés automatiques recalculés à la prochaine ouverture */
  const rawNew=((E.traceur&&E.traceur.lines)||[]).filter(l=>l&&!l.ghost).map(l0=>{const l=cl(l0);l.id=idMap[String(l0.id)]||l.id;if(l.parent&&l.parent.line!=null&&idMap[String(l.parent.line)])l.parent=Object.assign({},l.parent,{line:idMap[String(l.parent.line)]});l.aff=aff;
    if(Array.isArray(l.pts))l.pts=l.pts.map(P);if(Array.isArray(l.del))l.del=l.del.map(d=>Object.assign({},d,Array.isArray(d.pts)?{pts:d.pts.map(P)}:{}));delete l.autoSpecials;
    if(Array.isArray(l.plans))l.plans=l.plans.map(x=>planMap[x]||x);if(l.plan&&planMap[l.plan])l.plan=planMap[l.plan];return l;});
  /* 6 · prolongements : une ligne de l'étude qui part (ou finit) au bout d'une ligne du chantier s'y raccorde — extrémité « sur attente existante » */
  const prolong=[],warnings=[];const base=(S.lines||[]).filter(l=>l&&!l.aff).map(l=>({l,ax:axisOf(l)})).filter(x=>x.ax.length>=2);
  newLines.forEach(L=>{if(L.parent)return;const ax=axisOf(L);if(ax.length<2)return;[['start',ax[0]],['end',ax[ax.length-1]]].some(([at,q])=>{const hit=base.find(x=>near(q,x.ax[x.ax.length-1],tol)||near(q,x.ax[0],tol));if(!hit)return false;
    const key=at==='start'?'startType':'endType';const cur=String(L[key]||(at==='start'?'sousstation':'kit'));const d=+Math.min(Math.hypot(q[0]-hit.ax[hit.ax.length-1][0],q[1]-hit.ax[hit.ax.length-1][1]),Math.hypot(q[0]-hit.ax[0][0],q[1]-hit.ax[0][1])).toFixed(2);
    const rec={line:L.id,name:L.name||L.id,with:String(hit.l.id),withName:hit.l.name||hit.l.id,at,d,from:cur};
    if(cur==='attente'){prolong.push(rec);return true;}
    if(EP.has(cur)){L[key]='attente';if(L.ends&&L.ends[at])L.ends[at]=Object.assign({},L.ends[at],{type:'attente'});['A','R'].forEach(c=>{const els=(L.cond&&L.cond[c]&&L.cond[c].els)||[];const e=at==='start'?els[0]:els[els.length-1];if(e&&e.kind==='endpoint'){e.sub='attente';e.ref=END_TXT.attente+' (prolongement de '+(hit.l.name||hit.l.id)+')';}});
      const r=rawNew.find(x=>x.id===L.id);if(r)r[key]='attente';rec.to='attente';prolong.push(rec);}
    else warnings.push(`${L.name||L.id} : ${at==='start'?'départ':'fin'} « ${cur} » au bout de ${hit.l.name||hit.l.id} — à passer en « sur attente existante » dans le traceur`);return true;});});
  /* 7 · zones de chiffrage de l'étude (traceur C4) : jointes au chantier, avec leur affaire */
  const addedZones=[];const ez=(E.traceur&&Array.isArray(E.traceur.zones))?E.traceur.zones:[];
  if(ez.length&&S.traceur){const zs=Array.isArray(S.traceur.zones)?S.traceur.zones:(S.traceur.zones=[]);const zid=new Set(zs.map(z=>String(z.id)));
    ez.forEach(z=>{if(!z)return;let id=String(z.id);while(zid.has(id))id='mu'+aff.replace(/[^\w]/g,'')+'_'+id;zid.add(id);zs.push(Object.assign(cl(z),{id,lines:(z.lines||[]).map(x=>idMap[String(x)]).filter(Boolean),aff}));addedZones.push(id);});}
  else if(ez.length)warnings.push('zones de chiffrage de l\'étude non reprises (chantier importé d\'un DXF, sans traceur)');
  /* 8 · tracé marché de l'affaire rattachée (figé au gain) : à part, pour SES lignes seulement */
  let M2;if(E.marche&&Array.isArray(E.marche.lines)&&E.marche.lines.length){M2=cl(E.marche);M2.lines=M2.lines.map(x=>Object.assign(x,{id:idMap[String(x.id)]||x.id,axis:(x.axis||[]).map(P)}));}
  else M2=marcheSnapshot(newLines,{source:'traceur',by:o.by||'',gain:aff});M2.aff=aff;M2.mutu=true;S.marchesAff=Object.assign({},S.marchesAff||{},{[aff]:M2});
  /* 9 · modifications (TS) déjà qualifiées sur l'étude (chantier « Nouveau » rattaché plus tard) : gardées, sur les nouvelles lignes */
  const addedTs=[];if(E.ts&&Array.isArray(E.ts.items)&&E.ts.items.length){const TS=S.ts&&typeof S.ts==='object'&&Array.isArray(S.ts.items)?S.ts:(S.ts={items:[],seq:1});if(!TS.seq)TS.seq=1;
    E.ts.items.forEach(it0=>{const it=cl(it0);let id;do{id='ts'+String(TS.seq++).padStart(3,'0');}while(TS.items.some(x=>x.id===id));it.id=id;if(it.line!=null)it.line=idMap[String(it.line)]||it.line;if(it.weldId)it.weldId=wmap[it.weldId]||it.weldId;if(Array.isArray(it.welds))it.welds=it.welds.map(w=>wmap[w]||w);it.aff=aff;TS.items.push(it);addedTs.push(id);});}
  /* 10 · assemblage */
  S.lines=(S.lines||[]).concat(newLines);if(S.traceur&&Array.isArray(S.traceur.lines))S.traceur.lines=S.traceur.lines.concat(rawNew);else if(rawNew.length)warnings.push('chantier importé d\'un DXF : les lignes de l\'étude ne se modifient pas dans le traceur');
  const orig=o.orig!==undefined?String(o.orig||''):(Array.isArray(S.affaires)&&S.affaires.length?String(S.affaires[0]||''):'');
  S.affaires=Array.isArray(S.affaires)&&S.affaires.length?S.affaires.slice():[orig];if(!S.affaires.includes(aff))S.affaires.push(aff);
  const nom=String(o.nom||((S.mutu&&S.mutu.nom)||commonName(S.name))).trim()||S.name;
  const added={lines:newLines.map(l=>l.id),plans:addedPlans,zones:addedZones,welds:Object.values(wmap),ts:addedTs};
  S.mutu=Object.assign({},S.mutu||{},{nom,hist:((S.mutu&&S.mutu.hist)||[]).concat([{aff,at,by:o.by||'',etude:E.id||null,etudeNom:E.name||'',T:{tx:r3(T.tx),ty:r3(T.ty),rot:+(+T.rot).toFixed(6),k:T.k},k:o.k||1,how:o.how||'',nom,prev,added,prolong}])});S.name=nom;
  frame(S);
  if(S.traceur)S.traceur.savedAt=at; /* plus récent que la copie du serveur : renvoyé par le même chemin qu'un enregistrement du traceur s'il n'est pas parti tout de suite */
  return {site:S,info:{aff,lines:newLines.length,welds:Object.keys(wmap).length,plans:addedPlans.length,zones:addedZones.length,ts:addedTs.length,idMap,wmap,prolong,warnings,nom}};}
/* ═════════ ANNULATION : le chantier sans l'affaire rattachée (lignes, plans, zones, marché, TS…) — l'instantané « prev » remet nom, cadrage, rapport et format ═════════ */
export function unmergeSite(C,aff,o){o=o||{};aff=String(aff||'');const at=o.at||new Date().toISOString();const {drawing:D0,...rest}=C||{};const S=cl(rest);S.drawing=Array.isArray(D0)?D0.slice():D0;
  const H=(S.mutu&&Array.isArray(S.mutu.hist))?S.mutu.hist:[];const ent=[...H].reverse().find(h=>h&&h.aff===aff&&!h.undoneAt)||null;const first=H.find(h=>h&&h.prev)||null;const P0=first?first.prev:null; /* P0 : le chantier tel qu'il était avant le 1er rattachement */
  const rm=new Set((S.lines||[]).filter(l=>l&&affOfLine(l)===aff).map(l=>String(l.id)));if(S.traceur&&Array.isArray(S.traceur.lines))S.traceur.lines.forEach(l=>{if(l&&affOfLine(l)===aff)rm.add(String(l.id));});
  ((ent&&ent.added&&ent.added.lines)||[]).forEach(id=>rm.add(String(id)));
  S.lines=(S.lines||[]).filter(l=>!(l&&rm.has(String(l.id))));if(S.traceur&&Array.isArray(S.traceur.lines))S.traceur.lines=S.traceur.lines.filter(l=>!(l&&rm.has(String(l.id))));
  if(S.affaires&&Array.isArray(S.affaires)){S.affaires=S.affaires.filter(x=>String(x)!==aff);if(S.affaires.length<=1)delete S.affaires;}const still=isMutu(S);
  if(S.traceur&&Array.isArray(S.traceur.zones)){S.traceur.zones=S.traceur.zones.filter(z=>z&&z.aff!==aff).map(z=>Object.assign(z,{lines:(z.lines||[]).filter(id=>!rm.has(String(id)))}));if(!still&&P0&&!P0.hadZones&&!S.traceur.zones.length)delete S.traceur.zones;}
  if(Array.isArray(S.plans)){const rmI=new Set();S.plans.forEach((p,i)=>{if(p&&p.mutuAff===aff)rmI.add(i);});
    if(rmI.size){const keep=S.plans.map((p,i)=>i).filter(i=>!rmI.has(i));const re={};keep.forEach((i,j)=>{re[i]=j;});S.plans=keep.map(i=>S.plans[i]);
      if(Array.isArray(S.drawing))S.drawing=S.drawing.filter(d=>!(d&&d.p!==undefined&&rmI.has(d.p))).map(d=>(d&&d.p!==undefined&&re[d.p]!==d.p)?Object.assign({},d,{p:re[d.p]}):d);
      if(S.plans.filter(p=>p&&p.kind==='dxf').length<=1&&Array.isArray(S.drawing))S.drawing=S.drawing.map(d=>{if(d&&'p' in d){const x=Object.assign({},d);delete x.p;return x;}return d;});}
    if(!S.plans.some(p=>p&&p.mutuAff)&&P0&&P0.hadPlans===false)delete S.plans;}
  if(Array.isArray(S.drawing)&&!S.drawing.length&&P0&&P0.dkey!=='a'){if(P0.dkey==='u')delete S.drawing;else S.drawing=null;}
  if(S.elPos&&typeof S.elPos==='object')Object.keys(S.elPos).forEach(k=>{if(rm.has(k.split('|')[0]))delete S.elPos[k];});
  if(S.ts&&Array.isArray(S.ts.items)){S.ts.items=S.ts.items.filter(it=>!(it&&(it.aff===aff||rm.has(String(it.line)))));const fit=pv=>pv&&Array.isArray(pv.tsIds)&&S.ts.items.every(it=>it&&pv.tsIds.includes(it.id));const pv=fit(P0)?P0:(fit(ent&&ent.prev)?ent.prev:null);
    if(pv){if(!pv.hadTs&&!S.ts.items.length)delete S.ts;else if(pv.tsSeq!==undefined)S.ts.seq=pv.tsSeq;}} /* aucun TS restant plus récent : le compteur revient où il était (avant le 1er rattachement si possible) */
  if(S.marchesAff){delete S.marchesAff[aff];if(!Object.keys(S.marchesAff).length)delete S.marchesAff;}
  if(ent){ent.undoneAt=at;ent.undoneBy=o.by||'';}
  if(!still){if(P0&&H.some(h=>h&&h.nom&&h.nom===S.name))S.name=P0.name;
    const same=!!(P0&&Array.isArray(P0.lineIds)&&P0.lineIds.length===S.lines.length&&S.lines.every(l=>P0.lineIds.includes(String(l&&l.id))));
    if(same)['sheetType','w','h','bbox','nbox','report'].forEach(k=>{if(P0[k]===undefined)delete S[k];else S[k]=cl(P0[k]);});else frame(S);
    if(S.mutu)delete S.mutu.nom;}
  else frame(S);
  if(S.traceur)S.traceur.savedAt=at;
  return {site:S,info:{aff,lines:rm.size,ent:!!ent}};}
/* ═════════ ACTIVITÉ déjà enregistrée sur les lignes d'une affaire (soudures, soudures ajoutées, objectifs, phases, modifications, mesures DH) ═════════
   o.rows = soudures du serveur [{weld_id, status, data}] ; o.joints = soudures de la session [{weldId, status, events, photos, wire}] → {n, items:[texte]} */
export function activityOn(site,aff,o){o=o||{};const ids=lineIdsOf(site,aff);const W=new Set();(site&&site.lines||[]).forEach(L=>{if(!L||!ids.has(String(L.id)))return;['A','R'].forEach(c=>{const cd=L.cond&&L.cond[c];((cd&&(cd.welds||cd.joints))||[]).forEach(w=>{if(w&&w.weldId)W.add(w.weldId);});});});
  const items=[];const done=new Set();
  (o.rows||[]).forEach(r=>{if(!r||!W.has(r.weld_id))return;const d=r.data||{};if((r.status&&r.status!=='a_souder')||(d.events&&d.events.length)||(d.photos&&d.photos.length))done.add(r.weld_id);});
  (o.joints||[]).forEach(j=>{if(!j||!W.has(j.weldId))return;if((j.status&&j.status!=='a_souder')||(j.events&&j.events.length)||(j.photos&&j.photos.length)||(j.wire&&j.wire!=='a_raccorder'))done.add(j.weldId);});
  if(done.size)items.push(done.size+' soudure'+(done.size>1?'s':'')+' enregistrée'+(done.size>1?'s':'')+' ('+[...done].slice(0,4).join(', ')+(done.size>4?'…':'')+')');
  const ex=(Array.isArray(site&&site.extraWelds)?site.extraWelds:[]).filter(x=>x&&ids.has(String(x.line)));if(ex.length)items.push(ex.length+' soudure(s) ajoutée(s) sur place');
  const H=(site&&site.mutu&&Array.isArray(site.mutu.hist))?site.mutu.hist:[];const ent=[...H].reverse().find(h=>h&&h.aff===String(aff||'')&&!h.undoneAt);const tsIn=new Set((ent&&ent.added&&ent.added.ts)||[]); /* TS repris de l'étude au rattachement : pas une saisie sur le chantier */
  const ts=((site&&site.ts&&site.ts.items)||[]).filter(it=>it&&it.etat!=='marche'&&ids.has(String(it.line))&&!tsIn.has(it.id));if(ts.length)items.push(ts.length+' modification(s) qualifiée(s) (TS / pour mémoire)');
  const ph=((site&&site.phasage&&site.phasage.phases)||[]).filter(p=>p&&(p.tr||[]).some(t=>t&&ids.has(String(t.line))));if(ph.length)items.push(ph.length+' phase(s) du phasage');
  let ob=0;Object.values((site&&site.missions)||{}).forEach(L=>{(Array.isArray(L)?L:[]).forEach(m=>{if(m&&(((m.tr||[]).some(t=>t&&ids.has(String(t.line))))||((m.welds||[]).some(w=>W.has(w)))))ob++;});});if(ob)items.push(ob+' objectif(s) du jour');
  const dh=site&&site.dhData;if(dh&&dh.ends&&Object.keys(dh.ends).some(k=>ids.has(k.split(':')[0])))items.push('mesures DH');
  return {n:items.length,items,welds:done.size};}
/* antenne tracée APRÈS le rattachement sur une ligne d'une affaire rattachée : elle en hérite (pont du traceur) */
export function affInherit(lines){const by={};(lines||[]).forEach(l=>{if(l&&l.id!=null)by[String(l.id)]=l;});let chg=true,guard=0;
  while(chg&&guard++<50){chg=false;(lines||[]).forEach(l=>{if(!l||l.aff||l.parent==null)return;const p=by[String(typeof l.parent==='object'?l.parent.line:l.parent)];if(p&&p.aff){l.aff=p.aff;chg=true;}});}return lines;}
/* tracé marché VU par le traceur d'un chantier mutualisé : celui de l'origine + ceux des affaires rattachées (chaque ligne comparée à SON marché) ; sinon le marché tel quel */
export function marcheView(M,MA){if(!MA||typeof MA!=='object'||!Object.keys(MA).length||!M||!Array.isArray(M.lines))return M;const L=M.lines.concat(...Object.values(MA).map(x=>(x&&Array.isArray(x.lines))?x.lines:[]));return Object.assign({},M,{lines:L,tot:sumCounts(L.map(x=>x.c))});}
