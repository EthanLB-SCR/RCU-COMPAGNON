// Localisation refusée par le navigateur (code 1) → modale d'aide selon l'appareil + « Réessayer » qui relance la demande dans un geste utilisateur
import { chromium } from 'playwright';
const BASE=process.env.BASE||'http://localhost:8765';
const browser=await chromium.launch({headless:true, executablePath: process.env.CHROMIUM_PATH||undefined});
const ctx=await browser.newContext({viewport:{width:560,height:940},geolocation:{latitude:47.844996,longitude:-1.692210,accuracy:8},permissions:['geolocation']});
const page=await ctx.newPage();
// simulation d'un refus mémorisé : le navigateur répond PERMISSION_DENIED (code 1) immédiatement
await page.addInitScript(()=>{window.__deny=true;const real=navigator.geolocation;const err=cb=>setTimeout(()=>cb({code:1,message:'denied'}),50);
  Object.defineProperty(navigator,'geolocation',{value:{getCurrentPosition:(ok,ko,o)=>window.__deny?err(ko):real.getCurrentPosition(ok,ko,o),watchPosition:(ok,ko,o)=>{if(window.__deny){err(ko);return 99;}return real.watchPosition(ok,ko,o);},clearWatch:id=>{if(id!==99)real.clearWatch(id);}},configurable:true});});
await page.goto(BASE+'/traceur.html');await page.waitForTimeout(500);await page.evaluate(()=>{localStorage.clear();});await page.reload();await page.waitForTimeout(500);
await page.evaluate(()=>{const S=window.MAQ.state;S.lines=[{id:'L1',name:'Feeder',dn:100,bar:12,pts:[[10,50],[70,50]],specials:[],parent:null}];S.seq=2;S.bg={drawing:[{layer:'0',pts:[[0,0],[80,0]],c:'#888'}],bbox:[0,0,80,100],name:'bain_test.dxf',origin:{x0:1349000,y1:7193500},netLayers:[],opacity:.5,show:true};window.MAQ.setMode('select');window.MAQ.rebuild();});
await page.click('#bSave');await page.waitForTimeout(200);await page.fill('#svName','Géo test');await page.click('#svOk');await page.waitForTimeout(800);await page.click('#svGo');await page.waitForTimeout(1800);
await page.click('.zoomctl [data-z="gps"]');await page.waitForTimeout(800);
let out=await page.evaluate(()=>({modal:document.querySelector('#modal').classList.contains('show'),title:document.querySelector('#modal h3')?.textContent,retry:!!document.querySelector('#gpsRetry'),err:window.TRACE.state.gps.err,steps:document.querySelectorAll('#modal li').length}));console.log('refus → modale d\'aide (modal true, err 1):',JSON.stringify(out));
// l'utilisateur réactive dans les réglages puis « Réessayer » → point affiché
await page.evaluate(()=>{window.__deny=false;});await page.click('#gpsRetry');await page.waitForTimeout(1500);
out=await page.evaluate(()=>({modal:document.querySelector('#modal').classList.contains('show'),fix:!!window.TRACE.state.gps.fix,on:document.querySelector('.zoomctl [data-z="gps"]').classList.contains('gpsOn'),dots:document.querySelectorAll('#gps circle').length}));console.log('réessayer après autorisation (fix true, on true, dots 3):',JSON.stringify(out));
await browser.close();
