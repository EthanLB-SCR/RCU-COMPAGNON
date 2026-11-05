// e2e_orph_0511.mjs — 05/11 soir (Ethan : « veiller à ce que rien ne soit jamais supprimé, malgré les modifs, malgré quoi que ce soit »)
//  r1 retirer une soudure ajoutée = del:true (jamais effacée de la liste), plus rejouée ; r2 soudure ajoutée sans barre au PK → replacée au plus près, marquée ;
//  r3 ligne serveur avec avancement hors du plan → bandeau + liste (une ligne vierge : rien) ; r4 📍 Remettre → toucher une soudure = avancement ajouté (manchonnée, reprise de) ;
//  r5 📍 Remettre → toucher une barre = revient avec SON numéro et son état ; r6 Ignorer → plus signalée ; r7 console propre
import { chromium } from 'playwright';
const BASE=process.env.BASE||'http://localhost:8765';
const browser=await chromium.launch({headless:true, executablePath: process.env.CHROMIUM_PATH||undefined});const C={};const logs=[];const J=x=>JSON.stringify(x);
const ctx=await browser.newContext({viewport:{width:1280,height:850}});const page=await ctx.newPage();
page.on('pageerror',e=>logs.push('PAGEERROR: '+e.message.slice(0,300)));page.on('console',m=>{if(m.type()==='error'&&!/supabase|Failed to fetch|net::ERR|404|geopf|WebSocket|open-meteo/i.test(m.text()))logs.push(m.text().slice(0,200));});page.on('dialog',d=>d.accept().catch(()=>{}));
await ctx.route(u=>/(^|\.)geopf\.fr$|^geo\.api\.gouv\.fr$|open-meteo\.com$/.test(u.hostname),r=>r.fulfill({status:200,contentType:'application/json',body:'[]'}));
const wait=ms=>page.waitForTimeout(ms);
await page.goto(BASE+'/traceur.html');await wait(500);await page.evaluate(()=>{localStorage.clear();});await page.reload();await wait(600);
await page.evaluate(()=>{const S=window.MAQ.state;S.lines=[{id:'L1',name:'Feeder',dn:100,bar:12,pts:[[10,50],[16,50.15],[60,50]],specials:[],parent:null}];S.seq=2;window.MAQ.setMode('select');window.MAQ.rebuild();});
await page.click('#bSave');await wait(200);await page.fill('#svName','Filet test');await page.click('#svOk');await wait(800);await page.click('#svGo');await wait(1800);
await page.selectOption('#roleSel','ethan');await wait(200);
const A=()=>page.evaluate(()=>{const A=window.TRACE.state.lines.L1.cond.A;return {j:A.joints.map(j=>({id:j.weldId,m:j.m,st:j.status,ap:!!j.approx,x:!!j.extra})),recs:(window.TRACE.net.extraWelds||[]).map(r=>({id:r.weldId,del:!!r.del,rem:!!r.remise}))};});
const tapAt=async(wx,wy)=>{const pt=await page.evaluate(([wx,wy])=>{const v=window.TRACE.state.view;const r=document.querySelector('#canvas').getBoundingClientRect();return {x:r.left+wx*v.k+v.tx,y:r.top+wy*v.k+v.ty};},[wx,wy]);
  await page.mouse.move(pt.x,pt.y);await page.mouse.down();await wait(40);await page.mouse.up();await wait(500);};
const pipeMid=()=>page.evaluate(()=>{const T=window.TRACE;const A=T.state.lines.L1.cond.A;const i=A.els.findIndex((e,q)=>e.kind==='pipe'&&e.len>8&&q>0);const e=A.els[i];const pl=e.axis[0];const t=0.5;
  const wx=pl[0].x+(pl[pl.length-1].x-pl[0].x)*t,wy=pl[0].y+(pl[pl.length-1].y-pl[0].y)*t;T.centerOn(wx,wy,60);return {i,wx,wy,m:e.m0+e.len*t};});
