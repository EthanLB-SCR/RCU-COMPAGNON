// e2e_mo_3110.mjs — 31/10 (lot MO). Ethan, 30/10 au soir : « intègre les noms de modules, les visuels, la réorganisation éventuelle des options par module, que ça
// ne s'appelle plus « Moi » mais « Compagnon » par exemple, et pareil pour tout : un onglet = un module » + « lance tout en codage les tutos ».
//  c1  onglets = modules : Ethan (tout) → Aujourd'hui · Chantier · Pilotage · Compagnon · Affaires · Flotte · Magasin · Équipe ; Karim → Aujourd'hui · Chantier · Compagnon ·
//      Équipe ; chaque onglet affiche « Tracé <module> » dans le bandeau ; plus de « Moi » (onglet, tuiles, 2e ligne) ; Chantier n'a plus le sous-onglet Équipes & heures ;
//      Magasin = la vue du dépôt sans les puces Flotte / Matériel ; le menu des modules liste les mêmes modules
//  c2  🧪 Options rangées par module (Tracé Chantier, Pilotage, Affaires, Flotte, Magasin, Compagnon, sans module) ; chaque option une seule fois ; Tutos = option Labo
//  c3  écran de chargement court (code de la charte) : présent au démarrage, retiré au premier rendu, appli visible, barre d'état repassée en blanc
//  c4  intro longue : jouée (scène 3D + logo), un toucher la passe sans rien toucher dessous ; 1re ouverture du jour seulement (« auto ») ; compte qui pointe → coupée
//      dès que l'appli est prête ; sans le toucher, elle dure ≈ 4,9 s puis s'en va
//  c5  tutos : 1re arrivée dans Compagnon → guide (cible surlignée, gros boutons) → Suivant… Terminé → ne revient plus ; ❓ le rouvre ; Pilotage → Passer ; toucher à côté
//      ferme ; menu des modules « ❓ Revoir le tuto » ; 360 px : carte dans l'écran ; sans le drapeau de test, un robot ne voit jamais de tuto
//  c6  « Tracé » partout : version sur l'écran de connexion, bouton « Se connecter » Nuit, traceur « pas encore dans Tracé », manifest theme_color Nuit ;
//      tuto du traceur (Tracé Concepteur) à la 1re ouverture, cible « Tracer une ligne » surlignée, bouton ?
//  c7  390 / 360 / 1366 : aucun débordement horizontal sur chaque module ; console propre
import { chromium } from 'playwright';
const BASE=process.env.BASE||'http://localhost:8765';const SHOTS=process.env.SHOTS||'';
const browser=await chromium.launch({headless:true, executablePath: process.env.CHROMIUM_PATH||undefined});
const C={};const logs=[];const J=x=>JSON.stringify(x);
const ctx=await browser.newContext({viewport:{width:390,height:844},deviceScaleFactor:2,hasTouch:true});const page=await ctx.newPage();
const watch=p=>{p.on('pageerror',e=>logs.push('PAGEERROR: '+e.message.slice(0,300)));p.on('console',m=>{if(m.type()==='error'&&!/supabase|Failed to fetch|net::ERR|404|geopf|WebSocket/i.test(m.text()))logs.push(m.text().slice(0,200));});p.on('dialog',d=>d.accept().catch(()=>{}));};watch(page);
const wait=ms=>page.waitForTimeout(ms);
const fresh=async(flags={})=>{await page.goto(BASE+'/index.html');await wait(400);await page.evaluate(f=>{localStorage.clear();Object.entries(f).forEach(([k,v])=>localStorage.setItem(k,v));},flags);await page.evaluate(()=>new Promise(r=>{try{const q=indexedDB.deleteDatabase('trace-kv');q.onsuccess=q.onerror=q.onblocked=()=>r();}catch(e){r();}}));};
const skipLogin=async()=>{const sk=await page.$('#loginSkip');if(sk&&await sk.isVisible())await sk.click();await wait(600);};
await fresh();await page.reload();await wait(1200);await skipLogin();
const as=async id=>{await page.evaluate(id=>{const T=window.TRACE;T.state.userId=id;T.showScreen('home');document.getElementById('htHome').click();},id);await wait(350);};
const tab=async id=>{await page.evaluate(id=>document.getElementById(id).click(),id);await wait(450);};
const tabsVis=()=>page.evaluate(()=>[...document.querySelectorAll('#homeTabs button')].filter(b=>b.style.display!=='none').map(b=>b.textContent.trim()));
const bandTxt=()=>page.evaluate(()=>{const b=document.querySelector('#tbHome .tbMod');const n=b.querySelector('.tbName'),m=b.querySelector('.tbModName');return ((n?n.textContent:'')+' '+(m&&m.style.display!=='none'?m.textContent:'')).trim();});
const ctxT=()=>page.evaluate(()=>(document.querySelector('#tbHome .tbCtx .t')||{}).textContent||'');
const over=()=>page.evaluate(()=>document.documentElement.scrollWidth>window.innerWidth+1);
/* ── c1 : onglets = modules */
let o={};await as('ethan');o.ethan=await tabsVis();o.mods={};
for(const [id,lab] of [['htSites','Chantier'],['htExpl','Pilotage'],['htEspace','Compagnon'],['htCom','Commerce'],['htAff','Affaire'],['htParc','Flotte'],['htMag','Magasin'],['htEnt','Équipe']]){await tab(id);o.mods[id]={band:await bandTxt(),t:await ctxT(),on:await page.evaluate(id=>document.getElementById(id).classList.contains('on'),id)};}
await tab('htSites');o.sub=await page.evaluate(()=>[...document.querySelectorAll('#homeSubTabs button')].filter(b=>b.style.display!=='none').map(b=>b.textContent.trim()));
await tab('htMag');o.magChips=await page.evaluate(()=>document.querySelectorAll('#eq-app [data-act=parcseg]').length);o.magH2=await page.evaluate(()=>(document.querySelector('#eq-app h2')||{}).textContent||'');
await tab('htParc');o.parcChips=await page.evaluate(()=>[...document.querySelectorAll('#eq-app [data-act=parcseg]')].map(b=>b.textContent.trim()));
await as('ethan');o.tiles=await page.evaluate(()=>[...document.querySelectorAll('#eq-app .ac-tile b')].map(b=>b.textContent));
await page.evaluate(()=>document.getElementById('tbHomeMod').click());await wait(300);o.menu=await page.evaluate(()=>[...document.querySelectorAll('#modal .modList b')].map(b=>b.textContent.replace(/\s+/g,' ').trim()));await page.evaluate(()=>{const b=document.querySelector('#modal [data-close]');if(b)b.click();});await wait(200);
await as('karim');o.karim=await tabsVis();await tab('htEspace');o.karimCtx=await ctxT();o.karimBand=await bandTxt();
o.moi=await page.evaluate(()=>{const t=[...document.querySelectorAll('#homeTabs button, #homeSubTabs button, #tbHome .tbCtx, #eq-app .ac-tile')].map(e=>e.textContent).join(' | ');return /\bMoi\b/.test(t);});
console.log('c1) onglets = modules :',J(o));
const MODS={htSites:'Chantier',htExpl:'Pilotage',htEspace:'Compagnon',htCom:'Commerce',htAff:'Affaire',htParc:'Flotte',htMag:'Magasin',htEnt:'Équipe'}; /* 31/10 matin (Ethan) : Affaires → Commerce, + Affaire */
C.c1=o.ethan.join()==="Aujourd'hui,Chantier,Pilotage,Compagnon,Commerce,Affaire,Flotte,Magasin,Équipe"&&o.karim.join()==="Aujourd'hui,Chantier,Compagnon,Équipe"&&Object.entries(MODS).every(([id,m])=>o.mods[id].band==='Tracé '+m&&o.mods[id].on)
  &&o.mods.htEspace.t==='Ethan L.'&&o.karimCtx==='Karim B.'&&o.karimBand==='Tracé Compagnon'&&!o.moi&&!o.sub.some(t=>/Équipes/.test(t))&&o.sub.filter(t=>t&&t!=='?').join()==='Carte,Liste' /* 31/10 matin : tuiles à icône (dessinée en CSS) ; Sécurité → Pilotage ; « ? » du tutoriel au bout (dessiné en CSS : texte vide) */&&o.magChips===2 /* Magasin | Matériel */&&/Magasin/.test(o.magH2)&&o.parcChips.length===0 /* 31/10 matin : le Matériel est dans Magasin */
  &&o.tiles.join()==='Chantier,Pilotage,Compagnon,Commerce,Affaire,Flotte,Magasin,Équipe,Réglages' /* 31/10 matin : plus de tuile Sécurité (dans Pilotage), Commerce, + Affaire */&&['Tracé','Tracé Chantier','Tracé Concepteur','Tracé Commerce','Tracé Affaire','Tracé Pilotage','Tracé Flotte','Tracé Magasin','Tracé Compagnon','Tracé Équipe'].every(x=>o.menu.includes(x));
