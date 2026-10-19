// LOT DY (19/10) — lire n'importe quel DPGF client (colonnes, unité, quantité, n°), des ml en plus au chiffrage = à placer, les installations toujours prenables au
// prorata des ml, « ↻ Reventiler » qui marche. Ethan (19/10, sur son DPGF) : « Reventiler par zone ne fonctionne pas […] si je valide, j'aurai 48 ml de chaque poste
// de pas pointés […] ça me met que toute l'installation est pointée et que je ne peux plus en pointer, ce qui doit être possible : aller pointer de l'installation au
// prorata des ml que je veux avoir ».
// Données 100 % FICTIVES : test/fixture_prix.xlsx (base de prix), test/fixture_dpgf_cols.xlsx (make_fixture_dpgfcols.py : titres dont « Détail des prix » au-dessus
// de l'en-tête, en-tête sur 2 lignes, « U.M. », PU en colonne O, colonnes vides, n° « 3.2.1 », quantités en formules) ; 2 zones aux noms fictifs : Zone Nord (essai)
// DN 100 : 30 soudures, 300 ml ; Zone Sud (essai) DN 80 : 24 soudures, 240 ml ; installations (contener, pelle, déchargement, DOE) ventilées AU PRIX.
// c1 la fixture lue juste à l'import (en-tête lignes 6-7, colonnes, unités, quantités en formules, n°) · c2 pointage des 4 lignes au ml (soudures + la part
// d'installations de la zone au prorata des ml) · c3 le DPGF tel que le build d'avant l'avait lu (en-tête = « Détail des prix », aucune ligne, liens « Calculer cette
// cellule ») : lu quand même — libellés « 2.1 », calculateur « 2.1 Tube… · Qté 180 m.l. », ml proposés, liste, récap ; bandeau · c4 l'écran « Colonnes du DPGF » :
// ce qui est compris, correction → lignes relues, « Appliquer » (un seul ↶, ↷), liens et PU intacts · c5 l'unité en un clic (ligne 4.2 sans unité) · c6 le scénario
// d'Ethan : +48 ml et des soudures au chiffrage → « Laisser à placer » d'office, un bouton pour les 3 installations, 48 ml à placer · c7 la nouvelle ligne 2.3 au ml :
// « prendre au prorata de mes ml » = reste + reprise, total inchangé, un seul ↶ · c8 tout est pointé → nouvelle ligne 3.2.3 : la case est toujours là (reprise sur
// 3.2.1, 3.2.2) · c9 « ↻ Reventiler » (ventilation changée) : écrit, total inchangé, « la Zone … rend … à la Zone … » · c10 une zone dont aucune ligne ne porte :
// sa part sur ses lignes au ml · c11 consultation d'une version : lecture seule · c12 téléphone 390 px · console.
// Captures : SHOTS (défaut /root/work/dy_shots).
import { chromium } from 'playwright';
import fs from 'fs';import path from 'path';import {fileURLToPath} from 'url';
import {cles} from './dpgf_cles.mjs';
const HERE=path.dirname(fileURLToPath(import.meta.url));
const BASE=process.env.BASE||'http://localhost:8810';const SHOTS=process.env.SHOTS||'/root/work/dy_shots';try{fs.mkdirSync(SHOTS,{recursive:true});}catch(e){}
const browser=await chromium.launch({headless:true, executablePath: process.env.CHROMIUM_PATH||undefined});
const ctx=await browser.newContext({viewport:{width:1366,height:768},acceptDownloads:true});const page=await ctx.newPage();
const logs=[];const watch=p=>{p.on('pageerror',e=>logs.push('PAGEERROR: '+e.message.slice(0,300)));p.on('console',m=>{if(m.type()==='error'&&!/supabase|Failed to fetch|net::ERR|404|WebSocket|pdf\.worker|cdnjs/i.test(m.text()))logs.push(m.text().slice(0,200));});p.on('dialog',d=>d.accept().catch(()=>{}));};watch(page);
const C={};const sp=t=>String(t||'').replace(/[\s  ]+/g,' ').trim();const wait=ms=>page.waitForTimeout(ms);
const nbv=t=>{const x=parseFloat(String(t||'').replace(/[\s  €]/g,'').replace(/[−–]/g,'-').replace(',','.'));return isFinite(x)?x:NaN;};
const NUM='O2610-94';const ZONES=[['Zone Nord (essai)',[[100,30,300]]],['Zone Sud (essai)',[[80,24,240]]]];
const chg=async(sel,val)=>{await page.evaluate(([s,v])=>{const el=document.querySelector(s);if(!el)throw new Error('absent '+s);if(el.type==='checkbox'||el.type==='radio'){el.checked=!!v;}else el.value=v;el.dispatchEvent(new Event('change',{bubbles:true}));},[sel,val]);await wait(150);};
const click=async v=>{await page.evaluate(v=>{const el=document.querySelector(`#eq-app [data-act=af][data-v="${v}"]`);if(!el)throw new Error('bouton absent '+v);el.click();},v);await wait(300);};
const has=v=>page.evaluate(v=>!!document.querySelector(`#eq-app [data-act=af][data-v="${v}"]`),v);
const td=(r,c)=>`#dx-vp td[data-r="${r}"][data-c="${c}"]`;const A=()=>page.evaluate(n=>window.TRACE.affaires.get(n),NUM);
const hideToast=(p,h)=>p.evaluate(h=>{const t=document.getElementById('toast');if(t)t.style.visibility=h?'hidden':'';},h).catch(()=>{});
const shot=async(name,p)=>{p=p||page;await hideToast(p,true);try{await p.screenshot({path:path.join(SHOTS,name)});}catch(e){console.log('(capture '+name+' : '+e.message.slice(0,80)+')');}await hideToast(p,false);};
const shotEl=async(name,sel,p)=>{p=p||page;await hideToast(p,true);try{const el=await p.$(sel);if(el)await el.screenshot({path:path.join(SHOTS,name)});else console.log('(capture '+name+' : '+sel+' absent)');}catch(e){console.log('(capture '+name+' : '+e.message.slice(0,80)+')');}await hideToast(p,false);};
const toast=()=>page.evaluate(()=>{const t=document.getElementById('toast');return t?t.textContent:'';});
const toDpgf=async()=>{await click('tab|offre');await click('tab|dpgf');await page.waitForSelector('#dx-vp',{timeout:15000});await wait(900);};
const shut=async()=>{if(await page.evaluate(()=>/\bflt\b/.test((document.querySelector('#dx-card .dx-split')||{}).className||'')))await click('dxrpshut|');};
const gridTop=async()=>{await page.evaluate(()=>{document.getElementById('dx-card').scrollIntoView({block:'start'});});await wait(250);};
const chif=async fn=>{await click('tab|chiffrage');await fn();await toDpgf();};
const openCalc=async r=>{await shut();await gridTop();await page.click(td(r,15));await wait(700);};
const its=()=>page.evaluate(()=>[...document.querySelectorAll('#c3-dlg .c3-it')].map(x=>({k:x.dataset.k,nm:x.querySelector('.c3-in').textContent.trim(),t:x.querySelector('.c3-is').textContent.replace(/[\s  ]+/g,' ').trim(),pu:((x.querySelector('.c3-pu')||{}).textContent||'').replace(/[\s  ]+/g,' ').trim(),b:[...x.querySelectorAll('.c3-acts [data-v]')].map(b=>b.dataset.v),bt:[...x.querySelectorAll('.c3-acts [data-v]')].map(b=>b.textContent.trim()),pr:((x.querySelector('.c3-acts .btn.primary')||{}).textContent||'').trim()})));
const small=(sel,min)=>page.$$eval(sel,(L,min)=>L.filter(b=>b.offsetParent&&b.getBoundingClientRect().height<min).map(b=>(b.textContent||b.dataset.v||b.type||'').trim().slice(0,24)),min);
const overflow=sel=>page.evaluate(s=>{const c=document.querySelector(s);if(!c)return ['absent'];return [...c.querySelectorAll('*')].filter(e=>{const r=e.getBoundingClientRect();return e.offsetParent&&r.width>0&&(r.right>window.innerWidth+1||r.left<-1);}).map(e=>e.className||e.tagName).slice(0,5);},sel);
const jd=a=>JSON.stringify(a.dpgf.liens);const lk=(a,ad)=>(a.dpgf.liens||[]).find(L=>L.a===ad);const r2=x=>Math.round(x*100)/100;
const tel=async on=>{await page.setViewportSize(on?{width:390,height:844}:{width:1366,height:768});await page.evaluate(on=>{document.getElementById('app').classList.toggle('wide',!on);},on);await wait(500);};
// ── mise en place : l'affaire, la base de prix, 2 zones, les installations ventilées au prix, le DPGF du client
await page.goto(BASE+'/index.html');await wait(600);await page.evaluate(()=>{localStorage.clear();localStorage.setItem('trace:wide','1');});await page.evaluate(()=>new Promise(r=>{try{const q=indexedDB.deleteDatabase('trace-kv');q.onsuccess=q.onerror=q.onblocked=()=>r();}catch(e){r();}}));
await page.reload();await wait(1200);{const s=await page.$('#loginSkip');if(s&&await s.isVisible())await s.click();await wait(700);}
await page.evaluate(async n=>{const T=window.TRACE;T.state.userId='ethan';T.renderHome();document.getElementById('htCom').click();await new Promise(x=>setTimeout(x,250));
  document.querySelector('#eq-app [data-act=af][data-v="new|"]').click();await new Promise(x=>setTimeout(x,150));document.getElementById('afn-num').value=n;document.getElementById('afn-nom').value='DPGF difficile (essai)';document.getElementById('afn-client').value='CLIENT TEST';document.getElementById('afn-etat').value='devis';
  document.querySelector('#eq-app [data-act=af][data-v="create|"]').click();await new Promise(x=>setTimeout(x,250));document.querySelector('#eq-app [data-act=af][data-v="tab|chiffrage"]').click();await new Promise(x=>setTimeout(x,200));},NUM);
