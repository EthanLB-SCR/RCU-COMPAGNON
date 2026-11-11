// flotte_donnees.js — 10/11 nuit (module Tracé Flotte, lots F1 + F2). Passation : claude/passation-module-flotte.md ; maquette : claude/maquette-flotte-1011.md.
// LE SEUL fichier entre l'appli et la maquette validée : il remplit window.FLD (flotte/fld.js) avec exactement les clés et les formes de data.js de la maquette,
// à partir de l'existant — registre « vehicule » (vehAll), mouvements (mvCounters, mvEvents, conducteursDe de mouvements.js ; remises à valider, changements à classer,
// premier état des lieux de reception2.js), contraventions du module RH (registre rhpv), annuaire, planning du jour, chantiers. Rien n'est recalculé à côté.
// Les écritures des écrans passent par FLD.ecrire.* → vehSet / regSet (mêmes enregistrements qu'aujourd'hui) ; les boutons « existant » ouvrent les écrans actuels
// (assistants d'état des lieux, changement de conducteur, impression Qui a quoi, nouveau véhicule…). Les règles sont dans flotte/calc.js (celui de la maquette).
// L'écran : Parc → Flotte (vParc d'espace.js → parcSeg) pour qui a le droit « Flotte » ; « Ancien écran » remet l'ancien (rien n'est supprimé).
import FLD from './flotte/fld.js';
import './affaire/kit.js'; import './flotte/calc.js'; import './flotte/ui_base.js'; import './flotte/ui_accueil.js'; import './flotte/ui_calendrier.js'; import './flotte/ui_mouvements.js'; import './flotte/ui_parc.js';
import {cssFlotte} from './flotte/flotte_css.js';
import {regAll,regGet,regSet,regLoad} from './reg.js';
import {vehAll,vehGet,vehSet,vehType,vehSVG,TYPES_V,AGENCES,RDV_TYPES,CTRL_ITEMS,flotteState,flotteHook,controleForm,flottePhoto} from './flotte.js';
import {mvCounters,mvEvents,conducteursDe,swDone} from './mouvements.js';
import {sansEdl} from './reception2.js';
import {vcfg} from './reception.js';
import {POSTES} from './acces.js';
const ID='fl';
const esc=s=>String(s==null?'':s).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const pad=n=>String(n).padStart(2,'0');
const todayIso=()=>{const d=new Date();return d.getFullYear()+'-'+pad(d.getMonth()+1)+'-'+pad(d.getDate());};
const d10=x=>x?String(x).slice(0,10):null;
const norm=s=>String(s||'').normalize('NFD').replace(/[̀-ͯ]/g,'').toLowerCase().replace(/[^a-z0-9@.]+/g,' ').trim();
const nk=s=>norm(s).split(' ').filter(Boolean).sort().join(' ');
const uid=()=>Date.now().toString(36)+Math.random().toString(36).slice(2,6);
const nomDe=p=>p?((p.prenom||'')+' '+(p.nom||'')).trim()||p.name||p.id:'';
const AG_NOM={OUEST:'Ouest',IDF:'Île-de-France',SUD:'Sud','SUD OUEST':'Sud-Ouest',SCR:'SCR',RCTP:'RCTP'};
const AGENCE_OF={ouest:'OUEST',idf:'IDF',sudouest:'SUD OUEST',sudest:'SUD'}; /* même table qu'espace.js (flCtx) */
const PV_STATUT={recue:'reçue',designee:'désignée',payee:'payée',contestee:'contestée',classee:'classée'}; /* registre rhpv (module RH) → mots de la maquette */
const ST_JOURNAL={ok:'ok',attente:'warn',contest:'bad',info:'info'};
let DEMO=null,LOADED=false,CTX=null,FSV=null,FSC=null,PREMIER=true;
let ANCIEN=(()=>{try{return localStorage.getItem('trace:flotteAncien')==='1';}catch(e){return false;}})(); /* « Ancien écran Flotte » : choix gardé sur l'appareil */
function hook(ctx){CTX=ctx;if(!LOADED){LOADED=true;regLoad(['vehicule','vrec','vcfg','rhpv']).catch(()=>{});}
  try{if(typeof window!=='undefined'&&window.TRACE&&!window.TRACE.flotteM)window.TRACE.flotteM={fld:()=>FLD,calc:()=>window.FLC,fl:()=>window.FL,demo:D=>{DEMO=D||null;PREMIER=true;if(CTX)CTX.render();},ancien:on=>{ANCIEN=!!on;if(CTX)CTX.render();},rafraichir:()=>rafraichir(CTX)};}catch(e){} /* TRACE.flotte existe déjà (flotte.js) : le module est TRACE.flotteM */}
