// LOT C3 (16/10 après-midi) — le DPGF plus léger et la liste des changements du chiffrage à traiter. Ethan : « mets la ventilation en dessous de « calculer le
// prix » […] le bouton « calculer le prix » qui doit être accessible facilement aussi sans remonter […] moins de scroll dans tous les sens. Il faut pouvoir
// rétracter des zones […] Les installations doivent être mises au début […] si les quantités et prix changent dans le tableau de chiffrage les liens restent […]
// des soudures en moins […] une checklist des changements, genre « 50 soudures en moins à traiter » […] si des soudures en plus […] où elles doivent être imputées
// […] tout ce qui a été divisé en plusieurs, genre installation ou pelle […] un raccourci simplifié pour refaire la balance ». Données FICTIVES : test/fixture_prix.xlsx,
// test/fixture_dpgf_suivi.xlsx (make_fixture_dpgfsuivi.py) ; 3 zones (DN 100 / 80 + 2 SST DN 80 + autocontrôle itopo / pression ; DN 65 + un raccordement ; DN 50 + une
// SST) ; test/fixture_dpgf_clair_avant.json (+ dpgf_clair_setup.mjs) = un DPGF pointé AVANT ce lot.
// d1 disposition : installations en tête, groupes repliables (mémorisés), puces, ventilation compacte (3 zones sans défilement horizontal à 1 366 px, coûts au choix,
// zones repliables), bouton flottant · d2 ventilation SOUS le calculateur (autre écran, côte à côte) · k1 clés stables à l'écriture · s1 soudures en moins → retirer
// au prorata (un seul ↶, ↷) · s2 manchons en moins → ligne par ligne · s3 en plus → au prorata · s4 en plus → sur une ligne · s5 en plus → laisser dans le reste ·
// s6 installation répartie au ml : montant changé → refaire la balance (proportions, total) ; ml de la zone changé → même chose à l'échelle · s7 prix seul → appliquer
// ces lignes · s8 autocontrôle par type sur-pointé (manchons en moins) · s9 tout traiter d'un coup, un seul ↶ · k2 SST supprimée (l'autre SST garde son lien,
// la supprimée se retire des lignes) · k3 zones réordonnées · k4 zone supprimée · o1 ancien DPGF : identique, aucune fausse alerte, sur-pointage réel signalé,
// anciennes clés figées (zone supprimée), le suivi posé à l'ouverture n'est pas une modification pour l'historique des versions · v1 consultation d'une version : lecture seule · t1 téléphone 390 px · console sans erreur. Captures : SHOTS (défaut
// /root/work/dd_shots).
import { chromium } from 'playwright';
import fs from 'fs';import path from 'path';import {fileURLToPath} from 'url';
import {cles} from './dpgf_cles.mjs';import {setupAffaire} from './dpgf_clair_setup.mjs';
const HERE=path.dirname(fileURLToPath(import.meta.url));
const BASE=process.env.BASE||'http://localhost:8765';const SHOTS=process.env.SHOTS||'/root/work/dd_shots';try{fs.mkdirSync(SHOTS,{recursive:true});}catch(e){}
const browser=await chromium.launch({headless:true, executablePath: process.env.CHROMIUM_PATH||undefined});
const ctx=await browser.newContext({viewport:{width:1366,height:768},acceptDownloads:true});const page=await ctx.newPage();
const logs=[];const watch=p=>{p.on('pageerror',e=>logs.push('PAGEERROR: '+e.message.slice(0,300)));p.on('console',m=>{if(m.type()==='error'&&!/supabase|Failed to fetch|net::ERR|404|WebSocket|pdf\.worker|cdnjs/i.test(m.text()))logs.push(m.text().slice(0,200));});p.on('dialog',d=>d.accept().catch(()=>{}));};watch(page);
const C={};const wait=ms=>page.waitForTimeout(ms);const sp=t=>String(t||'').replace(/[\s\u00A0\u202F]+/g,' ').trim();const NUM='O2610-95';
const nbv=t=>{const x=parseFloat(String(t||'').replace(/[\s\u00A0\u202F€]/g,'').replace(/[−–]/g,'-').replace(',','.'));return isFinite(x)?x:NaN;};
const chg=async(sel,val)=>{await page.evaluate(([s,v])=>{const el=document.querySelector(s);if(!el)throw new Error('absent '+s);if(el.type==='checkbox'||el.type==='radio'){el.checked=!!v;}else el.value=v;el.dispatchEvent(new Event('change',{bubbles:true}));},[sel,val]);await wait(150);};
const click=async v=>{await page.evaluate(v=>{const el=document.querySelector(`#eq-app [data-act=af][data-v="${v}"]`);if(!el)throw new Error('bouton absent '+v);el.click();},v);await wait(300);};
const has=v=>page.evaluate(v=>!!document.querySelector(`#eq-app [data-act=af][data-v="${v}"]`),v);
const td=(r,c)=>`#dx-vp td[data-r="${r}"][data-c="${c}"]`;const A=n=>page.evaluate(n=>window.TRACE.affaires.get(n),n||NUM);
const rect=s=>page.evaluate(s=>{const e=document.querySelector(s);if(!e)return null;const b=e.getBoundingClientRect();return {l:Math.round(b.left),t:Math.round(b.top),r:Math.round(b.right),b:Math.round(b.bottom),w:Math.round(b.width),h:Math.round(b.height)};},s);
const shot=async(name,p)=>{p=p||page;try{await p.screenshot({path:path.join(SHOTS,name)});}catch(e){console.log('(capture '+name+' : '+e.message.slice(0,80)+')');}};
const toast=()=>page.evaluate(()=>{const t=document.getElementById('toast');return t?t.textContent:'';});
const unfold=async k=>{if(await page.evaluate(k=>{const c=document.querySelector(`#eq-app .ch-bloc[data-bloc="${k}"]`);return !!c&&c.classList.contains('folded');},k))await click('chfold|'+k);};
const toDpgf=async()=>{await click('tab|offre');await click('tab|dpgf');await page.waitForSelector('#dx-vp',{timeout:15000});await wait(900);};
const shut=async()=>{if(await page.evaluate(()=>/\bflt\b/.test((document.querySelector('#dx-card .dx-split')||{}).className||'')))await click('dxrpshut|');};
const gridTop=async()=>{await page.evaluate(()=>{document.getElementById('dx-card').scrollIntoView({block:'start'});});await wait(250);};
// ── mise en place : affaire, base fictive, 3 zones, DPGF fictif
await page.goto(BASE+'/index.html');await wait(600);await page.evaluate(()=>{localStorage.clear();localStorage.setItem('trace:wide','1');});await page.evaluate(()=>new Promise(r=>{try{const q=indexedDB.deleteDatabase('trace-kv');q.onsuccess=q.onerror=q.onblocked=()=>r();}catch(e){r();}}));
await page.reload();await wait(1200);{const s=await page.$('#loginSkip');if(s&&await s.isVisible())await s.click();await wait(700);}
await page.evaluate(async n=>{const T=window.TRACE;T.state.userId='ethan';T.renderHome();document.getElementById('htCom').click();await new Promise(x=>setTimeout(x,250));
  document.querySelector('#eq-app [data-act=af][data-v="new|"]').click();await new Promise(x=>setTimeout(x,150));document.getElementById('afn-num').value=n;document.getElementById('afn-nom').value='Suivi des changements (essai)';document.getElementById('afn-client').value='CLIENT TEST';document.getElementById('afn-etat').value='devis';
  document.querySelector('#eq-app [data-act=af][data-v="create|"]').click();await new Promise(x=>setTimeout(x,250));document.querySelector('#eq-app [data-act=af][data-v="tab|chiffrage"]').click();await new Promise(x=>setTimeout(x,200));},NUM);
