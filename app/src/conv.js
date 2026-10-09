// conv.js — CONVERSATION DU CHANTIER (Ethan 08/10 : « par chantier un onglet conversation : laisser une note géoréférencée sur le plan — vanne fermée avec la photo,
// poubelle à ramasser — envoyée dans la conversation ; un chat propre au chantier ; des messages qui créent des tâches assignées à quelqu'un, l'opérateur voit
// la tâche et la déclare faite avec photo à l'appui ; ex. sous-station : le chef note « vannes dans le conteneur à souder », l'opérateur la fait et prend en photo »).
// Données : NET.conv = {msgs:[{id,at,by,text,photos,pos:[x,y]|null,line,pk,kind:'msg'|'note'|'task'|'undo'|'credit',task:{to,done,doneAt,doneBy,doneNote,donePhotos},
//   undo:{what:'etape'|'suppl',n,weldId,line,cond,status:'pending'|'done'|'refused',decidedBy,decidedAt,note,used,left,limit}, credit:{to,n}}],seq} — saveNet('conv').
// Garde-fou des annulations (Ethan 08/10) : une demande d'annulation (kind 'undo') attend la validation d'un chef ; un chef peut aussi redonner des crédits (kind 'credit').
import {POSTE_FAM,FAMILLES,posteLabel} from './acces.js';
let A=null;
export function initConv(api){A=api;}
// personnes à qui confier une tâche : connecté = les VRAIS comptes (profils + invitations, groupés par famille) ; hors connexion = personnages de démo
function peopleGroups(){const accs=A.accounts&&A.accounts();if(accs&&accs.length){const me0=me();return Object.entries(FAMILLES).map(([f,fl])=>({label:fl,people:accs.filter(a=>a.active!==false&&POSTE_FAM[a.poste]===f).map(a=>({name:a.name,label:a.name+' — '+posteLabel(a.poste)+(a.type==='interim'?' (intérim)':'')+(a.name===me0?' (moi)':'')})).sort((x,y)=>x.name.localeCompare(y.name,'fr'))})).filter(g=>g.people.length);}
  return [{label:'Équipe',people:[...new Set([me(),...(A.users()||[]).map(u=>u.name)])].map(n=>({name:n,label:n}))}];}
const dhFR=x=>x?new Date(x).toLocaleDateString('fr-FR',{day:'2-digit',month:'2-digit'})+' '+new Date(x).toLocaleTimeString('fr-FR',{hour:'2-digit',minute:'2-digit'}):'';
const TOUS='tous';
/* types de message (Ethan 09/10 : « on va créer des icônes selon ce que c'est pour s'y retrouver — barriérage / emprise chantier, tranchée, stockage, sécurité ») :
   l'icône est sur la carte, sur la pastille du plan et sert de filtre ; [clé, icône, libellé, exemples] */