/* qui a le droit de voir le module : le droit « Flotte » (responsable flotte, direction, exploitation…) ou administrateur */
const peut=(me,ctx)=>!!me&&(me.admin||ctx.can('flotte.manage'));
/* ── personnes : la personne de l'annuaire derrière un conducteur de véhicule (clé, sinon nom dans un ordre ou l'autre) ── */
function indexPersonnes(ctx){const P=(ctx.people||[]).filter(p=>p&&p.id);const byKey=new Map(),byNom=new Map();
  P.forEach(p=>{byKey.set(String(p.id).toLowerCase(),p);if(p.email)byKey.set(String(p.email).toLowerCase(),p);const k=nk(nomDe(p));if(k&&!byNom.has(k))byNom.set(k,p);});
  return {P,de:v=>{const key=String(v.conducteurKey||'').toLowerCase();if(key&&byKey.has(key))return byKey.get(key);const n=nk(v.conducteur);return n&&byNom.has(n)?byNom.get(n):null;}};}
/* où est le véhicule aujourd'hui (comme le Monde 3D) : planning du conducteur → chantier ; intervention du jour → atelier ; laissé sans conducteur → laissés ; sinon dépôt */
function situationDe(v,p,ctx,today){const rdvAuj=(v.rdv||[]).some(r=>r&&!r.done&&d10(r.date)===today);if(rdvAuj)return {situation:'atelier',chantier:null};
  if(v.laisse&&!v.conducteurKey&&!v.conducteur)return {situation:'laisse',chantier:null};
  if(p&&ctx.planDe){const ids=ctx.planDe(p.id,today)||[];const ch=ids.map(id=>(ctx.chantiers||[]).find(c=>c.id===id&&!c.bureau)).find(Boolean);if(ch)return {situation:'chantier',chantier:ch.id};}
  return {situation:'depot',chantier:null};}
/* un véhicule de l'appli → la forme de data.js (champs de fiche : mêmes noms) */
function vehDeLAppli(v,I,ctx,today){const p=I.de(v);const sit=situationDe(v,p,ctx,today);const nb=x=>x===''||x===null||x===undefined||!isFinite(+x)?null:+x;
  const ctl=(v.controles||[]).filter(Boolean).slice().sort((a,b)=>String(b.at||'').localeCompare(String(a.at||''))).map(c=>{const it=c.items||{};const ko=Object.keys(it).filter(k=>/revoir|ko|non/i.test(String(it[k])));const lab=k=>(CTRL_ITEMS.find(x=>x[0]===k)||[k,k])[1];
    return {d:d10(c.at),par:c.by||'',km:nb(c.km),ok:Object.keys(it).length-ko.length,revoir:ko.map(lab)};});
  const photoAt=v.photoAt||v.vignetteAt||null;
  return {immat:v.immat,n:v.n||'',agence:String(v.agence||'').toUpperCase(),type:vehType(v)||'Autre',marque:v.marque||'',modele:v.modele||'',conducteur:p?p.id:(v.conducteur?'nom:'+v.conducteur:null),situation:sit.situation,chantier:sit.chantier,energie:v.energie||'',
    immat1:d10(v.immat1),acquisition:d10(v.acquisition),dureeLoc:nb(v.dureeLoc),restitution:d10(v.restitution),entretien:v.entretien||'',contratMois:nb(v.contratMois),contratFin:d10(v.contratFin),contratKm:nb(v.contratKm),loyerHT:nb(v.loyerHT),
    ctDernier:d10(v.ctDernier),ctProchain:d10(v.ctProchain),km:nb(v.km),kmFinAnnee:nb(v.kmFinAnnee),cadenceVidange:nb(v.cadenceVidange),kmVidange:nb(v.kmVidange),cadenceCourroie:nb(v.cadenceCourroie),kmCourroie:nb(v.kmCourroie),pneus:v.pneus||'',taillePneu:v.taillePneu||'',depuis:d10(v.depuis),
    rdv:(v.rdv||[]).filter(r=>r&&r.date).map(r=>({id:r.id||('R'+r.date),date:d10(r.date),type:r.type||'autre',garage:r.garage||'',note:r.note||'',par:r.by||'',fait:!!r.done})),
    interventions:(v.interventions||[]).filter(Boolean).slice().reverse().map(i=>({d:d10(i.at)||'',t:i.text||i.t||'',garage:i.garage||'',km:nb(i.km),cout:nb(i.cout)})),
    signalements:(v.signalements||[]).filter(Boolean).map(s=>({id:s.id||'',texte:s.text||s.texte||'',le:d10(s.at)||'',par:s.by||'',fait:!!s.done})),
    controles:ctl,edl1:!sansEdl(v),photo:v.photo||v.vignette||null,photoEdl:(v.photo||v.vignette)?{le:d10(photoAt)||'',par:v.photoBy||''}:null,couleur:v.couleur||undefined,silhouette:v.silhouette||undefined,
    laisse:v.laisse?{par:v.laisse.par||'',le:d10(v.laisse.at),a:v.laisse.aNom||null,ou:v.laisse.ou||''}:null,_v:v};}
