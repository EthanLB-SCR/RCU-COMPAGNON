// ACTIVITÉ SUR UNE PÉRIODE (Ethan 09/10) : bouton 📅 du plan → période (presets, dates) + personne → les soudures travaillées ressortent (anneau couleur de l'opération),
// le reste est grisé, les opérations sont comptées (par type, par DN, par personne), déchargements et notes compris ; la conversation suit la période ; affichage large = tout l'écran.
import { chromium } from 'playwright';
const BASE=process.env.BASE||'http://localhost:8765';
const browser=await chromium.launch({headless:true, executablePath: process.env.CHROMIUM_PATH||undefined});
const ctx=await browser.newContext({viewport:{width:1000,height:900}});const page=await ctx.newPage();
const logs=[];page.on('pageerror',e=>logs.push('PAGEERROR: '+e.message.slice(0,300)));page.on('console',m=>{if(m.type()==='error'&&!/supabase|Failed to fetch|net::ERR|404/i.test(m.text()))logs.push(m.text().slice(0,200));});
page.on('dialog',d=>d.accept().catch(()=>{}));
const C={};
await page.goto(BASE+'/traceur.html');await page.waitForTimeout(500);await page.evaluate(()=>{localStorage.clear();});await page.reload();await page.waitForTimeout(500);
await page.evaluate(()=>{const S=window.MAQ.state;S.supplier='RENALIA';S.lines=[{id:'L1',name:'Rue de la Gare',dn:150,bar:12,pts:[[10,50],[130,50]],specials:[],parent:null},{id:'L2',name:'Antenne école',dn:100,bar:12,pts:[[60,50],[60,90]],specials:[],parent:{line:'L1',m:50,side:1}}];S.seq=3;window.MAQ.setMode('select');window.MAQ.rebuild();});
await page.click('#bSave');await page.waitForTimeout(200);await page.fill('#svName','Activité test');await page.click('#svOk');await page.waitForTimeout(700);await page.click('#svGo');await page.waitForTimeout(1500);await page.selectOption('#roleSel','ethan');await page.waitForTimeout(300);
// matière : Karim soude 5 soudures DN150 il y a 3 jours et 2 DN100 aujourd'hui ; Julien raccorde 3 fils hier et manchonne 2 il y a 10 jours ; un contrôle d'Ethan hier ; une livraison hier ; une note de conversation il y a 3 jours
await page.evaluate(()=>window.TRACE.centerOn(60,58,8)); /* zoom où les pastilles sont dessinées (kpm ≥ 5) */
const D=await page.evaluate(()=>{const T=window.TRACE;const d=n=>new Date(Date.now()-n*864e5+3600e3).toISOString();const iso=n=>d(n).slice(0,10);const L1=T.lines.L1,L2=T.lines.L2;const jA=L1.cond.A.joints,jB=L2.cond.A.joints;
  for(let i=0;i<5;i++){jA[i].steps={1:{done:true,by:'Karim B.',at:d(3),photos:[],proc:'tig'}};jA[i].status='soudee';}
  for(let i=0;i<2;i++){jB[i].steps={1:{done:true,by:'Karim B.',at:d(0),photos:[],proc:'tig'}};jB[i].status='soudee';}
  for(let i=0;i<3;i++){jA[i].steps[2]={done:true,by:'Julien R.',at:d(1),photos:[],dh:{meas:10}};jA[i].wire='raccorde';}
  for(let i=0;i<2;i++){jA[i].steps[3]={done:true,by:'Julien R.',at:d(10),photos:[],type:'retracte'};}
  jA[1].events=[{type:'controle',by:'ethan',at:d(1),data:{},photos:[]}];
  const st=T.net.stock=T.net.stock||{zones:[],lots:[],livs:[],moves:[],takes:[]};st.livs.push({id:'LV1',label:'Camion',at:d(1),date:iso(1),by:'Ethan L.',status:'ok',prevu:[]});
  T.net.conv={msgs:[{id:'M1',at:d(3),upd:d(3),by:'Karim B.',text:'Barrières posées',photos:[],pos:[30,50.3],kind:'note',cat:'balisage'}],seq:2};
  T.renderAll();T.centerOn(60,58,8);return {d0:iso(0),d1:iso(1),d3:iso(3),d10:iso(10),dnA:jA[0].dn||L1.cond.A.els[jA[0].idx].dn,dnB:jB[0].dn||L2.cond.A.els[jB[0].idx].dn,total:jA.length+jB.length};});