export const CAT_DEF=[['balisage','🚧','Balisage / emprise','barrières, clôtures, signalisation, emprise chantier'],['tranchee','⛏️','Tranchée','fouille, blindage, remblai, enrobé'],['stockage','📦','Stockage','tubes, pièces, conteneur, livraison'],['securite','🦺','Sécurité','EPI, danger, presqu\'accident, consigne'],['reseau','⚡','Réseau rencontré','câble, conduite, DICT, réseau tiers'],['acces','🚗','Accès / riverains','circulation, déviation, plainte, accès engins'],['qualite','🔍','Qualité','défaut, reprise, contrôle, non-conformité'],['materiel','🔧','Matériel','engin, outillage, panne, besoin'],['divers','💬','Divers','tout le reste']];
const CAT=Object.fromEntries(CAT_DEF.map(([k,i,l,h])=>[k,{k,icon:i,label:l,hint:h}]));const catOf=m=>CAT[m&&m.cat]||CAT.divers;
function convOf(){if(!A)return null;const NET=A.net();if(!NET||NET.id==='__vide')return null;if(!NET.conv||typeof NET.conv!=='object')NET.conv={msgs:[],seq:1};const C=NET.conv;C.msgs=Array.isArray(C.msgs)?C.msgs:[];C.seq=C.seq||1;return C;}
function save(){A.saveNet('conv');}
function draft(){const S=A.state;if(!S.convDraft)S.convDraft={text:'',photos:[],pos:null,line:null,pk:null,near:null,task:null,to:TOUS,cat:'divers'};return S.convDraft;}
const me=()=>A.userName();
const isMine=m=>m.kind==='task'&&m.task&&(m.task.to===TOUS||m.task.to===me());
/* ---------- filtres (plusieurs cochables, mémorisés sur l'appareil), période (du / au), non-lus ---------- */
const CATS={msg:m=>m.kind==='msg'||m.kind==='note',notes:m=>!!m.pos,open:m=>m.kind==='task'&&m.task&&!m.task.done,mine:m=>m.kind==='task'&&m.task&&!m.task.done&&isMine(m),done:m=>m.kind==='task'&&m.task&&m.task.done,undo:m=>m.kind==='undo'||m.kind==='credit'};
function filtersOf(){const S=A.state;if(!Array.isArray(S.convFilters))S.convFilters=[];return S.convFilters;} // le temps de la session : au prochain lancement, tout est affiché (les pastilles du plan suivent ces filtres)
function setFilters(f){A.state.convFilters=f;}
function toggleFilter(k){const f=filtersOf().slice();if(k==='all'){setFilters([]);return;}const i=f.indexOf(k);if(i>=0)f.splice(i,1);else f.push(k);setFilters(f);}
const dayOf=m=>{const d=m.at?new Date(m.at):null;if(!d||isNaN(d))return '';return d.getFullYear()+'-'+String(d.getMonth()+1).padStart(2,'0')+'-'+String(d.getDate()).padStart(2,'0');};
function inRange(m){const r=A.state.convRange;if(!r||(!r.from&&!r.to))return true;const d=dayOf(m);if(r.from&&d<r.from)return false;if(r.to&&d>r.to)return false;return true;}
// ce qui est visible = catégories cochées (aucune = tout) ET période : vaut pour la liste ET pour les pastilles du plan
export function convVisible(m){const f=filtersOf();const cat=!f.length||f.some(k=>CATS[k]&&CATS[k](m));const tc=A.state.convCat;const typeOk=!tc||(m.kind!=='undo'&&m.kind!=='credit'&&catOf(m).k===tc);return cat&&typeOk&&inRange(m);}
/* sur le PLAN (Ethan 09/10 : « une tâche faite, il ne faut pas que le check vert reste sur le plan, sinon en fin de chantier c'est complètement pollué ») :
   par défaut = tâches à faire + notes des 7 derniers jours ; les tâches faites et l'ancien ne reviennent que si on le demande (📅 période, filtre « ✓ Faites », ou 👁 « tout l'historique ») */
const RECENT_DAYS=7;
export function convOnPlan(m){if(!convVisible(m))return false;const S=A.state;const r=S.convRange;const all=!!(S.show&&S.show.convAll)||!!(r&&(r.from||r.to));if(all)return true;
  if(m.kind==='task'&&m.task){if(!m.task.done)return true;return filtersOf().includes('done');}
  return dayOf(m)>=daysAgo(RECENT_DAYS);}
const todayStr=()=>dayOf({at:new Date().toISOString()});const daysAgo=n=>dayOf({at:new Date(Date.now()-n*864e5).toISOString()});
const seenKey=()=>'trace:convSeen:'+((A.net()||{}).id||'');const getSeen=()=>{try{return localStorage.getItem(seenKey())||'';}catch(e){return '';}};const setSeen=v=>{try{localStorage.setItem(seenKey(),v);}catch(e){}};
export function unreadMsgs(){const C=convOf();if(!C)return [];const seen=getSeen();return C.msgs.filter(m=>m.by!==me()&&(m.at||'')>seen);}
export function openTasksForMe(){const C=convOf();if(!C)return [];return C.msgs.filter(m=>m.kind==='task'&&m.task&&!m.task.done&&isMine(m));}
/* ---------- pose d'une note sur le plan ---------- */
export function convStartPose(on){const S=A.state;if(on&&!A.can('conv.post')){A.toast('Tu n\'as pas le droit d\'écrire dans la conversation');return;}
  S.convPose=on?{}:null;if(on){S.tab='plan';A.closeSheet();A.toast('Touche le plan à l\'endroit de la note');}A.renderAll();}
export function convTap(wx,wy){const S=A.state;const d=draft();d.pos=[+wx.toFixed(2),+wy.toFixed(2)];d.line=null;d.pk=null;d.near=null;
  try{const n=A.nearestOnLines(wx,wy);const k=S.view.k;if(n&&n.d<=40/k){d.line=n.line;d.pk=+Math.max(0,n.m).toFixed(1);}}catch(e){}
  try{d.near=A.nearWelds?A.nearWelds(wx,wy):null;}catch(e){}
  S.convPose=null;S.tab='conv';A.renderAll();A.toast('Position posée — écris ta note ('+locText(d)+')');
  setTimeout(()=>{const ta=document.getElementById('cvText');if(ta)ta.focus();},50);}
const lineName=id=>{const l=A.lineOf(id);return l?(l.name||id):id;};
/* où c'est (Ethan 09/10 : « les "Ligne L13 · PK 20 m" pour localiser, on s'en fout, personne va comprendre ça ») : par les n° de soudure voisins —
   « entre S-0023 et S-0024 », « à 3 m de S-0024 » ; le nom de la ligne n'est ajouté que s'il parle (« Rue de la Gare », pas « Ligne L13 » ni « Antenne A2 ») */
