// comptech.js — 31/10 (lot CC) : COMPTE CHANTIER. Ethan (scope V1 du 30/10) : « compte chantier (BDC + dépenses + heures par poste, pas de compta) ».
// Par CHANTIER (pas par affaire), en LECTURE SEULE. Module branché sur l'espace (modules.js), option de palier « comptechantier » (Labo par défaut).
//  · Bons de commande rattachés au chantier (c.site) : montant, état ; comptés = engagés (envoyée, reçue, facturée — montant de la facture du fournisseur s'il est
//    saisi : bonMontant de debours.js) ; brouillons et annulés listés, pas comptés.
//  · Dépenses : notes de frais validées / remboursées du chantier (TTC ramené en HT avec la TVA de l'affaire, 20 % d'office — comme l'onglet Débours) ; dépenses saisies
//    dans l'onglet Débours de l'affaire (sous-traitance, location, autres) rattachées à ce chantier, ou d'une affaire qui n'a que ce chantier.
//  · Heures par poste : LE calcul de la navette (debours.js → heuresAffaire : pointages du chantier, semaine lundi → samedi, dimanche hors navette) × coût horaire du
//    poste (debours.js → tauxPoste : taux saisi pour l'affaire du chantier, sinon la base de prix) — jamais un calcul parallèle. Le chantier compte en entier
//    (pas de part d'affaire). Heures pas encore validées : comptées, signalées « à confirmer ».
//  · Totaux par nature, total général ; période : tout / un mois (‹ ›) ; impression A4 (charte : docHTML).
//  « Pas de compta » : ni facturé, ni marge, ni TVA détaillée (tout en HT).
// ACCÈS : conducteur, bureau, direction, administrateur (droit « Planning » ou « Affaires : modifier », avec l'onglet Pilotage). Le chef de chantier N'Y A PAS accès en V1 :
// l'écran montre les coûts horaires par poste (choix du lot, à valider par Ethan). Entrées : Pilotage → Achats & comptes → « Compte d'un chantier » ; chantier →
// onglet Bureau → tuile « 💶 Compte chantier ».
// SERVEUR : aucune lecture nouvelle — bons, notes de frais, affaires et base de prix sont chargés au démarrage ; pointages et navette viennent de l'espace.
import {espaceState,espaceToday} from './espace.js';
import {heuresAffaire,tauxPoste,bonMontant,tvaOf,lignesOf,BC_COMPTE,DB_TYPES,posteLab,dbGoAffaire} from './debours.js';
import {affAll} from './affaires.js';
import {cmdAll,dbAll,cmdTotal,cmdState,BC_ETATS,NATURES,DB_ETATS} from './commandes.js';
import {docHTML} from './charte.js';
import {feat,can} from './acces.js';
import {r2} from './compteurs.js';
import {cssLotCC} from './demandes.js';
const esc=s=>String(s==null?'':s).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const norm=s=>String(s||'').normalize('NFD').replace(/[̀-ͯ]/g,'').toLowerCase();
const nb=(x,d)=>(+x||0).toLocaleString('fr-FR',{maximumFractionDigits:d===undefined?0:d,minimumFractionDigits:d===undefined?0:d});
const eur=x=>nb(x)+' €';
const eur2=x=>nb(x,2)+' €';
const hh=x=>{x=r2(x);return (Number.isInteger(x)?String(x):x.toLocaleString('fr-FR',{maximumFractionDigits:2}))+' h';};
const pad=n=>String(n).padStart(2,'0');
const eurH=x=>nb(x,Number.isInteger(+x)?0:2)+' €/h'; /* coût horaire compact (téléphone) */
const auj=()=>{try{const t=espaceToday();if(/^\d{4}-\d{2}-\d{2}$/.test(String(t)))return t;}catch(e){}const d=new Date();return d.getFullYear()+'-'+pad(d.getMonth()+1)+'-'+pad(d.getDate());};
const dFR=x=>{if(!x)return '';const d=new Date(String(x).length<=10?x+'T12:00:00':x);return isNaN(d)?esc(String(x)):d.toLocaleDateString('fr-FR');}; /* une date illisible s'affiche telle quelle, échappée */
const MOIS_L=['janvier','février','mars','avril','mai','juin','juillet','août','septembre','octobre','novembre','décembre'];
const ymTxt=ym=>ym?MOIS_L[+String(ym).slice(5,7)-1]+' '+String(ym).slice(0,4):'';
const ymAdd=(ym,n)=>{const [y,m]=String(ym).split('-').map(Number);const k=y*12+(m-1)+n;return Math.floor(k/12)+'-'+pad((k%12)+1);};
const tag=(k,T)=>{const e=(T||[]).find(x=>x[0]===k);return e?`<span class="af-tag" style="background:${e[2]}">${esc(e[1])}</span>`:esc(k||'');};
const typLab=k=>(DB_TYPES.find(t=>t[0]===k)||DB_TYPES[DB_TYPES.length-1])[1];
const natLab=k=>(NATURES.find(n=>n[0]===k)||[k,k||''])[1];
/* ── accès ── */
const okRights=c=>!!(c('planning.edit')||(c('affaires.edit')&&(c('pointage.validate')||c('qse.manage')))); /* le compte s'ouvre dans Pilotage : il faut aussi l'onglet (app.js okX) — l'administrateur a tout */
export const ccCan=ctx=>!!(ctx&&okRights(k=>ctx.can(k)));
export const ccBureauOK=()=>{try{return feat('comptechantier')&&okRights(k=>can(k));}catch(e){return false;}}; /* tuile du Bureau du chantier (next.js) : la personne connectée */
export function ccBureauTile(id,tile){try{return id&&ccBureauOK()?tile('__compte','Compte chantier','💶','bons, dépenses, heures',0):'';}catch(e){return '';}}
/* ── état de l'écran (par appareil) ── */
const CS={per:'tout',m:null,q:'',autres:false,from:null};
const perOf=()=>CS.per==='mois'?{k:'mois',m:CS.m||auj().slice(0,7),lab:ymTxt(CS.m||auj().slice(0,7))}:{k:'tout',lab:'depuis le début'};
const inPer=(ym,P)=>P.k==='tout'||String(ym||'')===P.m;
/* ── annuaire : clé → nom, poste (DATA.personnes de l'espace ; sinon comptes / personnages) ── */
function peopleOf(ctx){const m=new Map();const add=(id,name,poste)=>{if(id&&!m.has(id))m.set(id,{id,name:name||id,poste:poste||'autre'});};
  ((ctx&&ctx.people)||[]).forEach(p=>add(p.id,((p.prenom||'')+' '+(p.nom||'')).trim(),p.poste));
  if(!m.size&&ctx&&ctx.api){try{const L=(ctx.api.accounts&&ctx.api.accounts())||(ctx.api.personas&&ctx.api.personas())||[];L.forEach(a=>add(((a.email||'').toLowerCase()||String(a.id||'')),a.name,a.poste));}catch(e){}}
  return m;}