/* ── c2 : Options par module */
await as('ethan');await page.evaluate(()=>document.getElementById('htAdmin').click());await wait(600);
await page.evaluate(()=>{const b=[...document.querySelectorAll('#homeBody .admNav button')].find(x=>/Options/.test(x.textContent));if(b)b.click();});await wait(500);
o=await page.evaluate(()=>{const cards=[...document.querySelectorAll('#homeBody .admOptMod')];return {mods:cards.map(c=>c.dataset.mod),heads:cards.map(c=>c.querySelector('.admModH b').textContent.replace(/\s+/g,' ').trim()),
  rows:Object.fromEntries(cards.map(c=>[c.dataset.mod,[...c.querySelectorAll('.admOpt .admOptT > b')].map(b=>b.textContent)])),n:document.querySelectorAll('#homeBody .admOpt').length,
  tutos:(()=>{const r=[...document.querySelectorAll('#homeBody .admOpt')].find(x=>/Tutoriels/.test(x.textContent));return r?(r.querySelector('.btn.on')||{}).textContent:null;})()};});
if(SHOTS){await page.screenshot({path:SHOTS+'/mo_options_390.png',fullPage:false});}
console.log('c2) Options par module :',J(o));
const allRows=Object.values(o.rows).flat();
C.c2=o.mods.join()==='chantier,pilotage,commerce,affaire,flotte,magasin,compagnon,transverse' /* 31/10 matin : Commerce + Affaire */&&o.heads[0]==='Tracé Chantier'&&o.heads[1]==='Tracé Pilotage'&&o.n===allRows.length&&new Set(allRows).size===allRows.length&&o.n>=21
  &&o.rows.commerce.some(t=>/Commerce/.test(t))&&o.rows.flotte.some(t=>/Flotte/.test(t))&&o.rows.magasin.some(t=>/Magasin/.test(t))&&o.rows.affaire.some(t=>/Notes de frais/.test(t))&&o.rows.transverse.some(t=>/Tutoriels/.test(t))&&/Labo/.test(o.tutos||'')&&o.rows.pilotage.length>=3 /* 31/10 (fusion) : + options des lots PI / CC rangées au bon module */&&['Planning simplifié','Production : tableau'].every(x=>o.rows.pilotage.some(t=>t.startsWith(x)))&&o.rows.affaire.some(t=>/Compte chantier/.test(t)) /* 31/10 matin : compte chantier et notes de frais → Affaire */&&o.rows.compagnon.some(t=>/Demandes de matériel/.test(t))&&o.rows.chantier.some(t=>/Plans d.exé/.test(t));
