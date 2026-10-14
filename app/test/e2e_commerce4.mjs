// COMMERCE / TRACEUR, RETOURS DU 14/10/2026 (matin), Ethan :
// 1) « quand j'ouvre tracé sur un chantier différent du précédent […] il ne faut pas voir ce message, il faut avoir l'impression d'arriver sur un nouvel onglet à tracé,
//    vide » : le traceur range son travail PAR CONTEXTE (étude aff:…, chantier site:…, dessin libre) — ouvrir une autre étude = page vide, SANS dialogue, et l'étude
//    précédente garde son dessin (on le retrouve en revenant) ;
// 2) « ça reste dans étude, enregistré dans ce chiffrage, pas plus ; quand je retourne dans commerce il faut que le tracé y soit sans le lier à la main » :
//    enregistrement depuis une étude → modal « Retour à l'affaire » (pas « Ouvrir dans TRACÉ »), l'appli rattache le tracé à l'affaire toute seule au chargement,
//    il reste hors Chantiers (étude) ;
// 3) « le nombre doit être environ le ml/12, des barres ENTAMÉES, sans rajouter de soudure » : barres par tronçon continu (3 tronçons de 8 m = 3 barres, pas 2),
//    chutes réutilisées au même DN (jamais aboutées), coudes / tés coupent le tronçon.
import { chromium } from 'playwright';
const BASE=process.env.BASE||'http://localhost:8765';
const browser=await chromium.launch({headless:true, executablePath: process.env.CHROMIUM_PATH||undefined});
const ctx=await browser.newContext({viewport:{width:1280,height:900}});const page=await ctx.newPage();
const logs=[];page.on('pageerror',e=>logs.push('PAGEERROR: '+e.message.slice(0,300)));page.on('console',m=>{if(m.type()==='error'&&!/supabase|Failed to fetch|net::ERR|404|WebSocket|pdf\.worker|cdnjs/i.test(m.text()))logs.push(m.text().slice(0,200));});
let dialogs=0;page.on('dialog',d=>{dialogs++;d.accept().catch(()=>{});});
const C={};const wait=ms=>page.waitForTimeout(ms);
const NUM='O2610-51';
// ── préparation : une affaire en devis dans l'appli
await page.goto(BASE+'/index.html');await wait(600);await page.evaluate(()=>{localStorage.clear();localStorage.setItem('trace:wide','1');});await page.evaluate(()=>new Promise(r=>{try{const q=indexedDB.deleteDatabase('trace-kv');q.onsuccess=q.onerror=q.onblocked=()=>r();}catch(e){r();}}));
await page.reload();await wait(1200);
{const s=await page.$('#loginSkip');if(s&&await s.isVisible())await s.click();await wait(700);}
await page.evaluate(async n=>{const T=window.TRACE;T.state.userId='ethan';T.renderHome();document.getElementById('htCom').click();await new Promise(x=>setTimeout(x,300));
  document.querySelector('#eq-app [data-act=af][data-v="new|"]').click();await new Promise(x=>setTimeout(x,150));document.getElementById('afn-num').value=n;document.getElementById('afn-nom').value='Antennes en ville';document.getElementById('afn-client').value='CLIENT TEST';document.getElementById('afn-etat').value='devis';
  document.querySelector('#eq-app [data-act=af][data-v="create|"]').click();await new Promise(x=>setTimeout(x,250));},NUM);
