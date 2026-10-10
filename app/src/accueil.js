// accueil.js — PARCOURS D'ACCUEIL CHANTIER et CONTRÔLE CHANTIER (nuit du 09 au 10/10/2026, demande d'Ethan).
// Parcours (chaque personne, à chaque nouveau chantier) : le PPSPS s'ouvre et doit être déroulé en entier → « Lu » → point 1 signé → points 2 à 10 ;
// au point 4 un lien ouvre le dossier DICT sans fermer le questionnaire (on garde la trace que la personne y a eu accès) ; chaque point qui le mérite
// porte un petit module de prévention à dérouler avant de cocher « j'ai compris » ; à la fin, signature au doigt → émargement dans le document
// « Accueil chantier » du chantier (QSE) + FICHE D'ACCUEIL propre (nom du chantier, personne, date, points, PPSPS, DICT, modules lus).
// Contrôle chantier : la trame SCR (Angers 07/07/2026) en formulaire C / NC / NA / Non vu + actions, situation à risque, propositions → rapport imprimable.
import {ACCUEIL_CHANTIER_Q,ACCUEIL_MODULES,PREVENTION,CONTROLE_DEF,CONTROLE_ETATS} from './prevention.js';
import {sigPadHTML,sigPadInit,readGate} from './docs.js';
import {docHTML} from './charte.js';
let A=null;
export function initAccueil(api){A=api;}
const esc=s=>String(s??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const dFR=x=>x?new Date(x).toLocaleDateString('fr-FR'):'';
const dhFR=x=>x?new Date(x).toLocaleDateString('fr-FR')+' '+new Date(x).toLocaleTimeString('fr-FR',{hour:'2-digit',minute:'2-digit'}):'';
const qid=()=>'Q'+Date.now().toString(36)+Math.random().toString(36).slice(2,5);
// document « Accueil chantier » permanent du chantier (émargé par chaque arrivant via le parcours) — créé à la première demande
export function accueilStanding(q,NET){if(!q)return null;let d=(q.docs||[]).find(x=>x&&!x.deleted&&x.type==='accueil'&&x.standing);
  if(!d){d={id:'ACC-'+String(NET.id||'').replace(/[^\w-]/g,'').slice(0,40),type:'accueil',standing:true,required:true,title:'Accueil chantier — '+(NET.name||NET.id),by:A.userName(),at:new Date().toISOString(),qs:ACCUEIL_CHANTIER_Q.slice(),sigs:[]};q.docs.push(d);A.saveNet('qse');}
  return d;}
const adminDocs=(NET,cat)=>((NET.admin&&Array.isArray(NET.admin.docs))?NET.admin.docs:[]).filter(d=>d.cat===cat&&(d.url||d.data));
function referentsHTML(NET){const f=NET.fiche||{};const who=k=>{if(!k)return '—';const acc=(A.accountsAll?A.accountsAll():[]).find(a=>(a.email||'').toLowerCase()===k||String(a.id)===k||('l:'+a.id)===k);return acc?esc(acc.name||acc.email):esc(String(k).replace(/^l:/,''));};
  return `<table class="rc"><tr><td>Chantier</td><td><b>${esc(NET.name||'')}</b>${f.ville?' · '+esc(f.ville):''}</td></tr><tr><td>Chef de chantier</td><td><b>${who(f.chef)}</b></td></tr><tr><td>Conducteur de travaux</td><td><b>${who(f.conducteur)}</b></td></tr><tr><td>Horaires</td><td>${esc(f.horaires||'transmis par le responsable d’exploitation (variables selon la saison)')}</td></tr><tr><td>Point de rassemblement</td><td>${esc(f.rassemblement||'base vie (sauf consigne du chef de chantier)')}</td></tr></table>`;}
/* ── le parcours ── */
let RESUME=null; /* parcours en cours (si la fenêtre a été fermée par mégarde, on reprend où on en était) */
export function accueilParcours(d0,opts){opts=opts||{};const NET=A.net();if(!NET||!d0)return;const me=A.userName();const key=A.userKey?A.userKey():null;
  const fresh={startedAt:new Date().toISOString(),ppsps:null,dict:null,q:{},read:[]};const same=RESUME&&RESUME.docId===d0.id&&RESUME.key===key&&RESUME.site===NET.id;const P=same?RESUME.P:fresh;const pp=adminDocs(NET,'ppsps');const dict=adminDocs(NET,'dt');
  const total=ACCUEIL_CHANTIER_Q.length;let step=same?RESUME.step:0; // 0 = PPSPS, 1..10 = points, 11 = signature
  const head=t=>`<h3 style="margin-top:0">Accueil chantier <span class="hint">· ${esc(NET.name||'')}</span></h3><div class="pv-steps">${Array.from({length:total+2}).map((_,i)=>`<i class="${i<step?'done':i===step?'cur':''}"></i>`).join('')}</div><div class="pv-title">${t}</div>`;
  const render=()=>{RESUME={docId:d0.id,key,site:NET.id,P,step};
    if(step===0){ /* PPSPS */
      const file=pp[pp.length-1];
      A.openModal(head('① Le PPSPS du chantier')+`<p class="hint" style="margin:0 0 6px">Plan particulier de sécurité et de protection de la santé : il décrit les risques du chantier et les mesures prises. Il se lit <b>en entier</b> avant de signer le point 1.</p>
        ${file?`<div class="pv-file"><b>📄 ${esc(file.name)}</b> <span class="dim">· déposé le ${dFR(file.at)}${file.by?' par '+esc(file.by):''}</span></div><div class="dr-body pv-pdf" id="pv-pdf"><div class="hint" style="padding:10px">Chargement du document…</div></div>
          <div id="pv-alt" style="display:none"><a class="btn block" id="pv-openpdf" href="${file.url||file.data}" target="_blank" rel="noopener">📄 Ouvrir le PPSPS dans un nouvel onglet</a><div class="hint" style="margin:4px 0">Le lecteur intégré n'est pas disponible ici (hors connexion ou appareil) : ouvre le PPSPS, lis-le en entier, puis atteste — le bouton se débloque après lecture.</div></div>`
          :`<div class="warnbox">Aucun PPSPS au dossier administratif de ce chantier (catégorie PPSPS). Demande-le à ton chef de chantier : il le dépose depuis l'onglet Dossier.</div><label class="tgl" style="display:flex;gap:6px;align-items:flex-start;margin-top:8px;font-size:12.5px"><input type="checkbox" id="pv-paper"><span>Le PPSPS m'a été présenté <b>sur papier</b> par le chef de chantier et je l'ai lu en entier (sera noté sur la fiche d'accueil).</span></label>`}
        <div class="actions" style="margin-top:8px"><button class="btn block" id="pv-read" data-ok="✓ J'ai lu le PPSPS en entier — je le signe (point 1)" disabled>${file?'Déroule le PPSPS jusqu\'à la dernière page':'Coche la case ci-dessus'}</button><button class="btn block" data-close>Plus tard</button></div>`);
      const rd=document.getElementById('pv-read');
      if(file){mountPdf(file,document.getElementById('pv-pdf'),document.getElementById('pv-alt'),rd,mode=>{P.ppsps={name:file.name,id:file.id,readAt:new Date().toISOString(),mode};});}
      else{const cb=document.getElementById('pv-paper');cb.onchange=()=>{rd.disabled=!cb.checked;rd.classList.toggle('primary',cb.checked);if(cb.checked){rd.textContent=rd.dataset.ok;P.ppsps={name:null,readAt:new Date().toISOString(),mode:'papier'};}};}
      rd.onclick=()=>{if(rd.disabled)return;P.q[1]={at:new Date().toISOString()};step=1;render();};return;}
    if(step>=1&&step<=total){const n=step;const mods=(ACCUEIL_MODULES[n]||[]).map(id=>({id,m:PREVENTION[id]})).filter(x=>x.m);const done=!!P.q[n];
      const modRow=x=>{const read=P.read.includes(x.id);return `<button class="ac-row ${read?'':'todo'}" data-pvmod="${x.id}"><span class="ic" style="background:${read?'#e6f5ec':'#fff4d6'}">${read?'✓':'📖'}</span><span class="tx"><b>${esc(x.m.title)}</b><small>${read?'lu':'à dérouler en entier avant de valider le point'}</small></span><span class="chev">›</span></button>`;};
      const allRead=mods.every(x=>P.read.includes(x.id));const needDict=n===4&&dict.length>0;const dictOk=!needDict||!!P.dict;
      A.openModal(head(`Point ${n} / ${total}`)+`<div class="pv-q"><b>${n}</b><span>${esc(ACCUEIL_CHANTIER_Q[n-1])}</span></div>
        ${n===1?`<div class="okbox">PPSPS lu${P.ppsps&&P.ppsps.mode==='papier'?' (présenté sur papier)':''} le ${dhFR(P.ppsps&&P.ppsps.readAt)} — la signature finale vaut émargement du PPSPS.</div>`:''}
        ${n===2?`<div class="hint">Aptitude médicale, attestations de formation (AIPR, CACES, SST, QS soudeur…), carte BTP, QR code : tu les montres au chef de chantier. Tes habilitations enregistrées sont dans Mon espace → Habilitations.</div>`:''}
        ${n===4?`<div class="pv-dict">${dict.length?`<div><b>Dossier DICT du chantier</b> <span class="dim">· ${dict.length} pièce${dict.length>1?'s':''} au dossier administratif</span></div>${dict.map(d=>`<a class="btn block" data-pvdict="${esc(d.id)}" href="${d.url||d.data}" target="_blank" rel="noopener" style="margin-top:4px;justify-content:space-between"><span>📎 ${esc(d.name)}</span><span class="dim">${dFR(d.at)}</span></a>`).join('')}<div class="hint" style="margin-top:4px">${P.dict?'✓ dossier ouvert le '+dhFR(P.dict.at):'Ouvre au moins une pièce (le questionnaire reste ouvert) : la fiche d\'accueil gardera la trace que tu y as eu accès.'}</div>`:`<div class="warnbox">Aucune DICT au dossier administratif de ce chantier — signalé au chef de chantier sur la fiche d'accueil.</div>`}</div>`:''}
        ${mods.length?`<div class="ac-h"><b>Prévention</b><span>${mods.filter(x=>P.read.includes(x.id)).length} / ${mods.length} lu${mods.length>1?'s':''}</span></div>${mods.map(modRow).join('')}`:''}
        <label class="tgl pv-ok-row ${allRead&&dictOk?'':'off'}"><input type="checkbox" id="pv-chk" ${done?'checked':''} ${allRead&&dictOk?'':'disabled'}><span>J'ai compris et je valide ce point${!allRead?' <span class="dim">(lis d\'abord la prévention)</span>':!dictOk?' <span class="dim">(ouvre d\'abord le dossier DICT)</span>':''}</span></label>
        <div class="actions" style="margin-top:8px"><button class="btn primary block" id="pv-next" ${done?'':'disabled'}>${n===total?'Terminer → signature':'Point suivant →'}</button>${n>1?'<button class="btn block" id="pv-prev">‹ Point précédent</button>':''}<button class="btn block" data-close>Plus tard</button></div>`);
      document.querySelectorAll('#modal [data-pvmod]').forEach(b=>b.onclick=()=>readModule(b.dataset.pvmod,NET,()=>{if(!P.read.includes(b.dataset.pvmod))P.read.push(b.dataset.pvmod);render();}));
      document.querySelectorAll('#modal [data-pvdict]').forEach(a=>a.addEventListener('click',()=>{P.dict={at:new Date().toISOString(),id:a.dataset.pvdict};setTimeout(render,300);}));
      const cb=document.getElementById('pv-chk');cb.onchange=()=>{if(cb.checked)P.q[n]={at:new Date().toISOString()};else delete P.q[n];document.getElementById('pv-next').disabled=!cb.checked;};
      document.getElementById('pv-next').onclick=()=>{if(!P.q[n])return;step=n+1;render();};const pv=document.getElementById('pv-prev');if(pv)pv.onclick=()=>{step=n-1;render();};return;}
    /* signature */
    A.openModal(head('Signature')+`<div class="okbox">${total} points validés${P.ppsps?' · PPSPS lu':''}${P.dict?' · DICT consultée':''} · ${P.read.length} module${P.read.length>1?'s':''} de prévention lu${P.read.length>1?'s':''}.</div>
      <div class="hint" style="margin:6px 0">Tu signes en tant que <b>${esc(me)}</b> : ta signature vaut émargement de l'accueil chantier et du PPSPS. Une fiche d'accueil à ton nom est produite.</div>${sigPadHTML('pv-pad')}
      <div class="actions" style="margin-top:8px"><button class="btn primary block" id="pv-sign">Valider mon accueil chantier</button><button class="btn block" id="pv-clear">Effacer le trait</button><button class="btn block" id="pv-prev">‹ Revenir aux points</button></div>`);
    const pad=sigPadInit('pv-pad');document.getElementById('pv-clear').onclick=()=>pad.clear();document.getElementById('pv-prev').onclick=()=>{step=total;render();};
    document.getElementById('pv-sign').onclick=()=>{if(!pad.drawn()){A.toast('La signature (un trait au doigt)');return;}
      const sig={name:me,uid:key||undefined,detail:'parcours d’accueil',at:new Date().toISOString(),img:pad.png(),parcours:{startedAt:P.startedAt,ppsps:P.ppsps,dict:P.dict,dictMissing:!dict.length,q:P.q,read:P.read.slice(),qs:ACCUEIL_CHANTIER_Q.slice()}};
      d0.sigs=d0.sigs||[];d0.sigs.push(sig);d0.upd=new Date().toISOString();A.saveNet('qse');RESUME=null;A.closeModal();A.toast('Accueil chantier signé ✓');
      if(opts.after)opts.after(sig);};};
  render();}
// module de prévention : se déroule en entier avant « Lu »
function readModule(id,NET,onRead){const m=PREVENTION[id];if(!m)return;const html=m.html.replace('{{REFERENTS}}',referentsHTML(NET));
  A.openModal(`<h3 style="margin-top:0">${esc(m.title)} <span class="hint">· prévention</span></h3><div class="dr-body pv-mod" id="pv-mod"><div class="dr-doc">${html}</div></div>
    <div class="actions" style="margin-top:8px"><button class="btn block" id="pv-mread" data-ok="✓ Lu en entier — retour au point" disabled>Déroule jusqu'en bas</button></div>`);
  const rd=document.getElementById('pv-mread');readGate(document.getElementById('pv-mod'),rd);rd.onclick=()=>{if(rd.disabled)return;onRead();};}
// lecteur PDF intégré (pdf.js chargé à la demande, comme l'import de plans) ; repli : ouverture dans un onglet + attestation après 60 s
async function mountPdf(file,host,alt,btn,onRead){const url=file.url||file.data;let lib=null;try{lib=A.loadPdfJs?await Promise.race([A.loadPdfJs(),new Promise((_,rej)=>setTimeout(()=>rej(new Error('délai')),6000))]):null;}catch(e){lib=null;}
  const fallback=()=>{host.style.display='none';alt.style.display='';let opened=0;const a=document.getElementById('pv-openpdf');a.addEventListener('click',()=>{opened=Date.now();btn.textContent='Lecture en cours… le bouton se débloque dans 60 s';setTimeout(()=>{if(!document.getElementById('pv-read'))return;btn.disabled=false;btn.classList.add('primary');btn.textContent=btn.dataset.ok;onRead('attestation');},60000);});};
  if(!lib||!url){fallback();return;}
  try{const doc=await lib.getDocument({url,withCredentials:false}).promise;host.innerHTML='';const n=doc.numPages;const W=Math.min(host.clientWidth||600,900)-20;
    for(let i=1;i<=n;i++){const page=await doc.getPage(i);const vp0=page.getViewport({scale:1});const scale=W/vp0.width;const vp=page.getViewport({scale});const c=document.createElement('canvas');c.width=Math.round(vp.width);c.height=Math.round(vp.height);c.style.width='100%';c.style.display='block';c.style.margin='0 0 8px';host.appendChild(c);await page.render({canvasContext:c.getContext('2d'),viewport:vp}).promise;
      const lab=document.createElement('div');lab.className='hint';lab.style.textAlign='right';lab.textContent='page '+i+' / '+n;host.appendChild(lab);}
    const end=document.createElement('div');end.className='okbox';end.textContent='Fin du PPSPS ('+n+' page'+(n>1?'s':'')+').';host.appendChild(end);
    readGate(host,btn,()=>onRead('pdfjs'));}
  catch(e){console.warn('PPSPS',e);fallback();}}
/* ── fiche d'accueil (par personne) ── */
export function ficheAccueilHTML(d0,sig,NET){const p=sig.parcours||{};const qs=p.qs||d0.qs||ACCUEIL_CHANTIER_Q;const f=NET.fiche||{};
  const body=`<h2>Points de l'accueil</h2><table class="em"><tr><th>#</th><th>Point</th><th>Validé le</th></tr>${qs.map((q,i)=>`<tr><td>${i+1}</td><td>${esc(q)}</td><td>${p.q&&p.q[i+1]?dhFR(p.q[i+1].at):'—'}</td></tr>`).join('')}</table>
    <h2>Documents présentés</h2><ul><li><b>PPSPS</b> : ${p.ppsps?(p.ppsps.mode==='papier'?'présenté sur papier par le chef de chantier, lu le '+dhFR(p.ppsps.readAt):'« '+esc(p.ppsps.name||'')+' » lu en entier dans l’application le '+dhFR(p.ppsps.readAt)+(p.ppsps.mode==='attestation'?' (ouvert dans un onglet, attestation de lecture)':'')):'non renseigné'}</li>
    <li><b>DICT</b> : ${p.dict?'dossier consulté le '+dhFR(p.dict.at):p.dictMissing?'<span class="hot">aucune DICT au dossier administratif au moment de l’accueil</span>':'non consultée'}</li>
    <li><b>Modules de prévention lus</b> : ${(p.read||[]).length?(p.read||[]).map(id=>esc((PREVENTION[id]||{}).title||id)).join(' · '):'—'}</li></ul>
    <h2>Signature</h2><table class="em"><tr><th>Nom</th><th>Date</th><th>Signature</th></tr><tr><td><b>${esc(sig.name)}</b></td><td>${dhFR(sig.at)}</td><td>${sig.img?`<img src="${sig.img}">`:''}</td></tr></table>
    <div class="card soft">La signature vaut émargement de l'accueil chantier et du PPSPS. Accueillant : chef de chantier${f.chef?' ('+esc(String(f.chef).replace(/^l:/,''))+')':''}.</div>`;
  return docHTML({title:'Fiche d’accueil chantier',kicker:'QSE · Accueil chantier',sub:esc(NET.name||'')+(f.ville?' · '+esc(f.ville):''),meta:[['Personne',esc(sig.name)],['Chantier',esc(NET.name||'')],['Date',dFR(sig.at)],['Points validés',Object.keys(p.q||{}).length+' / '+qs.length]],body,css:'table.em img{height:34px}table.em td{vertical-align:middle}',footLeft:esc(NET.name||'')});}
/* ── CONTRÔLE CHANTIER (trame SCR) ── */
export function controleNew(){const NET=A.net();if(!NET)return;const q=NET.qse||(NET.qse={docs:[]});q.controles=q.controles||[];
  const items=CONTROLE_DEF.flatMap(([sec,its])=>its.map(([k,lab])=>[k,lab,sec]));
  A.openModal(`<h3 style="margin-top:0">Contrôle chantier <span class="hint">· ${esc(NET.name||'')}</span></h3>
    <div class="hint" style="margin:0 0 6px">Enjeux : moyens pour travailler en sécurité, moyens pour le bon avancement, respect des consignes et bonnes pratiques. C = conforme · NC = non conforme · NA = non applicable · NV = non vu.</div>
    <div class="row" style="display:flex;gap:6px;flex-wrap:wrap"><div style="flex:1;min-width:140px"><label class="f">Lieu du contrôle</label><input class="f" id="ct-lieu" placeholder="ex. Lycée Jean Moulin"></div><div style="flex:2;min-width:180px"><label class="f">Personnes présentes</label><input class="f" id="ct-pres" placeholder="noms, véhicule vu…"></div></div>
    <div class="dr-body" style="max-height:48vh">${CONTROLE_DEF.map(([sec,its])=>`<div class="ct-sec">${esc(sec)}</div>${its.map(([k,lab])=>`<div class="ct-item" data-k="${k}"><div class="ct-lab">${esc(lab)}</div><div class="ct-seg">${Object.keys(CONTROLE_ETATS).map(e=>`<button type="button" data-ct="${k}" data-e="${e}" class="${e==='C'?'c':e==='NC'?'nc':''}">${e}</button>`).join('')}</div><input class="f ct-act" data-act-k="${k}" placeholder="action menée ou à mener (délai, pilote)" style="display:none"></div>`).join('')}`).join('')}
      <div class="ct-sec">Dernière situation à risque rencontrée</div><textarea class="f" id="ct-risque" style="min-height:56px" placeholder="description, débrief avec l'équipe"></textarea>
      <div class="ct-sec">Demandes / propositions d'amélioration</div><textarea class="f" id="ct-prop" style="min-height:48px"></textarea></div>
    <div class="actions" style="margin-top:8px"><button class="btn primary block" id="ct-ok">Enregistrer le contrôle</button><button class="btn block" data-close>Annuler</button></div>`);
  const ST={};document.querySelectorAll('#modal [data-ct]').forEach(b=>b.onclick=()=>{const k=b.dataset.ct,e=b.dataset.e;ST[k]=e;b.parentElement.querySelectorAll('button').forEach(x=>x.classList.toggle('on',x.dataset.e===e));const inp=document.querySelector(`#modal [data-act-k="${k}"]`);if(inp)inp.style.display=(e==='NC'||e==='NV')?'':'none';});
  document.getElementById('ct-ok').onclick=()=>{const n=Object.keys(ST).length;if(!n){A.toast('Coche au moins un point');return;}
    const res={};items.forEach(([k,lab,sec])=>{if(!ST[k])return;const inp=document.querySelector(`#modal [data-act-k="${k}"]`);res[k]={e:ST[k],lab,sec,action:inp&&inp.value.trim()||''};});
    const c={id:qid(),at:new Date().toISOString(),by:A.userName(),lieu:document.getElementById('ct-lieu').value.trim(),presents:document.getElementById('ct-pres').value.trim(),items:res,risque:document.getElementById('ct-risque').value.trim(),propositions:document.getElementById('ct-prop').value.trim()};
    q.controles.push(c);A.saveNet('qse');A.closeModal();A.toast('Contrôle enregistré — '+controleNC(c)+' non-conformité'+(controleNC(c)>1?'s':''));if(A.renderAll)A.renderAll();};}
export const controleNC=c=>Object.values(c.items||{}).filter(x=>x.e==='NC').length;
export function controlesOf(NET){return (NET&&NET.qse&&Array.isArray(NET.qse.controles)?NET.qse.controles:[]).filter(c=>c&&!c.deleted);}
export function controleListHTML(NET){const L=controlesOf(NET).slice().reverse();if(!L.length)return '';
  return `<div class="card"><b style="font-size:12.5px">Contrôles chantier (${L.length})</b>${L.map(c=>{const nc=controleNC(c);return `<button class="ac-row" data-ctopen="${esc(c.id)}" style="margin-top:6px"><span class="ic" style="background:${nc?'#fdeae7':'#e6f5ec'}">${nc?'✗':'✓'}</span><span class="tx"><b>${dFR(c.at)} · ${esc(c.by||'')}</b><small>${esc(c.lieu||'')}${c.lieu?' · ':''}${Object.keys(c.items||{}).length} points · <b>${nc}</b> NC${c.risque?' · situation à risque notée':''}</small></span><span class="chev">›</span></button>`;}).join('')}</div>`;}
export function controleOpen(id){const NET=A.net();const c=controlesOf(NET).find(x=>x.id===id);if(!c)return;const html=controleReportHTML(c,NET);const w=window.open('','_blank');if(!w){A.toast('Autorise la fenêtre pop-up pour afficher le rapport');return;}w.document.write(html);w.document.close();}
export function controleReportHTML(c,NET){const rows=CONTROLE_DEF.map(([sec,its])=>`<tr class="sec"><td colspan="5"><b>${esc(sec)}</b></td></tr>`+its.map(([k,lab])=>{const r=(c.items||{})[k];return `<tr><td>${esc(lab)}</td><td class="c">${r&&r.e==='C'?'X':''}</td><td class="c">${r&&r.e==='NC'?'<span class="hot">X</span>':''}</td><td class="c">${r&&r.e==='NA'?'X':r&&r.e==='NV'?'<span class="dim">non vu</span>':''}</td><td>${r?esc(r.action||''):''}</td></tr>`;}).join('')).join('');
  const nc=controleNC(c);
  return docHTML({title:'Contrôle chantier',kicker:'QSE · Contrôle chantier SCR',sub:esc(NET.name||''),meta:[['Date',dFR(c.at)],['Chargé de contrôle',esc(c.by||'')],['Lieu',esc(c.lieu||'—')],['Non-conformités',String(nc)]],
    body:`<div class="card soft"><b>Enjeux :</b> garantir la mise à disposition des moyens nécessaires au travail en sécurité et au bon avancement du chantier ; garantir le respect des consignes et bonnes pratiques (qualité, prévention des accidents).</div>
      <p><b>Personnes présentes :</b> ${esc(c.presents||'—')}</p>
      <table class="em"><tr><th>Points à contrôler</th><th>C</th><th>NC</th><th>NA</th><th>Actions menées ou à mener (délai, pilote)</th></tr>${rows}</table>
      <h2>Dernière situation à risque rencontrée</h2><div style="white-space:pre-wrap">${esc(c.risque||'—')}</div>
      <h2>Demandes / propositions d'amélioration</h2><div style="white-space:pre-wrap">${esc(c.propositions||'—')}</div>`,
    css:'table.em td.c{text-align:center;width:38px}table.em tr.sec td{background:#f3efe6}',footLeft:esc(NET.name||'')});}
