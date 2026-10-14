// paniersp.js — 14/10 nuit (lot P) : les ÉCRANS des outils de paniers de la base de prix (Ethan retravaille les paniers de SA base, registre « prix/base ») :
// · « ⧉ Copier vers d'autres paniers » (fiche d'un panier, 🧺 Paniers) : fenêtre (destinataires, ce qui est copié, aperçu panier × DN avant → après), UN seul
//   enregistrement de la base (une révision), compte rendu, « ↶ Annuler la copie » tant que rien d'autre n'a bougé ;
// · bandeau « ⚠ N variantes : « quand l'équipe est » ≠ l'équipe choisie pour chiffrer » + « Corriger » (en tête de 🧺 Paniers et dans la fenêtre de copie) ;
// · valeurs modifiées EN JAUNE : Base de prix → « classeur : X » dessous (base.orig, « 🔍 Comparer au classeur ») ; zone → « base : X » (styles ci-dessous) ;
// · flèches ▲▼ d'un champ vide (= la base, en gris) : partent de la base ± le pas ; une valeur égale à la base redevient vide ; sélection au focus ;
// · Extrusion dans les paniers de prestation (par Ø de gaine : heures par type, équipe, amortissement, consommables).
// Logique pure : prixp.js. Branché par chiffrage.js (quelques appels) ; CSS injectée ici (<style id="css-lot-p">).
import {regGet,regSet,regAll} from './reg.js';
import {parsePrixWorkbook,revOf,allPaniers,panierOf,extrusionPrice} from './prix.js';
import {origOf,origRef,refDiffers,origDiffs,copyPlan,applyCopy,famOf,FAM_LAB,mvarIssues,mvarFix} from './prixp.js';
let A=null,D={};
const PS={copy:null,undo:null,res:null,saves:0};
const esc=s=>String(s??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const unesc=s=>String(s??'').replace(/&quot;/g,'"').replace(/&#39;/g,"'").replace(/&lt;/g,'<').replace(/&gt;/g,'>').replace(/&amp;/g,'&');
const nb=(x,d)=>{x=+x||0;return x.toLocaleString('fr-FR',{maximumFractionDigits:d===undefined?0:d,minimumFractionDigits:d===undefined?0:d});};
const fmtN=x=>(Math.round((+x||0)*100)/100).toLocaleString('fr-FR',{maximumFractionDigits:2});
const fmtV=v=>typeof v==='number'?v.toLocaleString('fr-FR',{maximumFractionDigits:4}):(v===null||v===undefined||v===''?'(vide)':String(v));
const dFR=x=>{if(!x)return '';const d=new Date(x);return isNaN(d)?String(x):d.toLocaleDateString('fr-FR');};
const clone=o=>JSON.parse(JSON.stringify(o));
const say=t=>{if(A&&A.toast)A.toast(t);};
const save=(b,ctx)=>{PS.saves++;return D.prixSave(b,ctx);}; /* tout enregistrement de la base fait ici (compté : la copie = UNE écriture) */
export function initPaniersP(api,deps){A=api;D=deps||{};if(typeof document!=='undefined'){cssP();keysP();} /* styles du jaune dès le démarrage (une zone peut s'ouvrir avant la base de prix) */
  if(typeof window!=='undefined')window.TRACE_P={saves:()=>PS.saves,undo:()=>!!PS.undo&&undoOk(),plan:(s,d,o)=>copyPlan(D.prixBase(),s,d,o),issues:o=>mvarIssues(D.prixBase(),o),diffs:()=>origDiffs(D.prixBase()).length}; /* tests */}
/* ═════════ CSS (injectée une fois : pas dans index.html) ═════════ */
const CSS_P=`
#eq-app .ch-tab input.ch-cadov,#eq-app input.ch-ov,#eq-app input.ch-clov,#eq-app select.ch-clov{background:#fff3a6;border-color:#d4ab00;color:#4a3b00;box-shadow:0 0 0 2px rgba(212,171,0,.22)}
#eq-app .ch-tab tr.ch-cadrow td{background:#fffbe3}
#eq-app .ch-cadb.ov,#eq-app small.ch-base,#eq-app small.ch-cl{display:block;font-size:10.5px;line-height:1.25;color:#7a5d00;margin:1px 0 0;white-space:nowrap;font-weight:600}
#eq-app .ch-tag.ov,#eq-app .ch-pdsum .eq-tag.warn,#eq-app td .eq-tag.warn[title*="modifié dans ce chiffrage"],#eq-app .eq-tag.warn[title^="Valeur écrasée"],#eq-app .eq-tag.warn[title^="Ligne ajoutée"]{background:#fff3a6;border-color:#e2c341;color:#6b5000}
#eq-app .ch-pair:has(> small.ch-base){flex-wrap:wrap}#eq-app .ch-pair > small.ch-base{flex-basis:100%;order:9}
#eq-app .pcl-help{border:1px dashed #d4ab00;background:#fffcea;border-radius:8px;padding:6px 10px;margin:0 0 8px;font-size:12.5px;color:var(--ink2)}
#eq-app .pcl-help.ok{border-style:solid;border-color:#ecdb93;background:#fffdf3}
#eq-app .pcl-sw{display:inline-block;background:#fff3a6;border:1px solid #d4ab00;border-radius:5px;padding:0 5px;font-weight:700;color:#4a3b00}
#eq-app .pcl-help .btn,#eq-app .pcp-tools .btn,#eq-app .pmv .btn,#eq-app .pcp-res .btn{min-height:36px;vertical-align:middle}
#eq-app .pcl-help .btn{margin-left:6px}
#eq-app .pmv{border:1px solid #e0b25c;background:#fff7e6;border-radius:10px;padding:8px 10px;margin:0 0 10px}
#eq-app .pmv h4,#pcp .pmv h4{margin:0 0 4px;font-size:13.5px;color:#7a3d00}
#eq-app .pmv ul,#pcp .pmv ul{margin:4px 0;padding-left:18px;font-size:12.5px}#eq-app .pmv li,#pcp .pmv li{margin:2px 0;overflow-wrap:anywhere}
#eq-app .pmv .pmv-cf,#pcp .pmv .pmv-cf{color:#9b2c22}
#eq-app .pcp-res{border:1px solid #b9dcc4;background:#eef7f0;border-radius:10px;padding:8px 10px;margin:0 0 10px;font-size:13px;overflow-wrap:anywhere}
#eq-app .pcp-res.undone{border-color:var(--line);background:#f4f3ee}
#eq-app .pcp-tools{margin:0 0 8px}
#eq-app .pcp-added{margin:0 0 8px}
#eq-app .pex table.ch-tab input.ch-n{width:62px;min-width:0}
#eq-app .pex table.ch-tab select.f{max-width:150px}
#eq-app .pex th{font-size:11.5px;text-align:center;white-space:normal}
.modal .box:has(#pcp){max-width:860px}
#pcp h3{margin:0 0 6px;font-size:16px;overflow-wrap:anywhere}
#pcp .eq-lab{margin-top:10px;font-weight:700;font-size:13px}
#pcp .pmv{border:1px solid #e0b25c;background:#fff7e6;border-radius:10px;padding:6px 10px;margin:6px 0}
#pcp .pmv .btn{min-height:36px}
#pcp .pcp-g{margin:4px 0 6px}#pcp .pcp-gh{font-size:12px;color:var(--muted);margin:4px 0 2px}
#pcp .pcp-gh .lnk{min-height:30px;padding:0 4px}
#pcp .pcp-ck{display:flex;align-items:center;gap:8px;min-height:36px;font-size:13px;cursor:pointer;padding:2px 0}
#pcp .pcp-ck input{width:20px;height:20px;flex:0 0 auto}
#pcp .pcp-ck span{min-width:0;overflow-wrap:anywhere}
#pcp .pcp-sum{font-size:12.5px;margin:4px 0;overflow-wrap:anywhere}
#pcp .pcp-prev{max-height:42vh;overflow:auto;border:1px solid var(--line);border-radius:8px;margin:4px 0 8px}
#pcp .pcp-prev table{font-size:12px;margin:0}#pcp .pcp-prev td{vertical-align:top}#pcp .pcp-prev tr.dim td{color:var(--muted)}
#pcp .pcp-prev th{position:sticky;top:0;background:var(--surface);z-index:1}
#pcp .actions{display:flex;flex-direction:column;gap:6px;margin-top:8px}#pcp .actions .btn{min-height:40px}
#pcp .dim{color:var(--muted)}
`;
export function cssP(){if(typeof document==='undefined'||document.getElementById('css-lot-p'))return;const s=document.createElement('style');s.id='css-lot-p';s.textContent=CSS_P;document.head.appendChild(s);}
/* ═════════ FLÈCHES ▲▼ ET SAISIE DES CHAMPS « VALEUR DE BASE » (data-bv = la base, data-bstep = le pas) — 14/10 nuit (lot P), Ethan : « quand on touche une flèche
   vers le haut ça met 0,5 : il faudrait que direct ça prenne la donnée de base et la monte de 0,5 ; plutôt de 1 en 1 pour les soudures par jour » ═════════
   Chromium : un pas (flèche du clavier ou du champ) envoie un « input » qui n'est PAS un InputEvent (la frappe en est un), puis « change ». Un champ vide part de 0 :
   on recalcule depuis la base (vide) ou la valeur d'avant, au pas du champ ; égal à la base → vide (pas de faux jaune) ; après le re-rendu, le champ garde le focus. */
function keysP(){if(keysP.on)return;keysP.on=true;const isBV=el=>!!(el&&el.tagName==='INPUT'&&el.type==='number'&&el.dataset&&el.dataset.bv!==undefined&&el.closest&&el.closest('#eq-app'));
  const same=(a,b)=>Math.abs(a-b)<1e-9||Math.round(a*100)===Math.round(b*100);
  const isNum=el=>!!(el&&el.tagName==='INPUT'&&el.type==='number'&&el.classList&&el.classList.contains('ch-in')&&el.closest&&el.closest('#eq-app')); /* les nombres du chiffrage et de la base de prix */
  document.addEventListener('focusin',e=>{const el=e.target;if(!isNum(el))return;const v0=el.__pv=el.value;setTimeout(()=>{try{if(document.activeElement===el&&el.value===v0)el.select();}catch(x){}},0);},true); /* taper remplace la valeur (sélection au focus, après le placement du curseur par le clic ; pas si la frappe a déjà commencé) */
  document.addEventListener('input',e=>{const el=e.target;if(!isBV(el))return;const step=e.isTrusted&&e.inputType===undefined&&!(typeof InputEvent!=='undefined'&&e instanceof InputEvent); /* un vrai pas du navigateur (pas la frappe, pas un évènement de script) */
    const pv=el.__pv!==undefined?el.__pv:el.defaultValue;const bs=el.step&&el.step!=='any'&&+el.step>0?+el.step:1; /* le pas que le navigateur vient d'appliquer */
    if(step){const bv=+el.dataset.bv;const st=+el.dataset.bstep||bs;const v=el.value===''?null:+el.value;
      let dir=0;if(pv===''){if(v!==null&&Math.abs(v-bs)<1e-9)dir=1;else if(v!==null&&v<=0&&v>=-bs-1e-9)dir=-1;}else if(v!==null&&isFinite(+pv)&&Math.abs(v-pv)<=bs+1e-9)dir=v>+pv?1:(v<+pv?-1:0);
      if(dir&&isFinite(bv)){const from=pv===''?bv:+pv;let nv=Math.round((from+dir*st)*1e6)/1e6;const mn=el.min!==''&&isFinite(+el.min)?+el.min:-Infinity;if(nv<mn)nv=mn;el.value=same(nv,bv)?'':String(nv);el.__step=true;}}
    el.__pv=el.value;},true);
  document.addEventListener('change',e=>{const el=e.target;if(!isBV(el))return;const bv=+el.dataset.bv;if(el.value!==''&&isFinite(bv)&&isFinite(+el.value)&&same(+el.value,bv))el.value=''; /* = la base → vide */
    if(el.__step){el.__step=false;const k=el.dataset.afx;if(k)setTimeout(()=>{try{const n=document.querySelector('#eq-app input[data-afx="'+(window.CSS&&CSS.escape?CSS.escape(k):k)+'"]');if(n&&n!==document.activeElement&&!n.disabled)n.focus({preventScroll:true});}catch(x){}},0);}},true);}
/* ═════════ BASE DE PRIX : VALEURS MODIFIÉES PAR RAPPORT AU CLASSEUR (jaune + « classeur : X ») ═════════ */
/* décore le HTML d'une vue de la base : chaque champ « b§… » ou « ov§… » qui a une valeur du classeur différente est en jaune, « classeur : X » dessous */
export function clDeco(base,html){if(!base||!base.orig||!html)return html;
  html=html.replace(/<input class="([^"]*)"([^>]*?) data-afx="((?:b|ov)§[^"]*)"([^>]*)>/g,(m,cls,a1,path,a2)=>{const p=unesc(path);const ref=origRef(base,p);if(ref===undefined)return m;const vm=/ value="([^"]*)"/.exec(a1+a2);const cur=vm?unesc(vm[1]):'';
    if(!refDiffers(cur,ref,p.startsWith('ov§')?2:6))return m;const t=fmtV(ref);return `<input class="${cls} ch-clov"${a1} data-afx="${path}"${a2.replace(/\s*$/,'')} title="Valeur du classeur : ${esc(t)}"><small class="ch-cl">classeur : ${esc(t)}</small>`;});
  html=html.replace(/<select class="([^"]*)" data-afx="((?:b|ov)§[^"]*)"([^>]*)>([\s\S]*?)<\/select>/g,(m,cls,path,a,inner)=>{const p=unesc(path);const ref=origRef(base,p);if(ref===undefined)return m;const sm=/<option value="([^"]*)" selected>/.exec(inner);const cur=sm?unesc(sm[1]):'';
    if(!refDiffers(cur,ref))return m;return `<select class="${cls} ch-clov" data-afx="${path}"${a}>${inner}</select><small class="ch-cl">classeur : ${esc(fmtV(ref))}</small>`;});
  return html;}
