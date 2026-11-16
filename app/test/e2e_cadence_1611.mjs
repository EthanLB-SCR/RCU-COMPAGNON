// e2e_cadence_1611 — 16/11/2026 (lot CA) — Ethan : « pour les gars, le calcul de s'ils ont produit plus que prévu en une semaine (avatar : étincelles, avancée de la
//  médaille) : se référer aux cadences des paniers de chiffrage ; s'ils ont pointé moins d'heures que ce que débloquent les productions pointées, ils sont au-dessus,
//  et inversement ; détail du calcul visible dans l'onglet Productions de chacun ».
// Données FICTIVES : chantier tracé pour le test (une ligne DN 100, chaufferie → sous-station), personnages de démo (Karim soudeur, Julien manchonneur, Ethan administrateur),
//  un tuyauteur provisoire « Paul TESTTUY », base de prix fictive test/fixture_prix.xlsx (DN 100 : soudure 1 h avec tuyauteur, manchon 2 h seul, fils DH 3 min, point SST 2 h).
// Mercredi 18/11/2026. Semaine 46 (09 → 15/11) : Karim + Paul équipe A, 4 × 10 h, 41 soudures → 41 h pour 40 h (au-dessus) ; Julien équipe B, 4 × 10 h, 18 manchons
//  + 18 fils DH → 36 h 54 (en dessous). Semaine 47 (en cours) : Karim lundi et mardi 2 × 10 h, 17 soudures + 1 point SST → 19 h pour 20 h (en dessous pour l'instant).
//  a0 rien tant que les cadences ne sont pas publiées (ni carte, ni compteurs d'avatar) ; a1 Commerce → Base de prix : carte « Cadences de production », barème du DN 100,
//     réglages ; a2e « Publier » par défaut = ESSAI, encadrement seulement : Karim ne voit rien, l'administrateur si ; a2 « les équipes aussi » : référence enregistrée, aucun prix ; a3 semaine 46 figée par l'appareil de l'administrateur (compteurs des trois) ;
//  k1 Karim → Compagnon → Productions : carte « ⚡ Cadence », semaine en cours 19 h / 20 h, en dessous, il manque 1 h ; série 1, record 1 ; 164 pouces ;
//  k2 « Comment c'est calculé » : jour par jour, soudures × 1 h (avec tuyauteur : 10 / jour), point SST 2 h (panier, moitié de la paire), équipe A avec Paul ;
//  k3 semaine 46 : 41 h / 40 h, au-dessus, + 1 h d'avance, figée ; résumé « ⚡ ▲ » sur le bloc de la semaine ; k4 avatar de Karim : 1 étincelle, 164 pouces ;
//  p1 Paul (tuyauteur) : reçoit les 41 h de son soudeur, 164 pouces, 1 semaine ; j1 Julien : 36,9 h / 40 h en dessous, détail manchons 2 h + fils DH 3 min, avatar 0 ;
//  e1 Pilotage → Production par équipe, semaine 46 : colonne « ⚡ Débloqué », 41 h ▲ pour Karim, détail au toucher ; non-administrateur : pas de bouton Publier ;
//  s1 « Suspendre » : plus de carte, compteurs d'avatar comme avant ; s2 republier avec « série en cours » : le texte du kit dit « Série en cours » ; c console propre
import { chromium } from 'playwright';import fs from 'fs';import path from 'path';import {fileURLToPath} from 'url';
const HERE=path.dirname(fileURLToPath(import.meta.url));const BASE=process.env.BASE||'http://127.0.0.1:8766';const SHOTS=process.env.SHOTS||null;const J=x=>JSON.stringify(x);
const browser=await chromium.launch({headless:true,executablePath:process.env.CHROMIUM_PATH||undefined});const C={};const logs=[];
const ctx=await browser.newContext({viewport:{width:1366,height:900}});const page=await ctx.newPage();const W=ms=>page.waitForTimeout(ms);
page.on('pageerror',e=>logs.push('PAGEERROR: '+e.message.slice(0,300)));page.on('console',m=>{if(m.type()==='error'&&!/supabase|Failed to fetch|net::ERR|404|WebSocket|fonts.googleapis|geopf|open-meteo/i.test(m.text()))logs.push(m.text().slice(0,200));});page.on('dialog',d=>d.accept().catch(()=>{}));
await ctx.route(u=>!u.href.startsWith(BASE)&&/^https?:/.test(u.href),rt=>rt.fulfill({status:200,contentType:'application/json',body:/geopf|geo\.api/.test(rt.request().url())?'{"type":"FeatureCollection","features":[]}':'{}'}));
const shot=async(n,sel)=>{if(SHOTS)try{if(sel)await page.locator(sel).first().screenshot({path:SHOTS+'/cad_'+n+'.png'});else await page.screenshot({path:SHOTS+'/cad_'+n+'.png',fullPage:false});}catch(e){console.log('capture '+n+' : '+e.message.slice(0,80));}};
await page.clock.install({time:new Date(2026,10,18,9,0,0)}); /* mercredi 18/11/2026, 9 h */
await page.goto(BASE+'/index.html');await W(500);await page.evaluate(()=>{localStorage.clear();localStorage.setItem('trace:wide','1');});
await page.goto(BASE+'/vendor/');await W(200);await page.evaluate(()=>new Promise(r=>{try{const q=indexedDB.deleteDatabase('trace-kv');q.onsuccess=q.onerror=q.onblocked=()=>r();}catch(e){r();}}));
// ── le chantier : une ligne DN 100 de 480 m, chaufferie → sous-station (tracé, enregistré, ouvert une fois pour lire les numéros de soudure)
await page.goto(BASE+'/traceur.html');await W(700);
await page.evaluate(()=>{const S=window.MAQ.state;S.lines=[{id:'L1',name:'Feeder fictif',dn:100,bar:12,pts:[[10,50],[490,50]],specials:[],parent:null,startType:'chaufferie',endType:'sousstation'}];S.seq=2;window.MAQ.setMode('select');window.MAQ.rebuild();});await W(300);
await page.click('#bSave');await W(200);await page.fill('#svName','Cadence test');await page.click('#svOk');await W(900);await page.click('#svGo');
await page.waitForFunction(()=>{const T=window.TRACE;if(!T||!T.state||!T.sites)return false;const n=T.sites[T.state.siteId];const L=T.state.lines&&T.state.lines.L1;return !!(n&&n.name==='Cadence test'&&L&&L.cond&&L.cond.A&&L.cond.A.joints.length>10&&L.cond.R&&L.cond.R.joints.length>10);},null,{timeout:40000}).catch(()=>{});await W(800); /* le plan tracé est ouvert et construit (pas d'attente fixe) */
const info=await page.evaluate(()=>{const T=window.TRACE;const L=T.state.lines.L1;const of=c=>L.cond[c].joints.map(j=>({w:j.weldId,c,sst:!!j.sst,end:j.endType||''}));return {sid:T.state.siteId,A:of('A'),R:of('R')};});
const sid=info.sid;const soud=info.A.concat(info.R).filter(j=>!j.sst);const pts=info.A.concat(info.R).filter(j=>j.sst);
console.log('chantier :',J({sid:!!sid,soudures:soud.length,points:pts.map(p=>p.c+':'+p.end)}));
// ── la fixture : soudures du serveur (copie de l'appareil), pointages, planning, tuyauteur provisoire
const S46=['2026-11-09','2026-11-10','2026-11-11','2026-11-12'],S47=['2026-11-16','2026-11-17'];
const st=(d,h,by,x)=>Object.assign({done:true,at:d+'T'+h+':00.000Z',by,photos:[]},x||{});const rows=[];let i=0;
[[S46[0],10],[S46[1],12],[S46[2],8],[S46[3],11]].forEach(([d,n])=>{for(let q=0;q<n;q++){const j=soud[i++];rows.push({weld_id:j.w,line_id:'L1',cond:j.c,status:'soudee',steps:{1:st(d,'09:00','Karim B.')},events:[]});}});
/* Julien : fils DH + manchon thermo sur les 18 premières (5, 5, 4, 4) */
{let m=0;[[S46[0],5],[S46[1],5],[S46[2],4],[S46[3],4]].forEach(([d,n])=>{for(let q=0;q<n;q++){const r=rows[m++];r.status='manchonnee';r.steps[2]=st(d,'13:00','Julien R.');r.steps[3]=st(d,'14:00','Julien R.',{type:'retracte'});}});}
[[S47[0],9],[S47[1],8]].forEach(([d,n])=>{for(let q=0;q<n;q++){const j=soud[i++];rows.push({weld_id:j.w,line_id:'L1',cond:j.c,status:'soudee',steps:{1:st(d,'09:00','Karim B.')},events:[]});}});
const pss=pts.find(p=>p.end==='sousstation')||pts[0];rows.push({weld_id:pss.w,line_id:'L1',cond:pss.c,status:'soudee',steps:{1:st(S47[0],'15:00','Karim B.')},events:[]});
const pt=(p,d)=>({p,d,site:sid,status:'valide',corr:null,events:[{t:'start',at:d+'T07:30'},{t:'pause',at:d+'T12:00'},{t:'resume',at:d+'T12:30'},{t:'end',at:d+'T18:00'}],val:[{by:'l:ethan',at:d+'T18:30'}]}); /* 10 h de travail, 30 min de pause */
const PTS=[];S46.forEach(d=>['l:karim','prov:paul','l:julien'].forEach(p=>PTS.push(pt(p,d))));S47.forEach(d=>['l:karim','prov:paul'].forEach(p=>PTS.push(pt(p,d))));
const plan=(ds,eq)=>Object.assign(Object.fromEntries(ds.map(d=>[d,[sid]])),{['eq:'+sid]:eq});
const PLAN={'2026-W46':{aff:{'l:karim':plan(S46,'A'),'prov:paul':plan(S46,'A'),'l:julien':plan(S46,'B')}},'2026-W47':{aff:{'l:karim':plan(S47.concat(['2026-11-18','2026-11-19']),'A'),'prov:paul':plan(S47.concat(['2026-11-18','2026-11-19']),'A')}}};
await page.goto(BASE+'/vendor/');await W(300);
const idbSet=(k,v)=>page.evaluate(([k,v])=>new Promise(res=>{const q=indexedDB.open('trace-kv',1);q.onupgradeneeded=()=>q.result.createObjectStore('kv');q.onsuccess=()=>{const db=q.result;const tx=db.transaction('kv','readwrite');tx.objectStore('kv').put(v,k);tx.oncomplete=()=>{db.close();res(true);};tx.onerror=()=>{db.close();res(false);};};q.onerror=()=>res(false);q.onblocked=()=>res(false);}),[k,v]);
await idbSet('trace:prodRows:'+sid,{at:Date.now(),rows});await idbSet('trace:pointages',PTS);await idbSet('trace:planning',PLAN);
await idbSet('trace:reg:prov',{paul:{id:'paul',data:{prenom:'Paul',nom:'TESTTUY',poste:'tuyauteur',type:'salarie',status:'a_finaliser',by:'Ethan L.',at:'2026-11-02T08:00:00.000Z'},updated_at:'2026-11-02T08:00:00.000Z'}});
await page.goto(BASE+'/index.html');await W(1500);{const s=await page.$('#loginSkip');if(s&&await s.isVisible())await s.click();await W(800);}
/* les chantiers de démonstration de l'appli portent une production fictive datée par rapport à aujourd'hui : on les sort du test (plus de plan → plus comptés) */
await page.evaluate(sid=>{const T=window.TRACE;T.etude.metas().filter(id=>id!==sid).forEach(id=>T.etude.addSite({id,name:'Démonstration (hors test)'}));},sid);
const as=async(who,tab)=>{await page.evaluate(async([w,t])=>{const T=window.TRACE;T.state.userId=w;T.renderHome();await new Promise(x=>setTimeout(x,200));const b=document.getElementById(t);if(b)b.click();await new Promise(x=>setTimeout(x,300));},[who,tab]);await W(300);};
const click=async sel=>{const ok=await page.evaluate(s=>{const el=document.querySelector(s);if(!el)return false;el.click();return true;},sel);await W(350);return ok;};
const txt=sel=>page.evaluate(s=>{const el=document.querySelector(s);return el?el.textContent.replace(/[\s  ]+/g,' ').trim():null;},sel);
const cad=(f,...a)=>page.evaluate(([f,a])=>{const c=window.TRACE.espace.cad();const r=c[f](...a);return r===undefined?null:JSON.parse(JSON.stringify(r));},[f,a]);
const setS=(k,det)=>page.evaluate(([k,det])=>{const S=window.TRACE.espace.state().S;S.per={mode:'sem',k,m:S.per.m};S.open['cad|det']=!!det;},[k,det]); /* l'état d'écran est partagé entre personnages : on le pose */
const prod=async(who,k,det)=>{await as(who,'htEspace');if(k!==undefined)await setS(k,det);await click('#eq-app [data-act="sub"][data-v="prod"]');await W(500);};
// ── a0 : rien tant que rien n'est publié
await prod('karim');await W(1200);
const a0={ouvert:await page.evaluate(()=>window.TRACE.state.siteId||null),prod:await page.evaluate(()=>{const p=window.TRACE.espace.prod().productions['l:karim']||{};return Object.values(p).reduce((a,t)=>a+(t.soudures||0),0);}),carte:await page.$('#cad-card')!==null,on:await cad('on'),av:await cad('avatar','l:karim')};
console.log('a0) avant publication :',J({ouvert:a0.ouvert===sid,prod:a0.prod,carte:a0.carte,on:a0.on,cadence:a0.av&&a0.av.cadence,real:a0.av&&a0.av.realisations}));
C.a0=a0.ouvert!==sid&&a0.prod===58&&!a0.carte&&a0.on===false&&a0.av&&a0.av.cadence===0&&a0.av.realisations===0;
// ── a1 : Commerce → Base de prix : la carte, le barème
await as('ethan','htCom');await click('#eq-app [data-act=af][data-v="seg|prix"]');
await page.setInputFiles('#eq-app input[data-afprix]',{name:'fixture_prix.xlsx',mimeType:'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',buffer:fs.readFileSync(path.join(HERE,'fixture_prix.xlsx'))});await W(2000);
await click('#cad-admin [data-act="jour"][data-v="cad|bar"]');
const a1=await page.evaluate(()=>{const c=document.getElementById('cad-admin');if(!c)return null;const t=s=>s.replace(/[\s  ]+/g,' ').trim();const rows=[...c.querySelectorAll('.cad-bar tr')].map(tr=>[...tr.children].map(td=>t(td.textContent)).join(' | '));
  return {titre:t(c.querySelector('h3').textContent),etat:t(c.querySelector('.cm-ctrlv').textContent),th:rows[0],dn100:rows.find(r=>/^DN 100 \|/.test(r)),dn150:rows.find(r=>/^DN 150 \|/.test(r)),n:rows.length,sst:[...c.querySelectorAll('select[data-xin="cad|sst"] option')].map(o=>o.textContent+(o.selected?'*':'')),minH:(c.querySelector('input[data-xin="cad|minH"]')||{}).value,etinc:(c.querySelector('select[data-xin="cad|etinc"]')||{}).value,pour:(c.querySelector('select[data-xin="cad|pour"]')||{}).value,bouton:t((c.querySelector('[data-v="cad|pub"]')||{}).textContent||''),pub:!!c.querySelector('[data-v="cad|pub"]'),off:!!c.querySelector('[data-v="cad|off"]'),prix:/€|taux/i.test(c.textContent.replace('aucun prix, aucun taux',''))};});
