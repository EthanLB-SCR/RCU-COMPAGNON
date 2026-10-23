// mouvements.js — VISION LOGISTIQUE DES VÉHICULES (20/10/2026, lot VM). Ethan : « il doit aussi y avoir une grande vision logistique : qui a quoi, quel changement ; sur un
// gars l'historique de tous ses véhicules et différentes déclarations ; sur un véhicule l'historique de ses conducteurs et déclarations ».
// Ici : le MODÈLE des mouvements lu dans les enregistrements (« vrec » : état des lieux de sortie « laissé » { a, quand, pris, contest, arbitre }, entrées, premiers états des
// lieux ; « vehicule » : laisse, switch / switchHist) — y compris ceux d'hier (lot VH : memoire, redoDe / remplacePar, switchId seuls) — et les deux vues de Parc → Flotte :
// « ↔ Mouvements » (fil chronologique de toutes les déclarations, filtres, compteurs) et « Qui a quoi » (par véhicule : conducteur, situation, attendu, retard, 🖨 A4).
// Les écrans d'action (laisser, prendre, contester, trancher, changement déclaré) sont dans reception2.js. Rien n'est écrit ici : lecture seule.
import {regAll,regGet} from './reg.js';
import {vehAll,vehGet,vehPic,flotteVue,flotteState,vehTypeLabel} from './flotte.js';
import {esc,dFR,dhFR,recsOf,todayIso} from './reception.js';
import {docHTML} from './charte.js';
export const daysSince=x=>{if(!x)return 0;const s=String(x);const t=Date.parse(/^\d{4}-\d{2}-\d{2}$/.test(s)?s+'T12:00:00':s);return isNaN(t)?0:Math.max(0,Math.floor((Date.now()-t)/864e5));};
const jl=x=>'J+'+daysSince(x);
const court=(s,n)=>{s=String(s||'');return s.length>(n||60)?s.slice(0,(n||60)-1)+'…':s;};
/* ── état des lieux de sortie (« laissé ») d'un véhicule ── */
export const exitRecs=immat=>recsOf(immat).filter(r=>r.type==='restitution'&&r.lache&&!r.remplacePar);
export const pendingExits=()=>regAll('vrec').filter(r=>r.type==='restitution'&&r.lache&&!r.remplacePar&&!r.pris&&!r.contest&&!r.valide); /* attendent la signature du preneur (r.valide : validé par un responsable, modèle d'hier) */
export const lacheRec=v=>{if(!v)return null;const L=exitRecs(v.immat);const byId=v.laisse&&v.laisse.recId?L.find(r=>r.id===v.laisse.recId):null;return byId||L.find(r=>!r.pris&&!r.contest)||null;};
export const prisRec=v=>v&&v.conducteurKey?recsOf(v.immat).find(r=>!r.remplacePar&&((r.type==='restitution'&&r.lache&&r.pris&&r.pris.par===v.conducteurKey)||(r.type==='reception'&&r.conducteurKey===v.conducteurKey)))||null:null; /* la dernière entrée du conducteur actuel : sa signature « exact » sur la sortie d'un collègue, ou son propre état des lieux */
export const prisOnly=v=>{const r=prisRec(v);return r&&r.type==='restitution'?r:null;}; /* véhicule pris par signature (pas d'état des lieux à son nom) */
export const contestOpen=immat=>recsOf(immat).find(r=>r.contest&&!r.arbitre&&!r.remplacePar)||null;
export const contestsOpen=()=>regAll('vrec').filter(r=>r.contest&&!r.arbitre&&!r.remplacePar);
export const contreRec=r=>r&&r.contest&&r.contest.recId?regGet('vrec',r.contest.recId):null;
export const redoAsked=r=>!!(r&&r.arbitre&&r.arbitre.decision==='redo'&&(()=>{const c=contreRec(r);return !c||!c.remplacePar;})()); /* nouvel état des lieux demandé, pas encore refait */
/* ── changement de conducteur déclaré : sortie (état des lieux de l'ancien), entrée (signature du nouveau sur la sortie, ou son propre état des lieux), état dérivé ── */
export const swExitAny=v=>v&&v.switch?recsOf(v.immat).find(r=>r.switchId===v.switch.id&&r.type==='restitution'&&!r.remplacePar)||null:null; /* sortie de l'ancien, quelle qu'elle soit (hier : restitution « de mémoire » sans « lache ») */
export const swExit=v=>{const r=swExitAny(v);return r&&r.lache?r:null;}; /* sortie « laisser un véhicule » : le nouveau la signe (pris) ou la conteste */
export const swEntry=v=>v&&v.switch?recsOf(v.immat).find(r=>r.switchId===v.switch.id&&r.type==='reception'&&!r.remplacePar)||null:null;
export const swForced=v=>!!(v&&v.switch&&(v.switch.force||(!v.switch.etat&&v.switch.nouveau&&v.conducteurKey&&v.conducteurKey===v.switch.nouveau.key))); /* hier : le véhicule passait tout de suite sur le nouveau */
export function swEtat(v){const sw=v&&v.switch;if(!sw)return null;if(sw.etat==='clos'||sw.etat==='annule')return sw.etat;const ex=swExit(v),exA=swExitAny(v),en=swEntry(v);const onY=!!(sw.nouveau&&v.conducteurKey&&v.conducteurKey===sw.nouveau.key);
  if(onY&&((ex&&(ex.pris||ex.contest))||(en&&(en.valide||(!en.aValider&&!en.refus)))))return 'pris';if(exA)return 'laisse';return 'prevu';} /* prevu : rien reçu · laisse : l'ancien a fait sa sortie · pris : le nouveau a signé (terminé) */
