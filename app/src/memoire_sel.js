// memoire_sel.js — 14/10 soir (lot M1) : COCHAGE / DÉCOCHAGE SIMPLIFIÉ du mémoire technique (bibliothèque SCR, écran « 5 · Mémoire » de memoire2.js).
// Ethan : « il faudrait faciliter davantage le cochage décochage, ça fait énormément de cases à cocher, trouver un moyen de simplifier davantage ».
// · Case d'un bloc = JEU STANDARD : bloc vide → ses paragraphes cochés d'office (choix explicites du bloc effacés : défaut + condition d'après le chiffrage) ;
//   bloc sans AUCUN paragraphe par défaut → tous ses paragraphes sauf les variantes en double (une par groupe) ; bloc entamé ou plein → tout le bloc est retiré.
//   Trois états : cochée (le jeu standard y est, avec ou sans ajouts), partielle (il en manque une partie), vide. « ＋ tout le bloc » (détail du bloc) met tout.
// · Case d'une section : même règle pour chacun de ses blocs (vide → jeu standard de chaque bloc ; entamée → tout retiré) ; compteur en blocs.
// · Variantes : paragraphes d'un même bloc dont les 40 premiers caractères du texte normalisé sont identiques (altGroups) → boutons radio ; en choisir une retire les autres.
// · Réserve repliée : dans le détail d'un bloc, les « ajouts à relire » non cochés sont rangés sous « ＋ n en réserve » (les paragraphes par défaut retirés restent visibles).
// · Modèles (« Partir de ») : Référence SCR, Complet, modèles enregistrés (memlib.modeles, contrat K3), comme une autre affaire (sa sélection seulement).
// · Aperçu (mode 'app' seulement, jamais dans l'export — contrat K4) : ✕ sur un paragraphe / sur le titre d'un bloc, « ＋ n disponibles » en fin de bloc,
//   « ＋ Ajouter un bloc » en fin de section. Discrets sur PC (survol / focus), toujours visibles et ≥ 34 px au toucher.
// · Annuler (contrat K6) : pile des sélections précédentes par affaire (AS().mlbUndo, 30 au plus, en mémoire), bouton « ↶ Annuler » dans la barre de l'arbre.
// Tout passe par a.memoire.lib.sel (contrat K1) ; a.memoire.lib.modele = {id, nom, at} (dernier modèle appliqué, pour information).
import {regAll,regSet} from './reg.js';
import {condEval,condLabel} from './memoire3.js';
let X=null; /* pont posé par memoire2.js (selInit) : isSel, libIx, libOf, libSet, AS, say, memLib, K, cur, focus, focusOrder, api, rendu d'un paragraphe */
export function selInit(api){X=api;}
const esc=s=>String(s??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const dFR=x=>x?new Date(x).toLocaleDateString('fr-FR'):'';
const pl=(n,s,p)=>n+' '+(n>1?(p||s+'s'):s);
const HINT=' — ↶ Annuler dans la barre';
const cut=(t,n)=>t.length>n?t.slice(0,n-1)+'…':t;

/* ═════════ variantes : même début de texte (40 premiers caractères normalisés, texte d'au moins 40) dans un même bloc ═════════ */
const txt=h=>String(h||'').replace(/<[^>]+>/g,' ').replace(/&nbsp;/g,' ').replace(/&amp;/g,'&').replace(/&#39;/g,"'").replace(/&quot;/g,'"').replace(/\s+/g,' ').trim();
const normT=h=>txt(h).normalize('NFD').replace(/[\u0300-\u036f]/g,'').toLowerCase().replace(/[^a-z0-9\s]+/g,'').replace(/\s+/g,' ').trim(); /* sans accents, minuscules, ponctuation retirée */
let AG=null;
export function altGroups(L){if(AG&&AG.blocs===L.blocs)return AG.v;const of={},groups={};
  (L.blocs||[]).forEach(b=>{const m=new Map();(b.paragraphes||[]).forEach(p=>{if(!p||p.type==='equipe')return;const t=normT(p.html||(p.type==='image'?p.legende:''));if(t.length<40)return;const k=t.slice(0,40);if(!m.has(k))m.set(k,[]);m.get(k).push(p);});
    let n=0;m.forEach(ps=>{if(ps.length<2)return;const gid=b.id+'#'+(++n);groups[gid]=ps.map(p=>p.id);ps.forEach(p=>{of[p.id]=gid;});});});
  const v={of,groups};AG={blocs:L.blocs,v};return v;}
/* étiquette d'une variante : « avec image » / « texte seul » quand le groupe mélange les deux */
function altLab(L,p){const G=altGroups(L);const g=G.of[p.id];if(g===undefined)return '';if(p.type==='image')return 'avec image';const P=X.libIx(L).P;return G.groups[g].some(id=>P[id]&&P[id].p.type==='image')?'texte seul':'';}
const shortOf=(L,id)=>{const x=X.libIx(L).P[id];if(!x)return '';const l=altLab(L,x.p);return l?'« '+l+' »':'« '+cut(txt(x.p.html||x.p.legende||''),48)+' »';};

/* ═════════ jeu standard d'un bloc ═════════ */
const condOk=(p,K)=>{if(!p.cond||!K)return true;const c=condEval(p.cond,K.F,K.ext);if(c===null)return !/^\s*!/.test(p.cond);return !!c;}; /* comme isSel (memoire2.js) pour un paragraphe coché d'office */
/* {pids, explicit} : explicit = false → effacer les choix du bloc suffit (défaut + condition) ; true → cocher ces paragraphes explicitement.
   force (case d'UN bloc touchée exprès) : si le chiffrage décoche d'office tout le bloc, on met quand même ses paragraphes par défaut (sinon : rien — section, Complet) */
export function stdSet(L,b,K,force){const ps=b.paragraphes||[];if(!ps.length)return {pids:[],explicit:false};
  if(ps.some(p=>p.defaut===true)){const on=ps.filter(p=>p.defaut===true&&condOk(p,K));if(on.length||!force)return {pids:on.map(p=>p.id),explicit:false};
    return {pids:ps.filter(p=>p.defaut===true).map(p=>p.id),explicit:true};}
  const G=altGroups(L).of;let cand=ps.filter(p=>condOk(p,K));if(!cand.length&&force)cand=ps.slice();const seen=new Set();
  return {pids:cand.filter(p=>{const g=G[p.id];if(g===undefined)return true;if(seen.has(g))return false;seen.add(g);return true;}).map(p=>p.id),explicit:true};} /* une seule variante par groupe (la première) */
function stdApply(sel,L,b,K,force){const S=stdSet(L,b,K,force);(b.paragraphes||[]).forEach(p=>{delete sel[p.id];});if(S.explicit)S.pids.forEach(id=>{sel[id]=true;});return S.pids.length;}
function blocOff(sel,b){(b.paragraphes||[]).forEach(p=>{if(p.defaut===true)sel[p.id]=false;else delete sel[p.id];});} /* un ajout non choisi est décoché de lui-même */
/* état d'un bloc / d'une section d'après le modèle du document (un calcul par rendu) */
const BS=new WeakMap();
function bState(L,M,b){let c=BS.get(M);if(!c)BS.set(M,c={});if(c[b.id])return c[b.id];const R=M.st.R;const ps=b.paragraphes||[];const G=altGroups(L).of;
  const on=new Set(ps.filter(p=>R[p.id]&&R[p.id].on).map(p=>p.id));const onG=new Set([...on].map(id=>G[id]).filter(g=>g!==undefined));const std=stdSet(L,b,M.K);
  const ok=std.pids.every(id=>on.has(id)||(G[id]!==undefined&&onG.has(G[id]))); /* une autre variante du groupe compte */
  return c[b.id]={n:ps.length,k:on.size,std,st:!on.size?'off':ok?'on':'part'};}
function sState(L,M,s){const bs=s.blocs.map(b=>bState(L,M,b));const k=bs.filter(x=>x.k).length;return {n:bs.length,k,st:!k?'off':bs.every(x=>x.st==='on'||!x.n||(!x.k&&!x.std.pids.length))?'on':'part'};} /* un bloc que le chiffrage laisse vide ne rend pas la section « partielle » */

/* ═════════ arbre de gauche (treeBody de memoire2.js) ═════════ */
export function selPCk(L,x,ro){css();const id=esc(x.p.id);
  if(altGroups(L).of[x.p.id]===undefined)return `<label class="memoire-ck"><input type="checkbox" ${x.on?'checked':''} ${ro?'disabled':''} data-act="af" data-v="mlbp|${id}" aria-label="Mettre ce paragraphe dans le mémoire"></label>`;
  const t=x.on?'Variante choisie — touche pour la retirer':'Choisir cette variante (remplace les autres)';
  return `<label class="memoire-ck m1-alt" title="${t}"><input type="radio" ${x.on?'checked':''} ${ro?'disabled':''} data-act="af" data-v="mlbalt|${id}" aria-label="${t}"></label>`;}
export function selPTag(L,x){if(altGroups(L).of[x.p.id]===undefined)return '';const l=altLab(L,x.p);return `<span class="memoire-tg m1-var" title="Même texte qu’un autre paragraphe du bloc : une seule version dans le mémoire">variante${l?' · '+l:''}</span>`;}
export function selBCk(L,M,b,ro){const S=bState(L,M,b);const F=S.k?S.std:stdSet(L,b,M.K,true);const n=F.pids.length;
  const t=S.k?'Retirer tout le bloc du mémoire':`Mettre le jeu standard du bloc (${pl(n,'paragraphe')}${F.explicit?'':' cochés d’office'}, sans les ajouts à relire ni les doublons)`;
  return `<label class="memoire-ck" title="${t}"><input type="checkbox" ${S.st==='on'?'checked':''} ${S.st==='part'?'data-mlbind="1"':''} ${ro?'disabled':''} data-act="af" data-v="mlbb|${esc(b.id)}" aria-label="${t}"></label>`;}
/* lignes du détail d'un bloc : ce qui compte d'abord (coché, par défaut, variantes du groupe choisi), puis la réserve repliée ; « ＋ tout le bloc » */
export function selRows(L,M,b,rows,prow,q,ro){if(q)return rows.map(prow).join('');const G=altGroups(L).of;const onG=new Set(rows.filter(x=>x.on&&G[x.p.id]!==undefined).map(x=>G[x.p.id]));
  const vis=[],res=[];rows.forEach(x=>{(x.on||x.p.defaut===true||(G[x.p.id]!==undefined&&onG.has(G[x.p.id]))?vis:res).push(x);});
  const all=!ro&&rows.length>1&&rows.some(x=>!x.on)?`<button type="button" class="m1-lnk" data-act="af" data-v="mlbball|${esc(b.id)}" title="Mettre tous les paragraphes du bloc, ajouts et variantes compris">＋ tout le bloc</button>`:'';
  if(!vis.length)return rows.map(prow).join('')+(all?`<div class="m1-bfoot">${all}</div>`:''); /* rien de coché ni de prévu : tout est à lire, rien à replier */
  const A=X.AS();const open=!!(A.mlbRes||{})[b.id]||res.some(x=>x.p.id===A.mlbHL);
  const tg=res.length?`<button type="button" class="m1-lnk m1-res" data-act="af" data-v="mlbres|${esc(b.id)}" aria-expanded="${open?'true':'false'}">${open?'－':'＋'} ${res.length} en réserve <small>(à relire avant d’ajouter)</small></button>`:'';
  return vis.map(prow).join('')+(tg||all?`<div class="m1-bfoot">${tg}${all}</div>`:'')+(open?res.map(prow).join(''):'');}
export function selSCk(L,M,s,ro){css();const S=sState(L,M,s);const t=S.k?'Retirer toute la section du mémoire':'Mettre la section : jeu standard de chacun de ses blocs';
  return `<label class="memoire-ck" title="${t}"><input type="checkbox" ${S.st==='on'?'checked':''} ${S.st==='part'?'data-mlbind="1"':''} ${ro?'disabled':''} data-act="af" data-v="mlbs|${s.i}" aria-label="${t}"></label>`;}
export function selSCount(L,M,s){const S=sState(L,M,s);return `${S.k} / ${pl(S.n,'bloc')}`;}
export function selVarTag(L,pid){const x=X.libIx(L).P[pid];if(!x||altGroups(L).of[pid]===undefined)return '';const l=altLab(L,x.p);return ' · variante'+(l?' ('+esc(l)+')':'')+' : une seule version dans le mémoire';}
export function m1Intro(){return ' <b>Plus simple :</b> la case d’un bloc met son jeu standard (sans les ajouts à relire ni les doublons), celle d’une section fait de même pour tous ses blocs ; « Partir de » applique un modèle ; ↶ Annuler revient en arrière.';}

/* ═════════ barre de l'arbre : modèles (« Partir de ») et ↶ Annuler ═════════ */
const modsOf=L=>(Array.isArray(L&&L.modeles)?L.modeles:[]).filter(m=>m&&m.id&&m.nom&&m.sel&&typeof m.sel==='object').sort((x,y)=>String(x.nom).localeCompare(String(y.nom),'fr'));
function affsLib(a){let all=[];try{all=regAll('affaire');}catch(e){all=[];}return all.filter(x=>x&&x.num&&x.num!==a.num&&x.memoire&&x.memoire.lib&&x.memoire.mode!=='sections').sort((x,y)=>String(y.num).localeCompare(String(x.num))).slice(0,60);}
export function m1Models(a,L,canEdit){css();const mo=X.libOf(a).modele;const info=mo&&mo.nom?`<div class="m1-modinfo" id="memoire-modinfo">Modèle : <b>${esc(mo.nom)}</b>${mo.at?' · appliqué le '+esc(dFR(mo.at)):''}</div>`:'';if(!canEdit)return info;
  const mods=modsOf(L);const affs=affsLib(a);const cur=X.AS().mlbModSel||'ref';const opt=(v,t)=>`<option value="${esc(v)}"${cur===v?' selected':''}>${esc(t)}</option>`;
  const o=opt('ref','Référence SCR')+opt('complet','Complet (+ blocs en réserve)')+(mods.length?`<optgroup label="Modèles enregistrés">${mods.map(m=>opt('m:'+m.id,m.nom)).join('')}</optgroup>`:'')+(affs.length?`<optgroup label="Comme l’affaire…">${affs.map(x=>opt('a:'+x.num,x.num+(x.nom?' · '+x.nom:''))).join('')}</optgroup>`:'');
  const del=mods.some(m=>'m:'+m.id===cur);
  return `<div class="m1-mod"><label for="memoire-mod">Partir de :</label><select class="f" id="memoire-mod">${o}</select><button class="btn sm" data-act="af" data-v="mlbmodapp|" title="Remplace les choix actuels de paragraphes (les trous remplis et les textes modifiés sont gardés)">Appliquer</button><button class="btn sm" id="memoire-moddel" data-act="af" data-v="mlbmoddel|"${del?'':' hidden'} title="Supprimer ce modèle (pour tous les mémoires)" aria-label="Supprimer ce modèle">🗑</button><button class="btn sm" data-act="af" data-v="mlbmodsave|" title="Enregistrer les choix actuels comme modèle, pour tous les mémoires">💾 Enregistrer comme modèle</button></div>${info}`;}
const stack=num=>{const A=X.AS();const U=A.mlbUndo=A.mlbUndo||{};return U[num]=U[num]||[];};
export function m1Tools(a,canEdit){if(!canEdit)return '';const n=stack(a.num).length;return `<button class="btn sm" id="memoire-undo" data-act="af" data-v="mlbundo|" ${n?'':'disabled'} title="${n?'Annuler le dernier changement de sélection ('+n+' possible'+(n>1?'s':'')+')':'Rien à annuler'}">↶ Annuler</button>`;}

/* ═════════ aperçu (previewHTML / itemApp de memoire2.js) : mode 'app' seulement (jamais dans le Word, l'impression ni le PDF) ═════════ */
const appOk=(M,canEdit)=>!!canEdit&&!!M&&M.mode==='app';
export function m1ParaX(M,it,canEdit){if(!appOk(M,canEdit))return '';return `<button type="button" class="m1-x" data-act="af" data-v="mlbx|${esc(it.pid)}" title="Retirer ce paragraphe du mémoire" aria-label="Retirer ce paragraphe"></button>`;}
export function m1BlocX(M,B,canEdit){if(!appOk(M,canEdit))return '';return `<button type="button" class="m1-bx" data-act="af" data-v="mlbbx|${esc(B.b.id)}" title="Retirer le bloc « ${esc(B.b.titre||'')} » du mémoire" aria-label="Retirer le bloc"></button>`;}
export function m1BlocAdd(M,B,canEdit){if(!appOk(M,canEdit))return '';const R=M.st.R;const n=(B.b.paragraphes||[]).filter(p=>R[p.id]&&!R[p.id].on).length;if(!n)return '';
  return `<button type="button" class="m1-more" data-act="af" data-v="mlbdisp|${esc(B.b.id)}" title="Lire les paragraphes de ce bloc qui ne sont pas dans le mémoire, et en ajouter">＋ ${pl(n,'paragraphe')} disponible${n>1?'s':''}</button>`;}
export function m1SecAdd(M,S,canEdit){if(!appOk(M,canEdit))return '';const R=M.st.R;const bl=S.s.blocs.filter(b=>(b.paragraphes||[]).length&&!(b.paragraphes||[]).some(p=>R[p.id]&&R[p.id].on));if(!bl.length)return '';
  return `<div class="m1-secadd"><span>＋ Ajouter un bloc :</span>${bl.map(b=>`<button type="button" class="m1-chip" data-act="af" data-v="mlbbstd|${esc(b.id)}" title="Mettre le jeu standard du bloc (${pl(stdSet(M.L,b,M.K,true).pids.length,'paragraphe')})">${esc(b.titre||'(sans titre)')}</button>`).join('')}</div>`;}

/* ═════════ actions (data-v="mlb…" — memLibAct de memoire2.js) ═════════ */
const sameSel=(x,y)=>{const kx=Object.keys(x),ky=Object.keys(y);return kx.length===ky.length&&kx.every(k=>y[k]===x[k]);};
/* un changement de sélection : ancienne sélection empilée (↶ Annuler), écriture, défilement (FOCUS), rendu, message */
function commit(a,ctx,fn,o){o=o||{};const lib0=X.libOf(X.cur(a));const s0=Object.assign({},lib0.sel||{});const s=Object.assign({},s0);fn(s);
  if(sameSel(s0,s)&&!o.modele){X.say(o.same||'Rien à changer : c’est déjà le cas');return false;}
  const st=stack(a.num);st.push({sel:s0,modele:lib0.modele||null});if(st.length>30)st.splice(0,st.length-30);
  X.libSet(a,lib=>{lib.sel=s;if(o.modele)lib.modele=o.modele;});const A=X.AS();
  if(o.focus)X.focus(o.focus);if(o.hl)A.mlbHL=o.hl;if(o.exp){const e=A.mlbExp=Object.assign({},A.mlbExp||{});e[o.exp]=true;}if(o.sec!==undefined){const e=A.mlbSec=Object.assign({},A.mlbSec||{});e[o.sec]=true;}
  if(ctx.render)ctx.render();if(o.msg)X.say(o.msg+HINT);return true;}
/* un paragraphe mis / retiré ; mettre une variante retire les autres du groupe */
function paraSet(a,ctx,pid,on,o){o=o||{};const L=X.memLib();if(!L)return false;const P=X.libIx(L).P;const x=P[pid];if(!x)return false;const G=altGroups(L);const g=G.of[pid];const K=X.K(a,ctx);const lib=X.libOf(X.cur(a));
  const sib=g===undefined?[]:G.groups[g].filter(id=>id!==pid);const rep=on?sib.filter(id=>P[id]&&X.isSel(lib,P[id].p,K)):[];const l=altLab(L,x.p);
  const msg=on?(rep.length?`Variante${l?' « '+l+' »':''} choisie (${rep.map(id=>shortOf(L,id)).join(', ')} retirée)`:'Paragraphe ajouté au mémoire'):(g!==undefined?'Variante retirée du mémoire':'Paragraphe retiré du mémoire');
  return commit(a,ctx,s=>{s[pid]=!!on;if(on)sib.forEach(id=>{s[id]=false;});},{msg,focus:o.nofocus?null:{pid,bid:x.b.id,on:!!on,order:X.focusOrder(L,pid,null)},hl:o.hl?pid:null});}
export function selAct(k,arg,arg2,a,ctx){const L=X.memLib();if(!L)return true;const render=()=>{if(ctx.render)ctx.render();};const A=X.AS();
  if(k==='mlbres'){const o=A.mlbRes=Object.assign({},A.mlbRes||{});o[arg]=!o[arg];render();return true;} /* déplier / replier la réserve : permis en lecture seule */
  if(!ctx.canEdit)return true;const ix=X.libIx(L);const K=X.K(a,ctx);const lib=X.libOf(X.cur(a));const bloc=()=>ix.list.find(b=>b.id===arg);
  switch(k){
    case 'mlbp':case 'mlbalt':{const x=ix.P[arg];if(!x)return true;paraSet(a,ctx,arg,!X.isSel(lib,x.p,K),{hl:true});return true;}
    case 'mlbpset':{paraSet(a,ctx,arg,arg2==='1',{hl:true});return true;} /* fiche du paragraphe : mettre / retirer */
    case 'mlbx':{paraSet(a,ctx,arg,false,{nofocus:true});return true;} /* ✕ dans l'aperçu : on reste à sa place */
    case 'mlbb':{const b=bloc();if(!b)return true;const any=(b.paragraphes||[]).some(p=>X.isSel(lib,p,K));const n=stdSet(L,b,K,true).pids.length;
      commit(a,ctx,s=>{if(any)blocOff(s,b);else stdApply(s,L,b,K,true);},{exp:b.id,focus:{bid:b.id,on:!any,order:X.focusOrder(L,null,b.id)},msg:any?`Bloc « ${b.titre} » retiré du mémoire`:`Bloc « ${b.titre} » : jeu standard (${pl(n,'paragraphe')})`});return true;}
    case 'mlbbx':{const b=bloc();if(!b)return true;commit(a,ctx,s=>blocOff(s,b),{msg:`Bloc « ${b.titre} » retiré du mémoire`});return true;}
    case 'mlbbstd':{const b=bloc();if(!b)return true;const n=stdSet(L,b,K,true).pids.length;commit(a,ctx,s=>{stdApply(s,L,b,K,true);},{focus:{bid:b.id,on:true,order:[]},msg:`Bloc « ${b.titre} » ajouté : jeu standard (${pl(n,'paragraphe')})`});return true;}
    case 'mlbball':{const b=bloc();if(!b)return true;const n=(b.paragraphes||[]).length;commit(a,ctx,s=>{(b.paragraphes||[]).forEach(p=>{s[p.id]=true;});},{exp:b.id,focus:{bid:b.id,on:true,order:[]},msg:`Bloc « ${b.titre} » : tous ses paragraphes (${n})`});return true;}
    case 'mlbs':{const s0=ix.secs[+arg];if(!s0)return true;const any=s0.blocs.some(b=>(b.paragraphes||[]).some(p=>X.isSel(lib,p,K)));let force=false;let nb=s0.blocs.filter(b=>stdSet(L,b,K).pids.length).length;
      if(!any&&!nb){force=true;nb=s0.blocs.filter(b=>stdSet(L,b,K,true).pids.length).length;} /* le chiffrage ne laisse rien : la case a été touchée exprès */
      const last=s0.blocs[s0.blocs.length-1];const first=s0.blocs.find(b=>stdSet(L,b,K,force).pids.length);
      commit(a,ctx,s=>{s0.blocs.forEach(b=>{if(any)blocOff(s,b);else stdApply(s,L,b,K,force);});},{sec:any?undefined:s0.i,focus:any?(last?{on:false,order:X.focusOrder(L,null,last.id)}:null):(first?{bid:first.id,on:true,order:['memoire-s-'+s0.i]}:null),
        msg:any?`Section « ${s0.name} » retirée du mémoire`:`Section « ${s0.name} » : jeu standard de ${pl(nb,'bloc')}`});return true;}
    case 'mlbreset':{if(!confirm('Revenir aux paragraphes cochés par défaut (et d’après le chiffrage) ? Les trous déjà remplis et les textes modifiés sont gardés.'))return true;
      commit(a,ctx,s=>{Object.keys(s).forEach(id=>{delete s[id];});},{modele:{id:'ref',nom:'Référence SCR',at:new Date().toISOString()},msg:'Choix par défaut repris'});return true;}
    case 'mlbdisp':{dispModal(a,L,arg,ctx);return true;}
    case 'mlbundo':{const st=stack(a.num);if(!st.length){X.say('Rien à annuler');return true;}const e=st.pop();X.libSet(a,l=>{l.sel=Object.assign({},e.sel);if(e.modele)l.modele=e.modele;else delete l.modele;});render();
      X.say('↶ Choix précédent rétabli'+(st.length?' ('+st.length+' autre'+(st.length>1?'s':'')+' possible'+(st.length>1?'s':'')+')':''));return true;}
    case 'mlbmodapp':{const el=typeof document!=='undefined'?document.getElementById('memoire-mod'):null;const v=(el&&el.value)||A.mlbModSel||'ref';A.mlbModSel=v;applyModel(a,L,v,ctx);return true;}
    case 'mlbmodsave':{saveModal(a,L,ctx);return true;}
    case 'mlbmoddel':{const el=typeof document!=='undefined'?document.getElementById('memoire-mod'):null;const v=(el&&el.value)||A.mlbModSel||'';const m=modsOf(L).find(x=>'m:'+x.id===v);if(!m){X.say('Choisis d’abord un modèle enregistré dans la liste');return true;}
      if(!confirm(`Supprimer le modèle « ${m.nom} » ? Il disparaît pour tous les mémoires (ceux déjà faits ne changent pas).`))return true;
      if(!libWrite({modeles:modsOf(X.memLib()||L).filter(x=>x.id!==m.id)}))return true;A.mlbModSel='ref';render();X.say('🗑 Modèle « '+m.nom+' » supprimé');return true;}
  }
  return true;}
/* écriture de la bibliothèque (memlib, contrat K3) : réservée à qui a le droit — le serveur peut refuser (reg.js le dit) ; ici, rien ne casse */
function libWrite(patch){try{regSet('doc','memlib',patch);return true;}catch(e){console.warn(e);X.say('Bibliothèque non modifiée : '+((e&&e.message)||e));return false;}}
const who=ctx=>{try{if(ctx&&ctx.api&&ctx.api.userName)return ctx.api.userName();const A=X.api();if(A&&A.userName)return A.userName();}catch(e){}return '';};
const countOn=(L,sel,K)=>{const lib={sel};let n=0;X.libIx(L).list.forEach(b=>(b.paragraphes||[]).forEach(p=>{if(X.isSel(lib,p,K))n++;}));return n;};
/* appliquer un modèle : Référence SCR (sel vide), Complet (+ jeu standard des blocs sans rien par défaut), modèle enregistré, comme une autre affaire (sa sélection seulement) ;
   les identifiants absents de la bibliothèque sont ignorés ; trous remplis et textes modifiés gardés (seule la sélection change) */
function applyModel(a,L,v,ctx){const ix=X.libIx(L);const K=X.K(a,ctx);const keep=s=>{const o={};Object.keys(s||{}).forEach(k=>{if(ix.P[k])o[k]=!!s[k];});return o;};let sel=null,nom='',id='';
  if(v==='ref'){sel={};nom='Référence SCR';id='ref';}
  else if(v==='complet'){sel={};ix.list.forEach(b=>{if(!(b.paragraphes||[]).some(p=>p.defaut===true))stdApply(sel,L,b,K);});nom='Complet';id='complet';}
  else if(v.startsWith('m:')){const m=modsOf(L).find(x=>'m:'+x.id===v);if(!m){X.say('Modèle introuvable (supprimé ?)');return;}sel=keep(m.sel);nom=m.nom;id=m.id;}
  else if(v.startsWith('a:')){const n=v.slice(2);let o=null;try{o=regAll('affaire').find(x=>x&&x.num===n);}catch(e){o=null;}if(!o){X.say('Affaire introuvable');return;}sel=keep(((o.memoire||{}).lib||{}).sel);nom='Comme l’affaire '+n;id='aff:'+n;}
  if(!sel)return;
  if(!confirm(`Partir de « ${nom} » ?\n\nCela remplace les choix actuels de paragraphes ; les trous remplis et les textes modifiés sont gardés. (↶ Annuler possible)`))return;
  const n=countOn(L,sel,K);commit(a,ctx,s=>{Object.keys(s).forEach(k=>{delete s[k];});Object.assign(s,sel);},{modele:{id,nom,at:new Date().toISOString()},msg:`« ${nom} » appliqué : ${pl(n,'paragraphe')} coché${n>1?'s':''}`});}
/* enregistrer la sélection actuelle comme modèle (pour tous les mémoires) ; même nom → remplacé après confirmation ; 20 au plus */
function saveModal(a,L,ctx){const A=X.api();const mods=modsOf(L);const lib=X.libOf(X.cur(a));const n=countOn(L,lib.sel||{},X.K(a,ctx));
  A.openModal(`<h3 style="margin-top:0">💾 Enregistrer comme modèle</h3><div class="hint" style="margin:0 0 6px">Les choix de paragraphes de ce mémoire (${pl(n,'paragraphe')} coché${n>1?'s':''}) deviennent un point de départ pour <b>tous les mémoires</b> (liste « Partir de »). Ni les trous remplis ni les textes modifiés n’entrent dans le modèle.</div>
    <input class="f" id="m1-mname" maxlength="60" placeholder="Nom du modèle (ex. réseau neuf avec sous-stations)" autocomplete="off" value="${esc((lib.modele&&/^m/.test(lib.modele.id)&&mods.some(m=>m.id===lib.modele.id))?lib.modele.nom:'')}">
    ${mods.length?`<div class="hint" style="margin:6px 0 0">Déjà enregistrés (${mods.length} / 20) : ${mods.map(m=>esc(m.nom)).join(' · ')}</div>`:''}
    <div class="actions" style="margin-top:8px"><button class="btn primary block" id="m1-mok">Enregistrer</button><button class="btn block" data-close>Annuler</button></div>`);
  const inp=document.getElementById('m1-mname');const ok=()=>{const nom=String(inp.value||'').replace(/\s+/g,' ').trim().slice(0,60);if(!nom){X.say('Donne un nom au modèle');try{inp.focus();}catch(e){}return;}
    const list=modsOf(X.memLib()||L);const same=list.find(m=>m.nom.toLowerCase()===nom.toLowerCase());
    if(same&&!confirm(`Le modèle « ${same.nom} » existe déjà : le remplacer par les choix actuels ?`))return;
    if(!same&&list.length>=20){X.say('20 modèles au plus : supprimes-en un d’abord (🗑 à côté de la liste)');return;}
    const m={id:same?same.id:'m'+Date.now().toString(36)+Math.random().toString(36).slice(2,5),nom,sel:Object.assign({},X.libOf(X.cur(a)).sel||{}),at:new Date().toISOString(),by:who(ctx)};
    if(!libWrite({modeles:same?list.map(x=>x===same?m:x):list.concat([m])}))return;
    X.AS().mlbModSel='m:'+m.id;A.closeModal();if(ctx.render)ctx.render();X.say(`💾 Modèle « ${nom} » ${same?'remplacé':'enregistré'} (pour tous les mémoires)`);};
  document.getElementById('m1-mok').onclick=ok;inp.onkeydown=e=>{if(e.key==='Enter'){e.preventDefault();ok();}};setTimeout(()=>{try{inp.focus();}catch(e){}},50);}
/* « ＋ n paragraphes disponibles » : les paragraphes du bloc qui ne sont pas dans le mémoire, lisibles, à ajouter un par un ou tous */
function paraHTML(a,L,pid,K){const x=X.libIx(L).P[pid];if(!x)return '';const p=x.p;const kind=X.kindOf(p);if(kind==='equipe')return '<p>👥 Organigramme « moyens humains » (annuaire)</p>';const lib=X.libOf(X.cur(a));
  const r=X.fillPara(X.prepRich(X.memSanitize(X.srcOf(L,lib,pid))),pid,lib.fill||{},K.V,'app',true);
  return (kind==='image'?`<p class="m1-img">🖼 ${esc(X.plain(String(p.legende||''))||'Image')}${p.cote?' · à côté du texte ci-dessous':''}</p>`:'')+X.styleTables(r.html,X.styleOf(L),true);}
function dispModal(a,L,bid,ctx){const ix=X.libIx(L);const b=ix.list.find(x=>x.id===bid);if(!b)return;const K=X.K(a,ctx);const lib=X.libOf(X.cur(a));const G=altGroups(L);const A=X.api();
  const ps=b.paragraphes||[];const on=new Set(ps.filter(p=>X.isSel(lib,p,K)).map(p=>p.id));const off=ps.filter(p=>!on.has(p.id));if(!off.length){X.say('Tout ce bloc est déjà dans le mémoire');return;}
  const gOn=new Set([...on].map(id=>G.of[id]).filter(g=>g!==undefined));const seen=new Set();
  const allIds=off.filter(p=>{const g=G.of[p.id];if(g===undefined)return true;if(gOn.has(g)||seen.has(g))return false;seen.add(g);return true;}).map(p=>p.id); /* « Ajouter tout » : sans remplacer une variante déjà choisie, une seule par groupe */
  const item=p=>{const g=G.of[p.id];const rep=g===undefined?[]:G.groups[g].filter(id=>id!==p.id&&on.has(id));const c=p.cond?condEval(p.cond,K.F,K.ext):null;const l=altLab(L,p);
    const tags=(p.defaut===true?'<span class="memoire-tg">coché d’office · retiré</span>':'<span class="memoire-tg">ajout · à relire</span>')+(p.cond?`<span class="memoire-tg auto">⚙ ${esc(condLabel(p.cond,c===null?true:c))}</span>`:'')
      +(g!==undefined?`<span class="memoire-tg m1-var">variante${l?' · '+esc(l):''}${rep.length?' : remplace '+esc(rep.map(id=>shortOf(L,id)).join(', ')):''}</span>`:'');
    return `<div class="m1-dli" id="m1-dli-${esc(p.id)}"><div class="m1-dlh"><span class="m1-dlg">${p.titre?'<b>'+esc(p.titre)+'</b> ':''}${tags}</span><button class="btn sm primary" data-m1add="${esc(p.id)}">${rep.length?'⇄ Remplacer':'＋ Ajouter'}</button></div><div class="memoire-page memoire-scr m1-dlt">${paraHTML(a,L,p.id,K)}</div></div>`;};
  A.openModal(`<h3 style="margin-top:0">＋ ${esc(b.titre||'(sans titre)')}</h3><div class="hint" style="margin:0 0 4px">${pl(off.length,'paragraphe')} de ce bloc ${off.length>1?'ne sont':'n’est'} pas dans le mémoire : lis, ajoute ce qui sert à cette affaire.</div>
    <div class="m1-dl">${off.map(item).join('')}</div><div class="actions" style="margin-top:8px;display:flex;flex-direction:column;gap:6px">${allIds.length>1?`<button class="btn block" id="m1-addall">＋ Ajouter tout (${allIds.length})</button>`:''}<button class="btn block" data-close>Fermer</button></div>`);
  document.querySelectorAll('#modal [data-m1add]').forEach(el=>{el.onclick=()=>{const pid=el.dataset.m1add;A.closeModal();paraSet(a,ctx,pid,true,{});};});
  const all=document.getElementById('m1-addall');if(all)all.onclick=()=>{A.closeModal();commit(a,ctx,s=>{allIds.forEach(id=>{s[id]=true;});},{focus:{bid,on:true,order:[]},msg:`Bloc « ${b.titre} » : ${pl(allIds.length,'paragraphe')} ajouté${allIds.length>1?'s':''}`});};}

/* ═════════ CSS du lot (injectée une fois) ═════════ */
const F1="font:12px/1.25 system-ui,-apple-system,'Segoe UI',Roboto,sans-serif;font-variant:normal;text-transform:none;letter-spacing:normal";
const CSS1=`.m1-sechw{display:flex;align-items:stretch;gap:2px;margin:0 0 5px}.m1-sechw>.memoire-sech{flex:1 1 auto;width:auto;min-width:0;margin:0}
.memoire-sec.mem3-empty>.m1-sechw>.memoire-sech{opacity:.55;background:#f4f3ef}.memoire-sec.mem3-empty>.m1-sechw>.memoire-sech b{font-weight:600}
.memoire-tg.m1-var{background:#efe9fb;color:#55398f}.m1-bfoot{display:flex;flex-wrap:wrap;align-items:center;gap:0 12px;margin:0 0 2px 56px}
.m1-lnk{display:inline-flex;align-items:center;gap:4px;padding:0 6px;border:0;background:none;color:#1c3d6b;font-size:12.5px;cursor:pointer;border-radius:8px;text-align:left}.m1-lnk small{color:var(--ink2);font-size:11px}.m1-lnk:hover{background:rgba(0,0,0,.05)}.m1-bfoot .m1-lnk{min-height:36px}
.m1-mod{display:flex;flex-wrap:wrap;align-items:center;gap:6px;margin:0 0 4px}.m1-mod label{font-size:12.5px;font-weight:700;white-space:nowrap}.m1-mod select{flex:1 1 150px;width:auto;min-width:0;max-width:100%;margin:0}.m1-mod .btn[hidden]{display:none}
.m1-modinfo{font-size:11.5px;color:var(--ink2);margin:0 0 6px}
.memoire-page .mem3-bk>h2{position:relative}
.memoire-page .m1-x,.memoire-page .m1-bx{position:absolute;left:-27px;width:27px;height:27px;min-height:0;padding:0;border:1px solid #e3d6d3;border-radius:8px;background:#fff;color:#9b2c22;${F1};font-size:13px;line-height:1;display:flex;align-items:center;justify-content:center;cursor:pointer;opacity:0;pointer-events:none;transition:opacity .12s}
.memoire-page .m1-x{top:0}.memoire-page .m1-bx{top:50%;transform:translateY(-50%)}.memoire-page .m1-x::before,.memoire-page .m1-bx::before{content:"✕"}
.memoire-page .memoire-p:hover>.m1-x,.memoire-page .mem3-bk>h2:hover>.m1-bx,.memoire-page .m1-x:focus-visible,.memoire-page .m1-bx:focus-visible{opacity:1;pointer-events:auto;z-index:3}
.memoire-page .m1-x:hover,.memoire-page .m1-bx:hover{background:#fdecea;border-color:#e3a9a2}
.memoire-page .m1-more{display:inline-flex;align-items:center;min-height:30px;margin:0 0 8px;padding:2px 10px;border:1px dashed transparent;border-radius:8px;background:none;color:#8a857a;${F1};cursor:pointer;opacity:.7}
.memoire-page .mem3-bk:hover .m1-more,.memoire-page .m1-more:focus-visible{opacity:1;border-color:#cfc9bd;color:#1c3d6b}
.memoire-page .m1-secadd{display:flex;flex-wrap:wrap;align-items:center;gap:4px 6px;margin:2px 0 14px;${F1};color:#8a857a;opacity:.75;text-align:left}.memoire-page section:hover .m1-secadd,.memoire-page .m1-secadd:focus-within{opacity:1}
.memoire-page .m1-chip{display:inline-flex;align-items:center;min-height:30px;padding:2px 10px;border:1px dashed #cfc9bd;border-radius:999px;background:#fff;color:#1c3d6b;font:inherit;cursor:pointer;text-align:left}.memoire-page .m1-chip:hover{border-style:solid;background:#f3f7fd}
@media (hover:none),(max-width:600px){.memoire-page .memoire-p,.memoire-page .mem3-bk>h2{display:flow-root}.memoire-page .m1-x,.memoire-page .m1-bx{position:static;float:right;transform:none;opacity:1;pointer-events:auto;width:34px;height:34px;margin:0 0 4px 6px}
  .memoire-page .m1-more,.memoire-page .m1-secadd{opacity:1}.memoire-page .m1-more,.memoire-page .m1-chip{min-height:34px}.memoire-page .m1-more{border-color:#e2ddd2}}
.modal .box:has(.m1-dl){max-width:720px}.m1-dl{max-height:56vh;overflow:auto;margin:6px 0 0}.m1-dli{border:1px solid var(--line);border-radius:10px;padding:6px 8px;margin:0 0 8px}
.m1-dlh{display:flex;flex-wrap:wrap;gap:6px;align-items:center;justify-content:space-between}.m1-dlg{display:flex;flex-wrap:wrap;gap:3px;align-items:center;min-width:0}.m1-dli .btn{min-height:36px}
.m1-dl .m1-dlt{max-width:none;margin:4px 0 0;padding:4px 2px 0;box-shadow:none;background:transparent;font-size:10.5pt}.m1-dl .m1-dlt p,.m1-dl .m1-dlt li{color:inherit;font-size:inherit}.m1-dl .m1-img{font-style:italic}`;
let WIRED=false;
function css(){if(typeof document==='undefined')return;if(!document.getElementById('css-lot-m1')){const st=document.createElement('style');st.id='css-lot-m1';st.textContent=CSS1;document.head.appendChild(st);}
  if(WIRED)return;WIRED=true; /* liste « Partir de » : le choix est gardé d'un rendu à l'autre ; 🗑 seulement pour un modèle enregistré */
  document.addEventListener('change',e=>{const t=e.target;if(!t||t.id!=='memoire-mod'||!X)return;X.AS().mlbModSel=t.value;const d=document.getElementById('memoire-moddel');if(d)d.hidden=!/^m:/.test(t.value);},true);}
