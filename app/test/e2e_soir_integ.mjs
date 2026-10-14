// e2e_soir_integ.mjs — 14/10 SOIR : ASSEMBLAGE des lots T1 (traceur : extrémités, tranche, zones, dilatation) × L (liaison, retour à l'affaire, quantités sans ouvrir)
// × Q (quantités du tracé, zones du chiffrage depuis le tracé) × P (base de prix). Ce qu'aucun lot ne pouvait tester seul : le VRAI traceur ouvert depuis l'affaire
// remet un tracé que l'appli lie une fois, compte (extrémités, purges, tranches, zones) et transforme en zones de chiffrage remplies — et ça tient après actualisation.
// Données 100 % FICTIVES (affaire, base fixture_prix.xlsx, tableau de dilatation inventé), hors connexion.
//  c1 · « ✎ Dessiner le projet » → traceur.html?site=new&aff=…&cv=1 ;
//  c2 · traceur : extrémités (PEC, sous-station, insertion, fond bombé en regard), option 1, 2 zones, alertes dilatation (lyre + té) avec un tableau FICTIF ;
//  c3 · enregistrement → étude (ctx 'etude', ni marché ni TS), ends / tranche / zones dans le chantier remis ;
//  c4 · « ↩ Retour à l'affaire » → l'affaire, l'étude liée UNE fois ;
//  c5 · quantités du tracé : extrémités par type × DN, purges, tranches, zones ;
//  c6 · « Créer les zones du chiffrage depuis le tracé » → Zone Nord / Zone Sud remplies (raccordements, SST, fonds bombés, purges) ;
//  c7 · actualisation : quantités toujours là sans rien ouvrir, aucune liaison en plus ; c8 · console vide.
import { chromium } from 'playwright';
import path from 'path';import {fileURLToPath} from 'url';
const HERE=path.dirname(fileURLToPath(import.meta.url));
const BASE=process.env.BASE||'http://localhost:8765';
const browser=await chromium.launch({headless:true, executablePath: process.env.CHROMIUM_PATH||undefined});
const ctx=await browser.newContext({viewport:{width:1280,height:900}});const page=await ctx.newPage();
await ctx.route(u=>!/^(localhost|127\.0\.0\.1)$/.test(new URL(u).hostname),r=>r.fulfill({status:204,body:''})); // aucun réseau extérieur
const logs=[];page.on('pageerror',e=>logs.push('PAGEERROR: '+e.message.slice(0,300)));page.on('console',m=>{if(m.type()==='error'&&!/supabase|Failed to fetch|net::ERR|404|WebSocket|pdf\.worker|cdnjs/i.test(m.text()))logs.push(m.text().slice(0,200));});
page.on('dialog',d=>d.accept().catch(()=>{}));
const C={};const wait=ms=>page.waitForTimeout(ms);const J=x=>JSON.stringify(x);const NUM='O2610-81';
const click=async v=>{await page.evaluate(v=>{const el=document.querySelector(`#eq-app [data-act=af][data-v="${v}"]`);if(!el)throw new Error('bouton absent '+v);el.click();},v);await wait(300);};
const openAff=async(n,tab)=>{await page.evaluate(([n,t])=>{const T=window.TRACE;const S=T.affaires.state();S.view='fiche';S.cur=n;S.tab=t;T.renderHome();},[n,tab]);await wait(400);};
const until=async(fn,ms)=>{const t0=Date.now();let v=null;while(Date.now()-t0<(ms||15000)){try{v=await fn();}catch(e){v=null;}if(v)return v;await wait(250);}return v;};
// ── 1) appareil vierge, affaire, base de prix fictive, tableau de dilatation FICTIF
await page.goto(BASE+'/index.html');await wait(600);await page.evaluate(()=>{localStorage.clear();localStorage.setItem('trace:wide','1');});await page.evaluate(()=>new Promise(r=>{try{const q=indexedDB.deleteDatabase('trace-kv');q.onsuccess=q.onerror=q.onblocked=()=>r();}catch(e){r();}}));
await page.reload();await wait(1200);{const s=await page.$('#loginSkip');if(s&&await s.isVisible())await s.click();await wait(700);}
await page.evaluate(async n=>{const T=window.TRACE;T.state.userId='ethan';T.renderHome();document.getElementById('htCom').click();await new Promise(x=>setTimeout(x,300));
  document.querySelector('#eq-app [data-act=af][data-v="new|"]').click();await new Promise(x=>setTimeout(x,150));document.getElementById('afn-num').value=n;document.getElementById('afn-nom').value='Assemblage du soir';document.getElementById('afn-client').value='CLIENT TEST';document.getElementById('afn-etat').value='devis';
  document.querySelector('#eq-app [data-act=af][data-v="create|"]').click();await new Promise(x=>setTimeout(x,250));document.querySelector('#eq-app [data-act=af][data-v="tab|chiffrage"]').click();await new Promise(x=>setTimeout(x,200));},NUM);