export const swOpen=v=>!!(v&&v.switch&&!['pris','clos','annule'].includes(swEtat(v)));
export const swDone=v=>!!(v&&v.switch&&swEtat(v)==='pris'); /* terminé mais pas encore classé (le nouveau conducteur n'écrit pas la clé « switch » : un responsable classe en un clic) */
export const swLate=v=>!!(v&&v.switch&&daysSince(v.switch.depuis||v.switch.at)>=2); /* rouge à J+2 après la date prévue */
export const swStarted=v=>!!(v&&v.switch&&String(v.switch.depuis||v.switch.at).slice(0,10)<=todayIso());
/* ce qui est attendu sur un changement en cours : [{qui, quoi, key, at (depuis quand), fait}] */
export function swAttendu(v){const sw=v&&v.switch;if(!sw)return [];const ex=swExit(v),exA=swExitAny(v),en=swEntry(v);const L=[];
  const an=sw.ancien&&sw.ancien.nom||'l\'ancien conducteur',nv=sw.nouveau&&sw.nouveau.nom||'le nouveau conducteur';
  L.push({key:sw.ancien&&sw.ancien.key||'',qui:an,quoi:'état des lieux de sortie',lab:'état des lieux de sortie de '+an,fait:exA?exA.at:null,sorti:!!exA,nonFait:!exA&&!!en});
  if(exA&&!ex)L.push({key:sw.nouveau&&sw.nouveau.key||'',qui:nv,quoi:'état des lieux d\'entrée',lab:'état des lieux de '+nv,fait:en?en.at:null,aValider:!!(en&&en.aValider)}); /* hier : sortie « de mémoire » sans signature possible → le nouveau fait le sien */
  else L.push({key:sw.nouveau&&sw.nouveau.key||'',qui:nv,quoi:ex?'signature (valider l\'état des lieux de '+an+')':'signature, après l\'état des lieux de sortie',lab:'signature de '+nv,fait:ex&&ex.pris?ex.pris.at:ex&&ex.contest?ex.contest.at:en?en.at:null,contest:!!(ex&&ex.contest),aValider:!!(en&&en.aValider)});
  return L;}
/* ── compteurs (en-tête du fil, hub, tuile « À savoir ») ── */
export function mvCounters(){const C={edl:[],sig:[],contest:[],sansPreneur:[]};const seen=new Set();
  vehAll().forEach(v=>{if(swOpen(v)){const sw=v.switch;const ex=swExit(v),exA=swExitAny(v),en=swEntry(v);const since=sw.depuis&&sw.depuis>sw.at.slice(0,10)?sw.depuis:sw.at;
      if(!exA&&!en)C.edl.push({immat:v.immat,key:sw.ancien&&sw.ancien.key||'',nom:sw.ancien&&sw.ancien.nom||'',since,j:daysSince(since),fut:String(since).slice(0,10)>todayIso()?String(since).slice(0,10):null,late:swLate(v)&&swStarted(v),why:'état des lieux de sortie (changement déclaré par '+(sw.declarePar||'')+')',lab:'état des lieux de sortie de '+(sw.ancien&&sw.ancien.nom||'')});
      else if(ex&&!ex.pris&&!ex.contest){seen.add(ex.id);C.sig.push({immat:v.immat,key:sw.nouveau&&sw.nouveau.key||'',nom:sw.nouveau&&sw.nouveau.nom||'',since:ex.at,j:daysSince(ex.at),late:daysSince(ex.at)>=2,why:'signature sur l\'état des lieux de '+(ex.conducteurNom||''),lab:'signature de '+(sw.nouveau&&sw.nouveau.nom||'')+' (état des lieux de '+(ex.conducteurNom||'')+')',rec:ex.id});}
      else if(en&&en.aValider)C.sig.push({immat:v.immat,key:en.aValider.par||'',nom:en.aValider.nom||'',since:en.at,j:daysSince(en.at),late:daysSince(en.at)>=2,why:'validation de l\'état des lieux de '+(en.conducteurNom||''),lab:'validation par '+(en.aValider.nom||'')+' (état des lieux de '+(en.conducteurNom||'')+')',rec:en.id});
      else if(exA&&!ex&&!en)C.edl.push({immat:v.immat,key:sw.nouveau&&sw.nouveau.key||'',nom:sw.nouveau&&sw.nouveau.nom||'',since:exA.at,j:daysSince(exA.at),late:daysSince(exA.at)>=2,why:'état des lieux d\'entrée (changement déclaré par '+(sw.declarePar||'')+')',lab:'état des lieux de '+(sw.nouveau&&sw.nouveau.nom||'')});}
    if(v.laisse&&!v.conducteurKey&&!v.conducteur&&!v.laisse.aKey&&daysSince(v.laisse.at)>7)C.sansPreneur.push({immat:v.immat,nom:v.laisse.par||'',since:v.laisse.at,j:daysSince(v.laisse.at),ou:v.laisse.ou||''});});
  pendingExits().forEach(r=>{if(seen.has(r.id))return;const v=vehGet(r.vehId);if(v&&v.conducteurKey&&v.conducteurKey!==r.conducteurKey&&!(v.switch&&r.switchId===v.switch.id))return; /* le véhicule a changé de main autrement */
    C.sig.push({immat:r.immat||r.vehId,key:r.a&&r.a.key||'',nom:r.a?r.a.nom:'qui le prendra',since:r.at,j:daysSince(r.at),late:daysSince(r.at)>=2&&!!r.a,why:'signature sur l\'état des lieux de '+(r.conducteurNom||''),lab:(r.a?'signature de '+r.a.nom:'un preneur')+' (état des lieux de '+(r.conducteurNom||'')+')',rec:r.id,libre:!r.a});});
  regAll('vrec').forEach(r=>{if(r.remplacePar)return;if(r.contest&&!r.arbitre)C.contest.push({immat:r.immat||r.vehId,par:r.conducteurNom||'',pris:r.contest.nom||'',since:r.contest.at,j:daysSince(r.contest.at),motif:r.contest.motif||'',rec:r.id});
    if(redoAsked(r))C.edl.push({immat:r.immat||r.vehId,key:r.contest&&r.contest.par||'',nom:r.contest&&r.contest.nom||'',since:r.arbitre.at,j:daysSince(r.arbitre.at),late:daysSince(r.arbitre.at)>=2,why:'nouvel état des lieux demandé par '+(r.arbitre.nom||''),lab:'nouvel état des lieux de '+(r.contest&&r.contest.nom||'')+' (demandé par '+(r.arbitre.nom||'')+')',rec:r.id});});
  C.n=C.edl.length+C.sig.length;return C;}
