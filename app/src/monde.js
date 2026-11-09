// monde.js — MONDE 3D de Tracé (nuit du 06 au 07/11/2026 · Labo). Ethan (06/11 soir) : « un seul monde 3D ; chaque module est un zoom sur sa partie ».
//   Accueil  = MON BUREAU (les mêmes infos que l'accueil classique, posées sur le bureau ; bureau personnalisable)
//   Équipe   = TOUT : carte de France → dépôts (taille selon les personnes rattachées) → bureaux des collègues, magasin, vestiaire ; les gars sur leur chantier du jour
//   Commerce = la SALLE D'ATTENTE des affaires (en attente du client / d'un fournisseur / d'un sous-traitant) et ce qui est « à travailler » sur le bureau
//   Pilotage = les CHANTIERS du secteur : les gars dessus (planning du jour), l'avancement
//   Chantier = le RÉSEAU RACCORDÉ (bureau du chantier) : un bâtiment = un sujet de la checklist ; raccordé (allumé) = à jour
// · OPTION ÉTEINTE PAR DÉFAUT, indépendante des paliers : réglage partagé app_settings « monde » {on, testeurs, depots, magasin} (administrateur) + copie appareil.
//   Tant que `on` est faux ou que la personne n'est pas dans les testeurs : RIEN ne change (accueil, hubs, bureau du chantier identiques au caractère près).
// · PC seulement (fenêtre ≥ 900 px) : au téléphone, rien ne change. Les avatars ne bougent pas : on fait glisser / zoomer la VUE (souris, doigt, molette, pincer).
// · Aucune donnée réelle dans le code : les dépôts (nom, ville, position) se règlent dans l'appli (Équipe → 🌍 Monde 3D → ⚙ Réglages).
// · Rien n'est retiré : chaque scène est une vue de plus ; la vue classique reste à un clic ; les objets ouvrent EXACTEMENT ce qu'ouvrent les boutons classiques
//   (mêmes data-act : notif, tabgo, accnew, af…).
import {magStock} from './magasin.js';
import {glAvailable,glSlot,glDispose,networkOf} from './monde_gl.js'; // 08/11 : vraie 3D (three.js) ; les scènes SVG ci-dessous restent le secours sans WebGL
const KEY='trace:monde';
let CFG=null,API=null,LOADED=false;
export const SECT0={ouest:'Ouest',idf:'Île-de-France',sudouest:'Sud-Ouest',sudest:'Sud-Est'};
const C={nuit:'#2B1B5A',violet:'#5E46B8',lav:'#E6E1F6',lav2:'#D6CEF2',trait:'#DDD8EA',encre:'#1B1530',encre2:'#57526B',ok:'#0E6B5C',okF:'#DDF1EC',att:'#7A4A00',attF:'#FFF0D2',ambre:'#C08A2E',bq:'#A3221F',bqF:'#FBE6E4',hl:'#4A4560',hlF:'#ECEAF2',aller:'#C8382F',retour:'#2A5FB4',lum:'#FFD978'};
/* ── réglage partagé ── */
function norm(v){const o=v&&typeof v==='object'&&!Array.isArray(v)?v:{};const depots={};
  Object.entries(o.depots||{}).forEach(([k,d])=>{if(!d||typeof d!=='object'||!/^[a-z0-9_-]{1,24}$/.test(k))return;const lat=parseFloat(d.lat),lon=parseFloat(d.lon);
    depots[k]={nom:String(d.nom||'').slice(0,60),ville:String(d.ville||'').slice(0,60),lat:isFinite(lat)&&lat>41&&lat<51.5?lat:null,lon:isFinite(lon)&&lon>-5.5&&lon<10?lon:null,siege:d.siege===true};});
  return {v:1,on:!!o.on,testeurs:Array.isArray(o.testeurs)?[...new Set(o.testeurs.filter(x=>typeof x==='string'&&x).map(x=>x.toLowerCase()))].slice(0,500):[],depots,magasin:typeof o.magasin==='string'?o.magasin:'',at:o.at||null,by:o.by||''};}
function loadLocal(){try{return norm(JSON.parse(localStorage.getItem(KEY)||'null'));}catch(e){return norm(null);}}
export const mondeCfg=()=>CFG||(CFG=loadLocal());
export function initMonde(api){API=api||API;CFG=loadLocal();} /* écouteurs (glisser / zoomer) branchés seulement quand une scène 3D s'affiche : bindOnce() dans viewport() */
export async function loadMonde(){const A=API;if(!A||!A.sync||!A.sync.getSetting||!A.state||!A.state.cloudUser)return false;
  try{const v=await A.sync.getSetting('monde');if(v&&typeof v==='object'){const before=JSON.stringify(mondeCfg());CFG=norm(v);try{localStorage.setItem(KEY,JSON.stringify(CFG));}catch(e){}return JSON.stringify(CFG)!==before;}}catch(e){console.warn(e);}return false;}
export async function saveMonde(patch){const A=API;const next=norm(Object.assign({},mondeCfg(),patch,{at:new Date().toISOString(),by:(A&&A.userName&&A.userName())||''}));let where='appareil';
  if(A&&A.state&&A.state.cloudUser&&A.sync&&A.sync.setSetting){const err=await A.sync.setSetting('monde',next);if(err)return {error:err==='hors ligne'?'connexion au serveur perdue — rien n\'a changé (🩺 Diagnostic)':err};where='serveur';}
  CFG=next;try{localStorage.setItem(KEY,JSON.stringify(CFG));}catch(e){}return {ok:true,where};}
const idsOf=a=>a?[a.id,a.acc,a.email,a.key,a._acc&&a._acc.id,a._acc&&a._acc.email].filter(Boolean).map(x=>String(x).toLowerCase()):[];
/** la personne (fiche de l'espace OU compte) voit-elle le Monde 3D ? — option allumée ET testeur ET écran large */
export function mondeFor(p){const c=mondeCfg();if(!c.on||!p||!wide())return false;const T=new Set(c.testeurs);return idsOf(p).some(x=>T.has(x));}
/* PC en « ⤢ Affichage large (ordinateur) » seulement : en colonne (téléphone ou PC en affichage normal), rien ne change */
export const wide=()=>{if(typeof window==='undefined'||(window.innerWidth||0)<900)return false;const app=document.getElementById('app');return !!app&&app.classList.contains('wide');};
let CTX0=null;
function ensureLoaded(ctx){if(ctx)CTX0=ctx;if(!API&&ctx&&ctx.api)initMonde(ctx.api);try{if(window.TRACE&&!window.TRACE.monde)window.TRACE.monde={cfg:()=>mondeCfg(),ctx:()=>CTX0,cam:()=>CAM,world:()=>W}; /* tests */}catch(e){}if(LOADED||!(API&&API.state&&API.state.cloudUser))return;LOADED=true; /* une lecture par session, une fois connecté */loadMonde().then(ch=>{if(ch&&ctx&&ctx.render)ctx.render();}).catch(()=>{LOADED=false;});}
/* vue classique / 3D par module (préférence de l'appareil) */
const VK='trace:monde:vue';
const vueOf=k=>{try{return (JSON.parse(localStorage.getItem(VK)||'{}')||{})[k]||'3d';}catch(e){return '3d';}};
function setVue(k,v){try{const o=JSON.parse(localStorage.getItem(VK)||'{}')||{};o[k]=v;localStorage.setItem(VK,JSON.stringify(o));}catch(e){}}
/* ── outils de dessin (isométrique) ── */
const f1=n=>Math.round(n*10)/10;
const PTS=a=>a.map(p=>f1(p[0])+','+f1(p[1])).join(' ');
export const esc=s=>String(s==null?'':s).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
function iso(U,ox,oy){const cx=U*0.866,sy=U*0.5,hz=U*0.95;const P=(x,y,z)=>[ox+(x-y)*cx,oy+(x+y)*sy-(z||0)*hz];P.U=U;P.cx=cx;P.sy=sy;P.hz=hz;return P;}
const pg=(a,f,s,w,o,x)=>`<polygon points="${PTS(a)}" fill="${f}"${s?` stroke="${s}" stroke-width="${w||1}" stroke-linejoin="round"`:''}${o!=null&&o<1?` opacity="${o}"`:''}${x||''}/>`;
const ln=(a,b,s,w,da,o)=>`<line x1="${f1(a[0])}" y1="${f1(a[1])}" x2="${f1(b[0])}" y2="${f1(b[1])}" stroke="${s}" stroke-width="${w||1}" stroke-linecap="round"${da?` stroke-dasharray="${da}"`:''}${o!=null&&o<1?` opacity="${o}"`:''}/>`;
const quad=(P,x0,y0,x1,y1,z,f,s,w,o)=>pg([P(x0,y0,z),P(x1,y0,z),P(x1,y1,z),P(x0,y1,z)],f,s,w,o);
function bx(P,x,y,w,d,z0,h,k){const o=k.o;return pg([P(x,y+d,z0),P(x+w,y+d,z0),P(x+w,y+d,z0+h),P(x,y+d,z0+h)],k.l,k.s,0.8,o)+pg([P(x+w,y,z0),P(x+w,y+d,z0),P(x+w,y+d,z0+h),P(x+w,y,z0+h)],k.r,k.s,0.8,o)+pg([P(x,y,z0+h),P(x+w,y,z0+h),P(x+w,y+d,z0+h),P(x,y+d,z0+h)],k.t,k.s,0.8,o);}
const hull=(P,x,y,w,d,z0,h)=>[P(x,y,z0+h),P(x+w,y,z0+h),P(x+w,y,z0),P(x+w,y+d,z0),P(x,y+d,z0),P(x,y+d,z0+h)];
const tw=t=>Math.round(String(t).length*6.7+20);
function pill(x,y,txt,bg,fg,bd,left){const w=tw(txt);const x0=left?x:x-w/2;return `<g class="m3d-pill"><rect x="${f1(x0)}" y="${f1(y-11)}" width="${w}" height="22" rx="11" fill="${bg}" stroke="${bd||bg}"/><text x="${f1(x0+w/2)}" y="${f1(y+4.5)}" text-anchor="middle" font-size="12.5" font-weight="700" fill="${fg}">${esc(txt)}</text></g>`;}
/* texte posé sur un plan : mur du fond (le long de x), mur de gauche (le long de y), sol */
const onWallX=(P,x,y,z,txt,fs,col,w)=>{const p=P(x,y,z);return `<text transform="matrix(0.866 0.5 0 1 ${f1(p[0])} ${f1(p[1])})" font-size="${fs}" font-weight="${w||700}" fill="${col}">${esc(txt)}</text>`;};
const onWallY=(P,x,y,z,txt,fs,col,w)=>{const p=P(x,y,z);return `<text transform="matrix(0.866 -0.5 0 1 ${f1(p[0])} ${f1(p[1])})" font-size="${fs}" font-weight="${w||700}" fill="${col}">${esc(txt)}</text>`;};
const onFloor=(P,x,y,z,txt,fs,col)=>{const p=P(x,y,z);return `<text transform="matrix(0.866 0.5 -0.866 0.5 ${f1(p[0])} ${f1(p[1])})" font-size="${fs}" font-weight="800" fill="${col}" opacity="0.55">${esc(txt)}</text>`;};
/** zone cliquable : le groupe porte les data-* de l'action ; le contour s'allume au survol / au clavier */
const hit=(attrs,aria,inner,outline)=>`<g class="m3d-hit" tabindex="0" role="button" aria-label="${esc(aria)}" ${attrs}><title>${esc(aria)}</title>${inner}${outline?`<polygon class="m3d-hl" points="${PTS(outline)}" fill="transparent" stroke="transparent"/>`:''}</g>`;
/** avatar de l'appli (SVG 240 × 420) posé debout, pieds en (x, y), hauteur h */
function avatarAt(svg,x,y,h){if(!svg)return '';const w=h/1.75;return svg.replace('<svg ',`<svg x="${f1(x-w/2)}" y="${f1(y-h)}" `).replace(/ width="[\d.]+" height="[\d.]+"/,` width="${f1(w)}" height="${f1(h)}"`);}
/** silhouette simple (quand l'avatar n'est pas chargé) : corps + tête, initiales */
function figure(x,y,h,col,ini){const r=h*0.16;return `<rect x="${f1(x-h*0.17)}" y="${f1(y-h*0.62)}" width="${f1(h*0.34)}" height="${f1(h*0.6)}" rx="${f1(h*0.15)}" fill="${col||C.nuit}"/><circle cx="${f1(x)}" cy="${f1(y-h*0.62-r*0.9)}" r="${f1(r)}" fill="${C.lav2}" stroke="${col||C.nuit}" stroke-width="1.2"/>${ini?`<text x="${f1(x)}" y="${f1(y-h*0.62-r*0.55)}" text-anchor="middle" font-size="${f1(r*1.05)}" font-weight="800" fill="${col||C.nuit}">${esc(ini)}</text>`:''}`;}
const iniOf=p=>((p&&(p.prenom||p.name||p.nom))||'?').trim().slice(0,1).toUpperCase();
/* ── caméra : glisser / zoomer la vue (aucun avatar ne bouge) ── */
const CAM={};
const camOf=(id,def)=>{if(!CAM[id])CAM[id]=Object.assign({s:1,tx:0,ty:0,min:0.55,max:7},def||{});return CAM[id];};
const camAttr=id=>{const c=CAM[id]||{s:1,tx:0,ty:0};return `translate(${f1(c.tx)} ${f1(c.ty)}) scale(${Math.round(c.s*1000)/1000})`;};
/** viewport glissable : id (une caméra par scène), W × H (viewBox), contenu, hauteur en px, caméra de départ */
function viewport(id,W,H,inner,o){bindOnce();o=o||{};const c=camOf(id,o.home);if(!c.home)c.home={s:c.s,tx:c.tx,ty:c.ty};
  return `<div class="m3d-vp" data-m3d="${esc(id)}" data-w="${W}" data-h="${H}" style="height:${o.h||560}px"><svg class="m3d-svg" viewBox="0 0 ${W} ${H}" preserveAspectRatio="xMidYMid meet" role="group" aria-label="${esc(o.aria||'Vue 3D')}"><rect width="${W}" height="${H}" fill="${o.bg||'#EEF2F7'}"/><g class="m3d-cam" transform="${camAttr(id)}">${inner}</g></svg>
    <div class="m3d-zoom" aria-label="Zoom"><button type="button" data-m3dz="+" aria-label="Zoomer">+</button><button type="button" data-m3dz="-" aria-label="Dézoomer">−</button><button type="button" data-m3dz="0" aria-label="Recentrer">⟲</button></div>
    <div class="m3d-tip">Glisse pour te déplacer · molette ou pincer pour zoomer</div></div>`;}
