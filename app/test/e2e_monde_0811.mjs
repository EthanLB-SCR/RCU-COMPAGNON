// e2e_monde_0811 — Monde 3D, lot du 08/11 : le bureau devient une pièce fermée avec le personnage 3D (figurine) ; au dépôt, des bureaux fermés le long d'un couloir ;
// personne sans secteur n'est plus effacé (rangé au siège) ; réglage « Qui est dans quel dépôt » (même donnée que le Planning) ; bouton « Siège ».
// Données fictives uniquement (dépôts « Dépôt A / B », personnes de démo).
import { chromium } from 'playwright';
const BASE=process.env.BASE||'http://localhost:8765';const J=x=>JSON.stringify(x);
const browser=await chromium.launch({headless:true, executablePath: process.env.CHROMIUM_PATH||undefined, args:['--ignore-gpu-blocklist','--enable-unsafe-swiftshader']});
const ctx=await browser.newContext({viewport:{width:1366,height:900}});const page=await ctx.newPage();
const logs=[];page.on('pageerror',e=>logs.push('PAGEERROR: '+e.message.slice(0,300)));page.on('console',m=>{if(m.type()==='error'&&!/supabase|Failed to fetch|net::ERR|404|WebSocket|fonts.googleapis/i.test(m.text()))logs.push(m.text().slice(0,200));});
page.on('dialog',d=>d.accept().catch(()=>{}));const C={};const W=ms=>page.waitForTimeout(ms);
await page.clock.install({time:new Date(2026,10,6,9,0,0)});
await page.goto(BASE+'/index.html');await W(600);await page.evaluate(()=>{localStorage.clear();localStorage.setItem('trace:wide','1');});await page.evaluate(()=>new Promise(r=>{try{const q=indexedDB.deleteDatabase('trace-kv');q.onsuccess=q.onerror=q.onblocked=()=>r();}catch(e){r();}}));
await page.reload();await W(1200);{const s=await page.$('#loginSkip');if(s&&await s.isVisible())await s.click();await W(700);}
const asEthan=async()=>{await page.evaluate(()=>{const T=window.TRACE;T.state.userId='ethan';T.renderHome();});await W(500);};
const home=async id=>{await page.evaluate(i=>{const b=document.getElementById(i);if(b)b.click();},id);await W(500);};
await page.evaluate(()=>{localStorage.setItem('trace:monde',JSON.stringify({v:1,on:true,testeurs:['ethan','l:ethan'],depots:{ouest:{nom:'Dépôt A',ville:'Ville A'},idf:{nom:'Dépôt B',ville:'Ville B'}},magasin:'ouest'}));location.reload();});await W(1500);
{const s=await page.$('#loginSkip');if(s&&await s.isVisible())await s.click();await W(600);}await asEthan();await home('htHome');await W(2600);
const figs=()=>page.evaluate(()=>{const H=window.TRACE.monde3d&&window.TRACE.monde3d();if(!H)return -1;let n=0;H.viewer.root.traverse(o=>{if(o.userData.figurine||o.userData.bill)n++;});return n;}); /* 08/11 soir : personnages en 2D (dessin du kit, « bill ») */
// ── n1) mon bureau : une vraie pièce (4,68 × 4,08 m hors murs), vue « dans la peau » (pas de personnage chez soi), écrans / tableau / post-its cliquables ; pièce « cuite » (peu d'appels de dessin)
const n1=await page.evaluate(()=>{const H=window.TRACE.monde3d();const V=H.viewer;V.renderer.render(V.scene,V.cam);return {scene:H.state.scene,size:H.state.pod&&H.state.pod.userData.size,picks:V.pickables.length,calls:V.renderer.info.render.calls,baked:(()=>{let n=0;H.state.pod.traverse(o=>{if(o.userData.baked)n++;});return n;})()};});
n1.figs=await figs();
console.log('n1) mon bureau :',J(n1));C.n1=n1.scene==='bureau'&&Array.isArray(n1.size)&&Math.abs(n1.size[0]-4.68)<0.01&&n1.figs===0&&n1.picks>=4&&n1.baked>5&&n1.calls<400;
// ── n2) le dépôt : personne n'est effacé (sans secteur → siège), chaque personne du bureau a sa pièce
await page.evaluate(()=>{window.TRACE.monde3d().setScene('monde');});await W(2500);
const n2=await page.evaluate(()=>{const H=window.TRACE.monde3d();const c=window.TRACE.monde.ctx();const actifs=c.people.filter(p=>p.active!==false&&p.poste!=='visiteur');const D=H.state.DATA.depots||[];const inDep=D.reduce((n,d)=>n+(d.people||[]).length,0);
  const off=D.reduce((n,d)=>n+(d.people||[]).filter(p=>p.fam!=='terrain').length,0);const pods=Object.values(H.state.world.centers).reduce((n,x)=>n+Object.keys(x.pods||{}).length,0);const sans=D.reduce((n,d)=>n+(d.people||[]).filter(p=>p.sansSecteur).length,0);
  return {actifs:actifs.length,inDep,off,pods,sans,deps:D.map(d=>d.k+':'+(d.people||[]).length)};});
