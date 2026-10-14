// PLUSIEURS PLANS DE FOND (14/10/2026, Ethan) : « certains chantiers ne sont pas une continuité mais 15 antennes réparties dans la ville ; il faut pouvoir
// importer plusieurs plans, les décalquer, et après avoir la vue d'ensemble quand ils seront tous calés géographiquement ».
// 0) Node : maths des plans (src/plans.js), fusion / éclatement des DXF, recentrage (rebase.js) qui déplace les plans ;
// 1) traceur : 2 images (PNG générés dans la page) + 1 DXF minuscule (texte) ajoutés EN UNE FOIS → 3 plans, à côté les uns des autres, onglet Fond ;
// 2) calage de chaque plan : échelle (2 points + distance, bouton + dialogue), rotation (saisie), déplacement (glisser), ⟲ 2 points (API) → transforms attendues,
//    rendu : un <g class="plan"> par plan avec sa transform ; ⤢ Tout voir ;
// 3) 💾 Enregistrer dans TRACÉ → site.plans (3), site.drawing = DXF fusionné dans le repère commun, site.image = 1re image (ancien format + rot) ;
//    appli (index.html?site=) : les 2 images dans le plan avec leur transform, le DXF en fond ; aperçu Hydro : images aussi ;
// 4) retour dans le traceur (traceur.html?site=), mémoire locale des plans effacée : plans et calages relus depuis le chantier (DXF remis en repère local) ;
// 5) ANCIEN chantier (drawing + image, sans plans) : chargé → 2 plans « calés par ses coordonnées », réenregistré → drawing et image IDENTIQUES ;
// 6) rechargement de la page : plans retrouvés (IndexedDB) — aucune image dans localStorage ; retirer un plan.
import { chromium } from 'playwright';
import {tfApply,tfInverse,tfCompose,planSimilarity,fuseDxfPlans,splitFusedDrawing,legacyImageOfPlan,imagePlanFromLegacy} from '../src/plans.js';
import {rebaseSite} from '../src/rebase.js';
const BASE=process.env.BASE||'http://localhost:8765';
const C={};const near=(a,b,t=1e-6)=>Math.abs(a-b)<=t;
// ── 0) unités Node
{const T={tx:100,ty:50,rot:30,k:2};const w=tfApply(T,[10,5]);const back=tfApply(tfInverse(T),w);const S=planSimilarity([{from:[0,0],to:[10,10]},{from:[10,0],to:[10,30]}]);
  const plans=[{id:'a',kind:'dxf',transform:{tx:0,ty:0,rot:0,k:1},drawing:[{pts:[[0,0],[10,0]],c:'#000'},{text:'A',x:1,y:1,h:1,rot:0}]},{id:'b',kind:'dxf',transform:{tx:100,ty:0,rot:90,k:1},drawing:[{pts:[[0,0],[10,0]]},{loops:[[[0,0],[1,0],[1,1],[0,0]]],pts:[[0,0]],fill:'#f00'}]}];
  const F=fuseDxfPlans(plans,[0,0,120,20],{margin:150,cap:200000});const Sp=splitFusedDrawing(F.drawing,plans);
  const F1=fuseDxfPlans([plans[0]],[0,0,20,20]);
  const leg=legacyImageOfPlan({kind:'image',transform:{tx:5,ty:6,rot:0,k:0.1},image:{src:'data:x',pw:200,ph:100},opacity:.4,name:'im'});const back2=imagePlanFromLegacy(leg,'im');
  const net={id:'t',lines:[{id:'L1',traceur:true,axis:[[1000,2000],[1100,2000]],cond:{A:{els:[],welds:[]},R:{els:[],welds:[]}}}],plans:[{id:'p1',kind:'image',transform:{tx:900,ty:1900,rot:12,k:.2},image:{src:'data:x',pw:10,ph:10}},{id:'p2',kind:'dxf',transform:{tx:0,ty:0,rot:0,k:1},origin:{x0:1000,y1:2000}},{id:'p3',kind:'dxf',transform:{tx:50,ty:0,rot:0,k:1},origin:{x0:1000,y1:2000}}],image:{src:'data:x',x:900,y:1900,w:2,h:2}};
  const R=rebaseSite(net,800,1800);
  console.log('0) unités :',JSON.stringify({w,back,S,fused:F.drawing.map(d=>d.p),split:Object.keys(Sp),single:F1.drawing[0].p,leg:[leg.x,leg.y,leg.w,leg.h,leg.rot],back2:back2.transform,reb:R.plans[0].transform}));
  C.u0=near(back[0],10,1e-9)&&near(back[1],5,1e-9)&&near(S.k,2)&&near(S.rot,90)&&near(S.tx,10)&&near(S.ty,10)&&F.drawing.every(d=>d.p===0||d.p===1)&&Sp[1][0].pts[1][0]===10&&Sp[1][0].pts[1][1]===0&&F1.drawing[0].p===undefined
    &&leg.w===20&&leg.h===10&&leg.rot===undefined&&near(back2.transform.k,0.1)&&R.plans[0].transform.tx===100&&R.plans[0].transform.ty===100&&R.plans[0].transform.rot===12&&R.image.x===100&&R.plans[1].origin.x0===1800&&R.plans[1].origin.y1===200&&R.plans[1].transform.tx===-800&&R.plans[2].origin.x0===1000&&R.plans[2].transform.tx===-750;} /* DXF calé par coordonnées : origine corrigée ; DXF calé à la main : seule sa translation bouge */