/* ── MOUVEMENTS EN ATTENTE : mêmes familles que le bloc « 📋 Mouvements en attente » de reception2.js (crochet « liste ») ; chaque ligne garde le bouton de l'appli ── */
const cap=s=>{s=String(s||'');return s.charAt(0).toUpperCase()+s.slice(1);};
function attenteDeLAppli(){const C=mvCounters();const L=[];
  C.contest.forEach(x=>L.push({id:'c:'+x.rec,k:'contest',immat:x.immat,titre:'Laissé par '+(x.par||'?')+', pris par '+(x.pris||'?'),motif:x.motif||'',depuis:d10(x.since),qui:x.pris||'',app:['Trancher','veh|arb|'+x.rec,'principal']}));
  C.sig.forEach(x=>{const r=x.rec?regGet('vrec',x.rec):null;L.push({id:'s:'+(x.rec||x.immat),k:'sig',immat:x.immat,titre:cap(x.lab||x.why),motif:cap(x.why||'')+(x.libre?' (laissé à qui le prendra)':''),depuis:d10(x.since),qui:x.nom||'',
    app:x.rec?(r&&r.aValider?['Valider','veh|val|'+x.rec,'principal']:['Voir','veh|voir|'+x.rec]):['Suivre','veh|switch|'+x.immat]});});
  C.edl.forEach(x=>L.push({id:'e:'+(x.rec||x.immat),k:'edl',immat:x.immat,titre:cap(x.lab||x.why),motif:cap(x.why||''),depuis:d10(x.since),qui:x.nom||'',app:x.rec?['Voir','veh|voir|'+x.rec]:['Suivre','veh|switch|'+x.immat]}));
  C.sansPreneur.forEach(x=>L.push({id:'l:'+x.immat,k:'laisse',immat:x.immat,titre:'Laissé par '+(x.nom||'?')+' « à qui le prendra »'+(x.ou?', '+x.ou:''),motif:'Personne ne l\'a pris depuis plus de 7 jours',depuis:d10(x.since),qui:'',app:['Attribuer à…','attribuer']}));
  regAll('vrec').filter(r=>r&&r.aValider&&!r.remplacePar&&!r.pris&&!C.sig.some(x=>x.rec===r.id)).forEach(r=>{const X=r.conducteurNom||'';
    const t=r.lache?'État des lieux de sortie de '+X+(r.lache.ou?' (laissé '+r.lache.ou+')':''):r.premier?'Premier état des lieux de '+X:r.sansResponsable?'Remise faite seul par '+X:'État des lieux de '+X;
    L.push({id:'v:'+r.id,k:'valider',immat:r.immat||r.vehId,titre:t,motif:'À valider par '+((r.aValider||{}).nom||'un responsable'),depuis:d10(r.at),qui:X,app:['Valider','veh|val|'+r.id,'principal']});});
  vehAll().filter(v=>swDone(v)).forEach(v=>{const s=v.switch||{};L.push({id:'w:'+v.immat,k:'classer',immat:v.immat,titre:'Changement terminé : '+((s.ancien||{}).nom||'?')+' → '+((s.nouveau||{}).nom||'?'),motif:'Le nouveau conducteur a signé · un clic pour classer',depuis:d10(s.depuis||s.at),qui:'',app:['Classer','veh|swclose|'+v.immat,'discret']});});
  return L.filter(x=>x.immat);}
