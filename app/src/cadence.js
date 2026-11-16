// cadence.js — 16/11/2026 (lot CA) — Ethan : « pour les gars, le calcul de s'ils ont produit plus que prévu en une semaine (avatar : étincelles, avancée de la médaille) :
// il faut se référer aux cadences des paniers de chiffrage — si une sous-station est faite, ça va chercher le nombre d'heures de soudeur, pareil pour le nombre de soudures
// à la journée ; si le soudeur / l'équipe a pointé moins d'heures que le nombre d'heures débloqué par les productions pointées, ils sont au-dessus (étincelle), et
// inversement ; détail du calcul visible dans l'onglet Productions de chacun ».
// LOGIQUE PURE (aucun accès à l'écran ni au serveur ; testée dans Node : test/unit_cadence.mjs) :
//  · cadRef(base, opt)   : la RÉFÉRENCE publiée aux équipes, extraite de la base de prix — soudures / jour, manchons / jour, minutes de fils DH, heures de main-d'œuvre
//                          des paniers (SST, raccordements, fonds bombés, by-pass), manchons extrudés, pouces par DN. AUCUN prix, AUCUN taux horaire n'en sort.
//  · cadSoud / cadPan / cadManch / cadDH : le BARÈME — les heures que débloque UNE opération pointée sur le plan.
//  · cadSemaine(ref, W)  : une semaine — heures débloquées et heures pointées de chaque opérateur, jour par jour, avec les lignes du calcul.
//  · cadEtat, cadSerie, cadCompteurs : au-dessus / en dessous / semaine neutre ; série en cours et record ; lecture des semaines figées (fiche personne, « compteurs »).
// RÈGLES (hypothèses annoncées à Ethan le 16/11 — chacune tient en une ligne ici, à ajuster) :
//  1. Une soudure pointée (étape ①) débloque heures du jour ÷ cadence du DN : cadence « S+T » quand le soudeur a un tuyauteur dans son équipe du jour (« S+T+P » si un
//     chauffeur d'engin est aussi dans l'équipe, ou sur le chantier sans lettre d'équipe), « S » quand il est seul ; un tuyauteur pour deux soudeurs = moitié / moitié
//     (f = tuyauteurs ÷ soudeurs, plafonné à 1). Le chauffeur choisit la cadence, il n'est pas compté lui-même (pas de récompense de cadence pour lui dans le kit avatar).
//  2. Un point de bout de ligne pointé (point SST, raccordement, fin de ligne, by-pass) débloque les heures « soudeur » du panier de la base au DN, divisées par 2 :
//     le panier est chiffré à la paire (aller + retour), un point = une conduite. Les heures « manchonneur » du même panier vont aux manchonneurs de l'équipe du jour.
//  3. Un manchon pointé (étape ③) débloque heures du jour ÷ cadence (type thermo / électro, classe d'isolation du chantier) : cadence « M » seul, « M+M » à deux
//     (2 personnes) ; les fils DH (étape ②) débloquent leurs minutes. Le moussage (étape ④) est compris dans la cadence du manchon.
//  4. L'ÉQUIPE = même chantier, même lettre d'équipe du planning, même jour (sans lettre : tout le chantier). Le soudeur est compté sur ses propres soudures ;
//     le tuyauteur (pas de pointage propre) reçoit la moyenne des heures débloquées par les soudeurs de son équipe du jour, et seuls comptent ses jours avec un soudeur ;
//     les manchonneurs d'une même équipe mettent leurs manchons en commun et se les partagent au prorata de leurs heures du jour (à deux, un seul pointe souvent).
//  5. Heures pointées = temps de travail du pointage (pause et trajet inter-chantier exclus). Une opération pointée un jour sans heures (le samedi, le lendemain)
//     compte sur le dernier jour travaillé d'avant dans la semaine.
//  6. La semaine COMPTE si au moins ref.minH heures pointées et au moins une production : au-dessus si débloqué ≥ pointé, sinon en dessous. Une semaine qui ne compte
//     pas (congés, formation, semaine sans production sur le plan) est neutre : elle ne casse pas la série et ne l'allonge pas.
import {panierOf,panierRow,sstTypes,raccTypes} from './prix.js';
export const CAD_KEY='cadences_prod'; /* réglage partagé (app_settings) : lisible par tout compte actif, écrit par l'administrateur */
export const CAD_MINH=20;
const num=v=>typeof v==='number'&&isFinite(v)?v:(v===null||v===undefined||v===''?0:(isFinite(+v)?+v:0));
const r2=x=>Math.round(x*100)/100;
const c01=x=>Math.max(0,Math.min(1,+x||0));
/* composition d'une équipe de la base (S, T, M) : la table des équipes, sinon le code lu lettre par lettre (« OS » n'est pas un soudeur) */
function compOf(base,eq){const code=String(eq||'').replace(/\s+/g,'').toUpperCase();const e=((base.mo||{}).equipes||[]).find(x=>x&&String(x.code||'').replace(/\s+/g,'').toUpperCase()===code);
  if(e&&e.comp)return {S:num(e.comp.Soudeur),T:num(e.comp.Tuyauteur),M:num(e.comp.Manchonneur)};
  const o={S:0,T:0,M:0};code.split('+').forEach(t=>{if(t==='S'||t==='T'||t==='M')o[t]++;});return o;}