let DRAG=null,MOVED=false;
function bindOnce(){if(typeof document==='undefined'||bindOnce.done)return;bindOnce.done=true;css();
  const vpOf=e=>e.target&&e.target.closest?e.target.closest('.m3d-vp'):null;
  const K=vp=>{const r=vp.getBoundingClientRect();const W=+vp.dataset.w,H=+vp.dataset.h;const sc=Math.min(r.width/W,r.height/H)||1;return {r,sc,ox:(r.width-W*sc)/2,oy:(r.height-H*sc)/2};};
  const apply=vp=>{const g=vp.querySelector('.m3d-cam');if(g)g.setAttribute('transform',camAttr(vp.dataset.m3d));};
  const zoomAt=(vp,f,cx,cy)=>{const c=camOf(vp.dataset.m3d);const k=K(vp);const px=(cx-k.r.left-k.ox)/k.sc,py=(cy-k.r.top-k.oy)/k.sc;const s2=Math.max(c.min,Math.min(c.max,c.s*f));const wx=(px-c.tx)/c.s,wy=(py-c.ty)/c.s;c.tx=px-wx*s2;c.ty=py-wy*s2;c.s=s2;apply(vp);};
  const PTR=new Map();
  document.addEventListener('pointerdown',e=>{const vp=vpOf(e);if(!vp||(e.button&&e.button>0)||e.target.closest('.m3d-zoom'))return;PTR.set(e.pointerId,{x:e.clientX,y:e.clientY});
    if(PTR.size===1){DRAG={vp,x:e.clientX,y:e.clientY,moved:0};MOVED=false;}else if(PTR.size===2){const [a,b]=[...PTR.values()];DRAG={vp,pinch:Math.hypot(a.x-b.x,a.y-b.y)||1,moved:99};}});
  document.addEventListener('pointermove',e=>{if(!DRAG||!PTR.has(e.pointerId))return;PTR.set(e.pointerId,{x:e.clientX,y:e.clientY});const vp=DRAG.vp;if(!document.contains(vp)){DRAG=null;PTR.clear();return;}
    if(DRAG.pinch&&PTR.size>=2){const [a,b]=[...PTR.values()];const d=Math.hypot(a.x-b.x,a.y-b.y);if(d>0){zoomAt(vp,d/DRAG.pinch,(a.x+b.x)/2,(a.y+b.y)/2);DRAG.pinch=d;MOVED=true;}return;}
    const dx=e.clientX-DRAG.x,dy=e.clientY-DRAG.y;if(DRAG.moved<6){DRAG.moved+=Math.abs(dx)+Math.abs(dy);if(DRAG.moved<6)return;}
    const k=K(vp);const c=camOf(vp.dataset.m3d);c.tx+=dx/k.sc;c.ty+=dy/k.sc;DRAG.x=e.clientX;DRAG.y=e.clientY;MOVED=true;vp.classList.add('drag');apply(vp);});
  const up=e=>{PTR.delete(e.pointerId);if(!PTR.size&&DRAG){DRAG.vp.classList.remove('drag');DRAG=null;}};
  document.addEventListener('pointerup',up);document.addEventListener('pointercancel',up);
  window.addEventListener('click',e=>{if(MOVED&&e.target&&e.target.closest&&e.target.closest('.m3d-vp')){e.stopPropagation();e.preventDefault();}MOVED=false;},true); /* un glisser n'est pas un clic */
  document.addEventListener('wheel',e=>{const vp=vpOf(e);if(!vp)return;e.preventDefault();zoomAt(vp,e.deltaY<0?1.15:1/1.15,e.clientX,e.clientY);},{passive:false});
  document.addEventListener('click',e=>{const z=e.target&&e.target.closest&&e.target.closest('[data-m3dz]');if(!z)return;const vp=z.closest('.m3d-vp');if(!vp)return;e.preventDefault();e.stopPropagation();
    const r=vp.getBoundingClientRect();const v=z.dataset.m3dz;if(v==='0'){const c=camOf(vp.dataset.m3d);Object.assign(c,c.home||{s:1,tx:0,ty:0});apply(vp);}else zoomAt(vp,v==='+'?1.3:1/1.3,r.left+r.width/2,r.top+r.height/2);},true);
  document.addEventListener('keydown',e=>{if(e.key!=='Enter'&&e.key!==' ')return;const g=e.target&&e.target.closest&&e.target.closest('.m3d-hit[data-bur],.m3d-hit[data-m3dgo]');if(g&&g.onclick){e.preventDefault();g.onclick(e);}});}
function css(){if(typeof document==='undefined'||document.getElementById('m3d-css'))return;const s=document.createElement('style');s.id='m3d-css';s.textContent=`.m3d-acc3d .m3d-stage{height:clamp(520px,calc(100vh - 290px),900px)} /* 08/11 nuit : accueil 3D plein écran — la pièce tient sous le bonjour, sans descendre */ 
.m3d-card{background:#fff;border:1px solid #DDD8EA;border-radius:14px;padding:12px;margin:0 0 14px;display:grid;grid-template-columns:minmax(0,1fr) 340px;gap:14px;align-items:start}
.m3d-card.solo{grid-template-columns:minmax(0,1fr)}
.m3d-top{grid-column:1/-1;display:flex;align-items:center;justify-content:space-between;gap:10px;flex-wrap:wrap}
.m3d-top h3{margin:0;font-size:19px;line-height:24px}.m3d-top small{display:block;color:#57526B;font-size:13.5px;font-weight:500}
.m3d-vp{position:relative;border-radius:12px;overflow:hidden;touch-action:none;cursor:grab;user-select:none;-webkit-user-select:none;background:#EEF2F7}
.m3d-vp.drag{cursor:grabbing}.m3d-svg{width:100%;height:100%;display:block}.m3d-svg text{font-family:inherit}
.m3d-zoom{position:absolute;right:10px;bottom:10px;display:flex;flex-direction:column;gap:6px}
.m3d-zoom button{width:42px;height:42px;border-radius:10px;border:1px solid #CFC9E0;background:#fff;font-size:20px;font-weight:700;color:#2B1B5A;cursor:pointer;box-shadow:0 1px 3px rgba(43,27,90,.12)}
.m3d-tip{position:absolute;left:10px;bottom:10px;background:rgba(255,255,255,.88);color:#57526B;font-size:12.5px;padding:4px 10px;border-radius:999px;pointer-events:none}
.m3d-hit{cursor:pointer;outline:none}.m3d-hit:hover .m3d-hl,.m3d-hit:focus .m3d-hl{stroke:#5E46B8;stroke-width:2.5}.m3d-hit.on .m3d-hl{stroke:#5E46B8;stroke-width:3}
.m3d-side{display:flex;flex-direction:column;gap:10px;min-width:0}
.m3d-btns{display:flex;gap:8px;flex-wrap:wrap}.m3d-btns .btn{min-height:44px}
.m3d-crumb{display:flex;gap:6px;flex-wrap:wrap;align-items:center;font-size:14px}.m3d-crumb button{border:1px solid #CFC9E0;background:#fff;border-radius:999px;padding:6px 12px;min-height:36px;font-weight:700;color:#2B1B5A;cursor:pointer}.m3d-crumb b{padding:6px 4px}
.m3d-box{border:1px solid #DDD8EA;border-radius:12px;padding:10px 12px;background:#fff}.m3d-box h4{margin:0 0 6px;font-size:15.5px}
.m3d-li{display:flex;align-items:center;gap:8px;width:100%;text-align:left;border:1px solid transparent;background:#fff;border-radius:10px;padding:7px 8px;min-height:44px;cursor:pointer;font:inherit;color:inherit}
.m3d-li:hover{background:#F5F4FA}.m3d-li.on{border-color:#5E46B8;background:#EFEBFA}.m3d-li small{display:block;color:#57526B}.m3d-li .n{margin-left:auto;font-weight:800}
.m3d-chip{display:inline-flex;align-items:center;gap:4px;padding:3px 9px;border-radius:999px;font-size:12.5px;font-weight:700}
.m3d-sw{display:flex;gap:8px;flex-wrap:wrap}.m3d-sw button{width:38px;height:38px;border-radius:10px;border:2px solid #fff;box-shadow:0 0 0 1px #CFC9E0;cursor:pointer}.m3d-sw button.on{box-shadow:0 0 0 3px #5E46B8}
.m3d-objs{display:flex;gap:6px;flex-wrap:wrap}.m3d-objs button{min-height:40px;padding:0 12px;border-radius:999px;border:1px solid #CFC9E0;background:#fff;font-weight:700;cursor:pointer}.m3d-objs button.on{background:#2B1B5A;color:#fff;border-color:#2B1B5A}
.m3d-bar{height:10px;border-radius:999px;background:#ECEAF2;overflow:hidden}.m3d-bar i{display:block;height:100%;border-radius:999px}
.m3d-switch{display:inline-flex;align-items:center;gap:6px;border:1px solid #CFC9E0;background:#fff;border-radius:999px;padding:6px 12px;min-height:40px;font-weight:700;color:#2B1B5A;cursor:pointer}
.m3d-rac{margin:0 0 12px}.m3d-rac .m3d-svg{height:auto}
@media (max-width:1180px){.m3d-card{grid-template-columns:minmax(0,1fr)}}
.m3d-qo{display:grid;grid-template-columns:minmax(0,1fr) minmax(200px,260px);gap:10px;align-items:center;padding:7px 0;border-top:1px solid #EEEAF6}.m3d-qo:first-of-type{border-top:0}.m3d-qo small{display:block;color:#57526B;font-size:12.5px}.m3d-qo select{min-height:44px;margin:0}
@media (max-width:640px){.m3d-qo{grid-template-columns:1fr}}`;document.head.appendChild(s);}
/* ═══ MON BUREAU (Accueil) — et le bureau d'un collègue en visite (Équipe) ═══ */
const DESK={bois:{t:'#D9B98A',l:'#C9A774',r:'#B08A55',s:'#9C7A4A',n:'Bois'},blanc:{t:'#FFFFFF',l:'#F1EFF6',r:'#E4E1EC',s:'#CFC9E0',n:'Blanc'},nuit:{t:'#4C3A9A',l:'#3A2C78',r:'#2B1B5A',s:'#22164A',n:'Nuit'},
  violet:{t:'#B9A9EE',l:'#9F8BE3',r:'#8E7AD6',s:'#6F5BC0',n:'Violet'},vert:{t:'#BFE3D9',l:'#9FD2C5',r:'#7FBFAF',s:'#5E9F8F',n:'Vert'},gris:{t:'#D8D3E6',l:'#C9C3DC',r:'#B9B3CC',s:'#8E87A6',n:'Gris'}};
const MUR={lavande:{a:'#F1EEFA',b:'#E6E1F6',n:'Lavande'},blanc:{a:'#FFFFFF',b:'#F1EFF6',n:'Blanc'},sable:{a:'#F6EFE3',b:'#ECE2D0',n:'Sable'},menthe:{a:'#E9F5F0',b:'#D7ECE4',n:'Menthe'},ciel:{a:'#EAF1F9',b:'#DCE7F4',n:'Ciel'}};
const OBJ=[['plante','🪴 Plante'],['lampe','💡 Lampe'],['cadre','🖼 Cadre photo'],['mug','☕ Mug'],['tapis','🟪 Tapis'],['poster','🎨 Affiche'],['horloge','🕒 Horloge'],['trophee','🏆 Trophée']];
const PREF0={d:'bois',m:'lavande',o:['plante','lampe','mug']};
export function prefsOf(data){const b=data&&data.avatar&&data.avatar.bureau;const o=b&&typeof b==='object'?b:{};
  return {d:DESK[o.d]?o.d:PREF0.d,m:MUR[o.m]?o.m:PREF0.m,o:Array.isArray(o.o)?o.o.filter(k=>OBJ.some(x=>x[0]===k)):PREF0.o.slice()};}
