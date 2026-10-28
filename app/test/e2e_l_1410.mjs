// LOT L — retours d'Ethan du 14/10 au soir : liaisons étude ↔ affaire et navigation (données 100 % FICTIVES, serveur Supabase SIMULÉ dans le test).
// « j'ai des chantiers qui arrivent dans mes liaisons qui ne devraient pas être là » · « si je vais dans quantités j'ai pas les quantités, je suis obligé d'ouvrir
// mais ça m'amène dans Tracé alors que ça doit pas être dans Tracé mais juste dans le traceur de ce chiffrage » · « le retour à l'affaire est hésitant ».
// c1  affaire → traceur (contexte étude) → enregistrement → ↩ Retour : tracé lié, quantités visibles tout de suite, JAMAIS l'écran Tracé (ni la carte) pendant le retour (mesuré)
// c2  actualisation → quantités toujours là sans rien ouvrir (Quantités, version figée) ; « autre appareil » (copie locale effacée) → « ⏳ chargement du tracé… » puis les quantités
// c3  « ✎ Ouvrir dans le traceur » → traceur.html?site=…&aff=…&cv=… ; le traceur charge CE tracé dans le contexte de l'affaire, « ↩ Retour à l'affaire » ramène dans l'affaire
// c4  ouverture directe d'une étude dans l'écran Tracé (openSiteFromHome, lien index.html?site=<étude>) → redirigée (traceur / affaire), jamais l'écran Tracé
// c5  ✕ délier → actualisation → il ne revient pas (ni avec le registre local des remises effacé : a.sitesOff, repère délié)
// c6  un chantier réel, une remise en contexte chantier, une copie serveur déliée ailleurs, un chantier de démo ne sont JAMAIS liés tout seuls ; une vraie remise d'étude l'est ;
//     un vieux repère (posé par etudeSync) ne cache plus un chantier de Chantiers ; une remise d'étude qui attend son affaire reste hors Chantiers
// c7  liaison à la main : un chantier réel lié par le menu reste lié et garde « Ouvrir » (écran Tracé), pas de repère étude posé
// c8  affaire gagnée → site.marche figé (lignes de l'étude, serveur), fiche.etude.gagne ; un marché existant n'est pas touché ; le tracé devient un chantier (« Ouvrir »)
// c9  téléphone 390 px : onglet Tracé & chantiers et écran « Ouverture de l'affaire » sans débordement, boutons ≥ 34 px
// c10 console vide
import { chromium } from 'playwright';
const BASE=process.env.BASE||'http://localhost:8765';
const SB='https://pghftlepduvfazbiavhq.supabase.co';
const UID='aaaaaaaa-1111-4222-8333-444444444444';const EMAIL='chef.fictif@exemple.fr';
const profile={id:UID,email:EMAIL,name:'Camille FICTIF',role:'chef',active:true,poste:'resp_exploitation',admin:true,type:'salarie',rights:{},sites:null,prenom:'Camille',nom:'FICTIF',created_at:'2026-10-01T09:00:00Z'};
const session=()=>({access_token:'tok',token_type:'bearer',expires_in:3600,expires_at:Math.floor(Date.now()/1000)+3600,refresh_token:'ref',user:{id:UID,email:EMAIL,aud:'authenticated',role:'authenticated',app_metadata:{},user_metadata:{},created_at:'2026-10-01T09:00:00Z'}});
/* ── serveur simulé : sites (plans), registre (affaires…), parties de chantier ── */
const SITES={},REG={};const rpcs=[];let siteDelay=0;let calls=[];
const regRows=(kinds,since)=>Object.values(REG).filter(r=>kinds.includes(r.kind)&&(!since||r.updated_at>since));
const browser=await chromium.launch({headless:true, executablePath: process.env.CHROMIUM_PATH||undefined});
const ctx=await browser.newContext({viewport:{width:1280,height:900}});
await ctx.route(u=>u.href.startsWith(SB),async route=>{const req=route.request();const u=new URL(req.url());const p=u.pathname;const acc=req.headers()['accept']||'';calls.push(req.method()+' '+p+(u.search||'').slice(0,80));
  const json=(o,status=200)=>route.fulfill({status,contentType:'application/json',headers:{'access-control-allow-origin':'*'},body:JSON.stringify(o)});
  if(p==='/auth/v1/token')return json(session());if(p==='/auth/v1/user')return json(session().user);if(p.startsWith('/auth/v1/'))return json({});
  if(p==='/rest/v1/profiles'){const rows=[profile];return json(/object/.test(acc)?rows[0]:rows);}
  if(p==='/rest/v1/registre'){const m=/kind=in\.\(([^)]*)\)/.exec(decodeURIComponent(u.search));const kinds=m?m[1].split(',').map(s=>s.replace(/"/g,'')):[];const g=/updated_at=gt\.([^&]+)/.exec(u.search);return json(regRows(kinds,g?decodeURIComponent(g[1]):null));}
  if(p==='/rest/v1/rpc/registre_set'){let b={};try{b=JSON.parse(req.postData()||'{}');}catch(e){}const k=b.p_kind+'|'+b.p_id;const old=REG[k]?REG[k].data:{};let data;
    if(b.p_mode==='replace')data=b.p_patch;else{data=Object.assign({},old);Object.keys(b.p_patch||{}).forEach(x=>{if(b.p_patch[x]===null)delete data[x];else data[x]=b.p_patch[x];});}
    REG[k]={kind:b.p_kind,id:b.p_id,data,updated_at:new Date().toISOString()};rpcs.push('registre_set '+b.p_kind+' '+b.p_id+' '+Object.keys(b.p_patch||{}).join('+'));return json(REG[k]);}
  if(p==='/rest/v1/rpc/site_set_part'){let b={};try{b=JSON.parse(req.postData()||'{}');}catch(e){}rpcs.push('site_set_part '+b.p_site+' '+b.p_key);const row=SITES[b.p_site];if(!row)return json(null);row.data=Object.assign({},row.data,{[b.p_key]:b.p_value});row.updated_at=new Date().toISOString();return json({at:row.updated_at,value:b.p_value});}
  if(p.startsWith('/rest/v1/rpc/'))return json(null);
  if(p==='/rest/v1/sites'){const sel=u.searchParams.get('select')||'';const m=/id=eq\.([^&]+)/.exec(u.search);const id=m?decodeURIComponent(m[1]):null;
    if(req.method()==='POST'){let b={};try{b=JSON.parse(req.postData()||'{}');}catch(e){}const rows=Array.isArray(b)?b:[b];const prefer=req.headers()['prefer']||'';
      rows.forEach(r=>{if(SITES[r.id]&&/ignore-duplicates/.test(prefer))return;SITES[r.id]={id:r.id,name:r.name,supplier:r.supplier||null,serie:r.serie||null,data:r.data||{},updated_at:r.updated_at||new Date().toISOString()};});return json([]);}
    let rows=Object.values(SITES).filter(r=>!id||r.id===id);
    if(/sat:/.test(sel))rows=rows.map(r=>({id:r.id,name:r.name,supplier:r.supplier,updated_at:r.updated_at,geo:null,origin:null,bgo:null,sat:r.data.traceur&&r.data.traceur.savedAt||null,w:r.data.w||null,h:r.data.h||null,bbox:null,nbox:null,nw:null,deleted:r.data.deleted||null,deletedAt:r.data.deletedAt||null,builtin:null,ville:(r.data.fiche||{}).ville||null,chef:(r.data.fiche||{}).chef||null,conducteur:(r.data.fiche||{}).conducteur||null,secteur:null,etude:(r.data.fiche||{}).etude||null}));
    else if(id&&siteDelay)await new Promise(r=>setTimeout(r,siteDelay));
    return json(/object/.test(acc)?(rows[0]||null):rows);}
  if(p.startsWith('/rest/v1/'))return json(/object/.test(acc)?null:[]);
  return json([]);});
/* tuiles, géocodage, pdf.js : rien d'extérieur */
await ctx.route(u=>!u.href.startsWith(BASE)&&!u.href.startsWith(SB)&&/^https?:/.test(u.href),route=>route.fulfill({status:204,body:''}));
/* chronologie des écrans (dès le 1er octet de la page) : écran neutre, accueil, connexion, écran Tracé (aucun des trois) */
await ctx.addInitScript(()=>{window.__scr=[];const vis=e=>!!e&&getComputedStyle(e).display!=='none';
  const snap=()=>{try{const ov=document.getElementById('lzAffWait');const home=document.getElementById('homeView');const login=document.getElementById('loginView');if(!home)return;const T=window.TRACE;
    const s={ov:!!ov,home:home.classList.contains('show'),login:login&&login.classList.contains('show'),tab:T&&T.state?T.state.homeTab:null,fiche:!!document.querySelector('#eq-app .af-head'),site:T&&T.state?T.state.screen:null,head:vis(document.getElementById('siteHead'))};
    if(ov&&!window.__ovm){const r=ov.getBoundingClientRect();const b=ov.querySelector('button');window.__ovm={w:Math.round(r.width),btn:b?Math.round(b.getBoundingClientRect().height):0,vw:innerWidth};}const k=JSON.stringify(s);const L=window.__scr;if(!L.length||L[L.length-1].k!==k)L.push({t:Math.round(performance.now()),k,...s});}catch(e){}};
  const loop=()=>{snap();requestAnimationFrame(loop);};document.addEventListener('DOMContentLoaded',()=>{snap();loop();});setInterval(snap,30);});
const page=await ctx.newPage();
const logs=[];page.on('pageerror',e=>logs.push('PAGEERROR: '+e.message.slice(0,300)));page.on('console',m=>{if(m.type()==='error'&&!/realtime|websocket|Failed to fetch|net::ERR|404|400|204/i.test(m.text()))logs.push(m.text().slice(0,200));});
page.on('dialog',d=>d.accept().catch(()=>{}));
const C={};const wait=ms=>page.waitForTimeout(ms);
const N1='O2610-91';const N2='O2610-92';
const T=(fn,arg)=>page.evaluate(fn,arg);
const navs=[];page.on('request',r=>{if(r.isNavigationRequest()&&/traceur\.html/.test(r.url()))navs.push(r.url());});const lastNav=()=>navs[navs.length-1]||'';
const srvPut=v=>{SITES[v.id]={id:v.id,name:v.name,supplier:v.supplier||null,serie:v.serie||null,data:JSON.parse(JSON.stringify(v)),updated_at:new Date().toISOString()};};
const idbSet=(k,v)=>page.evaluate(([k,v])=>new Promise(res=>{const q=indexedDB.open('trace-kv',1);q.onupgradeneeded=()=>q.result.createObjectStore('kv');q.onsuccess=()=>{const tx=q.result.transaction('kv','readwrite');tx.objectStore('kv').put(v,k);tx.oncomplete=()=>res(true);tx.onerror=()=>res(false);};q.onerror=()=>res(false);}),[k,v]);
const putH=v=>{if(!/^demo_/.test(v.id))srvPut(Object.assign({},v,{sent:undefined,sentAt:undefined}));return idbSet('trace:handoff:'+v.id,v);}; /* remise du traceur : sur l'appareil ET au serveur (traceur connecté) */
const idbGet=k=>page.evaluate(k=>new Promise(res=>{const q=indexedDB.open('trace-kv',1);q.onupgradeneeded=()=>q.result.createObjectStore('kv');q.onsuccess=()=>{const g=q.result.transaction('kv','readonly').objectStore('kv').get(k);g.onsuccess=()=>res(g.result||null);g.onerror=()=>res(null);};q.onerror=()=>res(null);}),k);
const aff=n=>page.evaluate(n=>window.TRACE.affaires.get(n),n);
const openAff=async(n,tab)=>{await page.evaluate(async([n,tab])=>{document.getElementById('htCom').click();await new Promise(x=>setTimeout(x,250));const bk=document.querySelector('#eq-app [data-act=af][data-v="back|"]');if(bk){bk.click();await new Promise(x=>setTimeout(x,150));}const b=[...document.querySelectorAll('#eq-app [data-act=af]')].find(x=>x.dataset.v==='open|'+n);if(b)b.click();await new Promise(x=>setTimeout(x,200));const t=document.querySelector('#eq-app [data-act=af][data-v="tab|'+tab+'"]');if(t)t.click();},[n,tab]);await wait(350);};
const rowOf=id=>page.evaluate(id=>{const r=document.querySelector('#eq-app .lz-row[data-lzsite="'+id+'"]');if(!r)return null;return {txt:r.textContent.replace(/\s+/g,' ').trim(),et:!!r.querySelector('[data-v="etopen|'+id+'"]'),open:!!r.querySelector('[data-act="opensite"][data-v="'+id+'"]'),x:!!r.querySelector('[data-v="unlink|'+id+'"]')};},id);
const chips=()=>page.evaluate(()=>[...document.querySelectorAll('#eq-app .cm-qtchip')].map(x=>x.textContent.replace(/\s+/g,' ').trim()));
/* écran Tracé « visible » = l'appli a démarré (écran neutre déjà apparu ou TRACE défini) et aucun écran (neutre, accueil, connexion) ne le recouvre */
const screens=async()=>{const L=await page.evaluate(()=>window.__scr||[]);let started=false;const out=[];L.forEach(s=>{if(s.ov||s.site!==null)started=true;if(!started)return;const w=s.ov?'neutre':s.login?'connexion':s.home?(s.fiche&&s.tab==='commerce'?'affaire':'accueil:'+s.tab):'TRACÉ';if(!out.length||out[out.length-1].w!==w)out.push({w,t:s.t});});return out;};
// ── 0) connexion (serveur simulé), affaire en devis (fictive)
await page.goto(BASE+'/index.html');await wait(500);await page.evaluate(()=>{localStorage.clear();localStorage.setItem('trace:wide','1');});
await page.evaluate(()=>new Promise(r=>{try{const q=indexedDB.deleteDatabase('trace-kv');q.onsuccess=q.onerror=q.onblocked=()=>r();}catch(e){r();}}));
await page.reload();await wait(900);
await page.fill('#loginEmail',EMAIL);await page.fill('#loginPwd','Mot-de-passe-fictif-1');await page.click('#loginGo');await wait(1800);
await page.evaluate(async([n1,n2])=>{const mk=async(n,nom)=>{document.getElementById('htCom').click();await new Promise(x=>setTimeout(x,250));document.querySelector('#eq-app [data-act=af][data-v="new|"]').click();await new Promise(x=>setTimeout(x,150));
  document.getElementById('afn-num').value=n;document.getElementById('afn-nom').value=nom;document.getElementById('afn-client').value='CLIENT FICTIF';document.getElementById('afn-etat').value='devis';document.querySelector('#eq-app [data-act=af][data-v="create|"]').click();await new Promise(x=>setTimeout(x,300));
  const back=document.querySelector('#eq-app [data-act=af][data-v="back|"]');if(back)back.click();await new Promise(x=>setTimeout(x,150));};await mk(n1,'Réseau fictif Nord');await mk(n2,'Réseau fictif Sud');},[N1,N2]);
await wait(900);
C.c0=await page.evaluate(([a,b])=>!!(window.TRACE.state.cloudUser&&window.TRACE.affaires.get(a)&&window.TRACE.affaires.get(b)),[N1,N2])&&!!REG['affaire|'+N1];
console.log('0) connecté, affaires créées :',C.c0,Object.keys(REG).join(','));
// ── 1) traceur ouvert depuis l'affaire → dessin → enregistrement → ↩ Retour à l'affaire
await openAff(N1,'sites');
const dessin=await page.evaluate(()=>{const b=document.querySelector('#eq-app [data-act=tabgo][data-v=traceur]');return b?{aff:b.dataset.aff}:null;});
await page.evaluate(()=>{document.querySelector('#eq-app [data-act=tabgo][data-v=traceur]').click();});
await page.waitForURL(/traceur\.html/,{timeout:8000}).catch(()=>{});const urlNew=lastNav();await wait(900);
await page.evaluate(()=>{const M=window.MAQ;M.state.lines.push({id:'L'+(M.state.seq++),name:'Feeder fictif',dn:100,bar:12,pts:[[0,0],[40,0],[40,25]],specials:[],parent:null});M.rebuild();M.save();});
const nW1=await page.evaluate(()=>Object.values(window.MAQ.state.built).reduce((s,B)=>s+B.A.welds.filter(w=>!w.sst).length+B.R.welds.filter(w=>!w.sst).length,0)); /* 28/10 : les soudures de bout de ligne ne comptent pas (points de bout) */
await page.click('#bSave');await wait(250);await page.fill('#svName','Étude fictive A');await page.click('#svOk');await wait(1400);
let out={urlNew,dessin,nW1,go:await page.evaluate(()=>(document.getElementById('svGo')||{}).textContent||'')};
const E1=await page.evaluate(()=>window.MAQ.state.siteRef&&window.MAQ.state.siteRef.id);out.E1=E1;out.srv=!!SITES[E1];
await page.click('#svGo');
await page.waitForFunction(n=>{const T=window.TRACE;return T&&T.state.screen==='home'&&T.state.homeTab==='commerce'&&!document.getElementById('lzAffWait')&&!!document.querySelector('#eq-app .af-head')&&/O2610-91/.test(document.querySelector('#eq-app .af-num').textContent);},N1,{timeout:20000}).catch(()=>{});
await wait(400);
out.scr=await screens();out.ret=await T(()=>window.TRACE.liaison.ret());out.url=page.url();
out.sites=(await aff(N1)).sites;out.row=await rowOf(E1);out.tab=await T(()=>{const b=document.querySelector('#eq-app .eq-filtres .chip.active');return b?b.textContent:'';});
await page.evaluate(()=>{document.querySelector('#eq-app [data-act=af][data-v="tab|quantites"]').click();});await wait(400);out.chips=await chips();
const dt=out.ret&&out.ret.shownAt?out.ret.shownAt-out.ret.t0:null;out.ms=dt;
console.log('1) retour à l\'affaire :',JSON.stringify(out));
C.c1=/traceur\.html\?site=new&aff=O2610-91&cv=1$/.test(urlNew)&&nW1>0&&/↩ Retour à l'affaire O2610-91/.test(out.go)&&!!E1&&out.srv
  &&out.scr.length>=2&&out.scr[0].w==='neutre'&&out.scr[out.scr.length-1].w==='affaire'&&!out.scr.some(s=>s.w==='TRACÉ'||/^accueil/.test(s.w))&&dt!==null&&dt<10000
  &&out.sites.join()===E1&&/Tracé & chantiers/.test(out.tab)&&out.row&&out.row.et&&!out.row.open&&new RegExp(nW1+' soudures').test(out.row.txt)&&/étude/.test(out.row.txt)
  &&out.chips.some(c=>new RegExp('Étude fictive A · '+nW1+' soudures').test(c));
// ── 2) actualisation : quantités sans rien ouvrir ; puis « autre appareil » (copie de l'appareil effacée) : ⏳ chargement du tracé… puis les quantités
await page.goto(BASE+'/index.html');await wait(1800);await openAff(N1,'quantites');
out={chips:await chips(),opened:await T(()=>window.TRACE.state.screen)};
/* versions : « ＋ Nouvelle version » figée SANS avoir ouvert le tracé → l'instantané garde les quantités du tracé lié (pas « rien de tracé ») */
await page.evaluate(()=>{document.querySelector('#eq-app [data-act=af][data-v="tab|chiffrage"]').click();});await wait(400);
await page.evaluate(()=>{const b=document.querySelector('#eq-app [data-act=af][data-v="vnew|"]');if(b)b.click();});await wait(400);
await page.evaluate(()=>{const b=document.getElementById('vv-ok');if(b)b.click();});await wait(2000); /* le temps que la version parte au serveur (l'« autre appareil » la relira) */
out.ver=await T(([n,id])=>{const a=window.TRACE.affaires.get(n);const x=(a.chiffrages||[])[0];const t=x&&x.snap&&x.snap.traces&&x.snap.traces[id];return {v:a.chiffrageV,t:t?{soud:t.tot&&t.tot.soud,rows:(t.rows||[]).length,none:!!t.none}:null};},[N1,E1]);
await page.evaluate(()=>new Promise(r=>{try{const q=indexedDB.deleteDatabase('trace-kv');q.onsuccess=q.onerror=q.onblocked=()=>r();}catch(e){r();}}));
await page.evaluate(()=>{Object.keys(localStorage).filter(k=>k.startsWith('trace:handoff:')||k.startsWith('trace:maquette')||k.startsWith('trace:reg')).forEach(k=>localStorage.removeItem(k));});
siteDelay=2500;await page.goto(BASE+'/index.html');await wait(1800);
out.local2=await T(()=>Object.keys(window.TRACE.sites).filter(k=>/^trc_/.test(k)).length);
await openAff(N1,'quantites');await wait(250);
out.loading=await T(()=>{const t=document.getElementById('eq-app').textContent.replace(/\s+/g,' ');return {wait:/⏳ chargement du tracé…/.test(t),zero:/· 0 soudures|rien de tracé/.test(t)};});
await page.waitForFunction(()=>[...document.querySelectorAll('#eq-app .cm-qtchip')].some(x=>/soudures/.test(x.textContent)&&!/· 0 soudures/.test(x.textContent)),null,{timeout:12000}).catch(()=>{});
out.after=await chips();siteDelay=0;
console.log('2) actualisation / autre appareil :',JSON.stringify(out));
C.c2=out.chips.some(c=>new RegExp('Étude fictive A · '+nW1+' soudures').test(c))&&out.opened==='home'&&out.ver.v===2&&out.ver.t&&out.ver.t.soud===nW1&&out.ver.t.rows>0&&!out.ver.t.none&&out.local2===0&&out.loading.wait&&!out.loading.zero&&out.after.some(c=>new RegExp('Étude fictive A · '+nW1+' soudures').test(c));
// ── 3) « ✎ Ouvrir dans le traceur » : URL C6, CE tracé dans le contexte de l'affaire, retour dans l'affaire
await openAff(N1,'sites');await wait(300);
await page.evaluate(id=>{document.querySelector('#eq-app [data-v="etopen|'+id+'"]').click();},E1);
await page.waitForURL(/traceur\.html/,{timeout:8000}).catch(()=>{});const urlEt=lastNav();await wait(2200);
out={urlEt,tr:await T(()=>{const M=window.MAQ;return {ref:M.state.siteRef&&M.state.siteRef.id,lines:M.state.lines.length,badge:document.getElementById('siteBadge').textContent,top:document.getElementById('bOpenApp').textContent,ctx:localStorage.getItem('trace:maquette:ctx')};})};
await page.evaluate(()=>{const M=window.MAQ;M.state.lines.push({id:'L'+(M.state.seq++),name:'Antenne fictive',dn:65,bar:12,pts:[[40,25],[40,45]],specials:[],parent:null});M.rebuild();M.save();});
const nW2=await page.evaluate(()=>Object.values(window.MAQ.state.built).reduce((s,B)=>s+B.A.welds.filter(w=>!w.sst).length+B.R.welds.filter(w=>!w.sst).length,0)); /* 28/10 : sans les points de bout de ligne */
await page.click('#bSave');await wait(250);out.mode=await T(()=>{const s=document.getElementById('svMode');return s?s.value:null;});await page.click('#svOk');await wait(1400);
out.go=await T(()=>(document.getElementById('svGo')||{}).textContent||'');out.ref2=await T(()=>window.MAQ.state.siteRef&&window.MAQ.state.siteRef.id);
await page.click('#svGo');
await page.waitForFunction(()=>{const T=window.TRACE;return T&&T.state.homeTab==='commerce'&&!document.getElementById('lzAffWait')&&!!document.querySelector('#eq-app .lz-row');},null,{timeout:20000}).catch(()=>{});await wait(400);
out.scr=await screens();out.sites=(await aff(N1)).sites;out.row=await rowOf(E1);out.nW2=nW2;
console.log('3) étude ouverte dans le traceur :',JSON.stringify(out));
C.c3=new RegExp('traceur\\.html\\?site='+E1+'&aff=O2610-91&cv=2$').test(urlEt)&&out.tr.ref===E1&&out.tr.lines===1&&/étude O2610-91/.test(out.tr.badge)&&/Affaire/.test(out.tr.top)&&out.tr.ctx==='aff:O2610-91'
  &&out.mode==='update'&&out.ref2===E1&&/↩ Retour à l'affaire O2610-91/.test(out.go)&&!/Ouvrir dans TRACÉ/.test(out.go)&&out.scr[out.scr.length-1].w==='affaire'&&!out.scr.some(s=>s.w==='TRACÉ')
  &&out.sites.join()===E1&&out.row&&new RegExp(nW2+' soudures').test(out.row.txt)&&nW2>nW1;
// ── 4) ouverture directe d'une étude dans l'écran Tracé → redirigée
await page.evaluate(id=>{window.TRACE.openSiteFromHome(id);},E1);
navs.length=0;await page.waitForURL(/traceur\.html/,{timeout:6000}).catch(()=>{});out={a:lastNav()};await wait(1500);
out.tr=await T(()=>{const M=window.MAQ;return M?{ref:M.state.siteRef&&M.state.siteRef.id,lines:M.state.lines.length,ctx:localStorage.getItem('trace:maquette:ctx')}:null;}); /* même étude rouverte : le dessin du contexte de l'affaire est repris tel quel */
await page.goto(BASE+'/index.html?site='+E1);
await page.waitForFunction(()=>{const T=window.TRACE;return T&&T.state.homeTab==='commerce'&&!document.getElementById('lzAffWait')&&!!document.querySelector('#eq-app .af-head');},null,{timeout:20000}).catch(()=>{});await wait(500);
out.scr=await screens();out.b={screen:await T(()=>window.TRACE.state.screen),num:await T(()=>(document.querySelector('#eq-app .af-num')||{}).textContent||''),marche:await T(id=>!!(window.TRACE.sites[id]||{}).marche,E1),ts:await T(id=>!!(window.TRACE.sites[id]||{}).ts,E1)};
console.log('4) ouverture directe redirigée :',JSON.stringify(out));
C.c4=new RegExp('traceur\\.html\\?site='+E1+'&aff=O2610-91&cv=2$').test(out.a)&&out.tr&&out.tr.ref===E1&&out.tr.lines===2&&out.tr.ctx==='aff:O2610-91'&&out.b.screen==='home'&&/O2610-91/.test(out.b.num)&&!out.scr.some(s=>s.w==='TRACÉ')&&!out.b.ts;
// ── 5) ✕ délier une étude → actualisation → elle ne revient pas (ni sans le registre local des remises)
const now36=()=>'trc_'+Date.now().toString(36);
const mkNet=(id,name,o)=>Object.assign({id,name,supplier:'AXIOM',serie:1,source:'traceur',w:100,h:100,lines:[{id:'L1',name:'Ligne fictive',dn:80,bar:12,traceur:true,axis:[[0,0],[24,0]],e:0.3,endType:'kit',startType:'sousstation',
  cond:{A:{els:[{id:'P1',kind:'pipe',dn:80,len:12,m0:0,m1:12,axis:[[[0,0],[12,0]]],from:[0,0],to:[12,0]},{id:'P2',kind:'pipe',dn:80,len:12,m0:12,m1:24,axis:[[[12,0],[24,0]]],from:[12,0],to:[24,0]}],welds:[{idx:0,weldId:'S-0001',m:12,dn:80}],length:24},
        R:{els:[{id:'P1',kind:'pipe',dn:80,len:12,m0:0,m1:12,axis:[[[0,.3],[12,.3]]],from:[0,.3],to:[12,.3]},{id:'P2',kind:'pipe',dn:80,len:12,m0:12,m1:24,axis:[[[12,.3],[24,.3]]],from:[12,.3],to:[24,.3]}],welds:[{idx:0,weldId:'S-0002',m:12,dn:80}],length:24}}}],
  traceur:{v:1,lines:[],savedAt:new Date().toISOString()}},o||{});
const E2=now36();await wait(5);
await putH(mkNet(E2,'Étude fictive B',{fiche:{etude:{aff:N1,at:new Date().toISOString()}}}));
await page.goto(BASE+'/index.html');await wait(2200);
out={auto:(await aff(N1)).sites};await openAff(N1,'sites');out.row=await rowOf(E2);
await page.evaluate(id=>{document.querySelector('#eq-app [data-v="unlink|'+id+'"]').click();},E2);await wait(500);
await wait(1500);out.after=(await aff(N1)).sites;out.off=!!((await aff(N1)).sitesOff||{})[E2];out.srvOff=!!((REG['affaire|'+N1]||{}).data||{sitesOff:{}}).sitesOff&&!!REG['affaire|'+N1].data.sitesOff[E2];
out.mark=await T(id=>window.TRACE.liaison.mark(id),E2);
await page.goto(BASE+'/index.html');await wait(2200);out.reload=(await aff(N1)).sites;
await page.evaluate(()=>localStorage.removeItem('trace:etudeRemises'));await page.goto(BASE+'/index.html');await wait(2200);out.reload2=(await aff(N1)).sites;
out.inChantiers=await T(id=>window.TRACE.etude.metas().includes(id),E2);
console.log('5) ✕ qui tient :',JSON.stringify(out));
C.c5=out.auto.includes(E2)&&out.row&&out.row.et&&!out.after.includes(E2)&&out.off&&out.srvOff&&out.mark&&!!out.mark.delie&&!out.reload.includes(E2)&&!out.reload2.includes(E2)&&out.inChantiers;
// ── 6) jamais lié tout seul : chantier réel (repère posé plus tard, comme etudeSync), remise en contexte chantier, copie serveur déliée ailleurs, chantier de démo ; une vraie remise : oui
const R1='trc_'+(Date.now()-5*86400e3).toString(36);const R2=now36();await wait(3);const R3=now36();await wait(3);const S1=now36();await wait(3);const E3=now36();await wait(3);const G1=now36();
await putH(mkNet(R1,'Chantier réel fictif',{fiche:{etude:{at:new Date().toISOString(),aff:N2}}}));
await putH(mkNet(R2,'Chantier en contexte chantier',{fiche:{etude:{aff:N2,at:new Date().toISOString()}},traceur:{v:1,lines:[],ctx:'chantier',savedAt:new Date().toISOString()}}));
await putH(mkNet(R3,'Chantier avec soudures',{fiche:{etude:{aff:N2,at:new Date().toISOString()},chef:'Chef fictif'}}));
await putH(mkNet('demo_fictif','Démo fictive',{fiche:{etude:{aff:N2,at:new Date().toISOString()}}}));
await putH(Object.assign(mkNet(S1,'Copie serveur déliée',{fiche:{etude:{aff:N2,at:new Date().toISOString()}}}),{sent:true,sentAt:Date.now()}));
REG['affaire|'+N2].data.sitesOff={[S1]:new Date(Date.now()+1000).toISOString()};REG['affaire|'+N2].updated_at=new Date().toISOString(); /* délié sur un autre appareil */
await putH(mkNet(E3,'Étude fictive C',{fiche:{etude:{aff:N2,at:new Date().toISOString()}},traceur:{v:1,lines:[],ctx:'etude',savedAt:new Date().toISOString()}}));
await putH(mkNet(G1,'Étude d\'une affaire pas encore reçue',{fiche:{etude:{aff:'O2610-99',at:new Date().toISOString()}}})); /* remise d'étude en attente de son affaire : cachée de Chantiers, pas liée */
await page.goto(BASE+'/index.html');await wait(3000);
out={sites:(await aff(N2)).sites||[],kinds:await T(ids=>ids.map(id=>window.TRACE.liaison.kind(id)),[R1,R2,R3,'demo_fictif',S1,E3]),
  r1:await T(id=>({of:window.TRACE.etude.of(id),list:window.TRACE.etude.metas().includes(id)}),R1),g1:await T(id=>({of:window.TRACE.etude.of(id),list:window.TRACE.etude.metas().includes(id)}),G1)};
out.bain=await T(n=>{const T=window.TRACE;T.etude.addSite(Object.assign(JSON.parse(JSON.stringify(T.sites.bain)),{fiche:{etude:{aff:n,at:new Date().toISOString()}}}));const k=T.liaison.link('test');return {k,linked:(T.affaires.get(n).sites||[]).includes('bain')};},N2);
console.log('6) jamais lié tout seul :',JSON.stringify(out));
C.c6=out.sites.join()===E3&&out.r1.of===false&&out.r1.list&&out.g1.of===true&&!out.g1.list&&!out.sites.includes(R1)&&!out.sites.includes(R2)&&!out.sites.includes(R3)&&!out.sites.includes('demo_fictif')&&!out.sites.includes(S1)&&out.kinds[2]==='chantier'&&out.kinds[1]==='chantier'&&out.kinds[3]==='demo'&&out.bain.k===0&&!out.bain.linked;
// ── 7) liaison à la main : un chantier réel lié par le menu reste lié et garde « Ouvrir » (écran Tracé)
await openAff(N2,'sites');
await page.evaluate(id=>{const s=document.getElementById('afs-site');s.value=id;document.querySelector('#eq-app [data-act=af][data-v="link|"]').click();},R1);await wait(600);
out={sites:(await aff(N2)).sites,row:await rowOf(R1),mark:await T(id=>window.TRACE.liaison.mark(id),R1),etude:await T(id=>window.TRACE.etude.of(id),R1)};
await page.goto(BASE+'/index.html');await wait(2200);out.reload=(await aff(N2)).sites;
await openAff(N2,'sites');await page.evaluate(id=>{document.querySelector('#eq-app [data-act="opensite"][data-v="'+id+'"]').click();},R1);
await page.waitForFunction(id=>window.TRACE.state.screen==='site'&&window.TRACE.state.siteId===id,R1,{timeout:10000}).catch(()=>{});
out.open={screen:await T(()=>window.TRACE.state.screen),site:await T(()=>window.TRACE.state.siteId),marche:await T(()=>!!window.TRACE.ts.marche())}; /* vraie ouverture après des fiches construites en arrière-plan : construction complète (marché figé à la 1re ouverture du chantier) */
console.log('7) liaison à la main :',JSON.stringify(out));
C.c7=out.sites.includes(R1)&&out.row&&out.row.open&&!out.row.et&&out.mark===null&&out.etude===false&&out.reload.includes(R1)&&out.open.screen==='site'&&out.open.site===R1&&out.open.marche;
// ── 8) affaire gagnée → marché figé sur les tracés d'étude SANS marché (E5 : jamais de marché avant, même après les rendus qui construisent ses fiches), fiche.etude.gagne ;
//       un marché existant n'est pas touché (E4 ; E1 si le traceur lui en a déjà posé un) ; le tracé devient un chantier (« Ouvrir »)
const E4=now36();await wait(3);const E5=now36();const M0={v:1,at:'2026-01-02T03:04:05.000Z',source:'traceur',lines:[],tot:{soud:999}};
await putH(mkNet(E4,'Étude fictive D',{fiche:{etude:{aff:N1,at:new Date().toISOString()}},marche:M0}));
await putH(mkNet(E5,'Étude fictive E',{fiche:{etude:{aff:N1,at:new Date().toISOString()}},traceur:{v:1,lines:[],ctx:'etude',savedAt:new Date().toISOString()}}));
await page.goto(BASE+'/index.html');await wait(2400);await openAff(N1,'quantites');await wait(300);await openAff(N1,'fiche');
out={before:await T(([e1,e5])=>{const S=window.TRACE.sites;return {e1:S[e1]&&S[e1].marche?S[e1].marche.at:null,e5:!!(S[e5]&&S[e5].marche),e5ts:!!(S[e5]&&S[e5].ts),built:!!(window.TRACE.etude.qty(e5)||{rows:[]}).rows.length};},[E1,E5]),sites:(await aff(N1)).sites};
await page.evaluate(()=>{const s=document.querySelector('#eq-app [data-afin=etat]');s.value='a_debuter';s.dispatchEvent(new Event('change',{bubbles:true}));});await wait(2500);
out.after=await T(([e1,e4,e5])=>{const S=window.TRACE.sites;const m=S[e5]&&S[e5].marche;const m1=S[e1]&&S[e1].marche;return {e5:m?{n:m.lines.length,soud:m.tot.soud,gain:m.gain}:null,g:((S[e5]||{}).fiche||{}).etude,e4:S[e4]&&S[e4].marche&&S[e4].marche.at,e1:m1?{at:m1.at,n:m1.lines.length,soud:m1.tot.soud}:null,etude:window.TRACE.etude.of(e5)};},[E1,E4,E5]);
out.kv=!!((await idbGet('trace:handoff:'+E5))||{}).marche;out.srv=rpcs.filter(r=>r==='site_set_part '+E5+' marche').length;out.srvM=!!(SITES[E5]&&SITES[E5].data.marche);
await page.evaluate(()=>{document.querySelector('#eq-app [data-act=af][data-v="tab|sites"]').click();});await wait(400);out.row=await rowOf(E5);
console.log('8) affaire gagnée :',JSON.stringify(out));
C.c8=out.sites.includes(E1)&&out.sites.includes(E4)&&out.sites.includes(E5)&&!out.before.e5&&!out.before.e5ts&&out.before.built&&out.after.e5&&out.after.e5.n===1&&out.after.e5.soud===2&&out.after.e5.gain===N1&&out.after.g&&out.after.g.gagne===true
  &&out.after.e4===M0.at&&(out.before.e1?out.after.e1&&out.after.e1.at===out.before.e1:out.after.e1&&out.after.e1.n===2&&out.after.e1.soud===nW2)&&out.after.etude===false&&out.kv&&out.srv>=1&&out.srvM&&out.row&&out.row.open&&!out.row.et&&/marché figé/.test(out.row.txt);
// ── 9) téléphone 390 px : Tracé & chantiers + écran neutre du retour, sans débordement, boutons ≥ 34 px
await page.setViewportSize({width:390,height:844});await page.evaluate(()=>localStorage.removeItem('trace:wide'));
await page.goto(BASE+'/index.html?aff='+N2);
const ov=await T(()=>window.__ovm||null);
await page.waitForFunction(()=>!!document.querySelector('#eq-app .lz-row'),null,{timeout:15000}).catch(()=>{});await wait(400);
out={ov,m:await T(()=>{const rows=[...document.querySelectorAll('#eq-app .lz-row')];const over=[...document.querySelectorAll('#eq-app .lz-row, #eq-app .lz-row *')].filter(e=>{const r=e.getBoundingClientRect();return r.right>391||r.left<-1;}).length;
  const btns=[...document.querySelectorAll('#eq-app .lz-row button')].map(b=>Math.round(b.getBoundingClientRect().height));return {rows:rows.length,over,btns,sw:document.documentElement.scrollWidth,bw:document.body.scrollWidth};})};
console.log('9) téléphone 390 px :',JSON.stringify(out));
C.c9=out.ov&&out.ov.w<=391&&out.ov.btn>=34&&out.m.rows>=1&&out.m.over===0&&out.m.btns.every(h=>h>=34)&&out.m.sw<=391;
C.c10=logs.length===0;
const bad=Object.entries(C).filter(([k,v])=>!v).map(([k])=>k);console.log(bad.length?'RESULTAT: ECHEC '+bad.join(','):'RESULTAT: TOUT VERT');console.log(logs.length?logs:'[]');
await browser.close();
