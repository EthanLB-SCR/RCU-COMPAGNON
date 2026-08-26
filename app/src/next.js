// next.js — le paquet du 25/08 soir, codé d'avance et DÉSACTIVÉ par défaut (demande Ethan : « code à fond, on ajoute demain »).
// Interrupteurs : localStorage 'trace:next' — panneau « ⏳ Nouveautés » sur la home (chef/bureau), activation UNE PAR UNE, l'appli
// se recharge à chaque bascule. Tant que rien n'est allumé, l'appli ne change pas d'un poil.
export const NEXTF=(()=>{try{return JSON.parse(localStorage.getItem('trace:next')||'{}')||{};}catch(e){return {};}})();
export const nOn=k=>!!NEXTF[k];
let A=null; // API fournie par app.js (state, NET, sync, openModal, toast, esc…)
const FEATS=[
 ['ts','Travaux supplémentaires (hors marché)','Marquer une ligne du tracé « TS » (traceur, fiche de la ligne) : proposé / commandé / forfaitaire — hachures sur le plan, récap par TS dans l’onglet Récap, bascule d’état par le chef.'],
 ['admin','Dossier administratif','Onglet par chantier : DT / DICT, plans exé, qualifications, PGC, PPSPS, planning, habilitations, BL, accueil… Les fichiers partent au serveur (pas dans l’appli) ; un BL importé au stock peut s’y classer tout seul.'],
 ['qse','QSE — formulaires et émargements','Accueil chantier (avec signature du PPSPS), quart d’heure sécurité, et n’importe quel PDF à faire émarger — signatures au doigt sur la tablette du chef, feuilles imprimables.'],
 ['tabs','Barre d’onglets allégée','Catalogue et Liste sortent de la barre — accessibles par « ⋯ ».'],
 ['doe','Export DOE — carnet de soudage','Toutes les soudures : n°, vue du plan, qui a soudé / manchonné quel jour, photos, DH — document imprimable pour le DOE.'],
];
export function initNext(api){A=api;
  if(nOn('admin')||nOn('qse'))injectViews();
  if(nOn('tabs'))lightTabs();
}
// ---------- panneau d'activation (home) ----------
export function nextHomeHTML(role){if(role!=='chef'&&role!=='bureau')return '';const on=FEATS.filter(f=>nOn(f[0])).length;
  return `<button class="btn ghost" id="nextBtn" style="font-size:12px">⏳ Nouveautés en attente ${on?'· '+on+'/'+FEATS.length+' actives':'('+FEATS.length+')'}</button>`;}
export function nextBindHome(){const b=document.getElementById('nextBtn');if(b)b.onclick=()=>{
  A.openModal(`<h3 style="margin-top:0">Nouveautés en attente</h3>
   <p class="hint" style="margin-top:0">Codées et testées, mais INACTIVES tant que tu ne les allumes pas. Active-les une par une, vérifie tranquillement, redis-moi. (L'appli se recharge à chaque bascule.)</p>
   ${FEATS.map(f=>`<label style="display:flex;gap:8px;align-items:flex-start;padding:8px;border:1.5px solid var(--line);border-radius:10px;margin:6px 0;cursor:pointer;${nOn(f[0])?'background:#f2fbf2;border-color:#9fd49f':''}"><input type="checkbox" data-nextf="${f[0]}" ${nOn(f[0])?'checked':''} style="margin-top:3px"><span><b>${f[1]}</b><br><span class="hint">${f[2]}</span></span></label>`).join('')}
   <div class="actions"><button class="btn block" data-close>Fermer</button></div>`);
  document.querySelectorAll('#modal [data-nextf]').forEach(cb=>cb.onchange=()=>{const o={...NEXTF};if(cb.checked)o[cb.dataset.nextf]=1;else delete o[cb.dataset.nextf];try{localStorage.setItem('trace:next',JSON.stringify(o));}catch(e){}location.reload();});};}
// ---------- onglets / vues injectés ----------
function injectViews(){const tb=document.getElementById('tabbar');const cont=document.querySelector('.view')?.parentElement;if(!tb||!cont)return;
  const mk=(tab,label)=>{if(!tb.querySelector(`[data-tab="${tab}"]`)){const b=document.createElement('button');b.dataset.tab=tab;b.textContent=label;tb.insertBefore(b,tb.querySelector('[data-tab="recap"]'));}
    if(!document.getElementById('view-'+tab)){const v=document.createElement('div');v.className='view';v.id='view-'+tab;v.innerHTML='<div class="pad" id="'+tab+'"></div>';cont.appendChild(v);}};
  if(nOn('admin'))mk('admin','Dossier');
  if(nOn('qse'))mk('qse','QSE');}
