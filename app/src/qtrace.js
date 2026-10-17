// qtrace.js — QUANTITÉS D'UN TRACÉ (14/10/2026 soir, lot Q). Le calcul de traceQty (app.js) sorti en fonction PURE (testée dans Node), composée pour le total,
// les tranches (ferme / option n) et les zones dessinées dans le traceur. Ethan (14/10 soir) : « comme ça ça compte aussi le nombre de sst, de raccordements etc.
// pour le tableau de chiffrage » ; « tu sélectionnes une ou plusieurs lignes et tu peux créer les zones du chiffrage… ça remplit les bonnes quantités dans chaque
// zone : purges, vidanges, sst, soudures… ».
// Entrée : {lines, sess, meta, zones}
//   · lines : lignes de SESSION (chantier ouvert : els d'une conduite, cond.A / cond.R.joints) ou lignes BRUTES du chantier (sites, remise du traceur : els + joints,
//     ou — tracé jamais ouvert sur l'appareil — cond.A / cond.R.els + welds, lus ici comme le fait l'ouverture du chantier) ;
//   · meta : lignes brutes du chantier (extrémités C1 : ends, sinon startType / endType ; tranche C2 : tranche / option) — une ligne de session ne les porte pas ;
//   · zones : site.traceur.zones (C4) = [{id, nom, lines:[ids]}].
// Sortie (inchangée pour les champs d'avant) : {rows:[{dn, barres, mlTube, mlTr, soud, coudes, tes, piq, red, vannes, kits, purges, vidanges, src}], tot, ext,
//   byTranche?, byZone?} — purges / vidanges : 1 par té vertical (= une PAIRE aller + retour, l'unité des paniers PURGE / VIDANGE), au DN de la BRANCHE (dnb : le
//   DN du panier PURGE de la zone, z.purges = {dn, paires}) ; ext = extrémités {type:{dn:nombre}} au DN de la conduite à ce bout.
export const END_TYPES=[['pec','PEC (piquage en charge)','racc'],['insertion','Insertion de tés','racc'],['attente','Sur attente existante','racc'],
  ['kit','Kit fin de ligne','fin'],['bypass_extrusion','By-pass extrusion','fin'],['bypass_regard','By-pass nu en regard','fin'],['fondbombe_regard','Fond bombé nu en regard','fin'],['provisoire','Fin provisoire à reprendre','fin'],
  ['chaufferie','Raccordement en chaufferie','chauff'],['attente_chaufferie','Attente en chaufferie','chauff'],['sousstation','Sous-station','sst']];
export const END_GROUPS={racc:'Raccordement sur existant',fin:'Fin de ligne',chauff:'Chaufferie',sst:'Sous-station'};
export const endLabel=t=>(END_TYPES.find(x=>x[0]===t)||[t,t])[1];
export const endType=t=>{t=String(t||'').trim();return t==='bypass'?'bypass_regard':t;}; /* C1 : l'ancienne valeur « bypass » = by-pass nu en regard */
const num=v=>v===null||v===undefined||v===''?0:(isFinite(+v)?+v:0);
const r1=x=>Math.round(x*10)/10;
/* clé de tranche d'une ligne (C2) : 'ferme' (défaut) | 'option n' */
export const trancheOf=m=>m&&m.tranche==='option'?'option '+Math.max(1,Math.round(num(m.option))||1):'ferme';
export const trancheLabel=k=>k==='ferme'?'Tranche ferme':String(k).replace(/^option (\d+)$/,'Option $1');
const trSort=(a,b)=>a==='ferme'?-1:b==='ferme'?1:(parseInt(String(a).replace(/\D/g,''))||0)-(parseInt(String(b).replace(/\D/g,''))||0);
/* une ligne remise à plat : éléments d'UNE conduite (els), soudures par conduite (jc) ou par joint × conduites, méta de la ligne brute */
function norm(l,sess,m){let els=Array.isArray(l.els)?l.els:[];let cond=null,jc=false;
  if(sess){if(l.cond){cond=l.cond;jc=true;}}
  else if(l.traceur&&l.cond&&typeof l.cond==='object'&&!els.length){ /* remise du traceur jamais ouverte sur l'appareil : comme setupTraceurLine (app.js) — conduite A (sinon R), soudures de chaque conduite */
    const c0=l.cond.A||l.cond.R;els=c0&&Array.isArray(c0.els)?c0.els:[];cond={};
    ['A','R'].forEach(c=>{const cd=l.cond[c];if(!cd)return;const E=Array.isArray(cd.els)?cd.els:[];cond[c]={els:E,joints:(cd.welds||[]).map((w,k)=>({idx:w.idx!==undefined?w.idx:k,dn:w.dn})).filter(j=>j.idx>=0&&j.idx<E.length)};});jc=true;}
  const meta=m||l;return {id:l.id,l,els,cond,jc,nC:l.single?1:2,meta,tr:trancheOf(meta)};}
