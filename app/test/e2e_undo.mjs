// GARDE-FOU DES ANNULATIONS (Ethan 08/10 : « un intérimaire ne peut pas supprimer une étape sans validation de son chef ; nos gars peuvent supprimer une erreur
// mais pas 20 soudures : X suppressions par opérateur, au-delà alerte et le chef valide ou redonne des crédits »). Démo hors connexion :
// Karim (soudeur, 3 crédits / semaine) annule ses propres étapes, puis doit DEMANDER ; Ethan (chef) voit la demande dans la conversation (badge), valide / refuse / redonne un crédit ;
// l'intérimaire est à 0 ; le chef est illimité ; les crédits d'un poste se règlent dans l'onglet Administrateur.
import { chromium } from 'playwright';
const BASE=process.env.BASE||'http://localhost:8765';
const PNG='data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAAAAAA6fptVAAAACklEQVR4nGNgAAAAAgABSK+kcQAAAABJRU5ErkJggg==';
const browser=await chromium.launch({headless:true, executablePath: process.env.CHROMIUM_PATH||undefined});
const ctx=await browser.newContext({viewport:{width:1000,height:940}});const page=await ctx.newPage();
const logs=[];page.on('pageerror',e=>logs.push('PAGEERROR: '+e.message.slice(0,300)));page.on('console',m=>{if(m.type()==='error'&&!/supabase|Failed to fetch|net::ERR|404/i.test(m.text()))logs.push(m.text().slice(0,200));});
let dialogs=[];page.on('dialog',d=>{dialogs.push(d.type()+':'+d.message().slice(0,60));d.accept(d.defaultValue()).catch(()=>{});}); // prompt : on garde le texte proposé
const C={};
await page.goto(BASE+'/traceur.html');await page.waitForTimeout(500);
await page.evaluate(()=>{localStorage.clear();});await page.reload();await page.waitForTimeout(500);
await page.evaluate(()=>{const S=window.MAQ.state;S.supplier='RENALIA';S.lines=[{id:'L1',name:'Rue de la Gare',dn:150,bar:12,pts:[[10,50],[130,50]],specials:[],parent:null}];S.seq=2;window.MAQ.setMode('select');window.MAQ.rebuild();});
await page.click('#bSave');await page.waitForTimeout(200);await page.fill('#svName','Annulations test');await page.click('#svOk');await page.waitForTimeout(700);await page.click('#svGo');await page.waitForTimeout(1500);
await page.waitForFunction(()=>window.TRACE&&/^trc_/.test(window.TRACE.state.siteId)&&window.TRACE.state.screen==='site'&&Object.keys(window.TRACE.lines).length>0,{timeout:20000});await page.waitForTimeout(300); // sous charge, l'ouverture du chantier peut dépasser 1,5 s
// données : étapes ① faites par Karim sur les soudures 0..6 ; sur la 5, Julien a fait ②③
await page.evaluate((PNG)=>{const T=window.TRACE;const L=Object.values(T.lines)[0];const d=h=>new Date(Date.now()-h*3600e3).toISOString();
  L.cond.A.joints.forEach((j,i)=>{if(i>6)return;j.steps={1:{done:true,by:'Karim B.',at:d(20-i),photos:[PNG],proc:'tig'}};j.status='soudee';j.events=[{type:'soudee',by:'karim',at:d(20-i),data:{procede:'tig'},photos:[PNG]}];
    if(i===5){j.steps[2]={done:true,by:'Julien R.',at:d(10),photos:[PNG]};j.steps[3]={done:true,by:'Julien R.',at:d(9),photos:[PNG],type:'retracte',press:true};j.status='manchonnee';j.wire='raccorde';j.events.push({type:'manchonnee',by:'julien',at:d(9),data:{manchon:'retracte',etanch:true},photos:[PNG]});}});
  T.renderAll();},PNG);
