// MÉMOIRE TECHNIQUE — EXPORT PDF DIRECT (lot M3, 14/10/2026 soir). Ethan : « export pdf plutôt serait mieux ». Bibliothèque FICTIVE (test/memoire_fake_m3.mjs :
// celle de e2e_memoire4 + tableau, liste numérotée, h4, mises en forme, section HSE, image WebP, image illisible ; images dessinées ici) injectée dans le registre
// « doc » → étape 5 · Mémoire : boutons (⬇ PDF en premier, ⬇ Word, 🖨 Imprimer) → un clic = Memoire_technique_<num>.pdf ; contrôles avec les outils poppler :
// en-tête %PDF, pages, page de garde, sommaire paginé (chaque titre est à la page annoncée), titres numérotés, bandeau d'en-tête, « Page 2 / N », trous en rouge
// (pixels lus par pdftoppm sous les mots de pdftotext -bbox), puces carrées de couleur, tableau (en-tête orange), images (pdfimages), Carlito incorporée (pdffonts) ;
// hors connexion avec le moteur déjà chargé ; repli (moteur introuvable dans l'appli et moteur altéré sur jsDelivr, refusé par son empreinte SRI → fenêtre
// d'impression + message) ; repli jsDelivr authentique (moteur et polices absents de l'appli, empreintes SRI acceptées) ; dossier de remise .zip avec le .pdf ;
// grosse bibliothèque (300 paragraphes, 10 images) en moins de 15 s ; bibliothèque « piège » : aucun titre seul en bas de page, aucune légende séparée de son image ;
// téléphone (390 px) ; console propre.
// SHOTS=<dossier> : garde les PDF et les pages 1 à 3 en PNG (pdftoppm -r 50) pour relecture (hors dépôt).
import { chromium } from 'playwright';
import fs from 'fs';import os from 'os';import path from 'path';import {execFileSync} from 'child_process';import {fileURLToPath} from 'url';
import {unzipSync,strFromU8} from 'fflate';
import {FAKE_STYLE} from './memoire_fake.mjs';
import {FAKE4_ACCOUNTS} from './memoire_fake4.mjs';
import {FAKE_M3_BLOCS,bigBlocs,trapBlocs} from './memoire_fake_m3.mjs';
const HERE=path.dirname(fileURLToPath(import.meta.url));const PUB=path.join(HERE,'..','public');
const BASE=process.env.BASE||'http://localhost:8765';const SHOTS=process.env.SHOTS||'';const TMP=fs.mkdtempSync(path.join(os.tmpdir(),'m3pdf-'));
const browser=await chromium.launch({headless:true, executablePath: process.env.CHROMIUM_PATH||undefined});
const C={};const logs=[];let allow=null;let dialogs=0; /* allow : erreurs console attendues pendant le contrôle du repli (fichier 404, CDN coupé) */
/* ── outils poppler ── */
const sh=(cmd,args)=>execFileSync(cmd,args,{maxBuffer:256<<20});
const info=f=>Object.fromEntries(sh('pdfinfo',[f]).toString('utf8').split('\n').map(l=>{const i=l.indexOf(':');return i>0?[l.slice(0,i).trim(),l.slice(i+1).trim()]:null;}).filter(Boolean));
const txt=(f,p,lay=true)=>sh('pdftotext',[...(lay?['-layout']:[]),...(p?['-f',String(p),'-l',String(p)]:[]),f,'-']).toString('utf8');
const dent=s=>s.replace(/&amp;/g,'&').replace(/&lt;/g,'<').replace(/&gt;/g,'>').replace(/&quot;/g,'"').replace(/&#39;/g,"'");
const words=(f,p)=>[...sh('pdftotext',['-bbox','-f',String(p),'-l',String(p),f,'-']).toString('utf8').matchAll(/<word xMin="([\d.]+)" yMin="([\d.]+)" xMax="([\d.]+)" yMax="([\d.]+)">([^<]*)<\/word>/g)].map(m=>({x0:+m[1],y0:+m[2],x1:+m[3],y1:+m[4],t:dent(m[5])}));
function ppm(f,p,dpi){const b=sh('pdftoppm',['-r',String(dpi),'-f',String(p),'-l',String(p),f]);const h=b.subarray(0,64).toString('latin1');const m=/^P6\s+(\d+)\s+(\d+)\s+(\d+)\s/.exec(h);const off=m[0].length;return {w:+m[1],h:+m[2],k:dpi/72,d:b.subarray(off)};}
/* pixels d'une zone (en points PDF) qui vérifient pred(r,g,b) */
function px(img,x0,y0,x1,y1,pred){let n=0,t=0;for(let y=Math.max(0,Math.floor(y0*img.k));y<Math.min(img.h,Math.ceil(y1*img.k));y++)for(let x=Math.max(0,Math.floor(x0*img.k));x<Math.min(img.w,Math.ceil(x1*img.k));x++){const i=(y*img.w+x)*3;t++;if(pred(img.d[i],img.d[i+1],img.d[i+2]))n++;}return {n,t};}
const near=(c,tol)=>(r,g,b)=>Math.abs(r-c[0])<=tol&&Math.abs(g-c[1])<=tol&&Math.abs(b-c[2])<=tol;
const rgb=h=>[1,3,5].map(i=>parseInt(h.slice(i,i+2),16));
const norm=s=>String(s).normalize('NFC').replace(/[’‘]/g,"'").replace(/\s+/g,' ').trim().toLocaleUpperCase('fr-FR');
/* sommaire : lignes « libellé ……… n » du texte de la page 2 → [{lab, p}] ; puis chaque titre doit être sur la page annoncée */
function tocOf(f){const out=[];for(let pg=2;pg<6&&(!out.length||pg<out[0].p);pg++){txt(f,pg).split('\n').forEach(l=>{const m=/^\s*(\d+\.(?:\d+)?\.?\s.+?)\s{2,}(\d+)\s*$/.exec(l);if(m)out.push({lab:m[1].trim(),p:+m[2]});});}return out;}
function tocOk(f,toc,n){const bad=[];toc.forEach(e=>{if(e.p<3||e.p>n){bad.push(e.lab+'→'+e.p);return;}const t=norm(txt(f,e.p));if(!t.includes(norm(e.lab)))bad.push(e.lab+'→'+e.p);});return bad;}
/* aucun titre seul en bas de page : dernière ligne de texte (hors pied) d'une page ≠ titre numéroté */
function orphans(f,n,re,from){const bad=[];for(let p=from||3;p<=n;p++){const ls=txt(f,p).split('\n').map(l=>l.trim()).filter(l=>l&&!/^Réf\.|^Page \d+ \/ \d+|Page \d+ \/ \d+$/.test(l));const last=ls[ls.length-1]||'';if(re.test(last))bad.push(p+':'+last.slice(0,50));}return bad;}
const shots=(f,tag)=>{if(!SHOTS)return;fs.mkdirSync(SHOTS,{recursive:true});fs.copyFileSync(f,path.join(SHOTS,tag+'.pdf'));try{sh('pdftoppm',['-r','50','-f','1','-l','3','-png',f,path.join(SHOTS,tag)]);}catch(e){console.log('pdftoppm',String(e).slice(0,80));}};
/* ── appli : bibliothèque injectée dans le registre « doc » (images dessinées dans la page), comptes fictifs, affaire créée par l'écran ── */
const STYLE=Object.assign({},FAKE_STYLE,{body:Object.assign({},FAKE_STYLE.body,{alignHSE:'justify'}),images:{couverture:'img-couv',logo:'img-logo',logoPetit:'img-logo',badges:['img-webp']},pageBreaks:{exceptions:['Annexes longues']}}); /* « Annexes longues » : sans saut de page avant */
async function open(ctxOpts,blocs,num,nom,big){const ctx=await browser.newContext(Object.assign({acceptDownloads:true},ctxOpts));const page=await ctx.newPage();
  page.on('pageerror',e=>logs.push('PAGEERROR: '+e.message.slice(0,300)));page.on('console',m=>{if(m.type()!=='error')return;const t=m.text();if(allow&&allow.test(t))return;if(!/supabase|Failed to fetch|WebSocket/i.test(t))logs.push(t.slice(0,200));});page.on('dialog',d=>{dialogs++;d.accept().catch(()=>{});});
  await page.route(u=>/(^|\.)geopf\.fr$|^geo\.api\.gouv\.fr$|open-meteo\.com$|ign\.fr$|openstreetmap|tile/.test(u.hostname),r=>r.fulfill({status:200,contentType:'application/json',body:'{}'}));
  await page.route(u=>/cdn\.jsdelivr\.net|unpkg\.com|cdnjs/.test(u.hostname),r=>r.abort()); /* pas de réseau extérieur : le moteur vient de l'appli */
  await page.goto(BASE+'/index.html');await page.waitForTimeout(600);
  const images=await page.evaluate(big=>{const cv=(w,h,bg,t,type)=>{const c=document.createElement('canvas');c.width=w;c.height=h;const g=c.getContext('2d');if(bg){g.fillStyle=bg;g.fillRect(0,0,w,h);}g.strokeStyle='#ffffff';g.lineWidth=8;g.strokeRect(8,8,w-16,h-16);if(t){g.fillStyle='#fff';g.font='bold 40px sans-serif';g.fillText(t,30,70);}return c.toDataURL(type,0.8);};
    const im={'img-carte':{data:cv(800,500,'#2f6f4f','CARTE','image/jpeg'),w:800,h:500,titre:'Carte fictive'},'img-ico':{data:cv(64,64,'','','image/png'),w:64,h:64},'img-photo':{data:cv(600,400,'#555577','PHOTO','image/jpeg'),w:600,h:400},
      'img-couv':{data:cv(500,1000,'#7a4b2a','COUV','image/jpeg'),w:500,h:1000},'img-logo':{data:cv(300,120,'#eb6834','LOGO','image/jpeg'),w:300,h:120},'img-webp':{data:cv(240,160,'#1f6fd0','WEBP','image/webp'),w:240,h:160},
      'img-bad':{data:'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAAB',w:10,h:10},
      'img-svg':{data:'data:image/svg+xml;base64,'+btoa('<svg xmlns="http://www.w3.org/2000/svg" width="200" height="100"><rect width="200" height="100" fill="#8a3b9e"/><circle cx="100" cy="50" r="30" fill="#fff"/><script>alert(3)</script></svg>'),w:200,h:100}};
    if(big)for(let i=0;i<10;i++)im['big-'+i]={data:cv(1200,800,['#2f6f4f','#7a4b2a','#1f6fd0','#555577','#8a3b9e'][i%5],'IMAGE '+(i+1),'image/jpeg'),w:1200,h:800};return im;},!!big);
  const LIB={kind:'memlib',req:{none:true},title:'Mémoire technique : bibliothèque de blocs SCR',blocs,style:STYLE,images,version:1,at:'2026-10-14T00:00:00.000Z',by:'Test'};
  await page.evaluate(([row,acc])=>new Promise((res,rej)=>{localStorage.clear();localStorage.setItem('trace:wide','1');localStorage.setItem('trace:accounts',JSON.stringify(acc));const r=indexedDB.open('trace-kv',1);r.onupgradeneeded=()=>{r.result.createObjectStore('kv');};r.onerror=()=>rej(r.error);
    r.onsuccess=()=>{const db=r.result;const t=db.transaction('kv','readwrite');const st=t.objectStore('kv');st.put({memlib:{id:'memlib',data:row,updated_at:new Date().toISOString()}},'trace:reg:doc');st.delete('trace:reg:entdoc');t.oncomplete=()=>{db.close();res();};t.onerror=()=>rej(t.error);};}),[LIB,FAKE4_ACCOUNTS]);
  await page.reload();await page.waitForTimeout(1200);{const s=await page.$('#loginSkip');if(s&&await s.isVisible())await s.click();await page.waitForTimeout(700);}
  await page.evaluate(async([n,nm])=>{const T=window.TRACE;T.state.userId='ethan';T.renderHome();await T.acces.list();document.getElementById('htCom').click();await new Promise(x=>setTimeout(x,250));
    document.querySelector('#eq-app [data-act=af][data-v="new|"]').click();await new Promise(x=>setTimeout(x,150));const set=(id,v)=>{const e=document.getElementById(id);if(e)e.value=v;};set('afn-num',n);set('afn-nom',nm);set('afn-client','CLIENT-TEST');set('afn-ville','Testville');set('afn-sect','ouest');set('afn-etat','devis');
    document.querySelector('#eq-app [data-act=af][data-v="create|"]').click();await new Promise(x=>setTimeout(x,250));T.affaires.set(n,{charge:'Alain Chargé',cdtx:'Cédric Conduite',moe:'BET Fictif'});
    document.querySelector('#eq-app [data-act=af][data-v="tab|memoire"]').click();await new Promise(x=>setTimeout(x,400));},[num,nom]);
  return {ctx,page};}
const NUM='O2610-61';
let {ctx,page}=await open({viewport:{width:1280,height:900}},FAKE_M3_BLOCS,NUM,'Réseau test PDF');
const wait=ms=>page.waitForTimeout(ms);
const click=async v=>{await page.evaluate(v=>{const el=document.querySelector(`#eq-app [data-act=af][data-v="${v}"]`);if(!el)throw new Error('bouton absent '+v);el.click();},v);await wait(250);};
const toast=()=>page.evaluate(()=>(document.getElementById('toast')||{}).textContent||'');
/* clic « ⬇ PDF » → téléchargement ; renvoie {file, name, ms, toasts} */
async function pdfClick(pg,tag,sel){const t0=Date.now();const seen=[];const iv=setInterval(()=>{pg.evaluate(()=>(document.getElementById('toast')||{}).textContent||'').then(t=>{if(t&&!seen.includes(t))seen.push(t);}).catch(()=>{});},150);
  const [dl]=await Promise.all([pg.waitForEvent('download',{timeout:60000}),pg.evaluate(s=>document.querySelector(s).click(),sel||'#eq-app .memoire-head [data-v="mpdf|"]')]);const f=path.join(TMP,tag+'.pdf');await dl.saveAs(f);const ms=Date.now()-t0;
  await pg.waitForTimeout(400);clearInterval(iv);seen.push(await pg.evaluate(()=>(document.getElementById('toast')||{}).textContent||''));return {file:f,name:dl.suggestedFilename(),ms,toasts:seen,info:await pg.evaluate(()=>window.TRACE&&window.TRACE.m3pdf?Object.assign({},window.TRACE.m3pdf()):null)};}
// ── 1) en-tête du mémoire : ⬇ PDF (principal, en premier), ⬇ Word, 🖨 Imprimer, plein écran ; plus de « 🖨 PDF »
let out=await page.evaluate(()=>{const h=document.querySelector('#memoire-card .memoire-head .mem3-exp');return h?{btn:[...h.querySelectorAll('button')].map(b=>(b.dataset.v||'')+':'+b.textContent.trim()),prim:(h.querySelector('[data-v="mpdf|"]')||{}).className||'',old:[...document.querySelectorAll('#eq-app button')].some(b=>b.textContent.trim()==='🖨 PDF')}:null;});
console.log('1) boutons :',JSON.stringify(out));
C.c1=!!out&&out.btn.slice(0,3).join('|')==='mpdf|:⬇ PDF|mword|:⬇ Word|mprint|:🖨 Imprimer'&&/mlbfull/.test(out.btn[3]||'')&&/primary/.test(out.prim)&&!out.old;
// ── 2) un clic → Memoire_technique_<num>.pdf ; « PDF en préparation… » puis « ⬇ Mémoire PDF : n pages »
let R=await pdfClick(page,'memoire');const F=R.file;const head=fs.readFileSync(F).subarray(0,8).toString('latin1');const I=info(F);const N=+I.Pages;shots(F,'memoire_pdf');
out={name:R.name,ms:R.ms,head,pages:N,size:I['Page size'],title:I.Title,toasts:R.toasts};console.log('2) PDF :',JSON.stringify(out));
C.c2=R.name==='Memoire_technique_'+NUM+'.pdf'&&head.startsWith('%PDF-')&&R.toasts.some(t=>/PDF en préparation/.test(t))&&R.toasts.some(t=>new RegExp('⬇ Mémoire PDF : '+N+' pages').test(t));
C.c3=N>=8&&/^595\.2\d? x 841\.8\d? pts \(A4\)/.test(I['Page size']||'')&&/Mémoire technique — O2610-61 Réseau test PDF/.test(I.Title||'');
// ── 3) page de garde : ville, année, n°, titre, affaire, client, date, logo / photo ; ni en-tête ni pied
const p1=txt(F,1),y=String(new Date().getFullYear());const p1img=sh('pdfimages',['-list','-f','1','-l','1',F]).toString().split('\n').slice(2).filter(Boolean).length;
out={p1:p1.replace(/\s+/g,' ').trim(),img:p1img};console.log('3) garde :',JSON.stringify(out));
C.c4=/TESTVILLE/.test(p1)&&p1.includes(y)&&/O2610-61/.test(p1)&&/MÉMOIRE/.test(p1)&&/TECHNIQUE TEST/.test(p1)&&/Réseau test PDF/.test(p1)&&/CLIENT-TEST/.test(p1)&&/\d\d\/\d\d\/\d{4}/.test(p1)&&!/Page 1 \//.test(p1)&&!/Réf\./.test(p1)&&p1img>=3;
// ── 4) sommaire : titre, trous restants, entrées numérotées avec la page ; chaque titre est bien à la page annoncée ; liens internes
const p2=txt(F,2);const toc=tocOf(F);const tbad=tocOk(F,toc,N);
out={som:/SOMMAIRE/.test(p2),trous:/\d+ trous? encore à compléter \(en rouge\)/.test(p2),n:toc.length,first:toc.slice(0,4),bad:tbad};console.log('4) sommaire :',JSON.stringify(out));
const pOf=re=>(toc.find(e=>re.test(e.lab))||{}).p;out.nob=[pOf(/^4\. Garanties/),pOf(/^5\. Annexes/),pOf(/^6\. Moyens/)];
C.c5=out.som&&out.trous&&toc.length>=14&&tbad.length===0&&toc[0].p===3&&toc.some(e=>/^2\.1 /.test(e.lab))&&toc.every((e,i)=>!i||e.p>=toc[i-1].p)&&out.nob[0]===out.nob[1]&&out.nob[2]>out.nob[1]; /* section sans saut (gabarit) : sur la même page que la précédente */
// ── 5) corps : titres numérotés (capitales / petites capitales du gabarit), titre de paragraphe (n.n.n), bandeau d'en-tête, pied « Page 2 / N »
const all=txt(F);const lastP=txt(F,N);
out={h1:/1\. PRÉSENTATION DE L’ENTREPRISE TEST/.test(all),h2:/1\.1 IDENTITÉ/.test(all),h3:/\d\.1\.1 LISTE DU MATÉRIEL|\d\.1\.1 Liste du matériel/.test(all),h4:/ÉTAPE ANNEXE/i.test(all),band:/Réseau test PDF\s+MÉMOIRE TECHNIQUE/.test(p2),foot2:new RegExp('Page 2 / '+N).test(p2),footN:new RegExp('Page '+N+' / '+N).test(lastP),ref:/Réf\. O2610-61 – Testville/.test(p2)};
console.log('5) titres, en-tête, pied :',JSON.stringify(out));
C.c6=Object.values(out).every(Boolean);
// ── 6) texte : trous en rouge (pixels sous « [À COMPLÉTER »), puces carrées couleur du gabarit, tableau (texte + en-tête orange), mises en forme, HSE justifié
const findW=(re,from)=>{for(let p=from||3;p<=N;p++){const ws=words(F,p);const i=ws.findIndex(w=>re.test(w.t));if(i>=0)return {p,w:ws[i],ws,i};}return null;};
const red=findW(/^\[À$/);let redPx={n:0};if(red){const img=ppm(F,red.p,144);const w2=red.ws[red.i+1]||red.w;redPx=px(img,red.w.x0,red.w.y0,w2.x1,w2.y1,(r,g,b)=>r>170&&g<90&&b<90);}
const bul=findW(/^Travaux$/);let bulPx={n:0};if(bul){const img=ppm(F,bul.p,144);bulPx=px(img,bul.w.x0-20,bul.w.y0,bul.w.x0-2,bul.w.y1,near(rgb('#AA0011'),40));}
const th=findW(/^Matériel$/);let thPx={n:0,t:1};if(th){const img=ppm(F,th.p,144);thPx=px(img,th.w.x0-4,th.w.y0-1,th.w.x1+4,th.w.y1+1,near(rgb('#FF6601'),40));}
const band=(()=>{const img=ppm(F,2,72);return px(img,80,30,500,40,near(rgb('#F15921'),40));})();
const odd=findW(/^Poste$/);let oddPx={n:0,t:1};if(odd){const img=ppm(F,odd.p,144);oddPx=px(img,odd.w.x0-4,odd.w.y0-1,odd.w.x0-1,odd.w.y1+1,near(rgb('#FABF8E'),30));}
const qh=findW(/^QHSE$/);let qhPx={n:0,t:1};if(qh){const img=ppm(F,qh.p,144);qhPx=px(img,qh.w.x0-3,qh.w.y0-1,qh.w.x0-1,qh.w.y1+1,near(rgb('#ED7D31'),30));}
/* HSE justifié : toutes les lignes du paragraphe, sauf la dernière, vont jusqu'à la marge droite */
const hse=(()=>{for(let p=3;p<=N;p++){const ws=words(F,p);const i=ws.findIndex((w,j)=>w.t==='Texte'&&ws[j+1]&&ws[j+1].t==='HSE');if(i>=0)return {p,w:ws[i],ws,i};}return null;})();let just=null; /* début du paragraphe « Texte HSE fictif… » */if(hse){const ws=hse.ws;const y0=hse.w.y0-2;const end=ws.find(w=>w.t==='Port'&&w.y0>y0);const lines={};ws.filter(w=>w.y0>=y0&&(!end||w.y0<end.y0-2)).forEach(w=>{const k=Math.round(w.y0);lines[k]=Math.max(lines[k]||0,w.x1);});
  const xs=Object.keys(lines).map(Number).sort((a,b)=>a-b).map(k=>lines[k]);const R0=595.28-21*72/25.4;just={n:xs.length,right:xs.slice(0,-1).map(x=>Math.round(R0-x)),last:Math.round(R0-xs[xs.length-1])};}
out={red:red&&{p:red.p,n:redPx.n},bul:bul&&{p:bul.p,n:bulPx.n},th:th&&{p:th.p,r:+(thPx.n/thPx.t).toFixed(2)},band:+(band.n/band.t).toFixed(2),tab:/Poste de soudage test\s+4\s+Soudage des tubes/.test(all)&&/Total fictif\s+9 éléments/.test(all),
  odd:+(oddPx.n/oddPx.t).toFixed(2),qhse:+(qhPx.n/qhPx.t).toFixed(2),just,orga:/Pôle administratif test/.test(all)&&/CHARGÉ Alain/.test(all)&&/alain\.charge@exemple\.test/.test(all)&&/Supervision générale \(fictif\)/.test(all)&&/\[À COMPLÉTER : Chef d’équipe\]/.test(all),
  lit:/Balises écrites telles quelles : <script>alert\(1\)<\/script> et <b>pas en gras<\/b>\./.test(txt(F,0,false).replace(/\s+/g,' ')),
  ol:/1\.\s+Première étape fictive/.test(all)&&/3\.\s+Troisième étape fictive/.test(all),fmt:/l’apostrophe & la légende «\s?test\s?» – fin\./.test(all)&&/12 m\s?3/.test(txt(F,0,false))&&/H\s?2\s?O/.test(txt(F,0,false)),hole:/\[À COMPLÉTER : point fictif A\]/.test(txt(F,0,false))};
console.log('6) texte, puces, tableau :',JSON.stringify(out));
C.c7=!!red&&redPx.n>=20&&!!bul&&bulPx.n>=6&&!!th&&thPx.n/thPx.t>0.3&&band.n/band.t>0.6&&out.tab&&out.ol&&out.fmt&&out.hole&&out.odd>0.6&&out.qhse>0.6&&out.orga&&out.lit
  &&!!just&&just.n>=4&&just.right.every(d=>Math.abs(d)<=1.5)&&just.last>20;
// ── 7) images (pdfimages : garde, logo, carte, icône, WebP converti ; l'illisible est remplacée par un message), Carlito incorporée (pdffonts)
const il=sh('pdfimages',['-list',F]).toString().split('\n').slice(2).filter(Boolean).map(l=>l.trim().split(/\s+/));const uniq=new Set(il.filter(x=>x[2]==='image').map(x=>x[10])).size;const fonts=sh('pdffonts',[F]).toString();
out={dialogs,svg:/Schéma SVG converti/.test(all),n:il.length,uniq,types:[...new Set(il.map(x=>x[2]+'/'+x[5]))],illisible:/Image « img-bad » illisible/.test(all),webp:/Image WebP convertie/.test(all),fonts:fonts.split('\n').slice(2).filter(Boolean).map(l=>l.split(/\s+/)[0]+' '+l.split(/\s+/).slice(-5,-3).join(' '))};
console.log('7) images et polices :',JSON.stringify(out));
C.c8=uniq>=6&&out.svg&&dialogs===0&&out.illisible&&out.webp&&/Carlito-Regular yes yes/.test(out.fonts.join('|'))&&/Carlito-Bold yes yes/.test(out.fonts.join('|'))&&/Carlito-Italic yes yes/.test(out.fonts.join('|'))&&fonts.split('\n').slice(2).filter(Boolean).every(l=>/Carlito/.test(l));
// ── 8) Word et impression gardés (⬇ Word → .docx ; 🖨 Imprimer → fenêtre d'impression paginée)
let [dlw]=await Promise.all([page.waitForEvent('download'),click('mword|')]);const zw=unzipSync(new Uint8Array(fs.readFileSync(await dlw.path())));
const [pop]=await Promise.all([page.waitForEvent('popup'),click('mprint|')]);await pop.waitForLoadState().catch(()=>{});for(let i=0;i<30;i++){await pop.waitForTimeout(200);if(await pop.evaluate(()=>!!document.documentElement.dataset.paged).catch(()=>false))break;}
out={word:dlw.suggestedFilename(),doc:!!zw['word/document.xml'],print:await pop.evaluate(()=>+document.documentElement.dataset.paged||0).catch(()=>0)};await pop.close().catch(()=>{});console.log('8) Word et impression :',JSON.stringify(out));
C.c9=out.word==='Memoire_technique_'+NUM+'.docx'&&out.doc&&out.print>=6;
// ── 9) hors connexion, moteur et polices déjà chargés : le PDF se fait quand même
await ctx.setOffline(true);R=await pdfClick(page,'horsligne');await ctx.setOffline(false);out={name:R.name,pages:+info(R.file).Pages,ms:R.ms};console.log('9) hors connexion :',JSON.stringify(out));
C.c10=R.name==='Memoire_technique_'+NUM+'.pdf'&&out.pages===N;
// ── 10) dossier de remise (.zip) : le mémoire y est en PDF ; la ligne dit « (PDF) »
await click('tab|offre');await wait(400);
out={sub:await page.evaluate(()=>{const r=document.querySelector('#dob-offre .dob-row[data-key="p:memoire"]');return r?r.textContent.replace(/\s+/g,' ').trim():'';}),btn:await page.evaluate(()=>!!document.querySelector('#eq-app [data-v="mpdf|"]'))};
const [dlz]=await Promise.all([page.waitForEvent('download',{timeout:60000}),click('obzip|')]);const Z=unzipSync(new Uint8Array(fs.readFileSync(await dlz.path())));const zpdf=Object.keys(Z).find(k=>/Memoire_technique_O2610-61\.pdf$/.test(k));
out.files=Object.keys(Z).sort();out.pdf=zpdf&&strFromU8(Z[zpdf].subarray(0,5));out.docx=Object.keys(Z).some(k=>/Memoire.*\.docx?$/.test(k));out.bord=/Memoire_technique_O2610-61\.pdf/.test(strFromU8(Z['00_Bordereau_des_pieces.html']||new Uint8Array()));
console.log('10) dossier de remise :',JSON.stringify(out));
C.c11=/généré depuis 5 · Mémoire \(PDF\)/.test(out.sub)&&out.btn&&!!zpdf&&/^03_Pieces_produites\//.test(zpdf)&&out.pdf==='%PDF-'&&!out.docx&&out.bord;
// ── 11) repli : moteur introuvable dans l'appli (404) et moteur ALTÉRÉ sur jsDelivr → refusé par son empreinte SRI → message clair + fenêtre d'impression ;
//    puis jsDelivr authentique (moteur absent de l'appli, polices servies par l'appli) → le PDF se fait, empreinte acceptée ; puis l'appli revient
await ctx.close();({ctx,page}=await open({viewport:{width:1280,height:900}},FAKE_M3_BLOCS,NUM,'Réseau test PDF'));
allow=/Failed to load resource|404|net::ERR|integrity|digest/i;let vendor404=true,genuine=false;
await page.route(/\/vendor\/pdfmake-0\.2\.23\.min\.js$/,r=>vendor404?r.fulfill({status:404,contentType:'text/plain',body:'absent'}):r.continue());
const cdnFile=u=>/pdfmake@0\.2\.23\/build\/pdfmake\.min\.js$/.test(u)?path.join(PUB,'vendor','pdfmake-0.2.23.min.js'):(/carlito@[0-9a-f]{40}\/fonts\/ttf\/(Carlito-[A-Za-z]+\.ttf)$/.exec(u)||[])[1]?path.join(PUB,'fonts',/(Carlito-[A-Za-z]+\.ttf)$/.exec(u)[1]):null;
await page.route(u=>u.hostname==='cdn.jsdelivr.net',r=>{const f=cdnFile(r.request().url());if(!f)return r.abort();let body=fs.readFileSync(f);if(!genuine&&/\.js$/.test(f))body=Buffer.concat([body,Buffer.from('\n// fichier altéré\n')]);
  r.fulfill({status:200,headers:{'Access-Control-Allow-Origin':'*'},contentType:/\.js$/.test(f)?'application/javascript':'font/ttf',body});});
const [pop2]=await Promise.all([page.waitForEvent('popup',{timeout:30000}),page.evaluate(()=>document.querySelector('#eq-app .memoire-head [data-v="mpdf|"]').click())]);await pop2.waitForLoadState().catch(()=>{});await page.waitForTimeout(1600);
out={modal:await page.evaluate(()=>(document.getElementById('m3-pdf-err')||{}).textContent||''),toast:await toast(),popup:await pop2.evaluate(()=>!!document.querySelector('#flow')).catch(()=>false),loaded:await page.evaluate(()=>!!window.pdfMake)};await pop2.close().catch(()=>{});
await page.evaluate(()=>{const b=document.querySelector('#modal [data-close]');if(b)b.click();});
/* dossier de remise pendant que le PDF est impossible : le mémoire y part en Word (.docx), avec un message */
await click('tab|offre');await wait(400);const [dlz2]=await Promise.all([page.waitForEvent('download',{timeout:60000}),click('obzip|')]);const Z2=unzipSync(new Uint8Array(fs.readFileSync(await dlz2.path())));await wait(300);
out.zip={files:Object.keys(Z2).filter(k=>/Memoire/.test(k)),note:await page.evaluate(()=>(window.TRACE.docsOblig.lastZip()||{}).memNote||''),toast:await toast()};
genuine=true;R=await pdfClick(page,'cdn','#eq-app [data-v="mpdf|"]');out.cdn={name:R.name,src:R.info&&R.info.src,fsrc:R.info&&R.info.fsrc,italic:R.info&&R.info.italic,pages:+info(R.file).Pages,fonts:(sh('pdffonts',[R.file]).toString().match(/Carlito-[A-Za-z]+/g)||[]).sort().join()};
vendor404=false;R=await pdfClick(page,'apres_repli','#eq-app [data-v="mpdf|"]');out.after=R.name;allow=null;
console.log('11) repli :',JSON.stringify(out));
C.c12=/PDF direct impossible \(moteur PDF non chargé : fichier vendor\/pdfmake-0\.2\.23\.min\.js introuvable\)/.test(out.modal)&&/PDF direct impossible/.test(out.toast)&&out.popup&&!out.loaded
  &&out.zip.files.length===1&&/^03_Pieces_produites\/\d\d_Memoire_technique_O2610-61\.docx$/.test(out.zip.files[0])&&/mémoire en Word \(\.docx\) : PDF impossible \(moteur PDF non chargé/.test(out.zip.note)&&/PDF impossible/.test(out.zip.toast)
  &&out.cdn.name==='Memoire_technique_'+NUM+'.pdf'&&out.cdn.src==='cdn'&&out.cdn.fsrc==='appli'&&out.cdn.italic===true&&out.cdn.fonts==='Carlito-Bold,Carlito-BoldItalic,Carlito-Italic,Carlito-Regular'&&out.cdn.pages===N&&out.after==='Memoire_technique_'+NUM+'.pdf';
await ctx.close();
// ── 12) grosse bibliothèque : 300 paragraphes + 10 images → moins de 15 s ; sommaire juste ; aucun titre seul en bas de page
({ctx,page}=await open({viewport:{width:1280,height:900}},bigBlocs(300,10),'O2610-62','Gros mémoire test',true));
const nP=await page.evaluate(()=>{const b=document.querySelectorAll('#memoire-stats .ac-stat b')[1];return b?b.textContent:'';});R=await pdfClick(page,'gros');const NB=+info(R.file).Pages;shots(R.file,'gros_pdf');
const tocB=tocOf(R.file);const tbB=tocOk(R.file,tocB,NB);const orph=orphans(R.file,NB,/^\d+\.\d+(\.\d+)? (BLOC|POINT|Point|Bloc)/);const imgsB=new Set(sh('pdfimages',['-list',R.file]).toString().split('\n').slice(2).filter(Boolean).map(l=>l.trim().split(/\s+/)).filter(x=>x[2]==='image').map(x=>x[10])).size;
out={paras:nP,ms:R.ms,gen:R.info&&R.info.ms,pages:NB,toc:tocB.length,bad:tbB,orphans:orph,images:imgsB};console.log('12) gros mémoire :',JSON.stringify(out));
C.c13=/^300 \/ 300/.test(nP)&&R.ms<15000&&NB>=40&&tocB.length===40&&tbB.length===0&&orph.length===0&&imgsB>=12;
await ctx.close();
// ── 12 bis) bibliothèque « piège » (66 petits blocs titrés) : des sauts sont forcés avant des titres, et aucun titre ne reste seul en bas de page ; aucune légende
//    seule en haut de page
({ctx,page}=await open({viewport:{width:1280,height:900}},trapBlocs(3),'O2610-64','Mémoire piège test'));R=await pdfClick(page,'piege');const NT=+info(R.file).Pages;const tocT=tocOf(R.file);
const orphT=orphans(R.file,NT,/^\d+\.\d+(\.\d+)? \D/,tocT.length?tocT[0].p:3);const capT=[];for(let p=3;p<=NT;p++){const ws=words(R.file,p).filter(w=>w.y0>60&&w.y0<770);if(!ws.length)continue;const y0=Math.min(...ws.map(w=>w.y0));const first=ws.filter(w=>Math.abs(w.y0-y0)<2).map(w=>w.t).join(' ');if(y0<90&&/^Image fictive/.test(first))capT.push(p);}
out={pages:NT,breaks:R.info&&R.info.breaks,ms:R.ms,toc:tocT.length,bad:tocOk(R.file,tocT,NT),orphans:orphT,captions:capT};console.log('12 bis) titres jamais seuls :',JSON.stringify(out));
C.c15=out.breaks>=3&&orphT.length===0&&capT.length===0&&out.bad.length===0&&tocT.length===69;
await ctx.close();
// ── 13) téléphone (390 px) : boutons d'export ≥ 34 px, rien ne déborde, ⬇ PDF marche
({ctx,page}=await open({viewport:{width:390,height:844},isMobile:true,hasTouch:true,deviceScaleFactor:2},FAKE_M3_BLOCS,'O2610-63','Réseau tel'));
out=await page.evaluate(()=>{const bs=[...document.querySelectorAll('#memoire-card .memoire-head button')];return {h:bs.map(b=>Math.round(b.getBoundingClientRect().height)),right:Math.max(...bs.map(b=>b.getBoundingClientRect().right)),sw:document.documentElement.scrollWidth,iw:window.innerWidth};});
if(SHOTS){fs.mkdirSync(SHOTS,{recursive:true});await page.evaluate(()=>document.querySelector('#memoire-card').scrollIntoView());await page.screenshot({path:path.join(SHOTS,'tel_boutons.png')});}
R=await pdfClick(page,'tel');out.name=R.name;out.sw2=await page.evaluate(()=>document.documentElement.scrollWidth);console.log('13) téléphone :',JSON.stringify(out));
C.c14=out.h.length>=4&&out.h.every(h=>h>=34)&&out.right<=out.iw+1&&out.sw<=out.iw&&out.sw2<=out.iw&&out.name==='Memoire_technique_O2610-63.pdf';
await ctx.close();
C.console=logs.length===0;
const bad=Object.entries(C).filter(([k,v])=>!v).map(([k])=>k);console.log(bad.length?'RESULTAT: ECHEC '+bad.join(','):'RESULTAT: TOUT VERT');console.log(logs.length?logs:'[]');
await browser.close();try{fs.rmSync(TMP,{recursive:true,force:true});}catch(e){}
