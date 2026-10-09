// scr.js — options SCR INTERNE (pas dans la version vendue aux clients), codées d'avance et DÉSACTIVÉES par défaut
// (panneau « ⏳ Nouveautés en attente » de l'accueil, interrupteurs 'pointage' et 'profil'). Cadrage Ethan du 07/10 :
//   POINTAGE : heures (début de journée géolocalisé, pause midi, reprise, fin — trace de l'endroit, sans flicage ; départ du chantier =
//              inter-chantier qui continue jusqu'à l'arrivée sur le suivant) + production automatique (ce que chacun déclare sur le plan),
//              déclaration après coup par le chef, validation chef PUIS conducteur de travaux (statuts validé / refusé-corrigé).
//   PROFIL   : compte opérateur — avatar aux couleurs de l'entreprise (type jeu vidéo, par poste), points / trophées / médailles
//              (manchons, soudures, pouces, jours au-dessus de la cadence de référence, signatures QSE modérées, pointage jamais contesté,
//              pause d'une heure bien prise), partie perso (heures pointées / validées) — la partie chantier reste l'appli.
import {nOn} from './next.js';
let A=null;
export function initScr(api){A=api;}
export function scrInject(mk){if(nOn('pointage'))mk('pointage','Pointage');if(nOn('profil'))mk('profil','Profil');}
export function scrRenderTab(tab){if(tab==='pointage'&&nOn('pointage')){renderPointage();return true;}if(tab==='profil'&&nOn('profil')){renderProfil();return true;}return false;}
const isoD=d=>d.getFullYear()+'-'+String(d.getMonth()+1).padStart(2,'0')+'-'+String(d.getDate()).padStart(2,'0');
const today=()=>isoD(new Date());
const hm=ms=>{const m=Math.round(ms/60000);return Math.floor(m/60)+' h '+String(m%60).padStart(2,'0');};
const tFR=x=>x?new Date(x).toLocaleTimeString('fr-FR',{hour:'2-digit',minute:'2-digit'}):'—';
const dFR=x=>x?new Date(x+(x.length===10?'T00:00':'')).toLocaleDateString('fr-FR'):'';
const norm=s=>String(s||'').trim().toLowerCase();
const sameName=(a,b)=>norm(a)===norm(b);
// ───────────────────────────── POINTAGE ─────────────────────────────
function ptOf(){const NET=A.net();if(!NET||NET.id==='__vide')return null;if(!NET.pointage||typeof NET.pointage!=='object')NET.pointage={days:{}};NET.pointage.days=NET.pointage.days||{};return NET.pointage;}
function ptEntry(P,day,name,create){const D=P.days[day]||(create?(P.days[day]={}):null);if(!D)return null;let e=Object.keys(D).find(k=>sameName(k,name));if(e)return D[e];if(!create)return null;D[name]={events:[],status:'declare',val:[],corr:null};return D[name];}
// géolocalisation ponctuelle : une trace de l'endroit, jamais un suivi (8 s maxi, sinon « sans position »)
function getPos(){return new Promise(res=>{if(!('geolocation' in navigator)){res(null);return;}let done=false;const fin=v=>{if(done)return;done=true;res(v);};
  try{navigator.geolocation.getCurrentPosition(p=>fin({lat:+p.coords.latitude.toFixed(5),lon:+p.coords.longitude.toFixed(5),acc:Math.round(p.coords.accuracy||0)}),()=>fin(null),{enableHighAccuracy:true,timeout:8000,maximumAge:60000});}catch(e){fin(null);}setTimeout(()=>fin(null),8500);});}
// état d'une journée d'après ses événements : hors / au travail / en pause / parti (inter-chantier) / terminé
export function ptState(e){const ev=(e&&e.events)||[];const last=ev[ev.length-1];if(!last)return 'off';if(last.t==='end')return 'done';if(last.t==='pause')return 'pause';if(last.t==='leave')return 'inter';return 'work';}
// durées : travail (hors pauses et inter-chantier), pause, inter-chantier — un compteur ouvert court jusqu'à « maintenant » (le jour même seulement)
export function ptDur(e,day){const ev=(e&&e.events)||[];let work=0,pause=0,inter=0;let cur=null,curT=0;const now=day===today()?Date.now():null;
  const close=(upTo)=>{if(!cur)return;const d=Math.max(0,upTo-curT);if(cur==='work')work+=d;else if(cur==='pause')pause+=d;else if(cur==='inter')inter+=d;cur=null;};
  ev.forEach(x=>{const t=+new Date(x.at);if(x.t==='start'||x.t==='resume'||x.t==='arrive'){close(t);cur='work';curT=t;}else if(x.t==='pause'){close(t);cur='pause';curT=t;}else if(x.t==='leave'){close(t);cur='inter';curT=t;}else if(x.t==='end'){close(t);}});
  if(cur&&now)close(now);return {work,pause,inter,open:!!cur};}