/* ── remplir FLD (en place) ── */
function agencesDe(me,ctx,V){const restr=me&&!me.admin&&(me.poste==='resp_exploitation'||me.poste==='conducteur')?(AGENCE_OF[ctx.mySecteur?ctx.mySecteur(me):'']||''):'';
  const ids=[...new Set(V.map(v=>v.agence).filter(Boolean))].sort((a,b)=>(AGENCES.indexOf(a)<0?99:AGENCES.indexOf(a))-(AGENCES.indexOf(b)<0?99:AGENCES.indexOf(b)));
  if(restr&&ids.includes(restr))return {liste:[{id:restr,nom:AG_NOM[restr]||restr}],defaut:restr}; /* responsable d'exploitation : son secteur */
  return {liste:[{id:'',nom:'Toutes'}].concat(ids.map(a=>({id:a,nom:AG_NOM[a]||a}))),defaut:''};}
function rafraichir(ctx){const me=ctx&&ctx.me;const today=(ctx&&ctx.today&&ctx.today())||todayIso();
  if(DEMO){ /* tests : le jeu de la maquette (test/fixtures/flotte_demo.js), 100 % fictif, à la place des données de l'appli — preuve « exactement pareil » */
    const keep=['ecrire','app'];Object.keys(DEMO).forEach(k=>{if(!keep.includes(k))FLD[k]=JSON.parse(JSON.stringify(DEMO[k]));});
    if(PREMIER){PREMIER=false;window.FL.etat.agence=DEMO.agence!==undefined?DEMO.agence:'OUEST';window.FL.moisCourant();}return;}
  const I=indexPersonnes(ctx);const V=vehAll().map(v=>vehDeLAppli(v,I,ctx,today));
  const pers=I.P.map(p=>({id:p.id,nom:nomDe(p),poste:p.poste||''}));V.forEach(v=>{if(v.conducteur&&String(v.conducteur).startsWith('nom:')&&!pers.some(p=>p.id===v.conducteur))pers.push({id:v.conducteur,nom:v.conducteur.slice(4),poste:''});});
  const vehNom=new Map(vehAll().map(v=>[v.immat,v]));
  const cond={};vehAll().forEach(v=>{try{const L=conducteursDe(v);if(L.length)cond[v.immat]=L.map(p=>({nom:p.nom||'',du:d10(p.debut)||'',au:p.cur?null:(d10(p.fin)||null),how:p.how||''}));}catch(e){}});
  const pv=regAll('rhpv').filter(r=>r&&!r.deleted&&(r.vehImmat||r.veh)).map(r=>{const p=I.P.find(x=>x.id===r.p);const im=r.vehImmat||((vehGet(r.veh)||{}).immat)||r.veh;
    return {id:r.id,immat:im,avis:d10(r.recu)||d10(r.date)||'',infraction:d10(r.date)||d10(r.recu)||'',lieu:r.lieu||'',quoi:r.infraction||'Contravention',montant:+r.montant||0,statut:PV_STATUT[r.statut]||r.statut||'reçue',conducteur:p?nomDe(p):''};}).filter(x=>vehNom.has(x.immat));
  const ag=agencesDe(me,ctx,V);const C=vcfg()||{};
  Object.assign(FLD,{aujourdhui:today,edl1Ref:d10(C.premierAt||C.at)||today,agences:ag.liste,personnes:pers,postes:Object.assign({},POSTES),
    chantiers:(ctx.chantiers||[]).filter(c=>!c.bureau).map(c=>({id:c.id,nom:c.nom,agence:AGENCE_OF[c.secteur]||''})),vehicules:V,attente:attenteDeLAppli(),
    journal:mvEvents().filter(e=>e&&e.immat).slice(0,400).map(e=>({at:String(e.at).slice(0,16),immat:e.immat,st:ST_JOURNAL[e.st]||'info',t:e.t+(e.s?' · '+e.s:'')})),conducteurs:cond,pv,
    rdvTypes:RDV_TYPES.map(([k,t])=>[k,String(t).replace(/^\S+\s/,'')]),types:TYPES_V.slice(),ctrlItems:CTRL_ITEMS.map(x=>x[1]),
    responsable:I.P.filter(p=>p.poste==='resp_flotte').map(nomDe).join(', ')});
  const FL=window.FL;if(PREMIER){PREMIER=false;FL.etat.agence=ag.defaut;FL.moisCourant();}
  if(!FLD.agences.some(a=>a.id===FL.etat.agence))FL.etat.agence=ag.defaut;}
