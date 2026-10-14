// AUDIT TÉLÉPHONE (nuit du 13 au 14/10/2026 — Ethan : « que tout soit faisable du téléphone, au moins que tout soit bien dans le champ d'un téléphone »).
// Robot qui se connecte en DÉMO (hors connexion) avec plusieurs personnages — Ethan L. (administrateur), Julien R. passé chef de chantier, Karim B. (soudeur),
// Sophie M. (bureau / commerce), un personnage RH ajouté pour le test — et parcourt TOUS les écrans atteignables : onglets du haut / du bas, sous-onglets,
// lignes des hubs (deux niveaux), segments, Administration, une affaire de démo du Commerce (toutes ses étapes), l'écran d'un chantier (plan, menu, fiche
// d'une soudure, onglets Vie du chantier / Technique) et les fenêtres qu'on peut ouvrir sans rien casser (boutons « Nouveau… », « Déclarer… », « Modifier »…).
// À 390×844 et 360×740 (téléphone tactile), puis 1366×900 (PC, affichage large). Pour chaque écran :
//   • débordement de PAGE : le document plus large que l'écran, ou une zone qui défile verticalement (accueil, vue, fenêtre) qui défile aussi en largeur ;
//   • éléments visibles qui sortent de l'écran sans être dans un conteneur qui défile (tableau dans sa carte = accepté) ;
//   • texte coupé (sans « … ») ; boutons principaux < 40 px de haut au téléphone ; fenêtre dont le bouton de validation est inatteignable ;
//   • éléments fixes qui se chevauchent ; erreurs console / exceptions.
// Sortie : rapport JSON (AUDIT_OUT, défaut ./audit_mobile.json), résumé, captures des écrans en défaut (AUDIT_SHOTS, facultatif) ;
// « RESULTAT: TOUT VERT » quand aucun écran parcouru ne déborde en largeur (sinon « RESULTAT: ECHEC » + la liste).
// Options : AUDIT_VP=390,360,1366 · AUDIT_WHO=ethan,julien,karim,sophie,rh · AUDIT_MODALS=0 (sans les fenêtres).
import { chromium } from 'playwright';
import fs from 'fs';
const BASE=process.env.BASE||'http://localhost:8765';
const OUT=process.env.AUDIT_OUT||'audit_mobile.json';const SHOTS=process.env.AUDIT_SHOTS||'';if(SHOTS)fs.mkdirSync(SHOTS,{recursive:true});
const VPS=(process.env.AUDIT_VP||'390,360,1366').split(',').map(Number);
const WHO=(process.env.AUDIT_WHO||'ethan,julien,karim,sophie,rh').split(',');
const MODALS=process.env.AUDIT_MODALS!=='0';const MODALS_PC=process.env.AUDIT_MODALS_PC==='1'; /* sur PC, fenêtres seulement sur demande (temps) */
const PERSOS={ethan:{label:'Ethan (administrateur)'},julien:{label:'Julien (chef de chantier)',poste:'chef'},karim:{label:'Karim (soudeur)'},sophie:{label:'Sophie (bureau / commerce)',poste:'resp_commercial'},rh:{label:'Rose (RH)',add:{id:'rh',name:'Rose H.',role:'resp_rh',detail:'Responsable RH'}}};
const VPDEF={390:{viewport:{width:390,height:844},deviceScaleFactor:2,isMobile:true,hasTouch:true},360:{viewport:{width:360,height:740},deviceScaleFactor:2,isMobile:true,hasTouch:true},1366:{viewport:{width:1366,height:900}}};
const browser=await chromium.launch({headless:true, executablePath: process.env.CHROMIUM_PATH||undefined});
const REPORT={date:new Date().toISOString(),base:BASE,screens:[],errors:[]};const t0=Date.now();let shots=0;
const NOISE=/supabase|Failed to fetch|net::ERR|404|WebSocket|pdf\.worker|cdnjs|ERR_|open-meteo|geopf|geo\.api|Content Security|favicon/i;