// production du jour d'une personne sur CE chantier : ce qu'elle a déclaré sur le plan (étapes et événements à son nom, ce jour-là)
export function ptProd(name,day,lines){const out={soud:0,fils:0,manch:0,mousse:0,ctrl:0};const sameDay=at=>at&&isoD(new Date(at))===day;const by=(b)=>sameName(A.uname(b),name)||sameName(b,name);
  Object.values(lines||{}).forEach(l=>['A','R'].forEach(c=>{const cd=l.cond&&l.cond[c];if(!cd)return;cd.joints.forEach(j=>{const st=j.steps||{};
    if(st[1]&&st[1].done&&by(st[1].by)&&sameDay(st[1].at))out.soud++;else if(!(st[1]&&st[1].done)){const ev=(j.events||[]).find(x=>x.type==='soudee');if(ev&&by(ev.by)&&sameDay(ev.at))out.soud++;}
    if(st[2]&&st[2].done&&by(st[2].by)&&sameDay(st[2].at))out.fils++;if(st[3]&&st[3].done&&by(st[3].by)&&sameDay(st[3].at))out.manch++;if(st[4]&&st[4].done&&by(st[4].by)&&sameDay(st[4].at))out.mousse++;
    (j.events||[]).forEach(ev=>{if(ev.type==='controle'&&by(ev.by)&&sameDay(ev.at))out.ctrl++;});});}));return out;}