// ── navigateur
const browser=await chromium.launch({headless:true, executablePath: process.env.CHROMIUM_PATH||undefined});
const ctx=await browser.newContext({viewport:{width:1280,height:900}});const page=await ctx.newPage();
const logs=[];page.on('pageerror',e=>logs.push('PAGEERROR: '+e.message.slice(0,300)));page.on('console',m=>{if(m.type()==='error'&&!/supabase|Failed to fetch|net::ERR|404|WebSocket|pdf\.worker|cdnjs/i.test(m.text()))logs.push(m.text().slice(0,200));});
let dialogs=[];page.on('dialog',d=>{dialogs.push(d.message().slice(0,80));d.accept(d.type()==='prompt'?'50':undefined).catch(()=>{});});
const wait=ms=>page.waitForTimeout(ms);
const idbGet=k=>page.evaluate(k=>new Promise(res=>{const q=indexedDB.open('trace-kv');q.onsuccess=()=>{const g=q.result.transaction('kv','readonly').objectStore('kv').get(k);g.onsuccess=()=>res(g.result||null);g.onerror=()=>res(null);};q.onerror=()=>res(null);}),k);
const idbSet=(k,v)=>page.evaluate(([k,v])=>new Promise(res=>{const q=indexedDB.open('trace-kv');q.onsuccess=()=>{const t=q.result.transaction('kv','readwrite');t.objectStore('kv').put(v,k);t.oncomplete=()=>res(true);t.onerror=()=>res(false);};q.onerror=()=>res(false);}),[k,v]);
const idbKeys=()=>page.evaluate(()=>new Promise(res=>{const q=indexedDB.open('trace-kv');q.onsuccess=()=>{const g=q.result.transaction('kv','readonly').objectStore('kv').getAllKeys();g.onsuccess=()=>res(g.result);g.onerror=()=>res([]);};q.onerror=()=>res([]);}));
const idbDel=k=>page.evaluate(k=>new Promise(res=>{const q=indexedDB.open('trace-kv');q.onsuccess=()=>{const t=q.result.transaction('kv','readwrite');t.objectStore('kv').delete(k);t.oncomplete=()=>res(true);t.onerror=()=>res(false);};q.onerror=()=>res(false);}),k);
await page.goto(BASE+'/traceur.html');await wait(600);await page.evaluate(()=>{localStorage.clear();localStorage.setItem('trace:wide','1');});await page.evaluate(()=>new Promise(r=>{try{const q=indexedDB.deleteDatabase('trace-kv');q.onsuccess=q.onerror=q.onblocked=()=>r();}catch(e){r();}}));
await page.reload();await wait(800);
// ── 1) 2 images + 1 DXF en une fois (fichiers fabriqués dans la page : PNG par canvas, DXF en texte — fixtures fictives)
let out=await page.evaluate(async()=>{const M=window.MAQ;const mk=(w,h,col,name)=>{const c=document.createElement('canvas');c.width=w;c.height=h;const g=c.getContext('2d');g.fillStyle=col;g.fillRect(0,0,w,h);g.fillStyle='#000';g.fillRect(10,10,w-20,4);return new Promise(r=>c.toBlob(b=>r(new File([b],name,{type:'image/png'})),'image/png'));};
  const f1=await mk(400,200,'#ffcc88','antenne_A.png'),f2=await mk(300,300,'#88ccff','antenne_B.png');
  const L=(x1,y1,x2,y2,lay='RCU')=>['0','LINE','8',lay,'10',x1,'20',y1,'11',x2,'21',y2].join('\n');const X=1350000,Y=7200000; /* coordonnées fictives (Lambert CC48 plausible) */
  const dxf=['0','SECTION','2','HEADER','9','$INSUNITS','70','6','0','ENDSEC','0','SECTION','2','ENTITIES',L(X,Y,X+60,Y),L(X+60,Y,X+60,Y+40),L(X,Y+5,X+30,Y+5,'VOIRIE'),'0','TEXT','8','TEXTES','10',X+5,'20',Y+8,'40','1.5','1','Rue fictive','0','ENDSEC','0','EOF'].join('\n');
  const added=await M.bg.addFiles([f1,f2,new File([dxf],'antenne_C.dxf')]);
  const P=M.bg.plans();const bb=P.map(p=>M.bg.bbox(p.id));const overlap=(a,b)=>!(a[2]<=b[0]||b[2]<=a[0]||a[3]<=b[1]||b[3]<=a[1]);
  return {n:added.length,kinds:P.map(p=>p.kind),names:P.map(p=>p.name),geo:P.map(p=>p.geo),k:P.map(p=>+p.transform.k.toFixed(4)),imgApart:!overlap(bb[0],bb[1]),dxfIdentity:P[2].transform.tx===0&&P[2].transform.ty===0&&P[2].transform.k===1,origin:M.state.bg.origin,gs:document.querySelectorAll('#bg g.plan').length,imgs:document.querySelectorAll('#bg g.plan image').length,paths:document.querySelectorAll('#bg g.plan path').length,tab:M.state.tab,cards:document.querySelectorAll('#panel .card[data-act=selPlan]').length,tools:getComputedStyle(document.getElementById('bgTools')).display,ls:Object.keys(localStorage).filter(k=>k.startsWith('trace:bg'))};});