await page.setInputFiles('#eq-app input[data-afprix]',path.join(HERE,'fixture_prix.xlsx'));await wait(1500);
const dnRow=async(i,dn,s,ml)=>{await click('chadd|dn');await chg(`#eq-app [data-afx="e§dn.${i}.dn"]`,String(dn));await chg(`#eq-app [data-afx="e§dn.${i}.soud"]`,String(s));await chg(`#eq-app [data-afx="e§dn.${i}.ml"]`,String(ml));};
const SSTT=await (async()=>{await click('chetudeadd|');await unfold('sst');await click('chadd|sst');const o=await page.$$eval('#eq-app [data-afx="e§sst.0.type"] option',L=>L.map(x=>x.value).filter(v=>/^sst_/.test(v)));return o;})();
const T1=SSTT.find(t=>/bs_pn25/.test(t))||SSTT[0],T2=SSTT.find(t=>t!==T1&&!/bs_pn40/.test(t))||SSTT[1];
await chg('#eq-app [data-afx="e§sst.0.type"]',T2);await chg('#eq-app [data-afx="e§sst.0.dn"]','80');await chg('#eq-app [data-afx="e§sst.0.paires"]','1'); /* SST n° 1 (l'« autre ») */
await click('chadd|sst');await chg('#eq-app [data-afx="e§sst.1.type"]',T1);await chg('#eq-app [data-afx="e§sst.1.dn"]','80');await chg('#eq-app [data-afx="e§sst.1.paires"]','2');
await dnRow(0,100,120,600);await dnRow(1,80,50,300);
await unfold('chantier');await chg('#eq-app [data-afx="e§chantier.d0"]','2026-11-02');await chg('#eq-app [data-afx="e§chantier.d1"]','2026-11-20');await chg('#eq-app [data-afx="e§chantier.benne"]',true);await chg('#eq-app [data-afx="e§chantier.wc"]',true);
await chg('#eq-app [data-afx="e§chantier.arMO"]',true);await chg('#eq-app [data-afx="e§chantier.arMOQty"]','2');
await unfold('eq');for(const t of ['itopo','pression'])await chg(`#eq-app [data-afx="e§eq.ctrl.${t}"]`,true);
await click('chetudeadd|');await dnRow(0,65,40,250);await unfold('racc');await click('chadd|racc');await chg('#eq-app [data-afx="e§racc.0.dn"]','65');await chg('#eq-app [data-afx="e§racc.0.paires"]','1');
const RT=await page.$eval('#eq-app [data-afx="e§racc.0.type"]',e=>e.value);
await click('chetudeadd|');await dnRow(0,50,30,150);await click('chadd|sst');await chg('#eq-app [data-afx="e§sst.0.type"]',T1);await chg('#eq-app [data-afx="e§sst.0.dn"]','50');await chg('#eq-app [data-afx="e§sst.0.paires"]','1');
await click('tab|dpgf');
await page.setInputFiles('#eq-app [data-afdpgf]',{name:'DPGF_lot05_suivi.xlsx',mimeType:'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',buffer:fs.readFileSync(path.join(HERE,'fixture_dpgf_suivi.xlsx'))});
await page.waitForSelector('#dx-vp',{timeout:15000});await wait(2600);
const {K,U,ids:ZI}=await cles(page,NUM);
const sl=t=>String(t).toLowerCase().replace(/[^a-z0-9]+/g,'_').replace(/^_+|_+$/g,'').slice(0,32);const KSST1='z0|sst|d80.'+sl(T1),KSST2='z0|sst|d80.'+sl(T2),KSST3='z2|sst|d50.'+sl(T1),KRACC='z1|racc|d65.'+sl(RT);
const ck=async(k,on=true)=>chg(`#dx-calc input[data-dx="ck"][data-k="${K(k)}"]`,on);
const fq=async(k,v)=>{const s=`#dx-calc [data-dx="cq"][data-k="${K(k)}"]`;await page.fill(s,v);await page.dispatchEvent(s,'change');await wait(250);};
const lk=(a,ad)=>(a.dpgf.liens||[]).find(L=>L.a===ad);const Pof=(a,k)=>(a.dpgf.liens||[]).reduce((s,L)=>s+(L.comps||[]).filter(x=>U(x.k)===k).reduce((t,x)=>t+(+x.q||0),0),0);
const comp=(n,k)=>page.evaluate(([n,k])=>{const T=window.TRACE.affaires;const a=T.get(n);const C=T.calc(a);const m=/^z(\d+)\|([^|]+)(?:\|dn(\d+))?$/.exec(k);const e=C.etudes[+m[1]];const L=e.r.postes[m[2]];if(!L)return null;
  if(!m[3])return {achat:L.achat,vente:L.achat/C.coef,ml:e.r.ml};const rows=e.r.detail.dn.rows;const wk=m[2]==='soudure'?'soud':m[2]==='manchons'?'manch':'auto';const W=rows.reduce((s,r)=>s+(r[wk]||0),0);const r=rows.find(x=>x.dn===+m[3]);return {vente:L.achat*(r[wk]||0)/W/C.coef};},[n||NUM,k]);
const its=()=>page.evaluate(()=>[...document.querySelectorAll('#c3-dlg .c3-it')].map(x=>({k:x.dataset.k,t:x.querySelector('.c3-is').textContent.replace(/[\s\u00A0\u202F]+/g,' ').trim(),pu:(x.querySelector('.c3-pu')||{}).textContent||'',b:[...x.querySelectorAll('.c3-acts [data-v]')].map(b=>b.dataset.v.split('|').pop()),bt:[...x.querySelectorAll('.c3-acts [data-v]')].map(b=>b.textContent.trim())})));
const doIt=async(k,act)=>{await click('dxc3do|'+encodeURIComponent(K(k))+'|'+act);await wait(500);};
const band=async()=>sp(await page.$eval('#c3-band',e=>e.textContent).catch(()=>''));
const cellPu=async r=>nbv(await page.evaluate(s=>{const e=document.querySelector(s);return e?e.textContent:'';},td(r,5)));
const chif=async fn=>{await click('tab|chiffrage');await fn();await toDpgf();};
let a=await A();let out={lines:a.dpgf.lignes.filter(l=>!l.section).map(l=>l.row+':'+l.n+':'+l.u+':'+l.qte).join(' '),zones:ZI,sst:[T1,T2],racc:RT};console.log('0) DPGF :',JSON.stringify(out));
// ── pointage (au calculateur, comme Ethan) : 3.1, 2.1, 2.2, 2.3 (soudures, manchons, amené et conteneur au ml), 3.2 / 5.1 (les 2 SST DN 80), 2.4 + 3.4 (zone 2),
//    2.5 + 3.3 (zone 3), 4.2 (Itopo DN 100 seul, 120 manchons)
const put=async(r,ks,fills)=>{await gridTop();await page.click(td(r,5));await wait(500);for(const k of ks)await ck(k);for(const [k,v] of Object.entries(fills||{}))await fq(k,v);await click('dxput|');await wait(350);};
await put(16,['z0|soudure|dn100']);
await put(9,['z0|soudure|dn100','z0|manchons|dn100','z0|amene','z0|conteneur'],{'z0|soudure|dn100':'56'});
await put(10,['z0|soudure|dn100','z0|manchons|dn100','z0|amene','z0|conteneur']);
await put(11,['z0|soudure|dn80','z0|manchons|dn80','z0|amene','z0|conteneur']);
await put(17,[KSST1]);await put(20,[KSST2]);
await put(12,['z1|soudure|dn65','z1|manchons|dn65']);await put(19,[KRACC]);
await put(13,['z2|soudure|dn50','z2|manchons|dn50']);await put(18,[KSST3]);
await gridTop();await page.click(td(24,5));await wait(500);await chg(`#dx-calc input[data-c2="sk"][data-k="${K('z0|autoctrl|dn100')}"][data-t="itopo"]`,true);await click('dxput|');await wait(350);
a=await A();const L0=JSON.parse(JSON.stringify(a.dpgf.liens));
out={n:a.dpgf.liens.length,keys:[...new Set(a.dpgf.liens.flatMap(L=>L.comps.map(x=>x.k)))],P100:Pof(a,'z0|soudure|dn100'),Pam:Pof(a,'z0|amene'),sst:lk(a,'E17')&&lk(a,'E17').comps.map(x=>x.k),it:lk(a,'E24')&&lk(a,'E24').comps,suivi:a.dpgf.suivi&&Object.keys(a.dpgf.suivi.q).length,band:await band()};
console.log('k1) pointage, clés :',JSON.stringify(out));
C.k1=out.n===11&&out.keys.every(k=>/^z:/.test(k))&&out.keys.length>=14&&out.P100===120&&out.Pam===900&&out.sst&&out.sst[0]===K(KSST1)&&/\|sst\|d80\./.test(out.sst[0])&&out.it&&out.it[0].sub==='itopo'&&out.it[0].x===120&&out.suivi>=14&&out.band==='';
// ── d1) DISPOSITION (1 366 px) : 🏗 Installations en tête (amené, conteneur de la zone 1, étiquetés), zones, ✔ Autocontrôles ; puces ; un groupe replié le reste ;
//    la puce le rouvre et y va ; ventilation compacte : Poste | 3 zones | Total | Reste sans défilement horizontal ; « Détail des coûts » ; une zone se replie ; bouton flottant
await gridTop();await page.click(td(12,5));await wait(600);
out={g:await page.$$eval('#dx-cl .c3-g',L=>L.map(x=>x.dataset.g)),gh:await page.$$eval('#dx-cl .c3-gh .c3-gt',L=>L.map(x=>x.textContent.trim())),inst:await page.$$eval('#dx-cl .c3-g[data-g="inst"] .dx-cr',L=>L.map(x=>x.dataset.k+'·'+(x.querySelector('.c3-zt')||{}).textContent)),
  chips:await page.$$eval('#dx-calc .c2-top .c3-chips .c3-chip',L=>L.map(x=>x.textContent.trim())),fab:await page.evaluate(()=>{const f=document.querySelector('#dx-card .c3-fab');return !!f&&f.checkVisibility();})};