const SEV={bad:['#F6C6C1',C.bq],or:['#FFE3A6',C.ambre],warn:['#FFE3A6',C.ambre],info:['#D9E6F8',C.retour],ok:['#CDEBDD',C.ok]};
const sevOf=x=>SEV[x&&x.sev]||SEV.info;
const cut=(s,n)=>{s=String(s||'').replace(/<[^>]*>/g,'').trim();return s.length>n?s.slice(0,n-1)+'…':s;};
function wrap2(s,n){const w=String(s||'').split(/\s+/);const L=['',''];let i=0;w.forEach(x=>{if(i>1)return;if((L[i]+' '+x).trim().length>n){if(!L[i]){L[i]=x.slice(0,n);i++;return;}i++;if(i>1)return;}L[i]=(L[i]+' '+x).trim();});if(i>1&&L[1].length>n-1)L[1]=L[1].slice(0,n-1)+'…';return L;}
/** scène du bureau. o = {pref, av (svg de l'avatar), todo:[[x,i]], know:[[x,i]], spaces:[{t,go,n}], visit:bool, nom, poste, jour:{n,mois,sem}} */
export function sceneBureau(o){const P=iso(33,407,200);const pf=o.pref||PREF0;const dk=DESK[pf.d],mu=MUR[pf.m];const has=k=>pf.o.includes(k);const out=[];
  /* sol + murs */
  out.push(quad(P,0,0,12,9,0,'#EFE8DC','#DCD2C2',1));for(let x=1;x<12;x++)out.push(ln(P(x,0,0),P(x,9,0),'#E2D7C5',1));
  out.push(pg([P(0,0,0),P(12,0,0),P(12,0,6),P(0,0,6)],mu.a,'#DDD8EA',1),pg([P(0,0,0),P(0,9,0),P(0,9,6),P(0,0,6)],mu.b,'#DDD8EA',1));
  out.push(quad(P,-0.3,-0.3,12,0,6,'#B9B3CC'),quad(P,-0.3,0,0,9,6,'#B9B3CC'),ln(P(0,0,0.25),P(12,0,0.25),'#CFC9E0',2),ln(P(0,0,0.25),P(0,9,0.25),'#CFC9E0',2));
  /* fenêtre (mur du fond) */
  out.push(pg([P(8,0,2.6),P(11.2,0,2.6),P(11.2,0,5.3),P(8,0,5.3)],'#FFFFFF','#B9B3CC',1.5),pg([P(8.15,0,2.75),P(11.05,0,2.75),P(11.05,0,5.15),P(8.15,0,5.15)],'#CFE0EE'),ln(P(9.6,0,2.75),P(9.6,0,5.15),'#FFFFFF',3),ln(P(8.15,0,3.95),P(11.05,0,3.95),'#FFFFFF',3));
  /* calendrier */
  if(o.jour){out.push(pg([P(1.1,0,2.8),P(3.1,0,2.8),P(3.1,0,5),P(1.1,0,5)],'#FFFFFF','#CFC9E0',1),pg([P(1.1,0,4.45),P(3.1,0,4.45),P(3.1,0,5),P(1.1,0,5)],C.bq));
    out.push(onWallX(P,1.32,0,4.58,o.jour.mois,11,'#FFFFFF'),onWallX(P,1.45,0,3.25,o.jour.n,34,C.encre,800),onWallX(P,1.35,0,2.98,o.jour.sem,10,C.encre2,600));}
  /* tableau d'affichage : « À faire » (post-it) — ou décor en visite */
  out.push(pg([P(3.4,0,2.3),P(7.5,0,2.3),P(7.5,0,5.6),P(3.4,0,5.6)],'#C9A774','#9C7A4A',1.5),pg([P(3.55,0,2.45),P(7.35,0,2.45),P(7.35,0,5.45),P(3.55,0,5.45)],'#E4CFA6'));
  if(!o.visit){const T=o.todo||[];const sh=T.slice(0,T.length>6?5:6);
    sh.forEach(([x,i],j)=>{const c=j%2,r=Math.floor(j/2);const x0=3.75+c*1.85,z1=5.3-r*1.02,z0=z1-0.88;const col=sevOf(x);const L=wrap2(cut(x.t,24),11);
      const note=pg([P(x0,0,z0),P(x0+1.7,0,z0),P(x0+1.7,0,z1),P(x0,0,z1)],col[0],col[1],0.8)+`<circle cx="${f1(P(x0+0.85,0,z1-0.08)[0])}" cy="${f1(P(x0+0.85,0,z1-0.08)[1])}" r="4" fill="${col[1]}"/>`+onWallX(P,x0+0.12,0,z1-0.36,L[0],8.5,C.encre)+(L[1]?onWallX(P,x0+0.12,0,z1-0.66,L[1],8.5,C.encre):'');
      out.push(hit(`data-act="notif" data-v="${i}"`,x.t+(x.s?' — '+cut(x.s,80):''),note,[P(x0,0,z0),P(x0+1.7,0,z0),P(x0+1.7,0,z1),P(x0,0,z1)]));});
    if(T.length>6){const x0=5.6,z1=3.26,z0=2.5;out.push(pg([P(x0,0,z0),P(x0+1.7,0,z0),P(x0+1.7,0,z1),P(x0,0,z1)],'#FFFFFF','#B9B3CC',0.8),onWallX(P,x0+0.2,0,z0+0.28,'+'+(T.length-5)+' autres',9,C.encre2));}
    if(!T.length)out.push(onWallX(P,3.85,0,4.0,'Rien à faire :',12,C.ok),onWallX(P,3.85,0,3.5,'tu es à jour ✓',12,C.ok));
    out.push(onWallX(P,3.5,0,5.75,'À FAIRE',11,C.nuit,800));}
  else[[3.8,4.3],[5.7,4.4],[4.6,3.1],[6.3,3.0]].forEach(([x0,z0],j)=>out.push(pg([P(x0,0,z0),P(x0+1.3,0,z0),P(x0+1.3,0,z0+0.9),P(x0,0,z0+0.9)],['#FFE3A6','#D9E6F8','#CDEBDD','#F1EEFA'][j],'#CFC9E0',0.6)));
  /* étagère (mur de gauche) : « À savoir » = classeurs */
  out.push(quad(P,0,1.2,0.95,7.4,3.6,'#C9A774','#9C7A4A',1),pg([P(0.95,1.2,3.6),P(0.95,7.4,3.6),P(0.95,7.4,3.45),P(0.95,1.2,3.45)],'#B08A55'));
  if(!o.visit){const K=(o.know||[]).slice(0,8);K.forEach(([x,i],j)=>{const y0=1.4+j*0.74;const col=sevOf(x);const b=bx(P,0.12,y0,0.7,0.56,3.6,1.25,{l:col[0],r:col[0],t:'#FFFFFF',s:col[1]})+pg([P(0.82,y0+0.08,4.1),P(0.82,y0+0.48,4.1),P(0.82,y0+0.48,4.35),P(0.82,y0+0.08,4.35)],'#FFFFFF');
      out.push(hit(`data-act="notif" data-v="${i}"`,(x.kl||x.t)+(x.kv||x.s?' — '+cut(x.kv||x.s,80):''),b,hull(P,0.12,y0,0.7,0.56,3.6,1.25)));});
    out.push(onWallY(P,0,1.3,5.15,'À SAVOIR'+(o.know&&o.know.length?' · '+o.know.length:''),11,C.nuit,800));}
  else[0,1,2,3,4].forEach(j=>out.push(bx(P,0.12,1.4+j*0.74,0.7,0.56,3.6,1.2,{l:'#E4E1EC',r:'#E4E1EC',t:'#FFFFFF',s:'#CFC9E0'})));
  if(has('trophee'))out.push(bx(P,0.25,6.6,0.5,0.5,3.6,0.25,{l:'#E8C98E',r:'#C08A2E',t:'#F2DDA8',s:'#B07A1E'}),pg([P(0.3,6.65,3.85),P(0.7,7.05,3.85),P(0.62,6.98,4.6),P(0.38,6.72,4.6)],'#E8C98E','#B07A1E',0.8));
  /* panneau des espaces (mur de gauche, en bas) */
  if(!o.visit&&o.spaces&&o.spaces.length){const S=o.spaces.slice(0,8);out.push(pg([P(0,1.4,0.9),P(0,7.6,0.9),P(0,7.6,3.15),P(0,1.4,3.15)],'#FFFFFF','#CFC9E0',1),onWallY(P,0,1.55,2.92,'ESPACES',9.5,C.nuit,800));
    S.forEach((s,j)=>{const c=j%4,r=Math.floor(j/4);const y0=1.6+c*1.5,z1=2.62-r*0.85,z0=z1-0.7;const t=pg([P(0,y0,z0),P(0,y0+1.32,z0),P(0,y0+1.32,z1),P(0,y0,z1)],r?'#EFEBFA':'#E6E1F6','#B9A9EE',0.8)+onWallY(P,0,y0+0.1,z0+0.24,cut(s.t,9),8,C.nuit)+(s.n?onWallY(P,0,y0+0.95,z1-0.2,String(s.n),8.5,C.bq,800):'');
      out.push(hit(`data-act="tabgo" data-v="${esc(s.go)}"`,s.t+(s.n?' ('+s.n+')':''),t,[P(0,y0,z0),P(0,y0+1.32,z0),P(0,y0+1.32,z1),P(0,y0,z1)]));});}
  /* alarme : déclarer un accident (même bouton que l'accueil classique) */
  if(!o.visit){const a=pg([P(0,8.1,2.3),P(0,8.75,2.3),P(0,8.75,3.05),P(0,8.1,3.05)],C.bq,'#7A1714',1)+onWallY(P,0,8.3,2.5,'!',16,'#FFFFFF',900);out.push(hit('data-act="accnew"','Déclarer un accident ou un presque-accident',a,[P(0,8.1,2.3),P(0,8.75,2.3),P(0,8.75,3.05),P(0,8.1,3.05)]));}
  if(has('poster'))out.push(pg([P(0,7.8,3.5),P(0,8.9,3.5),P(0,8.9,5.4),P(0,7.8,5.4)],'#FFFFFF','#CFC9E0',1),pg([P(0,7.95,3.7),P(0,8.75,3.7),P(0,8.75,4.5),P(0,7.95,4.5)],C.violet),pg([P(0,8.1,4.6),P(0,8.6,4.6),P(0,8.35,5.2)],C.ambre));
  if(has('horloge')){const R=0.55,c0=[7.75,0,5.6];const Pc=[];for(let t=0;t<20;t++){const a=t/20*Math.PI*2;Pc.push(P(c0[0]+R*Math.cos(a),0,c0[2]+R*Math.sin(a)));}const now=new Date();const h=(now.getHours()%12+now.getMinutes()/60)/12*Math.PI*2,m=now.getMinutes()/60*Math.PI*2;
    out.push(pg(Pc,'#FFFFFF',C.nuit,1.5),ln(P(c0[0],0,c0[2]),P(c0[0]+0.3*Math.sin(h),0,c0[2]+0.3*Math.cos(h)),C.nuit,2),ln(P(c0[0],0,c0[2]),P(c0[0]+0.45*Math.sin(m),0,c0[2]+0.45*Math.cos(m)),C.violet,1.5));}
  if(has('tapis'))out.push(quad(P,2.6,3.2,10,8.4,0.01,'#E6E1F6','#C9BEF0',1.5),quad(P,3,3.6,9.6,8,0.02,'none','#D6CEF2',1));
  /* chaise + avatar (derrière le bureau), puis le bureau */
  out.push(bx(P,5.2,2.2,1.6,1.3,1.4,0.25,{l:C.hl,r:'#3A3550',t:'#57526B',s:'#2B1B5A'}),bx(P,5.2,2.05,1.6,0.2,1.65,2.2,{l:'#57526B',r:'#3A3550',t:'#6B6485',s:'#2B1B5A'}),ln(P(6,2.85,0),P(6,2.85,1.4),'#3A3550',3));
  {const f=P(6,3.6,0);const h=5.4*P.hz;out.push(o.av?avatarAt(o.av,f[0],f[1],h):figure(f[0],f[1],h*0.9,C.nuit,o.ini));}
  out.push(bx(P,3.4,4.2,6.2,2.3,2.15,0.18,{l:dk.l,r:dk.r,t:dk.t,s:dk.s}));
  [[3.5,4.3],[9.4,4.3],[3.5,6.4],[9.4,6.4]].forEach(([x,y])=>out.push(ln(P(x,y,0),P(x,y,2.15),dk.s,3)));
  out.push(bx(P,8.2,4.25,1.3,2.15,0.4,1.75,{l:dk.l,r:dk.r,t:dk.t,s:dk.s}));
  if(!o.visit){const n=(o.todo||[]).length;out.push(onWallX(P,4.0,6.5,1.3,cut((o.nom||'')+(o.poste?' · '+o.poste:''),30),11,dk.t==='#FFFFFF'||dk.t==='#D8D3E6'||dk.t==='#BFE3D9'||dk.t==='#D9B98A'?C.encre:'#FFFFFF'));
    /* dossiers du jour (décor : un par « À faire », 6 max) */for(let j=0;j<Math.min(6,n);j++){const col=sevOf((o.todo[j]||[])[0]);out.push(bx(P,3.75+j*0.04,4.6,1.45,1.05,2.33+j*0.14,0.12,{l:col[0],r:col[1],t:col[0],s:col[1]}));}}
  else out.push(onWallX(P,4.0,6.5,1.3,cut((o.nom||'')+(o.poste?' · '+o.poste:''),30),11,C.encre));
  /* écran */
  out.push(bx(P,7.3,4.45,2.1,0.22,2.33,0.25,{l:'#3A3550',r:'#2B1B5A',t:'#57526B'}),ln(P(8.35,4.56,2.58),P(8.35,4.56,2.9),'#2B1B5A',4),bx(P,7.2,4.4,2.3,0.18,2.9,1.45,{l:'#2B1B5A',r:'#22164A',t:'#3A2C78'}));
  {const n=(o.todo||[]).length;const st=o.visit?['Bureau de',cut(o.nom,14)]:n?[n+' à faire','aujourd\'hui']:['À jour','rien à faire'];out.push(pg([P(7.3,4.58,3.0),P(9.4,4.58,3.0),P(9.4,4.58,4.25),P(7.3,4.58,4.25)],o.visit?'#5E46B8':n?'#4C3A9A':C.ok),onWallX(P,7.45,4.58,3.62,st[0],15,'#FFFFFF',800),onWallX(P,7.45,4.58,3.2,st[1],10,'#E6E1F6',600));}
  out.push(bx(P,6.3,5.2,1.5,0.6,2.33,0.07,{l:'#E4E1EC',r:'#CFC9E0',t:'#F5F4FA',s:'#B9B3CC'}));
  if(has('mug'))out.push(bx(P,8.6,5.7,0.42,0.42,2.33,0.55,{l:'#FFFFFF',r:'#ECEAF2',t:'#8C6A4A',s:C.violet}),ln(P(9.02,5.9,2.5),P(9.2,5.9,2.7),C.violet,2.2));
  if(has('cadre'))out.push(bx(P,4.1,5.9,0.9,0.12,2.33,0.75,{l:'#2B1B5A',r:'#22164A',t:'#3A2C78'}),pg([P(4.18,6.02,2.42),P(4.92,6.02,2.42),P(4.92,6.02,3.0),P(4.18,6.02,3.0)],'#CFE0EE'),pg([P(4.3,6.02,2.45),P(4.6,6.02,2.85),P(4.85,6.02,2.45)],'#8DB27A'));
  if(has('lampe')){const b=P(3.7,4.5,2.33);out.push(bx(P,3.5,4.35,0.5,0.4,2.33,0.1,{l:C.hl,r:'#3A3550',t:'#57526B'}),ln(P(3.75,4.55,2.43),P(3.9,4.55,3.6),'#3A3550',2.5),ln(P(3.9,4.55,3.6),P(4.6,4.55,3.85),'#3A3550',2.5),pg([P(4.3,4.55,3.95),P(5.0,4.55,3.75),P(4.85,4.55,3.4),P(4.35,4.55,3.55)],C.ambre,'#B07A1E',0.8),`<circle cx="${f1(P(4.7,5,2.4)[0])}" cy="${f1(P(4.7,5,2.4)[1])}" r="33" fill="${C.lum}" opacity="0.28"/>`);void b;}
  if(has('plante')){const pt=P(10.9,7.9,0);out.push(bx(P,10.5,7.5,0.8,0.8,0,0.8,{l:'#C9A774',r:'#B08A55',t:'#7C6A55',s:'#9C7A4A'}));[[0,-34,13],[-11,-26,10],[11,-25,10],[-5,-46,9],[7,-42,8]].forEach(([dx,dy,r])=>out.push(`<circle cx="${f1(pt[0]+dx*1.27)}" cy="${f1(pt[1]+dy*1.27)}" r="${f1(r*1.27)}" fill="#8DB27A"/>`));out.push(`<circle cx="${f1(pt[0]-4)}" cy="${f1(pt[1]-48)}" r="6" fill="#A9CA96"/>`);}
  return out.join('');}
/** panneau « Personnaliser mon bureau » */
export function persoHTML(pf){return `<div class="m3d-box"><h4>🎨 Personnaliser mon bureau</h4>
  <div class="hint" style="margin:0 0 6px">Couleur du bureau</div><div class="m3d-sw">${Object.entries(DESK).map(([k,d])=>`<button type="button" class="${pf.d===k?'on':''}" style="background:${d.t}" data-act="x" data-v="monde|pd|${k}" aria-label="Bureau ${esc(d.n)}" aria-pressed="${pf.d===k}"></button>`).join('')}</div>
  <div class="hint" style="margin:10px 0 6px">Couleur des murs</div><div class="m3d-sw">${Object.entries(MUR).map(([k,d])=>`<button type="button" class="${pf.m===k?'on':''}" style="background:${d.b}" data-act="x" data-v="monde|pm|${k}" aria-label="Murs ${esc(d.n)}" aria-pressed="${pf.m===k}"></button>`).join('')}</div>
  <div class="hint" style="margin:10px 0 6px">Objets</div><div class="m3d-objs">${OBJ.map(([k,l])=>`<button type="button" class="${pf.o.includes(k)?'on':''}" data-act="x" data-v="monde|po|${k}" aria-pressed="${pf.o.includes(k)}">${esc(l)}</button>`).join('')}</div>
  <div class="m3d-btns" style="margin-top:10px"><button class="btn primary" type="button" data-act="x" data-v="monde|perso|0">✓ Terminé</button></div>
  <div class="hint" style="margin-top:6px">Tes collègues voient ton bureau tel que tu l'arranges (Équipe → 🌍 Monde 3D).</div></div>`;}
let PERSO=false;
/** ACCUEIL en 3D : o = {me, pref, av, todo, know, spaces, jour, side:{hello, pointer, todoHTML, knowHTML}} → html (la carte « mon bureau ») */
export function accueilCard(o){const me=o.me;const inner=sceneBureau({pref:o.pref,av:o.av,ini:iniOf(me),todo:o.todo,know:o.know,spaces:o.spaces,jour:o.jour,nom:me.prenom,poste:o.poste});
  return `<div class="m3d-card m3d-acc" data-m3dscene="bureau"><div class="m3d-top"><div>${o.side.hello||''}</div><div class="m3d-btns"><button type="button" class="m3d-switch" data-act="x" data-v="monde|perso|${PERSO?0:1}">🎨 ${PERSO?'Fermer':'Personnaliser'}</button><button type="button" class="m3d-switch" data-act="x" data-v="monde|vue|acc|classique" title="Revenir à l'accueil en liste">☰ Vue classique</button></div></div>
    ${viewport('acc',900,560,inner,{h:560,aria:'Mon bureau en 3D : tableau « À faire », étagère « À savoir », panneau des espaces',bg:'#F5F4FA',home:{s:1,tx:0,ty:0,min:0.8,max:3.2}})}
    <div class="m3d-side">${PERSO?persoHTML(o.pref):''}${typeof o.side.pointer==='function'?o.side.pointer():o.side.pointer||''}${o.side.todoHTML||''}${o.side.knowHTML||''}</div></div>`;}