/* la ligne d'aide (sans référence) ou le résumé (avec) + « 🔍 Comparer au classeur » */
export function clHelpHTML(base,can){cssP();if(!base)return '';const O=base.orig;
  const btn=can?`<label class="btn sm pcl-btn" title="Relire un classeur (.xlsm) SANS rien changer aux prix : l'appli mémorise seulement ses valeurs pour montrer en jaune ce qui a été modifié depuis">🔍 ${O?'Comparer à un autre classeur':'Comparer au classeur'}<input type="file" accept=".xlsm,.xlsx" data-afx="pcmp" style="display:none"></label>`:'';
  if(!O)return `<div class="pcl-help">🔍 <b>Ce qui a été modifié par rapport au classeur</b> s'affiche <span class="pcl-sw">en jaune</span>, avec « classeur : X » dessous, dès que l'appli connaît le classeur de référence. Cette base n'a pas encore de classeur de référence (importée avant que l'appli mémorise ses valeurs) : « Comparer au classeur » relit ton fichier .xlsm et ne mémorise QUE ses valeurs — <b>aucun prix ne change</b>, rien d'autre n'est enregistré.${btn}</div>`;
  const L=origDiffs(base);const g={};L.forEach(x=>{g[x.g]=(g[x.g]||0)+1;});
  return `<div class="pcl-help ok"><span class="pcl-sw">en jaune</span> = différent du classeur de référence <b>${esc(O.src||'?')}</b>${O.version?' · '+esc(O.version):''}${O.foAt?' du '+dFR(O.foAt):''} (mémorisé le ${dFR(O.at)}) : <b>${L.length} valeur${L.length>1?'s':''} modifiée${L.length>1?'s':''}</b>${L.length?' — '+Object.keys(g).map(k=>esc(k)+' '+g[k]).join(' · '):''}.${btn}</div>`;}
