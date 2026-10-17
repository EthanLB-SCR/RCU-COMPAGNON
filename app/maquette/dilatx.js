/* dilatx.js — 16/10 (lot TA) : notes de DILATATION du traceur — ce qui est vérifié, ce qui manque, dit clairement (règles indicatives, contrat C7 : tableau Lmax
   du pack SCR, partie « regles » ; maquette/t1.js dilat()).
   Ethan (16/10) : « les notes de dilatation n'ont pas l'air de fonctionner ». Avec le VRAI tableau importé par SCR → Pack SCR, les alertes sortent (étude comme chantier) ;
   ce qui les rendait muettes : (1) le tableau n'arrivait au traceur que par localStorage['trace:regles'] — copie qui échouait sans rien dire (mémoire du navigateur
   pleine) ou absente sur un autre appareil — et le traceur le disait seulement dans l'onglet Notes (absent au téléphone) ; (2) une ligne sans alerte ne montrait RIEN :
   impossible de savoir si elle avait été vérifiée (une ligne courte entre deux coudes à 90° est le plus souvent conforme) ; (3) la profondeur supposée
   n'était dite qu'au milieu d'une alerte. Maintenant : le traceur relit aussi le registre de l'appareil (src/regles.js reglesFromStore) ; tableau absent → dit dans le
   pied de page (toujours visible, téléphone compris, touchable → la liste), dans la fiche de la ligne et dans Notes ; chaque ligne montre son contrôle (tronçons entre
   coudes 90° et longueur admissible, profondeur manquante, té). */
