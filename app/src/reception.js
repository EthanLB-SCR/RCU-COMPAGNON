// reception.js — RÉCEPTION / RESTITUTION DE VÉHICULE (nuit du 13 au 14/10/2026, « 14/10 nuit »). Ethan : « tous les documents à signer pour les véhicules : papiers de
// réception à signer, dématérialisés, obligatoires ; état des lieux et inventaire dématérialisés ; garder les infos véhicule telles quelles ».
// Module branché (modules.js, id « veh ») : la fiche véhicule de flotte.js garde TOUT ; on y ajoute « Remettre à… » / « Restitution » → assistant en étapes,
// pensé téléphone + gants, utilisé par le responsable ET le conducteur sur UN seul téléphone :
//   conducteur (annuaire) → permis « vu et valide » + fin de validité (pas de photo) → kilométrage & niveaux → points d'état & documents à bord → 4 photos imposées
//   + impacts → inventaire du métier (pré-coché « présent », on ne touche que les écarts) → cartes & dispositifs → charte lue jusqu'en bas puis signée (une fois par
//   version et par personne) → récapitulatif signé par le conducteur puis par le responsable. Restitution : même état des lieux + inventaire ; le récapitulatif ne
//   montre que les DIFFÉRENCES avec la réception (km parcourus, nouveaux impacts, manquants, cartes perdues) ; le véhicule redevient libre.
// Registre : « vcfg » / « config » = le pack SCR importé (listes, inventaires, dispositifs, chartes versionnées) — AUCUNE donnée réelle dans le code ;
//   « vrec » / « <immat>|<id> » = une remise ou une restitution (signatures, photos, état des lieux, inventaire) ;
//   « docsig » / « vcharte_<type>_<version>|<e-mail> » = la charte signée (règle serveur existante : la personne elle-même, ou l'encadrement sur sa tablette).
// Remise incomplète (charte non signée, permis non vu) : en rouge dans la flotte (alerte de la fiche) et « À faire » en haut de l'accueil du conducteur.
// Brouillon de l'assistant gardé sur l'appareil (hors réseau, téléphone qui se verrouille) jusqu'à l'enregistrement.
// 19/10 (lot VH) : remise SANS responsable sur place (« Qui est là ? », validation différée), « véhicule lâché » / pris par un collègue, changement de conducteur déclaré
//   par le responsable, premier état des lieux de chacun, vignette du véhicule → src/reception2.js (R2) ; ici, seulement les appels. Les aides internes sont exportées pour lui.
// 20/10 (lot VM) : vocabulaire unique « état des lieux / laisser un véhicule (à qui, où, quand) / prendre = signer que c'est exact ou contester / changement déclaré » —
//   R2 décide des étapes, du récapitulatif (signature, « et après »), de ce qui est écrit (onSave : a, quand, pris, contest, contreDe…) ; vision logistique : src/mouvements.js.
import {regAll,regGet,regSet,regLoad,onReg} from './reg.js';
import {vehGet,vehSet,vehAll,vehDe,flotteHook,flotteApi,vehTypeKeys} from './flotte.js';
import {sigPadHTML,sigPadInit,readGate,docKey} from './docs.js';
import {docHTML} from './charte.js';
import {POSTES} from './acces.js';
import R2 from './reception2.js';
export {vehPersCard,vehHubRow} from './reception2.js'; /* 20/10 VM : accroches d'espace.js (fiche de personne, hub) — importées d'ici pour garder reception.js en entrée du cycle reception ↔ reception2 */
export const ID='veh';
let A=null; /* API de l'espace (ctx.api), gardée au premier passage ; repli : API de la flotte (modales, toasts) */
export const api=()=>A||flotteApi();
const cap=ctx=>{if(ctx&&ctx.api)A=ctx.api;};
export const esc=s=>String(s??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const p2=n=>String(n).padStart(2,'0');
export const todayIso=()=>{const d=new Date();return d.getFullYear()+'-'+p2(d.getMonth()+1)+'-'+p2(d.getDate());};
export const dFR=x=>{if(!x)return '';const s=String(x);const d=/^\d{4}-\d{2}-\d{2}$/.test(s)?new Date(s+'T12:00:00'):new Date(x);return isNaN(d)?'':d.toLocaleDateString('fr-FR');};
export const dhFR=x=>{if(!x)return '';const d=new Date(x);return isNaN(d)?'':d.toLocaleDateString('fr-FR')+' '+d.toLocaleTimeString('fr-FR',{hour:'2-digit',minute:'2-digit'});};
export const nb=x=>(+x||0).toLocaleString('fr-FR');
const isKo=x=>/^(non|hs|manq|absent|perdu)/i.test(String(x||''));
const isOk=x=>/^(ok|oui|rendue?|remise?|présent)$/i.test(String(x||''));
export const nomP=p=>p?((((p.prenom||'')+' '+(p.nom||'')).trim())||p.name||p.email||p.id||''):'';
export const toast=t=>{const a=api();if(a&&a.toast)a.toast(t);};
export const uname=()=>{const a=api();try{return (a&&a.userName&&a.userName())||'';}catch(e){return '';}};
export const ukey=()=>{const a=api();try{const c=a&&a.current?a.current():null;return c?docKey(c):'';}catch(e){return '';}};
export const pl=(n,w)=>n+' '+w+(n>1?'s':'');
export const MANQ={permis:'permis non vu',charte:'charte non signée'};
/* ── configuration (pack SCR, registre « vcfg ») ── */
export const vcfg=()=>regGet('vcfg','config');
const charteDoc=(type,ver)=>'vcharte_'+type+'_'+String(ver||'v1').replace(/[^A-Za-z0-9]/g,'');
const hashStr=s=>{let h=2166136261;for(let i=0;i<s.length;i++){h^=s.charCodeAt(i);h=Math.imul(h,16777619);}return (h>>>0).toString(36);};
const baseName=p=>String(p||'').split(/[\\/]/).pop();
const verN=v=>+(String(v||'').replace(/\D/g,''))||0;
const choixOf=x=>({id:String(x.id),label:String(x.label||x.id),choix:Array.isArray(x.choix)&&x.choix.length?x.choix.map(String):['Ok','Non ok'],obl:x.obligatoire!==false,groupe:String(x.groupe||'')});
// pack.vehicule = {reception:<reception.json>, entretien:<entretien.json>, textes:{'<nom>.txt':'<texte>'}} — fichiers de l'analyse TELS QUELS ; une charte dont le texte
// change passe à la version suivante (l'ancienne est archivée pour les documents déjà signés) → chaque conducteur concerné la re-signe.
export async function packImport(part,ctx){cap(ctx);if(typeof part==='string')part=JSON.parse(part);if(part&&part.vehicule&&!part.reception)part=part.vehicule;
  const R=part&&part.reception;if(!R||typeof R!=='object'||!R.etatDesLieux||!R.inventaire)throw new Error('pack véhicule : la partie « reception » (état des lieux, inventaires, dispositifs, chartes) est absente ou incomplète');
  const T=part.textes||{};const old=vcfg()||{};const E=R.etatDesLieux||{},I=R.inventaire||{},Dp=R.dispositifs||{};
  const item=x=>({id:String(x.id||x.designation),d:String(x.designation||x.id||''),q:String(x.qteSource||(x.qte!==null&&x.qte!==undefined&&x.qte!==''?String(x.qte).replace('.',',')+(x.unite?' '+x.unite:''):(x.aLaDemande?'à la demande':'')))});
  const chartes={},archives=Object.assign({},old.archives||{}),notes=[];
  (R.documents||[]).filter(d=>d&&/^charte/.test(String(d.id||''))&&d.texte).forEach(d=>{const type=d.pour==='fonction'||/fonction/.test(String(d.id))?'fonction':'service';const tx=String(T[baseName(d.texte)]||T[d.texte]||'');if(!tx.trim())return;const h=hashStr(tx);const o=(old.chartes||{})[type];
    let version='v1',at=new Date().toISOString();if(o&&o.hash===h){version=o.version;at=o.at;}else if(o){version='v'+(verN(o.version)+1);archives[charteDoc(type,o.version)]={titre:o.titre,texte:o.texte,version:o.version,at:o.at};notes.push('nouvelle version de la charte '+type+' ('+version+') : re-signature demandée');}
    chartes[type]={titre:String(d.titre||('Charte véhicule de '+type)),texte:tx,hash:h,version,versionDoc:String(d.version||''),at};});
  const listes={};Object.entries(I.parMetier||{}).forEach(([k,L])=>{listes[k]=(Array.isArray(L)?L:[]).filter(Boolean).map(item);});
  const titres={};Object.entries(I.modeles||{}).forEach(([k,m])=>{titres[k]=String((m&&m.titre)||k);});
  const types={};Object.entries(R.correspondanceTypesAppli||{}).forEach(([k,x])=>{types[k]={charte:/fonction/.test(String((x&&x.charte)||''))?'fonction':'service',inventaire:(x&&x.inventaire)||null};});
  const ent=part.entretien&&part.entretien.modalitesEntretien&&part.entretien.modalitesEntretien.auQuotidien;
  const C={schema:1,source:String(R.version||''),at:new Date().toISOString(),by:uname(),premierAt:old.premierAt||old.at||new Date().toISOString(), /* 19/10 (VH) : départ du compteur « premier état des lieux » (J+7, J+14), gardé d'un import à l'autre */
    edl:{releves:(E.releves||[]).filter(Boolean).map(x=>x.type==='choix'?Object.assign(choixOf(x),{type:'choix'}):{id:String(x.id),label:String(x.label||x.id),type:x.type==='nombre'?'nombre':'texte',unite:String(x.unite||''),obl:!!x.obligatoire}),
      controles:(E.controles||[]).filter(Boolean).map(choixOf),docs:(E.documentsABord||[]).filter(Boolean).map(choixOf),
      equipement:((E.equipement&&E.equipement.champs)||[]).filter(Boolean).map(x=>({id:String(x.id),label:String(x.label||x.id),type:x.type==='nombre'?'number':x.type==='date'?'date':'text',unite:String(x.unite||'')})),
      photos:(E.photosDetail||[]).filter(p=>p&&!p.multiple).map(p=>({id:String(p.id),label:String(p.label||p.id),obl:!!p.obligatoire})),
      zones:(E.zones||[]).filter(Boolean).map(z=>({id:String(z.id),label:String(z.label||z.id)}))},
    inventaire:{listes,titres,commun:(I.commun||[]).filter(Boolean).map(x=>Object.assign(item(x),{pour:String(x.pour||'tous')}))},
    types,
    dispositifs:{liste:(Dp.champs||[]).filter(x=>x&&x.type==='dispositif').map(x=>({id:String(x.id),label:String(x.label||x.id),pour:String(x.pour||'tous'),condition:String(x.condition||'')})),engagements:(Dp.engagements||[]).map(String),cles:(Dp.champs||[]).some(x=>x&&x.id==='cles')},
    chartes,archives,entretien:Array.isArray(ent)?ent.map(String):[]};
  if(!C.edl.zones.length)C.edl.zones=C.edl.photos.map(p=>({id:p.id,label:p.label}));
  regSet('vcfg','config',C,{replace:true});
  const nInv=Object.values(listes).reduce((a,L)=>a+L.length,0);
  return 'Véhicules : chartes '+(Object.entries(chartes).map(([k,c])=>k+' '+c.version).join(', ')||'aucune')+' · '+pl(Object.keys(listes).filter(k=>listes[k].length).length,'liste')+' d\'inventaire ('+pl(nInv,'article')+') · '+pl(C.edl.docs.length,'document')+' à bord · '+pl(C.dispositifs.liste.length,'dispositif')+(notes.length?' — '+notes.join(' ; '):'');}
// type du véhicule (fiche) → charte (service / fonction) et liste d'inventaire (correspondance du pack)
export function profil(v){const C=vcfg()||{};const t=String((v&&v.type)||'').trim().toLowerCase();const hit=vehTypeKeys(v).map(x=>x.toLowerCase()).map(kk=>Object.entries(C.types||{}).find(([k])=>k.toLowerCase()===kk)).find(Boolean); /* 19/10 (QF) : « Tuyauteur » et « Pelleur » retrouvent la correspondance de l'ancien « tuyauteur/Pelleur » */const p=hit?hit[1]:{};return {charte:p.charte||(/fonction/.test(t)?'fonction':'service'),invKey:p.inventaire||null};}
export function invItems(v){const C=vcfg()||{};const I=C.inventaire||{};const {charte,invKey}=profil(v);const L=(((I.listes||{})[invKey])||[]).slice();const ids=new Set(L.map(x=>x.id));(I.commun||[]).forEach(x=>{if((x.pour==='tous'||(x.pour==='service'&&charte==='service'))&&!ids.has(x.id))L.push(x);});return L;}
function invTitre(v){const C=vcfg()||{};const {invKey}=profil(v);return (((C.inventaire||{}).titres||{})[invKey])||(invKey?'Inventaire '+invKey:'Équipements communs');}
export function dispoOf(v){const C=vcfg()||{};const {charte}=profil(v);return (((C.dispositifs||{}).liste)||[]).filter(d=>d.pour!=='service'||charte==='service');}
const dispoLabel=id=>((((vcfg()||{}).dispositifs||{}).liste||[]).find(d=>d.id===id)||{}).label||id;
export const zoneLab=id=>((((vcfg()||{}).edl||{}).zones||[]).find(z=>z.id===id)||{}).label||id||'';
export const charteCur=type=>{const C=vcfg();return (C&&C.chartes&&C.chartes[type])||null;};
const charteText=(type,ver)=>{const c=charteCur(type);if(c&&(!ver||c.version===ver))return c;const C=vcfg()||{};return (C.archives||{})[charteDoc(type,ver)]||null;};
export function charteSigOf(key,type,ver){if(!key||!type)return null;const c=charteCur(type);const v=ver||(c&&c.version);if(!v)return null;return regGet('docsig',charteDoc(type,v)+'|'+key);}
/* ── remises et restitutions (registre « vrec ») ── */
let IDX=null;onReg(k=>{if(k==='vrec'||k==='docsig'||k==='vcfg')IDX=null;});
function idx(){if(IDX)return IDX;const by={};regAll('vrec').forEach(r=>{if(!r||!r.vehId)return;(by[r.vehId]=by[r.vehId]||[]).push(r);});Object.values(by).forEach(L=>L.sort((a,b)=>String(b.at||'').localeCompare(String(a.at||''))));IDX={by};return IDX;}
export const recsOf=immat=>idx().by[immat]||[];
// remise EN COURS : dernière opération DU CONDUCTEUR ACTUEL = une réception (19/10 VH : les opérations d'un autre conducteur — restitution de mémoire après un changement de conducteur — ne comptent pas)
export function openRec(v){if(!v||(!v.conducteurKey&&!v.conducteur))return null;const r=recsOf(v.immat).find(x=>!x.remplacePar&&(!v.conducteurKey||!x.conducteurKey||x.conducteurKey===v.conducteurKey));if(!r||r.type!=='reception')return null;return r;}
// ce qui manque à une remise : permis vu et valide ; charte de la version de la remise signée (dans la remise, ou plus tard par le conducteur → docsig) ; 19/10 VH : premier état des lieux d'un véhicule déjà attitré → pas de permis à revoir
export function manque(r){if(!r||r.type!=='reception')return [];const m=[];if(!r.premier&&!r.contreDe&&!(r.permis&&r.permis.ok))m.push('permis'); /* 20/10 VM : contre-état des lieux → pas de permis à revoir non plus */const c=r.charte||{};if(!c.none&&!c.sig&&!charteSigOf(r.conducteurKey,c.type,c.version))m.push('charte');return m;}
flotteHook('alertes',v=>R2.alertes2(v)); /* 19/10 VH : remise incomplète, à valider, refusée ; véhicule laissé ; changement de conducteur ; premier état des lieux */
/* ── chargement : au démarrage ET après la connexion (le serveur n'est lu qu'une fois connecté) ── */
let LDK=null;
function ensureLoad(ctx){const st=ctx&&ctx.api&&ctx.api.state;const u=st&&st.cloudUser;const k=u?String(u.id||u.email||'cloud'):'local';if(LDK===k)return;LDK=k;regLoad(['vcfg','vrec']).catch(()=>{});}
/* ── texte balisé du pack (# titre, ## chapitre, ###/#### sous-titres, - puce, « ligne vide » = paragraphe) → HTML ; {{champ}} rempli, [[À COMPLÉTER]] surligné ── */
function mdHTML(t,vars){vars=vars||{};let t0=String(t||'');if(!vars.lieu)t0=t0.replace(/Fait à\s*:?\s*\{\{lieu\}\}\s*,\s*le\b/gi,'Le').replace(/\s*[—–-]\s*à\s*:\s*\{\{lieu\}\}/gi,'').replace(/Fait à\s*:?\s*\{\{lieu\}\}\s*,?\s*/gi,''); /* 21/10 : plus de « Fait à » (dématérialisé) */const lines=t0.replace(/\r/g,'').split('\n');let h='',ul=0,para=[];
  const inl=s=>esc(s).replace(/\{\{(\w+)\}\}/g,(m,k)=>{if(k==='signature_conducteur'&&vars.$sig)return vars.$sig;const x=vars[k];return x!==undefined&&x!==null&&x!==''?'<b>'+esc(x)+'</b>':'<span class="veh-blank">……</span>';}).replace(/\[\[(.+?)\]\]/g,'<mark>$1</mark>');
  const flushP=()=>{if(para.length){h+='<p>'+para.map(inl).join('<br>')+'</p>';para=[];}};const closeL=()=>{while(ul>0){h+='</ul>';ul--;}};
  for(const raw of lines){const l=raw.replace(/\s+$/,'');let m;if(!l.trim()){flushP();closeL();continue;}
    if((m=/^(#{1,4})\s+(.*)$/.exec(l))){flushP();closeL();const n=m[1].length;h+=n===1?`<h2 class="veh-t1">${inl(m[2])}</h2>`:`<h${n}>${inl(m[2])}</h${n}>`;continue;}
    if((m=/^(\s*)[-•]\s+(.*)$/.exec(l))){flushP();const lv=m[1].length>=2?2:1;while(ul<lv){h+='<ul>';ul++;}while(ul>lv){h+='</ul>';ul--;}h+=`<li>${inl(m[2])}</li>`;continue;}
    closeL();para.push(l.trim());}
  flushP();closeL();return h;}
/* ── l'assistant (brouillon W, gardé sur l'appareil) ── */
export let W=null;export const DKEY='trace:veh:draft';let sdT=null;
export const setW=w=>{W=w;};
export function saveDraft(){clearTimeout(sdT);try{if(W&&W.step!=='done')localStorage.setItem(DKEY,JSON.stringify(W));else localStorage.removeItem(DKEY);}catch(e){/* quota (photos) : le brouillon reste en mémoire */}}
export const saveDraftSoon=()=>{clearTimeout(sdT);sdT=setTimeout(saveDraft,400);};
export function loadDraft(){try{const d=JSON.parse(localStorage.getItem(DKEY)||'null');return d&&d.vehId&&d.step!=='done'?d:null;}catch(e){return null;}}
export const draftFor=immat=>{const d=(W&&W.step!=='done')?W:loadDraft();return d&&d.vehId===immat?d:null;};
const STEPS=w=>R2.stepsFor(w); /* 19/10 VH : les étapes dépendent du mode (qui est là, seul, premier état des lieux, véhicule laissé, de mémoire) — l'ordre d'origine est gardé */
const STEP_T={cond:'Conducteur',permis:'Permis de conduire',releves:'Kilométrage et niveaux',controles:'Points d\'état et documents',photos:'Photos et impacts',inv:'Inventaire',cartes:'Cartes et dispositifs',charte:'Charte véhicule',recap:'Récapitulatif et signatures'};
const refRec=()=>W&&W.ref?regGet('vrec',W.ref):null;
const grpObj=g=>!W?{}:g==='rel'?W.edl.rel:g==='ctl'?W.edl.ctl:g==='doc'?W.edl.doc:{};
const grpList=g=>{const E=(vcfg()||{}).edl||{};return g==='rel'?(E.releves||[]).filter(x=>x.type==='choix'):g==='ctl'?(E.controles||[]):g==='doc'?(E.docs||[]):[];};
const scrollTop=()=>setTimeout(()=>{const hb=document.getElementById('homeBody');if(hb)hb.scrollTop=0;const w=document.querySelector('#eq-app .veh-wiz');if(w&&w.scrollIntoView)try{w.scrollIntoView({block:'start'});}catch(e){}},0);
const back=()=>{const b=document.querySelector('#eq-app .ac-back[data-act="xsub"]');if(b)b.click();};
// 19/10 VH : o = {self (le conducteur pour lui-même, écran dans Moi), premier (premier état des lieux d'un véhicule déjà attitré), lache (« je laisse ce véhicule »), memoire (restitution de mémoire
//   après un changement de conducteur), swId, redoDe + prefill (reprise d'une remise refusée), cond (conducteur imposé), valPar (validateur proposé), host ('moi' | 'parc')}
export function start(type,immat,me,ctx,o){o=o||{};const v=vehGet(immat);if(!v)return;if(!vcfg()){ctx.toast('Configuration véhicule absente : l\'administrateur importe le pack SCR (partie « vehicule »)');return;}
  const cur=openRec(v);if(type==='reception'&&cur&&!(o.redoDe&&(cur.refus||cur.id===o.redoDe))&&!o.contreDe&&!o.swId){ctx.toast('Véhicule remis à '+cur.conducteurNom+' : fais d\'abord la restitution');return;} /* 20/10 VM : contre-état des lieux, nouvel état des lieux demandé, changement déclaré (le nouveau fait le sien) : pas de blocage */if(type==='restitution'&&!v.conducteur&&!v.conducteurKey&&!o.redoDe&&!o.memoire&&!o.lache){ctx.toast('Véhicule libre : rien à restituer');return;} /* 20/10 VM : un responsable peut « laisser » un véhicule libre à quelqu'un */
  const d=draftFor(immat);
  if(d&&d.type===type&&!o.redoDe&&!!d.lache===!!o.lache&&!!d.self===!!o.self&&(d.contreDe||null)===(o.contreDe||null)&&(d.swId||null)===(o.swId||null))W=d;
  else{const ref=type==='restitution'?(R2.refFor(v,o)||null):null; /* 20/10 VM : la dernière entrée du conducteur concerné (son état des lieux, ou sa signature sur la sortie d'un collègue) */
    W={type,vehId:immat,rid:Date.now().toString(36),step:0,startedAt:new Date().toISOString(),cond:null,permis:{ok:false,fin:''},edl:{km:v.km!==undefined&&v.km!==null&&v.km!==''?+v.km:'',rel:{},ctl:{},doc:{},equip:{},photos:{},impacts:[],remarques:''},inv:{miss:{},obs:''},cartes:{},cles:'',consignes:false,charte:{},sigC:null,sigR:null,lieu:'',ref:ref?ref.id:null,q:'',
      v2:2,self:!!o.self,host:o.host||(o.self?'moi':'parc'),qui:o.self||o.premier||o.lache||o.memoire||o.contreDe?'seul':'avec',quiChoix:o.self||o.premier||o.lache||o.memoire||o.contreDe?'seul':'avec',premier:!!o.premier,lache:!!o.lache,memoire:!!o.memoire,swId:o.swId||null,redoDe:o.redoDe||null,valPar:o.valPar||null,ou:null,
      a:o.a||null,aMode:o.a?'pers':null,quand:o.quand||null,quandMode:o.quand?'date':null,declarePar:o.declarePar||'',declareKey:o.declareKey||'',contreDe:o.contreDe||null,ecarts:'',respAlerte:o.respAlerte||null,sortieNonFaite:o.sortieNonFaite||null}; /* 20/10 VM : à qui, quand, changement déclaré, contre-état des lieux */
    if(o.contreDe)W.ref=o.contreDe; /* contre-état des lieux : comparé à ce que l'autre a déclaré */
    const P=ctx.people||[];const byKey=v.conducteurKey&&P.find(p=>p.id===v.conducteurKey);const byName=!byKey&&v.conducteur&&P.find(p=>nomP(p).toLowerCase()===String(v.conducteur).trim().toLowerCase());const p=byKey||byName;
    if(type==='restitution'){const rp=ref&&ref.lache&&ref.pris?ref.pris:null; /* 20/10 VM : véhicule pris par signature sur la sortie d'un collègue → le conducteur est celui qui l'a pris */
      W.cond=o.cond||{key:v.conducteurKey||(rp?rp.par:ref&&ref.conducteurKey)||(p&&p.id)||'',nom:(rp?rp.nom:ref&&ref.conducteurNom)||v.conducteur||(p?nomP(p):''),poste:(rp?'':ref&&ref.conducteurPoste)||(p?(POSTES[p.poste]||''):'')};
      if(ref&&ref.inventaire&&ref.inventaire.miss)W.inv.miss=Object.assign({},ref.inventaire.miss); /* un manquant de la réception reste manquant (pas une différence) */
      if(ref&&ref.edl&&ref.edl.equip)W.edl.equip=Object.assign({},ref.edl.equip);
      Object.entries((ref&&ref.cartes)||{}).forEach(([id,c])=>{if(c&&(c.statut==='remise'||c.statut==='abord'))W.cartes[id]={numero:c.numero||'',statut:o.lache||o.memoire?'abord':'rendue'};});} /* véhicule laissé, changement de conducteur : les cartes restent à bord (20/10 VM : aussi celles restées à bord à la prise du véhicule) */
    else{if(o.cond)W.cond=o.cond;else if(p)W.cond={key:p.id,nom:nomP(p),poste:POSTES[p.poste]||''};
      dispoOf(v).forEach(dd=>{const n=String((v.cartes&&v.cartes[dd.id])||'');W.cartes[dd.id]={numero:n,statut:dd.pour==='tous'||n?'remise':'aucune'};});}
    const r0=o.prefill;if(r0){ /* reprise d'une remise refusée : relevés, photos, inventaire, cartes repris ; on corrige ce qui manque */
      try{W.edl=Object.assign(W.edl,JSON.parse(JSON.stringify(r0.edl||{})));delete W.edl.kmRestantVidange;W.inv={miss:Object.assign({},(r0.inventaire||{}).miss||{}),obs:(r0.inventaire||{}).obs||''};W.cartes={};Object.entries(r0.cartes||{}).forEach(([id,c])=>{W.cartes[id]={numero:c.numero||'',statut:c.statut||''};});
        W.cles=r0.cles===null||r0.cles===undefined?'':r0.cles;W.lieu=r0.lieu||'';W.permis={ok:false,fin:(r0.permis&&r0.permis.fin)||''};W.consignes=!!r0.consignesLues;if(r0.lache)W.ou={k:r0.lache.k||'autre',txt:r0.lache.txt||(r0.lache.k?'':r0.lache.ou||''),site:r0.lache.site||''};if(r0.carburant)W.carb=r0.carburant;if(r0.refReception)W.ref=r0.refReception;}catch(e){console.warn(e);}}}
  saveDraft();R2.openWiz(ctx);scrollTop();}
/* ── écrans de l'assistant ── */
const segB=(g,id,choix,val)=>`<div class="veh-seg">${choix.map(c=>`<button type="button" class="${isKo(c)?'ko':isOk(c)?'ok':''}${val===c?' on':''}" data-act="x" data-v="veh|set|${g}~${esc(id)}~${esc(c)}">${esc(c)}</button>`).join('')}</div>`;
const ptRow=(g,x,o)=>`<div class="veh-pt"><div class="veh-lab">${esc(x.label)}${x.obl?'':' <span class="hint">(facultatif)</span>'}</div>${segB(g,x.id,x.choix,(o||{})[x.id]||'')}</div>`;
function secH(t,g,L,o){const req=L.filter(x=>x.obl);const n=req.filter(x=>!(o||{})[x.id]).length;const okable=L.filter(x=>x.choix.some(isOk));
  return `<h3><span>${esc(t)} <span class="veh-rest${n?'':' done'}" data-rest="${g}" data-ids="${esc(req.map(x=>x.id).join(','))}">${n?n+' à cocher':'✓'}</span></span>${okable.length>1?`<button class="btn sm veh-allok" data-act="x" data-v="veh|allok|${g}~${esc(okable.map(x=>x.id).join(','))}">Tout Ok</button>`:''}</h3>`;}
function groups(L){const out=[];L.forEach(x=>{const g=x.groupe||'';let e=out.find(y=>y[0]===g);if(!e)out.push(e=[g,[]]);e[1].push(x);});return out;}
function updRest(){document.querySelectorAll('#eq-app [data-rest]').forEach(s=>{const o=grpObj(s.dataset.rest);const ids=String(s.dataset.ids||'').split(',').filter(Boolean);const n=ids.filter(id=>!o[id]).length;s.textContent=n?n+' à cocher':'✓';s.classList.toggle('done',!n);});}
const STEP={
  cond:(v,me,ctx)=>{const q=String(W.q||'').toLowerCase();const P=(ctx.people||[]).filter(p=>p&&p.id&&(p.active!==false||p.invite)).sort((a,b)=>nomP(a).localeCompare(nomP(b)));const pr=profil(v);
    return `${W.cond?`<div class="okbox">Conducteur : <b>${esc(W.cond.nom)}</b>${W.cond.poste?' · '+esc(W.cond.poste):''}</div>`:''}<div class="hint">Charte ${esc(pr.charte==='fonction'?'véhicule de fonction':'véhicule de service')} · ${esc(invTitre(v))}</div>
      <input class="f veh-q" data-xin="veh|q" value="${esc(W.q||'')}" placeholder="🔍 Nom du conducteur…" autocomplete="off"><div class="veh-list" id="veh-list">${pickList(P,q)}</div>`;},
  permis:()=>W.qui==='seul'?R2.permisSeulHTML():`<p class="eq-s">Vérifie le permis de ${esc(W.cond?W.cond.nom:'du conducteur')}. On ne garde pas de photo du permis.</p>
    <button class="veh-check${W.permis.ok?' on':''}" data-act="x" data-v="veh|permis|"><span class="bx">${W.permis.ok?'✓':''}</span><span><b>Permis B vu et valide</b><small>Date de validité : ligne 4b du permis</small></span></button>
    <label class="f veh-lab">Fin de validité du permis</label><input class="f" type="date" data-xin="veh|permisFin" value="${esc(W.permis.fin||'')}">
    ${W.permis.ok?'':'<div class="warnbox">Sans permis vu et valide, la remise sera <b>incomplète</b> (en rouge chez le responsable flotte, « À faire » chez le conducteur).</div>'}`,
  releves:v=>{const E=vcfg().edl;const R=E.releves||[];const ref=refRec();const kmRef=ref&&ref.edl?ref.edl.km:null;const km=W.edl.km;const rest=kmRestant(v);
    const nums=R.filter(x=>x.type!=='choix'&&x.id!=='km');
    return `<div class="veh-sec"><label class="f veh-lab" for="veh-km">Kilométrage au compteur</label><input class="f veh-km" id="veh-km" type="number" inputmode="numeric" min="0" data-xin="veh|km" value="${esc(km)}" placeholder="ex. 120500">
      ${W.type==='restitution'&&kmRef!=null?`<div class="hint">À la réception : ${nb(kmRef)} km → parcourus : <b id="veh-kmd">${km!==''&&km!==null?nb(km-kmRef)+' km':'—'}</b></div>`:''}
      ${nums.map(x=>x.id==='kmRestantVidange'&&rest!==null?`<div class="hint">${esc(x.label)} : <b>${nb(rest)} km</b> (fiche : dernière vidange + cadence)</div>`:`<label class="f">${esc(x.label)}${x.unite?' ('+esc(x.unite)+')':''}</label><input class="f" type="${x.type==='nombre'?'number':'text'}" inputmode="${x.type==='nombre'?'numeric':'text'}" data-xin="veh|num~${esc(x.id)}" value="${esc((W.edl.num||{})[x.id]||'')}">`).join('')}</div>
      ${groups(R.filter(x=>x.type==='choix')).map(([g,L])=>`<div class="veh-sec">${secH(g||'Relevés','rel',L,W.edl.rel)}${L.map(x=>ptRow('rel',x,W.edl.rel)).join('')}</div>`).join('')}`;},
  controles:v=>{const E=vcfg().edl;return `<div class="veh-sec">${secH('Points d\'état','ctl',E.controles,W.edl.ctl)}${E.controles.map(x=>ptRow('ctl',x,W.edl.ctl)).join('')}</div>
      <div class="veh-sec">${secH('Documents à bord','doc',E.docs,W.edl.doc)}${E.docs.map(x=>ptRow('doc',x,W.edl.doc)).join('')}</div>
      ${(E.equipement||[]).length&&profil(v).charte==='service'?`<details class="veh-sec"${Object.values(W.edl.equip).some(Boolean)?' open':''}><summary><b>Poste à souder / groupe</b> <span class="hint">si le véhicule en est équipé</span></summary>${E.equipement.map(x=>`<label class="f">${esc(x.label)}${x.unite?' ('+esc(x.unite)+')':''}</label><input class="f" type="${x.type}" data-xin="veh|equip~${esc(x.id)}" value="${esc(W.edl.equip[x.id]||'')}">`).join('')}</details>`:''}`;},
  photos:()=>{const E=vcfg().edl;const P=E.photos||[];const Z=E.zones||[];const ref=refRec();const refImp=(ref&&ref.edl&&ref.edl.impacts)||[];
    const tile=p=>{const u=W.edl.photos[p.id];return `<label class="veh-ph${u?' ok':''}${p.obl?' req':''}"><input type="file" accept="image/*" capture="environment" data-xin="veh|photo~${esc(p.id)}" style="display:none">${u?`<img src="${esc(u)}" alt="">`:'<span class="ic">📷</span>'}<b>${u?'✓ ':''}${esc(p.label)}</b>${p.obl?'':'<small>facultatif</small>'}</label>`;};
    const obl=P.filter(p=>p.obl),opt=P.filter(p=>!p.obl);const zSel=W.impZone||(Z[0]||{}).id||'';
    return `<div class="veh-sec"><h3><span>Photos imposées <span class="veh-rest${obl.every(p=>W.edl.photos[p.id])?' done':''}">${obl.filter(p=>W.edl.photos[p.id]).length} / ${obl.length}</span></span></h3><div class="veh-phs">${obl.map(tile).join('')}</div>${opt.length?`<div class="veh-phs" style="margin-top:8px">${opt.map(tile).join('')}</div>`:''}<div class="hint">Touche une case : l'appareil photo du téléphone s'ouvre.</div></div>
      <div class="veh-sec"><h3><span>Impacts, rayures, dégâts</span></h3>
        ${refImp.length?`<div class="hint">Déjà notés à la réception du ${dFR(ref.at)} :</div><ul class="veh-imps old">${refImp.map(i=>`<li><span>${esc(zoneLab(i.zone))} · ${esc(i.note||'')}</span></li>`).join('')}</ul>`:''}
        ${W.edl.impacts.length?`<ul class="veh-imps">${W.edl.impacts.map(i=>`<li>${i.photo?`<img src="${esc(i.photo)}" alt="">`:''}<span><b>${esc(zoneLab(i.zone))}</b> · ${esc(i.note||'')}</span><button class="btn sm" data-act="x" data-v="veh|imprm|${esc(i.id)}" aria-label="Retirer">✕</button></li>`).join('')}</ul>`:`<div class="eq-s">${W.type==='restitution'?'Aucun nouvel impact noté.':'Aucun impact noté.'}</div>`}
        <div class="veh-impf"><select class="f" data-xin="veh|impZone">${Z.map(z=>`<option value="${esc(z.id)}"${zSel===z.id?' selected':''}>${esc(z.label)}</option>`).join('')}</select><input class="f" data-xin="veh|impNote" value="${esc(W.impNote||'')}" placeholder="ex. rayure porte arrière, 10 cm">
          <div class="veh-row"><label class="btn${W.impPhoto?' on':''}">📷 ${W.impPhoto?'Photo prise':'Photo'}<input type="file" accept="image/*" capture="environment" data-xin="veh|photo~imp" style="display:none"></label><button class="btn primary" data-act="x" data-v="veh|impadd|">＋ Ajouter l'impact</button></div></div></div>
      <div class="veh-sec"><label class="f veh-lab">Remarques diverses</label><textarea class="f" data-xin="veh|remarques" rows="3">${esc(W.edl.remarques||'')}</textarea></div>`;},
  inv:v=>{const L=invItems(v);const ref=refRec();const refMiss=(ref&&ref.inventaire&&ref.inventaire.miss)||{};const n=L.filter(x=>W.inv.miss[x.id]).length;
    if(!L.length)return `<div class="warnbox">Pas de liste d'inventaire pour ce type de véhicule (${esc(v.type||'type non renseigné')}) : à fournir par SCR. Rien à cocher ici.</div>`;
    return `<div class="veh-sec"><h3><span>${esc(invTitre(v))}</span><span class="veh-rest${n?'':' done'}" id="veh-invn">${L.length-n} présent${L.length-n>1?'s':''} · ${n} écart${n>1?'s':''}</span></h3><div class="hint">Tout est coché « présent » : touche seulement ce qui manque.${W.type==='restitution'&&Object.keys(refMiss).length?' Les manquants de la réception restent cochés manquants.':''}</div>
      <div class="veh-invl">${L.map(it=>`<button class="veh-inv${W.inv.miss[it.id]?' miss':''}" data-act="x" data-v="veh|inv|${esc(it.id)}"><span class="ck"></span><span class="tx"><b>${esc(it.d)}</b><small>${esc(it.q||'')}${refMiss[it.id]?' · déjà manquant à la réception':''}</small></span></button>`).join('')}</div>
      ${n?`<button class="btn sm" data-act="x" data-v="veh|invok|" style="margin-top:6px">Tout remettre « présent »</button>`:''}</div>
      <div class="veh-sec"><label class="f veh-lab">Observations sur l'inventaire</label><textarea class="f" data-xin="veh|invObs" rows="2" placeholder="ex. 1 meuleuse sur 2">${esc(W.inv.obs||'')}</textarea></div>`;},
  cartes:v=>{const C=vcfg();const D=dispoOf(v);const isR=W.type==='restitution';const cles=C.dispositifs&&C.dispositifs.cles;
    if(isR){const L=Object.keys(W.cartes);const ab=W.lache||W.memoire;return `<div class="veh-sec"><h3><span>Cartes et badges remis à la réception</span></h3>${ab?'<div class="hint">Le véhicule change de main sans passer par le responsable : les cartes restent à bord, sauf perte.</div>':''}${L.length?L.map(id=>{const c=W.cartes[id];return `<div class="veh-pt"><div class="veh-lab">${esc(dispoLabel(id))}${c.numero?' · n° '+esc(c.numero):''}</div>${segB('carte',id,ab?['À bord','Perdue']:['Rendue','Perdue'],c.statut==='perdue'?'Perdue':c.statut==='rendue'?'Rendue':c.statut==='abord'?'À bord':'')}</div>`;}).join(''):'<div class="eq-s">Aucune carte remise à la réception.</div>'}</div>
      ${cles?`<div class="veh-sec"><label class="f veh-lab">Clés rendues (nombre de jeux)</label><input class="f" type="number" inputmode="numeric" min="0" data-xin="veh|cles" value="${esc(W.cles)}"></div>`:''}`;}
    return `<div class="veh-sec"><h3><span>Cartes carburant et télébadge</span></h3>${D.map(d=>{const c=W.cartes[d.id]||{};return `<div class="veh-pt"><div class="veh-lab">${esc(d.label)}${d.condition?` <span class="hint">(${esc(d.condition)})</span>`:''}</div><input class="f" data-xin="veh|carteNum~${esc(d.id)}" value="${esc(c.numero||'')}" placeholder="N° de support"><div style="margin-top:6px">${segB('carte',d.id,['Remise','Pas de carte'],c.statut==='remise'?'Remise':c.statut==='aucune'?'Pas de carte':'')}</div></div>`;}).join('')||'<div class="eq-s">Aucun dispositif dans le pack.</div>'}</div>
      ${cles?`<div class="veh-sec"><label class="f veh-lab">Clés remises (nombre de jeux)</label><input class="f" type="number" inputmode="numeric" min="0" data-xin="veh|cles" value="${esc(W.cles)}"></div>`:''}
      ${((C.dispositifs&&C.dispositifs.engagements)||[]).length?`<div class="veh-sec"><h3><span>Consignes d'usage</span></h3><ul class="veh-sum">${C.dispositifs.engagements.map(e=>`<li>${esc(e)}</li>`).join('')}</ul></div>`:''}
      <button class="veh-check${W.consignes?' on':''}" data-act="x" data-v="veh|consignes|"><span class="bx">${W.consignes?'✓':''}</span><span><b>J'ai pris connaissance des consignes d'usage de ces dispositifs</b><small>${esc(W.cond?W.cond.nom:'Le conducteur')}</small></span></button>`;},
  charte:v=>{const {charte:type}=profil(v);const ch=charteCur(type);const nom=W.cond?W.cond.nom:'';
    if(!ch)return `<div class="warnbox">Pas de charte « ${esc(type)} » dans le pack : rien à signer ici.</div>`;
    const deja=charteSigOf(W.cond&&W.cond.key,type);
    if(deja)return `<div class="okbox">✓ ${esc(nom)} a déjà signé « ${esc(ch.titre)} » (${esc(ch.version)}) le ${dFR(deja.at)}.</div><div class="hint">Une seule signature par version et par personne : rien à refaire.</div>`;
    if(W.charte.later)return `<div class="veh-ko">La charte sera signée plus tard : la remise sera <b>incomplète</b> (en rouge chez le responsable flotte, « À faire » en haut de l'accueil de ${esc(nom)}).</div><button class="btn block" data-act="x" data-v="veh|charteNow|" style="margin-top:8px">Finalement, la lire et la signer maintenant</button>`;
    return `<div class="hint">${esc(ch.titre)} · ${esc(ch.version)} — à lire par ${esc(nom)} jusqu'en bas, puis à signer.</div>
      <div class="dr-body veh-read" id="veh-cbody"><div class="dr-doc veh-doc">${mdHTML(ch.texte,{conducteur:nom,date:dFR(new Date()),lieu:W.lieu||'',$sig:'<i>(signature ci-dessous)</i>'})}</div></div>
      ${W.charte.lueA?`<div class="okbox">✓ Lue jusqu'en bas. ${esc(nom)} signe dans le cadre :</div>${sigPadHTML('veh-pad-ch')}<button class="btn sm" data-act="x" data-v="veh|clr|ch">Effacer le trait</button>`
        :`<button class="btn block veh-big" id="veh-cread" data-ok="✓ J'ai lu en entier — je signe" data-act="x" data-v="veh|lu|" disabled style="margin-top:8px">Déroule jusqu'en bas pour signer</button>`}
      <button class="btn veh-later" data-act="x" data-v="veh|later|">Le conducteur signera plus tard (remise incomplète)</button>`;},
  recap:(v,me,ctx)=>{const r=draftRec(v);const isR=W.type==='restitution';const seul=R2.seulW(W);
    const tail=R2.recapTail(me,ctx); /* 20/10 VM : laisser (et après), contre-état des lieux, de mémoire, seul (à valider par) ; sinon la signature du responsable */
    return `${W.lache?`<div class="veh-sec"><h3><span>Laissé à ${esc(W.a?W.a.nom:'qui le prendra')}</span></h3><div class="okbox">${esc(r.lache&&r.lache.ou||'')}${W.quand&&W.quand>todayIso()?' · à partir du '+dFR(W.quand):' · maintenant'}${W.memoire?' · de mémoire':''}</div></div>`:''}${isR?diffHTML(r.diff,refRec(),!!W.lache):sumHTML(r)}${R2.contreRecapHTML()}
      ${!isR&&r.reserves.length?`<div class="veh-sec"><h3><span>Réserves</span></h3><ul class="veh-sum">${r.reserves.map(x=>`<li>${esc(x)}</li>`).join('')}</ul></div>`:''}
      ${r.manque.length&&!seul?`<div class="veh-ko">Remise incomplète : ${esc(r.manque.map(x=>MANQ[x]).join(', '))}. Elle reste en rouge chez le responsable flotte et « À faire » chez ${esc(r.conducteurNom)}.</div>`:''}
      
      <div class="veh-sec"><h3><span>${W.lache&&!W.self?'Ta signature':'Signature du conducteur'}</span><span class="hint">${esc(W.lache&&!W.self?uname():r.conducteurNom)}</span></h3><div class="hint" style="margin:0 0 4px">${R2.sigLabel()||(isR?'Je rends le véhicule dans l\'état décrit ci-dessus.':'Je reconnais l\'exactitude de l\'état des lieux, de l\'inventaire et des cartes reçues.')}</div>${sigPadHTML('veh-pad-c')}<button class="btn sm" data-act="x" data-v="veh|clr|c">Effacer</button></div>
      ${tail!==undefined?(tail||''):`<div class="veh-sec"><h3><span>Signature du responsable</span><span class="hint">${esc(uname())}</span></h3>${sigPadHTML('veh-pad-r')}<button class="btn sm" data-act="x" data-v="veh|clr|r">Effacer</button></div>`}`;}};
Object.assign(STEP,R2.STEP2); /* 19/10 VH : « Qui est là ? », « Où est le véhicule ? », « Kilométrage et carburant » (véhicule laissé) */
function pickList(P,q){const L=P.filter(p=>!q||nomP(p).toLowerCase().includes(q)).slice(0,80);return L.map(p=>`<button class="veh-pick${W&&W.cond&&W.cond.key===p.id?' on':''}" data-act="x" data-v="veh|cond|${esc(p.id)}"><b>${esc(nomP(p))}</b><small>${esc(POSTES[p.poste]||'')}${p.type==='interim'?' · intérim':''}</small></button>`).join('')||'<div class="eq-s">Personne ne correspond.</div>';}
function kmRestant(v){if(!v||!v.cadenceVidange||v.kmVidange===undefined||v.kmVidange===null||v.kmVidange==='')return null;const km=W&&W.edl.km!==''&&W.edl.km!==null?+W.edl.km:+v.km||0;return (+v.kmVidange)+(+v.cadenceVidange)-km;}
export function sumHTML(r){const all=['rel','ctl','doc'].flatMap(g=>Object.values((r.edl||{})[g]||{}));const ko=all.filter(isKo).length;const nPh=Object.keys(r.edl.photos||{}).length;const nM=Object.keys(r.inventaire.miss||{}).length;const cartes=Object.values(r.cartes||{}).filter(c=>c.statut==='remise');const c=r.charte||{};
  return `<div class="veh-sec"><h3><span>${esc(r.immat)} → ${esc(r.conducteurNom)}</span></h3><ul class="veh-sum">
    <li>Permis : ${r.permis&&r.permis.ok?'✓ vu et valide'+(r.permis.fin?' (jusqu\'au '+dFR(r.permis.fin)+')':''):r.premier?'pas à revoir (véhicule déjà attitré)':r.permis&&r.permis.aFaireVoir?'<b>à faire voir au responsable</b>'+(r.permis.fin?' (validité : '+dFR(r.permis.fin)+')':''):'<b class="ko">non vu</b>'}</li>
    <li>Kilométrage : <b>${nb(r.edl.km)} km</b></li>
    <li>Niveaux, points d'état, documents : ${all.length-ko} Ok${ko?` · <b class="ko">${ko} non ok</b>`:''}</li>
    <li>Photos : ${nPh} · impacts notés : ${(r.edl.impacts||[]).length}</li>
    <li>Inventaire (${esc(r.inventaire.titre)}) : ${r.inventaire.n} article${r.inventaire.n>1?'s':''}${nM?` · <b class="ko">${nM} manquant${nM>1?'s':''}</b>`:r.inventaire.n?' · conforme':''}</li>
    <li>Cartes remises : ${cartes.length?cartes.map(x=>esc(x.label)+(x.numero?' n° '+esc(x.numero):'')).join(' · '):'aucune'}${r.cles!=null?' · clés : '+esc(r.cles):''}</li>
    <li>Charte : ${c.none?'pas de charte dans le pack':c.sig?'✓ lue et signée ('+esc(c.version)+')':'<b class="ko">à signer plus tard</b>'}</li></ul></div>`;}
export function diffHTML(d,ref,lache){if(!d)return '';const li=(t,x)=>`<li class="ko"><b>${t}</b> · ${esc(x)}</li>`; /* 20/10 VM : lache = « laisser un véhicule » → comparé à la prise du véhicule (état des lieux d'entrée ou signature) */
  return `<div class="veh-sec veh-diff"><h3><span>Différences avec ${lache?'la prise du véhicule':'la réception'}${ref?' du '+dFR(ref.pris&&ref.lache?ref.pris.at:ref.at):''}</span></h3>${d.sansRef?`<div class="warnbox" style="margin:0 0 6px">${lache?'Pas d\'état des lieux de prise du véhicule dans l\'appli : rien à comparer, tout ce qui est noté ici compte.':'Pas de réception enregistrée dans l\'appli pour ce conducteur : rien à comparer, tout ce qui est noté compte.'}</div>`:''}
    ${lache&&d.sansRef?'':`<div class="veh-kms"><b id="veh-kmp">${d.km!==null&&d.km!==undefined?nb(d.km)+' km':'—'}</b><small>parcourus</small></div>`}
    ${d.n?`<ul class="veh-sum veh-dl">${d.impacts.map(i=>li('Nouvel impact',zoneLab(i.zone)+(i.note?' : '+i.note:''))).join('')}${d.manquants.map(x=>li('Manquant',x)).join('')}${d.nonOk.map(x=>li('Non ok',x)).join('')}${d.cartesPerdues.map(x=>li('Perdue',x)).join('')}</ul>`:'<div class="okbox">✓ Aucune différence avec la réception (hors kilométrage).</div>'}
    ${d.retrouves.length?`<div class="hint">Retrouvé${d.retrouves.length>1?'s':''} depuis la réception : ${esc(d.retrouves.join(', '))}</div>`:''}</div>`;}
// l'enregistrement (aussi utilisé par le récapitulatif) : tout ce qui sera signé
function draftRec(v){const C=vcfg()||{};const E=C.edl||{};const isR=W.type==='restitution';const items=invItems(v);const ref=refRec();const lab=(L,id)=>((L||[]).find(x=>x.id===id)||{}).label||id;
  const reserves=[];[['rel',E.releves],['ctl',E.controles],['doc',E.docs]].forEach(([g,L])=>Object.entries(W.edl[g]||{}).forEach(([id,val])=>{if(isKo(val))reserves.push(lab(L,id)+' : '+val);}));
  W.edl.impacts.forEach(i=>reserves.push('Impact '+zoneLab(i.zone)+(i.note?' : '+i.note:'')));
  const miss=items.filter(x=>W.inv.miss[x.id]).map(x=>x.id);miss.forEach(id=>reserves.push('Manquant : '+(items.find(x=>x.id===id)||{}).d));
  Object.entries(W.cartes).forEach(([id,c])=>{if(c.statut==='perdue')reserves.push(dispoLabel(id)+' déclarée perdue');});
  const rest=kmRestant(v);
  const rec={type:W.type,vehId:v.immat,immat:v.immat,vehLabel:((v.marque||'')+' '+(v.modele||'')).trim(),vehType:v.type||'',agence:v.agence||'',conducteurKey:W.cond?W.cond.key:'',conducteurNom:W.cond?W.cond.nom:'',conducteurPoste:W.cond&&W.cond.poste||'',
    edl:{km:W.edl.km===''||W.edl.km===null?null:+W.edl.km,kmRestantVidange:rest!==null?rest:(((W.edl.num||{}).kmRestantVidange)||null),num:Object.assign({},W.edl.num||{}),rel:Object.assign({},W.edl.rel),ctl:Object.assign({},W.edl.ctl),doc:Object.assign({},W.edl.doc),equip:Object.assign({},W.edl.equip),photos:Object.assign({},W.edl.photos),impacts:W.edl.impacts.slice(),remarques:W.edl.remarques||''},
    inventaire:{liste:profil(v).invKey||'',titre:invTitre(v),items:items.map(x=>[x.id,x.d,x.q||'']),miss:Object.fromEntries(miss.map(id=>[id,1])),obs:W.inv.obs||'',n:items.length},
    cartes:Object.fromEntries(Object.entries(W.cartes).map(([id,c])=>[id,{label:dispoLabel(id),numero:c.numero||'',statut:c.statut||''}])),cles:W.cles===''||W.cles===null||W.cles===undefined?null:+W.cles,
    lieu:W.lieu||'',reserves,refReception:W.ref||null};
  if(!isR){rec.permis={ok:!!W.permis.ok,fin:W.permis.fin||''};rec.consignesLues=!!W.consignes;if(W.premier)rec.premier=true;if(W.contreDe)rec.contreDe=W.contreDe;if(W.qui==='seul'&&!W.premier&&!W.contreDe)rec.permis={ok:false,fin:W.permis.fin||'',aFaireVoir:true}; /* 20/10 VM : contre-état des lieux → pas de permis à revoir (le preneur signe sans vérification de permis) */ /* 19/10 VH : seul → permis « à faire voir » ; premier état des lieux → pas de permis à revoir */
    const {charte:type}=profil(v);const ch=charteCur(type);const deja=ch&&charteSigOf(rec.conducteurKey,type);
    rec.charte=!ch?{type,none:true}:deja?{type,version:ch.version,lueA:deja.readAt||deja.at,sig:deja.img||null,at:deja.at,deja:true}:(W.charte.lueA&&W.charte.sig&&!W.charte.later)?{type,version:ch.version,lueA:W.charte.lueA,sig:W.charte.sig,at:new Date().toISOString()}:{type,version:ch.version,later:true};
    rec.manque=manque(rec);rec.complete=!rec.manque.length;}
  else{rec.diff=diffOf(rec,ref);rec.manque=[];rec.complete=true;}
  if(W.lache)rec.lache={ou:R2.ouLabel(W),k:(W.ou||{}).k||'',txt:(W.ou||{}).txt||'',site:(W.ou||{}).site||''}; /* véhicule laissé : où (le récapitulatif l'affiche ; onSave y ajoute la date) */
  return rec;}
function diffOf(rec,ref){const E=((vcfg()||{}).edl)||{};const d={km:null,impacts:rec.edl.impacts.slice(),manquants:[],retrouves:[],nonOk:[],cartesPerdues:[],sansRef:!ref};
  if(ref&&ref.edl&&ref.edl.km!==null&&ref.edl.km!==undefined&&rec.edl.km!==null)d.km=rec.edl.km-ref.edl.km;
  const lab=id=>((rec.inventaire.items.find(x=>x[0]===id)||[])[1])||id;const refMiss=(ref&&ref.inventaire&&ref.inventaire.miss)||{};
  Object.keys(rec.inventaire.miss).forEach(id=>{if(!refMiss[id])d.manquants.push(lab(id));});Object.keys(refMiss).forEach(id=>{if(!rec.inventaire.miss[id]&&rec.inventaire.items.some(x=>x[0]===id))d.retrouves.push(lab(id));});
  [['rel',E.releves],['ctl',E.controles],['doc',E.docs]].forEach(([g,L])=>(L||[]).forEach(x=>{const now=(rec.edl[g]||{})[x.id],was=ref&&ref.edl?(ref.edl[g]||{})[x.id]:null;if(isKo(now)&&!isKo(was))d.nonOk.push(x.label+(was?' (était '+was+')':''));}));
  Object.values(rec.cartes).forEach(c=>{if(c.statut==='perdue')d.cartesPerdues.push(c.label+(c.numero?' n° '+c.numero:''));});
  d.n=d.impacts.length+d.manquants.length+d.nonOk.length+d.cartesPerdues.length;return d;}
function check(k,v){const E=vcfg().edl;const c2=R2.check2(k,v);if(c2!==undefined)return c2; /* 19/10 VH : étapes et modes en plus (qui, où, carburant, seul, de mémoire) */
  if(k==='cond'&&!(W.cond&&W.cond.key))return 'Choisis le conducteur dans la liste';
  if(k==='permis'&&W.permis.ok){if(!W.permis.fin)return 'La date de fin de validité du permis';if(W.permis.fin<todayIso())return 'Fin de validité dépassée : le permis n\'est pas valide (décoche « vu et valide »)';}
  if(k==='releves'){const km=W.edl.km;if(km===''||km===null||isNaN(+km)||+km<0)return 'Le kilométrage au compteur';const ref=refRec();if(ref&&ref.edl&&ref.edl.km!==null&&+km<ref.edl.km)return 'Kilométrage inférieur à celui de la réception ('+nb(ref.edl.km)+' km)';const n=grpList('rel').filter(x=>x.obl&&!W.edl.rel[x.id]).length;if(n)return 'Il reste '+n+' niveau'+(n>1?'x':'')+' à cocher (Ok / Non ok)';}
  if(k==='controles'){const n=grpList('ctl').filter(x=>x.obl&&!W.edl.ctl[x.id]).length+grpList('doc').filter(x=>x.obl&&!W.edl.doc[x.id]).length;if(n)return 'Il reste '+n+' point'+(n>1?'s':'')+' à cocher (Ok / Non ok)';}
  if(k==='photos'){const m=(E.photos||[]).filter(p=>p.obl&&!W.edl.photos[p.id]);if(m.length)return 'Photo'+(m.length>1?'s':'')+' à prendre : '+m.map(p=>p.label).join(', ');}
  if(k==='cartes'){if(W.type==='reception'&&Object.values(W.cartes).some(c=>c.statut==='remise')&&!W.consignes)return 'Coche « J\'ai pris connaissance des consignes d\'usage »';if(W.type==='restitution'&&Object.values(W.cartes).some(c=>!c.statut))return 'Pour chaque carte : rendue ou perdue';}
  if(k==='charte'){const {charte:type}=profil(v);const ch=charteCur(type);if(ch&&!charteSigOf(W.cond&&W.cond.key,type)&&!W.charte.later){if(!W.charte.lueA)return 'Déroule la charte jusqu\'en bas';if(!W.charte.sig)return 'La signature du conducteur (un trait au doigt dans le cadre)';}}
  if(k==='recap'){if(!W.sigC)return 'La signature du conducteur';if(!W.sigR)return 'La signature du responsable';}
  return null;}
export function wizHTML(me,ctx){ensureCss();if(!W)return `<div class="card"><div class="eq-s">Aucune remise en cours. Ouvre la fiche d'un véhicule → « Remettre à… ».</div></div>`;const v=vehGet(W.vehId);if(!v)return `<div class="card"><div class="eq-s">Véhicule introuvable.</div></div>`;
  if(W.step==='done')return doneHTML(v);if(!vcfg())return `<div class="card"><div class="warnbox">Configuration véhicule absente : l'administrateur importe le pack SCR.</div></div>`;
  const S=STEPS(W);if(W.step>=S.length)W.step=S.length-1;const k=S[W.step];const n=W.step+1;let body='';try{body=STEP[k](v,me,ctx);}catch(e){console.warn(e);body=`<div class="warnbox">Écran indisponible (${esc(e.message)}).</div>`;}
  let nxt='Continuer ›';if(k==='inv'){const L=invItems(v);const nm=L.filter(x=>W.inv.miss[x.id]).length;nxt=!L.length?'Continuer ›':nm?'Valider avec '+nm+' écart'+(nm>1?'s':'')+' ›':'✓ Tout est conforme ›';}
  if(k==='charte'&&W.charte.lueA&&!W.charte.later)nxt='Valider la signature ›';if(k==='recap')nxt=R2.recapLabel()||(W.type==='reception'?'✓ Enregistrer la remise':'✓ Enregistrer la restitution');
  setTimeout(()=>afterRender(k),0);
  return `<div class="veh-wiz"><div class="veh-kick">${[R2.kick()||(W.type==='reception'?'Remise':'Restitution'),v.immat,((v.marque||'')+' '+(v.modele||'')).trim(),W.cond&&W.cond.nom].filter(Boolean).map(esc).join(' · ')}</div>
    <h2 class="vt veh-h">${n}/${S.length} · ${esc(STEP_T[k]||R2.STEP_T2[k]||k)}</h2><div class="veh-bar"><i style="width:${Math.round(100*n/S.length)}%"></i></div>${body}
    <div class="veh-nav">${W.step>0?`<button class="btn veh-big" data-act="x" data-v="veh|prev|">‹ Retour</button>`:`<button class="btn veh-big" data-act="x" data-v="veh|cancel|">Abandonner</button>`}<button class="btn primary veh-big" id="veh-next" data-act="x" data-v="veh|next|">${esc(nxt)}</button></div></div>`;}
function doneHTML(v){const r=regGet('vrec',W.savedId);const isR=W.type==='reception';const m=r?manque(r):[];const h2=R2.doneHTML2(v,r);if(h2)return h2; /* 19/10 VH : seul (à valider), véhicule laissé, de mémoire */
  return `<div class="veh-wiz"><div class="veh-kick">${isR?'Remise':'Restitution'} · ${esc(v.immat)}</div><h2 class="vt veh-h">${isR?'Remise enregistrée':'Restitution enregistrée'}</h2>
    ${m.length?`<div class="veh-ko">Remise incomplète : ${esc(m.map(x=>MANQ[x]).join(', '))}. En rouge dans la flotte, « À faire » chez ${esc(r.conducteurNom)}.</div>`:`<div class="okbox">✓ ${isR?esc(v.immat)+' est remis à <b>'+esc(r?r.conducteurNom:'')+'</b>. Il le retrouve dans Moi → Mon véhicule.':esc(v.immat)+' est rendu : le véhicule est libre.'}</div>`}
    ${r&&!isR&&r.diff?`<div class="hint">${r.diff.km!==null?nb(r.diff.km)+' km parcourus · ':''}${r.diff.n?r.diff.n+' différence'+(r.diff.n>1?'s':'')+' : signalée'+(r.diff.n>1?'s':'')+' au responsable flotte':'aucune différence'}</div>`:''}
    <div class="veh-nav"><button class="btn veh-big" data-act="x" data-v="veh|print|${esc(W.savedId||'')}">🖨 Document (PDF)</button>${W.host==='moi'?`<button class="btn primary veh-big" data-act="x" data-v="veh|home|">Retour à Moi</button>`:`<button class="btn primary veh-big" data-act="xsub" data-v="">Retour à la fiche</button>`}</div></div>`;}
const PADS={};const PAD_ID={ch:'veh-pad-ch',c:'veh-pad-c',r:'veh-pad-r'};
function pad(id,slot){const cv=document.getElementById(id);if(!cv||cv.dataset.vehOn)return;cv.dataset.vehOn='1';const p=sigPadInit(id);PADS[id]=p;
  const cur=slot==='ch'?W.charte.sig:slot==='c'?W.sigC:W.sigR;if(cur){const im=new Image();im.onload=()=>{try{cv.getContext('2d').drawImage(im,0,0);}catch(e){}};im.src=cur;}
  const keep=()=>{if(!W||!p.drawn())return;const png=p.png();const at=new Date().toISOString();if(slot==='ch')W.charte.sig=png;else if(slot==='c'){W.sigC=png;W.sigCAt=at;}else{W.sigR=png;W.sigRAt=at;}saveDraftSoon();}; /* le trait est gardé dès qu'on lève le doigt : un re-rendu ne l'efface pas */
  ['pointerup','pointercancel','pointerleave'].forEach(e=>cv.addEventListener(e,keep));}
function afterRender(k){if(!W)return;if(k==='charte'){const b=document.getElementById('veh-cbody'),btn=document.getElementById('veh-cread');if(b&&btn&&!btn.dataset.vehOn){btn.dataset.vehOn='1';readGate(b,btn,null);}pad('veh-pad-ch','ch');}if(k==='recap'){pad('veh-pad-c','c');pad('veh-pad-r','r');}}
function next(me,ctx){const v=vehGet(W.vehId);if(!v)return;const S=STEPS(W);const k=S[W.step];const err=check(k,v);if(err){ctx.toast(err);return;}
  if(k==='recap'){save(v,me,ctx);return;}W.step++;saveDraft();ctx.render();scrollTop();}
function save(v,me,ctx){const r=draftRec(v);const now=new Date().toISOString();
  Object.assign(r,{sigConducteur:W.sigC,sigConducteurAt:W.sigCAt||now,sigResponsable:W.sigR,sigResponsableAt:W.sigRAt||now,responsableNom:uname(),responsableKey:ukey(),at:now,by:uname(),byKey:ukey()});
  const id=v.immat+'|'+(W.type==='reception'?'R':'S')+W.rid;
  const cartes=Object.assign({},v.cartes||{});Object.entries(r.cartes).forEach(([cid,c])=>{if(c.numero&&c.statut!=='perdue')cartes[cid]=c.numero;if(c.statut==='perdue')delete cartes[cid];}); /* 1 carte = 1 véhicule : les n° restent sur la fiche */
  const patch={cartes,remise:{id,type:r.type,at:now,complete:r.complete,conducteur:r.conducteurNom}};if(r.edl.km!==null)patch.km=r.edl.km;
  if(W.type==='reception'){patch.conducteur=r.conducteurNom;patch.conducteurKey=r.conducteurKey;}
  else if(!W.memoire){patch.conducteur=null;patch.conducteurKey=null;} /* 19/10 VH : restitution de mémoire (changement de conducteur) — le véhicule est déjà sur le nouveau conducteur */
  if(W.type!=='reception'){const d=r.diff||{};if(d.n)patch.signalements=(v.signalements||[]).concat([{id:'S'+Date.now().toString(36),text:(W.lache?'Véhicule laissé par ':'Restitution de ')+r.conducteurNom+' : '+[d.impacts.length?d.impacts.length+' nouvel'+(d.impacts.length>1?'s':'')+' impact'+(d.impacts.length>1?'s':''):'',d.manquants.length?d.manquants.length+' manquant'+(d.manquants.length>1?'s':''):'',d.nonOk.length?d.nonOk.length+' point'+(d.nonOk.length>1?'s':'')+' non ok':'',d.cartesPerdues.length?d.cartesPerdues.length+' carte'+(d.cartesPerdues.length>1?'s':'')+' perdue'+(d.cartesPerdues.length>1?'s':''):''].filter(Boolean).join(', '),at:now,by:uname()}]);} /* non bloquant : signalé au responsable flotte (alerte de la fiche) */
  const o2=R2.onSave(r,patch,v,id)||{}; /* 19/10 VH : seul → à valider ; véhicule laissé ; vignette ; remise refusée remplacée · 20/10 VM : à qui / quand, contre-état des lieux (contest), fiche à ne pas toucher (skipVeh) */
  regSet('vrec',id,r);
  if(W.type==='reception'&&r.charte&&r.charte.sig&&!r.charte.deja){const doc=charteDoc(r.charte.type,r.charte.version);regSet('docsig',doc+'|'+r.conducteurKey,{doc,ver:r.charte.version,key:r.conducteurKey,name:r.conducteurNom,at:now,img:r.charte.sig,readAt:r.charte.lueA,lieu:r.lieu||'',veh:v.immat,rec:id,via:ukey()===r.conducteurKey?'':uname()},{local:!String(r.conducteurKey).includes('@')});} /* comme docs.js : un personnage de démo reste sur l'appareil */
  if(!o2.skipVeh)vehSet(v.immat,patch);
  W.step='done';W.savedId=id;saveDraft();ctx.render();scrollTop();ctx.toast(W.lache?'Véhicule laissé à '+(W.a?W.a.nom:'qui le prendra')+' ✓':W.contreDe?'Contre-état des lieux enregistré — mouvement contesté':r.aValider?'État des lieux enregistré — à valider par '+r.aValider.nom:W.type==='reception'?(r.complete?'Remise enregistrée ✓':'Remise enregistrée — incomplète'):'Restitution enregistrée ✓');}
/* ── document imprimable (HTML mis en page → Imprimer / PDF), comme les autres impressions de l'appli (charte.js) ── */
const DOC_X='table.inv td{padding:3px 8px;font-size:11px}table.sig img{height:60px;display:block}.charte{font-size:11.5px}.charte h2{font-size:13.5px;margin:14px 0 6px}.charte h2::before{display:none}.charte h3{font-size:11.5px;color:#3a3636;text-transform:none;letter-spacing:0}.charte h4{font-size:11px;margin:8px 0 4px}.charte p{margin:5px 0}.charte mark{background:#fff3c4}ul.eng{font-size:11px;color:#766f6f}.veh-blank{color:#999}';
function recDocHTML(r){const C=vcfg()||{};const E=C.edl||{};const isR=r.type==='reception';const ed=r.edl||{};const m=isR?manque(r):[];
  const val=x=>x?`<b class="${isKo(x)?'ko':isOk(x)?'ok':''}">${esc(x)}</b>`:'<span class="muted">—</span>';
  const tab=(L,o)=>(L||[]).filter(x=>(o||{})[x.id]!==undefined&&(o||{})[x.id]!=='').map(x=>`<tr><td>${esc(x.label)}</td><td>${val(o[x.id])}</td></tr>`).join('');
  const ph=(E.photos||[]).filter(p=>ed.photos&&ed.photos[p.id]).map(p=>`<figure><img src="${esc(ed.photos[p.id])}" alt=""><figcaption>${esc(p.label)}</figcaption></figure>`).join('')+(ed.impacts||[]).filter(i=>i.photo).map(i=>`<figure><img src="${esc(i.photo)}" alt=""><figcaption>Impact · ${esc(zoneLab(i.zone))}${i.note?' · '+esc(i.note):''}</figcaption></figure>`).join('');
  const inv=r.inventaire||{};const miss=inv.miss||{};const d=r.diff;let b='';
  if(!isR&&d)b+=`<h2>Différences avec ${r.lache?'la prise du véhicule':'la réception'}</h2><div class="card ${d.n?'notice':'soft'}"><b>${d.km!==null&&d.km!==undefined?nb(d.km)+' km parcourus':r.lache?'Kilométrage de prise du véhicule inconnu':'Kilométrage de réception inconnu'}</b>${d.sansRef?'<br><span class="muted">'+(r.lache?'Pas d\'état des lieux de prise du véhicule dans l\'appli : rien à comparer.':'Pas de réception enregistrée dans l\'appli : rien à comparer.')+'</span>':''}${d.n?`<ul>${d.impacts.map(i=>`<li>Nouvel impact · ${esc(zoneLab(i.zone))}${i.note?' : '+esc(i.note):''}</li>`).join('')}${d.manquants.map(x=>`<li>Manquant · ${esc(x)}</li>`).join('')}${d.nonOk.map(x=>`<li>Non ok · ${esc(x)}</li>`).join('')}${d.cartesPerdues.map(x=>`<li>Carte perdue · ${esc(x)}</li>`).join('')}</ul>`:'<div class="ok">✓ Aucune différence (hors kilométrage).</div>'}${d.retrouves&&d.retrouves.length?`<div class="muted">Retrouvés depuis la réception : ${esc(d.retrouves.join(', '))}</div>`:''}</div>`;
  b+=`<h2>${isR?'Conducteur et permis':'Conducteur'}</h2><table><tr><td>Conducteur</td><td><b>${esc(r.conducteurNom)}</b>${r.conducteurPoste?' · '+esc(r.conducteurPoste):''}</td></tr>${isR?`<tr><td>Permis de conduire</td><td>${r.permis&&r.permis.ok?'<b class="ok">vu et valide</b>'+(r.permis.fin?' · fin de validité : '+dFR(r.permis.fin):''):'<b class="ko">non vu</b>'}</td></tr>`:''}<tr><td>Véhicule</td><td><b>${esc(r.immat)}</b> · ${esc(r.vehLabel||'')}${r.vehType?' · '+esc(r.vehType):''}${r.agence?' · '+esc(r.agence):''}</td></tr></table>`;
  b+=`<h2>État des lieux</h2><table><tr><td>Kilométrage</td><td><b>${ed.km!==null&&ed.km!==undefined?nb(ed.km)+' km':'—'}</b></td></tr>${ed.kmRestantVidange!==null&&ed.kmRestantVidange!==undefined&&ed.kmRestantVidange!==''?`<tr><td>Km restant avant vidange</td><td>${nb(ed.kmRestantVidange)} km</td></tr>`:''}${(E.releves||[]).filter(x=>x.type!=='choix'&&x.id!=='km'&&x.id!=='kmRestantVidange'&&ed.num&&ed.num[x.id]).map(x=>`<tr><td>${esc(x.label)}</td><td>${esc(ed.num[x.id])}${x.unite?' '+esc(x.unite):''}</td></tr>`).join('')}${tab((E.releves||[]).filter(x=>x.type==='choix'),ed.rel)}</table>`;
  b+=`<h3>Points d'état</h3><table>${tab(E.controles,ed.ctl)}</table><h3>Documents à bord</h3><table>${tab(E.docs,ed.doc)}</table>`;
  const eq=(E.equipement||[]).filter(x=>ed.equip&&ed.equip[x.id]);if(eq.length)b+=`<h3>Poste à souder / groupe</h3><table>${eq.map(x=>`<tr><td>${esc(x.label)}</td><td>${esc(x.type==='date'?dFR(ed.equip[x.id]):ed.equip[x.id])}${x.unite?' '+esc(x.unite):''}</td></tr>`).join('')}</table>`;
  b+=`<h3>Impacts${isR?'':' notés à la restitution'}</h3>${(ed.impacts||[]).length?`<ul>${ed.impacts.map(i=>`<li>${esc(zoneLab(i.zone))}${i.note?' : '+esc(i.note):''}</li>`).join('')}</ul>`:'<p class="muted">Aucun.</p>'}${ed.remarques?`<p><b>Remarques :</b> ${esc(ed.remarques)}</p>`:''}`;
  if(ph)b+=`<h3>Photos</h3><div class="ph">${ph}</div>`;
  b+=`<h2>Inventaire — ${esc(inv.titre||'')}</h2>${(inv.items||[]).length?`<table class="inv"><tr><th>Désignation</th><th>Qté</th><th>État</th></tr>${inv.items.map(([id,dd,q])=>`<tr><td>${esc(dd)}</td><td>${esc(q||'')}</td><td>${miss[id]?'<b class="ko">manquant</b>':'<span class="ok">présent</span>'}</td></tr>`).join('')}</table>`:'<p class="muted">Pas de liste d\'inventaire pour ce type de véhicule.</p>'}${inv.obs?`<p><b>Observations :</b> ${esc(inv.obs)}</p>`:''}`;
  if(r.lache)b=`<h2>Véhicule laissé</h2><div class="card notice"><b>${esc(r.lache.ou||'')}</b> — laissé par <b>${esc(r.conducteurNom||'')}</b>${r.rempliPar&&r.rempliPar.nom&&r.rempliPar.nom!==r.conducteurNom?' (noté par '+esc(r.rempliPar.nom)+')':''} le ${dhFR(r.lache.at||r.at)} à <b>${esc(r.a?r.a.nom:'qui le prendra')}</b>${r.quand?' · à partir du '+dFR(r.quand):''}${r.memoire?' · de mémoire':''}${r.declarePar?' · changement de conducteur déclaré par '+esc(r.declarePar):''}${r.carburant?' · carburant : '+esc(r.carburant):''}.${r.pris?' <b class="ok">Pris par '+esc(r.pris.nom||'')+' le '+dhFR(r.pris.at)+' : il a signé que cet état des lieux est exact.</b>':r.contest?' <b class="ko">Contesté par '+esc(r.contest.nom||'')+' le '+dhFR(r.contest.at)+' : « '+esc(r.contest.motif||'')+' »</b>'+(r.arbitre?' — tranché par '+esc(r.arbitre.nom||'')+' le '+dFR(r.arbitre.at)+' : '+(r.arbitre.decision==='redo'?'nouvel état des lieux demandé':'vu — clôturé')+(r.arbitre.note?' · « '+esc(r.arbitre.note)+' »':''):' — à trancher par un responsable'):' En attente de la signature du preneur.'}</div>`+b; /* 19/10 VH ; 20/10 VM : à qui, quand, pris / contesté */
  if(r.contreDe){const x=regGet('vrec',r.contreDe);b=`<h2>Contre-état des lieux</h2><div class="card notice">Conteste l'état des lieux de sortie de <b>${esc(x&&x.conducteurNom||'')}</b>${x?' du '+dhFR(x.lache&&x.lache.at||x.at):''} : <b class="ko">« ${esc(r.ecarts||'')} »</b>${(r.ecartsAuto||[]).length?`<ul>${r.ecartsAuto.map(t=>`<li>${esc(t)}</li>`).join('')}</ul>`:''}</div>`+b;} /* 20/10 VM */
  const cl=Object.values(r.cartes||{});b+=`<h2>Cartes et dispositifs</h2>${cl.length?`<table><tr><th>Dispositif</th><th>N° de support</th><th>${isR?'Remise':'Retour'}</th></tr>${cl.map(c=>`<tr><td>${esc(c.label)}</td><td>${esc(c.numero||'—')}</td><td>${val({remise:'Remise',aucune:'Pas de carte',rendue:'Rendue',perdue:'Perdue',abord:'À bord'}[c.statut]||c.statut)}</td></tr>`).join('')}</table>`:'<p class="muted">Aucun.</p>'}${r.cles!==null&&r.cles!==undefined?`<p>Clés : <b>${esc(r.cles)}</b> jeu${r.cles>1?'x':''}</p>`:''}${isR?`<p>${r.consignesLues?'☑':'☐'} J'ai pris connaissance des consignes d'usage de ces dispositifs.</p>${((C.dispositifs&&C.dispositifs.engagements)||[]).length?`<ul class="eng">${C.dispositifs.engagements.map(e=>`<li>${esc(e)}</li>`).join('')}</ul>`:''}`:''}`;
  const cs=isR&&r.charte&&!r.charte.none?(r.charte.sig?{img:r.charte.sig,at:r.charte.at,readAt:r.charte.lueA}:charteSigOf(r.conducteurKey,r.charte.type,r.charte.version)):null;
  if(isR)b+=`<h2>Charte d'utilisation du véhicule</h2><p>${r.charte&&r.charte.none?'Pas de charte dans le pack pour ce type de véhicule.':cs?'<b class="ok">Lue et signée</b> — version '+esc(r.charte.version)+(cs.readAt?' · lue jusqu\'en bas le '+dhFR(cs.readAt):'')+' (texte et visa en annexe).':'<b class="ko">Non signée</b> : remise incomplète.'}</p>`;
  if((r.reserves||[]).length)b+=`<h2>Réserves</h2><ul>${r.reserves.map(x=>`<li>${esc(x)}</li>`).join('')}</ul>`;
  const respTh=r.lache?(r.pris?'Celui qui prend — '+esc(r.pris.nom||'')+' (« ce qui est déclaré est exact », signé le '+dhFR(r.pris.at)+')':r.contest?'Contesté par '+esc(r.contest.nom||'')+' le '+dhFR(r.contest.at)+' (contre-état des lieux)':r.valide?'Le responsable — '+esc(r.valide.nom||'')+' (validé le '+dhFR(r.valide.at)+')':'Le preneur — '+esc(r.a?r.a.nom:'qui le prendra')+' (signature attendue)'):r.contreDe?'Contre-état des lieux : conteste l\'état des lieux reçu'+(r.arbitre?'':'')+(r.valide?' — validé par '+esc(r.valide.nom||''):''):r.valide?'Le responsable — '+esc(r.valide.nom||'')+' (validée le '+dhFR(r.valide.at)+')':r.aValider?'À valider par '+esc(r.aValider.nom||''):r.refus?'Refusée par '+esc(r.refus.nom||'')+' le '+dFR(r.refus.at)+' : '+esc(r.refus.motif||''):r.memoire?'État des lieux de sortie de mémoire (changement de conducteur)':'Le responsable — '+esc(r.responsableNom||r.by||''); /* 19/10 VH : sans responsable sur place ; 20/10 VM : les deux signatures (X qui laisse, Y qui prend) ou « contesté » */
  const sig2=r.lache&&r.pris&&r.pris.sig?r.pris.sig:r.sigResponsable;const sig2At=r.lache&&r.pris?r.pris.at:(r.sigResponsableAt||r.at);
  b+=`<table class="sig"><tr><th>${r.lache?'Celui qui laisse — '+esc(r.rempliPar&&r.rempliPar.nom&&r.rempliPar.nom!==r.conducteurNom?r.rempliPar.nom+' (pour '+r.conducteurNom+')':r.conducteurNom):'Le conducteur — '+esc(r.conducteurNom)+(r.sansResponsable&&!r.contreDe?' (seul)':'')}</th><th>${respTh}</th></tr><tr><td>${r.sigConducteur?`<img src="${esc(r.sigConducteur)}" alt="">`:''}${dhFR(r.sigConducteurAt||r.at)}</td><td>${sig2?`<img src="${esc(sig2)}" alt="">`:''}${sig2?dhFR(sig2At):''}</td></tr></table>`;
  const tx=cs&&charteText(r.charte.type,r.charte.version);if(tx)b+=`<div class="page"><h2>Annexe — ${esc(tx.titre)} (${esc(r.charte.version)})</h2><div class="charte">${mdHTML(tx.texte,{conducteur:r.conducteurNom,date:dFR(cs.at||r.at),lieu:r.lieu||'',$sig:cs.img?`<img src="${esc(cs.img)}" alt="visa" style="height:46px;vertical-align:middle">`:''})}</div></div>`;
  const DL=r.lache?['État des lieux de sortie ','État des lieux de sortie — véhicule laissé','véhicule laissé']:r.contreDe?['Contre-état des lieux ','Contre-état des lieux (mouvement contesté)','mouvement contesté']:r.premier?['Premier état des lieux ','Premier état des lieux','premier état des lieux']:isR?['Remise ','Remise du véhicule','réception']:['Restitution ','Restitution du véhicule','restitution']; /* 20/10 VM : vocabulaire */
  return docHTML({title:DL[0]+r.immat+' — '+(r.conducteurNom||''),h1:DL[1],kicker:'Parc véhicules · '+DL[2],sub:esc(r.immat+' · '+(r.vehLabel||''))+' — '+esc(r.conducteurNom||''),
    meta:[['Date',dhFR(r.at)],['Kilométrage',ed.km!==null&&ed.km!==undefined?nb(ed.km)+' km':'—'],['Conducteur',esc(r.conducteurNom||'')],['Responsable',esc(r.responsableNom||r.by||'')]].concat(isR?[['Statut',m.length?'incomplète : '+esc(m.map(x=>MANQ[x]).join(', ')):'complète',m.length?'hot':'']]:[]),body:b,css:DOC_X,footLeft:esc(r.immat)});}
function printRec(id){const r=regGet('vrec',id);if(!r){toast('Document introuvable');return;}const w=window.open('','_blank');if(!w){toast('Autorise la fenêtre pop-up pour imprimer');return;}w.document.write(recDocHTML(r));w.document.close();}
/* ── charte : lecture + signature par le conducteur (son téléphone, ou celui du responsable), ou relecture de la charte signée ── */
function charteModal(immat,me,ctx,opt){opt=opt||{};const a=api();const v=vehGet(immat);if(!v||!a)return;const {charte:type}=profil(v);const ch=charteCur(type);if(!ch){toast('Charte absente : l\'administrateur importe le pack SCR');return;}
  const key=opt.key||me.id;const name=opt.nom||nomP(me);const self=key===me.id;const sig=charteSigOf(key,type);const acting=self&&a.via&&a.via(); /* administrateur qui « agit comme » : la signature reste personnelle */
  const ro=(ctx.viewing&&ctx.viewing())||!!acting;
  a.openModal(`<h3 style="margin-top:0">${esc(ch.titre)} <span class="hint">· ${esc(ch.version)}</span></h3>
    <div class="dr-body veh-read" id="vc-body"><div class="dr-doc veh-doc">${mdHTML(ch.texte,{conducteur:name,date:dFR(sig?sig.at:new Date()),lieu:sig&&sig.lieu||'',$sig:sig&&sig.img?`<img src="${esc(sig.img)}" alt="visa" style="height:44px;vertical-align:middle">`:'<i>(signature ci-dessous)</i>'})}</div></div>
    ${sig?`<div class="okbox">✓ Signée par ${esc(sig.name||name)} le ${dhFR(sig.at)}${sig.via?' (sur le téléphone de '+esc(sig.via)+')':''}.</div>`:ro?`<div class="warnbox">${acting?'La signature est personnelle : '+esc(name)+' signe lui-même.':'Lecture seule : tu regardes l\'appli comme quelqu\'un d\'autre.'}</div>`:
     `<div id="vc-s1" style="margin-top:8px"><button class="btn block" id="vc-read" data-ok="✓ J'ai lu en entier — je signe" disabled>Déroule jusqu'en bas pour signer</button></div><div id="vc-s2" style="display:none;margin-top:8px"><div class="okbox" style="margin:0 0 6px">${self?'Tu signes':'Signature'} en tant que <b>${esc(name)}</b>.</div>${sigPadHTML('vc-pad')}<div class="actions" style="margin-top:8px"><button class="btn primary block" id="vc-ok">Valider la signature</button><button class="btn block" id="vc-clr">Effacer le trait</button></div></div>`}
    <div class="actions" style="margin-top:8px"><button class="btn block" data-close>Fermer</button></div>`);
  if(sig||ro)return;let readAt=null;const rd=document.getElementById('vc-read');readGate(document.getElementById('vc-body'),rd,()=>{readAt=new Date().toISOString();});
  rd.onclick=()=>{if(rd.disabled)return;document.getElementById('vc-s1').style.display='none';document.getElementById('vc-s2').style.display='';const pd=sigPadInit('vc-pad');document.getElementById('vc-clr').onclick=()=>pd.clear();
    document.getElementById('vc-ok').onclick=()=>{if(!pd.drawn()){toast('La signature (un trait au doigt)');return;}const now=new Date().toISOString();const doc=charteDoc(type,ch.version);const img=pd.png();
      regSet('docsig',doc+'|'+key,{doc,ver:ch.version,key,name,at:now,img,readAt:readAt||now,veh:immat,via:self?'':uname()},{local:!String(key).includes('@')});
      const r=openRec(v);if(r&&(ctx.can('flotte.manage')||me.admin)&&r.conducteurKey===key&&r.charte&&!r.charte.sig&&!r.charte.none&&r.charte.version===ch.version){const c={type,version:ch.version,lueA:readAt||now,sig:img,at:now};const m=manque(Object.assign({},r,{charte:c}));regSet('vrec',r.id,{charte:c,manque:m,complete:!m.length});if(v.remise&&v.remise.id===r.id)vehSet(v.immat,{remise:Object.assign({},v.remise,{complete:!m.length})});} /* sur le téléphone du responsable : la remise est mise à jour */
      a.closeModal();toast('« '+ch.titre+' » signée ✓');ctx.render();};};}
function permisModal(recId,me,ctx){const a=api();const r=regGet('vrec',recId);if(!r||!a)return;
  a.openModal(`<h3 style="margin-top:0">Permis de ${esc(r.conducteurNom)}</h3><p class="eq-s">Remise du ${dFR(r.at)} · ${esc(r.immat)}. On ne garde pas de photo du permis.</p>
    <label class="veh-check" style="cursor:pointer"><input type="checkbox" id="vp-ok" style="width:26px;height:26px"><span><b>Permis B vu et valide</b><small>Date de validité : ligne 4b</small></span></label>
    <label class="f">Fin de validité du permis</label><input class="f" type="date" id="vp-fin"><div class="actions" style="margin-top:8px"><button class="btn primary block" id="vp-save">Enregistrer</button><button class="btn block" data-close>Annuler</button></div>`);
  document.getElementById('vp-save').onclick=()=>{const ok=document.getElementById('vp-ok').checked;const fin=document.getElementById('vp-fin').value;if(!ok){toast('Coche « vu et valide »');return;}if(!fin){toast('La date de fin de validité');return;}if(fin<todayIso()){toast('Fin de validité dépassée : la remise reste incomplète');return;}
    const p={ok:true,fin,vuA:new Date().toISOString(),vuPar:uname()};const m=manque(Object.assign({},r,{permis:p}));regSet('vrec',r.id,{permis:p,manque:m,complete:!m.length});const v=vehGet(r.vehId);if(v&&v.remise&&v.remise.id===r.id)vehSet(v.immat,{remise:Object.assign({},v.remise,{complete:!m.length})});
    a.closeModal();toast('Permis enregistré'+(m.length?' — reste : '+m.map(x=>MANQ[x]).join(', '):' — remise complète ✓'));ctx.render();};}
/* ── fiche véhicule (responsable flotte) : remise en cours, boutons, historique ── */
flotteHook('fiche',(v,canEdit)=>{ensureCss();const C=vcfg();const L=recsOf(v.immat);const r=openRec(v);const m=manque(r);const dr=canEdit?draftFor(v.immat):null;const pend=!!(r&&(r.aValider||r.refus)); /* 19/10 VH : à valider / refusée → état donné par R2 */
  const st=(R2.ficheStatus(v,r)||'')+(r&&!pend?(m.length?`<div class="veh-ko">⚠ Remise du ${dFR(r.at)} à ${esc(r.conducteurNom)} incomplète : ${esc(m.map(x=>MANQ[x]).join(', '))}</div>`:r.contreDe?`<div class="okbox">✓ Pris par <b>${esc(r.conducteurNom)}</b> le ${dFR(r.at)} avec un contre-état des lieux (mouvement contesté).</div>`:`<div class="okbox">✓ Remis à <b>${esc(r.conducteurNom)}</b> le ${dFR(r.at)} — remise complète${r.valide?' (validée par '+esc(r.valide.nom||'')+')':''}.</div>`) /* 20/10 VM : contre-état des lieux */
    :r?'':(v.conducteur?(R2.prisHTML(v)||`<div class="eq-s">Attribué à <b>${esc(v.conducteur)}</b> — pas d'état des lieux enregistré dans l'appli.</div>`):v.laisse?'':'<div class="eq-s">Véhicule libre.</div>')); /* 20/10 VM : pris par signature sur la sortie d'un collègue */
  let bt='';
  if(canEdit){if(!C)bt=`<div class="warnbox" style="width:100%">Configuration véhicule absente : l'administrateur importe le pack SCR (partie « vehicule » : état des lieux, inventaires, chartes).</div>`;
    else if(dr)bt=`<button class="btn primary veh-big" data-act="x" data-v="veh|${dr.lache?'lacheDe':dr.type==='reception'?'recep':'resti'}|${esc(v.immat)}">▶ Reprendre ${dr.lache?'« laisser le véhicule »':dr.type==='reception'?'la remise':'la restitution'} (étape ${(+dr.step||0)+1})</button><button class="btn" data-act="x" data-v="veh|drop|${esc(v.immat)}">Abandonner</button>`; /* 20/10 VM : un brouillon « laisser » reprend en mode laisser */
    else if(r)bt=`<button class="btn primary veh-big" data-act="x" data-v="veh|resti|${esc(v.immat)}">↩ Restitution</button>${m.includes('permis')&&!pend?`<button class="btn" data-act="x" data-v="veh|permisRec|${esc(r.id)}">🪪 Permis vu</button>`:''}${m.includes('charte')&&!pend?`<button class="btn" data-act="x" data-v="veh|charteRec|${esc(r.id)}">✍ Faire signer la charte</button>`:''}`;
    else bt=`${R2.prisOnly(v)?'':`<button class="btn primary veh-big" data-act="x" data-v="veh|recep|${esc(v.immat)}">🤝 ${v.conducteur?'Régulariser la remise':'Remettre à…'}</button>`}${v.conducteur?`<button class="btn veh-big" data-act="x" data-v="veh|resti|${esc(v.immat)}">↩ Restitution</button>`:''}`; /* 20/10 VM : pris par signature → rien à régulariser */
    bt=R2.ficheButtons(v,canEdit,r,dr)+bt;} /* 19/10 VH : valider, changement de conducteur, laissé sur place */
  const hist=L.map(x=>{const mm=manque(x);return {at:x.at,h:`<div class="eq-row"><span class="eq-grow"><span class="eq-t">${dFR(x.at)} · ${esc(R2.histTitle(x)||((x.type==='reception'?'Remise':'Restitution')+' · '+(x.conducteurNom||'')))}</span><span class="eq-s">${R2.histLine(x)||((x.type==='reception'?(mm.length?`<span style="color:#9b2c22;font-weight:700">incomplète : ${esc(mm.map(y=>MANQ[y]).join(', '))}</span>`:'complète'):((x.diff&&x.diff.km!==null&&x.diff.km!==undefined?nb(x.diff.km)+' km parcourus':'')+(x.diff&&x.diff.n?' · '+x.diff.n+' différence'+(x.diff.n>1?'s':''):' · aucune différence')))+' · par '+esc(x.by||''))}</span></span><button class="btn sm" data-act="x" data-v="veh|print|${esc(x.id)}" title="Document imprimable (PDF)">🖨</button></div>`};}).concat(R2.histSwitch(v)).sort((a,b)=>String(b.at||'').localeCompare(String(a.at||''))).map(x=>x.h).join(''); /* 19/10 VH : chaque étape (laissé, pris, changement de conducteur, validé) en ordre */
  const cartes=Object.entries(v.cartes||{}).filter(([,n])=>n);const nH=L.length+(v.switchHist||[]).length+(v.switch?1:0);
  return `<div class="card veh-card"><h3>📋 États des lieux et mouvements <span class="hint">· remise, laissé, pris, changement de conducteur, documents signés</span></h3>${st}<div class="eq-acts veh-acts" style="margin-top:8px">${bt}</div>
    ${cartes.length?`<div class="hint">Cartes du véhicule : ${cartes.map(([id,n])=>esc(dispoLabel(id))+' n° '+esc(n)).join(' · ')}</div>`:''}
    ${R2.conducteursHist(v)}${nH?`<div class="veh-hh"><b>Historique</b><span>${nH}</span></div>${hist}`:''}
    ${canEdit?`<div style="margin-top:6px;text-align:right"><button class="btn sm" data-act="x" data-v="veh|cfg|">⚙ Pack véhicules</button></div>`:''}</div>`;});
/* ── Moi → Mon véhicule (conducteur) : sa dernière remise, la charte signée ou à signer ── */
flotteHook('mine',(v,acc)=>{ensureCss();const key=docKey(acc);const r=openRec(v);const m=manque(r);const {charte:type}=profil(v);const ch=charteCur(type);const sig=charteSigOf(key,type);let h='';const pend=!!(r&&(r.aValider||r.refus)); /* 19/10 VH : à valider / refusée → R2 */
  if(r&&!pend)h+=m.length?`<div class="veh-ko">⚠ Remise du ${dFR(r.at)} incomplète : ${esc(m.map(x=>MANQ[x]).join(', '))}${m.includes('permis')?' — montre ton permis au responsable flotte':''}.</div>`:`<div class="okbox">✓ ${r.contreDe?'Pris':'Remis'} le ${dFR(r.at)}${r.contreDe?' avec ton contre-état des lieux':r.valide?' · validé par '+esc(r.valide.nom||''):r.by&&r.by!==r.conducteurNom?' par '+esc(r.by):''} · ${nb(r.edl&&r.edl.km)} km.</div>`; /* 20/10 VM : contre-état des lieux */
  const bts=[];if(r)bts.push(`<button class="btn" data-act="x" data-v="veh|print|${esc(r.id)}">📄 Ma remise (PDF)</button>`);
  if(ch)bts.push(sig?`<button class="btn" data-act="x" data-v="veh|charteVoir|${esc(v.immat)}">📘 Charte signée (${esc(ch.version)}, ${dFR(sig.at)})</button>`:`<button class="btn primary" data-act="x" data-v="veh|charte|${esc(v.immat)}">✍ Lire et signer la charte (${esc(ch.version)})</button>`);
  const ent=((vcfg()||{}).entretien)||[];
  return h+R2.mine2(v,acc)+(bts.length?`<div class="eq-acts" style="margin-top:6px">${bts.join('')}</div>`:'')+(ent.length?`<details class="veh-ent"><summary>Entretien au quotidien</summary><ul class="veh-sum">${ent.map(x=>`<li>${esc(x)}</li>`).join('')}</ul></details>`:'');});
/* ── réglages : le pack importé (résumé), import par l'administrateur ── */
function cfgHTML(me){ensureCss();const C=vcfg();const I=C&&C.inventaire;
  return `<h2 class="vt">Pack véhicules <span class="hint">· réception et restitution</span></h2><div class="card">
    ${C?`<div class="okbox">Pack importé le ${dhFR(C.at)}${C.by?' par '+esc(C.by):''}${C.source?' · référence '+esc(C.source):''}.</div><ul class="veh-sum">
      ${Object.entries(C.chartes||{}).map(([k,c])=>`<li>Charte ${esc(k)} : <b>${esc(c.version)}</b> — ${esc(c.titre)}</li>`).join('')||'<li class="ko">Aucune charte</li>'}
      <li>Inventaires : ${Object.entries(I.listes||{}).map(([k,L])=>esc((I.titres||{})[k]||k)+' ('+L.length+')').join(' · ')} · communs : ${(I.commun||[]).length}</li>
      <li>État des lieux : ${C.edl.releves.length} relevés, ${C.edl.controles.length} points d'état, ${C.edl.docs.length} documents à bord, ${C.edl.photos.filter(p=>p.obl).length} photos imposées</li>
      <li>Dispositifs : ${C.dispositifs.liste.map(d=>esc(d.label)).join(' · ')||'aucun'}</li></ul>
      <table class="veh-tt"><tr><th>Type de véhicule</th><th>Charte</th><th>Inventaire</th></tr>${Object.entries(C.types||{}).map(([t,x])=>`<tr><td>${esc(t)}</td><td>${esc(x.charte)}</td><td>${x.inventaire?esc((I.titres||{})[x.inventaire]||x.inventaire)+' ('+(((I.listes||{})[x.inventaire])||[]).length+')':'<span class="hint">communs seulement</span>'}</td></tr>`).join('')}</table>`
      :'<div class="warnbox">Aucun pack importé : la remise de véhicule attend l\'état des lieux, les inventaires et les chartes de SCR.</div>'}
    ${me.admin?`<label class="btn primary block" style="margin-top:10px">📥 Importer le pack (JSON)<input type="file" accept=".json,application/json" data-xin="veh|packfile" style="display:none"></label><div class="hint">Le pack SCR complet ({ vehicule: … }) ou sa seule partie « vehicule » ({ reception, entretien, textes }). Une charte dont le texte change passe à la version suivante : chaque conducteur concerné la re-signe.</div>`:'<div class="hint" style="margin-top:8px">Import réservé à l\'administrateur.</div>'}</div>`;}
/* ── style (injecté une fois) : gros boutons, segments Ok / Non ok, photos en tuiles — téléphone et gants ── */
const CSS=`.veh-wiz{max-width:640px;margin:0 auto}.veh-kick{font-size:12px;color:var(--muted);font-weight:700;text-transform:uppercase;letter-spacing:.04em;overflow-wrap:anywhere}.veh-h{margin:2px 0 6px!important}
.veh-bar{height:6px;border-radius:99px;background:var(--line);overflow:hidden;margin:0 0 10px}.veh-bar i{display:block;height:100%;background:#eb6834;border-radius:99px}
.veh-big{min-height:52px!important;font-size:16px!important;font-weight:700;white-space:normal!important;line-height:1.2}
.veh-nav{position:sticky;bottom:0;display:flex;gap:8px;padding:10px 0 4px;background:linear-gradient(rgba(249,249,247,0),var(--page) 30%);z-index:2;margin-top:12px}.veh-nav .btn{flex:1;min-width:0}
.veh-sec{background:var(--surface);border:1px solid var(--line);border-radius:14px;padding:10px 12px;margin:0 0 10px;min-width:0}
.veh-sec>h3,.veh-sec>summary{margin:0 0 6px;font-size:15px;display:flex;justify-content:space-between;align-items:center;gap:8px;flex-wrap:wrap}.veh-sec>summary{cursor:pointer;min-height:40px}
.veh-rest{font-size:12px;font-weight:700;color:#7a5200;background:#fff3d6;border-radius:99px;padding:2px 8px;white-space:nowrap}.veh-rest.done{color:#15673a;background:#e6f5ec}
.veh-pt{padding:8px 0;border-top:1px solid var(--line)}.veh-sec>h3+.veh-pt,.veh-sec>.hint+.veh-pt{border-top:0}
.veh-lab{font-size:14px!important;font-weight:600;margin:0 0 6px;color:var(--ink)}
.veh-seg{display:flex;gap:6px;flex-wrap:wrap}.veh-seg button{flex:1 1 0;min-width:52px;min-height:48px;display:flex;align-items:center;justify-content:center;text-align:center;border:1.5px solid var(--line);background:#fff;border-radius:12px;font:inherit;font-size:15px;font-weight:700;color:var(--ink2);cursor:pointer;padding:0 4px}
.veh-seg button.on{background:var(--ink);border-color:var(--ink);color:#fff}.veh-seg button.ok.on{background:#15673a;border-color:#15673a}.veh-seg button.ko.on{background:#9b2c22;border-color:#9b2c22}
.veh-check{display:flex;gap:12px;align-items:center;width:100%;min-height:60px;border:1.5px solid var(--line);background:#fff;border-radius:14px;padding:10px 12px;font:inherit;text-align:left;cursor:pointer;color:var(--ink);margin:6px 0}
.veh-check .bx{flex:none;width:32px;height:32px;border-radius:9px;border:2px solid #b8b4a8;display:grid;place-items:center;font-weight:900;font-size:18px}.veh-check.on{border-color:#15673a;background:#eef8f1}.veh-check.on .bx{background:#15673a;border-color:#15673a;color:#fff}
.veh-check b{display:block;font-size:15px}.veh-check small{display:block;color:var(--ink2);font-size:12.5px}
.veh-q{margin:8px 0!important}.veh-pick{display:flex;flex-direction:column;align-items:flex-start;width:100%;min-height:56px;border:1.5px solid var(--line);background:#fff;border-radius:12px;padding:8px 12px;margin:0 0 6px;font:inherit;text-align:left;cursor:pointer;color:var(--ink)}
.veh-pick.on{border-color:#15673a;background:#eef8f1}.veh-pick b{font-size:15px;overflow-wrap:anywhere}.veh-pick small{color:var(--ink2);font-size:12.5px}
.veh-phs{display:grid;grid-template-columns:1fr 1fr;gap:8px}.veh-ph{position:relative;display:flex;flex-direction:column;align-items:center;justify-content:center;gap:4px;min-height:112px;border:2px dashed #b8b4a8;border-radius:14px;background:#fff;cursor:pointer;overflow:hidden;text-align:center;padding:6px;min-width:0}
.veh-ph .ic{font-size:30px}.veh-ph b{font-size:13px}.veh-ph small{font-size:11px;color:var(--muted)}.veh-ph.ok{border-style:solid;border-color:#15673a}.veh-ph.req:not(.ok){border-color:#e0a100}.veh-ph img{width:100%;height:84px;object-fit:cover;border-radius:9px}
.veh-imps{list-style:none;margin:4px 0 8px;padding:0}.veh-imps li{display:flex;align-items:center;gap:8px;padding:6px 0;border-top:1px solid var(--line);font-size:13.5px}.veh-imps li span{flex:1;min-width:0;overflow-wrap:anywhere}.veh-imps img{width:56px;height:42px;object-fit:cover;border-radius:6px;flex:none}.veh-imps.old{color:var(--ink2)}
.veh-impf{display:flex;flex-direction:column;gap:6px;margin-top:6px}.veh-impf .f{margin:0!important}.veh-row{display:flex;gap:8px}.veh-row>*{flex:1;min-height:48px}
.veh-inv{display:flex;align-items:center;gap:12px;width:100%;min-height:54px;border:0;border-top:1px solid var(--line);background:none;padding:6px 2px;font:inherit;text-align:left;cursor:pointer;color:var(--ink)}
.veh-inv .ck{flex:none;width:36px;height:36px;border-radius:10px;background:#15673a;color:#fff;display:grid;place-items:center;font-weight:900;font-size:17px}.veh-inv .ck::after{content:"✓"}.veh-inv.miss .ck{background:#9b2c22}.veh-inv.miss .ck::after{content:"✕"}
.veh-inv .tx{flex:1;min-width:0}.veh-inv b{display:block;font-size:14px;font-weight:600;overflow-wrap:anywhere}.veh-inv small{color:var(--ink2);font-size:12px}.veh-inv.miss b{color:#9b2c22}
.veh-ko{background:#fdeae7;color:#9b2c22;border:1px solid #f0b6ad;border-radius:8px;padding:8px 10px;font-size:13px;margin-top:8px;font-weight:600}
.veh-read{max-height:46vh}.veh-doc h2.veh-t1{font-size:16px;color:var(--ink)}.veh-doc mark{background:#fff3c4;padding:0 2px;border-radius:3px}.veh-blank{color:var(--muted)}
.veh-later{width:100%;margin-top:10px;color:#7a5200!important;white-space:normal!important}
.veh-sum{margin:4px 0;padding-left:18px;font-size:13.5px}.veh-sum li{margin:3px 0;overflow-wrap:anywhere}.veh-sum .ko,b.ko{color:#9b2c22}
.veh-kms{display:flex;align-items:baseline;gap:8px;margin:2px 0 6px}.veh-kms b{font-size:24px}.veh-kms small{color:var(--ink2)}.veh-dl li{list-style:none;margin-left:-18px;padding:6px 8px;border-radius:8px;background:#fdeae7;margin-bottom:4px}
.veh-card .veh-acts{flex-wrap:wrap}.veh-hh{display:flex;justify-content:space-between;align-items:baseline;margin:12px 0 2px}.veh-hh span{font-size:12px;color:var(--muted)}
.veh-tt{width:100%;font-size:12.5px;border-collapse:collapse;margin-top:8px}.veh-tt td,.veh-tt th{padding:4px 6px;border-bottom:1px solid var(--line);text-align:left}
.veh-ent{margin-top:6px;font-size:13px}.veh-ent summary{cursor:pointer;color:var(--ink2);min-height:32px}`;
export function ensureCss(){if(typeof document==='undefined'||document.getElementById(ID+'-css'))return;const s=document.createElement('style');s.id=ID+'-css';s.textContent=CSS;document.head.appendChild(s);}
/* ── le module branché ── */
export default {id:ID,kinds:['vcfg','vrec'],hub:'parc',
  pack:{key:'vehicule',label:'Véhicules : réception et restitution (état des lieux, inventaires, cartes, chartes)',import:packImport}, /* pack SCR : partie « vehicule » = {reception, entretien, textes} */
  gate(me,ctx){cap(ctx);ensureLoad(ctx);return null;}, /* rien de bloquant : sert à garder l'API et à relire le serveur après la connexion */
  moiSubs(me,ctx){cap(ctx);ensureLoad(ctx);return R2.moiSubs(me,ctx);}, /* 19/10 VH : « Véhicule laissé » (à prendre) ; l'écran ouvert du conducteur (remise seul, validation…) */
  view(sub,me,ctx){cap(ctx);return R2.view(sub,me,ctx);},
  xview(k,me,ctx){cap(ctx);ensureLoad(ctx);if(k==='cfg')return cfgHTML(me);const h=R2.xview(k,me,ctx);if(h!=null)return h; /* 19/10 VH : validation, changement de conducteur */if(!(ctx.can('flotte.manage')||me.admin))return `<div class="card"><div class="eq-s">Réservé au responsable flotte (droit « Flotte »).</div></div>`;return wizHTML(me,ctx);},
  // « À faire » en haut de l'accueil du conducteur : charte à signer (remise incomplète, ou nouvelle version), permis à montrer ; 19/10 VH (R2) : remise à valider / refusée, véhicule laissé, changement de conducteur, premier état des lieux
  tasks(me,ctx){cap(ctx);ensureLoad(ctx);const L=[];if(!me)return L;const key=me.id;const seen=new Set();
    vehAll().filter(v=>(v.conducteurKey&&v.conducteurKey===key)||(me._acc&&vehDe(me._acc).some(x=>x.immat===v.immat))).forEach(v=>{const r=openRec(v);const {charte:type}=profil(v);const ch=charteCur(type);const pend=!!(r&&(r.aValider||r.refus));
      if(ch&&!charteSigOf(key,type)&&!seen.has(type)){seen.add(type);const inc=r&&!pend&&manque(r).includes('charte');L.push({act:true,sev:'bad',t:'À lire et signer : charte du véhicule '+v.immat,s:(inc?'Remise du '+dFR(r.at)+' incomplète':'« '+ch.titre+' » '+ch.version)+' · obligatoire, une fois par version',when:inc?dFR(r.at):'',go:()=>charteModal(v.immat,me,ctx)});}
      if(r&&!pend&&!r.premier&&!r.contreDe&&!(r.permis&&r.permis.ok))L.push({act:true,sev:'bad',t:'Remise du véhicule '+v.immat+' incomplète : permis à montrer',s:'Montre ton permis de conduire au responsable flotte',when:dFR(r.at),go:()=>ctx.sub('moi')});});
    try{R2.tasks(me,ctx).forEach(t=>L.push(t));}catch(e){console.warn(e);}
    return L;},
  act(v,el,me,ctx){cap(ctx);const i=String(v).indexOf('|');const a=i<0?String(v):String(v).slice(0,i);const arg=i<0?'':String(v).slice(i+1);
    if(a==='print'){printRec(arg);return;}if(a==='charteVoir'){charteModal(arg,me,ctx);return;}if(a==='cfg'){ctx.go('x:'+ID+':cfg');return;}
    if(ctx.viewing()&&/^(mv|quiprint|quimoi|gomouv|voir|rec|arb|swy|home)$/.test(a)){R2.act(a,arg,el,me,ctx);return;} /* 20/10 VM : écrans et filtres en lecture seule */
    if(ctx.viewing()){ctx.toast('👁 Lecture seule : tu regardes l\'appli comme quelqu\'un d\'autre');return;}
    if(a==='charte'){charteModal(arg,me,ctx);return;}
    if(R2.act(a,arg,el,me,ctx))return; /* 19/10 VH : écrans et modes en plus (droits vérifiés là-bas) */
    const mgr=ctx.can('flotte.manage')||me.admin;if(!mgr&&!(W&&W.self&&W.cond&&W.cond.key===me.id)){ctx.toast('Réservé au responsable flotte (droit « Flotte »)');return;} /* 19/10 VH : le conducteur avance dans SA remise */
    if(mgr)switch(a){
      case 'recep':start('reception',arg,me,ctx);return;
      case 'resti':start('restitution',arg,me,ctx);return;
      case 'drop':{if(!confirm('Abandonner la saisie en cours ? Rien ne sera enregistré.'))return;W=null;try{localStorage.removeItem(DKEY);}catch(e){}ctx.render();return;}
      case 'permisRec':permisModal(arg,me,ctx);return;
      case 'charteRec':{const r=regGet('vrec',arg);if(r)charteModal(r.vehId,me,ctx,{key:r.conducteurKey,nom:r.conducteurNom});return;}}
    if(!W)return;
    switch(a){
      case 'next':next(me,ctx);return;
      case 'prev':if(W.step>0){W.step--;saveDraft();ctx.render();scrollTop();}return;
      case 'cancel':{if(!confirm('Abandonner cette '+(W.lache?'déclaration':W.type==='restitution'?'restitution':'remise')+' ? Rien ne sera enregistré.'))return;const moi=W.host==='moi';W=null;try{localStorage.removeItem(DKEY);}catch(e){}if(moi)R2.home(me,ctx);else back();return;}
      case 'cond':{const p=(ctx.people||[]).find(x=>x.id===arg);if(!p)return;W.cond={key:p.id,nom:nomP(p),poste:POSTES[p.poste]||''};W.charte={};W.sigC=W.sigR=null;saveDraft();ctx.render();return;}
      case 'permis':W.permis.ok=!W.permis.ok;saveDraft();ctx.render();return;
      case 'consignes':W.consignes=!W.consignes;saveDraft();ctx.render();return;
      case 'set':{const [g,id,...rest]=arg.split('~');const val=rest.join('~');
        if(g==='carte'){const c=W.cartes[id]=W.cartes[id]||{numero:''};c.statut={'Remise':'remise','Pas de carte':'aucune','Rendue':'rendue','Perdue':'perdue','À bord':'abord'}[val]||val;}
        else{const o=grpObj(g);if(!W.edl[g])return;o[id]=val;}
        if(el&&el.parentElement)el.parentElement.querySelectorAll('button').forEach(b=>b.classList.toggle('on',b===el));updRest();saveDraftSoon();return;}
      case 'allok':{const [g,ids]=arg.split('~');const o=grpObj(g);const L=grpList(g);String(ids||'').split(',').forEach(id=>{const x=L.find(y=>y.id===id);const okc=x&&x.choix.find(isOk);if(okc)o[id]=okc;});saveDraft();ctx.render();return;}
      case 'inv':{if(W.inv.miss[arg])delete W.inv.miss[arg];else W.inv.miss[arg]=1;if(el)el.classList.toggle('miss',!!W.inv.miss[arg]);const vv=vehGet(W.vehId);const L=invItems(vv);const n=L.filter(x=>W.inv.miss[x.id]).length;const c=document.getElementById('veh-invn');if(c){c.textContent=(L.length-n)+' présent'+(L.length-n>1?'s':'')+' · '+n+' écart'+(n>1?'s':'');c.classList.toggle('done',!n);}const nb2=document.getElementById('veh-next');if(nb2)nb2.textContent=n?'Valider avec '+n+' écart'+(n>1?'s':'')+' ›':'✓ Tout est conforme ›';saveDraftSoon();return;}
      case 'invok':W.inv.miss={};saveDraft();ctx.render();return;
      case 'lu':W.charte.lueA=new Date().toISOString();W.charte.later=false;saveDraft();ctx.render();return;
      case 'later':W.charte={later:true};saveDraft();ctx.render();return;
      case 'charteNow':W.charte={};saveDraft();ctx.render();scrollTop();return;
      case 'clr':{const p=PADS[PAD_ID[arg]];if(p)p.clear();if(arg==='ch')W.charte.sig=null;else if(arg==='c')W.sigC=null;else if(arg==='r')W.sigR=null;saveDraft();return;}
      case 'impadd':{const note=String(W.impNote||'').trim();if(!note&&!W.impPhoto){ctx.toast('Décris l\'impact (ou prends-le en photo)');return;}const Z=(vcfg().edl.zones)||[];W.edl.impacts.push({id:'I'+Date.now().toString(36),zone:W.impZone||(Z[0]||{}).id||'',note,photo:W.impPhoto||null});W.impNote='';W.impPhoto=null;saveDraft();ctx.render();return;}
      case 'imprm':W.edl.impacts=W.edl.impacts.filter(x=>x.id!==arg);saveDraft();ctx.render();return;}},
  input(champ,el,me,ctx,type){cap(ctx);const i=String(champ).indexOf('~');const f=i<0?champ:champ.slice(0,i);const arg=i<0?'':champ.slice(i+1);
    if(f==='packfile'){if(type!=='change')return;const file=el.files&&el.files[0];el.value='';if(!file)return;if(!me.admin||ctx.viewing()){ctx.toast('Import réservé à l\'administrateur');return;}
      file.text().then(t=>packImport(JSON.parse(t),ctx)).then(s=>{ctx.toast('✓ '+s);ctx.render();}).catch(e=>{console.warn(e);ctx.toast('Import impossible : '+(e&&e.message||e));});return;}
    if(f==='mv'){R2.input(f,arg,el,me,ctx,type);return;} /* 20/10 VM : filtres des mouvements (lecture seule comprise) */
    if(ctx.viewing())return;if(R2.input(f,arg,el,me,ctx,type))return; /* 19/10 VH : champs des écrans en plus */
    if(!W)return;const val=el.value;
    switch(f){
      case 'q':{W.q=val;const host=document.getElementById('veh-list');if(host)host.innerHTML=pickList((ctx.people||[]).filter(p=>p&&p.id&&(p.active!==false||p.invite)).sort((a,b)=>nomP(a).localeCompare(nomP(b))),String(val).toLowerCase());return;}
      case 'km':{W.edl.km=val===''?'':+val;const ref=refRec();const d=document.getElementById('veh-kmd');if(d&&ref&&ref.edl)d.textContent=val===''?'—':nb(+val-ref.edl.km)+' km';break;}
      case 'num':(W.edl.num=W.edl.num||{})[arg]=val;break;
      case 'equip':W.edl.equip[arg]=val;break;
      case 'permisFin':W.permis.fin=val;break;
      case 'remarques':W.edl.remarques=val;break;
      case 'impZone':W.impZone=val;break;
      case 'impNote':W.impNote=val;break;
      case 'invObs':W.inv.obs=val;break;
      case 'carteNum':{const c=W.cartes[arg]=W.cartes[arg]||{statut:''};c.numero=String(val).trim();if(c.numero&&!c.statut)c.statut='remise';break;}
      case 'cles':W.cles=val;break;
      case 'lieu':W.lieu=val;break;
      case 'photo':{if(type!=='change')return;const file=el.files&&el.files[0];if(!file)return;const slot=arg;const lab=el.closest('label');if(lab)lab.classList.add('veh-busy');
        addPhoto(file,slot).then(u=>{if(!W)return;if(!u){ctx.toast('Photo illisible');return;}if(slot==='imp')W.impPhoto=u;else W.edl.photos[slot]=u;saveDraft();ctx.render();R2.photoTaken(file,slot).catch(()=>{});});return;} /* 19/10 VH : la photo « avant » réduite devient la vignette du véhicule */
      default:return;}
    saveDraftSoon();}};
// photo : compressée ; envoyée au stockage si possible (URL), sinon gardée en petite image dans l'enregistrement (hors connexion)
async function addPhoto(file,slot){const a=api();if(!a)return null;let d=null;try{d=a.compressPhoto?await a.compressPhoto(file,1280,.72):null;}catch(e){d=null;}if(!d)return null;
  let u=null;try{u=a.uploadPhoto?await a.uploadPhoto('vehicule-'+String(W&&W.vehId||'').replace(/[^A-Za-z0-9]/g,'')+'-'+(W?W.rid:'')+'-'+slot,d):null;}catch(e){u=null;}
  if(u&&typeof u==='string'&&/^https?:/.test(u))return u;
  try{const s=await a.compressPhoto(file,640,.55);if(s)return s;}catch(e){}return d;}
