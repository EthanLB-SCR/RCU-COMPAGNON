// accueil_rh.js — ACCUEIL RH (nuit du 13 au 14/10/2026). Ethan : « j'ai tous les documents d'accueil obligatoires à signer […] documents à émarger : lecture complète
// forcée + signature à l'arrivée / à la création du compte ; livrets dans l'espace salarié ; passeport de prévention = habilitations + expirations ».
// Module branché (modules.js), id « acc ». Aucune donnée réelle ici : tout arrive par le PACK (JSON privé importé par l'administrateur).
// · pack « accueil » = {documents, livrets, passeport, textes} → documents du registre « doc » (id acc_<id>, ou le document intégré du même id : règlement intérieur) :
//   à qui (req), bloquant à l'arrivée, échéance en jours (J+7, J+1…), choix à faire, champs à compléter, mention, texte intégral ou « PDF à joindre », chapitres des livrets.
//   Réimport = mise à jour (jamais de doublon) ; version changée → nouvelle signature demandée.
// · « Joindre les PDF » : plusieurs fichiers d'un coup, rapprochés par nom avec le champ « fichier » du pack, envoyés au stockage (A.sync.uploadDoc), repli data URL si petit.
// · 19/10 (lot QF, Ethan : « oublie tout ce qui est signature obligatoire de document : on va insister sur le à faire dans les 7 jours, pas rendre ça obligatoire à la
//   connexion, sinon dès que je veux montrer à quelqu'un je suis bloqué ») : PLUS AUCUN ÉCRAN BLOQUANT, pour personne. À la place : une CARTE DE BIENVENUE non bloquante
//   en tête de l'accueil d'un nouveau compte (« N documents à lire et à signer sous 7 jours → Commencer »), fermable, qui revient tant qu'il reste des documents ;
//   chaque document garde son échéance (docDue, jamais moins de 7 jours) dans « À faire » ; le chef / les RH voient « N personnes ont des documents en retard ».
//   Le réglage « tout le monde » (gateAll) et « Plus tard » n'ont plus d'objet : un gateAll déjà enregistré est simplement ignoré. Un document « bloquant » du pack
//   garde son étiquette (« à signer dès l'arrivée, sous 7 jours ») mais ne bloque plus.
// · Réglages et catalogue du passeport : ligne « acc__cfg » du registre « doc » (cfg:true, jamais listée comme document).
import {regGet,regSet} from './reg.js';
import {docsAll,docById,docsFor,docSigned,docOpen,docKey,docNewcomer,docDue,docsReady,isPdfDoc,DEFAULT_DOCS,KINDS,reqLabel} from './docs.js';
import {POSTES_DEF} from './acces.js';
const ID='acc',CFG='acc__cfg';
const esc=s=>String(s??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const nrm=s=>String(s||'').normalize('NFD').replace(/[̀-ͯ]/g,'').toLowerCase();
const fileKey=s=>nrm(String(s||'').replace(/^.*[\\/]/,'').replace(/\.[a-z0-9]{2,5}$/i,'')).replace(/[^a-z0-9]+/g,' ').trim(); // « Livret accueil.PDF » ≈ « livret_accueil.docx »
const dFR=x=>x?new Date(x).toLocaleDateString('fr-FR'):'';
/* clés de poste proposées par l'analyse → postes de l'appli ; les autres clés restent telles quelles (elles s'appliqueront quand le poste existera) */
const POSTE_MAP={conducteur_engins:'chauffeur_engin',chef_activites:'activites_specifiques',referent_activites:'activites_specifiques',tech_activites:'activites_specifiques'};
const TYPE_MAP={embauche:'salarie',salarie:'salarie',interim:'interim'};
/* passeport (catalogue du pack) → clés d'habilitation de l'appli (HAB_TYPES d'espace.js) */
const PASS2HAB={visite_medicale:'vm',visite_medicale_sir:'vm_sir',aipr_operateur:'aipr',aipr_encadrant:'aipr_enc',autorisation_conduite:'autoconduite',habilitation_electrique_bf_hf:'helec',caces_r482_a:'r482',caces_r482_b1:'r482',caces_r489_3:'r489',qs_tig_arc:'qs141',elingage:'elingage',formation_manchonnage:'manchonnage',formation_diisocyanates:'diiso',sst:'sst',travail_tranchee_blindage:'tranchee',travail_hauteur:'hauteur',catec:'catec',permis_b:'permis',permis_be:'permis_be',carte_btp:'btp'};
const posteLab=k=>(POSTES_DEF.find(p=>p[0]===k)||[])[1]||k;
let LAST=null,BUSY=false,HIDE=false; // dernier compte rendu (import / PDF) ; HIDE = carte de bienvenue fermée (cette ouverture de l'appli seulement : elle revient tant qu'il reste des documents)
const cfg=()=>regGet('doc',CFG)||{};
const accDocs=()=>docsAll().filter(d=>d.acc&&d.acc.src);
const canAdmin=(me,ctx)=>!!(me&&me.admin)&&!ctx.viewing();
const ownView=ctx=>{const st=(ctx.api&&ctx.api.state)||{};return !(st.profile&&st.userId!=='__me');}; // connecté : seulement sur son propre compte (pas « voir / agir comme »)

/* ── import du pack ── */
const kindOf=x=>{const id=nrm(x.id),t=nrm(x.type);if(t==='livret'||x.livret)return 'livret';if(/reglement/.test(id))return 'reglement';if(/^fiche/.test(id))return 'fiche';if(/charte|politique/.test(id))return 'politique';if(t==='information'||/^note/.test(id))return 'note';if(t==='engagement'||t==='signer_choix')return 'engagement';return 'autre';};
const reqOf=p=>{p=p||{};if(p.tous||p.all)return {all:true};const r={};if(Array.isArray(p.postes)&&p.postes.length)r.postes=[...new Set(p.postes.map(k=>POSTE_MAP[k]||String(k)))];const ty=[...new Set(Object.keys(TYPE_MAP).filter(k=>p[k]).map(k=>TYPE_MAP[k]))];if(ty.length)r.types=ty;return (r.postes||r.types)?r:{all:true};};
const dueOf=e=>{const o={};if(e&&typeof e==='object')Object.keys(e).forEach(k=>{const v=+e[k];if(isNaN(v))return;if(k==='tous'){o.salarie=v;o.interim=v;}else if(TYPE_MAP[k])o[TYPE_MAP[k]]=v;});return Object.keys(o).length?o:null;};
/* texte brut → HTML (échappé) : paragraphes, titres en capitales, listes ; « [[À COMPLÉTER : nom…]] » → rempli à la lecture (nom, poste, date), « [[À VÉRIFIER]] » → marqué */
function txtHtml(t){const ph=s=>esc(s).replace(/\[\[([^\]]{0,240})\]\]/g,(m,x)=>{const k=nrm(x);const w=/verifier/.test(k)?'chk':/\bnom\b|prenom/.test(k)?'nom':/poste|qualite|fonction|emploi/.test(k)?'poste':/date/.test(k)?'date':'x';
    return w==='chk'?'<mark class="acc-chk" title="'+x+'">à vérifier</mark>':'<mark class="acc-ph" data-ph="'+w+'">'+x.replace(/^\s*[àa] compl[ée]ter\s*:\s*/i,'')+'</mark>';});
  return String(t||'').replace(/\r/g,'').split(/\n\s*\n+/).map(b=>b.trim()).filter(Boolean).map(b=>{const L=b.split('\n').map(x=>x.trim()).filter(Boolean);
    if(L.length===1&&L[0].length<90&&L[0]===L[0].toUpperCase()&&/[A-ZÀ-Ý]/.test(L[0]))return '<h3>'+ph(L[0])+'</h3>';
    if(L.every(x=>/^[-•–*]\s+/.test(x)))return '<ul>'+L.map(x=>'<li>'+ph(x.replace(/^[-•–*]\s+/,''))+'</li>').join('')+'</ul>';
    return '<p>'+L.map(ph).join('<br>')+'</p>';}).join('\n');}
