// e2e_pick_0411.mjs — 04/11 (Ethan : « les pastilles se chevauchent, je ne sais pas où cliquer pour sélectionner la soudure ») : toucher sur plusieurs pastilles → « Quelle soudure ? »
//  k1 pastilles proches (vanne : deux soudures à 0,5 m) → toucher entre les deux ouvre le choix (2 soudures, gros boutons) ; choisir → la fiche de CETTE soudure
//  k2 toucher une pastille isolée → fiche directe (pas de choix) ; k3 console propre
import { chromium } from 'playwright';
const BASE=process.env.BASE||'http://localhost:8765';
const browser=await chromium.launch({headless:true, executablePath: process.env.CHROMIUM_PATH||undefined});const C={};const logs=[];const J=x=>JSON.stringify(x);
const ctx=await browser.newContext({viewport:{width:1280,height:850}});const page=await ctx.newPage();
page.on('pageerror',e=>logs.push('PAGEERROR: '+e.message.slice(0,300)));page.on('console',m=>{if(m.type()==='error'&&!/supabase|Failed to fetch|net::ERR|404|geopf|WebSocket|open-meteo/i.test(m.text()))logs.push(m.text().slice(0,200));});page.on('dialog',d=>d.accept().catch(()=>{}));
await ctx.route(u=>/(^|\.)geopf\.fr$|^geo\.api\.gouv\.fr$|open-meteo\.com$/.test(u.hostname),r=>r.fulfill({status:200,contentType:'application/json',body:'[]'}));
const wait=ms=>page.waitForTimeout(ms);
const tap=async(x,y)=>{await page.mouse.move(x,y);await page.mouse.down();await wait(40);await page.mouse.up();};
await page.goto(BASE+'/traceur.html');await wait(500);await page.evaluate(()=>{localStorage.clear();});await page.reload();await wait(600);
await page.evaluate(()=>{const S=window.MAQ.state;S.lines=[{id:'L1',name:'Feeder',dn:100,bar:12,pts:[[10,50],[70,50]],specials:[{id:'v1',type:'valve',m:30}],parent:null}];S.seq=2;window.MAQ.setMode('select');window.MAQ.rebuild();});
await page.click('#bSave');await wait(200);await page.fill('#svName','Choix test');await page.click('#svOk');await wait(800);await page.click('#svGo');await wait(1800);
await page.selectOption('#roleSel','ethan');await wait(200);
const scr=(wx,wy)=>page.evaluate(([wx,wy])=>{const v=window.TRACE.state.view;const r=document.querySelector('#canvas').getBoundingClientRect();return {x:r.left+wx*v.k+v.tx,y:r.top+wy*v.k+v.ty};},[wx,wy]);
let pair=null;for(const kk of [12,10,14]){await page.evaluate(k=>{window.TRACE.centerOn(40,50,k);},kk);await wait(600);
  pair=await page.evaluate(()=>{const P=window.TRACE.pst();const k=window.TRACE.state.view.k;for(let a=0;a<P.length;a++)for(let b=a+1;b<P.length;b++){if(P[a][1]!==P[b][1])continue;const d=Math.hypot(P[a][3]-P[b][3],P[a][4]-P[b][4])*k;if(d<22&&d>2)return {a:P[a],b:P[b],d};}return null;});if(pair)break;}
let o={pair:!!pair};
if(pair){const m=await scr((pair.a[3]+pair.b[3])/2,(pair.a[4]+pair.b[4])/2);await tap(m.x,m.y);await wait(400);
  o.choix=await page.evaluate(()=>{const M=document.getElementById('modal');return M&&M.classList.contains('show')&&/Quelle soudure/.test(M.textContent)?[...M.querySelectorAll('[data-pick]')].map(b=>b.textContent.trim().slice(0,30)):null;});
  if(o.choix){await page.click('#modal [data-pick="1"]');await wait(400);o.sel=await page.evaluate(()=>{const sh=document.getElementById('sheet');return sh?sh.textContent.match(/S-\d{4}/g)||[]:[];});}
  o.attendu=await page.evaluate(([a,b])=>[a,b].map(p=>window.TRACE.state.lines[p[0]].cond[p[1]].joints[p[2]].weldId),[pair.a,pair.b]);}
console.log('k1) pastilles proches → choix :',J(o));
C.k1=o.pair&&o.choix&&o.choix.length===2&&o.sel&&o.sel.length&&o.attendu.includes(o.sel[0]);
await page.evaluate(()=>{try{window.TRACE.closeSheet&&window.TRACE.closeSheet();}catch(e){}const M=document.getElementById('modal');if(M)M.classList.remove('show');});
await page.evaluate(()=>{window.TRACE.centerOn(22,50,70);});await wait(600);
const lone=await page.evaluate(()=>{const P=window.TRACE.pst();const k=window.TRACE.state.view.k;return P.find(p=>Math.abs(p[3]-22)<1&&P.every(q=>q===p||Math.hypot(p[3]-q[3],p[4]-q[4])*k>60))||null;});
o={lone:!!lone};if(lone){const m=await scr(lone[3],lone[4]);await tap(m.x,m.y);await wait(400);o.modal=await page.evaluate(()=>{const M=document.getElementById('modal');return !!(M&&M.classList.contains('show')&&/Quelle soudure/.test(M.textContent));});o.sel=await page.evaluate(()=>{const sh=document.getElementById('sheet');return sh?(sh.textContent.match(/S-\d{4}/)||[''])[0]:'';});o.want=await page.evaluate(p=>window.TRACE.state.lines[p[0]].cond[p[1]].joints[p[2]].weldId,lone);}
console.log('k2) pastille isolée → fiche directe :',J(o));
C.k2=o.lone&&!o.modal&&o.sel===o.want;
C.k3=!logs.length;if(logs.length)console.log('console :',logs);
console.log('RÉSULTATS',J(C));console.log('RESULTAT:',Object.values(C).every(Boolean)?'TOUT VERT':'ÉCHEC '+Object.keys(C).filter(k=>!C[k]).join(' '));await browser.close();process.exit(Object.values(C).every(Boolean)?0:1);
