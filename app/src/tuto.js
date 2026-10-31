// tuto.js — 31/10/2026 (lot MO) : TUTOS AU PREMIER PASSAGE. Scope V1 d'Ethan (30/10) : « tuto déclaratif au premier arrivage » ; le soir : « lance tout en codage les tuto ».
// Hypothèse annoncée à Ethan : un petit guide pas à pas qui s'affiche la 1re fois qu'une personne ENTRE dans un module (Tracé Chantier, Compagnon, Pilotage…),
// Suivant / Passer en gros boutons, la chose expliquée surlignée à l'écran (ou une carte au centre si elle n'est pas affichée). Jamais bloquant : un toucher à côté,
// « Passer » ou Échap le ferment ; jamais par-dessus une fenêtre ouverte, une saisie en cours ou l'écran de chargement (il attend). Mémorisé par compte SUR L'APPAREIL
// (aucune lecture serveur). « ❓ Revoir le tuto » : menu des modules (toucher « Tracé … » en haut) et bouton ❓ de la 2e ligne du bandeau. Option de palier `tutos`.
//
// DÉCLARATIF — ajouter une étape = ajouter une ligne dans TUTOS[<écran>] :
//   {sel:'#idDeLaCible, .autreCible', titre:'Titre court', texte:'Une ou deux phrases, vocabulaire terrain.'}   (sel facultatif : sans cible → carte au centre)
//   La 1re cible VISIBLE de la liste « sel » est surlignée ; si aucune ne l'est, la carte s'affiche au centre (le tuto ne casse jamais).
//   `si:(api)=>bool` (facultatif) : l'étape n'apparaît que si la condition est vraie (droits, option…).
// Écrans (clé passée par app.js → tutoArrive) : accueil, chantiers (Carte / Liste), chantier (un chantier ouvert), pilotage, compagnon, affaires, flotte, magasin, equipe.
// Robots de test (navigator.webdriver) : rien ne s'affiche tout seul, sauf localStorage « trace:tuto:test » = '1' (e2e_mo_3110) ; tutoStart reste utilisable.
export const TUTO_TITRES={concepteur:'Tracé Concepteur',accueil:'Tracé',chantiers:'Tracé Chantier',chantier:'Tracé Chantier',pilotage:'Tracé Pilotage',compagnon:'Tracé Compagnon',affaires:'Tracé Affaires',flotte:'Tracé Flotte',magasin:'Tracé Magasin',equipe:'Tracé Équipe'};
export const TUTOS={
 accueil:[
  {titre:'Bienvenue dans Tracé',texte:'L\'appli de SCR pour tes chantiers : soudures, pointage, documents. Trente secondes pour faire le tour.'},
  {sel:'#tbHomeMod',titre:'Tracé + le module',texte:'En haut, le nom du module où tu es. Touche-le pour passer d\'un module à l\'autre.'},
  {sel:'#homeTabs',titre:'Un onglet = un module',texte:'Chantier, Compagnon, Pilotage… Tu ne vois que ce qui te sert.'},
  {sel:'#homeBody',titre:'Aujourd\'hui',texte:'Ce qui t\'attend aujourd\'hui : ton pointage, tes chantiers, tes documents à signer.'},
  {sel:'#tbHomeHelp',titre:'Revoir un guide',texte:'Touche ❓ pour revoir le guide du module où tu es.'}
 ],
 chantiers:[
  {sel:'#homeSubTabs',titre:'Tes chantiers',texte:'Sur la carte ou en liste. Sécurité : accidents, quarts d\'heure, contrôles (encadrement).'},
  {sel:'#homeBody',titre:'Ouvrir un chantier',texte:'Touche un chantier pour ouvrir son plan.'}
 ],
 chantier:[
  {sel:'#siteSel',titre:'Le chantier ouvert',texte:'Son nom ici. Touche ▾ pour changer de chantier, ⌂ pour revenir à l\'accueil.'},
  {sel:'#svg, #view-plan',titre:'Le plan',texte:'Touche une soudure (un rond) : sa fiche s\'ouvre — statut, photo, numéro. Deux doigts pour zoomer.'},
  {sel:'#legend, .legend',titre:'Les couleurs',texte:'Gris à souder, orange soudée, bleu contrôlée, vert manchonnée, rouge à reprendre.'},
  {sel:'.siteHead .seg, .siteHead [data-facet], #facets',titre:'Plan · Vie du chantier · Technique',texte:'Le plan ; la vie du chantier (sécurité, conversation, dossier) ; la technique (DH, hydro, stock…).'},
  {sel:'#planFab',titre:'＋ Poser',texte:'Une photo, une note, un point sur le plan : touche ＋.'},
  {sel:'.pxw-b, [data-pxlist]',titre:'📄 Mes plans',texte:'Les plans d\'exé, ceux de ta zone en premier. Depuis la fiche d\'une soudure, la bonne planche s\'ouvre directement.',si:a=>!a||!a.feat||a.feat('plansexe')}, /* 31/10 (lot DX) */
  {sel:'#shDoss',titre:'Le Dossier du chantier',texte:'Les pièces obligatoires (DICT, PPSPS, plans d\'exé…) : ce qui manque est en rouge. Touche pour ouvrir le Dossier et le Drive du chantier.',si:a=>!a||!a.can||a.can('dossier.edit')}, /* 31/10 (lot DX) */
  {titre:'Les modifs',texte:'Par défaut, tout est compris dans le marché. Pour ressortir un changement de DN, des ml, des soudures ou des pièces (TS) : onglet Modifs → « ＋ Déclarer une modif », puis pointe-la sur le plan.',si:a=>!a||((!a.feat||a.feat('modifs'))&&(!a.can||a.can('ts.qualify')))}, /* 31/10 (lot MD) */
  {sel:'#btnSearch',titre:'Chercher',texte:'Retrouve une soudure par son numéro.'},
  {sel:'#btnMenu',titre:'Le menu ☰',texte:'Export, recompter, réglages du chantier.'}
 ],
 pilotage:[
  {titre:'Pilotage',texte:'Le planning des équipes, les pointages à valider, les heures et la production. Pour les chefs, conducteurs et le bureau.'},
  {sel:'#eq-app [data-v="valid"]',titre:'Pointages à valider',texte:'Valide les heures de ton équipe : d\'abord le chef de chantier, puis le conducteur.'},
  {sel:'#eq-app [data-act="xgo"][data-v="plan"], #eq-app [data-act="xgo"][data-v="orga"], #eq-app [data-v="planning"]',titre:'Planning',texte:'Qui est où cette semaine : place un gars en 3 touchers, copie la semaine dernière. Le gars voit « Demain : chantier X » dans Compagnon.'}, /* 31/10 : + planning simplifié (lot PI) */
  {sel:'#eq-app [data-act="xgo"][data-v="prodEq"], #eq-app [data-v="prodEq"]',titre:'Production',texte:'Soudures et manchons par équipe, jour par jour.'},
  {sel:'#eq-app [data-act="xgo"][data-v="x:dem:file"]',titre:'Demandes de matériel',texte:'Les demandes des gars pour leurs chantiers : « Commandé », puis « Livré / remis ». Ils suivent l\'état sur leur téléphone.',si:a=>!a||!a.feat||a.feat('demandes')}, /* 31/10 (lot CC) */
  {sel:'#eq-app [data-act="xgo"][data-v="x:cc:"]',titre:'Compte d\'un chantier',texte:'Bons de commande, dépenses et heures par poste d\'un chantier, imprimable. Pas de compta.',si:a=>!a||!a.feat||a.feat('comptechantier')} /* 31/10 (lot CC) */
 ],
 compagnon:[
  {titre:'Compagnon',texte:'Ton espace : ton pointage, tes heures, tes documents à signer, tes demandes, ton véhicule.'},
  {sel:'#eq-app section.ptc, #eq-app [data-act="pointer"]',titre:'Pointer',texte:'Matin, midi, soir : un toucher. Ton chef valide ensuite.',si:a=>!a||!a.can||a.can('pointage.self')},
  {sel:'#eq-app .eq-subs, #eq-app .eq-filtres',titre:'Tes rubriques',texte:'Heures, documents, habilitations, magasin… tout ce qui te concerne.'},
  {sel:'#eq-app .eq-subs [data-v="dem"]',titre:'Mes demandes',texte:'Besoin de matériel pour ton chantier ? « ＋ Nouvelle demande » : tu choisis, tu envoies, tu suis l\'état (commandé, livré).',si:a=>!a||!a.feat||a.feat('demandes')}, /* 31/10 (lot CC) */
  {sel:'#homeAva, #tbHomeAvaCtx, #tbHomeAvaBand',titre:'Ta pastille',texte:'Ton compte : mot de passe, affichage, déconnexion.'}
 ],
 affaires:[
  {titre:'Affaires',texte:'Le commerce : affaires, chiffrage, DPGF, mémoire technique, documents de l\'offre.'},
  {sel:'#eq-app [data-act="af"][data-v^="seg|"]',titre:'Les rubriques',texte:'Reporting, devis & chiffrage, dossiers en cours, terminés, base de prix.'},
  {titre:'Une affaire',texte:'Touche une affaire pour l\'ouvrir : lecture du DCE, quantités, chiffrage, mémoire, offre.'}
 ],
 flotte:[
  {titre:'Flotte',texte:'Les véhicules : qui a quoi, échéances, états des lieux, cartes.'},
  {sel:'#eq-app .eq-filtres',titre:'Flotte et matériel',texte:'Bascule entre les véhicules et le matériel.'},
  {sel:'#eq-app [data-act="fl"][data-v="vue|list"]',titre:'Vues',texte:'Véhicules, échéances et interventions, mouvements, qui a quoi, historique.'}
 ],
 magasin:[
  {titre:'Magasin',texte:'Les demandes de matériel des équipes : préparer, remettre, suivre ce qui manque.'},
  {sel:'#eq-app [data-v="mag|mseg|dem"]',titre:'La file des demandes',texte:'Les urgentes d\'abord, puis les plus anciennes. Prépare, remets : la sortie de stock se fait toute seule.'},
  {sel:'#eq-app [data-v="mag|mseg|stock"]',titre:'Stock et commandes',texte:'Le stock du dépôt et ce qui est à commander.'}
 ],
 concepteur:[ /* le traceur (traceur.html) */
  {titre:'Tracé Concepteur',texte:'Ici on dessine le réseau : lignes, pièces, plans de fond. « Enregistrer dans Tracé » l\'envoie dans le chantier.'},
  {sel:'#mTrace',titre:'Tracer une ligne',texte:'Clique les sommets un à un, Entrée pour finir. Les soudures se placent toutes seules.'},
  {sel:'#mAdd',titre:'Les pièces',texte:'Té, vanne, réduction, lyre : choisis, puis touche la ligne à l\'endroit voulu.'},
  {sel:'#bAer, #bgFit',titre:'Fond de plan',texte:'＋ Plan pour un DXF, un PDF ou une image ; 📍 Vue aérienne pour caler sur la rue.'},
  {sel:'#bSave',titre:'Enregistrer dans Tracé',texte:'Le réseau part dans le chantier, soudures numérotées. Les versions précédentes sont gardées.'},
  {sel:'#bUndo',titre:'Annuler',texte:'↶ annule la dernière retouche (Ctrl+Z), ↷ la rétablit.'}
 ],
 equipe:[
  {titre:'Équipe',texte:'Les personnes de SCR, les documents d\'entreprise, la communication interne.'},
  {sel:'#eq-app [data-act="xgo"][data-v="annu"]',titre:'Annuaire',texte:'Toute l\'entreprise par poste, avec les téléphones.'},
  {sel:'#eq-app [data-act="xgo"][data-v="docs"]',titre:'Documents d\'entreprise',texte:'Règlement intérieur, notes de service : à lire et à signer.'}
 ]
};
let A=null;const SEEN_KEY='trace:tuto:';const W=typeof navigator!=='undefined'&&navigator.webdriver;
let cur=null,timer=null,raf=0,tries=0;
const esc=s=>String(s==null?'':s).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'})[c]);
export function initTuto(api){A=api;}
const testOn=()=>{try{return localStorage.getItem('trace:tuto:test')==='1';}catch(e){return false;}};
const who=()=>{try{return (A&&A.key&&A.key())||'anon';}catch(e){return 'anon';}};
function seenAll(){try{return JSON.parse(localStorage.getItem(SEEN_KEY+who())||'{}')||{};}catch(e){return {};}}
export const tutoSeen=k=>!!seenAll()[k];
function markSeen(k,how){const o=seenAll();o[k]={how,at:new Date().toISOString()};try{localStorage.setItem(SEEN_KEY+who(),JSON.stringify(o));}catch(e){}}
export function tutoReset(k){const o=seenAll();if(k)delete o[k];try{if(k)localStorage.setItem(SEEN_KEY+who(),JSON.stringify(o));else localStorage.removeItem(SEEN_KEY+who());}catch(e){}}
const on=()=>!A||!A.on||A.on(); /* option de palier `tutos` (app.js : feat('tutos')) */
// quelque chose est en cours : fenêtre, panneau, saisie, écran de chargement → le tuto attend
function busy(){const d=document;if(d.getElementById('tr-splash'))return true;if(d.querySelector('#modal.show,.sheet.show,.menu.show,.cm-mcard.full,.cm-lcard.full'))return true;const a=d.activeElement;if(a&&/^(INPUT|TEXTAREA|SELECT)$/.test(a.tagName)&&a.type!=='checkbox'&&a.type!=='radio')return true;try{if(A&&A.busy&&A.busy())return true;}catch(e){}return false;}
const stepsOf=k=>(TUTOS[k]||[]).filter(s=>{try{return !s.si||s.si(A);}catch(e){return true;}});
// arrivée dans un écran : le tuto de l'écran s'il n'a jamais été vu (par ce compte, sur cet appareil)
export function tutoArrive(k){if(!k||!TUTOS[k]||!on())return;if(W&&!testOn())return;if(cur)return;if(tutoSeen(k))return;clearTimeout(timer);tries=0;
  const go=()=>{if(cur||tutoSeen(k))return;if(A&&A.where&&A.where()!==k)return; /* on a changé d'écran entre-temps */if(busy()){if(++tries<20)timer=setTimeout(go,1500);return;}tutoStart(k);};
  timer=setTimeout(go,700);}
