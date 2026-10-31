// modifs.js — MODIFICATIONS PAR ÉLÉMENTS (29/10/2026, lot 2910b). Ethan : « les modifs, c'est ludique mais on ne comprend rien à ce qu'on entoure ou pas, ce que ça comprend ou
// pas ; il faut qu'il y ait TOUT ce qui a changé, et je dois regrouper et attribuer chacune des modifs, mais détaillé : sur une même modif il peut y avoir des choses comprises et
// d'autres non. Sélectionner le −, sélectionner le +, et que ça compare. Le plan d'ensemble affiche tout ce qui a été modifié / enlevé, et il faut attribuer tout ce qui a bougé,
// avec suivi de date et de version. »
// 1. ÉLÉMENTS : l'écart réel − marché découpé en morceaux atomiques, chacun − (retiré du marché) ou + (ajouté au réel) : tronçon de tube par DN (dévié, prolongé, raccourci, ou
//    MÊME PASSAGE avec un autre DN : une paire − / +), pièce (coude, té, réduction, vanne, purge, vidange, fin de ligne — aller + retour groupés), soudure ajoutée sur place,
//    manchon extrudé, fausse coupe, et un « ajustement » quand les soudures de la ligne ne se répartissent pas exactement. Chaque élément porte ses quantités (ml, soudures, pièces),
//    sa position sur le plan, la ligne, une clé STABLE (ligne + nature + PK sur le marché), et la version du tracé où l'appli l'a vu pour la première fois.
// 2. MODIFS : NET.modifs = {items:[{id, n, nom, devis, els:[clés], q:{ligne du comparatif → forfait | propose | commande | note | corr}, at, by, log}], seen:{clé → {at, v}}, vers:[...]}.
//    Une modif = des éléments choisis (sur le plan : toucher, entourer, ou toute une version) + le comparatif retiré / ajouté / écart par quantité et par DN, QUALIFIÉ LIGNE PAR LIGNE.
//    Tout élément doit finir attribué ; un élément qui n'existe plus (tracé retouché) reste listé dans sa modif comme « disparu » jusqu'à ce qu'on le retire.
// Pur (Node / navigateur) pour le calcul ; l'interface est dans modifs_ui.js. Lignes au format de l'appli (setupSite) ; marché = photographie de marche.js.
import {axisOf,polyLen,atOnAxis,dnProfile,linePieces,PIECE_KEY} from './marche.js';
const r1=v=>Math.round((+v||0)*10)/10;const num=v=>v===null||v===undefined||v===''?0:(isFinite(+v)?+v:0);
export const MOD_Q=[['ml','Linéaire','ml'],['coudes','Coudes',''],['tes','Tés',''],['reduc','Réductions',''],['vannes','Vannes',''],['purges','Purges',''],['vidanges','Vidanges',''],['bouchons','Fins de ligne',''],['soud','Soudures + manchons',''],['extru','Manchons extrudés',''],['fc','Fausses coupes','']];
export const MOD_ET={forfait:'Compris',propose:'TS proposé',commande:'TS commandé',note:'Pour mémoire',corr:'Oubli du dessin'};
export const MOD_ET_LONG={forfait:'compris (global et forfaitaire)',propose:'TS proposé',commande:'TS commandé',note:'pour mémoire (sans suite)',corr:'oubli du dessin initial (le marché est corrigé)'};
export const MOD_ORDER=['forfait','propose','commande','note','corr'];
export const MOD_COL={forfait:'#7b3fd1',propose:'#b88d12',commande:'#df5f2a',note:'#11766f',corr:'#5b5b5b'};
export const MOD_PALETTE=['#2f6fd0','#8a5a14','#0f7f8c','#9b3d8f','#4f7a1c','#b3451f','#3b5bdb','#7a6a1a'];
export const isTS=e=>e==='propose'||e==='commande';
const W={ml:['m','m'],coudes:['coude','coudes'],tes:['té','tés'],reduc:['réduction','réductions'],vannes:['vanne','vannes'],purges:['purge','purges'],vidanges:['vidange','vidanges'],bouchons:['fin de ligne','fins de ligne'],soud:['soudure','soudures'],extru:['manchon extrudé','manchons extrudés'],fc:['fausse coupe','fausses coupes']};
const PK_WORD={valve:'vanne',tee:'té',purge:'purge',vidange:'vidange',reducer:'réduction',bend:'coude',endcap:'fin de ligne'};
const PK_LEN={valve:1.5,tee:1,purge:1,vidange:1,reducer:1,bend:2,endcap:0.3}; /* emprise par défaut d'une pièce du marché (ses pcs n'ont que le PK milieu) */
export const fmtFR=n=>Number(n).toLocaleString('fr-FR',{maximumFractionDigits:1});
/* étiquette courte d'un élément, pour le plan (30/10) : « coude DN 32 », « té DN 65/32 ×2 », « tube DN 32 · 35 m », « soudure », « extrudé »… (le signe est ajouté par l'appelant) */
export function shortLab(e){if(!e)return '';const dn=e.dn?' DN '+e.dn+(e.dn2&&e.dn2!==e.dn?'/'+e.dn2:''):'';const q=e.q||{};
  if(e.kind==='tube'){const ml=fmtFR(num(q.ml))+' m';if(e.role==='dnp'&&e.dnchg)return 'DN '+e.dnchg.from+' → '+e.dnchg.to+' · '+ml;if(e.role==='dnm')return 'ancien DN '+e.dn+' · '+ml;if(e.role==='old')return 'ancien passage'+dn+' · '+ml;if(e.role==='new')return 'nouveau passage'+dn+' · '+ml;if(e.role==='ext')return 'prolongement'+dn+' · '+ml;if(e.role==='short')return 'raccourci'+dn+' · '+ml;if(e.gone)return 'ligne supprimée'+dn+' · '+ml;if(e.isNew)return 'ligne nouvelle'+dn+' · '+ml;return 'tube'+dn+' · '+ml;}if(e.kind==='piece')return (PK_WORD[e.k]||e.k)+dn+(e.n>1?' ×'+e.n:'')+(e.unloc?' (où ?)':'');
  if(e.kind==='extru')return 'manchon extrudé';if(e.kind==='fc')return 'fausse coupe';if(e.kind==='extra')return 'soudure ajoutée';if(e.kind==='adj')return q.soud?'ajustement '+fmtFR(num(q.soud))+' soud.':q.fc?'ajustement '+fmtFR(num(q.fc))+' fausse'+(num(q.fc)>1?'s coupes':' coupe'):'ajustement '+fmtFR(num(q.ml))+' m';return e.lab||'';}
