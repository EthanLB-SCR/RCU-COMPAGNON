// magasin.js — 14/10 nuit : MODULE MAGASIN (dépôt SCR), branché sur l'espace (modules.js). Remplace les QR codes Microsoft Forms, les bons papier de demande,
// la fiche de préparation et la recopie à la main de chaque sortie dans l'Excel du stock.
//   · Demandeur (tout compte actif sauf visiteur) : Moi → Magasin — ses demandes et leur statut ; « Nouvelle demande » pensée téléphone + gants
//     (liste de son métier en tête, recherche dans tout le dépôt, gros boutons + / −, tailles en gros boutons, imputation, date de besoin, note).
//   · Référent magasin (droit « mag.manage ») : Parc → 📦 Magasin — file des demandes, préparation (reliquat sur la même demande), remise
//     → sorties de stock créées toutes seules, refus (motif), stock et « à commander » par fournisseur, réception, inventaire, fiche article, import du pack.
// Registre (reg.js) : magcat (lignes « catalogue » : clé = référence → article ; « config » : listes par métier, dotations), magdem (« <clé personne>|<id> »),
// magmvt (un mouvement par ligne). Hors réseau : la file d'attente du registre (rien à faire de plus).
// DONNÉES RÉELLES : jamais ici. Elles n'entrent que par le pack SCR privé (pack.magasin = {catalogue, formulaires, dotations}) importé par l'administrateur / le référent.
// 19/10 (lot MG, Ethan) : plus de « besoin le » (une case « ⚡ urgent » facultative à la place ; file du magasin triée urgent puis plus ancienne en premier) ;
//   « ✓ Déclarer prête cette partie » (statut prete + partiel, reliquat en suspens sur la même demande, le demandeur prévenu « en partie ») ; reliquats dans
//   « À commander » ; la suite (fiches type par poste, équiper un véhicule, pastilles du planning, nouvel article avec contrôle de doublon, entrées / sorties
//   multiples en lots, bons imprimés) est dans magasin2.js (init2 en bas de ce fichier lui confie les outils d'ici).
import {regAll,regGet,regSet,regLoad,regLoaded,regPending,onReg} from './reg.js';
import {vehAll,vehDe} from './flotte.js';
import {init2,S2,vFiches,vNewArt,vLot,vLotDetail,lotsHTML,xview2,act2,input2,artPhotoHTML,newArtStart} from './magasin2.js'; // 19/10 (lot MG)

const KINDS=['magcat','magdem'];   // chargés pour tous (catalogue + demandes)
const KMVT='magmvt';               // mouvements : chargés pour qui gère le magasin (stock)
const ST={envoyee:['Envoyée','#1c3d6b','#e8f1fc'],preparation:['En préparation','#7a5200','#fff3d6'],prete:['Prête au dépôt','#15673a','#e6f5ec'],remise:['Retirée · reliquat à venir','#5a3fb8','#efeafd'],cloturee:['Terminée','#55524c','#efeee9'],annulee:['Annulée','#55524c','#efeee9'],refusee:['Refusée','#a01212','#fdecec']};
const HST={envoyee:'Envoyée',preparation:'Préparation commencée',prete:'Prête',remise:'Remise',cloturee:'Terminée',annulee:'Annulée',refusee:'Refusée'};
const ACTIFS=['envoyee','preparation','prete','remise'];
// poste de l'appli → métier(s) des listes du pack (champ « pour » des formulaires) ; les listes « tous » (EPI) viennent ensuite, les autres repliées
const METIERS={soudeur:['soudeur'],tuyauteur:['tuyauteur'],manchonneur:['manchonneur'],chauffeur_engin:['pelleur'],chef:['chef'],conducteur:['chef'],activites_specifiques:['soudeur','tuyauteur','manchonneur']};
const MOTIFS_ENT=['Réception fournisseur','Retour chantier','Retour atelier'];
const MOTIFS_INV=['Inventaire','Casse / perte','Erreur de saisie'];
const S={v:'list',cur:null,step:1,q:'',sel:{},open:{},autres:false,draft:null,dkey:'',vehAutre:false,
  seg:'dem',mcur:null,prep:{},refus:null,motif:'',qui:{},art:null,artFrom:'stock',sq:'',sfam:'',rec:{},inv:{},reset:false,fini:false};
const HAY=new WeakMap();
/* ── outils ── */
const esc=s=>String(s==null?'':s).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const norm=s=>String(s||'').normalize('NFD').replace(/[̀-ͯ]/g,'').toLowerCase();
const r3=x=>Math.round((+x||0)*1000)/1000;
const nf=n=>r3(n).toLocaleString('fr-FR',{maximumFractionDigits:2});
const eur=n=>(Math.round((+n||0)*100)/100).toLocaleString('fr-FR',{minimumFractionDigits:2,maximumFractionDigits:2})+' €';
const eurK=n=>(+n||0)>=10000?Math.round((+n||0)/1000).toLocaleString('fr-FR')+' k€':eur(n);
const pad=n=>String(n).padStart(2,'0');
const dIso=d=>d.getFullYear()+'-'+pad(d.getMonth()+1)+'-'+pad(d.getDate());
const auj=()=>dIso(new Date());
const isoNow=()=>new Date().toISOString(); /* 19/10 : plus de demain() — la date de besoin est retirée (Ethan) */
const fDate=s=>{if(!s)return '';const d=new Date(String(s).length<=10?s+'T12:00:00':s);if(isNaN(d))return String(s);return pad(d.getDate())+'/'+pad(d.getMonth()+1)+(d.getFullYear()!==new Date().getFullYear()?'/'+d.getFullYear():'');};
const fDT=s=>{const d=new Date(s);return isNaN(d)?'':fDate(s)+' '+pad(d.getHours())+'h'+pad(d.getMinutes());};
const uid=()=>Date.now().toString(36)+Math.random().toString(36).slice(2,7);
const offline=()=>typeof navigator!=='undefined'&&navigator.onLine===false;
const LS=(k,v)=>{try{if(v===undefined){const s=localStorage.getItem(k);return s?JSON.parse(s):null;}if(v===null)localStorage.removeItem(k);else localStorage.setItem(k,JSON.stringify(v));}catch(e){}return null;};
const nom=(me,ctx)=>ctx&&ctx.nomC?ctx.nomC(me):((me.prenom||'')+' '+(me.nom||'')).trim();
const persNom=(key,ctx)=>{const p=((ctx&&ctx.people)||[]).find(x=>x.id===key);return p?nom(p,ctx):'';};
const canAsk=me=>!!me&&me.active!==false&&me.poste!=='visiteur'&&me.type!=='visiteur';
const isMgr=ctx=>!!ctx.can('mag.manage');
const ownMgr=(me,ctx)=>{try{const acc=me._acc||{poste:me.poste,type:me.type,rights:me.rights,active:me.active};return !!ctx.api.rights(Object.assign({},acc,{admin:false}))['mag.manage'];}catch(e){return false;}}; /* le droit sans le joker administrateur : « À faire » pour le référent, « À savoir » pour l'administrateur */
const RO=ctx=>{if(ctx.viewing()){ctx.toast('👁 Lecture seule : rien n\'est modifié à la place de cette personne.');return true;}return false;};
/* ── données ── */
function cat(){const r=regGet('magcat','catalogue');const o={};if(r)Object.keys(r).forEach(k=>{const a=r[k];if(a&&typeof a==='object'&&!Array.isArray(a)&&a.ref)o[a.ref]=a;});return o;}
const conf=()=>regGet('magcat','config')||{};
const hay=a=>{let h=HAY.get(a);if(h===undefined){h=norm([a.ref,a.label,a.famille,a.fournisseur,a.marque,a.refFournisseur,a.emplacement,...(Array.isArray(a.aliases)?a.aliases:[])].join(' '));HAY.set(a,h);}return h;};
// stock = stock de départ (au stockAt) + entrées − sorties ± écarts d'inventaire (mouvements datés après stockAt)
function stocks(C){const s={};Object.values(C).forEach(a=>{s[a.ref]=+a.stockInit||0;});
  regAll(KMVT).forEach(m=>{const a=C[m.ref];if(!a||!m.at)return;if(a.stockAt&&String(m.at)<String(a.stockAt))return;const q=+m.qte||0;s[m.ref]=(s[m.ref]||0)+(m.type==='entree'?q:m.type==='sortie'?-q:m.type==='ajust'?q:0);});
  Object.keys(s).forEach(k=>{s[k]=r3(s[k]);});return s;}
const aCmd=(a,st)=>a&&a.actif!==false&&+a.tampon>0?Math.max(0,r3(+a.tampon-(+st||0))):0;
const dems=()=>regAll('magdem').filter(d=>d&&d.byKey&&d.statut);
const servi=l=>+l.remis||0;
const reste=l=>Math.max(0,r3((+l.qte||0)-servi(l)));            // pas encore remis
const relq=d=>r3((d.lignes||[]).reduce((x,l)=>x+reste(l),0));
const nonPrep=l=>Math.max(0,r3((+l.qte||0)-Math.max(+l.prep||0,servi(l)))); // ni préparé ni remis (reliquat d'une préparation partielle)
const enAttente=id=>regPending().some(w=>w.kind==='magdem'&&w.id===id);
const byAt=(a,b)=>(b.urgent?1:0)-(a.urgent?1:0)||String(a.at).localeCompare(String(b.at)); /* 19/10 : file du magasin = les urgentes, puis la plus ancienne en premier (plus de date de besoin ; celle des anciennes demandes est ignorée) */
const reliquatOf=d=>(d.lignes||[]).filter(l=>nonPrep(l)>0).map(l=>({ref:l.ref||null,label:l.label||l.ref,qte:nonPrep(l)})); /* 19/10 : ce qui reste en suspens sur une demande prête en partie / retirée */
const stLab=d=>{const s=ST[d.statut]||[d.statut,'#55524c','#efeee9'];return `<span class="mag-st" style="color:${s[1]};background:${s[2]}">${esc(s[0])}</span>`;};
const impLab=i=>!i?'—':i.type==='chantier'?'🏗 '+(i.label||i.id):i.type==='vehicule'?'🚐 '+(i.label||i.id):'📦 Dépôt';
const resume=d=>{const n=(d.lignes||[]).length;return (n?n+' article'+(n>1?'s':''):'demande libre')+' · '+impLab(d.imputation);};
// rechargement : à l'entrée dans les vues, au plus toutes les 20 s (et tout de suite à la connexion) ; les mouvements seulement pour qui gère le magasin
let LAST=0,LASTC=null,LASTM=null,LCTX=null,LASTCAT=0;
function ensure(ctx,force){LCTX=ctx;const st=ctx.api&&ctx.api.state;const cloud=!!(st&&st.cloudUser);const mgr=isMgr(ctx);const t=Date.now();
  if(!force&&cloud===LASTC&&mgr===LASTM&&t-LAST<20000)return;const same=cloud===LASTC&&mgr===LASTM;LAST=t;LASTC=cloud;LASTM=mgr;
  const catToo=force||!same||t-LASTCAT>600000||!regGet('magcat','catalogue');if(catToo)LASTCAT=t; /* pas encore de catalogue sur l'appareil : on le redemande (20 s au plus) */ /* 14/10 nuit (audit) : le catalogue (≈ 200 Ko) n'est relu qu'à la 1re ouverture, sur ↻ ou toutes les 10 min ; demandes / mouvements toutes les 20 s au plus (le rafraîchissement léger d'app.js fait le reste) */
  regLoad((catToo?['magcat']:[]).concat(['magdem'],mgr?[KMVT]:[])).catch(()=>{});}
