// LOT NC (20/10/2026) — « ＋ NOUVEAU CHANTIER » SANS PASSER PAR COMMERCE. Données 100 % FICTIVES, Supabase SIMULÉ (table sites / welds / registre en mémoire).
//  c1  un chef de chantier (PC 1366) voit « ＋ Nouveau chantier » dans Chantiers (sous la carte, en tête de la liste) ; un formulaire court ; « Chantier fictif Delta » créé :
//      net minimal (id man_…, lines [], fiche, createdAt / createdBy, manuel) dans SITES, le sélecteur, l'appareil (IndexedDB) et le serveur ; ouvert sur le Bureau
//  c2  le chantier s'ouvre comme un autre : bureau (étiquette « créé à la main … sans tracé », fiche), plan vide avec les deux boutons, stock, documents, DOE, conversation,
//      DH, hydro, phasage, modifs, liste, récap, catalogue, fourniture — zéro erreur ; Mon espace : planning, Mes chantiers, comptes chantier le connaissent
//  c3  accueil : la carte du chantier (liste) porte l'étiquette ; « Mes chantiers » (sous la carte) aussi ; en-tête du chantier « créé à la main · sans tracé » ; modification de la fiche
//  c4  un soudeur (390 px) ne voit pas le bouton mais voit le chantier (méta serveur : étiquette), l'ouvre : message sans bouton, rien ne déborde
//  c5  import DXF (fictif) DANS le chantier vide : même id, tracé là (2 lignes), fiche / création conservées, étiquette disparue, serveur à jour
//  c6  hors connexion (390 px) : « Chantier fictif Echo » créé, gardé sur l'appareil (sent:false), absent du serveur ; retour du réseau → envoyé (sent:true), serveur à jour
//  c7  remise depuis le traceur vers un chantier créé à la main (« Chantier fictif Foxtrot ») : le net remis garde l'id, la fiche, manuel ; le tracé est là
//  c8  Commerce : une affaire gagnée se lie au chantier créé à la main ; il reste dans Chantiers (pas une étude)
//  c9  zéro erreur console, pas de débordement à 390 px ; suppression d'un chantier manuel vide possible (bouton)
import { chromium } from 'playwright';
import { mkdirSync } from 'node:fs';
const BASE=process.env.BASE||'http://localhost:8818';
const SHOTS=process.env.SHOTS||'';if(SHOTS)try{mkdirSync(SHOTS,{recursive:true});}catch(e){}
const SB='https://pghftlepduvfazbiavhq.supabase.co';
const CHEF={id:'22222222-2222-4333-8444-555555555555',email:'luc.test@scr-soudure.fr',prenom:'Luc',nom:'TESTCHEF',poste:'chef',admin:false};          /* fictif : chef de chantier (droit site.tracer, pas site.delete) */
const SOUD={id:'33333333-2222-4333-8444-555555555555',email:'karim.test@scr-soudure.fr',prenom:'Karim',nom:'TESTEUR',poste:'soudeur',admin:false};   /* fictif : soudeur */
const RESP={id:'11111111-2222-4333-8444-555555555555',email:'camille.test@scr-soudure.fr',prenom:'Camille',nom:'FICTIVE',poste:'resp_exploitation',admin:true}; /* fictif : responsable, administrateur */
const COND={id:'44444444-2222-4333-8444-555555555555',email:'paul.test@scr-soudure.fr',prenom:'Paul',nom:'ESSAI',poste:'conducteur',admin:false};   /* fictif : conducteur de travaux */
const USERS=[CHEF,SOUD,RESP,COND];let CUR=CHEF;let OFFLINE=false;
/* ── serveur simulé ── */
const SITES={},REG={},WELDS={};const posts=[];
const nowIso=()=>new Date().toISOString();
const regPut=(kind,id,data)=>{REG[kind+'|'+id]={kind,id,data:JSON.parse(JSON.stringify(data)),updated_at:nowIso()};};
const CORS={'access-control-allow-origin':'*','access-control-allow-headers':'*','access-control-allow-methods':'GET, POST, PUT, PATCH, DELETE, OPTIONS'};
const browser=await chromium.launch({headless:true,executablePath:process.env.CHROMIUM_PATH||undefined});
async function route(ctx){
  await ctx.route(u=>u.href.startsWith(SB),async rt=>{const req=rt.request();const u=new URL(req.url());const p=u.pathname;const acc=req.headers()['accept']||'';
    const json=(o,status=200)=>rt.fulfill({status,contentType:'application/json',headers:CORS,body:JSON.stringify(o)});
    if(OFFLINE)return rt.abort('internetdisconnected');
    if(req.method()==='OPTIONS')return rt.fulfill({status:200,headers:CORS,body:''});
    let b={};try{b=JSON.parse(req.postData()||'{}');}catch(e){}
    const t=Math.floor(Date.now()/1000);const user={id:CUR.id,aud:'authenticated',role:'authenticated',email:CUR.email,email_confirmed_at:'2026-10-08T09:00:00Z',app_metadata:{provider:'email'},user_metadata:{},identities:[],created_at:'2026-10-08T09:00:00Z',updated_at:nowIso()};
    if(p==='/auth/v1/token')return json({access_token:'tok-'+CUR.prenom,token_type:'bearer',expires_in:3600,expires_at:t+3600,refresh_token:'rt-'+t,user});
    if(p==='/auth/v1/user')return json(user);if(p.startsWith('/auth/v1/'))return json({});
    if(p.startsWith('/storage/v1/'))return json({statusCode:'400',error:'test',message:'stockage simulé indisponible'},400);
    if(p==='/rest/v1/profiles'){const rows=USERS.map(x=>({id:x.id,email:x.email,name:x.prenom+' '+x.nom,prenom:x.prenom,nom:x.nom,role:x.admin?'chef':x.poste==='chef'||x.poste==='conducteur'?'bureau':x.poste,active:true,poste:x.poste,admin:x.admin,type:'salarie',rights:{},sites:null,created_at:'2026-10-08T09:00:00Z'}));const m=/id=eq\.([^&]+)/.exec(u.search);const r=m?rows.filter(x=>x.id===decodeURIComponent(m[1])):rows;return json(/object/.test(acc)?(r[0]||null):r);}
    if(p==='/rest/v1/registre'){const m=/kind=in\.\(([^)]*)\)/.exec(decodeURIComponent(u.search));const kinds=m?m[1].split(',').map(s=>s.replace(/"/g,'')):[];const g=/updated_at=gt\.([^&]+)/.exec(u.search);const since=g?decodeURIComponent(g[1]):null;return json(Object.values(REG).filter(r=>kinds.includes(r.kind)&&(!since||r.updated_at>since)));}
    if(p==='/rest/v1/rpc/registre_set'){const k=b.p_kind+'|'+b.p_id;const old=REG[k]?REG[k].data:{};let data;if(b.p_mode==='replace')data=b.p_patch;else{data=Object.assign({},old);Object.keys(b.p_patch||{}).forEach(x=>{if(b.p_patch[x]===null)delete data[x];else data[x]=b.p_patch[x];});}REG[k]={kind:b.p_kind,id:b.p_id,data,updated_at:nowIso()};return json(REG[k]);}
    if(p==='/rest/v1/rpc/site_set_part'){const row=SITES[b.p_site];if(!row)return json(null);row.data=Object.assign({},row.data,{[b.p_key]:b.p_value});row.updated_at=nowIso();posts.push('part '+b.p_site+' '+b.p_key);return json({at:row.updated_at,value:b.p_value});}
    if(p.startsWith('/rest/v1/rpc/'))return json(null);
    if(p==='/rest/v1/sites'){const sel=u.searchParams.get('select')||'';const m=/id=eq\.([^&]+)/.exec(u.search);const id=m?decodeURIComponent(m[1]):null;
      if(req.method()==='POST'){const rows=Array.isArray(b)?b:[b];const prefer=req.headers()['prefer']||'';rows.forEach(r=>{if(SITES[r.id]&&/ignore-duplicates/.test(prefer))return;posts.push('site '+r.id+' '+CUR.prenom);SITES[r.id]={id:r.id,name:r.name,supplier:r.supplier||null,serie:r.serie||null,data:r.data||{},updated_at:r.updated_at||nowIso()};});return json([]);}
      let rows=Object.values(SITES).filter(r=>!id||r.id===id);
      if(/sat:/.test(sel))rows=rows.map(r=>({id:r.id,name:r.name,supplier:r.supplier,updated_at:r.updated_at,geo:r.data.geo||null,origin:null,bgo:null,sat:r.data.traceur&&r.data.traceur.savedAt||null,w:r.data.w||null,h:r.data.h||null,bbox:null,nbox:null,nw:(r.data.report||{}).welds||null,deleted:r.data.deleted||null,deletedAt:r.data.deletedAt||null,builtin:null,ville:(r.data.fiche||{}).ville||null,chef:(r.data.fiche||{}).chef||null,conducteur:(r.data.fiche||{}).conducteur||null,secteur:(r.data.fiche||{}).secteur||null,etude:(r.data.fiche||{}).etude||null,manuel:r.data.manuel||null,createdAt:r.data.createdAt||null,createdBy:r.data.createdBy||null,l0:(Array.isArray(r.data.lines)&&r.data.lines[0]&&r.data.lines[0].id)||null}));
      else if(/missions:/.test(sel))rows=rows.map(r=>({id:r.id,updated_at:r.updated_at,missions:r.data.missions||null}));
      return json(/object/.test(acc)?(rows[0]||null):rows);}
    if(p==='/rest/v1/welds'){if(req.method()==='POST'){(Array.isArray(b)?b:[b]).forEach(r=>{WELDS[r.site_id+'|'+r.weld_id]=r;});return json([]);}const m=/site_id=eq\.([^&]+)/.exec(u.search);const sid=m?decodeURIComponent(m[1]):null;return json(Object.values(WELDS).filter(r=>!sid||r.site_id===sid).map(r=>({weld_id:r.weld_id,line_id:r.line_id,cond:r.cond,status:r.status,data:r.data||{}})));}
    if(p.startsWith('/rest/v1/'))return json(/object/.test(acc)?null:[]);
    return json([]);});
  await ctx.route(u=>!u.href.startsWith(BASE)&&!u.href.startsWith(SB)&&/^https?:/.test(u.href),rt=>rt.fulfill({status:204,body:''}));}
const logs=[],OVF=[];const C={};
const watch=pg=>{pg.on('pageerror',e=>logs.push('PAGEERROR: '+e.message.slice(0,300)));pg.on('console',m=>{if(m.type()==='error'&&!/realtime|websocket|Failed to fetch|net::ERR|status of 4\d\d|supabase|internetdisconnected|ERR_INTERNET/i.test(m.text()))logs.push(m.text().slice(0,220));});pg.on('dialog',d=>d.accept().catch(()=>{}));};
async function mkCtx(who,wide){CUR=who;const ctx=await browser.newContext({viewport:wide?{width:1366,height:900}:{width:390,height:844}});await route(ctx);const page=await ctx.newPage();watch(page);
  await page.goto(BASE+'/index.html');await page.waitForTimeout(500);await page.evaluate(()=>{localStorage.clear();});await page.evaluate(()=>new Promise(r=>{try{const q=indexedDB.deleteDatabase('trace-kv');q.onsuccess=q.onerror=q.onblocked=()=>r();}catch(e){r();}}));
  await page.reload();await page.waitForTimeout(900);await page.waitForSelector('#loginEmail',{timeout:20000});await page.fill('#loginEmail',who.email);await page.fill('#loginPwd','Mot-de-passe-fictif-1');await page.click('#loginGo');await page.waitForTimeout(2500);return {ctx,page};}
const wait=(pg,ms)=>pg.waitForTimeout(ms);
const T=(pg,fn,arg)=>pg.evaluate(fn,arg);
const shot=async(pg,name)=>{if(!SHOTS)return;try{await pg.screenshot({path:SHOTS+'/'+name+'.png'});}catch(e){console.log('capture '+name+' : '+e.message);}};
const ovf=async(pg,tag)=>{const o=await pg.evaluate(()=>{const hb=document.getElementById('homeBody');const M=document.querySelector('#modal .box');return {doc:document.documentElement.scrollWidth,win:window.innerWidth,hb:hb?hb.scrollWidth-hb.clientWidth:0,box:M?Math.round(M.getBoundingClientRect().right):0};});if(o.doc>o.win+1||o.hb>1||(o.box&&o.box>o.win+1))OVF.push(tag+':'+JSON.stringify(o));return o;};
const idbGet=(pg,k)=>pg.evaluate(k=>new Promise(res=>{const q=indexedDB.open('trace-kv',1);q.onupgradeneeded=()=>q.result.createObjectStore('kv');q.onsuccess=()=>{const g=q.result.transaction('kv','readonly').objectStore('kv').get(k);g.onsuccess=()=>res(g.result||null);g.onerror=()=>res(null);};q.onerror=()=>res(null);}),k);
const home=async(pg,tab)=>{await pg.evaluate(t=>{const T=window.TRACE;if(T.state.screen!=='home'){T.showScreen('home');}document.getElementById(t).click();},tab);await wait(pg,500);};
const fillForm=async(pg,f)=>{await pg.evaluate(f=>{const set=(id,v)=>{const el=document.getElementById(id);if(!el)throw new Error('champ absent '+id);el.value=v;el.dispatchEvent(new Event('input',{bubbles:true}));el.dispatchEvent(new Event('change',{bubbles:true}));};Object.entries(f).forEach(([k,v])=>set(k,v));},f);};
/* DXF FICTIF : deux polylignes (aller / retour) sur des calques « RCU », une étiquette DN100 — mètres */
const DXF=(()=>{const pl=(layer,pts)=>['0','LWPOLYLINE','8',layer,'90',String(pts.length),'70','0',...pts.flatMap(p=>['10',String(p[0]),'20',String(p[1])])];const txt=(layer,x,y,t)=>['0','TEXT','8',layer,'10',String(x),'20',String(y),'40','1','1',t];
  return ['0','SECTION','2','HEADER','9','$INSUNITS','70','6','0','ENDSEC','0','SECTION','2','ENTITIES',...pl('RCU_ALLER',[[0,50],[60,50],[120,50]]),...pl('RCU_RETOUR',[[0,51.5],[60,51.5],[120,51.5]]),...txt('TEXTE_DN',60,53,'DN100'),'0','ENDSEC','0','EOF'].join('\n')+'\n';})();
const netInfo=pg=>pg.evaluate(()=>{const T=window.TRACE;const n=T.net;return n?{id:n.id,name:n.name,lines:(n.lines||[]).length,fiche:n.fiche||null,manuel:!!n.manuel,createdAt:n.createdAt||null,createdBy:n.createdBy||null,supplier:n.supplier||null,tab:T.state.tab,screen:T.state.screen,source:n.source||null,updated:n.updated_at||null}:null;});
// ══ c1) chef (PC) : le bouton, le formulaire, la création
let {ctx,page}=await mkCtx(CHEF,true);
C.c0=await T(page,()=>!!(window.TRACE.state.cloudUser&&window.TRACE.state.profile));console.log('0) chef connecté (serveur simulé) :',C.c0);
await home(page,'htSites');await T(page,()=>{document.getElementById('htMap').click();});await wait(page,600);
let out={btnMap:await T(page,()=>!!document.querySelector('#homeBody .nc-new[data-nc-where=map]')),can:await T(page,()=>window.TRACE.nc.can())};
await shot(page,'01_pc_chantiers_bouton');
await T(page,()=>{document.getElementById('htList').click();});await wait(page,400);out.btnList=await T(page,()=>!!document.querySelector('#homeBody .nc-new[data-nc-where=list]'));out.homeNew=await T(page,()=>!!document.getElementById('homeNew'));
await T(page,()=>document.querySelector('#homeBody .nc-new[data-nc-where=list]').click());await wait(page,400);
out.form=await T(page,()=>{const M=document.getElementById('modal');return {show:M.classList.contains('show'),fields:['nc-name','nc-ville','nc-cp','nc-client','nc-chef','nc-cond','nc-secteur','nc-debut','nc-sup','nc-note','nc-ok'].map(id=>!!document.getElementById(id)),chef:document.getElementById('nc-chef').value,chefOpts:[...document.getElementById('nc-chef').options].map(o=>o.textContent).slice(0,3),condOpts:[...document.getElementById('nc-cond').options].length,okH:Math.round(document.getElementById('nc-ok').getBoundingClientRect().height)};});
await shot(page,'02_pc_formulaire');
await fillForm(page,{'nc-name':'Chantier fictif Delta','nc-ville':'Villefictive','nc-cp':'35000','nc-client':'RÉGIE FICTIVE DES RÉSEAUX','nc-cond':COND.email,'nc-secteur':'ouest','nc-debut':'2026-11-02','nc-sup':'AXIOM','nc-note':'accès par la rue fictive, contact sur place M. Test'});
await T(page,()=>document.getElementById('nc-ok').click());await wait(page,2500);
out.net=await netInfo(page);out.toast=await T(page,()=>document.getElementById('toast').textContent);
const ID=out.net&&out.net.id;out.srv=!!(ID&&SITES[ID]);out.srvData=ID&&SITES[ID]?{manuel:SITES[ID].data.manuel,lines:SITES[ID].data.lines,fiche:SITES[ID].data.fiche,by:SITES[ID].data.createdBy,name:SITES[ID].name,supplier:SITES[ID].supplier}:null;
out.kv=ID?await idbGet(page,'trace:handoff:'+ID):null;out.sel=await T(page,id=>[...document.getElementById('siteSel').options].some(o=>o.value===id),ID);
console.log('1) création :',JSON.stringify(out));
C.c1=out.btnMap&&out.btnList&&out.homeNew&&out.can&&out.form.show&&out.form.fields.every(Boolean)&&out.form.chef===CHEF.email&&out.form.okH>=44&&out.form.condOpts>1
  &&!!ID&&/^man_/.test(ID)&&out.net.name==='Chantier fictif Delta'&&out.net.lines===0&&out.net.manuel&&out.net.createdBy==='Luc TESTCHEF'&&!!out.net.createdAt&&out.net.fiche.ville==='Villefictive'&&out.net.fiche.cp==='35000'&&out.net.fiche.client==='RÉGIE FICTIVE DES RÉSEAUX'&&out.net.fiche.chef===CHEF.email&&out.net.fiche.conducteur===COND.email&&out.net.fiche.secteur==='ouest'&&out.net.fiche.debut==='2026-11-02'&&out.net.supplier==='AXIOM'
  &&out.net.screen==='site'&&out.net.tab==='bureau'&&out.srv&&out.srvData.manuel===true&&Array.isArray(out.srvData.lines)&&out.srvData.lines.length===0&&out.srvData.fiche.ville==='Villefictive'&&out.srvData.supplier==='AXIOM'&&out.kv&&out.kv.sent===true&&out.kv.manuel===true&&out.sel&&/enregistré sur le serveur/.test(out.toast);
// ══ c2) le chantier vide s'ouvre comme un autre : bureau, plan (message + 2 boutons), tous les onglets sans erreur ; Mon espace le connaît
out={bureau:await T(page,()=>{const b=document.getElementById('bureau');return {txt:b.textContent.replace(/\s+/g,' ').slice(0,900),tag:!!b.querySelector('.nc-tag'),fiche:!!b.querySelector('[data-nc-fiche]')};})};
await shot(page,'03_pc_bureau');
const TABS=['plan','stock','admin','export','conv','qse','bouclage','hydro','phasage','ts','liste','recap','catalogue','fourniture'];out.tabs={};
for(const t of TABS){const errBefore=logs.length;await T(page,t=>{const T=window.TRACE;T.state.tab=t;T.renderAll();},t);await wait(page,350);const vis=await T(page,t=>{const v=document.getElementById('view-'+t);return v?v.classList.contains('active')&&v.textContent.replace(/\s+/g,' ').trim().length>0:null;},t);out.tabs[t]=(vis===true)&&logs.length===errBefore;if(t==='plan'){out.plan=await T(page,()=>{const e=document.getElementById('ncEmpty');return e?{show:e.style.display!=='none',txt:e.textContent.replace(/\s+/g,' ').slice(0,200),imp:!!e.querySelector('[data-nc-import]'),tr:!!e.querySelector('[data-nc-traceur]'),head:document.getElementById('shStat').textContent}:null;});await shot(page,'04_pc_plan_vide');}}
await T(page,()=>{const b=document.getElementById('btnMenu');if(b)b.click();});await wait(page,300);out.tools=await T(page,()=>({fiche:!!document.querySelector('#planTools [data-nc-fiche]'),del:!!document.getElementById('btnDelSite'),report:!!document.getElementById('btnReport')}));await T(page,()=>{const b=document.getElementById('menuClose');if(b)b.click();});await wait(page,200);
/* Mon espace : Chantiers › Mes chantiers (tableau de bord) — bouton en tête, ligne avec étiquette (planning des équipes et comptes chantier : vues du responsable, c8) */
await home(page,'htEq');await wait(page,400);await T(page,()=>{window.TRACE.espace.dash(window.TRACE.state.siteId);});await wait(page,500);await T(page,()=>{const b=document.querySelector('#eq-app .ac-back[data-v="chantiers"]');if(b)b.click();});await wait(page,500);
out.mes=await T(page,()=>{const app=document.getElementById('eq-app');return {btn:!!app.querySelector('.nc-new[data-nc-where=mes]'),row:/Chantier fictif Delta/.test(app.textContent),tag:!!app.querySelector('.ac-row .nc-tag')};});await shot(page,'05_pc_mes_chantiers');
console.log('2) le chantier vide partout :',JSON.stringify(out));
C.c2=/Chantier fictif Delta/.test(out.bureau.txt)&&out.bureau.tag&&out.bureau.fiche&&/créé à la main/.test(out.bureau.txt)&&/Villefictive/.test(out.bureau.txt)&&/RÉGIE FICTIVE/.test(out.bureau.txt)
  &&TABS.every(t=>out.tabs[t])&&out.plan&&out.plan.show&&/Pas encore de tracé/.test(out.plan.txt)&&out.plan.imp&&out.plan.tr&&/créé à la main · sans tracé/.test(out.plan.head)&&out.tools.fiche&&!out.tools.del&&!out.tools.report&&out.mes.btn&&out.mes.row&&out.mes.tag;
// ══ c3) accueil : étiquette dans la liste et sous la carte ; « Reprendre » ; modification de la fiche
await home(page,'htSites');await T(page,()=>{document.getElementById('htList').click();});await wait(page,500);
out={list:await T(page,id=>{const c=document.querySelector('#homeBody .siteCard[data-open="'+id+'"]');return c?{tag:!!c.querySelector('.nc-tag'),txt:c.textContent.replace(/\s+/g,' ')}:null;},ID)};await shot(page,'06_pc_liste_etiquette');
await T(page,()=>{document.getElementById('htMap').click();});await wait(page,600);out.recap=await T(page,id=>{const b=document.querySelector('#homeBody .siteRecap[data-open-bureau="'+id+'"]');return b?{tag:!!b.querySelector('.nc-tag'),txt:b.textContent.replace(/\s+/g,' ').slice(0,200)}:null;},ID);
out.resume=await T(page,()=>({show:document.getElementById('homeResume').style.display!=='none',txt:document.getElementById('homeResume').textContent}));
/* fiche modifiée depuis le Bureau (✎ Fiche) : nom (chantier manuel), client, note */
await T(page,id=>{window.TRACE.state.pendingTab='bureau';window.TRACE.openSiteFromHome(id);},ID);await wait(page,1200);await T(page,()=>{document.querySelector('#bureau [data-nc-fiche]').click();});await wait(page,400);
out.edit=await T(page,()=>({name:document.getElementById('nc-name').value,ville:document.getElementById('nc-ville').value,ro:document.getElementById('nc-name').readOnly}));
await fillForm(page,{'nc-name':'Chantier fictif Delta 2','nc-client':'CLIENT FICTIF MODIFIÉ','nc-note':'note modifiée'});await T(page,()=>document.getElementById('nc-ok').click());await wait(page,1200);
out.after=await netInfo(page);out.srvName=SITES[ID]&&SITES[ID].name;out.srvClient=SITES[ID]&&SITES[ID].data.fiche.client;out.bureau2=await T(page,()=>/CLIENT FICTIF MODIFIÉ/.test(document.getElementById('bureau').textContent));
console.log('3) accueil + fiche :',JSON.stringify(out));
C.c3=out.list&&out.list.tag&&/créé à la main/.test(out.list.txt)&&/sans tracé/.test(out.list.txt)&&out.recap&&out.recap.tag&&out.resume.show&&/Chantier fictif Delta/.test(out.resume.txt)
  &&out.edit.name==='Chantier fictif Delta'&&out.edit.ville==='Villefictive'&&!out.edit.ro&&out.after.name==='Chantier fictif Delta 2'&&out.after.fiche.client==='CLIENT FICTIF MODIFIÉ'&&out.after.fiche.note==='note modifiée'&&out.after.fiche.ville==='Villefictive'&&out.srvName==='Chantier fictif Delta 2'&&out.srvClient==='CLIENT FICTIF MODIFIÉ'&&out.bureau2;
// ══ c4) un soudeur (390 px) : pas de bouton, mais le chantier (méta serveur + étiquette), il l'ouvre — message sans bouton, rien ne déborde
const S=await mkCtx(SOUD,false);
await home(S.page,'htSites');await T(S.page,()=>{document.getElementById('htList').click();});await wait(S.page,900);
out={can:await T(S.page,()=>window.TRACE.nc.can()),btn:await T(S.page,()=>!!document.querySelector('#homeBody .nc-new')),homeNew:await T(S.page,()=>!!document.getElementById('homeNew')),card:await T(S.page,id=>{const c=document.querySelector('#homeBody .siteCard[data-open="'+id+'"]');return c?{tag:!!c.querySelector('.nc-tag'),txt:c.textContent.replace(/\s+/g,' ')}:null;},ID)};
await ovf(S.page,'soudeur liste');await shot(S.page,'07_tel_soudeur_liste');
await T(S.page,id=>window.TRACE.openSiteFromHome(id),ID);await wait(S.page,2500);out.net=await netInfo(S.page);
out.plan=await T(S.page,()=>{const e=document.getElementById('ncEmpty');return e?{show:e.style.display!=='none',imp:!!e.querySelector('[data-nc-import]'),tr:!!e.querySelector('[data-nc-traceur]'),right:Math.round(e.getBoundingClientRect().right),txt:e.textContent.replace(/\s+/g,' ').slice(0,160)}:null;});
await ovf(S.page,'soudeur plan');await shot(S.page,'08_tel_soudeur_plan_vide');
await T(S.page,()=>{window.TRACE.state.tab='bureau';window.TRACE.renderAll();});await wait(S.page,400);out.bureau=await T(S.page,()=>({txt:document.getElementById('bureau').textContent.replace(/\s+/g,' ').slice(0,300),fiche:!!document.querySelector('#bureau [data-nc-fiche]')}));await ovf(S.page,'soudeur bureau');await shot(S.page,'09_tel_soudeur_bureau');
console.log('4) soudeur :',JSON.stringify(out));
C.c4=!out.can&&!out.btn&&!out.homeNew&&out.card&&out.card.tag&&/sans tracé/.test(out.card.txt)&&out.net&&out.net.id===ID&&out.net.lines===0&&out.net.screen==='site'&&out.plan&&out.plan.show&&!out.plan.imp&&!out.plan.tr&&out.plan.right<=390&&/Pas encore de tracé/.test(out.plan.txt)&&/Chantier fictif Delta 2/.test(out.bureau.txt)&&!out.bureau.fiche;
await S.ctx.close();
// ══ c5) chef : import DXF fictif DANS le chantier vide → même id, tracé là, fiche conservée, étiquette partie, serveur à jour
await T(page,()=>{window.TRACE.state.tab='plan';window.TRACE.renderAll();});await wait(page,300);await T(page,()=>document.querySelector('#ncEmpty [data-nc-import]').click());await wait(page,400);
await page.setInputFiles('#planFile',{name:'reseau_fictif.dxf',mimeType:'application/dxf',buffer:Buffer.from(DXF)});await wait(page,1500);
out={ui:await T(page,()=>{const b=document.querySelector('#importBody .nc-into');return b?{into:(b.querySelector('input[name=nc-into]:checked')||{}).value,name:document.getElementById('impName').value,go:document.getElementById('impGo').textContent,sup:document.getElementById('impSup').value,txt:b.textContent.replace(/\s+/g,' ').slice(0,200)}:null;})};
await shot(page,'10_pc_import_dans_chantier');
await T(page,()=>document.getElementById('impGo').click());await page.waitForFunction(()=>window.TRACE.net&&(window.TRACE.net.lines||[]).length===2&&Object.keys(window.TRACE.lines).length===2,null,{timeout:15000}).catch(()=>{});await wait(page,1500);await T(page,()=>{const M=document.getElementById('modal');if(M.classList.contains('show'))M.click();});await wait(page,300);
for(let i=0;i<20;i++){const x=await idbGet(page,'trace:handoff:'+ID);if(x&&x.sent===true&&(x.lines||[]).length===2)break;await wait(page,400);} /* copie de l'appareil écrite après la réponse du serveur */
out.net=await netInfo(page);out.sessLines=await T(page,()=>Object.keys(window.TRACE.lines).length);out.empty=await T(page,()=>{const e=document.getElementById('ncEmpty');return e?e.style.display!=='none':false;});out.tag=await T(page,id=>window.TRACE.nc.tag(id),ID);out.head=await T(page,()=>document.getElementById('shStat').textContent);
out.srv=SITES[ID]?{lines:(SITES[ID].data.lines||[]).length,manuel:SITES[ID].data.manuel,fiche:(SITES[ID].data.fiche||{}).ville,client:(SITES[ID].data.fiche||{}).client,by:SITES[ID].data.createdBy,name:SITES[ID].name,from:SITES[ID].data.traceFrom&&SITES[ID].data.traceFrom.kind}:null;out.kv=await idbGet(page,'trace:handoff:'+ID);if(out.kv)out.kv={lines:(out.kv.lines||[]).length,sent:out.kv.sent,manuel:out.kv.manuel,fiche:(out.kv.fiche||{}).client,hasT:'T' in out.kv};out.sites=await T(page,()=>Object.keys(window.TRACE.sites).filter(k=>/^(man_|imp_)/.test(k)));
await shot(page,'11_pc_plan_apres_import');
console.log('5) import DXF dans le chantier :',JSON.stringify(out));
C.c5=out.ui&&out.ui.into==='into'&&out.ui.name==='Chantier fictif Delta 2'&&/dans ce chantier/i.test(out.ui.go)&&out.ui.sup==='AXIOM'&&out.net.id===ID&&out.net.lines===2&&out.sessLines===2&&out.net.manuel&&out.net.fiche.ville==='Villefictive'&&out.net.fiche.client==='CLIENT FICTIF MODIFIÉ'&&out.net.createdBy==='Luc TESTCHEF'&&!out.empty&&out.tag===''&&!/sans tracé/.test(out.head)
  &&out.srv&&out.srv.lines===2&&out.srv.manuel===true&&out.srv.fiche==='Villefictive'&&out.srv.client==='CLIENT FICTIF MODIFIÉ'&&out.srv.by==='Luc TESTCHEF'&&out.srv.from==='dxf'&&out.kv&&out.kv.lines===2&&out.kv.sent===true&&out.kv.fiche==='CLIENT FICTIF MODIFIÉ'&&!out.kv.hasT&&out.sites.length===1&&out.sites[0]===ID;
// ══ c6) hors connexion (téléphone) : création gardée sur l'appareil, envoyée au retour du réseau
await page.setViewportSize({width:390,height:844});await wait(page,300);await home(page,'htSites');await T(page,()=>{document.getElementById('htList').click();});await wait(page,400);
OFFLINE=true;await ctx.setOffline(true);await wait(page,300);
await T(page,()=>{window.__nct=[];new MutationObserver(()=>{const t=document.getElementById('toast').textContent;if(t&&window.__nct[window.__nct.length-1]!==t)window.__nct.push(t);}).observe(document.getElementById('toast'),{childList:true,characterData:true,subtree:true});}); /* tous les messages, pas seulement le dernier */
await T(page,()=>document.querySelector('#homeBody .nc-new').click());await wait(page,400);out={ovf:await ovf(page,'formulaire 390'),okH:await T(page,()=>Math.round(document.getElementById('nc-ok').getBoundingClientRect().height))};await shot(page,'12_tel_formulaire');
await fillForm(page,{'nc-name':'Chantier fictif Echo','nc-ville':'Autreville','nc-secteur':'idf'});await T(page,()=>document.getElementById('nc-ok').click());
await page.waitForFunction(id=>window.TRACE.state.screen==='site'&&window.TRACE.net&&window.TRACE.net.id!==id&&/^man_/.test(window.TRACE.net.id),ID,{timeout:20000}).catch(()=>{});await wait(page,800); /* hors connexion, l'ouverture attend le délai serveur (~6 s) */
out.net=await netInfo(page);const ID2=out.net&&out.net.id;out.toast=await T(page,()=>window.__nct.join(' | '));out.srvAvant=!!(ID2&&SITES[ID2]);out.kv=ID2?await idbGet(page,'trace:handoff:'+ID2):null;out.pend=await T(page,()=>window.TRACE.nc.pending());
await ovf(page,'plan vide 390 (chef)');await shot(page,'13_tel_hors_ligne_cree');
OFFLINE=false;await ctx.setOffline(false);await T(page,()=>window.dispatchEvent(new Event('online')));await wait(page,3500);
out.srvApres=!!(ID2&&SITES[ID2]);out.kv2=ID2?await idbGet(page,'trace:handoff:'+ID2):null;out.srvData=ID2&&SITES[ID2]?{manuel:SITES[ID2].data.manuel,ville:(SITES[ID2].data.fiche||{}).ville,lines:(SITES[ID2].data.lines||[]).length}:null;out.toast2=await T(page,()=>window.__nct.join(' | '));
if(out.kv)out.kv={id:out.kv.id,sent:out.kv.sent,manuel:out.kv.manuel,lines:(out.kv.lines||[]).length};if(out.kv2)out.kv2={id:out.kv2.id,sent:out.kv2.sent,manuel:out.kv2.manuel,lines:(out.kv2.lines||[]).length};
console.log('6) hors connexion :',JSON.stringify(out));
C.c6=out.ovf.doc<=out.ovf.win+1&&out.okH>=44&&!!ID2&&/^man_/.test(ID2)&&ID2!==ID&&out.net.lines===0&&out.net.screen==='site'&&/enregistré sur l'appareil, il part au serveur au retour du réseau/.test(out.toast)&&!out.srvAvant&&out.kv&&out.kv.sent===false&&out.kv.manuel===true&&out.pend.some(x=>x.id===ID2&&!x.sent)
  &&out.srvApres&&out.kv2&&out.kv2.sent===true&&out.srvData&&out.srvData.manuel===true&&out.srvData.ville==='Autreville'&&out.srvData.lines===0&&/Chantier fictif Echo » envoyé au serveur/.test(out.toast2);
// ══ c7) remise depuis le traceur vers un chantier créé à la main : id, fiche, manuel conservés ; tracé là
await page.setViewportSize({width:1366,height:900});await wait(page,200);await home(page,'htSites');
const ID3=await T(page,()=>window.TRACE.nc.create({name:'Chantier fictif Foxtrot',ville:'Villefictive',cp:'35000',client:'CLIENT FICTIF F',chef:'',conducteur:'',secteur:'ouest',debut:'',supplier:'LOGSTOR',note:'pour le traceur'}));await wait(page,1500);
out={id:ID3,srv:!!SITES[ID3]};
await page.goto(BASE+'/traceur.html?site='+encodeURIComponent(ID3)+'&v=1');await wait(page,2000);
out.ref=await T(page,()=>({id:window.MAQ.state.siteRef&&window.MAQ.state.siteRef.id,name:window.MAQ.state.siteRef&&window.MAQ.state.siteRef.name,lines:window.MAQ.state.lines.length,badge:(document.getElementById('siteBadge')||{}).textContent||''}));
await T(page,()=>{const M=window.MAQ;M.state.lines=[{id:'L1',name:'Feeder fictif',dn:100,bar:12,pts:[[0,0],[60,0],[120,0]],specials:[],parent:null}];M.state.seq=2;M.setMode('select');M.rebuild();M.save();});await wait(page,400);
await page.click('#bSave');await wait(page,300);out.mode=await T(page,()=>{const s=document.getElementById('svMode');return s?{v:s.value,opts:[...s.options].map(o=>o.textContent.slice(0,60))}:null;});out.svName=await T(page,()=>document.getElementById('svName').value);
await page.click('#svOk');await wait(page,2000);out.saved=await T(page,()=>document.getElementById('modalBody').textContent.replace(/\s+/g,' ').slice(0,200));await shot(page,'14_pc_traceur_remise');
await page.click('#svGo');await wait(page,3000);
out.net=await netInfo(page);out.sess=await T(page,()=>Object.keys(window.TRACE.lines).length);out.srvAfter=SITES[ID3]?{lines:(SITES[ID3].data.lines||[]).length,manuel:SITES[ID3].data.manuel,client:(SITES[ID3].data.fiche||{}).client,note:(SITES[ID3].data.fiche||{}).note,by:SITES[ID3].data.createdBy}:null;out.tag=await T(page,id=>window.TRACE.nc.tag(id),ID3);out.empty=await T(page,()=>{const e=document.getElementById('ncEmpty');return e?e.style.display!=='none':false;});
await shot(page,'15_pc_apres_traceur');
console.log('7) traceur → chantier existant :',JSON.stringify(out));
C.c7=/^man_/.test(ID3)&&out.srv&&out.ref.id===ID3&&/Foxtrot/.test(out.ref.name)&&out.ref.lines===0&&/chantier/.test(out.ref.badge)&&out.mode&&out.mode.v==='update'&&/Foxtrot/.test(out.svName)&&/Enregistr/.test(out.saved)
  &&out.net&&out.net.id===ID3&&out.net.lines===1&&out.sess===1&&out.net.manuel&&out.net.fiche.client==='CLIENT FICTIF F'&&out.net.fiche.note==='pour le traceur'&&out.net.createdBy==='Luc TESTCHEF'&&out.net.source==='traceur'&&out.net.screen==='site'&&out.srvAfter&&out.srvAfter.lines===1&&out.srvAfter.manuel===true&&out.srvAfter.client==='CLIENT FICTIF F'&&out.srvAfter.by==='Luc TESTCHEF'&&out.tag===''&&!out.empty;
// ══ c8) Commerce (responsable) : une affaire gagnée se lie au chantier créé à la main ; il reste dans Chantiers
const ID4=await T(page,()=>window.TRACE.nc.create({name:'Chantier fictif Golf',ville:'Villefictive',cp:'',client:'',chef:'',conducteur:'',secteur:'ouest',debut:'',supplier:'',note:''}));await wait(page,1500);
await ctx.close();
regPut('affaire','O2610-90',{num:'O2610-90',nom:'Affaire fictive gagnée',client:'RÉGIE FICTIVE DES RÉSEAUX',ville:'Villefictive',etat:'en_cours',secteur:'ouest',sites:[],at:'2026-10-01T09:00:00Z'});
const R=await mkCtx(RESP,true);await wait(R.page,1500);
/* planning des équipes et comptes chantier (responsable) connaissent le chantier créé à la main */
await home(R.page,'htEq');await wait(R.page,500);await T(R.page,()=>{const r=document.querySelector('#eq-app [data-act=xgo][data-v=orga]');if(r)r.click();});await wait(R.page,800);const planning=await T(R.page,()=>/Chantier fictif Golf/.test((document.getElementById('eq-app')||document.body).textContent));
await home(R.page,'htAff'); /* 31/10 matin : « Comptes chantier » est dans le module Affaire (avant : Pilotage) */await wait(R.page,400);await T(R.page,()=>{const r=document.querySelector('#eq-app [data-act=xgo][data-v=comptes]');if(r)r.click();});await wait(R.page,600);await T(R.page,()=>{const c=document.querySelector('#eq-app [data-act=cmd][data-v="tab|comptes"]');if(c)c.click();});await wait(R.page,600); /* (existant, hors lot) : depuis le hub Chantiers la ligne ouvre la vue sur le volet d'avant → on touche le volet « Comptes chantier » */const comptes=await T(R.page,()=>{const app=document.getElementById('eq-app');return /Chantier fictif Golf/.test(app.textContent);});await shot(R.page,'16a_pc_comptes_chantier');
await T(R.page,async n=>{const T=window.TRACE;T.showScreen('home');document.getElementById('htCom').click();await new Promise(x=>setTimeout(x,300));const S=T.affaires.state();S.view='fiche';S.cur=n;S.vview=null;S.tab='fiche';T.renderHome();await new Promise(x=>setTimeout(x,250));const t=document.querySelector('#eq-app [data-act=af][data-v="tab|sites"]');if(t)t.click();},'O2610-90');await wait(R.page,800);
out={opt:await T(R.page,id=>{const s=document.getElementById('afs-site');return s?[...s.options].some(o=>o.value===id):null;},ID4)};
await T(R.page,id=>{const s=document.getElementById('afs-site');s.value=id;s.dispatchEvent(new Event('change',{bubbles:true}));document.querySelector('#eq-app [data-act=af][data-v="link|"]').click();},ID4);await wait(R.page,1500);
out.linked=await T(R.page,n=>(window.TRACE.affaires.get(n)||{}).sites||[],'O2610-90');out.row=await T(R.page,id=>{const app=document.getElementById('eq-app');return /Chantier fictif Golf/.test(app.textContent);},ID4);out.etude=await T(R.page,id=>window.TRACE.etude.of(id),ID4);
await shot(R.page,'16_pc_affaire_liee');
await home(R.page,'htSites');await T(R.page,()=>{document.getElementById('htList').click();});await wait(R.page,600);out.home=await T(R.page,id=>!!document.querySelector('#homeBody .siteCard[data-open="'+id+'"]'),ID4);out.homeTag=await T(R.page,id=>{const c=document.querySelector('#homeBody .siteCard[data-open="'+id+'"]');return c?!!c.querySelector('.nc-tag'):null;},ID4);
out.planning=planning;out.comptes=comptes;console.log('8) affaire liée, planning, comptes :',JSON.stringify(out));
C.c8=out.opt===true&&out.linked.includes(ID4)&&out.row&&out.etude===false&&out.home&&out.homeTag===true&&out.planning&&out.comptes;
// ══ c9) suppression d'un chantier manuel vide (responsable : site.delete) ; zéro erreur console ; pas de débordement
await T(R.page,id=>{window.TRACE.state.pendingTab='plan';return window.TRACE.openSiteFromHome(id);},ID4);await wait(R.page,2000);
out={net:await netInfo(R.page)};await T(R.page,()=>{const b=document.getElementById('btnMenu');if(b)b.click();});await wait(R.page,300);out.del=await T(R.page,()=>!!document.getElementById('btnDelSite'));await shot(R.page,'17_pc_menu_supprimer');
await T(R.page,()=>{const b=document.getElementById('btnDelSite');if(b)b.click();});await wait(R.page,1500);out.gone=await T(R.page,id=>!window.TRACE.sites[id],ID4);out.tomb=!!(SITES[ID4]&&SITES[ID4].data.deleted);
console.log('9) suppression :',JSON.stringify(out));
C.c9=out.net&&out.net.id===ID4&&out.del&&out.gone&&out.tomb;
await R.ctx.close();
console.log('débordements :',JSON.stringify(OVF));
const bad=Object.entries(C).filter(([k,v])=>!v).map(([k])=>k);if(OVF.length)bad.push('overflow');if(logs.length)bad.push('console');
console.log(bad.length?'RESULTAT: ECHEC '+bad.join(','):'RESULTAT: TOUT VERT');console.log(logs.length?logs:'[]');
await browser.close();
