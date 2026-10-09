// capture : Planning équipe (Mon espace → « Planning équipe ») — hors connexion, personnage Ethan L. (administrateur) ; téléphone puis large ; puis l'accueil vu par Karim (soudeur) avec les cartes grisées
import { chromium } from 'playwright';
const BASE=process.env.BASE||'http://localhost:8765';
const browser=await chromium.launch({headless:true, executablePath: process.env.CHROMIUM_PATH||undefined});
const ctx=await browser.newContext({viewport:{width:430,height:900}});const page=await ctx.newPage();
const errs=[];page.on('pageerror',e=>errs.push(e.message+' | '+(e.stack||'').split('\n').slice(1,3).join(' | ')));page.on('console',m=>{if(m.type()==='error'&&!/supabase|Failed to fetch|net::ERR|404/i.test(m.text()))errs.push(m.text().slice(0,200));});
page.on('dialog',d=>d.accept().catch(()=>{}));
await page.goto(BASE+'/index.html');await page.waitForTimeout(600);await page.evaluate(()=>{localStorage.clear();});await page.evaluate(()=>new Promise(r=>{try{const q=indexedDB.deleteDatabase('trace-kv');q.onsuccess=q.onerror=q.onblocked=()=>r();}catch(e){r();}}));
await page.reload();await page.waitForTimeout(1200);
const skip=async()=>{const s=await page.$('#loginSkip');if(s&&await s.isVisible())await s.click();await page.waitForTimeout(700);};await skip();
// deux chantiers de démo de plus (copies du chantier de démo, avec une fiche : ville, secteur)
const seed=async()=>page.evaluate(()=>{const T=window.TRACE;const src=T.sites[Object.keys(T.sites).find(k=>k!=='__vide'&&T.sites[k]&&T.sites[k].lines)];if(!src)return 'pas de chantier de démo';
  const mk=(id,name,ville,secteur)=>{if(T.sites[id])return;const s=JSON.parse(JSON.stringify(src));s.id=id;s.name=name;s.fiche={ville,secteur};T.sites[id]=s;};
  mk('demo_caen','Caen — Presqu\'île','Caen','ouest');mk('demo_rennes','Rennes — Baud-Chardonnet','Rennes','ouest');mk('demo_lyon','Lyon — Confluence','Lyon','sudest');return Object.keys(T.sites).length;});
console.log('seed',await seed());
await page.evaluate(()=>{window.TRACE.state.userId='ethan';window.TRACE.renderHome();document.getElementById('htEspace').click();});await page.waitForTimeout(700);
const subs=await page.evaluate(()=>[...document.querySelectorAll('#eq-app .eq-subs .chip')].map(x=>x.textContent.trim()));console.log(JSON.stringify({subs}));
const go=async()=>{await page.evaluate(()=>{const b=[...document.querySelectorAll('#eq-app .eq-subs .chip')].find(x=>/Planning équipe/.test(x.textContent));b&&b.click();});await page.waitForTimeout(600);};
await go();await page.screenshot({path:'shot_orga_vide.png'});
const n0=await page.evaluate(()=>({tray:document.querySelectorAll('#eq-app .eq-pltray .eq-plchip').length,sites:document.querySelectorAll('#eq-app .eq-plsite').length,prog:(document.querySelector('#eq-app .eq-plprog')||{}).textContent}));
// choisir Karim dans le bac puis un chantier
await page.evaluate(()=>{const c=[...document.querySelectorAll('#eq-app .eq-pltray .eq-plchip')].find(x=>/Karim/.test(x.textContent));c&&c.querySelector('.eq-plmain').click();});await page.waitForTimeout(300);
await page.screenshot({path:'shot_orga_sel.png'});
await page.evaluate(()=>{const b=document.querySelector('#eq-app .eq-plsite[data-drop=demo_caen] [data-act=plput]');b&&b.click();});await page.waitForTimeout(500);
await page.evaluate(()=>{const c=[...document.querySelectorAll('#eq-app .eq-pltray .eq-plchip')].find(x=>/Julien/.test(x.textContent));c&&c.querySelector('.eq-plmain').click();});await page.waitForTimeout(200);
await page.evaluate(()=>{const b=document.querySelector('#eq-app .eq-plsite[data-drop=demo_rennes] [data-act=plput]');b&&b.click();});await page.waitForTimeout(500);
const n1=await page.evaluate(()=>({tray:document.querySelectorAll('#eq-app .eq-pltray .eq-plchip').length,place:document.querySelectorAll('#eq-app .eq-plsite .eq-plchip').length,prog:(document.querySelector('#eq-app .eq-plprog')||{}).textContent}));
console.log(JSON.stringify({n0,n1}));
// régler les jours de Karim (retirer le vendredi)
await page.evaluate(()=>{const b=document.querySelector('#eq-app .eq-plsite[data-drop=demo_caen] .eq-plchip .eq-plmain');b&&b.click();});await page.waitForTimeout(300);
await page.evaluate(()=>{const b=[...document.querySelectorAll('#eq-app .eq-pledit [data-act=plday]')].pop();b&&b.click();});await page.waitForTimeout(300);
await page.evaluate(()=>{const b=document.querySelector('#eq-app .eq-plsite[data-drop=demo_caen] .eq-plchip .eq-plmain');b&&b.click();});await page.waitForTimeout(300);
await page.screenshot({path:'shot_orga_jours.png'});
await page.evaluate(()=>{window.scrollTo(0,0);const el=document.querySelector('#eq-app .eq-plsite');el&&el.scrollIntoView();});await page.waitForTimeout(200);await page.screenshot({path:'shot_orga_sites.png'});
// large
await page.setViewportSize({width:1400,height:950});await page.evaluate(()=>{localStorage.setItem('trace:wide','1');});await page.reload();await page.waitForTimeout(1200);await skip();await seed();
await page.evaluate(()=>{window.TRACE.state.userId='ethan';window.TRACE.renderHome();document.getElementById('htEspace').click();});await page.waitForTimeout(700);await go();await page.screenshot({path:'shot_orga_large.png'});
// accueil de Karim : liste des chantiers, cartes grisées sauf Caen
await page.setViewportSize({width:430,height:900});await page.evaluate(()=>{localStorage.setItem('trace:wide','0');localStorage.setItem('trace:homeTab','list');});await page.reload();await page.waitForTimeout(1200);await skip();await seed();
await page.evaluate(()=>{window.TRACE.state.userId='karim';window.TRACE.renderHome();});await page.waitForTimeout(600);
const lock=await page.evaluate(()=>[...document.querySelectorAll('.siteCard')].map(c=>({id:c.dataset.open,locked:c.classList.contains('locked')})));console.log(JSON.stringify({lock}));
await page.screenshot({path:'shot_orga_karim.png'});
console.log(JSON.stringify({errs}));await browser.close();