export function qtyTxt(q){return MOD_Q.filter(([k])=>q&&num(q[k])).map(([k])=>{const v=num(q[k]);return (k==='ml'?fmtFR(v)+' m':fmtFR(v)+' '+W[k][v>1?1:0]);}).join(' · ');}
/* ── géométrie ── */
function distToAxis(ax,q){let best=1e18,pk=0,acc=0,bx=q[0],by=q[1];for(let i=1;i<ax.length;i++){const a=ax[i-1],b=ax[i];const dx=b[0]-a[0],dy=b[1]-a[1];const L2=dx*dx+dy*dy||1e-12;let t=((q[0]-a[0])*dx+(q[1]-a[1])*dy)/L2;t=Math.max(0,Math.min(1,t));const px=a[0]+dx*t,py=a[1]+dy*t;const d=Math.hypot(q[0]-px,q[1]-py);const seg=Math.sqrt(L2);if(d<best){best=d;pk=acc+seg*t;bx=px;by=py;}acc+=seg;}return {d:best,pk,p:[bx,by]};}
function subAxis(ax,m0,m1){if(!ax||ax.length<2)return [];const out=[];let acc=0;const a0=atOnAxis(ax,m0);if(a0)out.push(a0);for(let i=1;i<ax.length;i++){const a=ax[i-1],b=ax[i];const s=Math.hypot(b[0]-a[0],b[1]-a[1]);const e=acc+s;if(e>m0&&e<m1)out.push([b[0],b[1]]);acc=e;}const a1=atOnAxis(ax,m1);if(a1)out.push(a1);return out.filter((p,i,arr)=>!i||Math.hypot(p[0]-arr[i-1][0],p[1]-arr[i-1][1])>1e-6);}
const dnAtP=(prof,m)=>{for(const s of prof){if(m>=s.m0-1e-6&&m<=s.m1+1e-6)return s.dn;}return prof.length?(m<prof[0].m0?prof[0].dn:prof[prof.length-1].dn):0;};
/* intervalles [a,b] à partir d'un test par échantillon */
function runs(L,step,test){const out=[];let cur=null;for(let t=0;t<=L+1e-9;t+=step){const m=Math.min(L,t);const ok=test(m);if(ok){if(!cur){cur={a:m,b:m};out.push(cur);}else cur.b=m;}else cur=null;if(m>=L)break;}
  for(let i=out.length-1;i>0;i--){if(out[i].a-out[i-1].b<=1.01*step*2){out[i-1].b=out[i].b;out.splice(i,1);}}return out.filter(r=>r.b-r.a>=0.5);}
/* ── réel : conduites, soudures, DN (PK d'axe) ── */
function reelInfo(l){let ax=axisOf(l);if(ax.length<2){ax=[];(l.els||[]).forEach(e=>{const pl=e.axis&&e.axis[0];(pl||[]).forEach(p=>{const q=Array.isArray(p)?[+p[0],+p[1]]:[+p.x,+p.y];const last=ax[ax.length-1];if(!last||Math.hypot(last[0]-q[0],last[1]-q[1])>1e-6)ax.push(q);});});} /* ligne importée (DXF) sans axe propre : l'axe suit ses pièces */if(ax.length<2)return null;const L=polyLen(ax);let cdL=0;['A','R'].forEach(c=>{const cd=l.cond&&l.cond[c];((cd&&cd.els)||[]).forEach(e=>{cdL=Math.max(cdL,num(e.m1));});});const k=L>0&&cdL>0?L/cdL:1;
  const welds=[];['A','R'].forEach(c=>{const cd=l.cond&&l.cond[c];if(!cd)return;(cd.joints||[]).forEach((j,ji)=>{if(j.sst)return;const e=cd.els&&cd.els[j.idx];const m=(j.m!=null?num(j.m):(e?num(e.m1):0))*k;welds.push({c,m,ji,idx:j.idx,id:j.weldId,extru:!!j.extru,fc:!!j.fc,extra:!!j.extra,nu:!!j.nu,dn:num(j.dn||(e&&e.dn)||l.dn)});});});
  const prof=dnProfile(l).map(s=>({m0:s.m0*k,m1:s.m1*k,dn:s.dn}));return {ax,L,k,welds,prof};}
function marcheInfo(x){const ax=x.axis||[];const L=polyLen(ax);const dnpEnd=x.dnp&&x.dnp.length?x.dnp[x.dnp.length-1].m1:0;const k=L>0&&dnpEnd>0?L/dnpEnd:1;
  const welds=[];if(x.wk){['A','R'].forEach(c=>(x.wk[c]||[]).forEach(w=>welds.push({c,m:num(w[0])*k,fc:!!w[1],ex:!!w[2]})));}
  const prof=(x.dnp||[]).map(s=>({m0:s.m0*k,m1:s.m1*k,dn:s.dn}));return {ax,L,k,welds,prof,hasWk:!!(x.wk&&(x.wk.A||x.wk.R)),hasPcs:!!x.pcs,hasDnp:!!(x.dnp&&x.dnp.length)};}
