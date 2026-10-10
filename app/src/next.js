// next.js — le paquet du 25/08 soir, codé d'avance et DÉSACTIVÉ par défaut (demande Ethan : « code à fond, on ajoute demain »).
// Interrupteurs : localStorage 'trace:next' — panneau « ⏳ Nouveautés » sur la home (chef/bureau), activation UNE PAR UNE, l'appli
// se recharge à chaque bascule. Tant que rien n'est allumé, l'appli ne change pas d'un poil.
export const NEXTF=(()=>{try{return JSON.parse(localStorage.getItem('trace:next')||'{}')||{};}catch(e){return {};}})();
export const nOn=k=>k==='ts'||k==='tabs'||k==='doe'||k==='admin'||!!NEXTF[k]; // ts et tabs : DÉFINITIFS depuis le 07/10 (Ethan : « mets ça en définitif », « rends définitif barre d'onglets allégée ») ; admin (Dossier administratif) : DÉFINITIF depuis le 09/10 (« passe le dossier administratif en définitif »)
import {initScr,scrInject,scrRenderTab} from './scr.js';
import {docHTML} from './charte.js'; // charte SCR des documents imprimés (09/10 soir)
import {ACCUEIL_CHANTIER_Q} from './prevention.js';
import {initAccueil,accueilStanding,accueilParcours,ficheAccueilHTML,controleNew,controleListHTML,controleOpen,controlesOf,controleNC} from './accueil.js'; // parcours d'accueil chantier + contrôle chantier (nuit 09→10/10)
import {qhsFor,qhsBlockHTML,qhsParcours,qhsTriggerOpen,qhsRuns,qhsSheetHTML,qhsCancel,qhsMyKey,qhsSigned} from './qhs.js'; // quart d'heure sécurité (10/10)
let A=null; // API fournie par app.js (state, NET, sync, openModal, toast, esc…)
const FEATS=[
 // ['admin', …] : Dossier administratif DÉFINITIF depuis le 09/10 — onglet « Dossier » (droit dossier.edit) : DT / DICT, plans exé, qualifications, PGC, PPSPS, planning, habilitations, BL, accueil ; fichiers au serveur ; un BL importé au stock s'y classe tout seul.
 ['pointage','Pointage heures & production (SCR interne)','Chacun pointe sa journée (début géolocalisé, pause, reprise, fin ; départ du chantier = inter-chantier) ; production du jour prise sur le plan ; le chef déclare après coup, valide ou corrige ; le conducteur valide en second. Onglet « Pointage ».'],
 ['profil','Profil opérateur (SCR interne)','Avatar aux couleurs de l’entreprise, points, trophées et médailles (soudures, manchons, fils, jours au-dessus de la cadence, QSE signés, pointage non contesté, pauses), mes heures validées. Onglet « Profil ».'],
];
// Export DOE : DÉFINITIF depuis le 07/10 soir (Ethan : « passe en définitif ») — devenu l'onglet « Export » (src/doe.js) : carnet de soudage et manchonnage avec report sur plan, planches numérotées, photos par n° de soudure, plan interactif hors ligne, zip.
// QSE : DÉFINITIF depuis le 07/10 (Ethan : « l'onglet qui était en test QSE, rends-le définitif ») — toujours présent, plus d'interrupteur.
// Barre d'onglets allégée : DÉFINITIVE depuis le 07/10 (Catalogue et Liste par « ⋯ »).
// TS / hors marché : DÉFINITIF depuis le 07/10 (tracé marché figé, écarts, marques par élément, extrusions, récap et export dans Récap) — nOn('ts') vaut toujours vrai.
// Backlog SCR interne (pas dans la version vendue), cadré avec Ethan le 07/10, à concevoir en maquette avant de coder :
const BACKLOG=[
 ['Suites profils & pointage (SCR interne)','Les deux options sont codées (interrupteurs ci-dessus). Reste à cadrer : avantages liés aux points, pouces 👍 entre collègues, profils synchronisés (avatar et compteurs serveur plutôt que par appareil), lien pointage ↔ paie.'],
];
export function initNext(api){A=api;initScr(api);initAccueil(api);
  injectViews();
  if(nOn('tabs'))lightTabs();
}
// ---------- panneau d'activation (home) ----------
export function nextHomeHTML(role){if(role!=='chef'&&role!=='bureau')return '';const on=FEATS.filter(f=>nOn(f[0])).length;
  return `<button class="btn ghost" id="nextBtn" style="font-size:12px">⏳ Nouveautés en attente ${on?'· '+on+'/'+FEATS.length+' actives':'('+FEATS.length+')'}</button>`;}
export function nextBindHome(){const b=document.getElementById('nextBtn');if(b)b.onclick=()=>{
  A.openModal(`<h3 style="margin-top:0">Nouveautés en attente</h3>
   <p class="hint" style="margin-top:0">Codées et testées, mais INACTIVES tant que tu ne les allumes pas. Active-les une par une, vérifie tranquillement, redis-moi. (L'appli se recharge à chaque bascule.)</p>
   ${FEATS.map(f=>`<label style="display:flex;gap:8px;align-items:flex-start;padding:8px;border:1.5px solid var(--line);border-radius:10px;margin:6px 0;cursor:pointer;${nOn(f[0])?'background:#f2fbf2;border-color:#9fd49f':''}"><input type="checkbox" data-nextf="${f[0]}" ${nOn(f[0])?'checked':''} style="margin-top:3px"><span><b>${f[1]}</b><br><span class="hint">${f[2]}</span></span></label>`).join('')}
   <div style="margin:10px 0 4px;font-size:12.5px"><b>Rendu définitif :</b> QSE, Modifs / marché, barre d'onglets allégée, Export DOE (07/10), Dossier administratif (09/10).</div>
   <h4 style="margin:10px 0 4px">À concevoir (SCR interne, pas dans la version vendue)</h4>${BACKLOG.map(b=>`<div style="padding:8px;border:1.5px dashed var(--line);border-radius:10px;margin:6px 0"><b>${b[0]}</b><br><span class="hint">${b[1]}</span></div>`).join('')}
   <div class="actions"><button class="btn block" data-close>Fermer</button></div>`);
  document.querySelectorAll('#modal [data-nextf]').forEach(cb=>cb.onchange=()=>{const o={...NEXTF};if(cb.checked)o[cb.dataset.nextf]=1;else delete o[cb.dataset.nextf];try{localStorage.setItem('trace:next',JSON.stringify(o));}catch(e){}location.reload();});};}
