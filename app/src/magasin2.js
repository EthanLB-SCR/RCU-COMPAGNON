// magasin2.js — 19/10 (lot MG) : LA SUITE DU MAGASIN, branchée sur magasin.js (qui garde le modèle : demandes, préparation, stock, pack). Ici :
//   G1 · FICHES TYPE du matériel par poste : une fiche par métier venue des dotations du pack (magcat/config.dotations) ; lisible par tout compte actif
//        (Parc → Magasin → 🧰 Fiches type ; Moi → Magasin → « Fiches type ») ; modifiable par le magasin (mag.manage) ; « Équiper un véhicule » →
//        une demande magdem pré-remplie, imputée au véhicule ; « Imprimer la fiche » (A4, présent / manquant, visas) ; comparaison à l'inventaire de la
//        remise du véhicule (vrec, module véhicules) → « Demander les manquants ».
//        RÈGLE DE FUSION AVEC LE PACK : la fiche du pack est la base (clé = métier) ; ce qui est changé dans l'appli est gardé À PART dans le registre
//        magcat / « fiche|p:<métier> » = {edits:{<clé article>:{qte, aLaDemande, off}}, ajouts:[…], titre} ; un réimport met à jour les lignes du pack
//        (libellé, dotation, contrôle…) MAIS une quantité changée ici reste, une ligne retirée ici reste retirée, une ligne ajoutée ici reste ; une ligne
//        que le pack ne contient plus disparaît (sauf si elle avait été ajoutée ici). Une fiche dupliquée / créée ici (« fiche|a:<id> ») est une copie
//        complète : le pack ne la touche jamais.
//   G3 · PASTILLES dans le planning (espace.js : cartes de personnes, « Ma semaine », hub du chef) : « 📦 1 commande prête au dépôt », « 📦 2 en attente »…
//        (couleurs des statuts) → la liste des demandes de la personne (lecture) ; compteur dans le hub du chef (« x:mag:equipe »).
//   G5 · CRÉER UN ARTICLE (Stock → ＋ Nouvel article) : référence proposée (famille + n° suivant), contrôle de doublon (désignation normalisée : accents,
//        pluriel, mots dans le désordre ; référence ; alias) → « Ressemble à… C'est le même article ? » ; l'article créé porte source:'appli' et survit
//        au réimport du pack (le pack ne touche que ses propres références). Photo facultative : magcat / « photo|<ref> » (réduite, à part du catalogue).
//   G6 · ENTRÉES ET SORTIES MULTIPLES : on crée l'entrée (motif, fournisseur / chantier, n° de BL, date, note), on y met les articles (recherche, + / −,
//        scan ou saisie d'une référence), « Valider » → un magmvt par ligne, liés par « lot:<id> » ; une entrée / sortie se consulte et s'imprime (bon) ;
//        une sortie « pour quelqu'un » crée aussi une ligne magdem « direct » (statut terminée) : la personne la voit dans Moi → Magasin (« remis le … »).
// Pas de nouveau registre, pas de SQL : magcat / magdem / magmvt et leurs droits existants. Aucune donnée réelle SCR ici (dépôt public).
import {regAll,regGet,regSet,regLoad,regLoaded} from './reg.js';
import {vehAll,vehDe} from './flotte.js';
import {docHTML} from './charte.js';

/* ── ce que magasin.js nous confie (init2) : données, droits, libellés, état de navigation ── */
let cat,conf,stocks,dems,isMgr,RO,nom,persNom,mvtNew,S,ST,HST,impLab,stLab,relq,nonPrep,reste,servi,enAttente,ensure,num,hay,mvtRow,MOTIFS_ENT,KMVT,histoHTML,detLigne,canAsk;
let READY=false;
export function init2(h){({cat,conf,stocks,dems,isMgr,RO,nom,persNom,mvtNew,S,ST,HST,impLab,stLab,relq,nonPrep,reste,servi,enAttente,ensure,num,hay,mvtRow,MOTIFS_ENT,KMVT,histoHTML,detLigne,canAsk}=h);READY=true;}
/* ── état des vues de ce fichier ── */
export const S2={fv:'list',fid:null,fedit:false,fq:'',moi:false,equip:null,newArt:null,lot:null,lotId:null,xcur:null,team:{}};
/* ── outils (les mêmes que magasin.js, repris ici pour ne pas dépendre de l'ordre de chargement) ── */
const esc=s=>String(s==null?'':s).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const norm=s=>String(s||'').normalize('NFD').replace(/[̀-ͯ]/g,'').toLowerCase();
const r3=x=>Math.round((+x||0)*1000)/1000;
const nf=n=>r3(n).toLocaleString('fr-FR',{maximumFractionDigits:2});
const pad=n=>String(n).padStart(2,'0');
const auj=()=>{const d=new Date();return d.getFullYear()+'-'+pad(d.getMonth()+1)+'-'+pad(d.getDate());};
const isoNow=()=>new Date().toISOString();
const fDate=s=>{if(!s)return '';const d=new Date(String(s).length<=10?s+'T12:00:00':s);if(isNaN(d))return String(s);return pad(d.getDate())+'/'+pad(d.getMonth()+1)+(d.getFullYear()!==new Date().getFullYear()?'/'+d.getFullYear():'');};
const fDT=s=>{const d=new Date(s);return isNaN(d)?'':fDate(s)+' '+pad(d.getHours())+'h'+pad(d.getMinutes());};
const uid=()=>Date.now().toString(36)+Math.random().toString(36).slice(2,7);
const slug=s=>norm(s).replace(/[^a-z0-9]+/g,'-').replace(/^-|-$/g,'')||'x';
const pl=(n,w)=>n+' '+w+(n>1?'s':'');
const STOP=new Set(['de','du','des','la','le','les','l','d','en','et','a','au','aux','pour','avec','un','une','sur','par','ou']);
// clé de comparaison d'une désignation : sans accents, minuscules, mots-outils retirés, pluriels ramenés au singulier, mots triés (« gants de soudeur » = « Gant soudeur »)
export const simKey=s=>norm(s).replace(/[^a-z0-9]+/g,' ').split(' ').filter(w=>w&&!STOP.has(w)).map(w=>w.length>3?w.replace(/(aux|eaux)$/,'al').replace(/[sx]$/,''):w).sort().join(' ');
const ST0={envoyee:['Envoyée','#1c3d6b','#e8f1fc'],preparation:['En préparation','#7a5200','#fff3d6'],prete:['Prête au dépôt','#15673a','#e6f5ec'],remise:['Retirée · reliquat à venir','#5a3fb8','#efeafd']};
const st2=()=>ST||ST0;
const relq2=d=>r3((d.lignes||[]).reduce((x,l)=>x+Math.max(0,(+l.qte||0)-(+l.remis||0)),0));
const dems2=()=>regAll('magdem').filter(d=>d&&d.byKey&&d.statut);
const people=ctx=>((ctx&&ctx.people)||[]).filter(p=>p&&p.active!==false).slice().sort((a,b)=>nom(a,ctx).localeCompare(nom(b,ctx),'fr'));
const encadre=ctx=>isMgr(ctx)||!!ctx.can('planning.edit')||!!ctx.can('pointage.validate'); /* qui peut créer une demande AU NOM d'un autre (règle serveur : encadrement / bureau / magasin) */
const topScroll=()=>{try{window.scrollTo(0,0);setTimeout(()=>{const hb=document.getElementById('homeBody');if(hb)hb.scrollTop=0;},0);}catch(e){}};
const openDoc=(html,ctx)=>{let w=null;try{w=window.open('','_blank');}catch(e){}if(!w){if(ctx)ctx.toast('Autorise la fenêtre pop-up pour imprimer');return;}w.document.write(html);w.document.close();};
/* ── CSS du lot (injectée une fois) ── */
const CSS=`.mag-pb{display:inline-flex;align-items:center;gap:4px;min-height:34px;padding:2px 10px;border-radius:999px;font-size:12.5px;font-weight:700;margin:3px 6px 0 0;cursor:pointer;white-space:normal;line-height:1.2;text-align:left;vertical-align:middle;border:1px solid rgba(0,0,0,.06)}
.mag-pbs{display:flex;flex-wrap:wrap;align-items:center;gap:2px 0;margin:4px 0 8px}
.mag-tag{display:inline-block;font-size:11px;font-weight:700;border-radius:999px;padding:1px 8px;background:#fff3d6;color:#7a5200;white-space:nowrap}
.mag-tag.ok{background:#e6f5ec;color:#15673a}.mag-tag.bad{background:#fdecec;color:#a01212}.mag-tag.appli{background:#e8f1fc;color:#1c3d6b}
.mag-root .mag-x{flex:none;min-height:40px;min-width:40px;padding:0 10px}
.mag-edl{display:flex;align-items:center;gap:8px;margin-left:auto;flex:none;flex-wrap:wrap}.mag-edl .mag-pin{margin-left:0}
.mag-qv small{display:block;font-size:11px;font-weight:600;color:var(--ink2)}
.mag-cmp{display:flex;flex-wrap:wrap;gap:6px;margin:6px 0}
.mag-root .mag-li.off .mag-lt{opacity:.55}
.mag-photo{max-width:100%;max-height:220px;border-radius:12px;display:block;margin:6px 0}
.mag-ficheh{display:flex;flex-wrap:wrap;gap:8px;align-items:center;margin:4px 0 8px}
.mag-root .mag-ficheh input.f{flex:1 1 220px;margin:0}
.mag-lotrow .ic{font-size:18px}`;
function css2(){if(typeof document==='undefined'||document.getElementById('css-lot-mg'))return;const s=document.createElement('style');s.id='css-lot-mg';s.textContent=CSS;document.head.appendChild(s);}
const stepHTML=(dec,inc,q,lab)=>`<div class="mag-step"><button class="mo" data-act="x" data-v="${esc(dec)}" aria-label="Moins" ${q?'':'disabled'}>−</button><span class="n${q?'':' z'}">${nf(q)}</span><button class="pl" data-act="x" data-v="${esc(inc)}" data-l="${esc(lab||'')}" aria-label="Plus">+</button></div>`;