const gk=K('z0|x').split('|')[0];await click('dxc3fold|'+encodeURIComponent(gk));await wait(300);out.fold=await page.evaluate(g=>{const x=[...document.querySelectorAll('#dx-cl .c3-g')].find(y=>y.dataset.g===g);return x?{cls:x.classList.contains('fold'),rows:x.querySelector('.c3-gb').checkVisibility()}:null;},gk);
out.ls=await page.evaluate(()=>localStorage.getItem('trace:dpgf:plis'));await toDpgf();await page.click(td(12,5));await wait(500);out.fold2=await page.evaluate(g=>{const x=[...document.querySelectorAll('#dx-cl .c3-g')].find(y=>y.dataset.g===g);return !!x&&x.classList.contains('fold');},gk);
await shot('pc_1366_calculateur_groupes.png');
await click('dxc3go|'+encodeURIComponent(gk));await wait(500);out.go=await page.evaluate(g=>{const x=[...document.querySelectorAll('#dx-cl .c3-g')].find(y=>y.dataset.g===g);const k=document.getElementById('dx-calc');if(!x)return null;const h=x.querySelector('.c3-gh').getBoundingClientRect(),c=k.getBoundingClientRect(),t=k.querySelector('.c2-top').getBoundingClientRect();return {open:!x.classList.contains('fold'),top:Math.round(h.top-t.bottom),inCalc:h.top>=c.top&&h.bottom<=c.bottom};},gk);
/* le filtre trouve aussi le nom de zone dans les groupes mêlés (🏗 Installations de la zone 1) */
await page.fill('#dx-calc [data-dx="cf"]','zone 1');await wait(700);out.flt=await page.$$eval('#dx-cl .c3-g',L=>L.map(x=>x.dataset.g+'='+x.querySelectorAll('.dx-cr').length));await page.fill('#dx-calc [data-dx="cf"]','');await wait(700);
await page.evaluate(()=>{document.getElementById('dx-vent').scrollIntoView({block:'start'});});await wait(400);
out.vent=await page.evaluate(()=>{const w=document.querySelector('#dx-vent .c3-vtw');const t=w.querySelector('table');const th=[...t.querySelectorAll('thead th')].filter(x=>x.checkVisibility()).map(x=>x.innerText.replace(/[▾▸]/g,'').replace(/[\s\u00A0\u202F]+/g,' ').trim());return {sw:w.scrollWidth,cw:w.clientWidth,th,cc:getComputedStyle(t.querySelector('th.c3-cc')).display};});
out.fab2=await page.evaluate(()=>{const f=document.querySelector('#dx-card .c3-fab');return !!f&&f.checkVisibility();});await shot('pc_1366_ventilation_compacte.png');
await chg('#dx-vent [data-c3="cost"]',true);out.cost=await page.evaluate(()=>{const t=document.querySelector('#dx-vent .c3-vt');return {cls:t.classList.contains('c3-cost'),d:getComputedStyle(t.querySelector('th.c3-cc')).display,n:[...t.querySelectorAll('thead th')].filter(x=>x.checkVisibility()).length};});await chg('#dx-vent [data-c3="cost"]',false);
await click('dxc3vz|'+encodeURIComponent(K('z1|x').split('|')[0]));await wait(300);out.zf=await page.evaluate(()=>{const th=document.querySelector('#dx-vent th.c3-zf');return th?{w:Math.round(th.getBoundingClientRect().width),t:th.textContent.trim()}:null;});
await click('dxc3vz|'+encodeURIComponent(K('z1|x').split('|')[0]));await wait(300);
await click('dxc3calc|');await wait(900);out.back=await page.evaluate(()=>{const c=document.querySelector('#dx-calc .c2-top'),h=document.getElementById('homeBody');if(!c)return null;const r=c.getBoundingClientRect(),b=h.getBoundingClientRect();return r.top>=b.top-2&&r.bottom<=b.bottom;});
out.fab3=await page.evaluate(()=>{const f=document.querySelector('#dx-card .c3-fab');return !!f&&f.checkVisibility();});
console.log('d1) disposition :',JSON.stringify(out));
C.d1=out.g.join()===['inst',K('z0|x').split('|')[0],K('z1|x').split('|')[0],K('z2|x').split('|')[0],'auto'].join()&&out.gh.join('|')==='▾ 🏗 Installations|▾ Zone 1|▾ Zone 2|▾ Zone 3|▾ ✔ Autocontrôles'
  &&out.inst.join()===[K('z0|amene')+'·Zone 1',K('z0|conteneur')+'·Zone 1'].join()&&out.chips.join('|')==='🏗 Installations|Zone 1|Zone 2|Zone 3|✔ Autocontrôles'&&!out.fab
  &&out.fold&&out.fold.cls&&!out.fold.rows&&/c\|z:/.test(out.ls||'')&&out.fold2&&out.go&&out.go.open&&out.go.inCalc&&out.go.top>=-4&&out.go.top<=40
  &&out.flt.length===3&&out.flt[0]==='inst=2'&&out.flt[1].startsWith(K('z0|x').split('|')[0]+'=')&&/^auto=\d+$/.test(out.flt[2])
  &&out.vent.sw<=out.vent.cw&&out.vent.th.join('|')==='Poste|Zone 1 900 ml|Zone 2 250 ml|Zone 3 150 ml|Total vente|Reste'&&out.vent.cc==='none'&&out.fab2&&out.cost.cls&&out.cost.d==='table-cell'&&out.cost.n===11
  &&out.zf&&out.zf.w<=40&&out.back&&!out.fab3;
