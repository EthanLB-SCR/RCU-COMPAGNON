// memoire3.js — 14/10 après-midi (lot B) : MÉMOIRE TECHNIQUE, ce que l'appli sait déjà et met seule dans le mémoire.
// · Chiffrage (calcAffaireV2) : postes non nuls par zone → conditions des paragraphes (« cond » : 'decharg', '!radio', 'sst|vpi'…), quantités (soudures par DN,
//   SST, vidanges, purges, radio %, épreuves…), dates des zones → planning : équipes = jours de soudure ÷ jours ouvrés (modifiable).
// · DCE (a.dce) : documents de référence priorisés (annotés, puis plans, puis pièces maîtresses), jamais la liste des 40 pièces.
// · Annuaire : chargé d'affaires (e-mail, téléphone), responsable d'exploitation du secteur de l'affaire, QHSE et administratif réglés une fois (memlib.reglages),
//   chef et opérateurs choisis par affaire (memoire.lib.inter) → visuel « Moyens humains » (paragraphe type « equipe »).
// · Documents d'entreprise (registre « entdoc », lot documents obligatoires) : assurances, Kbis… → garanties et annexes (absent → trou à compléter).
// · Images du pack (memlib.images) : stockage quand on est connecté, data URL sinon ; octets pour l'export Word.
// · Estimation honnête du nombre de pages (Word / PDF), CSS du lot (<style id="css-lot-b">).
// Aucune donnée réelle ici : les textes, images et noms viennent du pack privé et de l'annuaire.
import {regGet,regLoad} from './reg.js';
import {prixBase,etudesOf,calcAffaireV2} from './chiffrage.js';
import {POSTES,joursChantier,sstTypes,raccTypes} from './prix.js';
import {liveDocs,catOf} from './dce.js';
let A=null;
export function mem3Init(api){A=api;}
const esc=s=>String(s??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const nb=(x,d)=>(+x||0).toLocaleString('fr-FR',{maximumFractionDigits:d===undefined?0:d});
const num=v=>typeof v==='number'?(isFinite(v)?v:0):(v===null||v===undefined||v===''?0:(isFinite(+v)?+v:0));
const dFR=x=>{if(!x)return '';const d=new Date(String(x).length===10?x+'T12:00:00':x);return isNaN(d)?'':d.toLocaleDateString('fr-FR');};
export const normTxt=s=>String(s||'').normalize('NFD').replace(/[̀-ͯ]/g,'').replace(/[’‘`]/g,"'").replace(/œ/g,'oe').toLowerCase().replace(/\s+/g,' ').trim();
const plur=(n,s,p)=>n>1?(p||s+'s'):s;

/* ═════════ 1 · CHIFFRAGE → FAITS ═════════ */
export const POSTE_LAB=Object.fromEntries(POSTES.filter(p=>!p[3]).map(p=>[p[0],p[1]]));
const SECT={O:'ouest',I:'idf',S:'sud',W:'sudouest',E:'est'};
export const SECT_LAB={ouest:'Ouest',idf:'Île-de-France',sudouest:'Sud-Ouest',sud:'Sud',sudest:'Sud-Est',est:'Est'};
export const affSecteur=a=>(a&&a.secteur)||SECT[String((a&&a.num)||'')[0]]||'';
const sameSect=(p,s)=>!!p&&!!s&&(p===s||(['sud','sudest'].includes(p)&&['sud','sudest'].includes(s)));
/* délai écrit (« 22 semaines », « 6 mois », « 90 jours ») → jours ouvrés (repli quand les zones n'ont pas de dates) */
export function delaiOuvres(t){const m=/(\d+(?:[.,]\d+)?)\s*(semaines?|sem\.?|mois|jours?|j\b)/i.exec(String(t||''));if(!m)return 0;const v=+m[1].replace(',','.');const u=m[2].toLowerCase();
  if(u.startsWith('sem'))return Math.round(v*5);if(u.startsWith('mois'))return Math.round(v*21.5);return /ouvr/i.test(t)?Math.round(v):Math.round(v*5/7);}
let FC=null;
/* faits du chiffrage d'une affaire — mémo tant que le chiffrage, la base de prix et le DCE ne changent pas */
export function memFacts(a){a=a||{};const base=prixBase();if(FC&&FC.num===a.num&&FC.ch===a.chiffrage&&FC.base===base&&FC.dce===a.dce&&FC.consult===a.consult)return FC.v;
  const v=facts_(a,base);FC={num:a.num,ch:a.chiffrage,base,dce:a.dce,consult:a.consult,v};return v;}
function facts_(a,base){const F={v2:false,zones:[],has:{},hasAny:false,tot:{J:0,ml:0,qS:0,qM:0},dn:[],debut:'',fin:'',ouvres:0,ouvresSrc:'',multi:false,dce:liveDocs(a).filter(d=>!d.archive).length};
  let C=null;if(base&&etudesOf(a).length){try{C=calcAffaireV2(a,base);}catch(e){console.warn('mémoire : chiffrage',e);C=null;}}
  if(C&&C.etudes){F.v2=true;const sstL={},raccL={};try{sstTypes(base).forEach(t=>{sstL[t.id]=t.name;});raccTypes(base).forEach(t=>{raccL[t.id]=t.name;});}catch(e){}
    C.etudes.forEach((e,i)=>{const z=e.z||{},r=e.r||{},T=r.T||{},Ch=z.chantier||{},E=z.eq||{};const P={};(C.postes||[]).forEach(p=>{if(!p.tete)P[p.k]=num((p.parz||p.par||[])[i]);});
      const dn=((r.detail&&r.detail.dn&&r.detail.dn.rows)||[]).filter(x=>x.J||x.ml).map(x=>({dn:x.dn,ml:num(x.ml),soud:num(x.J),nAnt:num(x.nAnt),nFd:num(x.nFd)}));
      const cnd=k=>{const c=(z.cnd||{})[k]||{};return c.on?{on:true,fd:num(c.fdPct),ant:num(c.antPct)}:{on:false};};const hy=(r.detail&&r.detail.hydro)||{};
      const jc=joursChantier(Ch.d0,Ch.d1);
      F.zones.push({nom:String(z.nom||('Zone '+(i+1))),d0:Ch.d0||'',d1:Ch.d1||'',ouvres:jc.ouvres,dn,J:num(T.J),ml:num(T.ml),qS:num(T.qS),qM:num(T.qM),P,
        q:{decharg:num(Ch.nbDecharg),transfert:!!Ch.transfert,grue:!!Ch.grue,camion:!!Ch.camionPlateau,baseVie:['wc','contener','benne','pelle'].filter(k=>Ch[k]),doe:!!Ch.doe,carnet:!!Ch.carnet,
          purges:{paires:num((z.purges||{}).paires),dn:num((z.purges||{}).dn),dep:!!(z.purges||{}).deporte,auto:!!(z.purges||{}).purgeurAuto},
          vidanges:{paires:num((z.vidanges||{}).paires),dn:num((z.vidanges||{}).dn),type:String((z.vidanges||{}).type||''),dep:!!(z.vidanges||{}).deporte},
          vpi:(z.vpi||[]).filter(v=>num(v.dn)&&num(v.soud)).map(v=>({dn:num(v.dn),q:num(v.soud)})),
          sst:(z.sst||[]).filter(s=>num(s.dn)&&s.type&&num(s.paires)).map(s=>({dn:num(s.dn),q:num(s.paires),type:s.type,label:s.type==='autre'?String(s.des||'autre'):(sstL[s.type]||String(s.type).replace(/^sst_/,'')),bypass:!!s.bypass})),
          racc:(z.racc||[]).filter(x=>num(x.dn)&&x.type&&num(x.paires)).map(x=>({dn:num(x.dn),q:num(x.paires),label:raccL[x.type]||String(x.type).replace(/^racc_/,'')})),
          ext:(z.extrusion||[]).filter(x=>num(x.dn)&&num(x.paires)).map(x=>({dn:num(x.dn),q:num(x.paires),type:String(x.type||'')})),
          radio:cnd('radio'),us:cnd('us'),ress:cnd('ress'),epreuves:((hy.items||{}).epreuve||[]).length,typeManchon:String(E.typeManchon||''),ctrl:Object.keys(E.ctrl||{}).filter(k=>E.ctrl[k]),
          foncage:(z.foncage&&z.foncage.rows||[]).length,aerien:(z.aerien&&z.aerien.rows||[]).length,depose:(z.depose&&z.depose.rows||[]).length,nuit:!!(z.nuit&&z.nuit.on),
          prest:((z.autres||{}).prestations||[]).map(x=>String((x&&(x.des||x.label||x.nom))||'').trim()).filter(Boolean),four:((z.autres||{}).fournitures||[]).map(x=>String((x&&(x.des||x.label||x.nom))||'').trim()).filter(Boolean),
          paniers:(z.paniers||[]).map(x=>String((x&&(x.nom||x.title||x.des))||'').trim()).filter(Boolean)}});});
    if(C.essais&&C.essais.items&&C.essais.items.epreuve&&C.essais.items.epreuve.length){F.essaisCommuns=C.essais.items.epreuve.length;}
    (C.postes||[]).forEach(p=>{if(!p.tete){F.has[p.k]=Math.abs(num(p.achat))>0.005;if(F.has[p.k])F.hasAny=true;}});}
  F.multi=F.zones.length>1;
  const byDn={};F.zones.forEach(z=>{F.tot.J+=z.J;F.tot.ml+=z.ml;F.tot.qS+=z.qS;F.tot.qM+=z.qM;z.dn.forEach(r=>{const o=byDn[r.dn]||(byDn[r.dn]={dn:r.dn,ml:0,soud:0,nAnt:0,nFd:0});o.ml+=r.ml;o.soud+=r.soud;o.nAnt+=r.nAnt;o.nFd+=r.nFd;});});
  F.dn=Object.values(byDn).sort((x,y)=>x.dn-y.dn);
  const d0s=F.zones.map(z=>z.d0).filter(Boolean).sort(),d1s=F.zones.map(z=>z.d1).filter(Boolean).sort();F.debut=d0s[0]||'';F.fin=d1s[d1s.length-1]||'';
  if(F.debut&&F.fin){F.ouvres=joursChantier(F.debut,F.fin).ouvres;F.ouvresSrc='dates des zones du chiffrage';}
  if(!F.ouvres){const o=delaiOuvres((a.consult||{}).delai);if(o){F.ouvres=o;F.ouvresSrc='délai d’exécution « '+String(a.consult.delai)+' »';}}
  return F;}
/* condition d'un paragraphe : true / false, ou null quand on ne sait pas (pas de chiffrage v2) — 'k' = poste k chiffré, '!k' = non chiffré, 'a|b' = l'un ou l'autre ;
   clés spéciales : multizones, dce (pièces du DCE), assurance (attestation déposée), bypass */
export function condEval(cond,F,ext){if(!cond)return null;const terms=String(cond).split('|').map(s=>s.trim()).filter(Boolean);if(!terms.length)return null;let unknown=false;
  const val=k=>{if(k==='multizones')return F.zones.length>1;if(k==='monozone')return F.zones.length<=1;if(k==='dce')return F.dce>0;if(k==='chiffrage')return F.hasAny;
    if(k==='assurance')return !!(ext&&ext.assurance);if(k==='decennale')return !!(ext&&ext.decennale);if(k==='docsent')return !!(ext&&ext.docsent);if(k==='bypass'){if(!F.v2)return null;return F.zones.some(z=>z.q.sst.some(s=>s.bypass));}
    if(!F.v2||!F.hasAny)return null;return !!F.has[k];};
  const res=terms.map(t=>{const neg=t[0]==='!';const v=val(neg?t.slice(1):t);if(v===null){unknown=true;return null;}return neg?!v:v;});
  if(res.some(x=>x===true))return true;return unknown?null:false;}
/* texte du libellé d'une condition, pour l'étiquette de la bibliothèque (« déchargement non chiffré ») */
export function condLabel(cond,v){const t=String(cond||'').split('|')[0].trim();const neg=t[0]==='!';const k=neg?t.slice(1):t;const on=neg?!v:!!v; /* on = la chose existe (poste chiffré, plusieurs zones, DCE…) */
  const SP={decennale:['attestation décennale déposée','pas d’attestation décennale'],docsent:['documents d’entreprise déposés','aucun document d’entreprise'],multizones:['plusieurs zones','une seule zone'],monozone:['une seule zone','plusieurs zones'],dce:['pièces du DCE','pas de DCE'],assurance:['attestation d’assurance déposée','pas d’attestation d’assurance'],chiffrage:['chiffrage fait','pas de chiffrage'],bypass:['by-pass en SST chiffré','pas de by-pass en SST']}[k];
  if(SP)return on?SP[0]:SP[1];return (POSTE_LAB[k]||k).toLowerCase()+(on?' chiffré':' non chiffré');}

/* ═════════ 2 · DOCUMENTS DE RÉFÉRENCE (DCE) ═════════ */
const MAIN=['rc','ae','ccap','cctp','dpgf','planning'];
export function memDocsDce(a,max){max=max||10;const docs=liveDocs(a||{}).filter(d=>!d.archive);if(!docs.length)return {items:[],more:0,total:0};
  const name=d=>String(d.name||'').replace(/\.[a-z0-9]{2,5}$/i,'').replace(/_/g,' ').trim();const used=new Set();const items=[];const push=(d,why)=>{if(used.has(d.id)||items.length>=max)return;used.add(d.id);items.push({id:d.id,name:name(d),cat:catOf(d),why,notes:(d.notes||[]).length});};
  docs.filter(d=>(d.notes||[]).length).sort((x,y)=>(y.notes||[]).length-(x.notes||[]).length).forEach(d=>push(d,'annoté'));
  const plans=docs.filter(d=>['plans','profils'].includes(catOf(d))&&!used.has(d.id));const roomP=Math.max(0,max-items.length-MAIN.filter(k=>docs.some(d=>catOf(d)===k&&!used.has(d.id))).length);
  let grouped=null;if(plans.length>Math.max(2,roomP)){grouped={n:plans.length,ex:plans.slice(0,2).map(name)};plans.forEach(d=>used.add(d.id));items.push({grouped:true,n:plans.length,ex:grouped.ex,why:'plans'});}else plans.forEach(d=>push(d,'plan')); /* les plans juste après les pièces annotées */
  MAIN.forEach(k=>{const d=docs.find(x=>catOf(x)===k&&!used.has(x.id));if(d)push(d,'pièce maîtresse');});
  const more=docs.filter(d=>!used.has(d.id)).length;return {items,grouped,more,total:docs.length};}
function docsDceHTML(a){const R=memDocsDce(a);if(!R.total)return '';
  return '<ul>'+R.items.map(x=>x.grouped?`<li><i>Plans du projet (${x.n} plans, dont ${x.ex.map(esc).join(', ')}) – plans fournis non exhaustifs</i></li>`:`<li><i>${esc(x.name)}</i></li>`).join('')+'</ul>'+(R.more?`<p><i>et ${R.more} autre${R.more>1?'s':''} pièce${R.more>1?'s':''} du dossier de consultation.</i></p>`:'');}

/* ═════════ 3 · ANNUAIRE ET INTERLOCUTEURS ═════════ */
let DIRC=null;
const keyOf=acc=>((acc&&acc.email)||'').toLowerCase()||String((acc&&acc.id)||'');
/* annuaire : personnes de l'appli (ctx.people = annuaire de l'espace) enrichies de l'e-mail (comptes) et du téléphone / secteur (fiche personne) */
export function memDir(ctx){if(ctx&&Array.isArray(ctx.people))DIRC=ctx.people;const base=DIRC||[];const accs=(A&&A.state&&Array.isArray(A.state.accounts))?A.state.accounts:[];
  let esp={};try{const T=(typeof window!=='undefined'&&window.TRACE)||{};esp=(T.espace&&T.espace.state&&T.espace.state().people)||{};}catch(e){esp={};}
  const byName=new Map();accs.forEach(acc=>{if(!acc||acc.active===false)return;[acc.name,[acc.prenom,acc.nom].filter(Boolean).join(' ')].forEach(n=>{const k=normTxt(n);if(k&&!byName.has(k))byName.set(k,acc);});});
  const out=[];const seen=new Set();
  const add=(p,acc)=>{const name=String(p.name||[p.prenom,p.nom].filter(Boolean).join(' ')||(acc&&acc.name)||'').trim();if(!name)return;const id=(acc&&acc.email)||name;if(seen.has(id)||seen.has(name))return;seen.add(id);seen.add(name);
    const x=acc?(esp[keyOf(acc)]||{}):{};out.push({id,name,prenom:p.prenom||(acc&&acc.prenom)||'',nom:p.nom||(acc&&acc.nom)||'',poste:p.poste||(acc&&acc.poste)||'autre',email:(acc&&acc.email)||p.email||'',tel:x.tel||p.tel||'',secteur:x.secteur||p.secteur||''});};
  base.forEach(p=>{if(!p)return;add(p,byName.get(normTxt(p.name))||byName.get(normTxt([p.prenom,p.nom].filter(Boolean).join(' '))));});
  accs.forEach(acc=>{if(!acc||acc.active===false||acc.poste==='visiteur')return;add({name:acc.name,prenom:acc.prenom,nom:acc.nom,poste:acc.poste},acc);});
  return out.sort((x,y)=>x.name.localeCompare(y.name,'fr'));}
const findP=(dir,ref)=>{if(!ref)return null;const id=typeof ref==='object'?ref.id:ref;const nm=typeof ref==='object'?ref.name:ref;return dir.find(p=>p.id===id)||dir.find(p=>normTxt(p.name)===normTxt(nm))||(nm?{id:id||nm,name:String(nm),email:'',tel:'',poste:'',ext:true}:null);};
/* interlocuteurs résolus d'une affaire (L = bibliothèque : réglages QHSE / administratif) */
export function memInter(a,L,ctx){const dir=memDir(ctx);const I=(((a||{}).memoire||{}).lib||{}).inter||{};const R=(L&&L.reglages)||{};const sect=affSecteur(a);
  const res=dir.filter(p=>p.poste==='resp_exploitation');const inSect=res.filter(p=>sameSect(p.secteur,sect));const reAuto=inSect[0]||(res.length===1?res[0]:null);
  const admAuto=dir.filter(p=>p.poste==='resp_admin_fin');
  return {dir,sect,charge:a&&a.charge?findP(dir,a.charge):null,cdtx:a&&a.cdtx?findP(dir,a.cdtx):null,re:I.re?findP(dir,I.re):reAuto,reAuto:!I.re,reCands:res,
    qhse:R.qhse?findP(dir,R.qhse):null,admin:Array.isArray(R.admin)?R.admin.map(x=>findP(dir,x)).filter(Boolean):admAuto,adminAuto:!Array.isArray(R.admin),
    chef:I.chef?findP(dir,I.chef):null,ops:(Array.isArray(I.ops)?I.ops:[]).map(x=>findP(dir,x)).filter(Boolean)};}
export const persName=p=>{if(!p)return '';const pr=String(p.prenom||'').trim(),no=String(p.nom||'').trim();return pr&&no?no.toUpperCase()+' '+pr:String(p.name||'');};
/* visuel « Moyens humains » : pôles → rôles → personnes ; un rôle sans personne = trou (sauf les opérateurs : texte des missions) */
const EQ_DEF={poles:[{titre:'Pôle administratif',roles:[{k:'re',label:'Responsable d’exploitation'},{k:'qhse',label:'Responsable QHSE'},{k:'admin',label:'Administratif et finances'},{k:'charge',label:'Chargé d’affaires'}]},
  {titre:'Pôle exécution',roles:[{k:'re',label:'Responsable d’exploitation'},{k:'cdtx',label:'Conducteur de travaux'},{k:'chef',label:'Chef de chantier'},{k:'ops',label:'Opérateurs'}]}]};
export const ROLE_LAB={re:'responsable d’exploitation',qhse:'responsable QHSE',admin:'administratif et finances',charge:'chargé d’affaires',cdtx:'conducteur de travaux',chef:'chef de chantier',ops:'opérateurs'};
export function equipeModel(p,I){const cfg=p&&p.equipe&&Array.isArray(p.equipe.poles)&&p.equipe.poles.length?p.equipe:EQ_DEF;let holes=0;
  const per=k=>{switch(k){case 're':return I.re?[I.re]:[];case 'qhse':return I.qhse?[I.qhse]:[];case 'admin':return I.admin||[];case 'charge':return I.charge?[I.charge]:[];case 'cdtx':return I.cdtx?[I.cdtx]:[];case 'chef':return I.chef?[I.chef]:[];case 'ops':return I.ops||[];default:return [];}};
  const poles=cfg.poles.map(po=>({titre:String(po.titre||''),rows:(po.roles||[]).filter(r=>r&&r.k).map(r=>{const ps=per(r.k);const missing=!ps.length&&r.k!=='ops'&&r.k!=='autre';if(missing)holes++;
    return {k:r.k,label:String(r.label||ROLE_LAB[r.k]||r.k),ico:r.ico?String(r.ico):'',missions:(Array.isArray(r.missions)?r.missions:[]).map(String),persons:ps.map(x=>({name:persName(x),tel:x.tel||'',email:x.email||''})),missing,nom:r.k==='ops'};})}));
  return {poles,holes};}
/* rendu HTML (aperçu et PDF) — imgSrc(id) → url / data ; mode 'app' : rôles manquants cliquables */
export function equipeHTML(M,imgSrc,mode,ro){const app=mode==='app';
  return `<div class="mem3-eq${app&&!ro?' mem3-click':''}"${app&&!ro?' data-act="af" data-v="mlbinter|" role="button" tabindex="0" title="Choisir les interlocuteurs"':''}>`+M.poles.map(po=>`<div class="mem3-pole">${po.titre?`<div class="mem3-pt">${esc(po.titre)}</div>`:''}${po.rows.map(r=>{const ic=r.ico&&imgSrc(r.ico);
    return `<div class="mem3-row"><div class="mem3-role"><span>${esc(r.label)}</span>${ic?`<img src="${esc(ic)}" alt="">`:''}</div><div class="mem3-pers">${r.persons.length?(r.nom?`<span class="mem3-ops">${r.persons.map(x=>esc(x.name)).join(' · ')}</span>`:r.persons.map(x=>`<div><b>${esc(x.name)}</b>${x.tel?`<br>${esc(x.tel)}`:''}${x.email?`<br><u>${esc(x.email)}</u>`:''}</div>`).join('')):r.missing?(app?`<span class="memoire-h">à choisir : ${esc(ROLE_LAB[r.k]||r.label)}</span>`:`<span class="ac">[À COMPLÉTER : ${esc(ROLE_LAB[r.k]||r.label)}]</span>`):''}</div><div class="mem3-mis${r.missions.length?'':' vide'}">${r.missions.length?`<ul>${r.missions.map(m=>`<li>${esc(m)}</li>`).join('')}</ul>`:''}</div></div>`;}).join('')}</div>`).join('')+`</div>`;}

/* ═════════ 4 · DOCUMENTS D'ENTREPRISE (registre « entdoc », livré par un autre lot) ═════════ */
let ENT_ASKED=false;
export function entDocs(onLoad){if(!ENT_ASKED){ENT_ASKED=true;try{const p=regLoad(['entdoc']);if(p&&p.then&&onLoad)p.then(()=>{try{if(['assurance_rc','assurance_decennale','kbis','urssaf'].some(t=>regGet('entdoc',t)))onLoad();}catch(e){}}).catch(()=>{});}catch(e){}}
  const g=t=>{try{const r=regGet('entdoc',t);return r&&!r.deleted?r:null;}catch(e){return null;}};const out={};['assurance_rc','assurance_decennale','kbis','urssaf','fiscale','rib','qualification','autre'].forEach(t=>{out[t]=g(t);});return out;}
let PDF_=null;const parisToday=()=>{try{return (PDF_=PDF_||new Intl.DateTimeFormat('en-CA',{timeZone:'Europe/Paris',year:'numeric',month:'2-digit',day:'2-digit'})).format(new Date());}catch(e){return new Date().toISOString().slice(0,10);}}; /* 15/10 : date de Paris (comme les documents administratifs), pas UTC */
const expired=d=>!!(d&&d.validUntil&&String(d.validUntil).slice(0,10)<parisToday());
export const entValid=d=>!!d&&!expired(d); /* déposé ET pas périmé (une attestation périmée compte comme absente) */
const ENT_LAB={assurance_rc:'Attestation d’assurance responsabilité civile',assurance_decennale:'Attestation d’assurance décennale',kbis:'Extrait Kbis',urssaf:'Attestation de vigilance URSSAF',fiscale:'Attestation de régularité fiscale',rib:'Relevé d’identité bancaire',qualification:'Qualifications et certificats',autre:'Autre document'};
/* 16/10 soir (lot AM) : RC + décennale en un seul document (la suiveuse porte same = la source, docsoblig.js) → une seule ligne « … responsabilité civile et décennale » */
const PAIR_ENT={assurance_rc:'assurance_decennale',assurance_decennale:'assurance_rc'};const pairFol=(E,t)=>{const o=PAIR_ENT[t];return !!(o&&E[o]&&E[o].same===t&&!E[t].same);};
function docsEntHTML(E){const L=Object.keys(ENT_LAB).map(t=>[t,E[t]]).filter(([t,d])=>d&&t!=='rib'&&!(d.same&&PAIR_ENT[t]===d.same&&E[d.same]&&!E[d.same].same));if(!L.length)return '';
  return '<ul>'+L.map(([t,d])=>`<li>${esc(pairFol(E,t)?'Attestation d’assurance responsabilité civile et décennale':d.title||ENT_LAB[t])}${d.assureur?' – '+esc(d.assureur):''}${d.police?' (police n° '+esc(d.police)+')':''}${d.validUntil?(expired(d)?' – <b>expirée le '+esc(dFR(d.validUntil))+'</b>':' – valable jusqu’au '+esc(dFR(d.validUntil))):''}</li>`).join('')+'</ul>';}

/* ═════════ 5 · VARIABLES DU MÉMOIRE (texte, ou {html} = bloc généré) ═════════ */
export const VAR_LAB3={chargeEmail:'e-mail du chargé d’affaires',chargeTel:'téléphone du chargé d’affaires',email:'e-mail de contact',tel:'téléphone de contact',chargeFonction:'fonction du signataire',cdtxEmail:'e-mail du conducteur de travaux',cdtxTel:'téléphone du conducteur de travaux',
  re:'responsable d’exploitation',reEmail:'e-mail du responsable d’exploitation',reTel:'téléphone du responsable d’exploitation',qhse:'responsable QHSE',chef:'chef de chantier',secteur:'secteur',
  nbZones:'nombre de zones',debut:'date de démarrage',fin:'date de fin',joursOuvres:'jours ouvrés du planning',nbEquipes:'nombre d’équipes',nbSst:'nombre de sous-stations',nbVpi:'nombre de vannes préisolées',nbRacc:'nombre de raccordements',
  nbEpreuves:'nombre d’épreuves hydrauliques',nbDecharg:'nombre de déchargements',radioPct:'% de soudures radiographiées',purgesDn:'DN des purges',purgesPaires:'nombre de paires de purges',vidangesDn:'DN des vidanges',vidangesPaires:'nombre de paires de vidanges',
  vidangesType:'type de vidange',typeManchon:'type de manchon',assureurRc:'assureur (responsabilité civile)',policeRc:'n° de police (responsabilité civile)',validiteRc:'validité de l’attestation RC',assureurDec:'assureur (décennale)',policeDec:'n° de police (décennale)',validiteDec:'validité de l’attestation décennale',
  listeDn:'diamètres, ml et soudures (chiffrage)',listeEssais:'épreuves, rinçage et remplissage (chiffrage)',prestationsZones:'prestations par zone (chiffrage)',datesZones:'dates des zones (chiffrage)',docsDce:'documents du DCE',listeRacc:'raccordements (chiffrage)',listeSst:'sous-stations (chiffrage)',docsEntreprise:'documents d’entreprise',autresPrestations:'autres prestations (chiffrage)',autresFournitures:'autres fournitures (chiffrage)'};
/* 14/10 soir (lot M2) : variables des trous remplis d'office en plus (contacts par personne, fronts, radio feeder / antennes, zones, raccordements, visite, vidanges) */
Object.assign(VAR_LAB3,{nbFronts:'nombre de fronts (= équipes)',radioFd:'% de soudures radiographiées (feeder)',radioAnt:'% de soudures radiographiées (antennes)',zonesListe:'zones et linéaires (chiffrage)',raccTxt:'raccordements : nombre et DN (chiffrage)',
  vidangesMode:'type de vidange (et déport)',visiteTxt:'visite du site (1 · Dossier) ou analyse sur plans',admin:'administratif et finances',chargeNomTel:'nom et téléphone du chargé d’affaires',
  reContact:'contact du responsable d’exploitation (téléphone · e-mail)',chargeContact:'contact du chargé d’affaires (téléphone · e-mail)',cdtxContact:'contact du conducteur de travaux (téléphone · e-mail)',chefContact:'contact du chef de chantier (téléphone · e-mail)',
  qhseContact:'contact du responsable QHSE (téléphone · e-mail)',adminContact:'contact administratif (téléphone · e-mail)',chefTel:'téléphone du chef de chantier',chefEmail:'e-mail du chef de chantier',qhseTel:'téléphone du responsable QHSE',qhseEmail:'e-mail du responsable QHSE',
  adminTel:'téléphone administratif',adminEmail:'e-mail administratif'});
const etList=l=>l.length<2?(l[0]||''):l.slice(0,-1).join(', ')+' et '+l[l.length-1];
/* variables calculées : V (déjà là : nom, ville, client, nb, ml, jS…) complété ; I = interlocuteurs, E = documents d'entreprise */
export function memVars3(a,F,I,E){a=a||{};const out={};const z=F.zones;const one=x=>x===undefined||x===null?'':x;
  const P=p=>p||{};out.chargeEmail=P(I.charge).email||'';out.chargeTel=P(I.charge).tel||'';out.email=out.chargeEmail;out.tel=out.chargeTel;out.chargeFonction=a.charge?'Chargé d’affaires':'';
  out.cdtxEmail=P(I.cdtx).email||'';out.cdtxTel=P(I.cdtx).tel||'';out.re=I.re?persName(I.re)||I.re.name:'';out.reEmail=P(I.re).email||'';out.reTel=P(I.re).tel||'';out.qhse=I.qhse?persName(I.qhse)||I.qhse.name:'';out.chef=I.chef?persName(I.chef)||I.chef.name:'';out.secteur=SECT_LAB[I.sect]||'';
  out.nbZones=z.length||'';out.debut=dFR(F.debut);out.fin=dFR(F.fin);out.joursOuvres=F.ouvres||'';
  const qS=F.tot.qS||0;out.nbEquipes=F.ouvres&&qS?Math.max(1,Math.ceil(qS/F.ouvres)):'';
  if(F.v2){out.jS=F.tot.qS||'';out.jM=F.tot.qM||'';}
  const sum=f=>z.reduce((s,x)=>s+f(x),0);
  if(F.v2){out.nbSst=sum(x=>x.q.sst.reduce((s,y)=>s+y.q,0))||'';out.nbVpi=sum(x=>x.q.vpi.reduce((s,y)=>s+y.q,0))||'';out.nbRacc=sum(x=>x.q.racc.reduce((s,y)=>s+y.q,0))||'';out.nbEpreuves=(sum(x=>x.q.epreuves)+(F.essaisCommuns||0))||'';out.nbDecharg=sum(x=>x.q.decharg)||'';
    const rad=z.map(x=>x.q.radio).filter(r=>r.on);if(rad.length){const fd=[...new Set(rad.map(r=>r.fd))],an=[...new Set(rad.map(r=>r.ant))];const hasAnt=F.dn.some(r=>r.nAnt>0),hasFd=F.dn.some(r=>r.nFd>0);
      out.radioPct=fd.length===1&&an.length===1?(fd[0]===an[0]||!hasAnt?nb(fd[0])+' %':!hasFd?nb(an[0])+' %':nb(fd[0])+' % (feeder) et '+nb(an[0])+' % (antennes)'):fd.map(v=>nb(v)+' %').join(' / ');}
    const pu=z.find(x=>x.q.purges.paires>0);if(pu){out.purgesDn=pu.q.purges.dn||'';out.purgesPaires=sum(x=>x.q.purges.paires);}
    const vi=z.find(x=>x.q.vidanges.paires>0);if(vi){out.vidangesDn=vi.q.vidanges.dn||'';out.vidangesPaires=sum(x=>x.q.vidanges.paires);out.vidangesType=/asp/i.test(vi.q.vidanges.type)?'par aspiration':/grav/i.test(vi.q.vidanges.type)?'par gravité':vi.q.vidanges.type;}
    const tm=z.map(x=>x.q.typeManchon).find(Boolean);if(tm)out.typeManchon=/electro/i.test(tm)?'électrosoudables':/thermo/i.test(tm)?'thermorétractables':tm;}
  const rc=E.assurance_rc,dc=E.assurance_decennale;out.assureurRc=rc&&!expired(rc)?one(rc.assureur):'';out.policeRc=rc&&!expired(rc)?one(rc.police):'';out.validiteRc=rc&&!expired(rc)&&rc.validUntil?dFR(rc.validUntil):'';
  out.assureurDec=dc&&!expired(dc)?one(dc.assureur):'';out.policeDec=dc&&!expired(dc)?one(dc.police):'';out.validiteDec=dc&&!expired(dc)&&dc.validUntil?dFR(dc.validUntil):'';
  /* blocs générés (HTML sûr : chaque valeur passe par esc) */
  const R=(h)=>h?{html:h}:'';
  const dnLi=rows=>rows.map(r=>`<li>DN ${esc(r.dn)} = ${nb(r.ml)} ml – ${nb(r.soud)} ${plur(r.soud,'soudure')}</li>`).join('');
  const tot=(ml,J)=>`<p><b>Total : ${nb(ml)} ml – ${nb(J)} ${plur(J,'soudure')}</b></p>`;
  if(F.dn.length)out.listeDn=R(F.multi?z.filter(x=>x.dn.length).map(x=>`<p><b>${esc(x.nom)}</b>${x.d0&&x.d1?` <i>(du ${esc(dFR(x.d0))} au ${esc(dFR(x.d1))})</i>`:''} :</p><ul>${dnLi(x.dn)}</ul>`).join('')+tot(F.tot.ml,F.tot.J):`<ul>${dnLi(F.dn)}</ul>`+tot(F.tot.ml,F.tot.J));
  if(F.multi)out.prestationsZones=R(z.map(x=>{const li=zonePrest(x);return li.length?`<p><b>${esc(x.nom)}</b>${x.d0&&x.d1?` <i>(du ${esc(dFR(x.d0))} au ${esc(dFR(x.d1))})</i>`:''} :</p><ul>${li.map(t=>`<li>${t}</li>`).join('')}</ul>`:'';}).join(''));
  if(z.some(x=>x.d0&&x.d1))out.datesZones=R(`<ul>${z.filter(x=>x.d0&&x.d1).map(x=>`<li>${esc(x.nom)} : du <b>${esc(dFR(x.d0))}</b> au <b>${esc(dFR(x.d1))}</b>${x.ouvres?` (${nb(x.ouvres)} jours ouvrés)`:''}</li>`).join('')}</ul>`);
  const ess=z.map(x=>{const P=x.P||{};const h=k=>Math.abs(num(P[k]))>0.005;const L=[];if(h('epreuve'))L.push(x.q.epreuves?nb(x.q.epreuves)+' '+plur(x.q.epreuves,'épreuve')+' hydraulique'+(x.q.epreuves>1?'s':''):'épreuve hydraulique');if(h('boulet'))L.push('passage du boulet mousse');if(h('rincage'))L.push('rinçage dynamique');if(h('passivation'))L.push('lessivage et passivation');if(h('eau'))L.push('remplissage en eau adoucie');if(h('conservation'))L.push('mise en conservation');return {x,L};}).filter(e=>e.L.length);
  if(ess.length)out.listeEssais=R(`<ul>${ess.map(e=>`<li>${F.multi?`<b>${esc(e.x.nom)}</b> : `:''}${esc(e.L.join(', ').replace(/^./,c=>c.toUpperCase()))}</li>`).join('')}${F.essaisCommuns?`<li>${nb(F.essaisCommuns)} ${plur(F.essaisCommuns,'épreuve')} commune${F.essaisCommuns>1?'s':''} à plusieurs zones</li>`:''}</ul>`);
  out.docsDce=R(docsDceHTML(a));
  const racc=z.flatMap(x=>x.q?x.q.racc.map(r=>Object.assign({zone:x.nom},r)):[]);if(racc.length)out.listeRacc=R(`<ul>${racc.map(r=>`<li>${r.q>1?r.q+' × ':''}DN ${esc(r.dn)} – ${esc(r.label)}${F.multi?' ('+esc(r.zone)+')':''}</li>`).join('')}</ul>`);
  const sst=z.flatMap(x=>x.q?x.q.sst.map(r=>Object.assign({zone:x.nom},r)):[]);if(sst.length)out.listeSst=R(`<ul>${sst.map(r=>`<li>${nb(r.q)} ${plur(r.q,'paire')} de vannes DN ${esc(r.dn)} – ${esc(r.label)}${r.bypass?' + by-pass':''}${F.multi?' ('+esc(r.zone)+')':''}</li>`).join('')}</ul>`);
  const pr=[...new Set(z.flatMap(x=>x.q?x.q.prest.concat(x.q.paniers):[]))];if(pr.length)out.autresPrestations=R(`<ul>${pr.map(t=>`<li>${esc(t)}</li>`).join('')}</ul>`);
  const fo=[...new Set(z.flatMap(x=>x.q?x.q.four:[]))];if(fo.length)out.autresFournitures=R(`<ul>${fo.map(t=>`<li>${esc(t)}</li>`).join('')}</ul>`);
  out.docsEntreprise=R(docsEntHTML(E));
  /* 14/10 soir (lot M2) : contact de chaque interlocuteur (« 06 … · prenom.nom@… »), fronts = équipes, radio feeder / antennes, zones, raccordements, visite, vidanges */
  const ct=p=>p?[p.tel,p.email].filter(Boolean).join(' · '):'';const adm=I.admin||[];const pn=p=>persName(p)||p.name||'';
  out.reContact=ct(I.re);out.chargeContact=ct(I.charge);out.cdtxContact=ct(I.cdtx);out.chefContact=ct(I.chef);out.qhseContact=ct(I.qhse);out.adminContact=adm.map(ct).filter(Boolean).join(' ; ');
  out.chefTel=P(I.chef).tel||'';out.chefEmail=P(I.chef).email||'';out.qhseTel=P(I.qhse).tel||'';out.qhseEmail=P(I.qhse).email||'';out.adminTel=adm.map(p=>p.tel).filter(Boolean).join(' ; ');out.adminEmail=adm.map(p=>p.email).filter(Boolean).join(' ; ');
  out.admin=etList(adm.map(pn).filter(Boolean));out.chargeNomTel=I.charge?pn(I.charge)+((I.charge.tel||I.charge.email)?' – '+(I.charge.tel||I.charge.email):''):'';out.nbFronts=out.nbEquipes;
  const vs=String((a.consult||{}).visite||'').slice(0,10);out.visiteTxt=vs?'la visite du site du '+dFR(vs):'l’analyse sur plans';
  out.zonesListe=etList(z.map(x=>x.nom+(x.ml?' ('+nb(x.ml)+' ml)':'')));
  if(F.v2){const rad=z.map(x=>x.q.radio).filter(r=>r.on);const rg=k=>{const v=[...new Set(rad.map(r=>r[k]).filter(x=>x>0))].sort((p,q)=>p-q);return !v.length?'':v.length===1?nb(v[0])+' %':nb(v[0])+' à '+nb(v[v.length-1])+' %';};out.radioFd=rg('fd');out.radioAnt=rg('ant');
    const vi2=z.find(x=>x.q.vidanges.paires>0);out.vidangesMode=out.vidangesType?out.vidangesType+(vi2&&vi2.q.vidanges.dep?' déportées':''):'';
    const rb={};z.forEach(x=>x.q.racc.forEach(r=>{rb[r.dn]=(rb[r.dn]||0)+r.q;}));out.raccTxt=etList(Object.keys(rb).map(Number).sort((p,q)=>p-q).map(d=>nb(rb[d])+' × DN '+d));}
  return out;}
/* prestations chiffrées d'UNE zone (li HTML) — par zone quand il y en a plusieurs */
function zonePrest(x){const q=x.q,P=x.P||{};const has=k=>Math.abs(num(P[k]))>0.005;const L=[];const dns=x.dn.map(r=>r.dn);
  if(x.dn.length)L.push(`${nb(x.J)} ${plur(x.J,'soudure')} sur ${nb(x.ml)} ml (DN ${esc(Math.min(...dns))}${dns.length>1?' à DN '+esc(Math.max(...dns)):''})`);
  if(has('decharg'))L.push(`Déchargement des éléments préisolés${q.decharg?' ('+nb(q.decharg)+' '+plur(q.decharg,'déchargement')+')':''}`);if(has('transfert'))L.push('Transfert des éléments vers les fronts de travaux');
  if(has('manchons'))L.push(`Jonctions isolées${q.typeManchon?' ('+esc(/electro/i.test(q.typeManchon)?'électrosoudables':'thermorétractables')+')':''} et continuité de la détection d’humidité`);
  if(has('purges'))L.push(`${nb(q.purges.paires)} ${plur(q.purges.paires,'paire')} de purges${q.purges.dn?' DN '+esc(q.purges.dn):''}${q.purges.dep?' déportées':''}`);
  if(has('vidanges'))L.push(`${nb(q.vidanges.paires)} ${plur(q.vidanges.paires,'paire')} de vidanges${q.vidanges.dn?' DN '+esc(q.vidanges.dn):''}${q.vidanges.dep?' déportées':''}`);
  if(has('vpi'))L.push(`${nb(q.vpi.reduce((s,v)=>s+v.q,0))} vannes préisolées`);if(has('sst'))L.push(`${nb(q.sst.reduce((s,v)=>s+v.q,0))} paires de vannes en sous-station${q.sst.some(s=>s.bypass)?' (avec by-pass)':''}`);
  if(has('racc'))L.push(`${nb(q.racc.reduce((s,v)=>s+v.q,0))} ${plur(q.racc.reduce((s,v)=>s+v.q,0),'raccordement')} sur réseau existant`);if(has('extrusion'))L.push('Extrusion PEHD');
  if(has('radio'))L.push(`Contrôle radiographique${q.radio.on?' : '+(q.radio.fd===q.radio.ant?nb(q.radio.fd)+' % des soudures':nb(q.radio.fd)+' % (feeder), '+nb(q.radio.ant)+' % (antennes)'):''}`);if(has('us'))L.push('Contrôle par ultrasons');if(has('ressuage'))L.push('Contrôle par ressuage');
  if(has('epreuve'))L.push(`${q.epreuves?nb(q.epreuves)+' '+plur(q.epreuves,'épreuve')+' hydraulique'+(q.epreuves>1?'s':''):'Épreuve hydraulique'}`);['boulet','rincage','passivation','eau','conservation'].forEach(k=>{if(has(k))L.push(esc(POSTE_LAB[k]));});
  ['fo_preiso','fo_acier','calo','pose_aerien','foncage','depose','nuit','doe'].forEach(k=>{if(has(k))L.push(esc(POSTE_LAB[k]));});return L;}

/* ═════════ 6 · TROUS REMPLIS SEULS (libellé du trou → variable) ═════════ */
const AUTO_HOLES=[[/^e-?mail( de contact)?$/,'chargeEmail'],[/^telephone( de contact)?$/,'chargeTel'],[/^nom du charge d'affaires?$/,'charge'],[/^nom du conducteur de travaux$/,'cdtx'],[/^nom du responsable d'exploitation$/,'re'],[/^nom du responsable qhse$/,'qhse'],
  [/^nom du chef (de chantier|d'equipe)$/,'chef'],[/^nom du maitre d'oeuvre$/,'moe'],[/^nom du maitre d'ouvrage$/,'moa'],[/^nombre de sous-?stations$/,'nbSst'],[/^% de soudures radiographiees$/,'radioPct'],[/^dn des purges$/,'purgesDn'],[/^dn des vidanges$/,'vidangesDn'],
  [/^nombre de vannes( preisolees)?$/,'nbVpi'],[/^date de (demarrage|debut)$/,'debut'],[/^date de fin$/,'fin'],[/^nombre d'equipes$/,'nbEquipes'],[/^nombre de raccordements$/,'nbRacc'],[/^nombre de zones$/,'nbZones'],[/^nom de l'assureur$/,'assureurRc'],[/^n° de police$/,'policeRc'],
  [/^date de remise de l'offre$/,'dateReponse'],[/^nom du signataire scr$/,'charge'],[/^fonction du signataire/,'chargeFonction'],[/^nombre d'epreuves( hydrauliques)?$/,'nbEpreuves'],[/^type de manchon/,'typeManchon']];
/* 14/10 soir (lot M2, re-scan des trous de la bibliothèque) : fronts = équipes, purges / vidanges (paires), mode des vidanges, taux radio (feeder / antennes),
   linéaire, total des sous-stations, zones, raccordements, interlocuteurs (administratif, environnement, SAV), lot, visite du site ;
   « téléphone et e-mail » seul = chargé d'affaires (dans un tableau ou après un nom : la personne de la ligne, memoire_trous.js) */
AUTO_HOLES.push([/^nombre de fronts\b/,'nbFronts'],[/^nombre de purges$/,'purgesPaires'],[/^nombre de vidanges$/,'vidangesPaires'],[/^par aspiration ou par gravite/,'vidangesMode'],[/^taux de controle radiographique$/,'radioPct'],
  [/^% (des soudures )?(du )?feeder\b/,'radioFd'],[/^% (des soudures )?(d')?antennes\b/,'radioAnt'],[/^lineaire en ml$/,'ml'],[/^nombre total de sous-?stations$/,'nbSst'],[/^designation et lineaire de chaque zone$/,'zonesListe'],
  [/^nombre et dn des raccordements$/,'raccTxt'],[/^nom de l'interlocuteur administratif$/,'admin'],[/^nom de l'interlocuteur$/,'charge'],[/^nom et telephone de l'interlocuteur sav$/,'chargeNomTel'],[/^lot du donneur d'ordre\b/,'lot'],
  [/^visite du site\b/,'visiteTxt'],[/^telephone et e-?mail$/,'chargeContact']);
export function autoHoleVar(lab){const k=normTxt(lab);for(const [re,v] of AUTO_HOLES)if(re.test(k))return v;return null;}
/* ═════════ 6 bis · TROUS FACULTATIFS, VALEURS D'ENTREPRISE, CONTACTS, ANNEXES (14/10 soir, lot M2 — libellés génériques normalisés par normTxt) ═════════ */
/* facultatifs : vides, ils disparaissent de l'export (séparateurs orphelins nettoyés) — seulement à une place où la phrase reste juste sans eux (memoire_trous.js) */
export const OPT_HOLES=[/^reference et indice du document/,/\ble cas echeant\b/,/\bsi exigee?s?\b/,/^n° d'annexe ou de figure$/,/^adresse et telephone\b/,/^dn ou troncons concernes/,/^produit de passivation/,/^points d'arret complementaires/,/^objet du detail/,
  /^(date|duree|conforme \/ non conforme|pression (initiale|finale) en bar)$/];
/* valeurs de l'entreprise : « Retenir pour les prochains mémoires » coché d'office */
export const ENT_HOLES=[/chiffre d'affaires/,/^effectifs?\b/,/qualifications?\b.*certificats?|^certificats?\b/,/^chartes\b/,/\bevaluation\b/,/^norme de qualification/,/^organisme de certification/,/\b(dmos|qmos)\b/,/\bpcr\b/,/^nom du prestataire\b/,/^prestations sous-traitees/,
  /^horaires de travail/,/^duree de validite/,/^duree, ex\./,/^delai d'intervention/,/\bgarantie\b/,/^produit de passivation/,/\bagence\b/,/^annee visee/,/^debit du compresseur/,/^adresse et telephone du maitre d'(ouvrage|oeuvre)$/];
/* jamais proposés à « Retenir » : trop génériques, ou propres à chaque affaire */
export const NEVER_RET=[/^(date|dates|duree|annee|ville, client|zone ou tranche|adresse et telephone)$/,/^(protection|cheminement|conforme)\b/,/^%/,/^(n°|no |numero)/,
  /^(date|dates|pression|temperature|lineaire|nombre|designation|detail|taux|zone|lieu|nature|fabricant|fournisseur|exutoire|forages|objet du detail|estimation|moyen de transfert|lot)\b/,/^nom du (maitre|coordonnateur|bureau)/,/^nom et adresse\b/,/^adresse du point\b/,
  /^adresse et telephone du maitre d'ouvrage delegue/,/\bconcerne/,/^sous-stations?\b/,/^dn\b/,/^references similaires/,/^type de (reseau|tube)/,/^sectorielles/,/prescriptions de la collectivite/,/\bimposee?s? par le cctp/,/^duree de la periode/,/^reference et indice\b/,/^description du systeme\b/];
export const optHole=nl=>OPT_HOLES.some(r=>r.test(nl));
export const entHole=nl=>ENT_HOLES.some(r=>r.test(nl));
export const neverRet=nl=>NEVER_RET.some(r=>r.test(nl));
/* contact d'une personne (ligne de tableau, paragraphe) : « téléphone et e-mail » / « téléphone » / « e-mail » ; n° d'annexe (calculé depuis la liste des annexes) */
export const contactKind=nl=>/^telephone et e-?mail$/.test(nl)?'both':/^telephone$/.test(nl)?'tel':/^e-?mail$/.test(nl)?'email':null;
export const annexKind=nl=>/^(n°|no|numero) (d'|de l')annexe\b/.test(nl);
/* puces de suggestion : le « ex. … » du libellé (« ex. 4 mois » → « 4 mois » ; « ex. thermorétractable ou électrosoudable » → deux puces) */
export function exChips(lab){const m=/\bex\.\s*(.+)$/i.exec(String(lab||''));if(!m)return [];const raw=m[1].replace(/\s*[.…]+\s*$/,'').trim();
  return [...new Set(raw.split(/\s*,\s+|\s+ou\s+|\s+\/\s+/).map(s=>s.trim()).filter(s=>s&&s.length<=80))].slice(0,6);}

/* ═════════ 7 · IMAGES DU PACK ═════════ */
export function imgOf(L,id){const im=L&&L.images&&L.images[id];if(!im)return null;const src=im.url||im.data||'';if(!src)return null;return {id,src,w:+im.w||0,h:+im.h||0,png:/png/i.test(im.mime||'')||/^data:image\/png/.test(im.data||''),titre:im.titre||''};}
const ok64=s=>/^data:image\/(jpeg|jpg|png|webp);base64,[A-Za-z0-9+/=]+$/.test(s);
export function dataToBytes(d){const b64=String(d).split(',')[1]||'';const bin=atob(b64);const u=new Uint8Array(bin.length);for(let i=0;i<bin.length;i++)u[i]=bin.charCodeAt(i);return u;}
/* import du pack : chaque image au stockage si l'on est connecté (comme les PDF de l'accueil RH), sinon data URL gardée */
export async function packImages(imgs,ctx){const out={};let up=0,kept=0,bad=0;const S=A&&A.sync;const cloud=!!(A&&A.state&&A.state.cloudUser&&S&&S.uploadDoc);
  for(const [id,im0] of Object.entries(imgs||{})){const im=typeof im0==='string'?{data:im0}:(im0||{});const data=String(im.data||'');if(!/^[A-Za-z0-9._:-]{1,80}$/.test(id)||!ok64(data)||data.length>4e6){bad++;continue;}
    const png=/^data:image\/png/.test(data);const meta={w:+im.w||0,h:+im.h||0,mime:png?'image/png':'image/jpeg',titre:String(im.titre||'').slice(0,200)};let url=null;
    if(cloud){try{const blob=new Blob([dataToBytes(data)],{type:meta.mime});url=await S.uploadDoc('entreprise','memoire',id+(png?'.png':'.jpg'),blob);}catch(e){url=null;}}
    if(url){out[id]=Object.assign(meta,{url});up++;}else{out[id]=Object.assign(meta,{data});kept++;}}
  return {images:out,up,kept,bad};}
const BYTES=new Map();
/* octets d'une image (export Word) : data URL décodée, sinon lue au stockage ; null si illisible (hors connexion) */
export async function imgBytes(L,id){const im=L&&L.images&&L.images[id];if(!im)return null;const k=id+'|'+(im.url||String(im.data||'').length);if(BYTES.has(k))return BYTES.get(k);let u=null;
  try{if(im.data)u=dataToBytes(im.data);else if(im.url){const r=await fetch(im.url);if(r.ok)u=new Uint8Array(await r.arrayBuffer());}}catch(e){u=null;}if(u){if(BYTES.size>80)BYTES.clear();BYTES.set(k,u);}return u;}

/* ═════════ 8 · NOMBRE DE PAGES (estimation honnête) ═════════
   Modèle : A4, marges du gabarit, corps 12 pt (interligne 1,15 × 1,22 de Calibri), titres, listes, tableaux ligne à ligne, images à leur hauteur ;
   saut de page avant chaque grande section (sauf exceptions du gabarit) ; + page de garde + sommaire. Étalonné sur les exports réels (Word via LibreOffice, PDF via Chromium). */
const strip=h=>String(h||'').replace(/<[^>]+>/g,' ').replace(/&nbsp;/g,' ').replace(/&[a-z#0-9]+;/gi,'x').replace(/\s+/g,' ').trim();
export function estimatePages(M,T){const pg=T.margins||[25,21,22,19];const Hpage=297-pg[0]-pg[2]-6,W=210-pg[1]-pg[3];const bodyPt=T.body.size||12;
  const est=(k)=>{const lh=bodyPt*0.3528*(T.body.lh||1.15)*(k==='word'?1.22:1.20);const cw=bodyPt*0.3528*(k==='word'?0.47:0.475);const after=Math.max(T.body.after||6,6)*0.3528;
    const lines=(t,w,size)=>{const c=Math.max(8,Math.floor((w)/(cw*(size||bodyPt)/bodyPt)));return Math.max(1,Math.ceil(strip(t).length/c));};
    const blockH=html=>{let h=0;const s=String(html||'');
      s.replace(/<table[\s\S]*?<\/table>|<li>[\s\S]*?<\/li>|<h4>[\s\S]*?<\/h4>|<p>[\s\S]*?<\/p>/g,m=>{if(m.startsWith('<table')){const rows=m.match(/<tr[\s\S]*?<\/tr>/g)||[];rows.forEach(r=>{const cells=r.match(/<t[dh][\s\S]*?<\/t[dh]>/g)||[];const cw2=W/Math.max(1,cells.length);const mx=Math.max(1,...cells.map(c=>lines(c,cw2-4,(T.tab.size||10.5))));h+=mx*lh*(T.tab.size||10.5)/bodyPt+1.6;});h+=after;}
        else if(m.startsWith('<li'))h+=lines(m,W-(T.bul.indent||12.7),bodyPt)*lh+1.2;else if(m.startsWith('<h4'))h+=lh+3;else h+=lines(m,W-(T.body.indent||0),bodyPt)*lh+after;return m;});
      if(/<\/(ul|ol)>/.test(s))h+=(T.bul.after||8)*0.3528;return h;};
    let pages=2;let cur=0;const newPage=()=>{if(cur>0){pages++;cur=0;}};
    M.secs.forEach((S,i)=>{if(i===0||!S.nob)newPage();else if(cur>Hpage*0.75)newPage();const add=h=>{if(cur+h>Hpage){pages++;cur=Math.min(h,Hpage);}else cur+=h;};
      add((T.h1.size||16)*0.3528*1.6+8);S.blocs.forEach(B=>{add((T.h2.size||15)*0.3528*1.5+7);B.items.forEach(it=>{if(it.titre)add((T.h3.size||13)*0.3528*1.4+5);
        if(it.kind==='image'){const wr=Math.min(1,(it.largeur||100)/100);const iw=it.cote?W*wr:W*wr;let ih=it.w&&it.h?iw*it.h/it.w:iw*0.6;ih=Math.min(ih,Hpage*0.82);const th=it.cote?blockH(it.html):0;add(Math.max(ih,th)+(it.legende?6:0)+4);}
        else if(it.kind==='equipe'){((it.eq||{}).poles||[]).forEach(po=>{add(8);po.rows.forEach(r=>add(Math.max(14,(Math.max(r.persons.length,1)*3+r.missions.length*1.4)*4.2)));});}
        else{const h=blockH(it.html);if(h>Hpage)pages+=Math.floor(h/Hpage);add(h%Hpage||h);}});});});
    return Math.max(2,pages+(cur>0?0:-1)+(M.secs.length?0:0));};
  return {word:est('word'),pdf:est('pdf')};}

/* ═════════ 9 · CSS du lot B (injectée une fois) ═════════ */
const CSS3=`.mem3-fig{margin:6px 0 10px;text-align:center;break-inside:avoid;page-break-inside:avoid}.mem3-fig img{max-width:100%;height:auto;display:inline-block}.mem3-cap{font-size:9.5pt;font-style:italic;color:#555;margin:3px 0 0;text-align:center}
.mem3-side{display:flex;gap:12px;align-items:center;margin:6px 0 10px;break-inside:avoid;page-break-inside:avoid}.mem3-side.droite{flex-direction:row-reverse}.mem3-side>.mem3-im{flex:0 0 auto;text-align:center}.mem3-side>.mem3-im img{max-width:100%;height:auto}.mem3-side>.mem3-tx{flex:1 1 0;min-width:0;text-align:left}.mem3-side>.mem3-tx>*:last-child{margin-bottom:0}
.mem3-eq{margin:4px 0 12px}.mem3-eq.mem3-click{cursor:pointer;border-radius:8px}@media (hover:hover){.mem3-eq.mem3-click:hover{outline:2px dashed #e7b9a3;outline-offset:4px}}.mem3-pole{margin:0 0 10px;break-inside:avoid;page-break-inside:avoid}.mem3-pt{font-weight:bold;font-style:italic;font-size:12pt;margin:0 0 6px;border-bottom:1px solid #ddd;padding-bottom:2px}
.mem3-row{display:grid;grid-template-columns:30% 30% 1fr;gap:6px;margin:0 0 6px;align-items:stretch;break-inside:avoid;page-break-inside:avoid}.mem3-role{background:var(--mem3-or,#ED7D31);color:#fff;font-weight:bold;border-radius:8px;padding:6px 8px;display:flex;align-items:center;justify-content:space-between;gap:6px;font-size:10.5pt;line-height:1.15}
.mem3-role img{width:30px;height:30px;object-fit:contain;flex:none}.mem3-pers,.mem3-mis{border:1.2px solid var(--mem3-or,#ED7D31);border-radius:8px;padding:4px 8px;font-size:9.5pt;line-height:1.25;display:flex;flex-direction:column;justify-content:center;min-width:0;overflow-wrap:anywhere}
.mem3-mis.vide{border-color:transparent}.mem3-pers b{color:var(--mem3-nom,#C0504D);font-weight:bold}.mem3-pers>div+div{margin-top:4px}.mem3-mis ul{margin:0;padding-left:14px}.mem3-mis li{margin:0}.mem3-ops{font-size:9.5pt}
.mem3-nav{position:sticky;top:0;z-index:5;display:flex;align-items:center;gap:6px;flex-wrap:wrap;background:#fff6f0;border:1px solid #f0c9b4;border-radius:10px;padding:4px 8px;margin:0 auto 10px;max-width:820px;box-shadow:0 2px 6px rgba(0,0,0,.08)}
.mem3-nav .mem3-nt{white-space:nowrap;overflow:hidden;text-overflow:ellipsis;min-width:0}.mem3-nav.ok{background:#eefaf2;border-color:#9ed1b0}.mem3-nav b{color:#b42318}.mem3-nav.ok b{color:#15673a}.mem3-nav .mem3-pos{min-width:56px;text-align:center;font-variant-numeric:tabular-nums;font-size:13px}.mem3-nav .btn{min-height:36px}.mem3-nav .mem3-grow{flex:1}
.mem3-inter{border:1px solid var(--line);border-radius:10px;padding:6px 8px;margin:0 0 8px;background:var(--surface,#fff)}.mem3-inter summary{cursor:pointer;font-weight:700;font-size:13px;min-height:36px;display:flex;align-items:center;gap:6px}
.mem3-il{display:flex;justify-content:space-between;gap:8px;font-size:12px;padding:3px 0;border-top:1px dashed #eee}.mem3-il span:first-child{color:var(--ink2)}.mem3-il b{text-align:right;overflow-wrap:anywhere}.mem3-il .bad{color:#c62828}
.mem3-flash{animation:mem3fl 1.6s ease-out 1}@keyframes mem3fl{0%{background:#ffe2b8;box-shadow:0 0 0 4px #ffe2b8}100%{background:transparent;box-shadow:0 0 0 0 transparent}}
.memoire-prow.mem3-hl,.memoire-brow.mem3-hl{background:#fff1e6;border-radius:8px;box-shadow:inset 3px 0 0 #eb6834}
.memoire-sec.mem3-empty>.memoire-sech{opacity:.55;background:#f4f3ef}.memoire-sec.mem3-empty>.memoire-sech b{font-weight:600}.memoire-bloc.mem3-off .memoire-btx b{color:#8a877f;font-weight:600}
.mem3-n{display:inline-block;min-width:2.2em;color:#6b6b66;font-variant-numeric:tabular-nums}.memoire-tg.auto{background:#e8f0fb;color:#1f4f8f}
.mem3-pb{border:0;border-top:1px dashed #cfcac0;margin:18px -46px 14px;position:relative}.mem3-pb::after{content:'saut de page';position:absolute;right:46px;top:-9px;background:#fff;color:#a39e93;font-size:10px;padding:0 6px}
.memoire-page .memoire-p{cursor:default}.memoire-page .memoire-p.mem3-sel{background:rgba(235,104,52,.06);border-radius:6px}
.mem3-ops-list{max-height:34vh;overflow:auto;border:1px solid var(--line);border-radius:8px;padding:4px 6px;margin:4px 0 8px}.mem3-ops-list label{display:flex;align-items:center;gap:8px;min-height:40px;font-size:13px}.mem3-ops-list input{width:20px;height:20px;flex:none}
.mem3-exp{display:flex;flex-wrap:wrap;gap:4px;align-items:center}.mem3-exp .lnk{font-size:11.5px}.mem3-exp .cm-nbub{white-space:nowrap;margin:0;flex:none}#memoire-stats{grid-template-columns:repeat(auto-fit,minmax(140px,1fr))}
@media(max-width:600px){.mem3-nav{flex-wrap:nowrap;gap:4px;padding:4px 6px}.mem3-nav .mem3-ntx{display:none}.mem3-nav .mem3-sv{display:none}.mem3-nav .mem3-pos{min-width:44px}.mem3-row{grid-template-columns:1fr 1fr}.mem3-row .mem3-mis{grid-column:1 / -1}.mem3-row .mem3-mis.vide{display:none}.mem3-pb{margin:14px -14px 10px}.mem3-pb::after{right:14px}.mem3-side{flex-direction:column}.mem3-side.droite{flex-direction:column}}`;
export function injectLotB(T){if(typeof document==='undefined')return;let st=document.getElementById('css-lot-b');if(!st){st=document.createElement('style');st.id='css-lot-b';st.textContent=CSS3;document.head.appendChild(st);}
  if(T){const v=`:root{--mem3-or:${T.boxOr||'#ED7D31'};--mem3-nom:${T.boxNom||'#C0504D'}}`;let s2=document.getElementById('css-lot-b-var');if(!s2){s2=document.createElement('style');s2.id='css-lot-b-var';document.head.appendChild(s2);}if(s2.textContent!==v)s2.textContent=v;}}
export const CSS_LOT_B=CSS3;