const lineTalks=n=>{const r=String(n||'').replace(/\b(ligne|antenne|branche|conduite|tron[cç]on|principale|secondaire|aller|retour)\b/gi,' ').replace(/\b[A-Z]{0,2}\d+[a-z]?\b/g,' ').replace(/\bDN\s*\d+\b/gi,' ');return (r.match(/[A-Za-zÀ-ÿ]{3,}/g)||[]).length>0;};
export function locText(m){const n=Array.isArray(m.near)?m.near:null;const ln=m.line&&lineTalks(lineName(m.line))?lineName(m.line):'';const f1=v=>A.fmt(Math.round(v*10)/10);
  if(!n||!n.length)return ln?ln+(m.pk!=null?' · PK '+A.fmt(m.pk)+' m':''):(m.line?'PK '+A.fmt(m.pk)+' m':'voir sur le plan');
  const a=n[0];let t;
  const b=n.find(x=>x!==a&&x.line===a.line&&x.cond===a.cond&&Math.abs(x.idx-a.idx)===1&&a.m!=null&&x.m!=null&&m.pk!=null&&m.line===a.line&&(x.m-m.pk)*(a.m-m.pk)<0);
  if(a.d<1.5)t='sur '+a.id;else if(b)t='entre '+(a.m<b.m?a.id:b.id)+' et '+(a.m<b.m?b.id:a.id);else t='à '+f1(a.d)+' m de '+a.id;
  return ln?t+' · '+ln:t;}
