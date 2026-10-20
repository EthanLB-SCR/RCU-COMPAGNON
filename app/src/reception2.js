// reception2.js — REMISE SANS RESPONSABLE, « VÉHICULE LÂCHÉ », SWITCH, PREMIER ÉTAT DES LIEUX (19/10/2026 après-midi, lot VH). Ethan : « ces remises peuvent se faire sans
// responsable sur site : camion laissé sur chantier et utilisé par un collègue la semaine d'après, switch sans état des lieux… il faut que le gars déclare le véhicule lâché
// et fasse son formulaire, ou que le responsable déclare le switch et que ça demande au gars de remplir ses formulaires ; et que ça demande à tout le monde, ceux qui ont
// un véhicule attitré, de le remplir une première fois pour que chaque véhicule ait son image visuelle et un premier formulaire ».
// Complément de reception.js (l'assistant en étapes reste là-bas ; ici : les modes et les écrans en plus, branchés par de petits appels) :
//   V1 · « Qui est là ? » en 1re étape : le responsable et moi (comme avant) / je suis seul → tout l'état des lieux, signature du conducteur, puis VALIDATION DIFFÉRÉE par
//        un responsable (chef du chantier du jour ou responsable flotte, modifiable) : « À faire » chez lui, il relit photos et écarts, valide (signature) ou refuse avec un mot ;
//   V2 · « Je laisse ce véhicule » (où, km, carburant, 4 photos, remarques) → véhicule « laissé à … le … par … », libre ; « Je prends ce véhicule » (Moi → Véhicule laissé) →
//        remise en mode seul ; « Changement de conducteur » déclaré par un responsable → le véhicule change de conducteur tout de suite et chacun a son formulaire à remplir
//        (restitution de mémoire pour l'ancien, remise pour le nouveau), le responsable suit puis valide ;
//   V3 · premier état des lieux de chacun (véhicule attitré sans remise) : « À faire » du conducteur (J+7 orange, J+14 rouge, jamais bloquant), liste et relance dans la
//        flotte, la 1re photo (avant) de la dernière remise devient la vignette du véhicule (≤ 60 Ko) — sans remise : le dessin.
// Données (toutes facultatives) : sur « vrec » sansResponsable, aValider {par, nom, at}, valide {par, nom, at, sig} | refus {par, nom, at, motif}, lache {ou, at}, premier,
//   switchId, memoire, redoDe / remplacePar ; sur le véhicule laisse {ou, at, par, parKey}, vignette / vignetteAt, switch {id, ancien, nouveau, depuis, ou, declarePar, at},
//   switchHist, edl1Relance. Droits serveur : sql/retours_19-10vh.sql (le conducteur écrit SA remise « vrec » et les quelques clés de SON véhicule).
// Hôte des écrans : le responsable flotte dans Parc (sous-vue « x:veh:… », comme avant) ; le conducteur dans Moi (sous-onglet dynamique « vx » tant qu'un écran est ouvert).
import {regAll,regGet,regSet,regFlush} from './reg.js';
import {vehGet,vehSet,vehAll,vehDe,flotteHook,vehPic} from './flotte.js';
import {sigPadHTML,sigPadInit,docKey} from './docs.js';
import {POSTES} from './acces.js';
import {espacePlanning,weekKey} from './espace.js';
import {W,setW,esc,dFR,dhFR,nb,nomP,uname,ukey,todayIso,api,toast,vcfg,profil,charteCur,charteSigOf,recsOf,openRec,manque,MANQ,saveDraft,saveDraftSoon,loadDraft,draftFor,sumHTML,diffHTML,wizHTML,start,ID,pl,zoneLab,ensureCss} from './reception.js';
if(typeof window!=='undefined')window.addEventListener('online',()=>{try{regFlush().catch(()=>{});}catch(e){}}); /* hors connexion : la remise attend sur l'appareil ; au retour du réseau elle part sans attendre le contrôle périodique */
/* ── état des écrans de ce fichier (pas dans le brouillon de l'assistant) ── */
const S2={view:null,label:'',sw:null,pad:null,refus:false,q:''};
const RESP_POSTES=['gerant','dir_adjointe','dir_technique','resp_exploitation','resp_operations','conducteur','chef','resp_flotte'];
const isResp=p=>!!p&&(p.admin||RESP_POSTES.includes(p.poste));
const mgrOf=(me,ctx)=>!!(me&&me.admin)||!!(ctx&&ctx.can&&ctx.can('flotte.manage'));
const canValidate=(me,ctx,r)=>mgrOf(me,ctx)||!!(r&&r.aValider&&me&&r.aValider.par===me.id)||!!(r&&r.switchId&&me&&isResp(me));
const daysSince=x=>{const t=x?Date.parse(x):NaN;return isNaN(t)?0:Math.max(0,Math.floor((Date.now()-t)/864e5));};
const seulW=w=>!!w&&(w.qui==='seul'||!!w.lache||!!w.memoire);
const people=ctx=>(ctx&&ctx.people||[]).filter(p=>p&&p.id&&(p.active!==false||p.invite));
const laisses=()=>vehAll().filter(v=>v.laisse&&!v.conducteurKey&&!v.conducteur);
const mienV=(v,me)=>!!v&&!!me&&((v.conducteurKey&&v.conducteurKey===me.id)||(!v.conducteurKey&&!!me._acc&&vehDe(me._acc).some(x=>x.immat===v.immat))); /* mon véhicule (clé, ou nom libre de l'import) */
const swRecs=(v,type)=>v&&v.switch?recsOf(v.immat).filter(r=>r.switchId===v.switch.id&&r.type===type&&!r.remplacePar):[];
const swStatus=v=>{const resti=swRecs(v,'restitution')[0]||null,remise=swRecs(v,'reception')[0]||null;return {resti,remise,n:(resti?0:1)+(remise?0:1)};};
// véhicule attitré (nom ou clé) sans aucune remise enregistrée pour son conducteur, ni lâché, ni en changement de conducteur
export function sansEdl(v){if(!v||v.laisse||v.switch||(!v.conducteur&&!v.conducteurKey))return false;return !recsOf(v.immat).some(r=>r.type==='reception'&&!r.remplacePar&&(!v.conducteurKey||!r.conducteurKey||r.conducteurKey===v.conducteurKey));}
const edl1Ref=()=>{const C=vcfg()||{};return C.premierAt||C.at||null;};
const edl1Sev=v=>{const j=daysSince(edl1Ref());return (v&&v.edl1Relance)||j>=14?'bad':j>=7?'warn':'info';};
/* ── le chantier du jour d'une personne (planning) et son chef : validateur par défaut ── */
function siteDuJour(me,ctx){try{const today=todayIso();const PL=espacePlanning()||{};const aff=(((PL[weekKey(today)]||{}).aff||{})[me.id])||{};const ids=aff[today]||[];const sites=(ctx.api&&ctx.api.sites&&ctx.api.sites())||[];for(const id of ids){const c=sites.find(s=>s&&s.id===id);if(c)return c;}return ids.length?{id:ids[0],name:String(ids[0])}:null;}catch(e){return null;}}
const validators=ctx=>people(ctx).filter(isResp).sort((a,b)=>nomP(a).localeCompare(nomP(b)));
function defaultValidator(me,ctx){const P=validators(ctx).filter(p=>p.id!==me.id);const c=siteDuJour(me,ctx);let p=null;
  if(c){p=P.find(x=>x.id===c.chef)||P.find(x=>x.id===c.conducteur)||null;}
  if(!p)p=P.find(x=>x.poste==='resp_flotte')||P.find(x=>x.poste==='resp_exploitation')||P.find(x=>x.admin)||P[0]||null;
  return p?{key:p.id,nom:nomP(p),poste:POSTES[p.poste]||''}:null;}
/* ── hôte des écrans : Parc (responsable flotte) ou Moi (conducteur, chef sans droit « Flotte ») ── */
function openX(k,label,me,ctx){if(mgrOf(me,ctx)){ctx.go('x:'+ID+':'+k);return;}S2.view=k;S2.label=label||'Véhicule';ctx.sub('vx');}
export function openWiz(ctx){const w=W;if(!w)return;if(w.host==='moi'){S2.view='wiz';S2.label=w.lache?'Je laisse le véhicule':w.type==='reception'?'Ma remise':'Ma restitution';ctx.sub('vx');}else ctx.go('x:'+ID+':wiz');}
export function home(me,ctx){S2.view=null;S2.pad=null;S2.refus=false;if(W&&W.host!=='moi'){const b=document.querySelector('#eq-app .ac-back[data-act="xsub"]');if(b){b.click();return;}}if(mgrOf(me,ctx)&&(!W||W.host!=='moi')){ctx.go('flotte');return;}ctx.sub('moi');}
/* ── étapes selon le mode (l'ordre d'origine est gardé ; « qui » devant, « cond » et « permis » sautés quand ça n'a pas de sens) ── */
export function stepsFor(w){if(!w)return [];if(w.lache)return ['ou','km','photos','recap'];const qui=w.v2&&!w.memoire?['qui']:[];
  if(w.type==='restitution')return qui.concat(['releves','controles','photos','inv','cartes','recap']);
  const S=qui.slice();if(!w.self)S.push('cond');if(!w.premier)S.push('permis');S.push('releves','controles','photos','inv','cartes');
  const v=vehGet(w.vehId);const {charte:type}=profil(v||{});const ch=charteCur(type);if(!(w.premier&&(!ch||charteSigOf(w.cond&&w.cond.key,type))))S.push('charte'); /* premier état des lieux : charte déjà signée → rien à re-signer */
  S.push('recap');return S;}
