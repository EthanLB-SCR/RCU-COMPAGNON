/* 03/11 (Nantes, Ethan : « ils ont aussi pointé des soudures après la modification, donc il faut rétablir sur les soudures initiales l'avancement et les photos initiales,
   mais sans effacer les nouvelles mises depuis ») — REPRISE DE L'AVANCEMENT D'UNE VERSION (⏱ Versions → « ↺ Avancement ») :
   une modification enregistrée avec l'ancien traceur a donné un numéro neuf aux soudures décalées ; leur avancement d'avant (états, photos, étapes, fils…) est resté sur
   l'ancien numéro, sorti du plan. On rapproche la version choisie du plan actuel (même appariement que le traceur : en place, puis décalées du même écart) ; pour chaque
   soudure qui a changé de numéro, ce qui était sur l'ancien numéro passe sur le numéro ACTUEL (celui que l'équipe utilise depuis), et ce qui a été déclaré depuis est gardé :
   l'avancement ne recule jamais (soudée < contrôlée < manchonnée ; « à reprendre » : la déclaration la plus récente), photos et historique additionnés.
   Rien n'est effacé : les lignes des anciens numéros restent au serveur ; le plan ne change pas. */
import {matchWeldIds,sigOf} from './weldmatch.js';
const RANK={a_souder:0,soudee:1,controlee:2,manchonnee:3};
function weldsBy(site){const o={};((site&&site.lines)||[]).forEach(L=>{if(!L||!L.cond)return;['A','R'].forEach(c=>{const cd=L.cond[c];if(!cd||!Array.isArray(cd.welds))return;
  o[L.id+'|'+c]={bar:+L.bar||12,ws:cd.welds.filter(w=>w&&w.weldId).map(w=>({m:+w.m||0,sig:sigOf(w.between),weldId:w.weldId}))};});});return o;}
export function rowHasData(r){const d=(r&&r.data)||{};return !!r&&((r.status&&r.status!=='a_souder')||(d.events||[]).length>0||(d.photos||[]).length>0||!!(d.steps&&Object.values(d.steps).some(s=>s&&s.done)));}
// cur : le chantier actuel (format sites), ver : la version choisie, rows : lignes de la table welds du chantier → [{from, to, line, cond, d, row}]
export function repriseMap(cur,ver,rows){const R={};(rows||[]).forEach(r=>{if(r&&r.weld_id)R[r.weld_id]=r;});const C=weldsBy(cur),V=weldsBy(ver);
  const onPlan=new Set();Object.values(C).forEach(x=>x.ws.forEach(w=>onPlan.add(w.weldId)));const out=[],taken=new Set();
  Object.keys(C).forEach(key=>{const N=C[key].ws;const P=((V[key]&&V[key].ws)||[]).map(w=>({...w,status:(R[w.weldId]||{}).status||'a_souder'}));if(!P.length||!N.length)return;
    const res=matchWeldIds(P,N,{dmax:C[key].bar+0.5});const [line,cond]=key.split('|');
    res.forEach((i,k)=>{if(i<0)return;const f=P[i].weldId,t=N[k].weldId;if(f===t||onPlan.has(f)||taken.has(f))return;const r=R[f];if(!rowHasData(r))return;taken.add(f);
      out.push({from:f,to:t,line,cond,d:+(N[k].m-P[i].m).toFixed(2),row:r});});});
  return out;}
const empty=v=>v===undefined||v===null||v===''||v===false;
// T : la soudure de l'appli (numéro actuel) ; row : la ligne serveur de l'ancien numéro → T complétée (rend T)
export function mergeInto(T,row,by,at){const d=(row&&row.data)||{};const fS=(row&&row.status)||'a_souder',tS=T.status||'a_souder';
  if(tS==='a_reprendre'||fS==='a_reprendre')T.status=tS!=='a_souder'?tS:fS;else T.status=(RANK[fS]||0)>(RANK[tS]||0)?fS:tS;
  const key=e=>[e.type||'',+new Date(e.at)||0,e.by||''].join('|');const seen=new Set();
  T.events=[...(d.events||[]).map(e=>({...e,at:new Date(e.at)})),...(T.events||[])].filter(e=>{const k=key(e);if(seen.has(k))return false;seen.add(k);return true;}).sort((a,b)=>new Date(a.at)-new Date(b.at));
  const ps=new Set();T.photos=[...(d.photos||[]),...(T.photos||[])].filter(p=>{const k=typeof p==='string'?p:JSON.stringify(p);if(ps.has(k))return false;ps.add(k);return true;});
  ['wire','conn','loopA','loopB','cont','iso','isoVal','extru','tee'].forEach(k=>{if(empty(T[k])&&!empty(d[k]))T[k]=d[k];});
  if(d.note&&!String(T.note||'').includes(d.note))T.note=T.note?d.note+' · '+T.note:d.note;
  if(d.steps&&typeof d.steps==='object'){const S=Array.isArray(d.steps)?d.steps.slice():{...d.steps};const Ts=T.steps||{};Object.keys(Ts).forEach(k=>{if(Ts[k]&&(Ts[k].done||!S[k]))S[k]=Ts[k];});T.steps=S;}
  if(!T.events.some(e=>e.type==='reprise'&&e.data&&e.data.de===row.weld_id))T.events.push({type:'reprise',by:by||'',at:at||new Date(),data:{de:row.weld_id},photos:[]});
  return T;}