// ── d2) la ventilation SOUS le calculateur : autre écran (DPGF dans une 2e fenêtre), puis côte à côte à 1 920 px
await gridTop();const [pop]=await Promise.all([ctx.waitForEvent('page'),click('dxpop|')]);watch(pop);await wait(900);await pop.click('#dx-vp td[data-r="12"][data-c="5"]');await wait(600);
out={calc:await rect('#dx-calc'),vent:await rect('#dx-vent'),card:await rect('#dx-card')};await page.evaluate(()=>{document.getElementById('homeBody').scrollTop=0;document.getElementById('dx-card').scrollIntoView({block:'start'});});await wait(300);await shot('pc_1366_autre_ecran_calculateur.png');
await shot('pc_1366_autre_ecran_grille.png',pop);
await pop.evaluate(()=>document.querySelector('[data-v="dxpopclose|"]').click());await wait(800);
await page.setViewportSize({width:1920,height:1080});await click('dxlay|side');await wait(500);await gridTop();await page.click(td(9,5));await wait(700);
out.side={grid:await rect('#dx-grid'),calc:await rect('#dx-calc'),vent:await rect('#dx-vent'),cols:await page.evaluate(()=>{const g=document.querySelector('#dx-cl .c3-gb');return g?getComputedStyle(g).gridTemplateColumns.split(' ').length:0;})};
await shot('pc_1920_cote_a_cote.png');
{const [pop2]=await Promise.all([ctx.waitForEvent('page'),click('dxpop|')]);watch(pop2);await wait(900);await pop2.click('#dx-vp td[data-r="11"][data-c="5"]');await wait(600);await gridTop();out.p2={calc:await rect('#dx-calc'),vent:await rect('#dx-vent'),cols:await page.evaluate(()=>{const g=document.querySelector('#dx-cl .c3-gb');return g?getComputedStyle(g).gridTemplateColumns.split(' ').length:0;})};
  await shot('pc_1920_autre_ecran_principal.png');await shot('pc_1920_autre_ecran_grille.png',pop2);await pop2.evaluate(()=>document.querySelector('[data-v="dxpopclose|"]').click());await wait(800);}
await click('dxlay|stack');await page.setViewportSize({width:1366,height:768});await wait(400);
console.log('d2) ventilation sous le calculateur :',JSON.stringify(out));
C.d2=out.vent.t>=out.calc.b-2&&out.calc.w>=0.9*out.card.w&&out.vent.w>=0.9*out.card.w&&out.side.calc.l>=out.side.grid.r-2&&out.side.vent.t>=out.side.calc.b-2&&out.side.vent.l>=out.side.grid.r-2&&out.side.cols>=2
  &&out.p2.vent.t>=out.p2.calc.b-2&&out.p2.calc.w>=1700&&out.p2.cols>=3;
await shut();
// ── s1) SOUDURES EN MOINS (zone 1 : DN 100, 120 → 100) : bandeau « Le chiffrage a changé », la liste en phrases (EN MOINS, pointées sur 2.1, 2.2, 3.1, sur-pointé de 20),
//    PU avant → après ; « Retirer au prorata des lignes » : chaque ligne garde 100 / 120 de sa part, PU réécrits et surlignés ; un seul ↶ (liens, PU, suivi), ↷
const pu0={9:await cellPu(9),10:await cellPu(10),16:await cellPu(16)};
await chif(async()=>{await click('chei|0');await chg('#eq-app [data-afx="e§dn.0.soud"]','100');});
await page.evaluate(()=>{document.getElementById('homeBody').scrollTop=0;});await wait(300);out={band:await band(),pill:await page.evaluate(()=>{const p=document.querySelector('#dx-card .c3-fab2');return p?p.textContent:'';})};await shot('pc_1366_bandeau.png');
await click('dxc3list|');await wait(600);let I=await its();out.items=I.map(x=>U(x.k)+' : '+x.t);await shot('pc_1366_liste_a_traiter.png');
const i100=I.find(x=>U(x.k)==='z0|soudure|dn100');out.i100=i100;a=await A();const before=JSON.stringify(a.dpgf);
await doIt('z0|soudure|dn100','pro');a=await A();out.after={E9:lk(a,'E9').comps.filter(x=>U(x.k)==='z0|soudure|dn100').map(x=>x.q),E10:lk(a,'E10').comps.filter(x=>U(x.k)==='z0|soudure|dn100').map(x=>x.q),E16:lk(a,'E16').comps.map(x=>x.q),P:Pof(a,'z0|soudure|dn100')};
out.pu={9:[pu0[9],lk(a,'E9').pu,await cellPu(9)],16:[pu0[16],lk(a,'E16').pu,await cellPu(16)]};out.flash=await page.evaluate(()=>{const s=document.getElementById('c3-flash');return !!s&&/outline/.test(s.textContent);});out.toast=await toast();
out.left=(await its()).map(x=>U(x.k));out.suivi=a.dpgf.suivi.q[K('z0|soudure|dn100')];
await click('dxundo|');await wait(500);a=await A();out.undo=JSON.stringify(a.dpgf)===before;out.left2=(await its()).map(x=>U(x.k));await click('dxredo|');await wait(500);a=await A();out.redo=Pof(a,'z0|soudure|dn100');
console.log('s1) soudures en moins :',JSON.stringify(out));
C.s1=/Le chiffrage a changé/.test(out.band)&&/à traiter/.test(out.band)&&/Soudure DN 100 : 20 soudures en moins/.test(out.band)&&/changements? à traiter/.test(out.pill)
  &&out.i100&&/^20 soudures EN MOINS \(120 → 100\) — pointées sur 2\.1, 2\.2, 3\.1 : sur-pointé de 20$/.test(out.i100.t)&&/2\.1 [\d ,]+ → [\d ,]+ €/.test(sp(out.i100.pu))&&out.i100.b.join()==='pro,dxc3pick,ok'.replace('dxc3pick',encodeURIComponent(K('z0|soudure|dn100')))
  &&Math.abs(out.after.E9[0]-46.667)<0.0011&&Math.abs(out.after.E10[0]-20)<0.0011&&Math.abs(out.after.E16[0]-33.333)<0.0011&&Math.abs(out.after.P-100)<1e-6
  &&out.pu[9][1]===out.pu[9][2]&&out.pu[9][1]<out.pu[9][0]&&out.pu[16][1]===out.pu[16][2]&&Math.abs(out.pu[16][1]-Math.round(out.pu[16][0]*100/120*100)/100)<0.011&&out.flash&&/PU réécrits?/.test(out.toast)
  &&!out.left.includes('z0|soudure|dn100')&&out.suivi===100&&out.undo&&out.left2.includes('z0|soudure|dn100')&&Math.abs(out.redo-100)<1e-6;
