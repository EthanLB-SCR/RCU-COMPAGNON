// Captures du 12/10 : nouvelle personne depuis le planning, Ma semaine, flotte (dessin du véhicule), comptes chantier — hors connexion, personnages de démo.
import { chromium } from 'playwright';
const BASE='http://localhost:8765';
const browser=await chromium.launch({headless:true, executablePath: process.env.CHROMIUM_PATH||undefined});
const ctx=await browser.newContext({viewport:{width:430,height:1000},deviceScaleFactor:2});const page=await ctx.newPage();
const errs=[];page.on('pageerror',e=>errs.push(e.message));
const wait=ms=>page.waitForTimeout(ms);
await page.clock.install({time:new Date(2026,9,9,8,30,0)});
await page.goto(BASE+'/index.html');await wait(600);await page.evaluate(()=>{localStorage.clear();});await page.reload();await wait(1200);const s=await page.$('#loginSkip');if(s&&await s.isVisible())await s.click();await wait(700);
const hub=async(tab,row)=>{await page.evaluate(async([tab,row])=>{const T=window.TRACE;T.state.userId='ethan';T.renderHome();document.getElementById(tab).click();await new Promise(r=>setTimeout(r,250));const bk=document.querySelector('#eq-app .ac-back');if(bk){bk.click();await new Promise(r=>setTimeout(r,150));}const b=[...document.querySelectorAll('#eq-app .ac-row')].find(x=>new RegExp(row).test(x.textContent));b&&b.click();},[tab,row]);await wait(500);};
// 1) planning → ＋ Nouvelle personne (formulaire)
await hub('htEq','Planning des équipes');
await page.evaluate(()=>{document.querySelector('#eq-app [data-act=plnew]').click();});await wait(300);
await page.evaluate(()=>{document.getElementById('pn-prenom').value='Marc';document.getElementById('pn-nom').value='LEROY';const t=document.getElementById('pn-type');t.value='interim';t.dispatchEvent(new Event('change',{bubbles:true}));document.getElementById('pn-agence').value='Manpower';document.getElementById('pl-new').scrollIntoView({block:'start'});});await wait(200);
await page.screenshot({path:'/root/repo/app/test/shot_1210_nouvelle_personne.png'});
await page.evaluate(()=>{document.querySelector('#eq-app [data-act=plnewok]').click();});await wait(600);
await page.evaluate(()=>{const c=[...document.querySelectorAll('#pl-tray .eq-plchip')].find(x=>/LEROY/.test(x.textContent));c&&c.scrollIntoView({block:'center'});});await wait(200);
await page.screenshot({path:'/root/repo/app/test/shot_1210_a_placer.png'});
// 2) Ma semaine
await hub('htEq','Ma semaine');
await page.evaluate(()=>{document.querySelector('#eq-app [data-act=agnew][data-v="2026-10-05"]').click();});await wait(250);
await page.evaluate(()=>{document.getElementById('ag-site').value='demo_caen';document.getElementById('ag-h0').value='09:00';document.getElementById('ag-h1').value='10:30';document.getElementById('ag-note').value='PV de réception tranchée';document.querySelector('#eq-app [data-act=agok]').click();});await wait(400);
await page.evaluate(()=>{document.querySelector('#eq-app [data-act=agnew][data-v="2026-10-08"]').click();});await wait(250);
await page.evaluate(()=>{document.getElementById('ag-type').value='reunion';document.getElementById('ag-title').value='Point hebdo direction';document.getElementById('ag-h0').value='14:00';document.getElementById('ag-h1').value='16:00';document.querySelector('#eq-app [data-act=agok]').click();});await wait(400);
await page.screenshot({path:'/root/repo/app/test/shot_1210_ma_semaine.png'});
// 3) flotte : véhicule dessiné (fiche)
await page.evaluate(()=>{const T=window.TRACE;T.state.userId='ethan';T.renderHome();document.getElementById('htParc').click();});await wait(400); /* 12/10 soir : la flotte vit dans Parc */
await page.evaluate(async()=>{window.prompt=()=>'GT-648-SE';document.querySelector('#eq-app [data-act=fl][data-v="new|"]').click();await new Promise(r=>setTimeout(r,300));const set=(k,v)=>{const el=document.querySelector(`#eq-app [data-flf=${k}]`);if(!el)return;el.value=v;el.dispatchEvent(new Event('change',{bubbles:true}));};set('marque','RENAULT');set('modele','MASTER');set('type','Soudeur');set('conducteur','Karim B.');set('km','120500');set('ctProchain','2026-10-21');});await wait(500);
await page.evaluate(()=>window.scrollTo(0,0));
await page.screenshot({path:'/root/repo/app/test/shot_1210_vehicule.png'});
await page.evaluate(()=>{document.querySelector('#eq-app [data-act=fl][data-v="back|"]').click();});await wait(400);
await page.screenshot({path:'/root/repo/app/test/shot_1210_flotte_liste.png'});
// 4) comptes chantier
await hub('htEq','Bons de commande'); /* 12/10 soir : achats & comptes dans Chantiers → Équipes & heures */
await page.evaluate(()=>{document.querySelector('#eq-app [data-act=cmd][data-v="tab|comptes"]').click();});await wait(400);
await page.screenshot({path:'/root/repo/app/test/shot_1210_comptes.png'});
console.log('ok',errs);
await browser.close();
