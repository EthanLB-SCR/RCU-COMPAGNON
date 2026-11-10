// affaire_donnees.js — 10/11 (module Tracé Affaire, lot A · Débours). Cadrage : claude/cadrage-module-affaire.md ; passation : claude/passation-module-affaire.md § 1 bis.
// LE SEUL fichier entre l'appli et la maquette validée : il remplit window.AFD (afd.js) avec exactement les clés et les formes de data.js de la maquette, à partir
// des données de l'appli — pointages (la navette : heuresAffaire de debours.js), chantiers, affaires gagnées de Commerce, bons de commande, notes de frais validées,
// fiches des personnes — et des registres nouveaux (sql/affaire_a_1011.sql) : afgrille (taux datés), afnature (natures, « toujours FG »), afdep (dépenses saisies),
// afaff (paramètres de l'affaire : type, lots, avenants, acompte, RG, caution, réception, statut, envoi, solde repris, reprise), affac (factures saisies), afequip (lot F).
// Les écritures des écrans de la maquette passent par AFD.ecrire.* (enregistrées ici en base) ; AFD.app = pont vers l'appli (rendu, modale, toast, navigation).
// Les règles de calcul sont dans affaire/calc.js, repris TEL QUEL de la maquette ; les écrans affaire/ui_*.js aussi (ui_base.js adapté, voir son en-tête).
import AFD from './affaire/afd.js';
import './affaire/kit.js'; import './affaire/calc.js'; import './affaire/ui_base.js'; import './affaire/ui_reporting.js'; import './affaire/ui_fiche.js'; import './affaire/ui_reglages.js';
import {cssAffaire} from './affaire/affaire_css.js';
import {regAll,regGet,regSet,regLoad} from './reg.js';
import {affAll,SECTEURS_AFF,SECT_LETTER} from './affaires.js';
import {heuresAffaire,tvaOf,lignesOf,bonMontant,BC_COMPTE} from './debours.js';
import {cmdAll,dbAll,dbTodo,NATURES as NDF_NATURES} from './commandes.js';
import {POSTES_DEF,POSTE_FAM,feat} from './acces.js';
const KINDS=['afgrille','afnature','afdep','afaff','affac','afequip'];
const esc=s=>String(s==null?'':s).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const r2=x=>Math.round((+x||0)*100)/100;
const uid=()=>Date.now().toString(36)+Math.random().toString(36).slice(2,6);
const ymAdd=(ym,n)=>{const [y,m]=String(ym).split('-').map(Number);const k=y*12+(m-1)+n;return Math.floor(k/12)+'-'+String((k%12)+1).padStart(2,'0');};
const norm=s=>String(s||'').normalize('NFD').replace(/[̀-ͯ]/g,'').toLowerCase().replace(/[^a-z0-9]+/g,' ').trim();
/* postes de la maquette (ordre des lignes du débours) ← postes de l'appli ; les autres postes de l'appli sont listés non valorisés (frais généraux) */
const POSTE_MAP={soudeur:'soudeur',tuyauteur:'tuyauteur',manchonneur:'manchonneur',chauffeur_engin:'chauffeur',activites_specifiques:'opespe',chef:'chef',autre:'aide',conducteur:'conducteur'};
const POSTES_AF=[{id:'soudeur',nom:'Soudeur'},{id:'tuyauteur',nom:'Tuyauteur'},{id:'manchonneur',nom:'Manchonneur'},{id:'chauffeur',nom:'Chauffeur d\'engin'},{id:'opespe',nom:'Opération spécifique'},{id:'chef',nom:'Chef de chantier'},{id:'aide',nom:'Aide de chantier'},{id:'conducteur',nom:'Conducteur de travaux',nonValorise:true}]
  .concat(POSTES_DEF.filter(p=>!POSTE_MAP[p[0]]).map(p=>({id:p[0],nom:p[1],nonValorise:true})),[{id:'inconnu',nom:'Poste inconnu',nonValorise:true}]);