export const STEP_T2={qui:'Qui est là ?',ou:'Où est le véhicule ?',km:'Kilométrage et carburant'};
const CARB_DEF=['Réserve','1/4','1/2','3/4','Plein'];
const carbRel=()=>(((vcfg()||{}).edl||{}).releves||[]).find(x=>x.type==='choix'&&/carbur/i.test(x.id+' '+x.label))||null;
export const ouLabel=w=>{const o=(w&&w.ou)||{};const t=String(o.txt||'').trim();return o.k==='depot'?'Dépôt'+(t?' · '+t:''):o.k==='chantier'?String(o.site||'Chantier')+(t?' · '+t:''):t;};
const pick2=(P,q,act,cur)=>{const L=P.filter(p=>!q||nomP(p).toLowerCase().includes(q)).slice(0,60);return L.map(p=>`<button class="veh-pick${cur===p.id?' on':''}" data-act="x" data-v="veh|${act}|${esc(p.id)}"><b>${esc(nomP(p))}</b><small>${esc(POSTES[p.poste]||'')}</small></button>`).join('')||'<div class="eq-s">Personne ne correspond.</div>';};
export const STEP2={
  qui:(v,me,ctx)=>{const c=W.quiChoix||W.qui; /* sur le téléphone du conducteur (self) : le responsable ne signe pas sur ce téléphone (sa signature n'aurait pas de valeur côté serveur) — il valide depuis le sien, tout de suite s'il est là */
    return `<p class="eq-s">${W.self?'C\'est ta remise : ':''}dis-nous qui est là pour l'état des lieux.</p>
    <button class="veh-check${c==='avec'?' on':''}" data-act="x" data-v="veh|qui|avec"><span class="bx">${c==='avec'?'✓':''}</span><span><b>${W.self?'Le responsable est avec moi':'Le responsable et moi'}</b><small>${W.self?'Il relit sur son téléphone et valide tout de suite (dans son « À faire »).':'Il vérifie avec moi et signe à la fin, sur ce téléphone.'}</small></span></button>
    <button class="veh-check${c==='seul'?' on':''}" data-act="x" data-v="veh|qui|seul"><span class="bx">${c==='seul'?'✓':''}</span><span><b>Je suis seul — pas de responsable sur place</b><small>Je fais tout l'état des lieux et je signe ; un responsable relit les photos et les écarts, puis valide.</small></span></button>
    ${W.qui==='seul'?`<div class="hint">Le permis sera déclaré « à faire voir » : tu le montreras au responsable quand il validera. Hors réseau, tout reste sur ce téléphone et part à la reconnexion.</div>`:''}`;},
  ou:(v,me,ctx)=>{const o=W.ou||{};const c=siteDuJour(me,ctx);if(c&&!o.site)o.site=c.name||c.id;
    return `<div class="veh-sec"><h3><span>Où laisses-tu ${esc(v.immat)} ?</span></h3><div class="veh-seg veh-ou">${[['chantier','📍 '+(o.site||'Chantier')],['depot','🏭 Dépôt'],['autre','✏️ Autre']].map(([k,l])=>`<button type="button" class="${o.k===k?'on':''}" data-act="x" data-v="veh|ou|${k}">${esc(l)}</button>`).join('')}</div>
      <label class="f veh-lab" style="margin-top:8px">${o.k==='autre'?'Où exactement ?':'Précision (parking, rue, clés…)'}</label><input class="f" data-xin="veh|ouTxt" value="${esc(o.txt||'')}" placeholder="${o.k==='autre'?'ex. parking de la gare, clés au gardien':'facultatif'}"></div>
      <div class="hint">Le véhicule devient « laissé à … » : libre, un collègue peut le prendre (Moi → Véhicule laissé). Un responsable relit et valide après coup.</div>`;},
  km:(v)=>{const ref=W.ref?regGet('vrec',W.ref):null;const kmRef=ref&&ref.edl?ref.edl.km:null;const km=W.edl.km;const cr=carbRel();const ch=cr?cr.choix:CARB_DEF;const val=cr?W.edl.rel[cr.id]:W.carb;
    return `<div class="veh-sec"><label class="f veh-lab" for="veh-km">Kilométrage au compteur</label><input class="f veh-km" id="veh-km" type="number" inputmode="numeric" min="0" data-xin="veh|km" value="${esc(km)}" placeholder="ex. 120500">${kmRef!=null?`<div class="hint">À la remise : ${nb(kmRef)} km → parcourus : <b id="veh-kmd">${km!==''&&km!==null?nb(km-kmRef)+' km':'—'}</b></div>`:''}</div>
      <div class="veh-sec"><div class="veh-pt" style="border-top:0;padding-top:0"><div class="veh-lab">Niveau de carburant</div><div class="veh-seg">${ch.map(c=>`<button type="button" class="${val===c?'on':''}" data-act="x" data-v="veh|carb|${esc(c)}">${esc(c)}</button>`).join('')}</div></div></div>`;}};
// permis en mode seul : pas de vérification possible → « à faire voir » ; la date de fin de validité reste facultative
export const permisSeulHTML=()=>`<p class="eq-s">Pas de responsable sur place : ton permis est déclaré <b>« à faire voir »</b>. Montre-le au responsable quand il validera la remise.</p>
  <label class="f veh-lab">Fin de validité du permis (ligne 4b) — facultatif</label><input class="f" type="date" data-xin="veh|permisFin" value="${esc(W.permis.fin||'')}">
  <div class="hint">Sans permis vu par un responsable, la remise restera notée « permis non vu » après validation (ni bloquant ni grave : il le coche quand il l'a vu).</div>`;
// récapitulatif en mode seul : à la place de la signature du responsable, QUI valide (chef du chantier du jour ou responsable flotte, modifiable)
export function valParHTML(me,ctx){if(!W.valPar)W.valPar=defaultValidator(me,ctx)||(validators(ctx).some(x=>x.id!==me.id)?null:{key:'',nom:'le responsable flotte',poste:''});const p=W.valPar;const q=String(W.valq||'').toLowerCase();
  return `<div class="veh-sec"><h3><span>À valider par</span></h3><div class="hint" style="margin:0 0 6px">Pas de responsable sur place : il relira les photos et les écarts, puis validera (signature) ou refusera avec un mot. Tu seras prévenu dans « À faire ».</div>
    ${W.self&&W.quiChoix==='avec'?'<div class="hint" style="margin:0 0 6px">Le responsable est avec toi : choisis-le, il valide depuis son téléphone (son « À faire »).</div>':''}${p?`<div class="okbox">${esc(p.nom)}${p.poste?' · '+esc(p.poste):''}</div>`:'<div class="warnbox">Aucun responsable dans l\'annuaire : choisis quelqu\'un ci-dessous.</div>'}
    ${W.valPick||!p?`<input class="f veh-q" data-xin="veh|valq" value="${esc(W.valq||'')}" placeholder="🔍 Nom du responsable…" autocomplete="off"><div class="veh-list" id="veh-vlist">${pick2(validators(ctx).filter(x=>x.id!==me.id),q,'valPar',p&&p.key)}</div>`:`<button class="btn sm" data-act="x" data-v="veh|valPick|" style="margin-top:6px">Changer</button>`}</div>`;}
/* ── contrôles en plus (une chaîne = ce qui manque ; null = rien à redire, l'écran est entièrement géré ici ; undefined = règle d'origine) ── */
export function check2(k,v){if(!W)return undefined;
  if(k==='qui')return W.qui?null:'Dis qui est là';
  if(k==='ou'){const o=W.ou||{};if(!o.k)return 'Où est le véhicule ?';if((o.k==='autre'||(o.k==='chantier'&&!o.site))&&!String(o.txt||'').trim())return 'Précise où tu laisses le véhicule';return null;}
  if(k==='km'){const km=W.edl.km;if(km===''||km===null||isNaN(+km)||+km<0)return 'Le kilométrage au compteur';const ref=W.ref?regGet('vrec',W.ref):null;if(ref&&ref.edl&&ref.edl.km!==null&&+km<ref.edl.km)return 'Kilométrage inférieur à celui de la remise ('+nb(ref.edl.km)+' km)';const cr=carbRel();if(!(cr?W.edl.rel[cr.id]:W.carb))return 'Le niveau de carburant';return null;}
  if(k==='permis'&&W.qui==='seul')return null;
  if(k==='photos'&&W.memoire)return null; /* restitution de mémoire : photos si possible */
  if(k==='recap'&&seulW(W)){if(!W.sigC&&!(W.lache&&!W.self))return 'Ta signature (un trait au doigt dans le cadre)';if(!W.memoire&&!(W.lache&&!W.self)&&!W.valPar)return 'Qui valide ? Choisis un responsable';return null;}
  return undefined;}
