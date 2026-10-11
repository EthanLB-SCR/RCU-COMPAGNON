// MA SEMAINE (Ethan 12/10 : « composer ma semaine pour un encadrant relié avec Outlook ? ») — agenda de l'encadrant à côté de ses chantiers, export .ics.
// (Même Supabase simulé que e2e_prov.) Ancien en-tête :
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
const openHub=async()=>{await page.evaluate(async()=>{const T=window.TRACE;if(T.state.screen!=='home')document.getElementById('btnHome').click();await new Promise(r=>setTimeout(r,300));document.getElementById('htExpl').click();T.renderHome();await new Promise(r=>setTimeout(r,250));const bk=document.querySelector('#eq-app .ac-back');if(bk){bk.click();await new Promise(r=>setTimeout(r,200));}});await wait(300);};
// ── 1) hub Équipes → « Ma semaine » : 5 jours, aujourd'hui marqué, suggestion « sans visite » pour mes chantiers (Caen : je suis conducteur)
await openHub();
let out=await page.evaluate(()=>{const b=[...document.querySelectorAll('#eq-app .ac-row')].find(x=>/Ma semaine/.test(x.textContent));const r={row:!!b,rowTxt:b?b.textContent.replace(/\s+/g,' ').trim():''};if(b)b.click();return r;});await wait(500);
Object.assign(out,await page.evaluate(()=>{const app=document.getElementById('eq-app');return {h2:(app.querySelector('h2.vt')||{}).textContent,days:app.querySelectorAll('.eq-agday').length,today:app.querySelectorAll('.eq-agday.today').length,todayTxt:(app.querySelector('.eq-agday.today .eq-big')||{}).textContent,sans:/sans visite cette semaine/.test(app.textContent)&&/Caen/.test(app.textContent),ics:(app.querySelector('[data-act=agics]')||{}).disabled,plus:app.querySelectorAll('[data-act=agnew]').length};}));
console.log('1) Ma semaine :',JSON.stringify(out));
C.c1=out.row&&/Outlook/.test(out.rowTxt)&&/Ma semaine/.test(out.h2)&&/semaine 41/.test(out.h2)&&out.days===5&&out.today===1&&/vendredi 9 octobre/.test(out.todayTxt)&&out.sans&&out.ics===true&&out.plus===5;
// ── 2) ＋ lundi → visite de chantier Caen 9 h – 10 h 30 → enregistrée (registre « agenda », id = mon e-mail|id), affichée, la suggestion disparaît, export possible
const n0=calls.length;
await page.evaluate(()=>{document.querySelector('#eq-app [data-act=agnew][data-v="2026-10-05"]').click();});await wait(300);
out=await page.evaluate(()=>({form:!!document.getElementById('ag-form'),types:[...document.querySelectorAll('#ag-type option')].map(o=>o.value),sites:[...document.querySelectorAll('#ag-site option')].map(o=>o.value)}));
await page.evaluate(()=>{document.getElementById('ag-type').value='visite';document.getElementById('ag-site').value='SRV_A';document.getElementById('ag-h0').value='09:00';document.getElementById('ag-h1').value='10:30';document.getElementById('ag-note').value='PV de réception tranchée';document.querySelector('#eq-app [data-act=agok]').click();});await wait(1500);
Object.assign(out,await page.evaluate(()=>{const app=document.getElementById('eq-app');const day=app.querySelector('.eq-agday');const e=day.querySelector('.eq-ag');return {form:!!document.getElementById('ag-form'),entry:e?e.textContent.replace(/\s+/g,' ').trim():'',n:app.querySelectorAll('.eq-ag').length,ok:/Une visite prévue sur chacun/.test(app.textContent),ics:(app.querySelector('[data-act=agics]')||{}).disabled,toast:document.getElementById('toast').textContent,badge:null};}));
const reg=calls.slice(n0).filter(c=>c.fn==='registre_set'&&c.kind==='agenda');out.reg=reg.map(c=>[c.id.split('|')[0],c.patch.p,c.patch.d,c.patch.type,c.patch.site,c.patch.h0,c.patch.h1,c.patch.note,c.patch.by]);
console.log('2) visite ajoutée :',JSON.stringify(out));
C.c2=out.form===false&&out.types.includes('visite')&&out.types.includes('reunion')&&out.sites.includes('SRV_A')&&/9 h 00 – 10 h 30/.test(out.entry)&&/Visite de chantier/.test(out.entry)&&/Caen/.test(out.entry)&&/PV de réception/.test(out.entry)&&out.n===1&&out.ok&&out.ics===false&&/Ajouté à ta semaine/.test(out.toast)
  &&reg.length===1&&out.reg[0][0]===EMAIL&&out.reg[0][1]===EMAIL&&out.reg[0][2]==='2026-10-05'&&out.reg[0][3]==='visite'&&out.reg[0][4]==='SRV_A'&&out.reg[0][5]==='09:00'&&out.reg[0][6]==='10:30'&&out.reg[0][8]==='Ethan LE BIHAN';