/* ── ÉCRITURES : les mêmes enregistrements qu'aujourd'hui (fiche « vehicule », états des lieux « vrec ») ── */
function ecritures(ctx){const who=()=>{try{return (ctx.api&&ctx.api.userName&&ctx.api.userName())||'';}catch(e){return '';}};const now=()=>new Date().toISOString();
  const lecture=()=>{if(DEMO)return false;if(ctx.viewing&&ctx.viewing()){ctx.toast('Lecture seule : tu vois l\'appli comme quelqu\'un d\'autre');return true;}if(!peut(ctx.me,ctx)){ctx.toast('Réservé au droit « Flotte »');return true;}return false;};
  const demo=(f)=>{if(!DEMO)return false;f();return true;}; /* tests sur le jeu de la maquette : on modifie le jeu (comme la maquette) */
  const dv=im=>DEMO&&(DEMO.vehicules||[]).find(v=>v.immat===im);
  FLD.ecrire={
    /* programmer une intervention : rdv sur la fiche (rdvForm de flotte.js) */
    rdvAjout(immat,r){if(demo(()=>{const v=dv(immat);if(v)(v.rdv=v.rdv||[]).push(Object.assign({id:'r'+uid(),par:'Démo'},r));}))return true;if(lecture())return false;const v=vehGet(immat);if(!v)return false;
      vehSet(immat,{rdv:(v.rdv||[]).concat([{id:'R'+Date.now().toString(36),date:r.date,type:r.type||'entretien',garage:r.garage||'',note:r.note||'',by:who(),at:now()}])});return true;},
    /* « Fait » : comme rdvok de flotte.js (ligne d'intervention) ; CT fait → prochain à +2 ans ; vidange faite → compteur remis (hypothèses de la maquette) */
    rdvFait(immat,id){const fait=v=>{const r=(v.rdv||[]).find(x=>x.id===id);if(!r)return null;return r;};
      if(demo(()=>{const v=dv(immat);const r=v&&fait(v);if(!r)return;r.fait=true;(v.interventions=v.interventions||[]).unshift({d:r.date,t:(FLD.rdvTypes.find(t=>t[0]===r.type)||['','Autre'])[1]+(r.note?' · '+r.note:''),garage:r.garage,km:v.km});if(r.type==='ct'){v.ctDernier=r.date;v.ctProchain=(+r.date.slice(0,4)+2)+r.date.slice(4,10);}if(r.type==='vidange')v.kmVidange=v.km;}))return true;
      if(lecture())return false;const v=vehGet(immat);if(!v)return false;const r=fait(v);if(!r)return false;const lab=(RDV_TYPES.find(x=>x[0]===r.type)||RDV_TYPES[6])[1].replace(/^\S+\s/,'');
      const patch={rdv:(v.rdv||[]).map(x=>x.id===id?Object.assign({},x,{done:true,doneAt:now()}):x),interventions:(v.interventions||[]).concat([{text:new Date(String(r.date)+'T12:00:00').toLocaleDateString('fr-FR')+' · '+lab+(r.garage?' · '+r.garage:'')+(r.note?' · '+r.note:''),at:now(),by:who()}])};
      if(r.type==='ct'){const d=d10(r.date);patch.ctDernier=d;patch.ctProchain=(+d.slice(0,4)+2)+d.slice(4,10);}if(r.type==='vidange'&&v.km!==undefined&&v.km!==null&&v.km!=='')patch.kmVidange=+v.km;vehSet(immat,patch);return true;},
    /* déplacer une intervention (nouveau) */
    rdvDate(immat,id,date){if(demo(()=>{const v=dv(immat);const r=v&&(v.rdv||[]).find(x=>x.id===id);if(r)r.date=date;}))return true;if(lecture())return false;const v=vehGet(immat);if(!v)return false;vehSet(immat,{rdv:(v.rdv||[]).map(x=>x.id===id?Object.assign({},x,{date,movedAt:now(),movedBy:who()}):x)});return true;},
    /* signalement traité (sigok de flotte.js) */
    sigFait(immat,id){if(demo(()=>{const v=dv(immat);(v&&v.signalements||[]).forEach(s=>{if(s.id===id)s.fait=true;});}))return true;if(lecture())return false;const v=vehGet(immat);if(!v)return false;vehSet(immat,{signalements:(v.signalements||[]).map(s=>s.id===id?Object.assign({},s,{done:true,doneAt:now(),doneBy:who()}):s)});return true;},
    /* laissé sans preneur → attribué à quelqu'un (comme « Laisser à… » : la personne le voit « laissé à moi » et signe l'état des lieux de sortie en le prenant) */
    attribuer(immat,pid){const p=(FLD.personnes||[]).find(x=>x.id===pid);if(!p)return false;
      if(demo(()=>{const m=(DEMO.attente||[]).find(x=>x.k==='laisse'&&x.immat===immat);if(m){m.k='sig';m.titre='Laissé · attribué à '+p.nom;m.motif=p.nom+' doit signer l\'état des lieux de sortie (ou le contester)';m.qui=p.nom;m.depuis=FLD.aujourdhui;}}))return true;
      if(lecture())return false;const v=vehGet(immat);if(!v||!v.laisse)return false;vehSet(immat,{laisse:Object.assign({},v.laisse,{aKey:pid,aNom:p.nom,attribueAt:now(),attribuePar:who()})});
      if(v.laisse.recId&&regGet('vrec',v.laisse.recId))regSet('vrec',v.laisse.recId,{a:{key:pid,nom:p.nom},attribueAt:now(),attribuePar:who()});return true;},
    /* photo du véhicule : celle de l'appli (flottePhoto : compressée, enregistrée sur la fiche) */
    async photo(immat,file){if(DEMO){const v=dv(immat);if(!v)return false;const u=await new Promise(res=>{const rd=new FileReader();rd.onload=()=>res(rd.result);rd.onerror=()=>res(null);rd.readAsDataURL(file);});if(u){v.photo=u;v.photoEdl={le:FLD.aujourdhui,par:'Démo'};}return !!u;}
      if(lecture())return false;try{await flottePhoto(immat,file,true);return true;}catch(e){console.warn(e);ctx.toast('Photo non enregistrée');return false;}}};}