await page.setInputFiles('#eq-app input[data-afprix]',path.join(HERE,'fixture_prix.xlsx'));await wait(1500);
const dnRow=async(i,dn,s,ml)=>{await click('chadd|dn');await chg(`#eq-app [data-afx="e§dn.${i}.dn"]`,String(dn));await chg(`#eq-app [data-afx="e§dn.${i}.soud"]`,String(s));await chg(`#eq-app [data-afx="e§dn.${i}.ml"]`,String(ml));};
for(const [nom,rows] of ZONES){await click('chetudeadd|');await chg('#eq-app [data-afx="e§nom"]',nom);for(let i=0;i<rows.length;i++)await dnRow(i,...rows[i]);}
await click('chview|inst');await chg('#eq-app [data-afx="inst§on"]',true);await chg('#eq-app [data-afx="inst§d0"]','2026-11-02');await chg('#eq-app [data-afx="inst§d1"]','2026-11-27');
await chg('#eq-app [data-afx="inst§items.contener.on"]',true);await chg('#eq-app [data-afx="inst§items.pelle.on"]',true);await chg('#eq-app [data-afx="inst§items.pelle.ar"]','2');
await chg('#eq-app [data-afx="inst§nbDecharg"]','2');await chg('#eq-app [data-afx="inst§doe"]',true);await chg('#eq-app [data-afx="inst§ventil"]','prix');
await click('tab|dpgf');
await page.setInputFiles('#eq-app [data-afdpgf]',{name:'DPGF_lot05_difficile.xlsx',mimeType:'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',buffer:fs.readFileSync(path.join(HERE,'fixture_dpgf_cols.xlsx'))});
await page.waitForSelector('#dx-vp',{timeout:15000});await wait(2600);
const {K,U}=await cles(page,NUM);
/* contrôle indépendant (prix.js) : la ventilation, le prix de vente de chaque installation, ce que chaque zone porte */
const info=()=>page.evaluate(n=>{const T=window.TRACE.affaires;const Cc=T.calc(T.get(n));const I=Cc.inst;const P=I.ventil.parts;const S=P.reduce((s,x)=>s+x,0);const ml=Cc.ml||0;const posts={};
  Object.keys(I.postes).forEach(k=>{if(I.postes[k].achat>0.005){const v=I.postes[k].achat/Cc.coef;posts[k]={amtV:v,puV:ml?v/ml:v/100,qty:ml||100};}});
  return {sh:P.map(x=>S>0?x/S:1/P.length),posts,toks:Cc.etudes.map(e=>'z:'+e.z.id),names:Cc.etudes.map(e=>e.z.nom),mode:I.ventil.mode,zml:Cc.etudes.map(e=>e.r.ml||0),ml};},NUM);