console.log('1) ajout de 3 plans :',JSON.stringify(out));
C.c1=out.n===3&&out.kinds.join()==='image,image,dxf'&&out.geo[2]==='coords'&&out.geo[0]===null&&out.imgApart&&out.dxfIdentity&&out.origin&&out.origin.x0===1349970&&out.gs===3&&out.imgs===2&&out.paths>=1&&out.tab==='fond'&&out.cards===3&&out.tools!=='none';
const IDS=await page.evaluate(()=>window.MAQ.bg.plans().map(p=>p.id));
// ── 2) calage. a) image A par le bouton 📏 Échelle : deux clics sur le plan, distance 50 m (dialogue) → le segment cliqué mesure 50 m
const toScreen=async(wx,wy)=>page.evaluate(([x,y])=>{const v=window.MAQ.state.view;const r=document.getElementById('svg').getBoundingClientRect();return [r.left+x*v.k+v.tx,r.top+y*v.k+v.ty];},[wx,wy]);
await page.evaluate(id=>{window.MAQ.bg.setActive(id);window.MAQ.bg.fitAll();},IDS[0]);await wait(100);
const bbA=await page.evaluate(id=>window.MAQ.bg.bbox(id),IDS[0]);
const p1=[bbA[0]+(bbA[2]-bbA[0])*.25,bbA[1]+(bbA[3]-bbA[1])*.5],p2=[bbA[0]+(bbA[2]-bbA[0])*.75,p1[1]];
const kA0=await page.evaluate(id=>window.MAQ.bg.get(id).transform.k,IDS[0]);const l1=await page.evaluate(([id,p])=>{const t=window.MAQ.bg.get(id).transform;return [(p[0]-t.tx)/t.k,(p[1]-t.ty)/t.k];},[IDS[0],p1]); /* point du plan (pixels) sous le 1er clic */
await page.click('#bgScale');await wait(100);
{const s1=await toScreen(p1[0],p1[1]),s2=await toScreen(p2[0],p2[1]);await page.mouse.click(s1[0],s1[1]);await wait(80);await page.mouse.click(s2[0],s2[1]);await wait(300);}
out=await page.evaluate(([id,l1])=>{const M=window.MAQ;const p=M.bg.get(id);const t=p.transform;const w1=M.bg.toWorld(id,l1);return {k:t.k,w1,geo:p.geo,mode:M.state.mode,mmpx:document.getElementById('panel').textContent.includes((t.k*1000).toFixed(1).replace('.',',')+' mm/px')||document.getElementById('panel').textContent.includes(Math.round(t.k*1000)+' mm/px')};},[IDS[0],l1]);
console.log('2a) échelle par 2 points + distance (dialogue 50 m) :',JSON.stringify({...out,kAttendu:kA0*50/Math.hypot(p2[0]-p1[0],p2[1]-p1[1])}),'dialogues :',dialogs.length);
// le segment cliqué (67,5 m à l'écran) vaut maintenant 50 m : k × 50/67,5 ; le 1er point cliqué n'a pas bougé
C.c2a=near(out.k,kA0*50/Math.hypot(p2[0]-p1[0],p2[1]-p1[1]),1e-3)&&near(out.w1[0],p1[0],1)&&near(out.w1[1],p1[1],1)&&out.geo==='manual'&&out.mode==='select'&&dialogs.some(d=>/Distance réelle/.test(d));
// b) rotation de l'image A : 90° (saisie dans l'onglet Fond) → le centre ne bouge pas, la transform tourne, le <g> aussi
const cA0=await page.evaluate(id=>{const b=window.MAQ.bg.bbox(id);return [(b[0]+b[2])/2,(b[1]+b[3])/2];},IDS[0]);
await page.fill(`#panel .plRot[data-plan="${IDS[0]}"]`,'90');await page.dispatchEvent(`#panel .plRot[data-plan="${IDS[0]}"]`,'change');await wait(150);
out=await page.evaluate(([id,c0])=>{const M=window.MAQ;const p=M.bg.get(id);const b=M.bg.bbox(id);const g=document.querySelector(`#bg g.plan[data-plan="${id}"]`);return {rot:p.transform.rot,c:[(b[0]+b[2])/2-c0[0],(b[1]+b[3])/2-c0[1]],portrait:(b[3]-b[1])>(b[2]-b[0]),g:g&&g.getAttribute('transform')};},[IDS[0],cA0]);
console.log('2b) rotation 90° :',JSON.stringify(out));
C.c2b=near(out.rot,90)&&near(out.c[0],0,1e-6)&&near(out.c[1],0,1e-6)&&out.portrait&&/rotate\(90\)/.test(out.g||'');
// c) déplacement de l'image B à la souris (✥ Déplacer) : glisser de 120 px à droite, 40 px en bas → tx/ty bougent de 120/k, 40/k
await page.evaluate(id=>{window.MAQ.bg.setActive(id);},IDS[1]);await page.click('#bgMove');await wait(80);
const tB0=await page.evaluate(id=>({...window.MAQ.bg.get(id).transform}),IDS[1]);
{const b=await page.evaluate(id=>window.MAQ.bg.bbox(id),IDS[1]);const s=await toScreen((b[0]+b[2])/2,(b[1]+b[3])/2);await page.mouse.move(s[0],s[1]);await page.mouse.down();await page.mouse.move(s[0]+60,s[1]+20);await page.mouse.move(s[0]+120,s[1]+40);await page.mouse.up();await wait(200);}
out=await page.evaluate(([id,t0])=>{const M=window.MAQ;const t=M.bg.get(id).transform;const k=M.state.view.k;return {dx:(t.tx-t0.tx)*k,dy:(t.ty-t0.ty)*k,rot:t.rot,k:t.k===t0.k,geo:M.bg.get(id).geo,mode:M.state.mode,summary:JSON.parse(localStorage.getItem('trace:bg:v1')).plans[1].transform.tx===t.tx};},[IDS[1],tB0]);
console.log('2c) déplacement à la souris :',JSON.stringify(out));
C.c2c=near(out.dx,120,1.5)&&near(out.dy,40,1.5)&&out.k&&out.geo==='manual'&&out.mode==='moveBg'&&out.summary;
await page.keyboard.press('Escape');await wait(80);
// d) ⟲ 2 points sur l'image B : deux points du plan (coins haut gauche / haut droit) → deux endroits du tracé (Q1, Q2) : similitude exacte (échelle 0,1 m/px, rotation 90°)
out=await page.evaluate(id=>{const M=window.MAQ;const p=M.bg.get(id);const pw=p.image.pw;const P1=M.bg.toWorld(id,[0,0]),P2=M.bg.toWorld(id,[pw,0]);const Q1=[200,100],Q2=[200,100+pw*0.1];const t=M.bg.cal2(id,P1,P2,Q1,Q2);const w1=M.bg.toWorld(id,[0,0]),w2=M.bg.toWorld(id,[pw,0]);return {t,e1:Math.hypot(w1[0]-Q1[0],w1[1]-Q1[1]),e2:Math.hypot(w2[0]-Q2[0],w2[1]-Q2[1])};},IDS[1]);
console.log('2d) calage par 2 points :',JSON.stringify(out));
C.c2d=out.t&&near(out.t.k,0.1,1e-9)&&near(out.t.rot,90,1e-9)&&out.e1<1e-6&&out.e2<1e-6;
// e) le DXF : translation à la main (autre repère simulé) → <g transform>, bbox décalée ; ⤢ Tout voir cadre les 3 plans
out=await page.evaluate(id=>{const M=window.MAQ;const b0=M.bg.bbox(id);M.bg.setTransform(id,{tx:300,ty:-50});const b1=M.bg.bbox(id);const g=document.querySelector(`#bg g.plan[data-plan="${id}"]`);document.getElementById('bgFit').click();const v=M.state.view;const W=document.getElementById('svg').clientWidth,H=document.getElementById('svg').clientHeight;
  const all=M.bg.plans().map(p=>M.bg.bbox(p.id));const U=[Math.min(...all.map(b=>b[0])),Math.min(...all.map(b=>b[1])),Math.max(...all.map(b=>b[2])),Math.max(...all.map(b=>b[3]))];const sx=U[0]*v.k+v.tx,sy=U[1]*v.k+v.ty,ex=U[2]*v.k+v.tx,ey=U[3]*v.k+v.ty;
  return {dx:b1[0]-b0[0],dy:b1[1]-b0[1],g:g&&g.getAttribute('transform'),geo:M.bg.get(id).geo,inView:sx>=0&&sy>=0&&ex<=W&&ey<=H,paths:g?g.querySelectorAll('path').length:0};},IDS[2]);