/* ---------- rendu de l'onglet ---------- */
export function renderConv(){const el=document.getElementById('convview');if(!el)return;const C=convOf();const esc=A.esc;const S=A.state;
  if(!C){el.innerHTML='<h2 class="vt">Conversation</h2><div class="card muted">Ouvre un chantier.</div>';return;}
  const f=filtersOf();const r=S.convRange||null;const hasRange=!!(r&&(r.from||r.to));
  if(S.convSeenMark===undefined)S.convSeenMark=getSeen(); // repère des non-lus au moment où on ouvre l'onglet (sert à l'alerte « masqués par tes filtres »)
  const unreadBefore=C.msgs.filter(m=>m.by!==me()&&(m.at||'')>S.convSeenMark);const hiddenUnread=unreadBefore.filter(m=>!convVisible(m));setSeen(new Date().toISOString()); // vu = lu
  const msgs=C.msgs.filter(convVisible);const nMsg=C.msgs.filter(m=>m.kind==='msg'||m.kind==='note').length,nUndo=C.msgs.filter(m=>m.kind==='undo'||m.kind==='credit').length;
  const fmtD=d=>d?d.slice(8,10)+'/'+d.slice(5,7):'…';
  const nOpen=C.msgs.filter(m=>m.kind==='task'&&m.task&&!m.task.done).length,nMine=openTasksForMe().length;const pend=pendingUndos();const canVal=A.undo&&A.undo.canValidate();
  const chip=(k,l)=>`<button class="chip ${k==='all'?(!f.length?'active':''):(f.includes(k)?'active':'')}" data-cvf="${k}" title="${k==='all'?'tout afficher':'cocher / décocher (plusieurs possibles)'}">${l}</button>`;
  const d=draft();const canPost=A.can('conv.post'),canTask=A.can('conv.task');const groups=peopleGroups();
  el.innerHTML=`<h2 class="vt">Conversation — ${esc(A.net().name||'')}</h2>
  <div class="cvFilters">${chip('all','Tout ('+C.msgs.length+')')}${chip('msg','💬 Messages ('+nMsg+')')}${chip('notes','📍 Sur le plan ('+C.msgs.filter(m=>m.pos).length+')')}${chip('open','☐ À faire ('+nOpen+')')}${chip('mine','👤 Mes tâches ('+nMine+')')}${chip('done','✓ Faites')}${nUndo?chip('undo','🛡 Annulations ('+nUndo+')'+(pend.length?' <b>'+pend.length+' à valider</b>':'')):''}<button class="chip ${hasRange?'active':''}" data-cvrange="1" title="n'afficher qu'une période (liste et pastilles du plan)">📅 ${hasRange?'du '+fmtD(r.from)+' au '+fmtD(r.to):'Période'}</button><select id="cvCatSel" class="chip ${S.convCat?'active':''}" title="n'afficher qu'un type (liste et pastilles du plan)"><option value="">Type : tous</option>${CAT_DEF.map(([k,i,l])=>{const n=C.msgs.filter(m=>m.kind!=='undo'&&m.kind!=='credit'&&catOf(m).k===k).length;return n||S.convCat===k?`<option value="${k}" ${S.convCat===k?'selected':''}>${i} ${esc(l)} (${n})</option>`:'';}).join('')}</select></div>
  ${S.convRangeUI||hasRange?`<div class="cvRange"><label>du <input type="date" id="cvDFrom" class="f" value="${esc(r&&r.from||'')}"></label><label>au <input type="date" id="cvDTo" class="f" value="${esc(r&&r.to||'')}"></label><button class="btn sm" data-cvpre="today">Aujourd'hui</button><button class="btn sm" data-cvpre="7">7 jours</button><button class="btn sm" data-cvpre="30">30 jours</button><button class="btn sm" data-cvpre="clear">✕ Toute la période</button><span class="hint" style="margin:0;flex-basis:100%">La période vaut aussi pour les pastilles du plan d'ensemble — utile pour prouver ce qui était en place tel jour (balisage, fermeture…).</span></div>`:''}
  ${hiddenUnread.length?`<div class="card" style="background:#eef3fb;border-color:#9ec5f4;padding:8px 10px;font-size:12.5px">👁 <b>${hiddenUnread.length} message${hiddenUnread.length>1?'s':''} non lu${hiddenUnread.length>1?'s':''}</b> masqué${hiddenUnread.length>1?'s':''} par tes filtres ou la période. <button class="lnk" data-cvf="all" style="font-weight:700">Tout afficher</button></div>`:''}
  ${msgs.length!==C.msgs.length&&!hiddenUnread.length?`<div class="hint" style="margin:0 0 4px">${C.msgs.length-msgs.length} message${C.msgs.length-msgs.length>1?'s':''} masqué${C.msgs.length-msgs.length>1?'s':''} par les filtres${hasRange?' et la période':''}.</div>`:''}${pend.length&&canVal?`<div class="card" style="background:#fff7ec;border-color:#f2c38a;padding:8px 10px;font-size:12.5px">🛡 <b>${pend.length} demande${pend.length>1?'s':''} d'annulation</b> attend${pend.length>1?'ent':''} ta validation — ${pend.map(m=>esc(m.by)).filter((v,i,a)=>a.indexOf(v)===i).join(', ')}.</div>`:''}
  <div class="cvList" id="cvList">${msgs.length?msgs.map(m=>msgHTML(m)).join(''):'<div class="card muted">Rien pour l\'instant. Une note, une photo, une tâche : tout ce qui se dit sur le chantier reste ici, daté et signé.</div>'}</div>
  ${canPost?`<div class="cvComposer card">
    <div class="cvCats">${CAT_DEF.map(([k,i,l,h])=>`<button class="chip ${(d.cat||'divers')===k?'active':''}" data-cvcat="${k}" title="${esc(h)}">${i} ${esc(l)}</button>`).join('')}</div>
    <div class="cvChips">${d.pos?`<span class="pill hot" data-cvpos="x">📍 ${esc(locText(d))} <span class="x">✕</span></span>`:`<button class="btn sm" id="cvPose">📍 Placer sur le plan</button>`}
      ${d.photos.map((p,i)=>`<span class="pill" data-cvph="${i}"><img src="${p}" style="height:28px;border-radius:4px;vertical-align:middle"> <span class="x">✕</span></span>`).join('')}<label class="btn sm">📷 Photo<input type="file" accept="image/*" capture="environment" id="cvPhoto" style="display:none" multiple></label>
      ${canTask?`<label class="pill ${d.task?'hot':''}" style="cursor:pointer"><input type="checkbox" id="cvTask" ${d.task?'checked':''}> ☐ Tâche à faire</label>`:''}</div>
    ${canTask&&d.task?`<div class="cvTaskRow"><b>Pour</b> <select id="cvTo" class="f"><option value="${TOUS}" ${d.to===TOUS?'selected':''}>À traiter — n'importe qui (non attribuée)</option>${groups.map(g=>`<optgroup label="${esc(g.label)}">${g.people.map(p=>`<option value="${esc(p.name)}" ${d.to===p.name?'selected':''}>${esc(p.label)}</option>`).join('')}</optgroup>`).join('')}</select><span class="hint" style="margin:0">La personne la voit dans « 👤 Mes tâches » (pastille sur l'onglet) et la déclare faite, photo à l'appui. Non attribuée : tout le monde la voit, le premier qui la prend la garde.</span></div>`:''}
    <div style="display:flex;gap:6px;align-items:flex-end"><textarea id="cvText" class="f" rows="2" placeholder="${d.task?'Quoi faire ? (ex. : vannes du conteneur à souder)':'Écrire… (ex. : vanne fermée, poubelle à ramasser, question au chef)'}" style="flex:1;resize:vertical">${esc(d.text)}</textarea><button class="btn primary" id="cvSend" style="padding:10px 14px">Envoyer</button></div>
    <div class="hint" style="margin-top:4px">Une note placée sur le plan apparaît en pastille au bon endroit (icône du type) ; une tâche reste « à faire » tant que la personne ne l'a pas déclarée faite (photo à l'appui). Sur le plan : tâches à faire + notes des ${RECENT_DAYS} derniers jours ; l'historique complet avec 📅 Période ou 👁 « tout l'historique ».</div></div>`:'<div class="hint">Lecture seule : ton compte ne peut pas écrire dans la conversation.</div>'}`;
  el.querySelectorAll('[data-cvf]').forEach(b=>b.onclick=()=>{if(b.dataset.cvf==='all'){setFilters([]);S.convRange=null;S.convRangeUI=false;S.convCat=null;}else toggleFilter(b.dataset.cvf);renderConv();A.renderPlan();});
  const rb=el.querySelector('[data-cvrange]');if(rb)rb.onclick=()=>{S.convRangeUI=!S.convRangeUI;if(!S.convRangeUI&&!hasRange)S.convRange=null;renderConv();};
  const setRange=(from,to)=>{S.convRange={from:from||'',to:to||''};S.convRangeUI=true;renderConv();A.renderPlan();};
  const fi=el.querySelector('#cvDFrom'),ti=el.querySelector('#cvDTo'); /* ids distincts du select « Pour » (#cvTo) */if(fi)fi.onchange=()=>setRange(fi.value,ti?ti.value:'');if(ti)ti.onchange=()=>setRange(fi?fi.value:'',ti.value);
  el.querySelectorAll('[data-cvpre]').forEach(b=>b.onclick=()=>{const p=b.dataset.cvpre;if(p==='clear'){S.convRange=null;S.convRangeUI=false;renderConv();A.renderPlan();return;}if(p==='today')setRange(todayStr(),todayStr());else setRange(daysAgo(+p),todayStr());});
  const ta=el.querySelector('#cvText');if(ta)ta.oninput=()=>{d.text=ta.value;};
  const pose=el.querySelector('#cvPose');if(pose)pose.onclick=()=>{d.text=ta?ta.value:d.text;convStartPose(true);};
  el.querySelectorAll('[data-cvpos]').forEach(x=>x.onclick=()=>{d.pos=null;d.line=null;d.pk=null;renderConv();});
  el.querySelectorAll('[data-cvph]').forEach(x=>x.onclick=()=>{d.photos.splice(+x.dataset.cvph,1);renderConv();});
  const ph=el.querySelector('#cvPhoto');if(ph)ph.onchange=async e=>{d.text=ta?ta.value:d.text;for(const f0 of [...e.target.files]){const dat=await A.compressPhoto(f0);d.photos.push(dat);}renderConv();};
  const tk=el.querySelector('#cvTask');if(tk)tk.onchange=()=>{d.text=ta?ta.value:d.text;d.task=tk.checked?{}:null;renderConv();};
  const to=el.querySelector('#cvTo');if(to)to.onchange=()=>{d.to=to.value;};
  el.querySelectorAll('[data-cvcat]').forEach(b=>b.onclick=()=>{d.text=ta?ta.value:d.text;d.cat=b.dataset.cvcat;renderConv();});
  const cs=el.querySelector('#cvCatSel');if(cs)cs.onchange=()=>{S.convCat=cs.value||null;renderConv();A.renderPlan();};
  const send=el.querySelector('#cvSend');if(send)send.onclick=()=>post(ta?ta.value:d.text);
  el.querySelectorAll('[data-cvdone]').forEach(b=>b.onclick=()=>doneModal(b.dataset.cvdone));
  el.querySelectorAll('[data-cvundo]').forEach(b=>b.onclick=()=>decideUndo(b.dataset.cvundo,b.dataset.cvact));
  el.querySelectorAll('[data-cvtake]').forEach(b=>b.onclick=()=>{const m=C.msgs.find(x=>x.id===b.dataset.cvtake);if(!m||!m.task||m.task.done)return;m.task.to=me();m.task.takenBy=me();m.task.takenAt=new Date().toISOString();save();renderConv();convBadge();A.toast('Tâche prise — elle est dans « Mes tâches »');});
  el.querySelectorAll('[data-cvgo]').forEach(b=>b.onclick=()=>{const m=C.msgs.find(x=>x.id===b.dataset.cvgo);if(!m||!m.pos)return;S.tab='plan';A.renderAll();setTimeout(()=>A.centerOn&&A.centerOn(m.pos[0],m.pos[1],Math.max(S.view.k,6)),30);});
  el.querySelectorAll('[data-cvdel]').forEach(b=>b.onclick=()=>{if(!confirm('Supprimer ce message ?'))return;C.msgs=C.msgs.filter(x=>x.id!==b.dataset.cvdel);save();renderConv();convBadge();A.renderPlan();});
  el.querySelectorAll('[data-cvimg]').forEach(i=>i.onclick=()=>{const w=window.open('about:blank');if(w){w.document.write(`<img src="${i.dataset.cvimg}" style="max-width:100%">`);w.document.close();}});
  if(S.convFocus){const b=el.querySelector(`[data-cvid="${CSS.escape(S.convFocus)}"]`);if(b){b.scrollIntoView({block:'center'});b.classList.add('flash');}S.convFocus=null;}
  else{const L=el.querySelector('#cvList');if(L)L.scrollTop=L.scrollHeight;}}
