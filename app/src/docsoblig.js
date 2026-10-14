// docsoblig.js — DOCUMENTS OBLIGATOIRES ET DOCUMENTS DE L'ENTREPRISE (14/10 après-midi (lot D)). Ethan : « une section documents obligatoires : tu vois ce qui est
// formulaire à remplir, acte d'engagement etc. ; on peut les télécharger pour les remplir et les déposer complétés, pour après pouvoir les inclure au dossier de remise
// d'offre » + « l'assurance déposée dans le logiciel, que ça remplisse ça (les garanties du mémoire) tout seul, comme d'autres documents obligatoires pouvant être joints à l'offre ».
// 1) DOCUMENTS DE L'ENTREPRISE — déposés UNE fois (SCR → « Documents administratifs (offres) » — à ne pas confondre avec « Documents d'entreprise » à signer ; écriture administrateur / bureau, lecture tout compte actif : sql/retours_14-10b.sql).
//    CONTRAT (lu aussi par le mémoire technique) : registre « entdoc », id = type (assurance_rc, assurance_decennale, kbis, urssaf, fiscale, rib, qualification,
//    autre_<…>), ligne {type, title, file, url, data, validUntil (AAAA-MM-JJ), assureur, police, at, by} + garanties (texte des montants assurés), size, mime,
//    prev:[{file, url, validUntil, at, by}] (anciennes versions). Fichier au stockage (A.sync.uploadDoc, dossier entreprise/entdocs), repli data URL (≤ 1,5 Mo).
//    Alerte 30 jours avant l'échéance : ligne du hub (pastille) et « À faire » de qui peut les déposer.
// 2) SECTION « DOCUMENTS OBLIGATOIRES » de l'affaire (7 · Offre) : formulaires du DCE repérés tout seuls (AE / ATTRI1, DC1, DC2, DC4, DUME, cadre de réponse,
//    attestation de visite, sur l'honneur, annexe à l'AE, « formulaire / à compléter ») + documents de l'entreprise + pièces produites (DPGF, mémoire, planning,
//    variante) + autres pièces. Pour chacun : ⤓ l'original, 📎 la version complétée / signée, statut, « dans la remise » oui / non.
//    Données : a.offre.oblig = {items:{<clé>:{inc, off, force, file:{id, name, size, type, url, local, at, by, v, total}, prev:[…]}}, custom:[{id, label}]}
//    (clés : f:<id de la pièce du DCE>, e:<id entdoc>, p:dpgf|memoire|planning|variante, c:<id>) — dans a.offre : figé avec chaque version de chiffrage.
// 3) 📦 DOSSIER DE REMISE (.zip) : les pièces cochées (formulaires complétés, documents de l'entreprise, mémoire Word, DPGF Excel du client remplie ou CSV, dépôts)
//    + 00_Bordereau_des_pieces.html ; les manquantes sont listées dans le bordereau.
import {regAll,regGet,regSet,regPending} from './reg.js';
import {affGet,affSet,affState,calcAffaire,affWithVirtual} from './affaires.js';
import {docsOf,catOf,docBlob} from './dce.js';
import {stepState,memoireVars,memoireDocHTML,dpgfCSV} from './commerce.js';
import {memLib,memLibMode,memLibDocHTML,memLibDocx} from './memoire2.js';
import {isXlDpgf,buildDossier} from './dpgfxl.js'; // 14/10 intégration : la DPGF du zip = le fichier du client tel que la grille « comme dans Excel » l'exporte (lot C)
import {zipEntries,inflate,setCellsXml,rezip,colName} from './xlsx.js';
import {docHTML} from './charte.js';
import {zipSync,strToU8} from 'fflate';
const ID='dob';
let A=null;export function initDocsOblig(api){A=api;setTimeout(hook,0);}
const esc=s=>String(s??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const nb=(x,d)=>{x=+x||0;return x.toLocaleString('fr-FR',{maximumFractionDigits:d===undefined?0:d,minimumFractionDigits:d===undefined?0:d});};
const eur=x=>nb(Math.round(+x||0))+' €';const dFR=x=>x?new Date(String(x).length===10?x+'T00:00:00':x).toLocaleDateString('fr-FR'):'';
const pad=n=>String(n).padStart(2,'0');const isoOf=d=>d.getFullYear()+'-'+pad(d.getMonth()+1)+'-'+pad(d.getDate());const todayIso=()=>isoOf(new Date());
const days=(a,b)=>Math.round((new Date(b+'T00:00:00')-new Date(a+'T00:00:00'))/86400000);
const addMonths=(iso,m)=>{const d=new Date(iso+'T00:00:00');d.setMonth(d.getMonth()+m);return isoOf(d);};
const say=t=>{if(A&&A.toast)A.toast(t);};const who=()=>A&&A.userName?A.userName():'';
const safe=s=>String(s||'').normalize('NFD').replace(/[̀-ͯ]/g,'').replace(/[^A-Za-z0-9._-]+/g,'_').replace(/_+/g,'_').replace(/^_|_$/g,'').slice(0,80)||'piece';
const newId=p=>(p||'F')+Date.now().toString(36)+Math.random().toString(36).slice(2,5);
/* ═════════ CSS (une seule feuille pour le lot D : versions + documents) ═════════ */
let CSSON=false;
export function lotDCss(){if(CSSON||typeof document==='undefined')return;if(document.getElementById('css-lot-d')){CSSON=true;return;}CSSON=true;const st=document.createElement('style');st.id='css-lot-d';
  st.textContent=`/* 14/10 après-midi (lot D) : versions de chiffrage + documents obligatoires */
.vv-bar{margin:0 0 6px}.vv-line{font-size:12.5px;margin:6px 0 2px;color:var(--ink2,#444)}.vv-warn{background:#fff4d6;color:#7a5200;border:1px solid #f0c76a;border-radius:8px;padding:6px 9px;font-size:12.5px;margin:6px 0}
.vv-hist{margin-top:6px;border:1px solid var(--line,#e3e0da);border-radius:10px;background:var(--surface,#fff)}.vv-hist>summary{cursor:pointer;min-height:40px;display:flex;align-items:center;flex-wrap:wrap;gap:6px;padding:4px 10px;font-size:13px;font-weight:600}
.vv-row{border-top:1px solid var(--line,#e3e0da);padding:8px 10px}.vv-row.cur{background:#fbfaf6}.vv-rh{display:flex;flex-wrap:wrap;align-items:baseline;gap:4px 6px}.vv-rh small{flex-basis:100%;color:var(--ink2,#666);font-size:11.5px}
.vv-tag{display:inline-block;font-size:11px;border-radius:6px;padding:1px 6px;background:#ececea;color:#444;white-space:nowrap}.vv-tag.cur{background:#e8f0fb;color:#1f6fd0}.vv-tag.vf{background:#e6f5ec;color:#15673a;font-weight:700}.vv-tag.warn{background:#fff4d6;color:#7a5200}
.vv-acts,.vv-dacts{display:flex;flex-wrap:wrap;gap:6px;margin-top:6px}.vv-chg{margin-top:4px;font-size:12.5px}.vv-chgd{margin-top:4px;font-size:12.5px}.vv-chgd>summary{cursor:pointer;color:var(--ink2,#555);min-height:32px;display:flex;align-items:center;overflow-wrap:anywhere}
.vv-cg{margin:4px 0}.vv-cg ul{margin:2px 0 0 18px;padding:0}.vv-cg li{margin:1px 0;overflow-wrap:anywhere}
.vv-doc{border:1px dashed #cfcac0;border-radius:8px;padding:6px 8px;margin-top:6px;background:#fffdf8}.vv-dh{display:flex;flex-wrap:wrap;gap:4px 6px;align-items:baseline;font-size:12.5px;overflow-wrap:anywhere}.vv-dk{font-size:11px;color:#6b4bd6;font-weight:700}
.vv-dnotes{display:flex;flex-wrap:wrap;gap:4px;margin-top:4px}.vv-dnote{font-size:12px;background:#fff1ea;color:#b84a1c;border-radius:6px;padding:1px 6px;overflow-wrap:anywhere}.vv-app{font-size:11px;border-radius:6px;padding:1px 6px;background:#fff4d6;color:#7a5200}.vv-app.ok{background:#e6f5ec;color:#15673a}
.vv-dsel{max-width:210px;margin:0;font-size:12px;min-height:34px;padding:4px 6px}
.vv-band{border:2px solid #1f6fd0;background:#eef4fd;border-radius:12px;padding:8px 10px;margin:0 0 8px}.vv-band.slim{border-width:1px;display:flex;flex-wrap:wrap;align-items:center;gap:6px;font-size:12.5px}
.vv-bh{display:flex;flex-wrap:wrap;align-items:center;gap:6px}.vv-eye{font-size:20px}.vv-bt{flex:1;min-width:180px}.vv-bt small{display:block;color:#3b4f6b;font-size:11.5px;overflow-wrap:anywhere}.vv-ro{font-size:11px;background:#1f6fd0;color:#fff;border-radius:6px;padding:1px 6px;margin-left:4px}
.vv-bnav{display:flex;flex-wrap:wrap;gap:6px}.vv-docs{margin-top:6px}.vv-box{border:1px solid var(--line,#e3e0da);border-radius:10px;padding:8px 10px;margin-top:8px;font-size:12.5px}.vv-ck{display:flex;gap:6px;align-items:flex-start;margin-top:6px;font-size:12.5px}.vv-ck input{margin-top:3px}
.vv-motifs{margin-top:4px}
.dob-card .eq-lab{margin-top:10px}.dob-kpis{display:flex;flex-wrap:wrap;gap:6px;margin:4px 0 2px}.dob-kpi{font-size:12px;border-radius:8px;padding:3px 8px;background:#ececea}.dob-kpi.ok{background:#e6f5ec;color:#15673a}.dob-kpi.warn{background:#fff4d6;color:#7a5200}.dob-kpi.bad{background:#fdeae7;color:#9b2c22}
.dob-row{border:1px solid var(--line,#e3e0da);border-radius:10px;padding:6px 8px;margin-top:6px;background:var(--surface,#fff)}.dob-row.off{opacity:.62}.dob-rh{display:flex;align-items:flex-start;gap:8px}.dob-rh .tx{flex:1;min-width:0}.dob-rh .tx b{display:block;font-size:13px;overflow-wrap:anywhere}.dob-rh .tx small{display:block;font-size:11.5px;color:var(--ink2,#666);overflow-wrap:anywhere}
.dob-inc{display:flex;align-items:center;justify-content:center;min-width:34px;min-height:34px;margin:-2px 0 0 -2px}.dob-inc input{width:20px;height:20px}
.dob-st{font-size:11px;border-radius:6px;padding:2px 7px;flex:none;max-width:48%;line-height:1.25;text-align:right;overflow-wrap:anywhere}.dob-st.ok{background:#e6f5ec;color:#15673a}.dob-st.warn{background:#fff4d6;color:#7a5200}.dob-st.bad{background:#fdeae7;color:#9b2c22}.dob-st.todo{background:#ececea;color:#444}.dob-st.info{background:#e8f0fb;color:#1f6fd0}
.dob-ra{display:flex;flex-wrap:wrap;gap:6px;margin-top:6px}.dob-foot{display:flex;flex-wrap:wrap;gap:6px;margin-top:10px}.dob-erow{border:1px solid var(--line,#e3e0da);border-radius:12px;padding:8px 10px;margin-top:8px;background:var(--surface,#fff)}
.dob-erow.bad{border-color:#f0b4ab}.dob-erow.warn{border-color:#f0c76a}.dob-eh{display:flex;gap:8px;align-items:flex-start}.dob-eh .tx{flex:1;min-width:0}.dob-eh .tx b{display:block;overflow-wrap:anywhere}.dob-eh .tx small{display:block;color:var(--ink2,#666);font-size:12px;overflow-wrap:anywhere}.dob-ic{font-size:20px;flex:none}
.dob-gar{white-space:pre-wrap;font-size:12px;background:#f7f6f2;border-radius:8px;padding:4px 8px;margin-top:4px;overflow-wrap:anywhere}.dob-ign summary{cursor:pointer;font-size:12px;color:var(--ink2,#666);min-height:34px;display:flex;align-items:center}
@media (max-width:520px){.dob-st{max-width:42%}.vv-dsel{max-width:100%;flex-basis:100%}}`;
  document.head.appendChild(st);}
/* ═════════ 1 · DOCUMENTS DE L'ENTREPRISE (registre « entdoc ») ═════════ */
export const ENT_TYPES=[
  {type:'assurance_rc',title:'Attestation d\'assurance responsabilité civile',short:'Assurance RC',ins:true,months:12,inc:true,ic:'🛡',hint:'la date de fin de période de garantie indiquée sur l\'attestation'},
  {type:'assurance_decennale',title:'Attestation d\'assurance décennale',short:'Assurance décennale',ins:true,months:12,inc:true,ic:'🛡',hint:'la date de fin de période de garantie indiquée sur l\'attestation'},
  {type:'kbis',title:'Extrait Kbis',short:'Kbis',months:3,inc:true,ic:'🏢',hint:'exigé de moins de 3 mois : date d\'édition + 3 mois'},
  {type:'urssaf',title:'Attestation de vigilance URSSAF',short:'URSSAF',months:6,inc:true,ic:'🧾',hint:'valable 6 mois à partir de sa date'},
  {type:'fiscale',title:'Attestation de régularité fiscale',short:'Attestation fiscale',months:12,inc:true,ic:'🧾',hint:'celle de l\'année en cours'},
  {type:'rib',title:'RIB',short:'RIB',months:0,inc:false,ic:'🏦',hint:'sans échéance (laisse la date vide)'},
  {type:'qualification',title:'Qualifications et certifications (Qualibat, MASE, ISO…)',short:'Qualifications',months:12,inc:true,ic:'🏅',hint:'la date de fin du certificat'}];
const typeOf=t=>ENT_TYPES.find(x=>x.type===t)||null;
const hasFile=d=>!!(d&&(d.url||d.data));
/* liste : les types fixes (déposés ou non) puis les « autre » déposés */
export function entList(){const rows=regAll('entdoc').filter(d=>d&&!d.deleted);const L=ENT_TYPES.map(t=>{const d=rows.find(r=>r.id===t.type);return Object.assign({id:t.type,type:t.type,title:t.title,meta:t},d||{},{meta:t,missing:!hasFile(d)});});
  rows.filter(r=>!typeOf(r.id)).sort((x,y)=>String(x.title||'').localeCompare(String(y.title||''),'fr')).forEach(r=>L.push(Object.assign({meta:{type:'autre',short:r.title||'Autre',ic:'📄',months:12,inc:false,hint:'la date de fin de validité'}},r,{missing:!hasFile(r)})));return L;}
export const entGet=id=>{const d=regGet('entdoc',id);return d&&!d.deleted?d:null;};
/* état d'un document : manquant · expiré · expire bientôt (≤ 30 j) · valide · sans échéance ; ref = date de remise de l'offre (contrôle « expire avant la remise ») */
export function entState(d,ref){if(!d||!hasFile(d))return {k:'miss',sev:'todo',t:'à déposer'};const today=todayIso();if(!d.validUntil)return {k:'ok',sev:'ok',t:'déposé · sans échéance'};
  const j=days(today,d.validUntil);if(j<0)return {k:'exp',sev:'bad',t:'expiré le '+dFR(d.validUntil),j};if(ref&&ref>today&&d.validUntil<ref)return {k:'ref',sev:'warn',t:'expire avant la remise ('+dFR(d.validUntil)+')',j};
  if(j<=30)return {k:'soon',sev:'warn',t:'expire le '+dFR(d.validUntil)+' (J-'+j+')',j};return {k:'ok',sev:'ok',t:'valide jusqu\'au '+dFR(d.validUntil),j};}
export function entStats(){const L=entList();const S={ok:0,soon:0,exp:0,miss:0,L};L.forEach(d=>{const s=entState(d);if(s.k==='miss')S.miss++;else if(s.k==='exp')S.exp++;else if(s.k==='soon')S.soon++;else S.ok++;});return S;}
const canEnt=(me,ctx)=>!!me&&!ctx.viewing()&&(me.admin||ctx.can('affaires.edit')); /* déposer : administrateur et bureau (chargés d'affaires, commercial, administratif et financier, direction) — le serveur : administrateur / rôles chef et bureau */
const seesEnt=(me,ctx)=>!!me&&(me.admin||ctx.can('affaires.view')||ctx.can('dossier.edit')||ctx.can('qse.manage'));
async function fileToStore(api,folder,f){let url=null,data=null;try{url=api&&api.sync&&api.sync.uploadDoc?await api.sync.uploadDoc('entreprise',folder,f.name,f):null;}catch(e){url=null;}
  if(!url){if(f.size>1.5*1024*1024)return {err:'trop gros pour être gardé hors connexion ('+nb(f.size/1048576,1)+' Mo) : reconnecte-toi pour l\'envoyer au stockage'};data=await new Promise(res=>{const r=new FileReader();r.onload=()=>res(r.result);r.onerror=()=>res(null);r.readAsDataURL(f);});if(!data)return {err:'fichier illisible'};}
  return {url,data};}
function entModal(id,api,ctx,isNew){const d=entGet(id)||{};const t=typeOf(id)||{type:'autre',title:d.title||'',short:d.title||'Autre document',months:12,hint:'la date de fin de validité'};const ins=!!t.ins;
  const sug=t.months?addMonths(todayIso(),t.months):'';
  api.openModal(`<h3 style="margin-top:0">${esc(isNew?'Autre document de l\'entreprise':t.title)}</h3><div class="hint" style="margin:0 0 6px">Déposé une fois, il se joint aux offres (7 · Offre → Documents obligatoires). Date de validité : ${esc(t.hint||'')} — alerte 30 jours avant.</div>
    ${t.type==='autre'?`<label class="f">Intitulé</label><input class="f" id="ed-title" value="${esc(d.title||'')}" placeholder="ex. Attestation CIBTP, liste des salariés étrangers…">`:''}
    <label class="f">Fichier <span class="dim">(PDF ou photo)${hasFile(d)?' · actuel : '+esc(d.file||'fichier'):''}</span></label><input class="f" type="file" id="ed-file" accept=".pdf,application/pdf,image/*">
    <label class="f">Valide jusqu'au</label><input class="f" type="date" id="ed-valid" value="${esc(d.validUntil||(hasFile(d)?'':sug))}">
    ${ins?`<div class="row" style="display:flex;gap:6px;flex-wrap:wrap"><div style="flex:1;min-width:140px"><label class="f">Assureur</label><input class="f" id="ed-ass" value="${esc(d.assureur||'')}"></div><div style="flex:1;min-width:140px"><label class="f">N° de police</label><input class="f" id="ed-pol" value="${esc(d.police||'')}"></div></div>
    <label class="f">Garanties <span class="dim">(montants : servent au mémoire technique)</span></label><textarea class="f" id="ed-gar" style="min-height:70px" placeholder="ex. RC exploitation : … € par sinistre">${esc(d.garanties||'')}</textarea>`:''}
    <div class="actions" style="margin-top:8px"><button class="btn primary block" id="ed-ok">Enregistrer</button><button class="btn block" data-close>Annuler</button></div>`);
  const fe=document.getElementById('ed-file');if(fe)fe.onchange=()=>{const v=document.getElementById('ed-valid');if(v&&!v.value&&sug)v.value=sug;};
  document.getElementById('ed-ok').onclick=async()=>{const g=k=>(document.getElementById(k)||{}).value||'';const f=fe&&fe.files&&fe.files[0];const title=t.type==='autre'?g('ed-title').trim():t.title;
    if(t.type==='autre'&&!title){say('L\'intitulé du document');return;}if(!f&&!hasFile(d)){say('Choisis le fichier (PDF ou photo)');return;}
    const ok=document.getElementById('ed-ok');ok.disabled=true;ok.textContent='Enregistrement…';const now=new Date().toISOString();
    const patch={type:t.type,title,validUntil:g('ed-valid')||null,at:now,by:who(),deleted:null,deletedAt:null,deletedBy:null};if(ins){patch.assureur=g('ed-ass').trim()||null;patch.police=g('ed-pol').trim()||null;patch.garanties=g('ed-gar').trim()||null;}
    if(f){const r=await fileToStore(api,'entdocs',f);if(r.err){ok.disabled=false;ok.textContent='Enregistrer';say(r.err);return;}
      if(hasFile(d))patch.prev=[{file:d.file||null,url:d.url||null,validUntil:d.validUntil||null,at:d.at||null,by:d.by||null}].concat(d.prev||[]).slice(0,5);
      Object.assign(patch,{file:f.name,url:r.url||null,data:r.data||null,size:f.size,mime:f.type||null});}
    const rid=isNew?'autre_'+safe(title).toLowerCase().slice(0,30)+'_'+Date.now().toString(36):id;regSet('entdoc',rid,patch);api.closeModal();say((isNew?'Document ajouté':'Document enregistré')+(patch.validUntil?' · valide jusqu\'au '+dFR(patch.validUntil):''));if(ctx&&ctx.render)ctx.render();};}
/* ouvrir / télécharger un fichier : adresse du stockage, sinon data URL (blob) */
function openUrlOrData(url,data,name){if(url){window.open(url,'_blank','noopener');return;}if(!data)return;try{const m=/^data:([^;,]*)(;base64)?,(.*)$/.exec(data);const bin=m[2]?atob(m[3]):decodeURIComponent(m[3]);const u8=new Uint8Array(bin.length);for(let i=0;i<bin.length;i++)u8[i]=bin.charCodeAt(i);download(new Blob([u8],{type:m[1]||'application/octet-stream'}),name||'document');}catch(e){console.warn(e);}}
function download(blob,name){const u=URL.createObjectURL(blob);const l=document.createElement('a');l.href=u;l.download=name;document.body.appendChild(l);l.click();setTimeout(()=>{URL.revokeObjectURL(u);l.remove();},2500);}
function entView(me,ctx){lotDCss();const ed=canEnt(me,ctx);const L=entList();const S=entStats();const kpi=(v,l,k)=>`<div class="eq-kpi ${k||''}"><b>${v}</b><small>${esc(l)}</small></div>`;
  const pend=regPending().filter(w=>w.kind==='entdoc').length;const srv=ctx.api&&ctx.api.state&&ctx.api.state.cloudUser;
  const row=d=>{const s=entState(d);const t=d.meta||{};const X=[];if(hasFile(d))X.push(esc(d.file||'fichier')+(d.at?' · déposé le '+dFR(d.at)+(d.by?' par '+esc(d.by):''):''));if(d.assureur||d.police)X.push(esc([d.assureur,d.police?'police '+d.police:''].filter(Boolean).join(' · ')));
    return `<div class="dob-erow ${s.sev}" data-ent="${esc(d.id)}"><div class="dob-eh"><span class="dob-ic">${t.ic||'📄'}</span><span class="tx"><b>${esc(d.title||t.title||d.id)}</b><small>${X.join('<br>')||esc(t.hint?'Date : '+t.hint:'')}</small>${d.garanties?`<div class="dob-gar">${esc(d.garanties)}</div>`:''}</span><span class="dob-st ${s.sev}">${esc(s.t)}</span></div>
      <div class="dob-ra">${hasFile(d)?`<button class="btn sm" data-act="x" data-v="${ID}|open|${esc(d.id)}">⤓ Ouvrir</button>`:''}${ed?`<button class="btn sm${hasFile(d)?'':' primary'}" data-act="x" data-v="${ID}|edit|${esc(d.id)}">${hasFile(d)?'📎 Remplacer / ✎ dates':'📎 Déposer'}</button>${hasFile(d)?`<button class="btn sm" data-act="x" data-v="${ID}|rm|${esc(d.id)}" style="color:#9b2c22" title="Retirer le document">✕</button>`:''}`:''}${(d.prev||[]).length?`<span class="hint">${d.prev.length} ancienne${d.prev.length>1?'s':''} version${d.prev.length>1?'s':''}</span>`:''}</div></div>`;};
  return `<h2 class="vt">Documents administratifs de l'entreprise <span class="hint">· déposés une fois, joints aux offres</span></h2>
    <div class="eq-kpis">${kpi(S.ok,'valides',S.ok?'ok':'')}${kpi(S.soon,'à renouveler (≤ 30 j)',S.soon?'warn':'ok')}${kpi(S.exp,'expirés',S.exp?'bad':'ok')}${kpi(S.miss,'à déposer',S.miss?'warn':'ok')}</div>
    ${pend&&srv?`<div class="warnbox" style="margin:0 0 8px">${pend} document${pend>1?'s':''} pas encore enregistré${pend>1?'s':''} sur le serveur : passe le SQL <b>sql/retours_14-10b.sql</b> (registre « entdoc »), ils partiront tout seuls.</div>`:''}
    ${ed?'':'<div class="hint" style="margin:0 0 8px">Consultation : le dépôt est réservé à l\'administrateur et au bureau.</div>'}
    ${L.map(row).join('')}
    ${ed?`<div class="eq-acts" style="margin-top:8px"><button class="btn" data-act="x" data-v="${ID}|new|">＋ Autre document (CIBTP, liste des salariés étrangers…)</button></div>`:''}
    <div class="hint" style="margin-top:8px">Ils apparaissent dans chaque affaire (7 · Offre → Documents obligatoires) avec leur état à la date de remise, et partent dans le dossier de remise (.zip). Alerte 30 jours avant l'échéance dans « À faire ». Les garanties d'assurance servent au mémoire technique.</div>`;}
/* ═════════ 2 · LA LISTE DES PIÈCES À REMETTRE (affaire) ═════════ */
/* formulaires du DCE : repérés par le nom de la pièce (et le dossier du zip) ; DPGF, plans, profils, archives, mails : jamais (la DPGF est une « pièce produite ») */
export const FORMS=[['ae','Acte d\'engagement (AE)',/acte.{0,3}d.{0,3}engagement|(^|[^a-z0-9])a\.?e([^a-z0-9]|$)|attri ?1/i],['annexe','Annexe à l\'acte d\'engagement',/annexe.{0,12}(a\.?e\b|acte|financi)/i],['dc1','DC1 — lettre de candidature',/(^|[^a-z0-9])dc ?1([^0-9]|$)|lettre de candidature/i],['dc2','DC2 — déclaration du candidat',/(^|[^a-z0-9])dc ?2([^0-9]|$)|d[ée]claration du candidat/i],['dc4','DC4 — déclaration de sous-traitance',/(^|[^a-z0-9])dc ?4([^0-9]|$)|d[ée]claration de sous.?trait/i],['dume','DUME',/(^|[^a-z0-9])dume([^a-z0-9]|$)|document unique de march/i],['cadre','Cadre de réponse technique',/cadre.{0,4}(de )?r[ée]ponse|cadre.{0,6}m[ée]moire|questionnaire|trame.{0,6}m[ée]moire|m[ée]moire.{0,14}(cadre|trame)|cadre technique/i],['visite','Attestation de visite',/(attestation|certificat|bon).{0,6}(de )?visite|visite.{0,12}(obligatoire|de site|des lieux)/i],['honneur','Attestation sur l\'honneur',/sur l.?honneur/i],['formulaire','Formulaire à remplir',/formulaire|[àa] (compl[ée]ter|remplir|retourner|signer)/i]];
const FORM_LAB=Object.fromEntries(FORMS.map(f=>[f[0],f[1]]));const PRICED=['ae','annexe']; /* le montant y figure : à refaire quand le prix change d'une version à l'autre */
const NOFORM=['dpgf','plans','profils','archive','planning','facturation'];
export function formType(d){if(!d||d.archive||d.text!==undefined||d.ver)return null;const c=catOf(d);if(NOFORM.includes(c))return null;const s=String(d.name||'').replace(/\.[a-z0-9]{2,5}$/i,'')+' '+String(d.path||'').split('/').slice(0,-1).join(' ');const hit=FORMS.find(f=>f[2].test(s));if(hit)return hit[0];if(c==='ae')return 'ae';if(c==='memoire')return 'cadre';return null;}
const PROD=[['dpgf','DPGF / BPU remplie','6 · DPGF'],['memoire','Mémoire technique','5 · Mémoire'],['planning','Planning d\'exécution',''],['variante','Variante : chiffrage et note','']];
export function obligOf(a){return ((a&&a.offre)||{}).oblig||{};}
/* toutes les lignes : {key, grp:'form'|'ent'|'prod'|'autre', label, inc, off, st:{sev,t}, file, doc, ent} */
export function obligItems(a){const O=obligOf(a);const I=O.items||{};const cur=a.chiffrageV||1;let C=null;try{C=calcAffaire(a);}catch(e){}const tot=Math.round(((C&&C.total)||0));const ref=a.dateReponse||null;
  const incOf=(key,def)=>{const it=I[key]||{};return it.inc===undefined?def:!!it.inc;};
  const fileSt=(it,priced,form)=>{const f=it.file;if(!f)return null;const old=priced&&f.v&&+f.v!==+cur&&Math.abs((+f.total||0)-tot)>=1;return old?{sev:'warn',t:'déposé pour la v'+f.v+' ('+eur(f.total)+') : à refaire, v'+cur+' = '+eur(tot)}:{sev:'ok',t:(form?'complété · ':'')+'déposé le '+dFR(f.at)+(f.v?' (v'+f.v+')':'')};};
  const forms=[],ign=[];docsOf(a).filter(d=>!d.superseded).forEach(d=>{const key='f:'+d.id;const it=I[key]||{};const t=formType(d)||(it.force?'formulaire':null);if(!t)return;const o={key,grp:'form',type:t,label:FORM_LAB[t]||'Formulaire',doc:d,it,file:it.file||null,off:!!it.off};
    o.st=fileSt(it,PRICED.includes(t),true)||{sev:'todo',t:'à remplir'};o.inc=!o.off&&incOf(key,true);(o.off?ign:forms).push(o);});
  const ent=entList().map(e=>{const key='e:'+e.id;const s=entState(e,ref);return {key,grp:'ent',label:(e.meta&&e.meta.short)||e.title,ent:e,it:I[key]||{},st:s.k==='miss'?{sev:'todo',t:'à déposer (SCR → Documents administratifs)'}:s,inc:incOf(key,!!(e.meta&&e.meta.inc))};});
  const S=stepState(a);const D=a.dpgf||{};const L=(D.lignes||[]).filter(l=>!l.section);const M=a.memoire||{};const variante=/autoris|impos/.test(String((a.consult||{}).variante||''));
  const prod=PROD.filter(p=>p[0]!=='variante'||variante||(I['p:variante']||{}).file).map(([k,l,tab])=>{const key='p:'+k;const it=I[key]||{};let st;
    if(k==='dpgf')st=it.file?fileSt(it,true):!L.length?{sev:'todo',t:'pas encore importée (6 · DPGF)'}:S.dpgf?{sev:'ok',t:'remplie · total = prix de vente'}:{sev:'warn',t:'écart avec le prix de vente ou PU manquants'};
    else if(k==='memoire')st=it.file?fileSt(it,false):S.memoire?{sev:'ok',t:'prêt (généré en Word)'}:((M.sections||[]).length||M.lib)?{sev:'warn',t:'en cours (5 · Mémoire)'}:{sev:'todo',t:'à rédiger (5 · Mémoire)'};
    else st=fileSt(it,k==='variante')||{sev:'todo',t:'à déposer'};
    return {key,grp:'prod',type:k,label:l,tab,it,file:it.file||null,st,inc:incOf(key,k!=='variante')};});
  const custom=(O.custom||[]).map(c=>{const key='c:'+c.id;const it=I[key]||{};return {key,grp:'autre',label:c.label,cid:c.id,it,file:it.file||null,st:fileSt(it,false)||{sev:'todo',t:'à déposer'},inc:incOf(key,true)};});
  const all=forms.concat(ent,prod,custom);return {forms,ign,ent,prod,custom,all,cur,tot};}
const ready=x=>x.st&&x.st.sev==='ok';
/* aide-mémoire de la liste de contrôle historique (6 cases de 7 · Offre) */
export function obligHint(a,k,R0){try{const R=R0||obligItems(a);if(k==='ae'){const f=R.forms.filter(x=>x.type==='ae');if(!f.length)return '';return f.every(ready)?'AE complété déposé ✓':'AE repéré dans le DCE : à remplir et déposer (Documents obligatoires)';}
  if(k==='attest'){const E=R.ent.filter(x=>x.inc);return E.length?E.filter(ready).length+' / '+E.length+' documents administratifs valides':'';}
  if(k==='planning'){const p=R.prod.find(x=>x.type==='planning');return p&&p.file?'planning déposé ✓':'';}}catch(e){console.warn(e);}return '';}
function rowHTML(a,x,ro){const d=x.doc;const f=x.file;const btn=(v,l,t,cls)=>`<button class="btn sm${cls?' '+cls:''}" data-act="af" data-v="${v}"${t?` title="${esc(t)}"`:''}>${l}</button>`;const acts=[];
  if(x.grp==='form'&&d)acts.push(d.url?`<a class="btn sm" href="${esc(d.url)}" target="_blank" rel="noopener" title="Télécharger l'original pour le remplir">⤓ Original</a>`:btn('oborig|'+d.id,'⤓ Original','Télécharger l\'original pour le remplir'));
  if(x.grp==='ent'){if(hasFile(x.ent))acts.push(btn('obent|'+x.ent.id,'⤓ Ouvrir'));acts.push(`<button class="btn sm" data-act="xgo" data-v="x:${ID}:ent" title="Déposer ou renouveler (une fois pour toutes les affaires)">🗂 Documents administratifs</button>`);}
  if(x.grp==='prod'&&x.tab&&!ro)acts.push(btn('tab|'+(x.type==='dpgf'?'dpgf':'memoire'),'↗ '+x.tab));
  if(x.grp!=='ent'){if(f)acts.push(btn('obget|'+x.key,'⤓ '+(x.grp==='form'?'Complété':'Déposé'),f.name));if(!ro)acts.push(btn('obfile|'+x.key,f?'📎 Remplacer':(x.grp==='form'?'📎 Déposer le complété':'📎 Déposer'),x.grp==='form'?'La version remplie / signée (PDF, Word, scan)':'',f?'':'primary'));if(f&&!ro)acts.push(btn('obunfile|'+x.key,'✕','Retirer le dépôt','dob-x'));}
  if(x.grp==='form'&&!ro)acts.push(btn('oboff|'+x.key,'🚫','Pas à remettre (ce n\'est pas un formulaire de cette consultation)'));if(x.grp==='autre'&&!ro)acts.push(btn('obcrm|'+x.cid,'🗑','Retirer cette pièce de la liste'));
  const fn=f?esc(f.name)+(f.url?'':' <span title="Pas encore au serveur : redépose-le connecté pour le partager">· 📱 sur cet appareil</span>'):'';
  const sub=x.grp==='form'?esc(d.name)+(f?' → '+fn:''):x.grp==='ent'?esc(x.ent.title||'')+(x.ent.file?' · '+esc(x.ent.file):''):x.grp==='prod'&&x.type==='memoire'?'généré depuis 5 · Mémoire (Word)'+(f?' + '+fn:''):x.grp==='prod'&&x.type==='dpgf'?'générée depuis 6 · DPGF (Excel du client, sinon CSV)'+(f?' + '+fn:''):f?fn:'pièce à joindre (PDF, Word, Excel…)';
  return `<div class="dob-row ${x.inc?'':'off'}" data-key="${esc(x.key)}"><div class="dob-rh"><label class="dob-inc" title="Dans la remise (dossier .zip)"><input type="checkbox" data-act="af" data-v="obinc|${esc(x.key)}" ${x.inc?'checked':''} ${ro?'disabled':''}></label><span class="tx"><b>${esc(x.label)}</b><small>${sub}</small></span><span class="dob-st ${x.st.sev}" title="${esc(x.st.t)}">${esc(x.st.t)}</span></div>${acts.length?`<div class="dob-ra">${acts.join('')}</div>`:''}</div>`;}
export function docsObligHTML(a,canEdit,ctx,R0){lotDCss();const ro=!canEdit;const R=R0||obligItems(a);const inc=R.all.filter(x=>x.inc);const okN=inc.filter(ready).length;const bad=inc.filter(x=>x.st.sev==='bad').length;
  const others=docsOf(a).filter(d=>!d.superseded&&!d.archive&&d.text===undefined&&!d.ver&&!R.forms.some(x=>x.doc.id===d.id)&&!R.ign.some(x=>x.doc.id===d.id));
  return `<div class="card dob-card" id="dob-offre"><h3>📋 Documents obligatoires <span class="hint">· ce qui part avec l'offre : formulaires du DCE complétés, documents de l'entreprise, pièces produites</span></h3>
    <div class="dob-kpis"><span class="dob-kpi">${inc.length} pièce${inc.length>1?'s':''} dans la remise</span><span class="dob-kpi ${okN===inc.length&&inc.length?'ok':'warn'}">${okN} prête${okN>1?'s':''}</span>${inc.length-okN?`<span class="dob-kpi ${bad?'bad':'warn'}">${inc.length-okN} à faire</span>`:''}${ctx&&ctx.vview?'<span class="dob-kpi">état figé avec la v'+ctx.vview.v+'</span>':''}</div>
    <div class="eq-lab">Formulaires du DCE à remplir · ${R.forms.length}</div>${R.forms.length?R.forms.map(x=>rowHTML(a,x,ro)).join(''):`<div class="eq-s">Aucun formulaire repéré dans les pièces du dossier (acte d'engagement, DC1, DC2, DUME, cadre de réponse, attestation de visite…)${docsOf(a).length?'':' : dépose le DCE dans 1 · Dossier'}.</div>`}
    ${!ro&&others.length?`<div class="eq-acts" style="margin-top:6px"><select class="f" id="dob-force" style="flex:1;min-width:160px;margin:0"><option value="">une autre pièce du dossier est un formulaire…</option>${others.map(d=>`<option value="${esc(d.id)}">${esc(d.name)}</option>`).join('')}</select><button class="btn sm" data-act="af" data-v="obforce|">＋ Formulaire</button></div>`:''}
    ${R.ign.length?`<details class="dob-ign"><summary>Pièces écartées (pas à remettre) · ${R.ign.length}</summary>${R.ign.map(x=>`<div class="dob-row off"><div class="dob-rh"><span class="tx"><b>${esc(x.doc.name)}</b><small>repérée comme « ${esc(x.label)} »</small></span>${ro?'':`<button class="btn sm" data-act="af" data-v="oboff|${esc(x.key)}">↺ Remettre</button>`}</div></div>`).join('')}</details>`:''}
    <div class="eq-lab">Documents administratifs de l'entreprise · ${R.ent.filter(x=>x.inc).length} dans la remise</div>${R.ent.map(x=>rowHTML(a,x,ro)).join('')}
    <div class="eq-lab">Pièces produites</div>${R.prod.map(x=>rowHTML(a,x,ro)).join('')}
    <div class="eq-lab">Autres pièces</div>${R.custom.map(x=>rowHTML(a,x,ro)).join('')||'<div class="eq-s">Références, certificats de capacité, note sur les moyens…</div>'}${ro?'':`<div class="eq-acts" style="margin-top:6px"><button class="btn sm" data-act="af" data-v="obadd|">＋ Autre pièce à remettre</button></div>`}
    <div class="dob-foot"><button class="btn primary" data-act="af" data-v="obzip|" title="Les pièces cochées, complétées, dans un .zip à déposer sur la plateforme">📦 Dossier de remise${ctx&&ctx.vview?' de la v'+ctx.vview.v:''} (.zip)</button><button class="btn" data-act="af" data-v="obprint|">🖨 Bordereau des pièces</button></div>
    <div class="hint" style="margin-top:6px">⤓ télécharge l'original à remplir, 📎 dépose la version complétée / signée ; la case = « dans la remise ». Un acte d'engagement déposé pour une version précédente est signalé quand le prix a changé. Les documents administratifs (assurances, Kbis, URSSAF…) se déposent une fois dans SCR → Documents administratifs.</div></div>`;}
/* ═════════ 3 · ACTIONS (data-act="af" data-v="ob…|…", via commerceAct) ═════════ */
function setOblig(num,fn){const a=affGet(num);if(!a)return;const O=JSON.parse(JSON.stringify(obligOf(a)));O.items=O.items||{};fn(O);affSet(num,{offre:Object.assign({},a.offre||{},{oblig:O})});}
const itemSet=(O,key,p)=>{O.items[key]=Object.assign({},O.items[key]||{},p);};
let PICK=null;
function pickFile(onFile,accept){if(PICK)PICK.remove();const inp=PICK=document.createElement('input');inp.type='file';inp.id='dob-pick';if(accept)inp.accept=accept;inp.style.display='none';document.body.appendChild(inp);
  inp.addEventListener('change',()=>{const f=inp.files&&inp.files[0];inp.remove();if(PICK===inp)PICK=null;if(f)onFile(f);});try{inp.click();}catch(e){}}
async function depositFile(num,key,f,ctx){const a=affGet(num);if(!a)return;let C=null;try{C=calcAffaire(a);}catch(e){}const rec={id:newId('F'),name:f.name,size:f.size,type:f.type||'',at:new Date().toISOString(),by:who(),v:a.chiffrageV||1,total:Math.round((C&&C.total)||0)};
  try{const ok=await A.kv.set('trace:affdoc:'+rec.id,f);if(ok)rec.local=true;}catch(e){}
  if(f.size<=50*1048576){try{const url=A.sync&&A.sync.uploadDoc?await A.sync.uploadDoc('aff_'+String(num).replace(/[^A-Za-z0-9_-]/g,'_'),'offre',f.name,f):null;if(url)rec.url=url;}catch(e){}}
  if(!rec.url&&!rec.local){say('Fichier ni envoyé ni gardé sur cet appareil : réessaie');return;}
  setOblig(num,O=>{const it=O.items[key]||{};const prev=it.file?[it.file].concat(it.prev||[]).slice(0,5):(it.prev||[]);itemSet(O,key,{file:rec,prev,inc:it.inc===undefined?true:it.inc});});
  say('Déposé : '+f.name+(rec.url?'':' · sur cet appareil'));if(ctx&&ctx.render)ctx.render();}
async function fileBlob(rec){if(!rec)return null;try{const b=await A.kv.get('trace:affdoc:'+rec.id);if(b instanceof Blob)return b;}catch(e){}if(rec.url){try{const r=await fetch(rec.url);if(r.ok)return await r.blob();}catch(e){console.warn(e);}}return null;}
async function entBlob(e){if(!e)return null;if(e.data){try{const r=await fetch(e.data);return await r.blob();}catch(x){console.warn(x);}}if(e.url){try{const r=await fetch(e.url);if(r.ok)return await r.blob();}catch(x){console.warn(x);}}return null;}
export function obligAct(k,arg,arg2,arg3,a,ctx){if(!/^ob[a-z]*$/.test(k))return false;const canEdit=ctx.canEdit;const render=()=>{if(ctx.render)ctx.render();};const R=()=>obligItems(affGet(a.num)||a);
  switch(k){
    case 'obinc':{if(!canEdit)return true;const x=R().all.find(y=>y.key===arg);if(!x)return true;setOblig(a.num,O=>itemSet(O,arg,{inc:!x.inc}));render();return true;}
    case 'oboff':{if(!canEdit)return true;setOblig(a.num,O=>{const it=O.items[arg]||{};itemSet(O,arg,{off:!it.off});});render();return true;}
    case 'obforce':{if(!canEdit)return true;const sel=document.getElementById('dob-force');const id=sel&&sel.value;if(!id){say('Choisis la pièce du dossier');return true;}setOblig(a.num,O=>itemSet(O,'f:'+id,{force:true,off:false}));render();return true;}
    case 'obadd':{if(!canEdit)return true;A.openModal(`<h3 style="margin-top:0">Autre pièce à remettre</h3><label class="f">Intitulé</label><input class="f" id="ob-lab" placeholder="ex. Références de travaux similaires, certificat de capacité…"><div class="actions" style="margin-top:8px"><button class="btn primary block" id="ob-ok">Ajouter</button><button class="btn block" data-close>Annuler</button></div>`);
      document.getElementById('ob-ok').onclick=()=>{const l=((document.getElementById('ob-lab')||{}).value||'').trim();if(!l){say('L\'intitulé');return;}setOblig(a.num,O=>{O.custom=(O.custom||[]).concat([{id:Date.now().toString(36),label:l}]);});A.closeModal();render();};return true;}
    case 'obcrm':{if(!canEdit)return true;if(!confirm('Retirer cette pièce de la liste ?'))return true;setOblig(a.num,O=>{O.custom=(O.custom||[]).filter(c=>c.id!==arg);delete O.items['c:'+arg];});render();return true;}
    case 'obfile':{if(!canEdit)return true;const num=a.num;pickFile(f=>depositFile(num,arg,f,ctx),'.pdf,.doc,.docx,.odt,.xls,.xlsx,.ods,.rtf,.png,.jpg,.jpeg,.zip');return true;}
    case 'obunfile':{if(!canEdit)return true;if(!confirm('Retirer la version déposée ? (l\'original du DCE reste)'))return true;setOblig(a.num,O=>{const it=O.items[arg]||{};if(it.file)itemSet(O,arg,{file:null,prev:[it.file].concat(it.prev||[]).slice(0,5)});});render();return true;}
    case 'obget':{const x=R().all.find(y=>y.key===arg);if(!x||!x.file)return true;if(x.file.url&&!x.file.local){window.open(x.file.url,'_blank','noopener');return true;}fileBlob(x.file).then(b=>{if(b)download(b,x.file.name);else say('Fichier introuvable sur cet appareil');});return true;}
    case 'oborig':{const d=docsOf(affGet(a.num)||a).find(y=>y.id===arg);if(!d)return true;docBlob(d).then(b=>{if(b)download(b,d.name);else say('Original introuvable sur cet appareil : ouvre-le depuis 1 · Dossier');});return true;}
    case 'obent':{const e=entGet(arg);if(e)openUrlOrData(e.url,e.data,e.file||e.title);return true;}
    case 'obzip':{remiseZip(affGet(a.num)||a).catch(e=>{console.warn(e);say('Dossier de remise impossible : '+(e.message||e));});return true;}
    case 'obprint':{const w=window.open('','_blank');if(!w){say('Autorise les fenêtres pour imprimer');return true;}w.document.write(bordereauHTML(affGet(a.num)||a,null));w.document.close();return true;}
  }
  return false;}
/* ═════════ 4 · LE DOSSIER DE REMISE (.zip) ═════════ */
const GRP_DIR={form:'01_Formulaires',ent:'02_Entreprise',prod:'03_Pieces_produites',autre:'04_Autres_pieces'};
function bordereauHTML(a,Z){const R=obligItems(a);const inc=R.all.filter(x=>x.inc);const rows=inc.map((x,i)=>{const z=Z&&Z.map[x.key];return `<tr><td>${i+1}</td><td><b>${esc(x.label)}</b>${x.grp==='form'?'<br><small>'+esc(x.doc.name)+'</small>':''}</td><td>${z&&z.length?z.map(esc).join('<br>'):'<i>manquant</i>'}</td><td>${esc(x.st.t)}</td></tr>`;}).join('');
  return docHTML({title:'Bordereau des pièces — '+a.num,h1:'Bordereau des pièces de l\'offre',kicker:'Commerce · remise de l\'offre',sub:esc((a.nom||'')+(a.client?' · '+a.client:'')),meta:[['Affaire',esc(a.num)],['Version du chiffrage','v'+(a.chiffrageV||1)],['Prix de vente HT',eur(R.tot)],['Remise',a.dateReponse?dFR(a.dateReponse):'—']],
    body:`<table class="em"><tr><th>N°</th><th>Pièce</th><th>Fichier</th><th>État</th></tr>${rows||'<tr><td colspan="4">Aucune pièce cochée.</td></tr>'}</table>${Z&&Z.miss.length?'<p><b>Manquant dans le dossier :</b> '+Z.miss.map(esc).join(' · ')+'</p>':''}`,footLeft:esc(a.num)});}
async function dpgfXlsxBytes(a){const D=a.dpgf||{};if(!D.kept)return null;let file=null;try{file=await A.kv.get('trace:dpgf:'+a.num);}catch(e){}if(!file)return null; /* même écriture que « ⬇ Excel du client rempli » (commerce.js, dpgfXlsx) */
  const Z=await zipEntries(await file.arrayBuffer());const sheet=D.sheet||Object.keys(Z).find(x=>x==='xl/worksheets/sheet1.xml')||Object.keys(Z).filter(x=>/^xl\/worksheets\/sheet\d+\.xml$/.test(x)).sort()[0];if(!sheet||!Z[sheet])return null;
  let xml=await inflate(Z[sheet]);const cols=D.cols||{};let iP=cols.pu;const iT=cols.tot;const vals={};if(iP===undefined||iP<0){iP=Math.max(cols.qte||0,cols.des||0,cols.u||0)+1;if(D.hdrRow)vals[colName(iP+1)+D.hdrRow]='PU HT (SCR)';}
  (D.lignes||[]).forEach(l=>{if(l.section||!l.row)return;vals[colName(iP+1)+l.row]=Math.round((+l.pu||0)*100)/100;if(iT!==undefined&&iT>=0)vals[colName(iT+1)+l.row]=Math.round((+l.pu||0)*(+l.qte||0)*100)/100;});
  xml=setCellsXml(xml,vals);const rep={[sheet]:xml};if(Z['xl/workbook.xml']){let wx=await inflate(Z['xl/workbook.xml']);if(/<calcPr\b/.test(wx)){if(!/fullCalcOnLoad/.test(wx))wx=wx.replace(/<calcPr\b/,'<calcPr fullCalcOnLoad="1"');}else wx=wx.replace('</workbook>','<calcPr fullCalcOnLoad="1"/></workbook>');rep['xl/workbook.xml']=wx;}
  return {name:String(D.fichier||'DPGF.xlsx').replace(/\.xlsx$/i,'')+'_SCR.xlsx',u8:await rezip(Z,rep)};}
function memoireDocx(a){if(a&&a._vview&&!a._vwrap)return affWithVirtual(a,()=>memoireDocx(Object.assign({},a,{_vwrap:true}))); /* la partie synchrone (modèle du document) est faite sous la version consultée */try{if(memLib()&&memLibMode(a)==='lib')return memLibDocx(a,memoireVars(a),null);}catch(e){console.warn(e);}return null;}
function memoireWord(a){if(a&&a._vview&&!a._vwrap)return affWithVirtual(a,()=>memoireWord(Object.assign({},a,{_vwrap:true}))); /* version consultée : le mémoire de CETTE version */try{if(memLib()&&memLibMode(a)==='lib')return memLibDocHTML(a,memoireVars(a),{word:true});}catch(e){console.warn(e);}if(((a.memoire||{}).sections||[]).length)return memoireDocHTML(a);return null;}
let LAST=null;export const lastZip=()=>LAST;
export async function remiseZip(a){const R=obligItems(a);const inc=R.all.filter(x=>x.inc);const files={};const map={};const miss=[];const n={form:0,ent:0,prod:0,autre:0};say('Préparation du dossier de remise…');
  const put=async(x,name,blobOrU8)=>{if(!blobOrU8)return false;const u8=blobOrU8 instanceof Uint8Array?blobOrU8:new Uint8Array(await blobOrU8.arrayBuffer());n[x.grp]++;const dir=GRP_DIR[x.grp];let p=dir+'/'+pad(n[x.grp])+'_'+safe(name);let i=2;while(files[p])p=dir+'/'+pad(n[x.grp])+'_'+(i++)+'_'+safe(name);files[p]=u8;(map[x.key]=map[x.key]||[]).push(p);return true;};
  for(const x of inc){let ok=false;
    if(x.grp==='ent'){if(hasFile(x.ent)){const b=await entBlob(x.ent);const ext=(String(x.ent.file||'').match(/\.[a-z0-9]{2,5}$/i)||['.pdf'])[0];ok=await put(x,(x.label||x.ent.title)+ext,b);}}
    else if(x.grp==='prod'&&x.type==='memoire'){if(x.file)ok=await put(x,x.file.name,await fileBlob(x.file));let dx=null;try{dx=await memoireDocx(a);}catch(e){console.warn(e);}if(dx){await put(x,'Memoire_technique_'+a.num+'.docx',dx);ok=true;}else{const h=memoireWord(a);if(h){await put(x,'Memoire_technique_'+a.num+'.doc',strToU8('﻿'+h));ok=true;}}}
    else if(x.grp==='prod'&&x.type==='dpgf'){if(x.file)ok=await put(x,x.file.name,await fileBlob(x.file));if(((a.dpgf||{}).lignes||[]).length){let X=null;if(isXlDpgf(a)){try{const R=await buildDossier(a);if(R&&R.bytes)X={name:R.name,u8:R.bytes};}catch(e){console.warn(e);}} /* grille du lot C (saisies, lignes insérées, formules) ; sinon l'ancienne écriture des PU */if(!X)try{X=await dpgfXlsxBytes(a);}catch(e){console.warn(e);}if(X){await put(x,X.name,X.u8);ok=true;}else{await put(x,'DPGF_'+a.num+'.csv',strToU8(dpgfCSV(a)));ok=true;}}}
    else if(x.file)ok=await put(x,x.file.name,await fileBlob(x.file));
    if(!ok)miss.push(x.label+(x.grp==='form'?' ('+x.doc.name+')':''));}
  const Z={map,miss};files['00_Bordereau_des_pieces.html']=strToU8(bordereauHTML(a,Z));
  const z=zipSync(files,{level:6});const name='Offre_'+safe(a.num)+'_v'+(a.chiffrageV||1)+'_'+todayIso()+'.zip';download(new Blob([z],{type:'application/zip'}),name);
  LAST={name,files:Object.keys(files).sort(),miss,size:z.length};say('📦 '+name+' · '+(Object.keys(files).length-1)+' fichier'+(Object.keys(files).length>2?'s':'')+(miss.length?' · '+miss.length+' manquant'+(miss.length>1?'s':'')+' (voir le bordereau)':''));return LAST;}
/* ═════════ 5 · LE MODULE BRANCHÉ (SCR → Documents de l'entreprise ; « À faire ») ═════════ */
function hook(){try{if(typeof window!=='undefined'&&window.TRACE&&!window.TRACE.docsOblig)window.TRACE.docsOblig={ent:entList,state:entState,items:a=>obligItems(a),zip:a=>remiseZip(a),lastZip,formType};}catch(e){}} /* tests */
function tasks(me,ctx){hook();if(!canEnt(me,ctx))return [];const L=entList().filter(d=>hasFile(d));const W=L.map(d=>({d,s:entState(d)})).filter(x=>x.s.k==='exp'||x.s.k==='soon');if(!W.length)return [];const bad=W.filter(x=>x.s.k==='exp');
  const t=W.length===1?(W[0].d.meta.short||W[0].d.title)+(W[0].s.k==='exp'?' expiré':' expire dans '+W[0].s.j+' jour'+(W[0].s.j>1?'s':'')):W.length+' documents administratifs à renouveler';
  return [{act:true,sev:bad.length?'bad':'warn',ic:'🗂',t,s:W.map(x=>(x.d.meta.short||x.d.title)+' : '+x.s.t).join(' · ')+' — dépose le nouveau (joint aux offres)',when:bad.length?'expiré':'J-'+Math.min(...W.map(x=>x.s.j)),kl:'Documents administratifs',kv:W.length+' à renouveler',go:()=>ctx.go('x:'+ID+':ent')}];}
export default {id:ID,kinds:['entdoc'],hub:'entreprise',
  hubRows(tab,me,ctx){hook();lotDCss();if(tab!=='entreprise'||!seesEnt(me,ctx))return [];const S=entStats();const n=S.exp+S.soon;
    return [ctx.row('Documents administratifs (offres)','Assurances RC et décennale, Kbis, URSSAF, attestation fiscale, RIB, qualifications — déposés une fois, joints aux offres','🗂','#e8f0fb','x:'+ID+':ent',n?n+' à renouveler':(S.miss?S.miss+' à déposer':null),n?(S.exp?'bad':''):'')];},
  xview(k,me,ctx){hook();if(k==='ent')return seesEnt(me,ctx)?entView(me,ctx):'<div class="card"><div class="eq-s">Pas d\'accès aux documents administratifs.</div></div>';return null;},
  tasks,
  act(v,el,me,ctx){const i=v.indexOf('|');const k=i<0?v:v.slice(0,i);const arg=i<0?'':v.slice(i+1);const api=ctx.api||A;
    if(k==='open'){const e=entGet(arg);if(e)openUrlOrData(e.url,e.data,e.file||e.title);return;}
    if(!canEnt(me,ctx)){ctx.toast('Réservé à l\'administrateur et au bureau');return;}
    if(k==='edit'){entModal(arg,api,ctx,false);return;}
    if(k==='new'){entModal('',api,ctx,true);return;}
    if(k==='rm'){const e=entGet(arg);if(!e)return;if(!confirm('Retirer « '+(e.title||arg)+' » ? Il ne sera plus joint aux offres.'))return;regSet('entdoc',arg,{deleted:true,deletedAt:new Date().toISOString(),deletedBy:who()});ctx.toast('Document retiré');ctx.render();return;}}};