const prodTxt=p=>[p.soud?p.soud+' soudure'+(p.soud>1?'s':''):'',p.fils?p.fils+' fils':'',p.manch?p.manch+' manchon'+(p.manch>1?'s':''):'',p.mousse?p.mousse+' moussage'+(p.mousse>1?'s':''):'',p.ctrl?p.ctrl+' contrôle'+(p.ctrl>1?'s':''):''].filter(Boolean).join(' · ')||'—';
const isMgr=()=>{if(A.can&&!A.can('pointage.validate'))return false;const r=A.role();return r==='chef'||r==='bureau'||r==='conducteur';}; // 09/10 : droit « valider les pointages » appliqué (plus seulement le rôle)
const isLvl2=()=>{if(A.can&&!A.can('pointage.validate'))return false;const r=A.role();return r==='conducteur'||r==='bureau';};
const ST_LAB={declare:['Déclaré','#8a6d1f','#fff3d6'],chef:['Validé chef','#1c3d6b','#eef3fb'],valide:['Validé','#1d5c1d','#e6f6e6'],refuse:['Refusé — corrigé','#a01212','#fdecec']};
export function renderPointage(){const el=document.getElementById('pointage');if(!el)return;const P=ptOf();const esc=A.esc;const me=A.userName();
  if(!P){el.innerHTML='<h2 class="vt">Pointage</h2><div class="card muted">Ouvre un chantier.</div>';return;}
  const day=A.state.ptDay||today();const mine=ptEntry(P,day,me,false);const st=ptState(mine);const dur=mine?ptDur(mine,day):{work:0,pause:0,inter:0};const prod=ptProd(me,day,A.state.lines);
  const locTxt=l=>l?`📍 ${l.lat}, ${l.lon} (± ${l.acc} m)`:'📍 sans position';
  const BTN=(t,lab,cls)=>`<button class="btn ${cls||''}" data-pt="${t}" style="flex:1;min-width:140px;padding:12px 10px;font-size:14px">${lab}</button>`;
  let acts='';
  if(A.can&&!A.can('pointage.self'))acts='<p class="hint">Ton compte ne pointe pas (droit « pointer sa journée » non donné).</p>'; /* 09/10 : droit appliqué */
  else if(day!==today())acts='<p class="hint">Les boutons ne servent que pour aujourd\'hui — pour une autre date, le chef déclare après coup.</p>';
  else if(st==='off')acts=BTN('start','▶ Début de journée','primary')+(A.state.ptAwayFrom?BTN('arrive','📍 Arrivée sur ce chantier','primary'):'');
  else if(st==='work')acts=BTN('pause','⏸ Pause')+BTN('leave','🚚 Départ du chantier')+BTN('end','⏹ Fin de journée','primary');
  else if(st==='pause')acts=BTN('resume','▶ Reprise','primary')+BTN('end','⏹ Fin de journée');
  else if(st==='inter')acts='<div class="infobox" style="flex:1">🚚 Inter-chantier en cours depuis '+tFR(mine.events[mine.events.length-1].at)+' — ouvre le chantier d\'arrivée et touche « Arrivée sur ce chantier » (ou « Fin de journée » ici).</div>'+BTN('arrive','📍 Finalement, retour ici')+BTN('end','⏹ Fin de journée');
  else acts='<div class="okbox" style="flex:1">Journée terminée à '+tFR(mine.events[mine.events.length-1].at)+'.</div>';
  const S=mine?ST_LAB[mine.status]||ST_LAB.declare:null;
  const timeline=mine&&mine.events.length?`<table class="phT"><tr><th>Heure</th><th>Quoi</th><th>Où</th></tr>${mine.events.map(x=>`<tr><td class="n" style="text-align:left">${tFR(x.at)}</td><td>${{start:'Début de journée',pause:'Pause',resume:'Reprise',leave:'Départ du chantier (inter-chantier)',arrive:'Arrivée sur le chantier',end:'Fin de journée'}[x.t]||x.t}${x.byChef?' <span class="dim">(déclaré par '+esc(x.byChef)+')</span>':''}</td><td class="dim">${x.t==='pause'||x.t==='resume'?'':locTxt(x.loc)}</td></tr>`).join('')}</table>`:'';
  const dayNav=`<div class="row" style="gap:6px;align-items:center"><button class="btn sm" data-ptday="-1">‹</button><input type="date" id="ptDate" value="${day}" style="border:1px solid var(--line);border-radius:7px;padding:4px 6px;font:inherit"><button class="btn sm" data-ptday="1">›</button>${day!==today()?'<button class="btn sm" data-ptday="0">Aujourd\'hui</button>':''}</div>`;
  el.innerHTML=`<h2 class="vt">Pointage <span class="muted" style="font-weight:400;font-size:13px">— ${esc(A.net().name||'')}</span></h2>
   <div class="card"><div class="row" style="justify-content:space-between;align-items:center"><b>${esc(me)}</b>${dayNav}</div>
    <div style="display:flex;flex-wrap:wrap;gap:8px;margin-top:10px">${acts}</div>
    <div class="phStat" style="margin-top:10px"><div><b>${hm(dur.work)}</b><small>travail${dur.open?' (en cours)':''}</small></div><div><b>${hm(dur.pause)}</b><small>pause${dur.pause>=3600e3?' ✓ ≥ 1 h':''}</small></div><div><b>${hm(dur.inter)}</b><small>inter-chantier</small></div><div class="cad"><b style="font-size:14px;line-height:1.3">${prodTxt(prod)}</b><small>production déclarée sur le plan</small></div></div>
    ${S?`<div style="margin-top:8px;font-size:12.5px"><span style="background:${S[2]};color:${S[1]};border-radius:999px;padding:3px 9px;font-weight:700">${S[0]}</span> ${(mine.val||[]).map(v=>`<span class="dim">· ${esc(v.by)} (${esc(v.role)}) ${tFR(v.at)}${v.note?' — '+esc(v.note):''}</span>`).join('')}${mine.corr?`<div class="warnbox" style="margin-top:6px">Heures corrigées par le chef : ${esc(mine.corr.start)} → ${esc(mine.corr.end)}, pause ${mine.corr.pause||0} min${mine.corr.note?' — '+esc(mine.corr.note):''}</div>`:''}</div>`:''}
    ${timeline}
    <p class="hint" style="margin:6px 0 0">La position n'est prise qu'au début, au départ, à l'arrivée et à la fin — une trace de l'endroit, pas un suivi. Le compteur ne court pas après « Fin de journée ».</p></div>
   ${isMgr()?mgrHTML(P,day):''}`;
  el.querySelectorAll('[data-pt]').forEach(b=>b.onclick=()=>ptAct(b.dataset.pt));
  el.querySelectorAll('[data-ptday]').forEach(b=>b.onclick=()=>{const d=+b.dataset.ptday;if(!d)A.state.ptDay=null;else{const x=new Date(day+'T00:00');x.setDate(x.getDate()+d);A.state.ptDay=isoD(x);}renderPointage();});
  const di=document.getElementById('ptDate');if(di)di.onchange=()=>{A.state.ptDay=di.value||null;renderPointage();};
  bindMgr(el,P,day);}
async function ptAct(t){const P=ptOf();if(!P)return;const me=A.userName();const day=today();const e=ptEntry(P,day,me,true);
  const needLoc=t==='start'||t==='end'||t==='leave'||t==='arrive';let loc=null;if(needLoc){A.toast('Position en cours…');loc=await getPos();}
  if(t==='arrive'){A.state.ptAwayFrom=null;}if(t==='leave'){A.state.ptAwayFrom=A.net().id;}
  if(t==='end'&&ptState(e)==='pause'){e.events.push({t:'resume',at:new Date().toISOString()});}
  e.events.push({t,at:new Date().toISOString(),loc:loc||undefined});if(e.status==='valide'||e.status==='chef')e.status='declare'; // une journée re-modifiée repart en « déclaré »
  A.saveNet('pointage');renderPointage();A.toast({start:'Journée commencée',pause:'Pause',resume:'Reprise',leave:'Départ noté — inter-chantier',arrive:'Arrivée notée',end:'Journée terminée'}[t]+(needLoc?(loc?' · position prise':' · sans position'):''));}