/* les quantités d'un ensemble de lignes (ids = toutes les lignes du chantier : un piquage compte si l'antenne part d'une ligne du chantier) */
function qtyLines(L,ids){const by={};const g=dn=>by[dn]||(by[dn]={dn,soud:0,mlTr:0,mlTube:0,mlPipe:0,coudes:0,tes:0,piq:0,red:0,vannes:0,kits:0,purges:0,vidanges:0,runs:[]});const ext={};
  /* 14/10 (Ethan : « le nombre doit être environ le ml/12, des barres ENTAMÉES, sans rajouter de soudure : on ne prend pas 6 chutes de 2 m pour faire un tube ») :
     les barres se comptent par TRONÇON CONTINU de tube (une pièce — coude, té, vanne, réduction — ou un changement de DN coupe le tronçon) : barres pleines + UNE chute
     par tronçon ; les chutes resservent pour les petites longueurs du même DN (2 chutes tiennent dans une même barre SANS soudure en plus), jamais aboutées. */
  const addRun=(dn,len,bar,n)=>{if(!(len>0.01)||!dn)return;g(dn).runs.push({len,bar:+bar||12,n:n||1});};
  const barresOf=runs=>{const B={};runs.forEach(r=>{const b=B[r.bar]=B[r.bar]||{full:0,rems:[]};for(let c=0;c<r.n;c++){const f=Math.floor(r.len/r.bar+1e-9);b.full+=f;const rem=r.len-r.bar*f;if(rem>0.05)b.rems.push(rem);}});
    let tot=0;Object.keys(B).forEach(k=>{const b=B[k];b.rems.sort((x,y)=>y-x);const bins=[];b.rems.forEach(r=>{let i=-1;for(let j=0;j<bins.length;j++)if(bins[j]+r<=+k+1e-9){i=j;break;}if(i<0)bins.push(r);else bins[i]+=r;});tot+=b.full+bins.length;});return tot;};
  const addExt=(t,dn)=>{t=endType(t);if(!t||t==='libre'||!dn)return;const o=ext[t]||(ext[t]={});o[dn]=(o[dn]||0)+1;};
  L.forEach(x=>{const l=x.l;const els=x.els;const nC=x.nC;const dnOf=i=>{for(let k=0;k<els.length;k++){const a=els[i-k],b=els[i+k];if(a&&+a.dn)return +a.dn;if(b&&+b.dn)return +b.dn;}return +l.dn||0;};
    els.forEach((e,i)=>{if(!e)return;const dn=dnOf(i);if(!dn)return;const r=g(dn);const len=+e.len||0;r.mlTr+=len;r.mlTube+=len*nC;if(e.kind==='pipe')r.mlPipe+=len*nC;else if(e.kind==='bend'||e.kind==='steelbend')r.coudes+=nC;else if(e.kind==='tee')r.tes+=nC;else if(e.kind==='reducer')r.red+=nC;else if(e.kind==='valve')r.vannes+=nC;else if(e.kind==='endcap')r.kits+=nC;
      if(e.kind==='tee'&&e.vert){const pv=e.pvKind||(e.vert==='down'?'vidange':'purge');g(+e.dnb||dn)[pv==='vidange'?'vidanges':'purges']++;}}); /* C8 : té vertical = purge / vidange (nature : pvKind, sinon vert), au DN de sa branche */
    {let run=null;const endRun=()=>{if(run){addRun(run.dn,run.len,l.bar,nC);run=null;}};
      els.forEach((e,i)=>{if(!e)return;const dn=dnOf(i);const len=+e.len||0;
        if(e.kind==='pipe'&&dn){if(run&&run.dn===dn)run.len+=len;else{endRun();run={dn,len};}}else endRun();});endRun();} /* tronçons continus de tube (barres entamées) */
    if(!els.length&&+l.dn&&+l.length){const r=g(+l.dn);r.mlTr+=+l.length;r.mlTube+=(+l.length)*nC;r.mlPipe+=(+l.length)*nC;addRun(+l.dn,+l.length,l.bar,nC);}
    if(l.parent&&ids.has(l.parent)){const d0=dnOf(0);if(d0)g(d0).piq+=nC;}
    if(x.jc){['A','R'].forEach(c=>{const C=x.cond[c];if(!C||!Array.isArray(C.joints))return;C.joints.forEach(j=>{const e=Array.isArray(C.els)?C.els[j.idx]:null;const dn=+(j.dn||(e&&e.dn)||dnOf(j.idx||0))||0;if(dn)g(dn).soud++;});});}
    else if(Array.isArray(l.joints))l.joints.forEach(j=>{const dn=dnOf(+j.idx||0);if(dn)g(dn).soud+=nC;});
    /* C1 : extrémités — ends {start:{type,dn}|null, end:{type,dn}} ; ancien tracé : startType / endType + DN du premier / dernier élément (une antenne n'a pas de départ) */
    const m=x.meta||{};const last=Math.max(0,els.length-1);
    if(m.ends&&typeof m.ends==='object'){const s=m.ends.start,e=m.ends.end;if(s&&s.type)addExt(s.type,+s.dn||dnOf(0));if(e&&e.type)addExt(e.type,+e.dn||dnOf(last));}
    else{if(m.startType&&!m.parent)addExt(m.startType,dnOf(0));if(m.endType)addExt(m.endType,dnOf(last));}});
  const rows=Object.values(by).filter(r=>r.soud||r.mlTr||r.purges||r.vidanges).sort((x,y)=>y.dn-x.dn).map(r=>({dn:r.dn,barres:r.runs.length?barresOf(r.runs):Math.ceil(r.mlPipe/12-1e-9),mlTube:r1(r.mlTube),mlTr:r1(r.mlTr),soud:r.soud,coudes:r.coudes,tes:r.tes,piq:r.piq,red:r.red,vannes:r.vannes,kits:r.kits,purges:r.purges,vidanges:r.vidanges,src:'tracé'}));
  const T=k=>rows.reduce((s,r)=>s+(r[k]||0),0);
  return {rows,tot:{barres:T('barres'),mlTube:T('mlTube'),mlTr:r1(T('mlTr')),soud:T('soud'),coudes:T('coudes'),tes:T('tes'),piq:T('piq'),red:T('red'),vannes:T('vannes'),kits:T('kits'),purges:T('purges'),vidanges:T('vidanges')},ext};}