/* r1 */
let tg=await pipeMid();await wait(300);await page.evaluate(()=>document.querySelector('#btnExtraWeld').click());await wait(250);await tapAt(tg.wx,tg.wy);
let s=await A();const X=s.j.find(j=>j.x);await page.evaluate(()=>window.TRACE.closeSheet&&window.TRACE.closeSheet());await wait(200);
const xi=s.j.findIndex(j=>j.id===(X&&X.id));await page.evaluate(i=>{const T=window.TRACE;const n=T.state.lines.L1.cond.A.joints.length;T.openJoint('L1','A',(i+1)%n);},xi);await wait(250);await page.evaluate(i=>window.TRACE.openJoint('L1','A',i),xi);await wait(350);
await page.click('#sheet [data-act="j-del"]');await wait(500);const s1=await A();await page.evaluate(()=>window.TRACE.extraReplay());await wait(500);const s1b=await A();
let o={X:X&&X.id,recs:s1.recs,gone:!s1.j.some(j=>j.id===(X&&X.id)),goneReplay:!s1b.j.some(j=>j.id===(X&&X.id))};console.log('r1) retrait = del:true :',J(o));
C.r1=!!X&&o.gone&&o.goneReplay&&s1.recs.length===1&&s1.recs[0].id===X.id&&s1.recs[0].del;
/* r2 */
const jm=await page.evaluate(()=>{const A=window.TRACE.state.lines.L1.cond.A;const k=A.joints.findIndex(j=>{const a=A.els[j.idx],b=A.els[j.idx+1];return a&&b&&a.kind==='pipe'&&b.kind==='pipe';});return A.joints[k].m;});
await page.evaluate(m=>{const T=window.TRACE;T.net.extraWelds.push({line:'L1',cond:'A',el:'P99',m,weldId:'S-0900',by:'test',at:new Date().toISOString()});T.extraReplay();},jm);await wait(900);
s=await A();const w9=s.j.find(j=>j.id==='S-0900');o={jm,w9,toast:await page.evaluate(()=>document.querySelector('#toast').textContent)};console.log('r2) au plus près :',J(o));
C.r2=!!w9&&w9.ap&&Math.abs(w9.m-jm)<=0.2&&/au plus près/.test(o.toast);
/* r3 */
const row=(id,st,d)=>({weld_id:id,line_id:'L1',cond:'A',status:st,data:d,updated_at:'2026-11-03T09:00:00Z'});
await page.evaluate(r=>{window.TRACE.orph.seen(r[0]);window.TRACE.orph.seen(r[1]);},[row('S-0950','manchonnee',{events:[{type:'soudee',at:'2026-11-03T08:00:00Z',by:'Gary'}],photos:['p1']}),row('S-0960','a_souder',{})]);await wait(300);
o=await page.evaluate(()=>{const b=document.querySelector('#orphWarn');return {list:window.TRACE.orph.list(),show:!!b&&b.classList.contains('show'),txt:b?b.textContent:''};});console.log('r3) bandeau :',J(o));
C.r3=J(o.list)===J(['S-0950'])&&o.show&&/1 soudure pointée hors du plan/.test(o.txt);
/* r4 */
await page.click('#orphWarn');await wait(300);const m4=await page.evaluate(()=>({n:document.querySelectorAll('#modal [data-orph-put]').length,txt:document.querySelector('#modal').textContent.slice(0,300)}));
await page.click('#modal [data-orph-put="S-0950"]');await wait(300);const pose=await page.evaluate(()=>window.TRACE.orph.pose());
const T4=await page.evaluate(()=>{const T=window.TRACE;const A=T.state.lines.L1.cond.A;const k=A.joints.findIndex(j=>!j.extra&&j.status==='a_souder'&&A.els[j.idx]&&A.els[j.idx].kind==='pipe');const j=A.joints[k];const e=A.els[j.idx];const p=e.axis[0][e.axis[0].length-1];T.centerOn(p.x,p.y,60);return {k,id:j.weldId,x:p.x,y:p.y};});
await wait(400);await tapAt(T4.x,T4.y);
o=await page.evaluate(id=>{const T=window.TRACE;const j=T.state.lines.L1.cond.A.joints.find(x=>x.weldId===id);const b=document.querySelector('#orphWarn');return {st:j&&j.status,rep:!!(j&&(j.events||[]).some(e=>e.type==='reprise'&&e.data&&e.data.de==='S-0950')),ph:j&&(j.photos||[]).length,list:T.orph.list(),show:!!b&&b.classList.contains('show'),pose:T.orph.pose()};},T4.id);
console.log('r4) rattachée :',J({m4,pose,T4:T4.id,o}));C.r4=m4.n===1&&/rien n'est effacé/.test(m4.txt)&&pose==='S-0950'&&o.st==='manchonnee'&&o.rep&&o.ph===1&&o.list.length===0&&!o.show&&o.pose===null;
/* r5 */
await page.evaluate(r=>window.TRACE.orph.seen(r),row('S-0951','soudee',{events:[{type:'soudee',at:'2026-11-03T10:00:00Z',by:'Gary'}]}));await wait(200);
await page.click('#orphWarn');await wait(300);await page.click('#modal [data-orph-put="S-0951"]');await wait(300);
tg=await page.evaluate(()=>{const T=window.TRACE;const A=T.state.lines.L1.cond.A;const e=A.els.filter(e=>e.kind==='pipe').sort((a,b)=>b.len-a.len)[0];const pl=e.axis[0];const wx=pl[0].x+(pl[pl.length-1].x-pl[0].x)*0.4,wy=pl[0].y+(pl[pl.length-1].y-pl[0].y)*0.4;T.centerOn(wx,wy,60);return {wx,wy};});
await wait(400);await tapAt(tg.wx,tg.wy);s=await A();const w51=s.j.find(j=>j.id==='S-0951');
o={w51,rec:s.recs.find(r=>r.id==='S-0951'),list:await page.evaluate(()=>window.TRACE.orph.list())};console.log('r5) remise avec son numéro :',J(o));
C.r5=!!w51&&w51.st==='soudee'&&w51.x&&!!o.rec&&o.rec.rem&&!o.rec.del&&o.list.length===0;
/* r6 */
await page.evaluate(()=>window.TRACE.closeSheet&&window.TRACE.closeSheet());await page.evaluate(r=>window.TRACE.orph.seen(r),row('S-0952','controlee',{events:[{type:'controlee',at:'2026-11-03T11:00:00Z',by:'Gary'}]}));await wait(200);
await page.click('#orphWarn');await wait(300);await page.click('#modal [data-orph-ign="S-0952"]');await wait(400);
o=await page.evaluate(()=>{const b=document.querySelector('#orphWarn');return {list:window.TRACE.orph.list(),show:!!b&&b.classList.contains('show')};});console.log('r6) ignorée :',J(o));
C.r6=o.list.length===0&&!o.show;
/* r8 numéro en double : une soudure ajoutée dont le numéro est déjà pris par une autre soudure du plan → signalé (jamais silencieux) */
const dupId=await page.evaluate(()=>{const T=window.TRACE;const A=T.state.lines.L1.cond.A;const j=A.joints.find(x=>!x.extra&&x.m>2);const far=A.els.filter(e=>e.kind==='pipe'&&e.len>8).map(e=>e.m0+e.len*0.7).find(m=>Math.abs(m-j.m)>3);
  T.net.extraWelds.push({line:'L1',cond:'A',el:'P98',m:far,weldId:j.weldId,by:'test',at:new Date().toISOString()});T.extraReplay();return j.weldId;});await wait(700);
