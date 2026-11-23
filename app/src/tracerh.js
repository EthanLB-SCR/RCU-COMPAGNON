// tracerh.js — TRACÉ RESSOURCES HUMAINES (10/11/2026, demande d'Ethan) : un seul endroit pour tout ce qui est RH.
// Fédère ce qui existait déjà (navettes de paie, compteurs d'heures, grands déplacements, déclarations d'accident, habilitations) et ajoute
// quatre registres partagés : absences et congés (rhabs), contraventions (rhpv), plan de formation (rhform), mutuelle (rhmut).
// Droits : RH / direction / administrateur (rh.voir, rh.edit) voient et modifient tout ; chacun voit SON dossier (lecture). Serveur : sql/rh_1011.sql (à passer par Ethan).
import {regAll,regGet,regSet,regDelete,regLoad,regMissing} from './reg.js';
import {vehAll} from './flotte.js';
import {HAB_TYPES,cTableHabs,habsDe,espaceNavMois,espaceNavRegler,espaceNavChoisir,espaceNavRegle,espaceNavRegleSet,espaceRhControle} from './espace.js';
import {isFerie} from './rh.js'; /* 19/11 nuit : les fériés (règle de la semaine, contrôle global) */
import {lisserSemaine} from './navette.js'; /* 19/11 nuit : aperçu en direct d'une semaine réglée à la main (le même calcul que la navette) */
let A=null;const ID='rh';
const esc=s=>String(s==null?'':s).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const todayIso=()=>{const d=new Date();return d.getFullYear()+'-'+String(d.getMonth()+1).padStart(2,'0')+'-'+String(d.getDate()).padStart(2,'0');};
const fDate=d=>d?String(d).slice(8,10)+'/'+String(d).slice(5,7)+'/'+String(d).slice(0,4):'';
const eur=n=>(Math.round(+n||0)).toLocaleString('fr-FR')+' €';
const uid=()=>Date.now().toString(36)+Math.random().toString(36).slice(2,6);
const nomDe=p=>p?((p.prenom||'')+' '+(p.nom||'')).trim()||p.id:'?';
/* ── droits ── */
const rhVoir=(me,ctx)=>!!me&&(me.admin||ctx.can('rh.voir')||ctx.can('rh.edit'));
const rhEdit=(me,ctx)=>!!me&&(me.admin||ctx.can('rh.edit'));
const absEdit=(me,ctx)=>rhEdit(me,ctx)||(!!me&&ctx.can('rh.abs')); /* 10/11 (Ethan) : absences et congés = responsable d'exploitation, RH, assistante RH */
const absVoir=(me,ctx)=>rhVoir(me,ctx)||absEdit(me,ctx);
const navEdit=(me,ctx)=>!!me&&(me.admin||ctx.can('rh.edit')||ctx.can('rh.nav')); /* 10/11 nuit (Ethan) : contrôle des navettes, choix « reporter ou prime » = la RH ou le responsable d'exploitation */
const navVoir=(me,ctx)=>rhVoir(me,ctx)||navEdit(me,ctx);
const keyOf=(p,ctx)=>p?(ctx.personKey?ctx.personKey(p):(p.email||p.id)).toLowerCase():'';
const demoOpts=rid=>String(rid||'').startsWith('l:')?{local:true}:undefined; /* 11/11 : ligne d'un personnage de démo (bac à sable, clé « l:… ») → reste sur l'appareil, comme les compteurs et les navettes (espace.js) ; avant, elle partait au serveur */
const mine=(r,me,ctx)=>!!me&&String(r.id||'').split('|')[0]===keyOf(me,ctx);
/* ── 19/11 nuit (Ethan : « que le module soit stylé bien 2026, moderne — comme Flotte, et mieux si tu y arrives ») : l'habillage du module RH, tout sous .rh2
   (aucun autre écran n'est touché ; les écrans de Pilotage affichés ici — grands déplacements, compteurs, rapport — gardent leur structure). ── */
let CSS2=false;function css2(){if(CSS2||typeof document==='undefined')return;CSS2=true;const st=document.createElement('style');st.id='css-rh2';
  st.textContent=`.rh2{--rh-n:#2B1B5A;--rh-v:#5E46B8;--rh-vl:#EEECFA;--rh-ok:#17824a;--rh-okl:#e4f5ea;--rh-w:#9a5b00;--rh-wl:#fff1d1;--rh-b:#b3261e;--rh-bl:#fde9e6;--rh-a:#1f55a8;--rh-al:#e5eefb}
.rh2 .rh-head{display:flex;flex-wrap:wrap;align-items:center;justify-content:space-between;gap:10px 14px;padding:14px 16px;margin:0 0 10px;border-radius:18px;background:linear-gradient(135deg,#2B1B5A 0%,#4a35a0 62%,#5E46B8 100%);color:#fff;box-shadow:0 12px 28px -18px rgba(43,27,90,.7)}
.rh2 .rh-head h2.vt{margin:0;color:#fff;font-size:19px;letter-spacing:-.01em;flex:1 1 220px;min-width:0}.rh2 .rh-head h2.vt .hint{color:rgba(255,255,255,.74);font-weight:500}
.rh2 .rh-pop{display:inline-flex;max-width:100%;background:rgba(255,255,255,.14);border-radius:999px;padding:3px;gap:2px;overflow-x:auto;scrollbar-width:none}
.rh2 .rh-popb{border:0;background:none;color:#fff;font:inherit;font-size:13px;font-weight:600;border-radius:999px;padding:0 12px;min-height:38px;cursor:pointer;white-space:nowrap;flex:none}
.rh2 .rh-popb b{font-weight:700;opacity:.72;margin-left:3px}.rh2 .rh-popb.on{background:#fff;color:var(--rh-n)}.rh2 .rh-popb.on b{opacity:1}.rh2 .rh-popb:focus-visible{outline:2px solid #fff;outline-offset:1px}
.rh2 .rh-tabs{display:flex!important;flex-wrap:nowrap!important;gap:6px!important;overflow-x:auto;scrollbar-width:none;padding:2px 2px 8px;margin:0 -2px 4px!important;scroll-snap-type:x proximity;-webkit-overflow-scrolling:touch}
.rh2 .rh-tabs::-webkit-scrollbar,.rh2 .rh-pop::-webkit-scrollbar,.rh2 .rh-wks::-webkit-scrollbar{display:none}
.rh2 .rh-tabs .btn.sm{flex:none;scroll-snap-align:start;min-height:42px;border-radius:999px;padding:0 14px;font-size:13px;font-weight:600;background:var(--surface);border:1px solid var(--line);color:var(--ink2);white-space:nowrap}
.rh2 .rh-tabs .btn.sm.primary{background:var(--rh-n);border-color:var(--rh-n);color:#fff;box-shadow:0 8px 16px -10px rgba(43,27,90,.8)}
.rh2 .card{border-radius:16px;box-shadow:0 1px 2px rgba(20,16,40,.04),0 12px 26px -20px rgba(20,16,40,.3)}
.rh2 .ac-stats{display:grid;grid-template-columns:repeat(auto-fit,minmax(124px,1fr));gap:8px}
.rh2 .ac-stat{background:var(--surface);border:1px solid var(--line);border-radius:14px;padding:10px 12px 10px 14px;position:relative;overflow:hidden;text-align:left;font:inherit;color:inherit}
.rh2 .ac-stat::before{content:'';position:absolute;left:0;top:0;bottom:0;width:4px;background:var(--rh-v);opacity:.3}
.rh2 .ac-stat.warn::before{background:#e0a020;opacity:1}.rh2 .ac-stat.bad::before{background:var(--rh-b);opacity:1}.rh2 .ac-stat.ok::before{background:var(--rh-ok);opacity:1}
.rh2 .ac-stat b{font-size:22px;font-weight:800;letter-spacing:-.02em}.rh2 .ac-stat.warn b{color:var(--rh-w)}.rh2 .ac-stat.bad b{color:var(--rh-b)}.rh2 .ac-stat.ok b{color:var(--rh-ok)}
.rh2 button.ac-stat{cursor:pointer}.rh2 button.ac-stat:hover{border-color:#C9C2EE}
.rh2 .rh-int{display:inline-block;font-size:10.5px;font-weight:700;border-radius:999px;padding:1px 7px;background:var(--rh-wl);color:#7a4a00;border:1px solid #f0d28a;white-space:nowrap;vertical-align:1px}
.rh2 .rh-pers{display:flex;align-items:center;gap:8px;min-width:0}.rh2 .rh-av{flex:none;width:30px;height:30px;border-radius:50%;display:grid;place-items:center;background:var(--rh-vl);color:var(--rh-n);font-size:11px;font-weight:800;font-style:normal;letter-spacing:.02em}
.rh2 .rh-av.int{background:var(--rh-wl);color:#7a4a00}.rh2 .rh-pn{display:flex;flex-direction:column;min-width:0;line-height:1.2}.rh2 .rh-pn b{font-size:12.5px;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}.rh2 .rh-pn small{font-size:10.5px;color:var(--muted);white-space:nowrap;overflow:hidden;text-overflow:ellipsis}
.rh2 .rh-grid{overflow:auto;border:1px solid var(--line);border-radius:14px;background:var(--surface);-webkit-overflow-scrolling:touch}
.rh2 table.rh-t{border-collapse:separate;border-spacing:0;width:100%;font-size:12.5px;margin:0;display:table;background:none}
.rh2 table.rh-t th{position:sticky;top:0;z-index:2;background:#f6f5f1;color:var(--ink2);font-weight:650;font-size:11.5px;padding:7px 6px;border-bottom:1px solid var(--line);white-space:nowrap;text-align:center}
.rh2 table.rh-t td{padding:4px 4px;border-bottom:1px solid #efede7;vertical-align:middle;white-space:nowrap;text-align:center}
.rh2 table.rh-t th:first-child,.rh2 table.rh-t td:first-child{position:sticky;left:0;z-index:1;background:var(--surface);text-align:left;padding-left:10px;min-width:150px;max-width:210px;box-shadow:1px 0 0 var(--line)}
.rh2 table.rh-t th:first-child{z-index:3;background:#f6f5f1}.rh2 table.rh-t tr:last-child td{border-bottom:0}
.rh2 table.rh-t tr.rh-grp td{background:#f1eefb;color:var(--rh-n);font-size:11.5px;letter-spacing:.04em;text-transform:uppercase;text-align:left;padding:6px 10px;position:sticky;left:0}
.rh2 table.rh-t tr.rh-tot td{background:#faf8f3;font-weight:700;border-top:1px solid var(--line)}.rh2 table.rh-t td.r,.rh2 table.rh-t th.r{text-align:right;padding-right:10px}
.rh2 table.rh-t tr.al td:first-child{box-shadow:inset 4px 0 0 var(--rh-b),1px 0 0 var(--line)}
.rh2 .rh-wkb{border:1px solid transparent;background:none;font:inherit;font-size:11.5px;font-weight:650;color:var(--ink2);border-radius:10px;padding:3px 8px;min-height:40px;cursor:pointer;line-height:1.15}
.rh2 .rh-wkb small{display:block;font-weight:400;font-size:10.5px;color:var(--muted)}.rh2 .rh-wkb:hover,.rh2 .rh-wkb:focus-visible{border-color:#C9C2EE;background:#fff}
.rh2 .rh-wkb i{display:inline-block;font-style:normal;font-size:9.5px;font-weight:700;border-radius:999px;padding:0 5px;margin-left:3px;vertical-align:1px}.rh2 .rh-wkb i.fe{background:#eceae3;color:#5b574e}.rh2 .rh-wkb i.rg{background:var(--rh-vl);color:var(--rh-v)}
.rh2 .rh-c{display:flex;flex-direction:column;align-items:flex-start;justify-content:center;gap:1px;width:100%;min-width:92px;min-height:44px;border-radius:10px;padding:4px 8px;border:1px solid transparent;font:inherit;text-align:left;cursor:pointer;line-height:1.15;color:inherit;background:none}
.rh2 .rh-c b{font-size:12.5px}.rh2 .rh-c small{font-size:10.5px;max-width:118px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;opacity:.85}
.rh2 .rh-c.pt{background:var(--rh-okl);color:#0f5132}.rh2 .rh-c.abs{background:var(--rh-al);color:#173f7d}.rh2 .rh-c.fer,.rh2 .rh-c.pont{background:repeating-linear-gradient(135deg,#f3f1ea 0 6px,#e9e7df 6px 12px);color:#5b574e}
.rh2 .rh-c.repos,.rh2 .rh-c.np{background:#f4f3ef;color:#6b675e}.rh2 .rh-c.trou{background:var(--rh-bl);border-color:#e9a19b;color:#8f1d16}.rh2 .rh-c.trou b{font-size:15px}
.rh2 .rh-c.futur{border:1px dashed #cfccc2;color:var(--ink2)}.rh2 .rh-c.am{opacity:.5}.rh2 .rh-c[data-st=am]{background:#f4f3ef;color:var(--muted)}.rh2 .rh-c.we,.rh2 .rh-c.hors{cursor:default;min-width:44px;color:var(--muted)}.rh2 .rh-c.inc{box-shadow:inset 0 0 0 2px #e0a020}
.rh2 .rh-c:not(.we):not(.hors):hover,.rh2 .rh-c:focus-visible{border-color:var(--rh-v)}
.rh2 table.rh-cal{table-layout:fixed;min-width:calc(150px + 31 * 26px)}.rh2 table.rh-cal th:first-child{width:170px}.rh2 table.rh-cal td.rh-dd{height:30px;padding:0;font-size:9.5px;font-weight:700;border-right:1px solid #f3f1ea;cursor:pointer;letter-spacing:-.02em}
.rh2 table.rh-cal th.d{padding:4px 0;font-size:10.5px;line-height:1.15}.rh2 table.rh-cal th.d small{display:block;font-weight:400;color:var(--muted);font-size:9.5px}
.rh2 table.rh-cal th.wk,.rh2 table.rh-cal td.wk{background:#f3f1ea}.rh2 table.rh-cal th.fe{color:#8f1d16}.rh2 table.rh-cal th.auj{box-shadow:inset 0 -3px 0 var(--rh-v)}
.rh2 td.rh-dd.pt{color:var(--rh-ok);font-size:8px}.rh2 td.rh-dd.fer,.rh2 td.rh-dd.pont{background:repeating-linear-gradient(135deg,#f3f1ea 0 5px,#e6e3da 5px 10px);color:#5b574e}
.rh2 td.rh-dd.trou{background:var(--rh-bl);color:#8f1d16;font-size:12px}.rh2 td.rh-dd.repos{color:var(--muted)}.rh2 td.rh-dd.hors{background:#faf9f6;cursor:default}
.rh2 .a-cp{background:#dbe8fb;color:#173f7d}.rh2 .a-rtt{background:#d7f0ee;color:#0d5a55}.rh2 .a-mal{background:#ece2f8;color:#55308f}.rh2 .a-at{background:#ffe1cf;color:#8a3a08}
.rh2 .a-ss{background:#ece7dc;color:#5c5136}.rh2 .a-inj{background:#f6c9c4;color:#7c1610}.rh2 .a-form{background:#dcf2dc;color:#1d5c1d}.rh2 .a-evt{background:#fbdcec;color:#8a1f58}.rh2 .a-autre,.rh2 .a-pont{background:#e4e7ec;color:#3b4a5c}
.rh2 .rh-leg{display:flex;flex-wrap:wrap;gap:6px 12px;margin:8px 2px 0;font-size:11.5px;color:var(--ink2)}.rh2 .rh-leg span{display:inline-flex;align-items:center;gap:5px}
.rh2 .rh-leg i{display:inline-grid;place-items:center;min-width:22px;height:18px;border-radius:5px;font-style:normal;font-size:9.5px;font-weight:700;padding:0 3px}
.rh2 .rh-wks{display:flex;gap:6px;overflow-x:auto;scrollbar-width:none;padding:2px 0 8px}.rh2 .rh-wks .chip{min-height:40px;flex:none}.rh2 .rh-wks .chip b.n{display:inline-grid;place-items:center;min-width:18px;height:18px;border-radius:999px;background:var(--rh-b);color:#fff;font-size:10.5px;padding:0 5px}
.rh2 .rh-wks .chip.active b.n{background:#fff;color:var(--rh-b)}
.rh2 .rh-al{display:flex;align-items:center;gap:10px;padding:8px 0;border-top:1px solid var(--line);flex-wrap:wrap}.rh2 .rh-al:first-child{border-top:0}.rh2 .rh-al .g{flex:1 1 200px;min-width:0}.rh2 .rh-al .g small{display:block;color:var(--ink2);font-size:12px;white-space:normal}
.rh2 .rh-al .eq-acts{margin:0;flex:none}.rh2 .rh-sub{font-size:12px;color:var(--ink2);margin:0 0 8px}
@media(max-width:640px){.rh2 table.rh-cal th:first-child{width:120px}.rh2 .rh-head{padding:12px;border-radius:16px}.rh2 .rh-head h2.vt{font-size:17px}.rh2 table.rh-t th:first-child,.rh2 table.rh-t td:first-child{min-width:118px;max-width:140px}.rh2 .rh-av{display:none}.rh2 .rh-c{min-width:78px}}`;
  document.head.appendChild(st);}
