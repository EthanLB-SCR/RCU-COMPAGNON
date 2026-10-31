// dossier.js — DOSSIER DU CHANTIER V1 (lot DX, nuit du 30 au 31/10/2026). Ethan, scope V1 du 30/10 : « dossier / Drive (documents obligatoires seulement) ».
// · En tête de l'onglet Dossier (next.js → renderAdmin) : les PIÈCES OBLIGATOIRES du chantier — ✓ présente (date, qui) / ✗ manquante / ⚠ à mettre à jour (échéance si connue) —,
//   gros bouton « 📎 Déposer » pour qui a le droit dossier.edit, ouverture d'un toucher pour tous ; compteur « 5 / 8 pièces » repris en tête du chantier (chef / conducteur),
//   au Bureau (héros) et dans la checklist (espace.js → dossierDash). Le reste (BL, épreuves, plans, accueil, autres, émargements QSE) reste tel quel sous le pli « Autres documents ».
// · DRIVE : un lien http(s) vers le dossier partagé du chantier (Google Drive, SharePoint…) → « 📁 Ouvrir le Drive du chantier » (nouvel onglet) : tout ce qui n'est pas obligatoire y vit.
// · Choix (à valider par Ethan) : 8 pièces — DT / DICT, PPSPS, PGC, plans d'exécution, planning d'exécution, qualifications soudeurs / manchonneurs, habilitations / procédures,
//   autorisations de voirie / arrêtés (nouvelle catégorie « voirie ») ; une pièce peut être « sans objet » sur un chantier (PGC sans coordination SPS, pas de voirie…) : elle sort du
//   compteur. Une pièce à échéance dépassée ou signalée « à mettre à jour » n'est plus comptée ; à 15 jours de l'échéance elle compte encore mais passe en ⚠.
// · Données : la partie « admin » du chantier, comme le Dossier depuis le 09/10 (site_set_part 'admin' : chef / bureau / administrateur — rien de nouveau côté serveur) :
//   docs[] inchangé (+ until = « valable jusqu'au » AAAA-MM-JJ, facultatif), drive {url,by,at}, na [pièces sans objet], upd {pièce:{by,at}} (signalée « à mettre à jour »).
let A=null;
export function initDossier(api){A=api;try{dxCss();}catch(e){}}
const esc=s=>String(s??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
export const OBLIG=[['dt','DT / DICT','📍'],['ppsps','PPSPS','🦺'],['pgc','PGC','📘'],['exe','Plans d’exécution','📐'],['planning','Planning d’exécution','📅'],['qualif','Qualifications soudeurs / manchonneurs','🎖'],['habil','Habilitations / procédures','🪪'],['voirie','Autorisations de voirie / arrêtés','🚧']];
export const OBLIG_KEYS=OBLIG.map(o=>o[0]);
const VALID_CATS=['dt','qualif','habil','voirie']; // pièces qui ont d'habitude une date de fin de validité : on la propose juste après le dépôt
export const SOON_DAYS=15;
export const todayISO=()=>{const d=new Date();return d.getFullYear()+'-'+String(d.getMonth()+1).padStart(2,'0')+'-'+String(d.getDate()).padStart(2,'0');};
const dIso=s=>s?String(s).slice(8,10)+'/'+String(s).slice(5,7)+'/'+String(s).slice(0,4):'';
const dShort=s=>s?String(s).slice(8,10)+'/'+String(s).slice(5,7):'';
const dFR=x=>{if(!x)return '';const d=new Date(x);return isNaN(d)?'':d.toLocaleDateString('fr-FR');};
const daysTo=s=>Math.round((Date.parse(String(s).slice(0,10)+'T12:00:00')-Date.parse(todayISO()+'T12:00:00'))/864e5);
const admOf=net=>(net&&net.admin&&typeof net.admin==='object')?net.admin:{};
const docsOf=(net,k)=>(Array.isArray(admOf(net).docs)?admOf(net).docs:[]).filter(d=>d&&!d.deleted&&d.cat===k).sort((a,b)=>String(a.at||'').localeCompare(String(b.at||'')));
export const plOf=net=>(Array.isArray(admOf(net).pl)?admOf(net).pl:[]).filter(p=>p&&!p.deleted&&Array.isArray(p.ind)&&p.ind.length);
// état d'une pièce : ok · soon (échéance à moins de 15 j) · late (échéance dépassée) · flag (signalée « à mettre à jour ») · miss · na (sans objet)
export function pieceOf(net,o){const [k,label,ic]=o;const ad=admOf(net);const docs=docsOf(net,k);const pls=k==='exe'?plOf(net):[];const na=Array.isArray(ad.na)&&ad.na.includes(k);
  const last=docs[docs.length-1]||null;let plLast=null;pls.forEach(p=>{const c=p.ind[p.ind.length-1];if(c&&(!plLast||String(c.at||'')>String(plLast.at||'')))plLast=c;});
  const n=docs.length+pls.length;const lastAt=[last&&last.at,plLast&&plLast.at].filter(Boolean).sort().pop()||'';
  const fl=ad.upd&&typeof ad.upd==='object'?ad.upd[k]:null;const flag=fl&&String(fl.at||'')>=String(lastAt)?fl:null; // un dépôt plus récent que le signalement le lève tout seul
  const until=last&&last.until&&!(plLast&&String(plLast.at||'')>String(last.at||''))?String(last.until).slice(0,10):'';const left=until?daysTo(until):null;
  const st=na?'na':!n?'miss':flag?'flag':until&&left<0?'late':until&&left<=SOON_DAYS?'soon':'ok';
  return {k,label,ic,st,n,docs,last,pls,plN:pls.length,plLast,flag,na,until,left};}
export function dosCount(net){const P=OBLIG.map(o=>pieceOf(net,o));const req=P.filter(p=>p.st!=='na');const ok=req.filter(p=>p.st==='ok'||p.st==='soon');
  return {ok:ok.length,tot:req.length,miss:req.filter(p=>p.st==='miss'),late:req.filter(p=>p.st==='late'||p.st==='flag'),soon:req.filter(p=>p.st==='soon'),P};}
// checklist du Bureau / tableau de bord du chantier (espace.js) : remplace « N pièces » par le compteur des pièces obligatoires
export function dossierDash(net){try{const c=dosCount(net);const all=(Array.isArray(admOf(net).docs)?admOf(net).docs:[]).filter(d=>d&&!d.deleted).length;
  const k=c.late.length?'bad':c.ok<c.tot||c.soon.length?'warn':'ok';
  const s=c.miss.length?'manquent : '+c.miss.map(p=>p.label).join(', '):c.late.length?'à mettre à jour : '+c.late.map(p=>p.label).join(', '):c.soon.length?'échéance proche : '+c.soon.map(p=>p.label).join(', '):'';
  return {k,v:c.ok+' / '+c.tot+' pièces obligatoires'+(all?' · '+all+' document'+(all>1?'s':''):''),s,n:c.tot-c.ok};}catch(e){return {k:'off',v:'—',s:'',n:0};}}
// lien du Drive : http(s) seulement — renvoie l'adresse propre, '' (vide = retirer) ou null (refusé)
export function driveOk(s){s=String(s||'').trim();if(!s)return '';if(s.length>2000||/\s/.test(s)||!/^https?:\/\//i.test(s))return null;try{const u=new URL(s);if((u.protocol!=='http:'&&u.protocol!=='https:')||!u.hostname)return null;return u.href;}catch(e){return null;}}
const hostOf=u=>{try{return new URL(u).hostname.replace(/^www\./,'');}catch(e){return '';}};
/* ── en tête du chantier (bandeau noir, ligne 2) : « 🗂 5/8 » pour le chef / conducteur — toucher = onglet Dossier ── */
export function dosHead(net,show,go){try{const l2=document.querySelector('#siteHead .l2');if(!l2)return;let s=document.getElementById('shDoss');
  if(!show||!net||net.id==='__vide'){if(s)s.style.display='none';return;}dxCss();
  if(!s){s=document.createElement('span');s.id='shDoss';s.setAttribute('role','button');s.tabIndex=0;l2.appendChild(s);}
  s.style.display='';paintHead(s,net);s.onclick=e=>{e.stopPropagation();if(go)go();};s.onkeydown=e=>{if(e.key==='Enter'||e.key===' '){e.preventDefault();if(go)go();}};}catch(e){console.warn('dossier',e);}}
function paintHead(s,net){const c=dosCount(net);s.className='shDoss '+(c.late.length?'bad':c.ok>=c.tot?'ok':'warn');s.textContent='🗂 '+c.ok+'/'+c.tot+' pièces';
  s.title='Dossier du chantier : '+c.ok+' pièce'+(c.ok>1?'s':'')+' obligatoire'+(c.ok>1?'s':'')+' en règle sur '+c.tot+' — toucher pour ouvrir le Dossier';}
export function dosHeadRefresh(net){try{const s=document.getElementById('shDoss');if(s&&s.style.display!=='none'&&net&&net.id!=='__vide')paintHead(s,net);}catch(e){}} // après un dépôt : le compteur d'en tête suit sans tout redessiner
/* ── onglet Dossier : compteur + Drive + pièces obligatoires ── */
const ST_CLS={ok:'ok',soon:'warn',late:'bad',flag:'warn',miss:'bad',na:'na'},ST_MARK={ok:'✓',soon:'⚠',late:'⚠',flag:'⚠',miss:'✗',na:'—'},CHK={ok:'ok',soon:'warn',late:'bad',flag:'warn',miss:'bad',na:'off'};
const hrefOf=d=>d?(d.url||d.data||''):'';
const openAttrs=d=>`href="${esc(hrefOf(d))}" target="_blank" rel="noopener"${d&&!d.url&&d.data?' download="'+esc(d.name||'document')+'"':''}`;
function stText(p,pxOn){const usePl=p.k==='exe'&&pxOn&&p.plN>0;
  const what=usePl?`${p.plN} planche${p.plN>1?'s':''} · dernier indice ${esc(p.plLast.i)}${p.plLast.date?' du '+dShort(p.plLast.date):''}`:p.last?`${esc(p.last.name||'document')} · ${dFR(p.last.at)}${p.last.by?' · '+esc(p.last.by):''}`:'';
  if(p.st==='na')return '— sans objet sur ce chantier';if(p.st==='miss')return '✗ manquante';
  if(p.st==='late')return `⚠ à mettre à jour — échéance dépassée le ${dIso(p.until)} · ${what}`;
  if(p.st==='soon')return `⚠ à mettre à jour avant le ${dIso(p.until)} <span class="nw">(${p.left?'J-'+p.left:'aujourd\'hui'})</span> · ${what}`;
  if(p.st==='flag')return `⚠ à mettre à jour (signalé${p.flag.by?' par '+esc(p.flag.by):''}${p.flag.at?' le '+dFR(p.flag.at):''}) · ${what}`;
  return `✓ présente · ${what}${p.until?' · valable jusqu’au '+dIso(p.until):''}`;}
function rowHTML(p,ed,pxOn){const usePl=p.k==='exe'&&pxOn;const cls=ST_CLS[p.st];
  const tx=`<b>${esc(p.label)}</b><small>${stText(p,pxOn)}</small>`;
  const open=usePl&&p.plN?`<button type="button" class="tx dx-open" data-pxlist="1">${tx}</button>`:p.last&&hrefOf(p.last)?`<a class="tx dx-open" ${openAttrs(p.last)}>${tx}</a>`:`<span class="tx">${tx}</span>`;
  const dep=ed&&['miss','late','flag','soon'].includes(p.st)?`<label class="btn ${p.st==='soon'?'':'primary'} dx-dep">📎 Déposer<input type="file" data-dxdep="${p.k}" accept="${usePl?'application/pdf,image/*':'application/pdf,image/*,.doc,.docx,.xls,.xlsx,.txt'}" multiple style="display:none"></label>`:'';
  const man=ed||(p.n>1&&!(usePl&&p.plN))?`<button type="button" class="btn dx-man" data-dxman="${p.k}" aria-label="${ed?'Gérer':'Versions de'} « ${esc(p.label)} »" title="${ed?'Gérer : versions, échéance, sans objet':'Versions déposées'}">${ed?'⋯':'🕘 '+p.n}</button>`:'';
  return `<div class="ac-notif dx-p ${cls}" data-dxk="${p.k}"><span class="ic">${p.ic}</span>${open}<span class="dx-acts">${dep}${man}${ed?'':`<span class="ac-chk ${CHK[p.st]}" aria-hidden="true">${ST_MARK[p.st]}</span>`}</span></div>`;}
export function dosTopHTML(o){dxCss();const net=o.net;const ed=!!o.canEd;const pxOn=!!o.pxOn;const c=dosCount(net);const pc=c.tot?Math.round(100*c.ok/c.tot):0;const ad=admOf(net);const dr=ad.drive&&ad.drive.url&&driveOk(ad.drive.url)?ad.drive:null; /* revérifié à l'affichage : jamais de lien autre que http(s) */
  const sumCls=c.late.length?'bad':c.ok>=c.tot?'ok':'warn';
  const sub=c.miss.length?'manquent : '+c.miss.map(p=>esc(p.label)).join(', '):c.late.length?'à mettre à jour : '+c.late.map(p=>esc(p.label)).join(', '):c.soon.length?'échéance proche : '+c.soon.map(p=>esc(p.label)).join(', '):'✓ tout est là';
  const drive=dr?`<a class="btn primary block dx-drv" id="dx-drive-open" href="${esc(dr.url)}" target="_blank" rel="noopener noreferrer">📁 Ouvrir le Drive du chantier</a><div class="hint">${esc(hostOf(dr.url))}${dr.by?' · lien ajouté par '+esc(dr.by):''}${dr.at?' le '+dFR(dr.at):''} — tout ce qui n'est pas obligatoire est rangé là.</div>${ed?`<button type="button" class="btn dx-drv2" id="dx-drive-edit">✎ Changer le lien du Drive</button>`:''}`
    :ed?`<div class="dx-drvF"><label class="f" for="dx-drive-in">📁 Dossier Drive du chantier</label><div class="dx-drvR"><input class="f" id="dx-drive-in" type="url" inputmode="url" placeholder="https://drive.google.com/…" autocomplete="off"><button type="button" class="btn primary" id="dx-drive-ok">Enregistrer</button></div><div class="hint">Le lien du dossier partagé de l'entreprise (Google Drive, SharePoint…) : tout ce qui n'est pas obligatoire y vit. Lien en https:// seulement.</div></div>`
    :`<div class="hint dx-drvNo">📁 Pas encore de Drive pour ce chantier — le chef ou le bureau peut ajouter le lien ici.</div>`;
  return `<div class="eq-app dx"><div class="card dx-top"><div class="dx-sum"><div class="dx-n ${sumCls}"><span><b>${c.ok}</b>/${c.tot}</span></div><div class="tx"><b>pièces obligatoires en règle</b><small>${sub}</small></div></div><div class="dx-bar"><i class="${sumCls}" style="width:${pc}%"></i></div><div class="dx-drive">${drive}</div></div>
    <div class="ac-h"><b>Pièces obligatoires</b><span>${ed?'⋯ versions, échéance':'toucher pour ouvrir'}</span></div>
    <div class="dx-list">${c.P.map(p=>rowHTML(p,ed,pxOn)).join('')}</div></div>`;}
export function dosBind(el){if(!el||!A)return;
  el.querySelectorAll('[data-dxdep]').forEach(inp=>inp.onchange=async()=>{const k=inp.dataset.dxdep;const fs=[...(inp.files||[])];inp.value='';if(!fs.length)return;
    if(k==='exe'&&A.pxOn&&A.pxOn()&&A.pxImport){A.pxImport(fs);return;}
    let ok=0;for(const f of fs){const d=await A.addFile(f,k);if(d)ok++;}A.rerender();if(ok&&VALID_CATS.includes(k))pieceOpen(k,{after:true});});
  el.querySelectorAll('[data-dxman]').forEach(b=>b.onclick=()=>pieceOpen(b.dataset.dxman));
  const dOk=el.querySelector('#dx-drive-ok');if(dOk)dOk.onclick=()=>driveSave(el.querySelector('#dx-drive-in').value);
  const dIn=el.querySelector('#dx-drive-in');if(dIn)dIn.onkeydown=e=>{if(e.key==='Enter'){e.preventDefault();driveSave(dIn.value);}};
  const dEd=el.querySelector('#dx-drive-edit');if(dEd)dEd.onclick=()=>driveEdit();}
function admW(){const net=A.net();if(!net||net.id==='__vide')return null;if(!net.admin)net.admin={docs:[]};if(!Array.isArray(net.admin.docs))net.admin.docs=[];return net.admin;}
const canEd=()=>A.can?A.can('dossier.edit'):false;
function driveSave(v,after){if(!canEd()){A.toast('Réservé au chef / bureau (droit « Dossier »)');return false;}const ad=admW();if(!ad)return false;const u=driveOk(v);
  if(u===null){A.toast('Lien refusé : il doit commencer par https:// (ou http://) — adresse du dossier partagé');return false;}
  if(u===''){if(!ad.drive){A.toast('Colle le lien du dossier partagé (https://…)');return false;}delete ad.drive;A.saveNet('admin');A.toast('Lien du Drive retiré');}
  else{ad.drive={url:u,by:A.userName(),at:new Date().toISOString()};A.saveNet('admin');A.toast('Drive du chantier enregistré ✓');}
  if(after)after();A.rerender();return true;}
function driveEdit(){const ad=admW();if(!ad)return;const cur=ad.drive&&ad.drive.url||'';
  A.openModal(`<h3 style="margin-top:0">📁 Drive du chantier</h3><label class="f" for="dxm-drive">Lien du dossier partagé</label><input class="f" id="dxm-drive" type="url" inputmode="url" value="${esc(cur)}" placeholder="https://drive.google.com/…" autocomplete="off" style="width:100%">
   <div class="hint">Google Drive, SharePoint… : https:// seulement. Vide = retirer le lien.</div><div class="actions" style="margin-top:8px"><button class="btn primary block" id="dxm-drive-ok">Enregistrer</button><button class="btn block" data-close>Annuler</button></div>`);
  const ok=document.getElementById('dxm-drive-ok');if(ok)ok.onclick=()=>driveSave(document.getElementById('dxm-drive').value,()=>A.closeModal());}
/* ── fiche d'une pièce : versions déposées (ouvrables), et pour qui a le droit : nouvelle version, échéance, « à mettre à jour », sans objet ── */
function pieceOpen(k,o){o=o||{};const net=A.net();const def=OBLIG.find(x=>x[0]===k);if(!net||!def)return;const p=pieceOf(net,def);const ed=canEd();const pxOn=A.pxOn?A.pxOn():false;const H=p.docs.slice().reverse();
  const usePl=k==='exe'&&pxOn;
  A.openModal(`<h3 style="margin-top:0">${p.ic} ${esc(p.label)}</h3>
   <div class="${p.st==='ok'?'okbox':p.st==='na'?'hint':'warnbox'}" style="margin-top:0">${stText(p,pxOn)}</div>
   ${o.after?`<div class="okbox">Pièce déposée ✓ — si elle a une date de fin de validité (DICT, arrêté, qualification…), indique-la ci-dessous : l'appli préviendra 15 jours avant.</div>`:''}
   ${usePl?`<div class="hint">Les plans d'exé se gèrent planche par planche (indices, zones) dans la section « 📄 Plans d'exé » du Dossier.</div><div class="actions"><button class="btn block" data-pxlist="1">📄 Voir les planches${p.plN?' ('+p.plN+')':''}</button></div>`:''}
   ${ed?`<div class="actions"><label class="btn ${p.st==='ok'||p.st==='na'?'':'primary'} block">📎 Déposer ${p.n?'une nouvelle version':'la pièce'}<input type="file" id="dxp-file" accept="application/pdf,image/*,.doc,.docx,.xls,.xlsx,.txt" multiple style="display:none"></label></div>`:''}
   ${ed&&p.last?`<label class="f" for="dxp-until" style="margin-top:8px">Valable jusqu’au <span class="dim">(échéance de « ${esc(p.last.name||'')} », facultatif)</span></label><div class="dx-drvR"><input class="f" id="dxp-until" type="date" value="${esc(p.last.until||'')}"><button type="button" class="btn" id="dxp-until-ok">Enregistrer</button></div>`:''}
   ${ed&&p.n&&p.st!=='na'?(p.flag?`<button type="button" class="btn block" id="dxp-unflag" style="margin-top:8px">✓ C’est à jour (retirer « à mettre à jour »)</button>`:`<button type="button" class="btn block" id="dxp-flag" style="margin-top:8px">⚠ Signaler « à mettre à jour »</button>`):''}
   ${ed?`<label class="tgl dx-na"><input type="checkbox" id="dxp-na" ${p.na?'checked':''}> Pas obligatoire sur ce chantier (sans objet)</label>`:''}
   <b style="display:block;margin-top:10px;font-size:12.5px">Versions déposées (${H.length})</b>
   ${H.length?`<table class="rc dx-vers">${H.map((d,i)=>`<tr><td><a ${openAttrs(d)} style="color:#1c3d6b;font-weight:600">${esc(d.name||'document')}</a>${i===0?' <span class="dx-cur">en cours</span>':''}${d.note?`<div class="dim" style="font-size:11px">${esc(d.note)}</div>`:''}${d.until?`<div class="dim" style="font-size:11px">valable jusqu’au ${dIso(d.until)}</div>`:''}${d.data?' <span class="dim" style="font-size:10px">(gardé dans l’appli)</span>':''}</td><td class="dim">${esc(d.by||'')} · ${dFR(d.at)}</td><td>${ed?`<button type="button" class="dx-del" data-dxdel="${esc(d.id)}" aria-label="Retirer ${esc(d.name||'')}">✕</button>`:''}</td></tr>`).join('')}</table>`:'<div class="hint">rien de déposé pour l’instant</div>'}
   <div class="actions" style="margin-top:8px"><button class="btn block" data-close>Fermer</button></div>`);
  const md=document.getElementById('modal');if(!md)return;const q=s=>md.querySelector(s);const ad=admW();
  const fi=q('#dxp-file');if(fi)fi.onchange=async()=>{const fs=[...(fi.files||[])];fi.value='';if(!fs.length)return;if(usePl&&A.pxImport){A.closeModal();A.pxImport(fs);return;}let ok=0;for(const f of fs){const d=await A.addFile(f,k);if(d)ok++;}A.rerender();if(ok)pieceOpen(k,{after:VALID_CATS.includes(k)});};
  const uo=q('#dxp-until-ok');if(uo)uo.onclick=()=>{const v=q('#dxp-until').value;const last=p.last&&ad.docs.find(d=>d.id===p.last.id);if(!last)return;if(v&&!/^\d{4}-\d{2}-\d{2}$/.test(v)){A.toast('Date invalide');return;}if(v)last.until=v;else delete last.until;A.saveNet('admin');A.toast(v?'Échéance enregistrée : '+dIso(v):'Échéance retirée');A.rerender();pieceOpen(k);};
  const fl=q('#dxp-flag');if(fl)fl.onclick=()=>{ad.upd=ad.upd&&typeof ad.upd==='object'?ad.upd:{};ad.upd[k]={by:A.userName(),at:new Date().toISOString()};A.saveNet('admin');A.toast('« '+def[1]+' » signalée à mettre à jour');A.rerender();pieceOpen(k);};
  const uf=q('#dxp-unflag');if(uf)uf.onclick=()=>{if(ad.upd)delete ad.upd[k];A.saveNet('admin');A.toast('« '+def[1]+' » : à jour');A.rerender();pieceOpen(k);};
  const na=q('#dxp-na');if(na)na.onchange=()=>{const L=Array.isArray(ad.na)?ad.na.filter(x=>x!==k):[];if(na.checked)L.push(k);ad.na=L;A.saveNet('admin');A.toast(na.checked?'« '+def[1]+' » : sans objet sur ce chantier (hors compteur)':'« '+def[1]+' » : de nouveau obligatoire');A.rerender();pieceOpen(k);};
  md.querySelectorAll('[data-dxdel]').forEach(b=>b.onclick=()=>{const id=b.dataset.dxdel;if((ad.pl||[]).some(pl=>pl&&!pl.deleted&&(pl.ind||[]).some(x=>x.doc===id))){A.toast('Ce fichier porte des planches de plans d’exé : retire d’abord les planches (Plans d’exé → ⋯)');return;}
    if(!confirm('Retirer ce document du dossier ? (le fichier reste au serveur)'))return;ad.docs=ad.docs.filter(d=>d.id!==id);A.saveNet('admin');A.rerender();pieceOpen(k);});}
/* ── styles du lot (une seule fois) ── */
export function dxCss(){if(typeof document==='undefined'||document.getElementById('css-lot-dx'))return;const st=document.createElement('style');st.id='css-lot-dx';st.textContent=`
.dx .card.dx-top{border-radius:16px;padding:12px}
.dx-sum{display:flex;align-items:center;gap:12px}
.dx-n{flex:none;min-width:68px;height:58px;border-radius:14px;display:grid;place-items:center;font-weight:700;font-size:15px;background:#fdeae7;color:#8a1f1f}
.dx-n.ok{background:#e6f5ec;color:#15673a}.dx-n.warn{background:#fff4d6;color:#7a5200}.dx-n b{font-size:24px;letter-spacing:-.02em}
.dx-sum .tx{flex:1;min-width:0}.dx-sum .tx b{display:block;font-size:15px}.dx-sum .tx small{display:block;font-size:12.5px;color:var(--ink2);margin-top:2px;overflow-wrap:anywhere}
.dx-bar{height:6px;border-radius:3px;background:var(--plane);overflow:hidden;margin-top:10px}.dx-bar i{display:block;height:100%;border-radius:3px;background:var(--bad)}.dx-bar i.ok{background:var(--ok)}.dx-bar i.warn{background:var(--warn)}
.dx-drive{margin-top:10px}.dx-drive .hint{margin-top:6px;overflow-wrap:anywhere}.dx-drv2{margin-top:6px;min-height:40px}
.dx-drvR{display:flex;gap:6px;align-items:stretch}.dx-drvR input{flex:1;min-width:0}.dx-drvR .btn{flex:none}
.eq-app.dx .ac-notif.dx-p{cursor:default;padding:8px 8px 8px 10px;gap:10px;min-height:60px}
.dx-p.na{opacity:.62}.dx-p.na .ic{background:var(--plane)}
.eq-app.dx .dx-p .tx{flex:1;min-width:0;display:flex;flex-direction:column;justify-content:center;min-height:44px;background:none;border:0;padding:0;margin:0;text-align:left;font:inherit;color:inherit;text-decoration:none;cursor:pointer}
.eq-app.dx .dx-p span.tx{cursor:default}
.dx-p .tx b{display:block;font-size:14.5px;line-height:1.25}.dx-p .tx small{display:block;font-size:12.5px;color:var(--ink2);margin-top:2px;overflow-wrap:anywhere;line-height:1.3}
.dx-p.bad .tx small{color:#8a1f1f}.dx-p.warn .tx small{color:#7a5200}
.dx-acts{flex:none;display:flex;gap:6px;align-items:center}.eq-app.dx .dx-acts .btn{min-height:44px;min-width:44px;padding:0 12px;font-weight:700}
.dx-acts .dx-man{font-size:18px;padding:0 10px}
.dx-na{display:flex;gap:8px;align-items:center;margin-top:10px;font-size:13px;min-height:44px}.dx-na input{width:22px;height:22px}
.dx-vers td{vertical-align:top;font-size:12.5px}.dx-cur{background:#e6f5ec;color:#15673a;border-radius:999px;padding:1px 7px;font-size:10.5px;font-weight:700}
.dx-del{border:0;background:none;cursor:pointer;color:#d03b3b;min-width:34px;min-height:34px;font-size:15px}
.dx-fold{display:flex;align-items:center;gap:10px;width:100%;min-height:54px;margin:18px 0 8px;padding:8px 12px;border:1px solid var(--line);border-radius:14px;background:var(--surface);font:inherit;text-align:left;cursor:pointer;color:inherit}
.dx-fold .tx{flex:1;min-width:0}.dx-fold b{display:block;font-size:15px}.dx-fold small{display:block;font-size:12px;color:var(--muted);overflow-wrap:anywhere}.dx-fold .chev{font-size:18px;color:var(--muted);flex:none}
.shDoss{position:relative;white-space:nowrap;font-weight:700;cursor:pointer;padding:1px 7px;border-radius:999px;background:#7a2020;color:#fff;flex:none}.shDoss.ok{background:#1f5a34}.shDoss.warn{background:#6b4e12}
.shDoss::after{content:'';position:absolute;inset:-10px -3px}
.ac-stat.dx-stat{border:0;font:inherit;text-align:left;cursor:pointer;color:inherit;min-height:44px}
.pxBtns{display:flex;gap:8px;flex-wrap:wrap}.pxBtns .btn{min-height:44px;flex:1 1 140px;font-weight:700}
.pxRow{display:flex;align-items:stretch;gap:6px;margin:6px 0}
.pxRowB{flex:1;min-width:0;display:flex;align-items:center;gap:10px;min-height:54px;padding:6px 10px;border:1px solid var(--line);border-radius:12px;background:var(--surface);font:inherit;color:inherit;text-align:left;cursor:pointer}
.pxNo{flex:none;min-width:38px;height:38px;border-radius:10px;background:#efe9f8;color:#4b2a7a;font-weight:800;display:grid;place-items:center;font-size:14px;padding:0 5px}
.pxRowB .tx{flex:1;min-width:0}.pxRowB .tx b{display:block;font-size:14px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap}.pxRowB .tx small{display:block;font-size:12px;color:var(--ink2);overflow-wrap:anywhere;line-height:1.3}
.pxRowB .chev{color:var(--muted);font-size:18px;flex:none}.pxRowM{flex:none;min-width:44px;min-height:44px;font-size:18px}
.pxNew{display:inline-block;background:#eb6834;color:#fff;border-radius:999px;padding:1px 7px;font-size:11px;font-weight:700;font-style:normal}
.pxSec{margin:12px 0 2px;font-weight:800;font-size:13px}.pxSec span{font-weight:400;color:var(--muted);font-size:12px}
.pxShow{display:flex;gap:8px;align-items:center;margin-top:10px;font-size:13px;min-height:44px}.pxShow input{width:22px;height:22px;flex:none}
.pxw{display:flex;gap:6px;margin:8px 0 2px}.pxw .btn{min-height:46px}.pxw-b{flex:1;min-width:0;justify-content:flex-start!important;text-align:left;background:#f3eefb;border-color:#cdb9ea;color:#3d2466;font-weight:700;white-space:normal}
.pxw-none{background:var(--surface);color:var(--ink2);font-weight:600}.pxw-o{flex:none;min-width:52px}
.pxPlanBtn{position:absolute;left:8px;top:8px;z-index:5;min-height:44px;padding:0 14px;border-radius:12px;border:1px solid #cdb9ea;background:rgba(252,252,251,.97);color:#3d2466;font-weight:800;font-size:14px;box-shadow:0 2px 8px rgba(0,0,0,.14);display:inline-flex;align-items:center;gap:6px;cursor:pointer;font-family:inherit}
.pxBadge{font-style:normal;background:#eb6834;color:#fff;border-radius:999px;min-width:20px;height:20px;display:inline-grid;place-items:center;font-size:11.5px;padding:0 5px}
.modal.full .box:has(.pxv){padding:0}
.pxv{display:flex;flex-direction:column;height:100%;min-height:0}
.pxv-top{display:flex;align-items:center;gap:8px;padding:8px 10px;border-bottom:1px solid var(--line)}
.pxv-t{flex:1;min-width:0}.pxv-t b{display:block;font-size:15px}.pxv-t small{display:block;font-size:12px;color:var(--muted);white-space:nowrap;overflow:hidden;text-overflow:ellipsis}
.pxv-x{min-width:44px;min-height:44px;font-size:18px;flex:none}
.pxv-tools{display:flex;align-items:center;gap:6px;padding:6px 10px;flex-wrap:wrap}.pxv-tools .btn{min-height:44px;min-width:44px;font-size:17px}.pxv-tools .btn.txt{font-size:13px}
.pxv-st{flex:1 1 80px;font-size:12px;color:var(--muted);min-width:0}
.pxv-body{flex:1 1 auto;min-height:0;overflow:auto;background:#e9e7e1;touch-action:none;position:relative;cursor:grab;display:flex}
.pxv-body img{display:block;flex:none;margin:auto;width:100%;height:auto;max-width:none;user-select:none;-webkit-user-drag:none;background:#fff;box-shadow:0 1px 6px rgba(0,0,0,.18)}
.pxv-msg{flex:1 1 auto;width:100%;padding:24px 16px;font-size:14px;color:var(--ink2);text-align:center}.pxv-msg .warnbox{text-align:left}
.nw{white-space:nowrap}
.pxv-old{margin:6px 10px 0}.pxv-old .btn{margin-top:4px}
.pxImpG{display:flex;gap:8px;flex-wrap:wrap;margin:8px 0}.pxImpG label{font-size:12.5px;display:flex;flex-direction:column;gap:2px;flex:1 1 130px}.pxImpG input{min-height:40px}
.pxImpRows{max-height:46vh;overflow:auto;border-top:1px solid var(--line)}
.pxImpR{display:grid;grid-template-columns:44px 58px minmax(0,1fr) 50px;gap:6px;align-items:center;padding:6px 0;border-bottom:1px solid var(--line)}
.pxImpR .pg{font-size:12px;color:var(--muted)}.pxImpR input{min-height:40px;width:100%;box-sizing:border-box;padding:4px 6px}
.pxImpR .st{grid-column:1/-1;font-size:12px;color:var(--ink2)}.pxImpR .st.re{color:#8a4a00;font-weight:700}
.pxZr{border:1px solid var(--line);border-radius:12px;padding:2px 10px;margin:6px 0}.pxZr.on{border-color:#9c7cd0;background:#f6f1fd}
.pxZc{display:flex;align-items:center;gap:8px;min-height:44px;cursor:pointer;font-size:14px}.pxZc input{width:22px;height:22px;flex:none}
.pxZpk{display:flex;align-items:center;gap:6px;flex-wrap:wrap;font-size:13px;padding:0 0 8px 30px}.pxZpk input{width:84px;min-height:40px}
table.rc.pxHist td:not(:last-child),table.rc.dx-vers td:not(:last-child){white-space:normal;overflow-wrap:anywhere}
.pxHist td{vertical-align:top;font-size:12.5px}.pxCur{background:#e6f5ec;color:#15673a;border-radius:999px;padding:1px 7px;font-size:10.5px;font-weight:700}
`;document.head.appendChild(st);}