const sitesAll=ctx=>{const base=(ctx&&ctx.sites)||[];let meta=[];try{meta=(ctx.api&&ctx.api.sites&&ctx.api.sites())||[];}catch(e){meta=[];}const M=new Map(meta.map(x=>[x.id,x]));return base.map(s=>Object.assign({},M.get(s.id)||{},{id:s.id,name:s.name||(M.get(s.id)||{}).name||s.id}));};
/* ── LE MODÈLE d'un chantier : tout ce qui coûte, ligne par ligne, avec son mois ── */
export function ccModel(id,ctx){const affs=affAll().filter(a=>a&&!a.deleted&&(a.sites||[]).includes(id)).sort((a,b)=>String(a.num).localeCompare(String(b.num)));
  const H=heuresAffaire({num:'cc:'+id,sites:[id]}); /* la navette, comme l'onglet Débours (cache à part : « cc:<chantier> ») */
  const PI=peopleOf(ctx);const TX={};
  const taux=p=>{if(!(p in TX)){let t=null;for(const a of affs){const x=tauxPoste(a,p);if(x.src==='affaire'){t=Object.assign({aff:a.num},x);break;}}TX[p]=t||tauxPoste({},p);}return TX[p];}; /* taux saisi pour une affaire du chantier, sinon la base de prix */
  const mo=H.rows.map(r=>{const pi=PI.get(r.p)||{id:r.p,name:String(r.p||'?').replace(/^l:/,'').split('@')[0],poste:'?'};const t=taux(pi.poste);return {p:r.p,d:r.d,ym:r.ym,h:r.h,ok:r.ok,poste:pi.poste,name:pi.name,taux:t.h,src:t.src,aff:t.aff||null,cout:r2(r.h*t.h)};});
  const bons=cmdAll().filter(c=>c&&!c.deleted&&c.site===id).map(c=>{const compte=BC_COMPTE.includes(c.etat);const m=bonMontant(c);return {c,num:c.num,ym:String(c.at||'').slice(0,7),etat:c.etat,compte,montant:m,cout:compte?m:0};});
  const tva=affs.length===1?tvaOf(affs[0]):20;
  const frais=dbAll().filter(d=>d&&!d.deleted&&d.site===id&&d.etat!=='refuse').map(d=>{const ok=d.etat==='valide'||d.etat==='rembourse';const ht=r2((+d.montant||0)/(1+tva/100));return {d,ym:String(d.date||'').slice(0,7),ok,ttc:+d.montant||0,ht,cout:ok?ht:0};});
  const lignes=[],horsCh=[];affs.forEach(a=>lignesOf(a).forEach(l=>{const x={a,l,ym:String(l.date||'').slice(0,7),type:DB_TYPES.some(t=>t[0]===l.type)?l.type:'autre',cout:r2(+l.montant||0)};if(l.site?l.site===id:(a.sites||[]).length===1)lignes.push(x);else if(!l.site)horsCh.push(x);}));
  return {id,affs,mo,bons,frais,lignes,horsCh,tva};}
