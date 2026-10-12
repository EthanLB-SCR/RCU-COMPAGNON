// RESPONSABLE DU CHANTIER = ACCÈS (13/10, Ethan : « connectés avec le compte de Sofiane, il ne peut pas rentrer dans le chantier de Nantes bien que je l'aie
// pointé responsable dessus »). Le verrou « pas dans ton planning » (chefs et gars de terrain : semaine en cours et précédente) laisse maintenant passer :
// ① le chef / conducteur désigné dans la FICHE du chantier ; ② pour un chef de chantier, les chantiers de sa semaine PROCHAINE (préparer). Règle souple
// (pas planifié = tout voir) inchangée ; règle stricte : seulement les chantiers à son nom.
import { chromium } from 'playwright';
const BASE=process.env.BASE||'http://localhost:8765';
const browser=await chromium.launch({headless:true, executablePath: process.env.CHROMIUM_PATH||undefined});
const ctx=await browser.newContext({viewport:{width:430,height:900}});const page=await ctx.newPage();
const logs=[];page.on('pageerror',e=>logs.push('PAGEERROR: '+e.message.slice(0,300)));page.on('console',m=>{if(m.type()==='error'&&!/supabase|Failed to fetch|net::ERR|404|WebSocket/i.test(m.text()))logs.push(m.text().slice(0,200));});
page.on('dialog',d=>d.accept().catch(()=>{}));
const C={};const wait=ms=>page.waitForTimeout(ms);
await page.clock.install({time:new Date(2026,9,13,8,30,0)}); /* mardi 13/10/2026 */
await page.goto(BASE+'/index.html');await wait(600);await page.evaluate(()=>{localStorage.clear();});await page.evaluate(()=>new Promise(r=>{try{const q=indexedDB.deleteDatabase('trace-kv');q.onsuccess=q.onerror=q.onblocked=()=>r();}catch(e){r();}}));
await page.reload();await wait(1200);const sk=await page.$('#loginSkip');if(sk&&await sk.isVisible()){await sk.click();await wait(700);}
const SOF='sofiane@scr.fr';
// planning : Sofiane cette semaine sur Saint-Lô, la semaine prochaine sur « nantes_x » ; fiche de Bain : chef = Sofiane
await page.evaluate(SOF=>{const T=window.TRACE;const iso=d=>d.getFullYear()+'-'+String(d.getMonth()+1).padStart(2,'0')+'-'+String(d.getDate()).padStart(2,'0');
  const wk=d=>{const x=new Date(d);x.setDate(x.getDate()+3-((x.getDay()+6)%7));const y=x.getFullYear();const j=new Date(y,0,4);const n=1+Math.round(((x-j)/864e5-3+((j.getDay()+6)%7))/7);return y+'-W'+String(n).padStart(2,'0');};
  const mon=new Date(2026,9,12),next=new Date(2026,9,19);const days=(m,id)=>{const o={};for(let i=0;i<4;i++){const d=new Date(m);d.setDate(d.getDate()+i);o[iso(d)]=[id];}return o;};
  T.espace.savePlanning(wk(mon),{[SOF]:days(mon,'saintlo'),'l:karim':days(mon,'saintlo')});T.espace.savePlanning(wk(next),{[SOF]:days(next,'nantes_x')});
  T.sites.bain.fiche=Object.assign({},T.sites.bain.fiche||{},{chef:SOF});},SOF);
const planned=acc=>page.evaluate(a=>{const r=window.TRACE.espace.planned(a);return r===null?null:[...r].sort();},acc);
// ── 1) chef de chantier : son planning (Saint-Lô) + la semaine prochaine (nantes_x) + la fiche de Bain (chef) ; terrain : pas la semaine prochaine
let out={chef:await planned({id:'a1',email:SOF,poste:'chef',type:'salarie',active:true}),terrain:await planned({id:'a2',email:SOF,poste:'soudeur',type:'salarie',active:true}),
  libre:await planned({id:'a3',email:'personne@scr.fr',poste:'chef',type:'salarie',active:true}),cond:await planned({id:'a4',email:'cond@scr.fr',poste:'conducteur',type:'salarie',active:true})};