/* « 🔍 Comparer au classeur » : le lecteur du classeur (le même qu'à l'import), RIEN n'est changé aux valeurs — seul base.orig est enregistré (la révision ne bouge pas) */
export async function pCompareFile(file,ctx){say('Lecture du classeur (comparaison : aucun prix ne change)…');
  try{const P=await parsePrixWorkbook(file,{name:file.name});delete P.op.blocks;const cur=D.prixBase();if(!cur){say('Pas de base de prix à comparer : importe d\'abord le classeur');return;}
    const b=clone(cur);b.orig=origOf(P,{name:file.name});save(b,ctx);const n=origDiffs(b).length;
    say('Classeur de référence : '+file.name+' — '+n+' valeur'+(n>1?'s':'')+' de la base différente'+(n>1?'s':'')+' du classeur (en jaune). Aucun prix n\'a changé.');if(ctx&&ctx.render)ctx.render();}
  catch(e){console.warn(e);say('Classeur illisible : '+(e&&e.message||e));}}
/* ═════════ 🧺 PANIERS : bandeaux en tête, outils de la fiche d'un panier ═════════ */
export function pTopHTML(base,can){cssP();return copyResHTML(can)+mvBannerHTML(base,can,null,false);}
/* bandeau de contrôle des variantes (tout, ou un panier) — dans la fenêtre de copie : liens en texte, bouton « Corriger » câblé par la fenêtre */
function mvBannerHTML(base,can,only,modal){const I=mvarIssues(base,only);if(!I.length)return '';const fix=I.filter(x=>x.kind==='fix'),chk=I.filter(x=>x.kind==='check'),cf=I.filter(x=>x.kind==='conflict');const n=fix.length+chk.length;
  const where=x=>modal?`${esc(x.title)} · DN ${x.dn}`:`<button class="lnk" data-act="af" data-v="chpgo|${esc(x.pid)}|${x.dn}" title="Ouvrir ce panier à ce DN">${esc(x.title)} · DN ${x.dn}</button>`;
  const li=[...fix.map(x=>`<li>${where(x)} : « quand l'équipe est <b>${esc(x.cond)}</b> » → équipe de la ligne <b>${esc(x.team)}</b></li>`),...chk.map(x=>`<li>${where(x)} : « quand l'équipe est <b>${esc(x.cond)}</b> » · lignes en <b>${esc(x.team)}</b> — <i>à vérifier</i> (${esc(x.why)}) : pas corrigé d'office</li>`),
    ...cf.map(x=>`<li class="pmv-cf">⚠ conflit · ${where(x)} : ${x.vis.length} variantes « quand l'équipe est <b>${esc(x.cond)}</b> » — seule la première compte ; change ou retire l'autre (on ne fusionne rien)</li>`)];
  const btn=can&&fix.length?(modal?`<button class="btn sm" id="pcp-fix">Corriger (${fix.length})</button>`:`<button class="btn sm" data-act="af" data-v="chpmvfix|${esc(only||'')}" title="La condition « quand l'équipe est » prend l'équipe de la ligne (variantes à une seule équipe)">Corriger (${fix.length})</button>`):'';
  const head=n?`⚠ ${n} variante${n>1?'s':''} : « quand l'équipe est » ≠ l'équipe choisie pour chiffrer`:`⚠ ${cf.length} conflit${cf.length>1?'s':''} de variantes`;
  return `<div class="pmv${modal?'':' card'}"><h4>${head}${n&&cf.length?' · '+cf.length+' conflit'+(cf.length>1?'s':''):''}</h4><div class="hint" style="margin:0">Une variante remplace la MO du panier quand l'équipe SOUDURE de la zone est celle de sa condition : la condition doit être l'équipe de ses lignes. Une variante à plusieurs équipes garde sa condition si c'est une de ses équipes, sinon elle est à vérifier.</div>
    ${li.length>6?`<details><summary>la liste (${li.length})</summary><ul>${li.join('')}</ul></details>`:`<ul>${li.join('')}</ul>`}${btn}</div>`;}