console.log('a1) carte de publication :',J(a1));await shot('a1_bareme','#cad-admin');
C.a1=!!a1&&/^⚡ Cadences de production/.test(a1.titre)&&/^Pas encore publiées/.test(a1.etat)&&/^DN \| Pouces \| Soudure soudeur seul \| Soudure avec tuyauteur \| Soudure tuyauteur \+ chauffeur \| Manchon thermo seul \| Manchon thermo à deux, chacun \| Manchon électro seul \| Fils DH \| Point SST le point, soudeur \| Piquage en charge/.test(a1.th)
  &&a1.dn100==='DN 100 | 4 | 2 h 00 | 1 h 00 | 1 h 00 | 2 h 00 | 1 h 00 | 2 h 30 | 3 min | 2 h 00 | 5 h 00 | 4 h 00 | 3 h 00 | 1 h 00 | 2 h 00'&&a1.dn150==='DN 150 | 6 | 3 h 20 | 1 h 26 | 1 h 26 | 3 h 20 | 1 h 26 | 5 h 00 | 3 min | — | — | 6 h 00 | 3 h 00 | — | —'&&a1.n===19
  &&a1.sst.length===4&&a1.sst[0]==='VANNES BS PN25*'&&a1.minH==='20'&&a1.etinc==='record'&&a1.pour==='enc'&&a1.bouton==='Publier les cadences (essai : encadrement seulement)'&&a1.pub&&!a1.off&&!a1.prix;
