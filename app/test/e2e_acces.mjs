// COMPTES ET ACCÈS v2 (Ethan 08/10) : les vrais postes SCR, droits par POSTE réglables (défauts SCR + écarts) et par PERSONNE, plafonds par type,
// onglet Administrateur sur l'accueil (Personnes : recherche / filtres / création / plusieurs d'un coup / ★ admin ; Postes : par poste + tableau ; Qui peut quoi),
// étapes ①②③④ = droits par étape, écran de connexion, affichage large depuis l'accueil, tout gardé sur l'appareil en démo. L'appli en démo ne change pas.
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
await page.addInitScript(()=>{window.body=()=>document.querySelector('#homeBody').textContent;});await page.evaluate(()=>{window.body=()=>document.querySelector('#homeBody').textContent;});
// ── 1) le modèle : 21 postes réels, 25 droits (4 étapes), admin = drapeau, plafonds, ajustements, anciens postes v1 migrés, rôle serveur déduit
let out=await page.evaluate(()=>{const Ac=window.TRACE.acces;const keys=Ac.PERMS.map(p=>p[0]);const R=(poste,extra={})=>Ac.rights({poste,type:'salarie',rights:{},active:true,...extra});
  const adm=R('soudeur',{admin:true}),chef=R('chef'),ca=R('charge_affaires'),sou=R('soudeur'),man=R('manchonneur'),tuy=R('tuyauteur'),vis=R('visiteur'),rh=R('resp_rh'),mag=R('referent_magasin'),ger=R('gerant');
  const inter=Ac.rights({poste:'soudeur',type:'interim',rights:{},active:true});const visT=Ac.rights({poste:'chef',type:'visiteur',rights:{},active:true});const inactive=Ac.rights({poste:'gerant',admin:true,type:'salarie',rights:{},active:false});
  const ov=Ac.rights({poste:'soudeur',type:'salarie',rights:{'stock.edit':true,'weld.extra':false},active:true});
  const legacyAdmin=Ac.norm({email:'elebihan@scr-soudure.fr',poste:'admin'}),legacyBureau=Ac.norm({email:'s@scr.fr',poste:'bureau',rights:{'weld.steps':true}}),unknown=Ac.norm({email:'x@scr.fr',poste:'plombier'});
  return {n:keys.length,postes:Object.keys(Ac.POSTES).length,fams:Object.keys(Ac.FAMILLES).length,admAll:keys.every(k=>adm[k]),gerAll:keys.every(k=>ger[k]),
    chef:chef['site.tracer']&&chef['ts.qualify']&&chef['weld.step1']&&chef['weld.step4']&&chef['weld.admin']&&!chef['site.delete'],ca:ca['site.delete']&&ca['site.tracer']&&!ca['weld.step1']&&!ca['pointage.self'],
    sou:sou['weld.step1']&&!sou['weld.step2']&&sou['weld.extra']&&sou['dh.measure']&&!sou['site.tracer']&&!sou['ts.qualify']&&!sou['stock.edit']&&!sou['export.doe'],man:!man['weld.step1']&&man['weld.step2']&&man['weld.step3']&&man['weld.step4']&&!man['weld.extra'],
    tuy:tuy['weld.step1']&&!tuy['weld.extra'],act:(()=>{const a=R('activites_specifiques');return a['weld.step1']&&a['weld.step4']&&a['weld.extra']&&a['dh.measure']&&!a['site.tracer']&&!a['stock.edit'];})(),vis:vis['plan.view']&&!vis['weld.step1']&&!vis['conv.post'],rh:rh['pointage.validate']&&rh['qse.manage']&&!rh['site.tracer'],mag:mag['stock.edit']&&!mag['weld.step1'],
    inter:inter['weld.step1']&&inter['pointage.self']&&!inter['team.view']&&!inter['export.doe'],visT:visT['plan.view']&&!visT['site.tracer']&&!visT['weld.step1'],inactive:keys.every(k=>!inactive[k]),ov:ov['stock.edit']===true&&ov['weld.extra']===false&&ov['weld.step1']===true,
    legacyAdmin:legacyAdmin.admin&&legacyAdmin.poste==='resp_exploitation',legacyBureau:legacyBureau.poste==='charge_affaires'&&legacyBureau.rights['weld.step1']===true&&legacyBureau.rights['weld.steps']===undefined,unknown:unknown.poste==='autre',
    roles:[Ac.roleFor(Ac.norm({poste:'chef'})),Ac.roleFor(Ac.norm({poste:'conducteur'})),Ac.roleFor(Ac.norm({poste:'gerant'})),Ac.roleFor(Ac.norm({poste:'soudeur'})),Ac.roleFor(Ac.norm({poste:'manchonneur'})),Ac.roleFor(Ac.norm({poste:'referent_magasin'})),Ac.roleFor(Ac.norm({poste:'soudeur',type:'interim'}))].join(',')};});
