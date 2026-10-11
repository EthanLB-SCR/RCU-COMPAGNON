// Captures du 12/10 soir : six onglets (Aujourd'hui avec les tuiles), Chantiers → récap Mes chantiers sous la carte, Équipes & heures, Sécurité, déclaration d'accident,
// Commerce (segments + versions de chiffrage + reporting), Parc, Entreprise réduit, Production par équipe, Ma semaine avec la carte Outlook — hors connexion, personnages de démo.
import { chromium } from 'playwright';
const BASE='http://localhost:8765';
const browser=await chromium.launch({headless:true, executablePath: process.env.CHROMIUM_PATH||undefined});
const ctx=await browser.newContext({viewport:{width:430,height:1000},deviceScaleFactor:2});const page=await ctx.newPage();
const errs=[];page.on('pageerror',e=>errs.push(e.message));page.on('dialog',d=>d.accept().catch(()=>{}));
const wait=ms=>page.waitForTimeout(ms);const shot=n=>page.screenshot({path:'/root/repo/app/test/shot_1210b_'+n+'.png'});
await page.clock.install({time:new Date(2026,9,9,8,30,0)});
await page.goto(BASE+'/index.html');await wait(600);await page.evaluate(()=>{localStorage.clear();});await page.reload();await wait(1200);const s=await page.$('#loginSkip');if(s&&await s.isVisible())await s.click();await wait(700);
await page.evaluate(()=>{const T=window.TRACE;const src=T.sites[Object.keys(T.sites).find(k=>k!=='__vide'&&T.sites[k]&&T.sites[k].lines)];const mk=(id,name,ville,extra)=>{if(T.sites[id])return;const x=JSON.parse(JSON.stringify(src));x.id=id;x.name=name;x.fiche=Object.assign({ville,secteur:'ouest'},extra||{});T.sites[id]=x;};mk('demo_caen','Caen — Presqu\'île','Caen',{chef:'l:ethan'});mk('demo_rennes','Rennes — Baud-Chardonnet','Rennes');});
const go=async(tab)=>{await page.evaluate(t=>{const T=window.TRACE;T.state.userId='ethan';T.renderHome();document.getElementById(t).click();},tab);await wait(450);};
const row=async(re)=>{await page.evaluate(re=>{const bk=document.querySelector('#eq-app .ac-back');if(bk)bk.click();const b=[...document.querySelectorAll('#eq-app .ac-row')].find(x=>new RegExp(re).test(x.textContent));b&&b.click();},re);await wait(450);};
// Karim placé à Caen (pour la production par équipe et le récap)
await go('htSites');await go('htEq');await row('Planning des équipes');
await page.evaluate(()=>{const c=[...document.querySelectorAll('#eq-app .eq-pltray .eq-plchip')].find(x=>/Karim/.test(x.textContent));if(c){c.querySelector('.eq-plmain').click();document.querySelector('#eq-app .eq-plsite[data-drop=demo_caen] [data-act=plput]').click();}});await wait(300);
// 1) Aujourd'hui : tuiles des six espaces
await go('htHome');await page.evaluate(()=>{const t=document.querySelector('#eq-app .ac-spaces');t&&t.scrollIntoView({block:'center'});});await wait(200);await shot('aujourdhui_tuiles');
// 2) Chantiers → carte → récap Mes chantiers
await go('htSites');await page.evaluate(()=>{document.getElementById('htMap').click();});await wait(500);await page.evaluate(()=>{const t=document.querySelector('#homeBody .siteRecaps');t&&t.scrollIntoView({block:'start'});});await wait(200);await shot('mes_chantiers_recap');
// 3) Équipes & heures (hub)
await go('htEq');await page.evaluate(()=>window.scrollTo(0,0));await shot('equipes_heures');
// 4) Sécurité (hub) + déclaration d'accident (formulaire)
await go('htSecu');await shot('securite');
await row('Déclarer un accident');await page.evaluate(()=>{document.querySelector('#eq-app [data-act=accnew]').click();});await wait(300);
await page.evaluate(()=>{document.getElementById('ac-type').value='presque';document.getElementById('ac-site').value='demo_caen';document.getElementById('ac-lieu').value='fouille T3';document.getElementById('ac-circ').value='Glissade sur le marchepied mouillé de la pelle en descendant';document.getElementById('ac-lesion').value='cheville droite';document.getElementById('ac-arret').value='non';});await shot('accident_formulaire');
await page.evaluate(()=>{document.getElementById('ac-ok').click();});await wait(400);await shot('accidents_liste');
// 5) Commerce : devis & chiffrage (liste + création), versions, reporting
await go('htCom');await page.evaluate(async()=>{const q=s=>document.querySelector('#eq-app '+s);q('[data-act=af][data-v="new|"]').click();await new Promise(r=>setTimeout(r,150));document.getElementById('afn-num').value='O2610-07';document.getElementById('afn-nom').value='Lorient — Kerentrech';document.getElementById('afn-client').value='DALKIA';document.getElementById('afn-ville').value='Lorient';document.getElementById('afn-etat').value='devis';document.getElementById('afn-montant').value='450000';q('[data-act=af][data-v="create|"]').click();await new Promise(r=>setTimeout(r,250));
  q('[data-act=af][data-v="tab|chiffrage"]').click();await new Promise(r=>setTimeout(r,200));window.prompt=()=>'Négociation · remise 3 %';q('[data-act=af][data-v="vnew|"]').click();await new Promise(r=>setTimeout(r,200));window.prompt=()=>'Alignement technique (DN150 → DN125)';q('[data-act=af][data-v="vnew|"]').click();await new Promise(r=>setTimeout(r,200));const d=document.querySelector('#eq-app details');if(d)d.open=true;});await wait(300);
await page.evaluate(()=>window.scrollTo(0,0));await shot('commerce_chiffrage_versions');
await page.evaluate(async()=>{document.querySelector('#eq-app [data-act=af][data-v="back|"]').click();await new Promise(r=>setTimeout(r,200));});await shot('commerce_devis');
await page.evaluate(async()=>{document.querySelector('#eq-app [data-act=af][data-v="seg|rep"]').click();await new Promise(r=>setTimeout(r,250));});await shot('commerce_reporting');
// 6) Parc
await go('htParc');await shot('parc');
// 7) Entreprise (hub réduit)
await go('htEnt');await shot('entreprise');
// 8) Production par équipe
await go('htSites');await go('htEq');await row('Production par équipe');await shot('production_par_equipe');
// 9) Ma semaine : carte Outlook
await row('Ma semaine');await page.evaluate(()=>{const c=[...document.querySelectorAll('#eq-app .card')].find(c=>/Relié à Outlook/.test(c.textContent));c&&c.scrollIntoView({block:'center'});});await wait(200);await shot('ma_semaine_outlook');
// 10) onglet QSE du chantier : bouton déclarer
await page.evaluate(async()=>{const T=window.TRACE;await T.go('demo_caen');await new Promise(r=>setTimeout(r,1200));T.state.tab='qse';T.renderAll();await new Promise(r=>setTimeout(r,300));const b=document.getElementById('qse-accident');b&&b.scrollIntoView({block:'center'});});await wait(300);await shot('qse_declarer');
console.log('ok',errs);
await browser.close();