/* natures alignées sur les comptes de la compta (cadrage § 3) ; modifiables dans Réglages (registre afnature : nom, compte, fg) */
const NATURES_DEF=[{id:'st',nom:'Sous-traitance et contrôles',compte:'604',fg:false},{id:'tubes',nom:'Tubes et accessoires',compte:'602260',fg:false},{id:'pm',nom:'Petit matériel chantier',compte:'606310',fg:false,aide:'vannes nues, pièces…'},
  {id:'loc',nom:'Location matériel / engins',compte:'6135',fg:false},{id:'cont',nom:'Conteneurs, bennes, bungalows loués',compte:'613509',fg:false},{id:'frais',nom:'Frais (péage, hôtel, repas…)',compte:'625',fg:false},{id:'divers',nom:'Divers',compte:'—',fg:false},
  {id:'conso',nom:'Consommables (baguettes, disques…)',compte:'606310',fg:true},{id:'carbu',nom:'Carburants (fioul, GNR, gazole)',compte:'602210',fg:true},{id:'gaz',nom:'Gaz (Linde / Air Liquide)',compte:'602220',fg:true},{id:'dechets',nom:'Déchets',compte:'611100',fg:true}];
/* type de dépense d'un bon de commande (chiffrage) → nature ; nature d'une note de frais → nature ; ancienne ligne « Débours » de Commerce → nature */
const NAT_BC={location:'loc',soustraitance:'st',soudure:'tubes','ch:conteneur':'cont',autre:'divers'};
const NAT_NDF={carburant:'carbu',peage:'frais',hebergement:'frais',repas:'frais',fourniture:'conso',outillage:'loc',transport:'frais',autre:'divers'};
const NAT_LIGNE={st:'st',loc:'loc',autre:'divers'};
const ETAPES=[{id:'env',court:'Env.',nom:'Envoi situation'},{id:'valS',court:'Val. S',nom:'Validation situation'},{id:'prep',court:'Prép.',nom:'Préparation facture'},{id:'valF',court:'Val. F',nom:'Validation facture'},{id:'drive',court:'Drive',nom:'Enregistrement Drive'},{id:'depot',court:'Dépôt',nom:'Dépôt de facture'},{id:'copie',court:'Copie',nom:'Envoi copie direction'},{id:'rg',court:'RG',nom:'Enregistrement RG'}];
const ETAPES_AVOIR=[{id:'av',court:'Avoir',nom:'Avoir'},{id:'avPrep',court:'Prép.',nom:'Préparation avoir + facture'},{id:'avVal',court:'Val.',nom:'Validation avoir + facture'},{id:'avDep',court:'Dépôt',nom:'Dépôt avoir + facture'}];
const MOTIFS=['Pas d\'avancement facturable','En attente du BDC client','Situation refusée, à refaire','Facturé le mois prochain','Autre'];
const WRITE_ACTS=new Set(['paramOk','factureOk','depenseOk','travauxFinisOk','terminerOk','rouvrir','grilleOk','repriseOk']);
/* rôle dans le module (droits de la maquette) d'après le compte connecté — passation § 5 */
function roleDe(me,ctx){if(!me)return null;const fam=POSTE_FAM[me.poste]||'';
  if(me.admin||fam==='direction'||me.poste==='resp_exploitation'||me.poste==='resp_operations')return 'direction';
  if(me.poste==='charge_affaires'||me.poste==='resp_commercial')return 'ca';
  if(me.poste==='conducteur')return 'cond';
  if(me.poste==='chef')return 'chef';
  if(ctx.can('affaires.edit')||ctx.can('planning.edit'))return 'fact';
  return null;}