// données reçues du serveur pendant que le référent est sur Parc → Magasin : on redessine (l'accueil et Moi sont déjà redessinés par app.js) — sauf en pleine saisie
onReg(kind=>{if(!LCTX||(KINDS.indexOf(kind)<0&&kind!==KMVT))return;try{const st=LCTX.api.state;if(!st||st.screen!=='home'||st.homeTab!=='parc'||!document.querySelector('#eq-app .mag-root'))return;
  const a=document.activeElement;if(a&&a.closest&&a.closest('#eq-app .mag-root')&&/^(INPUT|TEXTAREA|SELECT)$/.test(a.tagName))return;LCTX.render();}catch(e){}});
/* ── brouillon de la demande (gardé sur le téléphone) ── */
function draft(me){if(!S.draft||S.dkey!==me.id){S.dkey=me.id;const o=LS('trace:mag:draft:'+me.id)||{};S.draft={lignes:o.lignes&&typeof o.lignes==='object'?o.lignes:{},labels:o.labels&&typeof o.labels==='object'?o.labels:{},imp:o.imp||LS('trace:mag:imp:'+me.id)||null,urgent:!!o.urgent,note:o.note||''};} /* 19/10 : plus de date de besoin ; « urgent » facultatif */
  return S.draft;}
const saveDraft=me=>LS('trace:mag:draft:'+me.id,S.draft);
const nbArt=D=>Object.keys(D.lignes).filter(r=>+D.lignes[r]>0).length;
/* ── CSS du module (injecté une fois) ── */
const CSS=`.mag-root{min-width:0}
.mag-root .mag-big{width:100%;min-height:56px;font-size:16px;font-weight:700;margin:4px 0 10px;white-space:normal}
.mag-root .btn{white-space:normal}
.mag-head{display:flex;align-items:center;gap:8px}.mag-head h2{flex:1;min-width:0}
.mag-root .mag-rf{flex:none;min-height:40px;padding:0 12px}
.mag-li{display:flex;align-items:center;gap:10px;padding:10px 0;border-top:1px solid var(--line);flex-wrap:wrap}
.mag-li:first-child{border-top:0}
.mag-lt{flex:1 1 150px;min-width:0}
.mag-lt b{display:block;font-size:15px;overflow-wrap:anywhere}
.mag-lt small{display:block;font-size:12.5px;color:var(--ink2);overflow-wrap:anywhere;margin-top:1px}
.mag-lt small.warn{color:#9a3410}
.mag-step{display:flex;align-items:center;gap:6px;flex:none;margin-left:auto}
.mag-root .mag-step button{width:52px;height:52px;min-height:52px;border-radius:14px;border:2px solid var(--line);background:var(--surface);font-size:26px;font-weight:800;display:grid;place-items:center;text-align:center;padding:0;line-height:1}
.mag-root .mag-step button.pl{background:var(--ink);color:#fff;border-color:var(--ink)}
.mag-step .n{min-width:34px;text-align:center;font-size:20px;font-weight:800}
.mag-step .n.z{color:var(--muted);font-weight:600}
.mag-szs{display:flex;flex-wrap:wrap;gap:8px;width:100%}
.mag-root .mag-sz{min-width:58px;min-height:52px;padding:0 12px;border-radius:12px;border:2px solid var(--line);background:var(--surface);font-size:17px;font-weight:800;text-align:center;display:inline-flex;align-items:center;justify-content:center;gap:4px}
.mag-root .mag-sz.has{background:#eef4fc;border-color:#9ec5f4}
.mag-root .mag-sz.on{border-color:var(--ink);box-shadow:0 0 0 2px var(--ink)}
.mag-sz i{font-style:normal;font-size:12.5px;font-weight:700;color:#1c3d6b}
.mag-selrow{display:flex;align-items:center;gap:10px;width:100%;padding-top:6px}
.mag-selrow>span{font-weight:700;font-size:15px}
.mag-root .mag-tg{display:flex;align-items:center;gap:8px;width:100%;min-height:52px;padding:8px 12px;border-radius:12px;border:1px solid var(--line);background:var(--surface);font-weight:700;font-size:15px;margin:6px 0 0;text-align:left}
.mag-tg>span:first-child{flex:1 1 auto;min-width:0;overflow-wrap:anywhere}
.mag-tg .mag-tgn{flex:0 1 auto;min-width:0;margin-left:auto;font-size:12.5px;font-weight:600;color:var(--ink2);text-align:right;overflow-wrap:anywhere}
.mag-sec{padding:0 4px}
.mag-lh{display:flex;align-items:baseline;gap:8px;margin:16px 0 4px;flex-wrap:wrap}.mag-lh b{font-size:16px}.mag-lh span{font-size:12px;color:var(--muted)}
.mag-bar{position:sticky;bottom:8px;z-index:5;display:flex;align-items:center;gap:10px;justify-content:space-between;background:var(--surface);border:1px solid var(--line);border-radius:14px;padding:8px 10px;margin-top:12px;box-shadow:0 -4px 18px rgba(0,0,0,.10)}
.mag-root .mag-bar .btn{min-height:52px;font-size:16px;font-weight:700;padding:0 18px;flex:none}
.mag-bn{font-size:15px}.mag-bn b{font-size:20px}
.mag-st{display:inline-block;font-size:12px;font-weight:700;border-radius:999px;padding:2px 9px;white-space:nowrap;vertical-align:middle}
.mag-seg{display:flex;flex-wrap:wrap;gap:8px;margin:6px 0}
.mag-root .mag-sgb{flex:1 1 30%;min-height:52px;padding:6px 10px;border-radius:12px;border:2px solid var(--line);background:var(--surface);font-size:15px;font-weight:700;text-align:center;justify-content:center;display:inline-flex;align-items:center}
.mag-root .mag-sgb.on{border-color:var(--ink);background:var(--ink);color:#fff}
.mag-root .mag-seg .f{flex:1 1 140px;margin:0}
.mag-root .mag-ar{display:flex;align-items:center;gap:10px;width:100%;padding:10px 4px;border:0;border-top:1px solid var(--line);background:none;text-align:left;min-height:56px}
.mag-ar:first-child{border-top:0}.mag-ar.off{opacity:.55}
.mag-sv{flex:none;text-align:right;max-width:46%}.mag-sv b{display:block;font-size:18px}.mag-sv small{display:block;font-size:11.5px;color:var(--ink2)}
.mag-sv.warn b{color:#b8560f}.mag-sv.bad b{color:var(--bad)}
.mag-mv{display:flex;align-items:center;gap:10px;padding:8px 0;border-top:1px solid var(--line)}.mag-mv:first-child{border-top:0}
.mag-mt{flex:none;font-size:11.5px;font-weight:700;border-radius:6px;padding:2px 6px;background:#efeee9;white-space:nowrap}
.mag-mt.sortie{background:#fdebe3;color:#9a3410}.mag-mt.entree{background:#e6f5ec;color:#15673a}.mag-mt.ajust{background:#efeafd;color:#5a3fb8}
.mag-mq{flex:none;font-size:16px}
.mag-note{background:var(--plane);border-radius:10px;padding:8px 10px;margin:8px 0;font-size:13.5px;overflow-wrap:anywhere;white-space:pre-wrap}
.mag-histo{margin-top:10px;font-size:12.5px;color:var(--ink2)}.mag-histo div{padding:2px 0;overflow-wrap:anywhere}
.mag-qv{flex:none;font-size:18px;font-weight:800;min-width:40px;text-align:right}
.mag-pin{flex:none;display:flex;flex-direction:column;align-items:flex-end;gap:2px;margin-left:auto}
.mag-pin small{font-size:11.5px;color:var(--ink2)}
.mag-root .mag-pin input{width:96px;min-height:48px;font-size:20px;font-weight:700;text-align:center;padding:4px;margin:0}
.mag-tools{display:flex;flex-wrap:wrap;gap:8px;margin:8px 0}
.mag-root .mag-tools .f{flex:1 1 180px;margin:0;width:auto;min-width:0}
.mag-grid{display:grid;grid-template-columns:1fr;gap:0 12px}
@container eq (min-width:640px){.mag-grid{grid-template-columns:1fr 1fr}}
.mag-chk{display:flex;align-items:center;gap:10px;font-size:14px;margin:12px 0 4px}.mag-root .mag-chk input{width:24px;height:24px;min-height:24px}
.mag-vide{display:block;padding:6px 2px 10px}
.mag-det summary{cursor:pointer;font-weight:700;padding:10px 2px;min-height:44px}
.mag-acts{display:flex;flex-wrap:wrap;gap:8px;margin-top:12px}.mag-root .mag-acts .btn{flex:1 1 160px;min-height:52px;font-size:15px;font-weight:700}
.mag-root .mag-row .tx small .mag-st{margin-top:3px}
.mag-root .mag-tg.on{border-color:#b8560f;background:#fff3d6}
.mag-kp{margin:8px 0}`;
function css(){if(typeof document==='undefined'||document.getElementById('mag-css'))return;const s=document.createElement('style');s.id='mag-css';s.textContent=CSS;document.head.appendChild(s);}
const wrap=h=>`<div class="mag-root">${h}</div>`;
const refreshBtn='<button class="btn mag-rf" data-act="x" data-v="mag|rf" title="Recharger depuis le serveur">↻</button>';
// le bouton + porte le libellé affiché à côté (liste du métier, taille, catalogue) : c'est lui qui part dans la demande
const stepHTML=(ref,D,lab)=>{const q=+D.lignes[ref]||0;return `<div class="mag-step"><button class="mo" data-act="x" data-v="mag|dec|${esc(ref)}" aria-label="Moins" ${q?'':'disabled'}>−</button><span class="n${q?'':' z'}">${nf(q)}</span><button class="pl" data-act="x" data-v="mag|inc|${esc(ref)}" data-l="${esc(lab||'')}" aria-label="Plus">+</button></div>`;};

/* ══════════ DEMANDEUR : Moi → Magasin ══════════ */
function vDem(me,ctx){css();ensure(ctx);if(!canAsk(me))return wrap(`<h2 class="vt">Magasin</h2><div class="card"><div class="eq-s">Les demandes au dépôt sont réservées aux comptes SCR.</div></div>`);
  if(S.v==='new')return wrap(vNew(me,ctx));
  if(S.v==='fiches')return wrap(vFiches(me,ctx,{moi:true})); /* 19/10 : fiches type du matériel par poste, lisibles par tous */
  if(S.v==='fiche'){const d=regGet('magdem',S.cur);if(d&&(d.byKey===me.id||isMgr(ctx)))return wrap(vFiche(me,ctx,d));S.v='list';}
  return wrap(vListe(me,ctx));}
const partTxt=d=>{const n=(d.reliquat||reliquatOf(d)).length;return n?'en partie : '+n+' article'+(n>1?'s':'')+' manque'+(n>1?'nt':'')+', reliquat à venir'+(d.reliquatAttendu?' (attendu le '+fDate(d.reliquatAttendu)+')':''):'';}; /* 19/10 : prête en partie */
function rowDem(d,mgr){const pend=enAttente(d.id);
  return `<button class="ac-row mag-row" data-act="x" data-v="mag|${mgr?'mopen':'open'}|${esc(d.id)}"><span class="ic" style="background:${(ST[d.statut]||[])[2]||'#efeee9'}">📦</span><span class="tx"><b>${mgr?esc(d.byName||'?')+' · ':''}${esc(resume(d))}</b><small>${d.direct?'remis le '+esc(fDT(d.retireAt||d.at))+' sans demande':(mgr?'demandée ':'')+esc(fDT(d.at))}${d.urgent?' · ⚡ urgent':''}${d.fiche?' · fiche type':''}${pend?' · ⏳ en attente d\'envoi':''}</small><small>${stLab(d)}${d.statut==='remise'&&relq(d)?' reliquat '+nf(relq(d)):''}${d.statut==='prete'&&(d.partiel||(d.lignes||[]).some(nonPrep))?' en partie':''}</small></span><span class="chev">›</span></button>`;}
