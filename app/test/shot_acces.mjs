// captures : onglet Administrateur (accueil), modale droits, écran de connexion, conversation (note + tâche)
import { chromium } from 'playwright';
const BASE=process.env.BASE||'http://localhost:8765';
const browser=await chromium.launch({headless:true, executablePath: process.env.CHROMIUM_PATH||undefined});
const ctx=await browser.newContext({viewport:{width:1000,height:1000}});const page=await ctx.newPage();page.on('dialog',d=>d.accept().catch(()=>{}));
await page.goto(BASE+'/traceur.html');await page.waitForTimeout(500);await page.evaluate(()=>{localStorage.clear();});await page.reload();await page.waitForTimeout(500);
await page.evaluate(()=>{const S=window.MAQ.state;S.supplier='RENALIA';S.lines=[{id:'L1',name:'Rue de la Gare',dn:150,bar:12,pts:[[10,50],[130,50]],specials:[{id:'v1',type:'valve',m:40}],parent:null}];S.seq=2;window.MAQ.setMode('select');window.MAQ.rebuild();});
await page.click('#bSave');await page.waitForTimeout(200);await page.fill('#svName','Sous-station Mairie');await page.click('#svOk');await page.waitForTimeout(700);await page.click('#svGo');await page.waitForTimeout(1500);await page.selectOption('#roleSel','ethan');await page.waitForTimeout(300);
await page.evaluate(async()=>{await window.TRACE.acces.create({prenom:'Mehdi',nom:'Interim',email:'mehdi.interim@gmail.com',poste:'soudeur',type:'interim',sites:[window.TRACE.state.siteId]});await window.TRACE.acces.create({prenom:'Claire',nom:'Dupont',email:'c.dupont@moe-client.fr',poste:'visiteur',type:'visiteur'});await window.TRACE.acces.create({prenom:'Karim',nom:'Benali',email:'karim.benali@scr.fr',poste:'soudeur',type:'salarie'});});
await page.evaluate(()=>{window.TRACE.showScreen('home');window.TRACE.state.homeTab='admin';window.TRACE.renderHome();});await page.waitForTimeout(700);
await page.screenshot({path:'shot_acces_admin.png',fullPage:false});
await page.evaluate(()=>{const cards=[...document.querySelectorAll('#homeBody .admAcc')];const c=cards.find(r=>/Mehdi/.test(r.textContent));c.querySelector('[data-admrights]').click();});await page.waitForTimeout(300);
await page.screenshot({path:'shot_acces_droits.png'});await page.evaluate(()=>window.TRACE.closeSheet&&document.querySelector('#modal [data-close]').click());
await page.evaluate(()=>window.TRACE.showScreen('login'));await page.waitForTimeout(200);await page.screenshot({path:'shot_acces_login.png'});
await page.evaluate(()=>{window.TRACE.showScreen('site');});await page.waitForTimeout(200);
// conversation
const PNG=await page.evaluate(()=>{const c=document.createElement('canvas');c.width=320;c.height=240;const g=c.getContext('2d');g.fillStyle='#6b7280';g.fillRect(0,0,320,240);g.fillStyle='#e2843a';g.beginPath();g.arc(160,120,60,0,7);g.fill();g.fillStyle='#fff';g.font='bold 20px sans-serif';g.fillText('vanne fermée',90,220);return c.toDataURL('image/jpeg',.7);});
await page.evaluate((PNG)=>{const T=window.TRACE;T.state.tab='conv';T.renderAll();const d=T.state.convDraft={text:'Vanne V1 fermée ce matin, ne pas rouvrir avant l\'essai',photos:[PNG],pos:[50.3,50.2],line:'L1',pk:40,task:null,to:'tous'};},PNG);
await page.evaluate(()=>{window.TRACE.conv.render();document.querySelector('#cvSend').click();});await page.waitForTimeout(500);
await page.evaluate(()=>{const T=window.TRACE;T.state.convDraft={text:'Vannes du conteneur à souder avant vendredi',photos:[],pos:[90,50],line:'L1',pk:80,task:{},to:'Karim B.'};T.conv.render();document.querySelector('#cvSend').click();});await page.waitForTimeout(500);
await page.evaluate(()=>{const T=window.TRACE;T.state.convDraft={text:'OK vu, je passe demain matin',photos:[],pos:null,task:null,to:'tous'};T.conv.render();});await page.selectOption('#roleSel','karim');await page.waitForTimeout(300);await page.evaluate(()=>{window.TRACE.state.tab='conv';window.TRACE.renderAll();document.querySelector('#cvSend').click();});await page.waitForTimeout(500);
await page.screenshot({path:'shot_conv_tab.png'});
await page.evaluate(()=>{window.TRACE.state.tab='plan';window.TRACE.renderAll();window.TRACE.centerOn(70,50,7);});await page.waitForTimeout(400);await page.screenshot({path:'shot_conv_plan.png'});
await browser.close();console.log('ok');