/* ── le fil : TOUTES les déclarations, triées du plus récent au plus ancien ── */
export function mvEvents(){const E=[];const P=(at,o)=>{if(at)E.push(Object.assign({at:String(at)},o));};
  regAll('vrec').forEach(r=>{if(!r||!r.vehId)return;const im=r.immat||r.vehId;const X=r.conducteurNom||'';const Xk=r.conducteurKey||'';const sw=r.switchId?' · changement déclaré par '+(r.declarePar||'un responsable'):'';
    if(r.type==='restitution'&&r.lache){const to=r.a?r.a.nom:'qui le prendra';const par=X+(r.rempliPar&&r.rempliPar.nom&&r.rempliPar.nom!==X?' (noté par '+r.rempliPar.nom+')':'');
      P(r.lache.at||r.at,{k:'laisse',c:!!r.contest,immat:im,who:[Xk,r.a&&r.a.key,r.rempliPar&&r.rempliPar.key],t:'Laissé par '+par+' à '+to+(r.lache.ou?' · '+r.lache.ou:'')+(r.quand&&r.quand>String(r.at).slice(0,10)?' · prévu le '+dFR(r.quand):'')+(r.memoire?' · de mémoire':'')+sw,
        st:r.pris?'ok':r.contest?(r.arbitre?'ok':'contest'):r.valide?'ok':'attente',s:r.pris?'signé « exact » par '+(r.pris.nom||'')+' le '+dFR(r.pris.at):r.contest?'contesté par '+(r.contest.nom||'')+(r.arbitre?' · tranché par '+(r.arbitre.nom||''):' · à trancher'):r.valide?(r.valide.sansPrise?'état des lieux validé par '+(r.valide.nom||'')+' · véhicule laissé '+(r.valide.ou||r.lache.ou||'sur place')+', à prendre':'validé par '+(r.valide.nom||'')+' (modèle d\'hier)'):'attend la signature de '+to+' · '+jl(r.at),rec:r.id});
      if(r.valide&&r.valide.sansPrise)P(r.valide.at,{k:'valide',immat:im,who:[r.valide.par,Xk],t:'État des lieux de '+X+' validé par '+(r.valide.nom||'')+' sans prendre le véhicule — reste '+(r.valide.ou||r.lache.ou||'sur place')+(r.pris?'':', à prendre'),st:'ok',rec:r.id}); /* 23/10 */
      if(r.pris)P(r.pris.at,{k:'pris',immat:im,who:[r.pris.par,Xk],t:'Pris par '+(r.pris.nom||'')+' : état des lieux de '+X+' signé « exact »',st:'ok',rec:r.id});
      if(r.contest)P(r.contest.at,{k:'contest',c:true,immat:im,who:[r.contest.par,Xk],t:'Contesté par '+(r.contest.nom||'')+' : « '+court(r.contest.motif,90)+' »',st:r.arbitre?'ok':'contest',s:r.arbitre?'':'à trancher par un responsable · '+jl(r.contest.at),rec:r.id});
      if(r.arbitre)P(r.arbitre.at,{k:'arbitre',c:true,immat:im,who:[r.arbitre.par,r.contest&&r.contest.par,Xk],t:'Tranché par '+(r.arbitre.nom||'')+' : '+(r.arbitre.decision==='redo'?'nouvel état des lieux demandé à '+(r.contest&&r.contest.nom||''):'vu — clôturé')+(r.arbitre.note?' · « '+court(r.arbitre.note,90)+' »':''),st:'ok',rec:r.id});
      if(r.refus)P(r.refus.at,{k:'refus',immat:im,who:[r.refus.par,Xk],t:'Refusé par '+(r.refus.nom||'')+' : « '+court(r.refus.motif,90)+' »'+(r.remplacePar?' (repris)':''),st:'contest',rec:r.id});}
    else if(r.type==='restitution')P(r.at,{k:'resti',immat:im,who:[Xk,r.responsableKey],t:r.memoire?'État des lieux de sortie de mémoire par '+X+sw:'Restitution par '+X+' (reçue par '+(r.responsableNom||r.by||'')+')',st:'ok',s:r.diff&&r.diff.n?r.diff.n+' différence'+(r.diff.n>1?'s':''):'',rec:r.id});
    else{const lab=r.contreDe?'Contre-état des lieux de '+X+' (conteste l\'état des lieux de sortie)':r.premier?'Premier état des lieux de '+X:r.redoDe&&(regGet('vrec',r.redoDe)||{}).contreDe?'Nouvel état des lieux de '+X+' (demandé après contestation)':r.switchId?'État des lieux d\'entrée de '+X+sw+(r.sortieNonFaite?' · sortie de '+(r.sortieNonFaite.nom||'')+' non faite':''):r.sansResponsable?'État des lieux de '+X+' (seul)':'Remise par '+(r.responsableNom||r.by||'')+' à '+X;
      P(r.at,{k:'rec',c:!!r.contreDe,immat:im,who:[Xk,r.responsableKey,r.aValider&&r.aValider.par],t:lab,st:r.refus?'contest':r.aValider?'attente':'ok',s:r.aValider?'à valider par '+(r.aValider.nom||'')+' · '+jl(r.at):r.valide?'validé par '+(r.valide.nom||'')+' le '+dFR(r.valide.at):r.refus?'refusé par '+(r.refus.nom||'')+' : « '+court(r.refus.motif,80)+' »'+(r.remplacePar?' (repris)':''):r.contreDe?'':r.sansResponsable?'':'deux signatures sur place',rec:r.id});}});
  vehAll().forEach(v=>{const all=(v.switchHist||[]).map(s=>Object.assign({},s,{_h:true})).concat(v.switch?[v.switch]:[]);all.forEach(s=>{if(!s||!s.at)return;const et=s._h?(s.etat||'clos'):swEtat(v);const an=s.ancien&&s.ancien.nom||'—',nv=s.nouveau&&s.nouveau.nom||'—';const who=[s.ancien&&s.ancien.key,s.nouveau&&s.nouveau.key,s.declareKey];
      const att=!s._h&&swOpen(v)?swAttendu(v).filter(a=>!a.fait).map(a=>a.lab).join(' · '):'';
      P(s.at,{k:'switch',immat:v.immat,who,t:'Changement déclaré par '+(s.declarePar||'')+' : '+an+' → '+nv+' à partir du '+dFR(s.depuis||s.at)+(s.ou?' · '+s.ou:'')+(s.note?' · « '+court(s.note,80)+' »':''),st:et==='annule'?'info':et==='prevu'||et==='laisse'?'attente':'ok',s:et==='annule'?'annulé':et==='pris'?'terminé'+(s._h?'':' · à classer'):et==='clos'?'clos':'attendu : '+(att||'…')+(String(s.depuis||'').slice(0,10)>todayIso()?'':' · '+jl(s.depuis||s.at)),sw:s.id}); /* date à venir : le titre dit « à partir du … », pas de « J+0 » */
      if(s.force&&s.forceAt)P(s.forceAt,{k:'force',immat:v.immat,who,t:'Attribué sans attendre par '+(s.forcePar||s.declarePar||'')+' : '+nv+' a le véhicule, formulaires toujours attendus',st:'ok',sw:s.id});
      if(s._h&&s.closedAt)P(s.closedAt,{k:'swclos',immat:v.immat,who,t:et==='annule'?'Changement annulé par '+(s.closedBy||'')+' : '+an+' garde le véhicule':'Changement '+an+' → '+nv+(s.valide?' validé':' clos')+' par '+(s.closedBy||'')+(s.sortieNonFaite?' · état des lieux de sortie de '+an+' non fait':''),st:et==='annule'?'info':'ok',sw:s.id});});});
  return E.sort((a,b)=>b.at.localeCompare(a.at));}