console.log('2e) DXF déplacé + ⤢ Tout voir :',JSON.stringify(out));
C.c2e=near(out.dx,300,1e-6)&&near(out.dy,-50,1e-6)&&/translate\(300 -50\)/.test(out.g||'')&&out.geo==='manual'&&out.inView&&out.paths>=1;
// ── 3) deux lignes (une sur le DXF, une sur l'image B) puis 💾 Enregistrer dans TRACÉ
await page.evaluate(()=>{const S=window.MAQ.state;S.lines=[{id:'L1',name:'Antenne C',dn:100,bar:12,pts:[[330,80],[390,80]],specials:[],parent:null},{id:'L2',name:'Antenne B',dn:80,bar:12,pts:[[205,110],[205,125]],specials:[],parent:null}];S.seq=3;window.MAQ.setMode('select');window.MAQ.rebuild();});
await page.click('#bSave');await wait(250);await page.fill('#svName','Antennes en ville');await page.click('#svOk');await wait(1200);
const SITE_ID=await page.evaluate(()=>window.MAQ.state.siteRef&&window.MAQ.state.siteRef.id);
const TR=await page.evaluate(()=>window.MAQ.bg.plans().map(p=>({id:p.id,kind:p.kind,t:{...p.transform},n:p.kind==='dxf'?p.drawing.length:0,first:p.kind==='dxf'?p.drawing[0].pts[0]:null})));
let site=await idbGet('trace:handoff:'+SITE_ID);
out={plans:site&&site.plans&&site.plans.map(p=>[p.kind,p.name,+p.transform.k.toFixed(4),+p.transform.rot.toFixed(2),!!(p.image&&p.image.src),!!p.drawing]),drawing:site&&site.drawing&&site.drawing.length,tagged:site&&site.drawing&&site.drawing.some(d=>d.p!==undefined),
  d0:site&&site.drawing&&site.drawing[0].pts[0],image:site&&site.image&&{x:site.image.x,y:site.image.y,w:site.image.w,h:site.image.h,rot:site.image.rot,src:site.image.src.slice(0,15)},sheetType:site&&site.sheetType,bgName:site&&site.traceur.bgName,bgOrigin:site&&site.traceur.bgOrigin,bgLayers:site&&site.traceur.bgLayers,
  ls:(()=>null)()};