const cnt=(W,a,b,f)=>W.filter(w=>w.m>=a-0.05&&w.m<=b+0.05&&(!f||f(w))).length;
/* le plus gros tube d'une ligne entière (supprimée / nouvelle) absorbe l'écart de soudures que les morceaux n'expliquent pas (la ligne reste exacte) */
function fixQ(out,k,target){const tubes=out.filter(e=>e.kind==='tube');if(!tubes.length)return;const sum=out.reduce((s,e)=>s+e.s*num(e.q[k]),0);const d=Math.round(target-sum);if(!d)return;const big=tubes.slice().sort((a,b)=>num(b.q.ml)-num(a.q.ml))[0];const v=num(big.q[k])+big.s*d;if(v>=0){big.q[k]=v;if(k==='soud')big.est=true;}}
const fixSoud=(out,target)=>fixQ(out,'soud',target);
/* ── les éléments d'une ligne ── */
function lineElements(r,l,x,o){const out=[];const lid=r.id,name=r.name||lid;const add=e=>{e.line=lid;e.lineName=name;if(out.some(z=>z.id===e.id)){let i=2;while(out.some(z=>z.id===e.id+'|'+i))i++;e.id=e.id+'|'+i;} /* 30/10 : deux pièces de même nature au même PK marché (lyre perpendiculaire à l'axe…) : clés distinctes */out.push(e);return e;};
  const R=l?reelInfo(l):null;const M=x&&x.axis&&x.axis.length>1?marcheInfo(x):null;if(l&&!R)return out;
  const pcKind=k=>k==='bend'||k==='steelbend'?'bend':k==='bypass'?'endcap':k;
  /* pièces groupées aller + retour au même PK (± 1,5 m) : {k, m (PK conduite), n, c:[...], ids} */
  const groupPcs=(list,keyM)=>{const G=[];list.slice().sort((a,b)=>num(a[keyM])-num(b[keyM])).forEach(p=>{const k=pcKind(p.k);const g=G.find(g=>g.k===k&&Math.abs(g.m-num(p[keyM]))<=1.5&&!g.c.includes(p.c||'A'));if(g){g.n++;g.c.push(p.c||'A');g.src.push(p);}else G.push({k,m:num(p[keyM]),n:1,c:[p.c||'A'],src:[p]});});return G;};
  const reelEl=p=>{const cd=l&&l.cond&&l.cond[p.c||'A'];return cd?((cd.els||[]).find(e=>e.id===p.id)||null):null;};const posA=m=>{const P=o.pos(l,m);return P?[P.x,P.y]:null;};
  const pcLab=(k,dn,dn2,n)=>`${PK_WORD[k]||k}${dn?' DN '+dn+(dn2&&dn2!==dn?'/'+dn2:''):''}${n>1?' ×'+n+' (aller + retour)':n===1?' (un seul côté)':''}`;
  const qOf=(k,n)=>{const q={};const key=PIECE_KEY[k]||(k==='purge'?'purges':k==='vidange'?'vidanges':null);if(key)q[key]=n;return q;};
  if(r.gone&&M){ /* ligne du marché supprimée : tout ce qu'elle contenait est retiré */
    const prof=M.prof.length?M.prof:[{m0:0,m1:M.L,dn:num(x.dn)}];
    prof.forEach(s=>{const a=Math.max(0,s.m0),b=Math.min(M.L,s.m1);if(b-a<0.3)return;const soud=M.hasWk?cnt(M.welds,a,b):Math.round(2*(b-a)/12);const fc=M.hasWk?cnt(M.welds,a,b,w=>w.fc):0;
      add({id:`${lid}|-|tube|${s.dn}|${Math.round(a)}-${Math.round(b)}`,s:-1,kind:'tube',dn:s.dn,q:Object.assign({ml:r1(b-a),soud},fc?{fc}:{}),lab:`Tube DN ${s.dn} · ${name} (ligne supprimée, PK ${fmtFR(a)} → ${fmtFR(b)})`,path:subAxis(M.ax,a,b),m0:a,m1:b,mid:(a+b)/2,est:!M.hasWk,gone:true});});
    groupPcs(x.pcs||[],'m').forEach(g=>{const mm=g.m*M.k;const dn=M.prof.length?dnAtP(M.prof,mm):num(x.dn);add({id:`${lid}|-|${g.k}|${Math.round(mm)}`,s:-1,kind:'piece',k:g.k,dn,n:g.n,q:qOf(g.k,g.n),lab:`${pcLab(g.k,dn,0,g.n)} · ${name} (ligne supprimée, PK ${fmtFR(mm)})`,at:[atOnAxis(M.ax,mm)],m0:mm,m1:mm,mid:mm,inTube:true,gone:true});});
    fixSoud(out,-num(x.c&&x.c.soud));fixQ(out,'fc',-num(x.c&&x.c.fc)); /* 30/10 : le total de soudures (et de fausses coupes) de la ligne = son compte marché (les pièces en ajoutent : l'estimation « 2 par barre » ne suffit pas) */
    out.forEach(e=>{e.spot=lid+':gone';});return out;}
  if(!M||!R){ /* ligne nouvelle (absente du marché) : tout son contenu est ajouté */
    if(!R)return out;const prof=R.prof.length?R.prof:[{m0:0,m1:R.L,dn:num(l.dn)}];
    prof.forEach(s=>{const a=Math.max(0,s.m0),b=Math.min(R.L,s.m1);if(b-a<0.3)return;const soud=cnt(R.welds,a,b,w=>!w.extra);const fc=cnt(R.welds,a,b,w=>w.fc); /* 30/10 : les fausses coupes d'une ligne nouvelle font partie de son tube (pas une pastille par soudure) */
      add({id:`${lid}|+|tube|${s.dn}|${Math.round(a)}-${Math.round(b)}`,s:1,kind:'tube',dn:s.dn,q:Object.assign({ml:r1(b-a),soud},fc?{fc}:{}),lab:`Tube DN ${s.dn} · ${name} (ligne nouvelle, PK ${fmtFR(a)} → ${fmtFR(b)})`,path:subAxis(R.ax,a,b),m0:a,m1:b,mid:(a+b)/2,isNew:true});});
    groupPcs(linePieces(l),'m').forEach(g=>{const mm=g.m*R.k;const e0=reelEl(g.src[0]);const dn=num(e0&&e0.dn)||dnAtP(R.prof,mm)||num(l.dn);const dn2=e0?num(g.k==='reducer'?e0.dn2:e0.dnb):0;add({id:`${lid}|+|${g.k}|${Math.round(mm)}`,s:1,kind:'piece',k:g.k,dn,dn2:dn2||undefined,n:g.n,q:qOf(g.k,g.n),lab:`${pcLab(g.k,dn,dn2,g.n)} · ${name} (ligne nouvelle, PK ${fmtFR(mm)})`,at:[posA(g.m)].filter(Boolean),m0:mm,m1:mm,mid:mm,inTube:true,isNew:true});});
    R.welds.forEach(w=>{if(w.extru)add(extruEl(l,w,name,o));});
    fixSoud(out,num((r.d||{}).soud));fixQ(out,'fc',num((r.d||{}).fc)); /* 30/10 : total = l'écart de la ligne (soudures comptées par l'appli) */
    out.forEach(e=>{e.spot=lid+':new';});return out;}
  /* ligne présente des deux côtés : correspondance des axes, échantillonnée (0,25 à 1 m) */
  const TOL=0.6;const step=Math.max(0.25,Math.min(1,Math.max(R.L,M.L)/400));
  const onM=m=>distToAxis(M.ax,atOnAxis(R.ax,m));const onR=m=>distToAxis(R.ax,atOnAxis(M.ax,m));
  const mpk=p=>Math.round(distToAxis(M.ax,p).pk); /* PK marché d'un point : la clé stable */
  const dnR=m=>R.prof.length?dnAtP(R.prof,m):num(l.dn),dnM=m=>M.prof.length?dnAtP(M.prof,m):num(x.dn);
  /* + tubes : passages du réel hors du marché (déviation, prolongement) */
  runs(R.L,step,m=>onM(m).d>TOL).forEach(rn=>{splitByDn(rn.a,rn.b,dnR,step).forEach(([a,b,dn])=>{const pa=atOnAxis(R.ax,a),pb=atOnAxis(R.ax,b);const soud=cnt(R.welds,a,b,w=>!w.extra);const ext=rn.b>=R.L-step&&onM(Math.max(0,rn.a-step)).d<=TOL&&rn.a>=M.L-5;
      add({id:`${lid}|+|tube|${dn}|${mpk(pa)}-${mpk(pb)}${ext?'e':''}`,s:1,kind:'tube',dn,q:{ml:r1(b-a),soud},lab:`Tube DN ${dn} · ${name} (${ext?'prolongement':'nouveau passage'}, PK ${fmtFR(a)} → ${fmtFR(b)})`,path:subAxis(R.ax,a,b),m0:a,m1:b,mid:(a+b)/2,role:ext?'ext':'new',mpk0:Math.min(mpk(pa),mpk(pb)),mpk1:Math.max(mpk(pa),mpk(pb))});});});
  /* − tubes : passages du marché que le réel ne suit plus (dévié, raccourci) */
  runs(M.L,step,m=>onR(m).d>TOL).forEach(rn=>{splitByDn(rn.a,rn.b,dnM,step).forEach(([a,b,dn])=>{const soud=M.hasWk?cnt(M.welds,a,b):Math.round(2*(b-a)/12);const pr0=onR(a).pk,pr1=onR(b).pk;const short=rn.b>=M.L-step&&rn.a>=R.L-5;
      add({id:`${lid}|-|tube|${dn}|${Math.round(a)}-${Math.round(b)}`,s:-1,kind:'tube',dn,q:{ml:r1(b-a),soud},lab:`Tube DN ${dn} · ${name} (${short?'raccourci':'ancien passage'}, PK marché ${fmtFR(a)} → ${fmtFR(b)})`,path:subAxis(M.ax,a,b),m0:Math.min(pr0,pr1),m1:Math.max(pr0,pr1),mid:(pr0+pr1)/2,est:!M.hasWk,role:short?'short':'old',mpk0:a,mpk1:b});});});
  /* 30/10 (Ethan : « les longueurs, je ne comprends pas comment les grouper ») : un ancien passage et le nouveau passage qui le remplace (même tronçon du marché, au
     recouvrement des PK marché) sont LIÉS (pairOf) : un seul toucher prend les deux, le comparatif montre − l'ancien / + le nouveau */
  {const olds=out.filter(e=>e.role==='old'),news=out.filter(e=>e.role==='new');olds.forEach(o=>{let best=null,bo=0;news.forEach(n=>{if(n.pairOf)return;const ov=Math.min(o.mpk1,n.mpk1)-Math.max(o.mpk0,n.mpk0);if(ov>bo){bo=ov;best=n;}});if(best&&bo>=0.5*Math.min(o.mpk1-o.mpk0,best.mpk1-best.mpk0)){o.pairOf=best.id;best.pairOf=o.id;}});}
  /* même passage, autre DN : une paire − (ancien DN, soudures du marché) / + (nouveau DN, soudures du réel) */
  if(M.hasDnp||num(x.dn)){const chg=[];let cur=null;for(let t=0;t<=R.L+1e-9;t+=step){const m=Math.min(R.L,t);const P=onM(m);const a=dnR(m),b=P.d<=TOL?dnM(P.pk):0;const on=P.d<=TOL&&a&&b&&a!==b;if(on){if(cur&&cur.from===b&&cur.to===a){cur.b=m;cur.qb=Math.max(cur.qb,P.pk);cur.qa=Math.min(cur.qa,P.pk);}else{cur={a:m,b:m,from:b,to:a,qa:P.pk,qb:P.pk};chg.push(cur);}}else cur=null;if(m>=R.L)break;}
    chg.filter(c=>c.b-c.a>=1).forEach(c=>{const pa=atOnAxis(R.ax,c.a),pb=atOnAxis(R.ax,c.b);const key=`${mpk(pa)}-${mpk(pb)}`;const sR=cnt(R.welds,c.a,c.b,w=>!w.extra);const sM=M.hasWk?cnt(M.welds,c.qa,c.qb):Math.round(2*(c.qb-c.qa)/12);
      const minus=add({id:`${lid}|-|tube|${c.from}|${key}|dn`,s:-1,kind:'tube',dn:c.from,q:{ml:r1(c.qb-c.qa),soud:sM},lab:`Tube DN ${c.from} · ${name} (même passage, ancien DN, PK ${fmtFR(c.a)} → ${fmtFR(c.b)})`,path:subAxis(R.ax,c.a,c.b),m0:c.a,m1:c.b,mid:(c.a+c.b)/2,est:!M.hasWk,off:-1,role:'dnm'});
      const plus=add({id:`${lid}|+|tube|${c.to}|${key}|dn`,s:1,kind:'tube',dn:c.to,q:{ml:r1(c.b-c.a),soud:sR},lab:`Tube DN ${c.to} · ${name} (même passage, DN ${c.from} → ${c.to}, PK ${fmtFR(c.a)} → ${fmtFR(c.b)})`,path:subAxis(R.ax,c.a,c.b),m0:c.a,m1:c.b,mid:(c.a+c.b)/2,off:1,role:'dnp',dnchg:{from:c.from,to:c.to,ml:r1(c.b-c.a),minus:minus.id}});
      minus.pairOf=plus.id;plus.pairOf=minus.id;});}
  const tubes=out.filter(e=>e.kind==='tube');const inTube=(s,m)=>tubes.some(t=>t.s===s&&m>=t.m0-0.3&&m<=t.m1+0.3);
  /* pièces : les listes ajouté / retiré de l'appariement (alignPieces) ; aller + retour groupés ; soudures : celles qui touchent la pièce, sauf si elle est dans un tube déjà compté */
  if(!r.pcsUnknown){
    groupPcs(r.added||[],'m').forEach(g=>{const mm=g.m*R.k;const e0=reelEl(g.src[0]);const dn=num(e0&&e0.dn)||dnR(mm)||num(l.dn);const dn2=e0?num(g.k==='reducer'?e0.dn2:e0.dnb):0;const inT=inTube(1,mm);
      let soud=0;if(!inT){g.src.forEach(p=>{const e=reelEl(p);if(!e)return;const a=num(e.m0)*R.k,b=num(e.m1)*R.k;soud+=cnt(R.welds.filter(w=>w.c===(p.c||'A')),a,b,w=>!w.extra);const P0=onM(a),P1=onM(b);if(M.hasWk&&P0.d<=TOL&&P1.d<=TOL)soud-=cnt(M.welds.filter(w=>w.c===(p.c||'A')),Math.min(P0.pk,P1.pk),Math.max(P0.pk,P1.pk));});soud=Math.max(0,soud);}
      const p0=posA(g.m);add({id:`${lid}|+|${g.k}|${p0?mpk(p0):Math.round(mm)}`,s:1,kind:'piece',k:g.k,dn,dn2:dn2||undefined,n:g.n,q:Object.assign(qOf(g.k,g.n),soud?{soud}:{}),lab:`${pcLab(g.k,dn,dn2,g.n)} · ${name} · PK ${fmtFR(mm)}${inT?' (dans le tronçon ajouté)':''}`,at:[p0].filter(Boolean),m0:mm,m1:mm,mid:mm,inTube:inT});});
    groupPcs(r.removed||[],'m').forEach(g=>{const mm=g.m*M.k;const mr=num(g.src[0].mr!=null?g.src[0].mr:g.m)*R.k;const dn=num(g.src[0].dn)||dnM(mm)||num(x.dn);const dn2=num(g.src[0].dn2)||0;const half=(num(g.src[0].l)||PK_LEN[g.k]||1)/2;const inT=inTube(-1,mr);
      let soud=0;if(!inT){if(M.hasWk){g.src.forEach(p=>{soud+=cnt(M.welds.filter(w=>w.c===(p.c||'A')),mm-half,mm+half);const P=onR(mm);if(P.d<=TOL)soud-=cnt(R.welds.filter(w=>w.c===(p.c||'A')),P.pk-half,P.pk+half,w=>!w.extra);});soud=Math.max(0,soud);}else soud=g.k==='endcap'?0:2*g.n;}
      add({id:`${lid}|-|${g.k}|${Math.round(mm)}`,s:-1,kind:'piece',k:g.k,dn,dn2:dn2||undefined,n:g.n,q:Object.assign(qOf(g.k,g.n),soud?{soud}:{}),lab:`${pcLab(g.k,dn,dn2,g.n)} · ${name} · PK marché ${fmtFR(mm)}${inT?' (dans le tronçon retiré)':''}`,at:[atOnAxis(M.ax,mm)],m0:mr,m1:mr,mid:mr,inTube:inT,est:!M.hasWk&&!inT});});
    /* pièces APPARIÉES (même place) dont le DN a changé : remplacée — un − (ancien DN) et un + (nouveau DN) liés — ex. té 150/80 → 150/100, fin de ligne DN 80 → DN 100 */
    /* 30/10 (lot 2910c, Ethan sur PLOEMEUR : « pourquoi pas de − sur des coudes disparus ? ») : une pièce appariée par la SÉQUENCE (alignPieces : même nature, même dérive de PK
       que ses voisines — le compte ne change pas) mais qui n'est plus AU MÊME ENDROIT DU PLAN (> MOVED m : le tracé a changé de côté, l'antenne a été raccourcie en amont…) est
       DÉPLACÉE : un − à son ancienne place (sur le passage abandonné) et un + à la nouvelle, liés ; au comparatif −1 / +1 = 0 et la lecture dit « déplacé ». Les fins de ligne
       bougent avec la ligne (prolongée / raccourcie : le tube le dit déjà) : jamais « déplacées ». */
    {const reelPcs=linePieces(l);const RP=[],MV=[];const MOVED=2.5;(r.pairs||[]).forEach(pr=>{const pm=(x.pcs||[]).find(p=>(p.c||'A')===pr.c&&pcKind(p.k)===pcKind(pr.k)&&Math.abs(num(p.m)-num(pr.m))<0.06);const pe=reelPcs.find(p=>(p.c||'A')===pr.c&&pcKind(p.k)===pcKind(pr.k)&&Math.abs(num(p.m)-num(pr.r))<0.06);if(!pm||!pe)return;const e=reelEl(pe);
        const k=pcKind(pr.k);const dnMv=num(pm.dn)||dnM(num(pm.m)*M.k),dnRv=num(e&&e.dn)||dnR(num(pe.m)*R.k);const d2M=num(pm.dn2),d2R=e?num(k==='reducer'?e.dn2:e.dnb):0;if(!dnMv||!dnRv)return;
        if(dnMv!==dnRv||(d2M&&d2R&&d2M!==d2R)){RP.push({k,c:pr.c,m:num(pm.m),r:num(pe.m),dnM:dnMv,dnR:dnRv,d2M,d2R});return;}
        if(k==='endcap'||pr.end)return;const a=atOnAxis(M.ax,num(pm.m)*M.k),b=posA(num(pe.m));const dist=a&&b?Math.hypot(a[0]-b[0],a[1]-b[1]):0;if(dist>MOVED&&dist<1e5)MV.push({k,c:pr.c,m:num(pm.m),r:num(pe.m),dn:dnRv,d2:d2R||d2M,dist});}); /* dist aberrante (géométrie cassée) : on ne conclut rien */
      const grp=L=>{const G=[];L.sort((a,b)=>a.m-b.m).forEach(p=>{const g=G.find(g=>g.k===p.k&&Math.abs(g.m-p.m)<=1.5&&!g.c.includes(p.c));if(g){g.n++;g.c.push(p.c);}else G.push(Object.assign({},p,{n:1,c:[p.c]}));});return G;};
      grp(RP).forEach(g=>{const mm=g.m*M.k,mr=g.r*R.k;const p0=posA(g.r);const minus=add({id:`${lid}|-|${g.k}|${Math.round(mm)}|r`,s:-1,kind:'piece',k:g.k,dn:g.dnM,dn2:g.d2M||undefined,n:g.n,q:qOf(g.k,g.n),lab:`${pcLab(g.k,g.dnM,g.d2M,g.n)} · ${name} · PK marché ${fmtFR(mm)} (remplacé${g.n>1?'s':''} : DN ${g.dnM}${g.d2M?'/'+g.d2M:''} → ${g.dnR}${g.d2R?'/'+g.d2R:''})`,at:[atOnAxis(M.ax,mm)],m0:mr,m1:mr,mid:mr,inTube:inTube(-1,mr)});
        const plus=add({id:`${lid}|+|${g.k}|${Math.round(mm)}|r`,s:1,kind:'piece',k:g.k,dn:g.dnR,dn2:g.d2R||undefined,n:g.n,q:qOf(g.k,g.n),lab:`${pcLab(g.k,g.dnR,g.d2R,g.n)} · ${name} · PK ${fmtFR(mr)} (remplace le DN ${g.dnM}${g.d2M?'/'+g.d2M:''})`,at:[p0].filter(Boolean),m0:mr,m1:mr,mid:mr,inTube:inTube(1,mr)});
        minus.pairOf=plus.id;plus.pairOf=minus.id;});
      grp(MV).forEach(g=>{const mm=g.m*M.k,mr=g.r*R.k;const p0=posA(g.r);const dist=fmtFR(Math.round(g.dist));const minus=add({id:`${lid}|-|${g.k}|${Math.round(mm)}|mv`,s:-1,kind:'piece',k:g.k,dn:g.dn,dn2:g.d2||undefined,n:g.n,q:qOf(g.k,g.n),lab:`${pcLab(g.k,g.dn,g.d2,g.n)} · ${name} · PK marché ${fmtFR(mm)} (ancienne place : déplacé${g.n>1?'s':''} de ${dist} m, maintenant au PK ${fmtFR(mr)})`,at:[atOnAxis(M.ax,mm)],m0:mr,m1:mr,mid:mr,inTube:inTube(-1,mr),moved:true});
        const plus=add({id:`${lid}|+|${g.k}|${Math.round(mm)}|mv`,s:1,kind:'piece',k:g.k,dn:g.dn,dn2:g.d2||undefined,n:g.n,q:qOf(g.k,g.n),lab:`${pcLab(g.k,g.dn,g.d2,g.n)} · ${name} · PK ${fmtFR(mr)} (nouvelle place : déplacé${g.n>1?'s':''} de ${dist} m, était au PK marché ${fmtFR(mm)})`,at:[p0].filter(Boolean),m0:mr,m1:mr,mid:mr,inTube:inTube(1,mr),moved:true}); /* clé : le PK marché de la pièce (unique), des deux côtés */
        minus.pairOf=plus.id;plus.pairOf=minus.id;});}
  }
  else{ /* marché figé sans la position de ses pièces : par nature, non localisable */
    Object.keys(PIECE_KEY).concat(['purge','vidange']).forEach(k=>{const key=PIECE_KEY[k]||(k==='purge'?'purges':'vidanges');const d=num((r.d||{})[key]);if(!d||(k==='tee'&&false))return;const n=Math.abs(d);const mid=R.L/2;add({id:`${lid}|${d>0?'+':'-'}|${k}|?`,s:d>0?1:-1,kind:'piece',k,dn:num(l.dn),n,q:{[key]:n},lab:`${pcLab(k,num(l.dn),0,0)} ×${n} · ${name} (position inconnue : marché figé sans la place de ses pièces)`,at:[atOnAxis(R.ax,mid)],m0:0,m1:R.L,mid,est:true,unloc:true});});}
  /* terrain : manchons extrudés, fausses coupes ; soudures ajoutées sur place (hors d'un tronçon ajouté, qui les compte déjà… non : exclues partout → un élément chacune)
     30/10 (Ethan : « chantier neuf et des + partout ») : une fausse coupe (angle résiduel d'un coude, décidée par le traceur) ou une extrusion que le MARCHÉ avait déjà au même
     endroit (wk : [PK, fc, ex]) n'est pas une modification ; marché sans wk : les fausses coupes ne se localisent pas → un ajustement par ligne (ci-dessous) */
  const inMarche=(w,flag)=>{if(!M.hasWk)return false;const P=onM(w.m);if(P.d>TOL)return false;return M.welds.some(x=>x.c===w.c&&x[flag]&&Math.abs(x.m-P.pk)<=1);};
  R.welds.forEach(w=>{if(w.extru&&!inMarche(w,'ex'))add(extruEl(l,w,name,o));if(w.fc&&M.hasWk&&!inMarche(w,'fc'))add(fcEl(l,w,name,o));if(w.extra){const q=o.jointPos(l,w.idx,w.c);add({id:`${lid}|+|extra|${w.id}`,s:1,kind:'extra',dn:w.dn,q:{soud:1},lab:`Soudure ajoutée sur place ${w.id} · ${name} (${w.c==='A'?'aller':'retour'})`,at:[q?[q.x,q.y]:atOnAxis(R.ax,w.m)],m0:w.m,m1:w.m,mid:w.m});}});
  /* ajustements : ce que les éléments n'expliquent pas (soudures : barres recalées ; linéaire : arrondis) — la ligne reste exacte */
  const sum=k=>out.reduce((s,e)=>s+e.s*num(e.q[k]),0);const dS=Math.round(num((r.d||{}).soud)-sum('soud'));
  if(dS){const mid=R.L/2;add({id:`${lid}|${dS>0?'+':'-'}|adj|soud`,s:dS>0?1:-1,kind:'adj',dn:num(l.dn),q:{soud:Math.abs(dS)},lab:`Soudures : ajustement de ${dS>0?'+':'−'}${Math.abs(dS)} · ${name} (${M.hasWk?'barres recalées ou soudures déplacées, hors des morceaux ci-dessus':'le marché n\'a pas mémorisé la place de ses soudures : estimation'})`,at:[atOnAxis(R.ax,mid)],m0:0,m1:R.L,mid,est:true,adj:true});}
  const dF=Math.round(num((r.d||{}).fc)-sum('fc'));if(dF){const mid=R.L/2;add({id:`${lid}|${dF>0?'+':'-'}|adj|fc`,s:dF>0?1:-1,kind:'adj',dn:num(l.dn),q:{fc:Math.abs(dF)},lab:`Fausses coupes : ${dF>0?'+':'−'}${Math.abs(dF)} · ${name} (${M.hasWk?'hors des morceaux ci-dessus':'le marché n\'a pas mémorisé la place de ses soudures : non localisées'})`,at:[atOnAxis(R.ax,mid)],m0:0,m1:R.L,mid,est:true,adj:true});}
  const dM=r1(num((r.d||{}).ml)-sum('ml'));if(Math.abs(dM)>=1){const big=tubes.slice().sort((a,b)=>num(b.q.ml)-num(a.q.ml))[0];if(big&&Math.sign(dM)===big.s){big.q.ml=r1(num(big.q.ml)+Math.abs(dM));big.est=true;}else{const mid=R.L/2;add({id:`${lid}|${dM>0?'+':'-'}|adj|ml`,s:dM>0?1:-1,kind:'adj',dn:num(l.dn),q:{ml:Math.abs(dM)},lab:`Linéaire : ajustement de ${dM>0?'+':'−'}${fmtFR(Math.abs(dM))} m · ${name} (écart de longueur non localisé)`,at:[atOnAxis(R.ax,mid)],m0:0,m1:R.L,mid,est:true,adj:true});}}
  /* repères (« vont ensemble ») : par paquet le long de la ligne (GAP 20 m sur le PK réel) + les paires de DN */
  const GAP=20;const sorted=out.filter(e=>!e.adj&&!e.unloc).sort((a,b)=>a.m0-b.m0);let sp=null,spMax=-1e9,spN=0;sorted.forEach(e=>{if(!sp||e.m0>spMax+GAP){sp=lid+':'+(++spN);spMax=e.m1;}else spMax=Math.max(spMax,e.m1);e.spot=sp;});
  return out;}