export const accueilVue=()=>vueOf('acc');
export const switch3D=k=>`<div class="m3d-btns" style="justify-content:flex-end;margin:0 0 8px"><button type="button" class="m3d-switch" data-act="x" data-v="monde|vue|${k}|3d">🌍 Vue 3D</button></div>`;
/* ═══ CHANTIER RACCORDÉ (Bureau du chantier) — un bâtiment = un sujet de la checklist ; raccordé (allumé) = à jour ═══ */
const RST={ok:{w:'#FFFFFF',r:'#ECEAF2',t:C.violet,win:C.lum,wo:1,pb:C.okF,pf:C.ok,pd:'#9FD2C5',ic:'✓'},warn:{w:'#FFFFFF',r:'#ECEAF2',t:'#B9B3CC',win:C.lum,wo:0.5,pb:C.attF,pf:C.att,pd:'#E8C98E',ic:'!'},
  bad:{w:'#F6EFEF',r:'#E9DEDE',t:'#B9B3CC',win:'#3A3550',wo:0.5,pb:C.bqF,pf:C.bq,pd:'#E9A9A4',ic:'✗'},off:{w:'#ECEAF2',r:'#DDD8EA',t:'#CFC9E0',win:'#B9B3CC',wo:0.4,pb:C.hlF,pf:C.hl,pd:'#CFCADC',ic:'○'}};
export const racTab=d=>d.tab||(d.key==='eq'?'__orga':d.key==='pt'?'__valid':'plan');
/** B = espaceBureau(id) (dash = checklist du chantier) → html de la scène (statique, pas de glisser) */
export function raccordeHTML(B,netName){bindOnce();const D=((B&&B.dash)||[]).filter(d=>d&&d.key!=='meteo');if(!D.length)return '';
  const P=iso(10,0,0);const N=D.length,COLS=6,rows=Math.ceil(N/COLS);const items=D.map((d,i)=>{const c=i%COLS,r=Math.floor(i/COLS);return {d,i,x0:7+c*9,y0:1+r*11,k:RST[d.k]?d.k:'off'};});
  const trunkY=r=>1+r*11+3.6+2.4;const back=[],front=[],labels=[];
  /* chaufferie + collecteur */
  back.push(quad(P,-1,-1,7+COLS*9,trunkY(rows-1)+2.5,0,'#ECEFE6','#D9DDD0',1));
  back.push(bx(P,0,0.6,4.6,3.6,0,3.6,{l:'#FFFFFF',r:'#ECEAF2',t:'#B9B3CC',s:'#CFC9E0'}),bx(P,3.4,1.0,0.9,0.9,3.6,4.2,{l:'#E6E1F6',r:'#D6CEF2',t:'#8E87A6',s:'#B9B3CC'}));
  {const s=P(3.85,1.45,8.2);[[0,-8,7,0.5],[6,-19,9,0.38],[13,-31,11,0.26]].forEach(([dx,dy,r,o])=>back.push(`<circle cx="${f1(s[0]+dx)}" cy="${f1(s[1]+dy)}" r="${r}" fill="#FFFFFF" opacity="${o}"/>`));}
  const lastX=r=>{const L=items.filter(t=>Math.floor(t.i/COLS)===r);return L.length?L[L.length-1].x0+2.6:7;};
  [[0.3,C.aller],[-0.3,C.retour]].forEach(([o,col])=>{back.push(ln(P(4.6,2.4+o,0.15),P(5.6+o,2.4+o,0.15),col,2.6),ln(P(5.6+o,2.4+o,0.15),P(5.6+o,trunkY(rows-1)+o,0.15),col,2.6));for(let r=0;r<rows;r++)back.push(ln(P(5.6+o,trunkY(r)+o,0.15),P(lastX(r)+o,trunkY(r)+o,0.15),col,2.6));});
  /* bâtiments (peints du fond vers l'avant) */
  items.sort((a,b)=>(a.x0+a.y0)-(b.x0+b.y0)).forEach(t=>{const s=RST[t.k];const {x0,y0}=t;const ty=trunkY(Math.floor(t.i/COLS));const g=[];
    /* branchement : du collecteur à la façade */
    [[0.3,C.aller],[-0.3,C.retour]].forEach(([o,col])=>{const a=P(x0+2+o,ty+o,0.15),b=P(x0+2+o,y0+3.4,0.15);
      if(t.k==='ok')g.push(ln(a,b,col,2.4));else if(t.k==='warn')g.push(ln(a,b,C.ambre,2.4,'5 4'));else if(t.k==='bad'){const m=P(x0+2+o,y0+3.4+(ty-y0-3.4)*0.55,0.15);g.push(ln(a,m,col,2.4));}else g.push(ln(a,b,'#B9B3CC',2,'3 5'));});
    if(t.k==='bad'){const m=P(x0+2,y0+3.4+(ty-y0-3.4)*0.42,0.15);g.push(ln([m[0]-6,m[1]-6],[m[0]+6,m[1]+6],C.bq,3),ln([m[0]-6,m[1]+6],[m[0]+6,m[1]-6],C.bq,3));}
    g.push(bx(P,x0,y0,4,3.4,0,3.2,{l:s.w,r:s.r,t:s.t,s:'#CFC9E0',o:t.k==='off'?0.85:1}));
    for(let w=0;w<3;w++){const xa=x0+0.5+w*1.2;g.push(pg([P(xa,y0+3.4,1.1),P(xa+0.75,y0+3.4,1.1),P(xa+0.75,y0+3.4,2.2),P(xa,y0+3.4,2.2)],w<2||t.k==='ok'?s.win:'#3A3550',null,0,w===2&&t.k!=='ok'?0.45:s.wo));}
    for(let w=0;w<2;w++){const ya=y0+0.5+w*1.4;g.push(pg([P(x0+4,ya,1.1),P(x0+4,ya+0.8,1.1),P(x0+4,ya+0.8,2.2),P(x0+4,ya,2.2)],t.k==='ok'?s.win:'#3A3550',null,0,t.k==='ok'?0.85:0.35));}
    if(t.k==='ok'){const c=P(x0+2,y0+1.7,3.2);g.push(`<circle cx="${f1(c[0])}" cy="${f1(c[1])}" r="20" fill="${C.lum}" opacity="0.22"/>`);}
    if(t.k==='off')[[x0,y0+3.4],[x0+4,y0+3.4],[x0+4,y0]].forEach(([x,y])=>g.push(ln(P(x,y,0),P(x,y,3.8),'#B07A1E',1.2)));
    const lab=cut(t.d.short||t.d.lab||'',16);const top=P(x0+2,y0+1.7,3.2);
    const aria=(t.d.lab||'')+' : '+(t.k==='ok'?'à jour':t.k==='off'?'pas commencé':t.d.v||'')+(t.d.s?' — '+t.d.s:'');
    front.push(hit(`data-bur="${esc(racTab(t.d))}"`,aria,g.join(''),hull(P,x0,y0,4,3.4,0,3.2)));
    labels.push(`<g class="m3d-hit" data-bur="${esc(racTab(t.d))}" aria-hidden="true">${pill(top[0],top[1]-16,s.ic+' '+lab,s.pb,s.pf,s.pd)}</g>`);});
  /* l'équipe du jour devant la chaufferie */
  (B.eq||[]).slice(0,6).forEach((n,k)=>{const f=P(1+k*0.85,5.4,0);front.unshift(figure(f[0],f[1],26,C.nuit,String(n||'?').trim().slice(0,1).toUpperCase()));});
  {const c=P(2.3,2.4,3.6);front.push(pill(c[0],c[1]-34,'Chaufferie'+(B.pc!=null?' · '+B.pc+' % soudé':''),'#FFFFFF',C.nuit,'#C9BEF0'));}
  /* cadrage : boîte englobante */
  const cs=[P(-1,-1,0),P(7+COLS*9,-1,0),P(7+COLS*9,trunkY(rows-1)+2.5,0),P(-1,trunkY(rows-1)+2.5,0),P(0,0,9.5)];const minX=Math.min(...cs.map(p=>p[0]))-20,maxX=Math.max(...cs.map(p=>p[0]))+20,minY=Math.min(...cs.map(p=>p[1]))-48,maxY=Math.max(...cs.map(p=>p[1]))+14;
  const nOk=items.filter(t=>t.k==='ok').length,nBad=items.filter(t=>t.k==='bad').length;
  return `<div class="m3d-card solo m3d-rac" data-m3dscene="raccorde"><div class="m3d-top"><div><h3>Réseau du chantier${netName?' · '+esc(netName):''}</h3><small>Un bâtiment = un sujet. Allumé et raccordé = à jour. Touche un bâtiment pour l'ouvrir.</small></div>
    <div style="min-width:220px"><b style="font-size:17px">${nOk} / ${N} raccordés</b>${nBad?` <span class="m3d-chip" style="background:${C.bqF};color:${C.bq}">${nBad} bloquant${nBad>1?'s':''}</span>`:''}<div class="m3d-bar" style="margin-top:6px"><i style="width:${Math.round(nOk/N*100)}%;background:${nOk===N?C.ok:C.violet}"></i></div></div></div>
    <svg class="m3d-svg" viewBox="${f1(minX)} ${f1(minY)} ${f1(maxX-minX)} ${f1(maxY-minY)}" role="group" aria-label="Réseau du chantier : ${nOk} sujets à jour sur ${N}" style="max-height:440px">${back.join('')}${front.join('')}${labels.join('')}</svg>
    <div class="m3d-btns" style="margin-top:4px;font-size:13.5px;color:#57526B;gap:14px"><span>✓ à jour</span><span>! il manque un truc</span><span>✗ bloquant (tuyau coupé)</span><span>○ pas commencé</span></div></div>`;}
/* ═══ LE MONDE (Équipe) : carte de France → dépôts → bureaux ═══ */
const FR=[[2.37,51.06],[2.55,51.09],[2.9,50.7],[3.15,50.79],[3.3,50.53],[3.6,50.48],[3.7,50.32],[4.05,50.35],[4.2,50.27],[4.15,50.0],[4.4,49.95],[4.85,50.15],[4.9,49.92],[5.4,49.62],[5.8,49.55],[6.1,49.47],[6.5,49.45],[6.75,49.17],[7.1,49.15],[7.45,49.17],[7.9,49.05],[8.2,48.97],[7.8,48.6],[7.6,48.1],[7.6,47.58],[7.4,47.43],[7.0,47.5],[6.95,47.3],[6.5,47.0],[6.1,46.6],[6.13,46.4],[5.95,46.2],[6.15,46.2],[6.6,46.4],[6.8,46.43],[6.85,46.1],[6.87,45.83],[7.05,45.65],[7.15,45.25],[6.75,45.15],[6.6,45.0],[7.05,44.7],[6.85,44.5],[7.0,44.25],[7.5,44.15],[7.65,44.0],[7.5,43.79],[7.25,43.7],[7.0,43.55],[6.65,43.27],[6.15,43.03],[5.93,43.12],[5.5,43.2],[5.35,43.3],[5.0,43.38],[4.6,43.4],[4.15,43.45],[3.65,43.38],[3.25,43.2],[3.05,42.95],[3.05,42.55],[3.17,42.44],[2.7,42.4],[2.2,42.42],[1.75,42.5],[1.45,42.6],[0.95,42.8],[0.65,42.7],[0.0,42.7],[-0.5,42.8],[-0.85,42.95],[-1.4,43.05],[-1.78,43.36],[-1.55,43.5],[-1.45,43.9],[-1.25,44.4],[-1.25,44.65],[-1.2,45.1],[-1.07,45.57],[-1.4,45.95],[-1.15,46.15],[-1.8,46.5],[-2.15,46.85],[-2.25,47.0],[-2.2,47.27],[-2.55,47.35],[-2.9,47.55],[-3.12,47.48],[-3.4,47.7],[-3.85,47.8],[-4.37,47.8],[-4.73,48.04],[-4.5,48.25],[-4.78,48.35],[-4.75,48.55],[-4.45,48.65],[-3.98,48.72],[-3.5,48.83],[-3.1,48.87],[-2.75,48.55],[-2.32,48.68],[-2.0,48.65],[-1.5,48.63],[-1.57,48.85],[-1.6,49.2],[-1.85,49.5],[-1.95,49.72],[-1.6,49.65],[-1.27,49.68],[-1.2,49.35],[-0.9,49.38],[-0.35,49.3],[0.23,49.42],[0.1,49.5],[0.37,49.76],[1.08,49.93],[1.45,50.1],[1.58,50.52],[1.6,50.73],[1.85,50.95]];
const CORSE=[[9.45,43.0],[9.55,42.6],[9.55,42.1],[9.25,41.37],[8.8,41.6],[8.6,42.05],[8.65,42.5],[9.1,42.75],[9.35,42.95]];
const LON0=2.4,LAT0=46.6,KM=72,KX=KM*Math.cos(LAT0*Math.PI/180),TILT=0.62;
export const FXY=(lon,lat)=>[500+(lon-LON0)*KX,330-(lat-LAT0)*KM*TILT];
export const FINV=(x,y)=>[LON0+(x-500)/KX,LAT0-(y-330)/(KM*TILT)];
const W={lvl:'france',sect:null,key:null,selp:null,selch:null};
/* avancement d'un chantier (même calcul que la liste des chantiers) : {total, pct} ou null */
const statC=(c,ctx)=>{try{const st=ctx.stat?ctx.stat(c.id):null;return st&&isFinite(+st.pct)?{total:+st.total||0,pct:Math.max(0,Math.min(100,Math.round(+st.pct)))}:null;}catch(e){return null;}};
const OFFICE=new Set(['direction','encadrement','support']);
const isOffice=(p,ctx)=>p.poste!=='chef'&&OFFICE.has(ctx.famOf(p));
function todayOf(p,ctx){const ids=ctx.planDe(p.id,ctx.today())||[];const ch=ids.map(id=>ctx.chantiers.find(c=>c.id===id&&!c.bureau)).find(Boolean);return ch?{ch}:ids.length&&!ids.every(id=>id==='siege')?{autre:ids[0]}:{};}
function depotsOf(ctx){const c=mondeCfg();const S=Object.assign({},SECT0,ctx.SECTEURS||{});return Object.keys(S).map(k=>{const d=c.depots[k]||{};const gens=ctx.people.filter(p=>p.active!==false&&p.poste!=='visiteur'&&ctx.secteurDe(p)===k);
  return {k,lab:S[k],nom:d.nom||('Dépôt '+S[k]),ville:d.ville||'',ll:d.lat!=null&&d.lon!=null?[d.lon,d.lat]:null,gens};});}
function personCard(p,ctx,o){o=o||{};const t=todayOf(p,ctx);const av=ctx.avSVG(p,52);
  return `<div class="m3d-box"><div style="display:flex;gap:10px;align-items:center">${av?`<span style="width:52px;height:64px;overflow:hidden;flex:none;display:inline-block">${av}</span>`:`<span class="m3d-chip" style="background:${C.lav};color:${C.nuit};font-size:18px;width:44px;height:44px;justify-content:center">${esc(iniOf(p))}</span>`}
    <div style="min-width:0"><b style="font-size:16px">${esc(ctx.nomC(p))}</b><small style="display:block;color:#57526B">${esc(ctx.posteLabel(p))}${ctx.secteurDe(p)?' · '+esc((ctx.SECTEURS||SECT0)[ctx.secteurDe(p)]||ctx.secteurDe(p)):''}</small>
    <small style="display:block;margin-top:2px">${t.ch?'🦺 Aujourd\'hui sur <b>'+esc(t.ch.nom)+'</b>':t.autre?'Aujourd\'hui : ailleurs':'🏢 Aujourd\'hui au dépôt'}</small></div></div>
    <div class="m3d-btns" style="margin-top:8px">${o.bureau&&isOffice(p,ctx)?`<button class="btn" type="button" data-act="x" data-v="monde|go|bureau:${esc(p.id)}">🪑 Voir son bureau</button>`:''}${t.ch?`<button class="btn" type="button" data-act="x" data-v="monde|open|${esc(t.ch.id)}">Ouvrir le chantier</button>`:''}</div></div>`;}