/* les chiffres d'une période */
export function ccTotaux(M,P){P=P||perOf();const S=L=>r2(L.filter(x=>inPer(x.ym,P)).reduce((s,x)=>s+(+x.cout||0),0));
  const moL=M.mo.filter(x=>inPer(x.ym,P));const mo=r2(moL.reduce((s,x)=>s+x.cout,0)),h=r2(moL.reduce((s,x)=>s+x.h,0)),hConf=r2(moL.filter(x=>!x.ok).reduce((s,x)=>s+x.h,0));
  const ach=S(M.bons),nf=S(M.frais);const typ=t=>r2(M.lignes.filter(x=>x.type===t&&inPer(x.ym,P)).reduce((s,x)=>s+x.cout,0));const st=typ('st'),loc=typ('loc'),aut=typ('autre');
  const G={};moL.forEach(x=>{const g=G[x.poste]||(G[x.poste]={poste:x.poste,h:0,hConf:0,cout:0,taux:x.taux,src:x.src,aff:x.aff,gens:new Set()});g.h=r2(g.h+x.h);if(!x.ok)g.hConf=r2(g.hConf+x.h);g.cout=r2(g.cout+x.cout);g.gens.add(x.p);});
  const postes=Object.values(G).map(g=>Object.assign(g,{n:g.gens.size})).sort((a,b)=>b.h-a.h||String(posteLab(a.poste)).localeCompare(String(posteLab(b.poste)),'fr'));
  return {mo,h,hConf,ach,nf,st,loc,aut,dep:r2(nf+st+loc+aut),total:r2(mo+ach+nf+st+loc+aut),postes,sansTaux:postes.some(g=>!(g.taux>0)),P};}