/* ══════════ G1 · FICHES TYPE ══════════ */
function packFiches(){const D=(conf().dotations||[]).filter(d=>d&&Array.isArray(d.articles));const seen={};
  return D.map((d,i)=>{let k='p:'+slug(d.metier||d.titre||('dot'+i));if(seen[k])k+='-'+i;seen[k]=1;const ak={};
    const articles=d.articles.map((x,j)=>{if(!x)return null;const label=String(x.label||x.designation||x.ref||'').trim();if(!label&&!x.ref)return null;let key=x.ref?String(x.ref):'d:'+slug(label||('l'+j));if(ak[key])key+='-'+j;ak[key]=1;
      return {key,ref:x.ref?String(x.ref):null,label:label||String(x.ref),qte:x.qte==null||x.qte===''?null:+x.qte,qteTexte:x.qteTexte||null,unite:x.unite||x.uniteDotation||null,aLaDemande:!!x.aLaDemande,controle:x.controle||null,observation:x.observation||null,section:x.section||null,src:'pack'};}).filter(Boolean);
    return {id:k,titre:String(d.titre||d.metier||'Fiche'),metier:d.metier||null,metiers:Array.isArray(d.metiers)?d.metiers.map(String):[],miseAJour:d.miseAJour||null,source:'pack',articles};});}
const ficheRows=()=>{const R={};regAll('magcat').forEach(r=>{if(r&&/^fiche\|/.test(r.id))R[r.id.slice(6)]=r;});return R;};
function applyDelta(f,r){if(!r)return f;const E=r.edits||{};const arts=f.articles.map(a=>{const e=E[a.key];if(!e)return a;if(e.off)return null;return Object.assign({},a,e.qte!==undefined&&e.qte!==null?{qte:+e.qte,qteApp:true}:{},e.aLaDemande!==undefined?{aLaDemande:!!e.aLaDemande}:{});}).filter(Boolean);
  (r.ajouts||[]).forEach(a=>{if(a&&a.key)arts.push(Object.assign({src:'appli'},a));});
  return Object.assign({},f,{titre:r.titre||f.titre,articles:arts,editedAt:r.editedAt||null,editedBy:r.editedBy||null,delta:r});}
// toutes les fiches : celles du pack (avec les retouches de l'appli) puis celles créées / dupliquées ici
export function ficheAll(){const R=ficheRows();const out=packFiches().map(f=>applyDelta(f,R[f.id]));
  Object.keys(R).sort().forEach(k=>{const r=R[k];if(!k.startsWith('a:')||r.deleted)return;out.push({id:k,titre:String(r.titre||'Fiche'),metier:r.metier||null,metiers:Array.isArray(r.metiers)?r.metiers:[],miseAJour:r.miseAJour||null,source:'appli',base:r.base||null,createdAt:r.createdAt||null,editedAt:r.editedAt||null,editedBy:r.editedBy||null,articles:(Array.isArray(r.articles)?r.articles:[]).map(a=>Object.assign({src:'appli'},a))});});
  return out;}
const ficheGet=id=>ficheAll().find(f=>f.id===id)||null;
const stamp=(me,ctx)=>({editedAt:isoNow(),editedBy:nom(me,ctx)});
// une retouche sur une fiche du pack : delta ; sur une fiche de l'appli : la fiche elle-même
function ficheEdit(f,me,ctx,fn){if(f.source==='appli'){const r=regGet('magcat','fiche|'+f.id)||{};const arts=(Array.isArray(r.articles)?r.articles:[]).map(a=>Object.assign({},a));const o={titre:r.titre||f.titre,articles:arts};fn(o,true);regSet('magcat','fiche|'+f.id,Object.assign({titre:o.titre,articles:o.articles},stamp(me,ctx)),{quiet:true});return;}
  const r=regGet('magcat','fiche|'+f.id)||{};const o={titre:r.titre||null,edits:Object.assign({},r.edits||{}),ajouts:(Array.isArray(r.ajouts)?r.ajouts:[]).map(a=>Object.assign({},a))};fn(o,false);
  regSet('magcat','fiche|'+f.id,Object.assign({titre:o.titre||null,edits:o.edits,ajouts:o.ajouts},stamp(me,ctx)),{quiet:true});}
function setQte(f,key,val,me,ctx){ficheEdit(f,me,ctx,(o,app)=>{if(app){const a=o.articles.find(x=>x.key===key);if(a)a.qte=val;}else{const aj=o.ajouts.find(x=>x.key===key);if(aj)aj.qte=val;else o.edits[key]=Object.assign({},o.edits[key]||{},{qte:val});}});}
function setAld(f,key,val,me,ctx){ficheEdit(f,me,ctx,(o,app)=>{if(app){const a=o.articles.find(x=>x.key===key);if(a)a.aLaDemande=val;}else{const aj=o.ajouts.find(x=>x.key===key);if(aj)aj.aLaDemande=val;else o.edits[key]=Object.assign({},o.edits[key]||{},{aLaDemande:val});}});}
function rmLine(f,key,me,ctx){ficheEdit(f,me,ctx,(o,app)=>{if(app)o.articles=o.articles.filter(x=>x.key!==key);else{const i=o.ajouts.findIndex(x=>x.key===key);if(i>=0)o.ajouts.splice(i,1);else o.edits[key]=Object.assign({},o.edits[key]||{},{off:true});}});}
function addLine(f,line,me,ctx){ficheEdit(f,me,ctx,(o,app)=>{if(!app&&o.edits[line.key]&&o.edits[line.key].off){delete o.edits[line.key].off;if(!Object.keys(o.edits[line.key]).length)delete o.edits[line.key];return;} /* une ligne du pack retirée puis ré-ajoutée : on la rétablit (pas de doublon) */(app?o.articles:o.ajouts).push(line);});}
function setTitre(f,t,me,ctx){ficheEdit(f,me,ctx,o=>{o.titre=t;});}
function dupFiche(f,me,ctx){const id='a:'+uid();regSet('magcat','fiche|'+id,{source:'appli',titre:f.titre+' (copie)',metier:f.metier||null,metiers:f.metiers||[],miseAJour:fDate(auj()),base:f.id,articles:f.articles.map(a=>({key:a.key,ref:a.ref||null,label:a.label,qte:a.qte,qteTexte:a.qteTexte||null,unite:a.unite||null,aLaDemande:!!a.aLaDemande,controle:a.controle||null,observation:a.observation||null})),createdAt:isoNow(),createdBy:nom(me,ctx)},{quiet:true});return id;}
function newFiche(me,ctx){const id='a:'+uid();regSet('magcat','fiche|'+id,{source:'appli',titre:'Nouvelle fiche',metier:null,metiers:[],miseAJour:fDate(auj()),base:null,articles:[],createdAt:isoNow(),createdBy:nom(me,ctx)},{quiet:true});return id;}
const nAld=f=>f.articles.filter(a=>a.aLaDemande).length;
function rowFiche(f){const n=f.articles.length,k=nAld(f);
  return `<button class="ac-row mag-row" data-act="x" data-v="mag|fiopen|${esc(f.id)}"><span class="ic" style="background:#fff3d6">🧰</span><span class="tx"><b>${esc(f.titre)}</b><small>${pl(n,'article')}${k?' · dont '+k+' à la demande':''}${f.miseAJour?' · mise à jour '+esc(f.miseAJour):''}${f.source==='appli'?' · créée dans l\'appli':''}${f.editedAt?' · modifiée le '+esc(fDate(f.editedAt)):''}</small></span><span class="chev">›</span></button>`;}
// o = {moi:true (Moi → Magasin : retour vers « Mes demandes »)} ; en Parc → Magasin la barre des segments est au-dessus
export function vFiches(me,ctx,o){css2();o=o||{};S2.moi=!!o.moi;const mgr=isMgr(ctx);const F=ficheAll();
  if(S2.fv==='equip'&&S2.equip)return vEquip(me,ctx,o);
  const f=S2.fv==='fiche'&&S2.fid?F.find(x=>x.id===S2.fid):null;if(f)return vFiche1(me,ctx,f,o,mgr);S2.fv='list';S2.fid=null;
  if(!regLoaded('vehicule'))regLoad(['vehicule']).catch(()=>{});
  return `${o.moi?`<button class="ac-back" data-act="x" data-v="mag|list">‹ Mes demandes</button>`:''}<h2 class="vt">🧰 Fiches type <span class="hint">· le matériel nécessaire par poste</span></h2>
    <div class="hint">Une fiche par métier, venue des dotations camion du pack SCR${mgr?' ; le magasin peut la retoucher (quantités, lignes), la dupliquer, en créer une':''}. Depuis une fiche : équiper un véhicule (demande au magasin pré-remplie), imprimer la fiche pour un contrôle à la main, comparer à l'inventaire du véhicule.</div>
    ${F.length?`<div class="card">${F.map(rowFiche).join('')}</div>`:`<div class="card"><div class="eq-s">${Object.keys(cat()).length?'Pas de dotation camion dans le pack importé : la fiche type attend le pack (⚙ Catalogue).':'Pas encore de catalogue : importe le pack magasin (⚙ Catalogue).'}</div></div>`}
    ${mgr?`<div class="mag-acts"><button class="btn" data-act="x" data-v="mag|finew|">＋ Nouvelle fiche vide</button></div>`:''}`;}
function ligneFiche(a,C,st,mgr,edit){const A=a.ref?C[a.ref]:null;const lien=a.ref?(A?'🔗 '+esc(A.label)+' ('+esc(a.ref)+')'+(mgr&&st?' · stock '+nf(st[a.ref]||0)+' '+esc(A.unite||''):''):'réf. '+esc(a.ref)+' — pas dans le catalogue'):'pas de lien avec le stock';
  return `<div class="mag-li"><div class="mag-lt"><b>${esc(a.label)}</b><small>${lien}${a.controle?' · contrôle : '+esc(a.controle):''}${a.observation?' · '+esc(a.observation):''}</small>${a.aLaDemande||a.src==='appli'||a.qteApp?`<small>${a.aLaDemande?'<span class="mag-tag">à la demande</span> ':''}${a.src==='appli'?'<span class="mag-tag appli">ajouté dans l\'appli</span> ':''}${a.qteApp?'<span class="mag-tag appli">quantité modifiée ici</span>':''}</small>`:''}</div>
    ${edit?`<div class="mag-edl"><label class="mag-chk" style="margin:0" title="À la demande : pas d'office dans la dotation"><input type="checkbox" data-xin="mag|fiald|${esc(a.key)}" ${a.aLaDemande?'checked':''}> à la demande</label><div class="mag-pin"><small>${esc(a.unite||'quantité')}</small><input class="f" type="number" inputmode="decimal" min="0" step="any" data-xin="mag|fiq|${esc(a.key)}" value="${a.qte==null?'':esc(a.qte)}"></div><button class="btn danger mag-x" data-act="x" data-v="mag|firm|${esc(a.key)}" aria-label="Retirer cette ligne" title="Retirer cette ligne">✕</button></div>`
      :`<div class="mag-qv">${a.qte==null?esc(a.qteTexte||'—'):nf(a.qte)} <small>${esc(a.unite||'')}</small></div>`}</div>`;}