const L=await page.evaluate(()=>Object.values(window.TRACE.lines)[0].id);
const open=async i=>{await page.evaluate(({L,i})=>{window.TRACE.closeSheet();window.TRACE.openJoint(L,'A',i);document.querySelectorAll('#sheet details').forEach(d=>d.open=true);},{L,i});await page.waitForTimeout(250);};
const sheet=()=>page.evaluate(()=>{const sh=document.querySelector('#sheet');return {undo:[...sh.querySelectorAll('[data-stepundo]')].map(b=>b.dataset.stepundo+':'+b.textContent.replace(/\s+/g,' ').trim().slice(0,90)),ask:[...sh.querySelectorAll('[data-stepask]')].map(b=>b.dataset.stepask+':'+b.textContent.replace(/\s+/g,' ').trim().slice(0,90)),pend:/demandée au chef/.test(sh.textContent)};});
// ── 1) le modèle des crédits
let out=await page.evaluate(()=>{const Ac=window.TRACE.acces;const R=o=>{const v=Ac.credits(Ac.norm({type:'salarie',rights:{},active:true,...o}));return v===Infinity?'inf':v;};
  return {sou:R({poste:'soudeur'}),man:R({poste:'manchonneur'}),act:R({poste:'activites_specifiques'}),inter:R({poste:'soudeur',type:'interim'}),interPerso:R({poste:'soudeur',type:'interim',rights:{'undo.credits':2}}),chef:R({poste:'chef'}),adm:R({poste:'soudeur',admin:true}),vis:R({poste:'visiteur'}),rh:R({poste:'resp_rh'}),ownSou:Ac.rights(Ac.norm({poste:'soudeur'}))['undo.own'],valSou:Ac.rights(Ac.norm({poste:'soudeur'}))['undo.validate'],valChef:Ac.rights(Ac.norm({poste:'chef'}))['undo.validate'],ownInter:Ac.rights(Ac.norm({poste:'soudeur',type:'interim'}))['undo.own']};});