export function traceQtyOf(o){o=o||{};const src=o.lines||[];if(!src.length)return null;const M={};(o.meta||[]).forEach(m=>{if(m&&m.id!==undefined&&!M[m.id])M[m.id]=m;});
  const L=src.filter(l=>l&&!l.ghost).map(l=>norm(l,!!o.sess,M[l.id]));const ids=new Set(L.map(x=>x.id)); /* 16/10 soir (lot TB, K3) : ce qui a été supprimé entre deux versions n'est jamais compté — tronçons (traceur.lines[].del) et lignes fantômes (traceur.ghosts, ghost:true) ne sont pas dans site.lines ; une ligne « ghost » passée par erreur est écartée ici */
  const all=qtyLines(L,ids);const out={rows:all.rows,tot:all.tot,ext:all.ext};
  /* C2 : par tranche (seulement s'il y a des options) */
  if(L.some(x=>x.tr!=='ferme')){out.byTranche={};[...new Set(L.map(x=>x.tr))].sort(trSort).forEach(k=>{const q=qtyLines(L.filter(x=>x.tr===k),ids);out.byTranche[k]={rows:q.rows,tot:q.tot,ext:q.ext};});}
  /* C4 : par zone dessinée dans le traceur (une ligne dans une seule zone : la première qui la cite) + « hors zone » s'il reste des lignes */
  const Z=(Array.isArray(o.zones)?o.zones:[]).filter(z=>z&&Array.isArray(z.lines));
  if(Z.length){const seen=new Set();out.byZone=Z.map((z,i)=>{const ls=L.filter(x=>z.lines.includes(x.id)&&!seen.has(x.id));ls.forEach(x=>seen.add(x.id));const q=qtyLines(ls,ids);return {id:String(z.id||('z'+(i+1))),nom:String(z.nom||('Zone '+(i+1))),ch:z.ch?String(z.ch):undefined,rows:q.rows,tot:q.tot,ext:q.ext,lines:ls.map(x=>x.id)};});
    const rest=L.filter(x=>!seen.has(x.id));if(rest.length){const q=qtyLines(rest,ids);out.byZone.push({id:'_hors',nom:'Hors zone',hors:true,rows:q.rows,tot:q.tot,ext:q.ext,lines:rest.map(x=>x.id)});}}
  return out;}
