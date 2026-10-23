// modop.js — MODE OPÉRATOIRE HYDRAULIQUE VISUEL (23/10/2026). Ethan (22/10 → 23/10) : « la création d'un mode opératoire doit être visuelle, limite vue plan : on remplit,
// d'où, eau brute ou adoucie, état des vannes ouvert / fermé à ce moment-là, et après si on en ouvre ou ferme » ; « un bouton “Créer un mode opératoire” → mode de
// quoi (épreuve seule, épreuve + rinçage…) → prérequis : comment doit être le réseau au début, vannes ouvertes / fermées sur une vue plan où on les manœuvre → on
// remplit de ce point, on purge là, là, là, on ouvre telle vanne, on monte en pression, 24 h, on casse la pression, on vidange là… : une liste des tâches À CÔTÉ
// d'un plan interactif, une vraie maquette du réseau et de son évolution pendant le mode opératoire ».
// Données : NET.hydro.modops = [{id, name, type, by, at, steps:[{id, type, set:{cléPoint:'o'|'f'}, src, outs:[clés], water, bar, min, h, note}]}] (partie « hydro »,
// chef / bureau au serveur — saveHydro). L'étape 0 = état de départ (prérequis). Les états se reportent d'une étape à la suivante ; l'eau est CALCULÉE : depuis le point
// de remplissage à travers les vannes ouvertes (une vanne fermée arrête l'eau ; une purge / vidange ne coupe pas la conduite ; une antenne est reliée à sa parente au té).
// Le terrain coche « ✓ Fait » (registre pteq, ctx 'modop', step = id de l'étape — comme avant, via ptseq). Les points = ceux de 📍 Points (ptseq.pointsOf).
import {pointsOf} from './ptseq.js';
import {docHTML} from './charte.js';
let A=null;
const esc=s=>String(s??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const fmt=n=>Number(n||0).toLocaleString('fr-FR',{maximumFractionDigits:1});
const uid=()=>Date.now().toString(36)+Math.random().toString(36).slice(2,6);
export const MO_TYPES=[['epreuve','Épreuve seule'],['epreuve_rincage','Épreuve + rinçage'],['rincage','Rinçage seul'],['remplissage','Remplissage / mise en service'],['passivation','Passivation'],['autre','Autre']];
const ST={start:'État de départ (prérequis)',remplir:'Remplir',purger:'Purger',rincer:'Rincer',pression:'Mettre en pression',attente:'Attendre',casser:'Casser la pression',vidanger:'Vidanger',vannes:'Manœuvrer des vannes',note:'Consigne'};
const ST_ICO={start:'⚑',remplir:'💧',purger:'▲',rincer:'🚿',pression:'⏱',attente:'⌛',casser:'⇣',vidanger:'▼',vannes:'🔧',note:'📝'};
const WATER={brute:'eau brute',adoucie:'eau adoucie',autre:'autre eau'};
const MAN=p=>p.nature==='vanne'||p.nature==='purge'||p.nature==='vidange';
const SRC=p=>p.nature==='purge'||p.nature==='vidange'||p.nature==='sst'||p.nature==='racc'||p.nature==='bypass';
const OUT=p=>p.nature==='purge'||p.nature==='vidange';
const pDn=p=>(p.nature==='purge'||p.nature==='vidange')?(p.dnb||''):(p.dn||''); /* purge / vidange : le DN du piquage (dnb), pas celui de la conduite */
const pName=p=>p?((p.nature==='vanne'?'vanne':p.nature==='purge'?'purge':p.nature==='vidange'?'vidange':p.nature==='sst'?'SST':p.nature==='racc'?'raccordement':p.nature)+(pDn(p)?' DN'+pDn(p):'')+' PK '+fmt(p.pk)+' ('+(p.lineName||p.line)+')'):'?';
const pShort=p=>p?((p.nature==='vanne'?'V ':p.nature==='purge'?'P ':p.nature==='vidange'?'D ':p.nature==='sst'?'SST ':p.nature==='racc'?'R ':'')+'PK '+fmt(p.pk)):'?';
/* ── données ── */
function listOf(create){const h=A.hydroOf();if(!h)return [];if(!Array.isArray(h.modops)){if(!create)return [];h.modops=[];}return h.modops;}
export function modopAll(){return listOf(false);}
function byId(id){return listOf(false).find(m=>m.id===id)||null;}
function pts(){return pointsOf(A.state.siteId,Object.values(A.state.lines||{})).filter(p=>!p.absent&&p.e);}
function pMap(){const m={};pts().forEach(p=>m[p.key]=p);return m;}
/* état de départ par défaut : les constats connus (ouverte / fermée), sinon fermée (dit « supposé ») */
function startSet(P){const s={};Object.values(P).forEach(p=>{if(!MAN(p))return;s[p.key]=p.etatRec?(p.etatRec.etat==='ouverte'?'o':'f'):'f';});return s;}
function stateAt(mo,k){const st={};const P=pMap();Object.values(P).forEach(p=>{if(MAN(p))st[p.key]='f';});for(let i=0;i<=k&&i<mo.steps.length;i++){const s=mo.steps[i].set||{};Object.keys(s).forEach(key=>{st[key]=s[key];});}return st;}
/* ── graphe du réseau : nœuds (points + jonctions d'antenne + bouts), arêtes (tronçons de ligne) ── */
function graph(P){const L=A.lines();const nodes={},adj={};const segs=[];const add=(id,o)=>{nodes[id]=o;adj[id]=adj[id]||[];};const link=(a,b,seg)=>{segs.push(seg);const i=segs.length-1;adj[a].push([b,i]);adj[b].push([a,i]);};
  const perLine={};Object.values(P).forEach(p=>{(perLine[p.line]=perLine[p.line]||[]).push({pk:p.pk,id:p.key,p});});
  L.forEach(l=>{const len=A.phLen(l);const ns=(perLine[l.id]||[]).slice();L.forEach(c=>{if(c.parent===l.id&&c.parentM!=null){const id='J|'+c.id;add(id,{junction:true,line:l.id,pk:+c.parentM,child:c.id});ns.push({pk:+c.parentM,id});}});
    add('S|'+l.id,{end:true,line:l.id,pk:0});add('E|'+l.id,{end:true,line:l.id,pk:len});ns.push({pk:0,id:'S|'+l.id},{pk:len,id:'E|'+l.id});ns.sort((a,b)=>a.pk-b.pk);
    ns.forEach(n=>{if(n.p)add(n.id,{p:n.p,line:l.id,pk:n.pk});});
    for(let i=1;i<ns.length;i++){if(ns[i].pk-ns[i-1].pk<0.05){adj[ns[i].id].push([ns[i-1].id,-1]);adj[ns[i-1].id].push([ns[i].id,-1]);continue;}link(ns[i-1].id,ns[i].id,{line:l.id,m0:ns[i-1].pk,m1:ns[i].pk});}});
  L.forEach(c=>{if(c.parent&&nodes['J|'+c.id]&&nodes['S|'+c.id]){adj['J|'+c.id].push(['S|'+c.id,-1]);adj['S|'+c.id].push(['J|'+c.id,-1]);}});
  return {nodes,adj,segs};}
function reach(G,src,st){const out={nodes:{},segs:{},bound:{},prev:{}};if(!G.nodes[src])return out;out.nodes[src]=1;const q=[src];
  while(q.length){const u=q.shift();(G.adj[u]||[]).forEach(([v,i])=>{const n=G.nodes[v];const closedValve=n&&n.p&&n.p.nature==='vanne'&&st[n.p.key]!=='o';if(i>=0)out.segs[i]=1;if(closedValve){out.bound[v]=1;return;}if(!out.nodes[v]){out.nodes[v]=1;out.prev[v]=u;q.push(v);}});}
  return out;}
function regionTxt(G,R,P){const b=Object.keys(R.bound).map(id=>G.nodes[id].p).filter(Boolean);const ss=Object.keys(R.nodes).map(id=>G.nodes[id]).filter(n=>n&&n.p&&(n.p.nature==='sst'||n.p.nature==='racc')).map(n=>n.p);
  const len=Object.keys(R.segs).reduce((s,i)=>s+(G.segs[+i].m1-G.segs[+i].m0),0);const lines=[...new Set(Object.keys(R.segs).map(i=>G.segs[+i].line))].map(id=>(A.state.lines[id]||{}).name||id);
  let w=b.length?'jusqu\'à '+b.map(pShort).join(', '):'tout le réseau relié';if(ss.length)w+=' · '+ss.map(p=>p.nature==='sst'?'SST PK '+fmt(p.pk):'raccordement PK '+fmt(p.pk)).join(', ');return {txt:w,len:+len.toFixed(0),lines};}
/* ── simulation : état des vannes et de l'eau à chaque étape, contrôles ── */
export function simulate(mo){const P=pMap();const G=graph(P);const out=[];let filled={};let lastSrc=null;
  mo.steps.forEach((s,k)=>{const st=stateAt(mo,k);const before=k?stateAt(mo,k-1):null;const warn=[];let R=null;const prevFilled=filled;filled=Object.assign({},filled);const newS={};
    const open=key=>st[key]==='o';
    if((s.type==='remplir'||s.type==='rincer')&&s.src&&P[s.src]){R=reach(G,s.src,st);Object.keys(R.segs).forEach(i=>{if(!prevFilled[i])newS[i]=1;filled[i]=1;});lastSrc=s.src;
      if(s.type==='remplir'){const purges=Object.keys(R.nodes).map(id=>G.nodes[id].p).filter(p=>p&&p.nature==='purge');if(!purges.length)warn.push('Aucune purge dans la partie remplie : l\'air ne pourra pas sortir.');else if(!purges.some(p=>open(p.key)))warn.push('Ouvre une purge de la partie remplie pour chasser l\'air ('+purges.map(pShort).join(', ')+').');
        if(Object.keys(R.segs).length<=1)warn.push('Les vannes autour du point de remplissage sont fermées : presque rien ne se remplit.');}
      if(s.type==='rincer'){const outs=(s.outs||[]).filter(key=>P[key]);if(!outs.length)warn.push('Choisis la sortie du rinçage (vidange ou purge).');outs.forEach(key=>{if(!open(key))warn.push('Ouvre '+pName(P[key])+' : sinon l\'eau ne circule pas.');else if(!R.nodes[key])warn.push(pName(P[key])+' n\'est pas reliée à l\'entrée : une vanne fermée les sépare.');});}}
    else if(s.type==='purger'){const outs=(s.outs||[]).filter(key=>P[key]);if(!outs.length)warn.push('Choisis la ou les purges à ouvrir.');outs.forEach(key=>{if(!open(key))warn.push(pName(P[key])+' doit être ouverte à cette étape.');});}
    else if(s.type==='pression'){const src=s.src||lastSrc;if(src&&P[src]){R=reach(G,src,st);Object.keys(R.nodes).forEach(id=>{const p=G.nodes[id].p;if(p&&OUT(p)&&open(p.key))warn.push(pName(p)+' est ouverte : la pression ne tiendra pas. Ferme-la.');});
      if(Object.keys(R.segs).some(i=>!filled[i]))warn.push('Une partie reliée n\'est pas remplie (vanne ouverte vers une conduite vide).');}else warn.push('Remplis d\'abord une partie du réseau.');}
    else if(s.type==='casser'||s.type==='vidanger'){const outs=(s.outs||[]).filter(key=>P[key]);if(!outs.length)warn.push(s.type==='casser'?'Choisis où casser la pression (purge ou vidange).':'Choisis la ou les vidanges.');
      outs.forEach(key=>{if(!open(key))warn.push('Ouvre '+pName(P[key])+'.');else if(s.type==='vidanger'){const R2=reach(G,key,st);Object.keys(R2.segs).forEach(i=>{delete filled[i];});R=R||R2;}});}
    if(before&&s.type!=='remplir'&&s.type!=='rincer')Object.keys(s.set||{}).forEach(key=>{const p=P[key];if(!p||p.nature!=='vanne'||s.set[key]!=='o')return;const sides=(G.adj[key]||[]).map(([v,i])=>i>=0?!!prevFilled[i]:null).filter(x=>x!==null);if(sides.some(x=>x)&&sides.some(x=>!x))warn.push(pShort(p)+' ouverte : l\'eau de la partie remplie passe vers la partie vide.');});
    out.push({st,R,filled,newS,warn,region:R?regionTxt(G,R,P):null});});
  return {G,P,steps:out};}
export function sentence(s,sim,P){const reg=sim&&sim.region?sim.region.txt+' (≈ '+sim.region.len+' m)':'';const n=key=>pName(P[key]);const outs=(s.outs||[]).map(n).join(', ');
  switch(s.type){case 'start':return 'Réseau au départ : vannes, purges et vidanges dans l\'état ci-contre (touche-les sur le plan pour les changer).';
    case 'remplir':return s.src?`Remplir ${reg} depuis ${n(s.src)} — ${WATER[s.water]||'eau brute'}.`:'Touche le point de remplissage sur le plan (vidange, purge, sous-station, raccordement).';
    case 'purger':return outs?`Purger : ouvrir ${outs} jusqu'à ce que l'eau sorte sans air, puis refermer.`:'Touche la ou les purges sur le plan.';
    case 'rincer':return s.src?`Rincer ${reg} : entrée ${n(s.src)} (${WATER[s.water]||'eau brute'}) → sortie ${outs||'?'}, ${s.min||20} min ou jusqu'à eau claire.`:'Touche l\'entrée d\'eau sur le plan, puis la sortie.';
    case 'pression':return `Mettre en pression ${reg||'la partie remplie'} à ${s.bar||6} bar, tout fermé, maintenir ${s.min||120} min.`;
    case 'attente':return `Attendre ${s.h||24} h${s.note?' — '+s.note:''}.`;
    case 'casser':return outs?`Casser la pression : ouvrir doucement ${outs}.`:'Touche où casser la pression (purge ou vidange).';
    case 'vidanger':return outs?`Vidanger par ${outs}${reg?' — '+reg:''}.`:'Touche la ou les vidanges sur le plan.';
    case 'vannes':{const ks=Object.keys(s.set||{});return ks.length?ks.map(key=>(s.set[key]==='o'?'Ouvrir ':'Fermer ')+n(key)).join(', ')+'.':'Touche les vannes à ouvrir ou fermer sur le plan.';}
    default:return s.note||'Consigne.';}}
/* ── éditeur ── */
const ED={mo:null,sel:0,pick:null,terrain:false,adding:false,view:null,drag:null};
export function modopCreate(type,name){const list=listOf(true);const P=pMap();const mo={id:'MO'+uid(),type,name:name||(MO_TYPES.find(t=>t[0]===type)||[])[1]||'Mode opératoire',by:A.userName(),at:new Date().toISOString(),steps:[{id:'s'+uid(),type:'start',set:startSet(P)}]};
  list.push(mo);A.saveHydro();return mo;}
/* côté terrain : la première étape pas encore cochée (sinon la dernière) */
function firstTodo(mo){const marks=A.marks?A.marks():{};for(let i=1;i<mo.steps.length;i++)if(!marks[mo.steps[i].id])return i;return Math.max(1,mo.steps.length-1);}
export function modopOpen(id,o){const mo=byId(id);if(!mo)return false;ED.mo=mo;const terrain=!!(o&&o.terrain)||!A.can('hydro'); /* sans le droit hydro (soudeur) : on arrive côté terrain, jamais en création */ED.sel=o&&o.step!=null?o.step:(terrain?Math.min(firstTodo(mo),mo.steps.length-1):0);ED.pick=null;ED.terrain=terrain;ED.adding=false;ED.view=null;render();return true;}
export function modopClose(){const el=document.getElementById('moEd');if(el)el.remove();ED.mo=null;try{A.renderHydro&&A.renderHydro();}catch(e){}}
function save(){A.saveHydro();}
function addStep(t){const mo=ED.mo;const last=[...mo.steps].reverse().find(s=>s.src);const s={id:'s'+uid(),type:t,set:{}};if(t==='remplir'||t==='rincer'){if(last){s.src=last.src;s.water=last.water;}else s.water='brute';}if(t==='rincer')s.min=20;if(t==='pression'){s.bar=6;s.min=120;}if(t==='attente')s.h=24;if(t==='note')s.note='';
  mo.steps.push(s);ED.sel=mo.steps.length-1;ED.adding=false;ED.pick=(t==='remplir'||t==='rincer')?'src':(t==='purger'||t==='vidanger'||t==='casser')?'out':null;save();render();}
function delStep(i){const mo=ED.mo;if(i<=0)return;mo.steps.splice(i,1);ED.sel=Math.max(0,Math.min(ED.sel,mo.steps.length-1));ED.pick=null;save();render();}
function moveStep(i,d){const mo=ED.mo;const j=i+d;if(i<=0||j<=0||j>=mo.steps.length)return;const t=mo.steps[i];mo.steps[i]=mo.steps[j];mo.steps[j]=t;ED.sel=j;save();render();}
function tapPoint(key){const mo=ED.mo;const k=ED.sel;const P=pMap();const p=P[key];if(!p||!mo)return;if(ED.terrain||!A.can('hydro')){A.toast(pName(p));return;}const s=mo.steps[k];
  if(ED.pick==='src'){if(!SRC(p)){A.toast('Le remplissage part d\'une vidange, d\'une purge, d\'une sous-station ou d\'un raccordement');return;}s.src=key;if(!s.water)s.water=p.nature==='sst'?'adoucie':'brute';ED.pick=s.type==='rincer'?'out':null;save();render();return;}
  if(ED.pick==='out'){if(!OUT(p)){A.toast('Choisis une purge ou une vidange');return;}s.outs=s.outs||[];const i=s.outs.indexOf(key);if(i>=0)s.outs.splice(i,1);else s.outs.push(key);s.set=s.set||{};s.set[key]=i>=0?'f':'o';save();render();return;}
  if(!MAN(p))return;const before=k?stateAt(mo,k-1):null;const cur=stateAt(mo,k)[key];const nv=cur==='o'?'f':'o';s.set=s.set||{};if(k===0||!before||nv!==before[key])s.set[key]=nv;else delete s.set[key];save();render();}
/* plan : lignes, eau, points (vannes ◆ creuse = ouverte / pleine rouge = fermée ; purge ▲ ; vidange ▼ ; SST / raccordement ■) */
function planSVG(sim,k,o){o=o||{};const L=A.lines();const P=sim.P;const S=sim.steps[k];const mo=ED.mo;const s=mo.steps[k];let x0=1e15,y0=1e15,x1=-1e15,y1=-1e15;const bump=(x,y)=>{x0=Math.min(x0,x);y0=Math.min(y0,y);x1=Math.max(x1,x);y1=Math.max(y1,y);};
  L.forEach(l=>(l.pts||[]).forEach(p=>bump(p.x,p.y)));if(!(x1>x0&&y1>y0))return '<div class="hint">Pas de tracé.</div>';const pad=Math.max(6,(x1-x0)*.08,(y1-y0)*.08);x0-=pad;y0-=pad;x1+=pad;y1+=pad;
  let V=ED.view;if(!V||o.fit){V={x:x0,y:y0,w:x1-x0,h:y1-y0};if(!o.print)ED.view=V;}const W=V.w,H=V.h;const sw=Math.max(0.25,W*.004);const r=Math.max(1.2,W*.016);const fs=Math.max(1.6,W*.022);
  let h='';L.forEach(l=>{const p=l.pts||[];if(p.length>1)h+=`<path d="M ${p.map(q=>q.x+' '+q.y).join(' L ')}" stroke="#8d8d8d" stroke-width="${sw*3.2}" fill="none" stroke-linejoin="round" stroke-linecap="round"/>`;});
  Object.keys(S.filled).forEach(i=>{const sg=sim.G.segs[+i];A.phTrPath({line:sg.line,m0:sg.m0,m1:sg.m1,cond:'A'}).forEach(pl=>{if(pl.length>1)h+=`<path d="M ${pl.map(q=>q.x+' '+q.y).join(' L ')}" stroke="${S.newS[i]?'#1565c0':'#5b9bd8'}" stroke-width="${sw*2.2}" fill="none" stroke-linecap="round" ${S.newS[i]?`stroke-dasharray="${sw*4} ${sw*2.5}" class="moFlow"`:''}/>`;});});
  Object.values(P).forEach(p=>{const q=A.elMid(p.e);if(!q)return;const key=p.key;const open=S.st[key]==='o';const chg=k>0&&!!(s.set||{})[key];const cand=(ED.pick==='src'&&SRC(p))||(ED.pick==='out'&&OUT(p));const isSrc=s.src===key;const isOut=(s.outs||[]).includes(key);
    const ring=chg||cand||isSrc||isOut?`<circle cx="${q.x}" cy="${q.y}" r="${r*1.7}" fill="none" stroke="${isSrc?'#2a7fd4':isOut?'#0f4c8a':'#eb6834'}" stroke-width="${sw*1.2}" ${cand?'class="moPulse"':''}/>`:'';
    let g='';if(p.nature==='vanne')g=`<path d="M ${q.x-r} ${q.y-r*.75} L ${q.x} ${q.y} L ${q.x-r} ${q.y+r*.75} Z M ${q.x+r} ${q.y-r*.75} L ${q.x} ${q.y} L ${q.x+r} ${q.y+r*.75} Z" fill="${open?'#fff':'#c8382f'}" stroke="${open?'#1f8a3b':'#8f1f19'}" stroke-width="${sw*1.1}" stroke-linejoin="round"/>`;
    else if(p.nature==='purge')g=`<path d="M ${q.x} ${q.y-r} L ${q.x+r*.9} ${q.y+r*.7} L ${q.x-r*.9} ${q.y+r*.7} Z" fill="${open?'#2a7fd4':'#fff'}" stroke="${open?'#0f4c8a':'#3d3d3a'}" stroke-width="${sw}" stroke-linejoin="round"/>`;
    else if(p.nature==='vidange')g=`<path d="M ${q.x-r*.9} ${q.y-r*.7} L ${q.x+r*.9} ${q.y-r*.7} L ${q.x} ${q.y+r} Z" fill="${open?'#2a7fd4':'#fff'}" stroke="${open?'#0f4c8a':'#3d3d3a'}" stroke-width="${sw}" stroke-linejoin="round"/>`;
    else g=`<rect x="${q.x-r*.9}" y="${q.y-r*.9}" width="${r*1.8}" height="${r*1.8}" rx="${r*.25}" fill="#f1efe9" stroke="#3d3d3a" stroke-width="${sw}"/>`;
    const lab=p.nature==='vanne'?'V':p.nature==='purge'?'P':p.nature==='vidange'?'D':p.nature==='sst'?'SST':p.nature==='racc'?'R':'';
    h+=`<g class="moPt" data-key="${esc(key)}" style="cursor:pointer"><circle cx="${q.x}" cy="${q.y}" r="${r*2.2}" fill="rgba(255,255,255,.01)"/>${ring}${g}<text x="${q.x}" y="${q.y-r*1.9}" font-size="${fs}" font-weight="800" text-anchor="middle" fill="#141413" stroke="#fff" stroke-width="${fs*.3}" paint-order="stroke" font-family="system-ui,sans-serif" pointer-events="none">${lab} ${fmt(p.pk)}</text>${chg?`<text x="${q.x}" y="${q.y+r*3.1}" font-size="${fs*.85}" font-weight="800" text-anchor="middle" fill="#eb6834" stroke="#fff" stroke-width="${fs*.3}" paint-order="stroke" font-family="system-ui,sans-serif" pointer-events="none">${open?'ouverte ici':'fermée ici'}</text>`:''}</g>`;
    if(isSrc||isOut){const t=isSrc?((s.type==='rincer'?'Entrée · ':'Remplissage · ')+(WATER[s.water]||'')):(s.type==='rincer'?'Sortie':s.type==='vidanger'?'Vidange':s.type==='casser'?'Casser ici':'Purger ici');h+=`<text x="${q.x}" y="${q.y+r*(chg?4.4:3.1)}" font-size="${fs*.85}" font-weight="800" text-anchor="middle" fill="${isSrc?'#2a7fd4':'#0f4c8a'}" stroke="#fff" stroke-width="${fs*.3}" paint-order="stroke" font-family="system-ui,sans-serif" pointer-events="none">${esc(t)}</text>`;}});
  return `<svg class="moSvg" viewBox="${V.x} ${V.y} ${V.w} ${V.h}" preserveAspectRatio="xMidYMid meet">${h}</svg>`;}
function zoom(f,cx,cy){const V=ED.view;if(!V)return;const nx=cx!=null?cx:V.x+V.w/2,ny=cy!=null?cy:V.y+V.h/2;ED.view={x:nx-(nx-V.x)*f,y:ny-(ny-V.y)*f,w:V.w*f,h:V.h*f};render(true);}
/* ── rendu ── */
function render(planOnly){const mo=ED.mo;if(!mo)return;let el=document.getElementById('moEd');if(!el){el=document.createElement('div');el.id='moEd';document.body.appendChild(el);bind(el);}
  const sim=simulate(mo);const k=Math.max(0,Math.min(ED.sel,mo.steps.length-1));const P=sim.P;const canEd=A.can('hydro')&&!ED.terrain;const marks=A.marks?A.marks():{};
  if(planOnly){const pl=el.querySelector('#moPlan');if(pl){pl.innerHTML=planSVG(sim,k);return;}}
  const S=sim.steps[k];const s=mo.steps[k];const nOpen=Object.values(S.st).filter(v=>v==='o').length,nMan=Object.keys(S.st).length;
  const banner=ED.pick==='src'?'Touche le point de remplissage sur le plan : une vidange, une purge, une sous-station ou un raccordement.':ED.pick==='out'?'Touche la ou les sorties (purge ▲ ou vidange ▼) — touche encore pour retirer, puis « OK ».':ED.terrain?'Terrain : suis les étapes, coche chaque manœuvre faite.':k===0?'État de départ : touche une vanne, une purge ou une vidange pour la mettre ouverte ou fermée.':`Étape ${k} : touche une vanne, une purge ou une vidange pour l'ouvrir ou la fermer à cette étape (l'état se reporte aux suivantes).`;
  const chips=(st)=>Object.keys(st.set||{}).map(key=>`<span class="moChip ${st.set[key]==='o'?'o':'f'}">${st.set[key]==='o'?'Ouvrir ':'Fermer '}${esc(pShort(P[key]))}</span>`).join('');
  const card=(st,i)=>{const sm=sim.steps[i];const done=marks[st.id];return `<div class="moCard${i===k?' on':''}${done?' done':''}" data-step="${i}"><div class="moHead"><span class="moNum">${i}</span><b>${ST_ICO[st.type]||''} ${esc(ST[st.type]||st.type)}</b>${done?'<span class="moDone">✓ fait</span>':''}${canEd&&i>0?`<span class="moTools"><button class="iconbtn" data-mv="-1" aria-label="monter">↑</button><button class="iconbtn" data-mv="1" aria-label="descendre">↓</button><button class="iconbtn" data-del="${i}" aria-label="supprimer">✕</button></span>`:''}</div>
      <div class="moTxt">${esc(sentence(st,sm,P))}</div>${i>0&&Object.keys(st.set||{}).length?`<div class="moChips">${chips(st)}</div>`:''}
      ${i===k&&canEd?form(st):''}${sm.warn.map(w=>`<div class="moWarn">⚠ ${esc(w)}</div>`).join('')}
      ${ED.terrain&&i>0?`<button class="moBig ${done?'ok':''}" data-mark="${i}">${done?'✓ Fait — '+esc(done.byName||done.by||'')+' · '+new Date(done.at).toLocaleDateString('fr-FR'):'✓ Fait'}</button>`:''}</div>`;};
  const form=(st)=>{const w=(v,t)=>`<button class="moW ${st.water===v?'on':''}" data-water="${v}">${t}</button>`;let f='';
    if(st.type==='remplir'||st.type==='rincer')f+=`<div class="moRow">${w('brute','Eau brute')}${w('adoucie','Eau adoucie')}${w('autre','Autre')}</div><div class="moRow"><button class="btn sm" data-pick="src">${st.src?'Changer le point d\'entrée':'Choisir le point d\'entrée'}</button>${st.type==='rincer'?`<button class="btn sm" data-pick="out">${(st.outs||[]).length?'Changer la sortie':'Choisir la sortie'}</button>`:''}</div>`;
    if(st.type==='purger'||st.type==='vidanger'||st.type==='casser')f+=`<div class="moRow"><button class="btn sm" data-pick="out">${(st.outs||[]).length?'Changer les points':'Choisir les points sur le plan'}</button></div>`;
    if(st.type==='rincer')f+=`<label class="moL">Durée <input class="moN" type="number" data-num="min" value="${st.min||20}"> min, ou jusqu'à eau claire</label>`;
    if(st.type==='pression')f+=`<div class="moRow"><label class="moL">Pression <input class="moN" type="number" step="0.5" data-num="bar" value="${st.bar||6}"> bar</label><label class="moL">Maintien <input class="moN" type="number" data-num="min" value="${st.min||120}"> min</label></div>`;
    if(st.type==='attente')f+=`<label class="moL">Durée <input class="moN" type="number" data-num="h" value="${st.h||24}"> h</label>`;
    if(st.type==='note'||st.type==='attente')f+=`<input class="f moNote" data-note="1" value="${esc(st.note||'')}" placeholder="consigne (ex. prévenir l'exploitant avant d'ouvrir V PK 120)" style="width:100%;margin-top:4px">`;
    if(ED.pick)f+=`<div class="moRow"><button class="btn sm primary" data-pickok="1">OK, j'ai fini de choisir</button></div>`;return f?`<div class="moForm">${f}</div>`:'';};
  const addMenu=ED.adding?`<div class="moAdd">${['remplir','purger','rincer','pression','attente','casser','vidanger','vannes','note'].map(t=>`<button class="moT" data-add="${t}">${ST_ICO[t]} ${esc(ST[t])}</button>`).join('')}</div>`:'';
  el.innerHTML=`<div class="moTop"><button class="btn sm" data-close="1" aria-label="fermer">✕ Fermer</button><div class="moTitle"><b>📋 ${esc(mo.name)}</b><span class="dim"> · ${esc((MO_TYPES.find(t=>t[0]===mo.type)||[])[1]||mo.type)} · ${mo.steps.length-1} étape${mo.steps.length>2?'s':''}</span></div>
      <div class="moSeg"><button class="${ED.terrain?'':'on'}" data-mode="ed">${A.can('hydro')?'Créer':'Voir'}</button><button class="${ED.terrain?'on':''}" data-mode="te">Terrain</button></div><button class="btn sm" data-print="1">🖨 Imprimer</button>${canEd?`<button class="btn sm danger" data-delmo="1">🗑</button>`:''}</div>
    <div class="moBody"><div class="moPlanWrap"><div class="moStepTitle"><b>${k===0?'État de départ':'Étape '+k+' · '+esc(ST[s.type]||s.type)}</b><span class="dim"> · ${nOpen} ouverte${nOpen>1?'s':''} / ${nMan} · ${S.region?'eau : '+esc(S.region.txt)+' (≈ '+S.region.len+' m)':'pas d\'eau'}</span></div>
      <div class="moBanner ${ED.pick?'pick':''}">${esc(banner)}</div><div id="moPlan">${planSVG(sim,k)}</div>
      <div class="moZoom"><button class="btn sm" data-z="in">＋</button><button class="btn sm" data-z="out">－</button><button class="btn sm" data-z="fit">⌂</button></div>
      <div class="moLeg"><span><i class="lgV o"></i>vanne ouverte</span><span><i class="lgV f"></i>vanne fermée</span><span>▲ purge · ▼ vidange (bleue = ouverte)</span><span><i class="lgW"></i>en eau</span><span><i class="lgW n"></i>se remplit à cette étape</span><span><i class="lgC"></i>changée à cette étape</span></div></div>
    <div class="moSteps">${mo.steps.map(card).join('')}${canEd?`<button class="moBig add" data-addopen="1">＋ Ajouter une étape</button>${addMenu}`:''}
      ${ED.terrain?`<div class="moRow" style="margin-top:8px"><button class="btn" data-nav="-1" style="flex:1;min-height:48px">Précédente</button><button class="btn primary" data-nav="1" style="flex:1;min-height:48px">Étape suivante</button></div>`:''}</div></div>`;}
function bind(el){el.addEventListener('click',e=>{const t=e.target;const b=t.closest('[data-close],[data-mode],[data-print],[data-delmo],[data-step],[data-mv],[data-del],[data-pick],[data-pickok],[data-water],[data-add],[data-addopen],[data-mark],[data-nav],[data-z],.moPt');if(!b)return;const d=b.dataset;const mo=ED.mo;if(!mo)return;
    if(d.close){modopClose();return;}if(d.mode){ED.terrain=d.mode==='te';ED.pick=null;ED.adding=false;if(ED.terrain&&mo.steps.length>1)ED.sel=firstTodo(mo);render();return;}
    if(d.print){print(mo);return;}if(d.delmo){if(!confirm('Supprimer ce mode opératoire ?'))return;const L=listOf(false);const i=L.indexOf(mo);if(i>=0)L.splice(i,1);save();modopClose();return;}
    if(b.classList.contains('moPt')){tapPoint(b.dataset.key);return;}
    if(d.z){if(d.z==='fit'){ED.view=null;render(true);}else zoom(d.z==='in'?0.7:1/0.7);return;}
    if(d.mv!==undefined){const card=b.closest('[data-step]');moveStep(+card.dataset.step,+d.mv);return;}if(d.del!==undefined){if(confirm('Supprimer cette étape ?'))delStep(+d.del);return;}
    if(d.pick){ED.pick=d.pick;render();return;}if(d.pickok){ED.pick=null;render();return;}
    if(d.water){mo.steps[ED.sel].water=d.water;save();render();return;}
    if(d.addopen){ED.adding=!ED.adding;ED.pick=null;render();return;}if(d.add){addStep(d.add);return;}
    if(d.mark!==undefined){const st=mo.steps[+d.mark];if(st&&A.mark){A.mark(mo.id,{id:st.id,label:ST[st.type]+' — '+sentence(st,simulate(mo).steps[+d.mark],pMap())});render();}return;}
    if(d.nav){ED.sel=Math.max(ED.terrain?1:0,Math.min(mo.steps.length-1,ED.sel+(+d.nav)));render();return;}
    if(d.step!==undefined&&!t.closest('button,input')){ED.sel=+d.step;ED.pick=null;ED.adding=false;render();return;}});
  el.addEventListener('change',e=>{const t=e.target;const mo=ED.mo;if(!mo)return;const st=mo.steps[ED.sel];if(!st)return;if(t.dataset.num){st[t.dataset.num]=+t.value||0;save();render();}else if(t.dataset.note!==undefined){st.note=t.value;save();render();}}); /* change = fin de saisie : la carte reprend la consigne */
  /* glisser le plan = déplacer la vue ; molette = zoom */
  el.addEventListener('pointerdown',e=>{const pl=e.target.closest('#moPlan');if(!pl||e.target.closest('.moPt'))return;ED.drag={x:e.clientX,y:e.clientY,v:Object.assign({},ED.view),moved:false};});
  el.addEventListener('pointermove',e=>{const D=ED.drag;if(!D||!ED.view)return;const pl=document.getElementById('moPlan');const svg=pl&&pl.querySelector('svg');if(!svg)return;const r=svg.getBoundingClientRect();const sc=ED.view.w/r.width;const dx=(e.clientX-D.x)*sc,dy=(e.clientY-D.y)*sc;if(Math.hypot(e.clientX-D.x,e.clientY-D.y)>3)D.moved=true;if(D.moved){ED.view={x:D.v.x-dx,y:D.v.y-dy,w:D.v.w,h:D.v.h};render(true);}});
  el.addEventListener('pointerup',()=>{ED.drag=null;});el.addEventListener('wheel',e=>{if(!e.target.closest('#moPlan'))return;e.preventDefault();zoom(e.deltaY<0?0.8:1.25);},{passive:false});}
/* ── impression : une page par étape (plan + consigne + manœuvres) ── */
function print(mo){const sim=simulate(mo);const P=sim.P;const NET=A.net();const pages=mo.steps.map((s,i)=>{const sm=sim.steps[i];const svg=planSVG(sim,i,{fit:true,print:true});const chips=Object.keys(s.set||{}).map(key=>`<li>${s.set[key]==='o'?'Ouvrir':'Fermer'} ${esc(pName(P[key]))}</li>`).join('');
    return `<section style="break-inside:avoid;page-break-after:always;margin:0 0 14px"><h2 style="margin:0 0 4px">${i===0?'État de départ (prérequis)':'Étape '+i+' · '+esc(ST[s.type]||s.type)}</h2><p style="margin:0 0 6px;font-size:13px">${esc(sentence(s,sm,P))}</p>${chips?`<ul style="margin:0 0 6px 16px;font-size:12.5px">${chips}</ul>`:''}${sm.warn.map(w=>`<div style="color:#6b4700;font-size:12px">⚠ ${esc(w)}</div>`).join('')}<div style="height:420px">${svg.replace('class="moSvg"','class="moSvg" style="width:100%;height:100%"')}</div><div style="font-size:11px;color:#555">◆ creuse = vanne ouverte · ◆ pleine = fermée · ▲ purge · ▼ vidange (bleue = ouverte) · bleu = en eau · encadré orange = changée à cette étape</div></section>`;}).join('');
  const html=docHTML({title:'Mode opératoire — '+mo.name,h1:'Mode opératoire hydraulique',kicker:(NET&&NET.name)||'',sub:mo.name+' · '+((MO_TYPES.find(t=>t[0]===mo.type)||[])[1]||mo.type),meta:[['Étapes',String(mo.steps.length-1)],['Établi le',new Date(mo.at).toLocaleDateString('fr-FR')],['Par',esc(mo.by||'')]],body:pages,css:'.moSvg{background:#faf9f5;border:1px solid #ddd;border-radius:8px}'});
  const w=window.open('about:blank');if(!w){A.toast('Autorise l\'ouverture de fenêtres pour l\'impression');return;}w.document.write(html);w.document.close();}
/* ── liste (onglet Hydraulique) + terrain (📍 Points) ── */
export function modopListHTML(canH){const L=modopAll();const marks=A.marks?A.marks():{};
  return `<div class="card moList">${L.length?L.map(mo=>{const n=mo.steps.length-1;const d=mo.steps.slice(1).filter(s=>marks[s.id]).length;return `<div class="moRowL"><div><b>📋 ${esc(mo.name)}</b> <span class="dim">· ${esc((MO_TYPES.find(t=>t[0]===mo.type)||[])[1]||mo.type)} · ${n} étape${n>1?'s':''}${d?' · '+d+' faite'+(d>1?'s':''):''}</span></div><div class="moRow"><button class="btn sm primary" data-moopen="${esc(mo.id)}">${canH?'Ouvrir':'Voir'}</button><button class="btn sm" data-moterrain="${esc(mo.id)}">Terrain</button></div></div>`;}).join(''):'<div class="hint">Aucun mode opératoire. Il se crée sur le plan : on ouvre / ferme les vannes, on remplit depuis un point, on purge, on met en pression… étape par étape, et le terrain coche « Fait ».</div>'}
    ${canH?`<button class="moBig add" data-monew="1" style="margin-top:8px">＋ Créer un mode opératoire</button>`:''}</div>`;}
export function modopNewModal(){A.openModal(`<h3 style="margin-top:0">📋 Créer un mode opératoire</h3><label class="f">Mode opératoire de quoi ?</label><div class="chips" id="moTypes" style="flex-wrap:wrap;overflow:visible">${MO_TYPES.map(([v,t],i)=>`<button class="chip${i===1?' on':''}" data-v="${v}" style="min-height:44px">${t}</button>`).join('')}</div>
    <label class="f" style="margin-top:8px">Nom (facultatif)</label><input class="f" id="moName" placeholder="ex. Épreuve + rinçage tronçon 1" style="width:100%">
    <div class="hint" style="margin-top:6px">Ensuite : l'état de départ du réseau (vannes ouvertes / fermées sur le plan), puis les étapes : remplir depuis un point, purger, rincer, mettre en pression, attendre, casser la pression, vidanger…</div>
    <div class="actions"><button class="btn block" data-close>Annuler</button><button class="btn block primary" id="moGo">Créer et ouvrir le plan</button></div>`);
  let type='epreuve_rincage';document.querySelectorAll('#moTypes .chip').forEach(b=>b.onclick=()=>{type=b.dataset.v;document.querySelectorAll('#moTypes .chip').forEach(x=>x.classList.toggle('on',x===b));});
  const go=document.getElementById('moGo');if(go)go.onclick=()=>{const name=String((document.getElementById('moName')||{}).value||'').trim();A.closeModal();const mo=modopCreate(type,name);modopOpen(mo.id);};}
export function modopTerrainHTML(){const L=modopAll();if(!L.length)return '';const marks=A.marks?A.marks():{};
  return `<div class="card">${L.map(mo=>{const n=mo.steps.length-1;const d=mo.steps.slice(1).filter(s=>marks[s.id]).length;return `<div class="moRowL"><div><b>📋 ${esc(mo.name)}</b> <span class="dim">· ${d} / ${n} étape${n>1?'s':''} faite${d>1?'s':''}</span></div><button class="btn sm primary" data-moterrain="${esc(mo.id)}">Suivre sur le plan</button></div>`;}).join('')}</div>`;}
export function modopDoeHTML2(){const L=modopAll();if(!L.length)return '';const marks=A.marks?A.marks():{};const P=pMap();
  return `<h3 style="margin:12px 0 4px">Modes opératoires hydrauliques</h3>`+L.map(mo=>{const sim=simulate(mo);return `<h4>${esc(mo.name)} — ${esc((MO_TYPES.find(t=>t[0]===mo.type)||[])[1]||mo.type)}</h4><ol>${mo.steps.slice(1).map((s,i)=>{const m=marks[s.id];return `<li>${esc(sentence(s,sim.steps[i+1],P))}${m?` <span class="dim">— fait le ${new Date(m.at).toLocaleDateString('fr-FR')} par ${esc(m.byName||m.by||'')}</span>`:''}</li>`;}).join('')}</ol>`;}).join('');}
export function modopHandleClick(e){const b=e.target.closest('[data-monew],[data-moopen],[data-moterrain]');if(!b)return false;const d=b.dataset;if(d.monew){modopNewModal();return true;}if(d.moopen){modopOpen(d.moopen);return true;}if(d.moterrain){modopOpen(d.moterrain,{terrain:true});return true;}return true;}
const CSS=`#moEd{position:fixed;inset:0;z-index:60;background:#f6f5f2;display:flex;flex-direction:column;font-family:inherit;color:#141413}
.moTop{display:flex;align-items:center;gap:8px;padding:8px 10px;background:#fff;border-bottom:1px solid #e1ded6;flex-wrap:wrap}.moTitle{flex:1;min-width:0;font-size:14px;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}
.moSeg{display:flex}.moSeg button{border:1px solid #c9c6bd;background:#fff;font:inherit;font-size:13px;font-weight:600;padding:0 12px;min-height:38px;cursor:pointer}.moSeg button:first-child{border-radius:10px 0 0 10px}.moSeg button:last-child{border-radius:0 10px 10px 0;margin-left:-1px}.moSeg button.on{background:#141413;color:#fff;border-color:#141413}
.moBody{flex:1;min-height:0;display:flex;gap:10px;padding:10px}.moPlanWrap{flex:1;min-width:0;display:flex;flex-direction:column;gap:6px;position:relative}.moSteps{width:400px;flex:none;overflow-y:auto;display:flex;flex-direction:column;gap:8px;padding-right:4px}
#moPlan{flex:1;min-height:0;background:#fff;border:1px solid #dddad3;border-radius:14px;overflow:hidden;touch-action:none;background-image:linear-gradient(#f1efe9 1px,transparent 1px),linear-gradient(90deg,#f1efe9 1px,transparent 1px);background-size:40px 40px}#moPlan svg{width:100%;height:100%;display:block}
.moZoom{position:absolute;right:14px;top:92px;display:flex;flex-direction:column;gap:4px}.moZoom .btn{min-width:40px;min-height:40px;background:#fff}
.moStepTitle{font-size:15px}.moBanner{background:#1c3d6b;color:#fff;border-radius:12px;padding:8px 12px;font-size:13px;font-weight:600;line-height:1.35}.moBanner.pick{background:#eb6834}
.moLeg{display:flex;flex-wrap:wrap;gap:6px 14px;font-size:11.5px;color:#3d3d3a;align-items:center}.moLeg i{display:inline-block;vertical-align:middle;margin-right:4px}.lgV{width:14px;height:10px;clip-path:polygon(0 0,50% 50%,0 100%,0 100%,100% 100%,50% 50%,100% 0);background:#c8382f}.lgV.o{background:#fff;outline:2px solid #1f8a3b;outline-offset:-2px}.lgW{width:22px;height:5px;background:#5b9bd8;border-radius:2px}.lgW.n{background:#1565c0}.lgC{width:12px;height:12px;border-radius:50%;border:2px solid #eb6834}
.moCard{background:#fff;border:1px solid #e1ded6;border-radius:14px;padding:10px 12px;display:flex;flex-direction:column;gap:6px;cursor:pointer}.moCard.on{border:2px solid #1c3d6b;box-shadow:0 4px 14px rgba(28,61,107,.14);padding:9px 11px}.moCard.done{background:#f3faf4}
.moHead{display:flex;align-items:center;gap:8px;min-height:30px}.moNum{width:26px;height:26px;border-radius:50%;background:#141413;color:#fff;font-weight:800;font-size:12.5px;display:flex;align-items:center;justify-content:center;flex:none}.moCard.on .moNum{background:#1c3d6b}.moTools{margin-left:auto;display:flex;gap:2px}.moTools .iconbtn{min-width:32px;min-height:32px}.moDone{color:#1f8a3b;font-weight:800;font-size:12px}
.moTxt{font-size:13px;line-height:1.4}.moChips{display:flex;flex-wrap:wrap;gap:4px}.moChip{border-radius:8px;padding:2px 7px;font-size:12px;font-weight:700}.moChip.o{background:#e3f3e7;color:#14632b;border:1px solid #9fd2ad}.moChip.f{background:#fbe5e3;color:#8f1f19;border:1px solid #eeb0aa}
.moWarn{background:#fff3d6;color:#6b4700;border-radius:8px;padding:5px 8px;font-size:12px;line-height:1.35}.moForm{display:flex;flex-direction:column;gap:6px;border-top:1px dashed #e1ded6;padding-top:6px}.moRow{display:flex;gap:6px;flex-wrap:wrap;align-items:center}
.moW{border:1px solid #c9c6bd;background:#fff;border-radius:10px;font:inherit;font-size:13px;font-weight:700;min-height:40px;padding:0 10px;cursor:pointer;flex:1}.moW.on{background:#2a7fd4;border-color:#2a7fd4;color:#fff}.moL{font-size:12.5px;display:flex;align-items:center;gap:6px}.moN{width:70px;height:36px;border:1px solid #c9c6bd;border-radius:8px;font:inherit;font-size:15px;font-weight:700;text-align:center}
.moBig{border:1px solid #d6d3ca;background:#fff;border-radius:12px;font:inherit;font-size:15px;font-weight:700;min-height:52px;cursor:pointer;width:100%}.moBig.ok{border-color:#1f8a3b;background:#eef8f0;color:#14632b}.moBig.add{border:2px dashed #1c3d6b;color:#1c3d6b}
.moAdd{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:6px}.moT{border:1px solid #d6d3ca;background:#fff;border-radius:12px;font:inherit;font-size:13px;font-weight:700;min-height:50px;cursor:pointer;text-align:left;padding:0 10px}
.moFlow{animation:moFlow 1.1s linear infinite}@keyframes moFlow{to{stroke-dashoffset:-20}}.moPulse{animation:moPulse 1.1s ease-out infinite}@keyframes moPulse{0%{opacity:1}100%{opacity:.25}}
.moList .moRowL,.moRowL{display:flex;justify-content:space-between;align-items:center;gap:8px;flex-wrap:wrap;padding:6px 0;border-top:1px solid #eee}.moRowL:first-child{border-top:0}
@media(max-width:760px){.moBody{flex-direction:column;overflow-y:auto}.moPlanWrap{flex:none;height:52vh}.moSteps{width:auto;flex:none;overflow:visible}.moZoom{top:auto;bottom:52px}.moTop .moTitle{order:9;flex:1 1 100%;white-space:normal;font-size:13px}}`;
export function initModop(api){A=api;try{const st=document.createElement('style');st.id='css-modop-2310';st.textContent=CSS;document.head.appendChild(st);}catch(e){}return {open:modopOpen,close:modopClose,create:modopCreate,all:modopAll,simulate,sentence,list:modopListHTML,terrain:modopTerrainHTML,doe:modopDoeHTML2,ed:ED,render:()=>render(),tap:tapPoint,addStep,newModal:modopNewModal};}
