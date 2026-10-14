// MÉMOIRE TECHNIQUE — retours d'Ethan du 14/10 après-midi (lot B). Données FICTIVES (test/memoire_fake4.mjs ; images dessinées dans le test) :
// import du pack (images gardées en data URL hors connexion) → image dans un bloc (vue + Word + PDF), bulle des notes du DCE, documents de référence priorisés
// (annotés, plans regroupés, pièces maîtresses), e-mail de contact = celui du chargé d'affaires, interlocuteurs (responsable d'exploitation du secteur,
// QHSE réglé une fois pour tous les mémoires, opérateurs choisis dans le personnel), description de la prestation depuis un chiffrage fictif à 2 zones
// (déchargement non chiffré → paragraphe décoché d'office et passé en hors prestation), équipes du planning (jours de soudure ÷ jours ouvrés, modifiable),
// assurance prise dans les documents d'entreprise (registre entdoc), table numérotée = numéros du mémoire, section sans rien de coché grisée, clic sur un
// paragraphe → sa ligne dans la table, navigation des trous collante, estimation des pages, défilement vers un bloc ajouté ; puis téléphone (390 px).
// SHOTS=<dossier> : captures pour relecture (hors dépôt).
import { chromium } from 'playwright';
import fs from 'fs';import path from 'path';import {fileURLToPath} from 'url';
import {unzipSync,strFromU8} from 'fflate';
import {FAKE_STYLE} from './memoire_fake.mjs';
import {FAKE4_BLOCS,FAKE4_ACCOUNTS,FAKE4_DCE} from './memoire_fake4.mjs';
const HERE=path.dirname(fileURLToPath(import.meta.url));const SHOTS=process.env.SHOTS||'';
const BASE=process.env.BASE||'http://localhost:8765';
const browser=await chromium.launch({headless:true, executablePath: process.env.CHROMIUM_PATH||undefined});
const C={};const logs=[];const ENT={assurance_rc:{id:'assurance_rc',data:{type:'assurance_rc',title:'Attestation RC (fictive)',assureur:'Assureur Fictif',police:'RC-0001',validUntil:'2027-06-30'},updated_at:'2026-10-14T00:00:00.000Z'}};
async function open(ctxOpts,ent=ENT){const ctx=await browser.newContext(Object.assign({acceptDownloads:true},ctxOpts));const page=await ctx.newPage();
  page.on('pageerror',e=>logs.push('PAGEERROR: '+e.message.slice(0,300)));page.on('console',m=>{if(m.type()==='error'&&!/supabase|Failed to fetch|net::ERR|404|WebSocket|pdf\.worker|cdnjs/i.test(m.text()))logs.push(m.text().slice(0,200));});page.on('dialog',d=>d.accept().catch(()=>{}));
  await page.route(u=>/(^|\.)geopf\.fr$|^geo\.api\.gouv\.fr$|open-meteo\.com$|ign\.fr$|openstreetmap|tile/.test(u.hostname),r=>r.fulfill({status:200,contentType:'application/json',body:'{}'}));
  await page.goto(BASE+'/index.html');await page.waitForTimeout(600);
  await page.evaluate(([acc,ent])=>new Promise((res,rej)=>{localStorage.clear();localStorage.setItem('trace:wide','1');localStorage.setItem('trace:accounts',JSON.stringify(acc));const r=indexedDB.open('trace-kv',1);r.onupgradeneeded=()=>{r.result.createObjectStore('kv');};r.onerror=()=>rej(r.error);
    r.onsuccess=()=>{const db=r.result;const t=db.transaction('kv','readwrite');const st=t.objectStore('kv');st.delete('trace:reg:doc');if(ent)st.put(ent,'trace:reg:entdoc');else st.delete('trace:reg:entdoc');t.oncomplete=()=>{db.close();res();};t.onerror=()=>rej(t.error);};}),[FAKE4_ACCOUNTS,ent]);
  await page.reload();await page.waitForTimeout(1200);{const s=await page.$('#loginSkip');if(s&&await s.isVisible())await s.click();await page.waitForTimeout(700);}
  await page.evaluate(async()=>{const T=window.TRACE;T.state.userId='ethan';T.renderHome();await T.acces.list();const P=T.espace.state().people;const set=(k,o)=>{P[k]=Object.assign(P[k]||{},o);};
    set('alain.charge@exemple.test',{tel:'06 11 22 33 44'});set('remi.ouest@exemple.test',{tel:'06 55 44 33 22',secteur:'ouest'});set('iris.idf@exemple.test',{tel:'06 77 88 99 00',secteur:'idf'});});
  return {ctx,page};}