export const recapLabel=()=>!W?'':W.lache?(W.self?'✓ Je laisse le véhicule':'✓ Noter le véhicule laissé'):W.memoire?'✓ Enregistrer ma restitution':seulW(W)?'✓ Enregistrer (à valider par '+((W.valPar&&W.valPar.nom)||'…').split(' ')[0]+')':'';
export const kick=()=>!W?'':W.lache?'Véhicule laissé':W.premier?'Premier état des lieux':W.memoire?'Restitution de mémoire':W.qui==='seul'?(W.type==='reception'?'Remise seul':'Restitution seul'):'';
/* ── enregistrement : ce que les modes ajoutent à la remise (r) et à la fiche du véhicule (patch) ── */
export function onSave(r,patch,v,id){const now=new Date().toISOString();const w=W;if(!w)return;
  if(w.self)r.self=true;if(w.premier)r.premier=true;if(w.swId)r.switchId=w.swId;if(w.memoire)r.memoire=true;if(w.redoDe)r.redoDe=w.redoDe;
  if(w.lache){r.lache=Object.assign({ou:ouLabel(w),k:(w.ou||{}).k||'',txt:(w.ou||{}).txt||'',site:(w.ou||{}).site||''},r.lache||{},{at:now});const cr=carbRel();const cb=w.carb||(cr&&r.edl&&r.edl.rel?r.edl.rel[cr.id]:'');if(cb)r.carburant=cb;}
  if(seulW(w)){r.sansResponsable=true;r.sigResponsable=null;r.sigResponsableAt=null;r.responsableNom='';r.responsableKey='';
    if(w.lache&&!w.self)r.valide={par:ukey(),nom:uname(),at:now,sig:null}; /* « laissé sur place » noté par le responsable depuis la fiche : rien à valider à part */
    else if(!w.memoire&&w.valPar)r.aValider={par:w.valPar.key||'',nom:w.valPar.nom||'le responsable flotte',at:now};} /* clé vide (personne dans l'annuaire) : tout responsable flotte la voit */
  if(w.memoire){delete patch.remise;delete patch.km;} /* de mémoire : la fiche (km, dernière remise) reste celle du nouveau conducteur */
  if(w.lache)patch.laisse={ou:r.lache.ou,at:now,par:r.conducteurNom,parKey:r.conducteurKey};
  if(r.type==='reception')patch.laisse=null; /* pris (ou remis) : plus « laissé » */
  if(r.aValider)patch.remise=Object.assign({},patch.remise||{},{aValider:true});
  if(w.vignette&&r.type==='reception'){patch.vignette=w.vignette;patch.vignetteAt=now;} /* V3 : la 1re photo (avant) devient l'image du véhicule */
  if(w.redoDe){const old=regGet('vrec',w.redoDe);if(old)regSet('vrec',w.redoDe,{remplacePar:id});} /* la remise refusée est remplacée (elle reste dans l'historique) */}
export function doneHTML2(v,r){const w=W;if(!w||!r)return null;const lab=w.lache?'Véhicule laissé':r.type==='reception'?'Remise':'Restitution';
  if(!(w.lache||r.sansResponsable))return null;
  const body=w.lache?`<div class="okbox">✓ <b>${esc(v.immat)}</b> laissé à <b>${esc(r.lache.ou)}</b>${w.self?'':' (noté par '+esc(uname())+')'}. Le véhicule est libre : un collègue peut le prendre (Moi → Véhicule laissé)${r.aValider?' ; '+esc(r.aValider.nom)+' relira et validera':''}.</div>${r.diff&&r.diff.n?`<div class="hint">${r.diff.n} différence${r.diff.n>1?'s':''} avec la remise : signalée${r.diff.n>1?'s':''} au responsable flotte.</div>`:''}`
    :r.memoire?`<div class="okbox">✓ Restitution enregistrée. ${esc(uname())} a tout noté de mémoire : le responsable qui a déclaré le changement relit et clôt.</div>`
    :r.valide&&!r.aValider?`<div class="okbox">✓ ${lab} enregistrée par ${esc(uname())}.</div>`
    :`<div class="okbox">✓ ${lab} enregistrée — <b>à valider par ${esc((r.aValider||{}).nom||'un responsable')}</b>. Il relit les photos et les écarts, puis valide (signature) ou refuse avec un mot : tu le verras dans « À faire ».${r.permis&&r.permis.aFaireVoir?' Pense à lui montrer ton permis.':''}</div>`;
  return `<div class="veh-wiz"><div class="veh-kick">${esc(lab)} · ${esc(v.immat)}</div><h2 class="vt veh-h">${w.lache?'Véhicule laissé':lab+' enregistrée'}</h2>${body}
    <div class="veh-nav"><button class="btn veh-big" data-act="x" data-v="veh|print|${esc(w.savedId||'')}">🖨 Document (PDF)</button>${w.host==='moi'?`<button class="btn primary veh-big" data-act="x" data-v="veh|home|">Retour à Moi</button>`:`<button class="btn primary veh-big" data-act="xsub" data-v="">Retour à la fiche</button>`}</div></div>`;}
/* ── vignette (V3) : la photo « avant » réduite, ≤ 60 Ko, gardée dans le brouillon puis sur la fiche du véhicule ── */
export async function photoTaken(file,slot){const w=W;if(!w||w.type!=='reception')return;const E=(vcfg()||{}).edl||{};const first=((E.photos||[]).filter(p=>p.obl)[0]||{}).id;if(!(slot===first||/avant/i.test(slot)))return;const a=api();if(!a||!a.compressPhoto)return;
  try{let d=await a.compressPhoto(file,480,.62);if(d&&d.length>82000)d=await a.compressPhoto(file,360,.5);if(d&&d.length<=82000&&W===w){w.vignette=d;saveDraftSoon();}}catch(e){}}
/* ── lancer un mode depuis Moi ou la fiche (start() de reception.js construit le brouillon ; options : self, premier, lache, memoire, swId, redoDe, cond, host) ── */
function startSelf(type,v,me,ctx,o){const key=me.id;o=Object.assign({self:true,host:'moi',cond:{key,nom:nomP(me),poste:POSTES[me.poste]||''}},o||{});start(type,v.immat,me,ctx,o);}
function redo(r,me,ctx){const v=vehGet(r.vehId);if(!v)return;const isR=r.type==='reception';
  startSelf(isR?'reception':'restitution',v,me,ctx,{redoDe:r.id,lache:!!r.lache,memoire:!!r.memoire,swId:r.switchId||null,premier:!!r.premier,prefill:r,valPar:r.refus?{key:r.refus.par,nom:r.refus.nom,poste:''}:null});}
/* ── « À faire » (conducteur, responsable) ── */
export function tasks(me,ctx){const L=[];if(!me)return L;const key=me.id;const C=vcfg();const mgr=mgrOf(me,ctx);const mine=vehAll().filter(v=>(v.conducteurKey&&v.conducteurKey===key)||(!v.conducteurKey&&me._acc&&vehDe(me._acc).some(x=>x.immat===v.immat)));
  const d=(W&&W.step!=='done')?W:loadDraft(); /* brouillon seul en cours : reprendre */
  if(d&&d.self&&d.cond&&d.cond.key===key&&vehGet(d.vehId))L.push({act:true,sev:'warn',t:(d.lache?'Véhicule laissé '+d.vehId:(d.type==='reception'?'Remise de ':'Restitution de ')+d.vehId)+' : saisie en cours à reprendre',s:'Étape '+((+d.step||0)+1)+' · tout est gardé sur ce téléphone',when:dFR(d.startedAt),go:()=>{setW(d);S2.view='wiz';S2.label=d.lache?'Je laisse le véhicule':d.type==='reception'?'Ma remise':'Ma restitution';ctx.sub('vx');}});
  if(C)regAll('vrec').filter(r=>r.refus&&!r.remplacePar&&r.conducteurKey===key).forEach(r=>L.push({act:true,sev:'bad',t:(r.lache?'Véhicule laissé ':r.type==='reception'?'Remise de ':'Restitution de ')+r.immat+' refusée par '+(r.refus.nom||'')+' : à compléter',s:'« '+String(r.refus.motif||'').slice(0,80)+' » — tes photos et relevés sont repris, corrige ce qui manque',when:dFR(r.refus.at),go:()=>redo(r,me,ctx)}));
  if(C)vehAll().filter(v=>v.switch).forEach(v=>{const sw=v.switch;const j=daysSince(sw.at);const st=swStatus(v);
    if(sw.ancien&&sw.ancien.key===key&&!st.resti)L.push({act:true,sev:j>=2?'bad':'warn',t:'Restitution de '+v.immat+' à remplir : tu l\'as laissé à '+(sw.nouveau.nom||'un collègue'),s:'Changement de conducteur déclaré par '+(sw.declarePar||'')+' · état des lieux de mémoire, photos si possible',when:'J+'+j,go:()=>startSelf('restitution',v,me,ctx,{memoire:true,swId:sw.id,cond:{key,nom:sw.ancien.nom||nomP(me),poste:POSTES[me.poste]||''},refOf:key})});
    if(sw.nouveau&&sw.nouveau.key===key&&!st.remise)L.push({act:true,sev:j>=2?'bad':'warn',t:'Remise de '+v.immat+' à remplir : tu as pris le véhicule de '+(sw.ancien.nom||'un collègue'),s:'Changement de conducteur déclaré par '+(sw.declarePar||'')+' · état des lieux, 4 photos, inventaire ; '+(sw.declarePar||'il')+' valide après',when:'J+'+j,go:()=>startSelf('reception',v,me,ctx,{swId:sw.id,valPar:{key:sw.declareKey,nom:sw.declarePar,poste:''}})});
    if(mgr||sw.declareKey===key)L.push({act:true,sev:st.n?'warn':'bad',t:'Changement de conducteur '+v.immat+' : '+(st.n?st.n+' formulaire'+(st.n>1?'s':'')+' attendu'+(st.n>1?'s':''):'formulaires reçus, à valider'),s:(sw.ancien.nom||'')+' → '+(sw.nouveau.nom||'')+' depuis le '+dFR(sw.depuis||sw.at)+(st.resti?' · restitution reçue':' · restitution attendue')+(st.remise?' · remise reçue':' · remise attendue'),when:'J+'+j,go:()=>openX('switch:'+v.immat,'Changement de conducteur',me,ctx)});});
  if(C)mine.forEach(v=>{if(!sansEdl(v)||(d&&d.vehId===v.immat))return;const j=daysSince(edl1Ref());const rel=v.edl1Relance;
    L.push({act:true,sev:edl1Sev(v),t:'Ton véhicule '+v.immat+' : premier état des lieux à faire (photos + inventaire)',s:'Seul ou avec ton responsable, 10 minutes — pour que chaque véhicule ait son image et son premier formulaire'+(rel?' · relance de '+(rel.par||'')+' le '+dFR(rel.at):''),when:j?'J+'+j:'',go:()=>startSelf('reception',v,me,ctx,{premier:true})});});
  if(C)regAll('vrec').filter(r=>r.aValider&&!r.remplacePar&&!r.switchId&&(mgr||r.aValider.par===key)).forEach(r=>{const j=daysSince(r.at);
    L.push({act:true,sev:j>=2?'bad':'warn',t:(r.lache?'Véhicule laissé ':r.type==='reception'?'Remise de ':'Restitution de ')+r.immat+' par '+(r.conducteurNom||'')+' à valider',s:(r.aValider.par===key?'':'à valider par '+(r.aValider.nom||'')+' · ')+'relis les photos et les écarts, puis signe ou refuse avec un mot',when:dFR(r.at),go:()=>openX('val:'+r.id,'Validation',me,ctx)});});
  if(C&&!mgr&&isResp(me)&&vehAll().some(v=>v.conducteur||v.conducteurKey))L.push({act:false,sev:'info',ic:'🚐',kl:'Véhicules',kv:'déclarer un changement de conducteur',t:'Véhicules : déclarer un changement de conducteur',s:'',go:()=>openX('switch:-','Changement de conducteur',me,ctx)}); /* « Mon équipe » : le chef sans droit Flotte déclare un switch */
  return L;}