function undoHTML(m){const esc=A.esc;const u=m.undo;const canVal=A.undo&&A.undo.canValidate();const what=u.what==='suppl'?'le retrait de la soudure ajoutée <b>'+esc(u.weldId)+'</b>':'l\'annulation de l\'étape <b>'+esc(String(u.n))+'</b> de <b>'+esc(u.weldId)+'</b>';
  const st=u.status==='pending'?'<span class="tag" style="background:#eb6834">⏳ à valider</span>':u.status==='done'?'<span class="tag" style="background:#0ca30c">✓ validée</span>':u.status==='credited'?'<span class="tag" style="background:#2a9d5c">＋ crédit redonné</span>':'<span class="tag" style="background:#8a877f">✕ refusée</span>';
  return `<div class="cvMsg undo" data-cvid="${esc(m.id)}"><div class="cvHead"><b>${esc(m.by||'')}</b> · ${dhFR(m.at)} · 🛡 demande d'annulation</div>
   <div class="cvTask ${u.status!=='pending'?'done':''}">${st} ${esc(m.by)} demande ${what}${m.text?' — « '+esc(m.text)+' »':''}${u.limit?' <span style="color:#b8560f;font-weight:700">· limite d\'annulations atteinte cette semaine</span>':u.left!=null?' <span class="dim">· '+u.used+' annulation'+(u.used>1?'s':'')+' déjà cette semaine</span>':''}
   ${u.status!=='pending'?`<br><span class="dim">${u.status==='done'?'validée et exécutée':u.status==='credited'?'crédit redonné (à lui de faire l\'annulation)':'refusée'} le ${dhFR(u.decidedAt)} par <b>${esc(u.decidedBy||'')}</b>${u.note?' : '+esc(u.note):''}</span>`:''}</div>
   ${u.status==='pending'&&canVal?`<div style="margin-top:6px;display:flex;gap:6px;flex-wrap:wrap"><button class="btn sm primary" data-cvundo="${esc(m.id)}" data-cvact="ok">✓ Valider : ${u.what==='suppl'?'retirer la soudure':'annuler l\'étape'}</button><button class="btn sm" data-cvundo="${esc(m.id)}" data-cvact="credit">＋ Redonner 1 crédit à ${esc(m.by)}</button><button class="btn sm" data-cvundo="${esc(m.id)}" data-cvact="no" style="color:#d03b3b">✕ Refuser</button></div>`:''}</div>`;}