let DEMO=null,LOADED=false,CTX=null;
function hook(ctx){CTX=ctx;if(!LOADED){LOADED=true;regLoad(KINDS).catch(()=>{});}try{if(typeof window!=='undefined'&&window.TRACE&&!window.TRACE.affaire)window.TRACE.affaire={afd:()=>AFD,calc:()=>window.AFC,af:()=>window.AF,demo:D=>{DEMO=D||null;if(CTX)CTX.render();},rafraichir:()=>rafraichir(CTX)};}catch(e){}}
/* ── le pont vers l'appli : rendu, modale, toast, navigation, lecture seule ── */
function bridge(ctx){AFD.app={render:()=>ctx.render(),openModal:h=>{if(ctx.api&&ctx.api.openModal)ctx.api.openModal(h);},closeModal:()=>{if(ctx.api&&ctx.api.closeModal)ctx.api.closeModal();},toast:t=>ctx.toast(t),go:k=>ctx.go(k),
  tabgo:t=>{if(ctx.api&&ctx.api.homeTab)ctx.api.homeTab(t);},featOn:k=>{try{return feat(k);}catch(e){return true;}},nFrais:()=>{try{return feat('frais')?dbTodo().length:0;}catch(e){return 0;}},agence:v=>{AGENCE=v;},
  lectureSeule:act=>{if(WRITE_ACTS.has(act)&&ctx.viewing()){ctx.toast('Lecture seule : tu vois l\'appli comme quelqu\'un d\'autre');return true;}return false;}};}