// résultats de la recherche « ajouter un article » (mis à jour seuls à chaque lettre, comme la recherche de la demande)
function fiRes(C){const q=norm(S2.fq).trim();if(q.length<2)return '<div class="hint">Tape au moins deux lettres : l\'article du catalogue s\'ajoute avec son lien au stock ; sinon une ligne libre.</div>';const W=q.split(/\s+/);
  const hits=Object.values(C).filter(a=>a.actif!==false&&W.every(w=>hay(a).includes(w))).sort((a,b)=>String(a.label).localeCompare(String(b.label),'fr')).slice(0,12);
  return (hits.length?hits.map(a=>`<div class="mag-li"><div class="mag-lt"><b>${esc(a.label)}</b><small>${esc(a.ref)}${a.famille?' · '+esc(a.famille):''}</small></div><button class="btn mag-x" data-act="x" data-v="mag|fiadd|${esc(a.ref)}">＋ Ajouter</button></div>`).join(''):'<div class="eq-s">Rien dans le catalogue avec ces mots.</div>')+`<div class="mag-acts"><button class="btn" data-act="x" data-v="mag|fiaddtxt|">＋ Ajouter « ${esc(S2.fq.trim())} » sans lien avec le stock</button></div>`;}
function vFiche1(me,ctx,f,o,mgr){const C=cat();const st=mgr?stocks(C):null;const edit=mgr&&S2.fedit;const app=f.source==='appli';
  return `<button class="ac-back" data-act="x" data-v="mag|fiback|">‹ Fiches type</button>
    <div class="card">${edit&&app?`<div class="mag-ficheh"><input class="f" data-xin="mag|fititre" value="${esc(f.titre)}" placeholder="Titre de la fiche (ex. Camion manchonneur v2)"></div>`:`<h3>🧰 ${esc(f.titre)}</h3>`}
      <div class="eq-s">${pl(f.articles.length,'article')}${nAld(f)?' · '+nAld(f)+' à la demande':''}${f.metiers&&f.metiers.length?' · métiers : '+esc(f.metiers.join(', ')):f.metier?' · métier : '+esc(f.metier):''}${f.miseAJour?' · mise à jour '+esc(f.miseAJour):''}${app?' · créée dans l\'appli'+(f.base?' (copie)':''):' · pack SCR'}${f.editedAt?' · modifiée le '+esc(fDT(f.editedAt))+(f.editedBy?' par '+esc(f.editedBy):''):''}</div>
      <div class="mag-acts"><button class="btn primary" data-act="x" data-v="mag|eqstart|${esc(f.id)}">🚚 Équiper un véhicule</button><button class="btn" data-act="x" data-v="mag|fiprint|${esc(f.id)}">🖨 Imprimer la fiche</button>${mgr?`<button class="btn${edit?' primary':''}" data-act="x" data-v="mag|fiedit|">${edit?'✓ Fin des modifications':'✏️ Modifier la fiche'}</button><button class="btn" data-act="x" data-v="mag|fidup|${esc(f.id)}">⧉ Dupliquer</button>${app?`<button class="btn danger" data-act="x" data-v="mag|fidel|${esc(f.id)}">🗑 Supprimer</button>`:''}`:''}</div>
      ${edit?`<div class="hint">Chaque changement est enregistré tout de suite. ${app?'Cette fiche est à toi : le pack ne la touche pas.':'Fiche du pack : tes retouches (quantités, lignes retirées ou ajoutées) sont gardées à part et survivent à un réimport du pack.'}</div>`:''}</div>
    <div class="card"><div class="mag-lines">${f.articles.map(a=>ligneFiche(a,C,st,mgr,edit)).join('')||'<div class="eq-s">Aucun article dans cette fiche.'+(edit?' Ajoute-les ci-dessous.':'')+'</div>'}</div></div>
    ${edit?`<div class="card"><h3>＋ Ajouter un article</h3><input class="f" type="search" autocomplete="off" placeholder="🔍 Chercher dans le catalogue du dépôt" data-xin="mag|fiq2" value="${esc(S2.fq)}"><div id="mag-fires">${fiRes(C)}</div></div>`:''}`;}
/* ── équiper un véhicule → demande au magasin ── */
const vehMetier=(v,f)=>{const t=norm(v.type||'');const ms=[f.metier].concat(f.metiers||[]).filter(Boolean).map(norm);if(!ms.length)return false;return ms.some(m=>(/soud/.test(m)&&/soud/.test(t))||(/manchon/.test(m)&&/manchon/.test(t))||(/tuyau|pell/.test(m)&&/tuyau|pell/.test(t))||(/chef|conduc/.test(m)&&/cdc|fonction/.test(t)));};
const lastRec=immat=>regAll('vrec').filter(r=>r&&r.vehId===immat&&r.inventaire).sort((a,b)=>String(b.at||'').localeCompare(String(a.at||'')))[0]||null;
// la fiche face à l'inventaire de la remise : même réf., ou même désignation (clé de comparaison), ou l'une contient l'autre
function compare(f,rec){const I=(rec&&rec.inventaire)||{};const items=(I.items||[]).map(x=>({id:String(x[0]),d:String(x[1]||x[0]),k:simKey(x[1]||x[0])}));const miss=I.miss||{};const M=new Set(),P=new Set(),N=[];
  f.articles.forEach(a=>{const k=simKey(a.label);const it=items.find(x=>(a.ref&&x.id===a.ref)||(k&&x.k===k))||items.find(x=>k&&x.k&&Math.min(k.length,x.k.length)>=6&&(x.k.includes(k)||k.includes(x.k)));if(!it){N.push(a);return;}(miss[it.id]?M:P).add(a.key);});return {miss:M,pres:P,none:N};}
