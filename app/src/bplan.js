// bplan.js — 01/11/2026 : PLAN DE BOUCLAGE de la détection d'humidité (onglet « Détection d'humidité »).
// Ethan : « rajoute la possibilité de créer un schéma de bouclage, ou de dessiner celui du fournisseur s'il nous le transmet : est-ce qu'on isole les antennes ou non,
// à quel moment on divise le feeder et on boucle dans un manchon de part et d'autre pour faire plusieurs boucles, où on met le boîtier de détection ; en fonction des
// boucles, un peu comme l'hydraulique, tu choisis sur ton plan de bouclage où tu te places pour une mesure et ce que ça doit t'afficher (en théorie du bouclage) — ce n'est
// pas pareil que les tests sur chantier avec le bouclage fait au réel. L'onglet aide à préparer son plan de bouclage, et à contrôler notre travail ; avec le plan fait,
// à l'endroit des tés ça indique à l'opérateur ce qui est demandé ; si rien : alerte, confirmation du chef. »
// Modèle (NET.dhData.plan, enregistré avec les données DH — aucune nouvelle partie serveur) :
//   {tees:{<antenne>:'isole'|'serie'}, cuts:[{line,m}], boxes:[{line,m}], src:'fournisseur'|'scr'|'', ok:{by,at}|null, by, at}
// Boucles (théorie) : chaque ligne est coupée à ses ✂ ; un morceau = une boucle ; une antenne EN SÉRIE rejoint la boucle du morceau de sa ligne mère où elle part,
// une antenne ISOLÉE fait sa propre boucle. Fil de la boucle ≈ 2 × longueur de conduite (le fil aller + le fil retour, pontés au bout) ; résistance attendue = fil × Ω/km.
let A=null;
const esc=s=>String(s??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const COLS=['#1f5fd6','#d9640b','#1f8a4c','#8a3fd1','#c8382f','#0e8a96','#b8860b','#5a6b7d'];
export const BP={mode:'at',at:null,view:null};
export function initBplan(api){A=api;}
const fmt=n=>Number(n).toLocaleString('fr-FR',{maximumFractionDigits:1});
const fmt2=n=>Number(n).toLocaleString('fr-FR',{minimumFractionDigits:1,maximumFractionDigits:2});
export function planOf(create){const d=A.dhData();if(!d)return null;if(!d.plan){if(!create)return null;d.plan={tees:{},cuts:[],boxes:[],src:'',ok:null};}const p=d.plan;p.tees=p.tees||{};p.cuts=p.cuts||[];p.boxes=p.boxes||[];return p;}
const canEd=()=>!!(A&&A.canEdit());
function touched(){const p=planOf(true);p.by=A.userName();p.at=new Date().toISOString();p.ok=null;A.saveDh();}
/* ── géométrie : lignes du réseau (pts {x,y}), longueur, point à un PK, PK d'un point ── */
/* axe d'une ligne : ses sommets (lignes du traceur), sinon mis bout à bout depuis ses éléments (anciens chantiers importés) */
const PT=l=>{if(l.pts&&l.pts.length>1)return l.pts;if(l._bpP)return l._bpP;const out=[];(l.els||[]).forEach(e=>{const pl=e.axis&&e.axis[0];(pl||[]).forEach(q=>{const z=out[out.length-1];if(q&&isFinite(q.x)&&(!z||Math.hypot(z.x-q.x,z.y-q.y)>1e-6))out.push({x:q.x,y:q.y});});});try{Object.defineProperty(l,'_bpP',{value:out,enumerable:false,configurable:true});}catch(e){}return out;};
const linesAll=()=>(A.lines()||[]).filter(l=>l&&PT(l).length>1);
const lenOf=l=>{let s=0;const P=PT(l);for(let i=1;i<P.length;i++)s+=Math.hypot(P[i].x-P[i-1].x,P[i].y-P[i-1].y);return s;};
function ptAt(l,m){const P=PT(l);let acc=0;for(let i=1;i<P.length;i++){const d=Math.hypot(P[i].x-P[i-1].x,P[i].y-P[i-1].y);if(acc+d>=m||i===P.length-1){const t=d?Math.max(0,Math.min(1,(m-acc)/d)):0;return {x:P[i-1].x+(P[i].x-P[i-1].x)*t,y:P[i-1].y+(P[i].y-P[i-1].y)*t};}acc+=d;}return P[0];}
function proj(l,q){const P=PT(l);let best={d:1e18,m:0,x:P[0].x,y:P[0].y};let acc=0;for(let i=1;i<P.length;i++){const a=P[i-1],b=P[i];const dx=b.x-a.x,dy=b.y-a.y;const L2=dx*dx+dy*dy;const L=Math.sqrt(L2);let t=L2?((q.x-a.x)*dx+(q.y-a.y)*dy)/L2:0;t=Math.max(0,Math.min(1,t));const x=a.x+dx*t,y=a.y+dy*t;const d=Math.hypot(q.x-x,q.y-y);if(d<best.d)best={d,m:acc+L*t,x,y};acc+=L;}return best;}
function sub(l,m0,m1){const P=PT(l);const out=[];let acc=0;for(let i=1;i<P.length;i++){const a=P[i-1],b=P[i];const L=Math.hypot(b.x-a.x,b.y-a.y);const at=m=>{const t=L?(m-acc)/L:0;return {x:a.x+(b.x-a.x)*t,y:a.y+(b.y-a.y)*t};};if(acc+L>=m0&&acc<=m1){if(!out.length)out.push(acc>=m0?a:at(m0));if(acc+L<=m1)out.push(b);else{out.push(at(m1));break;}}acc+=L;}return out;}
/* manchons (soudures) d'une ligne : position + PK le long de l'axe */
function joints(l){const out=[];['A','R'].forEach(c=>{const cd=l.cond&&l.cond[c];if(!cd||!cd.joints)return;cd.joints.forEach((j,i)=>{if(j.sst)return;let p=null;try{p=A.jointPos(l,j.idx!=null?j.idx:i,c);}catch(e){p=null;}if(!p||!isFinite(p.x))return;const r=proj(l,p);out.push({line:l.id,c,i,weldId:j.weldId,x:p.x,y:p.y,m:r.m,teeOut:!!j.teeOut});});});return out;}
/* départs d'antenne (tés) : point de la ligne mère au PK de départ */
function tees(){const L=linesAll();const by={};L.forEach(l=>by[l.id]=l);return L.filter(l=>l.parent&&by[l.parent]).map(l=>{const P=by[l.parent];const m=Math.max(0,Math.min(lenOf(P),+l.parentM||0));const q=ptAt(P,m);return {id:l.id,name:l.name||l.id,parent:P.id,m,x:q.x,y:q.y};});}
/* ── boucles (théorie du plan) ── */
export function loops(){const p=planOf(false)||{tees:{},cuts:[],boxes:[]};const L=linesAll();const by={};L.forEach(l=>by[l.id]=l);const segs=[];const segOf={};
  L.forEach(l=>{const len=lenOf(l);const cs=p.cuts.filter(c=>c.line===l.id&&c.m>0.3&&c.m<len-0.3).map(c=>+c.m).sort((a,b)=>a-b);const pts=[0,...cs,len];const arr=[];for(let i=1;i<pts.length;i++)arr.push({line:l.id,m0:pts[i-1],m1:pts[i]});segOf[l.id]=arr;arr.forEach(s=>segs.push(s));});
  const parentSeg=l=>{const a=segOf[l.parent]||[];const m=+l.parentM||0;return a.find(s=>m>=s.m0-1e-6&&m<=s.m1+1e-6)||a[a.length-1]||null;};
  /* union-find : une antenne EN SÉRIE (ou non définie : comptée en série, signalée) rejoint le morceau de sa mère ; ISOLÉE : sa première boucle reste à part */
  const id=new Map();segs.forEach((s,i)=>id.set(s,i));const par=segs.map((s,i)=>i);const f=i=>par[i]===i?i:(par[i]=f(par[i]));const un=(a,b)=>{a=f(a);b=f(b);if(a!==b)par[b]=a;};
  L.forEach(l=>{if(!l.parent||!by[l.parent])return;const mode=p.tees[l.id];if(mode==='isole')return;const ps=parentSeg(l);const first=(segOf[l.id]||[])[0];if(ps&&first)un(id.get(ps),id.get(first));});
  const groups=new Map();segs.forEach((s,i)=>{const r=f(i);if(!groups.has(r))groups.set(r,[]);groups.get(r).push(s);});
  const rk=+(A.rkm()||12.5),iso=+(A.isoMin()||500);const out=[];
  [...groups.values()].forEach(g=>{const pipe=g.reduce((t,s)=>t+(s.m1-s.m0),0);const wire=2*pipe;const undef=[...new Set(g.map(s=>s.line))].filter(lid=>by[lid]&&by[lid].parent&&!p.tees[lid]);
    const box=p.boxes.map((b,i)=>Object.assign({n:i+1},b)).find(b=>g.some(s=>s.line===b.line&&b.m>=s.m0-0.5&&b.m<=s.m1+0.5));
    out.push({segs:g,pipe,wire,R:wire*rk/1000,iso,undef,box,lab:g.map(s=>`${(by[s.line]&&by[s.line].name)||s.line}${(s.m0>0.3||s.m1<lenOf(by[s.line])-0.3)?' PK '+fmt(Math.round(s.m0))+' → '+fmt(Math.round(s.m1)):''}`).join(' + ')});});
  out.sort((a,b)=>{const ra=a.segs.some(s=>!by[s.line].parent),rb=b.segs.some(s=>!by[s.line].parent);if(ra!==rb)return ra?-1:1;return a.segs[0].m0-b.segs[0].m0;});out.forEach((o,i)=>{o.n=i+1;o.col=COLS[i%COLS.length];});return out;}
function loopAt(line,m){return loops().find(o=>o.segs.some(s=>s.line===line&&m>=s.m0-0.5&&m<=s.m1+0.5))||null;}
/* ── la carte (pan / zoom, comme l'hydraulique) ── */
function overlay(k){const p=planOf(false)||{tees:{},cuts:[],boxes:[]};const L=linesAll();const by={};L.forEach(l=>by[l.id]=l);const W=w=>w/k;let s='';const O=loops();
  O.forEach(o=>o.segs.forEach(sg=>{const l=by[sg.line];const P=sub(l,sg.m0,sg.m1);if(P.length>1)s+=`<path d="${A.pathD(P)}" stroke="${o.col}" stroke-width="${W(6)}" fill="none" stroke-linecap="round" stroke-linejoin="round" opacity=".9"/>`;}));
  if(BP.mode==='cut'||BP.mode==='at')L.forEach(l=>joints(l).filter(j=>j.c==='A').forEach(j=>{s+=`<circle cx="${j.x}" cy="${j.y}" r="${W(4)}" fill="#fff" stroke="#3b3b3b" stroke-width="${W(1.5)}"/>`;}));
  tees().forEach(t=>{const m=p.tees[t.id];const col=m==='isole'?'#1f8a4c':m==='serie'?'#1f5fd6':'#e0a020';const tx=m==='isole'?'I':m==='serie'?'S':'?';s+=`<g class="bpTee" data-bptee="${esc(t.id)}" transform="translate(${t.x} ${t.y}) scale(${1/k})"><circle r="13" fill="${col}" stroke="#fff" stroke-width="3"/><text y="5" font-size="13" font-weight="900" text-anchor="middle" fill="#fff" font-family="system-ui,sans-serif">${tx}</text></g>`;});
  p.cuts.forEach(c=>{const l=by[c.line];if(!l)return;const q=ptAt(l,c.m);s+=`<g class="bpCut" transform="translate(${q.x} ${q.y}) scale(${1/k})"><circle r="13" fill="#fff" stroke="#111" stroke-width="2.5"/><text y="5" font-size="14" text-anchor="middle" font-family="system-ui,sans-serif">✂</text></g>`;});
  p.boxes.forEach((b,i)=>{const l=by[b.line];if(!l)return;const q=ptAt(l,b.m);s+=`<g class="bpBox" transform="translate(${q.x} ${q.y}) scale(${1/k})"><rect x="-14" y="-14" width="28" height="28" rx="6" fill="#6b4bd6" stroke="#fff" stroke-width="3"/><text y="5" font-size="12" font-weight="900" text-anchor="middle" fill="#fff" font-family="system-ui,sans-serif">B${i+1}</text></g>`;});
  if(BP.at){const l=by[BP.at.line];if(l){const q=ptAt(l,BP.at.m);s+=`<g transform="translate(${q.x} ${q.y}) scale(${1/k})"><path d="M0 0 C -9 -14 -14 -20 -14 -27 a14 14 0 1 1 28 0 C 14 -20 9 -14 0 0 z" fill="#c8382f" stroke="#fff" stroke-width="2.5"/><circle cy="-27" r="5" fill="#fff"/></g>`;}}
  return s;}
export function mount(){const box=document.getElementById('bpMap');if(!box||!A)return;const L=linesAll();if(!L.length){box.innerHTML='<div class="dim" style="padding:12px">Aucune ligne tracée.</div>';return;}
  let x0=1e15,y0=1e15,x1=-1e15,y1=-1e15;L.forEach(l=>PT(l).forEach(q=>{x0=Math.min(x0,q.x);y0=Math.min(y0,q.y);x1=Math.max(x1,q.x);y1=Math.max(y1,q.y);}));
  let axes='';L.forEach(l=>{axes+=`<path d="${A.pathD(PT(l))}" stroke="#c9c4b6" stroke-width="3" vector-effect="non-scaling-stroke" fill="none" stroke-linejoin="round" stroke-linecap="round"/>`;});
  box.innerHTML=`<svg style="position:absolute;inset:0;width:100%;height:100%"><g id="bpWorld"><g>${axes}</g><g id="bpOv"></g></g></svg><div class="hmCtl bpCtl"><button data-a="+" title="Zoomer">+</button><button data-a="-" title="Dézoomer">−</button><button data-a="fit" title="Tout le réseau">⌖</button></div>`;
  const world=box.querySelector('#bpWorld'),ov=box.querySelector('#bpOv');const V=BP.view&&isFinite(BP.view.k)&&BP.view.k>0?BP.view:(BP.view={k:0,tx:0,ty:0});
  let raf=null;const apply=()=>{world.setAttribute('transform',A.viewTf(V.tx,V.ty,V.k));if(raf)return;raf=requestAnimationFrame(()=>{raf=null;ov.innerHTML=overlay(V.k);});};BP.apply=apply;
  const fit=()=>{const cw=box.clientWidth||360,ch=box.clientHeight||300;const m=Math.max(10,(x1-x0)*.08,(y1-y0)*.08);const a0=x0-m,b0=y0-m,a1=x1+m,b1=y1+m;V.k=Math.min(cw/(a1-a0),ch/(b1-b0));V.tx=(cw-(a1-a0)*V.k)/2-a0*V.k;V.ty=(ch-(b1-b0)*V.k)/2-b0*V.k;apply();};
  const zoomAt=(f2,mx,my)=>{const nk=Math.min(80,Math.max(0.005,V.k*f2));const r=nk/V.k;V.tx=mx-(mx-V.tx)*r;V.ty=my-(my-V.ty)*r;V.k=nk;apply();};
  box.addEventListener('wheel',e=>{e.preventDefault();const r=box.getBoundingClientRect();zoomAt(Math.exp(-e.deltaY*.0015),e.clientX-r.left,e.clientY-r.top);},{passive:false});
  box.querySelector('.bpCtl').addEventListener('click',e=>{const a=e.target.dataset.a;if(!a)return;e.stopPropagation();if(a==='fit'){fit();return;}zoomAt(a==='+'?1.6:1/1.6,box.clientWidth/2,box.clientHeight/2);});
  const P2=new Map();let last=null,pd=null,down=null,moved=0;
  box.addEventListener('pointerdown',e=>{if(e.target.closest('.bpCtl'))return;box.setPointerCapture(e.pointerId);P2.set(e.pointerId,{x:e.clientX,y:e.clientY});if(P2.size===1){last={x:e.clientX,y:e.clientY};down={x:e.clientX,y:e.clientY};moved=0;}else down=null;});
  box.addEventListener('pointermove',e=>{if(!P2.has(e.pointerId))return;P2.set(e.pointerId,{x:e.clientX,y:e.clientY});
    if(P2.size===1&&last){const dx=e.clientX-last.x,dy=e.clientY-last.y;moved+=Math.abs(dx)+Math.abs(dy);V.tx+=dx;V.ty+=dy;last={x:e.clientX,y:e.clientY};apply();}
    else if(P2.size===2){const [a,b]=[...P2.values()];const d=Math.hypot(a.x-b.x,a.y-b.y);const r=box.getBoundingClientRect();if(pd)zoomAt(d/pd,(a.x+b.x)/2-r.left,(a.y+b.y)/2-r.top);pd=d;}});
  const up=e=>{const wasTap=P2.size===1&&down&&moved<8;P2.delete(e.pointerId);if(P2.size<2)pd=null;if(!P2.size)last=null;if(wasTap){const r=box.getBoundingClientRect();tap((e.clientX-r.left-V.tx)/V.k,(e.clientY-r.top-V.ty)/V.k,V.k);}down=null;};
  box.addEventListener('pointerup',up);box.addEventListener('pointercancel',e=>{P2.delete(e.pointerId);down=null;});
  if(!V.k)fit();else apply();}
function tap(x,y,k){const q={x,y};const tol=28/k;const p=planOf(BP.mode!=='at');const L=linesAll();
  if(BP.mode==='tee'){if(!canEd())return;let best=null;tees().forEach(t=>{const d=Math.hypot(t.x-x,t.y-y);if(d<tol&&(!best||d<best.d))best={t,d};});if(!best){A.toast('Touche un té (pastille I / S / ?)');return;}
    const cur=p.tees[best.t.id];const nx=!cur?'isole':cur==='isole'?'serie':null;if(nx)p.tees[best.t.id]=nx;else delete p.tees[best.t.id];touched();A.toast(`${best.t.name} : ${nx==='isole'?'antenne ISOLÉE (boucle à part)':nx==='serie'?'antenne EN SÉRIE (même boucle que la ligne mère)':'à définir'}`);refresh();return;}
  if(BP.mode==='cut'){if(!canEd())return;const i=p.cuts.findIndex(c=>{const l=L.find(z=>z.id===c.line);if(!l)return false;const r=ptAt(l,c.m);return Math.hypot(r.x-x,r.y-y)<tol;});if(i>=0){p.cuts.splice(i,1);touched();A.toast('Coupure retirée');refresh();return;}
    let best=null;L.forEach(l=>joints(l).filter(j=>j.c==='A').forEach(j=>{const d=Math.hypot(j.x-x,j.y-y);if(d<tol&&(!best||d<best.d))best={j,d};}));if(!best){A.toast('Touche un manchon (petit rond blanc)');return;}
    p.cuts.push({line:best.j.line,m:Math.round(best.j.m*10)/10,w:best.j.weldId});touched();A.toast(`✂ Boucle coupée au manchon ${best.j.weldId} : on boucle de part et d'autre`);refresh();return;}
  if(BP.mode==='box'){if(!canEd())return;const i=p.boxes.findIndex(b=>{const l=L.find(z=>z.id===b.line);if(!l)return false;const r=ptAt(l,b.m);return Math.hypot(r.x-x,r.y-y)<tol;});if(i>=0){p.boxes.splice(i,1);touched();A.toast('Boîtier retiré');refresh();return;}
    let best=null;L.forEach(l=>{const r=proj(l,q);if(r.d<tol&&(!best||r.d<best.r.d))best={l,r};});if(!best){A.toast('Touche le réseau');return;}p.boxes.push({line:best.l.id,m:Math.round(best.r.m*10)/10});touched();A.toast(`▣ Boîtier B${p.boxes.length} posé`);refresh();return;}
  /* je me place : un manchon, un boîtier ou un point du réseau */
  let best=null;L.forEach(l=>joints(l).filter(j=>j.c==='A').forEach(j=>{const d=Math.hypot(j.x-x,j.y-y);if(d<tol&&(!best||d<best.d))best={line:j.line,m:j.m,w:j.weldId,d};}));
  if(!best){(planOf(false)||{boxes:[]}).boxes.forEach((b,i)=>{const l=L.find(z=>z.id===b.line);if(!l)return;const r=ptAt(l,b.m);const d=Math.hypot(r.x-x,r.y-y);if(d<tol&&(!best||d<best.d))best={line:b.line,m:b.m,w:'boîtier B'+(i+1),d};});}
  if(!best){L.forEach(l=>{const r=proj(l,q);if(r.d<tol&&(!best||r.d<best.d))best={line:l.id,m:r.m,w:'PK '+fmt(Math.round(r.m)),d:r.d};});}
  if(!best){A.toast('Touche un manchon ou le réseau');return;}BP.at={line:best.line,m:best.m,w:best.w};refresh();}
function refresh(){const el=document.getElementById('bpCard');if(el){const y=window.scrollY;el.outerHTML=cardHTML();bind();mount();try{window.scrollTo(0,y);}catch(e){}}}
/* ── la carte du plan de bouclage, en tête de l'onglet ── */
function atHTML(){if(!BP.at)return `<div class="dim bpAtHint">📍 Choisis « Je me place » puis touche un manchon ou le boîtier : l'appli te dit ce que tu dois lire, en théorie.</div>`;const o=loopAt(BP.at.line,BP.at.m);const L=linesAll();const l=L.find(z=>z.id===BP.at.line);
  if(!o)return `<div class="warnbox">Point hors des boucles du plan.</div>`;
  return `<div class="bpAt" style="border-color:${o.col}"><b>📍 ${esc(BP.at.w||'')}${l?' · '+esc(l.name||l.id):''}</b> → <b style="color:${o.col}">Boucle ${o.n}</b><div style="margin-top:4px">En théorie, fils pontés au bout de la boucle : <b>≈ ${fmt2(o.R)} Ω</b> de résistance de boucle (fil ≈ ${fmt(Math.round(o.wire))} m à ${fmt(A.rkm())} Ω/km) · isolement <b>&gt; ${fmt(o.iso)} MΩ</b>.</div><div class="dim" style="font-size:12px;margin-top:3px">Boucle ${o.n} : ${esc(o.lab)}${o.box?` · lue par le boîtier B${o.box.n}`:' · pas de boîtier (mesure à la main)'}. C'est la théorie du plan ; la mesure réelle se fait plus bas (« Mesure en un point »), avec le bouclage fait sur le chantier.</div>${o.undef.length?`<div class="warnbox" style="margin-top:6px">⚠ Té non défini dans cette boucle (${o.undef.map(id=>esc((L.find(z=>z.id===id)||{}).name||id)).join(', ')}) : compté en série.</div>`:''}</div>`;}
export function cardHTML(){if(!A)return '';const L=linesAll();if(!L.length)return '';const p=planOf(false);const O=loops();const T=tees();const ed=canEd();const nT=T.length,nDef=p?T.filter(t=>p.tees[t.id]).length:0;
  const st=!p?'<span class="bpSt none">aucun plan</span>':p.ok?`<span class="bpSt ok">✓ validé${p.ok.by?' par '+esc(p.ok.by):''}${p.ok.at?' le '+new Date(p.ok.at).toLocaleDateString('fr-FR'):''}</span>`:'<span class="bpSt draft">brouillon</span>';
  const mb=(m,lab)=>`<button type="button" class="bpM${BP.mode===m?' on':''}" data-bpmode="${m}">${lab}</button>`;
  return `<div class="card" id="bpCard"><div class="bpHead"><h3 style="margin:0">Plan de bouclage</h3>${st}</div>
   <div class="dim" style="font-size:12.5px;margin:4px 0 8px">Ce qui est prévu : antennes isolées ou en série, coupures du feeder (on boucle de part et d'autre d'un manchon), boîtier de détection. Sert à préparer, à contrôler, et dit aux équipes ce qu'on attend aux tés.${nT?` <b>${nDef}/${nT}</b> té${nT>1?'s':''} défini${nDef>1?'s':''}.`:''}</div>
   <div class="bpModes">${mb('at','📍 Je me place')}${ed?mb('tee','Tés I / S')+mb('cut','✂ Couper')+mb('box','▣ Boîtier'):''}</div>
   <div class="bpHelp dim">${BP.mode==='tee'?'Touche un té : <b>I</b> = antenne isolée (boucle à part) → <b>S</b> = en série → <b>?</b> = à définir.':BP.mode==='cut'?'Touche un manchon (petit rond blanc) : la boucle est coupée là, on boucle de part et d\'autre. Re-touche le ✂ pour l\'enlever.':BP.mode==='box'?'Touche le réseau là où va le boîtier de détection. Re-touche-le pour l\'enlever.':'Touche un manchon, le boîtier ou le réseau.'}</div>
   <div id="bpMap" class="bpMap"></div>
   <div class="bpLoops">${O.map(o=>`<div class="bpLoop"><i style="background:${o.col}"></i><b>Boucle ${o.n}</b> <span>${esc(o.lab)}</span> <span class="dim">· fil ≈ ${fmt(Math.round(o.wire))} m · ≈ ${fmt2(o.R)} Ω${o.box?' · ▣ B'+o.box.n:''}</span>${o.undef.length?' <b style="color:#b8560f">· té ?</b>':''}</div>`).join('')}</div>
   ${atHTML()}
   ${ed?`<div class="bpFoot"><label class="dim" style="font-size:12.5px">Plan fait par <select class="f" id="bpSrc"><option value="">—</option><option value="fournisseur"${p&&p.src==='fournisseur'?' selected':''}>le fournisseur (on l'a redessiné)</option><option value="scr"${p&&p.src==='scr'?' selected':''}>SCR</option></select></label>${p&&!p.ok?'<button type="button" class="btn primary" id="bpOk" style="min-height:44px">✓ Valider le plan</button>':''}</div>`:''}</div>`;}
export function bind(){const el=document.getElementById('bpCard');if(!el)return;el.querySelectorAll('[data-bpmode]').forEach(b=>b.onclick=()=>{BP.mode=b.dataset.bpmode;refresh();});
  const s=document.getElementById('bpSrc');if(s)s.onchange=()=>{const p=planOf(true);p.src=s.value;touched();refresh();};
  const ok=document.getElementById('bpOk');if(ok)ok.onclick=()=>{const p=planOf(true);const T=tees();const und=T.filter(t=>!p.tees[t.id]);if(und.length&&!confirm(und.length+' té(s) non défini(s) : valider quand même ?'))return;p.ok={by:A.userName(),at:new Date().toISOString()};A.saveDh();A.toast('✓ Plan de bouclage validé');refresh();};}
/* ── consigne aux équipes, dans la fiche soudure (étape ② Fils raccordés, déclaration du manchon) ── */
export function fieldHTML(l,c,j,a,b){if(!A||!l||!j)return '';const p=planOf(false);let ant=null;
  if(j.teeOut&&l.parent)ant=l.id;
  else{const t=[a,b].find(e=>e&&(e.kind==='tee'||e.kind==='teeout'));if(t){const tm=+((t.m0+t.m1)/2)||+t.m1||0;const ch=(A.lines()||[]).filter(x=>x&&x.parent===l.id).sort((u,v)=>Math.abs((+u.parentM||0)-tm)-Math.abs((+v.parentM||0)-tm))[0];if(ch&&Math.abs((+ch.parentM||0)-tm)<3)ant=ch.id;}}
  let s='';const nm=id=>{const x=(A.lines()||[]).find(z=>z.id===id);return (x&&x.name)||id;};
  if(ant){const d=p&&p.tees[ant];
    if(d==='isole')s+=`<div class="teeRemind bpOkBox">🔁 <b>Plan de bouclage</b> : l'antenne <b>${esc(nm(ant))}</b> est <b>ISOLÉE</b> — boucle ses fils sur eux-mêmes au té (boucle à part) ; le fil de la ligne mère traverse le té.</div>`;
    else if(d==='serie')s+=`<div class="teeRemind bpOkBox">🔁 <b>Plan de bouclage</b> : l'antenne <b>${esc(nm(ant))}</b> est <b>EN SÉRIE</b> — le fil plonge dans l'antenne et revient (même boucle que la ligne mère).</div>`;
    else s+=`<div class="teeRemind bpWarn" role="alert">⚠ <b>Pas de consigne de bouclage pour ce té</b>${p?' (té non défini dans le plan)':' (pas de plan de bouclage)'} : regarde le plan de bouclage du fournisseur ou demande au chef comment on boucle (antenne séparée du feeder ou pas), et fais-lui <b>confirmer</b> avant de raccorder.</div>`;}
  if(p){const L=(A.lines()||[]).find(z=>z.id===l.id);let m=null;try{const q=A.jointPos(l,j.idx!=null?j.idx:0,c);if(L&&q)m=proj(L,q).m;}catch(e){m=null;}
    if(m!=null&&p.cuts.some(x=>x.line===l.id&&Math.abs(x.m-m)<1.5))s+=`<div class="teeRemind bpCutBox">✂ <b>Plan de bouclage</b> : ici on <b>coupe la boucle</b> — boucle les fils de part et d'autre dans ce manchon (fin d'une boucle, début de la suivante).</div>`;}
  return s;}