// ── mesures DANS la page (un écran) ─────────────────────────────────────────────────────────────────────────────────────────────────
const MEASURE=({phone})=>{
  const W=document.documentElement.clientWidth,H=window.innerHeight;const de=document.documentElement;
  const T=window.TRACE;const scr=T&&T.state?T.state.screen:'?';
  const out={W,H,screen:scr,docOver:Math.max(de.scrollWidth,document.body.scrollWidth)-window.innerWidth,pageScroll:[],sort:[],coupe:[],ellipsis:[],petits:[],petitsSec:[],overlap:[],modal:null};
  if(out.docOver>1){out.docCulprits=[];for(const e of document.querySelectorAll('html *')){if(e.ownerSVGElement&&e.ownerSVGElement.closest('#app'))continue;const r=e.getBoundingClientRect();if(r.width>0&&r.right>window.innerWidth+1){const c=getComputedStyle(e);let fx=c.position==='fixed';for(let a=e.parentElement;a&&!fx;a=a.parentElement)if(getComputedStyle(a).position==='fixed')fx=true;if(fx||!e.closest('#app'))out.docCulprits.push({el:(e.tagName+'#'+e.id+'.'+[...e.classList].join('.')).slice(0,80),right:Math.round(r.right),t:(e.textContent||'').trim().slice(0,40)});if(out.docCulprits.length>=5)break;}}}
  const desc=el=>{let s=el.tagName.toLowerCase();if(el.id)s+='#'+el.id;const c=[...el.classList].slice(0,3).join('.');if(c)s+='.'+c;const da=el.getAttribute&&el.getAttribute('data-act');if(da)s+='[data-act='+da+']';return s;};
  const path=el=>{const p=[];let e=el;for(let i=0;i<4&&e&&e!==document.body;i++,e=e.parentElement)p.unshift(desc(e));return p.join(' > ');};
  const txt=el=>(el.innerText||el.textContent||'').replace(/\s+/g,' ').trim().slice(0,70);
  const csOf=new Map();const cs=el=>{let c=csOf.get(el);if(!c){c=getComputedStyle(el);csOf.set(el,c);}return c;};
  const scrollish=v=>v==='auto'||v==='scroll';const clipish=v=>v!=='visible';
  // zone « de page » : ce qui défile verticalement pour l'écran entier (accueil, vue du chantier, fenêtre, panneau) — pas une bande de puces ni un tableau dans sa carte
  const PAGE_SEL='html,body,#app,.screen,main,.view,#homeBody,#modal,#modal .box,#sheet,.menuBox,.cm-ndrawer,.cm-dw.full,.eq-sheet,.cm-dwplace .box';
  const isPage=el=>{if(el===document.body||el===de||el.matches(PAGE_SEL))return true;const c=cs(el);if(!(c.position==='fixed'||c.position==='absolute'))return false;const r=el.getBoundingClientRect();return scrollish(c.overflowY)&&r.width>=W*0.8&&r.height>=H*0.6;};
  // couche affichée : accueil (écran d'accueil) ou chantier ; le reste est derrière
  const homeOn=(()=>{const h=document.getElementById('homeView');return !!h&&getComputedStyle(h).display!=='none';})();
  const BEHIND=homeOn?['header.topbar','#siteHead','main','#tabbar','#syncWarn','#menu','#loginView']:['#homeView','#loginView'];
  const SKIP=['#canvas','#homeMap','svg','.hmMap','.sheet:not(.show)','#toast','.toolpanel','#homeWait:not(.show)','.ac-fig','.eq-fig'];
  const skipSel=[...BEHIND,...SKIP].join(',');
  const els=[];const w=document.createTreeWalker(document.body,NodeFilter.SHOW_ELEMENT,{acceptNode(el){
    if(el.matches(skipSel))return NodeFilter.FILTER_REJECT;
    if(!el.checkVisibility({checkVisibilityCSS:true})){return getComputedStyle(el).display==='none'?NodeFilter.FILTER_REJECT:NodeFilter.FILTER_SKIP;}
    return NodeFilter.FILTER_ACCEPT;}});
  for(let n=w.nextNode();n;n=w.nextNode())els.push(n);
  // conteneur qui défile ou coupe, AU-DESSUS de l'élément, et qui tient lui-même dans l'écran → l'élément est « rangé » (accepté)
  const contained=el=>{for(let a=el.parentElement;a&&a!==document.body;a=a.parentElement){const c=cs(a);if(c.position==='fixed'&&a.getBoundingClientRect().right<=W+1)return true;if(clipish(c.overflowX)){if(isPage(a))return false;const r=a.getBoundingClientRect();if(r.left>=-1&&r.right<=W+1)return true;}}return false;};
  const reported=new Set();const under=el=>{for(let a=el.parentElement;a;a=a.parentElement)if(reported.has(a))return true;return false;};
  for(const el of els){const r=el.getBoundingClientRect();if(r.width===0&&r.height===0)continue;const c=cs(el);
    // zone de page qui défile en largeur
    if(scrollish(c.overflowX)&&el.scrollWidth>el.clientWidth+1&&isPage(el)){
      // coupable : descendants qui dépassent le bord intérieur droit de la zone
      const lim=r.left+el.clientLeft+el.clientWidth-parseFloat(c.paddingRight||0)+1;const culprits=[];const seen=new Set();
      for(const d of el.querySelectorAll('*')){if(culprits.length>=4)break;if(!d.checkVisibility())continue;const dr=d.getBoundingClientRect();if(dr.width===0||(dr.right<=lim&&dr.left+d.scrollWidth<=lim))continue; /* l'élément, ou son texte qui dépasse */let inner=false,dup=false;for(let a=d.parentElement;a&&a!==el;a=a.parentElement){if(seen.has(a)){dup=true;break;}const ac=cs(a);if(clipish(ac.overflowX)&&a.getBoundingClientRect().right<=lim){inner=true;break;}}if(inner||dup)continue;if(d.ownerSVGElement)continue;seen.add(d);culprits.push({el:path(d),t:txt(d).slice(0,40),right:Math.round(dr.right),w:Math.round(dr.width)});}
      out.pageScroll.push({el:path(el),over:el.scrollWidth-el.clientWidth,culprits});}
    // élément visible qui sort de l'écran sans être rangé dans un conteneur qui défile
    if((r.right>W+1||r.left<-1)&&r.height>0&&!under(el)&&!contained(el)){
      if(c.position==='fixed'&&(r.left>=W||r.right<=0))continue; /* panneau rangé hors écran (tiroir fermé) */
      reported.add(el);out.sort.push({el:path(el),t:txt(el).slice(0,50),left:Math.round(r.left),right:Math.round(r.right),w:Math.round(r.width)});}
    // texte coupé (sans « … ») ou qui dépasse de sa boîte
    if(c.display!=='inline'&&el.clientWidth>0&&[...el.childNodes].some(x=>x.nodeType===3&&x.textContent.trim())&&el.scrollWidth>el.clientWidth+2&&!['INPUT','SELECT','TEXTAREA','OPTION'].includes(el.tagName)){
      const it={el:path(el),t:txt(el).slice(0,50),sw:el.scrollWidth,cw:el.clientWidth};
      if(c.textOverflow==='ellipsis')out.ellipsis.push(it);else if(clipish(c.overflowX)&&!scrollish(c.overflowX))out.coupe.push({...it,k:'coupé'});else if(!scrollish(c.overflowX))out.coupe.push({...it,k:'dépasse'});}
    // boutons (téléphone) : principaux < 40 px de haut ; secondaires < 32 px (pour info)
    if(phone&&el.matches('button,.btn,[role=button],input[type=submit],input[type=button]')&&r.right>0&&r.left<W){
      const prim=el.matches('.primary,.block,.go,[type=submit]')||/^(✓\s*)?(Valider|Enregistrer|Signer|Envoyer|Confirmer|Terminer|Publier|Déclarer|Se connecter)/i.test(txt(el));
      if(prim&&r.height<40)out.petits.push({el:path(el),t:txt(el).slice(0,40),h:Math.round(r.height)});else if(!prim&&r.height<32&&out.petitsSec.length<400)out.petitsSec.push({el:path(el),t:txt(el).slice(0,30),h:Math.round(r.height)});}
  }
  // éléments fixes / barres qui se chevauchent
  const fx=els.filter(el=>{const c=cs(el);if(!(c.position==='fixed'||c.position==='sticky'||(c.position==='absolute'&&(el.parentElement&&(el.parentElement.id==='app'||el.parentElement.classList.contains('screen'))))))return false;const r=el.getBoundingClientRect();return r.width*r.height>64&&r.width*r.height<W*H*0.5&&!/backdrop|modal|sheet|menu/.test(el.className+' '+el.id);});
  ['#homeTabs','#tabbar','header.topbar','.homeHead'].forEach(s=>{const e=document.querySelector(s);if(e&&els.includes(e)&&!fx.includes(e))fx.push(e);});
  for(let i=0;i<fx.length;i++)for(let j=i+1;j<fx.length;j++){const a=fx[i],b=fx[j];if(a.contains(b)||b.contains(a))continue;if(cs(a).position==='sticky'&&cs(b).position==='sticky')continue;const ra=a.getBoundingClientRect(),rb=b.getBoundingClientRect();const ix=Math.min(ra.right,rb.right)-Math.max(ra.left,rb.left),iy=Math.min(ra.bottom,rb.bottom)-Math.max(ra.top,rb.top);if(ix>12&&iy>12)out.overlap.push({a:path(a),b:path(b),ix:Math.round(ix),iy:Math.round(iy)});}
  // fenêtre ouverte : tient dans l'écran ? bouton de validation atteignable ?
  const dlg=document.querySelector('#modal.show .box')||document.querySelector('#modal.show')||document.querySelector('#sheet.show')||document.querySelector('.menu.show .menuBox')||[...document.querySelectorAll('.eq-sheet,.cm-ndrawer,.cm-dwplace .box,[role=dialog]')].find(x=>x.checkVisibility());
  if(dlg){const br=dlg.getBoundingClientRect();const m={el:path(dlg),w:Math.round(br.width),h:Math.round(br.height),left:Math.round(br.left),right:Math.round(br.right),top:Math.round(br.top),bottom:Math.round(br.bottom),fitsW:br.left>=-1&&br.right<=W+1,scroll:dlg.scrollHeight>dlg.clientHeight+2};
    const btns=[...dlg.querySelectorAll('button,.btn,[role=button]')].filter(b=>b.checkVisibility()&&!b.disabled);
    const val=btns.filter(b=>b.matches('.primary,.go,[type=submit]')||/^(✓\s*)?(Valider|Enregistrer|OK|Signer|Envoyer|Créer|Confirmer|Terminer|Publier|Déclarer|Ajouter|Appliquer|Continuer|Suivant)/i.test(txt(b))).pop()||btns[btns.length-1];
    if(val){ /* on amène le bouton à l'écran comme le ferait le doigt : seules les zones qui défilent (auto / scroll) comptent ; positions remises ensuite */
      const anc=[];for(let a=val.parentElement;a;a=a.parentElement)anc.push([a,a.scrollTop,a.scrollLeft]);val.scrollIntoView({block:'nearest',inline:'nearest'});
      const forced=anc.some(([a,t,l])=>(a.scrollTop!==t||a.scrollLeft!==l)&&a!==document.documentElement&&a!==document.body&&!scrollish(getComputedStyle(a).overflowY)&&!scrollish(getComputedStyle(a).overflowX));
      const vr=val.getBoundingClientRect();const cx=vr.left+vr.width/2,cy=vr.top+vr.height/2;const hit=document.elementFromPoint(Math.min(Math.max(cx,0),W-1),Math.min(Math.max(cy,0),H-1));
      m.val={t:txt(val).slice(0,40),h:Math.round(vr.height),ok:!forced&&cx>=0&&cx<=W&&cy>=0&&cy<=H&&!!hit&&(hit===val||val.contains(hit)),forced};
      anc.forEach(([a,t,l])=>{if(a.scrollTop!==t)a.scrollTop=t;if(a.scrollLeft!==l)a.scrollLeft=l;});}
    out.modal=m;}
  out.h2=(document.querySelector('#eq-app h2.vt')||document.querySelector('.view.active h2')||{}).textContent||'';out.h2=out.h2.replace(/\s+/g,' ').trim().slice(0,60);
  return out;};