await page.setInputFiles('#eq-app input[data-afprix]',path.join(HERE,'fixture_prix.xlsx'));await wait(1500);
const ROW=v=>[v,v,v,v,v].map(x=>x.slice());const TAB=[{dn:50,gaine:125,v:ROW([90,80,70])},{dn:100,gaine:200,v:ROW([40,35,30])}]; /* FICTIF : DN 100 → 30 m à 150 N/mm² */
await page.evaluate(t=>localStorage.setItem('trace:regles',JSON.stringify({lmax:{titre:'tableau fictif',serie:'1',unite:'m',profondeurs:[0.8,1.0,1.2,1.4,1.6],contraintes:[190,168,150],temperatures:[120,110],tables:{'120':t,'110':t}},teMaxDroit:10})),TAB);
// ── c1 · le traceur s'ouvre DEPUIS l'affaire (onglet Tracé & chantiers)
await openAff(NUM,'sites');
const navs=[];page.on('request',r=>{if(r.isNavigationRequest())navs.push(r.url());});
let out={btn:await page.evaluate(()=>!!document.querySelector('#eq-app [data-act="tabgo"][data-v="traceur"]'))};
await Promise.all([page.waitForURL(/traceur\.html/,{timeout:15000}),page.evaluate(()=>document.querySelector('#eq-app [data-act="tabgo"][data-v="traceur"]').click())]);await wait(900);
out.url=navs.filter(u=>/traceur\.html/.test(u)).pop()||page.url();console.log('1) ouverture du traceur :',J(out));
C.c1=out.btn&&new RegExp('site=new&aff='+NUM+'&cv=1').test(out.url);
// ── c2 · lignes, extrémités, option, zones, dilatation
await page.evaluate(()=>{const M=window.MAQ;M.state.supplier='AXIOM';M.state.lines=[
  {id:'L1',name:'Rue de l\'Essai',dn:100,bar:12,pts:[[0,0],[0,10],[60,10],[60,20]],specials:[{id:'p1',type:'tee',vert:'up',pvKind:'purge',m:30,dnb:25}],parent:null,inv:true,startType:'pec',endType:'sousstation'},
  {id:'L2',name:'Antenne École',dn:65,bar:12,pts:[[30,10],[30,25]],specials:[],parent:{line:'L1',m:40,side:1},inv:true,endType:'sousstation'},
  {id:'L3',name:'Rue de l\'Option',dn:80,bar:12,pts:[[0,50],[40,50]],specials:[],parent:null,inv:true,startType:'insertion',endType:'fondbombe_regard',tranche:'option',option:1}];
  M.state.seq=4;M.state.zones=[{id:'z1',nom:'Zone Nord',lines:['L1','L2']},{id:'z2',nom:'Zone Sud',lines:['L3']}];M.setMode('select');M.state.sel=null;M.rebuild();document.getElementById('zFit').click();});
