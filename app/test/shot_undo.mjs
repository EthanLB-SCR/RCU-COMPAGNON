// captures : garde-fou des annulations — fiche d'un soudeur sans crédit (demande au chef) ; conversation côté chef (demande à valider / redonner un crédit / refuser)
import { chromium } from 'playwright';
const BASE=process.env.BASE||'http://localhost:8765';
const PNG='data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAAAAAA6fptVAAAACklEQVR4nGNgAAAAAgABSK+kcQAAAABJRU5ErkJggg==';
const browser=await chromium.launch({headless:true, executablePath: process.env.CHROMIUM_PATH||undefined});
const ctx=await browser.newContext({viewport:{width:430,height:900}});const page=await ctx.newPage();page.on('dialog',d=>d.accept(d.defaultValue()).catch(()=>{}));
await page.goto(BASE+'/traceur.html');await page.waitForTimeout(400);await page.evaluate(()=>{localStorage.clear();});await page.reload();await page.waitForTimeout(400);
await page.evaluate(()=>{const S=window.MAQ.state;S.supplier='RENALIA';S.lines=[{id:'L1',name:'Rue de la Gare',dn:150,bar:12,pts:[[10,50],[130,50]],specials:[],parent:null}];S.seq=2;window.MAQ.setMode('select');window.MAQ.rebuild();});
await page.click('#bSave');await page.waitForTimeout(200);await page.fill('#svName','Saint-Lô Zone Bleue');await page.click('#svOk');await page.waitForTimeout(700);await page.click('#svGo');await page.waitForTimeout(1500);
await page.evaluate((PNG)=>{const T=window.TRACE;const L=Object.values(T.lines)[0];const d=h=>new Date(Date.now()-h*3600e3).toISOString();L.cond.A.joints.forEach((j,i)=>{if(i>5)return;j.steps={1:{done:true,by:'Karim B.',at:d(20-i),photos:[PNG],proc:'tig'}};j.status='soudee';j.events=[{type:'soudee',by:'karim',at:d(20-i),data:{procede:'tig'},photos:[PNG]}];});T.renderAll();},PNG);
const L=await page.evaluate(()=>Object.values(window.TRACE.lines)[0].id);
await page.selectOption('#roleSel','karim');await page.waitForTimeout(200);
for(const i of [0,1,2]){await page.evaluate(({L,i})=>{window.TRACE.closeSheet();window.TRACE.openJoint(L,'A',i);document.querySelectorAll('#sheet details').forEach(d=>d.open=true);document.querySelector('#sheet [data-stepundo="1"]').click();},{L,i});await page.waitForTimeout(300);}
await page.evaluate(({L})=>{window.TRACE.closeSheet();window.TRACE.openJoint(L,'A',3);document.querySelectorAll('#sheet details').forEach(d=>d.open=true);const b=document.querySelector('#sheet [data-stepask="1"]');b.scrollIntoView();},{L});await page.waitForTimeout(300);
await page.screenshot({path:'shot_undo_fiche.png'});
await page.evaluate(()=>document.querySelector('#sheet [data-stepask="1"]').click());await page.waitForTimeout(300);
await page.evaluate(({L})=>{window.TRACE.closeSheet();window.TRACE.openJoint(L,'A',3);document.querySelectorAll('#sheet details').forEach(d=>d.open=true);},{L});await page.waitForTimeout(300);
await page.screenshot({path:'shot_undo_attente.png'});
await page.selectOption('#roleSel','ethan');await page.waitForTimeout(200);
await page.evaluate(()=>{const T=window.TRACE;T.closeSheet();T.state.tab='conv';T.renderAll();});await page.waitForTimeout(400);
await page.screenshot({path:'shot_undo_chef.png'});
await browser.close();console.log('ok');
