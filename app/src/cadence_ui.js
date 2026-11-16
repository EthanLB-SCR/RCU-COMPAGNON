// cadence_ui.js — 16/11/2026 (lot CA) : branchement et écrans du calcul de cadence (logique pure : src/cadence.js).
//  · la RÉFÉRENCE publiée par l'administrateur depuis Commerce → Base de prix (réglage partagé « cadences_prod », copie sur l'appareil) : sans elle, rien ne s'affiche ;
//  · la SEMAINE d'une personne : heures débloquées (production pointée sur le plan × barème) face aux heures de travail pointées, jour par jour, avec le détail ;
//  · les semaines TERMINÉES sont figées dans la fiche personne (partie « compteurs », clé c<année>-W<semaine> : [débloqué, pointé, pouces]) par l'appareil d'un
//    responsable (chef de chantier, conducteur, bureau, administrateur : ceux que le serveur laisse écrire les compteurs) : c'est ce qui nourrit les avatars de tout le
//    monde (étincelles = semaines d'affilée au-dessus, paliers = pouces cumulés).
//  · un appareil ne calcule QUE ce qu'il a : le plan d'un chantier n'arrive sur un appareil qu'après l'avoir ouvert une fois (comme le tableau de production). La semaine
//    de quelqu'un n'est calculée — et figée — que si les plans et les fiches de soudure de TOUS ses chantiers de la semaine sont là ; sinon l'écran le dit (« ouvre le
//    chantier une fois ») et rien n'est écrit : un calcul partiel ne remplace jamais un calcul complet.
// X = contexte fourni par espace.js (cadX) : données du rendu, pointages, planning, opérations lues sur les plans, enregistrement des compteurs.
import {cadRef,cadRefOk,cadSemaine,cadEtat,cadSerie,cadCompteurs,cadAvatar,cadCle,cadBareme,PAN_LAB,CAD_KEY,CAD_MINH} from './cadence.js';
import {roleFor,realAccount} from './acces.js';
import {revOf,sstTypes} from './prix.js';
const LS='trace:cadref';
let REF=null;try{const v=JSON.parse(localStorage.getItem(LS)||'null');if(cadRefOk(v))REF=v;}catch(e){}
const OPT={sst:null,minH:null,etinc:null,pour:null,busy:false}; /* réglages de la carte de publication (avant « Publier ») */
const METIER={soudeur:'S',tuyauteur:'T',manchonneur:'M'};
export const cadMetier=p=>METIER[p&&p.poste]||'';
export const cadRefCur=()=>REF;
/* encadrement = ceux que le serveur laisse écrire les compteurs (administrateur, rôle chef / bureau) ; en « voir comme », c'est le vrai compte qui compte (l'administrateur regarde l'écran d'un soudeur pendant l'essai) */
const estEnc=X=>{let a=null;try{a=X.viewing()?(realAccount()||X.A.current()):X.A.current();}catch(e){a=X.A.current();}return !!a&&(!!a.admin||['chef','bureau'].includes(roleFor(a)));};
/* la cadence s'affiche : publiée, option ouverte à la personne, et — tant qu'elle est en essai (pour = 'enc') — seulement sur l'appareil d'un encadrant */
export const cadOn=X=>!!REF&&X.featOn('cadence')&&(REF.pour==='tous'||estEnc(X));
function keep(v){REF=cadRefOk(v)?v:null;try{if(REF)localStorage.setItem(LS,JSON.stringify(REF));else localStorage.removeItem(LS);}catch(e){}}
/* lecture du réglage partagé (à la connexion) : une référence valide remplace la copie ; « suspendu » ({v:0}) l'enlève ; pas de réponse (hors réseau) : on garde la copie */
export async function cadLoad(X){try{if(!X.A.state.cloudUser||!X.A.sync||!X.A.sync.getSetting)return false;const v=await X.A.sync.getSetting(CAD_KEY);if(!v||typeof v!=='object')return false;const before=JSON.stringify(REF);keep(v);return JSON.stringify(REF)!==before;}catch(e){console.warn(e);return false;}}
/* ═════════ 1 · LA SEMAINE ═════════ */
const FRAIS=1800000; /* figer : fiches de soudure relues du serveur depuis moins de 30 min */
/* fiches d'un chantier sur cet appareil : 'ok' · 'plan' (jamais ouvert ici : pas de plan) · 'fiches' (soudures pas encore relues) · 'vieux' (pour figer : relecture du serveur trop ancienne) */
function etatSite(X,id,strict){if(!id||String(id).indexOf('demo_')===0)return 'ok'; /* bac à sable : compté quand le chantier est ouvert, rien à relire */const n=X.netOf(id);if(!n)return X.vraiChantier(id)?'plan':'ok'; /* bureau, chantier supprimé : rien à lire */
  if(strict&&X.A.state.cloudUser){if(!Array.isArray(n._rows))return 'fiches';return n._rowsAt&&Date.now()-n._rowsAt<FRAIS?'ok':'vieux';} /* figer : les fiches relues du serveur, même pour le chantier ouvert (ses soudures arrivent après son plan) */
  if(n._lines)return 'ok';return Array.isArray(n._rows)?'ok':'fiches';}
