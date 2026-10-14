// prixp.js — 14/10 nuit (lot P) : OUTILS DES PANIERS DE LA BASE DE PRIX (Ethan retravaille les paniers de SA base : « copier-coller sur toutes les autres typologies
// de SST, même variante, même heure par DN » ; « raccordement caniveau tout pareil que raccordement insertion de tés » ; « des fois je changeais l'équipe de la
// variante mais pas le « quand l'équipe est » » ; « toute modif en jaune avec la base en dessous »). Aucun DOM ici (testable en Node) :
// · base.orig = les valeurs du CLASSEUR (seulement les champs modifiables à l'écran, en tableaux compacts), posées à chaque import et par « 🔍 Comparer au
//   classeur » → origRef(base, chemin data-afx) = la valeur du classeur d'un champ de la Base de prix ; origDiffs = tout ce qui en diffère ;
// · copyPlan / applyCopy : copie des heures de MO par DN (lignes équipe × heures) et des variantes d'équipe (base.mvar) d'un panier vers d'autres, DN par DN,
//   aux DN communs (option : ajouter les DN qui manquent — MO seule, fournitures à compléter) ; les fournitures ne sont jamais copiées ;
// · mvarIssues / mvarFix / mvFollow : la condition « quand l'équipe soudure de la zone est … » d'une variante = l'équipe de ses lignes.
import {panierOf,panierRow,mvarOf,allPaniers,cadOf} from './prix.js';
const num=v=>typeof v==='number'?v:(v===null||v===undefined||v===''?0:(isFinite(+v)?+v:0));
const clone=o=>JSON.parse(JSON.stringify(o));
const r6=x=>typeof x==='number'&&isFinite(x)?Math.round(x*1e6)/1e6:x;
const eqK=s=>String(s||'').replace(/\s+/g,'').toUpperCase();
/* ═════════ 1 · VALEURS DU CLASSEUR (base.orig) ═════════ */
export const POSTE_F=['taux','fgC','fgS','sin','hJour'];
export const EQ_F=['Soudeur','Tuyauteur','Manchonneur','Chauffeur']; /* + os (5e valeur) */
export const CTRL_F=['depression','filsDH','ressuage','itopo','pression'];
export const EXT_H=['manchons','coude','pec','purges','by-pass'];
/* une ligne de cadences : pouce, soudure S / S+T / S+T+P, manchons thermo (iso 1-3 × M+M / M), électro (idem), autocontrôle (5) — 21 valeurs */
const cadVals=c=>[c.pouce,(c.soud||{}).S,(c.soud||{})['S+T'],(c.soud||{})['S+T+P']].concat(...['thermo','electro'].map(k=>[0,1,2].flatMap(j=>[0,1].map(m=>(((c.manch||{})[k]||[])[j]||[])[m]))),CTRL_F.map(k=>(c.ctrl||{})[k]));
const cadIdx=a=>{if(a[0]==='pouce')return 0;if(a[0]==='soud'){const i={'S':1,'S+T':2,'S+T+P':3}[a[1]];return i===undefined?-1:i;}if(a[0]==='manch'){const b=a[1]==='thermo'?4:a[1]==='electro'?10:-1;const j=+a[2],m=+a[3];return b<0||!(j>=0&&j<3)||!(m===0||m===1)?-1:b+j*2+m;}if(a[0]==='ctrl')return CTRL_F.indexOf(a[1])<0?-1:16+CTRL_F.indexOf(a[1]);return -1;};
const cell=v=>typeof v==='number'?r6(v):(v===undefined?null:v);
/* les valeurs d'une base TELLE QUE LUE DANS LE CLASSEUR (à l'import : avant les retouches gardées) — compactes */
export function origOf(base,meta){meta=meta||{};const o={at:meta.at||new Date().toISOString(),src:meta.name||base.src||'',version:base.version||'',foAt:base.at||'',p:{},e:{},c:{},d:{},f:{},t:{},k:{},x:null,ex:{}};
  (base.mo.postes||[]).forEach(p=>{o.p[p.code]=POSTE_F.map(k=>r6(num(p[k])));});
  (base.mo.equipes||[]).filter(e=>e&&!e.app).forEach(e=>{o.e[e.code]=EQ_F.map(k=>r6(num((e.comp||{})[k]))).concat([r6(num(e.os))]);});
  (base.mo.cad||[]).forEach(c=>{o.c[c.dn]=cadVals(c).map(v=>r6(num(v)));});
  Object.keys(base.mo.docs||{}).forEach(k=>{o.d[k]=r6(num(base.mo.docs[k]));});
  Object.keys((base.fo||{}).params||{}).forEach(k=>{o.f[k]=cell(base.fo.params[k]);});
  Object.keys((base.fo||{}).tables||{}).forEach(tn=>{const T=base.fo.tables[tn];if(!T||!Array.isArray(T.cols)||!Array.isArray(T.rows))return;const m={};T.rows.forEach(row=>{m[String(row[T.cols[0]])]=T.cols.slice(1).map(c=>cell(row[c]));});o.t[tn]=m;});
  allPaniers(base).forEach(P=>{const m={};P.rows.forEach(r=>{const x=panierRow(base,P.id,r.dn);if(x)m[r.dn]={m:x.mo.map(l=>[l.eq,r6(l.h)]),f:x.fo.map(f=>[r6(f.qty),r6(f.pu)])};});o.k[P.id]=m;});
  const DC=(base.op||{}).dechargement;if(DC)o.x=[DC.eq1,r6(num(DC.h1)),DC.eq2,r6(num(DC.h2))];
  ((((base.op||{}).extrusion)||{}).rows||[]).forEach(r=>{o.ex[r.dnPehd]=[r.eq].concat(EXT_H.map(k=>r6(num((r.h||{})[k]))),[r6(num(r.amort)),r6(num(r.conso))]);});
  return o;}