function lightTabs(){const tb=document.getElementById('tabbar');if(!tb)return;
  ['catalogue','liste'].forEach(t=>{const b=tb.querySelector(`[data-tab="${t}"]`);if(b)b.style.display='none';});
  if(!tb.querySelector('[data-tab="__more"]')){const b=document.createElement('button');b.dataset.tab='__more';b.textContent='⋯';b.title='Catalogue · Liste';
    b.addEventListener('click',ev=>{ev.stopPropagation();ev.preventDefault();
      A.openModal(`<h3 style="margin-top:0">Autres onglets</h3><div class="actions"><button class="btn block" data-nmt="catalogue">Catalogue</button><button class="btn block" data-nmt="liste">Liste des soudures</button><button class="btn block" data-close>Fermer</button></div>`);
      document.querySelectorAll('#modal [data-nmt]').forEach(x=>x.onclick=()=>{A.closeModal();A.state.tab=x.dataset.nmt;A.renderAll();});},true);
    tb.appendChild(b);}}
// dispatch de renderAll pour les vues injectées
export function nextRenderTab(tab){if(tab==='admin'&&nOn('admin')){renderAdmin();return true;}if(tab==='qse'&&nOn('qse')){renderQse();return true;}return false;}
// ---------- données ----------
function adminOf(){const NET=A.net();if(!NET||NET.id==='__vide')return null;if(!NET.admin)NET.admin={docs:[]};NET.admin.docs=NET.admin.docs||[];return NET.admin;}
function qseOf(){const NET=A.net();if(!NET||NET.id==='__vide')return null;if(!NET.qse)NET.qse={docs:[]};NET.qse.docs=NET.qse.docs||[];return NET.qse;}
const dFR=x=>x?new Date(x).toLocaleDateString('fr-FR'):'';
const dhFR=x=>x?new Date(x).toLocaleDateString('fr-FR')+' '+new Date(x).toLocaleTimeString('fr-FR',{hour:'2-digit',minute:'2-digit'}):'';
// ---------- DOSSIER ADMINISTRATIF ----------
export const ADMIN_CATS=[['dt','DT / DICT'],['exe','Plans d’exécution'],['plans','Plans'],['qualif','Qualifications (soudeurs / manchonneurs)'],['pgc','PGC'],['ppsps','PPSPS'],['planning','Planning d’exécution'],['habil','Habilitations / procédures'],['bl','Bons de livraison'],['accueil','Accueil chantier'],['autre','Autre']];
function renderAdmin(){const el=document.getElementById('admin');if(!el)return;const ad=adminOf();const esc=A.esc;
  if(!ad){el.innerHTML='<h2 class="vt">Dossier administratif</h2><div class="card muted">Aucun chantier.</div>';return;}
  const canEd=A.role()==='chef'||A.role()==='bureau';
  el.innerHTML=`<h2 class="vt">Dossier administratif — ${esc(A.net().name||'')}</h2>
   <div class="hint" style="margin-bottom:8px">Les fichiers partent au SERVEUR (l'appli ne garde que la fiche : nom, date, qui). Hors connexion, un petit fichier (&lt; 1,5 Mo) peut être gardé dans l'appli en dépannage — évite pour les gros plans.</div>
   ${canEd?`<div class="card" style="display:flex;gap:6px;flex-wrap:wrap;align-items:end"><div><label class="f">Catégorie</label><select class="f" id="adm-cat">${ADMIN_CATS.map(c2=>`<option value="${c2[0]}">${c2[1]}</option>`).join('')}</select></div><label class="btn primary" style="margin-bottom:2px">📎 Déposer un fichier (PDF, photo…)<input type="file" id="adm-file" accept="application/pdf,image/*" style="display:none" multiple></label></div>`:''}
   ${ADMIN_CATS.map(([k,t])=>{const docs=ad.docs.filter(d0=>d0.cat===k);if(!docs.length&&k==='autre')return '';
     return `<details class="card" ${docs.length?'open':''}><summary style="cursor:pointer;font-size:13px"><b>${t}</b> <span class="dim">(${docs.length||'—'})</span></summary>
      ${docs.length?`<table class="rc" style="margin-top:6px">${docs.map(d0=>`<tr><td><a href="${d0.url||d0.data||'#'}" target="_blank" rel="noopener" style="color:#1c3d6b;font-weight:600">${esc(d0.name)}</a>${d0.data?' <span class="dim" style="font-size:10px">(gardé dans l’appli)</span>':''}</td><td class="dim">${esc(d0.by||'')} · ${dFR(d0.at)}</td><td>${canEd?`<button data-admdel="${d0.id}" style="border:0;background:none;cursor:pointer;color:#d03b3b">✕</button>`:''}</td></tr>`).join('')}</table>`:'<div class="hint" style="margin-top:4px">rien pour l’instant</div>'}</details>`;}).join('')}`;
  const inp=document.getElementById('adm-file');if(inp)inp.onchange=async e2=>{const cat=document.getElementById('adm-cat').value;
    for(const f of [...e2.target.files]){await adminAddFile(f,cat);}renderAdmin();};
  el.querySelectorAll('[data-admdel]').forEach(b=>b.onclick=()=>{if(!confirm('Retirer ce document du dossier ? (le fichier reste au serveur)'))return;ad.docs=ad.docs.filter(d0=>d0.id!==b.dataset.admdel);A.saveNet('admin');renderAdmin();});}