function splitByDn(a,b,dnAt,step){const out=[];let cur=null;for(let t=a;t<=b+1e-9;t+=step){const m=Math.min(b,t);const dn=dnAt(m);if(cur&&cur[2]===dn)cur[1]=m;else{cur=[m,m,dn];out.push(cur);}if(m>=b)break;}return out.filter(s=>s[1]-s[0]>=0.3);}
const CAUSE={angle:'angle trop important',enfiler:'impossible d\'enfiler le manchon',manquant:'manchon manquant ou oublié',coudenu:'coude acier nu soudé',geom:'impossible de manchonner',autre:'autre cause'};
function extruEl(l,w,name,o){const q=o.jointPos(l,w.idx,w.c);const j=l.cond[w.c].joints[w.ji];const cause=j&&j.extru&&j.extru.cause;return {id:`${l.id}|+|extru|${w.id}`,s:1,kind:'extru',dn:w.dn,q:{extru:1},lab:`Manchon extrudé ${w.id} · ${name} (${w.c==='A'?'aller':'retour'}${cause?', '+(CAUSE[cause]||cause):''})`,at:[q?[q.x,q.y]:null].filter(Boolean),m0:w.m,m1:w.m,mid:w.m,terrain:true};}
function fcEl(l,w,name,o){const q=o.jointPos(l,w.idx,w.c);return {id:`${l.id}|+|fc|${w.id}`,s:1,kind:'fc',dn:w.dn,q:{fc:1},lab:`Fausse coupe ${w.id} · ${name} (${w.c==='A'?'aller':'retour'})`,at:[q?[q.x,q.y]:null].filter(Boolean),m0:w.m,m1:w.m,mid:w.m,terrain:true};}
/* ── tous les éléments du chantier (marché M, lignes réelles, écart D de marcheDiff) ── */
export function elementsOf(M,lines,D,o){const out=[];if(!M||!D)return out;const byId={};(lines||[]).forEach(l=>{if(l&&l.id)byId[l.id]=l;});
  (D.rows||[]).forEach(r=>{const l=byId[r.id]||null;const x=(M.lines||[]).find(y=>y.id===r.id)||null;if(!r.gone&&(!l||!o.inScope(l.id)))return;if(r.gone&&!o.inScopeId(r.id))return;try{lineElements(r,l,x,o).forEach(e=>out.push(e));}catch(e){console.warn('modifs',r.id,e&&e.stack||e);}});
  /* liens entre lignes : le té de départ (+ / −) d'une antenne nouvelle / supprimée va avec elle */
  out.forEach(e=>{if(e.kind!=='piece'||e.k!=='tee')return;const child=(lines||[]).find(c=>c&&c.parent===e.line&&c.parentM!=null&&Math.abs(num(c.parentM)-e.mid)<=3);if(child&&e.s>0){const sp=out.find(z=>z.line===child.id&&z.isNew);if(sp)e.spot=sp.spot;}});
  out.forEach(e=>{if(e.kind!=='piece'||e.k!=='tee'||e.s>0)return;const g=out.find(z=>z.gone&&(()=>{const y=(M.lines||[]).find(y=>y.id===z.line);return y&&y.parent===e.line&&y.parentM!=null&&Math.abs(num(y.parentM)-e.mid)<=3;})());if(g)e.spot=g.spot;});
  const bySpot={};out.forEach(e=>{if(e.spot)(bySpot[e.spot]=bySpot[e.spot]||[]).push(e.id);});out.forEach(e=>{e.with=(e.spot?bySpot[e.spot]:[]).filter(id=>id!==e.id);if(e.pairOf&&!e.with.includes(e.pairOf))e.with.push(e.pairOf);});
  return out;}