function copyResHTML(can){const R=PS.res;if(!R)return '';const ok=!R.undone&&!!PS.undo&&undoOk();
  return `<div class="pcp-res${R.undone?' undone':''}"><b>${R.undone?'↶ ':'✓ '}${esc(R.txt)}</b><div class="eq-acts" style="margin-top:6px">${ok&&can?`<button class="btn sm" data-act="af" data-v="chpundo|" title="Remettre la base d'avant la copie (tant que rien d'autre n'a été modifié)">↶ Annuler la copie</button>`:''}${!R.undone&&PS.undo&&!ok?'<span class="hint">Annulation plus possible : la base a été modifiée depuis la copie.</span>':''}<button class="btn sm" data-act="af" data-v="chpres|" title="Fermer ce compte rendu">✕</button></div></div>`;}
/* sur la fiche d'un panier : « ⧉ Copier vers d'autres paniers » ; un DN AJOUTÉ par une copie est signalé (fournitures à compléter) */
export function pPanToolsHTML(base,pan,dn,can){if(!pan)return '';const r=(pan.rows||[]).find(x=>x.dn===dn);const src=r&&r.added&&r.from?panierOf(base,r.from):null;
  const add=r&&r.added?`<div class="cm-ctrlv bad pcp-added">➕ DN ${dn} <b>ajouté par une copie</b>${src?' du panier « '+esc(src.title)+' »':''}${r.at?' le '+dFR(r.at):''} : il n'est pas dans le classeur. MO copiée ; <b>fournitures à vérifier ou compléter</b> — prix par la formule du panier quand la base a ce DN, sinon « ⚠ prix manquant » : saisis le PU ici.</div>`:'';
  return (can?`<div class="eq-acts pcp-tools"><button class="btn sm" data-act="af" data-v="chpcopy|${esc(pan.id)}" title="Copier les heures de MO par DN et les variantes d'équipe de ce panier vers d'autres paniers (les fournitures ne sont jamais copiées)">⧉ Copier vers d'autres paniers</button></div>`:'')+add;}