const at=(a,i)=>Array.isArray(a)&&i>=0?a[i]:undefined;
/* la valeur du classeur d'un champ de la Base de prix, d'après son chemin data-afx (« b§mo§postes§0§taux », « ov§purge§50§mo0§h »…) ; undefined = pas de référence */
export function origRef(base,path){const O=base&&base.orig;if(!O)return undefined;const s=String(path).split('§');
  if(s[0]==='ov'){const K=((O.k||{})[s[1]]||{})[s[2]];const m=/^(mo|fo)(\d+)$/.exec(s[3]||'');if(!K||!m)return undefined;const x=((m[1]==='mo'?K.m:K.f)||[])[+m[2]];if(!x)return undefined;const i=m[1]==='mo'?['eq','h'].indexOf(s[4]):['qty','pu'].indexOf(s[4]);return at(x,i);}
  if(s[0]!=='b')return undefined;
  if(s[1]==='mo'){if(s[2]==='postes'){const p=(base.mo.postes||[])[+s[3]];return p?at((O.p||{})[p.code],POSTE_F.indexOf(s[4])):undefined;}
    if(s[2]==='equipes'){const e=(base.mo.equipes||[])[+s[3]];if(!e)return undefined;return at((O.e||{})[e.code],s[4]==='os'?4:s[4]==='comp'?EQ_F.indexOf(s[5]):-1);}
    if(s[2]==='cad'){const c=(base.mo.cad||[])[+s[3]];return c?at((O.c||{})[c.dn],cadIdx(s.slice(4))):undefined;}
    if(s[2]==='docs')return (O.d||{})[s[3]];return undefined;}
  if(s[1]==='fo'){if(s[2]==='params')return (O.f||{})[s[3]];
    if(s[2]==='tables'&&s[4]==='rows'){const T=((base.fo||{}).tables||{})[s[3]];const row=T&&(T.rows||[])[+s[5]];if(!row)return undefined;const ci=T.cols.indexOf(s.slice(6).join('§'));return ci<1?undefined:at(((O.t||{})[s[3]]||{})[String(row[T.cols[0]])],ci-1);}return undefined;}
  if(s[1]==='op'){if(s[2]==='dechargement')return at(O.x,['eq1','h1','eq2','h2'].indexOf(s[3]));
    if(s[2]==='extrusion'&&s[3]==='rows'){const r=(((base.op.extrusion||{}).rows)||[])[+s[4]];const X=r&&(O.ex||{})[r.dnPehd];if(!X)return undefined;const f=s[5];return at(X,f==='eq'?0:f==='h'?(EXT_H.indexOf(s[6])<0?-1:1+EXT_H.indexOf(s[6])):f==='amort'?6:f==='conso'?7:-1);}}
  return undefined;}