async function adminAddFile(f,cat,extra){const ad=adminOf();if(!ad)return null;
  let url=null;try{url=await A.sync.uploadDoc(A.state.siteId,'admin-'+cat,f.name,f);}catch(e){}
  let data=null;
  if(!url){if(f.size>1.5*1024*1024){A.toast('Hors connexion et fichier trop gros ('+Math.round(f.size/1024/1024*10)/10+' Mo) — reconnecte-toi pour le déposer');return null;}
    data=await new Promise(res=>{const r=new FileReader();r.onload=()=>res(r.result);r.onerror=()=>res(null);r.readAsDataURL(f);});
    if(!data){A.toast('Fichier illisible');return null;}}
  const doc={id:'D'+Date.now().toString(36)+Math.random().toString(36).slice(2,5),cat,name:f.name,size:f.size,url:url||undefined,data:data||undefined,by:A.userName(),at:new Date().toISOString(),...(extra||{})};
  ad.docs.push(doc);A.saveNet('admin');A.toast(url?'Déposé au serveur — classé en « '+(ADMIN_CATS.find(c2=>c2[0]===cat)||[])[1]+' »':'Gardé dans l’appli (hors connexion) — classé');return doc;}
// hook stock : le BL PDF importé dans une livraison se classe aussi au dossier (appelé par app.js, flag déjà vérifié là-bas)
export async function nextAdminAddBL(file,liv){if(!nOn('admin')||!file)return;const d0=await adminAddFile(file,'bl',{liv:liv&&liv.id,note:liv?('BL de « '+liv.label+' »'):''});
  if(d0)A.toast('BL classé au dossier administratif ('+file.name+')');}
// ---------- QSE ----------
export const ACCUEIL_Q=[ // PROVISOIRE — questions à remplacer par celles d'Ethan dès qu'il les envoie
 'Le chantier, ses accès, la base vie et les zones de stockage ont été présentés.',
 'Les risques propres au chantier (tranchées, levage, circulation, réseaux voisins) ont été expliqués.',
 'Les EPI obligatoires (casque, chaussures, gilet, gants, lunettes) ont été rappelés.',
 'La conduite à tenir en cas d’accident (secours, n° d’urgence, point de rassemblement) a été expliquée.',
 'Le tri des déchets et les règles environnementales du chantier ont été présentés.'];
