// shot_ph_0111 — captures de l'onglet Phasage (données fictives) : PC 1280 + téléphone 390, une phase ouverte
import { chromium } from 'playwright';
const BASE=process.env.BASE||'http://localhost:8765';const OUT=process.env.OUT||'/tmp';
const b=await chromium.launch({executablePath:process.env.CHROMIUM_PATH||undefined});const page=await (await b.newContext({viewport:{width:1280,height:900}})).newPage();
const errs=[];page.on('pageerror',e=>errs.push(String(e)));page.on('dialog',d=>d.accept().catch(()=>{}));
const W=ms=>page.waitForTimeout(ms);
await page.clock.install({time:new Date(2026,10,2,8,30,0)});
await page.goto(BASE+'/traceur.html');await W(500);await page.evaluate(()=>localStorage.clear());await page.reload();await W(600);
await page.evaluate(()=>{const S=window.MAQ.state;S.supplier='RENALIA';S.lines=[
  {id:'L1',name:'Rue de la Gare',dn:150,bar:12,pts:[[10,50],[250,50]],specials:[],parent:null},
  {id:'L2',name:'Impasse des Lilas',dn:80,bar:12,pts:[[70,50],[70,140]],specials:[],parent:{line:'L1',m:60,side:1}},
  {id:'L3',name:'Allée des Tilleuls',dn:65,bar:12,pts:[[180,50],[180,120]],specials:[],parent:{line:'L1',m:170,side:1}}];S.seq=4;window.MAQ.setMode('select');window.MAQ.rebuild();});
await page.click('#bSave');await W(200);await page.fill('#svName','Phasage visuel');await page.click('#svOk');await W(700);
await page.click('#svGo');await W(1500);await page.selectOption('#roleSel','ethan');await W(300);await page.evaluate(()=>{try{window.TRACE.tuto.close(null);}catch(e){}});
await page.evaluate(()=>{const T=window.TRACE;const L=Object.values(T.lines);const L1=L.find(l=>!l.parent),L2=L.find(l=>l.name==='Impasse des Lilas'),L3=L.find(l=>l.name==='Allée des Tilleuls');
  const P=T.net.phasage||(T.net.phasage={week:4,phases:[],groups:[],seq:1});P.phases=[
  {id:'PH001',name:'Marché A',level:'marche',parent:null,color:'#bdbdbd',locked:true,tr:[],dates:{tr:['2026-11-02','2026-11-02'],so:['2026-11-02','2026-12-11'],rb:['2026-12-11','2026-12-11'],en:['2026-12-11','2026-12-11']}},
  {id:'PH002',name:'Phase 1',level:'exe',parent:null,color:'#e4572e',tr:[{line:L1.id,m0:0,m1:90}],dates:{tr:['2026-11-02','2026-11-10'],so:['2026-11-04','2026-11-13'],rb:['2026-11-09','2026-11-17'],en:['2026-11-18','2026-11-19']},days:[]},
  {id:'PH003',name:'Phase 2',level:'exe',parent:null,color:'#2e86ab',tr:[{line:L2.id,m0:0,m1:90}],dates:{tr:['2026-11-12','2026-11-19'],so:['2026-11-16','2026-11-24'],rb:['2026-11-20','2026-11-26'],en:['2026-11-30','2026-11-30']},days:[]},
  {id:'PH004',name:'Phase 3',level:'exe',parent:null,color:'#76b041',tr:[{line:L1.id,m0:90,m1:240},{line:L3.id,m0:0,m1:70}],dates:{tr:['2026-11-23','2026-12-02'],so:['2026-11-25','2026-12-08'],rb:['2026-12-01','2026-12-09'],en:['2026-12-10','2026-12-11']},days:[]}];P.seq=5;
  T.state.tab='phasage';T.state.phOpen='PH003';T.renderAll();});
await W(800);
await page.screenshot({path:OUT+'/ph_1280_top.png',fullPage:false});
await page.evaluate(()=>{const e=document.querySelector('#phList');if(e)e.scrollIntoView({block:'start'});});await W(300);await page.screenshot({path:OUT+'/ph_1280_list.png',fullPage:false});
await page.evaluate(()=>{const e=document.querySelector('[data-phc="PH003"]');if(e)e.scrollIntoView({block:'start'});});await W(300);await page.screenshot({path:OUT+'/ph_1280_open.png',fullPage:false});
await page.evaluate(()=>{const e=document.querySelector('#phPlanning');if(e)e.scrollIntoView({block:'start'});});await W(300);await page.screenshot({path:OUT+'/ph_1280_planning.png',fullPage:false});
await page.evaluate(()=>{const e=document.querySelector('.phGantt');if(e)e.scrollIntoView({block:'center'});});await W(300);await page.screenshot({path:OUT+'/ph_1280_gantt.png',fullPage:false});
await page.evaluate(()=>{const e=document.querySelector('[data-phc="PH003"] .phStat');if(e)e.scrollIntoView({block:'start'});});await W(300);await page.screenshot({path:OUT+'/ph_1280_stats.png',fullPage:false});
await page.evaluate(()=>{const e=document.querySelector('[data-phc="PH003"] .phTer');if(e)e.scrollIntoView({block:'start'});});await W(300);await page.screenshot({path:OUT+'/ph_1280_ter.png',fullPage:false});
await page.evaluate(()=>{const T=window.TRACE;T.state.phEns='jours';T.phasage.render();window.scrollTo(0,0);const e=document.querySelector('.phEns');if(e)e.scrollIntoView({block:'start'});});await W(300);await page.screenshot({path:OUT+'/ph_1280_jours.png',fullPage:false});
await page.evaluate(()=>{const T=window.TRACE;T.state.phEns='plan';T.phasage.render();const e=document.querySelector('.phEns');if(e)e.scrollIntoView({block:'start'});});await W(300);await page.screenshot({path:OUT+'/ph_1280_plan.png',fullPage:false});
await page.evaluate(()=>{const T=window.TRACE;T.state.phEns='sem';T.phasage.render();});
await page.setViewportSize({width:390,height:844});await W(500);
await page.evaluate(()=>{window.scrollTo(0,0);const v=document.querySelector('#view-phasage');if(v)v.scrollTop=0;});await W(300);await page.screenshot({path:OUT+'/ph_390_top.png',fullPage:false});
await page.evaluate(()=>{const e=document.querySelector('[data-phc="PH003"]');if(e)e.scrollIntoView({block:'start'});});await W(300);await page.screenshot({path:OUT+'/ph_390_open.png',fullPage:false});
console.log('errs',JSON.stringify(errs.slice(0,3)));await b.close();