out.ls=await page.evaluate(id=>{const s=JSON.parse(localStorage.getItem('trace:handoff:'+id)||'null');return s&&{plans:s.plans,bgTooBig:s.bgTooBig,drawing:s.drawing};},SITE_ID);
console.log('3) chantier enregistré :',JSON.stringify(out));
// le DXF fusionné est dans le repère commun : premier point = point local + (300, −50) ; une seule image en ancien format (la 1re, tournée de 90°) ; le DXF n'est pas dupliqué dans plans[]
C.c3=!!site&&out.plans.length===3&&out.plans[0][0]==='image'&&out.plans[2][0]==='dxf'&&out.plans[0][4]&&!out.plans[2][5]&&out.drawing===TR[2].n&&!out.tagged&&near(out.d0[0],TR[2].first[0]+300,0.011)&&near(out.d0[1],TR[2].first[1]-50,0.011)
  &&out.image&&out.image.rot===90&&near(out.image.x,TR[0].t.tx,1e-3)&&out.sheetType==='vector'&&out.bgName==='antenne_C.dxf'&&out.bgOrigin&&out.bgOrigin.x0===1349970&&Array.isArray(out.bgLayers)&&out.bgLayers.includes('RCU')&&out.ls&&out.ls.plans===null&&out.ls.bgTooBig===true&&out.ls.drawing===null;
// appli : le plan montre les 2 images (avec rotation) et le fond DXF ; l'aperçu Hydro aussi
await page.click('#svGo');await wait(1800);{const s=await page.$('#loginSkip');if(s&&await s.isVisible())await s.click();await wait(600);}
try{await page.selectOption('#roleSel','ethan');}catch(e){}await wait(400);
out=await page.evaluate(()=>{const T=window.TRACE;const bg=document.getElementById('bg');const imgs=[...bg.querySelectorAll('image')];const gs=imgs.map(i=>i.parentElement.getAttribute('transform')||'');const sh=T.state.sheets[T.state.sheetId];
  return {site:T.net&&T.net.id,plans:T.net&&T.net.plans&&T.net.plans.length,shPlans:sh&&sh.plans&&sh.plans.length,imgs:imgs.length,rot:gs.filter(g=>/rotate\(90\)/.test(g)).length,scale:gs.some(g=>/scale\(0\.1\)/.test(g)),paths:bg.querySelectorAll('path').length};});
console.log('3b) appli :',JSON.stringify(out));
C.c3b=out.site===SITE_ID&&out.plans===3&&out.shPlans===3&&out.imgs===2&&out.rot===2&&out.scale&&out.paths>=1;
// ── 4) retour dans le traceur, mémoire locale des plans effacée : tout vient du chantier
await page.evaluate(()=>{Object.keys(localStorage).filter(k=>k.startsWith('trace:bg:v1')).forEach(k=>localStorage.removeItem(k));});
for(const k of await idbKeys()){if(String(k).startsWith('bg:dxf'))await idbDel(k);}
await page.goto(BASE+'/traceur.html?site='+SITE_ID);await wait(1500);
out=await page.evaluate(TR=>{const M=window.MAQ;const P=M.bg.plans();const same=(a,b)=>['tx','ty','rot','k'].every(f=>Math.abs(a[f]-b[f])<1e-6);
  return {n:P.length,lines:M.state.lines.length,kinds:P.map(p=>p.kind),tf:P.map((p,i)=>same(p.transform,TR[i].t)),dxfN:P[2]&&P[2].drawing.length,local:P[2]&&P[2].drawing[0].pts[0],geo:P.map(p=>p.geo),origin:M.state.bg.origin,gs:document.querySelectorAll('#bg g.plan').length,imgs:document.querySelectorAll('#bg image').length,badge:document.getElementById('siteBadge').textContent};},TR);