// ── a2 : publier — d'abord en essai (encadrement seulement, le choix par défaut) : Karim ne voit rien, Ethan si ; puis « les équipes aussi »
await click('#cad-admin [data-v="cad|pub"]');await W(600);
const e2={ref:await page.evaluate(()=>(JSON.parse(localStorage.getItem('trace:cadref')||'{}')).pour),etat:await txt('#cad-admin .cm-ctrlv'),ethan:await cad('on')};
await prod('karim',0,false);e2.karim={carte:await page.$('#cad-card')!==null,on:await cad('on'),av:await cad('avatar','l:karim').then(a=>[a.cadence,a.realisations])};
await as('ethan','htCom');await click('#eq-app [data-act=af][data-v="seg|prix"]');
await page.evaluate(()=>{const el=document.querySelector('#cad-admin [data-xin="cad|pour"]');el.value='tous';el.dispatchEvent(new Event('change',{bubbles:true}));});await W(300);
e2.avis=await page.evaluate(()=>[...document.querySelectorAll('#cad-admin .cm-ctrlv')].map(x=>x.textContent.replace(/\s+/g,' ').trim().slice(0,28))),e2.bouton=await txt('#cad-admin [data-v="cad|pub"]');
console.log('a2) essai, encadrement seulement :',J(e2));
C.a2e=e2.ref==='enc'&&/^✓ Publiées le 18\/11\/2026 par Ethan L\. · base V99 — en essai : l'encadrement seulement/.test(e2.etat)&&e2.ethan===true&&e2.karim.carte===false&&e2.karim.on===false&&J(e2.karim.av)==='[0,0]'&&e2.avis.some(x=>/^Réglages modifiés ci-dessous/.test(x))&&e2.bouton==='↻ Publier à nouveau aux équipes';
await click('#cad-admin [data-v="cad|pub"]');await W(600);
const a2=await page.evaluate(()=>{const r=JSON.parse(localStorage.getItem('trace:cadref')||'null');const c=document.getElementById('cad-admin');const t=s=>s.replace(/[\s  ]+/g,' ').trim();const s=JSON.stringify(r||{});
  return {v:r&&r.v,par:r&&r.par,version:r&&r.base&&r.base.version,cles:r?Object.keys(r).sort().join():'',sansPrix:!/taux|postes|"fo"|amount|prix/i.test(s),taille:s.length,etat:c?t(c.querySelector('.cm-ctrlv').textContent):'',off:!!(c&&c.querySelector('[data-v="cad|off"]')),toast:t((document.getElementById('toast')||{}).textContent||'')};});