/* ── pont vers l'appli : rendu, fenêtres, toast, écrans existants ── */
function bridge(ctx){FLD.app={render:()=>ctx.render(),openModal:h=>{if(ctx.api&&ctx.api.openModal)ctx.api.openModal(h);},closeModal:()=>{if(ctx.api&&ctx.api.closeModal)ctx.api.closeModal();},toast:t=>ctx.toast(t),
  agence:()=>{},peut:k=>!DEMO&&k==='cfg'&&peut(ctx.me,ctx),dessin:v=>{try{return vehSVG(v._v||v,120);}catch(e){return null;}},ficheAncienne:()=>{try{return ctx.flotteAncien?ctx.flotteAncien():'';}catch(e){console.warn(e);return '';}},
  /* la route du module → l'état de l'ancien écran (fiche ouverte, liste) pour que ses actions (data-act="fl") visent le bon véhicule */
  vers:r=>{const FS=flotteState();if(r.page==='fiche'){FS.cur=r.immat;FS.view='fiche';}else{FS.view='list';FS.cur=null;}FSV=FS.view;FSC=FS.cur;},
  lectureSeule:act=>{const W=['rdvOk','rdvFait','rdvDeplacer','sigOk','mvAttribuerOk'];if(W.includes(act)&&!DEMO&&ctx.viewing&&ctx.viewing()){ctx.toast('Lecture seule : tu vois l\'appli comme quelqu\'un d\'autre');return true;}return false;},
  /* boutons « existant » : écrans actuels de l'appli */
  existant:(x,el)=>{const im=el&&el.dataset?el.dataset.immat:'';if(DEMO)return false;
    if(x==='new')return ctx.act('fl','new|');
    if(x==='cfg')return ctx.act('x','veh|cfg|'); /* Pack véhicules (reception.js) */
    if(x==='quiprint')return ctx.act('x','veh|quiprint|');
    if(x==='switch'&&im)return ctx.act('x','veh|switch|'+im);
    if(x==='lache'&&im)return ctx.act('x','veh|lacheDe|'+im);
    if(x==='ctrl'&&im){controleForm(im);return true;}
    if(x==='rh')return ctx.act('xgo','x:rh:pv')||(ctx.go('x:rh:pv'),true);
    if(x==='switch'){choisirVehicule(ctx,'Déclarer un changement de conducteur','veh|switch|');return true;}
    if(x==='ancienne'&&im){const FS=flotteState();FS.cur=im;FS.view='fiche';FSV='fiche';FSC=im;window.FL.etat.ficheAncienne=im;ctx.render();return true;}
    return false;}};}
