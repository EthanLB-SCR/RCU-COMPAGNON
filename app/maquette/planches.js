/* planches.js — 16/10 (lot TA) : traceur, PLANCHES (plans de fond) ↔ LIGNES, groupes de planches, et historique de TOUT le traceur.
   Ethan (16/10) : « une ligne peut aussi être liée à plusieurs plans, exemple 4 planches PDF superposées pour recréer un grand plan… juste mieux pouvoir grouper des
   lignes aux planches, que même quand on veut caler on comprenne mieux quelles lignes et planches on sélectionne, juste le nom c'est pas simple, que ce soit plus clair
   et visuel » ; « les retours en arrière… ça ne marche pas sur un déplacement ou changement d'échelle d'un plan, ça doit concerner n'importe quelle modif du traceur ».
   · K1 (historique) : les plans de fond — position, échelle, rotation, opacité, œil, ordre, ajout / retrait, nom, couleur, groupe, contenu d'un DXF refait — et la vue
     aérienne (géoréférencement) sont une PARTIE de chaque instantané (historique.js : histPart), comme les paramètres du tracé (fournisseur, série, profondeur, règles).
     Après CHAQUE geste de la personne (lâcher, clic, changement de champ) l'état est comparé au dernier retenu : s'il a changé, c'est UNE étape, nommée d'après ce qui a
     changé (« déplacement du plan « X » », « échelle 1/200 du plan « X » »…). Un glisser = un pas (seul le lâcher valide). Les imports (fichiers, PDF, DXF) valident à leur fin.
     Le tracé marché figé et les repères TS d'un chantier, déplacés par un calage, suivent l'annulation (gardés avec l'étape, sans entrer dans la comparaison).
   · K2 (lignes ↔ planches) : l.plans = [id de planche…] (une ligne sur plusieurs planches) ; l.plan (ancien, un seul) reste lu et tenu à jour (= la première) ; une ligne
     d'avant sans lien : la planche sous son 1er sommet. GROUPE de planches : chaque planche du groupe porte p.grp = {id, nom, couleur} (gardé avec les métadonnées du plan :
     IndexedDB, chantier — src/plans.js PLAN_META) ; groupes() = [{id, nom, couleur, plans:[id…]}] (équivalent de fonds.groupes) ; couleur d'une planche : p.coul, sinon
     celle de son groupe. Les planches d'un groupe bougent ENSEMBLE au calage (« un plan et toutes ses lignes » = tout le groupe et toutes leurs lignes).
   · Regroupement visuel : panneau « 🔗 Planches et lignes » (flottant : le dessin reste cliquable) — vignette, couleur, nom modifiable de chaque planche et de chaque
     groupe ; une planche / un groupe touché → ses lignes en couleur, le reste estompé ; une ligne sélectionnée → ses planches entourées ; clic sur le dessin pour ajouter /
     retirer une ligne (ou une planche du groupe) ; au calage : groupes proposés, vignettes et aperçu sur le dessin. */
