// LOT DZ (17/10) — les installations communes ventilées PAR ZONE dans le DPGF, « ⇶ sa part » d'un poste tout pointé, la quantité d'une ligne insérée, le bandeau
// des documents administratifs. Ethan (17/10) : « je calcule une nouvelle ligne avec des quantités en plus, mais je ne trouve pas comment lui imputer des lignes qui
// ont déjà été pointées au max […] les installations, on peut les ventiler selon les zones selon plusieurs critères, mais du coup après, dans le remplissage du DPGF,
// il ne faut pas que ce soit juste imputable au ml […] il faut que ces prix-là ventilés apparaissent dans cet outil dans chaque zone ».
// Données 100 % FICTIVES : test/fixture_prix.xlsx, test/fixture_dpgf_suivi.xlsx, test/fixture_dpgf_zone_avant.json (make_fixture_dpgfzone_avant.mjs : le même DPGF pointé
// avec le build d'avant ce lot — installations communes ventilées aux jours d'équipe, réparties au ml de TOUTES les lignes par « Mettre le reste au ml ») ; 3 zones aux
// noms fictifs (dpgf_zone_setup.mjs) ; documents administratifs : fichiers PDF fictifs, serveur Supabase simulé.
// c1 le DPGF d'avant s'ouvre et se calcule comme avant (mêmes PU, liens intacts), sans fausse alerte · c2 le calculateur : récapitulatif des installations, un sous-bloc
// par zone · c3 la liste (« ventilation par zone à refaire », aperçu des PU) et le récap (par poste, à vérifier) · c4 « ↻ Reventiler » : chaque zone = sa part, total
// inchangé, forfait intact, un seul ↶, ↷ · c5 « ✓ Rien à faire », puis « ↻ Reventiler » depuis le calculateur · c6 ventilation « en % » au chiffrage → « la ventilation
// par zone a changé » → « ↻ Reventiler » · c7 soudures DN 80 en plus + ligne insérée : quantité tapée sur l'autre écran APRÈS l'ouverture du calculateur → reprise ;
// message quand elle manque · c8 « ⇶ sa part » des installations tout pointées de la zone (sélection gardée « ⇶ leurs parts ») → « Mettre » : donneuses de la zone
// seulement, total inchangé, un seul ↶ · c9 « ⇶ Donner sa part » du lot DK : la part de la zone (zs) · c10 « Prendre les installations de toutes les zones » (ligne au
// forfait), « ⇶ Mettre le reste au ml » par zone, une zone sans ligne, orphelins · c11 le récap · c12 consultation d'une version : lecture seule · c13 téléphone 390 px
// · c14 le bandeau des documents (en cours d'envoi → disparaît ; conseil SQL seulement sur « registre inconnu » ; au-delà de 30 s : la connexion) · console.
// Captures : SHOTS (défaut /root/work/dz_shots).
import { chromium } from 'playwright';
import fs from 'fs';import path from 'path';import {fileURLToPath} from 'url';
import {cles} from './dpgf_cles.mjs';
import {setupZoneAffaire,NUM} from './dpgf_zone_setup.mjs';
const HERE=path.dirname(fileURLToPath(import.meta.url));
const BASE=process.env.BASE||'http://localhost:8765';const SHOTS=process.env.SHOTS||'/root/work/dz_shots';try{fs.mkdirSync(SHOTS,{recursive:true});}catch(e){}
const browser=await chromium.launch({headless:true, executablePath: process.env.CHROMIUM_PATH||undefined});
const ctx=await browser.newContext({viewport:{width:1366,height:768},acceptDownloads:true});const page=await ctx.newPage();
const logs=[];const watch=p=>{p.on('pageerror',e=>logs.push('PAGEERROR: '+e.message.slice(0,300)));p.on('console',m=>{if(m.type()==='error'&&!/supabase|Failed to fetch|net::ERR|404|WebSocket|pdf\.worker|cdnjs/i.test(m.text()))logs.push(m.text().slice(0,200));});p.on('dialog',d=>d.accept().catch(()=>{}));};watch(page);
const C={};const sp=t=>String(t||'').replace(/[\s  ]+/g,' ').trim();
const nbv=t=>{const x=parseFloat(String(t||'').replace(/[\s  €]/g,'').replace(/[−–]/g,'-').replace(',','.'));return isFinite(x)?x:NaN;};
const S0=await setupZoneAffaire(page,BASE+'/index.html',HERE,{chiffrage:false});const {chg,click,td,A,wait}=S0;
const has=v=>page.evaluate(v=>!!document.querySelector(`#eq-app [data-act=af][data-v="${v}"]`),v);
const rect=s=>page.evaluate(s=>{const e=document.querySelector(s);if(!e)return null;const b=e.getBoundingClientRect();return {l:Math.round(b.left),t:Math.round(b.top),r:Math.round(b.right),b:Math.round(b.bottom),w:Math.round(b.width),h:Math.round(b.height)};},s);
const hideToast=(p,h)=>p.evaluate(h=>{const t=document.getElementById('toast');if(t)t.style.visibility=h?'hidden':'';},h).catch(()=>{}); /* les captures sans le message du bas */
const shot=async(name,p)=>{p=p||page;await hideToast(p,true);try{await p.screenshot({path:path.join(SHOTS,name)});}catch(e){console.log('(capture '+name+' : '+e.message.slice(0,80)+')');}await hideToast(p,false);};
const shotEl=async(name,sel,p)=>{p=p||page;await hideToast(p,true);try{const el=await p.$(sel);if(el)await el.screenshot({path:path.join(SHOTS,name)});else console.log('(capture '+name+' : '+sel+' absent)');}catch(e){console.log('(capture '+name+' : '+e.message.slice(0,80)+')');}await hideToast(p,false);};
const toast=()=>page.evaluate(()=>{const t=document.getElementById('toast');return t?t.textContent:'';});
const popShots=async(fn)=>{const [pp]=await Promise.all([ctx.waitForEvent('page'),click('dxpop|')]);watch(pp);await page.setViewportSize({width:1366,height:1024});await page.evaluate(()=>window.scrollTo(0,0));await wait(1200);
  try{await fn();}finally{await page.setViewportSize({width:1366,height:768});await pp.evaluate(()=>document.querySelector('[data-v="dxpopclose|"]').click()).catch(()=>{});await wait(800);}}; /* le DPGF sur l'autre écran (comme Ethan) : ici le calculateur sur toute la hauteur (écran de 1366 × 1024) */
const toDpgf=async()=>{await click('tab|offre');await click('tab|dpgf');await page.waitForSelector('#dx-vp',{timeout:15000});await wait(900);};
const shut=async()=>{if(await page.evaluate(()=>/\bflt\b/.test((document.querySelector('#dx-card .dx-split')||{}).className||'')))await click('dxrpshut|');};
const gridTop=async()=>{await page.evaluate(()=>{document.getElementById('dx-card').scrollIntoView({block:'start'});});await wait(250);};
const chif=async fn=>{await click('tab|chiffrage');await fn();await toDpgf();};
const band=async()=>sp(await page.$eval('#c3-band',e=>e.textContent).catch(()=>''));
const cellPu=async r=>nbv(await page.evaluate(s=>{const e=document.querySelector(s);return e?e.textContent:'';},td(r,5)));
const openCalc=async r=>{await shut();await gridTop();await page.click(td(r,5));await wait(700);};
const its=()=>page.evaluate(()=>[...document.querySelectorAll('#c3-dlg .c3-it')].map(x=>({k:x.dataset.k,nm:x.querySelector('.c3-in').textContent.trim(),t:x.querySelector('.c3-is').textContent.replace(/[\s  ]+/g,' ').trim(),pu:((x.querySelector('.c3-pu')||{}).textContent||'').replace(/[\s  ]+/g,' ').trim(),b:[...x.querySelectorAll('.c3-acts [data-v]')].map(b=>b.dataset.v),bt:[...x.querySelectorAll('.c3-acts [data-v]')].map(b=>b.textContent.trim())})).map(x=>Object.assign(x,{kind:(x.b[0]||'').split('|').pop()})));
const small=(sel,min)=>page.$$eval(sel,(L,min)=>L.filter(b=>b.offsetParent&&b.getBoundingClientRect().height<min).map(b=>(b.textContent||b.dataset.dz||b.type||'').trim().slice(0,24)),min);
const overflow=sel=>page.evaluate(s=>{const c=document.querySelector(s);if(!c)return ['absent'];return [...c.querySelectorAll('*')].filter(e=>{const r=e.getBoundingClientRect();return e.offsetParent&&r.width>0&&(r.right>window.innerWidth+1||r.left<-1);}).map(e=>e.className||e.tagName).slice(0,5);},sel);
const jd=a=>JSON.stringify(a.dpgf.liens);const lk=(a,ad)=>(a.dpgf.liens||[]).find(L=>L.a===ad);
// ── le DPGF pointé avec le build d'avant (fixture) : chiffrage (zones avec leurs ids) et DPGF (liens, répartition, suivi) repris tels quels
const REC=JSON.parse(fs.readFileSync(path.join(HERE,'fixture_dpgf_zone_avant.json'),'utf8'));
await page.evaluate(([n,R])=>{const T=window.TRACE.affaires;const a=T.get(n);T.set(n,{chiffrage:R.chiffrage,chiffrageV:R.chiffrageV,dpgf:Object.assign({},a.dpgf,R.dpgf)});},[NUM,REC]);
const {K,U}=await cles(page,NUM);
/* contrôle indépendant : la ventilation du chiffrage (prix.js : C.inst.ventil), le prix de vente de chaque installation, ce que chaque zone porte (une part avec zs : sa zone ;
   sans zs : la zone des soudures / manchons de sa ligne, sinon au prorata de la ventilation) */