function creditHTML(m){const esc=A.esc;const c=m.credit||{};return `<div class="cvMsg credit" data-cvid="${esc(m.id)}"><div class="cvHead"><b>${esc(m.by||'')}</b> · ${dhFR(m.at)} · 🛡 crédits</div><div class="cvText">＋ ${c.n||1} crédit${(c.n||1)>1?'s':''} d'annulation redonné${(c.n||1)>1?'s':''} à <b>${esc(c.to||'')}</b>${m.text?' — '+esc(m.text):''}</div></div>`;}
function pendingUndos(){const C=convOf();if(!C)return [];return C.msgs.filter(m=>m.kind==='undo'&&m.undo&&m.undo.status==='pending');}
function decideUndo(id,act){const C=convOf();const m=C&&C.msgs.find(x=>x.id===id);if(!m||!m.undo||m.undo.status!=='pending')return;if(!(A.undo&&A.undo.canValidate())){A.toast('Réservé au chef');return;}
  if(act==='credit'){const n=1;const cid='C'+(C.seq++).toString(36)+Date.now().toString(36).slice(-3);C.msgs.push({id:cid,at:new Date().toISOString(),by:me(),text:'',photos:[],pos:null,kind:'credit',credit:{to:m.by,n}});m.undo.status='credited';m.undo.decidedBy=me();m.undo.decidedAt=new Date().toISOString();save();renderConv();convBadge();A.toast(n+' crédit redonné à '+m.by+' — il peut annuler lui-même');return;}
  if(act==='no'){const note=prompt('Motif du refus (facultatif)','');if(note===null)return;m.undo.status='refused';m.undo.decidedBy=me();m.undo.decidedAt=new Date().toISOString();m.undo.note=note.trim();save();renderConv();convBadge();A.toast('Demande refusée');return;}
  const err=A.undo.apply(m,me());if(err){A.toast('Impossible : '+err);return;}m.undo.status='done';m.undo.decidedBy=me();m.undo.decidedAt=new Date().toISOString();save();renderConv();convBadge();A.toast((m.undo.what==='suppl'?'Soudure retirée':'Étape '+m.undo.n+' annulée')+' — demande de '+m.by+' validée');}