await wait(500);
out={foot:await page.evaluate(()=>document.getElementById('foot').textContent.replace(/\s+/g,' ')),zones:await page.evaluate(()=>window.MAQ.state.zones.map(z=>z.nom+':'+z.lines.join('+'))),
  marks:await page.evaluate(()=>[...document.querySelectorAll('#net .t1-endmark text')].map(t=>t.textContent).sort())};
console.log('2) traceur :',J(out));
C.c2=/2 alertes dilatation/.test(out.foot)&&J(out.zones)==='["Zone Nord:L1+L2","Zone Sud:L3"]'&&['PEC','SST','Té ins.','FB regard'].every(x=>out.marks.includes(x));
// ── c3 · enregistrement : une ÉTUDE (ni marché ni TS), extrémités, tranche, zones dans le chantier remis
await page.click('#bSave');await wait(300);await page.fill('#svName','Réseau assemblage');await page.click('#svOk');await wait(1600);
const SID=await page.evaluate(()=>window.MAQ.state.siteRef&&window.MAQ.state.siteRef.id);
const site=await page.evaluate(id=>new Promise(res=>{const q=indexedDB.open('trace-kv');q.onsuccess=()=>{try{const g=q.result.transaction('kv','readonly').objectStore('kv').get('trace:handoff:'+id);g.onsuccess=()=>res(g.result||null);g.onerror=()=>res(null);}catch(e){res(null);}};q.onerror=()=>res(null);}),SID);
const L=id=>site&&site.lines.find(l=>l.id===id);
out={id:SID,ctx:site&&site.traceur&&site.traceur.ctx,cv:site&&site.traceur&&site.traceur.cv,marche:!!(site&&site.marche),ts:!!(site&&site.ts),ends1:L('L1')&&L('L1').ends,ends3:L('L3')&&L('L3').ends,tr3:L('L3')&&[L('L3').tranche,L('L3').option],v:L('L1')&&[L('L1').v0,L('L1').vm],zones:site&&site.traceur&&(site.traceur.zones||[]).map(z=>z.nom+':'+z.lines.join('+'))};
console.log('3) chantier remis :',J(out));
C.c3=!!SID&&out.ctx==='etude'&&out.cv===1&&!out.marche&&!out.ts&&J(out.ends1)==='{"start":{"type":"pec","dn":100},"end":{"type":"sousstation","dn":100}}'&&out.ends3&&out.ends3.start.type==='insertion'&&out.ends3.end.type==='fondbombe_regard'
  &&J(out.tr3)==='["option",1]'&&J(out.v)==='[1,1]'&&J(out.zones)==='["Zone Nord:L1+L2","Zone Sud:L3"]';
// ── c4 · « ↩ Retour à l'affaire » → l'affaire, l'étude liée UNE fois
await Promise.all([page.waitForURL(/index\.html\?aff=/,{timeout:15000}),page.click('#svGo')]);
await wait(1200);await page.evaluate(()=>{const T=window.TRACE;T.state.userId='ethan';T.renderHome();}); /* hors connexion : les droits Commerce arrivent après le chargement (cf. e2e_commerce4) ; l'enchaînement des écrans connecté est vérifié par e2e_l_1410 */
const back=await until(()=>page.evaluate(n=>{const T=window.TRACE;if(!T||!T.affaires)return null;const S=T.affaires.state();const a=T.affaires.get(n);return S.cur===n&&a&&(a.sites||[]).length?{tab:S.tab,sites:a.sites}:null;},NUM),20000);
out={back,btn:await page.evaluate(()=>{const b=[...document.querySelectorAll('#eq-app button,#eq-app a')].find(x=>/Ouvrir dans le traceur/.test(x.textContent));return b?(b.dataset.v||b.getAttribute('href')||'ok'):null;})};
console.log('4) retour à l\'affaire :',J(out));
C.c4=!!back&&back.sites.filter(x=>x===SID).length===1&&back.sites.length===1&&!!out.btn;
// ── c5 · quantités du tracé : extrémités, purges, tranches, zones
const Q=await until(()=>page.evaluate(id=>{const q=window.TRACE.etude.qty(id);return q&&q.rows&&q.rows.length?q:null;},SID),15000);
out={ext:Q&&Q.ext,purges:Q&&Q.tot&&Q.tot.purges,tranches:Q&&Q.byTranche?Object.keys(Q.byTranche):null,zones:Q&&Q.byZone?Q.byZone.map(z=>z.nom):null};
console.log('5) quantités :',J(out));
C.c5=!!Q&&out.ext&&J(out.ext.pec)==='{"100":1}'&&out.ext.sousstation&&out.ext.sousstation[100]===1&&out.ext.sousstation[65]===1&&J(out.ext.insertion)==='{"80":1}'&&J(out.ext.fondbombe_regard)==='{"80":1}'
  &&out.purges===1&&J(out.tranches)==='["ferme","option 1"]'&&J(out.zones)==='["Zone Nord","Zone Sud"]';