/* ═════════ 1 · RÉFÉRENCE PUBLIÉE ═════════ */
export const PAN_LAB={sst:'point SST',pec:'raccordement — piquage en charge',insertion:'raccordement — insertion de tés',attente:'raccordement sur attente',fonds:'fin de ligne — fond bombé',bypass:'by-pass'};
const RACC_RE={pec:/piquage|en charge|\bpec\b/i,insertion:/insertion|\bt[ée]s?\b/i,attente:/attente/i};
export function cadRef(base,opt){opt=opt||{};if(!base||!base.mo||!Array.isArray(base.mo.cad)||!base.mo.cad.length)return null;
  const H=num(base.mo.hJour)||10;const cadDnB=d=>base.mo.cad.find(c=>c&&num(c.dn)===num(d))||null;
  const tbl=t=>[0,1,2].map(i=>{const r=(t&&t[i])||[];return [num(r[0]),num(r[1])];});
  const dn=base.mo.cad.filter(c=>c&&num(c.dn)>0).map(c=>({dn:num(c.dn),po:num(c.pouce)||r2(num(c.dn)/25),s:[num((c.soud||{}).S),num((c.soud||{})['S+T']),num((c.soud||{})['S+T+P'])],mt:tbl((c.manch||{}).thermo),me:tbl((c.manch||{}).electro),dh:num((c.ctrl||{}).filsDH)})).sort((a,b)=>a.dn-b.dn);
  /* heures d'une ligne « k soudures à la cadence » (colonne 3 = S, 4 = S+T, 5 = S+T+P du classeur) */
  const hRef=(h,hf,d)=>{let v=num(h);if(hf&&num(hf.k)>0){const c=cadDnB(d);const cad=c?num(hf.col===3?(c.soud||{}).S:hf.col===4?(c.soud||{})['S+T']:(c.soud||{})['S+T+P']):0;if(cad>0)v=num(hf.k)*H/cad;}return v;};
  /* un panier → par DN : [heures du soudeur, heures-personne des manchonneurs] (les lignes « OS », chauffeur… ne débloquent rien ici) */
  const pan=pid=>{if(!pid)return null;let P=null;try{P=panierOf(base,pid);}catch(e){P=null;}if(!P||!Array.isArray(P.rows)||!P.rows.length)return null;const o={};
    P.rows.forEach(r=>{let row=null;try{row=panierRow(base,pid,r.dn);}catch(e){row=null;}if(!row)return;let s=0,m=0;(row.mo||[]).forEach(L=>{const c=compOf(base,L.eq);const h=num(L.h);if(c.S>0)s+=h;if(c.M>0)m+=h*c.M;});if(s>0||m>0)o[num(r.dn)]=[r2(s),r2(m)];});
    return Object.keys(o).length?{id:pid,t:String(P.title||pid),u:2,dn:o}:null;};
  const P={};let sstL=[];try{sstL=sstTypes(base);}catch(e){sstL=[];}const sstId=sstL.some(x=>x.id===opt.sst)?opt.sst:(sstL[0]||{}).id;const sst=pan(sstId);if(sst)P.sst=sst;
  let rL=[];try{rL=raccTypes(base);}catch(e){rL=[];}Object.keys(RACC_RE).forEach(k=>{const t=rL.find(x=>RACC_RE[k].test(x.name||'')||RACC_RE[k].test(x.id||''));const p=t?pan(t.id):null;if(p)P[k]=p;});
  const bp=fonds=>{const o={};(((base.op||{}).bypass)||[]).forEach(r=>{if(!r||!num(r.dn))return;const h=hRef(fonds?r.hFonds:r.hBypass,fonds?r.hfF:r.hfB,r.dn);if(!(h>0))return;const c=compOf(base,r.eq||'S+T');o[num(r.dn)]=[c.S>0||!c.M?r2(h):0,c.M>0?r2(h*c.M):0];});return Object.keys(o).length?o:null;};
  const f=bp(true);if(f)P.fonds={id:'fonds',t:'BY-PASS - FONDS BOMBÉS (fonds bombés)',u:2,dn:f};const b=bp(false);if(b)P.bypass={id:'bypass',t:'BY-PASS - FONDS BOMBÉS (by-pass)',u:2,dn:b};
  const ext={};(((base.op||{}).extrusion||{}).rows||[]).forEach(r=>{const h=num(r&&r.h&&r.h.manchons);if(!r||!num(r.dnPehd)||!(h>0))return;const c=compOf(base,r.eq||'M+M');ext[num(r.dnPehd)]=r2(h*Math.max(1,c.M));});
  return {v:1,at:opt.at||new Date().toISOString(),par:String(opt.par||''),base:{version:String(base.version||''),rev:String(opt.rev||'')},H,minH:num(opt.minH)>0?num(opt.minH):CAD_MINH,etinc:opt.etinc==='serie'?'serie':'record',pour:opt.pour==='tous'?'tous':'enc' /* qui voit : l'encadrement seulement (essai, par défaut) ou les équipes aussi */,dn,pan:P,ext};}