const instTot=(a,I)=>(a.dpgf.liens||[]).reduce((s,L)=>s+(L.comps||[]).reduce((t,x)=>{const m=/^inst\|([a-z_]+)$/.exec(x.k);return t+(m&&I.posts[m[1]]?(+x.q||0)*I.posts[m[1]].puV:0);},0),0);
const instQ=(a,p)=>(a.dpgf.liens||[]).reduce((s,L)=>s+(L.comps||[]).reduce((t,x)=>t+(x.k==='inst|'+p?(+x.q||0):0),0),0);
const porte=(a,I)=>{const o={};Object.keys(I.posts).forEach(p=>{o[p]=I.toks.map(()=>0);});(a.dpgf.liens||[]).forEach(L=>(L.comps||[]).forEach(x=>{const m=/^inst\|([a-z_]+)$/.exec(x.k);if(!m||!I.posts[m[1]])return;const i=I.toks.indexOf(x.zs);if(i>=0)o[m[1]][i]+=(+x.q||0)*I.posts[m[1]].puV;}));return o;};
const part=(I,p,i)=>I.sh[i]*I.posts[p].amtV;
const ecart=(a,I)=>{const P=porte(a,I);let m=0;Object.keys(I.posts).forEach(p=>I.toks.forEach((t,i)=>{m=Math.max(m,Math.abs(P[p][i]-part(I,p,i)));}));return m;};
const OLD={cols:{n:-1,des:0,u:-1,qte:-1,pu:-1,tot:-1},hdrRow:2,sheet:'xl/worksheets/sheet1.xml',sheetName:null}; /* ce que lisait le build d'avant (dpgfFromRows : la ligne « DPGF · Détail des prix » prise pour l'en-tête) */
// ── c1) la fixture lue JUSTE à l'import : en-tête sur les lignes 6-7, N° en A, désignation en B, U.M. en E, quantité en G, PU en O, total en P ; unités et
//        quantités (formules comprises) ; libellés « 3.2.1 »
let a=await A();let I=await info();const D1=a.dpgf;const ln=r=>(D1.lignes||[]).find(l=>!l.section&&l.row===r)||{};
let out={hdr:D1.hdrRow,cols:D1.cols,sheet:D1.sheetName,n:(D1.lignes||[]).filter(l=>!l.section).length,l11:ln(11),l12:ln(12),l18:ln(18),l19:ln(19),l20:ln(20),l23:ln(23),eff:await page.evaluate(n=>{const E=window.TRACE.dpgfCols&&window.TRACE.dpgfCols.eff(n);return E?{src:E.src,top:E.hdrTop}:null;},NUM)};
console.log('c1) lecture à l\'import :',JSON.stringify(out));
C.c1=out.hdr===7&&JSON.stringify(out.cols)===JSON.stringify({n:0,des:1,u:4,qte:6,pu:14,tot:15})&&out.n===11&&out.l11.n==='2.1'&&out.l11.u==='m.l.'&&out.l11.qte===180&&out.l12.qte===120&&out.l18.n==='3.2.1'&&out.l18.qte===160
  &&out.l19.u==='mètre linéaire'&&out.l20.u==='m'&&out.l23.n==='4.2'&&out.l23.u===''&&out.l23.qte===1&&!!out.eff&&out.eff.src==='D'&&out.eff.top===6&&I.mode==='prix'&&I.toks.length===2&&I.ml===540;
// ── c2) pointage des 4 lignes au ml (2.1, 2.2 en Zone Nord ; 3.2.1, 3.2.2 en Zone Sud) : « ☑ DN » (soudures, manchons, autocontrôle de la ligne) et, dans le
//        sous-bloc de la zone, chaque installation « au prorata de mes ml » (payée par le reste : la zone a 300 / 240 ml, les lignes aussi) → « Mettre »
const zb=i=>`#dx-calc .dz-zb[data-zi="${i}"]`;
const pointe=async(row,dn,zi)=>{await openCalc(row);await click('dxsugg|'+dn);await wait(300);const ks=await page.$$eval(zb(zi)+' input[data-dz="ck"]',L=>L.map(i=>i.dataset.k));
  for(const k of ks)await chg(`${zb(zi)} input[data-dz="ck"][data-k="${k}"]`,true);await click('dxput|');await wait(700);return ks;};
const ks11=await pointe(11,100,0);await pointe(12,100,0);await pointe(18,80,1);const ks19=await pointe(19,80,1);
a=await A();out={liens:a.dpgf.liens.map(L=>L.a+':'+L.comps.length).join(' '),inst:Object.fromEntries(Object.keys(I.posts).map(p=>[p,r2(instQ(a,p))])),ecart:r2(ecart(a,I)),tot:r2(instTot(a,I)),ks:ks11.length+'/'+ks19.length,
  zs:a.dpgf.liens.map(L=>L.comps.filter(x=>/^inst\|/.test(x.k)).map(x=>x.zs===I.toks[0]?'N':x.zs===I.toks[1]?'S':'-').join('')).join(',')};
console.log('c2) pointage :',JSON.stringify(out));
const instAll=Object.values(I.posts).reduce((s,p)=>s+p.amtV,0);
C.c2=a.dpgf.liens.map(L=>L.a).join()==='O11,O12,O18,O19'&&ks11.length===3&&ks19.length===3
  &&Object.keys(I.posts).length===3&&Object.keys(out.inst).every(p=>Math.abs(out.inst[p]-540)<0.01)&&out.ecart<0.05&&Math.abs(out.tot-instAll)<0.05&&out.zs==='NNN,NNN,SSS,SSS';
// ── c3) le DPGF tel que le build d'avant l'avait lu : en-tête = la ligne « DPGF · Détail des prix », aucune ligne de prix (D.lignes = des titres), PU deviné en B ;
//        les liens comme « Calculer cette cellule » (sans cellule de quantité ni unité). Rien n'est enregistré, mais tout est lu : libellés « 2.1 », calculateur sur
//        la ligne (n°, désignation, Qté, unité, PU dans O12), « Comme la ligne 3.2.2 », ventilation, récap ; un bandeau discret propose « Colonnes du DPGF »
const nOld=await page.evaluate(([n,o])=>window.TRACE.dpgfCols.setRead(n,o),[NUM,OLD]);
await page.evaluate(n=>{const T=window.TRACE.affaires;const a=T.get(n);T.set(n,{dpgf:Object.assign({},a.dpgf,{liens:a.dpgf.liens.map(L=>Object.assign({},L,{qa:null,u:''}))})});},NUM);
await toDpgf();a=await A();const Dold=JSON.stringify({c:a.dpgf.cols,h:a.dpgf.hdrRow,l:a.dpgf.lignes});const LKold=jd(a);
out={nOld,sect:a.dpgf.lignes.every(l=>l.section),eff:await page.evaluate(n=>{const E=window.TRACE.dpgfCols.eff(n);return {src:E.src,cols:E.cols,hdr:E.hdrRow,n:E.lines.length};},NUM),
  band:sp(await page.$eval('#dy-band',e=>e.textContent).catch(()=>'')),lks:await page.evaluate(()=>[...document.querySelectorAll('#dx-vent .dx-lkr')].map(x=>x.textContent.replace(/[\s  ]+/g,' ').trim().slice(0,60)))};