/* ── comparatif d'un ensemble d'éléments : une ligne par quantité et par DN ── */
export function compareEls(els){const R={};(els||[]).forEach(e=>{Object.entries(e.q||{}).forEach(([k,v])=>{if(!num(v))return;const key=k+'|'+(e.dn||0);const r=R[key]||(R[key]={k,dn:e.dn||0,m:0,p:0,est:false});if(e.s<0)r.m+=num(v);else r.p+=num(v);if(e.est)r.est=true;});});
  return Object.values(R).sort((a,b)=>MOD_Q.findIndex(x=>x[0]===a.k)-MOD_Q.findIndex(x=>x[0]===b.k)||b.dn-a.dn).map(r=>Object.assign(r,{key:r.k+'|'+r.dn,m:r1(r.m),p:r1(r.p),d:r1(r.p-r.m)}));}
export const rowLab=key=>{const [k,dn]=key.split('|');const q=MOD_Q.find(x=>x[0]===k);return (q?q[1]:k)+(+dn?' DN '+dn:'');};
export const rowUnit=key=>{const q=MOD_Q.find(x=>x[0]===key.split('|')[0]);return q?q[2]:'';};
/* « lecture » d'un ensemble : changements de DN, pièces déplacées */
export function lectureOf(els){const S=new Set((els||[]).map(e=>e.id));const out=[];(els||[]).forEach(e=>{if(!e.dnchg)return;const d=e.dnchg;out.push({txt:`${fmtFR(d.ml)} m passent du DN ${d.from} au DN ${d.to} (${e.lineName})`,warn:S.has(d.minus)?'':`l'ancien DN n'est pas pris (Tube DN ${d.from})`});});
  const mv=(els||[]).filter(e=>e.moved&&e.s<0);mv.forEach(e=>{if(!S.has(e.pairOf))out.push({txt:`${e.lab.split(' · ')[0]} (${e.lineName}) : l'ancienne place est prise sans la nouvelle`,warn:'déplacement incomplet'});});(els||[]).filter(e=>e.moved&&e.s>0&&!S.has(e.pairOf)).forEach(e=>out.push({txt:`${e.lab.split(' · ')[0]} (${e.lineName}) : la nouvelle place est prise sans l'ancienne`,warn:'déplacement incomplet'}));
  (els||[]).filter(e=>e.kind==='tube'&&e.pairOf&&!e.dnchg&&e.role!=='dnm'&&!S.has(e.pairOf)).forEach(e=>out.push({txt:`${shortLab(e)} (${e.lineName}) pris sans ${e.s<0?'le nouveau passage':'l\'ancien passage'}`,warn:'passage incomplet'}));
  compareEls(els).forEach(r=>{if(r.d===0&&r.m>0&&r.k!=='soud'&&r.k!=='ml')out.push({txt:`${rowLab(r.key)} : déplacement, même nombre (${fmtFR(r.m)} retiré${r.m>1?'s':''} / ${fmtFR(r.p)} ajouté${r.p>1?'s':''})`});});return out;}
