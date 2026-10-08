// COMPTES ET ACCÈS (Ethan 08/10) : droits par poste / type / compte, onglet Administrateur sur l'accueil (Ethan seul), création d'un accès, ajustement des droits,
// comptes invités (intérimaires : pur opérationnel) et visiteurs (regard), chantiers autorisés, connexion par mot de passe (écran), l'appli en démo ne change pas.
import { chromium } from 'playwright';
const BASE=process.env.BASE||'http://localhost:8765';
const browser=await chromium.launch({headless:true, executablePath: process.env.CHROMIUM_PATH||undefined});
const ctx=await browser.newContext({viewport:{width:1000,height:940}});const page=await ctx.newPage();
const logs=[];page.on('pageerror',e=>logs.push('PAGEERROR: '+e.message.slice(0,300)));page.on('console',m=>{if(m.type()==='error'&&!/supabase|Failed to fetch|net::ERR|404/i.test(m.text()))logs.push(m.text().slice(0,200));});
page.on('dialog',d=>d.accept().catch(()=>{}));
const C={};
await page.goto(BASE+'/traceur.html');await page.waitForTimeout(500);
await page.evaluate(()=>{localStorage.clear();});await page.reload();await page.waitForTimeout(500);
await page.evaluate(()=>{const S=window.MAQ.state;S.supplier='RENALIA';S.lines=[{id:'L1',name:'Rue de la Gare',dn:150,bar:12,pts:[[10,50],[130,50]],specials:[{id:'v1',type:'valve',m:40}],parent:null}];S.seq=2;window.MAQ.setMode('select');window.MAQ.rebuild();});
await page.click('#bSave');await page.waitForTimeout(200);await page.fill('#svName','Accès test');await page.click('#svOk');await page.waitForTimeout(700);await page.click('#svGo');await page.waitForTimeout(1500);
// ── 1) la matrice : postes, types, défauts cohérents (intérimaire = pur opérationnel, visiteur = regard, admin = tout)
let out=await page.evaluate(()=>{const Ac=window.TRACE.acces;const R=p=>Ac.rights({poste:p,type:'salarie',rights:{},active:true});const keys=Ac.PERMS.map(p=>p[0]);
  const adm=R('admin'),chef=R('chef'),bur=R('bureau'),sou=R('soudeur'),man=R('manchonneur'),vis=R('visiteur');
  const inter=Ac.rights({poste:'soudeur',type:'interim',rights:{},active:true});const visT=Ac.rights({poste:'chef',type:'visiteur',rights:{},active:true});const inactive=Ac.rights({poste:'admin',type:'salarie',rights:{},active:false});
  const ov=Ac.rights({poste:'soudeur',type:'salarie',rights:{'stock.edit':true,'weld.extra':false},active:true});
  return {n:keys.length,admAll:keys.every(k=>adm[k]),chef:chef['site.tracer']&&chef['ts.qualify']&&chef['weld.steps']&&!chef['accounts.manage']&&!chef['site.delete'],bur:bur['site.delete']&&bur['site.tracer']&&!bur['weld.steps']&&!bur['accounts.manage'],
    sou:sou['weld.steps']&&sou['weld.extra']&&!sou['site.tracer']&&!sou['ts.qualify']&&!sou['stock.edit']&&!sou['export.doe'],man:man['weld.steps']&&!man['weld.extra'],vis:vis['plan.view']&&!vis['weld.steps']&&!vis['conv.post'],
    inter:inter['weld.steps']&&inter['pointage.self']&&!inter['team.view']&&!inter['export.doe']&&!inter['dossier.edit'],visT:visT['plan.view']&&!visT['site.tracer']&&!visT['weld.steps'],inactive:keys.every(k=>!inactive[k]),ov:ov['stock.edit']===true&&ov['weld.extra']===false&&ov['weld.steps']===true};});
console.log('1) matrice des droits :',JSON.stringify(out));C.c1=out.n>=20&&out.admAll&&out.chef&&out.bur&&out.sou&&out.man&&out.vis&&out.inter&&out.visT&&out.inactive&&out.ov;
// ── 2) démo hors connexion : Ethan L. = administrateur (onglet ⚙ sur l'accueil), Karim = soudeur (outils du plan réduits), l'appli se comporte comme avant
await page.selectOption('#roleSel','ethan');await page.waitForTimeout(300);
out=await page.evaluate(()=>{const Ac=window.TRACE.acces;const T=window.TRACE;const a=Ac.current();T.state.tab='plan';T.renderAll();const tools=[...document.querySelectorAll('#planTools button')].map(b=>b.id);
  return {poste:a.poste,isAdmin:Ac.isAdmin(),tracer:tools.includes('btnTraceur'),del:tools.includes('btnDelSite'),vers:tools.includes('btnVersions'),extra:tools.includes('btnExtraWeld'),note:tools.includes('btnConvNote'),exportTab:document.querySelector('#tabbar [data-tab=export]').style.display!=='none'};});
