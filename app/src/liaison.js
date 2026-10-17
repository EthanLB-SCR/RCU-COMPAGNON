// liaison.js — LOT L, retours d'Ethan du 14/10 au soir : liaisons étude ↔ affaire, ouverture des études, chargement des tracés liés, retour à l'affaire, marché figé au gain.
// Ethan : « j'ai des chantiers qui arrivent dans mes liaisons qui ne devraient pas être là […] dès que j'actualise, des chantiers reviennent dans Tracé et chantiers ; les quantités du
// tracé se mettent à 0 tant que je ne l'ouvre pas dans Tracé, alors qu'il ne devrait pas pouvoir s'ouvrir dans Tracé […] le retour à l'affaire est hésitant : il renvoie à Tracé, met du
// temps à charger puis te renvoie dans l'affaire ».
// D'où venaient les chantiers parasites (rejoué) :
//   1) linkEtudeHandoffs re-traitait À CHAQUE chargement toutes les copies de l'appareil marquées fiche.etude.aff (ETUDE_LINKED n'était qu'en mémoire) : un ✕ ne retirait que
//      l'id de a.sites, le repère restait sur le chantier → re-rattaché à l'actualisation suivante, et poussé au serveur (donc aussi sur les autres appareils) ;
//   2) etudeSync posait fiche.etude.aff sur TOUT site de a.sites d'une affaire pas gagnée — y compris un vrai chantier lié à la main (menu « lier un chantier existant ») ou par un
//      ancien lien « index.html?site=…&aff=… » (traceur d'avant le 14/10) → ce chantier devenait une « étude » (caché de Chantiers) et le point 1 le re-rattachait sans fin ;
//      toute copie reçue du serveur (même rouverte sur un autre appareil, mise en cache comme remise du traceur) portait le repère ;
//   3) l'ouverture d'un chantier écrit sa copie dans trace:handoff:<id> (comme une remise du traceur) : elle repasse par le point 1 à chaque démarrage.
// Règles appliquées ici :
//   · une remise du traceur n'est rattachée qu'UNE fois : registre local trace:etudeRemises (id|savedAt) + repère persistant fiche.etude.linkedAt / linkedSave ;
//   · seuls les tracés ENREGISTRÉS DEPUIS l'affaire dans le traceur se rattachent seuls : site.traceur.ctx==='etude' (C5) ou repère posé par le traceur au 1er enregistrement
//     (fiche.etude.at ≈ date de création de l'id trc_…) ; jamais un chantier réel (preuve : ctx 'chantier', import DXF, soudures déclarées, chef / conducteur), jamais une démo ;
//   · ✕ = a.sites sans le site + a.sitesOff[id] = date (registre partagé → tient sur tous les appareils) + fiche.etude.delie (le repère ne fait plus d'étude) ;
//   · etudeSync ne crée plus de repère sur un site qui n'en a pas (sauf tracé ctx 'etude') : un chantier lié à la main reste un chantier (« Ouvrir » → écran Tracé).
import {regAll,regGet,regSet,regLoad} from './reg.js';
import {marcheSnapshot} from './marche.js';
import {mutuVerse,mutuGuardOpen,mutuRowHTML} from './mutu.js'; // 16/10 soir (lot MU) : étude versée dans un chantier en cours (cachée de Chantiers, jamais rattachée à nouveau), ligne d'un chantier partagé
/* intégration 14/10 soir : le bac à sable vient de l'appli (A.isSandboxSite) — importer sandbox.js tirait sites.json dans les tests Node (memoire2_test) */
let A=null;
export function initLiaison(api){A=api;
  document.addEventListener('visibilitychange',()=>{if(document.visibilityState==='visible')setTimeout(()=>{try{lzLink('premier plan');}catch(e){console.warn(e);}},900);});} /* retour sur l'onglet de l'appli après un enregistrement du traceur dans un autre onglet */