export function cadWeek(X,k,strict){strict=!!strict&&!!X.A.state.cloudUser;const C=X.cache();const ck=(strict?'ws|':'w|')+k;if(C[ck])return C[ck];const js=X.joursSem(k),wk=X.weekKey(js[0]);X.ensureWeeks([wk]);const aff=X.aff(wk)||{};
  const gens={},h={},ici={},eq={},lieux={};
  X.personnes().forEach(p=>{const op=cadMetier(p);const m=op||(p.poste==='chauffeur_engin'?'P':''); /* le chauffeur d'engin : sa présence dans l'équipe choisit la cadence S+T+P, lui n'est pas compté */gens[p.id]={m};if(!m)return;const hh={},ii={};
    js.forEach(d=>{const x=X.ptIdx(p.id,d);const w=x?X.calc(x).w/60:0;if(w>0)hh[d]=Math.round(w*100)/100;const s=new Set(X.planDe(p.id,d));if(x&&x.site)s.add(x.site);if(s.size)ii[d]=[...s];});
    h[p.id]=hh;ici[p.id]=ii;const e={},a=aff[p.id]||{};Object.keys(a).forEach(key=>{if(key.indexOf('eq:')===0&&a[key])e[key.slice(3)]=a[key];});eq[p.id]=e;
    if(!op)return;const st=new Set();Object.keys(hh).forEach(d=>(ii[d]||[]).forEach(x=>st.add(x)));lieux[p.id]=[...st];}); /* ses chantiers de la semaine (jours avec des heures) */
  const ops=X.ops(strict).filter(o=>o.d>=js[0]&&o.d<=js[6]);
  return C[ck]={k,wk,js,lieux,R:cadSemaine(REF,{jours:js,gens,h,ici,eq,ops})};}
/* ce qui manque sur cet appareil pour calculer la semaine de quelqu'un : [{site, etat}] — vide = calcul complet */
export function cadManque(X,id,k,strict){const W=cadWeek(X,k);return (W.lieux[id]||[]).map(s=>({site:s,etat:etatSite(X,s,strict)})).filter(x=>x.etat!=='ok');}
/* la semaine k d'une personne : semaine terminée → la valeur figée fait foi quand elle existe ; sinon (semaine en cours, pas encore figée) le calcul de l'appareil */
export function cadMoi(X,id,k){const W=cadWeek(X,k);const p0=W.R.par[id]||null;const p=p0&&(p0.hp>0||p0.hd>0||p0.hpTot>0)?p0:null;const st=(X.compteurs(id)||{})[cadCle(W.wk)];
  const fige=Array.isArray(st)?{hd:+st[0]||0,hp:+st[1]||0,po:+st[2]||0}:null;const fini=k<0;const use=fini&&fige?fige:(p||fige||{hd:0,hp:0,po:0});const manque=fini&&fige?[]:cadManque(X,id,k,false);
  return {W,k,p,fige,fini,manque,src:fini&&fige?'fige':'calc',hd:use.hd,hp:use.hp,po:use.po,hpTot:p?p.hpTot:use.hp,et:cadEtat(REF,use.hd,use.hp),diff:!!(fini&&fige&&p&&(Math.abs(p.hd-fige.hd)>0.05||Math.abs(p.hp-fige.hp)>0.05))};}
/* compteurs d'une personne : semaines terminées figées ; pour soi-même, la semaine dernière calculée ici tant qu'elle n'est pas figée (l'étincelle se voit dès le lundi) */
function compteursDe(X,id){let c=X.compteurs(id)||{};if(id===X.S.me&&!X.viewing()){try{const W=cadWeek(X,-1);const key=cadCle(W.wk);const p=W.R.par[id];if(!c[key]&&p&&(p.hp>0||p.hd>0)&&!cadManque(X,id,-1,false).length)c=Object.assign({},c,{[key]:[p.hd,p.hp,p.po]});}catch(e){console.warn(e);}}return c;}
export function cadBilan(X,id){const C=X.cache();const ck='b|'+id;if(C[ck])return C[ck];const cur=X.weekKey(X.joursSem(0)[0]);const c=compteursDe(X,id);const a=cadAvatar(REF,c,cur);
  const L=cadCompteurs(c).filter(x=>x.w<cur).map(x=>Object.assign({},x,{k:cadEtat(REF,x.hd,x.hp).k}));return C[ck]=Object.assign({L,mode:REF.etinc==='serie'?'serie':'record'},a);}
