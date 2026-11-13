// e2e_retours_1211 — premiers retours d'Ethan (12/11/2026) :
//  « Flotte : enlève l'ancienne vue 3D qui prend de la place en premier sur l'écran pour laisser place à ce que nous venons d'ajouter ; et la vue 3D visible quand on
//    appuie sur Parking 3D » · « Je ne trouve pas l'espace préfabrication ? »
//  f1 onglet Flotte : plus de 3D en tête — le module (nouvel écran) est en premier ; f2 « Parking 3D » : la 3D du parking (scène flotte) montée DANS l'écran du module,
//     plus de « Lot F4 : à venir » ; f3 on quitte Parking 3D → plus de 3D ; f4 fiche d'un véhicule → « Voir au parking » → la caméra va sur ce véhicule ;
//  p1 plan : le « ＋ » (Poser sur le plan) propose « ⏳ Soudure faite, pas sur le plan » → l'espace d'attente s'ouvre ; p2 soudeur : le ＋ est là, l'entrée aussi ;
//  p3 ☰ Menu : « ⏳ Préfabrication (en attente) » toujours là ; c console propre. Données fictives uniquement (véhicule AB-123-CD, dépôts A / B).
import { chromium } from 'playwright';
const BASE=process.env.BASE||'http://127.0.0.1:8766';const J=x=>JSON.stringify(x);
const browser=await chromium.launch({headless:true,executablePath:process.env.CHROMIUM_PATH||undefined,args:['--ignore-gpu-blocklist','--enable-unsafe-swiftshader']});
const C={};const logs=[];
const suivre=page=>{page.on('pageerror',e=>logs.push('PAGEERROR: '+e.message.slice(0,300)));page.on('console',m=>{if(m.type()==='error'&&!/supabase|Failed to fetch|net::ERR|404|WebSocket|fonts.googleapis|geopf|open-meteo/i.test(m.text()))logs.push(m.text().slice(0,200));});page.on('dialog',d=>d.accept().catch(()=>{}));};
// ── Flotte ──
{const ctx=await browser.newContext({viewport:{width:1366,height:900}});const page=await ctx.newPage();suivre(page);const W=ms=>page.waitForTimeout(ms);
  await page.goto(BASE+'/index.html');await W(600);
  await page.evaluate(()=>{localStorage.clear();localStorage.setItem('trace:wide','1');localStorage.setItem('trace:monde',JSON.stringify({v:1,on:true,testeurs:['ethan','l:ethan'],depots:{ouest:{nom:'Dépôt A',ville:'Ville A'},idf:{nom:'Dépôt B',ville:'Ville B'}},magasin:'ouest'}));});
  await page.evaluate(()=>new Promise(r=>{try{const q=indexedDB.deleteDatabase('trace-kv');q.onsuccess=q.onerror=q.onblocked=()=>r();}catch(e){r();}}));
  await page.reload();await W(1300);{const s=await page.$('#loginSkip');if(s&&await s.isVisible())await s.click();await W(700);}
  await page.evaluate(()=>{const T=window.TRACE;T.state.userId='ethan';T.renderHome();});await W(500);
  const home=async id=>{await page.evaluate(i=>{const b=document.getElementById(i);if(b)b.click();},id);await W(2000);};
  await home('htHome');await W(800);const ok3d=await page.evaluate(()=>!!(window.TRACE.monde3d&&window.TRACE.monde3d()));
  // un véhicule fictif (même chemin que « ➕ Véhicule » : fenêtre fl-ask)
  await home('htParc');
  await page.evaluate(async()=>{const b=document.createElement('button');b.dataset.act='fl';b.dataset.v='new|';b.style.display='none';document.querySelector('#eq-app').append(b);b.click();await new Promise(r=>setTimeout(r,400));const a=document.getElementById('fl-ask');if(a){a.value='AB-123-CD';document.getElementById('fl-ask-ok').click();}});await W(900);
  await page.evaluate(()=>{const b=document.querySelector('#modal.show [data-close]');if(b)b.click();});await W(300);
  await home('htParc');
  const etat=()=>page.evaluate(()=>{const app=document.getElementById('eq-app');const slots=[...app.querySelectorAll('.m3d-slot')];const first=app.firstElementChild;
    return {slots:slots.map(s=>({kind:s.dataset.m3dKind,dansModule:!!s.closest('.fl-root'),canvas:!!s.querySelector('canvas')})),premier:first?(first.className||first.tagName):'',module:!!app.querySelector('.fl-root'),
      titre:(app.querySelector('.fl-root .af-main h1')||{}).textContent||'',navTitle:(app.querySelector('.fl-root [data-act="aller"][data-h="parking"]')||{}).title||''};});
  // f1
  const f1=await etat();f1.vehs=await page.evaluate(()=>window.TRACE.flotte.all().map(v=>v.immat));console.log('f1) Flotte :',J(f1));
  C.f1=f1.module&&f1.slots.length===0&&f1.vehs.includes('AB-123-CD')&&!/à venir/.test(f1.navTitle);
  // f2
  await page.evaluate(()=>{const b=document.querySelector('#eq-app .fl-root [data-act="aller"][data-h="parking"]');if(b)b.click();});await W(3500);
  const f2=await etat();f2.scene=await page.evaluate(()=>{const H=window.TRACE.monde3d&&window.TRACE.monde3d();return H?H.state.scene:null;});console.log('f2) Parking 3D :',J(f2));
  C.f2=f2.titre==='Parking 3D'&&(ok3d?(f2.slots.length===1&&f2.slots[0].kind==='flotte'&&f2.slots[0].dansModule&&f2.slots[0].canvas&&f2.scene==='flotte'):true);
  // f3
  await page.evaluate(()=>{const b=document.querySelector('#eq-app .fl-root [data-act="aller"][data-h="vehicules"]');if(b)b.click();});await W(1200);
  const f3=await etat();console.log('f3) Véhicules :',J({slots:f3.slots.length,titre:f3.titre}));C.f3=f3.slots.length===0&&/Véhicules/.test(f3.titre);
  // f4
  await page.evaluate(()=>{window.FL.aller('veh-AB-123-CD');});await W(900);
  const f4={btn:await page.evaluate(()=>!!document.querySelector('#eq-app .fl-root [data-act="pkVoir"][data-immat="AB-123-CD"]'))};
  await page.evaluate(()=>{const b=document.querySelector('#eq-app .fl-root [data-act="pkVoir"][data-immat="AB-123-CD"]');if(b)b.click();});await W(4000);
  Object.assign(f4,await page.evaluate(()=>{const H=window.TRACE.monde3d&&window.TRACE.monde3d();const s=H&&H.state.sel;return {scene:H?H.state.scene:null,sel:s?{type:s.type,id:s.id}:null,pkSel:window.FL.etat.pkSel||null};}));
  const idV=await page.evaluate(()=>{const v=window.TRACE.flotte.all().find(x=>x.immat==='AB-123-CD');return v?(v.id||v.immat):null;});
  console.log('f4) Voir au parking :',J({...f4,idV}));C.f4=f4.btn&&(ok3d?(f4.scene==='flotte'&&f4.sel&&f4.sel.type==='vehicle'&&f4.sel.id===idV&&f4.pkSel===null):true);
  if(!ok3d)console.log('(WebGL indisponible : f2 et f4 vérifient seulement l\'écran)');
  await ctx.close();}