export const QUART_Q=['Le point sécurité du jour a été compris.','Les EPI du poste sont portés et en bon état.','Aucune situation dangereuse constatée non signalée.'];
function renderQse(){const el=document.getElementById('qse');if(!el)return;const q=qseOf();const esc=A.esc;
  if(!q){el.innerHTML='<h2 class="vt">QSE</h2><div class="card muted">Aucun chantier.</div>';return;}
  const canEd=A.role()==='chef'||A.role()==='bureau';
  const T={accueil:'Accueil chantier',quart:'Quart d’heure sécurité',pdf:'Document à émarger'};
  el.innerHTML=`<h2 class="vt">QSE — ${esc(A.net().name||'')}</h2>
   <div class="hint" style="margin-bottom:8px">Une tablette par chef : le document s'ouvre, on le lit ensemble, et chaque opérateur émarge au doigt. Chaque feuille s'imprime (émargements inclus).</div>
   ${canEd?`<div class="card" style="display:flex;gap:6px;flex-wrap:wrap"><button class="btn primary" data-qnew="accueil">➕ Accueil chantier</button><button class="btn primary" data-qnew="quart">➕ Quart d’heure sécurité</button><label class="btn">📎 PDF à faire émarger (flash info…)<input type="file" id="qse-pdf" accept="application/pdf,image/*" style="display:none"></label></div>`:''}
   ${q.docs.length?q.docs.slice().reverse().map(d0=>`<div class="card" style="cursor:pointer" data-qopen="${d0.id}"><b>${esc(d0.title||T[d0.type])}</b> <span class="hyChip" style="font-size:10.5px">${T[d0.type]||d0.type}</span><div class="kv" style="margin-top:4px;font-size:12px"><span>${dFR(d0.at)}</span><span>par ${esc(d0.by||'')}</span><span><b>${(d0.sigs||[]).length}</b> émargement${(d0.sigs||[]).length>1?'s':''}</span></div></div>`).join(''):'<div class="card muted">Rien pour l’instant : crée un accueil, un quart d’heure, ou dépose un PDF.</div>'}`;
  el.querySelectorAll('[data-qnew]').forEach(b=>b.onclick=()=>qseNew(b.dataset.qnew));
  const pf=document.getElementById('qse-pdf');if(pf)pf.onchange=async e2=>{const f=e2.target.files[0];if(!f)return;
    let url=null;try{url=await A.sync.uploadDoc(A.state.siteId,'qse',f.name,f);}catch(e){}
    let data=null;if(!url){if(f.size>1.5*1024*1024){A.toast('Hors connexion et fichier trop gros — reconnecte-toi');return;}
      data=await new Promise(res=>{const r=new FileReader();r.onload=()=>res(r.result);r.onerror=()=>res(null);r.readAsDataURL(f);});}
    q.docs.push({id:qid(),type:'pdf',title:f.name.replace(/\.pdf$/i,''),url:url||undefined,data:data||undefined,by:A.userName(),at:new Date().toISOString(),sigs:[]});
    A.saveNet('qse');renderQse();A.toast('Document ajouté — ouvre-le pour les émargements');};
  el.querySelectorAll('[data-qopen]').forEach(c2=>c2.onclick=()=>qseOpen(c2.dataset.qopen));}
const qid=()=>'Q'+Date.now().toString(36)+Math.random().toString(36).slice(2,5);
function qseNew(type){const q=qseOf();if(!q)return;
  if(type==='accueil'){const ad=adminOf();const pp=ad&&ad.docs.find(d0=>d0.cat==='ppsps');
    q.docs.push({id:qid(),type,title:'Accueil chantier du '+dFR(new Date()),by:A.userName(),at:new Date().toISOString(),qs:ACCUEIL_Q.slice(),ppsps:pp?{name:pp.name,id:pp.id}:null,sigs:[]});}
  else{q.docs.push({id:qid(),type,title:'Quart d’heure sécurité du '+dFR(new Date()),by:A.userName(),at:new Date().toISOString(),theme:'',points:'',qs:QUART_Q.slice(),sigs:[]});}
  A.saveNet('qse');renderQse();qseOpen(q.docs[q.docs.length-1].id);}