/* dans l'éditeur des variantes : la condition qui n'est pas l'équipe des lignes est signalée sur place */
export function pMvTag(base,pid,dn,vi){const x=mvarIssues(base,pid).find(i=>i.dn===+dn&&(i.vi===vi||(i.vis||[]).includes(vi)));if(!x)return '';
  return x.kind==='fix'?` <span class="eq-tag warn" title="La ligne est en ${esc(x.team)} : « Corriger » (en tête de 🧺 Paniers) met la condition à ${esc(x.team)}">⚠ ≠ équipe de la ligne (${esc(x.team)})</span>`:x.kind==='check'?` <span class="eq-tag warn" title="${esc(x.why)}">⚠ à vérifier</span>`:` <span class="eq-tag bad" title="Deux variantes de ce DN ont la même condition : seule la première compte">⚠ conflit</span>`;}
/* ═════════ FENÊTRE « ⧉ COPIER VERS D'AUTRES PANIERS » ═════════ */
const moTxt=L=>(L||[]).length?L.map(m=>`${esc(m.eq)} ${fmtN(m.h)} h`).join(' + '):'—';
const vTxt=V=>(V||[]).length?V.map(v=>`${esc(v.eq)} : ${(v.lignes||[]).map(l=>esc(l.eq||v.eq)+' '+fmtN(l.h)+' h').join(' + ')}`).join(' · '):'—';
const grp=L=>{const m={};(L||[]).forEach(x=>{(m[x.title]=m[x.title]||[]).push(x.dn);});return Object.keys(m).map(t=>t.replace(/^SST — |^RACCORDEMENT( — | SUR )?/,'')+' : DN '+m[t].join(', ')).join(' · ');};
function openCopy(pid,ctx){const base=D.prixBase();const S=base&&panierOf(base,pid);if(!S)return;cssP();const fam=famOf(pid);
  PS.copy={src:pid,ctx,dests:new Set(allPaniers(base).filter(p=>p.id!==pid&&fam!==pid&&famOf(p.id)===fam).map(p=>p.id)),mo:true,mv:true,add:false};
  A.openModal('<div class="pcp" id="pcp"></div>');drawCopy();}