// ── vue chef / conducteur : tout le monde pour la journée, validation à deux niveaux, déclaration après coup
function mgrHTML(P,day){const esc=A.esc;const D=P.days[day]||{};const names=new Set(Object.keys(D));
  // les gens qui ont déclaré de la production ce jour-là sans pointer apparaissent aussi (rapprochement)
  Object.values(A.state.lines||{}).forEach(l=>['A','R'].forEach(c=>{const cd=l.cond&&l.cond[c];if(!cd)return;cd.joints.forEach(j=>{const st=j.steps||{};[1,2,3,4].forEach(n=>{if(st[n]&&st[n].done&&st[n].at&&isoD(new Date(st[n].at))===day&&st[n].by)names.add(st[n].by);});});}));
  const rows=[...names].map(n=>{const e=ptEntry(P,day,n,false);const dur=e?ptDur(e,day):null;const prod=ptProd(n,day,A.state.lines);const S=e?(ST_LAB[e.status]||ST_LAB.declare):null;const canV1=e&&(e.status==='declare'||e.status==='refuse')&&isMgr();const canCorr=e&&e.status!=='valide'&&isMgr();const canV2=e&&e.status==='chef'&&isLvl2();
    return `<tr><td><b>${esc(n)}</b>${e&&e.events.some(x=>x.byChef)?' <span class="dim">(déclaré par le chef)</span>':''}</td><td class="n">${dur?hm(dur.work):'<span class="dim">pas pointé</span>'}</td><td class="n dim">${dur?hm(dur.pause):''}</td><td style="font-size:12px">${prodTxt(prod)}</td>
     <td>${S?`<span style="background:${S[2]};color:${S[1]};border-radius:999px;padding:2px 8px;font-size:11.5px;font-weight:700;white-space:nowrap">${S[0]}</span>`:''}</td>
     <td style="white-space:nowrap">${canV1?`<button class="btn sm" data-ptval="${esc(n)}" style="color:#1d5c1d">✓ Valider</button> `:''}${canCorr?`<button class="btn sm" data-ptref="${esc(n)}" style="color:#a01212">✗ Corriger</button>`:''}${canV2?`<button class="btn sm primary" data-ptval2="${esc(n)}">✓ Valider (conducteur)</button>`:''}${!e?`<button class="btn sm" data-ptdecl="${esc(n)}">＋ Déclarer ses heures</button>`:''}</td></tr>`;}).join('');
  return `<div class="card"><h3 style="margin:0 0 6px">Équipe du ${dFR(day)} <span class="muted" style="font-weight:400;font-size:12px">— validation chef, puis conducteur de travaux</span></h3>
   ${rows?`<div style="overflow-x:auto"><table class="phT"><tr><th>Qui</th><th class="n">Travail</th><th class="n">Pause</th><th>Production (plan)</th><th>Statut</th><th></th></tr>${rows}</table></div>`:'<p class="hint">Personne n\'a pointé ni déclaré de production ce jour-là.</p>'}
   <div class="row" style="margin-top:8px"><button class="btn" id="ptDeclBtn">＋ Déclarer les heures de quelqu'un (après coup)</button></div>
   <p class="hint" style="margin:6px 0 0">« Corriger » = heures refusées et remplacées par celles du chef (le gars les voit). Le conducteur (ou le bureau) valide en second.</p></div>`;}
function bindMgr(el,P,day){const esc=A.esc;const me=A.userName();const role=A.role();
  el.querySelectorAll('[data-ptval]').forEach(b=>b.onclick=()=>{const e=ptEntry(P,day,b.dataset.ptval,false);if(!e)return;e.status='chef';e.val=(e.val||[]).concat([{by:me,role,at:new Date().toISOString(),lvl:1}]);A.saveNet('pointage');renderPointage();A.toast('Heures de '+b.dataset.ptval+' validées (chef) — au conducteur de confirmer');});
  el.querySelectorAll('[data-ptval2]').forEach(b=>b.onclick=()=>{const e=ptEntry(P,day,b.dataset.ptval2,false);if(!e)return;e.status='valide';e.val=(e.val||[]).concat([{by:me,role,at:new Date().toISOString(),lvl:2}]);A.saveNet('pointage');renderPointage();A.toast('Heures de '+b.dataset.ptval2+' validées');});
  el.querySelectorAll('[data-ptref]').forEach(b=>b.onclick=()=>declForm(P,day,b.dataset.ptref,true));
  el.querySelectorAll('[data-ptdecl]').forEach(b=>b.onclick=()=>declForm(P,day,b.dataset.ptdecl,false));
  const db=document.getElementById('ptDeclBtn');if(db)db.onclick=()=>declForm(P,day,'',false);}
