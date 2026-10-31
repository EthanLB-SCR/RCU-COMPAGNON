// 31/10 (lot MD) — MODIFS DÉCLARÉES. Ethan : « pour les modifs on va changer la manière de les appréhender : par défaut on va juste avoir la comparaison avant modif, et comme
// il n'y a pas de pastille par défaut à classer, tout est compris ; on va juste créer la possibilité de « déclarer une modif » ou autre, où là on dit ce qu'on veut ressortir — le
// changement de DN, le nombre de soudures, les pièces ou autre… — et pointé sur plan, pour déclarer ça en TS ou autre. Les pastilles, l'idée était bien mais ça ne marche pas. »
// Réseau FICTIF (celui de e2e_mod_2910) : MARCHÉ feeder L1 DN 150 (réduction 150/125 PK 135), antenne A (L2, DN 65), antenne B (L3, DN 80) ; VERSION 2 : L2 supprimée, L3
// prolongée et passée en DN 100 (té 100/80), réduction du feeder déplacée au PK 275.
//  c1  onglet Modifs par défaut : comparaison marché ↔ réel + « tout est compris », écarts résumés ; ni « à attribuer », ni pastille sur l'onglet, ni toast ; plan : pas
//      d'éléments − / +, écarts surlignés (jaune) et changements de DN (« DN 125 → 150 »)
//  c2  « ＋ Déclarer une modif » : propositions tirées des écarts (changement de DN, ml par DN, pièces) ; 2 propositions + 1 ligne à la main (coudes) ; aperçu en clair
//  c3  « 📍 Pointer sur le plan » : vrais touchers sur le plan (2 points sur l'antenne B, un 3e retiré en le re-touchant) → retour à la fenêtre, points listés → modif n°1
//      déclarée (kind decl, 3 lignes, 2 points sur L3, journal) ; carte dans l'onglet ; 2 repères n°1 sur le plan
//  c4  toucher un repère → fiche de la modif ; ✎ Modifier (pré-rempli) → TS commandé → journal « état : TS proposé → TS commandé »
//  c5  récap par état + export imprimable (lignes, emplacement, plan avec repères, pas de « à attribuer »)
//  c6  validations : sans ligne, DN identique, TS commandé sans devis → messages, rien d'enregistré
//  c7  ancienne modif par éléments (API de l'ancien mode) : créée, lisible (carte, repère), la modif déclarée n'est pas effacée ; « Avancé » : éléments − / + à la demande
//  c8  ＋ Poser → « Déclarer une modif » : pointer d'abord, puis la fenêtre (1 point) ; fiche d'une soudure : « Modifications » (n°1 à proximité) + « Déclarer une modif ici »
//  c9  soudeur : pas d'onglet Modifs, pas de surlignage d'écarts, repère lisible sans « Modifier »
//  c10 téléphone 390 et 360 : fenêtre et barre « pointer » sans débordement, gros boutons · c11 console propre
//  c12 « 🔒 Re-figer » → « C'est mon tracé de base » : les modifs déclarées sont gardées
import { chromium } from 'playwright';
const BASE=process.env.BASE||'http://localhost:8765';const SHOTS=process.env.SHOTS||null;
const browser=await chromium.launch({headless:true, executablePath: process.env.CHROMIUM_PATH||undefined});
const C={};const logs=[];const J=x=>JSON.stringify(x);
const ctx=await browser.newContext({viewport:{width:1366,height:900},deviceScaleFactor:1});const page=await ctx.newPage();
const watch=pg=>{pg.on('pageerror',e=>logs.push('PAGEERROR: '+e.message.slice(0,300)));pg.on('console',m=>{if(m.type()==='error'&&!/supabase|Failed to fetch|net::ERR|404|geopf|WebSocket/i.test(m.text()))logs.push(m.text().slice(0,200));});pg.on('dialog',d=>d.accept().catch(()=>{}));};watch(page);
const shot=async(n,pg)=>{if(SHOTS)await (pg||page).screenshot({path:`${SHOTS}/md_${n}.png`});};const wait=ms=>page.waitForTimeout(ms);
const toasts=[];await page.exposeFunction('__toast',t=>toasts.push(t));
/* ── réseau fictif : marché puis version 2 (comme e2e_mod_2910) */
await page.goto(BASE+'/traceur.html');await wait(500);await page.evaluate(()=>localStorage.clear());await page.reload();await wait(500);
await page.evaluate(()=>{const S=window.MAQ.state;S.lines=[
  {id:'L1',name:'Rue Principale',dn:150,bar:12,pts:[[0,0],[420,0]],specials:[{id:'R1',type:'reducer',m:135,dn2:125}],parent:null},
  {id:'L2',name:'Antenne A',dn:65,bar:12,pts:[[120,0],[120,90]],specials:[],parent:{line:'L1',m:120,side:1}},
  {id:'L3',name:'Antenne B',dn:80,bar:12,pts:[[260,0],[260,70]],specials:[],parent:{line:'L1',m:260,side:1}}];S.seq=4;window.MAQ.setMode('select');window.MAQ.rebuild();});
