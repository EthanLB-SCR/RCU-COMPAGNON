// tracerh.js — TRACÉ RESSOURCES HUMAINES (10/11/2026, demande d'Ethan) : un seul endroit pour tout ce qui est RH.
// Fédère ce qui existait déjà (navettes de paie, compteurs d'heures, grands déplacements, déclarations d'accident, habilitations) et ajoute
// quatre registres partagés : absences et congés (rhabs), contraventions (rhpv), plan de formation (rhform), mutuelle (rhmut).
// Droits : RH / direction / administrateur (rh.voir, rh.edit) voient et modifient tout ; chacun voit SON dossier (lecture). Serveur : sql/rh_1011.sql (à passer par Ethan).
import {regAll,regGet,regSet,regDelete,regLoad,regMissing} from './reg.js';
import {vehAll} from './flotte.js';
import {HAB_TYPES,cTableHabs,habsDe} from './espace.js';
let A=null;const ID='rh';
const esc=s=>String(s==null?'':s).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const todayIso=()=>{const d=new Date();return d.getFullYear()+'-'+String(d.getMonth()+1).padStart(2,'0')+'-'+String(d.getDate()).padStart(2,'0');};
const fDate=d=>d?String(d).slice(8,10)+'/'+String(d).slice(5,7)+'/'+String(d).slice(0,4):'';
const eur=n=>(Math.round(+n||0)).toLocaleString('fr-FR')+' €';
const uid=()=>Date.now().toString(36)+Math.random().toString(36).slice(2,6);
const nomDe=p=>p?((p.prenom||'')+' '+(p.nom||'')).trim()||p.id:'?';
/* ── droits ── */
const rhVoir=(me,ctx)=>!!me&&(me.admin||ctx.can('rh.voir')||ctx.can('rh.edit'));
const rhEdit=(me,ctx)=>!!me&&(me.admin||ctx.can('rh.edit'));
const keyOf=(p,ctx)=>p?(ctx.personKey?ctx.personKey(p):(p.email||p.id)).toLowerCase():'';
const mine=(r,me,ctx)=>!!me&&String(r.id||'').split('|')[0]===keyOf(me,ctx);
/* ── registres ── */
export const ABS_TYPES=[['cp','Congés payés'],['rtt','RTT'],['mal','Maladie'],['at','Arrêt accident du travail'],['ss','Sans solde'],['inj','Absence injustifiée'],['form','Formation'],['evt','Événement familial'],['autre','Autre']];
export const PV_STATUTS=[['recue','Reçue'],['designee','Conducteur désigné'],['payee','Payée'],['contestee','Contestée'],['classee','Classée']];
export const FORM_STATUTS=[['prevu','Prévue'],['fait','Faite'],['annule','Annulée']];
export const MUT_STATUTS=[['affilie','Affilié'],['dispense','Dispensé'],['attente','En attente de pièces'],['sortie','Sorti']];
export const MUT_REGIMES=[['isole','Isolé'],['duo','Duo'],['famille','Famille']];
export const MUT_MOTIFS=[['cdd','CDD / mission courte'],['conjoint','Couvert par le conjoint'],['autre','Autre couverture obligatoire'],['apprenti','Apprenti / temps très partiel'],['']];
/** nombre de jours ouvrés entre deux dates (lun → ven), fériés non déduits — la RH ajuste la valeur si besoin */
export function joursOuvres(d1,d2){if(!d1)return 0;const a=new Date(d1+'T12:00:00'),b=new Date((d2||d1)+'T12:00:00');if(isNaN(a)||isNaN(b)||b<a)return 0;let n=0;for(let t=new Date(a);t<=b;t.setDate(t.getDate()+1)){const w=t.getDay();if(w>=1&&w<=5)n++;}return n;}
/** acquisition de congés payés : 2,08 j ouvrés par mois travaillé (25 j / an) — hypothèse à confirmer par la RH */
export const CP_PAR_MOIS=2.08;
/** période de référence des congés : du 1er juin N-1 au 31 mai N */
export function periodeCP(d){const y=+String(d||todayIso()).slice(0,4),m=+String(d||todayIso()).slice(5,7);const y0=m>=6?y:y-1;return {du:y0+'-06-01',au:(y0+1)+'-05-31',label:(y0)+'-'+(y0+1)};}
export function soldeCP(abs,p,ref){const P=periodeCP(ref);const pris=abs.filter(a=>a.type==='cp'&&a.du>=P.du&&a.du<=P.au).reduce((s,a)=>s+(+a.jours||0),0);
  const deb=p&&p.entree&&p.entree>P.du?p.entree:P.du;const fin=ref&&ref<P.au?ref:P.au;const mois=Math.max(0,(+fin.slice(0,4)-+deb.slice(0,4))*12+(+fin.slice(5,7)-+deb.slice(5,7))+(+fin.slice(8,10)>=+deb.slice(8,10)?1:0));
  const acquis=Math.min(25,Math.round(mois*CP_PAR_MOIS*100)/100);return {acquis,pris,solde:Math.round((acquis-pris)*100)/100,periode:P};}