// ---------- onglets / vues injectés ----------
function injectViews(){const tb=document.getElementById('tabbar');const cont=document.querySelector('.view')?.parentElement;if(!tb||!cont)return;
  const mk=(tab,label,first)=>{if(!tb.querySelector(`[data-tab="${tab}"]`)){const b=document.createElement('button');b.dataset.tab=tab;b.textContent=label;tb.insertBefore(b,first?tb.firstElementChild:(tb.querySelector('[data-tab="liste"]')||tb.querySelector('[data-tab="recap"]')));}
    if(!document.getElementById('view-'+tab)){const v=document.createElement('div');v.className='view';v.id='view-'+tab;v.innerHTML='<div class="pad" id="'+tab+'"></div>';cont.appendChild(v);}};
  mk('bureau','Bureau',true); /* nuit 09→10/10 : le bureau du chantier, premier onglet — raccourcis, objectif du jour, accueil, checklist (encadrement) ; rien d'ancien ne bouge */
  if(nOn('admin'))mk('admin','Dossier');
  mk('qse','QSE');scrInject(mk);}
function lightTabs(){const tb=document.getElementById('tabbar');if(!tb)return;
  ['catalogue','liste','recap'].forEach(t=>{const b=tb.querySelector(`[data-tab="${t}"]`);if(b)b.style.display='none';}); // Récap aussi (Ethan 07/10 : « passe récap dans autre onglet »)
  if(!tb.querySelector('[data-tab="__more"]')){const b=document.createElement('button');b.dataset.tab='__more';b.textContent='⋯';b.title='Récap · Liste · Catalogue';
    b.addEventListener('click',ev=>{ev.stopPropagation();ev.preventDefault();
      A.openModal(`<h3 style="margin-top:0">Autres onglets</h3><div class="actions"><button class="btn block" data-nmt="recap">Récap du chantier</button><button class="btn block" data-nmt="liste">Liste des soudures</button>${(!A.can||A.can('stock.edit'))?'<button class="btn block" data-nmt="catalogue">Catalogue</button>':''}<button class="btn block" data-close>Fermer</button></div>`);
      document.querySelectorAll('#modal [data-nmt]').forEach(x=>x.onclick=()=>{A.closeModal();A.state.tab=x.dataset.nmt;A.renderAll();});},true);
    tb.appendChild(b);}}
// dispatch de renderAll pour les vues injectées
export function nextRenderTab(tab){qseBadge();if(tab==='bureau'){renderBureau();return true;}if(tab==='admin'&&nOn('admin')){renderAdmin();return true;}if(tab==='qse'){renderQse();return true;}if(scrRenderTab(tab))return true;return false;}
// ---------- BUREAU DU CHANTIER (nuit 09→10/10) ----------
const TAB_LABELS={plan:['Plan d’ensemble','📐'],bouclage:['DH · bouclage','🔌'],hydro:['Hydraulique','🌊'],stock:['Stock & livraisons','🚚'],phasage:['Phasage','📅'],ts:['Modifs · TS','📄'],conv:['Conversation','💬'],qse:['QSE · accueils','⛑️'],admin:['Dossier administratif','🗂'],export:['Export DOE','📷'],liste:['Liste des soudures','🎖'],recap:['Récap','📊'],catalogue:['Catalogue','📦']};
function renderBureau(){const el=document.getElementById('bureau');if(!el)return;const NET=A.net();const esc=A.esc;if(!NET||NET.id==='__vide'||!A.bureau){el.innerHTML='<h2 class="vt">Bureau</h2><div class="card muted">Aucun chantier.</div>';return;}
  let B=null;try{B=A.bureau(NET.id);}catch(e){console.warn('bureau',e);}if(!B){el.innerHTML='<h2 class="vt">Bureau</h2><div class="card muted">Bureau indisponible.</div>';return;}
  const f=B.fiche||{};const allowed=t=>!A.tabAllowed||A.tabAllowed(t);const tabs=Object.keys(TAB_LABELS).filter(t=>allowed(t)&&(t!=='admin'||nOn('admin'))&&document.querySelector(`#tabbar [data-tab="${t}"]`));
  const chk=k=>k==='ok'?'<span class="ac-chk ok">✓</span>':k==='warn'?'<span class="ac-chk warn">!</span>':k==='bad'?'<span class="ac-chk bad">✗</span>':'<span class="ac-chk off">○</span>';
  const tile=(t,lab,ic,sub,n,k)=>`<button class="ac-kt ac-dk ${k||''}" data-bur="${esc(t)}"><span class="ic">${ic}</span><span class="tx"><b>${esc(lab)}${n?` <span class="ac-n">${n}</span>`:''}</b>${sub?`<small>${esc(sub)}</small>`:''}</span>${k!==undefined?chk(k):''}</button>`;
  const today=[];if(B.canSign&&!B.accueilDone&&(B.accueilExpected!==undefined?B.accueilExpected:B.isTerrain))today.push(`<button class="ac-notif bad" data-bur="__parcours"><span class="ic">🦺</span><span class="tx"><b>Mon accueil chantier n'est pas fait ici</b><small>PPSPS, 10 points, DICT, prévention, signature — avant de commencer</small></span><span class="chev">›</span></button>`);
  if(B.qseTodo)today.push(`<button class="ac-notif bad" data-bur="qse"><span class="ic">✍️</span><span class="tx"><b>${B.qseTodo} document${B.qseTodo>1?'s':''} QSE à émarger</b><small>sur ce chantier</small></span><span class="chev">›</span></button>`);
  (B.qhs||[]).forEach(x=>today.push(`<button class="ac-notif bad" data-bur="__qhs:${esc(x.id)}"><span class="ic">⛑️</span><span class="tx"><b>Quart d'heure sécurité : ${esc(x.title)}</b><small>${x.by?'déclenché par '+esc(x.by)+' · ':''}sujet, 3 questions, signature</small></span><span class="chev">›</span></button>`)); /* 10/10 */
  if(B.objectifs.mine.length||B.objectifs.all.length){const L=B.objectifs.mine.length?B.objectifs.mine:B.objectifs.all;today.push(`<div class="ac-notif or" style="cursor:default"><span class="ic">🎯</span><span class="tx"><b>Objectif du jour · ${esc(B.objectifs.txt)}</b><small>${L.map(m=>esc(m.label)+' ('+(+m.h||0)+' h'+(m.who&&m.who.length?' · '+esc(m.who.join(', ')):'')+')'+(m.done?' ✓':'')).join(' · ')} — un repère, pas un plafond</small></span></div>`);}
  if(B.tasks)today.push(`<button class="ac-notif or" data-bur="conv"><span class="ic">🚩</span><span class="tx"><b>${B.tasks} tâche${B.tasks>1?'s':''} pour toi</b><small>conversation du chantier</small></span><span class="chev">›</span></button>`);
  if(B.unread)today.push(`<button class="ac-notif info" data-bur="conv"><span class="ic">💬</span><span class="tx"><b>${B.unread} message${B.unread>1?'s':''} non lu${B.unread>1?'s':''}</b><small>conversation du chantier</small></span><span class="chev">›</span></button>`);
  el.innerHTML=`<h2 class="vt">Bureau — ${esc(NET.name||'')} <span class="hint">· ${esc(B.c.ville||f.ville||'')}${B.pc!==null?' · '+B.pc+' % soudé':''}</span></h2>
    <div class="card"><div class="kv" style="font-size:12.5px"><span>${B.chef?'🦺 chef : '+esc(B.chef):'chef de chantier : —'}</span><span>${B.conducteur?'📋 conducteur : '+esc(B.conducteur):''}</span><span>${f.horaires?'🕗 '+esc(f.horaires):'horaires : voir le responsable d’exploitation'}</span><span>${f.rassemblement?'📍 rassemblement : '+esc(f.rassemblement):'rassemblement : base vie'}</span>${B.meteo?`<span>🌦 ${esc(B.meteo.label)} · ${B.meteo.t} °C${B.meteo.tenue?' · '+esc(B.meteo.tenue):''}</span>`:''}${B.eq.length?`<span>👥 aujourd'hui : ${esc(B.eq.join(', '))}</span>`:''}</div></div>
    ${today.length?`<div class="ac-h"><b>Aujourd'hui</b><span>${today.length} point${today.length>1?'s':''}</span></div>${today.join('')}`:'<div class="okbox" style="margin:6px 0">✓ Rien n’attend de toi sur ce chantier aujourd’hui.</div>'}
    ${B.dash?`<div class="ac-h"><b>Ce qui coince</b><span>${B.bad.length} bloquant${B.bad.length>1?'s':''} · ${B.warn.length} à surveiller</span></div>${(B.bad.concat(B.warn).slice(0,6)).map(x=>`<button class="ac-notif ${B.bad.includes(x)?'bad':'warn'}" data-bur="${esc(x.tab||'plan')}"><span class="tx"><b>${esc(x.lab)} — ${esc(x.v)}</b>${x.s?`<small>${esc(x.s)}</small>`:''}</span>${chk(B.bad.includes(x)?'bad':'warn')}</button>`).join('')||'<div class="ac-empty">✓ Rien ne coince.</div>'}
      <div class="ac-h"><b>Checklist du chantier</b><span>✓ complet · ! manque · ✗ bloquant · ○ pas commencé</span></div><div class="ac-kgrid">${B.dash.map(d=>tile(d.tab||(d.key==='eq'?'__orga':d.key==='pt'?'__valid':'plan'),d.short||d.lab,d.ic,d.v,d.n,d.k)).join('')}</div>`:''}
    <div class="ac-h"><b>Onglets du chantier</b><span>raccourcis</span></div><div class="ac-kgrid">${tabs.map(t=>tile(t,TAB_LABELS[t][0],TAB_LABELS[t][1],'',0)).join('')}</div>
    <div class="hint" style="margin-top:10px">Le bureau regroupe ce qui attend quelqu'un sur ce chantier et les raccourcis vers chaque onglet. Les onglets, eux, ne changent pas.</div>`;
  el.querySelectorAll('[data-bur]').forEach(b=>b.onclick=()=>{const t=b.dataset.bur;if(t==='__parcours'){qseStartParcours();return;}if(t.startsWith('__qhs:')){A.state.autoQhs=t.slice(6);A.state.tab='qse';A.renderAll();return;}if(t==='__orga'){if(A.goExpl)A.goExpl('orga');return;}if(t==='__valid'){if(A.goExpl)A.goExpl('valid');return;}if(!allowed(t)){A.toast('Onglet non accessible avec tes droits');return;}A.state.tab=t;A.renderAll();});}