const stab=o=>JSON.stringify(o??null,(k,v)=>v&&typeof v==='object'&&!Array.isArray(v)?Object.keys(v).sort().reduce((r,x)=>(r[x]=v[x],r),{}):v); // comparaison stable (le serveur réordonne les clés)
const listOf=(v,key)=>Array.isArray(v)?v:(v&&Array.isArray(v[key])?v[key]:[]);
export async function importPack(part,ctx){
  if(!part||typeof part!=='object')throw new Error('pack vide ou illisible');
  if(part.accueil&&!part.documents)part=part.accueil; // le pack complet est accepté aussi
  const docs=listOf(part.documents,'documents'),livs=listOf(part.livrets,'livrets'),pass=listOf(part.passeport,'passeport');const T=part.textes&&typeof part.textes==='object'?part.textes:{};
  if(!docs.length&&!pass.length)throw new Error('ni « documents » ni « passeport » dans la partie accueil du pack');
  const now=new Date().toISOString();const n={neu:0,upd:0,ver:0,same:0,text:0,pdf:0,wait:0,skip:0,bloq:0};
  for(const x of docs){if(!x||!x.id||!(x.titre||x.intitule)){n.skip++;continue;}
    const bi=DEFAULT_DOCS.find(b=>b.id===x.id);const id=bi?bi.id:'acc_'+String(x.id).replace(/[^\w-]+/g,'_').slice(0,80);
    const old=regGet('doc',id),cur=docById(id),oX=(old&&old.acc)||{};
    const tk=x.texte?String(x.texte).replace(/^.*[\\/]/,''):null;const txt=tk?(T[tk]!=null?T[tk]:T[x.texte]):null;const html=typeof txt==='string'&&txt.trim()?txtHtml(txt):null;
    const lv=livs.find(l=>l&&l.id===(x.livret||x.id));
    const chap=lv&&Array.isArray(lv.chapitres)?lv.chapitres.filter(c=>c&&c.titre&&Array.isArray(c.pages)&&c.pages.length).map(c=>({n:c.numero!=null?String(c.numero):'',t:String(c.titre).slice(0,160),p:[+c.pages[0]||1,+(c.pages[1]!=null?c.pages[1]:c.pages[0])||1],r:c.resume?String(c.resume).slice(0,500):undefined})):null;
    const pv=x.version!=null?String(x.version):null;const seen=!!oX.src;const verChanged=seen&&(oX.pv||null)!==pv;
    const hasPdf=!!(cur&&isPdfDoc(cur));const body=!!(html||hasPdf||(cur&&cur.html));
    const version=seen?(verChanged?pv:((old&&old.version)||null)):(bi?((cur&&cur.version)||pv):pv); // 1er import sur un document intégré : sa version est gardée (signatures valables)
    const X={src:String(x.id),type:x.type||null,bloquant:!!x.bloquant,quand:x.quand||null,due:dueOf(x.echeanceJours),
      choix:(Array.isArray(x.choix)?x.choix:[]).map(String).filter(Boolean).slice(0,8),
      champs:(Array.isArray(x.champs)?x.champs:[]).filter(f=>f&&(f.id||f.label)).slice(0,12).map(f=>({id:String(f.id||f.label).slice(0,40),label:String(f.label||f.id).slice(0,140),type:['texte','date','case','choix_multiple','photo'].includes(f.type)?f.type:'texte',requis:!!f.requis,options:Array.isArray(f.options)?f.options.map(String).slice(0,12):undefined,aide:f.prerempli?String(f.prerempli).slice(0,140):undefined})),
      mention:x.mention||(lv&&lv.emargement&&lv.emargement.mention)||null,chap:chap&&chap.length?chap:null,pages:+x.pages||null,min:+x.lectureMin||null,cond:x.condition?String(x.condition).slice(0,300):null,
      fichier:x.fichier?String(x.fichier):null,pv,on:body?(verChanged?now:(oX.on||now)):null};
    const patch={kind:bi?bi.kind:kindOf(x),title:bi?(cur&&cur.title)||String(x.titre||x.intitule):String(x.titre||x.intitule).slice(0,160),version:version||null,req:reqOf(x.pour),active:true,acc:X,
      file:hasPdf?(cur.file||X.fichier):(X.fichier||(cur&&cur.file)||null),pending:!body, /* false plutôt que null : une suppression de clé fusionnée dans une écriture en attente se perdrait */by:bi?((cur&&cur.by)||'Direction'):'RH · accueil',at:(old&&old.at)||(bi?bi.at:now)};
    if(html)patch.html=html;
    const same=old&&['kind','title','version','req','file','pending','html'].every(k=>stab(old[k])===stab(patch[k]===undefined?old[k]:patch[k]))&&stab(Object.assign({},oX,{on:null}))===stab(Object.assign({},X,{on:null}));
    if(same)n.same++;else{regSet('doc',id,patch);if(!old)n.neu++;else n.upd++;if(verChanged)n.ver++;}
    if(html||(cur&&cur.html&&!hasPdf))n.text++;else if(hasPdf)n.pdf++;else n.wait++;if(X.bloquant)n.bloq++;}
  const pc=pass.filter(p=>p&&p.id).map(p=>({id:String(p.id),label:String(p.label||p.id).slice(0,160),cat:p.categorie||null,ans:p.validiteAns!=null?+p.validiteAns:null,txt:p.validiteTexte||null,preuve:p.preuve?String(p.preuve).slice(0,240):null,oblig:Array.isArray(p.obligatoirePour)?p.obligatoirePour.map(k=>POSTE_MAP[k]||k):[],conf:Array.isArray(p.aConfirmerPour)?p.aConfirmerPour.map(k=>POSTE_MAP[k]||k):[],hab:PASS2HAB[p.id]||null}));
  const known=pc.filter(p=>p.hab).length;
  const sum=`${docs.length} document${docs.length>1?'s':''} : ${n.neu} nouveau${n.neu>1?'x':''}, ${n.upd} mis à jour${n.ver?' (dont '+n.ver+' nouvelle'+(n.ver>1?'s':'')+' version'+(n.ver>1?'s':'')+' → à signer à nouveau)':''}, ${n.same} inchangé${n.same>1?'s':''}${n.skip?', '+n.skip+' ignoré'+(n.skip>1?'s':''):''} · ${n.text} en texte intégral, ${n.pdf} PDF joint${n.pdf>1?'s':''}, ${n.wait} PDF à joindre · ${n.bloq} à signer dès l'arrivée (sous 7 jours)${pc.length?' · passeport : '+pc.length+' formations / habilitations ('+known+' suivies dans l\'appli)':''}`;
  regSet('doc',CFG,{cfg:true,active:false,kind:'autre',title:'Accueil RH — réglages',req:{none:true},pass:pc.length?pc:(cfg().pass||null),imp:{at:now,by:(ctx&&ctx.api&&ctx.api.state&&ctx.api.state.profile&&ctx.api.state.profile.name)||'',sum}});
  LAST={t:'Import du pack',lines:[sum]};return sum;}