/** échéance de désignation du conducteur d'une contravention : 45 jours après réception */
export function pvEcheance(pv){if(!pv||!pv.recu)return null;const d=new Date(pv.recu+'T12:00:00');d.setDate(d.getDate()+45);return d.toISOString().slice(0,10);}
const DEF={
  rhabs:{t:'Absences et congés',ic:'🏖',one:'absence',fields:[['p','person','Personne'],['type','select','Type',ABS_TYPES],['du','date','Du'],['au','date','Au'],['jours','number','Jours ouvrés'],['note','text','Note']],
    label:r=>(ABS_TYPES.find(x=>x[0]===r.type)||['','?'])[1]+' · '+fDate(r.du)+(r.au&&r.au!==r.du?' → '+fDate(r.au):'')+' · '+(+r.jours||0)+' j',sort:(a,b)=>String(b.du).localeCompare(String(a.du))},
  rhpv:{t:'Contraventions',ic:'🚔',one:'contravention',fields:[['recu','date','Avis reçu le'],['date','date','Infraction le'],['veh','vehicle','Véhicule'],['p','person','Conducteur désigné'],['lieu','text','Lieu'],['infraction','text','Infraction'],['montant','number','Montant (€)'],['statut','select','Statut',PV_STATUTS],['note','text','Note']],
    label:r=>(r.infraction||'Contravention')+' · '+fDate(r.date||r.recu)+(r.vehImmat?' · '+r.vehImmat:'')+(r.montant?' · '+eur(r.montant):''),sort:(a,b)=>String(b.recu||b.date).localeCompare(String(a.recu||a.date))},
  rhform:{t:'Plan de formation',ic:'🎓',one:'formation',fields:[['p','person','Personne'],['titre','text','Formation'],['hab','select','Habilitation visée',()=>[['','—']].concat(Object.keys(HAB_TYPES).map(k=>[k,HAB_TYPES[k].label]))],['organisme','text','Organisme'],['du','date','Du'],['au','date','Au'],['heures','number','Heures'],['cout','number','Coût (€ HT)'],['statut','select','Statut',FORM_STATUTS],['note','text','Note']],
    label:r=>(r.titre||'Formation')+(r.du?' · '+fDate(r.du):'')+(r.organisme?' · '+r.organisme:''),sort:(a,b)=>String(b.du||'').localeCompare(String(a.du||''))},
  rhmut:{t:'Mutuelle',ic:'🩺',one:'ligne mutuelle',fields:[['p','person','Personne'],['statut','select','Statut',MUT_STATUTS],['regime','select','Régime',MUT_REGIMES],['effet','date','Date d\'effet'],['motif','select','Motif de dispense',MUT_MOTIFS.filter(x=>x[0]).concat([['','—']])],['bulletin','check','Bulletin d\'adhésion reçu'],['justif','check','Justificatif de dispense reçu'],['note','text','Note']],
    label:r=>(MUT_STATUTS.find(x=>x[0]===r.statut)||['','?'])[1]+(r.regime?' · '+(MUT_REGIMES.find(x=>x[0]===r.regime)||['',''])[1]:'')+(r.effet?' · depuis le '+fDate(r.effet):''),sort:(a,b)=>String(b.effet||'').localeCompare(String(a.effet||''))},
};
const KINDS=Object.keys(DEF);
let loaded=false;function hook(ctx){if(ctx&&ctx.api)A=ctx.api;if(!loaded){loaded=true;regLoad(KINDS.concat(['accident','cpth','vehicule'])).catch(()=>{});}
  try{if(typeof window!=='undefined'&&window.TRACE&&!window.TRACE.rh)window.TRACE.rh={rows:kind=>rows(kind),solde:(abs,p,ref)=>soldeCP(abs,p,ref),jours:joursOuvres,pvEch:pvEcheance,def:()=>DEF};}catch(e){}}
const rows=kind=>regAll(kind).filter(r=>r&&!r.deleted).sort(DEF[kind].sort);
const persOf=(ctx,id)=>(ctx.people||[]).find(p=>p.id===id)||null;
const activePeople=ctx=>(ctx.people||[]).filter(p=>p.active!==false&&!p.invite).sort((a,b)=>nomDe(a).localeCompare(nomDe(b),'fr'));
/** les lignes que « me » a le droit de voir : tout pour la RH, les siennes sinon */
const visible=(kind,me,ctx)=>rhVoir(me,ctx)?rows(kind):rows(kind).filter(r=>r.p===me.id||mine(r,me,ctx));
/* ── rendu ── */
const sel=(id,opts,val,blank)=>`<select class="f" id="${id}">${blank?`<option value="">${esc(blank)}</option>`:''}${opts.map(o=>`<option value="${esc(o[0])}"${String(val||'')===String(o[0])?' selected':''}>${esc(o[1])}</option>`).join('')}</select>`;
const btn=(k,v,t,cls)=>`<button class="btn${cls?' '+cls:''}" data-act="x" data-v="${ID}|${esc(k)}${v!=null?'|'+esc(v):''}">${t}</button>`;
function fieldHTML(f,r,ctx){const [k,type,label,opts]=f;const v=r[k];const id='rh-'+k;
  if(type==='person')return `<label class="f">${label}</label>${sel(id,activePeople(ctx).map(p=>[p.id,nomDe(p)]),v,'— choisir —')}`;
  if(type==='vehicle')return `<label class="f">${label}</label>${sel(id,vehAll().map(x=>[x.id,x.immat+(x.label?' · '+x.label:'')+(x.conducteur?' · '+x.conducteur:'')]),v,'— véhicule —')}`;
  if(type==='select')return `<label class="f">${label}</label>${sel(id,typeof opts==='function'?opts():opts,v)}`;
  if(type==='check')return `<label class="f" style="display:flex;gap:8px;align-items:center;margin-top:8px"><input type="checkbox" id="${id}"${v?' checked':''}> ${label}</label>`;
  if(type==='number')return `<label class="f">${label}</label><input class="f" id="${id}" type="number" step="any" inputmode="decimal" value="${v==null?'':esc(v)}">`;
  if(type==='date')return `<label class="f">${label}</label><input class="f" id="${id}" type="date" value="${esc(v||'')}">`;
  return `<label class="f">${label}</label><input class="f" id="${id}" value="${esc(v||'')}">`;}