// ── s2) MANCHONS EN MOINS (les mêmes 20) : « Choisir ligne par ligne » — tout sur la 2.1 ; la somme doit faire le retrait
I=await its();out={i:I.find(x=>U(x.k)==='z0|manchons|dn100')};await click('dxc3pick|'+encodeURIComponent(K('z0|manchons|dn100')));await wait(500);
out.pk=await page.evaluate(()=>{const b=document.querySelector('#c3-dlg .c3-pk');return b?{n:b.querySelectorAll('[data-c3="rm"]').length,sum:b.querySelector('[data-c3="sum"]').textContent,dis:b.querySelector('[data-v$="|pick"]').disabled}:null;});
const setRm=async(id,v)=>{await page.evaluate(([id,v])=>{const i=[...document.querySelectorAll('#c3-dlg [data-c3="rm"]')].find(x=>x.dataset.l===id);i.value=v;i.dispatchEvent(new Event('input',{bubbles:true}));},[id,v]);await wait(150);};
a=await A();const id9=lk(a,'E9').id,id10=lk(a,'E10').id;await setRm(id9,'10');await setRm(id10,'0');out.half=await page.evaluate(()=>{const b=document.querySelector('#c3-dlg .c3-pk');return {sum:b.querySelector('[data-c3="sum"]').textContent,dis:b.querySelector('[data-v$="|pick"]').disabled};});
await setRm(id9,'20');out.full=await page.evaluate(()=>{const b=document.querySelector('#c3-dlg .c3-pk');return {sum:b.querySelector('[data-c3="sum"]').textContent,dis:b.querySelector('[data-v$="|pick"]').disabled};});await shot('pc_1366_ligne_par_ligne.png');
await doIt('z0|manchons|dn100','pick');a=await A();out.m={E9:lk(a,'E9').comps.filter(x=>U(x.k)==='z0|manchons|dn100').map(x=>x.q),E10:lk(a,'E10').comps.filter(x=>U(x.k)==='z0|manchons|dn100').map(x=>x.q),P:Pof(a,'z0|manchons|dn100')};
console.log('s2) ligne par ligne :',JSON.stringify(out));
C.s2=out.i&&/^20 manchons EN MOINS \(120 → 100\) — pointés sur 2\.1, 2\.2 : sur-pointé de 20$/.test(out.i.t)&&out.pk&&out.pk.n===2&&/✓ 20 \/ 20/.test(out.pk.sum)&&!out.pk.dis&&/il manque 10/.test(out.half.sum)&&out.half.dis&&/✓ 20 \/ 20/.test(out.full.sum)&&!out.full.dis
  &&out.m.E9[0]===64&&out.m.E10[0]===36&&out.m.P===100;
// ── s8) AUTOCONTRÔLE PAR TYPE : l'Itopo de la 4.2 portait 120 manchons, il en reste 100 → sur-pointé de 20 (par type) ; au prorata → 100 manchons
I=await its();out={i:I.find(x=>U(x.k)==='z0|autoctrl|dn100')};if(out.i)await doIt('z0|autoctrl|dn100','pro');a=await A();out.L=lk(a,'E24').comps;
console.log('s8) autocontrôle par type :',JSON.stringify(out));
C.s8=out.i&&/^20 manchons EN MOINS \(120 → 100\) — pointés sur 4\.2 : sur-pointé de 20$/.test(out.i.t)&&out.i.b.join()==='pro,ok'&&out.L.length===1&&out.L[0].sub==='itopo'&&out.L[0].x===100&&Math.abs(out.L[0].q-40)<1e-6;
await click('dxc3close|').catch(()=>{});
// ── s3 / s4 / s5) EN PLUS : DN 80 50 → 60 (au prorata des lignes déjà pointées), DN 65 40 → 46 (sur une ligne : 5.1, sans lien → un lien neuf), DN 50 30 → 36 (laisser dans le reste)
await chif(async()=>{await click('chei|0');await chg('#eq-app [data-afx="e§dn.1.soud"]','60');await click('chei|1');await chg('#eq-app [data-afx="e§dn.0.soud"]','46');await click('chei|2');await chg('#eq-app [data-afx="e§dn.0.soud"]','36');});
await click('dxc3list|');await wait(600);I=await its();out={i80:I.find(x=>U(x.k)==='z0|soudure|dn80'),i65:I.find(x=>U(x.k)==='z1|soudure|dn65'),i50:I.find(x=>U(x.k)==='z2|soudure|dn50')};
out.opts=await page.evaluate(k=>{const s=[...document.querySelectorAll('#c3-dlg select[data-c3="one"]')].find(x=>x.dataset.k===k);return s?[...s.options].map(o=>o.value+'='+o.textContent.trim()).slice(0,3):null;},K('z1|soudure|dn65'));
await doIt('z0|soudure|dn80','pro');a=await A();out.e11=lk(a,'E11').comps.filter(x=>U(x.k)==='z0|soudure|dn80').map(x=>x.q);out.pu11=[lk(a,'E11').pu,await cellPu(11)];
await page.evaluate(k=>{const s=[...document.querySelectorAll('#c3-dlg select[data-c3="one"]')].find(x=>x.dataset.k===k);s.value='R:27';s.dispatchEvent(new Event('change',{bubbles:true}));},K('z1|soudure|dn65'));await doIt('z1|soudure|dn65','one');
a=await A();const L51=(a.dpgf.liens||[]).filter(L=>L.a==='E27');out.l51=L51.map(L=>L.comps.map(x=>U(x.k)+'='+x.q).join('+'));out.pu27=await cellPu(27);out.e12=lk(a,'E12').comps.filter(x=>U(x.k)==='z1|soudure|dn65').map(x=>x.q);
const r50=Pof(a,'z2|soudure|dn50');await doIt('z2|soudure|dn50','keep');a=await A();out.keep={P:[r50,Pof(a,'z2|soudure|dn50')],ref:a.dpgf.suivi.q[K('z2|soudure|dn50')],left:(await its()).map(x=>U(x.k))};
const v65=await comp(NUM,'z1|soudure|dn65');
console.log('s3-s5) en plus :',JSON.stringify(out));
C.s3=out.i80&&/^10 soudures EN PLUS \(50 → 60\) — pointées sur 2\.3 : 10 à imputer$/.test(out.i80.t)&&out.i80.b[0]==='pro'&&out.e11.join()==='60'&&out.pu11[0]===out.pu11[1];
C.s4=out.i65&&/^6 soudures EN PLUS \(40 → 46\) — pointées sur 2\.4 : 6 à imputer$/.test(out.i65.t)&&out.opts&&/^L:/.test(out.opts[0])&&/2\.4 · déjà 40 soudures/.test(out.opts[0])&&out.l51.join()==='z1|soudure|dn65=6'&&out.e12.join()==='40'&&Math.abs(out.pu27-Math.round(v65.vente/46*6*100)/100)<0.011;
C.s5=out.i50&&/^6 soudures EN PLUS \(30 → 36\) — pointées sur 2\.5 : 6 à imputer$/.test(out.i50.t)&&out.keep.P[0]===out.keep.P[1]&&out.keep.ref===36&&!out.keep.left.includes('z2|soudure|dn50');
// le reste (manchons des mêmes DN en plus, …) : tout traité au prorata d'un coup
if((await its()).length){await click('dxc3all|');await wait(600);}
// ── s6) INSTALLATION RÉPARTIE AU ML : l'amené / repli (2.1, 2.2, 2.3 au ml de la zone) — montant changé (A/R de la MO : 2 → 3) puis ml de la zone changé (DN 100 : 600 → 660 ml) ;
//    « ↻ Refaire la balance sur les 3 lignes » : mêmes proportions (420 / 180 / 300), tout pointé, chaque ligne = sa part du nouveau montant
await chif(async()=>{await click('chei|0');await unfold('chantier');await chg('#eq-app [data-afx="e§chantier.arMOQty"]','3');});
await click('dxc3list|');await wait(600);I=await its();out={iam:I.find(x=>U(x.k)==='z0|amene')};const am=await comp(NUM,'z0|amene');
await doIt('z0|amene','bal');a=await A();const qa=['E9','E10','E11'].map(x=>lk(a,x).comps.filter(c=>U(c.k)==='z0|amene').map(c=>c.q)[0]);out.qa=qa;
out.amt=['E9','E10','E11'].map(x=>{const L=lk(a,x);return L.comps.filter(c=>U(c.k)==='z0|amene').reduce((s,c)=>s+c.q,0);});
await chif(async()=>{await click('chei|0');await chg('#eq-app [data-afx="e§dn.0.ml"]','660');});
await click('dxc3list|');await wait(600);I=await its();out.iml=I.find(x=>U(x.k)==='z0|amene');await doIt('z0|amene','bal');a=await A();out.qa2=['E9','E10','E11'].map(x=>lk(a,x).comps.filter(c=>U(c.k)==='z0|amene').map(c=>c.q)[0]);out.P2=Pof(a,'z0|amene');
const am2=await comp(NUM,'z0|amene');
console.log('s6) installation répartie :',JSON.stringify(out),JSON.stringify({am,am2}));
C.s6=out.iam&&/^montant [\d ]+ € → [\d ]+ € — réparti sur 3 lignes \(2\.1, 2\.2, 2\.3\)$/.test(out.iam.t)&&out.iam.b[0]==='bal'&&out.iam.bt[0]==='↻ Refaire la balance sur les 3 lignes'
  &&qa.join()==='420,180,300'&&out.iml&&/^900 → 960 ml au chiffrage, montant (inchangé|[\d ]+ € → [\d ]+ €) : l'installation se répartit sur plus de ml ; tes 3 lignes \(2\.1, 2\.2, 2\.3\) gardent leurs ml/.test(out.iml.t)&&out.iml.b[0]==='keep' /* 19/10 (lot DY) : ml en plus au chiffrage, lignes inchangées → « Laisser à placer » d'office ; la suite clique la balance (2e bouton) */&&Math.abs(out.qa2[0]-448)<0.0011&&Math.abs(out.qa2[1]-192)<0.0011&&Math.abs(out.qa2[2]-320)<0.0011&&Math.abs(out.P2-960)<1e-6;
