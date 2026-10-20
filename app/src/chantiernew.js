// chantiernew.js — 20/10 (lot NC) : « ＋ NOUVEAU CHANTIER » SANS PASSER PAR COMMERCE.
// Ethan : « tous les chantiers seront issus de Commerce (gagné → chantier), mais pour le début, le temps que ça se mette en place, il faut juste un bouton
// pour ajouter un chantier dans les chantiers ». Un formulaire court (nom, ville, client, chef, conducteur, secteur, début, fournisseur, note) crée un chantier
// VIDE (net minimal : lines:[], fiche remplie, createdAt / createdBy, manuel:true) : ajouté à SITES et au sélecteur, gardé sur l'appareil (IndexedDB,
// même clé « trace:handoff:<id> » que les chantiers remis par le traceur → relu au démarrage, poussé au serveur à la connexion par pushHandoffs), envoyé au
// serveur tout de suite si on est connecté (table sites, upsert complet). Hors connexion ou refus : gardé sur l'appareil, renvoyé au retour du réseau
// (ncFlush) et à la prochaine connexion. Le tracé vient plus tard : import DXF DANS le chantier (le flux d'import existant, choix « dans le chantier
// ouvert » quand il est vide — l'id, la fiche, les documents, le stock, les pointages restent) ou remise depuis le traceur (traceur.html?site=<id> :
// le traceur garde l'id et tout ce qui n'est pas le tracé — bridge.js, prev.full). Étiquette « créé à la main le … par … · sans tracé » tant que lines
// est vide (liste des chantiers, Mes chantiers, Bureau, en-tête du chantier). Droit : « site.tracer » (chef, conducteur, encadrement, direction, bureau,
// administrateur) — jamais un soudeur, un intérimaire ou un visiteur. Rien d'ancien ne bouge : les accroches dans app.js / espace.js / next.js sont locales.
import {SECTEURS,personKey} from './espace.js';
import {posteLabel,POSTE_FAM} from './acces.js';
let A=null; // API fournie par app.js (voir initChantierNew)
const HANDOFF='trace:handoff:';
const esc=s=>String(s??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const frDate=d=>{if(!d)return '';const s=String(d);if(/^\d{4}-\d{2}-\d{2}/.test(s)&&s.length<=10)return s.slice(8,10)+'/'+s.slice(5,7)+'/'+s.slice(0,4);const t=new Date(s);return isNaN(t)?'':t.toLocaleDateString('fr-FR');};
const SUPS=['AXIOM','RENALIA','LOGSTOR','INPAL'];
/* clés du PLAN (ce que l'import DXF / le traceur refont) : tout le reste du chantier cible est conservé à l'import « dans le chantier ouvert » */
const PLAN_KEYS=new Set(['lines','w','h','bbox','nbox','sheetType','drawing','image','plans','geo','origin','traceur','source','method','crs','report','warnings','pieces','T','netLayers','ann','supplier','serie','rebased','demo','sent','sentAt','handoff','updated_at','bgTooBig','ncErr']);
const CSS=`.nc-new{display:flex;align-items:center;justify-content:center;gap:6px;width:100%;min-height:44px;margin:8px 0;border:1.5px dashed #eb6834;border-radius:14px;background:#fff7f3;color:#9b3d16;font:inherit;font-weight:700;font-size:14px;cursor:pointer}
.nc-new:active{background:#ffe9df}
.nc-tag{display:inline;font-size:10.5px;line-height:1.9;color:#7a5200;background:#fff4d6;border:1px solid #f1d58a;border-radius:999px;padding:1px 7px;margin-left:4px;white-space:normal;font-weight:600;vertical-align:middle;-webkit-box-decoration-break:clone;box-decoration-break:clone}
.ac-site .nc-tag{display:block;width:max-content;max-width:100%;margin:4px 0 0;line-height:1.5;font-size:11px}
.nc-grid{display:grid;grid-template-columns:1fr 1fr;gap:0 10px}@media(max-width:480px){.nc-grid{grid-template-columns:1fr}}
.nc-form label.f{margin:8px 0 3px}.nc-form input.f,.nc-form select.f,.nc-form textarea.f{min-height:44px}.nc-form textarea.f{min-height:56px}
#nc-ok{min-height:48px}.nc-form .hint{margin-bottom:2px}
.nc-empty{position:absolute;left:50%;top:40%;transform:translate(-50%,-50%);z-index:6;background:#fff;border:1px solid var(--line,#d9d6cf);border-radius:16px;padding:14px 16px;width:min(92%,440px);box-shadow:0 8px 24px rgba(0,0,0,.14);text-align:center;font-size:13px;color:var(--ink,#0b0b0b)}
.nc-empty b.t{display:block;font-size:15px;margin-bottom:4px}.nc-empty .d{color:var(--ink2,#52514e);font-size:12.5px;line-height:1.35}
.nc-empty .row{display:flex;gap:8px;justify-content:center;flex-wrap:wrap;margin-top:10px}.nc-empty .btn{min-height:44px;padding:8px 14px;font-size:14px;flex:1 1 170px}
.nc-empty .hint{margin-top:8px;font-size:11.5px}
.nc-into{margin:8px 0;padding:10px 12px;background:#fff7f3;border-color:#f3c9b5}.nc-into b.t{display:block;margin-bottom:4px}
.nc-opt{display:flex;gap:8px;align-items:flex-start;min-height:40px;padding:4px 0;font-size:13px;cursor:pointer;line-height:1.35}.nc-opt input{margin-top:3px;width:18px;height:18px;flex:none}
.nc-kv{display:inline-flex;align-items:center;gap:4px}`;
/* ---------- branchement ---------- */
export function initChantierNew(api){A=api;
  try{if(!document.getElementById('css-lot-nc')){const st=document.createElement('style');st.id='css-lot-nc';st.textContent=CSS;document.head.appendChild(st);}}catch(e){}
  document.addEventListener('click',e=>{const t=e.target&&e.target.closest?e.target:null;if(!t)return;
    const bn=t.closest('[data-nc-new]');if(bn){e.preventDefault();e.stopPropagation();if(bn.dataset.ncClose!==undefined)A.closeModal();ncOpenForm();return;}
    const bf=t.closest('[data-nc-fiche]');if(bf){e.preventDefault();e.stopPropagation();const id=bf.dataset.ncFiche&&bf.dataset.ncFiche!=='1'?bf.dataset.ncFiche:A.state.siteId;ncOpenForm({edit:id});return;}
    const bi=t.closest('[data-nc-import]');if(bi){e.preventDefault();if(!ncCanCreate()){A.toast('Réservé au chef / bureau');return;}A.openImport();return;}
    const bt=t.closest('[data-nc-traceur]');if(bt){e.preventDefault();if(!ncCanCreate()){A.toast('Réservé au chef / bureau');return;}const id=A.state.siteId;if(!id||id==='__vide')return;location.href='./traceur.html?site='+encodeURIComponent(id)+'&v='+Date.now().toString(36);return;}});
  window.addEventListener('online',()=>setTimeout(()=>ncFlush('réseau').catch(e=>console.warn(e)),1500)); /* retour du réseau : les chantiers créés hors connexion partent */
  setInterval(()=>{if(document.visibilityState==='visible')ncFlush('période').catch(e=>console.warn(e));},90000);}
/* ---------- droits ---------- */
export function ncCanCreate(){if(!A)return false;try{const acc=A.current&&A.current();if(acc&&(acc.type==='visiteur'||acc.poste==='visiteur'))return false;if(acc&&acc.active===false)return false;return !!(A.can('site.tracer')||(A.isAdmin&&A.isAdmin()));}catch(e){return false;}}
const canFiche=()=>ncCanCreate()||!!(A&&A.can('planning.edit'));
/* ---------- bouton « ＋ Nouveau chantier » (accueil : carte / liste ; Mes chantiers) ---------- */
export function ncButtonHTML(where){if(!ncCanCreate())return '';return `<button type="button" class="nc-new" data-nc-new="1" data-nc-where="${esc(where||'')}" title="Créer un chantier sans passer par Commerce : fiche seule, le tracé viendra plus tard (DXF ou traceur)">＋ Nouveau chantier <span style="font-weight:400;font-size:12px;color:#7a5200">· sans passer par Commerce</span></button>`;}
/* ---------- étiquette « créé à la main le … par … · sans tracé » ---------- */
function manualInfo(id){if(!A||!id)return null;const n=A.SITES[id];
  if(n){if(!n.manuel)return null;return {empty:!(Array.isArray(n.lines)?n.lines.length:0),at:n.createdAt||'',by:n.createdBy||''};}
  const m=(A.state.serverMetas||[]).find(x=>x.id===id);if(!m||!m.manuel)return null;return {empty:!m.hasLines,at:m.createdAt||'',by:m.createdBy||''};}
export function ncTagHTML(id){const i=manualInfo(id);if(!i||!i.empty)return '';return `<span class="nc-tag" title="Chantier créé à la main (sans passer par Commerce) : pas encore de tracé — importe un plan DXF ou remets-le depuis le traceur">✎ créé à la main${i.at?' le '+esc(frDate(i.at)):''}${i.by?' par '+esc(i.by):''} · sans tracé</span>`;}
export function ncHeadTxt(net){if(!net||!net.manuel||(net.lines||[]).length)return '';return 'créé à la main · sans tracé';}
/* fiche du Bureau (next.js, héros) : ville, client, début prévu, note + étiquette + « ✎ Fiche » */
export function ncFicheHTML(net){if(!net||net.id==='__vide')return '';const f=net.fiche||{};let h='';
  if(f.ville)h+=`<span class="nc-kv">🏙 ${esc(f.ville)}${f.cp?' ('+esc(f.cp)+')':''}</span>`;if(f.client)h+=`<span class="nc-kv">🏛 ${esc(f.client)}</span>`;if(f.debut)h+=`<span class="nc-kv">📅 début prévu ${esc(frDate(f.debut))}</span>`;if(net.supplier)h+=`<span class="nc-kv">🧱 ${esc(net.supplier)}</span>`;if(f.note)h+=`<span class="nc-kv">📝 ${esc(f.note)}</span>`;
  if(canFiche())h+=`<button type="button" class="btn sm" data-nc-fiche="${esc(net.id)}" style="min-height:34px;background:#fff">✎ Fiche</button>`;return h;}
export function ncPlanToolsHTML(){const net=A&&A.net();if(!net||net.id==='__vide'||!canFiche())return '';return `<button class="btn sm" data-nc-fiche="${esc(net.id)}">✎ Fiche du chantier</button>`;}
/* ---------- plan vide : message + « Importer un plan DXF » / « Tracer avec le traceur » ---------- */
export function ncPlanEmpty(isEmpty){if(!A)return;const c=document.getElementById('canvas');if(!c)return;let el=document.getElementById('ncEmpty');const net=A.net();const on=!!(isEmpty&&net&&net.id!=='__vide'&&!(net.lines||[]).length);
  if(!on){if(el)el.style.display='none';return;}
  if(!el){el=document.createElement('div');el.id='ncEmpty';el.className='nc-empty';c.appendChild(el);}
  const ok=ncCanCreate();const i=manualInfo(net.id);const key=net.id+'|'+ok+'|'+(i?i.at+i.by:'');if(el.dataset.key===key){el.style.display='';return;}el.dataset.key=key;
  el.innerHTML=`<b class="t">Pas encore de tracé sur ce chantier</b><div class="d">${ok?'Remets-le depuis le traceur ou importe un plan DXF : la fiche, les documents, le stock et les pointages du chantier restent.':'Le chef ou le bureau l\'importera (plan DXF) ou le tracera dans le traceur. En attendant : bureau, conversation, stock, documents et pointages marchent.'}</div>
    ${ok?`<div class="row"><button type="button" class="btn primary" data-nc-import="1">📄 Importer un plan DXF</button><button type="button" class="btn" data-nc-traceur="1">✎ Tracer avec le traceur</button></div>`:''}
    ${i?`<div class="hint">✎ créé à la main${i.at?' le '+esc(frDate(i.at)):''}${i.by?' par '+esc(i.by):''}</div>`:''}`;el.style.display='';}
/* ---------- annuaire : chefs / conducteurs (comptes du serveur, sinon personnages de démo) ---------- */
function people(){let L=[];try{L=(A.accounts&&A.accounts())||[];}catch(e){L=[];}return L.filter(a=>a&&a.active!==false&&a.poste!=='visiteur'&&a.type!=='visiteur').map(a=>({key:personKey(a),name:a.name||a.email||'',poste:a.poste||'',fam:POSTE_FAM[a.poste]||''}));}
const peopleOpts=(kind,sel)=>{const P=people();const first=P.filter(p=>p.poste===kind),enc=P.filter(p=>p.poste!==kind&&(p.fam==='encadrement'||p.fam==='direction')),rest=P.filter(p=>p.poste!==kind&&p.fam!=='encadrement'&&p.fam!=='direction'&&p.fam!=='terrain');
  const opt=p=>`<option value="${esc(p.key)}"${p.key===sel?' selected':''}>${esc(p.name)} — ${esc(posteLabel(p.poste))}</option>`;
  return `<option value="">— à désigner plus tard —</option>${first.map(opt).join('')}${enc.length?`<optgroup label="Encadrement / direction">${enc.map(opt).join('')}</optgroup>`:''}${rest.length?`<optgroup label="Bureau">${rest.map(opt).join('')}</optgroup>`:''}${sel&&!P.some(p=>p.key===sel)?`<option value="${esc(sel)}" selected>${esc(sel.includes('@')?sel.split('@')[0]:sel.replace(/^l:/,''))}</option>`:''}`;};
/* ---------- formulaire (création, ou modification de la fiche d'un chantier existant) ---------- */
export function ncOpenForm(o){o=o||{};const edit=o.edit?A.SITES[o.edit]:null;if(o.edit&&!edit){A.toast('Chantier pas chargé sur cet appareil : ouvre-le une fois');return;}
  if(edit?!canFiche():!ncCanCreate()){A.toast('Réservé au chef / bureau');return;}
  const f=(edit&&edit.fiche)||{};const cur=A.current&&A.current();const me=cur?personKey(cur):'';
  const chef0=edit?(f.chef||''):(cur&&cur.poste==='chef'?me:''),cond0=edit?(f.conducteur||''):(cur&&cur.poste==='conducteur'?me:'');
  const manu=!!(edit&&edit.manuel);
  A.openModal(`<div class="nc-form"><h3 style="margin:0 0 2px">${edit?'✎ Fiche du chantier':'＋ Nouveau chantier'}</h3><div class="hint">${edit?'Ville, client, chef, conducteur, secteur, début prévu, note. '+(manu?'Le nom se modifie aussi (chantier créé à la main).':'Le nom du chantier vient de son tracé (traceur / import).'):'Sans passer par Commerce : la fiche seule, le tracé viendra plus tard (plan DXF ou traceur). Une affaire gagnée pourra s\'y lier depuis Commerce.'}</div>
    <label class="f" for="nc-name">Nom du chantier *</label><input class="f" id="nc-name" maxlength="90" placeholder="ex. Réseau de chaleur — rue des Exemples" value="${esc(edit?edit.name||'':'')}"${edit&&!manu?' readonly':''}>
    <div class="nc-grid"><div><label class="f" for="nc-ville">Ville</label><input class="f" id="nc-ville" maxlength="60" autocomplete="off" value="${esc(f.ville||'')}"></div><div><label class="f" for="nc-cp">Code postal</label><input class="f" id="nc-cp" inputmode="numeric" maxlength="5" placeholder="35000" value="${esc(f.cp||'')}"></div></div>
    <label class="f" for="nc-client">Client / maître d'ouvrage</label><input class="f" id="nc-client" maxlength="90" value="${esc(f.client||'')}">
    <div class="nc-grid"><div><label class="f" for="nc-chef">Chef de chantier</label><select class="f" id="nc-chef">${peopleOpts('chef',chef0)}</select></div><div><label class="f" for="nc-cond">Conducteur de travaux</label><select class="f" id="nc-cond">${peopleOpts('conducteur',cond0)}</select></div></div>
    <div class="nc-grid"><div><label class="f" for="nc-secteur">Secteur</label><select class="f" id="nc-secteur"><option value="">— secteur —</option>${Object.keys(SECTEURS).map(k=>`<option value="${k}"${f.secteur===k?' selected':''}>${esc(SECTEURS[k])}</option>`).join('')}</select></div><div><label class="f" for="nc-debut">Date de début prévue</label><input class="f" id="nc-debut" type="date" value="${esc(f.debut||'')}"></div></div>
    <label class="f" for="nc-sup">Fournisseur de tubes</label><select class="f" id="nc-sup"><option value="">— pas encore connu —</option>${SUPS.map(s=>`<option value="${s}"${(edit?edit.supplier:'')===s?' selected':''}>${s}</option>`).join('')}</select>
    <label class="f" for="nc-note">Note</label><textarea class="f" id="nc-note" rows="2" maxlength="400" placeholder="accès, contact sur place, particularités…">${esc(f.note||'')}</textarea>
    <div class="actions"><button type="button" class="btn primary block" id="nc-ok">${edit?'Enregistrer la fiche':'Créer le chantier'}</button><button type="button" class="btn block" data-close>Annuler</button></div></div>`);
  const v=id=>{const el=document.getElementById(id);return el?String(el.value||'').trim():'';};
  const ok=document.getElementById('nc-ok');if(!ok)return;
  ok.onclick=async()=>{const name=v('nc-name');if(!name){A.toast('Il faut un nom de chantier');const n=document.getElementById('nc-name');if(n)n.focus();return;}
    const cp=v('nc-cp');if(cp&&!/^\d{5}$/.test(cp)){A.toast('Code postal : 5 chiffres (ou rien)');return;}
    const fields={name,ville:v('nc-ville'),cp,client:v('nc-client'),chef:v('nc-chef'),conducteur:v('nc-cond'),secteur:v('nc-secteur'),debut:v('nc-debut'),supplier:v('nc-sup'),note:v('nc-note')};
    ok.disabled=true;ok.textContent=edit?'Enregistrement…':'Création…';
    try{if(edit)await ncSaveFiche(edit.id,fields);else await ncCreate(fields);}catch(e){console.warn('nc',e);A.toast('Impossible : '+((e&&e.message)||e));ok.disabled=false;ok.textContent=edit?'Enregistrer la fiche':'Créer le chantier';}};
  setTimeout(()=>{const n=document.getElementById('nc-name');if(n&&!edit&&window.innerWidth>700)n.focus();},50);}
const ficheOf=f=>{const o={};[['ville','ville'],['cp','cp'],['client','client'],['chef','chef'],['conducteur','conducteur'],['secteur','secteur'],['debut','debut'],['note','note']].forEach(([k,s])=>{o[k]=f[s]||null;});return o;};
/* ---------- création : net minimal valide → SITES + sélecteur + appareil + serveur, puis ouverture ---------- */
export async function ncCreate(fields){if(!A)throw new Error('module non branché');if(!ncCanCreate())throw new Error('réservé au chef / bureau');
  const name=String(fields.name||'').trim();if(!name)throw new Error('nom manquant');
  const id='man_'+Date.now().toString(36)+Math.random().toString(36).slice(2,6);const at=new Date().toISOString();const by=A.userName?A.userName():'';
  const net={id,name,lines:[],w:100,h:100,sheetType:'plain',source:'manuel',fiche:ficheOf(fields),createdAt:at,createdBy:by,manuel:true};
  if(fields.supplier&&SUPS.includes(fields.supplier)){net.supplier=fields.supplier;net.serie=fields.supplier==='LOGSTOR'||fields.supplier==='RENALIA'?2:1;}
  A.dropVide();A.addSiteOption(net);try{A.invalidate();}catch(e){}
  const ok=await ncPersist(net,'création');
  A.closeModal();
  A.toast(ok?'Chantier « '+name+' » créé et enregistré sur le serveur':(navigator.onLine===false||!A.state.cloudUser||/fetch|network|réseau|délai|timeout/i.test(A.sync.lastError||'')?'Chantier « '+name+' » créé — enregistré sur l\'appareil, il part au serveur au retour du réseau':'Chantier « '+name+' » créé sur l\'appareil — le serveur a refusé ('+String(A.sync.lastError||'').slice(0,80)+'), nouvel essai automatique'));
  A.state.pendingTab='bureau';A.state.userOpened=true;let opened=false;try{opened=await A.openSite(id);}catch(e){console.warn(e);}
  if(!opened){try{A.renderHome();}catch(e){}}
  return id;}
/* fiche modifiée depuis le Bureau / le menu du plan : chantier créé à la main → copie complète (nom compris) ; autre chantier → partie « fiche » (saveSiteFicheX) */
async function ncSaveFiche(id,fields){const net=A.SITES[id];if(!net)throw new Error('chantier absent');const fiche=Object.assign({},net.fiche||{},ficheOf(fields));
  if(net.manuel){net.name=fields.name||net.name;net.fiche=fiche;if(fields.supplier&&SUPS.includes(fields.supplier)){net.supplier=fields.supplier;if(!net.serie)net.serie=fields.supplier==='LOGSTOR'||fields.supplier==='RENALIA'?2:1;}else if(!fields.supplier){delete net.supplier;}
    A.addSiteOption(net);const m=(A.state.serverMetas||[]).find(x=>x.id===id);if(m)Object.assign(m,{name:net.name,ville:fiche.ville||'',chef:fiche.chef||null,conducteur:fiche.conducteur||null,secteur:fiche.secteur||null});
    const ok=await ncPersist(net,'fiche');A.closeModal();if(ok)A.toast('Fiche enregistrée');}
  else{const ok=await A.saveSiteFiche(id,fiche);A.closeModal();A.toast(ok?'Fiche enregistrée':'Fiche gardée sur l\'appareil (serveur : '+String(A.sync.lastError||'refus').slice(0,60)+')');}
  try{A.invalidate();}catch(e){}try{if(A.state.screen==='site')A.renderAll();else A.renderHome();}catch(e){console.warn(e);}}
/* ---------- enregistrement : appareil d'abord (IndexedDB, clé des remises du traceur), puis serveur (upsert complet) ---------- */
const strip=o=>{const {demo,handoff,sent,sentAt,ncErr,...c}=o;return c;};
async function ncPersist(net,why){const id=net.id;net.ncAt=Date.now(); /* date de la dernière modification faite ICI (le renvoi différé la compare à la version du serveur) */
  let plain=null;try{plain=JSON.parse(JSON.stringify(strip(net)));}catch(e){console.warn('nc json',e);} /* copie de l'appareil = données pures : un net importé porte une fonction (T, repère DXF) qu'IndexedDB ne clone pas */
  if(plain){try{await A.kv.set(HANDOFF+id,Object.assign({},plain,{sent:false}));}catch(e){console.warn('nc kv',e);}}
  let r=false;try{r=await A.sync.saveSite(strip(net));}catch(e){console.warn('nc serveur',e);r=false;}
  if(r){if(typeof r==='string')net.updated_at=r;A.state.ownSiteWrite=Date.now();delete net.ncErr;
    await new Promise(res=>setTimeout(res,250)); /* les parties écrites pendant l'envoi (tracé marché figé à l'ouverture…) relisent / récrivent la même clé : on patche la copie après elles, sans l'écraser */
    try{let x=await A.kv.get(HANDOFF+id);if(!x||x.id!==id)x=JSON.parse(JSON.stringify(strip(net)));x.sent=true;x.sentAt=Date.now();x.ncAt=net.ncAt;if(typeof r==='string')x.updated_at=r;delete x.ncErr;await A.kv.set(HANDOFF+id,x);}catch(e){}
    try{A.badge('chantier enregistré sur le serveur');}catch(e){}return true;}
  if(A.state.cloudUser&&navigator.onLine!==false&&!/fetch|network|réseau|délai|timeout/i.test(A.sync.lastError||'')){net.ncErr={at:Date.now(),msg:String(A.sync.lastError||'')};try{const x=await A.kv.get(HANDOFF+id);if(x){x.ncErr=net.ncErr;await A.kv.set(HANDOFF+id,x);}}catch(e){}try{A.badge('⚠️ chantier « '+net.name+' » : pas enregistré sur le serveur');}catch(e){}}
  else{try{A.badge('chantier « '+net.name+' » gardé sur l\'appareil — part au retour du réseau');}catch(e){}}
  return false;}
/* chantiers créés à la main pas encore partis (retour du réseau, toutes les 90 s) — les remises du traceur restent l'affaire de pushHandoffs (app.js) */
let flushing=false;
export async function ncFlush(why){if(!A||flushing)return 0;flushing=true;let n=0;
  try{if(!(await A.sync.user()))return 0;const keys=await A.kv.keys(HANDOFF);let metas=undefined; /* liste légère du serveur, lue une fois et seulement s'il y a quelque chose à envoyer */
    for(const k of keys){const x=await A.kv.get(k);if(!x||!x.manuel||x.sent||x.traceur||!x.id)continue;if(why==='période'&&x.ncErr&&Date.now()-(+x.ncErr.at||0)<600000)continue; /* refus (droits) : pas de réessai en boucle, toutes les 10 min */
      if(metas===undefined){try{metas=await A.sync.listSiteMeta();}catch(e){metas=null;}}if(metas===null)break; /* liste inconnue (réseau) : on ne renvoie rien à l'aveugle */
      const m=metas.find(y=>y.id===x.id);if(m&&!m.deleted&&!(x.ncAt&&Date.parse(m.updated_at||0)+1000<x.ncAt)){x.sent=true;x.sentAt=Date.now();await A.kv.set(k,x);continue;} /* déjà au serveur, pas plus récent ici (drapeau perdu lors d'une écriture concurrente) : rien à renvoyer, on n'écrase pas les autres appareils */
      if(m&&m.deleted)continue; /* supprimé depuis un autre appareil : pushHandoffs (app.js) le masque, on ne le ressuscite pas */
      const {sent,sentAt,handoff,ncErr,...clean}=x;let r=false;try{r=await A.sync.saveSite(clean);}catch(e){r=false;}
      if(r){n++;const now=Date.now();if(typeof r==='string')x.updated_at=r;x.sent=true;x.sentAt=now;delete x.ncErr;await A.kv.set(k,x);A.state.ownSiteWrite=now;const s=A.SITES[x.id];if(s){if(typeof r==='string')s.updated_at=r;delete s.ncErr;}A.toast('Chantier « '+x.name+' » envoyé au serveur');try{A.badge('chantier « '+x.name+' » envoyé au serveur');}catch(e){}}
      else if(A.state.cloudUser&&!/fetch|network|réseau|délai|timeout/i.test(A.sync.lastError||'')){x.ncErr={at:Date.now(),msg:String(A.sync.lastError||'')};await A.kv.set(k,x);}}}
  catch(e){console.warn('nc flush',e);}finally{flushing=false;}return n;}
/* ---------- import DXF « dans le chantier ouvert » (flux createImportedSite d'app.js, accroches locales) ---------- */
export function ncImportUI(body,ctx,refresh){if(!A||!body||!ctx)return;const net=A.net();if(!net||net.id==='__vide'||(net.lines||[]).length||!ncCanCreate())return;
  const frow=body.querySelector('.frow');if(!frow||body.querySelector('.nc-into'))return;ctx.newId=ctx.id;
  const box=document.createElement('div');box.className='card nc-into';box.innerHTML=`<b class="t">Où mettre ce tracé ?</b><label class="nc-opt"><input type="radio" name="nc-into" value="into" checked> <span>Dans le chantier ouvert : <b>${esc(net.name)}</b> <span class="hint" style="display:inline">— fiche, documents, stock, pointages conservés (même identifiant)</span></span></label><label class="nc-opt"><input type="radio" name="nc-into" value="new"> <span>Dans un nouveau chantier à part</span></label>`;
  frow.parentNode.insertBefore(box,frow);
  const apply=()=>{const into=(box.querySelector('input[name=nc-into]:checked')||{}).value==='into';const nm=document.getElementById('impName'),go=document.getElementById('impGo'),sup=document.getElementById('impSup');
    if(into){ctx.into=net.id;ctx.id=net.id;if(nm)nm.value=net.name||nm.value;if(sup&&net.supplier&&[...sup.options].some(o=>o.value===net.supplier))sup.value=net.supplier;if(go)go.textContent='Importer dans ce chantier';}
    else{ctx.into=null;ctx.id=ctx.newId;if(nm)nm.value=String(ctx.fileName||'').replace(/\.[^.]+$/,'');if(go)go.textContent='Créer le chantier';}};
  box.querySelectorAll('input[name=nc-into]').forEach(r=>r.addEventListener('change',()=>{apply();if(refresh)refresh();}));apply();}
/* le tracé importé prend la place du plan vide : tout ce qui n'est pas le plan (fiche, création, conversation, stock, QSE, dossier, pointages, objectifs…) reste */
export function ncImportInto(net,ctx){if(!A||!ctx||!ctx.into||!net)return net;const t=A.SITES[ctx.into];if(!t)return net;
  Object.keys(t).forEach(k=>{if(PLAN_KEYS.has(k))return;if(net[k]===undefined||net[k]===null)net[k]=t[k];});
  net.id=t.id;net.manuel=!!t.manuel||net.manuel;if(t.createdAt)net.createdAt=t.createdAt;if(t.createdBy)net.createdBy=t.createdBy;net.fiche=Object.assign({},t.fiche||{},net.fiche||{});
  net.traceFrom={kind:'dxf',at:new Date().toISOString(),by:A.userName?A.userName():'',file:ctx.fileName||''};return net;}
export function ncSaveImported(net,ctx){if(!A||!ctx||!ctx.into)return null;return ncPersist(net,'import').then(ok=>{if(ok)A.toast('Tracé importé dans « '+net.name+' » — enregistré sur le serveur');return ok;}).catch(e=>{console.warn(e);return false;});}
/* ---------- tests ---------- */
export function ncTestApi(){return {create:f=>ncCreate(f),flush:()=>ncFlush('test'),can:()=>ncCanCreate(),tag:id=>ncTagHTML(id),form:o=>ncOpenForm(o),head:net=>ncHeadTxt(net),pending:async()=>{const out=[];for(const k of await A.kv.keys(HANDOFF)){const x=await A.kv.get(k);if(x&&x.manuel)out.push({id:x.id,sent:!!x.sent,err:x.ncErr||null});}return out;}};}