C.c0=await page.evaluate(n=>!!window.TRACE.affaires.get(n),NUM);
// ── 1) traceur ouvert depuis l'affaire : page vide, on dessine, on enregistre
const draw=async pts=>{await page.evaluate(pts=>{const M=window.MAQ;M.state.lines.push({id:'L'+(M.state.seq++),name:'Ligne test',dn:100,bar:12,pts,specials:[],parent:null});M.rebuild();},pts);await page.selectOption('#bar','12');await wait(200);}; // selectOption → save() (état rangé dans le contexte)
await page.goto(BASE+'/traceur.html?site=new&aff='+NUM);await wait(900);
let out={lines0:await page.evaluate(()=>window.MAQ.state.lines.length),badge:await page.evaluate(()=>document.getElementById('siteBadge').textContent)};
await draw([[0,0],[30,0]]);
out.lines1=await page.evaluate(()=>window.MAQ.state.lines.length);
console.log('1) étude ouverte, dessin :',JSON.stringify(out),'dialogues :',dialogs);
C.c1=out.lines0===0&&/étude O2610-51/.test(out.badge)&&out.lines1===1&&dialogs===0;
// enregistrement dans TRACÉ depuis l'étude → modal « Retour à l'affaire »
await page.click('#bSave');await wait(250);await page.fill('#svName','Étude antennes');await page.click('#svOk');await wait(1200);
out={btn:await page.evaluate(()=>{const b=document.getElementById('svGo');return b?b.textContent.trim():null;}),note:await page.evaluate(()=>document.getElementById('modalBody').textContent),
  hand:await page.evaluate(async()=>{const {kv}=await import('./index.html'.replace(/.*/,'/src/kv.js')).catch(()=>({kv:null}));return null;})};