/* noms : clé → nom (annuaire, puis ce que portent les enregistrements) */
export function nomsMap(people){const M={};(people||[]).forEach(p=>{if(p&&p.id)M[p.id]=((p.prenom||'')+' '+(p.nom||'')).trim()||p.name||p.id;});
  regAll('vrec').forEach(r=>{const put=(k,n)=>{if(k&&n&&!M[k])M[k]=n;};put(r.conducteurKey,r.conducteurNom);put(r.pris&&r.pris.par,r.pris&&r.pris.nom);put(r.contest&&r.contest.par,r.contest&&r.contest.nom);put(r.a&&r.a.key,r.a&&r.a.nom);put(r.valide&&r.valide.par,r.valide&&r.valide.nom);put(r.aValider&&r.aValider.par,r.aValider&&r.aValider.nom);});
  vehAll().forEach(v=>{if(v.conducteurKey&&v.conducteur&&!M[v.conducteurKey])M[v.conducteurKey]=v.conducteur;(v.switchHist||[]).concat(v.switch?[v.switch]:[]).forEach(s=>{if(!s)return;[s.ancien,s.nouveau].forEach(p=>{if(p&&p.key&&p.nom&&!M[p.key])M[p.key]=p.nom;});});});return M;}
const STC={attente:['#fff4d6','#7a5200','⏳'],contest:['#fdeae7','#9b2c22','⚠'],ok:['#e6f5ec','#15673a','✓'],info:['#ececea','#52514e','·']};
export function mvLine(e,o){o=o||{};const [bg,fg,ic]=STC[e.st]||STC.info;const v=o.veh!==false?`<b>${esc(e.immat)}</b> · `:'';
  return `<div class="eq-row mv-row"><span class="mv-ic" style="background:${bg};color:${fg}">${ic}</span><span class="eq-grow"><span class="eq-t">${dFR(e.at)} · ${v}${esc(e.t)}</span>${e.s?`<span class="eq-s" style="color:${e.st==='attente'||e.st==='contest'?fg:'inherit'}">${esc(e.s)}</span>`:''}</span>${o.btn||''}</div>`;}
/* ── filtres de la vue (état de l'écran) ── */
const MV={veh:'',pers:'',per:'30',att:false,cont:false,q:''};
export const mvState=()=>MV;
function mvFilter(E,team){const lim=MV.per==='all'?null:(()=>{const d=new Date();d.setDate(d.getDate()-(+MV.per||30));return d.toISOString();})();
  return E.filter(e=>(!lim||e.at>=lim)&&(!MV.veh||e.immat===MV.veh)&&(!MV.pers||(e.who||[]).includes(MV.pers))&&(!MV.att||e.st==='attente'||e.st==='contest')&&(!MV.cont||e.c||e.st==='contest')&&(!team||(e.who||[]).some(k=>k&&team.has(k))||(()=>{const v=vehGet(e.immat);return !!(v&&v.conducteurKey&&team.has(v.conducteurKey));})()));}