function drawCopy(){const el=typeof document!=='undefined'&&document.getElementById('pcp');const C=PS.copy;if(!el||!C)return;const base=D.prixBase();const S=base&&panierOf(base,C.src);if(!S){el.innerHTML='<div class="eq-s">Panier introuvable.</div>';return;}
  const fam=famOf(C.src);const others=allPaniers(base).filter(p=>p.id!==C.src);const gOf=p=>['sst','racc','vid'].includes(famOf(p.id))?famOf(p.id):'autre';
  const plan=copyPlan(base,C.src,[...C.dests],{mo:C.mo,mv:C.mv,add:C.add});const nCh=plan?plan.items.filter(i=>i.chMo||i.chV).length:0;
  const groups=[['sst',FAM_LAB.sst],['racc',FAM_LAB.racc],['vid',FAM_LAB.vid],['autre','Autres paniers']].map(([g,lab])=>{const L=others.filter(p=>gOf(p)===g);if(!L.length)return '';
    return `<div class="pcp-g"><div class="pcp-gh">${esc(lab)}${g===fam?' <span class="ch-tag var">même famille</span>':''} · <button class="lnk" data-pcpall="${g}">tout cocher</button> · <button class="lnk" data-pcpnone="${g}">aucun</button></div>${L.map(p=>`<label class="pcp-ck"><input type="checkbox" name="pcp-dest" value="${esc(p.id)}"${C.dests.has(p.id)?' checked':''}><span>${esc(p.title)} <small class="dim">· ${p.rows.length} DN${p.virtual?' · bâti depuis le classeur (pas de DN ajouté)':''}</small></span></label>`).join('')}</div>`;}).join('');
  const arrow=(a,b,ch)=>ch?`${a} → <b>${b}</b>`:`${b} <small class="dim">(identique)</small>`;
  const prev=!plan?'':(!plan.items.length?`<div class="eq-s">Rien à copier : coche au moins un panier destinataire${plan.absent.length?' qui a des DN en commun (ou « ajouter les DN qui manquent »)':''}.</div>`:`<div class="pcp-prev"><table class="rc af-tab ch-tab"><tr><th>Panier</th><th>DN</th><th>MO · avant → après</th><th>Variantes · avant → après</th></tr>${plan.items.map(it=>`<tr class="${it.chMo||it.chV||it.add?'':'dim'}"><td>${esc(it.title)}</td><td>DN ${it.dn}${it.add?' <span class="ch-tag miss">ajouté</span>':''}</td><td>${C.mo||it.add?arrow(moTxt(it.moB),moTxt(it.moA),it.chMo):moTxt(it.moB)+' <small class="dim">(pas copiée)</small>'}</td><td>${C.mv?arrow(vTxt(it.vB),vTxt(it.vA),it.chV):vTxt(it.vB)+' <small class="dim">(pas copiées)</small>'}</td></tr>`).join('')}</table></div>`);
  const sum=plan?`<div class="pcp-sum"><b>${plan.nP} panier${plan.nP>1?'s':''} · ${plan.nDn} DN · ${plan.nV} variante${plan.nV>1?'s':''}</b>${plan.items.length?` <span class="dim">(${nCh} DN changent)</span>`:''}${plan.absent.length?`<div>DN absents des destinataires (pas copiés) : ${esc(grp(plan.absent))}</div>`:''}${plan.added.length?`<div>DN ajoutés (MO seule, fournitures à compléter — signalées) : ${esc(grp(plan.added))}</div>`:''}</div>`:'';
  el.innerHTML=`<h3>⧉ Copier « ${esc(S.title)} » vers d'autres paniers</h3><div class="hint" style="margin:0">DN par DN, aux DN présents dans les deux paniers : les heures de MO (équipe × heures de chaque ligne) et les variantes d'équipe. <b>Les fournitures ne sont jamais copiées.</b> Un seul enregistrement de la base (une révision), annulable.</div>
    ${mvBannerHTML(base,true,C.src,true)}
    <div class="eq-lab">1 · Paniers destinataires</div>${groups}
    <div class="eq-lab">2 · Ce qui est copié</div>
    <label class="pcp-ck"><input type="checkbox" id="pcp-mo"${C.mo?' checked':''}><span>Heures de MO par DN <small class="dim">(lignes équipe × heures de chaque DN)</small></span></label>
    <label class="pcp-ck"><input type="checkbox" id="pcp-mv"${C.mv?' checked':''}><span>Variantes d'équipe par DN <small class="dim">(« quand l'équipe soudure de la zone est … » et leurs lignes)</small></span></label>
    <label class="pcp-ck"><input type="checkbox" id="pcp-add"${C.add?' checked':''}><span>Ajouter aux destinataires les DN qui leur manquent <small class="dim">(MO seule ; fournitures à compléter, signalées)</small></span></label>
    <div class="eq-lab">3 · Aperçu · panier × DN</div>${sum}${prev}
    <div class="actions"><button class="btn primary block" id="pcp-ok"${plan&&plan.items.length&&(C.mo||C.mv||C.add)?'':' disabled'}>⧉ Copier${plan&&plan.items.length?' — '+plan.nDn+' DN':''}</button><button class="btn block" data-close>Annuler</button></div>`;
  el.querySelectorAll('input[name=pcp-dest]').forEach(i=>{i.onchange=()=>{if(i.checked)C.dests.add(i.value);else C.dests.delete(i.value);drawCopy();};});
  [['pcp-mo','mo'],['pcp-mv','mv'],['pcp-add','add']].forEach(([id,k])=>{const i=el.querySelector('#'+id);if(i)i.onchange=()=>{C[k]=i.checked;drawCopy();};});
  el.querySelectorAll('[data-pcpall],[data-pcpnone]').forEach(b=>{b.onclick=()=>{const g=b.dataset.pcpall||b.dataset.pcpnone;others.filter(p=>gOf(p)===g).forEach(p=>{if(b.dataset.pcpall)C.dests.add(p.id);else C.dests.delete(p.id);});drawCopy();};});
  const fx=el.querySelector('#pcp-fix');if(fx)fx.onclick=()=>{fixVariants(C.src,C.ctx);drawCopy();};
  const ok=el.querySelector('#pcp-ok');if(ok)ok.onclick=()=>applyNow();}
