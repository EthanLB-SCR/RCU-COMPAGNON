// tssel.js — « ✍ QUALIFIER SUR LE PLAN » (28/10/2026, lot 2810h). Ethan : « oublie les pastilles automatiques — une ligne à une pastille qui fait toute la ligne alors que sur
// la même ligne je peux avoir une modif TS et l'autre comprise dans le marché ; il faut plutôt que ça m'emmène sur le plan d'ensemble comme il est plus précis, et que dessus je
// puisse sélectionner un ou des tronçons comme les phases, mais aussi entourer ou autre ; choisir ce que je sélectionne : si c'est le changement de DN, si c'est la modif de
// tracé — sur une même ligne le changement de DN peut être TS mais le changement du cheminement global et forfaitaire ; souple mais très clair ».
// Sur le PLAN D'ENSEMBLE : on sélectionne (〰 tronçon début → fin, ▬ ligne entière, ⭕ entourer au doigt), puis « Qualifier la sélection » : l'écart réel − marché DE LA
// SÉLECTION, séparé par NATURE — ↝ tracé (linéaire, coudes, lyres), ⌀ DN (ce qui change de DN, réductions), 🔩 pièces (vannes, tés, purges, vidanges, fins de ligne),
// 🔥 soudures et manchons, ⚙ terrain (extrusions, fausses coupes) — et CHAQUE nature reçoit sa qualification (compris · TS proposé · TS commandé · pour mémoire · plus tard).
// Une marque (kind 'sel') par qualification et par tronçon : zone = le tronçon, aspects = les natures ; plusieurs tronçons pour une même qualification = un groupe (une modif
// pour le client). Ce qui était déjà qualifié dans la sélection est repris (pré-rempli) puis remplacé ; une pièce ou une soudure qualifiée depuis sa fiche reste à part (déduite).
// Comptage d'un tronçon : linéaire = longueur réelle − longueur du marché entre les projections des deux bouts sur l'axe du marché (exact quand les bouts sont sur une partie
// inchangée) ; pièces = les listes ajouté / retiré de l'appariement réel ↔ marché (les mêmes que « à qualifier ») ; soudures = réel du tronçon − marché de la même partie
// (PK des soudures mémorisés avec le marché, décalés de la dérive des pièces appariées les plus proches ; sans eux : estimées) ; DN = les écarts de profil de la ligne dans le tronçon.
import {pkOnAxis,atOnAxis,shapesAt,axisOf,polyLen,linePieces,PIECE_LABEL} from './marche.js';
let A=null;
export const SS={on:false,tool:'tr',tr:[],a:null,lasso:null,undo:[],note:'',from:null};
const esc=s=>String(s??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const r1=v=>+((+v||0).toFixed(1));
const KEY={valve:'vannes',tee:'tes',purge:'purges',vidange:'vidanges',reducer:'reduc',bend:'coudes',endcap:'bouchons'};
const aspOfKind=k=>k==='bend'?'trace':k==='reducer'?'dn':'pcs';
export const ASP=[{k:'trace',ic:'↝',lab:'Tracé (cheminement)',keys:['ml','coudes','lyres','baio']},{k:'dn',ic:'⌀',lab:'DN (changement de DN, réductions)',keys:['reduc']},
  {k:'pcs',ic:'🔩',lab:'Pièces (vannes, tés, purges, vidanges, fins de ligne)',keys:['vannes','tes','purges','vidanges','bouchons']},{k:'soud',ic:'🔥',lab:'Soudures et manchons',keys:['soud','manchons']},
  {k:'terrain',ic:'⚙',lab:'Terrain (extrusions, fausses coupes)',keys:['extru','fc']}];
const ASPK=Object.fromEntries(ASP.map(a=>[a.k,a]));const KEY2ASP={};ASP.forEach(a=>a.keys.forEach(k=>{KEY2ASP[k]=a.k;}));
const ASP_SHORT={trace:'tracé',dn:'DN',pcs:'pièces',soud:'soudures',terrain:'terrain'};
const E_LAB={forfait:'Compris',propose:'TS proposé',commande:'TS commandé',note:'Pour mémoire'};const E_ORD=['forfait','propose','commande','note'];
const W={coudes:['coude','coudes'],lyres:['lyre','lyres'],baio:['baïonnette','baïonnettes'],vannes:['vanne','vannes'],tes:['té','tés'],purges:['purge','purges'],vidanges:['vidange','vidanges'],bouchons:['fin de ligne','fins de ligne'],reduc:['réduction','réductions'],soud:['soudure','soudures'],manchons:['manchon','manchons'],extru:['extrusion','extrusions'],fc:['fausse coupe','fausses coupes']};
const sg=v=>(v>0?'+':v<0?'−':'')+A.fmt(Math.abs(v));
function qTxt(q,keys){return (keys||Object.keys(q||{})).filter(k=>q&&q[k]&&(k!=='ml'||Math.abs(q[k])>=0.5)).map(k=>k==='ml'?`${sg(q.ml)} ml`:`${sg(q[k])} ${(W[k]||[k,k])[Math.abs(q[k])===1?0:1]}`).join(' · ');}
const inPoly=(q,P)=>{let ins=false;for(let i=0,j=P.length-1;i<P.length;j=i++){const xi=P[i][0],yi=P[i][1],xj=P[j][0],yj=P[j][1];if(((yi>q.y)!==(yj>q.y))&&(q.x<(xj-xi)*(q.y-yi)/((yj-yi)||1e-12)+xi))ins=!ins;}return ins;};
// ───────────────────────── sélection ─────────────────────────
function lineName(id){const l=A.lines()[id];return (l&&l.name)||id;}
function merge(){const by={};SS.tr.forEach(t=>{(by[t.line]=by[t.line]||[]).push({...t});});const out=[];Object.keys(by).forEach(id=>{const a=by[id].sort((x,y)=>x.m0-y.m0);let cur=null;a.forEach(t=>{if(cur&&t.m0<=cur.m1+0.3)cur.m1=Math.max(cur.m1,t.m1);else{cur={line:id,m0:t.m0,m1:t.m1};out.push(cur);}});});SS.tr=out.map(t=>({line:t.line,m0:r1(t.m0),m1:r1(t.m1)}));}
function snapEnds(id,m){const L=A.len(A.lines()[id]);if(m<=1)return 0;if(m>=L-1)return r1(L);return r1(m);}
function addRange(id,m0,m1){const l=A.lines()[id];if(!l)return false;const L=A.len(l);let a=Math.max(0,Math.min(m0,m1)),b=Math.min(L,Math.max(m0,m1));if(b-a<0.3)return false;SS.undo.push(SS.tr.map(t=>({...t})));if(SS.undo.length>30)SS.undo.shift();SS.tr.push({line:id,m0:a,m1:b});merge();return true;}
const isWhole=t=>{const l=A.lines()[t.line];const L=l?A.len(l):0;return t.m0<=0.3&&t.m1>=L-0.3;};
function tap(wx,wy){if(!SS.on)return;const n=A.nearest(wx,wy);const k=A.k();if(!n||n.d>36/k){A.toast('Touche une conduite du réseau (zoome si besoin)');return;}
  if(!A.inScope(n.line)){A.toast('Cette conduite n\'est pas dans l\'affaire affichée');return;}
  const l=A.lines()[n.line];const L=A.len(l);const m=snapEnds(n.line,Math.max(0,Math.min(L,n.m)));SS.note='';
  if(SS.tool==='line'){const i=SS.tr.findIndex(t=>t.line===n.line&&isWhole(t));if(i>=0){SS.undo.push(SS.tr.map(t=>({...t})));SS.tr.splice(i,1);A.toast((l.name||n.line)+' retirée de la sélection');}else{addRange(n.line,0,L);A.toast((l.name||n.line)+' entière ('+A.fmt(L)+' m)');}refresh();return;}
  if(!SS.a){SS.a={line:n.line,m};refresh();return;}
  if(SS.a.line!==n.line){SS.a={line:n.line,m};A.toast('Début déplacé sur '+(l.name||n.line)+' — touche la fin sur cette conduite');refresh();return;}
  if(Math.abs(m-SS.a.m)<0.3){A.toast('Touche la fin un peu plus loin sur la conduite');return;}
  addRange(n.line,SS.a.m,m);SS.a=null;refresh();}
function lassoStart(x,y){if(!SS.on)return;SS.lasso={pts:[[x,y]]};drawLasso();}
function lassoMove(x,y){const P=SS.lasso&&SS.lasso.pts;if(!P)return;const last=P[P.length-1];if(Math.hypot(x-last[0],y-last[1])>3/A.k())P.push([x,y]);drawLasso();}
function lassoCancel(){SS.lasso=null;drawLasso();}
/* contour fermé → les morceaux de conduite à l'intérieur deviennent des tronçons (axe échantillonné tous les 0,25 à 1 m) */
function lassoApply(P){if(!P||P.length<3)return 0;const before=SS.tr.map(t=>({...t}));let n=0;
  A.tsLines().forEach(l=>{if(!A.inScope(l.id))return;const L=A.len(l);if(!(L>0))return;const st=Math.max(0.25,Math.min(1,L/3000));let s0=null,prev=0;
    for(let m=0;;m+=st){const mm=Math.min(L,m);const q=A.pos(l,mm);const ins=!!q&&inPoly(q,P);if(ins&&s0==null)s0=mm;if(s0!=null&&(!ins||mm>=L)){const e=ins?mm:prev;if(e-s0>=0.5){SS.tr.push({line:l.id,m0:s0<=st?0:s0,m1:e>=L-st?L:e});n++;}s0=null;}prev=mm;if(mm>=L)break;}});
  if(n){SS.undo.push(before);merge();}return n;}
function lassoEnd(){const P=SS.lasso&&SS.lasso.pts;SS.lasso=null;if(!P||P.length<3){drawLasso();A.toast('Dessine un contour fermé autour de la zone');return;}const n=lassoApply(P);SS.note='';A.toast(n?n+' tronçon'+(n>1?'s':'')+' ajouté'+(n>1?'s':'')+' à la sélection':'Aucune conduite dans le contour');refresh();}
function drawLasso(){const g=document.getElementById('tsG');if(!g)return;let p=document.getElementById('tsSelLasso');const P=SS.lasso&&SS.lasso.pts;if(!P||P.length<2){if(p)p.remove();return;}
  if(!p){p=document.createElementNS('http://www.w3.org/2000/svg','path');p.id='tsSelLasso';p.setAttribute('pointer-events','none');g.appendChild(p);}const k=A.k();
  p.setAttribute('d','M '+P.map(q=>q[0]+' '+q[1]).join(' L ')+' Z');p.setAttribute('fill','rgba(28,91,214,.12)');p.setAttribute('stroke','#1c5bd6');p.setAttribute('stroke-width',String(2.2/k));p.setAttribute('stroke-dasharray',(7/k)+' '+(5/k));}
// ───────────────────────── comptage d'un tronçon (par nature) ─────────────────────────
function compute(lineId,m0,m1){const l=A.lines()[lineId];if(!l||!l.cond)return null;const L=A.len(l);const M=A.marche();const D=A.diff();const r=((D&&D.rows)||[]).find(x=>x.id===lineId)||null;const x=M&&(M.lines||[]).find(y=>y.id===lineId)||null;
  const lo=r1(Math.max(0,Math.min(m0,m1))),hi=r1(Math.min(L,Math.max(m0,m1)));const atS=lo<=0.3,atE=hi>=L-0.3;const inR=(m,t)=>m>=lo-(t||0)&&m<=hi+(t||0);
  const RC=A.rangeCounts(l,lo,hi);const asp={trace:{q:{},list:[],geo:[]},dn:{q:{},dnq:[],reduc:[]},pcs:{q:{},list:[]},soud:{q:{},extra:0},terrain:{q:{}}};
  const add=(a,k,v)=>{if(!v)return;const o=asp[a].q;o[k]=r1((o[k]||0)+v);if(!o[k])delete o[k];};
  let extra=0;['A','R'].forEach(c=>{const cd=l.cond[c];if(!cd)return;(cd.joints||[]).forEach(j=>{if(!j.extra||j.sst)return;const e=cd.els&&cd.els[j.idx];const m=e?+e.m1:(+j.m||0);if(inR(m,0.01))extra++;});});asp.soud.extra=extra;
  const base={line:lineId,name:l.name||lineId,m0:lo,m1:hi,whole:atS&&atE};
  /* linéaire du tronçon mesuré sur l'AXE (comme le marché) : les bouts projetés sur l'axe réel — le PK des pièces (arcs des coudes) peut différer de quelques dm de la longueur d'axe */
  const axR=axisOf(l);const LR=polyLen(axR);const P0=A.pos(l,lo),P1=A.pos(l,hi);const ra0=atS||!P0?0:pkOnAxis(axR,[P0.x,P0.y]),ra1=atE||!P1?LR:pkOnAxis(axR,[P1.x,P1.y]);const mlR=r1(Math.abs(ra1-ra0));
  if(!x||!r||r.isNew){ /* ligne absente du marché : tout ce que le tronçon contient est ajouté */
    add('trace','ml',mlR);add('trace','coudes',RC.coudes);const S=shapesAt(axisOf(l));add('trace','lyres',S.lyres.filter(pk=>inR(pk)).length);add('trace','baio',S.baio.filter(pk=>inR(pk)).length);
    ['vannes','tes','purges','vidanges','bouchons'].forEach(k=>add('pcs',k,RC[k]));add('dn','reduc',RC.reduc);add('soud','soud',RC.soud);add('soud','manchons',RC.manchons);add('terrain','extru',RC.extru);add('terrain','fc',RC.fc);
    linePieces(l).forEach(p=>{if(!inR(p.m,0.01))return;const a=aspOfKind(p.k);const o={k:p.k,c:p.c,m:p.m};if(a==='dn')asp.dn.reduc.push(o);else asp[a].list.push(o);});
    return {...base,isNew:true,asp,est:{},info:{mlR,mlM:0,soudR:RC.soud,soudM:0}};}
  /* pièces : appariement réel ↔ marché de la ligne (les mêmes listes que « à qualifier ») ; une réduction au bord d'un changement de DN (± 2 m) va avec le DN */
  const dndIn=(r.dnd||[]).filter(dd=>Math.min(hi,dd.m1)-Math.max(lo,dd.m0)>=1);const tolK=k=>k==='reducer'&&dndIn.length?2:0.5;
  const unk=!!r.pcsUnknown;const added=unk?[]:(r.added||[]).filter(p=>KEY[p.k]&&inR(p.m,tolK(p.k)));const removed=unk?[]:(r.removed||[]).filter(p=>KEY[p.k]&&inR(p.mr!=null?p.mr:p.m,tolK(p.k)));
  added.forEach(p=>{const a=aspOfKind(p.k);add(a,KEY[p.k],1);const o={k:p.k,c:p.c,m:p.m};if(a==='dn')asp.dn.reduc.push(o);else asp[a].list.push(o);});
  removed.forEach(p=>{const a=aspOfKind(p.k);add(a,KEY[p.k],-1);const o={k:p.k,c:p.c,m:p.m,mr:p.mr,rm:true};if(a==='dn')asp.dn.reduc.push({m:p.mr!=null?p.mr:p.m,c:p.c,rm:true});else asp[a].list.push(o);});
  if(unk&&atS&&atE){['coudes'].forEach(k=>add('trace',k,(r.d||{})[k]||0));['vannes','tes','purges','vidanges','bouchons'].forEach(k=>add('pcs',k,(r.d||{})[k]||0));add('dn','reduc',(r.d||{}).reduc||0);} /* marché figé sans la position des pièces : la ligne entière se compte sur son écart net */
  /* linéaire : les bouts du tronçon projetés sur l'axe du marché */
  const ax=x.axis||[];const LM=polyLen(ax);let q0=atS||!P0?0:pkOnAxis(ax,[P0.x,P0.y]),q1=atE||!P1?LM:pkOnAxis(ax,[P1.x,P1.y]);
  const dist=(q,P)=>{const a=atOnAxis(ax,q);return a&&P?Math.hypot(a[0]-P.x,a[1]-P.y):99;};const far0=!atS&&dist(q0,P0)>1.5,far1=!atE&&dist(q1,P1)>1.5;if(q1<q0){const t=q0;q0=q1;q1=t;}
  const mlM=r1(q1-q0);const dml=r1(mlR-mlM);if(Math.abs(dml)>=0.1)add('trace','ml',dml);
  const SR=shapesAt(axisOf(l)),SM=shapesAt(ax);add('trace','lyres',SR.lyres.filter(pk=>inR(pk)).length-SM.lyres.filter(pk=>pk>=q0-0.5&&pk<=q1+0.5).length);add('trace','baio',SR.baio.filter(pk=>inR(pk)).length-SM.baio.filter(pk=>pk>=q0-0.5&&pk<=q1+0.5).length);
  asp.trace.geo=(r.geo||[]).filter(g=>inR(A.pkOnLine(lineId,[(g[0][0]+g[1][0])/2,(g[0][1]+g[1][1])/2]),0.3));
  /* soudures : réel du tronçon − marché de la même partie (dérive de la pièce appariée la plus proche, par conduite) */
  const anc={A:[],R:[]};(r.pairs||[]).forEach(p=>{if(!p.end&&anc[p.c])anc[p.c].push(p);});
  const dAt=(c,m)=>{const Ls=anc[c].length?anc[c]:(anc.A.length?anc.A:anc.R);let b=null,bd=1e18;Ls.forEach(p=>{const d=Math.abs(p.r-m);if(d<bd){bd=d;b=p;}});return b?b.d:0;};
  let soudM=null,fcM=0;if(x.wk&&(x.wk.A||x.wk.R)){soudM=0;['A','R'].forEach(c=>{const Wk=x.wk[c]||[];const a=atS?-1e9:lo-dAt(c,lo),b=atE?1e9:hi-dAt(c,hi);Wk.forEach(w=>{if(w[0]>=a-0.05&&w[0]<=b+0.05){soudM++;if(w[1])fcM++;}});});}
  let ds;if(soudM!=null)ds=RC.soud-soudM;
  else{ /* marché figé sans la position de ses soudures (avant le 27/10) : l'écart EXACT de la ligne (réel − marché) réparti au prorata des changements estimés — tous les changements dans la sélection → tout l'écart */
    const bar=+l.bar||12;let exAll=0;['A','R'].forEach(c=>{const cd=l.cond[c];if(cd)(cd.joints||[]).forEach(j=>{if(j.extra&&!j.sst)exAll++;});});
    const eIn=(added.length-removed.length)+2*dml/bar+extra,eAll=(unk?0:((r.added||[]).filter(p=>KEY[p.k]).length-(r.removed||[]).filter(p=>KEY[p.k]).length))+2*(+(r.d||{}).ml||0)/bar+exAll;const Dl=+(r.d||{}).soud||0;
    ds=atS&&atE?Dl:Math.abs(eAll)>0.5?Math.round(Dl*Math.max(-1.5,Math.min(1.5,eIn/eAll))):Math.round(Dl*(hi-lo)/Math.max(1,L));if(Math.abs(ds)>Math.abs(Dl)&&Math.sign(ds)===Math.sign(Dl))ds=Dl;}
  add('soud','soud',ds);add('terrain','extru',RC.extru);add('soud','manchons',ds-RC.extru);if(soudM!=null)add('terrain','fc',RC.fc-fcM);
  /* DN : écarts du profil de DN (marché → réel) dans le tronçon */
  dndIn.forEach(dd=>{const a=Math.max(lo,dd.m0),b=Math.min(hi,dd.m1);const Q=A.dnqOf(l,{m0:+a.toFixed(2),m1:+b.toFixed(2),from:dd.from,to:dd.to});asp.dn.dnq.push(Q);});
  if(asp.dn.reduc.length&&asp.dn.dnq.length)asp.dn.dnq[0].reduc=asp.dn.reduc.map(o=>({m:+(+o.m).toFixed(1),c:o.c,rm:o.rm||undefined}));
  return {...base,isNew:false,asp,est:{ml:far0||far1,soud:soudM==null,pcs:unk&&!(atS&&atE)},info:{mlR,mlM,soudR:RC.soud,soudM,far0,far1,dnpUnknown:!!r.dnpUnknown}};}
const clone=o=>JSON.parse(JSON.stringify(o));
function partHas(p,a){const s=p.asp[a];const q=s.q||{};if(a==='trace')return Math.abs(q.ml||0)>=0.5||['coudes','lyres','baio'].some(k=>q[k])||(s.geo||[]).length>0||(s.list||[]).length>0;if(a==='dn')return (s.dnq||[]).length>0||!!q.reduc||(s.reduc||[]).length>0;if(a==='pcs')return Object.keys(q).some(k=>!!q[k])||(s.list||[]).length>0;return Object.keys(q).some(k=>!!q[k]);} /* une pièce déplacée (retirée ici, remise là, net 0) appartient quand même à sa nature : sinon elle resterait « à qualifier » */
function sigOf(p,asps,raw){const src=raw||p.asp;const q={};let dn=0;asps.forEach(a=>{Object.entries((src[a]||{}).q||{}).forEach(([k,v])=>{q[k]=r1((q[k]||0)+v);if(!q[k])delete q[k];});if(a==='dn')(src.dn.dnq||[]).forEach(Q=>{dn+=+Q.ml||0;});});return {q,dn:r1(dn)};}
function sameSig(a,b){if(!a||!b)return false;const ks=new Set([...Object.keys(a.q||{}),...Object.keys(b.q||{})]);for(const k of ks){if(Math.abs((+(a.q||{})[k]||0)-(+(b.q||{})[k]||0))>(k==='ml'?0.5:0))return false;}return Math.abs((+a.dn||0)-(+b.dn||0))<=0.5;}
/* marques déjà posées qui touchent la sélection : remplacées (pré-remplies) ; pièces / soudures qualifiées depuis leur fiche : gardées, déduites */
function conflicts(tr){const T=A.ts();const out={repl:[],keep:[]};if(!T)return out;const ALL=ASP.map(a=>a.k);
  T.items.forEach(it=>{if(!it||it.kind==='group'||it.etat==='marche'||it.etat==='corr')return;if(it.etat!=='grouped'&&!A.live(it))return;if(A.stale(it))return;
    const rs=tr.filter(t=>t.line===it.line);if(!rs.length)return;const hit=(a,b)=>rs.some(t=>Math.min(b,t.m1)-Math.max(a,t.m0)>0.2);const hitP=m=>m!=null&&isFinite(m)&&rs.some(t=>m>=t.m0-0.5&&m<=t.m1+0.5);
    const owner=it.grp?(T.items.find(g=>g.id===it.grp)||it):it;
    if(it.kind==='el'||it.kind==='weld'){let pk=it.m;if(pk==null){const q=A.itemPos(it);if(q)pk=A.pkOnLine(it.line,[q.x,q.y]);}if(hitP(pk))out.keep.push({it,owner,pk});return;}
    let touch=false,asp=ALL;
    if(it.kind==='sel'&&it.zone){touch=hit(it.zone.m0,it.zone.m1);asp=it.aspects||ALL;}
    else if(it.kind==='range')touch=hit(+it.m0,+it.m1);
    else if(it.kind==='line')touch=true;
    else if(it.kind==='dn'){touch=(it.dnq||[]).some(Q=>hit(Q.m0,Q.m1));asp=['dn'];}
    else if(it.kind==='delta'||it.kind==='geo'){if(it.gone)return;if(it.zone)touch=hit(it.zone.m0,it.zone.m1);else if((it.pcs||[]).length||(it.geo||[]).length)touch=(it.pcs||[]).some(p=>hitP(p.rm&&p.mr!=null?p.mr:p.m))||(it.geo||[]).some(g=>hitP(A.pkOnLine(it.line,[(g[0][0]+g[1][0])/2,(g[0][1]+g[1][1])/2])));else if(it.m!=null)touch=hitP(it.m);else touch=true;asp=['trace','pcs','soud','terrain'];}
    if(touch)out.repl.push({it,owner,asp});});
  return out;}
function selCompute(tr){const parts=[];tr.forEach(t=>{const R=compute(t.line,t.m0,t.m1);if(R){R.raw=clone(R.asp);parts.push(R);}});const conf=conflicts(tr);
  conf.keep.forEach(x=>{const it=x.it;const p=parts.find(P=>P.line===it.line&&x.pk>=P.m0-0.5&&x.pk<=P.m1+0.5);if(!p)return;Object.entries(it.qty||{}).forEach(([k,v])=>{const a=KEY2ASP[k];if(!a||!v)return;const o=p.asp[a].q;const cur=+o[k]||0;if(!cur||Math.sign(cur)!==Math.sign(v))return;o[k]=r1(Math.sign(cur)*Math.max(0,Math.abs(cur)-Math.abs(v)));if(!o[k])delete o[k];x.used=true;});});
  const rows={};ASP.forEach(a=>{const q={};const dnq=[],pcs=[],geo=[];let est=false,extra=0,has=false;parts.forEach(p=>{const s=p.asp[a.k];Object.entries(s.q).forEach(([k,v])=>{q[k]=r1((q[k]||0)+v);if(!q[k])delete q[k];});(s.dnq||[]).forEach(Q=>dnq.push({...Q,line:p.line}));(s.list||[]).forEach(o=>pcs.push({...o,line:p.line}));(s.geo||[]).forEach(g=>geo.push(g));
      if(a.k==='soud'){if(p.est.soud)est=true;extra+=s.extra||0;}if(a.k==='trace'&&p.est.ml)est=true;if(a.k==='pcs'&&p.est.pcs)est=true;if(partHas(p,a.k))has=true;});rows[a.k]={has,q,dnq,pcs,geo,est,extra};});
  return {tr:tr.map(t=>({...t})),parts,conf,rows};}
// ───────────────────────── textes ─────────────────────────
function pcsTxt(list){const by={};list.forEach(o=>{const s=o.rm?'−':'+';const key=s+o.k;(by[key]=by[key]||{s,k:o.k,n:0,pk:new Set(),line:o.line,o}).n++;by[key].pk.add(Math.round(o.rm&&o.mr!=null?o.mr:o.m));});
  return Object.values(by).map(g=>{const l=A.lines()[g.line];const dn=l?A.pcLab(l,g.o,!!g.o.rm):'';const w=PIECE_LABEL[g.k]||g.k;const ws=g.n>1?(g.k==='endcap'?'fins de ligne':w+'s'):w;const pks=[...g.pk].sort((a,b)=>a-b);return `${g.s}${g.n} ${ws}${dn?' '+dn:''} (PK ${pks.slice(0,4).join(', ')}${pks.length>4?'…':''})`;}).join(' · ');}
function rowTxt(a,R){const q=R.q||{};
  if(a==='trace'){const t=qTxt(q,['ml','coudes','lyres','baio']);return (t||(R.geo.length?'tracé dévié, mêmes quantités':''))+(t&&R.geo.length?' · tracé dévié':'')+(R.est?' (linéaire ≈)':'');}
  if(a==='dn'){const ts=R.dnq.map(Q=>{const l=A.lines()[Q.line];return l?A.dnqLabel(l,Q):'';}).filter(Boolean);if(q.reduc&&!R.dnq.some(Q=>(Q.reduc||[]).length))ts.push(qTxt({reduc:q.reduc}));return ts.join(' ; ');}
  if(a==='pcs')return (pcsTxt(R.pcs)||qTxt(q))+(R.est?' (≈ marché sans position des pièces)':'');
  if(a==='soud')return qTxt(q,['soud','manchons'])+(R.extra?` (dont ${R.extra} ajoutée${R.extra>1?'s':''} sur place)`:'')+(R.est?' (≈ estimé)':'');
  return qTxt(q,['extru','fc']);}
const whereOf=p=>p.whole?'ligne entière':'PK '+A.fmt(p.m0)+' → '+A.fmt(p.m1);
const aspList=asps=>asps.map(a=>ASP_SHORT[a]||a).join(' + ');
// ───────────────────────── marques ─────────────────────────
function partQ(p,asps){const q={},dnq=[],pcs=[],geo=[];asps.forEach(a=>{const s=p.asp[a];Object.entries(s.q||{}).forEach(([k,v])=>{if(k==='ml'&&Math.abs(v)<0.5)return;q[k]=r1((q[k]||0)+v);if(!q[k])delete q[k];});(s.dnq||[]).forEach(Q=>dnq.push(Q));(s.list||[]).forEach(o=>pcs.push(o));if(a==='dn')(s.reduc||[]).forEach(o=>pcs.push({k:'reducer',c:o.c,m:o.m,rm:o.rm}));(s.geo||[]).forEach(g=>geo.push(g));});return {q,dnq,pcs,geo};}
function labelOf(p,asps,Q){const parts=[];if(asps.includes('dn'))Q.dnq.forEach(x=>{const l=A.lines()[p.line];if(l)parts.push(A.dnqLabel(l,x));});const qq={...Q.q};const t=qTxt(qq,['ml','coudes','lyres','baio','vannes','tes','purges','vidanges','bouchons','reduc','soud','manchons','extru','fc']);if(t)parts.push(t);if(asps.includes('trace')&&Q.geo.length&&!qTxt(Q.q,['ml','coudes','lyres','baio']))parts.push('tracé dévié, mêmes quantités');return parts.join(' ; ')||'—';}
function newSel(p,asps,etat,ts,desig){const T=A.ts();const Q=partQ(p,asps);const where=whereOf(p);const txt=labelOf(p,asps,Q);const vals=Object.values(Q.q);const neg=vals.length&&vals.every(v=>v<=0)&&vals.some(v=>v<0)&&!Q.pcs.some(o=>!o.rm)&&!Q.dnq.length;
  const it={id:A.newId(T),kind:'sel',v:1,aspects:asps.slice(),line:p.line,zone:{m0:p.m0,m1:p.m1},tr:[{m0:p.m0,m1:p.m1}],m:r1((p.m0+p.m1)/2),where,short:aspList(asps)+' · '+where+' : '+txt,
    label:p.name+' — '+aspList(asps)+' ('+where+') : '+txt,qty:Q.q,dnq:Q.dnq.length?Q.dnq:undefined,pcs:Q.pcs.map(o=>({k:o.k,c:o.c,m:o.m,mr:o.mr!=null?o.mr:undefined,rm:o.rm||undefined})),geo:Q.geo.slice(0,40),neg:neg||undefined,
    estim:(asps.includes('soud')&&p.est.soud)||(asps.includes('trace')&&p.est.ml)||undefined,sig:sigOf(p,asps,p.raw),etat,ts:ts||'',desig:desig||'',located:true,...A.now(),photos:[]};
  T.items.push(it);return it;}
function cleanGroups(){const T=A.ts();if(!T)return;T.items.filter(g=>g.kind==='group').forEach(g=>{const ms=(g.members||[]).filter(id=>T.items.some(x=>x.id===id));g.members=ms;if(!ms.length)T.items=T.items.filter(x=>x!==g);else if(ms.length===1)A.dissolve(g.id);});}
/* une marque 'sel' encore juste ? (le tracé a pu changer depuis) — recalculée sur son tronçon, comparée à ce qu'elle a compté (sans les déductions) */
function fresh(it){if(!it||!it.zone||!it.sig)return true;const R=compute(it.line,it.zone.m0,it.zone.m1);if(!R)return false;return sameSig(sigOf(R,it.aspects||[]),it.sig);}
function recalc(id){const T=A.ts();const it=T&&T.items.find(x=>x.id===id&&x.kind==='sel');if(!it)return false;const C=selCompute([{line:it.line,m0:it.zone.m0,m1:it.zone.m1}]);const p=C.parts[0];if(!p)return false;
  const Q=partQ(p,it.aspects||[]);const txt=labelOf(p,it.aspects||[],Q);Object.assign(it,{qty:Q.q,dnq:Q.dnq.length?Q.dnq:undefined,pcs:Q.pcs.map(o=>({k:o.k,c:o.c,m:o.m,mr:o.mr!=null?o.mr:undefined,rm:o.rm||undefined})),geo:Q.geo.slice(0,40),sig:sigOf(p,it.aspects||[],p.raw),short:aspList(it.aspects||[])+' · '+whereOf(p)+' : '+txt,label:p.name+' — '+aspList(it.aspects||[])+' ('+whereOf(p)+') : '+txt,recalcAt:new Date().toISOString()});
  if(it.grp){const g=T.items.find(x=>x.id===it.grp);if(g)g.qty=A.sumQty(A.members(g));}A.save();return true;}
// ───────────────────────── étendue d'une modif (pour la présélectionner) ─────────────────────────
function extentOf(o,isCand){if(!o)return [];const l=A.lines()[o.line];if(o.kind==='group')return (A.members(o)||[]).flatMap(m=>extentOf(m,false));if(!l||o.gone)return [];const L=A.len(l);const cl=(a,b)=>({line:o.line,m0:r1(Math.max(0,a)),m1:r1(Math.min(L,b))});
  if(o.kind==='sel'&&o.zone)return [cl(o.zone.m0,o.zone.m1)];if(o.kind==='range')return [cl(+o.m0,+o.m1)];if(o.kind==='line')return [cl(0,L)];
  if(o.kind==='dn'&&(o.dnq||[]).length)return o.dnq.map(Q=>cl(Q.m0,Q.m1));if(o.zone)return [cl(o.zone.m0-3,o.zone.m1+3)];
  const pk=[];(o.pcs||[]).forEach(p=>pk.push(p.rm&&p.mr!=null?+p.mr:+p.m));(o.geo||[]).forEach(g=>{pk.push(A.pkOnLine(o.line,g[0]));pk.push(A.pkOnLine(o.line,g[1]));});if(o.m!=null&&!isCand)pk.push(+o.m);
  if(pk.length)return [cl(Math.min(...pk)-3,Math.max(...pk)+3)];return [cl(0,L)];}
// ───────────────────────── mode (barre, plan) ─────────────────────────
function start(o){o=o||{};if(!A.can('ts.qualify')){A.toast('Réservé au chef / bureau');return false;}if(!A.marche()){A.toast('Fige d\'abord le tracé marché (onglet Modifications)');return false;}if(!A.tsLines().length){A.toast('Aucun réseau');return false;}
  const from=o.from||A.state.tab;A.endOtherPoses();SS.on=true;SS.tool='tr';SS.a=null;SS.lasso=null;SS.undo=[];SS.note='';SS.from=from;SS.tr=(o.tr||[]).filter(t=>t&&A.lines()[t.line]&&A.inScope(t.line)).map(t=>({line:t.line,m0:r1(t.m0),m1:r1(t.m1)}));merge();
  A.state.tab='plan';A.closeSheet();A.renderAll();if(SS.tr.length)fitSel();bar();A.toast(SS.tr.length?'Sélection posée : ajuste-la, puis « Qualifier la sélection »':'Touche le DÉBUT puis la FIN du tronçon (ou ⭕ entoure une zone)');return true;}
function end(silent){if(!SS.on)return;SS.on=false;SS.a=null;SS.lasso=null;SS.tr=[];SS.undo=[];SS.note='';bar();const back=SS.from==='ts'&&!silent;if(back)A.state.tab='ts';if(!silent)A.renderAll();else A.renderPlan();}
function selBox(tr){let x0=1e15,y0=1e15,x1=-1e15,y1=-1e15;const bump=q=>{if(!q)return;x0=Math.min(x0,q.x);y0=Math.min(y0,q.y);x1=Math.max(x1,q.x);y1=Math.max(y1,q.y);};
  tr.forEach(t=>{const l=A.lines()[t.line];if(!l)return;const n=Math.max(2,Math.min(24,Math.ceil((t.m1-t.m0)/10)));for(let i=0;i<=n;i++)bump(A.pos(l,t.m0+(t.m1-t.m0)*i/n));});return x1>=x0?[x0,y0,x1,y1]:null;}
function fitSel(){const b=selBox(SS.tr);if(b)A.fit(b);}
function refresh(){bar();A.renderPlan();}
function chipsHTML(){if(!SS.tr.length)return '';const L=SS.tr.slice(0,4).map(t=>{const i=SS.tr.indexOf(t);return `<span class="tsbChip"><b>${esc(lineName(t.line))}</b> ${isWhole(t)?'entière':'PK '+A.fmt(t.m0)+' → '+A.fmt(t.m1)} <span class="dim">(${A.fmt(t.m1-t.m0)} m)</span><button data-tsb="rm" data-i="${i}" title="retirer ce tronçon">✕</button></span>`;}).join('');
  return `<div class="tsbChips">${L}${SS.tr.length>4?`<span class="tsbChip dim">+ ${SS.tr.length-4} tronçon${SS.tr.length-4>1?'s':''}</span>`:''}</div>`;}
function msgHTML(){const fine=typeof matchMedia==='function'&&matchMedia('(pointer:fine)').matches;
  if(SS.tool==='line')return 'Touche une conduite : <b>toute la ligne</b> est prise (re-touche pour l\'enlever).';
  if(SS.tool==='lasso')return `<b>Dessine ${fine?'à la souris':'au doigt'}</b> autour de la zone : les conduites à l'intérieur sont prises${fine?'':' (2 doigts : zoom)'}.`;
  if(SS.a)return `Début : <b>${esc(lineName(SS.a.line))} · PK ${A.fmt(SS.a.m)}</b> — touche la <b>fin</b> sur la même conduite.`;
  return 'Touche la conduite au <b>début</b> du tronçon, puis à la <b>fin</b>. Plusieurs tronçons possibles, sur plusieurs lignes.';}
function bar(){let el=document.getElementById('tsSelBar');if(!SS.on){if(el)el.style.display='none';return;}
  if(!el){const host=document.getElementById('canvas')||document.body;el=document.createElement('div');el.id='tsSelBar';host.appendChild(el);bindBar(el);}
  const tot=SS.tr.reduce((s,t)=>s+(t.m1-t.m0),0);const tb=(v,lab,tt)=>`<button class="tsbT${SS.tool===v?' on':''}" data-tsb="tool" data-v="${v}" title="${tt}">${lab}</button>`;
  el.style.display='flex';el.innerHTML=`<div class="tsbH"><b>✍ Qualifier sur le plan</b><span class="tsbLeg"><i class="tsbLy"></i>écart · <i class="tsbLp">+</i><i class="tsbLm">−</i> pièce · <i class="tsbLs"></i>sélection</span><button class="tsbEnd" data-tsb="end">Terminer</button></div>
    ${SS.note?`<div class="tsbNote">${SS.note}</div>`:''}<div class="tsbMsg">${msgHTML()}</div>
    <div class="tsbTools">${tb('tr','〰 Tronçon','début puis fin sur une conduite')}${tb('line','▬ Ligne<span class="tsbLg"> entière</span>','toute la conduite touchée')}${tb('lasso','⭕ Entourer','dessiner un contour autour de la zone')}${SS.undo.length?'<button class="tsbT" data-tsb="undo" title="annuler le dernier ajout">↶</button>':''}${SS.tr.length?'<button class="tsbT" data-tsb="clear">Vider</button>':''}</div>
    ${chipsHTML()}<button class="tsbGo" data-tsb="go" ${SS.tr.length?'':'disabled'}>${SS.tr.length?`Qualifier la sélection (${A.fmt(r1(tot))} m) ›`:'Qualifier la sélection ›'}</button>`;}
function bindBar(el){['pointerdown','touchstart','wheel'].forEach(ev=>el.addEventListener(ev,e=>e.stopPropagation(),{passive:true}));
  el.addEventListener('click',e=>{const b=e.target.closest('[data-tsb]');if(!b)return;const d=b.dataset;e.stopPropagation();
    if(d.tsb==='end'){end(false);return;}if(d.tsb==='tool'){SS.tool=d.v;SS.a=null;SS.lasso=null;drawLasso();bar();A.renderPlan();return;}
    if(d.tsb==='undo'){const u=SS.undo.pop();if(u)SS.tr=u;SS.a=null;refresh();return;}if(d.tsb==='clear'){if(SS.tr.length){SS.undo.push(SS.tr.map(t=>({...t})));SS.tr=[];}SS.a=null;refresh();return;}
    if(d.tsb==='rm'){const i=+d.i;if(SS.tr[i]){SS.undo.push(SS.tr.map(t=>({...t})));SS.tr.splice(i,1);}refresh();return;}if(d.tsb==='go'){openPanel();return;}});}
/* repères sur le plan pendant la sélection : ce qui reste à qualifier (pas de pastilles) — pièces ajoutées « + », retirées « − » (à leur place sur le marché), tronçons qui changent de DN ; la sélection en bleu */
function overlay(k){if(!SS.on)return '';let s='';const M=A.marche();const mx=id=>M&&(M.lines||[]).find(y=>y.id===id);
  try{(A.cands()||[]).forEach(c=>{const l=A.lines()[c.line];if(!l)return;
    (c.dnq||[]).forEach(Q=>A.trPath({line:c.line,m0:Q.m0,m1:Q.m1}).forEach(pl=>{s+=`<path d="${A.pathD(pl)}" stroke="#eb6834" stroke-width="${3/k}" fill="none" stroke-dasharray="${9/k} ${6/k}" opacity=".95"/>`;}));
    if((c.dnq||[]).length){const Q=c.dnq[0];const q=A.pos(l,(Q.m0+Q.m1)/2);if(q){const t=`DN ${Q.from}→${Q.to}`;const w=t.length*6.2+12;s+=`<g transform="translate(${q.x} ${q.y}) scale(${1/k})" style="pointer-events:none"><rect x="${-w/2}" y="12" width="${w}" height="16" rx="8" fill="#fff" stroke="#eb6834" stroke-width="1.2"/><text y="24" font-size="10" font-weight="800" text-anchor="middle" fill="#a8461f" font-family="system-ui,sans-serif">${t}</text></g>`;}}
    (c.pcs||[]).forEach(p=>{let q=null;if(p.rm){const x=mx(c.line);if(x&&x.axis){const a=atOnAxis(x.axis,+p.m);if(a)q={x:a[0],y:a[1]};}if(!q&&p.mr!=null)q=A.pos(l,+p.mr);}else q=A.pos(l,+p.m);if(!q)return;const F=p.rm?['#dff5e3','#1d5c1d','−']:['#ffe08a','#8a6400','+'];
      s+=`<g transform="translate(${q.x} ${q.y}) scale(${1/k})" style="pointer-events:none"><circle r="7.5" fill="${F[0]}" stroke="${F[1]}" stroke-width="1.4"/><text y="4" font-size="11" font-weight="900" text-anchor="middle" fill="${F[1]}" font-family="system-ui,sans-serif">${F[2]}</text></g>`;});});}catch(e){console.warn('tssel',e);}
  SS.tr.forEach(t=>{A.trPath({line:t.line,m0:t.m0,m1:t.m1}).forEach(pl=>{const d=A.pathD(pl);s+=`<path d="${d}" stroke="#1c5bd6" stroke-width="${16/k}" fill="none" opacity=".28" stroke-linecap="round" pointer-events="none"/><path d="${d}" stroke="#1c5bd6" stroke-width="${2.6/k}" fill="none" pointer-events="none"/>`;});
    const l=A.lines()[t.line];[t.m0,t.m1].forEach(m=>{const q=A.pos(l,m);if(q)s+=`<circle cx="${q.x}" cy="${q.y}" r="${6/k}" fill="#1c5bd6" stroke="#fff" stroke-width="${2/k}" pointer-events="none"/>`;});});
  if(SS.a){const l=A.lines()[SS.a.line];const q=l&&A.pos(l,SS.a.m);if(q)s+=`<circle cx="${q.x}" cy="${q.y}" r="${9/k}" fill="#1c3d6b" stroke="#fff" stroke-width="${2/k}" pointer-events="none"/><g transform="translate(${q.x} ${q.y}) scale(${1/k})" style="pointer-events:none"><text y="-14" font-size="10.5" font-weight="800" text-anchor="middle" fill="#1c3d6b" stroke="#fff" stroke-width="3" paint-order="stroke" font-family="system-ui,sans-serif">début · PK ${A.fmt(SS.a.m)}</text></g>`;}
  const P=SS.lasso&&SS.lasso.pts;if(P&&P.length>1)s+=`<path id="tsSelLasso" d="M ${P.map(q=>q[0]+' '+q[1]).join(' L ')} Z" fill="rgba(28,91,214,.12)" stroke="#1c5bd6" stroke-width="${2.2/k}" stroke-dasharray="${7/k} ${5/k}" pointer-events="none"/>`;
  return s;}
// ───────────────────────── fenêtre « Qualifier la sélection » ─────────────────────────
let PS=null;
function openPanel(){if(!SS.tr.length){A.toast('Sélectionne d\'abord un tronçon');return;}const C=selCompute(SS.tr);const pre={},preTxt={};let desig='',ts='';
  ASP.forEach(a=>{const x=C.conf.repl.find(y=>y.asp.includes(a.k));if(x&&C.rows[a.k].has){const o=x.owner;pre[a.k]=E_LAB[o.etat]?o.etat:null;preTxt[a.k]='n°'+A.numOf(o)+' '+(A.ET[o.etat]||o.etat)+(o.ts?' · '+o.ts:'');if(A.isTS(o.etat)){if(!ts&&o.ts)ts=o.ts;if(!desig&&o.desig)desig=o.desig;}}});
  PS={C,choice:{...pre},preTxt,desig,ts,allE:'propose'};A.openModal(panelHTML());syncPanel();}
function chip(a,e){const on=(PS.choice[a]||'')===e;const col=e?A.COL[e]:'#6f6b63';return `<button class="tssE${on?' on':''}" data-tspe="${a}:${e}" style="${on?`background:${col};border-color:${col};color:#fff`:''}">${e?E_LAB[e]:'Plus tard'}</button>`;}
function panelHTML(){const C=PS.C;const has=ASP.filter(a=>C.rows[a.k].has),no=ASP.filter(a=>!C.rows[a.k].has);const box=selBox(C.tr);let vig='';try{if(box){const pad=Math.max(8,(box[2]-box[0])*.08,(box[3]-box[1])*.08);vig=A.boxSVG([box[0]-pad,box[1]-pad,box[2]+pad,box[3]+pad]);const sw=Math.max(0.6,Math.max(box[2]-box[0]+2*pad,box[3]-box[1]+2*pad)*.022);const sel=C.tr.map(t=>A.trPath({line:t.line,m0:t.m0,m1:t.m1}).map(pl=>`<path d="${A.pathD(pl)}" stroke="#1c5bd6" stroke-width="${sw}" fill="none" opacity=".3" stroke-linecap="round"/>`).join('')).join('');if(vig&&sel)vig=vig.replace(/<\/svg>\s*$/,sel+'</svg>');}}catch(e){} /* la sélection en bleu sur la vignette marché (gris) → réel (rouge) */
  const selT=C.parts.slice(0,6).map(p=>`<b>${esc(p.name)}</b> ${whereOf(p)} <span class="dim">(${A.fmt(p.m1-p.m0)} m)</span>`).join(' · ')+(C.parts.length>6?` · + ${C.parts.length-6} tronçons`:'');
  const rowH=a=>{const R=C.rows[a.k];return `<div class="tssRow" data-tsrow="${a.k}"><div class="tssRh"><span class="tssIc">${a.ic}</span><b>${esc(a.lab)}</b></div><div class="tssQ">${esc(rowTxt(a.k,R))}</div>${PS.preTxt[a.k]?`<div class="tssPre">déjà qualifié ici : ${esc(PS.preTxt[a.k])} — repris</div>`:''}<div class="tssEs">${E_ORD.map(e=>chip(a.k,e)).join('')}${chip(a.k,'')}</div></div>`;};
  const owners=[...new Map(C.conf.repl.map(x=>[x.owner.id,x.owner])).values()];const keeps=C.conf.keep.filter(x=>x.used);
  const det=C.parts.map(p=>`<div class="tssDet"><b>${esc(p.name)}</b> ${whereOf(p)} : ${p.isNew?'ligne absente du marché : tout son contenu est ajouté':`linéaire réel ${A.fmt(p.info.mlR)} m / marché ${A.fmt(p.info.mlM)} m ${p.est.ml?'<b class="tssWarn">≈ un bout du tronçon est sur une partie déviée : pose-le là où le tracé n\'a pas changé pour un linéaire exact</b>':'(exact)'} · soudures réel ${p.info.soudR}${p.info.soudM!=null?' / marché '+p.info.soudM+' (exact)':' / marché ≈ (estimé : le marché n\'a pas mémorisé la position de ses soudures)'}${p.info.dnpUnknown?' · DN du marché non mémorisé sur cette ligne : pas de changement de DN calculable':''}`}</div>`).join('');
  return `<div id="tssPanel"><h3 style="margin:0 0 4px">Qualifier la sélection</h3><div class="tssSel">${selT}</div>${vig?`<div class="tssVig">${vig}</div>`:''}
   ${has.length?`<div class="tssIntro">Ce qui a changé <b>dans la sélection</b> (réel − marché) — choisis pour <b>chaque nature</b> :</div>${has.map(rowH).join('')}
     <div class="tssAll"><span class="dim">Tout d'un coup :</span>${E_ORD.map(e=>`<button class="tssE" data-tspall="${e}">${E_LAB[e]}</button>`).join('')}</div>`
    :`<div class="okbox" style="margin:8px 0">Rien n'a changé par rapport au marché dans cette sélection.</div>`}
   ${no.length&&has.length?`<div class="dim tssNo">Sans changement ici : ${no.map(a=>ASP_SHORT[a.k]).join(', ')}.</div>`:''}
   ${C.parts.some(p=>p.est&&p.est.pcs)?`<div class="warnbox" style="margin:6px 0;font-size:12.5px">Pièces et coudes <b>non localisables</b> sur une partie de ligne (marché figé sans la position des pièces) : sélectionne la <b>ligne entière</b> pour les qualifier.</div>`:''}
   <div class="tssTS" style="display:none"><div class="row" style="gap:8px;flex-wrap:wrap;display:flex"><div style="flex:2;min-width:180px"><label class="f">Désignation <span class="dim">(TS : obligatoire)</span></label><input class="f" id="tssDesig" value="${esc(PS.desig)}" placeholder="ex. changement de DN rue de la Gare" style="width:100%"></div><div style="flex:1;min-width:130px"><label class="f">N° de devis <span class="dim">(TS : obligatoire)</span></label><input class="f" id="tssDevis" value="${esc(PS.ts)}" placeholder="ex. DEV-2026-045" style="width:100%"></div></div><div class="dim" style="font-size:12px;margin-top:2px">La désignation et le devis vont sur les natures qualifiées en TS ; compris et pour mémoire n'en ont pas besoin.</div></div>
   ${owners.length?`<div class="warnbox tssConf"><b>Déjà qualifié dans la sélection :</b> ${owners.map(o=>`n°${A.numOf(o)} ${esc(A.ET[o.etat]||o.etat)}${o.ts?' · '+esc(o.ts):''}${o.kind==='group'?' (groupe)':''}`).join(' · ')}. C'est repris ci-dessus ; à la validation ces modifs sont <b>remplacées</b> par ce que tu choisis (ce qu'elles couvraient hors de ta sélection redevient « à qualifier »).</div>`:''}
   ${keeps.length?`<div class="infobox tssKeep">À part (qualifié depuis sa fiche, déduit d'ici) : ${keeps.map(x=>`n°${A.numOf(x.owner)} ${esc(qTxt(x.it.qty||{}))}`).join(' · ')}.</div>`:''}
   <details class="tssD"><summary>Comment c'est compté</summary>${det}<div class="dim" style="margin-top:4px">Pièces : appariées entre le réel et le marché (une pièce déplacée sur la même ligne ne compte pas) ; une réduction au bord d'un changement de DN va avec le DN. Soudures et manchons : toutes causes confondues (tracé, pièces, DN).</div></details>
   <details class="tssD"><summary>Autre : compter TOUT le contenu de la sélection (reprise complète d'un tronçon)</summary><div class="row" style="gap:6px;flex-wrap:wrap;margin-top:6px;display:flex;align-items:center"><select class="f" id="tssAllEtat">${E_ORD.map(e=>`<option value="${e}" ${e==='propose'?'selected':''}>${esc(A.ET[e])}</option>`).join('')}</select><button class="btn sm" data-tssall="1">Compter tout le contenu</button></div><div class="dim" style="font-size:12px;margin-top:4px">Tout ce que le tronçon contient (ml, soudures), pas seulement l'écart avec le marché — comme « Déclarer un tronçon modifié ».</div></details>
   <div class="actions"><button class="btn" data-close>Annuler</button><button class="btn primary" id="tssOk" ${has.length?'':'disabled'}>✓ Qualifier</button></div></div>`;}
function nQual(){const set=new Set();ASP.forEach(a=>{const e=PS.choice[a.k];if(e&&PS.C.rows[a.k].has)set.add(e);});return set;}
function syncPanel(){const root=document.getElementById('tssPanel');if(!root||!PS)return;
  root.querySelectorAll('[data-tsrow]').forEach(row=>{const a=row.dataset.tsrow;row.querySelectorAll('[data-tspe]').forEach(b=>{const e=b.dataset.tspe.split(':')[1];const on=(PS.choice[a]||'')===e;b.classList.toggle('on',on);const col=e?A.COL[e]:'#6f6b63';b.style.background=on?col:'';b.style.borderColor=on?col:'';b.style.color=on?'#fff':'';});row.classList.toggle('set',!!PS.choice[a]);});
  const E=nQual();const anyTS=[...E].some(e=>A.isTS(e));const tsBox=root.querySelector('.tssTS');if(tsBox)tsBox.style.display=anyTS?'':'none';
  const ok=root.querySelector('#tssOk');if(ok){const n=E.size;const asp=ASP.filter(a=>PS.choice[a.k]&&PS.C.rows[a.k].has).length;ok.disabled=!n;ok.textContent=n?`✓ Qualifier (${asp} nature${asp>1?'s':''}${n>1?' → '+n+' modifs':''})`:'✓ Qualifier';}}
function commit(){const C=PS.C;const T=A.ts();if(!T)return;const groups={};ASP.forEach(a=>{const e=PS.choice[a.k];if(!e||!C.rows[a.k].has)return;(groups[e]=groups[e]||[]).push(a.k);});
  if(!Object.keys(groups).length){A.toast('Choisis une qualification pour au moins une nature');return;}
  const desig=((document.getElementById('tssDesig')||{}).value||PS.desig||'').trim(),ts=((document.getElementById('tssDevis')||{}).value||PS.ts||'').trim();
  if(Object.keys(groups).some(e=>A.isTS(e))&&(!desig||!ts)){A.toast('Un TS demande une désignation ET un n° de devis');const f=document.getElementById(!desig?'tssDesig':'tssDevis');if(f)f.focus();return;}
  C.conf.repl.forEach(x=>{if(T.items.includes(x.it))A.remove(x.it.id);});cleanGroups();
  const made=[];E_ORD.forEach(etat=>{const asps=groups[etat];if(!asps)return;const isTS=A.isTS(etat);const its=[];
    C.parts.forEach(p=>{if(!asps.some(a=>partHas(p,a)))return;its.push(newSel(p,asps.filter(a=>partHas(p,a)),etat,isTS?ts:'',isTS?desig:''));});
    if(its.length>1){const g=A.group(its.map(it=>({item:it})),etat);if(g){g.ts=isTS?ts:'';g.desig=isTS?desig:'';const names=[...new Set(its.map(it=>lineName(it.line)))];g.short='Sélection · '+aspList(asps)+' · '+names.join(', ');g.label='Sélection ('+names.join(', ')+') — '+aspList(asps)+' : '+(qTxt(g.qty||{})||'voir le détail');made.push(g);}}
    else if(its.length)made.push(its[0]);});
  A.save();A.closeModal();const nums=made.map(m=>`n°${A.numOf(m)} ${E_LAB[m.etat]||m.etat}`);SS.note='✓ '+nums.join(' · ')+' — continue (nouvelle sélection) ou « Terminer »';SS.tr=[];SS.a=null;SS.undo=[];PS=null;A.renderAll();bar();A.toast('Qualifié : '+nums.join(' · '));return made;}
function commitAll(){const C=PS.C;const T=A.ts();if(!T)return;const etat=(document.getElementById('tssAllEtat')||{}).value||'propose';const isTS=A.isTS(etat);const desig=((document.getElementById('tssDesig')||{}).value||'').trim(),ts=((document.getElementById('tssDevis')||{}).value||'').trim();
  if(isTS&&(!desig||!ts)){const box=document.querySelector('#tssPanel .tssTS');if(box)box.style.display='';A.toast('Un TS demande une désignation ET un n° de devis');return;}
  C.conf.repl.forEach(x=>{if(T.items.includes(x.it))A.remove(x.it.id);});cleanGroups();const its=[];C.parts.forEach(p=>{const it=A.markRange(p.line,p.m0,p.m1,{etat,ts:isTS?ts:'',label:desig});if(it){if(desig&&isTS)it.desig=desig;its.push(it);}});
  let made=its[0]||null;if(its.length>1){const g=A.group(its.map(it=>({item:it})),etat);if(g){g.ts=isTS?ts:'';g.desig=isTS?desig:'';made=g;}}A.save();A.closeModal();SS.note=made?`✓ n°${A.numOf(made)} ${E_LAB[etat]} (tout le contenu)`:'';SS.tr=[];SS.a=null;PS=null;A.renderAll();bar();return made;}
function bindModal(){const m=document.getElementById('modal');if(!m||m._tss)return;m._tss=true;
  m.addEventListener('click',e=>{if(!PS||!document.getElementById('tssPanel'))return;const b=e.target.closest('[data-tspe],[data-tspall],#tssOk,[data-tssall]');if(!b)return;
    if(b.dataset.tspe!==undefined){const [a,v]=b.dataset.tspe.split(':');PS.choice[a]=v||null;syncPanel();return;}
    if(b.dataset.tspall){ASP.forEach(a=>{if(PS.C.rows[a.k].has)PS.choice[a.k]=b.dataset.tspall;});syncPanel();return;}
    if(b.id==='tssOk'){commit();return;}if(b.dataset.tssall){commitAll();return;}});
  m.addEventListener('input',e=>{if(!PS)return;if(e.target.id==='tssDesig')PS.desig=e.target.value;if(e.target.id==='tssDevis')PS.ts=e.target.value;});}
const CSS=`#tsSelBar{position:absolute;top:8px;left:50%;transform:translateX(-50%);z-index:8;display:none;flex-direction:column;gap:6px;background:#1c3d6b;color:#fff;border-radius:16px;padding:9px 11px;width:600px;max-width:calc(100% - 16px);box-sizing:border-box;box-shadow:0 8px 24px rgba(0,0,0,.32);font-size:13px;line-height:1.35}
#tsSelBar .tsbH{display:flex;align-items:center;gap:8px;flex-wrap:wrap}#tsSelBar .tsbH>b{font-size:14px}#tsSelBar .tsbLeg{flex:1;min-width:0;font-size:11.5px;opacity:.9;display:inline-flex;align-items:center;gap:4px;flex-wrap:wrap}
#tsSelBar .tsbLy{display:inline-block;width:16px;height:7px;border-radius:4px;background:#ffe08a}#tsSelBar .tsbLs{display:inline-block;width:16px;height:7px;border-radius:4px;background:#5d8ff0}
#tsSelBar .tsbLp,#tsSelBar .tsbLm{display:inline-flex;align-items:center;justify-content:center;width:15px;height:15px;border-radius:50%;font-style:normal;font-weight:900;font-size:11px}#tsSelBar .tsbLp{background:#ffe08a;color:#8a6400}#tsSelBar .tsbLm{background:#dff5e3;color:#1d5c1d}
#tsSelBar .tsbEnd{margin-left:auto;background:#fff;color:#1c3d6b;border:0;border-radius:10px;padding:8px 12px;font-weight:700;min-height:40px;cursor:pointer}
#tsSelBar .tsbNote{background:#2f8a3a;border-radius:10px;padding:6px 9px;font-weight:600}#tsSelBar .tsbMsg{opacity:.97}
#tsSelBar .tsbTools{display:flex;gap:6px;flex-wrap:wrap}#tsSelBar .tsbT{background:rgba(255,255,255,.12);color:#fff;border:1px solid rgba(255,255,255,.35);border-radius:10px;padding:8px 11px;min-height:44px;font-weight:600;font-size:13px;cursor:pointer}#tsSelBar .tsbT.on{background:#fff;color:#1c3d6b;border-color:#fff}
#tsSelBar .tsbChips{display:flex;gap:5px;flex-wrap:wrap;max-height:84px;overflow:auto}#tsSelBar .tsbChip{background:#fff;color:#1c3d6b;border-radius:999px;padding:3px 4px 3px 10px;font-size:12px;display:inline-flex;align-items:center;gap:4px}#tsSelBar .tsbChip .dim{color:#5b6b80}
#tsSelBar .tsbChip button{border:0;background:#e6edf8;color:#1c3d6b;border-radius:50%;width:28px;height:28px;font-weight:800;cursor:pointer}
#tsSelBar .tsbGo{background:#eb6834;color:#fff;border:0;border-radius:12px;padding:10px 12px;min-height:48px;font-weight:800;font-size:14px;cursor:pointer}#tsSelBar .tsbGo:disabled{background:rgba(255,255,255,.2);color:rgba(255,255,255,.75);cursor:default}
#tssPanel .tssSel{font-size:13px;margin-bottom:6px;line-height:1.5}#tssPanel .tssVig .tsSvg{width:100%;height:170px!important}#tssPanel .tssIntro{margin:8px 0 6px;font-size:13.5px}
#tssPanel .tssRow{border:1px solid #e1ded6;border-radius:12px;padding:8px 10px;margin:6px 0;background:#fff}#tssPanel .tssRow.set{border-color:#b9c9e2;background:#f7f9fd}#tssPanel .tssRh{display:flex;align-items:center;gap:6px;font-size:13.5px}#tssPanel .tssIc{font-size:16px;width:20px;text-align:center}
#tssPanel .tssQ{font-size:13px;margin:3px 0 6px 26px;line-height:1.4}#tssPanel .tssPre{font-size:12px;color:#6b4bd6;margin:-2px 0 6px 26px}#tssPanel .tssEs,#tssPanel .tssAll{display:flex;gap:5px;flex-wrap:wrap;margin-left:26px;align-items:center}#tssPanel .tssAll{margin:8px 0 4px}
#tssPanel .tssE{border:1px solid #cfcbc2;background:#fff;border-radius:10px;padding:7px 10px;min-height:40px;font-size:12.5px;font-weight:600;cursor:pointer;color:#24221f}#tssPanel .tssE.on{font-weight:800}
#tssPanel .tssNo{font-size:12.5px;margin:4px 0}#tssPanel .tssTS{margin:8px 0;padding:8px 10px;border:1px solid #f0c9a8;background:#fff8f2;border-radius:12px}#tssPanel .tssConf,#tssPanel .tssKeep{margin:8px 0;font-size:12.5px}
#tssPanel details.tssD{margin:6px 0;font-size:12.5px}#tssPanel details.tssD summary{cursor:pointer}#tssPanel .tssDet{margin:4px 0;line-height:1.45}#tssPanel .tssWarn{color:#a8461f}
@media(max-width:600px){#tsSelBar{top:4px;padding:8px;border-radius:14px;gap:5px;font-size:12.5px}#tsSelBar .tsbLeg,#tsSelBar .tsbLg{display:none}#tsSelBar .tsbT{padding:7px 9px;font-size:12.5px}#tsSelBar .tsbEnd{padding:7px 10px}#tsSelBar .tsbGo{min-height:46px;padding:8px 10px}#tssPanel .tssQ,#tssPanel .tssEs,#tssPanel .tssPre{margin-left:0}}`;
export function initTsSel(api){A=api;try{const st=document.createElement('style');st.id='css-tssel-2810';st.textContent=CSS;document.head.appendChild(st);}catch(e){}try{bindModal();}catch(e){}
  return {state:SS,on:()=>SS.on,tool:()=>SS.tool,start,end,tap,lassoStart,lassoMove,lassoEnd,lassoCancel,lassoApply:P=>{const n=lassoApply(P);refresh();return n;},overlay,bar,compute,selCompute,fresh,recalc,extentOf,openPanel,commit:()=>commit(),
    choose:(a,e)=>{if(PS){PS.choice[a]=e||null;syncPanel();}},panel:()=>PS,addRange:(l,a,b)=>{const ok=addRange(l,a,b);refresh();return ok;},ASP,icons:it=>(it.aspects||[]).map(a=>(ASPK[a]||{}).ic||'').join(''),aspList};}