function qseOpen(id){const q=qseOf();const d0=q&&q.docs.find(x=>x.id===id);if(!d0)return;const esc=A.esc;
  const canEd=A.role()==='chef'||A.role()==='bureau';
  const body=d0.type==='pdf'
    ?`<div class="card"><a href="${d0.url||d0.data||'#'}" target="_blank" rel="noopener" class="btn block">📄 Ouvrir le document (lecture ensemble)</a><div class="hint" style="margin-top:4px">L'émargement vaut « j'ai pris connaissance de ce document ».</div></div>`
    :d0.type==='accueil'
    ?`<div class="card"><b style="font-size:12.5px">Points passés en revue</b><ul style="margin:6px 0 2px;padding-left:18px;font-size:12.5px;line-height:1.7">${(d0.qs||[]).map(x=>`<li>${esc(x)}</li>`).join('')}</ul>
      <div class="${d0.ppsps?'okbox':'warnbox'}" style="font-size:12px;margin-top:6px">${d0.ppsps?'Le PPSPS « '+esc(d0.ppsps.name)+' » (dossier administratif) a été présenté : l’émargement vaut AUSSI signature du PPSPS.':'Aucun PPSPS au dossier administratif — dépose-le (catégorie PPSPS) pour que l’émargement vaille signature du PPSPS.'}</div></div>`
    :`<div class="card"><div class="row" style="display:flex;gap:6px;flex-wrap:wrap"><div style="flex:1;min-width:180px"><label class="f">Thème du jour</label><input class="f" id="qse-theme" value="${esc(d0.theme||'')}" ${canEd?'':'disabled'} placeholder="ex. travaux à proximité des réseaux"></div></div>
      <label class="f" style="margin-top:6px">Points abordés</label><textarea class="f" id="qse-points" ${canEd?'':'disabled'} style="min-height:64px">${esc(d0.points||'')}</textarea>
      <b style="font-size:12.5px">Questions</b><ul style="margin:4px 0;padding-left:18px;font-size:12.5px;line-height:1.7">${(d0.qs||[]).map(x=>`<li>${esc(x)}</li>`).join('')}</ul></div>`;
  A.openModal(`<h3 style="margin-top:0">${esc(d0.title)}</h3><div class="kv" style="font-size:12px"><span>${dFR(d0.at)}</span><span>par ${esc(d0.by||'')}</span></div>${body}
   <b style="font-size:12.5px">Émargements (${(d0.sigs||[]).length})</b>
   ${(d0.sigs||[]).length?`<table class="rc" style="margin-top:4px">${d0.sigs.map(s2=>`<tr><td>${esc(s2.name)}</td><td class="dim">${esc(s2.detail||'')}</td><td class="dim">${dhFR(s2.at)}</td><td>${s2.img?`<img src="${s2.img}" style="height:26px">`:''}</td></tr>`).join('')}</table>`:'<div class="hint">personne n’a encore signé</div>'}
   <div class="actions" style="margin-top:8px"><button class="btn primary block" id="qse-sign">✍️ Émarger (opérateur suivant)</button><button class="btn block" id="qse-print">🖨 Feuille d’émargement</button>${canEd?`<button class="btn block" id="qse-del" style="color:#d03b3b">Supprimer</button>`:''}<button class="btn block" data-close>Fermer</button></div>`);
  const th=document.getElementById('qse-theme');if(th)th.onchange=()=>{d0.theme=th.value;A.saveNet('qse');};
  const po=document.getElementById('qse-points');if(po)po.onchange=()=>{d0.points=po.value;A.saveNet('qse');};
  document.getElementById('qse-sign').onclick=()=>qseSign(d0);
  document.getElementById('qse-print').onclick=()=>qsePrint(d0);
  const dl=document.getElementById('qse-del');if(dl)dl.onclick=()=>{if(!confirm('Supprimer « '+d0.title+' » et ses émargements ?'))return;q.docs=q.docs.filter(x=>x.id!==d0.id);A.saveNet('qse');A.closeModal();renderQse();};}
// signature au doigt : nom + trait sur canvas (tablette du chef, les opérateurs passent chacun leur tour)
function qseSign(d0){const esc=A.esc;const others=A.users().map(u=>u.name);
  A.openModal(`<h3 style="margin-top:0">Émargement — ${esc(d0.title)}</h3>
   <label class="f">Qui signe ?</label><div class="row" style="display:flex;gap:6px"><select class="f" id="sig-who" style="flex:1"><option value="">— saisir un nom —</option>${others.map(n=>`<option>${esc(n)}</option>`).join('')}</select><input class="f" id="sig-name" placeholder="Nom Prénom" style="flex:1"></input></div>
   <label class="f" style="margin-top:6px">Signature au doigt <span class="dim">(la case = « j'ai pris connaissance »)</span></label>
   <canvas id="sig-pad" width="640" height="220" style="width:100%;height:150px;border:1.5px dashed #b8b4a8;border-radius:10px;background:#fff;touch-action:none"></canvas>
   <div class="actions" style="margin-top:8px"><button class="btn primary block" id="sig-ok">Valider l’émargement</button><button class="btn block" id="sig-clear">Effacer le trait</button><button class="btn block" data-close>Annuler</button></div>`);
  const cv=document.getElementById('sig-pad');const cx=cv.getContext('2d');cx.lineWidth=3.4;cx.lineCap='round';cx.strokeStyle='#14213d';let drawing=false,drawn=false;
  const pos=e2=>{const r=cv.getBoundingClientRect();return {x:(e2.clientX-r.left)*cv.width/r.width,y:(e2.clientY-r.top)*cv.height/r.height};};
  cv.addEventListener('pointerdown',e2=>{drawing=true;drawn=true;const p=pos(e2);cx.beginPath();cx.moveTo(p.x,p.y);try{cv.setPointerCapture(e2.pointerId);}catch(e3){}});
  cv.addEventListener('pointermove',e2=>{if(!drawing)return;const p=pos(e2);cx.lineTo(p.x,p.y);cx.stroke();});
  const up=()=>{drawing=false;};cv.addEventListener('pointerup',up);cv.addEventListener('pointercancel',up);
  document.getElementById('sig-clear').onclick=()=>{cx.clearRect(0,0,cv.width,cv.height);drawn=false;};
  const who=document.getElementById('sig-who');who.onchange=()=>{if(who.value)document.getElementById('sig-name').value=who.value;};
  document.getElementById('sig-ok').onclick=()=>{const name=document.getElementById('sig-name').value.trim();
    if(!name){A.toast('Le nom du signataire');return;}
    if(!drawn){A.toast('La signature (un trait au doigt)');return;}
    d0.sigs=d0.sigs||[];d0.sigs.push({name,detail:'',at:new Date().toISOString(),img:cv.toDataURL('image/png')});
    A.saveNet('qse');A.closeModal();qseOpen(d0.id);A.toast(name+' a émargé — au suivant');};}