/* ── Moi : sous-onglets (véhicule laissé à prendre ; l'écran ouvert) et vues ── */
export function moiSubs(me,ctx){const L=[];const n=laisses().length;if(n&&vcfg())L.push(['vlaisse','Véhicule laissé',n,false]);if(S2.view)L.push(['vx',S2.label||'Véhicule',0,false]);return L;}
export function view(sub,me,ctx){css();if(sub==='vlaisse')return laissesHTML(me,ctx);if(sub==='vx')return viewX(S2.view,me,ctx,'moi');return null;}
export function xview(k,me,ctx){css();if(!/^(val|switch|rec):/.test(k))return null;const r=/^val:/.test(k)?regGet('vrec',k.slice(4)):null;if(!(mgrOf(me,ctx)||(r&&canValidate(me,ctx,r))||(/^switch:/.test(k)&&isResp(me))))return `<div class="card"><div class="eq-s">Réservé au responsable flotte (droit « Flotte ») ou au responsable désigné.</div></div>`;return viewX(k,me,ctx,'parc');}
function viewX(k,me,ctx,host){if(!k)return '';if(k==='wiz'){if(!W){const d=loadDraft();if(d)setW(d);}return wizHTML(me,ctx);}
  if(k.startsWith('val:'))return valHTML(k.slice(4),me,ctx,host,false);if(k.startsWith('rec:'))return valHTML(k.slice(4),me,ctx,host,true);if(k.startsWith('switch:'))return switchHTML(k.slice(7),me,ctx,host);return '';}
function laissesHTML(me,ctx){const L=laisses();const C=vcfg();
  return `<h2 class="vt">Véhicule laissé <span class="hint">· sur chantier ou au dépôt, à prendre</span></h2>${L.length?L.map(v=>`<div class="card veh2-card"><div class="veh2-row"><span class="veh2-pic">${vehPic(v,110,{name:false})}</span><div class="veh2-tx"><b>${esc(v.immat)} · ${esc(v.marque||'')} ${esc(v.modele||'')}</b><div class="eq-s">Laissé à <b>${esc(v.laisse.ou||'')}</b> le ${dFR(v.laisse.at)} (J+${daysSince(v.laisse.at)}) par ${esc(v.laisse.par||'')}${v.km?' · '+nb(v.km)+' km':''}</div></div></div>
    ${C?`<button class="btn primary veh-big" style="width:100%;margin-top:8px" data-act="x" data-v="veh|prendre|${esc(v.immat)}">🚚 Je prends ce véhicule</button>`:'<div class="warnbox">Configuration véhicule absente : l\'administrateur importe le pack SCR.</div>'}</div>`).join(''):'<div class="card"><div class="eq-s">Aucun véhicule laissé pour le moment.</div></div>'}
    <div class="hint">Prendre un véhicule laissé = faire sa remise seul (état des lieux, 4 photos, inventaire, cartes, charte) ; un responsable relit et valide après coup.</div>`;}