export function tutoStart(k,o={}){if(!TUTOS[k])return false;const st=stepsOf(k);if(!st.length)return false;tutoClose(null);cur={k,i:0,st,force:!!o.force};paint();
  addEventListener('resize',place);addEventListener('keydown',onKey);loop();return true;}
function onKey(e){if(e.key==='Escape'&&cur){e.preventDefault();tutoClose('passe');}}
function loop(){cancelAnimationFrame(raf);const f=()=>{if(!cur)return;place();raf=requestAnimationFrame(f);};raf=requestAnimationFrame(f);}
export function tutoClose(how){if(!cur){const r0=document.getElementById('tuto');if(r0)r0.remove();return;}const k=cur.k;cur=null;cancelAnimationFrame(raf);removeEventListener('resize',place);removeEventListener('keydown',onKey);
  const r=document.getElementById('tuto');if(r)r.remove();if(how)markSeen(k,how);}
export const tutoOpen=()=>cur?{k:cur.k,i:cur.i,n:cur.st.length}:null;
function target(s){if(!s||!s.sel)return null;for(const q of String(s.sel).split(',')){let el=null;try{el=document.querySelector(q.trim());}catch(e){}if(!el)continue;let r=el.getBoundingClientRect();if(r.width<4||r.height<4)continue;
  const cs=getComputedStyle(el);if(cs.visibility==='hidden'||cs.display==='none')continue;
  if((r.bottom<0||r.top>innerHeight)&&cur&&cur.scrolled!==cur.i){cur.scrolled=cur.i;try{el.scrollIntoView({block:'center'});}catch(e){}r=el.getBoundingClientRect();} /* plus bas dans la page : on la fait venir, une fois */
  if(r.bottom<0||r.top>innerHeight||r.right<0||r.left>innerWidth)continue;return el;}return null;}