// ── Préfabrication : le « ＋ » du plan ──
{const ctx=await browser.newContext({viewport:{width:1280,height:850}});const page=await ctx.newPage();suivre(page);const W=ms=>page.waitForTimeout(ms);
  await ctx.route(u=>/(^|\.)geopf\.fr$|^geo\.api\.gouv\.fr$|open-meteo\.com$/.test(u.hostname),r=>r.fulfill({status:200,contentType:'application/json',body:'[]'}));
  await page.goto(BASE+'/traceur.html');await W(500);await page.evaluate(()=>{localStorage.clear();});await page.evaluate(()=>new Promise(r=>{try{const q=indexedDB.deleteDatabase('trace-kv');q.onsuccess=q.onerror=q.onblocked=()=>r();}catch(e){r();}}));await page.reload();await W(600);
  await page.evaluate(()=>{const S=window.MAQ.state;S.lines=[{id:'L1',name:'Feeder',dn:100,bar:12,pts:[[10,50],[70,50]],specials:[],parent:null}];S.seq=2;window.MAQ.setMode('select');window.MAQ.rebuild();});
  await page.click('#bSave');await W(200);await page.fill('#svName','Préfa test');await page.click('#svOk');await W(800);await page.click('#svGo');await W(1800);
  const essai=async who=>{await page.selectOption('#roleSel',who);await W(500);await page.evaluate(()=>{const T=window.TRACE;T.state.tab='plan';T.renderAll();});await W(400);
    const fab=await page.evaluate(()=>{const f=document.getElementById('planFab');return !!f&&f.style.display!=='none'&&f.getBoundingClientRect().width>0;});
    await page.evaluate(()=>{const f=document.getElementById('planFab');if(f)f.click();});await W(400);
    const entree=await page.evaluate(()=>{const b=document.querySelector('#modal.show [data-pose-mode="attente"]');return b?{txt:b.textContent.replace(/\s+/g,' ').trim().slice(0,80),dis:b.disabled}:null;});
    await page.evaluate(()=>{const b=document.querySelector('#modal.show [data-pose-mode="attente"]');if(b&&!b.disabled)b.click();});await W(600);
    const espace=await page.evaluate(()=>({modal:document.getElementById('modal').classList.contains('show'),titre:(document.querySelector('#modal h3')||{}).textContent||'',nouveau:!!document.getElementById('att-new')}));
    await page.evaluate(()=>{const b=document.querySelector('#modal.show [data-close]');if(b)b.click();});await W(300);return {fab,entree,espace};};
  const p1=await essai('ethan');console.log('p1) chef / admin :',J(p1));
  C.p1=p1.fab&&p1.entree&&/Soudure faite, pas sur le plan/.test(p1.entree.txt)&&!p1.entree.dis&&p1.espace.modal&&/Préfabrication/.test(p1.espace.titre)&&p1.espace.nouveau;
  const p2=await essai('karim');console.log('p2) soudeur :',J(p2));C.p2=p2.fab&&p2.entree&&!p2.entree.dis&&p2.espace.nouveau;
  const p3=await page.evaluate(()=>!!document.getElementById('btnAttente'));console.log('p3) ☰ Menu :',p3);C.p3=p3;
  await ctx.close();}
console.log('c) console :',J(logs));C.c=logs.length===0;
await browser.close();
const bad=Object.entries(C).filter(([k,v])=>!v).map(([k])=>k);console.log(bad.length?'RESULTAT: ECHEC '+bad.join(','):'RESULTAT: TOUT VERT');
