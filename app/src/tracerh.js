// tracerh.js — TRACÉ RESSOURCES HUMAINES (10/11/2026, demande d'Ethan) : un seul endroit pour tout ce qui est RH.
// Fédère ce qui existait déjà (navettes de paie, compteurs d'heures, grands déplacements, déclarations d'accident, habilitations) et ajoute
// quatre registres partagés : absences et congés (rhabs), contraventions (rhpv), plan de formation (rhform), mutuelle (rhmut).
// Droits : RH / direction / administrateur (rh.voir, rh.edit) voient et modifient tout ; chacun voit SON dossier (lecture). Serveur : sql/rh_1011.sql (à passer par Ethan).
import {regAll,regGet,regSet,regDelete,regLoad,regMissing} from './reg.js';
import {vehAll} from './flotte.js';
import {HAB_TYPES,cTableHabs,habsDe,espaceNavMois,espaceNavRegler,espaceNavChoisir} from './espace.js';
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
const absEdit=(me,ctx)=>rhEdit(me,ctx)||(!!me&&ctx.can('rh.abs')); /* 10/11 (Ethan) : absences et congés = responsable d'exploitation, RH, assistante RH */
const absVoir=(me,ctx)=>rhVoir(me,ctx)||absEdit(me,ctx);
const navEdit=(me,ctx)=>!!me&&(me.admin||ctx.can('rh.edit')||ctx.can('rh.nav')); /* 10/11 nuit (Ethan) : contrôle des navettes, choix « reporter ou prime » = la RH ou le responsable d'exploitation */
const navVoir=(me,ctx)=>rhVoir(me,ctx)||navEdit(me,ctx);
const keyOf=(p,ctx)=>p?(ctx.personKey?ctx.personKey(p):(p.email||p.id)).toLowerCase():'';
const demoOpts=rid=>String(rid||'').startsWith('l:')?{local:true}:undefined; /* 11/11 : ligne d'un personnage de démo (bac à sable, clé « l:… ») → reste sur l'appareil, comme les compteurs et les navettes (espace.js) ; avant, elle partait au serveur */
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
  try{if(typeof window!=='undefined'&&window.TRACE&&!window.TRACE.rh)window.TRACE.rh={rows:kind=>rows(kind),jours:joursOuvres,pvEch:pvEcheance,def:()=>DEF};}catch(e){}}
