// e2e_bp_0111 — 01/11 (Ethan) : DÉTECTION D'HUMIDITÉ — plan de bouclage. Réseau fictif tracé au traceur : feeder L1 (190 m), antenne L2 (30 m) au PK 50.
//  c1  onglet : plus de « Schéma filaire » ; la liste manchon par manchon est repliée ; carte « Plan de bouclage » en tête, « aucun plan », 1 boucle (té « ? »)
//  c2  Tés : un toucher sur le té → antenne ISOLÉE → 2 boucles ; ✂ Couper au manchon de L1 après le té → 3 boucles ; ▣ Boîtier au départ → « ▣ B1 » sur la boucle 1
//  c3  📍 Je me place sur un manchon de l'antenne → « Boucle n », résistance théorique = 2 × 30 m × 12,5 Ω/km ; isolement > le minimum réglé
//  c4  source SCR + « ✓ Valider le plan » → validé ; enregistré dans les données DH du chantier
//  c5  fiche de la sortie de té (étape ② Fils) : « Plan de bouclage : antenne ISOLÉE » ; fiche du manchon coupé : « ✂ … on coupe la boucle »
//  c6  390 px : carte et boutons sans débordement · c7 zéro erreur de page
import { chromium } from 'playwright';
const BASE=process.env.BASE||'http://localhost:8765';const C={};const J=x=>JSON.stringify(x);const errs=[];
const b=await chromium.launch();const page=await (await b.newContext({viewport:{width:1280,height:900}})).newPage();page.on('pageerror',e=>errs.push(String(e)));page.on('dialog',d=>d.accept().catch(()=>{}));
const wait=ms=>page.waitForTimeout(ms);
await page.goto(BASE+'/traceur.html');await wait(600);await page.evaluate(()=>{localStorage.clear();localStorage.setItem('trace:wide','1');});await page.reload();await wait(800);
await page.evaluate(()=>{const S=window.MAQ.state;S.supplier='AXIOM';S.lines=[{id:'L1',name:'Feeder',dn:100,bar:12,inv:true,pts:[[10,50],[200,50]],specials:[],parent:null},{id:'L2',name:'Antenne SST',dn:80,bar:12,inv:true,pts:[[60,50],[60,80]],specials:[],parent:{line:'L1',m:50,side:1}}];S.seq=3;window.MAQ.setMode('select');window.MAQ.rebuild();});
await page.click('#bSave');await wait(200);await page.fill('#svName','Bouclage test');await page.click('#svOk');await wait(800);await page.click('#svGo');await wait(1500);
await page.evaluate(()=>{localStorage.removeItem('trace:wide');});await page.reload();await wait(1500);if(await page.locator('#loginSkip').isVisible().catch(()=>false))await page.click('#loginSkip');await wait(300);
await page.evaluate(async()=>{const T=window.TRACE;T.state.userId='ethan';const id=Object.keys(T.sites).find(k=>/Bouclage/.test((T.sites[k]||{}).name||''));if(id&&T.state.siteId!==id)await T.openSiteFromHome(id);T.showScreen('site');try{T.tuto.close(null);}catch(e){}T.state.tab='bouclage';T.renderAll();});await wait(700);
const st=()=>page.evaluate(()=>{const el=document.getElementById('bouclage');const c=document.getElementById('bpCard');return {card:!!c,st:c?(c.querySelector('.bpSt')||{}).textContent:'',loops:[...document.querySelectorAll('#bpCard .bpLoop')].map(x=>x.textContent.replace(/\s+/g,' ').trim()),filaire:/Schéma filaire/.test(el.textContent),rowsHidden:(()=>{const d=document.querySelector('#bouclage details.dhRowsD');return !!d&&!d.open&&!!d.querySelector('#dh-rows');})(),at:((document.querySelector('#bpCard .bpAt')||{}).textContent||'').replace(/\s+/g,' ')};});
const toMap=async(line,m)=>page.evaluate(([line,m])=>{const T=window.TRACE;const l=T.lines[line];const P=l.pts;let acc=0,q=P[0];for(let i=1;i<P.length;i++){const d=Math.hypot(P[i].x-P[i-1].x,P[i].y-P[i-1].y);if(acc+d>=m){const t=(m-acc)/d;q={x:P[i-1].x+(P[i].x-P[i-1].x)*t,y:P[i-1].y+(P[i].y-P[i-1].y)*t};break;}acc+=d;}const V=T.bp.st().view;const r=document.getElementById('bpMap').getBoundingClientRect();return [r.left+q.x*V.k+V.tx,r.top+q.y*V.k+V.ty];},[line,m]);
const tapMap=async(line,m)=>{const s=await toMap(line,m);await page.mouse.click(s[0],s[1]);await wait(350);};
const mode=async m=>{await page.click(`#bpCard [data-bpmode="${m}"]`);await wait(250);};
const jm=(line,i)=>page.evaluate(([line,i])=>{const T=window.TRACE;const l=T.lines[line];const j=l.cond.A.joints[i];const e=l.cond.A.els[j.idx];return {m:e?e.m1:0,teeOut:!!j.teeOut,id:j.weldId,n:l.cond.A.joints.length};},[line,i]);
const o={s0:await st()};
C.c1=o.s0.card&&/aucun plan/.test(o.s0.st)&&o.s0.loops.length===1&&/té \?/.test(o.s0.loops[0])&&!o.s0.filaire&&o.s0.rowsHidden;
await mode('tee');await tapMap('L1',50);o.s1=await st();
const L1=[];for(let i=0;i<(await jm('L1',0)).n;i++)L1.push(await jm('L1',i));const cutJ=L1.find(j=>j.m>90&&j.m<170);o.cutJ=cutJ;
await mode('cut');await tapMap('L1',cutJ.m);o.s2=await st();
await mode('box');await tapMap('L1',2);o.s3=await st();
C.c2=o.s1.loops.length===2&&o.s2.loops.length===3&&o.s3.loops.some(t=>/Boucle 1/.test(t)&&/▣ B1/.test(t))&&!o.s3.loops.some(t=>/té \?/.test(t));
const a2=await jm('L2',1);await mode('at');await tapMap('L2',a2.m);o.s4=await st();
const lenL2=await page.evaluate(()=>{const P=window.TRACE.lines.L2.pts;let s=0;for(let i=1;i<P.length;i++)s+=Math.hypot(P[i].x-P[i-1].x,P[i].y-P[i-1].y);return s;});const R=Math.round(2*lenL2*12.5/1000*100)/100;o.R=R;
C.c3=/Boucle \d/.test(o.s4.at)&&o.s4.at.includes(R.toLocaleString('fr-FR',{minimumFractionDigits:1,maximumFractionDigits:2}))&&/isolement > [\d\s\u202f]+ MΩ/.test(o.s4.at); /* isolement mini = réglage DH du chantier */
await page.selectOption('#bpSrc','scr');await wait(300);await page.click('#bpOk');await wait(400);o.s5=await st();o.saved=await page.evaluate(()=>{const p=window.TRACE.bp.plan();return p?{tees:p.tees,cuts:p.cuts.length,boxes:p.boxes.length,src:p.src,ok:!!p.ok}:null;});
C.c4=/validé/.test(o.s5.st)&&o.saved&&o.saved.tees.L2==='isole'&&o.saved.cuts===1&&o.saved.boxes===1&&o.saved.src==='scr'&&o.saved.ok;
const sheet=async(line,i)=>{await page.evaluate(([line,i])=>window.TRACE.openJoint(line,'A',i),[line,i]);await wait(400);return page.evaluate(()=>{const s=document.getElementById('sheet');return {ok:((s.querySelector('.bpOkBox')||{}).textContent||'').replace(/\s+/g,' '),cut:((s.querySelector('.bpCutBox')||{}).textContent||'').replace(/\s+/g,' '),warn:!!s.querySelector('.bpWarn')};});};
o.f1=await sheet('L2',0);o.f2=await sheet('L1',L1.indexOf(cutJ));
C.c5=/ISOLÉE/.test(o.f1.ok)&&!o.f1.warn&&/coupe la boucle/.test(o.f2.cut);
await page.evaluate(()=>{try{window.TRACE.closeSheet&&window.TRACE.closeSheet();}catch(e){}const T=window.TRACE;T.state.tab='bouclage';T.renderAll();});await page.setViewportSize({width:390,height:844});await wait(500);await page.evaluate(()=>{const T=window.TRACE;T.renderAll();});await wait(400);
o.phone=await page.evaluate(()=>{const c=document.getElementById('bpCard').getBoundingClientRect();const m=document.getElementById('bpMap').getBoundingClientRect();const bt=[...document.querySelectorAll('#bpCard .bpM')].map(x=>Math.round(x.getBoundingClientRect().height));return {cr:Math.round(c.right),mr:Math.round(m.right),iw:innerWidth,sw:document.documentElement.scrollWidth,minH:Math.min(...bt)};});
await page.screenshot({path:'/tmp/claude-0/-home-claude/7b0d9506-252b-5961-91ce-d6d09cbca67e/scratchpad/bp_390.png'});
C.c6=o.phone.cr<=o.phone.iw&&o.phone.mr<=o.phone.iw&&o.phone.sw<=o.phone.iw&&o.phone.minH>=44;
console.log('mesures :',J(o));
await b.close();C.c7=!errs.length;if(errs.length)console.log('erreurs',errs.slice(0,3));
console.log('RÉSULTATS',J(C));const ko=Object.entries(C).filter(([,v])=>!v).map(([k])=>k);console.log(ko.length?'RESULTAT: ECHEC '+ko.join(' '):'RESULTAT: TOUT VERT');process.exit(ko.length?1:0);