/* compteurs passés au kit avatar (étincelles / flamme / gerbe : semaines d'affilée ; paliers : pouces cumulés) — null : option éteinte ou pas un opérateur */
export function cadCtxAvatar(X,p){if(!cadOn(X)||!cadMetier(p))return null;const b=cadBilan(X,p.id);return {cadence:b.mode==='serie'?b.serie:b.record,realisations:b.pouces};}
export const cadTexteKit=t=>REF&&REF.etinc==='serie'?String(t||'').replace(/^Record : /,'Série en cours : '):t; /* le kit écrit « Record » : en mode « série en cours », on le dit */
/* ═════════ 2 · FIGER LES SEMAINES TERMINÉES (appareil d'un responsable) ═════════ */
let FIGE_AT=0,FIGE_T=null,FIGE_OFF=false,FIGE_LAST=null,FIGE_TRY=0;const ECRIT={}; /* ECRIT : ce que CET appareil a figé (personne|semaine → valeur) — pour ne pas se disputer une semaine avec un autre appareil */
export const cadFigeStop=()=>{FIGE_OFF=true;}; /* le serveur a refusé l'écriture des compteurs sur ce compte : on n'insiste pas */
export const cadFigeEtat=()=>({at:FIGE_AT,off:FIGE_OFF,last:FIGE_LAST});
export function cadFigeSoon(X,force){if(FIGE_OFF||!cadOn(X)||X.viewing())return;if(!force&&Date.now()-FIGE_AT<600000)return;clearTimeout(FIGE_T);FIGE_T=setTimeout(()=>{try{cadFige(X.fresh?X.fresh():X);}catch(e){console.warn(e);}},force?0:1500);}
export function cadFige(X){if(FIGE_OFF||!cadOn(X)||X.viewing())return null;const acc=X.A.current();if(!acc)return null;const cloud=!!X.A.state.cloudUser;
  if(cloud){if(!(acc.admin||['chef','bureau'].includes(roleFor(acc))))return null;}else if(!acc.admin)return null; /* démonstration hors connexion : le personnage administrateur fige sur l'appareil */
  X.ops(true); /* lance la relecture des fiches du serveur (au plus toutes les 10 min par chantier) */
  const patch={};let n=0,retry=false,saute=0,conflit=0;
  [-3,-2,-1].forEach(k=>{const wk=X.weekKey(X.joursSem(k)[0]);if(cloud&&!X.weekLoaded(wk)){X.ensureWeeks([wk]);retry=true;return;}
    const R=cadWeek(X,k,true).R;Object.keys(R.par).forEach(id=>{const p=R.par[id];if(!(p.hp>0||p.hd>0))return; /* rien cette semaine-là : on n'écrit rien, on ne touche pas une valeur déjà figée */
      const mq=cadManque(X,id,k,true);if(mq.length){saute++;if(mq.some(x=>x.etat!=='plan'))retry=true;return;} /* plan ou fiches d'un de ses chantiers absents de cet appareil : un autre responsable figera (ou celui-ci, le chantier ouvert) */
      const cur=(X.compteurs(id)||{})[cadCle(wk)];const v=[p.hd,p.hp,p.po];if(Array.isArray(cur)&&cur[0]===v[0]&&cur[1]===v[1]&&cur[2]===v[2])return;
      /* un autre appareil a réécrit autre chose par-dessus ce que j'avais figé, et je recalcule toujours la même chose : je n'insiste pas (le dernier qui a écrit garde la main, pas d'aller-retour sans fin) */
      const ek=id+'|'+wk,sv=JSON.stringify(v);if(ECRIT[ek]===sv&&Array.isArray(cur)){conflit++;return;}
      (patch[id]=patch[id]||{})[cadCle(wk)]=v;ECRIT[ek]=sv;n++;});});
  Object.keys(patch).forEach(id=>X.saveCompteurs(id,patch[id]));
  /* des fiches (ou une semaine de planning) en cours de lecture : on réessaie tout seul après 2,5 s, 5 s… (6 essais), puis au prochain affichage après une minute ; sinon rendez-vous dans 10 min */
  if(retry){FIGE_AT=Date.now()-600000+60000;if(FIGE_TRY<6){FIGE_TRY++;clearTimeout(FIGE_T);FIGE_T=setTimeout(()=>{try{cadFige(X.fresh?X.fresh():X);}catch(e){console.warn(e);}},2500*FIGE_TRY);}}else{FIGE_AT=Date.now();FIGE_TRY=0;}
  FIGE_LAST={at:new Date().toISOString(),n,saute,conflit};
  if(n){X.invalidate();X.soft();}return FIGE_LAST;}