function qsePrint(d0){const esc=A.esc;const NET=A.net();
  const w=window.open('','_blank');if(!w){A.toast('Autorise la fenêtre pop-up pour imprimer');return;}
  w.document.write(`<!doctype html><html lang="fr"><head><meta charset="utf-8"><title>${esc(d0.title)}</title>
  <style>body{font-family:system-ui,sans-serif;margin:28px;color:#111}h1{font-size:18px;margin:0 0 2px}h2{font-size:13.5px;margin:16px 0 6px}table{border-collapse:collapse;width:100%;font-size:12.5px}th,td{border:1px solid #bbb;padding:6px 8px;text-align:left}th{background:#f2f1ec}li{margin:3px 0}img{height:34px}@media print{button{display:none}}</style></head><body>
  <button onclick="print()" style="float:right;padding:8px 14px">🖨 Imprimer / PDF</button>
  <h1>${esc(d0.title)}</h1><div style="color:#555;font-size:12.5px">${esc(NET.name||'')} · créé le ${dFR(d0.at)} par ${esc(d0.by||'')}</div>
  ${d0.type==='quart'?`<h2>Thème</h2><div>${esc(d0.theme||'—')}</div><h2>Points abordés</h2><div style="white-space:pre-wrap">${esc(d0.points||'—')}</div>`:''}
  ${(d0.qs||[]).length?`<h2>${d0.type==='accueil'?'Points de l’accueil':'Questions'}</h2><ul>${d0.qs.map(x=>`<li>${esc(x)}</li>`).join('')}</ul>`:''}
  ${d0.type==='accueil'?`<div style="font-size:12.5px;margin-top:6px">${d0.ppsps?('Le PPSPS « '+esc(d0.ppsps.name)+' » a été présenté : la signature ci-dessous vaut AUSSI signature du PPSPS.'):'PPSPS : non joint au dossier au moment de l’accueil.'}</div>`:''}
  ${d0.type==='pdf'?`<div style="font-size:12.5px">Document : ${esc(d0.title)} — la signature vaut « j’ai pris connaissance ».</div>`:''}
  <h2>Émargements (${(d0.sigs||[]).length})</h2><table><tr><th>Nom</th><th>Date</th><th>Signature</th></tr>
  ${(d0.sigs||[]).map(s2=>`<tr><td>${esc(s2.name)}</td><td>${dhFR(s2.at)}</td><td>${s2.img?`<img src="${s2.img}">`:''}</td></tr>`).join('')}
  ${Array.from({length:Math.max(0,6-(d0.sigs||[]).length)}).map(()=>'<tr><td style="height:34px"></td><td></td><td></td></tr>').join('')}</table>
  </body></html>`);w.document.close();}