/* ── c3 : écran de chargement court */
await fresh({'trace:intro:test':'short','trace:skipLogin':'1'});await page.reload({waitUntil:'commit'});
o={early:await page.evaluate(()=>{const s=document.getElementById('tr-splash');return {splash:!!s,cls:s?s.className:'',boot:document.documentElement.classList.contains('trBoot'),svg:s?s.querySelectorAll('.tr-outer,.tr-inner,.tr-flow,.tr-wire').length:0,word:s?(s.querySelector('.tr-word')||{}).textContent:'',theme:(document.getElementById('trTheme')||{}).content};}).catch(e=>({err:e.message}))};
await page.waitForFunction(()=>!document.getElementById('tr-splash'),null,{timeout:15000}).catch(()=>{});await wait(300);
o.after={splash:!!(await page.$('#tr-splash')),boot:await page.evaluate(()=>document.documentElement.classList.contains('trBoot')),theme:await page.evaluate(()=>document.getElementById('trTheme').content),appVis:await page.evaluate(()=>getComputedStyle(document.getElementById('app')).visibility),screen:await page.evaluate(()=>window.TRACE.state.screen),mode:await page.evaluate(()=>window.TRACE.boot.state())};
console.log('c3) écran de chargement :',J(o));
C.c3=o.early.splash&&/tr-short/.test(o.early.cls)&&o.early.boot&&o.early.svg===5&&o.early.word==='Tracé'&&o.early.theme==='#2B1B5A'&&!o.after.splash&&!o.after.boot&&o.after.theme==='#FFFFFF'&&o.after.appVis==='visible'&&o.after.mode&&o.after.mode.mode==='short'&&o.after.mode.ended;
/* ── c4 : intro longue */
o={};
// a) jouée en entier (sans le raccourci « compte qui pointe »), un toucher la passe — et ce toucher ne déclenche rien dessous
await fresh({'trace:intro:test':'long-full','trace:skipLogin':'1'});await page.reload({waitUntil:'commit'});await wait(900);
o.a=await page.evaluate(()=>{const s=document.getElementById('tr-splash');return {long:!!s&&s.classList.contains('tr-long'),intro:!!document.getElementById('tr-intro'),scene:document.querySelectorAll('#tr-intro .in-svg').length,face:!!document.querySelector('#tr-intro .in-face2'),skip:!!document.querySelector('#tr-splash .tr-skip'),mode:window.trBoot&&window.trBoot.mode(),day:localStorage.getItem('trace:intro:day'),ended:window.trBoot.ended()};});
await page.evaluate(()=>{window.__clk=0;document.addEventListener('click',()=>{window.__clk++;},false);});
await page.mouse.click(195,600);await wait(450);o.a.afterTap={splash:!!(await page.$('#tr-splash')),clk:await page.evaluate(()=>window.__clk),info:await page.evaluate(()=>window.trBoot.info())};
if(SHOTS){await fresh({'trace:intro:test':'long-full','trace:skipLogin':'1'});await page.reload({waitUntil:'commit'});await wait(1500);await page.screenshot({path:SHOTS+'/mo_intro_390_a.png'});await wait(1500);await page.screenshot({path:SHOTS+'/mo_intro_390_b.png'});await wait(1500);await page.screenshot({path:SHOTS+'/mo_intro_390_c.png'});await page.waitForFunction(()=>window.trBoot&&window.trBoot.ended(),null,{timeout:15000}).catch(()=>{});}
// b) sans toucher : elle s'en va seule vers 4,9 s
await fresh({'trace:intro:test':'long-full','trace:skipLogin':'1'});const t0=Date.now();await page.reload({waitUntil:'commit'});await page.waitForFunction(()=>window.trBoot&&window.trBoot.ended(),null,{timeout:15000}).catch(()=>{});o.b={ms:Date.now()-t0,info:await page.evaluate(()=>window.trBoot.info())};
// c) compte qui pointe (personnage de démo au démarrage : Karim, soudeur) → coupée dès que l'appli est prête
await fresh({'trace:intro:test':'long','trace:skipLogin':'1'});const t1=Date.now();await page.reload({waitUntil:'commit'});await page.waitForFunction(()=>window.trBoot&&window.trBoot.ended(),null,{timeout:15000}).catch(()=>{});o.c={ms:Date.now()-t1,user:await page.evaluate(()=>window.TRACE.state.userId),info:await page.evaluate(()=>window.trBoot.info())};
// d) règle du jour (« auto ») : 1re ouverture → longue (et le jour est noté) ; ouverture suivante → courte
await fresh({'trace:intro:test':'auto','trace:skipLogin':'1'});await page.reload({waitUntil:'commit'});await wait(400);o.d={first:await page.evaluate(()=>window.trBoot&&window.trBoot.mode()),day:await page.evaluate(()=>localStorage.getItem('trace:intro:day'))};
await page.waitForFunction(()=>window.trBoot&&window.trBoot.ended(),null,{timeout:15000}).catch(()=>{});await page.reload({waitUntil:'commit'});await wait(400);o.d.second=await page.evaluate(()=>window.trBoot&&window.trBoot.mode());
await page.waitForFunction(()=>window.trBoot&&window.trBoot.ended(),null,{timeout:15000}).catch(()=>{});
// e) robot sans drapeau : rien
await fresh({'trace:skipLogin':'1'});await page.reload({waitUntil:'commit'});o.e=await page.evaluate(()=>({splash:!!document.getElementById('tr-splash'),mode:window.trBoot&&window.trBoot.mode(),boot:document.documentElement.classList.contains('trBoot')}));
console.log('c4) intro longue :',J(o));
const today=new Intl.DateTimeFormat('sv-SE',{timeZone:'Europe/Paris'}).format(new Date());
C.c4=o.a.long&&o.a.intro&&o.a.scene===6 /* plan des rues + 5 couches du réseau */&&o.a.face&&o.a.skip&&o.a.mode==='long'&&o.a.day===today&&!o.a.ended&&!o.a.afterTap.splash&&o.a.afterTap.info.why==='toucher'&&o.a.afterTap.clk===0
  &&o.b.info.why==='fin'&&o.b.info.endAt>=4800 /* ≈ 4,9 s, ou plus si l'appli est lente à démarrer */&&o.c.user==='karim'&&(o.c.info.why==='pointe'||(o.c.info.why==='fin'&&o.c.info.readyAt>=4800)) /* coupée dès que l'appli est prête */&&o.d.first==='long'&&o.d.day===today&&o.d.second==='short'&&!o.e.splash&&o.e.mode==='off'&&!o.e.boot;
