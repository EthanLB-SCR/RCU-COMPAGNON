// Passerelle traceur → TRACÉ : le réseau tracé (deux conduites par ligne, pièces catalogue, soudures) devient un chantier au format « sites » de l'appli.
// Les numéros de soudure sont stables d'un enregistrement à l'autre (appariement ligne / conduite / PK avec la version précédente) pour que les statuts et photos survivent aux retouches.
const KIND={tube:'pipe',bend:'bend',tee:'tee',valve:'valve',reducer:'reducer',endcap:'endcap',endpoint:'endpoint',bypassEnd:'bypass',teeBranch:'teeout'};
const KLABEL={pipe:'barre',bend:'coude',tee:'té',valve:'vanne',reducer:'réduction',endcap:'fin de ligne',endpoint:'raccordement',bypass:'by-pass',teeout:'sortie de té'};
import {MOTEUR_V} from '../src/moteur.js'; // 28/10 (lot 2810e) : la version du moteur de comptage part avec chaque enregistrement
import {reduceDrawing} from '../src/dxfimport.js';
import {marcheSnapshot} from '../src/marche.js';
import {fuseDxfPlans,legacyImageOfPlan,tfNorm,planMeta} from '../src/plans.js'; // 14/10 (multi-plans) ; planMeta : 14/10 soir (T2), PDF / échelle 1/N
import {normEnd,endKindOf} from './extremites.js';
import {affInherit} from '../src/mutufus.js'; // 16/10 soir (lot MU) : chantier mutualisé — chaque ligne garde son affaire (l.aff) // 14/10 soir (lot T1) : extrémités (contrat C1)
const r3=v=>+(+v||0).toFixed(3);
/* 14/10 soir (lot T1) — contrats C1 à C5 :
   · startType / endType : valeurs du catalogue des extrémités (l'ancien 'bypass' sort en 'bypass_regard') ; ends = {start:{type,dn}|null (antenne : le té), end:{type,dn}}, dn = DN au bout APRÈS les réductions ;
   · tranche ('ferme' | 'option') + option (n ≥ 1), v0 / vm (version du chiffrage à la création / à la dernière modification) : toujours en étude, sinon seulement si la ligne les porte ;
   · traceur.ctx ('etude' | 'chantier'), traceur.cv (version courante du chiffrage), traceur.zones ([{id, nom, lines}]) ;
   · étude : NI marché NI TS (pas de site.marche, pas de site.ts, même si la version précédente en avait) — le marché sera figé quand l'affaire sera gagnée (appli). */
const dnAtEnd=l=>{const reds=(l.specials||[]).filter(s=>s.type==='reducer'&&s.dn2).sort((a,b)=>a.m-b.m);return reds.length?reds[reds.length-1].dn2:l.dn;};
function lineExtras(l,etude){const o={};const st=l.parent?null:normEnd(l.startType||'sousstation');const et=l.pause?'libre':normEnd(l.endType||'kit');
  const rS=!!(st&&endKindOf(st)==='endpoint'&&l.riserStart),rE=!!(endKindOf(et)==='endpoint'&&l.riserEnd); // 27/10 : remontée en local (vrai / faux) — le coude de remontée et ses soudures sont déjà dans els et welds (riser:true)
  o.startType=st;o.endType=et;o.ends={start:st?{type:st,dn:l.dn,...(rS?{riser:true}:{})}:null,end:{type:et,dn:dnAtEnd(l),...(rE?{riser:true}:{})}};
  if(etude||l.tranche!=null){const op=l.tranche==='option';o.tranche=op?'option':'ferme';if(op)o.option=Math.max(1,parseInt(l.option,10)||1);}
  if(etude||l.v0!=null||l.vm!=null){const v0=Math.max(1,parseInt(l.v0,10)||1);o.v0=v0;o.vm=Math.max(1,parseInt(l.vm,10)||v0);}
  if(Array.isArray(l.sv)&&Array.isArray(l.pts)&&l.sv.length===l.pts.length-1)o.sv=l.sv.map(v=>Math.max(1,parseInt(v,10)||1)); // 16/10 soir (lot TB, K3) : version de chaque tronçon de l'axe (tronçon i = axis[i] → axis[i+1])
  if(l.aff)o.aff=String(l.aff); // 16/10 soir (lot MU) : ligne d'une affaire rattachée au chantier (sans aff = affaire d'origine)
  return o;}
