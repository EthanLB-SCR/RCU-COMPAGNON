// RACCOURCI RAPIDE (Ethan 12/10) : « à partir de l'onglet planning créer un profil — vendredi, nouvel intérimaire : nom, prénom, poste, agence, e-mail en option —
// juste pour le placer dans le planning ; puis ça envoie à un administrateur de créer ou finaliser cet accès ».
// Supabase simulé. (1) un administrateur crée Marc LEROY (intérim Manpower, SANS e-mail) depuis « À placer » → ligne « prov » au registre (serveur, partagée),
// Marc apparaît aussitôt « ⏳ accès à finaliser », sélectionné ; (2) placé sur un chantier → planning_set avec la clé prov:<id> (le chef le verra) ;
// (3) l'accueil de l'administrateur annonce « 1 accès à finaliser » ; (4) Administration → « Finaliser » : formulaire prérempli, e-mail ajouté → invite_access,
// la ligne prov passe « done » et le planning de Marc est re-clé sur son e-mail ; (5) avec e-mail + administrateur : l'accès est créé directement (pas de prov) ;
// (6) un doublon est refusé ; (7) 👁 voir seulement : le bouton refuse.
import { chromium } from 'playwright';
const BASE=process.env.BASE||'http://localhost:8765';
const SB='https://pghftlepduvfazbiavhq.supabase.co';
const UID='11111111-2222-4333-8444-555555555555';const EMAIL='elebihan@scr-soudure.fr';
const profile={id:UID,email:EMAIL,name:'Ethan LE BIHAN',role:'chef',active:true,poste:'resp_exploitation',admin:true,type:'salarie',rights:{},sites:null,prenom:'Ethan',nom:'LE BIHAN',created_at:'2026-10-08T09:00:00Z'};
const paul={id:'u-2',email:'paul.durand@scr-soudure.fr',name:'Paul DURAND',nom:'DURAND',prenom:'Paul',role:'chef',active:true,poste:'chef',admin:false,type:'salarie',rights:{},sites:null,created_at:'2026-10-08T09:30:00Z'};
const session=()=>({access_token:'tok',token_type:'bearer',expires_in:3600,expires_at:Math.floor(Date.now()/1000)+3600,refresh_token:'ref',user:{id:UID,email:EMAIL,aud:'authenticated',role:'authenticated',app_metadata:{},user_metadata:{},created_at:'2026-10-08T09:00:00Z'}});
const REG={};const INVITES=[];const PLAN={};const calls=[];
const SITES=[{id:'SRV_A',name:'Caen — Rue des Lilas',supplier:'LOGSTOR',updated_at:'2026-10-01T08:00:00Z',geo:null,origin:null,bgo:null,sat:null,w:null,h:null,bbox:null,nbox:null,nw:40,deleted:null,deletedAt:null,builtin:null,ville:'Caen',chef:paul.email,conducteur:EMAIL,secteur:'ouest'}];
const browser=await chromium.launch({headless:true, executablePath: process.env.CHROMIUM_PATH||undefined});
const ctx=await browser.newContext({viewport:{width:900,height:1000}});
await ctx.route(u=>u.href.startsWith(SB),async route=>{const req=route.request();const u=new URL(req.url());const p=u.pathname;const acc=req.headers()['accept']||'';
  const json=(o,status=200)=>route.fulfill({status,contentType:'application/json',headers:{'access-control-allow-origin':'*'},body:JSON.stringify(o)});
  const body=()=>{try{return JSON.parse(req.postData()||'{}');}catch(e){return {};}};
  if(p==='/auth/v1/token')return json(session());
  if(p==='/auth/v1/user')return json(session().user);
  if(p.startsWith('/auth/v1/'))return json({});
  if(p==='/rest/v1/profiles'){const m=/id=eq\.([^&]+)/.exec(u.search);const rows=m?[profile,paul].filter(x=>x.id===decodeURIComponent(m[1])):[profile,paul];return json(/object/.test(acc)?(rows[0]||null):rows);}
  if(p==='/rest/v1/invites')return json(INVITES.map(i=>({...i,used_at:null,created_at:'2026-10-12T09:00:00Z'})));
  if(p==='/rest/v1/app_settings')return json(/object/.test(acc)?null:[]);
  if(p==='/rest/v1/rpc/invite_access'){const b=body();calls.push({fn:'invite_access',email:b.p_email,prenom:b.p_prenom,nom:b.p_nom,poste:b.p_poste,type:b.p_type});INVITES.push({email:b.p_email,nom:b.p_nom,prenom:b.p_prenom,poste:b.p_poste,type:b.p_type,rights:{},sites:b.p_sites||null});return json(null);}
  if(p==='/rest/v1/rpc/registre_set'){const b=body();calls.push({fn:'registre_set',kind:b.p_kind,id:b.p_id,patch:b.p_patch,mode:b.p_mode});const k=b.p_kind+'|'+b.p_id;const old=(REG[k]||{}).data||{};const data=b.p_mode==='replace'?b.p_patch:Object.assign({},old,b.p_patch||{});Object.keys(b.p_patch||{}).forEach(x=>{if(b.p_patch[x]===null)delete data[x];});REG[k]={kind:b.p_kind,id:b.p_id,data,updated_at:new Date().toISOString()};return json(REG[k]);}
  if(p==='/rest/v1/registre'){const m=/kind=in\.%28([^)]+)%29/.exec(u.search)||/kind=in\.\(([^)]+)\)/.exec(decodeURIComponent(u.search));const kinds=m?decodeURIComponent(m[1]).replace(/"/g,'').split(','):null;return json(Object.values(REG).filter(r=>!kinds||kinds.includes(r.kind)));}
  if(p==='/rest/v1/rpc/planning_set'){const b=body();calls.push({fn:'planning_set',week:b.p_week,aff:(b.p_patch||{}).aff||{}});const row=PLAN[b.p_week]||(PLAN[b.p_week]={week:b.p_week,data:{aff:{}},updated_at:''});Object.entries((b.p_patch||{}).aff||{}).forEach(([k,v])=>{if(v===null)delete row.data.aff[k];else row.data.aff[k]=v;});row.updated_at=new Date().toISOString();return json(row);}
  if(p==='/rest/v1/planning')return json(Object.values(PLAN));
  if(p==='/rest/v1/rpc/people_set_part'){const b=body();calls.push({fn:'people_set_part',key:b.p_key,part:b.p_part,value:b.p_value});return json({at:new Date().toISOString(),value:b.p_value});}
  if(p.startsWith('/rest/v1/rpc/'))return json(null);
  if(p==='/rest/v1/sites'){const m=/id=eq\.([^&]+)/.exec(u.search);const id=m?decodeURIComponent(m[1]):null;const rows=SITES.filter(r=>!id||r.id===id);return json(/object/.test(acc)?(rows[0]||null):rows);}
  if(p.startsWith('/rest/v1/'))return json([]);
  return json([]);});