function applyNow(){const C=PS.copy;const base=D.prixBase();if(!C||!base)return;const plan=copyPlan(base,C.src,[...C.dests],{mo:C.mo,mv:C.mv,add:C.add});if(!plan||!plan.items.length)return;
  const before=clone(regGet('prix','base'));const now=new Date().toISOString();const b=applyCopy(base,plan,{at:now});save(b,C.ctx); /* UN enregistrement = une révision */
  PS.undo={before,editedAt:b.editedAt,rev:b.rev};
  const txt='Copié vers '+plan.nP+' panier'+(plan.nP>1?'s':'')+' : '+plan.nDn+' DN, '+plan.nV+' variante'+(plan.nV>1?'s':'')+(plan.absent.length?' · DN absents : '+grp(plan.absent):'')+(plan.added.length?' · DN ajoutés (fournitures à compléter) : '+grp(plan.added):'');
  PS.res={txt,at:now};PS.copy=null;if(A.closeModal)A.closeModal();say(txt);if(C.ctx&&C.ctx.render)C.ctx.render();}
/* l'annulation : seulement si la base n'a pas bougé depuis (même écriture, même révision) ; elle remet la base d'avant — sa révision aussi quand aucun dossier
   n'a été chiffré entre-temps avec celle de la copie (sinon : une nouvelle révision, la révision de la copie est archivée comme d'habitude) */