const isNum=v=>v!==null&&v!==undefined&&v!==''&&typeof v!=='boolean'&&isFinite(+v);
const empty=v=>v===null||v===undefined||v==='';
/* une valeur affichée diffère-t-elle de sa référence ? (nombres comparés à dec décimales : 2 pour les paniers, arrondis à l'écran) */
export function refDiffers(cur,ref,dec){if(ref===undefined)return false;if(empty(cur)&&empty(ref))return false;if(isNum(cur)&&isNum(ref)){const k=Math.pow(10,dec===undefined?6:dec);return Math.round(+cur*k)!==Math.round(+ref*k);}return String(empty(cur)?'':cur).trim()!==String(empty(ref)?'':ref).trim();}
/* tout ce qui diffère du classeur (compte et liste par groupe) : [{g, label, path, cur, ref}] */
export function origDiffs(base){const out=[];if(!base||!base.orig)return out;const add=(g,label,path,cur,dec)=>{const ref=origRef(base,path);if(refDiffers(cur,ref,dec))out.push({g,label,path,cur,ref});};
  (base.mo.postes||[]).forEach((p,i)=>POSTE_F.forEach(f=>add('Taux',p.code+' · '+f,'b§mo§postes§'+i+'§'+f,p[f])));
  (base.mo.equipes||[]).forEach((e,i)=>{if(e.app)return;EQ_F.forEach(k=>add('Équipes',e.code+' · '+k,'b§mo§equipes§'+i+'§comp§'+k,(e.comp||{})[k]||0));add('Équipes',e.code+' · OS','b§mo§equipes§'+i+'§os',e.os||0);});
  (base.mo.cad||[]).forEach((c,i)=>{const P=['pouce','soud§S','soud§S+T','soud§S+T+P'].concat(...['thermo','electro'].map(k=>[0,1,2].flatMap(j=>[0,1].map(m=>'manch§'+k+'§'+j+'§'+m))),CTRL_F.map(k=>'ctrl§'+k));const V=cadVals(c);P.forEach((p,j)=>add('Cadences','DN '+c.dn+' · '+p.replace(/§/g,' '),'b§mo§cad§'+i+'§'+p,V[j]));});
  Object.keys(base.mo.docs||{}).forEach(k=>add('Forfaits',k,'b§mo§docs§'+k,base.mo.docs[k]));
  Object.keys(base.fo.params||{}).forEach(k=>add('Paramètres',k,'b§fo§params§'+k,base.fo.params[k]));
  Object.keys(base.fo.tables||{}).forEach(tn=>{const T=base.fo.tables[tn];if(!T||!Array.isArray(T.cols))return;(T.rows||[]).forEach((row,i)=>T.cols.forEach((c,j)=>{if(j)add('Fournitures',tn.replace(/^FO_/,'')+' · '+row[T.cols[0]]+' · '+c,'b§fo§tables§'+tn+'§rows§'+i+'§'+c,row[c]);}));});
  allPaniers(base).forEach(P=>P.rows.forEach(r=>{const x=panierRow(base,P.id,r.dn);if(!x)return;const pre='ov§'+P.id+'§'+r.dn+'§';
    x.mo.forEach((m,i)=>{add('Paniers',P.title+' · DN '+r.dn+' · MO '+(i+1)+' équipe',pre+'mo'+i+'§eq',m.eq);add('Paniers',P.title+' · DN '+r.dn+' · MO '+(i+1)+' heures',pre+'mo'+i+'§h',Math.round(m.h*100)/100,2);});
    x.fo.forEach((f,i)=>{add('Paniers',P.title+' · DN '+r.dn+' · '+f.label+' qté',pre+'fo'+i+'§qty',f.qty,2);add('Paniers',P.title+' · DN '+r.dn+' · '+f.label+' PU',pre+'fo'+i+'§pu',Math.round(f.pu*100)/100,2);});}));
  const DC=base.op.dechargement;if(DC)['eq1','h1','eq2','h2'].forEach(k=>add('Déchargement',k,'b§op§dechargement§'+k,DC[k]));
  (((base.op.extrusion||{}).rows)||[]).forEach((r,i)=>{add('Extrusion','Ø '+r.dnPehd+' · équipe','b§op§extrusion§rows§'+i+'§eq',r.eq);EXT_H.forEach(k=>add('Extrusion','Ø '+r.dnPehd+' · heures '+k,'b§op§extrusion§rows§'+i+'§h§'+k,(r.h||{})[k]));add('Extrusion','Ø '+r.dnPehd+' · amortissement','b§op§extrusion§rows§'+i+'§amort',r.amort);add('Extrusion','Ø '+r.dnPehd+' · consommables','b§op§extrusion§rows§'+i+'§conso',r.conso);});
  return out;}
