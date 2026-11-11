// e2e_prefab_1111 — lot 5 (nuit du 10 au 11/11/2026) — Ethan : « préfabrication : un espace d'attente — soudures et manchons pointés avant que le plan soit à jour,
// transférés sur la vraie soudure quand le plan est mis à jour, en gardant la trace de l'endroit prévu et que le plan n'a pas été modifié. Faire ça bien. »
//  p1 bouton « ⏳ Préfabrication (en attente) » du plan → espace d'attente ; p2 champs obligatoires (endroit prévu, photo) ; pointage → ATT-… listée, bandeau, PLAN INCHANGÉ
//  p3 « soudure + manchon » ; p4 gardé après rechargement (téléphone) ; p5 transfert sur une soudure existante : avancement, soudeur, photo, événement « ⏳ Préfabriquée »
//  (lieu prévu, plan non modifié), plus de « reprise » parasite, ligne d'attente « transférée » (jamais effacée) ; p6 plan mis à jour (soudure ajoutée) → transfert du
//  « soudure + manchon » : manchonnée, trace « plan mis à jour ensuite » ; p7 annuler = motif obligatoire, gardée dans l'historique ; p8 droits : le soudeur pointe et transfère (droit « transférer l'avancement » du terrain), le manchonneur (sans étape 1) transfère mais ne pointe pas de soudure ;
//  p9 téléphone 390 px sans débordement ; p10 console propre. Données fictives uniquement.
import { chromium } from 'playwright';
const BASE=process.env.BASE||'http://127.0.0.1:8766';
const browser=await chromium.launch({headless:true,executablePath:process.env.CHROMIUM_PATH||undefined});const C={};const logs=[];const J=x=>JSON.stringify(x);
const ctx=await browser.newContext({viewport:{width:1280,height:850}});const page=await ctx.newPage();
page.on('pageerror',e=>logs.push('PAGEERROR: '+e.message.slice(0,300)));page.on('console',m=>{if(m.type()==='error'&&!/supabase|Failed to fetch|net::ERR|404|geopf|WebSocket|open-meteo/i.test(m.text()))logs.push(m.text().slice(0,200));});
let MOTIF='doublon de test';page.on('dialog',d=>{if(d.type()==='prompt')d.accept(MOTIF).catch(()=>{});else d.accept().catch(()=>{});});
await ctx.route(u=>/(^|\.)geopf\.fr$|^geo\.api\.gouv\.fr$|open-meteo\.com$/.test(u.hostname),r=>r.fulfill({status:200,contentType:'application/json',body:'[]'}));
const wait=ms=>page.waitForTimeout(ms);
const PNG=Buffer.from('iVBORw0KGgoAAAANSUhEUgAAAAQAAAAECAIAAAAmkwkpAAAAEklEQVR4nGP4z8DwHwyBNANMAAB5Swn3XKIiTgAAAABJRU5ErkJggg==','base64');
await page.goto(BASE+'/traceur.html');await wait(500);await page.evaluate(()=>{localStorage.clear();});await page.evaluate(()=>new Promise(r=>{try{const q=indexedDB.deleteDatabase('trace-kv');q.onsuccess=q.onerror=q.onblocked=()=>r();}catch(e){r();}}));await page.reload();await wait(600);
await page.evaluate(()=>{const S=window.MAQ.state;S.lines=[{id:'L1',name:'Feeder',dn:100,bar:12,pts:[[10,50],[70,50]],specials:[],parent:null}];S.seq=2;window.MAQ.setMode('select');window.MAQ.rebuild();});
await page.click('#bSave');await wait(200);await page.fill('#svName','Préfa test');await page.click('#svOk');await wait(800);await page.click('#svGo');await wait(1800);
await page.selectOption('#roleSel','ethan');await wait(300);
const sid=await page.evaluate(()=>window.TRACE.state.siteId);
const tapAt=async(wx,wy)=>{const pt=await page.evaluate(([wx,wy])=>{const v=window.TRACE.state.view;const r=document.querySelector('#canvas').getBoundingClientRect();return {x:r.left+wx*v.k+v.tx,y:r.top+wy*v.k+v.ty};},[wx,wy]);
  await page.mouse.move(pt.x,pt.y);await page.mouse.down();await wait(40);await page.mouse.up();await wait(600);};