/* ── validation par le responsable : relecture (photos, écarts), permis vu, signature → validée ; ou refus avec un mot ── */
function valHTML(id,me,ctx,host,ro){const r=regGet('vrec',id);if(!r)return `<div class="card"><div class="eq-s">Remise introuvable.</div></div>`;const v=vehGet(r.vehId);const E=(vcfg()||{}).edl||{};const ed=r.edl||{};const isR=r.type==='reception';const lab=r.lache?'Véhicule laissé':isR?'Remise':'Restitution';
  const can=!ro&&!!r.aValider&&canValidate(me,ctx,r)&&!(ctx.viewing&&ctx.viewing());const st=r.valide?`<div class="okbox">✓ Validée par <b>${esc(r.valide.nom||'')}</b> le ${dhFR(r.valide.at)}.</div>`:r.refus?`<div class="veh-ko">✗ Refusée par ${esc(r.refus.nom||'')} le ${dFR(r.refus.at)} : « ${esc(r.refus.motif||'')} »${r.remplacePar?' — remplacée par une nouvelle saisie':''}.</div>`:r.aValider?`<div class="warnbox">⏳ Faite seul${r.lache?'':'(e)'} par <b>${esc(r.conducteurNom||'')}</b> le ${dhFR(r.at)} — à valider par <b>${esc(r.aValider.nom||'')}</b>${can?'':' (pas toi)'}.</div>`:r.memoire?`<div class="hint">Restitution de mémoire (changement de conducteur), saisie le ${dhFR(r.at)}.</div>`:'';
  const ph=(E.photos||[]).filter(p=>ed.photos&&ed.photos[p.id]).map(p=>`<figure class="veh-vph"><img src="${esc(ed.photos[p.id])}" alt=""><figcaption>${esc(p.label)}</figcaption></figure>`).join('')+(ed.impacts||[]).filter(i=>i.photo).map(i=>`<figure class="veh-vph"><img src="${esc(i.photo)}" alt=""><figcaption>Impact · ${esc(zoneLab(i.zone))}</figcaption></figure>`).join('');
  const ref=r.refReception?regGet('vrec',r.refReception):null;const inv=r.inventaire||{};const miss=Object.keys(inv.miss||{});
  const permis=isR&&can&&!r.premier&&!(r.permis&&r.permis.ok)?`<div class="veh-sec"><h3><span>🪪 Permis de ${esc(r.conducteurNom||'')}</span></h3><div class="hint">Déclaré « à faire voir ». Si tu l'as vu : coche et note la fin de validité (ligne 4b). Sinon la remise restera « permis non vu » (tu le coches plus tard depuis la fiche).</div>
      <label class="veh-check" style="cursor:pointer"><input type="checkbox" id="vv-permis" style="width:26px;height:26px"><span><b>Permis B vu et valide</b></span></label><label class="f veh-lab">Fin de validité</label><input class="f" type="date" id="vv-fin" value="${esc((r.permis||{}).fin||'')}"></div>`:'';
  const act=can?`<div class="veh-sec"><h3><span>Ta signature</span><span class="hint">${esc(uname())}</span></h3><div class="hint" style="margin:0 0 4px">Je valide cet état des lieux après relecture des photos et des écarts.</div>${sigPadHTML('veh-pad-v')}<button class="btn sm" data-act="x" data-v="veh|valClr|">Effacer</button></div>
      ${S2.refus?`<div class="veh-sec"><label class="f veh-lab">Motif du refus (le conducteur le lit et complète)</label><textarea class="f" id="vv-motif" rows="3" placeholder="ex. photo du côté droit floue, inventaire pas coché"></textarea><div class="veh-row" style="margin-top:6px"><button class="btn" data-act="x" data-v="veh|valNo|">Finalement non</button><button class="btn primary" data-act="x" data-v="veh|valRefus|${esc(r.id)}">✗ Envoyer le refus</button></div></div>`:''}
      <div class="veh-nav"><button class="btn veh-big" data-act="x" data-v="veh|valNo|">✗ Refuser…</button><button class="btn primary veh-big" data-act="x" data-v="veh|valOk|${esc(r.id)}">✓ Valider${isR?' la remise':''}</button></div>`
    :`<div class="veh-nav"><button class="btn veh-big" data-act="x" data-v="veh|print|${esc(r.id)}">🖨 Document (PDF)</button><button class="btn primary veh-big" data-act="x" data-v="veh|home|">Retour</button></div>`;
  if(can)setTimeout(()=>{const cv=document.getElementById('veh-pad-v');if(cv&&!cv.dataset.vehOn){cv.dataset.vehOn='1';S2.pad=sigPadInit('veh-pad-v');}},0);
  return `<div class="veh-wiz"><div class="veh-kick">${esc(lab)} · ${esc(r.immat)}${r.premier?' · premier état des lieux':''}${r.switchId?' · changement de conducteur':''}</div><h2 class="vt veh-h">${esc(lab)} de ${esc(r.immat)} par ${esc(r.conducteurNom||'')}</h2>${st}
    ${r.lache?`<div class="veh-sec"><h3><span>Laissé à</span></h3><div class="okbox">${esc(r.lache.ou||'')}</div>${r.carburant?`<div class="hint">Carburant : ${esc(r.carburant)}</div>`:''}</div>`:''}
    ${isR?sumHTML(r):diffHTML(r.diff,ref)}
    ${ph?`<div class="veh-sec"><h3><span>Photos</span><span class="hint">${(E.photos||[]).filter(p=>ed.photos&&ed.photos[p.id]).length} / ${(E.photos||[]).filter(p=>p.obl).length} imposées</span></h3><div class="veh-vphs">${ph}</div></div>`:'<div class="warnbox">Aucune photo dans cette saisie.</div>'}
    ${(ed.impacts||[]).length?`<div class="veh-sec"><h3><span>Impacts notés</span></h3><ul class="veh-sum">${ed.impacts.map(i=>`<li>${esc(zoneLab(i.zone))}${i.note?' : '+esc(i.note):''}</li>`).join('')}</ul></div>`:''}
    ${(r.reserves||[]).length?`<div class="veh-sec"><h3><span>Réserves</span></h3><ul class="veh-sum">${r.reserves.map(x=>`<li>${esc(x)}</li>`).join('')}</ul></div>`:''}
    ${miss.length?`<div class="veh-sec"><h3><span>Manquants à l'inventaire</span></h3><ul class="veh-sum">${miss.map(id=>`<li class="ko">${esc(((inv.items||[]).find(x=>x[0]===id)||[])[1]||id)}</li>`).join('')}</ul></div>`:''}
    ${ed.remarques?`<div class="veh-sec"><b>Remarques :</b> ${esc(ed.remarques)}</div>`:''}
    ${permis}${act}</div>`;}
function valOk(id,me,ctx){const r=regGet('vrec',id);if(!r||!r.aValider)return;if(!canValidate(me,ctx,r)){toast('Réservé au responsable désigné ou au responsable flotte');return;}if(!S2.pad||!S2.pad.drawn()){toast('Ta signature (un trait au doigt dans le cadre)');return;}
  const now=new Date().toISOString();const sig=S2.pad.png();const upd={valide:{par:me.id,nom:uname(),at:now,sig},aValider:null,sigResponsable:sig,sigResponsableAt:now,responsableNom:uname(),responsableKey:ukey()};
  const pk=document.getElementById('vv-permis'),pf=document.getElementById('vv-fin');if(pk&&pk.checked){const fin=pf&&pf.value||'';if(!fin){toast('La date de fin de validité du permis');return;}if(fin<todayIso()){toast('Fin de validité dépassée : décoche « vu et valide »');return;}upd.permis={ok:true,fin,vuA:now,vuPar:uname()};}
  if(r.type==='reception'){const m=manque(Object.assign({},r,upd));upd.manque=m;upd.complete=!m.length;}
  regSet('vrec',r.id,upd);const v=vehGet(r.vehId);
  if(v){const p={};if(v.remise&&v.remise.id===r.id)p.remise=Object.assign({},v.remise,{complete:upd.complete!==undefined?upd.complete:v.remise.complete,aValider:false});if(v.switch&&r.switchId===v.switch.id){p.switch=null;p.switchHist=(v.switchHist||[]).concat([Object.assign({},v.switch,{closedAt:now,closedBy:uname(),valide:r.id})]);}if(Object.keys(p).length)vehSet(v.immat,p);}
  S2.pad=null;S2.refus=false;toast((r.type==='reception'?'Remise':'Restitution')+' validée ✓'+(upd.manque&&upd.manque.length?' — reste : '+upd.manque.map(x=>MANQ[x]).join(', '):''));home(me,ctx);}
function valRefus(id,me,ctx){const r=regGet('vrec',id);if(!r||!r.aValider)return;if(!canValidate(me,ctx,r)){toast('Réservé au responsable désigné ou au responsable flotte');return;}const motif=String((document.getElementById('vv-motif')||{}).value||'').trim();if(!motif){toast('Un mot pour le conducteur : ce qui manque');return;}
  const now=new Date().toISOString();regSet('vrec',r.id,{refus:{par:me.id,nom:uname(),at:now,motif},aValider:null});const v=vehGet(r.vehId);if(v&&v.remise&&v.remise.id===r.id)vehSet(v.immat,{remise:Object.assign({},v.remise,{aValider:false,refus:true})});
  S2.pad=null;S2.refus=false;toast('Refus envoyé : '+(r.conducteurNom||'le conducteur')+' est prévenu et peut compléter');home(me,ctx);}
/* ── changement de conducteur (switch) déclaré par un responsable : formulaire, puis suivi des deux formulaires attendus, validation ── */
function switchHTML(immat,me,ctx,host){const back=`<button class="btn veh-big" data-act="x" data-v="veh|home|">‹ Retour</button>`;const annuler=`<button class="btn veh-big" data-act="x" data-v="veh|home|">Annuler</button>`;
  if(!immat||immat==='-'){const q=String(S2.q||'').toLowerCase();const L=vehAll().filter(v=>(v.conducteur||v.conducteurKey)&&(!q||[v.immat,v.conducteur,v.marque,v.modele].some(x=>String(x||'').toLowerCase().includes(q)))).slice(0,60);
    return `<div class="veh-wiz"><div class="veh-kick">Changement de conducteur</div><h2 class="vt veh-h">↔ Quel véhicule ?</h2><input class="f veh-q" data-xin="veh|swveh" value="${esc(S2.q||'')}" placeholder="🔍 Immatriculation, conducteur…" autocomplete="off"><div class="veh-list" id="veh-swvl">${L.map(v=>`<button class="veh-pick" data-act="x" data-v="veh|swsel|${esc(v.immat)}"><b>${esc(v.immat)} · ${esc(v.marque||'')} ${esc(v.modele||'')}</b><small>${esc(v.conducteur||'')}${v.switch?' · changement en cours':''}</small></button>`).join('')||'<div class="eq-s">Aucun véhicule attitré.</div>'}</div><div class="veh-nav">${back}</div></div>`;}
  const v=vehGet(immat);if(!v)return `<div class="card"><div class="eq-s">Véhicule introuvable.</div></div>`;
  if(v.switch){const sw=v.switch;const st=swStatus(v);const j=daysSince(sw.at);const line=(t,r,kind)=>`<div class="eq-row"><span class="eq-grow"><span class="eq-t">${esc(t)}</span><span class="eq-s">${r?'✓ reçue le '+dhFR(r.at)+(r.aValider?' · à valider':r.valide?' · validée':''):'⏳ attendue (J+'+j+') — dans son « À faire », rouge à J+2'}</span></span>${r?`<button class="btn sm" data-act="x" data-v="veh|${kind}|${esc(r.id)}">Voir</button>`:''}</div>`;
    return `<div class="veh-wiz"><div class="veh-kick">Changement de conducteur · ${esc(v.immat)}</div><h2 class="vt veh-h">↔ ${esc(sw.ancien.nom||'—')} → ${esc(sw.nouveau.nom||'—')}</h2>
      <div class="warnbox">Déclaré le ${dFR(sw.at)} par ${esc(sw.declarePar||'')} · depuis le ${dFR(sw.depuis||sw.at)}${sw.ou?' · '+esc(sw.ou):''}. Le véhicule est déjà sur <b>${esc(sw.nouveau.nom||'')}</b> (planning, alertes). ${st.n?st.n+' formulaire'+(st.n>1?'s':'')+' attendu'+(st.n>1?'s':''):'Les deux formulaires sont là.'}</div>
      <div class="veh-sec">${line('Restitution de '+(sw.ancien.nom||'l\'ancien conducteur')+' (de mémoire)',st.resti,'rec')}${line('Remise de '+(sw.nouveau.nom||'le nouveau conducteur'),st.remise,'val')}</div>
      <div class="hint">Rien de bloquant : tu peux clore maintenant. Avec la remise reçue, la clôture = sa validation (signature). Sans remise, le nouveau conducteur aura « premier état des lieux à faire ».</div>
      <div class="veh-nav">${back}${st.n===2&&!st.resti&&!st.remise?`<button class="btn veh-big" data-act="x" data-v="veh|swundo|${esc(v.immat)}" style="color:#9b2c22">Annuler la déclaration</button>`:''}<button class="btn primary veh-big" data-act="x" data-v="veh|swclose|${esc(v.immat)}">✓ ${st.remise&&st.remise.aValider?'Valider la remise':'Clore le changement'}</button></div></div>`;}
  const sw=S2.sw&&S2.sw.immat===immat?S2.sw:(S2.sw={immat,nouveau:null,depuis:todayIso(),ou:'',q:''});const q=String(sw.q||'').toLowerCase();const P=people(ctx).filter(p=>p.id!==(v.conducteurKey||'')).sort((a,b)=>nomP(a).localeCompare(nomP(b)));
  return `<div class="veh-wiz"><div class="veh-kick">Changement de conducteur · ${esc(v.immat)}</div><h2 class="vt veh-h">↔ Changement de conducteur</h2>
    <div class="veh-sec"><div class="veh-lab">Ancien conducteur</div><div class="okbox">${esc(v.conducteur||'—')}</div></div>
    <div class="veh-sec"><div class="veh-lab">Nouveau conducteur</div>${sw.nouveau?`<div class="okbox">${esc(sw.nouveau.nom)}</div>`:''}<input class="f veh-q" data-xin="veh|swq" value="${esc(sw.q||'')}" placeholder="🔍 Nom…" autocomplete="off"><div class="veh-list" id="veh-swlist">${pick2(P,q,'swpick',sw.nouveau&&sw.nouveau.key)}</div></div>
    <div class="veh-sec"><label class="f veh-lab">Depuis le</label><input class="f" type="date" data-xin="veh|swdate" value="${esc(sw.depuis||'')}"><label class="f veh-lab" style="margin-top:8px">Où (chantier, dépôt…) — facultatif</label><input class="f" data-xin="veh|swou" value="${esc(sw.ou||'')}" placeholder="ex. chantier, dépôt"></div>
    <div class="hint">L'appli pose le véhicule sur le nouveau conducteur tout de suite (planning, alertes) et demande à chacun son formulaire : restitution de mémoire pour l'ancien, remise (état des lieux, photos, inventaire) pour le nouveau — dans leur « À faire », rouge à J+2. Tu valides quand c'est là. Rien de bloquant.</div>
    <div class="veh-nav">${annuler}<button class="btn primary veh-big" data-act="x" data-v="veh|swok|${esc(v.immat)}">✓ Déclarer le changement</button></div></div>`;}
function swOk(immat,me,ctx){const v=vehGet(immat);const sw=S2.sw;if(!v||!sw||sw.immat!==immat)return;if(v.switch){toast('Un changement est déjà en cours sur ce véhicule');return;}if(!sw.nouveau){toast('Choisis le nouveau conducteur');return;}if(!sw.depuis){toast('Depuis quand ?');return;}if(sw.nouveau.key===v.conducteurKey){toast('C\'est déjà son conducteur');return;}
  const now=new Date().toISOString();const id='W'+Date.now().toString(36);
  vehSet(immat,{conducteur:sw.nouveau.nom,conducteurKey:sw.nouveau.key,laisse:null,switch:{id,ancien:{key:v.conducteurKey||'',nom:v.conducteur||''},nouveau:{key:sw.nouveau.key,nom:sw.nouveau.nom},depuis:sw.depuis,ou:String(sw.ou||'').trim(),declarePar:uname(),declareKey:ukey(),at:now}});
  S2.sw=null;toast('Changement déclaré : formulaires demandés à '+(v.conducteur||'l\'ancien conducteur')+' et '+sw.nouveau.nom);ctx.render();}
function swClose(immat,me,ctx){const v=vehGet(immat);if(!v||!v.switch)return;const st=swStatus(v);if(st.remise&&st.remise.aValider){openX('val:'+st.remise.id,'Validation',me,ctx);return;}
  if(!confirm(st.remise?'Clore le changement de conducteur ?':'Clore sans remise du nouveau conducteur ? Il aura « premier état des lieux à faire ».'))return;const now=new Date().toISOString();
  vehSet(immat,{switch:null,switchHist:(v.switchHist||[]).concat([Object.assign({},v.switch,{closedAt:now,closedBy:uname(),valide:st.remise?st.remise.id:null})])});toast('Changement de conducteur clos');home(me,ctx);}
function swUndo(immat,me,ctx){const v=vehGet(immat);if(!v||!v.switch)return;if(!confirm('Annuler la déclaration ? '+(v.switch.ancien.nom||'L\'ancien conducteur')+' redevient le conducteur.'))return;vehSet(immat,{conducteur:v.switch.ancien.nom||null,conducteurKey:v.switch.ancien.key||null,switch:null});toast('Déclaration annulée');home(me,ctx);}
/* ── fiche véhicule (responsable) : état en plus, boutons en plus, libellés de l'historique ── */
export function ficheStatus(v,r){if(!v)return null;const h=[];
  if(v.laisse&&!v.conducteur&&!v.conducteurKey){const lr=recsOf(v.immat).find(x=>x.lache&&!x.remplacePar);h.push(`<div class="warnbox">🚚 Laissé à <b>${esc(v.laisse.ou||'')}</b> le ${dFR(v.laisse.at)} (J+${daysSince(v.laisse.at)}) par ${esc(v.laisse.par||'')} — libre : un collègue peut le prendre (Moi → Véhicule laissé)${lr&&lr.aValider?' · à valider par '+esc(lr.aValider.nom||''):lr&&lr.valide?' · validé par '+esc(lr.valide.nom||''):''}.</div>`);}
  if(r&&r.aValider)h.push(`<div class="warnbox">⏳ ${r.type==='reception'?'Remise':'Restitution'} du ${dFR(r.at)} à <b>${esc(r.conducteurNom||'')}</b>, faite seul — à valider par <b>${esc(r.aValider.nom||'')}</b>.</div>`);
  else if(r&&r.refus)h.push(`<div class="veh-ko">✗ Remise du ${dFR(r.at)} refusée par ${esc(r.refus.nom||'')} : « ${esc(r.refus.motif||'')} » — ${esc(r.conducteurNom||'')} doit la compléter.</div>`);
  if(v.switch){const st=swStatus(v);h.push(`<div class="warnbox">↔ Changement de conducteur déclaré le ${dFR(v.switch.at)} par ${esc(v.switch.declarePar||'')} : <b>${esc(v.switch.ancien.nom||'—')} → ${esc(v.switch.nouveau.nom||'—')}</b> depuis le ${dFR(v.switch.depuis||v.switch.at)} · restitution de l'ancien : ${st.resti?'✓ reçue':'attendue'} · remise du nouveau : ${st.remise?(st.remise.aValider?'reçue, à valider':'✓'):'attendue'}.</div>`);}
  else if(sansEdl(v)&&vcfg()){const j=daysSince(edl1Ref());h.push(`<div class="${j>=14?'veh-ko':'warnbox'}">📋 Premier état des lieux à faire par ${esc(v.conducteur||'')} (J+${j})${v.edl1Relance?' · relancé le '+dFR(v.edl1Relance.at):''}.</div>`);}
  return h.join('')||null;}
