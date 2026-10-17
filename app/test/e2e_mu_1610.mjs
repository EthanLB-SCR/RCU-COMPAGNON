// LOT MU — chantier mutualisé (option A validée par Ethan le 16/10 au soir) : « Ajouter au chantier en cours ». Données 100 % FICTIVES (ville « Villefictive »,
// affaires O25xx / O26xx fictives), serveur Supabase SIMULÉ dans le test (sites, soudures, registre, parties de chantier). Les tracés sont faits par le VRAI traceur.
// c1  gain de l'affaire 2026 → « ➕ Ajouter au chantier en cours » (les deux tracés géoréférencés : conversion directe) : lignes rattachées (affaire, n° de soudure neufs,
//     prolongement de l'antenne 2025 → départ « sur attente existante »), site.affaires, marché 2026 à part, a.sites / a.mutu, étude versée (hors Chantiers)
// c2  gain de l'affaire 2027 → « Ajouter » SANS géoréférencement : calage dans le traceur (l'étude posée en plan provisoire, ⟲ 2 points), retour, confirmation, lignes calées
// c3  terrain : un seul chantier (Chantiers), plan avec toutes les lignes, puce « Toutes · 2025 · 2026 · 2027 » (plan, liste, récap filtrés, liseré), soudure sur une ligne 2026
// c4  commerce par affaire : quantités du tracé, avancement, facturation (bandeau), DOE (puce) — chaque affaire ses lignes
// c5  marché et TS séparés : aucun écart / TS parasite (appli, onglet Modifs, traceur) ; un TS d'une ligne 2026 ne va que dans 2026 ; ré-enregistrement du traceur : affaires gardées
// c6  « ↩ Annuler le rattachement » avant soudure (2027) : chantier sans ses lignes, l'affaire repart sur son étude
// c7  après une soudure (2026) : refus expliqué (« Détacher » = étape suivante), rien ne change
// c8  chantier à une seule affaire inchangé (pas de puce, mêmes quantités) ; « Nouveau chantier » au gain = comme avant
// c9  téléphone 390 px : puces ≥ 40 px, fenêtres et onglet sans débordement
// c10 console vide
import { chromium } from 'playwright';
import { mkdirSync } from 'node:fs';
const BASE=process.env.BASE||'http://localhost:8802';
const SHOTS=process.env.SHOTS||'/root/work/mu_shots';try{mkdirSync(SHOTS,{recursive:true});}catch(e){}
const SB='https://pghftlepduvfazbiavhq.supabase.co';
const UID='aaaaaaaa-1111-4222-8333-555555555555';const EMAIL='chef.mutu@exemple.fr';
const profile={id:UID,email:EMAIL,name:'Camille FICTIVE',role:'chef',active:true,poste:'resp_exploitation',admin:true,type:'salarie',rights:{},sites:null,prenom:'Camille',nom:'FICTIVE',created_at:'2026-10-01T09:00:00Z'};
const session=()=>({access_token:'tok',token_type:'bearer',expires_in:3600,expires_at:Math.floor(Date.now()/1000)+3600,refresh_token:'ref',user:{id:UID,email:EMAIL,aud:'authenticated',role:'authenticated',app_metadata:{},user_metadata:{},created_at:'2026-10-01T09:00:00Z'}});
/* ── serveur simulé ── */
const SITES={},REG={},WELDS={};const rpcs=[];const posts=[];
const nowIso=()=>new Date().toISOString();
const regRows=(kinds,since)=>Object.values(REG).filter(r=>kinds.includes(r.kind)&&(!since||r.updated_at>since));
const regPut=(kind,id,data)=>{REG[kind+'|'+id]={kind,id,data:JSON.parse(JSON.stringify(data)),updated_at:nowIso()};};
const browser=await chromium.launch({headless:true,executablePath:process.env.CHROMIUM_PATH||undefined});
async function route(ctx){
  await ctx.route(u=>u.href.startsWith(SB),async rt=>{const req=rt.request();const u=new URL(req.url());const p=u.pathname;const acc=req.headers()['accept']||'';
    const json=(o,status=200)=>rt.fulfill({status,contentType:'application/json',headers:{'access-control-allow-origin':'*'},body:JSON.stringify(o)});
    if(p==='/auth/v1/token')return json(session());if(p==='/auth/v1/user')return json(session().user);if(p.startsWith('/auth/v1/'))return json({});
    if(p==='/rest/v1/profiles'){const rows=[profile];return json(/object/.test(acc)?rows[0]:rows);}
    if(p==='/rest/v1/registre'){const m=/kind=in\.\(([^)]*)\)/.exec(decodeURIComponent(u.search));const kinds=m?m[1].split(',').map(s=>s.replace(/"/g,'')):[];const g=/updated_at=gt\.([^&]+)/.exec(u.search);return json(regRows(kinds,g?decodeURIComponent(g[1]):null));}
    if(p==='/rest/v1/rpc/registre_set'){let b={};try{b=JSON.parse(req.postData()||'{}');}catch(e){}const k=b.p_kind+'|'+b.p_id;const old=REG[k]?REG[k].data:{};let data;
      if(b.p_mode==='replace')data=b.p_patch;else{data=Object.assign({},old);Object.keys(b.p_patch||{}).forEach(x=>{if(b.p_patch[x]===null)delete data[x];else data[x]=b.p_patch[x];});}
      REG[k]={kind:b.p_kind,id:b.p_id,data,updated_at:nowIso()};rpcs.push('registre_set '+b.p_kind+' '+b.p_id+' '+Object.keys(b.p_patch||{}).join('+'));return json(REG[k]);}
    if(p==='/rest/v1/rpc/site_set_part'){let b={};try{b=JSON.parse(req.postData()||'{}');}catch(e){}rpcs.push('site_set_part '+b.p_site+' '+b.p_key);const row=SITES[b.p_site];if(!row)return json(null);row.data=Object.assign({},row.data,{[b.p_key]:b.p_value});row.updated_at=nowIso();return json({at:row.updated_at,value:b.p_value});}
    if(p.startsWith('/rest/v1/rpc/'))return json(null);
    if(p==='/rest/v1/sites'){const sel=u.searchParams.get('select')||'';const m=/id=eq\.([^&]+)/.exec(u.search);const id=m?decodeURIComponent(m[1]):null;
      if(req.method()==='POST'){let b={};try{b=JSON.parse(req.postData()||'{}');}catch(e){}const rows=Array.isArray(b)?b:[b];const prefer=req.headers()['prefer']||'';
        rows.forEach(r=>{if(SITES[r.id]&&/ignore-duplicates/.test(prefer))return;posts.push('site '+r.id);SITES[r.id]={id:r.id,name:r.name,supplier:r.supplier||null,serie:r.serie||null,data:r.data||{},updated_at:r.updated_at||nowIso()};});return json([]);}
      let rows=Object.values(SITES).filter(r=>!id||r.id===id);
      if(/sat:/.test(sel))rows=rows.map(r=>({id:r.id,name:r.name,supplier:r.supplier,updated_at:r.updated_at,geo:r.data.geo||null,origin:null,bgo:null,sat:r.data.traceur&&r.data.traceur.savedAt||null,w:r.data.w||null,h:r.data.h||null,bbox:null,nbox:null,nw:null,deleted:r.data.deleted||null,deletedAt:r.data.deletedAt||null,builtin:null,ville:(r.data.fiche||{}).ville||null,chef:(r.data.fiche||{}).chef||null,conducteur:(r.data.fiche||{}).conducteur||null,secteur:null,etude:(r.data.fiche||{}).etude||null}));
      return json(/object/.test(acc)?(rows[0]||null):rows);}
    if(p==='/rest/v1/welds'){if(req.method()==='POST'){let b={};try{b=JSON.parse(req.postData()||'{}');}catch(e){}(Array.isArray(b)?b:[b]).forEach(r=>{WELDS[r.site_id+'|'+r.weld_id]=r;posts.push('weld '+r.site_id+' '+r.weld_id+' '+r.status);});return json([]);}
      const m=/site_id=eq\.([^&]+)/.exec(u.search);const sid=m?decodeURIComponent(m[1]):null;return json(Object.values(WELDS).filter(r=>!sid||r.site_id===sid).map(r=>({weld_id:r.weld_id,line_id:r.line_id,cond:r.cond,status:r.status,data:r.data||{}})));}
    if(p.startsWith('/storage/v1/'))return json({Key:'x',signedURL:'/x'});
    if(p.startsWith('/rest/v1/'))return json(/object/.test(acc)?null:[]);
    return json([]);});
  await ctx.route(u=>!u.href.startsWith(BASE)&&!u.href.startsWith(SB)&&/^https?:/.test(u.href),rt=>rt.fulfill({status:204,body:''}));}
const ctx=await browser.newContext({viewport:{width:1366,height:900}});await route(ctx);
const page=await ctx.newPage();
const logs=[],warns=[];const watch=pg=>{pg.on('console',m=>{if(m.type()==='warning')warns.push(m.text().slice(0,160));});pg.on('pageerror',e=>logs.push('PAGEERROR: '+e.message.slice(0,300)));pg.on('console',m=>{if(m.type()==='error'&&!/realtime|websocket|Failed to fetch|net::ERR|404|400|204/i.test(m.text()))logs.push(m.text().slice(0,200));});pg.on('dialog',d=>d.accept().catch(()=>{}));};watch(page);
const C={};const wait=ms=>page.waitForTimeout(ms);const T=(fn,arg)=>page.evaluate(fn,arg);
const shot=async(pg,name)=>{try{await pg.screenshot({path:SHOTS+'/'+name+'.png'});}catch(e){console.log('capture '+name+' : '+e.message);}};
const A25='O2501-81',A26='O2610-82',A27='O2610-83',A28='O2610-85',AD='O2410-84';
const CLIENT='RÉGIE FICTIVE DES RÉSEAUX',VILLE='Villefictive';
const idbSet=(pg,k,v)=>pg.evaluate(([k,v])=>new Promise(res=>{const q=indexedDB.open('trace-kv',1);q.onupgradeneeded=()=>q.result.createObjectStore('kv');q.onsuccess=()=>{const tx=q.result.transaction('kv','readwrite');tx.objectStore('kv').put(v,k);tx.oncomplete=()=>res(true);tx.onerror=()=>res(false);};q.onerror=()=>res(false);}),[k,v]);
const idbGet=(pg,k)=>pg.evaluate(k=>new Promise(res=>{const q=indexedDB.open('trace-kv',1);q.onupgradeneeded=()=>q.result.createObjectStore('kv');q.onsuccess=()=>{const g=q.result.transaction('kv','readonly').objectStore('kv').get(k);g.onsuccess=()=>res(g.result||null);g.onerror=()=>res(null);};q.onerror=()=>res(null);}),k);
const login=async pg=>{await pg.goto(BASE+'/index.html');await pg.waitForTimeout(500);await pg.evaluate(()=>{localStorage.clear();localStorage.setItem('trace:wide','1');});
  await pg.evaluate(()=>new Promise(r=>{try{const q=indexedDB.deleteDatabase('trace-kv');q.onsuccess=q.onerror=q.onblocked=()=>r();}catch(e){r();}}));await pg.reload();await pg.waitForTimeout(900);
  await pg.fill('#loginEmail',EMAIL);await pg.fill('#loginPwd','Mot-de-passe-fictif-1');await pg.click('#loginGo');await pg.waitForTimeout(1800);};
const openAff=async(pg,n,tab)=>{await pg.evaluate(async([n,tab])=>{const T=window.TRACE;T.showScreen('home');document.getElementById('htCom').click();await new Promise(x=>setTimeout(x,250));
  const S=T.affaires.state();S.view='fiche';S.cur=n;S.vview=null;S.tab='fiche';T.renderHome();await new Promise(x=>setTimeout(x,200));const t=document.querySelector('#eq-app [data-act=af][data-v="tab|'+tab+'"]');if(t)t.click();},[n,tab]);await pg.waitForTimeout(450);};
/* un tracé fait par le traceur (lignes brutes posées, reconstruites, 💾 Enregistrer) → id du chantier / de l'étude */
const traceur=async(url,lines,name)=>{await page.goto(BASE+'/traceur.html'+url);await wait(1300);
  await page.evaluate(L=>{const M=window.MAQ;M.state.supplier='AXIOM';M.state.serie=1;M.state.lines=JSON.parse(JSON.stringify(L));M.state.seq=L.length+1;M.setMode('select');M.rebuild();M.save();},lines);await wait(300);
  await page.click('#bSave');await wait(250);await page.fill('#svName',name);await page.click('#svOk');await wait(1500);return page.evaluate(()=>window.MAQ.state.siteRef&&window.MAQ.state.siteRef.id);};
// ── 0) connexion (serveur simulé), affaires fictives
regPut('affaire',A25,{num:A25,nom:'Réseau de chaleur Villefictive 2025',client:CLIENT,ville:VILLE,etat:'en_cours',secteur:'ouest',sites:[],at:'2025-03-01T09:00:00Z'});
regPut('affaire',A26,{num:A26,nom:'Extension Villefictive 2026',client:CLIENT,ville:VILLE,etat:'devis',secteur:'ouest',sites:[],offre:{remiseAt:'2026-09-20T09:00:00Z'},at:'2026-09-01T09:00:00Z'});
regPut('affaire',A27,{num:A27,nom:'Antenne Villefictive 2027',client:CLIENT,ville:VILLE,etat:'devis',secteur:'ouest',sites:[],offre:{remiseAt:'2026-09-21T09:00:00Z'},at:'2026-09-02T09:00:00Z'});
regPut('affaire',A28,{num:A28,nom:'Quartier fictif 2026',client:'AUTRE CLIENT FICTIF',ville:'Autreville',etat:'devis',secteur:'ouest',sites:[],offre:{remiseAt:'2026-09-22T09:00:00Z'},at:'2026-09-03T09:00:00Z'});
regPut('affaire',AD,{num:AD,nom:'Chantier seul fictif 2024',client:'CLIENT SEUL FICTIF',ville:'Seulville',etat:'en_cours',secteur:'ouest',sites:[],at:'2024-10-01T09:00:00Z'});
await login(page);
C.c0=await T(n=>!!(window.TRACE.state.cloudUser&&window.TRACE.affaires.get(n)),A26);console.log('0) connecté, affaires fictives :',C.c0);
// ── tracés : chantier 2025 (ligne + antenne), chantier seul, études 2026 / 2027 / 2028 (traceur réel)
const L25=[{id:'L1',name:'Feeder fictif',dn:100,bar:12,pts:[[0,0],[60,0],[120,0]],specials:[],parent:null},{id:'L2',name:'Antenne Nord fictive',dn:80,bar:12,pts:[[60,0],[60,-50]],specials:[],parent:{line:'L1',m:60,side:1}}];
const CID=await traceur('?site=new',L25,'Villefictive 2025');
const DID=await traceur('?site=new',[{id:'L1',name:'Ligne seule fictive',dn:80,bar:12,pts:[[0,0],[80,0]],specials:[],parent:null}],'Chantier seul fictif 2024');
/* étude 2026, dans SON repère (tourné de 30°) : son départ (0,0) prolonge l'antenne 2025 (bout en (60,−50)) */
const L26=[{id:'L1',name:'Prolongement Nord 2026',dn:80,bar:12,pts:[[0,0],[0,-40],[30,-40]],specials:[],parent:null},{id:'L2',name:'Antenne Est 2026',dn:65,bar:12,pts:[[15,-40],[15,-62]],specials:[],parent:{line:'L1',m:55,side:1}}];
const EID=await traceur('?site=new&aff='+A26,L26,'Étude Villefictive 2026');
const L27=[{id:'L1',name:'Antenne Ouest 2027',dn:80,bar:12,pts:[[0,0],[50,0]],specials:[],parent:null}];
const E27=await traceur('?site=new&aff='+A27,L27,'Étude Villefictive 2027');
const E28=await traceur('?site=new&aff='+A28,[{id:'L1',name:'Ligne quartier fictif',dn:65,bar:12,pts:[[0,0],[36,0]],specials:[],parent:null}],'Étude Quartier fictif 2026');
console.log('   tracés :',JSON.stringify({CID,DID,EID,E27,E28,srv:[CID,DID,EID,E27,E28].map(id=>!!SITES[id])}));
/* géoréférencements fictifs (Lambert 93) : chantier 2025 nord en haut ; étude 2026 tournée de 30° — vrai déplacement : p_c = R30·p_e + (60,−50) */
const th=30*Math.PI/180,cs=Math.cos(th),sn=Math.sin(th);const X0=480000,Y0=6670000;
const geoC={crs:'EPSG:2154',aff:{a:1,b:0,c:0,d:-1,e:X0,f:Y0},pts:[]};const geoE={crs:'EPSG:2154',aff:{a:cs,b:-sn,e:60+X0,c:-sn,d:-cs,f:Y0+50},pts:[]};
const patchSite=async(id,o)=>{const r=SITES[id];if(r){r.data=Object.assign({},r.data,o);r.updated_at=nowIso();}const h=await idbGet(page,'trace:handoff:'+id);if(h)await idbSet(page,'trace:handoff:'+id,Object.assign({},h,o,r?{updated_at:r.updated_at}:{}));};
await page.goto(BASE+'/index.html');await wait(1500);
await patchSite(CID,{geo:geoC,fiche:{ville:VILLE}});await patchSite(EID,{geo:geoE});await patchSite(E28,{geo:{crs:'EPSG:2154',aff:{a:1,b:0,c:0,d:-1,e:X0+200,f:Y0-60},pts:[]}}); /* étude 2028 : géoréférencée, 200 m à l'est, 60 m au sud du chantier */await patchSite(DID,{fiche:{ville:'Seulville'}});
const set=(n,o)=>{const k='affaire|'+n;REG[k].data=Object.assign({},REG[k].data,o);REG[k].updated_at=nowIso();};
set(A25,{sites:[CID]});set(AD,{sites:[DID]});set(A26,{sites:[EID]});set(A27,{sites:[E27]});set(A28,{sites:[E28]});
/* chantier 2025 en cours : 3 soudures déjà faites (serveur) */
const cW=(SITES[CID].data.lines||[]).flatMap(L=>['A','R'].flatMap(c=>((L.cond[c]||{}).welds||[]).map(w=>({line:L.id,c,id:w.weldId}))));
cW.slice(0,3).forEach(w=>{WELDS[CID+'|'+w.id]={site_id:CID,weld_id:w.id,line_id:w.line,cond:w.c,status:'soudee',data:{events:[{type:'soudee',by:'Soudeur fictif',at:'2026-10-10T10:00:00Z'}],photos:[]}};});
const marche25=JSON.parse(JSON.stringify(SITES[CID].data.marche||null));const nLines25=SITES[CID].data.lines.length,nW25=cW.length;
await page.evaluate(()=>{Object.keys(localStorage).filter(k=>/^trace:reg/.test(k)).forEach(k=>localStorage.removeItem(k));});
await page.evaluate(()=>new Promise(r=>{const q=indexedDB.open('trace-kv',1);q.onsuccess=()=>{const tx=q.result.transaction('kv','readwrite');const st=tx.objectStore('kv');st.delete('trace:reg:affaire');st.delete('trace:regPending');tx.oncomplete=()=>r();tx.onerror=()=>r();};q.onerror=()=>r();}));
await page.reload();await wait(2500);
console.log('   chantier 2025 :',JSON.stringify({lignes:nLines25,soudures:nW25,marche:!!marche25,sites26:(await T(n=>window.TRACE.affaires.get(n).sites,A26))}));
// ── 1) gain 2026 → « ➕ Ajouter au chantier en cours » (géoréférencé)
await openAff(page,A26,'offre');
await page.evaluate(()=>{const b=document.querySelector('#eq-app [data-act=af][data-v="ogagne|"]');if(b)b.click();});await wait(500);
let out={choice:await T(()=>{const m=document.getElementById('muChoice');if(!m)return null;return {txt:m.textContent.replace(/\s+/g,' ').slice(0,2000),sites:[...m.querySelectorAll('input[name=muSite]')].map(x=>x.value),checked:(m.querySelector('input[name=muSite]:checked')||{}).value,nw:!!document.getElementById('muNew')};})};
await shot(page,'pc_1_gain_choix');
await page.evaluate(()=>document.getElementById('muAdd').click());
await page.waitForSelector('#muConf',{timeout:15000}).catch(()=>{});await wait(300);
out.conf=await T(()=>{const m=document.getElementById('muConf');return m?{txt:m.textContent.replace(/\s+/g,' '),nom:(document.getElementById('muNom')||{}).value}:null;});
await shot(page,'pc_2_rattacher_confirmation');
await page.evaluate(()=>document.getElementById('muGo').click());
await page.waitForFunction(n=>{const a=window.TRACE.affaires.get(n);return a&&a.mutu&&!document.querySelector('#modal.show');},A26,{timeout:20000}).catch(()=>{});await wait(1500);
const S1=JSON.parse(JSON.stringify(SITES[CID].data));const a26=REG['affaire|'+A26].data;
const lines26=S1.lines.filter(l=>l.aff===A26);const p26=lines26.find(l=>!l.parent);
const allW=S1.lines.flatMap(L=>['A','R'].flatMap(c=>((L.cond[c]||{}).welds||[]).map(w=>w.weldId)));
out.res={affaires:S1.affaires,name:S1.name,n:S1.lines.length,n26:lines26.length,raw26:(S1.traceur.lines||[]).filter(l=>l.aff===A26).length,start:p26&&p26.axis[0],st:p26&&p26.startType,ends:p26&&p26.ends&&p26.ends.start,
  dupW:allW.length-new Set(allW).size,mA:Object.keys(S1.marchesAff||{}),m25same:JSON.stringify(S1.marche)===JSON.stringify(marche25),etat:a26.etat,sites:a26.sites,mutu:a26.mutu&&{site:a26.mutu.site,etude:a26.mutu.etude},
  verse:((SITES[EID].data.fiche||{}).etude||{}).verse,etudeOf:await T(id=>window.TRACE.etude.of(id),EID),metas:await T(()=>window.TRACE.etude.metas())};
console.log('1) gain 2026 + rattachement (géoréférencé) :',JSON.stringify(out).slice(0,1600));
{const h=await idbGet(page,'trace:handoff:'+CID);out.kv={n:h&&h.lines&&h.lines.length,name:h&&h.name,aff:h&&h.affaires};console.log('   copie de l\'appareil (rouverte par le traceur) :',JSON.stringify(out.kv));}
C.c1=!!out.choice&&out.choice.nw&&out.choice.checked===CID&&/même client/.test(out.choice.txt)&&!!out.conf&&out.choice.sites.includes(DID)&&/prolonge « Antenne Nord fictive »/.test(out.conf.txt)&&/géoréférencement/.test(out.conf.txt)&&out.conf.nom==='Villefictive'
  &&out.res.affaires.join()===[A25,A26].join()&&out.res.name==='Villefictive'&&out.res.n===nLines25+2&&out.res.n26===2&&out.res.raw26===2&&out.res.start&&Math.hypot(out.res.start[0]-60,out.res.start[1]+50)<0.05&&out.res.st==='attente'&&out.res.ends&&out.res.ends.type==='attente'
  &&out.res.dupW===0&&out.res.mA.join()===A26&&out.res.m25same&&out.res.etat==='a_debuter'&&out.res.sites.join()===CID&&out.res.mutu.site===CID&&out.res.mutu.etude===EID&&out.res.verse&&out.res.verse.site===CID&&out.res.etudeOf===true&&!out.res.metas.includes(EID)&&out.res.metas.includes(CID)&&out.kv.n===nLines25+2&&out.kv.name==='Villefictive'&&(out.kv.aff||[]).join()===[A25,A26].join();
// ── 2) gain 2027 → « Ajouter » SANS géoréférencement : calage dans le traceur (⟲ 2 points), retour, confirmation
await openAff(page,A27,'offre');
await page.evaluate(()=>{const b=document.querySelector('#eq-app [data-act=af][data-v="ogagne|"]');if(b)b.click();});await wait(500);
out={choice:await T(()=>!!document.getElementById('muChoice'))};
await page.evaluate(c=>{const r=document.querySelector('#muChoice input[name=muSite][value="'+c+'"]');if(r)r.checked=true;document.getElementById('muAdd').click();},CID);
await page.waitForSelector('#muGoCal',{timeout:15000}).catch(()=>{});out.calTxt=await T(()=>(document.querySelector('#modal .mu-modal')||{}).textContent||'');
await page.evaluate(()=>document.getElementById('muGoCal').click());
await page.waitForURL(/traceur\.html/,{timeout:10000}).catch(()=>{});
await page.waitForFunction(()=>window.MAQ&&window.MAQ.mutu&&window.MAQ.mutu.plan(),null,{timeout:20000}).catch(()=>{});await wait(600);
out.tr=await T(()=>({p:window.MAQ.mutu.params(),plan:window.MAQ.mutu.plan(),bar:!!document.getElementById('muCal'),save:getComputedStyle(document.getElementById('bSave')).display,how:window.MAQ.mutu.how(),ctx:localStorage.getItem('trace:maquette:ctx'),ref:window.MAQ.state.siteRef&&window.MAQ.state.siteRef.id}));
await shot(page,'pc_3_traceur_calage');
/* 📍 1 point, à la souris : ① le départ de l'étude (0,0), ② le bout du feeder 2025 (120,0) — aimantés */
const scr=w=>page.evaluate(w=>{const s=document.getElementById('svg');const r=s.getBoundingClientRect();const v=window.MAQ.state.view;const x=r.left+v.tx+w[0]*v.k,y=r.top+v.ty+w[1]*v.k;const el=document.elementFromPoint(x,y);return {x,y,svg:!!(el&&el.closest('svg'))};},w);
await page.evaluate(()=>document.querySelector('#muCal [data-mc=one]').click());await wait(200);
let s1=await scr(await page.evaluate(()=>window.MAQ.bg.toWorld('mutu_tmp',[0,0])));let s2=await scr([120,0]);
for(let i=0;i<3&&!(s1.svg&&s2.svg);i++){await page.click('#zOut');await wait(250);s1=await scr(await page.evaluate(()=>window.MAQ.bg.toWorld('mutu_tmp',[0,0])));s2=await scr([120,0]);} /* un point sous la barre ou la légende : on dézoome */
await page.mouse.click(s1.x+3,s1.y-2);await wait(250);s2=await scr([120,0]);await page.mouse.click(s2.x-3,s2.y+2);await wait(400);
out.one={s1,s2,w:await page.evaluate(()=>window.MAQ.bg.toWorld('mutu_tmp',[0,0])),left:await page.evaluate(()=>window.MAQ.mutu.one())};
/* ⟲ 2 points : ① (0,0) et ② (50,0) de l'étude → ③ bout du feeder 2025 (120,0) et ④ 50 m plus loin, orienté à −20° */
const a20=-20*Math.PI/180;const Q1=[120,0],Q2=[120+50*Math.cos(a20),50*Math.sin(a20)];
await page.evaluate(([Q1,Q2])=>{const B=window.MAQ.bg;const P1=B.toWorld('mutu_tmp',[0,0]),P2=B.toWorld('mutu_tmp',[50,0]);B.cal2('mutu_tmp',P1,P2,Q1,Q2);},[Q1,Q2]);await wait(300);
out.after=await T(()=>window.MAQ.mutu.plan());
await page.evaluate(()=>{const b=document.querySelector('#muCal [data-mc=ok]');if(b)b.click();});
await page.waitForURL(/index\.html/,{timeout:10000}).catch(()=>{});
await page.waitForSelector('#muConf',{timeout:25000}).catch(()=>{});await wait(400);
out.conf=await T(()=>{const m=document.getElementById('muConf');return m?m.textContent.replace(/\s+/g,' '):null;});out.url=page.url();
await page.evaluate(()=>{const b=document.getElementById('muGo');if(b)b.click();});
await page.waitForFunction(n=>{const a=window.TRACE.affaires.get(n);return a&&a.mutu&&!document.querySelector('#modal.show');},A27,{timeout:20000}).catch(()=>{});await wait(1500);
const S2=JSON.parse(JSON.stringify(SITES[CID].data));const l27=S2.lines.find(l=>l.aff===A27);
out.res={affaires:S2.affaires,n27:S2.lines.filter(l=>l.aff===A27).length,a:l27&&l27.axis[0],b:l27&&l27.axis[l27.axis.length-1],st:l27&&l27.startType,etat:REG['affaire|'+A27].data.etat,mutu:!!REG['affaire|'+A27].data.mutu,cal:await T(()=>localStorage.getItem('trace:mutu:cal')),plans:(S2.plans||[]).map(p=>p.id)};
console.log('2) gain 2027 + calage dans le traceur :',JSON.stringify(out).slice(0,1500));
C.c2=out.choice&&/traceur/.test(out.calTxt)&&out.one.s1.svg&&out.one.s2.svg&&Math.hypot(out.one.w[0]-120,out.one.w[1])<0.01&&!out.one.left&&out.tr.p.site===CID&&out.tr.p.etude===E27&&out.tr.p.aff===A27&&!!out.tr.plan&&out.tr.bar&&out.tr.save==='none'&&out.tr.ctx==='site:'+CID&&out.tr.ref===CID
  &&!!out.conf&&/calée dans le traceur/.test(out.conf)&&/Gagnée \+ rattacher/.test(out.conf)&&out.res.affaires.join()===[A25,A26,A27].join()&&out.res.n27===1
  &&out.res.a&&Math.hypot(out.res.a[0]-120,out.res.a[1])<0.05&&out.res.b&&Math.hypot(out.res.b[0]-Q2[0],out.res.b[1]-Q2[1])<0.05&&out.res.st==='attente'&&out.res.etat==='a_debuter'&&out.res.mutu&&!out.res.cal&&!out.res.plans.includes('mutu_tmp');
// ── 3) terrain : un seul chantier, plan complet, puce, liste / récap filtrés, soudure sur une ligne 2026
out={metas:await T(()=>window.TRACE.etude.metas())};
await page.evaluate(()=>{window.TRACE.showScreen('home');window.TRACE.state.homeTab='list';window.TRACE.renderHome();});await wait(600);
out.list=await T(([c,e,e2])=>{const t=document.getElementById('homeBody').textContent;return {c:/Villefictive/.test(t),e:/Étude Villefictive 2026/.test(t),e2:/Étude Villefictive 2027/.test(t)};},[CID,EID,E27]);
await page.evaluate(id=>window.TRACE.openSiteFromHome(id),CID);await page.waitForFunction(()=>window.TRACE.state.screen==='site',null,{timeout:15000}).catch(()=>{});await wait(1800);
const plan=()=>T(()=>{const g=document.getElementById('net');const ids=new Set([...g.querySelectorAll('g.el[data-line]')].map(x=>x.getAttribute('data-line')));const dim=new Set([...g.querySelectorAll('g.el[data-line][opacity=".16"]')].map(x=>x.getAttribute('data-line')));
  const chips=[...document.querySelectorAll('#muChips button')].map(b=>({t:b.textContent.trim(),h:Math.round(b.getBoundingClientRect().height),on:b.classList.contains('on')}));
  return {ids:[...ids],dim:[...dim],halo:g.querySelectorAll('g.mu-halo path').length,chips,leg:document.getElementById('legend').textContent,name:document.getElementById('shName').textContent};});
out.p0=await plan();await shot(page,'pc_4_chantier_toutes');
const net=await T(()=>window.TRACE.net.lines.map(l=>({id:l.id,aff:l.aff||''})));const ids26=net.filter(l=>l.aff===A26).map(l=>l.id),ids25=net.filter(l=>!l.aff).map(l=>l.id);
await page.evaluate(()=>{const b=[...document.querySelectorAll('#muChips button')].find(x=>x.textContent.trim().endsWith('2026'));if(b)b.click();});await wait(700);
out.p26=await plan();await shot(page,'pc_5_chantier_puce_2026');
await page.evaluate(()=>{const T=window.TRACE;T.state.tab='liste';T.renderAll();});await wait(300);
out.liste=await T(()=>[...document.querySelectorAll('#liste .wrow')].map(r=>r.dataset.line));
await page.evaluate(()=>{const T=window.TRACE;T.state.tab='recap';T.renderAll();});await wait(300);
out.recap=await T(()=>{const h=[...document.querySelectorAll('#recap h3')].find(x=>/par ligne/.test(x.textContent));const tb=h&&h.nextElementSibling;return tb?[...tb.querySelectorAll('tr')].slice(1,-1).map(r=>r.cells[0].textContent):[];});
await page.evaluate(()=>{const b=document.querySelector('#muChips [data-muchip="-1"]');if(b)b.click();const T=window.TRACE;T.state.tab='plan';T.renderAll();});await wait(500);
/* soudure sur une ligne 2026 (étape 1 : photo, procédé, contrôle visuel) */
const PNG='data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg==';
const L26id=ids26[0];
await page.evaluate(([L,PNG])=>{const T=window.TRACE;const j=T.lines[L].cond.A.joints[0];j.steps=j.steps||{};j.steps[1]={photos:[PNG]};T.openJoint(L,'A',0);},[L26id,PNG]);await wait(500);
await page.evaluate(()=>{const s=document.querySelector('#sheet');const p=s.querySelector('#st1-proc');if(p)p.value='cellu';const v=s.querySelector('#st1-vis');if(v)v.checked=true;const b=s.querySelector('[data-stepok="1"]');if(b)b.click();});await wait(1500);
const w26=await T(L=>{const j=window.TRACE.lines[L].cond.A.joints[0];return {id:j.weldId,st:j.status};},L26id);await page.evaluate(()=>window.TRACE.closeSheet());await wait(300);
out.w26=w26;out.srvW=WELDS[CID+'|'+w26.id]&&WELDS[CID+'|'+w26.id].status;
console.log('3) terrain :',JSON.stringify(out).slice(0,1800));
C.c3=out.metas.includes(CID)&&!out.metas.includes(EID)&&!out.metas.includes(E27)&&out.list.c&&!out.list.e&&!out.list.e2&&out.p0.name==='Villefictive'&&out.p0.ids.length===net.length&&out.p0.dim.length===0&&out.p0.halo===3
  &&out.p0.chips.map(c=>c.t).join('|')==='Toutes|2025|2026|2027'&&out.p0.chips.every(c=>c.h>=40)&&/2026/.test(out.p0.leg)&&/2025/.test(out.p0.leg)
  &&out.p26.dim.length===net.length-ids26.length&&ids25.every(id=>out.p26.dim.includes(id))&&!ids26.some(id=>out.p26.dim.includes(id))&&out.p26.chips.find(c=>c.on).t.endsWith('2026')
  &&out.liste.length>0&&out.liste.every(l=>ids26.includes(l))&&out.recap.length===2&&w26.st==='soudee'&&out.srvW==='soudee';
// ── 4) commerce par affaire : quantités, avancement, facturation, DOE
const qOf=n=>T(([n,id])=>{const S=window.TRACE.affaires.state();const k=S.cur;S.cur=n;const q=window.TRACE.etude.qty(id);const ag=window.TRACE.affaires.agg(id);S.cur=k;return q&&q.tot?{soud:q.tot.soud,ml:q.tot.mlTr,agg:Object.values(ag).reduce((s,x)=>s+x.nb,0)}:null;},[n,CID]);
out={q25:await qOf(A25),q26:await qOf(A26),q27:await qOf(A27),qAll:await qOf(null)};
await openAff(page,A25,'sites');await wait(1500);out.row25=await T(id=>{const r=document.querySelector('#eq-app .mu-row[data-lzsite="'+id+'"]');return r?r.textContent.replace(/\s+/g,' '):null;},CID);
await openAff(page,A26,'sites');await wait(1500);out.row26=await T(id=>{const r=document.querySelector('#eq-app .mu-row[data-lzsite="'+id+'"]');return r?{t:r.textContent.replace(/\s+/g,' '),undo:!!r.querySelector('[data-v="muundo|'+id+'"]')}:null;},CID);
out.verse=await T(()=>{const r=document.querySelector('#eq-app .mu-row[data-mu="etude"]');return r?r.textContent.replace(/\s+/g,' '):null;});
await shot(page,'pc_6_affaire_2026_trace_chantiers');
await openAff(page,A26,'quantites');await wait(800);out.qtab=await T(()=>[...document.querySelectorAll('#eq-app .cm-qtchip')].map(x=>x.textContent.replace(/\s+/g,' ').trim()));
await openAff(page,A26,'fact');out.fact=await T(()=>{const b=document.querySelector('#eq-app .mu-fact');return b?b.textContent:null;});
await page.evaluate(id=>window.TRACE.openSiteFromHome(id),CID);await page.waitForFunction(()=>window.TRACE.state.screen==='site',null,{timeout:15000}).catch(()=>{});await wait(1200);
out.doe=await T(([A26,ids26])=>{const T=window.TRACE;const all=T.doe.data();const b=[...document.querySelectorAll('#muChips button')].find(x=>x.textContent.trim().endsWith('2026'));b.click();const d26=T.doe.data();document.querySelector('#muChips [data-muchip="-1"]').click();
  return {all:all.lines.length,allW:all.welds.length,n26:d26.lines.length,ok26:d26.lines.every(l=>ids26.includes(l.id)),name:d26.site.name,w26:d26.welds.length,m:d26.marche&&d26.marche.at};},[A26,ids26]);
console.log('4) commerce par affaire :',JSON.stringify(out).slice(0,1800));
const s26=SITES[CID].data.lines.filter(l=>l.aff===A26).reduce((s,L)=>s+L.cond.A.welds.length+L.cond.R.welds.length,0);
C.c4=out.q25&&out.q26&&out.q27&&out.qAll&&out.q25.soud===nW25&&out.q26.soud===s26&&out.q25.soud+out.q26.soud+out.q27.soud===out.qAll.soud&&out.q26.agg===s26&&out.q25.agg===nW25
  &&!!out.row25&&/chantier partagé/.test(out.row25)&&/avec 2026/.test(out.row25)&&new RegExp(nW25+' soudures').test(out.row25)&&/avancement 3\/'?/.test(out.row25)
  &&!!out.row26&&new RegExp(s26+' soudures').test(out.row26.t)&&new RegExp('avancement 1/'+s26).test(out.row26.t)&&out.row26.undo&&/étude versée/.test(out.verse||'')&&out.qtab.some(c=>new RegExp(s26+' soudures').test(c))
  &&/Chantier partagé/.test(out.fact||'')&&out.doe.all===ids25.length /* 17/10 (lot MV, règle changée exprès) : « un DOE par marché » — avec la puce « Toutes », le DOE est celui de l'origine (plus jamais tout mélangé) */&&out.doe.n26===2&&out.doe.ok26&&/2026/.test(out.doe.name)&&out.doe.w26===s26&&!!out.doe.m;
// ── 5) marché et TS séparés (appli, onglet Modifs, traceur)
out=await T(([A26,L26])=>{const T=window.TRACE;const r={};const chip=i=>{const b=document.querySelector('#muChips [data-muchip="'+i+'"]');if(b)b.click();};
  chip(-1);r.mAll={id:(T.ts.marche()||{}).aff||'origine',lines:(T.ts.marche()||{lines:[]}).lines.length,changed:T.ts.diff().changed.length,cands:T.ts.candidates().length};
  chip(1);r.m26={aff:(T.ts.marche()||{}).aff,lines:(T.ts.marche()||{lines:[]}).lines.length,changed:T.ts.diff().changed.length,cands:T.ts.candidates().length};
  const TS=T.ts.of();TS.items.push({id:'tsmu1',kind:'line',line:L26,label:'Prolongement Nord 2026 — ligne entière',desig:'Coude supplémentaire fictif',etat:'propose',ts:'DEV-FICTIF-26',qty:{},by:'test',at:new Date().toISOString(),photos:[]});
  T.state.tab='ts';T.renderAll();r.ts26=/Coude supplémentaire fictif/.test(document.getElementById('tsview').textContent);r.ban26=(document.getElementById('muTsBanner')||{}).textContent||'';
  chip(0);r.ts25=/Coude supplémentaire fictif/.test(document.getElementById('tsview').textContent);r.ban25=(document.getElementById('muTsBanner')||{}).textContent||'';
  chip(-1);r.tsAll=/Coude supplémentaire fictif/.test(document.getElementById('tsview').textContent);TS.items=TS.items.filter(x=>x.id!=='tsmu1');T.state.tab='plan';T.renderAll();return r;},[A26,L26id]);
await page.evaluate(()=>{const T=window.TRACE;T.state.tab='ts';T.renderAll();});await wait(300);await shot(page,'pc_7_modifs_bandeau');await page.evaluate(()=>{const T=window.TRACE;T.state.tab='plan';T.renderAll();});
/* traceur sur le chantier partagé : aucun écart au marché (chaque ligne comparée au sien), ré-enregistrement → affaires, marchés et n° de soudure gardés */
await page.goto(BASE+'/traceur.html?site='+encodeURIComponent(CID));await page.waitForFunction(id=>window.MAQ&&window.MAQ.state.siteRef&&window.MAQ.state.siteRef.id===id,CID,{timeout:15000}).catch(()=>{});await wait(1200);
out.tr={hl:await T(()=>document.querySelectorAll('#svg path[stroke="#ffe08a"]').length),n:await T(()=>window.MAQ.state.lines.length),aff:await T(()=>window.MAQ.state.lines.filter(l=>l.aff).length)};
await page.click('#bSave');await wait(300);out.tr.modal=await T(()=>document.getElementById('modalBody').textContent.replace(/\s+/g,' '));await page.click('#svOk');await wait(2000);
const S3=SITES[CID].data;out.tr.after={affaires:S3.affaires,aff:S3.lines.filter(l=>l.aff).map(l=>l.aff),mA:Object.keys(S3.marchesAff||{}),w26:S3.lines.some(L=>['A','R'].some(c=>(L.cond[c].welds||[]).some(w=>w.weldId===w26.id))),m25:JSON.stringify(S3.marche)===JSON.stringify(marche25),mutu:!!S3.mutu};
console.log('5) marché et TS séparés :',JSON.stringify(out).slice(0,1800));
C.c5=out.mAll.id==='origine'&&out.mAll.lines===nLines25&&out.mAll.changed===0&&out.mAll.cands===0&&out.m26.aff===A26&&out.m26.lines===2&&out.m26.changed===0&&out.m26.cands===0&&out.ts26&&!out.ts25&&!out.tsAll&&/2026/.test(out.ban26)&&/2025/.test(out.ban25)
  &&out.tr.hl===0&&out.tr.n===net.length&&out.tr.aff===3&&/Aucun écart/.test(out.tr.modal)&&out.tr.after.affaires.join()===[A25,A26,A27].join()&&out.tr.after.aff.length===3&&out.tr.after.mA.join()===[A26,A27].join()&&out.tr.after.w26&&out.tr.after.m25&&out.tr.after.mutu;
// ── 6) « ↩ Annuler le rattachement » avant soudure (2027)
/* un traceur resté ouvert sur le chantier AVANT l'annulation (autre onglet) : son enregistrement sera refusé (copie périmée) */
const pt=await ctx.newPage();const dlg=[];pt.on('dialog',d=>dlg.push(d.message()));watch(pt);await pt.goto(BASE+'/traceur.html?site='+encodeURIComponent(CID));await pt.waitForFunction(id=>window.MAQ&&window.MAQ.state.siteRef&&window.MAQ.state.siteRef.id===id,CID,{timeout:15000}).catch(()=>{});await pt.waitForTimeout(800);
await page.goto(BASE+'/index.html');await wait(2200);
await openAff(page,A27,'sites');await wait(1200);
await page.evaluate(id=>{const b=document.querySelector('#eq-app [data-v="muundo|'+id+'"]');if(b)b.click();},CID);
await page.waitForSelector('#muUndo',{timeout:15000}).catch(()=>{});out={modal:await T(()=>{const m=document.getElementById('muUndo');return m?m.textContent.replace(/\s+/g,' '):null;})};
await page.evaluate(()=>{const b=document.getElementById('muUndoGo');if(b)b.click();});
await page.waitForFunction(n=>{const a=window.TRACE.affaires.get(n);return a&&!a.mutu&&!document.querySelector('#modal.show');},A27,{timeout:20000}).catch(()=>{});await wait(1500);
await pt.bringToFront();await pt.click('#bSave');await pt.waitForTimeout(300);await pt.click('#svOk');await pt.waitForTimeout(2500);out.stale={dlg:dlg.filter(m=>/autre affaire/.test(m)).length,n:SITES[CID].data.lines.length};await pt.close();await page.bringToFront();
const S4=SITES[CID].data;out.res={affaires:S4.affaires,n:S4.lines.length,n27:S4.lines.filter(l=>l.aff===A27).length,raw:S4.traceur.lines.length,sites:REG['affaire|'+A27].data.sites,mutu:REG['affaire|'+A27].data.mutu,
  e27:(SITES[E27].data.fiche||{}).etude,etudeOf:await T(id=>window.TRACE.etude.of(id),E27),mA:Object.keys(S4.marchesAff||{}),name:S4.name};
console.log('6) annuler le rattachement (avant soudure) :',JSON.stringify(out).slice(0,1400));
C.c6=!!out.modal&&/état d'avant/.test(out.modal)&&out.stale.dlg===1&&out.stale.n===net.length-1&&out.res.affaires.join()===[A25,A26].join()&&out.res.n===net.length-1&&out.res.n27===0&&out.res.raw===net.length-1&&out.res.sites.includes(E27)&&!out.res.sites.includes(CID)&&!out.res.mutu
  &&out.res.e27&&!out.res.e27.verse&&out.res.e27.gagne===true&&out.res.etudeOf===false&&out.res.mA.join()===A26&&out.res.name==='Villefictive';
// ── 7) après une soudure (2026) : refus expliqué, rien ne change
const before7=JSON.stringify(SITES[CID].data.lines.map(l=>l.id));
await openAff(page,A26,'sites');await wait(1200);
await page.evaluate(id=>{const b=document.querySelector('#eq-app [data-v="muundo|'+id+'"]');if(b)b.click();},CID);
await page.waitForSelector('#muUndoKo',{timeout:15000}).catch(()=>{});out={ko:await T(()=>{const m=document.getElementById('muUndoKo');return m?m.textContent.replace(/\s+/g,' '):null;})};
await shot(page,'pc_8_annuler_refus');await page.evaluate(()=>{const b=document.querySelector('#muUndoKo [data-close]');if(b)b.click();});await wait(300);
out.same=JSON.stringify(SITES[CID].data.lines.map(l=>l.id))===before7&&SITES[CID].data.affaires.join()===[A25,A26].join()&&!!REG['affaire|'+A26].data.mutu;
console.log('7) refus après soudure :',JSON.stringify(out));
C.c7=!!out.ko&&/Détacher/.test(out.ko)&&/1 soudure/.test(out.ko)&&out.same;
// ── 8) chantier à une seule affaire inchangé ; « Nouveau chantier » au gain = comme avant
out=await T(([D,AD])=>{const T=window.TRACE;const S=T.affaires.state();const k=S.cur;S.cur=AD;const q1=T.etude.qty(D);S.cur=null;const q2=T.etude.qty(D);S.cur=k;const n=T.sites[D];return {q:JSON.stringify(q1)===JSON.stringify(q2)&&!!(q1&&q1.tot),aff:n&&n.affaires,mA:n&&n.marchesAff,mutu:n&&n.mutu};},[DID,AD]);
await page.evaluate(id=>window.TRACE.openSiteFromHome(id),DID);await page.waitForFunction(()=>window.TRACE.state.screen==='site',null,{timeout:15000}).catch(()=>{});await wait(1200);
out.d=await T(()=>({chips:!!document.getElementById('muChips'),halo:!!document.querySelector('#net g.mu-halo'),leg:/sans liseré/.test(document.getElementById('legend').textContent),scope:window.TRACE.mutu.scope(),marche:!!window.TRACE.ts.marche()}));
await openAff(page,A28,'offre');await page.evaluate(()=>{const b=document.querySelector('#eq-app [data-act=af][data-v="ogagne|"]');if(b)b.click();});await wait(500);
out.c28=await T(()=>!!document.getElementById('muChoice'));await page.evaluate(()=>{const b=document.getElementById('muNew');if(b)b.click();});await wait(2500);
out.a28=await T(n=>{const a=window.TRACE.affaires.get(n);return {etat:a.etat,sites:a.sites,mutu:!!a.mutu};},A28);out.e28={of:await T(id=>window.TRACE.etude.of(id),E28),gagne:((SITES[E28].data.fiche||{}).etude||{}).gagne,marche:!!SITES[E28].data.marche};
console.log('8) chantier seul inchangé, « Nouveau chantier » :',JSON.stringify(out));
C.c8=out.q&&!out.aff&&!out.mA&&!out.mutu&&!out.d.chips&&!out.d.halo&&!out.d.leg&&out.d.scope===null&&out.d.marche&&out.c28&&out.a28.etat==='a_debuter'&&out.a28.sites.join()===E28&&!out.a28.mutu&&out.e28.of===false&&out.e28.gagne===true;
// ── 9) téléphone 390 px
const ctxM=await browser.newContext({viewport:{width:390,height:844},isMobile:true,hasTouch:true,deviceScaleFactor:2});await route(ctxM);const pm=await ctxM.newPage();watch(pm);
await login(pm);await pm.waitForTimeout(1200);
const ovf=pg=>pg.evaluate(()=>{const W=innerWidth;const bad=[...document.querySelectorAll('#siteHead,#siteHead *,.mu-row,.mu-row *,.mu-fact,#muTsBanner,#modal .box,#modal .box *,.lz-row,.lz-row *')].filter(e=>{const s=getComputedStyle(e);if(s.display==='none'||s.visibility==='hidden')return false;const r=e.getBoundingClientRect();return r.width>0&&r.right>W+1&&!e.closest('.mu-chips');}).slice(0,5).map(e=>(e.id||e.className||e.tagName)+':'+Math.round(e.getBoundingClientRect().right));return {sw:document.documentElement.scrollWidth,W,bad};});
await pm.evaluate(id=>window.TRACE.openSiteFromHome(id),CID);await pm.waitForFunction(()=>window.TRACE.state.screen==='site',null,{timeout:20000}).catch(()=>{});await pm.waitForTimeout(1800);
out={site:await ovf(pm),chips:await pm.evaluate(()=>[...document.querySelectorAll('#muChips button')].map(b=>{const r=b.getBoundingClientRect();return {h:Math.round(r.height),r:Math.round(r.right)};}))};
await shot(pm,'tel_1_chantier_puces');
await pm.evaluate(()=>{const b=[...document.querySelectorAll('#muChips button')].find(x=>x.textContent.trim().endsWith('2026'));if(b)b.click();});await pm.waitForTimeout(600);await shot(pm,'tel_2_chantier_2026');
await openAff(pm,A26,'sites');await pm.waitForTimeout(1500);await pm.evaluate(()=>{const r=document.querySelector('#eq-app .mu-row');if(r)r.scrollIntoView({block:'center'});});await pm.waitForTimeout(300);out.aff=await ovf(pm);out.btns=await pm.evaluate(()=>[...document.querySelectorAll('#eq-app .mu-row button')].map(b=>Math.round(b.getBoundingClientRect().height)));await shot(pm,'tel_3_affaire_2026');
await openAff(pm,A27,'sites');await pm.waitForTimeout(1200);await pm.evaluate(()=>{const b=document.querySelector('#eq-app [data-v="muadd|"]');if(b)b.click();});await pm.waitForTimeout(600);
out.modal=await pm.evaluate(()=>{const m=document.querySelector('#modal .box');if(!m)return null;const r=m.getBoundingClientRect();return {w:Math.round(r.width),r:Math.round(r.right),labels:[...m.querySelectorAll('.mu-list label')].map(l=>Math.round(l.getBoundingClientRect().height)),go:Math.round((m.querySelector('#muAdd')||{getBoundingClientRect:()=>({height:0})}).getBoundingClientRect().height)};});
out.mo=await ovf(pm);await shot(pm,'tel_4_ajouter_choix');await pm.evaluate(()=>{const b=document.querySelector('#modal [data-close]');if(b)b.click();});
/* le calage dans le traceur, au téléphone (abandonné ensuite : rien n'est enregistré) */
await pm.goto(BASE+'/traceur.html?site='+encodeURIComponent(CID)+'&mutu='+encodeURIComponent(E27)+'&maff='+encodeURIComponent(A27));await pm.waitForFunction(()=>window.MAQ&&window.MAQ.mutu&&window.MAQ.mutu.plan(),null,{timeout:20000}).catch(()=>{});await pm.waitForTimeout(800);
out.cal=await pm.evaluate(()=>{const b=document.getElementById('muCal');if(!b)return null;const r=b.getBoundingClientRect();return {r:Math.round(r.right),l:Math.round(r.left),btn:[...b.querySelectorAll('button')].map(x=>Math.round(x.getBoundingClientRect().height)),vis:[...b.querySelectorAll('button')].every(x=>{const q=x.getBoundingClientRect();return q.bottom<=innerHeight+1&&q.top>=0;})};});await shot(pm,'tel_5_traceur_calage');
await pm.evaluate(()=>{const b=document.querySelector('#muCal [data-mc=back]');if(b)b.click();});await pm.waitForURL(/index\.html/,{timeout:10000}).catch(()=>{});await pm.waitForTimeout(1500);out.back=await pm.evaluate(()=>({req:localStorage.getItem('trace:mutu:req'),cal:localStorage.getItem('trace:mutu:cal')}));
console.log('9) téléphone 390 px :',JSON.stringify(out));
C.c9=out.site.sw<=390&&!out.site.bad.length&&out.chips.length===3&&out.chips.every(c=>c.h>=40)&&out.aff.sw<=390&&!out.aff.bad.length&&out.btns.length>0&&out.btns.every(h=>h>=34)&&!!out.modal&&out.modal.r<=390&&out.modal.labels.length>0&&out.modal.labels.every(h=>h>=44)&&out.modal.go>=40&&out.mo.sw<=390&&!!out.cal&&out.cal.l>=0&&out.cal.r<=390&&out.cal.btn.every(h=>h>=40)&&out.cal.vis&&!out.back.req&&!out.back.cal;
// ── 11) « plus tard » : l'affaire gagnée en « Nouveau chantier » (c8) rejoint le chantier partagé depuis Tracé & chantiers — son marché figé AU GAIN est gardé
const m28=JSON.parse(JSON.stringify(SITES[E28].data.marche||null));
await openAff(page,A28,'sites');await wait(1200);out={btn:await T(()=>!!document.querySelector('#eq-app [data-v="muadd|"]'))};
await page.evaluate(()=>{const b=document.querySelector('#eq-app [data-v="muadd|"]');if(b)b.click();});await wait(500);
await page.evaluate(c=>{const r=document.querySelector('#muChoice input[name=muSite][value="'+c+'"]');if(r)r.checked=true;const b=document.getElementById('muAdd');if(b)b.click();},CID);
await page.waitForSelector('#muConf',{timeout:15000}).catch(()=>{});out.conf=await T(()=>{const m=document.getElementById('muConf');return m?m.textContent.replace(/\s+/g,' '):null;});
await page.evaluate(()=>{const b=document.getElementById('muGo');if(b)b.click();});
await page.waitForFunction(n=>{const a=window.TRACE.affaires.get(n);return a&&a.mutu&&!document.querySelector('#modal.show');},A28,{timeout:20000}).catch(()=>{});await wait(1500);
const S5=SITES[CID].data;const l28=S5.lines.find(l=>l.aff===A28);const M28=(S5.marchesAff||{})[A28];
out.res={affaires:S5.affaires,start:l28&&l28.axis[0],m:M28&&{at:M28.at,gain:M28.gain,soud:M28.tot&&M28.tot.soud,id:M28.lines&&M28.lines[0]&&M28.lines[0].id,ax:M28.lines&&M28.lines[0]&&M28.lines[0].axis[0]},m0:m28&&{at:m28.at,soud:m28.tot.soud},sites:REG['affaire|'+A28].data.sites,etat:REG['affaire|'+A28].data.etat,of:await T(id=>window.TRACE.etude.of(id),E28)};
console.log('11) plus tard (affaire déjà gagnée) :',JSON.stringify(out).slice(0,1200));
C.c11=out.btn&&!!out.conf&&!/Gagnée \+ rattacher/.test(out.conf)&&out.res.affaires.join()===[A25,A26,A28].join()&&out.res.start&&Math.hypot(out.res.start[0]-200,out.res.start[1]-60)<0.05&&!!m28&&out.res.m&&out.res.m.at===m28.at&&out.res.m.soud===m28.tot.soud&&out.res.m.id===l28.id&&Math.hypot(out.res.m.ax[0]-200,out.res.m.ax[1]-60)<0.05&&out.res.sites.join()===CID&&out.res.etat==='a_debuter'&&out.res.of===true;
// ── 10) console
console.log('10) console :',JSON.stringify(logs));C.c10=logs.length===0;
console.log(JSON.stringify(C));
console.log(Object.values(C).every(Boolean)?'RESULTAT: TOUT VERT':'RESULTAT: ÉCHEC '+Object.entries(C).filter(([k,v])=>!v).map(([k])=>k).join(','));
await browser.close();