/* ══════════ écrans ══════════ */
const wrap=h=>`<div class="cc-root">${h}</div>`;
function vChoix(me,ctx){const L=sitesAll(ctx);const PT=((espaceState()||{}).pointages||[]);const q=norm(CS.q).trim();
  const st=new Map();const inc=(id,k)=>{if(!id)return;const o=st.get(id)||{bc:0,nf:0,j:new Set()};if(k==='j')return o;o[k]++;st.set(id,o);return o;};
  cmdAll().forEach(c=>{if(c&&!c.deleted&&c.site)inc(c.site,'bc');});dbAll().forEach(d=>{if(d&&!d.deleted&&d.site&&d.etat!=='refuse')inc(d.site,'nf');});
  PT.forEach(x=>{if(!x||!x.site||!x.d)return;const o=st.get(x.site)||{bc:0,nf:0,j:new Set()};o.j.add(x.d);st.set(x.site,o);});
  const info=s=>{const o=st.get(s.id);return o?{bc:o.bc,nf:o.nf,j:o.j.size}:{bc:0,nf:0,j:0};};const mine=s=>s.conducteur===me.id||s.chef===me.id;
  const F=L.filter(s=>!q||norm(s.name+' '+(s.ville||'')).includes(q)).map(s=>Object.assign({},s,{i:info(s)}));const has=s=>s.i.bc||s.i.nf||s.i.j;
  const A1=F.filter(s=>mine(s)||has(s)).sort((a,b)=>(mine(b)?1:0)-(mine(a)?1:0)||(b.i.j+b.i.bc+b.i.nf)-(a.i.j+a.i.bc+a.i.nf)||String(a.name).localeCompare(String(b.name),'fr'));const A2=F.filter(s=>!(mine(s)||has(s))).sort((a,b)=>String(a.name).localeCompare(String(b.name),'fr'));
  const row=s=>`<button class="ac-row" data-act="x" data-v="cc|open|${esc(s.id)}"><span class="ic" style="background:#e3f3f3">💶</span><span class="tx"><b>${esc(s.name)}</b><small>${esc(s.ville||'')}${s.ville?' · ':''}${s.i.j?s.i.j+' jour'+(s.i.j>1?'s':'')+' pointé'+(s.i.j>1?'s':''):'aucun pointage'}${s.i.bc?' · '+s.i.bc+' bon'+(s.i.bc>1?'s':''):''}${s.i.nf?' · '+s.i.nf+' note'+(s.i.nf>1?'s':'')+' de frais':''}${mine(s)?' · ton chantier':''}</small></span><span class="chev">›</span></button>`;
  return `<h2 class="vt">Compte d'un chantier <span class="hint">· bons de commande, dépenses, heures par poste — pas de compta</span></h2>
    <input class="f cc-q" type="search" enterkeyhint="search" autocomplete="off" placeholder="🔍 Chercher un chantier" data-xin="cc|q" value="${esc(CS.q)}" aria-label="Chercher un chantier">
    <div id="cc-list">${A1.map(row).join('')||'<div class="eq-s">Aucun chantier avec des chiffres'+(q?' pour cette recherche':'')+'.</div>'}
    ${A2.length?`<button class="dm-fold" data-act="x" data-v="cc|autres|"><span>${CS.autres||q?'▾':'▸'} Autres chantiers</span><span class="hint">${A2.length}</span></button>${CS.autres||q?A2.slice(0,80).map(row).join(''):''}`:''}</div>
    <p class="hint">Le compte d'un chantier se lit aussi depuis le chantier : onglet Bureau → 💶 Compte chantier.</p>`;}
function vCompte(id,me,ctx){const s=sitesAll(ctx).find(x=>x.id===id);if(!s)return `<button class="ac-back" data-act="x" data-v="cc|choix|">‹ Choisir un chantier</button><div class="card"><div class="eq-s">Chantier introuvable sur cet appareil.</div></div>`;
  const M=ccModel(id,ctx);const P=perOf();const T=ccTotaux(M,P);
  const tile=(cls,v,l)=>`<div class="cc-tile ${cls}"><b>${v}</b><small>${l}</small></div>`;
  const per=`<div class="cc-per"><span class="dim" style="font-size:12px">Période</span><button class="chip${P.k==='tout'?' active':''}" data-act="x" data-v="cc|per|tout">Tout</button><button class="chip${P.k==='mois'?' active':''}" data-act="x" data-v="cc|per|mois">Un mois</button>${P.k==='mois'?`<span class="cc-nav"><button class="chip" data-act="x" data-v="cc|m|${ymAdd(P.m,-1)}" aria-label="Mois précédent">‹</button><b>${esc(P.lab)}</b><button class="chip" data-act="x" data-v="cc|m|${ymAdd(P.m,1)}" aria-label="Mois suivant">›</button></span>`:''}</div>`;
  const tiles=`<div class="cc-tiles">${tile('tot',eur(T.total),'total HT · '+esc(P.lab))}${tile('',eur(T.mo),'main-d\'œuvre · '+hh(T.h)+(T.hConf?' (dont '+hh(T.hConf)+' à confirmer)':''))}${tile('',eur(T.ach),'bons de commande engagés')}${tile('',eur(T.dep),'dépenses (frais, sous-traitance, location…)')}</div>`;
  const affLnk=M.affs.length?`<div class="eq-s" style="margin:2px 0 4px">Affaire${M.affs.length>1?'s':''} : ${M.affs.map(a=>ctx.can('affaires.view')&&feat('commerce')?`<button class="cc-lnk" data-act="x" data-v="cc|aff|${esc(a.num)}">${esc(a.num)}</button>`:esc(a.num)).join(', ')}</div>`:'';
  return `<div class="cc-acts" style="margin-top:0"><button class="btn sm" data-act="x" data-v="cc|choix|">‹ Autre chantier</button><button class="btn sm" data-act="x" data-v="cc|site|${esc(id)}">↩ Ouvrir le chantier</button><button class="btn sm" data-act="x" data-v="cc|print|${esc(id)}">🖨 Imprimer (A4)</button></div>
    <div class="card cc-card"><h3>💶 Compte chantier · ${esc(s.name)} <span class="hint">· lecture seule · tout en HT · pas de compta</span></h3>${s.ville?`<div class="eq-s">${esc(s.ville)}</div>`:''}${affLnk}${per}${tiles}</div>
    ${postesCard(T)}${bonsCard(M,P)}${depCard(M,P)}${totCard(T)}
    <p class="hint">Heures = navette de paie (pointages du chantier, semaine du lundi au samedi, rangées au mois du jour pointé) × coût horaire du poste (taux saisi pour l'affaire du chantier, sinon la base de prix : taux + frais généraux + sinistre). Bons comptés = envoyés, reçus, facturés (montant de la facture s'il est saisi). Notes de frais : validées, TTC ramené en HT (${nb(M.tva,1)} %). Rien n'est modifiable ici : les bons dans Achats → Bons de commande, les notes de frais dans Notes de frais à valider, les dépenses dans l'onglet Débours de l'affaire.</p>`;}