out.fiche=await page.evaluate(()=>new Promise(res=>{const q=indexedDB.open('trace-kv');q.onsuccess=()=>{const db=q.result;const tx=db.transaction('kv','readonly').objectStore('kv').getAll();const txk=db.transaction('kv','readonly').objectStore('kv').getAllKeys();let a,b;tx.onsuccess=()=>{a=tx.result;done();};txk.onsuccess=()=>{b=txk.result;done();};const done=()=>{if(!a||!b)return;const i=b.findIndex(k=>String(k).startsWith('trace:handoff:'));res(i<0?null:{id:String(b[i]).slice(14),etude:a[i]&&a[i].fiche&&a[i].fiche.etude||null});};};q.onerror=()=>res(null);}));
console.log('1b) enregistré depuis l\'étude :',JSON.stringify(out));
C.c1b=/Retour à l'affaire O2610-51/.test(out.btn||'')&&/chiffrage de l'affaire O2610-51/.test(out.note)&&out.fiche&&out.fiche.etude&&out.fiche.etude.aff===NUM;
const SITE_ID=out.fiche&&out.fiche.id;
// ── 2) une AUTRE étude : page vide (pas le dessin ni le plan de l'étude précédente), aucun dialogue ; la 1re étude garde son dessin
dialogs=0;
await page.goto(BASE+'/traceur.html?site=new&aff=O2610-52');await wait(900);
out={lines:await page.evaluate(()=>window.MAQ.state.lines.length),bg:await page.evaluate(()=>!!window.MAQ.state.bg),badge:await page.evaluate(()=>document.getElementById('siteBadge').textContent),dialogs};
await page.goto(BASE+'/traceur.html?site=new&aff='+NUM);await wait(900);
out.back={lines:await page.evaluate(()=>window.MAQ.state.lines.length),ref:await page.evaluate(()=>window.MAQ.state.siteRef&&window.MAQ.state.siteRef.name)};
console.log('2) isolement par étude :',JSON.stringify(out));
C.c2=out.lines===0&&!out.bg&&/étude O2610-52/.test(out.badge)&&out.dialogs===0&&out.back.lines===1&&out.back.ref==='Étude antennes';
// ── 3) retour dans l'appli SANS passer par le modal : le tracé est rattaché tout seul, hors Chantiers, visible dans l'affaire
await page.goto(BASE+'/index.html');await wait(1500);
{const s=await page.$('#loginSkip');if(s&&await s.isVisible())await s.click();await wait(600);}
out=await page.evaluate(n=>{const T=window.TRACE;const a=T.affaires.get(n);return {sites:a&&a.sites||[],etude:T.etude.of((a&&a.sites||[])[0]),inChantiers:T.etude.metas().includes((a&&a.sites||[])[0])};},NUM);
console.log('3) liaison automatique :',JSON.stringify(out));
C.c3=out.sites.length===1&&out.sites[0]===SITE_ID&&out.etude===true&&out.inChantiers===false;
// l'onglet Tracé & chantiers de l'affaire liste le tracé (plus de « Aucun chantier lié »)
await page.evaluate(async n=>{const T=window.TRACE;T.state.userId='ethan';T.renderHome();document.getElementById('htCom').click();await new Promise(x=>setTimeout(x,300));const b=[...document.querySelectorAll('#eq-app [data-act=af]')].find(x=>x.dataset.v==='open|'+n);b.click();},NUM);await wait(300);
await page.evaluate(()=>{document.querySelector('#eq-app [data-act=af][data-v="tab|sites"]').click();});await wait(300);
out=await page.evaluate(()=>{const t=document.getElementById('eq-app').textContent.replace(/\s+/g,' ');return {lie:/Étude antennes/.test(t),aucun:/Aucun chantier lié/.test(t)};});
console.log('3b) onglet Tracé & chantiers :',JSON.stringify(out));
C.c3b=out.lie&&!out.aucun;
// ── 4) retour par « ?aff= » (bouton du traceur) : Commerce ouvert sur l'affaire, onglet Tracé & chantiers
await page.goto(BASE+'/index.html?aff='+NUM);await wait(1600);
await page.evaluate(()=>{const T=window.TRACE;T.state.userId='ethan';T.renderHome();});await wait(400); /* comme Ethan connecté : les droits Commerce arrivent après le chargement, le retour s'applique à ce moment-là */
out=await page.evaluate(()=>{const t=document.getElementById('eq-app')?document.getElementById('eq-app').textContent.replace(/\s+/g,' '):'';return {home:document.getElementById('homeView').classList.contains('show'),tab:window.TRACE.state.homeTab,com:/O2610-51/.test(t)&&/Étude antennes/.test(t)};});
console.log('4) index.html?aff → l\'affaire :',JSON.stringify(out));
C.c4=out.home&&out.tab==='commerce'&&out.com;
// ── 5) barres entamées : 3 tronçons de 8 m (coudes entre) = 3 barres par conduite (pas 2) ; chutes imbriquées : 14 m + 5 m = 2 barres (2 pleines… non : 1 pleine + chutes 2 et 5 dans UNE barre)
out=await page.evaluate(()=>{const T=window.TRACE;
  const mk=(id,els)=>({id,els,joints:[],length:els.reduce((s,e)=>s+e.len,0),single:true});
  T.etude.addSite({id:'trc_barres',name:'Barres',w:100,h:100,lines:[
    mk('L1',[{kind:'pipe',dn:100,len:8},{kind:'bend',dn:100,len:0.5},{kind:'pipe',dn:100,len:8},{kind:'bend',dn:100,len:0.5},{kind:'pipe',dn:100,len:8}]),
    mk('L2',[{kind:'pipe',dn:80,len:14},{kind:'tee',dn:80,len:1},{kind:'pipe',dn:80,len:5}])]});
  const q=T.etude.qty('trc_barres');const r100=q.rows.find(r=>r.dn===100),r80=q.rows.find(r=>r.dn===80);
  return {b100:r100&&r100.barres,b80:r80&&r80.barres,ml100:r100&&r100.mlTr};});
console.log('5) barres par tronçon :',JSON.stringify(out));
// DN100 : 3 tronçons de 8 m → 3 barres entamées (l'ancien calcul « ceil(24/12)=2 » recombinait les chutes = soudures en plus) ;
// DN80 : 14 m (1 pleine + chute 2) + 5 m (chute 5) → chutes 2+5 dans UNE barre = 2 barres au total.
C.c5=out.b100===3&&out.b80===2;
C.logs=logs.length===0;
const bad=Object.entries(C).filter(([k,v])=>!v).map(([k])=>k);console.log(bad.length?'RESULTAT: ECHEC '+bad.join(','):'RESULTAT: TOUT VERT');console.log(logs.length?logs:'[]');
await browser.close();