console.log('1) crédits :',JSON.stringify(out));C.c1=out.sou===3&&out.man===3&&out.act===3&&out.inter===0&&out.interPerso===2&&out.chef==='inf'&&out.adm==='inf'&&out.vis===0&&out.rh===0&&out.ownSou&&!out.valSou&&out.valChef&&out.ownInter;
// ── 2) Karim : annule ses 3 premières étapes ① (crédits 3 → 0), compteur sur le bouton, journal, événement « annulation » dans la fiche
await page.selectOption('#roleSel','karim');await page.waitForTimeout(300);
await open(0);out=await sheet();out.left0=await page.evaluate(()=>window.TRACE.undo.left());
await page.evaluate(()=>document.querySelector('#sheet [data-stepundo="1"]').click());await page.waitForTimeout(400);
out.after1=await page.evaluate(({L})=>{const j=window.TRACE.lines[L].cond.A.joints[0];return {d1:!!(j.steps[1]&&j.steps[1].done),status:j.status,ev:(j.events||[]).some(e=>e.type==='annulation'),left:window.TRACE.undo.left(),log:window.TRACE.undo.log().length,hist:/Étape 1 annulée/.test(document.querySelector('#sheet').textContent)};},{L});
for(const i of [1,2]){await open(i);await page.evaluate(()=>document.querySelector('#sheet [data-stepundo="1"]').click());await page.waitForTimeout(300);}
out.after3=await page.evaluate(()=>({left:window.TRACE.undo.left(),used:window.TRACE.undo.used('Karim B.'),log:window.TRACE.undo.log().length,dialogs:0}));out.dialogs=dialogs.filter(d=>/^confirm/.test(d)).length;
console.log('2) Karim annule 3 fois :',JSON.stringify(out));C.c2=out.undo.length===1&&/3 crédits restants/.test(out.undo[0])&&out.ask.length===0&&out.left0===3&&!out.after1.d1&&out.after1.status==='a_souder'&&out.after1.ev&&out.after1.left===2&&out.after1.log===1&&out.after1.hist&&out.after3.left===0&&out.after3.used===3&&out.after3.log===3&&out.dialogs===3;
// ── 3) plus de crédit : la fiche propose « Demander l'annulation au chef » → demande dans la conversation, étape en place, fiche « en attente »
await open(3);out=await sheet();
await page.evaluate(()=>document.querySelector('#sheet [data-stepask="1"]').click());await page.waitForTimeout(400);
out.after=await page.evaluate(({L})=>{const j=window.TRACE.lines[L].cond.A.joints[3];const C=window.TRACE.net.conv;const m=C.msgs.find(x=>x.kind==='undo');return {d1:!!(j.steps[1]&&j.steps[1].done),msg:!!m,st:m&&m.undo.status,what:m&&m.undo.what,n:m&&m.undo.n,weld:m&&m.undo.weldId===j.weldId,limit:m&&m.undo.limit,by:m&&m.by,text:m&&m.text,pend:!!window.TRACE.undo.pending(j.weldId,1),sheetPend:/demandée au chef/.test(document.querySelector('#sheet').textContent),noBtn:!document.querySelector('#sheet [data-stepask="1"]')&&!document.querySelector('#sheet [data-stepundo="1"]')};},{L});
out.prompt=dialogs.some(d=>/^prompt:Pourquoi annuler/.test(d));
console.log('3) demande au chef :',JSON.stringify(out));C.c3=out.undo.length===0&&out.ask.length===1&&/plus de crédit/.test(out.ask[0])&&out.after.d1&&out.after.msg&&out.after.st==='pending'&&out.after.what==='etape'&&out.after.n===1&&out.after.weld&&out.after.limit===true&&out.after.by==='Karim B.'&&out.after.text==='erreur de saisie'&&out.after.pend&&out.after.sheetPend&&out.after.noBtn&&out.prompt;
// ── 4) l'étape ③ de Julien sur la soudure 5 : Karim ne peut que demander (« saisie de Julien R. ») ; Julien, lui, l'annule direct (ses crédits)
await open(5);out=await sheet();
await page.selectOption('#roleSel','julien');await page.waitForTimeout(300);await open(5);out.julien=await sheet();out.julienLeft=await page.evaluate(()=>window.TRACE.undo.left());
console.log('4) saisie d\'un autre :',JSON.stringify(out));C.c4=out.ask.some(a=>/^3:/.test(a)&&/saisie de Julien R\./.test(a))&&out.undo.length===0&&out.julien.undo.some(a=>/^3:/.test(a)&&/3 crédits restants/.test(a))&&out.julienLeft===3;
// ── 5) Ethan (chef) : badge sur l'onglet Conversation, filtre « 🛡 Annulations · 1 à valider », encart ; « ✓ Valider » annule l'étape ① de la soudure 3 et clôt la demande
await page.selectOption('#roleSel','ethan');await page.waitForTimeout(300);
out=await page.evaluate(()=>{const T=window.TRACE;T.closeSheet();T.state.tab='conv';T.renderAll();const v=document.querySelector('#convview');const badge=document.querySelector('#tabbar [data-tab="conv"] .qseBadge');return {badge:badge?badge.textContent:null,chip:/Annulations/.test(v.textContent)&&/1 à valider/.test(v.textContent),alert:/attend ta validation/.test(v.textContent)&&/Karim B\./.test(v.textContent),card:!!v.querySelector('.cvMsg.undo'),btns:[...v.querySelectorAll('[data-cvundo]')].map(b=>b.dataset.cvact).join(','),left:T.undo.left()===Infinity?'inf':T.undo.left()};});
await page.evaluate(()=>document.querySelector('#convview [data-cvundo][data-cvact="ok"]').click());await page.waitForTimeout(500);
out.after=await page.evaluate(({L})=>{const T=window.TRACE;const j=T.lines[L].cond.A.joints[3];const m=T.net.conv.msgs.find(x=>x.kind==='undo');const log=T.undo.log();const last=log[log.length-1];const badge=document.querySelector('#tabbar [data-tab="conv"] .qseBadge');return {d1:!!(j.steps[1]&&j.steps[1].done),status:j.status,st:m.undo.status,by:m.undo.decidedBy,log:log.length,mode:last.mode,lastBy:last.by,val:last.validatedBy,badge:badge?badge.textContent:null,txt:/validée et exécutée/.test(document.querySelector('#convview').textContent),toast:document.querySelector('#toast').textContent};},{L});
console.log('5) le chef valide :',JSON.stringify(out));C.c5=out.badge==='1'&&out.chip&&out.alert&&out.card&&out.btns==='ok,credit,no'&&out.left==='inf'&&!out.after.d1&&out.after.status==='a_souder'&&out.after.st==='done'&&out.after.by==='Ethan L.'&&out.after.log===4&&out.after.mode==='valide'&&out.after.lastBy==='Karim B.'&&out.after.val==='Ethan L.'&&out.after.badge===null&&out.after.txt&&/validée/.test(out.after.toast);
// ── 6) nouvelle demande (soudure 4) → le chef REDONNE 1 crédit : message « crédits », demande clôturée, Karim peut annuler lui-même (1 crédit) ; puis une demande REFUSÉE (soudure 6)
await page.selectOption('#roleSel','karim');await page.waitForTimeout(300);await open(4);await page.evaluate(()=>document.querySelector('#sheet [data-stepask="1"]').click());await page.waitForTimeout(300);
await page.selectOption('#roleSel','ethan');await page.waitForTimeout(300);await page.evaluate(()=>{const T=window.TRACE;T.closeSheet();T.state.tab='conv';T.renderAll();document.querySelector('#convview [data-cvundo][data-cvact="credit"]').click();});await page.waitForTimeout(400);
out=await page.evaluate(()=>{const C=window.TRACE.net.conv;const cr=C.msgs.find(x=>x.kind==='credit');const req=C.msgs.filter(x=>x.kind==='undo')[1];return {credit:!!cr,to:cr&&cr.credit.to,n:cr&&cr.credit.n,st:req&&req.undo.status,card:!!document.querySelector('#convview .cvMsg.credit'),pendings:C.msgs.filter(x=>x.kind==='undo'&&x.undo.status==='pending').length};});
await page.selectOption('#roleSel','karim');await page.waitForTimeout(300);out.karimLeft=await page.evaluate(()=>window.TRACE.undo.left());await open(4);out.karim=await sheet();
await open(6);await page.evaluate(()=>document.querySelector('#sheet [data-stepask="1"]')?document.querySelector('#sheet [data-stepask="1"]').click():document.querySelector('#sheet [data-stepundo="1"]').click());await page.waitForTimeout(300);
out.sixth=await page.evaluate(({L})=>{const T=window.TRACE;const j=T.lines[L].cond.A.joints[6];return {d1:!!(j.steps[1]&&j.steps[1].done),left:T.undo.left(),pend:!!T.undo.pending(j.weldId,1)};},{L});
console.log('6) crédit redonné :',JSON.stringify(out));C.c6=out.credit&&out.to==='Karim B.'&&out.n===1&&out.st==='credited'&&out.card&&out.pendings===0&&out.karimLeft===1&&out.karim.undo.some(a=>/^1:/.test(a)&&/1 crédit restant/.test(a))&&!out.sixth.d1&&out.sixth.left===0&&!out.sixth.pend;
// refus
await open(0);await page.evaluate(({L})=>{const T=window.TRACE;const j=T.lines[L].cond.A.joints[0];j.steps={1:{done:true,by:'Karim B.',at:new Date().toISOString(),photos:[],proc:'tig'}};j.status='soudee';T.renderAll();},{L});await open(0);
await page.evaluate(()=>document.querySelector('#sheet [data-stepask="1"]').click());await page.waitForTimeout(300);
await page.selectOption('#roleSel','ethan');await page.waitForTimeout(300);await page.evaluate(()=>{const T=window.TRACE;T.closeSheet();T.state.tab='conv';T.renderAll();document.querySelector('#convview [data-cvundo][data-cvact="no"]').click();});await page.waitForTimeout(400);
out=await page.evaluate(({L})=>{const T=window.TRACE;const j=T.lines[L].cond.A.joints[0];const m=T.net.conv.msgs.filter(x=>x.kind==='undo').pop();return {st:m.undo.status,d1:!!(j.steps[1]&&j.steps[1].done),txt:/refusée/.test(document.querySelector('#convview').textContent),badge:!document.querySelector('#tabbar [data-tab="conv"] .qseBadge')};},{L});
await page.selectOption('#roleSel','karim');await page.waitForTimeout(300);await open(0);out.karim=await sheet();
console.log('7) refus :',JSON.stringify(out));C.c7=out.st==='refused'&&out.d1&&out.txt&&out.badge&&out.karim.ask.length===1&&!out.karim.pend;
// ── 8) Administrateur : crédits du poste Soudeur 3 → 5 (fiche du poste), Karim passe à 2 restants ; tableau : ligne « Crédits / semaine » ; retour au défaut
await page.selectOption('#roleSel','ethan');await page.waitForTimeout(200);
await page.evaluate(()=>{window.TRACE.showScreen('home');window.TRACE.state.homeTab='admin';window.TRACE.renderHome();});await page.waitForTimeout(600);
await page.evaluate(()=>[...document.querySelectorAll('#homeBody [data-av]')].find(b=>b.dataset.av==='postes').click());await page.waitForTimeout(300);
out=await page.evaluate(()=>({v:document.querySelector('#homeBody [data-pcred]').value,txt:/Crédits d'annulation par semaine/.test(document.querySelector('#homeBody').textContent)}));
await page.evaluate(()=>{const i=document.querySelector('#homeBody [data-pcred]');i.value='5';i.dispatchEvent(new Event('change'));});await page.waitForTimeout(400);
out.after=await page.evaluate(()=>({v:document.querySelector('#homeBody [data-pcred]').value,chip:/≠ SCR : 3/.test(document.querySelector('#homeBody').textContent),stored:JSON.parse(localStorage.getItem('trace:posteRights')||'{}').soudeur}));
await page.selectOption('#roleSel','karim');await page.waitForTimeout(200);out.karimLeft=await page.evaluate(()=>window.TRACE.undo.left());await page.selectOption('#roleSel','ethan');await page.waitForTimeout(200);
await page.evaluate(()=>window.TRACE.renderHome());await page.waitForTimeout(400);await page.evaluate(()=>[...document.querySelectorAll('#homeBody [data-pv]')].find(b=>b.dataset.pv==='table').click());await page.waitForTimeout(300);
out.table=await page.evaluate(()=>{const td=document.querySelector('#homeBody td[data-mxc="soudeur"]');return {v:td&&td.textContent,mod:td&&td.classList.contains('mod'),inf:[...document.querySelectorAll('#homeBody tr:last-child td.mxcap')].some(t=>t.textContent==='∞'),row:/Crédits \/ semaine/.test(document.querySelector('#homeBody .admMx').textContent)};});
await page.evaluate(()=>document.querySelector('#homeBody td[data-mxc="soudeur"]').click());await page.waitForTimeout(200);await page.click('#mc-def');await page.waitForTimeout(400);
out.reset=await page.evaluate(()=>({v:document.querySelector('#homeBody td[data-mxc="soudeur"]').textContent,stored:JSON.parse(localStorage.getItem('trace:posteRights')||'{}').soudeur}));
console.log('8) crédits du poste :',JSON.stringify(out));C.c8=out.v==='3'&&out.txt&&out.after.v==='5'&&out.after.chip&&out.after.stored&&out.after.stored['undo.credits']===5&&out.karimLeft===2&&out.table.v==='5'&&out.table.mod&&out.table.inf&&out.table.row&&out.reset.v==='3'&&out.reset.stored===undefined;
// ── 9) tout tient au rechargement (journal, demandes, crédits)
const siteId=await page.evaluate(()=>window.TRACE.state.siteId);await page.reload();await page.waitForTimeout(1500);await page.evaluate(id=>window.TRACE.go(id),siteId);await page.waitForTimeout(2500);
out=await page.evaluate(()=>{const T=window.TRACE;const C=T.net&&T.net.conv;return {log:T.undo.log().length,undo:C?C.msgs.filter(m=>m.kind==='undo').length:0,credit:C?C.msgs.filter(m=>m.kind==='credit').length:0};});
console.log('9) rechargement :',JSON.stringify(out));C.c9=out.log===5&&out.undo===3&&out.credit===1;
const bad=Object.entries(C).filter(([k,v])=>!v).map(([k])=>k);console.log(bad.length?'RESULTAT: ECHEC '+bad.join(','):'RESULTAT: TOUT VERT');console.log(logs.length?logs:'[]');
await browser.close();