function paint(){let root=document.getElementById('tuto');if(!root){root=document.createElement('div');root.id='tuto';root.setAttribute('role','dialog');root.setAttribute('aria-modal','false');document.body.appendChild(root);
    root.addEventListener('click',e=>{const b=e.target.closest('[data-tuto]');if(b){e.stopPropagation();const v=b.dataset.tuto;if(v==='next'){if(cur.i<cur.st.length-1){cur.i++;paint();}else tutoClose('fait');}else if(v==='prev'){if(cur.i>0){cur.i--;paint();}}else tutoClose('passe');return;}
      if(!e.target.closest('.tutoCard')){e.stopPropagation();tutoClose('passe');}});}
  const s=cur.st[cur.i],n=cur.st.length,last=cur.i===n-1,ttl=TUTO_TITRES[cur.k]||'Tracé';
  root.innerHTML=`<div class="tutoHole"></div><div class="tutoCard" aria-live="polite"><div class="tutoMod">${esc(ttl)} · ${cur.i+1} / ${n}</div><b class="tutoT">${esc(s.titre||'')}</b><div class="tutoX">${esc(s.texte||'')}</div>
    <div class="tutoDots">${cur.st.map((x,j)=>`<i class="${j===cur.i?'on':''}"></i>`).join('')}</div>
    <div class="tutoBtns"><button type="button" class="tutoB tutoSkip" data-tuto="skip">${last?'Fermer':'Passer'}</button>${cur.i>0?'<button type="button" class="tutoB" data-tuto="prev" aria-label="Étape précédente">‹</button>':''}<button type="button" class="tutoB tutoGo" data-tuto="next">${last?'Terminé ✓':'Suivant ›'}</button></div></div>`;
  place();const g=root.querySelector('.tutoGo');if(g)try{g.focus({preventScroll:true});}catch(e){}}