// ---------- TS / hors marché : récap + bascule (le marquage se fait au traceur, fiche de la ligne) ----------
export const HM_ET={propose:'TS proposé',commande:'TS commandé',forfait:'forfaitaire (hors marché)',marche:'dans le marché'};
export function nextTsRecapHTML(){if(!nOn('ts'))return '';const esc=A.esc;const NET=A.net();if(!NET)return '';
  const lines=Object.values(A.state.lines).filter(l=>l.hm&&l.hm.etat);if(!lines.length)return `<div class="card"><h3 style="margin-top:0">Travaux supplémentaires</h3><div class="hint">Aucune ligne marquée hors marché. Ça se marque au TRACEUR, dans la fiche de la ligne (bloc « Marché / TS »).</div></div>`;
  const per={};lines.forEach(l=>{const k=(l.hm.ts||'(sans n°)');(per[k]=per[k]||[]).push(l);});
  return `<div class="card"><h3 style="margin-top:0">Travaux supplémentaires</h3>
   ${Object.entries(per).map(([ts,ls])=>{const ml=ls.reduce((t,l)=>t+(l.length||0),0);const nW=ls.reduce((t,l)=>t+['A','R'].reduce((t2,c)=>t2+((l.cond[c]||{}).joints||[]).length,0),0);
     return `<div style="border:1px solid var(--line);border-radius:10px;padding:8px;margin:6px 0"><b>${esc(ts)}</b> — ${ls.map(l=>esc(l.name)).join(', ')}<div class="kv" style="font-size:12px;margin-top:4px"><span>${A.fmt(ml)} m d’axe</span><span>${nW} soudures</span><span>état : <b>${esc(HM_ET[ls[0].hm.etat]||ls[0].hm.etat)}</b></span></div>
      ${(A.role()==='chef'||A.role()==='bureau')?`<div style="display:flex;gap:6px;flex-wrap:wrap;margin-top:6px">${Object.entries(HM_ET).map(([v,t])=>`<button class="btn sm ${ls[0].hm.etat===v?'primary':''}" data-tsst="${v}" data-tslines="${ls.map(l=>l.id).join(',')}">${t}</button>`).join('')}</div>`:''}</div>`;}).join('')}
   <div class="hint">« dans le marché » = la commande est passée ou c’est finalement du global : les hachures disparaissent du plan, la trace reste ici.</div></div>`;}
export function nextBindRecap(el){el.querySelectorAll('[data-tsst]').forEach(b=>b.onclick=()=>{const NET=A.net();
  b.dataset.tslines.split(',').forEach(id=>{const l=A.state.lines[id];const L0=(NET.lines||[]).find(x=>x.id===id);
    if(l)l.hm={...(l.hm||{}),etat:b.dataset.tsst};if(L0)L0.hm={...(L0.hm||{}),etat:b.dataset.tsst};});
  A.saveNet('lines');A.renderAll();A.toast('État TS mis à jour');});}
// ---------- EXPORT DOE : carnet de soudage / manchonnage ----------
export function nextDoeHTML(){if(!nOn('doe'))return '';return `<div class="card"><h3 style="margin-top:0">Export DOE</h3><div class="hint" style="margin-top:0">Le carnet de soudage / manchonnage : chaque soudure avec sa vue du plan, qui a soudé / manchonné quel jour, les photos, la DH.</div><button class="btn primary" id="doe-go" style="margin-top:6px">📕 Générer le carnet (imprimable)</button></div>`;}
export function nextBindDoe(el){const b=el.querySelector('#doe-go');if(b)b.onclick=doeOpen;}
function miniPlan(all,l,p){ // vue du plan : réseau en gris, la position en rouge
  let x0=1e9,y0=1e9,x1=-1e9,y1=-1e9;all.forEach(L2=>(L2.pts||[]).forEach(q=>{x0=Math.min(x0,q.x);y0=Math.min(y0,q.y);x1=Math.max(x1,q.x);y1=Math.max(y1,q.y);}));
  if(x0>x1)return '';const pad=Math.max(6,(x1-x0)*.06);x0-=pad;y0-=pad;x1+=pad;y1+=pad;
  return `<svg viewBox="${x0} ${y0} ${x1-x0} ${y1-y0}" width="190" style="background:#f4f3ee;border-radius:6px">${all.map(L2=>`<path d="M ${(L2.pts||[]).map(q=>q.x+' '+q.y).join(' L ')}" stroke="${L2.id===l.id?'#c8382f':'#b9b6ad'}" stroke-width="${L2.id===l.id?2.2:1.2}" vector-effect="non-scaling-stroke" fill="none"/>`).join('')}<circle cx="${p.x}" cy="${p.y}" r="3.4" fill="#d03b3b" stroke="#fff" stroke-width="1.2" vector-effect="non-scaling-stroke"/></svg>`;}
