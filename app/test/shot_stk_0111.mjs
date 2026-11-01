// shot_stk_0111 — captures des zones de stockage dessinées (données fictives) : plan + carte de l'onglet Stockage
import { chromium } from 'playwright';
const BASE=process.env.BASE||'http://localhost:8765';const OUT=process.env.OUT||'/tmp';
const b=await chromium.launch({executablePath:process.env.CHROMIUM_PATH||undefined});const page=await (await b.newContext({viewport:{width:1280,height:900}})).newPage();
const errs=[];page.on('pageerror',e=>errs.push(String(e)));page.on('dialog',d=>d.accept().catch(()=>{}));
const W=ms=>page.waitForTimeout(ms);
await page.goto(BASE+'/traceur.html');await W(500);await page.evaluate(()=>localStorage.clear());await page.reload();await W(600);
await page.evaluate(()=>{const S=window.MAQ.state;S.supplier='AXIOM';S.lines=[{id:'L1',name:'Feeder',dn:200,bar:12,pts:[[0,50],[120,50]],specials:[],parent:null},{id:'L2',name:'Antenne',dn:100,bar:12,pts:[[60,50],[60,110]],specials:[],parent:{line:'L1',m:60,side:1}}];S.seq=3;window.MAQ.setMode('select');window.MAQ.rebuild();});
await page.click('#bSave');await W(200);await page.fill('#svName','Stock visuel');await page.click('#svOk');await W(700);
await page.click('#svGo');await W(1500);await page.selectOption('#roleSel','ethan');await W(300);await page.evaluate(()=>{try{window.TRACE.tuto.close(null);}catch(e){}});
await page.evaluate(()=>{const X=window.TRACE;const key=l=>[l.kind,l.dn||'',l.dn2||'',l.gaine||'',l.kind==='pipe'?(l.len||12):'',l.kind==='bend'?(l.angle||90):''].join(':');
  const L=(zone,o)=>Object.assign({id:'LT'+Math.random().toString(36).slice(2,7),zone,label:o.label||o.kind,qty:o.qty},o,{key:key(o)});
  X.net.stock={zones:[{id:'Z1',name:'Bord de fouille',x:30,y:70,w:13,h:3,rot:0,status:'ok'},{id:'Z2',name:'Base vie',x:95,y:72,w:6,h:4,rot:20,status:'ok'},{id:'Z3',name:'Camion jeudi',x:30,y:85,w:13,h:3,rot:0,status:'prevu'}],
   lots:[L('Z1',{kind:'pipe',dn:200,gaine:315,len:12,qty:14,label:'Barre 12 m DN200'}),L('Z1',{kind:'pipe',dn:100,gaine:200,len:12,qty:6,label:'Barre 12 m DN100'}),L('Z1',{kind:'pipe',dn:100,gaine:200,len:12,qty:4,pend:true,label:'Barre 12 m DN100'}),
     L('Z1',{kind:'sleeve',dn:200,gaine:315,qty:12,label:'Manchon Ø315'}),L('Z1',{kind:'pu',dn:200,qty:12,label:'Mousse PU DN200'}),L('Z1',{kind:'bend',dn:200,angle:90,qty:3,label:'Coude 90° DN200'}),
     L('Z2',{kind:'sleeve',dn:100,gaine:200,qty:20,label:'Manchon Ø200'}),L('Z2',{kind:'pu',dn:100,qty:20,label:'Mousse PU DN100'}),L('Z2',{kind:'tee',dn:200,dn2:100,qty:2,label:'Té DN200/100'}),L('Z2',{kind:'valve',dn:100,qty:1,label:'Vanne DN100'}),L('Z2',{kind:'acc',qty:5,label:'Grillage'}),
     L('Z3',{kind:'pipe',dn:200,gaine:315,len:12,qty:8,pend:true,label:'Barre 12 m DN200'})],takes:[],livs:[],moves:[]};
  X.state.tab='plan';X.renderAll();X.centerOn(60,78,9);});
await W(700);await page.screenshot({path:OUT+'/stk_plan.png'});
await page.evaluate(()=>window.TRACE.centerOn(30,76,28));await W(500);await page.screenshot({path:OUT+'/stk_plan_zoom.png'});
await page.evaluate(()=>window.TRACE.centerOn(95,72,30));await W(500);await page.screenshot({path:OUT+'/stk_plan_zoom2.png'});
await page.evaluate(()=>{const X=window.TRACE;X.state.tab='stock';X.renderAll();});await W(900);await page.evaluate(()=>{const m=document.getElementById('stkMap');if(m)m.scrollIntoView({block:'start'});});await W(400);await page.screenshot({path:OUT+'/stk_tab.png'});
console.log('errs',JSON.stringify(errs.slice(0,3)));await b.close();