const DEMO=new Set(['bain','saintlo']);const WON=['a_debuter','en_cours','termine'];
const TABS=['fiche','dossier','lecture','quantites','chiffrage','memoire','dpgf','offre','fact','sites'];
const LEG_MS=15*60e3; /* repère « étude » posé par le traceur au 1er enregistrement : à moins de 15 min de la création de l'id trc_<date base 36> */
const esc=s=>String(s??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const nb=(x,d)=>(+x||0).toLocaleString('fr-FR',{maximumFractionDigits:d||0,minimumFractionDigits:d||0});
const now=()=>new Date().toISOString();
const LZ={t0:(typeof performance!=='undefined'?performance.now():0),ret:null,log:[]}; /* mesures (tests) : enchaînement des écrans du retour à l'affaire */
const lg=(what,o)=>{try{LZ.log.push(Object.assign({t:Math.round(performance.now()),what},o||{}));if(LZ.log.length>80)LZ.log.shift();}catch(e){}};
/* ── CSS du lot (page entière : appli) ── */
(function css(){try{if(document.getElementById('css-lot-l'))return;const s=document.createElement('style');s.id='css-lot-l';s.textContent=`
#lzAffWait{position:absolute;inset:0;z-index:45;background:var(--page,#f9f9f7);display:flex;flex-direction:column;align-items:center;justify-content:center;gap:12px;padding:16px;text-align:center;color:var(--ink2,#52514e);font-size:13.5px}
#lzAffWait .lz-wt{font-size:17px;color:var(--ink,#15140f);max-width:100%;overflow-wrap:anywhere}#lzAffWait .lz-ws{min-height:18px}#lzAffWait .btn{min-height:44px;padding:8px 18px;margin-top:4px}
.lz-row{flex-wrap:wrap;row-gap:6px;cursor:default}.lz-row .tx{min-width:150px}.lz-row .tx small{overflow-wrap:anywhere}.lz-row .eq-acts{margin:0 0 0 auto;flex:0 1 auto;justify-content:flex-end;gap:6px}
.lz-row .eq-acts .btn{flex:0 0 auto;min-height:36px}.lz-tag{display:inline-block;font-size:11px;font-weight:700;border-radius:6px;padding:1px 6px;margin-right:4px;vertical-align:1px}
.lz-tag.et{background:#e8f0fb;color:#1c3d6b}.lz-tag.ch{background:#e6f5ec;color:#15673a}.lz-q b{display:inline;font-size:inherit}.lz-load{color:#7a5200}
.lz-loading{display:flex;gap:12px;align-items:center}.lz-loading .spin{flex:none}`;document.head.appendChild(s);}catch(e){}})();
/* ═════════ 1 · NATURE D'UN TRACÉ : étude (dessinée depuis une affaire) ou chantier réel ═════════ */
const metaOf=id=>((A&&A.state.serverMetas)||[]).find(x=>x.id===id)||null;
const siteOf=id=>(A&&A.SITES[id])||null;
const isSandboxSite=id=>{try{return !!(A&&A.isSandboxSite&&A.isSandboxSite(id));}catch(e){return false;}};
export const isDemo=id=>!id||id==='__vide'||DEMO.has(id)||isSandboxSite(id)||!!(siteOf(id)&&siteOf(id).demo);
export function etudeMark(id){const n=siteOf(id);const f=n&&n.fiche;if(f&&Object.prototype.hasOwnProperty.call(f,'etude'))return f.etude||null;const m=metaOf(id);return (m&&m.etude)||null;} /* la copie de l'appareil d'abord (un repère retiré ici n'est pas repris d'une méta plus ancienne) */
/* preuve qu'un site est un VRAI chantier (jamais une étude) */
function realChantier(id){if(!A)return false;if(isDemo(id))return true;const n=siteOf(id);const m=metaOf(id);const tr=n&&n.traceur;
  if(tr&&tr.ctx==='chantier')return true; /* C5 : enregistré depuis le traceur d'un chantier */
  if(n&&n.source&&n.source!=='traceur')return true; /* import DXF / PDF : une étude se dessine toujours dans le traceur */
  const f=(n&&n.fiche)||m||{};if(f.chef||f.conducteur)return true; /* chantier staffé (planning) */
  const st=A.state.homeStats&&A.state.homeStats[id];if(st&&+st.total>0)return true; /* soudures déclarées au serveur */
  if(n&&Array.isArray(n.extraWelds)&&n.extraWelds.length)return true;return false;}
/* 'demo' | 'chantier' | 'etude' | null (inconnu : ni copie ni méta sur l'appareil) */
export function lzKind(id){if(!A)return null;if(isDemo(id))return 'demo';if(realChantier(id))return 'chantier';const n=siteOf(id);const tr=n&&n.traceur;if(tr&&tr.ctx==='etude')return 'etude';
  const e=etudeMark(id);if(e&&e.aff&&!e.delie)return 'etude';return (n||metaOf(id))?'chantier':null;}
/* repère « étude » posé par le traceur lui-même au 1er enregistrement depuis l'affaire (avant C5) */
function traceurMark(id,e){const m=/^trc_([0-9a-z]+)$/.exec(String(id||''));if(!m||!e||!e.at)return false;const t0=parseInt(m[1],36),t1=Date.parse(e.at);return isFinite(t0)&&isFinite(t1)&&Math.abs(t1-t0)<LEG_MS;}
/* remise du traceur faite DEPUIS une affaire (seules celles-là se rattachent toutes seules) */
function etudeRemise(n,e){if(!n||realChantier(n.id))return false;const tr=n.traceur;if(!tr)return false;if(tr.ctx==='etude')return true;if(tr.ctx)return false;return traceurMark(n.id,e);}
/* affaire d'une étude (pour l'ouvrir dans SON traceur) : affaire liée pas gagnée, sinon le repère */
export function etudeAffOf(id){let L=[];try{L=regAll('affaire').filter(a=>a&&!a.deleted&&Array.isArray(a.sites)&&a.sites.includes(id));}catch(e){}const p=L.find(a=>!WON.includes(a.etat))||L[0];if(p)return p.num||p.id;const e=etudeMark(id);return e&&e.aff&&!e.delie?e.aff:null;}
/* étude ou pas (etudeOfSite de l'appli) — null tant que le module n'est pas branché (l'appli garde alors sa règle d'avant) :
   liée à une affaire → étude tant qu'aucune affaire liée n'est gagnée, sauf chantier réel (preuves) ; pas liée → seulement une VRAIE remise d'étude (contexte étude, repère du traceur)
   pas encore rattachée : ni gagnée, ni déliée (ici ou par un ✕ ailleurs : a.sitesOff) — un vieux repère posé par etudeSync ne cache plus un chantier de Chantiers */
export function lzEtudeOf(id){if(!A)return null;if(isDemo(id))return false;if(mutuVerse(id))return true; /* lot MU : étude versée dans un chantier en cours → reste une étude (hors Chantiers) */const k=lzKind(id);let L=[];try{L=regAll('affaire').filter(a=>a&&!a.deleted&&Array.isArray(a.sites)&&a.sites.includes(id));}catch(e){L=[];}
  if(L.length)return !L.some(a=>WON.includes(a.etat))&&k!=='chantier';
  const e=etudeMark(id);if(!(e&&e.aff&&!e.gagne&&!e.delie)||k==='chantier')return false;const a=regGet('affaire',e.aff);if(a&&a.sitesOff&&a.sitesOff[id])return false;
  const n=siteOf(id);return !!((n&&n.traceur&&n.traceur.ctx==='etude')||traceurMark(id,e));}
/* etudeSync : on ne CRÉE plus de repère sur un site qui n'en a pas (un chantier lié à la main reste un chantier), sauf tracé enregistré en contexte étude */
export function lzSyncable(id){if(!A||isDemo(id)||realChantier(id))return false;const e=etudeMark(id);if(e&&e.aff)return true;const n=siteOf(id);return !!(n&&n.traceur&&n.traceur.ctx==='etude');}
/* l'appli ne fige ni marché ni TS d'une étude (C5), ni pendant la construction d'une fiche de session en arrière-plan */
export function lzNoMarche(id){if(!A)return false;if(A.state.lzBg)return true;try{return !!A.etudeOf(id);}catch(e){return false;}}
/* ═════════ 2 · RATTACHEMENT DES REMISES DU TRACEUR (une seule fois) ═════════ */
const RKEY='trace:etudeRemises';
function remises(){try{return JSON.parse(localStorage.getItem(RKEY)||'{}')||{};}catch(e){return {};}}
function markRemise(k,v){try{const R=remises();R[k]=Object.assign({at:now()},v);const ks=Object.keys(R);if(ks.length>400)ks.sort((a,b)=>String(R[a].at).localeCompare(String(R[b].at))).slice(0,ks.length-400).forEach(x=>delete R[x]);localStorage.setItem(RKEY,JSON.stringify(R));}catch(e){}}
const remiseKey=n=>n.id+'|'+((n.traceur&&n.traceur.savedAt)||'');
let srvFresh=false; /* registre des affaires reçu du serveur dans cette session */
export function lzLink(why){if(!A)return 0;let n=0;if(why==='affaires reçues'&&A.state.cloudUser)srvFresh=true;const R=remises();
  Object.values(A.SITES).forEach(net=>{try{if(!net||!net.id||!Array.isArray(net.lines)||!net.lines.length||isDemo(net.id))return;const e=net.fiche&&net.fiche.etude;if(!e||!e.aff||e.delie||e.verse)return; /* lot MU : étude versée dans un chantier — jamais rattachée à nouveau */
    if(!etudeRemise(net,e))return; /* chantier réel, repère posé par etudeSync / un ancien lien, démo : jamais rattaché tout seul */
    const a=regGet('affaire',e.aff);if(!a||a.deleted)return; /* affaire pas encore là : on réessaiera à sa réception */
    const key=remiseKey(net);const sv=(net.traceur&&net.traceur.savedAt)||'';
    if((a.sites||[]).includes(net.id)){if(!R[key])markRemise(key,{aff:e.aff,st:'deja'});return;}
    if(R[key])return; /* remise déjà traitée une fois sur cet appareil (rattachée puis déliée, écartée) */
    if(e.linkedAt&&(e.linkedSave||'')===sv){markRemise(key,{aff:e.aff,st:'deja'});return;} /* rattachée une fois (sur un appareil) puis déliée : ne revient pas */
    const off=(a.sitesOff||{})[net.id];if(off&&(!sv||Date.parse(off)>=Date.parse(sv))){markRemise(key,{aff:e.aff,st:'delie'});return;} /* ✕ fait après cette remise (ici ou ailleurs) */
    if(net.sent&&!srvFresh)return; /* copie venue du serveur (remise d'un autre appareil) : on attend le registre des affaires DU SERVEUR — un ✕ fait ailleurs ne doit pas être défait par un cache */
    const p={sites:(a.sites||[]).concat([net.id])};if(off){const o=Object.assign({},a.sitesOff);delete o[net.id];p.sitesOff=o;}
    regSet('affaire',e.aff,p);markRemise(key,{aff:e.aff,st:'lie'});n++;lg('lien',{id:net.id,aff:e.aff,why});
    A.saveSiteFicheX(net.id,{etude:Object.assign({},e,{linkedAt:now(),linkedSave:sv})},true).catch(()=>{});
    A.toast('Tracé « '+(net.name||net.id)+' » rattaché à l\'affaire '+e.aff+' (dossier commercial)');}catch(err){console.warn(err);}});
  if(n&&A.state.screen==='home')A.softRender('tracé lié ('+(why||'')+')');return n;}
/* ✕ (délier) : côté chantier — l'affaire (a.sites, a.sitesOff) est écrite par affaires.js */
export function lzUnlinkSite(num,id){if(!A)return;const n=siteOf(id);const e=etudeMark(id);if(n)markRemise(remiseKey(n),{aff:num,st:'delie'});lg('délié',{id,aff:num});
  if(e&&e.aff===num&&!e.delie&&!isDemo(id))A.saveSiteFicheX(id,{etude:Object.assign({},e,{delie:now()})},true).catch(()=>{});}
/* liaison à la main (menu « lier un chantier existant ») : une étude de CETTE affaire reprend son repère ; tout autre site devient un chantier lié à la main (repère retiré) */
export function lzLinkSite(num,id){if(!A||isDemo(id))return;const n=siteOf(id);const e=etudeMark(id);if(!e)return;lg('lié à la main',{id,aff:num});
  if(e.aff!==num){if(e.delie)A.saveSiteFicheX(id,{etude:null},true).catch(()=>{});return;} /* repère d'une autre affaire : on n'y touche pas (sauf délié) */
  if(n?etudeRemise(n,e):traceurMark(id,e)){if(e.delie){const x=Object.assign({},e);delete x.delie;A.saveSiteFicheX(id,{etude:x},true).catch(()=>{});}} /* vraie étude de cette affaire : elle redevient une étude */
  else A.saveSiteFicheX(id,{etude:null},true).catch(()=>{});} /* repère posé par etudeSync / un ancien lien : retiré → chantier lié à la main (« Ouvrir » → écran Tracé) */
/* ═════════ 3 · UNE ÉTUDE NE S'OUVRE QUE DANS LE TRACEUR DE SON AFFAIRE ═════════ */
export function lzTraceurUrl(id,num){const a=num?regGet('affaire',num):null;const cv=(a&&+a.chiffrageV)||1;return './traceur.html?site='+encodeURIComponent(id||'new')+(num?'&aff='+encodeURIComponent(num)+'&cv='+cv:'');} /* C6 */
export function lzTraceurNew(num){location.href=lzTraceurUrl('new',num);}
export function lzOpenEtude(id,num){if(!A)return;const n=siteOf(id);lg('traceur',{id,aff:num});A.toast('Étude « '+((n&&n.name)||id)+' » : ouverture dans le traceur de l\'affaire '+num+'…');setTimeout(()=>{location.href=lzTraceurUrl(id,num);},300);}
/* openSiteFromHome (carte, liste, notifications, liens, « ↗ Ouvrir le tracé »…) : une étude n'ouvre JAMAIS l'écran Tracé → son traceur */
export function lzGuardOpen(id){if(!A||!id||id==='__vide')return false;if(mutuGuardOpen(id))return true; /* lot MU : étude versée → son chantier */let et=false;try{et=!!A.etudeOf(id);}catch(e){}if(!et)return false;const num=etudeAffOf(id);
  if(!num){const n=siteOf(id);A.toast('« '+((n&&n.name)||id)+' » est une étude (dossier commercial) : elle s\'ouvre depuis son affaire, dans le traceur');return true;}
  lzOpenEtude(id,num);return true;}
/* lien direct index.html?site=<étude> : on va dans son affaire (pas dans Tracé) */
export async function lzEtudeAffForSite(id){if(!A||!id)return null;{const k=lzKind(id);if(k==='chantier'||k==='demo')return null;} /* chantier sans repère d'étude : ouvert tout de suite, sans attendre le registre */try{await regLoad('affaire');}catch(e){}let et=false;try{et=!!A.etudeOf(id);}catch(e){}if(!et)return null;const num=etudeAffOf(id);
  if(num){lg('lien étude',{id,aff:num});setTimeout(()=>{try{A.toast('« '+((siteOf(id)||{}).name||id)+' » est une étude de l\'affaire '+num+' : elle s\'ouvre dans le traceur (✎ Ouvrir dans le traceur)');}catch(e){}},400);}return num;}
/* ═════════ 4 · QUANTITÉS DES TRACÉS LIÉS SANS RIEN OUVRIR ═════════ */
const LOAD={}; /* id → {st:'loading'|'fail', at, why} */
const isLoading=id=>!!(LOAD[id]&&LOAD[id].st==='loading');
let loadedAt=0;
function fetchSite(id){const L=LOAD[id];if(L&&L.st==='loading')return;if(L&&L.st==='fail'&&Date.now()-L.at<60000&&!(L.why==='hors connexion'&&A.state.cloudUser))return;
  if(A.isHidden({id,traceur:null})){LOAD[id]={st:'fail',at:Date.now(),why:'supprimé de cet appareil'};return;}
  LOAD[id]={st:'loading',at:Date.now()};lg('charge',{id});
  (async()=>{let net=null,why='';
    try{const x=await A.kv.get('trace:handoff:'+id);if(x&&Array.isArray(x.lines)&&!x.deleted)net=x;}catch(e){} /* copie de l'appareil d'abord */
    if(!net){try{const x=JSON.parse(localStorage.getItem('trace:handoff:'+id)||'null');if(x&&Array.isArray(x.lines))net=x;}catch(e){}}
    if(!net&&A.state.cloudUser){let x=null;try{x=await Promise.race([A.sync.loadSite(id),new Promise(r=>setTimeout(()=>r('late'),15000))]);}catch(e){x=null;why='serveur injoignable';} /* sinon le serveur, comme l'ouverture d'un chantier */
      if(x==='late')why='serveur trop lent';else if(x&&Array.isArray(x.lines)&&!x.deleted){net=x;if(x.traceur)A.kv.set('trace:handoff:'+id,Object.assign({},x,{sent:true,sentAt:Date.now()})).catch(()=>{});}else if(!why)why=x&&x.deleted?'supprimé':'introuvable sur le serveur';}
    else if(!net)why='hors connexion';
    if(net){const cur=A.SITES[id];if(!(cur&&Array.isArray(cur.lines)&&cur.lines.length)){A.SITES[id]=net;delete A.siteStore[id];A.addSiteOption(net);}delete LOAD[id];loadedAt=Date.now();lg('chargé',{id});}
    else{LOAD[id]={st:'fail',at:Date.now(),why};lg('échec',{id,why});}
    A.softRender('tracé chargé');setTimeout(()=>A.softRender('tracé chargé'),2300); /* 2e passage : l'écart des versions garde 2 s ses quantités en mémoire */})().catch(e=>{console.warn(e);LOAD[id]={st:'fail',at:Date.now(),why:'erreur'};});}
/* 'ok' (fiches de session présentes ou rien de plus à faire) | 'loading' | 'fail' */
function need(id){if(!A||!id||id==='__vide')return 'ok';if(A.bgFresh)A.bgFresh(id); /* intégration 14/10 soir : fiches d'arrière-plan refaites si le tracé a changé */if(A.siteStore[id]||A.state.siteId===id)return 'ok';const n=A.SITES[id];
  if(n&&Array.isArray(n.lines)){if(n.lines.length&&n.lines.every(L=>L&&L.traceur&&L.cond))A.buildSession(id);return 'ok';} /* copie de l'appareil (format enregistré du traceur) : fiches construites comme à l'ouverture, sans changer d'écran */
  if(isDemo(id))return 'ok';fetchSite(id);return isLoading(id)?'loading':'fail';}
/* enveloppes de l'API (A.traceQty / traceAgg / tracePhases) — le corps de traceQty n'est pas touché (lot Q) */
export function lzQty(id){if(A&&A.bgFresh)A.bgFresh(id);const q0=A.traceQty(id);if(q0&&q0.rows&&q0.rows.length)return q0;const st=need(id);if(st==='loading')return {rows:[],tot:null,loading:true};return A.traceQty(id);}
export function lzAgg(id){need(id);return A.traceAgg(id);}
export function lzPhases(id){need(id);return A.tracePhases(id);}
/* l'onglet de l'affaire pendant le chargement d'un tracé lié : « ⏳ chargement du tracé… » (et pas « 0 » / « rien de tracé ») */
const nameOf=id=>'« '+esc((siteOf(id)&&siteOf(id).name)||(metaOf(id)&&metaOf(id).name)||id)+' »';
export function lzGate(a,tab,body,consult){if(!A||!a||consult||!['quantites','chiffrage','sites'].includes(tab))return body;const L=(a.sites||[]).filter(id=>{need(id);return isLoading(id);}); /* onglets qui montrent les quantités des tracés : chargement lancé dès l'ouverture de l'onglet */
  const F=tab==='sites'?[]:(a.sites||[]).filter(id=>LOAD[id]&&LOAD[id].st==='fail');
  const ko=F.length?`<div class="warnbox" style="margin:0 0 8px">⚠ ${F.map(nameOf).join(', ')} : tracé pas sur cet appareil (${esc(LOAD[F[0]].why||'')}) — ses quantités arriveront dès qu'il sera chargé (connexion).</div>`:'';
  if(!L.length)return ko+body;
  const card=`<div class="card lz-loading"><div class="spin"></div><div><b>⏳ chargement du tracé…</b><div class="eq-s">${L.map(nameOf).join(', ')} ${L.length>1?'ne sont':'n\'est'} pas encore sur cet appareil : ${L.length>1?'ils arrivent':'il arrive'} du serveur, les quantités s'affichent dans un instant.</div></div></div>`;
  if(tab==='quantites')return card;if(tab==='chiffrage')return card+ko+body;return body;}
/* ＋ Nouvelle version / Repartir de : pas pendant qu'un tracé lié se charge (l'instantané garderait « rien de tracé ») */
export function lzBusy(a){if(!A||!a)return false;const L=(a.sites||[]).filter(id=>{need(id);return isLoading(id);});if(!L.length&&Date.now()-loadedAt>2500)return false;A.toast('⏳ chargement du tracé… réessaie dans un instant');return true;}
/* ═════════ 5 · ONGLET « TRACÉ & CHANTIERS » ═════════ */
export function lzRowsHTML(a,linked,canEdit,ctx){const won=WON.includes(a.etat);
  return linked.map(s=>{{const mh=mutuRowHTML(a,s,canEdit,ctx);if(mh)return mh;} /* lot MU : chantier partagé */const id=s.id;let et=false;try{et=!won&&!!A.etudeOf(id);}catch(e){}
    let q=null;try{q=ctx&&ctx.traceQty?ctx.traceQty(id):null;}catch(e){q=null;}const L=LOAD[id];
    const qty=q&&q.loading?'<span class="lz-load">⏳ chargement du tracé…</span>':q&&q.rows&&q.rows.length&&q.tot?`<span class="lz-q"><b>${nb(q.tot.soud)}</b> soudures · <b>${nb(q.tot.mlTr,1)}</b> ml de tranchée</span>`:L&&L.st==='fail'?`<span class="lz-load">tracé pas sur cet appareil (${esc(L.why||'')})</span>`:(s.nw?nb(s.nw)+' soudures':'rien de tracé');
    const n=A.SITES[id];const mq=n&&n.marche&&won?' · marché figé'+(n.marche.at?' le '+new Date(n.marche.at).toLocaleDateString('fr-FR'):''):'';
    const tag=et?'<span class="lz-tag et">étude</span>':'<span class="lz-tag ch">'+(won?'chantier · affaire gagnée':'chantier')+'</span>';
    const open=et?`<button class="btn sm primary" data-act="af" data-v="etopen|${esc(id)}" title="Une étude vit dans le traceur de l'affaire (jamais dans Tracé)">✎ Ouvrir dans le traceur</button>`:`<button class="btn sm" data-act="opensite" data-v="${esc(id)}" title="Ouvrir le chantier (écran Tracé)">Ouvrir</button>`;
    return `<div class="ac-row lz-row" data-lzsite="${esc(id)}" style="min-height:52px;margin-bottom:6px"><span class="ic" style="background:${et?'#e8f0fb':'#e6f5ec'}">${et?'📐':'📍'}</span><span class="tx"><b>${esc(s.name||id)}</b><small>${tag}${esc(s.ville||'')}${s.ville?' · ':''}${qty}${mq}</small></span><span class="eq-acts">${open}${canEdit?`<button class="btn sm" data-act="af" data-v="unlink|${esc(id)}" style="color:#9b2c22" title="Délier : retiré de l'affaire, il ne revient pas tout seul (ni à l'actualisation, ni sur un autre appareil)">✕</button>`:''}</span></div>`;}).join('');}
/* ═════════ 6 · RETOUR À L'AFFAIRE (index.html?aff=…) : écran neutre jusqu'à l'affaire, jamais l'écran Tracé ni la carte ═════════ */
function waitEl(){return document.getElementById('lzAffWait');}
function showWait(num){try{const tt=num?`Ouverture de l'affaire <b>${esc(num)}</b>…`:'Ouverture du chantier…';const d0=waitEl();if(d0){const w=d0.querySelector('.lz-wt');if(w&&w.innerHTML!==tt)w.innerHTML=tt;return;}
  const host=document.getElementById('app')||document.body;const d=document.createElement('div');d.id='lzAffWait';d.setAttribute('role','status');d.setAttribute('aria-live','polite');
  d.innerHTML=`<div class="spin"></div><div class="lz-wt">${tt}</div><div class="lz-ws" id="lzAffWaitSub">${num?'chargement du dossier':'chargement'}</div><button class="btn" id="lzAffWaitGo" type="button">Aller à l'accueil</button>`;
  if(host===document.body)d.style.position='fixed';host.appendChild(d);d.querySelector('#lzAffWaitGo').addEventListener('click',()=>{lg('accueil (bouton)');if(A){A.state.pendingAff=null;A.state.pendingAffTab=null;A.state.homeTab='accueil';}hideWait('bouton');if(A){A.showScreen('home');A.renderHome();}});lg('écran neutre',{num});}catch(e){}}
function hideWait(why){const d=waitEl();if(d){d.remove();lg('fin écran neutre',{why});if(LZ.ret&&!LZ.ret.endAt){LZ.ret.endAt=Math.round(performance.now());LZ.ret.end=why;}}stopTick();}
if(typeof location!=='undefined'&&typeof document!=='undefined'){const q=new URLSearchParams(location.search);const n0=q.get('aff'),s0=q.get('site'); /* intégration : rien au chargement du module hors navigateur (tests Node) */ /* dès le chargement du module : AVANT que l'appli dessine l'écran Tracé du dernier chantier (filet : jamais plus de 20 s) */
  if(n0){LZ.ret={num:n0,t0:Math.round(LZ.t0)};showWait(n0);}
  else if(s0){LZ.site={id:s0,t0:Math.round(LZ.t0)};showWait(null); /* lien direct vers un chantier : écran neutre jusqu'à CE chantier (une étude part vers son affaire) — plus l'écran Tracé d'un autre chantier en attendant */
    const t=setInterval(()=>{if(!A)return;const st=A.state;if(LZ.ret&&LZ.ret.readyAt){clearInterval(t);return;}if((st.screen==='site'&&st.siteId===s0&&A.siteStore[s0])||st.screen==='home'||st.screen==='login'){clearInterval(t);hideWait('chantier');}},50); /* CE chantier construit (pas l'écran du précédent pendant le chargement du serveur) */setTimeout(()=>clearInterval(t),20000);}
  if(n0||s0)setTimeout(()=>{if(waitEl()&&!(LZ.ret&&LZ.ret.readyAt&&!LZ.ret.endAt&&tickT))hideWait('sécurité');},20000);}
let tickT=null,tickT0=0,sess=null,tries=0;
function stopTick(){clearInterval(tickT);tickT=null;}
const sub=t=>{const s=document.getElementById('lzAffWaitSub');if(s&&s.textContent!==t)s.textContent=t;};
export function lzAffReturn(num,tab,why){if(!A)return;const st=A.state;const t=TABS.includes(tab)?tab:'sites';st.pendingAff=num;st.pendingAffTab=t;st.homeTab='commerce';try{localStorage.setItem('trace:homeTab','commerce');}catch(e){}
  LZ.ret=Object.assign(LZ.ret||{t0:Math.round(LZ.t0)},{num,tab:t,why:why||'retour',readyAt:Math.round(performance.now())});if(!waitEl())showWait(num);lg('retour prêt',{num,tab:t});
  A.sync.user().then(u=>{sess=u?'oui':'non';}).catch(()=>{sess='non';});
  A.showScreen('home');A.renderHome();if(!st.pendingAff){hideWait('affaire');return;}
  stopTick();tickT0=Date.now();tries=0;tickT=setInterval(tick,200);}
function tick(){const st=A.state;if(!st.pendingAff){hideWait('affaire');return;}if(!waitEl()){stopTick();return;}const num=st.pendingAff;const el=Date.now()-tickT0;
  if(document.querySelector('#modal.show')){hideWait('fenêtre');return;} /* une fenêtre attend la personne (mot de passe…) : on ne la cache pas */
  let okC=false;try{okC=!!A.canCommerce();}catch(e){}const a=regGet('affaire',num);
  if(okC&&a){if(++tries>5){hideWait('délai');return;}if(st.screen!=='home')A.showScreen('home');A.renderHome();return;} /* renderHome applique pendingAff → lzAffShown */
  if(!okC)sub(st.cloudUser?'connexion : chargement de tes droits…':'chargement…');else sub('chargement de l\'affaire…');
  if(!okC&&sess==='non'&&el>600){hideWait('pas connecté');A.toast('Connecte-toi (ou choisis ton profil) pour ouvrir l\'affaire '+num);return;} /* le retour reste en attente : il s'appliquera avec les droits */
  if(okC&&!a&&((!st.cloudUser&&sess==='non')||srvFresh)){hideWait('introuvable');st.pendingAff=null;A.toast('Affaire '+num+' introuvable sur cet appareil');A.renderHome();return;}
  if(el>15000){hideWait('délai');A.toast('L\'affaire '+num+' s\'ouvrira dès que la connexion sera là');A.renderHome();}}
/* appelé par renderHome quand l'affaire du retour est affichée */
export function lzAffShown(){lg('affaire affichée');if(LZ.ret&&!LZ.ret.shownAt)LZ.ret.shownAt=Math.round(performance.now());hideWait('affaire');}
/* ═════════ 7 · MARCHÉ FIGÉ AU GAIN ═════════ */
const ETATS={};let etatsInit=false;
export function lzOnAffaires(src){if(!A)return;let L=[];try{L=regAll('affaire');}catch(e){return;}
  const first=!etatsInit;etatsInit=true;L.forEach(a=>{const k=a.num||a.id;const prev=ETATS[k];ETATS[k]=a.etat;
    if(!first&&src==='local'&&prev!==undefined&&!WON.includes(prev)&&WON.includes(a.etat))gain(a).catch(e=>console.warn(e));});} /* passage à « gagnée » fait SUR CET APPAREIL (Gagnée → à débuter, ou l'état changé dans la fiche) */
async function fullSite(id){const n=A.SITES[id];if(n&&Array.isArray(n.lines))return n;fetchSite(id);for(let i=0;i<80&&isLoading(id);i++)await new Promise(r=>setTimeout(r,200));const m=A.SITES[id];return m&&Array.isArray(m.lines)?m:null;}
async function gain(a){const num=a.num||a.id;const done=[];
  for(const id of (a.sites||[]).slice()){try{if(isDemo(id))continue;const k0=lzKind(id);if(k0==='chantier')continue;const net=await fullSite(id);if(!net||!net.lines.length)continue;
    const e=(net.fiche&&net.fiche.etude)||null;const tr=net.traceur||{};if(!(tr.ctx==='etude'||(e&&e.aff===num&&!e.delie)))continue; /* seulement les tracés d'étude de CETTE affaire */
    if(!net.marche){const snap=marcheSnapshot(net.lines,{source:'traceur',by:(A.userName&&A.userName())||'appli',gain:num}); /* comme le pont du traceur, au moment du gain */
      net.marche=snap;const st=A.siteStore[id];if(st&&st.NET&&st.NET!==net)st.NET.marche=snap;
      try{const x=await A.kv.get('trace:handoff:'+id);if(x){x.marche=snap;await A.kv.set('trace:handoff:'+id,x);}}catch(err){}
      if(A.state.cloudUser&&A.canWritePart('marche')){const {demo,handoff,sent,sentAt,...clean}=net;try{await A.saveSiteNet(clean,'marche');}catch(err){console.warn(err);}}
      done.push(net.name||id);lg('marché figé',{id,aff:num});}
    if(!(e&&e.gagne))A.saveSiteFicheX(id,{etude:Object.assign({},e||{},{aff:num,gagne:true,at:now()})},true).catch(()=>{});}catch(err){console.warn(err);}}
  if(done.length){A.toast('Affaire gagnée : tracé marché figé pour '+done.map(x=>'« '+x+' »').join(', ')+' — les modifications de chantier partent de là');A.softRender('marché figé');}}
/* ═════════ 8 · TESTS ═════════ */
export function lzTestApi(){return {kind:lzKind,mark:etudeMark,remises,load:()=>JSON.parse(JSON.stringify(LOAD)),ret:()=>LZ.ret&&JSON.parse(JSON.stringify(LZ.ret)),log:()=>LZ.log.slice(),url:lzTraceurUrl,link:w=>lzLink(w||'test')};}
