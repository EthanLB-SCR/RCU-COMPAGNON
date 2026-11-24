// MODULE RH — DEMANDES DE CONGÉ SIGNÉES, CONTRAVENTIONS SUIVIES, MUTUELLE POUR TOUT LE MONDE (24/11/2026, recette d'Ethan lignes 28, 31, 32).
//  L28 « possibilité depuis l'espace du salarié de faire une demande avec les dates et le type de congé, moitié compteur moitié congés, signature, et à signer par son
//        responsable d'exploitation, ou absence déclarée par le bureau et à signer par le gars sur son espace »
//  L31 « une aide de rappel et de trace : qui a eu des PV, que le gars le voie, un suivi de statut reçue, désignée, payée par l'entreprise, par le gars… »
//  L32 « comme pour les habilitations, je devrais retrouver ici toutes les personnes, salariés, les intérimaires séparés »
// Personnages de démo (rien ne part au serveur), données fictives, aujourd'hui mardi 01/12/2026.
//  d1  Karim (soudeur, sans droit RH) : RH → Absences → « ＋ Demander un congé » ; refus sans signature, fin avant début, part compteur > jours ; envoi signé
//      (07/12 → 11/12, 5 j dont 2,5 sur le compteur) → registre rhdem, « ⏳ En attente » ; une 2e demande sur les mêmes dates est refusée (chevauchement)
//  d2  tant qu'elle n'est pas accordée : pas d'absence (navette de décembre sans « CONGÉS PAYÉS »)
//  d3  Ethan (RH) : « À faire » du tableau de bord → 1 demande ; Absences → « 📨 Demandes de congé à traiter · 1 » → Traiter : signature du salarié affichée ;
//      accorder sans signer → refusé ; signé → absence créée (type, dates, 5 j dont 2,5 compteur, les deux signatures, lien vers la demande), demande « accordée »
//  d4  la navette de Karim porte « CONGÉS PAYÉS » du 07 au 11/12 ; Karim voit « ✓ Accordée par … »
//  d5  refus : une demande de RTT le 14/12 → refuser sans motif → refusé ; avec motif → « ✗ Refusée … « motif » » chez Karim
//  d6  annulation : une demande le 21/12 → « Annuler » → annulée (et plus dans les demandes à traiter)
//  d7  absence déclarée par le bureau (« À faire signer par le salarié » coché) → Karim : tâche « 1 absence à signer », carte « ✍ À signer », il signe ;
//      côté RH la ligne dit « ✍ signée par le salarié »
//  d8  Ethan ne traite pas sa propre demande (pastille « ta demande », pas de bouton)
//  d9  contraventions : reçue sans conducteur → désignée (Karim) → payée par le salarié : trace des statuts, clé de la personne (pKey) ; Karim a l'onglet,
//      voit SA contravention avec le suivi, sans « ＋ » ; côté RH : « payé par les salariés » 135 €
//  d10 mutuelle : carte « Tout le monde » — Salariés puis Intérimaires (Nina, « agence d'intérim »), les salariés sans ligne en premier
//  d11 téléphone 390 px : la fenêtre de demande sans débordement ; console propre
import { chromium } from 'playwright';
const BASE=process.env.BASE||'http://localhost:8765';
const browser=await chromium.launch({headless:true, executablePath: process.env.CHROMIUM_PATH||undefined});
const ctx=await browser.newContext({viewport:{width:1280,height:1000}});const page=await ctx.newPage();
const logs=[];page.on('pageerror',e=>logs.push('PAGEERROR: '+e.message.slice(0,300)));page.on('console',m=>{if(m.type()==='error'&&!/supabase|Failed to fetch|net::ERR|404|WebSocket/i.test(m.text()))logs.push(m.text().slice(0,200));});
page.on('dialog',d=>d.accept().catch(()=>{}));
await page.route(u=>/(^|\.)geopf\.fr$|^geo\.api\.gouv\.fr$|open-meteo\.com$/.test(u.hostname),route=>route.fulfill({status:200,contentType:'application/json',body:JSON.stringify({type:'FeatureCollection',features:[],results:[],daily:{time:[],weathercode:[],temperature_2m_max:[],precipitation_sum:[],precipitation_probability_max:[]}})}));
const C={};const wait=ms=>page.waitForTimeout(ms);const J=x=>JSON.stringify(x);
await page.clock.install({time:new Date(2026,11,1,8,30,0)}); /* mardi 01/12/2026 */
await page.goto(BASE+'/index.html');await wait(600);await page.evaluate(()=>{localStorage.clear();localStorage.setItem('trace:wide','1');});await page.evaluate(()=>new Promise(r=>{try{const q=indexedDB.deleteDatabase('trace-kv');q.onsuccess=q.onerror=q.onblocked=()=>r();}catch(e){r();}}));
await page.reload();await wait(1200);{const s=await page.$('#loginSkip');if(s&&await s.isVisible())await s.click();await wait(700);}
await page.evaluate(async()=>{document.getElementById('htRh').click();await new Promise(r=>setTimeout(r,400));const T=window.TRACE;T.rh.provTest('nina',{prenom:'Nina',nom:'FICTIVE',poste:'soudeur',type:'interim',agence:'Agence Fictive'});});
const as=async id=>{await page.evaluate(u=>{const T=window.TRACE;T.state.userId=u;T.renderHome();},id);await wait(500);};
const goRh=async tab=>{await page.evaluate(async t=>{const w=ms=>new Promise(r=>setTimeout(r,ms));document.getElementById('htRh').click();await w(350);const b=document.querySelector('#eq-app .rh-tabs [data-act="x"][data-v="rh|tab|'+t+'"]');if(b){b.click();await w(500);}},tab);};
const txt=()=>page.evaluate(()=>(document.getElementById('eq-app')||document.body).textContent.replace(/\s+/g,' '));
const mtxt=()=>page.evaluate(()=>{const m=document.querySelector('#modal.show');return m?m.textContent.replace(/\s+/g,' '):'';});
const closeM=()=>page.evaluate(()=>{const b=document.querySelector('#modal.show [data-close]');if(b)b.click();});
const sign=async id=>{const b=await page.locator('#'+id).boundingBox();if(!b)return false;await page.mouse.move(b.x+20,b.y+b.height*0.6);await page.mouse.down();for(let i=1;i<=12;i++)await page.mouse.move(b.x+20+i*(b.width-40)/12,b.y+b.height*(0.6+0.25*Math.sin(i)));await page.mouse.up();return true;};
const set=(sel,v)=>page.evaluate(([s,x])=>{const e=document.querySelector(s);e.value=x;e.dispatchEvent(new Event('input',{bubbles:true}));e.dispatchEvent(new Event('change',{bubbles:true}));},[sel,v]);
const dems=()=>page.evaluate(()=>window.TRACE.rh.dem().map(r=>({id:r.id,t:r.t,p:r.p,type:r.type,du:r.du,au:r.au,jours:r.jours,jCpt:r.jCpt,statut:r.statut,sig:!!(r.sig&&/^data:image\/png/.test(r.sig.png||'')),val:r.val?r.val.par:'',refus:r.refus?r.refus.motif:'',absId:r.absId||'',abs:r.abs||''})));
const absK=()=>page.evaluate(()=>window.TRACE.rh.rows('rhabs').filter(a=>a.p==='l:karim').map(a=>({id:a.id,type:a.type,du:a.du,au:a.au,jours:a.jours,jCpt:a.jCpt,dem:a.dem||'',sigSal:!!(a.sigSal&&a.sigSal.png),sigResp:!!(a.sigResp&&a.sigResp.png),aSigner:!!a.aSigner,pKey:a.pKey||''})));
const navLabs=async(pid,mon)=>page.evaluate(([p,m])=>{const R=window.TRACE.espace.navette(p,'2026-12');const w=R.N.weeks.find(x=>x.mon===m);return w&&w.liss?w.liss.jours.slice(0,5).map(j=>j.lab||''):null;},[pid,mon]);
// ── d1) Karim demande un congé
await as('karim');await goRh('abs');
let out={card:/Mes demandes de congé/.test(await txt()),aTraiter:/Demandes de congé à traiter/.test(await txt())};
await page.click('[data-act="x"][data-v="rh|demnew"]');await wait(400);
out.modal=/Demander un congé/.test(await mtxt());
await set('#dm-du','2026-12-07');await set('#dm-au','2026-12-11');await wait(100);out.jAuto=await page.$eval('#dm-j',e=>e.value);
await set('#dm-cpt','2.5');await page.click('#dm-ok');await wait(200);out.errSig=await page.$eval('#dm-err',e=>e.hidden?'':e.textContent);
await set('#dm-cpt','6');await sign('dm-pad');await page.click('#dm-ok');await wait(200);out.errCpt=await page.$eval('#dm-err',e=>e.hidden?'':e.textContent);
await set('#dm-cpt','2.5');await page.click('#dm-ok');await wait(600);out.closed=!(await page.$('#modal.show'));
out.dems=await dems();out.list=await txt();
await page.click('[data-act="x"][data-v="rh|demnew"]');await wait(400);await set('#dm-du','2026-12-09');await set('#dm-au','2026-12-09');await sign('dm-pad');await page.click('#dm-ok');await wait(200);out.errChev=await page.$eval('#dm-err',e=>e.hidden?'':e.textContent);
await set('#dm-du','2026-12-10');await set('#dm-au','2026-12-08');await wait(100);out.auFix=await page.$eval('#dm-au',e=>e.value);await closeM();await wait(200); /* une fin avant le début est recalée sur le début */
const d0=(out.dems||[]).find(d=>d.t==='dem');
console.log('d1)',J({...out,list:out.list.slice(out.list.indexOf('Mes demandes'),out.list.indexOf('Mes demandes')+200)}));
C.d1=out.card&&!out.aTraiter&&out.modal&&out.jAuto==='5'&&/Signe dans le cadre/.test(out.errSig)&&/compteur/.test(out.errCpt)&&out.closed&&out.dems.length===1&&!!d0&&d0.p==='l:karim'&&d0.type==='cp'&&d0.du==='2026-12-07'&&d0.au==='2026-12-11'&&d0.jours===5&&d0.jCpt===2.5&&d0.statut==='demande'&&d0.sig&&/^l:karim\|d\|/.test(d0.id)
  &&/En attente/.test(out.list)&&/déjà une demande en attente/.test(out.errChev)&&out.auFix==='2026-12-10';