// ---------- données ----------
function adminOf(){const NET=A.net();if(!NET||NET.id==='__vide')return null;if(!NET.admin)NET.admin={docs:[]};NET.admin.docs=NET.admin.docs||[];return NET.admin;}
function qseOf(){const NET=A.net();if(!NET||NET.id==='__vide')return null;if(!NET.qse)NET.qse={docs:[]};NET.qse.docs=NET.qse.docs||[];return NET.qse;}
/* 09/10 — plusieurs téléphones émargent le même document en même temps : le serveur FUSIONNE (SQL v4 : documents par id, signatures réunies). Une suppression est donc DOUCE (deleted=true) : on lit toujours qDocs(q) */
export const qDocs=q=>(q&&Array.isArray(q.docs)?q.docs:[]).filter(d=>!d.deleted);
const dFR=x=>x?new Date(x).toLocaleDateString('fr-FR'):'';
const dhFR=x=>x?new Date(x).toLocaleDateString('fr-FR')+' '+new Date(x).toLocaleTimeString('fr-FR',{hour:'2-digit',minute:'2-digit'}):'';
// ---------- DOSSIER ADMINISTRATIF ----------
export const ADMIN_CATS=[['dt','DT / DICT'],['exe','Plans d’exécution'],['plans','Plans'],['qualif','Qualifications (soudeurs / manchonneurs)'],['pgc','PGC'],['ppsps','PPSPS'],['planning','Planning d’exécution'],['habil','Habilitations / procédures'],['bl','Bons de livraison'],['epreuves','Épreuves & essais hydrauliques (PV, courbes du manomètre)'],['accueil','Accueil chantier'],['autre','Autre']];
function renderAdmin(){const el=document.getElementById('admin');if(!el)return;const ad=adminOf();const esc=A.esc;
  if(!ad){el.innerHTML='<h2 class="vt">Dossier administratif</h2><div class="card muted">Aucun chantier.</div>';return;}
  const canEd=A.can?A.can('dossier.edit'):(A.role()==='chef'||A.role()==='bureau');
  el.innerHTML=`<h2 class="vt">Dossier administratif — ${esc(A.net().name||'')}</h2>
   <div class="hint" style="margin-bottom:8px">Les fichiers partent au SERVEUR (l'appli ne garde que la fiche : nom, date, qui). Hors connexion, un petit fichier (&lt; 1,5 Mo) peut être gardé dans l'appli en dépannage — évite pour les gros plans.</div>
   ${canEd?`<div class="card" style="display:flex;gap:6px;flex-wrap:wrap;align-items:end"><div><label class="f">Catégorie</label><select class="f" id="adm-cat">${ADMIN_CATS.map(c2=>`<option value="${c2[0]}">${c2[1]}</option>`).join('')}</select></div><label class="btn primary" style="margin-bottom:2px">📎 Déposer un fichier (PDF, photo…)<input type="file" id="adm-file" accept="application/pdf,image/*,.html,.csv,.xlsx,.xls,.txt" style="display:none" multiple></label></div>`:''}
   ${ADMIN_CATS.map(([k,t])=>{const docs=ad.docs.filter(d0=>d0.cat===k);if(!docs.length&&k==='autre')return '';
     return `<details class="card" ${docs.length?'open':''}><summary style="cursor:pointer;font-size:13px"><b>${t}</b> <span class="dim">(${docs.length||'—'})</span></summary>
      ${k==='epreuves'?'<div class="hint" style="margin-top:4px">Les PV (PDF) et les exports du manomètre déposés depuis l’onglet Hydraulique (section 5 · Exécution) arrivent ici.</div>':''}${docs.length?`<table class="rc" style="margin-top:6px">${docs.map(d0=>`<tr><td><a href="${d0.url||d0.data||'#'}" target="_blank" rel="noopener" ${d0.url?'':'download="'+esc(d0.name)+'"'} style="color:#1c3d6b;font-weight:600">${esc(d0.name)}</a>${d0.note?'<div class="dim" style="font-size:11px">'+esc(d0.note)+'</div>':''}${d0.data?' <span class="dim" style="font-size:10px">(gardé dans l’appli)</span>':''}</td><td class="dim">${esc(d0.by||'')} · ${dFR(d0.at)}</td><td>${canEd?`<button data-admdel="${d0.id}" style="border:0;background:none;cursor:pointer;color:#d03b3b">✕</button>`:''}</td></tr>`).join('')}</table>`:'<div class="hint" style="margin-top:4px">rien pour l’instant</div>'}</details>`;}).join('')}`;
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
// 09/10 soir — l'onglet Hydraulique (section 5) dépose ici les exports du manomètre et les PV (catégorie « epreuves », rattachés par extra.hydro={t,kind})
export async function nextAdminAddFile(f,cat,extra){if(!f)return null;return adminAddFile(f,cat,extra);}
// hook stock : le BL PDF importé dans une livraison se classe aussi au dossier (appelé par app.js, flag déjà vérifié là-bas)
export async function nextAdminAddBL(file,liv){if(!nOn('admin')||!file)return;const d0=await adminAddFile(file,'bl',{liv:liv&&liv.id,note:liv?('BL de « '+liv.label+' »'):''});
  if(d0)A.toast('BL classé au dossier administratif ('+file.name+')');}
// ---------- QSE ----------
export const ACCUEIL_Q=ACCUEIL_CHANTIER_Q; // les 10 points d'Ethan (09/10 soir) — src/prevention.js
export const QUART_Q=['Le point sécurité du jour a été compris.','Les EPI du poste sont portés et en bon état.','Aucune situation dangereuse constatée non signalée.'];
// documents que l'utilisateur courant DOIT émarger sur ce chantier (PDF déposés + accueil chantier, sauf si le chef a levé l'obligation ; les quarts d'heure ne sont pas obligatoires)
const qseRequired=d0=>d0.required!==undefined?!!d0.required:(d0.type==='pdf'||d0.type==='accueil');
// signé par MOI ? par la clé du compte (profil connecté ou utilisateur de la liste) OU par le nom — le bug d'Ethan 07/10 : son profil « Ethan LE BIHAN » signait sous un autre libellé que celui comparé
const qseSignedBy=(d0,name)=>{const key=A.userKey?A.userKey():null;const nn=String(name||'').trim().toLowerCase();return (d0.sigs||[]).some(s2=>(key&&s2.uid&&s2.uid===key)||String(s2.name||'').trim().toLowerCase()===nn);};
export function qseTodo(){const q=qseOf();if(!q)return [];if(A.can&&!A.can('qse.sign'))return []; /* 09/10 : sans le droit d'émarger, rien à émarger (pas de pastille rouge) */const me=A.userName();
  /* 10/10 (Ethan) : l'accueil chantier n'est réclamé qu'aux gens de terrain / intérim / chef de chantier ; UNE seule fois par chantier (toutes les séances passées comptent) */
  const accDone=qDocs(q).some(d0=>d0.type==='accueil'&&qseSignedBy(d0,me));const expected=!A.accueilExpected||A.accueilExpected(A.net().id);
  const out=qDocs(q).filter(d0=>d0.type!=='accueil'&&qseRequired(d0)&&!qseSignedBy(d0,me));
  if(expected&&!accDone){const st=qDocs(q).find(d0=>d0.type==='accueil'&&d0.standing)||qDocs(q).find(d0=>d0.type==='accueil');if(st)out.unshift(st);else out.unshift({id:'ACC-virtual',type:'accueil',title:'Accueil chantier',standing:true,sigs:[]});}
  return out;}
// pastille rouge sur l'onglet QSE tant qu'il reste des documents à émarger (Ethan 07/10 : « un truc visuel qui encourage à signer »)
function qseBadge(){const b=document.querySelector('#tabbar [data-tab="qse"]');if(!b)return;const n=qseTodo().length;let i=b.querySelector('.qseBadge');if(!n){if(i)i.remove();b.style.color='';return;}if(!i){i=document.createElement('i');i.className='qseBadge';b.appendChild(i);}i.textContent=n;b.style.color='#d03b3b';}
let qseNudged={};export function qseNudge(){const n=qseTodo().length;const NET=A.net();if(!NET||!n||qseNudged[NET.id+'|'+A.userName()])return;qseNudged[NET.id+'|'+A.userName()]=1;A.toast('QSE : '+n+' document'+(n>1?'s':'')+' à émarger sur ce chantier');}
function renderQse(){const el=document.getElementById('qse');if(!el)return;const q=qseOf();const esc=A.esc;qseBadge();
  if(!q){el.innerHTML='<h2 class="vt">QSE</h2><div class="card muted">Aucun chantier.</div>';return;}
  const canEd=A.can?A.can('qse.manage'):(A.role()==='chef'||A.role()==='bureau');const me=A.userName();const NET=A.net();const canSign=!A.can||A.can('qse.sign');
  const T={accueil:'Accueil chantier',quart:'Quart d’heure sécurité',pdf:'Document à émarger'};
  /* 10/10 (retours Ethan) : UN accueil chantier par chantier, avec les émargements de tout le monde (anciennes séances comprises) ; plus de « séance » ni de quart d'heure à l'ancienne :
     le chef / conducteur accueille quelqu'un qui n'a pas de compte via le parcours, et déclenche le quart d'heure sécurité du jour (bloc dédié, registre) */
  const accDocs=qDocs(q).filter(d0=>d0.type==='accueil');const standing=accDocs.find(d0=>d0.standing)||null;
  const accSigs=accDocs.flatMap(d0=>(d0.sigs||[]).map(s2=>Object.assign({_doc:d0},s2))).sort((a,b)=>String(a.at||'').localeCompare(String(b.at||'')));
  const accDone=accDocs.some(d0=>qseSignedBy(d0,me));const expected=!A.accueilExpected||A.accueilExpected(NET.id);
  const pdfs=qDocs(q).filter(d0=>d0.type==='pdf');const legacy=qDocs(q).filter(d0=>d0.type==='quart'||(d0.type==='accueil'&&!d0.standing));
  const todo=qseTodo().filter(d0=>d0.type!=='accueil');const pp=((NET.admin&&Array.isArray(NET.admin.docs))?NET.admin.docs:[]).filter(d0=>d0.cat==='ppsps'&&(d0.url||d0.data));const ppsps=pp[pp.length-1]||null;
  const ctrl=controlesOf(NET);
  el.innerHTML=`<h2 class="vt">QSE — ${esc(NET.name||'')}</h2>
   ${canSign&&!accDone?`<div class="card" style="border-color:${expected?'#eb6834':'var(--line)'};background:${expected?'#fff4ee':'var(--surface)'}"><b style="color:${expected?'#9b3b12':'inherit'}">🦺 ${esc(me)}, ton accueil chantier n'est pas fait ici</b><div class="hint" style="margin:4px 0 6px">PPSPS à dérouler, 10 points à valider (DICT, prévention), signature au doigt : 10 à 15 minutes, une fois par chantier. Ta fiche d'accueil est produite à la fin.${expected?'':' (pas obligatoire pour ton poste : tu peux le faire quand même)'}</div><button class="btn ${expected?'primary':''} block" id="qse-parcours">Faire mon accueil chantier →</button></div>`:canSign&&accDone?`<div class="okbox" style="margin-bottom:8px">✓ ${esc(me)} : accueil chantier fait sur ce chantier.</div>`:''}
   <div class="ac-h"><b>Accueil chantier</b><span>${accSigs.length} émargement${accSigs.length>1?'s':''}</span></div>
   <div class="card" id="qse-acc"><b>${esc(standing?standing.title:'Accueil chantier — '+(NET.name||''))}</b> <span class="hyChip" style="font-size:10.5px">permanent</span><div class="hint" style="margin:2px 0 6px">Chaque arrivant le fait une fois sur ce chantier : PPSPS déroulé, 10 points, DICT, prévention, signature. Ce bloc garde l'émargement de tout le monde.</div>
     <div class="${ppsps?'okbox':'warnbox'}" style="font-size:12px">${ppsps?'PPSPS au dossier : « '+esc(ppsps.name)+' » — l’émargement vaut AUSSI signature du PPSPS.':'Aucun PPSPS au dossier administratif (onglet Dossier, catégorie PPSPS) : l’accueil se fait avec le PPSPS papier, noté sur la fiche.'}</div>
     ${accSigs.length?`<table class="rc" style="margin-top:6px">${accSigs.map((s2,i)=>`<tr><td><b>${esc(s2.name)}</b>${s2.by?'<div class="dim" style="font-size:11px">accueilli par '+esc(s2.by)+(s2.org?' · '+esc(s2.org):'')+'</div>':''}</td><td class="dim">${dhFR(s2.at)}</td><td>${s2.img?`<img src="${s2.img}" style="height:22px">`:''}</td><td>${s2.parcours?`<button class="btn sm" data-qfiche2="${i}" style="padding:1px 6px;font-size:11px">fiche</button>`:''}</td></tr>`).join('')}</table>`:'<div class="hint" style="margin-top:6px">personne n’a encore signé l’accueil de ce chantier</div>'}
     <div class="actions" style="margin-top:8px;display:flex;gap:6px;flex-wrap:wrap">${canEd?`<button class="btn" id="qse-accext">👤 Accueillir quelqu'un sans compte</button>`:''}<button class="btn" id="qse-accprint">🖨 Feuille d'émargement</button></div></div>
   ${qhsBlockHTML(NET.id,{canSign,canManage:canEd})}
   <div class="ac-h"><b>Contrôles chantier</b><span>${ctrl.length||'aucun'}</span></div>${canEd?`<button class="btn block" id="qse-controle" style="margin:0 0 6px">📋 Nouveau contrôle chantier (trame SCR)</button>`:''}${controleListHTML(NET)}
   <div class="ac-h"><b>Documents à émarger</b><span>${pdfs.length||'aucun'}</span></div>
   ${todo.length?`<div class="card" style="border-color:#d03b3b;background:#fdecec"><b style="color:#a01212">✍️ ${esc(me)}, il te reste ${todo.length} document${todo.length>1?'s':''} à émarger sur ce chantier</b><div class="hint" style="margin:4px 0 6px">Lis-les et signe au doigt : l'émargement vaut « j'ai pris connaissance ».</div>${todo.map(d0=>`<button class="btn block" data-qsignme="${d0.id}" style="margin-top:4px;justify-content:space-between"><span>${esc(d0.title||T[d0.type])}</span><span style="color:#d03b3b;font-weight:700">à émarger →</span></button>`).join('')}</div>`:pdfs.some(qseRequired)&&canSign?`<div class="okbox" style="margin-bottom:8px">✓ ${esc(me)} : tout est émargé sur ce chantier.</div>`:''}
   ${canEd?`<div class="card" style="display:flex;gap:6px;flex-wrap:wrap"><label class="btn">📎 PDF à faire émarger sur ce chantier<input type="file" id="qse-pdf" accept="application/pdf,image/*" style="display:none"></label><span class="hint" style="align-self:center">Les flash info et notes de service pour toute l'entreprise se publient depuis Exploitation → Documents d'entreprise.</span></div>`:''}
   ${pdfs.length?pdfs.slice().reverse().map(d0=>{const mine=qseSignedBy(d0,me);const req=qseRequired(d0);return `<div class="card" style="cursor:pointer;${req&&!mine?'border-color:#e9a1a1':''}" data-qopen="${d0.id}"><b>${esc(d0.title||T[d0.type])}</b> <span class="hyChip" style="font-size:10.5px">${T[d0.type]||d0.type}</span>${req?(mine?' <span style="color:#0ca30c;font-size:11.5px;font-weight:700">✓ émargé</span>':' <span style="color:#d03b3b;font-size:11.5px;font-weight:700">● à émarger</span>'):' <span class="dim" style="font-size:11px">facultatif</span>'}<div class="kv" style="margin-top:4px;font-size:12px"><span>${dFR(d0.at)}</span><span>par ${esc(d0.by||'')}</span><span><b>${(d0.sigs||[]).length}</b> émargement${(d0.sigs||[]).length>1?'s':''}</span></div></div>`;}).join(''):''}
   ${legacy.length?`<details class="card"><summary style="cursor:pointer;font-size:12.5px"><b>Historique</b> <span class="dim">(${legacy.length} séance${legacy.length>1?'s':''} d'avant le 10/10)</span></summary>${legacy.slice().reverse().map(d0=>`<div class="ac-row" data-qopen="${d0.id}" style="cursor:pointer;margin-top:6px"><span class="tx"><b>${esc(d0.title||T[d0.type])}</b><small>${T[d0.type]||d0.type} · ${dFR(d0.at)} · ${(d0.sigs||[]).length} émargement${(d0.sigs||[]).length>1?'s':''}</small></span><span class="chev">›</span></div>`).join('')}</details>`:''}`;
  el.querySelectorAll('[data-qsignme]').forEach(b=>b.onclick=ev=>{ev.stopPropagation();const d0=q.docs.find(x=>x.id===b.dataset.qsignme);if(d0)qseSign(d0,me);});
  const pf=document.getElementById('qse-pdf');if(pf)pf.onchange=async e2=>{const f=e2.target.files[0];if(!f)return;
    let url=null;try{url=await A.sync.uploadDoc(A.state.siteId,'qse',f.name,f);}catch(e){}
    let data=null;if(!url){if(f.size>1.5*1024*1024){A.toast('Hors connexion et fichier trop gros — reconnecte-toi');return;}
      data=await new Promise(res=>{const r=new FileReader();r.onload=()=>res(r.result);r.onerror=()=>res(null);r.readAsDataURL(f);});}
    q.docs.push({id:qid(),type:'pdf',title:f.name.replace(/\.pdf$/i,''),url:url||undefined,data:data||undefined,by:A.userName(),at:new Date().toISOString(),sigs:[]});
    A.saveNet('qse');renderQse();A.toast('Document ajouté — ouvre-le pour les émargements');};
  el.querySelectorAll('[data-qopen]').forEach(c2=>c2.onclick=()=>qseOpen(c2.dataset.qopen));
  const pb=document.getElementById('qse-parcours');if(pb)pb.onclick=()=>qseStartParcours();
  const ax=document.getElementById('qse-accext');if(ax)ax.onclick=()=>qseAccueilExt();
  const ap=document.getElementById('qse-accprint');if(ap)ap.onclick=()=>qsePrint(Object.assign({},standing||{id:'ACC-virtual',type:'accueil',title:'Accueil chantier — '+(NET.name||''),qs:ACCUEIL_Q.slice(),at:new Date().toISOString(),by:''},{sigs:accSigs,ppsps:ppsps?{name:ppsps.name,id:ppsps.id}:null}));
  el.querySelectorAll('[data-qfiche2]').forEach(b=>b.onclick=()=>{const s2=accSigs[+b.dataset.qfiche2];const w=window.open('','_blank');if(!w){A.toast('Autorise la fenêtre pop-up');return;}w.document.write(ficheAccueilHTML(s2._doc,s2,NET));w.document.close();});
  const cb=document.getElementById('qse-controle');if(cb)cb.onclick=()=>controleNew();
  el.querySelectorAll('[data-ctopen]').forEach(b=>b.onclick=()=>controleOpen(b.dataset.ctopen));
  /* quart d'heure sécurité du jour */
  el.querySelectorAll('[data-qhdo]').forEach(b=>b.onclick=()=>{const run=qhsRuns().find(r=>r.id===b.dataset.qhdo);if(run)qhsParcours(run,NET.id,{siteName:NET.name,after:()=>{renderQse();qseBadge();}});});
  el.querySelectorAll('[data-qhext]').forEach(b=>b.onclick=()=>{const run=qhsRuns().find(r=>r.id===b.dataset.qhext);if(!run)return;qseWhoExt('Quart d\'heure sécurité — qui participe ?',as=>qhsParcours(run,NET.id,{siteName:NET.name,as:{name:as.name,key:'ext:'+as.slug,org:as.org},after:()=>renderQse()}));});
  el.querySelectorAll('[data-qhprint]').forEach(b=>b.onclick=()=>{const run=qhsRuns().find(r=>r.id===b.dataset.qhprint);if(!run)return;const w=window.open('','_blank');if(!w){A.toast('Autorise la fenêtre pop-up');return;}w.document.write(qhsSheetHTML(run,NET.id,NET.name));w.document.close();});
  el.querySelectorAll('[data-qhcancel]').forEach(b=>b.onclick=()=>{if(!confirm('Annuler ce quart d\'heure sécurité ?'))return;qhsCancel(b.dataset.qhcancel);renderQse();});
  const qn=el.querySelector('[data-qhnew]');if(qn)qn.onclick=()=>qhsTriggerOpen({siteId:NET.id,sites:A.mesSites?A.mesSites():[],after:()=>renderQse()});
  if(A.state.autoParcours){A.state.autoParcours=false;if(canSign&&!accDone)setTimeout(qseStartParcours,150);}
  if(A.state.autoQhs){const rid=A.state.autoQhs;A.state.autoQhs=null;const run=qhsRuns().find(r=>r.id===rid);if(run&&canSign&&!qhsSigned(run,qhsMyKey(),me))setTimeout(()=>qhsParcours(run,NET.id,{siteName:NET.name,after:()=>{renderQse();qseBadge();}}),150);}}
/* 10/10 : le chef / conducteur accueille quelqu'un qui n'a pas de compte (intérimaire du jour, sous-traitant, visiteur) : nom (+ entreprise / agence) → le même parcours, signé par la personne sur la tablette du chef */
function qseWhoExt(title,cb){const esc=A.esc;const others=A.users().map(u=>u.name);
  A.openModal(`<h3 style="margin-top:0">${esc(title)}</h3><label class="f">Nom Prénom</label><div class="row" style="display:flex;gap:6px"><select class="f" id="ext-who" style="flex:1"><option value="">— saisir un nom —</option>${others.map(n=>`<option>${esc(n)}</option>`).join('')}</select><input class="f" id="ext-name" placeholder="Nom Prénom" style="flex:1"></div>
   <label class="f" style="margin-top:6px">Entreprise / agence d'intérim <span class="dim">(facultatif)</span></label><input class="f" id="ext-org" placeholder="ex. Manpower Caen, sous-traitant TP…">
   <div class="hint" style="margin-top:6px">La personne déroule le parcours sur ta tablette et signe au doigt ; sa fiche d'accueil porte ton nom comme accueillant.</div>
   <div class="actions" style="margin-top:8px"><button class="btn primary block" id="ext-ok">Commencer →</button><button class="btn block" data-close>Annuler</button></div>`);
  const who=document.getElementById('ext-who');who.onchange=()=>{if(who.value)document.getElementById('ext-name').value=who.value;};
  document.getElementById('ext-ok').onclick=()=>{const name=document.getElementById('ext-name').value.trim();if(!name){A.toast('Le nom de la personne');return;}const org=document.getElementById('ext-org').value.trim();A.closeModal();cb({name,org,slug:name.toLowerCase().replace(/[^a-z0-9]+/g,'_')});};}
function qseAccueilExt(){const q=qseOf();if(!q)return;const NET=A.net();const d0=accueilStanding(q,NET);if(!d0)return;
  qseWhoExt('Accueil chantier — qui accueilles-tu ?',as=>accueilParcours(d0,{as:{name:as.name,uid:'ext:'+as.slug,org:as.org},after:sig=>{qseBadge();renderQse();A.toast(sig.name+' : accueil chantier signé ✓');}}));}
// parcours d'accueil : émarge le document « Accueil chantier » permanent du chantier (créé au besoin), puis propose la fiche d'accueil
export function qseStartParcours(){const q=qseOf();if(!q)return;const esc=A.esc;const NET=A.net();const d0=accueilStanding(q,NET);if(!d0)return;
  accueilParcours(d0,{after:sig=>{qseBadge();renderQse();A.openModal(`<h3 style="margin-top:0">Accueil chantier signé ✓</h3><div class="okbox">${esc(sig.name)} — ${esc(NET.name||'')} — ${new Date(sig.at).toLocaleDateString('fr-FR')}</div><div class="hint" style="margin:6px 0">La fiche d'accueil reprend les 10 points, le PPSPS, la DICT et les modules lus. Elle est aussi dans la feuille d'émargement du document « ${esc(d0.title)} ».</div><div class="actions"><button class="btn primary block" id="qse-fiche">🖨 Ma fiche d'accueil</button><button class="btn block" data-close>Fermer</button></div>`);
    document.getElementById('qse-fiche').onclick=()=>{const w=window.open('','_blank');if(!w){A.toast('Autorise la fenêtre pop-up pour afficher la fiche');return;}w.document.write(ficheAccueilHTML(d0,sig,NET));w.document.close();};}});}