const page=await ctx.newPage();
const logs=[];page.on('pageerror',e=>logs.push('PAGEERROR: '+e.message.slice(0,300)));page.on('console',m=>{if(m.type()==='error'&&!/realtime|websocket|Failed to fetch|net::ERR|404|400/i.test(m.text()))logs.push(m.text().slice(0,200));});
page.on('dialog',d=>d.accept().catch(()=>{}));
const C={};const wait=ms=>page.waitForTimeout(ms);
await page.clock.install({time:new Date(2026,9,9,8,30,0)}); /* vendredi 09/10/2026 */
await page.goto(BASE+'/index.html');await wait(600);await page.evaluate(()=>{localStorage.clear();});await page.reload();await wait(900);
await page.fill('#loginEmail',EMAIL);await page.fill('#loginPwd','Soudure-2026!');await page.click('#loginGo');await wait(2500);
const openPlanning=async()=>{await page.evaluate(async()=>{const T=window.TRACE;if(T.state.screen!=='home')document.getElementById('btnHome').click();await new Promise(r=>setTimeout(r,300));document.getElementById('htExpl').click();T.renderHome();await new Promise(r=>setTimeout(r,250));const bk=document.querySelector('#eq-app .ac-back');if(bk){bk.click();await new Promise(r=>setTimeout(r,200));}const b=[...document.querySelectorAll('#eq-app .ac-row')].find(x=>/Planning des équipes/.test(x.textContent));b&&b.click();});await wait(500);};
// ── 1) « ＋ Nouvelle personne » : Marc LEROY, intérim Manpower, sans e-mail → ligne prov au serveur, Marc dans « À placer », sélectionné
await openPlanning();
let out=await page.evaluate(()=>{const b=document.querySelector('#eq-app [data-act=plnew]');const r={btn:!!b,btnTxt:b?b.textContent.trim():''};if(b)b.click();r.form=!!document.getElementById('pl-new');r.agHidden=document.getElementById('pn-agw')?document.getElementById('pn-agw').style.display==='none':null;return r;});
await page.evaluate(()=>{document.getElementById('pn-prenom').value='Marc';document.getElementById('pn-nom').value='LEROY';document.getElementById('pn-poste').value='soudeur';const t=document.getElementById('pn-type');t.value='interim';t.dispatchEvent(new Event('change',{bubbles:true}));});
out.agShown=await page.evaluate(()=>document.getElementById('pn-agw').style.display!=='none');
await page.evaluate(()=>{document.getElementById('pn-agence').value='Manpower';document.querySelector('#eq-app [data-act=plnewok]').click();});await wait(1500);
out.after=await page.evaluate(()=>{const T=window.TRACE;const S=T.espace.state().S;const tray=document.getElementById('pl-tray');const chip=tray&&[...tray.querySelectorAll('.eq-plchip')].find(c=>/LEROY/.test(c.textContent));return {form:!!document.getElementById('pl-new'),chip:!!chip,chipTxt:chip?chip.textContent.replace(/\s+/g,' ').trim():'',sel:S.plSel,toast:document.getElementById('toast').textContent,provTodo:T.espace.provTodo().map(p=>[p.name,p.type,p.agence,p.email,p.by])};});
const reg1=calls.filter(c=>c.fn==='registre_set'&&c.kind==='prov');out.reg=reg1.map(c=>[c.id,c.patch.prenom,c.patch.nom,c.patch.type,c.patch.agence,c.patch.status,c.patch.email,c.patch.by]);
console.log('1) nouvelle personne sans e-mail :',JSON.stringify(out));
C.c1=out.btn&&/Nouvelle personne/.test(out.btnTxt)&&out.form&&out.agHidden===true&&out.agShown&&!out.after.form&&out.after.chip&&/Marc LEROY/.test(out.after.chipTxt)&&/intérim Manpower/.test(out.after.chipTxt)&&/accès à finaliser/.test(out.after.chipTxt)
  &&/^prov:/.test(out.after.sel||'')&&/À placer/.test(out.after.toast)&&/administrateur devra finaliser/.test(out.after.toast)&&out.after.provTodo.length===1&&out.after.provTodo[0][0]==='Marc LEROY'&&out.after.provTodo[0][1]==='interim'&&out.after.provTodo[0][2]==='Manpower'&&out.after.provTodo[0][3]===''&&out.after.provTodo[0][4]==='Ethan LE BIHAN'
  &&reg1.length===1&&reg1[0].patch.status==='a_finaliser'&&reg1[0].patch.nom==='LEROY'&&!reg1[0].patch.demo;