console.log('matière :',JSON.stringify(D));
// ── 1) bouton 📅 → panneau ; preset « 7 jours » → tout sauf les manchons d'il y a 10 jours
let out=await page.evaluate(()=>{const b=document.querySelector('.zoomctl [data-z=act]');b.click();const p=document.getElementById('actPanel');const r={btn:!!b,panel:p.classList.contains('show'),presets:p.querySelectorAll('[data-actpre]').length,dates:!!p.querySelector('#actFrom')&&!!p.querySelector('#actTo'),who:[...p.querySelectorAll('#actWho option')].map(o=>o.value)};
  p.querySelector('[data-actpre="7"]').click();const S=window.TRACE.act.stats();r.n=S.n;r.byKind=S.byKind;r.dn=S.dn;r.welds=S.welds;r.people=Object.keys(S.people).sort();r.livs=S.livs;r.conv=S.conv;
  r.pins=document.querySelectorAll('#net .marker').length;r.dim=document.querySelectorAll('#net .marker[opacity]').length;r.lit=[...document.querySelectorAll('#net .marker')].filter(m=>m.querySelector('[data-act]')).length;r.pill=(document.querySelector('#planPills [data-pill=act]')||{}).textContent||'';r.convRange=JSON.stringify(window.TRACE.state.convRange);r.panelTxt=document.getElementById('actPanel').textContent;return r;});
console.log('1) 7 jours :',JSON.stringify(out));
C.c1=out.btn&&out.panel&&out.presets===5&&out.dates&&out.who.includes('Karim B.')&&out.who.includes('Julien R.')&&out.n===13&&out.byKind.soud===7&&out.byKind.fils===3&&!out.byKind.manch&&out.byKind.ctrl===1&&out.byKind.liv===1&&out.byKind.conv===1&&out.welds===7&&out.dn.soud['DN'+D.dnA]===5&&out.dn.soud['DN'+D.dnB]===2&&out.people.join()==='Ethan L.,Julien R.,Karim B.'&&out.lit>0&&out.dim+out.lit===out.pins&&/13 opérations/.test(out.pill)&&/"from"/.test(out.convRange)&&/Soudures par DN/.test(out.panelTxt)&&/Par personne/.test(out.panelTxt);
// ── 2) sur-filtre personne : Karim sur 7 jours → 7 soudures, 5 DN150 + 2 DN100, rien d'autre ; le plan ne met en avant que ses 7 soudures
out=await page.evaluate(()=>{const T=window.TRACE;document.querySelector('#actWho').value='Karim B.';document.querySelector('#actWho').dispatchEvent(new Event('change'));const S=T.act.stats();const pins=document.querySelectorAll('#net .marker').length;return {n:S.n,byKind:S.byKind,dn:S.dn.soud,pins,lit:[...document.querySelectorAll('#net .marker')].filter(m=>m.querySelector('[data-act]')).length,dim:document.querySelectorAll('#net .marker[opacity]').length,pill:(document.querySelector('#planPills [data-pill=act]')||{}).textContent||'',who:T.state.act.who};});
console.log('2) Karim sur 7 jours :',JSON.stringify(out));
C.c2=out.n===8&&out.byKind.soud===7&&out.byKind.conv===1&&Object.keys(out.byKind).length===2&&out.dn['DN'+D.dnA]===5&&out.dn['DN'+D.dnB]===2&&out.lit>0&&out.dim+out.lit===out.pins&&/Karim B\./.test(out.pill)&&out.who==='Karim B.';
// ── 3) une seule journée (hier) toutes personnes : 3 fils + 1 contrôle + 1 déchargement ; les soudures de Karim (il y a 3 jours) sont grisées ; libellé « le jj/mm »
out=await page.evaluate((D)=>{const T=window.TRACE;T.act.set({from:D.d1,to:D.d1,who:''});const S=T.act.stats();const pins=document.querySelectorAll('#net .marker').length;return {n:S.n,byKind:S.byKind,welds:S.welds,pins,lit:[...document.querySelectorAll('#net .marker')].filter(m=>m.querySelector('[data-act]')).length,dim:document.querySelectorAll('#net .marker[opacity]').length,label:T.act.label()};},D);
console.log('3) hier :',JSON.stringify(out));
C.c3=out.n===5&&out.byKind.fils===3&&out.byKind.ctrl===1&&out.byKind.liv===1&&out.welds===3&&out.lit>0&&out.dim+out.lit===out.pins&&/^le \d\d\/\d\d$/.test(out.label);
// ── 3b) DÉZOOMÉ (Ethan 09/10 : « dézoomé on ne voit pas ») : 7 jours, vue d'ensemble (kpm < 5, aucune pastille) → bandes couleur sur les pièces travaillées, point sur chaque soudure travaillée, réseau atténué ; rezoomé : les bandes restent ; « hier » : seules les pièces autour des 3 fils (+ contrôle) sont bandées
out=await page.evaluate((D)=>{const T=window.TRACE;T.act.set({from:D.d10,to:D.d0,who:''});const sh=T.state.sheets[T.state.sheetId];const ppm=sh.ppm||1;T.state.view.k=3/ppm;T.centerOn(70,70);
  const r={kpm:T.state.view.k*ppm,bands:document.querySelectorAll('#net [data-actband]').length,dots:[...document.querySelectorAll('#net .marker')].filter(m=>m.querySelector('[data-act]')).length,pins:document.querySelectorAll('#net .marker').length,dim:!!document.querySelector('#net [data-actdim]'),capsules:document.querySelectorAll('#net .marker path').length,bandCols:[...new Set([...document.querySelectorAll('#net [data-actband]')].map(b=>b.getAttribute('stroke')))]};
  T.centerOn(60,58,8);r.zoomBands=document.querySelectorAll('#net [data-actband]').length;r.zoomHalos=document.querySelectorAll('#net .marker [data-act]').length;
  T.act.set({from:D.d1,to:D.d1,who:''});T.state.view.k=3/ppm;T.centerOn(70,70);r.hierBands=document.querySelectorAll('#net [data-actband]').length;r.hierDots=[...document.querySelectorAll('#net .marker')].filter(m=>m.querySelector('[data-act]')).length;
  T.act.set(null);r.off={bands:document.querySelectorAll('#net [data-actband]').length,dim:!!document.querySelector('#net [data-actdim]'),dots:document.querySelectorAll('#net [data-act]').length};T.centerOn(60,58,8);return r;},D);