/* une référence reçue (serveur, appareil) : forme attendue, sinon null — on n'affiche rien plutôt qu'un calcul faux */
export function cadRefOk(r){return !!(r&&typeof r==='object'&&r.v===1&&Array.isArray(r.dn)&&r.dn.length&&r.dn.every(x=>x&&num(x.dn)>0&&Array.isArray(x.s)));}
/* ═════════ 2 · BARÈME ═════════ */
const near=(keys,d)=>{let best=null;keys.forEach(k=>{if(best===null||Math.abs(k-d)<Math.abs(best-d)||(Math.abs(k-d)===Math.abs(best-d)&&k<best))best=k;});return best;};
export function cadDn(ref,dn){const d=num(parseFloat(dn));if(!ref||!Array.isArray(ref.dn)||!(d>0))return null;const k=near(ref.dn.map(r=>r.dn),d);const r=ref.dn.find(x=>x.dn===k);return r?{r,approx:k!==d}:null;} /* DN absent du tableau : le plus proche, signalé */
/* une soudure : f = part du temps avec tuyauteur (0 = seul → cadence S ; 1 = cadence S+T, ou S+T+P quand p : un chauffeur d'engin est dans l'équipe) */
export function cadSoud(ref,dn,f,p){const x=cadDn(ref,dn);if(!x)return null;const H=num(ref.H)||10;const cS=num(x.r.s[0]),c1=num(x.r.s[1]),c2=num(x.r.s[2]);const stp=!!p&&c2>0;const cST=stp?c2:(c1||c2);const a=cST>0?H/cST:(cS>0?H/cS:0),b=cS>0?H/cS:a;f=c01(f);
  return {h:f*a+(1-f)*b,hS:b,hST:a,cS,cST,stp,f,dn:x.r.dn,approx:x.approx,po:num(x.r.po)};}