function readForm(kind){const o={};DEF[kind].fields.forEach(([k,type])=>{const el=document.getElementById('rh-'+k);if(!el)return;if(type==='check')o[k]=!!el.checked;else if(type==='number')o[k]=el.value===''?null:+el.value;else o[k]=el.value||'';});return o;}
function modal(kind,id,me,ctx){const D=DEF[kind];const r=id?(regGet(kind,id)||{}):{};const isNew=!id;const api=ctx.api||A;
  const defaults=isNew?(kind==='rhabs'?{type:'cp',du:todayIso(),au:todayIso()}:kind==='rhpv'?{recu:todayIso(),statut:'recue'}:kind==='rhform'?{statut:'prevu'}:{statut:'affilie',regime:'isole'}):{};
  const R=Object.assign({},defaults,r);
  api.openModal(`<h3 style="margin-top:0">${D.ic} ${isNew?'Nouvelle '+D.one:D.one.charAt(0).toUpperCase()+D.one.slice(1)}</h3>${D.fields.map(f=>fieldHTML(f,R,ctx)).join('')}
    ${kind==='rhabs'?'<div class="hint" style="margin-top:6px">Les jours se calculent du lundi au vendredi entre les deux dates ; corrige si un férié ou une demi-journée change le compte.</div>':''}
    ${kind==='rhpv'?'<div class="hint" style="margin-top:6px">La désignation du conducteur doit partir sous 45 jours après réception de l\'avis ; sinon l\'entreprise paie l\'amende forfaitaire majorée.</div>':''}
    <div class="actions" style="margin-top:10px"><button class="btn primary block" id="rh-ok">${isNew?'Enregistrer':'Enregistrer les modifications'}</button>${isNew?'':`<button class="btn block" id="rh-del" style="border-color:#e9a1a1;color:#A3221F">Supprimer</button>`}<button class="btn block" data-close>Annuler</button></div>`);
  const g=k=>document.getElementById(k);
  if(kind==='rhabs'){const rec=()=>{const du=g('rh-du').value,au=g('rh-au').value||du;if(du&&au<du)g('rh-au').value=du;g('rh-jours').value=joursOuvres(du,g('rh-au').value||du);};['rh-du','rh-au'].forEach(k=>{if(g(k))g(k).addEventListener('change',rec);});if(isNew)rec();}
  if(kind==='rhpv'){const vs=g('rh-veh');if(vs)vs.addEventListener('change',()=>{const v=vehAll().find(x=>x.id===vs.value);const ps=g('rh-p');if(v&&v.conducteur&&ps&&!ps.value){const p=activePeople(ctx).find(q=>nomDe(q)===v.conducteur||q.id===v.conducteurId);if(p)ps.value=p.id;}});}
  g('rh-ok').onclick=()=>{const o=readForm(kind);if(DEF[kind].fields.some(([k,type])=>type==='person'&&!o[k]&&kind!=='rhpv')){ctx.toast('Choisis la personne');return;}
    if(kind==='rhabs'&&!o.du){ctx.toast('Donne la date');return;}if(kind==='rhform'&&!o.titre){ctx.toast('Donne l\'intitulé');return;}
    if(kind==='rhpv'){const v=vehAll().find(x=>x.id===o.veh);o.vehImmat=v?v.immat:'';if(o.p&&o.statut==='recue')o.statut='designee';}
    const p=persOf(ctx,o.p);const key=p?keyOf(p,ctx):'ent';const rid=id||(key+'|'+uid());
    const by=api.userName?api.userName():'';Object.assign(o,{upd:new Date().toISOString(),by});if(isNew)o.at=o.upd;
    regSet(kind,rid,o);api.closeModal();ctx.toast('✓ '+D.one.charAt(0).toUpperCase()+D.one.slice(1)+' enregistrée');
    if(kind==='rhform'&&o.statut==='fait'&&o.hab&&p)setTimeout(()=>habFromForm(o,p,ctx),50);else ctx.render();};
  if(g('rh-del'))g('rh-del').onclick=()=>{if(!confirm('Supprimer cette '+D.one+' ?'))return;regDelete(kind,id);api.closeModal();ctx.render();};}