const rows=kind=>regAll(kind).filter(r=>r&&!r.deleted).sort(DEF[kind].sort);
const persOf=(ctx,id)=>(ctx.people||[]).find(p=>p.id===id)||null;
const activePeople=ctx=>(ctx.people||[]).filter(p=>p.active!==false&&!p.invite).sort((a,b)=>nomDe(a).localeCompare(nomDe(b),'fr'));
/** les lignes que « me » a le droit de voir : tout pour la RH, les siennes sinon */
const visible=(kind,me,ctx)=>(kind==='rhabs'?absVoir(me,ctx):rhVoir(me,ctx))?rows(kind):rows(kind).filter(r=>r.p===me.id||mine(r,me,ctx));
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
    regSet(kind,rid,o,demoOpts(rid));api.closeModal();ctx.toast('✓ '+D.one.charAt(0).toUpperCase()+D.one.slice(1)+' enregistrée');
    if(kind==='rhform'&&o.statut==='fait'&&o.hab&&p)setTimeout(()=>habFromForm(o,p,ctx),50);else ctx.render();};
  if(g('rh-del'))g('rh-del').onclick=()=>{if(!confirm('Supprimer cette '+D.one+' ?'))return;regDelete(kind,id,demoOpts(id));api.closeModal();ctx.render();};}
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
const tabs=(cur,me,ctx)=>`<div class="eq-tabs rh-tabs" style="display:flex;flex-wrap:wrap;gap:6px;margin:0 0 10px">${TABS.filter(t=>rhVoir(me,ctx)||['home','abs','hab','form','mut'].includes(t[0])||(t[0]==='nav'&&navVoir(me,ctx))).map(t=>`<button class="btn sm${cur===t[0]?' primary':''}" data-act="x" data-v="${ID}|tab|${t[0]}">${t[1]} ${t[2]}</button>`).join('')}</div>`;
const card=(h,body)=>`<div class="card">${h?`<h3 style="margin-top:0">${h}</h3>`:''}${body}</div>`;
const row=(r,kind,me,ctx,extra)=>{const p=persOf(ctx,r.p);const D=DEF[kind];return `<div class="eq-row"><span class="eq-grow"><span class="eq-t">${rhVoir(me,ctx)&&p?`<b>${esc(nomDe(p))}</b> · `:''}${esc(D.label(r))}</span>${extra||r.note?`<span class="eq-s">${esc(extra||'')}${extra&&r.note?' · ':''}${esc(r.note||'')}</span>`:''}</span>${(kind==='rhabs'?absEdit(me,ctx):rhEdit(me,ctx))?btn('edit',kind+'|'+r.id,'✏️','sm'):''}</div>`;};
const list=(kind,me,ctx,L,extraOf)=>L.length?`<div class="eq-list">${L.map(r=>row(r,kind,me,ctx,extraOf?extraOf(r):'')).join('')}</div>`:'<div class="eq-s" style="margin:6px 0">Rien pour l\'instant.</div>';
const addBtn=(kind,me,ctx)=>(kind==='rhabs'?absEdit(me,ctx):rhEdit(me,ctx))?`<div class="eq-acts" style="margin:0 0 8px">${btn('new',kind,'＋ '+DEF[kind].one.charAt(0).toUpperCase()+DEF[kind].one.slice(1),'primary')}</div>`:'';
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
/* ── 10/11 nuit : NAVETTES — contrôle des navettes du mois, cas d'exception, « comment on arrive là », la main sur une semaine, choix de fin de mois ──
   Ethan : « les heures sont lissées sur 5 jours … il faut toujours que ce soit expliqué, que même si un calcul se fait on puisse avoir la main et toujours comprendre
   comment on en arrive là » ; « chaque fin de mois on choisit : reporter (elles s'ajoutent sur des semaines pas pleines à 48 h) ou payer » (la RH ou le responsable
   d'exploitation). Le calcul est celui de la navette Excel (espace.js → navette.js lisserSemaine), relu ici, jamais refait. */
let NAVM=null;let NAVCACHE=null;
const ymNow=()=>todayIso().slice(0,7);
const ymAdd=(ym,n)=>{const [y,m]=ym.split('-').map(Number);const d=new Date(y,m-1+n,1);return d.getFullYear()+'-'+String(d.getMonth()+1).padStart(2,'0');};
const ymLab=ym=>{const t=new Date(ym+'-15T12:00:00').toLocaleDateString('fr-FR',{month:'long',year:'numeric'});return t.charAt(0).toUpperCase()+t.slice(1);};
const nbh=v=>String(Math.round((+v||0)*100)/100).replace('.',',');
const JL6=['Lun','Mar','Mer','Jeu','Ven','Sam'];
const ETAT_IC={lisse:'✓',main:'✋',reel:'✋',encours:'⏳',vide:'·',incomplet:'⚠',sansjour:'·'};
const FLAG_TXT={incomplet:'jour attendu sans pointage',sansSolde:'sous l\'objectif, compteurs vides : sans solde à poser',soldeInconnu:'sous l\'objectif, compteurs pas encore suivis',rien:'planifié, rien de pointé',plafond:'au-delà du plafond → à reporter',comble:'complétée avec les compteurs',main:'réglée à la main',inter:'inter-chantier',place:'heures replacées (choix « reporter »)',absence:'absence',ferie:'férié / pont'};
const A_TRAITER=['incomplet','sansSolde','soldeInconnu','rien'];
function navData(ym){const L=espaceNavMois(ym);NAVCACHE={ym,L};return L;}
function weekCell(w,p){const L=w.liss;if(!L)return `<td class="r dim">${w.total?nbh(w.total):'—'}</td>`;const bad=L.flags.some(f=>A_TRAITER.includes(f));const ic=ETAT_IC[L.etat]||'';
  return `<td class="r"><button class="nav-cell${bad?' bad':L.flags.includes('main')?' main':L.etat==='lisse'&&L.flags.length?' info':''}" data-act="x" data-v="${ID}|navw|${esc(p.id)}|${L.mon}" title="${esc(L.etatTxt+(L.flags.length?' · '+L.flags.map(f=>FLAG_TXT[f]||f).join(' · '):''))}"><b>${L.etat==='vide'?'—':nbh(w.total)}</b> <span>${ic}</span></button></td>`;}