const END_PAN={sousstation:'sst',chaufferie:'sst',attente_chaufferie:'sst',endpoint:'sst',pec:'pec',insertion:'insertion',attente:'attente',kit:'fonds',endcap:'fonds',provisoire:'fonds',fondbombe_regard:'fonds',bypass:'bypass',bypass_regard:'bypass',bypass_extrusion:'bypass',bypassEnd:'bypass'};
export const cadPanKey=(end,k)=>END_PAN[end]||(k==='sst'?'sst':null);
/* un point de bout de ligne : heures du soudeur (hS) et heures-personne des manchonneurs (phM), pour UN point (le panier vaut u points : 2 = aller + retour) */
export function cadPan(ref,key,dn){const P=ref&&ref.pan&&ref.pan[key];const d=num(parseFloat(dn));if(!P||!P.dn||!(d>0))return null;const ks=Object.keys(P.dn).map(Number).filter(n=>n>0);if(!ks.length)return null;const k=near(ks,d);const v=P.dn[k]||P.dn[String(k)]||[0,0];const u=num(P.u)||2;
  return {hS:num(v[0])/u,phM:num(v[1])/u,pan:num(v[0]),u,t:P.t,key,dn:k,approx:k!==d};}
/* un manchon : g = part du temps à deux manchonneurs (0 = seul → cadence M ; 1 = cadence M+M, 2 personnes) ; iso = classe d'isolation (1 à 3) ; extrudé : table d'extrusion (DN de la gaine PEHD) */
export function cadManch(ref,dn,type,iso,g,pehd){const H=num(ref&&ref.H)||10;
  if(type==='extrude'&&ref&&ref.ext&&Object.keys(ref.ext).length){const ks=Object.keys(ref.ext).map(Number).filter(n=>n>0);const d=num(pehd)||0;const k=d>0?near(ks,d):null;if(k!==null){const x=cadDn(ref,dn);return {ph:num(ref.ext[k]),ext:true,pehd:k,approx:k!==d,dn:x?x.r.dn:num(parseFloat(dn)),po:x?num(x.r.po):0,g:1};}}
  const x=cadDn(ref,dn);if(!x)return null;const T=(type==='electro'?x.r.me:x.r.mt)||[];const row=T[Math.max(0,Math.min(2,(Math.round(num(iso))||2)-1))]||T[0]||[0,0];const cMM=num(row[0]),cM=num(row[1]);
  const b=cM>0?H/cM:(cMM>0?2*H/cMM:0),a=cMM>0?2*H/cMM:b;g=c01(g);return {ph:g*a+(1-g)*b,phM:b,phMM:a,cM,cMM,g,electro:type==='electro',dn:x.r.dn,approx:x.approx,po:num(x.r.po)};}
export function cadDH(ref,dn){const x=cadDn(ref,dn);return x?{h:num(x.r.dh)/60,min:num(x.r.dh),dn:x.r.dn,approx:x.approx}:null;}
/* tableau du barème (écran de publication, « Voir le barème ») : une ligne par DN, en heures */
export function cadBareme(ref){if(!cadRefOk(ref))return [];const pk=Object.keys(ref.pan||{});
  return ref.dn.map(r=>{const s=cadSoud(ref,r.dn,0),st=cadSoud(ref,r.dn,1),stp=cadSoud(ref,r.dn,1,true),m=cadManch(ref,r.dn,'thermo',2,0),mm=cadManch(ref,r.dn,'thermo',2,1),e=cadManch(ref,r.dn,'electro',2,0),dh=cadDH(ref,r.dn);const o={dn:r.dn,po:r.po,soudS:s?s.hS:0,soudST:st?st.hST:0,soudSTP:stp&&stp.stp?stp.hST:0,manchM:m?m.phM:0,manchMM:mm?mm.phMM/2:0,electroM:e?e.phM:0,dh:dh?dh.h:0,pan:{}};
    pk.forEach(k=>{const p=ref.pan[k];if(p&&p.dn&&(p.dn[r.dn]||p.dn[String(r.dn)])){const b=cadPan(ref,k,r.dn);o.pan[k]=b?b.hS:0;}});return o;});}
const ORD={soud:0,sst:1,bout:2,manch:3,dh:4,recu:5,pot:6};
/* ═════════ 3 · LA SEMAINE ═════════
   W = { jours : les 7 jours (lundi → dimanche),
         gens  : {clé : {m : 'S' soudeur | 'T' tuyauteur | 'M' manchonneur | 'P' chauffeur d'engin (présence seulement) | '' (pas opérateur)}},
         h     : {clé : {jour : heures de travail pointées}},
         ici   : {clé : {jour : [chantiers du jour : planning + chantier du pointage]}},
         eq    : {clé : {chantier : lettre d'équipe du planning}},
         ops   : [{by : clé du signataire, d : jour, k : 1 soudure | 'sst' | 'bout' | 2 fils DH | 3 manchon, dn, site, end : type du point, mt : type de manchon, iso, pehd}] }
   → { par : {clé : {m, hd, hp, hpTot, po, n, jours : {jour : {hp, hd, po, hors, eq, L : [lignes du calcul]}}}}, autres : [opérations signées par un non-opérateur] } */