/** formation faite avec une habilitation visée : proposer d'inscrire l'habilitation sur la fiche de la personne */
function habFromForm(o,p,ctx){const api=ctx.api||A;const T=HAB_TYPES[o.hab];if(!T){ctx.render();return;}const d=o.au||o.du||todayIso();
  if(!ctx.savePart){ctx.render();return;}
  api.openModal(`<h3 style="margin-top:0">🎖 Inscrire l'habilitation ?</h3><div class="eq-s">${esc(nomDe(p))} a suivi « ${esc(o.titre)} » : inscrire <b>${esc(T.label)}</b> obtenue le ${fDate(d)} sur sa fiche (validité ${T.ans} an${T.ans>1?'s':''}) ?</div>
    <div class="actions" style="margin-top:10px"><button class="btn primary block" id="rh-habok">Oui, inscrire</button><button class="btn block" data-close>Non</button></div>`);
  document.getElementById('rh-habok').onclick=()=>{try{habWrite(p,{type:o.hab,date:d,fin:finHab(o.hab,d),ref:o.organisme||''},ctx);ctx.toast('✓ Habilitation inscrite');}catch(e){console.warn(e);ctx.toast('Habilitation non inscrite : '+e.message);}api.closeModal();ctx.render();};}
/** fin de validité = date d'obtention + durée du type ; une habilitation sans durée reste valide */
export function finHab(type,date){const T=HAB_TYPES[type];if(!T||!T.ans||!date)return '';const y=+date.slice(0,4)+T.ans;return y+date.slice(4);}
/** écrit / remplace l'habilitation d'un type sur la fiche de la personne (une seule par type : la plus récente) */
function habWrite(p,h,ctx){const cur=(habsDe(p)||[]).filter(x=>x.h).map(x=>x.h);const L=cur.filter(x=>x.type!==h.type).concat([h]);ctx.savePart(p.id,'habs',L);}
function habModal(pid,type,me,ctx){const api=ctx.api||A;const p=persOf(ctx,pid);const cur=p&&type?(habsDe(p).find(x=>x.type===type)||{}).h:null;const R=cur||{type:type||'',date:'',fin:'',ref:''};
  api.openModal(`<h3 style="margin-top:0">🎖 ${cur?'Habilitation':'Nouvelle habilitation'}</h3><label class="f">Personne</label>${sel('rh-p',activePeople(ctx).map(q=>[q.id,nomDe(q)]),pid,'— choisir —')}
    <label class="f">Habilitation</label>${sel('rh-type',Object.keys(HAB_TYPES).map(k=>[k,HAB_TYPES[k].label+(HAB_TYPES[k].ans?' · '+HAB_TYPES[k].ans+' ans':'')]),R.type,'— choisir —')}
    <label class="f">Obtenue le</label><input class="f" id="rh-date" type="date" value="${esc(R.date||'')}"><label class="f">Valable jusqu'au</label><input class="f" id="rh-fin" type="date" value="${esc(R.fin||'')}">
    <label class="f">Référence / organisme</label><input class="f" id="rh-ref" value="${esc(R.ref||'')}"><label class="f">Justificatif (PDF ou photo, 800 Ko max)</label><input class="f" id="rh-file" type="file" accept="application/pdf,image/*">${R.fileName?`<div class="hint">📎 ${esc(R.fileName)} déjà déposé — un nouveau fichier le remplace</div>`:''}
    <div class="actions" style="margin-top:10px"><button class="btn primary block" id="rh-ok">Enregistrer</button>${cur?'<button class="btn block" id="rh-del" style="border-color:#e9a1a1;color:#A3221F">Retirer</button>':''}<button class="btn block" data-close>Annuler</button></div>`);
  const g=k=>document.getElementById(k);const auto=()=>{const d=g('rh-date').value,t=g('rh-type').value;if(d&&t&&!g('rh-fin').dataset.touched)g('rh-fin').value=finHab(t,d);};g('rh-date').addEventListener('change',auto);g('rh-type').addEventListener('change',auto);g('rh-fin').addEventListener('input',()=>{g('rh-fin').dataset.touched='1';});
  g('rh-ok').onclick=async()=>{const q=persOf(ctx,g('rh-p').value),t=g('rh-type').value,d=g('rh-date').value;if(!q||!t){ctx.toast('Choisis la personne et l\'habilitation');return;}const h={type:t,date:d,fin:g('rh-fin').value||'',ref:g('rh-ref').value||''};
    const f=g('rh-file').files&&g('rh-file').files[0];if(f){if(f.size>800*1024){ctx.toast('Fichier trop lourd (800 Ko max) : photo plus petite ou PDF allégé');return;}h.fileName=f.name;h.fileData=await new Promise(res=>{const rd=new FileReader();rd.onload=()=>res(rd.result);rd.readAsDataURL(f);});}else if(cur&&cur.fileData){h.fileName=cur.fileName;h.fileData=cur.fileData;}
    habWrite(q,h,ctx);api.closeModal();ctx.toast('✓ Habilitation enregistrée');ctx.render();};
  if(g('rh-del'))g('rh-del').onclick=()=>{if(!confirm('Retirer cette habilitation de la fiche ?'))return;const L=(habsDe(p)||[]).filter(x=>x.h&&x.type!==type).map(x=>x.h);ctx.savePart(p.id,'habs',L);api.closeModal();ctx.render();};}