console.log('1) chantiers ouverts :',JSON.stringify(out));
C.c1=JSON.stringify(out.chef)==='["bain","nantes_x","saintlo"]'&&JSON.stringify(out.terrain)==='["bain","saintlo"]'&&out.libre===null&&out.cond===null;
// ── 2) à l'accueil (Karim, planifié sur Saint-Lô) : Bain grisé et refusé avec l'explication ; mis CONDUCTEUR de Bain dans la fiche → Bain s'ouvre
out=await page.evaluate(async()=>{const T=window.TRACE;T.state.userId='karim';T.state.homeTab='list';T.renderHome();await new Promise(r=>setTimeout(r,250));
  const cards=()=>[...document.querySelectorAll('.siteCard')].map(c=>c.dataset.open+(c.classList.contains('locked')?'🔒':''));const r={avant:cards()};
  r.refus=await T.openSiteFromHome('bain');r.toast=(document.getElementById('toast')||{}).textContent||'';
  T.sites.bain.fiche=Object.assign({},T.sites.bain.fiche,{conducteur:'l:karim'});T.renderHome();await new Promise(z=>setTimeout(z,250));r.apres=cards();
  const ok=await T.openSiteFromHome('bain');await new Promise(z=>setTimeout(z,900));r.ouvert={ok:ok!==false,screen:T.state.screen,site:T.state.siteId};return r;});
console.log('2) accueil :',JSON.stringify(out));
C.c2=out.avant.includes('bain🔒')&&out.avant.includes('saintlo')&&out.refus===false&&/pas son chef ni son conducteur/.test(out.toast)&&out.apres.includes('bain')&&!out.apres.includes('bain🔒')&&out.ouvert.ok&&out.ouvert.screen==='site'&&out.ouvert.site==='bain';
// ── 3) règle stricte (réglage administrateur) : pas planifié = seulement les chantiers à son nom (fiche) ; règle souple rétablie ensuite
await page.evaluate(()=>{window.TRACE.showScreen('home');localStorage.setItem('trace:homeTab','espace');});
const goOrga=async()=>page.evaluate(async()=>{window.TRACE.state.userId='ethan';window.TRACE.renderHome();document.getElementById('htExpl').click();await new Promise(r=>setTimeout(r,200));const b=[...document.querySelectorAll('#eq-app .ac-row')].find(x=>/Planning des équipes/.test(x.textContent));if(b)b.click();await new Promise(r=>setTimeout(r,300));const s=document.querySelector('#eq-app [data-act=plstrict]');if(s)s.click();await new Promise(r=>setTimeout(r,300));return !!s;});
out={btn:await goOrga()};out.rules=await page.evaluate(()=>localStorage.getItem('trace:planningRules'));
await page.evaluate(()=>{window.TRACE.sites.saintlo.fiche=Object.assign({},window.TRACE.sites.saintlo.fiche||{},{chef:'chefseul@scr.fr'});});
out.chefSeul=await planned({id:'a5',email:'chefseul@scr.fr',poste:'chef',type:'salarie',active:true});out.libre=await planned({id:'a3',email:'personne@scr.fr',poste:'chef',type:'salarie',active:true});
out.back=await goOrga();out.rules2=await page.evaluate(()=>localStorage.getItem('trace:planningRules'));out.chefSeul2=await planned({id:'a5',email:'chefseul@scr.fr',poste:'chef',type:'salarie',active:true});
console.log('3) règle stricte :',JSON.stringify(out));
C.c3=out.btn&&/"strict":true/.test(out.rules||'')&&JSON.stringify(out.chefSeul)==='["saintlo"]'&&JSON.stringify(out.libre)==='[]'&&out.back&&/"strict":false/.test(out.rules2||'')&&out.chefSeul2===null;
const bad=Object.entries(C).filter(([k,v])=>!v).map(([k])=>k);console.log(bad.length?'RESULTAT: ECHEC '+bad.join(','):'RESULTAT: TOUT VERT');console.log(logs.length?logs:'[]');
await browser.close();
