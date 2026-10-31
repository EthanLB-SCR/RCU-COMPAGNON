// plansexe.js — PLANS D'EXÉ du chantier (lot DX, nuit du 30 au 31/10/2026) — option de palier « plansexe » (Labo par défaut ; Socle d'un clic : Administrateur → 🧪 Options).
// Ethan, scope V1 du 30/10 : « plans d'exé (import, planche ↔ zone, indice / date, raccourci du soudeur) ».
// · IMPORT (Dossier → 📄 Plans d'exé, droit dossier.edit) : un ou plusieurs PDF (ou images) d'un coup ; une page = une PLANCHE (n°, titre, indice A, B, C…, date de l'indice) ;
//   le n° est la clé : une page importée sous le n° d'une planche existante en devient le NOUVEL INDICE (« Numéroter à partir de 1 » pour un jeu complet ré-indicé).
//   Sans moteur PDF (hors réseau) : le PDF entier = une planche, page 1.
// · PLANCHE ↔ ZONE : des lignes du réseau (L1, L2…) et, si besoin, un tronçon de PK par ligne (m0 → m1) — des cases à cocher, au doigt ; calque « Plans d'exé » du plan
//   (👁, éteint par défaut) : cadre + n° de planche ; « 📍 Voir sur le plan » depuis la planche (cadre orange).
// · INDICE / DATE : l'ancien indice reste dans l'historique (« remplacé par l'indice C du 12/11 ») ; partout le dernier ; pastille « nouvel indice » tant que la personne ne l'a pas
//   ouvert (mémoire de l'appareil, par compte).
// · RACCOURCI DU SOUDEUR : fiche soudure → « 📄 Plan d'exé · planche 3 · ind. C » ouvre DIRECTEMENT la bonne page ; « 📄 Mes plans » en haut à gauche du plan (1 toucher) :
//   les planches de la zone de la soudure ouverte, sinon de SA dernière soudure, d'abord.
// · LECTEUR : pdf.js (comme le reste de l'appli) rend la seule page voulue ; ＋ / − / ⤢, pincement, glisser. HORS RÉSEAU : chaque page ouverte est gardée en image sur l'appareil
//   (IndexedDB, 30 Mo au plus, les plus anciennes partent) → relisible sans réseau ; jamais ouverte : « plan non disponible hors connexion — ouvre-le une fois avec du réseau ».
// · Données : NET.admin.pl[] dans la partie « admin » du chantier (comme le Dossier : site_set_part, chef / bureau / administrateur — pas de SQL) ; fichiers au stockage
//   (sync.uploadDoc), classés aussi au Dossier (catégorie Plans d'exécution) ; hors connexion, un petit fichier (< 1,5 Mo) est gardé dans l'appli (règle du Dossier).
//   Planche {id,no,title,zone:[{l,m0?,m1?}],ind:[{id,i,date,doc,url?,page,kind,by,at}],by,at,upd,deleted?}.
import {dxCss,plOf,todayISO} from './dossier.js';
let A=null;
export function initPlansExe(api){A=api;try{document.addEventListener('click',onDocClick);}catch(e){}setTimeout(hookTrace,0);}
const esc=s=>String(s??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const pxOn=()=>!!A&&(!A.feat||A.feat('plansexe'));
const canEd=()=>!!(A&&A.can&&A.can('dossier.edit'));
const NETc=()=>A&&A.net?A.net():null;
function admW(){const n=NETc();if(!n||n.id==='__vide')return null;if(!n.admin)n.admin={docs:[]};const ad=n.admin;if(!Array.isArray(ad.docs))ad.docs=[];if(!Array.isArray(ad.pl))ad.pl=[];return ad;}
const nat=(a,b)=>String(a??'').localeCompare(String(b??''),'fr',{numeric:true,sensitivity:'base'});
export const plList=()=>plOf(NETc()).slice().sort((a,b)=>nat(a.no,b.no));
const plGet=id=>plList().find(p=>p.id===id)||null;
const curOf=p=>p&&Array.isArray(p.ind)&&p.ind.length?p.ind[p.ind.length-1]:null;
const pid=x=>x+Date.now().toString(36)+Math.random().toString(36).slice(2,6);
const dShort=s=>s?String(s).slice(8,10)+'/'+String(s).slice(5,7):'';
const dIso=s=>s?String(s).slice(8,10)+'/'+String(s).slice(5,7)+'/'+String(s).slice(0,4):'';
const baseName=n=>String(n||'plan').replace(/\.[a-z0-9]{2,5}$/i,'').replace(/[_]+/g,' ').trim().slice(0,60);
export function nextInd(i){const s=String(i||'').trim().toUpperCase();if(!s)return 'A';if(/^\d+$/.test(s))return String(+s+1);
  if(/^[A-Z]+$/.test(s)){const a=s.split('');let k=a.length-1;while(k>=0){if(a[k]==='Z'){a[k]='A';k--;}else{a[k]=String.fromCharCode(a[k].charCodeAt(0)+1);return a.join('');}}return 'A'+a.join('');}return s+'+';}
const withT=(p,ms)=>Promise.race([p,new Promise((_,rej)=>setTimeout(()=>rej(new Error('délai')),ms))]);
const pdfLib=async()=>{try{return A.loadPdfJs?await withT(A.loadPdfJs(),8000):null;}catch(e){return null;}};
function srcOf(ix){const ad=admW();const d=ad&&ix&&ix.doc?ad.docs.find(x=>x&&x.id===ix.doc):null;return (d&&(d.url||d.data))||(ix&&ix.url)||null;}
/* ── « nouvel indice » : ce que la personne a déjà ouvert (appareil, par compte) ── */
const seenKey=()=>'trace:pxSeen:'+((A.userKey&&A.userKey())||A.state.userId||'');
function seenMap(){try{const v=JSON.parse(localStorage.getItem(seenKey())||'{}');return v&&typeof v==='object'?v:{};}catch(e){return {};}}
function markSeen(p){const c=curOf(p);if(!c)return;const m=seenMap();if(m[p.id]===c.id)return;m[p.id]=c.id;try{localStorage.setItem(seenKey(),JSON.stringify(m));}catch(e){}}
export const isNewInd=(p,m)=>{const c=curOf(p);if(!c||(p.ind||[]).length<2)return false;m=m||seenMap();return m[p.id]!==c.id;};
/* ── zones ── */
function lineLab(id){const l=A.state.lines&&A.state.lines[id];if(!l)return String(id);const n=String(l.name||'');return n&&n!==id&&n.length<=24?n+' ('+id+')':String(id);}
const lineLen=l=>l?(l.length||((l.els&&l.els.length)?l.els[l.els.length-1].m1:0)):0;
const hasPK=r=>r&&(r.m0!=null||r.m1!=null);
function zoneTxt(p){return (p.zone||[]).map(r=>lineLab(r.l)+(hasPK(r)?' PK '+(r.m0!=null?Math.round(r.m0):0)+' → '+(r.m1!=null?Math.round(r.m1):'fin'):'')).join(' · ');}
function zoneScore(p,lineId,m){let best=0;(p.zone||[]).forEach(r=>{if(r.l!==lineId)return;if(!hasPK(r)){best=Math.max(best,1);return;}const a=r.m0!=null?+r.m0:-Infinity,b=r.m1!=null?+r.m1:Infinity;if(m!=null&&isFinite(+m)&&+m>=a-.5&&+m<=b+.5)best=Math.max(best,2);});return best;}
export function pxMatch(lineId,m){return plList().map(p=>({p,s:zoneScore(p,lineId,m)})).filter(x=>x.s>0).sort((a,b)=>b.s-a.s||nat(a.p.no,b.p.no)).map(x=>x.p);}
// la dernière soudure de la personne (étapes signées de son nom, événements de son compte)
function myLastWeld(){const me=A.userName?A.userName():'',id0=A.state.userId,id=id0&&id0!=='__me'?id0:null; /* compte connecté : userId « __me » commun à tous → le nom seulement */let best=null;const mine=b=>!!b&&(b===me||(id&&b===id));
  Object.values(A.state.lines||{}).forEach(l=>['A','R'].forEach(c=>{const cd=l.cond&&l.cond[c];if(!cd||!cd.joints)return;cd.joints.forEach(j=>{const ats=[];(j.events||[]).forEach(e=>{if(e&&mine(e.by))ats.push(e.at);});const st=j.steps||{};[1,2,3,4].forEach(n=>{const s=st[n];if(s&&s.done&&mine(s.by))ats.push(s.at);});
    ats.forEach(at=>{const t=at?new Date(at).getTime():0;if(t&&(!best||t>best.t)){const e=cd.els&&cd.els[j.idx];best={t,l,c,j,m:e?e.m1:null};}});});}));return best;}
function weldRef(){const S=A.state;const s=S.sel;if(s&&s.kind==='j'){const l=S.lines&&S.lines[s.line];const cd=l&&l.cond&&l.cond[s.cond];const j=cd&&cd.joints&&cd.joints[s.i];if(j){const e=cd.els&&cd.els[j.idx];return {l,c:s.cond,j,m:e?e.m1:null,why:'soudure ouverte'};}}
  const b=myLastWeld();return b?Object.assign(b,{why:'ta dernière soudure'}):null;}
/* ── fiche soudure : le raccourci du soudeur ── */
export function pxWeldHTML(l,c,a){try{if(!A||!pxOn()||!l)return '';const all=plList();if(!all.length)return '';const M=pxMatch(l.id,a?a.m1:null);
  if(M.length){const p=M[0];const ix=curOf(p);return `<div class="pxw"><button type="button" class="btn pxw-b" data-pxopen="${esc(p.id)}">📄 Plan d'exé · planche ${esc(p.no)} · ind. ${esc(ix?ix.i:'?')}${isNewInd(p)?' <span class="pxNew">nouvel indice</span>':''}</button>${M.length>1?`<button type="button" class="btn pxw-o" data-pxlist="1" title="Autres planches de cette zone" aria-label="Autres planches de cette zone">+${M.length-1}</button>`:''}</div>`;}
  return `<div class="pxw"><button type="button" class="btn pxw-b pxw-none" data-pxlist="1">📄 Mes plans (${all.length}) · aucune planche rattachée ici</button></div>`;}catch(e){console.warn('plans exé',e);return '';}}
function onDocClick(e){const t=e.target&&e.target.closest?e.target.closest('[data-pxopen],[data-pxlist],[data-pxman]'):null;if(!t||!A)return;
  if(t.dataset.pxopen){e.preventDefault();pxOpen(t.dataset.pxopen,t.dataset.pxind||null);return;}if(t.dataset.pxlist){e.preventDefault();pxListOpen();return;}if(t.dataset.pxman){e.preventDefault();pxManOpen(t.dataset.pxman);}}
/* ── plan : bouton « 📄 Mes plans » (1 toucher) + calque des cadres ── */
let focusT=0;const BOXC=new Map();
function planBtn(){const cv=document.getElementById('canvas');if(!cv)return null;let b=document.getElementById('pxPlanBtn');
  if(!b){b=document.createElement('button');b.id='pxPlanBtn';b.type='button';b.className='pxPlanBtn';b.addEventListener('click',ev=>{ev.preventDefault();ev.stopPropagation();pxListOpen();});cv.appendChild(b);}return b;}
function updPlanBtn(){const S=A.state;const ok=pxOn()&&S.screen==='site'&&S.tab==='plan'&&!S.calage;const all=ok?plList():[];let b=document.getElementById('pxPlanBtn');
  if(!all.length){if(b)b.style.display='none';return;}dxCss();b=planBtn();if(!b)return;const m=seenMap();const n=all.filter(p=>isNewInd(p,m)).length;
  const h='📄 Mes plans'+(n?` <i class="pxBadge">${n}</i>`:'');if(b.innerHTML!==h)b.innerHTML=h;b.style.display='';
  const mc=document.getElementById('mapcredit');b.style.top=mc&&getComputedStyle(mc).display!=='none'?'32px':''; /* le crédit « © IGN » (photo aérienne) reste visible au-dessus */b.title='Plans d\'exé du chantier'+(n?' — '+n+' nouvel'+(n>1?'s':'')+' indice'+(n>1?'s':''):'');}
function ensureG(){let g=document.getElementById('pxG');if(g)return g;const w=document.getElementById('world');if(!w)return null;g=document.createElementNS('http://www.w3.org/2000/svg','g');g.id='pxG';g.setAttribute('pointer-events','none');const gps=document.getElementById('gps');w.insertBefore(g,gps&&gps.parentNode===w?gps:null);return g;}
function zoneBox(p){const L=A.state.lines||{};let x0=1e9,y0=1e9,x1=-1e9,y1=-1e9;
  (p.zone||[]).forEach(r=>{const l=L[r.l];if(!l||!l.els)return;const has=hasPK(r);const a=has&&r.m0!=null?+r.m0:-Infinity,b=has&&r.m1!=null?+r.m1:Infinity;
    l.els.forEach(e=>{if(has&&(e.m1<a||e.m0>b))return;let bb=e.bbox;if(!bb&&e.axis){bb=[1e9,1e9,-1e9,-1e9];e.axis.forEach(pl=>pl.forEach(q=>{bb[0]=Math.min(bb[0],q.x);bb[1]=Math.min(bb[1],q.y);bb[2]=Math.max(bb[2],q.x);bb[3]=Math.max(bb[3],q.y);}));}
      if(!bb||!isFinite(bb[0])||!isFinite(bb[3]))return;x0=Math.min(x0,bb[0]);y0=Math.min(y0,bb[1]);x1=Math.max(x1,bb[2]);y1=Math.max(y1,bb[3]);});});return x0>x1?null:[x0,y0,x1,y1];}
function boxOf(p){const key=(A.state.siteId||'')+'|'+p.id+'|'+JSON.stringify(p.zone||[])+'|'+Object.keys(A.state.lines||{}).length;if(BOXC.has(key))return BOXC.get(key);const b=zoneBox(p);if(BOXC.size>500)BOXC.clear();BOXC.set(key,b);return b;}
function pxOverlay(){const g=ensureG();if(!g)return;const S=A.state;const lay=!!(S.show&&S.show.plansexe);if(!pxOn()||(!lay&&!S.pxFocus)){if(g.firstChild)g.innerHTML='';return;}
  const k=(S.view&&S.view.k)||1;let fr='',lb='';const placed=[];
  plList().forEach(p=>{const foc=S.pxFocus===p.id;if(!lay&&!foc)return;const b=boxOf(p);if(!b)return;const pad=Math.max(1.5,10/k);const x0=b[0]-pad,y0=b[1]-pad,w=b[2]-b[0]+2*pad,hh=b[3]-b[1]+2*pad;const col=foc?'#d6491c':'#6b3fa0';const ix=curOf(p);const lab='P'+p.no+(ix?' · ind. '+ix.i:'');const tw=(lab.length*7+14)/k,th=19/k;
    // étiquette au centre du cadre (deux cadres qui se touchent ne se cachent pas leur n°) ; décalée vers le bas si une autre est déjà là
    let cx=(b[0]+b[2])/2,cy=(b[1]+b[3])/2;for(let t=0;t<12&&placed.some(q=>Math.abs(q.x-cx)<(q.w+tw)/2&&Math.abs(q.y-cy)<th*1.1);t++)cy+=th*1.2;placed.push({x:cx,y:cy,w:tw});
    fr+=`<rect data-pxpl="${esc(p.id)}" x="${x0}" y="${y0}" width="${w}" height="${hh}" fill="${col}" fill-opacity="${foc?.1:.05}" stroke="${col}" stroke-width="${(foc?3.2:2)/k}" stroke-dasharray="${9/k} ${5/k}" rx="${5/k}"/>`;
    lb+=`<g data-pxlab="${esc(p.id)}"><rect x="${cx-tw/2}" y="${cy-th/2}" width="${tw}" height="${th}" rx="${5/k}" fill="${col}" fill-opacity=".92"/><text x="${cx}" y="${cy+4.4/k}" text-anchor="middle" font-size="${12.5/k}" font-weight="700" fill="#fff" font-family="system-ui,sans-serif">${esc(lab)}</text></g>`;});
  g.innerHTML=fr+lb;}
export function pxAfterPlan(){if(!A)return;try{updPlanBtn();pxOverlay();hookTrace();}catch(e){console.warn('plans exé',e);}}
function focusOnPlan(p){const b=boxOf(p);if(!b){A.toast('Cette planche n\'est rattachée à aucune ligne du réseau (⋯ → 📍 Zone)');return;}A.closeModal();A.state.pxFocus=p.id;if(A.goTab)A.goTab('plan');
  setTimeout(()=>{try{A.fitBox(b);}catch(e){}},80);clearTimeout(focusT);focusT=setTimeout(()=>{if(A.state.pxFocus===p.id){A.state.pxFocus=null;try{A.renderPlan();}catch(e){}}},25000);A.toast('Planche '+p.no+' : cadre orange sur le plan');}
/* ── « 📄 Mes plans » : liste, celles de la zone de la soudure ouverte / de ma dernière soudure d'abord ── */
function rowHTML(p,sm){const ix=curOf(p);const zt=zoneTxt(p);return `<div class="pxRow"><button type="button" class="pxRowB" data-pxopen="${esc(p.id)}"><span class="pxNo">${esc(p.no)}</span><span class="tx"><b>${esc(p.title||'Planche '+p.no)}</b><small>ind. ${esc(ix?ix.i:'?')}${ix&&ix.date?' du '+dIso(ix.date):''}${isNewInd(p,sm)?' · <span class="pxNew">nouvel indice</span>':''} · ${zt?esc(zt):'<i>zone non rattachée</i>'}</small></span><span class="chev">›</span></button>${canEd()?`<button type="button" class="btn pxRowM" data-pxman="${esc(p.id)}" aria-label="Gérer la planche ${esc(p.no)}" title="Indices, zone, n° et titre">⋯</button>`:''}</div>`;}
export function pxListOpen(){if(!A)return;if(!pxOn()){A.toast('Plans d\'exé : option pas encore ouverte pour toi');return;}dxCss();const all=plList();const ref=weldRef();const M=ref?pxMatch(ref.l.id,ref.m):[];const ids=new Set(M.map(p=>p.id));const rest=all.filter(p=>!ids.has(p.id));const sm=seenMap();const net=NETc();
  A.openModal(`<div class="pxList"><h3 style="margin-top:0">📄 Plans d'exé${net&&net.name?' — '+esc(net.name):''}</h3>
    ${!all.length?`<div class="hint">Aucune planche pour l'instant${canEd()?' : importe les plans d\'exé depuis l\'onglet Dossier (📄 Plans d\'exé).':' : le chef ou le bureau les importe dans l\'onglet Dossier.'}</div>`:''}
    ${ref&&M.length?`<div class="pxSec">Près de ${esc(ref.j.weldId)} <span>(${esc(ref.why)} · ${esc(lineLab(ref.l.id))}${ref.m!=null?' · PK '+Math.round(ref.m)+' m':''})</span></div>${M.map(p=>rowHTML(p,sm)).join('')}`:''}
    ${ref&&!M.length&&all.length?`<div class="hint">Aucune planche rattachée à la zone de ${esc(ref.j.weldId)} (${esc(ref.why)}).</div>`:''}
    ${rest.length?`${ref&&M.length?'<div class="pxSec">Les autres planches</div>':''}${rest.map(p=>rowHTML(p,sm)).join('')}`:''}
    ${all.length?`<label class="tgl pxShow"><input type="checkbox" id="px-show" ${A.state.show&&A.state.show.plansexe?'checked':''}> Voir les cadres des planches sur le plan (calque « Plans d'exé »)</label>`:''}
    <div class="actions" style="margin-top:8px"><button type="button" class="btn block" data-close>Fermer</button></div></div>`);
  const sh=document.getElementById('px-show');if(sh)sh.onchange=()=>{if(A.setShow)A.setShow('plansexe',sh.checked);A.toast(sh.checked?'Cadres des planches affichés sur le plan':'Cadres des planches masqués');};}
/* ── une planche : indices (historique), zone, n° / titre, retrait ── */
export function pxManOpen(id){const p=plGet(id);if(!p||!A)return;dxCss();const ix=curOf(p);const ed=canEd();const H=(p.ind||[]).slice().reverse();
  A.openModal(`<h3 style="margin-top:0">Planche ${esc(p.no)}${p.title?' — '+esc(p.title):''}</h3>
   <div class="kv" style="font-size:12.5px"><span>indice en cours <b>${esc(ix?ix.i:'?')}</b>${ix&&ix.date?' du '+dIso(ix.date):''}</span>${ix&&ix.page?`<span>page ${ix.page}</span>`:''}</div>
   <div class="${p.zone&&p.zone.length?'hint':'warnbox'}">${p.zone&&p.zone.length?'Zone : '+esc(zoneTxt(p)):'⚠ Zone non rattachée : le raccourci des fiches soudure ne trouve pas cette planche.'}</div>
   <div class="actions" style="margin-top:8px"><button type="button" class="btn primary block" data-pxopen="${esc(p.id)}">📄 Ouvrir la planche</button>${p.zone&&p.zone.length?`<button type="button" class="btn block" id="px-focus">📍 Voir sur le plan</button>`:''}
    ${ed?`<label class="btn block">⬆ Nouvel indice (PDF ou image)<input type="file" id="px-newind" accept="application/pdf,image/*" style="display:none"></label><button type="button" class="btn block" id="px-zone">📍 Zone sur le réseau</button><button type="button" class="btn block" id="px-edit">✎ N° et titre</button>`:''}</div>
   <b style="display:block;margin-top:10px;font-size:12.5px">Indices (${H.length})</b>
   <table class="rc pxHist">${H.map((x,i)=>`<tr><td><b>${esc(x.i)}</b>${x.date?' du '+dIso(x.date):''}${i===0?' <span class="pxCur">en cours</span>':` <span class="dim">— remplacé par l'indice ${esc(H[i-1].i)}${H[i-1].date?' du '+dShort(H[i-1].date):''}</span>`}<div class="dim" style="font-size:11px">${esc(x.by||'')}${x.page?' · page '+x.page:''}</div></td><td style="text-align:right"><button type="button" class="btn sm" data-pxopen="${esc(p.id)}" data-pxind="${esc(x.id)}" style="min-height:34px">Ouvrir</button></td></tr>`).join('')}</table>
   ${ed?`<button type="button" class="btn block" id="px-del" style="color:#d03b3b;margin-top:8px">Retirer la planche</button>`:''}
   <div class="actions" style="margin-top:8px"><button type="button" class="btn block" data-close>Fermer</button></div>`);
  const md=document.getElementById('modal');if(!md)return;const q=s=>md.querySelector(s);
  const fo=q('#px-focus');if(fo)fo.onclick=()=>focusOnPlan(p);
  const ni=q('#px-newind');if(ni)ni.onchange=()=>{const f=ni.files&&ni.files[0];ni.value='';if(f)newIndFlow(p,f);};
  const zo=q('#px-zone');if(zo)zo.onclick=()=>pxZoneOpen(p.id);
  const eb=q('#px-edit');if(eb)eb.onclick=()=>editFlow(p);
  const db=q('#px-del');if(db)db.onclick=()=>{if(!confirm('Retirer la planche '+p.no+' des plans d\'exé ? (le fichier reste au Dossier)'))return;p.deleted=true;p.deletedBy=A.userName();p.upd=new Date().toISOString();save();A.closeModal();A.toast('Planche '+p.no+' retirée');};}
function save(){A.saveNet('admin');try{if(A.rerenderDossier)A.rerenderDossier();}catch(e){}try{A.renderPlan&&A.state.tab==='plan'&&A.renderPlan();}catch(e){}}
function editFlow(p){A.openModal(`<h3 style="margin-top:0">Planche ${esc(p.no)} — n° et titre</h3><label class="f" for="pxe-no">N° de planche</label><input class="f" id="pxe-no" value="${esc(p.no)}" style="width:100%"><label class="f" for="pxe-ti" style="margin-top:6px">Titre</label><input class="f" id="pxe-ti" value="${esc(p.title||'')}" style="width:100%" placeholder="ex. rue des Lilas — PK 0 à 250">
   <div class="actions" style="margin-top:8px"><button type="button" class="btn primary block" id="pxe-ok">Enregistrer</button><button type="button" class="btn block" data-close>Annuler</button></div>`);
  document.getElementById('pxe-ok').onclick=()=>{const no=document.getElementById('pxe-no').value.trim();const ti=document.getElementById('pxe-ti').value.trim();if(!no){A.toast('Le n° de planche');return;}
    if(plList().some(x=>x.id!==p.id&&String(x.no).toLowerCase()===no.toLowerCase())){A.toast('La planche '+no+' existe déjà');return;}p.no=no;p.title=ti;p.upd=new Date().toISOString();save();pxManOpen(p.id);};}
/* zone : des lignes (cases à cocher) + PK facultatifs */
export function pxZoneOpen(id){const p=plGet(id);if(!p||!A)return;const ls=Object.values(A.state.lines||{}).sort((a,b)=>nat(a.id,b.id));const Z={};(p.zone||[]).forEach(r=>{Z[r.l]=r;});
  A.openModal(`<h3 style="margin-top:0">📍 Zone de la planche ${esc(p.no)}</h3>${A.boundZone?`<button type="button" class="btn primary block" id="pxz-bound" style="min-height:52px">📍 Borner sur le plan (comme une phase)</button><div class="hint" style="margin:6px 0 10px">Touche le début puis la fin de la zone sur le plan ; une antenne : touche-la jusqu'où va la planche.${(p.zone||[]).length?' Zone actuelle : '+esc(zoneTxt(p))+'.':''}</div><details class="pxZmore"><summary style="cursor:pointer;font-size:13px">ou par lignes et PK</summary>`:''}<div class="hint" style="margin-top:0">Coche les lignes que la planche couvre ; si elle n'en couvre qu'un morceau, indique les PK (facultatif). Le raccourci des fiches soudure s'en sert.</div>
   ${ls.length?ls.map(l=>{const r=Z[l.id];return `<div class="pxZr ${r?'on':''}" data-l="${esc(l.id)}"><label class="pxZc"><input type="checkbox" ${r?'checked':''}> <b>${esc(lineLab(l.id))}</b> <span class="dim">${Math.round(lineLen(l))} m</span></label><div class="pxZpk" style="${r?'':'display:none'}">PK de <input class="f m0" inputmode="decimal" value="${r&&r.m0!=null?esc(r.m0):''}" placeholder="0" aria-label="PK de début"> à <input class="f m1" inputmode="decimal" value="${r&&r.m1!=null?esc(r.m1):''}" placeholder="${Math.round(lineLen(l))}" aria-label="PK de fin"> m</div></div>`;}).join(''):'<div class="warnbox">Ce chantier n\'a pas encore de lignes tracées.</div>'}
   <div class="actions" style="margin-top:8px"><button type="button" class="btn ${A.boundZone?'':'primary '}block" id="pxz-ok">Enregistrer la zone</button></div>${A.boundZone?'</details>':''}<div class="actions" style="margin-top:8px"><button type="button" class="btn block" data-close>Annuler</button></div>`);
  {const bz=document.getElementById('pxz-bound');if(bz)bz.onclick=()=>{A.boundZone({label:'la planche '+p.no,onDone:tr=>{p.zone=tr.map(t=>({l:t.line,m0:Math.round(+t.m0*10)/10,m1:Math.round(+t.m1*10)/10}));p.upd=new Date().toISOString();save();A.toast('Zone de la planche '+p.no+' : '+zoneTxt(p));pxManOpen(p.id);},onCancel:()=>pxManOpen(p.id)});};} /* 01/11 (Ethan) : borner comme une phase */
  const md=document.getElementById('modal');md.querySelectorAll('.pxZr').forEach(r=>{const cb=r.querySelector('input[type=checkbox]');cb.onchange=()=>{r.classList.toggle('on',cb.checked);r.querySelector('.pxZpk').style.display=cb.checked?'':'none';};});
  document.getElementById('pxz-ok').onclick=()=>{const out=[];let bad='';const num=v=>{v=String(v||'').trim().replace(',','.');if(v==='')return null;const n=+v;return isFinite(n)&&n>=0?Math.round(n*10)/10:NaN;};
    md.querySelectorAll('.pxZr').forEach(r=>{if(!r.querySelector('input[type=checkbox]').checked)return;let m0=num(r.querySelector('.m0').value),m1=num(r.querySelector('.m1').value);if(Number.isNaN(m0)||Number.isNaN(m1)){bad=r.dataset.l;return;}if(m0!=null&&m1!=null&&m0>m1){const t=m0;m0=m1;m1=t;}const z={l:r.dataset.l};if(m0!=null)z.m0=m0;if(m1!=null)z.m1=m1;out.push(z);});
    if(bad){A.toast('PK invalide sur '+lineLab(bad)+' (un nombre de mètres)');return;}p.zone=out;p.upd=new Date().toISOString();save();A.toast(out.length?'Zone de la planche '+p.no+' : '+zoneTxt(p):'Planche '+p.no+' : plus de zone');pxManOpen(p.id);};}
/* ── fichiers : pages d'un PDF, envoi ── */
async function countPages(f){const lib=await pdfLib();if(!lib)return 0;try{const doc=await lib.getDocument({data:new Uint8Array(await f.arrayBuffer())}).promise;const n=doc.numPages;try{doc.destroy();}catch(e){}return n;}catch(e){console.warn('plans exé : pages',e);return 0;}}
const kindOf=f=>/pdf$/i.test(f.type||'')||/\.pdf$/i.test(f.name||'')?'pdf':/^image\//i.test(f.type||'')||/\.(png|jpe?g|webp|gif)$/i.test(f.name||'')?'img':null;
async function upload(f,n){const d=await A.addDoc(f,'exe',{pl:true,pages:n||1,note:'Plans d\'exé'});return d||null;}
/* nouvel indice d'UNE planche (fichier d'une page, ou page choisie d'un PDF) */
async function newIndFlow(p,f){const kind=kindOf(f);if(!kind){A.toast(f.name+' : ni PDF ni image');return;}const n=kind==='pdf'?await countPages(f):1;const cur=curOf(p);const pg0=n>1?Math.min(n,(cur&&cur.page)||1):1;
  A.openModal(`<h3 style="margin-top:0">⬆ Nouvel indice — planche ${esc(p.no)}</h3><div class="hint" style="margin-top:0">${esc(f.name)}${n>1?' · '+n+' pages':''}</div>
   <div class="pxImpG"><label>Indice<input class="f" id="pxn-i" value="${esc(nextInd(cur&&cur.i))}" maxlength="6"></label><label>Date de l'indice<input class="f" id="pxn-d" type="date" value="${todayISO()}"></label>${n>1?`<label>Page du fichier<select class="f" id="pxn-p">${Array.from({length:n},(_,k)=>`<option value="${k+1}" ${k+1===pg0?'selected':''}>page ${k+1}</option>`).join('')}</select></label>`:''}</div>
   ${cur?`<div class="hint">L'indice ${esc(cur.i)}${cur.date?' du '+dIso(cur.date):''} reste dans l'historique (« remplacé par… »).</div>`:''}
   <div class="actions" style="margin-top:8px"><button type="button" class="btn primary block" id="pxn-ok">Enregistrer le nouvel indice</button><button type="button" class="btn block" data-close>Annuler</button></div>`);
  document.getElementById('pxn-ok').onclick=async()=>{const i=document.getElementById('pxn-i').value.trim().toUpperCase();const date=document.getElementById('pxn-d').value||todayISO();const ps=document.getElementById('pxn-p');const page=ps?+ps.value:1;
    if(!i){A.toast('L\'indice (A, B, C…)');return;}if((p.ind||[]).some(x=>String(x.i).toUpperCase()===i)){A.toast('L\'indice '+i+' existe déjà pour cette planche');return;}
    const b=document.getElementById('pxn-ok');b.disabled=true;b.textContent='Envoi du plan…';const d=await upload(f,n);if(!d){b.disabled=false;b.textContent='Enregistrer le nouvel indice';return;}
    if(!document.body.contains(b)){A.toast('Nouvel indice interrompu : le fichier reste au Dossier (Plans d’exécution)');return;} /* fenêtre fermée pendant l'envoi */
    const q=plList().find(x=>x.id===p.id)||p;q.ind=q.ind||[];q.ind.push({id:pid('PI'),i,date,doc:d.id,url:d.url||undefined,page,kind,by:A.userName(),at:new Date().toISOString()});q.upd=new Date().toISOString();markSeen(q);save();A.toast('Planche '+q.no+' : indice '+i+' du '+dShort(date)+' en vigueur');pxManOpen(q.id);};}
/* IMPORT : plusieurs fichiers, une page = une planche ; même n° qu'une planche existante = nouvel indice */
export async function pxImportFiles(files){if(!A)return;if(!canEd()){A.toast('Réservé au chef / bureau (droit « Dossier »)');return;}if(!admW())return;dxCss();
  const F=[];for(const f of [...(files||[])]){const kind=kindOf(f);if(!kind){A.toast(f.name+' : ni PDF ni image — ignoré');continue;}const n=kind==='pdf'?await countPages(f):1;F.push({f,kind,n:n||1,known:kind==='img'||!!n});}
  if(!F.length)return;const all=plList();const maxNo=all.reduce((m,p)=>Math.max(m,parseInt(p.no,10)||0),0);const R=[];F.forEach((x,fi)=>{for(let pg=1;pg<=x.n;pg++)R.push({fi,page:pg,title:baseName(x.f.name)+(x.n>1?' — p. '+pg:''),touched:false});});
  const today=todayISO();const unk=F.filter(x=>!x.known).length;
  A.openModal(`<h3 style="margin-top:0">📄 Importer des plans d'exé</h3><div class="hint" style="margin-top:0">${F.length} fichier${F.length>1?'s':''} · ${R.length} page${R.length>1?'s':''} → une planche par page. <b>Même n° qu'une planche existante = nouvel indice</b> de cette planche (l'ancien reste dans l'historique).</div>
   ${unk?`<div class="warnbox">Pages non lues (moteur PDF indisponible, hors connexion ?) : chaque PDF est gardé entier, page 1.</div>`:''}
   <div class="pxImpG"><label>Numéroter à partir de<input class="f" id="pxi-start" type="number" min="0" inputmode="numeric" value="${maxNo+1}"></label><label>Date de l'indice<input class="f" id="pxi-date" type="date" value="${today}"></label></div>
   <div class="pxImpRows">${R.map((r,k)=>`<div class="pxImpR" data-r="${k}"><span class="pg">${F.length>1?'F'+(r.fi+1)+' ':''}p. ${r.page}</span><input class="f no" aria-label="N° de planche" autocomplete="off"><input class="f ti" aria-label="Titre de la planche" value="${esc(r.title)}"><input class="f in" aria-label="Indice" maxlength="6"><small class="st"></small></div>`).join('')}</div>
   <div class="actions" style="margin-top:8px"><button type="button" class="btn primary block" id="pxi-ok">Importer ${R.length} planche${R.length>1?'s':''}</button><button type="button" class="btn block" data-close>Annuler</button></div>`);
  const md=document.getElementById('modal');const rows=[...md.querySelectorAll('.pxImpR')];
  const upd=r=>{const no=r.querySelector('.no').value.trim();const ex=no?all.find(p=>String(p.no).toLowerCase()===no.toLowerCase()):null;const inp=r.querySelector('.in');const st=r.querySelector('.st');const R0=R[+r.dataset.r];
    if(!R0.touched)inp.value=ex?nextInd((curOf(ex)||{}).i):'A';const c=ex&&curOf(ex);st.className='st'+(ex?' re':'');st.textContent=ex?'↻ nouvel indice de la planche '+ex.no+' ('+(c?c.i:'?')+' → '+(inp.value||'?')+')':no?'nouvelle planche '+no:'⚠ n° à renseigner';};
  const renum=()=>{const s=parseInt(md.querySelector('#pxi-start').value,10);rows.forEach((r,k)=>{r.querySelector('.no').value=isFinite(s)?String(s+k):'';upd(r);});};
  rows.forEach(r=>{r.querySelector('.no').oninput=()=>upd(r);const inp=r.querySelector('.in');inp.oninput=()=>{R[+r.dataset.r].touched=true;upd(r);};});md.querySelector('#pxi-start').oninput=renum;renum();
  md.querySelector('#pxi-ok').onclick=async()=>{const date=md.querySelector('#pxi-date').value||today;const V=rows.map(r=>({r:R[+r.dataset.r],no:r.querySelector('.no').value.trim(),title:r.querySelector('.ti').value.trim(),i:(r.querySelector('.in').value.trim()||'A').toUpperCase()}));
    if(V.some(v=>!v.no)){A.toast('Chaque page a besoin d\'un n° de planche');return;}const seen=new Set();for(const v of V){const k=v.no.toLowerCase();if(seen.has(k)){A.toast('Le n° '+v.no+' est en double dans l\'import');return;}seen.add(k);}
    for(const v of V){const ex=all.find(p=>String(p.no).toLowerCase()===v.no.toLowerCase());if(ex&&(ex.ind||[]).some(x=>String(x.i).toUpperCase()===v.i)){A.toast('Planche '+ex.no+' : l\'indice '+v.i+' existe déjà');return;}}
    const b=md.querySelector('#pxi-ok');b.disabled=true;const docs=[];for(let fi=0;fi<F.length;fi++){b.textContent='Envoi du plan '+(fi+1)+' / '+F.length+'…';docs[fi]=await upload(F[fi].f,F[fi].n);}
    if(!document.body.contains(b)){if(docs.some(Boolean))A.toast('Import interrompu : le fichier reste au Dossier (Plans d’exécution), aucune planche créée');return;} /* fenêtre fermée pendant l'envoi */
    const ad=admW();if(!ad){A.closeModal();return;}const now=new Date().toISOString(),me=A.userName();let nNew=0,nInd=0,skip=0;
    V.forEach(v=>{const d=docs[v.r.fi];if(!d){skip++;return;}const x=F[v.r.fi];const ind={id:pid('PI'),i:v.i,date,doc:d.id,url:d.url||undefined,page:v.r.page,kind:x.kind,by:me,at:now};
      const ex=plOf(A.net()).find(p=>String(p.no).toLowerCase()===v.no.toLowerCase());if(ex){ex.ind.push(ind);if(v.title&&!ex.title)ex.title=v.title;ex.upd=now;markSeen(ex);nInd++;}
      else{const p={id:pid('PL'),no:v.no,title:v.title,zone:[],ind:[ind],by:me,at:now,upd:now};ad.pl.push(p);markSeen(p);nNew++;}});
    A.closeModal();if(nNew||nInd)save();
    A.toast((nNew?nNew+' planche'+(nNew>1?'s':'')+' importée'+(nNew>1?'s':''):'')+(nNew&&nInd?' · ':'')+(nInd?nInd+' nouvel'+(nInd>1?'s':'')+' indice'+(nInd>1?'s':''):'')+(skip?' · '+skip+' page'+(skip>1?'s':'')+' non importée'+(skip>1?'s':'')+' (fichier non envoyé)':'')+(nNew?' — rattache-les au réseau (⋯ → 📍 Zone)':''));};}
/* ── LECTEUR : la page voulue, zoom, cache hors réseau ── */
const PXC='trace:pxc:';let PXC_MAX=30*1024*1024;const MAXSIDE=4096,MAXPX=12e6;let pxcQ=Promise.resolve();let lastURL=null;
function hashS(s){let h=0x811c9dc5;for(let i=0;i<s.length;i++){h^=s.charCodeAt(i);h=Math.imul(h,0x01000193);}return (h>>>0).toString(36)+'_'+s.length.toString(36);}
async function pxcIdx(){try{const v=A.kv?await A.kv.get(PXC+'idx'):null;return Array.isArray(v)?v:[];}catch(e){return [];}}
async function pxcGet(k){try{if(!A.kv)return null;const v=await A.kv.get(PXC+k);if(!v||!v.blob)return null;pxcQ=pxcQ.then(async()=>{const idx=await pxcIdx();const it=idx.find(x=>x.k===k);if(it){it.at=Date.now();await A.kv.set(PXC+'idx',idx);}}).catch(()=>{});return v;}catch(e){return null;}}
function pxcPut(k,blob,meta){pxcQ=pxcQ.then(async()=>{if(!A.kv||!blob)return;const size=blob.size||0;if(size>PXC_MAX)return;await A.kv.set(PXC+k,Object.assign({blob,at:Date.now(),size},meta||{}));
  const idx=(await pxcIdx()).filter(x=>x.k!==k);idx.push({k,size,at:Date.now()});idx.sort((a,b)=>a.at-b.at);let tot=idx.reduce((s,x)=>s+(x.size||0),0);
  while(tot>PXC_MAX&&idx.length>1){const o=idx.shift();tot-=o.size||0;try{await A.kv.del(PXC+o.k);}catch(e){}}await A.kv.set(PXC+'idx',idx);}).catch(e=>console.warn('plans exé : cache',e));return pxcQ;}
async function getBytes(src){if(/^data:/i.test(src)){const i=src.indexOf(',');const meta=src.slice(5,i);const raw=/;base64/i.test(meta)?atob(src.slice(i+1)):decodeURIComponent(src.slice(i+1));const u=new Uint8Array(raw.length);for(let k=0;k<raw.length;k++)u[k]=raw.charCodeAt(k);return u;}
  const ac=typeof AbortController!=='undefined'?new AbortController():null;const tm=setTimeout(()=>{try{if(ac)ac.abort();}catch(e){}},30000);
  try{let r;try{r=await fetch(src,{signal:ac?ac.signal:undefined});}catch(e){const er=new Error('réseau');er.net=true;throw er;}if(!r.ok){const er=new Error('HTTP '+r.status);er.http=r.status;throw er;}return new Uint8Array(await r.arrayBuffer());}finally{clearTimeout(tm);}}
const isPdfB=u=>u&&u.length>4&&u[0]===0x25&&u[1]===0x50&&u[2]===0x44&&u[3]===0x46;
const imgMime=u=>!u||u.length<4?null:u[0]===0x89&&u[1]===0x50?'image/png':u[0]===0xFF&&u[1]===0xD8?'image/jpeg':u[0]===0x47&&u[1]===0x49?'image/gif':u[0]===0x52&&u[1]===0x49?'image/webp':null;
async function renderPdfPage(lib,bytes,page){const doc=await lib.getDocument({data:bytes}).promise;try{const n=doc.numPages;const pn=Math.max(1,Math.min(n,+page||1));const pg=await doc.getPage(pn);const v1=pg.getViewport({scale:1});
  const sc=Math.max(.4,Math.min(MAXSIDE/Math.max(v1.width,v1.height),Math.sqrt(MAXPX/(v1.width*v1.height))));const vp=pg.getViewport({scale:sc});const cv=document.createElement('canvas');cv.width=Math.max(1,Math.floor(vp.width));cv.height=Math.max(1,Math.floor(vp.height));
  const cx=cv.getContext('2d');cx.fillStyle='#fff';cx.fillRect(0,0,cv.width,cv.height);await pg.render({canvasContext:cx,viewport:vp}).promise;const blob=await new Promise(res=>{try{cv.toBlob(res,'image/jpeg',.86);}catch(e){res(null);}});const w=cv.width,h=cv.height;cv.width=1;cv.height=1;
  if(!blob)throw new Error('image');return {blob,n,page:pn,w,h};}finally{try{doc.destroy();}catch(e){}}}
// image d'une page : cache d'abord (une version d'indice ne change jamais : nouveau fichier = nouvel indice), sinon fichier → rendu → cache
async function pageImage(src,page,kind){if(!src)return {err:'nofile'};const key=hashS(src)+':'+(+page||1);const hit=await pxcGet(key);if(hit&&hit.blob)return {blob:hit.blob,n:hit.n||null,page:+page||1,cache:true};
  let bytes=null;try{bytes=await getBytes(src);}catch(e){return {err:e&&e.http?'http':'offline',status:e&&e.http};}
  const im=imgMime(bytes);if(kind==='img'||(im&&!isPdfB(bytes))){const blob=new Blob([bytes],{type:im||'image/jpeg'});if(!/^data:/i.test(src))pxcPut(key,blob,{n:1});return {blob,n:1,page:1};}
  const lib=await pdfLib();if(!lib)return {err:'nopdf'};
  try{const r=await renderPdfPage(lib,bytes,page);pxcPut(key,r.blob,{n:r.n});return r;}catch(e){console.warn('plans exé : rendu',e);return {err:'pdf'};}}
let VZ=1,VFIT=1; // zoom = largeur de l'image / largeur du lecteur ; VFIT = toute la planche visible (100 % affiché)
function fitZ(){const body=document.getElementById('pxv-body');const img=document.getElementById('pxv-img');if(!body||!img||!img.naturalWidth||!img.naturalHeight)return 1;const cw=body.clientWidth||1,ch=body.clientHeight||1;return Math.max(.05,Math.min(1,(ch*img.naturalWidth/img.naturalHeight)/cw));}
function setZoom(z,cx,cy){const body=document.getElementById('pxv-body');const img=document.getElementById('pxv-img');if(!body||!img)return;z=Math.max(VFIT,Math.min(8,z));const r=body.getBoundingClientRect();const px=cx==null?r.width/2:cx-r.left,py=cy==null?r.height/2:cy-r.top;
  const fx=(body.scrollLeft+px-img.offsetLeft)/(img.offsetWidth||1),fy=(body.scrollTop+py-img.offsetTop)/(img.offsetHeight||1);VZ=z;img.style.width=(z*100)+'%';
  body.scrollLeft=fx*img.offsetWidth+img.offsetLeft-px;body.scrollTop=fy*img.offsetHeight+img.offsetTop-py;const st=document.getElementById('pxv-z');if(st)st.textContent=Math.round(z/VFIT*100)+' %';}
function bindGestures(body){const P=new Map();let pinch=null,drag=null;
  body.addEventListener('pointerdown',e=>{P.set(e.pointerId,{x:e.clientX,y:e.clientY});try{body.setPointerCapture(e.pointerId);}catch(x){}if(P.size===2){const [a,b]=[...P.values()];pinch={d:Math.hypot(a.x-b.x,a.y-b.y),z:VZ};drag=null;}else if(P.size===1){drag={x:e.clientX,y:e.clientY,sl:body.scrollLeft,st:body.scrollTop};}});
  body.addEventListener('pointermove',e=>{if(!P.has(e.pointerId))return;P.set(e.pointerId,{x:e.clientX,y:e.clientY});if(pinch&&P.size>=2){const [a,b]=[...P.values()];const d=Math.hypot(a.x-b.x,a.y-b.y);if(pinch.d>12)setZoom(pinch.z*d/pinch.d,(a.x+b.x)/2,(a.y+b.y)/2);return;}
    if(drag&&P.size===1){body.scrollLeft=drag.sl-(e.clientX-drag.x);body.scrollTop=drag.st-(e.clientY-drag.y);}});
  const up=e=>{P.delete(e.pointerId);if(P.size<2)pinch=null;if(!P.size)drag=null;else if(P.size===1){const [a]=[...P.values()];drag={x:a.x,y:a.y,sl:body.scrollLeft,st:body.scrollTop};}};body.addEventListener('pointerup',up);body.addEventListener('pointercancel',up);
  body.addEventListener('wheel',e=>{if(!e.ctrlKey)return;e.preventDefault();setZoom(VZ*(e.deltaY<0?1.2:1/1.2),e.clientX,e.clientY);},{passive:false});
  body.addEventListener('dblclick',e=>{setZoom(VZ>VFIT*1.5?VFIT:VZ*2.5,e.clientX,e.clientY);});}
export async function pxOpen(id,indId){if(!A)return;if(!pxOn()){A.toast('Plans d\'exé : option pas encore ouverte pour toi');return;}const p=plGet(id);if(!p){A.toast('Planche introuvable');return;}const cur=curOf(p);const ix=(indId&&(p.ind||[]).find(x=>x.id===indId))||cur;if(!ix){A.toast('Planche sans fichier');return;}dxCss();
  const old=ix!==cur;VZ=1;
  A.openModal(`<div class="pxv" data-pl="${esc(p.id)}" data-ind="${esc(ix.id)}"><div class="pxv-top"><div class="pxv-t"><b>Planche ${esc(p.no)} · ind. ${esc(ix.i)}</b><small>${ix.date?'du '+dIso(ix.date):''}${p.title?' · '+esc(p.title):''}</small></div><button type="button" class="btn pxv-x" data-close aria-label="Fermer" title="Fermer">✕</button></div>
    ${old?`<div class="warnbox pxv-old">⚠ Indice ${esc(ix.i)} remplacé par l'indice ${esc(cur.i)}${cur.date?' du '+dShort(cur.date):''} : ce n'est pas le plan en vigueur. <button type="button" class="btn sm" data-pxopen="${esc(p.id)}">Ouvrir l'indice ${esc(cur.i)}</button></div>`:''}
    <div class="pxv-tools"><button type="button" class="btn" data-pxz="out" aria-label="Dézoomer" title="Dézoomer">−</button><button type="button" class="btn" data-pxz="in" aria-label="Zoomer" title="Zoomer">＋</button><button type="button" class="btn" data-pxz="fit" aria-label="Toute la planche" title="Toute la planche">⤢</button><span class="pxv-st"><span id="pxv-st"></span> · <span id="pxv-z">100 %</span></span><button type="button" class="btn txt" id="pxv-hist">Indices (${(p.ind||[]).length})</button></div>
    <div class="pxv-body" id="pxv-body"><div class="pxv-msg">Ouverture de la planche ${esc(p.no)}…</div></div></div>`);
  const md=document.getElementById('modal');if(md)md.classList.add('full');
  const hb=document.getElementById('pxv-hist');if(hb)hb.onclick=()=>pxManOpen(p.id);
  md.querySelectorAll('[data-pxz]').forEach(b=>b.onclick=()=>{const z=b.dataset.pxz;if(z==='fit'){VFIT=fitZ();setZoom(VFIT);return;}setZoom(z==='in'?VZ*1.6:VZ/1.6);});
  const body=document.getElementById('pxv-body');if(body)bindGestures(body);
  const src=srcOf(ix);const r=await pageImage(src,ix.page||1,ix.kind);
  const body2=document.getElementById('pxv-body');const still=md&&md.querySelector('.pxv')&&md.querySelector('.pxv').dataset.ind===ix.id;if(!body2||!still)return;
  if(r.err){const msg=r.err==='offline'?'<b>Plan non disponible hors connexion</b> — ouvre-le une fois avec du réseau : il restera lisible sur cet appareil.':r.err==='http'?'Fichier introuvable au serveur'+(r.status?' ('+r.status+')':'')+' : dépose-le de nouveau (Dossier → 📄 Plans d\'exé).':r.err==='nofile'?'Cette planche n\'a pas de fichier.':r.err==='nopdf'?'Le lecteur de PDF ne s\'est pas chargé (réseau ?) : réessaie avec du réseau.':'Ce fichier ne s\'ouvre pas (PDF abîmé ?).';
    body2.innerHTML=`<div class="pxv-msg" data-err="${esc(r.err)}"><div class="warnbox">${msg}</div>${src&&!/^data:/i.test(src)&&r.err!=='offline'?`<a class="btn block" href="${esc(src)}" target="_blank" rel="noopener" style="margin-top:8px">Ouvrir le fichier dans un onglet</a>`:''}</div>`;return;}
  if(lastURL){try{URL.revokeObjectURL(lastURL);}catch(e){}}lastURL=URL.createObjectURL(r.blob);
  body2.innerHTML=`<img id="pxv-img" alt="Planche ${esc(p.no)}, indice ${esc(ix.i)}" data-page="${r.page||ix.page||1}" data-cache="${r.cache?1:0}" draggable="false" style="visibility:hidden">`;const img=document.getElementById('pxv-img');img.src=lastURL;
  try{await img.decode();}catch(e){}VFIT=fitZ();VZ=VFIT;img.style.width=(VZ*100)+'%';img.style.visibility='';const zl=document.getElementById('pxv-z');if(zl)zl.textContent='100 %';
  const st=document.getElementById('pxv-st');if(st)st.textContent=(r.n&&r.n>1?'page '+(r.page||ix.page||1)+' / '+r.n:'page '+(r.page||ix.page||1))+(r.cache?' · gardée sur l\'appareil':'');
  if(!old)markSeen(p);try{updPlanBtn();}catch(e){}}
/* ── onglet Dossier : section « 📄 Plans d'exé » ── */
export function pxDossierHTML(){if(!A||!pxOn())return '';dxCss();const all=plList();const ed=canEd();const sm=seenMap();const nz=all.filter(p=>!(p.zone&&p.zone.length)).length;const nNew=all.filter(p=>isNewInd(p,sm)).length;const show=all.slice(0,8);
  const imp=t=>`<label class="btn ${t?'primary block':''}">${t||'＋ Importer des plans'}<input type="file" id="px-imp" accept="application/pdf,image/*" multiple style="display:none"></label>`;
  return `<div class="eq-app dx px"><div class="ac-h" id="px-sec"><b>📄 Plans d'exé</b><span>${all.length?all.length+' planche'+(all.length>1?'s':''):'aucune planche'}${nNew?' · '+nNew+' nouvel'+(nNew>1?'s':'')+' indice'+(nNew>1?'s':''):''}</span></div>
   <div class="card">${all.length?`<div class="pxBtns"><button type="button" class="btn primary" data-pxlist="1">📄 Mes plans</button>${ed?imp():''}</div>`
     :ed?`${imp('＋ Importer les plans d\'exé (PDF, images)')}<div class="hint">Un PDF de plusieurs pages = une planche par page (n°, titre, indice, date). Les soudeurs les ouvrent depuis la fiche d'une soudure et le bouton « 📄 Mes plans » du plan.</div>`
     :'<div class="hint">Aucun plan d\'exé pour l\'instant : le chef ou le bureau les importe ici.</div>'}
    ${nz&&ed?`<div class="warnbox">⚠ ${nz} planche${nz>1?'s':''} sans zone : rattache-les au réseau (⋯ → 📍 Zone) pour le raccourci des fiches soudure.</div>`:''}
    ${show.map(p=>rowHTML(p,sm)).join('')}${all.length>show.length?`<button type="button" class="btn block" data-pxlist="1" style="margin-top:6px">Toutes les planches (${all.length}) ›</button>`:''}</div></div>`;}
export function pxDossierBind(el){if(!el)return;const i=el.querySelector('#px-imp');if(i)i.onchange=()=>{const fs=[...(i.files||[])];i.value='';if(fs.length)pxImportFiles(fs);};}
/* ── tests / outillage (window.TRACE.dx) ── */
function hookTrace(){try{if(typeof window!=='undefined'&&window.TRACE&&!window.TRACE.dx)window.TRACE.dx={list:()=>plList().map(p=>({id:p.id,no:p.no,title:p.title,ind:(p.ind||[]).map(x=>x.i),cur:(curOf(p)||{}).i,page:(curOf(p)||{}).page,zone:p.zone||[],isNew:isNewInd(p)})),
  match:(l,m)=>pxMatch(l,m).map(p=>p.no),ref:()=>{const r=weldRef();return r?{weld:r.j.weldId,line:r.l.id,m:r.m,why:r.why}:null;},open:(id,ind)=>pxOpen(id,ind),openNo:no=>{const p=plList().find(x=>String(x.no)===String(no));return p?pxOpen(p.id):null;},
  listOpen:()=>pxListOpen(),man:id=>pxManOpen(id),zone:id=>pxZoneOpen(id),importFiles:fs=>pxImportFiles(fs),nextInd,
  cacheInfo:async()=>{await pxcQ;const i=await pxcIdx();return {n:i.length,bytes:i.reduce((s,x)=>s+(x.size||0),0),keys:i.map(x=>x.k)};},setCacheMax:b=>{PXC_MAX=+b||30*1024*1024;}};}catch(e){}}
