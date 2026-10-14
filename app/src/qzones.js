// qzones.js — QUANTITÉS ET ZONES DU CHIFFRAGE (14/10/2026 soir, lot Q). Ethan : « dans le traceur il faut rajouter des extrémités… comme ça ça compte aussi le nombre
// de sst, de raccordements etc. pour le tableau de chiffrage » ; « à partir du traceur pouvoir entourer des zones… deux lignes = zone 1, une autre zone 2, et ça remplit
// les bonnes quantités dans chaque zone : purges, vidanges, sst, soudures… Et quand c'est des quantités globales importées, un système pour répartir les soudures et ml
// selon plusieurs zones lors de l'importation des quantités ».
// · Quantités (puce d'un tracé) : extrémités par type × DN, purges et vidanges ; puis tranches (ferme, option n) et zones dessinées dans le traceur ;
//   « → Créer les zones du chiffrage depuis le tracé » (une zone par zone dessinée), « → Une zone par tranche » — jamais de doublon (remplacer / ajouter / annuler) ;
//   chaque zone garde son lien (z.qt = {site, kind:'zone'|'tranche', ref, nom}) → « ↻ Reprendre les quantités du tracé » dans la zone ;
// · référence prise sur un tracé : purges, vidanges, extrémités gardées avec la référence (a.quantites.pv / ext / kits) → « Préremplir » les met dans la zone de lecture ;
// · « ⇶ Répartir sur plusieurs zones » : quantités de référence GLOBALES → N zones (clé % ou ml par DN), plus fort reste, totaux conservés ; l'étude importée ne bouge pas.
// Le calcul : qtrace.js (quantités d'un tracé), qfill.js (remplir une zone, répartir) — fonctions pures, testées dans Node (test/qtrace_test.mjs).
import {affGet,affSet} from './affaires.js';
import {prixBase,etudesOf,fullEtude,chiffrageState} from './chiffrage.js';
import {emptyEtude,revOf} from './prix.js';
import {END_TYPES,END_GROUPS,endLabel,trancheLabel,extCount,pvOf} from './qtrace.js';
import {qOfTrace,qOfRef,fillZone,splitQ,hasCounts} from './qfill.js';
let A=null;export function initQz(api){A=api;}
const esc=s=>String(s??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const nb=(x,d)=>{x=+x||0;return x.toLocaleString('fr-FR',{maximumFractionDigits:d===undefined?0:d});};
const num=v=>v===null||v===undefined||v===''?0:(isFinite(+v)?+v:0);
const key=s=>String(s||'').trim().toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g,'');
const dFR=x=>x?new Date(x).toLocaleDateString('fr-FR'):'';
const say=t=>{if(A&&A.toast)A.toast(t);};
const CSS_Q=`.qz-blk{margin-top:10px}.qz-blk>.eq-lab{margin-top:6px}
table.rc.qz-ext th,table.rc.qz-ext td{text-align:left;white-space:normal;vertical-align:top}table.rc.qz-ext th:last-child,table.rc.qz-ext td:last-child{text-align:right}table.rc.qz-ext td:nth-child(2){width:62%}.qz-ext td:first-child{min-width:110px}.qz-ext small.qz-g{display:block;color:var(--muted);font-size:10.5px;text-transform:uppercase;letter-spacing:.03em}
.qz-dns{display:flex;flex-wrap:wrap;gap:3px 5px}.qz-dn{display:inline-block;white-space:nowrap;padding:1px 7px;border-radius:9px;border:1px solid var(--line);font-size:12px;background:#f7f5f2}
.qz-sub{border:1px solid var(--line);border-radius:8px;padding:2px 8px;margin:6px 0;background:#fff}.qz-sub>summary{cursor:pointer;min-height:38px;display:flex;align-items:center;flex-wrap:wrap;gap:2px 10px;font-size:13px;list-style:none}
.qz-sub>summary::-webkit-details-marker{display:none}.qz-sub>summary:before{content:'▸';color:var(--muted)}.qz-sub[open]>summary:before{content:'▾'}.qz-sub>summary .dim{font-size:12px}.qz-sub .qz-in{padding:0 0 6px}
.qz-acts{display:flex;flex-wrap:wrap;gap:6px;margin-top:6px}.qz-acts .btn{min-height:38px;height:auto;white-space:normal;text-align:left}
.qz-zb{border:1px dashed #1f6fd0;background:#eef4fc;color:#173f73;border-radius:8px;padding:6px 10px;margin:0 0 8px;font-size:12.5px;display:flex;flex-wrap:wrap;gap:4px 10px;align-items:center}.qz-zb .btn{min-height:36px}
.qz-zb .qz-w{flex-basis:100%;color:#7a3d00}.qz-ref{margin-top:8px;font-size:12.5px}.qz-rtag{display:block;font-size:11px;color:var(--muted);margin-top:2px}.qz-rtag.bad{color:#9b2c22;font-weight:600}
#modal .qz-m .row2{display:flex;flex-wrap:wrap;gap:6px;align-items:flex-end}#modal .qz-m .row2>div{flex:1 1 120px;min-width:0}#modal .qz-m input.f{min-height:38px}
#modal .qz-zr{border:1px solid var(--line);border-radius:8px;padding:6px 8px;margin:6px 0}#modal .qz-zr .qz-mls{display:flex;flex-wrap:wrap;gap:4px 8px;margin-top:4px}#modal .qz-zr .qz-mls label{display:flex;align-items:center;gap:4px;font-size:12px}
#modal .qz-zr .qz-mls input{width:86px}#modal .qz-opt{display:flex;flex-wrap:wrap;gap:4px 12px;margin:6px 0}#modal .qz-opt label{display:flex;align-items:center;gap:6px;min-height:34px;font-size:13px}
#eq-app .ch-pdrow>td{white-space:normal}#modal .qz-prev{overflow:auto;margin-top:6px}#modal .qz-prev table{width:100%}#modal .qz-chk{display:flex;gap:8px;align-items:flex-start;font-size:13px;min-height:34px;margin:8px 0;cursor:pointer}#modal .qz-chk input{width:20px;height:20px;flex:0 0 auto;margin:1px 0 0}`;
function cssQ(){if(typeof document==='undefined'||document.getElementById('css-lot-q'))return;const s=document.createElement('style');s.id='css-lot-q';s.textContent=CSS_Q;document.head.appendChild(s);}
const dnChips=D=>{const L=Object.keys(D||{}).map(Number).filter(d=>num(D[d])>0).sort((a,b)=>b-a);return L.length?`<span class="qz-dns">${L.map(d=>`<span class="qz-dn">DN ${d} × ${nb(D[d])}</span>`).join('')}</span>`:'';};
const sumD=D=>Object.values(D||{}).reduce((s,x)=>s+num(x),0);
/* le tableau « extrémités et piquages » : type × DN (groupes du contrat C1), puis purges et vidanges (paires, au DN de la branche) */
export function qzExtHTML(ext,rows,opts){opts=opts||{};const E=ext||{};const P=pvOf(rows,'purges'),V=pvOf(rows,'vidanges');const known=END_TYPES.map(t=>t[0]);
  const types=END_TYPES.filter(t=>sumD(E[t[0]])).concat(Object.keys(E).filter(t=>!known.includes(t)&&sumD(E[t])).map(t=>[t,t,'']));
  if(!types.length&&!sumD(P)&&!sumD(V))return opts.empty?`<div class="eq-s">${opts.empty}</div>`:'';
  let g0='';const tr=types.map(([k,l,g])=>{const gl=g&&g!==g0?`<small class="qz-g">${esc(END_GROUPS[g]||'')}</small>`:'';g0=g;return `<tr data-qzext="${esc(k)}"><td>${gl}${esc(l)}</td><td>${dnChips(E[k])}</td><td class="num"><b>${nb(sumD(E[k]))}</b></td></tr>`;}).join('');
  const pv=[['purges','Purges',P],['vidanges','Vidanges',V]].filter(x=>sumD(x[2])).map(([k,l,D],i)=>`<tr data-qzext="${k}"><td>${i===0||!sumD(P)?'<small class="qz-g">Piquages (tés verticaux)</small>':''}${l} <small class="dim">(paires)</small></td><td>${dnChips(D)}</td><td class="num"><b>${nb(sumD(D))}</b></td></tr>`).join('');
  return `<div style="overflow:auto"><table class="rc af-tab ch-tab qz-ext${opts.cls?' '+opts.cls:''}"><tr><th>Extrémité / piquage</th><th>Par DN</th><th>Total</th></tr>${tr}${pv}</table></div>`;}