// ── d2) pas d'absence tant que ce n'est pas accordé
out={abs:await absK(),lab:await navLabs('l:karim','2026-12-07')};console.log('d2)',J(out));C.d2=out.abs.length===0&&!(out.lab||[]).some(l=>/CONG/.test(l));
// ── d3) Ethan accorde
await as('ethan');await goRh('home');
out={afaire:/1\s*demande de congé à traiter/.test(await txt())};await goRh('abs');out.card=/Demandes de congé à traiter · 1/.test(await txt());
await page.click('#eq-app [data-dem] [data-act="x"][data-v^="rh|demv|"]');await wait(400);out.m=await mtxt();out.img=await page.evaluate(()=>!!document.querySelector('#modal.show img.rh-sig'));
await page.click('#dd-ok');await wait(200);out.errSig=await page.$eval('#dd-err',e=>e.hidden?'':e.textContent);
await sign('dd-pad');await page.click('#dd-ok');await wait(600);out.closed=!(await page.$('#modal.show'));
out.abs=await absK();out.dems=await dems();out.list=await txt();
const a0=out.abs[0]||{};const d1=out.dems.find(d=>d.id===(d0&&d0.id))||{};
console.log('d3)',J({afaire:out.afaire,card:out.card,m:out.m.slice(0,240),img:out.img,errSig:out.errSig,closed:out.closed,abs:out.abs,d1}));
C.d3=out.afaire&&out.card&&/Karim/.test(out.m)&&/07\/12\/2026 au 11\/12\/2026/.test(out.m)&&/dont 2,5 j sur le compteur/.test(out.m)&&out.img&&/Signe dans le cadre/.test(out.errSig)&&out.closed
  &&out.abs.length===1&&a0.type==='cp'&&a0.du==='2026-12-07'&&a0.au==='2026-12-11'&&a0.jours===5&&a0.jCpt===2.5&&a0.dem===(d0&&d0.id)&&a0.sigSal&&a0.sigResp&&/^l:karim\|/.test(a0.id)&&a0.pKey==='l:karim'
  &&d1.statut==='accorde'&&d1.absId===a0.id&&!!d1.val&&/dont 2,5 j sur le compteur/.test(out.list)&&/demandée et signée par le salarié · accordée/.test(out.list)&&!/Demandes de congé à traiter/.test(out.list);