let AGENCE=null;
/* ── les écritures des écrans de la maquette → registres de l'appli (enregistrés hors connexion, envoyés à la reconnexion : reg.js) ── */
AFD.ecrire={
  depense:x=>{const id=x.a+'|'+uid();regSet('afdep',id,Object.assign({},x,{id,at:new Date().toISOString()}));},
  affaire:(code,patch)=>regSet('afaff',code,patch),
  facture:f=>{const id=f.a+'|'+uid();regSet('affac',id,Object.assign({},f,{id,at:new Date().toISOString()}));},
  grille:g=>regSet('afgrille',g.effet,{effet:g.effet,fgch:+g.fgch||0,fgst:+g.fgst||0,sin:+g.sin||0,part:g.part||{}},{replace:true}),
  nature:(id,patch)=>regSet('afnature',id,patch),
  equip:(id,patch)=>regSet('afequip',id,patch),
  reprise:(code,r)=>regSet('afaff',code,{reprise:r})
};
/* ── LES DONNÉES : window.AFD rempli en place, mêmes clés et formes que data.js de la maquette ── */
export function rafraichir(ctx){
  const me=ctx.me;const today=(ctx.today&&ctx.today())||new Date().toISOString().slice(0,10);const role=roleDe(me,ctx);
  const moi={id:me?me.id:null,nom:me?(ctx.nomC?ctx.nomC(me):(me.prenom||'')+' '+(me.nom||'')):'',role};
  if(DEMO){ /* tests : le jeu de la maquette (test/fixtures/affaire_demo.js), 100 % fictif, à la place des données de l'appli — preuve « exactement pareil » */
    const keep=['ecrire','app','joursOuvres'];const D2={};Object.keys(DEMO).forEach(k=>{if(!keep.includes(k)&&k!=='personas')D2[k]=DEMO[k];});
    D2.personnes=(DEMO.personnes||[]).slice();(DEMO.personas||[]).forEach(p=>{if(!D2.personnes.some(x=>x.id===p.id))D2.personnes.push({id:p.id,nom:p.nom,poste:'inconnu',agence:''});}); /* les personas de la maquette (chargé d'affaires, facturation) : des noms à résoudre */
    Object.assign(AFD,D2,{moi,pret:true,sansAffaire:AFD.sansAffaire&&AFD.sansAffaire.length?AFD.sansAffaire:[{id:'demo9n',nom:'Antenne Démo 9N',h:12,agence:'ouest'}]});
    if(!window.AF.etat.agence)window.AF.etat.agence=(AFD.agences[0]||{}).id||'';window.AF.etat.moisFact=AFD.moisFacturation;return AFD;}
  const people=ctx.people||[],chantiers=ctx.chantiers||[];const chIdx=new Map(chantiers.map(c=>[c.id,c]));
  const agences=Object.entries(SECTEURS_AFF).map(([id,nom])=>({id,nom}));
  /* personnes : poste de la maquette, agence = secteur, intérim, « en apprentissage » (partie appr de la fiche personne, saisie dans Tracé RH plus tard) */
  const byName=new Map();const persIdx=new Map();
  const personnes=people.filter(p=>p&&p.id).map(p=>{const nom=((p.prenom||'')+' '+(p.nom||'')).trim()||String(p.id);byName.set(norm(nom),p.id);byName.set(norm((p.nom||'')+' '+(p.prenom||'')),p.id);
    const pd=(ctx.peopleData&&ctx.peopleData(p.id))||{};const ap=pd.appr&&pd.appr.poste?{poste:POSTE_MAP[pd.appr.poste]||pd.appr.poste,debut:String(pd.appr.debut||'2000-01-01'),fin:String(pd.appr.fin||'2999-12-31')}:undefined;
    const o={id:p.id,nom,poste:POSTE_MAP[p.poste]||(POSTES_AF.some(x=>x.id===p.poste)?p.poste:'inconnu'),agence:(ctx.secteurDe&&ctx.secteurDe(p))||p.secteur||'',interim:p.type==='interim',genre:p.genre||''};if(ap)o.appr=ap;persIdx.set(p.id,o);return o;});
  /* affaires gagnées (Commerce : à débuter, en cours, terminé) + paramètres du module (registre afaff) ; chantier → première affaire qui le lie */
  const P=code=>regGet('afaff',code)||{};const siteAff=new Map();
  const affaires=affAll().filter(a=>a&&a.num&&!a.deleted&&['a_debuter','en_cours','termine'].includes(a.etat)).sort((x,y)=>String(x.num).localeCompare(String(y.num))).map(a=>{const p=P(a.num);const sites=(a.sites||[]).filter(Boolean);sites.forEach(s=>{if(!siteAff.has(s))siteAff.set(s,a.num);});
    const cs=sites.map(s=>chIdx.get(s)).filter(Boolean);const conds=[...new Set(cs.map(c=>c.conducteur).filter(Boolean))];
    const fait=cs.reduce((s,c)=>s+(c.faites!=null?+c.faites:(((ctx.stat&&ctx.stat(c.id))||{}).done||0)),0),total=cs.reduce((s,c)=>s+(+c.soudures||0),0);
    const lots=Array.isArray(p.lots)&&p.lots.length?p.lots.map(l=>({id:l.id,nom:l.nom,marche:+l.marche||0})):[{id:'L',nom:'Lot unique',marche:+a.montant||0}];
    return {code:a.num,nom:a.nom||a.num,client:a.client||'—',type:p.type||'marche',agence:a.secteur||SECT_LETTER[String(a.num)[0]]||'ouest',ca:byName.get(norm(a.charge))||null,cond:byName.get(norm(a.cdtx))||conds[0]||null,conds,
      statut:p.statut||(a.etat==='termine'?'termine':'en_cours'),travauxFinis:p.travauxFinis||null,termineLe:p.termineLe||null,pctAcompte:+p.pctAcompte||0,pctRG:+p.pctRG||0,caution:!!p.caution,avenants:+p.avenants||0,lots,
      avancement:total?{fait,total}:null,envoi:p.envoi||{mode:'Mail',dest:'',cedee:false},sites,tva:tvaOf(a),_a:a};});
  /* heures = la navette (debours.js → heuresAffaire : pointages des chantiers de l'affaire, lundi → samedi), par personne et mois ; nv = dont non validées */
  const heures=[];affaires.forEach(af=>{if(!af.sites.length)return;let H;try{H=heuresAffaire({num:'af:'+af.code,sites:af.sites});}catch(e){console.warn('affaire : heures',af.code,e);return;}const idx={};
    H.rows.forEach(r=>{const k=r.p+'|'+r.ym;const o=idx[k]||(idx[k]={p:r.p,a:af.code,m:r.ym,h:0,nv:0});o.h+=r.h;if(!r.ok)o.nv+=r.h;});Object.values(idx).forEach(o=>{o.h=r2(o.h);o.nv=r2(o.nv);heures.push(o);
      if(!persIdx.has(o.p)){const x={id:o.p,nom:String(o.p).replace(/^l:/,'').split('@')[0],poste:'inconnu',agence:'',interim:false,genre:''};persIdx.set(o.p,x);personnes.push(x);}});});
  /* chantiers avec des heures mais sans affaire : ils ne vont dans aucun débours (écran de rattachement : lot C) */
  const libres=chantiers.filter(c=>!c.bureau&&!siteAff.has(c.id)).map(c=>c.id);const sansAffaire=[];
  if(libres.length){try{const H=heuresAffaire({num:'af:__sans',sites:libres});const bySite={};H.rows.forEach(r=>{bySite[r.site]=(bySite[r.site]||0)+r.h;});Object.keys(bySite).forEach(id=>{const c=chIdx.get(id)||{};sansAffaire.push({id,nom:c.nom||id,h:r2(bySite[id]),agence:c.secteur||''});});}catch(e){console.warn(e);}}
  /* dépenses : bons de commande engagés (envoyé, reçu, facturé ; montant de la facture s'il est saisi), notes de frais validées (TTC → HT avec la TVA de l'affaire),
     anciennes lignes « Débours » de l'affaire (Commerce, rien n'est perdu), dépenses saisies dans la fiche (registre afdep). imput = chantier | fg */
  const codeOf=site=>siteAff.get(site)||null;const affOf=code=>affaires.find(a=>a.code===code);const dep=[];const ndfLab=k=>(NDF_NATURES.find(n=>n[0]===k)||[k,k||'Note de frais'])[1];
  cmdAll().forEach(c=>{if(!c||c.deleted||!BC_COMPTE.includes(c.etat))return;const code=(c.affaire&&affOf(c.affaire))?c.affaire:codeOf(c.site);if(!code)return;
    dep.push({id:'bc:'+c.num,a:code,date:String(c.at||'').slice(0,10),nature:NAT_BC[c.typeDepense]||'divers',tiers:c.fournisseur||'—',lib:c.objet||('Bon de commande '+c.num),ht:r2(bonMontant(c)),src:'bc',ref:c.num,site:c.site||null});});
  dbAll().forEach(d=>{if(!d||d.deleted||!(d.etat==='valide'||d.etat==='rembourse'))return;const code=codeOf(d.site);if(!code)return;const af=affOf(code);const ht=r2((+d.montant||0)/(1+((af?af.tva:20)||0)/100));
    dep.push({id:'ndf:'+d.id,a:code,date:String(d.date||'').slice(0,10),nature:NAT_NDF[d.nature]||'divers',tiers:d.fournisseur||d.lieu||'—',lib:ndfLab(d.nature)+(d.commentaire?' · '+d.commentaire:''),ht,src:'note',ref:'NDF '+(d.name||String(d.key||'').replace(/^l:/,'')),par:d.key||null,site:d.site||null});});
  affaires.forEach(af=>lignesOf(af._a).forEach(l=>{dep.push({id:'lig:'+af.code+':'+l.id,a:af.code,date:String(l.date||'').slice(0,10),nature:NAT_LIGNE[l.type]||'divers',tiers:l.fournisseur||'—',lib:l.lib||'',ht:r2(+l.montant||0),src:'saisie',ref:'',par:l.by||null,site:l.site||null});}));
  regAll('afdep').forEach(x=>{if(x&&x.a&&affOf(x.a))dep.push(Object.assign({},x,{ht:r2(x.ht)}));});
  /* réglages et saisies du module */
  const grilles=regAll('afgrille').filter(g=>g&&g.effet).map(g=>({effet:String(g.effet).slice(0,10),fgch:+g.fgch||0,fgst:+g.fgst||0,sin:+g.sin||0,part:Object.fromEntries(Object.entries(g.part||{}).filter(([k,v])=>v!==''&&v!==null&&isFinite(+v)).map(([k,v])=>[k,+v]))}));
  const natIdx=Object.fromEntries(regAll('afnature').map(n=>[n.id,n]));const natures=NATURES_DEF.map(n=>{const o=natIdx[n.id];return o?Object.assign({},n,{fg:!!o.fg,nom:o.nom||n.nom,compte:o.compte||n.compte}):Object.assign({},n);});
  const equipements=regAll('afequip').filter(e=>e&&e.nom).map(e=>({id:e.id,nom:e.nom,type:e.type||'',tauxJour:+e.tauxJour||0}));
  const factures=regAll('affac').filter(f=>f&&f.a&&affOf(f.a)).map(f=>Object.assign({},f,{fact:+f.fact||0,prod:+f.prod||0,rg:+f.rg||0})).sort((x,y)=>String(x.date).localeCompare(String(y.date)));
  const reprise={},soldesOuverture={};affaires.forEach(af=>{const p=P(af.code);if(p.reprise)reprise[af.code]=p.reprise;if(p.solde&&(+p.solde.debours||+p.solde.heures))soldesOuverture[af.code]={date:p.solde.date||today,debours:+p.solde.debours||0,heures:+p.solde.heures||0};});
  /* mois affichés : du premier mois qui a des heures / dépenses / factures (12 au plus) jusqu'à ce mois */
  const ym=today.slice(0,7);const mois=[];{const set=new Set(heures.map(h=>h.m).concat(dep.map(d=>String(d.date).slice(0,7)),factures.map(f=>String(f.date).slice(0,7))).filter(m=>/^\d{4}-\d{2}$/.test(m)&&m<=ym));let m0=[...set].sort()[0]||ymAdd(ym,-2);if(m0<ymAdd(ym,-11))m0=ymAdd(ym,-11);for(let m=m0;m<=ym;m=ymAdd(m,1))mois.push(m);}
  Object.assign(AFD,{aujourdhui:today,moisFacturation:ymAdd(ym,-1),mois,agences,personas:[],postes:POSTES_AF,grilles,personnes,affaires,soldesOuverture,natures,equipements,etapes:ETAPES,etapesAvoir:ETAPES_AVOIR,motifsRien:MOTIFS,
    grandLivre:{},grandLivreOctobre:null,heures,depenses:dep,factures,suivi:AFD.suivi||{},planning:{},reprise,sansAffaire,pret:true,moi});
  /* agence affichée : celle choisie, sinon le secteur de la personne, sinon la première qui a des affaires */
  const AF=window.AF;const mine=(ctx.mySecteur&&me&&ctx.mySecteur(me))||'';const ok=id=>agences.some(a=>a.id===id);
  if(AGENCE&&ok(AGENCE))AF.etat.agence=AGENCE;else if(!AF.etat.agence||!ok(AF.etat.agence))AF.etat.agence=ok(mine)?mine:((affaires[0]||{}).agence||'ouest');
  AF.etat.moisFact=AFD.moisFacturation;return AFD;}