function vNav(me,ctx){const ym=NAVM||ymNow();const L=navData(ym);const ed=navEdit(me,ctx);const P=L.map(x=>x.p);
  const W=L.length?L[0].N.weeks:[];const allW=L.flatMap(x=>x.N.weeks.filter(w=>w.liss).map(w=>({p:x.p,w,L:w.liss})));
  const cnt=f=>allW.filter(x=>x.L.flags.includes(f)).length;const lis=allW.filter(x=>x.L.etat==='lisse').length;const itT=L.reduce((t,x)=>t+(+x.N.it||0),0);
  const k=(n,l,sev)=>`<div class="ac-stat${sev?' '+sev:''}"><b>${n}</b><small>${l}</small></div>`;
  const todo=allW.filter(x=>x.L.flags.some(f=>A_TRAITER.includes(f)));
  const choix=L.filter(x=>(x.N.repFin!==null&&x.N.repFin>0.004)||x.N.choix);
  const fr=d=>String(d).slice(8,10)+'/'+String(d).slice(5,7);
  const head=`<div class="card" style="padding:8px 12px"><div class="eq-wkhead"><button class="eq-wkbtn" data-act="x" data-v="${ID}|navm|${ymAdd(ym,-1)}" aria-label="Mois précédent">‹</button><div class="eq-wktitle"><b>${esc(ymLab(ym))}</b><span>${W.length?'semaines du '+fr(W[0].mon)+' au '+fr(addDays(W[W.length-1].mon,5))+' (jeudi dans le mois)':''}</span></div><button class="eq-wkbtn" data-act="x" data-v="${ID}|navm|${ymAdd(ym,1)}" aria-label="Mois suivant">›</button></div>
    <div class="eq-acts" style="margin:8px 0 0"><button class="btn primary" data-act="gdnavall" data-v="${ym}">⬇ Toutes les navettes de ${esc(ymLab(ym).toLowerCase())}</button><button class="btn" data-act="xgo" data-v="gd">Grands déplacements</button>${rhVoir(me,ctx)?'<button class="btn" data-act="xgo" data-v="cpt">⏱ Compteurs d\'heures</button>':''}</div></div>`;
  const tiles=`<div class="ac-stats" style="margin:0 0 10px">${k(P.length,'personne'+(P.length>1?'s':''))}${k(lis,'semaines lissées')}${k(todo.length,'à traiter',todo.length?'warn':'')}${k(cnt('plafond'),'au-delà du plafond')}${k(cnt('comble'),'complétées (compteurs)')}${k(cnt('sansSolde'),'sans solde à poser',cnt('sansSolde')?'bad':'')}${k(cnt('main'),'réglées à la main')}${itT?k(nbh(itT)+' h','inter-chantier (100 %)'):''}</div>`;
  const todoC=todo.length?card('À traiter · '+todo.length,`<div class="eq-s" style="margin-bottom:6px">Ces semaines ne partent pas lissées (ou laissent des heures à couvrir) : ouvre-les pour voir pourquoi et décider.</div><div class="eq-list">${todo.map(x=>`<div class="eq-row"><span class="eq-grow"><span class="eq-t"><b>${esc(nomDe(x.p))}</b> · S${x.w.n} <span class="dim">${fr(x.w.mon)} → ${fr(addDays(x.w.mon,4))}</span></span><span class="eq-s">${esc(x.L.flags.filter(f=>A_TRAITER.includes(f)).map(f=>FLAG_TXT[f]).join(' · '))}</span></span><button class="btn sm" data-act="x" data-v="${ID}|navw|${esc(x.p.id)}|${x.w.mon}">Voir</button></div>`).join('')}</div>`):card('','<div class="okbox">✓ Rien à traiter : toutes les semaines finies sont lissées ou réglées.</div>');
  const choixC=choix.length?card('Fin de mois : reporter ou prime',`<div class="eq-s" style="margin-bottom:6px">Heures à reporter au ${fr(addDays(W.length?W[W.length-1].mon:todayIso(),6))} (fin de la navette). <b>Reporter</b> : elles restent au compteur et se replacent toutes seules sur les semaines pas pleines à 48 h. <b>Prime</b> : payées ce mois-ci, le compteur repart de zéro.${ed?'':' (Choix réservé à la RH et au responsable d\'exploitation.)'}</div>
    <div class="eq-list">${choix.map(x=>{const h=Math.round((+x.N.repFin||0)*100)/100;const c=x.N.choix;return `<div class="eq-row"><span class="eq-grow"><span class="eq-t"><b>${esc(nomDe(x.p))}</b> · ${c&&c.choix==='prime'?'payées en prime : '+nbh(c.h)+' h':nbh(h)+' h à reporter'}</span><span class="eq-s">${c?(c.choix==='prime'?'💶 Prime de '+nbh(c.h)+' h':'↪ Reporter')+' · choisi par '+esc(c.by||'?')+(c.at?' le '+fDate(String(c.at).slice(0,10)):''):'choix à faire'}</span></span>${ed?(c?btn('navchoix',x.p.id+'|'+ym+'|','Annuler','sm'):btn('navchoix',x.p.id+'|'+ym+'|reporter','↪ Reporter','sm')+btn('navchoix',x.p.id+'|'+ym+'|prime|'+h,'💶 Prime '+nbh(h)+' h','sm primary')):''}</div>`;}).join('')}</div>`):'';
  const tab=P.length?card('Toutes les navettes',`<div class="eq-s" style="margin-bottom:6px">Heures sur la navette, semaine par semaine : ✓ lissée · ✋ réglée à la main · ⏳ en cours · ⚠ à compléter. Touche une semaine pour voir le détail jour par jour et comment on arrive là${ed?', et reprendre la main':''}.</div>
    <div style="overflow:auto"><table class="rc ch-tab nav-tab"><tr><th>Personne</th>${W.map(w=>`<th class="r">S${w.n}<div class="dim" style="font-size:10.5px;font-weight:400">${fr(w.mon)}</div></th>`).join('')}<th class="r">Mois</th><th></th></tr>
    ${L.map(x=>{const N=x.N;return `<tr><td>${esc(nomDe(x.p))}${N.it?`<div class="dim" style="font-size:10.5px">inter-chantier ${nbh(N.it)} h</div>`:''}</td>${N.weeks.map(w=>weekCell(w,x.p)).join('')}<td class="r"><b>${nbh(N.weeks.reduce((t,w)=>t+w.total,0))}</b><div class="dim" style="font-size:10.5px">HS ${nbh(N.hs.h125)} + ${nbh(N.hs.h150)}</div></td><td class="r"><button class="btn sm" data-act="gdnavx" data-v="${esc(x.p.id)}|${ym}">⬇ xlsx</button></td></tr>`;}).join('')}</table></div>`):card('','<div class="eq-s">Personne n\'est planifié ni pointé sur les semaines de ce mois.</div>');
  const autres=activePeople(ctx).filter(q=>!L.some(x=>x.p.id===q.id)); /* les autres : leur navette (vide) se télécharge toujours, comme avant */
  const autresC=autres.length?`<details class="eq-fold card"><summary><b>Sans activité ce mois-ci · ${autres.length}</b> <span class="dim">· ni planifiés ni pointés</span></summary><div class="eq-list">${autres.map(q=>`<div class="eq-row"><span class="eq-grow"><span class="eq-t">${esc(nomDe(q))}</span></span><button class="btn sm" data-act="gdnavx" data-v="${esc(q.id)}|${ym}">⬇ xlsx</button></div>`).join('')}</div></details>`:'';
  const regles=`<details class="eq-fold card"><summary><b>Les règles du lissage</b> <span class="dim">· ce que fait le calcul</span></summary><div class="eq-s" style="margin-top:6px">Les heures pointées de la semaine (sans les pauses ni l'inter-chantier) sont réparties sur les jours du lundi au vendredi, au pas de ½ h, le reste sur le dernier jour, 12 h par jour et 48 h par semaine au plus. Un vendredi non travaillé prend le chantier du jeudi. Un jour d'absence (Tracé RH → Absences), un férié ou un pont n'est pas lissé : avec un férié et un pont, 3 jours × 12 h = 36 h au plus. Ce qui dépasse va au compteur à reporter, majoré selon le rang de l'heure (de la 36e à la 43e × 1,25 ; au-delà × 1,5 : 50 h → 2 h × 1,5 = 3 h). Une semaine sous le contrat se complète avec le compteur à reporter, puis le compteur d'heures ; vides → alerte « sans solde ». Une semaine pas finie, ou avec un jour attendu sans pointage ni absence, n'est pas lissée tant qu'on ne l'a pas complétée ou validée telle quelle. Les heures inter-chantier sont payées à part (100 %, jamais majorées). Les débours de Tracé Affaire prennent toujours les heures réelles.</div></details>`;
  const old=`<details class="eq-fold card"><summary><b>Téléchargements des 6 derniers mois</b></summary>${[0,1,2,3,4,5].map(i=>ymAdd(ymNow(),-i)).map(m=>`<div class="eq-row"><span class="eq-grow"><span class="eq-t">${esc(ymLab(m))}</span></span><button class="btn sm" data-act="gdnavall" data-v="${m}">⬇ Toutes les navettes</button></div>`).join('')}</details>`;
  return head+tiles+todoC+choixC+tab+autresC+regles+old;}