/* ── registres ── */
export const ABS_TYPES=[['cp','Congés payés'],['rtt','RTT'],['mal','Maladie'],['at','Arrêt accident du travail'],['ss','Sans solde'],['inj','Absence injustifiée'],['form','Formation'],['evt','Événement familial'],['autre','Autre']];
export const PV_STATUTS=[['recue','Reçue'],['designee','Conducteur désigné'],['payee','Payée'],['contestee','Contestée'],['classee','Classée']];
export const FORM_STATUTS=[['prevu','Prévue'],['fait','Faite'],['annule','Annulée']];
export const MUT_STATUTS=[['affilie','Affilié'],['dispense','Dispensé'],['attente','En attente de pièces'],['sortie','Sorti']];
export const MUT_REGIMES=[['isole','Isolé'],['duo','Duo'],['famille','Famille']];
export const MUT_MOTIFS=[['cdd','CDD / mission courte'],['conjoint','Couvert par le conjoint'],['autre','Autre couverture obligatoire'],['apprenti','Apprenti / temps très partiel'],['']];
/** nombre de jours ouvrés entre deux dates (lun → ven), fériés non déduits — la RH ajuste la valeur si besoin */
export function joursOuvres(d1,d2){if(!d1)return 0;const a=new Date(d1+'T12:00:00'),b=new Date((d2||d1)+'T12:00:00');if(isNaN(a)||isNaN(b)||b<a)return 0;let n=0;for(let t=new Date(a);t<=b;t.setDate(t.getDate()+1)){const w=t.getDay();if(w>=1&&w<=5)n++;}return n;}
/** échéance de désignation du conducteur d'une contravention : 45 jours après réception */
export function pvEcheance(pv){if(!pv||!pv.recu)return null;const d=new Date(pv.recu+'T12:00:00');d.setDate(d.getDate()+45);return d.toISOString().slice(0,10);}
const DEF={
  rhabs:{t:'Absences et congés',ic:'🏖',one:'absence',fields:[['p','person','Personne'],['type','select','Type',ABS_TYPES],['du','date','Du'],['au','date','Au'],['jours','number','Jours ouvrés'],['note','text','Note']],
    label:r=>(ABS_TYPES.find(x=>x[0]===r.type)||['','?'])[1]+' · '+fDate(r.du)+(r.au&&r.au!==r.du?' → '+fDate(r.au):'')+' · '+(+r.jours||0)+' j',sort:(a,b)=>String(b.du).localeCompare(String(a.du))},
  rhpv:{t:'Contraventions',ic:'🚔',one:'contravention',fields:[['recu','date','Avis reçu le'],['date','date','Infraction le'],['veh','vehicle','Véhicule'],['p','person','Conducteur désigné'],['lieu','text','Lieu'],['infraction','text','Infraction'],['montant','number','Montant (€)'],['statut','select','Statut',PV_STATUTS],['note','text','Note']],
    label:r=>(r.infraction||'Contravention')+' · '+fDate(r.date||r.recu)+(r.vehImmat?' · '+r.vehImmat:'')+(r.montant?' · '+eur(r.montant):''),sort:(a,b)=>String(b.recu||b.date).localeCompare(String(a.recu||a.date))},
  rhform:{t:'Plan de formation',ic:'🎓',one:'formation',fields:[['p','person','Personne'],['titre','text','Formation'],['hab','select','Habilitation visée',()=>[['','—']].concat(Object.keys(HAB_TYPES).map(k=>[k,HAB_TYPES[k].label]))],['organisme','text','Organisme'],['du','date','Du'],['au','date','Au'],['heures','number','Heures'],['cout','number','Coût (€ HT)'],['statut','select','Statut',FORM_STATUTS],['note','text','Note']],
    label:r=>(r.titre||'Formation')+(r.du?' · '+fDate(r.du):'')+(r.organisme?' · '+r.organisme:''),sort:(a,b)=>String(b.du||'').localeCompare(String(a.du||''))},
  rhmut:{t:'Mutuelle',ic:'🩺',one:'ligne mutuelle',fields:[['p','person','Personne'],['statut','select','Statut',MUT_STATUTS],['regime','select','Régime',MUT_REGIMES],['effet','date','Date d\'effet'],['motif','select','Motif de dispense',MUT_MOTIFS.filter(x=>x[0]).concat([['','—']])],['bulletin','check','Bulletin d\'adhésion reçu'],['justif','check','Justificatif de dispense reçu'],['note','text','Note']],
    label:r=>(MUT_STATUTS.find(x=>x[0]===r.statut)||['','?'])[1]+(r.regime?' · '+(MUT_REGIMES.find(x=>x[0]===r.regime)||['',''])[1]:'')+(r.effet?' · depuis le '+fDate(r.effet):''),sort:(a,b)=>String(b.effet||'').localeCompare(String(a.effet||''))},
};
const KINDS=Object.keys(DEF);
let loaded=false;function hook(ctx){if(ctx&&ctx.api)A=ctx.api;css2();if(!loaded){loaded=true;regLoad(KINDS.concat(['accident','cpth','vehicule'])).catch(()=>{});}
  try{if(typeof window!=='undefined'&&window.TRACE&&!window.TRACE.rh)window.TRACE.rh={rows:kind=>rows(kind),jours:joursOuvres,pvEch:pvEcheance,def:()=>DEF,controle:ym=>espaceRhControle(ym),regle:mon=>espaceNavRegle(mon),pop:v=>{if(v)POP=v;return POP;},provTest:(id,o)=>regSet('prov',id,Object.assign({status:'a_finaliser',demo:true},o),{local:true}) /* tests : une personne provisoire (intérimaire) sur l'appareil seulement */};}catch(e){}}
const rows=kind=>regAll(kind).filter(r=>r&&!r.deleted).sort(DEF[kind].sort);
const persOf=(ctx,id)=>(ctx.people||[]).find(p=>p.id===id)||null;
const activePeople=ctx=>(ctx.people||[]).filter(p=>p.active!==false&&!p.invite).sort((a,b)=>nomDe(a).localeCompare(nomDe(b),'fr'));
/* ── 19/11 nuit (Ethan : « important de distinguer les intérimaires des salariés ») : la population affichée (tout le monde · salariés · intérimaires), partout dans le module ── */
let POP='tous';
const estInt=p=>!!p&&p.type==='interim';
const popOk=p=>POP==='int'?estInt(p):POP==='sal'?!estInt(p):true;
const popPeople=ctx=>activePeople(ctx).filter(popOk);
const popRows=(L,ctx)=>POP==='tous'?L:L.filter(r=>{const p=persOf(ctx,r.p);return p?popOk(p):POP!=='int';}); /* une ligne sans personne (contravention pas encore désignée…) reste avec les salariés */
const popTxt=()=>POP==='int'?'intérimaires':POP==='sal'?'salariés':'';
const agenceDe=p=>(p&&(p.agence||(p.contrat&&p.contrat.agence)))||'';
const tagInt=p=>estInt(p)?` <span class="rh-int" title="Intérimaire${agenceDe(p)?' · '+esc(agenceDe(p)):''}${p.contrat&&p.contrat.fin?' · fin de mission le '+fDate(p.contrat.fin):''}">Intérim${agenceDe(p)?' · '+esc(agenceDe(p)):''}</span>`:'';
const ini=p=>(String(p&&p.prenom||'?').charAt(0)+String(p&&p.nom||'').charAt(0)).toUpperCase();
const pcell=(p,sub)=>`<span class="rh-pers"><i class="rh-av${estInt(p)?' int':''}">${esc(ini(p))}</i><span class="rh-pn"><b>${esc(nomDe(p))}</b>${sub?`<small>${sub}</small>`:''}</span></span>`;
/* lignes d'un tableau rangées en deux groupes (salariés, puis intérimaires) ; foot(groupe) = la ligne de total du groupe */
const grouper=(L,cols,rowOf,foot)=>{const G=[['sal','Salariés',L.filter(x=>!estInt(x.p))],['int','Intérimaires',L.filter(x=>estInt(x.p))]].filter(g=>g[2].length);
  return G.map(g=>`<tr class="rh-grp" data-grp="${g[0]}"><td colspan="${cols}">${g[1]} · ${g[2].length}</td></tr>`+g[2].map(rowOf).join('')+(foot?foot(g[2],g[1],g[0]):'')).join('');};
/** les lignes que « me » a le droit de voir : tout pour la RH, les siennes sinon */
const visible=(kind,me,ctx)=>(kind==='rhabs'?absVoir(me,ctx):rhVoir(me,ctx))?rows(kind):rows(kind).filter(r=>r.p===me.id||mine(r,me,ctx));
/* ── rendu ── */
const sel=(id,opts,val,blank)=>`<select class="f" id="${id}">${blank?`<option value="">${esc(blank)}</option>`:''}${opts.map(o=>`<option value="${esc(o[0])}"${String(val||'')===String(o[0])?' selected':''}>${esc(o[1])}</option>`).join('')}</select>`;
const btn=(k,v,t,cls)=>`<button class="btn${cls?' '+cls:''}" data-act="x" data-v="${ID}|${esc(k)}${v!=null?'|'+esc(v):''}">${t}</button>`;
function fieldHTML(f,r,ctx){const [k,type,label,opts]=f;const v=r[k];const id='rh-'+k;
  if(type==='person')return `<label class="f">${label}</label>${sel(id,activePeople(ctx).map(p=>[p.id,nomDe(p)]),v,'— choisir —')}`;
  if(type==='vehicle')return `<label class="f">${label}</label>${sel(id,vehAll().map(x=>[x.id,x.immat+(x.label?' · '+x.label:'')+(x.conducteur?' · '+x.conducteur:'')]),v,'— véhicule —')}`;
  if(type==='select')return `<label class="f">${label}</label>${sel(id,typeof opts==='function'?opts():opts,v)}`;
  if(type==='check')return `<label class="f" style="display:flex;gap:8px;align-items:center;margin-top:8px"><input type="checkbox" id="${id}"${v?' checked':''}> ${label}</label>`;
  if(type==='number')return `<label class="f">${label}</label><input class="f" id="${id}" type="number" step="any" inputmode="decimal" value="${v==null?'':esc(v)}">`;
  if(type==='date')return `<label class="f">${label}</label><input class="f" id="${id}" type="date" value="${esc(v||'')}">`;
  return `<label class="f">${label}</label><input class="f" id="${id}" value="${esc(v||'')}">`;}
function readForm(kind){const o={};DEF[kind].fields.forEach(([k,type])=>{const el=document.getElementById('rh-'+k);if(!el)return;if(type==='check')o[k]=!!el.checked;else if(type==='number')o[k]=el.value===''?null:+el.value;else o[k]=el.value||'';});return o;}
function modal(kind,id,me,ctx){const D=DEF[kind];const r=id?(regGet(kind,id)||{}):{};const isNew=!id;const api=ctx.api||A;
  const defaults=isNew?(kind==='rhabs'?{type:'cp',du:todayIso(),au:todayIso()}:kind==='rhpv'?{recu:todayIso(),statut:'recue'}:kind==='rhform'?{statut:'prevu'}:{statut:'affilie',regime:'isole'}):{};
  const R=Object.assign({},defaults,r);
  api.openModal(`<h3 style="margin-top:0">${D.ic} ${isNew?'Nouvelle '+D.one:D.one.charAt(0).toUpperCase()+D.one.slice(1)}</h3>${D.fields.map(f=>fieldHTML(f,R,ctx)).join('')}
    ${kind==='rhabs'?'<div class="hint" style="margin-top:6px">Les jours se calculent du lundi au vendredi entre les deux dates ; corrige si un férié ou une demi-journée change le compte.</div>':''}
    ${kind==='rhpv'?'<div class="hint" style="margin-top:6px">La désignation du conducteur doit partir sous 45 jours après réception de l\'avis ; sinon l\'entreprise paie l\'amende forfaitaire majorée.</div>':''}
    <div class="actions" style="margin-top:10px"><button class="btn primary block" id="rh-ok">${isNew?'Enregistrer':'Enregistrer les modifications'}</button>${isNew?'':`<button class="btn block" id="rh-del" style="border-color:#e9a1a1;color:#A3221F">Supprimer</button>`}<button class="btn block" data-close>Annuler</button></div>`);
  const g=k=>document.getElementById(k);
  if(kind==='rhabs'){const rec=()=>{const du=g('rh-du').value,au=g('rh-au').value||du;if(du&&au<du)g('rh-au').value=du;g('rh-jours').value=joursOuvres(du,g('rh-au').value||du);};['rh-du','rh-au'].forEach(k=>{if(g(k))g(k).addEventListener('change',rec);});if(isNew)rec();}
  if(kind==='rhpv'){const vs=g('rh-veh');if(vs)vs.addEventListener('change',()=>{const v=vehAll().find(x=>x.id===vs.value);const ps=g('rh-p');if(v&&v.conducteur&&ps&&!ps.value){const p=activePeople(ctx).find(q=>nomDe(q)===v.conducteur||q.id===v.conducteurId);if(p)ps.value=p.id;}});}
  g('rh-ok').onclick=()=>{const o=readForm(kind);if(DEF[kind].fields.some(([k,type])=>type==='person'&&!o[k]&&kind!=='rhpv')){ctx.toast('Choisis la personne');return;}
    if(kind==='rhabs'&&!o.du){ctx.toast('Donne la date');return;}if(kind==='rhform'&&!o.titre){ctx.toast('Donne l\'intitulé');return;}
    if(kind==='rhpv'){const v=vehAll().find(x=>x.id===o.veh);o.vehImmat=v?v.immat:'';if(o.p&&o.statut==='recue')o.statut='designee';}
    const p=persOf(ctx,o.p);const key=p?keyOf(p,ctx):'ent';const rid=id||(key+'|'+uid());
    const by=api.userName?api.userName():'';Object.assign(o,{upd:new Date().toISOString(),by});if(isNew)o.at=o.upd;
    regSet(kind,rid,o,demoOpts(rid));api.closeModal();ctx.toast('✓ '+D.one.charAt(0).toUpperCase()+D.one.slice(1)+' enregistrée');
    if(kind==='rhform'&&o.statut==='fait'&&o.hab&&p)setTimeout(()=>habFromForm(o,p,ctx),50);else ctx.render();};
  if(g('rh-del'))g('rh-del').onclick=()=>{if(!confirm('Supprimer cette '+D.one+' ?'))return;regDelete(kind,id,demoOpts(id));api.closeModal();ctx.render();};}
