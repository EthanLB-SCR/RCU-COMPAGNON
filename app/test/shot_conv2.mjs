// captures : conversation avec types (icônes), localisation par n° de soudure, pastilles typées sur le plan, plan dépollué (tâche faite masquée) — téléphone 430 px
import { chromium } from 'playwright';
const BASE=process.env.BASE||'http://localhost:8765';
const browser=await chromium.launch({headless:true, executablePath: process.env.CHROMIUM_PATH||undefined});
const ctx=await browser.newContext({viewport:{width:430,height:900}});const page=await ctx.newPage();page.on('dialog',d=>d.accept().catch(()=>{}));
await page.goto(BASE+'/traceur.html');await page.waitForTimeout(500);await page.evaluate(()=>{localStorage.clear();});await page.reload();await page.waitForTimeout(500);
await page.evaluate(()=>{const S=window.MAQ.state;S.supplier='RENALIA';S.lines=[{id:'L1',name:'Rue de la Gare',dn:150,bar:12,pts:[[10,50],[130,50]],specials:[{id:'v1',type:'valve',m:40}],parent:null}];S.seq=2;window.MAQ.setMode('select');window.MAQ.rebuild();});
await page.click('#bSave');await page.waitForTimeout(200);await page.fill('#svName','Sous-station Mairie');await page.click('#svOk');await page.waitForTimeout(700);await page.click('#svGo');await page.waitForTimeout(1500);await page.selectOption('#roleSel','ethan');await page.waitForTimeout(300);
const ph=(txt,c)=>{return `data:image/svg+xml;utf8,`+encodeURIComponent(`<svg xmlns="http://www.w3.org/2000/svg" width="320" height="240"><rect width="320" height="240" fill="${c}"/><text x="16" y="200" font-size="26" fill="#fff" font-family="sans-serif">${txt}</text></svg>`);};
const post=async(d,who)=>{if(who){await page.selectOption('#roleSel',who);await page.waitForTimeout(150);}await page.evaluate(d=>{const T=window.TRACE;T.state.tab='conv';T.renderAll();T.state.convDraft={text:'',photos:[],pos:null,line:null,pk:null,near:null,task:null,to:'tous',cat:'divers',...d};if(d.pos){T.state.convDraft.near=T.conv.near(d.pos[0],d.pos[1]);const q=T.hydro.nearest(d.pos[0],d.pos[1]);if(q){T.state.convDraft.line=q.line;T.state.convDraft.pk=+q.m.toFixed(1);}}T.conv.render();document.querySelector('#cvSend').click();},d);await page.waitForTimeout(350);};
await post({text:'Barrières posées côté mairie, zone fermée au public',photos:[ph('balisage','#8a6d3b')],pos:[30,50.3],cat:'balisage'},'ethan');
await post({text:'Tranchée ouverte jusqu\'au regard, blindage en place',photos:[ph('tranchée','#5b544b')],pos:[56,50.1],cat:'tranchee'},'karim');
await post({text:'Livraison de 12 tubes DN150 stockés sur le parking',photos:[],pos:[100,50.2],cat:'stockage'},'ethan');
await post({text:'Câble Enedis non signalé, DICT à revoir avant de continuer',photos:[ph('câble','#2a2a2a')],pos:[80,50.1],cat:'reseau'},'karim');
await post({text:'Remettre les barrières après le passage du camion grue',photos:[],pos:[44,50.3],task:{},to:'Karim B.',cat:'balisage'},'ethan');
await post({text:'Vannes du conteneur à souder (sous-station)',photos:[],pos:[118,50.2],task:{},to:'tous',cat:'divers'},'ethan');
// une tâche déjà faite (hier) : elle reste dans la liste, pas sur le plan
await page.evaluate(()=>{const T=window.TRACE;const C=T.net.conv;const m=C.msgs.find(x=>x.kind==='task'&&x.task.to==='Karim B.');m.task.done=true;m.task.doneAt=new Date(Date.now()-864e5).toISOString();m.task.doneBy='Karim B.';m.task.doneNote='barrières remises';T.conv.render();T.renderPlan();});
await page.evaluate(()=>{const T=window.TRACE;T.state.tab='conv';T.renderAll();T.state.convDraft={text:'',photos:[],pos:null,line:null,pk:null,near:null,task:null,to:'tous',cat:'securite'};T.conv.render();const L=document.querySelector('#cvList');if(L)L.scrollTop=0;});await page.waitForTimeout(300);
await page.screenshot({path:'shot_conv2_tab.png'});
await page.evaluate(()=>{const L=document.querySelector('#cvList');if(L)L.scrollTop=L.scrollHeight;});await page.waitForTimeout(200);
await page.screenshot({path:'shot_conv2_tab_bas.png'});
await page.evaluate(()=>{window.TRACE.state.tab='plan';window.TRACE.renderAll();window.TRACE.centerOn(70,50,4.2);});await page.waitForTimeout(400);
await page.screenshot({path:'shot_conv2_plan.png'});
await browser.close();console.log('ok');