function msgHTML(m){if(m.kind==='undo'&&m.undo)return undoHTML(m);if(m.kind==='credit')return creditHTML(m);const esc=A.esc;const t=m.task;const mine=m.by===me();const canClose=t&&!t.done&&(isMine(m)||A.can('conv.task'));
  return `<div class="cvMsg ${m.kind} ${mine?'mine':''}" data-cvid="${esc(m.id)}"><div class="cvHead"><span class="cvCat" title="${esc(catOf(m).label)}">${catOf(m).icon}</span> <b>${esc(m.by||'')}</b> · ${dhFR(m.at)}${m.pos?` · <button class="lnk" data-cvgo="${esc(m.id)}">📍 ${esc(locText(m))}</button>`:''}${(mine||A.can('conv.task'))?` <button class="lnk dim" data-cvdel="${esc(m.id)}" title="supprimer">✕</button>`:''}</div>
   ${m.kind==='task'?`<div class="cvTask ${t.done?'done':''}"><span class="tag">${t.done?'✓ fait':'☐ à faire'}</span> ${t.to===TOUS?'<b>à traiter</b> — non attribuée':'pour <b>'+esc(t.to)+'</b>'}${t.takenBy&&!t.done?` <span class="dim">(prise par ${esc(t.takenBy)} le ${dhFR(t.takenAt)})</span>`:''}${t.done?` — le ${dhFR(t.doneAt)} par <b>${esc(t.doneBy||'')}</b>${t.doneNote?' : '+esc(t.doneNote):''}`:''}</div>`:''}
   ${m.text?`<div class="cvText">${esc(m.text)}</div>`:''}
   ${(m.photos||[]).length?`<div class="cvPh">${m.photos.map(p=>`<img src="${esc(p)}" data-cvimg="${esc(p)}" loading="lazy">`).join('')}</div>`:''}
   ${t&&t.done&&(t.donePhotos||[]).length?`<div class="cvPh"><span class="dim" style="font-size:11px;width:100%">photo du travail fait :</span>${t.donePhotos.map(p=>`<img src="${esc(p)}" data-cvimg="${esc(p)}" loading="lazy">`).join('')}</div>`:''}
   ${canClose?`<div style="margin-top:6px;display:flex;gap:6px;flex-wrap:wrap">${t.to===TOUS&&A.can('conv.post')?`<button class="btn sm" data-cvtake="${esc(m.id)}">👋 Je la prends</button>`:''}<button class="btn sm primary" data-cvdone="${esc(m.id)}">✓ Déclarer fait (photo)</button></div>`:''}</div>`;}
async function post(text){const C=convOf();if(!C)return;const d=draft();text=(text||'').trim();if(!text&&!d.photos.length){A.toast('Écris quelque chose ou ajoute une photo');return;}
  if(!A.can('conv.post')){A.toast('Pas le droit d\'écrire');return;}if(d.task&&!A.can('conv.task')){A.toast('Pas le droit de créer une tâche');return;}
  const id='C'+(C.seq++).toString(36)+Date.now().toString(36).slice(-3);const photos=[];for(const p of d.photos){let u=null;try{u=await A.uploadPhoto('conv:'+id,p);}catch(e){}photos.push(u||p);}
  const m={id,at:new Date().toISOString(),by:me(),text,photos,pos:d.pos,line:d.line,pk:d.pk,near:d.pos&&Array.isArray(d.near)?d.near.slice(0,6):null,cat:CAT[d.cat]?d.cat:'divers',kind:d.task?'task':(d.pos?'note':'msg')};if(d.task)m.task={to:d.to||TOUS,done:false};
  C.msgs.push(m);save();A.state.convDraft=null;renderConv();convBadge();A.renderPlan();A.toast(m.kind==='task'?'Tâche créée pour '+(m.task.to===TOUS?'tout le monde':m.task.to):m.pos?'Note posée sur le plan':'Envoyé');}