function doeOpen(){const esc=A.esc;const NET=A.net();const all=Object.values(A.state.lines);
  const w=window.open('','_blank');if(!w){A.toast('Autorise la fenêtre pop-up');return;}
  const S_LAB={soudee:'Soudée',controlee:'Contrôlée',manchonnee:'Manchonnée',a_reprendre:'À reprendre',a_souder:'À souder'};
  let body='';let nDone=0,nTot=0;
  all.forEach(l=>['A','R'].forEach(c=>{const cd=l.cond[c];if(!cd)return;cd.joints.forEach(j=>{nTot++;
    if(j.status==='a_souder'&&!(j.events||[]).length)return;nDone++;
    const e=cd.els[j.idx];const p=e?e.to:{x:0,y:0};
    const evs=(j.events||[]).map(ev=>{const t=ev.type==='soudee'?'Soudée'+(ev.data&&ev.data.procede?' ('+(ev.data.procede==='tig'?'TIG':'Cellulosique')+')':''):ev.type==='manchonnee'?'Manchonnée'+(ev.data&&ev.data.manchon?' ('+ev.data.manchon+')':''):ev.type==='controle'?'Contrôle '+((ev.data||{}).result||''):ev.type;
      return `<tr><td>${esc(t)}</td><td>${A.uname(ev.by)}</td><td>${dhFR(ev.at)}</td></tr>`;}).join('');
    const st=j.steps||{};const stRows=[1,2,3,4].filter(n=>st[n]&&st[n].done).map(n=>`<tr><td>Étape ${n}/4 ${['','Soudure','Fils + DH','Manchon','Moussage'][n]}</td><td>${esc(st[n].by||'')}</td><td>${dhFR(st[n].at)}</td></tr>`).join('');
    const dh=st[2]&&st[2].dh;
    const phs=[...(j.photos||[]),...((j.events||[]).flatMap(ev=>ev.photos||[])),...[1,2,3,4].flatMap(n=>st[n]&&st[n].photos||[])];
    const uph=[...new Set(phs)].slice(0,8);
    body+=`<div class="w"><div class="whead"><b>${esc(j.weldId)}</b> · ${esc(l.name)} · ${c==='A'?'aller':'retour'} · PK ${A.fmt(e?e.m1:0)} m · DN${esc((e&&e.dn)||l.dn)} · <span class="st">${S_LAB[j.status]||j.status}</span></div>
     <div class="wrow">${miniPlan(all,l,p)}<div style="flex:1">
      <table><tr><th>Événement</th><th>Par</th><th>Date</th></tr>${evs}${stRows}</table>
      ${dh?`<div class="dh">DH figée au raccordement : ${dh.expected?('attendu '+dh.expected+' Ω'):''}${dh.meas?(' · mesuré '+dh.meas+' Ω'):''}${dh.iso!=null?(' · isolement '+dh.iso+' MΩ'):''} — ${esc(dh.closure||'')}</div>`:''}
      ${j.wire==='inversion'?'<div class="dh" style="color:#a01212">Inversion de fils enregistrée à ce manchon</div>':''}</div></div>
     ${uph.length?`<div class="phs">${uph.map(u=>`<img src="${u}">`).join('')}</div>`:''}</div>`;});}));
  w.document.write(`<!doctype html><html lang="fr"><head><meta charset="utf-8"><title>Carnet de soudage — ${esc(NET.name||'')}</title>
  <style>body{font-family:system-ui,sans-serif;margin:24px;color:#111}h1{font-size:19px;margin:0}
  .w{border:1px solid #ccc;border-radius:8px;padding:10px;margin:10px 0;page-break-inside:avoid}
  .whead{font-size:13.5px;margin-bottom:6px}.st{background:#eee;border-radius:6px;padding:1px 7px;font-weight:700;font-size:11.5px}
  .wrow{display:flex;gap:10px;align-items:flex-start}table{border-collapse:collapse;width:100%;font-size:11.5px}th,td{border:1px solid #ccc;padding:3px 6px;text-align:left}th{background:#f2f1ec}
  .dh{font-size:11.5px;margin-top:4px;color:#333}.phs{display:flex;gap:6px;flex-wrap:wrap;margin-top:8px}.phs img{max-height:110px;max-width:160px;border-radius:6px;border:1px solid #ddd}
  @media print{button{display:none}}</style></head><body>
  <button onclick="print()" style="float:right;padding:8px 14px">🖨 Imprimer / PDF</button>
  <h1>Carnet de soudage et manchonnage — ${esc(NET.name||'')}</h1>
  <div style="color:#555;font-size:12.5px">${nDone} soudure(s) documentée(s) sur ${nTot} · édité le ${dFR(new Date())} · TRACÉ / RCU-COMPAGNON</div>
  ${body||'<p>Aucune soudure documentée pour l’instant.</p>'}</body></html>`);w.document.close();}