/* ── modifs (données) ── */
export function modifsOf(net){if(!net||net.id==='__vide')return null;if(!net.modifs||typeof net.modifs!=='object')net.modifs={v:1,seq:1,items:[],seen:{},vers:[]};const Mo=net.modifs;Mo.items=Array.isArray(Mo.items)?Mo.items:[];Mo.seen=Mo.seen&&typeof Mo.seen==='object'?Mo.seen:{};Mo.vers=Array.isArray(Mo.vers)?Mo.vers:[];Mo.seq=Mo.seq||1;return Mo;}
/* versions du tracé : un enregistrement du traceur (savedAt) = une version ; v1 = le marché */
export function versionOf(Mo,M,savedAt){const at=savedAt||'';if(!at)return 0;let i=Mo.vers.findIndex(v=>v.at===at);if(i<0){if(M&&M.at&&at<=M.at)return 1;Mo.vers.push({at});i=Mo.vers.length-1;Mo._dirty=true;}return i+2;}
export function markSeen(Mo,els,v,now){let ch=false;(els||[]).forEach(e=>{if(!Mo.seen[e.id]){Mo.seen[e.id]={at:now||new Date().toISOString(),v:v||0};ch=true;}});return ch;}
export const ownerOf=(Mo,id)=>(Mo&&Mo.items||[]).find(m=>(m.els||[]).includes(id))||null;
export function nextN(Mo){return (Mo.items||[]).reduce((n,m)=>Math.max(n,+m.n||0),0)+1;}
export function newId(Mo){let id;do{id='m'+String(Mo.seq++).padStart(3,'0');}while(Mo.items.some(x=>x.id===id));return id;}
export const modColor=m=>MOD_PALETTE[((+m.n||1)-1)%MOD_PALETTE.length];
/* le récapitulatif par qualification : {etat: {key: Δ}}, + 'libre' = à attribuer */
export function recapOf(Mo,els){const by={};const put=(et,key,v)=>{if(!v)return;const o=by[et]||(by[et]={});o[key]=r1((o[key]||0)+v);};const owned=new Set();
  (Mo.items||[]).forEach(m=>{const mine=(m.els||[]).map(id=>els.find(e=>e.id===id)).filter(Boolean);mine.forEach(e=>owned.add(e.id));compareEls(mine).forEach(r=>{put(m.q&&m.q[r.key]||'libre',r.key,r.d);});});
  compareEls(els.filter(e=>!owned.has(e.id))).forEach(r=>put('libre',r.key,r.d));return by;}