/* ═════════ 2 · COPIE D'UN PANIER VERS D'AUTRES ═════════ */
/* la famille d'un panier : toutes les SST, tous les raccordements, les vidanges — cochés d'office comme destinataires */
export const famOf=pid=>/^sst_/.test(pid)?'sst':/^racc_/.test(pid)?'racc':/^vid_/.test(pid)?'vid':pid;
export const FAM_LAB={sst:'Vannes de sous-station (SST)',racc:'Raccordements sur existant',vid:'Vidanges'};
const moSnap=x=>x?x.mo.map(m=>({eq:m.eq,h:m.h})):[];
/* le plan de la copie (= l'aperçu) : panier × DN, MO et variantes avant → après ; DN absents des destinataires (ou ajoutés, option) */
export function copyPlan(base,src,dests,opt){opt=Object.assign({mo:true,mv:true,add:false},opt||{});const S=panierOf(base,src);if(!S)return null;
  const items=[],absent=[],added=[];const P=new Set();let nV=0;
  (dests||[]).forEach(pid=>{if(pid===src)return;const D=panierOf(base,pid);if(!D)return;const has=new Set(D.rows.map(r=>r.dn));
    S.rows.forEach(sr=>{const dn=sr.dn;const inD=has.has(dn);if(!inD&&(!opt.add||D.virtual)){absent.push({pid,title:D.title,dn});return;}
      const s=panierRow(base,src,dn);const d=inD?panierRow(base,pid,dn):null;const moB=moSnap(d),moA=opt.mo||!inD?moSnap(s):moB; /* un DN ajouté reçoit la MO du panier source (« MO seule ») */
      const vB=clone(mvarOf(base,pid,dn)),vA=opt.mv?clone(mvarOf(base,src,dn)):vB;
      items.push({pid,title:D.title,dn,add:!inD,moB,moA,vB,vA,chMo:JSON.stringify(moB)!==JSON.stringify(moA),chV:JSON.stringify(vB)!==JSON.stringify(vA)});
      if(!inD)added.push({pid,title:D.title,dn});P.add(pid);if(opt.mv)nV+=vA.length;});});
  return {src,title:S.title,dests:(dests||[]).filter(d=>d!==src),opt,items,absent,added,nP:P.size,nDn:items.length,nV};}
/* heures « du classeur » d'une ligne de MO (sans retouche) : k × heures / jour ÷ cadence, ou les heures saisies — comme panierRow */
const rawH=(b,m,dn)=>{if(m.hf){const c=cadOf(b,dn);const col=m.hf.col;const cad=c?(col===3?c.soud.S:col===4?c.soud['S+T']:c.soud['S+T+P']):0;if(cad)return m.hf.k*(b.mo.hJour||10)/cad;}return num(m.h);};
/* une fourniture d'un DN ajouté : la ligne du panier destinataire (DN le plus proche) — prix par sa formule (table de la base au nouveau DN), sinon « à compléter » (signalé) */
const foTpl=f=>Object.assign({label:f.label,qty:f.qty,pu:f.ref?num(f.pu):0,ref:f.ref?clone(f.ref):null},f.ref?{}:{need:'PU à compléter (DN ajouté par copie)'});
const nearRow=(P,dn)=>(P.rows||[]).filter(r=>!r.added).reduce((best,r)=>!best||Math.abs(r.dn-dn)<Math.abs(best.dn-dn)?r:best,null);
function cleanOver(b){const O=b.over||{};Object.keys(O).forEach(pid=>{Object.keys(O[pid]||{}).forEach(dn=>{const X=O[pid][dn]||{};Object.keys(X).forEach(it=>{if(!X[it]||!Object.keys(X[it]).length)delete X[it];});if(!Object.keys(X).length)delete O[pid][dn];});if(!Object.keys(O[pid]||{}).length)delete O[pid];});}
/* applique le plan sur une COPIE de la base (un seul enregistrement ensuite) : lignes de MO écrites en écrasements (base.over, gardés au réimport), variantes remplacées */
export function applyCopy(base0,plan,meta){meta=meta||{};const b=clone(base0);b.over=b.over||{};
  plan.items.forEach(it=>{const {pid,dn}=it;const D=panierOf(base0,pid);if(!D)return;const r=D.rows.find(x=>x.dn===dn);const O=b.over[pid]=b.over[pid]||{};
    if(it.add){const tpl=nearRow(D,dn);O[dn]={add:{mo:it.moA.map(m=>({eq:m.eq,h:m.h})),fo:(tpl?tpl.fo:[]).map(foTpl),extra:(tpl?tpl.extra||[]:[]).map(foTpl),from:plan.src,at:meta.at||''}};}
    else if(plan.opt.mo&&it.chMo&&r){const X=O[dn]=O[dn]||{};
      if(r.added){X.add=Object.assign({},X.add||{},{mo:it.moA.map(m=>({eq:m.eq,h:m.h}))});Object.keys(X).forEach(k=>{if(/^mo\d+$/.test(k))delete X[k];});}
      else{const N=it.moA.length,M=r.mo.length;for(let i=0;i<Math.max(N,M);i++){const k='mo'+i;const o=Object.assign({},X[k]||{});delete o.eq;delete o.h;delete o.add;delete o.k;
          if(i<M){const m=r.mo[i];if(i<N){if(eqK(it.moA[i].eq)!==eqK(m.eq))o.eq=it.moA[i].eq;if(Math.abs(num(it.moA[i].h)-rawH(b,m,dn))>1e-9)o.h=it.moA[i].h;}else o.h=0;} /* une ligne de trop chez le destinataire : 0 h */
          else{o.eq=it.moA[i].eq;o.h=it.moA[i].h;o.add=1;} /* une ligne de plus chez la source : ajoutée */
          if(Object.keys(o).length)X[k]=o;else delete X[k];}
        for(let i=Math.max(N,M);X['mo'+i];i++)delete X['mo'+i];}}
    if(plan.opt.mv){b.mvar=b.mvar||{};const MV=b.mvar[pid]=b.mvar[pid]||{};if(it.vA.length)MV[dn]=clone(it.vA);else delete MV[dn];if(!Object.keys(MV).length)delete b.mvar[pid];}});
  cleanOver(b);if(!Object.keys(b.over).length)delete b.over;return b;}