/* — carte de France — */
function sceneFrance(ctx,me){const out=[];const top=FR.map(([a,b])=>FXY(a,b)),co=CORSE.map(([a,b])=>FXY(a,b));const dn=a=>a.map(p=>[p[0],p[1]+13]);
  out.push(pg(dn(top),'#C9C3DC'),pg(dn(co),'#C9C3DC'),pg(top,'#F3F1EA','#CFC9E0',1.5),pg(co,'#F3F1EA','#CFC9E0',1.5));
  const today=ctx.today();const mineS=ctx.mySecteur(me);
  /* chantiers du jour (les gars dessus) */
  const chs=ctx.chantiers.filter(c=>!c.bureau&&Array.isArray(c.ll)&&isFinite(c.ll[0])&&isFinite(c.ll[1]));
  const onCh=id=>ctx.people.filter(p=>(ctx.planDe(p.id,today)||[]).includes(id));
  chs.forEach(c=>{const g=FXY(c.ll[0],c.ll[1]);const T=onCh(c.id);const on=W.selch===c.id;const st=statC(c,ctx);const pc=st?st.pct:null;
    let h=`<ellipse cx="${f1(g[0])}" cy="${f1(g[1])}" rx="9" ry="5" fill="#D9C9A8" opacity="0.9"/><circle cx="${f1(g[0])}" cy="${f1(g[1]-9)}" r="6.5" fill="${on?C.violet:C.nuit}" stroke="#fff" stroke-width="2"/>`;
    T.slice(0,4).forEach((p,k)=>{h+=figure(g[0]-9+k*6,g[1]+2,13,isOffice(p,ctx)?C.violet:C.nuit,'');});
    out.push(hit(`data-act="x" data-v="monde|selch|${esc(c.id)}"`,c.nom+(c.ville?' ('+c.ville+')':'')+' : '+T.length+' personne'+(T.length>1?'s':'')+' aujourd\'hui'+(pc!=null?', '+pc+' % soudé':''),h,[[g[0]-12,g[1]-18],[g[0]+12,g[1]-18],[g[0]+12,g[1]+6],[g[0]-12,g[1]+6]]));
    if(on)out.push(`<text x="${f1(g[0]+10)}" y="${f1(g[1]-12)}" font-size="10.5" font-weight="700" fill="${C.encre}" stroke="#F3F1EA" stroke-width="3" paint-order="stroke">${esc(cut(c.nom,22))}${T.length?' · '+T.length:''}</text>`);});
  /* dépôts : taille selon les personnes rattachées */
  const DEP=depotsOf(ctx).filter(d=>d.ll);const L=[];
  DEP.sort((a,b)=>FXY(...a.ll)[1]-FXY(...b.ll)[1]).forEach(d=>{const g=FXY(d.ll[0],d.ll[1]);const n=d.gens.length;const P=iso(4.4,g[0],g[1]);const w=Math.min(14,6+n*0.2),dd=Math.min(9,4.2+n*0.09),h=3+Math.min(2.4,n*0.05);const mine=d.k===mineS;
    const T=d.gens.filter(p=>todayOf(p,ctx).ch).length;let s=bx(P,-w/2,-dd/2,w,dd,0,h,{l:'#FFFFFF',r:'#ECEAF2',t:mine?C.violet:'#B9B3CC',s:'#B9B3CC'});
    for(let k=0;k<Math.floor(w/1.6);k++){const xa=-w/2+0.5+k*1.6;s+=pg([P(xa,dd/2,0.8),P(xa+0.9,dd/2,0.8),P(xa+0.9,dd/2,1.8),P(xa,dd/2,1.8)],C.nuit,null,0,0.35);}
    out.push(hit(`data-act="x" data-v="monde|go|depot:${esc(d.k)}"`,d.nom+(d.ville?' ('+d.ville+')':'')+' : '+n+' personnes, '+T+' sur chantier aujourd\'hui — entrer',s,hull(P,-w/2,-dd/2,w,dd,0,h)));
    const tp=P(0,0,h);L.push(pill(tp[0],tp[1]-14,d.nom+' · '+n,mine?C.lav:'#FFFFFF',C.nuit,mine?C.violet:'#C9BEF0')); /* une étiquette courte : le détail est dans la liste et au survol */});
  return out.join('')+L.join('');}
/* — intérieur d'un dépôt — */
function depotLayout(d,ctx){const off=d.gens.filter(p=>isOffice(p,ctx)).sort((a,b)=>ctx.nomC(a).localeCompare(ctx.nomC(b))),ter=d.gens.filter(p=>!isOffice(p,ctx)).sort((a,b)=>ctx.nomC(a).localeCompare(ctx.nomC(b)));
  const nIsl=Math.max(1,Math.ceil(off.length/4)),cols=Math.max(1,Math.ceil(nIsl/2));const Wb=cols*8+2;const X=Wb+31,Y=17;return {off,ter,nIsl,cols,Wb,X,Y};}
function sceneDepot(d,ctx,me){const Lo=depotLayout(d,ctx);const {X,Y,Wb}=Lo;const U=Math.min(16,940/((X+Y)*0.866));const H=5;const tot=(X+Y)*0.5*U+H*0.95*U;
  const P=iso(U,500-((X-Y)/2)*0.866*U,(640-tot)/2+H*0.95*U+14);const out=[],top=[];const today=ctx.today();
  out.push(quad(P,-1,-1,X+1,Y+7,0,'#E9ECE3','#D9DDD0',1),quad(P,0,0,X,Y,0.05,'#F4F2F8','#DDD8EA',1));
  out.push(pg([P(0,0,0),P(X,0,0),P(X,0,H),P(0,0,H)],'#FFFFFF','#DDD8EA',1),pg([P(0,0,0),P(0,Y,0),P(0,Y,H),P(0,0,H)],'#ECEAF2','#DDD8EA',1),quad(P,-0.4,-0.4,X,0,H,'#B9B3CC'),quad(P,-0.4,0,0,Y,H,'#B9B3CC'));
  const zone=(x0,x1,y0,y1,f,lab)=>{out.push(quad(P,x0,y0,x1,y1,0.07,f,'#DDD8EA',1),onFloor(P,x0+0.6,y1-0.8,0.08,lab,Math.max(9,U*0.7),C.nuit));};
  zone(0.3,Wb-0.3,0.3,Y-0.3,'#F1EEFA','BUREAUX');zone(Wb+0.3,Wb+8.7,0.3,8,'#EEF4F9','RÉUNION');zone(Wb+0.3,Wb+8.7,8.8,Y-0.3,'#FFF7E6','SALLE D\'ATTENTE');zone(Wb+9.3,Wb+20.7,0.3,Y-0.3,'#EEF8F5','MAGASIN');zone(Wb+21.3,X-0.3,0.3,Y-0.3,'#F6F1E8','VESTIAIRE · ATELIER');
  [Wb,Wb+9,Wb+21].forEach(x=>out.push(pg([P(x,0,0),P(x,Y*0.55,0),P(x,Y*0.55,1.2),P(x,0,1.2)],'#ECEAF2','#DDD8EA',0.8)));
  /* bureaux : îlots de 4 */
  const pos=[[0,0],[3.6,0],[0,3.4],[3.6,3.4]];const desks=[];Lo.off.forEach((p,i)=>{const isl=Math.floor(i/4),k=i%4;const col=Math.floor(isl/2),row=isl%2;desks.push({p,x:2+col*8+pos[k][0],y:2+row*7.5+pos[k][1]});});
  desks.sort((a,b)=>(a.x+a.y)-(b.x+b.y)).forEach(t=>{const p=t.p;const td=todayOf(p,ctx);const here=!td.ch&&!td.autre;const pf=prefsOf(ctx.peopleData(p.id));const dk=DESK[pf.d];const on=W.selp===p.id;let g='';
    g+=bx(P,t.x+0.9,t.y-0.9,1.2,0.9,0,1.0,{l:C.hl,r:'#3A3550',t:'#57526B'});
    if(here){const f=P(t.x+1.5,t.y-0.4,0);const av=ctx.avSVG(p,40);g+=av?avatarAt(av,f[0],f[1],3.2*P.hz):figure(f[0],f[1],3*P.hz,C.nuit,iniOf(p));}
    g+=bx(P,t.x,t.y,3,1.6,0,1.15,{l:dk.l,r:dk.r,t:dk.t,s:dk.s})+bx(P,t.x+1.7,t.y+0.15,1.1,0.12,1.15,0.8,{l:'#2B1B5A',r:'#22164A',t:'#3A2C78'});
    if(pf.o.includes('plante'))g+=`<circle cx="${f1(P(t.x+0.4,t.y+0.5,1.6)[0])}" cy="${f1(P(t.x+0.4,t.y+0.5,1.6)[1])}" r="${f1(U*0.3)}" fill="#8DB27A"/>`;
    g+=onWallX(P,t.x+0.15,t.y+1.6,0.35,cut(p.prenom||ctx.nomC(p),12),Math.max(7,U*0.5),dk.t==='#4C3A9A'?'#FFFFFF':C.encre);
    if(!here){const tp=P(t.x+1.5,t.y+0.8,1.15);top.push(pill(tp[0],tp[1]-12,td.ch?'🦺 '+cut(td.ch.nom,16):'absent',td.ch?C.lav:C.hlF,C.nuit,'#D6CEF2'));}
    out.push(`<g class="${on?'m3d-hit on':'m3d-hit'}" tabindex="0" role="button" aria-label="${esc(ctx.nomC(p)+', '+ctx.posteLabel(p)+(here?', au bureau':td.ch?', sur '+td.ch.nom:''))}" data-act="x" data-v="monde|selp|${esc(p.id)}">${g}<polygon class="m3d-hl" points="${PTS(hull(P,t.x,t.y-0.9,3,2.5,0,3.4))}" fill="transparent" stroke="${on?C.violet:'transparent'}"/></g>`);});
  if(!Lo.off.length)out.push(onFloor(P,2.5,9,0.1,'pas de bureau rattaché à ce secteur',Math.max(8,U*0.55),C.encre2));
  /* réunion : table */
  out.push(bx(P,Wb+2,2.4,5,3,0,1.15,{l:'#C9A774',r:'#B08A55',t:'#D9B98A',s:'#9C7A4A'}));
  /* salle d'attente : chaises + affaires qui attendent (secteur du dépôt) */
  const wait=(ctx.affaires()||[]).filter(a=>a&&['preconsult','devis'].includes(a.etat)&&a.attente&&a.attente.de&&(!a.secteur||a.secteur===d.k));
  {let g='';for(let k=0;k<8;k++){const cx=Wb+1.4+(k%4)*1.8,cy=10.2+Math.floor(k/4)*3.2;g+=bx(P,cx,cy,1.1,1.1,0,0.6,{l:C.violet,r:'#4C3A9A',t:'#7A66CC'})+bx(P,cx,cy-0.2,1.1,0.2,0.6,1.0,{l:C.violet,r:'#4C3A9A',t:'#7A66CC'});
      if(k<wait.length){const f=P(cx+0.55,cy+0.6,0.6);g+=figure(f[0],f[1],2.2*P.hz,({client:C.violet,fournisseur:C.ambre,soustraitant:C.ok})[wait[k].attente.de]||C.hl,'');}}
    out.push(hit('data-act="tabgo" data-v="commerce"','Salle d\'attente : '+wait.length+' affaire'+(wait.length>1?'s':'')+' en attente — ouvrir le Commerce',g,[P(Wb+0.3,8.8,0),P(Wb+8.7,8.8,0),P(Wb+8.7,Y-0.3,0),P(Wb+0.3,Y-0.3,0)]));
    const tp=P(Wb+4.5,12.5,2.5);top.push(pill(tp[0],tp[1]-14,wait.length+' en attente',C.attF,C.att,'#E8C98E'));}
  /* magasin : rayonnages (le stock suivi est dans le dépôt réglé « magasin ») */
  {const host=mondeCfg().magasin||'';let M=null;if(host===d.k){try{M=magStock();}catch(e){M=null;}}const fams=M?M.familles.slice(0,12):[];let g='';
    for(let r=0;r<3;r++){const y0=2+r*5,x0=Wb+10.5;for(let lv=0;lv<3;lv++){const z=0.4+lv*1.2;g+=quad(P,x0,y0,x0+9,y0+1.8,z,'#E9E6F1','#CFC9E0',0.8);for(let b=0;b<4;b++){const f=fams[r*4+b];const st=f?(f.rup?'rup':f.bas?'bas':'ok'):'';const col=st==='rup'?['#FBE6E4','#E9A9A4']:st==='bas'?['#FFF0D2','#FBE3B4']:st==='ok'?['#DDF1EC','#BFE3D9']:['#ECEAF2','#E4E1EC'];
          if(st!=='rup'||lv>0)g+=bx(P,x0+0.3+b*2.2,y0+0.3,1.7,1.2,z,0.85,{l:col[0],r:col[1],t:'#FFFFFF',s:'#CFC9E0',o:st?1:0.6});}
        g+=ln(P(x0,y0+1.8,z),P(x0+9,y0+1.8,z),C.ambre,1.6);}
      [0,9].forEach(dx=>g+=ln(P(x0+dx,y0+1.8,0),P(x0+dx,y0+1.8,4),C.violet,2));
      if(fams[r*4])g+=onFloor(P,x0+0.2,y0+2.7,0.08,cut(fams.slice(r*4,r*4+4).map(f=>f.f).join(' · '),44),Math.max(8,U*0.5),C.ok);}
    out.push(hit(M?'data-act="tabgo" data-v="magasin"':'data-act="x" data-v="monde|selmag"',M?'Magasin : '+M.n+' articles, '+M.bas+' à commander, '+M.rup+' en rupture — ouvrir le Magasin':'Magasin : stock suivi dans un autre dépôt',g,[P(Wb+9.3,0.3,0),P(Wb+20.7,0.3,0),P(Wb+20.7,Y-0.3,0),P(Wb+9.3,Y-0.3,0)]));
    if(M){const tp=P(Wb+15,9,4.5);top.push(pill(tp[0],tp[1]-40,!M.n?'catalogue vide (Pack SCR)':M.bas?M.bas+' à commander':'stock OK',M.bas?C.attF:M.n?C.okF:C.hlF,M.bas?C.att:M.n?C.ok:C.hl,M.bas?'#E8C98E':M.n?'#9FD2C5':'#CFCADC'));}}
  /* vestiaire : un casier par personne du terrain ; ceux qui sont au dépôt aujourd'hui se tiennent devant */
  {const xs=Wb+21.8;const per=Math.max(1,Math.floor((X-xs-0.5)/1.25));Lo.ter.slice(0,per*2).forEach((p,i)=>{const r=Math.floor(i/per),k=i%per;const x0=xs+k*1.25,y0=r?8.6:0.3;const td=todayOf(p,ctx);const on=W.selp===p.id;
      let g=bx(P,x0,y0,1.05,0.8,0,3.1,{l:td.ch?C.lav:'#ECEAF2',r:td.ch?C.lav2:'#DDD8EA',t:'#F5F4FA',s:'#B9B3CC'})+onWallX(P,x0+0.1,y0+0.8,2.6,cut(p.prenom||'',7),Math.max(6,U*0.36),C.nuit);
      if(!td.ch&&!td.autre){const f=P(x0+0.5,y0+2.2,0);const av=ctx.avSVG(p,34);g+=av?avatarAt(av,f[0],f[1],3.0*P.hz):figure(f[0],f[1],2.8*P.hz,C.nuit,iniOf(p));}
      out.push(`<g class="${on?'m3d-hit on':'m3d-hit'}" tabindex="0" role="button" aria-label="${esc(ctx.nomC(p)+', '+ctx.posteLabel(p)+(td.ch?', sur '+td.ch.nom:', au dépôt'))}" data-act="x" data-v="monde|selp|${esc(p.id)}">${g}<polygon class="m3d-hl" points="${PTS(hull(P,x0,y0,1.05,0.8,0,3.1))}" fill="transparent" stroke="${on?C.violet:'transparent'}"/></g>`);});
    if(Lo.ter.length>per*2){const tp=P(X-2,Y-2,0.2);top.push(pill(tp[0],tp[1],'+'+(Lo.ter.length-per*2)+' casiers','#FFFFFF',C.nuit,'#D6CEF2'));}}
  /* parking : fourgons */
  for(let k=0;k<Math.min(5,1+Math.floor(d.gens.length/6));k++){const x0=2+k*6;out.push(bx(P,x0,Y+1.5,4.2,2.2,0.3,2.1,{l:'#FFFFFF',r:'#ECEAF2',t:'#F5F4FA',s:'#B9B3CC'}),bx(P,x0+4.2,Y+1.5,1.4,2.2,0.3,1.5,{l:'#FFFFFF',r:'#ECEAF2',t:'#F5F4FA',s:'#B9B3CC'}),pg([P(x0+0.2,Y+3.7,1.2),P(x0+4,Y+3.7,1.2),P(x0+4,Y+3.7,1.6),P(x0+0.2,Y+3.7,1.6)],C.violet));}
  return out.join('')+top.join('');}