/** formation faite avec une habilitation visée : proposer d'inscrire l'habilitation sur la fiche de la personne */
function habFromForm(o,p,ctx){const api=ctx.api||A;const T=HAB_TYPES[o.hab];if(!T){ctx.render();return;}const d=o.au||o.du||todayIso();
  if(!ctx.savePart){ctx.render();return;}
  api.openModal(`<h3 style="margin-top:0">🎖 Inscrire l'habilitation ?</h3><div class="eq-s">${esc(nomDe(p))} a suivi « ${esc(o.titre)} » : inscrire <b>${esc(T.label)}</b> obtenue le ${fDate(d)} sur sa fiche (validité ${T.ans} an${T.ans>1?'s':''}) ?</div>
    <div class="actions" style="margin-top:10px"><button class="btn primary block" id="rh-habok">Oui, inscrire</button><button class="btn block" data-close>Non</button></div>`);
  document.getElementById('rh-habok').onclick=()=>{try{habWrite(p,{type:o.hab,date:d,fin:finHab(o.hab,d),ref:o.organisme||''},ctx);ctx.toast('✓ Habilitation inscrite');}catch(e){console.warn(e);ctx.toast('Habilitation non inscrite : '+e.message);}api.closeModal();ctx.render();};}
/** fin de validité = date d'obtention + durée du type ; une habilitation sans durée reste valide */
export function finHab(type,date){const T=HAB_TYPES[type];if(!T||!T.ans||!date)return '';const y=+date.slice(0,4)+T.ans;return y+date.slice(4);}
/** écrit / remplace l'habilitation d'un type sur la fiche de la personne (une seule par type : la plus récente) */
function habWrite(p,h,ctx){const cur=(habsDe(p)||[]).filter(x=>x.h).map(x=>x.h);const L=cur.filter(x=>x.type!==h.type).concat([h]);ctx.savePart(p.id,'habs',L);}
function habModal(pid,type,me,ctx){const api=ctx.api||A;const p=persOf(ctx,pid);const cur=p&&type?(habsDe(p).find(x=>x.type===type)||{}).h:null;const R=cur||{type:type||'',date:'',fin:'',ref:''};
  api.openModal(`<h3 style="margin-top:0">🎖 ${cur?'Habilitation':'Nouvelle habilitation'}</h3><label class="f">Personne</label>${sel('rh-p',activePeople(ctx).map(q=>[q.id,nomDe(q)]),pid,'— choisir —')}
    <label class="f">Habilitation</label>${sel('rh-type',Object.keys(HAB_TYPES).map(k=>[k,HAB_TYPES[k].label+(HAB_TYPES[k].ans?' · '+HAB_TYPES[k].ans+' ans':'')]),R.type,'— choisir —')}
    <label class="f">Obtenue le</label><input class="f" id="rh-date" type="date" value="${esc(R.date||'')}"><label class="f">Valable jusqu'au</label><input class="f" id="rh-fin" type="date" value="${esc(R.fin||'')}">
    <label class="f">Référence / organisme</label><input class="f" id="rh-ref" value="${esc(R.ref||'')}"><label class="f">Justificatif (PDF ou photo, 800 Ko max)</label><input class="f" id="rh-file" type="file" accept="application/pdf,image/*">${R.fileName?`<div class="hint">📎 ${esc(R.fileName)} déjà déposé — un nouveau fichier le remplace</div>`:''}
    <div class="actions" style="margin-top:10px"><button class="btn primary block" id="rh-ok">Enregistrer</button>${cur?'<button class="btn block" id="rh-del" style="border-color:#e9a1a1;color:#A3221F">Retirer</button>':''}<button class="btn block" data-close>Annuler</button></div>`);
  const g=k=>document.getElementById(k);const auto=()=>{const d=g('rh-date').value,t=g('rh-type').value;if(d&&t&&!g('rh-fin').dataset.touched)g('rh-fin').value=finHab(t,d);};g('rh-date').addEventListener('change',auto);g('rh-type').addEventListener('change',auto);g('rh-fin').addEventListener('input',()=>{g('rh-fin').dataset.touched='1';});
  g('rh-ok').onclick=async()=>{const q=persOf(ctx,g('rh-p').value),t=g('rh-type').value,d=g('rh-date').value;if(!q||!t){ctx.toast('Choisis la personne et l\'habilitation');return;}const h={type:t,date:d,fin:g('rh-fin').value||'',ref:g('rh-ref').value||''};
    const f=g('rh-file').files&&g('rh-file').files[0];if(f){if(f.size>800*1024){ctx.toast('Fichier trop lourd (800 Ko max) : photo plus petite ou PDF allégé');return;}h.fileName=f.name;h.fileData=await new Promise(res=>{const rd=new FileReader();rd.onload=()=>res(rd.result);rd.readAsDataURL(f);});}else if(cur&&cur.fileData){h.fileName=cur.fileName;h.fileData=cur.fileData;}
    habWrite(q,h,ctx);api.closeModal();ctx.toast('✓ Habilitation enregistrée');ctx.render();};
  if(g('rh-del'))g('rh-del').onclick=()=>{if(!confirm('Retirer cette habilitation de la fiche ?'))return;const L=(habsDe(p)||[]).filter(x=>x.h&&x.type!==type).map(x=>x.h);ctx.savePart(p.id,'habs',L);api.closeModal();ctx.render();};}
function habOpenFile(pid,type,ctx){const p=persOf(ctx,pid);const h=p&&(habsDe(p).find(x=>x.type===type)||{}).h;if(!h||!h.fileData){ctx.toast('Pas de justificatif déposé');return;}try{const w=window.open();if(w){w.document.write(h.fileData.startsWith('data:application/pdf')?`<iframe src="${h.fileData}" style="border:0;width:100vw;height:100vh"></iframe>`:`<img src="${h.fileData}" style="max-width:100%">`);w.document.title=h.fileName||'Justificatif';}}catch(e){ctx.toast('Ouverture impossible');}}
/* ── vues ── */
/* 19/11 nuit (Ethan : « Grands déplacements, je préfère une section dans le module RH ; Compteurs d'heures pareil ; Variables de paie · rapport RH : pas dans Pilotage, on l'a dans le
   module RH ») : sections « gd » et « cpt » (les écrans de Pilotage, tels quels, affichés ici par ctx.rhVue) ; le rapport de la semaine et ses CSV = section « paie », ouverte depuis
   les Navettes ou le tableau de bord (pas d'onglet : les Navettes sont l'écran de paie). Chacun garde les droits qu'il avait dans Pilotage (ctx.rhPeut). */
const peut=(ctx,k)=>!!(ctx&&ctx.rhPeut&&ctx.rhPeut(k));
const aVal=ctx=>{let n=0;try{n=(ctx&&ctx.rhAVal&&ctx.rhAVal())||0;}catch(e){}return n?` <span class="ac-n bad" title="${n} personne${n>1?'s':''} : des heures de la semaine dernière restent à valider">${n}</span>`:'';}; /* la pastille qu'avait la ligne de Pilotage */
const TABS=[['home','🏠','Tableau de bord'],['ctl','✅','Contrôle'],['nav','🧾','Navettes'],['gd','🧳','Grands déplacements'],['cpt','⏱','Compteurs d\'heures'],['abs','🏖','Absences · congés'],['hab','🎖','Habilitations'],['form','🎓','Formation'],['pv','🚔','Contraventions'],['mut','🩺','Mutuelle'],['acc','⚠','Accidents']];
const tabs=(cur,me,ctx)=>`<div class="eq-tabs rh-tabs" style="display:flex;flex-wrap:wrap;gap:6px;margin:0 0 10px">${TABS.filter(t=>t[0]==='gd'||t[0]==='cpt'?peut(ctx,t[0]):(rhVoir(me,ctx)||['home','abs','hab','form','mut'].includes(t[0])||((t[0]==='nav'||t[0]==='ctl')&&navVoir(me,ctx)))).map(t=>`<button class="btn sm${cur===t[0]?' primary':''}" data-act="x" data-v="${ID}|tab|${t[0]}">${t[1]} ${t[2]}</button>`).join('')}</div>`;
/* l'en-tête du module : le titre, et la population affichée (pour ceux qui voient plus que leur dossier) */
const head=(me,ctx)=>{const large=rhVoir(me,ctx)||navVoir(me,ctx)||absVoir(me,ctx);const P=activePeople(ctx);const nI=P.filter(estInt).length;
  return `<div class="rh-head"><h2 class="vt">Ressources humaines <span class="hint">· ${rhVoir(me,ctx)?'toute l\'entreprise':'mon dossier'}</span></h2>${large?`<div class="rh-pop" role="group" aria-label="Population affichée">${[['tous','Tous',P.length],['sal','Salariés',P.length-nI],['int','Intérimaires',nI]].map(([k,l,n])=>`<button class="rh-popb${POP===k?' on':''}" data-act="x" data-v="${ID}|pop|${k}" aria-pressed="${POP===k?'true':'false'}">${l}<b>${n}</b></button>`).join('')}</div>`:''}</div>`;};
const card=(h,body)=>`<div class="card">${h?`<h3 style="margin-top:0">${h}</h3>`:''}${body}</div>`;
const row=(r,kind,me,ctx,extra)=>{const p=persOf(ctx,r.p);const D=DEF[kind];return `<div class="eq-row"><span class="eq-grow"><span class="eq-t">${rhVoir(me,ctx)&&p?`<b>${esc(nomDe(p))}</b>${tagInt(p)} · `:''}${esc(D.label(r))}</span>${extra||r.note?`<span class="eq-s">${esc(extra||'')}${extra&&r.note?' · ':''}${esc(r.note||'')}</span>`:''}</span>${(kind==='rhabs'?absEdit(me,ctx):rhEdit(me,ctx))?btn('edit',kind+'|'+r.id,'✏️','sm'):''}</div>`;};
const list=(kind,me,ctx,L,extraOf)=>L.length?`<div class="eq-list">${L.map(r=>row(r,kind,me,ctx,extraOf?extraOf(r):'')).join('')}</div>`:'<div class="eq-s" style="margin:6px 0">Rien pour l\'instant.</div>';
const addBtn=(kind,me,ctx)=>(kind==='rhabs'?absEdit(me,ctx):rhEdit(me,ctx))?`<div class="eq-acts" style="margin:0 0 8px">${btn('new',kind,'＋ '+DEF[kind].one.charAt(0).toUpperCase()+DEF[kind].one.slice(1),'primary')}</div>`:'';
const warnSrv=()=>KINDS.some(k=>regMissing(k))?'<div class="warnbox" style="margin-bottom:8px">Le serveur ne connaît pas encore les registres RH : les lignes restent sur cet appareil jusqu\'à ce que <code>sql/rh_1011.sql</code> soit passé dans Supabase.</div>':'';
function vHome(me,ctx){const voir=rhVoir(me,ctx);const P=voir?popPeople(ctx):[me];const abs=popRows(visible('rhabs',me,ctx),ctx),pv=visible('rhpv',me,ctx),fo=popRows(visible('rhform',me,ctx),ctx),mu=popRows(visible('rhmut',me,ctx),ctx);const today=todayIso();
  const absNow=abs.filter(a=>a.du<=today&&(a.au||a.du)>=today);const pvTodo=pv.filter(x=>x.statut==='recue');const pvLate=pvTodo.filter(x=>{const e=pvEcheance(x);return e&&e<today;});
  const foSoon=fo.filter(x=>x.statut==='prevu'&&x.du&&x.du>=today).sort((a,b)=>a.du.localeCompare(b.du)).slice(0,5);const muWait=mu.filter(x=>x.statut==='attente');
  const sansMut=voir?P.filter(p=>!estInt(p)&&!mu.some(x=>x.p===p.id)):[]; /* 19/11 nuit : la mutuelle d'un intérimaire relève de son agence */
  const habAl=voir?P.reduce((n,p)=>n+habsDe(p).filter(h=>h.etat==='expiree'||h.etat==='echeance').length,0):habsDe(me).filter(h=>h.etat!=='valide').length;
  let ctl=null;if(navVoir(me,ctx)){try{ctl=ctlRecent();}catch(e){console.warn('rh : contrôle',e);}} /* 19/11 nuit : le contrôle global en un chiffre — le mois dernier et le mois en cours (la paie se boucle au début du mois suivant) */
  const k=(n,l,sev,go)=>go?`<button class="ac-stat${sev?' '+sev:''}" data-act="x" data-v="${ID}|${go}"><b>${n}</b><small>${l}</small></button>`:`<div class="ac-stat${sev?' '+sev:''}"><b>${n}</b><small>${l}</small></div>`;
  return `${warnSrv()}<div class="ac-stats" style="margin-bottom:10px">${k(absNow.length,'absent'+(absNow.length>1?'s':'')+' aujourd\'hui')}${k(pvTodo.length,'contravention'+(pvTodo.length>1?'s':'')+' à désigner',pvLate.length?'bad':'')}${k(foSoon.length,'formations à venir')}${k(habAl,'habilitations à traiter',habAl?'warn':'')}${voir?k(sansMut.length,'sans ligne mutuelle',sansMut.length?'warn':''):''}${ctl?k(ctl.trous,'jour'+(ctl.trous>1?'s':'')+' sans heures ni absence · depuis le 1er '+ymLab(ctl.depuis).toLowerCase().split(' ')[0],ctl.trous?'bad':'ok','ctlm|'+ctl.ym):''}</div>
    ${ctl&&ctl.trous?card('⚠ Heures ou absence manquantes',`<div class="eq-s">${ctl.pers} personne${ctl.pers>1?'s':''} ${ctl.pers>1?'ont':'a'} ${ctl.trous} jour${ctl.trous>1?'s':''} de semaine passé${ctl.trous>1?'s':''} sans heures ni absence depuis le 1er ${ymLab(ctl.depuis).toLowerCase().split(' ')[0]}${ctl.vides?' (dont '+ctl.vides+' semaine'+(ctl.vides>1?'s':'')+' entière'+(ctl.vides>1?'s':'')+')':''}.</div><div class="eq-acts" style="margin-top:6px">${btn('ctlm',ctl.ym,'✅ Ouvrir le contrôle','primary')}</div>`):''}
    ${absNow.length?card('🏖 Absents aujourd\'hui',list('rhabs',me,ctx,absNow)):''}
    ${pvTodo.length?card('🚔 Conducteur à désigner',list('rhpv',me,ctx,pvTodo,r=>{const e=pvEcheance(r);return e?(e<today?'⚠ échéance dépassée ('+fDate(e)+')':'avant le '+fDate(e)):'';})):''}
    ${foSoon.length?card('🎓 Prochaines formations',list('rhform',me,ctx,foSoon)):''}
    ${muWait.length?card('🩺 Mutuelle : pièces attendues',list('rhmut',me,ctx,muWait)):''}
    ${(()=>{const nv=navVoir(me,ctx);const sec=(k2,lab)=>peut(ctx,k2)?`<button class="btn" data-act="x" data-v="${ID}|tab|${k2==='rapport'?'paie':k2}">${lab}${k2==='rapport'?aVal(ctx):''}</button>`:'';
      /* 19/11 nuit (Ethan : « sur le tableau de bord ça ne sert à rien, Variables de paie : il y a déjà les navettes ») : le raccourci n'est plus ici pour qui a les Navettes
         (le rapport reste ouvert depuis Navettes → « 📊 Rapport de la semaine ») ; qui n'a pas les Navettes le garde ici, sinon il perdrait l'écran. */
      const navB=nv?`<button class="btn" data-act="x" data-v="${ID}|tab|nav">🧾 Navettes</button><button class="btn" data-act="x" data-v="${ID}|tab|ctl">✅ Contrôle</button>`:'';
      const paie=sec('gd','🧳 Grands déplacements')+sec('cpt','⏱ Compteurs d\'heures')+(nv?'':sec('rapport','📊 Variables de paie · rapport de la semaine'));
      return voir?card('Raccourcis',`<div class="eq-acts">${navB}${paie}<button class="btn" data-act="xgo" data-v="accident">⚠ Déclarations d'accident</button><button class="btn" data-act="xgo" data-v="habsEq">🎖 Habilitations de l'équipe</button></div>`)
        :card('Mon dossier',`<div class="eq-s">Tes absences, tes formations, ta mutuelle et tes habilitations. Tes navettes : Moi → Heures.</div>`)+(navB||paie?card('Paie de ton équipe',`<div class="eq-acts">${navB}${paie}</div>`):'');})()}`;}