await page.waitForTimeout(300);await skipLogin();
/* ── c5 : tutos */
o={};
await page.evaluate(()=>localStorage.setItem('trace:tuto:test','1'));await as('karim');await wait(1200); /* l'accueil a son tuto aussi : on le passe d'abord */
o.accueil=await page.evaluate(()=>window.TRACE.tuto.open());if(o.accueil)await page.evaluate(()=>window.TRACE.tuto.close('passe'));
await tab('htEspace');await wait(1300);
const card=()=>page.evaluate(()=>{const r=document.getElementById('tuto');if(!r)return null;const c=r.querySelector('.tutoCard'),h=r.querySelector('.tutoHole');const rc=c.getBoundingClientRect();const btns=[...c.querySelectorAll('button')].map(b=>({t:b.textContent.trim(),h:Math.round(b.getBoundingClientRect().height)}));
  return {mod:c.querySelector('.tutoMod').textContent,t:c.querySelector('.tutoT').textContent,left:Math.round(rc.left),right:Math.round(rc.right),top:Math.round(rc.top),bottom:Math.round(rc.bottom),W:innerWidth,H:innerHeight,hole:h&&getComputedStyle(h).display!=='none'?(()=>{const x=h.getBoundingClientRect();return [Math.round(x.left),Math.round(x.top),Math.round(x.width),Math.round(x.height)];})():null,btns,open:window.TRACE.tuto.open()};});