// ── outils de navigation ──────────────────────────────────────────────────────────────────────────────────────────────────────────
const NAV=[ // ce qu'on parcourt dans un écran : sous-onglets, segments, vues d'administration, lignes des hubs, sous-vues de module
  {k:'chip',sel:'#eq-app .eq-subs .chip'},{k:'seg',sel:'[data-act=parcseg]'},{k:'seg',sel:'#eq-app .af-segs .chip'},{k:'av',sel:'[data-av]'},
  {k:'seg',sel:'[data-act=x][data-v*="|mseg|"]'},{k:'xgo',sel:'[data-act=xgo]'},{k:'row',sel:'.ac-row'}];
const OPEN_RE=/^\s*([＋+➕]|Nouve|Ajouter|Déclarer|Saisir|Demander|Publier|Signaler|Modifier|Définir|Détail|Compléter|Remplir|Fiche|Commander|Réserver|Emprunter|Proposer|Planifier|Inviter|Créer un accès|Nouvel accès|Choisir)/i;
const DANGER_RE=/Supprimer|Retirer|Effacer|Vider|Archiver|connexion|déconnect|Réinitialiser|Clôturer|Quitter|Exporter|Télécharger|Imprimer|PDF|Zip|Excel|CSV|Importer|Envoyer|Synchronis|Relier|Outlook|Photo|📷|Valider|Signer|Pointer|journée|Pause|🗑|✕|Restaurer|Rétablir|Annuler|Refuser|Accepter|Rendre|Remettre/i;
async function inPage(page,fn,arg){try{return await page.evaluate(fn,arg);}catch(e){return {__err:String(e.message||e).slice(0,200)};}}
const settle=page=>page.waitForTimeout(120);
const labelOf=`(el)=>{const b=el.querySelector('.tx > b');let t=(b?b.textContent:(el.innerText||el.textContent)).replace(/\\s+/g,' ').trim();return t.replace(/\\s*\\d+$/,'').slice(0,48);}`;
async function listNav(page,root,maxPer){return inPage(page,([root,NAV,labelOf,maxPer])=>{const L=eval(labelOf);const r=document.querySelector(root);if(!r)return [];const seen=new Set();const out=[];
  NAV.forEach(n=>{const all=[...r.querySelectorAll(n.sel)].filter(e=>e.checkVisibility()&&!e.disabled&&!e.classList.contains('soon')&&!e.classList.contains('locked'));let k=0;all.forEach((e,i)=>{if(seen.has(e)||k>=maxPer)return;const t=L(e);if(!t||/^‹/.test(t))return;if(e.classList.contains('active')||e.classList.contains('on'))return; /* déjà affiché */seen.add(e);k++;out.push({k:n.k,sel:n.sel,t,i});});});return out;},[root,NAV,labelOf,maxPer]);}