const sel=(name,val,opts,all)=>`<select class="f mv-sel" data-xin="veh|mv~${name}"><option value="">${esc(all)}</option>${opts.map(([k,l])=>`<option value="${esc(k)}"${val===k?' selected':''}>${esc(l)}</option>`).join('')}</select>`;
export function mvCountersHTML(C,o){o=o||{};const who=L=>L.slice(0,3).map(x=>x.nom||x.par||'').filter(Boolean).join(', ')+(L.length>3?'…':'');
  const tile=(n,l,s,k)=>`<div class="ac-stat ${n?(k||'warn'):'ok'}"><b>${n}</b><small>${esc(l)}</small>${s?`<small class="mv-who">${esc(s)}</small>`:''}</div>`;
  return `<div class="ac-stats mv-stats">${tile(C.edl.length,'état'+(C.edl.length>1?'s':'')+' des lieux attendu'+(C.edl.length>1?'s':''),who(C.edl),C.edl.some(x=>x.late)?'bad':'warn')}${tile(C.sig.length,'signature'+(C.sig.length>1?'s':'')+' attendue'+(C.sig.length>1?'s':''),who(C.sig),C.sig.some(x=>x.late)?'bad':'warn')}${tile(C.contest.length,'contesté'+(C.contest.length>1?'s':''),who(C.contest.map(x=>({nom:x.immat}))),'bad')}${tile(C.sansPreneur.length,'laissé'+(C.sansPreneur.length>1?'s':'')+' sans preneur > 7 j',who(C.sansPreneur.map(x=>({nom:x.immat}))))}</div>`;}
/* « ↔ Mouvements » : compteurs, filtres, fil ; o = {people, team (Set de clés : lecture d'un chef sur son équipe), btn(e) → bouton d'action, head → html en plus (ex. déclarer un changement) } */
export function mvHTML(o){o=o||{};const C=mvCounters();const E=mvFilter(mvEvents(),o.team||null);const M=nomsMap(o.people);const vehs=[...new Set(mvEvents().map(e=>e.immat))].sort();const pers=[...new Set(mvEvents().flatMap(e=>e.who||[]).filter(Boolean))].map(k=>[k,M[k]||k]).sort((a,b)=>a[1].localeCompare(b[1]));
  const chip=(on,act,l)=>`<button class="chip${on?' active':''}" data-act="x" data-v="veh|mv|${act}">${l}</button>`;
  return `${mvCountersHTML(C)}${o.head||''}
    <div class="mv-filtres"><div class="eq-filtres">${chip(MV.per==='7','per~7','7 jours')}${chip(MV.per==='30','per~30','30 jours')}${chip(MV.per==='90','per~90','3 mois')}${chip(MV.per==='all','per~all','Tout')}${chip(MV.att,'att','⏳ en attente seulement')}${chip(MV.cont,'cont','⚠ contestés')}</div>
    <div class="veh-row mv-sels">${sel('veh',MV.veh,vehs.map(x=>[x,x]),'Tous les véhicules')}${sel('pers',MV.pers,pers,'Tout le monde')}</div></div>
    <div class="card mv-feed">${E.length?E.map(e=>mvLine(e,{btn:o.btn?o.btn(e):''})).join(''):'<div class="eq-s">Aucune déclaration pour ces filtres.</div>'}</div>
    <div class="hint">Chaque ligne = une déclaration datée : laissé par / à / où, pris et signé, contesté, tranché, changement déclaré, attribué sans attendre, premier état des lieux, remise, annulé. « En attente » = il manque une signature, un état des lieux ou une décision.</div>`;}
/* ── « Qui a quoi » : par véhicule → conducteur actuel (depuis le …), situation, attendu (qui, retard), vignette ; tri par retard ── */
export function quiRows(){const C=mvCounters();const byIm=k=>C[k].filter(x=>x.immat);
  return vehAll().map(v=>{const r=prisRec(v);const dep=v.depuis||(r?(r.type==='restitution'?r.pris.at:r.at):null);const ex=lacheRec(v);const co=contestOpen(v.immat);let sit='',sev='';
    if(co)sit='contesté : laissé par '+(co.conducteurNom||'')+', pris par '+(co.contest.nom||'')+' le '+dFR(co.contest.at),sev='bad';
    else if(swOpen(v)){const sw=v.switch;sit='changement en cours : '+(sw.ancien&&sw.ancien.nom||'—')+' → '+(sw.nouveau&&sw.nouveau.nom||'—')+' (déclaré par '+(sw.declarePar||'')+', à partir du '+dFR(sw.depuis||sw.at)+')'+(swForced(v)?' · attribué sans attendre':'');sev='warn';}
    else if(v.laisse&&!v.conducteurKey&&!v.conducteur)sit='laissé par '+(v.laisse.par||'')+' à '+(v.laisse.aNom||'qui le prendra')+' · '+(v.laisse.ou||'')+' · '+jl(v.laisse.at),sev=v.laisse.aKey?'warn':daysSince(v.laisse.at)>7?'bad':'';
    else if(v.conducteur||v.conducteurKey)sit='attitré';else sit='libre';
    const att=[].concat(byIm('edl').filter(x=>x.immat===v.immat).map(x=>({t:x.lab||x.why,j:x.j,late:x.late,fut:x.fut})),byIm('sig').filter(x=>x.immat===v.immat).map(x=>({t:x.lab||x.why,j:x.j,late:x.late})),byIm('contest').filter(x=>x.immat===v.immat).map(x=>({t:'décision d\'un responsable',j:x.j,late:x.j>=2})));
    const retard=Math.max(0,...att.map(x=>x.j),co?daysSince(co.contest.at):0,(!v.conducteurKey&&!v.conducteur&&v.laisse)?daysSince(v.laisse.at):0);
    return {v,dep,sit,sev:att.some(x=>x.late)||co?'bad':sev,att,retard};}).sort((a,b)=>(b.retard-a.retard)||(b.att.length-a.att.length)||String(a.v.immat).localeCompare(String(b.v.immat)));}