/* un tableau DN compact (tranche, zone) — PAS la classe .cm-qst (celle du tableau principal) */
function subTable(q){const R=(q.rows||[]).filter(r=>num(r.soud)||num(r.mlTr));if(!R.length)return '<div class="eq-s">Pas de soudure ni de linéaire.</div>';const T=q.tot||{};
  const K=[['soud','Soudures',0],['mlTr','ml de tranchée',1],['mlTube','ml de tube',1],['barres','Barres',0],['coudes','Coudes',0],['tes','Tés',0],['vannes','Vannes',0],['kits','Kits FDL',0]];
  return `<div style="overflow:auto"><table class="rc af-tab ch-tab qz-qt"><tr><th>DN</th>${K.map(k=>`<th>${k[1]}</th>`).join('')}</tr>${R.map(r=>`<tr><td>DN ${r.dn}</td>${K.map(([k,,d])=>`<td class="num">${k==='soud'||k==='mlTr'?'<b>'+nb(r[k],d)+'</b>':nb(r[k],d)}</td>`).join('')}</tr>`).join('')}<tr class="tot"><td>Total</td>${K.map(([k,,d])=>`<td class="num">${nb(T[k],d)}</td>`).join('')}</tr></table></div>`;}
const partSum=q=>{const T=q.tot||{};const n=extCount(q.ext);const p=num(T.purges),v=num(T.vidanges);return `<b>${nb(T.soud)}</b> soudures · <b>${nb(T.mlTr,1)}</b> ml${n?' · '+n+' extrémité'+(n>1?'s':''):''}${p?' · '+p+' purge'+(p>1?'s':''):''}${v?' · '+v+' vidange'+(v>1?'s':''):''}`;};
/* ═════════ QUANTITÉS : les blocs d'un tracé (après le tableau par DN) ═════════ */
export function qzTraceHTML(t,a,canEdit,ctx){if(!t||!t.full)return '';cssQ();const ro=!canEdit;
  const ext=qzExtHTML(t.ext,t.rows);let h=ext?`<div class="qz-blk" data-qz="ext"><div class="eq-lab">Extrémités, purges et vidanges <span class="hint">· par type et par DN (DN de la conduite au bout ; purges et vidanges : DN de la branche, à la paire aller + retour) — ce qui se chiffre en SST, raccordements, by-pass, fonds bombés, extrusions, purges, vidanges</span></div>${ext}</div>`:'';
  if(t.sum)return h+(h?'<div class="hint">Tranches et zones dessinées : sur la puce de chaque tracé.</div>':'');
  const T=t.byTranche;if(T&&Object.keys(T).length){const K=Object.keys(T);
    h+=`<div class="qz-blk" data-qz="tranches"><div class="eq-lab">Par tranche <span class="hint">· tranche ferme et options, choisies ligne par ligne dans le traceur</span></div>${K.map(k=>`<details class="qz-sub" data-qztr="${esc(k)}"><summary><b>${esc(trancheLabel(k))}</b> <span class="dim">${partSum(T[k])}</span></summary><div class="qz-in">${subTable(T[k])}${qzExtHTML(T[k].ext,T[k].rows)}</div></details>`).join('')}
      ${ro?'':`<div class="qz-acts"><button class="btn" data-act="af" data-v="qzmk|${esc(t.siteId)}|tranches" title="Une zone du chiffrage par tranche : tranche ferme, option 1… — remplie comme le préremplissage (soudures, ml, purges, vidanges, SST, raccordements…)">→ Une zone par tranche (${K.map(k=>esc(trancheLabel(k).replace(/^Tranche /,''))).join(', ')})</button></div>`}</div>`;}
  const Z=t.byZone;if(Z&&Z.length){const nz=Z.filter(z=>!z.hors).length;
    h+=`<div class="qz-blk" data-qz="zones"><div class="eq-lab">Zones dessinées dans le traceur <span class="hint">· ${nz} zone${nz>1?'s':''}${Z.some(z=>z.hors)?' + les lignes hors zone':''}</span></div>${Z.map(z=>`<details class="qz-sub" data-qzz="${esc(z.id)}"><summary><b>${esc(z.nom)}</b> <span class="dim">${z.lines.length} ligne${z.lines.length>1?'s':''} · ${partSum(z)}</span></summary><div class="qz-in">${subTable(z)}${qzExtHTML(z.ext,z.rows)}</div></details>`).join('')}
      ${ro?'':`<div class="qz-acts"><button class="btn primary" data-act="af" data-v="qzmk|${esc(t.siteId)}|zones" title="Une zone du chiffrage par zone dessinée (même nom), remplie avec ses quantités : soudures et ml par DN, purges, vidanges, SST, raccordements, by-pass, fonds bombés, extrusions">→ Créer les zones du chiffrage depuis le tracé</button></div>`}</div>`;}
  return h;}