/* ── 10/11 nuit : NAVETTES — contrôle des navettes du mois, cas d'exception, « comment on arrive là », la main sur une semaine, choix de fin de mois ──
   Ethan : « les heures sont lissées sur 5 jours … il faut toujours que ce soit expliqué, que même si un calcul se fait on puisse avoir la main et toujours comprendre
   comment on en arrive là » ; « chaque fin de mois on choisit : reporter (elles s'ajoutent sur des semaines pas pleines à 48 h) ou payer » (la RH ou le responsable
   d'exploitation). Le calcul est celui de la navette Excel (espace.js → navette.js lisserSemaine), relu ici, jamais refait. */
let NAVM=null;let NAVCACHE=null;
const ymNow=()=>todayIso().slice(0,7);
const ymAdd=(ym,n)=>{const [y,m]=ym.split('-').map(Number);const d=new Date(y,m-1+n,1);return d.getFullYear()+'-'+String(d.getMonth()+1).padStart(2,'0');};
const ymLab=ym=>{const t=new Date(ym+'-15T12:00:00').toLocaleDateString('fr-FR',{month:'long',year:'numeric'});return t.charAt(0).toUpperCase()+t.slice(1);};
const nbh=v=>String(Math.round((+v||0)*100)/100).replace('.',',');
const JL6=['Lun','Mar','Mer','Jeu','Ven','Sam'];
const ETAT_IC={lisse:'✓',main:'✋',reel:'✋',encours:'⏳',vide:'·',incomplet:'⚠',sansjour:'·'};
const FLAG_TXT={incomplet:'jour attendu sans pointage',sansSolde:'sous l\'objectif, compteurs vides : sans solde à poser',soldeInconnu:'sous l\'objectif, compteurs pas encore suivis',rien:'planifié, rien de pointé',plafond:'au-delà du plafond → à reporter',comble:'complétée avec les compteurs',main:'réglée à la main',inter:'inter-chantier',place:'heures replacées (choix « reporter »)',absence:'absence',ferie:'férié / pont',ferieT:'férié travaillé au réel',regle:'règle de la semaine (tout le monde)'};
const A_TRAITER=['incomplet','sansSolde','soldeInconnu','rien'];
function navData(ym){const L=espaceNavMois(ym);NAVCACHE={ym,L};return L;}
function weekCell(w,p){const L=w.liss;if(!L)return `<td class="r dim">${w.total?nbh(w.total):'—'}</td>`;const bad=L.flags.some(f=>A_TRAITER.includes(f));const ic=ETAT_IC[L.etat]||'';
  return `<td class="r"><button class="nav-cell${bad?' bad':L.flags.includes('main')?' main':L.etat==='lisse'&&L.flags.length?' info':''}" data-act="x" data-v="${ID}|navw|${esc(p.id)}|${L.mon}" title="${esc(L.etatTxt+(L.flags.length?' · '+L.flags.map(f=>FLAG_TXT[f]||f).join(' · '):''))}"><b>${L.etat==='vide'?'—':nbh(w.total)}</b> <span>${ic}</span></button></td>`;}
function vNav(me,ctx){const ym=NAVM||ymNow();const L=navData(ym).filter(x=>popOk(x.p)); /* 19/11 nuit : la population affichée (tous · salariés · intérimaires) */const ed=navEdit(me,ctx);const P=L.map(x=>x.p);
  const W=L.length?L[0].N.weeks:[];const allW=L.flatMap(x=>x.N.weeks.filter(w=>w.liss).map(w=>({p:x.p,w,L:w.liss})));
  const cnt=f=>allW.filter(x=>x.L.flags.includes(f)).length;const lis=allW.filter(x=>x.L.etat==='lisse').length;const itT=L.reduce((t,x)=>t+(+x.N.it||0),0);
  const k=(n,l,sev)=>`<div class="ac-stat${sev?' '+sev:''}"><b>${n}</b><small>${l}</small></div>`;
  const todo=allW.filter(x=>x.L.flags.some(f=>A_TRAITER.includes(f)));
  const choix=L.filter(x=>(x.N.repFin!==null&&x.N.repFin>0.004)||x.N.choix);
  const fr=d=>String(d).slice(8,10)+'/'+String(d).slice(5,7);
  const head=`<div class="card" style="padding:8px 12px"><div class="eq-wkhead"><button class="eq-wkbtn" data-act="x" data-v="${ID}|navm|${ymAdd(ym,-1)}" aria-label="Mois précédent">‹</button><div class="eq-wktitle"><b>${esc(ymLab(ym))}</b><span>${W.length?'semaines du '+fr(W[0].mon)+' au '+fr(addDays(W[W.length-1].mon,5))+' (jeudi dans le mois)':''}</span></div><button class="eq-wkbtn" data-act="x" data-v="${ID}|navm|${ymAdd(ym,1)}" aria-label="Mois suivant">›</button></div>
    <div class="eq-acts" style="margin:8px 0 0"><button class="btn primary" data-act="gdnavall" data-v="${ym}${POP==='tous'?'':'|'+POP}">⬇ ${POP==='int'?'Navettes des intérimaires · ':POP==='sal'?'Navettes des salariés · ':'Toutes les navettes de '}${esc(ymLab(ym).toLowerCase())}</button><button class="btn" data-act="x" data-v="${ID}|tab|ctl">✅ Contrôle</button>${peut(ctx,'gd')?`<button class="btn" data-act="x" data-v="${ID}|tab|gd">🧳 Grands déplacements</button>`:''}${peut(ctx,'cpt')?`<button class="btn" data-act="x" data-v="${ID}|tab|cpt">⏱ Compteurs d'heures</button>`:''}${peut(ctx,'rapport')?`<button class="btn" data-act="x" data-v="${ID}|tab|paie">📊 Rapport de la semaine (CSV)${aVal(ctx)}</button>`:''}</div></div>`;
  const tiles=`<div class="ac-stats" style="margin:0 0 10px">${k(P.length,'personne'+(P.length>1?'s':''))}${k(lis,'semaines lissées')}${k(todo.length,'à traiter',todo.length?'warn':'')}${k(cnt('plafond'),'au-delà du plafond')}${k(cnt('comble'),'complétées (compteurs)')}${k(cnt('sansSolde'),'sans solde à poser',cnt('sansSolde')?'bad':'')}${k(cnt('main'),'réglées à la main')}${itT?k(nbh(itT)+' h','inter-chantier (100 %)'):''}${cnt('ferieT')?k(cnt('ferieT'),'férié'+(cnt('ferieT')>1?'s':'')+' travaillé'+(cnt('ferieT')>1?'s':'')+' au réel'):''}${W.filter(w=>espaceNavRegle(w.mon)).length?k(W.filter(w=>espaceNavRegle(w.mon)).length,'semaine'+(W.filter(w=>espaceNavRegle(w.mon)).length>1?'s':'')+' avec règle commune'):''}</div>`;
  const todoC=todo.length?card('À traiter · '+todo.length,`<div class="eq-s" style="margin-bottom:6px">Ces semaines ne partent pas lissées (ou laissent des heures à couvrir) : ouvre-les pour voir pourquoi et décider.</div><div class="eq-list">${todo.map(x=>`<div class="eq-row"><span class="eq-grow"><span class="eq-t"><b>${esc(nomDe(x.p))}</b> · S${x.w.n} <span class="dim">${fr(x.w.mon)} → ${fr(addDays(x.w.mon,4))}</span></span><span class="eq-s">${esc(x.L.flags.filter(f=>A_TRAITER.includes(f)).map(f=>FLAG_TXT[f]).join(' · '))}</span></span><button class="btn sm" data-act="x" data-v="${ID}|navw|${esc(x.p.id)}|${x.w.mon}">Voir</button></div>`).join('')}</div>`):card('','<div class="okbox">✓ Rien à traiter : toutes les semaines finies sont lissées ou réglées.</div>');
  const choixC=choix.length?card('Fin de mois : reporter ou prime',`<div class="eq-s" style="margin-bottom:6px">Heures à reporter au ${fr(addDays(W.length?W[W.length-1].mon:todayIso(),6))} (fin de la navette). <b>Reporter</b> : elles restent au compteur et se replacent toutes seules sur les semaines pas pleines à 48 h. <b>Prime</b> : payées ce mois-ci, le compteur repart de zéro.${ed?'':' (Choix réservé à la RH et au responsable d\'exploitation.)'}</div>
    <div class="eq-list">${choix.map(x=>{const h=Math.round((+x.N.repFin||0)*100)/100;const c=x.N.choix;return `<div class="eq-row"><span class="eq-grow"><span class="eq-t"><b>${esc(nomDe(x.p))}</b> · ${c&&c.choix==='prime'?'payées en prime : '+nbh(c.h)+' h':nbh(h)+' h à reporter'}</span><span class="eq-s">${c?(c.choix==='prime'?'💶 Prime de '+nbh(c.h)+' h':'↪ Reporter')+' · choisi par '+esc(c.by||'?')+(c.at?' le '+fDate(String(c.at).slice(0,10)):''):'choix à faire'}</span></span>${ed?(c?btn('navchoix',x.p.id+'|'+ym+'|','Annuler','sm'):btn('navchoix',x.p.id+'|'+ym+'|reporter','↪ Reporter','sm')+btn('navchoix',x.p.id+'|'+ym+'|prime|'+h,'💶 Prime '+nbh(h)+' h','sm primary')):''}</div>`;}).join('')}</div>`):'';
  /* 19/11 nuit : salariés puis intérimaires ; les heures sup en colonnes (125 %, 150 %, au-delà du plafond) et un total par groupe en bas de tableau ; l'en-tête d'une
     semaine ouvre sa règle commune (« férié » : la semaine a un jour férié · « règle » : une règle commune est posée). */
  const hasRep=L.some(x=>x.N.hs&&+x.N.hs.report>0.004);const r2s=v=>Math.round((+v||0)*100)/100;const mois=x=>r2s(x.N.weeks.reduce((t,w)=>t+w.total,0));
  const thW=w=>{const fe=feriesDe(w.mon).length>0,rg=!!espaceNavRegle(w.mon);return `<th class="r"><button class="rh-wkb" data-act="x" data-v="${ID}|navr|${w.mon}" title="Règle de la semaine pour tout le monde${fe?' · semaine avec un jour férié : travaillé, il reste au réel':''}">S${w.n}${fe?'<i class="fe">férié</i>':''}${rg?'<i class="rg">règle</i>':''}<small>${fr(w.mon)}</small></button></th>`;};
  const rowN=x=>{const N=x.N;return `<tr data-p="${esc(x.p.id)}"><td>${pcell(x.p,(estInt(x.p)?'intérim'+(agenceDe(x.p)?' · '+esc(agenceDe(x.p)):''):'contrat '+nbh(x.c&&x.c.contrat||35)+' h')+(N.it?' · inter-chantier '+nbh(N.it)+' h':''))}</td>${N.weeks.map(w=>weekCell(w,x.p)).join('')}<td class="r"><b>${nbh(mois(x))}</b></td><td class="r" data-hs="125">${N.hs.h125?nbh(N.hs.h125):'<span class="dim">—</span>'}</td><td class="r" data-hs="150">${N.hs.h150?nbh(N.hs.h150):'<span class="dim">—</span>'}</td>${hasRep?`<td class="r" data-hs="rep">${+N.hs.report>0.004?nbh(N.hs.report):'<span class="dim">—</span>'}</td>`:''}<td class="r"><button class="btn sm" data-act="gdnavx" data-v="${esc(x.p.id)}|${ym}">⬇ xlsx</button></td></tr>`;};
  const totN=(X,lab,g)=>{const s=f=>nbh(r2s(X.reduce((t,x)=>t+(+f(x)||0),0)));return `<tr class="rh-tot" data-tot="${g}"><td>Total ${lab.toLowerCase()}</td>${W.map((w,i)=>`<td class="r">${s(x=>x.N.weeks[i]?x.N.weeks[i].total:0)}</td>`).join('')}<td class="r">${s(mois)}</td><td class="r" data-hs="125">${s(x=>x.N.hs.h125)}</td><td class="r" data-hs="150">${s(x=>x.N.hs.h150)}</td>${hasRep?`<td class="r" data-hs="rep">${s(x=>x.N.hs.report)}</td>`:''}<td></td></tr>`;};
  const colsN=W.length+5+(hasRep?1:0);const deux=L.some(x=>estInt(x.p))&&L.some(x=>!estInt(x.p));
  const tab=P.length?card('Toutes les navettes',`<div class="eq-s" style="margin-bottom:6px">Heures sur la navette, semaine par semaine : ✓ lissée · ✋ réglée à la main · ⏳ en cours · ⚠ à compléter. Touche une semaine pour voir le détail jour par jour et comment on arrive là${ed?', et reprendre la main':''}. Touche l'en-tête d'une semaine (S…) pour sa <b>règle commune à tout le monde</b>. Heures sup : au-delà du contrat jusqu'à la 43e heure à 125 %, de la 44e à la 48e à 150 %, semaine par semaine — les mêmes chiffres que la navette Excel.</div>
    <div class="rh-grid"><table class="rh-t nav-tab"><tr><th>Personne</th>${W.map(thW).join('')}<th class="r">Mois</th><th class="r">HS 125 %</th><th class="r">HS 150 %</th>${hasRep?'<th class="r" title="Heures au-delà du plafond (48 h par semaine, 12 h par jour) : au compteur à reporter">Au-delà 48 h</th>':''}<th></th></tr>
    ${grouper(L,colsN,rowN,totN)}${deux?totN(L,'général','tous'):''}</table></div>`):card('','<div class="eq-s">Personne n\'est planifié ni pointé sur les semaines de ce mois'+(popTxt()?' ('+popTxt()+')':'')+'.</div>');
  const autres=popPeople(ctx).filter(q=>!L.some(x=>x.p.id===q.id)); /* les autres : leur navette (vide) se télécharge toujours, comme avant */
  const autresC=autres.length?`<details class="eq-fold card"><summary><b>Sans activité ce mois-ci · ${autres.length}</b> <span class="dim">· ni planifiés ni pointés</span></summary><div class="eq-list">${autres.map(q=>`<div class="eq-row"><span class="eq-grow"><span class="eq-t">${esc(nomDe(q))}${tagInt(q)}</span></span><button class="btn sm" data-act="gdnavx" data-v="${esc(q.id)}|${ym}">⬇ xlsx</button></div>`).join('')}</div></details>`:'';
  const regles=`<details class="eq-fold card"><summary><b>Les règles du lissage</b> <span class="dim">· ce que fait le calcul</span></summary><div class="eq-s" style="margin-top:6px">Les heures pointées de la semaine (sans les pauses ni l'inter-chantier) sont arrondies au quart d'heure le plus proche sur la semaine, puis réparties sur les jours du lundi au vendredi au pas de ¼ h, le reste sur le dernier jour, 12 h par jour et 48 h par semaine au plus. Un vendredi non travaillé prend le chantier du jeudi. Un jour d'absence (Tracé RH → Absences), un férié ou un pont n'est pas lissé : avec un férié et un pont, 3 jours × 12 h = 36 h au plus. Un <b>férié travaillé</b> garde ses heures réelles ce jour-là (heures majorées) : le reste de la semaine est lissé sans lui, et le plafond est de 48 h moins ses heures. Une <b>règle commune</b> peut être posée sur une semaine pour tout le monde (en-tête de la semaine) : d'autres jours au réel, un férié travaillé lissé quand même, ou toute la semaine aux heures réelles ; la main prise sur la semaine d'une personne passe avant. Ce qui dépasse va au compteur à reporter, majoré selon le rang de l'heure (de la 36e à la 43e × 1,25 ; au-delà × 1,5 : 50 h → 2 h × 1,5 = 3 h). Une semaine sous le contrat se complète avec le compteur à reporter, puis le compteur d'heures ; vides → alerte « sans solde ». Une semaine pas finie, ou avec un jour attendu sans pointage ni absence, n'est pas lissée tant qu'on ne l'a pas complétée ou validée telle quelle. Les heures inter-chantier sont payées à part (100 %, jamais majorées). Les débours de Tracé Affaire prennent toujours les heures réelles.</div></details>`;
  const old=`<details class="eq-fold card"><summary><b>Téléchargements des 6 derniers mois</b></summary>${[0,1,2,3,4,5].map(i=>ymAdd(ymNow(),-i)).map(m=>`<div class="eq-row"><span class="eq-grow"><span class="eq-t">${esc(ymLab(m))}</span></span><button class="btn sm" data-act="gdnavall" data-v="${m}">⬇ Toutes les navettes</button></div>`).join('')}</details>`;
  return head+tiles+todoC+choixC+tab+autresC+regles+old;}
