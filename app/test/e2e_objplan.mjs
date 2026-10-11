// OBJECTIFS — retours d'Ethan du 10/10 (section 4) : « il faut poser sur plan l'objectif » et « proposer les équipes : tel objectif à telle équipe, mais aussi cibler quelqu'un ».
// Un objectif se pose sur un tronçon comme une phase (début / fin sur le plan), l'équipe A / B du planning se coche d'un coup, l'opérateur voit son objectif 🎯 en surbrillance sur son plan et dans le Bureau.
import { chromium } from 'playwright';
const BASE=process.env.BASE||'http://localhost:8765';
const browser=await chromium.launch({headless:true, executablePath: process.env.CHROMIUM_PATH||undefined});
const ctx=await browser.newContext({viewport:{width:900,height:940}});const page=await ctx.newPage();
const logs=[];page.on('pageerror',e=>logs.push('PAGEERROR: '+e.message.slice(0,300)));page.on('console',m=>{if(m.type()==='error'&&!/supabase|Failed to fetch|net::ERR|404|WebSocket/i.test(m.text()))logs.push(m.text().slice(0,200));});
page.on('dialog',d=>d.accept().catch(()=>{}));
const C={};const wait=ms=>page.waitForTimeout(ms);
await page.clock.install({time:new Date(2026,9,9,8,30,0)}); /* vendredi 09/10/2026 */
await page.goto(BASE+'/traceur.html');await wait(500);await page.evaluate(()=>{localStorage.clear();});await page.reload();await wait(500);
await page.evaluate(()=>{const S=window.MAQ.state;S.supplier='AXIOM';S.lines=[{id:'L1',name:'Feeder',dn:100,bar:12,pts:[[10,50],[110,50]],specials:[],parent:null}];S.seq=2;window.MAQ.setMode('select');window.MAQ.rebuild();});
await page.click('#bSave');await wait(200);await page.fill('#svName','Objectifs test');await page.click('#svOk');await wait(800);
await page.click('#svGo');await wait(1500);await page.selectOption('#roleSel','ethan');await wait(300);
const sid=await page.evaluate(()=>window.TRACE.state.siteId);
const tapWorld=async(x,y)=>{await page.evaluate(([x,y])=>window.TRACE.centerOn(x,y,30),[x,y]);await wait(150);const pt=await page.evaluate(([x,y])=>{const v=window.TRACE.state.view;const r=document.querySelector('#canvas').getBoundingClientRect();return {x:r.left+x*v.k+v.tx,y:r.top+y*v.k+v.ty};},[x,y]);await page.mouse.move(pt.x,pt.y);await page.mouse.down();await wait(40);await page.mouse.up();await wait(250);};
// planning : Karim (équipe A) et Julien (équipe B) sur le chantier toute la semaine, Ethan chef dans la fiche
await page.evaluate(id=>{const T=window.TRACE;const js=['2026-10-05','2026-10-06','2026-10-07','2026-10-08','2026-10-09'];const o=t=>Object.assign(Object.fromEntries(js.map(d=>[d,[id]])),{['eq:'+id]:t});T.espace.savePlanning('2026-W41',{'l:karim':o('A'),'l:julien':o('B')});},sid);
// ── 1) Exploitation → Objectifs : ➕ → équipes A / B proposées ; « A » coche Karim ; « Poser sur le plan » → plan + barre 🎯
await page.evaluate(async()=>{const T=window.TRACE;document.getElementById('btnHome').click();await new Promise(r=>setTimeout(r,400));document.getElementById('htExpl').click();T.renderHome();await new Promise(r=>setTimeout(r,200));[...document.querySelectorAll('#eq-app .ac-row')].find(x=>/Objectifs de la journée/.test(x.textContent)).click();await new Promise(r=>setTimeout(r,200));document.querySelector('#eq-app [data-act=objadd][data-v="'+T.state.siteId+'"]').click();});await wait(300);
let out=await page.evaluate(()=>({teams:[...document.querySelectorAll('#eq-app .eq-tb[data-act=objteam]')].map(b=>b.textContent.trim()),who:[...document.querySelectorAll('#eq-app [data-objwho]')].map(i=>i.dataset.objwho+':'+i.dataset.objteamof),plan:!!document.querySelector('#eq-app [data-act=objplan]')}));
await page.evaluate(()=>{[...document.querySelectorAll('#eq-app .eq-tb[data-act=objteam]')].find(b=>b.textContent.trim()==='A').click();});await wait(100);
out.checked=await page.evaluate(()=>[...document.querySelectorAll('#eq-app [data-objwho]:checked')].map(i=>i.dataset.objwho));
await page.evaluate(()=>{document.getElementById('obj-label').value='Souder tronçon 1';document.getElementById('obj-h').value='6';document.querySelector('#eq-app [data-act=objplan]').click();});await wait(1500);
out.pose=await page.evaluate(()=>{const T=window.TRACE;return {screen:T.state.screen,tab:T.state.tab,bar:document.querySelector('#phBar').style.display!=='none',level:T.state.phPose&&T.state.phPose.level,msg:document.querySelector('#phMsg').textContent,ok:document.querySelector('#phOk').textContent};});
console.log('1) équipes dans le formulaire, pose sur le plan :',JSON.stringify(out));
C.c1=out.teams.join()==='A,B'&&out.who.includes('l:karim:A')&&out.who.includes('l:julien:B')&&out.plan&&out.checked.join()==='l:karim'&&out.pose.screen==='site'&&out.pose.tab==='plan'&&out.pose.bar&&out.pose.level==='obj'&&/Objectif « Souder tronçon 1 »/.test(out.pose.msg)&&/début/.test(out.pose.msg);
// ── 2) début PK ~25, fin PK ~100 → « Poser l'objectif » → mission enregistrée avec son tronçon, équipe A, Karim ; retour aux objectifs avec 📐 et 🗺
await tapWorld(35,50);await tapWorld(110,50);
out=await page.evaluate(()=>({ok:document.querySelector('#phOk').style.display!=='none',txt:document.querySelector('#phOk').textContent}));
await page.evaluate(()=>document.querySelector('#phOk').click());await wait(1200);
out.m=await page.evaluate(()=>{const T=window.TRACE;const ms=T.net.missions['2026-10-09']||[];const m=ms[0];return m&&{n:ms.length,label:m.label,h:m.h,team:m.team,who:m.who,tr:m.tr&&m.tr.map(t=>[t.line,Math.round(t.m0),Math.round(t.m1)]),trName:m.trName,by:m.by};});
out.back=await page.evaluate(()=>{const T=window.TRACE;const t=document.getElementById('eq-app')?document.getElementById('eq-app').textContent:'';return {screen:T.state.screen,xsub:/Objectifs de la journée/.test((document.querySelector('#eq-app h2.vt')||{}).textContent||'')?'obj':'',row:/Souder tronçon 1/.test(t)&&/équipe A/.test(t)&&/📐 Feeder · PK 25 → 100/.test(t),map:!!document.querySelector('#eq-app [data-act=objmap]'),mapIcon:(document.querySelector('#eq-app [data-act=objmap]')||{}).textContent};});
console.log('2) objectif posé sur le tronçon :',JSON.stringify(out));
C.c2=out.ok&&/Poser l'objectif/.test(out.txt)&&out.m&&out.m.n===1&&out.m.label==='Souder tronçon 1'&&out.m.h===6&&out.m.team==='A'&&out.m.who.join()==='l:karim'&&out.m.tr.length===1&&out.m.tr[0][0]==='L1'&&out.m.tr[0][1]===25&&out.m.tr[0][2]===100&&/Feeder · PK 25 → 100/.test(out.m.trName)&&out.m.by==='Ethan L.'&&out.back.screen==='home'&&out.back.xsub==='obj'&&out.back.row&&out.back.map&&out.back.mapIcon==='🗺';
// ── 3) 🗺 → le plan avec l'objectif 🎯 en surbrillance (calque #phG) ; Karim ouvre son chantier : Bureau → ligne objectif cliquable vers le plan, étiquette 🎯 visible pour lui
await page.evaluate(()=>document.querySelector('#eq-app [data-act=objmap]').click());await wait(1200);
out=await page.evaluate(()=>{const T=window.TRACE;const g=document.getElementById('phG');return {screen:T.state.screen,tab:T.state.tab,focus:!!T.state.objFocus,label:/🎯 Souder tronçon 1 · 6 h/.test(g.innerHTML),paths:g.querySelectorAll('path').length};});
await page.evaluate(async()=>{const T=window.TRACE;T.state.userId='karim';T.state.tab='bureau';T.renderAll();});await wait(400);
out.karim=await page.evaluate(()=>{const el=document.getElementById('bureau');const b=[...el.querySelectorAll('[data-bur]')].find(x=>/Objectif du jour/.test(x.textContent));return {btn:!!b&&b.tagName==='BUTTON'&&b.dataset.bur==='plan',txt:b?b.textContent.replace(/\s+/g,' '):'',};});
await page.evaluate(()=>{[...document.querySelectorAll('#bureau [data-bur]')].find(x=>/Objectif du jour/.test(x.textContent)).click();});await wait(500);
out.karimPlan=await page.evaluate(()=>{const T=window.TRACE;const g=document.getElementById('phG');const p=[...g.querySelectorAll('path')];return {tab:T.state.tab,label:/🎯 Souder tronçon 1/.test(g.innerHTML),strong:p.some(x=>x.getAttribute('opacity')==='0.55')};});
console.log('3) surbrillance sur le plan, Bureau de Karim :',JSON.stringify(out));
C.c3=out.screen==='site'&&out.tab==='plan'&&out.focus&&out.label&&out.paths>=2&&out.karim.btn&&/équipe A/.test(out.karim.txt)&&/📐 Feeder · PK 25 → 100/.test(out.karim.txt)&&/surbrillance/.test(out.karim.txt)&&out.karimPlan.tab==='plan'&&out.karimPlan.label&&out.karimPlan.strong;
const bad=Object.entries(C).filter(([k,v])=>!v).map(([k])=>k);console.log(bad.length?'RESULTAT: ECHEC '+bad.join(','):'RESULTAT: TOUT VERT');console.log(logs.length?logs:'[]');
await browser.close();