export function ficheButtons(v,canEdit,r,dr){if(!canEdit||!vcfg()||!v||dr)return '';const b=[];
  if(r&&r.aValider&&!r.switchId)b.push(`<button class="btn primary veh-big" data-act="x" data-v="veh|val|${esc(r.id)}">✓ Valider la remise</button>`);
  const lr=v.laisse&&!v.conducteur?recsOf(v.immat).find(x=>x.lache&&x.aValider&&!x.remplacePar):null;if(lr)b.push(`<button class="btn primary veh-big" data-act="x" data-v="veh|val|${esc(lr.id)}">✓ Valider le véhicule laissé</button>`);
  if(v.switch)b.push(`<button class="btn veh-big" data-act="x" data-v="veh|switch|${esc(v.immat)}">↔ Suivre le changement</button>`);
  else if(v.conducteur||v.conducteurKey){b.push(`<button class="btn veh-big" data-act="x" data-v="veh|switch|${esc(v.immat)}">↔ Changement de conducteur</button>`);b.push(`<button class="btn" data-act="x" data-v="veh|lacheDe|${esc(v.immat)}">🚚 Laissé sur place</button>`);}
  return b.join('');}
export function histTitle(x){if(!x)return null;if(x.lache)return 'Laissé à '+(x.lache.ou||'');if(x.memoire)return 'Restitution de mémoire';return null;}
export function histLine(x){if(!x)return null;const st=x.aValider?'à valider par '+(x.aValider.nom||''):x.valide?'validée par '+(x.valide.nom||'')+' le '+dFR(x.valide.at):x.refus?'refusée par '+(x.refus.nom||'')+' : '+(x.refus.motif||'')+(x.remplacePar?' (remplacée)':''):'';
  if(!(x.sansResponsable||x.premier||x.switchId||x.memoire))return null;
  const d=x.diff?((x.diff.km!==null&&x.diff.km!==undefined?nb(x.diff.km)+' km parcourus':'')+(x.diff.n?' · '+x.diff.n+' différence'+(x.diff.n>1?'s':''):' · aucune différence')):'';const mm=x.type==='reception'?manque(x):[];
  return [x.sansResponsable?'seul':'',x.premier?'premier état des lieux':'',x.switchId?'changement de conducteur':'',d,st,x.type==='reception'&&!x.aValider&&!x.refus?(mm.length?'incomplète : '+mm.map(y=>MANQ[y]).join(', '):'complète'):''].filter(Boolean).join(' · ')+' · par '+(x.by||'');}
