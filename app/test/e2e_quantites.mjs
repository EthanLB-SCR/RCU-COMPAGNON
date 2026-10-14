// ONGLET « 3 · QUANTITÉS » (13/10/2026 soir, retours d'Ethan sur le chiffrage) : « un onglet lecture, un quantités, et après les autres points » ;
// « quantité repérée, ça ne saute pas aux yeux que ce sont les quantités sélectionnées pour préremplir le chiffrage et qui deviennent la référence » ;
// « pour comparer avec un tracé : à côté des quantités fournisseur, une bulle quantités tracé — tu cliques, ça t'envoie au traceur ; rien de tracé → ça te demande de tracer » ;
// « le quantitatif choisi pour importer doit être stocké pour mémoire dans l'appli ». Supabase SIMULÉ (stockage compris) ; quantitatif FICTIF.
import { chromium } from 'playwright';
const BASE=process.env.BASE||'http://localhost:8765';
const SB='https://pghftlepduvfazbiavhq.supabase.co';
const b64u=o=>Buffer.from(JSON.stringify(o)).toString('base64').replace(/=+$/,'').replace(/\+/g,'-').replace(/\//g,'_');
const now=()=>Math.floor(Date.now()/1000);const UID='11111111-2222-4333-8444-555555555555',EMAIL='elebihan@scr-soudure.fr';
const user=()=>({id:UID,aud:'authenticated',role:'authenticated',email:EMAIL,email_confirmed_at:'2026-10-08T09:00:00Z',app_metadata:{provider:'email'},user_metadata:{},identities:[],created_at:'2026-10-08T09:00:00Z',updated_at:new Date().toISOString()});
const session=()=>{const t=now();return {access_token:b64u({alg:'HS256',typ:'JWT'})+'.'+b64u({iss:SB+'/auth/v1',sub:UID,aud:'authenticated',exp:t+3600,iat:t,email:EMAIL,role:'authenticated'})+'.sig',token_type:'bearer',expires_in:3600,expires_at:t+3600,refresh_token:'rt-'+t,user:user()};};
const profile={id:UID,email:EMAIL,name:'Ethan LE BIHAN',prenom:'Ethan',nom:'LE BIHAN',role:'chef',active:true,poste:'resp_exploitation',admin:true,type:'salarie',rights:{},sites:null,created_at:'2026-10-08T09:00:00Z'};
const uploads=[];const signs=[];
const browser=await chromium.launch({headless:true, executablePath: process.env.CHROMIUM_PATH||undefined});
const ctx=await browser.newContext({viewport:{width:1280,height:900}});
const CORS={'access-control-allow-origin':'*','access-control-allow-headers':'*','access-control-allow-methods':'GET, POST, PUT, PATCH, DELETE, OPTIONS'};
await ctx.route(u=>u.href.startsWith(SB),async route=>{const req=route.request();const u=new URL(req.url());const p=u.pathname;const acc=req.headers()['accept']||'';
  const json=(o,status=200)=>route.fulfill({status,contentType:'application/json',headers:CORS,body:JSON.stringify(o)});
  if(req.method()==='OPTIONS')return route.fulfill({status:200,headers:CORS,body:''});
  if(p.startsWith('/storage/v1/object/sign/')){const path=p.slice('/storage/v1/object/sign/'.length);signs.push(path);return json({signedURL:'/object/sign/'+path+'?token=t0k'});}
  if(p.startsWith('/storage/v1/object/')){const path=p.slice('/storage/v1/object/'.length);uploads.push({path,size:(req.postDataBuffer()||Buffer.alloc(0)).length});return json({Key:path,Id:'x'});}
  if(p==='/auth/v1/token')return json(session());
  if(p==='/auth/v1/user')return json(user());
  if(p.startsWith('/auth/v1/'))return json({});
  if(p==='/rest/v1/profiles')return json(/object/.test(acc)?profile:[profile]);
  if(p.startsWith('/rest/v1/rpc/'))return json(null);
  if(p.startsWith('/rest/v1/'))return json(/object/.test(acc)?null:[]);
  return json([]);});
const page=await ctx.newPage();
const logs=[];page.on('pageerror',e=>logs.push('PAGEERROR: '+e.message.slice(0,300)));page.on('console',m=>{if(m.type()==='error'&&!/supabase|Failed to fetch|net::ERR|404|WebSocket|realtime|pdf\.worker|cdnjs|status of/i.test(m.text()))logs.push(m.text().slice(0,200));});
page.on('dialog',d=>d.accept().catch(()=>{}));
const C={};const wait=ms=>page.waitForTimeout(ms);
await page.goto(BASE+'/index.html');await wait(600);await page.evaluate(()=>{localStorage.clear();localStorage.setItem('trace:wide','1');});await page.reload();await wait(1000);
await page.fill('#loginEmail',EMAIL);await page.fill('#loginPwd','Admin-2026!');await page.click('#loginGo');await wait(2200);
const click=async v=>{await page.evaluate(v=>{const el=document.querySelector(`#eq-app [data-act=af][data-v="${v}"]`);if(!el)throw new Error('bouton absent '+v);el.click();},v);await wait(250);};
const A=()=>page.evaluate(()=>window.TRACE.affaires.get('O2610-15'));
await page.evaluate(async()=>{document.getElementById('htCom').click();await new Promise(x=>setTimeout(x,300));
  document.querySelector('#eq-app [data-act=af][data-v="new|"]').click();await new Promise(x=>setTimeout(x,150));document.getElementById('afn-num').value='O2610-15';document.getElementById('afn-nom').value='Quantités claires';document.getElementById('afn-client').value='CORIANCE';
  document.querySelector('#eq-app [data-act=af][data-v="create|"]').click();await new Promise(x=>setTimeout(x,300));});
// ── 1) les onglets : Lecture, Quantités, Points séparés ; Lecture ne porte plus les quantités ; Quantités : la référence EN TÊTE (vide → dit quoi faire), bulle « tracé » (rien de tracé → tracer)
let out={tabs:await page.evaluate(()=>[...document.querySelectorAll('#eq-app .eq-filtres .chip')].map(c=>c.textContent.trim()).filter(t=>/·/.test(t)))};
await click('tab|lecture');out.lect=await page.evaluate(()=>({q:!!document.querySelector('#eq-app .cm-qref'),qs:!!document.querySelector('#eq-app .cm-qsets'),pt:/Points techniques/.test(document.getElementById('eq-app').textContent)}));
await click('tab|quantites');
/* 14/10 nuit : le tracé n'est plus une bulle à part : c'est la PREMIÈRE puce des quantitatifs (même présentation que les quantités importées) */
out.q=await page.evaluate(()=>{const h=[...document.querySelectorAll('#eq-app .card h3')].map(x=>x.textContent);const ch=document.querySelector('#eq-app .cm-qschips');const b=ch&&ch.firstElementChild&&ch.firstElementChild.classList.contains('cm-qtchip')?ch.firstElementChild:null;return {h:h.slice(0,3),src:(document.querySelector('#eq-app .cm-qsrc')||{}).textContent||'',bub:b?b.textContent.replace(/\s+/g,' ').trim():'',none:!!b&&b.classList.contains('none'),bubBtn:b&&b.querySelector('button')?[b.querySelector('button').dataset.act,b.querySelector('button').dataset.v]:null,old:!!document.querySelector('#eq-app .cm-tbub'),flow:(document.querySelector('#eq-app .cm-qflow')||{}).textContent||''};});
console.log('1) onglets et carte de référence :',JSON.stringify(out));
C.c1=out.tabs.join()==='1 · Dossier,2 · Lecture,3 · Quantités,4 · Chiffrage,5 · Mémoire,6 · DPGF,7 · Offre' /* 14/10 nuit : onglet Points retiré */&&!out.lect.q&&!out.lect.qs&&!out.lect.pt&&/^★ Quantités de référence/.test(out.q.h[0])&&/^Quantités · tracé et quantitatifs fournisseurs/.test(out.q.h[1])
  &&/vides : choisis un quantitatif fournisseur/.test(out.q.src)&&/^📐 Tracé · rien de tracé/.test(out.q.bub)&&out.q.none&&/Tracer le réseau/.test(out.q.bub)&&out.q.bubBtn&&out.q.bubBtn[0]==='tabgo'&&out.q.bubBtn[1]==='traceur'&&!out.q.old&&/préremplis le chiffrage/.test(out.q.flow);
// ── 2) import d'un quantitatif par FICHIER : le fichier part au stockage de l'affaire (dossier « quantitatifs ») ; lien 📎 sur l'étude
const H=['Type de pièce','DN','DN 2','Angle (°)','Longueur (m)','Quantité','Unité','Gaine Ø (mm)','Réf. fournisseur','Désignation fournisseur'].join(';');
const TB=[H,'Barre;150;;;12;20;u;;;Tube DN150','Manchon;150;;;;24;u;;;Kit manchon avec mousse DN150','Barre;65;;;12;8;u;;;Tube DN65','Manchon;65;;;;10;u;;;Joint'].join('\n');
await click('qsimp|');await wait(200);await page.evaluate(()=>{document.getElementById('qi-nom').value='Fournisseur X';});
await page.setInputFiles('#iq-file',{name:'quantitatif_X.csv',mimeType:'text/csv',buffer:Buffer.from(TB)});await wait(600);
await page.evaluate(()=>document.getElementById('qi-ok').click());await wait(1500);
out={set:await A().then(a=>({n:a.qsets.length,f:a.qsets[0].fichier,url:a.qsets[0].fichierUrl||'',taille:a.qsets[0].fichierTaille})),up:uploads.map(x=>x.path),signs,
  link:await page.evaluate(()=>{const l=document.querySelector('#eq-app .cm-qfile');return l?{t:l.textContent,href:l.getAttribute('href'),target:l.getAttribute('target')}:null;}),
  btn:await page.evaluate(()=>{const b=[...document.querySelectorAll('#eq-app .cm-qsh button')].find(x=>/référence/.test(x.textContent));return b?b.textContent.trim():null;})};
console.log('2) fichier gardé :',JSON.stringify(out));
C.c2=out.set.n===1&&out.set.f==='quantitatif_X.csv'&&out.up.length===1&&/^photos\/aff_O2610-15\/quantitatifs\/\d+_quantitatif_X\.csv$/.test(out.up[0])&&/token=t0k/.test(out.set.url)&&out.set.taille===Buffer.byteLength(TB)
  &&out.link&&/📎 quantitatif_X\.csv/.test(out.link.t)&&out.link.href===out.set.url&&out.link.target==='_blank'&&out.btn==='★ En faire la référence';
// ── 3) « ★ En faire la référence » : la carte de référence dit d'où viennent les quantités ; la puce et l'étude portent « ★ référence » ; le comparatif titre « ★ Référence »
await click('qstake|'+(await A()).qsets[0].id);await wait(400);
out=await page.evaluate(()=>({src:(document.querySelector('#eq-app .cm-qsrc')||{}).textContent||'',chip:[...document.querySelectorAll('#eq-app .cm-qschips .chip')].map(c=>c.textContent.trim()),tag:!!document.querySelector('#eq-app .cm-qsh .eq-tag.ok'),btn:!![...document.querySelectorAll('#eq-app .cm-qsh button')].find(x=>/En faire la référence/.test(x.textContent)),th:[...document.querySelectorAll('#eq-app .cm-qcmp tr:first-child th')].map(x=>x.textContent.trim()),rows:window.TRACE.affaires.get('O2610-15').quantites.rows.map(r=>r.dn+':'+r.soud+'/'+r.ml)}));
console.log('3) référence choisie :',JSON.stringify(out));
C.c3=/prises sur Fournisseur X/.test(out.src)&&out.chip.some(t=>/★ référence/.test(t))&&out.tag&&!out.btn&&out.th[1]==='★ Référence'&&out.rows.join()==='150:24/120,65:10/48';
// ── 4) chantier lié AU TRACÉ : la puce du tracé (en tête) montre les quantités tracées et ouvre le chantier
await page.evaluate(()=>{window.TRACE.affaires.set('O2610-15',{sites:['bain']});});await click('tab|dossier');await click('tab|quantites');await wait(300);
out={chip:await page.evaluate(()=>{const ch=document.querySelector('#eq-app .cm-qschips');const b=ch&&ch.firstElementChild;return b?{t:b.textContent.replace(/\s+/g,' ').trim(),tchip:b.classList.contains('cm-qtchip'),v:b.dataset.v||''}:null;})};
if(out.chip&&out.chip.v)await click(out.chip.v);
Object.assign(out,await page.evaluate(()=>{const h=document.querySelector('#eq-app .cm-qsh');const btn=h&&h.querySelector('[data-act="opensite"]');return {sh:h?h.textContent.replace(/\s+/g,' ').trim():'',act:btn&&btn.dataset.act,v:btn&&btn.dataset.v,btnT:btn?btn.textContent.trim():'',tab:!!document.querySelector('#eq-app .cm-qst'),cmp:[...document.querySelectorAll('#eq-app .cm-qcmp tr:first-child th')].map(x=>x.textContent.trim())};}));
console.log('4) puce du tracé :',JSON.stringify(out));
C.c4=out.chip&&out.chip.tchip&&/^📐 Tracé · /.test(out.chip.t)&&out.chip.v==='qssel|trace:bain'&&(/[\d ]+ soudures/.test(out.chip.t)&&/Ouvrir le tracé/.test(out.btnT)&&out.tab||/rien de tracé/.test(out.chip.t)&&/Tracer/.test(out.btnT))&&/📐 Tracé · /.test(out.sh)&&out.act==='opensite'&&out.v==='bain'&&out.cmp.some(t=>/\(tracé\)/.test(t));
// ── 5) onglet Points retiré (14/10 nuit) : ancien lien → chiffrage ; « Préremplir » deux fois → UNE seule zone (pas de doublon)
await click('tab|quantites');await click('qprefill|');await wait(400);
const n1=await A().then(a=>((a.chiffrage||{}).etudes||(a.chiffrage||{}).zones||[]).length);
/* 14/10 nuit : plus d'onglet Points (doublon du chiffrage) — un ancien lien « tab|points » ouvre le chiffrage ; « Préremplir » une 2e fois met à jour LA même zone */
out={pt:await page.evaluate(async()=>{const chip=!!document.querySelector('#eq-app [data-act=af][data-v="tab|points"]');const b=document.createElement('button');b.dataset.act='af';b.dataset.v='tab|points';document.getElementById('eq-app').appendChild(b);b.click();await new Promise(r=>setTimeout(r,300));return {chip,tab:window.TRACE.affaires.state().tab,pts:!!document.querySelector('#eq-app [data-afx^="pt§"]')||!!document.querySelector('#eq-app [data-act=af][data-v="ptprefill|"]')};})};
await click('tab|quantites');await click('qprefill|');await wait(400);
out.n1=n1;out.after=await A().then(a=>{const E=(a.chiffrage||{}).etudes||(a.chiffrage||{}).zones||[];return {n:E.length,noms:E.map(z=>z.nom)};});
console.log('5) plus d\'onglet Points + une seule zone de lecture :',JSON.stringify(out));
C.c5=!out.pt.chip&&out.pt.tab==='chiffrage'&&!out.pt.pts&&out.n1>=1&&(out.n1===out.after.n)&&out.after.noms.filter(x=>/Quantités de référence/.test(x)).length===1;
const bad=Object.entries(C).filter(([k,v])=>!v).map(([k])=>k);console.log(bad.length?'RESULTAT: ECHEC '+bad.join(','):'RESULTAT: TOUT VERT');console.log(logs.length?logs:'[]');
await browser.close();