// ── c6 · « Créer les zones du chiffrage depuis le tracé »
await openAff(NUM,'quantites');await wait(300);await click('qssel|trace:'+SID);await wait(300);
const hasMk=await page.evaluate(id=>!!document.querySelector(`#eq-app [data-act=af][data-v="qzmk|${id}|zones"]`),SID);
if(hasMk)await click('qzmk|'+SID+'|zones');await wait(500);
const a6=await page.evaluate(n=>window.TRACE.affaires.get(n),NUM);const E=((a6||{}).chiffrage||{}).etudes||[];const zN=E.find(z=>z.nom==='Zone Nord'),zS=E.find(z=>z.nom==='Zone Sud');
const R=z=>z?{racc:(z.racc||[]).map(r=>(r.type||'')+':'+r.dn),sst:(z.sst||[]).map(s=>s.type+':'+s.dn+':'+s.paires),purges:z.purges&&[z.purges.dn,z.purges.paires],dn:(z.dn||[]).map(r=>r.dn+':'+r.soud)}:null;
out={hasMk,noms:E.map(z=>z.nom),N:R(zN),S:R(zS)};
console.log('6) zones du chiffrage :',J(out));
C.c6=hasMk&&J(out.noms)==='["Zone Nord","Zone Sud"]'&&out.N.racc.includes('racc_piquage_en_charge:100')&&out.N.sst.some(s=>/^sst_.*:100:1$/.test(s))&&out.N.sst.some(s=>/^sst_.*:65:1$/.test(s))&&J(out.N.purges)==='[25,1]'
  &&out.S.racc.includes('racc_insertion_de_tes:80')&&out.S.sst.includes('fonds_bombes:80:1')&&out.N.dn.length>=2&&out.S.dn.length===1;
// ── c7 · actualisation : quantités toujours là sans rien ouvrir, aucune liaison en plus
await page.reload();await wait(1500);
const Q2=await until(()=>page.evaluate(id=>{const q=window.TRACE.etude.qty(id);return q&&q.rows&&q.rows.length?q:null;},SID),20000);
const a7=await page.evaluate(n=>window.TRACE.affaires.get(n),NUM);
out={q2:!!Q2&&Q2.tot&&Q2.tot.soud,q1:Q&&Q.tot&&Q.tot.soud,sites:a7&&a7.sites,screen:await page.evaluate(()=>window.TRACE.state.screen)};
console.log('7) après actualisation :',J(out));
C.c7=!!Q2&&out.q2===out.q1&&J(out.sites)===J([SID]);
C.c8=logs.length===0;
const bad=Object.entries(C).filter(([k,v])=>!v).map(([k])=>k);console.log(bad.length?'RESULTAT: ECHEC '+bad.join(','):'RESULTAT: TOUT VERT');console.log(logs.length?logs:'[]');
await browser.close();