if((await its()).length){await click('dxc3all|');await wait(600);}
await click('dxc3close|').catch(()=>{});
// ── s7) PRIX SEUL (cadence DN 100 retouchée : même nombre de soudures, autre prix) : « prix : a → b € / soudure — 3 lignes » ; ↻ Appliquer ces 3 lignes
await chif(async()=>{await click('chei|0');await chg('#eq-app [data-afx="e§dn.0.cad"]','7');});
await click('dxc3list|');await wait(600);I=await its();out={ip:I.find(x=>U(x.k)==='z0|soudure|dn100'),stale:await page.evaluate(()=>[...document.querySelectorAll('#dx-vp td.dx-lks')].map(x=>x.dataset.r))};
await doIt('z0|soudure|dn100','apply');a=await A();out.after=['E9','E10','E16'].map(x=>{const L=lk(a,x);return L?L.pu:null;});out.cells=[await cellPu(9),await cellPu(10),await cellPu(16)];out.stale2=await page.evaluate(()=>[...document.querySelectorAll('#dx-vp td.dx-lks')].map(x=>x.dataset.r));
console.log('s7) prix seul :',JSON.stringify(out));
C.s7=out.ip&&/^prix : [\d ,]+ → [\d ,]+ € \/ soudure — 3 lignes \(2\.1, 2\.2, 3\.1\)$/.test(out.ip.t)&&out.ip.b.join()==='apply,ok'&&['9','10','16'].every(r=>out.stale.includes(r))&&out.after.join()===out.cells.join()&&!['9','10','16'].some(r=>out.stale2.includes(r));
if((await its()).length){await click('dxc3all|');await wait(600);}await click('dxc3close|').catch(()=>{});
// ── s9) TOUT D'UN COUP : la marge change (tous les prix) + 10 soudures DN 100 en moins → « Tout traiter au prorata » ; un seul ↶ remet tout (liens, PU, suivi) ; ↷
await chif(async()=>{await page.evaluate(n=>{const T=window.TRACE.affaires;const a=T.get(n);T.set(n,{chiffrage:Object.assign({},a.chiffrage,{marge:0.16})});},NUM);await click('chei|0');await chg('#eq-app [data-afx="e§dn.0.soud"]','90');});
a=await A();const b9=JSON.stringify(a.dpgf);out={band:await band()};await click('dxc3list|');await wait(600);I=await its();out.n=I.length;out.kinds=I.map(x=>x.b[0]);out.allTxt=sp(await page.$eval('#c3-dlg .c3-all',e=>e.textContent).catch(()=>''));
await click('dxc3all|');await wait(800);a=await A();out.after={band:await band(),dlg:!!await page.$('#c3-dlg'),stale:await page.evaluate(()=>document.querySelectorAll('#dx-vp td.dx-lks').length),vstale:!!await page.$('#dx-vent .dx-stale'),P100:Pof(a,'z0|soudure|dn100')};out.toast=await toast();
await click('dxundo|');await wait(600);a=await A();out.undo=JSON.stringify(a.dpgf)===b9;out.band2=await band();await click('dxredo|');await wait(600);out.band3=await band();
console.log('s9) tout traiter :',JSON.stringify(out));
C.s9=/Le chiffrage a changé : \d+ changements à traiter/.test(out.band)&&out.n>=8&&out.kinds.includes('pro')&&out.kinds.includes('apply')&&/\d+ PU changent/.test(out.allTxt)&&out.after.band===''&&!out.after.dlg&&out.after.stale===0&&!out.after.vstale&&Math.abs(out.after.P100-90)<1e-6
  &&/Tout traité au prorata/.test(out.toast)&&out.undo&&/changements à traiter/.test(out.band2)&&out.band3==='';
// ── k2) SST SUPPRIMÉE : on retire la 1re SST DN 80 (pointée sur 3.5) ; la 2e (pointée sur 3.2) garde son lien et son prix ; la supprimée : « supprimée — pointée sur 3.5 » → retirée
a=await A();const l32=lk(a,'E17');const pu32=l32.pu;
await chif(async()=>{await click('chei|0');await unfold('sst');await click('chrm|sst|0');});
a=await A();out={k32:lk(a,'E17').comps.map(x=>x.k),stale32:await page.evaluate(s=>document.querySelector(s).classList.contains('dx-lks'),td(17,5)),pu32:[pu32,await cellPu(17)],band:await band()};
await click('dxc3list|');await wait(600);I=await its();out.del=I.find(x=>/supprimée/.test(x.t));out.n=I.length;await shot('pc_1366_sst_supprimee.png');
if(out.del)await click('dxc3do|'+encodeURIComponent(out.del.k)+'|del');await wait(500);
a=await A();out.after={e20:(a.dpgf.liens||[]).filter(L=>L.a==='E20').length,ed20:(((a.dpgf.xl||{}).ed||{}).DPGF||{}).E20||null,cell20:await cellPu(20),band:await band()};
console.log('k2) SST supprimée :',JSON.stringify(out));
C.k2=out.k32.length===1&&out.k32[0]===K(KSST1)&&!out.stale32&&out.pu32[0]===out.pu32[1]&&/supprimée/.test(out.band)&&out.del&&/^supprimée du chiffrage — pointée sur 3\.5$/.test(out.del.t)&&out.del.b.join()==='del,ok'&&out.n===1
  &&out.after.e20===0&&out.after.ed20===null&&isNaN(out.after.cell20)&&out.after.band==='';
// ── k3) ZONES RÉORDONNÉES (zone 3 avant la zone 2) : les liens restent sur leur composante (aucun prix à reprendre, rien à traiter)
a=await A();const pus=Object.fromEntries((a.dpgf.liens||[]).map(L=>[L.a,L.pu]));
await chif(async()=>{await page.evaluate(n=>{const T=window.TRACE.affaires;const a=T.get(n);const E=a.chiffrage.etudes.slice();T.set(n,{chiffrage:Object.assign({},a.chiffrage,{etudes:[E[0],E[2],E[1]]})});},NUM);});
a=await A();out={stale:await page.evaluate(()=>document.querySelectorAll('#dx-vp td.dx-lks').length),band:await band(),pus:(a.dpgf.liens||[]).every(L=>L.pu===pus[L.a]),vent:await page.$$eval('#dx-vent .c3-vt thead th.c3-zh .c3-zn',L=>L.map(x=>x.textContent)),
  calc12:await (async()=>{await gridTop();await page.click(td(12,5));await wait(500);return sp(await page.$eval('#dx-cres',e=>e.textContent)).replace(/↦.*$/,'').trim();})()};