function undoOk(){const U=PS.undo;if(!U)return false;const cur=regGet('prix','base');return !!cur&&cur.editedAt===U.editedAt&&revOf(cur)===U.rev;}
function undoNow(ctx){const U=PS.undo;if(!U)return;if(!undoOk()){PS.undo=null;say('La base a été modifiée depuis la copie : annulation impossible');return;}
  const used=regAll('affaire').some(a=>{const ch=a.chiffrage||{};return ch.baseRev===U.rev||(a.chiffrages||[]).some(v=>v&&v.chiffrage&&v.chiffrage.baseRev===U.rev);});
  const r=clone(U.before);r.editedAt=new Date().toISOString();r.editedBy=A&&A.userName?A.userName():'';if(used)save(r,ctx);else{PS.saves++;regSet('prix','base',r,{replace:true});}
  PS.undo=null;PS.res={txt:'Copie annulée : la base est revenue à son état d\'avant la copie',undone:true};say(PS.res.txt);}
function fixVariants(only,ctx){const base=D.prixBase();if(!base)return 0;const {base:b,n}=mvarFix(base,only||null);if(!n)return 0;save(b,ctx);const cf=mvarIssues(b,only||null).filter(x=>x.kind==='conflict').length;
  say(n+' variante'+(n>1?'s':'')+' corrigée'+(n>1?'s':'')+' : « quand l\'équipe est » = l\'équipe de la ligne'+(cf?' · ⚠ '+cf+' conflit'+(cf>1?'s':'')+' à régler (deux variantes, même condition)':''));return n;}
/* ═════════ ACTIONS (baseAct de chiffrage.js) ═════════ */
export function pAct(k,arg,arg2,arg3,ctx){if(!/^chp(copy|undo|res|mvfix|go)$/.test(k))return false;const can=!!(ctx&&ctx.canPrix);const render=()=>{if(ctx&&ctx.render)ctx.render();};
  const no=()=>say('Réservé : droit « Base de prix SCR : modifier » (Administrateur → la personne)');
  if(k==='chpres'){PS.res=null;render();return true;}
  if(k==='chpgo'){const CS=D.CS||{};CS.pan=arg;CS.panDn=+arg2;if(ctx&&ctx.page)CS.pview='paniers';else CS.view='paniers';render();return true;}
  if(!can){no();return true;}
  if(k==='chpcopy'){openCopy(arg,ctx);return true;}
  if(k==='chpundo'){undoNow(ctx);render();return true;}
  if(k==='chpmvfix'){if(!fixVariants(arg,ctx))say('Rien à corriger');render();return true;}
  return false;}
/* ═════════ PANIERS DE PRESTATION : EXTRUSION (bloc EXTRUSION du classeur, base.op.extrusion) ═════════ */
export function extrusionEditHTML(base,ro){const E=(base.op||{}).extrusion;if(!E||!(E.rows||[]).length)return '<div class="eq-s">Pas de bloc EXTRUSION dans le classeur importé : rien à régler ici.</div>';const {IN,SEL}=D.UI||{};if(!IN||!SEL)return '';cssP();
  const types=E.types||[];const H=[['manchons','Manchons'],['coude','Coude'],['pec','PEC'],['purges','Purges'],['by-pass','By-pass']];
  const rows=E.rows.map((r,i)=>{const pre='b§op§extrusion§rows§'+i+'§';return `<tr><td><b>Ø ${esc(r.dnPehd)}</b></td><td>${SEL(pre+'eq',r.eq,D.eqOpts?D.eqOpts(base):[[r.eq,r.eq]],ro)}</td>${H.map(([k])=>`<td>${IN(pre+'h§'+k,(r.h||{})[k],{ro,cls:'ch-n',step:0.25})}</td>`).join('')}<td>${IN(pre+'amort',r.amort,{ro,cls:'ch-n'})}</td><td>${IN(pre+'conso',r.conso,{ro,cls:'ch-n'})}</td>${types.map(t=>`<td class="num"><b>${nb(extrusionPrice(base,r.dnPehd,t))}</b></td>`).join('')}</tr>`;}).join('');
  return `<div class="pex"><div class="hint" style="margin:0 0 4px">Prix d'une pièce = heures × taux de l'équipe + amortissement + consommables : c'est ce que compte une zone (carte Extrusion) ; le détail reste retouchable dans la zone, pour un chiffrage.</div>
    <div style="overflow:auto"><table class="rc af-tab ch-tab"><tr><th rowspan="2">Ø gaine</th><th rowspan="2">Équipe</th><th colspan="5">Heures par pièce</th><th rowspan="2">Amort. € / pièce</th><th rowspan="2">Consomm. € / pièce</th>${types.length?`<th colspan="${types.length}">€ par pièce</th>`:''}</tr><tr>${H.map(([,l])=>`<th>${l}</th>`).join('')}${types.map(t=>`<th>${esc(t)}</th>`).join('')}</tr>${rows}</table></div></div>`;}
