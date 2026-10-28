// e2e_rc_2810.mjs — 28/10 (lot 2810e). Ethan : « mais du coup ça compte toujours 37 soudures ? on peut pas corriger ça ? ». Données 100 % FICTIVES.
// Les soudures d'un tracé sont comptées par le traceur À L'ENREGISTREMENT : une étude enregistrée avec un ANCIEN moteur garde l'ancien comptage. Ici : une étude enregistrée par le
// traceur, puis vieillie (plus de version du moteur, une soudure de trop sur l'aller — la manchette nue d'avant), liée à une affaire en devis.
// c1 Commerce › Tracé & chantiers : « ⟳ Recompter » sur l'étude (et pas sur une étude du jour) · c2 Quantités : la puce « ⚠ à recompter », l'avertissement ; la référence prise
// sur l'ancien compte · c3 ⟳ → le traceur s'ouvre sur l'étude, la recompte, la fenêtre d'enregistrement s'ouvre d'elle-même (avant / après, mise à jour) · c4 Enregistrer → retour à
// l'affaire : le tracé compte juste, plus de ⟳ ; la référence « à reprendre » → « ★ Reprendre la référence » → elle suit · c5 l'enregistrement du traceur porte le moteur · c6 console
import { chromium } from 'playwright';
const BASE=process.env.BASE||'http://localhost:8765';
const browser=await chromium.launch({headless:true, executablePath: process.env.CHROMIUM_PATH||undefined});
const ctx=await browser.newContext({viewport:{width:1280,height:900}});const page=await ctx.newPage();
await ctx.route(u=>!/^https?:\/\/(localhost|127\.0\.0\.1)(:\d+)?\//.test(u.href)&&/^https?:/.test(u.href),r=>r.fulfill({status:204,body:''}));
const logs=[];page.on('pageerror',e=>logs.push('PAGEERROR: '+e.message.slice(0,300)));page.on('console',m=>{if(m.type()==='error'&&!/supabase|Failed to fetch|net::ERR|404|WebSocket|pdf\.worker|cdnjs|geopf/i.test(m.text()))logs.push(m.text().slice(0,200));});page.on('dialog',d=>d.accept().catch(()=>{}));
const C={};const J=x=>JSON.stringify(x);const wait=ms=>page.waitForTimeout(ms);const N1='O2810-91';
const skipLogin=async()=>{const s=await page.$('#loginSkip');if(s&&await s.isVisible().catch(()=>false)){await s.click();await wait(600);}};
const kvGet=key=>page.evaluate(k=>new Promise(res=>{const q=indexedDB.open('trace-kv');q.onsuccess=()=>{try{const g=q.result.transaction('kv','readonly').objectStore('kv').get(k);g.onsuccess=()=>res(g.result||null);g.onerror=()=>res(null);}catch(e){res(null);}};q.onerror=()=>res(null);}),key);
const kvSet=(key,val)=>page.evaluate(([k,v])=>new Promise(res=>{const q=indexedDB.open('trace-kv');q.onsuccess=()=>{try{const t=q.result.transaction('kv','readwrite');t.objectStore('kv').put(v,k);t.oncomplete=()=>res(true);t.onerror=()=>res(false);}catch(e){res(false);}};q.onerror=()=>res(false);}),[key,val]);
const isEnd=e=>!!e&&(e.kind==='endpoint'||e.kind==='endcap'||e.kind==='bypass');
const countOf=site=>site.lines.reduce((s,l)=>s+['A','R'].reduce((t,c)=>{const cd=l.cond&&l.cond[c];if(!cd)return t;const E=cd.els||[];return t+(cd.welds||[]).filter((w,k)=>{const i=w.idx!=null?w.idx:k;return !(w.sst||w.bypass||isEnd(E[i])||isEnd(E[i+1]));}).length;},0),0);
// ── l'étude, enregistrée par le traceur du jour
await page.goto(BASE+'/traceur.html');await wait(500);await page.evaluate(()=>{localStorage.clear();});await page.evaluate(()=>new Promise(r=>{try{const q=indexedDB.deleteDatabase('trace-kv');q.onsuccess=q.onerror=q.onblocked=()=>r();}catch(e){r();}}));await page.reload();await wait(700);
await page.evaluate(()=>{const S=window.MAQ.state;S.lines=[{id:'L1',name:'Feeder fictif',dn:100,bar:12,pts:[[0,100],[30,100],[30,70]],specials:[{id:'v1',type:'valve',m:10}],parent:null,startType:'chaufferie',endType:'sousstation'}];S.seq=2;window.MAQ.setMode('select');window.MAQ.rebuild();});await wait(300);
await page.click('#bSave');await wait(250);await page.fill('#svName','Étude recompte');await page.click('#svOk');await wait(1400);
const sid=await page.evaluate(()=>window.MAQ.state.siteRef&&window.MAQ.state.siteRef.id);const fresh=await kvGet('trace:handoff:'+sid);
const nOk=countOf(fresh);C.c5=!!fresh&&fresh.traceur&&fresh.traceur.moteur==='2810c';
// ── vieillie : enregistrée « avant » (pas de version du moteur) avec une soudure de trop sur l'aller, rattachée à l'affaire
const old=JSON.parse(JSON.stringify(fresh));delete old.traceur.moteur;{const W=old.lines[0].cond.A.welds;const k=W.findIndex((w,i)=>i>2&&!w.sst);const w2=Object.assign({},W[k],{weldId:'S-0999',m:+(W[k].m+0.12).toFixed(3)});W.splice(k+1,0,w2);}
old.fiche=Object.assign({},old.fiche||{},{etude:{aff:N1,at:'2026-10-20T08:00:00Z'}});old.traceur.ctx='etude'; /* une étude enregistrée depuis son affaire */const nOld=countOf(old);
await kvSet('trace:handoff:'+sid,old);await page.evaluate(([k,v])=>{try{localStorage.setItem(k,JSON.stringify(v));}catch(e){}},['trace:handoff:'+sid,old]);
console.log('étude :',J({sid,nOk,nOld,moteur:fresh.traceur&&fresh.traceur.moteur}));
// ── l'appli : affaire en devis, étude liée
await page.goto(BASE+'/index.html');await wait(1200);await skipLogin();
await page.evaluate(async([n,site])=>{const T=window.TRACE;T.state.userId='ethan';T.etude.addSite(site);const S=T.affaires.state();S.cur=null;S.view='list';S.seg='devis';T.renderHome();document.getElementById('htCom').click();await new Promise(x=>setTimeout(x,300));
  for(let k=0;k<20&&!document.querySelector('#eq-app [data-act=af][data-v="new|"]');k++)await new Promise(x=>setTimeout(x,100));
  document.querySelector('#eq-app [data-act=af][data-v="new|"]').click();await new Promise(x=>setTimeout(x,150));document.getElementById('afn-num').value=n;document.getElementById('afn-nom').value='Affaire recompte';document.getElementById('afn-client').value='CLIENT TEST';document.getElementById('afn-etat').value='devis';
  document.querySelector('#eq-app [data-act=af][data-v="create|"]').click();await new Promise(x=>setTimeout(x,250));T.affaires.set(n,{sites:[site.id]});},[N1,old]);await wait(400);
const openAff=async tab=>{await page.evaluate(([n,t])=>{const T=window.TRACE;T.state.userId='ethan';const S=T.affaires.state();S.view='fiche';S.cur=n;S.tab=t;T.renderHome();},[N1,tab]);await wait(600);};
await openAff('sites');
const r1=await page.evaluate(id=>{const r=document.querySelector(`#eq-app .lz-row[data-lzsite="${id}"]`);return r?{rc:!!r.querySelector('[data-v^="etrecount|"]'),open:!!r.querySelector('[data-v^="etopen|"]'),txt:r.textContent.replace(/\s+/g,' ').slice(0,140)}:null;},sid);
console.log('1) ligne de l\'étude :',J(r1));C.c1=!!r1&&r1.rc&&r1.open&&new RegExp(nOld+' soudures').test(r1.txt);
// ── Quantités : la puce, l'avertissement, la référence prise sur l'ancien compte
await openAff('quantites');await page.evaluate(id=>{const b=document.querySelector(`#eq-app [data-v="qssel|trace:${id}"]`);if(b)b.click();},sid);await wait(400);
await page.evaluate(id=>{const b=document.querySelector(`#eq-app [data-v="qstake|trace:${id}"]`);if(b)b.click();},sid);await wait(500);
const q2=await page.evaluate(([id,n])=>{const chip=document.querySelector(`#eq-app [data-v="qssel|trace:${id}"]`);const box=[...document.querySelectorAll('#eq-app .warnbox')].find(b=>/moteur d'avant le 28\/10/.test(b.textContent));const a=window.TRACE.affaires.get?window.TRACE.affaires.get(n):null;
  return {chip:chip?chip.textContent.replace(/\s+/g,' '):'',box:!!box,boxBtn:!!(box&&box.querySelector(`[data-v="etrecount|${id}"]`)),ref:a&&a.quantites?(a.quantites.rows||[]).reduce((s,r)=>s+(+r.soud||0),0):null};},[sid,N1]);
console.log('2) Quantités :',J(q2));C.c2=new RegExp(nOld+' soudures').test(q2.chip)&&/★ référence/.test(q2.chip)&&!/à reprendre/.test(q2.chip)&&/⚠ à recompter/.test(q2.chip)&&q2.box&&q2.boxBtn&&(q2.ref===null||q2.ref===nOld);
// ── ⟳ Recompter → le traceur
await Promise.all([page.waitForURL(/traceur\.html/,{timeout:15000}),page.evaluate(id=>document.querySelector(`#eq-app [data-v="etrecount|${id}"]`).click(),sid)]);await wait(2200);
const t3=await page.evaluate(()=>{const m=document.getElementById('modal');const n=document.getElementById('svRecount');return {show:!!(m&&m.classList.contains('show')),note:n?n.textContent.replace(/\s+/g,' '):'',mode:(document.getElementById('svMode')||{}).value||'',name:(document.getElementById('svName')||{}).value||'',lines:window.MAQ.state.lines.length,ref:window.MAQ.state.siteRef&&window.MAQ.state.siteRef.id};});
console.log('3) traceur :',J(t3));C.c3=t3.show&&new RegExp('Recompté avec le moteur du 28/10 : '+nOk+' soudures \\('+nOld+' au dernier enregistrement\\)').test(t3.note)&&t3.mode==='update'&&t3.name==='Étude recompte'&&t3.lines===1&&t3.ref===sid;
// ── Enregistrer → retour à l'affaire
await page.click('#svOk');await wait(1500);const saved=await kvGet('trace:handoff:'+sid);
await Promise.all([page.waitForURL(/index\.html/,{timeout:15000}),page.click('#svGo')]);await wait(1800);await skipLogin();
await openAff('sites');const r4=await page.evaluate(id=>{const r=document.querySelector(`#eq-app .lz-row[data-lzsite="${id}"]`);return r?{rc:!!r.querySelector('[data-v^="etrecount|"]'),txt:r.textContent.replace(/\s+/g,' ').slice(0,140)}:null;},sid);
await openAff('quantites');await page.evaluate(id=>{const b=document.querySelector(`#eq-app [data-v="qssel|trace:${id}"]`);if(b)b.click();},sid);await wait(400);
const q4=await page.evaluate(id=>{const chip=document.querySelector(`#eq-app [data-v="qssel|trace:${id}"]`);const take=document.querySelector(`#eq-app [data-v="qstake|trace:${id}"]`);return {chip:chip?chip.textContent.replace(/\s+/g,' '):'',take:take?take.textContent:'',box:[...document.querySelectorAll('#eq-app .warnbox')].some(b=>/moteur d'avant/.test(b.textContent))};},sid);
await page.evaluate(id=>{const b=document.querySelector(`#eq-app [data-v="qstake|trace:${id}"]`);if(b)b.click();},sid);await wait(500);
const q4b=await page.evaluate(([id,n])=>{const chip=document.querySelector(`#eq-app [data-v="qssel|trace:${id}"]`);const a=window.TRACE.affaires.get?window.TRACE.affaires.get(n):null;return {chip:chip?chip.textContent.replace(/\s+/g,' '):'',ref:a&&a.quantites?(a.quantites.rows||[]).reduce((s,r)=>s+(+r.soud||0),0):null,tag:!!document.querySelector('#eq-app .eq-tag.ok')};},[sid,N1]);
console.log('4) après :',J({moteur:saved&&saved.traceur&&saved.traceur.moteur,nSaved:saved&&countOf(saved),r4,q4,q4b}));
C.c4=!!saved&&saved.traceur.moteur==='2810c'&&countOf(saved)===nOk&&!!r4&&!r4.rc&&new RegExp(nOk+' soudures').test(r4.txt)&&new RegExp(nOk+' soudures').test(q4.chip)&&/à reprendre/.test(q4.chip)&&!/à recompter/.test(q4.chip)&&!q4.box&&/Reprendre la référence/.test(q4.take)
  &&!/à reprendre/.test(q4b.chip)&&/★ référence/.test(q4b.chip)&&q4b.tag&&(q4b.ref===null||q4b.ref===nOk);
console.log('erreurs console :',J(logs));C.c6=logs.length===0;
const ko=Object.entries(C).filter(([k,v])=>!v).map(([k])=>k);console.log(J(C));console.log(ko.length?'RESULTAT: KO '+ko.join(','):'RESULTAT: TOUT VERT');
await browser.close();