/* ═════════ 3 · ÉCRANS ═════════ */
function css(){if(typeof document==='undefined'||document.getElementById('cad-css'))return;const s=document.createElement('style');s.id='cad-css';
  s.textContent=`.cad-v{display:flex;align-items:center;gap:8px;font-weight:700;font-size:16px;margin:2px 0 8px;padding:8px 10px;border-radius:10px;background:#f4f3ee}
.cad-v.dessus{background:#e6f5ec;color:#15673a}.cad-v.dessous{background:#fdebe3;color:#9b3a12}.cad-v small{font-weight:400;font-size:12.5px;color:var(--ink2,#555)}
#cad-card .eq-tile b{white-space:nowrap;font-size:clamp(17px,5.4vw,24px)}
.cad-jour{border-top:1px solid var(--line,#e5e3dc);padding:8px 0}.cad-jour:first-child{border-top:0}.cad-jour>b{font-size:14px}
.cad-l{display:flex;justify-content:space-between;gap:10px;font-size:13.5px;padding:3px 0 3px 10px}.cad-l>span:first-child{flex:1;min-width:0}.cad-l b{white-space:nowrap}
.cad-l .hint{display:block}.cad-sous{padding-left:12px;border-left:2px solid var(--line,#e5e3dc);margin:2px 0 4px 10px}
.cad-h{display:flex;flex-wrap:wrap;gap:6px;margin-top:8px}.cad-h span{font-size:12px;border-radius:999px;padding:3px 9px;background:#f4f3ee;white-space:nowrap}
.cad-h .dessus{background:#e6f5ec;color:#15673a}.cad-h .dessous{background:#fdebe3;color:#9b3a12}
.cad-up{color:#15673a;font-weight:700}.cad-dn{color:#9b3a12;font-weight:700}
.cad-bar{overflow:auto;margin-top:8px}.cad-bar table{border-collapse:collapse;font-size:12.5px;white-space:nowrap}.cad-bar th,.cad-bar td{border:1px solid var(--line,#e5e3dc);padding:4px 7px;text-align:right}.cad-bar th{background:#f4f3ee;font-weight:600}.cad-bar td:first-child,.cad-bar th:first-child{text-align:left;font-weight:600}
.cad-set{display:grid;grid-template-columns:repeat(auto-fit,minmax(210px,1fr));gap:8px;margin:8px 0}.cad-set label{font-size:12.5px;color:var(--ink2,#555);display:block;margin-bottom:2px}`;document.head.appendChild(s);}
const pl=(n,a,b)=>n>1?b:a;
const hh=(X,h)=>X.fDuree(Math.max(0,Math.round((+h||0)*60)));
const signe=(X,h)=>(h<0?'− ':'+ ')+X.fDuree(Math.round(Math.abs(h)*60));
const cad1=x=>{const v=Math.round((+x||0)*10)/10;return String(v).replace('.',',');};
const prenoms=(X,ids)=>ids.map(id=>X.esc(X.pers(id).prenom||'?'));
const liste=a=>a.length<=1?a.join(''):a.slice(0,-1).join(', ')+' et '+a[a.length-1];
/* une ligne du calcul : « 8 soudures DN 100 × 1 h 00 = 8 h 00 » + d'où vient le chiffre */
function ligneHTML(X,L,moi){const e=X.esc;const dn=`DN ${e(L.dn)}`;const fois=L.hu?` × ${hh(X,L.hu)}`:'';let t='',note='';
  if(L.sans){const quoi=L.t==='soud'?'soudure':L.t==='manch'?'manchon':L.t==='dh'?'fils DH':L.t==='sst'?'point SST':(PAN_LAB[L.key]||'bout de ligne');
    return `<div class="cad-l"><span>${L.n} ${e(quoi)}${L.n>1&&!/s$/.test(quoi)&&L.t!=='dh'?'s':''} ${dn}<span class="hint">⚠ pas de cadence pour ça dans les cadences publiées : rien de débloqué — à voir avec le bureau</span></span><b>0 h 00</b></div>`;}
  if(L.t==='soud'){t=`${L.n} ${pl(L.n,'soudure','soudures')} ${dn}${fois}`;const avec=L.stp?'avec tuyauteur et chauffeur d\'engin':'avec tuyauteur';note=L.f>=1?`${avec} : ${cad1(L.cST)} / jour`:L.f<=0?`soudeur seul : ${cad1(L.cS)} / jour`:`un tuyauteur partagé (${Math.round(L.f*100)} % du temps) : entre ${cad1(L.cS)} / jour seul et ${cad1(L.cST)} / jour ${avec}`;}
  else if(L.t==='sst'||L.t==='bout'){const lab=L.t==='sst'?pl(L.n,'point SST','points SST'):(PAN_LAB[L.key]||'bout de ligne');t=`${L.n} ${e(lab)} ${dn}${fois}`;note=`panier « ${e(L.titre||'')} » : ${hh(X,L.pan)} de soudeur ${L.u===2?'la paire (aller + retour), un point = une conduite':'pour '+L.u+' points'}`;}
  else if(L.t==='dh'){t=`${L.n} fils DH ${dn} × ${cad1(L.min)} min`;note='fils raccordés + mesure';}
  else if(L.t==='manch'){t=`${L.n} ${pl(L.n,'manchon','manchons')} ${L.ext?'extrudé'+pl(L.n,'','s'):L.electro?'électro':'thermo'} ${dn}${fois}`;note=L.ext?`table d'extrusion, gaine Ø ${e(L.pehd)} (heures de l'équipe)`:L.g?`à deux : ${cad1(L.cMM)} / jour pour l'équipe (heures des deux)`:`seul : ${cad1(L.cM)} / jour`;}
  if(L.approx)note+=` · DN absent de la base : DN ${e(L.dn)} le plus proche`;if(L.late)note+=` · pointé le ${X.fJour(L.late)}, compté ce jour-là`;
  if(L.by&&moi&&L.by!==moi)note+=` · pointé par ${e(X.pers(L.by).prenom||'?')}`;
  return `<div class="cad-l"><span>${t}<span class="hint">${note}</span></span><b>${hh(X,L.h)}</b></div>`;}
function jourHTML(X,id,d,j){const e=X.esc;const moi=id===X.S.me;const T=moi?{ton:'ton',tes:'tes',ta:'ta'}:{ton:'son',tes:'ses',ta:'sa'};const g=j.eq||[];
  const equipe=g.map(q=>{const autres=[].concat(q.S,q.T,q.M).filter(x=>x!==id);const qui=autres.length?'avec '+liste(autres.map(x=>e(X.pers(x).prenom||'?')+' ('+e((X.poste(X.pers(x))||{}).label||'').toLowerCase()+')')):'seul sur le plan';return `${e(X.site(q.site).nom)}${q.e?' · équipe '+e(q.e):''} · ${qui}`;}).join(' ; ');
  const lignes=j.L.map(L=>{
    if(L.t==='recu')return `<div class="cad-l"><span>Reçu de ${L.nS>1?T.tes+' soudeurs '+liste(prenoms(X,L.de))+' (moyenne de leurs '+hh(X,L.somme)+')':T.ton+' soudeur '+prenoms(X,L.de)[0]}<span class="hint">${moi?'tu n\'as pas de pointage de production : tu reçois':'pas de pointage de production pour un tuyauteur : il reçoit'} les heures débloquées par ${L.nS>1?T.tes+' soudeurs':T.ton+' soudeur'} ce jour-là</span></span><b>${hh(X,L.h)}</b></div>`;
    if(L.t==='pot'){const sous=(L.lignes||[]).map(x=>ligneHTML(X,x,id)).join('');if(L.part>=0.999)return sous;
      return `<div class="cad-l"><span>Équipe de ${L.avec.length+1} manchonneurs (avec ${liste(prenoms(X,L.avec))}) : ${hh(X,L.pot)} débloquées ensemble<span class="hint">partagées au prorata des heures pointées ce jour-là : ${T.ta} part ${Math.round(L.part*100)} %</span></span><b>${hh(X,L.h)}</b></div><div class="cad-sous">${sous}</div>`;}
    return ligneHTML(X,L,id);}).join('');
  const hors=j.hors?`<div class="cad-l"><span>${hh(X,j.hors)} pointées sans soudeur dans ${T.ton} équipe<span class="hint">journée pas comptée (ni pour, ni contre)</span></span><b>—</b></div>`:'';
  return `<div class="cad-jour"><b>${X.fJour(d)}</b> <span class="eq-s">· ${j.hp?hh(X,j.hp)+' pointées':(j.hors?'pas comptée':'pas d\'heures pointées')} → ${hh(X,j.hd)} débloquées${equipe?' · '+equipe:''}</span>${lignes||(!hors?'<div class="cad-l"><span class="hint">Aucune production pointée à '+T.ton+' nom ce jour-là.</span><b>0 h 00</b></div>':'')}${hors}</div>`;}