console.log('1) modèle :',JSON.stringify(out));C.c1=out.n===28&&out.postes===22&&out.fams===5&&out.act&&out.admAll&&out.gerAll&&out.chef&&out.ca&&out.sou&&out.man&&out.tuy&&out.vis&&out.rh&&out.mag&&out.inter&&out.visT&&out.inactive&&out.ov&&out.legacyAdmin&&out.legacyBureau&&out.unknown&&out.roles==='bureau,bureau,chef,soudeur,manchonneur,bureau,soudeur';
// ── 2) démo hors connexion : Ethan L. = administrateur, Karim = soudeur (étape ① seulement), Julien = manchonneur (②③④)
await page.selectOption('#roleSel','ethan');await page.waitForTimeout(300);
out=await page.evaluate(()=>{const Ac=window.TRACE.acces;const T=window.TRACE;const a=Ac.current();T.state.tab='plan';T.renderAll();const tools=[...document.querySelectorAll('#planTools button')].map(b=>b.id);
  return {poste:a.poste,admin:a.admin,isAdmin:Ac.isAdmin(),tracer:tools.includes('btnTraceur'),del:tools.includes('btnDelSite'),vers:tools.includes('btnVersions'),extra:tools.includes('btnExtraWeld'),note:tools.includes('btnConvNote'),exportTab:document.querySelector('#tabbar [data-tab=export]').style.display!=='none'};});
console.log('2a) démo Ethan (admin) :',JSON.stringify(out));C.c2a=out.poste==='chef'&&out.admin&&out.isAdmin&&out.tracer&&out.del&&out.vers&&out.extra&&out.note&&out.exportTab;
await page.selectOption('#roleSel','karim');await page.waitForTimeout(300);
out=await page.evaluate(()=>{const Ac=window.TRACE.acces;const T=window.TRACE;T.renderAll();const tools=[...document.querySelectorAll('#planTools button')].map(b=>b.id);const a=Ac.current();
  return {poste:a.poste,isAdmin:Ac.isAdmin(),tracer:tools.includes('btnTraceur'),del:tools.includes('btnDelSite'),extra:tools.includes('btnExtraWeld'),note:tools.includes('btnConvNote'),exportTab:document.querySelector('#tabbar [data-tab=export]').style.display!=='none',s1:Ac.can('weld.step1'),s2:Ac.can('weld.step2'),ts:Ac.can('ts.qualify')};});