function place(){if(!cur)return;const root=document.getElementById('tuto');if(!root)return;const hole=root.querySelector('.tutoHole'),card=root.querySelector('.tutoCard');if(!hole||!card)return;
  const el=target(cur.st[cur.i]);const W0=innerWidth,H0=innerHeight;const cw=Math.min(360,W0-24);card.style.width=cw+'px';
  if(!el){hole.style.display='none';root.classList.add('dim');card.style.left=Math.round((W0-cw)/2)+'px';card.style.top=Math.max(12,Math.round((H0-card.offsetHeight)/2))+'px';return;}
  root.classList.remove('dim');const r=el.getBoundingClientRect();const pad=6;const x=Math.max(4,r.left-pad),y=Math.max(4,r.top-pad),w=Math.min(W0-8,r.right+pad)-x,h=Math.min(H0-8,r.bottom+pad)-y;
  Object.assign(hole.style,{display:'block',left:x+'px',top:y+'px',width:Math.max(0,w)+'px',height:Math.max(0,h)+'px'});
  const ch=card.offsetHeight;let top=y+h+10;if(top+ch>H0-8)top=y-ch-10;if(top<8)top=Math.max(8,Math.min(H0-ch-8,Math.round((H0-ch)/2)));
  let left=Math.round(x+w/2-cw/2);left=Math.max(12,Math.min(W0-cw-12,left));card.style.left=left+'px';card.style.top=Math.round(top)+'px';}
export const tutoKeys=()=>Object.keys(TUTOS);