console.log('2a) démo Ethan (admin) :',JSON.stringify(out));C.c2a=out.poste==='admin'&&out.isAdmin&&out.tracer&&out.del&&out.vers&&out.extra&&out.note&&out.exportTab;
await page.selectOption('#roleSel','karim');await page.waitForTimeout(300);
out=await page.evaluate(()=>{const Ac=window.TRACE.acces;const T=window.TRACE;T.renderAll();const tools=[...document.querySelectorAll('#planTools button')].map(b=>b.id);const a=Ac.current();
  return {poste:a.poste,isAdmin:Ac.isAdmin(),tracer:tools.includes('btnTraceur'),del:tools.includes('btnDelSite'),extra:tools.includes('btnExtraWeld'),note:tools.includes('btnConvNote'),exportTab:document.querySelector('#tabbar [data-tab=export]').style.display!=='none',steps:Ac.can('weld.steps'),ts:Ac.can('ts.qualify')};});
console.log('2b) démo Karim (soudeur) :',JSON.stringify(out));C.c2b=out.poste==='soudeur'&&!out.isAdmin&&!out.tracer&&!out.del&&out.extra&&out.note&&!out.exportTab&&out.steps&&!out.ts;
await page.selectOption('#roleSel','julien');await page.waitForTimeout(200);
out=await page.evaluate(()=>{const T=window.TRACE;const L=Object.values(T.lines)[0];T.openJoint(L.id,'A',1);const sh=document.querySelector('#sheet');return {ok1:!!sh.querySelector('[data-stepph="1"]'),ok2:!!sh.querySelector('[data-stepph="2"]')||/Étape 2|2 · Fils/.test(sh.textContent)};});
await page.evaluate(()=>window.TRACE.closeSheet());
console.log('2c) manchonneur : pas l\'étape ① (soudure), mais la ②+ :',JSON.stringify(out));C.c2c=!out.ok1&&out.ok2;
// ── 3) onglet Administrateur sur l'accueil (Ethan) : liste, création d'un accès intérimaire limité à un chantier, ajustement des droits, visiteur
await page.selectOption('#roleSel','ethan');await page.waitForTimeout(200);
await page.evaluate(()=>{window.TRACE.showScreen('home');window.TRACE.renderHome();});await page.waitForTimeout(400);
out=await page.evaluate(()=>({tab:document.querySelector('#htAdmin').style.display!=='none'}));
await page.click('#htAdmin');await page.waitForTimeout(600);
out.view=await page.evaluate(()=>({title:/Administrateur/.test(document.querySelector('#homeBody').textContent),matrix:document.querySelectorAll('#homeBody .admM tr').length>20,newBtn:!!document.querySelector('#admNew'),hors:/Hors serveur/.test(document.querySelector('#homeBody').textContent)}));
console.log('3a) onglet ⚙ :',JSON.stringify(out));C.c3a=out.tab&&out.view.title&&out.view.matrix&&out.view.newBtn&&out.view.hors;
await page.click('#admNew');await page.waitForTimeout(300);
await page.fill('#an-prenom','Mehdi');await page.fill('#an-nom','Interim');await page.fill('#an-email','mehdi.interim@gmail.com');await page.selectOption('#an-poste','soudeur');await page.selectOption('#an-type','interim');await page.waitForTimeout(150);
out=await page.evaluate(()=>{const sites=document.querySelector('#an-sites');const cb=document.querySelector('[data-ansite]');if(cb)cb.click();return {sitesShown:sites&&sites.style.display!=='none',hasSite:!!cb};});
await page.click('#an-ok');await page.waitForTimeout(600);
out.after=await page.evaluate(async()=>{const r=await window.TRACE.acces.list();const a=r.rows.find(x=>x.email==='mehdi.interim@gmail.com');const eff=window.TRACE.acces.rights(a);return {n:r.rows.length,a:!!a,type:a&&a.type,poste:a&&a.poste,sites:a&&a.sites&&a.sites.length,local:a&&a.local,steps:eff['weld.steps'],noExport:!eff['export.doe'],noTeam:!eff['team.view'],row:/Mehdi Interim/.test(document.querySelector('#homeBody').textContent)};});
console.log('3b) accès intérimaire créé :',JSON.stringify(out));C.c3b=out.sitesShown&&out.hasSite&&out.after.a&&out.after.type==='interim'&&out.after.poste==='soudeur'&&out.after.sites===1&&out.after.local&&out.after.steps&&out.after.noExport&&out.after.noTeam&&out.after.row;
// ajustement : lui donner l'export DOE malgré le plafond, retirer la soudure supplémentaire
out=await page.evaluate(()=>{const rows=[...document.querySelectorAll('#homeBody .admAcc')];const tr=rows.find(r=>/Mehdi/.test(r.textContent));const b=tr&&tr.querySelector('[data-admrights]');if(!b)return {no:true};b.click();return {ok:true};});
await page.waitForTimeout(300);
await page.evaluate(()=>{const m=document.getElementById('modal');m.querySelector('[data-rk="export.doe"]').checked=true;m.querySelector('[data-rk="weld.extra"]').checked=false;m.querySelector('#ar-ok').click();});await page.waitForTimeout(600);
out=await page.evaluate(async()=>{const r=await window.TRACE.acces.list();const a=r.rows.find(x=>x.email==='mehdi.interim@gmail.com');const eff=window.TRACE.acces.rights(a);return {ov:a.rights,exp:eff['export.doe'],extra:eff['weld.extra'],steps:eff['weld.steps'],txt:/ajusté/.test(document.querySelector('#homeBody').textContent)};});
console.log('3c) droits ajustés compte par compte :',JSON.stringify(out));C.c3c=out.ov&&out.ov['export.doe']===true&&out.ov['weld.extra']===false&&out.exp&&!out.extra&&out.steps&&out.txt;
// visiteur (client) : regard seulement ; passage en inactif
await page.click('#admNew');await page.waitForTimeout(300);await page.fill('#an-prenom','Client');await page.fill('#an-nom','MOE');await page.fill('#an-email','moe@client.fr');await page.selectOption('#an-poste','visiteur');await page.waitForTimeout(100);
out=await page.evaluate(()=>({type:document.querySelector('#an-type').value}));await page.click('#an-ok');await page.waitForTimeout(500);
out.v=await page.evaluate(async()=>{const r=await window.TRACE.acces.list();const a=r.rows.find(x=>x.email==='moe@client.fr');const eff=window.TRACE.acces.rights(a);const rows=[...document.querySelectorAll('#homeBody .admAcc')];const tr=rows.find(x=>/Client MOE/.test(x.textContent));const cb=tr&&tr.querySelector('[data-adm="active"]');if(cb){cb.checked=false;cb.dispatchEvent(new Event('change'));}return {a:!!a,plan:eff['plan.view'],noSteps:!eff['weld.steps'],noConv:!eff['conv.post'],hadCb:!!cb};});
await page.waitForTimeout(500);
out.after=await page.evaluate(async()=>{const r=await window.TRACE.acces.list();const a=r.rows.find(x=>x.email==='moe@client.fr');const eff=window.TRACE.acces.rights(a);return {active:a.active,plan:eff['plan.view']};});
console.log('3d) visiteur puis inactif :',JSON.stringify(out));C.c3d=out.type==='visiteur'&&out.v.a&&out.v.plan&&out.v.noSteps&&out.v.noConv&&out.v.hadCb&&out.after.active===false&&out.after.plan===false;
// ── 4) un non-administrateur ne voit pas l'onglet ⚙ ; l'onglet n'est jamais l'onglet mémorisé
await page.selectOption('#roleSel','sophie');await page.waitForTimeout(200);await page.evaluate(()=>window.TRACE.renderHome());await page.waitForTimeout(300);
out=await page.evaluate(()=>({tab:document.querySelector('#htAdmin').style.display==='none',body:!/Créer un accès/.test(document.querySelector('#homeBody').textContent),homeTab:window.TRACE.state.homeTab,saved:localStorage.getItem('trace:homeTab')}));
console.log('4) bureau : pas d\'onglet administrateur :',JSON.stringify(out));C.c4=out.tab&&out.body&&out.homeTab!=='admin'&&out.saved!=='admin';
// ── 5) écran de connexion : e-mail + mot de passe, première connexion, code par e-mail ; validations sans serveur
await page.evaluate(()=>window.TRACE.showScreen('login'));await page.waitForTimeout(200);
out=await page.evaluate(()=>({pwd:!!document.querySelector('#loginPwd'),go:document.querySelector('#loginGo').textContent,first:!!document.querySelector('#loginFirst'),otp:!!document.querySelector('#loginOtp')}));
await page.fill('#loginEmail','pas-une-adresse');await page.click('#loginGo');await page.waitForTimeout(200);out.bad=await page.evaluate(()=>document.querySelector('#loginHint').textContent);
await page.fill('#loginEmail','karim@scr.fr');await page.fill('#loginPwd','');await page.click('#loginGo');await page.waitForTimeout(200);out.noPwd=await page.evaluate(()=>document.querySelector('#loginHint').textContent);
await page.fill('#loginPwd','abc');await page.click('#loginFirst');await page.waitForTimeout(200);out.short=await page.evaluate(()=>document.querySelector('#loginHint').textContent);
console.log('5) écran de connexion :',JSON.stringify(out));C.c5=out.pwd&&/Se connecter/.test(out.go)&&out.first&&out.otp&&/invalide/.test(out.bad)&&/Mot de passe manquant/.test(out.noPwd)&&/6 caractères/.test(out.short);
// ── 6) comptes gardés sur l'appareil après rechargement (mode démo)
await page.reload();await page.waitForTimeout(1500);
out=await page.evaluate(async()=>{const r=await window.TRACE.acces.list();return {n:r.rows.length,mehdi:r.rows.some(x=>x.email==='mehdi.interim@gmail.com'&&x.rights&&x.rights['export.doe']===true)};});
console.log('6) après rechargement :',JSON.stringify(out));C.c6=out.n>=2&&out.mehdi;
const bad=Object.entries(C).filter(([k,v])=>!v).map(([k])=>k);console.log(bad.length?'RESULTAT: ECHEC '+bad.join(','):'RESULTAT: TOUT VERT');console.log(logs.length?logs:'[]');
await browser.close();