export function histSwitch(v){if(!v)return [];const L=(v.switchHist||[]).map(s=>Object.assign({},s,{_closed:true})).concat(v.switch?[v.switch]:[]); /* [{at, h}] : fusionné et trié avec les remises par reception.js */
  return L.map(s=>({at:s.at,h:`<div class="eq-row"><span class="eq-grow"><span class="eq-t">${dFR(s.at)} · ↔ Changement de conducteur · ${esc(s.ancien&&s.ancien.nom||'—')} → ${esc(s.nouveau&&s.nouveau.nom||'—')}</span><span class="eq-s">déclaré par ${esc(s.declarePar||'')}${s._closed?' · clos le '+dFR(s.closedAt)+(s.valide?' (remise validée)':''):' · en cours'}</span></span></div>`}));}
/* ── Moi → Mon véhicule (conducteur) : état en plus et boutons ── */
export function mine2(v,acc){const key=docKey(acc);const r=openRec(v);const C=vcfg();let h='';const b=[];const me0={id:key};
  if(r&&r.aValider)h+=`<div class="warnbox">⏳ ${r.type==='reception'?'Remise':'Restitution'} du ${dFR(r.at)} à valider par <b>${esc(r.aValider.nom||'')}</b>${r.permis&&r.permis.aFaireVoir?' — pense à lui montrer ton permis':''}.</div>`;
  else if(r&&r.refus&&!r.remplacePar){h+=`<div class="veh-ko">✗ Remise du ${dFR(r.at)} refusée par ${esc(r.refus.nom||'')} : « ${esc(r.refus.motif||'')} »</div>`;if(C)b.push(`<button class="btn primary" data-act="x" data-v="veh|redo|${esc(r.id)}">✍ Compléter ma remise</button>`);}
  if(v.switch&&v.switch.nouveau&&v.switch.nouveau.key===key){const st=swStatus(v);h+=`<div class="warnbox">↔ Changement de conducteur déclaré le ${dFR(v.switch.at)} par ${esc(v.switch.declarePar||'')} : tu as pris ce véhicule de ${esc(v.switch.ancien.nom||'')}.${st.remise?' Ta remise est enregistrée'+(st.remise.aValider?' (à valider)':'')+'.':''}</div>`;if(C&&!st.remise)b.push(`<button class="btn primary" data-act="x" data-v="veh|swrem|${esc(v.immat)}">📋 Remplir ma remise</button>`);}
  else if(C&&sansEdl(v)&&!draftFor(v.immat)){const j=daysSince(edl1Ref());const sev=edl1Sev(v);h+=`<div class="${sev==='bad'?'veh-ko':'warnbox'}">📋 Premier état des lieux à faire (photos + inventaire)${j?' · J+'+j:''}${v.edl1Relance?' · relance de '+esc(v.edl1Relance.par||'')+' le '+dFR(v.edl1Relance.at):''} — pour que ton véhicule ait son image et son premier formulaire.</div>`;b.push(`<button class="btn primary" data-act="x" data-v="veh|premier|${esc(v.immat)}">📋 Faire l'état des lieux</button>`);}
  const d=draftFor(v.immat);if(d&&d.self&&d.cond&&d.cond.key===key)b.push(`<button class="btn primary" data-act="x" data-v="veh|reprendre|${esc(v.immat)}">▶ Reprendre ${d.lache?'« je laisse le véhicule »':d.type==='reception'?'ma remise':'ma restitution'} (étape ${(+d.step||0)+1})</button>`);
  if(C&&!d)b.push(`<button class="btn" data-act="x" data-v="veh|lache|${esc(v.immat)}">🚚 Je laisse ce véhicule</button>`);
  return h+(b.length?`<div class="eq-acts" style="margin-top:6px">${b.join('')}</div>`:'');}
/* ── alertes du véhicule (flotte, « Mon véhicule ») ── */
export function alertes2(v){const L=[];if(!v)return L;const r=openRec(v);const court=s=>{s=String(s||'').split(' · ')[0];return s.length>22?s.slice(0,21)+'…':s;}; /* textes COURTS : la liste du parc les affiche en étiquettes sur une ligne (390 px) */
  if(r&&r.aValider)L.push({k:'remise',sev:'warn',t:(r.type==='reception'?'Remise':'Restitution')+' à valider ('+String(r.aValider.nom||'').split(' ')[0]+')'});
  else if(r&&r.refus&&!r.remplacePar)L.push({k:'remise',sev:'bad',t:'Remise refusée : à compléter'});
  else{const m=manque(r);if(m.length)L.push({k:'remise',sev:'bad',t:'Remise incomplète : '+m.map(x=>MANQ[x]).join(', ')});}
  if(v.laisse&&!v.conducteur&&!v.conducteurKey){const lr=recsOf(v.immat).find(x=>x.lache&&!x.remplacePar);L.push({k:'laisse',sev:'warn',t:'Laissé à '+court(v.laisse.ou)+' le '+dFR(v.laisse.at)+(lr&&lr.aValider?' · à valider':'')});}
  if(v.switch){const st=swStatus(v);L.push({k:'switch',sev:'warn',t:st.n?'Changement de conducteur : '+st.n+' formulaire'+(st.n>1?'s':'')+' attendu'+(st.n>1?'s':''):'Changement de conducteur : à valider'});}
  if(vcfg()&&sansEdl(v)){const j=daysSince(edl1Ref());if(j>=7||v.edl1Relance)L.push({k:'edl1',sev:j>=14?'bad':'warn',t:'Premier état des lieux à faire (J+'+j+')'});}
  return L;}
/* ── flotte (responsable) : bloc au-dessus de la liste — remises à valider, changements en cours, véhicules laissés, « N véhicules sans premier état des lieux » + relance ── */
flotteHook('liste',canEdit=>{css();const C=vcfg();if(!C||!canEdit)return '';const Lv=regAll('vrec').filter(r=>r.aValider&&!r.remplacePar&&!r.switchId);const Ls=vehAll().filter(v=>v.switch);const La=laisses();const Le=vehAll().filter(sansEdl);
  if(!Lv.length&&!Ls.length&&!La.length&&!Le.length)return '';const j=daysSince(edl1Ref());
  const row=(immat,t,s,btn)=>`<div class="eq-row"><span class="eq-grow"><span class="eq-t">${esc(t)}</span><span class="eq-s">${esc(s)}</span></span>${btn||`<button class="btn sm" data-act="fl" data-v="open|${esc(immat)}">Fiche</button>`}</div>`;
  return `<div class="card veh2-flotte"><h3>📋 Remises <span class="hint">· seul, laissé, changement de conducteur, premier état des lieux</span></h3>
    ${Lv.length?`<div class="veh2-h">⏳ ${pl(Lv.length,'remise')} à valider</div>${Lv.map(r=>row(r.immat,r.immat+' · '+(r.lache?'laissé à '+(r.lache.ou||''):r.type==='reception'?'remise':'restitution')+' par '+(r.conducteurNom||''),'le '+dFR(r.at)+' · à valider par '+(r.aValider.nom||''),`<button class="btn sm primary" data-act="x" data-v="veh|val|${esc(r.id)}">Valider</button>`)).join('')}`:''}
    ${Ls.length?`<div class="veh2-h">↔ ${pl(Ls.length,'changement')} de conducteur en cours</div>${Ls.map(v=>{const st=swStatus(v);return row(v.immat,v.immat+' · '+(v.switch.ancien.nom||'')+' → '+(v.switch.nouveau.nom||''),(st.n?st.n+' formulaire'+(st.n>1?'s':'')+' attendu'+(st.n>1?'s':''):'formulaires reçus : à valider')+' · J+'+daysSince(v.switch.at),`<button class="btn sm" data-act="x" data-v="veh|switch|${esc(v.immat)}">Suivre</button>`);}).join('')}`:''}
    ${La.length?`<div class="veh2-h">🚚 ${pl(La.length,'véhicule')} laissé${La.length>1?'s':''}</div>${La.map(v=>row(v.immat,v.immat+' · laissé à '+(v.laisse.ou||''),'depuis le '+dFR(v.laisse.at)+' (J+'+daysSince(v.laisse.at)+') par '+(v.laisse.par||''))).join('')}`:''}
    ${Le.length?`<details class="veh2-edl"${j>=7?' open':''}><summary><b>📋 ${pl(Le.length,'véhicule')} sans premier état des lieux</b> <span class="hint">J+${j} · rappel J+7, rouge J+14</span></summary>${Le.map(v=>row(v.immat,v.immat+' · '+(v.conducteur||''),(v.marque||'')+' '+(v.modele||'')+(v.edl1Relance?' · relancé le '+dFR(v.edl1Relance.at):''))).join('')}<div class="eq-acts" style="margin-top:6px"><button class="btn" data-act="x" data-v="veh|relance|">📣 Relancer tout le monde</button></div><div class="hint">Chaque conducteur a « premier état des lieux à faire » dans son « À faire » (orange à J+7, rouge à J+14, jamais bloquant). Relancer le met en rouge avec ton nom.</div></details>`:''}</div>`;});