function declForm(P,day,name,isCorr){const esc=A.esc;const names=A.users().map(u=>u.name);const e=name?ptEntry(P,day,name,false):null;const dur=e?ptDur(e,day):null;
  A.openModal(`<h3 style="margin-top:0">${isCorr?'Corriger les heures':'Déclarer des heures après coup'} — ${dFR(day)}</h3>
   ${isCorr&&dur?`<div class="warnbox" style="margin:0 0 8px">Déclaré par ${esc(name)} : ${hm(dur.work)} de travail, ${hm(dur.pause)} de pause.</div>`:''}
   <label class="f">Qui</label>${name?`<input class="f" id="ptdN" value="${esc(name)}" disabled>`:`<div class="row" style="gap:6px"><select class="f" id="ptdSel" style="flex:1"><option value="">— choisir —</option>${names.map(n=>`<option>${esc(n)}</option>`).join('')}</select><input class="f" id="ptdN" placeholder="ou un nom" style="flex:1"></div>`}
   <div class="row" style="gap:8px;margin-top:8px"><div><label class="f">Début</label><input class="f" type="time" id="ptdS" value="07:30"></div><div><label class="f">Fin</label><input class="f" type="time" id="ptdE" value="17:00"></div><div><label class="f">Pause (min)</label><input class="f" type="number" id="ptdP" value="60" style="width:80px"></div></div>
   <label class="f" style="margin-top:8px">Note</label><input class="f" id="ptdNote" placeholder="${isCorr?'motif de la correction':'ex. absent de l\'appli ce jour-là'}">
   <div class="actions" style="margin-top:10px"><button class="btn primary block" id="ptdOk">${isCorr?'Refuser et remplacer par ces heures':'Enregistrer (validé chef)'}</button><button class="btn block" data-close>Annuler</button></div>`);
  const sel=document.getElementById('ptdSel');if(sel)sel.onchange=()=>{if(sel.value)document.getElementById('ptdN').value=sel.value;};
  document.getElementById('ptdOk').onclick=()=>{const n=(document.getElementById('ptdN').value||'').trim();if(!n){A.toast('Qui ?');return;}const s=document.getElementById('ptdS').value,en=document.getElementById('ptdE').value;const p=Math.max(0,+document.getElementById('ptdP').value||0);if(!s||!en||en<=s){A.toast('Début / fin incohérents');return;}
    const ent=ptEntry(P,day,n,true);const me=A.userName();const mk=(t,hhmm)=>({t,at:new Date(day+'T'+hhmm+':00').toISOString(),byChef:me});
    if(isCorr){ent.corr={start:s,end:en,pause:p,note:document.getElementById('ptdNote').value||''};ent.status='refuse';ent.val=(ent.val||[]).concat([{by:me,role:A.role(),at:new Date().toISOString(),lvl:1,note:'corrigé'}]);}
    else{const mid=new Date(day+'T12:00:00');const ev=[mk('start',s)];if(p>0){const ps=new Date(mid.getTime()-p*30000),pe=new Date(mid.getTime()+p*30000);ev.push({t:'pause',at:ps.toISOString(),byChef:me},{t:'resume',at:pe.toISOString(),byChef:me});}ev.push(mk('end',en));ent.events=ev;ent.status='chef';ent.val=[{by:me,role:A.role(),at:new Date().toISOString(),lvl:1,note:document.getElementById('ptdNote').value||''}];}
    A.saveNet('pointage');A.closeModal();renderPointage();A.toast(isCorr?'Heures corrigées — '+n+' le verra':'Heures de '+n+' enregistrées (validé chef)');};}