// ── d4) la navette, et ce que voit Karim
out={lab:await navLabs('l:karim','2026-12-07')};await as('karim');await goRh('abs');out.list=await txt();
console.log('d4)',J({lab:out.lab,list:out.list.slice(out.list.indexOf('Mes demandes'),out.list.indexOf('Mes demandes')+220)}));
C.d4=J(out.lab)===J(['CONGÉS PAYÉS','CONGÉS PAYÉS','CONGÉS PAYÉS','CONGÉS PAYÉS','CONGÉS PAYÉS'])&&/✓ Accordée par/.test(out.list);
// ── d5) refus avec motif
await page.click('[data-act="x"][data-v="rh|demnew"]');await wait(400);await page.selectOption('#dm-type','rtt');await set('#dm-du','2026-12-14');await set('#dm-au','2026-12-14');await sign('dm-pad');await page.click('#dm-ok');await wait(500);
await as('ethan');await goRh('abs');await page.click('#eq-app [data-dem] [data-act="x"][data-v^="rh|demv|"]');await wait(400);
await page.click('#dd-ko');await wait(200);out={errMot:await page.$eval('#dd-err',e=>e.hidden?'':e.textContent)};
await set('#dd-mot','Chantier fictif à finir cette semaine-là');await page.click('#dd-ko');await wait(500);
await as('karim');await goRh('abs');out.list=await txt();out.dems=(await dems()).filter(d=>d.type==='rtt');
console.log('d5)',J({errMot:out.errMot,dems:out.dems,list:out.list.slice(out.list.indexOf('Mes demandes'),out.list.indexOf('Mes demandes')+320)}));
C.d5=/motif/.test(out.errMot)&&out.dems.length===1&&out.dems[0].statut==='refuse'&&/Chantier fictif/.test(out.dems[0].refus)&&/✗ Refusée par .*Chantier fictif à finir/.test(out.list)&&(await absK()).length===1;
// ── d6) annulation par le salarié
await page.click('[data-act="x"][data-v="rh|demnew"]');await wait(400);await set('#dm-du','2026-12-21');await set('#dm-au','2026-12-22');await sign('dm-pad');await page.click('#dm-ok');await wait(500);
const d21=(await dems()).find(d=>d.du==='2026-12-21');await page.click('[data-act="x"][data-v="rh|demx|'+d21.id+'"]');await wait(500);
out={st:((await dems()).find(d=>d.id===d21.id)||{}).statut};await as('ethan');await goRh('abs');out.list=await txt();
console.log('d6)',J({st:out.st,aTraiter:/Demandes de congé à traiter/.test(out.list)}));C.d6=out.st==='annulee'&&!/Demandes de congé à traiter/.test(out.list);
// ── d7) absence déclarée par le bureau, signée par le salarié
await page.click('[data-act="x"][data-v="rh|new|rhabs"]');await wait(400);out={chk:await page.$eval('#rh-asig',e=>e.checked)};
await page.selectOption('#rh-p','l:karim');await page.selectOption('#rh-type','evt');await set('#rh-du','2026-12-17');await set('#rh-au','2026-12-17');await page.click('#rh-ok');await wait(500);
out.a=(await absK()).find(a=>a.du==='2026-12-17')||{};
await as('karim');out.tasks=await page.evaluate(()=>document.getElementById('homeBody').textContent.replace(/\s+/g,' '));await goRh('home');out.home=await txt();await goRh('abs');out.card=/✍ À signer · 1/.test(await txt());
await page.click('#eq-app [data-asig] [data-act="x"][data-v^="rh|abssig|"]');await wait(400);out.m=await mtxt();await page.click('#as-ok');await wait(200);out.err=await page.$eval('#as-err',e=>e.hidden?'':e.textContent);
await sign('as-pad');await page.click('#as-ok');await wait(500);out.after=/✍ À signer/.test(await txt());out.sig=(await dems()).filter(d=>d.t==='sig');
await as('ethan');await goRh('abs');out.rh=await txt();
console.log('d7)',J({chk:out.chk,a:out.a,afaire:/1\s*absence à signer/.test(out.home),card:out.card,m:out.m.slice(0,160),err:out.err,after:out.after,sig:out.sig}));
C.d7=out.chk===true&&out.a.aSigner===true&&out.a.type==='evt'&&/1\s*absence à signer/.test(out.home)&&out.card&&/Signer mon absence/.test(out.m)&&/Signe dans le cadre/.test(out.err)&&!out.after&&out.sig.length===1&&out.sig[0].abs===out.a.id&&/^l:karim\|s\|/.test(out.sig[0].id)&&/✍ signée par le salarié/.test(out.rh);
// ── d8) Ethan ne traite pas sa propre demande
await page.click('[data-act="x"][data-v="rh|demnew"]');await wait(400);await set('#dm-du','2027-01-04');await set('#dm-au','2027-01-05');await sign('dm-pad');await page.click('#dm-ok');await wait(500);
out={list:await txt(),btn:await page.evaluate(()=>!!document.querySelector('#eq-app [data-dem] [data-v^="rh|demv|"]'))};
console.log('d8)',J({chip:/ta demande/.test(out.list),btn:out.btn}));C.d8=/Demandes de congé à traiter · 1/.test(out.list)&&/ta demande/.test(out.list)&&!out.btn;
// ── d9) contraventions : trace des statuts, la personne la voit
await goRh('pv');await page.click('[data-act="x"][data-v="rh|new|rhpv"]');await wait(400);out={opts:await page.$$eval('#rh-statut option',o=>o.map(x=>x.value))};
await set('#rh-recu','2026-11-20');await set('#rh-date','2026-11-12');await set('#rh-infraction','Excès de vitesse fictif');await set('#rh-montant','135');await page.click('#rh-ok');await wait(500);
const pv0=await page.evaluate(()=>window.TRACE.rh.rows('rhpv')[0]);out.id0=pv0&&pv0.id;
await page.click('#eq-app [data-act="x"][data-v="rh|edit|rhpv|'+pv0.id+'"]');await wait(400);await page.selectOption('#rh-p','l:karim');await page.click('#rh-ok');await wait(500);
await page.click('#eq-app [data-act="x"][data-v="rh|edit|rhpv|'+pv0.id+'"]');await wait(400);out.suiviModal=await page.evaluate(()=>(document.querySelector('#modal.show [data-pvsuivi]')||{}).textContent||'');await page.selectOption('#rh-statut','payee_sal');await page.click('#rh-ok');await wait(500);
out.pv=await page.evaluate(()=>{const r=window.TRACE.rh.rows('rhpv')[0];return {id:r.id,p:r.p,pKey:r.pKey,statut:r.statut,hist:(r.hist||[]).map(h=>h.statut),suivi:window.TRACE.rh.pvSuivi(r)};});out.rh=await txt();
await as('karim');await goRh('pv');out.k=await txt();out.kPlus=await page.evaluate(()=>!!document.querySelector('[data-act="x"][data-v="rh|new|rhpv"]'));
console.log('d9)',J({opts:out.opts,pv:out.pv,suiviModal:out.suiviModal,rh:/135 €payé par les salariés|135 € payé par les salariés/.test(out.rh),k:out.k.slice(out.k.indexOf('Tes contraventions'),out.k.indexOf('Tes contraventions')+60),kPv:/Excès de vitesse fictif/.test(out.k),kPlus:out.kPlus}));
C.d9=J(out.opts)===J(['recue','designee','payee_sal','payee_ent','payee','contestee','classee'])&&/^ent\|/.test(out.pv.id)&&out.pv.p==='l:karim'&&out.pv.pKey==='l:karim'&&out.pv.statut==='payee_sal'&&J(out.pv.hist)===J(['recue','designee','payee_sal'])
  &&/Reçue .* → Conducteur désigné .* → Payée par le salarié/.test(out.pv.suivi)&&/Suivi : Reçue .* → Conducteur désigné/.test(out.suiviModal)&&/135 €\s*payé par les salariés/.test(out.rh)&&/Tes contraventions/.test(out.k)&&/Excès de vitesse fictif/.test(out.k)&&/suivi : Reçue/.test(out.k)&&!out.kPlus;
