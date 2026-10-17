// mutu.js — LOT MU (16/10 soir) : CHANTIER MUTUALISÉ, côté appli. Ethan : « nous avons par exemple tout <ville> 2025, ensuite <ville> 2026 sort ; quand nous commençons
// le chantier 2026, le 2025 n'est pas fini et certaines antennes du 2026 sont des prolongements de 2025 ; visuellement pour les gars je ne vais pas leur mettre 2 chantiers
// dans leur section chantier […] il faut pouvoir qu'en phase chantier un chantier gagné soit mutualisé avec un ancien et qu'il partage le même accueil, le même plan etc. »
// Option A (« options A parfaite ! ») : au gain du 2026, « Nouveau chantier » (comme aujourd'hui) ou « ➕ Ajouter au chantier en cours » ; plus tard, depuis « Tracé & chantiers ».
//  · RATTACHER : les lignes de l'étude (plans de fond, zones, extrémités) rejoignent le chantier — calées par le géoréférencement des deux tracés, sinon dans le traceur
//    (maquette/mutucal.js : l'étude posée par 1 ou 2 points, mêmes outils que le calage d'un plan) ; fusion PURE dans mutufus.js ; écriture par le même chemin qu'un
//    enregistrement du traceur (copie de l'appareil trace:handoff + sync.saveSite) ; l'affaire : a.sites (l'étude remplacée par le chantier), a.mutu = {site, at, by, etude} ;
//    l'étude garde son repère fiche.etude.verse = {site, aff, at} : cachée de Chantiers, jamais rattachée à nouveau, « versée » (lecture seule) dans l'affaire.
//  · LES GARS : un seul chantier (nom commun), une puce « Toutes · 2025 · 2026 » qui filtre le plan, la liste, le récap et l'export (DOE), un liseré discret par affaire.
//  · LE COMMERCE : quantités / phases / soudures-ml par DN du tracé = les lignes de l'affaire ouverte ; avancement par affaire ; marché et TS de chaque affaire à part
//    (onglet Modifs : affaire de la puce, l'origine quand « Toutes ») ; « ↩ Annuler le rattachement » tant que rien n'est fait sur ses lignes, sinon « Détacher » (étape suivante).
import {regGet,regAll} from './reg.js';
import {mergeSites,unmergeSite,activityOn,tfFromGeo,commonName,affLabels,isMutu,origOf,affOfLine,lineIdsOf,MU_COLORS} from './mutufus.js';
import {marcheSnapshot} from './marche.js';
import {mergeServerParts} from './sync.js';
import {partageClean} from './mutufus.js';
import {initMv,mvOperator,mvSel,mvResetSel,mvLineIdIn,mvRecIn,mvTag,mvFoldHTML,mvFoldRead,mvWireRows,mvOpenPartage,mvTestApi} from './mutu2.js'; // 17/10 (lot MV) : commun / séparé par dossier, sélecteur d'affaire, vue des opérateurs (mutu2.js)
let A=null;
const esc=s=>String(s??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const nb=(x,d)=>(+x||0).toLocaleString('fr-FR',{maximumFractionDigits:d||0,minimumFractionDigits:d||0});
const dFR=x=>x?new Date(x).toLocaleDateString('fr-FR'):'';const now=()=>new Date().toISOString();
const DEMO=new Set(['bain','saintlo']);const WON=['a_debuter','en_cours','termine'];const DONE=['soudee','controlee','manchonnee'];
const REQ='trace:mutu:req',CAL='trace:mutu:cal',CHIP='trace:mutu:chip:';
const lsGet=k=>{try{return JSON.parse(localStorage.getItem(k)||'null');}catch(e){return null;}};
const lsSet=(k,v)=>{try{if(v===null||v===undefined)localStorage.removeItem(k);else localStorage.setItem(k,JSON.stringify(v));}catch(e){}};
const norm=s=>String(s||'').normalize('NFD').replace(/[̀-ͯ]/g,'').toLowerCase().replace(/[^a-z0-9]+/g,' ').trim();
const LOG=[];const lg=(what,o)=>{try{LOG.push(Object.assign({t:Date.now(),what},o||{}));if(LOG.length>60)LOG.shift();}catch(e){}};
/* ── CSS du lot (injectée : index.html n'est pas touché) ── */
function css(){try{if(document.getElementById('css-lot-mu'))return;const s=document.createElement('style');s.id='css-lot-mu';s.textContent=`
.mu-chips{display:flex;gap:6px;align-items:center;margin:6px 0 2px;overflow-x:auto;max-width:100%;scrollbar-width:none;-webkit-overflow-scrolling:touch}.mu-chips::-webkit-scrollbar{display:none}
.mu-chips .mu-lab{flex:none;font-size:12px;color:#cfcbc3;white-space:nowrap}
.mu-chips button{flex:none;min-height:40px;min-width:48px;padding:6px 13px;border-radius:999px;border:1px solid rgba(255,255,255,.28);background:rgba(255,255,255,.08);color:#f4f2ec;font-size:13.5px;font-weight:600;display:inline-flex;align-items:center;gap:6px;cursor:pointer}
.mu-chips button.on{background:#fff;color:#15140f;border-color:#fff;box-shadow:0 0 0 2px rgba(255,255,255,.25)}
.mu-dot{display:inline-block;width:11px;height:11px;border-radius:50%;flex:none;box-shadow:0 0 0 1px rgba(255,255,255,.7)}
.legend .mu-leg i.bar{opacity:.55}
.mu-modal{max-width:560px}.mu-modal h3{margin:0 0 6px;font-size:17px}.mu-modal small{display:block;font-weight:400;color:var(--ink2,#52514e);font-size:12px;line-height:1.35;margin-top:2px}
.mu-opt{display:block;width:100%;text-align:left;min-height:52px;padding:10px 12px;border:1px solid var(--line,#e1e0d9);border-radius:12px;background:var(--surface,#fcfcfb);margin:8px 0;cursor:pointer;font-size:14px}
.mu-box{border:1px solid var(--line,#e1e0d9);border-radius:12px;padding:10px 12px;margin:8px 0;background:#faf8fe}
.mu-list{max-height:min(46vh,330px);overflow:auto;margin:8px 0}
.mu-list label{display:flex;gap:10px;align-items:center;min-height:52px;padding:6px 10px;border:1px solid var(--line,#e1e0d9);border-radius:10px;margin:6px 0;cursor:pointer;background:#fff}
.mu-list label b{overflow-wrap:anywhere}.mu-list input{width:22px;height:22px;flex:none;margin:0}
.mu-modal .btn{min-height:44px}.mu-modal .actions{display:flex;flex-wrap:wrap;gap:8px;justify-content:flex-end;margin-top:10px}.mu-modal .mu-go{width:100%;margin-top:4px}
.mu-sum{margin:6px 0 8px 18px;padding:0;font-size:13px;line-height:1.45}.mu-sum li{margin:2px 0}.mu-sum .w{color:#7a5200}
.mu-modal input.f{width:100%;min-height:44px}
.mu-row .ic{flex:none}.ac-row.mu-row .tx small b{display:inline;font-size:inherit;font-weight:700}.mu-tag{display:inline-block;font-size:11px;font-weight:700;border-radius:6px;padding:1px 6px;margin-right:4px;vertical-align:1px;background:#efe8fb;color:#4b2a86}
.mu-av{color:#15673a;font-weight:600}.mu-wait{color:#7a5200}
#muTsBanner{margin:0 0 8px;font-size:12.5px;line-height:1.4}
.mu-fact{margin:0 0 8px}
@media (max-width:420px){.mu-modal .actions .btn{flex:1 1 100%}}`;document.head.appendChild(s);}catch(e){}}
/* ═════════ 0 · branchement ═════════ */
export function initMutu(api){A=api;css();setTimeout(calPoll,300);initMv(api,{labelsOf:n=>labelsOf(n),affOfId:(n,id)=>affOfId(n,id),chipIdx:n=>chipIdx(n),chipAff:n=>chipAff(n)});} /* lot MV : mutu2.js reçoit l'appli et les aides du chantier partagé */
const metaOf=id=>((A&&A.state.serverMetas)||[]).find(x=>x.id===id)||null;
const siteOf=id=>(A&&A.SITES[id])||null;
const nameOf=id=>{const n=siteOf(id),m=metaOf(id);return (n&&n.name)||(m&&m.name)||id;};
const affOf=num=>{try{return regGet('affaire',num)||null;}catch(e){return null;}};
function etudeMark(id){const n=siteOf(id);const f=n&&n.fiche;if(f&&Object.prototype.hasOwnProperty.call(f,'etude'))return f.etude||null;const m=metaOf(id);return (m&&m.etude)||null;}
/* une étude « versée » dans un chantier (repère fiche.etude.verse) : toujours une étude (hors Chantiers), jamais rattachée à nouveau (liaison.js) */
export function mutuVerse(id){if(!A||!id)return null;const e=etudeMark(id);return e&&e.verse&&e.verse.site?e.verse:null;}
/* ouverture d'une étude versée (lien, notification…) : c'est le chantier qui s'ouvre */
export function mutuGuardOpen(id){const v=mutuVerse(id);if(!v)return false;A.toast('« '+nameOf(id)+' » est versée dans le chantier « '+nameOf(v.site)+' » : ouverture du chantier');setTimeout(()=>{try{A.openSite(v.site);}catch(e){console.warn(e);}},200);return true;}
/* libellés des affaires d'un chantier mutualisé (puces, légende) : l'année, sinon le n° */
function labelsOf(net){const H=(net.mutu&&net.mutu.hist)||[];const first=H.find(h=>h&&h.prev);return affLabels(net.affaires,net.affaires.map((n,i)=>{const a=affOf(n)||{};const h=H.find(x=>x&&x.aff===n);return {nom:a.nom,dateOuverture:a.dateOuverture||a.at,siteName:i===0?(first&&first.prev&&first.prev.name)||'':(h&&h.etudeNom)||''};}));}
const colOf=(net,n)=>MU_COLORS[Math.max(0,net.affaires.indexOf(n))%MU_COLORS.length];
/* affaire (n°) de chaque ligne du chantier : l.aff, sinon l'origine — table par copie du chantier */
const LA=new WeakMap();
function affMap(net){let c=LA.get(net);const L=(net&&net.lines)||[];if(c&&c.L===L&&c.n===L.length)return c.m;const m=new Map();const o=origOf(net);L.forEach(l=>{if(l&&l.id!=null)m.set(String(l.id),affOfLine(l)||o);});LA.set(net,{L,n:L.length,m});return m;}
const affOfId=(net,id)=>{const v=affMap(net).get(String(id));return v===undefined?origOf(net):v;};
/* ═════════ 1 · LES GARS : puce « Toutes · 2025 · 2026 » (plan, liste, récap, export) ═════════ */
const chip={site:'',i:-1};
function chipIdx(net){if(!isMutu(net))return -1;if(chip.site!==net.id){chip.site=net.id;const v=lsGet(CHIP+net.id);chip.i=Number.isInteger(v)&&v>=0&&v<net.affaires.length?v:-1;}if(chip.i>=net.affaires.length)chip.i=-1;return chip.i;}
const curNet=()=>{try{return A&&A.net?A.net():null;}catch(e){return null;}};
/* affaire filtrée par la puce : null = « Toutes » */
function chipAff(net){if(mvOperator())return null; /* lot MV : les opérateurs n'ont pas de puce (rien de filtré pour eux) */const i=chipIdx(net);return i<0?null:String(net.affaires[i]||'');}
/* lot MV (17/10) : l'EXPORT (DOE, carnet, plan) est toujours séparé — l'affaire choisie (sélecteur en tête de l'onglet, d'office celle de la puce, sinon l'origine) :
   « un DOE par marché », plus jamais « Toutes = tout » ; la puce ne filtre plus que le plan */
export function mutuLineIdIn(id){return mvLineIdIn('export',id);}
export function mutuLineIn(l){return !l||mutuLineIdIn(l.id);}
export function mutuPass(j){return true;} /* lot MV : la liste suit son dossier (commun / séparé) ; sur le plan, mutuAfterPlan estompe les soudures des autres affaires de la puce */
/* élément d'export (TS) : son affaire (aff, sinon celle de sa ligne) = l'affaire choisie */
export function mutuItemIn(it){if(!it)return true;return mvRecIn('export',it,[it.line]);}
export function mutuDoeSuffix(){return mvTag('export');}
/* document du dossier dans l'export : les pièces communes (PPSPS, DICT, plan de prévention…) toujours ; un PV / une pièce d'épreuve seulement avec SON affaire (sans affaire : l'origine) */
export function mutuDocIn(d){if(!d)return false;if(!d.hydro&&!d.aff)return true;return mvRecIn('export',d.aff?d:{aff:d.hydro&&d.hydro.aff},[]);}
/* marché pour l'export : celui de l'affaire choisie */
export function mutuMarcheChip(net){if(!net)return null;if(!isMutu(net))return net.marche||null;const c=mvSel(net);if(c===origOf(net))return net.marche||null;return (net.marchesAff&&net.marchesAff[c])||null;}
/* MARCHÉ / TS (onglet Modifs, écarts sur le plan) : l'affaire choisie dans Modifs (lot MV : sélecteur explicite, d'office la puce, sinon l'origine) — jamais d'écart d'une affaire sur l'autre */
function scopeOf(net){return mvSel(net);}
export function mutuScoped(){const net=curNet();return isMutu(net)&&scopeOf(net)!==origOf(net);}
export function mutuTsLine(l){const net=curNet();if(!isMutu(net)||!l)return true;return affOfId(net,l.id)===scopeOf(net);}
export function mutuMarcheOf(net){if(!net)return null;if(!isMutu(net))return net.marche||null;const s=scopeOf(net);if(s===origOf(net))return net.marche||null;return (net.marchesAff&&net.marchesAff[s])||null;}
export function mutuTsIn(it){const net=curNet();if(!isMutu(net)||!it)return true;const a=it.aff?String(it.aff):(it.line!=null?affOfId(net,it.line):origOf(net));return a===scopeOf(net);}
function setChip(i){const net=curNet();if(!net)return;chip.site=net.id;chip.i=+i;lsSet(CHIP+net.id,chip.i>=0?chip.i:null);mvResetSel(net);lg('puce',{site:net.id,i:chip.i});A.renderAll();}
/* barre de puces dans l'en-tête du chantier (appelée à la fin de renderSiteHead) + bandeau de l'onglet Modifs */
export function mutuHead(){try{const h=document.getElementById('siteHead');if(!h)return;let bar=document.getElementById('muChips');const net=curNet();const on=A.state.screen==='site'&&isMutu(net)&&!mvOperator(); /* lot MV : pas de puces d'affaire pour les opérateurs */
  if(!on){if(bar)bar.remove();tsBanner(null);return;}
  if(!bar){bar=document.createElement('div');bar.id='muChips';bar.className='mu-chips';bar.setAttribute('role','group');bar.setAttribute('aria-label','Filtrer par affaire');h.insertBefore(bar,document.getElementById('facets')||null);
    bar.addEventListener('click',e=>{const b=e.target.closest('[data-muchip]');if(b)setChip(b.dataset.muchip);});
    requestAnimationFrame(()=>{try{if(A.fit)A.fit();}catch(e){}});} /* l'en-tête vient de grandir : le plan est recadré (sinon le bas du réseau passe sous l'écran) */
  const i0=chipIdx(net);const labs=labelsOf(net);
  const html=`<span class="mu-lab" title="chantier partagé par plusieurs affaires : un seul plan, un seul accueil">🔗 affaires</span><button type="button" data-muchip="-1" class="${i0<0?'on':''}" aria-pressed="${i0<0}">Toutes</button>`+net.affaires.map((n,i)=>`<button type="button" data-muchip="${i}" class="${i0===i?'on':''}" aria-pressed="${i0===i}" title="${esc(n?'affaire '+n:'affaire d\'origine')}${i===0?' (origine du chantier)':''}"><i class="mu-dot" style="background:${MU_COLORS[i%MU_COLORS.length]}"></i>${esc(labs[i])}</button>`).join('');
  if(bar.innerHTML!==html)bar.innerHTML=html;tsBanner(null);}catch(e){console.warn(e);}} /* lot MV : le bandeau de Modifs devient le sélecteur d'affaire en tête de l'onglet (mutu2.js) */
function tsBanner(net){const v=document.getElementById('tsview');if(!v)return;let b=v.querySelector('#muTsBanner.warnbox');if(!net){if(b)b.remove();return;}
  const labs=labelsOf(net);const s=scopeOf(net);const i=net.affaires.indexOf(s);const M=mutuMarcheOf(net);const others=net.affaires.map((n,k)=>k).filter(k=>k!==i).map(k=>'« '+labs[k]+' »');
  const html=`🔗 Chantier partagé : modifications et marché de l'affaire <b>${esc(labs[i]||s)}</b>${s?' ('+esc(s)+')':''} seulement${M&&M.at?' — marché figé le '+dFR(M.at):''}. Puce ${esc(others.join(' / '))} en haut pour ${others.length>1?'les autres':'l\'autre'}.`;
  if(!b){b=document.createElement('div');b.id='muTsBanner';b.className='warnbox';v.insertBefore(b,v.firstChild);}if(b.innerHTML!==html)b.innerHTML=html;if(v.firstChild!==b)v.insertBefore(b,v.firstChild);}
/* après le dessin du plan : liseré discret par affaire rattachée, lignes des autres affaires estompées (puce), légende */
export function mutuAfterPlan(){try{const g=document.getElementById('net');if(!g)return;const old=g.querySelector('g.mu-halo');if(old)old.remove();const net=curNet();if(!isMutu(net)||A.state.screen!=='site'||mvOperator())return; /* lot MV : opérateurs — ni liseré, ni couleurs d'affaire dans la légende */
  const c=chipAff(net);const k=(A.state.view&&A.state.view.k)||1;const o=origOf(net);let h='';
  Object.values(A.state.lines||{}).forEach(l=>{if(!l||!l.cond)return;const a=affOfId(net,l.id);if(a===o||(c!==null&&a!==c))return;let pts=Array.isArray(l.pts)&&l.pts.length>1?l.pts:[];if(!pts.length)(l.els||[]).forEach(e=>{((e.axis&&e.axis[0])||[]).forEach(p=>pts.push(p));});
    pts=pts.map(p=>Array.isArray(p)?p:[p.x,p.y]).filter(p=>isFinite(p[0])&&isFinite(p[1]));if(pts.length<2)return;h+=`<path d="M${pts.map(p=>(+p[0]).toFixed(2)+' '+(+p[1]).toFixed(2)).join('L')}" stroke="${colOf(net,a)}" stroke-width="${(18/k).toFixed(4)}" fill="none" stroke-linecap="round" stroke-linejoin="round"/>`;});
  if(h)g.insertAdjacentHTML('afterbegin',`<g class="mu-halo" opacity=".22" style="pointer-events:none">${h}</g>`);
  if(c!==null)g.querySelectorAll('g.el[data-line],g.marker[data-line]').forEach(x=>{if(affOfId(net,x.getAttribute('data-line'))!==c){x.setAttribute('opacity','.16');x.style.pointerEvents='none';}});
  const leg=document.getElementById('legend');if(leg){const labs=labelsOf(net);leg.insertAdjacentHTML('beforeend',net.affaires.map((n,i)=>`<span class="mu-leg" title="${esc(n?'affaire '+n:'affaire d\'origine')}"><i class="bar" style="background:${MU_COLORS[i%MU_COLORS.length]}"></i>${esc(labs[i])}${i===0?' (sans liseré)':''}</span>`).join(''));}}catch(e){console.warn(e);}}
/* ═════════ 2 · LE COMMERCE : le tracé vu par l'affaire ouverte (quantités, soudures / ml par DN, phases) ═════════ */
function selFor(id){if(!A)return null;const n=A.SITES[id]||(A.siteStore[id]&&A.siteStore[id].NET);if(!isMutu(n))return null;let cur=null;try{cur=A.affCur&&A.affCur();}catch(e){cur=null;}if(!cur||!n.affaires.includes(cur))return null;return {n,cur,ids:lineIdsOf(n,cur===origOf(n)?'':cur)};}
const SEL=new Map();function selC(id){const s=selFor(id);if(!s){SEL.delete(id);return null;}const key=s.cur+'|'+((s.n.lines||[]).length);const c=SEL.get(id);if(c&&c.n===s.n&&c.key===key)return c.s;SEL.set(id,{n:s.n,key,s});return s;}
/* traceQty (app.js) : lignes, méta et zones du tracé réduites à l'affaire ouverte */
export function mutuQ(id,o){const s=selC(id);if(!s)return o;const keep=l=>!!(l&&s.ids.has(String(l.id)));const za=s.cur===origOf(s.n)?'':s.cur;
  return Object.assign({},o,{lines:(o.lines||[]).filter(keep),meta:Array.isArray(o.meta)?o.meta.filter(keep):o.meta,zones:Array.isArray(o.zones)?o.zones.filter(z=>z&&String(z.aff||'')===za):o.zones});}
/* traceAgg / tracePhases (app.js) : une ligne du tracé compte-t-elle pour l'affaire ouverte ? */
export function mutuKeep(id,l){const s=selC(id);return !s||!!(l&&s.ids.has(String(l.id)));}
/* ═════════ 3 · CHANTIERS EN COURS, ÉTUDES D'UNE AFFAIRE ═════════ */
function candidates(a){const ids=new Set([...Object.keys(A.SITES||{}),...((A.state.serverMetas||[]).map(m=>m.id))]);const out=[];const an=norm(a.client),av=norm(a.ville);
  ids.forEach(id=>{if(!id||id==='__vide'||(a.sites||[]).includes(id)||DEMO.has(id))return;try{if(A.isSandboxSite(id))return;}catch(e){}const n=siteOf(id),m=metaOf(id);if((m&&m.deleted)||(n&&(n.demo||n.deleted)))return;
    try{if(A.isHidden({id,traceur:(n&&n.traceur)||null}))return;}catch(e){}let et=false;try{et=!!A.etudeOf(id);}catch(e){}if(et||mutuVerse(id))return;
    const affs=regAll('affaire').filter(x=>x&&!x.deleted&&Array.isArray(x.sites)&&x.sites.includes(id));if(affs.length&&affs.every(x=>x.etat==='termine'||x.etat==='perdu'))return; /* chantiers EN COURS : pas un chantier dont toutes les affaires sont terminées */
    const ville=((n&&n.fiche)||{}).ville||(m&&m.ville)||'';const sameClient=!!an&&affs.some(x=>norm(x.client)===an);const sameVille=!!av&&(norm(ville)===av||affs.some(x=>norm(x.ville)===av));
    out.push({id,name:nameOf(id),ville,affs:affs.map(x=>x.num),sameClient,sameVille,score:(sameClient?2:0)+(sameVille?1:0)});});
  return out.sort((x,y)=>y.score-x.score||String(x.name).localeCompare(String(y.name),'fr'));}
/* tracés d'étude de l'affaire (dessinés depuis elle, dans le traceur) — pas un chantier réel rattaché à la main */
function etudesOf(a){return (a.sites||[]).filter(id=>{if(!id||DEMO.has(id))return false;const n=siteOf(id),m=metaOf(id);if(isMutu(n))return false;const tr=n&&n.traceur;const e=etudeMark(id);
  return !!((tr&&tr.ctx==='etude')||(e&&e.aff===a.num&&!e.delie))&&!(n&&Array.isArray(n.lines)&&!n.lines.length)&&!(m&&m.deleted);});}
/* copie complète d'un tracé : appareil, sinon serveur (fresh : le serveur d'abord quand on est connecté — on va réécrire le chantier) */
async function fullSite(id,fresh){if(!id)return null;const ok=n=>n&&Array.isArray(n.lines)&&!n.deleted?n:null;
  if(fresh&&A.state.cloudUser){let x=null;try{x=await Promise.race([A.sync.loadSite(id),new Promise(r=>setTimeout(()=>r('late'),15000))]);}catch(e){x=null;}if(x==='late')return {late:true};if(ok(x))return x;}
  const n=siteOf(id);if(ok(n)&&!(n.bgTooBig&&A.state.cloudUser))return n;let x=null;try{x=await A.kv.get('trace:handoff:'+id);}catch(e){}if(ok(x)&&!x.bgTooBig)return x;
  if(A.state.cloudUser){try{x=await Promise.race([A.sync.loadSite(id),new Promise(r=>setTimeout(()=>r(null),15000))]);}catch(e){x=null;}if(ok(x))return x;}
  try{x=JSON.parse(localStorage.getItem('trace:handoff:'+id)||'null');}catch(e){x=null;}return ok(x)||ok(n);}
/* soudures enregistrées : serveur (connecté), sinon la session de l'appareil */
async function srvRows(id){if(!A.state.cloudUser)return [];try{return (await A.sync.loadWelds(id))||[];}catch(e){return [];}}
function sessJoints(id){const st=A.siteStore[id];const L=(st&&st.lines)||(A.state.siteId===id?A.state.lines:null);const out=[];if(L)Object.values(L).forEach(l=>{['A','R'].forEach(c=>{const cd=l&&l.cond&&l.cond[c];((cd&&cd.joints)||[]).forEach(j=>out.push(j));});});const n=A.SITES[id];if(n&&n.sbWelds)Object.values(n.sbWelds).forEach(r=>out.push({weldId:r.weld_id,status:r.status,events:(r.data||{}).events,photos:(r.data||{}).photos}));return out;}
const maxWeld=rows=>(rows||[]).reduce((m,r)=>Math.max(m,parseInt(String((r&&(r.weld_id||r.weldId))||'').replace(/\D/g,''),10)||0),0);
/* affaire d'origine d'un chantier : site.affaires[0], sinon l'affaire (gagnée de préférence) qui le lie */
function origNum(C,aff){if(isMutu(C))return origOf(C);if(Array.isArray(C.affaires)&&C.affaires.length)return String(C.affaires[0]||'');const L=regAll('affaire').filter(x=>x&&!x.deleted&&x.num!==aff&&Array.isArray(x.sites)&&x.sites.includes(C.id));const w=L.find(x=>WON.includes(x.etat))||L[0];return w?w.num:'';}
const canWrite=ctx=>{if(!ctx||!ctx.canEdit){A.toast('Réservé au droit « affaires » (comme gagner une affaire)');return false;}let st=null;try{st=A.affState&&A.affState();}catch(e){}if(st&&st.vview){A.toast('Version consultée : rien ne s\'écrit (reviens à la version en cours)');return false;}return true;};
const online=()=>!(A.state.cloudUser&&typeof navigator!=='undefined'&&navigator.onLine===false);
/* ═════════ 4 · AU GAIN (7 · Offre → 🏆 Gagnée) : « Nouveau chantier » ou « ➕ Ajouter au chantier en cours » ═════════ */
let goNew=false;
/* commerce.js, case 'ogagne' : true = la fenêtre du choix a pris la main ; again() rejoue le chemin d'avant (« Nouveau chantier », sans 2e confirmation) */
export function mutuGainAsk(a,ctx,again){if(goNew||!A||!a||!ctx||!ctx.canEdit)return false;let E=[],C=[];try{E=etudesOf(a);C=E.length?candidates(a):[];}catch(e){console.warn(e);return false;}if(!E.length||!C.length)return false;
  choiceModal(a,ctx,{gain:true,E,C,again});return true;}
export function mutuGainGo(){return goNew;}
function choiceModal(a,ctx,o){const E=o.E||etudesOf(a),C=o.C||candidates(a);if(!E.length){A.toast('Pas d\'étude tracée dans cette affaire : rien à rattacher');return;}if(!C.length){A.toast('Aucun chantier en cours où ajouter ce tracé');return;}
  const et=E.length>1?`<label class="f" for="muEt">Étude à rattacher</label><select class="f" id="muEt" style="width:100%;min-height:44px">${E.map(id=>`<option value="${esc(id)}">${esc(nameOf(id))}</option>`).join('')}</select>`:`<div class="eq-s">Étude : <b>${esc(nameOf(E[0]))}</b></div>`;
  A.openModal(`<div class="mu-modal" id="muChoice"><h3>${o.gain?'🏆 Affaire gagnée — son tracé ?':'➕ Ajouter au chantier en cours'}</h3>${o.gain?`<div class="eq-s">L'affaire <b>${esc(a.num)}</b> passe « à débuter » (dossier en cours).</div>`:''}${et}
    ${o.gain?`<button class="mu-opt" type="button" id="muNew"><b>📍 Nouveau chantier</b><small>comme aujourd'hui : le tracé de l'étude devient un chantier à part dans Chantiers</small></button>`:''}
    <div class="mu-box">${o.gain?'<b>➕ Ajouter au chantier en cours</b>':''}<small>un seul chantier pour les gars (même plan, même accueil, mêmes photos de soudures) ; chaque ligne garde son affaire : quantités, avancement, situations, DOE, marché et TS séparés</small>
      <div class="mu-list" role="radiogroup" aria-label="Chantiers en cours">${C.map((c,i)=>`<label><input type="radio" name="muSite" value="${esc(c.id)}" ${i===0?'checked':''}><span><b>${esc(c.name)}</b><small>${[c.ville,c.affs.length?'affaire '+c.affs.join(', '):'',c.sameClient?'même client':'',c.sameVille?'même ville':''].filter(Boolean).map(esc).join(' · ')||'chantier en cours'}</small></span></label>`).join('')}</div>
      <button class="btn primary mu-go" type="button" id="muAdd">➕ Ajouter au chantier choisi</button></div>
    <div class="actions"><button class="btn" type="button" data-close>Annuler</button></div></div>`);
  const nw=document.getElementById('muNew');if(nw)nw.onclick=()=>{A.closeModal();lg('nouveau chantier',{aff:a.num});goNew=true;try{o.again&&o.again();}finally{goNew=false;}};
  const ad=document.getElementById('muAdd');if(ad)ad.onclick=()=>{const r=document.querySelector('#muChoice input[name=muSite]:checked');const s=document.getElementById('muEt');const eId=s?s.value:E[0];if(!r){A.toast('Choisis le chantier');return;}A.closeModal();startAttach(a.num,eId,r.value,{gain:!!o.gain,ctx});};}
/* ═════════ 5 · RATTACHER : calage (géoréférencement, sinon traceur), confirmation, écriture ═════════ */
async function startAttach(num,eId,cId,o){const a=affOf(num);if(!a)return;if(!online()){A.toast('Rattachement : il faut la connexion (le chantier est réécrit sur le serveur)');return;}A.toast('Préparation du rattachement…');
  const Ef=await fullSite(eId),Cf=await fullSite(cId);if(!Ef||!Ef.lines||!Ef.lines.length){A.toast('Étude « '+nameOf(eId)+' » introuvable ou vide sur cet appareil'+(A.state.cloudUser?'':' (connecte-toi)'));return;}
  if(!Cf||!Cf.lines){A.toast('Chantier « '+nameOf(cId)+' » introuvable sur cet appareil'+(A.state.cloudUser?' et sur le serveur':' (connecte-toi)'));return;}
  const g=tfFromGeo(Ef,Cf);lg('calage',{aff:num,geo:!!g,ok:!!(g&&g.ok)});
  if(g&&g.ok)return confirmModal(num,{eId,cId,T:g.T,k:g.k,how:'donnée par '+g.how,gain:!!o.gain},Ef,Cf,o.ctx);
  calageModal(num,{eId,cId,gain:!!o.gain,why:g?'les deux géoréférencements ne concordent pas (échelle ×'+nb(g.k,3)+')':'les deux tracés ne sont pas tous les deux géoréférencés'},o.ctx);}
function calageModal(num,R,ctx){A.openModal(`<div class="mu-modal"><h3>🎯 Caler l'étude sur le chantier</h3><div class="eq-s">Pas de conversion directe : ${esc(R.why)}. Dans le traceur, le chantier « <b>${esc(nameOf(R.cId))}</b> » s'ouvre avec l'étude « <b>${esc(nameOf(R.eId))}</b> » posée par-dessus (en violet) : <b>✥ glisse-la</b> (ou <b>📍 1 point</b> : un point de l'étude puis le même endroit sur le chantier), ou <b>⟲ 2 points</b> (① ② sur l'étude, ③ ④ les mêmes endroits sur le chantier), puis <b>✓ Valider le calage</b> : tu reviens ici pour confirmer.</div>
  <div class="actions"><button class="btn" type="button" data-close>Annuler</button><button class="btn primary" type="button" id="muGoCal">🎯 Caler dans le traceur</button></div></div>`);
  const b=document.getElementById('muGoCal');if(b)b.onclick=()=>goCalage(num,R);}
function goCalage(num,R,T0){lsSet(REQ,{aff:num,site:R.cId,etude:R.eId,gain:!!R.gain,at:now(),T0:T0||null});lsSet(CAL,null);lg('traceur',{aff:num});A.closeModal();A.toast('Ouverture du traceur (calage de l\'étude)…');
  setTimeout(()=>{location.href='./traceur.html?site='+encodeURIComponent(R.cId)+'&mutu='+encodeURIComponent(R.eId)+'&maff='+encodeURIComponent(num)+'&v='+Date.now().toString(36);},250);}
/* retour du traceur (calage validé) : la confirmation s'ouvre quand l'affaire est affichée */
let calT=null,calSeen='';
function calPoll(){clearInterval(calT);const c0=lsGet(CAL);if(!c0)return;const t0=Date.now();calT=setInterval(()=>{const c=lsGet(CAL);if(!c||Date.now()-t0>600000){clearInterval(calT);return;}if(Date.now()-Date.parse(c.at||0)>3600e3){lsSet(CAL,null);clearInterval(calT);return;}
  let cur=null;try{cur=A.affCur&&A.affCur();}catch(e){}if(A.state.screen!=='home'||A.state.homeTab!=='commerce'||cur!==c.aff||document.querySelector('#modal.show')||calSeen===c.at)return;
  calSeen=c.at;lsSet(CAL,null);clearInterval(calT);mutuCalReturn(c);},400);}
async function mutuCalReturn(c){const a=affOf(c.aff);if(!a)return;let ctx=null;try{ctx=A.affCtx&&A.affCtx();}catch(e){}const Ef=await fullSite(c.etude),Cf=await fullSite(c.site);if(!Ef||!Cf){A.toast('Rattachement : étude ou chantier introuvable sur cet appareil');return;}
  confirmModal(c.aff,{eId:c.etude,cId:c.site,T:c.T,k:c.k,how:'calée dans le traceur',gain:!!c.gain},Ef,Cf,ctx);}
function confirmModal(num,R,Ef,Cf,ctx){const a=affOf(num);if(!a)return;let info=null;const orig=origNum(Cf,num);try{info=mergeSites(Cf,Ef,R.T,{aff:num,orig,by:'',nom:(Cf.mutu&&Cf.mutu.nom)||commonName(Cf.name)}).info;}catch(e){A.toast('Rattachement impossible : '+e.message);return;}
  const nom0=(Cf.mutu&&Cf.mutu.nom)||commonName(Cf.name);const sameCat=(Ef.supplier||'')===(Cf.supplier||'')&&String(Ef.serie||'')===String(Cf.serie||'');const pl=(Ef.supplier||Cf.supplier)?'':'';
  const li=[];li.push(`chaque ligne garde son affaire — ${esc(num)} pour ces lignes, ${esc(orig||'l\'origine')} pour celles du chantier : quantités, avancement, situations, DOE, marché et TS séparés`);li.push('les gars : un seul chantier au nom commun, même plan, même accueil (PPSPS, DICT, plan de prévention…) — ils voient tout le réseau et pointent ; dossiers communs ou séparés par affaire : réglage ci-dessous');
  info.prolong.forEach(p=>li.push(`↪ « ${esc(p.name)} » prolonge « ${esc(p.withName)} » : ${p.at==='start'?'départ':'fin'} « sur attente existante »${p.d>0.05?' (écart '+nb(p.d,2)+' m)':''}`));
  if(info.plans)li.push(`${info.plans} plan(s) de fond de l'étude ajouté(s) au chantier`);if(info.zones)li.push(`${info.zones} zone(s) de chiffrage de l'étude reprises`);
  info.warnings.forEach(w=>li.push(`<span class="w">⚠ ${esc(w)}</span>`));if(!sameCat)li.push(`<span class="w">⚠ catalogue de l'étude (${esc((Ef.supplier||'?')+' s'+(Ef.serie||'?'))}) ≠ celui du chantier (${esc((Cf.supplier||'?')+' s'+(Cf.serie||'?'))}) : le traceur recalculera les lignes rattachées avec celui du chantier à la prochaine modification</span>`);
  A.openModal(`<div class="mu-modal" id="muConf"><h3>🔗 Rattacher l'étude au chantier</h3><div class="eq-s">${info.lines>1?'Les <b>'+info.lines+' lignes</b>':'La <b>ligne</b>'} (${info.welds} soudures) de l'étude « ${esc(Ef.name||R.eId)} » ${info.lines>1?'rejoignent':'rejoint'} le chantier « <b>${esc(Cf.name||R.cId)}</b> » — position ${esc(R.how||'calée dans le traceur')}${R.k&&Math.abs(R.k-1)>0.0005?' (échelle ×'+nb(R.k,4)+' ramenée à 1 : l\'étude garde ses longueurs)':''}.</div>
    <ul class="mu-sum">${li.map(x=>'<li>'+x+'</li>').join('')}</ul>
    ${mvFoldHTML(Cf)}<label class="f" for="muNom">Nom affiché aux gars</label><input class="f" id="muNom" value="${esc(nom0)}" maxlength="80" autocomplete="off">
    <div class="actions"><button class="btn" type="button" data-close>Annuler</button><button class="btn" type="button" id="muCal" title="vérifier ou corriger la position de l'étude dans le traceur">🎯 Ajuster dans le traceur</button><button class="btn primary" type="button" id="muGo">${R.gain?'🏆 Gagnée + rattacher':'🔗 Rattacher'}</button></div></div>`);
  const c=document.getElementById('muCal');if(c)c.onclick=()=>goCalage(num,R,R.T);mvWireRows(document.getElementById('mvFold')); /* lot MV : pli « Commun / séparé par dossier » */
  const g=document.getElementById('muGo');if(g)g.onclick=async()=>{if(!canWrite(ctx))return;const nom=((document.getElementById('muNom')||{}).value||'').trim()||nom0;const part=mvFoldRead();g.disabled=true;g.textContent='⏳ Rattachement…';const r=await commitAttach(num,Object.assign({},R,{partage:part}),nom);A.closeModal();if(r.ok)afterCommit(num,r);else A.toast('Rattachement non fait : '+r.why);};}
let busy=false;
async function commitAttach(num,R,nom){if(busy)return {ok:false,why:'un rattachement est déjà en cours'};busy=true;try{const a=affOf(num);if(!a)return {ok:false,why:'affaire introuvable'};if(!online())return {ok:false,why:'pas de connexion'};
  const Cf=await fullSite(R.cId,true);if(Cf&&Cf.late)return {ok:false,why:'serveur trop lent — réessaie dans un instant'};if(!Cf||!Cf.lines)return {ok:false,why:'chantier introuvable'};if(isMutu(Cf)&&Cf.affaires.includes(num))return {ok:false,why:'cette affaire est déjà rattachée à ce chantier'};
  const Ef=await fullSite(R.eId,true);if(!Ef||Ef.late||!Ef.lines||!Ef.lines.length)return {ok:false,why:'étude introuvable'};
  const eRows=await srvRows(R.eId);const eAct=activityOn({lines:Ef.lines,extraWelds:Ef.extraWelds},'',{rows:eRows,joints:sessJoints(R.eId)});if(eAct.n)return {ok:false,why:'le tracé de l\'étude a déjà de l\'activité ('+eAct.items.join(', ')+') : « Détacher / fusionner » viendra plus tard'};
  const rows=await srvRows(R.cId);const by=(A.userName&&A.userName())||'';const at=now();
  const {site,info}=mergeSites(Cf,Ef,R.T,{aff:num,orig:origNum(Cf,num),by,at,nom,k:R.k,how:R.how,weldMax:Math.max(maxWeld(rows),maxWeld(sessJoints(R.cId)))});
  if(R.partage&&typeof R.partage==='object'){const pc=partageClean(R.partage);site.mutu=Object.assign({},site.mutu);if(pc)site.mutu.partage=pc;else delete site.mutu.partage;} /* lot MV : réglage commun / séparé choisi dans la confirmation (seulement ce qui s'écarte du défaut) */
  const w=await writeSite(site);if(!w.ok)return {ok:false,why:w.why};
  const e=Object.assign({},etudeMark(R.eId)||{},{aff:num,verse:{site:R.cId,aff:num,at,by}});try{await A.saveSiteFicheX(R.eId,{etude:e},true);}catch(err){console.warn(err);}
  const a2=affOf(num)||a;const sites=(a2.sites||[]).filter(x=>x!==R.eId);if(!sites.includes(R.cId))sites.push(R.cId);const p={sites,mutu:{site:R.cId,etude:R.eId,etudeNom:Ef.name||'',at,by,lignes:info.lines}};
  if(R.gain){p.offre=Object.assign({},a2.offre||{},{gagneAt:at});p.etat='a_debuter';}A.affSet(num,p);if(R.gain){try{const st=A.affState();if(st)st.seg='cours';}catch(err){}}
  lg('rattaché',{aff:num,site:R.cId,lines:info.lines});return {ok:true,info,site};}
  catch(e){console.warn(e);return {ok:false,why:(e&&e.message)||String(e)};}finally{busy=false;}}
/* écriture du chantier, comme un enregistrement du traceur : la version du serveur relue juste avant (conversation, stock, QSE, pointage… faits ailleurs entre-temps : gardés),
   plan entier au serveur (sync.saveSite), PUIS la copie de l'appareil (trace:handoff, celle que rouvre le traceur) — un refus du serveur ne laisse rien de changé */
async function writeSite(net){const id=net.id;let clean=Object.assign({},net);['handoff','sent','sentAt','_lines'].forEach(k=>delete clean[k]);
  if(A.state.cloudUser){let srv=null;try{srv=await Promise.race([A.sync.loadSite(id),new Promise(r=>setTimeout(()=>r(null),8000))]);}catch(e){srv=null;}if(srv&&Array.isArray(srv.lines)&&!srv.deleted)clean=mergeServerParts(clean,srv);
    let r=false;try{r=await A.sync.saveSite(clean);}catch(e){r=false;}if(!r)return {ok:false,why:'le serveur a refusé l\'enregistrement du chantier'+(A.sync.lastError?' ('+String(A.sync.lastError).slice(0,90)+')':'')};A.state.ownSiteWrite=Date.now();if(typeof r==='string')clean.updated_at=r;}
  A.SITES[id]=clean;delete A.siteStore[id];try{await A.kv.set('trace:handoff:'+id,Object.assign({},clean,A.state.cloudUser?{sent:true,sentAt:Date.now()}:{}));}catch(e){}
  try{localStorage.removeItem('trace:handoff:'+id);}catch(e){} /* double léger d'un ancien enregistrement du traceur : périmé */
  const m=metaOf(id);if(m){m.name=clean.name;if(clean.updated_at)m.updated_at=clean.updated_at;}try{A.addSiteOption(clean);}catch(e){}return {ok:true};}
function afterCommit(num,r){const i=r.info;A.toast('🔗 '+i.lines+' ligne'+(i.lines>1?'s':'')+' de l\'affaire '+num+' ajoutée'+(i.lines>1?'s':'')+' au chantier « '+r.site.name+' »'+(i.prolong.length?' — '+i.prolong.length+' prolongement'+(i.prolong.length>1?'s':''):''));try{A.renderHome();}catch(e){}}
/* ═════════ 6 · ANNULER LE RATTACHEMENT (avant toute soudure / pointage sur ses lignes) ═════════ */
async function undoFlow(num,cId,ctx){if(!canWrite(ctx))return;if(!online()){A.toast('Annuler le rattachement : il faut la connexion');return;}const Cf=await fullSite(cId,true);if(!Cf||Cf.late||!Cf.lines){A.toast('Chantier introuvable'+(Cf&&Cf.late?' (serveur trop lent)':''));return;}
  if(!isMutu(Cf)||!Cf.affaires.includes(num)){A.toast('Cette affaire n\'est pas rattachée à ce chantier');return;}if(origOf(Cf)===num){A.toast('Cette affaire est l\'origine du chantier : rien à annuler');return;}
  const labs=labelsOf(Cf);const lab=labs[Cf.affaires.indexOf(num)]||num;const act=activityOn(Cf,num,{rows:await srvRows(cId),joints:sessJoints(cId)});lg('annuler ?',{aff:num,act:act.n});
  if(act.n){A.openModal(`<div class="mu-modal" id="muUndoKo"><h3>↩ Annuler le rattachement : plus possible</h3><div class="eq-s">Déjà enregistré sur les lignes <b>${esc(lab)}</b> du chantier « ${esc(Cf.name)} » :</div><ul class="mu-sum">${act.items.map(x=>'<li>'+esc(x)+'</li>').join('')}</ul>
    <div class="eq-s">Annuler effacerait ce travail du plan. L'étape suivante sera « <b>Détacher ${esc(lab)}</b> » : séparer les lignes ${esc(lab)} dans un chantier à elles AVEC leurs soudures, photos et contrôles (pas encore disponible — à demander).</div><div class="actions"><button class="btn primary" type="button" data-close>Compris</button></div></div>`);return;}
  const H=(Cf.mutu&&Cf.mutu.hist)||[];const ent=[...H].reverse().find(h=>h&&h.aff===num&&!h.undoneAt)||null;const nL=lineIdsOf(Cf,num).size;
  A.openModal(`<div class="mu-modal" id="muUndo"><h3>↩ Annuler le rattachement ?</h3><div class="eq-s">Le chantier « <b>${esc(Cf.name)}</b> » reprend son état d'avant : sans ${nL>1?'les '+nL+' lignes':'la ligne'} de l'affaire <b>${esc(num)}</b> (ni leurs plans de fond, zones et marché). L'affaire ${esc(num)} repart sur son étude${ent&&ent.etudeNom?' « '+esc(ent.etudeNom)+' »':''}${WON.includes((affOf(num)||{}).etat)?' — comme « Nouveau chantier » : un chantier à part dans Chantiers (tu pourras la rattacher à nouveau)':''}.</div>
    <div class="actions"><button class="btn" type="button" data-close>Garder</button><button class="btn primary" type="button" id="muUndoGo" style="background:#9b2c22;border-color:#9b2c22">↩ Annuler le rattachement</button></div></div>`);
  const b=document.getElementById('muUndoGo');if(b)b.onclick=async()=>{b.disabled=true;b.textContent='⏳ …';const r=await commitUndo(num,cId,ent);A.closeModal();if(r.ok){A.toast('↩ Rattachement annulé : « '+r.name+' » sans les lignes de '+num+(r.etude?' ; l\'affaire repart sur « '+nameOf(r.etude)+' »':''));try{A.renderHome();}catch(e){}}else A.toast('Annulation non faite : '+r.why);};}
async function commitUndo(num,cId,ent){if(busy)return {ok:false,why:'opération déjà en cours'};busy=true;try{const Cf=await fullSite(cId,true);if(!Cf||Cf.late||!Cf.lines)return {ok:false,why:'chantier introuvable'};
  const act=activityOn(Cf,num,{rows:await srvRows(cId),joints:sessJoints(cId)});if(act.n)return {ok:false,why:'soudures ou pointages enregistrés entre-temps — « Détacher » (étape suivante)'};
  const by=(A.userName&&A.userName())||'';const at=now();const {site}=unmergeSite(Cf,num,{by,at});const w=await writeSite(site);if(!w.ok)return {ok:false,why:w.why};
  const a=affOf(num);const E=(ent&&ent.etude)||(a&&a.mutu&&a.mutu.etude)||null;
  if(E){const e=Object.assign({},etudeMark(E)||{},{aff:num});delete e.verse;const won=a&&WON.includes(a.etat);if(won){e.gagne=true;e.at=at;}try{await A.saveSiteFicheX(E,{etude:e},true);}catch(err){console.warn(err);}
    if(won){try{const Ef=await fullSite(E);if(Ef&&!Ef.marche&&Array.isArray(Ef.lines)&&Ef.lines.length){const snap=marcheSnapshot(Ef.lines,{source:'traceur',by:by||'appli',gain:num});Ef.marche=snap; /* comme au gain (« Nouveau chantier ») : le tracé marché de l'étude figé */
      try{const x=await A.kv.get('trace:handoff:'+E);if(x){x.marche=snap;await A.kv.set('trace:handoff:'+E,x);}}catch(err){}if(A.state.cloudUser&&A.canWritePart('marche')){const {demo,handoff,sent,sentAt,...clean}=Ef;try{await A.saveSiteNet(clean,'marche');}catch(err){console.warn(err);}}}}catch(err){console.warn(err);}}}
  if(a){const sites=(a.sites||[]).filter(x=>x!==cId);if(E&&!sites.includes(E))sites.push(E);A.affSet(num,{sites,mutu:null});}
  lg('annulé',{aff:num,site:cId});return {ok:true,name:site.name,etude:E};}catch(e){console.warn(e);return {ok:false,why:(e&&e.message)||String(e)};}finally{busy=false;}}
/* ═════════ 7 · ONGLET « TRACÉ & CHANTIERS » DE L'AFFAIRE ═════════ */
const AV={};
/* avancement des lignes d'une affaire : soudures faites / soudures — serveur (connecté, relu au plus toutes les minutes), sinon la session de l'appareil */
function avOf(id,aff){const n=siteOf(id);if(!n||!Array.isArray(n.lines))return null;const ids=lineIdsOf(n,aff===origOf(n)?'':aff);const W=new Set();n.lines.forEach(L=>{if(!L||!ids.has(String(L.id)))return;['A','R'].forEach(c=>{const cd=L.cond&&L.cond[c];((cd&&(cd.welds||cd.joints))||[]).forEach(w=>{if(w&&w.weldId)W.add(w.weldId);});});});if(!W.size)return null;
  let rows=null;if(A.state.cloudUser){const c=AV[id];if(!c||Date.now()-c.at>60000){AV[id]={at:Date.now(),rows:c?c.rows:null};A.sync.loadWelds(id).then(r=>{AV[id]={at:Date.now(),rows:r||[]};try{A.softRender('avancement');}catch(e){}}).catch(()=>{});}rows=AV[id]&&AV[id].rows;}
  const st=new Map();(rows||[]).forEach(r=>{if(r&&W.has(r.weld_id))st.set(r.weld_id,r.status);});sessJoints(id).forEach(j=>{if(j&&W.has(j.weldId)&&j.status&&j.status!=='a_souder')st.set(j.weldId,j.status);});
  let done=0;st.forEach(v=>{if(DONE.includes(v))done++;});return {tot:W.size,done,pct:Math.round(100*done/W.size),wait:A.state.cloudUser&&!rows};}
/* liaison.js (lzRowsHTML) : la ligne d'un chantier partagé — null = ligne habituelle */
export function mutuRowHTML(a,s,canEdit,ctx){try{if(!A||!a||!s)return null;const n=siteOf(s.id);if(!isMutu(n)||!n.affaires.includes(a.num))return null;const id=s.id;const labs=labelsOf(n);const i=n.affaires.indexOf(a.num);
  const others=n.affaires.map((x,k)=>k).filter(k=>k!==i).map(k=>`<b>${esc(labs[k])}</b>${n.affaires[k]&&labs[k]!==n.affaires[k]?' ('+esc(n.affaires[k])+')':''}`).join(', ');
  let q=null;try{q=ctx&&ctx.traceQty?ctx.traceQty(id):null;}catch(e){q=null;}const qty=q&&q.loading?'<span class="lz-load">⏳ chargement du tracé…</span>':q&&q.rows&&q.rows.length&&q.tot?`<span class="lz-q"><b>${nb(q.tot.soud)}</b> soudures · <b>${nb(q.tot.mlTr,1)}</b> ml de tranchée</span>`:'rien de tracé pour cette affaire';
  const av=avOf(id,a.num);const avT=av?(av.wait?' · <span class="mu-wait">avancement : chargement…</span>':` · <span class="mu-av" title="soudures faites (soudées, contrôlées ou manchonnées) sur les lignes de cette affaire">avancement ${av.done}/${av.tot} (${av.pct} %)</span>`):'';
  const mine=i===0?'origine du chantier':'lignes rattachées le '+dFR(((n.mutu&&n.mutu.hist)||[]).filter(h=>h&&h.aff===a.num&&!h.undoneAt).map(h=>h.at).pop());
  const undo=canEdit&&i>0?`<button class="btn sm" data-act="af" data-v="muundo|${esc(id)}" style="color:#9b2c22" title="tant qu'aucune soudure / aucun pointage n'est enregistré sur les lignes de cette affaire">↩ Annuler le rattachement</button>`:'';
  const part=`<button class="btn sm" data-act="af" data-v="mupart|${esc(id)}" title="Commun ou séparé par affaire, dossier par dossier (Modifs et DOE : toujours séparés)">⚙ Commun / séparé par dossier</button>`; /* lot MV */
  return `<div class="ac-row lz-row mu-row" data-lzsite="${esc(id)}" data-mu="1" style="min-height:52px;margin-bottom:6px"><span class="ic" style="background:#efe8fb">🔗</span><span class="tx"><b>${esc(n.name||id)}</b><small><span class="mu-tag">chantier partagé</span>avec ${others} · ${esc(mine)} · ${qty}${avT}</small></span><span class="eq-acts"><button class="btn sm" data-act="opensite" data-v="${esc(id)}" title="Ouvrir le chantier (écran Tracé)">Ouvrir</button>${part}${undo}</span></div>`;}catch(e){console.warn(e);return null;}}
/* affaires.js (onglet sites) : étude versée, « ➕ Ajouter au chantier en cours » (affaire gagnée), retour d'un calage */
export function mutuTabHTML(a,canEdit,ctx,consult){try{if(!A||!a)return '';let h='';const M=a.mutu;
  if(M&&M.site){h+=`<div class="ac-row lz-row mu-row" data-mu="etude" style="min-height:52px;margin-bottom:6px"><span class="ic" style="background:#e8f0fb">📐</span><span class="tx"><b>${esc(M.etudeNom||nameOf(M.etude))}</b><small><span class="lz-tag et">étude versée</span>dans le chantier « ${esc(nameOf(M.site))} » le ${dFR(M.at)}${M.by?' par '+esc(M.by):''} — lecture seule : ses ${M.lignes||''} ligne${M.lignes>1?'s':''} vivent maintenant dans le chantier (plan, soudures, quantités de cette affaire)</small></span></div>`;}
  else if(canEdit&&!consult&&WON.includes(a.etat)){let E=[],C=[];try{E=etudesOf(a);C=E.length?candidates(a):[];}catch(e){}if(E.length&&C.length)h+=`<div class="eq-acts" style="margin-top:8px"><button class="btn" data-act="af" data-v="muadd|" style="min-height:44px" title="les lignes de l'étude rejoignent un chantier en cours (un seul chantier pour les gars)">➕ Ajouter au chantier en cours…</button></div><div class="hint" style="margin-top:4px">🔗 Un tracé qui prolonge un chantier en cours peut le rejoindre : un seul chantier pour les gars (même plan, même accueil), chaque ligne garde son affaire.</div>`;}
  const c=lsGet(CAL);if(c&&c.aff===a.num)setTimeout(calPoll,50);return h;}catch(e){console.warn(e);return '';}}
/* affaires.js (onglet Facturation) : avancement de CETTE affaire sur un chantier partagé */
export function mutuFactHTML(a){try{if(!A||!a)return '';const L=(a.sites||[]).map(id=>siteOf(id)).filter(n=>isMutu(n)&&n.affaires.includes(a.num));if(!L.length)return '';
  return L.map(n=>{const av=avOf(n.id,a.num);const others=n.affaires.filter(x=>x!==a.num);return `<div class="okbox mu-fact">🔗 Chantier partagé « ${esc(n.name)} » (avec ${esc(others.join(', ')||'l\'origine')}) : l'avancement de l'affaire ${esc(a.num)} ne compte que SES lignes${av&&!av.wait?' — '+av.done+'/'+av.tot+' soudures faites ('+av.pct+' %)':''} ; ses situations se font ici, à part.</div>`;}).join('');}catch(e){return '';}}
/* affaires.js, affAct : actions « mu… » */
export function mutuAct(k,arg,arg2,a,ctx){if(!/^mu/.test(k))return false;if(!a)return true;
  if(k==='muadd'){if(!canWrite(ctx))return true;choiceModal(a,ctx,{gain:false});return true;}
  if(k==='muundo'){undoFlow(a.num,arg,ctx).catch(e=>console.warn(e));return true;}
  if(k==='mupart'){let st=null;try{st=A.affState&&A.affState();}catch(e){}mvOpenPartage(arg,{consult:!!(st&&st.vview)});return true;} /* lot MV : ⚙ Commun / séparé par dossier (version consultée : lecture seule) */
  return false;}
/* ═════════ 8 · TESTS ═════════ */
export function mutuTestApi(){return {log:()=>LOG.slice(),cands:num=>{const a=affOf(num);return a?candidates(a):[];},etudes:num=>{const a=affOf(num);return a?etudesOf(a):[];},chip:()=>({site:chip.site,i:chip.i}),setChip:i=>setChip(i),
  verse:id=>mutuVerse(id),av:(id,num)=>avOf(id,num),scope:()=>{const n=curNet();return isMutu(n)?scopeOf(n):null;},attach:(num,eId,cId,o)=>startAttach(num,eId,cId,o||{}),commit:(num,R,nom)=>commitAttach(num,R,nom),undo:(num,cId)=>commitUndo(num,cId,null),mv:mvTestApi()};}