const info=()=>page.evaluate(n=>{const T=window.TRACE.affaires;const Cc=T.calc(T.get(n));const I=Cc.inst;const P=I.ventil.parts;const S=P.reduce((s,x)=>s+x,0);const ml=Cc.ml||0;const posts={};
  Object.keys(I.postes).forEach(k=>{if(I.postes[k].achat>0.005){const v=I.postes[k].achat/Cc.coef;posts[k]={amtV:v,puV:ml?v/ml:v/100};}});
  return {sh:P.map(x=>S>0?x/S:1/P.length),posts,toks:Cc.etudes.map(e=>'z:'+e.z.id),names:Cc.etudes.map(e=>e.z.nom),mode:I.ventil.mode,zml:Cc.etudes.map(e=>e.r.ml||0)};},NUM);
const zoneOf=(L,I)=>{const w=I.toks.map(()=>0);let W=0;(L.comps||[]).forEach(x=>{const m=/^(z:[^|]+)\|(soudure|manchons|autoctrl)\|/.exec(x.k);if(!m)return;const i=I.toks.indexOf(m[1]);if(i<0)return;w[i]+=+x.q||0;W+=+x.q||0;});return W>0?w.map(x=>x/W):null;};
const porte=(a,I)=>{const o={};Object.keys(I.posts).forEach(p=>{o[p]=I.toks.map(()=>0);});(a.dpgf.liens||[]).forEach(L=>{const zl=zoneOf(L,I);(L.comps||[]).forEach(x=>{const m=/^inst\|([a-z_]+)$/.exec(x.k);if(!m||!I.posts[m[1]])return;
  const e=(+x.q||0)*I.posts[m[1]].puV;const i=x.zs?I.toks.indexOf(x.zs):-1;(i>=0?I.toks.map((t,j)=>j===i?1:0):(zl||I.sh)).forEach((w,j)=>{o[m[1]][j]+=e*w;});});});return o;};
const part=(I,p,i)=>I.sh[i]*I.posts[p].amtV;
const ecart=(a,I)=>{const P=porte(a,I);let m=0;Object.keys(I.posts).forEach(p=>I.toks.forEach((t,i)=>{m=Math.max(m,Math.abs(P[p][i]-part(I,p,i)));}));return m;};
const instTot=(a,I)=>(a.dpgf.liens||[]).reduce((s,L)=>s+(L.comps||[]).reduce((t,x)=>{const m=/^inst\|([a-z_]+)$/.exec(x.k);return t+(m&&I.posts[m[1]]?(+x.q||0)*I.posts[m[1]].puV:0);},0),0);
const instOf=(L)=>JSON.stringify((L&&L.comps||[]).filter(x=>/^inst\|/.test(x.k)));
const r2=x=>Math.round(x*100)/100;const eur=x=>Math.round(x).toLocaleString('fr-FR').replace(/[\s  ]/g,' ');
// ── c1) le DPGF d'avant s'ouvre et se calcule EXACTEMENT comme avant (mêmes PU, mêmes liens, même ventilation) ; pas de fausse alerte : la référence de la ventilation
//        par zone est prise ce jour-là (suivi.vz) et seul l'écart réel est signalé (« ventilation par zone à refaire », pas « a changé »)
await toDpgf();await wait(600);let a=await A();let I=await info();
let out={cells:await page.evaluate(()=>Object.fromEntries([6,9,10,11,12,13,16,17,18,19,20,23,24,27].map(r=>[r,String((document.querySelector(`#dx-vp td[data-r="${r}"][data-c="5"]`)||{}).textContent||'').replace(/[\s  ]+/g,' ').trim()]))),
  vsum:sp(await page.$eval('#dx-vent .dx-vsum',e=>e.textContent).catch(()=>'')),liens:jd(a)===JSON.stringify(REC.dpgf.liens),reps:JSON.stringify(a.dpgf.reps)===JSON.stringify(REC.dpgf.reps),vz:(a.dpgf.suivi||{}).vz||null,band:await band()};
const noBtn=t=>t.replace(/⇶.*$/,'').trim();const vzOk=!!out.vz&&Object.keys(I.posts).every(p=>I.toks.every((t,i)=>Math.abs((out.vz[p]||{})[t]-part(I,p,i))<0.02));
console.log('c1) compatibilité :',JSON.stringify({cells:out.cells,vsum:out.vsum,liens:out.liens,reps:out.reps,vzOk,band:out.band,mode:I.mode,sh:I.sh}));
C.c1=JSON.stringify(out.cells)===JSON.stringify(REC.disp.cells)&&noBtn(out.vsum)===noBtn(REC.disp.vsum)&&out.liens&&out.reps&&vzOk&&I.mode==='mo'&&/^⚠ ?Installations par zone : 1 changement à traiter ?Installations : ventilation par zone à refaire ?Voir la liste$/.test(out.band);
// ── c2) le calculateur sur 2.4 (Secteur Bêta : beaucoup de soudures, peu de ml → sous-pointé) : le récapitulatif en tête (total, mode, zones en puces, écarts,
//        « ↻ Reventiler »), plus de cases dans « 🏗 Installations » ; chaque zone a son sous-bloc (part, %, € / ml de la zone, pointé) ; les installations sont toutes
//        pointées (au ml de toutes les lignes) : la case de Bêta est barrée — « il manque … à la zone, portés par d'autres zones » (la cocher pointerait l'installation
//        au-delà de 100 %) — et renvoie à « ↻ Reventiler » ; cocher la part d'une zone = ml de la ligne × € / ml de la zone : en c10 (une installation pas encore pointée)
await openCalc(12);
out=await page.evaluate(()=>{const sp=t=>String(t||'').replace(/[\s  ]+/g,' ').trim();const h=document.querySelector('#dx-calc .dz-head');const g=document.querySelector('#dx-calc .c3-g[data-g="inst"]');
  return {head:h?sp(h.querySelector('.dz-ht').textContent):'',chips:h?[...h.querySelectorAll('.dz-chip')].map(x=>sp(x.textContent)+'|'+x.dataset.v):[],gap:h?sp((h.querySelector('.dz-gap')||{}).textContent):'',
    instCk:g?g.querySelectorAll('input[data-dx="ck"],input[data-dz="ck"]').length:-1,headFirst:!!g&&g===document.querySelector('#dx-calc .c3-g'),
    zb:[...document.querySelectorAll('#dx-calc .c3-g')].filter(x=>x.querySelector('.dz-zb')).map(x=>({g:x.dataset.g,first:x.querySelector('.c3-gb>.c3-ci')===x.querySelector('.dz-zb').parentElement,h:sp(x.querySelector('.dz-zh').textContent),
      rows:[...x.querySelectorAll('.dz-r')].map(r=>({k:r.dataset.k,t:sp(r.querySelector('.c2-nm').textContent),m:sp(r.querySelector('.m').textContent),dn:sp((r.querySelector('.c2-dn')||{}).textContent),dis:r.querySelector('input').disabled,done:r.classList.contains('c2-done')}))}))};});