export function quiHTML(o){o=o||{};const R=quiRows();const n=R.filter(x=>x.att.length).length;
  return `<div class="hint" style="margin:0 0 6px">${R.length} véhicule${R.length>1?'s':''} · ${n?n+' avec quelque chose d\'attendu (en tête, tri par retard)':'rien d\'attendu'}.</div>
    ${R.map(x=>`<div class="card mv-qui ${x.sev}"><div class="veh2-row"><span class="veh2-pic">${vehPic(x.v,84,{name:false})}</span><div class="veh2-tx"><b>${esc(x.v.immat)} · ${esc(x.v.marque||'')} ${esc(x.v.modele||'')}</b><div class="eq-s">${x.v.conducteur?'🧑 <b>'+esc(x.v.conducteur)+'</b>'+(x.dep?' · depuis le '+dFR(x.dep):''):'<span style="color:#7a5200">sans conducteur</span>'} · ${esc(x.sit)}</div>
      ${x.att.length?`<div class="eq-s" style="color:${x.sev==='bad'?'#9b2c22':'#7a5200'}">attendu : ${x.att.map(a=>esc(a.t)+(a.fut?' (prévu le '+dFR(a.fut)+')':' (J+'+a.j+')')).join(' · ')}</div>`:''}</div><button class="btn sm" data-act="fl" data-v="open|${esc(x.v.immat)}">Fiche</button></div></div>`).join('')||'<div class="card"><div class="eq-s">Aucun véhicule.</div></div>'}
    <div class="eq-acts" style="margin-top:6px"><button class="btn" data-act="x" data-v="veh|quiprint|">🖨 Imprimer (A4)</button></div>`;}
export function quiDocHTML(){const R=quiRows();const rows=R.map(x=>`<tr><td><b>${esc(x.v.immat)}</b><br><span class="muted">${esc(x.v.marque||'')} ${esc(x.v.modele||'')} · ${esc(vehTypeLabel(x.v))}</span></td><td>${x.v.conducteur?esc(x.v.conducteur)+(x.dep?'<br><span class="muted">depuis le '+dFR(x.dep)+'</span>':''):'<span class="muted">—</span>'}</td><td>${esc(x.sit)}</td><td class="${x.sev==='bad'?'ko':''}">${x.att.map(a=>esc(a.t)+(a.fut?' (prévu le '+dFR(a.fut)+')':' (J+'+a.j+')')).join('<br>')||'—'}</td></tr>`).join('');
  const C=mvCounters();return docHTML({title:'Qui a quoi — parc véhicules',h1:'Qui a quoi',kicker:'Parc véhicules · situation du '+dFR(new Date()),sub:R.length+' véhicules · '+C.edl.length+' état(s) des lieux attendu(s) · '+C.sig.length+' signature(s) attendue(s) · '+C.contest.length+' contesté(s)',meta:[['Date',dhFR(new Date())],['Véhicules',String(R.length)],['Attendus',String(C.n)]],body:`<table><tr><th>Véhicule</th><th>Conducteur</th><th>Situation</th><th>Attendu</th></tr>${rows}</table>`,css:'td{vertical-align:top;font-size:11px}td.ko{color:#9b2c22;font-weight:700}'});}
/* ── historique d'un véhicule : ses conducteurs (du … au …) ── */
export function conducteursDe(v){if(!v)return [];const ev=[];const push=(at,key,nom,k,how)=>{if(at&&(key||nom))ev.push({at:String(at),key:key||'',nom:nom||key||'',k,how});};
  recsOf(v.immat).forEach(r=>{if(r.remplacePar)return;if(r.type==='reception'){const x=r.contreDe?regGet('vrec',r.contreDe):null;push(r.at,r.conducteurKey,r.conducteurNom,'in',r.contreDe?'a contesté l\'état des lieux de '+(x&&x.conducteurNom||'')+' (contre-état des lieux)':r.premier?'premier état des lieux':r.switchId?'état des lieux d\'entrée':r.sansResponsable?'état des lieux seul':'remise par '+(r.responsableNom||r.by||''));}
    else{if(!r.memoire&&!(r.lache&&r.lache.libre))push(r.lache&&r.lache.at||r.at,r.conducteurKey,r.conducteurNom,'out',r.lache?'laissé à '+(r.a?r.a.nom:'qui le prendra'):'restitution'); /* un responsable qui laisse un véhicule LIBRE (dépôt) n'en était pas le conducteur */
      if(r.pris)push(r.pris.at,r.pris.par,r.pris.nom,'in','a signé l\'état des lieux de '+(r.conducteurNom||''));if(r.contest&&!r.contest.recId)push(r.contest.at,r.contest.par,r.contest.nom,'in','a contesté l\'état des lieux de '+(r.conducteurNom||''));}});
  (v.switchHist||[]).concat(v.switch?[v.switch]:[]).forEach(s=>{if(!s)return;const at=s.forceAt||(!s.etat&&s.at); /* hier : le véhicule passait tout de suite sur le nouveau */if(at&&s.nouveau)push(at,s.nouveau.key,s.nouveau.nom,'in','attribué sans attendre par '+(s.forcePar||s.declarePar||''));
    if(at&&s.etat==='annule'&&s.closedAt&&s.ancien&&(s.ancien.key||s.ancien.nom))push(s.closedAt,s.ancien.key,s.ancien.nom,'in','changement annulé par '+(s.closedBy||''));}); /* attribué sans attendre puis annulé : l'ancien reprend le véhicule */
  ev.sort((a,b)=>a.at.localeCompare(b.at));const P=[];let cur=null;const same=(a,b)=>a&&b&&((a.key&&b.key&&a.key===b.key)||(!a.key||!b.key)&&a.nom.toLowerCase()===b.nom.toLowerCase());
  ev.forEach(e=>{if(e.k==='in'){if(cur&&!same(cur,e)){cur.fin=e.at;cur.finHow='';P.push(cur);cur=null;}if(!cur)cur={key:e.key,nom:e.nom,debut:e.at,how:e.how};}
    else if(cur&&same(cur,e)){cur.fin=e.at;cur.finHow=e.how;P.push(cur);cur=null;}
    else if(!cur&&!P.length)P.push({key:e.key,nom:e.nom,debut:null,fin:e.at,how:'',finHow:e.how});}); /* conducteur d'avant l'appli (import du parc), sans état des lieux : de « date inconnue » à sa sortie */
  if(cur)P.push(cur);
  const last=P[P.length-1];const isCur=p=>!!p&&!p.fin&&((v.conducteurKey&&p.key===v.conducteurKey)||(!v.conducteurKey&&String(v.conducteur||'').toLowerCase()===String(p.nom||'').toLowerCase()));
  if((v.conducteur||v.conducteurKey)&&!isCur(last))P.push( /* conducteur posé hors appli (import, fiche modifiée à la main) ; une période restée ouverte sans être l'actuel s'affiche « du … » sans fin connue */{key:v.conducteurKey||'',nom:v.conducteur||v.conducteurKey,debut:null,how:'attribué (import du parc ou fiche)',cur:true});
  P.forEach(p=>{if(p.cur===undefined)p.cur=isCur(p);});
  return P.reverse();}
