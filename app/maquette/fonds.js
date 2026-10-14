/* fonds.js — 14/10 soir (lot T2), traceur : plans de fond PDF et images (échelle 1/N), VUE AÉRIENNE par adresse (tuiles IGN sous les plans), CALAGE des lignes
   et de leurs plans sur la vue aérienne, DXF géoréférencés placés tout seuls.
   Ethan (14/10 soir) : « + plan : je ne sais pas quel format il veut… il faut que ce puisse être possible avec des dxf, des pdf » ; « si le plan pdf est à l'échelle 1/200,
   mettre direct 1/200 dans les propriétés à côté de l'opacité » ; « donner une adresse pour avoir une vue aérienne… en fond, derrière les plans importés » ; « quand ma ligne
   est dessinée je la place sur la vue aérienne au bon endroit… le plan importé suit » ; « deux lignes déjà calées entre elles parce que c'était un seul et même plan :
   un point suffit » ; « deux dxf bien géoréférencés se caleraient directement » ; « le calage sur la vue aérienne fait foi de position officielle ».
   Données :
   • AER, par contexte (localStorage trace:geo:v1:<ctx>) = {geo, show, op, layer, addr}. geo = géoréférencement du REPÈRE DU TRACÉ (mètres, y vers le bas), même format
     que net.geo de l'appli : {crs, aff:{a,b,c,d,e,f}} (X = a·x + b·y + e ; Y = c·x + d·y + f) + src ('traceur' : créé par adresse, nord en haut, 1 unité = 1 m, Lambert 93 ;
     'dxf' : repère d'un DXF géoréférencé du tracé, exact) + addr + at. Passé au chantier : site.geo (bridge.js), position officielle.
   • l.plan (ligne du traceur) = id du plan sur lequel elle a été dessinée (null : aucun) — caler un plan emmène ses lignes ; caler une ligne emmène son plan s'il n'a qu'elle.
   • plan : from / page / pages / pageW_mm / pageH_mm / dpi / dpiSrc / srcW / ech (src/plans.js, PLAN_META) ; plan.geo = 'aerien' quand il a été calé sur la vue aérienne.
   Le traceur (main.js) passe ses fonctions à init() ; les points d'appel dans main.js sont marqués « 14/10 soir (T2) ». */
