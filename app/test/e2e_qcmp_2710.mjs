// e2e_qcmp_2710.mjs — 27/10 soir (lot 2710i). Ethan : « comparer les quantités tracées dans un chiffrage et celles importées d'un fournisseur — pas juste soudures et ml,
// vraiment avoir toutes les pièces en face l'une de l'autre et pouvoir comparer ». Données 100 % FICTIVES (affaire, tracés au format remis par le traceur, trame fournisseur).
// Commerce › affaire › Quantités : sous le comparatif par DN, « Pièce par pièce : le tracé en face du quantitatif » — tracé (Σ ou un seul) ⇄ étude, une ligne par nature et par
// DN (tracé | fournisseur | écart), sous-lignes par variante (angle, branche, DN 2), « seulement les écarts », ce que l'un ne compte pas reste « — ».
// c1 la table : Toutes DN puis DN 150 / 100 / 80 / 25, valeurs attendues (unit_qcompare) · c2 sous-lignes (Coude 45° : 2 | 1 | −1, Té → DN 25 (purge), kit / manchon fin de ligne) ·
// c3 « — » (purges côté fournisseur, DHEC côté tracé), ≈ (soudures estimées DN 25, jamais orange), hors comparaison (mousse, accessoire) · c4 « seulement les écarts » · c5 2e étude
// (saisie à la main) → le choix de l'étude change les chiffres ; 2e tracé lié → Σ dans le choix du tracé (pièces additionnées) · c6 téléphone 390 : pas de débordement · c7 console.
import { chromium } from 'playwright';
const BASE=process.env.BASE||'http://localhost:8765';const SHOTS=process.env.SHOTS||null;
const browser=await chromium.launch({headless:true, executablePath: process.env.CHROMIUM_PATH||undefined});
const C={};const logs=[];const J=x=>JSON.stringify(x);const N1='O2610-81';
async function mk(vp){const ctx=await browser.newContext({viewport:vp,deviceScaleFactor:1});const page=await ctx.newPage();
  await page.route(u=>!/^https?:\/\/(localhost|127\.0\.0\.1)(:\d+)?\//.test(u.href)&&/^https?:/.test(u.href),r=>r.fulfill({status:204,body:''}));
  page.on('pageerror',e=>logs.push('PAGEERROR: '+e.message.slice(0,300)));page.on('console',m=>{if(m.type()==='error'&&!/supabase|Failed to fetch|net::ERR|404|WebSocket|pdf\.worker|cdnjs/i.test(m.text()))logs.push(m.text().slice(0,200));});page.on('dialog',d=>d.accept().catch(()=>{}));
  await page.goto(BASE+'/index.html');await page.waitForTimeout(600);await page.evaluate(()=>{localStorage.clear();localStorage.setItem('trace:wide','1');});await page.evaluate(()=>new Promise(r=>{try{const q=indexedDB.deleteDatabase('trace-kv');q.onsuccess=q.onerror=q.onblocked=()=>r();}catch(e){r();}}));
  await page.reload();await page.waitForTimeout(1200);{const s=await page.$('#loginSkip');if(s&&await s.isVisible())await s.click();await page.waitForTimeout(700);}
  return {ctx,page};}
const wait=(page,ms)=>page.waitForTimeout(ms);
const click=async(page,v)=>{await page.evaluate(v=>{const el=document.querySelector(`#eq-app [data-act=af][data-v="${v}"]`);if(!el)throw new Error('bouton absent '+v);el.click();},v);await wait(page,280);};
const openAff=async(page,n,tab)=>{await page.evaluate(([n,t])=>{const T=window.TRACE;const S=T.affaires.state();S.view='fiche';S.cur=n;S.tab=t;T.renderHome();},[n,tab]);await wait(page,400);};
const newAff=async(page,n,nom)=>{await page.evaluate(async([n,nom])=>{const T=window.TRACE;T.state.userId='ethan';const S=T.affaires.state();S.cur=null;S.view='list';S.seg='devis';T.renderHome();document.getElementById('htCom').click();await new Promise(x=>setTimeout(x,300));
  for(let k=0;k<20&&!document.querySelector('#eq-app [data-act=af][data-v="new|"]');k++)await new Promise(x=>setTimeout(x,100));
  document.querySelector('#eq-app [data-act=af][data-v="new|"]').click();await new Promise(x=>setTimeout(x,150));document.getElementById('afn-num').value=n;document.getElementById('afn-nom').value=nom;document.getElementById('afn-client').value='CLIENT TEST';document.getElementById('afn-etat').value='devis';
  document.querySelector('#eq-app [data-act=af][data-v="create|"]').click();await new Promise(x=>setTimeout(x,250));},[n,nom]);await wait(page,250);};
// ── tracé fictif (même réseau que unit_qcompare) au format remis par le traceur
const T=(kind,dn,len,x)=>Object.assign({kind,dn,len},x||{});
const weldsOf=els=>els.slice(0,-1).map((e,i)=>({idx:i,dn:e.dn,m:i,weldId:'S-'+i}));
let Y0=0;const TL=(id,els,o)=>{const y=(Y0+=12);let m=0;els.forEach(e=>{e.m0=m;m+=e.len;e.m1=m;e.axis=[[[e.m0,y],[e.m1,y]]];e.from=[e.m0,y];e.to=[e.m1,y];e.casing=250;});
  return Object.assign({id,name:id,dn:els[0].dn,bar:12,traceur:true,axis:[[0,y],[m,y]],e:0.35,cond:{A:{els,welds:weldsOf(els),length:m,notes:[]},R:{els:els.map(e=>JSON.parse(JSON.stringify(e))),welds:weldsOf(els),length:m,notes:[]}}},o||{});};
const PU=(dn,dnb)=>T('tee',dn,0.9,{vert:'up',pvKind:'purge',pvDir:'up',dnb});
const LINES=()=>[TL('L1',[T('endpoint',150,0),T('pipe',150,12),PU(150,25),T('pipe',150,12),T('tee',150,1.1,{dnb:80}),T('pipe',150,10),PU(150,25),T('pipe',150,6),T('reducer',150,0.5,{dn2:100}),T('pipe',100,12),T('valve',100,0.4),T('pipe',100,5),T('endcap',100,0.3)],{name:'Feeder',ends:{start:{type:'chaufferie',dn:150},end:{type:'kit',dn:100}}}),
  TL('L2',[T('pipe',80,12),T('bend',80,0.4,{angle:45}),T('pipe',80,8),T('bend',80,0.5,{angle:90}),T('pipe',80,3),T('bypass',80,0.6)],{name:'Antenne',parent:'L1',parentM:24,ends:{start:null,end:{type:'bypass_regard',dn:80}}})];
const SITE=(id,name,lines)=>({id,name,source:'traceur',w:200,h:200,fiche:{etude:{aff:N1}},lines,traceur:{v:1,ctx:'etude',cv:1,zones:[],savedAt:'2026-10-27T18:00:00Z'}});
const H='Type de pièce\tDN\tDN 2\tAngle (°)\tLongueur (m)\tQuantité\tUnité\tGaine Ø (mm)\tRéf. fournisseur\tDésignation fournisseur';
const L=(t,dn,dn2,ang,len,q,des)=>[t,dn,dn2,ang,len,q,'u','','',des].join('\t');
const TA=[H,L('Barre',150,'','',12,8,'Conduite DN 150'),L('Barre',100,'','',12,4,'Conduite DN 100'),L('Barre',80,'','',12,4,'Conduite DN 80'),L('Manchon',150,'','','',14,'Manchon DN 150'),L('Manchon',100,'','','',4,'Manchon DN 100'),L('Manchon',80,'','','',8,'Manchon DN 80'),
  L('Té',150,25,'','',4,'Té DN 150/25'),L('Té',150,80,'','',2,'Té DN 150/80'),L('Réduction',150,100,'','',3,'Réduction DN 150/100'),L('Vanne',100,'','','',2,'Vanne DN 100'),L('Kit fin de ligne',100,'','','',1,'Kit FDL DN 100'),L('Manchon fin de ligne',100,'','','',1,'Manchon FDL DN 100'),
  L('Coude',80,'',90,'',2,'Coude 90° DN 80'),L('Coude',80,'',45,'',1,'Coude 45° DN 80'),L('By-pass',80,'','','',2,'By-pass DN 80'),L('DHEC',150,'','','',1,'DHEC DN 150'),L('Mousse PU',150,'','','',14,'Mousse PU DN 150'),L('Accessoire','','','','',10,'Matelas')].join('\n');
const importTrame=async(page,nom,txt)=>{await click(page,'qsimp|');await wait(page,200);await page.evaluate(n=>{document.getElementById('qi-nom').value=n;document.querySelector('#modal [data-iqm="paste"]').click();},nom);await wait(page,200);
  await page.evaluate(t=>{document.getElementById('iq-paste').value=t;document.getElementById('iq-read').click();},txt);await wait(page,400);await page.evaluate(()=>document.getElementById('qi-ok').click());await wait(page,500);};
const readQpc=page=>page.evaluate(()=>{const t=document.querySelector('#eq-app table.cm-qpc');if(!t)return null;const sp=s=>String(s||'').replace(/[\s  ]+/g,' ').trim();const rows={};let g='';
  [...t.querySelectorAll('tr')].slice(1).forEach(tr=>{if(tr.classList.contains('cm-qpc-g')){g=sp(tr.textContent);return;}const td=[...tr.cells];const k=tr.dataset.qpc;rows[k]={g,lab:sp(td[0].textContent),t:sp(td[1].textContent),f:sp(td[2].textContent),d:sp(td[3].textContent),off:td[3].classList.contains('cm-off'),ok:td[3].classList.contains('cm-ok'),est:!!td[2].querySelector('.eq-tag'),sub:tr.classList.contains('cm-qpc-sub')};});
  const h=document.querySelector('#eq-app .cm-qpc-h');return {rows,n:rows?Object.keys(rows).length:0,groups:[...t.querySelectorAll('tr.cm-qpc-g')].map(x=>sp(x.textContent)),selT:[...(h.querySelector('[data-afx="qpc§t"]')||{options:[]}).options].map(o=>o.textContent),selS:[...(h.querySelector('[data-afx="qpc§s"]')||{options:[]}).options].map(o=>o.textContent),nTxt:sp((h.querySelector('.cm-qpc-n')||{}).textContent),hint:sp((t.parentElement.nextElementSibling||{}).textContent)};});
const shot=async(page,n)=>{if(SHOTS){try{await page.screenshot({path:`${SHOTS}/qcmp_${n}.png`,fullPage:false});}catch(e){}}};
// ══ mise en place
let {ctx,page}=await mk({width:1280,height:900});
await newAff(page,N1,'Comparatif pièce par pièce');
await page.evaluate(([s1,n])=>{const T=window.TRACE;T.etude.addSite(s1);T.affaires.set(n,{sites:['trc_c1']});},[SITE('trc_c1','Réseau test C',LINES()),N1]);
const Q=await page.evaluate(()=>window.TRACE.etude.qty('trc_c1'));console.log('0) tracé :',J(Q.tot),'pcs',Q.pcs.length);
await openAff(page,N1,'quantites');
let before=await readQpc(page);console.log('0) sans étude : table',before?'présente':'absente');
await importTrame(page,'Fournisseur X',TA);await wait(page,300);
// ══ c1 · la table
let o=await readQpc(page);await page.evaluate(()=>{const t=document.querySelector('#eq-app table.cm-qpc');if(t)t.scrollIntoView({block:'start'});});await wait(page,150);await shot(page,'1_table');
console.log('1) table :',J({groups:o&&o.groups,n:o&&o.n,selT:o&&o.selT,selS:o&&o.selS,nTxt:o&&o.nTxt}));
const r=(k)=>(o&&o.rows[k])||{};
console.log('   toutes DN :',J(Object.entries(o?o.rows:{}).filter(([k])=>k.startsWith('all|')).map(([k,v])=>[k,v.t,v.f,v.d,v.off?'!':''])));
C.c1=!before&&!!o&&J(o.groups)===J(['Toutes DN','DN 150','DN 100','DN 80','DN 25'])&&J(o.selT)===J(['Tracé · Réseau test C'])&&J(o.selS)===J(['🏭 Fournisseur X'])
  &&r('all|barres').t==='14'&&r('all|barres').f==='16'&&r('all|barres').d==='+2 (+14 %)'&&r('all|barres').off&&r('all|soud').t==='34'&&/^28 ≈$/.test(r('all|soud').f)&&r('all|soud').est&&r('all|soud').d==='−6 (−18 %)'&&r('all|soud').off
  &&r('all|coudes').t==='4'&&r('all|coudes').f==='3'&&r('all|coudes').d==='−1 (−25 %)'&&r('all|coudes').off&&r('all|tes').d==='0'&&r('all|tes').ok&&r('all|piq').t==='6'&&r('all|piq').f==='6'&&r('all|red').d==='+1 (+50 %)'&&r('all|vannes').d==='0'&&r('all|kits').d==='0'&&r('all|bypass').t==='2'&&r('all|bypass').f==='2'
  &&r('all|mlTube').t==='171,2'&&r('all|mlTube').f==='192'&&r('all|mlTr').f==='96'&&/^13 écarts sur 30 lignes$/.test(o.nTxt)&&r('150|soud').t==='18'&&r('150|soud').f==='14'&&r('80|coudes').t==='4'&&r('80|coudes').f==='3';
// ══ c2 · sous-lignes
C.c2=r('all|coudes|coude:45').sub&&r('all|coudes|coude:45').lab==='↳ Coude 45°'&&r('all|coudes|coude:45').t==='2'&&r('all|coudes|coude:45').f==='1'&&r('all|coudes|coude:45').d==='−1 (−50 %)'&&r('all|coudes|coude:45').off&&r('all|coudes|coude:90').d==='0'
  &&r('all|tes|25').lab==='↳ Té → DN 25 (purge)'&&r('all|tes|25').t==='4'&&r('all|tes|80').lab==='↳ Té → DN 80'&&r('all|red|100').lab==='↳ Réduction → DN 100'&&r('all|kits|kit').lab==='↳ Kit fin de ligne'&&r('all|kits|kit').t==='2'&&r('all|kits|kit').f==='1'&&r('all|kits|manchon').lab==='↳ Manchon fin de ligne'&&r('all|kits|manchon').t==='0'&&r('all|kits|manchon').f==='1';
// ══ c3 · « — », ≈, hors comparaison
C.c3=r('all|purges').t==='2'&&r('all|purges').f==='—'&&r('all|purges').d==='—'&&!r('all|purges').off&&r('all|dhec').t==='—'&&r('all|dhec').f==='1'&&r('all|dhec').d==='—'&&!o.rows['all|vidanges']&&!o.rows['all|murs']
  &&r('25|soud').t==='0'&&/^2/.test(r('25|soud').f)&&r('25|soud').est&&!r('25|soud').off&&r('25|piq').t==='4'&&r('25|piq').f==='4'&&/Mousse PU DN 150 × 14 · Matelas × 10/.test(o.hint);
// ══ c4 · seulement les écarts
await page.evaluate(()=>{const cb=document.querySelector('#eq-app [data-afx="qpc§only"]');cb.checked=true;cb.dispatchEvent(new Event('change',{bubbles:true}));});await wait(page,300);
let o4=await readQpc(page);await shot(page,'4_ecarts');const keys4=Object.keys(o4.rows);
console.log('4) seulement les écarts :',keys4.length,'lignes ·',J(o4.groups));
C.c4=keys4.length<o.n&&keys4.every(k=>o4.rows[k].off||(!o4.rows[k].sub&&Object.keys(o4.rows).some(x=>x.startsWith(k+'|')&&o4.rows[x].off)))&&!o4.rows['all|tes']&&!!o4.rows['all|coudes']&&!!o4.rows['all|coudes|coude:45']&&!o4.rows['all|coudes|coude:90']&&!!o4.rows['all|kits']&&!o4.rows['all|purges']
  &&(await page.evaluate(()=>document.querySelector('#eq-app [data-afx="qpc§only"]').checked));
await page.evaluate(()=>{const cb=document.querySelector('#eq-app [data-afx="qpc§only"]');cb.checked=false;cb.dispatchEvent(new Event('change',{bubbles:true}));});await wait(page,300);
// ══ c5 · 2e étude (saisie à la main : 6 coudes DN 80) → choix de l'étude ; 2e tracé lié → Σ
await click(page,'qsnew|');await wait(page,200);
const sid=await page.evaluate(n=>{const a=window.TRACE.affaires.get(n);const s=a.qsets[a.qsets.length-1];return s.id;},N1);
await page.evaluate(([n,id])=>{const T=window.TRACE;const a=T.affaires.get(n);const S=JSON.parse(JSON.stringify(a.qsets));const s=S.find(x=>x.id===id);s.lignes=[{kind:'bend',dn:80,angle:90,qty:6,unit:'u'},{kind:'pipe',dn:80,len:12,qty:4,unit:'u'}];T.affaires.set(n,{qsets:S});T.renderHome();},[N1,sid]);await wait(page,400);
let o5=await readQpc(page);const selS5=o5.selS.slice();
await page.evaluate(id=>{const s=document.querySelector('#eq-app [data-afx="qpc§s"]');s.value=id;s.dispatchEvent(new Event('change',{bubbles:true}));},sid);await wait(page,400);
let o5b=await readQpc(page);const r5=k=>(o5b.rows[k]||{});
console.log('5) 2e étude :',J({selS:selS5,coudes:[r5('all|coudes').t,r5('all|coudes').f,r5('all|coudes').d],barres:[r5('all|barres').t,r5('all|barres').f],groups:o5b.groups}));
C.c5a=selS5.length===2&&selS5[1].startsWith('✍ ')&&r5('all|coudes').t==='4'&&r5('all|coudes').f==='6'&&r5('all|coudes').d==='+2 (+50 %)'&&r5('all|coudes|coude:90').f==='6'&&r5('all|coudes|coude:45').f==='0'&&r5('all|barres').f==='4'&&/^10/.test(r5('all|soud').f)&&r5('all|soud').est; /* pas de manchon dans la saisie : soudures estimées par les bouts (6 coudes + 4 barres → 20 bouts → 10) */
await page.evaluate(([s2,n])=>{const T=window.TRACE;T.etude.addSite(s2);const a=T.affaires.get(n);T.affaires.set(n,{sites:a.sites.concat(['trc_c2'])});T.renderHome();},[SITE('trc_c2','Antenne seule',[TL('L9',[T('pipe',80,12),T('bend',80,0.4,{angle:90}),T('pipe',80,6),T('endcap',80,0.3)],{name:'Antenne 2',ends:{start:{type:'pec',dn:80},end:{type:'kit',dn:80}}})]),N1]);await wait(page,600);
let o5c=await readQpc(page);console.log('5) 2 tracés :',J(o5c.selT));
await page.evaluate(()=>{const s=document.querySelector('#eq-app [data-afx="qpc§t"]');s.value='trace:sum';s.dispatchEvent(new Event('change',{bubbles:true}));},sid);await wait(page,400);
let o5d=await readQpc(page);const r5d=k=>(o5d.rows[k]||{});await shot(page,'5_somme');
console.log('5) Σ :',J({coudes:[r5d('all|coudes').t,r5d('all|coudes').f],c90:[r5d('all|coudes|coude:90').t,r5d('all|coudes|coude:90').f],kits:[r5d('all|kits').t,r5d('all|kits').f]}));
C.c5b=J(o5c.selT)===J(['Σ 2 tracés (somme)','Tracé · Réseau test C','Tracé · Antenne seule'])&&r5d('all|coudes').t==='6'&&r5d('all|coudes').f==='6'&&r5d('all|coudes').d==='0'&&r5d('all|coudes|coude:90').t==='4'&&r5d('all|kits').t==='4';
await ctx.close();
// ══ c6 · téléphone 390
({ctx,page}=await mk({width:390,height:844}));
await newAff(page,N1,'Comparatif pièce par pièce');await page.evaluate(([s1,n])=>{const T=window.TRACE;T.etude.addSite(s1);T.affaires.set(n,{sites:['trc_c1']});},[SITE('trc_c1','Réseau test C',LINES()),N1]);
await openAff(page,N1,'quantites');await importTrame(page,'Fournisseur X',TA);await wait(page,300);
const o6=await page.evaluate(()=>{const t=document.querySelector('#eq-app table.cm-qpc');t.scrollIntoView({block:'start'});const h=document.querySelector('#eq-app .cm-qpc-h');return {sw:document.documentElement.scrollWidth,w:window.innerWidth,tw:t.getBoundingClientRect().width,cw:t.parentElement.clientWidth,hw:h.getBoundingClientRect().width,rows:t.querySelectorAll('tr').length};});
await shot(page,'6_tel');console.log('6) téléphone :',J(o6));C.c6=o6.sw<=o6.w+1&&o6.hw<=o6.w&&o6.rows>20&&o6.tw<=o6.cw+1; /* la table tient dans la carte (pas de défilement horizontal : les % sont masqués au téléphone) */
await ctx.close();
console.log('erreurs console :',J(logs));C.c7=logs.length===0;
const ko=Object.entries(C).filter(([k,v])=>!v).map(([k])=>k);console.log(J(C));console.log(ko.length?'RESULTAT: KO '+ko.join(','):'RESULTAT: TOUT VERT');
await browser.close();