export function conducteursHTML(v){const P=conducteursDe(v);if(!P.length)return '';
  return `<div class="veh-hh"><b>Conducteurs</b><span>${P.length}</span></div>${P.map(p=>`<div class="eq-row"><span class="eq-grow"><span class="eq-t">${esc(p.nom)}${p.cur?' <span class="eq-tag" style="color:#15673a">actuel</span>':''}</span><span class="eq-s">${p.debut?'du '+dFR(p.debut):'depuis une date inconnue'}${p.fin?' au '+dFR(p.fin):p.cur?' à aujourd\'hui':''}${p.how?' · '+esc(p.how):''}${p.finHow?' · '+esc(p.finHow):''}</span></span></div>`).join('')}`;}
/* ── une personne : ses véhicules (actuel + précédents avec dates) et ses déclarations ── */
export function persVehs(key){const out=[];vehAll().forEach(v=>{conducteursDe(v).forEach(p=>{if(p.key===key)out.push({immat:v.immat,v,debut:p.debut,fin:p.fin,cur:!!p.cur,how:p.how,finHow:p.finHow});});
    if(v.conducteurKey===key&&!out.some(x=>x.immat===v.immat&&x.cur))out.push({immat:v.immat,v,debut:v.depuis||null,fin:null,cur:true,how:''});});
  return out.sort((a,b)=>(a.cur?0:1)-(b.cur?0:1)||String(b.debut||'').localeCompare(String(a.debut||'')));}
export function persEvents(key,n){return mvEvents().filter(e=>(e.who||[]).includes(key)).slice(0,n||8);}
export function persHTML(key,o){o=o||{};if(!key)return '';const V=persVehs(key);const E=persEvents(key,o.n||6);if(!V.length&&!E.length)return '';
  return `${V.length?`<div class="veh2-h">🚐 ${o.moi?'Mes véhicules':'Véhicules'}</div>${V.map(x=>`<div class="eq-row"><span class="eq-grow"><span class="eq-t">${esc(x.immat)} · ${esc(x.v.marque||'')} ${esc(x.v.modele||'')}${x.cur?' <span class="eq-tag" style="color:#15673a">actuel</span>':''}</span><span class="eq-s">${x.debut?'du '+dFR(x.debut):'depuis une date inconnue'}${x.fin?' au '+dFR(x.fin):x.debut?' à aujourd\'hui':''}${x.how?' · '+esc(x.how):''}${x.finHow?' · '+esc(x.finHow):''}</span></span>${o.fiche?`<button class="btn sm" data-act="fl" data-v="open|${esc(x.immat)}">Fiche</button>`:''}</div>`).join('')}`:''}
    ${E.length?`<div class="veh2-h">📋 ${o.moi?'Mes déclarations':'Déclarations'}</div>${E.map(e=>mvLine(e)).join('')}`:''}`;}
/* ── vues de Parc → Flotte (chips « ↔ Mouvements » et « Qui a quoi ») : l'hôte (flotte.js) rend le bandeau, reception2.js branche les boutons d'action ── */
let RENDER={mouv:null,qui:null};
export function mvViews(f){RENDER=Object.assign(RENDER,f||{});}
flotteVue('mouv','↔ Mouvements',ctx=>RENDER.mouv?RENDER.mouv(ctx):mvHTML({people:ctx.people}));
flotteVue('qui','🧑 Qui a quoi',ctx=>RENDER.qui?RENDER.qui(ctx):quiHTML({}));
export const openMouv=()=>{try{flotteState().view='mouv';flotteState().cur=null;}catch(e){}};
export const openQui=()=>{try{flotteState().view='qui';flotteState().cur=null;}catch(e){}};
/* ── 🕓 HISTORIQUE (23/10, Ethan : « quand je choisis un véhicule j'ai son historique ; je choisis un gars et j'ai l'historique des véhicules qu'il a eus ; je veux savoir à telle
   date ce que telle personne avait, ou tel véhicule qui l'avait tel jour ») — un véhicule et/ou une personne, et une date : la réponse du jour, puis les périodes et les déclarations. ── */