await openCalc(12);
out.calc=await page.evaluate(()=>{const sp=t=>String(t||'').replace(/[\s  ]+/g,' ').trim();const k=document.getElementById('dx-calc');return {lt:sp((k.querySelector('.c2-lt')||{}).textContent),q:(k.querySelector('[data-dx="q"]')||{}).value,u:sp((k.querySelector('.c2-q span')||{}).textContent),put:sp((k.querySelector('[data-v="dxput|"]')||{}).textContent),like:sp((k.querySelector('[data-v^="dxc2like|"]')||{}).textContent)};});
await shotEl('pc_1366_calculateur_dpgf_mal_lu.png','#dx-calc');
/* ml proposés : la 2.3 (48 ml, pas encore liée) — ses installations « au prorata de mes ml » proposent ses 48 ml */
await openCalc(13);out.ml23={pr:await page.$$eval(zb(0)+' .dy-pr',L=>L.map(x=>x.textContent.replace(/[\s  ]+/g,' ').trim())),lt:sp(await page.$eval('#dx-calc .c2-lt',e=>e.textContent).catch(()=>''))};
await click('dxdkrecap|');await wait(500);await click('dxdktab|ligne');await wait(300);out.recap=sp(await page.$eval('#dk-body',e=>e.innerText).catch(()=>'')).slice(0,300);await click('dxdkclose|');
await shut();await gridTop();await shot('pc_1366_dpgf_mal_lu_bandeau.png');a=await A();out.noWrite=JSON.stringify({c:a.dpgf.cols,h:a.dpgf.hdrRow,l:a.dpgf.lignes})===Dold&&jd(a)===LKold;
console.log('c3) DPGF mal lu par le build d\'avant :',JSON.stringify(out));
C.c3=out.nOld===0&&out.sect&&out.eff.src==='auto'&&JSON.stringify(out.eff.cols)===JSON.stringify({n:0,des:1,u:4,qte:6,pu:14,tot:15})&&out.eff.hdr===7&&out.eff.n===11
  &&/Colonnes du DPGF relues d'après tes lignes \(unité en E, quantité en G, PU en O\)/.test(out.band)&&/→ Colonnes du DPGF$/.test(out.band)
  &&out.lks.length===4&&/^1 ?O11 ?2\.1 Tube acier pré-isolé DN 100/.test(out.lks[0])&&/^4 ?O19 ?3\.2\.2 Tube acier/.test(out.lks[3])
  &&out.calc.lt==='2.2 Tube acier pré-isolé DN 100 — traversée du parc fictif'&&out.calc.q==='120'&&out.calc.u==='ML'&&/Mettre dans O12$/.test(out.calc.put)&&out.calc.like==='↺ Comme la ligne 3.2.2'
  &&out.ml23.pr.length===3&&out.ml23.pr.every(t=>/^prendre au prorata de mes ml : 48 ml ≈ [\d ]+ €/.test(t))&&/^2\.3 Tube acier/.test(out.ml23.lt)&&/2\.1/.test(out.recap)&&out.noWrite;
// ── c4) l'écran « 📐 Colonnes du DPGF » (depuis le bandeau) : l'en-tête sur les lignes 6 et 7, ce que l'import avait lu, « 10 lignes reconnues sur 11 », un menu par
//        champ (A, B, E, G, O, P), 3 lignes d'exemple (les liées d'abord) ; une correction se voit tout de suite (Unité → aucune : 0 ligne reconnue) ; « Appliquer » :
//        D.cols, D.hdrRow, D.lignes (11 lignes), liens et PU intacts, bandeau parti ; un seul ↶ remet la lecture d'avant, ↷
const cellsPu=()=>page.evaluate(()=>[11,12,18,19].map(r=>String((document.querySelector(`#dx-vp td[data-r="${r}"][data-c="15"]`)||{}).textContent||'').replace(/[\s  ]+/g,' ').trim()));
const dlg=()=>page.evaluate(()=>{const d=document.getElementById('dy-dlg');if(!d)return null;const sp=t=>String(t||'').replace(/[\s  ]+/g,' ').trim();return {int:sp((d.querySelector('.dy-int')||{}).textContent),was:sp((d.querySelector('.dy-was')||{}).textContent),cnt:sp((d.querySelector('.dy-cnt')||{}).textContent),
  sel:Object.fromEntries([...d.querySelectorAll('select[data-co="f"]')].map(x=>[x.dataset.k,x.value])),hdr:(d.querySelector('select[data-co="h"]')||{}).value,ex:[...d.querySelectorAll('.dy-ex')].map(x=>sp(x.textContent)),
  ap:(()=>{const b=d.querySelector('[data-v="dxcoapply|"]');return b?{t:sp(b.textContent),dis:b.disabled}:null;})(),uOpt:sp(((d.querySelector('select[data-k="u"]')||{}).selectedOptions||[{}])[0].textContent)};});
const pu0=await cellsPu();await click('dxcoopen|');await wait(400);
out={d0:await dlg()};await shot('pc_1366_colonnes_du_dpgf.png');
await chg('#dy-dlg select[data-k="u"]','0');out.d1=await dlg();await chg('#dy-dlg select[data-k="u"]','5');out.d2=await dlg();
await click('dxcoapply|');await wait(700);a=await A();
out.after={cols:a.dpgf.cols,hdr:a.dpgf.hdrRow,n:a.dpgf.lignes.filter(l=>!l.section).length,l11:(a.dpgf.lignes.find(l=>l.row===11)||{}).n,liens:jd(a)===LKold,pu:JSON.stringify(await cellsPu())===JSON.stringify(pu0),band:!!await page.$('#dy-band'),dlg:!!await page.$('#dy-dlg'),toast:sp(await toast()),
  eff:await page.evaluate(n=>window.TRACE.dpgfCols.eff(n).src,NUM)};
await click('dxundo|');await wait(500);a=await A();out.undo=JSON.stringify({c:a.dpgf.cols,h:a.dpgf.hdrRow,l:a.dpgf.lignes})===Dold&&jd(a)===LKold&&!!await page.$('#dy-band');
await click('dxredo|');await wait(500);a=await A();out.redo=a.dpgf.hdrRow===7&&JSON.stringify(a.dpgf.cols)===JSON.stringify(out.after.cols)&&!await page.$('#dy-band');
await click('dxcoopen|');await wait(300);out.again=(await dlg()).ap;await click('dxcoclose|');
console.log('c4) colonnes du DPGF :',JSON.stringify(out));
const d0=out.d0||{};
C.c4=!!d0.int&&/l'en-tête est sur les lignes 6 et 7/.test(d0.int)&&/feuille « DPGF lot 05 »/.test(d0.int)&&/À l'import, l'appli avait lu l'en-tête en ligne 2 \(« DPGF · Détail des prix »\) : aucune ligne de prix/.test(d0.was)
  &&/^10 lignes reconnues sur 11/.test(d0.cnt)&&/lignes liées lues : 4 \/ 4/.test(d0.cnt)&&JSON.stringify(d0.sel)===JSON.stringify({n:'1',des:'2',u:'5',qte:'7',pu:'15',tot:'16'})&&d0.hdr==='7'&&/^E · « U\.M\. »$/.test(d0.uOpt)
  &&d0.ex.length===3&&/^2\.1 Tube acier pré-isolé DN 100 — rue des Essais · 180 m\.l\./.test(d0.ex[0])&&/^2\.2 /.test(d0.ex[1])&&/^3\.2\.1 /.test(d0.ex[2])&&d0.ap&&d0.ap.t==='✓ Appliquer'&&!d0.ap.dis
  &&/^0 ligne reconnue sur 11/.test(out.d1.cnt)&&/unité \?/.test(out.d1.ex[0])&&out.d1.ap.dis&&/^10 lignes reconnues sur 11/.test(out.d2.cnt)
  &&JSON.stringify(out.after.cols)===JSON.stringify({n:0,des:1,u:4,qte:6,pu:14,tot:15})&&out.after.hdr===7&&out.after.n===11&&out.after.l11==='2.1'&&out.after.liens&&out.after.pu&&!out.after.band&&!out.after.dlg&&out.after.eff==='D'
  &&/Colonnes du DPGF enregistrées : 11 lignes de prix relues \(liens et PU inchangés\)/.test(out.after.toast)&&out.undo&&out.redo&&out.again&&out.again.t==='✓ Déjà enregistré'&&out.again.dis;