/* les comptages d'un tracé gardés avec la référence (a.quantites.pv / ext / kits) */
export function qzRefExtra(t){if(!t||!t.full)return null;const pv={purges:pvOf(t.rows,'purges'),vidanges:pvOf(t.rows,'vidanges')};if(!sumD(pv.purges)&&!sumD(pv.vidanges)&&!extCount(t.ext))return null; /* ancien tracé sans extrémités ni purges : rien à garder */
  return {pv,ext:JSON.parse(JSON.stringify(t.ext||{})),kits:num((t.tot||{}).kits)};}
/* ═════════ CARTE DE RÉFÉRENCE : ce que le tracé a compté, et « Répartir » ═════════ */
export function qzRefHTML(a){const q=a.quantites||{};if(!q.pv&&!q.ext)return '';cssQ();const tbl=qzExtHTML(q.ext,Object.keys(Object.assign({},(q.pv||{}).purges,(q.pv||{}).vidanges)).map(dn=>({dn:+dn,purges:num(((q.pv||{}).purges||{})[dn]),vidanges:num(((q.pv||{}).vidanges||{})[dn])})));
  return tbl||num(q.kits)?`<div class="qz-ref" data-qz="ref"><div class="eq-lab">Comptés par le tracé, pris avec la référence <span class="hint">· « Préremplir » les met aussi dans la zone : purges, vidanges, sous-stations, raccordements, by-pass, fonds bombés, extrusions${num(q.kits)?' — '+nb(q.kits)+' kits fin de ligne (pas de prix dans la base : affichés dans la zone)':''}</span></div>${tbl}</div>`:'';}