console.log('a2) publié :',J(a2));
C.a2=a2.v===1&&a2.par==='Ethan L.'&&a2.version==='V99'&&a2.cles==='H,at,base,dn,etinc,ext,minH,pan,par,pour,v'&&a2.sansPrix&&a2.taille<12000&&/^✓ Publiées le 18\/11\/2026 par Ethan L\. · base V99 — les équipes les voient/.test(a2.etat)&&a2.off;
// ── a3 : l'appareil de l'administrateur fige la semaine 46
await W(2500);await cad('fige');await W(400);
const a3=await page.evaluate(()=>{const P=window.TRACE.espace.state().people;const g=k=>(P[k]&&P[k].compteurs)||null;return {k:g('l:karim'),p:g('prov:paul'),j:g('l:julien'),e:g('l:ethan'),pend:window.TRACE.espace.state().pending.filter(w=>w.part==='compteurs').length};});
console.log('a3) semaines figées :',J(a3));
C.a3=J(a3.k)===J({'c2026-W46':[41,40,164]})&&J(a3.p)===J({'c2026-W46':[41,40,164]})&&J(a3.j)===J({'c2026-W46':[36.9,40,72]})&&a3.e===null&&a3.pend===0;
// ── k1 : Karim, semaine en cours
await prod('karim',0,false);await W(600);
const carte=()=>page.evaluate(()=>{const c=document.getElementById('cad-card');if(!c)return null;const t=s=>s.replace(/[\s  ]+/g,' ').trim();return {h3:t(c.querySelector('h3').textContent),v:t(c.querySelector('.cad-v').textContent),cls:c.querySelector('.cad-v').className,tiles:[...c.querySelectorAll('.eq-tile')].map(x=>t(x.textContent)),txt:t(c.textContent),hist:[...c.querySelectorAll('.cad-h span')].map(x=>t(x.textContent)+':'+x.className)};});
const k1=await carte();console.log('k1) Karim, semaine en cours :',J(k1&&{h3:k1.h3,v:k1.v,cls:k1.cls,tiles:k1.tiles,hist:k1.hist}));await shot('k1_carte');
C.k1=!!k1&&k1.h3==='⚡ Cadence · semaine 47 · du 16/11 au 22/11 · en cours'&&/^▼ Pour l'instant : en dessous de la cadence il manque 1 h 00$/.test(k1.v)&&/dessous/.test(k1.cls)
  &&J(k1.tiles)===J(['19 h 00débloquées par ta production','20 h 00de travail pointées','1semaine d\'affilée au-dessus · record 1'])&&/164 pouces soudés sur les semaines terminées · \+ 68 cette semaine/.test(k1.txt)&&/Ton avatar porte ton record/.test(k1.txt)&&J(k1.hist)===J(['S46 ▲:dessus']);