// ───────────────────────────── PROFIL ─────────────────────────────
const AV_SKIN=['#f1c9a5','#d9a475','#b3794b','#8a5a3a','#5a3a26'];const AV_HAIR=['#2b1d12','#6b4423','#c69c6d','#9a9a9a','#e0b050'];
const AV_POSTE={soudeur:['Soudeur','⚡'],manchonneur:['Manchonneur','🔧'],chef:['Chef de chantier','📋'],conducteur:['Conducteur de travaux','🗂'],bureau:['Bureau','💻']};
function avatarOf(name){try{return JSON.parse(localStorage.getItem('trace:avatar:'+norm(name))||'null')||{skin:0,hair:0,beard:0,glasses:0,helmet:'#eb6834',company:'#eb6834'};}catch(e){return {skin:0,hair:0,beard:0,glasses:0,helmet:'#eb6834',company:'#eb6834'};}}
function saveAvatar(name,av){try{localStorage.setItem('trace:avatar:'+norm(name),JSON.stringify(av));}catch(e){}}
export function avatarSVG(av,role,size){const skin=AV_SKIN[av.skin%AV_SKIN.length],hair=AV_HAIR[av.hair%AV_HAIR.length];const P=AV_POSTE[role]||AV_POSTE.soudeur;
  return `<svg viewBox="0 0 100 110" width="${size||96}" height="${(size||96)*1.1}" style="display:block"><circle cx="50" cy="56" r="48" fill="${av.company}22"/>
   <rect x="22" y="62" width="56" height="40" rx="10" fill="${av.company}"/><rect x="40" y="62" width="20" height="40" fill="#ffffff33"/>
   <circle cx="50" cy="44" r="22" fill="${skin}"/>${av.beard?`<path d="M30 48 Q50 78 70 48 L68 56 Q50 70 32 56 Z" fill="${hair}" opacity=".9"/>`:''}
   <path d="M26 42 Q28 14 50 14 Q72 14 74 42 L74 36 Q50 30 26 36 Z" fill="${hair}"/>
   <path d="M20 36 Q50 4 80 36 L84 40 L16 40 Z" fill="${av.helmet}" stroke="#0b0b0b22"/><rect x="14" y="38" width="72" height="6" rx="3" fill="${av.helmet}" stroke="#0b0b0b22"/>
   <circle cx="42" cy="46" r="2.6" fill="#0b0b0b"/><circle cx="58" cy="46" r="2.6" fill="#0b0b0b"/>${av.glasses?`<rect x="34" y="40" width="14" height="10" rx="3" fill="none" stroke="#0b0b0b" stroke-width="1.8"/><rect x="52" y="40" width="14" height="10" rx="3" fill="none" stroke="#0b0b0b" stroke-width="1.8"/><path d="M48 44 L52 44" stroke="#0b0b0b" stroke-width="1.8"/>`:''}
   <path d="M43 56 Q50 61 57 56" stroke="#0b0b0b" stroke-width="1.8" fill="none" stroke-linecap="round"/>
   <text x="80" y="100" font-size="18" text-anchor="middle">${P[1]}</text></svg>`;}
// cadences de référence (par jour) — réglables par le chef dans le profil ; les dépasser plusieurs jours de suite rapporte un trophée
function refsOf(){try{return Object.assign({soudeur:6,manchonneur:6},JSON.parse(localStorage.getItem('trace:refcad')||'{}'));}catch(e){return {soudeur:6,manchonneur:6};}}
// statistiques d'une personne sur tous les chantiers connus de l'appareil (ouverts au moins une fois) — base des points
export function profStats(name){const sites=A.sites();const refs=refsOf();const perDay={};let soud=0,manch=0,fils=0,sigs=0,ptOk=0,ptAll=0,pauses=0,hours=0;const days=[];
  sites.filter(s=>!(s.net&&s.net.demo)).forEach(s=>{const lines=s.lines||{};/* les chantiers de démo (statuts fictifs) ne comptent pas */Object.values(lines).forEach(l=>['A','R'].forEach(c=>{const cd=l.cond&&l.cond[c];if(!cd)return;cd.joints.forEach(j=>{const st=j.steps||{};
    const by=(b)=>sameName(A.uname(b),name)||sameName(b,name);
    if(st[1]&&st[1].done&&by(st[1].by)){soud++;const d=st[1].at?isoD(new Date(st[1].at)):null;if(d){perDay[d]=perDay[d]||{soud:0,manch:0};perDay[d].soud++;}}
    else if(!(st[1]&&st[1].done)){const ev=(j.events||[]).find(x=>x.type==='soudee');if(ev&&by(ev.by)){soud++;const d=ev.at?isoD(new Date(ev.at)):null;if(d){perDay[d]=perDay[d]||{soud:0,manch:0};perDay[d].soud++;}}}
    if(st[2]&&st[2].done&&by(st[2].by))fils++;
    if(st[3]&&st[3].done&&by(st[3].by)){manch++;const d=st[3].at?isoD(new Date(st[3].at)):null;if(d){perDay[d]=perDay[d]||{soud:0,manch:0};perDay[d].manch++;}}});}));
    const q=s.net&&s.net.qse;(q&&q.docs||[]).forEach(d0=>{if((d0.sigs||[]).some(sg=>sameName(sg.name,name)))sigs++;});
    const pt=s.net&&s.net.pointage;Object.entries((pt&&pt.days)||{}).forEach(([day,D])=>{const k=Object.keys(D).find(x=>sameName(x,name));if(!k)return;const e=D[k];ptAll++;if(e.status==='valide'||e.status==='chef')ptOk++;const dur=ptDur(e,day);if(dur.pause>=3600e3)pauses++;hours+=dur.work;days.push({day,site:s.name,status:e.status,work:dur.work,pause:dur.pause,corr:e.corr});});});
  // jours CONSÉCUTIFS au-dessus de la cadence de référence (soudeur : soudures/jour ; manchonneur : manchons/jour)
  const role=A.role();const key=role==='manchonneur'?'manch':'soud';const ref=refs[role==='manchonneur'?'manchonneur':'soudeur'];const ds=Object.keys(perDay).sort();let best=0,cur=0,prev=null;
  ds.forEach(d=>{const ok=perDay[d][key]>=ref;const gap=prev?Math.round((new Date(d)-new Date(prev))/864e5):1;cur=ok?((gap<=3?cur:0)+1):0;best=Math.max(best,cur);prev=d;});
  days.sort((a,b)=>b.day.localeCompare(a.day));return {soud,manch,fils,sigs,ptOk,ptAll,pauses,hours,streak:best,pouces:0,days,ref,refKey:key};}