const jointXY=id=>page.evaluate(id=>{const T=window.TRACE;const A=T.state.lines.L1.cond.A;const j=A.joints.find(x=>x.weldId===id);const e=A.els[j.idx];const p=e.axis[0][e.axis[0].length-1];T.centerOn(p.x,p.y,60);return {x:p.x,y:p.y};},id);
const planSig=()=>page.evaluate(()=>{const T=window.TRACE;const A=T.state.lines.L1.cond.A;return J2({lines:T.net.lines,n:A.joints.length,st:A.joints.map(j=>j.status).join(),x:(T.net.extraWelds||[]).length});function J2(x){return JSON.stringify(x);}});
const ouvrir=async()=>{await page.evaluate(()=>{const b=document.getElementById('btnAttente');if(b)b.click();});await wait(400);};
const pointer=async(o)=>{await page.evaluate(()=>{const b=document.getElementById('att-new');if(b)b.click();});await wait(300);
  if(o.kind==='complet'){await page.evaluate(()=>{const b=document.querySelector('#modal [data-attk=complet]');if(b)b.click();});await wait(250);}
  if(o.dn)await page.selectOption('#att-dn',String(o.dn));if(o.lieu!=null)await page.fill('#att-lieu',o.lieu);if(o.pres)await page.fill('#att-pres',o.pres);
  if(o.photo){await page.setInputFiles('#att-ph',{name:'soudure.png',mimeType:'image/png',buffer:PNG});await page.waitForFunction(()=>document.querySelectorAll('#att-phs img').length>0,null,{timeout:10000}).catch(()=>{});await wait(200);}
  await page.evaluate(()=>document.getElementById('att-ok').click());await wait(600);};
// ── p1) le bouton du plan et l'espace d'attente
const sig0=await planSig();await ouvrir();
const p1=await page.evaluate(()=>({btn:!!document.getElementById('btnAttente'),modal:document.getElementById('modal').classList.contains('show'),titre:(document.querySelector('#modal h3')||{}).textContent||'',nouveau:!!document.getElementById('att-new'),vide:/Rien en attente/.test(document.getElementById('modal').textContent)}));
console.log('p1) espace d\'attente :',J(p1));C.p1=p1.btn&&p1.modal&&/Préfabrication/.test(p1.titre)&&p1.nouveau&&p1.vide;
// ── p2) champs obligatoires, puis pointage d'une soudure (DN 100, TIG, prévue « 3e soudure après S-0002 ») → listée, bandeau, plan inchangé
await page.evaluate(()=>document.getElementById('att-new').click());await wait(300);await page.evaluate(()=>document.getElementById('att-ok').click());await wait(250);
const err=await page.evaluate(()=>(document.getElementById('att-err')||{}).textContent||'');await page.evaluate(()=>document.getElementById('att-back').click());await wait(300);
await pointer({dn:100,lieu:'Feeder, 3e soudure après S-0002 (côté chaufferie)',pres:'S-0002',photo:true});
const p2=await page.evaluate(()=>{const T=window.TRACE;const b=document.getElementById('attWarn');return {list:T.att.list(),all:T.att.all(),rows:document.querySelectorAll('#modal .att-row').length,lieu:(document.querySelector('#modal .att-lieu')||{}).textContent||'',banner:!!b&&b.classList.contains('show')?b.textContent:''};});
p2.err=err;p2.plan=(await planSig())===sig0;
console.log('p2) pointée en attente :',J(p2));C.p2=/obligatoire/.test(err)&&/photo/i.test(err)&&p2.list.length===1&&/^ATT-[A-Z0-9]{8}$/.test(p2.list[0])&&p2.rows===1&&/3e soudure après S-0002/.test(p2.lieu)&&/près de S-0002/.test(p2.lieu)&&/1 soudure préfabriquée en attente/.test(p2.banner)&&p2.plan;
// ── p3) « soudure + manchon » (à transférer plus tard sur une soudure ajoutée)
await pointer({kind:'complet',dn:100,lieu:'Feeder, raccord ajouté au PK 30 (barre recoupée)',photo:true});
const p3=await page.evaluate(()=>window.TRACE.att.list().length);console.log('p3) soudure + manchon :',p3);C.p3=p3===2&&(await planSig())===sig0;
// ── p4) gardé sur le téléphone après rechargement
await page.reload();await wait(1600);await page.selectOption('#roleSel','ethan').catch(()=>{});await wait(300);
await page.evaluate(id=>{if(window.TRACE.state.siteId!==id&&window.TRACE.go)window.TRACE.go(id);},sid);await wait(1500);await page.evaluate(()=>{window.TRACE.state.tab='plan';window.TRACE.renderAll();});await wait(800);
const p4=await page.evaluate(()=>{const b=document.getElementById('attWarn');return {list:window.TRACE.att.list().length,banner:!!b&&b.classList.contains('show')?b.textContent:''};});
console.log('p4) après rechargement :',J(p4));C.p4=p4.list===2&&/2 soudures préfabriquées en attente/.test(p4.banner);
// ── p5) transfert sur une soudure existante (à souder) : avancement, soudeur, photo, événement « ⏳ Préfabriquée », pas de « reprise » parasite, ligne « transférée »
const ids=await page.evaluate(()=>window.TRACE.att.all().map(r=>r.id));
const T5=await page.evaluate(()=>{const A=window.TRACE.state.lines.L1.cond.A;const j=A.joints.find(x=>!x.extra&&x.status==='a_souder'&&A.els[x.idx]&&A.els[x.idx].kind==='pipe');return j.weldId;});
await page.click('#attWarn');await wait(400);await page.click(`#modal [data-att-put="${ids[0]}"]`);await wait(400);const pose=await page.evaluate(()=>window.TRACE.att.pose());
let xy=await jointXY(T5);await wait(300);await tapAt(xy.x,xy.y);
const p5=await page.evaluate(([id,a])=>{const T=window.TRACE;const j=T.state.lines.L1.cond.A.joints.find(x=>x.weldId===id);const ev=(j.events||[]).find(e=>e.type==='prefab');
  return {st:j.status,step1:!!(j.steps&&j.steps[1]&&j.steps[1].done),by:j.steps&&j.steps[1]&&j.steps[1].by,ph:(j.events||[]).reduce((n,e)=>n+((e&&e.photos)||[]).length,0)+((j.steps&&j.steps[1]&&j.steps[1].photos)||[]).length,prefab:ev?{de:ev.data.de,lieu:ev.data.lieu,p0:!!ev.data.planPointage,p1:!!ev.data.planTransfert}:null,
    reprise:(j.events||[]).some(e=>e.type==='reprise'&&e.data&&e.data.de===a),rec:T.att.all().find(r=>r.id===a),pose:T.att.pose(),list:T.att.list().length};},[T5,ids[0]]);