function vEquip(me,ctx,o){const E=S2.equip;const f=ficheGet(E.fid);if(!f){S2.fv='fiche';S2.equip=null;return vFiches(me,ctx,o);}
  if(!regLoaded('vehicule')||!regLoaded('vrec'))regLoad(['vehicule','vrec']).catch(()=>{});
  const all=vehAll();const mine=all.filter(v=>vehMetier(v,f)),others=all.filter(v=>!mine.includes(v));const known=all.some(v=>v.immat===E.veh);const autre=!all.length||E.vehAutre||(E.veh&&!known);
  const opt=v=>`<option value="${esc(v.immat)}" ${E.veh===v.immat?'selected':''}>${esc(v.immat)}${v.type?' · '+esc(v.type):''}${v.marque?' · '+esc(v.marque)+' '+esc(v.modele||''):''}${v.conducteur?' — '+esc(v.conducteur):''}</option>`;
  const P=people(ctx);const canPick=encadre(ctx);const pers=canPick?(E.pers||me.id):me.id;const persN=persNom(pers,ctx)||(pers===me.id?nom(me,ctx):pers);
  const rec=E.veh&&known?lastRec(E.veh):null;const cmp=rec&&E.cmp?compare(f,rec):null;
  const on=a=>E.inc[a.key]!==undefined?!!E.inc[a.key]:!a.aLaDemande;const qOf=a=>E.lines[a.key]!==undefined?+E.lines[a.key]:(a.qte&&a.qte>0?a.qte:1);const n=f.articles.filter(on).length;
  const lignes=f.articles.map(a=>{const o1=on(a);const miss=cmp&&cmp.miss.has(a.key),pres=cmp&&cmp.pres.has(a.key),none=cmp&&cmp.none.includes(a);
    return `<div class="mag-li${o1?'':' off'}"><div class="mag-lt"><b>${esc(a.label)}</b><small>${a.aLaDemande?'à la demande · ':''}${a.ref?esc(a.ref):'hors catalogue'}${a.qte!=null?' · dotation '+nf(a.qte)+' '+esc(a.unite||''):a.qteTexte?' · '+esc(a.qteTexte):''}${miss?' · <span class="mag-tag bad">manquant à l\'inventaire</span>':pres?' · <span class="mag-tag ok">présent à l\'inventaire</span>':none?' · <span class="mag-tag">pas dans l\'inventaire</span>':''}</small></div>
      ${o1?stepHTML('mag|eqdec|'+a.key,'mag|eqinc|'+a.key,qOf(a),a.label):`<button class="btn mag-x" data-act="x" data-v="mag|eqinc|${esc(a.key)}">＋ Ajouter</button>`}</div>`;}).join('');
  return `<button class="ac-back" data-act="x" data-v="mag|eqx|">‹ ${esc(f.titre)}</button>
    <h2 class="vt">🚚 Équiper un véhicule <span class="hint">· ${esc(f.titre)}</span></h2>
    <div class="card"><h3>Quel véhicule ?</h3>
      ${all.length?`<select class="f" data-xin="mag|eqveh"><option value="">— choisis le véhicule —</option>${mine.length?`<optgroup label="Véhicules du métier">${mine.map(opt).join('')}</optgroup>`:''}${others.length?`<optgroup label="${mine.length?'Autres véhicules du parc':'Parc'}">${others.map(opt).join('')}</optgroup>`:''}<option value="__autre" ${autre?'selected':''}>Autre : je saisis l'immatriculation</option></select>`:'<div class="hint">Pas de véhicule dans la flotte sur cet appareil : saisis l\'immatriculation.</div>'}
      ${autre?`<input class="f" data-xin="mag|eqimmat" placeholder="Immatriculation (AA-123-AA)" autocapitalize="characters" value="${esc(known?'':E.veh||'')}">`:''}
      ${rec?`<div class="hint">📋 ${rec.type==='reception'?'Remise':'Restitution'} du ${esc(fDate(rec.at))}${rec.conducteurNom?' à '+esc(rec.conducteurNom):''} : inventaire de ${pl(((rec.inventaire||{}).items||[]).length,'article')}, ${Object.keys((rec.inventaire||{}).miss||{}).length} manquant${Object.keys((rec.inventaire||{}).miss||{}).length>1?'s':''}.</div>
        ${cmp?`<div class="mag-cmp"><span class="mag-tag ok">${cmp.pres.size} présent${cmp.pres.size>1?'s':''}</span><span class="mag-tag bad">${cmp.miss.size} manquant${cmp.miss.size>1?'s':''}</span><span class="mag-tag">${cmp.none.length} pas dans l'inventaire</span></div><div class="mag-acts">${cmp.miss.size?`<button class="btn primary" data-act="x" data-v="mag|eqmiss|">Demander les manquants (${cmp.miss.size})</button>`:'<div class="okbox" style="flex:1 1 100%">✓ Rien ne manque par rapport à la fiche.</div>'}<button class="btn" data-act="x" data-v="mag|eqall|">Toute la fiche</button></div>`:`<div class="mag-acts"><button class="btn" data-act="x" data-v="mag|eqcmp|">🔍 Comparer à l'inventaire du véhicule</button></div>`}`:(E.veh&&known?'<div class="hint">Pas de remise enregistrée pour ce véhicule (module véhicules) : rien à comparer.</div>':'')}</div>
    <div class="card"><h3>Pour qui ?</h3>${canPick?`<select class="f" data-xin="mag|eqpers">${P.some(p=>p.id===pers)?'':`<option value="${esc(pers)}" selected>${esc(persN)}</option>`}${P.map(p=>`<option value="${esc(p.id)}" ${p.id===pers?'selected':''}>${esc(nom(p,ctx))}${p.id===me.id?' (moi)':''}</option>`).join('')}</select><div class="hint">${E.persAuto?'Proposé : le conducteur du véhicule.':'La demande sera à son nom : il la voit dans Moi → Magasin et sera prévenu quand elle est prête.'}</div>`:`<div class="eq-s">La demande sera à ton nom : <b>${esc(persN)}</b>.</div>`}</div>
    <div class="card"><h3>Les articles <span class="hint">· ${n} retenu${n>1?'s':''} sur ${f.articles.length}</span></h3><div class="hint">Quantités de dotation d'office ; les articles « à la demande » sont décochés : touche ＋ pour les ajouter.</div><div class="mag-lines">${lignes}</div></div>
    <div class="card"><label class="f">Note pour le magasin</label><textarea class="f" rows="2" data-xin="mag|eqnote" placeholder="Taille, précision…">${esc(E.note||'')}</textarea></div>
    <div class="mag-bar"><span class="mag-bn"><b>${n}</b> article${n>1?'s':''}</span><button class="btn primary" data-act="x" data-v="mag|eqsend|">📤 Créer la demande</button></div>`;}
function eqSend(me,ctx){const E=S2.equip;const f=E&&ficheGet(E.fid);if(!f)return;const immat=String(E.veh||'').toUpperCase().trim();if(!immat){ctx.toast('Choisis le véhicule (ou saisis son immatriculation).');return;}
  const canPick=encadre(ctx);const pers=canPick?(E.pers||me.id):me.id;const persN=persNom(pers,ctx)||(pers===me.id?nom(me,ctx):pers);
  const on=a=>E.inc[a.key]!==undefined?!!E.inc[a.key]:!a.aLaDemande;const L=f.articles.filter(on);if(!L.length){ctx.toast('Garde au moins un article.');return;}
  const at=isoNow();const id=pers+'|'+uid();const by=nom(me,ctx);const v=vehAll().find(x=>x.immat===immat);
  const lignes=L.map(a=>({ref:a.ref||null,label:a.label,qte:r3(E.lines[a.key]!==undefined?+E.lines[a.key]:(a.qte&&a.qte>0?a.qte:1)),prep:0,remis:0}));
  const note=['Équipement du véhicule '+immat+' — fiche type « '+f.titre+' »',String(E.note||'').trim()].filter(Boolean).join('\n');
  regSet('magdem',id,{byKey:pers,byName:persN,at,statut:'envoyee',lignes,imputation:{type:'vehicule',id:immat,label:v?(v.immat+(v.marque?' '+v.marque:'')).trim():immat},note,fiche:{id:f.id,titre:f.titre},origine:'fiche',creePar:by,creeParKey:me.id,histo:[{at,by,statut:'envoyee',note:'depuis la fiche type « '+f.titre+' »'+(pers!==me.id?' — pour '+persN:'')}]},{quiet:true});
  S2.equip=null;S2.fv='fiche';
  if(S2.moi){S2.fv='list';if(pers===me.id){S.v='fiche';S.cur=id;}else{S.v='list';S.cur=null;}} /* Moi → Magasin : vers la demande (la mienne) ou la liste */
  else if(isMgr(ctx)){S.seg='dem';S.mcur=id;S.refus=null;} /* Parc → Magasin : le magasin arrive sur la demande à préparer */
  ctx.toast('✓ Demande créée pour '+persN+' : '+pl(lignes.length,'article')+', véhicule '+immat);ctx.render();topScroll();}
/* ── impression A4 : la fiche avec cases présent / manquant ── */
function fichePrintHTML(f,C){const n=f.articles.length;
  const rows=f.articles.map((a,i)=>`<tr><td>${i+1}</td><td><b>${esc(a.label)}</b>${a.aLaDemande?' <span class="muted">(à la demande)</span>':''}${a.controle?`<div class="muted">contrôle : ${esc(a.controle)}</div>`:''}</td><td class="n">${a.qte==null?esc(a.qteTexte||'—'):nf(a.qte)}</td><td>${esc(a.unite||'')}</td><td>${a.ref?esc(a.ref):'<span class="muted">—</span>'}</td><td class="ck">☐</td><td class="ck">☐</td><td>${esc(a.observation||'')}</td></tr>`).join('');
  return docHTML({title:'Fiche type — '+f.titre,h1:f.titre,kicker:'Magasin · fiche type du matériel par poste',sub:esc(pl(n,'article'))+(nAld(f)?' · '+nAld(f)+' à la demande':'')+(f.miseAJour?' · mise à jour '+esc(f.miseAJour):'')+(f.source==='appli'?' · fiche de l\'appli':' · pack SCR'),
    meta:[['Immatriculation','<span class="bl">&nbsp;</span>'],['Utilisateur','<span class="bl">&nbsp;</span>'],['Date du contrôle','<span class="bl">&nbsp;</span>']],
    body:`<table class="inv"><tr><th>#</th><th>Désignation</th><th class="n">Qté</th><th>Unité</th><th>Réf. stock</th><th>Présent</th><th>Manquant</th><th>Observation</th></tr>${rows||'<tr><td colspan="8" class="muted">Aucun article.</td></tr>'}</table>
      <p class="muted">Coche « présent » ou « manquant » pour chaque ligne ; note l'état dans « observation ». Les manquants se demandent au magasin (Moi → Magasin, ou « Équiper un véhicule » depuis la fiche).</p>
      <table class="sig"><tr><th>Visa du magasin</th><th>Visa de l'utilisateur</th><th>Visa du responsable</th></tr><tr><td>Nom, date, signature</td><td>Nom, date, signature</td><td>Nom, date, signature</td></tr></table>`,
    css:'table.inv td,table.inv th{padding:5px 7px;font-size:11.5px}table.inv td.ck{font-size:18px;text-align:center;line-height:1}.bl{display:inline-block;min-width:150px;border-bottom:1px solid #221f1f}',footLeft:'Fiche type · '+esc(f.titre)});}

/* ══════════ G3 · PASTILLES DU PLANNING ══════════ */
const pill=(key,k,t)=>{const s=st2()[k]||['','#55524c','#efeee9'];return `<span class="mag-pb" role="button" tabindex="0" data-act="x" data-v="mag|pers|${esc(key)}" style="color:${s[1]};background:${s[2]}" title="Voir ses demandes au magasin">📦 ${esc(t)}</span>`;};
// pastille(s) d'une personne : prête(s) au dépôt · en préparation · en attente · reliquat à venir ; rien = '' (données déjà chargées : magdem pour tous)
export function magPersBadge(key){css2();if(!key)return '';const L=dems2().filter(d=>d.byKey===key&&!d.direct);if(!L.length)return '';const n=s=>L.filter(d=>d.statut===s).length;const pr=n('prete'),pp=n('preparation'),en=n('envoyee'),rl=L.filter(d=>d.statut==='remise'&&relq2(d)>0).length;
  const out=[];if(pr)out.push(pill(key,'prete',pr+' commande'+(pr>1?'s':'')+' prête'+(pr>1?'s':'')+' au dépôt'));if(pp)out.push(pill(key,'preparation',pp>1?pp+' en préparation':'en préparation'));if(en)out.push(pill(key,'envoyee',en+' en attente'));if(rl)out.push(pill(key,'remise',rl>1?rl+' reliquats à venir':'reliquat à venir'));return out.join('');}
// « Ma semaine » de la personne elle-même : la même pastille, en ligne sous le titre
export function magMineHTML(key){const h=magPersBadge(key);return h?`<div class="mag-pbs"><span class="hint" style="margin-right:4px">Magasin :</span>${h}</div>`:'';}
// hub du chef / du conducteur : « 3 commandes prêtes au dépôt dans l'équipe » (ids = clés de son équipe ; row = gabarit de ligne du hub)
export function magHubRow(me,ids,row){css2();const T=(ids||[]).filter(Boolean);S2.team[me.id]=T;if(!T.length)return '';const set=new Set(T);const L=dems2().filter(d=>set.has(d.byKey)&&!d.direct);const n=s=>L.filter(d=>d.statut===s).length;const pr=n('prete'),pp=n('preparation'),en=n('envoyee'),rl=L.filter(d=>d.statut==='remise'&&relq2(d)>0).length;
  const parts=[pr?pr+' prête'+(pr>1?'s':'')+' au dépôt':'',en?en+' en attente':'',pp?pp+' en préparation':'',rl?rl+' reliquat'+(rl>1?'s':'')+' à venir':''].filter(Boolean);
  const t=pr?pr+' commande'+(pr>1?'s':'')+' prête'+(pr>1?'s':'')+' au dépôt dans l\'équipe':'Commandes au dépôt de l\'équipe';
  return row(t,parts.length?parts.join(' · ')+' — touche pour voir qui':'Aucune commande en cours dans l\'équipe · les demandes des gars au magasin, et ce qui est prêt à retirer','📦',pr?'#e6f5ec':'#efeee9','x:mag:equipe',pr||null,'ok');}
// fiche d'une personne (panneau) : ses demandes en cours
export function magPersCard(key){const L=dems2().filter(d=>d.byKey===key&&!d.direct&&['envoyee','preparation','prete','remise'].includes(d.statut)&&!(d.statut==='remise'&&!relq2(d)));if(!L.length)return '';
  return `<div class="card"><h3>📦 Magasin</h3><div class="mag-pbs">${magPersBadge(key)}</div><div class="eq-s">${L.slice(0,4).map(d=>esc(fDate(d.at))+' · '+esc((d.lignes||[]).length?pl((d.lignes||[]).length,'article'):'demande libre')+' · '+esc((st2()[d.statut]||[d.statut])[0])).join('<br>')}</div></div>`;}