const PROV_KEY=out.after.sel,PROV_ID=String(PROV_KEY).slice(5);
// ── 2) placé sur Caen (toute la semaine) → planning_set avec la clé prov:<id> : partagé, le chef le voit
const n0=calls.length;
await page.evaluate(()=>{document.querySelector('#eq-app [data-act=plput][data-v=SRV_A]').click();});await wait(1500);
out=await page.evaluate(()=>{const card=document.querySelector('#eq-app .eq-plsite[data-drop=SRV_A]');const chip=card&&[...card.querySelectorAll('.eq-plchip')].find(c=>/LEROY/.test(c.textContent));return {onSite:!!chip,dots:chip?chip.querySelectorAll('.eq-pldots i.on').length:0,tray:!![...document.querySelectorAll('#pl-tray .eq-plchip')].find(c=>/LEROY/.test(c.textContent))};});
const pl=calls.slice(n0).filter(c=>c.fn==='planning_set');out.plan=pl.map(c=>[c.week,Object.keys(c.aff)]);
console.log('2) placé → serveur :',JSON.stringify(out));
C.c2=out.onSite&&out.dots===5&&!out.tray&&pl.length>=1&&pl.some(c=>Object.keys(c.aff).includes(PROV_KEY))&&Object.keys(pl[0].aff[PROV_KEY]||{}).filter(k=>/^\d{4}-/.test(k)).length===5;
// ── 3) accueil de l'administrateur : « 1 accès à finaliser »
await page.evaluate(()=>{document.getElementById('htHome').click();});await wait(600);
out=await page.evaluate(()=>{const n=[...document.querySelectorAll('#eq-app .ac-notif, #eq-app .ac-row, #eq-app [class*=notif]')].map(x=>x.textContent.replace(/\s+/g,' ').trim()).filter(t=>/finaliser/.test(t));return {notif:n[0]||'',all:document.getElementById('eq-app').textContent.replace(/\s+/g,' ').slice(0,80)};});
console.log('3) notification admin :',JSON.stringify(out));
C.c3=/1 accès à finaliser/.test(out.notif)&&/Marc LEROY/.test(out.notif)&&/Manpower/.test(out.notif)&&/sans e-mail/.test(out.notif);
// ── 4) Administration → ⏳ Finaliser : formulaire prérempli (Marc, LEROY, intérim), e-mail ajouté → invite_access, prov « done », planning re-clé sur l'e-mail
await page.evaluate(()=>{window.TRACE.state.homeTab='admin';window.TRACE.renderHome();});await wait(1800);
out=await page.evaluate(()=>{const b=document.querySelector('[data-admprov]');const r={btn:!!b,txt:b?b.textContent.trim():'',block:(document.querySelector('[data-prov]')||{}).textContent||''};if(b)b.click();const m=document.getElementById('modal');r.modal=m?m.textContent.slice(0,120):'';r.pre={prenom:(document.getElementById('an-prenom')||{}).value,nom:(document.getElementById('an-nom')||{}).value,type:(document.getElementById('an-type')||{}).value,poste:(document.getElementById('an-poste')||{}).value,sites:(document.getElementById('an-sites')||{style:{}}).style.display};return r;});
const n1=calls.length;
await page.evaluate(()=>{document.getElementById('an-email').value='marc.leroy@gmail.com';document.getElementById('an-ok').click();});await wait(2500);
const inv=calls.slice(n1).filter(c=>c.fn==='invite_access');const regDone=calls.slice(n1).filter(c=>c.fn==='registre_set'&&c.kind==='prov');const rekey=calls.slice(n1).filter(c=>c.fn==='planning_set');
out.inv=inv.map(c=>[c.email,c.prenom,c.nom,c.type,c.poste]);out.regDone=regDone.map(c=>[c.id,c.patch.status,c.patch.email]);out.rekey=rekey.map(c=>[c.week,Object.entries(c.aff).map(([k,v])=>k+':'+(v===null?'null':Object.keys(v).filter(x=>/^\d{4}-/.test(x)).length))]);
out.afterAdm=await page.evaluate(()=>({prov:document.querySelectorAll('[data-prov]').length,todo:window.TRACE.espace.provTodo().length,toast:document.getElementById('toast').textContent}));
console.log('4) finalisation :',JSON.stringify(out));
C.c4=out.btn&&/Finaliser/.test(out.txt)&&/Marc LEROY/.test(out.block)&&/sans e-mail/.test(out.block)&&/Finaliser l'accès/.test(out.modal)&&out.pre.prenom==='Marc'&&out.pre.nom==='LEROY'&&out.pre.type==='interim'&&out.pre.poste==='soudeur'&&out.pre.sites!=='none'
  &&inv.length===1&&inv[0].email==='marc.leroy@gmail.com'&&inv[0].nom==='LEROY'&&inv[0].type==='interim'&&regDone.length===1&&regDone[0].id===PROV_ID&&regDone[0].patch.status==='done'&&regDone[0].patch.email==='marc.leroy@gmail.com'
  &&rekey.length===1&&out.rekey[0][1].includes(PROV_KEY+':null')&&out.rekey[0][1].includes('marc.leroy@gmail.com:5')&&out.afterAdm.prov===0&&out.afterAdm.todo===0&&/Accès créé/.test(out.afterAdm.toast);