export function qzSplitBtn(a,canEdit){if(!canEdit)return '';const n=((a.quantites||{}).rows||[]).filter(r=>+r.dn&&(+r.soud||+r.ml)).length;return `<button class="btn" data-act="af" data-v="qzsplit|" ${n?'':'disabled'} title="Les quantités de référence (globales : étude fournisseur, saisie, tracé sans zones) réparties sur plusieurs zones du chiffrage — clé en % ou ml par DN, totaux conservés">⇶ Répartir sur plusieurs zones</button>`;}
/* ═════════ ÉCRITURE DES ZONES ═════════ */
const nowIso=()=>new Date().toISOString();
const isLecture=z=>!!(z&&(z.source==='quantites'||z.fromPoints));
/* specs = [{nom, Q, link?, rep?, source}] ; mode 'replace' (les zones du même nom reprennent les quantités, leurs réglages gardés) | 'add' (nom suffixé « (2) ») */
function writeZones(a,specs,mode,dropLecture){const base=prixBase();const cur=affGet(a.num)||a;const ch=Object.assign({},cur.chiffrage||{});let E=(ch.etudes||[]).map(z=>JSON.parse(JSON.stringify(z)));
  if(dropLecture)E=E.filter(z=>!isLecture(z));const taken=new Set(E.map(z=>key(z.nom)));const out={made:0,upd:0,warn:[],first:-1};
  specs.forEach(sp=>{let i=mode==='replace'?E.findIndex(z=>key(z.nom)===key(sp.nom)):-1;let z;
    if(i>=0)z=fullEtude(E[i]);else{let nom=sp.nom;if(taken.has(key(nom))){let k=2;while(taken.has(key(nom+' ('+k+')')))k++;nom=nom+' ('+k+')';}taken.add(key(nom));z=emptyEtude(nom);}
    const r=fillZone(z,sp.Q,base,{dn:true});if(sp.link)z.qt=Object.assign({},sp.link,{at:nowIso(),by:A&&A.userName?A.userName():''});if(sp.rep)z.rep=sp.rep;if(sp.source)z.source=sp.source;
    if(i>=0){E[i]=z;out.upd++;}else{E.push(z);i=E.length-1;out.made++;}if(out.first<0)out.first=i;r.warn.forEach(w=>out.warn.push(z.nom+' : '+w));});
  ch.etudes=E;if(!ch.baseRev&&base){const rv=revOf(base);if(rv)ch.baseRev=rv;} /* comme chiffrage.js : le dossier fixe sa révision de base au 1er enregistrement */
  affSet(a.num,{chiffrage:ch});return out;}