let {ctx,page}=await open({viewport:{width:1280,height:900}});
const wait=ms=>page.waitForTimeout(ms);
const shot=async n=>{if(!SHOTS)return;fs.mkdirSync(SHOTS,{recursive:true});await wait(250);await page.screenshot({path:path.join(SHOTS,n+'.png')});};
const click=async v=>{await page.evaluate(v=>{const el=document.querySelector(`#eq-app [data-act=af][data-v="${v}"]`);if(!el)throw new Error('bouton absent '+v);el.click();},v);await wait(320);};
const clickTxt=async (sel,re)=>page.evaluate(([sel,re])=>{const b=[...document.querySelectorAll(sel)].find(x=>new RegExp(re).test(x.textContent));if(b)b.click();return !!b;},[sel,re]);
const NUM='O2610-41';const A=n=>page.evaluate(n=>window.TRACE.affaires.get(n),n||NUM);
const P=id=>page.evaluate(id=>{const el=document.getElementById('memoire-p-'+id);return el?el.textContent.replace(/\s+/g,' ').trim():null;},id);
const holes=()=>page.evaluate(()=>{const b=document.querySelector('#memoire-nholes b');return b?+b.textContent:null;});
// ── 0) pack fictif importé par l'écran Pack SCR (images dessinées ici, gardées en data URL : pas de connexion)
const packJson=await page.evaluate(([blocs,style])=>{const cv=(w,h,bg,txt,png)=>{const c=document.createElement('canvas');c.width=w;c.height=h;const g=c.getContext('2d');if(!png){g.fillStyle=bg;g.fillRect(0,0,w,h);}else{g.clearRect(0,0,w,h);}g.strokeStyle=png?'#fff':'#ffffff';g.lineWidth=png?6:10;g.strokeRect(8,8,w-16,h-16);if(!png){g.fillStyle='#fff';g.font='bold 42px sans-serif';g.fillText(txt,30,70);}return c.toDataURL(png?'image/png':'image/jpeg',0.82);};
  const images={'img-carte':{data:cv(800,500,'#2f6f4f','CARTE'),w:800,h:500,titre:'Carte fictive'},'img-ico':{data:cv(64,64,'',' ',true),w:64,h:64},'img-photo':{data:cv(600,400,'#555577','PHOTO'),w:600,h:400},'img-couv':{data:cv(500,1000,'#7a4b2a','COUV'),w:500,h:1000},'img-logo':{data:cv(300,120,'#eb6834','LOGO'),w:300,h:120}};
  return JSON.stringify({format:'trace-pack-scr',version:'test',memoire:{blocs,style:Object.assign({},style,{images:{couverture:'img-couv',logo:'img-logo',logoPetit:'img-logo'}}),images}});},[FAKE4_BLOCS,FAKE_STYLE]);
