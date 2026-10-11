// BAC À SABLE (Ethan 10/10 : « j'ai la vraie appli mais ça devient dur de faire des tests… il faudrait des scénarios, injecter des fausses données enlevables, jamais mélangées à des vraies données »).
// Supabase SIMULÉ au niveau réseau (comme e2e_login) : Ethan connecté en administrateur, un VRAI chantier sur le serveur. Onglet Administrateur → 🧪 Bac à sable → « Mettre en place » :
// chantier « Démo — Caen » + personnages de démo pilotables + scénario (planning, objectifs, pointage, quart d'heure). Karim soude une pièce. Rien ne part au serveur (aucun appel ne cite demo_/l:karim).
// Rechargement : le bac à sable est toujours là (soudure de Karim comprise). « Retirer » : plus rien, le vrai chantier est intact.
import { chromium } from 'playwright';
const BASE=process.env.BASE||'http://localhost:8765';
const SB='https://pghftlepduvfazbiavhq.supabase.co';
const UID='11111111-2222-4333-8444-555555555555';const EMAIL='elebihan@scr-soudure.fr';
const b64u=o=>Buffer.from(JSON.stringify(o)).toString('base64').replace(/=+$/,'').replace(/\+/g,'-').replace(/\//g,'_');
const now=()=>Math.floor(Date.now()/1000);
let CUR={id:UID,email:EMAIL};const user=()=>({id:CUR.id,aud:'authenticated',role:'authenticated',email:CUR.email,email_confirmed_at:'2026-10-08T09:00:00Z',confirmed_at:'2026-10-08T09:00:00Z',last_sign_in_at:new Date().toISOString(),app_metadata:{provider:'email',providers:['email']},user_metadata:{},identities:[],created_at:'2026-10-08T09:00:00Z',updated_at:new Date().toISOString(),is_anonymous:false});
const session=()=>{const t=now();const jwt=b64u({alg:'HS256',typ:'JWT'})+'.'+b64u({iss:SB+'/auth/v1',sub:CUR.id,aud:'authenticated',exp:t+3600,iat:t,email:CUR.email,role:'authenticated',session_id:'sess-'+CUR.id.slice(0,4)})+'.sig';
  return {access_token:jwt,token_type:'bearer',expires_in:3600,expires_at:t+3600,refresh_token:'rt-'+t,user:user()};};
const profile={id:UID,email:EMAIL,name:'Ethan LE BIHAN',role:'chef',active:true,poste:'resp_exploitation',admin:true,type:'salarie',rights:{},sites:null,prenom:'Ethan',nom:'LE BIHAN',created_at:'2026-10-08T09:00:00Z'};
const paul={id:'u-2',email:'paul.durand@scr-soudure.fr',name:'Paul DURAND',nom:'DURAND',prenom:'Paul',role:'soudeur',active:true,poste:'soudeur',admin:false,type:'salarie',rights:{},sites:null,created_at:'2026-10-08T09:30:00Z'};const profiles=[profile,paul];
const REAL={id:'site_real',name:'Réseau Lorient — réel',supplier:'LOGSTOR',serie:'S2',updated_at:'2026-10-08T10:00:00Z',data:{name:'Réseau Lorient — réel',lines:[{id:'L1',name:'Feeder',dn:100,bar:12,pts:[[10,50],[110,50]],specials:[],parent:null}],w:120,h:100,sheetType:'plain',source:'traceur'}};
const calls=[];const settings={};
const browser=await chromium.launch({headless:true, executablePath: process.env.CHROMIUM_PATH||undefined});
const ctx=await browser.newContext({viewport:{width:900,height:940}});
await ctx.route(u=>u.href.startsWith(SB),async route=>{const req=route.request();const u=new URL(req.url());const p=u.pathname;const acc=req.headers()['accept']||'';calls.push(req.method()+' '+p+(u.search?u.search.slice(0,60):'')+' '+String(req.postData()||'').slice(0,400));
  const json=(o,status=200)=>route.fulfill({status,contentType:'application/json',headers:{'access-control-allow-origin':'*'},body:JSON.stringify(o)});
  if(p==='/auth/v1/token'){let b={};try{b=JSON.parse(req.postData()||'{}');}catch(e){}if(b.email){const pr=profiles.find(x=>x.email===String(b.email).toLowerCase());if(pr)CUR={id:pr.id,email:pr.email};}return json(session());}
  if(p==='/auth/v1/user')return json(user());
  if(p==='/auth/v1/logout')return route.fulfill({status:204,headers:{'access-control-allow-origin':'*'},body:''});
  if(p.startsWith('/auth/v1/'))return json({});
  if(p==='/rest/v1/profiles'){const m=/id=eq\.([^&]+)/.exec(u.search);const rows=m?profiles.filter(x=>x.id===decodeURIComponent(m[1])):profiles;return json(/object/.test(acc)?(rows[0]||null):rows);}
  if(p==='/rest/v1/app_settings'){const m=/key=eq\.([^&]+)/.exec(u.search);const k=m?decodeURIComponent(m[1]):'';const rows=settings[k]!==undefined?[{value:settings[k]}]:[];return json(/object/.test(acc)?(rows[0]||null):rows);}
  if(p==='/rest/v1/sites'&&req.method()==='GET'){const m=/id=eq\.([^&]+)/.exec(u.search);const rows=m?[REAL].filter(x=>x.id===decodeURIComponent(m[1])):[REAL];return json(/object/.test(acc)?(rows[0]||null):rows);}
  if(p.startsWith('/rest/v1/rpc/')){let b={};try{b=JSON.parse(req.postData()||'{}');}catch(e){}const fn=p.slice('/rest/v1/rpc/'.length);if(fn==='admin_set_setting'){settings[b.p_key]=b.p_value;return json(null);}return json(null);}
  if(p.startsWith('/rest/v1/'))return json([]);
  return json([]);});
const page=await ctx.newPage();
const logs=[];page.on('pageerror',e=>logs.push('PAGEERROR: '+e.message.slice(0,300)));page.on('console',m=>{if(m.type()==='error'&&!/realtime|websocket|Failed to fetch|net::ERR|404/i.test(m.text()))logs.push(m.text().slice(0,200));});
page.on('dialog',d=>d.accept().catch(()=>{}));
const C={};const wait=ms=>page.waitForTimeout(ms);
const PNG='data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNkYPhfDwAChwGA60e6kgAAAABJRU5ErkJggg==';
await page.clock.install({time:new Date(2026,9,9,8,30,0)}); /* vendredi 09/10/2026 */
await page.goto(BASE+'/index.html');await wait(600);await page.evaluate(()=>{localStorage.clear();});await page.reload();await wait(900);
await page.fill('#loginEmail',EMAIL);await page.fill('#loginPwd','Soudure-2026!');await page.click('#loginGo');await wait(1800);
const sbCalls=()=>calls.filter(c=>/demo_|l:karim|l:julien|l:ethan|Démo — Caen/.test(c));
const info=async()=>{await page.evaluate(()=>document.getElementById('htList').click());await wait(400);return page.evaluate(()=>{const T=window.TRACE;const sel=document.querySelector('#homeAs');const og=sel&&[...sel.querySelectorAll('optgroup')].find(g=>/Bac à sable/.test(g.label));
  return {screen:T.state.screen,sandbox:!!T.state.sandbox,flag:localStorage.getItem('trace:sandbox'),site:!!document.querySelector('#siteSel option[value=demo_caen]'),card:(()=>{const c=document.querySelector('.siteCard[data-open=demo_caen]');return c?c.textContent.replace(/\s+/g,' ').trim():'';})(),real:!!document.querySelector('.siteCard[data-open=site_real]'),
    personas:og?[...og.querySelectorAll('option')].map(o=>o.value):null,plan:(()=>{const P=T.espace.planning()||{};const w=P['2026-W41']&&P['2026-W41'].aff||{};return Object.keys(w).filter(k=>!k.includes('@'));})(),karimTeam:(()=>{const P=T.espace.planning()||{};const a=P['2026-W41']&&P['2026-W41'].aff||{};return a['l:karim']&&a['l:karim']['eq:demo_caen'];})(),
    qhs:(T.qhs.runs()||[]).filter(r=>(r.sites||[]).includes('demo_caen')).length,toast:document.querySelector('#toast').textContent};});};
const adm=()=>page.evaluate(()=>({admNav:!!document.querySelector('[data-av=sandbox]'),btnOn:!!document.querySelector('[data-sbx=on]'),btnOff:!!document.querySelector('[data-sbx=off]')}));
// ── 1) connecté administrateur, un vrai chantier au serveur ; onglet Administrateur → 🧪 Bac à sable → « Mettre en place »
let out=await info();const before={site:out.site,real:out.real,personas:out.personas,screen:out.screen,sandbox:out.sandbox};
await page.evaluate(()=>document.getElementById('htAdmin').click());await page.waitForSelector('[data-av=sandbox]',{timeout:20000});await wait(200);const adm0=await adm();
await page.evaluate(()=>document.querySelector('[data-av=sandbox]').click());await wait(200);
const adm1=await adm();const n0=calls.length;
await page.evaluate(()=>document.querySelector('[data-sbx=on]').click());await wait(1800);
const adm2=await adm();const toast1=await page.evaluate(()=>document.querySelector('#toast').textContent);
out=Object.assign(await info(),{before,adm0,adm1,adm2,toast1});out.sbCalls=calls.slice(n0).filter(c=>/demo_|l:karim|l:julien|Démo/.test(c));
console.log('1) mise en place du bac à sable :',JSON.stringify(out));
C.c1=before.screen==='home'&&!before.site&&before.real&&before.personas===null&&!before.sandbox&&adm0.admNav&&!adm0.btnOn&&adm1.btnOn&&!adm1.btnOff&&adm2.btnOff&&!adm2.btnOn&&out.sandbox&&out.flag==='1'&&out.site&&/Démo — Caen Presqu'île/.test(out.card)&&/🧪 bac à sable/.test(out.card)&&out.real&&Array.isArray(out.personas)&&out.personas.includes('karim')&&out.plan.sort().join()==='l:ethan,l:julien,l:karim'&&out.karimTeam==='A'&&out.qhs===1&&/Bac à sable en place/.test(toast1)&&out.sbCalls.length===0;
// ── 2) « Voir l'appli comme » Karim : il AGIT (pas en lecture seule) ; son chantier démo, l'objectif du jour dans son Bureau ; il soude une pièce → gardée sur l'appareil, rien au serveur
await page.selectOption('#homeAs','karim');await wait(600);
out=await page.evaluate(()=>{const T=window.TRACE;const a=T.acces.current();return {id:a.id,name:a.name,test:a.test,sandbox:a.sandbox,isAdmin:T.acces.isAdmin()};});
await page.evaluate(()=>document.querySelector('.siteCard[data-open=demo_caen]').click());await wait(1500);
out.open=await page.evaluate(()=>{const T=window.TRACE;return {screen:T.state.screen,siteId:T.state.siteId,name:T.net.name,missions:(T.net.missions||{})['2026-10-09']&&T.net.missions['2026-10-09'].map(m=>m.label+'/'+(m.team||'')+'/'+(m.who||[]).join('+'))};});
await page.evaluate(()=>{const T=window.TRACE;T.state.tab='bureau';T.renderAll();});await wait(400);
out.bureau=await page.evaluate(()=>{const el=document.getElementById('bureau');const t=el?el.textContent.replace(/\s+/g,' '):'';return {obj:/Souder le tronçon 1/.test(t),team:/équipe A/.test(t)};});
const n1=calls.length;
const J=await page.evaluate(()=>{const T=window.TRACE;for(const l of Object.values(T.lines)){if(l.parent)continue;const js=(l.cond&&l.cond.A&&l.cond.A.joints)||[];for(let i=0;i<js.length;i++){if(js[i]&&js[i].status==='a_souder')return {L:l.id,i};}}return null;});
await page.evaluate(({J,PNG})=>{const T=window.TRACE;const j=T.lines[J.L].cond.A.joints[J.i];j.steps=j.steps||{};j.steps[1]={photos:[PNG]};T.openJoint(J.L,'A',J.i);},{J,PNG});await wait(500);
await page.evaluate(()=>{const s=document.querySelector('#sheet');s.querySelector('#st1-proc').value='cellu';const v=s.querySelector('#st1-vis');if(v)v.checked=true;s.querySelector('[data-stepok="1"]').click();});await wait(900);
out.weld=await page.evaluate(J=>{const T=window.TRACE;const j=T.lines[J.L].cond.A.joints[J.i];const ev=(j.events||[]).find(e=>e.type==='soudee');const net=T.net;return {status:j.status,by:ev&&ev.by,kept:!!(net.sbWelds&&net.sbWelds[j.weldId]),keptStatus:net.sbWelds&&net.sbWelds[j.weldId]&&net.sbWelds[j.weldId].status,weldId:j.weldId};},J);
out.srv=calls.slice(n1).filter(c=>/welds|events|line_state|site_set_part|demo_|l:karim/.test(c));
console.log('2) Karim agit sur la démo :',JSON.stringify(out));
C.c2=out.id==='l:karim'&&out.name==='Karim B.'&&out.test===false&&out.sandbox===true&&!out.isAdmin&&out.open.screen==='site'&&out.open.siteId==='demo_caen'&&/Démo — Caen/.test(out.open.name)&&Array.isArray(out.open.missions)&&out.open.missions.includes('Souder le tronçon 1/A/l:karim')&&out.bureau.obj&&out.bureau.team&&J&&out.weld.status==='soudee'&&out.weld.by==='karim'&&out.weld.kept&&out.weld.keptStatus==='soudee'&&out.srv.length===0;
// ── 3) rechargement (session restaurée) : le bac à sable est toujours là, la soudure de Karim aussi ; le vrai chantier aussi
await page.reload();await wait(2500);
out=await info();
await page.evaluate(()=>{const T=window.TRACE;T.state.userId='karim';T.renderHome();});await wait(300);
await page.evaluate(()=>document.querySelector('.siteCard[data-open=demo_caen]').click());await wait(1500);
out.weld=await page.evaluate(J=>{const T=window.TRACE;const j=T.lines[J.L].cond.A.joints[J.i];return {siteId:T.state.siteId,status:j.status,ev:(j.events||[]).some(e=>e.type==='soudee'&&e.by==='karim')};},J);
console.log('3) après rechargement :',JSON.stringify(out));
C.c3=out.sandbox&&out.flag==='1'&&out.site&&out.real&&Array.isArray(out.personas)&&out.personas.includes('karim')&&out.karimTeam==='A'&&out.qhs===1&&out.weld.siteId==='demo_caen'&&out.weld.status==='soudee'&&out.weld.ev;
// ── 4) retour sur mon compte → Administrateur → 🧪 → « Retirer » : plus rien (chantier, personnages, planning, pointage, quart d'heure), le vrai chantier intact, aucun appel serveur sur la démo
await page.evaluate(()=>{const T=window.TRACE;document.getElementById('btnHome').click();});await wait(400);
await page.evaluate(()=>{const T=window.TRACE;T.state.userId='__me';T.renderHome();});await wait(300);
await page.evaluate(()=>document.getElementById('htAdmin').click());await page.waitForSelector('[data-av=sandbox]',{timeout:20000});await wait(200);
await page.evaluate(()=>document.querySelector('[data-av=sandbox]').click());await wait(200);
const n3=calls.length;out={btnOff:(await adm()).btnOff};
await page.evaluate(()=>document.querySelector('[data-sbx=off]').click());await wait(2800); /* retire puis recharge la page (600 ms) */
Object.assign(out,await info());out.sbCalls=calls.slice(n3).filter(c=>/demo_|l:karim|l:julien|Démo/.test(c));out.pointages=await page.evaluate(()=>{const T=window.TRACE;const s=T.espace.state&&T.espace.state();return s&&s.pointages?s.pointages.filter(x=>!String(x.p).includes('@')).length:0;});
console.log('4) bac à sable retiré :',JSON.stringify(out));
C.c4=out.btnOff&&!out.sandbox&&out.flag===null&&!out.site&&out.card===''&&out.real&&out.personas===null&&out.plan.length===0&&out.qhs===0&&out.pointages===0&&out.sbCalls.length===0;
console.log('appels serveur citant la démo (toute la session) :',JSON.stringify(sbCalls()));
const bad=Object.entries(C).filter(([k,v])=>!v).map(([k])=>k);console.log(bad.length?'RESULTAT: ECHEC '+bad.join(','):'RESULTAT: TOUT VERT');console.log(logs.length?logs:'[]');
await browser.close();
