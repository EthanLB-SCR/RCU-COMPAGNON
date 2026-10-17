// mutu2.js — LOT MV (17/10) : CHANTIER PARTAGÉ, SUITE — commun ou séparé dossier par dossier, simple pour les gars. En-tête = le modèle.
// Ethan (17/10, après le lot MU) : « une fois les affaires fusionnées, elles doivent l'être sur le plan d'ensemble, et [pour] tout dossier il faut pouvoir choisir si on lie
// ou pas. Tout ce qui est modif, TS, quantité, ce qui peut toucher du contractuel relié à une affaire ne doit pas être mélangé, ou il faut pouvoir filtrer […] ce qui est
// outil d'aide pour les équipes et le conduc peut l'être […] ce sera un DOE par marché quand même […] les opérateurs, la partie marché ils s'en fichent, il faut que ce soit
// simple : ils arrivent, ils voient leur ville, les réseaux, ils pointent. »
// MODÈLE (toutes les données sont optionnelles : un chantier à une seule affaire n'en a aucune et ne change pas d'un pixel) :
//  · site.mutu.partage = {<onglet>: 'commun' | 'separe'} — absent = défaut (src/mutufus.js, MV_PARTS) : plan d'ensemble et pointage TOUJOURS communs (Ethan), comme ce
//    qui est UN par site ou sans données propres (bureau, QSE, dossier d'accueil PPSPS / DICT, stock physique, catalogue) ; Modifs (marché / TS / écarts) et Export / DOE
//    TOUJOURS séparés (le contrat) ; réglables : conversation (commune d'office), fourniture, phasage, hydraulique, DH, liste et récap (séparés d'office : ce qui peut
//    toucher au contrat).
//  · DOSSIER SÉPARÉ : une affaire à la fois. Sélecteur « Affaire : [2025] [2026] » en tête de l'onglet (40 px, sans « Toutes »). D'office l'affaire de la puce du chantier si
//    elle en désigne une, sinon l'origine ; un choix fait dans un dossier séparé vaut pour tous les dossiers séparés du chantier, sur cet appareil, tant que la puce ne
//    bouge pas (localStorage trace:mv:aff:<chantier> = {aff, chip}). Appartient à l'affaire : une ligne par l.aff (sans aff : l'origine) ; un enregistrement de l'onglet
//    (TS, commande / BL, phase, épreuve, mesure DH…) par son aff, sinon l'affaire de SES lignes, sinon l'origine. Totaux de cette affaire seulement ; exports : le nom
//    porte « · affaire 2026 » ; ce qui est créé dans le dossier reçoit l'aff (celle de ses lignes si elles sont toutes d'une autre affaire — jamais de mélange).
//  · DOSSIER COMMUN : tout ensemble, comme avant ; la puce ne filtre plus que le plan.
//  · RÉGLAGE : pli « Commun / séparé par dossier » de la fenêtre de confirmation du rattachement ; plus tard « ⚙ Commun / séparé » (affaire → Tracé & chantiers, ligne
//    du chantier partagé ; Bureau du chantier ; en tête d'un dossier séparé). Droit « affaires » (comme rattacher), ou chef / bureau ; sinon lecture seule. Écrit par le
//    même chemin que le rattachement : la version du serveur relue, seul mutu (partage, nom) change, plan entier réenregistré ; il faut la connexion.
//  · LES GARS (V3) : opérateur = ni administrateur, ni droit « affaires », ni chef / conducteur / bureau → pas de puces d'affaire en tête, pas de couleurs d'affaire
//    (légende, liseré) ; un seul chantier au nom de la ville (nom commun, modifiable) ; un dossier séparé garde son sélecteur, avec une phrase simple.
import {isMutu,origOf,MV_PARTS,partOf,partageClean,recAff,MU_COLORS} from './mutufus.js';
import {can,isAdmin,currentAccount,roleFor} from './acces.js';
let A=null,H=null; /* A : API de l'appli (celle de mutu.js) ; H : aides de mutu.js (libellés, affaire d'une ligne, puce, écriture du chantier) */
const esc=s=>String(s??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const dFR=x=>x?new Date(x).toLocaleDateString('fr-FR'):'';
const lsGet=k=>{try{return JSON.parse(localStorage.getItem(k)||'null');}catch(e){return null;}};
const lsSet=(k,v)=>{try{if(v===null||v===undefined)localStorage.removeItem(k);else localStorage.setItem(k,JSON.stringify(v));}catch(e){}};
const PART=Object.fromEntries(MV_PARTS.map(p=>[p[0],p]));
/* CSS du lot (injectée : index.html n'est pas touché) */
function css(){try{if(document.getElementById('css-lot-mv'))return;const s=document.createElement('style');s.id='css-lot-mv';s.textContent=`
.mv-sel{display:flex;flex-wrap:wrap;align-items:center;gap:6px;margin:0;padding:8px 16px;background:#f5f1fc;border-bottom:1px solid #e3dbf3;position:sticky;top:0;z-index:4}
.mv-sel .mv-lab{font-size:13px;font-weight:700;color:#4b2a86;flex:none}
.mv-sel button{min-height:40px;min-width:56px;padding:6px 14px;border-radius:999px;border:1.5px solid #c9b8ee;background:#fff;color:#2b1d4a;font-size:14px;font-weight:700;display:inline-flex;align-items:center;gap:6px;cursor:pointer;flex:none}
.mv-sel button.on{background:#4b2a86;border-color:#4b2a86;color:#fff}
.mv-sel button.mv-gear{min-width:40px;padding:6px 10px;font-weight:600;color:#4b2a86;background:transparent;border-color:transparent;margin-left:auto}
.mv-sel .mv-txt{flex:1 1 100%;font-size:12.5px;line-height:1.35;color:#3b2f52;min-width:0;overflow-wrap:anywhere}
.mv-sel .mu-dot{box-shadow:0 0 0 1px rgba(0,0,0,.18)}
.mv-bur{margin:14px 0 0;border:1px solid #e3dbf3;border-radius:14px;background:#faf8fe;padding:10px 12px;font-size:13px;line-height:1.4}
.mv-bur b{color:#2b1d4a}.mv-bur .btn{min-height:40px;margin-top:8px}
.mv-modal{max-width:640px}.mv-modal h3{margin:0 0 6px;font-size:17px}
.mv-prow{display:flex;flex-wrap:wrap;align-items:center;gap:6px 10px;padding:8px 0;border-top:1px solid var(--line,#e1e0d9)}
.mv-prow .mv-pl{flex:1 1 220px;min-width:0}.mv-prow .mv-pl b{display:block;font-size:13.5px;overflow-wrap:anywhere}.mv-prow .mv-pl small{display:block;color:var(--ink2,#52514e);font-size:12px;line-height:1.35;overflow-wrap:anywhere}
.mv-seg{display:flex;gap:6px;flex:0 0 auto}.mv-seg button{min-height:40px;padding:6px 12px;border-radius:10px;border:1.5px solid var(--line,#d9d7cf);background:#fff;font-size:13px;font-weight:600;cursor:pointer}
.mv-seg button.on{background:#2b1d4a;border-color:#2b1d4a;color:#fff}.mv-seg button:disabled{cursor:default;opacity:.85}
.mv-fix{display:inline-block;font-size:12px;font-weight:700;border-radius:8px;padding:6px 10px;background:#efe8fb;color:#4b2a86;min-height:28px}
.mv-fold{border:1px solid var(--line,#e1e0d9);border-radius:12px;padding:6px 10px;margin:8px 0;background:#fff}.mv-fold>summary{cursor:pointer;min-height:40px;display:flex;flex-wrap:wrap;align-items:center;gap:0 8px;font-weight:700;font-size:13.5px;padding:4px 0}.mv-fold>summary .hint{flex:1 1 100%;margin:0!important;font-size:12px}
.mv-fold .mv-prow:first-of-type{border-top:0}
.mv-modal input.f{width:100%;min-height:44px}.mv-modal .actions{display:flex;flex-wrap:wrap;gap:8px;justify-content:flex-end;margin-top:10px}.mv-modal .actions .btn{min-height:44px}
@media (max-width:420px){.mv-sel{padding:8px 12px}.mv-modal .actions .btn{flex:1 1 100%}.mv-seg{flex:1 1 100%}.mv-seg button{flex:1 1 0}}`;document.head.appendChild(s);}catch(e){}}
/* ═════════ 0 · branchement (appelé par initMutu) ═════════ */
export function initMv(api,helpers){A=api;H=helpers;css();}
const curNet=()=>{try{return A&&A.net?A.net():null;}catch(e){return null;}};
const online=()=>!(A&&A.state.cloudUser&&typeof navigator!=='undefined'&&navigator.onLine===false);
/* ═════════ 1 · QUI EST « OPÉRATEUR » (V3) ═════════ */
export function mvOperator(){try{if(!A)return false;const a=currentAccount();if(!a)return false;if(isAdmin())return false;if(can('affaires.view')||can('affaires.edit'))return false;
  if(['chef','conducteur','charge_affaires'].includes(a.poste))return false;const r=roleFor(a);return !(r==='chef'||r==='bureau');}catch(e){return false;}}
/* droit de régler commun / séparé : comme rattacher (« affaires »), ou chef / bureau */
export function mvCanSet(){try{if(isAdmin()||can('affaires.edit'))return true;const a=currentAccount();if(!a)return false;if(['chef','conducteur','charge_affaires'].includes(a.poste))return true;const r=roleFor(a);return r==='chef'||r==='bureau';}catch(e){return false;}}
/* ═════════ 2 · COMMUN / SÉPARÉ, AFFAIRE CHOISIE ═════════ */
export function mvSep(tab,net){net=net===undefined?curNet():net;return !!(net&&isMutu(net)&&partOf(net,tab)==='separe');}
const SKEY='trace:mv:aff:';
const chipKey=net=>{try{return H.chipIdx(net);}catch(e){return -1;}};
/* affaire montrée par les dossiers séparés : le choix fait dans un dossier (tant que la puce n'a pas bougé), sinon l'affaire de la puce, sinon l'origine */
export function mvSel(net){net=net===undefined?curNet():net;if(!net||!isMutu(net))return '';const s=lsGet(SKEY+net.id);const ck=chipKey(net);if(s&&s.aff!==undefined&&net.affaires.includes(String(s.aff))&&s.chip===ck)return String(s.aff);
  let c=null;try{c=H.chipAff(net);}catch(e){c=null;}return c!==null&&c!==undefined&&net.affaires.includes(c)?c:origOf(net);}
export function mvResetSel(net){if(net&&net.id)lsSet(SKEY+net.id,null);} /* une puce touchée : les dossiers séparés reprennent l'affaire de la puce (ou l'origine pour « Toutes ») */
export function mvSetSel(aff){const net=curNet();if(!net||!isMutu(net)||!net.affaires.includes(String(aff)))return;lsSet(SKEY+net.id,{aff:String(aff),chip:chipKey(net)});try{A.renderAll();}catch(e){console.warn(e);}}
const labOf=(net,aff)=>{let L=[];try{L=H.labelsOf(net);}catch(e){L=[];}const i=net.affaires.indexOf(aff);return (i>=0&&L[i])||aff||'origine';};
/* ═════════ 3 · FILTRES DES DOSSIERS (une ligne, un enregistrement) ═════════ */
const lineAff=(net,id)=>{try{return H.affOfId(net,id);}catch(e){return origOf(net);}};
export function mvLineIdIn(tab,id){const net=curNet();if(!mvSep(tab,net))return true;return lineAff(net,id)===mvSel(net);}
export function mvLineIn(tab,l){return !l||mvLineIdIn(tab,l.id);}
export function mvRecAff(rec,lineIds,net){net=net===undefined?curNet():net;if(!net||!isMutu(net))return '';return recAff(rec,lineIds,id=>lineAff(net,id),origOf(net));}
export function mvRecIn(tab,rec,lineIds){const net=curNet();if(!mvSep(tab,net))return true;return mvRecAff(rec,lineIds,net)===mvSel(net);}
/* ce qui est créé dans un dossier séparé reçoit son affaire : celle de SES lignes si elles sont toutes d'une même affaire, sinon l'affaire choisie */
export function mvStamp(tab,rec,lineIds){const net=curNet();if(!rec||typeof rec!=='object'||!mvSep(tab,net))return rec;const sel=mvSel(net);const ids=(lineIds||[]).filter(x=>x!=null&&x!=='');
  const set=new Set(ids.map(id=>lineAff(net,id)));const a=set.size===1?[...set][0]:sel;rec.aff=a;
  if(a!==sel)try{A.toast('Rangé dans l\'affaire '+labOf(net,a)+' : ses lignes sont de cette affaire (jamais de mélange d\'une affaire sur l\'autre)');}catch(e){}return rec;}
/* complément d'un nom de document ou de fichier : « · affaire 2026 » (dossier séparé d'un chantier partagé) */
export function mvTag(tab){const net=curNet();if(!mvSep(tab,net))return '';return ' · affaire '+labOf(net,mvSel(net));}
/* modifications (TS) : chaque élément porte l'affaire de sa ligne (enregistrement de l'onglet Modifs) */
export function mvTsStamp(T){const net=curNet();if(!net||!isMutu(net)||!T||!Array.isArray(T.items))return;T.items.forEach(it=>{if(it&&(it.aff==null||it.aff==='')&&it.line!=null)it.aff=lineAff(net,it.line);});}
/* hydraulique : fiches d'épreuve de l'affaire choisie — l'origine garde h.exec, une affaire rattachée h.execAff[n°] (tronçons calculés sur SES lignes) */
export function mvExec(h){const net=curNet();if(!h)return {};const sel=mvSep('hydro',net)?mvSel(net):'';if(!sel||sel===origOf(net)){h.exec=h.exec||{};return h.exec;}h.execAff=h.execAff||{};h.execAff[sel]=h.execAff[sel]||{};return h.execAff[sel];}
/* DH : mesures de l'affaire choisie (vue en lecture ; l'enregistrement écrit dans le vrai tableau) */
const weldLine=wid=>{if(!wid||!A)return null;const L=A.state.lines||{};for(const l of Object.values(L)){for(const c of ['A','R']){const cd=l&&l.cond&&l.cond[c];if(cd&&(cd.joints||[]).some(j=>j&&j.weldId===wid))return l.id;}}return null;};
export function mvMesLine(m){return m?weldLine(m.weldId):null;}
export function mvDhView(d){if(!d||!mvSep('bouclage'))return d;return Object.assign({},d,{mesures:(d.mesures||[]).filter(m=>mvRecIn('bouclage',m,[weldLine(m&&m.weldId)]))});}
/* phasage : vue de l'affaire choisie (phases par aff, sinon leurs tronçons ; groupes réduits à leurs phases visibles) — les écritures passent par le vrai phasage */
export function mvPhView(P){if(!P||!mvSep('phasage'))return P;const ph=P.phases.filter(p=>mvRecIn('phasage',p,(p.tr||[]).map(t=>t&&t.line)));const ids=new Set(ph.map(p=>p.id));
  const groups=P.groups.map(g=>Object.assign({},g,{phases:(g.phases||[]).filter(id=>ids.has(id))})).filter(g=>g.phases.length);return Object.assign(Object.create(Object.getPrototypeOf(P)),P,{phases:ph,groups});}
/* fourniture : un enregistrement (commande, pièces en plus, zone à livrer, qualification) appartient-il à l'affaire choisie ? */
function fzZoneLines(z){const net=curNet();if(!net||!A)return [];if(z.ph){const P=net.phasage;const ph=P&&Array.isArray(P.phases)?P.phases.find(p=>p&&p.id===z.ph):null;return ph?((ph.aff?[]:(ph.tr||[]).map(t=>t&&t.line))):[];}
  const poly=z.poly||[];if(poly.length<3)return [];const inP=(x,y)=>{let ins=false;for(let i=0,j=poly.length-1;i<poly.length;j=i++){const xi=poly[i][0],yi=poly[i][1],xj=poly[j][0],yj=poly[j][1];if(((yi>y)!==(yj>y))&&(x<(xj-xi)*(y-yi)/((yj-yi)||1e-12)+xi))ins=!ins;}return ins;};
  return Object.values(A.state.lines||{}).filter(l=>(l.pts||[]).some(p=>inP(p.x,p.y))).map(l=>l.id);}
export function mvFzIn(x){if(!x||!mvSep('fourniture'))return true;if(x.ph&&!x.aff){const net=curNet();const P=net&&net.phasage;const ph=P&&Array.isArray(P.phases)?P.phases.find(p=>p&&p.id===x.ph):null;if(ph&&ph.aff)return String(ph.aff)===mvSel(net);}
  return mvRecIn('fourniture',x,(x.poly||x.ph)?fzZoneLines(x):[]);}
/* affaire de la fourniture quand elle est séparée et que ce n'est pas l'origine ('' sinon) : tracé initial de cette affaire dans F.initAff[n°] */
export function mvFzAff(){const net=curNet();if(!mvSep('fourniture',net))return '';const s=mvSel(net);return s===origOf(net)?'':s;}
/* stock vu par la fourniture d'une affaire : ses camions (aff, sinon la zone à livrer qui les a annoncés, sinon l'origine), leurs lots, les prélèvements sur ses lignes */
export function mvStockView(s){if(!s||!mvSep('fourniture'))return s;const net=curNet();const sel=mvSel(net);const F=net&&net.fourniture;const zones=(F&&Array.isArray(F.zones))?F.zones:[];
  const livAff=v=>{if(v.aff)return String(v.aff);if(v.fz){const z=zones.find(x=>x&&x.id===v.fz);if(z)return mvRecAff(z,(z.poly||z.ph)?fzZoneLines(z):[],net);}return origOf(net);};
  const okLiv=new Set((s.livs||[]).filter(v=>v&&livAff(v)===sel).map(v=>v.id));
  return Object.assign({},s,{livs:(s.livs||[]).filter(v=>v&&okLiv.has(v.id)),lots:(s.lots||[]).filter(l=>l&&(l.aff?String(l.aff)===sel:(l.liv?okLiv.has(l.liv):sel===origOf(net)))),takes:(s.takes||[]).filter(t=>t&&mvRecAff(t,[t.line],net)===sel)});}
/* ═════════ 4 · SÉLECTEUR EN TÊTE D'UN DOSSIER SÉPARÉ, CARTE DU BUREAU ═════════ */
const HOST={liste:'view-liste',recap:'view-recap',export:'view-export',ts:'view-ts',fourniture:'view-fourniture',phasage:'view-phasage',hydro:'view-hydro',bouclage:'view-bouclage',conv:'view-conv'};
const SIMPLE='Ce dossier est rangé par affaire : choisis celle de ton travail.';
function sentence(net,tab,sel){const lab=labOf(net,sel);const n=sel?' ('+sel+')':'';
  if(tab==='ts'){const M=sel===origOf(net)?net.marche:(net.marchesAff&&net.marchesAff[sel]);return `🔗 Chantier partagé : modifications et marché de l'affaire <b>${esc(lab)}</b>${esc(n)} seulement${M&&M.at?' — marché figé le '+esc(dFR(M.at)):''}. Jamais de TS d'une affaire sur l'autre.`;}
  if(tab==='export')return `Un DOE par marché : seulement l'affaire <b>${esc(lab)}</b>${esc(n)} — lignes, soudures, modifications, marché ; le nom des fichiers porte l'affaire.`;
  return `Dossier séparé par affaire : seulement l'affaire <b>${esc(lab)}</b>${esc(n)} — ses lignes, ses enregistrements, ses totaux ; ce que tu crées ici lui appartient.`;}
function barHTML(net,tab){let L=[];try{L=H.labelsOf(net);}catch(e){L=[];}const sel=mvSel(net);const op=mvOperator();
  const btns=net.affaires.map((n,k)=>`<button type="button" data-mvaff="${esc(n)}" class="${n===sel?'on':''}" aria-pressed="${n===sel}" title="${esc(n?'affaire '+n:'affaire d\'origine')}">${op?'':`<i class="mu-dot" style="background:${MU_COLORS[k%MU_COLORS.length]}"></i>`}${esc(L[k]||n||'origine')}</button>`).join('');
  const gear=!op&&mvCanSet()?`<button type="button" class="mv-gear" data-mvgear="1" title="Commun ou séparé, dossier par dossier" aria-label="Régler commun ou séparé par dossier">⚙</button>`:'';
  return `<span class="mv-lab">Affaire :</span>${btns}${gear}<span class="mv-txt"${tab==='ts'?' id="muTsBanner"':''}>${op?esc(SIMPLE):sentence(net,tab,sel)}</span>`;}
/* après chaque rendu du chantier (renderAll) : sélecteurs des dossiers séparés (posés AU-DESSUS du contenu de l'onglet : un re-rendu de l'onglet ne les efface pas), carte du Bureau */
export function mvAfterRender(){try{if(!A)return;const net=curNet();const on=A.state.screen==='site'&&!!net&&isMutu(net);
  Object.entries(HOST).forEach(([tab,hid])=>{const host=document.getElementById(hid);if(!host)return;let bar=null;for(const ch of host.children){if(ch.classList&&ch.classList.contains('mv-sel')){bar=ch;break;}}
    if(!(on&&partOf(net,tab)==='separe')){if(bar)bar.remove();return;}
    if(!bar){bar=document.createElement('div');bar.className='mv-sel';bar.dataset.mvtab=tab;bar.setAttribute('role','group');bar.setAttribute('aria-label','Affaire montrée par ce dossier');host.insertBefore(bar,host.firstChild);
      bar.addEventListener('click',e=>{const g=e.target.closest('[data-mvgear]');if(g){const n=curNet();if(n)mvOpenPartage(n.id,{from:'onglet'});return;}const b=e.target.closest('[data-mvaff]');if(b)mvSetSel(b.dataset.mvaff);});}
    const html=barHTML(net,tab);if(bar.innerHTML!==html)bar.innerHTML=html;});
  bureauCard(net,on);}catch(e){console.warn(e);}}
function partSummary(net){const sep=MV_PARTS.filter(p=>partOf(net,p[0])==='separe').map(p=>p[1].replace(/ \(.*\)$/,''));const com=MV_PARTS.filter(p=>partOf(net,p[0])==='commun').map(p=>p[1].replace(/ \(.*\)$/,''));return {sep,com};}
function bureauCard(net,on){const host=document.getElementById('bureau');if(!host)return;let c=document.getElementById('mvBur');const want=on&&A.state.tab==='bureau'&&!mvOperator();
  if(!want){if(c)c.remove();return;}let L=[];try{L=H.labelsOf(net);}catch(e){L=[];}const S=partSummary(net);
  const html=`<b>🔗 Chantier partagé par ${net.affaires.length} affaires (${esc(L.join(' · '))})</b><div>Séparés par affaire : ${esc(S.sep.join(', '))}.</div><div>Communs : ${esc(S.com.join(', '))}.</div><button type="button" class="btn" data-mvset="1">⚙ Commun / séparé par dossier${mvCanSet()?'':' (consultation)'}</button>`;
  if(!c){c=document.createElement('div');c.id='mvBur';c.className='mv-bur';c.addEventListener('click',e=>{if(e.target.closest('[data-mvset]')){const n=curNet();if(n)mvOpenPartage(n.id,{from:'bureau'});}});}
  if(c.parentElement!==host||host.lastElementChild!==c)host.appendChild(c); /* en bas du Bureau, DANS son cadre (le Bureau est réécrit à chaque rendu : la carte est reposée juste après) */if(c.innerHTML!==html)c.innerHTML=html;}
/* ═════════ 5 · RÉGLAGE « COMMUN / SÉPARÉ PAR DOSSIER » ═════════ */
/* lignes du réglage (pli de la confirmation ou fenêtre) — map : valeurs en cours ; ro : lecture seule */
export function mvPartRowsHTML(map,ro){return MV_PARTS.map(([k,lab,d,r,why])=>{const v=r?((map&&(map[k]==='commun'||map[k]==='separe'))?map[k]:d):d;
  const ctl=!r?`<span class="mv-fix">${v==='commun'?'toujours commun':'toujours séparé'}</span>`:`<div class="mv-seg" role="radiogroup" aria-label="${esc(lab)}"><button type="button" role="radio" data-mvp="${esc(k)}|commun" class="${v==='commun'?'on':''}" aria-checked="${v==='commun'}"${ro?' disabled':''}>Commun</button><button type="button" role="radio" data-mvp="${esc(k)}|separe" class="${v==='separe'?'on':''}" aria-checked="${v==='separe'}"${ro?' disabled':''}>Séparé par affaire</button></div>`;
  return `<div class="mv-prow" data-mvrow="${esc(k)}"><div class="mv-pl"><b>${esc(lab)}</b><small>${esc(why)}</small></div>${ctl}</div>`;}).join('');}
/* pli « Commun / séparé par dossier » de la fenêtre de confirmation du rattachement (pré-réglé : réglage du chantier s'il en a un, sinon les défauts) */
export function mvFoldHTML(site){const cur=(site&&site.mutu&&site.mutu.partage)||{};const S=partSummary(site||{});return `<details class="mv-fold" id="mvFold"><summary>⚙ Commun / séparé par dossier <span class="hint" style="font-weight:400">pré-réglé — séparés par affaire : ${esc(S.sep.join(', '))} ; le reste commun. Touche pour changer.</span></summary><div class="hint" style="margin:2px 0 4px">Commun : un seul dossier pour tout le chantier (outils des équipes et du conducteur). Séparé : chaque affaire le sien, avec un sélecteur en tête — ce qui touche au contrat n'est jamais mélangé.</div>${mvPartRowsHTML(cur,false)}</details>`;}
/* boutons Commun / Séparé (dans un conteneur) */
export function mvWireRows(root){if(!root)return;root.addEventListener('click',e=>{const b=e.target.closest('[data-mvp]');if(!b||b.disabled)return;const [k,v]=b.dataset.mvp.split('|');root.querySelectorAll(`[data-mvp^="${k}|"]`).forEach(x=>{const on=x.dataset.mvp===k+'|'+v;x.classList.toggle('on',on);x.setAttribute('aria-checked',String(on));});});}
/* lecture du réglage choisi dans un conteneur → {onglet: valeur} (seuls les réglables) */
export function mvReadRows(root){const o={};if(!root)return o;root.querySelectorAll('.mv-seg button.on[data-mvp]').forEach(b=>{const [k,v]=b.dataset.mvp.split('|');if(PART[k]&&PART[k][3])o[k]=v;});return o;}
export function mvFoldRead(){return mvReadRows(document.getElementById('mvFold'));}
/* la fenêtre du réglage (affaire → Tracé & chantiers, Bureau, en tête d'un dossier séparé) */
export function mvOpenPartage(id,o){o=o||{};if(!A)return;const net=(A.SITES&&A.SITES[id])||curNet();if(!net||!isMutu(net)){A.toast('Ce chantier n\'est pas partagé par plusieurs affaires');return;}
  const ro=!mvCanSet()||!!o.consult;const cur=(net.mutu&&net.mutu.partage)||{};let L=[];try{L=H.labelsOf(net);}catch(e){L=[];}const nom=net.name||(net.mutu&&net.mutu.nom)||'';
  A.openModal(`<div class="mv-modal" id="mvPart"><h3>⚙ Commun ou séparé, dossier par dossier</h3><div class="eq-s">Chantier partagé « <b>${esc(net.name||id)}</b> » — affaires ${esc(L.join(' · '))}. <b>Commun</b> : un seul dossier pour tout le chantier. <b>Séparé</b> : chaque affaire le sien, avec un sélecteur « Affaire » en tête ; ce qui touche au contrat n'est jamais mélangé. Passer de séparé à commun ne perd rien : chaque enregistrement garde son affaire.</div>
    ${ro?`<div class="warnbox" style="margin:6px 0">Lecture seule : ${o.consult?'version consultée':'réservé au droit « affaires », au chef et au bureau'}.</div>`:''}
    <div id="mvRows">${mvPartRowsHTML(cur,ro)}</div>
    <label class="f" for="mvNom" style="display:block;margin-top:8px">Nom affiché aux gars</label><input class="f" id="mvNom" value="${esc(nom)}" maxlength="80" autocomplete="off"${ro?' disabled':''}>
    <div class="actions"><button class="btn" type="button" data-close>${ro?'Fermer':'Annuler'}</button>${ro?'':'<button class="btn primary" type="button" id="mvPartGo">Enregistrer</button>'}</div></div>`);
  const rows=document.getElementById('mvRows');mvWireRows(rows);const go=document.getElementById('mvPartGo');
  if(go)go.onclick=async()=>{const map=mvReadRows(rows);const nm=((document.getElementById('mvNom')||{}).value||'').trim()||nom;go.disabled=true;go.textContent='⏳ Enregistrement…';const r=await savePartage(id,map,nm);A.closeModal();
    if(r.ok){A.toast('⚙ Réglage enregistré : '+(r.sep.length?r.sep.length+' dossier'+(r.sep.length>1?'s':'')+' séparé'+(r.sep.length>1?'s':'')+' par affaire':'tout en commun sauf Modifs et DOE'));try{A.renderAll();}catch(e){}try{A.renderHome();}catch(e){}}else A.toast('Réglage non enregistré : '+r.why);};}
/* écriture : la version du serveur relue juste avant (rien de fait ailleurs n'est perdu), seuls mutu.partage / mutu.nom (et le nom du chantier) changent ; puis les copies
   de l'appareil (chantier ouvert, liste, remise du traceur) */
let busy=false;
async function savePartage(id,map,nom){if(busy)return {ok:false,why:'un enregistrement est déjà en cours'};if(!online())return {ok:false,why:'il faut la connexion (le chantier est réécrit sur le serveur)'};busy=true;
  try{let base=null;if(A.state.cloudUser){try{base=await Promise.race([A.sync.loadSite(id),new Promise(r=>setTimeout(()=>r(null),8000))]);}catch(e){base=null;}}
    const loc=(A.net&&A.net()&&A.net().id===id)?A.net():(A.SITES[id]||null);if(!(base&&Array.isArray(base.lines)&&!base.deleted)){if(A.state.cloudUser&&!loc)return {ok:false,why:'chantier introuvable'};base=Object.assign({},loc);}
    if(!isMutu(base))return {ok:false,why:'ce chantier n\'est plus partagé'};const m=Object.assign({},base.mutu||{});const pc=partageClean(map);if(pc)m.partage=pc;else delete m.partage;
    if(nom&&nom!==(base.name||'')){m.nom=nom;base.name=nom;}base.mutu=m; /* le nom n'est réécrit que s'il a été changé ici */
    if(A.state.cloudUser){const clean=Object.assign({},base);['handoff','sent','sentAt','_lines'].forEach(k=>delete clean[k]);let r=false;try{r=await A.sync.saveSite(clean);}catch(e){r=false;}
      if(!r)return {ok:false,why:'le serveur a refusé l\'enregistrement du chantier'+(A.sync.lastError?' ('+String(A.sync.lastError).slice(0,90)+')':'')};A.state.ownSiteWrite=Date.now();if(typeof r==='string')base.updated_at=r;}
    const seen=new Set();[A.net&&A.net(),A.SITES[id],A.siteStore[id]&&A.siteStore[id].NET].forEach(x=>{if(!x||x.id!==id||seen.has(x))return;seen.add(x);x.mutu=m;x.name=base.name;if(base.updated_at)x.updated_at=base.updated_at;});
    try{const h=await A.kv.get('trace:handoff:'+id);if(h){h.mutu=m;h.name=base.name;if(base.updated_at)h.updated_at=base.updated_at;await A.kv.set('trace:handoff:'+id,h);}}catch(e){}
    try{const mt=(A.state.serverMetas||[]).find(x=>x.id===id);if(mt){mt.name=base.name;if(base.updated_at)mt.updated_at=base.updated_at;}if(A.addSiteOption&&A.SITES[id])A.addSiteOption(A.SITES[id]);}catch(e){}
    return {ok:true,sep:MV_PARTS.filter(p=>p[3]&&partOf(base,p[0])==='separe').map(p=>p[0])};}
  catch(e){console.warn(e);return {ok:false,why:(e&&e.message)||String(e)};}finally{busy=false;}}
/* ═════════ 6 · TESTS ═════════ */
export function mvTestApi(){return {sel:()=>mvSel(),setSel:a=>mvSetSel(a),sep:t=>mvSep(t),part:t=>{const n=curNet();return n?partOf(n,t):null;},operator:()=>mvOperator(),canSet:()=>mvCanSet(),tag:t=>mvTag(t),open:id=>mvOpenPartage(id),save:(id,map,nom)=>savePartage(id,map,nom),parts:()=>MV_PARTS.map(p=>p.slice())};}
