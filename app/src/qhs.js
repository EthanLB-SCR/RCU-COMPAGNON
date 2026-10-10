// qhs.js — QUART D'HEURE SÉCURITÉ dématérialisé (retour d'Ethan, 10/10 matin) : « on va dématérialiser de la même manière que l'accueil chantier,
// avec les parties prévention, petit questionnaire et émargement ; le chef de chantier, le conducteur ou le responsable d'exploitation décide
// "aujourd'hui, sur tel chantier ou tous mes chantiers, je déclenche ce quart d'heure sécurité que tout le monde doit faire" ».
// · Sujets : les 12 quarts d'heure SCR (qhs_scr.js, annexe 5 du guide sécurité) ; un sujet du registre (kind « qhstopic », {title,html,vf|qs}) prime sur celui de même id.
// · Déclenchement (kind « qhs ») : {topic, date, sites:['*'] ou [ids], by, note} — encadrement (qse.manage).
// · Signature (kind « qhsig », id = <déclenchement>|<clé personne>) : {run, site, name, key, at, img, answers} — la personne elle-même ou l'encadrement (tablette du chef, personne sans compte).
// · Notification sur l'accueil (espace.js) : « Quart d'heure sécurité à faire » pour chaque personne placée aujourd'hui sur un chantier concerné ; onglet QSE : bloc du jour.
import {regAll,regGet,regSet,regLoad,regLoaded} from './reg.js';
import {QHS_SCR_TOPICS} from './qhs_scr.js'; /* les 12 quarts d'heure SCR (annexe 5) */
import {sigPadHTML,sigPadInit,readGate} from './docs.js';
let A=null;
export function initQhs(api){A=api;}
const esc=s=>String(s??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const dFR=x=>x?new Date(x).toLocaleDateString('fr-FR'):'';
const dhFR=x=>x?new Date(x).toLocaleDateString('fr-FR')+' '+new Date(x).toLocaleTimeString('fr-FR',{hour:'2-digit',minute:'2-digit'}):'';
/* clé de la personne connectée = son e-mail (règle serveur : <déclenchement>|<e-mail> = my_key()) ; personnage de démo : son id (écriture locale seulement) */
export const qhsMyKey=()=>{const acc=A.current?A.current():null;if(acc)return (acc.email||'').toLowerCase()||String(acc.id||'');return A.userKey?A.userKey():null;};
const todayIso=()=>{if(A&&A.today){try{const t=A.today();if(t)return t;}catch(e){}}const d=new Date();return d.getFullYear()+'-'+String(d.getMonth()+1).padStart(2,'0')+'-'+String(d.getDate()).padStart(2,'0');};
export function qhsLoad(){return regLoad(['qhs','qhsig','qhstopic']);}
export const qhsReady=()=>regLoaded('qhs')&&regLoaded('qhsig');
/* ── sujets ── */
export function qhsTopics(){const rows=regAll('qhstopic');const ids=new Set(rows.map(r=>r.id));return QHS_SCR_TOPICS.filter(t=>!ids.has(t.id)).concat(rows).filter(t=>t&&t.active!==false&&t.title);}
export const qhsTopic=id=>qhsTopics().find(t=>t.id===id)||null;
/* ── déclenchements ── */
export function qhsRuns(){return regAll('qhs').filter(r=>r&&!r.deleted&&r.date&&r.topic);}
export const qhsCovers=(r,siteId)=>Array.isArray(r.sites)&&(r.sites.includes('*')||r.sites.includes(siteId));
export function qhsFor(siteId,date){date=date||todayIso();return qhsRuns().filter(r=>r.date===date&&qhsCovers(r,siteId)).sort((a,b)=>String(a.at||'').localeCompare(String(b.at||'')));}
export function qhsTrigger(o){const id='QH'+Date.now().toString(36)+Math.random().toString(36).slice(2,5);const t=qhsTopic(o.topic);
  regSet('qhs',id,{topic:o.topic,title:t?t.title:o.topic,date:o.date||todayIso(),sites:o.sites&&o.sites.length?o.sites:['*'],note:o.note||'',by:A.userName?A.userName():'',at:new Date().toISOString()});return id;}
export function qhsCancel(id){regSet('qhs',id,{deleted:true,deletedAt:new Date().toISOString(),deletedBy:A.userName?A.userName():''});}
/* ── signatures ── */
export const qhsSig=(runId,key)=>key?regGet('qhsig',runId+'|'+key):null;
export const qhsSigsOf=(runId,siteId)=>regAll('qhsig').filter(s=>s&&s.run===runId&&!s.deleted&&(!siteId||!s.site||s.site===siteId)).sort((a,b)=>String(a.at||'').localeCompare(String(b.at||'')));
export const qhsSigned=(run,key,name)=>{if(qhsSig(run.id,key))return true;const nn=String(name||'').trim().toLowerCase();return nn?qhsSigsOf(run.id).some(s=>String(s.name||'').trim().toLowerCase()===nn):false;};
/* ce qui attend une personne : les quarts d'heure du jour sur les chantiers où elle est placée, pas encore signés */
export function qhsTodo(key,name,siteIds,date){date=date||todayIso();const out=[];(siteIds||[]).forEach(id=>qhsFor(id,date).forEach(r=>{if(qhsSigned(r,key,name)||out.some(x=>x.run.id===r.id))return;out.push({run:r,site:id});}));return out;}
/* ── le parcours : sujet déroulé en entier → questions → signature ── */
export function qhsParcours(run,siteId,opts){opts=opts||{};const t=qhsTopic(run.topic);if(!t){A.toast('Sujet introuvable');return;}
  const as=opts.as||null;const me=as?as.name:(A.userName?A.userName():'');const key=as?as.key:qhsMyKey();const NET=A.net?A.net():null;const siteName=opts.siteName||(NET&&NET.id===siteId?NET.name:siteId);
  let step=0;const P={read:null,q:{}};
  const head=t2=>`<h3 style="margin-top:0">Quart d'heure sécurité <span class="hint">· ${esc(dFR(run.date))}${siteName?' · '+esc(siteName):''}</span></h3><div class="pv-steps">${[0,1,2].map(i=>`<i class="${i<step?'done':i===step?'cur':''}"></i>`).join('')}</div><div class="pv-title">${t2}</div>`;
  const render=()=>{
    if(step===0){A.openModal(head('① '+esc(t.title))+`${run.note?`<div class="okbox" style="margin-bottom:6px">${esc(run.by||'')} : ${esc(run.note)}</div>`:''}<div class="dr-body pv-mod" id="qh-body"><div class="dr-doc">${t.html||'<p>(sujet vide)</p>'}</div></div>
        <div class="actions" style="margin-top:8px"><button class="btn block" id="qh-read" data-ok="✓ Lu en entier — les questions" disabled>Déroule jusqu'en bas</button><button class="btn block" data-close>Plus tard</button></div>`);
      const rd=document.getElementById('qh-read');readGate(document.getElementById('qh-body'),rd,()=>{P.read=new Date().toISOString();});rd.onclick=()=>{if(rd.disabled)return;step=1;render();};return;}
    if(step===1){const VF=Array.isArray(t.vf)&&t.vf.length?t.vf:null; /* les 12 sujets SCR : quiz VRAI / FAUX, la bonne réponse s'affiche après chaque réponse */
      if(VF){const lab=a=>a==='V'?'VRAI':a==='F'?'FAUX':'VRAI et FAUX';const allDone=VF.every((q,i)=>P.q[i]);
        A.openModal(head('② Vrai ou faux ?')+`<div class="hint" style="margin:0 0 6px">Réponds à chaque question : la bonne réponse s'affiche aussitôt.</div><div class="qh-quiz">${VF.map(([q,a],i)=>{const r=P.q[i];const ok=r&&(a==='VF'||r.a===a);return `<div class="qh-q ${r?(ok?'ok':'ko'):''}"><div class="qh-qt"><b>${i+1}</b> ${esc(q)}</div><div class="qh-btns"><button type="button" data-qhv="${i}|V" class="${r&&r.a==='V'?'on':''}">VRAI</button><button type="button" data-qhv="${i}|F" class="${r&&r.a==='F'?'on':''}">FAUX</button></div>${r?`<div class="qh-ans">${ok?'✓ Exact':'✗ Non'} — la réponse : <b>${lab(a)}</b></div>`:''}</div>`;}).join('')}</div>
          <div class="actions" style="margin-top:8px"><button class="btn primary block" id="qh-next" ${allDone?'':'disabled'}>Je m'engage →</button><button class="btn block" id="qh-prev">‹ Relire le sujet</button><button class="btn block" data-close>Plus tard</button></div>`);
        document.querySelectorAll('#modal [data-qhv]').forEach(b=>b.onclick=()=>{const [i,a]=b.dataset.qhv.split('|');if(P.q[+i])return; /* une seule réponse par question */P.q[+i]={a,at:new Date().toISOString()};render();});
        document.getElementById('qh-next').onclick=()=>{if(!VF.every((q,i)=>P.q[i]))return;step=2;render();};document.getElementById('qh-prev').onclick=()=>{step=0;render();};return;}
      const qs=Array.isArray(t.qs)&&t.qs.length?t.qs:['J’ai compris le sujet du jour.'];
      A.openModal(head('② Je confirme')+`<div class="dr-q">${qs.map((q,i)=>`<label class="dr-qi"><input type="checkbox" data-qh="${i}" ${P.q[i]?'checked':''}><span><b>${i+1}</b> ${esc(q)}</span></label>`).join('')}</div>
        <div class="actions" style="margin-top:8px"><button class="btn primary block" id="qh-next" ${qs.every((q,i)=>P.q[i])?'':'disabled'}>Je m'engage →</button><button class="btn block" id="qh-prev">‹ Relire</button><button class="btn block" data-close>Plus tard</button></div>`);
      const boxes=[...document.querySelectorAll('#modal input[data-qh]')];boxes.forEach(b=>b.onchange=()=>{if(b.checked)P.q[+b.dataset.qh]={at:new Date().toISOString()};else delete P.q[+b.dataset.qh];document.getElementById('qh-next').disabled=!boxes.every(x=>x.checked);});
      document.getElementById('qh-next').onclick=()=>{if(!boxes.every(x=>x.checked))return;step=2;render();};document.getElementById('qh-prev').onclick=()=>{step=0;render();};return;}
    const VF=Array.isArray(t.vf)&&t.vf.length?t.vf:null;const score=VF?VF.filter(([q,a],i)=>P.q[i]&&(a==='VF'||P.q[i].a===a)).length:null;
    A.openModal(head('③ Je m’engage')+`<div class="okbox">Sujet lu${P.read?' le '+dhFR(P.read):''}${VF?' · quiz : <b>'+score+' / '+VF.length+'</b>':' · '+Object.keys(P.q).length+' point'+(Object.keys(P.q).length>1?'s':'')+' confirmé'+(Object.keys(P.q).length>1?'s':'')}.</div>
      ${t.slogan?`<div class="pv-ok" style="margin:6px 0"><b>Je m’engage</b><p>${esc(t.slogan)}.</p></div>`:''}
      <label class="f">Les retours de cet échange <span class="dim">(facultatif)</span></label><input class="f" id="qh-retour" placeholder="une remarque, une situation vue sur le chantier…">
      <div class="hint" style="margin:6px 0">${as?`Signature de <b>${esc(me)}</b> (sans compte — accueilli par ${esc(A.userName?A.userName():'')})`:`Tu signes en tant que <b>${esc(me)}</b>`} : la signature vaut participation au quart d'heure sécurité du jour.</div>${sigPadHTML('qh-pad')}
      <div class="actions" style="margin-top:8px"><button class="btn primary block" id="qh-sign">Je m'engage — valider ma participation</button><button class="btn block" id="qh-clear">Effacer le trait</button><button class="btn block" id="qh-prev">‹ Revenir aux questions</button></div>`);
    const pad=sigPadInit('qh-pad');document.getElementById('qh-clear').onclick=()=>pad.clear();document.getElementById('qh-prev').onclick=()=>{step=1;render();};
    document.getElementById('qh-sign').onclick=()=>{if(!pad.drawn()){A.toast('La signature (un trait au doigt)');return;}
      const k=key||('ext:'+String(me).toLowerCase().replace(/[^a-z0-9]+/g,'_'));const answers=VF?VF.map(([q,a],i)=>({q,a:P.q[i]?P.q[i].a:null,expected:a,ok:!!(P.q[i]&&(a==='VF'||P.q[i].a===a))})):(Array.isArray(t.qs)?t.qs:[]).map((q,i)=>({q,ok:!!P.q[i]}));
      const sig={run:run.id,site:siteId||null,name:me,key:k,at:new Date().toISOString(),img:pad.png(),readAt:P.read,answers,score:VF?score:undefined,total:VF?VF.length:undefined,retour:(document.getElementById('qh-retour').value||'').trim()||undefined,by:as?(A.userName?A.userName():''):undefined};
      regSet('qhsig',run.id+'|'+k,sig,{local:!as&&!String(k).includes('@')}); /* personnage de démo : appareil seulement ; personne sans compte : écrite par l'encadrant connecté */A.closeModal();A.toast('Quart d\'heure sécurité signé ✓');if(opts.after)opts.after(sig);};};
  render();}
/* ── déclenchement (encadrement) ── */
export function qhsTriggerOpen(opts){opts=opts||{};const topics=qhsTopics();const sites=opts.sites||[];const cur=opts.siteId||null;
  A.openModal(`<h3 style="margin-top:0">Déclencher un quart d'heure sécurité</h3>
   <div class="hint" style="margin:0 0 6px">Tout le monde placé sur le(s) chantier(s) concerné(s) ce jour-là (chef de chantier et opérateurs) le trouve sur son accueil et dans l'onglet QSE : sujet à dérouler, vrai / faux, « je m'engage » signé. Tu clos la séance avec ton retour et ta signature d'animateur.</div>
   <label class="f">Sujet</label><select class="f" id="qh-topic">${topics.map(t=>`<option value="${esc(t.id)}">${esc(t.title)}${t.exemple?' (exemple)':''}</option>`).join('')}</select>
   <label class="f" style="margin-top:6px">Quand</label><input class="f" type="date" id="qh-date" value="${todayIso()}">
   <label class="f" style="margin-top:6px">Où</label>
   ${cur?`<label class="tgl" style="display:flex;gap:6px;align-items:center;font-size:12.5px"><input type="radio" name="qh-where" value="here" checked> Ce chantier seulement</label>`:''}
   ${sites.length?`<label class="tgl" style="display:flex;gap:6px;align-items:center;font-size:12.5px"><input type="radio" name="qh-where" value="mine" ${cur?'':'checked'}> Mes chantiers (${sites.length})</label>`:''}
   <label class="tgl" style="display:flex;gap:6px;align-items:center;font-size:12.5px"><input type="radio" name="qh-where" value="all" ${cur||sites.length?'':'checked'}> Tous les chantiers de l'entreprise</label>
   <label class="f" style="margin-top:6px">Un mot pour l'équipe <span class="dim">(facultatif)</span></label><input class="f" id="qh-note" placeholder="ex. suite au presqu'accident de mardi">
   <div class="actions" style="margin-top:8px"><button class="btn primary block" id="qh-ok">Déclencher</button><button class="btn block" data-close>Annuler</button></div>`);
  document.getElementById('qh-ok').onclick=()=>{const topic=document.getElementById('qh-topic').value;const date=document.getElementById('qh-date').value||todayIso();const w=(document.querySelector('#modal input[name=qh-where]:checked')||{}).value||'all';
    const list=w==='here'?[cur]:w==='mine'?sites.slice():['*'];const id=qhsTrigger({topic,date,sites:list,note:document.getElementById('qh-note').value.trim()});A.closeModal();A.toast('Quart d\'heure sécurité déclenché'+(date===todayIso()?' pour aujourd\'hui':' pour le '+dFR(date)));if(opts.after)opts.after(id);};}
/* ── bloc de l'onglet QSE (jour J sur ce chantier) ── */
export function qhsBlockHTML(siteId,o){o=o||{};const runs=qhsFor(siteId,o.date);const key=qhsMyKey();const me=A.userName?A.userName():'';
  const who=s=>esc(s.name)+(s.total?' <span class="dim">('+(s.score||0)+'/'+s.total+')</span>':'');
  const rows=runs.map(r=>{const sigs=qhsSigsOf(r.id,siteId);const mine=o.canSign&&qhsSigned(r,key,me);const t=qhsTopic(r.topic)||{};return `<div class="card" style="${o.canSign&&!mine&&!r.closedAt?'border-color:#eb6834;background:#fff4ee':''}"><b>⛑️ ${esc(r.title||r.topic)}</b>${t.slogan?` <span class="dim" style="font-size:11.5px">· « ${esc(t.slogan)} »</span>`:''}<div class="dim" style="font-size:11.5px">animateur : ${esc(r.by||'')}${r.sites&&r.sites.includes('*')?' · tous les chantiers':''}${r.closedAt?' · <b>séance close</b> le '+dhFR(r.closedAt):''}</div>${r.note?`<div class="hint" style="margin:2px 0">${esc(r.note)}</div>`:''}
      ${o.canSign?(mine?'<div class="okbox" style="margin:6px 0">✓ Tu as participé.</div>':r.closedAt?'':`<button class="btn primary block" data-qhdo="${esc(r.id)}" style="margin:6px 0">Faire le quart d'heure sécurité →</button>`):''}
      <div style="font-size:12px"><b>${sigs.length}</b> participation${sigs.length>1?'s':''}${sigs.length?' : '+sigs.map(who).join(', '):''}</div>
      ${sigs.some(s2=>s2.retour)?`<div class="hint" style="margin-top:2px">Retours : ${sigs.filter(s2=>s2.retour).map(s2=>esc(s2.name)+' — « '+esc(s2.retour)+' »').join(' · ')}</div>`:''}
      ${r.retour?`<div class="okbox" style="margin-top:4px;font-size:12px">Retour animateur : ${esc(r.retour)}</div>`:''}
      <div class="actions" style="margin-top:6px;display:flex;gap:6px;flex-wrap:wrap">${o.canManage?`${r.closedAt?'':`<button class="btn sm" data-qhext="${esc(r.id)}">👤 Faire participer quelqu'un sans compte</button><button class="btn sm" data-qhclose="${esc(r.id)}">✍️ Retour & signature animateur</button>`}<button class="btn sm" data-qhprint="${esc(r.id)}">🖨 Feuille</button>${r.closedAt?'':`<button class="btn sm" data-qhcancel="${esc(r.id)}" style="color:#d03b3b">Annuler</button>`}`:''}</div></div>`;}).join('');
  return `<div class="ac-h"><b>Quart d'heure sécurité du jour</b><span>${runs.length?runs.length+' déclenché'+(runs.length>1?'s':''):'aucun aujourd\'hui'}</span></div>${rows}${o.canManage?`<button class="btn block" data-qhnew="1" style="margin:4px 0 8px">⛑️ Déclencher un quart d'heure sécurité</button>`:''}`;}
/* ── clôture par l'animateur : « retour animateur » + signature (le bas de la fiche SCR) ── */
export function qhsCloseOpen(run,opts){opts=opts||{};const sigs=qhsSigsOf(run.id);
  A.openModal(`<h3 style="margin-top:0">Clore la séance <span class="hint">· ${esc(run.title||run.topic)} · ${esc(dFR(run.date))}</span></h3>
   <div class="okbox">${sigs.length} participation${sigs.length>1?'s':''}${sigs.length?' : '+sigs.map(s2=>esc(s2.name)).join(', '):''}.</div>
   <label class="f" style="margin-top:6px">Retour animateur</label><textarea class="f" id="qhc-retour" style="min-height:64px" placeholder="ce qui est ressorti de l'échange, les points à reprendre">${esc(run.retour||'')}</textarea>
   <label class="f" style="margin-top:6px">Signature animateur <span class="dim">(${esc(A.userName?A.userName():'')})</span></label>${sigPadHTML('qhc-pad')}
   <div class="actions" style="margin-top:8px"><button class="btn primary block" id="qhc-ok">Clore la séance</button><button class="btn block" id="qhc-save">Enregistrer le retour sans clore</button><button class="btn block" id="qhc-clear">Effacer le trait</button><button class="btn block" data-close>Annuler</button></div>`);
  const pad=sigPadInit('qhc-pad');document.getElementById('qhc-clear').onclick=()=>pad.clear();
  document.getElementById('qhc-save').onclick=()=>{regSet('qhs',run.id,{retour:document.getElementById('qhc-retour').value.trim()});A.closeModal();A.toast('Retour enregistré');if(opts.after)opts.after();};
  document.getElementById('qhc-ok').onclick=()=>{if(!pad.drawn()){A.toast('La signature de l\'animateur (un trait au doigt)');return;}
    regSet('qhs',run.id,{retour:document.getElementById('qhc-retour').value.trim(),closedAt:new Date().toISOString(),animSig:{name:A.userName?A.userName():'',at:new Date().toISOString(),img:pad.png()}});A.closeModal();A.toast('Séance close — feuille d\'émargement à jour');if(opts.after)opts.after();};}
export function qhsSheetHTML(run,siteId,siteName){const t=qhsTopic(run.topic)||{};const sigs=qhsSigsOf(run.id,siteId);const VF=Array.isArray(t.vf)&&t.vf.length?t.vf:null;
  const body=`${t.slogan?`<div class="card soft"><b>Je m’engage :</b> ${esc(t.slogan)}.</div>`:''}<h2>Sujet</h2><div>${t.html||''}</div>${VF?`<h2>Vrai / faux</h2><ul>${VF.map(([q,a])=>`<li>${esc(q)} — <b>${a==='V'?'VRAI':a==='F'?'FAUX':'VRAI et FAUX'}</b></li>`).join('')}</ul>`:Array.isArray(t.qs)&&t.qs.length?`<h2>Questions</h2><ul>${t.qs.map(q=>`<li>${esc(q)}</li>`).join('')}</ul>`:''}
   <h2>Je m’engage — participations (${sigs.length})</h2><table class="em"><tr><th>Nom</th><th>Date</th><th>${VF?'Quiz':''}</th><th>Les retours de cet échange</th><th>Signature</th></tr>${sigs.map(s=>`<tr><td><b>${esc(s.name)}</b>${s.by?'<div class="dim">accueilli par '+esc(s.by)+'</div>':''}</td><td>${dhFR(s.at)}</td><td>${s.total?(s.score||0)+' / '+s.total:''}</td><td>${esc(s.retour||'')}</td><td>${s.img?`<img src="${s.img}">`:''}</td></tr>`).join('')}${Array.from({length:Math.max(0,6-sigs.length)}).map(()=>'<tr><td style="height:36px"></td><td></td><td></td><td></td><td></td></tr>').join('')}</table>
   <h2>Animateur</h2><table class="em"><tr><th>Date</th><th>Animateur</th><th>Retour animateur</th><th>Signature animateur</th></tr><tr><td>${dFR(run.date)}</td><td>${esc(run.by||'')}</td><td style="white-space:pre-wrap">${esc(run.retour||'')}</td><td>${run.animSig&&run.animSig.img?`<img src="${run.animSig.img}">`:''}</td></tr></table>`;
  return A.docHTML({title:'Quart d’heure sécurité — '+(run.title||run.topic),kicker:'QSE · Quart d’heure sécurité SCR',sub:esc(siteName||''),meta:[['Date',dFR(run.date)],['Animateur',esc(run.by||'')],['Participations',String(sigs.length)],['Séance',run.closedAt?'close le '+dFR(run.closedAt):'en cours']],body,css:'li{margin:4px 0}table.em img{height:34px}table.em td{vertical-align:middle}.qh-two{display:flex;gap:16px}.qh-two>div{flex:1}.qh-notion{margin:6px 0}',footLeft:esc(siteName||'')});}
/* ── suivi (Exploitation) : par jour, les déclenchements et le taux de participation sur les chantiers concernés ── */
export function qhsRecapHTML(sitesInfo,days){days=days||14;const runs=qhsRuns().slice().sort((a,b)=>String(b.date).localeCompare(String(a.date))||String(b.at||'').localeCompare(String(a.at||''))).slice(0,40);
  if(!runs.length)return '<div class="ac-empty">Aucun quart d\'heure sécurité déclenché pour l\'instant.</div>';
  return `<div class="card" style="padding:4px 10px"><table class="rc" style="font-size:12px"><tr><th>Date</th><th>Sujet</th><th>Où</th><th>Par</th><th>Participations</th></tr>${runs.map(r=>{const where=r.sites&&r.sites.includes('*')?'tous les chantiers':(r.sites||[]).map(id=>{const c=sitesInfo.find(x=>x.id===id);return c?c.nom:id;}).join(', ');const n=qhsSigsOf(r.id).length;return `<tr><td>${dFR(r.date)}</td><td><b>${esc(r.title||r.topic)}</b>${r.note?'<div class="dim">'+esc(r.note)+'</div>':''}</td><td>${esc(where)}</td><td>${esc(r.by||'')}</td><td><b>${n}</b></td></tr>`;}).join('')}</table></div>`;}