await page.evaluate(()=>document.getElementById('htEnt').click());await wait(400);
await page.evaluate(()=>{const b=[...document.querySelectorAll('#eq-app .ac-row')].find(x=>/Pack SCR/.test(x.textContent));if(b)b.click();});await wait(400);
await (await page.$('#eq-app input[type=file][data-xin="pack|file"]')).setInputFiles({name:'pack_test.json',mimeType:'application/json',buffer:Buffer.from(packJson)});await wait(800);
await clickTxt('#eq-app button','Importer');for(let i=0;i<40;i++){await wait(300);if(await page.evaluate(()=>/Résultat/.test(document.getElementById('eq-app').textContent)))break;}
let out={res:await page.evaluate(()=>[...document.querySelectorAll('#eq-app .okbox,#eq-app .warnbox')].map(x=>x.textContent.replace(/\s+/g,' ')).join(' | ')),lib:await page.evaluate(()=>{const L=window.TRACE.reg.get('doc','memlib');return L?{n:L.blocs.length,img:Object.keys(L.images||{}),data:Object.values(L.images||{}).every(x=>/^data:image\//.test(x.data||''))}:null;})};
console.log('0) import du pack :',JSON.stringify(out));
C.c0=/Mémoire technique : 12 blocs/.test(out.res)&&/5 images \(3 paragraphes image ; gardées dans l’appli, hors connexion\)/.test(out.res)&&out.lib&&out.lib.img.length===5&&out.lib.data;
// ── affaire fictive (secteur Ouest) : chargé, conducteur, maître d'œuvre, DCE (15 pièces dont 2 annotées et 6 plans), base de prix fictive, chiffrage à 2 zones
await page.evaluate(async n=>{document.getElementById('htCom').click();await new Promise(x=>setTimeout(x,300));document.querySelector('#eq-app [data-act=af][data-v="new|"]').click();await new Promise(x=>setTimeout(x,150));
  const set=(id,v)=>{const e=document.getElementById(id);if(e)e.value=v;};set('afn-num',n);set('afn-nom','Réseau test lot B');set('afn-client','CLIENT-TEST');set('afn-ville','Testville');set('afn-sect','ouest');set('afn-etat','devis');
  document.querySelector('#eq-app [data-act=af][data-v="create|"]').click();await new Promise(x=>setTimeout(x,250));document.querySelector('#eq-app [data-act=af][data-v="tab|chiffrage"]').click();await new Promise(x=>setTimeout(x,300));},NUM);
await page.setInputFiles('#eq-app input[data-afprix]',path.join(HERE,'fixture_prix.xlsx'));await wait(1500);
await page.evaluate(([n,dce])=>{const T=window.TRACE;T.affaires.set(n,{charge:'Alain Chargé',cdtx:'Cédric Conduite',moe:'BET Fictif',dce,chiffrage:{etudes:[
  {id:'E1',nom:'Zone A',chantier:{d0:'2026-11-02',d1:'2026-12-11',nbDecharg:0},eq:{soud:'S+T+P',manch:'M',typeManchon:'Thermo'},mlMode:'tranchee',dn:[{dn:100,soud:400,ml:1200},{dn:50,soud:60,ml:200}],sst:[{dn:50,type:'sst_vannes_bs_pn25',paires:3}],vidanges:{dn:50,type:'gravite',paires:2,deporte:false},cnd:{km:'',radio:{on:true,antPct:10,antVac:0,fdPct:10,fdVac:0,raccFilms:0,raccVac:0}}},
  {id:'E2',nom:'Zone B',chantier:{d0:'2026-11-16',d1:'2026-12-04'},eq:{soud:'S+T+P',manch:'M',typeManchon:'Thermo'},mlMode:'tranchee',dn:[{dn:150,soud:80,ml:300}]}]}});
  T.affaires.state().tab='memoire';T.renderHome();},[NUM,FAKE4_DCE]);await wait(300);
await page.evaluate(()=>{const b=document.querySelector('#eq-app [data-act=af][data-v="tab|memoire"]');if(b)b.click();});await wait(700);
const calc=await page.evaluate(n=>{const T=window.TRACE;const C=T.affaires.calc(T.affaires.get(n));return {qS:C.etudes.reduce((s,e)=>s+((e.r.T||{}).qS||0),0),decharg:(C.postes.find(p=>p.k==='decharg')||{}).achat,boulet:(C.postes.find(p=>p.k==='boulet')||{}).achat,sst:(C.postes.find(p=>p.k==='sst')||{}).achat,radio:(C.postes.find(p=>p.k==='radio')||{}).achat};},NUM);
await shot('01_memoire_large');
// ── 1) images : figure + légende, image à côté du texte, image décochée absente, photo de couverture
out=await page.evaluate(()=>{const f=document.querySelector('#memoire-p-f-vis-1 figure img');const s=document.querySelector('#memoire-p-f-vis-2 .mem3-side img');return {fig:f?f.getAttribute('src').slice(0,23):'',cap:(document.querySelector('#memoire-p-f-vis-1 figcaption')||{}).textContent||'',w:f?Math.round(f.getBoundingClientRect().width):0,side:!!s&&/Chiffre fictif|chiffre fictif/i.test(document.querySelector('#memoire-p-f-vis-2').textContent),off:!document.getElementById('memoire-p-f-vis-3'),cover:!!document.querySelector('#memoire-scroll .mem3-cvph'),tree:(document.querySelector('#memoire-tr-f-vis-1')||{}).textContent||''};});
console.log('1) images :',JSON.stringify(out),JSON.stringify(calc));
C.c1=out.fig.startsWith('data:image/jpeg;base64')&&/Carte des agences \(fictive\)/.test(out.cap)&&out.w>150&&out.side&&out.off&&out.cover;
// ── 2) bulle des notes du DCE (2 notes « mémoire ») → panneau, une note cochée → 1
out={b0:await page.evaluate(()=>(document.getElementById('memoire-nbub')||{}).textContent||'')};await click('mnotesdrawer|');
out.drawer=await page.evaluate(()=>{const d=document.getElementById('memoire-ndrawer');return d?{n:d.querySelectorAll('.cm-note').length,t:d.textContent.slice(0,80)}:null;});await shot('02_bulle_notes');
await page.evaluate(()=>document.querySelector('#memoire-ndrawer .cm-note input').click());await wait(350);out.b1=await page.evaluate(()=>(document.getElementById('memoire-nbub')||{}).textContent||'');await click('mnotesdrawer|');out.closed=await page.evaluate(()=>!document.getElementById('memoire-ndrawer'));
console.log('2) bulle des notes :',JSON.stringify(out));
C.c2=/Notes du DCE\s*2/.test(out.b0)&&out.drawer&&out.drawer.n===2&&/Notes du DCE\s*1/.test(out.b1)&&out.closed;
// ── 3) documents de référence : annotés d'abord, plans regroupés, pièces maîtresses, « et 3 autres pièces »
out={t:await P('f-docs-2'),gen:await page.evaluate(()=>!!document.querySelector('#memoire-p-f-docs-2 .memoire-gen')),no:await P('f-docs-3')};
const ord=['02-CCTP Reseau test','05-Notice des travaux','Plans du projet (6 plans','01-RC Reglement','04-CCAP test','03-DPGF test','Planning previsionnel test'].map(s=>(out.t||'').indexOf(s));
console.log('3) documents de référence :',JSON.stringify(out),JSON.stringify(ord));
C.c3=!!out.t&&ord.every((x,i)=>x>=0&&(i===0||x>ord[i-1]))&&/et 3 autres pièces du dossier de consultation/.test(out.t)&&!/Courrier client|Photo du site|Annexe divers/.test(out.t)&&out.no===null&&out.gen;
// ── 4) contact = e-mail du chargé d'affaires (trou « e-mail de contact » rempli d'office), maître d'œuvre de la fiche
out=await page.evaluate(()=>({auto:[...document.querySelectorAll('#memoire-p-f-ident-1 .memoire-auto')].map(x=>x.textContent),t:document.getElementById('memoire-p-f-ident-1').textContent,moe:(document.querySelector('#memoire-p-f-act-1 .memoire-auto')||{}).textContent||''}));
console.log('4) contact :',JSON.stringify(out));
C.c4=out.auto.includes('alain.charge@exemple.test')&&/06 11 22 33 44/.test(out.t)&&out.moe==='BET Fictif';
// ── 5) interlocuteurs : RE du secteur Ouest, QHSE et chef à choisir (trous), opérateurs → choisis une fois ; QHSE gardé pour les autres mémoires
const eq=()=>page.evaluate(()=>[...document.querySelectorAll('#memoire-p-f-eq-1 .mem3-row')].map(r=>r.textContent.replace(/\s+/g,' ').trim()));
out={before:await eq(),h0:await holes()};await click('mlbinter|');await shot('03_interlocuteurs');
out.modal=await page.evaluate(()=>({re:(document.querySelector('#mem3-re option')||{}).textContent||'',n:document.querySelectorAll('#mem3-ops input').length}));
await page.evaluate(()=>{const sel=(id,re)=>{const s=document.getElementById(id);const o=[...s.options].find(x=>re.test(x.textContent));s.value=o?o.value:'';};sel('mem3-qhse',/Quentin/);sel('mem3-chef',/Charles/);[...document.querySelectorAll('#mem3-ops label')].forEach(l=>{if(/Sam Soudeur|Mia Manchon/.test(l.textContent))l.querySelector('input').checked=true;});document.getElementById('mem3-iok').click();});await wait(450);
out.after=await eq();out.h1=await holes();const L5=await page.evaluate(()=>window.TRACE.reg.get('doc','memlib').reglages);out.qhse=L5&&L5.qhse&&L5.qhse.name;out.ops=((await A()).memoire.lib.inter.ops||[]).map(x=>x.name);
console.log('5) interlocuteurs :',JSON.stringify(out));
C.c5=/Responsable exploitation\s*OUEST Rémi\s*06 55 44 33 22\s*remi\.ouest@exemple\.test/.test(out.before[0])&&/à choisir/.test(out.before[1])&&/CHARGÉ Alain.*alain\.charge@exemple\.test/.test(out.before[2])&&/CONDUITE Cédric/.test(out.before[3])&&/à choisir/.test(out.before[4])&&/Équipe complète/.test(out.before[5])
  &&/Auto : Rémi Ouest/.test(out.modal.re)&&out.modal.n>=4&&/QUALITÉ Quentin/.test(out.after[1])&&/CHANTIER Charles/.test(out.after[4])&&/SOUDEUR Sam · MANCHON Mia|MANCHON Mia · SOUDEUR Sam/.test(out.after[5])&&out.h1===out.h0-2&&out.qhse==='Quentin Qualité'&&out.ops.length===2;
// ── 6) description de la prestation depuis le chiffrage : déchargement non chiffré → décoché d'office et passé en hors prestation ; boulet idem ; radio, SST, vidanges chiffrés
out=await page.evaluate(()=>{const has=id=>!!document.getElementById('memoire-p-'+id);const ck=id=>{const i=document.querySelector(`#eq-app input[data-v="mlbp|${id}"]`);return i?i.checked:null;};
  return {d4:has('f-desc-4'),h2:has('f-hors-2'),d8:has('f-desc-8'),h3:has('f-hors-3'),h4:has('f-hors-4'),t5:(document.getElementById('memoire-p-f-desc-5')||{}).textContent||'',t6:(document.getElementById('memoire-p-f-desc-6')||{}).textContent||'',t7:(document.getElementById('memoire-p-f-desc-7')||{}).textContent||'',
    z:(document.getElementById('memoire-p-f-desc-2')||{}).textContent||'',dn:(document.getElementById('memoire-p-f-desc-3')||{}).textContent||''};});
await click('mlbsec|2');await click('mlbexp|f-desc');out.tag=await page.evaluate(()=>{const r=document.getElementById('memoire-tr-f-desc-4');return r?{ck:r.querySelector('input').checked,t:(r.querySelector('.memoire-tg.auto')||{}).textContent||''}:null;});
await click('mlbp|f-desc-4');out.manual=await page.evaluate(()=>!!document.getElementById('memoire-p-f-desc-4'));await click('mlbp|f-desc-4');out.manual2=await page.evaluate(()=>!document.getElementById('memoire-p-f-desc-4'));
console.log('6) prestation depuis le chiffrage :',JSON.stringify(out));
C.c6=calc.decharg===0&&calc.boulet===0&&calc.sst>0&&calc.radio>0&&!out.d4&&out.h2&&!out.d8&&out.h3&&!out.h4&&/Pose de 3 paires de vannes/.test(out.t5)&&/DN 50 \(2 paires\)/.test(out.t6)&&/radiographique de 10 % des soudures/.test(out.t7)
  &&/Zone A/.test(out.z)&&/Zone B/.test(out.z)&&/3 paires de vannes en sous-station/.test(out.z)&&/DN 100 = 1\s200 ml – 400 soudures/.test(out.dn)&&/Total : 1\s700 ml – 540 soudures/.test(out.dn)&&out.tag&&!out.tag.ck&&/non chiffré/.test(out.tag.t)&&out.manual&&out.manual2;
// ── 7) planning : équipes = jours de soudure ÷ jours ouvrés (02/11 → 11/12 = 30 jours ouvrés), modifiable
const exp=Math.max(1,Math.ceil(calc.qS/30));out={t:await P('f-plan-1'),dates:await P('f-plan-2'),exp};await click('mlbv|nbEquipes');out.modal=await page.evaluate(()=>(document.querySelector('#modal.show')||{}).textContent||'');
await page.fill('#memoire-vv','4');await page.click('#memoire-vok');await wait(400);out.t2=await P('f-plan-1');await click('mlbv|nbEquipes');await page.click('#memoire-vclr');await wait(400);out.t3=await P('f-plan-1');
console.log('7) planning :',JSON.stringify(out));
C.c7=new RegExp(`Nous prévoyons ${exp} équipe\\(s\\) : ${calc.qS} jours de soudage sur 30 jours ouvrés`).test(out.t)&&/jours de soudure ÷ 30 jours ouvrés/.test(out.modal)&&/Nous prévoyons 4 équipe/.test(out.t2)&&new RegExp(`Nous prévoyons ${exp} équipe`).test(out.t3)&&/Zone A : du 02\/11\/2026 au 11\/12\/2026/.test(out.dates);
// ── 8) assurance déposée (registre entdoc) → garanties remplies seules
out={t:await P('f-gar-1')};console.log('8) garanties :',JSON.stringify(out));
C.c8=/Assureur Fictif, police n° RC-0001, valable jusqu’au 30\/06\/2027/.test(out.t||'');
// ── 9) table numérotée = numéros du mémoire ; section sans rien de coché grisée (« – ») ; clic sur un paragraphe → sa ligne dans la table
await click('mlbsecall|1');
out=await page.evaluate(()=>{const tree=[...document.querySelectorAll('#memoire-tree .memoire-sech .mem3-n')].map(x=>x.textContent.trim());const doc=[...document.querySelectorAll('#memoire-scroll h1')].map(h=>h.textContent.split(' ')[0]);
  const bt=[...document.querySelectorAll('#memoire-tree .memoire-brow .mem3-n')].map(x=>x.textContent.trim());const bd=[...document.querySelectorAll('#memoire-scroll h2')].map(h=>h.textContent.split(' ')[0]);
  const empty=[...document.querySelectorAll('#memoire-tree .memoire-sec.mem3-empty .memoire-sech')].map(x=>x.textContent.replace(/\s+/g,' ').trim());return {tree,doc,bt,bd,empty};});
await page.evaluate(()=>{const s=document.getElementById('memoire-tree');s.scrollTop=0;});
const tgt=await page.$('#memoire-p-f-long-9 p');await tgt.scrollIntoViewIfNeeded();await tgt.click();await wait(400);
out.sel=await page.evaluate(()=>{const r=document.getElementById('memoire-tr-f-long-9');const t=document.getElementById('memoire-tree');if(!r||!t)return null;const rr=r.getBoundingClientRect(),tr=t.getBoundingClientRect();return {hl:r.classList.contains('mem3-hl'),vis:rr.top>=tr.top-1&&rr.bottom<=tr.bottom+1,p:document.getElementById('memoire-p-f-long-9').classList.contains('mem3-sel')};});
console.log('9) table numérotée :',JSON.stringify(out));
C.c9=out.tree.filter(x=>x!=='–').join()===out.doc.join()&&out.doc.join()==='1.,2.,3.,4.,5.'&&out.tree.join()==='1.,2.,3.,4.,–,5.'&&out.bt.join()===out.bd.join()&&out.empty.length===1&&/– Section sans choix/.test(out.empty[0])&&out.sel&&out.sel.hl&&out.sel.vis&&out.sel.p;
await shot('04_table_numerotee');
// ── 10) navigation des trous : collante en bas du mémoire, précédent / suivant, n / N
out={n:await holes()};await page.evaluate(()=>{const s=document.getElementById('memoire-scroll');s.scrollTop=s.scrollHeight;});await wait(250);
out.vis=await page.evaluate(()=>{const n=document.getElementById('memoire-nav'),s=document.getElementById('memoire-scroll');const a=n.getBoundingClientRect(),b=s.getBoundingClientRect();return a.top>=b.top-1&&a.top<=b.top+20&&s.scrollTop>400;});await shot('05_nav_trous_bas');
const pos=()=>page.evaluate(()=>(document.getElementById('memoire-navpos')||{}).textContent||'');
await click('mlbnext|');out.p1=await pos();out.f1=await page.evaluate(()=>{const h=document.activeElement;return h&&h.classList.contains('memoire-h')?h.textContent:'';});await click('mlbnext|');out.p2=await pos();await click('mlbprev|');out.p3=await pos();
console.log('10) navigation des trous :',JSON.stringify(out));
const k1=+(out.p1.split(' / ')[0]);C.c10=out.n>=2&&out.vis&&k1>=1&&out.p1===k1+' / '+out.n&&out.p2===(k1%out.n+1)+' / '+out.n&&out.p3===out.p1&&!!out.f1;
// ── 11) estimation des pages (Word · PDF)
out=await page.evaluate(()=>(document.querySelector('#memoire-npages')||{}).textContent||'');console.log('11) pages :',JSON.stringify(out));
const pg=/≈ (\d+) · (\d+)/.exec(out)||[];C.c11=+pg[1]>=5&&+pg[2]>=5&&/pages Word · PDF/.test(out);
// ── 12) ajouter un bloc tout en bas → le mémoire défile dessus ; le retirer → on reste à sa place
await page.evaluate(()=>{const s=document.getElementById('memoire-scroll');s.scrollTop=0;});await wait(150);await click('mlbb|f-fin');await wait(300);
out={add:await page.evaluate(()=>{const b=document.getElementById('memoire-b-f-fin'),s=document.getElementById('memoire-scroll');if(!b)return null;const r=b.getBoundingClientRect(),q=s.getBoundingClientRect();return {vis:r.top>=q.top-2&&r.top<q.bottom-20,fl:b.classList.contains('mem3-flash'),st:Math.round(s.scrollTop)};})};await shot('06_bloc_ajoute');
await click('mlbb|f-fin');await wait(300);out.rm=await page.evaluate(()=>{const s=document.getElementById('memoire-scroll');const q=s.getBoundingClientRect();const el=[...document.querySelectorAll('#memoire-scroll .mem3-flash')][0];return {gone:!document.getElementById('memoire-b-f-fin'),st:Math.round(s.scrollTop),near:el?el.getBoundingClientRect().top<q.bottom:false};});
console.log('12) défilement :',JSON.stringify(out));
C.c12=out.add&&out.add.vis&&out.add.fl&&out.add.st>800&&out.rm.gone&&out.rm.st>400&&out.rm.near;
// ── 13) export Word (.docx) : images (data URL → word/media), organigramme, e-mail du chargé, garanties, pied « page n / N »
let [dl]=await Promise.all([page.waitForEvent('download'),click('mword|')]);const zip=unzipSync(new Uint8Array(fs.readFileSync(await dl.path())));const Z=k=>zip[k]?strFromU8(zip[k]):'';const dx=Z('word/document.xml');const txt=dx.replace(/<[^>]+>/g,'');
out={name:dl.suggestedFilename(),media:Object.keys(zip).filter(k=>k.startsWith('word/media/')),drawings:(dx.match(/<w:drawing>/g)||[]).length,mail:/alain\.charge@exemple\.test/.test(txt),org:/OUEST Rémi/.test(txt)&&/QUALITÉ Quentin/.test(txt)&&/w:fill="ED7D31"/.test(dx),gar:/Assureur Fictif/.test(txt),cap:/Carte des agences \(fictive\)/.test(txt),foot:/NUMPAGES/.test(Z('word/footer1.xml'))&&/word\/media/.test(Z('word/_rels/footer1.xml.rels')+'word/media'),docs:/Plans du projet \(6 plans/.test(txt)};
if(SHOTS)fs.writeFileSync(path.join(SHOTS,'memoire_test.docx'),fs.readFileSync(await dl.path()));
console.log('13) export Word :',JSON.stringify(out));
C.c13=out.name==='Memoire_technique_O2610-41.docx'&&out.media.length>=4&&out.media.some(x=>/\.png$/.test(x))&&out.media.some(x=>/\.jpeg$/.test(x))&&out.drawings>=5&&out.mail&&out.org&&out.gar&&out.cap&&out.foot&&out.docs;
// ── 14) PDF (impression) : images, sommaire paginé (numéros écrits), pied « Page n / N »
const [pop]=await Promise.all([page.waitForEvent('popup'),click('mprint|')]);await pop.waitForLoadState().catch(()=>{});for(let i=0;i<30;i++){await pop.waitForTimeout(200);if(await pop.evaluate(()=>!!document.documentElement.dataset.paged).catch(()=>false))break;}
out=await pop.evaluate(()=>({paged:+document.documentElement.dataset.paged||0,pn:[...document.querySelectorAll('#toc .pn')].map(x=>x.textContent),img:document.querySelectorAll('#flow img').length,cover:!!document.querySelector('.cover .cv-ph'),eq:document.querySelectorAll('#flow .mem3-row').length})).catch(e=>({err:String(e)}));
if(SHOTS){try{await pop.pdf({path:path.join(SHOTS,'memoire_test.pdf'),preferCSSPageSize:true,printBackground:true});}catch(e){console.log('pdf',String(e).slice(0,80));}}await pop.close().catch(()=>{});
console.log('14) PDF :',JSON.stringify(out));
C.c14=out.paged>=6&&out.pn.length>=8&&out.pn.every(x=>/^\d+$/.test(x))&&+out.pn[0]===3&&out.pn.map(Number).every((x,i,a)=>!i||x>=a[i-1])&&out.img>=2&&out.cover&&out.eq===6;
// ── 15) un autre mémoire (secteur Île-de-France) : RE de ce secteur, QHSE déjà réglé
await page.evaluate(async()=>{const T=window.TRACE;T.affaires.set('I2610-05',{num:'I2610-05',nom:'Autre réseau',client:'X',ville:'Paris test',secteur:'idf',etat:'devis',charge:'Alain Chargé'});T.affaires.state().cur='I2610-05';T.affaires.state().view='fiche';T.affaires.state().tab='memoire';document.getElementById('htCom').click();await new Promise(r=>setTimeout(r,400));});
out=await page.evaluate(()=>[...document.querySelectorAll('.mem3-eq .mem3-row')].map(r=>r.textContent.replace(/\s+/g,' ').trim()));console.log('15) autre affaire :',JSON.stringify(out));
C.c15=/FRANCILIENNE Iris/.test(out[0]||'')&&/QUALITÉ Quentin/.test(out[1]||'');
await ctx.close();
// ── 16) téléphone (390 px) : pas de débordement ; barre des trous visible ; organigramme lisible ; sans attestation d'assurance → trous dans les garanties
({ctx,page}=await open({viewport:{width:390,height:844},isMobile:true,hasTouch:true,deviceScaleFactor:2},null)); /* sans attestation d'assurance déposée */
await page.evaluate(()=>document.getElementById('htEnt').click());await page.waitForTimeout(400);await page.evaluate(()=>{const b=[...document.querySelectorAll('#eq-app .ac-row')].find(x=>/Pack SCR/.test(x.textContent));if(b)b.click();});await page.waitForTimeout(400);
await (await page.$('#eq-app input[type=file][data-xin="pack|file"]')).setInputFiles({name:'pack_test.json',mimeType:'application/json',buffer:Buffer.from(packJson)});await page.waitForTimeout(600);
await page.evaluate(()=>{const b=[...document.querySelectorAll('#eq-app button')].find(x=>/Importer/.test(x.textContent));if(b)b.click();});await page.waitForTimeout(1200);
await page.evaluate(async([n,dce])=>{const T=window.TRACE;T.affaires.set(n,{num:n,nom:'Réseau tel',client:'CLIENT-TEST',ville:'Testville',secteur:'ouest',etat:'devis',charge:'Alain Chargé',dce});T.affaires.state().cur=n;T.affaires.state().view='fiche';T.affaires.state().tab='memoire';document.getElementById('htCom').click();await new Promise(r=>setTimeout(r,500));},['O2610-42',FAKE4_DCE]);
const ov=()=>page.evaluate(()=>({sw:document.documentElement.scrollWidth,iw:window.innerWidth}));
out={o1:await ov(),gar:await page.evaluate(()=>{const p=document.getElementById('memoire-p-f-gar-1');return p?[...p.querySelectorAll('.memoire-h')].map(h=>h.textContent):null;})};await page.evaluate(()=>{const p=document.getElementById('memoire-p-f-long-12');if(p)p.scrollIntoView({block:'center'});});await page.waitForTimeout(250);
out.nav=await page.evaluate(()=>{const n=document.getElementById('memoire-nav');const r=n.getBoundingClientRect();const hb=document.getElementById('homeBody');const t=hb?hb.getBoundingClientRect().top:0;return r.top>=t-1&&r.top<t+40&&(hb?hb.scrollTop>600:true);});out.o2=await ov();
await page.evaluate(()=>{const e=document.getElementById('memoire-p-f-eq-1');if(e)e.scrollIntoView({block:'center'});});await page.waitForTimeout(200);out.eq=await page.evaluate(()=>{const r=document.querySelector('#memoire-p-f-eq-1 .mem3-row');return r?r.getBoundingClientRect().right<=window.innerWidth+1:false;});
if(SHOTS){fs.mkdirSync(SHOTS,{recursive:true});await page.screenshot({path:path.join(SHOTS,'07_tel_organigramme.png')});}
await page.evaluate(()=>{const b=document.querySelector('#eq-app [data-act=af][data-v="mlbinter|"]');if(b)b.click();});await page.waitForTimeout(300);out.o3=await ov();if(SHOTS)await page.screenshot({path:path.join(SHOTS,'08_tel_interlocuteurs.png')});
console.log('16) téléphone :',JSON.stringify(out));
C.c16=[out.o1,out.o2,out.o3].every(o=>o.sw<=o.iw)&&out.nav&&out.eq&&!!out.gar&&out.gar.length===3&&/assureur/.test(out.gar[0])&&/police/.test(out.gar[1]); /* pas d'attestation → 3 trous */
await ctx.close();
C.console=logs.length===0;
const bad=Object.entries(C).filter(([k,v])=>!v).map(([k])=>k);console.log(bad.length?'RESULTAT: ECHEC '+bad.join(','):'RESULTAT: TOUT VERT');console.log(logs.length?logs:'[]');
await browser.close();