/* ── actions (data-act="x" data-v="veh|<a>|<arg>") : true = traitée ici ── */
export function act(a,arg,el,me,ctx){const mgr=mgrOf(me,ctx);const w=W;
  switch(a){
    case 'home':home(me,ctx);return true;
    case 'val':openX('val:'+arg,'Validation',me,ctx);return true;
    case 'switch':{if(!(mgr||isResp(me))){ctx.toast('Réservé à l\'encadrement');return true;}openX('switch:'+arg,'Changement de conducteur',me,ctx);return true;}
    case 'rec':openX('rec:'+arg,'Restitution',me,ctx);return true;
    case 'valClr':{if(S2.pad)S2.pad.clear();return true;}
    case 'valNo':S2.refus=!S2.refus;ctx.render();return true;
    case 'valOk':valOk(arg,me,ctx);return true;
    case 'valRefus':valRefus(arg,me,ctx);return true;
    case 'swsel':{S2.q='';openX('switch:'+arg,'Changement de conducteur',me,ctx);return true;}
    case 'swpick':{const p=people(ctx).find(x=>x.id===arg);if(!p||!S2.sw)return true;S2.sw.nouveau={key:p.id,nom:nomP(p)};ctx.render();return true;}
    case 'swok':{if(!(mgr||isResp(me))){ctx.toast('Réservé à l\'encadrement');return true;}swOk(arg,me,ctx);return true;}
    case 'swclose':{if(!(mgr||isResp(me)))return true;swClose(arg,me,ctx);return true;}
    case 'swundo':{if(!(mgr||isResp(me)))return true;swUndo(arg,me,ctx);return true;}
    case 'relance':{if(!mgr)return true;const now=new Date().toISOString();const L=vehAll().filter(sansEdl);L.forEach(v=>vehSet(v.immat,{edl1Relance:{at:now,par:uname()}}));ctx.toast('Relance notée pour '+pl(L.length,'conducteur'));ctx.render();return true;}
    case 'prendre':{const v=vehGet(arg);if(!v||!v.laisse||v.conducteurKey){ctx.toast('Ce véhicule n\'est plus laissé');return true;}startSelf('reception',v,me,ctx,{});return true;}
    case 'premier':{const v=vehGet(arg);if(!v)return true;if(!mienV(v,me)&&!mgr){ctx.toast('Ce véhicule n\'est pas le tien');return true;}startSelf('reception',v,me,ctx,{premier:true});return true;}
    case 'swrem':{const v=vehGet(arg);if(!v||!v.switch)return true;startSelf('reception',v,me,ctx,{swId:v.switch.id,valPar:{key:v.switch.declareKey,nom:v.switch.declarePar,poste:''}});return true;}
    case 'lache':{const v=vehGet(arg);if(!v)return true;if(!mienV(v,me)&&!mgr){ctx.toast('Ce véhicule n\'est pas le tien');return true;}startSelf('restitution',v,me,ctx,{lache:true});return true;}
    case 'lacheDe':{if(!mgr)return true;const v=vehGet(arg);if(!v)return true;const r=openRec(v);start('restitution',v.immat,me,ctx,{lache:true,host:'parc',cond:{key:v.conducteurKey||(r&&r.conducteurKey)||'',nom:v.conducteur||(r&&r.conducteurNom)||'',poste:''}});return true;}
    case 'redo':{const r=regGet('vrec',arg);if(!r||!r.refus)return true;if(r.conducteurKey!==me.id&&!mgr){ctx.toast('Réservé au conducteur');return true;}redo(r,me,ctx);return true;}
    case 'reprendre':{const d=draftFor(arg);if(!d)return true;setW(d);openWiz(ctx);return true;}
    case 'qui':{if(!w)return true;w.quiChoix=arg==='seul'?'seul':'avec';w.qui=w.self?'seul':w.quiChoix;if(w.qui==='avec'){w.valPar=null;}saveDraft();ctx.render();return true;}
    case 'ou':{if(!w)return true;w.ou=Object.assign({},w.ou||{},{k:arg});if(arg==='chantier'&&!w.ou.site){const c=siteDuJour(me,ctx);if(c)w.ou.site=c.name||c.id;}saveDraft();ctx.render();return true;}
    case 'carb':{if(!w)return true;const cr=carbRel();if(cr)w.edl.rel[cr.id]=arg;else w.carb=arg;if(el&&el.parentElement)el.parentElement.querySelectorAll('button').forEach(b=>b.classList.toggle('on',b===el));saveDraftSoon();return true;}
    case 'valPar':{if(!w)return true;const p=people(ctx).find(x=>x.id===arg);if(!p)return true;w.valPar={key:p.id,nom:nomP(p),poste:POSTES[p.poste]||''};w.valPick=false;w.valq='';saveDraft();ctx.render();return true;}
    case 'valPick':{if(!w)return true;w.valPick=true;saveDraft();ctx.render();return true;}
    default:return false;}}
/* ── champs (data-xin="veh|<f>") : true = traité ici ── */
export function input(f,arg,el,me,ctx,type){const val=el.value;const w=W;
  switch(f){
    case 'swveh':S2.q=val;{const host=document.getElementById('veh-swvl');if(host){const q=String(val).toLowerCase();host.innerHTML=vehAll().filter(v=>(v.conducteur||v.conducteurKey)&&(!q||[v.immat,v.conducteur,v.marque,v.modele].some(x=>String(x||'').toLowerCase().includes(q)))).slice(0,60).map(v=>`<button class="veh-pick" data-act="x" data-v="veh|swsel|${esc(v.immat)}"><b>${esc(v.immat)} · ${esc(v.marque||'')} ${esc(v.modele||'')}</b><small>${esc(v.conducteur||'')}</small></button>`).join('')||'<div class="eq-s">Aucun véhicule.</div>';}}return true;
    case 'swq':{if(!S2.sw)return true;S2.sw.q=val;const host=document.getElementById('veh-swlist');if(host){const v=vehGet(S2.sw.immat)||{};host.innerHTML=pick2(people(ctx).filter(p=>p.id!==(v.conducteurKey||'')).sort((a,b)=>nomP(a).localeCompare(nomP(b))),String(val).toLowerCase(),'swpick',S2.sw.nouveau&&S2.sw.nouveau.key);}return true;}
    case 'swdate':if(S2.sw)S2.sw.depuis=val;return true;
    case 'swou':if(S2.sw)S2.sw.ou=val;return true;
    case 'ouTxt':{if(!w)return true;w.ou=Object.assign({},w.ou||{},{txt:val});saveDraftSoon();return true;}
    case 'valq':{if(!w)return true;w.valq=val;const host=document.getElementById('veh-vlist');if(host)host.innerHTML=pick2(validators(ctx).filter(x=>x.id!==me.id),String(val).toLowerCase(),'valPar',w.valPar&&w.valPar.key);return true;}
    default:return false;}}
/* ── style (injecté une fois) ── */
const CSS=`.veh2-row{display:flex;gap:10px;align-items:center;min-width:0}.veh2-pic{flex:none}.veh2-tx{flex:1;min-width:0;overflow-wrap:anywhere}.veh2-tx b{font-size:15px}
.veh-vphs{display:grid;grid-template-columns:1fr 1fr;gap:8px}.veh-vph{margin:0;min-width:0}.veh-vph img{width:100%;height:120px;object-fit:cover;border-radius:10px;display:block}.veh-vph figcaption{font-size:12px;color:var(--muted);text-align:center;margin-top:2px}
.veh2-h{font-weight:700;margin:8px 0 2px;font-size:13.5px}.veh2-flotte .eq-row{padding:6px 0;border-top:1px solid var(--line)}.veh2-flotte .btn.sm{min-height:34px}.veh2-edl summary{cursor:pointer;min-height:40px;display:flex;align-items:center;gap:6px;flex-wrap:wrap}
.veh-ou button{min-height:52px}.veh2-card .btn{white-space:normal}#eq-app .veh-check .bx{flex:none}#eq-app .veh-wiz .btn.sm,#eq-app .fl-mine .btn.sm{min-height:34px} /* boutons secondaires : 34 px (gants) */`;
function css(){try{ensureCss();}catch(e){} /* le style de l'assistant (reception.js) sert aussi ici */if(typeof document==='undefined'||document.getElementById('css-lot-vh'))return;const s=document.createElement('style');s.id='css-lot-vh';s.textContent=CSS;document.head.appendChild(s);}
export default {stepsFor,STEP2,STEP_T2,permisSeulHTML,valParHTML,check2,recapLabel,kick,onSave,doneHTML2,photoTaken,tasks,moiSubs,view,xview,ficheStatus,ficheButtons,histTitle,histLine,histSwitch,mine2,alertes2,act,input,openWiz,home,css,seulW,ouLabel};