import {histPart} from './historique.js';
import {tfNorm,tfApply,tfBBox} from '../src/plans.js';
import {fmt} from './traceur.js';
let A=null,T1=null;const S=()=>A.state;
const esc=s=>String(s??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const J=x=>JSON.stringify(x);
// couleurs des planches / groupes : franches, distinctes de l'aller (rouge), du retour (bleu), de la dilatation (orange) et des zones (pastels)
export const PCOL=['#7c3aed','#0d9488','#db2777','#65a30d','#0891b2','#9333ea','#4f46e5','#be185d','#059669','#a21caf','#0369a1','#57534e'];
const plans=()=>A?A.bgPlans():[];const plan=id=>A?A.bgPlan(id):null;
const nameOf=p=>p?(p.name||p.id):'';const icon=p=>p&&p.kind==='dxf'?'📐':p&&p.from==='pdf'?'📄':'🖼';
/* ═════════ K2 · liens lignes ↔ planches ═════════ */
const linkIds=l=>Array.isArray(l&&l.plans)?l.plans.slice():(l&&('plan' in l)?(l.plan?[l.plan]:[]):[]);
export function plansOfLine(l){if(!l||!A)return [];if(Array.isArray(l.plans))return l.plans.filter((id,i,a)=>id&&plan(id)&&a.indexOf(id)===i);if('plan' in l)return l.plan&&plan(l.plan)?[l.plan]:[];const p=A.fonds.planUnder(l.pts&&l.pts[0]);return p?[p]:[];}
export function setLinePlans(l,ids){ids=[...new Set((ids||[]).filter(Boolean))];l.plans=ids;l.plan=ids[0]||null;return l;}
// planches (visibles, la plus haute) sous les sommets et le milieu des tronçons d'une ligne
export function plansUnderLine(l){const out=[];const add=id=>{if(id&&!out.includes(id))out.push(id);};const P=(l&&l.pts)||[];P.forEach((p,i)=>{add(A.fonds.planUnder(p));if(i)add(A.fonds.planUnder([(p[0]+P[i-1][0])/2,(p[1]+P[i-1][1])/2]));});return out;}
// nouvelle ligne : les planches sous elle, sinon la planche active (comme avant : planche sous le départ, sinon l'active)
export function tagNewLine(l){if(!A||!l||('plan' in l)||Array.isArray(l.plans))return l;let ids=plansUnderLine(l);if(!ids.length){const a=A.bgActive();if(a)ids=[a.id];}return setLinePlans(l,ids);}
// ligne d'avant (aucun lien retenu) : on fige celui qu'elle a de fait (planche sous son 1er sommet) — avant un calage, sinon elle changerait de planche en bougeant
export function freezeLink(l){if(l&&!('plan' in l)&&!Array.isArray(l.plans)){const p=A.fonds.planUnder(l.pts&&l.pts[0]);setLinePlans(l,p?[p]:[]);}return l;}
/* ═════════ groupes, couleurs ═════════ */
export const groupOf=p=>p&&p.grp&&p.grp.id?p.grp:null;
export function groupes(){const m=new Map();plans().forEach(p=>{const g=groupOf(p);if(!g)return;let o=m.get(g.id);if(!o){o={id:g.id,nom:g.nom||'Groupe',couleur:g.couleur||PCOL[0],plans:[]};m.set(g.id,o);}o.plans.push(p.id);});return [...m.values()];}
export const unitOf=p=>{const g=groupOf(p);return g?plans().filter(x=>groupOf(x)&&x.grp.id===g.id):(p?[p]:[]);}; // les planches qui bougent ensemble
// id d'unité : 'g:<groupe>' ou id de planche → planches
export function resolveUnit(id){if(!id)return [];const s=String(id);if(s.startsWith('g:')){const g=s.slice(2);return plans().filter(p=>groupOf(p)&&p.grp.id===g);}const p=plan(s);return p?unitOf(p):[];}
export function colorOf(p){if(!p)return '#57534e';const g=groupOf(p);if(g&&g.couleur)return g.couleur;if(p.coul)return p.coul;return PCOL[Math.max(0,plans().indexOf(p))%PCOL.length];}
const usedCols=()=>{const u=new Set();plans().forEach(p=>{if(p.coul)u.add(p.coul);const g=groupOf(p);if(g&&g.couleur)u.add(g.couleur);});return u;};
const freeCol=()=>{const u=usedCols();return PCOL.find(c=>!u.has(c))||PCOL[u.size%PCOL.length];};
export function ensureColors(){if(!A)return;plans().forEach(p=>{if(!p.coul)p.coul=freeCol();});}
export const linesOfUnit=ids=>S().lines.filter(l=>plansOfLine(l).some(id=>ids.includes(id)));
/* calage : les planches qui suivent un ensemble de lignes — une planche (avec tout son groupe) suit quand TOUTES ses lignes bougent (fonds.js movedSet) */
export function followPlans(ids,plans0,note){const L=S().lines;const done=new Set(plans0.map(p=>p.id));const out=plans0.slice();
  plans().forEach(p=>{if(done.has(p.id))return;const U=unitOf(p);U.forEach(x=>done.add(x.id));const uid=U.map(x=>x.id);const mine=L.filter(l=>plansOfLine(l).some(id=>uid.includes(id)));if(!mine.length||!mine.some(l=>ids.has(l.id)))return;
    if(mine.every(l=>ids.has(l.id)))out.push(...U);else note.push(`${U.length>1?'groupe « '+groupOf(p).nom+' »':'plan « '+nameOf(p)+' »'} pas déplacé : ${mine.filter(l=>!ids.has(l.id)).length} autre(s) ligne(s) y restent`);});
  return out;}
/* ═════════ K1 · historique : la partie « fonds » (plans + vue aérienne) et la partie « params » ═════════ */
const CIDS=new WeakMap(),CONTENT=new Map(),STORE=new Map();let cidSeq=0; // contenu d'un plan (traits d'un DXF, image) : gardé une fois, référencé par les étapes
function cidOf(p){const o=p.kind==='dxf'?p.drawing:p.image;if(!o||typeof o!=='object')return 0;let c=CIDS.get(o);if(!c){c=++cidSeq;CIDS.set(o,c);CONTENT.set(c,p.kind==='dxf'?{drawing:p.drawing,bbox:p.bbox,origin:p.origin,netLayers:p.netLayers,images:p.images,report:p.report}:{image:p.image});}return c;}
const plState=p=>{const t=tfNorm(p.transform);return [p.id,p.name||'',p.show!==false?1:0,p.opacity===undefined?.5:+p.opacity,t.tx,t.ty,t.rot,t.k,p.geo||null,p.ech||null,p.dpi||null,p.dpiSrc||null,groupOf(p)?[p.grp.id,p.grp.nom||'',p.grp.couleur||'']:null,p.coul||null,cidOf(p)];};
function takeFonds(){ensureColors();const b=S().bg;const P=b&&Array.isArray(b.plans)?b.plans:[];P.forEach(p=>STORE.set(p.id,p));let g=null;try{g=A.fonds.geo()||null;}catch(e){}return J({P:P.map(plState),o:(b&&b.origin)||null,g});}
let lastMk='',lastTs='';
function takeExtra(){const r=S().siteRef;if(!r)return null;let mk='',ts='';try{if(r.marche&&Array.isArray(r.marche.lines)){mk=J(r.marche.lines.map(x=>x?[x.id,x.axis||null]:null));if(mk===lastMk)mk=lastMk;else lastMk=mk;}
  if(r.ts&&Array.isArray(r.ts.items)){ts=J(r.ts.items.map(it=>it&&Array.isArray(it.geo)?it.geo:null));if(ts===lastTs)ts=lastTs;else lastTs=ts;}}catch(e){}return {mk,ts};}
const metaSig=()=>plans().map(p=>p.id+':'+cidOf(p)+':'+J(p.grp||null)+':'+(p.coul||'')).join('|');
function restoreFonds(str,extra){let o;try{o=JSON.parse(str);}catch(e){return;}const st=S();const sig0=metaSig();const cur=st.bg&&Array.isArray(st.bg.plans)?st.bg.plans:[];let lost=0;
  const out=[];(o.P||[]).forEach(a=>{const p=cur.find(x=>x.id===a[0])||STORE.get(a[0]);if(!p){lost++;return;}
    if(a[14]&&cidOf(p)!==a[14]){const C=CONTENT.get(a[14]);if(C){Object.assign(p,C);p._bb=null;p._tb=null;p._far=undefined;}}
    p.name=a[1];p.show=!!a[2];p.opacity=a[3];p.transform={tx:a[4],ty:a[5],rot:a[6],k:a[7]};p.geo=a[8];
    [['ech',9],['dpi',10],['dpiSrc',11]].forEach(([k,i])=>{if(a[i]===null||a[i]===undefined)delete p[k];else p[k]=a[i];});
    if(a[12])p.grp={id:a[12][0],nom:a[12][1],couleur:a[12][2]};else delete p.grp;if(a[13])p.coul=a[13];else delete p.coul;p._lastKey=null;out.push(p);});
  if(out.length||o.o){const b=A.bgObj();b.plans.splice(0,b.plans.length,...out);b.origin=o.o||null;if(!out.some(p=>p.id===b.active))b.active=out.length?out[out.length-1].id:null;}
  else if(st.bg){st.bg.plans.length=0;st.bg=null;}
  try{A.fonds.setGeo(o.g||null);}catch(e){}
  if(extra&&st.siteRef){const r=st.siteRef;try{if(extra.mk&&r.marche&&Array.isArray(r.marche.lines)){const m=new Map(JSON.parse(extra.mk).filter(Boolean).map(x=>[x[0],x[1]]));r.marche.lines.forEach(x=>{if(x&&m.has(x.id)&&m.get(x.id))x.axis=m.get(x.id);});}
    if(extra.ts&&r.ts&&Array.isArray(r.ts.items)){const G=JSON.parse(extra.ts);if(G.length===r.ts.items.length)r.ts.items.forEach((it,i)=>{if(it&&G[i])it.geo=G[i];});}}catch(e){}}
  A.renderBg();A.saveBg();if(metaSig()!==sig0)A.saveBgIDB();if(st.tab==='fond')A.renderPanel();A.render();if(lost)A.flash(`${lost} plan(s) de fond introuvable(s) en mémoire : à réimporter`);syncPanel(true);}
const pn=r=>`« ${r[1]||r[0]} »`;const RD=v=>Math.round(v*100)/100;
function describeFonds(x,y){let a,b;try{a=JSON.parse(x);b=JSON.parse(y);}catch(e){return null;}const A0=new Map(a.P.map(r=>[r[0],r])),B0=new Map(b.P.map(r=>[r[0],r]));
  const add=b.P.filter(r=>!A0.has(r[0])),del=a.P.filter(r=>!B0.has(r[0]));
  if(add.length&&!del.length)return add.length===1?'ajout du plan '+pn(add[0]):`ajout de ${add.length} plans`;
  if(del.length&&!add.length)return del.length===1?'retrait du plan '+pn(del[0]):`retrait de ${del.length} plans`;
  if(add.length&&del.length)return 'plans de fond remplacés';
  const ch=[];b.P.forEach(r=>{const o=A0.get(r[0]);if(o&&J(o)!==J(r))ch.push([o,r]);});
  if(!ch.length){const ia=a.P.map(r=>r[0]),ib=b.P.map(r=>r[0]);if(ia.join()!==ib.join()){const mv=b.P.find(r=>Math.abs(ib.indexOf(r[0])-ia.indexOf(r[0]))===1&&ib.indexOf(r[0])>ia.indexOf(r[0]))||b.P.find(r=>ib.indexOf(r[0])!==ia.indexOf(r[0]));return `ordre des plans (${pn(mv)} ${ib.indexOf(mv[0])>ia.indexOf(mv[0])?'au-dessus':'en dessous'})`;}
    if(J(a.g)!==J(b.g))return !a.g?'vue aérienne'+(b.g&&b.g.addr?` « ${b.g.addr} »`:''):!b.g?'vue aérienne oubliée':'calage du tracé entier sur la vue aérienne';if(J(a.o)!==J(b.o))return 'repère commun des plans';return null;}
  const gA=new Set(a.P.filter(r=>r[12]).map(r=>r[12][0])),gB=new Set(b.P.filter(r=>r[12]).map(r=>r[12][0]));
  if(ch.every(([o,r])=>J(o.slice(0,12))===J(r.slice(0,12))&&o[13]===r[13]&&o[14]===r[14])){ // groupes seulement
    const r0=ch[0][1],o0=ch[0][0];
    if(r0[12]&&!gA.has(r0[12][0]))return `groupe « ${r0[12][1]} » créé (${b.P.filter(r=>r[12]&&r[12][0]===r0[12][0]).length} planche${b.P.filter(r=>r[12]&&r[12][0]===r0[12][0]).length>1?'s':''})`;
    if(o0[12]&&!gB.has(o0[12][0]))return `groupe « ${o0[12][1]} » défait`;
    if(o0[12]&&r0[12]&&o0[12][0]===r0[12][0]){if(o0[12][1]!==r0[12][1])return `groupe « ${o0[12][1]} » renommé « ${r0[12][1]} »`;return `couleur du groupe « ${r0[12][1]} »`;}
    if(ch.length===1)return r0[12]?`plan ${pn(r0)} dans le groupe « ${r0[12][1]} »`:`plan ${pn(r0)} sorti du groupe « ${o0[12][1]} »`;return `groupes de planches (${ch.length} planches)`;}
  const one=(o,r)=>{if(o[1]!==r[1])return `plan ${pn(o)} renommé ${pn(r)}`;if(o[14]!==r[14])return `calques du DXF ${pn(r)}`;if(o[7]!==r[7]&&o[6]!==r[6])return `calage du plan ${pn(r)} (échelle, rotation, position)`;if(o[7]!==r[7])return r[9]&&r[9]!==o[9]?`échelle 1/${r[9]} du plan ${pn(r)}`:`échelle du plan ${pn(r)} (×${fmt(RD(r[7]/o[7]))})`;
    if(o[6]!==r[6])return `rotation du plan ${pn(r)} (${fmt(RD(o[6]))}° → ${fmt(RD(r[6]))}°)`;if(o[4]!==r[4]||o[5]!==r[5])return `déplacement du plan ${pn(r)}`;if(o[3]!==r[3])return `opacité du plan ${pn(r)} (${Math.round(o[3]*100)} % → ${Math.round(r[3]*100)} %)`;
    if(o[2]!==r[2])return `plan ${pn(r)} ${r[2]?'affiché':'masqué'}`;if(o[13]!==r[13])return `couleur du plan ${pn(r)}`;if(J(o[12])!==J(r[12]))return r[12]?`plan ${pn(r)} dans le groupe « ${r[12][1]} »`:`plan ${pn(r)} sorti de son groupe`;if(o[8]!==r[8])return `calage du plan ${pn(r)}`;return `plan ${pn(r)}`;};
  if(ch.length===1)return one(ch[0][0],ch[0][1]);
  if(ch.every(([o,r])=>o[6]===r[6]&&o[7]===r[7]&&(o[4]!==r[4]||o[5]!==r[5])))return `déplacement de ${ch.length} plans`;
  return `${ch.length} plans retouchés`;}
function describeLinks(x,y){let A1,B1;try{A1=JSON.parse(x);B1=JSON.parse(y);}catch(e){return null;}const m=new Map(A1.map(l=>[l.id,l]));const ch=[];
  B1.forEach(l=>{const o=m.get(l.id);if(!o)return;const pa=linkIds(o),pb=linkIds(l);if(pa.join()!==pb.join())ch.push({l,pa,pb});});if(!ch.length)return null;
  const nmP=id=>{const p=plan(id)||STORE.get(id);return `« ${p?nameOf(p):id} »`;};
  if(ch.length===1){const {l,pa,pb}=ch[0];const ad=pb.filter(i=>!pa.includes(i)),dl=pa.filter(i=>!pb.includes(i));if(ad.length&&!dl.length)return `lien « ${l.name} » ↔ ${ad.map(nmP).join(', ')}`;if(dl.length&&!ad.length)return `« ${l.name} » détachée de ${dl.map(nmP).join(', ')}`;return `planches de « ${l.name} »`;}
  return `liens lignes ↔ planches (${ch.length} lignes)`;}
const takeParams=()=>{const st=S();return J([st.supplier,+st.serie,st.prof,A.rules()]);};
function restoreParams(v){if(v===takeParams())return;let a;try{a=JSON.parse(v);}catch(e){return;}const st=S();st.supplier=a[0];st.serie=a[1];st.prof=a[2];A.setRules(Object.assign({},a[3]));A.syncHeader();A.rebuild();}
function describeParams(x,y){let a,b;try{a=JSON.parse(x);b=JSON.parse(y);}catch(e){return null;}if(a[0]!==b[0]||a[1]!==b[1])return `fournisseur ${a[0]} série ${a[1]} → ${b[0]} série ${b[1]}`;
  if(a[2]!==b[2])return `profondeur de pose par défaut (${fmt(a[2])} → ${fmt(b[2])} m)`;const r=a[3]||{},s=b[3]||{};
  if(r.dilatTemp!==s.dilatTemp)return `dilatation : ${s.dilatTemp} °C`;if(r.dilatContrainte!==s.dilatContrainte)return `dilatation : ${s.dilatContrainte} N/mm²`;if(r.dilatAlerte!==s.dilatAlerte)return `alerte dilatation ${s.dilatAlerte===false?'désactivée':'activée'}`;return 'règles du traceur';}
/* une action « hors reconstruction » (plans, liens) : nom de l'étape + validation à la fin de la tâche */
export function done(t){if(!T1)return;if(t)T1.hist.label(t);T1.hist.schedule();}
// import asynchrone (fichiers, pages d'un PDF, calques d'un DXF) : pas de validation au milieu ; UNE étape à la fin
let BUSY=0,BUSYat=0;export function begin(){BUSY++;BUSYat=Date.now();if(T1)T1.hist.flush();}export function end(t){BUSY=Math.max(0,BUSY-1);if(!BUSY)done(t);}
const busy=()=>{if(BUSY&&Date.now()-BUSYat>180000)BUSY=0;return BUSY>0;}; // import interrompu par une erreur (end() jamais appelé) : l'historique ne reste pas bloqué
// chargement asynchrone des plans (IndexedDB au démarrage) : l'état chargé devient la référence, sans étape
export function loaded(){if(!T1)return;ensureColors();T1.hist.flush();T1.hist.resetOnNext();T1.hist.commit();renderHL();syncPanel(true);}
/* ═════════ panneau « 🔗 Planches et lignes » ═════════ */
let OPEN=false,FOC=null,PICK=null,panel=null,gHL=null,HL='',PSIG='',CALPREV=null;
const CSS=`#plPanel{position:absolute;right:52px;top:44px;width:min(360px,calc(100% - 64px));max-height:calc(100% - 110px);overflow:auto;z-index:7;background:rgba(252,252,251,.985);border:1px solid var(--line);border-radius:12px;box-shadow:0 8px 28px rgba(0,0,0,.18);padding:8px 10px;font-size:12.5px}
#plPanel .pl-h{display:flex;align-items:center;gap:6px;margin-bottom:2px}#plPanel .pl-h b{flex:1;font-size:13px}#plPanel .btn,#plPanel select.f,#plPanel input.f{min-height:34px}
#plPanel .pl-sec{font-size:11px;text-transform:uppercase;letter-spacing:.05em;color:var(--ink2);margin:8px 0 3px}#plPanel .pl-hint{font-size:11.5px;margin-bottom:2px}
#plPanel .pl-it{display:flex;align-items:flex-start;gap:7px;padding:5px 6px;border:1px solid var(--line);border-left:5px solid var(--c);border-radius:9px;margin:4px 0;cursor:pointer;background:var(--page)}
#plPanel .pl-it.on{box-shadow:0 0 0 2px var(--c);background:#fff}#plPanel .pl-c{flex:1;min-width:0;display:flex;flex-direction:column;gap:4px}#plPanel .pl-r{display:flex;align-items:center;gap:5px;min-width:0}
#plPanel .pl-r input.pl-nm{flex:1;min-width:0;width:auto}#plPanel .pl-r small{color:var(--ink2);white-space:nowrap;flex:1;overflow:hidden;text-overflow:ellipsis}#plPanel .pl-r select.f{max-width:58%;min-width:0}
#plPanel input[type=color]{width:38px;height:34px;padding:2px;border:1px solid var(--line);border-radius:8px;background:#fff;flex:none}
.pl-th{width:48px;height:36px;flex:none;border:2px solid var(--c,#999);border-radius:6px;background:#fff center/cover no-repeat;display:inline-flex;align-items:center;justify-content:center;font-size:17px;overflow:hidden}
#plPanel .pl-ths{display:flex;flex-wrap:wrap;gap:4px}#plPanel .pl-ths .pl-th{width:40px;height:30px}
#plPanel .pl-foc{border:2px solid var(--c);border-radius:10px;padding:6px 8px;margin:6px 0;background:#fff}#plPanel .pl-row{display:flex;flex-wrap:wrap;gap:6px;margin-top:6px;align-items:center}
#plPanel .pl-chips{display:flex;flex-wrap:wrap;gap:4px;margin-top:4px}#plPanel .pl-chip{display:inline-flex;align-items:center;gap:3px;border:1px solid var(--line);border-radius:999px;padding:0 0 0 8px;background:var(--page);font-size:12px}
#plPanel .pl-chip .btn{min-height:34px;border:0;background:none;padding:0 9px}.pl-dot{display:inline-block;width:11px;height:11px;border-radius:3px;vertical-align:-1px;margin-right:3px;background:var(--c)}
.pl-tag{display:inline-flex;align-items:center;gap:3px;border-radius:999px;padding:0 7px;font-size:11px;font-weight:600;color:#fff;background:var(--c)}
.t2 .pl-calprev{display:flex;flex-wrap:wrap;gap:5px;align-items:center;margin:4px 0 0 26px;font-size:12px;color:var(--ink2)}.t2 .pl-calprev .pl-th{width:44px;height:33px}
#t1Bar #plBtn.on{background:var(--ink);color:#fff;border-color:var(--ink)}
@media (max-width:800px){#plPanel{left:8px;right:auto;top:auto;bottom:8px;width:calc(100% - 64px);max-height:min(58%,calc(100% - 96px))}#plPanel .pl-hint{display:none}}`;
/* vignette : l'image du plan réduite UNE fois (pas l'image entière, ~6 000 px, dans le panneau) */
const TH=new WeakMap();
function thumbSrc(p){const im=p&&p.kind==='image'&&p.image;if(!im||!im.src)return null;const c=TH.get(im);if(c)return c==='…'?null:c;TH.set(im,'…');
  const img=new Image();img.onload=()=>{try{const W=96,H=72,r=Math.max(W/img.width,H/img.height);const cv=document.createElement('canvas');cv.width=W;cv.height=H;const g=cv.getContext('2d');g.fillStyle='#fff';g.fillRect(0,0,W,H);g.drawImage(img,(W-img.width*r)/2,(H-img.height*r)/2,img.width*r,img.height*r);TH.set(im,cv.toDataURL('image/jpeg',.75));}catch(e){TH.set(im,'x');}PSIG='';syncPanel();const pv=document.querySelector('#modalBody .pl-calprev');if(pv&&CALPREV)pv.innerHTML=calPreviewHTML(CALPREV);};img.onerror=()=>TH.set(im,'x');img.src=im.src;return null;}
function thumb(p,cls){const c=colorOf(p);const s=thumbSrc(p);return s&&s!=='x'?`<span class="pl-th ${cls||''}" style="--c:${c};background-image:url('${esc(s)}')" title="${esc(nameOf(p))}"></span>`:`<span class="pl-th ${cls||''}" style="--c:${c}" title="${esc(nameOf(p))}">${icon(p)}</span>`;}
export const thumbHTML=thumb;
const focIds=()=>FOC?resolveUnit(FOC.k==='g'?'g:'+FOC.id:FOC.id).map(p=>p.id):[];
function focLabel(){if(!FOC)return '';if(FOC.k==='g'){const g=groupes().find(x=>x.id===FOC.id);return g?`groupe « ${g.nom} »`:'groupe';}const p=plan(FOC.id);return `planche « ${nameOf(p)} »`;}
function panelHTML(){const P=plans();const G=groupes();const L=S().lines;
  if(FOC&&!focIds().length){FOC=null;PICK=null;}
  let h=`<div class="pl-h"><b>🔗 Planches et lignes</b><button class="btn sm" data-pl="close" title="fermer">✕</button></div>`;
  if(!P.length)return h+`<div class="muted">Aucun plan de fond : ＋ Plan (DXF, PDF, image) d'abord.</div>`;
  if(FOC){const ids=focIds();const col=colorOf(plan(ids[0]));const ls=linesOfUnit(ids);const geo=!!(A.fonds.geo&&A.fonds.geo());
    h+=`<div class="pl-foc" style="--c:${col}"><div><span class="pl-dot"></span><b>${esc(focLabel())}</b> : ${ls.length} ligne${ls.length>1?'s':''}${FOC.k==='g'?` sur ${ids.length} planche${ids.length>1?'s':''}`:''} <span class="muted">— en couleur sur le dessin</span></div>
      <div class="pl-chips">${ls.map(l=>`<span class="pl-chip">${esc(l.name)}<button class="btn sm" data-pl="unlink" data-line="${esc(l.id)}" title="retirer « ${esc(l.name)} » de ${esc(focLabel())}">✕</button></span>`).join('')||'<span class="muted">aucune ligne</span>'}</div>
      <div class="pl-row"><button class="btn ${PICK==='lines'?'on':''}" data-pl="pick" data-v="lines" title="clic sur une ligne du dessin : l'ajouter à ${esc(focLabel())} ou l'en retirer">✎ Lignes au clic</button>${FOC.k==='g'?`<button class="btn ${PICK==='plans'?'on':''}" data-pl="pick" data-v="plans" title="clic sur une planche du dessin : l'ajouter au groupe ou l'en retirer">▣ Planches au clic</button>`:`<button class="btn" data-pl="gnew" title="nouveau groupe avec cette planche (puis ▣ pour y ajouter les autres)">＋ Groupe</button>`}<button class="btn" data-pl="frame">⤢ Cadrer</button>${geo?`<button class="btn" data-pl="cal" title="caler sur la vue aérienne ${esc(focLabel())} et toutes ses lignes">⌖ Caler</button>`:''}</div></div>`;}
  else h+=`<div class="muted pl-hint">Touche une planche ou un groupe : ses lignes s'allument sur le dessin, le reste s'estompe. Une ligne peut être sur plusieurs planches.</div>`;
  if(G.length)h+=`<div class="pl-sec">Groupes de planches (${G.length})</div>`+G.map(g=>{const n=linesOfUnit(g.plans).length;const on=FOC&&FOC.k==='g'&&FOC.id===g.id;
    return `<div class="pl-it pl-g ${on?'on':''}" data-pl="foc" data-k="g" data-id="${esc(g.id)}" style="--c:${esc(g.couleur)}"><span class="pl-th" style="--c:${esc(g.couleur)}">▦</span><div class="pl-c">
      <div class="pl-r"><input class="f pl-nm" data-pl="gname" data-id="${esc(g.id)}" value="${esc(g.nom)}" aria-label="nom du groupe"><input type="color" data-pl="gcol" data-id="${esc(g.id)}" value="${esc(g.couleur)}" title="couleur du groupe"><button class="btn sm danger" data-pl="gdel" data-id="${esc(g.id)}" title="défaire le groupe (les planches restent)">✕</button></div>
      <div class="pl-r"><small>${g.plans.length} planche${g.plans.length>1?'s':''} · ${n} ligne${n>1?'s':''}</small></div><div class="pl-ths">${g.plans.map(id=>thumb(plan(id))).join('')}</div></div></div>`;}).join('');
  h+=`<div class="pl-sec">Planches (${P.length})</div>`+P.map(p=>{const n=linesOfUnit([p.id]).length;const g=groupOf(p);const on=FOC&&FOC.k==='p'&&FOC.id===p.id;
    return `<div class="pl-it ${on?'on':''}" data-pl="foc" data-k="p" data-id="${esc(p.id)}" style="--c:${colorOf(p)}">${thumb(p)}<div class="pl-c">
      <div class="pl-r"><input class="f pl-nm" data-pl="pname" data-id="${esc(p.id)}" value="${esc(nameOf(p))}" aria-label="nom de la planche">${g?'':`<input type="color" data-pl="pcol" data-id="${esc(p.id)}" value="${esc(colorOf(p))}" title="couleur de la planche">`}</div>
      <div class="pl-r"><small>${n} ligne${n>1?'s':''}</small><select class="f" data-pl="pgrp" data-id="${esc(p.id)}" title="groupe de planches (les planches d'un groupe se calent ensemble)"><option value="">${g?'— sortir du groupe —':'sans groupe'}</option>${G.map(x=>`<option value="${esc(x.id)}" ${g&&g.id===x.id?'selected':''}>▦ ${esc(x.nom)}</option>`).join('')}<option value="+">＋ nouveau groupe</option></select></div></div></div>`;}).join('');
  if(!FOC)h+=`<div class="pl-row"><button class="btn" data-pl="gnew" title="nouveau groupe avec la planche active (puis ▣ pour y ajouter les autres)">＋ Grouper des planches</button></div>`;
  const free=L.filter(l=>!plansOfLine(l).length);
  h+=`<div class="pl-sec">Lignes sans planche (${free.length})</div>${free.length?`<div class="pl-chips">${free.map(l=>`<span class="pl-chip" style="padding-right:8px">${esc(l.name)}</span>`).join('')}</div>`:'<div class="muted">toutes les lignes sont sur une planche</div>'}
    <div class="pl-row"><button class="btn" data-pl="auto" title="chaque ligne est rattachée aux planches visibles sous elle (sommets et milieux des tronçons)">↺ Chaque ligne → les planches sous elle</button></div>`;
  return h;}
function syncBtn(){const b=document.getElementById('plBtn');if(!b)return;const d=plans().length?'':'none';if(b.style.display!==d)b.style.display=d;b.classList.toggle('on',OPEN);} // « 🔗 Planches » : seulement s'il y a des plans
function syncPanel(force){if(!panel)return;syncBtn();panel.style.display=OPEN?'':'none';if(!OPEN)return;
  const sig=J([plans().map(p=>[p.id,p.name,p.coul,p.grp,p.kind==='image'&&p.image?p.image.pw:0]),S().lines.map(l=>[l.id,l.name,linkIds(l)]),FOC,PICK,!!(A.fonds.geo&&A.fonds.geo())]);
  if(!force&&sig===PSIG)return;const ae=document.activeElement;if(!force&&ae&&panel.contains(ae)&&ae.tagName==='INPUT'&&ae.type==='text')return;PSIG=sig;panel.innerHTML=panelHTML();}
export function openPanel(on,foc){OPEN=on!==false;if(foc!==undefined)FOC=foc;if(!OPEN){FOC=null;setPick(null);}syncPanel(true);renderHL();}
function setPick(v){PICK=v||null;const st=S();if(PICK){if(st.mode!=='plPick')A.setMode('plPick');hintPick();}else if(st.mode==='plPick')A.setMode('select');}
function hintPick(){const h=document.getElementById('hint');if(!h||!PICK)return;h.textContent=PICK==='lines'?`🔗 Clique une ligne : elle est ajoutée à ${focLabel()} (ou retirée si elle y est déjà). Échap pour finir.`:`▣ Clique une planche du dessin : elle entre dans le ${focLabel()} (ou en sort). Échap pour finir.`;h.style.display='block';}
export function onMode(){if(!A)return;if(S().mode!=='plPick'&&PICK){PICK=null;syncPanel(true);}if(S().mode==='plPick')hintPick();renderHL();}
/* ═════════ actions (chacune = une étape nommée) ═════════ */
function persist(){A.saveBg();A.saveBgIDB();if(S().tab==='fond')A.renderPanel();}
function newGid(){let id;do{id='g'+Date.now().toString(36)+Math.random().toString(36).slice(2,4);}while(groupes().some(g=>g.id===id));return id;}
export function groupNew(ids,nom){const P=(ids||[]).map(plan).filter(Boolean);if(!P.length){A.flash('Choisis d\'abord une planche');return null;}T1.hist.flush();const G=groupes();let n=G.length+1;while(G.some(g=>g.nom==='Groupe '+n))n++;
  const g={id:newGid(),nom:nom||'Groupe '+n,couleur:freeCol()};P.forEach(p=>{p.grp=Object.assign({},g);});persist();done(`groupe « ${g.nom} » créé (${P.length} planche${P.length>1?'s':''})`);FOC={k:'g',id:g.id};syncPanel(true);renderHL();return g;}
export function groupSet(pid,gid){const p=plan(pid);if(!p)return false;T1.hist.flush();if(!gid){if(!p.grp)return false;const g=p.grp;delete p.grp;if(!p.coul)p.coul=freeCol();persist();done(`plan « ${nameOf(p)} » sorti du groupe « ${g.nom} »`);}
  else{const g=groupes().find(x=>x.id===gid);if(!g||(p.grp&&p.grp.id===gid))return false;p.grp={id:g.id,nom:g.nom,couleur:g.couleur};persist();done(`plan « ${nameOf(p)} » dans le groupe « ${g.nom} »`);}syncPanel(true);renderHL();return true;}
export function groupRename(gid,nom){nom=String(nom||'').trim();const P=plans().filter(p=>groupOf(p)&&p.grp.id===gid);if(!P.length||!nom||nom===P[0].grp.nom)return false;const old=P[0].grp.nom;T1.hist.flush();P.forEach(p=>{p.grp=Object.assign({},p.grp,{nom});});persist();done(`groupe « ${old} » renommé « ${nom} »`);syncPanel(true);renderHL();return true;}
export function groupColor(gid,col){const P=plans().filter(p=>groupOf(p)&&p.grp.id===gid);if(!P.length||!/^#[0-9a-f]{6}$/i.test(col||''))return false;T1.hist.flush();P.forEach(p=>{p.grp=Object.assign({},p.grp,{couleur:col});});persist();done(`couleur du groupe « ${P[0].grp.nom} »`);syncPanel(true);renderHL();return true;}
export function groupDel(gid){const P=plans().filter(p=>groupOf(p)&&p.grp.id===gid);if(!P.length)return false;const nom=P[0].grp.nom;T1.hist.flush();P.forEach(p=>{delete p.grp;});persist();done(`groupe « ${nom} » défait`);if(FOC&&FOC.k==='g'&&FOC.id===gid){FOC=null;setPick(null);}syncPanel(true);renderHL();return true;}
export function planRename(pid,nom){const p=plan(pid);nom=String(nom||'').trim();if(!p||!nom||nom===p.name)return false;const old=nameOf(p);T1.hist.flush();p.name=nom;A.saveBg();A.saveBgIDB();A.renderBg();if(S().tab==='fond')A.renderPanel();done(`plan « ${old} » renommé « ${nom} »`);syncPanel(true);renderHL();return true;}
export function planColor(pid,col){const p=plan(pid);if(!p||!/^#[0-9a-f]{6}$/i.test(col||'')||col===p.coul)return false;T1.hist.flush();p.coul=col;persist();done(`couleur du plan « ${nameOf(p)} »`);syncPanel(true);renderHL();return true;}
// ajoute / retire une ligne d'une unité (planche, ou toutes les planches d'un groupe)
export function toggleLine(lid,uids){const l=S().lines.find(x=>x.id===lid);if(!l||!uids||!uids.length)return null;T1.hist.flush();freezeLink(l);const cur=plansOfLine(l);const inU=cur.filter(id=>uids.includes(id));let added;
  if(inU.length){setLinePlans(l,cur.filter(id=>!uids.includes(id)));added=false;}else{const under=plansUnderLine(l).filter(id=>uids.includes(id));setLinePlans(l,cur.concat(under.length?under:uids));added=true;}
  A.save();const lab=FOC?focLabel():`« ${nameOf(plan(uids[0]))} »`;done(added?`« ${l.name} » ajoutée à ${lab}`:`« ${l.name} » retirée de ${lab}`);A.flash(added?`« ${l.name} » ajoutée à ${lab}`:`« ${l.name} » retirée de ${lab}`);syncPanel(true);renderHL();return added;}
export function setLinks(lid,ids){const l=S().lines.find(x=>x.id===lid);if(!l)return false;T1.hist.flush();setLinePlans(l,ids);A.save();done();syncPanel(true);renderHL();return true;}
export function autoLinks(){T1.hist.flush();S().lines.forEach(l=>setLinePlans(l,plansUnderLine(l)));A.save();done('rattachement de chaque ligne aux planches sous elle');A.flash('Chaque ligne rattachée aux planches visibles sous elle');syncPanel(true);renderHL();}
function frameIds(ids){let B=null;ids.map(plan).filter(Boolean).forEach(p=>{const b=tfBBox(p.transform,A.planTight(p));if(!b)return;B=B?[Math.min(B[0],b[0]),Math.min(B[1],b[1]),Math.max(B[2],b[2]),Math.max(B[3],b[3])]:b;});if(!B)return;
  // panneau ouvert : on cadre dans la partie du dessin qu'il ne cache pas (à sa gauche au PC, au-dessus au téléphone)
  try{const s=A.svg.getBoundingClientRect(),r=OPEN&&panel?panel.getBoundingClientRect():null;if(r&&r.width&&s.width&&s.height){const fx=(r.left-s.left)/s.width,fy=(r.top-s.top)/s.height;if(fx>.3&&fx<.95)B[2]=B[0]+(B[2]-B[0])/fx;else if(fy>.25&&fy<.95)B[3]=B[1]+(B[3]-B[1])/fy;}}catch(e){}
  A.fitBox(B[0],B[1],B[2],B[3]);}
/* clic sur le dessin en mode « au clic » (main.js : mode 'plPick') */
export function click(p){const st=S();if(!FOC||!PICK){A.setMode('select');return;}const uids=focIds();
  if(PICK==='lines'){const nl=A.nearestLine(p,Math.max(1.5,12/st.view.k));if(!nl){A.flash('Touche une ligne (Échap pour finir)');return;}toggleLine(nl.l.id,uids);return;}
  const pid=A.fonds.planUnder(p);if(!pid){A.flash('Touche une planche du dessin (Échap pour finir)');return;}const pl=plan(pid);
  if(groupOf(pl)&&pl.grp.id===FOC.id){if(uids.length<=1){A.flash('C\'est la dernière planche du groupe : ✕ pour défaire le groupe');return;}groupSet(pid,null);A.flash(`« ${nameOf(pl)} » sortie du groupe`);}else{groupSet(pid,FOC.id);A.flash(`« ${nameOf(pl)} » ajoutée au groupe`);}}
/* ═════════ dessin : planches en couleur, lignes allumées, le reste estompé ═════════ */
const quad=p=>{const b=p&&A.planTight(p);if(!b)return null;return [[b[0],b[1]],[b[2],b[1]],[b[2],b[3]],[b[0],b[3]]].map(c=>tfApply(p.transform,c));};
const qd=q=>'M'+q.map(c=>c[0]+' '+c[1]).join('L')+'Z';
function tag(q,txt,col,k){const x=Math.min(...q.map(c=>c[0])),y=Math.min(...q.map(c=>c[1]));const w=String(txt).length*6.6+18;return `<g transform="translate(${x} ${y}) scale(${1/k})"><rect x="0" y="-22" width="${w}" height="20" rx="6" fill="${col}" stroke="#fff" stroke-width="1.5"/><text x="9" y="-8" font-size="12" font-weight="700" fill="#fff" font-family="system-ui,sans-serif">${esc(txt)}</text></g>`;}
function selLine(){const s=S().sel;if(!s)return null;const id=s.kind==='line'?s.id:s.kind==='piece'?s.line:null;return id?S().lines.find(l=>l.id===id)||null:null;}
function extent(){let B=null;const add=b=>{if(!b||!isFinite(b[0]))return;B=B?[Math.min(B[0],b[0]),Math.min(B[1],b[1]),Math.max(B[2],b[2]),Math.max(B[3],b[3])]:b.slice();};plans().forEach(p=>add(tfBBox(p.transform,A.planTight(p))));S().lines.forEach(l=>l.pts.forEach(q=>add([q[0],q[1],q[0],q[1]])));
  if(!B)return null;const m=Math.max(1000,2*Math.max(B[2]-B[0],B[3]-B[1]));return [B[0]-m,B[1]-m,B[2]+m,B[3]+m];}
function focusData(){let ids=null,label='';if(CALPREV){ids=resolveUnit(CALPREV).map(p=>p.id);label='à caler';}else if(OPEN&&FOC){ids=focIds();label=focLabel();}if(!ids||!ids.length)return null;return {ids,lines:new Set(linesOfUnit(ids).map(l=>l.id)),col:colorOf(plan(ids[0])),label};}
export function renderHL(){if(!gHL||!A)return;const st=S();const k=st.view.k;let h='';const F=st.mode==='calAer'?null:focusData();
  if(F){const E=extent();const qs=F.ids.map(id=>quad(plan(id))).filter(Boolean);
    if(E)h+=`<path d="M${E[0]} ${E[1]}H${E[2]}V${E[3]}H${E[0]}Z${qs.map(qd).join('')}" fill="#fcfcfb" fill-opacity=".62" fill-rule="evenodd"/>`;
    st.lines.forEach(l=>{if(!F.lines.has(l.id)||!l.pts||l.pts.length<2)return;const B=st.built[l.id];const d='M'+l.pts.map(q=>q[0]+' '+q[1]).join('L');h+=`<path class="pl-hl" data-line="${esc(l.id)}" d="${d}" stroke="${F.col}" stroke-width="${Math.max((B?B.e:.4)*2.6,14/k)}" stroke-opacity=".5" fill="none" stroke-linecap="round" stroke-linejoin="round"/><path d="${d}" stroke="${F.col}" stroke-width="${2.4/k}" fill="none" stroke-linejoin="round"/>`;});
    F.ids.forEach(id=>{const p=plan(id);const q=quad(p);if(!q)return;const c=colorOf(p);h+=`<path class="pl-out" data-plan="${esc(id)}" d="${qd(q)}" fill="none" stroke="${c}" stroke-width="${3.5/k}"/>`+tag(q,nameOf(p),c,k);});}
  else if(st.mode==='calAer'&&st.calAer&&st.calAer.set){st.calAer.set.plans.forEach(p=>{const q=quad(p);if(q)h+=tag(q,(groupOf(p)?'▦ '+p.grp.nom+' · ':'')+nameOf(p),colorOf(p),k);});}
  else{const sl=selLine();if(sl&&plans().length)plansOfLine(sl).forEach(id=>{const p=plan(id);if(!p||!A.planVisible(p))return;const q=quad(p);if(!q)return;const c=colorOf(p);h+=`<path class="pl-sel" data-plan="${esc(id)}" d="${qd(q)}" fill="none" stroke="${c}" stroke-width="${2.5/k}" stroke-dasharray="${10/k} ${6/k}"/>`+tag(q,nameOf(p),c,k);});}
  if(h!==HL){HL=h;gHL.innerHTML=h;}syncBtn();if(OPEN)syncPanel();}
/* ═════════ calage (fonds.js) : groupes dans « un plan et toutes ses lignes », vignettes, aperçu ═════════ */
export function calOptionsHTML(act){const P=plans();const G=groupes();const ag=act&&groupOf(act)?act.grp.id:null;
  return G.map(g=>{const n=linesOfUnit(g.plans).length;return `<option value="g:${esc(g.id)}" ${ag===g.id?'selected':''}>▦ groupe « ${esc(g.nom)} » — ${g.plans.length} planches, ${n} ligne${n>1?'s':''}</option>`;}).join('')
    +P.map(p=>{const g=groupOf(p);const n=linesOfUnit([p.id]).length;return `<option value="${esc(p.id)}" ${p===act&&!ag?'selected':''}>${icon(p)} ${esc(nameOf(p))}${g?` (groupe « ${esc(g.nom)} » : tout le groupe)`:''} — ${n} ligne${n>1?'s':''}</option>`;}).join('');}
export function calPreviewHTML(v){const U=resolveUnit(v);if(!U.length)return '';const n=linesOfUnit(U.map(p=>p.id)).length;return U.map(p=>thumb(p)).join('')+`<span>${U.length>1?U.length+' planches':'1 planche'} + ${n} ligne${n>1?'s':''} : en couleur sur le dessin</span>`;}
export function calPreview(v){CALPREV=v||null;renderHL();}
/* la fiche d'une ligne (onglet Sélection, fiche du téléphone) : ses planches */
export function lineHTML(l){if(!A||!plans().length||!l)return '';const ids=plansOfLine(l);return `<h3>Planches</h3><div class="card"><div class="kv">${ids.length?ids.map(id=>{const p=plan(id);return `<span><i class="pl-dot" style="--c:${colorOf(p)}"></i>${esc(nameOf(p))}${groupOf(p)?` <span class="muted">(▦ ${esc(p.grp.nom)})</span>`:''}</span>`;}).join(''):'<span>aucune planche</span>'}</div><div class="t1-row"><button class="btn sm" data-pl="openFor" data-line="${esc(l.id)}">🔗 Planches et lignes…</button></div></div>`;}
/* onglet Fond : pastille de couleur, groupe */
export function planTagHTML(p){if(!A||!p)return '';const g=groupOf(p);return ` · <span class="pl-tag" style="--c:${colorOf(p)}">${g?'▦ '+esc(g.nom):'■'}</span>`;}
/* ═════════ démarrage ═════════ */
export function init(api){A=api;T1=api.T1;
  if(!document.getElementById('css-lot-ta')){const st=document.createElement('style');st.id='css-lot-ta';st.textContent=CSS;document.head.appendChild(st);}
  histPart({name:'fonds',take:takeFonds,extra:takeExtra,restore:restoreFonds,describe:describeFonds,describeLines:describeLinks});
  histPart({name:'params',take:takeParams,restore:restoreParams,describe:describeParams});
  // après CHAQUE geste (lâcher, clic, changement) : l'état est comparé, une étape s'il a changé (les plans ne passent pas par la reconstruction du réseau)
  let pokeT=0,DOWN=0;const poke=()=>{if(pokeT)return;pokeT=setTimeout(()=>{pokeT=0;try{if(!S().tracing&&!busy()&&!DOWN)T1.hist.schedule();}catch(e){}},0);};['pointerup','click','change'].forEach(t=>document.addEventListener(t,poke,true));
  document.addEventListener('pointerdown',()=>{DOWN=1;},true);['pointerup','pointercancel'].forEach(t=>document.addEventListener(t,()=>{DOWN=0;},true)); // un geste en cours (doigt / bouton appuyé) n'est jamais coupé en deux étapes
  const world=A.world;gHL=document.createElementNS('http://www.w3.org/2000/svg','g');gHL.id='plHL';gHL.setAttribute('pointer-events','none');const dr=world.querySelector('#draft');world.insertBefore(gHL,dr||null);
  const net=document.getElementById('net');if(net)new MutationObserver(()=>renderHL()).observe(net,{childList:true});
  panel=document.createElement('div');panel.id='plPanel';panel.style.display='none';A.main.appendChild(panel);
  const bar=document.getElementById('t1Bar');if(bar){const b=document.createElement('button');b.className='btn';b.id='plBtn';b.textContent='🔗 Planches';b.title='planches (plans de fond) et lignes : groupes, couleurs, liens';b.style.display='none';b.onclick=()=>openPanel(!OPEN);bar.appendChild(b);}
  panel.addEventListener('click',e=>{const el=e.target.closest('[data-pl]');if(!el)return;const k=el.dataset.pl;
    if(k==='foc'){if(e.target.closest('input,select,button'))return;const f={k:el.dataset.k,id:el.dataset.id};FOC=FOC&&FOC.k===f.k&&FOC.id===f.id?null:f;if(!FOC)setPick(null);else if(PICK)hintPick();syncPanel(true);renderHL();return;}
    if(k==='close'){openPanel(false);return;}if(k==='gdel'){groupDel(el.dataset.id);return;}
    if(k==='unlink'){toggleLine(el.dataset.line,focIds());return;}if(k==='pick'){setPick(PICK===el.dataset.v?null:el.dataset.v);syncPanel(true);return;}
    if(k==='gnew'){const a=FOC&&FOC.k==='p'?plan(FOC.id):A.bgActive();if(a){groupNew([a.id]);setPick('plans');syncPanel(true);A.flash('Groupe créé — clique les autres planches sur le dessin (▣), ou choisis le groupe dans leur liste');}return;}
    if(k==='frame'){frameIds(focIds());return;}if(k==='auto'){autoLinks();return;}
    if(k==='cal'){const v=FOC.k==='g'?'g:'+FOC.id:FOC.id;setPick(null);openPanel(false);A.fonds.openCal();setTimeout(()=>{const s=document.querySelector('#modalBody [data-t2="calPlan"]');const r=document.querySelector('#modalBody input[name="t2w"][value="plan"]');if(s){s.value=v;s.dispatchEvent(new Event('change',{bubbles:true}));}if(r){r.checked=true;r.dispatchEvent(new Event('change',{bubbles:true}));}},0);}});
  panel.addEventListener('change',e=>{const el=e.target;const k=el.dataset&&el.dataset.pl;if(!k)return;
    if(k==='pname')planRename(el.dataset.id,el.value);else if(k==='gname')groupRename(el.dataset.id,el.value);else if(k==='gcol')groupColor(el.dataset.id,el.value);else if(k==='pcol')planColor(el.dataset.id,el.value);
    else if(k==='pgrp'){const v=el.value;if(v==='+'){groupNew([el.dataset.id]);}else groupSet(el.dataset.id,v||null);}});
  panel.addEventListener('keydown',e=>{if(e.key==='Enter'&&e.target.classList.contains('pl-nm')){e.preventDefault();e.target.blur();}});
  // fiche d'une ligne : « 🔗 Planches et lignes… » ; onglet Fond : « 🔗 » d'une planche
  ['#panel','#t1Float'].forEach(s=>{const el=document.querySelector(s);if(el)el.addEventListener('click',e=>{const b=e.target.closest('[data-pl="openFor"]');if(!b)return;const l=S().lines.find(x=>x.id===b.dataset.line);const ids=l?plansOfLine(l):[];const p=plan(ids[0]);openPanel(true,p?(groupOf(p)?{k:'g',id:p.grp.id}:{k:'p',id:p.id}):null);});});
  // fenêtre de calage : aperçu de ce qui est choisi (vignettes + couleur sur le dessin)
  const mb=document.getElementById('modalBody');if(mb){const upd=()=>{const s=mb.querySelector('[data-t2="calPlan"]');const w=mb.querySelector('input[name="t2w"]:checked');const pv=mb.querySelector('.pl-calprev');if(!s){calPreview(null);return;}const v=w&&w.value==='plan'?s.value:null;if(pv)pv.innerHTML=v?calPreviewHTML(v):'';calPreview(v);};
    mb.addEventListener('change',upd);new MutationObserver(upd).observe(mb,{childList:true});const M=document.getElementById('modal');if(M)new MutationObserver(()=>{if(!M.classList.contains('show')&&CALPREV)calPreview(null);}).observe(M,{attributes:true,attributeFilter:['class']});}
  // API (tests, automatisation) : window.MAQ.planches ; les fonctions de plans de MAQ.bg / MAQ.fond valident aussi une étape
  Promise.resolve().then(()=>{const M=window.MAQ;if(!M)return;const wrap=(o,names)=>{if(!o)return;names.forEach(n=>{const f=o[n];if(typeof f!=='function')return;o[n]=(...a)=>{const r=f(...a);if(r&&typeof r.then==='function')return r.then(x=>{done();return x;});done();return r;};});};
    wrap(M.bg,['setTransform','move','scale','rotate','cal2','remove','show','opacity','addImage','addFiles','addDxfText']);setTimeout(()=>wrap(M.fond,['scale','placeDxfTrue','forget','search']),0);
    M.planches={open:openPanel,focus:(k,id)=>{FOC=k?{k,id}:null;OPEN=true;syncPanel(true);renderHL();},pick:v=>{setPick(v);syncPanel(true);},click,plansOf:id=>plansOfLine(S().lines.find(l=>l.id===id)),setLinks,toggleLine,autoLinks,groupes,groupNew,groupSet,groupRename,groupColor,groupDel,planRename,planColor,colorOf:id=>colorOf(plan(id)),resolve:v=>resolveUnit(v).map(p=>p.id),state:()=>({open:OPEN,foc:FOC,pick:PICK})};});
  syncPanel(true);}