// ── k2 : le détail
await click('#cad-card [data-act="jour"][data-v="cad|det"]');
const k2=await page.evaluate(()=>{const d=document.getElementById('cad-detail');if(!d)return null;const t=s=>s.replace(/[\s  ]+/g,' ').trim();return {jours:[...d.querySelectorAll('.cad-jour')].map(j=>({titre:t(j.querySelector('b').textContent)+' '+t((j.querySelector('.eq-s')||{}).textContent||''),l:[...j.querySelectorAll(':scope > .cad-l')].map(l=>t(l.textContent))})),regle:t((d.nextElementSibling||{}).textContent||'')};});
console.log('k2) détail :',J(k2));await shot('k2_detail','#cad-card');
// ── m1 : téléphone (390 puis 360 de large) — la carte et son détail tiennent dans l'écran, rien ne déborde
const m1=[];for(const w of [390,360]){await page.setViewportSize({width:w,height:800});await W(350);
  m1.push(await page.evaluate(()=>{const c=document.getElementById('cad-card');const vw=document.documentElement.clientWidth;const out=[...c.querySelectorAll('*')].filter(el=>{const r=el.getBoundingClientRect();return r.width>0&&(r.right>vw+1||r.left<-1);}).slice(0,3).map(el=>el.className||el.tagName);
    return {vw,carte:Math.round(c.getBoundingClientRect().right),defile:document.documentElement.scrollWidth>vw+1,hors:out,tuiles:[...c.querySelectorAll('.eq-tile b')].map(b=>b.scrollWidth<=b.clientWidth+1)};}));
  if(w===390){await page.evaluate(()=>document.getElementById('cad-card').scrollIntoView());await W(200);await shot('m1_tel390');}}