// ── 3) réunion jeudi sans chantier, heures inversées remises dans l'ordre ; le hub compte 2 dans la semaine
await page.evaluate(()=>{document.querySelector('#eq-app [data-act=agnew][data-v="2026-10-08"]').click();});await wait(300);
await page.evaluate(()=>{document.getElementById('ag-type').value='reunion';document.getElementById('ag-title').value='Point hebdo direction';document.getElementById('ag-h0').value='16:00';document.getElementById('ag-h1').value='14:00';document.querySelector('#eq-app [data-act=agok]').click();});await wait(800);
out=await page.evaluate(()=>{const app=document.getElementById('eq-app');const cards=[...app.querySelectorAll('.eq-agday')];const jeu=cards[3];const e=jeu.querySelector('.eq-ag');return {entry:e?e.textContent.replace(/\s+/g,' ').trim():'',n:app.querySelectorAll('.eq-ag').length};});
await openHub();out.hub=await page.evaluate(()=>{const b=[...document.querySelectorAll('#eq-app .ac-row')].find(x=>/Ma semaine/.test(x.textContent));return b?(b.querySelector('.ac-n')||{}).textContent:'';});
console.log('3) réunion :',JSON.stringify(out));
C.c3=/14 h 00 – 16 h 00/.test(out.entry)&&/Point hebdo direction/.test(out.entry)&&out.n===2&&out.hub==='2';
// ── 4) export .ics : téléchargement déclenché, VEVENT de la visite (DTSTART 20261005T090000, LOCATION Caen), de la réunion, et journées « Chantier » (planning) si je suis placé
await page.evaluate(()=>{[...document.querySelectorAll('#eq-app .ac-row')].find(x=>/Ma semaine/.test(x.textContent)).click();});await wait(400);
const dlP=page.waitForEvent('download',{timeout:4000}).catch(()=>null);
await page.evaluate(()=>{document.querySelector('#eq-app [data-act=agics]').click();});const dl=await dlP;await wait(300);
out=await page.evaluate(()=>{const t=window.TRACE.espace.state().S.agLastIcs||'';return {len:t.length,begin:/^BEGIN:VCALENDAR\r\n/.test(t),events:(t.match(/BEGIN:VEVENT/g)||[]).length,visite:/DTSTART:20261005T090000\r\nDTEND:20261005T103000\r\nSUMMARY:Visite de chantier — Caen — Rue des Lilas/.test(t.replace(/\\,/g,',')),loc:/LOCATION:Caen — Rue des Lilas\\, Caen/.test(t),reunion:/SUMMARY:Point hebdo direction/.test(t),end:/END:VCALENDAR\r\n$/.test(t),toast:document.getElementById('toast').textContent};});
out.dl=dl?dl.suggestedFilename():null;
console.log('4) export .ics :',JSON.stringify(out));
C.c4=out.begin&&out.events===2&&out.visite&&out.loc&&out.reunion&&out.end&&/exportée/.test(out.toast)&&out.dl==='TRACE_semaine_41_Ethan.ics';
// ── 5) retirer la réunion → marquée supprimée au registre, disparaît
const n1=calls.length;
await page.evaluate(()=>{const cards=[...document.querySelectorAll('#eq-app .eq-agday')];cards[3].querySelector('[data-act=agrm]').click();});await wait(1200);
out=await page.evaluate(()=>({n:document.querySelectorAll('#eq-app .eq-ag').length}));const rm=calls.slice(n1).filter(c=>c.fn==='registre_set'&&c.kind==='agenda');out.rm=rm.map(c=>[c.id.split('|')[0],c.patch.deleted]);
console.log('5) retrait :',JSON.stringify(out));
C.c5=out.n===1&&rm.length===1&&rm[0].patch.deleted===true&&rm[0].id.startsWith(EMAIL+'|');
// ── 5b) 12/10 soir (Ethan : « plutôt un import depuis Outlook… une invitation dans son agenda qui remplit son planning ») : import d'un .ics Outlook → 2 entrées (visite reconnue sur Caen, réunion), étiquette Outlook ; réimport = mis à jour, pas dupliqué
const ICS=['BEGIN:VCALENDAR','VERSION:2.0','PRODID:-//Microsoft Corporation//Outlook 16.0 MIMEDIR//EN','BEGIN:VEVENT','UID:040000008200E00074C5B7101A82E00800000000AAA@outlook','DTSTART;TZID=Romance Standard Time:20261006T100000','DTEND;TZID=Romance Standard Time:20261006T113000','SUMMARY:Réunion de chantier Caen','LOCATION:Rue des Lilas\\, Caen','DESCRIPTION:Avec le MOE\\nPV à préparer','END:VEVENT','BEGIN:VEVENT','UID:BBB@outlook','DTSTART:20261007T140000Z','DTEND:20261007T150000Z','SUMMARY:Point hebdo direction','END:VEVENT','BEGIN:VEVENT','UID:CCC@outlook','DTSTART;VALUE=DATE:20261009','DTEND;VALUE=DATE:20261010','SUMMARY:Formation SST','STATUS:CANCELLED','END:VEVENT','END:VCALENDAR'].join('\r\n');
await page.setInputFiles('#eq-app [data-agimport]',{name:'outlook.ics',mimeType:'text/calendar',buffer:Buffer.from(ICS,'utf8')});await wait(1200);
out=await page.evaluate(()=>{const app=document.getElementById('eq-app');const cards=[...app.querySelectorAll('.eq-agday')];const txt=i=>cards[i].textContent.replace(/\s+/g,' ').trim();return {toast:document.getElementById('toast').textContent,n:app.querySelectorAll('.eq-ag').length,mar:txt(1),mer:txt(2),ven:txt(4),tags:app.querySelectorAll('.eq-ag .eq-tag').length};});
const reg2=calls.filter(c=>c.fn==='registre_set'&&c.kind==='agenda'&&c.patch.src==='outlook');out.reg=reg2.map(c=>[c.patch.d,c.patch.type,c.patch.site,c.patch.h0,c.patch.h1,c.patch.uid]);
await page.setInputFiles('#eq-app [data-agimport]',{name:'outlook.ics',mimeType:'text/calendar',buffer:Buffer.from(ICS.replace('Point hebdo direction','Point hebdo direction (salle 2)'),'utf8')});await wait(1200);
out.again=await page.evaluate(()=>({toast:document.getElementById('toast').textContent,n:document.querySelectorAll('#eq-app .eq-ag').length,mer:[...document.querySelectorAll('#eq-app .eq-agday')][2].textContent.replace(/\s+/g,' ').trim()}));
console.log('5b) import Outlook :',JSON.stringify(out));
C.c5b=/Outlook importé : 2 nouveaux/.test(out.toast)&&out.n===3&&/10 h 00 – 11 h 30/.test(out.mar)&&/Réunion de chantier Caen/.test(out.mar)&&/Caen — Rue des Lilas/.test(out.mar)&&/Avec le MOE/.test(out.mar)&&/Point hebdo direction/.test(out.mer)&&!/Formation SST/.test(out.ven)&&out.tags===2
  &&reg2.length===2&&out.reg.some(r=>r[0]==='2026-10-06'&&r[1]==='visite'&&r[2]==='SRV_A'&&r[3]==='10:00'&&r[4]==='11:30')&&out.reg.some(r=>r[0]==='2026-10-07'&&r[1]==='reunion'&&r[5]==='BBB@outlook')
  &&/0 nouveau · 2 mis à jour/.test(out.again.toast)&&out.again.n===3&&/salle 2/.test(out.again.mer);
