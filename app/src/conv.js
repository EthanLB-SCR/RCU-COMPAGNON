// conv.js — CONVERSATION DU CHANTIER (Ethan 08/10 : « par chantier un onglet conversation : laisser une note géoréférencée sur le plan — vanne fermée avec la photo,
// poubelle à ramasser — envoyée dans la conversation ; un chat propre au chantier ; des messages qui créent des tâches assignées à quelqu'un, l'opérateur voit
// la tâche et la déclare faite avec photo à l'appui ; ex. sous-station : le chef note « vannes dans le conteneur à souder », l'opérateur la fait et prend en photo »).
// Données : NET.conv = {msgs:[{id,at,by,text,photos,pos:[x,y]|null,line,pk,kind:'msg'|'note'|'task',task:{to,done,doneAt,doneBy,doneNote,donePhotos}}],seq} — saveNet('conv').
let A=null;
export function initConv(api){A=api;}
const dhFR=x=>x?new Date(x).toLocaleDateString('fr-FR',{day:'2-digit',month:'2-digit'})+' '+new Date(x).toLocaleTimeString('fr-FR',{hour:'2-digit',minute:'2-digit'}):'';
const TOUS='tous';
function convOf(){if(!A)return null;const NET=A.net();if(!NET||NET.id==='__vide')return null;if(!NET.conv||typeof NET.conv!=='object')NET.conv={msgs:[],seq:1};const C=NET.conv;C.msgs=Array.isArray(C.msgs)?C.msgs:[];C.seq=C.seq||1;return C;}
function save(){A.saveNet('conv');}
function draft(){const S=A.state;if(!S.convDraft)S.convDraft={text:'',photos:[],pos:null,line:null,pk:null,task:null,to:TOUS};return S.convDraft;}
const me=()=>A.userName();
const isMine=m=>m.kind==='task'&&m.task&&(m.task.to===TOUS||m.task.to===me());
export function openTasksForMe(){const C=convOf();if(!C)return [];return C.msgs.filter(m=>m.kind==='task'&&m.task&&!m.task.done&&isMine(m));}
/* ---------- pose d'une note sur le plan ---------- */
export function convStartPose(on){const S=A.state;if(on&&!A.can('conv.post')){A.toast('Tu n\'as pas le droit d\'écrire dans la conversation');return;}
  S.convPose=on?{}:null;if(on){S.tab='plan';A.closeSheet();A.toast('Touche le plan à l\'endroit de la note');}A.renderAll();}
export function convTap(wx,wy){const S=A.state;const d=draft();d.pos=[+wx.toFixed(2),+wy.toFixed(2)];d.line=null;d.pk=null;
  try{const n=A.nearestOnLines(wx,wy);const k=S.view.k;if(n&&n.d<=40/k){d.line=n.line;d.pk=+Math.max(0,n.m).toFixed(1);}}catch(e){}
  S.convPose=null;S.tab='conv';A.renderAll();A.toast('Position posée — écris ta note'+(d.line?' ('+lineName(d.line)+' · PK '+A.fmt(d.pk)+' m)':''));
  setTimeout(()=>{const ta=document.getElementById('cvText');if(ta)ta.focus();},50);}