/* « Déclarer un changement de conducteur » depuis Mouvements : choisir le véhicule, puis l'assistant existant (↔ Changement de conducteur) */
function choisirVehicule(ctx,titre,act){const V=(FLD.vehicules||[]).filter(v=>window.FLC.dansAgence(v,window.FL.etat.agence)&&v.conducteur);
  window.FL.ouvrir(titre,'<div class="af-champ"><label for="fl-chv">Véhicule (avec son conducteur actuel)</label><select id="fl-chv">'+V.map(v=>'<option value="'+esc(v.immat)+'">'+esc(v.immat+' · '+v.marque+' '+v.modele+' · '+window.FLC.nomCond(v))+'</option>').join('')+'</select><small>Le responsable déclare ; l\'ancien conducteur fait l\'état des lieux de sortie, le nouveau signe.</small></div>',
    window.FL.btn('Continuer','flChoixOk',{v:'principal',d:{a:act}}));}
if(typeof window!=='undefined'&&window.FL)window.FL.actions.flChoixOk=el=>{const im=window.FL.val('fl-chv');if(!im||!CTX)return;window.FL.fermer();CTX.act('x',el.dataset.a+im);};
/* ── l'ancien écran Parc → Flotte : ses actions (fiche, vues) se retrouvent dans le cadre ── */
function suivreAncien(){const FS=flotteState();if(FS.view===FSV&&FS.cur===FSC)return;FSV=FS.view;FSC=FS.cur;const FL=window.FL;
  if(FS.view==='fiche'&&FS.cur){if(FL.etat.route!=='veh-'+FS.cur)FL.etat.route='veh-'+FS.cur;return;}
  const M={mouv:'mouvements',qui:'qui',agenda:'calendrier',hist:'journal',list:null};if(FS.view in M&&M[FS.view])FL.etat.route=M[FS.view];
  else if(FS.view==='list'&&/^veh-/.test(FL.etat.route))FL.etat.route='vehicules';}
function html(me,ctx){cssFlotte();bridge(ctx);ecritures(ctx);rafraichir(ctx);suivreAncien();const FL=window.FL;
  if(FL.etat.ficheAncienne&&FL.etat.route!=='veh-'+FL.etat.ficheAncienne)FL.etat.ficheAncienne=null;
  const top=`<div class="fl-bascule"><button class="btn sm ghost" data-act="x" data-v="${ID}|ancien|1" title="L'écran Flotte d'avant (chips Véhicules, Échéances, Mouvements, Qui a quoi, Historique) : tout y est encore">Ancien écran Flotte</button></div>`;
  return FL.html()+top;}
/* l'ancien écran, au-dessus de sa liste : le retour au nouveau */
flotteHook('liste',()=>ANCIEN?`<div class="eq-acts" style="margin:0 0 8px"><button class="btn primary" data-act="x" data-v="${ID}|ancien|0">← Nouvel écran Flotte</button></div>`:'');
export default {id:ID,kinds:['vehicule','vrec','vcfg','rhpv'],
  /* Parc → Flotte : le module à la place de l'ancien écran (qui reste : « Ancien écran Flotte ») */
  parcSeg(seg,me,ctx,bar){if(seg!=='flotte')return null;hook(ctx);if(!peut(me,ctx)||ANCIEN)return null;try{return bar+html(me,ctx);}catch(e){console.error('Tracé Flotte',e);return null;}},
  act(v,el,me,ctx){hook(ctx);const [k,a]=String(v).split('|');if(k==='ancien'){ANCIEN=a==='1';try{if(ANCIEN)localStorage.setItem('trace:flotteAncien','1');else localStorage.removeItem('trace:flotteAncien');}catch(e){}const FS=flotteState();FS.view='list';FS.cur=null;FSV='list';FSC=null;if(!ANCIEN)window.FL.etat.route='accueil';ctx.render();return;}}, /* l'ancien écran s'ouvre sur sa liste ; le retour, sur l'accueil du module */
  xview(){return null;}};