/* ── PDF : rapprochement par nom, envoi au stockage, repli data URL (petit fichier, hors connexion) ── */
async function putPdf(d,f,ctx){const A=ctx.api||{};let url=null,data=null;try{url=A.sync&&A.sync.uploadDoc?await A.sync.uploadDoc('entreprise','docs',f.name,f):null;}catch(e){url=null;}
  if(!url){if(f.size>1.5*1024*1024)return 'trop gros pour être gardé hors connexion ('+Math.round(f.size/1024/1024*10)/10+' Mo) : reconnecte-toi';
    data=await new Promise(res=>{const r=new FileReader();r.onload=()=>res(r.result);r.onerror=()=>res(null);r.readAsDataURL(f);});if(!data)return 'fichier illisible';}
  const X=Object.assign({},d.acc||{});if(!X.on)X.on=new Date().toISOString();
  regSet('doc',d.id,{url:url||null,data:data||null,size:f.size,file:f.name,pending:false,acc:X});return null;}
async function attachPdfs(files,ctx,only){const list=only?[only]:accDocs();const R={ok:[],texte:[],sans:[],err:[]};let i=0;
  for(const f of files){i++;if(files.length>1)ctx.toast('Envoi '+i+' / '+files.length+' : '+f.name);
    if(!/\.pdf$/i.test(f.name)&&f.type!=='application/pdf'){R.err.push(f.name+' : pas un PDF');continue;}
    const k=fileKey(f.name);const d=only||list.find(x=>[x.acc.fichier,x.file].some(n=>n&&fileKey(n)===k))||list.find(x=>[x.acc.fichier,x.file].some(n=>{const m=n&&fileKey(n);return m&&m.length>5&&(m.startsWith(k)||k.startsWith(m));}));
    if(!d){R.sans.push(f.name);continue;}
    if(d.html&&!only){R.texte.push(f.name+' → '+d.title);continue;} // le texte intégral est déjà dans l'appli
    const e=await putPdf(d,f,ctx);if(e)R.err.push(f.name+' : '+e);else R.ok.push(f.name+' → '+d.title);}
  LAST={t:'PDF joints',lines:[R.ok.length+' joint'+(R.ok.length>1?'s':'')+(R.ok.length?' : '+R.ok.join(' · '):''),R.texte.length?'Déjà en texte intégral (PDF non utilisé) : '+R.texte.join(' · '):'',R.sans.length?'Sans document correspondant (vérifie le nom) : '+R.sans.join(' · '):'',R.err.length?'Erreurs : '+R.err.join(' · '):''].filter(Boolean)};
  return R;}