await page.setViewportSize({width:1366,height:900});await W(300);
console.log('m1) téléphone :',J(m1));C.m1=m1.length===2&&m1.every(x=>x.carte<=x.vw+1&&!x.defile&&!x.hors.length&&x.tuiles.every(Boolean));
C.k2=!!k2&&k2.jours.length===3&&/^lun\. 16\/11 · 10 h 00 pointées → 11 h 00 débloquées · Cadence test · équipe A · avec Paul \(tuyauteur\)$/.test(k2.jours[0].titre)
  &&J(k2.jours[0].l)===J(['9 soudures DN 100 × 1 h 00avec tuyauteur : 10 / jour9 h 00','1 point SST DN 100 × 2 h 00panier « SST — VANNES BS PN25 » : 4 h 00 de soudeur la paire (aller + retour), un point = une conduite2 h 00'])
  &&/^mar\. 17\/11 · 10 h 00 pointées → 8 h 00 débloquées/.test(k2.jours[1].titre)&&J(k2.jours[1].l)===J(['8 soudures DN 100 × 1 h 00avec tuyauteur : 10 / jour8 h 00'])
  &&/^Total de la semaine/.test(k2.jours[2].titre)&&J(k2.jours[2].l)===J(['Heures débloquées par la production19 h 00','Heures de travail pointéespause et trajet inter-chantier exclus20 h 00'])&&/base de prix V99, publiées le 18\/11\/2026\).*20 h pointées au minimum/.test(k2.regle);
// ── k3 : semaine 46 (◀)
await click('#eq-app [data-act="pernav"][data-v="-1"]');await W(400);
const k3=await carte();const k3b=await page.evaluate(()=>[...document.querySelectorAll('#eq-app .eq-sem-h')].map(b=>b.textContent.replace(/[\s  ]+/g,' ').trim()));
const k3d=await page.evaluate(()=>{const d=document.getElementById('cad-detail');return d?[...d.querySelectorAll('.cad-jour')].slice(0,4).map(j=>{const m=/pointées → (\d+ h \d+) débloquées/.exec(((j.querySelector('.eq-s')||{}).textContent||'').replace(/[\s\u00a0\u202f]+/g,' '));return m?m[1]:'';}):null;});
console.log('k3) semaine 46 :',J(k3&&{h3:k3.h3,v:k3.v,tiles:k3.tiles}),J(k3b),J(k3d));
C.k3=!!k3&&k3.h3==='⚡ Cadence · semaine 46 · du 09/11 au 15/11 · figée'&&/^▲ Au-dessus de la cadence \+ 1 h 00 d'avance$/.test(k3.v)&&/dessus/.test(k3.cls)&&k3.tiles[0]==='41 h 00débloquées par ta production'&&k3.tiles[1]==='40 h 00de travail pointées'
  &&k3b.length===1&&/Semaine 46.*41 soudures.*⚡ ▲ \+ 1 h 00/.test(k3b[0])&&J(k3d)===J(['10 h 00','12 h 00','8 h 00','11 h 00']);