const HS={veh:'',pers:'',date:''};export const histState=()=>HS;
const endOf=d=>d?d+'T23:59:59':'9999';
const covers=(x,t)=>(!x.debut||String(x.debut)<=t)&&(!x.fin||String(x.fin)>t);
export function vehAt(v,date){const t=endOf(date);return conducteursDe(v).filter(p=>covers(p,t));} /* qui avait ce véhicule ce jour-là (fin de journée) */
export function persAt(key,date){const t=endOf(date);return persVehs(key).filter(x=>covers(x,t));} /* ce que cette personne avait ce jour-là */
export function laisseAt(v,date){const t=endOf(date);return recsOf(v.immat).find(r=>r.type==='restitution'&&r.lache&&!r.remplacePar&&String(r.lache.at||r.at)<=t&&(!r.pris||String(r.pris.at)>t))||null;} /* laissé (sans conducteur) ce jour-là */
const periode=x=>(x.debut?'du '+dFR(x.debut):'depuis une date inconnue')+(x.fin?' au '+dFR(x.fin):x.cur||!x.fin?' à aujourd\'hui':'');
export function histHTML(o){o=o||{};const M=nomsMap(o.people);const date=HS.date||todayIso();const V=HS.veh?vehGet(HS.veh):null;const K=HS.pers||'';
  const vehs=vehAll().slice().sort((a,b)=>String(a.immat).localeCompare(String(b.immat))).map(v=>[v.immat,v.immat+' · '+[v.marque,v.modele].filter(Boolean).join(' ')+(v.conducteur?' · '+v.conducteur:'')]);
  const keys=new Set(Object.keys(M));vehAll().forEach(v=>{conducteursDe(v).forEach(p=>{if(p.key){keys.add(p.key);if(!M[p.key]&&p.nom)M[p.key]=p.nom;}});});
  const pers=[...keys].map(k=>[k,M[k]||k]).sort((a,b)=>a[1].localeCompare(b[1],'fr'));
  const selH=(name,val,opts,all)=>`<select class="f mv-sel" data-xin="veh|hist~${name}"><option value="">${esc(all)}</option>${opts.map(([k,l])=>`<option value="${esc(k)}"${val===k?' selected':''}>${esc(l)}</option>`).join('')}</select>`;
  let ans='';
  if(V){const P=vehAt(V,date);const la=!P.length?laisseAt(V,date):null;
    ans+=`<div class="card"><h3 style="margin:0 0 4px">🚐 ${esc(V.immat)} <span class="hint">· ${esc([V.marque,V.modele].filter(Boolean).join(' '))}</span></h3>
      <div class="hist-ans">Le <b>${dFR(date)}</b> : ${P.length?P.map(p=>`<b>${esc(p.nom)}</b> <span class="eq-s">(${periode(p)}${p.how?' · '+esc(p.how):''})</span>`).join(' · '):la?`<b>sans conducteur</b> — laissé par ${esc(la.conducteurNom||'')} le ${dFR(la.lache.at||la.at)}${la.lache.ou?' · '+esc(la.lache.ou):''}${la.a?' · à '+esc(la.a.nom):''}`:'<b>aucun conducteur connu</b> ce jour-là'}</div>
      ${conducteursHTML(V)||'<div class="eq-s">Aucun conducteur enregistré.</div>'}
      ${(()=>{const E=mvEvents().filter(e=>e.immat===V.immat);return E.length?`<div class="veh-hh"><b>Déclarations</b><span>${E.length}</span></div>${E.slice(0,40).map(e=>mvLine(e,{veh:false})).join('')}`:'';})()}
      <div class="eq-acts" style="margin-top:6px"><button class="btn sm" data-act="fl" data-v="open|${esc(V.immat)}">Fiche du véhicule</button></div></div>`;}
  if(K){const P=persAt(K,date);const nom=M[K]||K;
    ans+=`<div class="card"><h3 style="margin:0 0 4px">🧑 ${esc(nom)}</h3>
      <div class="hist-ans">Le <b>${dFR(date)}</b> : ${P.length?P.map(x=>`<b>${esc(x.immat)}</b> ${esc([x.v.marque,x.v.modele].filter(Boolean).join(' '))} <span class="eq-s">(${periode(x)})</span>`).join(' · '):'<b>aucun véhicule</b> ce jour-là'}</div>
      ${persHTML(K,{n:40,fiche:true})||'<div class="eq-s">Aucun véhicule ni déclaration enregistrés.</div>'}</div>`;}
  if(!V&&!K){const rows=vehAll().slice().sort((a,b)=>String(a.immat).localeCompare(String(b.immat))).map(v=>{const P=vehAt(v,date);const la=!P.length?laisseAt(v,date):null;return {v,P,la};});const n=rows.filter(x=>x.P.length).length;
    ans+=`<div class="card"><h3 style="margin:0 0 4px">Qui avait quoi le ${dFR(date)} <span class="hint">· ${n} véhicule${n>1?'s':''} avec conducteur</span></h3>
      <table class="hist-tbl"><tr><th>Véhicule</th><th>Conducteur ce jour-là</th><th>Période</th></tr>${rows.map(({v,P,la})=>`<tr><td><button class="lnk" data-act="x" data-v="veh|hist|veh~${esc(v.immat)}"><b>${esc(v.immat)}</b></button><br><span class="eq-s">${esc([v.marque,v.modele].filter(Boolean).join(' '))}</span></td><td>${P.length?P.map(p=>p.key?`<button class="lnk" data-act="x" data-v="veh|hist|pers~${esc(p.key)}">${esc(p.nom)}</button>`:esc(p.nom)).join(', '):la?`<span class="eq-s">laissé ${esc(la.lache.ou||'')} par ${esc(la.conducteurNom||'')}</span>`:'<span class="eq-s">—</span>'}</td><td class="eq-s">${P.map(periode).join(' · ')}</td></tr>`).join('')}</table></div>`;}
  return `<div class="card"><div class="veh-row mv-sels hist-sels">${selH('veh',HS.veh,vehs,'Un véhicule…')}${selH('pers',HS.pers,pers,'Une personne…')}<label class="hist-date">le <input type="date" class="f" data-xin="veh|hist~date" value="${esc(date)}"></label>${(HS.veh||HS.pers)?`<button class="btn sm" data-act="x" data-v="veh|hist|clear">Tout le parc</button>`:''}</div>
    <div class="hint">Un véhicule : qui l'avait ce jour-là, ses conducteurs successifs, ses déclarations. Une personne : ce qu'elle avait ce jour-là, ses véhicules (actuel, précédents), ses déclarations. Rien de choisi : tout le parc à la date.</div></div>${ans}`;}
flotteVue('hist','🕓 Historique',ctx=>histHTML({people:ctx.people}));
export const openHist=(o)=>{o=o||{};HS.veh=o.veh||'';HS.pers=o.pers||'';if(o.date!==undefined)HS.date=o.date||'';try{flotteState().view='hist';flotteState().cur=null;}catch(e){}};