const lineName=id=>{const l=A.lineOf(id);return l?(l.name||id):id;};
/* ---------- rendu de l'onglet ---------- */
export function renderConv(){const el=document.getElementById('convview');if(!el)return;const C=convOf();const esc=A.esc;const S=A.state;
  if(!C){el.innerHTML='<h2 class="vt">Conversation</h2><div class="card muted">Ouvre un chantier.</div>';return;}
  const f=S.convFilter||'all';const msgs=C.msgs.filter(m=>f==='all'?true:f==='notes'?!!m.pos:f==='open'?(m.kind==='task'&&m.task&&!m.task.done):f==='done'?(m.kind==='task'&&m.task&&m.task.done):f==='mine'?(m.kind==='task'&&m.task&&!m.task.done&&isMine(m)):true);
  const nOpen=C.msgs.filter(m=>m.kind==='task'&&m.task&&!m.task.done).length,nMine=openTasksForMe().length;
  const chip=(k,l)=>`<button class="chip ${f===k?'active':''}" data-cvf="${k}">${l}</button>`;
  const d=draft();const canPost=A.can('conv.post'),canTask=A.can('conv.task');const people=[...new Set([me(),...(A.users()||[]).map(u=>u.name)])];
  el.innerHTML=`<h2 class="vt">Conversation — ${esc(A.net().name||'')}</h2>
  <div class="cvFilters">${chip('all','Tout ('+C.msgs.length+')')}${chip('notes','📍 Sur le plan ('+C.msgs.filter(m=>m.pos).length+')')}${chip('open','☐ Tâches à faire ('+nOpen+')')}${chip('mine','👤 Mes tâches ('+nMine+')')}${chip('done','✓ Faites')}</div>
  <div class="cvList" id="cvList">${msgs.length?msgs.map(m=>msgHTML(m)).join(''):'<div class="card muted">Rien pour l\'instant. Une note, une photo, une tâche : tout ce qui se dit sur le chantier reste ici, daté et signé.</div>'}</div>
  ${canPost?`<div class="cvComposer card">
    <div class="cvChips">${d.pos?`<span class="pill hot" data-cvpos="x">📍 ${d.line?esc(lineName(d.line))+' · PK '+A.fmt(d.pk)+' m':'position libre'} <span class="x">✕</span></span>`:`<button class="btn sm" id="cvPose">📍 Placer sur le plan</button>`}
      ${d.photos.map((p,i)=>`<span class="pill" data-cvph="${i}"><img src="${p}" style="height:28px;border-radius:4px;vertical-align:middle"> <span class="x">✕</span></span>`).join('')}<label class="btn sm">📷 Photo<input type="file" accept="image/*" capture="environment" id="cvPhoto" style="display:none" multiple></label>
      ${canTask?`<label class="pill ${d.task?'hot':''}" style="cursor:pointer"><input type="checkbox" id="cvTask" ${d.task?'checked':''}> ☐ tâche pour <select id="cvTo" class="f" style="padding:2px 4px;font-size:12px">${[TOUS,...people].map(p=>`<option value="${esc(p)}" ${d.to===p?'selected':''}>${p===TOUS?'tout le monde':esc(p)}</option>`).join('')}</select></label>`:''}</div>
    <div style="display:flex;gap:6px;align-items:flex-end"><textarea id="cvText" class="f" rows="2" placeholder="${d.task?'Quoi faire ? (ex. : vannes du conteneur à souder)':'Écrire… (ex. : vanne fermée, poubelle à ramasser, question au chef)'}" style="flex:1;resize:vertical">${esc(d.text)}</textarea><button class="btn primary" id="cvSend" style="padding:10px 14px">Envoyer</button></div>
    <div class="hint" style="margin-top:4px">Une note placée sur le plan apparaît en pastille au bon endroit ; une tâche reste « à faire » tant que la personne ne l'a pas déclarée faite (photo à l'appui).</div></div>`:'<div class="hint">Lecture seule : ton compte ne peut pas écrire dans la conversation.</div>'}`;
  el.querySelectorAll('[data-cvf]').forEach(b=>b.onclick=()=>{S.convFilter=b.dataset.cvf;renderConv();});
  const ta=el.querySelector('#cvText');if(ta)ta.oninput=()=>{d.text=ta.value;};
  const pose=el.querySelector('#cvPose');if(pose)pose.onclick=()=>{d.text=ta?ta.value:d.text;convStartPose(true);};
  el.querySelectorAll('[data-cvpos]').forEach(x=>x.onclick=()=>{d.pos=null;d.line=null;d.pk=null;renderConv();});
  el.querySelectorAll('[data-cvph]').forEach(x=>x.onclick=()=>{d.photos.splice(+x.dataset.cvph,1);renderConv();});
  const ph=el.querySelector('#cvPhoto');if(ph)ph.onchange=async e=>{d.text=ta?ta.value:d.text;for(const f0 of [...e.target.files]){const dat=await A.compressPhoto(f0);d.photos.push(dat);}renderConv();};
  const tk=el.querySelector('#cvTask');if(tk)tk.onchange=()=>{d.text=ta?ta.value:d.text;d.task=tk.checked?{}:null;renderConv();};
  const to=el.querySelector('#cvTo');if(to)to.onchange=()=>{d.to=to.value;};
  const send=el.querySelector('#cvSend');if(send)send.onclick=()=>post(ta?ta.value:d.text);
  el.querySelectorAll('[data-cvdone]').forEach(b=>b.onclick=()=>doneModal(b.dataset.cvdone));
  el.querySelectorAll('[data-cvgo]').forEach(b=>b.onclick=()=>{const m=C.msgs.find(x=>x.id===b.dataset.cvgo);if(!m||!m.pos)return;S.tab='plan';A.renderAll();setTimeout(()=>A.centerOn&&A.centerOn(m.pos[0],m.pos[1],Math.max(S.view.k,6)),30);});
  el.querySelectorAll('[data-cvdel]').forEach(b=>b.onclick=()=>{if(!confirm('Supprimer ce message ?'))return;C.msgs=C.msgs.filter(x=>x.id!==b.dataset.cvdel);save();renderConv();convBadge();A.renderPlan();});
  el.querySelectorAll('[data-cvimg]').forEach(i=>i.onclick=()=>{const w=window.open('about:blank');if(w){w.document.write(`<img src="${i.dataset.cvimg}" style="max-width:100%">`);w.document.close();}});
  if(S.convFocus){const b=el.querySelector(`[data-cvid="${CSS.escape(S.convFocus)}"]`);if(b){b.scrollIntoView({block:'center'});b.classList.add('flash');}S.convFocus=null;}
  else{const L=el.querySelector('#cvList');if(L)L.scrollTop=L.scrollHeight;}}