// ── c5) l'unité en un clic : la 4.2 (« Divers et sujétions », sans U.M.) — le calculateur propose [ml] [u] [ens] [ft] [autre…] et montre la quantité lue ; [ft] :
//        gardé pour la ligne (D.uOf), la ligne a son unité ; un seul ↶ ; [autre…] « m² » ; puis ft (gardé)
await openCalc(23);const up=()=>page.evaluate(()=>{const u=document.querySelector('#dx-calc .dy-up');return u?{t:u.textContent.replace(/[\s  ]+/g,' ').trim(),b:[...u.querySelectorAll('.dy-ub')].map(b=>b.textContent.trim())}:null;});
out={up0:await up(),u0:sp(await page.$eval('#dx-calc .c2-q span',e=>e.textContent).catch(()=>''))};await shotEl('pc_1366_unite_en_un_clic.png','#dx-calc .c2-top');
await click('dxcounit|ft');await wait(500);a=await A();out.after={uOf:a.dpgf.uOf,l23:(a.dpgf.lignes.find(l=>l.row===23)||{}).u,up:await up(),u:sp(await page.$eval('#dx-calc .c2-q span',e=>e.textContent).catch(()=>'')),toast:sp(await toast())};
await click('dxundo|');await wait(500);a=await A();out.undo={uOf:a.dpgf.uOf||null,l23:(a.dpgf.lignes.find(l=>l.row===23)||{}).u,up:!!await up()};
await click('dxcouo|');await wait(300);await page.fill('#dx-calc [data-co="uo"]','m²');await click('dxcounit|=');await wait(500);a=await A();out.other=a.dpgf.uOf;await click('dxundo|');await wait(400);
await click('dxcounit|ft');await wait(400);a=await A();out.keep=(a.dpgf.lignes.find(l=>l.row===23)||{}).u;
console.log('c5) unité en un clic :',JSON.stringify(out));
C.c5=!!out.up0&&JSON.stringify(out.up0.b)==='["ml","u","ens","ft","autre…"]'&&out.up0.t.replace(/\s/g,'')==='Unitépaslue:mluensftautre…·quantité1(lueenG23)📐ColonnesduDPGF'&&out.u0===''
  &&JSON.stringify(out.after.uOf)==='{"O23":"ft"}'&&out.after.l23==='ft'&&!out.after.up&&out.after.u==='ft'&&/Unité de la ligne 4\.2 : ft \(gardée pour la ligne\)/.test(out.after.toast)
  &&out.undo.uOf===null&&out.undo.l23===''&&out.undo.up&&JSON.stringify(out.other)==='{"O23":"m²"}'&&out.keep==='ft';
// ── c6) le scénario d'Ethan : au chiffrage, +48 ml et 6 soudures en Zone Nord (300 → 348 ml, 30 → 36 soud.) ; les lignes du DPGF n'ont pas bougé. Liste : chaque
//        installation « 540 → 588 ml au chiffrage, montant inchangé… 48 ml (≈ X €) sont libérés pour les nouvelles lignes », bouton principal « Laisser à placer pour les
//        nouvelles lignes (48 ml · X €) », « Refaire la balance sur les 4 lignes (elles gardent leur PU, rien à placer) » ; « Laisser à placer les 3 installations » :
//        48 ml de chacune restent à placer, les PU des 4 lignes baissent un peu, un seul ↶
await chif(async()=>{await click('chei|0');await chg('#eq-app [data-afx="e§dn.0.soud"]','36');await chg('#eq-app [data-afx="e§dn.0.ml"]','348');});
I=await info();a=await A();const pu6=await cellsPu();const L6=jd(a);await shut();await click('dxc3list|');await wait(600);let L3=await its();
const bal=L3.filter(x=>/^inst\|/.test(x.k));out={ml:I.ml,kinds:L3.map(x=>U(x.k)+':'+x.kind).join(' '),bal:bal.map(x=>({k:x.k,t:x.t,pr:x.pr,bt:x.bt,pu:x.pu})),keepAll:sp(await page.$eval('#c3-dlg .dy-keep',e=>e.textContent).catch(()=>'')),
  all:sp(await page.$eval('#c3-dlg .c3-all:not(.dy-keep) .c3-allt',e=>e.textContent).catch(()=>'')),vz:(L3.find(x=>x.k==='vz:inst')||{}).t||''};
await page.evaluate(()=>{const b=document.querySelector('#c3-dlg .dy-keep');if(b)b.scrollIntoView({block:'start'});});await wait(200);await shot('pc_1366_ml_en_plus_laisser_a_placer.png');
await click('dxcokeep|');await wait(800);a=await A();out.after={inst:Object.fromEntries(Object.keys(I.posts).map(p=>[p,r2(instQ(a,p))])),pu:await cellsPu(),toast:sp(await toast()),left:(await its()).map(x=>U(x.k)+':'+x.kind).join(' ')};
const D6=jd(a);await click('dxundo|');await wait(500);a=await A();out.undo=jd(a)===L6;await click('dxredo|');await wait(500);a=await A();out.redo=jd(a)===D6;if(await page.$('#c3-dlg'))await click('dxc3close|');
console.log('c6) ml en plus :',JSON.stringify(out));
const e48=p=>48*I.posts[p].amtV/I.ml;
C.c6=I.ml===588&&bal.length===3&&bal.every(x=>{const p=x.k.split('|')[1];const e=Math.round(e48(p)).toLocaleString('fr-FR').replace(/[\s  ]/g,' ');
    return x.pr==='Laisser à placer pour les nouvelles lignes (48 ml · '+e+' €)'&&x.bt[1]==='Refaire la balance sur les 4 lignes (elles gardent leur PU, rien à placer)'&&x.b[0]==='dxc3do|'+encodeURIComponent(x.k)+'|keep'
      &&/^540 → 588 ml au chiffrage, montant inchangé : l'installation se répartit sur plus de ml ; tes 4 lignes \(2\.1, 2\.2, 3\.2\.1, 3\.2\.2\) gardent leurs ml, leur PU baisse un peu ; 48 ml \(≈ [\d ]+ €\) sont libérés pour les nouvelles lignes\.$/.test(x.t)
      &&/^PU qui changent : 2\.1 [\d ,]+ → [\d ,]+ €/.test(x.pu);})
  &&/^Laisser à placer les 3 installations/.test(out.keepAll)&&/48 ml en plus au chiffrage/.test(out.keepAll)&&/Des ml en plus au chiffrage \(lignes du DPGF inchangées\) → laissés à placer pour les nouvelles lignes/.test(out.all)
  &&/Zone Nord \(essai\) : [\d ]+ € → [\d ]+ €/.test(out.vz)&&/Le total du DPGF ne change pas/.test(out.vz)
  &&Object.keys(out.after.inst).every(p=>Math.abs(out.after.inst[p]-540)<0.01)&&out.after.pu.every((x,i)=>nbv(x)<nbv(pu6[i])-0.004)&&/^✓ 3 installations laissées à placer pour les nouvelles lignes/.test(out.after.toast)&&!/inst\|/.test(out.after.left)&&out.undo&&out.redo;
