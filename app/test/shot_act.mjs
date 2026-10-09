// capture : filtre d'activité (📅) — panneau avec bilan, plan grisé / mis en avant — téléphone 430 px
import { chromium } from 'playwright';
const BASE=process.env.BASE||'http://localhost:8765';
const browser=await chromium.launch({headless:true, executablePath: process.env.CHROMIUM_PATH||undefined});
const ctx=await browser.newContext({viewport:{width:430,height:900}});const page=await ctx.newPage();page.on('dialog',d=>d.accept().catch(()=>{}));
await page.goto(BASE+'/traceur.html');await page.waitForTimeout(500);await page.evaluate(()=>{localStorage.clear();});await page.reload();await page.waitForTimeout(500);
await page.evaluate(()=>{const S=window.MAQ.state;S.supplier='RENALIA';S.lines=[{id:'L1',name:'Rue de la Gare',dn:150,bar:12,pts:[[10,50],[130,50]],specials:[],parent:null},{id:'L2',name:'Antenne école',dn:100,bar:12,pts:[[60,50],[60,90]],specials:[],parent:{line:'L1',m:50,side:1}}];S.seq=3;window.MAQ.setMode('select');window.MAQ.rebuild();});
await page.click('#bSave');await page.waitForTimeout(200);await page.fill('#svName','Sous-station Mairie');await page.click('#svOk');await page.waitForTimeout(700);await page.click('#svGo');await page.waitForTimeout(1500);await page.selectOption('#roleSel','ethan');await page.waitForTimeout(300);
await page.evaluate(()=>{const T=window.TRACE;const d=n=>new Date(Date.now()-n*864e5+3600e3).toISOString();const L1=T.lines.L1,L2=T.lines.L2;const jA=L1.cond.A.joints,jB=L2.cond.A.joints,jR=L1.cond.R.joints;
  for(let i=0;i<5;i++){jA[i].steps={1:{done:true,by:'Karim B.',at:d(3),photos:[],proc:'tig'}};jA[i].status='soudee';}
  for(let i=0;i<2;i++){jB[i].steps={1:{done:true,by:'Karim B.',at:d(0),photos:[],proc:'tig'}};jB[i].status='soudee';}
  for(let i=0;i<3;i++){jA[i].steps[2]={done:true,by:'Julien R.',at:d(1),photos:[],dh:{meas:10}};jA[i].wire='raccorde';}
  for(let i=0;i<2;i++){jA[i].steps[3]={done:true,by:'Julien R.',at:d(10),photos:[],type:'retracte'};}
  for(let i=0;i<4;i++){jR[i].steps={1:{done:true,by:'Sofiane K.',at:d(2),photos:[],proc:'tig'}};jR[i].status='soudee';}
  jA[1].events=[{type:'controle',by:'ethan',at:d(1),data:{},photos:[]}];
  const st=T.net.stock=T.net.stock||{zones:[],lots:[],livs:[],moves:[],takes:[]};st.livs.push({id:'LV1',label:'Camion',at:d(1),date:d(1).slice(0,10),by:'Ethan L.',status:'ok',prevu:[]});
  T.renderAll();T.centerOn(45,52,9);});
await page.evaluate(()=>{document.querySelector('.zoomctl [data-z=act]').click();document.querySelector('#actPanel [data-actpre="7"]').click();});await page.waitForTimeout(400);
await page.screenshot({path:'shot_act_panel.png'});
await page.evaluate(()=>{document.querySelector('#actWho').value='Karim B.';document.querySelector('#actWho').dispatchEvent(new Event('change'));window.TRACE.act.toggle(false);});await page.waitForTimeout(400);
await page.screenshot({path:'shot_act_plan.png'});
await browser.close();console.log('ok');