console.log('4) traceur rouvert sur le chantier :',JSON.stringify(out));
C.c4=out.n===3&&out.lines===2&&out.kinds.join()==='image,image,dxf'&&out.tf.every(Boolean)&&out.dxfN===TR[2].n&&near(out.local[0],TR[2].first[0],0.011)&&near(out.local[1],TR[2].first[1],0.011)&&out.geo[2]==='manual'&&out.origin&&out.origin.x0===1349970&&out.gs===3&&out.imgs===2&&/Antennes en ville/.test(out.badge);
// ré-enregistrement (mise à jour) : plans et calages inchangés, soudures conservées
await page.click('#bSave');await wait(250);await page.click('#svOk');await wait(1200);
const site2=await idbGet('trace:handoff:'+SITE_ID);
out={plans:site2.plans.map(p=>p.transform),same:site2.plans.every((p,i)=>['tx','ty','rot','k'].every(f=>Math.abs(p.transform[f]-site.plans[i].transform[f])<1e-6)),drawing:site2.drawing.length===site.drawing.length&&JSON.stringify(site2.drawing[0])===JSON.stringify(site.drawing[0]),welds:site2.lines[0].cond.A.welds.map(w=>w.weldId).join()===site.lines[0].cond.A.welds.map(w=>w.weldId).join(),image:site2.image.src===site.image.src&&site2.image.rot===90};
console.log('4b) réenregistré :',JSON.stringify(out));
C.c4b=out.same&&out.drawing&&out.welds&&out.image;
// ── 5) ANCIEN chantier : drawing + image, sans plans (fabriqué à partir d'un enregistrement : DXF seul non calé + image non tournée)
await page.goto(BASE+'/traceur.html?site=new');await wait(900);
await page.evaluate(async()=>{const M=window.MAQ;M.state.lines=[];M.state.bg=null;const mk=(w,h,col,name)=>{const c=document.createElement('canvas');c.width=w;c.height=h;const g=c.getContext('2d');g.fillStyle=col;g.fillRect(0,0,w,h);return new Promise(r=>c.toBlob(b=>r(new File([b],name,{type:'image/png'})),'image/png'));};
  const L=(x1,y1,x2,y2,lay='RCU')=>['0','LINE','8',lay,'10',x1,'20',y1,'11',x2,'21',y2].join('\n');const X=1350500,Y=7200300;
  const dxf=['0','SECTION','2','HEADER','9','$INSUNITS','70','6','0','ENDSEC','0','SECTION','2','ENTITIES',L(X,Y,X+80,Y),L(X+80,Y,X+80,Y+30),'0','ENDSEC','0','EOF'].join('\n');
  await M.bg.addFiles([new File([dxf],'ancien.dxf'),await mk(200,100,'#cccccc','ancien.png')]);const im=M.bg.plans()[1];M.bg.setTransform(im.id,{tx:40,ty:60,rot:0,k:0.25});
  M.state.lines=[{id:'L1',name:'Ligne',dn:100,bar:12,pts:[[30,130],[90,130]],specials:[],parent:null}];M.state.seq=2;M.setMode('select');M.rebuild();});
await page.click('#bSave');await wait(250);await page.fill('#svName','Ancien chantier');await page.click('#svOk');await wait(1200);
const OLD_ID=await page.evaluate(()=>window.MAQ.state.siteRef.id);
let old=await idbGet('trace:handoff:'+OLD_ID);const oldRef=JSON.parse(JSON.stringify(old));
delete old.plans;old.traceur.v=1;await idbSet('trace:handoff:'+OLD_ID,old);await page.evaluate(id=>localStorage.removeItem('trace:handoff:'+id),OLD_ID); // → format d'avant le 14/10 : drawing + image, pas de plans
await page.evaluate(()=>{Object.keys(localStorage).filter(k=>k.startsWith('trace:bg:v1')||k.startsWith('trace:maquette:v1')).forEach(k=>localStorage.removeItem(k));});for(const k of await idbKeys()){if(String(k).startsWith('bg:dxf'))await idbDel(k);}
await page.goto(BASE+'/traceur.html?site='+OLD_ID);await wait(1500);
out=await page.evaluate(()=>{const M=window.MAQ;const P=M.bg.plans();return {n:P.length,kinds:P.map(p=>p.kind),ids:P.map(p=>p.id),geo:P.map(p=>p.geo),imgT:P[1]&&P[1].transform,dxfT:P[0]&&P[0].transform,n0:P[0]&&P[0].drawing.length,gs:document.querySelectorAll('#bg g.plan').length};});
console.log('5) ancien chantier chargé :',JSON.stringify(out));
C.c5=out.n===2&&out.kinds.join()==='dxf,image'&&out.ids.join()==='dxf0,img0'&&out.geo[0]==='coords'&&near(out.imgT.tx,40)&&near(out.imgT.ty,60)&&near(out.imgT.k,0.25,1e-9)&&out.imgT.rot===0&&out.dxfT.tx===0&&out.dxfT.k===1&&out.n0===oldRef.drawing.length&&out.gs===2;
await page.click('#bSave');await wait(250);await page.click('#svOk');await wait(1200);
const old2=await idbGet('trace:handoff:'+OLD_ID);
out={drawing:JSON.stringify(old2.drawing)===JSON.stringify(oldRef.drawing),image:JSON.stringify(old2.image)===JSON.stringify(oldRef.image),bbox:JSON.stringify(old2.bbox)===JSON.stringify(oldRef.bbox),tr:['bgName','bgOrigin','bgLayers','bgOpacity'].every(k=>JSON.stringify(old2.traceur[k])===JSON.stringify(oldRef.traceur[k])),welds:JSON.stringify(old2.lines[0].cond.A.welds.map(w=>w.weldId))===JSON.stringify(oldRef.lines[0].cond.A.welds.map(w=>w.weldId)),plans:old2.plans&&old2.plans.length,crs:old2.crs===oldRef.crs,wh:old2.w===oldRef.w&&old2.h===oldRef.h};
console.log('5b) ancien chantier réenregistré :',JSON.stringify(out));
C.c5b=out.drawing&&out.image&&out.bbox&&out.tr&&out.welds&&out.plans===2&&out.crs&&out.wh;
// ── 6) rechargement de la page (dessin libre) : plans retrouvés depuis IndexedDB, calages depuis le résumé ; rien de lourd en localStorage ; retrait d'un plan
await page.goto(BASE+'/traceur.html?site=new');await wait(900);
await page.evaluate(async()=>{const M=window.MAQ;M.state.lines=[];M.state.bg=null;const mk=(w,h,col,name)=>{const c=document.createElement('canvas');c.width=w;c.height=h;const g=c.getContext('2d');g.fillStyle=col;g.fillRect(0,0,w,h);return new Promise(r=>c.toBlob(b=>r(new File([b],name,{type:'image/png'})),'image/png'));};
  await M.bg.addFiles([await mk(120,80,'#ffaaaa','a.png'),await mk(80,120,'#aaffaa','b.png')]);M.bg.rotate(M.bg.plans()[1].id,30);M.bg.opacity(M.bg.plans()[0].id,.8);M.bg.show(M.bg.plans()[0].id,false);await M.bg.save();});