/* ── 19/11 nuit (Ethan : « il faut pouvoir sur certaines semaines mettre des règles communes à tout le monde : ce mercredi 11 novembre, on lisse les heures sur tout sauf le
   mercredi férié qui a été travaillé — les heures étant majorées, il faut les heures au réel sur ce jour ») — LA RÈGLE DE LA SEMAINE POUR TOUT LE MONDE.
   D'office (rien à faire) : un férié travaillé reste au réel et sort du lissage. Ici, la RH ou le responsable d'exploitation règle la semaine pour tous : d'autres jours au
   réel (samedi compris), un férié travaillé lissé quand même, ou toute la semaine aux heures réelles. La main sur la semaine d'une personne passe toujours avant. ── */
const feriesDe=mon=>[0,1,2,3,4,5].map(i=>addDays(mon,i)).filter(d=>isFerie(d));
function navRegleModal(mon,me,ctx){const api=ctx.api||A;if(!/^\d{4}-\d{2}-\d{2}$/.test(String(mon||''))){ctx.toast('Semaine introuvable');return;}const ed=navEdit(me,ctx);const R=espaceNavRegle(mon)||{};const days=[0,1,2,3,4,5].map(i=>addDays(mon,i));
  const reel0=new Set(R.reel||[]),liss0=new Set(R.liss||[]);const def=d=>isFerie(d); /* d'office au réel : un férié (s'il est travaillé) */
  const ym=NAVM||ymNow();const L0=(NAVCACHE&&NAVCACHE.ym===ym?NAVCACHE.L:navData(ym));const sem=L0.map(x=>({p:x.p,w:x.N.weeks.find(z=>z.mon===mon)})).filter(x=>x.w&&x.w.liss);
  const nFer=d=>sem.filter(x=>x.w.liss.jours.some(j=>j.d===d&&j.ferT)).length;const mains=sem.filter(x=>x.w.liss.main);const nSem=(sem[0]&&sem[0].w.n)||'';
  const coche=d=>def(d)?!liss0.has(d):reel0.has(d);const modeR=R.mode==='reel';
  api.openModal(`<h3 style="margin-top:0">📌 Règle de la semaine${nSem?' S'+nSem:''} pour tout le monde <span class="hint">· ${frJ(mon)} → ${frJ(addDays(mon,5))}</span></h3>
    <div class="eq-s" style="margin-bottom:8px">Sans rien toucher : les heures de la semaine sont lissées du lundi au vendredi, et un <b>férié travaillé reste au réel</b> (heures majorées) — il sort du lissage. Ici tu règles la semaine <b>pour tout le monde</b> ; la main prise sur la semaine d'une personne passe toujours avant.</div>
    <label class="f" style="display:flex;gap:8px;align-items:center"><input type="radio" name="nr-mode" value="auto"${modeR?'':' checked'}${ed?'':' disabled'}> Lissage (les règles), avec les jours au réel cochés ci-dessous</label>
    <label class="f" style="display:flex;gap:8px;align-items:center"><input type="radio" name="nr-mode" value="reel"${modeR?' checked':''}${ed?'':' disabled'}> Toute la semaine aux heures réelles (pas de lissage)</label>
    <div class="eq-s" style="margin:8px 0 2px"><b>Jours au réel pour tout le monde</b> <span class="dim">· leurs heures pointées restent telles quelles, le reste de la semaine est lissé sans eux</span></div>
    <div id="nr-jours" style="display:flex;flex-wrap:wrap;gap:6px 14px">${days.map((d,i)=>`<label style="display:flex;gap:6px;align-items:center;min-height:42px"><input type="checkbox" id="nr-j${i}" data-d="${d}" data-def="${def(d)?1:0}"${coche(d)?' checked':''}${ed?'':' disabled'}> ${JL6[i]} ${frJ(d)}${def(d)?` <span class="eq-tag">férié${nFer(d)?' · '+nFer(d)+' l\'ont travaillé':''}</span>`:''}</label>`).join('')}</div>
    <div class="hint" id="nr-hint" style="margin:4px 0 6px"></div>
    ${mains.length?`<div class="eq-s" style="margin:0 0 6px" id="nr-mains">✋ ${mains.length} personne${mains.length>1?'s ont leur':' a sa'} semaine réglée à la main (ce réglage passe avant la règle) : ${esc(mains.map(x=>nomDe(x.p)).join(', '))}.</div>`:''}
    ${R.by?`<div class="eq-s" style="margin:0 0 6px">Règle posée par ${esc(R.by)}${R.at?' le '+fDate(String(R.at).slice(0,10)):''}.</div>`:''}
    ${ed?`<label class="f">Motif (obligatoire)</label><input class="f" id="nr-motif" value="${esc(R.motif||'')}" placeholder="ex. 11 novembre travaillé, intempéries le mardi, samedi payé à part…">
    <div class="actions" style="margin-top:10px"><button class="btn primary block" id="nr-ok">Enregistrer pour tout le monde</button>${R.by||R.motif?'<button class="btn block" id="nr-x">Retirer la règle (revenir au calcul normal)</button>':''}<button class="btn block" data-close>Fermer</button></div>`
      :`${R.motif?`<div class="eq-s">Motif : ${esc(R.motif)}</div>`:''}<div class="actions" style="margin-top:10px"><button class="btn block" data-close>Fermer</button></div>`}`);
  const g=k=>document.getElementById(k);
  const lire=()=>{const md=(document.querySelector('input[name=nr-mode]:checked')||{}).value||'auto';const o={};if(md==='reel'){o.mode='reel';return o;} /* toute la semaine au réel : les jours cochés ne comptent plus, on ne les garde pas */const reel=[],liss=[];
    days.forEach((d,i)=>{const c=g('nr-j'+i).checked;if(def(d)&&!c)liss.push(d);if(!def(d)&&c)reel.push(d);});if(reel.length)o.reel=reel;if(liss.length)o.liss=liss;return o;};
  const dire=()=>{const o=lire();const h=g('nr-hint');if(!h)return;days.forEach((d,i)=>{g('nr-j'+i).disabled=!ed||o.mode==='reel';});
    h.textContent=o.mode==='reel'?'Chacun a ses heures réelles jour par jour cette semaine (rien n\'est lissé).':!o.reel&&!o.liss?'C\'est le calcul normal : rien à enregistrer.':[o.reel?'Au réel pour tous : '+o.reel.map(jourTxt).join(', ')+'.':'',o.liss?'Férié travaillé lissé comme un autre jour : '+o.liss.map(jourTxt).join(', ')+'.':''].filter(Boolean).join(' ');};
  dire();if(!ed)return;document.querySelectorAll('input[name=nr-mode]').forEach(r=>r.addEventListener('change',dire));days.forEach((d,i)=>g('nr-j'+i).addEventListener('change',dire));
  g('nr-ok').onclick=()=>{const o=lire();const neutre=!o.mode&&!o.reel&&!o.liss;const motif=(g('nr-motif').value||'').trim();
    if(neutre){if(R.by||R.motif){const r=espaceNavRegleSet(mon,null);if(!r.ok){ctx.toast(r.why||'Refusé');return;}api.closeModal();ctx.toast('✓ Règle retirée : calcul normal pour tout le monde');ctx.render();}else ctx.toast('C\'est déjà le calcul normal : rien à enregistrer');return;}
    if(!motif){ctx.toast('Indique le motif (il apparaît dans l\'explication de chaque semaine)');g('nr-motif').focus();return;}
    const r=espaceNavRegleSet(mon,Object.assign(o,{motif}));if(!r.ok){ctx.toast(r.why||'Refusé');return;}api.closeModal();ctx.toast('✓ Règle de la semaine enregistrée pour tout le monde');ctx.render();};
  if(g('nr-x'))g('nr-x').onclick=()=>{const r=espaceNavRegleSet(mon,null);if(!r.ok){ctx.toast(r.why||'Refusé');return;}api.closeModal();ctx.toast('✓ Règle retirée : calcul normal pour tout le monde');ctx.render();};}
/* ── 19/11 nuit (Ethan) : CONTRÔLE GLOBAL — « un endroit de contrôle que tous les salariés ont bien des heures ou une absence tout le temps … quelque chose de visuel et facile
   à comprendre : calendrier des absences de tous les salariés, et sur chaque semaine la vue d'ensemble de tout le monde, sur quel chantier, et alerte si quelqu'un n'a pas d'heure
   sur une semaine et pas d'absence déclarée ». Rien n'est calculé ici : l'état de chaque jour vient d'espace.js (espaceRhControle : pointages, planning, absences, fériés).
   Vert = des heures · bleu = absence déclarée · hachuré = férié / pont · ROUGE « ? » = jour de semaine passé sans heures ni absence. ── */
let CTLW=null;
const J7=['Lun','Mar','Mer','Jeu','Ven','Sam','Dim'];const J7L=['dim','lun','mar','mer','jeu','ven','sam'];
const ABS_CODE={cp:'CP',rtt:'RTT',mal:'MAL',at:'AT',ss:'SS',inj:'INJ',form:'FOR',evt:'EVT',pont:'PT',autre:'ABS'};
const frJ=d=>String(d).slice(8,10)+'/'+String(d).slice(5,7);
const jourTxt=d=>J7L[new Date(d+'T12:00:00').getDay()]+' '+frJ(d);
const lundiDe=d=>{const t=new Date(d+'T12:00:00');return addDays(d,-((t.getDay()+6)%7));};
const ctlData=ym=>espaceRhControle(ym);
function ctlStats(D){const L=D.people.filter(x=>x.suivi&&popOk(x.p));return {L,n:L.length,trous:L.reduce((n,x)=>n+x.trous.length,0),pers:L.filter(x=>x.trous.length).length,vides:L.reduce((n,x)=>n+x.weeks.filter(w=>w.vide).length,0),
  inc:L.reduce((n,x)=>n+x.inc.length,0),absNow:L.filter(x=>x.by[D.today]&&x.by[D.today].st==='abs').length};}
/* le mois dernier et le mois en cours, pour le tableau de bord ; ym = le premier des deux qui a des manques (celui que le contrôle ouvre) */
function ctlRecent(){const m1=ymNow(),m0=ymAdd(m1,-1);const A0=ctlStats(ctlData(m0)),A1=ctlStats(ctlData(m1));const ids=new Set();[A0,A1].forEach(z=>z.L.forEach(x=>{if(x.trous.length)ids.add(x.p.id);}));
  return {trous:A0.trous+A1.trous,pers:ids.size,vides:A0.vides+A1.vides,ym:A0.trous?m0:m1,depuis:m0};}
function etatJour(j){const t=(j.sites||[]).join(' · ');
  return j.st==='pt'?nbh(j.h)+' h pointées'+(t?' · '+t:'')+(j.incomplet?' — pointage sans fin, à compléter':'')
    :j.st==='abs'?(j.abs||'Absence')+' (déclarée dans Absences)':j.st==='fer'?'Jour férié':j.st==='pont'?'Pont (entre le week-end et le férié) : pas d\'heures attendues'
    :j.st==='repos'?'Non travaillé : la semaine a déjà ses heures (rythme 4 jours)':j.st==='trou'?'Ni heures ni absence'+(j.plan&&t?' — prévu au planning : '+t:' — pas au planning non plus')
    :j.st==='futur'?(t?'À venir — prévu : '+t:'À venir — rien de prévu au planning'):j.st==='np'?'Ne pointe pas'+(t?' — planifié : '+t:'')
    :j.st==='hors'?'Pas attendu ce jour-là (hors contrat, ou intérimaire pas placé)':j.st==='am'?'Jour d\'un autre mois, sans heures ni absence : il se contrôle dans son mois':'Week-end';}