const zb=g=>out.zb.find(x=>x.g===g)||{rows:[]};const tB=I.toks[1];const shB=I.sh[1];
const rowB=zb(tB).rows.find(r=>/Contener/.test(r.t));out.rowB=rowB;
await popShots(async()=>{await click('dxc3go|inst');await wait(1400);await shot('pc_1366_calculateur_installations_par_zone.png'); /* la puce « 🏗 Installations » amène le récapitulatif sous l'en-tête du calculateur */
  await click('dxc3go|'+encodeURIComponent(I.toks[1]));await wait(1400);await shot('pc_1366_calculateur_sous_bloc_zone.png');});await openCalc(12);
const restB=(()=>{const P=porte(a,I);return part(I,'conteneur',1)-P.conteneur[1];})(); /* ce qui manque à Bêta (Contener) */
const rowA=zb(I.toks[0]).rows.find(r=>/Contener/.test(r.t));out.rowA=rowA;
console.log('c2) calculateur :',JSON.stringify(out));
const nm=I.names;
C.c2=/€ ventilés aux jours d'équipe \(soudure \+ manchon\) sur 3 zones/.test(out.head)&&out.chips.length===3&&out.chips.every((c,i)=>c.startsWith(nm[i])&&c.endsWith('|dxc3go|'+encodeURIComponent(I.toks[i])))
  &&/⚠ \+/.test(out.chips[0])&&/il manque /.test(out.chips[1])&&/Le DPGF ne les porte pas comme ventilé au chiffrage/.test(out.gap)&&nm.every(n=>out.gap.includes(n+' : '))&&/↻ Reventiler les installations par zone$/.test(out.gap)
  &&out.instCk===0&&out.headFirst&&out.zb.length===3&&out.zb.every(z=>z.first&&/^🏗 Installations de la zone · ventilées aux jours d'équipe · /.test(z.h)&&z.rows.length===3)
  &&!!rowB&&!rowB.dis&&rowB.done&&/^🏗 Contener - Benne - Pelle/.test(rowB.t) /* 19/10 (lot DY) : sur une ligne au ml, la case reste cochable (« prendre au prorata de mes ml », le manque est repris) */&&rowB.t.includes('part de la zone '+String(Math.round(shB*100)))&&/€ \/ ml de la zone \(250 ml\)/.test(rowB.t)&&!/reste /.test(rowB.t)&&Math.abs(nbv(rowB.m)-part(I,'conteneur',1))<1
  &&restB>100&&/^il manque [\d ]+ € à la zone, portés par d'autres zones : « ↻ Reventiler » en haut du calculateur — coche : ta part au prorata de tes ml, reprise sur les lignes des zones qui en portent trop, au prorata de ce qu'elles portent$/.test(rowB.dn)&&Math.abs(nbv((/il manque ([\d ]+) €/.exec(rowB.dn)||[])[1])-restB)<1
  &&!!rowA&&rowA.done&&/^⚠ la zone porte [\d ]+ € de plus que sa part : « ↻ Reventiler » en haut du calculateur · lignes 2\.1, 2\.2, 2\.3/.test(rowA.dn)&&!/pointé au-delà/.test(rowA.t);
// ── c3) la liste des changements : « Installations : ventilation par zone à refaire » (zone par zone : portés pour ventilés), aperçu des PU, « ↻ Reventiler »
//        et « ✓ Rien à faire » ; le récap : par poste (ventilation par zone), « À vérifier » (zones sur- ou sous-pointées)
await shut();await click('dxc3list|');await wait(600);let L3=await its();const it3=L3.find(x=>x.k==='vzgap:inst');
await shot('pc_1366_liste_ventilation_a_refaire.png');await click('dxc3close|');
await click('dxdkrecap|');await wait(500);await click('dxdktab|chk');await wait(300);out={chk:sp(await page.$eval('#dk-body',e=>e.innerText).catch(()=>'')),rev:await page.evaluate(()=>!!document.querySelector('#dk-dlg [data-v="dxdzrev|"]'))};
await click('dxdktab|poste');await wait(300);await click('dxdktg|'+encodeURIComponent('c:inst|conteneur'));await wait(300);out.poste=sp(await page.$eval('#dk-body',e=>e.innerText).catch(()=>''));await click('dxdkclose|');
console.log('c3) liste et récap :',JSON.stringify({it3,L:L3.length,chk:out.chk.slice(0,400),rev:out.rev,poste:out.poste.slice(Math.max(0,out.poste.search(/ventilation par zone/i)-10),out.poste.search(/ventilation par zone/i)+500)}));
C.c3=!!it3&&L3.length===1&&it3.nm==='Installations : ventilation par zone à refaire'&&nm.every(n=>it3.t.includes(n+' : '))&&/portés pour [\d ]+ € ventilés/.test(it3.t)&&/les lignes au forfait ne bougent pas/.test(it3.t)
  &&['2.1','2.2','2.3','2.4','2.5'].every(n=>new RegExp(n.replace('.','\\.')+' [\\d ,]+ → [\\d ,]+ €').test(it3.pu))&&!/1\.1 /.test(it3.pu)&&it3.b.join()==='dxc3do|vzgap%3Ainst|revent,dxc3do|vzgap%3Ainst|ok'&&it3.bt[0]==='↻ Reventiler les installations par zone'
  &&/Installations : zones sur- ou sous-pointées/.test(out.chk)&&/pointé au-delà de/.test(out.chk)&&/il manque/.test(out.chk)&&out.rev&&/Ventilation par zone · aux jours d'équipe/i.test(out.poste)&&nm.every(n=>out.poste.includes(n));
// ── c4) « ↻ Reventiler » (depuis la liste) : chaque zone porte sa part, le total des installations ne bouge pas, la 1.1 (au forfait) non plus, les parts passent en zs,
//        les PU sont ceux de l'aperçu ; un seul ↶ remet tout ; ↷
a=await A();const D0=jd(a);const tot0=instTot(a,I);const e0=ecart(a,I);const L6=instOf(lk(a,'E6'));
const prev=Object.fromEntries([...(it3?it3.pu:'').matchAll(/(\d+\.\d+) [\d ,]+ → ([\d ,]+) €/g)].map(m=>[m[1],nbv(m[2])]));
await click('dxc3list|');await wait(500);await click('dxc3do|vzgap%3Ainst|revent');await wait(800);a=await A();const D1=jd(a);
out={tot:[r2(tot0),r2(instTot(a,I))],e:[r2(e0),r2(ecart(a,I))],L6:instOf(lk(a,'E6'))===L6,zs:['E9','E10','E11','E12','E13'].every(ad=>lk(a,ad).comps.filter(x=>/^inst\|/.test(x.k)).every(x=>x.zs&&I.toks.includes(x.zs))),
  pu:{'2.1':await cellPu(9),'2.2':await cellPu(10),'2.3':await cellPu(11),'2.4':await cellPu(12),'2.5':await cellPu(13)},prev,band:await band(),toast:sp(await toast()),ok:((a.dpgf.suivi||{}).ok||{})['vzgap:inst']||null};
await click('dxundo|');await wait(500);a=await A();out.undo=jd(a)===D0;out.undoBand=await band();await click('dxredo|');await wait(500);a=await A();out.redo=jd(a)===D1;
console.log('c4) reventiler :',JSON.stringify(out));
C.c4=Math.abs(out.tot[0]-out.tot[1])<0.02&&out.e[0]>100&&out.e[1]<0.05&&out.L6&&out.zs&&Object.keys(out.prev).length===5&&Object.keys(out.prev).every(n=>Math.abs(out.pu[n]-out.prev[n])<0.006)&&out.band===''&&/Traité : Installations : ventilation par zone à refaire/.test(out.toast)&&/5 PU réécrits/.test(out.toast)&&!out.ok
  &&out.undo&&/ventilation par zone à refaire/.test(out.undoBand)&&out.redo;
// ── c5) « ✓ Rien à faire » : l'élément disparaît, mais l'écart reste visible (calculateur, récap « à vérifier » : marqué) ; « ↻ Reventiler » du calculateur rouvre
//        l'élément dans la liste (aperçu) ; on reventile
await click('dxundo|');await wait(500);await click('dxc3list|');await wait(500);await click('dxc3do|vzgap%3Ainst|ok');await wait(600);a=await A();
out={ok:((a.dpgf.suivi||{}).ok||{})['vzgap:inst']||null,band:await band()};await openCalc(12);out.gap=sp(await page.$eval('#dx-calc .dz-gap',e=>e.textContent).catch(()=>''));
await click('dxdkrecap|');await wait(400);await click('dxdktab|chk');await wait(300);out.chk=/marqué « rien à faire »/.test(await page.$eval('#dk-body',e=>e.innerText).catch(()=>''));await click('dxdkclose|');
await click('dxdzrev|');await wait(600);L3=await its();out.forced=L3.map(x=>x.k).join();await click('dxc3do|vzgap%3Ainst|revent');await wait(800);a=await A();out.after={e:r2(ecart(a,I)),band:await band(),ok:((a.dpgf.suivi||{}).ok||{})['vzgap:inst']||null,dlg:!!await page.$('#c3-dlg')};
console.log('c5) rien à faire :',JSON.stringify(out));
C.c5=!!out.ok&&out.band===''&&/Le DPGF ne les porte pas comme ventilé au chiffrage/.test(out.gap)&&out.chk&&out.forced==='vzgap:inst'&&out.after.e<0.05&&out.after.band===''&&!out.after.ok&&!out.after.dlg;
// ── c6) la ventilation passe « en % » au chiffrage (60 / 25 / 15) : élément « la ventilation par zone a changé » (zone par zone : avant → après), téléphone 390 px
//        (la liste), « ↻ Reventiler » : chaque zone = sa nouvelle part, total inchangé ; la référence suit
const ids=a.chiffrage.etudes.map(z=>z.id);
await chif(async()=>{await click('chview|inst');await chg('#eq-app [data-afx="inst§ventil"]','pct');await chg(`#eq-app [data-afx="inst§pct.${ids[0]}"]`,'60');await chg(`#eq-app [data-afx="inst§pct.${ids[1]}"]`,'25');await chg(`#eq-app [data-afx="inst§pct.${ids[2]}"]`,'15');});
a=await A();const I6=await info();out={band:await band(),sh:I6.sh.map(x=>r2(x)),e:r2(ecart(a,I6)),tot:r2(instTot(a,I6))};await click('dxc3list|');await wait(600);L3=await its();const it6=L3.find(x=>x.k==='vz:inst');out.it6=it6;
await shot('pc_1366_liste_ventilation_changee.png');
await page.setViewportSize({width:390,height:844});await page.evaluate(()=>{document.getElementById('app').classList.remove('wide');});await wait(500);
out.tel={dlg:await rect('#c3-dlg'),small:await small('#c3-dlg button',34),prim:await small('#c3-dlg .c3-acts .btn.primary',40),over:await overflow('#c3-dlg')};await shot('tel_390_liste_reventiler.png');
await page.setViewportSize({width:1366,height:768});await page.evaluate(()=>{document.getElementById('app').classList.add('wide');});await wait(500);
await click('dxc3do|vz%3Ainst|revent');await wait(800);a=await A();out.after={e:r2(ecart(a,I6)),tot:r2(instTot(a,I6)),band:await band(),vz:((a.dpgf.suivi||{}).vz||{}),dlg:!!await page.$('#c3-dlg')};
const vz6=Object.keys(I6.posts).every(p=>I6.toks.every((t,i)=>Math.abs(((out.after.vz||{})[p]||{})[t]-part(I6,p,i))<0.02));
console.log('c6) ventilation en % :',JSON.stringify(Object.assign({},out,{after:Object.assign({},out.after,{vz:vz6})})));
const fromTo=(i,ref)=>new RegExp(I6.names[i].replace(/[()]/g,'\\$&')+' : [\\d ]+ € → [\\d ]+ €').test(ref);
C.c6=/^⚠ ?Installations par zone : 1 changement à traiter ?Installations : la ventilation par zone a changé/.test(out.band)&&JSON.stringify(out.sh)==='[0.6,0.25,0.15]'&&out.e>50&&!!it6&&L3.length===1&&it6.nm==='Installations : la ventilation par zone a changé'&&[0,1,2].every(i=>fromTo(i,it6.t))&&/le DPGF porte encore l'ancienne répartition/.test(it6.t)
  &&it6.b.join()==='dxc3do|vz%3Ainst|revent,dxc3do|vz%3Ainst|ok'&&out.tel.dlg&&out.tel.dlg.w===390&&!out.tel.small.length&&!out.tel.prim.length&&!out.tel.over.length
  &&out.after.e<0.05&&Math.abs(out.after.tot-out.tot)<0.02&&out.after.band===''&&vz6&&!out.after.dlg;
I=I6;
// ── c7) soudures DN 80 en plus dans Secteur Alpha (20 → 30, 300 → 380 ml) ; une ligne insérée sous la 2.3 : 2.6 « Tube pré-isolé DN 80 — extension (essai) », SANS quantité ;
//        le calculateur ouvert dessus : Qté vide → message, « Mettre » grisé et pourquoi ; la quantité tapée dans la grille de l'AUTRE ÉCRAN → le calculateur la reprend
await chif(async()=>{await click('chei|0');await chg('#eq-app [data-afx="e§dn.1.soud"]','30');await chg('#eq-app [data-afx="e§dn.1.ml"]','380');});
/* le linéaire du projet a changé (1 300 → 1 380 ml) : les installations, au ml du projet, sont à rééquilibrer (lot C3, « ↻ Refaire la balance ») ; les 10 soudures DN 80 en plus
   restent à imputer — sur la nouvelle ligne */
I=await info();await shut();await click('dxc3list|');await wait(600);const L7=await its();for(const p of ['amene','conteneur','doe'])if(L7.some(x=>x.k==='inst|'+p)){await click('dxc3do|'+encodeURIComponent('inst|'+p)+'|bal');await wait(600);if(!await page.$('#c3-dlg')){await click('dxc3list|');await wait(500);}}
const L7b=await its();if(await page.$('#c3-dlg'))await click('dxc3close|');a=await A();const e7=r2(ecart(a,I));const kd=L=>L.map(x=>U(x.k)+':'+x.kind+(/EN PLUS/.test(x.t)?'+':'')).join(' ');
await shut();await gridTop();await page.click(td(11,2));await wait(150);await click('dxins|');await wait(400);
await page.keyboard.press('Home');await page.keyboard.type('2.6');await page.keyboard.press('Tab');await page.keyboard.type('Tube pré-isolé DN 80 — extension (essai)');await page.keyboard.press('Tab');await page.keyboard.type('ml');await page.keyboard.press('Enter');await wait(500);
a=await A();out={l12:a.dpgf.lignes.find(l=>l.row===12)};await openCalc(12);
out.open=await page.evaluate(()=>{const sp=t=>String(t||'').replace(/[\s  ]+/g,' ').trim();return {h4:sp((document.querySelector('#dx-calc h4')||{}).textContent),q:(document.querySelector('#dx-calc [data-dx="q"]')||{}).value,qh:sp((document.querySelector('#dx-calc .dz-qh')||{}).textContent),res:sp((document.getElementById('dx-cres')||{}).textContent),put:(document.querySelector('#dx-calc [data-v="dxput|"]')||{}).disabled};});
await shotEl('pc_1366_calculateur_qte_vide.png','#dx-calc');
const [pop]=await Promise.all([ctx.waitForEvent('page'),click('dxpop|')]);watch(pop);await wait(1200);
await pop.click(td(12,4));await wait(200);await pop.keyboard.type('80');await pop.keyboard.press('Tab');await wait(900);
out.after=await page.evaluate(()=>{const sp=t=>String(t||'').replace(/[\s  ]+/g,' ').trim();return {h4:sp((document.querySelector('#dx-calc h4')||{}).textContent),q:(document.querySelector('#dx-calc [data-dx="q"]')||{}).value,qh:!!document.querySelector('#dx-calc .dz-qh'),res:sp((document.getElementById('dx-cres')||{}).textContent).replace(/↦.*$/,'').trim()};});
await pop.evaluate(()=>document.querySelector('[data-v="dxpopclose|"]').click());await wait(800);a=await A();out.l12b=a.dpgf.lignes.find(l=>l.row===12);
console.log('c7) ligne insérée :',JSON.stringify(out));
out.lists={avant:kd(L7),apres:kd(L7b),e7};console.log('c7) liste :',JSON.stringify(out.lists));
C.c7=['amene','conteneur','doe'].every(p=>out.lists.avant.includes('inst|'+p+':keep')) /* 19/10 (lot DY) : ml en plus au chiffrage, lignes du DPGF inchangées → « Laisser à placer » d'office ; la balance reste le 2e bouton (cliqué ici) */&&!/inst\|/.test(out.lists.apres)&&/z0\|soudure\|dn80:pro\+/.test(out.lists.apres)&&e7<0.05&&!!out.l12&&out.l12.n==='2.6'&&out.l12.u==='ml'&&!out.l12.qte&&/ligne 12/.test(out.open.h4)&&out.open.q===''&&out.open.qh==='tape la quantité de la ligne (ici ou dans la grille)'&&/quantité \?/.test(out.open.res)&&/« Mettre » est grisé : tape la quantité de la ligne \(ici ou dans la grille\)\./.test(out.open.res)&&out.open.put===true
  &&/ligne 12/.test(out.after.h4)&&out.after.q==='80'&&!out.after.qh&&/÷ 80 ml/.test(out.after.res)&&out.l12b&&out.l12b.qte===80;
// ── c8) le calculateur de la 2.6 : soudures et manchons DN 80 (les 10 en plus) ; la sélection gardée « Installations » (tout pointé dans Secteur Alpha) propose
//        « ⇶ leurs parts » ; 19/10 (lot DY) : sur une ligne au ml, la part d'une installation de la zone se prend « au prorata de mes ml » = € / ml de la zone × 80,
//        reprise sur les lignes au ml de la zone (avant : « ⇶ sa part », part de la zone × 80 ÷ (900 + 80)) ; téléphone 390 px ; « ↦ Mettre » : la ligne + ses parts (via « part », zs Secteur Alpha),
//        reprises sur 2.1, 2.2, 2.3 seulement (2.4, 2.5 et la 1.1 ne bougent pas) ; total des installations inchangé ; un seul ↶
await page.evaluate(n=>{const T=window.TRACE.affaires;const a=T.get(n);T.set(n,{dpgf:Object.assign({},a.dpgf,{sels:[{id:'Szone',nom:'Installations',ks:['inst|amene','inst|conteneur','inst|doe'],at:'2026-10-17T08:00:00.000Z',by:'Ethan (test)'}]})});},NUM);
await openCalc(12);const kS=K('z0|soudure|dn80'),kM=K('z0|manchons|dn80');
for(const k of [kS,kM]){await chg(`#dx-calc input[data-dx="ck"][data-k="${k}"]`,true);await page.fill(`#dx-calc [data-dx="cq"][data-k="${k}"]`,'10');await page.dispatchEvent(`#dx-calc [data-dx="cq"][data-k="${k}"]`,'change');await wait(300);}
out={chip:sp(await page.$eval('#dx-calc .c2-chip',e=>e.textContent).catch(()=>'')),selp:sp(await page.$eval('#dx-calc [data-v="dxdzselp|Szone"]',e=>e.textContent).catch(()=>'')),
  barred:await page.evaluate(t=>{const z=document.querySelector(`#dx-calc .c3-g[data-g="${t}"] .dz-zb`);return z?[...z.querySelectorAll('.dz-r')].map(r=>({k:r.dataset.k,done:r.classList.contains('c2-done'),pp:!!r.querySelector('.dy-pr')})):[];},I.toks[0])}; /* (lot DY) la case « prendre au prorata de mes ml » dans la ligne barrée */
await page.evaluate(()=>{const b=document.querySelector('#dx-calc [data-v="dxdzselp|Szone"]');if(b)b.scrollIntoView({block:'center'});});await wait(300);await shot('pc_1366_calculateur_sa_part_avant.png'); /* la sélection « Installations · 0 / 3 » et « ⇶ leurs parts » */
await click('dxdzselp|Szone');await wait(500);
out.pp=await page.evaluate(t=>[...document.querySelectorAll(`#dx-calc .c3-g[data-g="${t}"] .dy-zr`)].map(x=>({k:x.dataset.k,on:x.classList.contains('on'),t:String((x.querySelector('.dy-prd')||{}).textContent||'').replace(/[\s  ]+/g,' ').trim(),v:(x.querySelector('[data-dx="cq"]')||{}).value})),I.toks[0]); /* (lot DY) */
out.res=sp(await page.$eval('#dx-cres',e=>e.textContent).catch(()=>'')).replace(/↦.*$/,'').trim();
await popShots(async()=>{await click('dxc3go|'+encodeURIComponent(I.toks[0]));await wait(1400);await shot('pc_1366_calculateur_sa_part.png');});await openCalc(12);
/* téléphone 390 px : le calculateur (récapitulatif, sous-blocs, « ⇶ sa part ») */
await page.setViewportSize({width:390,height:844});await page.evaluate(()=>{document.getElementById('app').classList.remove('wide');});await wait(600);
out.tel={sw:await page.evaluate(()=>document.documentElement.scrollWidth),small:await small('#dx-calc .dz-head button, #dx-calc .dz-zb button, #dx-calc .dz-pp input:not([type=checkbox]), #dx-calc .dy-zr input:not([type=checkbox])',34),lab:await small('#dx-calc .dz-ppl',34),over:await overflow('#dx-calc')};
await openCalc(12);await click('dxc3go|inst');await wait(1400);await shot('tel_390_calculateur_installations_par_zone.png'); /* rouvert au format téléphone */
await page.evaluate(t=>{const z=document.querySelector(`#dx-calc .c3-g[data-g="${t}"] .dy-zr.on`);if(z)z.scrollIntoView({block:'center'});},I.toks[0]);await wait(200);await shot('tel_390_calculateur_sa_part.png');
await page.setViewportSize({width:1366,height:768});await page.evaluate(()=>{document.getElementById('app').classList.add('wide');});await wait(600);
a=await A();const D8=jd(a);const tot8=instTot(a,I);const P8=porte(a,I);const keep8=['E6','E13','E14'].map(ad=>JSON.stringify((lk(a,ad)||{}).comps||null));const ml0=['E9','E10','E11'].map(ad=>instOf(lk(a,ad)));
await openCalc(12);await click('dxput|');await wait(900);a=await A();const L12=lk(a,'E12');const P8b=porte(a,I);
const a8=JSON.parse(D8);const held=p=>['E9','E10','E11'].reduce((s,ad)=>s+((a8.find(L=>L.a===ad)||{comps:[]}).comps.filter(x=>x.k==='inst|'+p&&x.zs===I.toks[0]).reduce((t,x)=>t+(+x.q)*I.posts[p].puV,0)),0);
const exp=p=>part(I,p,0)/I.zml[0]*80; /* (lot DY) € / ml de la zone × 80 (avant : held(p)*80/(900+80) — la 1.1, au forfait, porte une partie de l'amené : la part au prorata des ml de la zone est plus grande) */
out.put={comps:L12?L12.comps.map(x=>U(x.k)+'='+r2(+x.q)+(x.via?'·'+x.via:'')+(x.zs?'·'+(x.zs===I.toks[0]?'A':x.zs):'')).join(' '):null,pu:L12&&L12.pu,cell:await cellPu(12),
  parts:L12?Object.fromEntries(L12.comps.filter(x=>x.via==='part').map(x=>{const p=x.k.split('|')[1];return [p,r2((+x.q)*I.posts[p].puV)];})):{},exp:Object.fromEntries(Object.keys(I.posts).map(p=>[p,r2(exp(p))])),
  tot:[r2(tot8),r2(instTot(a,I))],alpha:Object.keys(I.posts).every(p=>Math.abs(P8b[p][0]-P8[p][0])<0.02),keep:['E6','E13','E14'].every((ad,i)=>JSON.stringify((lk(a,ad)||{}).comps||null)===keep8[i]),
  donors:['E9','E10','E11'].map((ad,i)=>instOf(lk(a,ad))!==ml0[i]),toast:sp(await toast())};
await click('dxundo|');await wait(500);a=await A();out.undo=jd(a)===D8;await click('dxredo|');await wait(500);a=await A();out.redo=!!lk(a,'E12');
console.log('c8) sa part :',JSON.stringify(out));
C.c8=/^Installations · 0 \/ 3 · déjà tout pointé ailleurs/.test(out.chip)&&out.selp==='⇶ leurs parts · 3'&&out.barred.length===3&&out.barred.every(x=>x.done&&x.pp)
  &&out.pp.length===3&&out.pp.every(x=>x.on&&x.v==='80'&&/^[\d ]+ € = [\d ]+ € repris sur 3 lignes de la zone \(2\.1 −[\d ]+ €, 2\.2 −[\d ]+ €, 2\.3 −[\d ]+ €\)$/.test(x.t)) /* (lot DY) */
  &&!out.tel.small.length&&!out.tel.lab.length&&!out.tel.over.length&&out.tel.sw<=390
  &&!!out.put.comps&&Object.keys(I.posts).every(p=>Math.abs((out.put.parts[p]||0)-out.put.exp[p])<0.05)&&/soudure\|dn80=10 z0\|manchons\|dn80=10/.test(out.put.comps)&&(out.put.comps.match(/·part·A/g)||[]).length===3
  &&Math.abs(out.put.tot[0]-out.put.tot[1])<0.02&&out.put.alpha&&out.put.keep&&out.put.donors.every(Boolean)&&Math.abs(out.put.cell-out.put.pu)<0.006&&/avec sa part de 3 postes tout pointés/.test(out.put.toast)&&/reprise au prorata sur 3 lignes/.test(out.put.toast)
  &&out.undo&&out.redo;
// ── c9) « ⇶ Donner sa part » du lot DK (après coup), pour une installation : la part de LA zone de la ligne, prise sur les lignes de cette zone, reçue avec zs
await click('dxundo|');await wait(500);await openCalc(12);
for(const k of [kS,kM]){if(!await page.evaluate(k=>{const i=document.querySelector(`#dx-calc input[data-dx="ck"][data-k="${k}"]`);return !!i&&i.checked;},k))await chg(`#dx-calc input[data-dx="ck"][data-k="${k}"]`,true);await page.fill(`#dx-calc [data-dx="cq"][data-k="${k}"]`,'10');await page.dispatchEvent(`#dx-calc [data-dx="cq"][data-k="${k}"]`,'change');await wait(300);}
await page.evaluate(()=>{document.querySelectorAll('#dx-calc input[data-dz="pp"]:checked').forEach(i=>{i.checked=false;i.dispatchEvent(new Event('change',{bubbles:true}));});});await wait(400);
await click('dxput|');await wait(800);a=await A();const D9=jd(a);const tot9=instTot(a,I);const keep9=['E6','E13','E14'].map(ad=>JSON.stringify((lk(a,ad)||{}).comps||null));
await shut();await click('dxc3list|');await wait(600);L3=await its();const it9=L3.find(x=>x.k==='part:'+(lk(a,'E12')||{}).id);
if(it9){await click('dxdkpart|12');await wait(600);}out={it9:!!it9,rows:await page.evaluate(()=>[...document.querySelectorAll('#dk-pdlg .dk-pr')].map(r=>({k:r.dataset.k,on:r.classList.contains('on'),t:String(r.textContent||'').replace(/[\s  ]+/g,' ').trim().slice(0,120)})))};
await shot('pc_1366_donner_sa_part_zone.png');if(await has('dxdkpartok|')){await click('dxdkpartok|');await wait(800);}a=await A();const L9=lk(a,'E12');
out.got=L9?L9.comps.filter(x=>/^inst\|/.test(x.k)).map(x=>x.k.split('|')[1]+':'+(x.via||'')+':'+(x.zs===I.toks[0]?'A':x.zs||'-')).join(' '):'';out.tot=[r2(tot9),r2(instTot(a,I))];out.keep=['E6','E13','E14'].every((ad,i)=>JSON.stringify((lk(a,ad)||{}).comps||null)===keep9[i]);
out.e=r2(ecart(a,I));await click('dxundo|');await wait(500);a=await A();out.undo=jd(a)===D9;await click('dxredo|');await wait(400);if(await page.$('#c3-dlg'))await click('dxc3close|');
console.log('c9) donner sa part (lot DK) :',JSON.stringify(out));
C.c9=out.it9&&out.rows.filter(r=>/@/.test(r.k)).length===3&&out.rows.filter(r=>/@/.test(r.k)).every(r=>r.on&&r.k.endsWith('@'+I.toks[0])&&r.t.startsWith(I.names[0]+' Installations · '))
  &&out.got.split(' ').length===3&&out.got.split(' ').every(x=>/:part:A$/.test(x))&&Math.abs(out.tot[0]-out.tot[1])<0.02&&out.keep&&out.e<0.05&&out.undo;
// ── c10) une installation de plus au chiffrage (frais : 1 200 €) ; la 1.1 (au forfait) : « Prendre les installations de toutes les zones (reste) » coche le reste de
//         chaque zone en une fois ; 2.5 perd son lien (PU tapé à la main) : Secteur Gamma n'a plus de ligne au ml ; « ⇶ Mettre le reste au ml » : chaque zone sur ses
//         lignes (zs), Gamma listée dans « ce qui ne trouve pas de ligne » ; avec « orphelins » : au prorata de toutes les lignes
await chif(async()=>{await click('chview|inst');await click('instadd|frais');await chg('#eq-app [data-afx="inst§frais.0.label"]','Clôtures de chantier (essai)');await chg('#eq-app [data-afx="inst§frais.0.montant"]','1200');});
I=await info();a=await A();
/* cocher la part d'une zone sur une ligne au ml : ml de la ligne × € / ml de la zone, au plus le reste (2.1 : 420 ml dans Secteur Alpha) ; rien ne s'écrit */
await openCalc(9);const kFA='inst|frais@'+I.toks[0];await chg(`#dx-calc input[data-dz="ck"][data-k="${kFA}"]`,true);
const take9=await page.evaluate(k=>{const sp=t=>String(t||'').replace(/[\s  ]+/g,' ').trim();const r=[...document.querySelectorAll('#dx-calc .dz-r')].find(x=>x.dataset.k===k);if(!r)return null;const i=r.querySelector('[data-dx="cq"]');return {v:i?i.value:'',t:sp((r.querySelector('.dx-cq')||{}).textContent),nm:sp((r.querySelector('.c2-nm')||{}).textContent)};},kFA);
await chg(`#dx-calc input[data-dz="ck"][data-k="${kFA}"]`,false);const noW9=JSON.stringify((lk(await A(),'E9')||{}).comps||null)===JSON.stringify((lk(a,'E9')||{}).comps||null);
await openCalc(6);out={take9,noW9,all:sp(await page.$eval('#dx-calc [data-v="dxdzall|"]',e=>e.textContent).catch(()=>''))};await click('dxdzall|');await wait(500);
out.on=await page.evaluate(()=>[...document.querySelectorAll('#dx-calc .dz-r.on')].map(r=>r.dataset.k));out.toastAll=sp(await toast());await click('dxcclr|');await wait(300);a=await A();out.noWrite=!(lk(a,'E6').comps.some(x=>/frais/.test(x.k)));
const L14=lk(a,'E14');await openCalc(14);await click('dxunlink|'+L14.id);await wait(400);await shut();await gridTop();await page.click(td(14,5));await wait(200);await page.keyboard.type('40');await page.keyboard.press('Enter');await wait(500);await shut();
await click('dxrpsimple|');await wait(600);out.win=sp(await page.$eval('#rp-simple .rp-body',e=>e.textContent).catch(()=>''));out.orph=!!await page.$('#rp-simple [data-rp="sorph"]');await shot('pc_1366_mettre_le_reste_au_ml_zones.png');
await click('dxrpsimpleok|');await wait(800);a=await A();const P10=porte(a,I);
out.z={frais:P10.frais.map(r2),part:I.toks.map((t,i)=>r2(part(I,'frais',i))),zs:['E9','E10','E11','E12','E13'].map(ad=>(lk(a,ad).comps.filter(x=>/frais/.test(x.k)).map(x=>x.zs===I.toks[0]?'A':x.zs===I.toks[1]?'B':x.zs===I.toks[2]?'G':'-')).join('')).join(','),gamma:r2(P10.conteneur[2]+P10.doe[2]+P10.frais[2])}; /* Gamma : seule la part sans zone de la 1.1 (amené) lui reste */
await click('dxundo|');await wait(500);await click('dxrpsimple|');await wait(500);await chg('#rp-simple [data-rp="sorph"]',true);await wait(300);out.win2=sp(await page.$eval('#rp-simple .rp-body',e=>e.textContent).catch(()=>''));await click('dxrpsimpleok|');await wait(800);a=await A();const P10b=porte(a,I);
out.orphan={gamma:I.toks.map((t,i)=>r2(P10b.frais[i])),e:r2(ecart(a,I)),gz:['E9','E13'].map(ad=>lk(a,ad).comps.filter(x=>/frais/.test(x.k)&&x.zs===I.toks[2]).length).join()};
console.log('c10) reste au ml par zone :',JSON.stringify(out));
const fr=Object.values(out.z.part).reduce((s,x)=>s+x,0);
const fA=part(I,'frais',0);const t9=out.take9||{};
C.c10=!!out.take9&&t9.v==='420'&&Math.abs(nbv((/= ([\d ,]+) €/.exec(t9.t)||[])[1])-fA*420/I.zml[0])<0.02&&Math.abs(nbv((/reste ([\d ,]+) €/.exec(t9.t)||[])[1])-fA*(I.zml[0]-420)/I.zml[0])<1&&t9.nm.includes('ml de la zone ('+I.zml[0]+' ml)')&&out.noW9
  &&new RegExp('^Prendre les installations de toutes les zones \\(reste\\) · '+eur(I.posts.frais.amtV)+' €$').test(out.all)&&out.on.length===3&&out.on.every(k=>/^inst\|frais@/.test(k))&&/3 parts d'installations cochées/.test(out.toastAll)&&out.noWrite
  &&/installations : chaque zone sur ses lignes, comme ventilé au chiffrage \(en %\)/.test(out.win)&&new RegExp('installations de '+I.names[2].replace(/[()]/g,'\\$&')+' : aucune ligne au ml de cette zone').test(out.win)&&out.orph
  &&Math.abs(out.z.frais[0]-out.z.part[0])<0.05&&Math.abs(out.z.frais[1]-out.z.part[1])<0.05&&out.z.frais[2]<0.01&&out.z.zs==='A,A,A,A,B'&&out.z.gamma<0.01&&fr>0
  &&/et les installations d'une zone sans ligne au ml/.test(out.win2)&&out.orphan.gamma.every((x,i)=>Math.abs(x-out.z.part[i])<0.05)&&out.orphan.e<0.05&&out.orphan.gz==='1,1';
// ── c11) le récap : par poste (zone par zone : part, porté, lignes), par ligne (la zone de la part d'installations : 🏗 Secteur …), à vérifier (rien sur les installations)
await click('dxdkrecap|');await wait(500);await click('dxdktab|poste');await wait(300);await click('dxdktg|'+encodeURIComponent('c:inst|frais'));await wait(300);
out={poste:sp(await page.$eval('#dk-body',e=>e.innerText).catch(()=>''))};await click('dxdktab|ligne');await wait(300);await click('dxdktg|'+encodeURIComponent('l:9'));await wait(300);
out.ligne=await page.evaluate(()=>[...document.querySelectorAll('#dk-body .dk-it.open .dk-cn')].map(x=>x.textContent.replace(/[\s  ]+/g,' ').trim()).filter(t=>/Installations|🏗/.test(t)));
await shot('pc_1366_recap_par_ligne_zone.png');await click('dxdktab|chk');await wait(300);out.chk=sp(await page.$eval('#dk-body',e=>e.innerText).catch(()=>''));await click('dxdkclose|');
console.log('c11) récap :',JSON.stringify({poste:out.poste.slice(Math.max(0,out.poste.search(/ventilation par zone/i)-10),out.poste.search(/ventilation par zone/i)+500),ligne:out.ligne,chk:out.chk.slice(0,300)}));
C.c11=/Ventilation par zone · en % saisis/i.test(out.poste)&&I.names.every(n=>new RegExp(n.replace(/[()]/g,'\\$&')+' part [\\d ]+ € \\(\\d+ %\\) porté [\\d ]+ € ✓ lignes').test(out.poste))
  &&out.ligne.length>=4&&out.ligne.every(t=>t.startsWith('🏗 '))&&out.ligne.some(t=>t.startsWith('🏗 '+I.names[0]))&&!/Installations : zones sur- ou sous-pointées/.test(out.chk);
// ── c12) consultation d'une version : lecture seule — le calculateur montre les parts de zone (cases désactivées), ni « ↻ Reventiler », ni « Prendre … », ni « ⇶ sa part »
//         actif ; le récap s'ouvre ; rien ne s'écrit
await click('tab|chiffrage');await click('vnew|');await page.evaluate(()=>{document.getElementById('vv-note').value='Essai zones';document.getElementById('vv-ok').click();});await wait(500);
await click('vview|1');await click('tab|dpgf');await page.waitForSelector('#dx-vp',{timeout:15000});await wait(700);a=await A();const V0=JSON.stringify(a.dpgf);
await openCalc(6);out={vv:sp(await page.$eval('#eq-app .vv-band',e=>e.textContent).catch(()=>'')).slice(0,40),zb:await page.$$eval('#dx-calc .dz-zb',L=>L.length),en:await page.$$eval('#dx-calc input[data-dz]',L=>L.filter(i=>!i.disabled).length),
  btn:await page.evaluate(()=>!!document.querySelector('#dx-calc [data-v="dxdzrev|"],#dx-calc [data-v="dxdzall|"],#dx-calc [data-v^="dxdzselp|"]'))};
await shut();out.rc=await has('dxdkrecap|');if(out.rc){await click('dxdkrecap|');await wait(400);out.rcOpen=!!await page.$('#dk-dlg');await click('dxdkclose|');}a=await A();out.noWrite=JSON.stringify(a.dpgf)===V0;
await click('vexit|');await wait(500);await toDpgf();
console.log('c12) consultation :',JSON.stringify(out));
C.c12=/Tu consultes la v1/.test(out.vv)&&out.zb===3&&out.en===0&&!out.btn&&out.rc&&out.rcOpen&&out.noWrite;
// ── c13) téléphone 390 px : la liste et le calculateur (contrôlés en c6 et c8) ; ici le récapitulatif, l'élément « ventilation par zone à refaire » au téléphone
await chif(async()=>{await click('chview|inst');await chg(`#eq-app [data-afx="inst§pct.${ids[0]}"]`,'50');await chg(`#eq-app [data-afx="inst§pct.${ids[1]}"]`,'35');});
await page.setViewportSize({width:390,height:844});await page.evaluate(()=>{document.getElementById('app').classList.remove('wide');});await toDpgf();await shut();
await page.evaluate(()=>{document.getElementById('dx-card').scrollIntoView({block:'start'});});await wait(300);out={sw:await page.evaluate(()=>document.documentElement.scrollWidth),band:await rect('#c3-band')};await shot('tel_390_bandeau_installations.png');
await page.click(td(13,5));await wait(700);out.calc={small:await small('#dx-calc .dz-head button',34),prim:await small('#dx-calc .dz-gap .btn.primary',40),over:await overflow('#dx-calc')};
await click('dxc3go|inst');await wait(1400);await shot('tel_390_calculateur_ecart_reventiler.png');await shut();
await click('dxc3list|');await wait(600);out.dlg=await rect('#c3-dlg');out.list={small:await small('#c3-dlg button',34),over:await overflow('#c3-dlg')};await shot('tel_390_liste_changements.png');await click('dxc3close|');
await page.setViewportSize({width:1366,height:768});await page.evaluate(()=>{document.getElementById('app').classList.add('wide');});await toDpgf();
console.log('c13) téléphone 390 px :',JSON.stringify(out));
C.c13=out.sw<=390&&out.band&&out.band.r<=390&&!out.calc.small.length&&!out.calc.prim.length&&!out.calc.over.length&&out.dlg&&out.dlg.w===390&&!out.list.small.length&&!out.list.over.length;
C.console=logs.length===0;
// ── c14) LE BANDEAU DES DOCUMENTS ADMINISTRATIFS (Supabase simulé, Ethan administrateur) : un document enregistré → « ⏳ 1 document en cours d'envoi au serveur… »
//         → il disparaît une fois envoyé (sans recharger l'écran) ; le serveur répond « registre inconnu » → le conseil « passe le SQL » ; une autre panne → au-delà de
//         30 s : « vérifie la connexion » ; téléphone 390 px
const SB='https://pghftlepduvfazbiavhq.supabase.co';const UID='11111111-2222-4333-8444-555555555555';const EMAIL='essai.zones@exemple.invalid';
const profile={id:UID,email:EMAIL,name:'Ethan (essai)',role:'chef',active:true,poste:'resp_exploitation',admin:true,type:'salarie',rights:{},sites:null,prenom:'Ethan',nom:'ESSAI',created_at:'2026-10-08T09:00:00Z'};
const session=()=>({access_token:'tok',token_type:'bearer',expires_in:3600,expires_at:Math.floor(Date.now()/1000)+3600,refresh_token:'ref',user:{id:UID,email:EMAIL,aud:'authenticated',role:'authenticated',app_metadata:{},user_metadata:{},created_at:'2026-10-08T09:00:00Z'}});
let REG='ok';const rpcs=[];
const ctx2=await browser.newContext({viewport:{width:1366,height:900}});
await ctx2.route(u=>u.href.startsWith(SB),async route=>{const req=route.request();const u=new URL(req.url());const p=u.pathname;const acc=req.headers()['accept']||'';
  const json=(o,status=200)=>route.fulfill({status,contentType:'application/json',headers:{'access-control-allow-origin':'*'},body:JSON.stringify(o)});
  if(p==='/auth/v1/token')return json(session());if(p==='/auth/v1/user')return json(session().user);if(p.startsWith('/auth/v1/'))return json({});
  if(p==='/rest/v1/profiles'){const rows=[profile];return json(/object/.test(acc)?rows[0]:rows);}
  if(p==='/rest/v1/app_settings')return json(/object/.test(acc)?null:[]);
  if(p==='/rest/v1/rpc/registre_set'){let b={};try{b=JSON.parse(req.postData()||'{}');}catch(e){}if(b.p_kind!=='entdoc')return json({kind:b.p_kind,id:b.p_id,data:b.p_patch||{},updated_at:new Date().toISOString()});rpcs.push(REG+':'+b.p_id);
    if(REG==='slow'){await new Promise(r=>setTimeout(r,2500));return json({kind:'entdoc',id:b.p_id,data:b.p_patch||{},updated_at:new Date().toISOString()});}
    if(REG==='missing')return json({code:'P0001',message:'registre inconnu : entdoc',details:null,hint:null},400);
    if(REG==='down')return route.abort('failed');
    return json({kind:'entdoc',id:b.p_id,data:b.p_patch||{},updated_at:new Date().toISOString()});}
  if(p.startsWith('/storage/'))return json({error:'stockage indisponible (essai)'},400);
  if(p.startsWith('/rest/v1/rpc/'))return json(null);if(p.startsWith('/rest/v1/'))return json([]);return json([]);});
const pg=await ctx2.newPage();pg.on('pageerror',e=>logs.push('PAGEERROR: '+e.message.slice(0,300)));pg.on('console',m=>{if(m.type()==='error'&&!/supabase|Failed to fetch|net::ERR|404|400|WebSocket|realtime|pdf\.worker|cdnjs/i.test(m.text()))logs.push(m.text().slice(0,200));});pg.on('dialog',d=>d.accept().catch(()=>{}));
await pg.goto(BASE+'/index.html');await pg.waitForTimeout(600);await pg.evaluate(()=>{localStorage.clear();});await pg.evaluate(()=>new Promise(r=>{try{const q=indexedDB.deleteDatabase('trace-kv');q.onsuccess=q.onerror=q.onblocked=()=>r();}catch(e){r();}}));await pg.reload();await pg.waitForTimeout(900);
await pg.fill('#loginEmail',EMAIL);await pg.fill('#loginPwd','Essai-2026!');await pg.click('#loginGo');await pg.waitForTimeout(1500);try{await pg.waitForFunction(()=>window.TRACE&&window.TRACE.state.cloudUser,null,{timeout:8000});}catch(e){}
const goEnt=async()=>{await pg.evaluate(()=>{window.TRACE.renderHome();document.getElementById('htEnt').click();});await pg.waitForTimeout(400);await pg.evaluate(()=>{[...document.querySelectorAll('#eq-app .ac-row')].find(x=>/Documents administratifs \(offres\)/.test(x.textContent)).click();});await pg.waitForTimeout(400);};
const pdf=t=>({name:t+'-fictif.pdf',mimeType:'application/pdf',buffer:Buffer.from('%PDF-1.4\n% fichier FICTIF de test : '+t+'\n%%EOF\n','utf8')});
const depose=async id=>{await pg.evaluate(id=>{document.querySelector(`#eq-app [data-act=x][data-v="dob|edit|${id}"]`).click();},id);await pg.waitForTimeout(300);await pg.setInputFiles('#ed-file',pdf(id));await pg.waitForTimeout(150);await pg.click('#ed-ok');await pg.waitForTimeout(200);};
const pend=()=>pg.evaluate(()=>{const e=document.getElementById('dob-pend');return e?e.textContent.replace(/[\s  ]+/g,' ').trim():null;});
await goEnt();out={cloud:await pg.evaluate(()=>!!window.TRACE.state.cloudUser),before:await pend()};
REG='slow';await depose('kbis');await pg.waitForTimeout(1200);out.sending=await pend();await pg.screenshot({path:path.join(SHOTS,'pc_1366_documents_envoi_en_cours.png')});await pg.waitForTimeout(3200);out.sent=await pend();out.q1=await pg.evaluate(()=>window.TRACE.reg.pending().filter(w=>w.kind==='entdoc').length);
REG='missing';await depose('urssaf');await pg.waitForTimeout(1800);out.missing=await pend();await pg.screenshot({path:path.join(SHOTS,'pc_1366_documents_registre_inconnu.png')});
REG='ok';await depose('fiscale');await pg.waitForTimeout(1800);out.cleared=await pend();out.q2=await pg.evaluate(()=>window.TRACE.reg.pending().filter(w=>w.kind==='entdoc').length);
REG='down';await depose('rib');await pg.waitForTimeout(1500);out.down0=await pend();await pg.setViewportSize({width:390,height:844});await pg.waitForTimeout(400);out.tel={sw:await pg.evaluate(()=>document.documentElement.scrollWidth),r:await pg.evaluate(()=>{const e=document.getElementById('dob-pend');return e?Math.round(e.getBoundingClientRect().right):0;})};
await pg.screenshot({path:path.join(SHOTS,'tel_390_documents_envoi_en_cours.png')});
await pg.waitForTimeout(30500);out.down30=await pend();await pg.screenshot({path:path.join(SHOTS,'tel_390_documents_verifie_connexion.png')});await pg.setViewportSize({width:1366,height:900});
out.rpcs=rpcs.join(' ');
console.log('c14) bandeau des documents :',JSON.stringify(out));
C.c14=out.cloud&&out.before===''&&out.sending==='⏳ 1 document en cours d\'envoi au serveur…'&&out.sent===''&&out.q1===0&&/^1 document pas encore enregistré sur le serveur : passe le SQL sql\/retours_14-10b\.sql \(registre « entdoc »\), il partira tout seul\.$/.test(out.missing)
  &&out.cleared===''&&out.q2===0&&out.down0==='⏳ 1 document en cours d\'envoi au serveur…'&&/^1 document pas encore enregistré sur le serveur — vérifie la connexion ; s'il reste, envoie une capture de la console\.$/.test(out.down30)&&out.tel.sw<=390&&out.tel.r<=390
  &&/slow:kbis/.test(out.rpcs)&&/missing:urssaf/.test(out.rpcs)&&/ok:fiscale/.test(out.rpcs)&&/down:rib/.test(out.rpcs);
await ctx2.close();
C.console=logs.length===0;
const bad=Object.entries(C).filter(([k,v])=>!v).map(([k])=>k);console.log(bad.length?'RESULTAT: ECHEC '+bad.join(','):'RESULTAT: TOUT VERT');console.log(logs.length?logs:'[]');
await browser.close();