const before6=await page.evaluate(()=>window.MAQ.bg.plans().map(p=>({id:p.id,t:{...p.transform},op:p.opacity,show:p.show})));
out=await page.evaluate(()=>{const ls=Object.keys(localStorage).filter(k=>k.startsWith('trace:bg:v1')).map(k=>localStorage.getItem(k)).join('');return {lsHasImage:/data:image/.test(ls),lsLen:ls.length};});
await page.reload();await wait(1200);
const after6=await page.evaluate(()=>({plans:window.MAQ.bg.plans().map(p=>({id:p.id,t:{...p.transform},op:p.opacity,show:p.show,src:!!(p.image&&p.image.src)})),gs:document.querySelectorAll('#bg g.plan').length,active:window.MAQ.state.bg.active}));
console.log('6) rechargement :',JSON.stringify({...out,before:before6,after:after6}));
C.c6=!out.lsHasImage&&out.lsLen<2000&&after6.plans.length===2&&after6.plans.every((p,i)=>p.id===before6[i].id&&p.src&&['tx','ty','rot','k'].every(f=>Math.abs(p.t[f]-before6[i].t[f])<1e-9)&&p.op===before6[i].op&&p.show===before6[i].show)&&after6.gs===1;
dialogs=[];
out=await page.evaluate(id=>{const M=window.MAQ;M.bg.setActive(id);document.getElementById('bgClear').click();return {n:M.bg.plans().length,gs:document.querySelectorAll('#bg g.plan').length,tools:getComputedStyle(document.getElementById('bgTools')).display};},before6[1].id);
await wait(300);const idb6=await idbGet('bg:dxf');
console.log('6b) retrait du plan actif :',JSON.stringify({...out,dialogs,idb:idb6&&idb6.plans.length}));
C.c6b=dialogs.length===1&&/Retirer le plan « b.png »/.test(dialogs[0])&&out.n===1&&out.gs===0&&idb6&&idb6.plans.length===1;
// ── 7) ⟲ 2 points PAR CLICS : ① ② sur le plan (coins haut gauche / haut droit de l'image), ③ ④ sur le tracé (aimantés aux sommets d'une ligne de 60 m) → l'image épouse la ligne
await page.goto(BASE+'/traceur.html?site=new');await wait(900);
await page.evaluate(async()=>{const M=window.MAQ;M.state.lines=[{id:'L1',name:'Ligne',dn:100,bar:12,pts:[[100,100],[160,100]],specials:[],parent:null}];M.state.seq=2;M.state.bg=null;M.setMode('select');M.rebuild();
  const c=document.createElement('canvas');c.width=240;c.height=60;const g=c.getContext('2d');g.fillStyle='#ddddff';g.fillRect(0,0,240,60);const f=await new Promise(r=>c.toBlob(b=>r(new File([b],'calage.png',{type:'image/png'})),'image/png'));await M.bg.addFiles([f]);M.bg.fitAll();});
await wait(150);
{const id=await page.evaluate(()=>window.MAQ.bg.plans()[0].id);const w1=await page.evaluate(id=>window.MAQ.bg.toWorld(id,[0,0]),id),w2=await page.evaluate(id=>window.MAQ.bg.toWorld(id,[240,0]),id);
  await page.click('#bgCal2');await wait(80);const hints=[await page.evaluate(()=>document.getElementById('hint').textContent)];
  for(const q of [w1,w2,[100.3,100.4],[159.6,99.7]]){const sc=await toScreen(q[0],q[1]);await page.mouse.click(sc[0],sc[1]);await wait(120);hints.push(await page.evaluate(()=>document.getElementById('hint').textContent));}
  out=await page.evaluate(id=>{const M=window.MAQ;const a=M.bg.toWorld(id,[0,0]),b=M.bg.toWorld(id,[240,0]);const t=M.bg.get(id).transform;return {a,b,k:t.k,rot:t.rot,mode:M.state.mode,geo:M.bg.get(id).geo,draft:document.getElementById('draft').innerHTML.length};},id);
  console.log('7) ⟲ 2 points par clics :',JSON.stringify({...out,hints:hints.map(h=>h.slice(0,70))}));
  // ③ ④ aimantés aux sommets (100,100) / (160,100) → exact ; ① ② arrondis au pixel écran → ~0,5 m près ; échelle 60 m / 240 px = 0,25 m/px
  C.c7=near(out.a[0],100,1)&&near(out.a[1],100,1)&&near(out.b[0],160,1)&&near(out.b[1],100,1)&&near(out.k,0.25,0.01)&&near(out.rot,0,1)&&out.mode==='select'&&out.geo==='manual'&&out.draft===0&&/①/.test(hints[0])&&/②/.test(hints[1])&&/③/.test(hints[2])&&/④/.test(hints[3]);}