function sideDepot(d,ctx){const Lo=depotLayout(d,ctx);const off=Lo.off,ter=Lo.ter;const st=p=>todayOf(p,ctx);const li=p=>{const t=st(p);return `<button type="button" class="m3d-li${W.selp===p.id?' on':''}" data-act="x" data-v="monde|selp|${esc(p.id)}"><span>${esc(ctx.nomC(p))}<small>${esc(ctx.posteLabel(p))}${t.ch?' · 🦺 '+esc(cut(t.ch.nom,22)):''}</small></span></button>`;};
  const sel=W.selp&&d.gens.find(p=>p.id===W.selp);const onC=d.gens.filter(p=>st(p).ch);
  return `${sel?personCard(sel,ctx,{bureau:true}):''}<div class="m3d-box"><h4>${esc(d.nom)}${d.ville?' · '+esc(d.ville):''}</h4><div class="hint" style="margin:0 0 6px">${d.gens.length} personne${d.gens.length>1?'s':''} rattachée${d.gens.length>1?'s':''} (secteur ${esc(d.lab)}) · ${onC.length} sur chantier aujourd'hui</div>
    <b style="font-size:13.5px">Bureaux · ${off.length}</b>${off.map(li).join('')||'<div class="hint">—</div>'}<b style="font-size:13.5px;display:block;margin-top:6px">Terrain · ${ter.length}</b>${ter.map(li).join('')||'<div class="hint">—</div>'}</div>`;}
function sideFrance(ctx,me,admin){const D=depotsOf(ctx);const sans=ctx.people.filter(p=>p.active!==false&&p.poste!=='visiteur'&&!ctx.secteurDe(p)).length;const sc=W.selch&&ctx.chantiers.find(c=>c.id===W.selch);
  return `${sc?chantierCard(sc,ctx):''}<div class="m3d-box"><h4>Les dépôts</h4>${D.map(d=>`<button type="button" class="m3d-li" data-act="x" data-v="monde|go|depot:${esc(d.k)}"><span>${esc(d.nom)}<small>${esc(d.ville||'ville à régler')}${d.ll?'':' · pas encore placé'}</small></span><span class="n">${d.gens.length}</span></button>`).join('')}
    ${sans?`<div class="hint" style="margin-top:6px">${sans} personne${sans>1?'s':''} sans secteur (fiche de la personne) : pas encore dans un dépôt.</div>`:''}${admin?`<div class="m3d-btns" style="margin-top:8px"><button class="btn" type="button" data-act="x" data-v="monde|cfg">⚙ Réglages du Monde 3D</button></div>`:''}</div>`;}
function chantierCard(c,ctx){const T=ctx.people.filter(p=>(ctx.planDe(p.id,ctx.today())||[]).includes(c.id));const st=statC(c,ctx);const pc=st?st.pct:null;const nm=k=>{const p=k&&ctx.people.find(x=>x.id===k);return p?ctx.nomC(p):k||'—';};
  return `<div class="m3d-box"><h4>${esc(c.nom)}</h4><div class="hint" style="margin:0 0 6px">${esc(c.ville||'')}${c.chef?' · chef '+esc(nm(c.chef)):''}${c.conducteur?' · conducteur '+esc(nm(c.conducteur)):''}</div>
    ${pc!=null?`<div style="display:flex;justify-content:space-between;font-weight:700"><span>Soudures${st.total?' · '+st.total:''}</span><span>${pc} % soudé</span></div><div class="m3d-bar" style="margin:4px 0 8px"><i style="width:${pc}%;background:${C.violet}"></i></div>`:''}
    <b style="font-size:13.5px">Aujourd'hui sur place · ${T.length}</b><div style="display:flex;flex-wrap:wrap;gap:6px;margin-top:4px">${T.map(p=>`<span class="m3d-chip" style="background:${C.lav};color:${C.nuit}">${esc(ctx.nomC(p))}</span>`).join('')||'<span class="hint">personne au planning</span>'}</div>
    <div class="m3d-btns" style="margin-top:8px"><button class="btn primary" type="button" data-act="x" data-v="monde|open|${esc(c.id)}">Ouvrir le chantier</button></div></div>`;}
/** Équipe : le monde complet */
function mondeCard(me,ctx){const admin=!!me.admin;const crumb=[`<button type="button" data-act="x" data-v="monde|go|france">🇫🇷 France</button>`];let inner='',side='',id='eq-fr',home={s:1,tx:0,ty:0,min:0.7,max:9};
  const D=depotsOf(ctx);const d=W.sect&&D.find(x=>x.k===W.sect);
  if(W.lvl==='bureau'&&W.key){const p=ctx.people.find(x=>x.id===W.key);if(!p)W.lvl=d?'depot':'france';else{if(d)crumb.push(`<button type="button" data-act="x" data-v="monde|go|depot:${esc(d.k)}">${esc(d.nom)}</button>`);crumb.push(`<b>Bureau de ${esc(p.prenom||ctx.nomC(p))}</b>`);
      inner=sceneBureau({pref:prefsOf(ctx.peopleData(p.id)),av:ctx.avSVG(p,120),ini:iniOf(p),visit:true,nom:p.prenom||ctx.nomC(p),poste:ctx.posteLabel(p)});id='eq-bur';home={s:1,tx:0,ty:0,min:0.8,max:3.2};side=personCard(p,ctx,{});}}
  if(W.lvl==='depot'&&d){crumb.push(`<b>${esc(d.nom)}</b>`);inner=sceneDepot(d,ctx,me);id='eq-dep-'+d.k;home={s:1,tx:0,ty:0,min:0.7,max:6};side=sideDepot(d,ctx);}
  if(!inner){W.lvl='france';inner=sceneFrance(ctx,me);side=sideFrance(ctx,me,admin);}
  const W0=W.lvl==='bureau'?900:1000,H0=W.lvl==='bureau'?560:640;
  return `<div class="m3d-card m3d-eq" data-m3dscene="${W.lvl}"><div class="m3d-top"><div><h3>🌍 Le monde SCR</h3><small>Touche un dépôt pour y entrer, un bureau pour le voir · les gars sont sur leur chantier du jour (planning)</small></div><div class="m3d-btns"><span class="m3d-crumb">${crumb.join('<span>›</span>')}</span><button type="button" class="m3d-switch" data-act="x" data-v="monde|vue|eq|classique">☰ Masquer</button></div></div>
    ${viewport(id,W0,H0,inner,{h:600,aria:'Monde 3D : '+(W.lvl==='france'?'carte de France et dépôts':W.lvl==='depot'?'intérieur du dépôt':'bureau'),bg:W.lvl==='france'?'#E4EDF6':'#EEF2F7',home})}
    <div class="m3d-side">${side}</div></div>`;}
/* ═══ PILOTAGE : les chantiers du secteur — les gars dessus, l'avancement ═══ */
const PIL={sel:null};
function pilList(me,ctx){const s=ctx.mySecteur(me);const today=ctx.today();const L=ctx.chantiers.filter(c=>!c.bureau&&(!s||!c.secteur||c.secteur===s)).map(c=>({c,T:ctx.people.filter(p=>(ctx.planDe(p.id,today)||[]).includes(c.id))}));
  return L.sort((a,b)=>b.T.length-a.T.length||String(a.c.nom).localeCompare(String(b.c.nom))).slice(0,16);}
function scenePilotage(L,ctx){const n=Math.max(1,L.length),cols=Math.min(4,Math.max(1,Math.ceil(Math.sqrt(n)))),rows=Math.ceil(n/cols);const X=cols*11,Y=rows*9;
  const U=Math.min(34,920/((X+Y)*0.866),560/((X+Y)*0.5+5));const P=iso(U,500-((X-Y)/2)*0.866*U,(620-((X+Y)*0.5*U))/2+3*U+20);const out=[],top=[];
  L.forEach(({c,T},i)=>{const x0=(i%cols)*11,y0=Math.floor(i/cols)*9;const st=statC(c,ctx);const pc=st?st.pct/100:0;const on=PIL.sel===c.id;let g='';
    g+=bx(P,x0,y0,9,7,0,0.5,{l:'#D9DDD0',r:'#C5CAB9',t:'#ECEFE6',s:'#C9CDBE'})+quad(P,x0+0.8,y0+2.8,x0+8.2,y0+4.3,0.52,'#C8B48E','#B39C72',0.8);
    g+=bx(P,x0+6.6,y0+0.8,1.6,1.2,0.5,0.6,{l:'#C8B48E',r:'#B39C72',t:'#D8C6A2'});
    [[0.25,C.aller],[-0.25,C.retour]].forEach(([o,col])=>{const a=P(x0+1,y0+3.55+o,0.62),m=P(x0+1+7*pc,y0+3.55+o,0.62),b=P(x0+8,y0+3.55+o,0.62);if(pc>0)g+=ln(a,m,col,3);if(pc<1)g+=ln(m,b,'#B9B3CC',2,'4 4');});
    T.slice(0,5).forEach((p,k)=>{const f=P(x0+1.2+k*1.5,y0+6.2,0.5);const av=ctx.avSVG(p,30);g+=av?avatarAt(av,f[0],f[1],2.8*P.hz):figure(f[0],f[1],2.6*P.hz,C.nuit,iniOf(p));});
    out.push(`<g class="${on?'m3d-hit on':'m3d-hit'}" tabindex="0" role="button" aria-label="${esc(c.nom+' : '+Math.round(pc*100)+' % soudé, '+T.length+' sur place aujourd\'hui')}" data-act="x" data-v="monde|pilsel|${esc(c.id)}">${g}<polygon class="m3d-hl" points="${PTS(hull(P,x0,y0,9,7,0,0.5))}" fill="transparent" stroke="${on?C.violet:'transparent'}"/></g>`);
    const tp=P(x0+4.5,y0,0.5);top.push(pill(tp[0],tp[1]-36,cut(c.nom,24),'#FFFFFF',C.nuit,on?C.violet:'#C9BEF0'),pill(tp[0],tp[1]-12,(st?st.pct+' % soudé · ':'')+T.length+' sur place',T.length?C.lav:'#F5F4FA',C.nuit,'#D6CEF2'));});
  if(!L.length)top.push(pill(500,300,'Aucun chantier dans ton secteur','#FFFFFF',C.encre2,'#DDD8EA'));
  return out.join('')+top.join('');}
function pilCard(me,ctx){const L=pilList(me,ctx);const s=ctx.mySecteur(me);const sel=PIL.sel&&L.find(x=>x.c.id===PIL.sel);const nT=L.reduce((a,x)=>a+x.T.length,0);
  return `<div class="m3d-card m3d-pil" data-m3dscene="pilotage"><div class="m3d-top"><div><h3>Les chantiers${s?' · secteur '+esc((ctx.SECTEURS||SECT0)[s]||s):''}</h3><small>${L.length} chantier${L.length>1?'s':''} · ${nT} personne${nT>1?'s':''} sur place aujourd'hui (planning) · la canalisation avance avec les soudures faites</small></div><button type="button" class="m3d-switch" data-act="x" data-v="monde|vue|pil|classique">☰ Masquer</button></div>
    ${viewport('pil',1000,620,scenePilotage(L,ctx),{h:520,aria:'Chantiers du secteur en 3D',bg:'#EEF2F7',home:{s:1,tx:0,ty:0,min:0.7,max:5}})}
    <div class="m3d-side">${sel?chantierCard(sel.c,ctx):''}<div class="m3d-box"><h4>Chantiers</h4>${L.map(({c,T})=>`<button type="button" class="m3d-li${PIL.sel===c.id?' on':''}" data-act="x" data-v="monde|pilsel|${esc(c.id)}"><span>${esc(cut(c.nom,30))}<small>${(s=>s?s.pct+' % soudé · ':'')(statC(c,ctx))}${T.length} sur place</small></span></button>`).join('')||'<div class="hint">—</div>'}</div></div></div>`;}