function postesCard(T){const rows=T.postes.map(g=>`<tr><td class="txt"><b>${esc(posteLab(g.poste))}</b><div class="dim">${g.n} personne${g.n>1?'s':''}</div></td><td class="num">${hh(g.h)}${g.hConf?`<div class="dim cc-warn">dont ${hh(g.hConf)} à confirmer</div>`:''}</td><td class="num">${g.taux>0?eurH(g.taux)+(g.src==='affaire'?'<div class="dim">taux de l\'affaire</div>':''):'<span class="cc-warn">⚠ à renseigner</span>'}</td><td class="num"><b>${g.taux>0?eur(g.cout):'—'}</b></td></tr>`).join('');
  return `<div class="card cc-card"><h3>Heures par poste <span class="hint">· ${hh(T.h)} · ${eur(T.mo)}</span></h3>${rows?`<div class="cc-tw"><table class="cc-tab"><tr><th class="txt">Poste</th><th class="num">Heures</th><th class="num">Coût horaire</th><th class="num">Coût HT</th></tr>${rows}<tr class="tot"><td class="txt">Total</td><td class="num">${hh(T.h)}</td><td></td><td class="num">${eur(T.mo)}</td></tr></table></div>`:'<div class="eq-s">Aucune heure pointée sur ce chantier pour la période.</div>'}
    ${T.sansTaux?'<div class="warnbox">⚠ Un coût horaire manque : ces heures sont comptées à 0 €. Il se règle dans la base de prix (Affaires → ⚙ Base de prix SCR) ou pour l\'affaire du chantier (Affaires → affaire → 💶 Débours).</div>':''}</div>`;}
function bonsCard(M,P){const L=M.bons.filter(b=>inPer(b.ym,P)).sort((x,y)=>String(y.c.at||'').localeCompare(String(x.c.at||'')));const tot=r2(L.reduce((s,b)=>s+b.cout,0));
  const rows=L.map(b=>{const c=b.c;return `<tr class="${b.compte?'':'off'}"><td class="txt"><button class="cc-lnk" data-act="x" data-v="cc|bc|${esc(c.num)}">${esc(c.num)}</button><div class="dim">${dFR(c.at)}</div></td><td class="txt">${esc(c.fournisseur||'fournisseur ?')}${c.objet?`<div class="dim">${esc(c.objet)}</div>`:''}<div class="cc-pho">${tag(c.etat,BC_ETATS)}</div></td><td class="txt ph">${tag(c.etat,BC_ETATS)}</td><td class="num">${eur2(b.montant)}${c.etat==='facturee'&&c.facture&&+c.facture.montant>0&&r2(+c.facture.montant)!==r2(cmdTotal(c))?'<div class="dim">facture</div>':''}</td><td class="num ph">${b.compte?'<b>'+eur2(b.cout)+'</b>':'<span class="dim">non compté</span>'}</td></tr>`;}).join('');
  return `<div class="card cc-card"><h3>Bons de commande <span class="hint">· ${L.length} · ${eur(tot)} engagés</span></h3>${rows?`<div class="cc-tw"><table class="cc-tab"><tr><th class="txt">N°</th><th class="txt">Fournisseur · objet</th><th class="txt ph">État</th><th class="num">Montant HT</th><th class="num ph">Compté</th></tr>${rows}<tr class="tot"><td class="txt" colspan="2">Total engagé</td><td class="ph"></td><td class="num">${eur2(tot)}</td><td class="ph"></td></tr></table></div>`:'<div class="eq-s">Aucun bon de commande rattaché à ce chantier pour la période.</div>'}</div>`;}