o.c0=await card();if(SHOTS&&o.c0)await page.screenshot({path:SHOTS+'/mo_tuto_compagnon_390.png'});
const steps=[];for(let i=0;i<8;i++){const c=await card();if(!c)break;steps.push({t:c.t,hole:!!c.hole});const b=await page.$('#tuto [data-tuto=next]');if(!b)break;await b.click();await wait(250);}
o.steps=steps;o.closed=!(await page.$('#tuto'));o.seen=await page.evaluate(()=>window.TRACE.tuto.seen('compagnon'));
await tab('htHome');await tab('htEspace');await wait(1300);o.again=!!(await page.$('#tuto'));
await page.evaluate(()=>document.getElementById('tbHomeHelp').click());await wait(300);o.help=await card();await page.evaluate(()=>window.TRACE.tuto.close(null));
await as('ethan');await page.evaluate(()=>window.TRACE.tuto.close('passe'));await tab('htExpl');await wait(1300);o.pil=await card();
if(o.pil){await page.click('#tuto [data-tuto=skip]');await wait(250);}o.pilClosed=!(await page.$('#tuto'));o.pilSeen=await page.evaluate(()=>window.TRACE.tuto.seen('pilotage'));
await page.evaluate(()=>document.getElementById('tbHomeMod').click());await wait(300);o.menuTuto=await page.evaluate(()=>{const b=document.querySelector('#modal [data-mod=tuto]');return b?b.textContent:null;});
await page.evaluate(()=>document.querySelector('#modal [data-mod=tuto]').click());await wait(400);o.menuOpen=await page.evaluate(()=>window.TRACE.tuto.open());
await page.mouse.click(5,5);await wait(250);o.outsideClosed=!(await page.$('#tuto'));
await page.setViewportSize({width:360,height:740});await tab('htCom');await wait(1300);o.c360=await card();if(SHOTS&&o.c360)await page.screenshot({path:SHOTS+'/mo_tuto_affaires_360.png'});await page.evaluate(()=>window.TRACE.tuto.close('passe'));
await page.evaluate(()=>{const T=window.TRACE;const id=Object.keys(T.sites).find(k=>k!=='__vide'&&T.sites[k]&&T.sites[k].lines);T.openSiteFromHome(id);});await wait(2500);o.chantier=await card();if(SHOTS&&o.chantier)await page.screenshot({path:SHOTS+'/mo_tuto_chantier_360.png'});
if(o.chantier){for(let i=0;i<3;i++){const b=await page.$('#tuto [data-tuto=next]');if(b){await b.click();await wait(250);}}o.chantier2=await card();}await page.evaluate(()=>window.TRACE.tuto.close('passe'));
await page.setViewportSize({width:390,height:844});
await page.evaluate(()=>localStorage.removeItem('trace:tuto:test'));await page.evaluate(()=>window.TRACE.tuto.reset());await as('karim');await tab('htEspace');await wait(1400);o.robot=!!(await page.$('#tuto'));
console.log('c5) tutos :',J(o));
const inScreen=c=>c&&c.left>=0&&c.right<=c.W&&c.top>=0&&c.bottom<=c.H&&c.btns.every(b=>b.h>=44);
C.c5=inScreen(o.c0)&&/Compagnon/.test(o.c0.mod)&&o.steps.length>=3&&o.steps.some(s=>s.hole)&&o.closed&&o.seen&&!o.again&&o.help&&/Compagnon/.test(o.help.mod)&&o.pil&&/Pilotage/.test(o.pil.mod)&&o.pilClosed&&o.pilSeen
  &&/Tutoriel de cet écran · Tracé Pilotage/.test(o.menuTuto||'') /* 31/10 matin : libellé */&&o.menuOpen&&o.menuOpen.k==='pilotage'&&o.outsideClosed&&inScreen(o.c360)&&o.c360.W===360&&/Commerce/.test(o.c360.mod) /* 31/10 matin : Affaires → Commerce */&&o.chantier&&/Chantier/.test(o.chantier.mod)&&!!o.chantier.hole&&inScreen(o.chantier2)&&!o.robot;