async function clickNav(page,root,step){return inPage(page,([root,step,labelOf])=>{const L=eval(labelOf);const r=document.querySelector(root);if(!r)return false;const all=[...r.querySelectorAll(step.sel)].filter(e=>e.checkVisibility());const el=all.find(e=>L(e)===step.t)||null;if(!el)return false;el.click();return true;},[root,step,labelOf]);}
async function closeAll(page){await inPage(page,()=>{const m=document.querySelector('#modal.show');if(m){const b=[...m.querySelectorAll('button')].find(b=>/^(Annuler|Fermer|✕|×|Retour|Plus tard|Non|OK, j'ai compris|Compris)/i.test(b.textContent.trim()));if(b)b.click();if(m.classList.contains('show'))m.classList.remove('show');}
  const s=document.querySelector('#sheet.show');if(s){const bd=document.getElementById('backdrop');if(bd)bd.click();s.classList.remove('show');if(bd)bd.classList.remove('show');}
  const mn=document.querySelector('.menu.show');if(mn)mn.classList.remove('show');
  document.querySelectorAll('.cm-ndrawer,.cm-dwplace').forEach(x=>{const c=x.querySelector('[data-v^="notesdrawer"],button');x.remove();});
  const es=document.querySelector('#eq-app .eq-sheet');if(es){const c=document.querySelector('#eq-app [data-act=close]');if(c)c.click();}});await settle(page);}

// ── un personnage, une largeur ────────────────────────────────────────────────────────────────────────────────────────────────────
async function runOne(vp,who){
  const ctx=await browser.newContext(VPDEF[vp]);const page=await ctx.newPage();const phone=vp<700;
  const errs=[];page.on('pageerror',e=>errs.push('PAGEERROR: '+e.message.slice(0,240)));page.on('console',m=>{if(m.type()==='error'&&!NOISE.test(m.text()))errs.push(m.text().slice(0,200));});
  page.on('dialog',d=>d.dismiss().catch(()=>{}));page.on('popup',p=>p.close().catch(()=>{}));page.on('download',d=>d.cancel().catch(()=>{}));page.on('filechooser',()=>{});
  await page.route(u=>/(^|\.)geopf\.fr$|^geo\.api\.gouv\.fr$|open-meteo\.com$|ign\.fr$|openstreetmap|tile/.test(u.hostname),r=>r.fulfill({status:200,contentType:'application/json',body:'{}'}));
  await page.clock.install({time:new Date(2026,9,14,8,30,0)});
  await page.goto(BASE+'/index.html');await page.waitForTimeout(500);
  await page.evaluate(wide=>{localStorage.clear();if(wide)localStorage.setItem('trace:wide','1');},!phone);
  await page.evaluate(()=>new Promise(r=>{try{const q=indexedDB.deleteDatabase('trace-kv');q.onsuccess=q.onerror=q.onblocked=()=>r();}catch(e){r();}}));
  await page.reload();await page.waitForTimeout(1100);
  {const s=await page.$('#loginSkip');if(s&&await s.isVisible())await s.click();await page.waitForTimeout(600);}
  const P=PERSOS[who];
  await page.evaluate(([who,P])=>{const T=window.TRACE;if(P.add&&!T.USERS.find(u=>u.id===P.add.id))T.USERS.push(P.add);if(P.poste)T.demoPoste(who,P.poste);
    const src=T.sites[Object.keys(T.sites).find(k=>k!=='__vide'&&T.sites[k]&&T.sites[k].lines)];const mk=(id,name,ville,extra)=>{if(T.sites[id]||!src)return;const x=JSON.parse(JSON.stringify(src));x.id=id;x.name=name;x.fiche=Object.assign({ville,secteur:'ouest'},extra||{});T.sites[id]=x;};
    mk('demo_caen','Caen — Presqu\'île','Caen',{chef:'l:ethan'});mk('demo_rennes','Rennes — Baud-Chardonnet','Rennes');
    T.state.userId=who;T.renderHome();},[who,P]);
  await page.waitForTimeout(400);
  const screens=[];const triedModal=new Set();const IMMAT='AA-001-AA';
  const veh=await inPage(page,async im=>{const b0=document.getElementById('htParc');if(!b0||b0.style.display==='none')return false;b0.click();await new Promise(x=>setTimeout(x,250));
    const nb=document.querySelector('#eq-app [data-act=fl][data-v="new|"]');if(!nb)return false;const p0=window.prompt;window.prompt=()=>im;nb.click();window.prompt=p0;await new Promise(x=>setTimeout(x,250));
    const bk=document.querySelector('#eq-app [data-act=fl][data-v="back|"]');if(bk)bk.click();return !!window.TRACE.flotte.get(im);},IMMAT);
  const record=async(label,extra)=>{const m=await inPage(page,MEASURE,{phone});if(m.__err){errs.push('MESURE '+label+': '+m.__err);return null;}
    const s={vp,who,label,...m,...(extra||{})};screens.push(s);
    const bad=s.docOver>1||s.pageScroll.length||s.sort.length||(s.modal&&(!s.modal.fitsW||(s.modal.val&&!s.modal.val.ok)));
    if(bad&&SHOTS&&shots<60){shots++;const f=`${SHOTS}/${String(shots).padStart(2,'0')}_${vp}_${who}_${label.replace(/[^a-z0-9]+/gi,'_').slice(0,60)}.png`;try{await page.screenshot({path:f});s.shot=f;}catch(e){}}
    return s;};
  // fenêtres ouvrables sans rien casser, depuis l'écran courant
  const tryModals=async(label,root,replay)=>{if(!MODALS||(!phone&&!MODALS_PC))return;
    const cands=await inPage(page,([root,O,D])=>{const r=document.querySelector(root);if(!r)return [];const OR=new RegExp(O,'i'),DR=new RegExp(D,'i');return [...r.querySelectorAll('button,.btn,[role=button]')].filter(b=>b.checkVisibility()&&!b.disabled).map(b=>(b.innerText||b.textContent).replace(/\s+/g,' ').trim().slice(0,40)).filter(t=>t&&OR.test(t)&&!DR.test(t)).filter((t,i,a)=>a.indexOf(t)===i).slice(0,3);},[root,OPEN_RE.source,DANGER_RE.source]);
    if(!Array.isArray(cands))return;
    for(const t of cands){const key=label+'|'+t;if(triedModal.has(key))continue;triedModal.add(key);
      const NIN=root=>{const r=document.querySelector(root);return r?[...r.querySelectorAll('input,select,textarea')].filter(x=>x.checkVisibility()).length:0;};
      const before=await inPage(page,([NIN,root])=>{const n=eval(NIN);return {h2:(document.querySelector('#eq-app h2.vt')||{}).textContent||'',scr:window.TRACE.state.screen,nin:n(root)};},[NIN.toString(),root]);
      const ok=await inPage(page,([root,t])=>{const r=document.querySelector(root);const b=[...r.querySelectorAll('button,.btn,[role=button]')].find(b=>b.checkVisibility()&&(b.innerText||b.textContent).replace(/\s+/g,' ').trim().slice(0,40)===t);if(!b)return false;b.click();return true;},[root,t]);
      if(!ok)continue;await page.waitForTimeout(260);
      const open=await inPage(page,()=>!!(document.querySelector('#modal.show,#sheet.show,.menu.show')||[...document.querySelectorAll('.eq-sheet,.cm-ndrawer,.cm-dwplace,[role=dialog]')].find(x=>x.checkVisibility())));
      const after=await inPage(page,([NIN,root])=>{const n=eval(NIN);return {h2:(document.querySelector('#eq-app h2.vt')||{}).textContent||'',scr:window.TRACE.state.screen,nin:n(root)};},[NIN.toString(),root]);
      if(open===true)await record(label+' ▸ fenêtre « '+t+' »',{kind:'modal'});
      else if(after.h2!==before.h2||after.scr!==before.scr||after.nin>before.nin)await record(label+' ▸ « '+t+' »',{kind:'form'});
      await closeAll(page);await replay();}};
  const goHome=async()=>{await closeAll(page);await inPage(page,()=>{const T=window.TRACE;if(T.state.screen!=='home'){T.showScreen('home');}T.renderHome();});await settle(page);};
  const clickId=async id=>{await inPage(page,id=>{const e=document.getElementById(id);if(e)e.click();},id);await settle(page);};
  // exploration générique : écran → éléments de navigation (2 niveaux sous l'onglet)
  const visited=new Set(); // (onglet, nature, libellé) déjà parcouru : les puces d'un sous-onglet restent affichées dans les sous-vues → pas de nouvelle visite
  const explore=async(label,root,replay,depth,tab)=>{
    if(depth>=3||screens.length>300)return;
    const items=await listNav(page,root,depth===0?12:8);if(!Array.isArray(items))return;
    for(const it of items){const vk=tab+'|'+it.k+'|'+it.t;if(visited.has(vk)){it.dup=true;continue;}visited.add(vk);}
    for(const it of items){if(it.dup)continue;await replay();const ok=await clickNav(page,root,it);if(!ok)continue;await settle(page);
      const st=await inPage(page,()=>window.TRACE.state.screen);const lab=label+' › '+it.t;
      if(st==='site'){await record(lab+' (chantier)');await goHome();continue;}
      const dlg=await inPage(page,()=>!!(document.querySelector('#modal.show,#sheet.show')||[...document.querySelectorAll('.eq-sheet,.cm-ndrawer,.cm-dwplace,[role=dialog]')].find(x=>x.checkVisibility())));
      if(dlg===true){await record(label+' ▸ fenêtre « '+it.t+' »',{kind:'modal'});await closeAll(page);continue;} /* la ligne ouvre une fenêtre : mesurée puis refermée */
      const s=await record(lab);
      const rep=async()=>{await replay();await clickNav(page,root,it);await settle(page);};
      await tryModals(lab,root,rep);
      if(s)await explore(lab,root,rep,depth+1,tab);}};
  // 1) écran d'accueil : chaque onglet du bas / du haut, sous-onglets, puis exploration
  const tabs=await inPage(page,()=>[...document.querySelectorAll('#homeTabs button')].filter(b=>b.style.display!=='none'&&b.checkVisibility()).map(b=>({id:b.id,t:b.textContent.trim()})));
  for(const tb of tabs){
    const rep0=async()=>{await goHome();await clickId(tb.id);};await rep0();
    const subs=await inPage(page,()=>{const s=document.getElementById('homeSubTabs');if(!s||s.style.display==='none')return [];return [...s.querySelectorAll('button')].filter(b=>b.style.display!=='none'&&b.checkVisibility()).map(b=>({id:b.id,t:b.textContent.trim()}));});
    if(subs.length){for(const sb of subs){const rep=async()=>{await rep0();await clickId(sb.id);await page.waitForTimeout(sb.id==='htMap'?500:0);};await rep();const lab=tb.t+' › '+sb.t;await record(lab);await tryModals(lab,'#homeBody',rep);await explore(lab,'#homeBody',rep,1,lab);}}
    else{await record(tb.t);await tryModals(tb.t,'#homeBody',rep0);await explore(tb.t,'#homeBody',rep0,0,tb.t);}
  }
  // 1 bis) Parc : fiche d'un véhicule de démo, puis la remise du véhicule (réception) étape par étape
  if(veh===true){const openVeh=async()=>{await goHome();await clickId('htParc');await inPage(page,async im=>{const s=document.querySelector('#eq-app [data-act=parcseg][data-v=flotte]');if(s){s.click();await new Promise(x=>setTimeout(x,150));}const r=document.querySelector(`#eq-app [data-act=fl][data-v="open|${im}"]`);if(r)r.click();await new Promise(x=>setTimeout(x,200));},IMMAT);};
    await openVeh();await record('Parc › Véhicule (fiche)');await tryModals('Parc › Véhicule (fiche)','#homeBody',openVeh);
    await openVeh();const st=await inPage(page,im=>{const b=document.querySelector(`#eq-app [data-act=x][data-v="veh|recep|${im}"]`);if(!b)return false;b.click();return true;},IMMAT);
    if(st===true){await settle(page);for(let i=1;i<=7;i++){const s=await record('Parc › Véhicule › Remise · étape '+i);const sig=JSON.stringify(s&&[s.h2,s.H]);
        const moved=await inPage(page,async()=>{const before=document.getElementById('eq-app').innerHTML.length;const b=document.querySelector('#eq-app [data-act=x][data-v="veh|next|"]');if(!b)return false;
          document.querySelectorAll('#eq-app input[type=checkbox]').forEach(c=>{if(!c.checked)c.click();});document.querySelectorAll('#eq-app input[type=number],#eq-app input[inputmode=numeric]').forEach(c=>{if(!c.value){c.value='12345';c.dispatchEvent(new Event('input',{bubbles:true}));c.dispatchEvent(new Event('change',{bubbles:true}));}});
          b.click();await new Promise(x=>setTimeout(x,220));return document.getElementById('eq-app').innerHTML.length!==before;});
        if(moved!==true)break;}
      await inPage(page,()=>{const c0=window.confirm;window.confirm=()=>true;const b=document.querySelector('#eq-app [data-act=x][data-v="veh|cancel|"]');if(b)b.click();window.confirm=c0;});await settle(page);}}
  // 2) Commerce : une affaire de démo et toutes ses étapes
  const hasCom=tabs.some(t=>t.id==='htCom');
  if(hasCom){const NUM='O2610-77';
    const made=await inPage(page,async n=>{const T=window.TRACE;T.showScreen('home');T.renderHome();document.getElementById('htCom').click();await new Promise(x=>setTimeout(x,250));
      for(let i=0;i<4;i++){const bk=document.querySelector('#eq-app [data-act=af][data-v="back|"],#eq-app .ac-back');if(!bk)break;bk.click();await new Promise(x=>setTimeout(x,150));} /* sortir d'une sous-vue laissée ouverte par l'exploration */
      const sg=document.querySelector('#eq-app [data-act=af][data-v="seg|devis"]');if(sg){sg.click();await new Promise(x=>setTimeout(x,150));}if(!document.querySelector('#eq-app [data-act=af][data-v="create|"]')){const nb=document.querySelector('#eq-app [data-act=af][data-v="new|"]');if(!nb)return 'pas de bouton nouveau';nb.click();await new Promise(x=>setTimeout(x,150));} /* « new| » ouvre ET referme le formulaire */
      const set=(id,v)=>{const e=document.getElementById(id);if(e)e.value=v;};set('afn-num',n);set('afn-nom','Réseau de démonstration — quartier de la gare');set('afn-client','CLIENT DÉMO');set('afn-ville','Rennes');set('afn-etat','devis');set('afn-montant','450000');
      const cb=document.querySelector('#eq-app [data-act=af][data-v="create|"]');if(!cb)return 'pas de bouton créer';cb.click();await new Promise(x=>setTimeout(x,250));return 'ok';},NUM);
    if(made==='ok'){
      const openAff=async()=>{await inPage(page,async n=>{const T=window.TRACE;if(T.state.screen!=='home')T.showScreen('home');T.renderHome();document.getElementById('htCom').click();await new Promise(x=>setTimeout(x,200));for(let i=0;i<4;i++){const bk=document.querySelector('#eq-app [data-act=af][data-v="back|"],#eq-app .ac-back');if(!bk)break;bk.click();await new Promise(x=>setTimeout(x,120));}const sg=document.querySelector('#eq-app [data-act=af][data-v="seg|devis"]');if(sg){sg.click();await new Promise(x=>setTimeout(x,120));}
        const row=[...document.querySelectorAll('#eq-app .af-row,#eq-app [data-act=af]')].find(x=>x.textContent.includes(n)&&!/^seg\|/.test(x.dataset.v||''));if(row)row.click();await new Promise(x=>setTimeout(x,200));},NUM);};
      await openAff();await record('Commerce › Affaire de démo');
      const steps=await inPage(page,()=>[...document.querySelectorAll('#eq-app [data-v^="tab|"]')].map(b=>({v:b.dataset.v,t:b.textContent.replace(/\s+/g,' ').trim()})));
      for(const st of (Array.isArray(steps)?steps:[])){const rep=async()=>{await openAff();await inPage(page,v=>{const b=document.querySelector(`#eq-app [data-v="${v}"]`);if(b)b.click();},st.v);await page.waitForTimeout(250);};
        await rep();const lab='Commerce › Affaire › '+st.t;await record(lab);await tryModals(lab,'#homeBody',rep);}
    }else REPORT.errors.push({vp,who,err:'affaire de démo : '+made});
  }
  // 3) un chantier : plan, menu, fiche d'une soudure, onglets Vie du chantier / Technique
  const opened=await inPage(page,async()=>{const T=window.TRACE;T.showScreen('home');T.renderHome();const id=Object.keys(T.sites).find(k=>k!=='__vide'&&T.sites[k]&&T.sites[k].lines&&!/^demo_/.test(k));if(!id)return false;await T.openSiteFromHome(id);await new Promise(x=>setTimeout(x,900));return T.state.screen==='site'?id:false;});
  if(opened){const site=opened;const reSite=async()=>{await inPage(page,async id=>{const T=window.TRACE;if(T.state.screen!=='site'||T.state.siteId!==id){await T.openSiteFromHome(id);await new Promise(x=>setTimeout(x,700));}},site);};
    await record('Chantier › Plan');
    await clickId('btnMenu');await record('Chantier › Menu',{kind:'modal'});await closeAll(page);
    const j=await inPage(page,()=>{const T=window.TRACE;for(const [lid,L] of Object.entries(T.lines||{})){for(const c of Object.keys(L.cond||{})){if((L.cond[c].joints||[]).length){T.openJoint(lid,c,0);return lid;}}}return false;});
    if(j){await page.waitForTimeout(650); /* panneau qui glisse (transition 0,22 s) : mesuré une fois arrêté */await record('Chantier › Fiche d\'une soudure',{kind:'modal'});await closeAll(page);}
    for(const f of ['vie','tech']){
      await reSite();await inPage(page,f=>{const b=document.querySelector(`#facets [data-facet="${f}"]`);if(b)b.click();},f);await settle(page);
      const tbs=await inPage(page,()=>[...document.querySelectorAll('#tabbar [data-tab]')].filter(b=>!b.classList.contains('fhide')&&b.checkVisibility()).map(b=>({tab:b.dataset.tab,t:b.textContent.trim()})));
      for(const tb of (Array.isArray(tbs)?tbs:[])){const rep=async()=>{await reSite();await inPage(page,([f,t])=>{const fb=document.querySelector(`#facets [data-facet="${f}"]`);if(fb)fb.click();const b=document.querySelector(`#tabbar [data-tab="${t}"]`);if(b)b.click();},[f,tb.tab]);await page.waitForTimeout(250);};
        await rep();const lab='Chantier › '+(f==='vie'?'Vie du chantier':'Technique')+' › '+tb.t;await record(lab);await tryModals(lab,'.view.active',rep);
        // sous-onglets / lignes à l'intérieur de l'onglet du chantier (un niveau)
        const items=await listNav(page,'.view.active',6);if(Array.isArray(items))for(const it of items){await rep();if(!await clickNav(page,'.view.active',it))continue;await settle(page);const sc=await inPage(page,()=>window.TRACE.state.screen);await record(lab+' › '+it.t+(sc!=='site'?' (accueil)':''));}
      }}
    await goHome();
  }else REPORT.errors.push({vp,who,err:'chantier de démo non ouvert'});
  await ctx.close();
  return {screens,errs};}

for(const vp of VPS)for(const who of WHO){const t1=Date.now();let r;try{r=await runOne(vp,who);}catch(e){REPORT.errors.push({vp,who,err:'CRASH '+String(e.message||e).slice(0,300)});continue;}
  REPORT.screens.push(...r.screens);if(r.errs.length)REPORT.errors.push(...[...new Set(r.errs)].map(e=>({vp,who,err:e})));
  console.log(`· ${vp} px · ${PERSOS[who].label} : ${r.screens.length} écrans en ${Math.round((Date.now()-t1)/1000)} s`+(r.errs.length?` · ${r.errs.length} erreur(s) console`:''));}
await browser.close();

// ── synthèse ─────────────────────────────────────────────────────────────────────────────────────────────────────────────────────
const S=REPORT.screens;const page_=s=>s.docOver>1||s.pageScroll.length>0||s.sort.length>0;
const fails=S.filter(page_);const modBad=S.filter(s=>s.modal&&(!s.modal.fitsW||(s.modal.val&&!s.modal.val.ok)));
const small=S.filter(s=>s.petits.length);const cut=S.filter(s=>s.coupe.length);const ov=S.filter(s=>s.overlap.length);
REPORT.summary={screens:S.length,uniques:new Set(S.map(s=>s.vp+'|'+s.label)).size,pageOverflow:fails.length,modalsBad:modBad.length,smallPrimary:small.length,textCut:cut.length,overlap:ov.length,consoleErrors:REPORT.errors.length,seconds:Math.round((Date.now()-t0)/1000)};
fs.writeFileSync(OUT,JSON.stringify(REPORT,null,1));
console.log('\nRÉSUMÉ :',JSON.stringify(REPORT.summary));
const grp=(arr,f)=>{const m=new Map();arr.forEach(s=>{const k=f(s);if(!m.has(k))m.set(k,[]);m.get(k).push(s);});return m;};
if(fails.length){console.log('\n— DÉBORDEMENTS DE PAGE (écran · largeur · personnages · élément) :');
  for(const [k,arr] of grp(fails,s=>s.vp+' px · '+s.label)){const s=arr[0];const el=(s.pageScroll[0]&&(s.pageScroll[0].culprits[0]||{}).el)||(s.sort[0]||{}).el||('document '+JSON.stringify((s.docCulprits||[]).slice(0,2)));const over=s.docOver>1?s.docOver:(s.pageScroll[0]?s.pageScroll[0].over:(s.sort[0]?s.sort[0].right-s.W:0));console.log(`  ✗ ${k} · ${[...new Set(arr.map(x=>x.who))].join(',')} · +${over}px · ${el}${s.sort[0]?' « '+s.sort[0].t+' »':''}`);}}
if(modBad.length){console.log('\n— FENÊTRES qui ne tiennent pas / validation inatteignable :');for(const [k,arr] of grp(modBad,s=>s.vp+' px · '+s.label)){const m=arr[0].modal;console.log(`  ✗ ${k} · ${JSON.stringify({w:m.w,h:m.h,fitsW:m.fitsW,val:m.val})}`);}}
if(small.length){console.log('\n— BOUTONS PRINCIPAUX < 40 px (téléphone) :');for(const [k,arr] of grp(small.flatMap(s=>s.petits.map(p=>({...s,p}))),x=>x.p.el+' « '+x.p.t+' »')){console.log(`  · ${k} · ${arr[0].p.h}px · ${[...new Set(arr.map(x=>x.vp+' '+x.label))].slice(0,2).join(' | ')}`);}}
if(cut.length){console.log('\n— TEXTE COUPÉ / QUI DÉPASSE (échantillon) :');const m=grp(cut.flatMap(s=>s.coupe.map(c=>({...s,c}))),x=>x.c.el);[...m.entries()].slice(0,25).forEach(([k,arr])=>console.log(`  · ${arr[0].c.k} ${k} « ${arr[0].c.t} » ${arr[0].c.sw}/${arr[0].c.cw} · ${arr[0].vp} ${arr[0].label}`));}
if(ov.length){console.log('\n— CHEVAUCHEMENTS d\'éléments fixes (échantillon) :');const m=grp(ov.flatMap(s=>s.overlap.map(o=>({...s,o}))),x=>x.o.a+' ⟷ '+x.o.b);[...m.entries()].slice(0,15).forEach(([k,arr])=>console.log(`  · ${k} (${arr[0].o.ix}×${arr[0].o.iy}) · ${arr[0].vp} ${arr[0].label}`));}
if(REPORT.errors.length){console.log('\n— ERREURS console / exceptions :');[...new Set(REPORT.errors.map(e=>e.err))].slice(0,20).forEach(e=>console.log('  · '+e));}
console.log('\nRapport JSON :',OUT);
const crash=REPORT.errors.filter(e=>/^CRASH/.test(e.err));const ko=fails.length||crash.length||!S.length; /* un parcours interrompu n'est jamais « vert » */
console.log(ko?'RESULTAT: ECHEC '+[...new Set(fails.map(s=>s.vp+'px:'+s.label))].join(' | ')+(crash.length?' | parcours interrompu ('+crash.length+')':'')+(!S.length?' | aucun écran mesuré':''):'RESULTAT: TOUT VERT');
process.exit(ko?1:0);