/* ── carte de bienvenue (NON bloquante, 19/10 lot QF) : en tête de l'accueil d'un NOUVEAU compte (créé depuis moins de 30 jours, ou dont un document le concerne en
   tant que nouvel arrivant) tant qu'il lui reste des documents à signer. Fermable (revient à la prochaine ouverture de l'appli). « Commencer » ouvre le plus urgent. ── */
const NEW_DAYS=30;
export function welcomeDocs(acc){if(!acc)return [];const k=docKey(acc);return docsFor(acc).filter(d=>!docSigned(d,k)).map(d=>({d,u:docDue(d,acc)})).sort((a,b)=>((a.u?a.u.left:1e9)-(b.u?b.u.left:1e9)));}
export function isNewcomer(acc){if(!acc)return false;const c=Date.parse(acc.created_at||'');const fresh=!isNaN(c)&&(Date.now()-c)<NEW_DAYS*864e5;return fresh||docsFor(acc).some(d=>docNewcomer(d,acc));}
function welcomeHTML(me,acc,L){const n=L.length;const first=L[0];const u=first&&first.u;
  return `<div class="card acc-welcome" role="region" aria-label="Bienvenue"><button class="acc-x" data-act="x" data-v="${ID}|hide" aria-label="Fermer" title="Fermer (la carte revient tant qu'il reste des documents)">✕</button><div class="acc-k">Bienvenue</div>
    <h2 class="vt" style="margin:2px 0 6px">Bienvenue chez SCR${me.prenom?', '+esc(me.prenom):''} 👋</h2>
    <p style="margin:0 0 8px">${n>1?n+' documents':'1 document'} à lire et à signer <b>sous 7 jours</b>${u?' — le premier '+esc(u.late?'est en retard de '+(-u.left)+' j':u.left===0?'aujourd\'hui':'avant le '+String(u.due).slice(8,10)+'/'+String(u.due).slice(5,7)):''}.Rien ne bloque : tu peux commencer maintenant ou plus tard depuis « À faire ».</p>
    <div class="actions"><button class="btn primary block" data-act="x" data-v="${ID}|start">Commencer${first?' : '+esc(first.d.title):''}</button><button class="btn block" data-act="x" data-v="${ID}|docs">Voir mes documents</button></div></div>`;}