export function cadDetailHTML(X,id,k){const M=cadMoi(X,id,k);const p=M.p;if(!p)return `<div class="eq-s">${M.fige?'Semaine figée par le bureau : le détail jour par jour n\'est plus sur cet appareil (chantiers d\'il y a plus de deux semaines).':'Rien à détailler : pas d\'heures pointées ni de production sur le plan cette semaine.'}</div>`;
  const rows=M.W.js.filter(d=>p.jours[d]).map(d=>jourHTML(X,id,d,p.jours[d])).join('');
  return `${rows}<div class="cad-jour"><b>Total de la semaine</b><div class="cad-l"><span>Heures débloquées par la production</span><b>${hh(X,p.hd)}</b></div><div class="cad-l"><span>Heures de travail pointées${p.hpTot>p.hp+0.01?' <span class="hint">sur '+hh(X,p.hpTot)+' pointées : les jours sans soudeur ne comptent pas</span>':'<span class="hint">pause et trajet inter-chantier exclus</span>'}</span><b>${hh(X,p.hp)}</b></div>
    ${M.diff?`<div class="hint">Chiffre retenu (figé par le bureau, tous chantiers) : ${hh(X,M.hd)} débloquées pour ${hh(X,M.hp)} pointées. Le détail ci-dessus est celui que cet appareil peut recalculer.</div>`:''}</div>`;}
/* le plan (ou les fiches) d'un chantier de la semaine n'est pas sur cet appareil : on le dit, avec le bouton pour l'ouvrir */
function manqueHTML(X,M,moi){if(!M.manque||!M.manque.length)return '';const e=X.esc;const plan=M.manque.filter(x=>x.etat==='plan'),att=M.manque.filter(x=>x.etat!=='plan');
  return `<div class="cm-ctrlv" id="cad-manque" style="background:#fff4d6;color:#7a5a00">⚠ Calcul incomplet sur cet appareil${plan.length?' : le plan de '+liste(plan.map(x=>'« '+e(X.site(x.site).nom)+' »'))+' n\'y est pas. Ouvre le chantier une fois, puis reviens ici.':''}${att.length?' Fiches de soudure de '+liste(att.map(x=>'« '+e(X.site(x.site).nom)+' »'))+' en cours de lecture…':''}${plan.length?`<div class="eq-acts" style="margin-top:6px">${plan.slice(0,4).map(x=>`<button class="btn" data-act="opensite" data-v="${e(x.site)}">Ouvrir ${e(X.site(x.site).nom)}</button>`).join('')}</div>`:''}</div>`;}
const verdict=(X,M)=>{const et=M.et;if(M.manque&&M.manque.length)return ['','Calcul incomplet','il manque des chantiers sur cet appareil : le chiffre ci-dessous est partiel'];if(et.k==='neutre')return et.why==='heures'?['','Semaine pas comptée',`moins de ${cad1(et.min)} h pointées${M.k===0?' pour l\'instant':''} : ni pour, ni contre`]:['','Semaine pas comptée','aucune production pointée sur le plan : ni pour, ni contre'];
  const d=M.hd-M.hp;return et.k==='dessus'?['dessus',M.k===0?'Pour l\'instant : au-dessus de la cadence':'Au-dessus de la cadence',signe(X,d)+' d\'avance']:['dessous',M.k===0?'Pour l\'instant : en dessous de la cadence':'En dessous de la cadence','il manque '+X.fDuree(Math.round(Math.abs(d)*60))];};