export function cadSemaine(ref,W){const out={par:{},autres:[]};if(!cadRefOk(ref)||!W)return out;
  const J=(W.jours||[]).slice();const inW=new Set(J);const G=W.gens||{};const Hh=W.h||{};const hOf=(id,d)=>num((Hh[id]||{})[d]);const met=id=>{const m=(G[id]||{}).m||'';return m==='S'||m==='T'||m==='M'?m:'';}; /* opérateur compté */
  const estP=id=>(G[id]||{}).m==='P';const siteP={}; /* chauffeurs d'engin du jour sur un chantier, sans lettre d'équipe : ils valent pour toutes les équipes du chantier */
  const lettre=(id,site)=>String((((W.eq||{})[id])||{})[site]||'');
  const P=id=>out.par[id]||(out.par[id]={m:met(id),hd:0,hp:0,hpTot:0,po:0,n:0,jours:{}});
  const Jr=(id,d)=>{const p=P(id);return p.jours[d]||(p.jours[d]={hp:0,hd:0,po:0,hors:0,eq:[],L:[]});};
  const credit=(id,d,h,po)=>{const j=Jr(id,d);j.hd+=h;j.po+=po||0;};
  /* lignes identiques d'un même jour : regroupées (« 8 soudures DN 100 ») */
  const line=(id,d,L)=>{const j=Jr(id,d);const k=[L.t,L.dn,L.sub||'',Math.round((L.hu||0)*1000),L.site||''].join('|');const x=j.L.find(y=>y._k===k);if(x){x.n+=L.n||1;x.h+=L.h||0;}else j.L.push(Object.assign({n:1,h:0},L,{_k:k}));};
  const eff=(id,d)=>{if(hOf(id,d)>0)return d;const av=J.filter(x=>x<d&&hOf(id,x)>0);if(av.length)return av[av.length-1];const ap=J.filter(x=>x>d&&hOf(id,x)>0);return ap.length?ap[0]:d;};
  const all=(W.ops||[]).filter(o=>o&&inW.has(o.d));all.forEach(o=>{if(!met(o.by))out.autres.push(o);});
  const ops=all.filter(o=>met(o.by)).map(o=>Object.assign({},o,{d0:o.d,d:eff(o.by,o.d)}));
  /* équipes du jour : (jour, chantier, lettre) → soudeurs, tuyauteurs, manchonneurs présents avec des heures ; + le signataire sur le chantier de son opération */
  const GR={};const grp=(id,d,site)=>{const e=lettre(id,site);const k=d+'|'+site+'|'+e;const g=GR[k]||(GR[k]={k,d,site,e,S:[],T:[],M:[],P:[],sumS:0,poS:0,potM:0,poM:0,LM:[]});const m=met(id)||(estP(id)?'P':'');if(m&&!g[m].includes(id))g[m].push(id);return g;};
  Object.keys(G).forEach(id=>{const op=!!met(id);if(!op&&!estP(id))return;if(op)P(id);J.forEach(d=>{if(!(hOf(id,d)>0))return;((((W.ici||{})[id])||{})[d]||[]).forEach(site=>{grp(id,d,site);if(!op&&!lettre(id,site))siteP[d+'|'+site]=(siteP[d+'|'+site]||0)+1;});});});
  ops.forEach(o=>grp(o.by,o.d,o.site));
  ops.forEach(o=>{const m=met(o.by);const g=grp(o.by,o.d,o.site);const late=o.d0!==o.d?o.d0:'';
    if(o.k===1||o.k==='sst'||o.k==='bout'){const f=m==='S'?Math.min(1,g.T.length/Math.max(1,g.S.length)):0;const aP=m==='S'&&f>0&&(g.P.length>0||(siteP[o.d+'|'+o.site]||0)>0);
      if(o.k===1){const b=cadSoud(ref,o.dn,f,aP);if(!b||!(b.h>0)){line(o.by,o.d,{t:'soud',dn:String(o.dn),sub:'sans',sans:1,site:o.site});return;}
        line(o.by,o.d,{t:'soud',dn:b.dn,sub:b.stp?'stp':'',hu:b.h,h:b.h,f:b.f,cS:b.cS,cST:b.cST,stp:b.stp,approx:b.approx,site:o.site,late});credit(o.by,o.d,b.h,b.po);P(o.by).n++;if(m==='S'){g.sumS+=b.h;g.poS+=b.po;}return;}
      const key=cadPanKey(o.end,o.k);const b=key?cadPan(ref,key,o.dn):null;
      if(!b||!(b.hS>0||b.phM>0)){line(o.by,o.d,{t:o.k,dn:String(o.dn),sub:(key||o.end||'')+'|sans',key:key||'',end:o.end||'',sans:1,site:o.site});return;}
      line(o.by,o.d,{t:o.k,dn:b.dn,sub:key,key,hu:b.hS,h:b.hS,pan:b.pan,u:b.u,titre:b.t,approx:b.approx,site:o.site,late});credit(o.by,o.d,b.hS,0);P(o.by).n++;if(m==='S')g.sumS+=b.hS;
      if(b.phM>0&&g.M.length){g.potM+=b.phM;g.LM.push({t:o.k,dn:b.dn,sub:key,key,hu:b.phM,h:b.phM,titre:b.t,by:o.by,n:1});}return;}
    if(o.k===2){const b=cadDH(ref,o.dn);if(!b||!(b.h>0)){line(o.by,o.d,{t:'dh',dn:String(o.dn),sub:'sans',sans:1,site:o.site});return;}
      if(m==='M'){g.potM+=b.h;g.LM.push({t:'dh',dn:b.dn,hu:b.h,h:b.h,min:b.min,by:o.by,n:1});P(o.by).n++;}else{line(o.by,o.d,{t:'dh',dn:b.dn,hu:b.h,h:b.h,min:b.min,site:o.site,late});credit(o.by,o.d,b.h,0);P(o.by).n++;}return;}
    if(o.k===3){const gg=m==='M'&&g.M.length>=2?1:0;const b=cadManch(ref,o.dn,o.mt,o.iso,gg,o.pehd);if(!b||!(b.ph>0)){line(o.by,o.d,{t:'manch',dn:String(o.dn),sub:'sans',sans:1,site:o.site});return;}
      const L={t:'manch',dn:b.dn,sub:(b.ext?'ext':b.electro?'electro':'thermo')+(gg?'2':'1'),hu:b.ph,h:b.ph,ext:!!b.ext,electro:!!b.electro,g:gg,cM:b.cM,cMM:b.cMM,pehd:b.pehd,approx:b.approx,site:o.site,late};
      if(m==='M'){g.potM+=b.ph;g.poM+=b.po;g.LM.push(Object.assign({by:o.by,n:1},L));P(o.by).n++;}else{line(o.by,o.d,L);credit(o.by,o.d,b.ph,0);P(o.by).n++;}}});
  Object.values(GR).forEach(g=>{
    /* tuyauteurs : la moyenne des heures débloquées par les soudeurs de l'équipe ce jour-là ; pouces : le cumul de ses soudeurs, partagé entre tuyauteurs */
    g.T.forEach(t=>{const j=Jr(t,g.d);if(g.S.length)j.avecS=true;if(g.S.length&&g.sumS>0){const h=g.sumS/g.S.length;j.L.push({t:'recu',n:1,h,de:g.S.slice(),somme:g.sumS,nS:g.S.length,site:g.site,e:g.e});credit(t,g.d,h,g.poS/g.T.length);}});
    /* manchonneurs : le pot de l'équipe du jour, partagé au prorata des heures pointées ce jour-là */
    if(g.potM>0&&g.M.length){const tot=g.M.reduce((a,id)=>a+hOf(id,g.d),0);const LM=[];g.LM.forEach(L=>{const k=[L.t,L.dn,L.sub||'',Math.round((L.hu||0)*1000)].join('|');const x=LM.find(y=>y._k===k);if(x){x.n+=1;x.h+=L.h;}else LM.push(Object.assign({},L,{_k:k}));});
      g.M.forEach(id=>{const part=tot>0?hOf(id,g.d)/tot:1/g.M.length;const j=Jr(id,g.d);j.L.push({t:'pot',n:1,h:g.potM*part,pot:g.potM,part,avec:g.M.filter(x=>x!==id),lignes:LM,site:g.site,e:g.e});credit(id,g.d,g.potM*part,g.poM*part);});}
    [].concat(g.S,g.T,g.M).forEach(id=>{const j=Jr(id,g.d);if(!j.eq.some(x=>x.k===g.k))j.eq.push({k:g.k,site:g.site,e:g.e,S:g.S.slice(),T:g.T.slice(),M:g.M.slice(),P:g.P.length+(g.e?(siteP[g.d+'|'+g.site]||0):0)});});});
  const tri=L=>L.map((x,i)=>[x,i]).sort((a,b)=>(ORD[a[0].t]-ORD[b[0].t])||(parseFloat(a[0].dn)||0)-(parseFloat(b[0].dn)||0)||a[1]-b[1]).map(x=>x[0]); /* toujours dans le même ordre, quel que soit l'ordre des soudures sur le plan */
  Object.keys(out.par).forEach(id=>{const p=out.par[id];J.forEach(d=>{const h=hOf(id,d);if(!(h>0)&&!p.jours[d])return;const j=Jr(id,d);p.hpTot+=h;j.L=tri(j.L);j.L.forEach(x=>{if(x.lignes)x.lignes=tri(x.lignes);});
      if(p.m==='T'&&!j.avecS&&!(j.hd>0)){j.hors=h;j.hp=0;}else j.hp=h; /* tuyauteur : seuls comptent ses jours avec un soudeur dans son équipe (ou une opération à son nom) */
      p.hp+=j.hp;p.hd+=j.hd;p.po+=j.po;});
    p.hd=r2(p.hd);p.hp=r2(p.hp);p.hpTot=r2(p.hpTot);p.po=Math.round(p.po*10)/10;});
  return out;}