function demCard(d,ctx){const lignes=(d.lignes||[]).map(l=>`<div class="mag-li"><div class="mag-lt"><b>${esc(l.label||l.ref)}</b><small>${detLigne(d,l)}</small></div><div class="mag-qv">${nf(l.qte)}</div></div>`).join('');
  return `<div class="card"><h3>${esc(d.byName||d.byKey)} ${stLab(d)}</h3><div class="eq-s">Demandée le ${esc(fDT(d.at))} · ${esc(impLab(d.imputation))}${d.urgent?' · ⚡ urgent':''}${d.fiche?' · fiche type « '+esc(d.fiche.titre||'')+' »':''}</div>
    ${d.statut==='prete'&&d.partiel?`<div class="okbox">Prête en partie : ${pl((d.reliquat||[]).length,'article')} manque${(d.reliquat||[]).length>1?'nt':''}, reliquat à venir${d.reliquatAttendu?' (attendu le '+esc(fDate(d.reliquatAttendu))+')':''}.</div>`:''}
    ${d.note?`<div class="mag-note">📝 ${esc(d.note)}</div>`:''}<div class="mag-lines">${lignes||'<div class="eq-s">Demande libre (voir la note).</div>'}</div>${histoHTML(d)}<div class="hint">Lecture seule : c'est le magasin qui prépare et remet.</div></div>`;}
const rowRO=d=>`<button class="ac-row mag-row" data-act="x" data-v="mag|xopen|${esc(d.id)}"><span class="ic" style="background:${(st2()[d.statut]||[])[2]||'#efeee9'}">📦</span><span class="tx"><b>${esc((d.lignes||[]).length?pl((d.lignes||[]).length,'article'):'demande libre')} · ${esc(impLab(d.imputation))}</b><small>${esc(fDT(d.at))}${d.urgent?' · ⚡ urgent':''}</small><small>${stLab(d)}${d.statut==='remise'&&relq2(d)?' reliquat '+nf(relq2(d)):''}${d.statut==='prete'&&d.partiel?' en partie':''}</small></span><span class="chev">›</span></button>`;
// sous-vues du hub (x:mag:pers:<clé> · x:mag:equipe) : lecture
export function xview2(key,me,ctx){css2();ensure(ctx);const [k,...r]=String(key||'').split(':');const arg=r.join(':');
  if(S2.xcur){const d=regGet('magdem',S2.xcur);if(d)return `<button class="ac-back" data-act="x" data-v="mag|xback|">‹ Demandes</button>${demCard(d,ctx)}`;S2.xcur=null;}
  if(k==='pers'){const L=dems2().filter(d=>d.byKey===arg).sort((a,b)=>String(b.at).localeCompare(String(a.at)));const n=persNom(arg,ctx)||(L[0]&&L[0].byName)||arg;const act=L.filter(d=>['envoyee','preparation','prete'].includes(d.statut)||(d.statut==='remise'&&relq2(d)>0)),fin=L.filter(d=>!act.includes(d));
    return `<h2 class="vt">📦 Magasin <span class="hint">· demandes de ${esc(n)}</span></h2><div class="mag-pbs">${magPersBadge(arg)}</div>
      <div class="ac-h"><b>En cours</b><span>${act.length||''}</span></div>${act.map(rowRO).join('')||'<div class="eq-s mag-vide">Aucune demande en cours.</div>'}
      ${fin.length?`<details class="mag-det"><summary>Terminées · annulées · refusées (${fin.length})</summary>${fin.slice(0,20).map(rowRO).join('')}</details>`:''}`;}
  if(k==='equipe'){const T=S2.team[me.id]||[];const set=new Set(T);const L=dems2().filter(d=>set.has(d.byKey)&&!d.direct&&(['envoyee','preparation','prete'].includes(d.statut)||(d.statut==='remise'&&relq2(d)>0)));const pr=L.filter(d=>d.statut==='prete').length;
    const by={};L.forEach(d=>{(by[d.byKey]=by[d.byKey]||[]).push(d);});const keys=Object.keys(by).sort((a,b)=>(persNom(a,ctx)||a).localeCompare(persNom(b,ctx)||b,'fr'));
    return `<h2 class="vt">📦 Commandes au dépôt <span class="hint">· ton équipe</span></h2><div class="eq-kpis mag-kp"><div class="eq-kpi ${pr?'ok':''}"><b>${pr}</b><small>prête${pr>1?'s':''} au dépôt</small></div><div class="eq-kpi"><b>${L.filter(d=>d.statut==='envoyee').length}</b><small>en attente</small></div><div class="eq-kpi"><b>${L.filter(d=>d.statut==='preparation').length}</b><small>en préparation</small></div><div class="eq-kpi"><b>${L.filter(d=>d.statut==='remise').length}</b><small>reliquats à venir</small></div></div>
      ${keys.map(k2=>`<div class="ac-h"><b>${esc(persNom(k2,ctx)||by[k2][0].byName||k2)}</b><span>${pl(by[k2].length,'demande')}</span></div>${by[k2].sort((a,b)=>String(a.at).localeCompare(String(b.at))).map(rowRO).join('')}`).join('')||'<div class="ac-empty">✓ Aucune commande en cours dans ton équipe.</div>'}
      <div class="hint">Ce que les gars de ton équipe ont demandé au magasin et ce qui les attend au dépôt. Lecture seule : le magasin prépare et remet.</div>`;}
  return '';}

/* ══════════ G5 · NOUVEL ARTICLE ══════════ */
const METIERS_ART=['soudeur','tuyauteur','manchonneur','pelleur','chef'];
function refProp(C,fam){const pref=(norm(fam).replace(/[^a-z]/g,'').slice(0,3).toUpperCase())||'ART';const nums=Object.keys(C).filter(r=>r.toUpperCase().startsWith(pref+'-')).map(r=>parseInt(r.slice(pref.length+1),10)).filter(n=>!isNaN(n));return pref+'-'+String((nums.length?Math.max(...nums):0)+1).padStart(3,'0');}
// doublons : même référence · même désignation (clé de comparaison) · même alias · désignation proche (mots communs ≥ 60 %)
export function doublons(C,label,ref){const k=simKey(label);const W=new Set(k.split(' ').filter(Boolean));const out=[];
  Object.values(C).forEach(a=>{let why=null;if(ref&&String(a.ref).toLowerCase()===String(ref).toLowerCase())why='même référence';else{const ka=simKey(a.label);if(k&&ka===k)why='même désignation';else if(k&&(Array.isArray(a.aliases)?a.aliases:[]).some(x=>simKey(x)===k))why='même alias';else if(W.size>=2){const Wa=new Set(ka.split(' ').filter(Boolean));const inter=[...W].filter(w=>Wa.has(w)).length;const uni=new Set([...W,...Wa]).size;if(uni&&inter/uni>=0.6)why='désignation proche';}}if(why)out.push({a,why});});
  return out.sort((x,y)=>(x.why==='désignation proche'?1:0)-(y.why==='désignation proche'?1:0)).slice(0,5);}
