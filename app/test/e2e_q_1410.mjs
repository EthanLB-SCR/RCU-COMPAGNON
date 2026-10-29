// e2e_q_1410.mjs — LOT Q (14/10/2026 soir) : quantités du tracé → zones du chiffrage. Données 100 % FICTIVES (affaires, tracés, base de prix fixture_prix.xlsx).
// Le nouveau traceur (lots T1 / T2) n'est pas dans cette copie : le tracé est injecté tel que le traceur le remet (bridge.js) avec les champs du contrat —
// C1 ends / startType / endType, C2 tranche / option, C4 site.traceur.zones, C5 ctx, C8 tés verticaux (pvKind, dnb) — plus un ANCIEN tracé sans ces champs.
// c1  Quantités (puce du tracé) : tableau par DN inchangé ; extrémités par type × DN, purges et vidanges ; tranches (ferme, option 1) ; zones (Nord, Sud) ;
// c2  « → Créer les zones du chiffrage depuis le tracé » : 2 zones remplies (soudures, ml, purges, vidanges, SST, raccordements, by-pass, fonds bombés, extrusion),
//     lien au tracé, bandeau ↻, « type à choisir » ; une 2e fois : « remplacer / ajouter / annuler » — jamais de doublon ;
// c3  « ↻ Reprendre les quantités du tracé » après une retouche du tracé (une purge de plus) : ligne saisie à la main gardée ;
// c4  « → Une zone par tranche » : Tranche ferme + Option 1, totaux = le tracé ;
// c5  répartition d'une étude fournisseur importée sur 3 zones (% égaux) : totaux conservés au DN près, soudures entières, étude intacte, zone de lecture retirée ;
// c6  panier by-pass derrière vannes SST : classeur non décomposable → 2 coudes + vannette + MO, MÊME total qu'avant ; sans bloc by-pass → 4 soudures au prix de la zone ;
// c7  ancien tracé (sans les nouveaux champs) : mêmes quantités qu'avant (ancien calcul recopié ici) ; c8 téléphone 390 px ;
// c9  le tracé ouvert dans l'appli (session) = le même jamais ouvert ; console vide.
import { chromium } from 'playwright';
import fs from 'fs';import path from 'path';import {fileURLToPath} from 'url';
const HERE=path.dirname(fileURLToPath(import.meta.url));
const BASE=process.env.BASE||'http://localhost:8765';
const browser=await chromium.launch({headless:true, executablePath: process.env.CHROMIUM_PATH||undefined});
const ctx=await browser.newContext({viewport:{width:1280,height:900}});const page=await ctx.newPage();
await page.route(u=>!/^https?:\/\/(localhost|127\.0\.0\.1)(:\d+)?\//.test(u.href)&&/^https?:/.test(u.href),r=>r.fulfill({status:204,body:''})); /* rien ne sort */
const logs=[];page.on('pageerror',e=>logs.push('PAGEERROR: '+e.message.slice(0,300)));page.on('console',m=>{if(m.type()==='error'&&!/supabase|Failed to fetch|net::ERR|404|WebSocket|pdf\.worker|cdnjs/i.test(m.text()))logs.push(m.text().slice(0,200));});
page.on('dialog',d=>d.accept().catch(()=>{}));
const C={};const wait=ms=>page.waitForTimeout(ms);const J=x=>JSON.stringify(x);const sp=t=>String(t||'').replace(/[\s  ]+/g,' ').trim();
const N1='O2610-71',N2='O2610-72',N3='O2610-73';
const SHOT=async(n,sel)=>{if(!process.env.SHOTS)return;const f=path.join(process.env.SHOTS,'q_'+n+'.png');const vp=page.viewportSize();try{await page.setViewportSize({width:vp.width,height:3200});await wait(250);if(sel)await page.locator(sel).first().screenshot({path:f,timeout:8000});else await page.screenshot({path:f});}catch(e){console.log('capture',n,e.message.slice(0,80));}await page.setViewportSize(vp);await wait(150);}; /* captures pour relecture (SHOTS=<dossier>), hors dépôt */
const click=async v=>{await page.evaluate(v=>{const el=document.querySelector(`#eq-app [data-act=af][data-v="${v}"]`);if(!el)throw new Error('bouton absent '+v);el.click();},v);await wait(280);};
const has=v=>page.evaluate(v=>!!document.querySelector(`#eq-app [data-act=af][data-v="${v}"]`),v);
const checkModal=async()=>{const t=await page.evaluate(()=>{const M=document.getElementById('modal');if(!M||!M.classList.contains('show'))return '';const t=M.textContent.replace(/\s+/g,' ').trim();const b=M.querySelector('[data-close]');if(b)b.click();return t;});await wait(150);return t;}; /* « Zones du chiffrage : à vérifier » */
const chg=async(sel,val)=>{await page.evaluate(([s,v])=>{const el=document.querySelector(s);if(!el)throw new Error('absent '+s);if(el.type==='checkbox'||el.type==='radio')el.checked=!!v;else el.value=v;el.dispatchEvent(new Event('change',{bubbles:true}));el.dispatchEvent(new Event('input',{bubbles:true}));},[sel,val]);await wait(200);};
const A=n=>page.evaluate(n=>window.TRACE.affaires.get(n),n);
const openAff=async(n,tab)=>{await page.evaluate(([n,t])=>{const T=window.TRACE;const S=T.affaires.state();S.view='fiche';S.cur=n;S.tab=t;T.renderHome();},[n,tab]);await wait(350);};
const newAff=async(n,nom)=>{await page.evaluate(async([n,nom])=>{const T=window.TRACE;T.state.userId='ethan';const S=T.affaires.state();S.cur=null;S.view='list';S.seg='devis';T.renderHome();document.getElementById('htCom').click();await new Promise(x=>setTimeout(x,300));
  for(let k=0;k<20&&!document.querySelector('#eq-app [data-act=af][data-v="new|"]');k++)await new Promise(x=>setTimeout(x,100));
  document.querySelector('#eq-app [data-act=af][data-v="new|"]').click();await new Promise(x=>setTimeout(x,150));document.getElementById('afn-num').value=n;document.getElementById('afn-nom').value=nom;document.getElementById('afn-client').value='CLIENT TEST';document.getElementById('afn-etat').value='devis';
  document.querySelector('#eq-app [data-act=af][data-v="create|"]').click();await new Promise(x=>setTimeout(x,250));},[n,nom]);await wait(250);};
// ── le tracé fictif, au format remis par le traceur (bridge.js) : 8 lignes, toutes les extrémités, 3 purges / 1 vidange, une option, deux zones
const T=(kind,dn,len,x)=>Object.assign({kind,dn,len},x||{});
const weldsOf=els=>els.slice(0,-1).map((e,i)=>({idx:i,dn:e.dn,m:i,weldId:'S-'+i}));
let Y0=0;const TL=(id,els,o)=>{const y=(Y0+=12);let m=0;els.forEach(e=>{e.m0=m;m+=e.len;e.m1=m;e.axis=[[[e.m0,y],[e.m1,y]]];e.from=[e.m0,y];e.to=[e.m1,y];e.casing=250;}); /* géométrie comme la remise du traceur (bridge.js) */
  return Object.assign({id,name:id,dn:els[0].dn,bar:12,traceur:true,axis:[[0,y],[m,y]],e:0.35,cond:{A:{els,welds:weldsOf(els),length:m,notes:[]},R:{els:els.map(e=>JSON.parse(JSON.stringify(e))),welds:weldsOf(els),length:m,notes:[]}}},o||{});};
const PU=(dn,dnb)=>T('tee',dn,0.9,{vert:'up',pvKind:'purge',pvDir:'up',dnb}),VI=(dn,dnb)=>T('tee',dn,0.8,{vert:'down',pvKind:'vidange',pvDir:'down',dnb});
const LINES=()=>[
  TL('L1',[T('endpoint',150,0),T('pipe',150,12),PU(150,25),T('pipe',150,12),T('tee',150,1.1),T('pipe',150,10),PU(150,25),T('pipe',150,6),T('reducer',100,0.5),T('pipe',100,12),T('endcap',100,0.3)],{name:'Feeder',startType:'chaufferie',endType:'kit',ends:{start:{type:'chaufferie',dn:150},end:{type:'kit',dn:100}},tranche:'ferme'}),
  TL('L2',[T('pipe',80,12),T('bend',80,0.4),T('pipe',80,8),T('endpoint',80,0)],{name:'Antenne école',parent:'L1',parentM:24,startType:null,endType:'sousstation',ends:{start:null,end:{type:'sousstation',dn:80}}}),
  TL('L3',[T('pipe',65,12),T('pipe',65,3),T('bypass',65,0.6)],{name:'Antenne gymnase',parent:'L1',parentM:36,startType:null,endType:'bypass_extrusion',ends:{start:null,end:{type:'bypass_extrusion',dn:65}}}),
  TL('L4',[T('endpoint',100,0),T('pipe',100,12),VI(100,40),T('pipe',100,12),T('valve',100,0.4),T('pipe',100,5),T('bypass',100,0.6)],{name:'Rue A',startType:'pec',endType:'bypass_regard',ends:{start:{type:'pec',dn:100},end:{type:'bypass_regard',dn:100}}}),
  TL('L5',[T('pipe',50,12),T('pipe',50,2),T('endcap',50,0.3)],{name:'Antenne B',parent:'L4',parentM:12,startType:null,endType:'fondbombe_regard',ends:{start:null,end:{type:'fondbombe_regard',dn:50}}}),
  TL('L6',[T('endpoint',80,0),T('pipe',80,12),PU(80,32),T('pipe',80,4),T('endpoint',80,0)],{name:'Option chaufferie',startType:'insertion',endType:'attente_chaufferie',tranche:'option',option:1,ends:{start:{type:'insertion',dn:80},end:{type:'attente_chaufferie',dn:80}}}),
  TL('L7',[T('endpoint',65,0),T('pipe',65,12),T('pipe',65,12),T('endpoint',65,0)],{name:'Option lotissement',startType:'attente',endType:'sousstation',tranche:'option',option:1}), /* sans ends : startType / endType + DN des bouts */
  TL('L8',[T('endpoint',50,0),T('pipe',50,9),T('bypass',50,0.5)],{name:'Impasse',startType:'sousstation',endType:'bypass'})]; /* ancienne valeur « bypass » = by-pass nu en regard */
const SITE=lines=>({id:'trc_q1',name:'Réseau test Q',source:'traceur',w:200,h:200,fiche:{etude:{aff:N1}},lines,traceur:{v:1,ctx:'etude',cv:1,zones:[{id:'z1',nom:'Zone Nord',lines:['L1','L2','L3','L8']},{id:'z2',nom:'Zone Sud',lines:['L4','L5','L6','L7']}],savedAt:'2026-10-14T18:00:00Z'}});
// ── un ANCIEN tracé (format DXF : els + joints, sans aucun champ du contrat) et l'ancien calcul de traceQty (copie conforme de la base 14/10 soir)
const mk=(id,els,joints,o)=>Object.assign({id,els,joints,length:els.reduce((s,e)=>s+e.len,0)},o||{});
const OLD={id:'trc_old',name:'Ancien tracé',w:100,h:100,fiche:{etude:{aff:N1}},lines:[mk('L1',[{kind:'pipe',dn:100,len:12},{kind:'bend',dn:100,len:0.5},{kind:'pipe',dn:100,len:8},{kind:'tee',dn:100,len:1},{kind:'pipe',dn:100,len:5}],[{idx:0},{idx:2},{idx:3}]),
  mk('L2',[{kind:'pipe',dn:80,len:10},{kind:'valve',dn:80,len:0.3},{kind:'pipe',dn:80,len:3},{kind:'endcap',dn:80,len:0.2}],[{idx:0},{idx:2}],{parent:'L1'}),mk('L3',[{kind:'pipe',dn:65,len:6.5}],[{idx:0}],{parent:'L1'})]};
function traceQtyOld(src,sess){if(!src.length)return null;
  const by={};const g=dn=>by[dn]||(by[dn]={dn,soud:0,mlTr:0,mlTube:0,mlPipe:0,coudes:0,tes:0,piq:0,red:0,vannes:0,kits:0,runs:[]});const ids=new Set(src.filter(Boolean).map(l=>l.id));
  const addRun=(dn,len,bar,n)=>{if(!(len>0.01)||!dn)return;g(dn).runs.push({len,bar:+bar||12,n:n||1});};
  const barresOf=runs=>{const B={};runs.forEach(r=>{const b=B[r.bar]=B[r.bar]||{full:0,rems:[]};for(let c=0;c<r.n;c++){const f=Math.floor(r.len/r.bar+1e-9);b.full+=f;const rem=r.len-r.bar*f;if(rem>0.05)b.rems.push(rem);}});
    let tot=0;Object.keys(B).forEach(k=>{const b=B[k];b.rems.sort((x,y)=>y-x);const bins=[];b.rems.forEach(r=>{let i=-1;for(let j=0;j<bins.length;j++)if(bins[j]+r<=+k+1e-9){i=j;break;}if(i<0)bins.push(r);else bins[i]+=r;});tot+=b.full+bins.length;});return tot;};
  src.forEach(l=>{if(!l)return;const els=Array.isArray(l.els)?l.els:[];const nC=l.single?1:2;const dnOf=i=>{for(let k=0;k<els.length;k++){const a=els[i-k],b=els[i+k];if(a&&+a.dn)return +a.dn;if(b&&+b.dn)return +b.dn;}return +l.dn||0;};
    els.forEach((e,i)=>{if(!e)return;const dn=dnOf(i);if(!dn)return;const r=g(dn);const len=+e.len||0;r.mlTr+=len;r.mlTube+=len*nC;if(e.kind==='pipe')r.mlPipe+=len*nC;else if(e.kind==='bend'||e.kind==='steelbend')r.coudes+=nC;else if(e.kind==='tee')r.tes+=nC;else if(e.kind==='reducer')r.red+=nC;else if(e.kind==='valve')r.vannes+=nC;else if(e.kind==='endcap')r.kits+=nC;});
    {let run=null;const endRun=()=>{if(run){addRun(run.dn,run.len,l.bar,nC);run=null;}};els.forEach((e,i)=>{if(!e)return;const dn=dnOf(i);const len=+e.len||0;if(e.kind==='pipe'&&dn){if(run&&run.dn===dn)run.len+=len;else{endRun();run={dn,len};}}else endRun();});endRun();}
    if(!els.length&&+l.dn&&+l.length){const r=g(+l.dn);r.mlTr+=+l.length;r.mlTube+=(+l.length)*nC;r.mlPipe+=(+l.length)*nC;addRun(+l.dn,+l.length,l.bar,nC);}
    if(l.parent&&ids.has(l.parent)){const d0=dnOf(0);if(d0)g(d0).piq+=nC;}
    if(sess&&l.cond){['A','R'].forEach(c=>{const C=l.cond[c];if(!C||!Array.isArray(C.joints))return;C.joints.forEach(j=>{const e=Array.isArray(C.els)?C.els[j.idx]:null;const dn=+(j.dn||(e&&e.dn)||dnOf(j.idx||0))||0;if(dn)g(dn).soud++;});});}
    else if(Array.isArray(l.joints))l.joints.forEach(j=>{const dn=dnOf(+j.idx||0);if(dn)g(dn).soud+=nC;});});
  const rows=Object.values(by).filter(r=>r.soud||r.mlTr).sort((x,y)=>y.dn-x.dn).map(r=>({dn:r.dn,barres:r.runs.length?barresOf(r.runs):Math.ceil(r.mlPipe/12-1e-9),mlTube:Math.round(r.mlTube*10)/10,mlTr:Math.round(r.mlTr*10)/10,soud:r.soud,coudes:r.coudes,tes:r.tes,piq:r.piq,red:r.red,vannes:r.vannes,kits:r.kits,src:'tracé'}));
  const Tt=k=>rows.reduce((x,r)=>x+(r[k]||0),0);return {rows,tot:{barres:Tt('barres'),mlTube:Tt('mlTube'),mlTr:Math.round(Tt('mlTr')*10)/10,soud:Tt('soud'),coudes:Tt('coudes'),tes:Tt('tes'),piq:Tt('piq'),red:Tt('red'),vannes:Tt('vannes'),kits:Tt('kits')}};}
// ══ mise en place : affaire en devis, base de prix fictive, les deux tracés liés ══
await page.goto(BASE+'/index.html');await wait(600);await page.evaluate(()=>{localStorage.clear();localStorage.setItem('trace:wide','1');});await page.evaluate(()=>new Promise(r=>{try{const q=indexedDB.deleteDatabase('trace-kv');q.onsuccess=q.onerror=q.onblocked=()=>r();}catch(e){r();}}));
await page.reload();await wait(1200);
{const s=await page.$('#loginSkip');if(s&&await s.isVisible())await s.click();await wait(700);}
await newAff(N1,'Réseau de chaleur test Q');await click('tab|chiffrage');
await page.setInputFiles('#eq-app input[data-afprix]',{name:'fixture_prix.xlsx',mimeType:'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',buffer:fs.readFileSync(path.join(HERE,'fixture_prix.xlsx'))});await wait(1500);
await page.evaluate(([s1,s2,n])=>{const T=window.TRACE;T.etude.addSite(s1);T.etude.addSite(s2);T.affaires.set(n,{sites:['trc_q1','trc_old']});},[SITE(LINES()),OLD,N1]);
const Q=await page.evaluate(()=>window.TRACE.etude.qty('trc_q1'));
console.log('0) quantités du tracé :',J(Q.tot),'· extrémités',J(Q.ext),'· tranches',Object.keys(Q.byTranche||{}).join(),'· zones',(Q.byZone||[]).map(z=>z.nom).join());
C.c0=!!(await page.evaluate(()=>window.TRACE.reg.get('prix','base')))&&Q.tot.soud===38&&Q.tot.purges===3&&Q.tot.vidanges===1&&Object.keys(Q.byTranche||{}).join()==='ferme,option 1'&&(Q.byZone||[]).map(z=>z.nom).join()==='Zone Nord,Zone Sud';
// ══ c1 · Quantités : la puce du tracé ══
await openAff(N1,'quantites');await click('qssel|trace:trc_q1');
let out=await page.evaluate(()=>{const R=s=>[...document.querySelectorAll(s)];const t=e=>e.textContent.replace(/[\s  ]+/g,' ').trim();
  return {main:R('#eq-app .cm-qst tr').slice(1).map(r=>[...r.cells].map(t)),head:R('#eq-app .cm-qst tr:first-child th').map(t),
    ext:R('#eq-app [data-qz="ext"] tr[data-qzext]').map(r=>({k:r.dataset.qzext,dn:[...r.querySelectorAll('.qz-dn')].map(t),tot:t(r.cells[2])})),
    tr:R('#eq-app [data-qztr]').map(d=>({k:d.dataset.qztr,s:t(d.querySelector('summary'))})),zo:R('#eq-app [data-qzz]').map(d=>({k:d.dataset.qzz,s:t(d.querySelector('summary'))})),
    btnZ:!!document.querySelector('#eq-app [data-v="qzmk|trc_q1|zones"]'),btnT:!!document.querySelector('#eq-app [data-v="qzmk|trc_q1|tranches"]'),style:!!document.getElementById('css-lot-q')};});
await SHOT('1_quantites','#eq-app .cm-qsets');console.log('1) Quantités :',J({ext:out.ext,tr:out.tr,zo:out.zo,main:out.main.length}));
const fr=(x,d)=>(+x).toLocaleString('fr-FR',{maximumFractionDigits:d||0});
const ex=k=>out.ext.find(e=>e.k===k)||{dn:[],tot:''};
const mainRows=Q.rows.filter(r=>r.soud||r.mlTr);
C.c1=out.head.join('|')==='DN|Barres|ml de tube|ml de tranchée|Soudures|Coudes|Tés|Piquages|Réductions|Vannes|Kits FDL'&&out.main.length===mainRows.length+1&&out.main.slice(0,-1).every((c,i)=>c[0]==='DN '+mainRows[i].dn&&c[4]===fr(mainRows[i].soud))
  &&J(ex('chaufferie').dn)==='["DN 150 × 1"]'&&J(ex('kit').dn)==='["DN 100 × 1"]'&&J(ex('sousstation').dn)==='["DN 80 × 1","DN 65 × 1","DN 50 × 1"]'&&ex('sousstation').tot==='3'&&J(ex('bypass_extrusion').dn)==='["DN 65 × 1"]'
  &&J(ex('bypass_regard').dn)==='["DN 100 × 1","DN 50 × 1"]'&&J(ex('fondbombe_regard').dn)==='["DN 50 × 1"]'&&J(ex('pec').dn)==='["DN 100 × 1"]'&&J(ex('insertion').dn)==='["DN 80 × 1"]'&&J(ex('attente').dn)==='["DN 65 × 1"]'&&J(ex('attente_chaufferie').dn)==='["DN 80 × 1"]'
  &&J(ex('purges').dn)==='["DN 32 × 1","DN 25 × 2"]'&&ex('purges').tot==='3'&&J(ex('vidanges').dn)==='["DN 40 × 1"]'&&out.ext.length===12
  &&out.tr.length===2&&out.tr[0].k==='ferme'&&/^Tranche ferme/.test(out.tr[0].s)&&out.tr[1].k==='option 1'&&/^Option 1/.test(out.tr[1].s)&&out.tr[1].s.includes(fr(Q.byTranche['option 1'].tot.soud)+' soudures')
  &&out.zo.length===2&&/^Zone Nord 4 lignes/.test(out.zo[0].s)&&/^Zone Sud 4 lignes/.test(out.zo[1].s)&&out.zo[0].s.includes(fr(Q.byZone[0].tot.soud)+' soudures')&&out.btnZ&&out.btnT&&out.style;
// ══ c2 · « Créer les zones du chiffrage depuis le tracé » ══
await click('qzmk|trc_q1|zones');await wait(300);const verif2=await checkModal();
let a=await A(N1);const E=a.chiffrage.etudes||[];const zN=E[0]||{},zS=E[1]||{};
out={noms:E.map(z=>z.nom),tab:await page.evaluate(()=>window.TRACE.affaires.state().tab),
  N:{dn:(zN.dn||[]).map(r=>r.dn+':'+r.soud+'/'+r.ml),purges:zN.purges,sst:(zN.sst||[]).map(s=>s.type+':'+s.dn+':'+s.paires),racc:(zN.racc||[]).map(s=>s.type+':'+s.dn+':'+s.qk),ext:(zN.extrusion||[]).map(s=>s.type+':'+s.dn+':'+s.paires),qt:zN.qt,kits:(zN.qtInfo||{}).kits},
  S:{purges:zS.purges,vidanges:zS.vidanges,sst:(zS.sst||[]).map(s=>s.type+':'+s.dn+':'+s.paires),racc:(zS.racc||[]).map(s=>s.type+':'+s.dn+':'+s.paires),qt:zS.qt},
  ui:await page.evaluate(()=>{const b=document.querySelector('#eq-app .qz-zb');return {zb:b?b.textContent.replace(/\s+/g,' ').trim():'',re:!!(b&&b.querySelector('[data-v^="qzre|"]')),tag:[...document.querySelectorAll('#eq-app .ch-bloc[data-bloc="racc"] .qz-rtag')].map(x=>x.textContent.trim())};}),
  calc:await page.evaluate(n=>{const T=window.TRACE;const C=T.affaires.calc(T.affaires.get(n));return {total:Math.round(C.total),racc:Math.round(C.etudes[1].r.postes.racc.achat),sst:Math.round(C.etudes[1].r.postes.sst.achat),ext:Math.round(C.etudes[0].r.postes.extrusion.achat),purges:Math.round(C.etudes[0].r.postes.purges.achat)};},N1)};
await SHOT('2_zone','#eq-app .qz-zb');await SHOT('2_racc','#eq-app .ch-bloc[data-bloc="racc"]');await SHOT('2_sst','#eq-app .ch-bloc[data-bloc="sst"]');out.verif=verif2;console.log('2) zones créées :',J(out));
const zDn=z=>z.rows.filter(r=>r.soud||r.mlTr).sort((x,y)=>x.dn-y.dn).map(r=>r.dn+':'+r.soud+'/'+r.mlTr);
C.c2a=J(out.noms)==='["Zone Nord","Zone Sud"]'&&out.tab==='chiffrage'&&J(out.N.dn)===J(zDn(Q.byZone[0]))&&out.N.purges.dn===25&&out.N.purges.paires===2
  &&J(out.N.sst)===J(['sst_vannes_bs_pn25:80:1','sst_vannes_bs_pn25:50:1','bypass_seul:50:1'])&&J(out.N.racc)===J([':150:chaufferie'])&&J(out.N.ext)===J(['By-pass:140:1'])&&out.N.qt&&out.N.qt.site==='trc_q1'&&out.N.qt.kind==='zone'&&out.N.qt.ref==='z1'&&out.N.kits&&out.N.kits.bouts===1
  &&out.S.purges.dn===32&&out.S.purges.paires===1&&out.S.vidanges.dn===40&&out.S.vidanges.paires===1&&J(out.S.sst)===J(['bypass_seul:100:1','fonds_bombes:50:1','sst_vannes_bs_pn25:65:1'])
  &&J(out.S.racc)===J(['racc_piquage_en_charge:100:1','racc_insertion_de_tes:80:1','racc_attente:80:1','racc_attente:65:1'])&&out.S.qt.ref==='z2'
  &&/Quantités du tracé « Réseau test Q » · zone « Zone Nord »/.test(out.ui.zb)&&out.ui.re&&/1 raccordement \(Raccordement en chaufferie\) : type à choisir/.test(out.ui.zb)&&/kits fin de ligne/.test(out.ui.zb)&&out.ui.tag.some(t=>/type à choisir \(Raccordement en chaufferie\)/.test(t))
  &&out.calc.total>0&&out.calc.racc>0&&out.calc.sst>0&&out.calc.ext>0&&out.calc.purges>0&&/à vérifier/.test(out.verif)&&/Zone Nord : Raccordement en chaufferie DN 150 × 1 : pas de panier de raccordement « chaufferie »/.test(out.verif);
// une 2e fois : les zones déjà reliées au tracé sont MISES À JOUR (16/10, lot TA, contrat K4 : plus de « Ajouter » qui doublerait une zone tracée) — Annuler ne change rien ; « Mettre à jour » (qz-rep) garde 2 zones (mêmes ids)
const ids0=E.map(z=>z.id);await openAff(N1,'quantites');await click('qssel|trace:trc_q1');await click('qzmk|trc_q1|zones');
out={modal:await page.evaluate(()=>{const M=document.getElementById('modal');return M&&M.classList.contains('show')?{t:M.textContent.replace(/\s+/g,' ').trim().slice(0,300),rep:!!document.getElementById('qz-rep'),add:!!document.getElementById('qz-add')}:null;})};
await SHOT('2b_doublon','#modal .box');await page.evaluate(()=>document.querySelector('#modal [data-close]').click());await wait(200);out.afterCancel=(await A(N1)).chiffrage.etudes.length;
await click('qzmk|trc_q1|zones');await page.evaluate(()=>document.getElementById('qz-rep').click());await wait(300);await checkModal();a=await A(N1);out.afterRep={n:a.chiffrage.etudes.length,noms:a.chiffrage.etudes.map(z=>z.nom),ids:a.chiffrage.etudes.map(z=>z.id)};
console.log('2b) doublon :',J(out));
C.c2b=out.modal&&out.modal.rep&&!out.modal.add&&/déjà des zones « Zone Nord », « Zone Sud »/.test(out.modal.t)&&out.afterCancel===2&&out.afterRep.n===2&&J(out.afterRep.noms)==='["Zone Nord","Zone Sud"]'&&J(out.afterRep.ids)===J(ids0);
// ══ c3 · le tracé change (une purge de plus en zone Nord) → « ↻ Reprendre les quantités du tracé » ; une SST saisie à la main reste ══
await page.evaluate(([n])=>{const T=window.TRACE;const a=T.affaires.get(n);const ch=JSON.parse(JSON.stringify(a.chiffrage));ch.etudes[0].sst.push({dn:65,type:'sst_vannes_pap_pn25',paires:2});ch.etudes[0].purges.purgeurAuto=true;T.affaires.set(n,{chiffrage:ch});},[N1]);
await page.evaluate(([site])=>{const L=site.lines[0];['A','R'].forEach(c=>{const els=L.cond[c].els;els.splice(4,0,{kind:'tee',dn:150,len:0.9,vert:'up',pvKind:'purge',dnb:25});let m=0;const y=els[0].from[1];els.forEach(e=>{e.m0=m;m+=e.len;e.m1=m;e.axis=[[[e.m0,y],[e.m1,y]]];e.from=[e.m0,y];e.to=[e.m1,y];});L.cond[c].welds=els.slice(0,-1).map((e,i)=>({idx:i,dn:e.dn,m:i,weldId:'S-'+i}));});window.TRACE.etude.addSite(site);},[SITE(LINES())]);
await openAff(N1,'chiffrage');await page.evaluate(()=>{const s=window.TRACE.affaires.state();});await click('chei|0');const zid=(await A(N1)).chiffrage.etudes[0].id;await click('qzre|'+zid);
a=await A(N1);const z3=a.chiffrage.etudes[0];out={purges:z3.purges,sst:z3.sst.map(s=>s.type+':'+s.dn+':'+s.paires+(s.qk?':'+s.qk:'')),toast:await page.evaluate(()=>document.getElementById('toast').textContent)};
console.log('3) reprise :',J(out));
C.c3=out.purges.paires===3&&out.purges.dn===25&&out.purges.purgeurAuto===true&&out.sst.includes('sst_vannes_pap_pn25:65:2')&&out.sst.filter(s=>/:sousstation$|:bypass_regard$/.test(s)).length===3&&/Quantités reprises du tracé/.test(out.toast)&&/3 paires de purges DN 25/.test(out.toast);
// ══ c4 · « → Une zone par tranche » ══
const Q2=await page.evaluate(()=>window.TRACE.etude.qty('trc_q1'));
await openAff(N1,'quantites');await click('qssel|trace:trc_q1');await click('qzmk|trc_q1|tranches');await wait(300);await checkModal();
a=await A(N1);out={noms:a.chiffrage.etudes.map(z=>z.nom),T:a.chiffrage.etudes.filter(z=>z.qt&&z.qt.kind==='tranche').map(z=>({nom:z.nom,ref:z.qt.ref,soud:z.dn.reduce((s,r)=>s+r.soud,0),ml:Math.round(z.dn.reduce((s,r)=>s+r.ml,0)*10)/10,racc:z.racc.map(x=>x.type+':'+x.dn),purges:z.purges.paires}))};
await openAff(N1,'quantites');await click('qssel|trace:trc_q1');await click('qzmk|trc_q1|tranches');await wait(250);await page.evaluate(()=>document.getElementById('qz-add').click());await wait(300);await checkModal();
out.add=(await A(N1)).chiffrage.etudes.map(z=>z.nom);console.log('4) une zone par tranche :',J(out));
C.c4=J(out.noms)==='["Zone Nord","Zone Sud","Tranche ferme","Option 1"]'&&out.T.length===2&&out.T[0].ref==='ferme'&&out.T[1].ref==='option 1'&&out.T[0].soud+out.T[1].soud===Q2.tot.soud&&Math.abs(out.T[0].ml+out.T[1].ml-Q2.tot.mlTr)<0.15
  &&J(out.T[1].racc)===J(['racc_insertion_de_tes:80','racc_attente:80','racc_attente:65'])&&out.T[1].purges===1&&out.T[0].purges===3
  &&J(out.add)===J(['Zone Nord','Zone Sud','Tranche ferme','Option 1','Tranche ferme (2)','Option 1 (2)'])&&new Set(out.add).size===out.add.length;
// ══ c2c · 2a : référence prise sur le tracé → « → Préremplir le chiffrage » : la zone de lecture reçoit aussi purges, vidanges, SST, raccordements… ══
await newAff(N3,'Préremplissage depuis le tracé');await page.evaluate(n=>window.TRACE.affaires.set(n,{sites:['trc_q1']}),N3);await click('tab|quantites');await click('qstake|trace:trc_q1');await wait(300);
out={ref:await A(N3).then(a=>({pv:a.quantites.pv,ext:a.quantites.ext,kits:a.quantites.kits})),card:await page.evaluate(()=>{const b=document.querySelector('#eq-app [data-qz="ref"]');return b?b.querySelectorAll('tr[data-qzext]').length:0;}),split:await has('qzsplit|')};
await SHOT('2c_reference','#eq-app .cm-qref');await click('qprefill|');await wait(400);out.verif=await checkModal();
a=await A(N3);const zl=(a.chiffrage.etudes||[]).find(z=>z.source==='quantites')||{};Object.assign(out,{toast:await page.evaluate(()=>document.getElementById('toast').textContent),dn:(zl.dn||[]).length,purges:zl.purges,vidanges:zl.vidanges,sst:(zl.sst||[]).map(x=>x.type+':'+x.dn),racc:(zl.racc||[]).map(x=>(x.type||'?')+':'+x.dn),ext:(zl.extrusion||[]).map(x=>x.type+':'+x.dn),qt:!!zl.qt,info:zl.qtInfo,band:await page.evaluate(()=>(document.querySelector('#eq-app .qz-zb')||{}).textContent||'')});
console.log('2c) préremplissage depuis le tracé :',J(out));
C.c2c=out.ref.pv&&out.ref.pv.purges[25]===3&&out.ref.pv.purges[32]===1&&out.ref.ext&&out.ref.ext.sousstation&&out.card===12&&out.split&&/prérempli : 5 DN/.test(out.toast)&&/4 paires de purges DN 25 · 1 paire de vidanges DN 40/.test(out.toast)&&/purges à plusieurs DN \(DN 32 × 1, DN 25 × 3\) : comptées au DN 25/.test(out.verif)&&/type à choisir/.test(out.verif)&&out.dn===5&&out.purges.dn===25&&out.purges.paires===4&&out.vidanges.paires===1
  &&out.sst.length===6&&out.racc.length===5&&out.racc.includes('?:150')&&J(out.ext)===J(['By-pass:140'])&&!out.qt&&out.info&&out.info.kits&&/repris du tracé avec les quantités de référence/.test(out.band);
// ══ c5 · répartition d'une étude fournisseur importée sur 3 zones ══
await newAff(N2,'Répartition test');await click('tab|quantites');
const H='Type de pièce\tDN\tDN 2\tAngle (°)\tLongueur (m)\tQuantité\tUnité\tGaine Ø (mm)\tRéf. fournisseur\tDésignation fournisseur';
const TA=[H,'Barre\t200\t\t\t12\t25\tu\t\t\tConduite DN 200','Manchon\t200\t\t\t\t31\tu\t\t\tJoint DN 200','Coude\t200\t\t90\t\t4\tu\t\t\tCoude DN 200','Barre\t80\t\t\t12\t11\tu\t\t\tConduite DN 80','Manchon\t80\t\t\t\t13\tu\t\t\tJoint DN 80'].join('\n');
await click('qsimp|');await wait(200);await page.evaluate(()=>{document.getElementById('qi-nom').value='Fournisseur fictif';document.querySelector('#modal [data-iqm="paste"]').click();});await wait(200);
await page.evaluate(t=>{document.getElementById('iq-paste').value=t;document.getElementById('iq-read').click();},TA);await wait(300);await page.evaluate(()=>document.getElementById('qi-ok').click());await wait(400);
a=await A(N2);const set0=J(a.qsets);await click('qstake|'+a.qsets[0].id);await wait(300);await click('qprefill|');await wait(300);await openAff(N2,'quantites');
a=await A(N2);const ref=a.quantites.rows.map(r=>({dn:+r.dn,soud:+r.soud,ml:+r.ml}));const nLect=a.chiffrage.etudes.length;
await click('qzsplit|');await wait(250);await chg('#qz-n','3');await wait(250);
out={modal:await page.evaluate(()=>({h:(document.querySelector('#modal h3')||{}).textContent||'',zones:document.querySelectorAll('#modal .qz-zr').length,pct:[0,1,2].map(i=>(document.getElementById('qz-pct-'+i)||{}).value),drop:!!(document.getElementById('qz-drop')||{}).checked,prev:document.querySelectorAll('#modal #qz-prev tr').length}))};
await SHOT('5_repartir','#modal .box');await page.evaluate(()=>{const n=document.getElementById('qz-nom-0');n.value='Lot A';n.dispatchEvent(new Event('input'));});
await page.evaluate(()=>document.getElementById('qz-ok').click());await wait(400);
a=await A(N2);const ZS=a.chiffrage.etudes;
out.zones=ZS.map(z=>({nom:z.nom,rep:z.rep&&z.rep.i+'/'+z.rep.n,dn:z.dn.map(r=>r.dn+':'+r.soud+'/'+r.ml)}));out.setSame=J(a.qsets)===set0;out.lect=ZS.some(z=>z.source==='quantites');
const tot=(dn,k)=>ZS.reduce((s,z)=>s+((z.dn.find(r=>r.dn===dn)||{})[k]||0),0);
out.tot=ref.map(r=>({dn:r.dn,soud:tot(r.dn,'soud'),ml:Math.round(tot(r.dn,'ml')*10)/10,refS:r.soud,refM:r.ml}));
console.log('5) répartition :',J(out));
C.c5=nLect===1&&/Répartir sur 3 zones/.test(out.modal.h)&&out.modal.zones===3&&J(out.modal.pct)==='["33.3","33.3","33.4"]'&&out.modal.drop&&out.modal.prev===5&&ZS.length===3&&!out.lect&&J(ZS.map(z=>z.nom))==='["Lot A","Zone 2","Zone 3"]'
  &&ZS.every((z,i)=>z.rep&&z.rep.i===i+1&&z.rep.n===3&&z.dn.every(r=>Number.isInteger(r.soud)))&&out.tot.every(t=>t.soud===t.refS&&Math.abs(t.ml-t.refM)<1e-9)&&out.setSame;
// ══ c5b · même fenêtre, clé « ml par DN » : 2 zones (Rue 1 : 100 ml de DN 200 ; Rue 2 : 50 ml de DN 200 + 66 ml de DN 80) — noms nouveaux : créées tout de suite ══
await openAff(N2,'quantites');await click('qzsplit|');await wait(250);await chg('#modal input[name=qz-mode][value=ml]',true);await wait(200);await chg('#qz-n','2');await wait(200);
out={inputs:await page.evaluate(()=>document.querySelectorAll('#modal input[id^="qz-ml-"]').length)};
for(const [id,v] of [['qz-nom-0','Rue 1'],['qz-nom-1','Rue 2'],['qz-ml-0-200','100'],['qz-ml-1-200','50'],['qz-ml-1-80','66']])await chg('#'+id,v);
out.prev=await page.evaluate(()=>[...document.querySelectorAll('#modal #qz-prev tr')].slice(1).map(r=>[...r.cells].map(c=>c.textContent.trim()).join('|')));
await page.evaluate(()=>document.getElementById('qz-ok').click());await wait(400);
a=await A(N2);out.z=a.chiffrage.etudes.filter(z=>/^Rue/.test(z.nom)).map(z=>({nom:z.nom,dn:z.dn.map(r=>r.dn+':'+r.soud+'/'+r.ml),cle:(z.rep||{}).cle}));out.n=a.chiffrage.etudes.length;
console.log('5b) clé ml par DN :',J(out));
C.c5b=out.inputs===4&&J(out.prev.slice(0,2))===J(['Rue 1|21|102,7','Rue 2|23|117,3'])&&J(out.z)===J([{nom:'Rue 1',dn:['200:21/102.7'],cle:'ml'},{nom:'Rue 2',dn:['80:13/66','200:10/51.3'],cle:'ml'}])&&out.n===5; /* 29/10 (lot 2910a) : la référence DN 200 de l'étude compte maintenant ses pièces (154 ml au lieu de 150) — la clé « ml » répartit 100 / 50 au prorata de 154 */
// ══ c6 · panier « BY-PASS DERRIÈRE VANNES SST » ══
await page.evaluate(n=>{const T=window.TRACE;const a=T.affaires.get(n);const ch=JSON.parse(JSON.stringify(a.chiffrage));ch.etudes[0].sst=[{dn:50,type:'sst_vannes_bs_pn25',paires:2,bypass:true}];T.affaires.set(n,{chiffrage:ch});},N2);
const BPZ=()=>page.evaluate(n=>{const T=window.TRACE;const C=T.affaires.calc(T.affaires.get(n));const r=C.etudes[0].r;const s=r.detail.sst.rows[0];return {pu:Math.round(s.pu*100)/100,bypass:Math.round(s.bypass*100)/100,miss:(s.missing||[]).map(m=>m.label),pS:Math.round(r.detail.prix.soud(50)*100)/100};},N2);
const PAN=async()=>{await openAff(N2,'chiffrage');await click('chview|paniers');await click('chpan|bp_sst');await click('chpandn|50');return page.evaluate(()=>{const d=document.querySelector('#eq-app .ch-pan-detail');const t=e=>e.textContent.replace(/[\s  ]+/g,' ').trim();
  return d?{tot:t(d.querySelector('.ac-stat.or b')),fo:[...d.querySelectorAll('.ch-2col>div:nth-child(2) table tr')].slice(1).map(r=>t(r.cells[0])+' | '+(r.cells[1].querySelector('input')||{}).value),mo:[...d.querySelectorAll('.ch-2col>div:first-child table tr')].slice(1,2).map(r=>t(r.cells[0])),note:t(document.querySelector('#eq-app .ch-bpnote')||{textContent:''})}:null;});};
/* dans l'appli, l'import du classeur ne garde pas les blocs bruts (chiffrage.js : delete base.op.blocks) : le by-pass ne se décompose JAMAIS par les colonnes du classeur —
   avant le lot Q : une seule ligne « Fournitures du by-pass (total du classeur) » = TOTAL BY-PASS du classeur − sa MO (fixture : 820 € dont 4 h × 190 €) */
const bp50=await page.evaluate(()=>{const b=window.TRACE.reg.get('prix','base');const r=(b.op.bypass||[]).find(x=>x.dn===50);return r?{tot:r.totBypass,h:r.hBypass,rate:r.rateStored,blocks:!!b.op.blocks}:null;});
out={bp50,p0:await PAN(),z0:await BPZ()};await SHOT('6_paniers','#eq-app .ch-pan-detail');
await click('chei|0');await page.evaluate(()=>{const b=document.querySelector('#eq-app .ch-bloc[data-bloc="sst"].folded .ch-fold');if(b)b.click();});await wait(250);
await page.evaluate(()=>{const b=document.querySelector('#eq-app .ch-bloc[data-bloc="sst"] [data-v^="chpdet|bp_sst|50"]');if(b)b.click();});await wait(300);
await SHOT('6_bypass_zone','#eq-app .ch-bloc[data-bloc="sst"]');out.zoneDet=await page.evaluate(()=>{const b=[...document.querySelectorAll('#eq-app .ch-bloc[data-bloc="sst"] .ch-pdet.open')].find(x=>/By-pass derrière/.test(x.textContent));return b?{rows:[...b.querySelectorAll('table.ch-pdt tr')].map(r=>r.cells[0].textContent.replace(/\s+/g,' ').trim()),hint:(b.querySelector('.hint')||{}).textContent||''}:null;});
await page.evaluate(()=>{const b=window.TRACE.reg.get('prix','base');window.__bp=b.op.bypass;delete b.op.bypass;}); /* un classeur SANS bloc by-pass */
out.p2=await PAN();out.z2=await BPZ();
const coude50=await page.evaluate(()=>{const b=window.TRACE.reg.get('prix','base');const T=b.fo.tables.FO_Accessoires_Acier;const r=T.rows.find(x=>+x[T.cols[0]]===50);return +r[T.cols.find(c=>/souder/i.test(c))];});
await page.evaluate(()=>{const b=window.TRACE.reg.get('prix','base');b.op.bypass=window.__bp;});out.z3=await BPZ(); /* base remise */
console.log('6) by-pass :',J(out),'· coude DN 50',coude50);
const eurTxt=x=>(+x).toLocaleString('fr-FR',{maximumFractionDigits:0})+' €';
/* 14/10 nuit (lot P) : libellé « Coude acier nu à souder 90° DN … » (Ethan : « deux coudes acier nu du même DN ») */
C.c6=out.bp50&&!out.bp50.blocks&&out.p0&&sp(out.p0.tot)===sp(eurTxt(out.bp50.tot))&&Math.abs(out.z0.bypass-out.bp50.tot)<0.01&&out.p0.fo.length===3&&/^Coude acier nu à souder 90° DN 50 \| 2$/.test(out.p0.fo[0])&&/^Vannette 15\/21/.test(out.p0.fo[1])&&/écart au total/.test(out.p0.fo[2])&&/Composition par défaut/.test(out.p0.note)&&out.p0.mo.length===1
  &&out.zoneDet&&out.zoneDet.rows.some(t=>/^Coude acier nu à souder 90° DN 50/.test(t))&&out.zoneDet.rows.some(t=>/^Vannette 15\/21/.test(t))&&out.zoneDet.rows.some(t=>/^MO/.test(t))&&/Composition par défaut/.test(out.zoneDet.hint)
  &&out.p2&&/^Coude acier nu à souder 90° DN 50 \| 2$/.test(out.p2.fo[0])&&/prix manquant/.test(out.p2.fo[1])&&Math.abs(out.z2.bypass-(4*out.z2.pS+2*coude50))<0.02&&out.z2.miss.includes('Vannette 15/21')&&J(out.z3)===J(out.z0);
// ══ c7 · ancien tracé : mêmes quantités qu'avant ══
const qo=await page.evaluate(()=>window.TRACE.etude.qty('trc_old'));const eo=traceQtyOld(OLD.lines,false);const K=['dn','barres','mlTube','mlTr','soud','coudes','tes','piq','red','vannes','kits','src'];
out={rows:J(qo.rows.map(r=>K.map(k=>r[k])))===J(eo.rows.map(r=>K.map(k=>r[k]))),tot:J(Object.keys(eo.tot).map(k=>qo.tot[k]))===J(Object.values(eo.tot)),ext:J(qo.ext),bt:!!qo.byTranche,bz:!!qo.byZone,pv:qo.tot.purges+qo.tot.vidanges};
await openAff(N1,'quantites');await click('qssel|trace:trc_old');out.blocks=await page.evaluate(()=>document.querySelectorAll('#eq-app .qz-blk').length);
console.log('7) ancien tracé :',J(out),J(eo.tot));
C.c7=out.rows&&out.tot&&out.ext==='{}'&&!out.bt&&!out.bz&&out.pv===0&&out.blocks===0;
// ══ c8 · téléphone 390 px : rien ne déborde, boutons ≥ 34 px ══
await page.setViewportSize({width:390,height:844});await wait(400);await openAff(N1,'quantites');await click('qssel|trace:trc_q1');
await page.evaluate(()=>document.querySelectorAll('#eq-app details.qz-sub').forEach(d=>d.open=true));await wait(200);await SHOT('8_tel_quantites','#eq-app .cm-qsets');
out=await page.evaluate(()=>{const vw=document.documentElement.clientWidth;const bad=[...document.querySelectorAll('#eq-app .qz-blk, #eq-app .qz-blk .btn, #eq-app .qz-sub summary')].filter(e=>{const r=e.getBoundingClientRect();return r.width>0&&(r.right>vw+1||r.left<-1);}).map(e=>e.className);
  const small=[...document.querySelectorAll('#eq-app .qz-acts .btn, #eq-app .qz-sub>summary')].filter(e=>e.getBoundingClientRect().height<34).length;return {vw,sw:document.documentElement.scrollWidth,bad,small,n:document.querySelectorAll('#eq-app .qz-blk').length};});
await openAff(N1,'chiffrage');await click('chei|0');out.zb=await page.evaluate(()=>{const vw=document.documentElement.clientWidth;const b=document.querySelector('#eq-app .qz-zb');const r=b&&b.getBoundingClientRect();const bt=b&&b.querySelector('.btn');return b?{fits:r.right<=vw+1&&r.left>=-1,btnH:bt?bt.getBoundingClientRect().height:0,sw:document.documentElement.scrollWidth,vw}:null;});
await SHOT('8_tel_zone','#eq-app .qz-zb');await openAff(N2,'quantites');await click('qzsplit|');await wait(250);await SHOT('8_tel_repartir','#modal .box');out.modal=await page.evaluate(()=>{const vw=document.documentElement.clientWidth;const m=document.querySelector('#modal .box');const r=m&&m.getBoundingClientRect();return {fits:!!r&&r.right<=vw+1&&r.left>=-1,inputs:[...document.querySelectorAll('#modal .qz-m input.f')].every(i=>i.getBoundingClientRect().height>=34),sw:document.documentElement.scrollWidth,vw};});
await page.evaluate(()=>document.querySelector('#modal [data-close]').click());
console.log('8) téléphone :',J(out));
C.c8=out.n>=3&&!out.bad.length&&out.small===0&&out.sw<=out.vw+1&&out.zb&&out.zb.fits&&out.zb.btnH>=34&&out.zb.sw<=out.zb.vw+1&&out.modal.fits&&out.modal.inputs&&out.modal.sw<=out.modal.vw+1;
// ══ c9 · le même tracé OUVERT dans l'appli (lignes de session) : mêmes quantités que jamais ouvert (extrémités, tranches, zones comprises) ══
out={raw:await page.evaluate(()=>window.TRACE.etude.qty('trc_q1'))};
out.open=await page.evaluate(async()=>{const T=window.TRACE;await T.switchSite('trc_q1');await new Promise(r=>setTimeout(r,800));return {cur:T.state.siteId,n:Object.keys(T.lines||{}).length,q:T.etude.qty('trc_q1')};});
console.log('9) tracé ouvert :',out.open.cur,out.open.n,J(out.open.q&&out.open.q.tot));
C.c9=out.open.cur==='trc_q1'&&out.open.n===8&&J(out.open.q)===J(out.raw);
C.console=logs.length===0;
const bad=Object.entries(C).filter(([k,v])=>!v).map(([k])=>k);console.log(bad.length?'RESULTAT: ECHEC '+bad.join(','):'RESULTAT: TOUT VERT');console.log(logs.length?logs:'[]');
await browser.close();