await page.evaluate(id=>{const T=window.TRACE;const A=T.state.lines.L1.cond.A;T.openJoint('L1','A',A.joints.findIndex(x=>x.weldId===id));},T5);await wait(500);
p5.hist=await page.evaluate(()=>{const t=(document.getElementById('sheet')||{}).textContent||'';const i=t.indexOf('Préfabriquée');return i<0?'':t.slice(i,i+260);});await page.evaluate(()=>window.TRACE.closeSheet&&window.TRACE.closeSheet());await wait(200);
console.log('p5) transfert sur '+T5+' :',J({pose,...p5}));C.p5=pose===ids[0]&&p5.st==='soudee'&&p5.step1&&/Ethan/.test(p5.by||'')&&p5.ph>=1&&p5.prefab&&p5.prefab.de===ids[0]&&/3e soudure après S-0002/.test(p5.prefab.lieu)&&p5.prefab.p0&&p5.prefab.p1&&!p5.reprise&&p5.rec&&p5.rec.st==='transferee'&&p5.rec.vers===T5&&p5.pose===null&&p5.list===1&&/plan non modifié au pointage/.test(p5.hist)&&/prévue/.test(p5.hist);
// ── p6) le plan est mis à jour (soudure ajoutée sur L1) → transfert du « soudure + manchon » dessus : manchonnée, « plan mis à jour ensuite »
const tg=await page.evaluate(()=>{const T=window.TRACE;const A=T.state.lines.L1.cond.A;const i=A.els.findIndex((e,q)=>e.kind==='pipe'&&e.len>8&&q>0);const e=A.els[i];const pl=e.axis[0];const wx=pl[0].x+(pl[pl.length-1].x-pl[0].x)*0.5,wy=pl[0].y+(pl[pl.length-1].y-pl[0].y)*0.5;T.centerOn(wx,wy,60);return {wx,wy};});
await wait(300);await page.evaluate(()=>document.querySelector('#btnExtraWeld').click());await wait(250);await tapAt(tg.wx,tg.wy);await page.evaluate(()=>window.TRACE.closeSheet&&window.TRACE.closeSheet());await wait(300);
const X=await page.evaluate(()=>{const A=window.TRACE.state.lines.L1.cond.A;const j=A.joints.find(x=>x.extra);return j?j.weldId:null;});
await page.click('#attWarn');await wait(400);await page.click(`#modal [data-att-put="${ids[1]}"]`);await wait(400);xy=await jointXY(X);await wait(300);await tapAt(xy.x,xy.y);
await page.evaluate(id=>{const T=window.TRACE;const A=T.state.lines.L1.cond.A;T.openJoint('L1','A',A.joints.findIndex(x=>x.weldId===id));},X);await wait(500);
const p6=await page.evaluate(([id,a])=>{const T=window.TRACE;const j=T.state.lines.L1.cond.A.joints.find(x=>x.weldId===id);const t=(document.getElementById('sheet')||{}).textContent||'';return {st:j&&j.status,steps:j&&j.steps?[1,2,3,4].filter(n=>j.steps[n]&&j.steps[n].done).join():'',maj:/plan mis à jour ensuite/.test(t),rec:T.att.all().find(r=>r.id===a),banner:(()=>{const b=document.getElementById('attWarn');return !!b&&b.classList.contains('show');})()};},[X,ids[1]]);
await page.evaluate(()=>window.TRACE.closeSheet&&window.TRACE.closeSheet());await wait(200);
console.log('p6) plan mis à jour → transfert sur '+X+' :',J(p6));C.p6=!!X&&p6.st==='manchonnee'&&p6.steps==='1,2,3,4'&&p6.maj&&p6.rec&&p6.rec.st==='transferee'&&p6.rec.vers===X&&p6.banner===false;
// ── p7) annuler : motif obligatoire, gardée dans l'historique
await ouvrir();await pointer({dn:100,lieu:'Pointée par erreur',photo:true});const id7=await page.evaluate(()=>window.TRACE.att.list()[0]);
MOTIF='';await page.click(`#modal [data-att-del="${id7}"]`);await wait(300);const still=await page.evaluate(()=>window.TRACE.att.list().length);
MOTIF='doublon de test';await page.click(`#modal [data-att-del="${id7}"]`);await wait(400);
const p7=await page.evaluate(id=>{const T=window.TRACE;return {list:T.att.list().length,rec:T.att.all().find(r=>r.id===id),hist:/Historique · 3/.test(document.getElementById('modal').textContent),motif:/doublon de test/.test(document.getElementById('modal').textContent)};},id7);p7.still=still;
console.log('p7) annulée, gardée :',J(p7));C.p7=p7.still===1&&p7.list===0&&p7.rec&&p7.rec.st==='annulee'&&p7.hist&&p7.motif;await page.evaluate(()=>{const b=document.querySelector('#modal [data-close]');if(b)b.click();});await wait(200);
// ── p8) droits : Karim (soudeur : étape 1 + transférer) pointe et transfère ; Julien (manchonneur : pas d'étape 1) transfère, ne pointe pas
await page.selectOption('#roleSel','karim').catch(()=>{});await wait(400);await page.evaluate(()=>{window.TRACE.state.tab='plan';window.TRACE.renderAll();});await wait(400);await ouvrir();
await pointer({dn:100,lieu:'Feeder, côté vanne fictive',photo:true});
const p8=await page.evaluate(()=>({btn:!!document.getElementById('btnAttente'),neu:!!document.getElementById('att-new'),put:document.querySelectorAll('#modal [data-att-put]').length,del:document.querySelectorAll('#modal [data-att-del]').length,list:window.TRACE.att.list().length}));
await page.evaluate(()=>{const b=document.querySelector('#modal [data-close]');if(b)b.click();});await wait(200);await page.selectOption('#roleSel','julien').catch(()=>{});await wait(400);await page.evaluate(()=>{window.TRACE.state.tab='plan';window.TRACE.renderAll();});await wait(400);await ouvrir();
p8.julien=await page.evaluate(()=>({btn:!!document.getElementById('btnAttente'),neu:!!document.getElementById('att-new'),put:document.querySelectorAll('#modal [data-att-put]').length}));
console.log('p8) droits :',J(p8));C.p8=p8.btn&&p8.neu&&p8.put===1&&p8.del===1&&p8.list===1&&p8.julien.btn&&!p8.julien.neu&&p8.julien.put===1;
await page.evaluate(()=>{const b=document.querySelector('#modal [data-close]');if(b)b.click();});await wait(200);await page.selectOption('#roleSel','karim').catch(()=>{});await wait(300);await page.evaluate(()=>{window.TRACE.state.tab='plan';window.TRACE.renderAll();});await wait(300);await ouvrir();
// ── p9) téléphone 390 px
await page.setViewportSize({width:390,height:844});await wait(300);await page.evaluate(()=>document.getElementById('att-new').click());await wait(400);
const p9=await page.evaluate(()=>{const m=document.querySelector('#modal.show .box');return {doc:document.documentElement.scrollWidth<=window.innerWidth+1,modal:!!m&&m.scrollWidth<=m.clientWidth+1,h:Math.min(...[...document.querySelectorAll('#modal .att-f select,#modal .att-f input:not([type=file]),#modal .att-seg button')].map(x=>Math.round(x.getBoundingClientRect().height)))};});
console.log('p9) téléphone :',J(p9));C.p9=p9.doc&&p9.modal&&p9.h>=46;
C.p10=logs.length===0;if(logs.length)console.log('logs :',J(logs.slice(0,8)));
await browser.close();
const ko=Object.keys(C).filter(k=>!C[k]);console.log('RÉSULTATS',J(C));console.log('RESULTAT:',ko.length?'ECHEC '+ko.join(','):'TOUT VERT');process.exit(ko.length?1:0);