/* ── c6 : « Tracé » partout */
o={};await page.evaluate(()=>window.TRACE.showScreen('login'));await wait(300);
o.login=await page.evaluate(()=>({btn:getComputedStyle(document.getElementById('loginGo')).backgroundColor,h:Math.round(document.getElementById('loginGo').getBoundingClientRect().height),word:document.querySelector('.loginBox .word').textContent}));
await page.evaluate(()=>window.TRACE.showScreen('home'));
const man=await (await page.request.get(BASE+'/manifest.webmanifest')).json().catch(()=>null);o.manifest=man&&{theme:man.theme_color,bg:man.background_color,name:man.short_name};
await page.evaluate(()=>{localStorage.setItem('trace:tuto:test','1');Object.keys(localStorage).filter(k=>k.startsWith('trace:tuto:')&&k!=='trace:tuto:test').forEach(k=>localStorage.removeItem(k));});
const p2=await ctx.newPage();watch(p2);await p2.goto(BASE+'/traceur.html');await p2.waitForTimeout(1800);o.traceur=await p2.evaluate(()=>{const c=document.querySelector('#tuto .tutoMod');return {tuto:c?c.textContent:null};});
if(o.traceur.tuto){await p2.click('#tuto [data-tuto=next]');await p2.waitForTimeout(300);o.traceur.step2=await p2.evaluate(()=>{const h=document.querySelector('#tuto .tutoHole');const t=document.getElementById('mTrace').getBoundingClientRect();if(!h||getComputedStyle(h).display==='none')return null;const r=h.getBoundingClientRect();return {t:document.querySelector('#tuto .tutoT').textContent,covers:r.left<=t.left&&r.right>=t.right&&r.top<=t.top&&r.bottom>=t.bottom};});await p2.click('#tuto [data-tuto=skip]');await p2.waitForTimeout(200);}
o.traceur.after=await p2.evaluate(()=>!!document.getElementById('tuto'));await page.evaluate(()=>localStorage.removeItem('trace:tuto:test'));
Object.assign(o.traceur,await p2.evaluate(()=>({b:(document.getElementById('siteBadge2')||document.getElementById('siteBadge')).textContent,save:document.getElementById('bSave').textContent.trim(),upper:/TRACÉ/.test(document.body.innerText),help:!!document.getElementById('bTuto')})));await p2.close();
o.upper=await page.evaluate(()=>/TRACÉ/.test(document.body.innerText));
console.log('c6) Tracé :',J(o));
C.c6=o.login.btn==='rgb(43, 27, 90)'&&o.login.h>=48&&o.login.word==='Tracé'&&o.manifest&&o.manifest.theme==='#2B1B5A'&&o.manifest.bg==='#2B1B5A'&&o.manifest.name==='Tracé'&&/pas encore dans Tracé/.test(o.traceur.b)&&/Enregistrer dans Tracé/.test(o.traceur.save)&&!o.traceur.upper&&!o.upper
  &&/Tracé Concepteur · 1/.test(o.traceur.tuto||'')&&o.traceur.step2&&o.traceur.step2.covers&&/Tracer une ligne/.test(o.traceur.step2.t)&&!o.traceur.after&&o.traceur.help; /* tuto du traceur (Tracé Concepteur) */