n2.figs=await figs();
console.log('n2) dépôt :',J(n2));C.n2=n2.actifs>0&&n2.inDep===n2.actifs&&n2.pods===n2.off&&n2.figs>0;
// ── n3) visite chez un collègue : lui à son bureau (dessin 2D, haut du corps)
const other=await page.evaluate(()=>{const H=window.TRACE.monde3d();const D=H.state.DATA.depots||[];for(const d of D)for(const p of d.people||[])if(p.fam!=='terrain'&&p.id!==H.state.DATA.me.id)return p.id;return null;});
await page.evaluate(id=>{const H=window.TRACE.monde3d();H.state.visitId=id;H.setScene('visit');},other);await W(1500);
const n3={other,scene:await page.evaluate(()=>window.TRACE.monde3d().state.scene),figs:await figs()};
console.log('n3) visite :',J(n3));C.n3=!!other&&n3.scene==='visit'&&n3.figs===1;
// ── n4) réglages : « Qui est dans quel dépôt » — un menu par personne ; changer = même donnée que le Planning (people.secteur)
await page.evaluate(()=>{window.TRACE.showScreen('home');window.TRACE.renderHome();});await W(400);await home('htEnt');await W(1500);
const rr=await page.$('#eq-app .ac-row[data-v="x:monde:cfg"]');if(rr){await rr.click();await W(500);}
const target=await page.evaluate(()=>{const c=window.TRACE.monde.ctx();const p=c.people.find(x=>x.active!==false&&x.poste!=='visiteur'&&x.id!=='ethan'&&x.id!=='l:ethan'&&c.secteurDe(x)!=='idf');return p?p.id:null;});
const n4a=await page.evaluate(id=>{const card=document.querySelector('#eq-app #m3d-quiou');const sel=card&&[...card.querySelectorAll('select[data-xin^="monde|sect|"]')];return {card:!!card,n:sel?sel.length:0,has:!!(sel&&sel.find(s=>s.dataset.xin==='monde|sect|'+id))};},target);
await page.evaluate(id=>{const s=[...document.querySelectorAll('#eq-app select[data-xin^="monde|sect|"]')].find(x=>x.dataset.xin==='monde|sect|'+id);if(s){s.value='idf';s.dispatchEvent(new Event('change',{bubbles:true}));}},target);await W(700);
const n4b=await page.evaluate(id=>{const c=window.TRACE.monde.ctx();const p=c.people.find(x=>x.id===id);const s=[...document.querySelectorAll('#eq-app select[data-xin^="monde|sect|"]')].find(x=>x.dataset.xin==='monde|sect|'+id);return {part:(c.peopleData(id)||{}).secteur||null,secteurDe:p?c.secteurDe(p):null,shown:s?s.value:null};},target);
console.log('n4) qui est où :',J({target,n4a,n4b}));C.n4=!!target&&n4a.card&&n4a.n>3&&n4a.has&&n4b.part==='idf'&&n4b.secteurDe==='idf'&&n4b.shown==='idf';
// ── n5) bouton « Siège » : un seul dépôt siège ; les personnes sans secteur y vont
await page.click('#eq-app [data-v="monde|siege|idf"]');await W(600);
const n5a=await page.evaluate(()=>{const c=JSON.parse(localStorage.getItem('trace:monde')||'{}');return {idf:!!(c.depots&&c.depots.idf&&c.depots.idf.siege),ouest:!!(c.depots&&c.depots.ouest&&c.depots.ouest.siege),btn:!!document.querySelector('#eq-app [data-v="monde|siege|idf"][aria-pressed="true"]')};});
const lone=await page.evaluate(()=>{const c=window.TRACE.monde.ctx();const p=c.people.find(x=>x.active!==false&&x.poste!=='visiteur'&&!c.secteurDe(x)&&!(c.mySecteur&&c.mySecteur(x)));return p?p.id:null;});
await page.evaluate(()=>{window.TRACE.showScreen('home');window.TRACE.renderHome();});await W(400);await home('htEnt');await page.evaluate(()=>{const b=document.querySelector('#eq-app [data-act="xgo"][data-v="x:monde:depot"]');if(b)b.click();});await W(2600); /* 10/11 : le dépôt = rubrique « Visite des dépôts » */
const n5b=await page.evaluate(id=>{const H=window.TRACE.monde3d();const D=H.state.DATA.depots||[];const where=k=>{for(const d of D)if((d.people||[]).some(p=>p.id===k))return d.k;return null;};return {lone:id?where(id):'(aucun)',target:null};},lone);
n5b.target=await page.evaluate(id=>{const D=window.TRACE.monde3d().state.DATA.depots||[];for(const d of D)if((d.people||[]).some(p=>p.id===id))return d.k;return null;},target);
console.log('n5) siège :',J({n5a,lone,n5b}));C.n5=n5a.idf&&!n5a.ouest&&n5a.btn&&(lone?n5b.lone==='idf':true)&&n5b.target==='idf';
// ── n7) mes notes : un post-it écrit → posé sur le retour, gardé sur ce poste (localStorage), JAMAIS dans la fiche lue par l'équipe
await page.evaluate(()=>{window.TRACE.monde3d().setScene('bureau');});await W(1800);
await page.evaluate(()=>{[...document.querySelectorAll('#eq-app .m3d-chip')].find(b=>/Mes notes/.test(b.textContent)).click();});await W(1200);
await page.fill('#eq-app [data-note-text]','Test e2e : relancer le fournisseur DN 150');await page.evaluate(()=>document.querySelector('#eq-app [data-note-save]').click());await W(1500);
const n7=await page.evaluate(()=>{const H=window.TRACE.monde3d();const id=H.state.DATA.me.id;const ls=JSON.parse(localStorage.getItem('trace:notes3d:'+id)||'[]');const d=window.TRACE.monde.ctx().peopleData(id)||{};return {ls:ls.length,txt:ls.some(n=>/fournisseur DN 150/.test(n.t)),pos:ls.every(n=>typeof n.x==='number'),inPod:Object.keys(H.state.pod.userData.notes||{}).length,leak:JSON.stringify(d).includes('fournisseur DN 150'),vue:H.state.vue};});
console.log('n7) notes :',J(n7));C.n7=n7.ls>=1&&n7.txt&&n7.pos&&n7.inPod>=1&&!n7.leak&&n7.vue==='notes';
// ── n8) personnaliser : importer une image pour le tapis de souris (démo : l'image reste dans la fiche locale) ; un objet ajouté, tourné, retiré ; plus de bouton « remettre par défaut »
await page.evaluate(()=>{[...document.querySelectorAll('#eq-app .m3d-chip')].find(b=>/Personnaliser/.test(b.textContent)).click();});await W(1500);
await page.setInputFiles('#eq-app [data-imgpref]',{name:'tapis.png',mimeType:'image/png',buffer:Buffer.from('iVBORw0KGgoAAAANSUhEUgAAAAQAAAAECAIAAAAmkwkpAAAAEElEQVR4nGM4YaMBRwzEcQDxwxLBXOwG1wAAAABJRU5ErkJggg==','base64')});await W(2500);
await page.evaluate(()=>document.querySelector('#eq-app [data-ptab="objets"]').click());await W(300);await page.evaluate(()=>document.querySelector('#eq-app [data-pfam="rcu"]').click());await W(300);await page.evaluate(()=>document.querySelector('#eq-app [data-add="tube_statue"]').click());await W(1500);
await page.evaluate(()=>{[...document.querySelectorAll('#eq-app [data-oact="rot"]')].find(b=>b.dataset.v==='15').click();});await W(1200);
const n8=await page.evaluate(()=>{const H=window.TRACE.monde3d();const p=H.state.prefs;const t=(p.objets||[]).find(o=>o.k==='tube_statue');const d=window.TRACE.monde.ctx().peopleData(H.state.DATA.me.id)||{};const sv=d.avatar&&d.avatar.bureau3d||{};return {tapis:p.tapis_souris,img:String(p.tapis_souris_img||'').slice(0,15),saved:String(sv.tapis_souris_img||'').slice(0,15),tube:!!t,rot:!!(t&&t.rm===1&&typeof t.ry==='number'),savedTube:(sv.objets||[]).some(o=>o.k==='tube_statue'),reset:!!document.querySelector('#eq-app [data-reset]'),side:document.querySelector('#eq-app .m3d-wrap').classList.contains('m3d-wrap--side')};});
await page.evaluate(()=>{document.querySelector('#eq-app [data-oact="del"]').click();});await W(1200);n8.retire=await page.evaluate(()=>!(window.TRACE.monde3d().state.prefs.objets||[]).some(o=>o.k==='tube_statue'));
console.log('n8) personnaliser :',J(n8));C.n8=n8.tapis==='image'&&n8.img==='data:image/jpeg'&&n8.saved==='data:image/jpeg'&&n8.tube&&n8.rot&&n8.savedTube&&!n8.reset&&n8.side&&n8.retire;
C.n6=logs.length===0;if(logs.length)console.log('console :',logs.slice(0,6));
console.log('RESULTAT',J(C),Object.values(C).every(Boolean)?'TOUT VERT':'ÉCHEC');await browser.close();