/* ═════════ 4 · ÉTAT D'UNE SEMAINE, SÉRIE, SEMAINES FIGÉES ═════════ */
export function cadEtat(ref,hd,hp){const min=num(ref&&ref.minH)>0?num(ref.minH):CAD_MINH;hd=num(hd);hp=num(hp);
  if(hp<min)return {k:'neutre',why:'heures',min};if(!(hd>0))return {k:'neutre',why:'prod',min};return {k:hd>=hp?'dessus':'dessous',why:'',min,ecart:r2(hd-hp)};}
/* L = [{w, k}] semaines TERMINÉES, de la plus ancienne à la plus récente → série en cours (semaines d'affilée au-dessus, les neutres sautées) et record */
export function cadSerie(L){let serie=0,record=0;(L||[]).forEach(x=>{if(!x||x.k==='neutre')return;if(x.k==='dessus'){serie++;if(serie>record)record=serie;}else serie=0;});return {serie,record};}
/* fiche personne, partie « compteurs » : une clé par semaine figée — c2026-W46 : [heures débloquées, heures pointées, pouces] */
export const cadCle=w=>'c'+w;
export function cadCompteurs(c){const out=[];Object.keys(c||{}).forEach(k=>{const m=/^c(\d{4}-W\d{2})$/.exec(k);const v=c[k];if(!m||!Array.isArray(v))return;out.push({w:m[1],hd:num(v[0]),hp:num(v[1]),po:num(v[2])});});return out.sort((a,b)=>a.w<b.w?-1:a.w>b.w?1:0);}
/* compteurs de l'avatar : série / record (semaines terminées avant « avant »), pouces cumulés ; base = reprise saisie à la main (compteurs.realisations / cadence) */
export function cadAvatar(ref,c,avant){const L=cadCompteurs(c).filter(x=>!avant||x.w<avant);const S=cadSerie(L.map(x=>({w:x.w,k:cadEtat(ref,x.hd,x.hp).k})));const po=L.reduce((a,x)=>a+x.po,0);
  return {serie:S.serie,record:Math.max(S.record,num((c||{}).cadence)),pouces:Math.round(po+num((c||{}).realisations)),n:L.length};}