import {CRS,geocode,tilesFor,ignTileURL,lonLatToPlan,crsName,geoNorthUp,geoOfOrigin,geoMapPoint} from '../src/geo.js';
import {tfNorm,tfApply,tfInverse,tfCompose,tfIsIdentity,planSimilarity,planFileKind,planScaleK,planScaleN,tfScaleAbout,imageDpi,paperName} from '../src/plans.js';
import {fmt} from './traceur.js';
export {planMeta,PLAN_ACCEPT as ACCEPT} from '../src/plans.js'; // pour main.js (IndexedDB, « ＋ Plan »)
const SVGNS='http://www.w3.org/2000/svg';
const $=(s,el=document)=>el.querySelector(s),$$=(s,el=document)=>[...el.querySelectorAll(s)];const esc=s=>String(s??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
let A=null;const S=()=>A.state;
const AER={geo:null,show:true,op:1,layer:'ortho',addr:''};let stored=false;
let gAer=null,gCal=null,credit=null,calBar=null,tileErr=0;
const LAYERS={ortho:{label:'Photo aérienne',kinds:['ortho']},orthocad:{label:'Photo + cadastre',kinds:['ortho','cadastre']},plan:{label:'Plan IGN',kinds:['plan']},cadastre:{label:'Cadastre (parcelles)',kinds:['cadastre']}};
// pdf.js : celui de l'appli (CDN, version figée) — ?pdfjs=<dossier> dans l'adresse (tests, poste sans internet), sinon CDN, puis repli sur une copie locale ./pdfjs/
const PDFJS_Q=(()=>{try{return new URLSearchParams(location.search).get('pdfjs')||'';}catch(e){return '';}})(); // capté au chargement : l'adresse est nettoyée ensuite
const PDFJS_CDN='https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/';
const COORD=/^(-?\d+(?:[.,]\d+)?)\s*[,; ]\s*(-?\d+(?:[.,]\d+)?)$/;
const flash=t=>{if(A)A.flash(t);};
/* ================= démarrage ================= */
export function init(api){A=api;css();
  const world=$('#world'),bg=$('#bg');if(world&&bg){gAer=document.createElementNS(SVGNS,'g');gAer.id='aerial';gAer.setAttribute('style','pointer-events:none');world.insertBefore(gAer,bg); // SOUS les plans importés
    gCal=document.createElementNS(SVGNS,'g');gCal.id='t2cal';gCal.setAttribute('style','pointer-events:none');world.appendChild(gCal);
    gAer.addEventListener('error',()=>{if(!tileErr++)showCredit();},true);} // tuile non chargée (hors connexion) : signalé dans la mention © IGN
  const mainEl=$('#main');if(mainEl){credit=document.createElement('div');credit.id='aerCredit';credit.className='t2credit';credit.style.display='none';mainEl.appendChild(credit);
    calBar=document.createElement('div');calBar.className='t2calbar';calBar.innerHTML='<span class="t2step"></span><button class="btn" data-t2="calStop" title="annuler le calage (Échap)">✕ Annuler</button>';calBar.addEventListener('click',e=>{if(e.target.closest('[data-t2="calStop"]'))A.setMode('select');});mainEl.appendChild(calBar);}
  window.addEventListener('online',()=>{tileErr=0;renderTiles(true);refreshUI();});window.addEventListener('offline',()=>{showCredit();refreshUI();});
  loadAer();
  const b=$('#bAer');if(b)b.onclick=()=>openAerModal();const e=$('#bgEch');if(e)e.onclick=()=>openEchModal();
  // onglet Fond et fenêtres : délégation, en CAPTURE (avant le clic « choisir ce plan » de la carte du plan, qui redessine le panneau)
  ['#panel','#modalBody'].forEach(sel=>{const el=$(sel);if(!el)return;el.addEventListener('click',onClick,true);el.addEventListener('change',onChange,true);el.addEventListener('input',onInput,true);el.addEventListener('keydown',onKey,true);});
  const net=$('#net');if(net)new MutationObserver(syncUndo).observe(net,{childList:true}); // Ctrl+Z / ↶ d'un calage : les lignes reviennent (snapshot du traceur), les plans suivent
  window.addEventListener('keydown',e=>{if(!(e.ctrlKey||e.metaKey)||e.shiftKey||e.altKey||(e.key!=='z'&&e.key!=='Z'))return;const t=e.target;if(t&&/^(INPUT|TEXTAREA|SELECT)$/.test(t.tagName))return;if(!xUndoable())return;e.preventDefault();e.stopImmediatePropagation();xUndo();},true); // calage sans ligne déplacée : annulé en premier
  const bu=$('#bUndo');if(bu)bu.addEventListener('click',e=>{if(!xUndoable())return;e.stopImmediatePropagation();xUndo();},true);
  Promise.resolve().then(()=>{if(window.MAQ)window.MAQ.fond=API;}); // API (tests, automatisation) : window.MAQ.fond (MAQ est créé à la fin de main.js)
  syncBtn();}
function css(){if($('#css-lot-t2'))return;const st=document.createElement('style');st.id='css-lot-t2';st.textContent=`
.t2credit{position:absolute;right:8px;top:34px;background:rgba(252,252,251,.92);border:1px solid var(--line);border-radius:6px;padding:1px 6px;font-size:10.5px;color:var(--ink2);pointer-events:none;z-index:4;max-width:70%}
.t2aer .row,.t2 .row{display:flex;gap:6px;flex-wrap:wrap;align-items:center;margin-top:6px}
.t2aer input.t2addr,.t2 input.t2addr{flex:1 1 150px;min-width:0;width:auto}
.t2ech{display:flex;gap:5px;flex-wrap:wrap;align-items:center;margin-top:5px;font-size:11.5px}.t2ech input.f{width:64px;padding:3px 5px}
.t2small{font-size:11px}.t2msg:empty{display:none}
.t2opt{margin:8px 0}.t2opt label{display:flex;gap:7px;align-items:center;margin:5px 0;font-size:13px;color:var(--ink)}.t2opt select{max-width:100%}
.t2pages{display:grid;grid-template-columns:repeat(auto-fill,minmax(100px,1fr));gap:6px;max-height:44vh;overflow:auto;margin:8px 0}
.t2pages label{display:flex;flex-direction:column;align-items:center;gap:3px;border:1px solid var(--line);border-radius:8px;padding:5px;font-size:11px;cursor:pointer;margin:0;text-align:center;color:var(--ink)}
.t2pages canvas{max-width:100%;height:auto;background:#fff;border:1px solid var(--line)}
#modalBody.t2m{max-height:92vh;overflow:auto;max-width:min(520px,calc(100vw - 16px))}
.t2 table td{vertical-align:middle}.t2 table select{max-width:190px}
.t2calbar{position:absolute;left:50%;bottom:58px;transform:translateX(-50%);z-index:7;display:none;background:var(--ink);color:#fff;border-radius:12px;padding:5px 6px 5px 12px;box-shadow:0 6px 20px rgba(0,0,0,.25);max-width:calc(100% - 16px);font-size:12.5px}.t2calbar .t2step{margin-right:8px}.t2calbar .btn{background:#fff;color:var(--ink);border-color:#fff}
#bAer.t2on{border-color:#1c3d6b;color:#1c3d6b;font-weight:600}
#bgTools{flex-wrap:wrap;max-width:100%}
@media (max-width:800px),(pointer:coarse){#bAer,#bgEch,.t2 .btn,.t2aer .btn,.t2ech .btn,.t2calbar .btn{min-height:36px}.t2 input.f,.t2 select.f,.t2aer input.f,.t2aer select.f,.t2ech input.f{min-height:36px}.t2opt input,.t2pages input{width:20px;height:20px}}`;document.head.appendChild(st);}
/* ================= mémoire par contexte ================= */
const KEY=()=>A.SLOT('trace:geo:v1');
const validGeo=g=>{if(!g||!g.crs||!CRS[g.crs]||!g.aff)return null;const f=g.aff;if(!['a','b','c','d','e','f'].every(k=>isFinite(+f[k])))return null;return (f.a*f.d-f.b*f.c)?g:null;};
function saveAer(){try{if(!AER.geo&&!AER.addr){localStorage.removeItem(KEY());return;}localStorage.setItem(KEY(),JSON.stringify({v:1,geo:AER.geo,show:AER.show,op:AER.op,layer:AER.layer,addr:AER.addr||''}));stored=true;}catch(e){}}
function loadAer(){Object.assign(AER,{geo:null,show:true,op:1,layer:'ortho',addr:''});stored=false;
  try{const s=JSON.parse(localStorage.getItem(KEY())||'null');if(s&&s.v===1){AER.geo=validGeo(s.geo);AER.show=s.show!==false;AER.op=+s.op>0?Math.min(1,+s.op):1;AER.layer=LAYERS[s.layer]?s.layer:'ortho';AER.addr=s.addr||'';stored=true;}}catch(e){}
  try{const R=JSON.parse(localStorage.getItem('trace:maquette:slots')||'{}');Object.keys(localStorage).filter(k=>k.startsWith('trace:geo:v1:')).forEach(k=>{const c=k.slice(13);if(c!==A.CTX&&!(c in R))localStorage.removeItem(k);});}catch(e){}} // contextes oubliés par le traceur (8 au plus) : leur géoréférencement part aussi
// « nouveau réseau » (page vide) : le géoréférencement du dessin précédent ne reste pas
export function reset(){Object.assign(AER,{geo:null,show:true,op:1,layer:'ortho',addr:''});saveAer();renderTiles();syncBtn();renderCal();}
// chantier ouvert dans le traceur (?site=) : son géoréférencement (traceur ou calage fait dans l'appli) devient celui du tracé — le chantier fait foi, comme pour les lignes
export function fromSite(site){if(!A)return;const g=validGeo(site&&site.geo);AER.geo=g?JSON.parse(JSON.stringify(g)):null;if(g&&!stored)AER.show=g.src==='traceur'||g.src==='dxf';if(g&&g.addr&&!AER.addr)AER.addr=g.addr;saveAer();renderTiles(true);syncBtn();}
// ce que le chantier reçoit (site.geo, bridge.js) : null = le traceur n'a pas de géoréférencement (un ancien calage de l'appli reste alors)
export function siteGeo(){const g=A&&AER.geo;if(!g)return null;const o=JSON.parse(JSON.stringify(g));if(AER.addr&&!o.addr)o.addr=AER.addr;return o;}
export const geo=()=>AER.geo;
/* ================= tuiles IGN (sous les plans) ================= */
export function onView(){if(!A)return;renderTiles();renderCal();}
export function renderTiles(force){if(!gAer)return;const g=AER.geo;if(!g||!AER.show){if(gAer.firstChild)gAer.innerHTML='';gAer.dataset.key='';showCredit();return;}
  const v=S().view,k=v.k;const svg=A.svg;const W=svg.clientWidth||800,H=svg.clientHeight||600;const box=[(-v.tx)/k,(-v.ty)/k,(W-v.tx)/k,(H-v.ty)/k];
  let T=null;try{T=tilesFor(g,box,k,19,90);}catch(e){T=null;}
  if(!T||!T.tiles.length){gAer.innerHTML='';gAer.dataset.key='';showCredit();return;}
  const xs=T.tiles.map(t=>t.x),ys=T.tiles.map(t=>t.y);const mx=Math.min(...xs),my=Math.min(...ys);const key=`${AER.layer}:${T.z}:${mx}-${Math.max(...xs)}:${my}-${Math.max(...ys)}`;
  // coordonnées LOCALES des tuiles (première à 0,0) : l'origine passe dans la matrice (Chrome ne dessine plus au-delà de ~2^25 px — même règle que l'appli)
  const ox=mx*256,oy=my*256;const [a,b,c,d,e,f]=T.matrix;const mat=`matrix(${[a,b,c,d,e+a*ox+c*oy,f+b*ox+d*oy].map(x=>(+x).toPrecision(10)).join(' ')})`;
  gAer.setAttribute('opacity',AER.op);
  if(force||gAer.dataset.key!==key){gAer.dataset.key=key;gAer.innerHTML=(LAYERS[AER.layer]||LAYERS.ortho).kinds.map((kd,i)=>`<g data-layer="${kd}" transform="${mat}"${i?' opacity=".85"':''}>${T.tiles.map(t=>`<image href="${ignTileURL(kd,T.z,t.x,t.y)}" x="${(t.x-mx)*256}" y="${(t.y-my)*256}" width="256.5" height="256.5"/>`).join('')}</g>`).join('');}
  else [...gAer.children].forEach(ch=>ch.setAttribute('transform',mat));
  showCredit();}
function showCredit(){if(!credit)return;const on=!!(AER.geo&&AER.show);credit.style.display=on?'':'none';if(!on)return;const off=navigator.onLine===false;credit.innerHTML=`© IGN${off||tileErr?` · <b>${off?'hors connexion':'tuiles non chargées'}</b> (tuiles déjà vues)`:''}`;credit.title='Fond IGN Géoplateforme (Licence Ouverte)';}
function syncBtn(){const b=$('#bAer');if(!b)return;b.textContent='📍 Vue aérienne'+(AER.geo?' ✓':'');b.classList.toggle('t2on',!!(AER.geo&&AER.show));}
function refreshUI(){syncBtn();if(S().tab==='fond')A.renderPanel();const m=$('#modalBody .t2aer');if(m&&$('#modal').classList.contains('show')){const box=m.closest('.t2');if(box)box.outerHTML=aerModalHTML();}}
function geoLabel(){const g=AER.geo;if(!g)return '';const nu=Math.abs(g.aff.b)<1e-9&&Math.abs(g.aff.c)<1e-9;if(g.src==='traceur')return `${crsName(g.crs)}${nu?', nord en haut':''}${AER.addr?' — « '+AER.addr+' »':''} : position officielle du chantier`;if(g.src==='dxf')return `calée sur le DXF géoréférencé${g.plan?' « '+g.plan+' »':''} (${crsName(g.crs)})`;return `calage du chantier (${crsName(g.crs)})`;}
/* ================= adresse → vue aérienne ================= */
function viewCenter(){const v=S().view;const svg=A.svg;return [((svg.clientWidth||800)/2-v.tx)/v.k,((svg.clientHeight||600)/2-v.ty)/v.k];}
function centerOn(p){const v=S().view;const svg=A.svg;let k=v.k;if(!(k>=0.3))k=2;v.k=k;v.tx=(svg.clientWidth||800)/2-p[0]*k;v.ty=(svg.clientHeight||600)/2-p[1]*k;A.applyView();A.render();A.save();}
// repère du tracé déjà géoréférencé par un DXF (le repère commun = origine Lambert du 1er DXF, placé par ses coordonnées) → géoréférencement exact, sinon null
function geoFromDxf(){const b=S().bg;if(!b||!b.origin)return null;const P=A.bgPlans().filter(p=>p.kind==='dxf'&&p.origin&&p.origin.x0===b.origin.x0&&p.origin.y1===b.origin.y1&&tfIsIdentity(p.transform));if(!P.length)return null;
  const bb=A.planTight(P[0]);const g=geoOfOrigin(b.origin,bb?[(bb[0]+bb[2])/2,(bb[1]+bb[3])/2]:[0,0]);return g?{...g,src:'dxf',plan:P[0].name||'',at:new Date().toISOString()}:null;}
let lastMsg=''; // dernier message (calage, recherche) : reste affiché dans la section « Vue aérienne » (le bandeau ne dure que 1,6 s)
function msg(t,quiet){lastMsg=t||'';$$('.t2msg').forEach(el=>{el.textContent=lastMsg;});if(t&&!quiet)flash(t);}
/* « 📍 Vue aérienne » : tracé sans géoréférencement → on en crée un (Lambert 93, nord en haut, 1 unité = 1 m) qui met l'adresse au CENTRE DE LA VUE ACTUELLE
   (ou, si un DXF du tracé est en Lambert, celui du DXF : il est déjà à sa place) ; tracé déjà géoréférencé → la vue se recentre sur l'adresse. */
export async function searchAddr(q){q=String(q||'').trim();if(!q){msg('Tape une adresse, une commune, ou des coordonnées « 47.47, -0.55 »');return {ok:false};}
  if(navigator.onLine===false&&!COORD.test(q)){msg('Pas de réseau : la recherche d\'adresse a besoin d\'internet (des coordonnées « 47.47, -0.55 » marchent sans). La vue aérienne déjà vue reste affichée.');return {ok:false,offline:true};}
  msg('Recherche de « '+q+' »…',true);let c=null;try{c=await geocode(q);}catch(e){c=null;}
  if(!c){const off=navigator.onLine===false;msg(off?'Pas de réseau : adresse non cherchée.':'Adresse introuvable : essaie la commune seule, ou des coordonnées « 47.47, -0.55 ».');return {ok:false,offline:off};}
  let created=false,from=null;
  if(!AER.geo){const gd=geoFromDxf();if(gd){AER.geo=gd;from='dxf';}else{const cv=viewCenter();AER.geo={...geoNorthUp(c.lon,c.lat,cv[0],cv[1]),src:'traceur',addr:c.label||q,at:new Date().toISOString()};from='adresse';}created=true;}
  AER.addr=c.label||q;AER.show=true;saveAer();
  const p=lonLatToPlan(AER.geo,c.lon,c.lat);centerOn(p);renderTiles(true);syncBtn();
  const t=created?(from==='dxf'?`Vue aérienne calée sur le DXF géoréférencé « ${AER.geo.plan} » (${crsName(AER.geo.crs)}) — vue centrée sur « ${AER.addr} »`:`Vue aérienne en fond, « ${AER.addr} » au centre — ⌖ Caler sur la vue aérienne pour placer les lignes et leurs plans`):`Vue recentrée sur « ${AER.addr} »`;
  msg(t);refreshUI();return {ok:true,created,from,p,label:c.label};}
export function setShow(on){AER.show=on!==false;saveAer();renderTiles(true);syncBtn();showCredit();}
export function setOpacity(v){AER.op=Math.max(.2,Math.min(1,+v||1));saveAer();if(gAer)gAer.setAttribute('opacity',AER.op);}
export function setLayer(k){if(!LAYERS[k])return false;AER.layer=k;saveAer();renderTiles(true);return true;}
export function forget(){AER.geo=null;saveAer();renderTiles();syncBtn();refreshUI();flash('Vue aérienne retirée de ce tracé (le chantier garde son ancien calage s\'il en avait un)');}
/* ================= fenêtres ================= */
function openModal(html){const b=$('#modalBody');b.classList.add('t2m');b.innerHTML=html;$('#modal').classList.add('show');}
function closeModal(){$('#modal').classList.remove('show');}
function aerBox(){const g=AER.geo;let h=`<div class="card t2aer"><div style="display:flex;align-items:center;gap:6px"><b style="flex:1">📍 Vue aérienne (IGN)</b>${g?`<label class="muted" style="font-size:12px;display:flex;gap:4px;align-items:center"><input type="checkbox" data-t2="aerShow" ${AER.show?'checked':''}> afficher</label>`:''}</div>`;
  h+=`<div class="row"><input class="f t2addr" data-t2="aerAddr" placeholder="adresse, commune… ou « 47.47, -0.55 »" value="${esc(AER.addr||'')}" enterkeyhint="search" autocomplete="off"><button class="btn sm" data-t2="aerGo">${g?'Recentrer':'Afficher'}</button></div>`;
  const lk=S().lines.length&&A.bgPlans().length?`<button class="btn sm" data-t2="linksOpen" title="à quel plan chaque ligne est rattachée (le plan suit ses lignes au calage)">🔗 Lignes ↔ plans</button>`:'';
  if(!g)h+=(lk?`<div class="row">${lk}</div>`:'')+`<div class="muted t2small" style="margin-top:4px">La photo aérienne se met en fond, <b>derrière</b> les plans, l'adresse au centre de l'écran. Ensuite : <b>⌖ Caler</b> les lignes (et leur plan) dessus — un point suffit pour un groupe déjà calé.${geoFromDxf()?' <b>Un DXF du tracé est en Lambert</b> : la photo se calera directement sur lui.':''}</div>`;
  else h+=`<div class="row"><select class="f" data-t2="aerLayer">${Object.entries(LAYERS).map(([k,v])=>`<option value="${k}" ${AER.layer===k?'selected':''}>${v.label}</option>`).join('')}</select><label class="muted" style="font-size:11.5px">opacité <input type="range" data-t2="aerOp" min="20" max="100" value="${Math.round(AER.op*100)}" style="width:80px;vertical-align:middle"></label></div>
    <div class="muted t2small" style="margin-top:4px">${esc(geoLabel())} · © IGN${navigator.onLine===false?' · <b>hors connexion</b> : tuiles déjà vues seulement':''}</div>
    <div class="row"><button class="btn sm" data-t2="calOpen" title="placer une ligne, un plan et ses lignes, ou tout le tracé sur la photo : 1 point (translation) ou 2 points (rotation)">⌖ Caler sur la vue aérienne</button>${lk}<button class="btn sm danger" data-t2="aerForget" title="retirer le géoréférencement de ce tracé">Oublier</button></div>`;
  return h+`<div class="muted t2small t2msg" style="margin-top:4px">${esc(lastMsg)}</div></div>`;}
// section de l'onglet Fond (au-dessus de la liste des plans)
export function fondSection(){return A?aerBox():'';}
const aerModalHTML=()=>`<div class="t2"><h3 style="margin:0 0 6px">📍 Vue aérienne</h3>${aerBox()}<div class="actions"><button class="btn" data-t2="close">Fermer</button></div></div>`;
export function openAerModal(t){openModal(aerModalHTML());if(t)msg(t,true);const i=$('#modalBody [data-t2="aerAddr"]');if(i&&!AER.geo)setTimeout(()=>{try{i.focus();}catch(e){}},50);}
/* ================= « ＋ Plan » : formats ================= */
export const fileKind=f=>planFileKind(f&&f.name,f&&f.type);
let pdfjsP=null;
function loadScript(src){return new Promise((res,rej)=>{const s=document.createElement('script');s.src=src;s.onload=()=>res();s.onerror=()=>{s.remove();rej(new Error('script non chargé'));};document.head.appendChild(s);});}
export function loadPdfJs(){if(window.pdfjsLib)return Promise.resolve(window.pdfjsLib);if(pdfjsP)return pdfjsP;
  const bases=[PDFJS_Q,PDFJS_CDN,'./pdfjs/'].filter(Boolean); // hors connexion aussi : le CDN déjà utilisé est dans le cache du navigateur (un an)
  pdfjsP=(async()=>{for(const b of bases){try{await loadScript(b+'pdf.min.js');if(window.pdfjsLib){window.pdfjsLib.GlobalWorkerOptions.workerSrc=new URL(b+'pdf.worker.min.js',location.href).href;return window.pdfjsLib;}}catch(e){}}pdfjsP=null;throw new Error('moteur PDF non chargé');})();return pdfjsP;}
// rendu net pour décalquer : côté le plus long ~6 000 px (≤ 4 000 sur un petit écran : mémoire du téléphone), surface plafonnée (iPhone / iPad : 16 Mpx par canevas)
const smallScreen=()=>{try{return Math.min(screen.width||9999,screen.height||9999)<=820||(navigator.deviceMemory&&navigator.deviceMemory<=2);}catch(e){return false;}};
const isIOS=()=>/iPad|iPhone|iPod/.test(navigator.userAgent)||(navigator.platform==='MacIntel'&&navigator.maxTouchPoints>1);
export const pdfMaxSide=()=>smallScreen()?4000:6000;
async function renderPdfPage(pdf,n,N,name){const page=await pdf.getPage(n);const vp1=page.getViewport({scale:1});let sc=pdfMaxSide()/Math.max(vp1.width,vp1.height);const area=isIOS()?16e6:36e6;if(vp1.width*vp1.height*sc*sc>area)sc=Math.sqrt(area/(vp1.width*vp1.height));
  const vp=page.getViewport({scale:sc});const c=document.createElement('canvas');c.width=Math.max(1,Math.round(vp.width));c.height=Math.max(1,Math.round(vp.height));
  await page.render({canvasContext:c.getContext('2d'),viewport:vp}).promise;const src=c.toDataURL('image/jpeg',.88);const pw=c.width,ph=c.height;c.width=c.height=1;try{page.cleanup();}catch(e){}
  const base=String(name||'plan.pdf').replace(/\.pdf$/i,'');const plan=A.addImagePlan(src,{name:N>1?`${base} — p. ${n}`:base+'.pdf',pw,ph});
  Object.assign(plan,{from:'pdf',page:n,pages:N,pageW_mm:+(vp1.width*25.4/72).toFixed(2),pageH_mm:+(vp1.height*25.4/72).toFixed(2)}); // taille RÉELLE de la page (1 pt = 25,4/72 mm) : base de l'échelle 1/N
  return plan;}
// un PDF → un plan par page choisie (plusieurs pages : fenêtre de choix, avec l'échelle si elle est connue)
// échecs prévus (hors connexion, mot de passe, fichier abîmé) : un message clair, rien en console, rien d'ajouté
export async function addPdf(f){A.progress(`Lecture de ${f.name}…`,0);let lib;const fail=t=>{A.progress(null);alert(f.name+' : '+t);return [];};
  try{lib=await loadPdfJs();}catch(e){return fail(navigator.onLine===false?'pas de réseau : le moteur PDF n\'a pas pu être chargé — réessaie connecté (ou exporte la page en PNG / JPG)':'moteur PDF indisponible — réessaie plus tard (ou exporte la page en PNG / JPG)');}
  let pdf;try{pdf=await lib.getDocument({data:new Uint8Array(await f.arrayBuffer())}).promise;}catch(e){return fail(e&&e.name==='PasswordException'?'PDF protégé par un mot de passe : enregistre une copie sans mot de passe, puis ＋ Plan':'PDF illisible (fichier abîmé ?) : ouvre-le et réenregistre-le, ou exporte la page en PNG / JPG');}
  const N=pdf.numPages;let pages=[1],ech=null;
  if(N>1){A.progress(null);const r=await choosePages(pdf,f.name);if(!r||!r.pages.length){try{pdf.destroy();}catch(e){}flash('Import du PDF annulé');return [];}pages=r.pages;ech=r.ech;}
  const out=[];try{for(let i=0;i<pages.length;i++){A.progress(`${f.name} : page ${pages[i]} (${i+1}/${pages.length})…`,i/pages.length);await new Promise(r=>setTimeout(r,0));const pl=await renderPdfPage(pdf,pages[i],N,f.name);if(pl){if(ech)applyEch(pl,ech,null,true);out.push(pl);}}}
  finally{A.progress(null);try{pdf.destroy();}catch(e){}}
  if(ech&&out.length)A.renderBg(); // échelle appliquée après l'ajout : le dessin du plan suit
  if(out.length)flash(`${out.length>1?out.length+' pages ajoutées':'Page PDF ajoutée'} (${paperName(out[0].pageW_mm,out[0].pageH_mm)})${ech?' à l\'échelle 1/'+ech:' — échelle : 1/N dans l\'onglet Fond (bouton 1/N), ou 📏 deux points'}`);
  return out;}
let pdfPending=null;
function choosePages(pdf,name){return new Promise(res=>{const N=pdf.numPages;if(pdfPending)pdfPending.res(null);
  openModal(`<div class="t2"><h3 style="margin:0 0 6px">📄 ${esc(name)} — ${N} pages</h3><div class="muted">Une page = un plan (calque à caler). Coche les pages à importer.</div><div class="row"><button class="btn sm" data-t2="pdfAll">Toutes</button><button class="btn sm" data-t2="pdfNone">Aucune</button></div>
    <div class="t2pages">${Array.from({length:N},(_,i)=>`<label><input type="checkbox" data-pg="${i+1}" ${i===0?'checked':''}><canvas data-th="${i+1}" width="90" height="64"></canvas><span>p. ${i+1}<br><span class="muted" data-fmt="${i+1}"></span></span></label>`).join('')}</div>
    <label class="muted" style="display:flex;gap:4px;align-items:center;flex-wrap:wrap">échelle des pages cochées, si elle est connue (cartouche) : 1/<input class="f" data-t2="pdfEch" type="number" min="1" step="1" inputmode="numeric" placeholder="200" style="width:76px"></label>
    <div class="actions"><button class="btn" data-t2="pdfCancel">Annuler</button><button class="btn on" data-t2="pdfOk">Importer les pages cochées</button></div></div>`);
  const tok=pdfPending={res,pdf};(async()=>{for(let n=1;n<=N&&pdfPending===tok;n++){try{const page=await pdf.getPage(n);const v1=page.getViewport({scale:1});const fe=$(`#modalBody [data-fmt="${n}"]`);if(fe)fe.textContent=paperName(v1.width*25.4/72,v1.height*25.4/72);
      const c=$(`#modalBody canvas[data-th="${n}"]`);if(!c||pdfPending!==tok)continue;const sc=120/Math.max(v1.width,v1.height);const vp=page.getViewport({scale:sc});c.width=Math.round(vp.width);c.height=Math.round(vp.height);await page.render({canvasContext:c.getContext('2d'),viewport:vp}).promise;}catch(e){}}})();});}
/* image : la résolution (dpi) écrite dans le fichier (JPEG JFIF / EXIF, PNG pHYs) et la largeur d'origine sont gardées pour l'échelle 1/N */
function natW(f){return new Promise((res,rej)=>{const u=URL.createObjectURL(f);const im=new Image();im.onload=()=>{URL.revokeObjectURL(u);res(im.naturalWidth||im.width);};im.onerror=()=>{URL.revokeObjectURL(u);rej(new Error('image illisible'));};im.src=u;});}
export async function addImage(f){let meta=null;try{meta=imageDpi(new Uint8Array(await f.slice(0,262144).arrayBuffer()));}catch(e){}
  let srcW=0;try{srcW=await natW(f);}catch(e){alert(f.name+' : image illisible (format non pris en charge par ce navigateur ?) : convertis-la en PNG ou JPG');return null;}
  const p=await A.addImageFile(f);if(!p)return p;p.from='image';if(srcW)p.srcW=srcW;if(meta&&meta.dpi){p.dpi=meta.dpi;p.dpiSrc=meta.src;}return p;}
/* ================= échelle 1/N (« valeurs ») ================= */
const fmtN=n=>n>=20?String(Math.round(n)):fmt(+n.toFixed(1));
export const echTxt=N=>N>0?`1 cm sur le plan = ${fmt(N/100)} m`:'1 cm sur le plan = N/100 m';
export function applyEch(p,N,dpi,quiet){N=+String(N??'').replace(',','.');if(!p||p.kind!=='image'){flash('L\'échelle 1/N vaut pour un plan PDF ou image (un DXF est déjà en mètres)');return null;}
  if(!(N>=1&&N<=100000)){flash('Échelle : un nombre entre 1 et 100 000 (1/200 → 200)');return null;}
  let d=null;if(!(+p.pageW_mm>0)){d=+String(dpi||p.dpi||300).replace(',','.');if(!(d>=10&&d<=20000)){flash('Résolution : entre 10 et 20 000 dpi');return null;}if(d!==p.dpi){p.dpi=d;p.dpiSrc='saisie';}}
  const k=planScaleK(p,N,d);if(!k)return null;const b=A.planTight(p)||[0,0,p.image.pw,p.image.ph];
  p.transform=tfScaleAbout(p.transform,[(b[0]+b[2])/2,(b[1]+b[3])/2],k);p.ech=N;p.geo='manual';p._lastKey=null; // le centre et la rotation ne bougent pas
  if(!quiet){A.renderBg();A.saveBg();A.saveBgIDB();if(S().tab==='fond')A.renderPanel();const m=$('#modalBody .t2ech');if(m&&$('#modal').classList.contains('show'))openEchModal(p.id);flash(`« ${p.name||p.id} » à l'échelle 1/${N} : ${fmt(p.image.pw*k)} m de large — ${echTxt(N)}`);}
  return p.transform;}
// ligne « échelle » d'un plan PDF / image, à côté de l'opacité (onglet Fond, fenêtre 1/N) : « à la main » (📏 2 points) ou « valeurs » (1/N, + dpi pour une image)
export function scaleRow(p,inModal){if(!p||p.kind!=='image')return '';const id=esc(p.id);const pdf=+p.pageW_mm>0;const Nc=pdf||p.dpi?planScaleN(p,pdf?null:p.dpi):null; /* échelle actuelle : seulement si la taille réelle est connue (PDF, ou dpi lu / saisi) */const N0=p.ech&&Nc&&Math.abs(Nc/p.ech-1)<0.005?p.ech:'';
  const src=pdf?`PDF${p.pages>1?` p. ${p.page}/${p.pages}`:''} · ${paperName(p.pageW_mm,p.pageH_mm)}`:p.dpi?(p.dpiSrc==='saisie'?`résolution ${fmt(p.dpi)} dpi (saisie)`:`résolution ${fmt(p.dpi)} dpi lue dans le fichier`):'pas de résolution dans le fichier : 300 dpi proposé';
  return `<div class="t2ech" data-plan="${id}"><span class="muted">échelle</span><button class="btn sm" ${inModal?'data-t2="echMain"':'data-act="plScale"'} data-plan="${id}" title="deux points du plan + la distance réelle">📏 à la main</button><span class="muted">ou</span><span style="white-space:nowrap">1/<input class="f" data-t2="echN" type="number" min="1" step="1" inputmode="numeric" value="${N0}" placeholder="200"></span>${pdf?'':`<span style="white-space:nowrap">à <input class="f" data-t2="echDpi" type="number" min="10" step="1" inputmode="numeric" value="${p.dpi||300}" style="width:58px"> dpi</span>`}<button class="btn sm" data-t2="echGo" data-plan="${id}">Appliquer</button>
    <div class="muted t2small" style="flex-basis:100%">${src}${Nc?` · actuellement ≈ 1/${fmtN(Nc)}`:''} · <span data-t2="echTxt">${echTxt(+N0||0)}</span></div>${pdf?'':'<div class="muted t2small" style="flex-basis:100%">photo d\'un plan : préfère 📏 2 points (la résolution d\'une photo ne dit pas l\'échelle)</div>'}</div>`;}
// bouton « 1/N » du bandeau : la même chose dans une fenêtre (téléphone : l'onglet Fond n'est pas affiché)
export function openEchModal(id){const P=A.bgPlans().filter(p=>p.kind==='image');if(!P.length){flash('Pas de plan PDF ou image : ＋ Plan d\'abord (un DXF est déjà en mètres)');return;}const a=A.bgActive();const p=P.find(x=>x.id===id)||(a&&a.kind==='image'?a:P[P.length-1]);
  openModal(`<div class="t2"><h3 style="margin:0 0 6px">Échelle d'un plan</h3><label class="muted">Plan</label><select class="f" data-t2="echPlan" style="width:100%">${P.map(x=>`<option value="${esc(x.id)}" ${x===p?'selected':''}>${x.from==='pdf'?'📄':'🖼'} ${esc(x.name||x.id)}</option>`).join('')}</select>${scaleRow(p,true)}<div class="actions"><button class="btn" data-t2="close">Fermer</button></div></div>`);}
/* ================= lignes ↔ plans ================= */
// plan visible le plus haut sous un point (dans l'emprise serrée du plan), sinon null
export function planUnder(pt){if(!pt)return null;const P=A.bgPlans();for(let i=P.length-1;i>=0;i--){const p=P[i];if(!A.planVisible(p))continue;const b=A.planTight(p);if(!b)continue;const q=tfApply(tfInverse(p.transform),pt);if(q[0]>=b[0]&&q[0]<=b[2]&&q[1]>=b[1]&&q[1]<=b[3])return p.id;}return null;}
// plan d'une ligne : celui retenu à sa création (l.plan), sinon (ligne d'avant) celui sous son 1er sommet
export function planOf(l){if(!l)return null;if('plan' in l)return l.plan&&A.bgPlan(l.plan)?l.plan:null;return planUnder(l.pts&&l.pts[0]);}
// nouvelle ligne : le plan visible le plus haut sous son 1er sommet, sinon le plan actif de l'onglet Fond, sinon aucun
export function tagLine(l){if(A&&l&&!('plan' in l)){const a=A.bgActive();l.plan=planUnder(l.pts&&l.pts[0])||(a?a.id:null);}return l;}
const linesOn=id=>S().lines.filter(l=>planOf(l)===id);
export function planInfo(p){if(!A)return '';const n=linesOn(p.id).length;return n?` · 🔗 ${n} ligne${n>1?'s':''}`:'';}
function openLinks(){const L=S().lines,P=A.bgPlans();if(!L.length){flash('Aucune ligne tracée');return;}
  openModal(`<div class="t2"><h3 style="margin:0 0 6px">🔗 Lignes ↔ plans</h3><div class="muted t2small">Chaque ligne retient le plan sur lequel elle a été dessinée : caler un plan sur la vue aérienne emmène ses lignes ; caler une ligne emmène son plan s'il n'a qu'elle. « auto » : ligne d'avant, rattachée au plan sous son départ.</div>
    <table style="margin-top:6px"><tr><th>Ligne</th><th>Plan</th></tr>${L.map(l=>{const cur=planOf(l);return `<tr><td>${esc(l.name)}${l.parent?' <span class="muted">↳</span>':''}</td><td><select class="f" data-t2="lnkPlan" data-line="${esc(l.id)}"><option value="">— aucun —</option>${P.map(p=>`<option value="${esc(p.id)}" ${cur===p.id?'selected':''}>${p.kind==='dxf'?'📐':p.from==='pdf'?'📄':'🖼'} ${esc(p.name||p.id)}</option>`).join('')}</select>${'plan' in l?'':' <span class="muted">auto</span>'}</td></tr>`;}).join('')}</table>
    <div class="row"><button class="btn sm" data-t2="lnkAuto" title="chaque ligne est rattachée au plan visible sous son premier sommet">↺ Chaque ligne → le plan sous son départ</button></div><div class="actions"><button class="btn on" data-t2="close">Fermer</button></div></div>`);}
/* ================= ⌖ calage sur la vue aérienne ================= */
const appParts=()=>{const r=S().siteRef;const f=r&&r.full;return !!(r&&(r.stock||r.hydro||(f&&(f.conv||f.fourniture||(Array.isArray(f.ann)&&f.ann.length)))));}; // chantier déjà vécu dans l'appli
function selLine(){const s=S().sel;if(!s)return null;let id=s.kind==='line'?s.id:s.line;if(!id&&s.kind==='weld')Object.values(S().built||{}).forEach(B=>['A','R'].forEach(c=>{const w=B&&B[c]&&B[c].welds.find(y=>y.id===s.id);if(w)id=w.line;}));return id?S().lines.find(x=>x.id===id)||null:null;}
/* ce qui bouge : spec = {what:'line'|'plan'|'all', line, plan} → {ids (lignes), plans, note}
   • line : la ligne et ses antennes (une antenne → sa ligne racine, sinon elle se décrocherait de son té) ;
   • plan : le plan + ses lignes (+ leurs antennes) ; une ligne du plan accrochée à une ligne restée en place reste accrochée ;
   • all : tout. Un plan suit quand TOUTES ses lignes bougent (le plan d'une ligne seule suit, celui de plusieurs lignes non). */
export function movedSet(spec){const L=S().lines;const by=new Map(L.map(l=>[l.id,l]));const note=[];let ids=new Set(),plans=[];
  const tree=r=>{const out=new Set();const walk=l=>{if(!l||out.has(l.id))return;out.add(l.id);L.filter(x=>x.parent&&x.parent.line===l.id).forEach(walk);};walk(r);return out;};
  if(spec.what==='all'){L.forEach(l=>ids.add(l.id));plans=A.bgPlans().slice();}
  else if(spec.what==='line'){const l=by.get(spec.line);if(l){let r=l,g=0;while(r.parent&&by.get(r.parent.line)&&g++<200)r=by.get(r.parent.line);if(r!==l)note.push(`« ${l.name} » est une antenne de « ${r.name} » : la ligne et toutes ses antennes bougent`);ids=tree(r);}}
  else if(spec.what==='plan'){const p=A.bgPlan(spec.plan);if(p){plans=[p];const set=new Set(L.filter(l=>planOf(l)===p.id).map(l=>l.id));let ch=true;while(ch){ch=false;[...set].forEach(id=>{const l=by.get(id);if(l&&l.parent&&!set.has(l.parent.line)){set.delete(id);ch=true;note.push(`« ${l.name} » reste accrochée à sa ligne d'un autre plan`);}});}
    [...set].forEach(id=>tree(by.get(id)).forEach(x=>set.add(x)));ids=set;}}
  if(spec.what!=='all')A.bgPlans().forEach(p=>{if(plans.includes(p))return;const mine=L.filter(l=>planOf(l)===p.id);if(!mine.length||!mine.some(l=>ids.has(l.id)))return;if(mine.every(l=>ids.has(l.id)))plans.push(p);else note.push(`plan « ${p.name||p.id} » pas déplacé : ${mine.filter(l=>!ids.has(l.id)).length} autre(s) ligne(s) y restent`);});
  return {ids,plans,note};}
export function openCal(){if(!AER.geo){openAerModal('Pour caler, il faut d\'abord la vue aérienne : donne une adresse.');return;}const L=S().lines,P=A.bgPlans();if(!L.length&&!P.length){flash('Rien à caler : trace une ligne ou ajoute un plan');return;}
  const sl=selLine();const act=A.bgActive();const def=sl?'line':P.length?'plan':'all';const tr=sl?movedSet({what:'line',line:sl.id}):null;
  openModal(`<div class="t2"><h3 style="margin:0 0 6px">⌖ Caler sur la vue aérienne</h3><div class="muted t2small">Les lignes bougent d'un bloc (pièces et soudures recalculées) ; leur plan suit. Annulable (↶ / Ctrl+Z).</div>
    <div class="t2opt"><b class="muted t2small">Ce qui bouge</b>
      <label><input type="radio" name="t2w" value="line" ${sl?'':'disabled'} ${def==='line'?'checked':''}> ${sl?`la ligne « ${esc(sl.name)} »${tr&&tr.ids.size>1?` et ${tr.ids.size-1===1?'son antenne':'ses '+(tr.ids.size-1)+' antennes'}`:''}`:'la ligne sélectionnée <span class="muted">(clique d\'abord une ligne)</span>'}</label>
      <label><input type="radio" name="t2w" value="plan" ${P.length?'':'disabled'} ${def==='plan'?'checked':''}> un plan et toutes ses lignes :</label>${P.length?`<select class="f" data-t2="calPlan" style="margin-left:26px;max-width:calc(100% - 26px)">${P.map(p=>{const n=linesOn(p.id).length;return `<option value="${esc(p.id)}" ${p===act?'selected':''}>${p.kind==='dxf'?'📐':p.from==='pdf'?'📄':'🖼'} ${esc(p.name||p.id)} — ${n} ligne${n>1?'s':''}</option>`;}).join('')}</select>`:''}
      <label><input type="radio" name="t2w" value="all" ${def==='all'?'checked':''}> tout le tracé (${L.length} ligne${L.length>1?'s':''}, ${P.length} plan${P.length>1?'s':''}) d'un bloc</label>${appParts()?'<div class="note warn t2small">Chantier : ce qui est posé dans l\'appli (stock, hydraulique, notes…) ne suit pas une ligne ou un plan recalé seul. « Tout le tracé » ne déplace rien : c\'est la vue aérienne qui est recalée dessous.</div>':''}</div>
    <div class="t2opt"><b class="muted t2small">Repères</b>
      <label><input type="radio" name="t2n" value="1" checked> 1 point : translation (un groupe déjà calé entre lui)</label>
      <label><input type="radio" name="t2n" value="2"> 2 points : rotation + translation</label>
      <label style="margin-left:26px"><input type="checkbox" data-t2="calScale"> ajuster aussi l'échelle (un plan et ses lignes, 2 points)</label></div>
    <div class="row"><button class="btn sm" data-t2="linksOpen" title="à quel plan chaque ligne est rattachée">🔗 Lignes ↔ plans…</button><span class="muted t2small">astuce : ① sur l'objet, puis 📍 une adresse pour y aller, puis ②</span></div>
    <div class="actions"><button class="btn" data-t2="close">Annuler</button><button class="btn on" data-t2="calGo">Commencer</button></div></div>`);}
const STEPS=['① clique un point de l\'objet (sommet d\'une ligne, angle du plan…)','② clique sa place sur la vue aérienne (📍 pour aller à une adresse)','③ un 2e point de l\'objet, loin du premier','④ sa place sur la vue aérienne'];
const STEPS_C=['① un point de l\'objet','② sa place sur la photo','③ 2e point de l\'objet','④ sa place sur la photo'];
const calWhat=c=>c.spec.what==='line'?'la ligne':c.spec.what==='plan'?'du plan':'du tracé entier';
function showStep(){const c=S().calAer;if(!c)return;$('#hint').textContent=`⌖ Calage ${c.spec.what==='line'?'de '+calWhat(c):calWhat(c)} sur la vue aérienne — ${STEPS[c.pts.length]} (Échap : annuler)`;$('#hint').style.display='block';const t=calBar&&calBar.querySelector('.t2step');if(t)t.textContent='⌖ '+STEPS_C[c.pts.length];}
export function startCal(spec){if(!AER.geo){openAerModal('Pour caler, il faut d\'abord la vue aérienne : donne une adresse.');return false;}spec={what:spec.what||'all',line:spec.line,plan:spec.plan,n:spec.n===2?2:1,scale:!!spec.scale&&spec.what==='plan'&&spec.n===2};
  const set=movedSet(spec);if(!set.ids.size&&!set.plans.length){flash('Rien à caler');return false;}
  if(!AER.show)setShow(true);closeModal();A.setMode('calAer');S().calAer={spec,set,pts:[],cursor:null};$('#main').classList.add('trace');showStep();renderCal();if(calBar)calBar.style.display='block';
  if(set.note.length)setTimeout(()=>flash(set.note.join(' · ')),50);return true;}
// changement de mode (setMode → renderBgSel) : hors calage, plus de repères ni de bouton
export function onMode(){if(!A)return;const st=S();if(st.mode!=='calAer'){if(st.calAer)st.calAer=null;if(calBar)calBar.style.display='none';if(gCal&&gCal.firstChild)gCal.innerHTML='';}}
function snapObj(p,set){const k=S().view.k;const tol=10/k;let best=null;S().lines.forEach(l=>{if(!set.ids.has(l.id))return;l.pts.forEach(v=>{const d=Math.hypot(v[0]-p[0],v[1]-p[1]);if(d<tol&&(!best||d<best.d))best={d,q:v.slice()};});});return best?best.q:null;}
export function click(p){const st=S();const c=st.calAer;if(st.mode!=='calAer'||!c){A.setMode('select');return;}let q=p;if(c.pts.length%2===0){const s=snapObj(p,c.set);if(s)q=s;}c.pts.push(q);
  const n=c.spec.n===2?4:2;if(c.pts.length<n){showStep();renderCal();return;}
  const pairs=c.spec.n===2?[{from:c.pts[0],to:c.pts[1]},{from:c.pts[2],to:c.pts[3]}]:[{from:c.pts[0],to:c.pts[1]}];
  const R=calApply(c.spec,pairs,c.set);if(!R){flash('Repères confondus : recommence');c.pts=[];showStep();renderCal();return;}
  A.setMode('select');msg(R.msg);}
export function move(p){const c=S().calAer;if(c){c.cursor=p;renderCal();}}
// transformation : 1 point = translation ; 2 points = rotation + translation (au mieux sur les deux : milieux superposés), ou similitude exacte avec l'échelle
export function calTransform(pairs,scale){if(!pairs||!pairs.length)return null;if(pairs.length<2)return {tx:pairs[0].to[0]-pairs[0].from[0],ty:pairs[0].to[1]-pairs[0].from[1],rot:0,k:1};
  if(scale)return planSimilarity(pairs);const [P1,P2]=pairs.map(p=>p.from),[Q1,Q2]=pairs.map(p=>p.to);const dp=[P2[0]-P1[0],P2[1]-P1[1]],dq=[Q2[0]-Q1[0],Q2[1]-Q1[1]];if(Math.hypot(dp[0],dp[1])<1e-6||Math.hypot(dq[0],dq[1])<1e-6)return null;
  const th=Math.atan2(dq[1],dq[0])-Math.atan2(dp[1],dp[0]);const cs=Math.cos(th),sn=Math.sin(th);const pm=[(P1[0]+P2[0])/2,(P1[1]+P2[1])/2],qm=[(Q1[0]+Q2[0])/2,(Q1[1]+Q2[1])/2];let rot=th*180/Math.PI;rot=((rot+540)%360)-180;
  return {tx:qm[0]-(cs*pm[0]-sn*pm[1]),ty:qm[1]-(sn*pm[0]+cs*pm[1]),rot,k:1};}
function calApply(spec,pairs,set){const scale=!!(spec.scale&&spec.what==='plan'&&pairs.length>1);const T=calTransform(pairs,scale);if(!T||!isFinite(T.tx)||!isFinite(T.ty))return null;
  if(spec.what==='all')return calGeo(T,pairs);
  const R=applyTf(T,set);let m=`Calé sur la vue aérienne : ${R.nL} ligne${R.nL>1?'s':''}${R.nP?` et ${R.nP} plan${R.nP>1?'s':''}`:''} — ${pairs.length>1?`rotation ${fmt(+T.rot.toFixed(2))}°${scale?`, échelle ×${fmt(+T.k.toFixed(4))}`:''}`:`déplacement ${fmt(+Math.hypot(T.tx,T.ty).toFixed(2))} m`} (↶ pour annuler)`;
  if(pairs.length>1&&!scale){const dp=Math.hypot(pairs[1].from[0]-pairs[0].from[0],pairs[1].from[1]-pairs[0].from[1]),dq=Math.hypot(pairs[1].to[0]-pairs[0].to[0],pairs[1].to[1]-pairs[0].to[1]);const e=Math.abs(dq-dp);if(dp>0&&e/dp>0.02)m+=` · ⚠ les repères diffèrent de ${fmt(+e.toFixed(1))} m (${fmt(+(e/dp*100).toFixed(1))} %) : plan pas à l'échelle ? (« un plan et ses lignes » + « ajuster l'échelle »)`;}
  if(set.note.length)m+=' · '+set.note.join(' · ');return {T,msg:m,...R};}
/* applique la transformation T (monde → monde) aux lignes de set.ids (sommets ; PK des pièces mis à l'échelle si T.k ≠ 1) et aux plans de set.plans (leur transform composée).
   Avant : snapshot() du traceur (annulable) ; les lignes d'avant sans plan retenu sont rattachées au plan sous leur 1er sommet (premier calage). */
export function applyTf(T,set,o={}){const st=S();st.lines.forEach(l=>{if(!('plan' in l))l.plan=planUnder(l.pts&&l.pts[0]);});
  const ids=[...set.ids];const sigB=sig(ids),pB=plansOf(set.plans);const sp=siteParts(set.ids),xB=partsOf(sp);if(ids.length)A.snapshot();const k=+T.k||1;
  sp.m.forEach(x=>{x.axis=x.axis.map(p=>tfApply(T,p));});sp.t.forEach(it=>{it.geo=it.geo.map(sg=>Array.isArray(sg)?sg.map(p=>Array.isArray(p)?tfApply(T,p):p):sg);}); // chantier : tracé marché figé et TS des lignes recalées
  st.lines.forEach(l=>{if(!set.ids.has(l.id))return;l.pts=l.pts.map(p=>tfApply(T,p));if(Math.abs(k-1)>1e-12){(l.specials||[]).forEach(sp=>{if(isFinite(sp.m))sp.m*=k;if(sp.mR!=null&&isFinite(sp.mR))sp.mR*=k;});(l.cuts||[]).forEach(ct=>{ct.m*=k;});(l.drapeaux||[]).forEach(dp=>{dp.m0*=k;dp.m1*=k;});if(l.parent&&set.ids.has(l.parent.line))l.parent.m*=k;}});
  set.plans.forEach(p=>{p.transform=tfCompose(T,tfNorm(p.transform));p.geo=o.geo&&o.plan===p.id?o.geo:'aerien';p._lastKey=null;});
  if(AER.geo&&AER.geo.pts){delete AER.geo.pts;saveAer();} // repères d'un ancien calage de l'appli : plus sur le réseau qui vient de bouger (l'épingle de la carte prend le centre du réseau)
  if(ids.length)A.rebuild();A.renderBg();A.saveBg();if(set.plans.length)A.saveBgIDB();if(st.tab==='fond')A.renderPanel();
  if(ids.length){CALH.push({ids,sigB,sigA:sig(ids),pB,pA:plansOf(set.plans),sp,xB,xA:partsOf(sp),st:'A'});if(CALH.length>30)CALH.shift();}
  else if(set.plans.length){const pA=plansOf(set.plans);xPush({ok:()=>pA.every(x=>{const p=A.bgPlan(x.id);return p&&JSON.stringify(tfNorm(p.transform))===JSON.stringify(x.t);}),undo:()=>{setPlans(pB);A.renderBg();A.saveBg();A.saveBgIDB();if(S().tab==='fond')A.renderPanel();flash('Calage du plan annulé');}});} // plan sans ligne : annulable aussi
  return {nL:ids.length,nP:set.plans.length};}
/* « tout le tracé » : rien ne bouge dans le tracé (lignes, plans, soudures, tracé marché, TS, ce qui est posé dans l'appli) — c'est le GÉORÉFÉRENCEMENT qui est recalé :
   Lambert'(p) = Lambert(T(p)) → le point ① de l'objet tombe, sur la photo, là où était le point ②. La vue suit (le dessin a l'air de bouger, la photo reste en place).
   Annulable : ↶ / Ctrl+Z tant que les lignes n'ont pas changé depuis (pile XH, avant l'annulation du traceur). */
const D2R=Math.PI/180;const XH=[]; // calages sans ligne déplacée : annulés par ↶ / Ctrl+Z tant que les lignes n'ont pas bougé depuis (avant l'annulation du traceur)
export function geoCompose(g,T){const f=g.aff;const c=Math.cos(T.rot*D2R)*T.k,s=Math.sin(T.rot*D2R)*T.k;return {...g,aff:{a:f.a*c+f.b*s,b:-f.a*s+f.b*c,c:f.c*c+f.d*s,d:-f.c*s+f.d*c,e:f.a*T.tx+f.b*T.ty+f.e,f:f.c*T.tx+f.d*T.ty+f.f}};}
function calGeo(T,pairs){const st=S();const gB=JSON.parse(JSON.stringify(AER.geo)),vB={...st.view};const g=geoCompose(AER.geo,T);g.src='traceur';g.at=new Date().toISOString();delete g.pts;delete g.plan;AER.geo=g;saveAer();
  const P1=pairs[0].from,Q1=pairs[0].to;st.view.tx+=(Q1[0]-P1[0])*st.view.k;st.view.ty+=(Q1[1]-P1[1])*st.view.k;A.applyView();A.render();A.save();renderTiles(true);refreshUI();
  const gA=JSON.parse(JSON.stringify(g));xPush({ok:()=>!!AER.geo&&JSON.stringify(AER.geo.aff)===JSON.stringify(gA.aff),undo:()=>{AER.geo=gB;saveAer();S().view={...vB};A.applyView();A.render();A.save();renderTiles(true);refreshUI();flash('Calage du tracé entier annulé');}});
  return {T,nL:st.lines.length,nP:A.bgPlans().length,msg:`Tracé entier calé sur la vue aérienne — ${pairs.length>1?`rotation ${fmt(+T.rot.toFixed(2))}°`:`décalage ${fmt(+Math.hypot(T.tx,T.ty).toFixed(2))} m`} : c'est le géoréférencement qui a bougé, rien dans le tracé (↶ pour annuler)`};}
function xPush(e){e.sig=sig(S().lines.map(l=>l.id));XH.push(e);if(XH.length>10)XH.shift();}
function xUndoable(){const h=XH[XH.length-1];return h&&sig(S().lines.map(l=>l.id))===h.sig&&h.ok()?h:null;}
function xUndo(){const h=XH.pop();if(h)h.undo();}
/* annuler / rétablir un calage : le snapshot du traceur ne garde que les LIGNES — quand elles reviennent exactement à leur état d'avant (ou d'après) un calage,
   les plans déplacés avec elles reprennent leur calage d'avant (ou d'après). Signature = 1er et dernier sommets des lignes déplacées. */
const CALH=[];
function sig(ids,by){by=by||new Map(S().lines.map(l=>[l.id,l]));return ids.map(id=>{const l=by.get(id);if(!l||!l.pts||!l.pts.length)return id+'∅';const a=l.pts[0],b=l.pts[l.pts.length-1];return id+':'+l.pts.length+':'+a[0].toFixed(3)+','+a[1].toFixed(3)+','+b[0].toFixed(3)+','+b[1].toFixed(3);}).join('|');}
const plansOf=P=>P.map(p=>({id:p.id,t:{...tfNorm(p.transform)},geo:p.geo||null}));
// tracé marché figé (siteRef.marche) et repères des TS (siteRef.ts) des lignes recalées : ils suivent le calage (et son annulation)
function siteParts(ids){const r=S().siteRef;const o={m:[],t:[]};if(!r)return o;if(r.marche&&Array.isArray(r.marche.lines))r.marche.lines.forEach(x=>{if(x&&ids.has(x.id)&&Array.isArray(x.axis))o.m.push(x);});
  if(r.ts&&Array.isArray(r.ts.items))r.ts.items.forEach(it=>{if(it&&ids.has(it.line)&&Array.isArray(it.geo)&&it.geo.length)o.t.push(it);});return o;}
const partsOf=sp=>({m:sp.m.map(x=>JSON.stringify(x.axis)),t:sp.t.map(it=>JSON.stringify(it.geo))});
function setParts(sp,x){if(!sp)return;sp.m.forEach((m,i)=>{m.axis=JSON.parse(x.m[i]);});sp.t.forEach((it,i)=>{it.geo=JSON.parse(x.t[i]);});}
function setPlans(arr){let n=0;arr.forEach(x=>{const p=A.bgPlan(x.id);if(!p)return;p.transform={...x.t};p.geo=x.geo;p._lastKey=null;n++;});return n;}
function syncUndo(){if(!CALH.length)return;const by=new Map(S().lines.map(l=>[l.id,l]));for(let i=CALH.length-1;i>=0;i--){const h=CALH[i];if(!h.ids.length)continue;const s=sig(h.ids,by);
    if(h.st==='A'&&s===h.sigB&&s!==h.sigA){h.st='B';setParts(h.sp,h.xB);if(setPlans(h.pB)){A.renderBg();A.saveBg();}if(h.sp&&(h.sp.m.length||h.sp.t.length)){A.render();A.save();}break;}
    if(h.st==='B'&&s===h.sigA&&s!==h.sigB){h.st='A';setParts(h.sp,h.xA);if(setPlans(h.pA)){A.renderBg();A.saveBg();}if(h.sp&&(h.sp.m.length||h.sp.t.length)){A.render();A.save();}break;}}}
// repères du calage (①③ sur l'objet, ②④ sur la vue aérienne) et ce qui bouge (surligné)
export function renderCal(){if(!gCal)return;const st=S();const c=st.calAer;if(st.mode!=='calAer'||!c){if(gCal.firstChild)gCal.innerHTML='';return;}const k=st.view.k;let h='';
  c.set.ids.forEach(id=>{const l=st.lines.find(x=>x.id===id);if(!l||!l.pts||l.pts.length<2)return;h+=`<path d="M${l.pts.map(p=>p[0]+' '+p[1]).join('L')}" fill="none" stroke="#ff9f1c" stroke-width="${10/k}" stroke-opacity=".4" stroke-linecap="round" stroke-linejoin="round"/>`;});
  c.set.plans.forEach(p=>{const b=A.planTight(p);if(!b)return;const cs=[[b[0],b[1]],[b[2],b[1]],[b[2],b[3]],[b[0],b[3]]].map(q=>tfApply(p.transform,q));h+=`<path d="M${cs.map(q=>q[0]+' '+q[1]).join('L')}Z" fill="none" stroke="#ff9f1c" stroke-width="${2.5/k}" stroke-dasharray="${9/k} ${5/k}"/>`;});
  c.pts.forEach((q,i)=>{const col=i%2?'#0ca30c':'#d9480f';if(i%2){const p0=c.pts[i-1];h+=`<line x1="${p0[0]}" y1="${p0[1]}" x2="${q[0]}" y2="${q[1]}" stroke="${col}" stroke-width="${2/k}"/>`;}h+=`<circle cx="${q[0]}" cy="${q[1]}" r="${8/k}" fill="#fff" fill-opacity=".6" stroke="${col}" stroke-width="${2.5/k}"/><text x="${q[0]+10/k}" y="${q[1]-6/k}" font-size="${13/k}" font-weight="700" fill="${col}" stroke="#fff" stroke-width="${3/k}" paint-order="stroke" font-family="system-ui,sans-serif">${'①②③④'[i]}</text>`;});
  if(c.cursor&&c.pts.length%2===1){const p0=c.pts[c.pts.length-1];h+=`<line x1="${p0[0]}" y1="${p0[1]}" x2="${c.cursor[0]}" y2="${c.cursor[1]}" stroke="#0ca30c" stroke-width="${1.5/k}" stroke-dasharray="${6/k} ${4/k}"/>`;}
  gCal.innerHTML=h;}
/* ================= DXF géoréférencés ================= */
// transform qui met un plan DXF à sa VRAIE position dans le repère du tracé (son système Lambert → celui du tracé), ou null (pas de vue aérienne, DXF pas en Lambert)
export function dxfTrueTf(plan){if(!AER.geo||!plan||plan.kind!=='dxf'||!plan.origin)return null;const bb=A.planTight(plan)||plan.bbox;if(!bb)return null;const src=geoOfOrigin(plan.origin,[(bb[0]+bb[2])/2,(bb[1]+bb[3])/2]);if(!src)return null;
  let P1=[bb[0],bb[1]],P2=[bb[2],bb[3]];if(Math.hypot(P2[0]-P1[0],P2[1]-P1[1])<1)P2=[P1[0]+100,P1[1]+100];
  let t;try{t=planSimilarity([{from:P1,to:geoMapPoint(src,AER.geo,P1)},{from:P2,to:geoMapPoint(src,AER.geo,P2)}]);}catch(e){return null;}if(!t||![t.tx,t.ty,t.rot,t.k].every(isFinite))return null;
  if(Math.abs(t.rot)<1e-7&&Math.abs(t.k-1)<1e-9&&Math.abs(t.tx)<1e-6&&Math.abs(t.ty)<1e-6)return {tx:0,ty:0,rot:0,k:1}; // même repère : identité exacte
  return t;}
// import d'un DXF avec une vue aérienne : s'il est géoréférencé, il se place DIRECTEMENT à sa vraie position (« calé par ses coordonnées ») ; sinon rien (posé à côté, à caler comme une image)
export function placeDxf(plan){if(!A)return false;const t=dxfTrueTf(plan);if(!t)return false;plan.transform=t;plan.geo='coords';plan._lastKey=null;return true;}
const tfFar=(a,b,box)=>{if(!box)return true;const cs=[[box[0],box[1]],[box[2],box[3]]];return cs.some(c=>{const p=tfApply(a,c),q=tfApply(b,c);return Math.hypot(p[0]-q[0],p[1]-q[1])>0.05;});};
// « 📍 vraie position » d'un DXF déjà là : le plan ET ses lignes (dessinées dessus) y vont ensemble — annulable
export function placeDxfTrue(id){const p=A.bgPlan(id);const t=dxfTrueTf(p);if(!t){flash('Ce DXF n\'est pas en coordonnées Lambert (ou pas de vue aérienne) : cale-le à la main (⌖, ✥, ⟲)');return null;}
  const T=tfCompose(t,tfInverse(tfNorm(p.transform)));const set=movedSet({what:'plan',plan:id});const R=applyTf(T,set,{geo:'coords',plan:id});flash(`« ${p.name||p.id} » à sa vraie position (${crsName(geoOfOrigin(p.origin,[0,0])?.crs||'')})${R.nL?` avec ${R.nL} ligne${R.nL>1?'s':''}`:''} (↶ pour annuler)`);return p.transform;}
// boutons de la carte d'un plan (onglet Fond) : ordre (dessus / dessous), vraie position d'un DXF géoréférencé
export function planBtns(p){if(!A)return '';const id=esc(p.id);let h=`<button class="btn sm" data-t2="plUp" data-plan="${id}" title="mettre ce plan au-dessus des autres">▲</button><button class="btn sm" data-t2="plDown" data-plan="${id}" title="mettre ce plan en dessous">▼</button>`;
  if(p.kind==='dxf'&&AER.geo){const t=dxfTrueTf(p);if(t&&tfFar(t,tfNorm(p.transform),A.planTight(p)))h+=`<button class="btn sm" data-t2="dxfTrue" data-plan="${id}" title="DXF en coordonnées Lambert : le placer à sa vraie position sur la vue aérienne (ses lignes suivent)">📍 vraie position</button>`;}
  return h;}
function movePlan(id,dir){const b=S().bg;if(!b)return;const i=b.plans.findIndex(p=>p.id===id);const j=i+dir;if(i<0||j<0||j>=b.plans.length)return;const [p]=b.plans.splice(i,1);b.plans.splice(j,0,p);A.renderBg();A.saveBg();A.saveBgIDB();if(S().tab==='fond')A.renderPanel();}
/* ================= événements (onglet Fond, fenêtres) ================= */
function onClick(e){const el=e.target.closest('[data-t2]');if(!el)return;const k=el.dataset.t2;if(e.target.tagName==='INPUT'||e.target.tagName==='SELECT')return;if(el.tagName!=='BUTTON')return;e.stopPropagation();
  const box=el.closest('.t2aer');const id=el.dataset.plan;
  if(k==='close'){closeModal();return;}
  if(k==='aerGo'){const i=box&&box.querySelector('[data-t2="aerAddr"]');const inModal=$('#modalBody').contains(el);searchAddr(i?i.value:'').then(r=>{if(r&&r.ok&&inModal)closeModal();});return;}
  if(k==='aerForget'){if(confirm('Retirer la vue aérienne (le géoréférencement) de ce tracé ?\nLes lignes et les plans restent où ils sont.'))forget();return;}
  if(k==='calOpen'){openCal();return;}
  if(k==='linksOpen'){openLinks();return;}
  if(k==='calGo'){const m=$('#modalBody');const w=(m.querySelector('input[name="t2w"]:checked')||{}).value||'all';const n=+((m.querySelector('input[name="t2n"]:checked')||{}).value||1);const sl=selLine();const pl=(m.querySelector('[data-t2="calPlan"]')||{}).value;const sc=!!(m.querySelector('[data-t2="calScale"]')||{}).checked;startCal({what:w,line:sl&&sl.id,plan:pl,n,scale:sc});return;}
  if(k==='lnkAuto'){S().lines.forEach(l=>{l.plan=planUnder(l.pts&&l.pts[0]);});A.save();openLinks();if(S().tab==='fond')A.renderPanel();flash('Chaque ligne rattachée au plan sous son départ');return;}
  if(k==='echGo'){const row=el.closest('.t2ech');const N=row&&row.querySelector('[data-t2="echN"]');const d=row&&row.querySelector('[data-t2="echDpi"]');applyEch(A.bgPlan(id),N?N.value:'',d?d.value:null);return;}
  if(k==='echMain'){const b=A.bgObj();b.active=id;A.renderBg();A.bgToolsSync();closeModal();A.setMode('scale');return;}
  if(k==='pdfAll'||k==='pdfNone'){$$('#modalBody input[data-pg]').forEach(c=>{c.checked=k==='pdfAll';});return;}
  if(k==='pdfOk'||k==='pdfCancel'){const r=pdfPending;pdfPending=null;const pages=$$('#modalBody input[data-pg]').filter(c=>c.checked).map(c=>+c.dataset.pg);const N=+String(($('#modalBody [data-t2="pdfEch"]')||{}).value||'').replace(',','.');closeModal();if(r)r.res(k==='pdfOk'?{pages,ech:N>=1&&N<=100000?N:null}:null);return;}
  if(k==='dxfTrue'){placeDxfTrue(id);return;}
  if(k==='plUp'||k==='plDown'){movePlan(id,k==='plUp'?1:-1);return;}}
function onChange(e){const el=e.target;const k=el.dataset&&el.dataset.t2;if(!k)return;
  if(k==='aerShow'){setShow(el.checked);if(S().tab==='fond')A.renderPanel();return;}
  if(k==='aerLayer'){setLayer(el.value);return;}
  if(k==='lnkPlan'){const l=S().lines.find(x=>x.id===el.dataset.line);if(!l)return;l.plan=el.value||null;A.save();if(S().tab==='fond')A.renderPanel();const s=el.parentElement.querySelector('.muted');if(s)s.remove();return;}
  if(k==='echPlan'){openEchModal(el.value);return;}}
function onInput(e){const el=e.target;const k=el.dataset&&el.dataset.t2;if(!k)return;
  if(k==='aerOp'){setOpacity((+el.value)/100);return;}
  if(k==='echN'){const row=el.closest('.t2ech');const t=row&&row.querySelector('[data-t2="echTxt"]');const N=+String(el.value).replace(',','.');if(t)t.textContent=echTxt(N>0?N:0);}}
function onKey(e){if(e.key!=='Enter')return;const el=e.target;const k=el.dataset&&el.dataset.t2;if(!k)return;e.preventDefault();e.stopPropagation();
  if(k==='aerAddr'){const b=el.closest('.t2aer');const go=b&&b.querySelector('[data-t2="aerGo"]');if(go)go.click();}
  if(k==='echN'||k==='echDpi'){const row=el.closest('.t2ech');const go=row&&row.querySelector('[data-t2="echGo"]');if(go)go.click();}}
/* ================= API (tests, automatisation) : window.MAQ.fond ================= */
const API={geo,aer:()=>JSON.parse(JSON.stringify(AER)),search:searchAddr,show:setShow,opacity:setOpacity,layer:setLayer,forget,reset,tiles:()=>gAer?gAer.querySelectorAll('image').length:0,
  kind:(n,t)=>planFileKind(n,t),addPdf,addImage,scale:(id,N,dpi)=>applyEch(A&&A.bgPlan(id),N,dpi),scaleN:id=>{const p=A.bgPlan(id);return p?planScaleN(p,p.pageW_mm>0?null:(p.dpi||300)):null;},
  planUnder,planOf:id=>planOf(S().lines.find(l=>l.id===id)),tag:tagLine,movedSet:spec=>{const s=movedSet(spec);return {ids:[...s.ids],plans:s.plans.map(p=>p.id),note:s.note};},
  cal:(spec,pairs)=>{const s={what:spec.what||'all',line:spec.line,plan:spec.plan,scale:!!spec.scale};const set=movedSet(s);return calApply(s,(pairs||[]).map(([f,t])=>({from:f,to:t})),set);},
  startCal,openCal,openAer:openAerModal,openEch:openEchModal,openLinks,dxfTrueTf:id=>dxfTrueTf(A.bgPlan(id)),placeDxfTrue,siteGeo,loadPdfJs,pdfMaxSide};