import {fmt} from './traceur.js';
const esc=s=>String(s??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const f2=v=>Number(v).toLocaleString('fr-FR',{minimumFractionDigits:2,maximumFractionDigits:2});
export const NO_RULES='règles de dilatation : non chargées — ouvre SCR → Pack SCR (partie Règles) dans l\'appli, sur cet appareil';
/* contrôle d'UNE ligne (fiche de la ligne) — D = dilat() de t1.js ; noHead : le titre est déjà posé (alertes de la ligne juste au-dessus) */
export function lineHTML(D,l,noHead){if(!D||!l)return '';const st=(D.st||{})[l.id];if(D.off)return `<h3>Dilatation (indicatif)</h3><div class="note info">Alerte dilatation désactivée (onglet Règles).</div>`;if(!st)return '';
  const mine=D.list.filter(a=>a.line===l.id);const out=[];
  if(D.noTable)out.push(`<div class="note warn">⚠ ${esc(NO_RULES[0].toUpperCase()+NO_RULES.slice(1))} : la longueur entre coudes à 90° n'est pas vérifiée.</div>`);
  else if(!st.runs.length)out.push(`<div class="note info">Aucun tronçon entre deux coudes à 90° sur cette ligne : rien à comparer au tableau (règle « lyre »).</div>`);
  else{const ok=st.runs.filter(r=>r.lmax!=null);const worst=ok.slice().sort((a,b)=>(b.len/b.lmax)-(a.len/a.lmax))[0];const bad=ok.filter(r=>r.len>r.lmax+1e-6).length;const miss=st.runs.length-ok.length;
    if(bad)out.push(`<div class="note warn">⚠ ${bad} tronçon${bad>1?'s':''} trop long${bad>1?'s':''} sur ${st.runs.length} entre coudes à 90° : insérer une lyre${noHead?' (détail ci-dessus)':''}</div>`); // l'alerte détaillée est juste au-dessus : pas de redite
    else if(worst)out.push(`<div class="note info">✓ ${st.runs.length} tronçon${st.runs.length>1?'s':''} entre coudes à 90° : le plus chargé ${fmt(Math.round(worst.len))} m pour ${fmt(Math.round(worst.lmax))} m admissibles (DN ${worst.dn}${worst.below?' — plus petit que le tableau':''}, ${D.T} °C, ${D.S} N/mm²)</div>`);
    if(miss)out.push(`<div class="note warn">${miss} tronçon${miss>1?'s':''} non vérifié${miss>1?'s':''} : ${D.T} °C / ${D.S} N/mm² absents du tableau importé (onglet Règles).</div>`);}
  if(!D.noTable&&st.runs.length)out.push(st.own?`<div class="muted">profondeur de la ligne : ${f2(st.prof)} m</div>`:`<div class="note warn">Profondeur manquante sur la ligne « ${esc(l.name)} » : ${f2(st.prof)} m supposée (profondeur par défaut du tracé) — saisis-la dans « prof. » de la fiche.</div>`);
  if(l.parent)out.push(`<div class="note ${st.te>D.teMax+1e-6?'warn':'info'}">${st.te>D.teMax+1e-6?'⚠':'✓'} Antenne : ${fmt(Math.round(st.te*10)/10)} m en ligne droite après le té avant le 1er coude à 90° (${fmt(D.teMax)} m maxi)</div>`);
  return (noHead?'':`<h3>${mine.length?'⚠ ':''}Dilatation (indicatif)</h3>`)+`<div class="dx-st" data-line="${esc(l.id)}">${out.join('')}</div>`;}
/* fiche du téléphone : court — tableau absent, profondeur manquante, ✓ vérifié (les alertes sont déjà listées) */
export function phoneHTML(D,l){const st=D&&!D.off&&(D.st||{})[l.id];if(!st)return '';const mine=D.list.filter(a=>a.line===l.id).length;const o=[];
  if(D.noTable)o.push(`⚠ ${esc(NO_RULES)}`);else{if(st.runs.length&&!st.own)o.push(`⚠ profondeur manquante sur la ligne : ${f2(st.prof)} m supposée`);if(!mine&&(st.runs.length||l.parent))o.push(`✓ dilatation vérifiée${st.runs.length?` (${st.runs.length} tronçon${st.runs.length>1?'s':''} entre coudes 90°)`:''}`);}
  return o.map(t=>`<div class="note ${/^✓/.test(t)?'info':'warn'} dx-ph" style="margin-top:6px">${t}</div>`).join('');}
/* pied de page : toujours visible (téléphone compris) ; touché → la liste (fiche flottante au téléphone) */
export function footHTML(D,nLines){if(!D||D.off||!nLines)return '';const n=D.list.length;
  if(D.noTable)return `<span class="dx-foot" data-dx="list" style="color:#b8560f;font-weight:600;cursor:pointer" title="${esc(NO_RULES)} — la règle du té reste vérifiée">⚠ ${esc(NO_RULES)}${n?` · ${n} alerte${n>1?'s':''} (té)`:''}</span>`;
  const miss=D.miss?` · tronçons non vérifiés (${D.T} °C / ${D.S} N/mm² absents du tableau)`:'';
  return n?`<span class="dx-foot" data-dx="list" style="color:#b8560f;font-weight:600;cursor:pointer" title="onglet Notes : ⚠ Dilatation (indicatif)">⚠ ${n} alerte${n>1?'s':''} dilatation (indicatif)${miss}</span>`:`<span class="dx-foot" data-dx="list" style="cursor:pointer;${miss?'color:#b8560f;font-weight:600':''}" title="règles de dilatation vérifiées sur toutes les lignes">✓ dilatation vérifiée${miss}</span>`;}
/* onglet Notes : profondeurs manquantes (une ligne par ligne concernée serait trop : un résumé) */
export function notesExtra(D,lines){if(!D||D.off||D.noTable)return '';const sans=lines.filter(l=>{const s=(D.st||{})[l.id];return s&&s.runs.length&&!s.own;});
  return sans.length?`<div class="note warn">Profondeur manquante sur ${sans.length>3?sans.length+' lignes':sans.map(l=>'« '+esc(l.name)+' »').join(', ')} : profondeur par défaut du tracé supposée (fiche de la ligne : « prof. »).</div>`:'';}
/* fiche flottante (téléphone : pas d'onglet Notes) — la liste des alertes, touchable */
export function cardHTML(listHTML){return `<div class="t1-card dx-card"><h4>⚠ Dilatation (indicatif)<span class="t1-sp"></span><button class="btn sm" data-dx="close" title="fermer">✕</button></h4>${listHTML}</div>`;}
let A=null,card=null;
const CSS=`#dxCard{position:absolute;left:8px;bottom:8px;width:min(380px,calc(100% - 64px));max-height:min(60%,calc(100% - 100px));overflow:auto;z-index:8}#dxCard h3{font-size:12px;margin:6px 0 4px;color:var(--ink2);text-transform:uppercase;letter-spacing:.05em}#dxCard .note{cursor:pointer}`;
const phone=()=>{try{return window.matchMedia('(max-width:800px)').matches;}catch(e){return false;}};
function closeCard(){if(card){card.style.display='none';card.innerHTML='';}}
export function openCard(){if(!card||!A)return;card.innerHTML=cardHTML(A.T1.dilatHTML().replace(/^<h3>[^<]*<\/h3>/,''));card.style.display='';}
/* pied de page touché : onglet Notes (PC), fiche flottante (téléphone) */
export function init(api){A=api;if(!document.getElementById('css-lot-ta-dx')){const s=document.createElement('style');s.id='css-lot-ta-dx';s.textContent=CSS;document.head.appendChild(s);}
  card=document.createElement('div');card.id='dxCard';card.style.display='none';api.main.appendChild(card);
  const foot=document.getElementById('foot');if(foot)foot.addEventListener('click',e=>{if(!e.target.closest('[data-dx="list"]'))return;if(phone())openCard();else{A.state.tab='notes';A.renderPanel();}});
  card.addEventListener('click',e=>{if(e.target.closest('[data-dx="close"]')){closeCard();return;}const el=e.target.closest('[data-act="t1-dil"]');if(!el)return;const D=A.T1.dilat();const x=D.list[+el.dataset.i];const l=x&&A.state.lines.find(q=>q.id===x.line);if(!l)return;
    A.state.sel={kind:'line',id:l.id};A.state.selV=[];let x0=1e9,y0=1e9,x1=-1e9,y1=-1e9;l.pts.forEach(p=>{x0=Math.min(x0,p[0]);y0=Math.min(y0,p[1]);x1=Math.max(x1,p[0]);y1=Math.max(y1,p[1]);});A.fitBox(x0,y0,x1,y1);closeCard();A.render();A.renderPanel();A.flash('⚠ '+x.txt);});}