export const qseAccueilDone=()=>{const q=qseOf();if(!q)return true;const me=A.userName();return qDocs(q).some(d0=>d0.type==='accueil'&&qseSignedBy(d0,me));};
const qid=()=>'Q'+Date.now().toString(36)+Math.random().toString(36).slice(2,5);
function qseNew(type){const q=qseOf();if(!q)return;
  if(type==='accueil'){const ad=adminOf();const pp=ad&&ad.docs.find(d0=>d0.cat==='ppsps');
    q.docs.push({id:qid(),type,title:'Accueil chantier du '+dFR(new Date()),by:A.userName(),at:new Date().toISOString(),qs:ACCUEIL_Q.slice(),ppsps:pp?{name:pp.name,id:pp.id}:null,sigs:[]});}
  else{q.docs.push({id:qid(),type,title:'Quart d’heure sécurité du '+dFR(new Date()),by:A.userName(),at:new Date().toISOString(),theme:'',points:'',qs:QUART_Q.slice(),sigs:[]});}
  A.saveNet('qse');renderQse();qseOpen(q.docs[q.docs.length-1].id);}
function qseOpen(id){const q=qseOf();const d0=q&&q.docs.find(x=>x.id===id);if(!d0)return;const esc=A.esc;
  const canEd=A.can?A.can('qse.manage'):(A.role()==='chef'||A.role()==='bureau');
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
   ${(d0.sigs||[]).length?`<table class="rc" style="margin-top:4px">${d0.sigs.map((s2,i)=>`<tr><td>${esc(s2.name)}</td><td class="dim">${esc(s2.detail||'')}${s2.parcours?` <button class="btn sm" data-qfiche="${i}" style="padding:1px 6px;font-size:11px">fiche</button>`:''}</td><td class="dim">${dhFR(s2.at)}</td><td>${s2.img?`<img src="${s2.img}" style="height:26px">`:''}</td></tr>`).join('')}</table>`:'<div class="hint">personne n’a encore signé</div>'}
   ${canEd?`<label class="tgl" style="display:flex;gap:6px;align-items:center;margin-top:8px;font-size:12.5px"><input type="checkbox" id="qse-req" ${qseRequired(d0)?'checked':''}> Émargement obligatoire pour tous (pastille rouge tant que ce n'est pas fait)</label>`:''}
   <div class="actions" style="margin-top:8px">${(A.can&&!A.can('qse.sign'))?'':!qseSignedBy(d0,A.userName())?(d0.type==='accueil'?`<button class="btn primary block" id="qse-parcours2">🦺 Faire mon accueil chantier (PPSPS, 10 points, signature)</button>`:`<button class="btn primary block" id="qse-signme">✍️ J'ai lu — j'émarge (${esc(A.userName())})</button>`):`<div class="okbox" style="margin:0 0 6px">✓ Tu as émargé ce document.</div>`}${canEd?(d0.type==='accueil'?`<button class="btn block" id="qse-accext2">👤 Accueillir quelqu'un sans compte (parcours)</button>`:`<button class="btn block" id="qse-sign">✍️ Émarger pour un autre opérateur (tablette du chef)</button>`):''}<button class="btn block" id="qse-print">🖨 Feuille d’émargement</button>${canEd?`<button class="btn block" id="qse-del" style="color:#d03b3b">Supprimer</button>`:''}<button class="btn block" data-close>Fermer</button></div>`);
  const rq=document.getElementById('qse-req');if(rq)rq.onchange=()=>{d0.required=rq.checked;A.saveNet('qse');qseBadge();};
  const sm=document.getElementById('qse-signme');if(sm)sm.onclick=()=>qseSign(d0,A.userName());
  const p2=document.getElementById('qse-parcours2');if(p2)p2.onclick=()=>{A.closeModal();if(d0.standing)accueilParcours(d0,{after:()=>{qseBadge();renderQse();qseOpen(d0.id);}});else qseStartParcours(); /* 10/10 : une ancienne séance renvoie vers l'accueil permanent */};
  document.querySelectorAll('#modal [data-qfiche]').forEach(b=>b.onclick=()=>{const s2=d0.sigs[+b.dataset.qfiche];const w=window.open('','_blank');if(!w){A.toast('Autorise la fenêtre pop-up');return;}w.document.write(ficheAccueilHTML(d0,s2,A.net()));w.document.close();});
  const th=document.getElementById('qse-theme');if(th)th.onchange=()=>{d0.theme=th.value;A.saveNet('qse');};
  const po=document.getElementById('qse-points');if(po)po.onchange=()=>{d0.points=po.value;A.saveNet('qse');};
  const so=document.getElementById('qse-sign');if(so)so.onclick=()=>qseSign(d0);
  const ax2=document.getElementById('qse-accext2');if(ax2)ax2.onclick=()=>{A.closeModal();qseAccueilExt();};
  document.getElementById('qse-print').onclick=()=>qsePrint(d0);
  const dl=document.getElementById('qse-del');if(dl)dl.onclick=()=>{if(!confirm('Supprimer « '+d0.title+' » et ses émargements ?'))return;d0.deleted=true;d0.deletedBy=A.userName();d0.upd=new Date().toISOString();A.saveNet('qse');A.closeModal();renderQse();};}
// signature au doigt : nom + trait sur canvas (tablette du chef, les opérateurs passent chacun leur tour)
function qseSign(d0,preset){const esc=A.esc;const others=A.users().map(u=>u.name);
  A.openModal(`<h3 style="margin-top:0">Émargement — ${esc(d0.title)}</h3>
   <label class="f">Qui signe ?</label>${preset?`<div class="okbox" style="margin:0 0 4px">Toi : <b>${esc(preset)}</b></div><input type="hidden" id="sig-name" value="${esc(preset)}">`:`<div class="row" style="display:flex;gap:6px"><select class="f" id="sig-who" style="flex:1"><option value="">— saisir un nom —</option>${others.map(n=>`<option>${esc(n)}</option>`).join('')}</select><input class="f" id="sig-name" placeholder="Nom Prénom" style="flex:1"></input></div>`}
   <label class="f" style="margin-top:6px">Signature au doigt <span class="dim">(la case = « j'ai pris connaissance »)</span></label>
   <canvas id="sig-pad" width="640" height="220" style="width:100%;height:150px;border:1.5px dashed #b8b4a8;border-radius:10px;background:#fff;touch-action:none"></canvas>
   <div class="actions" style="margin-top:8px"><button class="btn primary block" id="sig-ok">Valider l’émargement</button><button class="btn block" id="sig-clear">Effacer le trait</button><button class="btn block" data-close>Annuler</button></div>`);
  const cv=document.getElementById('sig-pad');const cx=cv.getContext('2d');cx.lineWidth=3.4;cx.lineCap='round';cx.strokeStyle='#14213d';let drawing=false,drawn=false;
  const pos=e2=>{const r=cv.getBoundingClientRect();return {x:(e2.clientX-r.left)*cv.width/r.width,y:(e2.clientY-r.top)*cv.height/r.height};};
  cv.addEventListener('pointerdown',e2=>{drawing=true;drawn=true;const p=pos(e2);cx.beginPath();cx.moveTo(p.x,p.y);try{cv.setPointerCapture(e2.pointerId);}catch(e3){}});
  cv.addEventListener('pointermove',e2=>{if(!drawing)return;const p=pos(e2);cx.lineTo(p.x,p.y);cx.stroke();});
  const up=()=>{drawing=false;};cv.addEventListener('pointerup',up);cv.addEventListener('pointercancel',up);
  document.getElementById('sig-clear').onclick=()=>{cx.clearRect(0,0,cv.width,cv.height);drawn=false;};
  const who=document.getElementById('sig-who');if(who)who.onchange=()=>{if(who.value)document.getElementById('sig-name').value=who.value;};
  document.getElementById('sig-ok').onclick=()=>{const name=document.getElementById('sig-name').value.trim();
    if(!name){A.toast('Le nom du signataire');return;}
    if(!drawn){A.toast('La signature (un trait au doigt)');return;}
    const uid=preset?(A.userKey?A.userKey():undefined):(()=>{const u=A.users().find(x=>x.name===name);return u?'l:'+u.id:undefined;})();
    d0.sigs=d0.sigs||[];d0.sigs.push({name,uid,detail:'',at:new Date().toISOString(),img:cv.toDataURL('image/png')});
    A.saveNet('qse');A.closeModal();qseBadge();renderQse();qseOpen(d0.id);A.toast(name+' a émargé'+(preset?'':' — au suivant'));};}
function qsePrint(d0){const w=window.open('','_blank');if(!w){A.toast('Autorise la fenêtre pop-up pour imprimer');return;}w.document.write(qseSheetHTML(d0));w.document.close();}
// feuille d'émargement (HTML autonome) — aussi dans le dossier DOE (onglet Export)
export function qseSheetHTML(d0){const esc=A.esc;const NET=A.net();const T={accueil:'Accueil chantier',quart:'Quart d’heure sécurité',pdf:'Document à émarger'};
  const body=`${d0.type==='quart'?`<h2>Thème</h2><div>${esc(d0.theme||'—')}</div><h2>Points abordés</h2><div style="white-space:pre-wrap">${esc(d0.points||'—')}</div>`:''}
  ${(d0.qs||[]).length?`<h2>${d0.type==='accueil'?'Points de l’accueil':'Questions'}</h2><ul>${d0.qs.map(x=>`<li>${esc(x)}</li>`).join('')}</ul>`:''}
  ${d0.type==='accueil'?`<div class="card ${d0.ppsps?'soft':'notice'}">${d0.ppsps?('Le PPSPS « '+esc(d0.ppsps.name)+' » a été présenté : la signature ci-dessous vaut AUSSI signature du PPSPS.'):'PPSPS : non joint au dossier au moment de l’accueil.'}</div>`:''}
  ${d0.type==='pdf'?`<div class="card soft">Document : ${esc(d0.title)} — la signature vaut « j’ai pris connaissance ».</div>`:''}
  <h2>Émargements (${(d0.sigs||[]).length})</h2><table class="em"><tr><th>Nom</th><th>Date</th><th>Signature</th></tr>
  ${(d0.sigs||[]).map(s2=>`<tr><td><b>${esc(s2.name)}</b></td><td>${dhFR(s2.at)}</td><td>${s2.img?`<img src="${s2.img}">`:''}</td></tr>`).join('')}
  ${Array.from({length:Math.max(0,6-(d0.sigs||[]).length)}).map(()=>'<tr><td style="height:36px"></td><td></td><td></td></tr>').join('')}</table>`;
  return docHTML({title:d0.title,kicker:'QSE · '+(T[d0.type]||d0.type),sub:esc(NET.name||''),meta:[['Créé le',dFR(d0.at)],['Par',esc(d0.by||'')],['Émargements',(d0.sigs||[]).length]],body,css:'li{margin:4px 0}table.em img{height:34px}table.em td{vertical-align:middle}',footLeft:esc(NET.name||'')});}
// ---------- TS / hors marché : porté par app.js depuis le 07/10 (tracé marché figé, marques par élément, extrusions) — HM_ET gardé pour le traceur ----------
export const HM_ET={propose:'TS proposé',commande:'TS commandé',forfait:'compris (global et forfaitaire)',marche:'conforme au marché'};
// ---------- EXPORT DOE : carnet de soudage / manchonnage ----------
export function nextDoeHTML(){return `<div class="card"><h3 style="margin-top:0">Export DOE</h3><div class="hint" style="margin-top:0">Carnet de soudage et manchonnage avec report sur plan, planches numérotées, photos classées par n° de soudure, plan interactif hors ligne, dossier zip complet : <b>onglet Export</b>.</div><button class="btn primary" id="doe-go" style="margin-top:6px">📁 Ouvrir l'onglet Export →</button></div>`;}
export function nextBindDoe(el){const b=el.querySelector('#doe-go');if(b)b.onclick=()=>{A.state.tab='export';A.renderAll();};}
// ancien carnet (07/10 matin, « pas trop dégueu » mais sans report sur plan) : gardé en secours, accessible par window.TRACE.doeOld()
export function doeOldOpen(){doeOpen();}
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
  w.document.write(docHTML({title:'Carnet de soudage — '+(NET.name||''),h1:'Carnet de soudage et manchonnage',kicker:'Suivi de chantier',sub:esc(NET.name||''),meta:[['Documentées',nDone+' / '+nTot+' soudures'],['Édité le',dFR(new Date())]],
    body:body||'<p>Aucune soudure documentée pour l’instant.</p>',css:`.w{border:1px solid var(--line);border-radius:12px;padding:10px 12px;margin:10px 0;page-break-inside:avoid}.whead{font-size:13.5px;margin-bottom:6px}.st{background:var(--soft);border-radius:999px;padding:2px 9px;font-weight:700;font-size:11px}.wrow{display:flex;gap:10px;align-items:flex-start}table{font-size:11.5px}th,td{padding:3px 7px}.dh{font-size:11.5px;margin-top:4px;color:#333}.phs{display:flex;gap:6px;flex-wrap:wrap;margin-top:8px}.phs img{max-height:110px;max-width:160px;border-radius:8px;border:1px solid var(--line)}`,footLeft:esc(NET.name||'')}));w.document.close();}