console.log('3b) dézoomé :',JSON.stringify(out));
C.c3b=out.kpm<5&&out.capsules===0&&out.bands>=7&&out.dots===7&&out.pins===D.total*2&&out.dim&&out.bandCols.length>=2&&out.zoomBands>=7&&out.zoomHalos>0&&out.hierBands>=3&&out.hierBands<out.bands&&out.hierDots===3&&out.off.bands===0&&!out.off.dim&&out.off.dots===0;
// ── 4) période ancienne (10 jours → 10 jours) : les 2 manchons de Julien ; puis ✕ Effacer → plus rien de grisé, période de conversation levée, panneau fermé au toucher du plan
out=await page.evaluate((D)=>{const T=window.TRACE;T.act.set({from:D.d10,to:D.d10});const S=T.act.stats();const pins=document.querySelectorAll('#net .marker').length;const r={n:S.n,manch:S.byKind.manch,pins,lit:[...document.querySelectorAll('#net .marker')].filter(m=>m.querySelector('[data-act]')).length,dim:document.querySelectorAll('#net .marker[opacity]').length};
  T.act.toggle(true);document.querySelector('#actPanel [data-actclear]').click();r.after={on:T.act.on(),dim:document.querySelectorAll('#net .marker[opacity]').length,halo:document.querySelectorAll('#net [data-act]').length,pill:!!document.querySelector('#planPills [data-pill=act]'),convRange:T.state.convRange};return r;},D);
await page.mouse.click(300,500);await page.waitForTimeout(200);
out.closed=await page.evaluate(()=>!document.getElementById('actPanel').classList.contains('show'));
console.log('4) 10 jours puis effacer :',JSON.stringify(out));
C.c4=out.n===2&&out.manch===2&&out.lit>0&&out.dim+out.lit===out.pins&&!out.after.on&&out.after.dim===0&&out.after.halo===0&&!out.after.pill&&!out.after.convRange&&out.closed;
// ── 5) affichage large = tout l'écran (Ethan 09/10)
await page.setViewportSize({width:1600,height:900});await page.evaluate(()=>{localStorage.setItem('trace:wide','1');});await page.reload();await page.waitForTimeout(1500);
out=await page.evaluate(()=>({wide:document.querySelector('#app').classList.contains('wide'),w:document.querySelector('#app').getBoundingClientRect().width,vw:window.innerWidth}));
console.log('5) affichage large :',JSON.stringify(out));
C.c5=out.wide&&out.w>=out.vw-2;
const bad=Object.entries(C).filter(([k,v])=>!v).map(([k])=>k);console.log(bad.length?'RESULTAT: ECHEC '+bad.join(','):'RESULTAT: TOUT VERT');console.log(logs.length?logs:'[]');
await browser.close();