console.log('k3) zones réordonnées :',JSON.stringify(out));
C.k3=out.stale===0&&out.band===''&&out.pus&&out.vent.join()==='Zone 1,Zone 3,Zone 2'&&/= [\d ,]+ € \/ ml$/.test(out.calc12);await shut();
// ── k4) ZONE SUPPRIMÉE (la zone 3, DN 50 + sa SST : pointées sur 2.5, 3.3) : « supprimée » × 3 (soudures, manchons, SST) ; tout traiter → liens vidés retirés, PU remis
await chif(async()=>{await click('chei|1');await click('chetuderm|');});
await click('dxc3list|');await wait(600);I=await its();out={n:I.length,t:I.map(x=>x.t),z:I.map(x=>sp(x.k))};await click('dxc3all|');await wait(700);a=await A();
out.after={l:(a.dpgf.liens||[]).filter(L=>['E13','E18'].includes(L.a)).length,ed:['E13','E18'].map(x=>(((a.dpgf.xl||{}).ed||{}).DPGF||{})[x]||null),band:await band(),cells:[await cellPu(13),await cellPu(18)]};
console.log('k4) zone supprimée :',JSON.stringify(out));
C.k4=out.n===3&&out.t.every(t=>/^supprimée du chiffrage — pointée sur 2\.5|^supprimée du chiffrage — pointée sur 3\.3/.test(t))&&out.after.l===0&&out.after.ed.every(x=>x===null)&&out.after.band===''&&out.after.cells.every(x=>isNaN(x)||x===0);
await shot('pc_1366_apres_traitements.png');
// ── v1) CONSULTATION D'UNE VERSION : un changement en attente (DN 65 : 46 → 50) puis ＋ Nouvelle version ; la v1 consultée : pas de bandeau, pas de liste, rien qui écrit
await chif(async()=>{await click('chei|1');await chg('#eq-app [data-afx="e§dn.0.soud"]','50');});out={cur:await band()};
await click('tab|chiffrage');await click('vnew|');await page.evaluate(()=>{document.getElementById('vv-note').value='Essai suivi';document.getElementById('vv-ok').click();});await wait(500);
await click('vview|1');await click('tab|dpgf');await page.waitForSelector('#dx-vp',{timeout:15000});await wait(700);
out.v1={band:await band(),list:await has('dxc3list|'),c3do:await page.evaluate(()=>!!document.querySelector('#eq-app [data-v^="dxc3do|"],#eq-app [data-v="dxc3all|"]')),pill:await page.evaluate(()=>!!document.querySelector('#dx-card .c3-fab2')),vv:sp(await page.$eval('#eq-app .vv-band',e=>e.textContent).catch(()=>'')).slice(0,40)};
await click('vexit|');await wait(500);await toDpgf();out.back=await band();
console.log('v1) consultation :',JSON.stringify(out));
C.v1=/changements? à traiter/.test(out.cur)&&/Tu consultes la v1/.test(out.v1.vv)&&out.v1.band===''&&!out.v1.list&&!out.v1.c3do&&!out.v1.pill&&/changements? à traiter/.test(out.back);
// ── t1) TÉLÉPHONE 390 px : bandeau, liste plein écran, boutons ≥ 34 px (≥ 40 px pour Tout traiter), rien ne déborde ; le bouton flottant disparaît sous le calculateur ouvert
await page.setViewportSize({width:390,height:844});await page.evaluate(()=>{document.getElementById('app').classList.remove('wide');});await toDpgf();await shut();
await page.evaluate(()=>{document.getElementById('dx-card').scrollIntoView({block:'start'});});await wait(300);
out={sw:await page.evaluate(()=>document.documentElement.scrollWidth),band:await rect('#c3-band')};await shot('tel_390_bandeau.png');
out.fabNav=await page.evaluate(()=>{const f=document.querySelector('#dx-card .c3-fab'),h=document.getElementById('homeTabs');if(!f||!f.checkVisibility())return 'caché';return h?Math.round(h.getBoundingClientRect().top-f.getBoundingClientRect().bottom):99;}); /* le bouton flottant au-dessus de la barre d'onglets du bas */
out.bandBtn=await page.$eval('#c3-band .btn',b=>Math.round(b.getBoundingClientRect().height)).catch(()=>0);
await click('dxc3list|');await wait(600);out.dlg=await rect('#c3-dlg');out.small=await page.$$eval('#c3-dlg button, #c3-dlg select, #c3-dlg input',L=>L.filter(b=>b.offsetParent&&b.getBoundingClientRect().height<34).map(b=>(b.textContent||b.dataset.c3||'').trim().slice(0,20)));
out.prim=await page.$$eval('#c3-dlg .btn.primary',L=>L.filter(b=>b.offsetParent&&b.getBoundingClientRect().height<40).map(b=>b.textContent.trim().slice(0,20))); /* boutons principaux ≥ 40 px */
out.over=await page.evaluate(()=>{const c=document.getElementById('c3-dlg');return [...c.querySelectorAll('*')].filter(e=>{const r=e.getBoundingClientRect();return e.offsetParent&&r.width>0&&(r.right>window.innerWidth+1||r.left<-1);}).map(e=>e.className||e.tagName).slice(0,5);});
out.all=await page.$eval('#c3-dlg .c3-all .btn',e=>Math.round(e.getBoundingClientRect().height)).catch(()=>0);await shot('tel_390_liste.png');await click('dxc3close|');
await page.click(td(12,5));await wait(700);out.sheet={pos:await page.$eval('#dx-calc',e=>getComputedStyle(e).position),fab:await page.evaluate(()=>{const f=document.querySelector('#dx-card .c3-fabs');return !!f&&f.checkVisibility();}),
  small:await page.$$eval('#dx-calc button, #dx-calc select, #dx-calc input:not([type=checkbox])',L=>L.filter(b=>b.offsetParent&&b.getBoundingClientRect().height<34).map(b=>(b.textContent||'').trim().slice(0,20))),sw:await page.evaluate(()=>document.documentElement.scrollWidth)};
await shot('tel_390_calculateur.png');await shut();
console.log('t1) téléphone 390 px :',JSON.stringify(out));
C.t1=out.sw<=390&&out.band&&out.band.r<=390&&(out.fabNav==='caché'||out.fabNav>=4)&&out.bandBtn>=40&&!out.prim.length&&out.dlg&&out.dlg.w===390&&!out.small.length&&!out.over.length&&out.all>=40&&out.sheet.pos==='fixed'&&!out.sheet.fab&&!out.sheet.small.length&&out.sheet.sw<=390;
await page.setViewportSize({width:1366,height:768});await page.evaluate(()=>{document.getElementById('app').classList.add('wide');});
// ── o1) UN DPGF POINTÉ AVANT CE LOT (fixture_dpgf_clair_avant.json, anciennes clés « z0|… ») : s'affiche et se calcule à l'identique, aucune fausse alerte ;
//    la référence est prise à la 1re ouverture (anciennes clés figées) ; puis la zone 1 supprimée : ses lignes sont signalées, celles de la zone 2 restent justes
await page.close();const page2=await ctx.newPage();watch(page2);const S2=await setupAffaire(page2,BASE+'/index.html',HERE);const REC=JSON.parse(fs.readFileSync(path.join(HERE,'fixture_dpgf_clair_avant.json'),'utf8'));
const A2=()=>page2.evaluate(n=>window.TRACE.affaires.get(n),S2.NUM);const click2=S2.click;
const disp2=()=>page2.evaluate(()=>{const sp=t=>String(t||'').replace(/[\s\u00A0\u202F]+/g,' ').trim();return {vsum:sp((document.querySelector('#dx-vent .dx-vsum')||{}).textContent).replace(/⇶.*$/,'').trim(),rows:[...document.querySelectorAll('#dx-vent .dx-vt tbody tr')].map(r=>[...r.cells].map(c=>sp(c.textContent))),
  cells:Object.fromEntries([6,7,10,11,12,13,14,17,18,19,22,23,24,25,28].map(r=>[r,[5,6].map(c=>sp((document.querySelector(`#dx-vp td[data-r="${r}"][data-c="${c}"]`)||{}).textContent))])),band:sp((document.getElementById('c3-band')||{}).textContent),lks:document.querySelectorAll('#dx-vp td.dx-lks').length};});