o=await page.evaluate(()=>{const b=document.querySelector('#orphWarn');return {show:!!b&&b.classList.contains('show'),txt:b?b.textContent:''};});
await page.click('#orphWarn');await wait(300);o.modal=await page.evaluate(()=>document.querySelector('#modal').textContent.slice(0,400));await page.evaluate(()=>{const b=document.querySelector('#modal [data-close]');if(b)b.click();});
console.log('r8) numéro en double :',J({dupId,o}));C.r8=o.show&&o.txt.includes(dupId)&&/en double/.test(o.txt)&&/Numéros en double/.test(o.modal);
/* r9 pastilles vers l'EXTÉRIEUR (Ethan 05/11 soir) : chaque pastille est plus loin de l'autre conduite que sa soudure */
await page.evaluate(()=>{const T=window.TRACE;const A=T.state.lines.L1.cond.A;const e=A.els[Math.floor(A.els.length/2)];T.centerOn(e.to.x,e.to.y,40);});await wait(600);
o=await page.evaluate(()=>{const T=window.TRACE;const L=T.state.lines.L1;if(!L.cond.R)return {skip:true};const P=T.pst();let ok=0,ko=0;
  P.forEach(([id,c,i,mx,my])=>{if(id!=='L1')return;const cd=L.cond[c],od=L.cond[c==='A'?'R':'A'];const j=cd.joints[i];if(!j)return;const a=cd.els[j.idx].to;let r=null,bd=1e18;od.els.forEach(f=>{const q=f.to;const d=(q.x-a.x)**2+(q.y-a.y)**2;if(d<bd){bd=d;r=q;}});
    const dj=Math.hypot(a.x-r.x,a.y-r.y),dp=Math.hypot(mx-r.x,my-r.y);if(dp>dj)ok++;else ko++;});return {ok,ko};});
console.log('r9) pastilles vers l\'extérieur :',J(o));C.r9=!!o.skip||(o.ok>0&&o.ko===0);
C.r7=logs.length===0;if(logs.length)console.log('console :',logs.slice(0,5));
console.log('RESULTAT',J(C),Object.values(C).every(Boolean)?'TOUT VERT':'ÉCHEC');await browser.close();