/* la semaine de tout le monde : une ligne par personne, une case par jour (heures + chantier, absence, férié, « ? ») */
function ctlGrid(D,L,mon){const days=[0,1,2,3,4,5,6].map(i=>addDays(mon,i));
  const cell=(x,d)=>{const j=x.by[d];if(!j)return '<td></td>';if(j.st==='we'||j.st==='hors'||(j.st==='np'&&!(j.sites&&j.sites.length)))return `<td><span class="rh-c ${j.st==='np'?'hors':j.st}" data-st="${j.st}"></span></td>`;
    const t=j.sites&&j.sites.length?j.sites[0]+(j.sites.length>1?' +'+(j.sites.length-1):''):'';
    const M=j.st==='pt'?[nbh(j.h)+' h',t]:j.st==='abs'?[ABS_CODE[j.absT]||'ABS',j.abs||'']:j.st==='fer'?['Férié','']:j.st==='pont'?['Pont','']:j.st==='repos'?['—','non travaillé']:j.st==='trou'?['?',j.plan&&t?'prévu : '+t:'rien']:j.st==='am'?['·','autre mois']:j.st==='futur'?[t?'prévu':'·',t]:[t?'planifié':'·',t];
    return `<td><button class="rh-c ${j.st}${j.incomplet?' inc':''}${j.am?' am':''}" data-act="x" data-v="${ID}|ctld|${esc(x.p.id)}|${d}" data-st="${j.st}" title="${esc(jourTxt(d)+' : '+etatJour(j))}"><b>${esc(M[0])}</b>${M[1]?`<small>${esc(M[1])}</small>`:''}</button></td>`;};
  const rowOf=x=>{const w=x.weeks.find(z=>z.mon===mon);const al=!!(w&&(w.trous.length||w.inc.length));
    return `<tr class="${al?'al':''}" data-p="${esc(x.p.id)}"><td>${pcell(x.p,esc(x.poste||'')+(x.pointe?'':' · ne pointe pas'))}</td>${days.map(d=>cell(x,d)).join('')}<td class="r"><b>${w&&w.h?nbh(w.h)+' h':'—'}</b>${al?`<div style="font-size:10.5px;color:var(--rh-b);font-weight:700">${w.trous.length?w.trous.length+' j. à régulariser':'pointage sans fin'}</div>`:''}</td></tr>`;};
  return `<div class="rh-grid"><table class="rh-t rh-sem" data-ctlw="${mon}"><tr><th>Personne</th>${days.map((d,i)=>`<th class="${isFerie(d)?'fe':''}">${J7[i]} ${frJ(d)}${isFerie(d)?'<small style="display:block;font-weight:400">férié</small>':''}</th>`).join('')}<th class="r">Semaine</th></tr>${grouper(L,9,rowOf)}</table></div>`;}
/* le mois : une ligne par personne, une case par jour. absOnly = le calendrier des absences (onglet Absences) : ni heures ni « ? », pour qui ne voit pas les navettes */
function ctlCal(D,L,absOnly){const days=[];for(let d=D.d1;d<=D.dN;d=addDays(d,1))days.push(d);const wkOf=d=>{const g=new Date(d+'T12:00:00').getDay();return g===0||g===6;};
  const cell=(x,d)=>{const j=x.by[d];const wk=wkOf(d)?' wk':'';if(!j)return `<td class="rh-dd${wk}"></td>`;let cls='',code='';
    if(j.st==='abs'){cls='a-'+(j.absT||'autre');code=ABS_CODE[j.absT]||'ABS';}else if(j.st==='fer'){cls='fer';code='F';}else if(j.st==='hors')cls='hors';
    else if(!absOnly){if(j.st==='pt'){cls='pt';code='●';}else if(j.st==='trou'){cls='trou';code='?';}else if(j.st==='pont'){cls='pont';code='P';}else if(j.st==='repos'){cls='repos';code='–';}}
    const clic=absOnly?j.st==='abs':!['we','hors'].includes(j.st);const tt=absOnly?(j.st==='abs'?jourTxt(d)+' : '+(j.abs||'absence'):j.st==='fer'?jourTxt(d)+' : férié':''):jourTxt(d)+' : '+etatJour(j);
    return `<td class="rh-dd ${cls}${wk}" data-d="${d}" data-st="${absOnly&&!['abs','fer','hors','we'].includes(j.st)?'':j.st}"${clic?` data-act="x" data-v="${ID}|ctld|${esc(x.p.id)}|${d}"`:''}${tt?` title="${esc(tt)}"`:''}>${code}</td>`;};
  const rowOf=x=>`<tr data-p="${esc(x.p.id)}" class="${!absOnly&&x.trous.length?'al':''}"><td>${pcell(x.p,absOnly?'':esc(x.poste||''))}</td>${days.map(d=>cell(x,d)).join('')}</tr>`;
  return `<div class="rh-grid"><table class="rh-t rh-cal" data-cal="${absOnly?'abs':'ctl'}"><tr><th>Personne</th>${days.map(d=>{const g=new Date(d+'T12:00:00').getDay();return `<th class="d${wkOf(d)?' wk':''}${isFerie(d)?' fe':''}${d===D.today?' auj':''}" title="${esc(jourTxt(d))}${isFerie(d)?' · férié':''}">${+d.slice(8,10)}<small>${'DLMMJVS'.charAt(g)}</small></th>`;}).join('')}</tr>${grouper(L,days.length+1,rowOf)}</table></div>`;}
const legI=(cls,txt,code)=>`<span><i class="${cls}">${code||''}</i>${txt}</span>`;
const legAbs=()=>`<div class="rh-leg">${ABS_TYPES.map(t=>`<span><i class="a-${t[0]}">${ABS_CODE[t[0]]||'ABS'}</i>${esc(t[1])}</span>`).join('')}<span><i style="background:repeating-linear-gradient(135deg,#f3f1ea 0 5px,#e0ddd3 5px 10px);color:#5b574e">F</i>Férié</span></div>`;
const legCtl=()=>`<div class="rh-leg"><span><i style="background:var(--rh-okl);color:#0f5132">●</i>des heures pointées</span><span><i style="background:var(--rh-al);color:#173f7d">CP</i>absence déclarée</span><span><i style="background:#e9e7df;color:#5b574e">F</i>férié · pont</span><span><i style="background:var(--rh-bl);color:#8f1d16">?</i><b>ni heures ni absence</b></span><span><i style="border:1px dashed #cfccc2">·</i>à venir</span><span><i style="box-shadow:inset 0 0 0 2px #e0a020">!</i>pointage sans fin</span></div>`;
/* la suite de jours ouvrés qui se tiennent à partir du premier (lun, mar, mer → du lundi au mercredi), pour pré-remplir l'absence */
const suiteDe=T=>{let a=T[0],b=T[0];for(let i=1;i<T.length;i++){if(T[i]===addDays(b,1))b=T[i];else break;}return [a,b];};
function ctlAlertes(D,L,me,ctx){const A2=L.filter(x=>x.trous.length||x.inc.length);
  if(!A2.length)return card('',`<div class="okbox" style="margin:0" data-ctlok="1">✓ ${L.length?'Chaque jour de semaine passé a des heures ou une absence'+(popTxt()?' ('+popTxt()+')':'')+'.':'Personne à contrôler pour cette sélection.'}</div>`);const ae=absEdit(me,ctx);
  return card('⚠ À régulariser · '+A2.length+' personne'+(A2.length>1?'s':''),`<div class="rh-sub">Jours de semaine passés <b>sans heures ni absence</b>. Soit les heures manquent (à saisir ou corriger dans Pilotage → Pointages à valider), soit l'absence n'est pas déclarée (bouton « Absence »).</div>
    <div data-ctlals="1">${A2.map(x=>{const ws=x.weeks.filter(w=>w.trous.length||w.inc.length);const w0=ws.find(w=>w.trous.length)||ws[0];const [a,b]=w0.trous.length?suiteDe(w0.trous):['',''];
      return `<div class="rh-al" data-ctlal="${esc(x.p.id)}">${pcell(x.p,esc(x.poste||''))}<span class="g">${tagInt(x.p)}<small>${ws.map(w=>`<b>S${w.n}</b> : ${w.vide?'semaine entière sans heures ni absence ('+w.trous.map(frJ).join(', ')+')':[w.trous.length?w.trous.map(jourTxt).join(', '):'',w.inc.length?'pointage sans fin '+w.inc.map(jourTxt).join(', '):''].filter(Boolean).join(' · ')}`).join(' — ')}</small></span><span class="eq-acts">${ae&&a?btn('absnew',x.p.id+'|'+a+'|'+b,'🏖 Absence','sm'):''}${btn('ctlw',w0.mon,'Voir la semaine','sm')}</span></div>`;}).join('')}</div>`);}
function vCtl(me,ctx){if(!navVoir(me,ctx))return card('','<div class="eq-s">Réservé à la RH et au responsable d\'exploitation (droit « contrôler les navettes »).</div>');
  const ym=NAVM||ymNow();const D=ctlData(ym);const S2=ctlStats(D);const L=S2.L;const W=D.weeks;const aTrou=w=>L.some(x=>{const z=x.weeks.find(q=>q.mon===w.mon);return z&&z.trous.length>0;});
  const cur=W.find(w=>w.mon===CTLW)||W.find(aTrou)||W.slice().reverse().find(w=>w.mon<=D.today)||W[0]; /* la semaine choisie, sinon la première qui a un manque, sinon la semaine en cours */
  const k=(n,l,sev)=>`<div class="ac-stat${sev?' '+sev:''}"><b>${n}</b><small>${l}</small></div>`;
  const tete=`<div class="card" style="padding:8px 12px"><div class="eq-wkhead"><button class="eq-wkbtn" data-act="x" data-v="${ID}|navm|${ymAdd(ym,-1)}" aria-label="Mois précédent">‹</button><div class="eq-wktitle"><b>${esc(ymLab(ym))}</b><span>heures, absences et chantiers de tout le monde${popTxt()?' · '+popTxt():''}</span></div><button class="eq-wkbtn" data-act="x" data-v="${ID}|navm|${ymAdd(ym,1)}" aria-label="Mois suivant">›</button></div>
    <div class="eq-acts" style="margin:8px 0 0">${btn('tab','nav','🧾 Navettes')}${absVoir(me,ctx)?btn('tab','abs','🏖 Absences · congés'):''}</div></div>`;
  const tiles=`<div class="ac-stats" style="margin:0 0 10px">${k(S2.n,'personne'+(S2.n>1?'s':'')+' suivie'+(S2.n>1?'s':''))}${k(S2.trous,'jour'+(S2.trous>1?'s':'')+' sans heures ni absence',S2.trous?'bad':'ok')}${k(S2.pers,'personne'+(S2.pers>1?'s':'')+' à régulariser',S2.pers?'bad':'')}${k(S2.vides,'semaine'+(S2.vides>1?'s':'')+' entière'+(S2.vides>1?'s':'')+' vide'+(S2.vides>1?'s':''),S2.vides?'bad':'')}${k(S2.inc,'pointage'+(S2.inc>1?'s':'')+' sans fin',S2.inc?'warn':'')}${k(S2.absNow,'absent'+(S2.absNow>1?'s':'')+' aujourd\'hui')}</div>`;
  const wks=`<div class="rh-wks">${W.map(w=>{const n=L.reduce((t,x)=>{const z=x.weeks.find(q=>q.mon===w.mon);return t+(z?z.trous.length:0);},0);return `<button class="chip${cur&&cur.mon===w.mon?' active':''}" data-act="x" data-v="${ID}|ctlw|${w.mon}">S${w.n} <small style="opacity:.75">${frJ(w.mon)} → ${frJ(addDays(w.mon,6))}</small>${n?` <b class="n">${n}</b>`:''}</button>`;}).join('')}</div>`;
  const sem=L.length&&cur?card('🗓 La semaine de tout le monde',`<div class="rh-sub">Qui est où, jour par jour : les heures pointées et le chantier. Touche une case pour le détail${absEdit(me,ctx)?' ou déclarer l\'absence':''}.</div>${wks}${ctlGrid(D,L,cur.mon)}${legCtl()}`):'';
  const mois=L.length?card('📅 Le mois de tout le monde · '+esc(ymLab(ym)),`<div class="rh-sub">Une ligne par personne, une case par jour : ● des heures, les absences par type, « ? » rien du tout.</div>${ctlCal(D,L,false)}${legAbs()}`):'';
  const hyp=`<details class="eq-fold card"><summary><b>Comment ce contrôle est fait</b> <span class="dim">· qui est suivi, ce qui compte comme un manque</span></summary><div class="eq-s" style="margin-top:6px">Sont suivis : le personnel de terrain, les chefs et les intérimaires, plus toute personne qui pointe. Un <b>salarié</b> doit avoir des heures ou une absence chaque jour du lundi au vendredi, planifié ou non ; un <b>intérimaire</b> seulement les jours où il est au planning. Ne comptent pas comme un manque : un férié, un pont (le jour entre le week-end et le férié), le vendredi d'une semaine qui a déjà ses heures (rythme 4 jours), un jour avant l'entrée ou après la fin du contrat, et les personnes qui ne pointent pas. Le samedi et le dimanche ne sont montrés que s'ils sont pointés. Un nouvel arrivant : renseigne sa date d'entrée dans sa fiche, les jours d'avant ne comptent plus. Les jours d'un autre mois se contrôlent dans leur mois.</div></details>`;
  return tete+tiles+ctlAlertes(D,L,me,ctx)+sem+mois+hyp;}
/* un jour d'une personne : ce qu'on sait, et quoi faire */
function ctlDayModal(pid,d,me,ctx){const api=ctx.api||A;let D=null;try{D=ctlData(String(d).slice(0,7));}catch(e){console.warn(e);}const x=D&&D.people.find(z=>z.p.id===pid);const j=x&&x.by[d];if(!j){ctx.toast('Jour introuvable');return;}
  const nv=navVoir(me,ctx),ae=absEdit(me,ctx);const mon=lundiDe(d);const row=rows('rhabs').find(r=>r.p===pid&&r.du<=d&&(r.au||r.du)>=d)||null;
  const txt=nv?etatJour(j):(j.st==='abs'?(j.abs||'Absence'):j.st==='fer'?'Jour férié':'—');
  api.openModal(`<h3 style="margin-top:0">${esc(nomDe(x.p))} <span class="hint">· ${esc(jourTxt(d))}/${String(d).slice(0,4)}${x.interim?' · intérimaire'+(x.agence?' '+esc(x.agence):''):''}</span></h3>
    <div id="cd-etat" data-st="${j.st}" style="font-size:14px;margin:4px 0 10px">${esc(txt)}</div>
    ${nv&&j.st==='trou'?'<div class="hint" style="margin:0 0 8px">Les heures se saisissent ou se corrigent dans Pilotage → Pointages à valider. Si la personne était absente, déclare l\'absence ici : le jour sort du contrôle et n\'est plus lissé sur la navette.</div>':''}
    <div class="actions">${ae&&!row&&['trou','futur','np','repos','pont'].includes(j.st)?'<button class="btn primary block" id="cd-abs">🏖 Déclarer une absence ce jour-là</button>':''}${ae&&row?'<button class="btn block" id="cd-abse">✏️ Ouvrir l\'absence</button>':''}${nv&&x.suivi&&j.i<6?`<button class="btn block" id="cd-nav">🧾 La semaine du ${frJ(mon)} dans les navettes</button>`:''}<button class="btn block" data-close>Fermer</button></div>`);
  const g=k=>document.getElementById(k);if(g('cd-abs'))g('cd-abs').onclick=()=>absNew(pid,d,d,me,ctx);if(g('cd-abse'))g('cd-abse').onclick=()=>modal('rhabs',row.id,me,ctx);
  if(g('cd-nav'))g('cd-nav').onclick=()=>navWeekModal(pid,mon,me,ctx,addDays(mon,3).slice(0,7));}