// ── d10) mutuelle : tout le monde, intérimaires à part
await as('ethan');await goRh('mut');out=await page.evaluate(()=>{const T=document.querySelector('#eq-app [data-mutall]');if(!T)return null;const rows=[...T.querySelectorAll('tr')];return {grp:rows.filter(r=>r.classList.contains('rh-grp')).map(r=>r.textContent.trim()),first:(rows.find(r=>r.dataset.mutp)||{textContent:''}).textContent.replace(/\s+/g,' '),nina:(rows.find(r=>r.dataset.mutp==='prov:nina')||{textContent:''}).textContent.replace(/\s+/g,' '),sans:rows.filter(r=>/sans ligne/.test(r.textContent)).length,plus:T.querySelectorAll('[data-v^="rh|newp|rhmut|"]').length};});
console.log('d10)',J(out));C.d10=!!out&&out.grp.length===2&&/^Salariés · \d+/.test(out.grp[0])&&/^Intérimaires · 1/.test(out.grp[1])&&/sans ligne/.test(out.first)&&/Nina/.test(out.nina)&&/agence d'intérim/.test(out.nina)&&out.sans>=1&&out.plus>=out.sans;
// ── d11) téléphone 390 px
await page.setViewportSize({width:390,height:844});await as('karim');await goRh('abs');await page.click('[data-act="x"][data-v="rh|demnew"]');await wait(400);
out=await page.evaluate(()=>({doc:document.documentElement.scrollWidth,pad:(document.getElementById('dm-pad')||{getBoundingClientRect:()=>({width:0})}).getBoundingClientRect().width,btnH:(document.getElementById('dm-ok')||{getBoundingClientRect:()=>({height:0})}).getBoundingClientRect().height}));await closeM();
console.log('d11)',J(out));C.d11=out.doc<=390&&out.pad>250&&out.btnH>=40;
C.d12=!logs.length;if(logs.length)console.log('logs',J(logs.slice(0,4)));
const ko=Object.keys(C).filter(k=>!C[k]);console.log('RESULTAT',J(C),ko.length?'ECHEC '+ko.join(','):'TOUT VERT');await browser.close();