function habOpenFile(pid,type,ctx){const p=persOf(ctx,pid);const h=p&&(habsDe(p).find(x=>x.type===type)||{}).h;if(!h||!h.fileData){ctx.toast('Pas de justificatif déposé');return;}try{const w=window.open();if(w){w.document.write(h.fileData.startsWith('data:application/pdf')?`<iframe src="${h.fileData}" style="border:0;width:100vw;height:100vh"></iframe>`:`<img src="${h.fileData}" style="max-width:100%">`);w.document.title=h.fileName||'Justificatif';}}catch(e){ctx.toast('Ouverture impossible');}}
/* ── vues ── */
const TABS=[['home','🏠','Tableau de bord'],['nav','🧾','Navettes'],['abs','🏖','Absences · congés'],['hab','🎖','Habilitations'],['form','🎓','Formation'],['pv','🚔','Contraventions'],['mut','🩺','Mutuelle'],['acc','⚠','Accidents']];
const tabs=(cur,me,ctx)=>`<div class="eq-tabs rh-tabs" style="display:flex;flex-wrap:wrap;gap:6px;margin:0 0 10px">${TABS.filter(t=>rhVoir(me,ctx)||['home','abs','hab','form','mut'].includes(t[0])).map(t=>`<button class="btn sm${cur===t[0]?' primary':''}" data-act="x" data-v="${ID}|tab|${t[0]}">${t[1]} ${t[2]}</button>`).join('')}</div>`;
const card=(h,body)=>`<div class="card">${h?`<h3 style="margin-top:0">${h}</h3>`:''}${body}</div>`;
const row=(r,kind,me,ctx,extra)=>{const p=persOf(ctx,r.p);const D=DEF[kind];return `<div class="eq-row"><span class="eq-grow"><span class="eq-t">${rhVoir(me,ctx)&&p?`<b>${esc(nomDe(p))}</b> · `:''}${esc(D.label(r))}</span>${extra||r.note?`<span class="eq-s">${esc(extra||'')}${extra&&r.note?' · ':''}${esc(r.note||'')}</span>`:''}</span>${rhEdit(me,ctx)?btn('edit',kind+'|'+r.id,'✏️','sm'):''}</div>`;};
const list=(kind,me,ctx,L,extraOf)=>L.length?`<div class="eq-list">${L.map(r=>row(r,kind,me,ctx,extraOf?extraOf(r):'')).join('')}</div>`:'<div class="eq-s" style="margin:6px 0">Rien pour l\'instant.</div>';
const addBtn=(kind,me,ctx)=>rhEdit(me,ctx)?`<div class="eq-acts" style="margin:0 0 8px">${btn('new',kind,'＋ '+DEF[kind].one.charAt(0).toUpperCase()+DEF[kind].one.slice(1),'primary')}</div>`:'';
const warnSrv=()=>KINDS.some(k=>regMissing(k))?'<div class="warnbox" style="margin-bottom:8px">Le serveur ne connaît pas encore les registres RH : les lignes restent sur cet appareil jusqu\'à ce que <code>sql/rh_1011.sql</code> soit passé dans Supabase.</div>':'';
function vHome(me,ctx){const voir=rhVoir(me,ctx);const P=voir?activePeople(ctx):[me];const abs=visible('rhabs',me,ctx),pv=visible('rhpv',me,ctx),fo=visible('rhform',me,ctx),mu=visible('rhmut',me,ctx);const today=todayIso();
  const absNow=abs.filter(a=>a.du<=today&&(a.au||a.du)>=today);const pvTodo=pv.filter(x=>x.statut==='recue');const pvLate=pvTodo.filter(x=>{const e=pvEcheance(x);return e&&e<today;});
  const foSoon=fo.filter(x=>x.statut==='prevu'&&x.du&&x.du>=today).sort((a,b)=>a.du.localeCompare(b.du)).slice(0,5);const muWait=mu.filter(x=>x.statut==='attente');
  const sansMut=voir?P.filter(p=>!mu.some(x=>x.p===p.id)):[];const habAl=voir?P.reduce((n,p)=>n+habsDe(p).filter(h=>h.etat==='expiree'||h.etat==='echeance').length,0):habsDe(me).filter(h=>h.etat!=='valide').length;
  const k=(n,l,sev)=>`<div class="ac-stat${sev?' '+sev:''}"><b>${n}</b><small>${l}</small></div>`;
  return `${warnSrv()}<div class="ac-stats" style="margin-bottom:10px">${k(absNow.length,'absent'+(absNow.length>1?'s':'')+' aujourd\'hui')}${k(pvTodo.length,'contravention'+(pvTodo.length>1?'s':'')+' à désigner',pvLate.length?'bad':'')}${k(foSoon.length,'formations à venir')}${k(habAl,'habilitations à traiter',habAl?'warn':'')}${voir?k(sansMut.length,'sans ligne mutuelle',sansMut.length?'warn':''):''}</div>
    ${absNow.length?card('🏖 Absents aujourd\'hui',list('rhabs',me,ctx,absNow)):''}
    ${pvTodo.length?card('🚔 Conducteur à désigner',list('rhpv',me,ctx,pvTodo,r=>{const e=pvEcheance(r);return e?(e<today?'⚠ échéance dépassée ('+fDate(e)+')':'avant le '+fDate(e)):'';})):''}
    ${foSoon.length?card('🎓 Prochaines formations',list('rhform',me,ctx,foSoon)):''}
    ${muWait.length?card('🩺 Mutuelle : pièces attendues',list('rhmut',me,ctx,muWait)):''}
    ${voir?card('Raccourcis',`<div class="eq-acts"><button class="btn" data-act="xgo" data-v="gd">🧾 Grands déplacements et navettes</button><button class="btn" data-act="xgo" data-v="cpt">⏱ Compteurs d'heures</button><button class="btn" data-act="xgo" data-v="accident">⚠ Déclarations d'accident</button><button class="btn" data-act="xgo" data-v="habsEq">🎖 Habilitations de l'équipe</button></div>`):card('Mon dossier',`<div class="eq-s">Tes absences, tes formations, ta mutuelle et tes habilitations. Tes navettes : Moi → Heures.</div>`)}`;}
function vNav(me,ctx){const months=[];const d=new Date();for(let i=0;i<6;i++){const m=new Date(d.getFullYear(),d.getMonth()-i,1);months.push(m.getFullYear()+'-'+String(m.getMonth()+1).padStart(2,'0'));}
  const lab=ym=>new Date(ym+'-15T12:00:00').toLocaleDateString('fr-FR',{month:'long',year:'numeric'});const P=activePeople(ctx);
  return card('🧾 Navettes de paie',`<div class="eq-s" style="margin-bottom:8px">La feuille d'heures récapitulative mensuelle de chacun (format SCR, formules gardées), construite depuis les pointages, le planning et les cas de grand déplacement. Un fichier par personne, ou toutes d'un coup.</div>
    ${months.map(ym=>`<details class="eq-fold"${ym===months[0]?' open':''}><summary><b>${esc(lab(ym).charAt(0).toUpperCase()+lab(ym).slice(1))}</b></summary><div class="eq-acts" style="margin:6px 0"><button class="btn primary" data-act="gdnavall" data-v="${ym}">⬇ Toutes les navettes de ${esc(lab(ym))}</button></div>
      <div class="eq-list">${P.map(p=>`<div class="eq-row"><span class="eq-grow"><span class="eq-t">${esc(nomDe(p))}</span></span><button class="btn sm" data-act="gdnavx" data-v="${esc(p.id)}|${ym}">⬇ xlsx</button></div>`).join('')}</div></details>`).join('')}
    <div class="hint" style="margin-top:8px">Le détail (cas de déplacement, nuits, repas, heures à reporter) est dans Grands déplacements.</div><div class="eq-acts"><button class="btn" data-act="xgo" data-v="gd">Ouvrir Grands déplacements</button></div>`);}
function vAbs(me,ctx){const voir=rhVoir(me,ctx);const L=visible('rhabs',me,ctx);const P=voir?activePeople(ctx):[me];const today=todayIso();const y=today.slice(0,4);
  const tot=P.map(p=>{const mine2=L.filter(a=>a.p===p.id);const S=soldeCP(mine2,p,today);const byT={};mine2.filter(a=>a.du.slice(0,4)===y).forEach(a=>{byT[a.type]=(byT[a.type]||0)+(+a.jours||0);});return {p,S,byT,n:mine2.length};}).filter(x=>voir?true:true);
  return `${warnSrv()}${addBtn('rhabs',me,ctx)}${card('Soldes de congés · période '+tot[0].S.periode.label,`<div class="eq-s" style="margin-bottom:6px">Acquis : ${CP_PAR_MOIS} j ouvrés par mois de présence (25 j par an), du 1er juin au 31 mai. Pris : les congés payés enregistrés sur la période. ${voir?'Réglage à confirmer avec la RH ; les entrées en cours d\'année comptent depuis la date d\'entrée de la fiche.':''}</div>
    <div style="overflow:auto"><table class="rc ch-tab"><tr><th>Personne</th><th class="r">Acquis</th><th class="r">Pris</th><th class="r">Solde</th>${ABS_TYPES.filter(t=>t[0]!=='cp').slice(0,5).map(t=>`<th class="r">${esc(t[1])} ${y}</th>`).join('')}</tr>${tot.map(x=>`<tr><td>${esc(nomDe(x.p))}</td><td class="r">${x.S.acquis}</td><td class="r">${x.S.pris}</td><td class="r"><b style="color:${x.S.solde<0?'#A3221F':'inherit'}">${x.S.solde}</b></td>${ABS_TYPES.filter(t=>t[0]!=='cp').slice(0,5).map(t=>`<td class="r">${x.byT[t[0]]||''}</td>`).join('')}</tr>`).join('')}</table></div>`)}
    ${card('Absences enregistrées',list('rhabs',me,ctx,L))}`;}
function vHab(me,ctx){const voir=rhVoir(me,ctx);const P=voir?activePeople(ctx):[me];
  const rowsH=[];P.forEach(p=>habsDe(p).forEach(x=>{if(x.h||x.etat==='absente')rowsH.push({p,...x});}));const alert=rowsH.filter(x=>x.etat!=='valide');
  const tr=x=>`<tr class="${x.etat==='expiree'?'bad':x.etat==='echeance'?'warn':''}"><td>${esc(nomDe(x.p))}</td><td>${esc((HAB_TYPES[x.type]||{}).label||x.type)}</td><td>${x.h&&x.h.date?fDate(x.h.date):''}</td><td>${x.h&&x.h.fin?fDate(x.h.fin):x.h?'sans limite':''}</td><td>${x.etat==='absente'?'<span style="color:#A3221F">manquante</span>':x.etat==='expiree'?'<span style="color:#A3221F">expirée</span>':x.etat==='echeance'?'<span style="color:#C08A2E">expire dans '+x.j+' j</span>':'✓'}</td><td class="r">${x.h&&x.h.fileData?btn('habfile',x.p.id+'|'+x.type,'📎','sm'):''}${rhEdit(me,ctx)?btn('hab',x.p.id+'|'+x.type,x.h?'✏️':'＋','sm'):''}</td></tr>`;
  return `${rhEdit(me,ctx)?`<div class="eq-acts" style="margin:0 0 8px">${btn('hab','','＋ Habilitation','primary')}</div>`:''}
    ${alert.length?card('À traiter · '+alert.length,`<div style="overflow:auto"><table class="rc ch-tab"><tr><th>Personne</th><th>Habilitation</th><th>Obtenue</th><th>Fin</th><th>État</th><th></th></tr>${alert.map(tr).join('')}</table></div>`):card('','<div class="okbox">✓ Toutes les habilitations requises sont à jour.</div>')}
    ${card('Toutes les habilitations',`<div class="eq-s" style="margin-bottom:6px">Une ligne par personne et par habilitation requise pour son poste (plus celles déposées en plus). Le justificatif se dépose dans la fiche (PDF ou photo).</div><div style="overflow:auto"><table class="rc ch-tab"><tr><th>Personne</th><th>Habilitation</th><th>Obtenue</th><th>Fin</th><th>État</th><th></th></tr>${rowsH.filter(x=>x.etat==='valide').map(tr).join('')}</table></div>`)}`;}
function vForm(me,ctx){const L=visible('rhform',me,ctx);const y=todayIso().slice(0,4);const yr=L.filter(x=>(x.du||x.at||'').slice(0,4)===y);const cout=yr.filter(x=>x.statut!=='annule').reduce((s,x)=>s+(+x.cout||0),0),h=yr.filter(x=>x.statut!=='annule').reduce((s,x)=>s+(+x.heures||0),0);
  return `${warnSrv()}${addBtn('rhform',me,ctx)}<div class="ac-stats" style="margin-bottom:10px"><div class="ac-stat"><b>${yr.filter(x=>x.statut==='prevu').length}</b><small>prévues en ${y}</small></div><div class="ac-stat"><b>${yr.filter(x=>x.statut==='fait').length}</b><small>faites en ${y}</small></div><div class="ac-stat"><b>${h}</b><small>heures</small></div>${rhVoir(me,ctx)?`<div class="ac-stat"><b>${eur(cout)}</b><small>budget ${y}</small></div>`:''}</div>
    ${card('Plan de formation',list('rhform',me,ctx,L,r=>(FORM_STATUTS.find(x=>x[0]===r.statut)||['',''])[1]+(r.hab&&HAB_TYPES[r.hab]?' · → '+HAB_TYPES[r.hab].label:'')+(r.heures?' · '+r.heures+' h':'')+(r.cout&&rhVoir(me,ctx)?' · '+eur(r.cout):'')))}`;}
function vPv(me,ctx){const L=visible('rhpv',me,ctx);const today=todayIso();const open=L.filter(x=>x.statut==='recue'||x.statut==='designee'),done=L.filter(x=>!(x.statut==='recue'||x.statut==='designee'));
  const ex=r=>{const st=(PV_STATUTS.find(x=>x[0]===r.statut)||['',''])[1];const e=pvEcheance(r);return st+(r.statut==='recue'&&e?(e<today?' · ⚠ désignation en retard ('+fDate(e)+')':' · à désigner avant le '+fDate(e)):'')+(r.lieu?' · '+r.lieu:'');};
  return `${warnSrv()}${addBtn('rhpv',me,ctx)}${card('En cours · '+open.length,list('rhpv',me,ctx,open,ex))}${card('Réglées · '+done.length,list('rhpv',me,ctx,done,ex))}`;}
function vMut(me,ctx){const voir=rhVoir(me,ctx);const L=visible('rhmut',me,ctx);const P=voir?activePeople(ctx):[me];const sans=P.filter(p=>!L.some(x=>x.p===p.id));
  return `${warnSrv()}${addBtn('rhmut',me,ctx)}${voir&&sans.length?card('Sans ligne mutuelle · '+sans.length,`<div class="eq-s" style="margin-bottom:6px">Chaque salarié doit être affilié ou dispensé (avec justificatif).</div><div class="eq-list">${sans.map(p=>`<div class="eq-row"><span class="eq-grow"><span class="eq-t">${esc(nomDe(p))}</span></span>${rhEdit(me,ctx)?btn('newp','rhmut|'+p.id,'＋','sm'):''}</div>`).join('')}</div>`):''}
    ${card('Affiliations et dispenses',list('rhmut',me,ctx,L,r=>(r.statut==='dispense'?(MUT_MOTIFS.find(x=>x[0]===r.motif)||['',''])[1]:'')+(r.statut==='attente'?[r.bulletin?'':'bulletin manquant',r.justif?'':'justificatif manquant'].filter(Boolean).join(', '):'')))}`;}
function vAcc(me,ctx){const L=regAll('accident').filter(x=>x&&x.d).sort((a,b)=>String(b.d).localeCompare(String(a.d)));const open=L.filter(x=>x.status!=='traite');
  return `<div class="ac-stats" style="margin-bottom:10px"><div class="ac-stat${open.length?' bad':''}"><b>${open.length}</b><small>à traiter</small></div><div class="ac-stat"><b>${L.filter(x=>x.d.slice(0,4)===todayIso().slice(0,4)).length}</b><small>déclarations en ${todayIso().slice(0,4)}</small></div></div>
    ${card('Déclarations',`<div class="eq-s" style="margin-bottom:6px">Le traitement (qualification, suite donnée) se fait dans l'écran des déclarations.</div><div class="eq-acts"><button class="btn primary" data-act="xgo" data-v="accident">Ouvrir les déclarations</button></div>`)}`;}
function view(k,me,ctx){const t=k||'home';const body=t==='nav'?vNav(me,ctx):t==='abs'?vAbs(me,ctx):t==='hab'?vHab(me,ctx):t==='form'?vForm(me,ctx):t==='pv'?vPv(me,ctx):t==='mut'?vMut(me,ctx):t==='acc'?vAcc(me,ctx):vHome(me,ctx);
  return `<h2 class="vt">Ressources humaines <span class="hint">· ${rhVoir(me,ctx)?'toute l\'entreprise':'mon dossier'}</span></h2>${tabs(t,me,ctx)}${body}`;}
/* ── module ── */
let TAB='home';
function tasks(me,ctx){hook(ctx);if(!rhVoir(me,ctx))return [];const today=todayIso();const out=[];
  const late=rows('rhpv').filter(x=>x.statut==='recue').filter(x=>{const e=pvEcheance(x);return e&&e<=addDays(today,7);});if(late.length)out.push({act:true,sev:late.some(x=>pvEcheance(x)<today)?'bad':'warn',ic:'🚔',t:late.length+' contravention'+(late.length>1?'s':'')+' : conducteur à désigner',s:'45 jours après l\'avis, sinon amende majorée pour l\'entreprise',when:'cette semaine',go:()=>{TAB='pv';ctx.go('x:'+ID+':pv');}});
  const wk=rows('rhform').filter(x=>x.statut==='prevu'&&x.du&&x.du>=today&&x.du<=addDays(today,7));if(wk.length)out.push({act:false,sev:'info',ic:'🎓',t:wk.length+' formation'+(wk.length>1?'s':'')+' cette semaine',s:wk.map(x=>(persOf(ctx,x.p)||{prenom:'?'}).prenom+' : '+x.titre).join(' · ').slice(0,120),go:()=>{TAB='form';ctx.go('x:'+ID+':form');}});
  return out;}
const addDays=(d,n)=>{const t=new Date(d+'T12:00:00');t.setDate(t.getDate()+n);return t.toISOString().slice(0,10);};
export default {id:ID,kinds:KINDS,hub:'entreprise',
  hubRows(tab,me,ctx){hook(ctx);if(tab!=='entreprise')return [];const voir=rhVoir(me,ctx);const today=todayIso();const n=voir?rows('rhpv').filter(x=>x.statut==='recue').length+rows('rhmut').filter(x=>x.statut==='attente').length:0;
    return [ctx.row(voir?'Ressources humaines':'Mon dossier RH',voir?'Navettes, absences et congés, habilitations, formation, contraventions, mutuelle, accidents':'Mes absences, mes habilitations, mes formations, ma mutuelle','👥','#efeafb','x:'+ID+':'+TAB,n||null,n?'warn':'')];},
  xview(k,me,ctx){hook(ctx);TAB=k||TAB||'home';return view(TAB,me,ctx);},
  tasks,
  act(v,el,me,ctx){hook(ctx);const parts=String(v).split('|');const k=parts[0];
    if(k==='tab'){TAB=parts[1]||'home';ctx.go('x:'+ID+':'+TAB);return;}
    if(k==='habfile'){habOpenFile(parts[1],parts[2],ctx);return;}
    if(!rhEdit(me,ctx)){ctx.toast('Réservé à la RH / direction / administrateur');return;}
    if(k==='new'){modal(parts[1],null,me,ctx);return;}
    if(k==='newp'){modal(parts[1],null,me,ctx);setTimeout(()=>{const s=document.getElementById('rh-p');if(s)s.value=parts[2];},30);return;}
    if(k==='edit'){modal(parts[1],parts.slice(2).join('|'),me,ctx);return;}
    if(k==='hab'){habModal(parts[1]||'',parts[2]||'',me,ctx);return;}}};