/* nouvelle absence pré-remplie (personne, du, au) */
function absNew(pid,du,au,me,ctx){modal('rhabs',null,me,ctx);const set=()=>{const g=k=>document.getElementById(k);if(!g('rh-p'))return;g('rh-p').value=pid;g('rh-du').value=du;g('rh-au').value=au||du;g('rh-au').dispatchEvent(new Event('change',{bubbles:true}));};set();setTimeout(set,40);}
/* une semaine : jour par jour, l'explication, et la main (RH / responsable d'exploitation) */
function navWeekModal(pid,mon,me,ctx,ymF){const api=ctx.api||A;const ym=ymF||NAVM||ymNow();const L0=(NAVCACHE&&NAVCACHE.ym===ym?NAVCACHE.L:navData(ym));const x=L0.find(z=>z.p.id===pid);const w=x&&x.N.weeks.find(z=>z.mon===mon);const L=w&&w.liss;
  if(!L){ctx.toast('Semaine introuvable');return;}const ed=navEdit(me,ctx);const M=L.main||{};const fr=d=>String(d).slice(8,10)+'/'+String(d).slice(5,7);
  const autoL=j=>j.i<5&&(j.st==='pointe'||j.st==='')&&!j.fixe0; /* 19/11 nuit : un jour au réel d'office (férié travaillé, règle de la semaine) n'est pas lissé — le cocher = « lissé quand même » */
  const RGr=!!(L.regle&&L.regle.mode==='reel'); /* la règle commune met toute la semaine aux heures réelles : c'est le réglage de départ de la personne */
  /* 19/11 nuit (Ethan : « que ce soit dynamique : quand tu coches, décoches, que les valeurs lissées s'ajustent en direct sous nos yeux, et modifiables seulement avec l'option
     manuelle ») — le tableau, l'explication et les heures de la navette se REJOUENT à chaque geste (lisserSemaine sur ce qui a servi à calculer la semaine : L.entree) ; rien n'est
     enregistré avant « Enregistrer ». Les heures ne se saisissent qu'avec « Heures saisies à la main » ; sinon elles montrent le calcul. */
  const tabHTML=P=>`<tr><th>Jour</th><th class="r">Pointé</th><th class="r">Navette</th><th>Chantier</th><th class="r">Inter-ch.</th></tr>`+P.jours.map(j=>`<tr><td>${JL6[j.i]} ${fr(j.d)}</td><td class="r">${j.reel!==null?nbh(j.reel):'—'}</td><td class="r"><b>${j.h!==null&&j.h!==undefined?nbh(j.h):'—'}</b></td><td>${esc(j.site?j.site.nom:'')}${j.emprunt?' <span class="dim">(chantier du jour travaillé d\'avant)</span>':''}${j.lab&&j.reel===null?' <span class="eq-tag">'+esc(j.lab)+'</span>':''}${j.fixe?' <span class="eq-tag" data-fixe="1">'+(j.ferT?'férié travaillé · au réel':'au réel · règle de la semaine')+'</span>':''}</td><td class="r">${j.it?nbh(j.it):''}</td></tr>`).join('')
    +`<tr class="tot"><td>Semaine</td><td class="r">${nbh(P.reel)}</td><td class="r"><b>${nbh(P.total)}</b>${P.total!==P.declare?'<div class="dim" style="font-size:10.5px">dont '+nbh(P.total-P.declare)+' h des compteurs</div>':''}</td><td>${esc(P.etatTxt)}</td><td class="r">${P.it?nbh(P.it):''}</td></tr>`;
  const explHTML=P=>P.expl.map(t=>`<li>${esc(t)}</li>`).join('');
  const mode=M.mode||(RGr?'reel':'auto');const hTxt=md=>md==='main'?'· à toi de les saisir':md==='reel'?'· les heures réelles — pour les modifier : « Heures saisies à la main »':'· calculées par les règles — pour les modifier : « Heures saisies à la main »';
  const hIn=i=>{const v=mode==='main'&&Array.isArray(M.h)?M.h[i]:L.jours[i].h;return `<input class="f" type="number" step="0.25" min="0" max="12" inputmode="decimal" id="nv-h${i}" value="${v===null||v===undefined?'':esc(v)}" style="width:72px"${mode==='main'?'':' disabled'}>`;};
  const form=ed?`<div class="nav-main"><h4 style="margin:12px 0 6px">✋ Avoir la main sur cette semaine</h4>
    <label class="f" style="display:flex;gap:8px;align-items:center"><input type="radio" name="nv-mode" value="auto"${mode==='auto'?' checked':''}> Lissage automatique (les règles)</label>
    <label class="f" style="display:flex;gap:8px;align-items:center"><input type="radio" name="nv-mode" value="reel"${mode==='reel'?' checked':''}> Heures réelles jour par jour (pas de lissage)${RGr?' — la règle de la semaine pour tout le monde':''}</label>
    <label class="f" style="display:flex;gap:8px;align-items:center"><input type="radio" name="nv-mode" value="main"${mode==='main'?' checked':''}> Heures saisies à la main</label>
    <div class="eq-s" style="margin:8px 0 2px"><b>Heures de la navette</b> <span class="dim" id="nv-hhint">${esc(hTxt(mode))}</span></div>
    <div class="nav-hin" style="display:flex;flex-wrap:wrap;gap:8px;margin:2px 0 6px">${L.jours.map((j,i)=>`<div><div class="dim" style="font-size:11px">${JL6[i]} ${fr(j.d)}</div>${hIn(i)}</div>`).join('')}</div>
    <div class="eq-s" style="margin:6px 0 2px">Jours lissés :</div><div style="display:flex;flex-wrap:wrap;gap:10px">${L.jours.slice(0,5).map((j,i)=>`<label style="display:flex;gap:6px;align-items:center;min-height:40px"><input type="checkbox" id="nv-l${i}"${j.liss?' checked':''} data-auto="${autoL(j)?1:0}"> ${JL6[i]}${j.fixe0?' <span class="dim" style="font-size:11px">(au réel)</span>':''}</label>`).join('')}</div>
    <label class="f" style="display:flex;gap:8px;align-items:center;margin-top:6px"><input type="checkbox" id="nv-force"${M.force?' checked':''}> Valider la semaine telle quelle (un jour attendu sans pointage = non travaillé)</label>
    <label class="f" style="display:flex;gap:8px;align-items:center"><input type="checkbox" id="nv-comble"${M.comble===false?'':' checked'}> Compléter avec les compteurs si la semaine est sous le contrat</label>
    <div class="nav-apercu" id="nv-apercu" hidden>● Aperçu : rien n'est enregistré tant que tu n'as pas touché « Enregistrer ».</div>
    <label class="f">Motif (obligatoire)</label><input class="f" id="nv-motif" value="${esc(M.motif||'')}" placeholder="ex. pont du 10/11 non déclaré, accord avec le gars…">
    <div class="actions" style="margin-top:10px"><button class="btn primary block" id="nv-ok">Enregistrer</button>${L.main?'<button class="btn block" id="nv-auto">Revenir au calcul automatique</button>':''}<button class="btn block" data-close>Fermer</button></div></div>`:'<div class="actions" style="margin-top:10px"><button class="btn block" data-close>Fermer</button></div>';
  api.openModal(`<h3 style="margin-top:0">🧾 ${esc(nomDe(x.p))} · S${w.n} <span class="hint">· ${fr(mon)} → ${fr(addDays(mon,5))}</span></h3>
    <div style="overflow:auto"><table class="rc ch-tab" id="nv-tab">${tabHTML(L)}</table></div>
    <div class="nav-wexp" style="margin-top:8px"><b>Comment on arrive là</b><ul id="nv-expl">${explHTML(L)}</ul></div>${form}`);
  if(!ed)return;const g=k=>document.getElementById(k);const HS=[0,1,2,3,4,5];
  /* le réglage tel que le formulaire le dit (le même pour l'aperçu et pour l'enregistrement) */
  const lire=()=>{const md=(document.querySelector('input[name=nv-mode]:checked')||{}).value||'auto';const o={mode:md};if(RGr&&md==='auto')o.malgre=true; /* 19/11 nuit : lissée malgré la règle commune « semaine au réel » */if(md==='main')o.h=HS.map(i=>{const v=g('nv-h'+i).value;return v===''?null:Math.max(0,Math.min(12,+v));});
    const off=[],on=[];L.jours.slice(0,5).forEach((j,i)=>{const c=g('nv-l'+i).checked,a=autoL(j);if(c&&!a)on.push(j.d);if(!c&&a)off.push(j.d);});if(off.length)o.off=off;if(on.length)o.on=on;
    if(g('nv-force').checked)o.force=true;if(!g('nv-comble').checked)o.comble=false;return o;};
  const neutre=o=>o.mode===(RGr?'reel':'auto')&&!o.off&&!o.on&&!o.force&&o.comble!==false; /* rien de réglé : le calcul automatique tout court */
  const o0=JSON.stringify(lire());let prev=mode,memo=mode==='main'&&Array.isArray(M.h)?M.h.slice():null; /* memo : les heures saisies à la main, rendues si on y revient après un détour par un autre mode */
  const apercu=()=>{let o=lire();const man=o.mode==='main';
    if(man&&prev!=='main'&&memo){HS.forEach(i=>{const v=memo[i];g('nv-h'+i).value=v===null||v===undefined?'':String(v);});o=lire();}
    HS.forEach(i=>{g('nv-h'+i).disabled=!man;});g('nv-hhint').textContent=hTxt(o.mode);prev=o.mode;g('nv-apercu').hidden=JSON.stringify(o)===o0;
    if(man){if(o.h.some(v=>v!==null&&!isFinite(v)))return;memo=o.h.slice();}
    if(!L.entree)return; /* rien pour rejouer le calcul (ne devrait pas arriver) : l'écran reste celui d'avant */
    const motif=(g('nv-motif').value||'').trim();let P=null;try{P=lisserSemaine(Object.assign({},L.entree,{main:neutre(o)?null:Object.assign({},o,motif?{motif}:{})}));}catch(e){console.warn('navette : aperçu',e);return;}
    g('nv-tab').innerHTML=tabHTML(P);g('nv-expl').innerHTML=explHTML(P);
    if(!man)HS.forEach(i=>{const v=P.jours[i].h;g('nv-h'+i).value=v===null||v===undefined?'':String(v);});};
  document.querySelectorAll('input[name=nv-mode]').forEach(r=>r.addEventListener('change',apercu));HS.forEach(i=>g('nv-h'+i).addEventListener('input',apercu));
  [0,1,2,3,4].forEach(i=>g('nv-l'+i).addEventListener('change',apercu));g('nv-force').addEventListener('change',apercu);g('nv-comble').addEventListener('change',apercu);g('nv-motif').addEventListener('input',apercu);
  g('nv-ok').onclick=()=>{const motif=(g('nv-motif').value||'').trim();if(!motif){ctx.toast('Indique le motif (il apparaît dans l\'explication)');g('nv-motif').focus();return;}
    const o=Object.assign(lire(),{motif});if(o.mode==='main'&&o.h.some(v=>v!==null&&!isFinite(v))){ctx.toast('Heures illisibles');return;}
    if(RGr&&neutre(o)){const r0=espaceNavRegler(pid,mon,null);if(!r0.ok){ctx.toast(r0.why||'Refusé');return;}api.closeModal();ctx.toast('✓ La semaine suit la règle commune (heures réelles)');ctx.render();return;} /* 19/11 nuit : sous une règle « semaine au réel », le réglage neutre = suivre la règle */
    const r=espaceNavRegler(pid,mon,o);if(!r.ok){ctx.toast(r.why||'Refusé');return;}api.closeModal();ctx.toast('✓ Semaine réglée à la main — l\'explication le dit');ctx.render();};
  if(g('nv-auto'))g('nv-auto').onclick=()=>{const r=espaceNavRegler(pid,mon,null);if(!r.ok){ctx.toast(r.why||'Refusé');return;}api.closeModal();ctx.toast('✓ Retour au calcul automatique');ctx.render();};}
function vAbs(me,ctx){const voir=absVoir(me,ctx);const L=popRows(visible('rhabs',me,ctx),ctx);const P=voir?popPeople(ctx):[me];const today=todayIso();const y=today.slice(0,4);
  /* 19/11 nuit (Ethan : « calendrier des absences de tous les salariés ») : le mois en un coup d'œil — une ligne par personne absente dans le mois, une case par jour */
  const cal=(()=>{if(!voir)return '';const ym=NAVM||ymNow();let D=null;try{D=ctlData(ym);}catch(e){console.warn('rh : calendrier',e);return '';}const Lc=D.people.filter(x=>popOk(x.p));const A2=Lc.filter(x=>Object.keys(x.by).some(d=>d>=D.d1&&d<=D.dN&&x.by[d].st==='abs'));
    return `<div class="card" data-abscal="1"><div class="eq-wkhead"><button class="eq-wkbtn" data-act="x" data-v="${ID}|navm|${ymAdd(ym,-1)}" aria-label="Mois précédent">‹</button><div class="eq-wktitle"><b>📅 Calendrier des absences · ${esc(ymLab(ym))}</b><span>${A2.length} personne${A2.length>1?'s':''} absente${A2.length>1?'s':''} dans le mois${popTxt()?' · '+popTxt():''} · ${Lc.length-A2.length} sans absence</span></div><button class="eq-wkbtn" data-act="x" data-v="${ID}|navm|${ymAdd(ym,1)}" aria-label="Mois suivant">›</button></div>
      ${A2.length?`<div style="margin-top:8px">${ctlCal(D,A2,true)}</div>${legAbs()}`:'<div class="eq-s" style="margin-top:8px">Aucune absence déclarée ce mois-ci.</div>'}${navVoir(me,ctx)?`<div class="eq-acts" style="margin:8px 0 0">${btn('tab','ctl','✅ Contrôle : qui n\'a ni heures ni absence')}</div>`:''}</div>`;})();
  const tot=P.map(p=>{const m=L.filter(a=>a.p===p.id&&String(a.du||'').slice(0,4)===y);const byT={};m.forEach(a=>{byT[a.type]=(byT[a.type]||0)+(+a.jours||0);});return {p,byT,n:m.reduce((s,a)=>s+(+a.jours||0),0)};}).filter(x=>voir?x.n>0:true);
  const T=ABS_TYPES.filter(t=>tot.some(x=>x.byT[t[0]]));
  return `${warnSrv()}${addBtn('rhabs',me,ctx)}${cal}${card('Jours d\'absence en '+y,`<div class="eq-s" style="margin-bottom:6px">Le compte (jours ouvrés du lundi au vendredi, corrigeable à la saisie) sert au planning et à la navette ; les soldes de congés restent dans le logiciel de paie.</div>
    ${tot.length?`<div style="overflow:auto"><table class="rc ch-tab"><tr><th>Personne</th>${T.map(t=>`<th class="r">${esc(t[1])}</th>`).join('')}<th class="r">Total</th></tr>${tot.map(x=>`<tr><td>${esc(nomDe(x.p))}${tagInt(x.p)}</td>${T.map(t=>`<td class="r">${x.byT[t[0]]||''}</td>`).join('')}<td class="r"><b>${x.n}</b></td></tr>`).join('')}</table></div>`:'<div class="eq-s">Aucune absence enregistrée cette année.</div>'}`)}
    ${card('Absences enregistrées',list('rhabs',me,ctx,L))}`;}