/* ═══ COMMERCE : la salle d'attente des affaires ═══ */
const COM={sel:null};
const ATT=[['client','Attente client',C.violet],['fournisseur','Attente fournisseur',C.ambre],['soustraitant','Attente sous-traitant',C.ok]];
const affNum=a=>String(a.num||a.id||'');
const relLate=(a,today)=>!!(a.attente&&a.attente.rel&&a.attente.rel<today);
function comList(ctx){return (ctx.affaires()||[]).filter(a=>a&&['preconsult','devis'].includes(a.etat)&&affNum(a)).sort((a,b)=>String(a.nom||'').localeCompare(String(b.nom||'')));}
function sceneCommerce(L,ctx){const P=iso(26,387,145);const out=[],top=[];const today=ctx.today();const H=5;
  out.push(quad(P,0,0,22,12,0,'#F4F2F8','#DDD8EA',1),pg([P(0,0,0),P(22,0,0),P(22,0,H),P(0,0,H)],'#FFFFFF','#DDD8EA',1),pg([P(0,0,0),P(0,12,0),P(0,12,H),P(0,0,H)],'#ECEAF2','#DDD8EA',1),quad(P,-0.3,-0.3,22,0,H,'#B9B3CC'),quad(P,-0.3,0,0,12,H,'#B9B3CC'));
  out.push(quad(P,0.3,0.3,8.7,11.7,0.02,'#F1EEFA','#DDD8EA',1),quad(P,9.3,0.3,21.7,11.7,0.02,'#FFF7E6','#E8C98E',1),onFloor(P,0.8,10.9,0.03,'À TRAVAILLER',12,C.nuit),onFloor(P,9.8,10.9,0.03,'SALLE D\'ATTENTE',12,C.att));
  const work=L.filter(a=>!(a.attente&&a.attente.de));const wait=ATT.map(([k])=>L.filter(a=>a.attente&&a.attente.de===k));
  out.push(onWallX(P,1.2,0,3.7,'À TRAVAILLER · '+work.length,15,C.nuit,800));
  /* bureau : un dossier par affaire à travailler */
  out.push(bx(P,1.5,4.5,6,2.6,0,1.6,{l:'#C9A774',r:'#B08A55',t:'#D9B98A',s:'#9C7A4A'}),bx(P,5.4,4.7,1.8,0.2,1.6,1.2,{l:'#2B1B5A',r:'#22164A',t:'#3A2C78'}));
  work.slice(0,8).forEach((a,j)=>{const x=1.8+(j%4)*0.95,y=4.75+Math.floor(j/4)*1.1;const on=COM.sel===affNum(a);const col=a.etat==='devis'?['#FFE3A6',C.ambre]:['#D9E6F8',C.retour];
    out.push(hit(`data-act="x" data-v="monde|selaff|${esc(affNum(a))}"`,'À travailler : '+(a.nom||affNum(a))+(a.client?' — '+a.client:''),bx(P,x,y,0.8,0.9,1.6,0.14+j*0.01,{l:col[0],r:col[1],t:on?C.violet:col[0],s:col[1]}),hull(P,x,y,0.8,0.9,1.6,0.6)));});
  /* salle d'attente : un coin par attente (client, fournisseur, sous-traitant), enseigne au mur ; le nom de l'affaire au survol (et dans la liste) */
  const SH=['CLIENT','FOURNISSEUR','SOUS-TRAITANT'];
  ATT.forEach(([k,lab,col],r)=>{const x0=9.8+r*4;out.push(pg([P(x0,0,2.6),P(x0+3.8,0,2.6),P(x0+3.8,0,3.5),P(x0,0,3.5)],'#FFFFFF',col,1.5),onWallX(P,x0+0.15,0,2.85,SH[r]+' · '+wait[r].length,9,col,800));
    for(let j=0;j<4;j++){const sx=x0+0.2+(j%2)*1.8,sy=1.3+Math.floor(j/2)*2.6;out.push(bx(P,sx,sy,1.4,1.2,0,0.7,{l:col,r:col,t:'#FFFFFF',s:'#B9B3CC',o:0.85}),bx(P,sx,sy-0.25,1.4,0.25,0.7,1.1,{l:col,r:col,t:'#FFFFFF',s:'#B9B3CC',o:0.85}));
      const a=wait[r][j];if(!a)continue;const f=P(sx+0.7,sy+0.7,0.7);const on=COM.sel===affNum(a);const late=relLate(a,today);
      out.push(hit(`data-act="x" data-v="monde|selaff|${esc(affNum(a))}"`,lab+' : '+(a.nom||affNum(a))+(a.attente.rel?' — relance le '+a.attente.rel.split('-').reverse().join('/'):'')+(late?' (dépassée)':''),figure(f[0],f[1],2.7*P.hz,on?C.violet:col,'')+(late?`<circle cx="${f1(f[0]+9)}" cy="${f1(f[1]-2.7*P.hz-4)}" r="7" fill="${C.bq}" stroke="#fff" stroke-width="2"/><text x="${f1(f[0]+9)}" y="${f1(f[1]-2.7*P.hz)}" text-anchor="middle" font-size="10" font-weight="900" fill="#fff">!</text>`:''),[[f[0]-14,f[1]-2.9*P.hz],[f[0]+14,f[1]-2.9*P.hz],[f[0]+14,f[1]+4],[f[0]-14,f[1]+4]]));}
    if(wait[r].length>4)out.push(onFloor(P,x0+0.3,7.4,0.03,'+'+(wait[r].length-4)+' autres',12,col));});
  return out.join('')+top.join('');}