function depCard(M,P){const F=M.frais.filter(f=>inPer(f.ym,P)).sort((x,y)=>String(y.d.date).localeCompare(String(x.d.date)));const ok=F.filter(f=>f.ok),att=F.filter(f=>!f.ok);const L=M.lignes.filter(l=>inPer(l.ym,P)).sort((x,y)=>String(y.l.date||'').localeCompare(String(x.l.date||'')));const H=M.horsCh.filter(l=>inPer(l.ym,P));
  const tNf=r2(ok.reduce((s,f)=>s+f.ht,0)),tL=r2(L.reduce((s,l)=>s+l.cout,0));
  const rf=f=>`<tr class="${f.ok?'':'off'}"><td>${dFR(f.d.date)}</td><td class="txt">${esc(f.d.name||'')}</td><td class="txt">${esc(natLab(f.d.nature))}${f.d.commentaire?`<div class="dim">${esc(f.d.commentaire)}</div>`:''}</td><td class="txt ph">${tag(f.d.etat,DB_ETATS)}</td><td class="num ph">${eur2(f.ttc)}</td><td class="num">${f.ok?'<b>'+eur2(f.ht)+'</b>':'<span class="dim">en attente</span>'}</td></tr>`;
  const rl=x=>`<tr><td>${dFR(x.l.date)}</td><td class="txt">${esc(typLab(x.type))}</td><td class="txt">${esc(x.l.lib||'')}${x.l.fournisseur?`<div class="dim">${esc(x.l.fournisseur)}</div>`:''}</td><td class="txt ph">${esc(x.a.num)}</td><td class="num"><b>${eur2(x.cout)}</b></td></tr>`;
  return `<div class="card cc-card"><h3>Dépenses <span class="hint">· ${eur(r2(tNf+tL))}</span></h3>
    <div class="eq-lab" style="margin-top:4px"><b>Notes de frais validées</b> <span class="hint">· ${eur2(tNf)} HT</span></div>${F.length?`<div class="cc-tw"><table class="cc-tab"><tr><th>Date</th><th class="txt">Qui</th><th class="txt">Nature</th><th class="txt ph">État</th><th class="num ph">TTC</th><th class="num">HT</th></tr>${ok.map(rf).join('')}${att.length?`<tr><td colspan="6" class="txt dim">En attente de validation (non comptées) : ${att.length}</td></tr>${att.map(rf).join('')}`:''}</table></div>`:'<div class="eq-s">Aucune note de frais sur ce chantier pour la période.</div>'}
    <div class="eq-lab" style="margin-top:10px"><b>Sous-traitance, location, autres</b> <span class="hint">· ${eur2(tL)} HT · saisies dans l'onglet Débours de l'affaire</span></div>${L.length?`<div class="cc-tw"><table class="cc-tab"><tr><th>Date</th><th class="txt">Nature</th><th class="txt">Libellé</th><th class="txt ph">Affaire</th><th class="num">Montant HT</th></tr>${L.map(rl).join('')}</table></div>`:`<div class="eq-s">${M.affs.length?'Aucune pour la période.':'Pas d\'affaire liée à ce chantier : les dépenses passent par les bons de commande et les notes de frais.'}</div>`}
    ${H.length?`<div class="warnbox">${H.length} dépense${H.length>1?'s':''} (${eur2(r2(H.reduce((s,x)=>s+x.cout,0)))} HT) de l'affaire ${esc([...new Set(H.map(x=>x.a.num))].join(', '))} ${H.length>1?'ne sont':'n\'est'} rattachée${H.length>1?'s':''} à aucun chantier (l'affaire en a plusieurs) : non comptée${H.length>1?'s':''} ici. Choisis le chantier dans l'onglet Débours de l'affaire (✎ sur la dépense).</div>`:''}</div>`;}
const NAT_ROWS=T=>[['Main-d\'œuvre (heures × coût horaire)',T.mo],['Bons de commande engagés',T.ach],['Notes de frais validées (HT)',T.nf],['Sous-traitance',T.st],['Location',T.loc],['Autres dépenses',T.aut]];
function totCard(T){return `<div class="card cc-card"><h3>Totaux par nature <span class="hint">· ${esc(T.P.lab)}</span></h3><div class="cc-tw"><table class="cc-tab"><tr><th class="txt">Nature</th><th class="num">Montant HT</th><th class="num">Part</th></tr>${NAT_ROWS(T).map(([l,v])=>`<tr><td class="txt">${l}</td><td class="num">${v?eur(v):'—'}</td><td class="num">${v&&T.total>0?nb(100*v/T.total,1)+' %':'—'}</td></tr>`).join('')}<tr class="tot"><td class="txt">Total général</td><td class="num">${eur(T.total)}</td><td class="num">${T.total>0?'100 %':'—'}</td></tr></table></div></div>`;}
/* ── impression A4 (charte) ── */
export function ccPrintHTML(id,ctx){const s=sitesAll(ctx).find(x=>x.id===id)||{id,name:id};const M=ccModel(id,ctx);const P=perOf();const T=ccTotaux(M,P);
  const bons=M.bons.filter(b=>inPer(b.ym,P)),frais=M.frais.filter(f=>inPer(f.ym,P)&&f.ok),dep=M.lignes.filter(l=>inPer(l.ym,P));
  const kpi=`<div class="kpi"><div><b>${eur(T.total)}</b><span>total HT</span></div><div><b>${eur(T.mo)}</b><span>main-d'œuvre · ${hh(T.h)}</span></div><div><b>${eur(T.ach)}</b><span>bons engagés</span></div><div><b>${eur(T.dep)}</b><span>dépenses</span></div></div>`;
  const body=kpi+`<h2>Totaux par nature</h2><table><tr><th>Nature</th><th class="n">Montant HT</th><th class="n">Part</th></tr>${NAT_ROWS(T).map(([l,v])=>`<tr><td>${l}</td><td class="n">${eur(v)}</td><td class="n">${v&&T.total>0?nb(100*v/T.total,1)+' %':'—'}</td></tr>`).join('')}<tr><td><b>Total général</b></td><td class="n"><b>${eur(T.total)}</b></td><td class="n">${T.total>0?'100 %':'—'}</td></tr></table>
    <h2>Heures par poste · ${hh(T.h)} · ${eur(T.mo)}</h2><table><tr><th>Poste</th><th class="n">Personnes</th><th class="n">Heures</th><th class="n">dont à confirmer</th><th class="n">Coût horaire</th><th class="n">Coût HT</th></tr>${T.postes.map(g=>`<tr><td>${esc(posteLab(g.poste))}</td><td class="n">${g.n}</td><td class="n">${hh(g.h)}</td><td class="n">${g.hConf?hh(g.hConf):'—'}</td><td class="n">${g.taux>0?eur2(g.taux):'à renseigner'}</td><td class="n">${g.taux>0?eur(g.cout):'—'}</td></tr>`).join('')||'<tr><td colspan="6">Aucune heure pointée.</td></tr>'}</table>
    <h2>Bons de commande · ${eur(T.ach)} engagés</h2><table><tr><th>N°</th><th>Date</th><th>Fournisseur · objet</th><th>État</th><th class="n">Montant HT</th><th class="n">Compté</th></tr>${bons.map(b=>`<tr><td>${esc(b.num)}</td><td>${dFR(b.c.at)}</td><td>${esc(b.c.fournisseur||'')}${b.c.objet?' · '+esc(b.c.objet):''}</td><td>${esc(((BC_ETATS.find(e=>e[0]===b.etat)||[])[1])||b.etat||'')}</td><td class="n">${eur2(b.montant)}</td><td class="n">${b.compte?eur2(b.cout):'non compté'}</td></tr>`).join('')||'<tr><td colspan="6">Aucun bon.</td></tr>'}</table>
    <h2>Notes de frais validées · ${eur2(T.nf)} HT</h2><table><tr><th>Date</th><th>Qui</th><th>Nature</th><th class="n">TTC</th><th class="n">HT</th></tr>${frais.map(f=>`<tr><td>${dFR(f.d.date)}</td><td>${esc(f.d.name||'')}</td><td>${esc(natLab(f.d.nature))}</td><td class="n">${eur2(f.ttc)}</td><td class="n">${eur2(f.ht)}</td></tr>`).join('')||'<tr><td colspan="5">Aucune.</td></tr>'}</table>
    <h2>Sous-traitance, location, autres · ${eur2(r2(T.st+T.loc+T.aut))} HT</h2><table><tr><th>Date</th><th>Nature</th><th>Libellé</th><th>Fournisseur</th><th class="n">Montant HT</th></tr>${dep.map(x=>`<tr><td>${dFR(x.l.date)}</td><td>${esc(typLab(x.type))}</td><td>${esc(x.l.lib||'')}</td><td>${esc(x.l.fournisseur||'')}</td><td class="n">${eur2(x.cout)}</td></tr>`).join('')||'<tr><td colspan="5">Aucune.</td></tr>'}</table>
    <div class="card soft">Compte de chantier sans comptabilité : ni facturation, ni marge, ni TVA détaillée — tout en HT. Heures = navette de paie (pointages du chantier, lundi → samedi) × coût horaire du poste (taux de l'affaire, sinon base de prix SCR) ; bons comptés = envoyés, reçus, facturés ; notes de frais validées, TTC ramené en HT (${nb(M.tva,1)} %).</div>`;
  return docHTML({title:'Compte chantier — '+(s.name||id),h1:'Compte chantier · '+(s.name||id),kicker:'Pilotage · compte chantier',sub:esc(s.ville||''),meta:[['Chantier',esc(s.name||id)],['Période',esc(P.lab)],['Affaire',esc(M.affs.map(a=>a.num).join(', ')||'—')],['Édité le',dFR(auj())]],body,footLeft:'SCR · pilotage · compte chantier'});}
/* ══════════ clics et champs ══════════ */
function act(v,el,me,ctx){const i=String(v).indexOf('|');const k=i<0?v:v.slice(0,i);const arg=i<0?'':v.slice(i+1);if(!ccCan(ctx)){ctx.toast('Réservé au conducteur, au bureau et à la direction');return;}
  const go=x=>{if(ctx.go)ctx.go(x);else ctx.render();};
  switch(k){
    case 'open':CS.per=CS.per||'tout';go('x:cc:'+arg);return;
    case 'choix':go('x:cc:');return;
    case 'autres':CS.autres=!CS.autres;break;
    case 'per':CS.per=arg==='mois'?'mois':'tout';if(CS.per==='mois'&&!/^\d{4}-\d{2}$/.test(String(CS.m||'')))CS.m=auj().slice(0,7);break;
    case 'm':if(/^\d{4}-\d{2}$/.test(arg))CS.m=arg;break;
    case 'site':if(ctx.api&&ctx.api.openSite){ctx.api.openSite(arg,'bureau');return;}break;
    case 'bc':{const cs=cmdState();go('cmd');cs.cur=arg;cs.tab='cmdfiche';break;}
    case 'aff':try{dbGoAffaire(arg);}catch(e){console.warn(e);}return;
    case 'print':{let w=null;try{w=window.open('','_blank');}catch(e){w=null;}if(!w){ctx.toast('Autorise la fenêtre pop-up pour imprimer');return;}w.document.write(ccPrintHTML(arg,ctx));w.document.close();return;}
    default:return;}
  ctx.render();}
function input(champ,el,me,ctx,type){if(champ!=='q'||type!=='input')return;CS.q=el.value;const box=typeof document!=='undefined'&&document.getElementById('cc-list');if(box){const t=document.createElement('div');t.innerHTML=vChoix(me,ctx);const n=t.querySelector('#cc-list');if(n)box.innerHTML=n.innerHTML;}} /* la recherche filtre sans redessiner le champ (le clavier reste ouvert) */
/* tests / outillage */
const testApi=ctx=>({state:CS,model:id=>ccModel(id,ctx),totaux:(id,P)=>ccTotaux(ccModel(id,ctx),P||null),print:id=>ccPrintHTML(id,ctx)});
export default {id:'cc',feat:'comptechantier',hub:'expl',
  gate:(me,ctx)=>{try{if(typeof window!=='undefined'&&window.TRACE)window.TRACE.compteCh=testApi(ctx);}catch(e){}return null;},
  xview:(key,me,ctx)=>{cssLotCC();if(!ccCan(ctx))return wrap('<div class="card"><div class="eq-s">Le compte chantier est réservé au conducteur, au bureau et à la direction.</div></div>');return wrap(key?vCompte(key,me,ctx):vChoix(me,ctx));},
  hubRows:(tab,me,ctx)=>tab==='achats'&&ccCan(ctx)?[ctx.row('Compte d\'un chantier','Un chantier : bons de commande, dépenses, heures par poste — sans compta, imprimable','💶','#e3f3f3','x:cc:',null)]:[],
  act,input};
