// e2e_etv_2710.mjs — 27/10 soir (lot 2710j). Ethan : « rajoute du coup de pouvoir exporter une maquette aussi d'un chantier tracé qui est juste dans Commerce ».
// Données 100 % FICTIVES. Affaire en devis + tracé d'étude lié (format remis par le traceur) : Commerce › affaire › Tracé & chantiers, la ligne de l'étude a « 🧭 Plan interactif » →
// téléchargement du même fichier .html que l'export DOE (plan, n° de soudures, lignes), SANS ouvrir l'écran Tracé, le chantier courant intact.
// c1 bouton présent sur l'étude (pas sur un chantier gagné) · c2 le fichier : titre, lignes, soudures, étiquettes (DN, angle) · c3 l'appli n'a pas bougé (écran, chantier courant, lignes) ·
// c4 étude sans tracé : pas de bouton · c5 console.
import { chromium } from 'playwright';
const BASE=process.env.BASE||'http://localhost:8765';
const browser=await chromium.launch({headless:true, executablePath: process.env.CHROMIUM_PATH||undefined});
const ctx=await browser.newContext({viewport:{width:1280,height:900},acceptDownloads:true});const page=await ctx.newPage();
await page.route(u=>!/^https?:\/\/(localhost|127\.0\.0\.1)(:\d+)?\//.test(u.href)&&/^https?:/.test(u.href),r=>r.fulfill({status:204,body:''}));
const logs=[];page.on('pageerror',e=>logs.push('PAGEERROR: '+e.message.slice(0,300)));page.on('console',m=>{if(m.type()==='error'&&!/supabase|Failed to fetch|net::ERR|404|WebSocket|pdf\.worker|cdnjs/i.test(m.text()))logs.push(m.text().slice(0,200));});page.on('dialog',d=>d.accept().catch(()=>{}));
const C={};const J=x=>JSON.stringify(x);const wait=ms=>page.waitForTimeout(ms);const N1='O2610-82';
const click=async v=>{await page.evaluate(v=>{const el=document.querySelector(`#eq-app [data-act=af][data-v="${v}"]`);if(!el)throw new Error('bouton absent '+v);el.click();},v);await wait(280);};
const openAff=async(n,tab)=>{await page.evaluate(([n,t])=>{const T=window.TRACE;const S=T.affaires.state();S.view='fiche';S.cur=n;S.tab=t;T.renderHome();},[n,tab]);await wait(400);};
const newAff=async(n,nom)=>{await page.evaluate(async([n,nom])=>{const T=window.TRACE;T.state.userId='ethan';const S=T.affaires.state();S.cur=null;S.view='list';S.seg='devis';T.renderHome();document.getElementById('htCom').click();await new Promise(x=>setTimeout(x,300));
  for(let k=0;k<20&&!document.querySelector('#eq-app [data-act=af][data-v="new|"]');k++)await new Promise(x=>setTimeout(x,100));
  document.querySelector('#eq-app [data-act=af][data-v="new|"]').click();await new Promise(x=>setTimeout(x,150));document.getElementById('afn-num').value=n;document.getElementById('afn-nom').value=nom;document.getElementById('afn-client').value='CLIENT TEST';document.getElementById('afn-etat').value='devis';
  document.querySelector('#eq-app [data-act=af][data-v="create|"]').click();await new Promise(x=>setTimeout(x,250));},[n,nom]);await wait(250);};
const T=(kind,dn,len,x)=>Object.assign({kind,dn,len},x||{});
const weldsOf=els=>els.slice(0,-1).map((e,i)=>({idx:i,dn:e.dn,m:i,weldId:'S-'+i}));
let Y0=0;const TL=(id,els,o)=>{const y=(Y0+=12);let m=0;els.forEach(e=>{e.m0=m;m+=e.len;e.m1=m;e.axis=[[[e.m0,y],[e.m1,y]]];e.from=[e.m0,y];e.to=[e.m1,y];e.casing=250;});
  return Object.assign({id,name:id,dn:els[0].dn,bar:12,traceur:true,axis:[[0,y],[m,y]],e:0.35,cond:{A:{els,welds:weldsOf(els),length:m,notes:[]},R:{els:els.map(e=>JSON.parse(JSON.stringify(e))),welds:weldsOf(els),length:m,notes:[]}}},o||{});};
const LINES=()=>[TL('L1',[T('endpoint',150,0),T('pipe',150,12),T('pipe',150,12),T('reducer',150,0.5,{dn2:100}),T('pipe',100,12),T('valve',100,0.4),T('pipe',100,5),T('endcap',100,0.3)],{name:'Feeder étude',ends:{start:{type:'chaufferie',dn:150},end:{type:'kit',dn:100}}}),
  TL('L2',[T('pipe',80,12),T('bend',80,0.4,{angle:45}),T('pipe',80,8),T('endpoint',80,0)],{name:'Antenne étude',parent:'L1',parentM:24,ends:{start:null,end:{type:'sousstation',dn:80}}})];
const SITE=(id,name,lines)=>({id,name,source:'traceur',w:200,h:200,fiche:{etude:{aff:N1}},lines,traceur:{v:1,ctx:'etude',cv:1,zones:[],savedAt:'2026-10-27T18:00:00Z'}});
await page.goto(BASE+'/index.html');await wait(600);await page.evaluate(()=>{localStorage.clear();localStorage.setItem('trace:wide','1');});await page.evaluate(()=>new Promise(r=>{try{const q=indexedDB.deleteDatabase('trace-kv');q.onsuccess=q.onerror=q.onblocked=()=>r();}catch(e){r();}}));
await page.reload();await wait(1200);{const s=await page.$('#loginSkip');if(s&&await s.isVisible())await s.click();await wait(700);}
await newAff(N1,'Étude avec plan interactif');
await page.evaluate(([s1,s2,n])=>{const T=window.TRACE;T.etude.addSite(s1);T.etude.addSite(s2);T.affaires.set(n,{sites:['trc_e1','trc_e2']});},[SITE('trc_e1','Réseau étude E',LINES()),SITE('trc_e2','Étude vide',[]),N1]);
const st0=await page.evaluate(()=>({screen:window.TRACE.state.screen,site:window.TRACE.state.siteId,nL:Object.keys(window.TRACE.state.lines||{}).length,net:(window.TRACE.net||{}).id||null}));
// ── c1 · onglet Tracé & chantiers : le bouton sur l'étude tracée, pas sur l'étude vide
await openAff(N1,'sites');await wait(500);
let o=await page.evaluate(()=>{const R=[...document.querySelectorAll('#eq-app .lz-row')].map(r=>({id:r.dataset.lzsite,et:!!r.querySelector('.lz-tag.et'),open:!!r.querySelector('[data-v^="etopen|"]'),viewer:!!r.querySelector('[data-v^="etviewer|"]'),mail:!!r.querySelector('[data-v^="etmail|"]'),link:!!r.querySelector('[data-v^="etlink|"]'),txt:r.textContent.replace(/\s+/g,' ').trim().slice(0,120)}));return R;});
console.log('1) lignes :',J(o));
const r1=o.find(x=>x.id==='trc_e1')||{},r2=o.find(x=>x.id==='trc_e2')||{};
C.c1=r1.et&&r1.open&&r1.viewer&&r1.mail&&r1.link&&r2.et&&r2.open&&!r2.viewer&&!r2.mail&&!r2.link;
// ── c2 · le téléchargement
const [dl]=await Promise.all([page.waitForEvent('download',{timeout:15000}),click('etviewer|trc_e1')]);
const path=await dl.path();const fs=await import('fs');const html=fs.readFileSync(path,'utf8');
const o2={name:dl.suggestedFilename(),n:html.length,title:/<title>Plan interactif — Réseau étude E<\/title>/.test(html),l1:/Feeder étude/.test(html),l2:/Antenne étude/.test(html),welds:(html.match(/S-\d+/g)||[]).length,dn:/DN150→100|DN150/.test(html),angle:/45°/.test(html),sst:/SST/.test(html)};
console.log('2) fichier :',J(o2));
C.c2=o2.name==='Plan_interactif_Reseau_etude_E.html'&&o2.n>20000&&o2.title&&o2.l1&&o2.l2&&o2.welds>=10&&o2.dn&&o2.angle;
// ── c2b · 28/10 (lot 2810b, Ethan : « la maquette ne passe pas dans un mail ») : 📧 Pour mail → la même maquette dans un .zip (+ Lisez-moi), bien plus petit
const [dz]=await Promise.all([page.waitForEvent('download',{timeout:15000}),click('etmail|trc_e1')]);const pz=await dz.path();const {unzipSync,strFromU8}=await import('fflate');
const files=unzipSync(new Uint8Array(fs.readFileSync(pz)));const inner=strFromU8(files['Plan_interactif_Reseau_etude_E.html']||new Uint8Array());await wait(300);
const o2b={name:dz.suggestedFilename(),n:fs.statSync(pz).size,names:Object.keys(files),innerOk:/<title>Plan interactif — Réseau étude E<\/title>/.test(inner)&&Math.abs(inner.length-html.length)<200,lisez:/Extraire tout/.test(strFromU8(files['Lisez-moi.txt']||new Uint8Array())),toast:await page.evaluate(()=>(document.querySelector('#toast,.toast')||{}).textContent||'')};
console.log('2b) pour mail :',J(o2b));
C.c2b=o2b.name==='Plan_interactif_Reseau_etude_E.zip'&&o2b.n<html.length/2&&o2b.names.length===2&&o2b.innerOk&&o2b.lisez&&/zippé/.test(o2b.toast);
// ── c2c · 28/10 (lot 2810d, Ethan : « même en zip ça fait bugger ma boîte mail ») : 🔗 Lien à envoyer → la maquette de l'étude mise en ligne (serveur simulé), la fenêtre du lien ;
//    l'appli n'a pas bougé pendant ce temps (vérifié en c3)
await page.evaluate(()=>{window.__UP=null;window.TRACE.doe.shareHook(async(id,name,html)=>{window.__UP={id,name,n:html.length,t:/<title>Plan interactif — Réseau étude E<\/title>/.test(html)};return {path:id+'/partages/1_'+name+'.html',url:'https://pghftlepduvfazbiavhq.supabase.co/storage/v1/object/sign/photos/'+id+'/partages/1_'+name+'.html?token=eyJhbGciOiJIUzI1NiJ9.e30.c2lnbmF0dXJlX2ZpY3RpdmU'};});});
await click('etlink|trc_e1');await wait(800);
const o2c=await page.evaluate(()=>({up:window.__UP,link:(document.querySelector('#modal.show #shLink')||{}).value||'',h:(document.querySelector('#modal.show h3')||{}).textContent||''}));
await page.evaluate(()=>{const c=document.querySelector('#shClose');if(c)c.click();window.TRACE.doe.shareHook(null);});await wait(200);
console.log('2c) lien :',J({up:o2c.up,h:o2c.h,link:o2c.link.slice(0,110)}));
C.c2c=!!o2c.up&&o2c.up.id==='trc_e1'&&o2c.up.name==='Plan_interactif_Reseau_etude_E'&&o2c.up.t&&/Lien du plan interactif/.test(o2c.h)&&/\/plan\.html#p=trc_e1%2Fpartages%2F1_Plan_interactif_Reseau_etude_E\.html&t=eyJ/.test(o2c.link);
// ── c3 · l'appli n'a pas bougé
const st1=await page.evaluate(()=>({screen:window.TRACE.state.screen,site:window.TRACE.state.siteId,nL:Object.keys(window.TRACE.state.lines||{}).length,net:(window.TRACE.net||{}).id||null,tab:window.TRACE.affaires.state().tab,cur:window.TRACE.affaires.state().cur,toast:(document.querySelector('#toast,.toast')||{}).textContent||''}));
console.log('3) avant / après :',J(st0),J(st1));
C.c3=st1.screen==='home'&&st1.site===st0.site&&st1.nL===st0.nL&&st1.net===st0.net&&st1.tab==='sites'&&st1.cur===N1;
// ── c4 · étude vide : « rien de tracé », pas de bouton (déjà vu en c1) ; l'API refuse proprement
const o4=await page.evaluate(()=>{try{return {ok:window.TRACE.etude.viewer?window.TRACE.etude.viewer('trc_e2'):'api absente'};}catch(e){return {err:e.message};}});
console.log('4) étude vide :',J(o4));C.c4=o4.ok===false||o4.ok==='api absente';
console.log('erreurs console :',J(logs));C.c5=logs.length===0;
const ko=Object.entries(C).filter(([k,v])=>!v).map(([k])=>k);console.log(J(C));console.log(ko.length?'RESULTAT: KO '+ko.join(','):'RESULTAT: TOUT VERT');
await browser.close();