/* ── outils communs (Quantités, chiffrage) ── */
/* somme d'extrémités {type:{dn:n}} */
export function extAdd(a,b){const o={};[a,b].forEach(E=>Object.keys(E||{}).forEach(t=>{const D=E[t]||{};Object.keys(D).forEach(dn=>{if(!num(D[dn]))return;(o[t]=o[t]||{})[dn]=((o[t]||{})[dn]||0)+num(D[dn]);});}));return o;}
export const extCount=E=>Object.values(E||{}).reduce((s,D)=>s+Object.values(D||{}).reduce((x,n)=>x+num(n),0),0);
/* purges / vidanges par DN {dn:n} depuis les lignes par DN */
export const pvOf=(rows,k)=>{const o={};(rows||[]).forEach(r=>{if(num(r[k]))o[r.dn]=(o[r.dn]||0)+num(r[k]);});return o;};
/* RÉPARTITION AU PLUS FORT RESTE : un total entier réparti selon des poids, la somme est conservée (égalité de restes → la première zone) */
export function splitLR(total,weights){const W=(weights||[]).map(w=>Math.max(0,num(w)));const S=W.reduce((s,w)=>s+w,0);const n=W.length;if(!n)return [];const T=Math.round(num(total));
  if(!(S>0)){const eq=W.map(()=>1);return splitLR(T,eq);}
  const ex=W.map(w=>T*w/S);const fl=ex.map(x=>Math.floor(x+1e-9));let rest=T-fl.reduce((s,x)=>s+x,0);
  const ord=ex.map((x,i)=>({i,f:x-fl[i]})).sort((a,b)=>b.f-a.f||a.i-b.i);for(let k=0;rest>0&&k<ord.length;k++,rest--)fl[ord[k].i]++;
  for(let k=ord.length-1;rest<0&&k>=0;k--,rest++)fl[ord[k].i]--;return fl;}
/* en dixièmes (ml) */
export const splitLR1=(total,weights)=>splitLR(Math.round(num(total)*10),weights).map(x=>x/10);