// trophées : paliers bronze / argent / or et points par unité (signatures QSE modérées — encourager sans favoriser celui qui change souvent de chantier)
const TROPHIES=[
 {k:'soud',lab:'Soudures',icon:'⚡',tiers:[50,200,500],pts:2,roles:['soudeur','chef']},
 {k:'manch',lab:'Manchons',icon:'🔧',tiers:[50,200,500],pts:2,roles:['manchonneur','chef']},
 {k:'fils',lab:'Fils raccordés',icon:'🔌',tiers:[50,200,500],pts:1,roles:['manchonneur','chef']},
 {k:'streak',lab:'Jours consécutifs au-dessus de la cadence',icon:'🔥',tiers:[3,10,30],pts:15},
 {k:'pouces',lab:'Pouces reçus',icon:'👍',tiers:[10,50,200],pts:3,soon:true},
 {k:'sigs',lab:'Documents QSE signés',icon:'✍️',tiers:[5,20,50],pts:1},
 {k:'ptOk',lab:'Journées pointées jamais contestées',icon:'🕒',tiers:[5,20,60],pts:2},
 {k:'pauses',lab:'Pauses d’une heure bien prises',icon:'☕',tiers:[5,20,60],pts:1}];
const MEDAL=['','🥉','🥈','🥇'];
export function renderProfil(){const el=document.getElementById('profil');if(!el)return;const esc=A.esc;const me=A.userName();const role=A.role();const av=avatarOf(me);const S=profStats(me);
  const vis=TROPHIES.filter(t=>!t.roles||t.roles.includes(role)||S[t.k]>0);let pts=0;
  const cards=vis.map(t=>{const v=S[t.k]||0;const tier=t.tiers.filter(x=>v>=x).length;const next=t.tiers[tier];pts+=v*t.pts;const pct=next?Math.min(100,Math.round(100*v/next)):100;
    return `<div class="card" style="padding:9px 10px${t.soon?';opacity:.6':''}"><div class="row" style="justify-content:space-between;align-items:center"><b>${t.icon} ${t.lab}</b><span style="font-size:20px">${MEDAL[tier]||'<span class="dim" style="font-size:12px">pas encore</span>'}</span></div>
     <div class="row" style="justify-content:space-between;font-size:12.5px;margin-top:2px"><span><b>${v}</b>${t.k==='streak'&&S.ref?` <span class="dim">(réf. ${S.ref} ${S.refKey==='manch'?'manchons':'soudures'}/jour)</span>`:''}</span><span class="dim">${next?'prochain palier : '+next:'palier maxi atteint'}${t.soon?' · bientôt':''}</span></div>
     <div style="height:6px;background:#ece9e2;border-radius:3px;margin-top:5px;overflow:hidden"><div style="width:${pct}%;height:100%;background:${tier>=3?'#d4af37':tier===2?'#a8a9ad':tier===1?'#cd7f32':av.company}"></div></div></div>`;}).join('');
  const nMed=vis.reduce((s,t)=>s+(t.tiers.filter(x=>(S[t.k]||0)>=x).length?1:0),0);
  el.innerHTML=`<h2 class="vt">Mon profil</h2>
   <div class="card"><div class="row" style="gap:14px;align-items:center;flex-wrap:nowrap">${avatarSVG(av,role,104)}<div style="flex:1;min-width:0"><div style="font-size:18px;font-weight:800">${esc(me)}</div><div class="dim">${esc((AV_POSTE[role]||AV_POSTE.soudeur)[0])}</div>
     <div class="row" style="gap:6px;margin-top:8px"><span class="chip" style="background:${av.company};color:#fff;border-color:${av.company};font-weight:700">★ ${pts} points</span><span class="chip">${nMed} médaille${nMed>1?'s':''}</span><span class="chip">${hm(S.hours)} pointées</span></div></div></div>
    <details style="margin-top:8px"><summary style="cursor:pointer;font-size:13px"><b>🎨 Personnaliser mon avatar</b> <span class="dim">(peau, cheveux, barbe, lunettes, casque aux couleurs de l'entreprise)</span></summary>
     <div class="row" style="gap:6px;margin-top:8px;align-items:center"><span class="dim">Peau</span>${AV_SKIN.map((c,i)=>`<button class="avSw ${av.skin===i?'on':''}" data-av="skin" data-v="${i}" style="background:${c}"></button>`).join('')}</div>
     <div class="row" style="gap:6px;margin-top:6px;align-items:center"><span class="dim">Cheveux</span>${AV_HAIR.map((c,i)=>`<button class="avSw ${av.hair===i?'on':''}" data-av="hair" data-v="${i}" style="background:${c}"></button>`).join('')}</div>
     <div class="row" style="gap:6px;margin-top:6px;align-items:center"><button class="btn sm ${av.beard?'on':''}" data-av="beard" data-v="${av.beard?0:1}">Barbe</button><button class="btn sm ${av.glasses?'on':''}" data-av="glasses" data-v="${av.glasses?0:1}">Lunettes</button>
      <label class="dim" style="display:inline-flex;align-items:center;gap:4px">Casque <input type="color" data-avc="helmet" value="${av.helmet}"></label><label class="dim" style="display:inline-flex;align-items:center;gap:4px">Couleur entreprise <input type="color" data-avc="company" value="${av.company}"></label></div></details></div>
   <h3 style="margin:12px 0 6px">Trophées & médailles</h3>${cards}
   ${isMgr()?`<div class="card"><b>Cadences de référence</b> <span class="dim">(par jour — réglage chef)</span><div class="row" style="gap:10px;margin-top:6px"><label class="dim">Soudeur <input type="number" id="refSoud" value="${refsOf().soudeur}" style="width:64px"></label><label class="dim">Manchonneur <input type="number" id="refManch" value="${refsOf().manchonneur}" style="width:64px"></label></div></div>`:''}
   <h3 style="margin:12px 0 6px">Mes heures <span class="muted" style="font-weight:400;font-size:12px">— pointées, validées par le chef / le conducteur</span></h3>
   ${S.days.length?`<table class="phT"><tr><th>Jour</th><th>Chantier</th><th class="n">Travail</th><th class="n">Pause</th><th>Statut</th></tr>${S.days.slice(0,30).map(d=>{const L=ST_LAB[d.status]||ST_LAB.declare;return `<tr><td>${dFR(d.day)}</td><td class="dim">${esc(d.site)}</td><td class="n">${hm(d.work)}</td><td class="n dim">${hm(d.pause)}</td><td><span style="background:${L[2]};color:${L[1]};border-radius:999px;padding:2px 8px;font-size:11.5px;font-weight:700;white-space:nowrap">${L[0]}</span>${d.corr?' <span class="dim">corrigé '+esc(d.corr.start)+'→'+esc(d.corr.end)+'</span>':''}</td></tr>`;}).join('')}</table>`:'<p class="hint">Aucune journée pointée pour l\'instant (onglet Pointage).</p>'}
   <p class="hint" style="margin-top:8px">Les compteurs se font sur les chantiers ouverts sur cet appareil ; les pouces arrivent avec les profils synchronisés. Avantages liés aux points : à décider.</p>`;
  el.querySelectorAll('[data-av]').forEach(b=>b.onclick=()=>{const a=avatarOf(me);a[b.dataset.av]=+b.dataset.v;saveAvatar(me,a);renderProfil();});
  el.querySelectorAll('[data-avc]').forEach(i=>i.onchange=()=>{const a=avatarOf(me);a[i.dataset.avc]=i.value;saveAvatar(me,a);renderProfil();});
  ['refSoud','refManch'].forEach((id,k)=>{const i=document.getElementById(id);if(i)i.onchange=()=>{const r=refsOf();r[k?'manchonneur':'soudeur']=Math.max(1,+i.value||1);try{localStorage.setItem('trace:refcad',JSON.stringify(r));}catch(e){}renderProfil();A.toast('Cadence de référence enregistrée');};});}