// ── c7) la nouvelle ligne 2.3 (48 ml, Zone Nord) : ses soudures DN 100 (☑ DN 100) et, pour chaque installation, « prendre au prorata de mes ml : 48 ml » = € / ml
//        de la zone × 48 ; le détail « X € = Y € du reste de la zone + Z € repris sur 2 lignes de la zone (2.1 −…, 2.2 −…) » ; « Mettre » : la part écrite (le reste
//        sur la ligne, la reprise en parts données), ce que perdent 2.1 et 2.2 = ce que reçoit la 2.3 au-delà du reste ; le reste des installations est placé ; un seul ↶
I=await info();a=await A();const before7=JSON.parse(jd(a));const tot7=instTot(a,I);await openCalc(13);await click('dxsugg|100');await wait(300);
const ks7=await page.$$eval(zb(0)+' input[data-dz="ck"]',L=>L.map(i=>i.dataset.k));for(const k of ks7)await chg(`${zb(0)} input[data-dz="ck"][data-k="${k}"]`,true);
const rows7=()=>page.$$eval(zb(0)+' .dy-zr',L=>L.map(r=>({k:r.dataset.k,on:r.classList.contains('on'),v:(r.querySelector('[data-dx="cq"]')||{}).value,amt:(r.querySelector('b[data-amt]')||{}).textContent,d:String((r.querySelector('.dy-prd')||{}).textContent||'').replace(/[\s  ]+/g,' ').trim(),cq:String((r.querySelector('.dy-cq')||{}).textContent||'').replace(/[\s  ]+/g,' ').trim()})));
out={rows:await rows7()};await page.evaluate(s=>{const z=document.querySelector(s);if(z)z.scrollIntoView({block:'center'});},zb(0));await wait(200);await shotEl('pc_1366_prorata_de_mes_ml.png','#dx-calc');
await click('dxput|');await wait(900);a=await A();const L23=lk(a,'O13');
const gotE=p=>(L23?L23.comps:[]).filter(x=>x.k==='inst|'+p).reduce((s,x)=>s+(+x.q||0)*I.posts[p].puV,0);const zN=I.toks[0];const shN=I.sh[0];
out.put={comps:L23?L23.comps.map(x=>U(x.k)+'='+r2(+x.q)+(x.via?'·'+x.via:'')+(x.zs?'·'+(x.zs===zN?'N':'S'):'')).join(' '):null,got:Object.fromEntries(Object.keys(I.posts).map(p=>[p,r2(gotE(p))])),
  exp:Object.fromEntries(Object.keys(I.posts).map(p=>[p,r2(shN*I.posts[p].amtV/I.zml[0]*48)])),tot:[r2(tot7),r2(instTot(a,I))],full:Object.fromEntries(Object.keys(I.posts).map(p=>[p,r2(instQ(a,p))])),toast:sp(await toast()),
  lose:['O11','O12'].map(ad=>r2(instTot({dpgf:{liens:before7.filter(L=>L.a===ad)}},I)-instTot({dpgf:{liens:[lk(a,ad)]}},I))),keepS:['O18','O19'].every(ad=>JSON.stringify(lk(a,ad).comps)===JSON.stringify(before7.find(L=>L.a===ad).comps))};
const D7=jd(a);await click('dxundo|');await wait(500);a=await A();out.undo=jd(a)===JSON.stringify(before7);await click('dxredo|');await wait(500);a=await A();out.redo=jd(a)===D7;
console.log('c7) nouvelle ligne au prorata de ses ml :',JSON.stringify(out));
const fund=out.rows.map(r=>r.d);const repE=out.put.lose.reduce((s,x)=>s+x,0);const restE=r2(instTot(a,I)-tot7);
C.c7=out.rows.length===3&&out.rows.every(r=>r.on&&r.v==='48'&&/^prendre au prorata de mes ml : ml = [\d ,]+ €/.test(r.cq))&&fund.every(t=>/^[\d ]+ € = [\d ]+ € du reste de la zone/.test(t))
  &&fund.some(t=>/\+ [\d ]+ € repris sur 2 lignes de la zone \(2\.1 −[\d ]+ €, 2\.2 −[\d ]+ €\)$/.test(t))
  &&!!out.put.comps&&Object.keys(I.posts).every(p=>Math.abs(out.put.got[p]-out.put.exp[p])<0.05)&&Object.keys(out.put.full).every(p=>Math.abs(out.put.full[p]-588)<0.01)
  &&repE>0.5&&Math.abs(r2(Object.values(out.put.got).reduce((s,x)=>s+x,0))-r2(restE+repE))<0.05&&out.put.keepS&&/avec sa part d'installations au prorata de ses ml/.test(out.put.toast)&&/repris sur 2 lignes/.test(out.put.toast)&&out.undo&&out.redo;
// ── c8) tout est pointé : la nouvelle ligne 3.2.3 (20 ml, Zone Sud) — les installations de la zone sont barrées (« tout pointé dans la zone · lignes 3.2.1, 3.2.2 »)
//        mais la case est là ; cochée : « X € = X € repris sur 2 lignes de la zone (3.2.1 −…, 3.2.2 −…) » ; « Mettre » : 3.2.1 et 3.2.2 rendent exactement ce que reçoit
//        la 3.2.3, le total ne bouge pas ; un seul ↶
a=await A();const before8=jd(a);const tot8=instTot(a,I);await openCalc(20);
const r8=await page.$$eval(zb(1)+' .dy-zr',L=>L.map(r=>({k:r.dataset.k,done:r.classList.contains('c2-done'),dis:r.querySelector('input').disabled,dn:String((r.querySelector('.c2-dn')||{}).textContent||'').replace(/[\s  ]+/g,' ').trim(),pr:String((r.querySelector('.dy-pr')||{}).textContent||'').replace(/[\s  ]+/g,' ').trim()})));
for(const r of r8)await chg(`${zb(1)} input[data-dz="ck"][data-k="${r.k}"]`,true);out={r8,d:(await page.$$eval(zb(1)+' .dy-prd',L=>L.map(x=>x.textContent.replace(/[\s  ]+/g,' ').trim())))};
await page.evaluate(s=>{const z=document.querySelector(s);if(z)z.scrollIntoView({block:'center'});},zb(1));await wait(200);await shotEl('pc_1366_prorata_tout_pointe_reprise.png','#dx-calc');
await click('dxput|');await wait(900);a=await A();const L20=lk(a,'O20');out.put={via:L20?L20.comps.filter(x=>/^inst\|/.test(x.k)).map(x=>(x.via||'-')+'·'+(x.zs===I.toks[1]?'S':'?')).join(' '):'',tot:[r2(tot8),r2(instTot(a,I))],toast:sp(await toast()),
  nord:['O11','O12','O13'].every(ad=>JSON.stringify(lk(a,ad).comps)===JSON.stringify(JSON.parse(before8).find(L=>L.a===ad).comps))};