function msgHTML(m){const esc=A.esc;const t=m.task;const mine=m.by===me();const canClose=t&&!t.done&&(isMine(m)||A.can('conv.task'));
  return `<div class="cvMsg ${m.kind} ${mine?'mine':''}" data-cvid="${esc(m.id)}"><div class="cvHead"><b>${esc(m.by||'')}</b> · ${dhFR(m.at)}${m.pos?` · <button class="lnk" data-cvgo="${esc(m.id)}">📍 ${m.line?esc(lineName(m.line))+' · PK '+A.fmt(m.pk)+' m':'voir sur le plan'}</button>`:''}${(mine||A.can('conv.task'))?` <button class="lnk dim" data-cvdel="${esc(m.id)}" title="supprimer">✕</button>`:''}</div>
   ${m.kind==='task'?`<div class="cvTask ${t.done?'done':''}"><span class="tag">${t.done?'✓ fait':'☐ à faire'}</span> pour <b>${t.to===TOUS?'tout le monde':esc(t.to)}</b>${t.done?` — le ${dhFR(t.doneAt)} par <b>${esc(t.doneBy||'')}</b>${t.doneNote?' : '+esc(t.doneNote):''}`:''}</div>`:''}
   ${m.text?`<div class="cvText">${esc(m.text)}</div>`:''}
   ${(m.photos||[]).length?`<div class="cvPh">${m.photos.map(p=>`<img src="${esc(p)}" data-cvimg="${esc(p)}" loading="lazy">`).join('')}</div>`:''}
   ${t&&t.done&&(t.donePhotos||[]).length?`<div class="cvPh"><span class="dim" style="font-size:11px;width:100%">photo du travail fait :</span>${t.donePhotos.map(p=>`<img src="${esc(p)}" data-cvimg="${esc(p)}" loading="lazy">`).join('')}</div>`:''}
   ${canClose?`<div style="margin-top:6px"><button class="btn sm primary" data-cvdone="${esc(m.id)}">✓ Déclarer fait (photo)</button></div>`:''}</div>`;}
async function post(text){const C=convOf();if(!C)return;const d=draft();text=(text||'').trim();if(!text&&!d.photos.length){A.toast('Écris quelque chose ou ajoute une photo');return;}
  if(!A.can('conv.post')){A.toast('Pas le droit d\'écrire');return;}if(d.task&&!A.can('conv.task')){A.toast('Pas le droit de créer une tâche');return;}
  const id='C'+(C.seq++).toString(36)+Date.now().toString(36).slice(-3);const photos=[];for(const p of d.photos){let u=null;try{u=await A.uploadPhoto('conv:'+id,p);}catch(e){}photos.push(u||p);}
  const m={id,at:new Date().toISOString(),by:me(),text,photos,pos:d.pos,line:d.line,pk:d.pk,kind:d.task?'task':(d.pos?'note':'msg')};if(d.task)m.task={to:d.to||TOUS,done:false};
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
export function renderConvOverlay(){const g=document.getElementById('convG');if(!g||!A)return;const C=convOf();if(!C){g.innerHTML='';return;}const k=A.state.view.k;const r=11/k;const esc=A.esc;let s='';
  C.msgs.filter(m=>m.pos).forEach(m=>{const [x,y]=m.pos;const t=m.task;const col=m.kind==='task'?(t&&t.done?'#0ca30c':'#eb6834'):'#1c3d6b';const glyph=m.kind==='task'?(t&&t.done?'✓':'!'):'💬';
    s+=`<g data-conv="${esc(m.id)}" style="cursor:pointer"><circle cx="${x}" cy="${y}" r="${r*1.6}" fill="transparent"/><circle cx="${x}" cy="${y}" r="${r}" fill="${col}" stroke="#fff" stroke-width="${2/k}"/><text x="${x}" y="${y+r*.38}" font-size="${r*1.05}" text-anchor="middle" fill="#fff" font-weight="800" font-family="system-ui,sans-serif" style="pointer-events:none">${glyph}</text></g>`;});
  if(A.state.convPose){s+='';}g.innerHTML=s;}
export function convOpen(id){const S=A.state;S.tab='conv';S.convFocus=id;S.convFilter='all';A.renderAll();}
export function convBadge(){const b=document.querySelector('#tabbar [data-tab="conv"]');if(!b||!A)return;const n=openTasksForMe().length;let i=b.querySelector('.qseBadge');if(!n){if(i)i.remove();return;}if(!i){i=document.createElement('i');i.className='qseBadge';b.appendChild(i);}i.textContent=n;}