// ── 5c) hiérarchie : Ethan (responsable d'exploitation, admin) voit « La semaine de » Paul (chef) en lecture seule ; Paul ne voit personne
out=await page.evaluate(()=>{const sel=document.querySelector('#eq-app [data-chg=agWho]');return {sel:!!sel,opts:sel?[...sel.options].map(o=>o.textContent):[]};});
await page.evaluate(()=>{const sel=document.querySelector('#eq-app [data-chg=agWho]');sel.value='paul.durand@scr-soudure.fr';sel.dispatchEvent(new Event('change',{bubbles:true}));});await wait(400);
out.paul=await page.evaluate(()=>{const app=document.getElementById('eq-app');return {h2:(app.querySelector('h2.vt')||{}).textContent,plus:app.querySelectorAll('[data-act=agnew]').length,rm:app.querySelectorAll('[data-act=agrm]').length,imp:!!app.querySelector('[data-agimport]'),days:app.querySelectorAll('.eq-agday').length,sites:/Caen/.test(app.textContent)};});
await page.evaluate(()=>{const sel=document.querySelector('#eq-app [data-chg=agWho]');sel.value='';sel.dispatchEvent(new Event('change',{bubbles:true}));});await wait(300);
out.back=await page.evaluate(()=>({h2:(document.querySelector('#eq-app h2.vt')||{}).textContent,plus:document.querySelectorAll('#eq-app [data-act=agnew]').length}));
console.log('5c) hiérarchie :',JSON.stringify(out));
C.c5c=out.sel&&out.opts.some(t=>/Paul DURAND — Chef de chantier/.test(t))&&/Semaine de Paul DURAND/.test(out.paul.h2)&&/lecture seule/.test(out.paul.h2)&&out.paul.plus===0&&out.paul.rm===0&&!out.paul.imp&&out.paul.days===5&&/Ma semaine/.test(out.back.h2)&&out.back.plus===5;
// ── 6) 👁 voir comme Paul (lecture seule) : « Ma semaine » de Paul est vide, ＋ refuse
await page.evaluate(()=>{document.getElementById('btnHome').click();});await wait(300);
await page.evaluate(()=>{const sel=document.getElementById('homeAs');sel.value='acc:u-2';sel.dispatchEvent(new Event('change',{bubbles:true}));});await wait(500);
await page.evaluate(()=>document.getElementById('hbAct').click());await wait(400);
await openHub();await page.evaluate(()=>{const b=[...document.querySelectorAll('#eq-app .ac-row')].find(x=>/Ma semaine/.test(x.textContent));b&&b.click();});await wait(400);
out=await page.evaluate(()=>{const app=document.getElementById('eq-app');const b=app.querySelector('[data-act=agnew]');const r={view:/Ma semaine/.test((app.querySelector('h2.vt')||{}).textContent),n:app.querySelectorAll('.eq-ag').length,plus:!!b,sel:!!app.querySelector('[data-chg=agWho]')};if(b)b.click();return r;});await wait(500);
out.form=await page.evaluate(()=>!!document.getElementById('ag-form'));out.toast=await page.evaluate(()=>document.getElementById('toast').textContent);
console.log('6) voir comme Paul :',JSON.stringify(out));
C.c6=out.view&&out.n===0&&out.plus&&!out.form&&/rien n'est modifié/.test(out.toast)&&!out.sel;
const bad=Object.entries(C).filter(([k,v])=>!v).map(([k])=>k);console.log(bad.length?'RESULTAT: ECHEC '+bad.join(','):'RESULTAT: TOUT VERT');console.log(logs.length?logs:'[]');
await browser.close();