// onglets : sans droit, l'onglet n'existe pas (Ethan 08/10) — soudeur : pas de Phasage, Modifs, Hydro, Stock ; DH, Conversation, QSE oui ; un onglet interdit en cours → retour au plan
out.tabs=await page.evaluate(()=>{const T=window.TRACE;const vis=t=>{const b=document.querySelector('#tabbar [data-tab="'+t+'"]');return !!b&&b.style.display!=='none';};T.state.tab='phasage';T.renderAll();return {phasage:vis('phasage'),ts:vis('ts'),hydro:vis('hydro'),stock:vis('stock'),dh:vis('bouclage'),conv:vis('conv'),qse:vis('qse'),plan:vis('plan'),cur:T.state.tab,allowed:[T.tabAllowed('plan'),T.tabAllowed('phasage'),T.tabAllowed('conv')].join(',')};});
console.log('2b) démo Karim (soudeur) :',JSON.stringify(out));C.c2b=out.poste==='soudeur'&&!out.isAdmin&&!out.tracer&&!out.del&&out.extra&&out.note&&!out.exportTab&&out.s1&&!out.s2&&!out.ts&&!out.tabs.phasage&&!out.tabs.ts&&!out.tabs.hydro&&!out.tabs.stock&&out.tabs.dh&&out.tabs.conv&&out.tabs.qse&&out.tabs.plan&&out.tabs.cur==='plan'&&out.tabs.allowed==='true,false,true';
await page.selectOption('#roleSel','julien');await page.waitForTimeout(200);
out=await page.evaluate(()=>{const T=window.TRACE;const L=Object.values(T.lines)[0];T.openJoint(L.id,'A',1);const sh=document.querySelector('#sheet');return {ok1:!!sh.querySelector('[data-stepph="1"]'),ok2:!!sh.querySelector('[data-stepph="2"]')||/Étape 2|2 · Fils/.test(sh.textContent),hint:/En attente de la soudure/.test(sh.textContent)};});
await page.evaluate(()=>window.TRACE.closeSheet());
console.log('2c) manchonneur : pas l\'étape ① (soudure), mais la ②+ :',JSON.stringify(out));C.c2c=!out.ok1&&out.ok2&&out.hint;
// ── 3) onglet Administrateur (Ethan) : Personnes — création d'un accès intérimaire limité à un chantier, recherche, filtres, ajustement, visiteur, ★
await page.selectOption('#roleSel','ethan');await page.waitForTimeout(200);
await page.evaluate(()=>{window.TRACE.showScreen('home');window.TRACE.renderHome();});await page.waitForTimeout(400);
out=await page.evaluate(()=>({tab:document.querySelector('#htAdmin').style.display!=='none'}));
await page.click('#htAdmin');await page.waitForTimeout(600);
out.view=await page.evaluate(()=>({title:/Administrateur/.test(body()),nav:document.querySelectorAll('#homeBody .admNav button').length,newBtn:!!document.querySelector('#admNew'),bulk:!!document.querySelector('#admBulk'),q:!!document.querySelector('#admQ'),hors:/Hors serveur/.test(body()),nextHidden:!document.querySelector('#homeNext')||document.querySelector('#homeNext').style.display==='none'}));
console.log('3a) onglet ⚙ :',JSON.stringify(out));C.c3a=out.tab&&out.view.title&&out.view.nav===3&&out.view.newBtn&&out.view.bulk&&out.view.q&&out.view.hors&&out.view.nextHidden;
await page.click('#admNew');await page.waitForTimeout(300);
await page.fill('#an-prenom','Mehdi');await page.fill('#an-nom','Interim');await page.fill('#an-email','mehdi.interim@gmail.com');await page.selectOption('#an-poste','soudeur');await page.selectOption('#an-type','interim');await page.waitForTimeout(150);
out=await page.evaluate(()=>{const sites=document.querySelector('#an-sites');const cb=document.querySelector('[data-ansite]');if(cb)cb.click();return {sitesShown:sites&&sites.style.display!=='none',hasSite:!!cb,grouped:document.querySelectorAll('#an-poste optgroup').length};});
await page.click('#an-ok');await page.waitForTimeout(600);
out.after=await page.evaluate(async()=>{const r=await window.TRACE.acces.list();const a=r.rows.find(x=>x.email==='mehdi.interim@gmail.com');const eff=window.TRACE.acces.rights(a);return {n:r.rows.length,a:!!a,type:a&&a.type,poste:a&&a.poste,sites:a&&a.sites&&a.sites.length,local:a&&a.local,s1:eff['weld.step1'],noExport:!eff['export.doe'],noTeam:!eff['team.view'],row:/Mehdi Interim/.test(body()),chip:!!document.querySelector('#homeBody .admAcc .admChip')};});
console.log('3b) accès intérimaire créé :',JSON.stringify(out));C.c3b=out.sitesShown&&out.hasSite&&out.grouped===5&&out.after.a&&out.after.type==='interim'&&out.after.poste==='soudeur'&&out.after.sites===1&&out.after.local&&out.after.s1&&out.after.noExport&&out.after.noTeam&&out.after.row&&out.after.chip;
// deux autres accès pour la recherche / les filtres
for(const [pn,nm,em,po] of [['Julie','MARTIN','julie.martin@scr-soudure.fr','assist_rh'],['Paul','DURAND','paul.durand@scr-soudure.fr','manchonneur']]){await page.click('#admNew');await page.waitForTimeout(200);await page.fill('#an-prenom',pn);await page.fill('#an-nom',nm);await page.fill('#an-email',em);await page.selectOption('#an-poste',po);await page.click('#an-ok');await page.waitForTimeout(400);}
await page.fill('#admQ','mart');await page.waitForTimeout(200);
out=await page.evaluate(()=>({n:document.querySelectorAll('#homeBody .admAcc').length,who:body().includes('Julie MARTIN'),count:document.querySelector('#admCountN').textContent}));
await page.fill('#admQ','');await page.selectOption('#admFam','terrain');await page.waitForTimeout(300);
out.fam=await page.evaluate(()=>({n:document.querySelectorAll('#homeBody .admAcc').length,noJulie:!body().includes('Julie MARTIN'),posteOpts:[...document.querySelectorAll('#admPoste option')].length}));
await page.selectOption('#admPoste','manchonneur');await page.waitForTimeout(300);
out.poste=await page.evaluate(()=>({n:document.querySelectorAll('#homeBody .admAcc').length,paul:body().includes('Paul DURAND')}));
await page.selectOption('#admFam','');await page.waitForTimeout(300);await page.selectOption('#admType','interim');await page.waitForTimeout(300);
out.type=await page.evaluate(()=>({n:document.querySelectorAll('#homeBody .admAcc').length,mehdi:body().includes('Mehdi Interim')}));
await page.selectOption('#admType','');await page.waitForTimeout(300);
console.log('3c) recherche et filtres :',JSON.stringify(out));C.c3c=out.n===1&&out.who&&/1 personne/.test(out.count)&&out.fam.n===2&&out.fam.noJulie&&out.fam.posteOpts===7&&out.poste.n===1&&out.poste.paul&&out.type.n===1&&out.type.mehdi;
// ajustement personnel : donner l'export DOE à Mehdi malgré le plafond, retirer la soudure supplémentaire
out=await page.evaluate(()=>{const rows=[...document.querySelectorAll('#homeBody .admAcc')];const tr=rows.find(r=>/Mehdi/.test(r.textContent));const b=tr&&tr.querySelector('[data-admrights]');if(!b)return {no:true};b.click();return {ok:true};});
await page.waitForTimeout(300);
out.modal=await page.evaluate(()=>{const m=document.getElementById('modal');return {title:/Droits — Mehdi Interim/.test(m.textContent),plaf:/hors plafond/.test(m.textContent),n:m.querySelectorAll('[data-rk]').length};});
await page.evaluate(()=>{const m=document.getElementById('modal');m.querySelector('[data-rk="export.doe"]').checked=true;m.querySelector('[data-rk="weld.extra"]').checked=false;m.querySelector('#ar-ok').click();});await page.waitForTimeout(600);
out.after=await page.evaluate(async()=>{const r=await window.TRACE.acces.list();const a=r.rows.find(x=>x.email==='mehdi.interim@gmail.com');const eff=window.TRACE.acces.rights(a);const Ac=window.TRACE.acces;return {ov:a.rights,exp:eff['export.doe'],extra:eff['weld.extra'],s1:eff['weld.step1'],txt:/ajusté/.test(body()),o1:Ac.origin(a,'export.doe'),o2:Ac.origin(a,'weld.extra'),o3:Ac.origin(a,'weld.step1'),o4:Ac.origin(a,'team.view')};});
console.log('3d) droits ajustés personne par personne :',JSON.stringify(out));C.c3d=out.ok&&out.modal.title&&out.modal.plaf&&out.modal.n===28&&out.after.ov['export.doe']===true&&out.after.ov['weld.extra']===false&&out.after.exp&&!out.after.extra&&out.after.s1&&out.after.txt&&out.after.o1==='perso+'&&out.after.o2==='perso-'&&out.after.o3==='poste'&&out.after.o4==='plafond';
// visiteur (client) : regard seulement ; passage en inactif ; filtre « inactifs »
await page.click('#admNew');await page.waitForTimeout(300);await page.fill('#an-prenom','Client');await page.fill('#an-nom','MOE');await page.fill('#an-email','moe@client.fr');await page.selectOption('#an-poste','visiteur');await page.waitForTimeout(100);
out=await page.evaluate(()=>({type:document.querySelector('#an-type').value}));await page.click('#an-ok');await page.waitForTimeout(500);
out.v=await page.evaluate(async()=>{const r=await window.TRACE.acces.list();const a=r.rows.find(x=>x.email==='moe@client.fr');const eff=window.TRACE.acces.rights(a);const rows=[...document.querySelectorAll('#homeBody .admAcc')];const tr=rows.find(x=>/Client MOE/.test(x.textContent));const cb=tr&&tr.querySelector('[data-adm="active"]');if(cb){cb.checked=false;cb.dispatchEvent(new Event('change'));}return {a:!!a,plan:eff['plan.view'],noSteps:!eff['weld.step1'],noConv:!eff['conv.post'],hadCb:!!cb};});
await page.waitForTimeout(500);
out.after=await page.evaluate(async()=>{const r=await window.TRACE.acces.list();const a=r.rows.find(x=>x.email==='moe@client.fr');const eff=window.TRACE.acces.rights(a);return {active:a.active,plan:eff['plan.view'],inactifChip:/inactif/.test(body())};});
await page.selectOption('#admEtat','inactif');await page.waitForTimeout(300);out.etat=await page.evaluate(()=>({n:document.querySelectorAll('#homeBody .admAcc').length,moe:body().includes('Client MOE')}));await page.selectOption('#admEtat','');await page.waitForTimeout(300);
console.log('3e) visiteur puis inactif :',JSON.stringify(out));C.c3e=out.type==='visiteur'&&out.v.a&&out.v.plan&&out.v.noSteps&&out.v.noConv&&out.v.hadCb&&out.after.active===false&&out.after.plan===false&&out.after.inactifChip&&out.etat.n===1&&out.etat.moe;
// ★ : Julie devient administratrice (confirmation) ; on ne peut pas se désactiver soi-même
out=await page.evaluate(()=>{const rows=[...document.querySelectorAll('#homeBody .admAcc')];const tr=rows.find(r=>/Julie MARTIN/.test(r.textContent));tr.querySelector('[data-admflag]').click();return {modal:/pouvoirs d'administrateur/.test(document.getElementById('modal').textContent)};});
await page.waitForTimeout(200);await page.click('#af-ok');await page.waitForTimeout(500);
out.after=await page.evaluate(async()=>{const r=await window.TRACE.acces.list();const a=r.rows.find(x=>x.email==='julie.martin@scr-soudure.fr');const eff=window.TRACE.acces.rights(a);const rows=[...document.querySelectorAll('#homeBody .admAcc')];const tr=rows.find(x=>/Julie MARTIN/.test(x.textContent));return {admin:a.admin,all:Object.values(eff).every(Boolean),star:tr.querySelector('.admStar').classList.contains('on'),chip:/★ admin/.test(tr.textContent)};});
out.self=await page.evaluate(async()=>{const rows=[...document.querySelectorAll('#homeBody .admAcc')];const me=rows.find(r=>/\bmoi\b/.test(r.textContent));if(!me)return {noMe:true};const cb=me.querySelector('[data-adm="active"]');cb.checked=false;cb.dispatchEvent(new Event('change'));await new Promise(r=>setTimeout(r,300));return {stillChecked:cb.checked,toast:document.querySelector('#toast').textContent};});
console.log('3f) ★ administrateur :',JSON.stringify(out));C.c3f=out.modal&&out.after.admin&&out.after.all&&out.after.star&&out.after.chip&&(out.self.noMe||(out.self.stillChecked&&/propre compte/.test(out.self.toast))); // en démo, le personnage courant n'est pas dans la liste (pas de carte « moi ») : le garde-fou est vérifié dans e2e_login (profil serveur)
// ── 4) vue POSTES : par poste (chips par famille, cases) — donner le stock aux soudeurs → Karim (démo) l'a ; écart ≠ SCR ; tableau complet cliquable ; retour aux défauts
await page.evaluate(()=>[...document.querySelectorAll('#homeBody [data-av]')].find(b=>b.dataset.av==='postes').click());await page.waitForTimeout(300);
out=await page.evaluate(()=>({chips:document.querySelectorAll('#homeBody .pchip').length,fams:document.querySelectorAll('#homeBody .admFam').length,sel:document.querySelector('#homeBody .pchip.on').textContent.trim(),perms:document.querySelectorAll('#homeBody [data-pr]').length,stockOff:!document.querySelector('#homeBody [data-pr="stock.edit"]').checked,noReset:!document.querySelector('#admPReset')}));
await page.evaluate(()=>{const cb=document.querySelector('#homeBody [data-pr="stock.edit"]');cb.checked=true;cb.dispatchEvent(new Event('change'));});await page.waitForTimeout(400);
out.after=await page.evaluate(()=>({diff:/1 écart/.test(body()),chip:/≠ SCR : non/.test(body()),reset:!!document.querySelector('#admPReset'),dot:!!document.querySelector('#homeBody .pchip.on i'),stored:JSON.parse(localStorage.getItem('trace:posteRights')||'{}').soudeur}));
await page.selectOption('#roleSel','karim');await page.waitForTimeout(200);out.karim=await page.evaluate(()=>window.TRACE.acces.can('stock.edit'));await page.selectOption('#roleSel','ethan');await page.waitForTimeout(200);
await page.evaluate(()=>[...document.querySelectorAll('#homeBody [data-pv]')].find(b=>b.dataset.pv==='table').click());await page.waitForTimeout(300);
out.table=await page.evaluate(()=>{const td=document.querySelector('#homeBody td[data-mx="soudeur|stock.edit"]');const cols=document.querySelectorAll('#homeBody .admMx thead th').length;return {cols,on:td.classList.contains('on'),mod:td.classList.contains('mod'),cells:document.querySelectorAll('#homeBody td.mxc').length,sticky:getComputedStyle(document.querySelector('#homeBody th.mxl')).position};});
await page.evaluate(()=>document.querySelector('#homeBody td[data-mx="soudeur|stock.edit"]').click());await page.waitForTimeout(400);
out.table2=await page.evaluate(()=>{const td=document.querySelector('#homeBody td[data-mx="soudeur|stock.edit"]');return {on:td.classList.contains('on'),mod:td.classList.contains('mod'),stored:JSON.parse(localStorage.getItem('trace:posteRights')||'{}').soudeur};});
await page.evaluate(()=>document.querySelector('#homeBody td[data-mx="manchonneur|weld.step1"]').click());await page.waitForTimeout(400);
await page.evaluate(()=>[...document.querySelectorAll('#homeBody [data-pv]')].find(b=>b.dataset.pv==='list').click());await page.waitForTimeout(200);
await page.evaluate(()=>[...document.querySelectorAll('#homeBody [data-pp]')].find(b=>b.dataset.pp==='manchonneur').click());await page.waitForTimeout(300);
out.man=await page.evaluate(()=>({s1:document.querySelector('#homeBody [data-pr="weld.step1"]').checked,reset:!!document.querySelector('#admPReset'),title:/Manchonneur/.test(document.querySelector('#homeBody .admPoste h3').textContent)}));
await page.click('#admPReset');await page.waitForTimeout(400);
out.man2=await page.evaluate(()=>({s1:document.querySelector('#homeBody [data-pr="weld.step1"]').checked,reset:!!document.querySelector('#admPReset'),stored:JSON.parse(localStorage.getItem('trace:posteRights')||'{}')}));
console.log('4) vue Postes :',JSON.stringify(out));C.c4=out.chips===22&&out.fams===5&&/Soudeur/.test(out.sel)&&out.perms===28&&out.stockOff&&out.noReset&&out.after.diff&&out.after.chip&&out.after.reset&&out.after.dot&&out.after.stored&&out.after.stored['stock.edit']===true&&out.karim===true&&out.table.cols===25&&out.table.on&&out.table.mod&&out.table.cells===28*22+14&&out.table.sticky==='sticky'&&!out.table2.on&&!out.table2.mod&&out.table2.stored===undefined&&out.man.s1&&out.man.reset&&out.man.title&&!out.man2.s1&&!out.man2.reset&&!out.man2.stored.manchonneur;
// ── 5) vue QUI PEUT QUOI : « supprimer un chantier » → administrateurs et postes de direction ; Mehdi ne l'a pas ; chip de poste → vue Postes
await page.evaluate(()=>[...document.querySelectorAll('#homeBody [data-av]')].find(b=>b.dataset.av==='who').click());await page.waitForTimeout(300);
out=await page.evaluate(()=>{const t=body();const sel=document.querySelector('#admWho');return {val:sel.value,postes:document.querySelectorAll('#homeBody [data-ppgo]').length,julie:/Julie MARTIN/.test(t)&&/★ administrateur/.test(t),mehdiNot:t.indexOf('Mehdi Interim')>t.indexOf("Ne l'ont pas"),sections:(t.match(/Postes qui l'ont|Personnes qui l'ont|Ne l'ont pas/g)||[]).length};});
await page.selectOption('#admWho','export.doe');await page.waitForTimeout(300);
out.exp=await page.evaluate(()=>{const t=body();return {mehdiHas:t.indexOf('Mehdi Interim')<t.indexOf("Ne l'ont pas")&&/ajout personnel/.test(t)};});
await page.evaluate(()=>document.querySelector('#homeBody [data-ppgo]').click());await page.waitForTimeout(300);
out.go=await page.evaluate(()=>({postes:!!document.querySelector('#homeBody .admPoste'),nav:document.querySelector('#homeBody .admNav button.on').dataset.av}));
console.log('5) qui peut quoi :',JSON.stringify(out));C.c5=out.val==='site.delete'&&out.postes>=5&&out.julie&&out.mehdiNot&&out.sections===3&&out.exp.mehdiHas&&out.go.postes&&out.go.nav==='postes';
// ── 6) plusieurs accès d'un coup : liste collée (séparateurs mélangés, poste reconnu, intérimaire), aperçu corrigeable, création
await page.evaluate(()=>[...document.querySelectorAll('#homeBody [data-av]')].find(b=>b.dataset.av==='people').click());await page.waitForTimeout(300);
await page.click('#admBulk');await page.waitForTimeout(200);
await page.fill('#ab-txt',"Karim BENALI ; karim.benali@scr-soudure.fr ; soudeur\nSophie Durand\tsophie.durand@scr-soudure.fr\tResponsable administrative et financière\nMarc DUPONT, marc.dupont@gmail.com, manchonneur, intérimaire\nBidule sans mail ; chef de chantier\nNadia K. ; nadia@scr-soudure.fr ; poste bizarre");
await page.click('#ab-parse');await page.waitForTimeout(300);
out=await page.evaluate(()=>{const rows=[...document.querySelectorAll('#ab-prev .abRow')];const g=(i,k)=>rows[i].querySelector(`[data-ab="${k}"]`).value;return {n:rows.length,p0:g(0,'poste')+'/'+g(0,'prenom')+'/'+g(0,'nom'),p1:g(1,'poste')+'/'+g(1,'type'),p2:g(2,'poste')+'/'+g(2,'type')+'/'+g(2,'nom'),p3:g(3,'email'),p4:g(4,'poste'),ko:document.querySelectorAll('#ab-prev .abRow.ko').length,warn:/poste non reconnu/.test(document.querySelector('#ab-prev').textContent)};});
await page.evaluate(()=>{const rows=[...document.querySelectorAll('#ab-prev .abRow')];const s=rows[4].querySelector('[data-ab="poste"]');s.value='chef';s.dispatchEvent(new Event('change'));});
await page.click('#ab-ok');await page.waitForTimeout(800);
out.after=await page.evaluate(async()=>{const r=await window.TRACE.acces.list();const by=e=>r.rows.find(x=>x.email===e);return {err:document.querySelector('#ab-err')?document.querySelector('#ab-err').textContent:'',karim:!!by('karim.benali@scr-soudure.fr'),sophie:by('sophie.durand@scr-soudure.fr')&&by('sophie.durand@scr-soudure.fr').poste,marc:by('marc.dupont@gmail.com')&&by('marc.dupont@gmail.com').type,nadia:by('nadia@scr-soudure.fr')&&by('nadia@scr-soudure.fr').poste,n:r.rows.length};});
console.log('6) plusieurs d\'un coup :',JSON.stringify(out));C.c6=out.n===5&&out.p0==='soudeur/Karim/BENALI'&&out.p1==='resp_admin_fin/salarie'&&out.p2==='manchonneur/interim/DUPONT'&&out.p3===''&&out.p4===''&&out.ko===1&&out.warn&&/1 refusé/.test(out.after.err)&&out.after.karim&&out.after.sophie==='resp_admin_fin'&&out.after.marc==='interim'&&out.after.nadia==='chef'&&out.after.n===8;
await page.evaluate(()=>document.getElementById('modal').classList.remove('show'));
// ── 7) un non-administrateur (Sophie, ex-bureau → chargée d'affaires) ne voit pas l'onglet ⚙ ; l'onglet n'est jamais mémorisé
await page.selectOption('#roleSel','sophie');await page.waitForTimeout(200);await page.evaluate(()=>window.TRACE.renderHome());await page.waitForTimeout(300);
out=await page.evaluate(()=>({tab:document.querySelector('#htAdmin').style.display==='none',body:!/Créer un accès/.test(body()),homeTab:window.TRACE.state.homeTab,saved:localStorage.getItem('trace:homeTab'),poste:window.TRACE.acces.current().poste}));
console.log('7) chargée d\'affaires : pas d\'onglet administrateur :',JSON.stringify(out));C.c7=out.tab&&out.body&&out.homeTab!=='admin'&&out.saved!=='admin'&&out.poste==='charge_affaires';
// ── 8) écran de connexion : validations sans serveur, numéro de version
await page.evaluate(()=>window.TRACE.showScreen('login'));await page.waitForTimeout(200);
out=await page.evaluate(()=>({pwd:!!document.querySelector('#loginPwd'),go:document.querySelector('#loginGo').textContent,first:!!document.querySelector('#loginFirst'),otp:!!document.querySelector('#loginOtp'),ver:/version \d{2}\/\d{2}\/\d{4}/.test(document.querySelector('#loginVer').textContent)}));
await page.fill('#loginEmail','pas-une-adresse');await page.click('#loginGo');await page.waitForTimeout(200);out.bad=await page.evaluate(()=>document.querySelector('#loginHint').textContent);
await page.fill('#loginEmail','karim@scr.fr');await page.fill('#loginPwd','');await page.click('#loginGo');await page.waitForTimeout(200);out.noPwd=await page.evaluate(()=>document.querySelector('#loginHint').textContent);
await page.fill('#loginPwd','abc');await page.click('#loginFirst');await page.waitForTimeout(200);out.short=await page.evaluate(()=>document.querySelector('#loginHint').textContent);
console.log('8) écran de connexion :',JSON.stringify(out));C.c8=out.pwd&&/Se connecter/.test(out.go)&&out.first&&out.otp&&out.ver&&/invalide/.test(out.bad)&&/Mot de passe manquant/.test(out.noPwd)&&/6 caractères/.test(out.short);
// ── 9) affichage large depuis l'accueil : bouton ⤢, mémorisé, liste en grille ; retour
await page.evaluate(()=>{window.TRACE.showScreen('home');window.TRACE.renderHome();});await page.waitForTimeout(200);
out=await page.evaluate(()=>({btn:!!document.querySelector('#homeWide'),wide0:document.querySelector('#app').classList.contains('wide')}));
await page.click('#homeWide');await page.waitForTimeout(300);
out.on=await page.evaluate(()=>({wide:document.querySelector('#app').classList.contains('wide'),saved:localStorage.getItem('trace:wide'),w:document.querySelector('#app').getBoundingClientRect().width}));
await page.selectOption('#roleSel','ethan');await page.waitForTimeout(200);await page.evaluate(()=>window.TRACE.renderHome());await page.waitForTimeout(200);await page.click('#htAdmin');await page.waitForTimeout(600);
out.grid=await page.evaluate(()=>getComputedStyle(document.querySelector('#admList')).display);
await page.reload();await page.waitForTimeout(1500);
out.reload=await page.evaluate(()=>document.querySelector('#app').classList.contains('wide'));
await page.evaluate(()=>{window.TRACE.showScreen('home');window.TRACE.renderHome();});await page.waitForTimeout(200);await page.click('#homeWide');await page.waitForTimeout(200);
out.off=await page.evaluate(()=>({wide:document.querySelector('#app').classList.contains('wide'),saved:localStorage.getItem('trace:wide')}));
console.log('9) affichage large depuis l\'accueil :',JSON.stringify(out));C.c9=out.btn&&!out.wide0&&out.on.wide&&out.on.saved==='1'&&out.on.w>900&&out.grid==='grid'&&out.reload&&!out.off.wide&&out.off.saved==='0';
// ── 10) tout est gardé sur l'appareil après rechargement (démo) : comptes, ajustements, ★
out=await page.evaluate(async()=>{const r=await window.TRACE.acces.list();return {n:r.rows.length,mehdi:r.rows.some(x=>x.email==='mehdi.interim@gmail.com'&&x.rights&&x.rights['export.doe']===true),julieAdmin:r.rows.some(x=>x.email==='julie.martin@scr-soudure.fr'&&x.admin),moeOff:r.rows.some(x=>x.email==='moe@client.fr'&&!x.active)};});
console.log('10) après rechargement :',JSON.stringify(out));C.c10=out.n===8&&out.mehdi&&out.julieAdmin&&out.moeOff;
// ── 11) droits appliqués (09/10, plus de « prévus ◌ ») : écarts de poste posés sur l'appareil (miroir trace:posteRights) → soudeur sans dh.measure / qse.sign, chef sans team.view
const SID11=await page.evaluate(()=>window.TRACE.state.siteId||localStorage.getItem('trace:lastSite'));
await page.evaluate(()=>{localStorage.setItem('trace:posteRights',JSON.stringify({soudeur:{'dh.measure':false,'qse.sign':false},charge_affaires:{'team.view':false}}));}); /* Ethan L. (démo) est administrateur → tous les droits ; Sophie M. = chargée d'affaires */
await page.reload();await page.waitForTimeout(1200);
for(let i=0;i<6;i++){await page.evaluate(id=>window.TRACE.go(id),SID11);try{await page.waitForFunction(()=>window.TRACE.state.siteId&&window.TRACE.state.screen==='site'&&Object.keys(window.TRACE.lines).length>0,null,{timeout:4000});break;}catch(e){}}
await page.selectOption('#roleSel','ethan');await page.waitForTimeout(200);
out=await page.evaluate(()=>{const T=window.TRACE;const L=Object.values(T.lines)[0];const cd=L.cond.A;const i=cd.els.findIndex(e=>e.kind==='endcap'||e.kind==='endpoint');const r={pending:T.acces.PERMS.length,ei:i};if(i>=0){T.openEl(L.id,'A',i);r.dhBtnsChef=document.querySelectorAll('#sheet [data-dhend]').length;}
  return r;});
await page.selectOption('#roleSel','sophie');await page.waitForTimeout(200);
out.s=await page.evaluate(()=>{const T=window.TRACE;T.state.tab='conv';T.renderAll();const tk=document.querySelector('#cvTask');if(tk&&!tk.checked)tk.click();return {to:document.querySelector('#cvTo')?document.querySelectorAll('#cvTo option').length:null,team:T.acces.can('team.view'),task:T.acces.can('conv.task')};});
await page.selectOption('#roleSel','karim');await page.waitForTimeout(200);
out.k=await page.evaluate(()=>{const T=window.TRACE;const L=Object.values(T.lines)[0];const cd=L.cond.A;const i=cd.els.findIndex(e=>e.kind==='endcap'||e.kind==='endpoint');const r={dh:T.acces.can('dh.measure'),qse:T.acces.can('qse.sign'),qseTab:T.tabAllowed('qse'),dhTab:T.tabAllowed('bouclage'),plan:T.acces.can('plan.view'),todo:T.qseTodo().length};if(i>=0){T.openEl(L.id,'A',i);r.dhBtns=document.querySelectorAll('#sheet [data-dhend]').length;}return r;});
await page.evaluate(()=>localStorage.removeItem('trace:posteRights'));
console.log('11) droits appliqués :',JSON.stringify(out));C.c11=out.ei>=0&&out.dhBtnsChef===3&&out.s.task&&out.s.to===1&&out.s.team===false&&out.k.dh===false&&out.k.qse===false&&out.k.qseTab===false&&out.k.dhTab===false&&out.k.plan===true&&out.k.todo===0&&out.k.dhBtns===0;
const bad=Object.entries(C).filter(([k,v])=>!v).map(([k])=>k);console.log(bad.length?'RESULTAT: ECHEC '+bad.join(','):'RESULTAT: TOUT VERT');console.log(logs.length?logs:'[]');
await browser.close();
