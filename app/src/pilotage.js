// pilotage.js — 31/10/2026 (lot PI) : PILOTAGE V1 (module du bandeau « Tracé Pilotage »).
//  · Planning simplifié (option « planning_simple ») : UN écran — la semaine, un bloc par chantier, une ligne par personne, qui est où chaque jour (fériés, hors contrat,
//    autre chantier) ; placer en 3 touchers (personne ou équipe → chantier → « Placer », jours libres cochés d'office) ; « Copier la semaine dernière » ;
//    le planning détaillé d'avant (secteurs, équipes A–J, glisser-déposer, nouvelle personne) reste derrière « Plus d'options ».
//  · « Demain : chantier X » dans Moi (Compagnon) et sur l'accueil du gars.
//  · Production par équipe (option « prod_tableau ») : tableau jour / semaine par équipe (soudures, manchons, ml si connus, heures), objectif vs réalisé + barre,
//    chantiers comptés DITS à l'écran (fiches de soudure présentes sur l'appareil — aucune lecture serveur nouvelle), impression A4 (charte docHTML).
//  · Pointage : états en 3 étapes (déclaré → chef → conducteur), anomalies (fin manquante, pas de pause, journée > 12 h, fin ajoutée après coup), trace (qui a validé / corrigé).
// Les données restent celles d'espace.js : X = contexte fourni par espace.js à CHAQUE appel (données du rendu courant), jamais gardé ici.
import {docHTML} from './charte.js';
const esc=s=>String(s==null?'':s).replace(/[&<>"]/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;'}[c]));
const nb=n=>Number(n).toLocaleString('fr-FR');
const r1=n=>Math.round((+n||0)*10)/10;
const JL=['L','M','M','J','V'];
const CSS=`
/* 31/10 (lot PI) : affichage étroit sur grand écran (.app sans « affichage large ») — les grilles qui suivent la largeur de l'ÉCRAN (hub, compteurs) restent en une colonne */
.app:not(.wide) .eq-hubrows{grid-template-columns:1fr}.app:not(.wide) .eq-kpis{grid-template-columns:repeat(2,1fr)}
.eq-hubmore{grid-column:1/-1;margin:-4px 0 4px}.eq-hubmore[open]>summary{color:var(--ink,#222)}
.pi-bar{display:flex;flex-wrap:wrap;gap:8px;align-items:center;margin:0 0 8px}.pi-bar .btn{min-height:44px}.pi-bar .btn.sm{min-height:36px;font-size:13px}
.pi-sum{font-size:13px;color:var(--ink2,#555);margin:0 0 8px}.pi-sum b{color:var(--ink,#222)}.pi-sum .bad{color:#9a3410}
.pi-panel{border:2px solid #e8501c;border-radius:16px;padding:12px;margin:0 0 10px;background:var(--surface,#fff)}
.pi-panel h3{margin:0 0 6px;font-size:15px}.pi-step{font-size:12px;letter-spacing:.06em;text-transform:uppercase;color:var(--muted,#777);font-weight:700;margin:8px 0 4px}
.pi-who{display:flex;flex-wrap:wrap;gap:6px}.pi-pick{display:grid;grid-template-columns:1fr;gap:6px}
.pi-pick .btn,.pi-who .btn{min-height:44px;text-align:left;justify-content:flex-start;white-space:normal;line-height:1.2}
@media(min-width:700px){.app.wide .pi-pick{grid-template-columns:repeat(2,1fr)}}
.pi-days{display:flex;gap:6px;flex-wrap:wrap}.pi-days .chip{min-height:44px;min-width:58px;justify-content:center;flex-direction:column;line-height:1.1;display:inline-flex;align-items:center}
.pi-days .chip small{font-size:10.5px;opacity:.8;font-weight:400}.pi-days .chip.fer{border-style:dashed}
.pi-go{display:flex;gap:8px;flex-wrap:wrap;margin-top:10px}.pi-go .btn{min-height:44px}.pi-go .btn.primary{flex:1 1 220px}
.pi-tray{display:flex;flex-wrap:wrap;gap:6px}.pi-chip{display:inline-flex;flex-direction:column;align-items:flex-start;min-height:44px;padding:6px 12px;border-radius:14px;border:1px solid var(--line,#ddd);background:var(--surface,#fff);text-align:left;font:inherit;color:inherit;max-width:100%}
.pi-chip b{font-size:13.5px}.pi-chip small{font-size:11.5px;color:var(--ink2,#666)}.pi-chip.team{border-color:#e9b9a4;background:#fdf3ee}.pi-chip.sel{border-color:#e8501c;box-shadow:0 0 0 2px #e8501c inset}
.pi-sites{display:grid;grid-template-columns:1fr;gap:10px}@media(min-width:900px){.app.wide .pi-sites{grid-template-columns:repeat(2,1fr)}}@media(min-width:1300px){.app.wide .pi-sites{grid-template-columns:repeat(3,1fr)}}
.pi-site{margin:0}.pi-site .pi-sh{display:flex;align-items:baseline;gap:8px;margin:0 0 6px}.pi-site .pi-sh b{font-size:15px}.pi-site .pi-sh .n{margin-left:auto;font-weight:700;color:#e8501c}
.pi-row{display:grid;grid-template-columns:minmax(0,1fr) repeat(5,34px);gap:4px;align-items:center;width:100%;min-height:44px;padding:2px 0;border:0;border-top:1px solid var(--line,#eee);background:none;font:inherit;color:inherit;text-align:left}
@media(min-width:700px){.app.wide .pi-row{grid-template-columns:minmax(0,1fr) repeat(5,44px)}}.pi-short{display:none}@media(max-width:520px){.pi-full{display:none}.pi-short{display:inline}}
.pi-panel .eq-tb{min-width:44px;min-height:40px;font-size:14px}
.pi-row.pi-head{min-height:0;border-top:0;padding:0 0 2px}.pi-row .pi-n{min-width:0;overflow:hidden}.pi-row .pi-n b{display:block;font-size:13.5px;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}.pi-row .pi-n small{display:block;font-size:11px;color:var(--ink2,#666);white-space:nowrap;overflow:hidden;text-overflow:ellipsis}
.pi-c{display:flex;align-items:center;justify-content:center;height:30px;border-radius:8px;background:var(--plane,#f1f0ec);font-size:12px;font-weight:700;color:var(--muted,#888)}
.pi-c.on{background:#e8501c;color:#fff}.pi-c.on.warn{background:#b8740f}.pi-c.oth{background:#e8e4f6;color:#3b2d7a;font-size:10px;font-weight:600}.pi-c.fer{background:repeating-linear-gradient(135deg,#eceae3 0 5px,#f7f6f2 5px 10px);color:#8a8578}.pi-c.on.fer{background:#e8501c;color:#fff}.pi-c.out{background:none;color:#bbb}
.pi-c.h{background:none;height:auto;flex-direction:column;font-size:10.5px;font-weight:600;color:var(--ink2,#666);line-height:1.1}.pi-c.h b{font-size:13px;color:var(--ink,#222)}.pi-c.h i{font-style:normal;font-size:9.5px;color:#9a3410}.pi-c.h.today b{color:#e8501c}
.pi-team{font-size:11.5px;font-weight:700;color:var(--ink2,#555);margin:6px 0 0;display:flex;align-items:center;gap:6px;min-height:34px;border:0;background:none;padding:0;font-family:inherit}
.pi-add{margin-top:6px;min-height:44px;width:100%}
.pi-leg{display:flex;flex-wrap:wrap;gap:10px;font-size:11.5px;color:var(--ink2,#666);margin:8px 0 0}.pi-leg span{display:inline-flex;align-items:center;gap:4px}.pi-leg .pi-c{width:18px;height:18px;font-size:10px}
.pi-dem{display:flex;gap:10px;align-items:flex-start}.pi-dem .ic{font-size:22px;line-height:1}.pi-dem b{font-size:15px}.pi-dem .eq-s{margin-top:2px}
.pi-et{display:inline-flex;flex-wrap:wrap;gap:4px;align-items:center;font-size:11.5px;margin-top:3px}.pi-et span{display:inline-flex;align-items:center;gap:3px;padding:1px 8px;border-radius:999px;border:1px solid var(--line,#ddd);color:var(--ink2,#666);background:var(--surface,#fff)}
.pi-et span.ok{border-color:#9bd3b0;background:#e6f5ec;color:#15673a}.pi-et span.bad{border-color:#f0b9b4;background:#fdeeec;color:#8a1f1f}.pi-et span.ink{border-color:#c9c2ee;background:#efecfb;color:#3b2d7a}.pi-et i{font-style:normal;color:#bbb}
.pi-ano{display:flex;flex-wrap:wrap;gap:4px;margin-top:3px}.pi-ano span{font-size:11.5px;padding:1px 8px;border-radius:999px;background:#fff4d6;border:1px solid #f0c76a;color:#7a5200}.pi-ano span.bad{background:#fdeeec;border-color:#f0b9b4;color:#8a1f1f}
.pi-trace{font-size:11.5px;color:var(--ink2,#666);margin-top:3px;line-height:1.35}
.pi-form{display:grid;grid-template-columns:1fr 1fr;gap:8px;margin:8px 0 0}.pi-form label{font-size:12px;color:var(--ink2,#666);display:block}.pi-form input,.pi-form select{width:100%;min-height:44px}.pi-form .full{grid-column:1/-1}
.pi-pts .eq-row{min-height:44px}
.pi-pm{display:flex;gap:6px;flex-wrap:wrap;margin:0 0 8px}.pi-pm .chip{min-height:40px}
.pi-tab{width:100%;border-collapse:collapse;font-size:13px}.pi-tab th{font-size:11px;text-transform:uppercase;letter-spacing:.04em;color:var(--ink2,#666);text-align:right;padding:4px 4px;font-weight:700}.pi-tab th:first-child{text-align:left}
.pi-tab td{padding:6px 4px;border-top:1px solid var(--line,#eee);text-align:right;font-variant-numeric:tabular-nums;vertical-align:top}.pi-tab td:first-child{text-align:left;min-width:0;word-break:break-word}.pi-tab td:first-child small{display:block;color:var(--ink2,#666);font-size:11px}
.pi-tab th:not(:first-child),.pi-tab tr:not(.bar)>td:not(:first-child){width:54px;white-space:nowrap;padding-left:6px}.pi-tab th:last-child,.pi-tab tr:not(.bar)>td:last-child{width:64px}@media(max-width:400px){.pi-tab{font-size:12.5px}.pi-tab th{font-size:10px;padding:4px 2px}.pi-tab td{padding:6px 2px}.pi-tab th:not(:first-child),.pi-tab tr:not(.bar)>td:not(:first-child){width:44px;padding-left:5px}.pi-tab th:last-child,.pi-tab tr:not(.bar)>td:last-child{width:60px}}
.pi-tab tr.bar td{border-top:0;padding-top:0;text-align:left}.pi-tab tr.tot td{font-weight:700;border-top:2px solid var(--ink,#333)}
.pi-g{height:10px;border-radius:6px;background:var(--plane,#eee);overflow:hidden;margin:2px 0}.pi-g i{display:block;height:100%;background:#e8501c;border-radius:6px}.pi-g.rel i{background:#9b93c9}.pi-g.ok i{background:#1f9d55}
.pi-gl{font-size:11.5px;color:var(--ink2,#666)}
.pi-scope{font-size:12px;color:var(--ink2,#555);line-height:1.45;margin:6px 0 0}.pi-scope .ok{color:#15673a}.pi-scope .no{color:#9a3410}.pi-scope .btn{min-height:34px;padding:4px 10px;font-size:12.5px;margin:4px 6px 0 0}
`;
let cssDone=false;
export function piInit(){if(cssDone||typeof document==='undefined')return;cssDone=true;try{const st=document.createElement('style');st.id='css-lot-pi';st.textContent=CSS;document.head.appendChild(st);}catch(e){}}

/* ═══ POINTAGE : états, anomalies, trace ═══ */
/* 3 étapes visibles par tous (le gars d'abord) : déclaré → validé chef → validé conducteur ; le pointage d'un chef (ou d'un chantier sans chef) n'a pas d'étape « chef » */
export function piEtapes(x,X,court){const c=X.calc(x);const chef=X.valChefOnly(x),fin=X.valFinal(x);const noChef=X.estChef(x.p)||X.sansChef(x);
  if(c.enCours)return `<span class="pi-et"><span>⏱ en cours</span></span>`;
  const d1=c.manque&&!fin&&!chef?'<span class="bad">⚠ fin manquante</span>':'<span class="ok">✓ déclaré</span>';
  const vc=x.val.find(v=>X.estChef(v.by)),vf=x.val.filter(v=>!X.estChef(v.by)).pop();
  const who=v=>{if(!v)return '';const p=X.pers(v.by);return court?'':' '+esc(p.prenom||'');};
  const d2=noChef?'':(chef||fin?`<span class="ok">✓ chef${who(vc)}</span>`:'<span>○ chef</span>');
  const d3=fin?`<span class="ok">✓ ${X.pers(vf.by).poste==='conducteur'?'conducteur':'validé'+who(vf)}</span>`:'<span>○ conducteur</span>';
  return `<span class="pi-et" title="Déclaré → validé par le chef de chantier → validé par le conducteur">${d1}${d2?'<i>›</i>'+d2:''}<i>›</i>${d3}${x.corr?'<span class="ink">✏️ corrigé</span>':''}</span>`;}
/* anomalies : ce qui empêche « Tout valider » (la ligne se traite à part, avec son bouton) */
export function piAnomalies(x,X){const c=X.calc(x);const out=[];if(c.enCours)return out;
  if(c.manque)out.push(['bad','fin manquante']);
  if(c.fin&&c.total>=360&&!c.pa)out.push(['','pas de pause pointée']);
  if(c.total>720)out.push(['','journée de plus de 12 h']);
  const late=(x.events||[]).find(e=>e.t==='end'&&e.late);if(late)out.push(['','fin ajoutée après coup'+(late.by?' par '+X.pers(late.by).prenom:'')]);
  if(c.debut&&c.fin&&c.fin<c.debut)out.push(['bad','fin avant le début']);
  return out;}
export const piAnoHTML=L=>L.length?`<span class="pi-ano">${L.map(([k,t])=>`<span class="${k}">⚠ ${esc(t)}</span>`).join('')}</span>`:'';
/* trace : qui a validé, qui a corrigé quoi (corrections successives gardées dans corr.hist) */
export function piTrace(x,X){const L=[];const dt=at=>{const s=String(at||'');return s.length>=16?X.fJour(s.slice(0,10)).slice(5)+' '+s.slice(11,16).replace(':',' h '):'';};
  (x.val||[]).forEach(v=>{const p=X.pers(v.by);L.push('✅ '+(X.estChef(v.by)?'chef':p.poste==='conducteur'?'conducteur':'validé')+' : '+X.nomC(p)+(v.at?' · '+dt(v.at):'')+(v.via?' (saisi par '+v.via+')':''));});
  const cs=x.corr?(x.corr.hist||[]).concat([x.corr]):[];cs.forEach(k=>{if(!k)return;L.push('✏️ '+(k.t==='saisie'?'journée saisie':k.t==='pause'?'pause '+(k.heure||'')+(k.fin?' → '+k.fin:''):(X.EVT[k.t]||'heure')+' '+(k.heure||'')+(k.avant?' au lieu de '+k.avant:''))+(k.motif?' — '+k.motif:'')+(k.by?' · par '+X.nomC(X.pers(k.by)):'')+(k.at?' · '+dt(k.at):''));});
  const late=(x.events||[]).find(e=>e.t==='end'&&e.late);if(late)L.push('🕓 fin '+String(late.at).slice(11,16)+' indiquée après coup'+(late.by?' par '+X.nomC(X.pers(late.by)):'')+' · '+dt(late.late));
  return L.length?`<div class="pi-trace">${L.map(esc).join('<br>')}</div>`:'';}
/* le gars : ses derniers pointages (14 jours), l'état de chacun, et la fin manquante à indiquer lui-même (elle part au chef, signalée « après coup ») */
export function piMesPointages(me,X,n){const S=X.S;const t=X.DATA.today;const d0=X.addDays(t,-14);
  const L0=X.DATA.pointages.filter(x=>x.p===me.id&&x.d<t&&x.d>=d0).sort((a,b)=>a.d<b.d?1:-1);if(!L0.length)return '';
  const miss=L0.filter(x=>X.calc(x).manque&&!x.val.length&&!x.corr);const L=L0.filter((x,i)=>i<(n||6)||miss.includes(x)); /* Moi : les 3 derniers jours (+ toute fin oubliée) ; Heures : 6 */
  return `<div class="card pi-pts"><h3>Tes derniers pointages <span class="hint">· ${miss.length?'<b style="color:#9b2c22">'+miss.length+' fin'+(miss.length>1?'s':'')+' à indiquer</b>':'déclaré → chef → conducteur'}</span></h3><div class="eq-list">${L.map(x=>{const c=X.calc(x);const id=x.p+'|'+x.d;const m=miss.includes(x);
    return `<div class="eq-vrow"><div class="eq-row"><span class="eq-grow"><span class="eq-t">${esc(X.fJour(x.d))} <span class="eq-s">· ${esc(X.site(x.site).nom)}</span></span><span class="eq-s">${c.debut?esc(X.fHeure(c.debut)+' → '+(c.fin?X.fHeure(c.fin):'—')+' · '+X.fDuree(c.total)):''}</span>${piEtapes(x,X)}</span></div>
      ${m?(S.piFin===id?`<div class="pi-form"><div><label for="pi-fin-h">Heure de fin</label><input class="f" type="time" id="pi-fin-h" value="${esc(X.finHabituelle(me,x))}"></div><div><label>&nbsp;</label><button class="btn primary" style="width:100%;min-height:44px" data-act="pi" data-v="finok|${esc(id)}">Envoyer</button></div><div class="full hint">Ton chef la voit « indiquée après coup » et la valide (ou la corrige).</div></div>`:`<div class="eq-acts"><button class="btn primary" data-act="pi" data-v="fin|${esc(id)}">🕓 Indiquer l'heure de fin</button></div>`):''}</div>`;}).join('')}</div></div>`;}
/* le chef / conducteur : saisir la journée d'un gars qui n'a rien pointé (« pointage manquant ») */
export function piSaisieHTML(p,d,X){const id=p.id+'|'+d;if(X.S.piSaisie!==id)return `<div class="eq-acts"><button class="btn" data-act="pi" data-v="saisie|${esc(id)}">✏️ Saisir ses heures</button></div>`;
  const h=X.horairesDe(p,d);return `<div class="pi-form"><div><label for="pi-s-h0">Début</label><input class="f" type="time" id="pi-s-h0" value="${esc(h[0])}"></div><div><label for="pi-s-h1">Fin</label><input class="f" type="time" id="pi-s-h1" value="${esc(h[1])}"></div>
    <div><label for="pi-s-p0">Pause à</label><input class="f" type="time" id="pi-s-p0" value="12:00"></div><div><label for="pi-s-pd">Durée de la pause</label><select class="f" id="pi-s-pd">${[[0,'pas de pause'],[30,'30 min'],[45,'45 min'],[60,'1 h'],[90,'1 h 30']].map(([v,t])=>`<option value="${v}"${v===60?' selected':''}>${t}</option>`).join('')}</select></div>
    <div class="full"><label for="pi-s-m">Motif</label><select class="f" id="pi-s-m">${['Oubli de pointage','Téléphone en panne / sans réseau','Pas de compte encore','Autre'].map(m=>`<option>${m}</option>`).join('')}</select></div>
    <div class="full eq-acts" style="margin:0"><button class="btn primary" data-act="pi" data-v="saisieok|${esc(id)}">Enregistrer et valider</button><button class="btn" data-act="pi" data-v="saisiex|">Annuler</button></div></div>`;}

/* ═══ PLANNING SIMPLIFIÉ ═══ */
const short=c=>{const s=String((c&&(c.ville||c.nom))||'?').replace(/^(chantier|ch\.)\s+/i,'');return s.slice(0,3);};
function planModel(me,X){const S=X.S;const k=S.plWeek||0;const js=X.semaineDe(k),wk=X.weekKey(js[0]);const jp=X.semaineDe(k-1),wp=X.weekKey(jp[0]);
  const aff=X.aff(wk),prev=X.aff(wp);const sect=S.plSect===undefined?X.mySecteur(me):S.plSect;
  const chantiers=X.DATA.chantiers.filter(c=>!c.bureau);const inS=c=>!sect||!c.secteur||c.secteur===sect;
  const gens=X.plGens();const mine=gens.filter(p=>!sect||!X.secteurDe(p)||X.secteurDe(p)===sect);
  const sitesOf=(p,d)=>((aff[p.id]||{})[d]||[]);const hors=(p,d)=>(p.entree&&d<p.entree)||(p.contrat&&p.contrat.fin&&d>p.contrat.fin);
  const fer=d=>X.isFerie(d);const libre=(p,d)=>!fer(d)&&!hors(p,d)&&!sitesOf(p,d).length;
  return {k,js,wk,jp,wp,aff,prev,sect,chantiers,inS,gens,mine,sitesOf,hors,fer,libre};}
export function piPlan(me,X){const S=X.S;const M=planModel(me,X);X.ensureWeeks([M.wk,M.wp]);const {js,aff}=M;const today=X.DATA.today;
  let P=S.pi;if(!P||P.wk!==M.wk)P=S.pi={wk:M.wk,open:false,who:[],site:null,days:null,team:null,leave:false,edit:false};
  const edit=X.can(me,'planning.edit')&&!X.viewing();
  const aPlacer=M.mine.filter(p=>js.some(d=>M.libre(p,d))).sort((a,b)=>js.filter(d=>M.libre(b,d)).length-js.filter(d=>M.libre(a,d)).length||X.nomC(a).localeCompare(X.nomC(b),'fr'));
  const complets=M.mine.filter(p=>!js.some(d=>M.libre(p,d))).length;const jl=aPlacer.reduce((a,p)=>a+js.filter(d=>M.libre(p,d)).length,0);
  const fers=js.filter(M.fer);
  /* chantiers à l'écran : ceux qui ont quelqu'un cette semaine ou la semaine passée, ceux à mon nom (fiche), celui qu'on est en train de remplir ; les autres sont pliés */
  const actif=c=>X.DATA.personnes.some(p=>js.some(d=>M.sitesOf(p,d).includes(c.id))||M.jp.some(d=>((M.prev[p.id]||{})[d]||[]).includes(c.id)))||c.chef===me.id||c.conducteur===me.id||P.site===c.id;
  const sites=M.chantiers.filter(c=>actif(c)&&(M.inS(c)||X.DATA.personnes.some(p=>js.some(d=>M.sitesOf(p,d).includes(c.id)))));
  const libTxt=p=>{const f=js.filter(d=>M.libre(p,d));const ouv=js.filter(d=>!M.fer(d)&&!M.hors(p,d));return f.length===ouv.length?'libre toute la semaine':'libre '+f.map(d=>X.fJour(d).slice(0,4)).join(', ');};
  const repos=p=>{try{const r=X.cptRow(p.id);const m=(r.mvts||[]).filter(x=>x&&!x.deleted&&(x.type==='repos'||x.type==='pose')&&js.includes(String(x.at).slice(0,10)));return m.length?' · 🏖 '+m.map(x=>(x.type==='repos'?'repos':'posé')+' le '+X.fJour(String(x.at).slice(0,10)).slice(0,4)+' ('+r1(x.h)+' h)').join(', '):'';}catch(e){return '';}};
  /* équipes de la semaine passée dont des membres sont encore à placer : « équipe → chantier → jours » */
  const teams={};M.mine.forEach(p=>{const o=M.prev[p.id]||{};Object.keys(o).filter(x=>x.startsWith('eq:')).forEach(x=>{const s=x.slice(3),t=o[x];if(!t||!M.jp.some(d=>(o[d]||[]).includes(s)))return;const key=s+'|'+t;(teams[key]=teams[key]||[]).push(p);});});
  const teamChips=Object.entries(teams).filter(([,L])=>L.length>=2&&L.filter(p=>aPlacer.includes(p)).length>=2).map(([key,L])=>{const [s,t]=key.split('|');const Lp=L.filter(p=>aPlacer.includes(p));
    return `<button class="pi-chip team" data-act="pi" data-v="team|${esc(s)}|${esc(t)}|${esc(Lp.map(p=>p.id).join(','))}"><b>👥 Équipe ${esc(t)} · ${esc(X.site(s).nom)}</b><small>semaine passée : ${esc(Lp.map(p=>p.prenom).join(', '))}</small></button>`;}).join('');
  const cell=(p,c,d)=>{const L=M.sitesOf(p,d);const here=L.includes(c.id);const oth=L.filter(x=>x!==c.id);const tt=esc(X.fJour(d))+(oth.length?' · aussi : '+esc(oth.map(x=>X.site(x).nom).join(', ')):'');
    if(M.hors(p,d))return `<span class="pi-c out" title="${esc(X.fJour(d))} : hors contrat">—</span>`;
    if(here)return `<span class="pi-c on${oth.length?' warn':''}${M.fer(d)?' fer':''}" title="${tt}">${oth.length?'⚠':'●'}</span>`;
    if(oth.length)return `<span class="pi-c oth" title="${tt}">${esc(short(X.site(oth[0])))}</span>`;
    if(M.fer(d))return `<span class="pi-c fer" title="${esc(X.fJour(d))} : férié">F</span>`;
    return `<span class="pi-c" title="${esc(X.fJour(d))} : libre"></span>`;};
  const head=(n,c)=>`<div class="pi-row pi-head" aria-hidden="true"><span class="pi-n"><small>${n} personne${n>1?'s':''}</small></span>${js.map((d,i)=>{const nd=X.DATA.personnes.filter(p=>M.sitesOf(p,d).includes(c.id)).length;return `<span class="pi-c h${M.fer(d)?' fer':''}${d===today?' today':''}">${JL[i]}<b>${+d.slice(8,10)}</b>${M.fer(d)?'<i>férié</i>':`<i style="color:var(--ink2,#666)">${nd||''}</i>`}</span>`;}).join('')}</div>`;
  const row=(p,c)=>{const t=X.teamOf(aff,p.id,c.id);return `<button class="pi-row" data-act="pi" data-v="edit|${esc(p.id)}|${esc(c.id)}" title="Toucher pour changer ses jours ou son chantier"><span class="pi-n"><b>${p.poste==='chef'?'🦺 ':''}<span class="pi-full">${esc(p.prenom)} ${esc(p.nom)}</span><span class="pi-short">${esc(p.prenom)} ${esc(String(p.nom||'').slice(0,1))}.</span></b><small>${esc(X.poste(p).label)}${t?' · équipe '+esc(t):''}${p.type==='interim'?' · intérim':''}</small></span>${js.map(d=>cell(p,c,d)).join('')}</button>`;};
  const carte=c=>{const ici=X.DATA.personnes.filter(p=>(p.active||p.invite)&&js.some(d=>M.sitesOf(p,d).includes(c.id)));
    const letters=[...new Set(ici.map(p=>X.teamOf(aff,p.id,c.id)))].sort((a,b)=>a===''?1:b===''?-1:a.localeCompare(b));
    const sorted=L=>L.slice().sort((a,b)=>(a.poste==='chef'?0:1)-(b.poste==='chef'?0:1)||X.nomC(a).localeCompare(X.nomC(b),'fr'));
    const body=letters.length>1||letters[0]?letters.map(t=>{const L=sorted(ici.filter(p=>X.teamOf(aff,p.id,c.id)===t));return `<button class="pi-team" data-act="pi" data-v="teamsel|${esc(c.id)}|${esc(t)}" title="Choisir toute l'équipe (pour la placer ailleurs)">${t?'Équipe '+esc(t):'Sans équipe'} · ${L.length} ›</button>`+L.map(p=>row(p,c)).join('');}).join(''):sorted(ici).map(p=>row(p,c)).join('');
    return `<div class="card pi-site" data-site="${esc(c.id)}"><div class="pi-sh"><b>📍 ${esc(c.nom)}</b><span class="hint">${esc(c.ville||'')}</span><span class="n">${ici.length}</span></div>${ici.length?head(ici.length,c)+body:'<div class="eq-s">Personne cette semaine.</div>'}${edit?`<button class="btn pi-add" data-act="pi" data-v="here|${esc(c.id)}">＋ Placer quelqu'un ici</button>`:''}</div>`;};
  /* le panneau « Placer » : 1 qui → 2 où → 3 quels jours */
  let panel='';if(P.open&&edit){const who=P.who.map(X.pers);
    const whoH=who.length?`<div class="pi-who">${who.map(p=>`<button class="btn" data-act="pi" data-v="unwho|${esc(p.id)}" title="Retirer de la sélection">${esc(p.prenom)} ${esc(p.nom)} ✕</button>`).join('')}</div>`:'';
    let step='';
    if(!who.length){const L=aPlacer.concat(M.mine.filter(p=>!aPlacer.includes(p)));step=`<div class="pi-step">1 · Qui ?</div><div class="pi-pick">${L.map(p=>`<button class="btn" data-act="pi" data-v="who|${esc(p.id)}"><b>${esc(p.prenom)} ${esc(p.nom)}</b> <span class="hint">· ${esc(X.poste(p).label)} · ${aPlacer.includes(p)?esc(libTxt(p)):'complet'}</span></button>`).join('')||'<div class="eq-s">Personne dans ce secteur.</div>'}</div>`;}
    else if(!P.site){const last=new Set(who.flatMap(p=>M.jp.flatMap(d=>((M.prev[p.id]||{})[d]||[]))));const rk=c=>(last.has(c.id)?0:4)+(sites.includes(c)?0:2)+(M.inS(c)?0:1);const L=M.chantiers.slice().sort((a,b)=>rk(a)-rk(b)||String(a.nom).localeCompare(String(b.nom),'fr'));
      step=`<div class="pi-step">2 · Sur quel chantier ?</div><div class="pi-pick">${L.map(c=>`<button class="btn" data-act="pi" data-v="site|${esc(c.id)}"><b>📍 ${esc(c.nom)}</b>${last.has(c.id)?' <span class="hint">· comme la semaine passée</span>':''}${c.ville?' <span class="hint">· '+esc(c.ville)+'</span>':''}</button>`).join('')}</div>`;}
    else{const c=X.site(P.site);const days=P.days||[];const conf=js.filter(d=>days.includes(d)&&who.some(p=>M.sitesOf(p,d).some(x=>x!==c.id)));
      const others=[...new Set(conf.flatMap(d=>who.flatMap(p=>M.sitesOf(p,d).filter(x=>x!==c.id))))];
      const used=[...new Set(Object.keys(aff).map(k=>X.teamOf(aff,k,c.id)).filter(Boolean))].sort();const nextT='ABCDEFGHIJ'.split('').find(t=>!used.includes(t));const tch=used.concat(nextT&&!used.includes(P.team)?[nextT]:[]).concat(P.team&&!used.includes(P.team)&&P.team!==nextT?[P.team]:[]);
      step=`<div class="pi-step">${P.edit?'Jours sur':'3 · Quels jours sur'} 📍 ${esc(c.nom)} ? <button class="btn sm" style="min-height:34px;margin-left:6px" data-act="pi" data-v="resite|">Changer de chantier</button></div>
        <div class="pi-days">${js.map((d,i)=>{const on=days.includes(d);const oth=who.flatMap(p=>M.sitesOf(p,d).filter(x=>x!==c.id));const hc=who.some(p=>M.hors(p,d));return `<button class="chip${on?' active':''}${M.fer(d)?' fer':''}" data-act="pi" data-v="day|${d}" aria-pressed="${on}"${hc?' disabled':''}>${['lun.','mar.','mer.','jeu.','ven.'][i]} ${+d.slice(8,10)}<small>${hc?'hors contrat':M.fer(d)?'férié':oth.length?esc(short(X.site(oth[0]))):on?'✓':'libre'}</small></button>`;}).join('')}</div>
        ${conf.length?`<div class="eq-s" style="margin-top:6px;color:#7a5200">⚠ ${esc(conf.map(d=>X.fJour(d).slice(0,4)).join(', '))} : déjà sur ${esc(others.map(x=>X.site(x).nom).join(', '))}.</div><div class="pi-days" style="margin-top:4px"><button class="chip${P.leave?' active':''}" data-act="pi" data-v="leave|" aria-pressed="${!!P.leave}">${P.leave?'✓ ':''}Le${who.length>1?'s':''} retirer de l'autre chantier ces jours-là</button></div>`:''}
        <div class="pi-step">Équipe sur ce chantier <span class="hint" style="text-transform:none;letter-spacing:0;font-weight:400">· facultatif</span></div><div class="eq-teams"><button class="eq-tb${!P.team?' on':''}" data-act="pi" data-v="tteam|" title="Sans équipe">—</button>${tch.map(t=>`<button class="eq-tb t-${t}${P.team===t?' on':''}" data-act="pi" data-v="tteam|${t}" title="Équipe ${t}">${t}</button>`).join('')}</div>`;}
    const okTxt=P.site&&who.length?(P.edit?'Enregistrer':'Placer '+(who.length>1?who.length+' personnes':esc(who[0].prenom))+' · '+((P.days||[]).length===js.filter(d=>!M.fer(d)).length?'toute la semaine'+(js.some(M.fer)?' (sauf férié)':''):(P.days||[]).map(d=>X.fJour(d).slice(0,4)).join(', ')||'aucun jour')):'';
    panel=`<div class="pi-panel" id="pi-panel"><h3>${P.edit?'Modifier':'Placer'}</h3>${whoH}${step}<div class="pi-go">${okTxt?`<button class="btn primary" data-act="pi" data-v="ok|"${(P.days||[]).length||P.edit?'':' disabled'}>${okTxt}</button>`:''}${P.edit&&P.site?`<button class="btn" data-act="pi" data-v="rm|">Retirer de ce chantier</button>`:''}<button class="btn" data-act="pi" data-v="close|">Annuler</button></div></div>`;}
  const sect=M.sect;const sectSel=Object.keys(X.SECTEURS).length?`<select class="f" data-chg="plSect" aria-label="Secteur" style="min-height:44px;max-width:220px"><option value=""${!sect?' selected':''}>Tous les secteurs</option>${Object.keys(X.SECTEURS).map(x=>`<option value="${x}"${sect===x?' selected':''}>${esc(X.SECTEURS[x])}</option>`).join('')}</select>`:'';
  const hors=M.chantiers.filter(c=>!sites.includes(c));
  return `<h2 class="vt">Planning de la semaine <span class="hint">· semaine ${X.numSemaine(js[0])} · du ${X.fDate(js[0]).slice(0,5)} au ${X.fDate(js[4])}</span></h2>
    ${X.weekNav({k:M.k,js,act:'plweek',marks:d=>X.DATA.personnes.filter(p=>M.sitesOf(p,d).length).length})}
    <div class="pi-bar">${edit?`<button class="btn primary" data-act="pi" data-v="open|">＋ Placer</button><button class="btn" data-act="pi" data-v="copy|">↩ Copier la semaine dernière</button>`:''}${sectSel}<button class="btn sm" data-act="xgo" data-v="orga" title="Secteurs, équipes A–J, glisser-déposer, nouvelle personne, fiche du chantier, météo">⚙ Plus d'options (planning détaillé)</button></div>
    <div class="pi-sum"><b>${complets} / ${M.mine.length}</b> placé${complets>1?'s':''} toute la semaine${jl?` · <b class="bad">${jl} jour${jl>1?'s':''} à pourvoir</b>`:M.mine.length?' · 🎉 tout le monde est placé':''}${fers.length?' · férié : '+fers.map(d=>esc(X.fJour(d))).join(', '):''}</div>
    ${panel}
    ${aPlacer.length||teamChips?`<div class="card"><h3>À placer <span class="hint">· ${aPlacer.length}</span></h3><div class="pi-tray">${teamChips}${aPlacer.map(p=>`<button class="pi-chip${P.who.includes(p.id)?' sel':''}" data-act="pi" data-v="who|${esc(p.id)}"><b>${esc(p.prenom)} ${esc(p.nom)}</b><small>${esc(X.poste(p).label)} · ${esc(libTxt(p))}${esc(repos(p))}${p.type==='interim'?' · intérim':''}</small></button>`).join('')}</div>${edit?'<div class="hint" style="margin-top:6px">Touche une personne (ou une équipe), puis le chantier : ses jours libres sont cochés, « Placer ».</div>':''}</div>`:''}
    <div class="pi-sites">${sites.map(carte).join('')||'<div class="card"><div class="eq-s">Aucun chantier dans ce secteur.</div></div>'}</div>
    ${hors.length?`<details class="card" data-det="piHors"${S.piHors?' open':''}><summary class="eq-s" style="min-height:44px;display:flex;align-items:center;cursor:pointer">Autres chantiers · ${hors.length} <span class="hint">&nbsp;(personne ces deux semaines, ou autre secteur)</span></summary><div class="pi-sites" style="margin-top:8px">${hors.map(carte).join('')}</div></details>`:''}
    <div class="pi-leg"><span><i class="pi-c on">●</i> sur ce chantier</span><span><i class="pi-c oth">Abc</i> sur un autre</span><span><i class="pi-c on warn">⚠</i> deux chantiers le même jour</span><span><i class="pi-c fer">F</i> férié</span><span><i class="pi-c out">—</i> hors contrat</span></div>`;}
/* actions du planning (data-act="pi" data-v="commande|…") */
function planAct(cmd,a,me,X){const S=X.S;const M=planModel(me,X);const P=S.pi||(S.pi={wk:M.wk,open:false,who:[],site:null,days:null,team:null,leave:false,edit:false});const js=M.js;
  const defDays=()=>{const who=P.who.map(X.pers);if(P.edit&&who.length===1)return js.filter(d=>M.sitesOf(who[0],d).includes(P.site));const f=js.filter(d=>who.every(p=>M.libre(p,d)));return f.length?f:js.filter(d=>!M.fer(d)&&who.every(p=>!M.hors(p,d))&&who.every(p=>!M.sitesOf(p,d).length||M.sitesOf(p,d).includes(P.site)));};
  const defTeam=()=>{const who=P.who.map(X.pers);const t=who.map(p=>X.teamOf(M.aff,p.id,P.site)||X.teamOf(M.prev,p.id,P.site)).find(Boolean);return t||null;};
  const W=['ok','rm','copy'];if(W.includes(cmd)&&(X.viewing()||!X.can(me,'planning.edit'))){if(X.viewing())X.viewOnly();else X.msg('Réservé à l\'encadrement (planning)');return;}
  if(cmd==='open'){Object.assign(P,{open:true,who:[],site:null,days:null,team:null,leave:false,edit:false});}
  else if(cmd==='close'){Object.assign(P,{open:false,who:[],site:null,days:null,team:null,leave:false,edit:false});}
  else if(cmd==='who'){if(P.edit)Object.assign(P,{who:[],site:null,days:null,edit:false});P.open=true;if(!P.who.includes(a))P.who.push(a);if(P.site){P.days=defDays();P.team=defTeam();}}
  else if(cmd==='unwho'){P.who=P.who.filter(x=>x!==a);if(!P.who.length)Object.assign(P,{site:P.edit?null:P.site,days:null,edit:false});else if(P.site)P.days=defDays();}
  else if(cmd==='here'){Object.assign(P,{open:true,who:[],site:a,days:null,team:null,leave:false,edit:false});}
  else if(cmd==='site'){P.site=a;P.days=defDays();P.team=defTeam();}
  else if(cmd==='resite'){P.site=null;P.days=null;P.edit=false;}
  else if(cmd==='team'){const [s,t,ids]=a.split('|');Object.assign(P,{open:true,who:ids.split(',').filter(Boolean),site:s,edit:false,leave:false});P.days=defDays();P.team=t||null;}
  else if(cmd==='teamsel'){const [s,t]=a.split('|');const ids=X.DATA.personnes.filter(p=>js.some(d=>M.sitesOf(p,d).includes(s))&&X.teamOf(M.aff,p.id,s)===t).map(p=>p.id);Object.assign(P,{open:true,who:ids,site:null,days:null,team:t||null,leave:false,edit:false});}
  else if(cmd==='edit'){const [pid,s]=a.split('|');Object.assign(P,{open:true,who:[pid],site:s,edit:true,leave:false});P.days=defDays();P.team=X.teamOf(M.aff,pid,s)||null;}
  else if(cmd==='day'){const d=a;const L=P.days||[];P.days=L.includes(d)?L.filter(x=>x!==d):L.concat([d]).sort();}
  else if(cmd==='leave'){P.leave=!P.leave;}
  else if(cmd==='tteam'){P.team=a||null;}
  else if(cmd==='ok'){if(!P.site||!P.who.length)return;const days=P.days||[];const patch={};const c=X.site(P.site);
    P.who.forEach(key=>{const o=Object.assign({},M.aff[key]||{});js.forEach(d=>{let L=(o[d]||[]).slice();const on=days.includes(d);if(on&&!L.includes(P.site))L.push(P.site);if(!on&&P.edit)L=L.filter(x=>x!==P.site);if(on&&P.leave)L=[P.site];if(L.length)o[d]=L;else delete o[d];});
      if(js.some(d=>(o[d]||[]).includes(P.site))){if(P.team)o['eq:'+P.site]=P.team;else delete o['eq:'+P.site];}else delete o['eq:'+P.site];
      patch[key]=Object.keys(o).length?o:null;const p=X.pers(key);if(!X.secteurDe(p)&&c.secteur&&String(key).includes('@'))X.savePeoplePart(key,'secteur',c.secteur);});
    X.savePlanning(M.wk,patch);const n=P.who.length,w1=X.pers(P.who[0]);Object.assign(P,{open:false,who:[],site:null,days:null,team:null,leave:false,edit:false});
    X.render();X.msg((n>1?n+' personnes':w1.prenom)+' · '+c.nom+' : '+(days.length?days.map(d=>X.fJour(d).slice(0,4)).join(', '):'plus aucun jour'));return;}
  else if(cmd==='rm'){if(!P.site||!P.who.length)return;const patch={};const c=X.site(P.site);P.who.forEach(key=>{const o=Object.assign({},M.aff[key]||{});js.forEach(d=>{if(o[d]){o[d]=o[d].filter(x=>x!==P.site);if(!o[d].length)delete o[d];}});delete o['eq:'+P.site];patch[key]=Object.keys(o).length?o:null;});
    X.savePlanning(M.wk,patch);const w1=X.pers(P.who[0]);Object.assign(P,{open:false,who:[],site:null,days:null,team:null,leave:false,edit:false});X.render();X.msg(w1.prenom+' retiré'+(w1.genre==='femme'?'e':'')+' de '+c.nom+' cette semaine');return;}
  else if(cmd==='copy'){const r=X.copyPrev(M.wk,M.mine.map(p=>p.id));X.render();X.msg(r.n?r.n+' personne'+(r.n>1?'s':'')+' reprise'+(r.n>1?'s':'')+' de la semaine '+X.numSemaine(M.jp[0])+(r.fer.length?' · '+r.fer.map(d=>X.fJour(d)).join(', ')+' férié : pas repris':''):'Rien à reprendre : la semaine passée est vide ou tout le monde est déjà placé');return;}
  X.render();if(['who','here','site','team','teamsel','edit','open'].includes(cmd))setTimeout(()=>{const el=document.getElementById('pi-panel');if(el&&el.scrollIntoView)el.scrollIntoView({block:'nearest',behavior:'smooth'});},30);}

/* ═══ « DEMAIN : CHANTIER X » (Moi / accueil du gars) ═══ */
const JOURS=['Dimanche','Lundi','Mardi','Mercredi','Jeudi','Vendredi','Samedi'];
export function piDemain(me,X,compact){const t=X.DATA.today;let d=X.addDays(t,1);while([0,6].includes(X.D(d).getDay()))d=X.addDays(d,1);
  const lab=d===X.addDays(t,1)?'Demain':JOURS[X.D(d).getDay()];const fer=X.isFerie(d);const ids=X.planDe(me.id,d);
  let d2=null,ids2=[];if(fer){d2=X.addDays(d,1);while([0,6].includes(X.D(d2).getDay())||X.isFerie(d2))d2=X.addDays(d2,1);ids2=X.planDe(me.id,d2);}
  const ligne=(ids,dd)=>ids.length?ids.map(i=>{const c=X.site(i);const avec=X.avecMoi(me,i,dd).map(p=>p.prenom);const fi=X.ficheDe(i);return `📍 <b>${esc(c.nom)}</b>${c.ville&&!c.nom.includes(c.ville)?' <span class="eq-s" style="display:inline">· '+esc(c.ville)+'</span>':''}${!compact&&avec.length?`<div class="eq-s">avec ${esc(avec.join(', '))}</div>`:''}${!compact&&fi.horaires?`<div class="eq-s">🕗 ${esc(fi.horaires)}</div>`:''}`;}).join('<br>'):'<span class="eq-s" style="display:inline">pas encore de chantier prévu</span>';
  const quand=lab==='Demain'?'Demain · '+X.fJour(d):lab+' '+X.fJour(d).slice(5); /* « Demain · mar. 10/11 » ; le vendredi : « Lundi 16/11 » */
  const html=fer?`<b>${esc(quand)}</b> : férié${d2?`<div style="margin-top:4px"><b>${esc(X.fJour(d2))}</b> : ${ligne(ids2,d2)}</div>`:''}`:`<b>${esc(quand)}</b> : ${ligne(ids,d)}`;
  if(compact)return `<div class="ac-team pi-demain" style="display:block;margin-top:6px">${html}</div>`;
  return `<div class="card pi-demain"><div class="pi-dem"><span class="ic">🗓️</span><div class="eq-grow">${html}${!ids.length&&!(fer&&ids2.length)?'<div class="eq-s">Ton conducteur n\'a pas encore fait le planning — tu le verras ici dès qu\'il est fait.</div>':''}</div></div></div>`;}

/* ═══ PRODUCTION PAR ÉQUIPE : tableau jour / semaine ═══ */
function prodModel(me,X){const S=X.S;const k=S.peWeek||0;const js=X.semaineDe(k),wk=X.weekKey(js[0]);const today=X.DATA.today;const aff=X.aff(wk);
  const mode=S.piPm==='jour'?'jour':'sem';const past=js.filter(d=>d<=today);const day=js.includes(S.piPd)&&S.piPd<=today?S.piPd:(past[past.length-1]||js[0]);
  const days=mode==='jour'?[day]:past;const sc=X.objScope(me,js);const PS=X.prodParSite();const obj=X.featOn('objectifs');
  const sites=sc.sites.map(c=>{const net=X.netOf(c.id);const loaded=!!(net&&net._lines);
    const people=X.DATA.personnes.filter(p=>p.active&&days.some(d=>X.planDe(p.id,d).includes(c.id)));
    const letters=[...new Set(people.map(p=>X.teamOf(aff,p.id,c.id)))].filter(t=>!sc.teams[c.id]||t===sc.teams[c.id]).sort((a,b)=>a===''?1:b===''?-1:a.localeCompare(b));
    const teams=letters.map(t=>{const L=people.filter(p=>X.teamOf(aff,p.id,c.id)===t);const tot={soudures:0,retractions:0,fils:0,ml:0,h:0};const per=L.map(p=>{const o={soudures:0,retractions:0,fils:0,ml:0,h:0};
        days.forEach(d=>{if(!X.planDe(p.id,d).includes(c.id))return;const pr=(((PS[c.id]||{})[p.id])||{})[d]||{};['soudures','retractions','fils','ml'].forEach(x=>{o[x]+=+pr[x]||0;});const x=X.ptDe(p.id,d);if(x&&(x.site===c.id||!x.site||X.planDe(p.id,d).length===1))o.h+=X.calc(x).total;});
        Object.keys(tot).forEach(x=>{tot[x]+=o[x];});return {p,o};});
      /* objectif = missions de l'équipe sur la période : soudures / manchons visés sur le plan (et faits, lus sur le plan : objProgress), heures estimées */
      const ms=obj?days.flatMap(d=>X.missionsOf(net,d)).filter(m=>(m.team||'')===t||(!t&&!m.team)):[];let oS=0,oSd=0,oM=0,oMd=0,oH=0;ms.forEach(m=>{oH+=+m.h||0;let pr=null;try{pr=X.objOnPlan(m)&&X.A.objProgress?X.A.objProgress(c.id,m):null;}catch(e){}if(pr){if(m.type==='manch'){oM+=pr.n;oMd+=pr.done;}else if(m.type==='soud'){oS+=pr.n;oSd+=pr.done;}}});
      return {t,L,per,tot,obj:ms.length?{n:ms.length,s:oS,sd:oSd,m:oM,md:oMd,h:oH}:null};});
    return {c,loaded,net,teams,people};});
  return {k,js,wk,mode,day,days,sites,today};}
const gauge=(v,max,cls)=>{const pc=max>0?Math.max(0,Math.min(100,Math.round(v/max*100))):0;return `<div class="pi-g${cls?' '+cls:''}" role="img" aria-label="${pc} %"><i style="width:${pc}%"></i></div>`;};
/* barre de l'équipe : réalisé / objectif quand un objectif chiffré existe (soudures, manchons, sinon heures estimées), sinon comparée à la meilleure équipe (gris) */
function teamBar(T,maxU){const o=T.obj,t=T.tot;if(o&&(o.s||o.m)){const goal=o.s+o.m,val=o.sd+o.md;const pc=Math.round(val/goal*100);
    const lab=[o.s?`${nb(o.sd)} / ${nb(o.s)} soudures`:'',o.m?`${nb(o.md)} / ${nb(o.m)} manchons`:''].filter(Boolean).join(' · ');
    return gauge(val,goal,pc>=100?'ok':'')+`<span class="pi-gl">🎯 objectif : ${lab} · <b>${pc} %</b>${o.h?' · '+r1(o.h)+' h estimées':''}</span>`;}
  if(o&&o.h)return gauge(t.h/60,o.h,t.h/60>=o.h?'ok':'')+`<span class="pi-gl">🎯 objectif : ${r1(o.h)} h estimées · ${r1(t.h/60)} h pointées</span>`;
  const u=t.soudures+t.retractions;return gauge(u,maxU,'rel')+`<span class="pi-gl">${u?nb(t.soudures)+' soudure'+(t.soudures>1?'s':'')+' · '+nb(t.retractions)+' manchon'+(t.retractions>1?'s':''):'rien de compté'} · pas d'objectif posé</span>`;}
const hh=m=>{m=Math.round(+m||0);return m?Math.floor(m/60)+' h '+String(m%60).padStart(2,'0'):'—';};
const mlTxt=v=>v>0?nb(Math.round(v)):'—';
export function piProd(me,X){if(!X.featOn('prod_tableau'))return '';const M=prodModel(me,X);const maxU=Math.max(1,...M.sites.flatMap(s=>s.teams.map(T=>T.tot.soudures+T.tot.retractions)));
  const per=M.mode==='jour'?X.fJour(M.day):'semaine '+X.numSemaine(M.js[0])+(M.days.length<5?' (jusqu\'à '+X.fJour(M.days[M.days.length-1]||M.js[0]).slice(0,4)+')':'');
  const tabs=M.sites.filter(s=>s.teams.length).map(s=>`<div class="card pi-site"><h3>📍 ${esc(s.c.nom)} <span class="hint">· ${s.people.length} personne${s.people.length>1?'s':''}${s.loaded?'':' · <b style="color:#9a3410">fiches pas chargées : production non comptée</b>'}</span></h3>
    <div style="overflow-x:auto"><table class="pi-tab"><tr><th>Équipe</th><th>Soud.</th><th>Manch.</th><th>ml</th><th>Heures</th></tr>${s.teams.map(T=>`<tr><td><b>${T.t?'Équipe '+esc(T.t):s.teams.length>1?'Sans équipe':'Tout le chantier'}</b><small>${esc(T.L.map(p=>p.prenom+' ('+(X.poste(p).label||'').toLowerCase()+')').join(', '))}</small></td><td>${nb(T.tot.soudures)}</td><td>${nb(T.tot.retractions)}</td><td>${mlTxt(T.tot.ml)}</td><td>${hh(T.tot.h)}</td></tr><tr class="bar"><td colspan="5">${teamBar(T,maxU)}</td></tr>`).join('')}
    ${s.teams.length>1?`<tr class="tot"><td>Chantier</td><td>${nb(s.teams.reduce((a,T)=>a+T.tot.soudures,0))}</td><td>${nb(s.teams.reduce((a,T)=>a+T.tot.retractions,0))}</td><td>${mlTxt(s.teams.reduce((a,T)=>a+T.tot.ml,0))}</td><td>${hh(s.teams.reduce((a,T)=>a+T.tot.h,0))}</td></tr>`:''}</table></div></div>`).join('');
  const SC=M.sites.filter(s=>s.teams.length); /* les chantiers concernés (quelqu'un y est placé sur la période) */
  const scope=SC.length?`<div class="pi-scope">Calcul sur les fiches de soudure présentes sur cet appareil : ${SC.map(s=>s.loaded?`<span class="ok">✓ ${esc(s.c.nom)}</span>`:`<span class="no">✗ ${esc(s.c.nom)} (pas chargé)</span>`).join(' · ')}.${SC.some(s=>!s.loaded)?`<br>Pour compter un chantier ✗ : ouvre-le une fois sur cet appareil, puis reviens ici. ${SC.filter(s=>!s.loaded).slice(0,4).map(s=>`<button class="btn" data-act="opensite" data-v="${esc(s.c.id)}">Ouvrir ${esc(s.c.nom)}</button>`).join('')}`:''}</div>`:'';
  return `<div class="card pi-prod"><h3>Tableau par équipe <span class="hint">· ${esc(per)}</span></h3>
    <div class="pi-pm"><button class="chip${M.mode==='sem'?' active':''}" data-act="pi" data-v="pm|sem">Semaine</button><button class="chip${M.mode==='jour'?' active':''}" data-act="pi" data-v="pm|jour">Jour</button>${M.mode==='jour'?M.js.filter(d=>d<=M.today).map(d=>`<button class="chip${d===M.day?' active':''}" data-act="pi" data-v="pd|${d}">${esc(X.fJour(d))}</button>`).join(''):''}<button class="btn" style="margin-left:auto;min-height:40px" data-act="pi" data-v="print|">🖨 Imprimer (A4)</button></div>
    ${scope}</div>${tabs?`<div class="pi-sites">${tabs}</div>`:`<div class="card"><div class="eq-s">${M.days.length?'Personne de placé sur tes chantiers pour cette période.':'Période pas encore commencée.'}</div></div>`}
    <div class="hint" style="margin:4px 0 10px">Soudures et manchons : fiches de soudure signées au nom de chacun, le jour où il est placé sur ce chantier ; ml = longueur de tube de part et d'autre des soudures faites (aller et retour comptés, « — » si le plan n'a pas les longueurs) ; heures = pointages (déclarés, validés) ; objectif = missions posées pour l'équipe${X.featOn('objectifs')?'':' (option Objectifs non active)'}. Détail par personne ci-dessous.</div>`;}
function prodPrint(me,X){const M=prodModel(me,X);const per=M.mode==='jour'?X.fJourLong(M.day):'Semaine '+X.numSemaine(M.js[0])+' · du '+X.fDate(M.js[0])+' au '+X.fDate(M.js[4]);
  const body=M.sites.filter(s=>s.teams.length).map(s=>`<h2>${esc(s.c.nom)}${s.c.ville?' · '+esc(s.c.ville):''}</h2>${s.loaded?'':'<div class="card notice">Fiches de soudure pas chargées sur l\'appareil qui imprime : production non comptée pour ce chantier.</div>'}
    <table><tr><th>Équipe</th><th>Personnes</th><th class="n">Soudures</th><th class="n">Manchons</th><th class="n">ml</th><th class="n">Heures</th><th>Objectif</th></tr>${s.teams.map(T=>{const o=T.obj;const ob=o?[o.s?nb(o.sd)+' / '+nb(o.s)+' soud.':'',o.m?nb(o.md)+' / '+nb(o.m)+' manch.':'',o.h?r1(o.h)+' h estimées':''].filter(Boolean).join(' · '):'—';
      return `<tr><td><b>${T.t?'Équipe '+esc(T.t):s.teams.length>1?'Sans équipe':'Tout le chantier'}</b></td><td>${esc(T.L.map(p=>X.nomC(p)+' ('+(X.poste(p).label||'').toLowerCase()+')').join(', '))}</td><td class="n">${nb(T.tot.soudures)}</td><td class="n">${nb(T.tot.retractions)}</td><td class="n">${mlTxt(T.tot.ml)}</td><td class="n">${hh(T.tot.h)}</td><td>${esc(ob)}</td></tr>`;}).join('')}${s.teams.length>1?`<tr><td><b>Chantier</b></td><td></td><td class="n"><b>${nb(s.teams.reduce((a,T)=>a+T.tot.soudures,0))}</b></td><td class="n"><b>${nb(s.teams.reduce((a,T)=>a+T.tot.retractions,0))}</b></td><td class="n"><b>${mlTxt(s.teams.reduce((a,T)=>a+T.tot.ml,0))}</b></td><td class="n"><b>${hh(s.teams.reduce((a,T)=>a+T.tot.h,0))}</b></td><td></td></tr>`:''}</table>
    <h3>Détail par personne</h3><table><tr><th>Personne</th><th>Équipe</th><th class="n">Soudures</th><th class="n">Manchons</th><th class="n">ml</th><th class="n">Heures</th></tr>${s.teams.flatMap(T=>T.per.map(({p,o})=>`<tr><td>${esc(X.nomC(p))}</td><td>${T.t?esc(T.t):'—'}</td><td class="n">${nb(o.soudures)}</td><td class="n">${nb(o.retractions)}</td><td class="n">${mlTxt(o.ml)}</td><td class="n">${hh(o.h)}</td></tr>`)).join('')}</table>`).join('')||'<p>Personne de placé sur la période.</p>';
  const html=docHTML({title:'Production par équipe — '+(M.mode==='jour'?X.fDate(M.day):'S'+X.numSemaine(M.js[0])),h1:'Production par équipe',kicker:'Pilotage · production',sub:esc(per),meta:[['Période',esc(per)],['Chantiers comptés',esc(M.sites.filter(s=>s.loaded&&s.teams.length).map(s=>s.c.nom).join(', ')||'aucun')],['Pas chargés',esc(M.sites.filter(s=>!s.loaded&&s.teams.length).map(s=>s.c.nom).join(', '))],['Édité par',esc(X.nomC(me))]],body:body+'<p class="muted" style="margin-top:14px;font-size:11px">Calcul sur les fiches de soudure présentes sur l\'appareil qui imprime (soudures et manchons signés au nom de chacun, le jour où il est placé sur le chantier) ; ml = longueur de tube de part et d\'autre des soudures faites (aller et retour) ; heures = pointages.</p>',footLeft:'Production par équipe'});
  let w=null;try{w=window.open('','_blank');}catch(e){}if(!w){X.msg('Autorise la fenêtre pop-up pour imprimer');return;}w.document.write(html);w.document.close();}

/* ═══ actions (data-act="pi" data-v="commande|arguments") ═══ */
export function piAct(v,el,me,X){const s=String(v||'');const i=s.indexOf('|');const cmd=i<0?s:s.slice(0,i),a=i<0?'':s.slice(i+1);const S=X.S;
  if(cmd==='pm'){S.piPm=a==='jour'?'jour':'sem';X.render();return;}
  if(cmd==='pd'){S.piPd=a;S.piPm='jour';X.render();return;}
  if(cmd==='print'){prodPrint(me,X);return;}
  if(cmd==='fin'){S.piFin=a;X.render();setTimeout(()=>{const e=document.getElementById('pi-fin-h');if(e)e.focus();},30);return;}
  if(cmd==='finok'){if(X.viewing()){X.viewOnly();return;}const h=(document.getElementById('pi-fin-h')||{}).value||'';X.finManquante(a,h);return;}
  if(cmd==='saisie'){S.piSaisie=a;X.render();return;}
  if(cmd==='saisiex'){S.piSaisie=null;X.render();return;}
  if(cmd==='saisieok'){if(X.viewing()){X.viewOnly();return;}const g=k=>(document.getElementById('pi-s-'+k)||{}).value||'';X.saisieJour(a,{h0:g('h0'),h1:g('h1'),p0:g('p0'),pd:+g('pd')||0,motif:g('m')});return;}
  planAct(cmd,a,me,X);}