// ── k4 / p1 / j1 : compteurs d'avatar, tuyauteur, manchonneur
const av=async id=>{const a=await cad('avatar',id);return a?[a.cadence,a.realisations]:null;};
const k4={av:await av('l:karim'),bilan:await cad('bilan','l:karim')};const kit=await page.evaluate(()=>{const T=window.TRACE;return T.band&&T.band.avatar?/<svg/.test(T.band.avatar(40)):null;});
console.log('k4) avatar de Karim :',J({av:k4.av,serie:k4.bilan.serie,record:k4.bilan.record,pouces:k4.bilan.pouces,svg:kit}));C.k4=J(k4.av)==='[1,164]'&&k4.bilan.serie===1&&k4.bilan.record===1&&kit===true;
const p46=await cad('moi','prov:paul',-1),p47=await cad('moi','prov:paul',0);const p1={s46:[p46.hd,p46.hp,p46.po,p46.et.k,p46.src],s47:[p47.hd,p47.hp,p47.et.k],recu:p47.p&&p47.p.jours['2026-11-16'].L.map(l=>[l.t,l.h,l.de].join('/')).join(),av:await av('prov:paul')};
console.log('p1) Paul, tuyauteur :',J(p1));C.p1=J(p1.s46)===J([41,40,164,'dessus','fige'])&&J(p1.s47)===J([19,20,'dessous'])&&p1.recu==='recu/11/l:karim'&&J(p1.av)==='[1,164]';
await prod('julien',-1,true);await W(300);
const j1=await carte();const j1d=await page.evaluate(()=>{const d=document.getElementById('cad-detail');const t=s=>s.replace(/[\s  ]+/g,' ').trim();const j=d&&d.querySelector('.cad-jour');return j?{titre:t(j.querySelector('.eq-s').textContent),l:[...j.querySelectorAll(':scope > .cad-l')].map(l=>t(l.textContent))}:null;});
console.log('j1) Julien, manchonneur :',J(j1&&{h3:j1.h3,v:j1.v,tiles:j1.tiles}),J(j1d),J(await av('l:julien')));
C.j1=!!j1&&/semaine 46 .* figée$/.test(j1.h3)&&/^▼ En dessous de la cadence il manque 3 h 06$/.test(j1.v)&&j1.tiles[0]==='36 h 54débloquées par ta production'&&/72 pouces manchonnés/.test(j1.txt)&&/la flamme grossit/.test(j1.txt)
  &&!!j1d&&/^· 10 h 00 pointées → 10 h 15 débloquées · Cadence test · équipe B · seul sur le plan$/.test(j1d.titre)&&J(j1d.l)===J(['5 manchons thermo DN 100 × 2 h 00seul : 5 / jour10 h 00','5 fils DH DN 100 × 3 minfils raccordés + mesure0 h 15'])&&J(await av('l:julien'))==='[0,72]';
// ── e1 : Pilotage → Production par équipe, semaine 46
await as('ethan','htExpl');await click('#eq-app [data-v="prodEq"]');await click('#eq-app [data-act="peweek"][data-v="-1"]');await W(500);
const e1a=await page.evaluate(()=>{const t=s=>s.replace(/[\s  ]+/g,' ').trim();const tb=[...document.querySelectorAll('#eq-app .eq-peteam')].map(c=>({h:t(c.querySelector('.ac-h').textContent),th:[...c.querySelectorAll('tr')[0].children].map(x=>t(x.textContent)).join('|'),rows:[...c.querySelectorAll('tr')].slice(1).map(tr=>[...tr.children].map(td=>t(td.textContent)).join(' | '))}));return tb;});
await click('#eq-app [data-act="jour"][data-v="cadp|l:karim"]');
const e1b=await page.evaluate(()=>{const t=s=>s.replace(/[\s  ]+/g,' ').trim();const td=document.querySelector('#eq-app .eq-peteam td[colspan="5"]');return td?{resume:t(td.querySelector('.eq-s').textContent),jours:td.querySelectorAll('.cad-jour').length}:null;});
console.log('e1) production par équipe :',J(e1a),J(e1b));await shot('e1_equipe','#eq-app .eq-peteam');
const eA=e1a.find(x=>/^Équipe A/.test(x.h)),eB=e1a.find(x=>/^Équipe B/.test(x.h));
C.e1=!!eA&&!!eB&&eA.th==='Personne|Heures|Production|Soud./h|⚡ Débloqué'&&eA.rows.some(r=>/Karim B\..*\| 40 h 00 \| 41 soudures \(DN 100 × 41\) \| 1 \/h \| 41 h 00 ▲$/.test(r))&&eA.rows.some(r=>/Paul TESTTUY.*\| 41 h 00 ▲$/.test(r))&&eB.rows.some(r=>/Julien R\..*\| 36 h 54 ▼$/.test(r))
  &&!!e1b&&/^Karim B\. · 41 h 00 débloquées pour 40 h 00 pointées · au-dessus · figée$/.test(e1b.resume)&&e1b.jours===5;
