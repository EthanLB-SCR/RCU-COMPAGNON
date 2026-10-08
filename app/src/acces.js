// acces.js — COMPTES ET ACCÈS (Ethan 08/10 : « un compte par personne, accès par mail entreprise, selon son poste différents accès : gros tableau
// d'autorisations consultable dans l'onglet Administrateur (sur l'écran d'accueil, moi seul), créer un accès (nom, prénom, poste, mail — il choisit
// son mot de passe), comptes invités pour les intérimaires (droits réduits au pur opérationnel), accès visiteur pour un client / maître d'œuvre »).
// Le droit effectif = droits du POSTE, plafonnés par le TYPE de compte (salarié / intérimaire / visiteur), puis corrigés compte par compte (overrides).
// Sans serveur (ou sans le script SQL sql/comptes_acces.sql) : comptes gardés sur l'appareil (démo) — l'appli ne casse jamais.
let A=null;
export function initAcces(api){A=api;}
const esc=s=>String(s??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
export const POSTES={admin:'Administrateur',bureau:'Bureau',conducteur:'Conducteur de travaux',chef:'Chef de chantier',soudeur:'Soudeur',manchonneur:'Manchonneur',terrassier:'Terrassier / aide',visiteur:'Visiteur (client, maître d\'œuvre)'};
export const TYPES={salarie:'Salarié SCR',interim:'Intérimaire / invité',visiteur:'Visiteur'};
// [clé, libellé, groupe]
export const PERMS=[
 ['plan.view','Voir le plan, les fiches de soudure, le récap','Chantier'],
 ['weld.steps','Saisir les étapes ① soudure ② fils + DH ③ manchon ④ moussage','Terrain'],
 ['weld.extra','Ajouter une soudure supplémentaire sur le plan','Terrain'],
 ['weld.transfer','Transférer / échanger l\'avancement d\'une soudure (sur une fiche déjà saisie)','Terrain'],
 ['weld.admin','Corriger une fiche : contrôle visuel / radio, annuler une étape, remettre « à souder », transférer une fiche vide','Chantier'],
 ['dh.measure','DH : mesures, localisation de défaut, bouclage','Terrain'],
 ['conv.post','Conversation : écrire, notes sur le plan, photos','Terrain'],
 ['conv.task','Conversation : créer et assigner des tâches','Chantier'],
 ['pointage.self','Pointer sa journée','Pointage'],
 ['pointage.validate','Valider les pointages de l\'équipe','Pointage'],
 ['hydro','Hydro : essais, hydrants, calendrier','Chantier'],
 ['stock.edit','Stock : livraisons, zones, prélèvements','Chantier'],
 ['phasage.edit','Phasage : phases, planning, marché','Chantier'],
 ['ts.qualify','Modifications : qualifier (TS / compris / mémoire), re-figer le marché','Chantier'],
 ['qse.sign','QSE : émarger les documents','QSE'],
 ['qse.manage','QSE : créer accueils et quarts d\'heure, déposer des documents','QSE'],
 ['dossier.edit','Dossier administratif : déposer / retirer des documents','Chantier'],
 ['export.doe','Export DOE (carnet, plan, photos, zip)','Chantier'],
 ['site.tracer','Traceur : créer / modifier un réseau, calepinage, import DXF / PDF','Bureau'],
 ['site.versions','Versions du plan (historique, restauration)','Bureau'],
 ['site.delete','Supprimer un chantier','Bureau'],
 ['team.view','Voir l\'équipe (noms, postes)','Comptes'],
 ['accounts.manage','Administrer les comptes et les droits (onglet Administrateur)','Comptes'],
];
const ALL=Object.fromEntries(PERMS.map(([k])=>[k,true]));
const pick=(...ks)=>Object.fromEntries(PERMS.map(([k])=>[k,ks.includes(k)]));
// droits par défaut de chaque poste (salarié SCR)
export const DEFAULT_RIGHTS={
 admin:ALL,
 bureau:{...ALL,'accounts.manage':false,'pointage.self':false,'weld.steps':false},
 conducteur:{...ALL,'accounts.manage':false,'site.delete':false},
 chef:{...ALL,'accounts.manage':false,'site.delete':false,'site.versions':true,'pointage.validate':true},
 soudeur:pick('plan.view','weld.steps','weld.extra','weld.transfer','dh.measure','conv.post','pointage.self','qse.sign','team.view'),
 manchonneur:pick('plan.view','weld.steps','weld.transfer','dh.measure','conv.post','pointage.self','qse.sign','team.view'),
 terrassier:pick('plan.view','conv.post','pointage.self','qse.sign','team.view'),
 visiteur:pick('plan.view'),
};
// plafond par type de compte : un intérimaire garde le pur opérationnel (pointer soudures, manchons, fils…), un visiteur regarde
export const TYPE_CAP={
 salarie:null,
 interim:pick('plan.view','weld.steps','weld.extra','weld.transfer','dh.measure','conv.post','pointage.self','qse.sign'),
 visiteur:pick('plan.view','conv.post','export.doe'),
};
export const ADMIN_SEED=['lebihanethan@gmail.com']; // adresse d'Ethan : administrateur d'office (en plus de poste = admin côté serveur)
// compte normalisé : {id,email,nom,prenom,name,poste,type,rights,sites,active,local}
export function normAccount(p){if(!p)return null;const poste=p.poste||p.role||'soudeur';const email=(p.email||'').toLowerCase();const isSeed=ADMIN_SEED.includes(email);
  return {id:p.id,email,nom:p.nom||'',prenom:p.prenom||'',name:p.name||[p.prenom,p.nom].filter(Boolean).join(' ')||email,poste:isSeed?'admin':poste,role:p.role||poste,type:p.type||(poste==='visiteur'?'visiteur':'salarie'),rights:p.rights&&typeof p.rights==='object'?p.rights:{},sites:Array.isArray(p.sites)?p.sites:null,active:p.active!==false,local:!!p.local,created_at:p.created_at||null};}
export function effectiveRights(acc){const out={};if(!acc||acc.active===false){PERMS.forEach(([k])=>out[k]=false);return out;}
  if(acc.poste==='admin'){PERMS.forEach(([k])=>out[k]=true);return out;}
  const base=DEFAULT_RIGHTS[acc.poste]||DEFAULT_RIGHTS.soudeur;const cap=TYPE_CAP[acc.type]||null;
  PERMS.forEach(([k])=>{let v=!!base[k];if(cap&&cap[k]===false)v=false;if(acc.rights&&acc.rights[k]!==undefined)v=!!acc.rights[k];out[k]=v;}); // un ajustement explicite peut passer au-dessus du plafond : c'est l'administrateur qui décide
  return out;}
// compte courant : profil serveur si connecté, sinon le personnage de démo (Ethan L. de la démo = administrateur, pour tester l'onglet hors connexion)
export function currentAccount(){if(!A)return null;const S=A.state;if(S.profile)return normAccount(S.profile);const u=(A.users()||[]).find(x=>x.id===S.userId)||(A.users()||[])[0];if(!u)return null;return normAccount({id:'l:'+u.id,name:u.name,role:u.role,poste:u.id==='ethan'?'admin':u.role,type:'salarie',active:true,local:true});}
let cache={key:'',rights:null};
export function can(key){if(!A)return true;const acc=currentAccount();const ck=acc?acc.id+'|'+acc.poste+'|'+acc.type+'|'+JSON.stringify(acc.rights||{})+'|'+acc.active:'none';if(cache.key!==ck){cache={key:ck,rights:effectiveRights(acc)};}return !!cache.rights[key];}
export const isAdmin=()=>can('accounts.manage');
// chantiers autorisés (intérimaire / visiteur avec liste) : null = tous
export function allowedSites(){const acc=currentAccount();if(!acc||acc.poste==='admin'||!acc.sites)return null;return acc.sites;}
/* ---------- magasin des comptes : serveur (profiles + invites via sql/comptes_acces.sql) sinon appareil ---------- */
const LKEY='trace:accounts';
function localList(){try{return JSON.parse(localStorage.getItem(LKEY)||'[]')||[];}catch(e){return [];}}
function localSave(list){try{localStorage.setItem(LKEY,JSON.stringify(list));}catch(e){}}
export async function listAccounts(){let rows=[];let server=false;try{if(A.state.cloudUser){const r=await A.sync.listProfiles();if(r&&r.length){rows=r.map(normAccount);server=true;}}}catch(e){console.warn(e);}
  const loc=localList().map(x=>normAccount({...x,local:true}));return {rows:[...rows,...loc.filter(l=>!rows.some(r=>r.email&&r.email===l.email))],server};}
export async function createAccess(o){const email=String(o.email||'').trim().toLowerCase();if(!email.includes('@'))return {error:'adresse e-mail invalide'};if(!o.nom&&!o.prenom)return {error:'nom ou prénom manquant'};
  const acc={email,nom:o.nom||'',prenom:o.prenom||'',poste:o.poste||'soudeur',type:o.type||'salarie',rights:o.rights||{},sites:o.sites&&o.sites.length?o.sites:null,active:true,created_at:new Date().toISOString(),created_by:A.userName()};
  let where='appareil';if(A.state.cloudUser&&A.sync.inviteAccess){try{const err=await A.sync.inviteAccess(acc);if(!err)where='serveur';else console.warn('invite',err);}catch(e){console.warn(e);}}
  if(where==='appareil'){const list=localList().filter(x=>x.email!==email);list.push({...acc,id:'loc:'+Date.now().toString(36)});localSave(list);}
  cache.key='';return {ok:true,where};}
export async function updateAccount(acc,patch){let where='appareil';if(A.state.cloudUser&&!acc.local&&A.sync.adminSetProfile){try{const err=await A.sync.adminSetProfile(acc.id,patch);if(!err)where='serveur';else return {error:err};}catch(e){return {error:String(e)};}}
  if(where==='appareil'){const list=localList();const i=list.findIndex(x=>x.email===acc.email||('loc:'+x.id===acc.id)||x.id===acc.id);if(i>=0)list[i]={...list[i],...patch};else list.push({...acc,...patch,id:acc.id||('loc:'+Date.now().toString(36))});localSave(list);}
  if(A.state.profile&&acc.id===A.state.profile.id)Object.assign(A.state.profile,patch);cache.key='';return {ok:true,where};}
/* ---------- onglet ADMINISTRATEUR (écran d'accueil) ---------- */
export async function renderAdminHome(el){if(!el)return;if(!isAdmin()){el.innerHTML='<div class="card muted">Réservé à l\'administrateur.</div>';return;}
  el.innerHTML='<div class="card muted">Chargement des comptes…</div>';const {rows,server}=await listAccounts();const metas=(A.metas&&A.metas())||[];const me=currentAccount();
  const grp={};PERMS.forEach(p=>{(grp[p[2]]=grp[p[2]]||[]).push(p);});
  el.innerHTML=`<div class="admHead"><div><h3 style="margin:0">⚙ Administrateur</h3><div class="hint">Comptes, postes, droits. ${server?'Comptes du serveur.':'<b>Hors serveur</b> : les comptes créés ici restent sur cet appareil tant que <code>sql/comptes_acces.sql</code> n\'est pas exécuté dans Supabase et que tu n\'es pas connecté.'}</div></div><button class="btn primary" id="admNew">➕ Créer un accès</button></div>
  <div class="card"><h3 style="margin-top:0">Comptes (${rows.length})</h3>${rows.length?rows.map((r,i)=>{const eff=effectiveRights(r);const n=Object.values(eff).filter(Boolean).length;const ov=Object.keys(r.rights||{}).length;return `<div class="admAcc ${r.active?'':'off'}"><div class="admWho"><b>${esc(r.name)}</b>${r.id===me.id?' <span class="hyChip" style="font-size:10px">moi</span>':''}${r.active?'':' <span class="hyChip" style="font-size:10px;background:#fdecec;color:#a01212">inactif</span>'}<br><span class="dim" style="font-size:11px">${esc(r.email)}${r.local?' · sur cet appareil':''}</span></div>
     <div class="admRow"><label>Poste <select class="f" data-adm="poste" data-i="${i}">${Object.entries(POSTES).map(([k,v])=>`<option value="${k}" ${r.poste===k?'selected':''}>${v}</option>`).join('')}</select></label><label>Type <select class="f" data-adm="type" data-i="${i}">${Object.entries(TYPES).map(([k,v])=>`<option value="${k}" ${r.type===k?'selected':''}>${v}</option>`).join('')}</select></label></div>
     <div class="admRow"><button class="btn sm" data-admsites="${i}">🏗 ${r.sites?r.sites.length+' chantier'+(r.sites.length>1?'s':''):'tous les chantiers'}</button><button class="btn sm" data-admrights="${i}">🔑 ${n} / ${PERMS.length} droits${ov?' · '+ov+' ajusté'+(ov>1?'s':''):''}</button><label class="btn sm" style="margin-left:auto"><input type="checkbox" data-adm="active" data-i="${i}" ${r.active?'checked':''}> actif</label></div></div>`;}).join(''):'<div class="hint">Aucun compte pour l\'instant.</div>'}
  <div class="hint" style="margin-top:6px">Un salarié se connecte avec son e-mail entreprise ; un intérimaire ou un visiteur avec son e-mail personnel. À la première connexion il choisit son mot de passe (ou reçoit un code par e-mail). Un compte inactif ne voit plus rien.</div></div>
  <div class="card"><h3 style="margin-top:0">Droits par poste (défaut)</h3><div class="hint">Ce que donne chaque poste à un salarié. Un intérimaire est plafonné au pur opérationnel, un visiteur au regard. Le bouton « Droits » d'un compte permet d'ajuster compte par compte.</div>
   <div style="overflow:auto"><table class="rc admM" style="min-width:520px"><tr><th style="text-align:left">Droit</th>${Object.entries(POSTES).map(([k,v])=>`<th title="${esc(v)}">${esc(v.split(' ')[0])}</th>`).join('')}<th title="plafond intérimaire">Intérim.</th><th title="plafond visiteur">Visit.</th></tr>${Object.entries(grp).map(([g,ps])=>`<tr><td colspan="${Object.keys(POSTES).length+3}" style="text-align:left;background:#f1f0eb;font-weight:700">${esc(g)}</td></tr>`+ps.map(([k,lab])=>`<tr><td style="text-align:left;white-space:nowrap" title="${esc(lab)}">${esc(lab.length>34?lab.slice(0,33)+'…':lab)}</td>${Object.keys(POSTES).map(p=>`<td>${DEFAULT_RIGHTS[p]&&DEFAULT_RIGHTS[p][k]?'<span class="ok">✓</span>':'<span class="dim">·</span>'}</td>`).join('')}<td>${TYPE_CAP.interim[k]?'<span class="ok">✓</span>':'<span class="ko">✕</span>'}</td><td>${TYPE_CAP.visiteur[k]?'<span class="ok">✓</span>':'<span class="ko">✕</span>'}</td></tr>`).join('')).join('')}</table></div></div>`;
  el.querySelector('#admNew').onclick=()=>admNewModal(metas,()=>renderAdminHome(el));
  el.querySelectorAll('[data-adm]').forEach(x=>x.onchange=async()=>{const r=rows[+x.dataset.i];const k=x.dataset.adm;const v=x.type==='checkbox'?x.checked:x.value;const patch={[k]:v};if(k==='poste')patch.role=v==='admin'?'chef':(v==='terrassier'||v==='visiteur'?'soudeur':v); // role = ancienne colonne (règles serveur), poste = la nouvelle
    const res=await updateAccount(r,patch);A.toast(res.error?('Refusé : '+res.error):('Compte mis à jour ('+res.where+')'));renderAdminHome(el);});
  el.querySelectorAll('[data-admrights]').forEach(b=>b.onclick=()=>admRightsModal(rows[+b.dataset.admrights],()=>renderAdminHome(el)));
  el.querySelectorAll('[data-admsites]').forEach(b=>b.onclick=()=>admSitesModal(rows[+b.dataset.admsites],metas,()=>renderAdminHome(el)));}
function admNewModal(metas,done){A.openModal(`<h3 style="margin-top:0">Créer un accès</h3><div class="hint" style="margin-top:0">La personne se connecte ensuite avec cet e-mail et choisit son mot de passe (ou reçoit un code par e-mail). Ses droits suivent son poste et son type de compte.</div>
   <div style="display:grid;grid-template-columns:1fr 1fr;gap:6px;margin:8px 0"><div><label class="f">Prénom</label><input class="f" id="an-prenom"></div><div><label class="f">Nom</label><input class="f" id="an-nom"></div>
   <div style="grid-column:1/3"><label class="f">E-mail</label><input class="f" id="an-email" type="email" placeholder="prenom.nom@scr.fr (ou perso pour un intérimaire / visiteur)"></div>
   <div><label class="f">Poste</label><select class="f" id="an-poste">${Object.entries(POSTES).filter(([k])=>k!=='admin').map(([k,v])=>`<option value="${k}" ${k==='soudeur'?'selected':''}>${v}</option>`).join('')}</select></div>
   <div><label class="f">Type de compte</label><select class="f" id="an-type">${Object.entries(TYPES).map(([k,v])=>`<option value="${k}">${v}</option>`).join('')}</select></div></div>
   <div id="an-sites" style="display:none"><label class="f">Chantiers autorisés (intérimaire / visiteur)</label><div style="max-height:160px;overflow:auto;border:1px solid var(--line);border-radius:8px;padding:6px">${metas.length?metas.map(m=>`<label style="display:block;font-size:12.5px"><input type="checkbox" data-ansite="${esc(m.id)}"> ${esc(m.name)}</label>`).join(''):'<span class="hint">aucun chantier connu sur cet appareil</span>'}</div><div class="hint">Rien de coché = tous les chantiers.</div></div>
   <div id="an-err" style="color:#d03b3b;font-size:12.5px;margin-top:4px"></div>
   <div class="actions"><button class="btn primary block" id="an-ok">Créer l'accès</button><button class="btn block" data-close>Annuler</button></div>`);
  const m=document.getElementById('modal');const typeSel=m.querySelector('#an-type'),posteSel=m.querySelector('#an-poste');const sync2=()=>{m.querySelector('#an-sites').style.display=typeSel.value==='salarie'?'none':'';if(posteSel.value==='visiteur')typeSel.value='visiteur';};typeSel.onchange=sync2;posteSel.onchange=sync2;
  m.querySelector('#an-ok').onclick=async()=>{const o={prenom:m.querySelector('#an-prenom').value.trim(),nom:m.querySelector('#an-nom').value.trim(),email:m.querySelector('#an-email').value.trim(),poste:posteSel.value,type:typeSel.value,sites:[...m.querySelectorAll('[data-ansite]:checked')].map(x=>x.dataset.ansite)};
    const r=await createAccess(o);if(r.error){m.querySelector('#an-err').textContent=r.error;return;}A.closeModal();A.toast('Accès créé ('+r.where+') — '+o.prenom+' '+o.nom+' se connecte avec '+o.email);done&&done();};}
function admRightsModal(acc,done){const eff=effectiveRights(acc);const base=DEFAULT_RIGHTS[acc.poste]||{};const cap=TYPE_CAP[acc.type]||null;const grp={};PERMS.forEach(p=>{(grp[p[2]]=grp[p[2]]||[]).push(p);});
  A.openModal(`<h3 style="margin-top:0">Droits — ${esc(acc.name)}</h3><div class="hint" style="margin-top:0">${esc(POSTES[acc.poste]||acc.poste)} · ${esc(TYPES[acc.type]||acc.type)}. Coché = autorisé. Une case différente du défaut de son poste est un <b>ajustement</b> propre à ce compte.${acc.poste==='admin'?' <b>L\'administrateur a tout, sans ajustement.</b>':''}</div>
   <div style="max-height:60vh;overflow:auto">${Object.entries(grp).map(([g,ps])=>`<div style="font-weight:700;margin:8px 0 2px">${esc(g)}</div>`+ps.map(([k,lab])=>{const def=!!base[k]&&!(cap&&cap[k]===false);const ov=acc.rights&&acc.rights[k]!==undefined;return `<label style="display:flex;gap:8px;align-items:flex-start;padding:4px 2px;border-bottom:1px solid #eee"><input type="checkbox" data-rk="${k}" ${eff[k]?'checked':''} ${acc.poste==='admin'?'disabled':''} style="margin-top:3px"><span style="flex:1">${esc(lab)}${ov?' <span class="hyChip" style="font-size:10px">ajusté</span>':''}${cap&&cap[k]===false?' <span class="dim" style="font-size:10.5px">(hors plafond '+esc(TYPES[acc.type])+')</span>':''}<br><span class="dim" style="font-size:10.5px">défaut du poste : ${def?'oui':'non'}</span></span></label>`;}).join('')).join('')}</div>
   <div class="actions"><button class="btn primary block" id="ar-ok">Enregistrer</button><button class="btn block" id="ar-reset">Revenir aux droits du poste</button><button class="btn block" data-close>Annuler</button></div>`);
  const m=document.getElementById('modal');
  m.querySelector('#ar-ok').onclick=async()=>{const rights={};m.querySelectorAll('[data-rk]').forEach(cb=>{const k=cb.dataset.rk;const def=!!base[k]&&!(cap&&cap[k]===false);if(cb.checked!==def)rights[k]=cb.checked;});const r=await updateAccount(acc,{rights});A.closeModal();A.toast(r.error?('Refusé : '+r.error):'Droits enregistrés ('+r.where+')');done&&done();};
  m.querySelector('#ar-reset').onclick=async()=>{const r=await updateAccount(acc,{rights:{}});A.closeModal();A.toast(r.error?('Refusé : '+r.error):'Droits du poste rétablis');done&&done();};}
function admSitesModal(acc,metas,done){A.openModal(`<h3 style="margin-top:0">Chantiers autorisés — ${esc(acc.name)}</h3><div class="hint" style="margin-top:0">Rien de coché = tous les chantiers (normal pour un salarié). Pour un intérimaire ou un visiteur, coche seulement ses chantiers.</div>
   <div style="max-height:50vh;overflow:auto;border:1px solid var(--line);border-radius:8px;padding:6px;margin:8px 0">${metas.length?metas.map(m=>`<label style="display:block;font-size:12.5px"><input type="checkbox" data-as="${esc(m.id)}" ${acc.sites&&acc.sites.includes(m.id)?'checked':''}> ${esc(m.name)}</label>`).join(''):'<span class="hint">aucun chantier connu sur cet appareil</span>'}</div>
   <div class="actions"><button class="btn primary block" id="as-ok">Enregistrer</button><button class="btn block" data-close>Annuler</button></div>`);
  const m=document.getElementById('modal');m.querySelector('#as-ok').onclick=async()=>{const sites=[...m.querySelectorAll('[data-as]:checked')].map(x=>x.dataset.as);const r=await updateAccount(acc,{sites:sites.length?sites:null});A.closeModal();A.toast(r.error?('Refusé : '+r.error):'Chantiers enregistrés');done&&done();};}