function vListe(me,ctx){const L=dems().filter(d=>d.byKey===me.id).sort((a,b)=>String(b.at).localeCompare(String(a.at)));
  const pretes=L.filter(d=>d.statut==='prete'),cours=L.filter(d=>ACTIFS.includes(d.statut)&&d.statut!=='prete'),fini=L.filter(d=>!ACTIFS.includes(d.statut));const nCat=Object.keys(cat()).length;
  return `<div class="mag-head"><h2 class="vt">Magasin <span class="hint">· mes demandes au dépôt</span></h2>${refreshBtn}</div>
    ${nCat?'':`<div class="warnbox">Le catalogue du dépôt n'est pas encore chargé (pack magasin à importer). Tu peux déjà écrire ta demande en texte libre.</div>`}
    <button class="btn primary mag-big" data-act="x" data-v="mag|new">＋ Nouvelle demande</button>
    ${pretes.length?`<div class="ac-h"><b>✅ Prêtes à retirer</b><span>${pretes.length}</span></div>${pretes.map(d=>rowDem(d)).join('')}`:''}
    <div class="ac-h"><b>En cours</b><span>${cours.length||''}</span></div>${cours.map(d=>rowDem(d)).join('')||'<div class="eq-s mag-vide">Aucune demande en cours.</div>'}
    ${fini.length?`<details class="mag-det"><summary>Terminées · annulées · refusées (${fini.length})</summary>${fini.slice(0,30).map(d=>rowDem(d)).join('')}</details>`:''}
    <button class="btn mag-big" style="min-height:48px;font-weight:600" data-act="x" data-v="mag|fiches|">🧰 Fiches type du matériel par poste</button>
    <p class="hint">Hors réseau : la demande reste sur le téléphone et part toute seule dès que le réseau revient.</p>`;}
function detLigne(d,l){const u=[];const pr=Math.max(0,r3((+l.prep||0)-servi(l)));
  if(d.statut==='prete'&&pr)u.push('prêt : '+nf(pr));if(servi(l))u.push('retiré : '+nf(servi(l)));
  if(['prete','remise'].includes(d.statut)&&nonPrep(l))u.push('reliquat : '+nf(nonPrep(l)));
  if(!u.length&&l.ref&&!/^X-/.test(l.ref))u.push(esc(l.ref));return u.join(' · ');}
const histoHTML=d=>(d.histo||[]).length?`<div class="mag-histo">${d.histo.map(h=>`<div>${esc(fDT(h.at))} · <b>${esc(HST[h.statut]||h.statut)}</b>${h.by?' · '+esc(h.by):''}${h.note?' — '+esc(h.note):''}</div>`).join('')}</div>`:'';
function vFiche(me,ctx,d){const own=d.byKey===me.id;
  const lignes=(d.lignes||[]).map(l=>`<div class="mag-li"><div class="mag-lt"><b>${esc(l.label||l.ref)}</b><small>${detLigne(d,l)}</small></div><div class="mag-qv">${nf(l.qte)}</div></div>`).join('');
  return `<div class="mag-head"><button class="ac-back" data-act="x" data-v="mag|list">‹ Mes demandes</button><span style="flex:1"></span>${refreshBtn}</div>
    <div class="card"><h3>${d.direct?'Remis par le magasin le '+esc(fDate(d.retireAt||d.at)):'Demande du '+esc(fDate(d.at))} ${stLab(d)}</h3>
    <div class="eq-s">${esc(impLab(d.imputation))}${d.urgent?' · ⚡ urgent':''}${d.fiche?' · depuis la fiche type « '+esc(d.fiche.titre||'')+' »'+(d.creePar&&d.creePar!==d.byName?' par '+esc(d.creePar):''):''}${d.direct?' · sortie de stock sans demande (bon n° '+esc(d.lot||'')+')':''}</div>
    ${enAttente(d.id)?`<div class="warnbox">⏳ Pas encore reçue par le serveur : elle part toute seule (sans réseau, dès son retour).</div>`:''}
    ${d.statut==='prete'?(d.partiel||(d.lignes||[]).some(nonPrep)?`<div class="okbox">✅ Prête au dépôt ${esc(partTxt(d))}. Tu peux passer retirer ce qui est prêt.</div>`:'<div class="okbox">✅ Prête au dépôt : tu peux passer la retirer.</div>'):''}
    ${d.statut==='remise'&&relq(d)?`<div class="okbox">Retirée en partie (${esc(d.retirePar||'')}). Le reliquat reste sur cette demande : tu seras prévenu quand il sera prêt.</div>`:''}
    ${d.statut==='refusee'?`<div class="warnbox">Refusée : ${esc(d.motifRefus||'')}</div>`:''}
    <div class="mag-lines">${lignes||'<div class="eq-s">Aucun article (demande libre).</div>'}</div>
    ${d.note?`<div class="mag-note">📝 ${esc(d.note)}</div>`:''}
    ${histoHTML(d)}
    ${own&&d.statut==='envoyee'?`<button class="btn danger mag-big" style="margin-top:12px" data-act="x" data-v="mag|cancel|${esc(d.id)}">Annuler la demande</button><div class="hint">Possible tant que le magasin n'a pas commencé la préparation.</div>`:''}</div>`;}
/* nouvelle demande — étape 1 : les articles (ma liste, recherche) ; étape 2 : pour quoi, quand, note, envoyer */
function vNew(me,ctx){const D=draft(me);return S.step===2?vNew2(me,ctx,D):vNew1(me,ctx,D);}
function listesPour(me){const mine=METIERS[me.poste]||[];const L=(conf().listes||[]).filter(x=>x&&Array.isArray(x.lignes)&&x.lignes.length);
  const rang=x=>{const p=x.pour||[];if(p.some(m=>mine.includes(m)))return 0;if(p.includes('tous'))return 1;return 2;};
  return L.map((x,i)=>Object.assign({},x,{rang:rang(x),i})).sort((a,b)=>a.rang-b.rang||a.i-b.i);}
const over=(l,q)=>l.qteMax&&q>l.qteMax?`<small class="warn">⚠ au-delà de la dotation (${nf(l.qteMax)}) : dis pourquoi dans la note</small>`:'';
function ligneHTML(l,key,D,C){
  if(Array.isArray(l.variantes)&&l.variantes.length){const V=l.variantes.filter(v=>!(C[v.ref]&&C[v.ref].actif===false));if(!V.length)return '';
    const lv=v=>l.label+' — '+v.libelle;const sel=V.some(v=>v.ref===S.sel[key])?S.sel[key]:null;const tot=V.reduce((x,v)=>x+(+D.lignes[v.ref]||0),0);
    return `<div class="mag-li"><div class="mag-lt"><b>${esc(l.label)}</b><small>${esc(l.choix||'taille')} : touche pour choisir${tot?' · '+nf(tot)+' choisi'+(tot>1?'s':''):''}</small>${over(l,tot)}</div>
      <div class="mag-szs">${V.map(v=>{const q=+D.lignes[v.ref]||0;return `<button class="mag-sz${sel===v.ref?' on':''}${q?' has':''}" data-act="x" data-v="mag|sz|${esc(key)}|${esc(v.ref)}" data-l="${esc(lv(v))}">${esc(v.libelle)}${q?`<i>×${nf(q)}</i>`:''}</button>`;}).join('')}</div>
      ${sel?`<div class="mag-selrow"><span>${esc((V.find(v=>v.ref===sel)||{}).libelle)}</span>${stepHTML(sel,D,lv(V.find(v=>v.ref===sel)))}</div>`:''}</div>`;}
  if(!l.ref||(C[l.ref]&&C[l.ref].actif===false))return '';const a=C[l.ref];const q=+D.lignes[l.ref]||0;
  return `<div class="mag-li"><div class="mag-lt"><b>${esc(l.label)}</b><small>${esc(l.unite||(a&&a.unite)||'u')}${l.choix?' · précise '+esc(l.choix)+' dans la note':''}</small>${over(l,q)}</div>${stepHTML(l.ref,D,l.label)}</div>`;}
function sectionsHTML(x,D,C){const secs=[];x.lignes.forEach((l,j)=>{const s=l.section||'';let g=secs.find(y=>y.s===s);if(!g){g={s,L:[]};secs.push(g);}g.L.push([l,j]);});
  return secs.map((g,k)=>{const key=x.id+'§'+k;const isOpen=S.open[key]!==undefined?S.open[key]:(x.rang===0&&k===0)||(x.rang===1&&x.first&&k===0);const refs=g.L.flatMap(([l])=>l.variantes&&l.variantes.length?l.variantes.map(v=>v.ref):[l.ref]);const n=refs.filter(r=>r&&+D.lignes[r]>0).length;
    return `<button class="mag-tg" data-act="x" data-v="mag|tog|${esc(key)}"><span>${isOpen?'▾':'▸'} ${esc(g.s||x.titre)}</span><span class="mag-tgn">${g.L.length} article${g.L.length>1?'s':''}${n?' · <b>'+n+' choisi'+(n>1?'s':'')+'</b>':''}</span></button>
      ${isOpen?`<div class="mag-sec">${g.L.map(([l,j])=>ligneHTML(l,x.id+':'+j,D,C)).join('')}</div>`:''}`;}).join('');}
function resHTML(D,C){const q=norm(S.q).trim();if(q.length<2)return '';const W=q.split(/\s+/);
  const hits=Object.values(C).filter(a=>a.actif!==false&&W.every(w=>hay(a).includes(w))).sort((a,b)=>String(a.label).localeCompare(String(b.label))).slice(0,40);
  return `<div class="card">${hits.length?hits.map(a=>`<div class="mag-li"><div class="mag-lt"><b>${esc(a.label)}</b><small>${esc(a.famille||'')}${a.unite?' · '+esc(a.unite):''}</small></div>${stepHTML(a.ref,D,a.label)}</div>`).join(''):'<div class="eq-s">Rien trouvé : essaie un autre mot, ou écris-le dans la note à l\'étape suivante.</div>'}</div>`;}
function vNew1(me,ctx,D){const C=cat();const L=listesPour(me);const n=nbArt(D);
  const mine=L.filter(x=>x.rang<2),autres=L.filter(x=>x.rang===2);if(mine.length&&!mine.some(x=>x.rang===0))mine[0].first=true;
  const bloc=x=>`<div class="mag-lh"><b>📋 ${esc(x.titre)}</b><span>${x.rang===0?'ta liste':x.rang===1?'pour tous':'autre métier'}</span></div>${sectionsHTML(x,D,C)}`;
  return `<button class="ac-back" data-act="x" data-v="mag|list">‹ Mes demandes</button>
    <h2 class="vt">Nouvelle demande</h2>
    ${offline()?`<div class="warnbox">📵 Pas de réseau : ta demande sera gardée sur le téléphone et partira toute seule au retour du réseau.</div>`:''}
    <input class="f" type="search" enterkeyhint="search" autocomplete="off" placeholder="🔍 Chercher dans tout le dépôt" data-xin="mag|q" value="${esc(S.q)}">
    <div id="mag-res">${resHTML(D,C)}</div>
    ${mine.map(bloc).join('')}
    ${autres.length?`<button class="mag-tg" data-act="x" data-v="mag|autres"><span>${S.autres?'▾':'▸'} Autres listes</span><span class="mag-tgn">${autres.map(x=>esc(x.titre)).join(' · ')}</span></button>${S.autres?autres.map(bloc).join(''):''}`:''}
    ${L.length?'':`<div class="card"><div class="eq-s">${Object.keys(C).length?'Pas de liste par métier dans le pack : cherche l\'article ci-dessus.':'Pas encore de catalogue : passe à « Suivant » et écris ta demande dans la note.'}</div></div>`}
    <div class="mag-bar"><span class="mag-bn"><b>${n}</b> article${n>1?'s':''}</span><button class="btn primary" data-act="x" data-v="mag|step|2">Suivant ›</button></div>`;}
function vehHTML(me,imp){const all=vehAll();const mine=vehDe(me._acc);const others=all.filter(v=>!mine.includes(v));const known=all.some(v=>v.immat===imp.id);
  const opt=v=>`<option value="${esc(v.immat)}" ${imp.id===v.immat?'selected':''}>${esc(v.immat)}${v.marque?' · '+esc(v.marque)+' '+esc(v.modele||''):''}</option>`;const autre=!all.length||S.vehAutre||(imp.id&&!known);
  return (all.length?`<select class="f" data-xin="mag|impVeh"><option value="">— choisis le véhicule —</option>${mine.length?`<optgroup label="Mon véhicule">${mine.map(opt).join('')}</optgroup>`:''}${others.length?`<optgroup label="Parc">${others.map(opt).join('')}</optgroup>`:''}<option value="__autre" ${autre?'selected':''}>Autre : je saisis l'immatriculation</option></select>`:'')
    +(autre?`<input class="f" data-xin="mag|impImmat" placeholder="Immatriculation (AA-123-AA)" autocapitalize="characters" value="${esc(known?'':imp.id||'')}">`:'');}