function vHab(me,ctx){const voir=rhVoir(me,ctx);const P=voir?popPeople(ctx):[me];
  const rowsH=[];P.forEach(p=>habsDe(p).forEach(x=>{if(x.h||x.etat==='absente')rowsH.push({p,...x});}));const alert=rowsH.filter(x=>x.etat!=='valide');
  const tr=x=>`<tr class="${x.etat==='expiree'?'bad':x.etat==='echeance'?'warn':''}"><td>${esc(nomDe(x.p))}${tagInt(x.p)}</td><td>${esc((HAB_TYPES[x.type]||{}).label||x.type)}</td><td>${x.h&&x.h.date?fDate(x.h.date):''}</td><td>${x.h&&x.h.fin?fDate(x.h.fin):x.h?'sans limite':''}</td><td>${x.etat==='absente'?'<span style="color:#A3221F">manquante</span>':x.etat==='expiree'?'<span style="color:#A3221F">expirée</span>':x.etat==='echeance'?'<span style="color:#C08A2E">expire dans '+x.j+' j</span>':'✓'}</td><td class="r">${x.h&&x.h.fileData?btn('habfile',x.p.id+'|'+x.type,'📎','sm'):''}${rhEdit(me,ctx)?btn('hab',x.p.id+'|'+x.type,x.h?'✏️':'＋','sm'):''}</td></tr>`;
  return `${rhEdit(me,ctx)?`<div class="eq-acts" style="margin:0 0 8px">${btn('hab','','＋ Habilitation','primary')}</div>`:''}
    ${alert.length?card('À traiter · '+alert.length,`<div style="overflow:auto"><table class="rc ch-tab"><tr><th>Personne</th><th>Habilitation</th><th>Obtenue</th><th>Fin</th><th>État</th><th></th></tr>${alert.map(tr).join('')}</table></div>`):card('','<div class="okbox">✓ Toutes les habilitations requises sont à jour.</div>')}
    ${card('Toutes les habilitations',`<div class="eq-s" style="margin-bottom:6px">Une ligne par personne et par habilitation requise pour son poste (plus celles déposées en plus). Le justificatif se dépose dans la fiche (PDF ou photo).</div><div style="overflow:auto"><table class="rc ch-tab"><tr><th>Personne</th><th>Habilitation</th><th>Obtenue</th><th>Fin</th><th>État</th><th></th></tr>${rowsH.filter(x=>x.etat==='valide').map(tr).join('')}</table></div>`)}`;}
function vForm(me,ctx){const L=popRows(visible('rhform',me,ctx),ctx);const y=todayIso().slice(0,4);const yr=L.filter(x=>(x.du||x.at||'').slice(0,4)===y);const cout=yr.filter(x=>x.statut!=='annule').reduce((s,x)=>s+(+x.cout||0),0),h=yr.filter(x=>x.statut!=='annule').reduce((s,x)=>s+(+x.heures||0),0);
  return `${warnSrv()}${addBtn('rhform',me,ctx)}<div class="ac-stats" style="margin-bottom:10px"><div class="ac-stat"><b>${yr.filter(x=>x.statut==='prevu').length}</b><small>prévues en ${y}</small></div><div class="ac-stat"><b>${yr.filter(x=>x.statut==='fait').length}</b><small>faites en ${y}</small></div><div class="ac-stat"><b>${h}</b><small>heures</small></div>${rhVoir(me,ctx)?`<div class="ac-stat"><b>${eur(cout)}</b><small>budget ${y}</small></div>`:''}</div>
    ${card('Plan de formation',list('rhform',me,ctx,L,r=>(FORM_STATUTS.find(x=>x[0]===r.statut)||['',''])[1]+(r.hab&&HAB_TYPES[r.hab]?' · → '+HAB_TYPES[r.hab].label:'')+(r.heures?' · '+r.heures+' h':'')+(r.cout&&rhVoir(me,ctx)?' · '+eur(r.cout):'')))}`;}
function vPv(me,ctx){const L=visible('rhpv',me,ctx);const today=todayIso();const open=L.filter(x=>x.statut==='recue'||x.statut==='designee'),done=L.filter(x=>!(x.statut==='recue'||x.statut==='designee'));
  const ex=r=>{const st=(PV_STATUTS.find(x=>x[0]===r.statut)||['',''])[1];const e=pvEcheance(r);return st+(r.statut==='recue'&&e?(e<today?' · ⚠ désignation en retard ('+fDate(e)+')':' · à désigner avant le '+fDate(e)):'')+(r.lieu?' · '+r.lieu:'');};
  return `${warnSrv()}${addBtn('rhpv',me,ctx)}${card('En cours · '+open.length,list('rhpv',me,ctx,open,ex))}${card('Réglées · '+done.length,list('rhpv',me,ctx,done,ex))}`;}
function vMut(me,ctx){const voir=rhVoir(me,ctx);const L=popRows(visible('rhmut',me,ctx),ctx);const P=voir?popPeople(ctx):[me];const sans=P.filter(p=>!estInt(p)&&!L.some(x=>x.p===p.id)); /* 19/11 nuit : la mutuelle d'un intérimaire relève de son agence — il n'est pas « sans ligne » */
  return `${warnSrv()}${addBtn('rhmut',me,ctx)}${voir&&sans.length?card('Sans ligne mutuelle · '+sans.length,`<div class="eq-s" style="margin-bottom:6px">Chaque salarié doit être affilié ou dispensé (avec justificatif). Les intérimaires relèvent de leur agence : ils ne sont pas listés.</div><div class="eq-list">${sans.map(p=>`<div class="eq-row"><span class="eq-grow"><span class="eq-t">${esc(nomDe(p))}</span></span>${rhEdit(me,ctx)?btn('newp','rhmut|'+p.id,'＋','sm'):''}</div>`).join('')}</div>`):''}
    ${card('Affiliations et dispenses',list('rhmut',me,ctx,L,r=>(r.statut==='dispense'?(MUT_MOTIFS.find(x=>x[0]===r.motif)||['',''])[1]:'')+(r.statut==='attente'?[r.bulletin?'':'bulletin manquant',r.justif?'':'justificatif manquant'].filter(Boolean).join(', '):'')))}`;}
function vAcc(me,ctx){const L=regAll('accident').filter(x=>x&&x.d).sort((a,b)=>String(b.d).localeCompare(String(a.d)));const open=L.filter(x=>x.status!=='traite');
  return `<div class="ac-stats" style="margin-bottom:10px"><div class="ac-stat${open.length?' bad':''}"><b>${open.length}</b><small>à traiter</small></div><div class="ac-stat"><b>${L.filter(x=>x.d.slice(0,4)===todayIso().slice(0,4)).length}</b><small>déclarations en ${todayIso().slice(0,4)}</small></div></div>
    ${card('Déclarations',`<div class="eq-s" style="margin-bottom:6px">Le traitement (qualification, suite donnée) se fait dans l'écran des déclarations.</div><div class="eq-acts"><button class="btn primary" data-act="xgo" data-v="accident">Ouvrir les déclarations</button></div>`)}`;}
function view(k,me,ctx){const t=k||'home';const ext=(kk,titre)=>(titre?`<h3 class="rh-sect" style="margin:0 0 8px">${titre}</h3>`:'')+(ctx.rhVue?ctx.rhVue(kk):'<div class="card"><div class="eq-s">Écran indisponible.</div></div>');
  const body=t==='gd'?ext('gd',''):t==='cpt'?ext('cpt',''):t==='paie'?ext('rapport','📊 Variables de paie · rapport de la semaine'):t==='nav'?vNav(me,ctx):t==='ctl'?vCtl(me,ctx):t==='abs'?vAbs(me,ctx):t==='hab'?vHab(me,ctx):t==='form'?vForm(me,ctx):t==='pv'?vPv(me,ctx):t==='mut'?vMut(me,ctx):t==='acc'?vAcc(me,ctx):vHome(me,ctx);
  return `<div class="rh2" data-rhpop="${POP}">${head(me,ctx)}${tabs(t,me,ctx)}${body}</div>`;}
/* ── module ── */
let TAB='home';
function tasks(me,ctx){hook(ctx);if(!rhVoir(me,ctx))return [];const today=todayIso();const out=[];
  const late=rows('rhpv').filter(x=>x.statut==='recue').filter(x=>{const e=pvEcheance(x);return e&&e<=addDays(today,7);});if(late.length)out.push({act:true,sev:late.some(x=>pvEcheance(x)<today)?'bad':'warn',ic:'🚔',t:late.length+' contravention'+(late.length>1?'s':'')+' : conducteur à désigner',s:'45 jours après l\'avis, sinon amende majorée pour l\'entreprise',when:'cette semaine',go:()=>{TAB='pv';ctx.go('x:'+ID+':pv');}});
  const wk=rows('rhform').filter(x=>x.statut==='prevu'&&x.du&&x.du>=today&&x.du<=addDays(today,7));if(wk.length)out.push({act:false,sev:'info',ic:'🎓',t:wk.length+' formation'+(wk.length>1?'s':'')+' cette semaine',s:wk.map(x=>(persOf(ctx,x.p)||{prenom:'?'}).prenom+' : '+x.titre).join(' · ').slice(0,120),go:()=>{TAB='form';ctx.go('x:'+ID+':form');}});
  return out;}
const addDays=(d,n)=>{const t=new Date(d+'T12:00:00');t.setDate(t.getDate()+n);return t.toISOString().slice(0,10);};
export default {id:ID,kinds:KINDS,hub:'rh', /* 10/11 soir (Ethan) : module à part entière — son onglet « RH » (app.js / espace.js : vRh), plus une ligne du hub Équipe */
  xview(k,me,ctx){hook(ctx);TAB=k||TAB||'home';return view(TAB,me,ctx);},
  tasks,
  act(v,el,me,ctx){hook(ctx);const parts=String(v).split('|');const k=parts[0];
    if(k==='tab'){TAB=parts[1]||'home';ctx.go('x:'+ID+':'+TAB);return;}
    if(k==='habfile'){habOpenFile(parts[1],parts[2],ctx);return;}
    if(k==='pop'){POP=['sal','int'].includes(parts[1])?parts[1]:'tous';ctx.render();return;} /* 19/11 nuit : population affichée (tous · salariés · intérimaires) */
    if(k==='ctlm'){if(!navVoir(me,ctx)){ctx.toast('Réservé à la RH et au responsable d\'exploitation');return;}NAVM=/^\d{4}-\d{2}$/.test(parts[1]||'')?parts[1]:null;CTLW=null;TAB='ctl';ctx.go('x:'+ID+':ctl');return;} /* le contrôle, sur un mois donné (tableau de bord) */
    if(k==='ctlw'){CTLW=/^\d{4}-\d{2}-\d{2}$/.test(parts[1]||'')?parts[1]:null;const vers=()=>setTimeout(()=>{try{const t=document.querySelector('.rh-sem');if(t&&el&&!el.closest('.rh-wks'))t.scrollIntoView({behavior:'smooth',block:'nearest'});}catch(e){}},80);if(TAB!=='ctl'){TAB='ctl';ctx.go('x:'+ID+':ctl');vers();return;}ctx.render();vers();return;} /* contrôle : la semaine affichée */
    if(k==='ctld'){if(!(navVoir(me,ctx)||absVoir(me,ctx))){ctx.toast('Réservé à la RH et au responsable d\'exploitation');return;}ctlDayModal(parts[1],parts[2],me,ctx);return;}
    if(k==='navr'){if(!navVoir(me,ctx)){ctx.toast('Réservé à la RH et au responsable d\'exploitation');return;}navRegleModal(parts[1],me,ctx);return;} /* règle de la semaine pour tout le monde */
    if(k==='absnew'){if(!absEdit(me,ctx)){ctx.toast('Réservé au responsable d\'exploitation, à la RH et à l\'assistante RH');return;}absNew(parts[1],parts[2],parts[3]||parts[2],me,ctx);return;}
    if(k==='navm'){NAVM=/^\d{4}-\d{2}$/.test(parts[1]||'')?parts[1]:null;CTLW=null;ctx.render();return;} /* 10/11 nuit : navettes — mois affiché */
    if(k==='navw'){if(!navVoir(me,ctx)){ctx.toast('Réservé à la RH et au responsable d\'exploitation');return;}navWeekModal(parts[1],parts[2],me,ctx);return;}
    if(k==='navchoix'){if(!navEdit(me,ctx)){ctx.toast('Réservé à la RH et au responsable d\'exploitation');return;}const ch=parts[3]||'';
      if(ch==='prime'&&!confirm('Payer '+(parts[4]||'0').replace('.',',')+' h en prime sur la paie de ce mois ? Le compteur à reporter repart de zéro.'))return;
      const r=espaceNavChoisir(parts[1],parts[2],ch||null,+parts[4]||0);if(!r.ok){ctx.toast(r.why||'Refusé');return;}ctx.toast(ch==='prime'?'💶 Prime enregistrée (navette du mois)':ch==='reporter'?'↪ Reporter : les heures se replaceront sur les semaines pas pleines':'Choix annulé');ctx.render();return;}
    const kindOf=parts[1]||'';const okW=kindOf==='rhabs'?absEdit(me,ctx):rhEdit(me,ctx);if(!okW){ctx.toast(kindOf==='rhabs'?'Réservé au responsable d\'exploitation, à la RH et à l\'assistante RH':'Réservé à la RH / direction / administrateur');return;}
    if(k==='new'){modal(parts[1],null,me,ctx);return;}
    if(k==='newp'){modal(parts[1],null,me,ctx);setTimeout(()=>{const s=document.getElementById('rh-p');if(s)s.value=parts[2];},30);return;}
    if(k==='edit'){modal(parts[1],parts.slice(2).join('|'),me,ctx);return;}
    if(k==='hab'){habModal(parts[1]||'',parts[2]||'',me,ctx);return;}}};