// planning : Marc est toujours sur Caen, maintenant comme invité (clé e-mail), plus « à finaliser »
await openPlanning();await wait(800);
out=await page.evaluate(()=>{const card=document.querySelector('#eq-app .eq-plsite[data-drop=SRV_A]');const chip=card&&[...card.querySelectorAll('.eq-plchip')].find(c=>/LEROY/.test(c.textContent));return {onSite:!!chip,key:chip?chip.dataset.drag:'',txt:chip?chip.textContent.replace(/\s+/g,' ').trim():'',dots:chip?chip.querySelectorAll('.eq-pldots i.on').length:0};});
console.log('4b) planning après finalisation :',JSON.stringify(out));
C.c4b=out.onSite&&out.key==='marc.leroy@gmail.com'&&!/finaliser/.test(out.txt)&&out.dots===5;
// ── 5) avec e-mail + administrateur : accès créé directement (invite_access), pas de ligne prov ; la personne est sélectionnée pour être placée
const n2=calls.length;
await page.evaluate(()=>{document.querySelector('#eq-app [data-act=plnew]').click();});await wait(200);
await page.evaluate(()=>{document.getElementById('pn-prenom').value='Léa';document.getElementById('pn-nom').value='MORIN';document.getElementById('pn-poste').value='tuyauteur';document.getElementById('pn-email').value='Lea.Morin@scr-soudure.fr';document.getElementById('pn-sect').value='ouest';document.querySelector('#eq-app [data-act=plnewok]').click();});await wait(2000);
out=await page.evaluate(()=>{const T=window.TRACE;const S=T.espace.state().S;const tray=document.getElementById('pl-tray');const chip=tray&&[...tray.querySelectorAll('.eq-plchip')].find(c=>/MORIN/.test(c.textContent));return {chip:!!chip,txt:chip?chip.textContent.replace(/\s+/g,' ').trim():'',sel:S.plSel,toast:document.getElementById('toast').textContent,todo:T.espace.provTodo().length};});
const inv2=calls.slice(n2).filter(c=>c.fn==='invite_access'),prov2=calls.slice(n2).filter(c=>c.fn==='registre_set'&&c.kind==='prov'),sect2=calls.slice(n2).filter(c=>c.fn==='people_set_part'&&c.part==='secteur');
out.inv=inv2.map(c=>[c.email,c.poste,c.type]);out.prov=prov2.length;out.sect=sect2.map(c=>[c.key,c.value]);
console.log('5) avec e-mail (admin) :',JSON.stringify(out));
C.c5=out.chip&&/Léa MORIN/.test(out.txt)&&/Tuyauteur/.test(out.txt)&&!/finaliser/.test(out.txt)&&out.sel==='lea.morin@scr-soudure.fr'&&/Accès créé/.test(out.toast)&&out.todo===0&&inv2.length===1&&inv2[0].email==='lea.morin@scr-soudure.fr'&&inv2[0].poste==='tuyauteur'&&inv2[0].type==='salarie'&&out.prov===0&&sect2.length===1&&sect2[0].key==='lea.morin@scr-soudure.fr'&&sect2[0].value==='ouest';
// ── 6) doublon refusé (même nom, ou même e-mail)
await page.evaluate(()=>{document.querySelector('#eq-app [data-act=plnew]').click();});await wait(200);
await page.evaluate(()=>{document.getElementById('pn-prenom').value='Marc';document.getElementById('pn-nom').value='Leroy';document.querySelector('#eq-app [data-act=plnewok]').click();});await wait(600);
out=await page.evaluate(()=>({err:(document.getElementById('pn-err')||{}).textContent,form:!!document.getElementById('pl-new')}));
await page.evaluate(()=>{document.getElementById('pn-prenom').value='X';document.getElementById('pn-nom').value='Y';document.getElementById('pn-email').value='pas-un-mail';document.querySelector('#eq-app [data-act=plnewok]').click();});await wait(600);
out.err2=await page.evaluate(()=>(document.getElementById('pn-err')||{}).textContent);
await page.evaluate(()=>{document.querySelector('#eq-app [data-act=plnewx]').click();});await wait(200);
out.closed=await page.evaluate(()=>!document.getElementById('pl-new'));
console.log('6) doublon / e-mail invalide :',JSON.stringify(out));
C.c6=out.form&&/existe déjà/.test(out.err)&&/invalide/.test(out.err2)&&out.closed;
// ── 7) 👁 voir seulement (Paul) : le bouton refuse ; ✍ agir comme Paul (chef, sans droit planning.edit ?) → le bouton n'existe que si le poste a planning.edit
await page.evaluate(()=>{document.getElementById('btnHome').click();});await wait(300);
await page.evaluate(()=>{const sel=document.getElementById('homeAs');sel.value='acc:u-2';sel.dispatchEvent(new Event('change',{bubbles:true}));});await wait(500);
await page.evaluate(()=>document.getElementById('hbAct').click());await wait(400); /* → 👁 voir seulement */
await openPlanning();
out=await page.evaluate(()=>{const b=document.querySelector('#eq-app [data-act=plnew]');const r={viewing:window.TRACE.acces.current().test===true,btn:!!b};if(b){b.click();}return r;});await wait(500);
out.form=await page.evaluate(()=>!!document.getElementById('pl-new'));out.toast=await page.evaluate(()=>document.getElementById('toast').textContent);
console.log('7) voir seulement :',JSON.stringify(out));
C.c7=out.viewing&&(!out.btn||(!out.form&&/rien n'est modifié/.test(out.toast)));
const bad=Object.entries(C).filter(([k,v])=>!v).map(([k])=>k);console.log(bad.length?'RESULTAT: ECHEC '+bad.join(','):'RESULTAT: TOUT VERT');console.log(logs.length?logs:'[]');
await browser.close();