/* carte de l'onglet Productions (opérateur) : la semaine choisie, la série, le détail du calcul */
export function cadCardHTML(X,me){if(!cadOn(X)||!cadMetier(me))return '';css();const S=X.S;const k=S.per&&S.per.mode==='sem'?(S.per.k||0):0;const M=cadMoi(X,me.id,k);const B=cadBilan(X,me.id);const js=M.W.js;const v=verdict(X,M);const inc=M.manque.length>0; /* un chantier de la semaine manque sur cet appareil : pas de verdict, pas de chiffre partiel présenté comme un résultat */const cle='cad|det';const open=!!S.open[cle];
  const unite=me.poste==='manchonneur'?'pouces manchonnés':me.poste==='tuyauteur'?'pouces soudés par ton soudeur':'pouces soudés';const cetteSem=k===0&&M.p?M.p.po:0;
  const quoi=me.poste==='soudeur'?'étincelle':me.poste==='manchonneur'?'flamme':'gerbe';
  const hist=B.L.slice(-10).map(x=>`<span class="${x.k==='neutre'?'':x.k}" title="${X.esc(hh(X,x.hd)+' débloquées · '+hh(X,x.hp)+' pointées')}">S${x.w.slice(-2).replace(/^0/,'')} ${x.k==='dessus'?'▲':x.k==='dessous'?'▼':'·'}</span>`).join('');
  return `<div class="card" id="cad-card"><h3>⚡ Cadence <span class="hint">· semaine ${X.numSemaine(js[0])} · du ${X.fDate(js[0]).slice(0,5)} au ${X.fDate(js[6]).slice(0,5)}${k===0?' · en cours':M.src==='fige'?' · figée':' · provisoire'}</span></h3>
    ${inc?manqueHTML(X,M,true):`<div class="cad-v ${v[0]}"><span>${v[0]==='dessus'?'▲':v[0]==='dessous'?'▼':'•'}</span> <span>${v[1]} <br><small>${v[2]}</small></span></div>`}
    <div class="eq-tiles"><div class="eq-tile"><b>${inc?'—':hh(X,M.hd)}</b><span class="eq-s">débloquées par ta production</span></div><div class="eq-tile"><b>${hh(X,M.hp)}</b><span class="eq-s">${me.poste==='tuyauteur'?'pointées avec ton soudeur':'de travail pointées'}</span></div><div class="eq-tile"><b>${B.serie}</b><span class="eq-s">${pl(B.serie,'semaine','semaines')} d'affilée au-dessus · record ${B.record}</span></div></div>
    <div class="eq-s" style="margin-top:8px">${B.mode==='serie'?`Ton avatar porte ta série en cours : une ${quoi==='flamme'?'flamme qui grossit':quoi} par semaine au-dessus ; une semaine en dessous la remet à zéro.`:`Ton avatar porte ton record : ${quoi==='flamme'?'la flamme grossit':'une '+quoi+' de plus'} quand ta série dépasse ton record ; une semaine en dessous arrête la série, le record reste acquis.`} La semaine en cours comptera lundi.</div>
    <div class="eq-s">${X.nb(B.pouces)} ${unite} sur les semaines terminées${cetteSem?' · + '+X.nb(Math.round(cetteSem))+' cette semaine':''} <span class="hint">· paliers de l'avatar : Bronze 11 000, Argent 22 500, Or 34 000, Diamant 56 000</span></div>
    ${hist?`<div class="cad-h">${hist}</div>`:''}
    <button class="eq-row" style="margin-top:8px" data-act="jour" data-v="${cle}" aria-expanded="${open}"><span class="eq-grow"><span class="eq-t">Comment c'est calculé</span><span class="eq-s">jour par jour : ce que tu as pointé sur le plan, les heures que ça débloque, tes heures pointées</span></span><span class="hint">${open?'▲':'▼'}</span></button>
    ${open?`<div id="cad-detail">${cadDetailHTML(X,me.id,k)}</div><div class="hint" style="margin-top:6px">Chaque opération pointée sur le plan à ton nom débloque les heures prévues au chiffrage (cadences de la base de prix${REF.base&&REF.base.version?' '+X.esc(REF.base.version):''}, publiées le ${X.fDate(String(REF.at||'').slice(0,10))}). Si tu débloques au moins autant d'heures que tu en pointes dans la semaine (${cad1(REF.minH||CAD_MINH)} h pointées au minimum), la semaine est au-dessus. Une erreur ? Vois avec ton chef de chantier.</div>`:''}</div>`;}
/* résumé d'une semaine, à droite du bloc « Semaine NN » de l'onglet Productions */
export function cadDroite(X,me,k){if(!cadOn(X)||!cadMetier(me))return '';const M=cadMoi(X,me.id,k);if(M.et.k==='neutre'||M.manque.length)return '';const d=M.hd-M.hp;return `<span class="${M.et.k==='dessus'?'cad-up':'cad-dn'}">⚡ ${M.et.k==='dessus'?'▲':'▼'} ${signe(X,d)}</span>`;}
/* Pilotage → Production par équipe : colonne « Débloqué » d'une personne pour la semaine k, détail au toucher */
export function cadCell(X,p,k){if(!cadOn(X))return null;css();if(!cadMetier(p))return {th:'⚡ Débloqué',td:'<td class="num"><span class="dim">—</span></td>',detail:''};const M=cadMoi(X,p.id,k);const cle='cadp|'+p.id;const open=!!X.S.open[cle];const et=M.manque.length?'neutre':M.et.k;
  if(M.manque.length)return {th:'⚡ Débloqué',td:`<td class="num"><button class="btn sm ghost" data-act="jour" data-v="${cle}" title="Calcul incomplet sur cet appareil" aria-expanded="${open}">? <span class="dim">incomplet</span></button></td>`,detail:open?`<tr><td colspan="5" style="white-space:normal">${manqueHTML(X,M,false)}</td></tr>`:''};
  const td=`<td class="num">${M.hd||M.hp?`<button class="btn sm ghost" data-act="jour" data-v="${cle}" title="Détail du calcul" aria-expanded="${open}">${hh(X,M.hd)} <span class="${et==='dessus'?'cad-up':et==='dessous'?'cad-dn':'dim'}">${et==='dessus'?'▲':et==='dessous'?'▼':'·'}</span></button>`:'<span class="dim">—</span>'}</td>`;
  return {th:'⚡ Débloqué',td,detail:open?`<tr><td colspan="5" style="white-space:normal"><div class="eq-s" style="margin-bottom:4px"><b>${X.esc(X.nomC(p))}</b> · ${hh(X,M.hd)} débloquées pour ${hh(X,M.hp)} pointées${et==='neutre'?' · semaine pas comptée':et==='dessus'?' · au-dessus':' · en dessous'}${M.src==='fige'?' · figée':''}</div>${cadDetailHTML(X,p.id,k)}</td></tr>`:''};}
/* ═════════ 4 · PUBLICATION (Commerce → Base de prix) ═════════ */
const sig=r=>r?JSON.stringify([r.H,r.minH,r.etinc,r.pour==='tous'?'tous':'enc',r.dn,r.pan,r.ext]):'';
const optOf=()=>({sst:OPT.sst||(REF&&REF.pan&&REF.pan.sst&&REF.pan.sst.id)||undefined,minH:OPT.minH||(REF&&REF.minH)||CAD_MINH,etinc:OPT.etinc||(REF&&REF.etinc)||'record',pour:OPT.pour||(REF&&REF.pour)||'enc'});
function baremeHTML(X,ref){const B=cadBareme(ref);if(!B.length)return '';const pk=['sst','pec','insertion','attente','fonds','bypass'].filter(k=>ref.pan&&ref.pan[k]);const f=h=>h>0?hh(X,h):'—';
  const TH={sst:'Point SST',pec:'Piquage en charge',insertion:'Insertion de tés',attente:'Sur attente',fonds:'Fond bombé',bypass:'By-pass'};
  return `<div class="cad-bar"><table><tr><th>DN</th><th>Pouces</th><th>Soudure <br>soudeur seul</th><th>Soudure <br>avec tuyauteur</th><th>Soudure <br>tuyauteur + chauffeur</th><th>Manchon thermo <br>seul</th><th>Manchon thermo <br>à deux, chacun</th><th>Manchon électro <br>seul</th><th>Fils DH</th>${pk.map(k=>`<th>${TH[k]} <br>le point, soudeur</th>`).join('')}</tr>
    ${B.map(b=>`<tr><td>DN ${b.dn}</td><td>${cad1(b.po)}</td><td>${f(b.soudS)}</td><td>${f(b.soudST)}</td><td>${f(b.soudSTP)}</td><td>${f(b.manchM)}</td><td>${f(b.manchMM)}</td><td>${f(b.electroM)}</td><td>${b.dh>0?cad1(b.dh*60)+' min':'—'}</td>${pk.map(k=>`<td>${f(b.pan[k])}</td>`).join('')}</tr>`).join('')}</table></div>
    <div class="hint" style="margin-top:4px">Heures débloquées par UNE opération pointée (${cad1(ref.H)} h par jour ÷ cadence, classe d'isolation 2 pour les manchons). Un point de bout de ligne = une conduite = la moitié du panier (chiffré à la paire).${ref.pan&&ref.pan.sst?' Panier SST de référence : « '+X.esc(ref.pan.sst.t)+' ».':''} Un DN absent prend le DN le plus proche.</div>`;}
export function cadAdminHTML(X,base,ctx){if(!X.featOn('cadence')||!base)return '';css();const e=X.esc;const acc=X.A.current()||{};const admin=!!acc.admin&&!X.viewing();const o=optOf();let prev=null;try{prev=cadRef(base,Object.assign({},o,{rev:revOf(base)}));}catch(x){console.warn(x);}
  if(!prev)return '';let types=[];try{types=sstTypes(base);}catch(x){types=[];}const open=!!X.S.open['cad|bar'];const change=!!REF&&sig(REF)!==sig(cadRef(base,{sst:REF.pan&&REF.pan.sst&&REF.pan.sst.id,minH:REF.minH,etinc:REF.etinc,pour:REF.pour}));const reglages=!!REF&&sig(REF)!==sig(prev)&&!change;
  const etat=REF?`<div class="cm-ctrlv ok">✓ Publiées le ${X.fDate(String(REF.at||'').slice(0,10))}${REF.par?' par '+e(REF.par):''}${REF.base&&REF.base.version?' · base '+e(REF.base.version):''} — ${REF.pour==='tous'?'les équipes les voient dans Compagnon → Productions, les avatars suivent.':'<b>en essai : l\'encadrement seulement</b> (chefs, conducteurs, bureau : Pilotage → Production par équipe, colonne « ⚡ Débloqué »). Les compagnons ne voient rien tant que tu n\'as pas choisi « les équipes aussi ».'}</div>${change?'<div class="cm-ctrlv" style="background:#fff4d6;color:#7a5a00">⚠ La base de prix a changé depuis : les équipes sont toujours sur les cadences publiées. « Publier » applique la base actuelle (à partir de la semaine en cours et des trois dernières).</div>':''}${reglages?'<div class="cm-ctrlv" style="background:#fff4d6;color:#7a5a00">Réglages modifiés ci-dessous : pas encore publiés.</div>':''}`
    :`<div class="cm-ctrlv" style="background:#f4f3ee;color:var(--ink2)">Pas encore publiées : personne ne voit rien (ni la carte « Cadence » des Productions, ni étincelles calculées). Commence par un essai « encadrement seulement » : tu vérifies les chiffres avec tes chefs avant que les compagnons les voient.</div>`;
  const set=admin?`<div class="cad-set"><div><label>Panier SST de référence (un point SST pointé)</label><select class="f" data-xin="cad|sst">${types.map(t=>`<option value="${e(t.id)}"${t.id===(prev.pan.sst&&prev.pan.sst.id)?' selected':''}>${e(t.name)}</option>`).join('')||'<option value="">aucun panier SST dans la base</option>'}</select></div>
      <div><label>Heures pointées minimum pour qu'une semaine compte</label><input class="f" type="number" min="1" max="60" step="1" inputmode="numeric" data-xin="cad|minH" value="${e(o.minH)}"></div>
      <div><label>Ce que porte l'avatar</label><select class="f" data-xin="cad|etinc"><option value="record"${o.etinc==='record'?' selected':''}>le record de semaines d'affilée (reste acquis)</option><option value="serie"${o.etinc==='serie'?' selected':''}>la série en cours (retombe à zéro)</option></select></div>
      <div><label>Qui voit la cadence</label><select class="f" data-xin="cad|pour"><option value="enc"${o.pour!=='tous'?' selected':''}>l'encadrement seulement — essai</option><option value="tous"${o.pour==='tous'?' selected':''}>les équipes aussi (Productions, avatars)</option></select></div></div>
    <div class="eq-acts"><button class="btn primary" data-act="x" data-v="cad|pub"${OPT.busy?' disabled':''}>${REF?'↻ Publier à nouveau':'Publier les cadences'}${o.pour==='tous'?' aux équipes':' (essai : encadrement seulement)'}</button>${REF?`<button class="btn" data-act="x" data-v="cad|off"${OPT.busy?' disabled':''}>⏸ Suspendre</button>`:''}</div>`
    :`<div class="hint">Publier ou suspendre : réservé à l'administrateur.</div>`;
  return `<div class="card" id="cad-admin"><h3>⚡ Cadences de production <span class="hint">· heures débloquées par la production des équipes, avatars (étincelles, paliers)</span></h3>
    <div class="eq-s">Chaque opération pointée sur un plan débloque les heures prévues ici : soudure = heures du jour ÷ cadence du DN, point SST / raccordement / by-pass = heures « soudeur » du panier, manchon = heures du jour ÷ cadence. La semaine d'un compagnon est au-dessus quand il débloque au moins autant d'heures qu'il en pointe. <b>Ce qui part aux équipes : des cadences et des heures — aucun prix, aucun taux.</b></div>
    ${etat}${set}
    <button class="eq-row" style="margin-top:8px" data-act="jour" data-v="cad|bar" aria-expanded="${open}"><span class="eq-grow"><span class="eq-t">Voir le barème${REF&&!change&&!reglages?' publié':' de la base actuelle'}</span><span class="eq-s">heures débloquées par opération, DN par DN — à relire avant de publier</span></span><span class="hint">${open?'▲':'▼'}</span></button>
    ${open?baremeHTML(X,prev):''}</div>`;}
export function cadInput(X,champ,el){if(champ==='sst')OPT.sst=el.value||null;else if(champ==='minH'){const n=Math.round(+String(el.value||'').replace(',','.'));OPT.minH=n>=1&&n<=60?n:null;}else if(champ==='etinc')OPT.etinc=el.value==='serie'?'serie':'record';else if(champ==='pour')OPT.pour=el.value==='tous'?'tous':'enc';X.render();}
export async function cadAct(X,v,base){const acc=X.A.current()||{};if(v!=='pub'&&v!=='off')return;if(X.viewing()){X.msg('Lecture seule : tu regardes le compte de quelqu\'un d\'autre');return;}if(!acc.admin){X.msg('Réservé à l\'administrateur');return;}if(OPT.busy)return;
  let next=null;if(v==='pub'){if(!base){X.msg('Pas de base de prix : importe d\'abord le classeur');return;}try{next=cadRef(base,Object.assign({},optOf(),{rev:revOf(base),par:X.A.userName?X.A.userName():''}));}catch(e){console.warn(e);}if(!next){X.msg('Cadences illisibles dans la base de prix');return;}}
  else next={v:0,off:true,at:new Date().toISOString(),par:X.A.userName?X.A.userName():''};
  OPT.busy=true;try{if(X.A.state.cloudUser&&X.A.sync&&X.A.sync.setSetting){const err=await X.A.sync.setSetting(CAD_KEY,next);if(err){X.msg(err==='hors ligne'?'Connexion au serveur perdue — rien n\'a changé':'Non publié : '+(err.message||err));return;}}
    keep(next);OPT.sst=OPT.minH=OPT.etinc=OPT.pour=null;FIGE_AT=0;FIGE_TRY=0;X.invalidate();X.msg(v==='pub'?(next.pour==='tous'?'Cadences publiées : les équipes les voient dans Compagnon → Productions':'Cadences publiées en essai : l\'encadrement seulement'):'Cadences suspendues : plus rien d\'affiché');}
  finally{OPT.busy=false;X.render();if(v==='pub')cadFigeSoon(X,true);}}
/* tests / diagnostic */
export const cadTest={ref:()=>REF,set:v=>keep(v),opt:()=>OPT,figeReset:()=>{FIGE_AT=0;FIGE_OFF=false;FIGE_TRY=0;}};