/* ══ 31/10 (lot MD) — MODIF DÉCLARÉE. Ethan : « par défaut on va juste avoir la comparaison avant / après modif, et comme il n'y a pas de pastille par défaut à classer, tout est
   compris ; on va juste créer la possibilité de « déclarer une modif », où là on dit ce qu'on veut ressortir — le changement de DN, le nombre de soudures, les pièces ou autre — et
   pointé sur plan, pour déclarer ça en TS ou autre ». Une modif déclarée = {id, n, nom, devis, kind:'decl', etat (forfait | propose | commande | note | corr), decl:{lignes, pts},
   note, photos, at, by, v, log, aff, line}. Ligne : {nature:'dn'|'ml'|'soud'|'piece'|'autre', dn, dnA, dnB, k (pièce), qte (signée : + en plus / − en moins ; dn : longueur),
   unite, txt}. Point : {x, y, line, m, lineName} (repère du plan + conduite la plus proche). Les anciennes modifs (par éléments, els) restent telles quelles. ══ */
export const DECL_NAT=[['dn','Changement de DN'],['ml','Linéaire (ml)'],['soud','Soudures'],['piece','Pièces'],['sst','Sous-station'],['attente','Attente'],['extru','Extrusion'],['autre','Autre']]; /* 01/11 (Ethan) : + sous-station, attente, extrusion */
const NAT_N={sst:['sous-station','sous-stations'],attente:['attente','attentes'],extru:['extrusion','extrusions']}; /* natures comptées à l'unité, avec un DN */
const PC_2DN={reduc:['DN entrée','DN sortie',' → '],tes:['DN principal','DN piquage',' / ']}; /* 01/11 (Ethan) : pièces à deux DN */
export {NAT_N,PC_2DN};
export const DECL_PC=[['coudes','coude','coudes'],['tes','té','tés'],['reduc','réduction','réductions'],['vannes','vanne','vannes'],['purges','purge','purges'],['vidanges','vidange','vidanges'],['bouchons','fin de ligne','fins de ligne'],['extru','manchon extrudé','manchons extrudés'],['fc','fausse coupe','fausses coupes'],['autre','autre pièce','autres pièces']];
export const isDecl=m=>!!(m&&m.kind==='decl');
const clip=(s,n)=>String(s==null?'':s).replace(/\s+/g,' ').trim().slice(0,n);
export function declNorm(l){l=l||{};const nat=DECL_NAT.some(x=>x[0]===l.nature)?l.nature:'autre';const o={nature:nat};const q=r1(num(l.qte));
  if(nat==='dn'){o.dnA=Math.max(0,Math.round(num(l.dnA)));o.dnB=Math.max(0,Math.round(num(l.dnB)));o.qte=Math.abs(q);o.unite='m';}
  else if(nat==='ml'){o.dn=Math.max(0,Math.round(num(l.dn)));o.qte=q;o.unite='m';}
  else if(nat==='soud'){o.dn=Math.max(0,Math.round(num(l.dn)));o.qte=Math.round(num(l.qte));o.unite='';}
  else if(nat==='piece'){o.k=DECL_PC.some(x=>x[0]===l.k)?l.k:'coudes';o.dn=Math.max(0,Math.round(num(l.dn)));o.qte=Math.round(num(l.qte));o.unite='';if(o.k==='autre')o.txt=clip(l.txt,80);if(PC_2DN[o.k]){const d2=Math.max(0,Math.round(num(l.dn2)));if(d2)o.dn2=d2;}}
  else if(NAT_N[nat]){o.dn=Math.max(0,Math.round(num(l.dn)));o.qte=Math.round(num(l.qte));o.unite='';}
  else {o.txt=clip(l.txt,120);o.qte=q;o.unite=clip(l.unite,12);}
  if(l.line)o.line=String(l.line);if(l.from)o.from=clip(l.from,40);
  if(Array.isArray(l.pts)){const P=l.pts.filter(p=>p&&isFinite(+p.x)&&isFinite(+p.y)).slice(0,8).map(p=>{const q={x:Math.round(+p.x*100)/100,y:Math.round(+p.y*100)/100};if(p.line){q.line=String(p.line);q.m=p.m==null?null:Math.round(+p.m*10)/10;q.lineName=clip(p.lineName||p.line,40);}return q;});if(P.length)o.pts=P;} /* 01/11 (Ethan : « géoréférencer chaque ajout et enlevé ») : points de la ligne */
  return o;}
