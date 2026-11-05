// e2e_phdup_0411.mjs — 04/11 (Ethan) : photo en plein écran + alerte « photo identique » (même photo mise sur deux soudures)
//  p1 photo prise : empreinte calculée ; toucher la vignette → plein écran (✕ ferme)
//  p2 même photo sur une 2e soudure → alerte « Photo identique à celle de S-… » ; groupe de doubles = 1 ; bandeau rouge dans la fiche ; bouton « 📷 Photos en double (1) »
//  p3 console propre
import { chromium } from 'playwright';
const BASE=process.env.BASE||'http://localhost:8765';
const browser=await chromium.launch({headless:true, executablePath: process.env.CHROMIUM_PATH||undefined});const C={};const logs=[];const J=x=>JSON.stringify(x);
const ctx=await browser.newContext({viewport:{width:1280,height:850}});const page=await ctx.newPage();
page.on('pageerror',e=>logs.push('PAGEERROR: '+e.message.slice(0,300)));page.on('console',m=>{if(m.type()==='error'&&!/supabase|Failed to fetch|net::ERR|404|geopf|WebSocket|open-meteo/i.test(m.text()))logs.push(m.text().slice(0,200));});page.on('dialog',d=>d.accept().catch(()=>{}));
await ctx.route(u=>/(^|\.)geopf\.fr$|^geo\.api\.gouv\.fr$|open-meteo\.com$/.test(u.hostname),r=>r.fulfill({status:200,contentType:'application/json',body:'[]'}));
const wait=ms=>page.waitForTimeout(ms);
await page.goto(BASE+'/traceur.html');await wait(500);await page.evaluate(()=>{localStorage.clear();});await page.reload();await wait(600);
await page.evaluate(()=>{const S=window.MAQ.state;S.lines=[{id:'L1',name:'Feeder',dn:100,bar:12,pts:[[10,50],[70,50]],specials:[],parent:null}];S.seq=2;window.MAQ.setMode('select');window.MAQ.rebuild();});
await page.click('#bSave');await wait(200);await page.fill('#svName','Photos test');await page.click('#svOk');await wait(800);await page.click('#svGo');await wait(1800);
await page.selectOption('#roleSel','ethan');await wait(200);
const openForm=async i=>{await page.evaluate(i=>{window.TRACE.openJoint('L1','A',i);},i);await wait(300);await page.evaluate(()=>{const sh=document.getElementById('sheet');const b=document.createElement('button');b.dataset.act='form-soudee';sh.appendChild(b);b.click();});await wait(300);};
const addPhoto=()=>page.evaluate(async()=>{const c=document.createElement('canvas');c.width=160;c.height=120;const g=c.getContext('2d');const gr=g.createLinearGradient(0,0,160,120);gr.addColorStop(0,'#203040');gr.addColorStop(1,'#e0c080');g.fillStyle=gr;g.fillRect(0,0,160,120);g.fillStyle='#c33';g.fillRect(30,40,50,30);g.fillStyle='#fff';g.font='20px sans-serif';g.fillText('S12',90,100);
  const blob=await new Promise(r=>c.toBlob(r,'image/png'));const f=new File([blob],'soudure.png',{type:'image/png'});const inp=document.querySelector('#sheet input[data-photo]');if(!inp)return false;const dt=new DataTransfer();dt.items.add(f);inp.files=dt.files;inp.dispatchEvent(new Event('change',{bubbles:true}));return true;});
const toast=()=>page.evaluate(()=>(document.getElementById('toast')||{}).textContent||'');
/* p1 */
await openForm(1);let o={add:await addPhoto()};await wait(1200);
o.ph=await page.evaluate(()=>window.TRACE.state.pendingPh||[]);o.thumb=await page.evaluate(()=>!!document.querySelector('#sheet .thumb img'));
await page.click('#sheet .thumb img');await wait(300);
o.full=await page.evaluate(()=>{const f=document.getElementById('phFull');const im=f&&f.querySelector('#phFullImg');return f?{src:(im.getAttribute('src')||'').slice(0,11),z:getComputedStyle(f).zIndex}:null;});
await page.click('#phFullX');await wait(200);o.closed=await page.evaluate(()=>!document.getElementById('phFull'));
await page.click('#sheet [data-act="save-soudee"]');await wait(1400); /* la fiche se ferme 0,9 s après l'enregistrement */
console.log('p1) empreinte + plein écran :',J(o));
C.p1=o.add&&o.ph.length===1&&/^[0-9a-f]{16}$/.test(o.ph[0])&&o.thumb&&o.full&&o.full.src==='data:image/'&&o.closed;
/* p2 */
const id1=await page.evaluate(()=>window.TRACE.state.lines.L1.cond.A.joints[1].weldId);
await openForm(2);o={add:await addPhoto()};await wait(1200);o.toast=await toast();
await page.click('#sheet [data-act="save-soudee"]');await wait(700);
o.groups=await page.evaluate(()=>window.TRACE.phdup.groups().map(g=>g.items.map(x=>x.weldId+'/'+x.where)));
await page.evaluate(()=>{window.TRACE.openJoint('L1','A',2);});await wait(400);o.banner=await page.evaluate(()=>{const n=document.querySelector('#sheet .note');return n&&/Photo identique/.test(n.textContent)?n.textContent.slice(0,90):'';});
await page.evaluate(()=>{try{window.TRACE.renderAll();}catch(e){}});await wait(200);o.btn=await page.evaluate(()=>{const b=document.getElementById('btnPhDup');return b?b.textContent:'';});
if(!o.btn){await page.evaluate(()=>{const m=document.getElementById('btnMenu');if(m)m.click();});await wait(300);o.btn=await page.evaluate(()=>{const b=document.getElementById('btnPhDup');return b?b.textContent:'';});}
console.log('p2) même photo sur une 2e soudure :',J(o));
C.p2=o.add&&new RegExp('Photo identique à celle de '+id1).test(o.toast)&&o.groups.length===1&&o.groups[0].length===2&&!!o.banner&&/Photos en double \(1\)/.test(o.btn);
C.p3=!logs.length;if(logs.length)console.log('console :',logs);
console.log('RÉSULTATS',J(C));console.log('RESULTAT:',Object.values(C).every(Boolean)?'TOUT VERT':'ÉCHEC '+Object.keys(C).filter(k=>!C[k]).join(' '));await browser.close();process.exit(Object.values(C).every(Boolean)?0:1);