await page2.evaluate(([n,d])=>{const T=window.TRACE.affaires;const a=T.get(n);T.set(n,{dpgf:Object.assign({},a.dpgf,d)});},[S2.NUM,REC.dpgf]);await click2('tab|offre');await click2('tab|dpgf');await page2.waitForSelector('#dx-vp',{timeout:15000});await page2.waitForTimeout(1200);
let a2=await A2();out={d:await disp2(),noWrite:JSON.stringify(a2.dpgf.liens)===JSON.stringify(REC.dpgf.liens)&&JSON.stringify(a2.dpgf.reps)===JSON.stringify(REC.dpgf.reps)&&JSON.stringify(a2.dpgf.xl)===JSON.stringify(REC.dpgf.xl),suivi:!!a2.dpgf.suivi,al:a2.dpgf.suivi&&Object.keys(a2.dpgf.suivi.al||{}).length};
const R0=REC.disp;out.same=out.d.vsum===R0.vsum.replace(/⇶.*$/,'').trim()&&JSON.stringify(out.d.rows)===JSON.stringify(R0.rows.map((r,i)=>r.map((c,j)=>j===0&&/^Autocontrôle interne/.test(r[0])?out.d.rows[i][0]:c)))&&JSON.stringify(out.d.cells)===JSON.stringify(R0.cells);
await page2.screenshot({path:path.join(SHOTS,'pc_1366_ancien_dpgf.png')});
// la zone 1 supprimée : avec les clés figées, les anciens liens de la zone 2 (« z1|… ») restent sur la zone 2 (devenue la 1re) ; ceux de la zone 1 sont « supprimée »
const z2before=a2.dpgf.liens.filter(L=>['E13','E14'].includes(L.a)).map(L=>L.pu);
await click2('tab|chiffrage');await click2('chei|0');await click2('chetuderm|');await click2('tab|offre');await click2('tab|dpgf');await page2.waitForSelector('#dx-vp',{timeout:15000});await page2.waitForTimeout(900);
await click2('dxc3list|');await page2.waitForTimeout(600);const I2=await page2.evaluate(()=>[...document.querySelectorAll('#c3-dlg .c3-it')].map(x=>({k:x.dataset.k,t:x.querySelector('.c3-is').textContent.replace(/[\s\u00A0\u202F]+/g,' ').trim(),z:x.querySelector('.c3-iz').textContent})));
a2=await A2();const CP2=await page2.evaluate(n=>{const T=window.TRACE.affaires;const a=T.get(n);return a.chiffrage.etudes.map(z=>z.id);},S2.NUM);
out.del=I2.filter(x=>/supprimée/.test(x.t)).length;out.z2=I2.filter(x=>!/supprimée/.test(x.t)).map(x=>x.t);out.zn=[...new Set(I2.map(x=>x.z))];
out.z2keep=await page2.evaluate(()=>[...document.querySelectorAll('#dx-calc .dx-cr.on')].length);await page2.screenshot({path:path.join(SHOTS,'pc_1366_ancien_dpgf_zone_supprimee.png')});
console.log('o1) ancien DPGF :',JSON.stringify({same:out.same,noWrite:out.noWrite,band:out.d.band,lks:out.d.lks,suivi:out.suivi,al:out.al,del:out.del,z2:out.z2,zn:out.zn,z2keep:out.z2keep}));
// le sur-pointage réel d'un DPGF d'avant ce lot est signalé dès la 1re ouverture (3.1 : 30 → 50 soudures DN 100 : 140 pour 120)
const REC2=JSON.parse(JSON.stringify(REC.dpgf));REC2.liens.find(L=>L.a==='E17').comps[0].q=50;await page2.close();
/* une affaire neuve pour l'essai du sur-pointage (la zone 1 a été retirée de la précédente) */
const page3=await ctx.newPage();watch(page3);const S3=await setupAffaire(page3,BASE+'/index.html',HERE);
/* une version figée AVANT la 1re ouverture du DPGF (donc sans suivi) : le suivi posé à l'ouverture n'est pas une « modification » pour l'historique des versions */
await S3.click('tab|chiffrage');await page3.evaluate(([n,d])=>{const T=window.TRACE.affaires;const a=T.get(n);T.set(n,{dpgf:Object.assign({},a.dpgf,d)});},[S3.NUM,REC2]);
await S3.click('vnew|');await page3.evaluate(()=>{document.getElementById('vv-note').value='Essai';document.getElementById('vv-ok').click();});await page3.waitForTimeout(500);
out.v1sv=await page3.evaluate(n=>{const a=window.TRACE.affaires.get(n);const v=(a.chiffrages||[]).find(x=>x&&+x.v===1);const d=v&&v.snap&&v.snap.dpgf;return d?{liens:(d.liens||[]).length,suivi:!!d.suivi}:null;},S3.NUM);
await S3.click('tab|offre');await S3.click('tab|dpgf');await page3.waitForSelector('#dx-vp',{timeout:15000});await page3.waitForTimeout(1200);
out.over=sp(await page3.$eval('#c3-band',e=>e.textContent).catch(()=>''));await S3.click('dxc3list|');await page3.waitForTimeout(600);out.overIt=await page3.evaluate(()=>[...document.querySelectorAll('#c3-dlg .c3-it .c3-is')].map(x=>x.textContent.replace(/[\s\u00A0\u202F]+/g,' ').trim()));
await page3.screenshot({path:path.join(SHOTS,'pc_1366_ancien_dpgf_sur_pointe.png')});await S3.click('dxc3close|').catch(()=>{});
out.sv3=await page3.evaluate(n=>!!((window.TRACE.affaires.get(n).dpgf||{}).suivi),S3.NUM);await S3.click('tab|chiffrage');await page3.waitForTimeout(500);
out.vchg=await page3.evaluate(()=>{const e=document.querySelector('.vv-hist .vv-row.cur .vv-chg');return e?e.textContent.replace(/[\s\u00A0\u202F]+/g,' ').trim():'(absent)';});await page3.close();
console.log('   sur-pointage à la 1re ouverture :',JSON.stringify({over:out.over,items:out.overIt,v1:out.v1sv,suivi:out.sv3,versions:out.vchg}));
C.o1=out.same&&out.noWrite&&out.d.band===''&&out.suivi&&out.al>=10&&out.del>=5&&out.z2.length===0&&out.zn.every(z=>/zone supprimée/.test(z))
  &&/Pointé au-delà du chiffrage : 1 composante à reprendre/.test(out.over)&&out.overIt.length===1&&/^pointé 140 pour 120 soudures — sur-pointé de 20/.test(out.overIt[0])
  &&out.v1sv&&out.v1sv.liens>0&&!out.v1sv.suivi&&out.sv3&&out.vchg!=='(absent)'&&!/DPGF/.test(out.vchg);
C.console=logs.length===0;
const bad=Object.entries(C).filter(([k,v])=>!v).map(([k])=>k);console.log(bad.length?'RESULTAT: ECHEC '+bad.join(','):'RESULTAT: TOUT VERT');console.log(logs.length?logs:'[]');
await browser.close();