/* ── le module (branché par modules.js) : l'onglet Affaire s'ouvre dessus (espace.js → vAffaire) ── */
function html(me,ctx){cssAffaire();bridge(ctx);try{rafraichir(ctx);}catch(e){console.warn('affaire',e);return `<div class="card"><div class="eq-s">Module Affaire : erreur de lecture des données (${esc(e&&e.message||e)}).</div></div>`;}
  try{return window.AF.html();}catch(e){console.warn('affaire',e);return `<div class="card"><div class="eq-s">Module Affaire : erreur d'affichage (${esc(e&&e.message||e)}).</div></div>`;}}
export default {id:'af',hub:'affaire',
  pageHTML(me,ctx){hook(ctx);return html(me,ctx);},
  xview(k,me,ctx){hook(ctx);const parts=String(k||'').split(':');const AF=window.AF;if(parts[0]==='fiche'&&parts[1]){AF.etat.route={page:'fiche',code:parts.slice(1).join(':')};AF.etat.ficheOnglet='debours';}else if(parts[0])AF.etat.route={page:parts[0]};return html(me,ctx);},
  racine(){try{window.AF.etat.route={page:'reporting'};}catch(e){}},
  act(v,el,me,ctx){hook(ctx);const i=String(v).indexOf('|');const k=i<0?v:v.slice(0,i),arg=i<0?'':v.slice(i+1);if(k==='fiche'&&arg){ctx.go('x:af:fiche:'+arg);return;}if(k==='page'){ctx.go('x:af:'+arg);}},
  codeDuChantier(site){try{if(!CTX)return null;rafraichir(CTX);const a=AFD.affaires.find(x=>(x.sites||[]).includes(site));return a?a.code:null;}catch(e){return null;}}
};