// zones de chiffrage (C4) : [{id, nom, lines}] — seulement les lignes enregistrées, une ligne dans une seule zone (la première qui la cite)
function zonesOut(zones,outLines){if(!Array.isArray(zones)||!zones.length)return undefined;const ids=new Set(outLines.map(L=>L.id));const seen=new Set();
  return zones.filter(z=>z&&z.id).map(z=>({id:String(z.id),nom:String(z.nom||z.id),lines:(z.lines||[]).filter(id=>ids.has(id)&&!seen.has(id)&&seen.add(id)),...(z.ch?{ch:String(z.ch)}:{})}));} // 16/10 (lot TA, K4) : ch = id de la zone du chiffrage reliée
// 14/10 (édition du tracé) : prof = profondeur de pose par défaut du tracé (m) → site.traceur.profondeur ; par ligne : l.prof (surcharge) → ligne.prof (valeur en vigueur)
//   — variable des règles de dilatation à venir (aucun calcul pour l'instant). Nature d'un té vertical : l'appli lit `vert` comme la NATURE (up = purge, down = vidange :
//   comptages, étiquettes, DH) → on lui passe vert = nature et pvDir = sens réel de la branche (vidange « haute » = té droit vers le haut : vert 'down', pvDir 'up').
const pvNature=p=>p.pvKind||(p.vert==='down'?'vidange':'purge');
export function siteFromTraceur({id,name,supplier,serie,lines,built,rules,bg,prev,barDefault,prof,ctx,cv,zones,ghosts,vref}){
  const etude=ctx==='etude'; // 14/10 soir (lot T1) : tracé d'une affaire en chiffrage (contexte aff: du traceur)
  // numéros de soudure : on reprend ceux de la version précédente quand une soudure est retrouvée (même ligne, même conduite, PK à ± 0,35 m), sinon un numéro neuf
  const used=new Set();let next=1;const prevW=(prev&&prev.welds)||[];prevW.forEach(w=>{const n=+String(w.weldId||'').replace(/\D/g,'');if(n>=next)next=n+1;});
  const lost=[];const idFor=(line,cond,m)=>{const cand=prevW.filter(w=>w.line===line&&w.cond===cond&&!used.has(w.weldId)&&Math.abs(w.m-m)<0.35).sort((a,b)=>Math.abs(a.m-m)-Math.abs(b.m-m))[0];if(cand){used.add(cand.weldId);return cand.weldId;}let s;do{s='S-'+String(next++).padStart(4,'0');}while(used.has(s));used.add(s);return s;};
  const outLines=[];lines.forEach(l=>{const B=built[l.id];if(!B||!B.A||!B.R)return;const cond={};
    ['A','R'].forEach(c=>{const cd=B[c];const els=cd.pieces.map(p=>{const kind=KIND[p.kind]||p.kind;const axis=p.path.map(q=>[r3(q[0]),r3(q[1])]);return {id:p.id,kind,kindLabel:KLABEL[kind]||kind,dn:p.dn,dn2:p.dn2,casing:Math.round((p.casing||0.2)*1000),len:r3(p.L),m0:r3(p.m0),m1:r3(p.m1),angle:p.angle,plane:p.plane,axis:[axis],from:axis[0],to:axis[axis.length-1],cut:!!p.cut,std:!!p.std,manchette:!!p.manchette,nue:!!p.nue,ref:p.ref,sub:p.sub,vert:p.vert?(pvNature(p)==='purge'?'up':'down'):p.vert,pvKind:p.vert?pvNature(p):undefined,pvDir:p.vert||undefined,dnb:p.dnb,teeType:p.teeType,saut:!!p.saut,under:!!p.under,photo:p.photo||undefined,branch:p.branch?p.branch.map(q=>[r3(q[0]),r3(q[1])]):undefined,err:p.err||undefined,resid:p.resid,fcWhere:p.fcWhere,legIn:p.legIn,legOut:p.legOut,riser:p.riser?true:undefined,nu:p.nu?true:undefined};});
      const welds=[];let shift=0; // 14/10 soir (lot T1) : by-pass au départ → jonction insérée AVANT le coude (les pièces suivantes décalées d'un rang)
      cd.welds.forEach(w=>{let idx=w.i+shift;if(w.bypass){const atS=w.bypassAt==='start';const U=cd.pieces.findIndex(p=>p.kind==='bypassEnd'&&(atS?p.sid==='end:start':p.sid!=='end:start'));if(U<0)return;const ap=cd.pieces[U].apex||[w.x,w.y];const Ue=U+shift;const mJ=atS?els[Ue].m0:els[Ue].m1;
          els.splice(atS?Ue:Ue+1,0,{id:atS?'U-liaison-depart':'U-liaison',kind:'bypass',kindLabel:'jonction du by-pass (aller ↔ retour)',dn:w.dn,casing:els[Ue].casing,len:0,m0:mJ,m1:mJ,axis:[[[r3(ap[0]),r3(ap[1])],[r3(ap[0]),r3(ap[1])]]],from:[r3(ap[0]),r3(ap[1])],to:[r3(ap[0]),r3(ap[1])],link:true});idx=Ue;if(atS)shift++;}
        welds.push({idx,weldId:idFor(l.id,c,w.m),m:r3(w.m),x:r3(w.x),y:r3(w.y),dev:+(w.dev||0).toFixed(2),fc:!!w.fc,dn:w.dn,teeOut:!!w.teeOut,bypass:!!w.bypass,between:w.between,sleeve:w.sleeve||undefined,riser:w.riser?true:undefined,nu:w.nu?true:undefined,sst:w.sst?true:undefined,endType:w.sst?(w.endType||undefined):undefined});}); /* 27/10 soir → 28/10 : sst = point de bout de ligne (raccordement, SST, kit, by-pass : ni soudure ni manchon comptés), endType = le type du bout */
      welds.forEach(w=>{if(!w.sleeve)return;const o=welds.find(x=>x!==w&&x.sleeve===w.sleeve);if(o)w.sleeveWith=o.weldId;}); // deux soudures dans le même manchon
      cond[c]={els,welds,length:r3(cd.length),notes:cd.notes.map(n=>({kind:n.kind,txt:n.txt,m:r3(n.m||0)}))};});
    const profL=l.prof!=null&&isFinite(+l.prof)?+l.prof:(prof!=null&&isFinite(+prof)?+prof:undefined); // 14/10 : profondeur en vigueur sur la ligne (surcharge, sinon défaut du tracé)
    outLines.push({id:l.id,name:l.name,parent:l.parent?l.parent.line:null,parentM:l.parent?r3(l.parent.m):null,dn:l.dn,bar:l.bar||barDefault,inv:!!l.inv,traceur:true,cond,axis:l.pts.map(q=>[r3(q[0]),r3(q[1])]),e:r3(B.e),endType:l.pause?'libre':(l.endType||'kit'),startType:l.parent?null:(l.startType||'sousstation'),hm:l.hm||undefined,pause:l.pause?true:undefined,prof:profL,...lineExtras(l,etude)});}); // 14/10 : ligne en pause = pas de kit de bout (le marqueur reste pour la reprendre dans le traceur)
  affInherit(outLines); // 16/10 soir (lot MU) : une antenne tracée après coup sur une ligne d'une affaire rattachée en hérite
  prevW.forEach(w=>{if(!used.has(w.weldId)&&w.status&&w.status!=='a_souder')lost.push(w);});
  // emprise des lignes ; le fond DXF embarqué dans le chantier est réduit à ce qui entoure le réseau (± 150 m, 200 000 points) — le traceur garde le fond entier localement
  let lx0=1e9,ly0=1e9,lx1=-1e9,ly1=-1e9;outLines.forEach(L=>L.axis.forEach(p=>{lx0=Math.min(lx0,p[0]);ly0=Math.min(ly0,p[1]);lx1=Math.max(lx1,p[0]);ly1=Math.max(ly1,p[1]);}));
  /* 14/10 (multi-plans) : bg = {plans, origin, show} (traceur) — site.plans = métadonnées + calage de chaque plan (les images avec leur src) ; site.drawing = FUSION des
     DXF transformés dans le repère commun (même plafond : 200 000 points, réduit autour du réseau, marque p:<index du plan> dès 2 DXF) ; site.image = la 1re image
     (ancien format : x, y, w, h + rot si tournée). Un seul DXF non calé → sortie identique à l'ancien format. L'ancien appel (bg.drawing / bg.image) reste accepté. */
  const plans=bg&&Array.isArray(bg.plans)?bg.plans.filter(p=>p&&(p.kind==='dxf'?(p.drawing&&p.drawing.length):(p.image&&p.image.src))):[];
  const linesBox=lx0<=lx1?[lx0,ly0,lx1,ly1]:null;
  const drawing=plans.length?fuseDxfPlans(plans,linesBox,{margin:150,cap:200000}).drawing:(bg&&bg.drawing&&bg.drawing.length?(linesBox?reduceDrawing(bg.drawing,linesBox,150,200000):bg.drawing.slice(0,20000)):null);
  const firstDxf=plans.find(p=>p.kind==='dxf')||null,firstImg=plans.find(p=>p.kind==='image')||null;
  const sitePlans=plans.length?plans.map(p=>{const o={...planMeta(p),id:p.id,kind:p.kind,name:p.name||'',show:p.show!==false,opacity:p.opacity===undefined?.5:p.opacity,transform:tfNorm(p.transform),geo:p.geo||null};if(p.kind==='dxf'){o.bbox=p.bbox||null;o.origin=p.origin||null;o.netLayers=p.netLayers||[];o.n=p.drawing.length;}else o.image={src:p.image.src,pw:p.image.pw,ph:p.image.ph};return o;}):null;
  const image=plans.length?legacyImageOfPlan(firstImg):(bg&&bg.image&&bg.image.src?{src:bg.image.src,x:r3(bg.image.x),y:r3(bg.image.y),w:r3(bg.image.w),h:r3(bg.image.h),pw:bg.image.pw,ph:bg.image.ph,opacity:bg.opacity===undefined?.5:bg.opacity,name:bg.name||''}:null);
  const bgName=plans.length?((firstDxf||plans[0]).name||null):(bg&&bg.name?bg.name:null);const bgOrigin=plans.length?(bg.origin||(firstDxf&&firstDxf.origin)||null):(bg&&bg.origin?bg.origin:null);
  const bgLayers=plans.length?(firstDxf?(firstDxf.netLayers||[]):null):(bg&&bg.netLayers?bg.netLayers:null);const bgOpacity=plans.length?(firstDxf||plans[0]).opacity:(bg?bg.opacity:undefined);
  let x0=lx0,y0=ly0,x1=lx1,y1=ly1;if(drawing&&drawing.length){drawing.forEach(d=>{if(d.pts)d.pts.forEach(p=>{x0=Math.min(x0,p[0]);y0=Math.min(y0,p[1]);x1=Math.max(x1,p[0]);y1=Math.max(y1,p[1]);});});}if(x0>x1){x0=0;y0=0;x1=100;y1=100;}
  const nW=outLines.reduce((s,L)=>s+L.cond.A.welds.filter(w=>!w.sst).length+L.cond.R.welds.filter(w=>!w.sst).length,0); /* 27/10 soir : les points SST ne sont pas des soudures */const totL=outLines.reduce((s,L)=>s+L.cond.A.length,0);
  const site={id,name,supplier,serie,source:'traceur',method:'Réseau tracé à la main dans le traceur (sommets → pièces catalogue selon les règles)',crs:bgName?('repère du plan '+bgName):'repère libre (m)',
    sheetType:drawing?'vector':'plain',drawing,image,plans:sitePlans,w:Math.ceil(x1+20),h:Math.ceil(y1+20),bbox:[x0,y0,x1,y1],nbox:lx0<=lx1?[r3(lx0),r3(ly0),r3(lx1),r3(ly1)]:null,
    lines:outLines,warnings:[],report:{source:'traceur',lines:outLines.length,welds:nW,length:r3(totL),lost:lost.map(w=>w.weldId)},
    traceur:{v:1,moteur:MOTEUR_V,lines:JSON.parse(JSON.stringify(lines)),rules,bgName,bgOpacity,bgOrigin,bgLayers,profondeur:prof!=null&&isFinite(+prof)?+prof:undefined,savedAt:new Date().toISOString()},created:new Date().toISOString()}; // 14/10 : profondeur — variable des règles de dilatation à venir
  Object.assign(site.traceur,{ctx:etude?'etude':'chantier',cv:Math.max(1,parseInt(cv,10)||1),zones:zonesOut(zones,outLines)}); // 14/10 soir (lot T1) : contexte (C5), version du chiffrage (C3), zones de chiffrage (C4)
  if(etude){if(Array.isArray(ghosts)&&ghosts.length)site.traceur.ghosts=ghosts;if(vref&&Array.isArray(vref.lines))site.traceur.vref=vref;} // 16/10 soir (lot TB, K3) : lignes supprimées (fantômes, grisées dans le traceur) et tracé au début de la version en cours — JAMAIS dans site.lines (ni pièces, ni soudures, ni quantités) ; morceaux supprimés d'une ligne : traceur.lines[].del
  if(bg&&bg.geo&&bg.geo.crs&&bg.geo.aff)site.geo=bg.geo;else if(prev&&prev.geo)site.geo=prev.geo; // 14/10 soir (T2) : le géoréférencement du traceur (vue aérienne) FAIT FOI ; sans lui, le calage à la main fait dans l'appli est conservé d'une version du tracé à l'autre (même repère de plan)
  if(prev&&prev.hydro)site.hydro=prev.hydro; // préparation hydraulique (coupes, points d'eau, skid) : conservée aussi
  if(prev&&prev.dhData)site.dhData=prev.dhData;
  if(prev&&prev.stock)site.stock=prev.stock; // stockage pré-isolé (zones, livraisons, prélèvements) : conservé aussi
  if(prev&&prev.elPos)site.elPos=prev.elPos; // rotations / retournements des tubes : conservés d'une version du tracé à l'autre // DH : états d'extrémités, bouclages temporaires, mesures — conservés d'une version du tracé à l'autre
  if(prev&&prev.admin)site.admin=prev.admin; // dossier administratif (métadonnées des documents) : conservé
  if(prev&&prev.qse)site.qse=prev.qse; // QSE (formulaires, émargements) : conservé
  if(!etude){if(prev&&prev.marche)site.marche=prev.marche;else site.marche=marcheSnapshot(outLines,{source:'traceur',by:'traceur'});} // tracé MARCHÉ figé au premier enregistrement (Ethan 07/10) — ensuite c'est la référence des écarts / TS ; 14/10 soir (lot T1, C5) : une étude n'a ni marché figé ni TS (même si la version précédente en avait), le marché sera figé quand l'affaire sera gagnée
  if(prev&&prev.ts&&!etude)site.ts=prev.ts; // marques TS / hors marché par élément (faites dans l'appli) : conservées
  if(prev&&prev.full)Object.keys(prev.full).forEach(k=>{if(etude&&(k==='marche'||k==='ts'))return; /* intégration 14/10 soir : une étude ne récupère pas un ancien marché par la copie complète */if(site[k]===undefined&&prev.full[k]!==undefined&&prev.full[k]!==null)site[k]=prev.full[k];}); // toute autre partie du chantier faite dans l'appli (phasage, soudures ajoutées sur place, pointage…) : conservée telle quelle — un enregistrement depuis le traceur ne doit rien effacer
  return {site,lost,nW};
}
// soudures d'un chantier existant (pour l'appariement) : [{line,cond,m,weldId,status}]
export function weldsOfSite(site,remoteWelds){const st={};(remoteWelds||[]).forEach(r=>{st[r.weld_id]=r.status;});const out=[];(site.lines||[]).forEach(L=>{if(!L.cond)return;['A','R'].forEach(c=>{const cd=L.cond[c];if(!cd)return;(cd.welds||[]).forEach(w=>out.push({line:L.id,cond:c,m:w.m,weldId:w.weldId,status:st[w.weldId]||'a_souder'}));});});return out;}