function doneModal(id){const C=convOf();const m=C&&C.msgs.find(x=>x.id===id);if(!m||!m.task)return;const esc=A.esc;
  A.openModal(`<h3 style="margin-top:0">Déclarer fait</h3><div style="font-size:13px;margin-bottom:6px">${esc(m.text||'')}</div><div class="hint">Une photo du travail fait, c'est la preuve pour tout le monde (et pour le DOE).</div>
   <div class="thumbs" id="cvdThumbs" style="margin:6px 0"></div><label class="btn">📷 Photo<input type="file" accept="image/*" capture="environment" id="cvdPhoto" style="display:none" multiple></label>
   <label class="f" style="margin-top:8px">Commentaire (facultatif)</label><input class="f" id="cvdNote" placeholder="ex. : 2 vannes soudées, conteneur vidé">
   <div class="actions" style="margin-top:8px"><button class="btn primary block" id="cvdOk">✓ C'est fait</button><button class="btn block" data-close>Annuler</button></div>`);
  const md=document.getElementById('modal');const phs=[];const th=md.querySelector('#cvdThumbs');
  md.querySelector('#cvdPhoto').onchange=async e=>{for(const f0 of [...e.target.files]){phs.push(await A.compressPhoto(f0));}th.innerHTML=phs.map(p=>`<div class="thumb"><img src="${p}"></div>`).join('');};
  md.querySelector('#cvdOk').onclick=async()=>{const up=[];for(const p of phs){let u=null;try{u=await A.uploadPhoto('conv:'+id+':done',p);}catch(e){}up.push(u||p);}m.task.done=true;m.task.doneAt=new Date().toISOString();m.task.doneBy=me();m.task.doneNote=md.querySelector('#cvdNote').value.trim();m.task.donePhotos=up;save();A.closeModal();renderConv();convBadge();A.renderPlan();A.toast('Tâche faite'+(up.length?' — photo jointe':''));};}
/* ---------- plan : pastilles des notes et tâches ; pastille rouge sur l'onglet ---------- */
export function renderConvOverlay(){const g=document.getElementById('convG');if(!g||!A)return;const C=convOf();if(!C||(A.state.show&&A.state.show.conv===false)){g.innerHTML='';return;}const k=A.state.view.k;const r=11/k;const esc=A.esc;let s='';
  C.msgs.filter(m=>m.pos&&convOnPlan(m)).forEach(m=>{const [x,y]=m.pos;const t=m.task;const col=m.kind==='task'?(t&&t.done?'#0ca30c':'#eb6834'):'#1c3d6b';const c=catOf(m);const typed=c.k!=='divers';const glyph=t&&t.done?'✓':(typed?c.icon:(m.kind==='task'?'!':'💬'));
    /* pastille = couleur de l'état (à faire orange, faite verte, note bleue) + icône du type ; une tâche à faire typée garde un petit « ! » */
    s+=`<g data-conv="${esc(m.id)}" style="cursor:pointer"><circle cx="${x}" cy="${y}" r="${r*1.6}" fill="transparent"/><circle cx="${x}" cy="${y}" r="${r}" fill="${col}" stroke="#fff" stroke-width="${2/k}"/><text x="${x}" y="${y+r*.38}" font-size="${r*(typed&&!(t&&t.done)?1.15:1.05)}" text-anchor="middle" fill="#fff" font-weight="800" font-family="system-ui,sans-serif" style="pointer-events:none">${glyph}</text>${typed&&t&&!t.done?`<circle cx="${x+r*.78}" cy="${y-r*.78}" r="${r*.42}" fill="#d03b3b" stroke="#fff" stroke-width="${1.5/k}"/><text x="${x+r*.78}" y="${y-r*.78+r*.16}" font-size="${r*.62}" text-anchor="middle" fill="#fff" font-weight="800" font-family="system-ui,sans-serif" style="pointer-events:none">!</text>`:''}</g>`;});
  if(A.state.convPose){s+='';}g.innerHTML=s;}
export function convOpen(id){const S=A.state;S.tab='conv';S.convFocus=id;const C=convOf();const m=C&&C.msgs.find(x=>x.id===id);if(m&&!convVisible(m)){setFilters([]);S.convRange=null;S.convCat=null;} /* la pastille cliquée doit se voir */ A.renderAll();}
export function convBadge(){const b=document.querySelector('#tabbar [data-tab="conv"]');if(!b||!A)return;if(A.state.tab!=='conv')A.state.convSeenMark=undefined;
  const ids=new Set();openTasksForMe().forEach(m=>ids.add(m.id));if(A.undo&&A.undo.canValidate())pendingUndos().forEach(m=>ids.add(m.id));if(A.state.tab!=='conv')unreadMsgs().forEach(m=>ids.add(m.id));const n=ids.size;let i=b.querySelector('.qseBadge');if(!n){if(i)i.remove();return;}if(!i){i=document.createElement('i');i.className='qseBadge';b.appendChild(i);}i.textContent=n;}