function affCard(a,ctx){const n=affNum(a);const at=a.attente||{};const E={preconsult:'Préconsultation',devis:'Devis'};
  return `<div class="m3d-box"><h4>${esc(a.nom||n)}</h4><div class="hint" style="margin:0 0 6px">${esc([a.client,a.ville,E[a.etat]||a.etat,a.montant?Math.round(+a.montant).toLocaleString('fr-FR')+' € HT':''].filter(Boolean).join(' · '))}</div>
    <b style="font-size:13.5px">Où en est-elle ?</b><div class="m3d-objs" style="margin:6px 0">${[['','🖥 À travailler']].concat(ATT.map(([k,l])=>[k,l])).map(([k,l])=>`<button type="button" class="${(at.de||'')===k?'on':''}" data-act="x" data-v="monde|att|${esc(n)}|${k}" aria-pressed="${(at.de||'')===k}">${esc(l)}</button>`).join('')}</div>
    ${at.de?`<label class="f">Relance le</label><input class="f" type="date" value="${esc(at.rel||'')}" data-xin="monde|rel|${esc(n)}"><label class="f">Ce qu'on attend</label><input class="f" type="text" maxlength="140" value="${esc(at.note||'')}" placeholder="ex. prix des vannes DN 100" data-xin="monde|note|${esc(n)}">`:''}
    <div class="m3d-btns" style="margin-top:8px"><button class="btn primary" type="button" data-act="af" data-v="open|${esc(n)}">Ouvrir l'affaire</button></div></div>`;}
function comCard(me,ctx){const L=comList(ctx);const sel=COM.sel&&L.find(a=>affNum(a)===COM.sel);const today=ctx.today();const late=L.filter(a=>relLate(a,today)).length;const w=L.filter(a=>a.attente&&a.attente.de).length;
  return `<div class="m3d-card m3d-com" data-m3dscene="commerce"><div class="m3d-top"><div><h3>Salle d'attente des affaires</h3><small>${L.length} affaire${L.length>1?'s':''} à l'étude · ${w} en attente${late?' · <b style="color:'+C.bq+'">'+late+' relance'+(late>1?'s':'')+' dépassée'+(late>1?'s':'')+'</b>':''} · touche une affaire pour dire ce qu'on attend</small></div><button type="button" class="m3d-switch" data-act="x" data-v="monde|vue|com|classique">☰ Masquer</button></div>
    ${viewport('com',1000,600,sceneCommerce(L,ctx),{h:500,aria:'Salle d\'attente des affaires en 3D',bg:'#F5F4FA',home:{s:1,tx:0,ty:0,min:0.7,max:4}})}
    <div class="m3d-side">${sel?affCard(sel,ctx):'<div class="m3d-box"><h4>Comment ça marche</h4><div class="hint">Sur le bureau : les affaires à travailler. Dans la salle : celles qui attendent quelqu\'un, avec la date de relance (en rouge quand elle est passée). Touche une affaire pour la déplacer.</div></div>'}
      <div class="m3d-box"><h4>Toutes les affaires à l'étude</h4>${L.map(a=>`<button type="button" class="m3d-li${COM.sel===affNum(a)?' on':''}" data-act="x" data-v="monde|selaff|${esc(affNum(a))}"><span>${esc(cut(a.nom||affNum(a),30))}<small>${a.attente&&a.attente.de?esc((ATT.find(x=>x[0]===a.attente.de)||[,''])[1])+(a.attente.rel?' · relance '+a.attente.rel.split('-').reverse().join('/'):''):'à travailler'}</small></span>${relLate(a,today)?`<span class="n" style="color:${C.bq}">!</span>`:''}</button>`).join('')||'<div class="hint">Aucune affaire à l\'étude.</div>'}</div></div></div>`;}
/* ═══ RÉGLAGES (administrateur) : allumer, testeurs, dépôts (nom, ville, position), dépôt du magasin ═══ */
let PICK='',LASTCTX=null;
function bindPick(){if(bindPick.done||typeof document==='undefined')return;bindPick.done=true;
  document.addEventListener('click',e=>{const sv=e.target&&e.target.closest&&e.target.closest('svg[data-m3dpick]');if(!sv||!PICK)return;e.preventDefault();e.stopPropagation();const m=sv.getScreenCTM();if(!m)return;
    const pt=sv.createSVGPoint();pt.x=e.clientX;pt.y=e.clientY;const q=pt.matrixTransform(m.inverse());const [lon,lat]=FINV(q.x,q.y);const c=mondeCfg();const k=PICK;PICK='';
    saveMonde({depots:Object.assign({},c.depots,{[k]:Object.assign({},c.depots[k]||{},{lat:Math.round(lat*1e4)/1e4,lon:Math.round(lon*1e4)/1e4})})}).then(r=>{if(LASTCTX){if(r&&r.error)LASTCTX.toast(r.error);LASTCTX.render();}});},true);}
function cfgView(me,ctx){LASTCTX=ctx;ensureLoaded(ctx);bindPick();css();if(!me.admin)return '<div class="card"><div class="eq-s">Réservé à l\'administrateur.</div></div>';const c=mondeCfg();const S=Object.assign({},SECT0,ctx.SECTEURS||{});
  const gens=ctx.people.filter(p=>p.active!==false&&p.poste!=='visiteur').sort((a,b)=>(b.id===me.id)-(a.id===me.id)||ctx.nomC(a).localeCompare(ctx.nomC(b)));const T=new Set(c.testeurs);const isT=p=>idsOf(p).some(x=>T.has(x));
  const marks=Object.keys(S).map(k=>{const d=c.depots[k];if(!d||d.lat==null||d.lon==null)return '';const g=FXY(d.lon,d.lat);return `<circle cx="${f1(g[0])}" cy="${f1(g[1])}" r="9" fill="${C.violet}" stroke="#fff" stroke-width="2"/><text x="${f1(g[0]+13)}" y="${f1(g[1]+5)}" font-size="15" font-weight="700" fill="${C.nuit}">${esc(d.nom||S[k])}</text>`;}).join('');
  const inp=(k,f,lab,t)=>`<div><label class="f">${lab}</label><input class="f" type="${t||'text'}"${t==='number'?' step="any" inputmode="decimal"':''} value="${esc(c.depots[k]&&c.depots[k][f]!=null?c.depots[k][f]:'')}" data-xin="monde|dep|${k}|${f}"></div>`;
  return `<h2 class="vt">🌍 Monde 3D <span class="hint">· Labo · réglages</span></h2>
  <div class="card"><div class="m3d-btns" style="align-items:center"><button class="btn${c.on?' primary':''}" type="button" data-act="x" data-v="monde|on|${c.on?0:1}" style="min-height:48px">${c.on?'🟢 Allumé — éteindre':'⚪ Éteint — allumer'}</button><span class="hint">Éteint : personne ne voit rien de nouveau. Allumé : seulement les testeurs, sur PC (fenêtre ≥ 900 px). Au téléphone, rien ne change.</span></div>${statutHTML(me)}</div>
  <div class="card"><h3 style="margin-top:0">Testeurs · ${gens.filter(isT).length}</h3><div class="m3d-objs">${gens.map(p=>`<button type="button" class="${isT(p)?'on':''}" data-act="x" data-v="monde|tst|${esc(p.id)}" aria-pressed="${isT(p)}">${esc(ctx.nomC(p))}${p.id===me.id?' (moi)':''}</button>`).join('')}</div></div>
  <div class="card"><h3 style="margin-top:0">Dépôts</h3><div class="hint" style="margin:0 0 8px">Un dépôt par secteur. Les personnes y sont rattachées par le secteur de leur fiche ; sa taille suit le nombre de personnes. Pour le placer : « 📍 Placer », puis clique sur la carte (ou tape latitude / longitude).</div>
    ${Object.keys(S).map(k=>`<div class="m3d-box" style="margin-bottom:8px"><h4>Secteur ${esc(S[k])}</h4><div style="display:grid;grid-template-columns:repeat(4,minmax(0,1fr));gap:8px">${inp(k,'nom','Nom')}${inp(k,'ville','Ville')}${inp(k,'lat','Latitude','number')}${inp(k,'lon','Longitude','number')}</div>
      <div class="m3d-btns" style="margin-top:6px"><button type="button" class="btn${PICK===k?' primary':''}" data-act="x" data-v="monde|pick|${k}">📍 ${PICK===k?'Clique sur la carte…':'Placer sur la carte'}</button><button type="button" class="btn${c.magasin===k?' primary':''}" data-act="x" data-v="monde|mag|${k}" aria-pressed="${c.magasin===k}">${c.magasin===k?'📦 Le stock suivi est ici':'📦 Le stock suivi est ici ?'}</button><button type="button" class="btn${c.depots[k]&&c.depots[k].siege?' primary':''}" data-act="x" data-v="monde|siege|${k}" aria-pressed="${!!(c.depots[k]&&c.depots[k].siege)}">${c.depots[k]&&c.depots[k].siege?'🏛 C\'est le siège':'🏛 Siège ?'}</button></div></div>`).join('')}
    <svg viewBox="100 80 800 520" data-m3dpick="1" style="width:100%;max-width:560px;display:block;margin:8px auto 0;cursor:${PICK?'crosshair':'default'};background:#E4EDF6;border-radius:12px" role="img" aria-label="Carte de France des dépôts">${pg(FR.map(([a,b])=>FXY(a,b)),'#F3F1EA','#CFC9E0',1.5)}${pg(CORSE.map(([a,b])=>FXY(a,b)),'#F3F1EA','#CFC9E0',1.5)}${marks}</svg></div>
  ${quiOu(gens,S,c,ctx)}`;}
/* 08/11 : « où j'attribue qui est Ouest, IDF, Sud-Est, Sud-Ouest ? » — le secteur de rattachement de chacun, au même endroit (même donnée que le Planning) */
function quiOu(gens,S,c,ctx){const keys=Object.keys(S).filter(k=>k!=='autres');const nomDep=k=>(c.depots[k]&&c.depots[k].nom)||('Dépôt '+S[k]);const siegeK=keys.find(k=>c.depots[k]&&c.depots[k].siege)||(S.ouest?'ouest':keys[0]||'');
  const sectOf=p=>{let s='';try{s=ctx.secteurDe(p)||'';}catch(e){}return S[s]&&s!=='autres'?s:'';};const auto=p=>{let s='';try{s=ctx.mySecteur?ctx.mySecteur(p)||'':'';}catch(e){}return S[s]&&s!=='autres'?s:'';};
  const sans=gens.filter(p=>!sectOf(p));const ro=!!(ctx.viewing&&ctx.viewing());
  const row=p=>{const s=sectOf(p);const a=s?'':auto(p);let pl='';try{pl=ctx.posteLabel?ctx.posteLabel(p):'';}catch(e){}
    return `<div class="m3d-qo"><span><b>${esc(ctx.nomC(p))}</b><small>${esc(pl)}${s?'':a?' · en attendant : '+esc(nomDep(a))+' (ses chantiers)':' · en attendant : au siège ('+esc(nomDep(siegeK))+')'}</small></span><select class="f" data-xin="monde|sect|${esc(p.id)}"${ro?' disabled':''} aria-label="Secteur de ${esc(ctx.nomC(p))}"><option value=""${s?'':' selected'}>— à régler —</option>${keys.map(k=>`<option value="${k}"${s===k?' selected':''}>${esc(S[k])} · ${esc(nomDep(k))}</option>`).join('')}</select></div>`;};
  return `<div class="card" id="m3d-quiou"><h3 style="margin-top:0">Qui est dans quel dépôt · ${gens.length}</h3><div class="hint" style="margin:0 0 8px">Le secteur de rattachement de chacun : c'est le même réglage que « Secteur de rattachement » dans le Planning. ${sans.length?`<b>${sans.length} personne${sans.length>1?'s':''} sans secteur</b> : rangée${sans.length>1?'s':''} en attendant au dépôt de ses chantiers, sinon au siège.`:'Tout le monde a son secteur.'}</div>
    ${['',...keys].map(k=>{const L=gens.filter(p=>sectOf(p)===k);if(!L.length)return '';return `<div class="m3d-box" style="margin-bottom:8px"><h4>${k?esc(S[k])+' · '+esc(nomDep(k)):'⚠ Sans secteur'} · ${L.length}</h4>${L.map(row).join('')}</div>`;}).join('')}</div>`;}
/* ═══ ACTIONS (data-act="x" data-v="monde|…") et CHAMPS (data-xin="monde|…") ═══ */
function act(v,el,me,ctx){const q=String(v).split('|');const k=q[0],a=q[1]||'',b=q[2]||'';const R=()=>ctx.render();
  if(k==='vue'){setVue(a,b==='3d'?'3d':'classique');if(b!=='3d')glDispose();R();return;}
  if(k==='perso'){PERSO=a==='1';R();return;}
  if(k==='pd'||k==='pm'||k==='po'){if(ctx.viewing()){ctx.toast('Lecture seule : tu vois l\'appli comme quelqu\'un d\'autre');return;}const data=ctx.peopleData(me.id)||{};const pf=prefsOf(data);
    if(k==='pd'&&DESK[a])pf.d=a;else if(k==='pm'&&MUR[a])pf.m=a;else if(k==='po'&&OBJ.some(x=>x[0]===a))pf.o=pf.o.includes(a)?pf.o.filter(x=>x!==a):pf.o.concat([a]);else return;
    ctx.savePart(me.id,'avatar',Object.assign({},data.avatar||{},{bureau:pf}));R();return;}
  if(k==='go'){if(a==='france'){W.lvl='france';W.selp=null;}else if(a.indexOf('depot:')===0){W.lvl='depot';W.sect=a.slice(6);W.selp=null;}else if(a.indexOf('bureau:')===0){W.lvl='bureau';W.key=a.slice(7);}R();return;}
  if(k==='selp'){W.selp=W.selp===a?null:a;R();return;}
  if(k==='selch'){W.selch=W.selch===a?null:a;R();return;}
  if(k==='pilsel'){PIL.sel=PIL.sel===a?null:a;R();return;}
  if(k==='selaff'){COM.sel=COM.sel===a?null:a;R();return;}
  if(k==='open'){if(ctx.api&&ctx.api.openSite)ctx.api.openSite(a);return;}
  if(k==='selmag'){ctx.toast('Le stock suivi est réglé dans un autre dépôt (Équipe → 🌍 Monde 3D → Réglages)');return;}
  if(k==='att'){if(ctx.viewing()){ctx.toast('Lecture seule : tu vois l\'appli comme quelqu\'un d\'autre');return;}const A0=(ctx.affaires()||[]).find(x=>affNum(x)===a);if(!A0)return;const at=A0.attente||{};
    if(!b)ctx.affSet(a,{attente:null});else{const d=new Date();d.setDate(d.getDate()+7);ctx.affSet(a,{attente:{de:b,rel:at.rel||d.toISOString().slice(0,10),note:at.note||'',at:new Date().toISOString(),by:ctx.nomC(me)}});}
    COM.sel=a;R();return;}
  if(k==='wide'){try{const b=document.getElementById('homeWide');if(b)b.click();else{try{localStorage.setItem('trace:wide','1');}catch(e){}const a=document.getElementById('app');if(a)a.classList.add('wide');}}catch(e){}setTimeout(R,60);return;}
  if(k==='cfg'){ctx.go('x:monde:cfg');return;}
  if(!me.admin)return;
  if(k==='on'){saveMonde({on:a==='1'}).then(r=>{ctx.toast(r.error?r.error:(a==='1'?'🌍 Monde 3D allumé pour les testeurs (PC)':'Monde 3D éteint')+(r.where==='serveur'?' — enregistré pour tout le monde':' — sur cet appareil seulement'));R();});return;}
  if(k==='tst'){const c=mondeCfg();const p=ctx.people.find(x=>x.id===a);if(!p)return;const ids=idsOf(p);const T=new Set(c.testeurs);const on=ids.some(x=>T.has(x));ids.forEach(x=>{if(on)T.delete(x);else T.add(x);});saveMonde({testeurs:[...T]}).then(r=>{if(r.error)ctx.toast(r.error);R();});return;}
  if(k==='mag'){saveMonde({magasin:mondeCfg().magasin===a?'':a}).then(r=>{if(r.error)ctx.toast(r.error);R();});return;}
  if(k==='siege'){const c=mondeCfg();const S=Object.assign({},SECT0,ctx.SECTEURS||{});if(!S[a])return;const on=!(c.depots[a]&&c.depots[a].siege);const dep={};Object.keys(Object.assign({},S,c.depots)).forEach(kk=>{if(!/^[a-z0-9_-]{1,24}$/.test(kk))return;dep[kk]=Object.assign({},c.depots[kk]||{},{siege:on&&kk===a});});saveMonde({depots:dep}).then(r=>{if(r.error)ctx.toast(r.error);R();});return;}
  if(k==='pick'){PICK=PICK===a?'':a;R();return;}}
function input(champ,el,me,ctx,type){if(type!=='change')return;const q=String(champ).split('|');const k=q[0],a=q[1]||'',b=q[2]||'';
  if(k==='sect'){if(!me.admin)return;if(ctx.viewing&&ctx.viewing()){ctx.toast('Lecture seule : tu vois l\'appli comme quelqu\'un d\'autre');return;}const p=ctx.people.find(x=>x.id===a);if(!p)return;const v=String(el.value||'');const S=Object.assign({},SECT0,ctx.SECTEURS||{});if(v&&!S[v])return;ctx.savePart(a,'secteur',v||null);ctx.toast(ctx.nomC(p)+' : '+(v?'secteur '+S[v]:'secteur retiré'));ctx.render();return;}
  if(k==='rel'||k==='note'){if(ctx.viewing())return;const A0=(ctx.affaires()||[]).find(x=>affNum(x)===a);if(!A0||!A0.attente)return;const at=Object.assign({},A0.attente);if(k==='rel')at.rel=String(el.value||'').slice(0,10);else at.note=String(el.value||'').slice(0,140);ctx.affSet(a,{attente:at});ctx.render();return;}
  if(k==='dep'&&me.admin&&['nom','ville','lat','lon'].includes(b)){const c=mondeCfg();const dep=Object.assign({},c.depots[a]||{});dep[b]=String(el.value||'').trim();saveMonde({depots:Object.assign({},c.depots,{[a]:dep})}).then(r=>{if(r.error)ctx.toast(r.error);ctx.render();});}}
/* ═══ DIAGNOSTIC (07/11 : « je ne vois aucune différence alors que j'ai bien allumé ») — option allumée, administrateur ou testeur : dire ce qui manque ═══ */
const isTesteur=p=>{const T=new Set(mondeCfg().testeurs);return idsOf(p).some(x=>T.has(x));};
const appWide=()=>{try{const a=document.getElementById('app');return !!a&&a.classList.contains('wide');}catch(e){return false;}};
function manques(me){const c=mondeCfg();const L=[];if(!c.on)L.push(['on','l\'option est éteinte']);if(!isTesteur(me))L.push(['tst','tu n\'es pas dans les testeurs']);
  if(typeof window!=='undefined'&&(window.innerWidth||0)<900)L.push(['fen','la fenêtre fait moins de 900 px de large']);if(!appWide())L.push(['wide','l\'affichage large (ordinateur) n\'est pas activé']);return L;}
function diagHTML(me){const c=mondeCfg();if(!c.on||!(me.admin||isTesteur(me)))return '';css();const L=manques(me);if(!L.length)return '';
  const b=[];if(L.some(x=>x[0]==='wide'))b.push(`<button type="button" class="btn primary" data-act="x" data-v="monde|wide">⤢ Passer en affichage large</button>`);if(L.some(x=>x[0]==='tst')&&me.admin)b.push(`<button type="button" class="btn${b.length?'':' primary'}" data-act="x" data-v="monde|tst|${esc(me.id)}">Me mettre testeur</button>`);if(me.admin)b.push(`<button type="button" class="btn" data-act="x" data-v="monde|cfg">⚙ Réglages</button>`);
  return `<div class="card m3d-diag" style="border:1px solid #C9BEF0;background:#F5F2FD;margin:0 0 12px"><b>🌍 Monde 3D allumé, mais pas encore visible ici :</b> ${L.map(x=>esc(x[1])).join(' · ')}.${L.some(x=>x[0]==='fen')?' Agrandis la fenêtre.':''}<div class="m3d-btns" style="margin-top:8px">${b.join('')}</div></div>`;}
function statutHTML(me){const L=manques(me).filter(x=>x[0]!=='on');const w=typeof window!=='undefined'?window.innerWidth||0:0;const ok=k=>!L.some(x=>x[0]===k);const c=mondeCfg();
  return `<div class="hint" style="margin-top:8px">Toi : ${ok('tst')?'✓':'✗'} testeur · ${ok('wide')?'✓':'✗'} affichage large · ${ok('fen')?'✓':'✗'} fenêtre ${w} px${c.at?' · réglage enregistré le '+esc(new Date(c.at).toLocaleString('fr-FR'))+(c.by?' par '+esc(c.by):''):''}${API&&API.state&&API.state.cloudUser?'':' · <b>hors connexion : enregistré sur cet appareil seulement</b>'}</div>`;}
/* ═══ BRANCHEMENTS (espace.js) ═══ */
function hubTop(tab,me,ctx){ensureLoaded(ctx);if(!mondeFor(me))return '';const k=tab==='entreprise'?'eq':tab==='pilotage'?'pil':tab==='commerce'?'com':tab==='parc'?'fl':tab==='magasin'?'mag':'';if(!k)return '';if(vueOf(k)==='classique')return switch3D(k);
  if(glAvailable()){const kind={eq:'monde',pil:'pilotage',com:'commerce',fl:'flotte',mag:'magasin'}[k];return glBar(k)+glSlot(kind,me,ctx,{cfg:mondeCfg()});}
  if(k==='fl'||k==='mag')return '';
  try{return k==='eq'?mondeCard(me,ctx):k==='pil'?pilCard(me,ctx):comCard(me,ctx);}catch(e){console.warn('monde',e);return '';}}
const glBar=k=>`<div class="m3d-btns" style="justify-content:flex-end;margin:0 0 8px"><button type="button" class="m3d-switch" data-act="x" data-v="monde|vue|${k}|classique" title="Revenir à l'affichage habituel">☰ Vue classique</button></div>`;
/** le Bureau du chantier (next.js) : le vrai réseau en 3D ; sans WebGL ou sans contexte, le réseau « raccordé » en SVG */
export function chantier3D(B,NET,A){if(!glAvailable()||!CTX0)return raccordeHTML(B,NET&&NET.name);const me=A.current&&A.current();if(!me)return raccordeHTML(B,NET&&NET.name);const p=CTX0.people.find(x=>idsOf({id:x.id,acc:x.acc,email:x.email,_acc:x._acc}).some(y=>idsOf(me).includes(y)))||CTX0.people[0];if(!p)return raccordeHTML(B,NET&&NET.name);
  const D=((B&&B.dash)||[]).filter(d=>d&&d.key!=='meteo').map(d=>({key:d.key,lab:d.short||d.lab,k:d.k||'off',v:d.v||'',tab:racTab(d)}));const team=(B.eq||[]);
  const extra={cfg:mondeCfg(),network:networkOf(A.state&&A.state.lines),checklist:D,chantier:{id:NET.id,nom:NET.name,pct:B.pc,total:null,team:CTX0.people.filter(x=>team.some(n=>String(n).trim().toLowerCase()===String(x.prenom||'').trim().toLowerCase()||String(n).trim().toLowerCase()===CTX0.nomC(x).trim().toLowerCase())).map(x=>({id:x.id,prenom:x.prenom,posteLabel:CTX0.posteLabel(x),svg:CTX0.avSVG(x,240)})),chaufferie:'CHAUFFERIE'},
    onBur:t=>{if(t==='__orga'){if(A.goExpl)A.goExpl('orga');return;}if(t==='__valid'){if(A.goExpl)A.goExpl('valid');return;}if(A.tabAllowed&&!A.tabAllowed(t)){A.toast('Onglet non accessible avec tes droits');return;}A.state.tab=t;A.renderAll();},onWeld:id=>{A.toast('Soudure '+id+' : ouvre-la depuis le plan ou la liste');},onClassic:()=>{setVue('ch','classique');A.renderAll();}};
  if(vueOf('ch')==='classique')return switch3D('ch');return glSlot('chantier',p,CTX0,extra);}
function accueil(me,ctx,o){ensureLoaded(ctx);if(!mondeFor(me)){const h=diagHTML(me);return h?{top:h}:null;}if(vueOf('acc')==='classique')return {top:switch3D('acc')};
  if(glAvailable()){css();const side=o.side||{};return {html:`<div class="m3d-acc3d">${o.side&&o.side.hello||''}${glBar('acc')}${glSlot('bureau',me,ctx,{cfg:mondeCfg(),todo:o.todo,know:o.know,spaces:o.spaces,homeChips:[{k:'jour',t:'⏱ Ma journée',html:()=>(typeof side.pointer==='function'?side.pointer():side.pointer||'')}] /* 08/11 nuit (Ethan : « plein écran, on s'en fout du côté ») : plus de colonne ; « À faire » / « À savoir » sont sur les écrans et le tableau, le pointage du jour par-dessus la 3D */})}</div>`};}
  try{const data=ctx.peopleData(me.id)||{};const d=new Date((ctx.today()||'')+'T12:00:00');const M=['JANV.','FÉVR.','MARS','AVRIL','MAI','JUIN','JUIL.','AOÛT','SEPT.','OCT.','NOV.','DÉC.'];
    const jour=isNaN(d.getTime())?null:{n:String(d.getDate()),mois:M[d.getMonth()],sem:'semaine '+(o.sem||'')};
    return {html:accueilCard({me,pref:prefsOf(data),av:ctx.avSVG(me,150),todo:o.todo,know:o.know,spaces:o.spaces,jour,poste:ctx.posteLabel(me),side:o.side})};}catch(e){console.warn('monde',e);return null;}}
function hubRows(tab,me,ctx){if(tab!=='entreprise'||!me.admin||!ctx.row)return [];ensureLoaded(ctx);const c=mondeCfg();const T=new Set(c.testeurs);const n=ctx.people.filter(p=>idsOf(p).some(x=>T.has(x))).length;
  return [ctx.row('🌍 Monde 3D · Labo',(c.on?'Allumé · '+n+' testeur'+(n>1?'s':''):'Éteint')+' · dépôts, testeurs, magasin','🌍','#E6E1F6','x:monde:cfg',null)];}
function xview(k,me,ctx){return k==='cfg'?cfgView(me,ctx):null;}
function moiSubs(me,ctx){ensureLoaded(ctx);if(!mondeFor(me)||!glAvailable())return [];return [['bureau3d','🪑 Mon bureau 3D',0,false]];}
function view(sub,me,ctx){if(sub!=='bureau3d'||!mondeFor(me)||!glAvailable())return null;return `<h2 class="vt">Mon bureau 3D <span class="hint">· couleurs, matières, objets, raccourcis</span></h2><div class="hint" style="margin:0 0 8px">Ce que tu arranges ici est ton accueil, et ce que tes collègues voient de toi dans le dépôt.</div>`+glSlot('bureau',me,ctx,{cfg:mondeCfg(),perso:true,todo:[],know:[],spaces:(ctx.spaces||[])});}
export function setChantierVue(v){setVue('ch',v==='3d'?'3d':'classique');if(v!=='3d')glDispose();}
export default {id:'monde',hub:'entreprise',hubTop,accueil,hubRows,xview,act,input,moiSubs,view};