// non-administrateur (Sophie, bureau) : la carte se lit, pas de bouton Publier
await as('sophie','htCom');const e1c=await page.evaluate(()=>{const b=document.querySelector('#eq-app [data-act=af][data-v="seg|prix"]');if(b)b.click();return !!b;});await W(500);
const e1d=await page.evaluate(()=>{const c=document.getElementById('cad-admin');return c?{pub:!!c.querySelector('[data-v="cad|pub"]'),off:!!c.querySelector('[data-v="cad|off"]'),set:!!c.querySelector('[data-xin]'),txt:/réservé à l'administrateur/.test(c.textContent)}:null;});
console.log('e1) non-administrateur :',J({seg:e1c,carte:e1d}));C.e1=C.e1&&(!e1c||e1d===null||(!e1d.pub&&!e1d.off&&!e1d.set&&e1d.txt));
// ── s1 : suspendre
await as('ethan','htCom');await click('#eq-app [data-act=af][data-v="seg|prix"]');await click('#cad-admin [data-v="cad|off"]');await W(500);
const s1a=await page.evaluate(()=>({ls:localStorage.getItem('trace:cadref'),etat:document.querySelector('#cad-admin .cm-ctrlv').textContent.replace(/\s+/g,' ').trim().slice(0,19)}));
await prod('karim',0,false);const s1={ls:s1a.ls,etat:s1a.etat,carte:await page.$('#cad-card')!==null,on:await cad('on'),av:await av('l:karim'),prod:await page.evaluate(()=>/Tes productions/.test(document.getElementById('eq-app').textContent))};
console.log('s1) suspendu :',J(s1));C.s1=s1.ls===null&&s1.etat==='Pas encore publiées'&&!s1.carte&&s1.on===false&&J(s1.av)==='[0,0]'&&s1.prod;
// ── s2 : republier en « série en cours », 16 h minimum
await as('ethan','htCom');await click('#eq-app [data-act=af][data-v="seg|prix"]');
await page.evaluate(()=>{const set=(s,v)=>{const el=document.querySelector(s);el.value=v;el.dispatchEvent(new Event('change',{bubbles:true}));};set('#cad-admin [data-xin="cad|etinc"]','serie');});await W(300);
await page.evaluate(()=>{const el=document.querySelector('#cad-admin [data-xin="cad|pour"]');el.value='tous';el.dispatchEvent(new Event('change',{bubbles:true}));});await W(300);
await page.evaluate(()=>{const el=document.querySelector('#cad-admin [data-xin="cad|minH"]');el.value='16';el.dispatchEvent(new Event('change',{bubbles:true}));});await W(300);
await click('#cad-admin [data-v="cad|pub"]');await W(600);
const s2r=await page.evaluate(()=>{const r=JSON.parse(localStorage.getItem('trace:cadref')||'null');return r?[r.etinc,r.minH,r.pour]:null;});
await prod('karim',0,false);const s2c=await carte();await as('karim','htEspace');await click('#eq-app [data-act="sub"][data-v="avatar"]');await W(600);
const s2t=await page.evaluate(()=>{const m=document.getElementById('eq-app').textContent.match(/(Série en cours|Record) : (\d+) semaine/);return m?m[1]+':'+m[2]:null;});
console.log('s2) série en cours :',J({ref:s2r,carte:s2c&&/Ton avatar porte ta série en cours/.test(s2c.txt),kit:s2t,av:await av('l:karim')}));await shot('s2_avatar');
C.s2=J(s2r)===J(['serie',16,'tous'])&&!!s2c&&/Ton avatar porte ta série en cours/.test(s2c.txt)&&s2t==='Série en cours:1'&&J(await av('l:karim'))==='[1,164]';
console.log('c) console :',J(logs));C.c=logs.length===0;
await browser.close();
const bad=Object.entries(C).filter(([k,v])=>!v).map(([k])=>k);console.log(bad.length?'RESULTAT: ECHEC '+bad.join(','):'RESULTAT: TOUT VERT');
