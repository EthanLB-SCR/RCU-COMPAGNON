// docs.js — DOCUMENTS D'ENTREPRISE à lire et signer (nuit du 09 au 10/10/2026, Ethan : « je te joins le règlement intérieur, importe-le dans la base de
// données, à signer obligatoirement par tout le monde ; ce sera pareil pour les notes de service »).
// · Documents (registre, kind « doc ») : règlement intérieur (texte intégral, src/reglement.js par défaut), notes de service (créées dans Exploitation →
//   Documents d'entreprise), questionnaire d'accueil « nouvel arrivant » (embauché / intérimaire). Chaque document dit à qui il s'applique (tous, postes, types).
// · Signatures (kind « docsig », id = <document>|<clé personne>) : nom, date, trait au doigt, réponses du questionnaire, date de fin de lecture.
// · Lecture DÉROULÉE : le bouton « J'ai lu » ne s'active qu'une fois le texte déroulé jusqu'en bas (ou s'il tient à l'écran) ; un questionnaire se valide point par point.
// · Notifications : docsTodo(compte) → « À lire et signer » tout en haut de l'accueil (règle d'Ethan : la documentation obligatoire passe avant tout).
import {regAll,regGet,regSet,regLoad,regLoaded} from './reg.js';
import {REGLEMENT} from './reglement.js';
import {ACCUEIL_ENTREPRISE_Q,PREVENTION} from './prevention.js';
import {POSTES_DEF,TYPES} from './acces.js';
let A=null;
export function initDocs(api){A=api;}
const esc=s=>String(s??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
export const docKey=acc=>acc?((acc.email||'').toLowerCase()||String(acc.id||'')):'';
const dFR=x=>x?new Date(x).toLocaleDateString('fr-FR'):'';
const dhFR=x=>x?new Date(x).toLocaleDateString('fr-FR')+' '+new Date(x).toLocaleTimeString('fr-FR',{hour:'2-digit',minute:'2-digit'}):'';
export const KINDS={reglement:'Règlement intérieur',note:'Note de service',flash:'Flash info sécurité',accueil_entreprise:'Accueil nouvel arrivant',politique:'Politique / charte',autre:'Document'};
/* 10/10 (retour Ethan) : les notes de service seront des PDF importés, à dérouler en entier avant de signer (comme le PPSPS) ; les flash info (presqu'accidents, sécurité) se signent par tous les postes exploitation */
export const EXPLOITATION_POSTES=POSTES_DEF.filter(p=>p[2]==='encadrement'||p[2]==='terrain').map(p=>p[0]);
export const isPdfDoc=d=>!!(d&&(d.url||d.data));
export const DEFAULT_DOCS=[
 Object.assign({},REGLEMENT,{req:{all:true},active:true,by:'Direction',builtin:true}),
 {id:'accueil_entreprise',kind:'accueil_entreprise',title:'Accueil sécurité nouvel arrivant',version:'v1 (provisoire)',at:'2026-10-09',qs:ACCUEIL_ENTREPRISE_Q.slice(),req:{all:true},active:true,by:'QHSE',builtin:true,
  intro:'À remplir une fois, à l’arrivée dans l’entreprise (embauche ou début de mission d’intérim) : tu confirmes point par point que l’accueil, notamment sécurité, t’a bien été fait. Si un point n’a pas été fait, ne le coche pas et dis-le à ton chef de chantier ou aux RH.'}];
export function docsLoad(){return regLoad(['doc','docsig']);}
export const docsReady=()=>regLoaded('doc')&&regLoaded('docsig');
// tous les documents : lignes serveur / appareil + défauts intégrés quand ils n'ont pas été remplacés
export function docsAll(){const rows=regAll('doc');const ids=new Set(rows.map(r=>r.id));return DEFAULT_DOCS.filter(d=>!ids.has(d.id)).concat(rows).filter(d=>d&&d.active!==false).sort((a,b)=>String(b.at||'')<String(a.at||'')?-1:1);}
export function docsArchived(){return regAll('doc').filter(d=>d&&d.active===false);}
export const docById=id=>docsAll().find(d=>d.id===id)||docsArchived().find(d=>d.id===id)||null;
// à qui s'applique un document : tous / postes / types de compte — un visiteur ne signe rien
export function docApplies(d,acc){if(!acc||acc.poste==='visiteur'||acc.active===false)return false;const r=d.req||{all:true};if(r.all)return true;if(Array.isArray(r.postes)&&r.postes.includes(acc.poste))return true;if(Array.isArray(r.types)&&r.types.includes(acc.type||'salarie'))return true;return false;}
export function docsFor(acc){return docsAll().filter(d=>docApplies(d,acc));}
export const docSig=(docId,key)=>regGet('docsig',docId+'|'+key);
export function docsTodo(acc){if(!acc)return [];const k=docKey(acc);return docsFor(acc).filter(d=>!docSig(d.id,k));}
export function docSigsOf(docId){return regAll('docsig').filter(s=>s.doc===docId);}
/* ── signature au doigt (nom + trait) : partagée avec le parcours d'accueil chantier (next.js) ── */
export function sigPadHTML(id){return `<canvas id="${id}" width="640" height="200" class="dr-pad" style="width:100%;height:140px;border:1.5px dashed #b8b4a8;border-radius:10px;background:#fff;touch-action:none"></canvas><div class="hint" style="margin-top:4px">Signe au doigt dans le cadre — la signature vaut « j'ai lu et compris ».</div>`;}
export function sigPadInit(id){const cv=document.getElementById(id);if(!cv)return {drawn:()=>false,png:()=>null,clear(){}};const cx=cv.getContext('2d');cx.lineWidth=3.4;cx.lineCap='round';cx.strokeStyle='#14213d';let drawing=false,drawn=false;
  const pos=e2=>{const r=cv.getBoundingClientRect();return {x:(e2.clientX-r.left)*cv.width/r.width,y:(e2.clientY-r.top)*cv.height/r.height};};
  cv.addEventListener('pointerdown',e2=>{drawing=true;drawn=true;const p=pos(e2);cx.beginPath();cx.moveTo(p.x,p.y);try{cv.setPointerCapture(e2.pointerId);}catch(e3){}});
  cv.addEventListener('pointermove',e2=>{if(!drawing)return;const p=pos(e2);cx.lineTo(p.x,p.y);cx.stroke();});
  const up=()=>{drawing=false;};cv.addEventListener('pointerup',up);cv.addEventListener('pointercancel',up);
  return {drawn:()=>drawn,png:()=>cv.toDataURL('image/png'),clear(){cx.clearRect(0,0,cv.width,cv.height);drawn=false;}};}
/* ── lecture déroulée : le conteneur .dr-body se déroule, « J'ai lu » s'active en bas (ou tout de suite si tout tient à l'écran) ── */
export function readGate(bodyEl,btnEl,onRead){if(!bodyEl||!btnEl)return;let done=false;const check=()=>{if(done)return;if(bodyEl.scrollTop+bodyEl.clientHeight>=bodyEl.scrollHeight-6){done=true;btnEl.disabled=false;btnEl.classList.add('primary');btnEl.textContent=btnEl.dataset.ok||'✓ J\'ai lu en entier';if(onRead)onRead();}};
  btnEl.disabled=true;btnEl.classList.remove('primary');bodyEl.addEventListener('scroll',check);setTimeout(check,60);setTimeout(check,400);return check;}
/* ── lecteur PDF intégré (pdf.js chargé à la demande, comme l'import de plans) ; repli : ouverture dans un onglet + attestation après 60 s — partagé : PPSPS de l'accueil chantier (accueil.js), notes de service / flash info PDF ── */
export async function mountPdfReader(file,host,alt,btn,onRead){const url=file.url||file.data;let lib=null;try{lib=A.loadPdfJs?await Promise.race([A.loadPdfJs(),new Promise((_,rej)=>setTimeout(()=>rej(new Error('délai')),6000))]):null;}catch(e){lib=null;}
  const fallback=()=>{host.style.display='none';alt.style.display='';const a=alt.querySelector('a');if(!a)return;a.addEventListener('click',()=>{btn.textContent='Lecture en cours… le bouton se débloque dans 60 s';setTimeout(()=>{if(!document.body.contains(btn))return;btn.disabled=false;btn.classList.add('primary');btn.textContent=btn.dataset.ok;onRead('attestation');},60000);});};
  if(!lib||!url){fallback();return;}
  try{const doc=await lib.getDocument({url,withCredentials:false}).promise;host.innerHTML='';const n=doc.numPages;const W=Math.min(host.clientWidth||600,900)-20;
    for(let i=1;i<=n;i++){const page=await doc.getPage(i);const vp0=page.getViewport({scale:1});const scale=W/vp0.width;const vp=page.getViewport({scale});const c=document.createElement('canvas');c.width=Math.round(vp.width);c.height=Math.round(vp.height);c.style.width='100%';c.style.display='block';c.style.margin='0 0 8px';host.appendChild(c);await page.render({canvasContext:c.getContext('2d'),viewport:vp}).promise;
      const lab=document.createElement('div');lab.className='hint';lab.style.textAlign='right';lab.textContent='page '+i+' / '+n;host.appendChild(lab);}
    const end=document.createElement('div');end.className='okbox';end.textContent='Fin du document ('+n+' page'+(n>1?'s':'')+').';host.appendChild(end);
    readGate(host,btn,()=>onRead('pdfjs'));}
  catch(e){console.warn('PDF',e);fallback();}}
/* ── ouverture d'un document : lecture (règlement, note) ou questionnaire (accueil entreprise), puis signature ── */
export function docOpen(docId,acc){const d=docById(docId);if(!d||!A)return;acc=acc||A.current();const key=docKey(acc);const mine=docSig(d.id,key);const ro=A.viewing&&A.viewing();
  const isQ=Array.isArray(d.qs)&&d.qs.length;const name=acc?(acc.name||acc.email||''):'';const pdf=!isQ&&isPdfDoc(d);
  const body=isQ
    ?`<div class="dr-q">${d.intro?`<p class="hint">${esc(d.intro)}</p>`:''}${d.qs.map((q,i)=>`<label class="dr-qi"><input type="checkbox" data-q="${i}" ${mine?'checked disabled':''}><span><b>${i+1}</b> ${esc(q)}</span></label>`).join('')}</div>`
    :pdf?`${d.html?`<div class="dr-doc" style="font-size:12.5px;margin-bottom:6px">${d.html}</div>`:''}<div class="pv-file"><b>📄 ${esc(d.file||d.title)}</b>${d.by?` <span class="dim">· ${esc(d.by)}${d.at?' · '+dFR(d.at):''}</span>`:''}</div><div class="dr-body pv-pdf" id="dr-body"><div class="hint" style="padding:10px">Chargement du document…</div></div><div id="dr-alt" style="display:none"><a class="btn block" href="${d.url||d.data}" target="_blank" rel="noopener">📄 Ouvrir le document dans un nouvel onglet</a><div class="hint" style="margin:4px 0">Le lecteur intégré n'est pas disponible ici (hors connexion ou appareil) : ouvre le document, lis-le en entier, puis atteste — le bouton se débloque après lecture.</div></div>`
    :`<div class="dr-body" id="dr-body"><div class="dr-doc">${d.html||'<p>(document vide)</p>'}</div></div>`;
  A.openModal(`<h3 style="margin-top:0">${esc(d.title)} <span class="hint">· ${esc(KINDS[d.kind]||d.kind)}${d.version?' · '+esc(d.version):''}</span></h3>
   ${body}
   ${mine?`<div class="okbox" style="margin-top:8px">✓ Signé par ${esc(mine.name||name)} le ${dhFR(mine.at)}.</div>`:ro?'<div class="warnbox" style="margin-top:8px">Lecture seule : tu regardes l\'appli comme quelqu\'un d\'autre.</div>':
     `<div id="dr-step1" style="margin-top:8px"><button class="btn block" id="dr-read" data-ok="${isQ?'✓ Tous les points sont confirmés — je signe':'✓ J\'ai lu en entier — je signe'}" disabled>${isQ?'Confirme chaque point pour pouvoir signer':pdf?'Déroule le document jusqu\'à la dernière page':'Déroule jusqu\'en bas pour pouvoir signer'}</button></div>
      <div id="dr-step2" style="display:none;margin-top:8px"><div class="okbox" style="margin:0 0 6px">Tu signes en tant que <b>${esc(name)}</b>.</div>${sigPadHTML('dr-pad')}<div class="actions" style="margin-top:8px"><button class="btn primary block" id="dr-ok">Valider ma signature</button><button class="btn block" id="dr-clear">Effacer le trait</button></div></div>`}
   <div class="actions" style="margin-top:8px"><button class="btn block" data-close>Fermer</button></div>`);
  if(mine||ro)return;
  const rd=document.getElementById('dr-read');let readAt=null;let readMode=null;
  if(pdf){mountPdfReader({url:d.url,data:d.data},document.getElementById('dr-body'),document.getElementById('dr-alt'),rd,mode=>{readAt=new Date().toISOString();readMode=mode;});}
  else if(isQ){const boxes=[...document.querySelectorAll('#modal input[data-q]')];const chk=()=>{const all=boxes.every(b=>b.checked);rd.disabled=!all;rd.classList.toggle('primary',all);rd.textContent=all?rd.dataset.ok:'Confirme chaque point pour pouvoir signer ('+boxes.filter(b=>b.checked).length+' / '+boxes.length+')';if(all)readAt=readAt||new Date().toISOString();};boxes.forEach(b=>b.addEventListener('change',chk));chk();}
  else readGate(document.getElementById('dr-body'),rd,()=>{readAt=new Date().toISOString();});
  rd.onclick=()=>{if(rd.disabled)return;document.getElementById('dr-step1').style.display='none';document.getElementById('dr-step2').style.display='';const pad=sigPadInit('dr-pad');document.getElementById('dr-clear').onclick=()=>pad.clear();
    document.getElementById('dr-ok').onclick=()=>{if(!pad.drawn()){A.toast('La signature (un trait au doigt)');return;}
      const answers=isQ?d.qs.map((q,i)=>({q,ok:true})):undefined;
      docSign(d,acc,{img:pad.png(),readAt,readMode:readMode||undefined,answers});A.closeModal();A.toast('« '+d.title+' » signé ✓');if(A.rerender)A.rerender();};};}
export function docSign(d,acc,extra){const key=docKey(acc);const sig=Object.assign({doc:d.id,ver:d.version||null,key,name:acc.name||acc.email||key,at:new Date().toISOString()},extra||{});
  regSet('docsig',d.id+'|'+key,sig,{local:!String(key).includes('@')}); /* personnage de démo : appareil seulement */return sig;}
/* ── Mon espace → Documents : ce qui me concerne, signé / à signer ── */
export function docsListHTML(acc){const k=docKey(acc);const mine=docsFor(acc);const todo=mine.filter(d=>!docSig(d.id,k));
  const row=d=>{const s=docSig(d.id,k);return `<button class="ac-row ${s?'':'todo'}" data-act="docopen" data-v="${esc(d.id)}"><span class="ic" style="background:${s?'#e6f5ec':'#fdeae7'}">${d.kind==='accueil_entreprise'?'🦺':d.kind==='flash'?'⚡':d.kind==='note'?'📌':'📘'}</span><span class="tx"><b>${esc(d.title)}</b><small>${esc(KINDS[d.kind]||d.kind)}${d.version?' · '+esc(d.version):''}${isPdfDoc(d)?' · PDF':''}${s?' · ✓ signé le '+dFR(s.at):' · <span style="color:#9b2c22;font-weight:700">à lire et signer</span>'}</small></span><span class="chev">›</span></button>`;};
  return `<h2 class="vt">Documents <span class="hint">· ${todo.length?todo.length+' à signer':'tout est signé'}</span></h2>
    ${todo.length?`<div class="ac-h"><b>À lire et signer</b><span>obligatoire</span></div>${todo.map(row).join('')}`:'<div class="ac-empty">✓ Tu as signé tous les documents qui te concernent.</div>'}
    ${mine.filter(d=>docSig(d.id,k)).length?`<div class="ac-h"><b>Signés</b><span>${mine.filter(d=>docSig(d.id,k)).length}</span></div>${mine.filter(d=>docSig(d.id,k)).map(row).join('')}`:''}
    <div class="hint" style="margin-top:8px">Un document se lit en entier (déroule jusqu'en bas) puis se signe au doigt. Le questionnaire d'accueil se confirme point par point.</div>`;}
/* ── Exploitation → Documents d'entreprise (administrateur, QSE) : liste, qui a signé, nouvelle note de service, archivage ── */
export function docsAdminHTML(people){people=people||[];const all=docsAll();const arch=docsArchived();
  const row=d=>{const sigs=docSigsOf(d.id);const conc=people.filter(p=>docApplies(d,p));const signed=conc.filter(p=>sigs.some(s=>s.key===docKey(p)));const pc=conc.length?Math.round(100*signed.length/conc.length):0;
    return `<button class="ac-row" data-act="docadm" data-v="${esc(d.id)}"><span class="ic" style="background:#e8f0fb">${d.kind==='accueil_entreprise'?'🦺':d.kind==='flash'?'⚡':d.kind==='note'?'📌':'📘'}</span><span class="tx"><b>${esc(d.title)}</b><small>${esc(KINDS[d.kind]||d.kind)}${d.version?' · '+esc(d.version):''} · ${esc(reqLabel(d))} · <b>${signed.length} / ${conc.length}</b> signé${signed.length>1?'s':''} (${pc} %)</small></span>${conc.length-signed.length?`<span class="ac-n">${conc.length-signed.length}</span>`:'<span class="ac-chk ok">✓</span>'}<span class="chev">›</span></button>`;};
  /* 10/10 (retour Ethan) : RH et direction voient QUI n'a pas signé ses documents obligatoires — par personne, les documents manquants */
  const late=people.map(p=>({p,miss:all.filter(d=>docApplies(d,p)&&!docSig(d.id,docKey(p)))})).filter(x=>x.miss.length).sort((a,b)=>b.miss.length-a.miss.length||String(a.p.name||'').localeCompare(String(b.p.name||'')));
  const conc=people.filter(p=>all.some(d=>docApplies(d,p)));
  const lateHTML=late.length?`<div class="ac-h"><b>À relancer — n'ont pas signé</b><span>${late.length} / ${conc.length} personne${conc.length>1?'s':''}</span></div>
    <div class="card" style="padding:4px 10px"><table class="rc" style="font-size:12px">${late.map(x=>`<tr><td><b>${esc(x.p.name||x.p.email)}</b><div class="dim" style="font-size:11px">${esc((POSTES_DEF.find(q=>q[0]===x.p.poste)||[])[1]||x.p.poste||'')}${x.p.type==='interim'?' · intérim':''}</div><div class="dim" style="font-size:11px;white-space:normal">${x.miss.map(d=>esc(d.title)).join(' · ')}</div></td><td style="color:#9b2c22;font-weight:700;white-space:nowrap;vertical-align:top">${x.miss.length} manquant${x.miss.length>1?'s':''}</td></tr>`).join('')}</table></div>
    <div class="actions" style="margin:6px 0 8px"><button class="btn block" data-act="doclate">🖨 Liste des retardataires (imprimable)</button></div>`
   :(conc.length?'<div class="okbox" style="margin:0 0 8px">✓ Tout le monde a signé ses documents obligatoires.</div>':'');
  return `<div class="eq-acts" style="margin:0 0 8px"><button class="btn primary" data-act="docnew" data-v="note">➕ Note de service</button><button class="btn primary" data-act="docnew" data-v="flash">⚡ Flash info sécurité</button></div>${lateHTML}<div class="ac-h"><b>Documents</b><span>${all.length}</span></div>${all.map(row).join('')}${arch.length?`<div class="ac-h"><b>Archivés</b><span>${arch.length}</span></div>${arch.map(d=>`<button class="ac-row" data-act="docadm" data-v="${esc(d.id)}"><span class="ic">🗄</span><span class="tx"><b>${esc(d.title)}</b><small>archivé le ${dFR(d.archivedAt)}</small></span><span class="chev">›</span></button>`).join('')}`:''}
    <div class="hint" style="margin-top:8px">Le règlement intérieur (Mars 2026) et l'accueil nouvel arrivant sont intégrés ; une note de service ou un flash info (PDF à dérouler en entier, ou texte) se crée ici et apparaît aussitôt « à lire et signer » chez les personnes concernées.</div>`;}
/* liste imprimable des retardataires (RH / direction) */
export function docsLateHTML(people){const all=docsAll();const late=people.map(p=>({p,miss:all.filter(d=>docApplies(d,p)&&!docSig(d.id,docKey(p)))})).filter(x=>x.miss.length).sort((a,b)=>String(a.p.name||'').localeCompare(String(b.p.name||'')));
  const rows=late.map(x=>`<tr><td><b>${esc(x.p.name||x.p.email)}</b></td><td>${esc((POSTES_DEF.find(q=>q[0]===x.p.poste)||[])[1]||'')}${x.p.type==='interim'?' (intérim)':''}</td><td>${x.miss.map(d=>esc(d.title)).join('<br>')}</td><td></td></tr>`).join('');
  return A.docHTML({title:'Documents obligatoires non signés',kicker:'Documents d\'entreprise · relances',sub:late.length+' personne'+(late.length>1?'s':'')+' à relancer',meta:[['Édité le',dFR(new Date())],['Documents',all.length]],body:`<table class="em"><tr><th>Nom</th><th>Poste</th><th>À signer</th><th>Relancé le</th></tr>${rows||'<tr><td colspan="4">Tout le monde est à jour.</td></tr>'}</table>`,css:'table.em td{vertical-align:top}',footLeft:'SCR'});}
export function reqLabel(d){const r=d.req||{all:true};if(r.all)return 'tout le monde';const parts=[];if(Array.isArray(r.postes)&&r.postes.length)parts.push(r.postes.map(p=>(POSTES_DEF.find(x=>x[0]===p)||[])[1]||p).join(', '));if(Array.isArray(r.types)&&r.types.length)parts.push(r.types.map(t=>TYPES[t]||t).join(', '));return parts.join(' · ')||'personne';}
export function docAdminOpen(docId,people){const d=docById(docId);if(!d)return;people=people||[];const sigs=docSigsOf(d.id);const conc=people.filter(p=>docApplies(d,p));
  const rows=conc.map(p=>{const s=sigs.find(x=>x.key===docKey(p));return `<tr><td>${esc(p.name||p.email)}</td><td class="dim">${esc((POSTES_DEF.find(x=>x[0]===p.poste)||[])[1]||p.poste||'')}</td><td>${s?'<span style="color:#15673a;font-weight:700">✓ '+dhFR(s.at)+'</span>':'<span style="color:#9b2c22;font-weight:700">à signer</span>'}</td><td>${s&&s.img?`<img src="${s.img}" style="height:22px">`:''}</td></tr>`;}).join('');
  A.openModal(`<h3 style="margin-top:0">${esc(d.title)} <span class="hint">· ${esc(KINDS[d.kind]||d.kind)}</span></h3><div class="kv" style="font-size:12px"><span>${esc(reqLabel(d))}</span><span>${d.version?esc(d.version):''}</span><span>${d.by?'par '+esc(d.by):''}</span><span>${dFR(d.at)}</span></div>
   ${d.html?`<div class="dr-body" style="max-height:34vh"><div class="dr-doc">${d.html}</div></div>`:''}${Array.isArray(d.qs)?`<ol style="font-size:12.5px;padding-left:18px">${d.qs.map(q=>`<li>${esc(q)}</li>`).join('')}</ol>`:''}
   <b style="font-size:12.5px">Signatures (${sigs.length} / ${conc.length})</b>${conc.length?`<div style="max-height:30vh;overflow:auto"><table class="rc" style="margin-top:4px">${rows}</table></div>`:'<div class="hint">Personne n\'est concerné (liste des comptes vide hors connexion).</div>'}
   <div class="actions" style="margin-top:8px">${d.builtin?'':(d.active===false?`<button class="btn block" id="dad-unarch">Remettre en ligne</button>`:`<button class="btn block" id="dad-arch" style="color:#d03b3b">Archiver (plus à signer)</button>`)}<button class="btn block" id="dad-print">🖨 Feuille des signatures</button><button class="btn block" data-close>Fermer</button></div>`);
  const ar=document.getElementById('dad-arch');if(ar)ar.onclick=()=>{if(!confirm('Archiver « '+d.title+' » ? Il ne sera plus demandé à personne.'))return;regSet('doc',d.id,{active:false,archivedAt:new Date().toISOString()});A.closeModal();A.toast('Document archivé');if(A.rerender)A.rerender();};
  const un=document.getElementById('dad-unarch');if(un)un.onclick=()=>{regSet('doc',d.id,{active:true,archivedAt:null});A.closeModal();if(A.rerender)A.rerender();};
  document.getElementById('dad-print').onclick=()=>{const w=window.open('','_blank');if(!w){A.toast('Autorise la fenêtre pop-up pour imprimer');return;}w.document.write(docSheetHTML(d,conc,sigs));w.document.close();};}
export function docSheetHTML(d,conc,sigs){const rows=conc.map(p=>{const s=sigs.find(x=>x.key===docKey(p));return `<tr><td><b>${esc(p.name||p.email)}</b></td><td>${esc((POSTES_DEF.find(x=>x[0]===p.poste)||[])[1]||'')}</td><td>${s?dhFR(s.at):''}</td><td>${s&&s.img?`<img src="${s.img}">`:''}</td></tr>`;}).join('');
  return A.docHTML({title:d.title,kicker:'Documents d\'entreprise · '+(KINDS[d.kind]||d.kind),sub:esc(reqLabel(d)),meta:[['Version',esc(d.version||'')],['Publié le',dFR(d.at)],['Signatures',sigs.length+' / '+conc.length]],body:`<h2>Émargements</h2><table class="em"><tr><th>Nom</th><th>Poste</th><th>Date</th><th>Signature</th></tr>${rows}</table>`,css:'table.em img{height:30px}table.em td{vertical-align:middle}',footLeft:'SCR'});}
export function docNewOpen(kind0){const postes=POSTES_DEF.filter(p=>p[0]!=='visiteur');const kind=kind0==='flash'?'flash':'note';
  /* 10/10 : note de service = PDF importé (déroulé en entier avant signature) ou texte ; flash info sécurité = idem, pour tous les postes exploitation (encadrement + terrain + intérimaires) */
  A.openModal(`<h3 style="margin-top:0">${kind==='flash'?'Nouveau flash info sécurité':'Nouvelle note de service'}</h3>
   <div class="row" style="display:flex;gap:6px;margin-bottom:6px"><button class="btn ${kind==='note'?'primary':''}" data-dnkind="note" style="flex:1">📌 Note de service</button><button class="btn ${kind==='flash'?'primary':''}" data-dnkind="flash" style="flex:1">⚡ Flash info sécurité</button></div>
   <label class="f">Titre</label><input class="f" id="dn-title" placeholder="${kind==='flash'?'ex. Flash info n° 7 — presqu\'accident tranchée Caen':'ex. Note de service n° 12 — horaires d\'hiver'}">
   <label class="f" style="margin-top:6px">Document PDF <span class="dim">(à dérouler en entier avant de signer — comme le PPSPS)</span></label><label class="btn block" id="dn-pdfbtn">📎 Choisir le PDF<input type="file" id="dn-pdf" accept="application/pdf" style="display:none"></label><div class="hint" id="dn-pdfname" style="margin:2px 0 0">${kind==='flash'?'aucun fichier — le flash info est toujours un PDF':'aucun fichier — sinon, écris le texte ci-dessous'}</div>
   ${kind==='flash'?'<input type="hidden" id="dn-text" value="">':`<label class="f" style="margin-top:6px">Texte <span class="dim">(si pas de PDF, ou en introduction ; un paragraphe par ligne)</span></label><textarea class="f" id="dn-text" style="min-height:90px" placeholder="Le texte que chacun devra lire en entier puis signer."></textarea>`}
   <label class="f" style="margin-top:6px">Qui doit ${kind==='flash'?'le':'la'} signer ?</label>
   <label class="tgl" style="display:flex;gap:6px;align-items:center;font-size:12.5px"><input type="radio" name="dn-req" value="exploit" ${kind==='flash'?'checked':''}> Tous les postes exploitation (encadrement travaux + terrain) + intérimaires</label>
   <label class="tgl" style="display:flex;gap:6px;align-items:center;font-size:12.5px"><input type="radio" name="dn-req" value="all" ${kind==='flash'?'':'checked'}> Tout le monde</label>
   <label class="tgl" style="display:flex;gap:6px;align-items:center;font-size:12.5px"><input type="radio" name="dn-req" value="postes"> Certains postes :</label>
   <div id="dn-postes" style="display:none;columns:2;font-size:12px;margin:4px 0 0 18px">${postes.map(p=>`<label style="display:block"><input type="checkbox" data-poste="${p[0]}"> ${esc(p[1])}</label>`).join('')}</div>
   <label class="tgl" style="display:flex;gap:6px;align-items:center;font-size:12.5px;margin-top:4px"><input type="checkbox" id="dn-interim" ${kind==='flash'?'checked':''}> Aussi les intérimaires / invités</label>
   <div class="actions" style="margin-top:8px"><button class="btn primary block" id="dn-ok">Publier — à lire et signer</button><button class="btn block" data-close>Annuler</button></div>`);
  document.querySelectorAll('#modal [data-dnkind]').forEach(b=>b.onclick=()=>{if(b.dataset.dnkind!==kind)docNewOpen(b.dataset.dnkind);});
  document.querySelectorAll('#modal input[name=dn-req]').forEach(r=>r.onchange=()=>{document.getElementById('dn-postes').style.display=document.querySelector('#modal input[name=dn-req]:checked').value==='postes'?'':'none';});
  let file=null;const pf=document.getElementById('dn-pdf');pf.onchange=()=>{file=pf.files[0]||null;document.getElementById('dn-pdfname').textContent=file?file.name+' · '+Math.round(file.size/1024)+' Ko':(kind==='flash'?'aucun fichier — le flash info est toujours un PDF':'aucun fichier — sinon, écris le texte ci-dessous');};
  document.getElementById('dn-ok').onclick=async()=>{const title=document.getElementById('dn-title').value.trim();const txt=kind==='flash'?'':(document.getElementById('dn-text').value||'').trim();if(!title||(!txt&&!file)){A.toast(kind==='flash'?'Un titre et le PDF':'Un titre, et un PDF ou un texte');return;}
    const html=txt?txt.split(/\n+/).map(l=>'<p>'+esc(l.trim())+'</p>').join(''):'';const mode=document.querySelector('#modal input[name=dn-req]:checked').value;const inter=document.getElementById('dn-interim').checked;
    const req=mode==='all'?{all:true}:mode==='exploit'?{postes:EXPLOITATION_POSTES.slice(),types:inter?['interim']:[]}:{postes:[...document.querySelectorAll('#dn-postes input:checked')].map(i=>i.dataset.poste),types:inter?['interim']:[]};
    if(mode==='postes'&&!req.postes.length&&!req.types.length){A.toast('Choisis au moins un poste');return;}
    let url=null,data=null;
    if(file){const b=document.getElementById('dn-ok');b.disabled=true;b.textContent='Envoi du PDF…';try{url=A.sync&&A.sync.uploadDoc?await A.sync.uploadDoc('entreprise','docs',file.name,file):null;}catch(e){url=null;}
      if(!url){if(file.size>1.5*1024*1024){A.toast('Hors connexion et PDF trop gros ('+Math.round(file.size/1024/1024*10)/10+' Mo) — reconnecte-toi pour le publier');b.disabled=false;b.textContent='Publier — à lire et signer';return;}
        data=await new Promise(res=>{const r=new FileReader();r.onload=()=>res(r.result);r.onerror=()=>res(null);r.readAsDataURL(file);});if(!data){A.toast('PDF illisible');b.disabled=false;b.textContent='Publier — à lire et signer';return;}}}
    const id=(kind==='flash'?'flash_':'note_')+Date.now().toString(36);
    regSet('doc',id,Object.assign({kind,title,html,req,active:true,at:new Date().toISOString(),by:A.userName?A.userName():''},file?{file:file.name,size:file.size,url:url||undefined,data:data||undefined}:{}));
    A.closeModal();A.toast((kind==='flash'?'Flash info publié':'Note publiée')+' — apparaît « à signer » chez les personnes concernées'+(data?' (PDF gardé dans l\'appli : hors connexion)':''));if(A.rerender)A.rerender();};}
export {PREVENTION};