export const newArtStart=()=>{S2.newArt={ref:'',refTouched:false,label:'',famille:'',unite:'u',tampon:'',emplacement:'',fournisseur:'',prix:'',metiers:{},stock:'',photo:null,dup:null};};
export function vNewArt(me,ctx){css2();const N=S2.newArt;const C=cat();const fams=[...new Set(Object.values(C).map(a=>a.famille).filter(Boolean))].sort((a,b)=>a.localeCompare(b,'fr'));const fours=[...new Set(Object.values(C).map(a=>a.fournisseur).filter(Boolean))].sort((a,b)=>a.localeCompare(b,'fr'));
  const mets=[...new Set(METIERS_ART.concat(...Object.values(C).map(a=>Array.isArray(a.metiers)?a.metiers:[])))];const ref=N.refTouched&&N.ref?N.ref:refProp(C,N.famille);
  return `<button class="ac-back" data-act="x" data-v="mag|nax|">‹ Stock</button>
    <div class="card"><h3>＋ Nouvel article</h3><div class="hint">Un article créé ici porte la mention « créé dans l'appli » et reste après un réimport du pack. À la validation, on vérifie que ce n'est pas un doublon.</div>
      <div class="mag-grid"><div><label class="f">Désignation (obligatoire)</label><input class="f" data-xin="mag|na|label" value="${esc(N.label)}" placeholder="ex. Gants de manutention taille 10"></div>
        <div><label class="f">Référence <span class="hint">· proposée : famille + n° suivant</span></label><input class="f" data-xin="mag|na|ref" value="${esc(ref)}" autocapitalize="characters"></div>
        <div><label class="f">Famille</label><input class="f" data-xin="mag|na|famille" list="mag-fams" value="${esc(N.famille)}" placeholder="ex. EPI, Abrasifs, Outillage"><datalist id="mag-fams">${fams.map(f=>`<option value="${esc(f)}">`).join('')}</datalist></div>
        <div><label class="f">Unité</label><input class="f" data-xin="mag|na|unite" list="mag-unites" value="${esc(N.unite)}"><datalist id="mag-unites">${['u','paire','paquet','boîte','rouleau','m','kg','L','lot'].map(u=>`<option value="${u}">`).join('')}</datalist></div>
        <div><label class="f">Seuil / stock tampon</label><input class="f" type="number" inputmode="decimal" min="0" step="any" data-xin="mag|na|tampon" value="${esc(N.tampon)}"></div>
        <div><label class="f">Emplacement</label><input class="f" data-xin="mag|na|emplacement" value="${esc(N.emplacement)}" placeholder="ex. Rayon B3"></div>
        <div><label class="f">Fournisseur</label><input class="f" data-xin="mag|na|fournisseur" list="mag-fours" value="${esc(N.fournisseur)}"><datalist id="mag-fours">${fours.map(f=>`<option value="${esc(f)}">`).join('')}</datalist></div>
        <div><label class="f">Prix d'achat unitaire (€ HT)</label><input class="f" type="number" inputmode="decimal" min="0" step="any" data-xin="mag|na|prix" value="${esc(N.prix)}"></div>
        <div><label class="f">Quantité en stock aujourd'hui (facultatif)</label><input class="f" type="number" inputmode="decimal" min="0" step="any" data-xin="mag|na|stock" value="${esc(N.stock)}"></div></div>
      <label class="f">Métiers concernés</label><div class="mag-seg">${mets.map(m=>`<button class="mag-sgb${N.metiers[m]?' on':''}" data-act="x" data-v="mag|namet|${esc(m)}">${esc(m)}</button>`).join('')}</div>
      <div class="mag-acts"><label class="btn">📷 ${N.photo?'Changer la photo':'Photo (facultatif)'}<input type="file" accept="image/*" capture="environment" data-xin="mag|naphoto" style="display:none"></label>${N.photo?`<button class="btn" data-act="x" data-v="mag|naphotox|">Retirer la photo</button>`:''}</div>${N.photo?`<img class="mag-photo" src="${N.photo}" alt="Photo de l'article">`:''}
      ${N.dup?`<div class="warnbox" style="margin-top:10px"><b>Ressemble à :</b> ${N.dup.map(x=>esc(x.a.label)+' ('+esc(x.a.ref)+') — '+esc(x.why)).join(' · ')}<br>C'est le même article ?
        <div class="mag-acts"><button class="btn primary" data-act="x" data-v="mag|naopen|${esc(N.dup[0].a.ref)}">Oui, ouvrir celui-là</button><button class="btn" data-act="x" data-v="mag|naforce|">Non, créer quand même</button></div></div>`:''}
      <div class="mag-acts">${N.dup?'':`<button class="btn primary" data-act="x" data-v="mag|naok|">✓ Créer l'article</button>`}<button class="btn" data-act="x" data-v="mag|nax|">Annuler</button></div></div>`;}
function naCreate(me,ctx,force){const N=S2.newArt;const C=cat();const label=String(N.label||'').trim();if(label.length<3){ctx.toast('Donne une désignation (3 lettres au moins).');return;}
  const ref=String(N.refTouched&&N.ref?N.ref:refProp(C,N.famille)).toUpperCase().trim().replace(/[|§:]/g,'-');if(!ref){ctx.toast('Donne une référence.');return;}
  if(C[ref]){ctx.toast('La référence '+ref+' existe déjà : '+C[ref].label);N.dup=[{a:C[ref],why:'même référence'}];ctx.render();return;}
  if(!force){const D=doublons(C,label,ref);if(D.length){N.dup=D;ctx.render();return;}}
  const at=isoNow();const by=nom(me,ctx);const tampon=num(String(N.tampon||'').replace(',','.')),prix=num(String(N.prix||'').replace(',','.')),stock=num(String(N.stock||'').replace(',','.'));
  const a={ref,label,famille:String(N.famille||'').trim()||null,unite:String(N.unite||'').trim()||'u',fournisseur:String(N.fournisseur||'').trim()||null,marque:null,refFournisseur:null,aliases:[],metiers:Object.keys(N.metiers).filter(k=>N.metiers[k]),tampon:tampon!==null&&tampon>=0?tampon:null,emplacement:String(N.emplacement||'').trim()||null,prix:prix!==null&&prix>=0?prix:null,actif:true,stockInit:stock!==null&&stock>=0?stock:0,stockAt:at,source:'appli',createdAt:at,createdBy:by,editedAt:at,editedBy:by,photo:!!N.photo};
  regSet('magcat','catalogue',{[ref]:a},{quiet:true});if(N.photo)regSet('magcat','photo|'+ref,{ref,img:N.photo,at,by},{quiet:true});
  S2.newArt=null;S.art=ref;S.artFrom='stock';S.rec={};S.inv={};ctx.toast('✓ Article créé : '+label+' ('+ref+')'+(force?' — malgré la ressemblance':''));ctx.render();topScroll();}
// photo réduite (≤ 480 px, JPEG) : légère pour le registre et le téléphone
function readPhoto(file,cb){try{const rd=new FileReader();rd.onload=()=>{const im=new Image();im.onload=()=>{try{const k=Math.min(1,480/Math.max(im.width,im.height));const c=document.createElement('canvas');c.width=Math.max(1,Math.round(im.width*k));c.height=Math.max(1,Math.round(im.height*k));c.getContext('2d').drawImage(im,0,0,c.width,c.height);cb(c.toDataURL('image/jpeg',0.72));}catch(e){cb(String(rd.result));}};im.onerror=()=>cb(null);im.src=String(rd.result);};rd.onerror=()=>cb(null);rd.readAsDataURL(file);}catch(e){cb(null);}}
export const artPhoto=ref=>{const p=regGet('magcat','photo|'+ref);return p&&p.img?p.img:null;};
// bloc photo de la fiche article (consultation + remplacement par le magasin)
export function artPhotoHTML(a,mgr){const img=artPhoto(a.ref);if(!img&&!mgr)return '';return `<div class="card"><h3>📷 Photo</h3>${img?`<img class="mag-photo" src="${img}" alt="Photo de ${esc(a.label)}">`:'<div class="eq-s">Pas de photo.</div>'}${mgr?`<div class="mag-acts"><label class="btn">📷 ${img?'Changer la photo':'Ajouter une photo'}<input type="file" accept="image/*" capture="environment" data-xin="mag|nphoto|${esc(a.ref)}" style="display:none"></label></div>`:''}</div>`;}

/* ══════════ G6 · ENTRÉES ET SORTIES MULTIPLES (lots) ══════════ */
const MOTIFS_SORTIE=['Dotation','Dépannage','Chantier','Casse / perte','Autre'];
export const lotStart=type=>{S2.lot={type,motif:type==='entree'?MOTIFS_ENT[0]:MOTIFS_SORTIE[0],fourn:'',bl:'',date:auj(),note:'',site:'',pers:'',lignes:{},labels:{},q:'',scan:''};S2.lotId=null;};
const nbL=L=>Object.keys(L.lignes).filter(r=>+L.lignes[r]>0).length;
function lotRes(L,C){const q=norm(L.q).trim();if(q.length<2)return '';const W=q.split(/\s+/);const st=stocks(C);
  const hits=Object.values(C).filter(a=>a.actif!==false&&W.every(w=>hay(a).includes(w))).sort((a,b)=>String(a.label).localeCompare(String(b.label),'fr')).slice(0,30);
  return `<div class="card">${hits.length?hits.map(a=>`<div class="mag-li"><div class="mag-lt"><b>${esc(a.label)}</b><small>${esc(a.ref)}${a.famille?' · '+esc(a.famille):''} · stock ${nf(st[a.ref]||0)} ${esc(a.unite||'')}</small></div>${stepHTML('mag|lodec|'+a.ref,'mag|loinc|'+a.ref,+L.lignes[a.ref]||0,a.label)}</div>`).join(''):'<div class="eq-s">Rien trouvé : essaie un autre mot, ou crée l\'article (Stock → ＋ Nouvel article).</div>'}</div>`;}
export function vLot(me,ctx){css2();const L=S2.lot;const C=cat();const st=stocks(C);const ent=L.type==='entree';const refs=Object.keys(L.lignes).filter(r=>+L.lignes[r]>0);const n=refs.length;const P=people(ctx);const sites=ctx.sites||[];
  const fours=[...new Set(Object.values(C).map(a=>a.fournisseur).filter(Boolean))].sort((a,b)=>a.localeCompare(b,'fr'));const motifs=ent?MOTIFS_ENT.concat(['Inventaire']):MOTIFS_SORTIE;
  return `<button class="ac-back" data-act="x" data-v="mag|lox|">‹ Mouvements</button>
    <h2 class="vt">${ent?'＋ Entrée de stock':'− Sortie de stock'} <span class="hint">· ${ent?'plusieurs articles d\'un coup':'sans demande, plusieurs articles'}</span></h2>
    <div class="card"><h3>1 · ${ent?'L\'entrée':'La sortie'}</h3>
      <div class="mag-seg">${motifs.map(m=>`<button class="mag-sgb${L.motif===m?' on':''}" data-act="x" data-v="mag|lomotif|${esc(m)}">${esc(m)}</button>`).join('')}</div>
      <div class="mag-grid">${ent?`<div><label class="f">Fournisseur${/retour/i.test(L.motif)?' ou chantier / atelier':''}</label><input class="f" data-xin="mag|lo|fourn" list="mag-lofours" value="${esc(L.fourn)}"><datalist id="mag-lofours">${fours.map(f=>`<option value="${esc(f)}">`).join('')}</datalist></div><div><label class="f">N° de bon de livraison (facultatif)</label><input class="f" data-xin="mag|lo|bl" value="${esc(L.bl)}"></div>`
        :`<div><label class="f">Pour qui ? (annuaire, facultatif)</label><select class="f" data-xin="mag|lo|pers"><option value="">— personne en particulier —</option>${P.map(p=>`<option value="${esc(p.id)}" ${L.pers===p.id?'selected':''}>${esc(nom(p,ctx))}</option>`).join('')}</select></div><div><label class="f">Pour quel chantier ? (facultatif)</label><select class="f" data-xin="mag|lo|site"><option value="">— dépôt / atelier —</option>${sites.map(s=>`<option value="${esc(s.id)}" ${L.site===s.id?'selected':''}>${esc(s.name)}</option>`).join('')}</select></div>`}
        <div><label class="f">Date du bon</label><input class="f" type="date" data-xin="mag|lo|date" value="${esc(L.date)}"></div><div><label class="f">Note</label><input class="f" data-xin="mag|lo|note" value="${esc(L.note)}" placeholder="${ent?'ex. colis abîmé, reliquat de commande':'ex. remplacement casse chantier'}"></div></div>
      ${ent?'':'<div class="hint">Pour quelqu\'un : la sortie apparaît chez lui dans Moi → Magasin (« remis le … »). Pour un chantier : imputée au chantier. Sans les deux : dépôt / atelier.</div>'}</div>
    <div class="card"><h3>2 · Les articles <span class="hint">· ${n} retenu${n>1?'s':''}</span></h3>
      <label class="f">Scanner ou taper une référence, puis Entrée (+1 à chaque fois)</label><input class="f" data-xin="mag|loscan" enterkeyhint="done" autocomplete="off" placeholder="ex. T-01" value="${esc(L.scan)}">
      <label class="f">Ou chercher un article du dépôt</label><input class="f" type="search" enterkeyhint="search" autocomplete="off" placeholder="🔍 Désignation, référence, emplacement" data-xin="mag|loq" value="${esc(L.q)}"><div id="mag-lores">${lotRes(L,C)}</div>
      ${refs.length?`<div class="mag-lines">${refs.map(r=>{const a=C[r]||{};const q=+L.lignes[r];const warn=!ent&&st[r]!==undefined&&q>st[r];return `<div class="mag-li"><div class="mag-lt"><b>${esc(a.label||L.labels[r]||r)}</b><small>${esc(r)} · stock ${nf(st[r]||0)} ${esc(a.unite||'')}${warn?' · <span class="warn">⚠ plus que le stock théorique</span>':''}</small></div>${stepHTML('mag|lodec|'+r,'mag|loinc|'+r,q,a.label)}</div>`;}).join('')}</div>`:'<div class="eq-s mag-vide">Aucun article pour l\'instant : scanne ou cherche ci-dessus.</div>'}</div>
    <div class="mag-bar"><span class="mag-bn"><b>${n}</b> article${n>1?'s':''}</span><button class="btn primary" data-act="x" data-v="mag|look|">✓ Valider ${ent?'l\'entrée':'la sortie'}</button></div>`;}
function lotOk(me,ctx){const L=S2.lot;const C=cat();const refs=Object.keys(L.lignes).filter(r=>+L.lignes[r]>0);if(!refs.length){ctx.toast('Ajoute au moins un article.');return;}const ent=L.type==='entree';
  const lot=uid();const at=isoNow();const by=nom(me,ctx);const site=!ent&&L.site?(ctx.sites||[]).find(s=>s.id===L.site):null;const persN=!ent&&L.pers?(persNom(L.pers,ctx)||L.pers):'';
  const imputation=ent?null:site?{type:'chantier',id:site.id,label:site.name}:{type:'depot',id:'depot',label:'Dépôt'};const fourn=ent?String(L.fourn||'').trim()||null:null;const bl=ent?String(L.bl||'').trim()||null:null;const note=String(L.note||'').trim()||null;
  refs.forEach((r,j)=>mvtNew(me,ctx,Object.assign({type:ent?'entree':'sortie',ref:r,qte:r3(L.lignes[r]),lot,lotN:j,lotTotal:refs.length,motif:L.motif||null,fournisseur:fourn,bl,imputation,note,docDate:L.date||null},ent?{}:{pourKey:L.pers||null,pourName:persN||null,qui:persN||null})));
  if(!ent&&L.pers){const lignes=refs.map(r=>({ref:r,label:(C[r]||{}).label||r,qte:r3(L.lignes[r]),prep:r3(L.lignes[r]),remis:r3(L.lignes[r])}));
    regSet('magdem',L.pers+'|'+lot,{byKey:L.pers,byName:persN,at,statut:'cloturee',direct:true,lot,lignes,imputation,note:[L.motif,note].filter(Boolean).join(' — '),retirePar:persN,retireAt:at,histo:[{at,by,statut:'remise',note:'remis au dépôt sans demande ('+(L.motif||'sortie')+')'},{at,by,statut:'cloturee'}]},{quiet:true});}
  S2.lot=null;S2.lotId=lot;ctx.toast('✓ '+(ent?'Entrée':'Sortie')+' enregistrée : '+pl(refs.length,'article')+(persN?' pour '+persN:site?' pour '+site.name:''));ctx.render();topScroll();}
const lotMvts=id=>regAll(KMVT).filter(m=>m&&m.lot===id&&m.at).sort((a,b)=>(+a.lotN||0)-(+b.lotN||0));
const lotTitre=M=>{const m=M[0];const ent=m.type==='entree';return (ent?'Entrée':'Sortie')+' · '+pl(M.length,'article')+(m.motif?' · '+m.motif:'')+(m.fournisseur?' · '+m.fournisseur:'')+(m.bl?' · BL '+m.bl:'')+(!ent&&m.imputation?' · '+impLab(m.imputation):'')+(m.pourName?' · pour '+m.pourName:'');};
export function vLotDetail(id,me,ctx){css2();const M=lotMvts(id);const C=cat();if(!M.length){S2.lotId=null;return `<button class="ac-back" data-act="x" data-v="mag|lox|">‹ Mouvements</button><div class="card"><div class="eq-s">Bon introuvable sur cet appareil.</div></div>`;}const m=M[0];const ent=m.type==='entree';
  return `<button class="ac-back" data-act="x" data-v="mag|lox|">‹ Mouvements</button>
    <div class="card"><h3>${ent?'⬇ Bon d\'entrée':'⬆ Bon de sortie'} <span class="mag-mt ${ent?'entree':'sortie'}">${esc(m.motif||(ent?'Entrée':'Sortie'))}</span></h3>
      <div class="eq-s">${esc(fDT(m.at))}${m.docDate&&m.docDate!==String(m.at).slice(0,10)?' · bon du '+esc(fDate(m.docDate)):''} · saisi par ${esc(m.byName||'')}${m.fournisseur?' · '+esc(m.fournisseur):''}${m.bl?' · BL '+esc(m.bl):''}${!ent&&m.imputation?' · '+esc(impLab(m.imputation)):''}${m.pourName?' · pour '+esc(m.pourName):''}</div>
      ${m.note?`<div class="mag-note">📝 ${esc(m.note)}</div>`:''}
      <div class="mag-lines">${M.map(x=>`<div class="mag-li"><div class="mag-lt"><b>${esc((C[x.ref]||{}).label||x.ref)}</b><small>${esc(x.ref)}</small></div><div class="mag-qv">${ent?'+':'−'}${nf(x.qte)} <small>${esc((C[x.ref]||{}).unite||'')}</small></div></div>`).join('')}</div>
      <div class="mag-acts"><button class="btn primary" data-act="x" data-v="mag|loprint|${esc(id)}">🖨 Imprimer le bon</button></div></div>`;}
function lotPrintHTML(id){const M=lotMvts(id);const C=cat();if(!M.length)return '';const m=M[0];const ent=m.type==='entree';
  const rows=M.map((x,i)=>{const a=C[x.ref]||{};return `<tr><td>${i+1}</td><td><b>${esc(a.label||x.ref)}</b></td><td>${esc(x.ref)}</td><td class="n">${nf(x.qte)}</td><td>${esc(a.unite||'')}</td><td>${esc(a.emplacement&&a.emplacement!==x.ref?a.emplacement:'')}</td></tr>`;}).join('');
  return docHTML({title:(ent?'Bon d\'entrée ':'Bon de sortie ')+id,h1:ent?'Bon d\'entrée de stock':'Bon de sortie de stock',kicker:'Magasin · '+(ent?'entrée':'sortie')+' n° '+esc(id),sub:esc(fDT(m.at))+' · '+esc(pl(M.length,'article'))+' · saisi par '+esc(m.byName||''),
    meta:[['Motif',esc(m.motif||'')],ent?['Fournisseur',esc(m.fournisseur||'')]:['Imputation',esc(impLab(m.imputation))],ent?['N° BL',esc(m.bl||'')]:['Pour',esc(m.pourName||'')],['Date du bon',esc(fDate(m.docDate||m.at))]],
    body:`<table><tr><th>#</th><th>Désignation</th><th>Réf.</th><th class="n">Qté</th><th>Unité</th><th>Emplacement</th></tr>${rows}</table>${m.note?`<p><b>Note :</b> ${esc(m.note)}</p>`:''}
      <table class="sig"><tr><th>Visa du magasin</th><th>${ent?'Visa du livreur / de qui rapporte':'Visa de qui reçoit'}</th></tr><tr><td>${esc(m.byName||'')}</td><td>${esc(m.pourName||'')}</td></tr></table>`,footLeft:(ent?'Bon d\'entrée':'Bon de sortie')+' · TRACÉ'});}
// journal des mouvements : les lignes d'un même lot sont regroupées en une ligne touchable (bon), les autres restent une par article
export function lotsHTML(L,C){const seen=new Set();const out=[];L.forEach(m=>{if(m.lot){if(seen.has(m.lot))return;seen.add(m.lot);const M=lotMvts(m.lot);const ent=m.type==='entree';out.push(`<button class="ac-row mag-row mag-lotrow" data-act="x" data-v="mag|loopen|${esc(m.lot)}"><span class="ic" style="background:${ent?'#e6f5ec':'#fdebe3'}">${ent?'⬇':'⬆'}</span><span class="tx"><b>${esc(lotTitre(M.length?M:[m]))}</b><small>${esc(fDT(m.at))}${m.byName?' · '+esc(m.byName):''} · bon n° ${esc(m.lot)}</small></span><span class="chev">›</span></button>`);}else out.push(mvtRow(m,C));});return out.join('');}
const scanRef=(C,s)=>{const q=String(s||'').trim();if(!q)return null;const u=q.toUpperCase();if(C[u])return u;const k=norm(q);return (Object.values(C).find(a=>String(a.ref).toLowerCase()===k||(a.refFournisseur&&String(a.refFournisseur).toLowerCase()===k)||(Array.isArray(a.aliases)&&a.aliases.some(x=>norm(x)===k)))||{}).ref||null;};

/* ══════════ clics et champs de ce fichier (appelés par magasin.js : act2 / input2 renvoient true quand c'est pour eux) ══════════ */
const WRITE2=new Set(['fiedit','fiq','firm','fiadd','fiaddtxt','fidup','fidel','finew','eqsend','naok','naforce','look']);
export function act2(k,arg,el,me,ctx){if(!READY)return false;const mgrK=['fiedit','firm','fiadd','fiaddtxt','fidup','fidel','finew','nanew','namet','naok','naforce','naphotox','naopen','nax','lonew','lomotif','loinc','lodec','look','lox','loopen','loprint'];
  if(!/^(fi|eq|na|lo|pers$|xopen$|xback$)/.test(k))return false;
  if(mgrK.includes(k)&&!isMgr(ctx)){ctx.toast('Réservé au magasin (droit « Magasin »)');return true;}if(WRITE2.has(k)&&RO(ctx))return true;
  switch(k){
    /* fiches */
    case 'fiopen':S2.fv='fiche';S2.fid=arg;S2.fedit=false;S2.fq='';topScroll();break;
    case 'fiback':S2.fv='list';S2.fid=null;S2.fedit=false;S2.equip=null;break;
    case 'fiedit':S2.fedit=!S2.fedit;S2.fq='';break;
    case 'firm':{const f=ficheGet(S2.fid);if(!f)break;const a=f.articles.find(x=>x.key===arg);if(a&&typeof confirm==='function'&&!confirm('Retirer « '+a.label+' » de la fiche ?'))return true;rmLine(f,arg,me,ctx);ctx.toast('Ligne retirée');break;}
    case 'fiadd':{const f=ficheGet(S2.fid);const a=cat()[arg];if(!f||!a)break;if(f.articles.some(x=>x.ref===a.ref)){ctx.toast('Déjà dans la fiche : '+a.label);return true;}addLine(f,{key:a.ref,ref:a.ref,label:a.label,qte:1,unite:a.unite||null,aLaDemande:false,controle:null,observation:null},me,ctx);S2.fq='';ctx.toast('✓ Ajouté : '+a.label);break;}
    case 'fiaddtxt':{const f=ficheGet(S2.fid);const t=String(S2.fq||'').trim();if(!f||t.length<2)break;addLine(f,{key:'t:'+uid(),ref:null,label:t,qte:1,unite:null,aLaDemande:false,controle:null,observation:null},me,ctx);S2.fq='';ctx.toast('✓ Ligne ajoutée (sans lien avec le stock)');break;}
    case 'fidup':{const f=ficheGet(arg);if(!f)break;S2.fid=dupFiche(f,me,ctx);S2.fv='fiche';S2.fedit=true;ctx.toast('✓ Fiche dupliquée : donne-lui son titre');topScroll();break;}
    case 'finew':S2.fid=newFiche(me,ctx);S2.fv='fiche';S2.fedit=true;topScroll();break;
    case 'fidel':{const f=ficheGet(arg);if(!f||f.source!=='appli')break;if(typeof confirm==='function'&&!confirm('Supprimer la fiche « '+f.titre+' » ?'))return true;regSet('magcat','fiche|'+f.id,Object.assign({deleted:true},stamp(me,ctx)),{quiet:true});S2.fv='list';S2.fid=null;ctx.toast('Fiche supprimée');break;}
    case 'fiprint':{const f=ficheGet(arg);if(!f)break;openDoc(fichePrintHTML(f,cat()),ctx);return true;}
    /* équiper un véhicule */
    case 'eqstart':{const f=ficheGet(arg);if(!f)break;if(!canAsk(me)){ctx.toast('Les demandes au dépôt sont réservées aux comptes SCR.');return true;}const mine=encadre(ctx)?[]:vehDe(me._acc);S2.equip={fid:f.id,veh:mine.length===1?mine[0].immat:'',vehAutre:false,pers:me.id,persAuto:false,inc:{},lines:{},note:'',cmp:false};S2.fv='equip'; /* un gars : son véhicule d'office ; l'encadrement / le magasin choisit */regLoad(['vehicule','vrec']).catch(()=>{});topScroll();break;}
    case 'eqx':S2.equip=null;S2.fv='fiche';break;
    case 'eqinc':case 'eqdec':{const E=S2.equip;const f=E&&ficheGet(E.fid);if(!f)break;const a=f.articles.find(x=>x.key===arg);if(!a)break;const on=E.inc[arg]!==undefined?!!E.inc[arg]:!a.aLaDemande;const cur=E.lines[arg]!==undefined?+E.lines[arg]:(a.qte&&a.qte>0?a.qte:1);
      if(k==='eqinc'){if(!on){E.inc[arg]=true;E.lines[arg]=a.qte&&a.qte>0?a.qte:1;}else E.lines[arg]=r3(cur+1);}else{const q=r3(cur-1);if(q<=0){E.inc[arg]=false;E.lines[arg]=a.qte&&a.qte>0?a.qte:1;}else E.lines[arg]=q;}break;}
    case 'eqcmp':if(S2.equip)S2.equip.cmp=true;break;
    case 'eqmiss':{const E=S2.equip;const f=E&&ficheGet(E.fid);if(!f)break;const rec=lastRec(E.veh);if(!rec)break;const c=compare(f,rec);f.articles.forEach(a=>{E.inc[a.key]=c.miss.has(a.key);});ctx.toast(c.miss.size?'Seuls les manquants sont retenus ('+c.miss.size+')':'Rien ne manque');break;}
    case 'eqall':{const E=S2.equip;const f=E&&ficheGet(E.fid);if(!f)break;E.inc={};E.lines={};break;}
    case 'eqsend':eqSend(me,ctx);return true;
    /* pastilles / sous-vues du hub */
    case 'pers':if(arg===me.id){S.v='list';S.cur=null;ctx.sub('mag');}else{S2.xcur=null;ctx.go('x:mag:pers:'+arg);}return true;
    case 'xopen':S2.xcur=arg;break;
    case 'xback':S2.xcur=null;break;
    /* nouvel article */
    case 'nanew':newArtStart();S.art=null;topScroll();break;
    case 'namet':{const N=S2.newArt;if(!N)break;N.metiers[arg]=!N.metiers[arg];N.dup=null;break;}
    case 'naphotox':if(S2.newArt)S2.newArt.photo=null;break;
    case 'naok':naCreate(me,ctx,false);return true;
    case 'naforce':naCreate(me,ctx,true);return true;
    case 'naopen':S2.newArt=null;S.seg='stock';S.artFrom='stock';S.art=arg;S.rec={};S.inv={};topScroll();break;
    case 'nax':S2.newArt=null;break;
    /* entrées / sorties multiples */
    case 'lonew':lotStart(arg==='sortie'?'sortie':'entree');S.seg='mvt';topScroll();break;
    case 'lomotif':if(S2.lot)S2.lot.motif=arg;break;
    case 'loinc':case 'lodec':{const L=S2.lot;if(!L)break;const q=Math.max(0,r3((+L.lignes[arg]||0)+(k==='loinc'?1:-1)));if(q)L.lignes[arg]=q;else delete L.lignes[arg];if(q&&!L.labels[arg])L.labels[arg]=(el&&el.dataset&&el.dataset.l)||((cat()[arg]||{}).label)||arg;break;}
    case 'look':lotOk(me,ctx);return true;
    case 'lox':S2.lot=null;S2.lotId=null;break;
    case 'loopen':S2.lotId=arg;S2.lot=null;S.seg='mvt';topScroll();break;
    case 'loprint':openDoc(lotPrintHTML(arg),ctx);return true;
    default:return false;}
  ctx.render();return true;}
export function input2(k,arg,el,me,ctx,type){if(!READY)return false;if(!/^(fi|eq|na|lo|nphoto$)/.test(k))return false;
  switch(k){
    case 'fiq2':if(type!=='input')return true;S2.fq=el.value;{const r=document.getElementById('mag-fires');if(r)r.innerHTML=fiRes(cat());}return true;
    case 'fiq':{if(type!=='change'||!isMgr(ctx)||RO(ctx))return true;const f=ficheGet(S2.fid);if(!f)return true;const v=el.value===''?null:num(String(el.value).replace(',','.'));if(el.value!==''&&(v===null||v<0)){ctx.toast('Nombre invalide');return true;}setQte(f,arg,v,me,ctx);ctx.toast('✓ Quantité enregistrée');return true;}
    case 'fiald':{if(!isMgr(ctx)||RO(ctx))return true;const f=ficheGet(S2.fid);if(!f)return true;setAld(f,arg,!!el.checked,me,ctx);ctx.toast(el.checked?'« À la demande » : pas d\'office dans la dotation':'D\'office dans la dotation');ctx.render();return true;}
    case 'fititre':{if(type!=='change'||!isMgr(ctx)||RO(ctx))return true;const f=ficheGet(S2.fid);const t=String(el.value||'').trim();if(!f||!t)return true;setTitre(f,t,me,ctx);ctx.toast('✓ Titre enregistré');ctx.render();return true;}
    case 'eqveh':{if(type!=='change'||!S2.equip)return true;const E=S2.equip;if(el.value==='__autre'){E.vehAutre=true;E.veh='';}else{E.vehAutre=false;E.veh=el.value;E.cmp=false;const v=vehAll().find(x=>x.immat===el.value);if(v&&encadre(ctx)){const P=people(ctx);const p=(v.conducteurKey&&P.find(x=>x.id===v.conducteurKey))||(v.conducteur&&P.find(x=>nom(x,ctx).trim().toLowerCase()===String(v.conducteur).trim().toLowerCase()));if(p){E.pers=p.id;E.persAuto=true;}}}ctx.render();return true;}
    case 'eqimmat':if(S2.equip){S2.equip.veh=String(el.value||'').toUpperCase().trim();}return true;
    case 'eqpers':if(type!=='change'||!S2.equip)return true;S2.equip.pers=el.value;S2.equip.persAuto=false;ctx.render();return true;
    case 'eqnote':if(S2.equip)S2.equip.note=el.value;return true;
    case 'na':{const N=S2.newArt;if(!N)return true;if(arg==='ref'){N.ref=el.value;N.refTouched=!!String(el.value).trim();}else N[arg]=el.value;N.dup=null;if(arg==='famille'&&type==='change'&&!N.refTouched)ctx.render();return true;}
    case 'naphoto':{if(type!=='change'||!S2.newArt)return true;const f=el.files&&el.files[0];el.value='';if(!f)return true;readPhoto(f,img=>{if(!S2.newArt)return;if(!img){ctx.toast('Photo illisible');return;}S2.newArt.photo=img;ctx.render();});return true;}
    case 'nphoto':{if(type!=='change')return true;if(!isMgr(ctx)||RO(ctx))return true;const f=el.files&&el.files[0];el.value='';const a=cat()[arg];if(!f||!a)return true;readPhoto(f,img=>{if(!img){ctx.toast('Photo illisible');return;}regSet('magcat','photo|'+a.ref,{ref:a.ref,img,at:isoNow(),by:nom(me,ctx)},{quiet:true});regSet('magcat','catalogue',{[a.ref]:Object.assign({},a,{photo:true})},{quiet:true});ctx.toast('✓ Photo enregistrée');ctx.render();});return true;}
    case 'lo':if(S2.lot){S2.lot[arg]=el.value;if((arg==='pers'||arg==='site')&&type==='change')ctx.render();}return true;
    case 'loq':{if(type!=='input'||!S2.lot)return true;S2.lot.q=el.value;const r=document.getElementById('mag-lores');if(r)r.innerHTML=lotRes(S2.lot,cat());return true;}
    case 'loscan':{if(!S2.lot)return true;S2.lot.scan=el.value;if(type!=='change')return true;const C=cat();const ref=scanRef(C,el.value);if(!ref){if(String(el.value).trim())ctx.toast('Référence inconnue : '+String(el.value).trim()+' — cherche l\'article ci-dessous, ou crée-le');return true;}S2.lot.lignes[ref]=r3((+S2.lot.lignes[ref]||0)+1);S2.lot.labels[ref]=C[ref].label;S2.lot.scan='';ctx.toast('+1 '+C[ref].label);ctx.render();{const i=document.querySelector('#eq-app input[data-xin="mag|loscan"]');if(i)i.focus();}return true;}
  }return false;}