/* demander « remplacer / ajouter / annuler » s'il y a des zones du même nom ; proposer de retirer la zone de lecture (sinon ses quantités comptent deux fois) */
function confirmZones(a,specs,ctx,what,preDrop){const E=etudesOf(affGet(a.num)||a);const dup=specs.filter(sp=>E.some(z=>key(z.nom)===key(sp.nom))).map(sp=>sp.nom);const lect=preDrop===undefined?E.find(isLecture):null; /* preDrop : déjà choisi (fenêtre de répartition) */
  const go=(mode,drop)=>{const o=writeZones(a,specs,mode,drop);if(A&&A.closeModal)A.closeModal();const CS=chiffrageState();CS.view='etude';CS.ei=Math.max(0,o.first);if(A&&A.goTab)A.goTab('chiffrage');if(ctx&&ctx.render)ctx.render();
    say((o.made?o.made+' zone'+(o.made>1?'s':'')+' créée'+(o.made>1?'s':''):'')+(o.made&&o.upd?' · ':'')+(o.upd?o.upd+' zone'+(o.upd>1?'s':'')+' mise'+(o.upd>1?'s':'')+' à jour':'')+' — '+what+(o.warn.length?' · '+o.warn.length+' point'+(o.warn.length>1?'s':'')+' à vérifier':''));
    if(o.warn.length&&A&&A.openModal)A.openModal(`<div class="qz-m"><h3 style="margin-top:0">Zones du chiffrage : à vérifier</h3><ul style="padding-left:18px;font-size:13px">${o.warn.map(w=>`<li>${esc(w)}</li>`).join('')}</ul><div class="actions"><button class="btn primary block" data-close>J'ai compris</button></div></div>`);};
  if(!dup.length&&!lect){go('add',!!preDrop);return;}
  A.openModal(`<div class="qz-m"><h3 style="margin-top:0">${esc(what)}</h3><div style="font-size:13px">${specs.length} zone${specs.length>1?'s':''} : ${specs.map(s=>'<b>'+esc(s.nom)+'</b>').join(', ')}.</div>
    ${dup.length?`<div class="warnbox" style="margin-top:6px">Le chiffrage a déjà ${dup.length>1?'des zones':'une zone'} « ${dup.map(esc).join(' », « ')} ». <b>Remplacer</b> : ${dup.length>1?'elles reprennent':'elle reprend'} ces quantités (dates, équipes, contrôles gardés). <b>Ajouter</b> : nouvelles zones à côté (nom suivi de « (2) »).</div>`:''}
    ${lect?`<label class="qz-chk"><input type="checkbox" id="qz-drop" checked><span>Retirer la zone de lecture « ${esc(lect.nom||'')} » (sinon ses quantités s'ajoutent à celles des nouvelles zones)</span></label>`:''}
    <div class="actions" style="margin-top:8px">${dup.length?`<button class="btn primary block" id="qz-rep">Remplacer</button><button class="btn block" id="qz-add">Ajouter</button>`:`<button class="btn primary block" id="qz-add">Créer ${specs.length>1?'les '+specs.length+' zones':'la zone'}</button>`}<button class="btn block" data-close>Annuler</button></div></div>`);
  const drop=()=>{if(preDrop!==undefined)return !!preDrop;const c=document.getElementById('qz-drop');return !!(c&&c.checked);};const b1=document.getElementById('qz-rep'),b2=document.getElementById('qz-add');if(b1)b1.onclick=()=>go('replace',drop());if(b2)b2.onclick=()=>go('add',drop());}
/* ═════════ RÉPARTIR SUR N ZONES (2c) ═════════ */
function splitModal(a,ctx){const q=a.quantites||{};const Q=qOfRef(q);if(!Q.rows.length){say('Renseigne d\'abord les quantités de référence (DN, soudures, ml)');return;}if(!prixBase()){say('Importe d\'abord la base de prix (onglet Chiffrage)');return;}
  const lect=etudesOf(a).find(isLecture);const S={n:2,mode:'pct',noms:[],pct:[],ml:[],others:'prorata'};const dns=Q.rows.map(r=>r.dn);const hasO=hasCounts(Q);
  const eqPct=n=>{const b=Math.floor(1000/n)/10;return Array.from({length:n},(_,i)=>i<n-1?b:Math.round((100-b*(n-1))*10)/10);};
  const read=()=>{const g=id=>document.getElementById(id);if(!g('qz-n'))return;S.n=Math.max(2,Math.min(12,Math.round(num(g('qz-n').value))||2));const m=document.querySelector('#modal input[name=qz-mode]:checked');if(m)S.mode=m.value;const o=document.querySelector('#modal input[name=qz-oth]:checked');if(o)S.others=o.value;
    for(let i=0;i<12;i++){const x=g('qz-nom-'+i);if(x)S.noms[i]=x.value;const p=g('qz-pct-'+i);if(p)S.pct[i]=p.value;dns.forEach(dn=>{const y=g('qz-ml-'+i+'-'+dn);if(y){S.ml[i]=S.ml[i]||{};S.ml[i][dn]=y.value;}});}};
  const keys=()=>S.mode==='ml'?{mode:'ml',ml:Array.from({length:S.n},(_,i)=>{const o={};dns.forEach(dn=>{o[dn]=num((S.ml[i]||{})[dn]);});return o;})}:{mode:'pct',pct:Array.from({length:S.n},(_,i)=>num(S.pct[i]))};
  const names=()=>Array.from({length:S.n},(_,i)=>String(S.noms[i]||'').trim()||'Zone '+(i+1));
  const prev=()=>{const P=splitQ(Q,keys(),{others:S.others});const N=names();const sm=(o,k)=>(o.rows||[]).reduce((s,r)=>s+num(r[k]),0);
    return `<table class="rc af-tab ch-tab"><tr><th>Zone</th><th>Soudures</th><th>ml</th>${hasO?'<th>Purges · SST · racc.</th>':''}</tr>${P.map((o,i)=>`<tr><td>${esc(N[i])}</td><td class="num">${nb(sm(o,'soud'))}</td><td class="num">${nb(sm(o,'ml'),1)}</td>${hasO?`<td class="num">${nb(sumD((o.pv||{}).purges))} · ${nb(sumD((o.ext||{}).sousstation))} · ${nb(['pec','insertion','attente','chaufferie','attente_chaufferie'].reduce((s,k)=>s+sumD((o.ext||{})[k]),0))}</td>`:''}</tr>`).join('')}<tr class="tot"><td>Total</td><td class="num">${nb(Q.rows.reduce((s,r)=>s+r.soud,0))}</td><td class="num">${nb(Q.rows.reduce((s,r)=>s+r.ml,0),1)}</td>${hasO?'<td></td>':''}</tr></table>`;};
  const rd=()=>{if(!S.pct.length||S.pct.length!==S.n)S.pct=eqPct(S.n);
    A.openModal(`<div class="qz-m"><h3 style="margin-top:0">⇶ Répartir sur ${S.n} zones</h3><div class="hint" style="margin-top:0">Les quantités de référence${q.src&&q.src.nom?' (« '+esc(q.src.nom)+' »)':''} : ${Q.rows.length} DN, ${nb(Q.rows.reduce((s,r)=>s+r.soud,0))} soudures, ${nb(Q.rows.reduce((s,r)=>s+r.ml,0),1)} ml. Soudures et ml de chaque DN répartis au prorata (soudures entières, totaux conservés : plus forts restes). L'étude importée n'est pas modifiée.</div>
      <div class="row2" style="margin-top:6px"><div><label class="f">Nombre de zones</label><input class="f" type="number" id="qz-n" min="2" max="12" value="${S.n}"></div><div><label class="f">Clé de répartition</label><div class="qz-opt"><label><input type="radio" name="qz-mode" value="pct" ${S.mode==='pct'?'checked':''}> en %</label><label><input type="radio" name="qz-mode" value="ml" ${S.mode==='ml'?'checked':''}> ml par DN</label></div></div></div>
      ${Array.from({length:S.n},(_,i)=>`<div class="qz-zr"><div class="row2"><div><label class="f">Zone ${i+1} · nom</label><input class="f" id="qz-nom-${i}" value="${esc(S.noms[i]||'Zone '+(i+1))}"></div>${S.mode==='pct'?`<div style="flex:0 1 110px"><label class="f">%</label><input class="f" type="number" min="0" step="any" id="qz-pct-${i}" value="${esc(S.pct[i])}"></div>`:''}</div>
        ${S.mode==='ml'?`<div class="qz-mls">${dns.map(dn=>`<label>DN ${dn} <input class="f" type="number" min="0" step="any" id="qz-ml-${i}-${dn}" value="${esc((S.ml[i]||{})[dn]??'')}" placeholder="ml"></label>`).join('')}</div>`:''}</div>`).join('')}
      ${hasO?`<div class="eq-lab">Purges, vidanges, SST, raccordements… (comptés par le tracé)</div><div class="qz-opt"><label><input type="radio" name="qz-oth" value="prorata" ${S.others==='prorata'?'checked':''}> au prorata (arrondi, total gardé)</label><label><input type="radio" name="qz-oth" value="z1" ${S.others==='z1'?'checked':''}> tous dans la zone 1</label></div>`:''}
      ${lect?`<label class="qz-chk"><input type="checkbox" id="qz-drop" checked><span>Retirer la zone de lecture « ${esc(lect.nom||'')} » (sinon ces quantités comptent deux fois)</span></label>`:''}
      <div class="qz-prev" id="qz-prev">${prev()}</div>
      <div class="actions" style="margin-top:8px"><button class="btn primary block" id="qz-ok">Créer les ${S.n} zones</button><button class="btn block" data-close>Annuler</button></div></div>`);
    const M=document.getElementById('modal');const upd=()=>{read();const p=document.getElementById('qz-prev');if(p)p.innerHTML=prev();};
    M.querySelectorAll('input').forEach(el=>{if(el.id==='qz-n'||el.name==='qz-mode'){el.addEventListener('change',()=>{read();rd();});}else el.addEventListener('input',upd);if(el.name==='qz-oth')el.addEventListener('change',upd);});
    document.getElementById('qz-ok').onclick=()=>{read();const drop=!!(document.getElementById('qz-drop')||{}).checked;const P=splitQ(Q,keys(),{others:S.others});const N=names();const src=q.src&&q.src.nom?q.src.nom:'quantités saisies';
      const specs=P.map((o,i)=>({nom:N[i],Q:Object.assign(o,hasO?{}:{pv:undefined,ext:undefined}),rep:{i:i+1,n:S.n,cle:S.mode,src,at:nowIso()},source:'répartition'}));
      confirmZones(a,specs,ctx,'Répartition de « '+src+' » sur '+S.n+' zones',drop);};}; /* noms déjà pris → remplacer / ajouter / annuler ; sinon créées tout de suite */
  rd();}
/* ═════════ ACTIONS (data-v="qz…", appelées par qsetsAct) ═════════ */
function siteName(ctx,id){const s=((ctx&&ctx.sites)||[]).find(x=>x.id===id);return (s&&s.name)||id;}
export function qzAct(k,arg,arg2,ctx){const a=A&&A.cur?A.cur():null;if(!a)return true;const canEdit=!!(ctx&&ctx.canEdit);
  switch(k){
    case 'qzmk':{if(!canEdit)return true;if(!prixBase()){say('Importe d\'abord la base de prix (onglet Chiffrage)');return true;}let q=null;try{q=ctx.traceQty?ctx.traceQty(arg):null;}catch(e){q=null;}if(!q||!q.rows){say('Tracé illisible sur cet appareil (ouvre-le une fois)');return true;}
      const nom=siteName(ctx,arg);let specs=[];
      if(arg2==='tranches'){const T=q.byTranche||{};specs=Object.keys(T).map(t=>({nom:trancheLabel(t),Q:qOfTrace(T[t]),link:{site:arg,trace:nom,kind:'tranche',ref:t,nom:trancheLabel(t)},source:'tracé'}));}
      else{const Z=(q.byZone||[]).filter(z=>(z.rows||[]).length||extCount(z.ext));specs=Z.map(z=>({nom:z.nom,Q:qOfTrace(z),link:{site:arg,trace:nom,kind:'zone',ref:z.id,nom:z.nom},source:'tracé'}));}
      if(!specs.length){say(arg2==='tranches'?'Pas d\'option dans ce tracé : une seule tranche':'Pas de zone dessinée dans ce tracé (traceur → Zones)');return true;}
      confirmZones(a,specs,ctx,arg2==='tranches'?'Une zone par tranche · '+nom:'Zones du chiffrage depuis le tracé « '+nom+' »');return true;}
    case 'qzsplit':{if(!canEdit)return true;splitModal(a,ctx);return true;}
    case 'qzre':{if(!canEdit)return true;const base=prixBase();const cur=affGet(a.num)||a;const E=etudesOf(cur);const i=E.findIndex(z=>z.id===arg);const z0=E[i];if(!z0||!z0.qt)return true;
      let q=null;try{q=ctx.traceQty?ctx.traceQty(z0.qt.site):null;}catch(e){q=null;}if(!q||!q.rows){say('Tracé illisible sur cet appareil (ouvre-le une fois)');return true;}
      const L=z0.qt;const part=L.kind==='zone'?(q.byZone||[]).find(x=>x.id===L.ref):L.kind==='tranche'?(q.byTranche?q.byTranche[L.ref]:(L.ref==='ferme'?q:null)):q; /* plus d'option au tracé : la tranche ferme = tout le tracé */
      if(!part){say((L.kind==='zone'?'La zone':'La tranche')+' « '+(L.nom||L.ref)+' » n\'existe plus dans le tracé');return true;}
      const ch=Object.assign({},cur.chiffrage||{});ch.etudes=(ch.etudes||[]).map(z=>JSON.parse(JSON.stringify(z)));const z=fullEtude(ch.etudes[i]);const r=fillZone(z,qOfTrace(part),base,{dn:true});z.qt=Object.assign({},L,{at:nowIso()});ch.etudes[i]=z;
      if(!ch.baseRev&&base){const rv=revOf(base);if(rv)ch.baseRev=rv;}affSet(a.num,{chiffrage:ch});if(ctx.render)ctx.render();say('↻ Quantités reprises du tracé : '+r.notes.join(' · ')+(r.warn.length?' — à vérifier : '+r.warn.join(' ; '):''));return true;}}
  return true;}
/* « → Préremplir le chiffrage » (commerce.js) : la zone de lecture reçoit aussi ce que le tracé a compté, si la référence vient d'un tracé */
export function qzPrefill(num0,zi){const a=affGet(num0);const base=prixBase();if(!a||!base)return '';const Q=qOfRef(a.quantites||{});if(!hasCounts(Q))return '';
  const ch=Object.assign({},a.chiffrage||{});ch.etudes=(ch.etudes||[]).map(z=>JSON.parse(JSON.stringify(z)));if(!ch.etudes[zi])return '';const z=fullEtude(ch.etudes[zi]);const r=fillZone(z,Q,base,{dn:false});ch.etudes[zi]=z;affSet(num0,{chiffrage:ch});
  if(r.warn.length&&A&&A.openModal)setTimeout(()=>A.openModal(`<div class="qz-m"><h3 style="margin-top:0">Zone de lecture : à vérifier</h3><ul style="padding-left:18px;font-size:13px">${r.warn.map(w=>`<li>${esc(w)}</li>`).join('')}</ul><div class="actions"><button class="btn primary block" data-close>J'ai compris</button></div></div>`),60);
  return r.notes.length?' · '+r.notes.join(' · ')+(r.warn.length?' (à vérifier : '+r.warn.length+')':''):'';}
/* ═════════ CHIFFRAGE : le bandeau d'une zone venue du tracé ou d'une répartition ═════════ */
export function qzZoneBanner(a,z,ei,canEdit){cssQ(); /* aussi : le détail d'un panier déplié sous une ligne SST / raccordement passe à la ligne (le tableau ne s'élargit plus) */if(!z||(!z.qt&&!z.qtInfo&&!z.rep))return '';const L=z.qt,I=z.qtInfo||{},R=z.rep;const parts=[];
  if(L)parts.push(`<span>📐 Quantités du tracé <b>« ${esc(L.trace||L.site)} »</b> · ${L.kind==='tranche'?'tranche':L.kind==='zone'?'zone':'tout le tracé'} <b>« ${esc(L.nom||L.ref||'')} »</b>${L.at?' · reprises le '+dFR(L.at):''}</span>${canEdit?`<button class="btn sm" data-act="af" data-v="qzre|${esc(z.id)}" title="Relire le tracé et remettre ses quantités dans cette zone : soudures, ml, purges, vidanges, SST, raccordements… (les lignes saisies à la main et les réglages de la zone sont gardés)">↻ Reprendre les quantités du tracé</button>`:''}`);
  else if(I.at&&!R)parts.push(`<span>📐 Purges, vidanges, SST, raccordements… repris du tracé avec les quantités de référence${I.at?' le '+dFR(I.at):''}</span>`);
  if(R)parts.push(`<span>⇶ Zone ${R.i} / ${R.n} de la répartition de <b>« ${esc(R.src||'')} »</b> · clé ${R.cle==='ml'?'ml par DN':'en %'}</span>`);
  const nr=[];if(I.kits&&(I.kits.bouts||I.kits.kits))nr.push(`${I.kits.kits?nb(I.kits.kits)+' kits fin de ligne':''}${I.kits.bouts?' ('+nb(I.kits.bouts)+' bout'+(I.kits.bouts>1?'s':'')+' de ligne)':''}`);if(I.provisoire)nr.push(nb(sumD(I.provisoire))+' fin'+(sumD(I.provisoire)>1?'s':'')+' provisoire'+(sumD(I.provisoire)>1?'s':'')+' à reprendre');
  if(nr.length)parts.push(`<span class="dim">Pas de prix dans la base, à chiffrer à part si besoin : ${nr.join(' · ')}</span>`);
  const todo=(z.racc||[]).filter(x=>x&&x.qk&&!x.type);if(todo.length)parts.push(`<span class="qz-w">⚠ ${todo.length} raccordement${todo.length>1?'s':''} (${[...new Set(todo.map(x=>endLabel(x.qk)))].join(', ')}) : type à choisir dans « Raccordement sur existant »</span>`);
  return `<div class="qz-zb" data-qzzb="${esc(z.id||'')}">${parts.join('')}</div>`;}
/* une ligne de raccordement / SST venue du tracé : son origine (et « type à choisir ») */
export function qzRowTag(x){if(!x||!x.qk)return '';return `<small class="qz-rtag${x.type?'':' bad'}">${x.type?'du tracé : '+esc(endLabel(x.qk)):'⚠ type à choisir ('+esc(endLabel(x.qk))+')'}</small>`;}