await page.click('#bSave');await wait(200);await page.fill('#svName','Déclarées test');await page.click('#svOk');await wait(800);
await page.click('#svGo');await wait(1500);await page.selectOption('#roleSel','ethan');await wait(300);
const siteId=await page.evaluate(()=>window.TRACE.state.siteId);
await page.goto(BASE+'/traceur.html?site='+encodeURIComponent(siteId));await wait(1500);
await page.evaluate(()=>{const S=window.MAQ.state;S.lines=S.lines.filter(l=>l.id!=='L2');const f=S.lines.find(l=>l.id==='L1');f.specials=[{id:'R1',type:'reducer',m:275,dn2:125}];const b=S.lines.find(l=>l.id==='L3');b.dn=100;b.pts=[[260,0],[260,70],[260,90],[120,90]];b.specials=[{id:'T2',type:'tee',m:70,dnb:80}];window.MAQ.rebuild();});
await page.click('#bSave');await wait(200);await page.selectOption('#svMode','update');await page.click('#svOk');await wait(800);
await page.click('#svGo');await wait(1800);await page.selectOption('#roleSel','ethan');await wait(400);
await page.evaluate(()=>{const t=document.getElementById('toast');if(t)new MutationObserver(()=>{const x=t.textContent.trim();if(x)window.__toast(x);}).observe(t,{childList:true,characterData:true,subtree:true});});
const T=(fn,arg)=>page.evaluate(fn,arg);
/* ── c1 : par défaut */
await T(()=>{const X=window.TRACE;X.state.tab='plan';X.renderAll();});await wait(600);
let o={plan:await T(()=>({els:document.getElementById('tsG').querySelectorAll('[data-mod-el]').length,pins:document.getElementById('tsG').querySelectorAll('[data-modpin]').length,mar:(document.getElementById('marG').innerHTML.match(/#ffe08a/g)||[]).length,dn:/DN 125 → 150/.test(document.getElementById('marG').textContent)&&/DN 80 → 100/.test(document.getElementById('marG').textContent)}))};
await T(()=>{const X=window.TRACE;X.state.tab='ts';X.renderAll();});await wait(600);
o.tab=await T(()=>{const v=document.getElementById('tsview');const t=v.innerText;return {compris:/Par défaut, tout est compris/.test(t),table:!!v.querySelector('table.tsMain'),ec:(v.querySelector('.mdEc')||{}).textContent||'',attrib:/à attribuer/i.test(t),decl:!!v.querySelector('[data-mod="decl"]'),adv:!!v.querySelector('[data-mod="adv"]'),todo:v.querySelectorAll('.mdRow').length,badge:!!document.querySelector('#tabbar [data-tab=ts] .tsBadge')};});
o.toast=toasts.filter(t=>/attribuer/.test(t));
console.log('c1) par défaut :',J(o));await shot('1_onglet');
C.c1=o.plan.els===0&&o.plan.pins===0&&o.plan.mar>0&&o.plan.dn&&o.tab.compris&&o.tab.table&&/\+70 m/.test(o.tab.ec)&&/2 changements de DN/.test(o.tab.ec)&&!o.tab.attrib&&o.tab.decl&&o.tab.adv&&o.tab.todo===0&&!o.tab.badge&&!o.toast.length;
/* ── c2 : déclarer — propositions + ligne à la main */
await page.click('#tsview [data-mod="decl"]');await wait(400);
o={modal:await T(()=>({show:document.getElementById('modal').classList.contains('show'),h:(document.querySelector('#modal h2')||{}).textContent,props:[...document.querySelectorAll('#modal [data-mod^="dcl-prop:"]')].map(b=>b.textContent.trim()),et:(document.querySelector('#modal .dclEtB.on')||{}).textContent}))};
const iDN=o.modal.props.findIndex(t=>/DN 125 → DN 150/.test(t)),iML=o.modal.props.findIndex(t=>/\+229,5 m DN 100|\+2\d\d(,\d)? m DN 100/.test(t));
await page.click(`#modal [data-mod="dcl-prop:${iDN}"]`);await wait(250);await page.click(`#modal [data-mod="dcl-prop:${iML}"]`);await wait(250);
await page.click('#modal [data-mod="dcl-add:piece"]');await wait(250);
await page.selectOption('#modal [data-dcl="2:k"]','coudes');await wait(200);await page.fill('#modal [data-dcl="2:abs"]','2');await page.selectOption('#modal [data-dcl="2:dn"]','100');await wait(150);
await page.fill('#modal [data-dcf="nom"]','Antenne B prolongée et passée en DN 100');await page.fill('#modal [data-dcf="devis"]','DEV-T-001');await wait(150);
o.lines=await T(()=>[...document.querySelectorAll('#modal [data-dclprev]')].map(x=>x.textContent.trim()));o.propOn=await T(()=>document.querySelectorAll('#modal .dclP.on').length);
console.log('c2) fenêtre :',J(o));await shot('2_fenetre');
C.c2=o.modal.show&&/Déclarer une modif/.test(o.modal.h)&&iDN>=0&&iML>=0&&o.modal.props.some(t=>/\+2 coudes DN 100/.test(t))&&o.modal.props.length<=12&&o.modal.et==='TS proposé'&&o.lines.length===3&&/DN 125 → DN 150 sur 139/.test(o.lines[0])&&/m DN 100/.test(o.lines[1])&&/\+2 coudes DN 100/.test(o.lines[2])&&o.propOn===2;
/* ── c3 : pointer sur le plan (vrais touchers) puis enregistrer */
await page.click('#modal [data-mod="dcl-pick"]');await wait(500);
const ptOn=async(frac)=>T(f=>{const X=window.TRACE;const e=X.mod.elements().filter(e=>e.line==='L3'&&e.kind==='tube'&&e.s>0&&e.path&&e.path.length>1).sort((a,b)=>(b.q.ml||0)-(a.q.ml||0))[0];const P=e.path;let L=0;const seg=[];for(let i=1;i<P.length;i++){const d=Math.hypot(P[i][0]-P[i-1][0],P[i][1]-P[i-1][1]);seg.push(d);L+=d;}let t=L*f;for(let i=1;i<P.length;i++){if(t<=seg[i-1]||i===P.length-1){const u=seg[i-1]?Math.min(1,t/seg[i-1]):0;return {x:P[i-1][0]+(P[i][0]-P[i-1][0])*u,y:P[i-1][1]+(P[i][1]-P[i-1][1])*u};}t-=seg[i-1];}return {x:P[0][0],y:P[0][1]};},frac); /* un point du nouveau tube de l'antenne B (coordonnées de l'appli) */
const center=async(p)=>T(p=>{const X=window.TRACE;X.centerOn(p.x,p.y,2.2);},p); /* centerOn applique la vue au dessin (sinon le DOM ne suit pas state.view) */
const tapW=async(p)=>{const s=await T(p=>{const X=window.TRACE;const c=document.getElementById('canvas').getBoundingClientRect();const v=X.state.view;return [c.left+p.x*v.k+v.tx,c.top+p.y*v.k+v.ty];},p);await page.mouse.click(s[0],s[1]);await wait(250);};
const pA=await ptOn(0.25),pB=await ptOn(0.6),pC=await ptOn(0.9);await center(pB);await wait(200);
o={pick:await T(()=>({on:window.TRACE.mod.picking(),bar:getComputedStyle(document.getElementById('modPickBar')).display,modal:document.getElementById('modal').classList.contains('show'),tab:window.TRACE.state.tab,yel:(document.getElementById('marG').innerHTML.match(/#ffe08a/g)||[]).length}))};
await tapW(pA);await tapW(pB);await tapW(pC);o.three=await T(()=>window.TRACE.mod.draft().pts.length);await tapW(pC);/* re-toucher le 3e = l'enlever */
o.draft=await T(()=>window.TRACE.mod.draft().pts.map(p=>({line:p.line,m:p.m})));o.barTxt=await T(()=>document.getElementById('modPickBar').textContent.replace(/\s+/g,' ').slice(0,200));await shot('3_pointer');
await page.click('#modPickBar [data-mod="pick-ok"]');await wait(400);
o.back=await T(()=>({modal:document.getElementById('modal').classList.contains('show'),pts:[...document.querySelectorAll('#modal .dclPt')].map(x=>x.textContent.replace(/\s+/g,' ').trim()),lines:document.querySelectorAll('#modal .dclLn').length,nom:document.querySelector('#modal [data-dcf="nom"]').value}));
await page.click('#modal [data-mod="dcl-save"]');await wait(600);
o.saved=await T(()=>{const X=window.TRACE;const Mo=X.mod.of();const m=Mo.items.find(x=>x.kind==='decl');return m?{n:m.n,etat:m.etat,devis:m.devis,nom:m.nom,lignes:m.decl.lignes.length,pts:m.decl.pts.map(p=>p.line),log:m.log.length,line:m.line}:null;});
await T(()=>{const X=window.TRACE;X.state.tab='ts';X.renderAll();});await wait(400);
o.card=await T(()=>{const c=document.querySelector('#tsview .dclCard');return c?c.textContent.replace(/\s+/g,' ').slice(0,300):null;});
await T(()=>{const X=window.TRACE;X.state.tab='plan';X.renderAll();});await wait(400);
o.pins=await T(()=>[...document.getElementById('tsG').querySelectorAll('[data-modpin]')].map(g=>g.textContent.trim().slice(0,30)));
console.log('c3) pointer + enregistrer :',J(o));await shot('3b_reperes');
C.c3=o.pick.on&&o.pick.bar==='flex'&&!o.pick.modal&&o.pick.tab==='plan'&&o.pick.yel>0&&o.three===3&&o.draft.length===2&&o.draft.every(p=>p.line==='L3')&&o.back.modal&&o.back.pts.length===2&&o.back.pts.every(t=>/Antenne B · PK/.test(t))&&o.back.lines===3
  &&o.saved&&o.saved.n===1&&o.saved.etat==='propose'&&o.saved.devis==='DEV-T-001'&&o.saved.lignes===3&&o.saved.pts.join()==='L3,L3'&&o.saved.line==='L3'&&o.saved.log===1&&/n°1/.test(o.card||'')&&/TS proposé/.test(o.card||'')&&/Antenne B · PK/.test(o.card||'')&&o.pins.length===2&&o.pins.every(t=>/^1/.test(t));
/* ── c4 : toucher le repère → fiche ; Modifier → TS commandé */
const pin=await T(()=>{const m=window.TRACE.mod.of().items.find(x=>x.kind==='decl');return {x:m.decl.pts[0].x,y:m.decl.pts[0].y};});await center(pin);await wait(200);await tapW(pin);await wait(300);
o={fiche:await T(()=>({show:document.getElementById('modal').classList.contains('show'),txt:document.querySelector('#modal').textContent.replace(/\s+/g,' ').slice(0,300),edit:!!document.querySelector('#modal [data-mod^="dcl-edit:"]')}))};
await page.click('#modal [data-mod^="dcl-edit:"]');await wait(400);
o.pre=await T(()=>({lines:document.querySelectorAll('#modal .dclLn').length,pts:document.querySelectorAll('#modal .dclPt').length,nom:document.querySelector('#modal [data-dcf="nom"]').value,h:(document.querySelector('#modal h2')||{}).textContent}));
await page.click('#modal [data-mod="dcl-et:commande"]');await wait(250);await page.click('#modal [data-mod="dcl-save"]');await wait(500);
o.after=await T(()=>{const m=window.TRACE.mod.of().items.find(x=>x.kind==='decl');return {etat:m.etat,log:m.log.map(x=>x.txt)};});
console.log('c4) repère, modifier :',J(o));
C.c4=o.fiche.show&&/n°1/.test(o.fiche.txt)&&/Changement de DN/.test(o.fiche.txt)&&o.fiche.edit&&o.pre.lines===3&&o.pre.pts===2&&/Antenne B prolongée/.test(o.pre.nom)&&/Modifier la modif n°1/.test(o.pre.h)&&o.after.etat==='commande'&&o.after.log.some(t=>/état : TS proposé → TS commandé/.test(t));
/* ── c5 : récap + export */
await T(()=>{const X=window.TRACE;X.state.tab='ts';X.renderAll();});await wait(400);
o={recap:await T(()=>{const r=document.querySelector('#tsview .dclRecap');return r?r.textContent.replace(/\s+/g,' '):'';})};
o.exp=await T(()=>{const h=window.TRACE.mod.exportHTML();return {title:/Modifications du tracé/.test(h),n1:/n°1/.test(h),cmd:/TS commandé/.test(h),dn:/Changement de DN : DN 125 → DN 150/.test(h),pt:/Antenne B · PK/.test(h),svg:(h.match(/<svg/g)||[]).length,attrib:/attribuer/i.test(h),cmp:/Comparaison marché → réel/.test(h)&&/Changements de DN/.test(h),devis:/DEV-T-001/.test(h)};});
console.log('c5) récap + export :',J(o));await shot('5_recap');
C.c5=/TS commandé/.test(o.recap)&&/Changement de DN : DN 125 → DN 150/.test(o.recap)&&/\+2 coudes DN 100/.test(o.recap)&&Object.entries(o.exp).every(([k,v])=>k==='attrib'?v===false:k==='svg'?v>=2:v===true);
/* ── c6 : validations */
await page.click('#tsview [data-mod="decl"]');await wait(300);
const msg=()=>T(()=>(document.getElementById('dclMsg')||{}).textContent||'');
await page.click('#modal [data-mod="dcl-save"]');await wait(200);o={none:await msg()};
await page.click('#modal [data-mod="dcl-add:dn"]');await wait(200);await page.selectOption('#modal [data-dcl="0:dnA"]','100');await page.selectOption('#modal [data-dcl="0:dnB"]','100');await page.click('#modal [data-mod="dcl-save"]');await wait(200);o.same=await msg();
await page.selectOption('#modal [data-dcl="0:dnB"]','125');await page.click('#modal [data-mod="dcl-et:commande"]');await wait(200);await page.click('#modal [data-mod="dcl-save"]');await wait(200);o.devis=await msg();
o.count=await T(()=>window.TRACE.mod.of().items.length);await page.click('#modal [data-mod="dcl-cancel"]');await wait(200);o.closed=await T(()=>!document.getElementById('modal').classList.contains('show')&&!window.TRACE.mod.draft());
console.log('c6) validations :',J(o));
C.c6=/au moins une ligne/.test(o.none)&&/mêmes/.test(o.same)&&/devis/.test(o.devis)&&o.count===1&&o.closed;
/* ── c7 : ancienne modif par éléments + « Avancé » */
o={old:await T(()=>{const X=window.TRACE;const E=X.mod.elements();const v=E.filter(e=>e.k==='reducer');X.mod.start({sel:v.map(e=>e.id),panel:true});X.mod.compare(v.map(e=>e.id)).forEach(r=>X.mod.setQual(r.key,'note'));const m=X.mod.commit({nom:'Réduction déplacée (ancien mode)'});X.mod.end();const Mo=X.mod.of();return {m:!!m,n:Mo.items.length,kinds:Mo.items.map(x=>x.kind||'els').join(','),decl:!!Mo.items.find(x=>x.kind==='decl')};})};
await T(()=>{const X=window.TRACE;X.state.tab='ts';X.renderAll();});await wait(300);
o.tab=await T(()=>({cards:document.querySelectorAll('#tsview .mdCard').length,old:/Réduction déplacée/.test(document.getElementById('tsview').textContent),recapOld:/Récap par qualification/.test(document.getElementById('tsview').textContent)}));
await page.click('#tsview [data-mod="adv"]');await wait(400);o.adv=await T(()=>({open:!!document.querySelector('#tsview .mdAdv'),start:!!document.querySelector('#tsview .mdAdv [data-mod="start"]'),rows:document.querySelectorAll('#tsview .mdAdv .mdRow').length,h:(document.querySelector('#tsview .mdAdv .mdH')||{}).textContent||''}));
await page.click('#tsview [data-mod="els-layer"]');await wait(300);await T(()=>{const X=window.TRACE;X.state.tab='plan';X.renderAll();});await wait(400);
o.layer=await T(()=>({els:document.getElementById('tsG').querySelectorAll('[data-mod-el]').length,pins:document.getElementById('tsG').querySelectorAll('[data-modpin]').length}));
await T(()=>{const X=window.TRACE;X.state.show.modEls=false;X.renderPlan();});await wait(200);o.layerOff=await T(()=>document.getElementById('tsG').querySelectorAll('[data-mod-el]').length);
console.log('c7) ancienne modif + avancé :',J(o));
C.c7=o.old.m&&o.old.n===2&&o.old.decl&&o.tab.cards===2&&o.tab.old&&o.tab.recapOld&&o.adv.open&&o.adv.start&&o.adv.rows>0&&/comptés compris/.test(o.adv.h)&&o.layer.els>0&&o.layer.pins===3&&o.layerOff===0;
/* ── c8 : ＋ Poser → déclarer (pointer d'abord) ; fiche d'une soudure */
await T(()=>{const X=window.TRACE;X.state.tab='plan';X.renderAll();});await wait(300);
await page.click('#planFab');await wait(300);o={poser:await T(()=>{const b=document.querySelector('#modal [data-pose-mode="ts"]');return b?b.textContent.replace(/\s+/g,' ').trim():null;})};
await page.click('#modal [data-pose-mode="ts"]');await wait(400);o.first=await T(()=>({pick:window.TRACE.mod.picking(),go:(document.querySelector('#modPickBar [data-mod="pick-ok"]')||{}).textContent||''}));
const pD=await T(()=>{const X=window.TRACE;const e=X.mod.elements().find(e=>e.line==='L1'&&e.kind==='tube'&&e.path&&e.path.length>1);const P=e.path;return {x:(P[0][0]+P[P.length-1][0])/2,y:(P[0][1]+P[P.length-1][1])/2};}); /* milieu du tronçon passé en DN 150 de la rue principale */await center(pD);await wait(200);await tapW(pD);
await page.click('#modPickBar [data-mod="pick-ok"]');await wait(400);o.form=await T(()=>({show:document.getElementById('modal').classList.contains('show'),pts:[...document.querySelectorAll('#modal .dclPt')].map(x=>x.textContent.replace(/\s+/g,' ').trim())}));
await page.click('#modal [data-mod="dcl-cancel"]');await wait(200);
o.joint=await T(()=>{const X=window.TRACE;const l=X.state.lines.L3;const cd=l.cond.A;const m=X.mod.of().items.find(x=>x.kind==='decl');const pm=m.decl.pts[0].m;let best=0,bd=1e9;cd.joints.forEach((j,i)=>{const e=cd.els[j.idx];if(!e)return;const d=Math.abs(+e.m1-pm);if(d<bd){bd=d;best=i;}});X.openJoint('L3','A',best);const sh=document.getElementById('sheet');const box=[...sh.querySelectorAll('.infobox')].find(b=>/Modifications/.test(b.textContent));return {box:box?box.textContent.replace(/\s+/g,' ').slice(0,200):null,here:!!sh.querySelector('[data-mod^="dcl-here:"]')};});
await page.click('#sheet [data-mod^="dcl-here:"]');await wait(400);o.here=await T(()=>({show:document.getElementById('modal').classList.contains('show'),pts:document.querySelectorAll('#modal .dclPt').length,txt:((document.querySelector('#modal .dclPt')||{}).textContent||'').replace(/\s+/g,' ')}));
await page.click('#modal [data-mod="dcl-cancel"]');await wait(200);
console.log('c8) poser + fiche :',J(o));
C.c8=/Déclarer une modif/.test(o.poser||'')&&o.first.pick&&/Suite/.test(o.first.go)&&o.form.show&&o.form.pts.length===1&&/Rue Principale · PK/.test(o.form.pts[0])&&/n°1/.test(o.joint.box||'')&&o.joint.here&&o.here.show&&o.here.pts===1&&/Antenne B/.test(o.here.txt);
/* ── c9 : soudeur */
await page.selectOption('#roleSel','karim');await wait(500);
o={tab:await T(()=>{const b=document.querySelector('#tabbar [data-tab="ts"]');return b?getComputedStyle(b).display:'absent';})};
await T(()=>{const X=window.TRACE;X.state.tab='plan';X.renderAll();});await wait(300);
o.pins=await T(()=>document.getElementById('tsG').querySelectorAll('[data-modpin]').length);o.yel=await T(()=>(document.getElementById('marG').innerHTML.match(/#ffe08a|#c9b8f5/g)||[]).length); /* le gars voit le réel et les repères, pas les surlignages d'écarts */
await T(()=>{const m=window.TRACE.mod.of().items.find(x=>x.kind==='decl');window.TRACE.mod.openPin(m.id);});await wait(300);
o.fiche=await T(()=>({show:document.getElementById('modal').classList.contains('show'),edit:!!document.querySelector('#modal [data-mod^="dcl-edit:"]'),del:!!document.querySelector('#modal [data-mod^="del:"]'),txt:document.querySelector('#modal').textContent.replace(/\s+/g,' ').slice(0,120)}));
await T(()=>{document.querySelector('#modal [data-close]').click();});await wait(200);
o.decl=await T(()=>window.TRACE.mod.decl({}));
console.log('c9) soudeur :',J(o));
C.c9=o.tab==='none'&&o.pins===3&&o.yel===0&&o.fiche.show&&!o.fiche.edit&&!o.fiche.del&&/n°1/.test(o.fiche.txt)&&o.decl===false;
await page.selectOption('#roleSel','ethan');await wait(400);
/* ── c10 : téléphone 390 / 360 (même page, fenêtre étroite) */
const pm=page;const phone={};for(const W of [390,360]){await pm.setViewportSize({width:W,height:844});await pm.waitForTimeout(500);
  await pm.evaluate(()=>{const X=window.TRACE;X.state.tab='ts';X.renderAll();});await pm.waitForTimeout(500);
  const tabOk=await pm.evaluate(()=>({sw:document.documentElement.scrollWidth,iw:innerWidth,cards:document.querySelectorAll('#tsview .mdCard').length}));if(SHOTS)await pm.screenshot({path:`${SHOTS}/md_10_onglet_${W}.png`});
  await pm.evaluate(()=>document.querySelector('#tsview [data-mod="decl"]').click());await pm.waitForTimeout(400);await pm.evaluate(()=>{const b=document.querySelector('#modal [data-mod^="dcl-prop:"]');if(b)b.click();});await pm.waitForTimeout(300);await pm.evaluate(()=>{document.querySelector('#modal [data-mod="dcl-add:ml"]').click();});await pm.waitForTimeout(300);
  const form=await pm.evaluate(()=>{const b=document.querySelector('#modal .box');const r=b.getBoundingClientRect();const h=s=>[...document.querySelectorAll('#modal '+s)].map(x=>Math.round(x.getBoundingClientRect().height));const over=[...b.querySelectorAll('*')].filter(x=>{const q=x.getBoundingClientRect();return q.width>0&&(q.right>r.right+1||q.left<r.left-1);}).map(x=>String(x.className||x.tagName)).slice(0,5);return {sw:document.documentElement.scrollWidth,iw:innerWidth,boxSw:b.scrollWidth,boxCw:b.clientWidth,over,save:h('[data-mod="dcl-save"]'),pick:h('[data-mod="dcl-pick"]'),et:h('.dclEtB'),sg:h('.dclSg button'),x:h('.dclX'),inp:h('.dclLn select.f, .dclLn input.f')};});
  if(SHOTS)await pm.screenshot({path:`${SHOTS}/md_10_fenetre_${W}.png`});if(SHOTS){await pm.evaluate(()=>{const b=document.querySelector('#modal .box');b.scrollTop=b.scrollHeight;});await pm.waitForTimeout(150);await pm.screenshot({path:`${SHOTS}/md_10_fenetre_bas_${W}.png`});}
  await pm.evaluate(()=>document.querySelector('#modal [data-mod="dcl-pick"]').click());await pm.waitForTimeout(500);
  const bar=await pm.evaluate(()=>{const b=document.getElementById('modPickBar');const r=b.getBoundingClientRect();const h=s=>[...b.querySelectorAll(s)].map(x=>Math.round(x.getBoundingClientRect().height));return {l:Math.round(r.left),r:Math.round(r.right),iw:innerWidth,ok:h('[data-mod="pick-ok"]'),cancel:h('[data-mod="pick-cancel"]'),sw:document.documentElement.scrollWidth};});
  if(SHOTS)await pm.screenshot({path:`${SHOTS}/md_10_pointer_${W}.png`});
  await pm.evaluate(()=>document.querySelector('#modPickBar [data-mod="pick-cancel"]').click());await pm.waitForTimeout(300);await pm.evaluate(()=>{const b=document.querySelector('#modal [data-mod="dcl-cancel"]');if(b)b.click();});await pm.waitForTimeout(200);
  phone[W]={tabOk,form,bar};}
await pm.setViewportSize({width:1366,height:900});
console.log('c10) téléphone :',J(phone));
const big=a=>a.length&&a.every(h=>h>=44&&h<=64); /* gros boutons, mais pas des pavés */
C.c10=[390,360].every(W=>{const p=phone[W];return p&&p.tabOk.sw<=p.tabOk.iw&&p.tabOk.cards===2&&p.form.sw<=p.form.iw&&p.form.boxSw<=p.form.boxCw+1&&!p.form.over.length&&big(p.form.save)&&big(p.form.pick)&&big(p.form.et)&&big(p.form.sg)&&big(p.form.x)&&big(p.form.inp)&&p.bar.l>=0&&p.bar.r<=p.bar.iw&&big(p.bar.ok)&&big(p.bar.cancel)&&p.bar.sw<=p.bar.iw;});
/* ── c12 : « 🔒 Re-figer » → « C'est mon tracé de base » : les modifs DÉCLARÉES sont gardées (l'ancienne par éléments part, comme avant) */
await T(()=>{const X=window.TRACE;X.state.tab='ts';X.renderAll();});await wait(300);await page.click('#tsview [data-tsrefreeze]');await wait(300);
o={modal:await T(()=>document.getElementById('modal').textContent.replace(/\s+/g,' ').slice(0,600))};await page.click('#tsRfBase');await wait(500);
o.after=await T(()=>{const X=window.TRACE;const Mo=X.mod.of();return {kinds:Mo.items.map(m=>m.kind||'els'),els:X.mod.elements().length,txt:(document.querySelector('#tsview .mdEc')||{}).textContent||'',cards:document.querySelectorAll('#tsview .mdCard').length};});
console.log('c12) re-figer :',J(o));
C.c12=/modif déclarée est gardée/.test(o.modal)&&o.after.kinds.join()==='decl'&&o.after.els===0&&/aucun écart/.test(o.after.txt)&&o.after.cards===1;
C.c11=!logs.length;if(logs.length)console.log('console :',logs);
console.log('RÉSULTATS',J(C));console.log('RESULTAT:',Object.values(C).every(Boolean)?'TOUT VERT':'ÉCHEC '+Object.keys(C).filter(k=>!C[k]).join(' '));await browser.close();process.exit(Object.values(C).every(Boolean)?0:1);