/* une semaine : jour par jour, l'explication, et la main (RH / responsable d'exploitation) */
function navWeekModal(pid,mon,me,ctx){const api=ctx.api||A;const ym=NAVM||ymNow();const L0=(NAVCACHE&&NAVCACHE.ym===ym?NAVCACHE.L:navData(ym));const x=L0.find(z=>z.p.id===pid);const w=x&&x.N.weeks.find(z=>z.mon===mon);const L=w&&w.liss;
  if(!L){ctx.toast('Semaine introuvable');return;}const ed=navEdit(me,ctx);const M=L.main||{};const fr=d=>String(d).slice(8,10)+'/'+String(d).slice(5,7);
  const autoL=j=>j.i<5&&(j.st==='pointe'||j.st==='');
  const rows=L.jours.map(j=>`<tr><td>${JL6[j.i]} ${fr(j.d)}</td><td class="r">${j.reel!==null?nbh(j.reel):'—'}</td><td class="r"><b>${j.h!==null&&j.h!==undefined?nbh(j.h):'—'}</b></td><td>${esc(j.site?j.site.nom:'')}${j.emprunt?' <span class="dim">(chantier du jour travaillé d\'avant)</span>':''}${j.lab&&j.reel===null?' <span class="eq-tag">'+esc(j.lab)+'</span>':''}</td><td class="r">${j.it?nbh(j.it):''}</td></tr>`).join('');
  const sum=`<tr class="tot"><td>Semaine</td><td class="r">${nbh(L.reel)}</td><td class="r"><b>${nbh(L.total)}</b>${L.total!==L.declare?'<div class="dim" style="font-size:10.5px">dont '+nbh(L.total-L.declare)+' h des compteurs</div>':''}</td><td>${esc(L.etatTxt)}</td><td class="r">${L.it?nbh(L.it):''}</td></tr>`;
  const mode=M.mode||'auto';const hIn=i=>{const v=mode==='main'&&Array.isArray(M.h)?M.h[i]:L.jours[i].h;return `<input class="f" type="number" step="0.25" min="0" max="12" inputmode="decimal" id="nv-h${i}" value="${v===null||v===undefined?'':esc(v)}" style="width:72px">`;};
  const form=ed?`<div class="nav-main"><h4 style="margin:12px 0 6px">✋ Avoir la main sur cette semaine</h4>
    <label class="f" style="display:flex;gap:8px;align-items:center"><input type="radio" name="nv-mode" value="auto"${mode==='auto'?' checked':''}> Lissage automatique (les règles)</label>
    <label class="f" style="display:flex;gap:8px;align-items:center"><input type="radio" name="nv-mode" value="reel"${mode==='reel'?' checked':''}> Heures réelles jour par jour (pas de lissage)</label>
    <label class="f" style="display:flex;gap:8px;align-items:center"><input type="radio" name="nv-mode" value="main"${mode==='main'?' checked':''}> Heures saisies à la main</label>
    <div class="nav-hin" style="display:flex;flex-wrap:wrap;gap:8px;margin:6px 0"${mode==='main'?'':' hidden'}>${L.jours.map((j,i)=>`<div><div class="dim" style="font-size:11px">${JL6[i]} ${fr(j.d)}</div>${hIn(i)}</div>`).join('')}</div>
    <div class="eq-s" style="margin:6px 0 2px">Jours lissés :</div><div style="display:flex;flex-wrap:wrap;gap:10px">${L.jours.slice(0,5).map((j,i)=>`<label style="display:flex;gap:6px;align-items:center;min-height:40px"><input type="checkbox" id="nv-l${i}"${j.liss?' checked':''} data-auto="${autoL(j)?1:0}"> ${JL6[i]}</label>`).join('')}</div>
    <label class="f" style="display:flex;gap:8px;align-items:center;margin-top:6px"><input type="checkbox" id="nv-force"${M.force?' checked':''}> Valider la semaine telle quelle (un jour attendu sans pointage = non travaillé)</label>
    <label class="f" style="display:flex;gap:8px;align-items:center"><input type="checkbox" id="nv-comble"${M.comble===false?'':' checked'}> Compléter avec les compteurs si la semaine est sous le contrat</label>
    <label class="f">Motif (obligatoire)</label><input class="f" id="nv-motif" value="${esc(M.motif||'')}" placeholder="ex. pont du 10/11 non déclaré, accord avec le gars…">
    <div class="actions" style="margin-top:10px"><button class="btn primary block" id="nv-ok">Enregistrer</button>${L.main?'<button class="btn block" id="nv-auto">Revenir au calcul automatique</button>':''}<button class="btn block" data-close>Fermer</button></div></div>`:'<div class="actions" style="margin-top:10px"><button class="btn block" data-close>Fermer</button></div>';
  api.openModal(`<h3 style="margin-top:0">🧾 ${esc(nomDe(x.p))} · S${w.n} <span class="hint">· ${fr(mon)} → ${fr(addDays(mon,5))}</span></h3>
    <div style="overflow:auto"><table class="rc ch-tab"><tr><th>Jour</th><th class="r">Pointé</th><th class="r">Navette</th><th>Chantier</th><th class="r">Inter-ch.</th></tr>${rows}${sum}</table></div>
    <div class="nav-wexp" style="margin-top:8px"><b>Comment on arrive là</b><ul>${L.expl.map(t=>`<li>${esc(t)}</li>`).join('')}</ul></div>${form}`);
  if(!ed)return;const g=k=>document.getElementById(k);document.querySelectorAll('input[name=nv-mode]').forEach(r=>r.addEventListener('change',()=>{const h=document.querySelector('.nav-hin');if(h)h.hidden=r.value!=='main'||!r.checked;}));
  g('nv-ok').onclick=()=>{const md=(document.querySelector('input[name=nv-mode]:checked')||{}).value||'auto';const motif=(g('nv-motif').value||'').trim();if(!motif){ctx.toast('Indique le motif (il apparaît dans l\'explication)');g('nv-motif').focus();return;}
    const o={mode:md,motif};if(md==='main'){const h=[0,1,2,3,4,5].map(i=>{const v=g('nv-h'+i).value;return v===''?null:Math.max(0,Math.min(12,+v));});if(h.some(v=>v!==null&&!isFinite(v))){ctx.toast('Heures illisibles');return;}o.h=h;}
    const off=[],on=[];L.jours.slice(0,5).forEach((j,i)=>{const c=g('nv-l'+i).checked,a=autoL(j);if(c&&!a)on.push(j.d);if(!c&&a)off.push(j.d);});if(off.length)o.off=off;if(on.length)o.on=on;
    if(g('nv-force').checked)o.force=true;if(!g('nv-comble').checked)o.comble=false;
    const r=espaceNavRegler(pid,mon,o);if(!r.ok){ctx.toast(r.why||'Refusé');return;}api.closeModal();ctx.toast('✓ Semaine réglée à la main — l\'explication le dit');ctx.render();};
  if(g('nv-auto'))g('nv-auto').onclick=()=>{const r=espaceNavRegler(pid,mon,null);if(!r.ok){ctx.toast(r.why||'Refusé');return;}api.closeModal();ctx.toast('✓ Retour au calcul automatique');ctx.render();};}
