// mutucal.js — LOT MU (16/10 soir) : CALAGE d'une étude sur un chantier en cours, dans le traceur, avant de la rattacher (chantier mutualisé, option A d'Ethan).
// Ouvert par l'appli quand les deux tracés ne sont pas tous les deux géoréférencés (ou pour vérifier) : traceur.html?site=<chantier>&mutu=<étude>&maff=<n° d'affaire>
// → contexte « site: » du CHANTIER (jamais celui de l'étude). L'étude est posée par-dessus comme un PLAN DE FOND PROVISOIRE (violet, plan actif) : mêmes outils que le
// calage d'un plan — ✥ glisser (1 point), ⟲ 2 points (① ② sur l'étude, ③ ④ les mêmes endroits sur le chantier, aimantés), rotation. « ✓ Valider le calage » : la
// transformation, RIGIDE (l'étude garde ses longueurs, donc ses quantités), part à l'appli (localStorage trace:mutu:cal) qui fusionne et enregistre — le traceur n'écrit
// RIEN dans le chantier : le plan provisoire (p.mutuTmp) est écarté du résumé local, d'IndexedDB et de l'enregistrement (main.js), le bouton 💾 est masqué.
import {kv} from '../src/kv.js';
import {sync} from '../src/sync.js';
import {tfNorm,tfApply,tfCompose,tfBBox,drawingBox} from '../src/plans.js';
import {decimateDrawing} from '../src/dxfimport.js';
import {rigid,tfFromGeo,linesBox,marcheView} from '../src/mutufus.js';
import {axisOf} from '../src/marche.js';
const Q=new URLSearchParams(location.search);const P={site:Q.get('site')||'',etude:Q.get('mutu')||'',aff:Q.get('maff')||''}; /* capté AVANT le nettoyage de l'adresse (main.js) */
const TMP='mutu_tmp',REQ='trace:mutu:req',CAL='trace:mutu:cal';
const esc=s=>String(s??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const fm=(v,d)=>(+v||0).toLocaleString('fr-FR',{maximumFractionDigits:d===undefined?1:d});
const lsGet=k=>{try{return JSON.parse(localStorage.getItem(k)||'null');}catch(e){return null;}};
/* tracé marché VU dans le traceur d'un chantier mutualisé : chaque ligne comparée au marché de SON affaire (main.js : couche marché, écarts, fiche, enregistrement) */
export const mvOf=r=>{if(!r)return null;const M=r.marche||null;return M?marcheView(M,r.full&&r.full.marchesAff):M;};
let X=null,E=null,C=null,bar=null,started=false,center=[0,0],how='',eV=[],one=null,pd=null;
export const active=()=>!!(P.site&&P.etude&&P.aff);
export function init(api){X=api;if(!active())return;css();show(`⏳ Chargement du chantier et de l'étude ${esc(P.aff)} à caler…`,'');let n=0;const t=setInterval(()=>{n++;const r=X.state.siteRef;if(r&&r.id===P.site){clearInterval(t);setTimeout(()=>start().catch(e=>{console.warn(e);fail('calage impossible : '+(e.message||e));}),350);}else if(n>200){clearInterval(t);fail('chantier introuvable dans le traceur');}},200);}
function css(){if(document.getElementById('css-lot-mu'))return;const s=document.createElement('style');s.id='css-lot-mu';s.textContent=`
#muCal{position:absolute;left:50%;top:92px;transform:translateX(-50%);z-index:12;width:min(640px,96%);background:#2d1a52;color:#fff;border-radius:14px;padding:9px 11px;font-size:13px;box-shadow:0 8px 26px rgba(0,0,0,.32);display:flex;flex-direction:column;gap:7px}
#muCal .t{line-height:1.35}#muCal .t b{color:#e6dbff}#muCal .st{font-size:12px;color:#d9cff2}#muCal .row{display:flex;flex-wrap:wrap;gap:6px}
#muCal button{min-height:40px;border-radius:9px;border:1px solid #fff;background:#fff;color:#1d1236;padding:6px 11px;font-size:13px;font-weight:600;cursor:pointer}
#muCal button.on{background:#e6dbff;border-color:#e6dbff}#muCal button.go{background:#3aa655;border-color:#3aa655;color:#fff}#muCal button.ko{background:transparent;color:#fff}
body.mu-cal #bSave{display:none!important}
@media (max-width:800px){#muCal{position:fixed;left:0;right:0;bottom:0;top:auto;transform:none;width:auto;border-radius:14px 14px 0 0;max-height:52vh;overflow:auto;padding:8px 10px;font-size:12.5px}#muCal button{flex:1 1 auto}}`;document.head.appendChild(s);}
function show(t,st,btns){if(!bar){bar=document.createElement('div');bar.id='muCal';bar.setAttribute('role','region');bar.setAttribute('aria-label','Calage de l\'étude sur le chantier');(X.main||document.body).appendChild(bar);bar.addEventListener('click',onClick);}
  bar.innerHTML=`<div class="t">${t}</div>${st?`<div class="st" id="muCalSt">${st}</div>`:''}${btns?`<div class="row">${btns}</div>`:''}`;}
function fail(msg){show(`⚠ Rattachement : ${esc(msg)}`,'',`<button type="button" data-mc="back" class="ko">↩ Retour à l'affaire ${esc(P.aff)}</button>`);}
async function getSite(id){let s=null;try{s=await kv.get('trace:handoff:'+id);}catch(e){}if(s&&Array.isArray(s.lines)&&!s.bgTooBig)return s;
  try{const x=await Promise.race([sync.loadSite(id),new Promise(r=>setTimeout(()=>r(null),10000))]);if(x&&Array.isArray(x.lines)&&!x.deleted)return x;}catch(e){}
  if(s&&Array.isArray(s.lines))return s;try{const y=JSON.parse(localStorage.getItem('trace:handoff:'+id)||'null');if(y&&Array.isArray(y.lines))return y;}catch(e){}return null;}
const plan=()=>(X.bgPlans()||[]).find(p=>p.id===TMP)||null;
async function start(){if(started)return;started=true;E=await getSite(P.etude);C=await getSite(P.site);if(!E||!Array.isArray(E.lines)||!E.lines.length){fail('étude « '+P.etude+' » introuvable sur cet appareil');return;}
  const lines=E.lines.length?E.lines:((E.traceur&&E.traceur.lines)||[]);const lb=linesBox(lines);if(!lb){fail('l\'étude n\'a pas de ligne');return;}center=[(lb[0]+lb[2])/2,(lb[1]+lb[3])/2];
  const req=lsGet(REQ);let T0=null;if(req&&req.aff===P.aff&&req.site===P.site&&req.T0){T0=tfNorm(req.T0);how='position proposée (géoréférencement) : vérifie, ajuste si besoin, puis valide';}
  if(!T0&&C){const g=tfFromGeo(E,C);if(g&&g.ok){T0=g.T;how='placée par le géoréférencement des deux tracés : vérifie, ajuste si besoin, puis valide';}}
  if(!T0){const cl=(X.state.lines||[]).length?linesBox(X.state.lines):null;const w=lb[2]-lb[0],h=lb[3]-lb[1];const tx=cl?cl[2]+30+w/2:center[0],ty=cl?(cl[1]+cl[3])/2:center[1];T0={tx:tx-center[0],ty:ty-center[1],rot:0,k:1};how='posée à côté du chantier : 📍 1 point (un point de l\'étude puis le même sur le chantier), ✥ glisser ou ⟲ 2 points';}
  const dr=[];if(Array.isArray(E.drawing)&&E.drawing.length){let d=E.drawing;try{const r=decimateDrawing(d,{cap:40000});if(r&&r.drawing)d=r.drawing;}catch(e){}d.forEach(x=>{if(!x||x.fill)return;const o=Object.assign({},x,{c:'#cdbfe6',net:false});delete o.w;delete o.p;dr.push(o);});}
  lines.forEach(l=>{const ax=axisOf(l);if(ax.length<2)return;dr.push({pts:ax.map(p=>[+p[0],+p[1]]),c:'#6a32c9',w:160,net:true});const m=ax[Math.floor((ax.length-1)/2)];dr.push({text:String(l.name||l.id),x:+m[0],y:+m[1],h:2.4,c:'#4b2a86',net:true});});
  const b=X.bgObj();b.plans=(b.plans||[]).filter(p=>p.id!==TMP);b.plans.push({id:TMP,mutuTmp:true,kind:'dxf',name:'Étude '+P.aff+' (à caler)',show:true,opacity:1,geo:'manual',transform:tfNorm(T0),drawing:dr,bbox:drawingBox(dr),origin:null,netLayers:[],images:[],report:null,_lastKey:null});
  b.active=TMP;b.show=true;document.body.classList.add('mu-cal');X.renderBg();X.bgToolsSync();ui();frame();
  eV=[];lines.forEach(l=>axisOf(l).forEach(p=>eV.push([+p[0],+p[1]])));
  X.state.mutuCal={tmp:TMP,center};document.addEventListener('pointerup',()=>setTimeout(ui,30),true);document.addEventListener('keyup',()=>setTimeout(ui,30),true);
  if(X.svg){X.svg.addEventListener('pointerdown',e=>{pd={x:e.clientX,y:e.clientY};},true);X.svg.addEventListener('pointerup',e=>{if(!one||!pd)return;const mv=Math.hypot(e.clientX-pd.x,e.clientY-pd.y);pd=null;if(mv>6)return;onePick(toW(e.clientX,e.clientY));});}}
/* 📍 1 point : ① un point de l'étude (aimanté à ses sommets), ② le même endroit sur le chantier (aimanté aux sommets du chantier) → l'étude glisse d'autant (le traceur est en « déplacer le plan » : un simple clic n'y sélectionne rien) */
function toW(cx,cy){const r=X.svg.getBoundingClientRect();const v=X.state.view;return [(cx-r.left-v.tx)/v.k,(cy-r.top-v.ty)/v.k];}
function onePick(p){const pl=plan();if(!pl||!one)return;const tol=14/((X.state.view&&X.state.view.k)||1);
  if(!one.a){const T=tfNorm(pl.transform);let best=null;eV.forEach(q=>{const w=tfApply(T,q);const d=Math.hypot(w[0]-p[0],w[1]-p[1]);if(d<tol&&(!best||d<best.d))best={d,w};});one.a=best?best.w:p;ui();return;}
  let best=null;(X.state.lines||[]).forEach(l=>(l.pts||[]).forEach(q=>{const d=Math.hypot(q[0]-p[0],q[1]-p[1]);if(d<tol&&(!best||d<best.d))best={d,q};}));const b=best?best.q:p;
  pl.transform=tfCompose({tx:b[0]-one.a[0],ty:b[1]-one.a[1],rot:0,k:1},tfNorm(pl.transform));pl._lastKey=null;one=null;X.setMode('select');X.renderBg();ui();X.flash('Étude posée par 1 point'+(best?' (aimanté au chantier)':''));}
function ui(){const p=plan();if(!p)return;const t=tfNorm(p.transform);const r=rigid(t,center);const q=tfApply(r,center);const m=X.state.mode;
  const st=`rotation ${fm(r.rot,2)}° · centre de l'étude en (${fm(q[0],1)} ; ${fm(q[1],1)}) m${Math.abs(t.k-1)>0.0005?` · échelle ×${fm(t.k,4)} ignorée : l'étude garde ses longueurs`:''}`;
  const btn=(k,l,on,cls)=>`<button type="button" data-mc="${k}" class="${on?'on':''} ${cls||''}">${l}</button>`;
  const st1=one?(one.a?'② touche maintenant le MÊME endroit sur le chantier':'① touche un point de l\'étude (violet), près d\'un sommet'):'';
  show(`🔗 Rattacher l'étude « <b>${esc(E.name||P.etude)}</b> » (affaire <b>${esc(P.aff)}</b>, en violet) au chantier « <b>${esc((X.state.siteRef||{}).name||P.site)}</b> » — ${esc(how)}.`,st1?`<b>📍 ${esc(st1)}</b>`:st,
    btn('one','📍 1 point',!!one)+btn('move','✥ Glisser l\'étude',m==='moveBg'&&!one)+btn('cal2','⟲ 2 points',m==='cal2')+btn('rl','↺ 1°')+btn('rr','↻ 1°')+btn('ok','✓ Valider le calage',false,'go')+btn('back','✕ Annuler',false,'ko'));}
/* cadrage : le chantier et l'étude, sans que la barre de calage les cache */
function frame(){try{const p=plan();const cl=linesBox(X.state.lines||[]);const eb=p?tfBBox(tfNorm(p.transform),linesBox(E.lines.length?E.lines:((E.traceur&&E.traceur.lines)||[]))):null;const B=cl&&eb?[Math.min(cl[0],eb[0]),Math.min(cl[1],eb[1]),Math.max(cl[2],eb[2]),Math.max(cl[3],eb[3])]:(cl||eb);if(!B||!X.fitBox){if(X.fitPlans)X.fitPlans();return;}
  X.fitBox(B[0],B[1],B[2],B[3]);if(!bar||!X.svg)return;const s=X.svg.getBoundingClientRect(),r=bar.getBoundingClientRect();const k=(X.state.view&&X.state.view.k)||1;const top=r.top<s.top+s.height/2;
  const lg=X.main&&X.main.querySelector('.legend');const lr=lg?lg.getBoundingClientRect():null;let oT=top?Math.max(0,r.bottom-s.top):0,oB=top?0:Math.max(0,s.bottom-r.top);if(lr&&lr.height)oB=Math.max(oB,s.bottom-lr.top); /* la légende du traceur, en bas */
  if(oT+oB<4||oT+oB>s.height*.8)return;X.fitBox(B[0],B[1]-(oT?oT+8:0)/k,B[2],B[3]+(oB?oB+8:0)/k);}catch(e){console.warn(e);}}
function rot(d){const p=plan();if(!p)return;const c=tfApply(tfNorm(p.transform),center);p.transform=tfCompose({tx:c[0],ty:c[1],rot:d,k:1},tfCompose({tx:-c[0],ty:-c[1],rot:0,k:1},tfNorm(p.transform)));p._lastKey=null;X.renderBg();ui();}
function onClick(e){const b=e.target.closest('[data-mc]');if(!b)return;const k=b.dataset.mc;const bg=X.bgObj();if(plan())bg.active=TMP;
  if(k==='one'){if(one){one=null;X.setMode('select');}else{one={a:null};X.setMode('moveBg');}ui();}
  else if(k==='move'){one=null;X.setMode(X.state.mode==='moveBg'?'select':'moveBg');ui();}else if(k==='cal2'){one=null;X.setMode(X.state.mode==='cal2'?'select':'cal2');ui();}
  else if(k==='rl')rot(-1);else if(k==='rr')rot(1);else if(k==='ok')validate();else if(k==='back')leave(false);}
/* la transformation validée (rigide, autour du centre de l'étude) part à l'appli — rien n'est enregistré ici */
export function validate(){const p=plan();if(!p)return null;const t=tfNorm(p.transform);const T=rigid(t,center);const req=lsGet(REQ)||{};
  const out={aff:P.aff,site:P.site,etude:P.etude,T,k:+(+t.k).toFixed(5),gain:!!(req.aff===P.aff&&req.gain),at:new Date().toISOString()};try{localStorage.setItem(CAL,JSON.stringify(out));localStorage.removeItem(REQ);}catch(e){}leave(true);return out;}
function leave(ok){const b=X.bgObj();b.plans=(b.plans||[]).filter(p=>p.id!==TMP);if(b.active===TMP)b.active=b.plans.length?b.plans[b.plans.length-1].id:null;X.renderBg();X.setMode('select');document.body.classList.remove('mu-cal');
  if(!ok){try{localStorage.removeItem(REQ);}catch(e){}}X.flash(ok?'Calage validé : retour à l\'affaire pour confirmer le rattachement':'Rattachement abandonné : retour à l\'affaire');
  setTimeout(()=>{location.href='./index.html?aff='+encodeURIComponent(P.aff)+'&v='+Date.now().toString(36);},ok?250:150);}
/* enregistrement du traceur sur un chantier partagé : la copie ouverte ici est-elle périmée — une affaire rattachée (ou un rattachement annulé) ailleurs depuis
   l'ouverture ? (historique site.mutu.hist du serveur ≠ celui chargé ici ; une ligne supprimée dans le traceur n'est PAS un motif) */
const sig=m=>((m&&Array.isArray(m.hist))?m.hist:[]).map(h=>h?[h.aff,h.at,h.undoneAt||''].join('|'):'').join(',');
export function stale(srv,ref){if(!srv||!ref)return false;return sig(srv.mutu)!==sig(ref.full&&ref.full.mutu);}
/* tests */
export function testApi(){return {one:()=>one&&{a:one.a},params:()=>Object.assign({},P),plan:()=>{const p=plan();return p?{id:p.id,transform:tfNorm(p.transform),n:(p.drawing||[]).length}:null;},center:()=>center.slice(),validate,how:()=>how};}