/* ── sous-vue Entreprise → Accueil RH (administrateur ; RH en lecture) ── */
function adminView(me,ctx){const adm=canAdmin(me,ctx);const c=cfg();const L=accDocs();const people=(ctx.people||[]).map(p=>p._acc).filter(Boolean);
  const conc=d=>people.filter(p=>docsFor(p).some(x=>x.id===d.id));
  const late=[];people.forEach(p=>{docsFor(p).filter(d=>d.acc&&!docSigned(d,docKey(p))).forEach(d=>{const u=docDue(d,p);if(u&&u.late)late.push({p,d,u});});});late.sort((a,b)=>a.u.left-b.u.left);
  const nWait=L.filter(d=>d.pending).length,nText=L.filter(d=>d.html&&!isPdfDoc(d)).length,nPdf=L.filter(d=>isPdfDoc(d)).length;
  const kpi=(v,l,k)=>`<div class="eq-kpi ${k||''}"><b>${v}</b><small>${esc(l)}</small></div>`;
  const row=d=>{const X=d.acc;const cc=conc(d);const sg=cc.filter(p=>docSigned(d,docKey(p))).length;const due=X.due?Object.entries(X.due).map(([t,v])=>(t==='interim'?'intérim':'embauche')+' J+'+v).join(', '):'';
    const st=d.pending?'<span class="eq-tag" style="background:#fdeae7;color:#9b2c22">PDF à joindre</span>':isPdfDoc(d)?'<span class="eq-tag">PDF</span>':'<span class="eq-tag">texte</span>';
    return `<div class="acc-drow"><button class="ac-row" data-act="docadm" data-v="${esc(d.id)}"><span class="ic" style="background:${X.bloquant?'#fff4d6':'#e8f0fb'}">${X.bloquant?'⏱':'📄'}</span><span class="tx"><b>${esc(d.title)}</b><small>${st} ${esc(KINDS[d.kind]||d.kind)}${d.version?' · '+esc(d.version):''} · ${esc(reqLabel(d))}${X.bloquant?' · à signer dès l\'arrivée (sous 7 jours)':due?' · '+esc(due):' · sous 7 jours'}${X.choix&&X.choix.length?' · choix':''}${(X.chap||[]).length?' · '+X.chap.length+' chapitres':''}${X.fichier&&d.pending?' · fichier attendu : '+esc(X.fichier):''} · <b>${sg} / ${cc.length}</b> signé${sg>1?'s':''}</small></span><span class="chev">›</span></button>${adm?`<button class="btn sm acc-one" data-act="x" data-v="${ID}|pick|pdf1:${esc(d.id)}" title="Joindre ou remplacer le PDF de ce document">📎</button>`:''}</div>`;}; /* 19/10 (QF) : ⛔ « bloquant » → ⏱ « à signer dès l'arrivée (sous 7 jours) » : l'étiquette reste, rien ne bloque */
  const pass=Array.isArray(c.pass)?c.pass:[];
  return `<h2 class="vt">Accueil RH <span class="hint">· documents d'accueil, livrets, passeport</span></h2>
    <div class="eq-kpis">${kpi(L.length,'documents d\'accueil')}${kpi(nText+nPdf,'lisibles (texte ou PDF)',nText+nPdf?'ok':'')}${kpi(nWait,'PDF à joindre',nWait?'bad':'ok')}${kpi(late.length,'signatures en retard',late.length?'bad':'ok')}</div>
    ${LAST?`<div class="okbox" style="margin:0 0 8px"><b>${esc(LAST.t)}</b>${LAST.lines.map(l=>'<div>'+esc(l)+'</div>').join('')}</div>`:''}
    ${adm?`<div class="card"><h3>1. Importer le pack</h3><div class="hint" style="margin-bottom:6px">Le pack SCR (JSON privé) : partie « accueil » = documents, livrets, passeport, textes. Réimporter met à jour, sans doublon ; une version changée redemande la signature.</div>
      <button class="btn primary block" data-act="x" data-v="${ID}|pick|pack">📦 Choisir le pack (JSON)</button>${c.imp?`<div class="hint" style="margin-top:6px">Dernier import le ${dFR(c.imp.at)}${c.imp.by?' par '+esc(c.imp.by):''} : ${esc(c.imp.sum||'')}</div>`:''}</div>
    <div class="card"><h3>2. Joindre les PDF</h3><div class="hint" style="margin-bottom:6px">Choisis plusieurs PDF d'un coup : chacun va au document dont le « fichier » porte le même nom (la fin du nom et l'extension comptent peu). Un document lisible apparaît aussitôt « à lire et signer » chez les personnes concernées.</div>
      <button class="btn primary block" data-act="x" data-v="${ID}|pick|pdfs">📎 Joindre les PDF</button></div>
    <div class="card"><h3>3. Carte de bienvenue</h3><div class="hint" style="margin-bottom:6px">Rien ne bloque jamais l'accès à l'appli (règle du 19/10). Un nouveau compte voit en tête de son accueil une carte « Bienvenue chez SCR — N documents à lire et à signer sous 7 jours → Commencer », fermable, qui revient tant qu'il reste des documents ; chaque document a son échéance dans « À faire » (rouge une fois dépassée) et les retards remontent ici et chez les chefs.</div></div>`:'<div class="hint" style="margin:0 0 8px">Import du pack et PDF : administrateur.</div>'}
    ${late.length?`<div class="ac-h"><b>En retard</b><span>${late.length}</span></div><div class="card" style="padding:4px 10px"><table class="rc" style="font-size:12px">${late.slice(0,60).map(x=>`<tr><td><b>${esc(x.p.name||x.p.email)}</b><div class="dim" style="font-size:11px">${esc(posteLab(x.p.poste))}${x.p.type==='interim'?' · intérim':''}</div></td><td style="white-space:normal">${esc(x.d.title)}</td><td style="color:#9b2c22;font-weight:700;white-space:nowrap">${-x.u.left} j</td></tr>`).join('')}</table></div>`:''}
    <div class="ac-h"><b>Documents d'accueil</b><span>${L.length}</span></div>${L.length?L.map(row).join(''):'<div class="ac-empty">Aucun document d\'accueil : importe le pack.</div>'}
    ${pass.length?`<div class="ac-h"><b>Passeport de prévention</b><span>${pass.length}</span></div><div class="card" style="padding:4px 10px;overflow-x:auto"><table class="rc" style="font-size:12px"><tr><th>Formation / habilitation</th><th>Validité</th><th>Obligatoire pour</th></tr>${pass.map(p=>`<tr><td>${esc(p.label)}${p.hab?'':' <span class="eq-tag">pas encore suivi</span>'}</td><td>${p.ans?p.ans+' an'+(p.ans>1?'s':''):esc(p.txt||'—')}</td><td style="white-space:normal">${esc(p.oblig.map(k=>k==='tous'?'tout le monde':posteLab(k)).join(', ')||'—')}</td></tr>`).join('')}</table></div><div class="hint">Chacun voit son passeport dans Compagnon → Passeport (à jour, à renouveler sous 90 j, expiré, manquant pour son poste).</div>`:''}`;}

/* choix de fichiers : un champ créé HORS de l'écran (un re-rendu pendant que le sélecteur est ouvert ne perd pas le choix) */
let PICK=null;
function pickFiles(what,me,ctx){if(!canAdmin(me,ctx)){ctx.toast('Réservé à l\'administrateur');return;}if(BUSY){ctx.toast('Patiente : envoi en cours');return;}
  if(PICK)PICK.remove();const inp=PICK=document.createElement('input');inp.type='file';inp.accept=what==='pack'?'.json,application/json':'application/pdf';inp.multiple=what==='pdfs';inp.style.display='none';document.body.appendChild(inp);
  inp.addEventListener('change',()=>{const files=[...(inp.files||[])];inp.remove();if(PICK===inp)PICK=null;if(files.length)handleFiles(what,files,ctx);});inp.click();}
async function handleFiles(what,files,ctx){BUSY=true;
  try{if(what==='pack'){let j=null;try{j=JSON.parse(await files[0].text());}catch(e){throw new Error('le fichier n\'est pas un JSON lisible');}await importPack(j,ctx);ctx.toast('Pack importé ✓');}
    else if(what==='pdfs'){const R=await attachPdfs(files,ctx);ctx.toast(R.ok.length+' PDF joint'+(R.ok.length>1?'s':'')+(R.sans.length?' · '+R.sans.length+' sans document':'')+(R.err.length?' · '+R.err.length+' erreur'+(R.err.length>1?'s':''):''));}
    else if(String(what).startsWith('pdf1:')){const d=docById(String(what).slice(5));if(!d)throw new Error('document introuvable');const R=await attachPdfs(files.slice(0,1),ctx,d);ctx.toast(R.ok.length?'PDF joint ✓':(R.err[0]||'PDF non joint'));}}
  catch(e){LAST={t:'Erreur',lines:[e.message||String(e)]};ctx.toast('Erreur : '+(e.message||e));}
  finally{BUSY=false;ctx.render();}}
let CSS=false;
function css(){if(CSS||typeof document==='undefined')return;CSS=true;const st=document.createElement('style');st.id='acc-css';
  st.textContent=`.acc-welcome{position:relative;border-left:4px solid #eb6834;margin:0 0 10px}.acc-k{font-size:11px;font-weight:700;letter-spacing:.06em;text-transform:uppercase;color:#eb6834}
  .acc-welcome .acc-x{position:absolute;top:6px;right:6px;width:40px;height:40px;border:0;border-radius:10px;background:#f1efe8;color:#52514e;font-size:16px;cursor:pointer}.acc-welcome .acc-x:active{background:#e4e1d8}
  .acc-welcome .actions{display:flex;flex-direction:row;flex-wrap:wrap;gap:6px;margin-top:6px}.acc-welcome .actions .btn{flex:1 1 180px;min-height:44px}
  .acc-drow{display:flex;gap:6px;align-items:stretch}.acc-drow .ac-row{flex:1;min-width:0}.acc-drow .acc-one{align-self:center;flex:none}
  .dr-doc mark.acc-ph{background:#fff4d6;padding:0 3px;border-radius:3px}.dr-doc mark.acc-chk{background:#fdeae7;color:#9b2c22;font-size:11px;padding:0 4px;border-radius:3px}`;
  document.head.appendChild(st);} /* 19/10 (QF) : plus d'écran bloquant (.acc-gate) ni de masquage des onglets de l'accueil */

export default {id:ID,kinds:['doc','docsig'],hub:'entreprise',
  pack:{key:'accueil',label:'Accueil RH — documents d\'accueil, livrets, passeport de prévention',import:(part,ctx)=>importPack(part,ctx)},
  /* 19/10 (QF) : gate() n'existe plus — rien ne bloque l'accueil. banner() = carte de bienvenue non bloquante en tête de l'accueil (espace.js, vAccueil) */
  banner(me,ctx){css();const acc=me&&me._acc;if(!acc||HIDE||ctx.viewing()||!ownView(ctx)||!docsReady())return '';if(!isNewcomer(acc))return '';const L=welcomeDocs(acc);if(!L.length)return '';return welcomeHTML(me,acc,L);},
  hubRows(tab,me,ctx){css();if(tab!=='entreprise'||!(me.admin||ctx.can('dossier.edit')||ctx.can('qse.manage')))return [];
    const L=accDocs();const nw=L.filter(d=>d.pending).length;
    return [ctx.row('Accueil RH','Documents d\'accueil à signer, livrets, PDF à joindre, passeport de prévention','📗','#e6f5ec','x:'+ID+':admin',nw?nw+' PDF':null,'bad')];},
  xview(k,me,ctx){css();if(k==='admin')return adminView(me,ctx);return null;},
  act(v,el,me,ctx){const i=v.indexOf('|');const a=i<0?v:v.slice(0,i),arg=i<0?'':v.slice(i+1);
    if(a==='open'){docOpen(arg,me._acc);return;}
    if(a==='start'){const L=welcomeDocs(me._acc);if(!L.length){ctx.toast('Tout est signé ✓');ctx.render();return;}docOpen(L[0].d.id,me._acc);return;}
    if(a==='docs'){ctx.sub('docs');return;}
    if(a==='hide'){HIDE=true;ctx.render();return;}
    if(a==='pick'){pickFiles(arg,me,ctx);return;}
    if(a==='later'||a==='preview'||a==='gateall'){ctx.toast('Plus d\'écran bloquant depuis le 19/10 : les documents se signent sous 7 jours');return;}}}; /* anciens boutons : inertes */

