// captures : ACCUEIL GÉNÉRAL + espaces (refonte 09/10 soir) — hors connexion : Karim (soudeur) puis Ethan (admin) ; téléphone et large
import { chromium } from 'playwright';
const BASE=process.env.BASE||'http://localhost:8765';
const browser=await chromium.launch({headless:true, executablePath: process.env.CHROMIUM_PATH||undefined});
const ctx=await browser.newContext({viewport:{width:430,height:900}});const page=await ctx.newPage();
const errs=[];page.on('pageerror',e=>errs.push(e.message+' | '+(e.stack||'').split('\n').slice(1,3).join(' | ')));page.on('console',m=>{if(m.type()==='error'&&!/supabase|Failed to fetch|net::ERR|404/i.test(m.text()))errs.push(m.text().slice(0,200));});
page.on('dialog',d=>d.accept().catch(()=>{}));
await page.goto(BASE+'/index.html');await page.waitForTimeout(600);await page.evaluate(()=>{localStorage.clear();});await page.evaluate(()=>new Promise(r=>{try{const q=indexedDB.deleteDatabase('trace-kv');q.onsuccess=q.onerror=q.onblocked=()=>r();}catch(e){r();}}));
await page.reload();await page.waitForTimeout(1200);
const skip=async()=>{const s=await page.$('#loginSkip');if(s&&await s.isVisible())await s.click();await page.waitForTimeout(700);};await skip();
const seed=async()=>page.evaluate(()=>{const T=window.TRACE;const src=T.sites[Object.keys(T.sites).find(k=>k!=='__vide'&&T.sites[k]&&T.sites[k].lines)];if(!src)return 0;const mk=(id,name,ville,secteur)=>{if(T.sites[id])return;const x=JSON.parse(JSON.stringify(src));x.id=id;x.name=name;x.fiche={ville,secteur};x.conv={msgs:[{id:'m1',kind:'msg',by:'Julie M.',text:'Photos du DH tronçon 3 avant 15 h svp',at:new Date().toISOString()},{id:'t1',kind:'task',by:'Julie M.',text:'Reprendre S-0041 avant contrôle',task:{to:'tous',done:false},at:new Date().toISOString()}],seq:3};x.qse={docs:[{id:'q1',type:'accueil',title:'Accueil chantier du 05/10/2026',by:'Paul D.',at:new Date().toISOString(),qs:[],sigs:[]}]};x.stock={zones:[],lots:[],livs:[{id:'LV1',label:'Camion Renalia n° 3',bl:'BL-4471',date:new Date().toISOString().slice(0,10),status:'prevu',prevu:[{label:'Tube DN150',qty:20}]}],moves:[],takes:[]};T.sites[id]=x;};mk('demo_caen','Caen — Presqu\'île','Caen','ouest');mk('demo_rennes','Rennes — Baud-Chardonnet','Rennes','ouest');return Object.keys(T.sites).length;});
console.log('seed',await seed());
// Ethan place Karim sur Caen (planning local)
await page.evaluate(()=>{window.TRACE.state.userId='ethan';window.TRACE.renderHome();});await page.waitForTimeout(500);
await page.evaluate(()=>document.getElementById('htExpl').click());await page.waitForTimeout(500);await page.screenshot({path:'shot_accueil_expl.png'});
await page.evaluate(()=>{[...document.querySelectorAll('#eq-app .ac-row')].find(b=>/Planning des équipes/.test(b.textContent)).click();});await page.waitForTimeout(500);
await page.evaluate(()=>{const c=[...document.querySelectorAll('#eq-app .eq-pltray .eq-plchip')].find(x=>/Karim/.test(x.textContent));c&&c.querySelector('.eq-plmain').click();});await page.waitForTimeout(200);
await page.evaluate(()=>{const b=document.querySelector('#eq-app .eq-plsite[data-drop=demo_caen] [data-act=plput]');b&&b.click();});await page.waitForTimeout(500);await page.screenshot({path:'shot_accueil_expl_orga.png'});
await page.evaluate(()=>document.getElementById('htHome').click());await page.waitForTimeout(600);await page.screenshot({path:'shot_accueil_ethan.png'});
await page.evaluate(()=>{window.TRACE.state.userId='karim';window.TRACE.renderHome();});await page.waitForTimeout(700);await page.screenshot({path:'shot_accueil_karim.png'});
const info=await page.evaluate(()=>({tabs:[...document.querySelectorAll('#homeTabs button')].filter(b=>b.style.display!=='none').map(b=>b.id),notifs:[...document.querySelectorAll('#eq-app .ac-notif .tx b')].map(b=>b.textContent),kt:[...document.querySelectorAll('#eq-app .ac-kt .tx b')].map(b=>b.textContent),tiles:[...document.querySelectorAll('#eq-app .ac-tile b')].map(b=>b.textContent),title:document.querySelector('.homeSub .t').textContent}));console.log(JSON.stringify(info));
await page.setViewportSize({width:1400,height:950});await page.evaluate(()=>{localStorage.setItem('trace:wide','1');});await page.reload();await page.waitForTimeout(1200);await skip();await seed();await page.evaluate(()=>{window.TRACE.state.userId='karim';window.TRACE.renderHome();});await page.waitForTimeout(700);await page.screenshot({path:'shot_accueil_large.png'});
console.log(JSON.stringify({errs}));await browser.close();