/* ═════════ 3 · VARIANTES : « quand l'équipe est » = l'équipe choisie pour chiffrer (celle des lignes) ═════════ */
const teamsOf=v=>{const T=[];(v.lignes||[]).forEach(l=>{const t=l&&(l.eq||v.eq);if(t&&!T.some(x=>eqK(x)===eqK(t)))T.push(t);});return T;};
const isSoud=t=>/^S/i.test(String(t||'').trim());
/* fix = une seule équipe dans les lignes, ≠ la condition → « Corriger » l'aligne ; check = à vérifier (plusieurs équipes sans la condition, ou une équipe qui
   n'est pas de soudure : une variante ne vaut que pour l'équipe SOUDURE de la zone) ; conflict = deux variantes du même DN avec la même condition */
export function mvarIssues(base,only){const out=[];const M=(base&&base.mvar)||{};
  Object.keys(M).sort().forEach(pid=>{if(only&&pid!==only)return;const P=base.op?panierOf(base,pid):null;const title=P?P.title:pid;
    Object.keys(M[pid]||{}).sort((a,b)=>a-b).forEach(dn=>{const L=Array.isArray(M[pid][dn])?M[pid][dn]:[];
      L.forEach((v,vi)=>{if(!v||!v.eq)return;const T=teamsOf(v);if(!T.length)return;
        if(T.length===1){if(eqK(T[0])!==eqK(v.eq))out.push(isSoud(T[0])?{kind:'fix',pid,title,dn:+dn,vi,cond:v.eq,team:T[0]}:{kind:'check',pid,title,dn:+dn,vi,cond:v.eq,team:T[0],why:'ligne en '+T[0]+' : une variante ne vaut que pour l\'équipe soudure de la zone'});}
        else if(!T.some(t=>eqK(t)===eqK(v.eq)))out.push({kind:'check',pid,title,dn:+dn,vi,cond:v.eq,team:T.join(' + '),why:'plusieurs équipes'});});
      const seen={};L.forEach((v,vi)=>{if(v&&v.eq)(seen[eqK(v.eq)]=seen[eqK(v.eq)]||[]).push(vi);});Object.keys(seen).forEach(k=>{if(seen[k].length>1)out.push({kind:'conflict',pid,title,dn:+dn,vis:seen[k],cond:L[seen[k][0]].eq});});});});
  return out;}
/* « Corriger » : la condition prend l'équipe des lignes (variantes « fix » seulement) — sur une copie ; on ne fusionne rien (les conflits sont signalés ensuite) */
export function mvarFix(base,only){const b=clone(base);let n=0;mvarIssues(b,only).filter(x=>x.kind==='fix').forEach(x=>{const v=((b.mvar[x.pid]||{})[x.dn]||[])[x.vi];if(v){v.eq=x.team;n++;}});return {base:b,n};}
/* saisie : l'équipe d'une ligne vient de changer — si toutes les lignes ont la même équipe (de soudure), la condition suit ; conflict = une autre variante a déjà cette condition */
export function mvFollow(L,vi){const v=(L||[])[vi];if(!v)return null;const T=teamsOf(v);if(T.length!==1||eqK(T[0])===eqK(v.eq)||!isSoud(T[0]))return null;const from=v.eq;v.eq=T[0];return {from,to:T[0],conflict:L.some((x,i)=>i!==vi&&x&&eqK(x.eq)===eqK(T[0]))};}