// ── 8) deux DXF de plus : un dans le MÊME repère Lambert (à 300 m) → placé tout seul « par ses coordonnées » ; un à 200 km → son propre repère, posé à côté ;
//      enregistré → site.drawing marqué p:<plan> ; rouvert → chaque DXF retrouve ses traits
await page.goto(BASE+'/traceur.html?site=new');await wait(900);
out=await page.evaluate(async()=>{const M=window.MAQ;M.state.lines=[];M.state.bg=null;const L=(x1,y1,x2,y2,lay='RCU')=>['0','LINE','8',lay,'10',x1,'20',y1,'11',x2,'21',y2].join('\n');
  const mk=(X,Y,n)=>{const e=[];for(let i=0;i<n;i++)e.push(L(X+i*3,Y,X+i*3+2,Y+10));return ['0','SECTION','2','HEADER','9','$INSUNITS','70','6','0','ENDSEC','0','SECTION','2','ENTITIES',...e,'0','ENDSEC','0','EOF'].join('\n');};
  const X=1350000,Y=7200000;const added=await M.bg.addFiles([new File([mk(X,Y,3)],'proche_A.dxf'),new File([mk(X+300,Y+100,4)],'proche_B.dxf'),new File([mk(X+200000,Y,5)],'loin_C.dxf')]);
  const P=M.bg.plans();const bb=P.map(p=>M.bg.tight(p.id)); /* emprise serrée des traits (bbox garde la marge de 200 m du cadrage) */const overlap=(a,b)=>!(a[2]<=b[0]||b[2]<=a[0]||a[3]<=b[1]||b[3]<=a[1]);
  return {n:added.length,geo:P.map(p=>p.geo),t:P.map(p=>[p.transform.tx,p.transform.ty,p.transform.k]),n0:P.map(p=>p.drawing.length),origins:P.map(p=>p.origin&&p.origin.x0),apart:!overlap(bb[1],bb[2])&&!overlap(bb[0],bb[2]),bx:bb.map(b=>Math.round(b[0]))};});
console.log('8) DXF même repère / autre repère :',JSON.stringify(out));
C.c8=out.n===3&&out.geo.join()==='coords,coords,manual'&&out.t[0][0]===0&&out.t[1][0]===0&&out.t[1][2]===1&&out.t[2][0]!==0&&out.n0.join()==='3,4,5'&&out.origins[0]===out.origins[1]&&out.origins[2]!==out.origins[0]&&out.apart;
await page.evaluate(()=>{const S=window.MAQ.state;S.lines=[{id:'L1',name:'Ligne',dn:100,bar:12,pts:[[30,130],[90,130]],specials:[],parent:null}];S.seq=2;window.MAQ.setMode('select');window.MAQ.rebuild();});
await page.click('#bSave');await wait(250);await page.fill('#svName','Trois DXF');await page.click('#svOk');await wait(1200);
const ID3=await page.evaluate(()=>window.MAQ.state.siteRef.id);const s3=await idbGet('trace:handoff:'+ID3);
out={plans:s3.plans.map(p=>[p.kind,p.n,p.geo]),drawing:s3.drawing.length,tags:[0,1,2].map(i=>s3.drawing.filter(d=>d.p===i).length),image:s3.image};
console.log('8b) enregistré (fusion marquée) :',JSON.stringify(out));
C.c8b=out.plans.length===3&&out.drawing===12&&out.tags.join()==='3,4,5'&&out.image===null;
await page.evaluate(()=>{Object.keys(localStorage).filter(k=>k.startsWith('trace:bg:v1')).forEach(k=>localStorage.removeItem(k));});for(const k of await idbKeys()){if(String(k).startsWith('bg:dxf'))await idbDel(k);}
await page.goto(BASE+'/traceur.html?site='+ID3);await wait(1500);
out=await page.evaluate(()=>{const M=window.MAQ;const P=M.bg.plans();return {n:P.length,n0:P.map(p=>p.drawing.length),geo:P.map(p=>p.geo),t2:P[2]&&[P[2].transform.tx,P[2].transform.ty],tagged:P.some(p=>p.drawing.some(d=>d.p!==undefined)),gs:document.querySelectorAll('#bg g.plan').length};});
console.log('8c) rouvert :',JSON.stringify(out));
C.c8c=out.n===3&&out.n0.join()==='3,4,5'&&out.geo.join()==='coords,coords,manual'&&out.t2[0]!==0&&!out.tagged&&out.gs===3;
C.logs=logs.length===0;
const bad=Object.entries(C).filter(([k,v])=>!v).map(([k])=>k);console.log(bad.length?'RESULTAT: ECHEC '+bad.join(','):'RESULTAT: TOUT VERT');console.log(logs.length?logs:'[]');
await browser.close();