function vNew2(me,ctx,D){const C=cat();const refs=Object.keys(D.lignes).filter(r=>+D.lignes[r]>0);const imp=D.imp||{};const sites=ctx.sites||[];
  if(imp.type==='vehicule'&&!regLoaded('vehicule'))regLoad(['vehicule']).catch(()=>{});
  return `<button class="ac-back" data-act="x" data-v="mag|step|1">‹ Articles</button>
    <h2 class="vt">Ma demande</h2>
    <div class="card">${refs.length?refs.map(r=>`<div class="mag-li"><div class="mag-lt"><b>${esc(D.labels[r]||(C[r]&&C[r].label)||r)}</b><small>${esc((C[r]&&C[r].unite)||'')}</small></div>${stepHTML(r,D,D.labels[r])}</div>`).join(''):`<div class="eq-s">Aucun article choisi : écris ce qu'il te faut dans la note.</div>`}</div>
    <div class="card"><h3>Pour quoi ?</h3>
      <div class="mag-seg">${[['chantier','🏗 Chantier'],['vehicule','🚐 Véhicule'],['depot','📦 Dépôt']].map(([k,t])=>`<button class="mag-sgb${imp.type===k?' on':''}" data-act="x" data-v="mag|imp|${k}">${t}</button>`).join('')}</div>
      ${imp.type==='chantier'?`<select class="f" data-xin="mag|impSite"><option value="">— choisis le chantier —</option>${sites.map(s=>`<option value="${esc(s.id)}" ${imp.id===s.id?'selected':''}>${esc(s.name)}</option>`).join('')}${imp.id&&!sites.some(s=>s.id===imp.id)?`<option value="${esc(imp.id)}" selected>${esc(imp.label||imp.id)}</option>`:''}</select>`:''}
      ${imp.type==='vehicule'?vehHTML(me,imp):''}
      ${imp.type==='depot'?'<div class="hint">Pour le dépôt, l\'atelier ou un usage commun.</div>':''}
      ${imp.type?'':'<div class="hint">Touche un des trois : le magasin sait à qui imputer la sortie.</div>'}
      <button class="mag-tg${D.urgent?' on':''}" data-act="x" data-v="mag|urgent" aria-pressed="${D.urgent?'true':'false'}"><span>⚡ C'est urgent</span><span class="mag-tgn">${D.urgent?'oui : le magasin la voit en premier':'facultatif'}</span></button>
      <label class="f">Note pour le magasin</label>
      <textarea class="f" rows="3" data-xin="mag|note" placeholder="Taille, précision, article pas dans la liste…">${esc(D.note||'')}</textarea></div>
    <button class="btn primary mag-big" data-act="x" data-v="mag|send">📤 Envoyer la demande</button>
    <p class="hint">${offline()?'📵 Pas de réseau : la demande est gardée sur le téléphone et partira toute seule.':'Hors réseau, la demande est gardée sur le téléphone et part toute seule au retour du réseau.'}</p>`;}
function send(me,ctx){const D=draft(me);const refs=Object.keys(D.lignes).filter(r=>+D.lignes[r]>0);const note=String(D.note||'').trim();
  if(!refs.length&&!note){ctx.toast('Choisis au moins un article, ou écris ta demande dans la note.');return;}
  const imp=D.imp;if(!imp||!imp.type||(imp.type!=='depot'&&!String(imp.id||'').trim())){ctx.toast(!imp||!imp.type?'Dis pour quoi : chantier, véhicule ou dépôt.':imp.type==='chantier'?'Choisis le chantier.':'Choisis le véhicule.');S.step=2;ctx.render();return;}
  const C=cat();const at=isoNow();const id=me.id+'|'+uid();const by=nom(me,ctx);
  const lignes=refs.map(r=>({ref:r,label:D.labels[r]||(C[r]&&C[r].label)||r,qte:r3(D.lignes[r]),prep:0,remis:0}));
  const imputation=imp.type==='depot'?{type:'depot',id:'depot',label:'Dépôt'}:{type:imp.type,id:String(imp.id).trim(),label:String(imp.label||imp.id).trim()};
  regSet('magdem',id,Object.assign({byKey:me.id,byName:by,at,statut:'envoyee',lignes,imputation,note,histo:[{at,by,statut:'envoyee'}]},D.urgent?{urgent:true}:{}),{quiet:true}); /* 19/10 : plus de besoinLe ; urgent facultatif */
  LS('trace:mag:imp:'+me.id,imputation);S.draft=null;LS('trace:mag:draft:'+me.id,null);S.v='list';S.cur=null;S.step=1;S.q='';S.sel={};S.vehAutre=false;
  ctx.toast(offline()?'✓ Demande gardée sur le téléphone : elle partira au retour du réseau':'✓ Demande envoyée au magasin');ctx.render();}
async function cancel(id,me,ctx){let d=regGet('magdem',id);if(!d||d.byKey!==me.id)return;
  try{await regLoad(['magdem']);}catch(e){} /* le statut du serveur d'abord : le magasin a peut-être commencé */d=regGet('magdem',id);
  if(!d||d.statut!=='envoyee'){ctx.toast('Trop tard : le magasin a commencé la préparation. Vois avec le référent magasin.');ctx.render();return;}
  if(typeof confirm==='function'&&!confirm('Annuler cette demande ?'))return;const at=isoNow();
  regSet('magdem',id,{statut:'annulee',histo:(d.histo||[]).concat([{at,by:nom(me,ctx),statut:'annulee'}])},{quiet:true});ctx.toast('Demande annulée');ctx.render();}

/* ══════════ RÉFÉRENT : Parc → 📦 Magasin ══════════ */
function vGestion(me,ctx,bar){css();ensure(ctx);
  if(!isMgr(ctx)){S.seg='fiches';return wrap(`<div class="mag-head"><h2 class="vt">Magasin <span class="hint">· dépôt</span></h2>${refreshBtn}</div>${bar||''}<div class="eq-filtres"><button class="chip active" data-act="x" data-v="mag|mseg|fiches">🧰 Fiches type</button></div>${vFiches(me,ctx,{})}<p class="hint">La gestion du magasin (demandes, stock, réceptions) est réservée au droit « Magasin » (référent magasin, administrateur). Tes demandes au dépôt sont dans Moi → Magasin.</p>`);} /* 19/10 : les fiches type se lisent sans le droit « Magasin » (chef, conducteur…) */
  const D=dems();const C=cat();const st=stocks(C);const nT=D.filter(d=>d.statut==='envoyee'||d.statut==='preparation').length+D.filter(d=>d.statut==='remise'&&relq(d)>0).length;const nC=Object.values(C).filter(a=>aCmd(a,st[a.ref])>0).length+reliquats(D).length;
  const segs=[['dem','📋 Demandes',nT],['fiches','🧰 Fiches type',0],['stock','📦 Stock',0],['cmd','🛒 À commander',nC],['mvt','↕ Mouvements',0],['cat','⚙ Catalogue',0]];
  let body='';if(S.seg==='fiches')body=vFiches(me,ctx,{});else if(S.seg==='stock')body=S2.newArt?vNewArt(me,ctx):S.art&&C[S.art]?vArt(me,ctx,C[S.art],st):vStock(C,st);else if(S.seg==='cmd')body=S.art&&C[S.art]?vArt(me,ctx,C[S.art],st):vCmd(C,st,D);else if(S.seg==='mvt')body=S2.lot?vLot(me,ctx):S2.lotId?vLotDetail(S2.lotId,me,ctx):vMvt(C);else if(S.seg==='cat')body=vCat(C);
  else{const d=S.mcur?regGet('magdem',S.mcur):null;body=d?vDemGest(me,ctx,d,C,st):vFile(D);}
  return wrap(`<div class="mag-head"><h2 class="vt">Magasin <span class="hint">· dépôt</span></h2>${refreshBtn}</div>${bar||''}
    <div class="eq-filtres">${segs.map(([k,t,n])=>`<button class="chip${S.seg===k?' active':''}" data-act="x" data-v="mag|mseg|${k}">${t}${n?` <span class="eq-badge">${n}</span>`:''}</button>`).join('')}</div>
    ${Object.keys(C).length||S.seg==='cat'?'':`<div class="warnbox">Catalogue vide : importe le pack magasin (⚙ Catalogue).</div>`}${body}`);}
// 19/10 : reliquats en suspens (demandes prêtes en partie ou retirées en partie) → par article, pour « À commander »
function reliquats(D){const R={};D.filter(d=>d.statut==='prete'||d.statut==='remise').forEach(d=>reliquatOf(d).forEach(l=>{const k=l.ref||'?'+l.label;const o=R[k]||(R[k]={ref:l.ref,label:l.label,qte:0,dems:[]});o.qte=r3(o.qte+l.qte);o.dems.push(d);}));return Object.values(R);}
function vFile(D){const by=s=>D.filter(d=>d.statut===s).sort(byAt);const env=by('envoyee'),prep=by('preparation'),pret=by('prete'),rel=by('remise').filter(d=>relq(d)>0);
  const fin=D.filter(d=>!ACTIFS.includes(d.statut)||(d.statut==='remise'&&!relq(d))).sort((a,b)=>String(b.at).localeCompare(String(a.at)));
  const sec=(t,L,vide)=>`<div class="ac-h"><b>${t}</b><span>${L.length||''}</span></div>${L.map(d=>rowDem(d,true)).join('')||`<div class="eq-s mag-vide">${vide}</div>`}`;
  return `<div class="eq-kpis mag-kp"><div class="eq-kpi ${env.length?'warn':'ok'}"><b>${env.length}</b><small>à préparer</small></div><div class="eq-kpi"><b>${prep.length}</b><small>en préparation</small></div><div class="eq-kpi ${pret.length?'ok':''}"><b>${pret.length}</b><small>prêtes à remettre</small></div><div class="eq-kpi"><b>${rel.length}</b><small>reliquats</small></div></div>
    ${sec('À préparer',env,'Rien de nouveau.')}${prep.length?sec('En préparation',prep,''):''}${sec('Prêtes à remettre',pret,'Aucune.')}${rel.length?sec('Reliquats à servir',rel,''):''}
    ${fin.length?`<details class="mag-det"${S.fini?' open':''}><summary>Terminées · annulées · refusées (${fin.length})</summary>${fin.slice(0,40).map(d=>rowDem(d,true)).join('')}</details>`:''}
    <p class="hint">Les demandes arrivent des téléphones (Moi → Magasin). Une préparation partielle laisse le reliquat sur la même demande ; la remise enregistre les sorties de stock.</p>`;}
function prepOf(d){if(!S.prep[d.id])S.prep[d.id]=(d.lignes||[]).map(l=>d.statut==='prete'?Math.max(0,r3((+l.prep||0)-servi(l))):reste(l));return S.prep[d.id];}
function vDemGest(me,ctx,d,C,st){const edit=d.statut==='preparation';const P=edit?prepOf(d):null;const people=(ctx.people||[]).filter(p=>p.active!==false).slice().sort((a,b)=>nom(a,ctx).localeCompare(nom(b,ctx),'fr'));const qui=S.qui[d.id]||d.byKey;
  const lignes=(d.lignes||[]).map((l,i)=>{const a=C[l.ref]||{};const s=st[l.ref];const pr=Math.max(0,r3((+l.prep||0)-servi(l)));const warn=edit&&s!==undefined&&(+P[i]||0)>s;
    return `<div class="mag-li"><div class="mag-lt"><b>${esc(l.label||l.ref)}</b><small>${esc(l.ref||'')}${a.emplacement&&a.emplacement!==l.ref?' · empl. '+esc(a.emplacement):''}${s!==undefined?' · stock '+nf(s)+' '+esc(a.unite||''):(l.ref?' · ':'')+'hors catalogue'}</small>
      <small>demandé ${nf(l.qte)}${servi(l)?' · déjà remis '+nf(servi(l)):''}${d.statut==='prete'?' · prêt '+nf(pr):''}${['prete','remise'].includes(d.statut)&&nonPrep(l)?' · reliquat '+nf(nonPrep(l)):''}</small>${warn?'<small class="warn">⚠ plus que le stock théorique</small>':''}</div>
      ${edit?(reste(l)?`<div class="mag-pin"><small>à préparer (max ${nf(reste(l))})</small><input class="f" type="number" inputmode="decimal" min="0" max="${reste(l)}" step="any" data-xin="mag|prep|${i}" value="${esc(P[i])}"></div>`:'<div class="mag-qv">✓</div>'):`<div class="mag-qv">${nf(d.statut==='prete'?pr:servi(l)||l.qte)}</div>`}</div>`;}).join('');
  let acts='';
  if(d.statut==='envoyee')acts=`<div class="mag-acts"><button class="btn primary" data-act="x" data-v="mag|start|${esc(d.id)}">▶ Commencer la préparation</button><button class="btn danger" data-act="x" data-v="mag|refus|${esc(d.id)}">Refuser</button></div><div class="hint">Une fois la préparation commencée, le demandeur ne peut plus annuler.</div>`;
  else if(d.statut==='preparation')acts=`<div class="mag-acts"><button class="btn primary" data-act="x" data-v="mag|pret|${esc(d.id)}">✓ Prête</button><button class="btn" data-act="x" data-v="mag|pretpart|${esc(d.id)}">✓ Déclarer prête cette partie</button><button class="btn danger" data-act="x" data-v="mag|refus|${esc(d.id)}">Refuser</button></div><div class="hint">Tout n'est pas disponible ? Mets les quantités préparées, puis « Déclarer prête cette partie » : le reliquat reste en suspens sur la même demande, le demandeur est prévenu « prête en partie ».</div>
    ${S.part===d.id?(()=>{const P=prepOf(d);const manq=(d.lignes||[]).map((l,j)=>({l,q:Math.max(0,r3(reste(l)-Math.min(reste(l),Math.max(0,+P[j]||0))))})).filter(x=>x.q>0);
      return `<div class="card" style="margin-top:10px"><h3>Prête en partie · reliquat en suspens</h3><div class="eq-s">${manq.map(x=>esc(x.l.label||x.l.ref)+' : '+nf(x.q)).join(' · ')||'rien ne manque'}</div>
        <div class="mag-grid"><div><label class="f">Reliquat attendu le (facultatif)</label><input class="f" type="date" data-xin="mag|partatt" value="${esc(S.partAtt||'')}"></div><div><label class="f">Note sur le reliquat (à commander, fournisseur…)</label><input class="f" data-xin="mag|partnote" value="${esc(S.partNote||'')}" placeholder="ex. à commander chez le fournisseur"></div></div>
        <div class="mag-acts"><button class="btn primary" data-act="x" data-v="mag|pretpartok|${esc(d.id)}">Confirmer : prête en partie</button><button class="btn" data-act="x" data-v="mag|pretpartx|">Annuler</button></div><div class="hint">Le reliquat apparaît dans « 🛒 À commander ». À la remise, ce qui est préparé sort du stock ; la demande reste « Retirée · reliquat à venir » jusqu'à la 2e préparation.</div></div>`;})():''}`; /* 19/10 : prête en partie */
  else if(d.statut==='prete')acts=`<label class="f">Qui retire ?</label><select class="f" data-xin="mag|qui">${people.some(p=>p.id===d.byKey)?'':`<option value="${esc(d.byKey)}">${esc(d.byName||d.byKey)}</option>`}${people.map(p=>`<option value="${esc(p.id)}" ${p.id===qui?'selected':''}>${esc(nom(p,ctx))}</option>`).join('')}</select>
    <div class="mag-acts"><button class="btn primary" data-act="x" data-v="mag|remettre|${esc(d.id)}">📤 Remis — enregistrer les sorties</button><button class="btn" data-act="x" data-v="mag|retprep|${esc(d.id)}">↩ Revenir en préparation</button></div><div class="hint">La remise vaut signature : qui a retiré, quand. Une sortie de stock par article, imputée à ${esc(impLab(d.imputation))}.</div>`;
  else if(d.statut==='remise'&&relq(d))acts=`<div class="mag-acts"><button class="btn primary" data-act="x" data-v="mag|reliquat|${esc(d.id)}">▶ Préparer le reliquat</button><button class="btn" data-act="x" data-v="mag|clore|${esc(d.id)}">Clôturer sans le reliquat</button></div>`;
  const refus=S.refus===d.id&&['envoyee','preparation'].includes(d.statut)?`<div class="card" style="margin-top:10px"><label class="f">Motif du refus (obligatoire, le demandeur le verra)</label><textarea class="f" rows="2" data-xin="mag|motif">${esc(S.motif)}</textarea><div class="mag-acts"><button class="btn danger" data-act="x" data-v="mag|refusok|${esc(d.id)}">Confirmer le refus</button><button class="btn" data-act="x" data-v="mag|refusx|">Garder la demande</button></div></div>`:'';
  return `<button class="ac-back" data-act="x" data-v="mag|mback|">‹ Demandes</button>
    <div class="card"><h3>${esc(d.byName||d.byKey)} ${stLab(d)}${d.urgent?' <span class="mag-st" style="color:#b8560f;background:#fff3d6">⚡ urgent</span>':''}</h3>
    <div class="eq-s">${d.direct?'Remis sans demande le '+esc(fDT(d.retireAt||d.at))+' (bon n° '+esc(d.lot||'')+')':'Demandée le '+esc(fDT(d.at))}${d.fiche?' · fiche type « '+esc(d.fiche.titre||'')+' »'+(d.creePar&&d.creePar!==d.byName?' par '+esc(d.creePar):''):''} · ${esc(impLab(d.imputation))}</div>
    ${(d.statut==='prete'||d.statut==='remise')&&(d.partiel||reliquatOf(d).length)?`<div class="warnbox">Reliquat en suspens : ${esc(reliquatOf(d).map(l=>l.label+' × '+nf(l.qte)).join(' · ')||'—')}${d.reliquatAttendu?' · attendu le '+esc(fDate(d.reliquatAttendu)):''}${d.reliquatNote?' · '+esc(d.reliquatNote):''}</div>`:''}
    ${d.note?`<div class="mag-note">📝 ${esc(d.note)}</div>`:''}${d.statut==='refusee'?`<div class="warnbox">Refusée : ${esc(d.motifRefus||'')}</div>`:''}
    <div class="mag-lines">${lignes||'<div class="eq-s">Aucun article : demande libre (voir la note).</div>'}</div>${acts}${refus}${histoHTML(d)}</div>`;}
function vStock(C,st){const all=Object.values(C);const fams=[...new Set(all.map(a=>a.famille).filter(Boolean))].sort((a,b)=>a.localeCompare(b,'fr'));
  const nCmd=all.filter(a=>aCmd(a,st[a.ref])>0).length,nRup=all.filter(a=>a.actif!==false&&(st[a.ref]||0)<=0).length;const val=all.reduce((x,a)=>x+Math.max(0,st[a.ref]||0)*(+a.prix||0),0);
  return `<div class="eq-kpis mag-kp"><div class="eq-kpi"><b>${all.length}</b><small>articles</small></div><div class="eq-kpi ${nCmd?'warn':'ok'}"><b>${nCmd}</b><small>à commander</small></div><div class="eq-kpi ${nRup?'bad':'ok'}"><b>${nRup}</b><small>à zéro ou négatifs</small></div><div class="eq-kpi"><b>${eurK(val)}</b><small>valeur du stock</small></div></div>
    <div class="mag-tools"><input class="f" type="search" placeholder="🔍 Article, référence, emplacement" data-xin="mag|sq" value="${esc(S.sq)}"><select class="f" data-xin="mag|sfam"><option value="">Toutes les familles</option>${fams.map(f=>`<option ${S.sfam===f?'selected':''}>${esc(f)}</option>`).join('')}</select><button class="btn primary" style="min-height:48px;flex:1 1 180px" data-act="x" data-v="mag|nanew|">＋ Nouvel article</button></div>
    <div class="card" id="mag-stock">${stockRows(C,st)}</div>
    <p class="hint">Touche un article : réception fournisseur, inventaire, réglages (tampon, emplacement, prix, actif). Entrées et sorties de plusieurs articles d'un coup : ↕ Mouvements.</p>`;}
const artRow=(a,s,right)=>`<button class="mag-ar${a.actif===false?' off':''}" data-act="x" data-v="mag|art|${esc(a.ref)}"><span class="mag-lt"><b>${esc(a.label)}</b><small>${esc(a.ref)}${a.emplacement&&a.emplacement!==a.ref?' · empl. '+esc(a.emplacement):''}${a.actif===false?' · inactif':''}</small></span>${right}</button>`;
function stockRows(C,st){const q=norm(S.sq).trim();const W=q?q.split(/\s+/):[];let L=Object.values(C).filter(a=>(!S.sfam||a.famille===S.sfam)&&W.every(w=>hay(a).includes(w)));
  L.sort((a,b)=>String(a.famille||'').localeCompare(String(b.famille||''),'fr')||String(a.label).localeCompare(String(b.label),'fr'));const n=L.length;L=L.slice(0,150);
  return (L.map(a=>{const s=st[a.ref]||0;const c=aCmd(a,s);return artRow(a,s,`<span class="mag-sv${s<=0?' bad':c>0?' warn':''}"><b>${nf(s)}</b><small>${esc(a.unite||'u')}${+a.tampon>0?' · tampon '+nf(a.tampon):''}</small></span>`);}).join('')||'<div class="eq-s">Aucun article.</div>')+(n>150?`<div class="hint">${n-150} autres : affine la recherche.</div>`:'');}
function vCmd(C,st,D){const L=Object.values(C).map(a=>({a,s:st[a.ref]||0,c:aCmd(a,st[a.ref]||0)})).filter(x=>x.c>0);const G={};L.forEach(x=>{const f=String(x.a.fournisseur||'').trim()||'Sans fournisseur';(G[f]=G[f]||[]).push(x);});
  const fs=Object.keys(G).sort((a,b)=>a==='Sans fournisseur'?1:b==='Sans fournisseur'?-1:a.localeCompare(b,'fr'));const tot=L.reduce((x,o)=>x+o.c*(+o.a.prix||0),0);const R=reliquats(D||dems()); /* 19/10 : reliquats en suspens */
  return `<div class="eq-kpis mag-kp"><div class="eq-kpi ${L.length?'warn':'ok'}"><b>${L.length}</b><small>articles à commander</small></div><div class="eq-kpi"><b>${fs.length}</b><small>fournisseurs</small></div><div class="eq-kpi ${R.length?'warn':''}"><b>${R.length}</b><small>reliquats en suspens</small></div><div class="eq-kpi"><b>${eurK(tot)}</b><small>valeur estimée (prix connus)</small></div></div>
    ${R.length?`<div class="ac-h mag-relh"><b>📦 Reliquats en suspens</b><span>${R.length} article${R.length>1?'s':''} attendus par des demandes prêtes ou retirées en partie</span></div><div class="card mag-relc">${R.map(o=>{const a=o.ref&&C[o.ref];const who=[...new Set(o.dems.map(d=>d.byName||d.byKey))].join(', ');const att=o.dems.map(d=>d.reliquatAttendu).filter(Boolean).sort()[0];return a?artRow(a,st[a.ref]||0,`<span class="mag-sv warn"><b>${nf(o.qte)}</b><small>${esc(a.unite||'u')} · pour ${esc(who)}${att?' · attendu le '+esc(fDate(att)):''}</small></span>`):`<div class="mag-ar"><span class="mag-lt"><b>${esc(o.label)}</b><small>hors catalogue · pour ${esc(who)}</small></span><span class="mag-sv warn"><b>${nf(o.qte)}</b></span></div>`;}).join('')}</div>`:''}
    <div class="hint">À commander = tampon − stock, quand c'est positif (la règle du classeur actuel). Trié par fournisseur.</div>
    ${fs.map(f=>{const R=G[f].sort((a,b)=>String(a.a.label).localeCompare(String(b.a.label),'fr'));const v=R.reduce((x,o)=>x+o.c*(+o.a.prix||0),0);
      return `<div class="ac-h mag-four"><b>${esc(f)}</b><span>${R.length} article${R.length>1?'s':''}${v?' · '+eur(v):''}</span></div><div class="card">${R.map(o=>artRow(o.a,o.s,`<span class="mag-sv warn"><b>${nf(o.c)}</b><small>${esc(o.a.unite||'u')} · stock ${nf(o.s)} / ${nf(o.a.tampon)}</small></span>`)).join('')}</div>`;}).join('')||'<div class="ac-empty">✓ Rien à commander.</div>'}`;}
function mvtRow(m,C){const a=C[m.ref]||{};const q=+m.qte||0;const sg=m.type==='sortie'?'−':m.type==='entree'?'+':q>=0?'+':'−';
  const det=m.type==='sortie'?impLab(m.imputation)+(m.pourName?' · pour '+m.pourName:'')+(m.qui&&m.qui!==m.pourName?' · retiré par '+m.qui:''):m.type==='entree'?[m.motif,m.fournisseur,m.bl?'BL '+m.bl:''].filter(Boolean).join(' · '):(m.motif||'écart d\'inventaire');
  return `<div class="mag-mv"><span class="mag-mt ${esc(m.type)}">${m.type==='sortie'?'Sortie':m.type==='entree'?'Entrée':'Écart'}</span><span class="mag-lt"><b>${esc(a.label||m.ref)}</b><small>${esc(fDT(m.at))} · ${esc(det)}${m.byName?' · '+esc(m.byName):''}</small></span><b class="mag-mq">${sg}${nf(Math.abs(q))}</b></div>`;}
function vMvt(C){const L=regAll(KMVT).filter(m=>m&&m.at).sort((a,b)=>String(b.at).localeCompare(String(a.at)));
  return `<div class="mag-acts" style="margin:4px 0 10px"><button class="btn primary" data-act="x" data-v="mag|lonew|entree">＋ Entrée de stock</button><button class="btn" data-act="x" data-v="mag|lonew|sortie">− Sortie de stock</button></div>
    <div class="hint">Le journal remplace les feuilles de sorties et d'entrées du classeur : une ligne par article, rien à recopier. Une entrée ou une sortie de plusieurs articles (bon) se touche pour la consulter et l'imprimer.</div><div class="card">${lotsHTML(L.slice(0,100),C)||'<div class="eq-s">Aucun mouvement pour l\'instant.</div>'}</div>${L.length>100?`<div class="hint">${L.length-100} plus anciens non affichés.</div>`:''}`;} /* 19/10 : entrées / sorties multiples (lots) */
function vArt(me,ctx,a,st){const s=st[a.ref]||0;const c=aCmd(a,s);const R=S.rec,I=S.inv;const C=cat();const mv=regAll(KMVT).filter(m=>m.ref===a.ref&&m.at).sort((x,y)=>String(y.at).localeCompare(String(x.at))).slice(0,15);
  return `<button class="ac-back" data-act="x" data-v="mag|artback|">‹ ${S.artFrom==='cmd'?'À commander':'Stock'}</button>
    <div class="card"><h3>${esc(a.label)}</h3><div class="eq-s">${esc(a.ref)}${a.famille?' · '+esc(a.famille):''} · unité : ${esc(a.unite||'u')}${a.fournisseur?' · '+esc(a.fournisseur):''}${a.refFournisseur?' (réf. '+esc(a.refFournisseur)+')':''}${a.marque?' · '+esc(a.marque):''}</div>
      <div class="eq-kpis mag-kp"><div class="eq-kpi ${s<=0?'bad':''}"><b>${nf(s)}</b><small>en stock</small></div><div class="eq-kpi"><b>${+a.tampon>0?nf(a.tampon):'—'}</b><small>tampon</small></div><div class="eq-kpi ${c?'warn':'ok'}"><b>${nf(c)}</b><small>à commander</small></div><div class="eq-kpi"><b>${+a.prix?eur(Math.max(0,s)*a.prix):'—'}</b><small>valeur</small></div></div>
      <div class="mag-grid"><div><label class="f">Stock tampon (niveau cible)</label><input class="f" type="number" inputmode="decimal" min="0" step="any" data-xin="mag|af|tampon" value="${a.tampon==null?'':esc(a.tampon)}"></div>
        <div><label class="f">Emplacement</label><input class="f" data-xin="mag|af|emplacement" value="${esc(a.emplacement||'')}"></div>
        <div><label class="f">Prix unitaire (€ HT)</label><input class="f" type="number" inputmode="decimal" min="0" step="any" data-xin="mag|af|prix" value="${a.prix==null?'':esc(a.prix)}"></div>
        <label class="mag-chk"><input type="checkbox" data-xin="mag|af|actif" ${a.actif===false?'':'checked'}> Actif : proposé dans les demandes</label></div>
      <div class="hint">Stock = départ ${nf(a.stockInit||0)} (au ${esc(fDate(a.stockAt))}) + entrées − sorties ± écarts d'inventaire.${a.editedBy?' Réglages modifiés par '+esc(a.editedBy)+' le '+esc(fDT(a.editedAt))+'.':''}${a.source==='appli'?' Article créé dans l\'appli'+(a.createdBy?' par '+esc(a.createdBy)+' le '+esc(fDate(a.createdAt)):'')+' : le réimport du pack ne le touche pas.':''}</div></div>
    ${artPhotoHTML(a,isMgr(ctx))}
    <div class="card"><h3>⬇ Réception / retour</h3>
      <div class="mag-seg">${MOTIFS_ENT.map(m=>`<button class="mag-sgb${(R.motif||MOTIFS_ENT[0])===m?' on':''}" data-act="x" data-v="mag|recmotif|${esc(m)}">${esc(m)}</button>`).join('')}</div>
      <div class="mag-grid"><div><label class="f">Quantité reçue (${esc(a.unite||'u')})</label><input class="f" type="number" inputmode="decimal" min="0" step="any" data-xin="mag|rec|qte" value="${esc(R.qte||'')}"></div>
        <div><label class="f">Fournisseur</label><input class="f" data-xin="mag|rec|fourn" value="${esc(R.fourn!=null?R.fourn:(a.fournisseur||''))}"></div>
        <div><label class="f">N° de bon de livraison (facultatif)</label><input class="f" data-xin="mag|rec|bl" value="${esc(R.bl||'')}"></div></div>
      <div class="mag-acts"><button class="btn primary" data-act="x" data-v="mag|recok|">Enregistrer l'entrée</button></div></div>
    <div class="card"><h3>✓ Inventaire</h3>
      <div class="mag-grid"><div><label class="f">Quantité comptée</label><input class="f" type="number" inputmode="decimal" min="0" step="any" data-xin="mag|inv|compte" value="${esc(I.compte==null?'':I.compte)}"></div>
        <div><label class="f">Motif de l'écart (obligatoire)</label><input class="f" data-xin="mag|inv|motif" list="mag-motifs" placeholder="Inventaire, casse, erreur…" value="${esc(I.motif||'')}"></div></div>
      <datalist id="mag-motifs">${MOTIFS_INV.map(m=>`<option value="${esc(m)}">`).join('')}</datalist>
      <div class="mag-acts"><button class="btn primary" data-act="x" data-v="mag|invok|">Enregistrer l'écart</button></div><div class="hint">L'écart (compté − stock théorique) est enregistré comme un mouvement : plus de correction à recopier dans le classeur.</div></div>
    <div class="card"><h3>Derniers mouvements</h3>${mv.map(m=>mvtRow(m,C)).join('')||'<div class="eq-s">Aucun mouvement depuis le stock de départ.</div>'}</div>`;}
function vCat(C){const cf=conf();const L=cf.listes||[],Dt=cf.dotations||[];const n=Object.keys(C).length;
  return `<div class="card"><h3>Pack magasin</h3>
      <div class="eq-s">${n?`${n} articles · ${L.length} liste${L.length>1?'s':''} par métier · ${Dt.length} dotation${Dt.length>1?'s':''} camion${cf.at?' · importé le '+esc(fDT(cf.at))+(cf.by?' par '+esc(cf.by):''):''}`:'Pas encore de catalogue.'}</div>
      <div class="mag-acts"><label class="btn primary">⬆ Importer le pack (.json)<input type="file" accept=".json,application/json" data-xin="mag|pack" style="display:none"></label></div>
      <label class="mag-chk"><input type="checkbox" data-xin="mag|reset" ${S.reset?'checked':''}> Repartir du stock du pack (après l'inventaire physique) : les mouvements déjà saisis ne comptent plus</label>
      <div class="hint">Le pack est le fichier JSON privé de SCR (il n'est jamais dans l'appli) : catalogue, listes par métier (les anciens bons de demande), dotations camion. Réimporter met à jour les libellés, familles, unités et fournisseurs, sans toucher au stock suivi ici (sauf case cochée) ni aux réglages faits ici (tampon, emplacement, prix, actif).</div></div>
    ${L.length?`<div class="card"><h3>Listes par métier</h3>${L.map(x=>`<div class="mag-li"><div class="mag-lt"><b>${esc(x.titre)}</b><small>pour : ${esc((x.pour||[]).join(', ')||'—')} · ${(x.lignes||[]).length} lignes</small></div></div>`).join('')}</div>`:''}
    ${Dt.length?`<div class="card"><h3>Dotations camion <span class="hint">· consultation (la suite : dotation initiale d'un camion)</span></h3>${Dt.map(x=>`<div class="mag-li"><div class="mag-lt"><b>${esc(x.titre||x.metier)}</b><small>${(x.articles||[]).length} articles${x.miseAJour?' · mise à jour '+esc(x.miseAJour):''}</small></div></div>`).join('')}</div>`:''}`;}
/* actions du référent */
async function majDem(id,fn,ctx,me){try{await regLoad(['magdem']);}catch(e){} /* l'état du serveur d'abord (annulation du demandeur, autre poste) */const d=regGet('magdem',id);if(!d)return;const r=fn(d);if(!r)return;
  const at=isoNow();const by=nom(me,ctx);const H=(d.histo||[]).concat((r.histo||[]).map(h=>Object.assign({at,by},h)));const p=Object.assign({},r.patch,{histo:H});regSet('magdem',id,p,{quiet:true});if(r.toast)ctx.toast(r.toast);ctx.render();}
function remettre(id,me,ctx){const d=regGet('magdem',id);if(!d||d.statut!=='prete'){ctx.render();return;}const qk=S.qui[id]||d.byKey;const quiN=persNom(qk,ctx)||(qk===d.byKey?d.byName:qk);const at=isoNow();const by=nom(me,ctx);const out=[];
  const lignes=(d.lignes||[]).map(l=>{const q=Math.max(0,r3((+l.prep||0)-servi(l)));if(q>0&&l.ref)out.push({ref:l.ref,qte:q});return Object.assign({},l,{remis:r3(servi(l)+q)});});
  out.forEach((o,j)=>regSet(KMVT,uid()+'-'+j,{at,byKey:me.id,byName:by,type:'sortie',ref:o.ref,qte:o.qte,demande:d.id,imputation:d.imputation||null,pourKey:d.byKey,pourName:d.byName||'',qui:quiN,fournisseur:null,bl:null,motif:null},{quiet:true}));
  const rq=r3(lignes.reduce((x,l)=>x+reste(l),0));const H=(d.histo||[]).concat([{at,by,statut:'remise',note:'retiré par '+quiN+(rq?' — reliquat '+nf(rq):'')}]);if(!rq)H.push({at,by,statut:'cloturee'});
  regSet('magdem',id,{statut:rq?'remise':'cloturee',lignes,histo:H,retirePar:quiN,retireAt:at,remises:(d.remises||[]).concat([{at,by,qui:quiN,quiKey:qk,lignes:out}])},{quiet:true});
  delete S.prep[id];ctx.toast('✓ Remis à '+quiN+' : '+out.length+' sortie'+(out.length>1?'s':'')+' de stock'+(rq?' — reliquat '+nf(rq)+' gardé sur la demande':''));ctx.render();}
function mvtNew(me,ctx,o){regSet(KMVT,uid(),Object.assign({at:isoNow(),byKey:me.id,byName:nom(me,ctx),demande:null,imputation:null,fournisseur:null,bl:null,motif:null},o),{quiet:true});}
function artSet(a,patch,me,ctx){regSet('magcat','catalogue',{[a.ref]:Object.assign({},a,patch,{editedAt:isoNow(),editedBy:nom(me,ctx)})},{quiet:true});}

/* ══════════ PACK SCR : pack.magasin = {catalogue:[…], formulaires:[…], dotations:[…]} (structures des fichiers d'analyse, telles quelles) ══════════ */
const num=v=>v===null||v===undefined||v===''||!isFinite(+v)?null:+v;
export async function importPack(part,ctx,opts){opts=opts||{};if(!part||typeof part!=='object')throw new Error('partie « magasin » du pack absente');
  const C0=Array.isArray(part.catalogue)?part.catalogue:null;if(!C0)throw new Error('catalogue absent (pack.magasin.catalogue)');
  const forms=Array.isArray(part.formulaires)?part.formulaires:[];const dots=Array.isArray(part.dotations)?part.dotations:[];
  const old=cat();const at=isoNow();let by='';try{by=ctx&&ctx.me&&ctx.nomC?ctx.nomC(ctx.me):(ctx&&ctx.api&&ctx.api.userName?ctx.api.userName():'');}catch(e){}
  const P={};
  C0.forEach(x=>{if(!x||x.ref==null)return;const ref=String(x.ref).trim();if(!ref)return;const o=old[ref];
    const base={ref,label:String(x.designation||x.label||ref),famille:x.famille||null,unite:x.unite||'u',fournisseur:x.fournisseur||null,marque:x.marque||null,refFournisseur:x.refFournisseur==null?null:String(x.refFournisseur),aliases:Array.isArray(x.aliases)?x.aliases.map(String).slice(0,12):[],metiers:Array.isArray(x.metiers)?x.metiers.map(String):[]};
    const reglages={tampon:num(x.seuil!==undefined?x.seuil:x.tampon),emplacement:x.emplacement||null,prix:num(x.prixU!==undefined?x.prixU:x.prix),actif:x.actif!==false};
    const stock={stockInit:num(x.stockDepot!==undefined?x.stockDepot:x.stockInit)||0,stockAt:at};
    P[ref]=o?Object.assign({},o,base,o.editedAt?{}:reglages,opts.reset?stock:{},{importAt:at}):Object.assign(base,reglages,stock,{importAt:at});});
  const n=Object.keys(P).length;if(!n)throw new Error('aucun article (champ « ref » manquant ?)');
  const listes=forms.filter(f=>f&&Array.isArray(f.articles)).map((f,i)=>({id:String(f.id||'liste'+i).replace(/[§:|]/g,'-'),titre:String(f.titre||f.id||'Liste'),pour:Array.isArray(f.pour)?f.pour.map(String):[],
    lignes:f.articles.map(l=>({n:l.ligne==null?null:l.ligne,section:String(l.section||''),ref:l.ref?String(l.ref):null,label:String(l.designation||l.label||l.ref||''),unite:l.unite||null,qteMax:num(l.qteMax),choix:l.choixVariante||null,
      variantes:Array.isArray(l.variantes)?l.variantes.filter(v=>v&&v.ref).map(v=>({libelle:String(v.libelle||v.ref),ref:String(v.ref)})):null})).filter(l=>l.ref||(l.variantes&&l.variantes.length))})).filter(x=>x.lignes.length);
  const dotations=dots.filter(d=>d&&Array.isArray(d.articles)).map(d=>({metier:d.metier||null,metiers:Array.isArray(d.metiers)?d.metiers.map(String):[],titre:String(d.titre||d.metier||''),miseAJour:d.miseAJour||null,
    articles:d.articles.filter(Boolean).map(x=>({ref:x.ref?String(x.ref):null,label:String(x.designation||x.label||''),qte:num(x.qte),qteTexte:x.qteTexte||null,unite:x.uniteDotation||x.unite||null,aLaDemande:!!x.aLaDemande,controle:x.controle||null,observation:x.observation||null,lienStock:x.lienStock||null,section:x.section||null,variantes:Array.isArray(x.variantes)?x.variantes.filter(v=>v&&v.ref).map(v=>({libelle:String(v.libelle||v.ref),ref:String(v.ref)})):null}))})); /* 19/10 : + unité, observation, lien stock, section (fiches type) ; un champ inconnu d'une version future est ignoré */
  regSet('magcat','catalogue',P);
  regSet('magcat','config',{at,by,listes,dotations,nArticles:n},{replace:true});
  return `${n} articles, ${listes.length} liste${listes.length>1?'s':''}${dotations.length?', '+dotations.length+' dotation'+(dotations.length>1?'s':''):''}${opts.reset?' — stock repris du pack':''}`;}
async function importFile(file,me,ctx){let j=null;try{j=JSON.parse(await file.text());}catch(e){ctx.toast('Fichier illisible : ce n\'est pas un JSON.');return;}
  const part=j&&j.magasin&&typeof j.magasin==='object'?j.magasin:j;
  try{const r=await importPack(part,Object.assign({},ctx,{me}),{reset:S.reset});S.reset=false;ctx.toast('✓ Pack magasin importé : '+r);}catch(e){ctx.toast('Import impossible : '+e.message);}ctx.render();}

/* ══════════ clics et champs ══════════ */
const WRITE=new Set(['inc','dec','sz','send','cancel','start','pret','pretpartok','remettre','retprep','reliquat','clore','refus','refusok','recok','invok','urgent']);
function act(v,el,me,ctx){const i=String(v).indexOf('|');const k=i<0?v:v.slice(0,i);const arg=i<0?'':v.slice(i+1);
  if(act2(k,arg,el,me,ctx))return; /* 19/10 : fiches type, équiper un véhicule, pastilles, nouvel article, lots (magasin2.js) */
  if(WRITE.has(k)&&RO(ctx))return;
  const mgrOnly=['mopen','mback','start','pret','pretpart','pretpartok','pretpartx','remettre','retprep','reliquat','clore','refus','refusok','refusx','art','artback','recmotif','recok','invok'];if(mgrOnly.includes(k)&&!isMgr(ctx)){ctx.toast('Réservé au magasin (droit « Magasin »)');return;}
  if(k==='mseg'&&!isMgr(ctx)&&arg!=='fiches'){ctx.toast('Réservé au magasin (droit « Magasin »)');return;} /* 19/10 : sans le droit, seul l'onglet Fiches type */
  switch(k){
    case 'rf':ensure(ctx,true);if(isMgr(ctx))regLoad(['vehicule']).catch(()=>{});ctx.toast('↻ Mise à jour demandée au serveur');return;
    case 'new':S.v='new';S.step=1;S.q='';break;
    case 'list':S.v='list';S.cur=null;S.step=1;S2.fv='list';S2.equip=null;break;
    case 'fiches':S.v='fiches';S2.fv='list';S2.fid=null;S2.equip=null;break; /* 19/10 : Moi → Magasin → fiches type */
    case 'urgent':{const D=draft(me);D.urgent=!D.urgent;saveDraft(me);break;}
    case 'open':S.v='fiche';S.cur=arg;break;
    case 'step':S.step=+arg===2?2:1;try{window.scrollTo(0,0);setTimeout(()=>{const hb=document.getElementById('homeBody');if(hb)hb.scrollTop=0;},0);}catch(e){} /* 14/10 nuit (sync) : c'est #homeBody qui défile */break;
    case 'inc':case 'dec':{const D=draft(me);const q=Math.max(0,r3((+D.lignes[arg]||0)+(k==='inc'?1:-1)));if(q)D.lignes[arg]=q;else delete D.lignes[arg];if(q&&!D.labels[arg])D.labels[arg]=(el&&el.dataset&&el.dataset.l)||((cat()[arg]||{}).label)||arg;saveDraft(me);break;}
    case 'sz':{const j=arg.indexOf('|');const key=arg.slice(0,j),ref=arg.slice(j+1);const D=draft(me);S.sel[key]=ref;if(!(+D.lignes[ref])){D.lignes[ref]=1;D.labels[ref]=(el&&el.dataset&&el.dataset.l)||((cat()[ref]||{}).label)||ref;saveDraft(me);}break;}
    case 'tog':S.open[arg]=!(el&&/▾/.test(el.textContent||''));break;
    case 'autres':S.autres=!S.autres;break;
    case 'imp':{const D=draft(me);const prev=D.imp||{};D.imp=arg==='depot'?{type:'depot',id:'depot',label:'Dépôt'}:{type:arg,id:prev.type===arg?prev.id:'',label:prev.type===arg?prev.label:''};S.vehAutre=false;saveDraft(me);break;}
    case 'send':send(me,ctx);return;
    case 'cancel':cancel(arg,me,ctx);return;
    /* référent */
    case 'mseg':S.seg=arg||'dem';S.mcur=null;S.art=null;S.refus=null;S.part=null;S2.newArt=null;S2.lot=null;S2.lotId=null;S2.fv='list';S2.fid=null;S2.equip=null;S2.fedit=false;break; /* 19/10 : un segment touché = sa racine */
    case 'mopen':S.mcur=arg;S.refus=null;S.motif='';S.part=null;break;
    case 'mback':S.mcur=null;S.refus=null;S.part=null;break;
    case 'start':majDem(arg,d=>{if(d.statut!=='envoyee'){ctx.toast(d.statut==='annulee'?'Annulée par le demandeur entre-temps.':'Déjà prise en charge.');ctx.render();return null;}delete S.prep[d.id];return {patch:{statut:'preparation'},histo:[{statut:'preparation'}]};},ctx,me);return;
    case 'pret':case 'pretpart':case 'pretpartok':{const d=regGet('magdem',arg);if(!d||d.statut!=='preparation')break;const P=prepOf(d);
      const lignes=(d.lignes||[]).map((l,j)=>Object.assign({},l,{prep:r3(servi(l)+Math.min(reste(l),Math.max(0,+P[j]||0)))}));const now=lignes.reduce((x,l)=>x+(l.prep-servi(l)),0);
      if(lignes.length&&!now){ctx.toast('Rien de préparé : mets au moins une quantité, ou refuse la demande.');return;}const rq=r3(lignes.reduce((x,l)=>x+nonPrep(l),0));const rel=lignes.filter(l=>nonPrep(l)>0).map(l=>({ref:l.ref||null,label:l.label||l.ref,qte:nonPrep(l)}));
      if(k==='pretpart'){if(!rq){ctx.toast('Tout est préparé : touche « ✓ Prête ».');return;}S.part=arg;S.partAtt='';S.partNote='';break;} /* 19/10 : on ouvre le cadre « reliquat en suspens » */
      const att=k==='pretpartok'&&S.partAtt?S.partAtt:null,pn=k==='pretpartok'?String(S.partNote||'').trim():'';
      /* 19/10 : partiel + reliquat gardés sur la demande (reliquat: [{ref, qte}]) ; une préparation complète les efface (null = clé retirée) */
      majDem(arg,d2=>d2.statut!=='preparation'?null:{patch:{statut:'prete',lignes,partiel:rq?true:null,reliquat:rq?rel:null,reliquatAttendu:rq&&att?att:null,reliquatNote:rq&&pn?pn:null},histo:[{statut:'prete',note:rq?'partielle — reliquat '+nf(rq)+(att?' attendu le '+fDate(att):'')+(pn?' — '+pn:''):'complète'}],toast:rq?'Prête en partie : '+rel.length+' article'+(rel.length>1?'s':'')+' en suspens, reliquat '+nf(rq)+' gardé sur la demande':'Prête : le demandeur est prévenu'},ctx,me);delete S.prep[arg];S.part=null;return;}
    case 'pretpartx':S.part=null;break;
    case 'remettre':remettre(arg,me,ctx);return;
    case 'retprep':majDem(arg,d=>d.statut!=='prete'?null:(S.prep[d.id]=(d.lignes||[]).map(l=>Math.max(0,r3((+l.prep||0)-servi(l)))),{patch:{statut:'preparation'},histo:[{statut:'preparation',note:'retour en préparation'}]}),ctx,me);return;
    case 'reliquat':majDem(arg,d=>{if(d.statut!=='remise'||!relq(d))return null;S.prep[d.id]=(d.lignes||[]).map(reste);return {patch:{statut:'preparation'},histo:[{statut:'preparation',note:'reliquat'}]};},ctx,me);return;
    case 'clore':if(typeof confirm==='function'&&!confirm('Clôturer la demande ? Le reliquat ne sera pas servi.'))return;majDem(arg,d=>d.statut!=='remise'?null:{patch:{statut:'cloturee'},histo:[{statut:'cloturee',note:'reliquat abandonné ('+nf(relq(d))+')'}],toast:'Demande clôturée'},ctx,me);return;
    case 'refus':S.refus=arg;S.motif='';break;
    case 'refusx':S.refus=null;break;
    case 'refusok':{const m=String(S.motif||'').trim();if(!m){ctx.toast('Le motif du refus est obligatoire.');return;}majDem(arg,d=>!['envoyee','preparation'].includes(d.statut)?null:{patch:{statut:'refusee',motifRefus:m},histo:[{statut:'refusee',note:m}],toast:'Demande refusée'},ctx,me);S.refus=null;S.motif='';return;}
    case 'art':if(S.seg!=='stock'&&S.seg!=='cmd')S.seg='stock';S.artFrom=S.seg;S.art=arg;S.rec={};S.inv={};try{window.scrollTo(0,0);setTimeout(()=>{const hb=document.getElementById('homeBody');if(hb)hb.scrollTop=0;},0);}catch(e){} /* 14/10 nuit (sync) : c'est #homeBody qui défile */break;
    case 'artback':S.art=null;break;
    case 'recmotif':S.rec.motif=arg;break;
    case 'recok':{const a=cat()[S.art];if(!a)break;const q=num(String(S.rec.qte||'').replace(',','.'));if(!q||q<=0){ctx.toast('Indique la quantité reçue.');return;}
      const motif=S.rec.motif||MOTIFS_ENT[0];const fourn=String(S.rec.fourn!=null?S.rec.fourn:(a.fournisseur||'')).trim();
      mvtNew(me,ctx,{type:'entree',ref:a.ref,qte:r3(q),fournisseur:fourn||null,bl:String(S.rec.bl||'').trim()||null,motif});S.rec={};ctx.toast('✓ Entrée enregistrée : +'+nf(q)+' '+(a.unite||''));break;}
    case 'invok':{const a=cat()[S.art];if(!a)break;const c=num(String(S.inv.compte==null?'':S.inv.compte).replace(',','.'));if(c===null||c<0){ctx.toast('Indique la quantité comptée.');return;}
      const motif=String(S.inv.motif||'').trim();if(!motif){ctx.toast('Le motif de l\'écart est obligatoire.');return;}const s=stocks(cat())[a.ref]||0;const dlt=r3(c-s);if(!dlt){ctx.toast('Pas d\'écart : le stock compté est égal au stock théorique.');S.inv={};break;}
      mvtNew(me,ctx,{type:'ajust',ref:a.ref,qte:dlt,motif});S.inv={};ctx.toast('✓ Écart enregistré : '+(dlt>0?'+':'')+nf(dlt));break;}
    default:return;}
  ctx.render();}
function input(champ,el,me,ctx,type){const i=String(champ).indexOf('|');const k=i<0?champ:champ.slice(0,i);const arg=i<0?'':champ.slice(i+1);
  if(input2(k,arg,el,me,ctx,type))return; /* 19/10 : champs de magasin2.js */
  switch(k){
    case 'q':if(type!=='input')return;S.q=el.value;{const r=document.getElementById('mag-res');if(r)r.innerHTML=resHTML(draft(me),cat());}return;
    case 'note':draft(me).note=el.value;saveDraft(me);return;
    case 'partatt':S.partAtt=el.value;return;
    case 'partnote':S.partNote=el.value;return;
    case 'impSite':if(type!=='change')return;{const D=draft(me);const s=(ctx.sites||[]).find(x=>x.id===el.value);D.imp={type:'chantier',id:el.value,label:s?s.name:el.value};saveDraft(me);ctx.render();}return;
    case 'impVeh':if(type!=='change')return;{const D=draft(me);if(el.value==='__autre'){S.vehAutre=true;D.imp={type:'vehicule',id:'',label:''};}else{S.vehAutre=false;const v=vehAll().find(x=>x.immat===el.value);D.imp={type:'vehicule',id:el.value,label:v?(v.immat+(v.marque?' '+v.marque:'')).trim():el.value};}saveDraft(me);ctx.render();}return;
    case 'impImmat':{const D=draft(me);const t=String(el.value||'').toUpperCase().trim();D.imp={type:'vehicule',id:t,label:t};saveDraft(me);}return;
    /* référent */
    case 'prep':{const d=S.mcur&&regGet('magdem',S.mcur);if(!d)return;const P=prepOf(d);P[+arg]=el.value===''?'':Math.max(0,+String(el.value).replace(',','.')||0);}return; /* pas de re-rendu : le doigt passe à la ligne suivante */
    case 'qui':if(S.mcur)S.qui[S.mcur]=el.value;return;
    case 'motif':S.motif=el.value;return;
    case 'sq':if(type!=='input')return;S.sq=el.value;{const r=document.getElementById('mag-stock');if(r){const C=cat();r.innerHTML=stockRows(C,stocks(C));}}return;
    case 'sfam':if(type!=='change')return;S.sfam=el.value;ctx.render();return;
    case 'rec':S.rec[arg]=el.value;return;
    case 'inv':S.inv[arg]=el.value;return;
    case 'reset':S.reset=!!el.checked;return;
    case 'pack':if(type!=='change')return;{if(!isMgr(ctx)){ctx.toast('Réservé au magasin (droit « Magasin »)');return;}if(RO(ctx))return;const f=el.files&&el.files[0];el.value='';if(f)importFile(f,me,ctx);}return;
    case 'af':{if(type!=='change')return;if(!isMgr(ctx)||RO(ctx))return;const a=cat()[S.art];if(!a)return;let val;
      if(arg==='actif')val=!!el.checked;else if(arg==='emplacement')val=String(el.value||'').trim()||null;else if(arg==='tampon'||arg==='prix'){val=el.value===''?null:num(String(el.value).replace(',','.'));if(el.value!==''&&(val===null||val<0)){ctx.toast('Nombre invalide');return;}}else return;
      artSet(a,{[arg]:val},me,ctx);ctx.toast('✓ Article mis à jour');ctx.render();}return;
  }}

/* ══════════ « À faire » ══════════ */
function tasks(me,ctx){ensure(ctx);const L=[];const D=dems();
  const pretes=D.filter(d=>d.byKey===me.id&&d.statut==='prete');const part=pretes.filter(d=>d.partiel||(d.lignes||[]).some(nonPrep)); /* 19/10 : prête en partie → le gars le sait */
  if(pretes.length)L.push({act:true,sev:'ok',ic:'📦',t:pretes.length>1?pretes.length+' demandes prêtes au dépôt'+(part.length?' (dont '+part.length+' en partie)':''):'Ta demande est prête au dépôt'+(part.length?' ('+partTxt(part[0])+')':''),s:pretes.slice(0,2).map(resume).join(' · ')+' — passe la retirer',when:'à retirer',kl:'Magasin',kv:pretes.length+' prête'+(pretes.length>1?'s':''),go:()=>{S.v=pretes.length===1?'fiche':'list';S.cur=pretes[0].id;ctx.sub('mag');}});
  if(isMgr(ctx)){const T=D.filter(d=>d.statut==='envoyee'||d.statut==='preparation'||(d.statut==='remise'&&relq(d)>0)).sort(byAt);
    if(T.length){const own=ownMgr(me,ctx);const nU=T.filter(d=>d.urgent).length;L.push({act:own,sev:'warn',ic:'📦',t:T.length+' demande'+(T.length>1?'s':'')+' à préparer'+(nU?' (dont '+nU+' urgente'+(nU>1?'s':'')+')':''),s:'Magasin · '+T.slice(0,3).map(d=>(d.byName||'?')+(d.urgent?' ⚡':'')).join(' · '),when:nU?'⚡ urgent':'',kl:'Magasin',kv:T.length+' à préparer',go:()=>goGestion(ctx)});}}
  return L;}
// vers Parc → 📦 Magasin → Demandes (le segment « magasin » de l'onglet Parc)
function goGestion(ctx){S.seg='dem';S.mcur=null;S.art=null;const A=ctx.api;try{if(A&&A.homeTab)A.homeTab('parc');}catch(e){}const b=document.querySelector('#eq-app [data-act=parcseg][data-v=magasin]');if(b&&!b.classList.contains('active'))b.click();}

export default {id:'mag',feat:'magasin',kinds:KINDS,
  moiSubs:(me,ctx)=>{if(!canAsk(me))return [];const n=dems().filter(d=>d.byKey===me.id&&d.statut==='prete').length;return [['mag','Magasin',n,false]];},
  view:(sub,me,ctx)=>sub==='mag'?vDem(me,ctx):null,
  parcSeg:(seg,me,ctx,bar)=>seg==='magasin'?vGestion(me,ctx,bar):null,
  xview:(key,me,ctx)=>{css();const h=xview2(key,me,ctx);return h?wrap(h):null;}, /* 19/10 : x:mag:pers:<clé> (demandes d'une personne, lecture) · x:mag:equipe (hub du chef) */
  tasks,act,input,
  pack:{key:'magasin',label:'Magasin — catalogue du dépôt, listes par métier, dotations camion',import:(part,ctx)=>importPack(part,ctx)}};
/* 19/10 (lot MG) : magasin2.js reçoit les outils de ce fichier (données, droits, libellés, état) — pas d'import croisé */
init2({cat,conf,stocks,dems,isMgr,RO,nom,persNom,mvtNew,S,ST,HST,impLab,stLab,relq,nonPrep,reste,servi,enAttente,ensure,num,hay,mvtRow,MOTIFS_ENT,KMVT,histoHTML,detLigne,canAsk});