/* une ligne est-elle complète ? '' si oui, sinon ce qui manque (en clair) */
export function declLineErr(l){l=declNorm(l);if(l.nature==='dn')return !l.dnA||!l.dnB?'indique le DN avant et le DN après':l.dnA===l.dnB?'le DN avant et le DN après sont les mêmes':'';
  if(l.nature==='ml')return l.qte?'':'indique la longueur (en plus ou en moins)';if(l.nature==='soud'||l.nature==='piece'||NAT_N[l.nature]){if(!l.qte)return 'indique le nombre (en plus ou en moins)';if(l.nature==='piece'&&l.k==='reduc'&&l.dn&&l.dn2&&l.dn===l.dn2)return 'le DN d\'entrée et le DN de sortie sont les mêmes';return '';}return l.txt?'':'décris ce que c\'est';}
const sg=v=>v>0?'+':v<0?'−':'';const PCW=k=>DECL_PC.find(x=>x[0]===k)||['autre','pièce','pièces'];
export function declLineTxt(l){l=declNorm(l);const dn=l.dn?' DN '+l.dn:'';const n=Math.abs(l.qte);
  if(l.nature==='dn')return `Changement de DN : DN ${l.dnA||'?'} → DN ${l.dnB||'?'}${l.qte?' sur '+fmtFR(l.qte)+' m':''}`;
  if(l.nature==='ml')return `${sg(l.qte)}${fmtFR(n)} m${dn}`;
  if(l.nature==='soud')return `${sg(l.qte)}${fmtFR(n)} soudure${n>1?'s':''}${dn}`;
  if(l.nature==='piece'){const w=PCW(l.k);const two=PC_2DN[l.k];const dd=two&&l.dn&&l.dn2?' DN '+l.dn+two[2]+l.dn2:(l.dn||l.dn2)?' DN '+(l.dn||l.dn2):'';return `${sg(l.qte)}${fmtFR(n)} ${l.k==='autre'&&l.txt?l.txt:w[n>1?2:1]}${dd}`;}
  if(NAT_N[l.nature])return `${sg(l.qte)}${fmtFR(n)} ${NAT_N[l.nature][n>1?1:0]}${dn}`;
  return `${l.txt||'autre'}${l.qte?' : '+sg(l.qte)+fmtFR(n)+(l.unite?' '+l.unite:''):''}`;}
/* clé de regroupement du récap (mêmes nature / pièce / DN / unité → on additionne) */
export function declKey(l){l=declNorm(l);return [l.nature,l.k||'',l.dn||0,l.dn2||0,l.dnA||0,l.dnB||0,l.unite||'',l.nature==='autre'||l.k==='autre'?String(l.txt||'').toLowerCase():''].join('|');}
/* récap des modifs déclarées par état : {etat: [{lab, l (ligne cumulée), n (nb de modifs)}]} */
export function declRecap(items){const by={};(items||[]).filter(isDecl).forEach(m=>{const et=m.etat||'propose';const o=by[et]||(by[et]={});((m.decl&&m.decl.lignes)||[]).forEach(l0=>{const l=declNorm(l0);const k=declKey(l);const r=o[k]||(o[k]={l:Object.assign({},l,{qte:0}),mods:new Set()});r.l.qte=r1(r.l.qte+l.qte);r.mods.add(m.n);});});
  const out={};Object.keys(by).forEach(et=>{out[et]=Object.values(by[et]).map(r=>({l:r.l,lab:declLineTxt(r.l),mods:[...r.mods].sort((a,b)=>a-b)}));});return out;}
/* PROPOSITIONS tirées des écarts (éléments marché → réel) : changements de DN, linéaire par DN, soudures, pièces — un toucher = une ligne pré-remplie (modifiable) */
const PC_OF={coudes:'coudes',tes:'tes',reduc:'reduc',vannes:'vannes',purges:'purges',vidanges:'vidanges',bouchons:'bouchons',extru:'extru',fc:'fc'};
export function declProps(els){const out=[];const seen=new Set();const push=l=>{const k=declKey(l)+'|'+(l.qte||0);if(seen.has(k))return;seen.add(k);out.push(Object.assign(declNorm(l),{lab:declLineTxt(l)}));};
  (els||[]).filter(e=>e.dnchg&&e.s>0).sort((a,b)=>num(b.dnchg.ml)-num(a.dnchg.ml)).forEach(e=>push({nature:'dn',dnA:e.dnchg.from,dnB:e.dnchg.to,qte:r1(e.dnchg.ml),line:e.line,from:e.lineName||''}));
  const C=compareEls(els||[]);const big=(a,b)=>Math.abs(b.d)-Math.abs(a.d);
  C.filter(r=>r.k==='ml'&&Math.abs(r.d)>=0.5).sort(big).forEach(r=>push({nature:'ml',dn:r.dn,qte:r.d}));
  C.filter(r=>PC_OF[r.k]&&r.d).sort(big).forEach(r=>push({nature:'piece',k:PC_OF[r.k],dn:r.dn,qte:r.d}));
  C.filter(r=>r.k==='soud'&&r.d).sort(big).forEach(r=>push({nature:'soud',dn:r.dn,qte:r.d})); /* pièces avant soudures : les soudures suivent le linéaire et les pièces */
  return out;}