/* ── c7 : 390 / 360 / 1366 sans débordement */
o={};await as('ethan');
for(const W of [390,360,1366]){await page.setViewportSize({width:W,height:W>1000?900:780});await wait(200);const r={};
  for(const id of ['htHome','htSites','htExpl','htEspace','htCom','htParc','htMag','htEnt']){await tab(id);r[id]=await over();}
  r.tabsScroll=await page.evaluate(()=>{const t=document.getElementById('homeTabs');return {sw:t.scrollWidth,cw:t.clientWidth,cut:[...t.querySelectorAll('button')].filter(b=>b.style.display!=='none').map(b=>{const s=b.querySelector('span');return s&&s.scrollWidth>s.clientWidth+1?s.textContent:null;}).filter(Boolean)};});
  if(SHOTS)await page.screenshot({path:SHOTS+`/mo_tabs_${W}.png`,clip:{x:0,y:0,width:W,height:240}});
  o[W]=r;}
await page.setViewportSize({width:390,height:844});
console.log('c7) débordements :',J(o));
C.c7=[390,360,1366].every(W=>Object.entries(o[W]).filter(([k])=>k.startsWith('ht')).every(([,v])=>v===false)&&o[W].tabsScroll.cut.length===0);
C.c8=!logs.length;if(logs.length)console.log('console :',logs);
console.log('RÉSULTATS',J(C));console.log('RESULTAT:',Object.values(C).every(Boolean)?'TOUT VERT':'ÉCHEC '+Object.keys(C).filter(k=>!C[k]).join(' '));await browser.close();process.exit(Object.values(C).every(Boolean)?0:1);