function vAbs(me,ctx){const voir=absVoir(me,ctx);const L=visible('rhabs',me,ctx);const P=voir?activePeople(ctx):[me];const today=todayIso();const y=today.slice(0,4);
  const tot=P.map(p=>{const m=L.filter(a=>a.p===p.id&&String(a.du||'').slice(0,4)===y);const byT={};m.forEach(a=>{byT[a.type]=(byT[a.type]||0)+(+a.jours||0);});return {p,byT,n:m.reduce((s,a)=>s+(+a.jours||0),0)};}).filter(x=>voir?x.n>0:true);
  const T=ABS_TYPES.filter(t=>tot.some(x=>x.byT[t[0]]));
  return `${warnSrv()}${addBtn('rhabs',me,ctx)}${card('Jours d\'absence en '+y,`<div class="eq-s" style="margin-bottom:6px">Le compte (jours ouvrés du lundi au vendredi, corrigeable à la saisie) sert au planning et à la navette ; les soldes de congés restent dans le logiciel de paie.</div>
    ${tot.length?`<div style="overflow:auto"><table class="rc ch-tab"><tr><th>Personne</th>${T.map(t=>`<th class="r">${esc(t[1])}</th>`).join('')}<th class="r">Total</th></tr>${tot.map(x=>`<tr><td>${esc(nomDe(x.p))}</td>${T.map(t=>`<td class="r">${x.byT[t[0]]||''}</td>`).join('')}<td class="r"><b>${x.n}</b></td></tr>`).join('')}</table></div>`:'<div class="eq-s">Aucune absence enregistrée cette année.</div>'}`)}
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
export default {id:ID,kinds:KINDS,hub:'rh', /* 10/11 soir (Ethan) : module à part entière — son onglet « RH » (app.js / espace.js : vRh), plus une ligne du hub Équipe */
  xview(k,me,ctx){hook(ctx);TAB=k||TAB||'home';return view(TAB,me,ctx);},
  tasks,
  act(v,el,me,ctx){hook(ctx);const parts=String(v).split('|');const k=parts[0];
    if(k==='tab'){TAB=parts[1]||'home';ctx.go('x:'+ID+':'+TAB);return;}
    if(k==='habfile'){habOpenFile(parts[1],parts[2],ctx);return;}
    if(k==='navm'){NAVM=/^\d{4}-\d{2}$/.test(parts[1]||'')?parts[1]:null;ctx.render();return;} /* 10/11 nuit : navettes — mois affiché */
    if(k==='navw'){if(!navVoir(me,ctx)){ctx.toast('Réservé à la RH et au responsable d\'exploitation');return;}navWeekModal(parts[1],parts[2],me,ctx);return;}
    if(k==='navchoix'){if(!navEdit(me,ctx)){ctx.toast('Réservé à la RH et au responsable d\'exploitation');return;}const ch=parts[3]||'';
      if(ch==='prime'&&!confirm('Payer '+(parts[4]||'0').replace('.',',')+' h en prime sur la paie de ce mois ? Le compteur à reporter repart de zéro.'))return;
      const r=espaceNavChoisir(parts[1],parts[2],ch||null,+parts[4]||0);if(!r.ok){ctx.toast(r.why||'Refusé');return;}ctx.toast(ch==='prime'?'💶 Prime enregistrée (navette du mois)':ch==='reporter'?'↪ Reporter : les heures se replaceront sur les semaines pas pleines':'Choix annulé');ctx.render();return;}
    const kindOf=parts[1]||'';const okW=kindOf==='rhabs'?absEdit(me,ctx):rhEdit(me,ctx);if(!okW){ctx.toast(kindOf==='rhabs'?'Réservé au responsable d\'exploitation, à la RH et à l\'assistante RH':'Réservé à la RH / direction / administrateur');return;}
    if(k==='new'){modal(parts[1],null,me,ctx);return;}
    if(k==='newp'){modal(parts[1],null,me,ctx);setTimeout(()=>{const s=document.getElementById('rh-p');if(s)s.value=parts[2];},30);return;}
    if(k==='edit'){modal(parts[1],parts.slice(2).join('|'),me,ctx);return;}
    if(k==='hab'){habModal(parts[1]||'',parts[2]||'',me,ctx);return;}}};