await click('dxundo|');await wait(500);a=await A();out.undo=jd(a)===before8;
console.log('c8) tout pointé → reprise :',JSON.stringify(out));
C.c8=out.r8.length===3&&out.r8.every(r=>r.done&&!r.dis&&/^(✓ tout pointé dans la zone|⚠ la zone porte [\d ]+ € de plus que sa part : « ↻ Reventiler » en haut du calculateur) · lignes 3\.2\.1, 3\.2\.2 — coche : ta part au prorata de tes ml, reprise sur les lignes de la zone, au prorata de ce qu'elles portent$/.test(r.dn)&&/^prendre au prorata de mes ml : 20 ml ≈ [\d ]+ €$/.test(r.pr))
  &&out.d.length===3&&out.d.every(t=>/^([\d ]+) € = ([\d ]+) € repris sur 2 lignes de la zone \(3\.2\.1 −[\d ]+ €, 3\.2\.2 −[\d ]+ €\)$/.test(t))&&out.put.via==='part·S part·S part·S'&&Math.abs(out.put.tot[0]-out.put.tot[1])<0.02&&out.put.nord
  &&/avec sa part de 3 postes tout pointés/.test(out.put.toast)&&/reprise au prorata sur 2 lignes/.test(out.put.toast)&&out.undo;
// ── c9) « ↻ Reventiler » (la ventilation par zone a changé avec les ml en plus) : le texte dit que le total ne change pas et qui rend quoi à qui ; il écrit (chaque
//        zone porte sa part, le reste à placer ne revient pas), total inchangé, PU de l'aperçu, un seul ↶
I=await info();a=await A();const tot9=instTot(a,I);const e9=ecart(a,I);const P9b=porte(a,I);const gS=Object.keys(I.posts).reduce((s,p)=>s+P9b[p][1]-part(I,p,1),0); /* ce que la Zone Sud porte en trop */await shut();await click('dxc3list|');await wait(600);L3=await its();const it9=L3.find(x=>x.k==='vz:inst');
await page.evaluate(()=>{const b=document.querySelector('#c3-dlg .c3-it[data-k="vz:inst"]');if(b)b.scrollIntoView({block:'start'});});await wait(200);await shot('pc_1366_reventiler.png');
const prev9=Object.fromEntries([...(it9?it9.pu:'').matchAll(/(\d+(?:\.\d+)+) [\d ,]+ → ([\d ,]+) €/g)].map(m=>[m[1],nbv(m[2])]));
await click('dxc3do|vz%3Ainst|revent');await wait(900);a=await A();const P9=porte(a,I);
out={gS:r2(gS),t:it9?it9.t:'',b:it9?it9.b:[],prev:prev9,tot:[r2(tot9),r2(instTot(a,I))],e:[r2(e9),r2(ecart(a,I))],pu:Object.fromEntries((await cellsPu()).map((x,i)=>[['2.1','2.2','3.2.1','3.2.2'][i],nbv(x)])),toast:sp(await toast()),left:L3.length};
const D9=jd(a);await click('dxundo|');await wait(500);a=await A();out.undo=r2(ecart(a,I))===out.e[0];await click('dxredo|');await wait(500);a=await A();out.redo=jd(a)===D9;if(await page.$('#c3-dlg'))await click('dxc3close|');
console.log('c9) reventiler :',JSON.stringify(out));
const m9=/Le total du DPGF ne change pas : la Zone Sud \(essai\) rend ([\d ]+) € à la Zone Nord \(essai\)\./.exec(out.t);
C.c9=!!it9&&!!m9&&gS>1&&Math.abs(nbv(m9[1])-gS)<=1&&out.b[0]==='dxc3do|vz%3Ainst|revent'&&out.e[0]>1&&out.e[1]<0.05&&Math.abs(out.tot[0]-out.tot[1])<0.02
  &&Object.keys(out.prev).length>=4&&Object.keys(out.prev).filter(n=>out.pu[n]!==undefined).every(n=>Math.abs(out.pu[n]-out.prev[n])<0.006)&&/Traité : Installations : la ventilation par zone a changé/.test(out.toast)&&out.undo&&out.redo;
// ── c10) une zone dont aucune ligne ne porte encore les installations (leurs parts déplacées sur la 2.1, comme un DPGF pointé « au ml global ») : « ventilation par
//         zone à refaire », « la Zone Sud reçoit sa part sur ses lignes au ml (3.2.1, 3.2.2) » ; « ↻ Reventiler » : la part de la Zone Sud sur 3.2.1 et 3.2.2 au prorata
//         de leurs ml (160 / 80), total inchangé, chaque zone sa part
await page.evaluate(([n,zS,zN])=>{const T=window.TRACE.affaires;const a=T.get(n);const add={};const liens=a.dpgf.liens.map(L=>{if(!['O18','O19'].includes(L.a))return L;const keep=[];L.comps.forEach(x=>{if(/^inst\|/.test(x.k)&&x.zs===zS){add[x.k]=(add[x.k]||0)+(+x.q||0);}else keep.push(x);});return Object.assign({},L,{comps:keep});})
  .map(L=>L.a!=='O11'?L:Object.assign({},L,{comps:L.comps.concat(Object.keys(add).map(k=>({k,q:Math.round(add[k]*1e6)/1e6,zs:zN})))}));T.set(n,{dpgf:Object.assign({},a.dpgf,{liens})});},[NUM,I.toks[1],I.toks[0]]);
await toDpgf();a=await A();const tot10=instTot(a,I);await shut();await click('dxc3list|');await wait(600);L3=await its();const it10=L3.find(x=>x.k==='vzgap:inst');
await click('dxc3do|vzgap%3Ainst|revent');await wait(900);a=await A();const P10=porte(a,I);const qOf=(ad,p)=>(lk(a,ad).comps||[]).filter(x=>x.k==='inst|'+p&&x.zs===I.toks[1]).reduce((s,x)=>s+(+x.q||0),0);
out={t:it10?it10.t:'',tot:[r2(tot10),r2(instTot(a,I))],e:r2(ecart(a,I)),sud:Object.keys(I.posts).map(p=>r2(qOf('O18',p)/(qOf('O19',p)||1))),toast:sp(await toast())};if(await page.$('#c3-dlg'))await click('dxc3close|');
console.log('c10) zone sans ligne qui porte :',JSON.stringify(out));
C.c10=!!it10&&/la Zone Sud \(essai\) reçoit sa part sur ses lignes au ml \(3\.2\.1, 3\.2\.2\)/.test(out.t)&&/Le total du DPGF ne change pas : la Zone Nord \(essai\) rend [\d ]+ € à la Zone Sud \(essai\)/.test(out.t)&&!/resteront à placer/.test(out.t)
  &&Math.abs(out.tot[0]-out.tot[1])<0.02&&out.e<0.05&&out.sud.every(x=>Math.abs(x-2)<0.001);
// ── c11) consultation d'une version : lecture seule — l'écran « Colonnes du DPGF » s'ouvre sans « Appliquer », le calculateur montre les cases (désactivées),
//         l'unité en un clic désactivée ; rien ne s'écrit
await click('tab|chiffrage');await click('vnew|');await page.evaluate(()=>{document.getElementById('vv-note').value='Essai colonnes';document.getElementById('vv-ok').click();});await wait(500);
await click('vview|1');await click('tab|dpgf');await page.waitForSelector('#dx-vp',{timeout:15000});await wait(700);a=await A();const V0=JSON.stringify(a.dpgf);
await page.evaluate(n=>{const T=window.TRACE.affaires;},NUM);
await openCalc(13);out={vv:sp(await page.$eval('#eq-app .vv-band',e=>e.textContent).catch(()=>'')).slice(0,40),en:await page.$$eval('#dx-calc input[data-dz],#dx-calc input[data-dx="cq"]',L=>L.filter(i=>!i.disabled).length),
  pr:await page.$$eval(zb(0)+' .dy-zr',L=>L.length)};
await click('dxcoopen|');await wait(300);out.dlg=await dlg();out.sel=await page.$$eval('#dy-dlg select',L=>L.filter(s=>!s.disabled).length);await click('dxcoclose|');
await shut();a=await A();out.noWrite=JSON.stringify(a.dpgf)===V0;await click('vexit|');await wait(500);await toDpgf();
console.log('c11) consultation :',JSON.stringify(out));
C.c11=/Tu consultes la v1/.test(out.vv)&&out.en===0&&out.pr===3&&!!out.dlg&&!out.dlg.ap&&out.sel===0&&out.noWrite;
// ── c12) téléphone 390 px : l'écran « Colonnes du DPGF », l'unité en un clic, l'élément « ml en plus » et son bouton, la case au prorata des ml, Reventiler
await tel(true);await toDpgf();out={sw:await page.evaluate(()=>document.documentElement.scrollWidth)};
await click('dxcoopen|');await wait(400);out.dlg={w:await page.evaluate(()=>{const d=document.getElementById('dy-dlg');return d?Math.round(d.getBoundingClientRect().width):0;}),small:await small('#dy-dlg button, #dy-dlg select',34),over:await overflow('#dy-dlg')};await shot('tel_390_colonnes_du_dpgf.png');await click('dxcoclose|');
/* l'unité en un clic : une ligne sans unité (la 4.1 « Ens » est lue ; la 4.2 a ft) → on retire l'unité choisie le temps de la capture */
const uOf12=await page.evaluate(n=>{const T=window.TRACE.affaires;const a=T.get(n);const u=a.dpgf.uOf;const D=Object.assign({},a.dpgf);delete D.uOf;T.set(n,{dpgf:D});window.TRACE.dpgfCols.setRead(n,{cols:D.cols,hdrRow:D.hdrRow});return u;},NUM); /* le temps de la capture : la 4.2 sans unité choisie */
await toDpgf();await page.click(td(23,15));await wait(800);out.up={small:await small('#dx-calc .dy-ub',40),over:await overflow('#dx-calc'),on:!!await page.$('#dx-calc .dy-up')};
await page.evaluate(()=>{const u=document.querySelector('#dx-calc .dy-up');if(u)u.scrollIntoView({block:'center'});});await wait(200);await shot('tel_390_unite_en_un_clic.png');await shut();
await page.evaluate(([n,u])=>{const T=window.TRACE.affaires;const a=T.get(n);T.set(n,{dpgf:Object.assign({},a.dpgf,{uOf:u})});window.TRACE.dpgfCols.setRead(n,{cols:a.dpgf.cols,hdrRow:a.dpgf.hdrRow});},[NUM,uOf12]);await toDpgf();
await page.click(td(20,15));await wait(800);for(const r of r8)await chg(`${zb(1)} input[data-dz="ck"][data-k="${r.k}"]`,true);
out.pr={small:await small('#dx-calc .dy-zr input:not([type=checkbox])',34),over:await overflow('#dx-calc')};await page.evaluate(s=>{const z=document.querySelectorAll(s+' .dy-prd');const x=z[z.length-1];if(x)x.scrollIntoView({block:'end'});},zb(1));await wait(200);await shot('tel_390_prorata_de_mes_ml.png');await click('dxcclr|');await shut();
/* l'élément « ml en plus » : remis le temps de la capture (↶ jusqu'avant « Laisser à placer ») — puis ↷ */
let nu=0;for(;nu<12;nu++){a=await A();if(jd(a)===L6)break;await click('dxundo|');await wait(350);}
await click('dxc3list|');await wait(600);out.list={dlg:await page.evaluate(()=>{const d=document.getElementById('c3-dlg');return d?Math.round(d.getBoundingClientRect().width):0;}),small:await small('#c3-dlg button',34),prim:await small('#c3-dlg .c3-acts .btn.primary, #c3-dlg .dy-keep .btn',40),over:await overflow('#c3-dlg')};
await page.evaluate(()=>{const b=document.querySelector('#c3-dlg .c3-it[data-k="inst|conteneur"]');if(b)b.scrollIntoView({block:'start'});});await wait(200);await shot('tel_390_ml_en_plus_laisser_a_placer.png');
await page.evaluate(()=>{const b=document.querySelector('#c3-dlg .c3-it[data-k="vz:inst"]');if(b)b.scrollIntoView({block:'start'});});await wait(200);await shot('tel_390_reventiler.png');await click('dxc3close|');
for(let i=0;i<nu;i++){await click('dxredo|');await wait(300);}
await tel(false);await toDpgf();
console.log('c12) téléphone 390 px :',JSON.stringify(out));
C.c12=out.sw<=390&&out.dlg.w===390&&!out.dlg.small.length&&!out.dlg.over.length&&out.up.on&&!out.up.small.length&&!out.up.over.length&&!out.pr.small.length&&!out.pr.over.length&&out.list.dlg===390&&!out.list.small.length&&!out.list.prim.length&&!out.list.over.length;
C.console=logs.length===0;
const bad=Object.entries(C).filter(([k,v])=>!v).map(([k])=>k);console.log(bad.length?'RESULTAT: ECHEC '+bad.join(','):'RESULTAT: TOUT VERT');console.log(logs.length?logs:'[]');
await browser.close();
